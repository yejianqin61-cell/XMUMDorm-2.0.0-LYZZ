/** 工具（一级 Tab 2）—— **本 App 最主要功能入口**（宪法 4.1）。内容由乙在 Phase 1 起填。 */
import * as React from 'react';
import { Screen } from '@/components/ui/Screen';
import { TAB_BAR_CLEARANCE } from './_layout';

export default function ToolsScreen(): React.ReactElement {
  return (
    <Screen
      testID="screen-tools"
      titleKey="screen.tools"
      bottomMode="tabbar"
      tabBarHeight={TAB_BAR_CLEARANCE}
    />
  );
}
