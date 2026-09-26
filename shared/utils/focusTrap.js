/**
 * 焦点陷阱 — 纯逻辑与常量（M09 万能墙评论弹窗使用）
 *
 * 设计文档：docs/04-Module/M09-万能墙/Module09-万能墙模块设计.md §7.5
 *
 * 这里只放**不依赖具体 DOM 实例**的部分，以便在 node 环境下表驱动单测：
 *   - FOCUSABLE_SELECTOR     可聚焦元素选择器
 *   - computeTabTargetIndex  给定 Tab / Shift+Tab，算出焦点应落到的下标
 * 真正的 querySelectorAll / focus() / getComputedStyle 留在组件里。
 *
 * 仓库里另有 4 处手写的弹窗（retroui/Dialog、ClubCommentsSection 等）各自实现了一份
 * 焦点循环，本文件是新代码的单一来源；改造旧弹窗不在本次范围内。
 */

/** 与 retroui/Dialog 保持一致的意图，但额外排除 disabled 元素 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * 计算 Tab 键应该把焦点移到第几个可聚焦元素。
 *
 * 返回值语义：
 *   number — 需要把焦点显式移到该下标（并 preventDefault）
 *   null   — 中间位置，交回浏览器原生 Tab 行为即可
 *
 * @param {number} count       容器内可聚焦元素个数
 * @param {number} currentIndex 当前焦点元素在其中的下标；-1 表示焦点不在容器内
 * @param {boolean} [shiftKey=false] 是否按住 Shift（反向）
 * @returns {number|null}
 */
export function computeTabTargetIndex(count, currentIndex, shiftKey = false) {
  const total = Number(count);
  if (!Number.isFinite(total) || total <= 0) return null;

  const current = Number(currentIndex);
  // 焦点不在容器内（或下标失效）：正向从头开始，反向从尾开始
  if (!Number.isFinite(current) || current < 0 || current >= total) {
    return shiftKey ? total - 1 : 0;
  }

  // 只在首尾处需要环绕
  if (!shiftKey && current === total - 1) return 0;
  if (shiftKey && current === 0) return total - 1;

  return null;
}
