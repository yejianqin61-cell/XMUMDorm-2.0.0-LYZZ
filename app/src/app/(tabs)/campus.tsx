/** 校园里（一级 Tab 3）—— 树洞 + 万能墙，**仅导航层合并**（宪法 4.1.1）。 */
import * as React from 'react';
import { Screen } from '@/components/ui/Screen';
import { TAB_BAR_CLEARANCE } from './_layout';

export default function CampusScreen(): React.ReactElement {
  return (
    <Screen
      testID="screen-campus"
      titleKey="screen.campus"
      bottomMode="tabbar"
      tabBarHeight={TAB_BAR_CLEARANCE}
    />
  );
}
