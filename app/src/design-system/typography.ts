/**
 * 字阶角色层
 *
 * ⚠️ **本层 Phase 0 不含任何绝对字号 —— 这是刻意的，不是遗漏。**
 *
 * 宪法 2.5-② 原文：**"字阶不写绝对 pt 常量"** —— iOS 用系统文字样式（从而获得
 * Dynamic Type），Android 用 M3 字阶角色；**语义名两端一致，数值分端生成**。
 * 而 M3 官方字阶数值**必须人工读取**（宪法 15.2-1：`m3.material.io` 是客户端渲染的
 * SPA，抓取只能得到标题）。
 *
 * → 因此 Phase 0 **不发明数值**：`Text` 走平台默认字号，层级只由**字重 + 颜色令牌**表达。
 *   缺口登记为 [TODO TD-44](../../../docs/app/TODO.md)，
 *   **归属 Phase 1**（生产计划 §3 甲的"设计系统内测子集"）。
 *   ⛔ 不允许的"解法"：在 `app/src` 里硬写一个字号数值来凑绿尺子
 *   —— 那正是 `design-debt-report.js` 的 `fontSize` 字面量指标要拦的东西
 *   （宪法 9.11-3 的判据是"默认渲染是不是我们的视觉"，不是"脚本是否变绿"）。
 */

import { scale } from './tokens';

/** 七个字阶角色（与 `tokens/design-tokens.css` §3.1 一一对应） */
export type TextRole = (typeof scale.fontRole)[keyof typeof scale.fontRole];

/** 层级强调档：只用 normal / bold（宪法 2.5：RN 官方明确不保证 500/600 可区分） */
export type TextEmphasis = 'regular' | 'strong';

/** 角色全集（供测试断言"角色集合 = 令牌源的角色集合"） */
export const TEXT_ROLES: readonly TextRole[] = Object.values(scale.fontRole);

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
