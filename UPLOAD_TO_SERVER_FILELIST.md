# UPLOAD_TO_SERVER_FILELIST.md — 上传到服务器文件清单

> 本清单基于 2026-05-12 本地修复的全部变更。  
> 上传时请逐项核对，避免漏传导致功能回退。

---

## A. 需要覆盖上传的已有文件

以下文件在服务器上已存在，需要用本地修改后的版本覆盖：

### 核心修复文件（P0 相关，最重要）

```
application/mobile/view/admin/index.html
application/mobile/view/admin/talk.html
application/mobile/view/index/index.html
public/assets/mobile/js/mobile-workbench-modern.js
public/assets/mobile/css/mobile-workbench-modern.css
public/assets/h5-chat/js/chat-modern.js
public/assets/js/moblie/mochat.js
```

### 其他本次修改的文件

```
application/admin/controller/Event.php
application/admin/controller/Index.php
application/admin/controller/Qrchannel.php
application/admin/model/Distribute.php
application/admin/view/index/chats.html
application/admin/view/login/index.html
application/admin/view/login/sign.html
application/admin/view/public/header.html
application/admin/view/qrchannel/channel_list.html
application/common.php
application/index/controller/Index.php
application/platform/view/addons/index.html
application/platform/view/admin/loginlog.html
application/platform/view/app/edit.html
application/platform/view/app/index.html
application/platform/view/app/recycle.html
application/platform/view/app/subapp.html
application/platform/view/app/truncate.html
application/platform/view/index/index.html
application/platform/view/layout/default.html
application/platform/view/passport/login.html
application/platform/view/passport/register.html
application/platform/view/setting/index.html
application/platform/view/storage/index.html
application/platform/view/update/index.html
application/platform/view/user/edit.html
application/platform/view/user/index.html
application/platform/view/user/me.html
config/version.php
public/.htaccess
public/assets/admin-chat/js/workbench-modern.js
public/assets/js/admin/common.js
public/assets/js/admin/mchat.js
public/assets/js/admin/online.js
public/assets/js/index/inchat.js
public/assets/js/layer/layerchat.js
public/assets/js/platform/common.js
```

---

## B. 需要新增上传的文件

以下文件在服务器上原本不存在，必须新建上传：

```
public/assets/js/arale-qrcode.js          ← 二维码生成库（关键！缺失会导致二维码不渲染）
public/assets/css/kefu-coffee.css          ← 自定义主题 CSS
application/config.php                     ← 应用配置文件
index.php                                 ← 入口文件
```

### 需要搬移的文件

原 `install/` 目录已重命名为 `install_disabled_20260512/`，需要：
1. 在服务器上将 `install/` 重命名为 `install_disabled_20260512/`
2. 或者直接上传 `install_disabled_20260512/` 目录并删除旧的 `install/`

```
install_disabled_20260512/data.sql
install_disabled_20260512/ip_blacklist_extend.sql
install_disabled_20260512/qr_channel_mvp.sql
install_disabled_20260512/qr_channel_mvp_check.sql
install_disabled_20260512/rich_reply.sql
install_disabled_20260512/rich_reply_phase2.sql
install_disabled_20260512/scan_welcome.sql
install_disabled_20260512/uninstall.sql
install_disabled_20260512/upgrade_chats_utf8mb4.sql
```

---

## C. 建议一起上传到项目根目录的文档

```
CLAUDE.md                          ← Claude Code 最高规则
TEMPLATE_AND_ENTRY_MAP.md          ← 模板入口映射表
NEXT_CLAUDE_HANDOFF.md             ← 服务器 Claude 交接说明
URGENT_FRONTEND_FIX_REPORT.md      ← P0 修复详细报告
URGENT_FRONTEND_FINAL_CHECK.md     ← 风险封口最终检查报告
UPLOAD_TO_SERVER_FILELIST.md       ← 本文件
```

---

## D. 上传后服务器 Claude 必须优先核对的文件

以下 10 个文件是最关键的，如果漏传任何一个都会导致对应功能回退或失效：

| # | 文件 | 漏传后果 |
|---|------|---------|
| 1 | `public/assets/js/arale-qrcode.js` | 二维码弹窗打开但不渲染二维码图片 |
| 2 | `public/assets/js/moblie/mochat.js` | H5 图片上传失败 + 滚动不到底 + 分页 bug 回退 |
| 3 | `application/mobile/view/admin/talk.html` | 移动聊天页仍是旧版 UI |
| 4 | `public/assets/mobile/js/mobile-workbench-modern.js` | 黑名单 Tab 点击无响应 |
| 5 | `public/assets/mobile/css/mobile-workbench-modern.css` | 黑名单 overlay 无样式 + 二维码弹窗裁切 |
| 6 | `application/mobile/view/admin/index.html` | 黑名单点击事件回退 + QR 库引用路径错 |
| 7 | `public/assets/h5-chat/js/chat-modern.js` | scrollChatToBottom 未导出，滚动失效 |
| 8 | `application/mobile/view/index/index.html` | H5 访客端 accept 属性缺失 |
| 9 | `public/assets/css/kefu-coffee.css` | 自定义主题丢失 |
| 10 | `CLAUDE.md` | 服务器 Claude 没有维护规则参考 |

### 快速核对方法

服务器 Claude 收到代码后，可以用以下命令快速核对关键文件是否到位：

```bash
# 核对关键文件是否存在
ls -la public/assets/js/arale-qrcode.js
ls -la public/assets/js/moblie/mochat.js
ls -la application/mobile/view/admin/talk.html
ls -la public/assets/mobile/js/mobile-workbench-modern.js
ls -la public/assets/mobile/css/mobile-workbench-modern.css
ls -la CLAUDE.md

# 核对 mochat.js 中 data[0] bug 是否已修（应该搜不到）
grep "data\[0\]\['cid'\]" public/assets/js/moblie/mochat.js
# 如果返回结果，说明旧代码被覆盖回去了

# 核对 AraleQRCode 是否可用（文件大小应 > 10KB）
wc -c public/assets/js/arale-qrcode.js

# 核对 scrollChatToBottom 是否导出
grep "window.scrollChatToBottom" public/assets/h5-chat/js/chat-modern.js
```
