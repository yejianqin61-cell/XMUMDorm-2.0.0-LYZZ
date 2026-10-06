/**
 * 信箱（`F-01`）—— 推入式全屏目的地，进入后隐藏 Tab 栏（宪法 4.7-2）。
 *
 * 页面级组合在 `features/mailbox/MailboxScreen.tsx`（P2B-04）；本文件只做转发。
 * 未读**真源**在 `features/mailbox/useUnread.ts`（顶栏角标与这里读同一个数字，宪法 4.7-4）。
 */
export { MailboxScreen as default } from '@/features/mailbox/MailboxScreen';
