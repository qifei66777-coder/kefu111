<?php
namespace app\platform\controller;

use think\Controller;

class Upload extends Controller
{
    public function image()
    {
        $file = request()->file("file");
        if (!$file) {
            return json(['code' => 1, 'msg' => '未接收到上传文件']);
        }
        $newpath = ROOT_PATH . "/public/upload/images/";
        if (!is_dir($newpath)) {
            @mkdir($newpath, 0755, true);
        }
        $info = $file->validate(['size' => 5 * 1024 * 1024, 'ext' => 'jpg,png,gif,jpeg'])->move($newpath, time());
        if ($info) {
            $imgpath = BASEROOT . "/upload/images/" . $info->getFilename();
            return json(['code' => 0, 'msg' => '', 'data' => ['url' => $imgpath]]);
        }
        return json(['code' => 1, 'msg' => $file->getError()]);
    }

    public function file()
    {
        $file = request()->file("file");
        if (!$file) {
            return json(['code' => 1, 'msg' => '未接收到上传文件']);
        }
        $newpath = ROOT_PATH . "/public/";
        $info = $file->validate(['size' => 5 * 1024 * 1024, 'ext' => 'txt'])->move($newpath, '');
        if ($info) {
            $filename = BASEROOT . $info->getFilename();
            return json(['code' => 0, 'msg' => '', 'data' => ['url' => $filename]]);
        }
        return json(['code' => 1, 'msg' => $file->getError()]);
    }
}