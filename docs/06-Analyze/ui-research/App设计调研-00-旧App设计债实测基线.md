# 旧 App v1 设计债实测基线

**日期**：2026-09-30
**性质**：反面基线（negative baseline）—— 供新《App 设计宪法》引用，使每一条硬约束都有实测依据
**数据来源**：git tag `app-legacy-v1` 的归档代码，**由本次独立复测得出**，不是照抄旧文档的叙述

---

## 一、为什么要做这次复测

旧 App 被全盘废弃的核心理由是「**功能已齐、展示层从未建立**」。这句话若不落到数字上，就无法变成可执行的约束，也无法验证新版是否重蹈覆辙。

仓库内已删除的旧文档给过一组数字，但**它们本身没有留下可复现的测量方法，且本次复测发现有一处明显偏差**。因此本文件以可复现的命令重新测量，作为新宪法的唯一数字依据。

---

## 二、复测方法（任何人可复现）

```powershell
# 1) 从归档 tag 导出旧 App 代码（注意：必须 -o 落盘，不能用 PowerShell 管道，
#    PowerShell 管道会破坏 tar 的二进制流）
$tmp = "$env:TEMP\dorm-v1-archive"
git archive --format=tar -o "$tmp\mobile.tar" app-legacy-v1 mobile
tar -xf "$tmp\mobile.tar" -C $tmp

# 2) 统计范围：mobile/src + mobile/app 下全部 .ts/.tsx（共 120 个文件）
#    逐文件统计下列正则命中数：
#      hex 色值          #[0-9a-fA-F]{3,8}\b
#      fontSize 字面量    fontSize\s*:
#      StyleSheet.create  StyleSheet\.create
#      动效库             react-native-reanimated / react-native-gesture-handler
#      自有 UI 组件       components/ui/
#      暗色外观 API       useColorScheme|Appearance\.
#      模糊/渐变          expo-blur|BlurView / expo-linear-gradient|LinearGradient
#      列表               FlatList|SectionList / FlashList
```

---

## 三、实测结果

### 3.1 规模

| 项 | 数值 |
|---|---|
| `src` + `app` 下 `.ts/.tsx` 文件 | **120** |
| `src/screens/*.tsx` 屏幕文件 | **69** |
| `mobile/app/` 路由文件 | 19（几乎全是转发到 `src/screens` 的薄壳） |

### 3.2 设计债（关键指标）

| 指标 | 实测值 | 分布 |
|---|---|---|
| **硬编码色值 `#hex`** | **1437 处** | 集中在 **79 个文件**（占 120 个文件的 66%） |
| **`fontSize` 字面量** | **645 处** | 分散于屏文件 |
| `StyleSheet.create` 调用 | 79 次 | 与硬编码色值文件数一致 → 每屏各写各的样式 |
| 引用自有 UI 组件（`components/ui/`） | **0 次** | 见 3.4 |
| 引用 `react-native-reanimated` | **0 次** | 依赖已安装但从未使用 |
| 引用 `react-native-gesture-handler` | **0 次** | 依赖已安装但从未使用 |
| 暗色/外观 API（`useColorScheme` / `Appearance`） | **0 次** | **完全不存在暗色支持** |
| `expo-blur` / `BlurView` | 9 处 | 玻璃拟态只在极少数屏出现 |
| `LinearGradient` | 7 处 | 同上 |
| `lucide-react-native` 图标 | 4 处 | 图标体系未统一 |
| `FlatList` / `SectionList` | 56 处 | 列表方案统一于 RN 内置 |
| `FlashList` | **0 处** | 从未引入 |

### 3.3 色值最集中的 10 个文件（越靠前越是"重写重点"）

| 文件 | `#hex` 处数 |
|---|---|
| `TodoScreen.tsx` | 49 |
| `MarketplaceHomeScreen.tsx` | 47 |
| `ScheduleScreen.tsx` | 43 |
| `SquareHomeScreen.tsx` | 42 |
| `CampusPostDetailScreen.tsx` | 35 |
| `ActivityPostDetailScreen.tsx` | 33 |
| `PostDetailModal.tsx` | 32 |
| `ErrandsHomeScreen.tsx` | 32 |
| `DiaryScreen.tsx` | 31 |
| `ErrandDetailScreen.tsx` | 30 |

> 注意：**色值债与业务复杂度无关**——待办、课表这类"简单表单页"反而是债最重的。这说明问题不是"页面太复杂"，而是**没有任何样式约束**。

### 3.4 已建但从未被使用的组件（死代码证据）

`mobile/src/components/ui/` 下存在 7 个组件：

```
Card.tsx  EmptyState.tsx  GlassView.tsx  SkeletonCard.tsx
SkeletonPost.tsx  StyledButton.tsx  StyledInput.tsx
```

而全项目对 `components/ui/` 的引用为 **0 次**。即：**组件库写了，但一屏都没用。**

### 3.5 「令牌体系」的真实状态

`mobile/src/theme/` 目录下**只有一个文件**：

```
treehole.ts   (469 B)
```

即旧文档中所称的"设计令牌唯一事实源"**从未存在**——只有一个树的局部色值文件。

---

## 四、与旧文档口径的差异（重要）

旧文档（已随 App v1 删除，可从 `app-legacy-v1` 取回）给过的数字与实测对照：

| 指标 | 旧文档声称 | 本次实测 | 判定 |
|---|---|---|---|
| 硬编码色值 | 1144 处 | **1437 处** | ⚠️ **旧数字偏低 293 处（约 26%）** |
| `fontSize` 字面量 | 645 处 | 645 处 | ✅ 一致 |
| 69 屏不使用自有 UI 组件 | 声称 | 0 次引用 | ✅ 一致（更强：组件库完全未接入） |
| Reanimated / gesture-handler 0 引用 | 声称 | 0 / 0 | ✅ 一致 |
| Android 上玻璃效果从未生效 | 声称 | 未直接验证渲染，但 `BlurView` 仅 9 处 | ⚠️ 未独立证实，依赖旧结论 |
| `src/theme` 将扩展为全局 theme | 计划 | 实为单文件 469B | ✅ 确认从未建立 |
| 暗色模式 | 宪法要求"暗色优先" | **0 处外观 API** | ⚠️ **旧文档未提及此项，属新增证据** |

**结论**：旧文档对自己债的估计是**偏乐观**的。因此新宪法不得引用旧数字，一律以本文件为准。

---

## 五、对新《App 设计宪法》的直接含义

每一条都对应上面的实测数字，都是**可被 lint 或脚本验证**的：

1. **设计令牌必须是唯一事实源，且必须真的存在**
   - 强制项：新建 `tokens` 模块；**禁止**在组件/屏幕内出现 `#hex` 与 `fontSize` 字面量。
   - 验收方式：lint 规则；基线是 **1437 / 645 → 0**。这不是审美要求，是"上次这里有 1437 处"的直接后果。

2. **组件库必须先建、先被用，再铺页面**
   - 上次的失败模式是"组件库写了但 0 引用"。因此：**首个纵向切片必须消费组件库**，否则不许进入模块铺开。
   - 验收方式：统计 `components/` 被业务代码引用的次数，必须 > 0（上次是 0）。

3. **样式必须收敛到有限数量的布局原型**
   - 上次 79 个文件各写各的 `StyleSheet.create`。强制"新需求先扩原型库，不许单页自造样式"。
   - 验收方式：屏文件里不得出现独立定义的完整样式表，只能组合原型。

4. **暗色模式是本次必须从第 0 天做的，而不是后补**
   - 上次 `useColorScheme`/`Appearance` 引用为 **0**，即从未支持。若本次仍设"暗色优先"，必须在 P1 就落地并有真机验收。
   - 验收方式：双主题令牌齐全 + 每屏真机验收。

5. **动效必须是设计要求，不是可选装饰**
   - 上次装了 Reanimated 与 gesture-handler 却 **0 引用**——说明"装了库"被当成了"有了设计"。
   - 强制：宪法需要明确列出**哪些交互必须动、动到什么程度**；无此清单不得引入动效库。

6. **列表、图标、图片三项必须各只有一个方案**
   - 上次：`FlatList` 56 处 / `FlashList` 0 处、图标 4 处引用、`BlurView` 9 处与渐变 7 处散落。
   - 强制：每类能力指定唯一方案并写明理由，禁止并存两套。

7. **"网页感"的根源不是组件，是没有约束**
   - 上述数字共同说明：旧 App 的问题**不是"用了 Web 的写法"，而是"每一屏都在自由发挥"**。新宪法若只写"要好看"而不写"不许自由发挥"，必然重演。

---

## 六、本文件的使用方式

- **引用**：新《App 设计宪法》的每一条硬约束，应能指回本文件的某个数字。
- **复测**：新 App 开发过程中，应能在任意时点用同一套命令测新代码库的同类指标，与本文对照。
- **不适用**：本文只测量**旧代码**，不构成对新 App 的任何设计主张。设计主张在调研与提案之后另行产出。
