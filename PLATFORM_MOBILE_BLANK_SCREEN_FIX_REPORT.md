# 手机端总后台黑屏修复报告

> 日期：2026-05-12  
> 状态：代码已修复并提交，待线上拉取后复验

---

## 1. 真实根因

### 真实入口链路

| 项 | 确认结果 |
|----|---------|
| 模块 | `platform` 模块 |
| 模板根目录 | `application/platform/view/` |
| 主布局文件 | `application/platform/view/layout/default.html` |
| 顶部 Logo / 管理中心 / 横向导航 | `default.html` 内的 `<nav class="navbar">` |
| 主内容区容器 | `<main role="main" class="container">` → `<div class="main-r">` → `<div class="main-r-content">{__CONTENT__}</div>` |
| 内容渲染方式 | ThinkPHP 模板 `{__CONTENT__}` 直接渲染，不是 iframe，不是 AJAX |

### 为什么顶部能显示、内容黑屏

`body` 有 `pf-modern` 类，触发了桌面端 SaaS 布局：

**桌面端 CSS（行 248-265）：**
```css
body.pf-modern .navbar {
    position: fixed !important;  ← 关键：有 !important
    top: 0;
    left: 0;
    bottom: 0;                   ← 关键：撑满到底部
    width: 236px;
    height: 100vh;
    background-color: #0f172a !important;  ← 深色背景
    background-image: linear-gradient(...) !important;
}
```

**移动端媒体查询（原 @media max-width: 900px）：**
```css
body.pf-modern .navbar {
    position: sticky;     ← 没有 !important，被桌面的 fixed !important 覆盖
    width: 100%;
    height: auto;
}
/* 没有清除 bottom: 0 / top: 0 / left: 0 */
```

**结果：**
1. `position: fixed !important` 胜出 → navbar 仍然是 fixed 定位
2. `top: 0` + `bottom: 0` 未被清除 → navbar 高度撑满整个视口（即便设了 `height: auto`，`top:0 + bottom:0` 等效于 `height: 100vh`）
3. `width: 100%` 生效 → navbar 占满全屏宽度
4. 深色渐变背景 → 全屏深色覆盖层
5. Logo、管理中心、导航菜单在 navbar 顶部可见
6. `<main>` 在 navbar 后面，被完全遮住 → 黑屏

**一句话总结：桌面端侧栏的 `position: fixed !important` 和 `bottom: 0` 在移动端未被正确覆盖，导致导航栏变成全屏遮罩。**

---

## 2. 修改文件

| # | 文件 | 作用 |
|---|------|------|
| 1 | `application/platform/view/layout/default.html` | 修复 `@media (max-width: 900px)` 媒体查询 |

仅修改 1 个文件。

---

## 3. 具体修复方式

在 `@media (max-width: 900px)` 媒体查询中，对 `.pf-modern .navbar` 添加 `!important` 覆盖桌面端的 `!important` 规则：

| 属性 | 桌面端值 | 修复前移动端 | 修复后移动端 |
|------|---------|------------|------------|
| `position` | `fixed !important` | `sticky`（被覆盖） | `sticky !important` |
| `top` | `0` | 未清除 | `0 !important`（sticky 定位的粘性位置） |
| `bottom` | `0` | 未清除 | `auto !important`（断开全屏拉伸） |
| `left` | `0` | 未清除 | `auto !important` |
| `right` | 未设置 | 未清除 | `auto !important` |
| `width` | `236px` | `100%` | `100% !important` |
| `height` | `100vh` | `auto` | `auto !important` |
| `min-width` | `236px !important` | 未清除 | `0 !important` |
| `overflow-y` | `auto`（桌面侧栏滚动） | 未清除 | `visible !important` |

同时适度压缩了移动端导航的 padding、字号、间距，让更多空间留给内容区。

对 `main.container` 也加了 `!important` 确保 `margin-left: 0` 生效。

---

## 4. 为什么不会影响 PC

所有修改均在 `@media (max-width: 900px)` 内，PC 端屏幕宽度超过 900px 时完全不触发。

桌面端的 `.pf-modern .navbar` 固定侧栏布局、`main.container` 的 `margin-left: 236px` 等规则不受影响。

---

## 5. 最短线上测试路径

### 测试 1: 数据中心
1. 手机浏览器打开 `{域名}/platform/index/index`（管理员登录后）
2. **预期：** 顶部显示 Logo + 管理中心 + 横向导航，导航下方显示数据中心内容卡片，不再是黑屏

### 测试 2: 账户管理
1. 在上述页面点击横向导航「账户管理」
2. **预期：** 导航下方显示账户管理页面内容，表格/列表可见

### 测试 3: 客服系统
1. 点击横向导航「客服系统」
2. **预期：** 客服系统页面内容可见

### 测试 4: 设置
1. 点击横向导航「设置」
2. **预期：** 设置页面内容可见

### 通用验证
- 所有页面：内容区背景为浅色（#f4f7fb），不再是深色
- PC 端：打开同一页面，确认侧栏布局仍然正常

---

## 6. 当前状态

> 代码已修复并提交，待线上拉取后复验。
