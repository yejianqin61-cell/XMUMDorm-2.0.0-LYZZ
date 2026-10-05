/**
 * 广场（一级 Tab 1）—— Phase 0 只放骨架；内容与二级 Tab 由 Phase 1/2 填。
 * 二级 Tab 的**集合**尚未拍板（TO-CONFIRM C-03），故此处不预置任何子栏目。
 *
 * P1-17 只加**一件事**：把食堂切片接通（README §5-1：「两个切片一律从 `T-01`/`S-07`
 * 首页入口进入」—— `S-07` 的父页是 `S-01 服务入口`，也就是本页）。
 * ⛔ 不预置其他广场栏目（那要等 C-03 拍板）。
 */
import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Utensils from 'lucide-react-native/icons/utensils';

import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { QuickActionGrid, type QuickAction } from '@/components/ui/QuickActionGrid';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { TAB_BAR_CLEARANCE } from './_layout';

export default function SquareScreen(): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const actions = React.useMemo<readonly QuickAction[]>(
    () => [
      {
        key: 'canteen',
        label: t('canteen.title'),
        icon: Utensils,
        onPress: () => router.push('/canteen'),
      },
    ],
    [router, t]
  );

  // S5：底部留白 = 原生 Tab 栏高度，**不含** insets.bottom
  return (
    <Screen
      testID="screen-square"
      titleKey="screen.square"
      bottomMode="tabbar"
      tabBarHeight={TAB_BAR_CLEARANCE}
    >
      <View style={{ padding: theme.space('space_4'), gap: theme.space('space_4') }}>
        <SectionHeader title={t('square.services')} />
        <QuickActionGrid testID="square-services" actions={actions} />
      </View>
    </Screen>
  );
}
