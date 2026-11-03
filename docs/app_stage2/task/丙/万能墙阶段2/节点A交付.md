# 万能墙阶段 2 · 节点 A 交付（等待实机视觉确认）

2026-11-02｜基线 `dev-gjl` = `ef1ebb41`｜节点 A：五种文字海报模板 + 基础自动排版 + 预览页

## 1. 已完成

| 内容 | 结果 |
| --- | --- |
| 五种模板 A–E | 蓝色居中 / 极简左对齐 / 暖纸留白 / 深蓝强调 / 简洁随笔；颜色全部引用现有语义令牌，亮暗两套主题对比度均 ≥ 4.5 |
| 自动排版 | 文字特征分析 → 硬约束过滤 → 配置化评分 → 2–3 个候选（有限权重随机）→ 原生行数实测复核 → 自动回退 |
| 稳定性 | `recommendWallPoster` 无随机；同一段文字在信息流 / 详情 / 重开时得到同一模板 |
| 预览 | 示例条右侧「模板预览」→ 固定样本 8 种（超短 / 短 / 中 / 长 / 英文 / 中英 / 多段 / Emoji），可切换候选、换一批、逐张比较五种模板 |
| 信息流 | 同一套卡壳；8 条示例帖（6 自由 + 2 招募），五种模板都出现；底部互动栏 / 时间位置 / 匿名规则不变 |
| 详情 | 复用同一个 `WallPosterBody`，不是第二套版式；正文完整、无截断 |
| 字体 | 核实为纯系统字族（无字体文件 / 无 `fontFamily`），本轮不引入字体包 |

## 2. 主要文件

- `app/src/features/campus/wallPosterTemplates.ts`：模板配置（底色 / 文字色 / 对齐 / 间距 / 三档字阶 / 容量 / 回退链 / 评分参数）
- `app/src/features/campus/wallPosterLayout.ts`：分析、约束、评分、候选、换一批、行数估算
- `app/src/features/campus/WallPosterBody.tsx`：唯一渲染器（含 `onTextLayout` 实测回退）
- `app/src/features/campus/WallFreePostBody.tsx`、`WallPostCard.tsx`、`wallPost.ts`：信息流接线
- `app/src/features/campus/WallPosterLab.tsx`、`wallPosterLabCases.ts`、`app/src/app/dev/wall-poster.tsx`：节点 A 预览页（节点 B 删除）
- `app/src/components/ui/Text.tsx`：增加 `onTextLayout` 只读测量通道
- `app/src/i18n/{zh,en}.ts`：模板名 / 预览页 / 样本标签
- 测试：`p2a-wall-poster.test.ts`、`p2a-wall-poster-ui.test.tsx`、`p2a-wall-poster-lab.test.tsx`

## 3. 测试与构建结果

```
tsc --noEmit                通过
jest --runInBand            194 suites 通过 / 2 skipped；2089 cases 通过 / 16 skipped
design-debt 尺子            硬编码色 0 · fontSize 字面量 0 · 宪法级违规 0
contrast-check              34 组 textSafe 全部达标
gen-tokens --check          通过
eslint（改动文件）           0 error / 0 warning
```

## 4. APK / 预览

**本轮未产出 APK。** 本机没有 Android SDK / JDK，也没有可用模拟器；仓库既定构建路径是 GitHub Actions `app-apk.yml`，它要求代码先进入远端分支。
按要求未擅自 push。所有者确认后有两种走法：

1. 授权我在本地提交并推送 `dev-gjl`（不合并、不动 main），再由 GitHub Actions 手动触发 `app-apk`，产物 `xmumdorm-test-apk`；
2. 所有者自行推送 / 触发工作流（参数默认即可：`arm64-v8a,armeabi-v7a`）。

安装后重点看：万能墙 → 示例条右侧「模板预览」；以及信息流里 8 条示例的连续观感。

## 5. 需要重点实机检查

- 五种模板的底色 / 字重 / 留白是否符合「适度设计感、不浪费卡片高度」；
- 短句 24sp 是否过大、长文 14sp 是否偏小；C 暖纸的纵向留白（32）是否过头；
- 深蓝只出现一次时的信息流节奏；暗色模式下的浅底 / 深底观感；
- 中文、英文、中英混排、多段落、Emoji 的断行与行距；
- 键盘 / 系统大字号下的海报是否触发自动回退（回退后应变成极简 / 随笔，不缩字、不截断）。

## 6. 待决策 / 未完成

- **字体**：任务书允许引入可靠字体包，但项目宪法与令牌生成器禁止自有字体 / `font-family`。若需要拉丁展示字体，请裁决是否修改该口径（中文仍走系统）。
- 「换一批」在可用模板数 = 候选数时（长文只有极简 / 随笔）没有新组合，节点 B 需决定置灰或提示。
- 节点 B：真实发布、持久化、详情读库、作者编辑删除、信息流长文折叠；需新增后端字段与迁移（届时提供可检查、可重复执行的迁移）。
- 节点 A 的示例流 / 预览页 / 实验室路由在节点 B 删除。
