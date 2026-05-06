<?php
namespace app\common\model;
use think\Model;
class Getinput extends Model
{
    protected $table = 'wolive_input'; // 将 "your_table_name" 替换为你的数据表名

    // 指定主键名称
    protected $pk = 'id';

    // 自动写入创建和更新时间戳字段
    // protected $autoWriteTimestamp = true;

    // 在这里定义你的数据表字段
    protected $schema = [
        'user' => 'string',
        'message' => 'string',

        // ...
    ];
}