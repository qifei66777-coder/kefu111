<?php

namespace app\admin\controller;

use app\Common;
use think\Db;

/**
 * QR channel extensions for the customer service chat MVP.
 */
class Qrchannel extends Base
{
    public function templates()
    {
        $login = session('Msg');
        $list = Db::name('qr_templates')
            ->where('business_id', $login['business_id'])
            ->where('is_delete', 0)
            ->order('id desc')
            ->select();

        if (empty($list)) {
            $list = [[
                'id' => 0,
                'template_name' => '默认模板',
                'image' => '',
                'remark' => '系统默认二维码模板',
                'status' => 1,
            ]];
        }

        return json(['code' => 0, 'msg' => 'success', 'data' => $list]);
    }

    public function saveTemplate()
    {
        $login = session('Msg');
        $post = $this->request->post();
        $name = isset($post['template_name']) ? trim($post['template_name']) : '';

        if ($name === '') {
            return json(['code' => 1, 'msg' => '模板名称不能为空']);
        }

        $data = [
            'business_id' => $login['business_id'],
            'service_id' => $login['service_id'],
            'template_name' => htmlspecialchars($name),
            'image' => isset($post['image']) ? trim($post['image']) : '',
            'remark' => isset($post['remark']) ? htmlspecialchars(trim($post['remark'])) : '',
            'status' => isset($post['status']) ? intval($post['status']) : 1,
            'update_time' => time(),
        ];

        $id = isset($post['id']) ? intval($post['id']) : 0;
        if ($id > 0) {
            Db::name('qr_templates')
                ->where('id', $id)
                ->where('business_id', $login['business_id'])
                ->update($data);
        } else {
            $data['create_time'] = time();
            $id = Db::name('qr_templates')->insertGetId($data);
        }

        return json(['code' => 0, 'msg' => '保存成功', 'data' => ['id' => $id]]);
    }

    public function uploadTemplate()
    {
        $file = request()->file('file');
        if (!$file) {
            return json(['code' => 1, 'msg' => '请选择模板图片']);
        }

        $path = ROOT_PATH . 'public' . DS . 'upload' . DS . 'qr_templates';
        $info = $file->validate(['size' => 5 * 1024 * 1024, 'ext' => 'jpg,jpeg,png,gif,webp'])->move($path, uniqid() . time());
        if (!$info) {
            return json(['code' => 1, 'msg' => $file->getError()]);
        }

        $url = BASEROOT . '/upload/qr_templates/' . str_replace('\\', '/', $info->getSaveName());
        return json(['code' => 0, 'msg' => '上传成功', 'data' => ['url' => $url]]);
    }

    public function toggleTemplate()
    {
        $login = session('Msg');
        $id = intval($this->request->post('id', 0));
        $status = intval($this->request->post('status', 0));

        if ($id <= 0) {
            return json(['code' => 1, 'msg' => '模板不存在']);
        }

        Db::name('qr_templates')
            ->where('id', $id)
            ->where('business_id', $login['business_id'])
            ->update(['status' => $status ? 1 : 0, 'update_time' => time()]);

        return json(['code' => 0, 'msg' => '操作成功']);
    }

    public function deleteTemplate()
    {
        $login = session('Msg');
        $id = intval($this->request->post('id', 0));

        if ($id <= 0) {
            return json(['code' => 1, 'msg' => '模板不存在']);
        }

        Db::name('qr_templates')
            ->where('id', $id)
            ->where('business_id', $login['business_id'])
            ->update(['is_delete' => 1, 'update_time' => time()]);

        return json(['code' => 0, 'msg' => '删除成功']);
    }

    public function create()
    {
        $login = session('Msg');
        $templateId = intval($this->request->post('template_id', 0));
        $remark = trim($this->request->post('remark', ''));

        if ($templateId > 0) {
            $template = Db::name('qr_templates')
                ->where('id', $templateId)
                ->where('business_id', $login['business_id'])
                ->where('is_delete', 0)
                ->find();
            if (!$template) {
                return json(['code' => 1, 'msg' => '二维码模板不存在']);
            }
            if (intval($template['status']) !== 1) {
                return json(['code' => 1, 'msg' => '二维码模板已禁用']);
            }
        }

        $token = $this->makeToken();
        $now = time();
        $data = [
            'business_id' => $login['business_id'],
            'service_id' => $login['service_id'],
            'template_id' => $templateId,
            'channel_token' => $token,
            'remark' => htmlspecialchars($remark),
            'status' => 1,
            'scan_count' => 0,
            'last_scan_time' => 0,
            'create_time' => $now,
            'update_time' => $now,
        ];

        $id = Db::name('qr_channels')->insertGetId($data);
        $url = url('index/index/kfchat', ['ch' => $id, 'token' => $token], true, true);
        Db::name('qr_channels')->where('id', $id)->update(['url' => $url]);

        return json([
            'code' => 0,
            'msg' => '生成成功',
            'data' => [
                'id' => $id,
                'token' => $token,
                'url' => $url,
            ],
        ]);
    }

    /**
     * 二维码渠道管理页（视图）
     */
    public function channelPage()
    {
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $svcQuery = Db::name('service')->where('business_id', $bid);
        if (isset($login['level']) && $login['level'] === 'service') {
            $svcQuery->where('service_id', (int) $login['service_id']);
        }
        $services = $svcQuery->field('service_id,user_name,nick_name')->order('service_id asc')->select();
        $templates = Db::name('qr_templates')
            ->where('business_id', $bid)
            ->where('is_delete', 0)
            ->field('id,template_name')
            ->order('id desc')
            ->select();
        $this->assign('services', $services);
        $this->assign('templates', $templates);
        $this->assign('part', '二维码渠道');
        $this->assign('title', '二维码渠道管理');

        return $this->fetch('channel_list');
    }

    /**
     * 扫码记录页（视图）
     */
    public function scanPage()
    {
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $svcQuery = Db::name('service')->where('business_id', $bid);
        if (isset($login['level']) && $login['level'] === 'service') {
            $svcQuery->where('service_id', (int) $login['service_id']);
        }
        $services = $svcQuery->field('service_id,user_name,nick_name')->order('service_id asc')->select();
        $channels = Db::name('qr_channels')
            ->where('business_id', $bid)
            ->where('status', '<>', -1)
            ->field('id,remark')
            ->order('id desc')
            ->limit(500)
            ->select();
        $this->assign('services', $services);
        $this->assign('channels', $channels);
        $this->assign('part', '扫码记录');
        $this->assign('title', '扫码记录');

        return $this->fetch('scan_logs');
    }

    /**
     * 渠道列表（JSON，支持筛选与分页）
     */
    public function channelList()
    {
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $page = max(1, (int) $this->request->param('page', 1));
        $limit = min(100, max(1, (int) $this->request->param('limit', 20)));

        try {
        $query = Db::name('qr_channels')->alias('c')
            ->join('service s', 'c.service_id = s.service_id', 'LEFT')
            ->join('qr_templates t', 'c.template_id = t.id AND t.business_id = ' . $bid, 'LEFT')
            ->where('c.business_id', $bid);

        if (isset($login['level']) && $login['level'] === 'service') {
            $query->where('c.service_id', (int) $login['service_id']);
        }

        $statusIn = $this->request->param('status', '');
        if ($statusIn === '' || $statusIn === null) {
            $query->where('c.status', 'in', [0, 1]);
        } else {
            $st = (int) $statusIn;
            $query->where('c.status', $st);
        }

        $sid = (int) $this->request->param('service_id', 0);
        if ($sid > 0) {
            $query->where('c.service_id', $sid);
        }
        $tid = (int) $this->request->param('template_id', 0);
        if ($tid > 0) {
            $query->where('c.template_id', $tid);
        }
        $keyword = trim((string) $this->request->param('keyword', ''));
        if ($keyword !== '') {
            $query->where('c.remark', 'like', '%' . addcslashes($keyword, '%_\\') . '%');
        }
        $start = $this->request->param('start_time', '');
        $end = $this->request->param('end_time', '');
        if ($start !== '' && $start !== null) {
            $ts = is_numeric($start) ? (int) $start : strtotime($start);
            if ($ts > 0) {
                $query->where('c.create_time', '>=', $ts);
            }
        }
        if ($end !== '' && $end !== null) {
            $te = is_numeric($end) ? (int) $end : strtotime($end);
            if ($te > 0) {
                $query->where('c.create_time', '<=', $te + 86399);
            }
        }

        $pager = $query->field('c.*,s.user_name as service_user_name,s.nick_name as service_nick_name,t.template_name,t.image as template_image')
            ->order('c.id desc')
            ->paginate($limit, false, ['page' => $page]);
        $total = $pager->total();
        $rows  = $pager->items();

        $list = [];
        foreach ($rows as $r) {
            $list[] = $this->formatChannelRow($r, $bid);
        }

        return json(['code' => 0, 'msg' => 'success', 'count' => $total, 'data' => $list]);
        } catch (\Exception $e) {
            return $this->emptyTableResponse('二维码管理数据查询异常：' . $e->getMessage());
        }
    }

    /**
     * 启用 / 禁用渠道（status 仅允许 0 或 1）
     */
    public function channelStatus()
    {
        $login = session('Msg');
        $id = (int) $this->request->post('id', 0);
        $status = (int) $this->request->post('status', -99);
        if ($id <= 0 || ($status !== 0 && $status !== 1)) {
            return json(['code' => 1, 'msg' => '参数错误']);
        }
        $q = Db::name('qr_channels')->where('id', $id)->where('business_id', (int) $login['business_id']);
        if (isset($login['level']) && $login['level'] === 'service') {
            $q->where('service_id', (int) $login['service_id']);
        }
        $ok = $q->update(['status' => $status, 'update_time' => time()]);
        if ($ok === false) {
            return json(['code' => 1, 'msg' => '更新失败']);
        }

        return json(['code' => 0, 'msg' => '操作成功']);
    }

    /**
     * 软删除渠道（status = -1）
     */
    public function channelDelete()
    {
        $login = session('Msg');
        $id = (int) $this->request->post('id', 0);
        if ($id <= 0) {
            return json(['code' => 1, 'msg' => '参数错误']);
        }
        $q = Db::name('qr_channels')->where('id', $id)->where('business_id', (int) $login['business_id']);
        if (isset($login['level']) && $login['level'] === 'service') {
            $q->where('service_id', (int) $login['service_id']);
        }
        $ok = $q->update(['status' => -1, 'update_time' => time()]);
        if ($ok === false) {
            return json(['code' => 1, 'msg' => '删除失败']);
        }

        return json(['code' => 0, 'msg' => '已删除']);
    }

    /**
     * 渠道详情（含今日扫码、最近 20 条记录）
     */
    public function channelDetail()
    {
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $id = (int) $this->request->param('id', 0);
        if ($id <= 0) {
            return json(['code' => 1, 'msg' => '参数错误']);
        }
        $q = Db::name('qr_channels')->alias('c')
            ->join('service s', 'c.service_id = s.service_id', 'LEFT')
            ->join('qr_templates t', 'c.template_id = t.id AND t.business_id = ' . $bid, 'LEFT')
            ->where('c.id', $id)
            ->where('c.business_id', $bid);
        if (isset($login['level']) && $login['level'] === 'service') {
            $q->where('c.service_id', (int) $login['service_id']);
        }
        $row = $q->field('c.*,s.user_name as service_user_name,s.nick_name as service_nick_name,s.avatar as service_avatar,t.template_name,t.image as template_image,t.remark as template_remark,t.status as template_status')
            ->find();
        if (!$row) {
            return json(['code' => 1, 'msg' => '渠道不存在']);
        }

        $dayStart = strtotime('today');
        $dayEnd = $dayStart + 86400 - 1;
        $todayScan = (int) Db::name('qr_scan_logs')
            ->where('channel_id', $id)
            ->where('scan_time', 'between', [$dayStart, $dayEnd])
            ->count();

        $logs = Db::name('qr_scan_logs')->alias('l')
            ->join('service s', 'l.service_id = s.service_id', 'LEFT')
            ->where('l.channel_id', $id)
            ->field('l.id,l.visiter_id,l.ip,l.ip_region,l.device_type,l.user_agent,l.from_url,l.scan_time,s.nick_name as service_nick_name')
            ->order('l.scan_time desc')
            ->limit(20)
            ->select();
        $logOut = [];
        foreach ($logs as $l) {
            $logOut[] = [
                'id'          => (int) $l['id'],
                'visiter_id'  => $l['visiter_id'],
                'ip'          => $l['ip'],
                'region'      => $l['ip_region'],
                'device_type' => $l['device_type'],
                'user_agent'  => $l['user_agent'],
                'referer'     => $l['from_url'],
                'created_at'  => $l['scan_time'] ? date('Y-m-d H:i:s', (int) $l['scan_time']) : '',
                'service_nick_name' => $l['service_nick_name'],
            ];
        }

        $channel = $this->formatChannelRow($row, $bid);

        return json([
            'code' => 0,
            'msg'  => 'success',
            'data' => [
                'channel'     => $channel,
                'service'     => [
                    'service_id' => (int) $row['service_id'],
                    'user_name'  => isset($row['service_user_name']) ? $row['service_user_name'] : '',
                    'nick_name'  => isset($row['service_nick_name']) ? $row['service_nick_name'] : '',
                ],
                'template'    => [
                    'id'          => (int) $row['template_id'],
                    'name'        => $channel['template_name'],
                    'image'       => isset($row['template_image']) ? $row['template_image'] : '',
                    'remark'      => isset($row['template_remark']) ? $row['template_remark'] : '',
                    'status'      => isset($row['template_status']) ? (int) $row['template_status'] : null,
                ],
                'scan_total'  => (int) $row['scan_count'],
                'today_scan'  => $todayScan,
                'recent_logs' => $logOut,
            ],
        ]);
    }

    /**
     * 扫码记录列表（JSON）
     */
    public function scanLogs()
    {
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $page = max(1, (int) $this->request->param('page', 1));
        $limit = min(100, max(1, (int) $this->request->param('limit', 20)));

        try {
        $query = Db::name('qr_scan_logs')->alias('l')
            ->join('qr_channels ch', 'l.channel_id = ch.id', 'LEFT')
            ->join('service s', 'l.service_id = s.service_id', 'LEFT')
            ->where('l.business_id', $bid);

        if (isset($login['level']) && $login['level'] === 'service') {
            $query->where('l.service_id', (int) $login['service_id']);
        }

        $cid = (int) $this->request->param('channel_id', 0);
        if ($cid > 0) {
            $query->where('l.channel_id', $cid);
        }
        $sid = (int) $this->request->param('service_id', 0);
        if ($sid > 0) {
            $query->where('l.service_id', $sid);
        }
        $ip = trim((string) $this->request->param('ip', ''));
        if ($ip !== '') {
            $query->where('l.ip', $ip);
        }
        $dev = trim((string) $this->request->param('device_type', ''));
        if ($dev !== '') {
            $query->where('l.device_type', $dev);
        }
        $keyword = trim((string) $this->request->param('keyword', ''));
        if ($keyword !== '') {
            $like = '%' . addcslashes($keyword, '%_\\') . '%';
            $query->whereRaw('(l.visiter_id LIKE ? OR ch.remark LIKE ?)', [$like, $like]);
        }
        $start = $this->request->param('start_time', '');
        $end = $this->request->param('end_time', '');
        if ($start !== '' && $start !== null) {
            $ts = is_numeric($start) ? (int) $start : strtotime($start);
            if ($ts > 0) {
                $query->where('l.scan_time', '>=', $ts);
            }
        }
        if ($end !== '' && $end !== null) {
            $te = is_numeric($end) ? (int) $end : strtotime($end);
            if ($te > 0) {
                $query->where('l.scan_time', '<=', $te + 86399);
            }
        }

        $total = (int) $query->count('l.id');
        $rows = $query->field('l.*,ch.remark as channel_remark,s.nick_name as service_nick_name')
            ->order('l.id desc')
            ->page($page, $limit)
            ->select();

        $list = [];
        foreach ($rows as $r) {
            $list[] = [
                'id'             => (int) $r['id'],
                'channel_id'     => (int) $r['channel_id'],
                'channel_remark' => isset($r['channel_remark']) ? $r['channel_remark'] : '',
                'service_id'     => (int) $r['service_id'],
                'service_nick'   => isset($r['service_nick_name']) ? $r['service_nick_name'] : '',
                'visiter_id'     => $r['visiter_id'],
                'ip'             => $r['ip'],
                'region'         => $r['ip_region'],
                'device_type'    => $r['device_type'],
                'user_agent'     => $r['user_agent'],
                'referer'        => $r['from_url'],
                'created_at'     => $r['scan_time'] ? date('Y-m-d H:i:s', (int) $r['scan_time']) : '',
            ];
        }

        return json(['code' => 0, 'msg' => 'success', 'count' => $total, 'data' => $list]);
        } catch (\Exception $e) {
            return $this->emptyTableResponse('扫码记录数据查询异常：' . $e->getMessage());
        }
    }

    /**
     * 扫码欢迎语配置页
     */
    public function welcomePage()
    {
        $login = session('Msg');
        $this->assign('part', '扫码欢迎语');
        $this->assign('title', '扫码欢迎语');

        return $this->fetch('welcome');
    }

    /**
     * 当前商户扫码欢迎语配置 JSON
     */
    public function welcomeConfig()
    {
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $row = Db::name('business')->where('id', $bid)->find();
        $en = (isset($row['scan_welcome_enabled']) ? (int) $row['scan_welcome_enabled'] : 1) ? 1 : 0;
        $msg = isset($row['scan_welcome_message']) ? (string) $row['scan_welcome_message'] : '';
        $msg = htmlspecialchars_decode($msg, ENT_QUOTES);

        return json([
            'code' => 0,
            'msg'  => 'success',
            'data' => [
                'scan_welcome_enabled'  => $en,
                'scan_welcome_message'  => $msg,
                'default_hint'          => \app\common\lib\QrWelcome::DEFAULT_TEXT,
                'sentence_hint'         => '若该渠道客服在「常用语」中设置了默认常用语（状态为使用中），将优先于下方商户文案展示。',
            ],
        ]);
    }

    /**
     * 保存扫码欢迎语
     */
    public function saveWelcome()
    {
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $en = (int) $this->request->post('scan_welcome_enabled', 1) ? 1 : 0;
        $msg = trim((string) $this->request->post('scan_welcome_message', ''));
        if (mb_strlen($msg, 'UTF-8') > 2000) {
            return json(['code' => 1, 'msg' => '欢迎语内容过长']);
        }
        Db::name('business')->where('id', $bid)->update([
            'scan_welcome_enabled'  => $en,
            'scan_welcome_message'  => htmlspecialchars($msg, ENT_QUOTES, 'UTF-8'),
        ]);

        return json(['code' => 0, 'msg' => '保存成功']);
    }

    /**
     * IP 黑名单管理页
     */
    public function blacklistPage()
    {
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $svcQuery = Db::name('service')->where('business_id', $bid);
        if (isset($login['level']) && $login['level'] === 'service') {
            $svcQuery->where('service_id', (int) $login['service_id']);
        }
        $services = $svcQuery->field('service_id,user_name,nick_name')->order('service_id asc')->select();
        $this->assign('services', $services);
        $this->assign('part', 'IP黑名单');
        $this->assign('title', 'IP黑名单');

        return $this->fetch('blacklist');
    }

    /**
     * IP 黑名单分页 JSON（仅 status=1）
     */
    public function blacklist()
    {
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $page = max(1, (int) $this->request->param('page', 1));
        $limit = min(100, max(1, (int) $this->request->param('limit', 20)));

        try {
        $query = Db::name('ip_blacklist')->alias('b')
            ->join('service s', 'b.service_id = s.service_id', 'LEFT')
            ->join('service s2', 'b.created_by = s2.service_id', 'LEFT')
            ->where('b.business_id', $bid)
            ->where('b.status', 1);

        if (isset($login['level']) && $login['level'] === 'service') {
            $query->where('b.service_id', (int) $login['service_id']);
        }

        $ip = trim((string) $this->request->param('ip', ''));
        if ($ip !== '') {
            $query->where('b.ip', 'like', '%' . addcslashes($ip, '%_\\') . '%');
        }
        $sid = (int) $this->request->param('service_id', 0);
        if ($sid > 0) {
            $query->where('b.service_id', $sid);
        }
        $cbt = trim((string) $this->request->param('created_by_type', ''));
        if ($cbt !== '') {
            $query->where('b.created_by_type', $cbt);
        }
        $reasonKw = trim((string) $this->request->param('reason', ''));
        if ($reasonKw !== '') {
            $query->where('b.reason', 'like', '%' . addcslashes($reasonKw, '%_\\') . '%');
        }
        $start = $this->request->param('start_time', '');
        $end = $this->request->param('end_time', '');
        if ($start !== '' && $start !== null) {
            $ts = is_numeric($start) ? (int) $start : strtotime($start);
            if ($ts > 0) {
                $query->where('b.create_time', '>=', $ts);
            }
        }
        if ($end !== '' && $end !== null) {
            $te = is_numeric($end) ? (int) $end : strtotime($end);
            if ($te > 0) {
                $query->where('b.create_time', '<=', $te + 86399);
            }
        }

        $pager = $query->field('b.*,s.user_name as svc_user,s.nick_name as svc_nick,s2.user_name as cb_user,s2.nick_name as cb_nick')
            ->order('b.id desc')
            ->paginate($limit, false, ['page' => $page]);
        $total = $pager->total();
        $rows  = $pager->items();

        $ips = [];
        foreach ($rows as $r) {
            if (!empty($r['ip'])) {
                $ips[$r['ip']] = true;
            }
        }
        $ipList = array_keys($ips);
        $scanMap = [];
        $regionMap = [];
        $visMap = [];
        if (!empty($ipList)) {
            $agg = Db::name('qr_scan_logs')
                ->where('business_id', $bid)
                ->where('ip', 'in', $ipList)
                ->group('ip')
                ->field('ip,COUNT(*) as scan_cnt,MAX(scan_time) as last_scan')
                ->select();
            foreach ($agg as $a) {
                $scanMap[$a['ip']] = [
                    'scan_count'     => (int) $a['scan_cnt'],
                    'last_scan_time' => (int) $a['last_scan'],
                ];
            }
            $vagg = Db::name('visiter')
                ->where('business_id', $bid)
                ->where('ip', 'in', $ipList)
                ->group('ip')
                ->field('ip,COUNT(DISTINCT visiter_id) as vc')
                ->select();
            foreach ($vagg as $v) {
                $visMap[$v['ip']] = (int) $v['vc'];
            }
            foreach ($ipList as $oneIp) {
                $reg = Db::name('qr_scan_logs')
                    ->where('business_id', $bid)
                    ->where('ip', $oneIp)
                    ->where('ip_region', '<>', '')
                    ->order('scan_time desc')
                    ->value('ip_region');
                $regionMap[$oneIp] = $reg ?: '';
            }
        }

        $list = [];
        foreach ($rows as $r) {
            $ipRow = $r['ip'];
            $cbName = '';
            if (!empty($r['cb_nick'])) {
                $cbName = $r['cb_nick'];
            } elseif (!empty($r['cb_user'])) {
                $cbName = $r['cb_user'];
            } elseif (isset($r['created_by_type']) && $r['created_by_type'] !== '' && $r['created_by_type'] !== 'service') {
                $cbName = '管理员';
            }
            $region = !empty($r['ip_region']) ? $r['ip_region'] : (isset($regionMap[$ipRow]) ? $regionMap[$ipRow] : '');
            $sc = isset($scanMap[$ipRow]) ? $scanMap[$ipRow]['scan_count'] : 0;
            $ls = isset($scanMap[$ipRow]) ? $scanMap[$ipRow]['last_scan_time'] : 0;
            $list[] = [
                'id'               => (int) $r['id'],
                'business_id'      => (int) $r['business_id'],
                'service_id'       => (int) $r['service_id'],
                'service_name'     => isset($r['svc_user']) ? $r['svc_user'] : '',
                'service_nickname' => isset($r['svc_nick']) ? $r['svc_nick'] : '',
                'ip'               => $ipRow,
                'region'           => $region,
                'reason'           => $r['reason'],
                'created_by_type'  => isset($r['created_by_type']) ? $r['created_by_type'] : '',
                'created_by'       => isset($r['created_by']) ? (int) $r['created_by'] : 0,
                'created_by_name'  => $cbName,
                'created_at'       => !empty($r['create_time']) ? date('Y-m-d H:i:s', (int) $r['create_time']) : '',
                'scan_count'       => $sc,
                'visitor_count'    => isset($visMap[$ipRow]) ? $visMap[$ipRow] : 0,
                'last_scan_time'   => $ls > 0 ? date('Y-m-d H:i:s', $ls) : '',
            ];
        }

        return json(['code' => 0, 'msg' => 'success', 'count' => $total, 'data' => $list]);
        } catch (\Exception $e) {
            return $this->emptyTableResponse('IP黑名单数据查询异常：' . $e->getMessage());
        }
    }

    public function banIp()
    {
        $login = session('Msg');
        $common = new Common();
        $ip = trim($this->request->post('ip', ''));
        $reason = trim($this->request->post('reason', ''));
        $bid = (int) $login['business_id'];

        if ($ip === '') {
            return json(['code' => 1, 'msg' => 'IP不能为空']);
        }
        if (!$common->isValidClientIp($ip)) {
            return json(['code' => 1, 'msg' => 'IP地址不合法']);
        }

        $level = isset($login['level']) ? $login['level'] : 'service';
        $createdByType = $level;
        $createdBy = (int) $login['service_id'];

        $recordServiceId = (int) $login['service_id'];
        $postSid = (int) $this->request->post('service_id', 0);
        if ($level !== 'service' && $postSid > 0) {
            $okSvc = Db::name('service')->where('business_id', $bid)->where('service_id', $postSid)->find();
            if ($okSvc) {
                $recordServiceId = $postSid;
            }
        }

        $exists = Db::name('ip_blacklist')
            ->where('business_id', $bid)
            ->where('ip', $ip)
            ->find();

        if ($exists && (int) $exists['status'] === 1) {
            return json(['code' => 1, 'msg' => '已在黑名单']);
        }

        $now = time();
        $data = [
            'ip_region'        => trim($this->request->post('ip_region', '')),
            'reason'           => htmlspecialchars($reason),
            'service_id'       => $recordServiceId,
            'created_by_type'  => $createdByType,
            'created_by'       => $createdBy,
            'status'           => 1,
            'create_time'      => $now,
            'release_time'     => 0,
        ];

        if ($exists) {
            Db::name('ip_blacklist')->where('id', $exists['id'])->update($data);
        } else {
            $data['business_id'] = $bid;
            $data['ip'] = $ip;
            Db::name('ip_blacklist')->insert($data);
        }

        return json(['code' => 0, 'msg' => '封禁成功']);
    }

    public function unbanIp()
    {
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $id = (int) $this->request->post('id', 0);
        $ip = trim($this->request->post('ip', ''));

        $query = Db::name('ip_blacklist')->where('business_id', $bid)->where('status', 1);
        if (isset($login['level']) && $login['level'] === 'service') {
            $query->where('service_id', (int) $login['service_id']);
        }
        if ($id > 0) {
            $query->where('id', $id);
        } elseif ($ip !== '') {
            $query->where('ip', $ip);
        } else {
            return json(['code' => 1, 'msg' => '请选择要解禁的IP']);
        }

        $row = $query->find();
        if (!$row) {
            return json(['code' => 1, 'msg' => '记录不存在或无权操作']);
        }

        Db::name('ip_blacklist')->where('id', $row['id'])->update(['status' => 0, 'release_time' => time()]);

        return json(['code' => 0, 'msg' => '解禁成功']);
    }

    /**
     * 某 IP 在本商户下的关联数据（扫码、访客、渠道、客服、历史入口）
     */
    public function ipRelated()
    {
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $ip = trim((string) $this->request->param('ip', ''));
        if ($ip === '') {
            return json(['code' => 1, 'msg' => 'IP不能为空']);
        }
        $common = new Common();
        if (!$common->isValidClientIp($ip)) {
            return json(['code' => 1, 'msg' => 'IP不合法']);
        }

        $sidFilter = null;
        if (isset($login['level']) && $login['level'] === 'service') {
            $sid = (int) $login['service_id'];
            $allowed = Db::name('ip_blacklist')->where('business_id', $bid)->where('ip', $ip)->where('status', 1)->where('service_id', $sid)->find();
            if (!$allowed) {
                $hit = Db::name('qr_scan_logs')->where('business_id', $bid)->where('ip', $ip)->where('service_id', $sid)->find();
                if (!$hit) {
                    return json(['code' => 1, 'msg' => '无权查看该IP']);
                }
            }
            $sidFilter = $sid;
        }

        $logs = Db::name('qr_scan_logs')->alias('l')
            ->join('service s', 'l.service_id = s.service_id', 'LEFT')
            ->where('l.business_id', $bid)
            ->where('l.ip', $ip);
        if ($sidFilter !== null) {
            $logs->where('l.service_id', $sidFilter);
        }
        $logs = $logs->field('l.*,s.nick_name as service_nick')
            ->order('l.scan_time desc')
            ->limit(20)
            ->select();

        $vidQ = Db::name('qr_scan_logs')->where('business_id', $bid)->where('ip', $ip);
        if ($sidFilter !== null) {
            $vidQ->where('service_id', $sidFilter);
        }
        $rawVids = $vidQ->column('visiter_id');
        $vids = array_values(array_unique(array_filter($rawVids)));
        $visiters = [];
        if (!empty($vids)) {
            $visiters = Db::name('visiter')
                ->where('business_id', $bid)
                ->where('ip', $ip)
                ->where('visiter_id', 'in', $vids)
                ->order('vid desc')
                ->limit(20)
                ->select();
        }

        $chQ = Db::name('qr_scan_logs')->where('business_id', $bid)->where('ip', $ip);
        if ($sidFilter !== null) {
            $chQ->where('service_id', $sidFilter);
        }
        $channelIds = $chQ->group('channel_id')->column('channel_id');
        $channels = [];
        if (!empty($channelIds)) {
            $channels = Db::name('qr_channels')->where('business_id', $bid)->where('id', 'in', $channelIds)->field('id,remark,url,status')->select();
        }

        $svcQ = Db::name('qr_scan_logs')->where('business_id', $bid)->where('ip', $ip);
        if ($sidFilter !== null) {
            $svcQ->where('service_id', $sidFilter);
        }
        $serviceIds = $svcQ->group('service_id')->column('service_id');
        $services = [];
        if (!empty($serviceIds)) {
            $services = Db::name('service')->where('business_id', $bid)->where('service_id', 'in', $serviceIds)->field('service_id,user_name,nick_name')->select();
        }

        $historyBase = rtrim(BASEROOT, '/');
        $chatLinks = [];
        foreach ($visiters as $v) {
            if (!empty($v['visiter_id'])) {
                $chatLinks[] = [
                    'visiter_id' => $v['visiter_id'],
                    'history_url' => $historyBase . '/admin/index/history?visiter_id=' . rawurlencode($v['visiter_id']),
                ];
            }
        }

        $logOut = [];
        foreach ($logs as $l) {
            $logOut[] = [
                'id'          => (int) $l['id'],
                'channel_id'  => (int) $l['channel_id'],
                'visiter_id'  => $l['visiter_id'],
                'scan_time'   => $l['scan_time'] ? date('Y-m-d H:i:s', (int) $l['scan_time']) : '',
                'ip_region'   => $l['ip_region'],
                'device_type' => $l['device_type'],
                'service_nick'=> isset($l['service_nick']) ? $l['service_nick'] : '',
            ];
        }

        return json([
            'code' => 0,
            'msg'  => 'success',
            'data' => [
                'ip'            => $ip,
                'recent_scans'  => $logOut,
                'visitors'      => $visiters,
                'channels'      => $channels,
                'services'      => $services,
                'history_links' => $chatLinks,
            ],
        ]);
    }

    /**
     * @param array  $r   含 c.* 及 join 字段
     * @param int    $bid
     * @return array
     */
    private function emptyTableResponse($msg = '')
    {
        return json(['code' => 0, 'msg' => $msg, 'count' => 0, 'data' => []]);
    }

    private function formatChannelRow(array $r, $bid)
    {
        $tid = (int) $r['template_id'];
        $tplImg = isset($r['template_image']) ? $r['template_image'] : '';
        $tplName = isset($r['template_name']) ? $r['template_name'] : '';
        if ($tid <= 0) {
            $tplName = $tplName ?: '默认模板';
        }

        return [
            'channel_id'     => (int) $r['id'],
            'business_id'    => (int) $r['business_id'],
            'service_id'     => (int) $r['service_id'],
            'service_user'   => isset($r['service_user_name']) ? $r['service_user_name'] : '',
            'service_nick'   => isset($r['service_nick_name']) ? $r['service_nick_name'] : '',
            'template_id'    => $tid,
            'template_name'  => $tplName,
            'remark'         => $r['remark'],
            'qr_url'         => $r['url'],
            'qr_image'       => $tplImg,
            'scan_count'     => (int) $r['scan_count'],
            'status'         => (int) $r['status'],
            'created_at'     => !empty($r['create_time']) ? date('Y-m-d H:i:s', (int) $r['create_time']) : '',
            'updated_at'     => !empty($r['update_time']) ? date('Y-m-d H:i:s', (int) $r['update_time']) : '',
            'last_scan_time' => !empty($r['last_scan_time']) ? date('Y-m-d H:i:s', (int) $r['last_scan_time']) : '',
        ];
    }

    private function makeToken()
    {
        do {
            $token = md5(uniqid('', true) . mt_rand(100000, 999999));
            $exists = Db::name('qr_channels')->where('channel_token', $token)->find();
        } while ($exists);

        return $token;
    }
}
