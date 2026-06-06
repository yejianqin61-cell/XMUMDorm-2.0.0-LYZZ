# 树洞页面 UI 设计拆解（Web 版）

项目：Dorm · XMUMDorm-2.0.0-LYZZ  
适用范围：Web 前端树洞首页（`frontend/src/pages/TreeHole.jsx` + `TreeHole.css` + `TreeHoleToolbar.jsx/.css`）  
编写目的：将现有 Web 树洞的 **布局方案、视觉语言、组件结构、交互状态** 抽象成“可复刻”的设计文档，用于指导移动端 App（RN/Flutter/原生）重做同风格 UI。

---

## 1. 页面定位与整体风格

树洞页的核心视觉关键词是：

- **“类 iOS”**：字体栈、圆角、阴影、分组背景、分割线、强调色等均接近 iOS HIG。
- **“玻璃拟态 + 全图卡片”**：列表卡片优先展示图片作为背景，叠加玻璃层与渐变遮罩，在底部放标题/内容与互动信息。
- **“轻、透、柔”**：大量使用半透明白底（`rgba(255,255,255,0.7~0.92)`）+ blur，边框极细（0.5~1px）。

全局设计变量在 `frontend/src/index.css` 中定义，树洞相关尤其使用：

- `--post-ios-font`：统一字体栈（Inter + Noto Sans SC + 系统字体）
- `--post-ios-bg-grouped`：分组背景（近 iOS grouped）
- `--post-ios-accent` / `--accent`：强调色（目前为绿色系 `#10b981`）
- `--tabbar-height`、`--safe-bottom`：为底部 TabBar 与安全区预留空间

---

## 2. 信息架构（Information Architecture）

树洞首页分为 4 个层级区域：

1. **顶部工具区（Toolbar）**
   - 品牌标题：`XMUM Dorm` + tagline `Discover campus life`
   - 右侧操作：搜索（可展开输入框）/ 语言切换（下拉）/ 通知（带未读 aura）
2. **标签栏（Tag Bar）**
   - 横向滚动标签 pills（可选中筛选）
   - “管理标签”入口（弹出 TagPanel）
3. **内容区（Masonry Feed）**
   - 两列瀑布流（右列向下错位 32px，形成“错落”）
   - 卡片分两种：**有图卡**（主流）/ **无图卡**（更扁平）
   - Skeleton、加载更多、错误提示
4. **右下角浮动操作（FAB Cluster）**
   - 主 FAB：“+ 发帖”（管理员显示角标“公告”）
   - 次按钮：“回到顶部”

---

## 3. 布局方案（Layout / Grid）

### 3.1 页面内边距与底部留白

内容容器 `.treehole-content`：

- 上：`padding-top: 10px`
- 左右：`padding: 0 12px`
- 下：`padding-bottom: calc(tabbar + safeBottom + 20px)`

目的：避免底部 TabBar 覆盖内容，让列表末尾仍可读/可点。

### 3.2 两列瀑布流与错位

`.treehole-grid`：

- `display: flex; gap: 12px; align-items: flex-start;`
- 两个 `.treehole-column`：`flex: 1; gap: 12px;`
- 右列 `.treehole-column-right`：`padding-top: 32px`

目的：用很低成本营造“瀑布流错落”的高级感，不依赖真正 Masonry 算法也能看起来更像设计稿。

> 备注：JS 里还保留了“虚拟瀑布流窗口”能力，但默认关闭（稳定性优先）。

---

## 4. 视觉规范（Visual Specs）

### 4.1 背景与层次

树洞页本身可切换 light 模式（`.treehole-page--light`），用 **淡色径向渐变** 叠加纯色底：

- 背景不是纯白，而是带轻微青绿/薄荷渐变，提升“空气感”。

### 4.2 卡片（有图玻璃卡）

`.treehole-glass-card` 关键属性：

- **圆角**：`24px`（明显大圆角）
- **边框**：`1px solid rgba(226,232,240,1)`（接近 slate-200）
- **背景**：`rgba(255,255,255,0.92)`（带透明）
- **阴影**：`0 24px 80px rgba(2,6,23,0.10)`（大而柔）
- **交互**：
  - hover：`translateY(-1px) scale(1.01)` + `brightness(1.03)`
  - active：`scale(0.985)`

卡片的媒体区 `.treehole-glass-media`：

- **比例**：`aspect-ratio: 4/5`（竖向略长，适合移动端瀑布流）
- 图片加载前默认对图做 blur：`.treehole-glass-img` 初始 `filter: blur(14px)` + scale
- 加载完成 `.is-loaded`：blur 归零、scale 回归，形成“由糊到清”的质感动效

覆盖层：

- `.treehole-glass-blur`：全局半透明暗层 + blur，增强文字可读性
- `.treehole-glass-bottom-gradient`：底部 60% 渐变遮罩（底更黑，上渐透明）

文字区 `.treehole-glass-text`：

- `font-size: 13px; font-weight: 650; line-height: 1.35;`
- `-webkit-line-clamp: 3`（最多三行）
- 白字 + text-shadow，保证在图上可读

交互信息 `.treehole-glass-actions`：

- 字号 `12px`，白色 0.9 透明度
- 图标与数字间距 `6px`，整体 gap `14px`

### 4.3 卡片（无图扁平卡）

`.treehole-glass-card--noimg`：

- 仍然保持圆角与边框体系，但内容变为“头像 + 作者 + 三行文本 + 行内 actions”
- 文案颜色从白字切换为深色（`rgba(15,23,42,0.88)`）
- actions 颜色偏蓝（`rgba(0,91,172,0.92)`），强调可点击性

### 4.4 Skeleton 与加载态

Skeleton 采用：

- 同样的 24px 圆角卡片容器
- shimmer 动画（线性渐变横向扫过）
- 顶部 pill（模拟“头像 + 作者”）
- 底部 line + actions chip（模拟文案与互动区）

目的：首屏“看起来像真内容”，减少白屏焦虑。

### 4.5 顶部工具栏（品牌 + 操作）

`TreeHoleToolbar.jsx` 的布局（移动优先）：

- 左侧：品牌（大标题 `text-2xl font-bold`）+ tagline（12px 灰）
- 右侧：三个圆形 icon button（搜索、语言、通知）
  - 外观：`rounded-full` + 半透明白底 + 轻边框 + blur
  - 搜索按钮可展开成输入框（spring 动画），点击外部收起

通知 bell 是“aura”设计（`TreeHoleToolbar.css`）：

- 不同未读类型（social/chat）呈现不同颜色与动画（swing/heartbeat）
- 角标 badge 使用非纯红，偏珊瑚/莓红渐变，带 bounce 动画

### 4.6 标签栏（Tag Bar）

标签栏要点：

- **横向滚动隐藏滚动条**
- 两侧用 mask 做渐隐（`mask-image`），看起来更“高级”
- 标签 pill：小圆角/半透明/细边框；选中态更“重”（通常是深色实底或更强对比）

---

## 5. 关键交互（Interaction Rules）

### 5.1 搜索

- 默认收起为 icon
- 点击展开输入框并自动 focus
- 点击外部区域关闭
- Enter 提交跳转到搜索页

### 5.2 标签筛选

- 点击某标签：切换 selectedSlug，列表刷新
- 再点同一标签：取消筛选回到全部
- 有“管理标签栏”弹层：把标签加入/移出 top bar（对登录用户生效）

### 5.3 列表性能与稳定性

- 首屏只取 `PAGE_SIZE=10`，显示后后台预取更多页（减少首屏 TTI）
- coarse pointer（手机）会提前 warm 图片缓存，减少滚动空洞
- 虚拟瀑布流能力存在但默认关闭（线上稳定性优先）

### 5.4 浮动按钮（FAB）

- 主 FAB：固定右下角，避开 TabBar 与安全区
- 次按钮（回顶）：与 FAB 并列，尺寸略小、白玻璃底
- 管理员在 FAB 上显示红色 pill 角标“公告”

---

## 6. 移动端复刻建议（从 Web 到 RN 的翻译要点）

> 以下是为了你 RN 重做树洞 UI 时“像 Web 一样”，需要坚持的关键点。

### 6.1 必须保留的“识别度”元素

- 两列布局 + **右列下移 32px** 的错位
- 卡片大圆角（≈24）+ 轻边框 + 大而柔的阴影
- 有图卡：底部渐变遮罩 + 白字 + 3 行截断
- 图片加载：从 blur 到清晰的过渡
- 顶栏三圆形按钮（搜索可展开）+ 通知 aura（至少保留 badge/颜色）

### 6.2 可适当简化的部分

- Web 的 hover 行为（移动端不需要）
- mask 渐隐（RN 可以先不做，或用渐变遮罩替代）
- 复杂 aura 动画（先实现颜色态 + badge，动画后补）

### 6.3 建议的 RN 组件拆分（对齐 Web 结构）

- `TreeholeToolbar`：品牌区 + 搜索展开 + 语言菜单 + 通知按钮
- `TagBar`：横向滚动 pills + 管理入口
- `MasonryTwoColumn`：左右两列渲染 + 右列 offset
- `PostGlassCard`：有图卡（Image + blur overlay + bottom gradient + text/actions）
- `PostTextCard`：无图卡
- `FabCluster`：发帖 + 回顶
- `SkeletonCard`：加载态一致化

---

## 7. 参考实现文件（代码定位）

- 页面：`frontend/src/pages/TreeHole.jsx`
- 样式：`frontend/src/pages/TreeHole.css`
- 顶栏/标签：`frontend/src/components/TreeHoleToolbar.jsx`、`frontend/src/components/TreeHoleToolbar.css`
- 标签管理弹层：`frontend/src/components/TreeHoleTagPanel.jsx`
- 布局注入 FAB：`frontend/src/components/Layout.jsx`（`treehole-fab`、`treehole-top`）

