# CLAUDE.md — 来客客服系统维护最高规则

> 本文件是 Claude Code 管理此项目的最高规则。  
> 每次接到任务，必须先读本文件，再动手。

---

## 1. 项目身份

- **框架：** ThinkPHP 5 — PHP 模板渲染项目，不是 Vue/React 单页应用
- **项目：** 来客客服系统二次开发（基于 wolive 开源客服）
- **实时通信：** 聊天主链路依赖原有 Pusher/WebSocket，不可重写
- **当前阶段：** 已完成一轮移动端/H5 交付修复（2026-05-12），后续进入谨慎维护期
- **模板引擎：** ThinkPHP 模板变量 `__assets__`、`__script__`、`__libs__`、`__image__`、`__lkversion__`、`YMWL_ROOT_URL` 等
- **UI 组件库：** Layui（弹窗、表格、表单）、Swiper（移动端滑动）、jQuery

---

## 2. 最高原则

以下规则不可违反，违反即为回退性 bug：

1. **不重写聊天核心链路** — Pusher/WebSocket 连接、消息收发、会话分配均不可改
2. **不重写 Pusher/WebSocket** — `wolive_connect()` 是核心，只能修调用时机，不可替换
3. **不随意改数据库** — 不新增表、不改字段、不执行 DDL
4. **不为了美观推翻原模板结构** — 只做 CSS 覆盖和最小 JS 补丁，不重写 HTML 骨架
5. **不凭文件名猜真实页面入口** — 必须追控制器 → 模板 → 引用链
6. **不创建新 CSS/JS 却不接入真实模板** — 写了文件但模板没引用，等于没做
7. **不把"代码已改"表述成"功能已完成"** — 未经真实页面验证，只能说"代码已修，待验收"
8. **不在未确认文件同步完整前开始改代码** — 服务器接手必须先核对文件一致性

---

## 3. 四套页面体系 — 必须严格区分

本系统有 **四套完全独立的页面体系**，模板目录、CSS、JS 全部分开：

| # | 页面体系 | 服务对象 | 模板基目录 | 访问路径前缀 |
|---|---------|---------|-----------|------------|
| 1 | PC 总后台 / 管理后台 | 客服员工（PC 浏览器） | `application/admin/view/` | `/admin/` |
| 2 | 手机端平台管理后台 | 系统管理员（手机端） | `application/platform/view/` | `/platform/` |
| 3 | 移动端员工客服工作台 | 客服员工（手机端） | `application/mobile/view/admin/` | `/mobile/admin/` |
| 4 | H5 访客聊天端 | 客户/访客（手机端） | `application/mobile/view/index/` | 由 `/index/index/home` 重定向 |

**血泪教训：**
- "客服聊天页"这个说法必须先分清是 **员工客服聊天页**（`talk.html`）还是 **访客 H5 聊天页**（`index/index.html`）
- 这次最大的历史错误：只改了工作台首页 `index.html`，却没有改真正的聊天页 `talk.html`
- `application/mobile/view/admin/` 和 `application/mobile/view/index/` 是两个完全不同的页面体系，前者是员工端，后者是访客端

---

## 4. 真实模板入口地图

| 模块 | 真实模板文件 | 主要 CSS | 主要 JS | 本次关键结论 |
|------|------------|---------|--------|------------|
| 移动端员工客服工作台首页 | `application/mobile/view/admin/index.html` | `__assets__/mobile/css/mobile-workbench-modern.css` | `__assets__/mobile/js/mobile-workbench-modern.js` | 黑名单 Tab 使用 overlay 方案 |
| 移动端员工客服聊天页 | `application/mobile/view/admin/talk.html` | 内联注入现代 CSS + `__assets__/css/admin/mtalk.css` | `__script__/admin/mchat.js` | 真正的聊天页，不是 index.html |
| H5 访客聊天页 | `application/mobile/view/index/index.html` | `__assets__/h5-chat/css/chat-modern.css` | `__assets__/h5-chat/js/chat-modern.js` + `__script__/moblie/mochat.js` | 输入框 id=text_in，上传走 /admin/event/upload |
| 移动端工作台 JS | — | — | `public/assets/mobile/js/mobile-workbench-modern.js` | showTab() 已导出到 window |
| 移动端工作台 CSS | — | `public/assets/mobile/css/mobile-workbench-modern.css` | — | 含黑名单 overlay + QR 弹窗响应式 |
| H5 滚动控制 JS | — | — | `public/assets/h5-chat/js/chat-modern.js` | scrollChatToBottom 已导出到 window |
| H5 访客聊天主 JS | — | — | `public/assets/js/moblie/mochat.js` | put()/send()/getdata() 已修复 |
| 员工聊天主 JS | — | — | `public/assets/js/admin/mchat.js` | 使用 #text_all，不是 #text_in |
| 二维码生成库 | — | — | `public/assets/js/arale-qrcode.js` | 本轮新建，暴露 window.AraleQRCode |

---

## 5. P0 修复长期记忆 — 不可覆盖

以下修复在 2026-05-12 完成，后续维护绝不能回退：

### 5.1 黑名单 Tab（P0-1）
- **方案：** `#MobileBlacklistPanel` 使用 `.is-overlay-active` 类 + `position: fixed` 覆盖层显示
- **禁止：** 不能改回 Swiper `slideTo()`，因为隐藏的 slide 会导致索引错乱
- **关键选择器：** `#MobileBlacklistPanel`、`data-tab="blacklist"`、`window.showTab`
- **关键文件：** `mobile-workbench-modern.js`、`mobile-workbench-modern.css`、`admin/index.html`

### 5.2 二维码弹窗（P0-2）
- **方案：** CSS `@media (max-width: 768px)` 限制 `.layui-layer` 最大高度 90vh + overflow 滚动
- **依赖：** `public/assets/js/arale-qrcode.js` 必须存在，否则弹窗打开但不渲染二维码
- **模板引用：** `__assets__/js/arale-qrcode.js?v=__lkversion__`（不是硬编码 `/assets/`）
- **关键文件：** `mobile-workbench-modern.css`、`arale-qrcode.js`

### 5.3 移动员工聊天页 UI（P0-3）
- **真实入口：** `talk.html`，不是 `index.html`
- **方案：** 在 `talk.html` 的 `<head>` 中注入 `<style>` 块覆盖旧样式
- **禁止：** 不要删除注入的 CSS 块，不要把 index.html 的样式当成聊天页样式
- **关键文件：** `application/mobile/view/admin/talk.html`

### 5.4 H5 滚动到底部（P0-4）
- **方案：** `chat-modern.js` 定义 `scrollChatToBottom()` 并导出到 `window`；`mochat.js` 在 `send()`、`put()`、`getdata()` 中多档延时调用
- **禁止：** 不要删除 `window.scrollChatToBottom = scrollChatToBottom` 这行导出
- **关键文件：** `chat-modern.js`、`mochat.js`

### 5.5 H5 图片上传（P0-5）
- **上传接口：** `/admin/event/upload` — Event.php 直接继承 Controller（不继承 Base），无登录拦截，访客可用
- **后端返回：** `res.data` 是 HTML 字符串 `<img src="URL" />`，前端需 strip HTML 提取纯 URL
- **方案：** `put()` 函数用正则提取 URL → 构建干净 `<img>` 标签 → 添加 error/complete 回调
- **禁止：** 不要倒退回旧的 `isValidHttpUrl()` 判断写法；不要删除 `accept="image/*"` 属性
- **关键文件：** `mochat.js`、`index/index.html`、`talk.html`

### 5.6 mochat.js 分页 bug
- **修复：** `res.length` → `res.data.length`，`data[0]['cid']` → `res.data[0]['cid']`
- **影响：** 此修复使聊天历史分页加载正常工作
- **禁止：** 不可覆盖回 `res.length` 或 `data[0]`

---

## 6. 修改前的强制定位 SOP

每次 Claude 接到任务，**必须先执行以下步骤**，不允许跳过：

### Step 1: 确认用户访问的是哪一端
- PC 总后台？手机平台管理后台？移动员工客服工作台？H5 访客聊天端？

### Step 2: 确认真实 URL / 进入路径
- 用户实际从哪个 URL 进入？点了什么按钮跳转到目标页？

### Step 3: 确认控制器最终渲染哪个模板
- 在 `application/` 下找到对应控制器，确认 `$this->fetch()` 或 `return view()` 指向的模板文件

### Step 4: 确认模板实际引了哪些 CSS / JS
- 打开模板文件，搜索 `<link`、`<script`，列出所有实际引用的样式和脚本

### Step 5: 确认修改文件是不是当前真实引用文件
- 如果要改的 CSS/JS 不在模板的引用列表中，说明改错了文件

### Step 6: 改完后输出人工测试路径
- 必须写清楚：打开哪个 URL → 点哪个按钮 → 预期看到什么

---

## 7. 自检表述规范

所有报告和回复中，必须严格区分以下三种状态：

| 状态 | 含义 | 允许的表述 |
|------|------|-----------|
| 代码层已修 | 源码文件已修改，但未在真实环境运行 | "代码已修改，待服务器验证" |
| 线上真实环境已验证 | 在服务器上通过浏览器确认功能正常 | "已在线上验证通过" |
| 仍待人工页面验收 | 代码已部署但未人工确认 | "已部署，待人工验收" |

**禁止：** 把"代码层已修"写成"功能已完成"或"已修复"而不加限定语。

---

## 8. 项目关键路径速查

### 控制器权限体系
- `Base extends Controller` — 带 session 登录拦截，管理员接口继承此类
- `Event extends Controller` — 无登录拦截，跨域公用控制器，H5 访客可访问
- `Login extends Controller` — 无登录拦截，登录页面

### 文件上传
- 图片上传接口：`/admin/event/upload` → `Event::upload()`
- 文件上传接口：`/admin/event/uploadfile` → `Event::uploadfile()`
- 返回格式：`{code: 0, data: '<img src="URL" />'}`

### 实时通信
- Pusher 初始化：`wolive_connect()` 在各聊天 JS 中调用
- 配置来源：模板变量 `app_key`、`whost`、`wport`
- 不可重写，只能调整调用时机

### 模板变量
- `__assets__` → `public/assets/`
- `__script__` → `public/assets/js/`
- `__libs__` → `public/assets/libs/`
- `__image__` → `public/assets/image/`
- `__lkversion__` → 版本号（用于缓存刷新）
- `YMWL_ROOT_URL` → 网站根路径（JS 中使用）
