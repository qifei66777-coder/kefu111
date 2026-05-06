<?php
// +---------------------------------------------------------------------- 
// | 来客客服系统 ThinkPHP 5 入口模板
// +---------------------------------------------------------------------- 
// 部署说明：
// 1. 如果线上缺少 public/index.php，可复制本文件为 public/index.php。
// 2. 修改下面的域名、端口、app_key、app_secret、app_id 等配置。
// 3. 本文件中的 Pusher 常量必须与 ymwl_pusher/config.php 保持一致。
// 4. HTTPS/WSS 环境请同步调整 whost、wport 和 ymwl_pusher/start.php 的证书配置。

// 定义应用目录
define('APP_PATH', __DIR__ . '/../application/');
// Composer 依赖路径由 thinkphp/base.php 中的 VENDOR_PATH 提供，勿使用未定义的 VENDOR 常量。

// 定义配置文件目录
define('CONF_PATH', __DIR__ . '/../config/');

// 定义运行时目录
define('RUNTIME_PATH', __DIR__ . '/../runtime/');

// 读取系统版本
$lkversion = include CONF_PATH . 'version.php';
define('LK_VERSION', isset($lkversion['LK_VERSION']) ? $lkversion['LK_VERSION'] : '1.0.0');

// Pusher 通讯配置：部署时请与 ymwl_pusher/config.php 保持一致
define('app_key', '请替换为ymwl_pusher_config中的app_key');
define('app_secret', '请替换为ymwl_pusher_config中的app_secret');
define('app_id', 232);

// WebSocket 地址与端口。示例：ws://example.com / 9090，HTTPS 可按环境改为 wss。
define('whost', 'ws://your-domain.com');
define('wport', 9090);

// 后端 API 地址与端口。示例：http://example.com / 2080。
define('ahost', 'http://your-domain.com');
define('aport', 2080);

// 安装/推送注册 token，与系统配置保持一致
define('registToken', '请替换为安装时生成的registToken');

// 系统加密盐。会影响员工 service_token、访客参数等解密，请勿随意变更。
define('YMWL_SALT', '请替换为安装时生成的YMWL_SALT');

// 当前站点访问域名，通常与 ahost 保持一致
define('domain', 'http://your-domain.com');

// 自定义入口目录
define('PUBLIC_PATH', __DIR__);

// 扩展目录
define('EXTEND_PATH', __DIR__ . '/../extend/');

// 加载框架引导文件
require __DIR__ . '/../thinkphp/start.php';
