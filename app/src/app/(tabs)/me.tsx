/** 我的（一级 Tab 4）—— 是否也用二级 Tab 待确认（TO-CONFIRM C-05），故暂不预置。 */
import * as React from 'react';
import { Screen } from '@/components/ui/Screen';
import { TAB_BAR_CLEARANCE } from './_layout';

export default function MeScreen(): React.ReactElement {
  return (
    <Screen
      testID="screen-me"
      titleKey="screen.me"
      bottomMode="tabbar"
      tabBarHeight={TAB_BAR_CLEARANCE}
    />
  );
}
