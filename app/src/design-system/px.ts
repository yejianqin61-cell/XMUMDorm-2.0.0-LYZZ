/**
 * 数值转换层 —— **全 App 唯一的"令牌字符串 → RN number"转换点**
 *
 * 为什么需要它：令牌源里的长度是 `"16px"` 字符串（CSS 单位，供 Web 与审计共用），
 * 而 RN 的样式要 `number`。⛔ 不允许在组件里写 `16` —— 那正是宪法 1.4 / 2.4 禁止的屏内魔法数字，
 * 也会被 `design-debt-report.js` 抓出来。
 */

import { scale } from './tokens';

/** 令牌长度键（`space` / `radius` / `borderWidth` / `touchTarget`）的并集 */
export type LengthTokenKey =
  | keyof typeof scale.space
  | keyof typeof scale.radius
  | keyof typeof scale.borderWidth
  | keyof typeof scale.touchTarget;

/** 各档位的**具名键类型** —— 组件 props 用它，⛔ 不用裸 `number`（否则魔法数字会溜回来） */
export type SpaceKey = keyof typeof scale.space;
export type RadiusKey = keyof typeof scale.radius;
export type BorderWidthKey = keyof typeof scale.borderWidth;
export type IconSizeKey = keyof typeof scale.iconSize;
export type TouchTargetKey = keyof typeof scale.touchTarget;
export type MotionDurationKey = keyof typeof scale.motionDuration;

/**
 * `"16px"` → `16`；`"9999px"` → `9999`；非法输入 → `0`（**不抛**）。
 * ⛔ 返回 0 而不是抛异常：样式计算在渲染路径上，抛异常会让整屏白掉（宪法 10.1）。
 */
export function px(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== 'string') {
    return 0;
  }
  const matched = value.trim().match(/^(-?\d+(?:\.\d+)?)(px)?$/);
  if (!matched) {
    return 0;
  }
  const n = Number(matched[1]);
  return Number.isFinite(n) ? n : 0;
}

/** `"220ms"` → `220`；非法输入 → `0` */
export function ms(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== 'string') {
    return 0;
  }
  const matched = value.trim().match(/^(-?\d+(?:\.\d+)?)(ms|s)?$/);
  if (!matched) {
    return 0;
  }
  const n = Number(matched[1]);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return matched[2] === 's' ? n * 1000 : n;
}

/** 间距令牌 → number：`space('space_4') === 16` */
export function space(key: keyof typeof scale.space): number {
  return px(scale.space[key]);
}

/** 圆角令牌 → number */
export function radius(key: keyof typeof scale.radius): number {
  return px(scale.radius[key]);
}

/** 图标尺寸令牌 → number（P1-04 补齐：宪法 16.3 要求尺寸只接受档位令牌） */
export function iconSize(key: keyof typeof scale.iconSize): number {
  return px(scale.iconSize[key]);
}

/** 描边宽度令牌 → number */
export function borderWidth(key: keyof typeof scale.borderWidth): number {
  return px(scale.borderWidth[key]);
}

/** 动效时长令牌 → number（毫秒） */
export function motionDuration(key: keyof typeof scale.motionDuration): number {
  return ms(scale.motionDuration[key]);
}
