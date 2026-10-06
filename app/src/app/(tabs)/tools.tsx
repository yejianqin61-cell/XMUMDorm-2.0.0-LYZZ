import * as React from 'react';
import { Screen } from '@/components/ui/Screen';
import { ToolsDashboardContent } from '@/features/tools/ToolsDashboard';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { TAB_BAR_CLEARANCE } from './_layout';

/** T01: native schedule and todos share the same screen as school systems. */
export default function ToolsScreen(): React.ReactElement {
  const badge = useMailboxBadge();
  return <Screen testID="screen-tools" titleKey="screen.tools" bottomMode="tabbar" tabBarHeight={TAB_BAR_CLEARANCE} scroll {...badge}>
    <ToolsDashboardContent />
  </Screen>;
}