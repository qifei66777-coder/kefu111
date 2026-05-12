# TEMPLATE_AND_ENTRY_MAP.md — 模板与入口映射表

> 本文件解决"总是改错模板文件"的问题。  
> 每次改代码前必须先查本文件确认真实入口。

---

## 1. 项目页面体系总览

| 页面体系 | 服务对象 | 模板目录 | 典型文件 | 常见误改对象 |
|---------|---------|---------|---------|------------|
| PC 总后台 | 客服员工（PC） | `application/admin/view/` | `index/chats.html`、`login/index.html` | 不要和移动端混淆 |
| 手机端平台管理后台 | 系统管理员（手机） | `application/platform/view/` | `layout/default.html`、`app/index.html` | 不要当成客服工作台 |
| 移动端员工客服工作台 | 客服员工（手机） | `application/mobile/view/admin/` | `index.html`（首页）、`talk.html`（聊天页） | 首页 ≠ 聊天页，是两个模板 |
| H5 访客聊天端 | 客户/访客（手机） | `application/mobile/view/index/` | `index.html` | 不要和 admin/index.html 混淆 |

---

## 2. 已确认真实入口详细表

| 功能 | 用户如何进入 | 真实模板 | 真实 JS | 真实 CSS | 本次是否改过 |
|------|------------|---------|--------|---------|------------|
| 移动端工作台首页 | 手机登录后首页 `/mobile/admin/index` | `mobile/view/admin/index.html` | `mobile-workbench-modern.js` | `mobile-workbench-modern.css` | ✅ 改了黑名单点击 + QR 引用路径 |
| 黑名单 Tab | 工作台底部点"黑名单" | 同上（overlay 覆盖层） | `mobile-workbench-modern.js → showTab('blacklist')` | `mobile-workbench-modern.css → .is-overlay-active` | ✅ 改了 overlay 方案 |
| 二维码弹窗 | 工作台点"+" → "生成接待二维码" | 同上（Layui layer.open 弹窗） | `mobile-workbench-modern.js → showChannelResult()` + `arale-qrcode.js` | `mobile-workbench-modern.css → @media 规则` | ✅ 补了 QR 库 + CSS 修复 |
| 移动员工客服聊天页 | 工作台点某个会话 → 跳转 | `mobile/view/admin/talk.html` | `admin/mchat.js` | 内联 `<style>` 现代化覆盖 + `admin/mtalk.css` | ✅ 注入了新 CSS |
| H5 访客聊天页 | 访客从分享链接/网站进入 | `mobile/view/index/index.html` | `moblie/mochat.js` + `h5-chat/chat-modern.js` | `h5-chat/chat-modern.css` | ✅ 改了 accept + 滚动 |
| H5 图片上传 | 访客聊天页点"+" → 选图片 | 同上 | `mochat.js → put()` | — | ✅ 重写了 put() 解析逻辑 |
| H5 自动滚底 | 发送/接收消息后 | 同上 | `chat-modern.js → scrollChatToBottom()` + `mochat.js → send()/getdata()` | — | ✅ 导出全局 + 多档延时 |

---

## 3. 最容易改错的坑

### 坑 1: 工作台首页 ≠ 聊天页
```
application/mobile/view/admin/index.html  ← 工作台首页（会话列表）
application/mobile/view/admin/talk.html   ← 聊天页（消息收发）
```
这是两个完全独立的模板。改了 index.html 不会影响聊天页 UI。

### 坑 2: 员工端 ≠ 访客端
```
application/mobile/view/admin/...  ← 员工客服端（需登录）
application/mobile/view/index/...  ← H5 访客端（无需登录）
```
两个目录下都有 `index.html`，但服务对象、JS、CSS 全部不同。

### 坑 3: mchat.js ≠ mochat.js
```
public/assets/js/admin/mchat.js   ← 员工客服聊天 JS，使用 #text_all
public/assets/js/moblie/mochat.js  ← H5 访客聊天 JS，使用 #text_in
```
注意目录名拼写是 `moblie`（原项目拼错），不是 `mobile`。

### 坑 4: 文件名有 chat/talk/index 不能靠名字猜
- `index.html` 在 `admin/` 下是工作台首页
- `index.html` 在 `index/` 下是访客聊天页
- `talk.html` 才是员工聊天页
- `chats.html` 在 `admin/view/index/` 下是 PC 后台聊天页
- 必须追控制器确认

### 坑 5: 写了文件但模板没引用
如果创建了新的 CSS/JS 文件，必须检查：
1. 目标模板的 `<link>` / `<script>` 标签中是否有引用
2. 引用路径是否用了 `__assets__` 等模板变量
3. 文件是否在 `public/` 目录下的正确位置

### 坑 6: Event 控制器无权限拦截
```
Event extends Controller   ← 无登录检查，H5 访客可访问
Base extends Controller    ← 有 session 登录检查
其他控制器 extends Base    ← 需要登录
```
不要给 Event 添加登录拦截，会导致 H5 访客端功能全部失效。

---

## 4. 固定定位流程（Checklist）

每次修改前必须按顺序执行：

- [ ] **Step 1:** 确认用户访问的是四套页面中的哪一套
- [ ] **Step 2:** 从访问路径找到路由 → 找到控制器方法
- [ ] **Step 3:** 从控制器方法找到渲染的模板文件（`$this->fetch()` / `return view()`）
- [ ] **Step 4:** 打开模板文件，搜索所有 `<link` 和 `<script` 标签，列出引用的 CSS/JS
- [ ] **Step 5:** 确认要修改的文件在模板的引用列表中（如果不在，说明改错了）
- [ ] **Step 6:** 修改完成后，输出人工测试路径：打开哪个 URL → 操作什么 → 预期结果

---

## 5. 目录名拼写提醒

项目中有一个历史拼写错误不可"修正"（改了会断引用）：

```
public/assets/js/moblie/   ← 拼错的，但所有模板引用的是这个路径
                  ^^^^^^ 应该是 mobile，但不要改
```

模板中写的是 `__script__/moblie/mochat.js`，如果把目录名改成 `mobile` 会导致 404。
