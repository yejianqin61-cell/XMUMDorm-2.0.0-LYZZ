# Phase 3：底部 Tab 栏 Apple 风格调研

> 调研日期：2026-08-15  
> 适用范围：`frontend-app` Capacitor App；不直接修改 Web 端。  
> 目标：为第 15 项“底部 Tab 栏体验优化”提供可执行的视觉和交互依据。

## 1. 结论摘要

Apple 的底部 Tab Bar 重点不是“做一个漂亮的玻璃卡片”，而是建立稳定、可识别的主导航层：

- Tab 只负责在主要页面区段之间导航，不承载创建、刷新等操作。
- 移动端 Tab Bar 位于内容底部之上，内容可以从半透明材质下方透出；它应当是一个独立的功能层。
- 选中态需要同时通过图标/文字颜色、字重或选中背景等方式表达，不能只依赖颜色。
- Tab 名称应短，优先单词；可见 Tab 数量应控制在少量范围内，避免溢出到 More。
- 选中态移动动画应短促、跟手、可中断，不能为了“有动效”而增加频繁动画。
- 底部布局必须预留安全区，避免 Home Indicator、系统手势区或设备圆角遮挡内容和点击区域。
- Liquid Glass/玻璃材质应只用于导航和控制层，不能扩散到内容卡片；高透明材质需要特别检查文字与图标对比度。

本项目当前已有 `--tabbar-height` 和 `--safe-bottom` 变量，且 Tab Bar 为四栏结构。建议在 App 端将现有约 `72px` 的视觉高度压缩到约 `56–60px`，安全区另行叠加，不把安全区算入视觉栏高度；具体值需以真实 Android 设备验收为准。

## 2. Apple 官方依据

### 2.1 Tab Bar 的职责和结构

Apple HIG 明确指出，Tab Bar 用于理解并切换 app 提供的不同信息或功能区段；应当支持导航，而不是提供当前页面的操作。Tab Bar 在用户进入不同区段时应保持可见，除非被临时 modal 覆盖。Apple 还建议减少 Tab 数量、避免 overflow，并为每个 Tab 提供文字标签；标签尽量使用单词。

来源：

- [Apple HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)

对本项目的约束：

- “广场 / 树洞 / 食堂 / 我的”继续作为四个稳定主区段。
- 发布、刷新、设置、搜索等属于页面操作，不能塞入底部 Tab 栏。
- 四个 Tab 全部同时展示，不引入横向滚动或 More。
- 中文模式和英文模式必须分别提供短而稳定的本地化标签，不混用中英文。

### 2.2 选中态、图标和标签

Apple 建议 Tab Bar 包含标签，以帮助用户理解导航；图标可使用熟悉、可缩放的 SF Symbols。官方还提醒，Tab 标签和内容层背景不要使用相近颜色，避免选中态与内容混淆。UIKit 的 `UITabBar` 支持 selected item、tint、selection indicator 等明确的选中表现。

来源：

- [Apple HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [UIKit: UITabBar](https://developer.apple.com/documentation/uikit/uitabbar)
- [UIKit: UITabBarAppearance](https://developer.apple.com/documentation/uikit/uitabbarappearance)
- [SwiftUI: TabView](https://developer.apple.com/documentation/swiftui/tabview)

对本项目的约束：

- 保留“图标 + 标签”的双重提示，不做只显示图标的极简模式。
- 选中态至少由两种信号共同表达：黑色/品牌色图标与文字、轻量的玻璃选中底、或选中图标的填充/字重变化。
- 未选中态使用低对比度中性色；选中态不能依靠渐变或发光。
- 若使用 Lucide 图标，优先选择语义明确、轮廓稳定的一组，不在切换时改变图标几何尺寸导致布局跳动。

### 2.3 Liquid Glass 和材质层级

Apple 将 Liquid Glass 定义为承载控件和导航的独立功能层。它允许内容滚动并从下方透出，同时保持文字和控件可读。Apple 明确建议不要在内容层大量使用 Liquid Glass，也要谨慎使用自定义玻璃效果；`regular` 变体用于需要更强可读性的场景，`clear` 变体适合媒体背景，但透明背景过亮时应增加暗化层。

来源：

- [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [SwiftUI: Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)

对本项目的实现建议：

- 只让底部 Tab Bar 使用一层轻量 `backdrop-filter`/半透明蒙版；页面内容和入口卡片不继续套玻璃。
- 采用近似 `regular` 的效果作为默认：半透明白/黑底 + 中等模糊 + 细边界线，优先保证标签可读。
- 不建议在四个 Tab 内各自放独立白色圆角小卡片；选中背景应是同一条栏内的连续滑动指示层。
- 玻璃层下方内容滚动时可以轻微透出，但不能让图片、渐变或文字穿透到难以识别。
- Android WebView 对 `backdrop-filter` 支持不一致，必须提供不透明或低透明度背景的 fallback；材质失效时导航仍应清晰可用。

### 2.4 选中态滑动动效

Apple HIG 的 Motion 指南要求动效有明确目的，反馈应符合手势预期、短暂精确，并且可取消；频繁使用的 UI 交互不应附加让用户等待的多余动画。系统组件会根据触控方式和辅助功能设置调整动画强度。

来源：

- [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [SwiftUI: Animating views and transitions](https://developer.apple.com/tutorials/swiftui/animating-views-and-transitions)

对本项目的实现建议：

- 点击 Tab 后，只移动一块共享的选中玻璃指示层，使用 `transform: translateX(...)`；不要让整个 Tab 栏上下弹跳或横向漂移。
- 动画建议采用约 `160–220ms` 的 ease-out，给人“滑到目标位置”的方向反馈；该数值是本项目实现建议，不是 Apple 固定规范。
- 选中图标/文字可以同步淡入或轻微缩放，但避免连续 bounce、呼吸、闪烁和粒子效果。
- 点击当前 Tab 时可回到该区段顶部或保持现有导航状态，需与现有路由约定一致；不能因动效破坏返回栈。
- 尊重 `prefers-reduced-motion: reduce`：关闭滑动过渡和缩放，只保留即时选中态与必要的颜色/边界变化。
- 动画过程中仍应立即响应下一次点击，不以动画完成作为交互锁。

### 2.5 安全区、内容叠加和尺寸

Apple HIG 指出，安全区是不会被 Tab Bar、工具栏或系统视图覆盖的区域；背景和滚动内容可以延伸到屏幕边缘，但控件和关键内容必须考虑浮在上方的导航层。UIKit 也将 `standardAppearance` 和 `scrollEdgeAppearance` 分开，用于不同滚动边缘状态。

来源：

- [Apple HIG: Layout — Guides and safe areas](https://developer.apple.com/design/human-interface-guidelines/layout#Guides-and-safe-areas)
- [UIKit: Positioning content relative to the safe area](https://developer.apple.com/documentation/uikit/positioning-content-relative-to-the-safe-area)
- [UIKit: UITabBar](https://developer.apple.com/documentation/uikit/uitabbar)
- [SwiftUI: toolbarBackground(_:for:)](https://developer.apple.com/documentation/swiftui/view/toolbarbackground(_:for:))

对本项目的实现建议：

- `.tab-bar` 继续 `position: fixed`，视觉栏高度与 `env(safe-area-inset-bottom)` 分离计算。
- 页面滚动容器继续使用 `padding-bottom: calc(var(--tabbar-height) + var(--safe-bottom))`，防止最后一行被遮挡。
- 轮播图、树洞瀑布流、食堂列表等内容可以延伸到 Tab Bar 背后，但最后一项必须有足够底部留白。
- 横屏、小屏 Android、手势导航和三键导航都要验证；不得把安全区固定写成某个像素值。
- 目前代码中存在 `--tabbar-height`、`--safe-bottom` 及页面侧的底部 padding，改造时应复用这些变量，不另起一套高度计算。

### 2.6 无障碍和可读性

Apple 的无障碍原则要求界面不能只依靠单一感官或单一颜色传递信息；应支持更大的文字、足够的对比度、VoiceOver/辅助技术和 Reduce Motion。UIKit 的 Tab Bar 默认支持 VoiceOver，系统会读出 Tab 标题、在栏中的位置以及是否选中。

来源：

- [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [UIKit: UITabBar — Make a tab bar accessible](https://developer.apple.com/documentation/uikit/uitabbar#Make-a-tab-bar-accessible)
- [Apple HIG: Typography — Supporting Dynamic Type](https://developer.apple.com/design/human-interface-guidelines/typography#Supporting-Dynamic-Type)

对本项目的实现建议：

- 每个 Tab 按钮使用真实可读的 `aria-label`/可访问名称，不能只把图标作为名称。
- 选中态增加 `aria-current="page"` 或等价状态；屏幕阅读器可获知“当前所在区段”。
- 文字和图标满足至少 WCAG AA 对比度；玻璃背景变化后再次检查，不以默认透明度假设对比度。
- 字号随系统/浏览器文本设置放大时，标签不能被裁切或挤出点击区域；必要时允许标签换行或采用更短本地化文案。
- 选中态不能只用绿色/蓝色变化，同时保留底部指示、填充图标或字重变化。
- 对 `prefers-reduced-motion`、高对比度和透明度降低相关媒体查询提供降级样式。

## 3. 针对当前 App 的推荐方案

### 3.1 视觉结构

```text
内容层（可滚动、可延伸到屏幕底部）
                ↑ 内容从下方轻微透出
Tab Bar 功能层（半透明 / blur / 细边界线）
┌──────────────────────────────────────────┐
│  [共享选中蒙版]  广场   树洞   食堂   我的  │
└──────────────────────────────────────────┘
                + safe-area inset
```

- 视觉栏高度从当前约 `72px` 收束到建议 `56–60px`。
- `safe-bottom` 仍然单独占位；不要为了“扁”而把按钮压进系统手势区域。
- 取消每个 Tab 独立圆角卡片、阴影和渐变；玻璃效果只保留在整条 Tab 栏和共享选中蒙版。
- 选中蒙版可为低透明度的白色/黑色椭圆或圆角矩形，但应与整条栏连成一个系统，而不是四个卡片。

### 3.2 交互状态

| 状态 | 图标 | 标签 | 背景/指示 | 动画 |
| --- | --- | --- | --- | --- |
| 未选中 | 中性线描 | 次要文字色 | 无独立背景 | 无 |
| 选中 | 稍高对比度或填充变体 | 主文字色/中等字重 | 共享玻璃蒙版 | `160–220ms` 滑动 |
| 按下 | 保持选中逻辑不变 | 不跳动 | 轻微透明度变化 | 即时反馈 |
| Reduce Motion | 同上 | 同上 | 直接切换位置/颜色 | 无位移动画 |
| 禁用/异常 | 不隐藏 Tab | 说明性状态 | 不用灰到不可读 | 无 |

### 3.3 需要保留的工程边界

- 不改变现有路由、登录态、深链接、Android 返回键逻辑。
- 不把 Tab 栏改成横向滑动容器；主导航仍由点击完成，页面左右滑动体验另行治理。
- 不把发布、刷新、设置等页面动作迁入 Tab 栏。
- 不要求 Web 端同步使用玻璃滑动动效；只有共享的导航状态和标签文案需要保持一致。

## 4. 验收清单

- [ ] App 四个主 Tab 同时可见，无横向滚动、无 More。
- [ ] 视觉栏约 `56–60px`，安全区独立计算，底部内容不被遮挡。
- [ ] 整条栏只有一层轻量玻璃材质；没有四个独立白色圆角小卡片。
- [ ] 选中蒙版在四个位置间平滑移动，动画短且可以被下一次点击打断。
- [ ] `prefers-reduced-motion: reduce` 下不出现位移动画、缩放或闪烁。
- [ ] 选中态不只依靠颜色，图标/文字/指示层至少有两种可感知差异。
- [ ] 中文和英文标签均简短、无中英混搭，字号放大后不裁切。
- [ ] 浅色背景、深色背景、轮播图和图片列表下，标签与图标仍清晰可读。
- [ ] Android 手势导航、三键导航、横屏和小屏设备均不遮挡 Tab 和内容。
- [ ] 四个按钮可被屏幕阅读器识别为导航项，并能读出名称与当前选中状态。
- [ ] App 构建通过，现有路由、返回键、深链接和页面底部留白回归通过。

## 5. 调研边界与说明

- Apple 官方 HIG 说明了行为原则和系统组件能力，但没有规定本项目应直接复制的固定 CSS 高度或动画时长。
- `56–60px`、`160–220ms` 是结合当前 App 现状提出的实现起点，需要在真实 Android 设备上以触控可用性、字体放大和安全区回归结果最终定值。
- Capacitor App 运行在 Android WebView，不能假设 UIKit/SwiftUI 的原生 Liquid Glass API 可直接使用；本项目应复用 CSS `backdrop-filter`、透明度和 fallback，并把 Apple 原则转译为 Web UI 行为。
