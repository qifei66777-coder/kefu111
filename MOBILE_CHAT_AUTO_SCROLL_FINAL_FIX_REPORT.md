# P0 修复报告：移动端两端聊天消息自动滚到底部

> 状态：代码已修复并提交，待线上真实聊天复验。

---

## 1. 上次为什么没有真正修复成功

### 根因 1：H5 客户端 CSS 布局导致 `#wrap` 高度溢出视口

H5 页面的 `index.html` 内联样式定义了：

```css
.content {
    position: fixed;
    top: 0;
    height: 100%;     /* = 100vh */
    overflow-y: auto;
}
```

`chat-modern.css` 通过高特异性选择器覆盖了 `top` 为 `calc(header + tags + safe-area)`（约 100px），并设置了 `bottom: 0`，但 **没有覆盖 `height`**。

CSS 规范：当 `top`、`height`、`bottom` 同时指定且不一致时，`bottom` 被忽略。

结果：`#wrap` 元素从 viewport 顶部 ~100px 处开始，高度仍为 100vh，**底部超出视口约 100px**。

`scrollTop = scrollHeight` 将内容滚到元素底部，但元素底部在视口下方 100px → **用户看不到最后一条消息**。

所有 `scrollChatToBottom()` 调用、MutationObserver、`forceScrollAfterSend()` 都在正确执行，但因为容器高度错误，滚动目标位置在视口外面。

### 根因 2：客服端 `getdata()` 初始加载没有滚动文字消息

`mchat.js` 的 `getdata()` 函数在首次加载（`cookie hid == ""`）时：

```javascript
$(".conversation").append(str);
if (div) {
    $("img").load(function () {   // 只在图片加载时滚动
        div.scrollTop = div.scrollHeight;
    });
}
```

如果历史消息全是文字（没有图片），`$("img").load()` 永远不会触发 → **首次进入聊天页不会滚到底部**。

### 根因 3：两端都缺少图片异步加载后的补偿滚动

图片消息 `<img>` 异步加载后会撑高消息区域，导致之前的 `scrollTop` 不再是底部。之前没有对新插入消息中的 `<img>` 元素绑定 `onload` 回调来补偿滚动。

---

## 2. 移动员工客服端 (P0-A)

### 真实模板
`application/mobile/view/admin/talk.html`

### 真实 JS 文件
- **主聊天逻辑**：`public/assets/js/admin/mchat.js`（通过 `__script__/admin/mchat.js` 引入）
- **内联脚本**：`talk.html` 中的 `<script>` 块（WebSocket 连接 + 消息接收）

### 真实消息容器
`<ul class="conversation" id="log">` — 所有消息 `<li>` append 到此容器

### 真实滚动容器
`<section class="content" id="wrap">` — CSS 设置 `position: fixed; top: 0; height: 100%; overflow-y: auto;`

### 修复的触发场景

| # | 场景 | 修复前状态 | 修复内容 |
|---|------|-----------|---------|
| 1 | 首次进入（历史消息加载） | 仅图片触发 `$("img").load` 滚动，纯文字不滚 | `getdata()` append 后直接调用 `scrollChatToBottom()` |
| 2 | 客服发送文字 | `sendContent()` 已调用 `scrollChatToBottom()` ✓ | 保持不变 |
| 3 | 收到客户消息 | `cu-event` 已调用 `scrollChatToBottom()` ✓ | 保持不变 |
| 4 | 图片/文件上传 | `put()` / `putfile()` 用 `div.scrollTop = div.scrollHeight` 无补偿 | 改用 `scrollChatToBottom()` + setTimeout 二次滚 |
| 5 | 图片异步加载撑高 | 无处理 | `scrollChatToBottom()` 内自动绑定 `#log img` 的 `onload` 回调 |
| 6 | 富媒体快捷回复 | `sendMobileRichReply()` 用裸 `div.scrollTop` | 改用 `scrollChatToBottom()` |

---

## 3. H5 客户端 (P0-B)

### 真实模板
`application/mobile/view/index/index.html`

### 真实 JS 文件
- **UI 适配 + 滚动工具**：`public/assets/h5-chat/js/chat-modern.js`
- **主聊天逻辑**：`public/assets/js/moblie/mochat.js`（通过 `__script__/moblie/mochat.js` 引入）
- **内联脚本**：`index.html` 中的 `<script>` 块（WebSocket 连接 + 消息接收）

### 真实消息容器
`<ul id="log" class="conversation">` — 所有消息 `<li>` append 到此容器

### 真实滚动容器
`<div class="content h5-chat-scroll" id="wrap">` — CSS 设置 `position: fixed; overflow-y: auto;`

### 修复的触发场景

| # | 场景 | 修复前状态 | 修复内容 |
|---|------|-----------|---------|
| 1 | 首次进入（历史消息加载） | `getdata()` 调用 `scrollChatToBottom` 但因 CSS 高度问题无效 | CSS `height: auto !important` 修复容器高度 |
| 2 | 客户发送文字 | `send()` 调用 `scrollChatToBottom` 但因 CSS 无效 | CSS 修复后生效 |
| 3 | 收到客服消息 | `my-event` 用裸 `div.scrollTop = div.scrollHeight` 且 CSS 错误 | 改用 `scrollChatToBottom()` + CSS 修复 |
| 4 | 图片上传 | `put()` 调用 `scrollChatToBottom` 但因 CSS 无效 | CSS 修复后生效 |
| 5 | 图片异步加载撑高 | 无处理 | `scrollChatToBottom()` 和 MutationObserver 内自动绑定 `img.onload` |
| 6 | MutationObserver 兜底 | 存在但因 CSS 无效 | CSS 修复后生效 + 增加新节点内 img onload 监听 |

---

## 4. 修改文件清单

### `public/assets/h5-chat/css/chat-modern.css`
- **L216**：添加 `height: auto !important;` 覆盖内联 `.content { height: 100% }` — **这是 H5 端核心修复**
- **L639**：在 `.h5-with-follow` 变体中同样添加 `height: auto !important;`

### `public/assets/h5-chat/js/chat-modern.js`
- **scrollChatToBottom()**：重写为 `doScrollNow()` + 带/不带 delay 两种路径；不带 delay 时立即滚 + rAF + 80ms + 250ms 四重保障
- **增加图片监听**：`scrollChatToBottom()` 调用时自动对 `#log img` 未加载图片绑定 onload → 补偿滚动
- **MutationObserver**：新增对 append 节点内 `<img>` 的 onload 绑定
- **forceScrollAfterSend()**：简化为 3 档（0/200/500ms）

### `public/assets/js/admin/mchat.js`
- **getdata() L570-572**：初始加载（`hid==""` 分支）从仅 `$("img").load()` 改为直接调用 `scrollChatToBottom()`
- **scrollChatToBottom()**：增加第 4 档 400ms 延迟 + 自动对 `#log img` 未加载图片绑定 onload/onerror → 补偿滚动
- **put()**：图片上传成功后改用 `scrollChatToBottom()` + setTimeout 二次滚
- **putfile()**：文件上传成功后改用 `scrollChatToBottom()` + setTimeout 二次滚

### `application/mobile/view/admin/talk.html`
- **内联 scrollChatToBottom**：简化为直接 `scrollTop + rAF` 双重滚动（mchat.js 加载后会覆盖此版本）
- **sendMobileRichReply()**：从裸 `div.scrollTop` 改为 `scrollChatToBottom()` + setTimeout 二次滚

### `application/mobile/view/index/index.html`
- **my-event 处理器**：从裸 `div.scrollTop = div.scrollHeight` 改为 `scrollChatToBottom()` + 300ms 延迟 + setTimeout 内再次调用

---

## 5. 为什么这次比上次更可靠

### 5.1 确认了真实滚动容器及其 CSS 约束

| 端 | 滚动容器 | 关键 CSS | 之前的问题 |
|----|---------|---------|-----------|
| 客服 | `#wrap` `.content` | `position:fixed; top:0; height:100%; overflow-y:auto;` | 容器正确，但 `getdata()` 没调用滚动 |
| H5 | `#wrap` `.content.h5-chat-scroll` | 内联 `height:100%` 未被覆盖，导致元素超出视口 | **根本性的 CSS 布局错误** |

本次直接在 `chat-modern.css` 添加 `height: auto !important` 覆盖内联高度，让 `top + bottom` 决定元素高度 = 视口可见区域。

### 5.2 确保在 DOM 更新后执行

- **即时滚动**：`wrap.scrollTop = wrap.scrollHeight + 9999`
- **rAF 兜底**：`requestAnimationFrame()` 确保在浏览器下一帧重绘后再滚
- **延时兜底**：80ms / 150ms / 250ms / 400ms 多档 setTimeout
- **MutationObserver**（H5 端）：DOM childList 变更自动触发滚动

### 5.3 处理图片异步撑高

两端的 `scrollChatToBottom()` 函数在每次调用时扫描 `#log img`：
- 对 `complete === false` 且未绑定过的图片绑定 `onload` 和 `onerror` 事件
- 图片加载完成后自动执行 `wrap.scrollTop = wrap.scrollHeight + 9999`
- 使用 `_h5ScrollBound` / `_agentScrollBound` 标记避免重复绑定

H5 端的 MutationObserver 额外对每个新增 DOM 节点内的 `<img>` 绑定 onload。

---

## 6. 最短线上复验步骤

### A. 客服端测试路径

1. 手机浏览器打开客服工作台 → 进入任意会话
2. **验证初始加载**：如有历史消息，进入后应默认显示最底部最新消息
3. **验证发送文字**：输入一条文字 → 点击发送 → 页面自动定位到刚发出的消息
4. **验证收到消息**：让客户从 H5 端发一条消息 → 客服端自动定位到最新消息
5. **验证图片消息**：发送一张图片 → 图片加载完成后页面仍在底部
6. **验证富媒体回复**：点击工具栏富媒体按钮 → 发送一条 → 页面定位到最新消息

### B. 客户端测试路径

1. 手机浏览器打开 H5 客户聊天页
2. **验证初始加载**：如有历史消息，进入后应默认显示最底部最新消息
3. **验证发送文字**：输入一条文字 → 点击发送 → 页面自动定位到刚发出的消息
4. **验证收到消息**：让客服从后台发一条消息 → 客户端自动定位到最新消息
5. **验证图片消息**：发送一张图片 → 图片加载完成后页面仍在底部
6. **验证键盘弹起**：点击输入框 → 键盘弹起后最新消息仍可见
