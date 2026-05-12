# 总后台移动端交付收口修复报告

> 生成时间：2026-05-12  
> 状态：代码已修复并提交，待线上拉取后复验

---

## 1. P0-1：移动端重复快捷入口卡片

### 真实来源模板

`application/platform/view/layout/default.html` 第 647–659 行

```html
{volist name="menu" id="vo"}
    {if condition="$vo"}
        <div class="child-menu" data-url="{:$vo['route']}">
            {volist name="vo.children" id="i"}
                <a class="{if condition="$route == $i['route']"}active{/if}"
                   href="{:url($i['route'])}">
                    <span>{$i['name']}</span>
                </a>
            {/volist}
        </div>
    {/if}
{/volist}
```

这段模板在 `<main>` 区域内遍历 **所有顶级菜单**，为每个栏目生成一个 `.child-menu` 卡片，包含该栏目的子链接。

### 为什么会在「客服系统」页面出现其他栏目的入口

桌面端 CSS 规则 `body.pf-modern .child-menu { display: block; }` 将所有 `.child-menu` 都设为可见。在 PC 端有侧边栏导航，这些卡片作为二级快捷入口有一定价值。但在移动端，顶部已有一级栏目导航（数据中心、账户管理、客服系统、设置），再在正文中重复堆叠所有栏目的二级入口是冗余的。

底部 JS（第 728 行）`$(".child-menu").find('.active').parent().show()` 原本只让"包含当前活跃链接的 child-menu"显示，但被桌面 CSS `display: block` 覆盖，导致全部可见。

### 修复方式

在 `default.html` 的 `@media (max-width: 900px)` 媒体查询内，将 `.child-menu` 默认隐藏：

```css
body.pf-modern .child-menu {
    display: none;     /* 移动端默认隐藏所有子菜单卡片 */
    border-radius: 12px;
    padding: 8px 10px;
    margin-bottom: 10px;
}
```

不使用 `!important`，因此底部 JS 的 `.show()` 设置的内联 `style="display:block"` 可以覆盖此规则，只展示当前活跃栏目的子菜单。

### 手机端现在应如何显示

- 点击顶部「客服系统」→ 正文只显示客服系统的子菜单入口 + 客服系统管理内容
- 点击顶部「账户管理」→ 正文只显示账户管理的子菜单入口 + 账户管理内容
- 点击顶部「设置」→ 正文只显示设置的子菜单入口 + 设置页内容
- 其他栏目的入口卡片不再出现

### PC 为什么不受影响

`display: none` 写在 `@media (max-width: 900px)` 内，PC 端（宽度 > 900px）不会命中此媒体查询，桌面端 `display: block` 仍然生效。

---

## 2. P0-2：添加客服系统按钮样式错乱

### 根因

`application/platform/view/app/index.html` 中的页面头部 `.pf-page-header` 使用 `display: flex; flex-wrap: wrap`，其子元素 `.pf-header-right` 也使用 `display: flex; flex-wrap: wrap`。

在手机端窄屏下，配额标签、搜索栏、添加按钮三者挤在同一行：
- 搜索输入框宽度 `180px` 占据大量空间
- 按钮被 flex 容器压缩
- 「+ 添加客服系统」文字被迫换行为两行
- 按钮变形、高度不自然

### 修改文件

`application/platform/view/app/index.html`

### 具体 CSS / 布局调整

在页面 `<style>` 中添加移动端媒体查询：

```css
@media (max-width: 900px) {
    .pf-page-header {
        flex-direction: column;
        align-items: stretch;
    }
    .pf-header-right {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
    }
    .pf-search-bar { width: 100%; }
    .pf-search-bar form { width: 100%; }
    .pf-search-bar input { width: 100% !important; flex: 1; min-width: 0; }
    .pf-btn-primary {
        white-space: nowrap;
        text-align: center;
        justify-content: center;
        width: 100%;
    }
    .pf-table { font-size: 12px; }
    .pf-table thead th,
    .pf-table tbody td { padding: 10px 8px; }
    .pf-domain-group { flex-direction: column; gap: 6px; }
    .pf-domain-input { max-width: none !important; width: 100%; }
    .pf-actions { gap: 4px; }
    .pf-btn-act { padding: 0 8px; font-size: 11px; }
}
```

### 为什么手机端不会再换行

- `.pf-page-header` 改为 `flex-direction: column`，标题和操作区纵向排列
- `.pf-header-right` 也改为纵向排列，配额、搜索、按钮各占一行
- 按钮加 `white-space: nowrap; width: 100%`，文字不换行、独占一行
- 搜索输入框 `width: 100%`，充分利用屏宽
- 同时优化了表格和操作按钮在窄屏下的布局

---

## 3. P0-3：总后台图片上传不可用

### 总后台图片上传入口清单

| 序号 | 页面 | 模板文件 | 上传按钮 | 上传接口 | 使用库 |
|------|------|----------|----------|----------|--------|
| 1 | 客服系统 > 编辑/添加 | `app/edit.html` | `.upload-btn` (LOGO图片) | `platform/upload/image` | plupload |
| 2 | 设置 > 系统设置 | `setting/index.html` | `.upload-btn` (系统LOGO) | `platform/upload/image` | plupload |
| 3 | 设置 > 系统设置 | `setting/index.html` | `.mp_verify` (微信验证文件) | `platform/upload/file` | plupload |
| 4 | 设置 > 系统设置 | `setting/index.html` | `.upload-passport-btn` (登录背景图) | `platform/upload/image` | plupload |
| 5 | 插件管理 | `addons/index.html` | WebUploader 组件 | 独立接口 | WebUploader |

### 本次重点修复

**序号 1–4（所有 plupload 上传入口）**

### 真实根因

**`plupload.full.min.js` 库文件缺失。**

模板 `common/meta.html` 第 24 行引用：
```html
<script src="__script__/platform/plupload.full.min.js?v=__lkversion__"></script>
```

但 `public/assets/js/platform/` 目录下**不存在**此文件。浏览器加载该脚本时返回 404，导致全局 `plupload` 对象未定义。

jQuery 插件 `.plupload()` 方法（`common.js` 第 262–330 行）在执行时检查：
```javascript
if (typeof plupload !== 'object') {
    throw '缺少plupload上传组件...';
}
```

抛出未捕获异常，上传初始化全部失败。所有依赖 plupload 的上传按钮点击无反应。

### 涉及文件

| 文件 | 角色 |
|------|------|
| `public/assets/js/platform/plupload.full.min.js` | **新增** - plupload 2.3.6 库文件 |
| `application/platform/view/common/meta.html` | 引用 plupload 的 `<script>` 标签（无需修改） |
| `public/assets/js/platform/common.js` | jQuery `.plupload()` 插件实现（无需修改） |
| `application/platform/controller/Upload.php` | 后端上传控制器 - 接收 `file` 字段、校验、返回 JSON（无需修改） |

### 具体修复方式

下载 plupload 2.3.6（与代码注释中引用的 2.3.4 向后兼容）到正确路径：

```
public/assets/js/platform/plupload.full.min.js  (125,587 bytes)
```

### 上传链路确认

完整链路（以 LOGO 上传为例）：

1. **前端按钮**: `app/edit.html` → `<a class="upload-btn">上传图片</a>`
2. **JS 初始化**: `$('.upload-btn').plupload({ url: "{:url('upload/image')}" })`
3. **plupload 绑定**: `common.js` 中 `pluploadInit()` 为按钮创建 plupload 实例
4. **文件选择**: plupload 的 `FilesAdded` 事件触发 `uploader.start()`
5. **上传请求**: POST 到 `/platform/upload/image`，字段名 `file`
6. **后端处理**: `Upload::image()` → `request()->file("file")` → 校验(5MB, jpg/png/gif/jpeg) → 移至 `public/upload/images/`
7. **返回 JSON**: `{code: 0, data: {url: "/upload/images/xxx.jpg"}}`
8. **前端回调**: `success` 回调解析 JSON → 填入 `input[name=logo]` → 更新 `.logo-preview` 图片

### 代码已确认

- 后端控制器 `Upload.php` 逻辑完整，接口可用（不继承 Base，无认证拦截，但平台后台环境下通过 session 保护）
- 前端 jQuery 插件 `.plupload()` 逻辑完整，字段名 `file` 与后端一致
- 返回格式 `{code, msg, data: {url}}` 与前端回调一致

### 仍需线上验证

- plupload.full.min.js 能否被浏览器正常加载（无 404）
- 上传请求能否到达后端（无 CORS/CSP 拦截）
- `public/upload/images/` 目录是否存在且有写权限
- 上传后图片能否正常回填预览
- 插件管理页的 WebUploader 上传（序号 5）不在本次修复范围

---

## 4. 修改文件清单

1. `application/platform/view/layout/default.html`
   - 移动端媒体查询中 `.child-menu` 添加 `display: none`，只显示当前活跃栏目的子菜单

2. `application/platform/view/app/index.html`
   - 添加 `@media (max-width: 900px)` 响应式样式：页面头部纵向排列、按钮不换行、搜索栏全宽、表格适配窄屏

3. `public/assets/js/platform/plupload.full.min.js`
   - **新增文件** - plupload 2.3.6 上传组件库

---

## 5. 最短线上复验步骤

### 测试 A：客服系统栏目正文是否干净

1. 手机浏览器打开总后台管理中心
2. 点击顶部导航「客服系统」
3. **预期**：直接看到客服系统管理内容（标题、可创建数量、搜索、列表），不再看到"我的账户/账户列表/新增子账户"、"我的应用/回收站"、"系统设置/上传设置/版本更新"三组白色入口卡片
4. 返回点击「账户管理」
5. **预期**：只看到账户管理相关子菜单和内容
6. 返回点击「设置」
7. **预期**：只看到设置相关子菜单和内容

### 测试 B：添加客服系统按钮

1. 手机端打开总后台「客服系统」页面
2. 查看页面头部区域
3. **预期**：
   - 「可创建 无限制」独占一行
   - 搜索框 + 搜索按钮占一行，输入框填满可用宽度
   - 「+ 添加客服系统」按钮独占一行，文字完整不换行、蓝色背景
4. PC 端访问同页面
5. **预期**：布局与之前一致（横向排列）

### 测试 C：图片上传

1. 手机或 PC 打开总后台「客服系统」页面
2. 点击某客服系统的「编辑」按钮
3. 在弹出的编辑表单中找到「LOGO图片URL」区域
4. 点击「上传图片」按钮
5. **预期**：弹出文件选择器
6. 选择一张图片
7. **预期**：
   - 图片上传成功
   - URL 自动填入输入框
   - 下方预览区显示上传的图片
8. 如上传失败，检查浏览器 Console 是否仍有 plupload 404 错误

> 代码已修复并提交，待线上拉取后复验。线上仍需按清单逐项复验。
