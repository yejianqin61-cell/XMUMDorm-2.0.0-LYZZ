# Task 02: 移动端 UI 适配

**优先级**: 🔴 P0 — 决定用户感知质量
**覆盖**: Safe Area (HIGH) + Hover→Active (HIGH) + 响应式断点 (MED)
**预估工期**: 3-4 天
**影响范围**: ~86 pages + ~60 components, 29 CSS 文件

---

## 一、现状回顾

### 好消息
- ✅ `--safe-top` / `--safe-bottom` CSS 变量已在 `index.css` 中定义
- ✅ `index.css` 已做移动优先设计：`@media (min-width:431px) { #root { max-width:430px } }`
- ✅ ~10 个文件已经在使用 safe-area CSS 变量（TabBar, TopBar, Layout, 部分页面）
- ✅ 103 处 @media 查询已覆盖 22 个 CSS 文件

### 待修复
- ❌ **60% 的页面未使用 `--safe-top/bottom`** — 固定定位元素会被灵动岛/底部横条遮挡
- ❌ **76 处裸 `:hover` 在 29 个文件中** — 移动端 Touch 无反馈
- ❌ **响应式断点偏大** (420px/520px) — 未覆盖 iPhone SE 375px + iPhone 14 390px

---

## 二、任务拆解

### C02-Task001: 全局 Safe Area 注入（0.5 天）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |
| **产出** | 所有页面自动获得 Safe Area 保护 |

**策略**: **CSS 变量已经定义，问题在于没有全局应用到 body/#root。用一条规则覆盖 80% 的场景，剩下的 20% 手动补。**

**Step 1: 扩展 `index.css` 的 Safe Area 变量**

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);     /* 新增：横屏 */
  --safe-right: env(safe-area-inset-right, 0px);   /* 新增：横屏 */

  /* 预计算组合值，减少 calc 重复 */
  --safe-pb: calc(var(--tabbar-height, 72px) + var(--safe-bottom) + 24px);
  --safe-pt: calc(var(--safe-top) + 12px);
}
```

**Step 2: body 全局 Safe Area Padding**

```css
body {
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
  padding-left: var(--safe-left);
  padding-right: var(--safe-right);
}
```

**Step 3: index.html 添加 viewport-fit**

```html
<!-- 修改前 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- 修改后 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

**验收标准**:
- [ ] `viewport-fit=cover` 在 index.html 中
- [ ] `--safe-left/right` 变量已添加
- [ ] body 自动获得 safe-area padding
- [ ] Chrome DevTools iPhone 14 Pro 模式: 内容不被灵动岛/横条遮挡

---

### C02-Task002: 逐文件 Safe Area 补全（1.5 天）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐⭐ |
| **预估** | 1.5 天 |
| **产出** | 17 个 fixed/absolute 组件文件全部适配 |

**策略**: body 的全局 padding 解决了 body 问题。但对于 `position: fixed` 的元素（FAB、BottomSheet、Toast、Modal），body 的 padding 管不到它们。需要逐文件补。

**需要适配的组件清单** (46 处 fixed/absolute+z-index 的 17 个文件):

| # | 文件 | 问题 | 修复方式 |
|---|------|------|----------|
| 1 | `components/TabBar.css` | ✅ 已适配 | 无需改动 |
| 2 | `components/TopBar.css` | ✅ 已适配 | 无需改动 |
| 3 | `components/Layout.css` | ✅ 已适配 | 无需改动 |
| 4 | `components/LevelUpModal.css` | ❌ fixed 全屏 Modal | `padding-top: var(--safe-top); padding-bottom: var(--safe-bottom)` |
| 5 | `components/LikeBurst.css` | ❌ absolute 粒子动效 | 检查是否溢出 viewport |
| 6 | `components/MerchantHeader.css` | ❌ fixed 顶部 | `top: var(--safe-top)` 或 `padding-top` |
| 7 | `components/ImagePreview.css` | ❌ fixed 全屏 Lightbox | `padding: var(--safe-top) 0 var(--safe-bottom)` |
| 8 | `components/Admin/AdminLayout.css` | ❌ fixed 侧边栏 | `padding-top: var(--safe-top)` |
| 9 | `pages/PostDetail.css` | ❌ fixed 底部评论框 | `padding-bottom: var(--safe-bottom)` |
| 10 | `pages/FoodDetail.css` | ❌ fixed 底部操作栏 | `padding-bottom: var(--safe-bottom)` |
| 11 | `pages/FoodReviewPublish.css` | ❌ fixed 底部提交 | `padding-bottom: var(--safe-bottom)` |
| 12 | `pages/Schedule.css` | ❌ fixed 顶部周选择器 | `top: var(--safe-top)` |
| 13 | `pages/TreeHole.css` | ❌ fixed 底部发帖 FAB | `bottom: calc(var(--safe-bottom) + Xpx)` |
| 14 | `pages/Clubs/Clubs.css` | ✅ 已适配 | 无需改动 |
| 15 | `pages/Diary.css` | ❌ fixed/absolute | 逐元素检查 |
| 16 | `components/TopBar.css` | ✅ 已适配 | 无需改动 |
| 17 | `context/Toast.css` | ❌ fixed 顶部 Toast | `top: var(--safe-top)` |

**验收标准**:
- [ ] 17 个文件全部检查，fixed/absolute 元素不被遮挡
- [ ] iPhone 14 Pro 模拟器: 灵动岛不遮挡任何 UI
- [ ] iPhone 14 Pro 模拟器: 底部横条不遮挡 Tab/Button/FAB
- [ ] 横屏模式: 左右 safe area 正常工作

---

### C02-Task003: Hover → Touch 友好改造（1 天）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐ |
| **预估** | 1 天 |
| **产出** | 76 处 hover 全部触摸友好 |

**策略**: 不是删除 `:hover`（桌面端还需要），而是包裹在 `@media (hover: hover)` 中 + 补充 `:active`。

**Step 1: 全局规则（一个规则解决 50% 的问题）**

在 `index.css` 添加:

```css
/* 仅在支持 hover 的设备（桌面端）启用 hover 效果 */
@media (hover: hover) {
  /* 所有 hover 在这里自然生效 */
}

/* 触摸设备：用 active 替代 hover */
@media (hover: none) {
  a:active, button:active, [role="button"]:active {
    opacity: 0.7;
  }
}
```

**Step 2: 29 个文件逐文件修复模式**

```css
/* 修改前 */
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* 修改后 */
@media (hover: hover) {
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
}
.card:active {
  transform: scale(0.98);  /* 触摸反馈 */
  opacity: 0.85;
}
```

**需要处理的 29 个文件清单** (按 hover 数量排序):

| 优先级 | 文件 | hover 数 | 处理策略 |
|--------|------|---------|----------|
| 先处理 | 9 个超过 3 处的文件 | 3-9 | 逐文件包裹 `@media (hover:hover)` + 加 `:active` |
| 后处理 | 20 个 1-2 处的文件 | 1-2 | 批量替换 |

**验收标准**:
- [ ] 所有 `:hover` 样式在 `@media (hover: hover)` 内
- [ ] 所有交互元素有 `:active` 触摸反馈
- [ ] 桌面端 hover 行为无退化
- [ ] 移动端点击按钮/链接有视觉反馈（非 hover 触发）

---

### C02-Task004: 响应式断点补全（1 天）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐ |
| **预估** | 1 天 |
| **产出** | 所有 iPhone/Android 手机完美显示 |

**当前断点**: 主要是 420px、520px
**目标断点**: 375px (SE) / 390px (iPhone 14) / 430px (Pro Max) / 768px (iPad Mini)

**Step 1: 扩展 `index.css` 全局断点**

现有代码已经很好地处理了 430px+ 场景:
```css
@media (min-width: 431px) {
  #root { max-width: 430px; ... }
}
```
这已经很好了——桌面端模拟手机宽度。Capacitor 中 WebView 宽度等于设备宽度，不需要这个。

**Step 2: 新增 CSS 工具类（Tailwind 风格）**

在 `index.css` 添加 Capacitor 环境检测:

```css
/* Capacitor 原生 App 环境 */
body.capacitor-native {
  /* 移除桌面端手机模拟器样式 */
}
body.capacitor-native #root {
  max-width: none;
  border-radius: 0;
  box-shadow: none;
}

/* 小屏手机 (iPhone SE) */
@media (max-width: 374px) {
  :root { --content-pad: 8px; }
}
/* 常规手机 (iPhone 14) */
@media (min-width: 375px) and (max-width: 429px) {
  :root { --content-pad: 12px; }
}
/* 大屏手机 (Pro Max) */
@media (min-width: 430px) and (max-width: 767px) {
  :root { --content-pad: 16px; }
}
/* 平板 */
@media (min-width: 768px) {
  :root { --content-pad: 24px; }
}
```

**Step 3: 验证 22 个 CSS 文件的现有 @media**

当前 103 处 @media 查询已覆盖 22 个文件，主要检查：
- 420px 断点 → 改为 430px（iPhone 14 Pro Max）
- 520px 断点 → 保留（平板/大屏）

**验收标准**:
- [ ] `--content-pad` CSS 变量随屏幕宽度变化
- [ ] iPhone SE 375px: 不溢出、不拥挤
- [ ] iPhone 14 390px: 体验最佳
- [ ] iPhone 14 Pro Max 430px: 利用大屏空间但不浪费
- [ ] iPad 768px+: 利用宽屏但不失真

---

## 三、修复验证清单

完成所有子任务后，用 Chrome DevTools 做移动端模拟验收：

| 页面 | iPhone SE 375px | iPhone 14 390px | Pro Max 430px | iPad 768px |
|------|:--:|:--:|:--:|:--:|
| 登录/注册 | | | | |
| 树洞瀑布流 | | | | |
| 树洞帖子详情 | | | | |
| 食堂首页 | | | | |
| 菜品详情+点评 | | | | |
| 广场首页 | | | | |
| 热搜详情 | | | | |
| 社团首页 | | | | |
| 二手列表 | | | | |
| 二手详情 | | | | |
| 一站通文章 | | | | |
| 课表周视图 | | | | |
| 日记 | | | | |
| 待办 | | | | |
| 信箱 | | | | |
| 我的空间 | | | | |
| 管理员后台 | | | | |
| Toast/Modal 弹窗 | | | | |

**验收视频**: 录屏 5 个核心页面 × 3 个设备 = 15 个截图 → 与 RN 版对比 → 确认 CSS 版更优。

## 四、完成定义 (DoD)

- [ ] `viewport-fit=cover` 已添加
- [ ] body 全局 Safe Area padding 生效
- [ ] 17 个 fixed/absolute 组件文件 Safe Area 补全
- [ ] 29 个 CSS 文件 hover→active 改造完成
- [ ] 4 级响应式断点 (375/390/430/768) 就绪
- [ ] 18 个核心页面在 4 种设备尺寸下通过验收
