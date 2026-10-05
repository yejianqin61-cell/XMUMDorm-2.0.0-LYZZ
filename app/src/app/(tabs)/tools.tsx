/**
 * 工具（一级 Tab 2）—— **本 App 最主要功能入口**（宪法 4.1）
 *
 * ⚠️ **本页只做 P1-14 需要的那一件事**：把工具切片**接通**（README §5-1：
 *    "两个切片一律从 `T-01`/`S-07` 首页入口进入"）。
 *    `T-01` 的完整内容（`MetricRow` + `TodayCard` + 待办 + 节假日）属切片后续任务，
 *    ⛔ 本任务不预占它们的版面。
 *
 * 入口形态：
 *   · `K11 QuickActionGrid` —— 三个校方系统**一键直达** `T-05`（用户最常做的事）
 *   · `K06 ListItem` —— 进 `T-04` 看/清会话状态
 */
import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import BookOpen from 'lucide-react-native/icons/book-open';
import ListChecks from 'lucide-react-native/icons/list-checks';
import ShieldCheck from 'lucide-react-native/icons/shield-check';

import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ListItem } from '@/components/ui/ListItem';
import { QuickActionGrid, type QuickAction } from '@/components/ui/QuickActionGrid';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { SCHOOL_SYSTEMS } from '@/features/tools/schoolSystems';
import { TAB_BAR_CLEARANCE } from './_layout';

/** 三个系统各自的图标（第 1 层 Lucide；语义不同就换图标，⛔ 不用同一个糊过去） */
const SYSTEM_ICONS = {
  ac: ListChecks,
  moodle: BookOpen,
  checkin: ShieldCheck,
} as const;

export default function ToolsScreen(): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const actions = React.useMemo<readonly QuickAction[]>(
    () =>
      SCHOOL_SYSTEMS.map((system) => ({
        key: system.id,
        label: t(system.titleKey),
        icon: SYSTEM_ICONS[system.id],
        onPress: () => router.push({ pathname: '/system/[id]', params: { id: system.id } }),
      })),
    [router, t]
  );

  return (
    <Screen
      testID="screen-tools"
      titleKey="screen.tools"
      bottomMode="tabbar"
      tabBarHeight={TAB_BAR_CLEARANCE}
    >
      <View style={{ padding: theme.space('space_4'), gap: theme.space('space_4') }}>
        {/* 课程表是这个 Tab 的主功能，排第一 */}
        <ListItem
          testID="tools-timetable"
          title={t('tools.timetable')}
          subtitle={t('timetable.semesterNote')}
          variant="nav"
          onPress={() => router.push('/tools/timetable')}
        />
        <SectionHeader title={t('tools.systems.title')} />
        <QuickActionGrid testID="tools-school-actions" actions={actions} />
        <ListItem
          testID="tools-school-sessions"
          title={t('tools.systems.title')}
          subtitle={t('tools.sessions.short')}
          variant="nav"
          onPress={() => router.push('/tools/school-systems')}
        />
        {/* T-03 的另一个父页是 T-02（未建）；为了让路由现在就可进入，这里也给一个入口 */}
        <ListItem
          testID="tools-schedule-import"
          title={t('import.title')}
          subtitle={t('import.pasteHelp')}
          variant="nav"
          onPress={() => router.push('/tools/schedule-import')}
        />
      </View>
    </Screen>
  );
}
