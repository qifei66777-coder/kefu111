# 移动端二维码管理 — 从 PC 页面跳转改为移动端真实管理面板

> 代码已修复并提交，待线上复验。

---

## 1. 当前问题真实根因

### 原入口跳转路径
- **入口按钮**: `application/mobile/view/admin/index.html` 第 678 行  
  `<button type="button" data-action="qr-manage">二维码管理</button>`
- **JS 处理**: `public/assets/mobile/js/mobile-workbench-modern.js`（修改前第 272-276 行）

```javascript
// 修改前的代码
} else if (action === 'qr-manage') {
    closeActions();
    window.location.href = window.YMWL_ROOT_URL + '/admin/qrchannel/channelPage';
}
```

- **跳转目标**: PC 端控制器 `Qrchannel::channelPage()` → PC 模板 `application/admin/view/qrchannel/channel_list.html`

### 为什么会出现 PC 样式
- `channel_list.html` 通过 `{include file="public/header"/}` 引入 PC 管理后台的完整 header（含 PC 侧边栏、顶栏）
- 使用 Layui `table.render()` 渲染桌面端表格
- 虽然该模板有少量 `@media (max-width: 768px)` 适配，但本质是 PC 管理后台页面结构
- 手机访问时加载了整个 PC 后台框架（侧边栏 + 顶栏 + Layui 表格），不具备移动端管理体验

---

## 2. 最终采用的移动端方案

### 方案：移动端工作台内 Overlay 面板（与黑名单面板同模式）

点击「二维码管理」后，**不再跳转离开工作台**，而是在当前工作台内弹出一个全屏覆盖面板 `#MobileQrPanel`，展示移动端专属的卡片式二维码列表。

### 为什么选这个方案
1. **与已验证的黑名单 overlay 方案一致** — `#MobileBlacklistPanel` 已在 P0-1 中验证通过，同架构最稳定
2. **不离开工作台** — 用户点「返回」即可回到聊天列表，体验流畅
3. **完全复用现有 API** — 直接调用 `/admin/qrchannel/channelList` JSON 接口，不需要新增控制器
4. **不影响 PC 端** — PC 端 `channel_list.html` 完全不动

---

## 3. 数据复用说明

### 复用的接口
- **列表数据**: `GET /admin/qrchannel/channelList` → `Qrchannel::channelList()`
  - 返回字段：`remark`（名称）、`scan_count`（扫码次数）、`last_scan_time`（最近扫码时间）、`created_at`（创建时间）、`qr_url`（链接）、`status`（启用/禁用）、`one_to_one`（一客一码）
- **创建渠道**: `POST /admin/qrchannel/create` → `Qrchannel::create()`
- **查看二维码**: 复用已有 `showChannelResult()` 函数 + `AraleQRCode` 库
- **复制链接**: 复用已有 `copyText()` 函数

### 未使用 / 已使用状态判断
- `status === 0` → **已禁用**（红色标签）
- `status === 1 && scan_count > 0` → **已使用**（绿色标签）
- `status === 1 && scan_count === 0` → **未使用**（灰色标签）

基于现有 `scan_count` 字段判断，无扫码记录即为未使用，有扫码记录即为已使用。

---

## 4. 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `application/mobile/view/admin/index.html` | 新增 `#MobileQrPanel` HTML 面板（含返回按钮、标题、新建按钮、列表容器） |
| `public/assets/mobile/js/mobile-workbench-modern.js` | 1. 删除 `window.location.href = '/admin/qrchannel/channelPage'` 跳转<br>2. 新增 `showQrPanel()` / `hideQrPanel()` / `loadQrChannels()` / `renderQrChannels()` 函数<br>3. 新增返回、查看二维码、复制链接、新建的事件绑定<br>4. `showTab()` 中自动关闭 QR 面板<br>5. 新建渠道后自动刷新列表 |
| `public/assets/mobile/css/mobile-workbench-modern.css` | 新增 `.mobile-qr-panel` 全屏覆盖面板样式、`.mobile-qr-card` 卡片样式、`.mobile-qr-card-status` 状态标签样式、`.mobile-qr-card-actions` 操作按钮样式 |

### 未修改的文件（确认不动）
- `application/admin/controller/Qrchannel.php` — PC 控制器不动
- `application/admin/view/qrchannel/channel_list.html` — PC 模板不动
- `public/assets/js/arale-qrcode.js` — 二维码库不动
- 黑名单相关代码 — 不动
- H5 访客聊天页 — 不动
- 员工聊天页 `talk.html` — 不动
- `mochat.js` / `mchat.js` — 不动

---

## 5. 最短线上复验步骤

### 测试 1: 二维码管理面板
1. 手机打开移动端客服工作台：`/mobile/admin/index`
2. 点击右上角蓝色 **「+」** 按钮
3. 在弹出菜单中点击 **「二维码管理」**
4. **预期**: 不跳转 PC 页面，在当前工作台内弹出卡片式二维码管理面板
5. 确认：页面标题 "二维码管理"，左上角有 "← 返回" 按钮，右上角有 "+ 新建" 按钮

### 测试 2: 查看列表信息
1. 在面板中查看二维码卡片
2. **预期每张卡片展示**:
   - 二维码名称（客户名称）
   - 状态标签：未使用（灰色）/ 已使用（绿色）/ 已禁用（红色）
   - 扫码次数
   - 创建时间
   - 最近扫码时间
   - 一客一码模式标识（如有）

### 测试 3: 查看二维码弹窗
1. 点击任意卡片的 **「查看二维码」** 按钮
2. **预期**: 弹出 Layui 弹窗，完整显示二维码，不裁切
3. 弹窗内有链接文字和 **「复制链接」** 按钮

### 测试 4: 复制链接
1. 点击任意卡片的 **「复制链接」** 按钮
2. **预期**: 显示 "链接已复制" 提示

### 测试 5: 新建二维码
1. 点击面板右上角 **「+ 新建」** 按钮
2. 填写客户名称，点击 "生成"
3. **预期**: 生成成功后弹出二维码预览，同时卡片列表自动刷新

### 测试 6: 返回聊天
1. 点击面板左上角 **「← 返回」** 按钮
2. **预期**: 面板关闭，回到聊天列表，蓝色 "+" 按钮恢复显示

### 测试 7: Tab 切换
1. 打开二维码管理面板后，点击底部 "黑名单" 或 "我的" Tab
2. **预期**: QR 面板自动关闭，切换到对应 Tab

---

## 6. 表述规范

> 代码已修复并提交，待线上复验。

以上修改均为前端代码层变更，未在线上真实浏览器环境中验证。需在服务器部署后，通过手机浏览器实际操作上述复验步骤确认功能正常。
