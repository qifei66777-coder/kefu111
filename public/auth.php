<?php
/**
 * Pusher 私有频道认证端点
 * authEndpoint: '/auth.php'
 * 只有订阅 private- / presence- 前缀频道时 pusher-js 才会调用
 * 当前系统仅使用公开频道（cu*、se*、all*、kefu*），此文件通常不会被实际调用
 */

$pusherConfig = __DIR__ . '/../ymwl_pusher/config.php';
if (is_file($pusherConfig)) {
    require_once $pusherConfig;
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Config not found']);
    exit;
}

$socket_id    = isset($_POST['socket_id'])    ? $_POST['socket_id']    : '';
$channel_name = isset($_POST['channel_name']) ? $_POST['channel_name'] : '';

if (empty($socket_id) || empty($channel_name)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing socket_id or channel_name']);
    exit;
}

// 生成认证签名
$str_to_sign = $socket_id . ':' . $channel_name;
$signature   = hash_hmac('sha256', $str_to_sign, $app_secret, false);
$auth        = $app_key . ':' . $signature;

header('Content-Type: application/json');
echo json_encode(['auth' => $auth]);
