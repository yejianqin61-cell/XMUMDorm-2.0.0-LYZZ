/**
 * 英文词条。
 *
 * ⚠️ **类型即契约**：`Record<MessageKey, string>` 让"少一条 / 多一条"成为**编译期错误**
 * （`MessageKey` 来自 `zh.ts`），因此不依赖运行期检查来保证双语完整（DoIT 第 7 条）。
 *
 * ⛔ 标签按**英文**定尺寸（宪法 6.2：英文长度中位数是中文的 2.50×）；放下不就改标签，不加省略号。
 */
import type { MessageKey } from './zh';

export const en: Record<MessageKey, string> = {
  // ── Primary navigation (five slots) ──────────────────────────
  'tab.square': 'Square',
  'tab.tools': 'Tools',
  'tab.campus': 'Campus',
  'tab.me': 'Me',
  'tab.publish': 'Publish',
  'tab.publishHint': 'Open publish center',

  // ── Top bar (one action only) ────────────────────────────────
  'topbar.mailbox': 'Mailbox',
  'topbar.mailboxUnread': 'Mailbox, {n} unread',

  // ── Accessibility ────────────────────────────────────────────
  'a11y.tabPosition': 'Tab {i} of {n}',

  // ── Publish center ───────────────────────────────────────────
  'publish.title': 'Publish',
  'publish.entry.wall': 'Wall',
  'publish.entry.confession': 'Confessions',
  'publish.entry.clubActivity': 'Club activity',
  'publish.entry.marketplace': 'Marketplace',
  'publish.entry.errand': 'Errands',
  'publish.entry.carpool': 'Carpool',
  'publish.entry.qa': 'Q&A',

  // ── Destination placeholders ─────────────────────────────────
  'screen.square': 'Square',
  'screen.tools': 'Tools',
  'screen.campus': 'Campus',
  'screen.me': 'Me',
  'screen.mailbox': 'Mailbox',

  // ── Secondary tabs ───────────────────────────────────────────
  'secondary.confession': 'Confessions',
  'secondary.wall': 'Wall',

  // ── Error copy: perceive / understand / fix ──────────────────
  'error.net.offline.perceive': 'No connection',
  'error.net.offline.understand': 'This phone has no network right now',
  'error.net.offline.fix': 'Turn on network, then retry',
  'error.net.unreachable.perceive': 'Service unreachable',
  'error.net.unreachable.understand': 'The server did not respond; campus network may be off',
  'error.net.unreachable.fix': 'Join campus network, then retry',
  'error.net.timeout.perceive': 'Timed out',
  'error.net.timeout.understand': 'The server took longer than {seconds} seconds',
  'error.net.timeout.fix': 'Retry once in a moment',
  'error.validation.perceive': '{field} is not valid',
  'error.validation.understand': '{field} must satisfy: {rule}',
  'error.validation.fix': 'Edit {field}, then submit',
  'error.permission.perceive': 'Not allowed',
  'error.permission.understand': '{action} needs a {role} account',
  'error.permission.fix': 'Switch account, then retry',
  'error.content.perceive': 'Content rejected',
  'error.content.understand': 'Item {position} contains a word you may not post',
  'error.content.fix': 'Edit item {position}, then submit',
  'error.conflict.perceive': 'Content changed',
  'error.conflict.understand': 'Someone updated this while you were editing',
  'error.conflict.fix': 'Refresh, then edit again',
  'error.unknown.perceive': '{action} did not finish',
  'error.unknown.understand': 'An unexpected error happened and we logged it',
  'error.unknown.fix': 'Go back, then retry',

  // ── Actions (verb first) ─────────────────────────────────────
  'action.retry': 'Retry',
  'action.back': 'Back',
  'action.close': 'Close',
  'action.refresh': 'Refresh',
  'action.openInBrowser': 'Open browser',
};
