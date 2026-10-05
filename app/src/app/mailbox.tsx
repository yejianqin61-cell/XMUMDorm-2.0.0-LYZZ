/**
 * 信箱（F-01）—— **推入式全屏目的地**，进入后隐藏 Tab 栏（宪法 4.7-2）。
 *
 * Phase 0 只立骨架：顶栏标题 + 返回（系统返回手势/返回键），内容由甲在 Phase 2 填。
 * ⛔ 角标口径必须是**单一未读真源**（4.7-4）：Phase 0 用 0，接口在 Phase 2 接。
 */
import * as React from 'react';
import { Screen } from '@/components/ui/Screen';

export default function MailboxScreen(): React.ReactElement {
  // 推入式目的地没有底栏 → bottomMode='none'；顶部 insets 由 Screen 消费
  return <Screen testID="screen-mailbox" titleKey="screen.mailbox" bottomMode="none" />;
}
