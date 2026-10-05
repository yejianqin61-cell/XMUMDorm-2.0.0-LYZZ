/**
 * `T-04` 校方系统与会话（页面清单 `T-04`，父 `T-01`，原型 `P2`）
 *
 * 页面清单给的组件是 `ListItem` `SessionBadge` `Button`（清除会话）`InlineNotice`。
 * ⚠️ **`SessionBadge` 这个组件不存在**（组件定义 §2.6 里没有它）——它其实是
 *    `D27 SchoolSystemCard` **内部的状态徽标**。按 9.14-③「1 处使用 = 就地写」，
 *    本页用 `D27 SchoolSystemCard`（它 own 三态徽标 + 清除会话），
 *    ⛔ **不为一个徽标新建组件**。该口径分歧已登记进 README §7-11。
 *
 * 数据来源：**无后端**（页面清单明写"本地单项配置 + 平台 cookie 存储状态"）
 *   · 系统清单 = `SCHOOL_SYSTEMS`（本地配置）
 *   · 会话三态 = `useSchoolSessions()`（由内嵌页回传的"有没有密码框"推出）
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { ListScreen } from '@/components/ui/ListScreen';
import { SchoolSystemCard } from '@/components/ui/SchoolSystemCard';
import { Screen } from '@/components/ui/Screen';
import { SCHOOL_SYSTEMS, type SchoolSystem, type SchoolSystemId } from './schoolSystems';
import { useSchoolSessions } from './schoolSession';

export type SchoolSystemListProps = {
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function SchoolSystemList({
  style,
  testID,
}: SchoolSystemListProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const sessions = useSchoolSessions();

  const open = React.useCallback(
    (system: SchoolSystem) => {
      router.push({ pathname: '/system/[id]', params: { id: system.id } });
    },
    [router]
  );

  return (
    <ListScreen<SchoolSystem>
      testID={testID}
      data={SCHOOL_SYSTEMS}
      keyExtractor={(system) => system.id}
      renderItem={(system) => (
        <SchoolSystemCard
          testID={testID ? `${testID}-${system.id}` : undefined}
          title={t(system.titleKey)}
          origin={system.origin}
          state={sessions.states[system.id]}
          openLabel={t('tools.open')}
          onOpen={() => open(system)}
          onClearSession={() => {
            void sessions.clear(system.id);
          }}
        />
      )}
      // ⛔ 无后端、无分页：状态机是**空转**的（永远 idle/data），
      //    但保留 `K05` 是为了四态齐全（出口门 E2）与将来加系统时不改页面
      pagination={{
        refresh: 'idle',
        append: 'idle',
        error: null,
        errorScope: null,
        hasMore: false,
      }}
      onRefresh={() => {
        void sessions.refresh();
      }}
      onEndReached={() => undefined}
      labels={{
        empty: {
          kind: 'broken',
          title: t('tools.systems.empty'),
          actionLabel: t('action.retry'),
          onAction: () => {
            void sessions.refresh();
          },
        },
        endLabel: undefined,
      }}
      numColumns={1}
      style={[{ padding: theme.space('space_2') }, style]}
    />
  );
}

/** 页面级组合：说明条 + 列表（骨架自带安全区，`K05` 只负责列表本体） */
export function SchoolSystemScreen(): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Screen testID="screen-school-systems" titleKey="tools.systems.title" bottomMode="own">
      <View style={{ flex: 1, gap: theme.space('space_2') }}>
        <View style={{ paddingHorizontal: theme.space('space_4') }}>
          <InlineNotice testID="school-session-notice" tone="info" message={t('tools.sessions.notice')} />
        </View>
        <SchoolSystemList testID="school-system-list" />
      </View>
    </Screen>
  );
}
