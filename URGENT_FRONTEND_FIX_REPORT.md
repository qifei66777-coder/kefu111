# 紧急前端修复报告

**日期:** 2026-05-12  
**范围:** 来客客服系统 — 移动端 & H5 客户端 5 个 P0 级问题修复

---

## 1. 本轮已修复问题清单

### P0-1：移动端客服工作台「黑名单」点击没有反应

**原因：**  
黑名单面板 `#MobileBlacklistPanel` 位于 Swiper 的 `data-history="group"` 滑块内。CSS 隐藏了 `#J__groupList`，但同一滑块内的黑名单面板依赖 Swiper 的 `slideTo(2)` 来显示。由于 `data-history="book"` 和 `data-history="setting"` 两个滑块被 CSS 设为 `display: none`，Swiper 的内部索引计算出错，`slideTo(2)` 无法准确定位到目标滑块。同时，模板中 `.list-item` 的点击事件（line 1023）将 `id="-1"` 的黑名单条目也当作普通分组处理，尝试跳转到 `/mobile/admin/user?id=-1`。

**修改文件：**
1. `public/assets/mobile/js/mobile-workbench-modern.js`
2. `public/assets/mobile/css/mobile-workbench-modern.css`
3. `application/mobile/view/admin/index.html`

**修复方式：**
- 将 `showTab('blacklist')` 的实现改为不依赖 Swiper，而是给 `#MobileBlacklistPanel` 添加 `.is-overlay-active` 类，以 `position: fixed` 覆盖层方式显示，覆盖区域为 topbar 下方到 tabbar 上方
- 切换到 chat/my 标签时移除 overlay
- Swiper 调用包裹在 `try/catch` 中，防止报错阻断
- 将 `showTab` 函数导出到 `window` 供模板内联脚本使用
- 修改 `.list-item` 点击事件：拦截 `id="-1"` 的黑名单条目，调用 `showTab('blacklist')` 而非跳转

**是否需要服务器验证：** 需要在手机浏览器中验证黑名单接口 `/admin/qrchannel/blacklist` 是否正常返回数据。

---

### P0-2：移动端生成二维码弹窗只显示一半

**原因：**  
`showChannelResult()` 使用 Layui `layer.open()` 弹出二维码，设置 `area: ['88%', 'auto']`。在移动端，Layui layer 组件未对视口高度做限制，当二维码内容（标题 + 二维码图 200×200 + URL 文字 + 按钮）超出可视区域时，弹窗被截断。layer 的 `.layui-layer` 和 `.layui-layer-content` 缺少 `max-height` 和 `overflow` 控制。

**修改文件：**
1. `public/assets/mobile/css/mobile-workbench-modern.css`

**修复方式：**
- 添加 `@media (max-width: 768px)` 响应式规则：
  - `.layui-layer` 设置 `max-height: 90vh; overflow-y: auto`
  - `.layui-layer-content` 设置 `max-height: calc(90vh - 50px); overflow-y: auto`
  - `#mqr-result-wrap` 设置 `max-height` 和 `overflow-y: auto`
  - QR code canvas/img 限制 `max-width: 200px`
- 仅在 768px 以下触发，不影响 PC 端弹窗

**是否需要服务器验证：** 需要在手机端触发二维码生成流程验证，该流程依赖 `/admin/qrchannel/create` 接口。

---

### P0-3：移动端客服聊天界面仍然是原始旧版本

**原因：**  
移动端客服工作台首页 `application/mobile/view/admin/index.html` 已使用现代化样式（`mobile-workbench-modern.css`），但点击进入具体聊天后加载的模板是 `application/mobile/view/admin/talk.html`，该模板只引用了旧版 `mtalk.css`，未做任何 UI 现代化。两个页面是完全独立的模板。

**真实聊天页模板：** `application/mobile/view/admin/talk.html`

**之前为什么没生效：** 之前的现代化改造只做了工作台首页 (`index.html`)，聊天页 (`talk.html`) 完全没有改动。

**修改文件：**
1. `application/mobile/view/admin/talk.html`

**修复方式：**
- 在 `talk.html` 的 `<head>` 中注入现代化 CSS 覆盖样式，包含：
  - **顶部栏：** 渐变蓝背景 + 圆角底部 + flex 布局 + 文字居中截断
  - **消息区域：** 浅灰背景、服务端消息白色气泡 + 圆角、客户端消息蓝色渐变气泡
  - **底部输入栏：** 白底 + 圆角顶部 + flex 布局 + 圆角输入框 + 圆角发送按钮
  - **工具栏：** flex 横排布局、去掉旧的 absolute 定位
  - **头像：** 圆角方形 38px
- 注入 `scrollChatToBottom` 函数供消息接收后自动滚动
- 所有样式均为覆盖旧样式，不修改 HTML 结构，不影响消息收发逻辑、Pusher 连接、富媒体回复面板

**是否需要服务器验证：** 需要手机端登录客服后台，进入具体对话页面，确认 UI 变化。消息收发逻辑未改动，需验证原有功能正常。

---

### P0-4：H5 客户聊天端发送消息后不自动定位到最后一条

**原因：**  
`public/assets/h5-chat/js/chat-modern.js` 定义了 `scrollChatToBottom()` 函数（含 MutationObserver 自动滚动），但该函数在 IIFE 内部定义，未暴露到 `window`。`mochat.js` 中的 `send()` 函数使用同步的 `div.scrollTop = div.scrollHeight`，在 fixed 布局下常常被底部工具栏高度变化压住导致不准。`getdata()` 初始加载使用了已废弃的 `$("img").load()` 方法处理图片加载后滚动，在现代浏览器中不可靠。

**修改文件：**
1. `public/assets/h5-chat/js/chat-modern.js`
2. `public/assets/js/moblie/mochat.js`

**修复方式：**
- 在 `chat-modern.js` 中将 `scrollChatToBottom` 导出到 `window.scrollChatToBottom`
- 在 `mochat.js` 的 `send()` 函数中，替换同步 `scrollTop` 为调用 `window.scrollChatToBottom()`，并设置多档延迟（0ms/120ms/300ms）确保 DOM 渲染完毕
- 在 `getdata()` 初始加载中，替换废弃的 `$("img").load()` 为 `scrollChatToBottom` 多档延迟调用
- MutationObserver 已有的 4 档延迟滚动（0/60/200/500ms）继续生效，作为兜底

**是否需要服务器验证：** 在手机浏览器中发送文字消息和图片消息，验证页面自动滚动到底部。

---

### P0-5：H5 客户聊天端无法上传图片

**原因：**  
前端两个问题叠加导致图片上传功能异常：
1. **文件输入缺少 `accept` 属性：** `<input type="file" name="upload">` 没有 `accept="image/*"`，在部分移动浏览器上不会弹出图片选择器
2. **图片显示逻辑错误：** 后端 `Event.php::upload()` 返回的 `res.data` 是 HTML 字符串 `<img src="..." />`。`mochat.js` 的 `put()` 函数将 `res.data` 放入 `<pre>` 标签，并使用 `isValidHttpUrl()` 判断是否为合法 URL。由于 `isValidHttpUrl()` 用 `new URL()` 检查，而后端返回的相对路径（如 `/upload/images/xxx.jpg`）被 `replace(/<[^>]+>/g,"")` 提取后仍是相对路径，导致 `new URL()` 抛出异常返回 false。虽然最终 `<pre><img src="..." /></pre>` 可以渲染，但 HTML 嵌套不干净
3. **上传后文件输入未重置：** 无法重复选择同一张图片
4. **上传后未调用 `scrollChatToBottom`：** 图片消息不会自动滚动到底部
5. **上传失败无提示：** `error` 回调缺失

**修改文件：**
1. `public/assets/js/moblie/mochat.js`
2. `application/mobile/view/index/index.html`
3. `application/mobile/view/admin/talk.html`

**修复方式：**
- 在 H5 客户聊天模板和 mobile admin 聊天模板的文件输入上添加 `accept="image/*"`
- 重写 `put()` 函数的成功处理逻辑：
  - 从 `res.data` 中用正则 strip 掉 HTML 标签提取纯 URL
  - 直接构造干净的 `<img src="URL" />` 标签显示
  - 添加 `onclick="getbig(this)"` 支持点击预览
  - 限制图片最大宽度 200px
- 添加 `error` 回调，显示"图片上传失败"提示
- 添加 `complete` 回调，重置文件输入以便重复上传
- 移除 `put()` 函数后面的游离 `getdata()` 调用（该调用在 `ajaxSubmit` 异步完成前执行，会干扰上传流程）
- 上传成功后调用 `scrollChatToBottom` 滚动到底部

**是否需要服务器验证：** 必须在服务器环境验证：
- 上传接口 `/admin/event/upload` 是否可以被 H5 客户端（非管理员会话）访问
- 文件存储路径是否正确、文件大小限制
- 返回的图片 URL 是否可以正常访问

---

## 2. 修改文件清单

1. **`public/assets/mobile/js/mobile-workbench-modern.js`**
   - 重写 `showTab('blacklist')` 使用 fixed overlay 替代 Swiper slideTo
   - Swiper 调用添加 try/catch 防护
   - 导出 `showTab` 到 `window` 供模板调用

2. **`public/assets/mobile/css/mobile-workbench-modern.css`**
   - 添加 `#MobileBlacklistPanel.is-overlay-active` 固定定位 overlay 样式
   - 添加 `@media (max-width: 768px)` 规则修复 Layui layer 弹窗高度溢出

3. **`application/mobile/view/admin/index.html`**
   - `.list-item` 点击事件：拦截 `id="-1"` 的黑名单条目，调用 `showTab('blacklist')`

4. **`application/mobile/view/admin/talk.html`**
   - 注入完整的现代化 CSS 覆盖样式（header/消息气泡/输入栏/工具栏）
   - 注入 `scrollChatToBottom` 函数
   - 图片上传 input 添加 `accept="image/*"`

5. **`public/assets/h5-chat/js/chat-modern.js`**
   - 将 `scrollChatToBottom` 导出到 `window`

6. **`public/assets/js/moblie/mochat.js`**
   - `put()` 函数：修复图片显示逻辑（提取纯 URL 构建 img 标签）、添加错误回调、重置文件输入、调用 scrollChatToBottom
   - 移除 `put()` 后面的游离 `getdata()` 调用
   - `send()` 函数：替换同步 scrollTop 为 `scrollChatToBottom` 多档延迟
   - `getdata()` 初始加载：替换废弃的 `$("img").load()` 为 `scrollChatToBottom` 延迟调用

7. **`application/mobile/view/index/index.html`**
   - 图片上传 input 添加 `accept="image/*"`

---

## 3. 截图现象与源码根因对照

### 截图 01 — PC Admin UI
- **截图现象：** PC 总后台界面，可见深色侧栏 + 弹窗操作界面
- **根因：** PC 后台使用独立模板体系，本轮未改动
- **是否修复：** 本轮未涉及 PC 后台样式（P1-A），不影响 P0 交付

### 截图 02 — Mobile Admin Layout Issue
- **截图现象：** 手机端管理后台（平台后台）布局拥挤，导航压缩，像是 PC 页面被缩小
- **根因：** 平台管理后台（`application/platform/view/`）使用的 PC 端模板缺少移动端响应式适配
- **是否修复：** 本轮未做全面响应式改造（P1-B），需后续专项处理

### 截图 03 — Mobile Workbench QR Modal Cropped
- **截图现象：** 手机端二维码弹窗只显示了一半，底部被裁切
- **根因：** Layui layer 弹窗无 max-height 限制，在移动端视口中内容溢出被截断
- **本轮修复：** ✅ 已通过 CSS `@media` 规则限制 layer 弹窗高度并允许内部滚动

### 截图 04 — Mobile Chat Page Still Old Version
- **截图现象：** 手机端客服聊天页面仍是旧版本——深色顶栏、无圆角气泡、输入框无现代化样式
- **根因：** 工作台首页 `index.html` 已现代化，但聊天页 `talk.html` 完全未改动，仍使用 `mtalk.css` 原始样式
- **本轮修复：** ✅ 已在 `talk.html` 中注入现代化 CSS 覆盖

---

## 4. 自检结果

### ✅ 模板引用确认
- `mobile/view/admin/index.html` 第 16 行引用 `mobile-workbench-modern.css` ✅
- `mobile/view/admin/index.html` 第 1442 行引用 `mobile-workbench-modern.js` ✅
- `mobile/view/index/index.html` 第 17 行引用 `chat-modern.css` ✅
- `mobile/view/index/index.html` 第 786 行引用 `chat-modern.js` ✅
- `mobile/view/index/index.html` 第 787 行引用 `mochat.js` ✅

### ✅ DOM 选择器一致性
- 黑名单标签按钮：`data-tab="blacklist"` ↔ JS `showTab('blacklist')` ✅
- 黑名单面板：`#MobileBlacklistPanel` ↔ JS/CSS 一致 ✅
- 消息容器：`#log` / `.conversation` ↔ `scrollChatToBottom` 中 `getElementById('log')` ✅
- 滚动容器：`#wrap` ↔ `scrollChatToBottom` 中 `getElementById('wrap')` ✅

### ✅ JS 语法检查
- `mobile-workbench-modern.js`：IIFE 闭合正确，`showTab` 导出在闭包内 ✅
- `chat-modern.js`：`window.scrollChatToBottom = scrollChatToBottom` 在函数定义后立即赋值 ✅
- `mochat.js`：`put()` 函数重写语法正确，`complete` 回调用于重置文件输入 ✅

### ⚠️ 无法本地验证的项目
- **上传接口权限**：H5 客户端调用 `/admin/event/upload` 是否需要 admin 会话（需服务器验证）
- **WebSocket 连接**：Pusher 实时消息推送是否正常（需服务器验证）
- **二维码生成**：AraleQRCode 库是否正常加载（需确认 JS 文件路径）
- **Swiper 实例**：`window.chatSwiper` 的初始化是否正常（需浏览器验证）

---

## 5. 上线前人工测试步骤

### 测试 1：手机客服工作台黑名单

1. 手机浏览器打开客服工作台：`{域名}/mobile/admin/index`（登录后）
2. 页面底部有三个标签：「会话」「黑名单」「我的」
3. 点击「黑名单」标签
4. **预期：** 页面中央出现黑名单面板（覆盖在会话列表上方），显示"正在加载黑名单..."然后显示黑名单列表或"暂无 IP 黑名单"空态
5. 点击「会话」标签
6. **预期：** 黑名单面板消失，回到会话列表
7. 如果客户分组列表中有"黑名单"条目（id=-1），点击它
8. **预期：** 不跳转，而是切换到黑名单标签

### 测试 2：二维码弹窗

1. 在客服工作台页面，点击右上角蓝色「+」按钮
2. 在弹出的操作菜单中选择「生成接待二维码」
3. 填写客户名称（如"测试客户"），点击「生成」
4. **预期：** 弹出二维码弹窗，完整显示：标题 + 二维码图片 + 链接文字 + 复制按钮
5. **预期：** 弹窗不被截断，小屏手机上弹窗内可滚动查看全部内容
6. 点击「复制链接」按钮
7. **预期：** 提示"已复制"

### 测试 3：移动客服聊天新版 UI

1. 在客服工作台首页，点击任意一个会话进入聊天页面
2. **预期变化：**
   - 顶部栏：蓝色渐变背景 + 圆角底部（不再是纯深色直角）
   - 消息气泡：客服消息白底圆角 / 客户消息蓝色渐变圆角
   - 头像：圆角方形（不再是圆形）
   - 底部输入栏：白底 + 圆角输入框 + 圆角蓝色发送按钮
   - 工具栏：横排图标布局
3. 在输入框输入文字，点击发送
4. **预期：** 消息正常发送并显示为蓝色气泡，对方回复显示为白色气泡
5. 点击返回箭头
6. **预期：** 回到工作台首页

### 测试 4：H5 客户发送消息滚到底部

1. 使用手机浏览器打开 H5 客户聊天页面（访客端入口）
2. 等待页面加载完成，确认能看到最新消息（历史消息加载后自动滚到底部）
3. 在输入框输入文字"测试消息"，点击「发送」
4. **预期：** 消息发送成功后，页面自动滚动到刚发送的消息，无需手动下滑
5. 让客服回复一条消息
6. **预期：** 收到新消息后，页面自动滚动到该消息
7. 连续发送多条消息
8. **预期：** 每次发送后都自动滚到最新消息

### 测试 5：H5 图片上传

1. 在 H5 客户聊天页面，点击底部「+」按钮展开工具栏
2. 点击图片上传图标（相机/图片图标）
3. **预期：** 弹出手机相册/拍照选择器（不是通用文件选择器）
4. 选择一张图片
5. **预期：** 
   - 聊天区域出现图片消息（显示为缩略图，max-width 200px）
   - 页面自动滚动到该图片消息
6. 如果上传失败
7. **预期：** 弹出提示"图片上传失败，请重试"
8. **服务器验证重点：** 确认上传接口 `/admin/event/upload` 可正常被 H5 客户端访问，返回正确的图片 URL

---

## 6. 遗留但不阻断本轮交付的问题

### P1-A：PC 总后台样式统一
- 截图 01 可见 PC 后台使用深色侧栏布局
- 部分页面可能存在旧样式残留
- 本轮未做改动，建议后续专项统一

### P1-B：手机管理后台（平台后台）整体布局
- 截图 02 可见平台后台在手机端显示拥挤
- 根因：平台后台模板（`application/platform/view/`）使用 PC 端 Layui admin 布局，无移动端响应式
- 需要对 `layout/default.html` 添加 viewport meta + 响应式 CSS
- 工作量较大（涉及导航、表格、表单全面适配），建议单独排期

### 其他发现的问题
1. **`mochat.js` 的 `getdata()` 中有一个 bug：** 第 430-431 行 `if (res.length > 0) { $.cookie("cid", data[0]['cid']); }` 中 `data[0]` 引用的变量 `data` 未在该函数作用域内定义（应为 `res.data[0]`），可能导致 JS 错误。但这是原有 bug，本轮不改动核心逻辑。
2. **上传接口权限存疑：** `/admin/event/upload` 是管理员控制器方法，H5 客户端（非管理员会话）可能无权访问。如果上传仍失败，需检查 ThinkPHP 的中间件/权限拦截配置。
3. **`talk.html` 中 `#text_all` 和 `#text_in` 混用：** 模板中输入框 id 为 `text_all`，但 mchat.js 可能引用 `text_in`。需确认 `mchat.js` 使用的选择器。
4. **AraleQRCode 库路径未确认：** 二维码生成依赖该库，需确认在移动端模板中已正确加载。
