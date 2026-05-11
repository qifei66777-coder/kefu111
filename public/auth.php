<?php
/**
 * Pusher 私有频道认证端点
 * authEndpoint: '/auth.php'
 * 只有订阅 private- / presence- 前缀频道时 pusher-js 才会调用
 * 当前系统仅使用公开频道（cu*、se*、all*、kefu*），此文件通常不会被实际调用
 */

if (!defined('app_key'))    define('app_key',    'hlm8lka0blylk6ij');
if (!defined('app_secret')) define('app_secret', '1k8d9pjk27bacw8he5p5ockvz84gj0vy');

$socket_id    = isset($_POST['socket_id'])    ? $_POST['socket_id']    : '';
$channel_name = isset($_POST['channel_name']) ? $_POST['channel_name'] : '';

if (empty($socket_id) || empty($channel_name)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing socket_id or channel_name']);
    exit;
}

// 基础 session 检查（访客无需登录即可订阅公开频道，此处仅处理私有频道兜底）
session_start();
$hasSession = !empty($_SESSION['Msg']) || !empty($_COOKIE['PHPSESSID']);

// 生成认证签名
$str_to_sign = $socket_id . ':' . $channel_name;
$signature   = hash_hmac('sha256', $str_to_sign, app_secret, false);
$auth        = app_key . ':' . $signature;

header('Content-Type: application/json');
echo json_encode(['auth' => $auth]);
