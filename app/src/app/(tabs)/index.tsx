/**
 * 广场（一级 Tab 1）—— Phase 0 只放骨架；内容与二级 Tab 由 Phase 1/2 填。
 * 二级 Tab 的**集合**尚未拍板（TO-CONFIRM C-03），故此处不预置任何子栏目。
 */
import * as React from 'react';
import { Screen } from '@/components/ui/Screen';
import { TAB_BAR_CLEARANCE } from './_layout';

export default function SquareScreen(): React.ReactElement {
  // S5：底部留白 = 原生 Tab 栏高度，**不含** insets.bottom
  return (
    <Screen
      testID="screen-square"
      titleKey="screen.square"
      bottomMode="tabbar"
      tabBarHeight={TAB_BAR_CLEARANCE}
    />
  );
}
