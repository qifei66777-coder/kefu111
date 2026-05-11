<?php

namespace app\admin\controller;

use app\common\lib\RichReplyRender;
use app\common\lib\SinglePusher;
use app\admin\model\TplService;
use app\admin\model\WechatPlatform;
use think\Db;
use think\Exception;

/**
 * 富媒体快捷回复管理 / 发送
 */
class Richreply extends Base
{
    protected static $types = ['text', 'link', 'card', 'image', 'video', 'guide'];

    protected function isManagerLevel(array $login)
    {
        return isset($login['level']) && in_array($login['level'], ['super_manager', 'manager'], true);
    }

    public function index()
    {
        $login = session('Msg');
        $isManager = $this->isManagerLevel($login);
        $services = [];
        if ($isManager) {
            $services = model('service')
                ->where('business_id', $login['business_id'])
                ->field('service_id,nick_name,user_name')
                ->select();
        }
        $this->assign('is_manager', $isManager ? 1 : 0);
        $this->assign('services', $services ?: []);

        $catQuery = Db::name('rich_replies')
            ->where('business_id', $login['business_id'])
            ->where('status', '<>', -1);
        if (!$isManager) {
            $catQuery->where('service_id', $login['service_id']);
        }
        $fltCats = $catQuery->whereNotNull('category')->where('category', '<>', '')->column('category');
        $this->assign('flt_categories', array_values(array_unique(array_filter($fltCats))));
        $this->assign('part', '富媒体快捷回复');

        return $this->fetch();
    }

    /**
     * layui table 列表
     */
    public function list()
    {
        $login = session('Msg');
        $page = max(1, intval($this->request->get('page', 1)));
        $limit = max(1, min(100, intval($this->request->get('limit', 20))));

        $query = Db::name('rich_replies')
            ->where('business_id', $login['business_id'])
            ->where('status', '<>', -1);

        if (!$this->isManagerLevel($login)) {
            $query->where('service_id', $login['service_id']);
        }

        $keyword = trim((string) $this->request->get('keyword', ''));
        if ($keyword !== '') {
            $query->where('title', 'like', '%' . addcslashes($keyword, '%_\\') . '%');
        }
        $fltType = trim((string) $this->request->get('reply_type', ''));
        if ($fltType !== '' && in_array($fltType, self::$types, true)) {
            $query->where('reply_type', $fltType);
        }
        $fltCat = trim((string) $this->request->get('category', ''));
        if ($fltCat !== '') {
            $query->where('category', $fltCat);
        }
        $listStatus = $this->request->get('list_status', '');
        if ($listStatus === '1' || $listStatus === 1) {
            $query->where('status', 1);
        } elseif ($listStatus === '0' || $listStatus === 0) {
            $query->where('status', 0);
        }

        $pager = $query->order('sort desc,id desc')->paginate($limit, false, ['page' => $page]);
        $count = $pager->total();
        $list  = $pager->items();

        $typeMap = [
            'text' => '文本', 'link' => '链接按钮', 'card' => '图文卡片',
            'image' => '图片', 'video' => '视频', 'guide' => '步骤引导',
        ];
        foreach ($list as &$row) {
            $row['reply_type_label'] = isset($typeMap[$row['reply_type']]) ? $typeMap[$row['reply_type']] : $row['reply_type'];
            if ((int) $row['service_id'] === 0) {
                $row['owner_label'] = '商户通用';
            } else {
                $s = model('service')->where('service_id', $row['service_id'])->field('nick_name,user_name')->find();
                $row['owner_label'] = $s ? ($s['nick_name'] ?: $s['user_name']) : ('客服#' . $row['service_id']);
            }
            $row['status_label'] = (int) $row['status'] === 1 ? '启用' : '禁用';
        }
        unset($row);

        return json(['code' => 0, 'msg' => '', 'count' => $count, 'data' => $list]);
    }

    public function create()
    {
        $login = session('Msg');
        $d = $this->defaultRow();
        if (!$this->isManagerLevel($login)) {
            $d['service_id'] = (int) $login['service_id'];
        }

        return json(['code' => 0, 'data' => $d]);
    }

    public function edit()
    {
        $login = session('Msg');
        $id = intval($this->request->get('id', 0));
        if ($id <= 0) {
            return json(['code' => 1, 'msg' => '参数错误']);
        }
        $row = Db::name('rich_replies')
            ->where('id', $id)
            ->where('business_id', $login['business_id'])
            ->where('status', '<>', -1)
            ->find();
        if (!$row) {
            return json(['code' => 1, 'msg' => '记录不存在']);
        }
        if (!$this->canManageRow($login, $row)) {
            return json(['code' => 1, 'msg' => '无权查看']);
        }

        return json(['code' => 0, 'data' => $row]);
    }

    public function save()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 1, 'msg' => '非法请求']);
        }
        $login = session('Msg');
        $post = $this->request->post();
        $row = $this->normalizeInput($login, $post, true);
        if (!is_array($row)) {
            return json(['code' => 1, 'msg' => $row]);
        }
        $now = time();
        $row['created_at'] = $now;
        $row['updated_at'] = $now;
        $id = Db::name('rich_replies')->insertGetId($row);
        $out = Db::name('rich_replies')->where('id', $id)->find();

        return json(['code' => 0, 'msg' => '保存成功', 'data' => $out]);
    }

    public function update()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 1, 'msg' => '非法请求']);
        }
        $login = session('Msg');
        $post = $this->request->post();
        $id = intval(isset($post['id']) ? $post['id'] : 0);
        if ($id <= 0) {
            return json(['code' => 1, 'msg' => '参数错误']);
        }
        $old = Db::name('rich_replies')
            ->where('id', $id)
            ->where('business_id', $login['business_id'])
            ->where('status', '<>', -1)
            ->find();
        if (!$old) {
            return json(['code' => 1, 'msg' => '记录不存在']);
        }
        if (!$this->canManageRow($login, $old)) {
            return json(['code' => 1, 'msg' => '无权修改']);
        }
        $row = $this->normalizeInput($login, $post, false);
        if (!is_array($row)) {
            return json(['code' => 1, 'msg' => $row]);
        }
        unset($row['created_at']);
        $row['updated_at'] = time();
        Db::name('rich_replies')->where('id', $id)->update($row);
        $out = Db::name('rich_replies')->where('id', $id)->find();

        return json(['code' => 0, 'msg' => '更新成功', 'data' => $out]);
    }

    public function delete()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 1, 'msg' => '非法请求']);
        }
        $login = session('Msg');
        $id = intval($this->request->post('id', 0));
        $row = Db::name('rich_replies')
            ->where('id', $id)
            ->where('business_id', $login['business_id'])
            ->where('status', '<>', -1)
            ->find();
        if (!$row) {
            return json(['code' => 1, 'msg' => '记录不存在']);
        }
        if (!$this->canManageRow($login, $row)) {
            return json(['code' => 1, 'msg' => '无权删除']);
        }
        Db::name('rich_replies')->where('id', $id)->update([
            'status' => -1,
            'updated_at' => time(),
        ]);

        return json(['code' => 0, 'msg' => '已删除']);
    }

    public function status()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 1, 'msg' => '非法请求']);
        }
        $login = session('Msg');
        $id = intval($this->request->post('id', 0));
        $st = intval($this->request->post('status', 1));
        $st = $st === 0 ? 0 : 1;
        $row = Db::name('rich_replies')
            ->where('id', $id)
            ->where('business_id', $login['business_id'])
            ->where('status', '<>', -1)
            ->find();
        if (!$row) {
            return json(['code' => 1, 'msg' => '记录不存在']);
        }
        if (!$this->canManageRow($login, $row)) {
            return json(['code' => 1, 'msg' => '无权操作']);
        }
        Db::name('rich_replies')->where('id', $id)->update(['status' => $st, 'updated_at' => time()]);

        return json(['code' => 0, 'msg' => 'ok']);
    }

    public function preview()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 1, 'msg' => '非法请求']);
        }
        $login = session('Msg');
        $id = intval($this->request->post('reply_id', 0));
        if ($id > 0) {
            $row = Db::name('rich_replies')
                ->where('id', $id)
                ->where('business_id', $login['business_id'])
                ->where('status', '<>', -1)
                ->find();
            if (!$row) {
                return json(['code' => 1, 'msg' => '记录不存在']);
            }
            if (!$this->canUseRow($login, $row)) {
                return json(['code' => 1, 'msg' => '无权预览']);
            }
        } else {
            $post = $this->request->post();
            $row = $this->normalizeInput($login, $post, true);
            if (!is_array($row)) {
                return json(['code' => 1, 'msg' => $row]);
            }
        }
        $html = RichReplyRender::renderRichReplyHtml($row);

        return json(['code' => 0, 'data' => ['html' => $html]]);
    }

    /**
     * 客服侧会话列表：启用且（商户通用或本人）；支持筛选；返回可用分类列表
     */
    public function chatlist()
    {
        $login = session('Msg');
        $post = $this->request->post();
        $keyword = isset($post['keyword']) ? trim((string) $post['keyword']) : '';
        $fltType = isset($post['reply_type']) ? trim((string) $post['reply_type']) : '';
        $fltCat = isset($post['category']) ? trim((string) $post['category']) : '';

        $visibility = function ($q) use ($login) {
            $q->where('business_id', $login['business_id'])
                ->where('status', 1)
                ->where(function ($sub) use ($login) {
                    $sub->where('service_id', 0)->whereOr('service_id', $login['service_id']);
                });
        };

        $catRows = Db::name('rich_replies')->where($visibility)
            ->whereNotNull('category')
            ->where('category', '<>', '')
            ->column('category');
        $categories = array_values(array_unique(array_filter($catRows)));

        $query = Db::name('rich_replies')->where($visibility);
        if ($keyword !== '') {
            $query->where('title', 'like', '%' . addcslashes($keyword, '%_\\') . '%');
        }
        if ($fltType !== '' && in_array($fltType, self::$types, true)) {
            $query->where('reply_type', $fltType);
        }
        if ($fltCat !== '') {
            $query->where('category', $fltCat);
        }

        $rows = $query->order('sort desc,id desc')->field('id,title,reply_type,category,tag')->select();

        $typeMap = [
            'text' => '文本', 'link' => '链接', 'card' => '卡片',
            'image' => '图片', 'video' => '视频', 'guide' => '步骤',
        ];
        foreach ($rows as &$r) {
            $r['reply_type_label'] = isset($typeMap[$r['reply_type']]) ? $typeMap[$r['reply_type']] : $r['reply_type'];
        }
        unset($r);

        return json([
            'code' => 0,
            'data' => [
                'items' => $rows,
                'categories' => $categories,
            ],
        ]);
    }

    public function send()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 1, 'msg' => '非法请求']);
        }
        $login = session('Msg');
        $replyId = intval($this->request->post('reply_id', 0));
        $visiterId = trim($this->request->post('visiter_id', ''));
        if ($replyId <= 0 || $visiterId === '') {
            return json(['code' => 1, 'msg' => '参数不完整']);
        }
        $row = Db::name('rich_replies')
            ->where('id', $replyId)
            ->where('business_id', $login['business_id'])
            ->find();
        if (!$row || (int) $row['status'] !== 1) {
            return json(['code' => 1, 'msg' => '回复不存在或已禁用']);
        }
        if (!$this->canUseRow($login, $row)) {
            return json(['code' => 1, 'msg' => '无权使用该回复']);
        }
        $content = RichReplyRender::renderRichReplyHtml($row);
        $unstr = $this->request->post('unstr', '');
        if ($unstr === null || $unstr === '') {
            $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            $rand = '';
            for ($i = 0; $i < 5; $i++) {
                $rand .= $chars[mt_rand(0, strlen($chars) - 1)];
            }
            $unstr = (string) (int) (microtime(true) * 1000) . $rand . $visiterId;
        }

        $result = $this->deliverServiceToVisiter($login, $visiterId, $content, (string) $unstr);
        if ($result['code'] !== 0) {
            return json($result);
        }

        return json([
            'code' => 0,
            'msg' => 'success',
            'data' => [
                'cid' => $result['cid'],
                'content' => $content,
                'unstr' => $unstr,
            ],
        ]);
    }

    protected function deliverServiceToVisiter(array $login, $visiterId, $content, $unstr)
    {
        $arr = [
            'visiter_id' => $visiterId,
            'content' => $content,
            'business_id' => $login['business_id'],
            'service_id' => $login['service_id'],
            'direction' => 'to_visiter',
            'timestamp' => time(),
            'unstr' => $unstr,
        ];
        $channel = bin2hex($arr['visiter_id'] . '/' . $arr['business_id']);
        $visiter = Db::name('visiter')
            ->where('visiter_id', $arr['visiter_id'])
            ->where('business_id', $login['business_id'])
            ->find();
        $queue = Db::name('queue')
            ->where('visiter_id', $arr['visiter_id'])
            ->where('business_id', $login['business_id'])
            ->find();
        $groupid = ($queue && isset($queue['groupid'])) ? $queue['groupid'] : 0;

        try {
            $wechat = WechatPlatform::get(['business_id' => $arr['business_id']]);
            $sendres = [];
            if ($visiter && $visiter['state'] == 'offline' && $wechat && trim($wechat['customer_tpl']) != '' && strlen($visiter['visiter_id']) > 16) {
                $sendres = TplService::send($arr['business_id'], $visiter['visiter_id'], url('index/index/wechat', ['business_id' => $arr['business_id'], 'groupid' => $groupid], true, true), $wechat['customer_tpl'], [
                    'first' => '你有一条新的信息!',
                    'keyword1' => $arr['content'],
                    'keyword2' => $login['nick_name'],
                    'remark' => $login['business']['business_name'] . '提示:客服有新的消息,快去看看吧~',
                ]);
            }
            if (!$wechat) {
                $wechat = [];
            } else {
                $wechat = $wechat->toArray();
            }
            hook('sendonesubhook', array_merge($wechat, ['nick_name' => $login['nick_name'], 'groupid' => $groupid, 'sendres' => $sendres, 'visiter' => $visiter, 'content' => $arr['content']]));
        } catch (\Throwable $t) {
        }

        $pusher = SinglePusher::getinstance();
        try {
            $cid = model('chats')->insertGetId($arr);
            $arr['avatar'] = $login['avatar'];
            $arr['cid'] = $cid;
            $pusher->trigger('cu' . $channel, 'my-event', ['message' => $arr]);
            $key = 'callback_' . session('Msg.business_id') . '_' . session('Msg.service_id');
            session($key, md5(microtime(true)));
            if (trim($login['business']['push_url']) != '') {
                $pusher->trigger('kefu' . $login['service_id'], 'callbackpusher', ['message' => $arr]);
            }
            Db::execute('UPDATE ' . config('database.prefix') . 'queue  SET `lastpost`=:lastpost  WHERE  `visiter_id`=:visiter_id   AND `business_id`=:business_id', ['lastpost' => time(), 'visiter_id' => $arr['visiter_id'], 'business_id' => $login['business_id']]);

            return ['code' => 0, 'msg' => 'success', 'cid' => $cid];
        } catch (Exception $e) {
            return ['code' => 3, 'msg' => $e->getMessage()];
        }
    }

    protected function canManageRow(array $login, array $row)
    {
        if ((int) $row['business_id'] !== (int) $login['business_id']) {
            return false;
        }
        if ($this->isManagerLevel($login)) {
            return true;
        }

        return (int) $row['service_id'] === (int) $login['service_id'] && (int) $row['service_id'] !== 0;
    }

    protected function canUseRow(array $login, array $row)
    {
        if ((int) $row['business_id'] !== (int) $login['business_id']) {
            return false;
        }
        if ((int) $row['service_id'] === 0) {
            return true;
        }

        return (int) $row['service_id'] === (int) $login['service_id'];
    }

    protected function defaultRow()
    {
        return [
            'id' => 0,
            'title' => '',
            'category' => '',
            'tag' => '',
            'reply_type' => 'text',
            'content' => '',
            'image_url' => '',
            'video_url' => '',
            'link_url' => '',
            'button_text' => '',
            'card_title' => '',
            'card_desc' => '',
            'payload_json' => '',
            'sort' => 0,
            'status' => 1,
            'service_id' => 0,
            'group_id' => 0,
        ];
    }

    /**
     * @param bool $isCreate
     * @return array|string
     */
    protected function normalizeInput(array $login, array $post, $isCreate)
    {
        $type = isset($post['reply_type']) ? $post['reply_type'] : 'text';
        if (!in_array($type, self::$types, true)) {
            return '无效的类型';
        }
        $title = mb_substr(trim(strip_tags(isset($post['title']) ? $post['title'] : '')), 0, 255);
        $category = mb_substr(trim(strip_tags(isset($post['category']) ? $post['category'] : '')), 0, 50);
        $tag = mb_substr(trim(strip_tags(isset($post['tag']) ? $post['tag'] : '')), 0, 100);
        $content = trim(strip_tags(isset($post['content']) ? $post['content'] : ''));
        $imageUrl = trim(strip_tags(isset($post['image_url']) ? $post['image_url'] : ''));
        $videoUrl = trim(strip_tags(isset($post['video_url']) ? $post['video_url'] : ''));
        $linkUrl = trim(strip_tags(isset($post['link_url']) ? $post['link_url'] : ''));
        $buttonText = mb_substr(trim(strip_tags(isset($post['button_text']) ? $post['button_text'] : '')), 0, 128);
        $cardTitle = mb_substr(trim(strip_tags(isset($post['card_title']) ? $post['card_title'] : '')), 0, 255);
        $cardDesc = trim(strip_tags(isset($post['card_desc']) ? $post['card_desc'] : ''));
        $payloadJson = isset($post['payload_json']) ? trim($post['payload_json']) : '';
        $sort = intval(isset($post['sort']) ? $post['sort'] : 0);
        $status = intval(isset($post['status']) ? $post['status'] : 1);
        $status = $status === 0 ? 0 : 1;
        $groupId = intval(isset($post['group_id']) ? $post['group_id'] : 0);

        $serviceId = 0;
        if ($this->isManagerLevel($login)) {
            $serviceId = intval(isset($post['service_id']) ? $post['service_id'] : 0);
            if ($serviceId < 0) {
                $serviceId = 0;
            }
        } else {
            $serviceId = (int) $login['service_id'];
        }

        if ($title === '') {
            if ($type === 'guide') {
                // 可选
            } elseif ($type === 'text' && $content !== '') {
                // 仅正文也可
            } else {
                return '请填写标题';
            }
        }

        if ($type === 'link') {
            if (RichReplyRender::sanitizeHttpUrl($linkUrl) === '') {
                return '请填写有效的 http(s) 链接';
            }
        }
        if ($type === 'card') {
            if ($cardTitle === '' && RichReplyRender::sanitizeMediaUrl($imageUrl) === '') {
                return '卡片请至少填写标题或图片地址';
            }
            if ($linkUrl !== '' && RichReplyRender::sanitizeHttpUrl($linkUrl) === '') {
                return '按钮链接不是有效的 http(s) 地址';
            }
        }
        if ($type === 'image') {
            if (RichReplyRender::sanitizeMediaUrl($imageUrl) === '') {
                return '请填写有效的图片 http(s) 地址';
            }
        }
        if ($type === 'video') {
            if (RichReplyRender::sanitizeMediaUrl($videoUrl) === '') {
                return '请填写有效的视频 http(s) 地址';
            }
        }
        if ($type === 'guide' && $payloadJson === '' && $content === '') {
            return '请填写步骤内容或 JSON';
        }

        return [
            'business_id' => $login['business_id'],
            'service_id' => $serviceId,
            'group_id' => $groupId,
            'title' => $title,
            'category' => $category,
            'tag' => $tag,
            'reply_type' => $type,
            'content' => $content,
            'image_url' => $imageUrl,
            'video_url' => $videoUrl,
            'link_url' => $linkUrl,
            'button_text' => $buttonText,
            'card_title' => $cardTitle,
            'card_desc' => $cardDesc,
            'payload_json' => $payloadJson,
            'sort' => $sort,
            'status' => $status,
        ];
    }
}
