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
  'a11y.ratingTier': '{label}, weight {weight}',
  'a11y.starRating': '{label}, {filled} of {max}',
  'a11y.starRatingBare': '{filled} stars',

  // ── Publish center ───────────────────────────────────────────
  'publish.title': 'Publish',
  'publish.entry.wall': 'Wall',
  'publish.entry.confession': 'Confessions',
  'publish.entry.clubActivity': 'Club activity',
  'publish.entry.marketplace': 'Marketplace',
  'publish.entry.errand': 'Errands',
  'publish.entry.carpool': 'Carpool',
  'publish.entry.qa': 'Q&A',
  'publish.gate.terms.perceive': 'Accept the terms first',
  'publish.gate.terms.understand': 'Posting is user content, so the user policy applies',
  'publish.gate.terms.fix': 'Open the terms and accept',

  // ── Tools tab: the three school systems ──────────────────────
  'tools.system.ac': 'AC System',
  'tools.system.moodle': 'Moodle',
  'tools.system.checkin': 'Check-in',
  // School-system session states (D27; states must be announced, not colour-only)
  'tools.session.signedOut': 'Not signed in',
  'tools.session.signedIn': 'Signed in',
  'tools.session.expired': 'Session expired',
  'tools.session.clear': 'Clear session',
  'tools.systems.title': 'School systems',
  'tools.systems.empty': 'No systems configured',
  'tools.open': 'Open',
  'tools.sessions.notice':
    'Session state is what this device observed; clearing removes the local record only — the school site may still remember you',
  'tools.sessions.short': 'View and clear session state',
  'tools.readSchedule': 'Read timetable on this page',
  'tools.schedule.scraped': 'Read {rows} rows — confirm in Import',
  'tools.schedule.none': 'No timetable found on this page — try again on the timetable page',

  // T-03 schedule import (P1-15)
  'import.title': 'Import timetable',
  'import.pasteLabel': 'Paste timetable text',
  'import.pasteHelp': 'Use "Read timetable on this page" in AC, or paste the text directly',
  'import.preview': 'Preview',
  'import.commit': 'Import',
  'import.tooShort': 'Too short — paste the whole timetable',
  'import.summary': '{courses} courses · {meetings} sessions',
  'import.errorsTitle': '{n} lines could not be parsed',
  'import.overwriteTitle': 'Replace the whole timetable',
  'import.overwriteBody': 'Your current timetable will be replaced and this cannot be undone',
  'import.overwriteConfirm': 'Replace',
  'import.done': 'Imported {courses} courses',

  // T-02 timetable (P1-16)
  'tools.timetable': 'Timetable',
  'timetable.weekLabel': 'W{n}',
  'timetable.prevWeek': 'Earlier',
  'timetable.nextWeek': 'Later',
  'timetable.stale': 'Showing the last synced timetable',
  'timetable.empty': 'No classes this week',
  'timetable.importHint': 'Timetable wrong? Import it again',
  'timetable.semesterNote': 'Weeks follow the campus time zone',
  'timetable.courseInfo': '{name} · {when} · {venue}',

  // Weekdays (backend `day_of_week`: 1=Mon … 7=Sun)
  'weekday.1': 'Mon',
  'weekday.2': 'Tue',
  'weekday.3': 'Wed',
  'weekday.4': 'Thu',
  'weekday.5': 'Fri',
  'weekday.6': 'Sat',
  'weekday.7': 'Sun',

  // Form validation copy (K01/K03)
  'form.error.required': 'This field is required',
  'form.error.tooLong': 'Too long',
  'form.error.submit': 'Submit failed',

  // Minimal login chain (P1-13)
  'auth.title': 'Sign in',
  'auth.identifier': 'Student ID or email',
  'auth.password': 'Password',
  'auth.login': 'Sign in',
  'auth.failed': 'Sign-in failed',
  'auth.signedOut': 'Not signed in',
  'auth.expired': 'Session expired',
  'auth.logout': 'Sign out',

  // Canteen rating tiers (non-linear weights 10/7/4/1/-1; D11 only)
  'canteen.rating.hot': 'Legendary',
  'canteen.rating.top': 'Great',
  'canteen.rating.above': 'Decent',
  'canteen.rating.npc': 'Mid',
  'canteen.rating.dead': 'Avoid',

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
  'action.cancel': 'Cancel',
  'action.clear': 'Clear',
  'action.refresh': 'Refresh',
  'action.openInBrowser': 'Open browser',
};
