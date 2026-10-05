/**
 * 字阶角色层
 *
 * **P1-03（关 TD-44）**：角色名与**数值**现在是分开的两层 ——
 *   · `TEXT_ROLES` / `scale.fontRole`：**语义名**，两端一致（宪法 2.5-4）；
 *   · `resolveFontMetrics(role)`：数值，**由生成器内置的 M3 官方校验表产出**
 *     （`tokens/generated/native-tokens.ts` 的 `fontMetrics`）。
 *   ⛔ 调用方（含 `Text`）**不得自己写字号数字**：`design-debt-report.js` 的
 *      `fontSize 数值字面量` 指标会拦（P1-03 已把口径从"出现键名"收紧为"写数字"）。
 *
 * ⚠️ **iOS 侧的已知缺口（新债）**：宪法 2.5-4 要求 iOS 用**系统文字样式**
 *    （`UIFontTextStyle`）以获得真正的 Dynamic Type，而 **RN 未暴露它**。
 *    当前两端共用 M3 数值 + `allowFontScaling`（用户的系统字号设置**仍会**放大文字，
 *    只是不按各文字样式的语义曲线）。真正的 iOS Dynamic Type 需要本地原生模块
 *    （宪法 11.7）+ ADR → 已登记为新债（见 P1-03 文档 §7），⛔ 不假装已满足。
 */

import { scale } from './tokens';

/** 七个字阶角色（与 `tokens/design-tokens.css` §3.1 一一对应） */
export type TextRole = (typeof scale.fontRole)[keyof typeof scale.fontRole];

/** 层级强调档：只用 normal / bold（宪法 2.5：RN 官方明确不保证 500/600 可区分） */
export type TextEmphasis = 'regular' | 'strong';

/** 角色全集（供测试断言"角色集合 = 令牌源的角色集合"） */
export const TEXT_ROLES: readonly TextRole[] = Object.values(scale.fontRole);

/** 已解析的字阶数值（来自生成物 `fontMetrics`，数值来自 M3 官方表） */
export type FontMetrics = {
  /** M3 官方档位名（审计用：一眼看出这个角色挂在哪一档） */
  m3: string;
  /** 字号（Android sp / iOS pt；两端当前同值，见文件头 ⚠️） */
  size: number;
  lineHeight: number;
  /** 字距（M3 的 tracking） */
  tracking: number;
  /** M3 名义字重 —— **只作说明**，RN 的字重仍走 `resolveFontWeight`（宪法 2.5-5） */
  m3Weight: number;
};

/** 角色 → 该角色的 M3 档位数值 */
export function resolveFontMetrics(role: TextRole): FontMetrics {
  const key = `font_metric_${role}` as keyof typeof scale.fontMetrics;
  return scale.fontMetrics[key];
}

/**
 * **关键布局**（按钮 / Tab / 表单标签）的字号放大上限（宪法 2.5-7）。
 *
 * 为什么必须有上限：这三类文字的容器高度是**固定**的（按钮高度、Tab 栏高度 56），
 * 无上限放大会把标签挤出容器 —— 而 2.5-7 又明令**不得靠关掉缩放**来解决。
 * 取值 **1.5** 的理由：Android 的字体缩放档通常到 1.3–2.0；1.5 覆盖"大"档、
 * 不到"最大"档，是"不裁切"与"尊重放大"之间的折中。
 * ⚠️ **【提案】值**，须真机复验后定稿（P1-03 已登记真机项）。
 */
export const LABEL_MAX_FONT_SCALE = 1.5;

/** 角色 → 平台字重令牌值（不产生任何数字） */
export function resolveFontWeight(emphasis: TextEmphasis): string {
  return emphasis === 'strong'
    ? scale.fontWeight.font_weight_strong
    : scale.fontWeight.font_weight_regular;
}

/** 数字等宽（课表 / 排行榜 / 计时 / 价格）：不换字体，只开 tabular-nums */
export function numericVariant(role: TextRole): 'tabular-nums' | undefined {
  return role === scale.fontRole.font_role_mono ? 'tabular-nums' : undefined;
}

/** 角色的语义说明（**给 review 用，不是给运行期用**） */
export const TEXT_ROLE_INTENT: Record<TextRole, string> = {
  display: '空态/欢迎页的超大标题',
  title: '页面标题（顶栏标题不属于此，顶栏由原生导航栏绘制）',
  headline: '卡片与分区的标题',
  body: '正文',
  label: '按钮 / Tab / 表单标签',
  caption: '次要说明与时间戳',
  mono: '数字对齐场景（课表 / 排行 / 价格）',
};
