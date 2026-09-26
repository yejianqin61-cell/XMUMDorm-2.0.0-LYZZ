/**
 * 万能墙键盘控制 — 纯逻辑（无 DOM 依赖，便于表驱动单测）
 *
 * 设计文档：docs/04-Module/M09-万能墙/Module09-万能墙模块设计.md §7.3
 *
 * 规则：
 *   ↑ / ←  上篇（更新）        ↓ / →  下篇（更旧）
 *   Home   窗口最新            End    窗口最旧
 *   Enter / Space  展开评论区（已展开则聚焦输入框）
 *   Esc    关闭评论区
 *
 * 两条硬规则：
 *   1. 焦点在输入类元素内时，**仅**放行 Esc，其余键全部让位给浏览器原生行为
 *      （在评论框里按方向键应移动光标，按空格应输入空格）。
 *   2. 带修饰键（meta/ctrl/alt）的组合键一律不处理，避免抢占浏览器快捷键。
 */

export const CONFESSION_KEY_ACTIONS = {
  PREV: 'prev',
  NEXT: 'next',
  FIRST: 'first',
  LAST: 'last',
  OPEN_COMMENTS: 'openComments',
  CLOSE_COMMENTS: 'closeComments',
};

/** 焦点位于这些标签/可编辑区时，键盘翻页必须让位 */
const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTypingTarget(activeElementTag, isContentEditable) {
  if (isContentEditable) return true;
  if (!activeElementTag) return false;
  return TYPING_TAGS.has(String(activeElementTag).toUpperCase());
}

/**
 * 把一次按键解析为动作。
 *
 * @param {string} key - KeyboardEvent.key
 * @param {Object} [ctx]
 * @param {boolean} [ctx.commentsOpen=false] - 评论区面板当前是否展开
 * @param {string}  [ctx.activeElementTag]   - 焦点元素的 tagName
 * @param {boolean} [ctx.isContentEditable]  - 焦点元素是否 contenteditable
 * @param {boolean} [ctx.metaKey]  - 按下 Meta
 * @param {boolean} [ctx.ctrlKey]  - 按下 Ctrl
 * @param {boolean} [ctx.altKey]   - 按下 Alt
 * @param {boolean} [ctx.defaultPrevented] - 事件是否已被处理
 * @returns {string|null} CONFESSION_KEY_ACTIONS 之一；null 表示不拦截（让浏览器原生处理）
 */
export function resolveKeyboardAction(key, ctx) {
  const {
    commentsOpen = false,
    activeElementTag = '',
    isContentEditable = false,
    metaKey = false,
    ctrlKey = false,
    altKey = false,
    defaultPrevented = false,
  } = ctx || {};

  // 已被其他处理逻辑消费，或带修饰键（浏览器快捷键）→ 完全不介入
  if (defaultPrevented) return null;
  if (metaKey || ctrlKey || altKey) return null;
  if (!key) return null;

  const typing = isTypingTarget(activeElementTag, isContentEditable);

  // Esc 是唯一在输入框内也放行的键（用于收起面板）
  if (key === 'Escape') {
    return commentsOpen ? CONFESSION_KEY_ACTIONS.CLOSE_COMMENTS : null;
  }

  // 在输入框里：其余键全部让位
  if (typing) return null;

  switch (key) {
    case 'ArrowUp':
    case 'ArrowLeft':
      return CONFESSION_KEY_ACTIONS.PREV;
    case 'ArrowDown':
    case 'ArrowRight':
      return CONFESSION_KEY_ACTIONS.NEXT;
    case 'Home':
      return CONFESSION_KEY_ACTIONS.FIRST;
    case 'End':
      return CONFESSION_KEY_ACTIONS.LAST;
    case 'Enter':
    case ' ':
    case 'Spacebar': // 旧浏览器
      return CONFESSION_KEY_ACTIONS.OPEN_COMMENTS;
    default:
      return null;
  }
}

/**
 * 从 DOM 事件构造 resolveKeyboardAction 的上下文。
 * 抽出此函数是为了让调用点保持一行，并让纯逻辑测试无需模拟整个事件对象。
 */
export function keyboardContextFromEvent(event, commentsOpen) {
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  return {
    commentsOpen,
    activeElementTag: active ? active.tagName : '',
    isContentEditable: Boolean(active && active.isContentEditable),
    metaKey: Boolean(event && event.metaKey),
    ctrlKey: Boolean(event && event.ctrlKey),
    altKey: Boolean(event && event.altKey),
    defaultPrevented: Boolean(event && event.defaultPrevented),
  };
}
