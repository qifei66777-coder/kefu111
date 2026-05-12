<?php
/**
 * Created by PhpStorm.
 * User: Andy
 * Date: 2020/2/14
 * Time: 15:33
 */
namespace app\platform\controller;

use think\Db;

class Admin extends Base
{
    protected $noNeedLogin = [];

    /**
     * 登陆日志
     *
     * @return string
     */
    public function loginlog()
    {
        $list=Db::name('login_log')
            ->where(['uid'=>$this->admin['id'],'source'=>1])
            ->paginate();
        $this->assign('list', $list);
        $this->assign('title', "客服登录日志列表");
        $this->assign('part', "登录日志");
        $threemonthbf=time()-7879680;
        Db::name('login_log')
            ->where("`createtime`<{$threemonthbf}")->delete();
        return $this->fetch();
    }

    public function clearLoginLog()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 1, 'msg' => '请求方式错误']);
        }
        $count = Db::name('login_log')
            ->where(['uid' => $this->admin['id'], 'source' => 1])
            ->delete();
        return json(['code' => 0, 'msg' => '已清除 ' . $count . ' 条登录日志']);
    }
}