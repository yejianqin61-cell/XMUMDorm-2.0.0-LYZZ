# Web 端设计令牌、品牌资产与视觉语言现状盘点

**日期**：2026-09-30
**性质**：新 App 设计的前置事实输入（Lead 亲自盘点）
**为什么必须做**：所有者已定「Android 与 iOS 并重、各自最优，**共享后端与设计令牌层**，不求两端 UI 对齐」。因此新 App 的令牌体系必须先知道 Web 侧到底有什么、能不能共享、共享哪一层。

**范围界定**：本文**只盘点事实**，不提出 App 的设计主张。设计主张在《设计哲学提案》中另行给出。

> ## ⚠️ 所有者已裁决（2026-10-01）：品牌调色板**不再两端共享**
>
> 本文第 5 行的出发点包含"**共享设计令牌层**"。所有者 2026-10-01 的追加裁决把**品牌调色板**从共享范围中拿了出去：
>
> > **「品牌色，主色调还需要定，不能照搬 Web 的设计。」**
>
> **依据（本文实测 + 后续机械判定）**：Web 品牌蓝 `#4da7ff` 作文字 on 白 **2.53:1**、承载白字 **2.53:1**，两端都不达 4.5:1 —— 照搬它连本项目自己的尺子都过不了。另实测出 Web 调色板把辅助色与状态色放在同一色相（三对间距 5.3° / 6.7° / 21.1°），属结构性缺陷。
>
> **本文的全部事实仍然有效**（265 个令牌、无暗色、695 处硬编码、RetroUI 迁移在飞、`resources/icon.png` 品牌标识仍在等），但**"因此 App 应沿用 Web 的品牌 Foundation 层"这一推论作废**。
>
> 取而代之：[App品牌主色提案](../design/App品牌主色提案.md)（6 个候选 / 9 条门 / 推荐靛蓝 Indigo H≈272）+ `scripts/brand-ramp.js`。
> **双端仍然共享的是**：后端、数据契约、纯逻辑与常量（`shared/{api,constants,utils,config,query}`）、以及**品牌标志与文案语气**。

---

## 一、Web 的令牌体系：存在，且结构完整

`frontend/src/styles/tokens.css`（5,755 B）+ 89 个 CSS 文件中的变量定义。

| 指标 | 实测 |
|---|---|
| 全前端 CSS 文件 | 89 |
| 自定义属性定义（去重） | **265 个** |
| `var(--…)` 使用次数 | **1,680 次** |
| 令牌分层 | **三层：Foundation → Semantic → Module/Legacy** |

`tokens.css` 的分组（原文注释）：

```
Foundation: brand palette      ← 品牌原始色阶
Foundation: neutrals           ← 中性色阶
Semantic: backgrounds          ← 语义：背景
Semantic: text                 ← 语义：文字
Semantic: borders              ← 语义：描边
Semantic: brand and state      ← 语义：品牌与状态
Module accent                  ← 按模块的强调色
Module accent text             ← 强调色的深色变体（Tag/Badge 用）
Typography / Spacing / Radius / Shadows / Motion / Layout / Layering
Legacy compatibility           ← 带 @deprecated 的旧变量桥接层
```

**结论**：这与一份设计宪法通常会要求的「六组令牌」高度重合，说明 Web 侧已经有可用的令牌骨架，**不是从零开始**。

### 1.1 品牌调色板（可共享的基础层）

```css
--color-blue-400:     #4da7ff      --color-blue-100:     #e8f4ff
--color-mint-400:     #73d9b3      --color-mint-100:     #e8fbf3
--color-apricot-400:  #ffb86c      --color-apricot-100:  #fff4e6
--color-pink-400:     #ff8fb1      --color-pink-100:     #fff0f5
--color-success-500:  #39c58d      --color-warning-500:  #ffb547
--color-danger-500:   #f36d6d      --color-danger-100:   #fdecec
--color-slate-900:    #20304a      --color-slate-700:    #42526b
--color-slate-500:    #6f8097      --color-slate-400:    #9aa8bc
--color-slate-200:    #d9e4f0      --color-slate-100:    #eaf0f6
--color-paper: #ffffff   --color-page: #f7fafc
```

即：**冷蓝为主品牌色 + 薄荷/杏/粉三色辅助 + slate 中性色系**，整体是**亮底、柔和、低对比**的调子。

### 1.2 字体

| 令牌 | 值 |
|---|---|
| `--font-family-display` | `"Source Han Serif SC", "Noto Serif SC", "Songti SC", serif` |
| `--font-family-body` | `"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif` |
| `--font-family-ui` | `"Inter", "PingFang SC", "Noto Sans SC", sans-serif` |

**仓库内不存在任何字体文件**（无 `.ttf/.otf/.woff/.woff2`）。即：Web 完全依赖**系统字体**，且**标题用衬线、正文用无衬线**。

> 对 App 的直接含义：`Source Han Serif SC` / `PingFang SC` 在 Android 上**不存在**（Android 无苹方），衬线标题在 Android 会退化。这一条**不能照搬**，iOS/Android 必须各自解决字阶与字体回退。

---

## 二、Web 的三项短板（都会影响"共享令牌"的可行性）

### 2.1 暗色模式：完全不存在

| 检测项 | 结果 |
|---|---|
| `prefers-color-scheme` | **0 处** |
| `[data-theme]` / `.dark` 选择器 | **0 处** |

**结论**：Web 是**纯亮色**。若新 App 采用"暗色优先"，将**必然与 Web 分叉**——这不是缺陷，但必须在提案里明说代价，并由所有者确认接受。

### 2.2 令牌化并未完成：Web 侧仍有 695 处硬编码色值

| 指标 | 实测 |
|---|---|
| CSS 中 `#hex` 总计 | **695 处** |
| 分布 | **64 个文件** |
| 最重 | `Clubs.css` 122 处、`SquareHome.css` 34、`Materials.css` 32、`tokens.css` 30（基础调色板本身，合理）、`MyZone.css` 28、`ProfileEdit.css` 28 |

**结论**：Web 自己的令牌化率不高（大量页面样式仍写死色值）。所以"App 共享 Web 令牌"**只能共享 Foundation + Semantic 两层**，**不能把 Web 的实现习惯带进 App**——否则等于把 695 处硬编码色值的问题复制到 App（旧 App 的同类指标是 1437 处）。

### 2.3 Web 正在迁移到 Neo-Brutalism（在途、未提交）

仓库中存在**尚未提交**的迁移材料：

- `docs/retroui-rollout-plan.md`（21 KB）
- `frontend/temp_retroui/`（625 个文件，48 MB）

计划原文（节选）：

> 原则：**复用复用再复用。除非 RetroUI 没有，绝不自己手写。**
> 基准：Phase 0 已完成 Button / Card / Badge / Modal 四件套替换。

**结论**：Web 的**组件层正在被替换为第三方 Neo-Brutalism 组件库（RetroUI）**，其主张是**硬描边 + 硬偏移阴影 + 高对比色块**。

---

## 三、品牌资产现状（App 会用到）

### 3.1 品牌标识（已亲自查看 `resources/icon.png`，1254×1254）

现有品牌标识是一个 **3D 渲染的可爱吉祥物**，画面要素：

| 要素 | 描述 |
|---|---|
| 主体 | 奶白色圆润无四肢躯干的人物（"团子"形），头部即身体 |
| 发/角 | 白色蓬松短发，头顶两侧各一枚**金色小角**（圆锥形） |
| 面部 | **黑色圆框眼镜**、大而圆的眼睛、粉色腮红、微笑、单眼皮 |
| 服装 | 黑色连帽卫衣，胸前抽绳与金属头 |
| 配件 | 背着一只**橙色篮球** |
| 姿态 | 单手托腮（思考状），身体微微侧转 |
| 背景 | **蓝 → 薰衣草紫 → 粉** 的对角渐变 |
| 图形语言 | 圆角方形画布（iOS 式 squircle）、**柔和 3D 体积光、无描边** |

**这与 1.1 的品牌调色板一致**（蓝 + 粉 + 杏/金）。

### 3.2 资产文件位置

| 路径 | 内容 |
|---|---|
| `resources/icon.png` | 品牌标识源文件，1254×1254，1.7 MB |
| `icons/` | Web/PWA 光栅图标 7 个（48/72/96/128/192/256/512，均为 `.webp`） |
| `frontend/public/icons/` | `appIcon.png`(1.7 MB)、`appIcon-216.png`、`icon-192.png`、`icon-512.png`、`this.png`、`this-216.png` |
| `public/` | `manifest.webmanifest`、`privacy-policy.html`、`products/` |

> 旧 Capacitor 工程中的 `assets/android-icon-*.png`、`splash` 等**已随 `frontend-app/` 与 `android/` 删除**（归档于 `app-legacy-v1`），**但源标识 `resources/icon.png` 仍在**，可重新派生全部 App 图标与启动图。

### 3.3 ⚠️ 品牌性格与 Web 当前方向存在冲突

| | 品牌标识传达的 | Web 正在迁移的 RetroUI 传达的 |
|---|---|---|
| 性格 | 可爱、温暖、亲和、"邻座同学" | 强硬、醒目、反叛、高对比 |
| 图形语言 | 柔和 3D、无描边、大圆角、渐变 | 2px 硬描边、硬偏移阴影、纯色块 |
| 色彩 | 低饱和柔和（`#4da7ff` / `#ff8fb1`） | 高对比撞色 |
| 圆角 | 极大（squircle） | 小圆角或直角 |

**这是本次盘点最重要的发现**：品牌资产与 Web 的组件库方向**在性格上是相反的**。

**这不构成对 Web 的否定**（Web 保持现状是你已定的范围），但它意味着：

1. **App 不能"沿用 Web 的视觉语言"**——两者本就在分叉；
2. **App 必须自己回答"品牌性格如何转译为界面"**，尤其要处理"可爱吉祥物"与"原生 App 的克制感"如何共存；
3. 若 App 与 Web 视觉差异过大，**品牌一致性**会成为需要所有者拍板的问题。

---

## 四、对 App 设计的直接含义（事实层，不含主张）

| 项 | 可共享性 | 说明 |
|---|---|---|
| 品牌调色板（Foundation 层） | ✅ **应当对齐** | blue/mint/apricot/pink + slate，是品牌资产的一部分 |
| 语义层（Semantic）命名思路 | ⚠️ **可借鉴，不宜照搬** | Web 语义层绑定了亮色与 CSS 变量语法；App 需要暗色优先的实现 |
| 字体方案 | ❌ **不可照搬** | Web 依赖 iOS/Windows 系统字体，`PingFang SC` 在 Android 不存在；且衬线标题在 Android 会退化 |
| 组件层 | ❌ **不可共享** | Web 正在被 RetroUI（Neo-Brutalism）替换；App 需要自身平台规范下的组件 |
| 暗色模式 | ❌ **Web 没有** | App 若做暗色，必然分叉 |
| 品牌标识 | ✅ **有源文件可复用** | `resources/icon.png` 可派生 App 图标与启动图 |
| 布局/间距/圆角/阴影 | ⚠️ **需独立定义** | Web 是桌面优先的布局令牌，移动端需要另一套 |

### 需要所有者拍板的问题（进入提案）

1. **品牌性格取向**：App 是延续吉祥物的"可爱温暖"，还是走向更克制的"原生工具感"，还是**两者分层**（如：空态/等级/成就等"人格化时刻"用吉祥物；信息流与表单保持克制）？
2. **暗色模式**：App 做「暗色优先」还是「亮色优先 + 暗色可选」？Web 为纯亮色，双端会有差异。
3. **品牌一致性容忍度**：App 与 Web 视觉差异到什么程度算可接受？（Web 正在 Neo-Brutalism 化）
4. **字体**：App 是否引入自有字体（会影响包体积与 OTA），还是用各平台系统字体栈各自最优？

---

## 五、复测方法

```powershell
# 令牌总量
$css = Get-ChildItem frontend/src -Recurse -File -Include *.css
$all = ($css | %{ Get-Content $_.FullName -Raw }) -join "`n"
([regex]::Matches($all,'--[a-zA-Z0-9-]+\s*:') | %{ ($_.Value -replace '\s*:$','') } | Sort-Object -Unique).Count
([regex]::Matches($all,'var\(\s*--[a-zA-Z0-9-]+')).Count

# 暗色支持 / 硬编码色值
([regex]::Matches($all,'prefers-color-scheme')).Count
([regex]::Matches($all,'\[data-theme|\.dark\b')).Count
([regex]::Matches($all,'#[0-9a-fA-F]{3,8}\b')).Count
```
