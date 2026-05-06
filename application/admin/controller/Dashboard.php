<?php

namespace app\admin\controller;

use think\Db;

/**
 * 商户数据中心（实时统计，第一版不做定时任务）
 */
class Dashboard extends Base
{
    /** @return int */
    protected function businessId()
    {
        return (int) session('Msg.business_id');
    }

    /**
     * 普通客服仅看自己；manager / super_manager 看全商户
     *
     * @return int 0 表示不限定客服
     */
    protected function scopedServiceId()
    {
        $login = session('Msg');
        if (isset($login['level']) && $login['level'] === 'service') {
            return (int) $login['service_id'];
        }

        return 0;
    }

    protected function todayTimestampRange()
    {
        $start = strtotime(date('Y-m-d 00:00:00'));
        $end = $start + 86399;

        return [$start, $end];
    }

    /**
     * 数据看板页
     */
    public function index()
    {
        $this->assign('part', '数据中心');
        $this->assign('title', '数据中心');

        return $this->fetch();
    }

    /**
     * 今日概览 + 汇总
     */
    public function overview()
    {
        $bid = $this->businessId();
        $sid = $this->scopedServiceId();
        list($t0, $t1) = $this->todayTimestampRange();

        $scanQ = Db::name('qr_scan_logs')->where('business_id', $bid)->where('scan_time', 'between', [$t0, $t1]);
        if ($sid > 0) {
            $scanQ->where('service_id', $sid);
        }
        $today_scan_count = (int) $scanQ->count();

        /*
         * 今日访客：管理员用 wolive_visiter.timestamp 落在当日（字段为 ON UPDATE，仅代表档案当日有更新）；
         * 普通客服用当日扫码日志 distinct visiter_id，与其接待范围一致。
         */
        if ($sid > 0) {
            $pfx = config('database.prefix');
            $vr = Db::query(
                "SELECT COUNT(DISTINCT visiter_id) AS c FROM `{$pfx}qr_scan_logs` WHERE business_id=? AND service_id=? AND scan_time BETWEEN ? AND ?",
                [$bid, $sid, $t0, $t1]
            );
            $today_visitor_count = isset($vr[0]['c']) ? (int) $vr[0]['c'] : 0;
        } else {
            $today_visitor_count = (int) Db::name('visiter')->where('business_id', $bid)->whereTime('timestamp', 'today')->count();
        }

        $chQ = Db::name('qr_channels')->where('business_id', $bid)->where('create_time', 'between', [$t0, $t1]);
        if ($sid > 0) {
            $chQ->where('service_id', $sid);
        }
        $today_channel_count = (int) $chQ->count();

        $msgQ = Db::name('chats')->where('business_id', $bid)->where('timestamp', 'between', [$t0, $t1]);
        if ($sid > 0) {
            $msgQ->where('service_id', $sid);
        }
        $today_message_count = (int) $msgQ->count();

        $banQ = Db::name('ip_blacklist')->where('business_id', $bid)->where('create_time', 'between', [$t0, $t1])->where('status', 1);
        if ($sid > 0) {
            $banQ->where('service_id', $sid);
        }
        $today_ban_ip_count = (int) $banQ->count();

        $onQ = Db::name('service')->where('business_id', $bid)->where('state', 'online');
        if ($sid > 0) {
            $onQ->where('service_id', $sid);
        }
        $online_service_count = (int) $onQ->count();

        $tcQ = Db::name('qr_channels')->where('business_id', $bid)->where('status', '<>', -1);
        if ($sid > 0) {
            $tcQ->where('service_id', $sid);
        }
        $total_channel_count = (int) $tcQ->count();

        $tbQ = Db::name('ip_blacklist')->where('business_id', $bid)->where('status', 1);
        if ($sid > 0) {
            $tbQ->where('service_id', $sid);
        }
        $total_blacklist_count = (int) $tbQ->count();

        return json([
            'code' => 0,
            'msg'  => 'success',
            'data' => [
                'today_scan_count'      => $today_scan_count,
                'today_visitor_count'   => $today_visitor_count,
                'today_channel_count'   => $today_channel_count,
                'today_message_count'   => $today_message_count,
                'today_ban_ip_count'    => $today_ban_ip_count,
                'online_service_count'  => $online_service_count,
                'total_channel_count'   => $total_channel_count,
                'total_blacklist_count' => $total_blacklist_count,
            ],
        ]);
    }

    /**
     * 最近 7 天（含当日）趋势
     */
    public function trend()
    {
        $bid = $this->businessId();
        $sid = $this->scopedServiceId();

        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $days[] = date('Y-m-d', strtotime('-' . $i . ' day'));
        }

        $list = [];
        foreach ($days as $day) {
            $t0 = strtotime($day . ' 00:00:00');
            $t1 = $t0 + 86399;

            $scanQ = Db::name('qr_scan_logs')->where('business_id', $bid)->where('scan_time', 'between', [$t0, $t1]);
            if ($sid > 0) {
                $scanQ->where('service_id', $sid);
            }
            $scan_count = (int) $scanQ->count();

            $pfx = config('database.prefix');

            $sqlV = "SELECT COUNT(DISTINCT visiter_id) AS c FROM `{$pfx}qr_scan_logs` WHERE business_id=? AND scan_time BETWEEN ? AND ?";
            $bind = [$bid, $t0, $t1];
            if ($sid > 0) {
                $sqlV .= ' AND service_id=?';
                $bind[] = $sid;
            }
            $visitor_row = Db::query($sqlV, $bind);
            $visitor_count = isset($visitor_row[0]['c']) ? (int) $visitor_row[0]['c'] : 0;

            $msgQ = Db::name('chats')->where('business_id', $bid)->where('timestamp', 'between', [$t0, $t1]);
            if ($sid > 0) {
                $msgQ->where('service_id', $sid);
            }
            $message_count = (int) $msgQ->count();

            $banQ = Db::name('ip_blacklist')->where('business_id', $bid)->where('create_time', 'between', [$t0, $t1])->where('status', 1);
            if ($sid > 0) {
                $banQ->where('service_id', $sid);
            }
            $ban_count = (int) $banQ->count();

            $list[] = [
                'date'           => $day,
                'scan_count'     => $scan_count,
                'visitor_count'  => $visitor_count,
                'message_count'  => $message_count,
                'ban_count'      => $ban_count,
            ];
        }

        return json(['code' => 0, 'msg' => 'success', 'data' => $list]);
    }

    /**
     * 客服排行（默认 Top10）
     */
    public function serviceRank()
    {
        $bid = $this->businessId();
        $sid = $this->scopedServiceId();
        list($t0, $t1) = $this->todayTimestampRange();
        $limit = min(50, max(1, (int) $this->request->param('limit', 10)));

        $svcQuery = Db::name('service')->where('business_id', $bid)->field('service_id,user_name,nick_name,state');
        if ($sid > 0) {
            $svcQuery->where('service_id', $sid);
        }
        $services = $svcQuery->select();
        if (!$services) {
            return json(['code' => 0, 'msg' => 'success', 'data' => []]);
        }

        $pfx = config('database.prefix');

        $sqlChat = "SELECT service_id, COUNT(*) AS msg_cnt, COUNT(DISTINCT visiter_id) AS recv_cnt FROM `{$pfx}chats` WHERE business_id=? AND timestamp BETWEEN ? AND ? GROUP BY service_id";
        $chatAgg = Db::query($sqlChat, [$bid, $t0, $t1]);
        $chatMap = [];
        foreach ($chatAgg as $row) {
            $chatMap[(int) $row['service_id']] = [
                'msg_cnt'  => (int) $row['msg_cnt'],
                'recv_cnt' => (int) $row['recv_cnt'],
            ];
        }

        $sqlScan = "SELECT service_id, COUNT(DISTINCT visiter_id) AS scan_vis_cnt FROM `{$pfx}qr_scan_logs` WHERE business_id=? AND scan_time BETWEEN ? AND ? GROUP BY service_id";
        $scanAgg = Db::query($sqlScan, [$bid, $t0, $t1]);
        $scanMap = [];
        foreach ($scanAgg as $row) {
            $scanMap[(int) $row['service_id']] = (int) $row['scan_vis_cnt'];
        }

        $out = [];
        foreach ($services as $s) {
            $id = (int) $s['service_id'];
            $out[] = [
                'service_id'              => $id,
                'user_name'               => $s['user_name'],
                'nick_name'               => $s['nick_name'],
                'state'                   => $s['state'],
                'today_receive_visitor'   => isset($chatMap[$id]) ? $chatMap[$id]['recv_cnt'] : 0,
                'today_message_count'     => isset($chatMap[$id]) ? $chatMap[$id]['msg_cnt'] : 0,
                'today_scan_visitor_count'=> isset($scanMap[$id]) ? $scanMap[$id] : 0,
            ];
        }

        usort($out, function ($a, $b) {
            $va = $a['today_receive_visitor'] * 100000 + $a['today_message_count'];
            $vb = $b['today_receive_visitor'] * 100000 + $b['today_message_count'];
            if ($va === $vb) {
                return 0;
            }

            return $va < $vb ? 1 : -1;
        });

        $out = array_slice($out, 0, $limit);

        return json(['code' => 0, 'msg' => 'success', 'data' => $out]);
    }

    /**
     * 二维码渠道排行（默认 Top10）
     */
    public function channelRank()
    {
        $bid = $this->businessId();
        $sid = $this->scopedServiceId();
        list($t0, $t1) = $this->todayTimestampRange();
        $limit = min(50, max(1, (int) $this->request->param('limit', 10)));

        $q = Db::name('qr_channels')->alias('c')
            ->leftJoin('service s', 'c.service_id = s.service_id')
            ->where('c.business_id', $bid)
            ->where('c.status', '<>', -1)
            ->field('c.id,c.remark,c.service_id,c.scan_count,c.last_scan_time,c.status,s.nick_name as service_nickname')
            ->order('c.scan_count desc,c.id desc')
            ->limit($limit);
        if ($sid > 0) {
            $q->where('c.service_id', $sid);
        }
        $rows = $q->select();

        $ids = [];
        foreach ($rows as $r) {
            $ids[] = (int) $r['id'];
        }
        $todayMap = [];
        if (!empty($ids)) {
            $pfx = config('database.prefix');
            $in = implode(',', array_map('intval', $ids));
            $sql = "SELECT channel_id, COUNT(*) AS c FROM `{$pfx}qr_scan_logs` WHERE business_id=? AND scan_time BETWEEN ? AND ? AND channel_id IN ({$in}) GROUP BY channel_id";
            $agg = Db::query($sql, [$bid, $t0, $t1]);
            foreach ($agg as $a) {
                $todayMap[(int) $a['channel_id']] = (int) $a['c'];
            }
        }

        $visitorMap = [];
        if (!empty($ids)) {
            $pfx = config('database.prefix');
            $in = implode(',', array_map('intval', $ids));
            $sql = "SELECT channel_id, COUNT(DISTINCT visiter_id) AS c FROM `{$pfx}qr_scan_logs` WHERE business_id=? AND channel_id IN ({$in})";
            $bind = [$bid];
            if ($sid > 0) {
                $sql .= ' AND service_id=?';
                $bind[] = $sid;
            }
            $sql .= ' GROUP BY channel_id';
            foreach (Db::query($sql, $bind) as $vr) {
                $visitorMap[(int) $vr['channel_id']] = (int) $vr['c'];
            }
        }

        $list = [];
        foreach ($rows as $r) {
            $cid = (int) $r['id'];
            $list[] = [
                'channel_id'       => $cid,
                'remark'           => $r['remark'],
                'service_id'       => (int) $r['service_id'],
                'service_nickname' => isset($r['service_nickname']) ? $r['service_nickname'] : '',
                'scan_count'       => (int) $r['scan_count'],
                'today_scan_count' => isset($todayMap[$cid]) ? $todayMap[$cid] : 0,
                'visitor_count'    => isset($visitorMap[$cid]) ? $visitorMap[$cid] : 0,
                'status'           => (int) $r['status'],
                'last_scan_time'   => !empty($r['last_scan_time']) ? date('Y-m-d H:i:s', (int) $r['last_scan_time']) : '',
            ];
        }

        return json(['code' => 0, 'msg' => 'success', 'data' => $list]);
    }

    /**
     * 设备统计（近 7 日）：优先扫码日志，无数据则用访客表兜底
     */
    public function deviceStats()
    {
        $bid = $this->businessId();
        $sid = $this->scopedServiceId();
        $since = strtotime('-6 days', strtotime(date('Y-m-d 00:00:00')));

        $scanQ = Db::name('qr_scan_logs')->where('business_id', $bid)->where('scan_time', '>=', $since);
        if ($sid > 0) {
            $scanQ->where('service_id', $sid);
        }
        $agg = $scanQ->field('device_type,COUNT(*) AS c')->group('device_type')->select();

        $bucket = ['iOS' => 0, 'Android' => 0, 'PC' => 0, 'Other' => 0];
        $total = 0;
        foreach ($agg as $row) {
            $k = $this->normalizeDevice($row['device_type']);
            $c = (int) $row['c'];
            $bucket[$k] += $c;
            $total += $c;
        }

        if ($total === 0) {
            $visQ = Db::name('visiter')->where('business_id', $bid)->where('timestamp', '>=', date('Y-m-d H:i:s', $since));
            if ($sid > 0) {
                $vids = Db::name('qr_scan_logs')->where('business_id', $bid)->where('service_id', $sid)->where('scan_time', '>=', $since)->column('visiter_id');
                $vids = array_values(array_unique(array_filter($vids)));
                if (empty($vids)) {
                    $agg2 = [];
                } else {
                    $agg2 = $visQ->where('visiter_id', 'in', $vids)->field('device_type,COUNT(*) AS c')->group('device_type')->select();
                }
            } else {
                $agg2 = $visQ->field('device_type,COUNT(*) AS c')->group('device_type')->select();
            }
            if (!empty($agg2)) {
                foreach ($agg2 as $row) {
                    $k = $this->normalizeDevice($row['device_type']);
                    $bucket[$k] += (int) $row['c'];
                }
            }
        }

        $list = [];
        foreach ($bucket as $name => $cnt) {
            $list[] = ['device' => $name, 'count' => $cnt];
        }

        return json(['code' => 0, 'msg' => 'success', 'data' => $list]);
    }

    /**
     * 地区统计（近 7 日扫码日志 ip_region；visitor_count 为当日志内 distinct 访客）
     */
    public function regionStats()
    {
        $bid = $this->businessId();
        $sid = $this->scopedServiceId();
        $since = strtotime('-6 days', strtotime(date('Y-m-d 00:00:00')));
        $limit = min(50, max(5, (int) $this->request->param('limit', 15)));

        $pfx = config('database.prefix');
        $sql = "SELECT TRIM(ip_region) AS region, COUNT(*) AS scan_count, COUNT(DISTINCT visiter_id) AS visitor_count FROM `{$pfx}qr_scan_logs` WHERE business_id=? AND scan_time>=? ";
        $bind = [$bid, $since];
        if ($sid > 0) {
            $sql .= ' AND service_id=? ';
            $bind[] = $sid;
        }
        $sql .= ' GROUP BY TRIM(ip_region) ORDER BY scan_count DESC LIMIT ' . (int) $limit;

        $rows = Db::query($sql, $bind);
        $list = [];
        foreach ($rows as $row) {
            $rg = trim((string) $row['region']);
            if ($rg === '') {
                $rg = '未知';
            }
            $list[] = [
                'region'        => $rg,
                'scan_count'    => (int) $row['scan_count'],
                'visitor_count' => (int) $row['visitor_count'],
            ];
        }

        return json(['code' => 0, 'msg' => 'success', 'data' => $list]);
    }

    /**
     * 首页「员工管理预览」表格数据（经理可见，不影响其它 dashboard 接口）
     */
    public function staffPreview()
    {
        $login = session('Msg');
        if (!isset($login['level']) || $login['level'] === 'service') {
            return json(['code' => 0, 'msg' => 'success', 'data' => []]);
        }

        $bid = $this->businessId();
        $sid = $this->scopedServiceId();
        list($t0, $t1) = $this->todayTimestampRange();

        $svcQuery = Db::name('service')->where('business_id', $bid)->field('service_id,user_name,nick_name,state');
        if ($sid > 0) {
            $svcQuery->where('service_id', $sid);
        }
        $services = $svcQuery->select();
        if (!$services) {
            return json(['code' => 0, 'msg' => 'success', 'data' => []]);
        }

        $pfx = config('database.prefix');
        $sqlChat = "SELECT service_id, COUNT(*) AS msg_cnt, COUNT(DISTINCT visiter_id) AS recv_cnt FROM `{$pfx}chats` WHERE business_id=? AND timestamp BETWEEN ? AND ? GROUP BY service_id";
        $chatAgg = Db::query($sqlChat, [$bid, $t0, $t1]);
        $chatMap = [];
        foreach ($chatAgg as $row) {
            $chatMap[(int) $row['service_id']] = [
                'msg_cnt'  => (int) $row['msg_cnt'],
                'recv_cnt' => (int) $row['recv_cnt'],
            ];
        }

        $out = [];
        foreach ($services as $s) {
            $id = (int) $s['service_id'];
            $out[] = [
                'service_id'            => $id,
                'user_name'             => $s['user_name'],
                'nick_name'             => $s['nick_name'],
                'state'                 => $s['state'],
                'today_receive_visitor' => isset($chatMap[$id]) ? $chatMap[$id]['recv_cnt'] : 0,
                'today_message_count'   => isset($chatMap[$id]) ? $chatMap[$id]['msg_cnt'] : 0,
            ];
        }

        usort($out, function ($a, $b) {
            $va = $a['today_receive_visitor'] * 100000 + $a['today_message_count'];
            $vb = $b['today_receive_visitor'] * 100000 + $b['today_message_count'];
            if ($va === $vb) {
                return 0;
            }

            return $va < $vb ? 1 : -1;
        });

        $out = array_slice($out, 0, 8);
        $ids = [];
        foreach ($out as $r) {
            $ids[] = (int) $r['service_id'];
        }
        $ipMap = [];
        if (!empty($ids)) {
            $in = implode(',', array_map('intval', $ids));
            $rows = Db::query(
                "SELECT l.uid AS service_id, l.ip FROM `{$pfx}login_log` l INNER JOIN (SELECT uid, MAX(id) AS mid FROM `{$pfx}login_log` WHERE source=2 AND uid IN ({$in}) GROUP BY uid) t ON t.uid = l.uid AND t.mid = l.id",
                []
            );
            foreach ($rows as $row) {
                $ipMap[(int) $row['service_id']] = (string) $row['ip'];
            }
        }

        foreach ($out as &$row) {
            $id = (int) $row['service_id'];
            $row['last_login_ip'] = isset($ipMap[$id]) ? $ipMap[$id] : '-';
            $row['work_state'] = ($row['state'] === 'online') ? '在线' : '离线';
        }
        unset($row);

        return json(['code' => 0, 'msg' => 'success', 'data' => $out]);
    }

    private function normalizeDevice($raw)
    {
        $s = trim((string) $raw);
        if ($s === '') {
            return 'Other';
        }
        $u = strtoupper($s);
        if ($u === 'IOS') {
            return 'iOS';
        }
        if ($u === 'ANDROID') {
            return 'Android';
        }
        if ($u === 'PC') {
            return 'PC';
        }

        return 'Other';
    }
}
