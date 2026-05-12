# NEXT_CLAUDE_HANDOFF.md — 服务器 Claude Code 交接说明

> 本文件由本地开发环境生成，随代码一起上传到服务器。  
> 服务器端 Claude Code 首次接手时必须先读此文件。

---

## 1. 当前已完成的修复（2026-05-12）

以下 5 个 P0 问题已在代码层修复，上传到服务器后需做真实冒烟测试：

### P0-1: 移动端黑名单 Tab 点击无响应
- **根因：** Swiper 隐藏 slide 导致索引错乱 + 点击事件误导航
- **修复：** 改用 fixed overlay 方案，`showTab('blacklist')` 直接切换覆盖层
- **修改文件：** `mobile-workbench-modern.js`、`mobile-workbench-modern.css`、`mobile/view/admin/index.html`
- **状态：** 代码层已修，待服务器真实页面验证

### P0-2: 移动端二维码弹窗只显示一半 + 二维码不生成
- **根因：** Layui layer 弹窗无 max-height 限制 + AraleQRCode 库文件缺失
- **修复：** CSS 媒体查询限高 + 新建 `arale-qrcode.js` 浏览器独立版
- **修改文件：** `mobile-workbench-modern.css`、`arale-qrcode.js`（新建）、`mobile/view/admin/index.html`
- **状态：** 代码层已修，待服务器验证弹窗完整显示且二维码图片生成

### P0-3: 移动端员工聊天页仍是旧版 UI
- **根因：** 只改了工作台首页 `index.html`，真正聊天页 `talk.html` 完全没改
- **修复：** 在 `talk.html` 的 `<head>` 注入现代化 CSS 覆盖样式
- **修改文件：** `application/mobile/view/admin/talk.html`
- **状态：** 代码层已修，待服务器验证新 UI 生效且消息收发正常

### P0-4: H5 访客聊天发消息不自动滚到底部
- **根因：** `scrollChatToBottom` 未导出到 window + `mochat.js` 使用不可靠的同步 scrollTop
- **修复：** 导出全局函数 + send()/put()/getdata() 多档延时调用
- **修改文件：** `chat-modern.js`、`mochat.js`
- **状态：** 代码层已修，待服务器验证滚动行为

### P0-5: H5 访客聊天无法上传图片
- **根因：** 缺少 accept 属性 + put() 函数解析后端返回的 HTML 逻辑错误 + 无 error/complete 回调
- **修复：** 重写 put() 解析逻辑、添加 accept="image/*"、添加错误处理和文件输入重置
- **权限确认：** `/admin/event/upload` 接口 Event.php 直接继承 Controller，无登录拦截，H5 访客可正常访问
- **修改文件：** `mochat.js`、`mobile/view/index/index.html`、`mobile/view/admin/talk.html`
- **状态：** 代码层已修，待服务器验证完整上传流程

### 额外修复: mochat.js 分页 bug
- **根因：** `res.length` 应为 `res.data.length`，`data[0]` 应为 `res.data[0]`
- **修复：** 3 行代码修正
- **修改文件：** `mochat.js`
- **状态：** 代码层已修

---

## 2. 服务器 Claude 首次接手必读顺序

**严格按以下顺序执行：**

1. **先读 `CLAUDE.md`** — 了解项目最高规则、四套页面体系、禁止事项
2. **再读 `TEMPLATE_AND_ENTRY_MAP.md`** — 了解真实模板入口映射，避免改错文件
3. **再读 `URGENT_FRONTEND_FIX_REPORT.md`** — 了解 5 个 P0 修复的详细方案和原因
4. **再读 `URGENT_FRONTEND_FINAL_CHECK.md`** — 了解风险封口的最终确认结论
5. **对照 `UPLOAD_TO_SERVER_FILELIST.md`** — 核对本地上传文件与服务器文件是否一致
6. **执行 5 项真实页面冒烟测试**（见下方第 3 节）
7. **输出 `SERVER_SMOKE_TEST_REPORT.md`** — 记录每项测试结果

---

## 3. 线上真实冒烟测试（5 项必测）

### 测试 1: 移动端黑名单 Tab
1. 手机浏览器打开 `{域名}/mobile/admin/index`（登录客服账号）
2. 点击底部「黑名单」标签
3. **通过标准：** 出现黑名单覆盖面板，显示黑名单列表或空态提示
4. 点击「会话」标签回到会话列表
5. **通过标准：** 黑名单面板消失

### 测试 2: 二维码弹窗
1. 在工作台点右上角「+」按钮 → 选择「生成接待二维码」
2. 填写信息后点生成
3. **通过标准：** 弹窗完整显示，包含标题 + 二维码图片（不是空白） + 链接 + 按钮
4. 小屏手机上弹窗内容可滚动查看
5. **重点验证：** 二维码图片是否真实渲染（检查 canvas 元素是否有内容）

### 测试 3: 移动员工聊天新版 UI
1. 从工作台点击任意会话进入聊天页
2. **通过标准：** 顶部蓝色渐变栏 + 圆角消息气泡 + 圆角输入框 + 蓝色发送按钮
3. 输入文字发送
4. **通过标准：** 消息正常发送和接收，Pusher 实时推送正常

### 测试 4: H5 访客发消息滚到底部
1. 手机打开 H5 访客聊天页面
2. 发送一条文字消息
3. **通过标准：** 页面自动滚动到刚发送的消息
4. 让客服回复，检查是否自动滚到新消息

### 测试 5: H5 图片上传
1. 在 H5 访客聊天页点「+」展开工具栏 → 点图片图标
2. **通过标准：** 弹出图片选择器（不是通用文件选择器）
3. 选择图片后
4. **通过标准：** 聊天区域出现图片缩略图 + 页面滚到底部
5. **失败时通过标准：** 弹出"图片上传失败，请重试"提示（不是静默失败）

---

## 4. 服务器 Claude 禁止事项

1. **不要一上来继续重做 UI** — 当前 UI 已经是交付版本，除非用户明确要求改
2. **不要推翻本地刚修好的逻辑** — 特别是 `put()` 函数、`scrollChatToBottom` 导出、overlay 方案
3. **不要在没验证文件同步是否完整前乱改** — 先核对 `UPLOAD_TO_SERVER_FILELIST.md` 中的文件是否都已到位
4. **不要再次把"自检通过"写成"功能交付完成"** — 必须区分代码层修复和线上验证
5. **不要给 Event.php 添加登录拦截** — 会导致 H5 访客端上传、消息接收等功能全部失效
6. **不要改目录名 `moblie` 为 `mobile`** — 这是历史拼写，所有模板引用的是 `moblie`
