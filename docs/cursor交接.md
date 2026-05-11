# 客服系统二开交接文档 + Claude 执行计划

> **文档性质**：仅交接说明与执行计划；**不包含**数据库账号密码、Pusher 密钥等敏感信息（以服务器上 `config/database.php`、`ymwl_pusher/config.php`、`public/index.php` 为准）。  
> **代码事实来源**：本地工作区扫描（ThinkPHP 应用根目录为下文的 `$APP`），生成日期以仓库内运维文档为准（2026 年语境）。

---

## 一、项目基本信息

### 1. 当前项目技术栈

| 类别 | 说明 |
|------|------|
| 语言 / 运行环境 | PHP（Composer 要求 `>=5.4`；**生产强烈建议 PHP 7.2～7.4**，与 `docs/新服务器测试部署清单.md` 一致；勿盲目上 PHP 8） |
| Web 框架 | **ThinkPHP 5.0.24**（`composer.json` 中 `topthink/framework: 5.0.24`，`thinkphp/base.php` 中 `THINK_VERSION` 同为 5.0.24） |
| 依赖管理 | Composer（`composer.json` + `vendor/`） |
| 实时推送 | **Workerman** 进程：`ymwl_pusher/start.php`，前端 **pusher-js**（各模板引用 `__libs__/push/pusher.min.js`） |
| 前端（服务端模板） | ThinkPHP 模板 + Layui / jQuery / Layer / AmazeUI 等（见各 `application/*/view`） |
| 图表（总后台数据中心） | ECharts（`application/platform/view/dashboard/index.html` 等引用 `echarts.min.js`） |

### 2. 后端框架版本

- **ThinkPHP**：5.0.24（锁定在 `composer.json` / `thinkphp/base.php`）。

### 3. 前端模板位置（主要）

| 模块 | 路径 | 用途 |
|------|------|------|
| 访客 PC 对话 | `application/index/view/` | PC 端聊天页等 |
| 访客 H5 对话 | `application/mobile/view/` | 手机访客端（含 `index/index.html`、`admin/` 手机客服台等） |
| 商户后台 / 客服工作台 | `application/admin/view/` | 员工客服台、设置、二维码渠道、黑名单、富媒体快捷回复、数据中心等 |
| 总后台（平台） | `application/platform/view/` | 平台登录、布局、数据中心 SaaS 风格页等 |
| 弹层嵌入 | `application/layer/view/` | Layer 嵌入对话等 |
| 静态资源 | `public/assets/` | `admin-ui`、`admin-chat`、`h5-chat`、`login`、`mobile`、`css/rich-reply.css` 等 |

### 4. 主要入口地址（Think 默认 `url_html_suffix` 为 `html`，URL 一般为 `.html` 后缀）

> 以下均以站点根为 `BASEROOT`（由 `config/config.php` 内 `Request::instance()->root(true)` 定义），文档根须指向 **`$APP/public`**。

| 端 | 典型 URL 模式 | 说明 |
|----|----------------|------|
| 访客 H5 | `/mobile/index/home?...` → 重定向到 `/mobile/index?code=...` | `application/mobile/controller/Index.php` |
| 访客 PC | `/index/index/home?...` → `/index/index?code=...` | `application/index/controller/Index.php` |
| 二维码渠道进线 | `/index/index/kfchat?ch=渠道ID&token=令牌` | 校验后跳转标准对话 URL；见同控制器 `kfchat()` |
| 员工客服台（PC） | `/admin/index/chats.html`（工作台主界面） | 模板 `application/admin/view/index/chats.html` |
| 员工登录 | `/admin/login/index.html` | `application/admin/view/login/index.html`（已挂 `login-modern` 样式） |
| 总后台登录 | `/platform/passport/login.html` 等 | `application/platform/controller/Passport.php` |
| 总后台数据中心 | `/platform/dashboard/index.html` | `application/platform/controller/Dashboard.php` |
| Pusher HTTP 回调 | `/admin/event` | `ymwl_pusher/start.php` 中 `channel_hook` 指向 `{$domain}/admin/event`；控制器 `application/admin/controller/Event.php` |

### 5. 运行目录结构（`$APP` = 可部署的 ThinkPHP 项目根）

```
$APP/
├── application/          # 多模块业务代码（admin / index / mobile / platform / layer / weixin / mapp …）
├── config/               # database.php、config.php、version.php 等
├── public/               # Web 文档根（Nginx root 应指向此处）
│   ├── assets/           # 静态资源（h5-chat、admin-chat、admin-ui、login、mobile …）
│   └── install.php       # 当前仓库内为 403 禁用安装向导
├── runtime/              # 缓存 / 日志 / temp（需可写）
├── thinkphp/             # 框架核心（勿随意改）
├── vendor/               # Composer 依赖
├── ymwl_pusher/          # Workerman Pusher 服务（含 config.php、start.php、vendor）
├── install/              # data.sql 与增量 SQL（二维码、富媒体、欢迎语等）
├── deploy/               # fix_permissions.sh、start_pusher.sh、nginx_thinkphp.conf、public_index_template.php
└── docs/                 # 项目内已有安装/部署文档（与 Cursor 工作区根下 docs 不同，见下）
```

### 6. 当前本地项目路径

| 说明 | 路径 |
|------|------|
| **Cursor 工作区根** | `d:\kefu` |
| **实际可运行的 ThinkPHP 项目根（`$APP`）** | `d:\kefu\最新版来客客服带预知` |
| **本交接文档路径** | `d:\kefu\docs\CLAUDE_HANDOFF_客服系统二开.md`（工作区根 `docs`；与 `$APP/docs` 并存） |
| **Git 仓库** | 扫描显示 `.git` 位于 `$APP` 下；**在服务器上开发时请先 `cd` 到含 `application/` 与 `public/` 的那一层再执行 git** |

### 7. 服务器部署路径建议

- 官方运维文档示例：`/www/wwwroot/kf-test/`（见 `docs/新服务器测试部署清单.md`、`deploy/*.sh` 注释）。  
- **网站根目录**：`$APP/public`（宝塔「运行目录」选 `/public`）。  
- **`public/index.php`**：本地仓库中**未扫描到** `public/index.php`（可能被 `.gitignore` 忽略）；部署时必须存在，可从已安装环境复制或按 **`deploy/public_index_template.php`** 生成，且 **`define` 的 app_key / whost / wport / ahost / aport / YMWL_SALT 等必须与 `ymwl_pusher/config.php` 一致**（模板文件第 3 条注释已说明）。  
- 同目录需存在 **`public/auth.php`**（前端 `authEndpoint: '/auth.php'` 多处引用）；若缺失需从同源安装包补齐。

### 8. 数据库表前缀和关键表

- **表前缀**：`wolive_`（`config/database.php` 中 `prefix`；**勿把真实连接信息写入公开文档或提交到公开仓库**）。

**核心原表（`install/data.sql` 中定义，聊天与账号体系）**  
包括但不限于：`wolive_chats`（消息）、`wolive_visiter`（访客）、`wolive_service`（客服）、`wolive_queue`（排队/接待状态）、`wolive_business`（商户）、`wolive_sentence`（常用语，认领时 `first_word` 内容来源之一）、`wolive_reply`（传统快捷回复，模型 `app\common\model\Reply`）、`wolive_group`、`wolive_wechat_platform`、`wolive_login_log` 等。

**二开增量表 / 扩展（以 `install/*.sql` 为准）**  
- `wolive_qr_templates`、`wolive_qr_channels`、`wolive_qr_scan_logs` — `install/qr_channel_mvp.sql`  
- `wolive_ip_blacklist` — 同上；`install/ip_blacklist_extend.sql` 增加 `created_by_type`、`created_by`  
- `wolive_visiter` 增加 `device_type`、`ip_region`、`qr_channel_id`、`qr_remark` 等 — `qr_channel_mvp.sql`  
- `wolive_business` 增加 `scan_welcome_enabled`、`scan_welcome_message`；`wolive_qr_welcome_logs` — `install/scan_welcome.sql`  
- `wolive_rich_replies` — `install/rich_reply.sql`；分类/标签索引增量 — `install/rich_reply_phase2.sql`  
- `wolive_chats` 字符集升级脚本 — `install/upgrade_chats_utf8mb4.sql`（**执行前备份**）

---

## 二、当前系统架构说明

### 1. 客户 H5 端入口

- 对外链接经 `home()` 加密参数后进入 `mobile/index?code=...`（`application/mobile/controller/Index.php`）。  
- 对话页视图：`application/mobile/view/index/index.html`（引入 `chat-modern.css/js` + 原版 `mochat.js`）。  
- 二维码渠道：访客先访问 `index/index/kfchat`（PC 模块控制器），通过后跳转标准 `index`/`mobile` 对话流并写入访客扩展字段、扫码日志等（`application/index/controller/Index.php` 中 `kfchat()`）。

### 2. 员工客服台入口

- PC：登录后主要聊天界面为 `admin/index/chats` → 视图 `application/admin/view/index/chats.html`。  
- 检测手机访问后台首页时重定向：`application/admin/controller/Index.php` 中 `isMobile()` → `mobile/admin/index`（手机端客服工作台入口）。

### 3. 总后台入口

- 平台模块 `application/platform/`：登录 `Passport`，业务菜单与布局在 `application/platform/view/layout/default.html` 等。  
- 平台级数据中心：`platform/dashboard/index`（只读聚合统计，代码注释明确尽量不碰核心表结构）。

### 4. WebSocket / Pusher 聊天链路（概念）

1. 浏览器使用 **pusher-js** 连接 `whost`/`wport`（或 WSS），订阅频道如 `cu{channel}`、`kefu{service_id}`、`all{business_id}` 等（见各视图内联脚本与 `public/assets/js/connect.js`）。  
2. **`ymwl_pusher`**（Workerman）监听 WebSocket 端口与 **本地 HTTP API 端口**（`ymwl_pusher/config.php` 中 `$websocket_port`、`$api_port`），与 PHP 应用通过 `app\common\lib\SinglePusher` 等推送。  
3. **`/admin/event`**：`Event` 控制器作为 **channel_hook**，处理上下线、发消息等逻辑（文件体量大，属核心链路）。

### 5. 欢迎语 / `first_word` 链路

| 类型 | 机制 | 关键位置 |
|------|------|----------|
| **客服认领排队访客后的首句** | 认领成功时 `Set.php` 取 `wolive_sentence`（`state=using`），经 Pusher 向访客频道触发 **`first_word`** | `application/admin/controller/Set.php`（约 196–208 行）；H5/PC 模板中 `channels.bind('first_word', ...)` |
| **扫码渠道欢迎（不写 `wolive_chats`）** | `QrWelcome::tryCommitOnKfchat`：去重表 `wolive_qr_welcome_logs`，内容优先级：常用语 > 商户 `scan_welcome_message` > 默认文案；通过 **Session 闪存** 给 H5 首屏 | `application/common/lib/QrWelcome.php`；`application/mobile/view/index/index.html` 中变量 `SCAN_WELCOME` / `scan_welcome_json`（由控制器赋值） |

### 6. 快捷回复链路

| 类型 | 表 / 模型 | 管理端 |
|------|-----------|--------|
| **传统快捷回复** | `wolive_reply`（`app\common\model\Reply`） | `application/admin/controller/Manager.php`（`replyinfo` 等）、`Index::replylist`、`Popups::quickreply` 等 |
| **富媒体快捷回复** | `wolive_rich_replies` | `application/admin/controller/Richreply.php` + `application/common/lib/RichReplyRender.php` + 视图 `application/admin/view/richreply/index.html` |

### 7. 访客、客服、聊天消息落表（核心）

| 实体 | 主表 |
|------|------|
| 访客档案 / 在线状态 / 扩展标签 | `wolive_visiter`（含二开字段 `device_type`、`ip_region`、`qr_channel_id` 等） |
| 客服账号 | `wolive_service` |
| 聊天消息 | **`wolive_chats`** |
| 排队与认领 | `wolive_queue` |
| 扫码轨迹 | `wolive_qr_scan_logs` |

### 8. 核心文件（修改前必须评估影响）

以下文件**牵一发而动全身**，非需求必要勿大改：

- **`application/admin/controller/Event.php`**：Pusher 回调、消息入库、访客昵称头像增强逻辑等。  
- **`application/common/lib/SinglePusher.php`**：PHP 侧推送封装。  
- **`application/admin/controller/Set.php`**：认领、`first_word`、队列与对话列表相关接口。  
- **`public/assets/js/admin/chat.js`**（及客服台 `chats.html` 引用链）：对话区核心逻辑；与 `workbench-modern.js` 协同。  
- **`public/assets/js/moblie/mochat.js`**：H5 聊天核心（路径名为历史拼写 `moblie`）。  
- **`ymwl_pusher/`** 下 `start.php`、`config.php` 及 **Workerman** 相关 vendor。  
- **`thinkphp/`**、**`vendor/`** 框架与第三方库。  
- **`install/data.sql`**：仅作基线参考或空库安装，**勿当日常迁移随意改**。  
- **`application/extra/push/Pusher.php`**：与推送协议相关。

---

## 三、已完成或已存在的二开功能（基于代码扫描，未编造）

下列每项均可在 `$APP` 内检索到对应控制器 / 视图 / 静态资源或 `install/*.sql`。

---

### 1. 二维码渠道系统

| 项 | 内容 |
|----|------|
| **涉及文件** | `application/admin/controller/Qrchannel.php`（渠道 CRUD、令牌、URL 生成 `index/index/kfchat` 等）；`application/index/controller/Index.php`（`kfchat()` 校验、访客写入、IP 检测、设备/地区）；视图 `application/admin/view/qrchannel/channel_list.html` 等 |
| **涉及表** | `wolive_qr_templates`、`wolive_qr_channels`、`wolive_qr_scan_logs`；`wolive_visiter` 扩展字段 |
| **完成状态** | **已实现**：控制器与页面齐全；依赖 SQL 已导入目标库 |
| **可能问题** | 渠道禁用/模板下架时走 `kfchat_notice`；令牌错误有独立提示页；需保证 **`public/index.php` 与 pusher 域名** 与生成 URL 一致 |
| **测试入口** | 商户后台登录后侧边栏「二维码渠道」→ `admin/qrchannel/channelPage`；对外链接格式见 `Qrchannel.php` 内 `url('index/index/kfchat', ...)` |

---

### 2. 渠道模板

| 项 | 内容 |
|----|------|
| **涉及文件** | 同上 `Qrchannel.php`（`templates` / `saveTemplate` / `uploadTemplate` 等）；上传目录 `public/upload/qr_templates/` |
| **涉及表** | `wolive_qr_templates` |
| **完成状态** | **已实现** |
| **可能问题** | 上传目录权限、大小与扩展名校验（控制器内限制） |
| **测试入口** | 渠道管理页内模板管理接口与 UI |

---

### 3. 扫码日志

| 项 | 内容 |
|----|------|
| **涉及文件** | `Qrchannel.php` 内写 `qr_scan_logs` 逻辑；`application/admin/view/qrchannel/scan_logs.html` |
| **涉及表** | `wolive_qr_scan_logs` |
| **完成状态** | **已实现** |
| **可能问题** | 高并发下日志量增长；需索引维护（SQL 已含 `channel_time` 等索引） |
| **测试入口** | 后台扫码记录页（路由见 `Qrchannel` 页面方法） |

---

### 4. IP 黑名单

| 项 | 内容 |
|----|------|
| **涉及文件** | `Qrchannel.php`（列表/添加/解禁等）；`application/admin/view/qrchannel/blacklist.html`；访客进线拦截 `application/index/controller/Index.php`（`kfchat()` 内 `ip_blacklist` 查询） |
| **涉及表** | `wolive_ip_blacklist`；可选增量 `ip_blacklist_extend.sql` |
| **完成状态** | **已实现** |
| **可能问题** | 与 CDN / 代理 IP 获取一致性（依赖 `Common::getClientIp()` 等） |
| **测试入口** | `admin/qrchannel/blacklistPage`；扫码进线被封禁时 `kfchat_notice` 原因 `ip_blocked` |

---

### 5. 客服封禁 IP（与员工管理联动）

| 项 | 内容 |
|----|------|
| **涉及文件** | `application/admin/controller/Manager.php`（封禁员工最近登录 IP，写入 `ip_blacklist`） |
| **涉及表** | `wolive_ip_blacklist`、`wolive_login_log`（注释说明作操作痕迹） |
| **完成状态** | **已实现**（代码注释：复用 ip_blacklist 规则） |
| **可能问题** | 与「访客黑名单」共用同表，需区分 `created_by_type` / `service_id` 语义（若已执行 extend SQL） |
| **测试入口** | 员工管理相关页（`manager/detail`、`manager/info` 等与黑名单联动处） |

---

### 6. H5 访客标签：来源 / 设备 / 地区

| 项 | 内容 |
|----|------|
| **涉及文件** | `application/index/controller/Index.php`（`kfchat`：`detectDeviceCategory`、`Ip::find`、`phpUserAgent` 扩展 JSON）；`application/mobile/controller/Index.php` 同步逻辑需自行对照；H5 模板 `application/mobile/view/index/index.html` 与现代 CSS 展示 |
| **涉及表** | `wolive_visiter`（`device_type`、`ip_region`、`qr_channel_id`、`qr_remark`）；扫码日志中带 `user_agent`、`from_url` 等 |
| **完成状态** | **已实现**（进线时写入/更新逻辑在 `kfchat` 流程中） |
| **可能问题** | IP 库返回异常时已 try/catch；地区显示「未知」降级 |
| **测试入口** | 扫码或带参打开 H5 对话后，客服台右侧资料 / 数据中心设备地区分布 |

---

### 7. 数据中心 Dashboard（商户 + 平台）

| 项 | 内容 |
|----|------|
| **涉及文件** | **商户**：`application/admin/controller/Dashboard.php` + `application/admin/view/dashboard/index.html`；**平台**：`application/platform/controller/Dashboard.php` + `application/platform/view/dashboard/index.html` |
| **涉及表** | 只读聚合 `qr_scan_logs`、`qr_channels`、`chats`、`visiter`、`ip_blacklist`、`service` 等（平台侧含 `tableExists` 探测缺表场景） |
| **完成状态** | **已实现**（平台注释：不改 `wolive_business` / `wolive_chats` / `wolive_qr_*` 结构） |
| **可能问题** | 老库未执行增量 SQL 时部分图表为空；今日访客统计逻辑对 `service` 与 `super_manager` 分支不同（见 `admin/Dashboard.php` 注释） |
| **测试入口** | `/admin/dashboard/index.html`；`/platform/dashboard/index.html` |

---

### 8. 富媒体快捷回复

| 项 | 内容 |
|----|------|
| **涉及文件** | `application/admin/controller/Richreply.php`；`application/common/lib/RichReplyRender.php`；`application/common/model/RichReply.php`；视图 `application/admin/view/richreply/index.html`；样式 `public/assets/css/rich-reply.css`；客服台 `connect.js` / 模板中对 `wolive-rich-reply` 类名的拼接支持 |
| **涉及表** | `wolive_rich_replies` |
| **完成状态** | **已实现**（类型含 text/link/card/image/video/guide 等，见 `Richreply` 控制器常量） |
| **可能问题** | URL 消毒失败会拒绝保存；发送路径需与 Pusher 消息 HTML 白名单策略一致 |
| **测试入口** | 后台「富媒体快捷回复」菜单 → `admin/richreply/index`；客服台快捷回复区 |

---

### 9. 员工客服台三栏 UI

| 项 | 内容 |
|----|------|
| **涉及文件** | `application/admin/view/index/chats.html`（`wb-root`、`wb-pane-list` / `wb-pane-chat` / 右侧资料与快捷回复结构）；`public/assets/admin-chat/css/workbench-modern.css`；`public/assets/admin-chat/js/workbench-modern.js`；**仍加载** `__script__/admin/chat.js` |
| **涉及表** | 无独立表（数据仍来自原 `visiter`/`chats`/队列接口） |
| **完成状态** | **已实现壳层与样式**；后续需求见「阶段 3」 |
| **可能问题** | 必须与 **`chat.js` 事件与 DOM 约定** 兼容，避免覆盖绑定导致无法收发消息 |
| **测试入口** | `/admin/index/chats.html` |

---

### 10. H5 现代聊天界面

| 项 | 内容 |
|----|------|
| **涉及文件** | `public/assets/h5-chat/css/chat-modern.css`、`public/assets/h5-chat/js/chat-modern.js`；`application/mobile/view/index/index.html` 引用；静态预览 `public/assets/h5-chat/preview-chat-h5.html` |
| **涉及表** | 无 |
| **完成状态** | **已接入**；与 `mochat.js` 并存 |
| **可能问题** | 样式与旧 DOM 结构耦合；需真机测输入框、加号、滚动 |
| **测试入口** | 实际商户 H5 进线 URL；本地可打开 preview html（仅 UI 参考，非完整联调） |

---

### 11. 总后台现代化 UI

| 项 | 内容 |
|----|------|
| **涉及文件** | `application/platform/view/layout/default.html`；`public/assets/admin-ui/css/admin-modern.css`、`public/assets/admin-ui/js/admin-modern.js`；数据中心视图内联大段 SaaS 风格样式 |
| **涉及表** | 无直接绑定 |
| **完成状态** | **已实现**（平台布局 + 数据中心卡片/图表） |
| **可能问题** | 与旧平台页混排时样式隔离 |
| **测试入口** | 平台登录后各菜单；`/platform/dashboard/index.html` |

---

### 12. 手机端客服工作台

| 项 | 内容 |
|----|------|
| **涉及文件** | `application/mobile/view/admin/index.html`；`public/assets/mobile/css/mobile-workbench-modern.css`；`public/assets/mobile/js/mobile-workbench-modern.js`；配置 `MOBILE_WORKBENCH_CONFIG` |
| **涉及表** | 无独立表 |
| **完成状态** | **已实现基础**；与 PC 工作台并行 |
| **可能问题** | 多入口 `mobile/view/admin/chat.html` 等与旧版并存，改前确认实际菜单链到的模板 |
| **测试入口** | 手机 UA 打开后台首页跳转 `mobile/admin/index`；或直接访问对应路由 |

---

### 13. 其他已在代码中体现的改动（摘取）

| 功能 | 涉及文件 / 说明 |
|------|------------------|
| **扫码欢迎语（商户配置 + 去重）** | `install/scan_welcome.sql`；`QrWelcome.php`；`application/admin/view/qrchannel/welcome.html` |
| **访客默认昵称 / SVG 头像（不进库大图）** | `application/admin/controller/Event.php` 内 `buildVisitorNickname` / `buildVisitorAvatar` |
| **员工 / 商户管理界面增强** | `application/admin/view/manager/detail.html`、`info.html` 等 |
| **登录页统一现代皮肤** | `application/admin/view/login/index.html`、`application/platform/view/passport/login.html` + `public/assets/login/*` |
| **`public/install.php` 禁用** | 返回 403；正式环境依赖手工部署 + SQL（见 `$APP/docs`） |
| **入口模板与 VENDOR 说明** | `deploy/public_index_template.php` 注释：使用 **`VENDOR_PATH`**（`thinkphp/base.php` 定义），勿使用未定义的 `VENDOR` 常量 |
| **备份目录** | `$APP/backup/` 下存在历史 `.bak`（如 h5 UI 迭代备份），**勿当生产代码源覆盖** |

---

## 四、绝对不能乱动的边界

1. **不重写现有聊天系统**：在现有 `chat.js` / `mochat.js` / Pusher 订阅模型上增量改动，不做全新 IM 重写。  
2. **不改 WebSocket 主协议与主链路**：频道命名、`/admin/event` 职责、Workerman 启动方式保持可预期；改动需联调前后端与 Pusher。  
3. **不改 `wolive_chats` 主消息表结构（字段级）**：新业务用扩展表或 JSON 字段方案须先评估；**禁止随意 DROP/改类型导致线上消息损坏**。  
4. **不删除旧表旧字段**：只做增量 `ADD COLUMN` / 新表；删除需业务确认与全量备份。  
5. **不破坏现有登录**：`YMWL_SALT`、`Cookie`、`platform` Auth 链路与 captcha 勿随意改。  
6. **不破坏 Pusher**：`ymwl_pusher/config.php`、`public/index.php` 常量、`SinglePusher` 与 `Event` 参数必须交叉一致。  
7. **不破坏客服接待、认领、发消息、图片视频消息**：认领 → `first_word` / `cu_notice`、消息入库、`Event` 内上传逻辑等为高耦合区。  
8. **不直接覆盖生产文件**：改前 **cp 备份** 或专用分支；数据库先 mysqldump。  
9. **不直接 commit / push**：除非需求方明确要求；默认仅本地 diff。  
10. **每次改完必须输出**：`git status` 与 **`git diff --stat`**（若 multi 仓库注意 cwd）。

---

## 五、当前最需要 Claude 继续开发的方向（阶段计划）

### 阶段 1：先修复现有问题

- 后台 / 客服台 / H5 是否能正常打开；**缺 `public/index.php` / `auth.php` 时优先恢复**。  
- 登录、验证码、Cookie 域名是否一致。  
- 客服聊天、H5 发消息、图片视频。  
- WebSocket / Pusher：`php start.php status`、浏览器 Console 报错、HTTPS 时 WSS/证书。  
- 样式丢失：静态资源路径、`__lkversion__`、CDN/防盗链。  
- 页面 PHP 报错：`runtime/log/`、`nginx`/`php-fpm` 日志。  

### 阶段 2：移动端 H5 客服聊天界面完善

目标风格（用户描述）：手机顶栏（头像/昵称/在线）、来源/设备/地区标签、浅灰底、蓝白气泡、欢迎语卡片、多媒体、底部加号+输入+发送。  
**约束**：在 **`chat-modern.*` + `mochat.js`** 上迭代，避免破坏 Pusher 频道与消息 JSON 格式。

### 阶段 3：员工客服台三栏工作台完善

左会话 / 中聊天 / 右客户资料 + 快捷回复与富媒体；支持封禁 IP（已有表与接口基础上补 UI/交互）。  
**约束**：**保留 `chat.js` 核心**；`workbench-modern.js` 只做包装与布局。

### 阶段 4：总后台 SaaS 风格 UI

左侧深色导航、顶栏、数据卡片、趋势图、设备/地区分布、客服排行、二维码渠道排行、员工管理预览等。  
**约束**：以 `platform/view/layout/default.html` + `admin-modern.*` 为主扩展，避免内联样式无限膨胀（可逐步抽离 CSS）。

### 阶段 5：富媒体快捷回复增强

卡片样式、链接按钮、图文/视频卡片；**不动 `wolive_reply` 原表语义**；新能力优先 **`wolive_rich_replies` 或新表**。  

### 阶段 6：渠道与数据中心完善

与 `qr_scan_logs`、`qr_channels`、`visiter` 扩展字段、`chats` 聚合统计对齐；补「转化」等业务定义后再做指标（避免口径臆造）。

---

## 六、Claude 在服务器上执行开发的标准流程

1. `ssh` 登录后 **`cd $APP`**（含 `application`、`public` 的那一层）。  
2. **`git status`**（确认分支、未提交变更）。  
3. **备份**：`cp` 待改文件为同目录 `.bak.日期`；数据库重要变更前 **`mysqldump`**。  
4. **先看日志**：`runtime/log/` 当日日志、`tail -f` 复现请求。  
5. **只改本阶段相关文件**；避免顺带格式化全仓。  
6. **清 ThinkPHP 缓存**：删除 `runtime/cache/*`、`runtime/temp/*`（或按现网脚本）。  
7. **修权限**：`bash deploy/fix_permissions.sh`（必要时 `OWNER=www`）。  
8. **reload**：改 Nginx 配置后 `nginx -t && nginx -s reload`；仅当 PHP 配置变更时 reload `php-fpm`。  
9. **浏览器与移动端实测**：登录、会话、发图/视频、WSS。  
10. **输出**：变更文件列表、`git diff --stat`、`git status`、测试结果摘要。  
11. **不 push**（除非负责人明确说可以）。

---

## 七、服务器常用命令（ThinkPHP + 宝塔 / Linux）

> 路径按 `$APP` 替换；用户按环境替换 `www`。

| 目的 | 命令示例 |
|------|-----------|
| 查看目录 | `ls -la $APP` / `ls -la $APP/public` |
| 查看 Nginx 配置 | `cat /www/server/panel/vhost/nginx/你的站点.conf` 或宝塔文件管理器 |
| 清 ThinkPHP 缓存 | `rm -rf $APP/runtime/cache/* $APP/runtime/temp/*`（**先确认无自定义缓存依赖**） |
| 查看 runtime 日志 | `ls -lt $APP/runtime/log` / `tail -n 200 $APP/runtime/log/当天.log` |
| 修复 runtime 权限 | `OWNER=www DATA_GROUP=www sudo bash $APP/deploy/fix_permissions.sh` |
| reload nginx | `nginx -t && nginx -s reload`（或 `systemctl reload nginx`） |
| 查看 Pusher 进程 | `cd $APP/ymwl_pusher && php start.php status` |
| 启动 / 重启 Pusher | `bash $APP/deploy/start_pusher.sh` 或 `cd $APP/ymwl_pusher && php start.php restart -d` |
| curl 测站点 | `curl -I https://你的域名/`、`curl -I https://你的域名/admin/login/index.html` |
| git | `cd $APP && git status && git diff --stat` |

---

## 八、Claude 第一轮上服务器后应该先做什么

**请严格执行（先不改业务代码）：**

先不要改代码，先审计服务器当前客服系统状态：确认 **后台**（`/admin/login/index.html`）、**客服台**（`/admin/index/chats.html`）、**H5**（真实商户进线链接）、**WebSocket 连通**（浏览器 Console 与 `ymwl_pusher` status）、**Pusher 配置与 `public/index.php` 常量是否一致**、**`runtime/log` 是否存在 PHP fatal**、**现代 UI 静态文件是否 404**（`admin-ui`、`admin-chat`、`h5-chat`、`login`）。  
输出一份 **问题清单**（按阻塞级排序）+ **最小修复方案**（每项对应到具体文件/配置/SQL/权限）。

---

## 九、风险清单（易导致系统崩或隐性故障）

1. **ThinkPHP 模板语法错误**：例如误用不支持的标签/注释，导致整页编译失败。  
2. **`namespace` 前有空格或 BOM**：直接导致 PHP 解析致命错误。  
3. **`raw` 等过滤器与 TP5 版本不兼容**：在模板中滥用可能编译失败或 XSS 失控。  
4. **使用未定义的 `VENDOR` 常量**：正确为 **`VENDOR_PATH`**（见 `deploy/public_index_template.php` 与 `thinkphp/base.php`）。  
5. **查询构造器误用链式 API**（如历史问题「leftJoin 不支持」类）：以 TP 5.0 文档为准，复杂 SQL 可退回 `Db::query` 参数绑定。  
6. **Pusher 配置不一致**：`ymwl_pusher/config.php`、`public/index.php`、`SinglePusher` 使用的 host/port/key 任一不一致即全员掉线。  
7. **JS 覆盖旧聊天逻辑**：重绑事件、清空 DOM 导致 `chat.js` 无法插入消息。  
8. **`runtime` 缓存未清**：改路由/配置后仍读旧缓存。  
9. **文件权限错误**：`runtime`、`upload` 不可写导致接口 500。  
10. **移动端 CSS 依赖 `body` class 未挂上**：现代登录页已用 `login-modern` 等 class；其它页面若依赖同类机制需在模板中显式输出。

---

## 十、最终输出格式（给 Claude 的摘要区）

### 1. 当前项目现状一句话总结

本仓库为 **来客客服（LK_DIY6.5.9）+ ThinkPHP 5.0.24** 的深度二开：在保留原 **Pusher/Workerman + `wolive_chats` 消息体系** 的前提下，已落地 **二维码渠道、扫码日志、IP 黑名单、访客设备/地区标签、商户与平台数据中心、富媒体快捷回复、三端现代 UI 壳层** 等；**本地扫描未发现 `public/index.php`**，部署与接手时需按 `deploy/public_index_template.php` 与运维文档补齐并核对密钥与端口。

### 2. Claude 下一步建议

执行 **第八节审计清单** → 修复 **阶段 1** 阻塞项 → 再在 `chat-modern` / `workbench-modern` / `platform/dashboard` 上按 **阶段 2～6** 小步迭代，**每步附带 diff --stat 与手工测试结果**。

### 3. Claude 第一条指令（可复制）

```text
先不要改代码。cd 到 ThinkPHP 项目根（含 application/ 与 public/），执行 git status。检查 public/index.php、public/auth.php、ymwl_pusher/config.php 与 index.php 中 Pusher 常量是否一致；php ymwl_pusher/start.php status；tail runtime/log 最新错误；curl -I 后台与 H5 首页；列出 admin-ui、admin-chat、h5-chat、login 静态资源是否 404。输出问题清单与最小修复方案，不要 git push。
```

### 4. 需要需求方确认的问题

- **生产域名、WSS 证书路径** 与 `whost`/`wport` 的最终方案。  
- **`public/index.php` / `auth.php` 是否纳入私有仓库** 或仅服务器留存（当前本地缺文件时的惯例）。  
- **PHP 版本** 是否锁死 7.4（推荐）或允许 8.x（需全量回归）。  
- **数据中心「转化」等指标的业务口径**（代码中未统一定义前勿自行加 KPI）。  
- **多渠道商户** 下平台 `Dashboard` 的权限边界是否满足运营预期。

### 5. 不建议 Claude 碰的文件 / 目录

- `thinkphp/`、`vendor/`、`ymwl_pusher/vendor/`（除非升级框架或安全补丁且有完整回归）。  
- **`install/data.sql`**（基线结构，避免「顺手改字段」）。  
- **生产-only 密钥文件**（`config/database.php`、`ymwl_pusher/config.php`、线上 `public/index.php`）——仅改配置值时走运维流程，勿提交明文。  
- **`backup/`** 下历史备份（参考用，勿覆盖线上）。  
- 超大核 **`application/admin/controller/Event.php`**：非必要不改；必须改时先分段读、最小 diff、并安排双人 review。

---

**附：项目内已有文档（在 `$APP/docs/`，与本文档互补）**

- `来客客服系统安装教程.md`  
- `新服务器测试部署清单.md`  
- `打包上传说明.md`  

**代码根目录命名**：打包上传说明中写明本地目录名常为 `最新版来客客服带预知`，服务器可改名为 `kefu` 等，**以实际 `$APP` 为准**。
