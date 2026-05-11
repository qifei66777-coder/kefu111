<?php
/**
 * 总后台 · 数据中心
 *
 * 视角：当前登录的平台管理员名下全部商户应用聚合统计；不改 wolive_business / wolive_chats / wolive_qr_* 表结构。
 * 仅新增 GET 接口，不修改 Pusher / 登录 / kfchat 校验链路。
 */
namespace app\platform\controller;

use think\Db;

class Dashboard extends Base
{
    protected $noNeedLogin = [];

    /**
     * 获取当前管理员可见的 business_id 列表（基于 wolive_business.admin_id）
     *
     * @return array<int,int> 业务 ID 列表；当返回空数组时，应直接给前端空响应（避免 IN () SQL 异常）
     */
    protected function scopedBusinessIds()
    {
        $adminId = isset($this->admin['id']) ? (int) $this->admin['id'] : 0;
        if ($adminId <= 0) {
            return [];
        }

        $ids = Db::name('business')->where('admin_id', $adminId)->where('is_delete', 0)->column('id');
        if (empty($ids)) {
            return [];
        }

        $out = [];
        foreach ($ids as $i) {
            $out[] = (int) $i;
        }

        return $out;
    }

    /**
     * @return array{0:int,1:int}
     */
    protected function todayTimestampRange()
    {
        $start = strtotime(date('Y-m-d 00:00:00'));
        $end = $start + 86399;

        return [$start, $end];
    }

    /**
     * Dashboard 依赖的二维码/IP扩展表在部分老库里可能还没执行 SQL。
     * 这里做只读探测，缺表时前端显示空状态，不影响总后台打开。
     */
    protected function tableExists($name)
    {
        static $cache = [];
        $table = config('database.prefix') . $name;
        if (isset($cache[$table])) {
            return $cache[$table];
        }

        try {
            $safeTable = str_replace(['`', "'", '"'], '', $table);
            $rows = Db::query("SHOW TABLES LIKE '" . $safeTable . "'");
            $cache[$table] = !empty($rows);
        } catch (\Exception $e) {
            $cache[$table] = false;
        }

        return $cache[$table];
    }

    /**
     * 数据中心首页
     */
    public function index()
    {
        return $this->fetch();
    }

    /**
     * 6 个核心卡片汇总
     */
    public function overview()
    {
        $bids = $this->scopedBusinessIds();
        if (empty($bids)) {
            return json([
                'code' => 0,
                'msg'  => 'success',
                'data' => $this->emptyOverview(),
            ]);
        }

        list($t0, $t1) = $this->todayTimestampRange();
        $hasQrScan = $this->tableExists('qr_scan_logs');
        $hasQrChannels = $this->tableExists('qr_channels');
        $hasIpBlacklist = $this->tableExists('ip_blacklist');

        $today_scan_count = $hasQrScan
            ? (int) Db::name('qr_scan_logs')
                ->where('business_id', 'in', $bids)
                ->where('scan_time', 'between', [$t0, $t1])
                ->count()
            : 0;

        $today_visitor_count = (int) Db::name('visiter')
            ->where('business_id', 'in', $bids)
            ->whereTime('timestamp', 'today')
            ->count();

        $today_channel_count = $hasQrChannels
            ? (int) Db::name('qr_channels')
                ->where('business_id', 'in', $bids)
                ->where('create_time', 'between', [$t0, $t1])
                ->count()
            : 0;

        $today_message_count = (int) Db::name('chats')
            ->where('business_id', 'in', $bids)
            ->where('timestamp', 'between', [$t0, $t1])
            ->count();

        $online_service_count = (int) Db::name('service')
            ->where('business_id', 'in', $bids)
            ->where('state', 'online')
            ->count();

        $total_blacklist_count = $hasIpBlacklist
            ? (int) Db::name('ip_blacklist')
                ->where('business_id', 'in', $bids)
                ->where('status', 1)
                ->count()
            : 0;

        $total_business_count = count($bids);

        $total_channel_count = $hasQrChannels
            ? (int) Db::name('qr_channels')
                ->where('business_id', 'in', $bids)
                ->where('status', '<>', -1)
                ->count()
            : 0;

        return json([
            'code' => 0,
            'msg'  => 'success',
            'data' => [
                'today_scan_count'      => $today_scan_count,
                'today_visitor_count'   => $today_visitor_count,
                'today_channel_count'   => $today_channel_count,
                'today_message_count'   => $today_message_count,
                'online_service_count'  => $online_service_count,
                'total_blacklist_count' => $total_blacklist_count,
                'total_business_count'  => $total_business_count,
                'total_channel_count'   => $total_channel_count,
            ],
        ]);
    }

    /**
     * 最近 7 天（含当日）趋势：扫码 / 访客 / 消息
     */
    public function trend()
    {
        $bids = $this->scopedBusinessIds();
        if (empty($bids)) {
            return json(['code' => 0, 'msg' => 'success', 'data' => []]);
        }

        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $days[] = date('Y-m-d', strtotime('-' . $i . ' day'));
        }

        $pfx = config('database.prefix');
        $in = implode(',', array_map('intval', $bids));
        $hasQrScan = $this->tableExists('qr_scan_logs');
        $list = [];
        foreach ($days as $day) {
            $t0 = strtotime($day . ' 00:00:00');
            $t1 = $t0 + 86399;

            if ($hasQrScan) {
                $scan_count = (int) Db::name('qr_scan_logs')
                    ->where('business_id', 'in', $bids)
                    ->where('scan_time', 'between', [$t0, $t1])
                    ->count();

                $vr = Db::query(
                    "SELECT COUNT(DISTINCT visiter_id) AS c FROM `{$pfx}qr_scan_logs` WHERE business_id IN ({$in}) AND scan_time BETWEEN ? AND ?",
                    [$t0, $t1]
                );
                $visitor_count = isset($vr[0]['c']) ? (int) $vr[0]['c'] : 0;
            } else {
                $scan_count = 0;
                $visitor_count = 0;
            }

            $message_count = (int) Db::name('chats')
                ->where('business_id', 'in', $bids)
                ->where('timestamp', 'between', [$t0, $t1])
                ->count();

            $list[] = [
                'date'           => $day,
                'scan_count'     => $scan_count,
                'visitor_count'  => $visitor_count,
                'message_count'  => $message_count,
            ];
        }

        return json(['code' => 0, 'msg' => 'success', 'data' => $list]);
    }

    /**
     * 客服接待排行（今日，跨商户聚合 Top10）
     */
    public function serviceRank()
    {
        $bids = $this->scopedBusinessIds();
        if (empty($bids)) {
            return json(['code' => 0, 'msg' => 'success', 'data' => []]);
        }

        list($t0, $t1) = $this->todayTimestampRange();
        $limit = min(50, max(1, (int) $this->request->param('limit', 10)));

        $services = Db::name('service')
            ->where('business_id', 'in', $bids)
            ->field('service_id,business_id,user_name,nick_name,state')
            ->select();
        if (!$services) {
            return json(['code' => 0, 'msg' => 'success', 'data' => []]);
        }

        $businessNameMap = [];
        $bizRows = Db::name('business')->where('id', 'in', $bids)->field('id,business_name')->select();
        foreach ($bizRows as $b) {
            $businessNameMap[(int) $b['id']] = $b['business_name'];
        }

        $pfx = config('database.prefix');
        $in = implode(',', array_map('intval', $bids));

        $sqlChat = "SELECT service_id, COUNT(*) AS msg_cnt, COUNT(DISTINCT visiter_id) AS recv_cnt FROM `{$pfx}chats` WHERE business_id IN ({$in}) AND timestamp BETWEEN ? AND ? GROUP BY service_id";
        $chatAgg = Db::query($sqlChat, [$t0, $t1]);
        $chatMap = [];
        foreach ($chatAgg as $row) {
            $chatMap[(int) $row['service_id']] = [
                'msg_cnt'  => (int) $row['msg_cnt'],
                'recv_cnt' => (int) $row['recv_cnt'],
            ];
        }

        $scanMap = [];
        if ($this->tableExists('qr_scan_logs')) {
            $sqlScan = "SELECT service_id, COUNT(DISTINCT visiter_id) AS scan_vis_cnt FROM `{$pfx}qr_scan_logs` WHERE business_id IN ({$in}) AND scan_time BETWEEN ? AND ? GROUP BY service_id";
            $scanAgg = Db::query($sqlScan, [$t0, $t1]);
            foreach ($scanAgg as $row) {
                $scanMap[(int) $row['service_id']] = (int) $row['scan_vis_cnt'];
            }
        }

        $out = [];
        foreach ($services as $s) {
            $id = (int) $s['service_id'];
            $bid = (int) $s['business_id'];
            $out[] = [
                'service_id'              => $id,
                'business_id'             => $bid,
                'business_name'           => isset($businessNameMap[$bid]) ? $businessNameMap[$bid] : '',
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
     * 二维码渠道排行（Top10）
     */
    public function channelRank()
    {
        $bids = $this->scopedBusinessIds();
        if (empty($bids)) {
            return json(['code' => 0, 'msg' => 'success', 'data' => []]);
        }

        list($t0, $t1) = $this->todayTimestampRange();
        $limit = min(50, max(1, (int) $this->request->param('limit', 10)));
        if (!$this->tableExists('qr_channels')) {
            return json(['code' => 0, 'msg' => 'success', 'data' => []]);
        }

        $rows = Db::name('qr_channels')->alias('c')
            ->join('service s', 'c.service_id = s.service_id', 'LEFT')
            ->where('c.business_id', 'in', $bids)
            ->where('c.status', '<>', -1)
            ->field('c.id,c.business_id,c.remark,c.service_id,c.scan_count,c.last_scan_time,c.status,s.nick_name as service_nickname')
            ->order('c.scan_count desc,c.id desc')
            ->limit($limit)
            ->select();

        $list = [];
        $ids = [];
        foreach ($rows as $r) {
            $ids[] = (int) $r['id'];
        }

        $todayMap = [];
        if (!empty($ids) && $this->tableExists('qr_scan_logs')) {
            $pfx = config('database.prefix');
            $inCh = implode(',', array_map('intval', $ids));
            $sql = "SELECT channel_id, COUNT(*) AS c FROM `{$pfx}qr_scan_logs` WHERE scan_time BETWEEN ? AND ? AND channel_id IN ({$inCh}) GROUP BY channel_id";
            foreach (Db::query($sql, [$t0, $t1]) as $a) {
                $todayMap[(int) $a['channel_id']] = (int) $a['c'];
            }
        }

        foreach ($rows as $r) {
            $cid = (int) $r['id'];
            $list[] = [
                'channel_id'       => $cid,
                'business_id'      => (int) $r['business_id'],
                'remark'           => $r['remark'],
                'service_id'       => (int) $r['service_id'],
                'service_nickname' => isset($r['service_nickname']) ? $r['service_nickname'] : '',
                'scan_count'       => (int) $r['scan_count'],
                'today_scan_count' => isset($todayMap[$cid]) ? $todayMap[$cid] : 0,
                'status'           => (int) $r['status'],
                'last_scan_time'   => !empty($r['last_scan_time']) ? date('Y-m-d H:i:s', (int) $r['last_scan_time']) : '',
            ];
        }

        return json(['code' => 0, 'msg' => 'success', 'data' => $list]);
    }

    /**
     * 设备分布（近 7 日）：优先扫码日志 device_type，无数据则用访客表 device_type 兜底
     */
    public function deviceStats()
    {
        $bids = $this->scopedBusinessIds();
        if (empty($bids)) {
            return json(['code' => 0, 'msg' => 'success', 'data' => $this->emptyDeviceList()]);
        }

        $since = strtotime('-6 days', strtotime(date('Y-m-d 00:00:00')));

        $bucket = ['iOS' => 0, 'Android' => 0, 'PC' => 0, 'Other' => 0];
        $total = 0;
        if ($this->tableExists('qr_scan_logs')) {
            $agg = Db::name('qr_scan_logs')
                ->where('business_id', 'in', $bids)
                ->where('scan_time', '>=', $since)
                ->field('device_type,COUNT(*) AS c')
                ->group('device_type')
                ->select();

            foreach ($agg as $row) {
                $k = $this->normalizeDevice($row['device_type']);
                $c = (int) $row['c'];
                $bucket[$k] += $c;
                $total += $c;
            }
        }

        if ($total === 0) {
            $agg2 = Db::name('visiter')
                ->where('business_id', 'in', $bids)
                ->where('timestamp', '>=', date('Y-m-d H:i:s', $since))
                ->field('device_type,COUNT(*) AS c')
                ->group('device_type')
                ->select();
            foreach ($agg2 as $row) {
                $k = $this->normalizeDevice($row['device_type']);
                $bucket[$k] += (int) $row['c'];
            }
        }

        $list = [];
        foreach ($bucket as $name => $cnt) {
            $list[] = ['device' => $name, 'count' => $cnt];
        }

        return json(['code' => 0, 'msg' => 'success', 'data' => $list]);
    }

    /**
     * 地区分布（近 7 日扫码日志聚合 ip_region 前 N）
     */
    public function regionStats()
    {
        $bids = $this->scopedBusinessIds();
        if (empty($bids)) {
            return json(['code' => 0, 'msg' => 'success', 'data' => []]);
        }

        $since = strtotime('-6 days', strtotime(date('Y-m-d 00:00:00')));
        $limit = min(50, max(5, (int) $this->request->param('limit', 15)));
        if (!$this->tableExists('qr_scan_logs')) {
            return json(['code' => 0, 'msg' => 'success', 'data' => []]);
        }

        $pfx = config('database.prefix');
        $in = implode(',', array_map('intval', $bids));
        $sql = "SELECT TRIM(ip_region) AS region, COUNT(*) AS scan_count, COUNT(DISTINCT visiter_id) AS visitor_count FROM `{$pfx}qr_scan_logs` WHERE business_id IN ({$in}) AND scan_time>=? GROUP BY TRIM(ip_region) ORDER BY scan_count DESC LIMIT " . (int) $limit;

        $rows = Db::query($sql, [$since]);
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
     * 商户预览（前 N，附今日消息/在线客服）
     */
    public function businessPreview()
    {
        $bids = $this->scopedBusinessIds();
        if (empty($bids)) {
            return json(['code' => 0, 'msg' => 'success', 'data' => []]);
        }

        list($t0, $t1) = $this->todayTimestampRange();
        $limit = min(50, max(1, (int) $this->request->param('limit', 8)));

        $rows = Db::name('business')
            ->where('id', 'in', $bids)
            ->where('is_delete', 0)
            ->field('id,business_name,max_count,expire_time,is_recycle')
            ->order('id desc')
            ->limit($limit)
            ->select();

        $pfx = config('database.prefix');
        $inB = implode(',', array_map('intval', $bids));

        $msgMap = [];
        foreach (Db::query("SELECT business_id, COUNT(*) AS c FROM `{$pfx}chats` WHERE business_id IN ({$inB}) AND timestamp BETWEEN ? AND ? GROUP BY business_id", [$t0, $t1]) as $r) {
            $msgMap[(int) $r['business_id']] = (int) $r['c'];
        }

        $svcMap = [];
        foreach (Db::query("SELECT business_id, COUNT(*) AS c FROM `{$pfx}service` WHERE business_id IN ({$inB}) AND state='online' GROUP BY business_id", []) as $r) {
            $svcMap[(int) $r['business_id']] = (int) $r['c'];
        }

        $out = [];
        foreach ($rows as $r) {
            $id = (int) $r['id'];
            $out[] = [
                'business_id'       => $id,
                'business_name'     => $r['business_name'],
                'max_count'         => (int) $r['max_count'],
                'expire_time'       => $r['expire_time'],
                'is_recycle'        => (int) $r['is_recycle'],
                'today_msg_count'   => isset($msgMap[$id]) ? $msgMap[$id] : 0,
                'online_svc_count'  => isset($svcMap[$id]) ? $svcMap[$id] : 0,
            ];
        }

        return json(['code' => 0, 'msg' => 'success', 'data' => $out]);
    }

    private function emptyOverview()
    {
        return [
            'today_scan_count'      => 0,
            'today_visitor_count'   => 0,
            'today_channel_count'   => 0,
            'today_message_count'   => 0,
            'online_service_count'  => 0,
            'total_blacklist_count' => 0,
            'total_business_count'  => 0,
            'total_channel_count'   => 0,
        ];
    }

    private function emptyDeviceList()
    {
        return [
            ['device' => 'iOS', 'count' => 0],
            ['device' => 'Android', 'count' => 0],
            ['device' => 'PC', 'count' => 0],
            ['device' => 'Other', 'count' => 0],
        ];
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
