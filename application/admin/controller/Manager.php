<?php


namespace app\admin\controller;

use app\admin\model\Admins;
use app\admin\model\WechatService;
use app\platform\model\Business;
use app\platform\model\Service;
use app\Common;
use think\Cookie;
use think\Db;
use think\File;
use think\Paginator;
use app\common\lib\Storage;
use app\common\lib\storage\StorageException;

/**
 *
 * 管理控制器类
 */
class Manager extends Base
{
    private function assertManager()
    {
        $login = session('Msg');
        if (!isset($login['level']) || $login['level'] === 'service') {
            $this->redirect('admin/index/index');
        }
    }

   public function replyinfo(){

      $post=$this->request->post();

      $login =session('Msg');
     
      $res =model('reply')->where('service_id',$login['service_id'])->order('sort desc,id desc')->limit(10)->select();
      
      $data=['code'=>0,'data'=>$res];

      return $data;

   }


   public function delreply(){
    $post =$this->request->post();
    $id=$post['id'];
    $res=model('reply')->where('id',$id)->delete();

    if($res){
          $arr=['code'=>0,'msg'=>'删除成功!','data'=>''];

          return $arr;
     }
   }


    /**
     * 
     * [addword description]
     * @return [type] [description]
     */
    public function addword(){
       $post =$this->request->post();
       $post['service_id'] =session('Msg.service_id');
        $post['word'] = $this->request->post('word');
        if($post['tag']==''){
            $arr=['code'=>1,'msg'=>'标签不能为空','data'=>""];
            return $arr;
        }
        if($post['word']==''){
            $arr=['code'=>1,'msg'=>'快捷用语不能为空','data'=>""];
            return $arr;
        }
        if($post['id']>0){
//说明是编辑
            $res=model('reply')->update($post);
            if($res){
                $data=model('reply')->where('id',$post['id'])->find();
                $arr=['code'=>0,'msg'=>'更新成功','data'=>$data];
                return $arr;
            }else{
                $arr=['code'=>1,'msg'=>'更新失败','data'=>""];
                return $arr;
            }
        }else{
            unset($post['id']);
            $res =model('reply')->insertGetId($post);
            if($res){
                $data=model('reply')->where('id',$res)->find();
                $arr=['code'=>0,'msg'=>'添加成功','data'=>$data];
                return $arr;
            }else{
                $arr=['code'=>1,'msg'=>'添加失败','data'=>""];
                return $arr;
            }

        }

    
    }


    /**
     * 客服列表页面.
     *
     * @return mixed
     */
    public function info()
    {
        $login = session('Msg');

        if($login['level'] == 'service'){
             $this->redirect('admin/index/index');
        }

        $groupdata =model('group')->where('business_id',$login['business_id'])->select();

        $groupjson =json_encode($groupdata);

        $data = model('service')->where('business_id', $login['business_id'])->paginate(8);

        $count = Service::where('parent_id', $login['service_id'])->count();

        // 统计增强：仅对当前页的 service_id 聚合，避免全表扫描
        $ids = [];
        foreach ($data as $v0) {
            if (!empty($v0['service_id'])) {
                $ids[] = (int) $v0['service_id'];
            }
        }
        $ids = array_values(array_unique($ids));
        $today0 = strtotime(date('Y-m-d 00:00:00'));
        $today1 = $today0 + 86399;
        $bid = (int) $login['business_id'];

        $msgMap = [];
        $recvMap = [];
        $scanVisMap = [];
        $chCountMap = [];
        $banMap = [];
        $lastIpMap = [];
        $lastActiveMap = [];

        if (!empty($ids)) {
            $pfx = config('database.prefix');
            $in = implode(',', array_map('intval', $ids));

            $chatAgg = Db::query(
                "SELECT service_id,COUNT(*) AS msg_cnt,COUNT(DISTINCT visiter_id) AS recv_cnt,MAX(timestamp) AS last_ts\n"
                . "FROM `{$pfx}chats`\n"
                . "WHERE business_id=? AND timestamp BETWEEN ? AND ? AND service_id IN ({$in})\n"
                . "GROUP BY service_id",
                [$bid, $today0, $today1]
            );
            foreach ($chatAgg as $r) {
                $sid = (int) $r['service_id'];
                $msgMap[$sid] = (int) $r['msg_cnt'];
                $recvMap[$sid] = (int) $r['recv_cnt'];
                $lastActiveMap[$sid] = (int) $r['last_ts'];
            }

            $scanAgg = Db::query(
                "SELECT service_id,COUNT(DISTINCT visiter_id) AS c\n"
                . "FROM `{$pfx}qr_scan_logs`\n"
                . "WHERE business_id=? AND scan_time BETWEEN ? AND ? AND service_id IN ({$in})\n"
                . "GROUP BY service_id",
                [$bid, $today0, $today1]
            );
            foreach ($scanAgg as $r) {
                $scanVisMap[(int) $r['service_id']] = (int) $r['c'];
            }

            $chAgg = Db::query(
                "SELECT service_id,COUNT(*) AS c\n"
                . "FROM `{$pfx}qr_channels`\n"
                . "WHERE business_id=? AND status<>-1 AND service_id IN ({$in})\n"
                . "GROUP BY service_id",
                [$bid]
            );
            foreach ($chAgg as $r) {
                $chCountMap[(int) $r['service_id']] = (int) $r['c'];
            }

            $banAgg = Db::query(
                "SELECT service_id,COUNT(*) AS c\n"
                . "FROM `{$pfx}ip_blacklist`\n"
                . "WHERE business_id=? AND status=1 AND service_id IN ({$in})\n"
                . "GROUP BY service_id",
                [$bid]
            );
            foreach ($banAgg as $r) {
                $banMap[(int) $r['service_id']] = (int) $r['c'];
            }

            $logAgg = Db::query(
                "SELECT l.uid AS service_id, l.ip\n"
                . "FROM `{$pfx}login_log` l\n"
                . "INNER JOIN (\n"
                . "  SELECT uid, MAX(id) AS mid\n"
                . "  FROM `{$pfx}login_log`\n"
                . "  WHERE source=2 AND uid IN ({$in})\n"
                . "  GROUP BY uid\n"
                . ") t ON t.uid = l.uid AND t.mid = l.id",
                []
            );
            foreach ($logAgg as $r) {
                $lastIpMap[(int) $r['service_id']] = (string) $r['ip'];
            }
        }

        foreach ($data as $v) {
            $clo_data = json_encode($v);

            if($v['groupid']){
                $res =model('group')->where('id',$v['groupid'])->find();
                $v['groupname'] =$res['groupname'];
                $v['json'] = $clo_data;
            }else{
                $v['groupname'] ='通用客服';
                $v['json'] = $clo_data;
            }
            $v['personal'] = BASEROOT.'/index/index/home?visiter_id=&visiter_name=&avatar=&business_id='.$v['business_id'].'&groupid='.$v['groupid'].'&special='.$v['service_id'];
            $v['personalwechat'] = BASEROOT.'/index/index/wechat/business_id/'.$v['business_id'].'/groupid/'.$v['groupid'].'/special/'.$v['service_id'];

            $sid = (int) $v['service_id'];
            $v['today_receive_visitor'] = isset($recvMap[$sid]) ? $recvMap[$sid] : 0;
            $v['today_message_count'] = isset($msgMap[$sid]) ? $msgMap[$sid] : 0;
            $v['today_scan_visitor_count'] = isset($scanVisMap[$sid]) ? $scanVisMap[$sid] : 0;
            $v['qr_channel_count'] = isset($chCountMap[$sid]) ? $chCountMap[$sid] : 0;
            $v['ban_ip_count'] = isset($banMap[$sid]) ? $banMap[$sid] : 0;
            $v['last_login_ip'] = isset($lastIpMap[$sid]) ? $lastIpMap[$sid] : '-';
            $v['last_active_time'] = isset($lastActiveMap[$sid]) && $lastActiveMap[$sid] > 0 ? date('Y-m-d H:i:s', $lastActiveMap[$sid]) : '-';

            if (isset($v['state']) && $v['state'] === 'online') {
                $v['work_state'] = ((string) $v['groupid2'] === '100') ? '离开' : '在线';
            } else {
                $v['work_state'] = '离线';
            }
        }

        reset($data);
        $page = $data->render();
        $this->assign('business',session('Msg.business'));
        $this->assign('count',$count+1);
        $this->assign('page', $page);
        $this->assign('lister', $data);
        $this->assign('group',$groupjson);
        $this->assign('title', "客服列表");
        $this->assign('part','员工管理');
        return $this->fetch();
    }

    /**
     * 员工详情页（增强）
     * /admin/manager/detail?id={service_id}
     */
    public function detail()
    {
        $this->assertManager();
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $sid = (int) $this->request->param('id', 0);
        if ($sid <= 0) {
            $this->error('参数错误');
        }
        $svc = Db::name('service')->where('business_id', $bid)->where('service_id', $sid)->find();
        if (!$svc) {
            $this->error('员工不存在');
        }
        unset($svc['password']);
        $this->assign('svc', $svc);
        $this->assign('part', '员工管理');
        $this->assign('title', '员工详情');

        return $this->fetch('detail');
    }

    /**
     * 员工详情：今日数据卡片
     */
    public function detailStats()
    {
        $this->assertManager();
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $sid = (int) $this->request->param('id', 0);
        if ($sid <= 0) {
            return json(['code' => 1, 'msg' => '参数错误']);
        }
        $svc = Db::name('service')->where('business_id', $bid)->where('service_id', $sid)->find();
        if (!$svc) {
            return json(['code' => 1, 'msg' => '员工不存在']);
        }

        $today0 = strtotime(date('Y-m-d 00:00:00'));
        $today1 = $today0 + 86399;
        $pfx = config('database.prefix');

        $chat = Db::query(
            "SELECT COUNT(*) AS msg_cnt, COUNT(DISTINCT visiter_id) AS recv_cnt, MAX(timestamp) AS last_ts\n"
            . "FROM `{$pfx}chats` WHERE business_id=? AND service_id=? AND timestamp BETWEEN ? AND ?",
            [$bid, $sid, $today0, $today1]
        );
        $msgCnt = isset($chat[0]['msg_cnt']) ? (int) $chat[0]['msg_cnt'] : 0;
        $recvCnt = isset($chat[0]['recv_cnt']) ? (int) $chat[0]['recv_cnt'] : 0;
        $lastTs = isset($chat[0]['last_ts']) ? (int) $chat[0]['last_ts'] : 0;

        $scan = Db::query(
            "SELECT COUNT(*) AS scan_cnt, COUNT(DISTINCT visiter_id) AS scan_vis\n"
            . "FROM `{$pfx}qr_scan_logs` WHERE business_id=? AND service_id=? AND scan_time BETWEEN ? AND ?",
            [$bid, $sid, $today0, $today1]
        );
        $scanCnt = isset($scan[0]['scan_cnt']) ? (int) $scan[0]['scan_cnt'] : 0;
        $scanVis = isset($scan[0]['scan_vis']) ? (int) $scan[0]['scan_vis'] : 0;

        $chCnt = (int) Db::name('qr_channels')->where('business_id', $bid)->where('service_id', $sid)->where('status', '<>', -1)->count();
        $banCnt = (int) Db::name('ip_blacklist')->where('business_id', $bid)->where('service_id', $sid)->where('status', 1)->count();

        $last = Db::name('login_log')->where(['uid' => $sid, 'source' => 2])->order('id desc')->field('ip,createtime')->find();
        $lastIp = $last && isset($last['ip']) && trim((string) $last['ip']) !== '' ? (string) $last['ip'] : '-';

        return json([
            'code' => 0,
            'msg'  => 'success',
            'data' => [
                'service_id'              => $sid,
                'today_receive_visitor'   => $recvCnt,
                'today_message_count'     => $msgCnt,
                'today_scan_count'        => $scanCnt,
                'today_scan_visitor_count'=> $scanVis,
                'qr_channel_count'        => $chCnt,
                'ban_ip_count'            => $banCnt,
                'last_login_ip'           => $lastIp,
                'last_active_time'        => $lastTs > 0 ? date('Y-m-d H:i:s', $lastTs) : '-',
            ],
        ]);
    }

    /**
     * 员工详情：最近 7 天趋势
     */
    public function detailTrend()
    {
        $this->assertManager();
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $sid = (int) $this->request->param('id', 0);
        if ($sid <= 0) {
            return json(['code' => 1, 'msg' => '参数错误']);
        }
        $svc = Db::name('service')->where('business_id', $bid)->where('service_id', $sid)->find();
        if (!$svc) {
            return json(['code' => 1, 'msg' => '员工不存在']);
        }

        $pfx = config('database.prefix');
        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $days[] = date('Y-m-d', strtotime('-' . $i . ' day'));
        }
        $list = [];
        foreach ($days as $d) {
            $t0 = strtotime($d . ' 00:00:00');
            $t1 = $t0 + 86399;

            $chat = Db::query(
                "SELECT COUNT(*) AS msg_cnt, COUNT(DISTINCT visiter_id) AS recv_cnt\n"
                . "FROM `{$pfx}chats` WHERE business_id=? AND service_id=? AND timestamp BETWEEN ? AND ?",
                [$bid, $sid, $t0, $t1]
            );
            $msgCnt = isset($chat[0]['msg_cnt']) ? (int) $chat[0]['msg_cnt'] : 0;
            $recvCnt = isset($chat[0]['recv_cnt']) ? (int) $chat[0]['recv_cnt'] : 0;

            $scan = Db::query(
                "SELECT COUNT(*) AS scan_cnt\n"
                . "FROM `{$pfx}qr_scan_logs` WHERE business_id=? AND service_id=? AND scan_time BETWEEN ? AND ?",
                [$bid, $sid, $t0, $t1]
            );
            $scanCnt = isset($scan[0]['scan_cnt']) ? (int) $scan[0]['scan_cnt'] : 0;

            $list[] = [
                'date'          => $d,
                'receive_count' => $recvCnt,
                'message_count' => $msgCnt,
                'scan_count'    => $scanCnt,
            ];
        }

        return json(['code' => 0, 'msg' => 'success', 'data' => $list]);
    }

    /**
     * 封禁员工最近登录 IP（复用 ip_blacklist 写入规则，不写操作日志表；以 login_log 作为操作痕迹）
     */
    public function banRecentIp()
    {
        $this->assertManager();
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $targetSid = (int) $this->request->post('service_id', 0);
        $reason = trim((string) $this->request->post('reason', ''));

        if ($targetSid <= 0) {
            return json(['code' => 1, 'msg' => '参数错误']);
        }

        $last = Db::name('login_log')
            ->where(['uid' => $targetSid, 'source' => 2])
            ->order('id desc')
            ->field('ip')
            ->find();
        $ip = $last && isset($last['ip']) ? trim((string) $last['ip']) : '';
        if ($ip === '' || $ip === '0.0.0.0') {
            return json(['code' => 1, 'msg' => '该员工暂无有效最近登录IP']);
        }

        $common = new Common();
        if (!$common->isValidClientIp($ip)) {
            return json(['code' => 1, 'msg' => 'IP不合法']);
        }

        $exists = Db::name('ip_blacklist')->where('business_id', $bid)->where('ip', $ip)->find();
        if ($exists && (int) $exists['status'] === 1) {
            return json(['code' => 1, 'msg' => '已在黑名单']);
        }

        $now = time();
        $data = [
            'ip_region'       => '',
            'reason'          => htmlspecialchars($reason !== '' ? $reason : '员工管理封禁最近登录IP'),
            'service_id'      => $targetSid,
            'created_by_type' => $login['level'],
            'created_by'      => (int) $login['service_id'],
            'status'          => 1,
            'create_time'     => $now,
            'release_time'    => 0,
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

    /**
     * 快捷登录：生成临时链接（10分钟），在新窗口完成切换
     */
    public function quickLogin()
    {
        $this->assertManager();
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $targetSid = (int) $this->request->post('service_id', 0);
        if ($targetSid <= 0) {
            return json(['code' => 1, 'msg' => '参数错误']);
        }
        $svc = Db::name('service')->where('business_id', $bid)->where('service_id', $targetSid)->find();
        if (!$svc) {
            return json(['code' => 1, 'msg' => '员工不存在']);
        }
        $common = new Common();
        $token = $common->cpEncode(['op' => (int) $login['service_id'], 'sid' => $targetSid, 'bid' => $bid], YMWL_SALT, 600);
        $url = BASEROOT . '/admin/manager/quickLoginDo?token=' . $token;

        // 操作痕迹：写入 login_log（source=1 表示管理员侧动作）
        Db::name('login_log')->insert([
            'uid'        => (int) $login['service_id'],
            'name'       => 'quickLogin:' . $svc['user_name'],
            'ip'         => $this->request->ip(),
            'source'     => 1,
            'area'       => '',
            'login_side' => 1,
            'createtime' => time(),
        ]);

        return json(['code' => 0, 'msg' => 'success', 'data' => ['url' => $url]]);
    }

    /**
     * 快捷登录落地：校验 token 后切换为目标员工登录
     */
    public function quickLoginDo()
    {
        $this->assertManager();
        $login = session('Msg');
        $bid = (int) $login['business_id'];
        $token = trim((string) $this->request->param('token', ''));
        if ($token === '') {
            $this->error('token缺失');
        }
        $common = new Common();
        $payload = $common->cpDecode($token, YMWL_SALT);
        if (!$payload || !is_array($payload)) {
            $this->error('token无效或已过期');
        }
        if ((int) $payload['op'] !== (int) $login['service_id'] || (int) $payload['bid'] !== $bid) {
            $this->error('无权操作');
        }
        $targetSid = (int) $payload['sid'];
        $svc = Db::name('service')->where('business_id', $bid)->where('service_id', $targetSid)->find();
        if (!$svc) {
            $this->error('员工不存在');
        }
        unset($svc['password']);
        session('Msg', $svc);
        Cookie::set('service_token', $common->cpEncode($svc['user_name'], YMWL_SALT, 600), 600);

        Db::name('login_log')->insert([
            'uid'        => $targetSid,
            'name'       => $svc['user_name'],
            'ip'         => $this->request->ip(),
            'source'     => 2,
            'area'       => '',
            'login_side' => 1,
            'createtime' => time(),
        ]);

        $this->redirect('admin/index/index');
    }


     /**
     * 新增客服页面.
     *
     * @return mixed
     */
    public function add()
    {  

        $login =session('Msg');
        if($login['level'] == 'service'){
             $this->redirect('admin/index/index');
        }
        
        $class =model('group')->where("business_id",session('Msg.business_id'))->select();
        $this->assign('class',$class);
        return $this->fetch();
    }

    /**
     * 分组管理
     * [group description]
     * @return [type] [description]
     */
    public function group(){
        
        $login = session('Msg');

        if($login['level'] == 'service'){
             $this->redirect('admin/index/index');
        }
        $group =model('group')->where('business_id',$login['business_id'])->order('sort desc')->paginate(8);
        $page = $group->render();

        $this->assign('part','设置');
        $this->assign('title','客服分组设置');
        $this->assign('group',$group);
        $this->assign('page',$page);
        
        return $this->fetch();
    }

    /**
     * [saveVisiter description]
     * @return [type] [description]
     */
    public function saveVisiter(){
        $post =$this->request->post();

        $res =model('visiter')->where('visiter_id',$post['visiter_id'])->update(['name'=>$post['name'],'tel'=>$post['tel'],'comment'=>$post['comment']]);

        $arr=['code'=>0,'msg'=>'保存成功'];
        return $arr;
    }
    
  
   
    /**
     * 上传头像.
     *
     * @return mixed
     */
    public function uploadpic()
    {
        try {
            Storage::$variable = 'img_head';
            $url = Storage::put();
            $data = [
                "code" => 0,
                "msg" => "",
                "data" => $url['url']
            ];
        } catch (StorageException $exception) {
            $data = ['code'=> 1,'msg'=>$exception->getMessage(),'data'=>''];
        } catch (\Exception $e) {
            $data = ['code'=> 1,'msg'=>'请检查存储介质配置信息','data'=>$e];
        }
        return $data;


       /* $file = $this->request->file("img_head");
        if ($file) {
            $newpath = ROOT_PATH . "/public/upload/images/{session('Msg.business_id')}/";
            $info = $file->validate(['ext' => 'jpg,png,gif,jpeg'])->move($newpath, time());

            if ($info) {
                $imgname = $info->getFilename();

                $imgpath = $this->base_root."/upload/images/{session('Msg.business_id')}/" . $imgname;

                $data =['code'=>0,'msg'=>'','data'=>$imgpath];

                return $data;
            } else {

                $error =$info->getError();
                $data =['code'=>1,'msg'=>$error,'data'=>$imgpath];
                return $data;
            }
        }
        $data =['code'=>0,'msg'=>'','data'=>$this->base_root."/assets/images/admin/timg.jpg"];
        return $data;*/
    }


      /**
     * 更改提示音
     * [uploadvoice description]
     * @return [type] [description]
     */
    public function uploadvoice()
    {     
          $login =session('Msg');
          $file = $this->request->file("voice");
          if($file){
              $newpath = ROOT_PATH . "/public/upload/voice/";
              $info =$file->validate(['ext'=>'mp3,ogg,wav'])->move($newpath,$login['business_id'].time());
              if($info){
                $imgname = $info->getFilename();
                $imgpath = $this->base_root."/upload/voice/" . $imgname;
                $res =model('business')->where('id',$login['business_id'])->update(['voice_address'=>$imgpath]);
                
                if($res){
                     $data =[
                      'code'=>0,
                      'msg'=>'更改成功！',
                      'data'=> $imgpath
                    ];
                }else{
                    $data =[
                      'code'=>0,
                      'msg'=>'没有更改！'
                    ];
                }
                return $data;
              }else{
                $error =$file->getError();
                $data=[
                  'code'=>-1,
                  'msg'=>$error
                ];
                return $data;
              }
          }
    }


    /**
     * 客服注册验证.
     *
     * @return [type] [description]
     */
    public function registForService()
    {

        // 获取 注册信息 数据
        $post = $this->request->post();
        // 验证 表单信息
        $result = $this->validate($post, 'Services');
        if ($result !== true) {
            
            $data=['code'=>1,'msg'=>$result];

            return $data;
        }

        $login = session('Msg');

        if ($post['nick_name'] == "") {
            $post['nick_name'] = "客服" . $post['user_name'];
        }

        
        $num =model('service')->where('business_id',session('Msg.business_id'))->count();

        $max = Business::where('id',session('Msg.business_id'))->value('max_count');

        $maxnum = $max;

        if ($maxnum!= 0 && $num >= $maxnum) {

            $data =['code'=>2,'msg'=>'新增客服已经达到限制,不能再添加!'];
            return $data;
        }
        
        $service = model('service')
            ->where('user_name',$post['user_name'])
//            ->where('business_id',session('Msg.business_id'))
            ->find();
        
        if($service){
            $data =['code'=>3,'msg'=>'该客服名已经存在！'];
            return $data;
        }

        unset($post['password2']);
        // 子添加 数据
        $post['parent_id'] = session('Msg.service_id');

        // 添加字段
        $post["business_id"] = session('Msg.business_id');

        $pass = md5($post['user_name'] . "hjkj" . $post["password"]);
        $post['password'] = $pass;
        // 保存 数据
        $debug = model('service')->insert($post);

        if ($debug) {
            $data =['code'=>0,'msg'=>'注册成功'];
            return $data;
        } 
    }
     
     /**
      * 添加客服分类
      * [addclass description]
      * @return [type] [description]
      */
     public function addclass(){

        $post =$this->request->post();

        $post['business_id'] =session('Msg.business_id');
        $post['sort'] =$post['sort']+0;

        $data =model('group')->insert($post);

        $sdata =['code'=>0,'msg'=>'添加成功','data'=>$data];

        return $sdata;
    }
    /**
      * 编辑客服分类
      * [addclass description]
      * @return [type] [description]
      */
     public function editgroup(){

        $post =$this->request->post();
         $post['id']=$post['id']+0;
        if(!$post['id']){
            return ['code'=>1,'msg'=>'参数非法'];
        }
        $post['business_id'] =session('Msg.business_id');
        $post['sort'] =$post['sort']+0;

        $data =model('group')->update($post);

        $sdata =['code'=>0,'msg'=>'编辑成功','data'=>$data];

        return $sdata;
    }

    /**
     * 删除客服分类
     * [delclass description]
     * @return [type] [description]
     */
    public function delclass(){
        $post =$this->request->post();
        $id =$post['cid'];

        $res =model('group')->where('id',$id)->delete();
        
        $sdata =['code'=>0,'msg'=>'删除成功','data'=>$res];

        return $sdata;
    }

    /**
     * 删除.
     *
     * @return string
     */
    public function delete()
    {
        $post = $this->request->post();

        if ($post['id'] == 1) {
            return ['code'=>1,'msg'=>'管理员账号无法删除'];
        }

        $data = model("service")->where('service_id', $post['id'])->delete();

        $sdata =['code'=>0,'msg'=>'删除成功','data'=>$data];
        return $sdata;
        
    }

    /**
     * 删除留言.
     *
     * @return mixed
     */
    public function deleteForMsg()
    {
        $post = $this->request->post();
        
        $data = model('message')->where("mid","in",$post['chk_value'])->delete();
  
        $sdata =['code'=>0,'msg'=>'删除成功','data'=>$data];
        return $sdata;
        
    }

    /**
     * 个人资料更新.
     *
     * @return [type] [description]
     */
    public function update()
    {
        $post = $this->request->post();

        $file = $this->request->file('img_head');
        $login =session('Msg');

        $admin=model("service")->where(['nick_name'=>$post['nickname'],'business_id'=>$login['business_id']])->find();

        if($admin && $admin['service_id'] != $post['id']){

            $data =['code'=>1,'msg'=>'该昵称已经存在'];
            return $data;
        }

        $nick =$post['nickname'];
        if(mb_strlen($nick,'UTF8') > 20){
            $data =['code'=>1,'msg'=>'昵称不能大于20个字符！'];
            return $data;
        }

        if ($file == "") {
            $result = model('service')->where('service_id', $post['id'])->update(['nick_name' => $post['nickname'], 'phone' => $post['phone'], 'email' => $post['email'],'groupid'=>$post['groupid'],'open_id'=>$post['open_id']]);

        } else {

            $newpath = ROOT_PATH . "/public/upload/images/".session('Msg.business_id')."/";
            // 可以添加 验证 规则
            $info = $file->validate(['ext' => 'jpg,png,gif,jpeg'])->move($newpath, time());

            if ($info ==false) {
                $data =['code'=>1,'msg'=>'不支持上传该图片'];
                return $data;
            }


            $imgname = $info->getFilename();
            $post['img_head'] = $this->base_root."/upload/images/".session('Msg.business_id')."/" . $imgname;
            $result = model('service')->where('service_id', $post['id'])->update(['nick_name' => $post['nickname'], 'phone' => $post['phone'], 'email' => $post['email'],'avatar' => $post['img_head'],'groupid'=>$post['groupid'],'open_id'=>$post['open_id']]);

        }

        if ($result == 0) {
            $data =['code'=>1,'msg'=>'未被修改'];
            return $data;
        } else {
            if($post['id'] == $login['service_id']){
                $newdata =model('service')->where('service_id',$post['id'])->find();
                session('Msg',$newdata->getData());
                $business = Business::get(session('Msg.business_id'));
                session('Msg.business',$business->getData());
            }
            $data =['code'=>0,'msg'=>'修改成功'];
            return $data;
        }
    }
    /**
     * 修改密码
     * [modify description]
     * @return [type] [description]
     */
    public function modify(){
         $post =$this->request->post();
         $result = $this->validate($post, 'Check');  
         if($result !== true){
            return ['code'=>1,'msg'=>$result];
         }
         $user =model('service')->where("service_id",$post['id'])->find();
         $pass = md5($user['user_name']."hjkj" . $post['oldpass']);
         if($user['password'] == $pass){
            $newpass =md5($user['user_name']."hjkj" . $post['newpass']);
            $res =model("service")->where("service_id",$post['id'])->update(["password"=>$newpass]);
            if($res){

                $data =['code'=>0,'msg'=>'修改成功'];

                return $data;
            }
         }else{
            $data =['code'=>1,'msg'=>'旧密码不正确！'];

            return $data;
         }

    }

    public function changePwd()
    {
        $post =$this->request->post();
        $result = $this->validate($post, 'Check.change_service_pwd');
        if($result !== true){
            return ['code'=>1,'msg'=>$result];
        }
        $user =model('service')->where("service_id",$post['id'])->find();
        $pass = md5($user['user_name']."hjkj" . $post['newpass']);
        $res =model("service")->where("service_id",$post['id'])->update(["password"=>$pass]);
        if($res !== false){
            $newpass =md5($user['user_name']."hjkj" . $post['newpass']);

            $data =['code'=>0,'msg'=>'修改成功'];

            return $data;
        }else{
            $data =['code'=>1,'msg'=>'修改失败！'];

            return $data;
        }
    }
    /**
     * 查看历史记录页面.
     *
     * @return mixed
     */
    public function view()
    {

        $login = session('Msg');
        if($login['level'] == 'service'){
             $this->redirect('admin/index/index');
        }
        $services = model("service")->where('parent_id', $login['service_id'])->select();
        $this->assign("services", $services);
        $this->assign("title", "历史记录");
        $this->assign("part", "历史记录");

        return $this->fetch();
    }

    /**
     * 添加常用语.
     *
     * @return string
     */
    public function cmtalk()
    {

        $post = $this->request->post();
        $content = $post['content'];
        $new_content = str_replace("<", "&lt;", $content);
        $post['content'] = $new_content;
        $login = session('Msg');
        $post['service_id'] = $login['service_id'];
        
        $result = model('sentence')->insert($post);

        if ($result) {

            $data =['code'=>0,'msg'=>'添加成功'];
            return $data;
        }
    }
    
    /**
     * 
     * [addquestion description]
     * @return [type] [description]
     */
    public function addquestion()
    {
        $post=$this->request->post();
        $post['business_id']=session('Msg.business_id');
         $post['answer']=$this->request->post('answer');
         if (mb_strlen($post['keyword'],'UTF8') > 256) {
             $data =['code'=>1,'msg'=>'关键词不能大于8个字！'];
             return $data;
         }
         $sort = $this->request->post('sort/d',0);
         if (!is_int($sort)) {
             $data =['code'=>1,'msg'=>'排序字段必须是整数'];
             return $data;
         }
        $status = $this->request->post('status/d',0);
        if (!is_int($status)) {
            $data =['code'=>1,'msg'=>'是否显示字段非法'];
            return $data;
        }
        if(isset($post['qid']) && $post['qid']>0){
            $res =model('question')->where('qid',$post['qid'])->update(['question'=>$post['question'],'answer'=>$post['answer'],'keyword'=>$post['keyword'],'sort'=>$sort,'status'=>$status]);
                $arr=['code'=>0,'msg'=>'编辑成功'];
                return $arr;
        }else{
            $res =model('question')->insert($post);
            if($res){
                $arr=['code'=>0,'msg'=>'添加成功'];
                return $arr;
            }
        }
    }

    public function felete()
    {

       $post =$this->request->post();

       $id =$post['qid'];

       $result =model('question')->where('qid',$id)->delete();

       if($result){
        
       }
    }

    public function wechat()
    {
        $openId = $this->request->param('open_id');
        try{
            $user = WechatService::getUserinfo($openId);
            if(isset($user['errmsg']) && trim($user['errmsg'])!=''){
                exit($user['errmsg']);
            }else{
                $this->assign('user',$user);
            }

        } catch (Exception $exception){
           exit($exception->getMessage());
        }
        return $this->fetch();
    }
}