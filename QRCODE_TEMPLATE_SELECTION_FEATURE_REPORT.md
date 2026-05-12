# 二维码海报模板选择功能 — 开发报告

> 完成日期：2026-05-13

---

## 1. 功能概述

### 新增内容
基于当前已确认的二维码海报设计，新增 **5 种颜色主题模板**，客服在"生成接待二维码"时可选择模板。所有模板共享相同的排版结构、文案层级和视觉元素，仅通过配色方案区分。

### 用户使用流程
1. 客服在移动端工作台点击 **"+"** → **"生成接待二维码"**
2. 填写客户名称、勾选一客户一码（可选）
3. **新增：选择海报主题**（蓝/绿/紫/橙/红，默认蓝色）
4. 点击"生成"
5. 弹出对应主题色的二维码海报卡片
6. 在"二维码管理"列表中可看到每个二维码的模板标签

---

## 2. 5 种模板说明

| # | 主题名 | CSS class | 主色方向 | 风格定位 |
|---|--------|-----------|---------|---------|
| 1 | 蓝色（默认） | `theme-blue` | #2563eb 专业蓝 | 现代、专业、客服感强 |
| 2 | 绿色 | `theme-green` | #16a34a 清新绿 | 清新、信任、轻服务感 |
| 3 | 紫色 | `theme-purple` | #7c3aed 科技紫 | 柔和、科技感、现代感 |
| 4 | 橙色 | `theme-orange` | #ea580c 活力橙 | 活力、亲和、转化感强 |
| 5 | 红色 | `theme-red` | #dc2626 热情红 | 热情、醒目、营销感较强 |

### 固定不变的模板结构
- 顶部大标题："在线咨询"
- 副标题："欢迎咨询在线客服"
- 服务时间徽章："服务时间：全天24小时"
- 居中大 QR 码卡片区域
- 客户名称/备注文案
- 客服 emoji 头像
- 底部"复制链接"按钮

### 随主题变化的元素
- 背景渐变色
- 标题色 / 文字强调色
- 服务时间徽章底色
- 装饰圆形/星形色
- QR 码外框卡片边框强调色
- 按钮底色
- emoji 头像背景色

---

## 3. 技术实现方式

### 3.1 真实二维码生成入口
- **移动端**：`mobile-workbench-modern.js` → `openChannelCreator('qr')` → POST `/admin/qrchannel/create`
- **PC端**：`chats.html` → `openQrChannel()` → POST `/admin/qrchannel/create`（默认传 `poster_theme: 'blue'`）

### 3.2 模板如何切换
- 一套统一 HTML 结构（`buildPosterHtml()` 函数）
- 通过 CSS class `.theme-blue` / `.theme-green` / `.theme-purple` / `.theme-orange` / `.theme-red` 切换
- CSS 使用 CSS 变量（`--qp-bg`, `--qp-title`, `--qp-accent` 等）实现主题色替换
- **不需要**复制 5 份模板文件

### 3.3 模板字段如何保存
- `qr_channels` 表新增 `poster_theme` 字段（VARCHAR(20), 默认 `'blue'`）
- 后端 `Qrchannel::create()` 接收 `poster_theme` 参数，白名单校验（仅允许 blue/green/purple/orange/red）
- 后端 `formatChannelRow()` 返回 `poster_theme` 字段给前端

### 3.4 查看二维码如何按模板渲染
- 管理列表中每个二维码卡片携带 `data-theme` 属性
- 点击"查看二维码"时读取 `data-theme`，传给 `showChannelResult(url, remark, oneToOne, theme)`
- `showChannelResult` 调用 `buildPosterHtml()` 生成对应主题的海报 HTML
- 在 layer 弹窗中渲染，AraleQRCode 动态生成 canvas 二维码

---

## 4. 修改文件清单

### 后端

1. **`application/admin/controller/Qrchannel.php`**
   - `create()` 方法：新增接收并校验 `poster_theme` 参数，写入数据库
   - `formatChannelRow()` 方法：返回数据中增加 `poster_theme` 字段

### 前端 — 移动端

2. **`public/assets/mobile/js/mobile-workbench-modern.js`**
   - 新增 `THEME_LABELS` 主题名称映射
   - 新增 `buildPosterHtml()` 统一海报 HTML 渲染函数
   - 新增 `buildThemeSelector()` 主题选择器 UI
   - 重写 `showChannelResult()` → 渲染完整海报卡片（替代旧的简单弹窗）
   - 修改 `openChannelCreator()` → 增加主题选择器，提交时传 `poster_theme`
   - 修改 `renderQrChannels()` → 渲染模板标签，卡片携带 `data-theme`
   - 修改"查看二维码"点击事件 → 传递 `theme` 参数

3. **`application/mobile/view/admin/index.html`**
   - 新增引用 `qr-poster-themes.css`

### 前端 — PC端

4. **`application/admin/view/index/chats.html`**
   - `openQrChannel()` 提交数据增加 `poster_theme: 'blue'` 默认值

### 新增文件

5. **`public/assets/css/qr-poster-themes.css`**（新建）
   - 统一海报结构样式（`.qr-poster`、`.qr-poster__*`）
   - 5 种颜色主题变量定义
   - 主题选择器样式（`.qp-theme-selector`、`.qp-theme-option`）
   - 管理列表模板标签样式（`.qr-theme-tag`）

### 数据库

6. **`install_disabled_20260512/qr_channel_mvp.sql`**
   - `wolive_qr_channels` 建表语句增加 `poster_theme` 字段
   - ALTER 补丁增加 `poster_theme` 字段

---

## 5. 数据结构变更

| 表名 | 字段名 | 类型 | 默认值 | 作用 |
|------|--------|------|--------|------|
| `wolive_qr_channels` | `poster_theme` | VARCHAR(20) | `'blue'` | 二维码海报主题标识 |

**允许值：** `blue` / `green` / `purple` / `orange` / `red`

**兼容性：** 已有数据中该字段为空时，前端和后端均回退为 `'blue'`（默认蓝色）。

---

## 6. 最短测试路径

### 测试一：创建蓝色模板二维码
1. 移动端打开客服工作台
2. 点击 **"+"** → **"生成接待二维码"**
3. 输入客户名称："张三"
4. 主题选择器默认选中"蓝色" → 保持默认
5. 点击"生成"
6. **预期：** 弹出蓝色主题海报，标题"在线咨询"，蓝色渐变背景，QR码居中显示

### 测试二：创建绿色模板二维码
1. 重复上述步骤，输入名称："李四"
2. 点击"绿色"主题色块
3. 点击"生成"
4. **预期：** 弹出绿色主题海报，布局与蓝色完全一致，仅配色为绿色系

### 测试三：确认排版一致性
1. 对比测试一和测试二的海报弹窗
2. **预期：** 标题位置、文案层级、QR码大小/位置、emoji位置、按钮位置完全相同

### 测试四：管理列表模板标签
1. 进入"二维码管理"面板
2. **预期：** 每个二维码卡片显示模板标签（如"蓝色"/"绿色"），颜色与主题对应

### 测试五：查看已保存二维码
1. 在管理列表中点击张三（蓝色）的"查看二维码"
2. **预期：** 弹出蓝色主题海报
3. 点击李四（绿色）的"查看二维码"
4. **预期：** 弹出绿色主题海报

### 测试六：其余主题覆盖
- 依次创建紫色、橙色、红色主题二维码
- 确认所有 5 种主题均能正常生成和查看

---

## 7. 风险说明

### 已确认
- ✅ 移动端创建二维码流程完整可用
- ✅ 5 种主题 CSS 使用 CSS 变量，无兼容性问题
- ✅ 后端 `poster_theme` 白名单校验，无注入风险
- ✅ 默认回退机制：未选择/字段为空时使用蓝色
- ✅ PC端 `chats.html` 创建二维码时默认传蓝色，不影响现有流程

### 仍需线上最终复验
- ⚠️ 数据库需执行 ALTER 添加 `poster_theme` 字段（或重建表）
- ⚠️ 移动端 layer 弹窗高度在极小屏幕（<360px 宽）下需确认海报完整显示
- ⚠️ AraleQRCode 库 (`arale-qrcode.js`) 必须已加载，否则 canvas 不渲染
- ⚠️ 旧数据（已有二维码）的 `poster_theme` 为空，前端回退为蓝色，但建议数据库层面 UPDATE 设默认值
