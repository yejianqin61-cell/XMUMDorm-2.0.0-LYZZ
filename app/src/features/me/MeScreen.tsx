/**
 * 我的（`M-01`）—— **仪表盘**（P2C-03）
 *
 * ## 为什么这里没有 `src/proto/P7`
 * 组件定义 §2.7 明写 `P7 仪表盘`**没有独立模块**（它是"页面级组合"）→ 本文件就是那个组合。
 *
 * ## 四块内容与**分区降级**
 * 「当前/下一节课 + 今日待办 + 未读 + 等级进度」。四个数据源各自独立：
 * **哪一块挂了只降级哪一块**（`InlineNotice` + 重试），⛔ 不整屏报错 —— 否则"待办接口抖了一下"
 * 会把整页（包括还好的资料与课表）一起吞掉。
 *
 * ## 跨轨依赖（如实记账）
 * 今日课程用 `features/tools/timetable.ts` 的 `useTimetableWeek` —— 那是**乙的课表缓存**。
 * ⛔ 这里刻意不写第二份缓存（纪律 4：不新建第二套机制）；代价是「我的」依赖乙的模块，
 * 这条依赖是**单向只读**的（不 import 乙的页面，只用它的取数外壳与纯函数）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import ListChecks from 'lucide-react-native/icons/list-checks';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ExpBar } from '@/components/ui/ExpBar';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { ListItem } from '@/components/ui/ListItem';
import { MetricRow } from '@/components/ui/MetricRow';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { TAB_BAR_CLEARANCE } from '@/app/(tabs)/_layout';
import { getMe } from '../../../../shared/api/users';
import { getTodayTodos } from '../../../../shared/api/todos';
import { getScheduleWeek } from '../../../../shared/api/schedule';
import { clampWeek, currentTeachingWeek } from '../../../../shared/config/semesters';
import { useTimetableWeek } from '@/features/tools/timetable';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import {
  courseLineParams,
  meetingsOf,
  normalizeTodayTodos,
  summarizeTodayCourses,
  todayDayOfWeek,
  type TodayTodos,
} from './dashboard';
import { ME_ENTRIES, levelNameKey, normalizeProfile, visibleEntries, type MeProfile } from './profile';

type Loadable<T> = { data: T; loading: boolean; failed: boolean };

const EMPTY_PROFILE: MeProfile = {
  id: null,
  displayName: null,
  avatarUri: null,
  level: 1,
  progress: 0,
  progressText: null,
  college: null,
  grade: null,
  major: null,
};

const EMPTY_TODOS: TodayTodos = { total: 0, active: 0, completed: 0, top: [] };

export function MeScreen(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const badge = useMailboxBadge();

  const [profile, setProfile] = React.useState<Loadable<MeProfile>>({
    data: EMPTY_PROFILE,
    loading: true,
    failed: false,
  });
  const [todos, setTodos] = React.useState<Loadable<TodayTodos>>({
    data: EMPTY_TODOS,
    loading: true,
    failed: false,
  });
  const [nonce, setNonce] = React.useState(0);

  /* 周次用共享真源（⛔ 不自己算日期/时区）；课表用**乙的**那一份缓存外壳 */
  // 假期里 `currentTeachingWeek()` 是 null → 夹到第 1 周（今天没课由 `todayWeekday()` 返回 null 表达）
  const week = React.useMemo(() => clampWeek(currentTeachingWeek() ?? 1), []);
  const timetable = useTimetableWeek(week, getScheduleWeek);
  const today = todayDayOfWeek();
  const todayCourses = summarizeTodayCourses(meetingsOf(timetable.week, today));

  React.useEffect(() => {
    let cancelled = false;
    setProfile((prev) => ({ ...prev, loading: true, failed: false }));
    void (async () => {
      try {
        const payload = await getMe();
        if (!cancelled) setProfile({ data: normalizeProfile(payload), loading: false, failed: false });
      } catch {
        if (!cancelled) setProfile((prev) => ({ ...prev, loading: false, failed: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  React.useEffect(() => {
    let cancelled = false;
    setTodos((prev) => ({ ...prev, loading: true, failed: false }));
    void (async () => {
      try {
        const payload = await getTodayTodos();
        if (!cancelled) setTodos({ data: normalizeTodayTodos(payload), loading: false, failed: false });
      } catch {
        if (!cancelled) setTodos((prev) => ({ ...prev, loading: false, failed: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const reload = React.useCallback(() => {
    setNonce((n) => n + 1);
    timetable.reload();
  }, [timetable]);

  const entries = visibleEntries(ME_ENTRIES);
  const firstCourse = todayCourses.first;

  return (
    <Screen
      testID="screen-me"
      titleKey="screen.me"
      bottomMode="tabbar"
      tabBarHeight={TAB_BAR_CLEARANCE}
      {...badge}
    >
      <View style={{ padding: theme.space('space_4'), gap: theme.space('space_4') }}>
        {/* ── 资料卡：头像 + 昵称 + 等级 + 经验 ─────────────────────── */}
        <Card testID="me-profile" variant="outlined" padding="space_4">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_3') }}>
            <Avatar size="space_12" uri={profile.data.avatarUri ?? undefined} />
            <View style={{ flex: 1, gap: theme.space('space_1') }}>
              <Text role="headline" emphasis="strong" colorToken="text-primary" numberOfLines={1}>
                {profile.data.displayName ?? t('auth.signedOut')}
              </Text>
              <LevelBadge
                testID="me-level"
                level={profile.data.level}
                name={t(levelNameKey(profile.data.level))}
                variant="iconWithName"
              />
            </View>
          </View>
          <View style={{ marginTop: theme.space('space_3') }}>
            <ExpBar
              testID="me-exp"
              progress={profile.data.progress}
              text={profile.data.progressText ?? undefined}
              variant="full"
            />
          </View>
          {profile.failed ? (
            <InlineNotice
              testID="me-profile-failed"
              tone="warning"
              message={t('me.section.failed')}
              actionLabel={t('action.retry')}
              onAction={reload}
            />
          ) : null}
          {/* `M-02` 资料编辑的入口就在资料卡上（页面清单：M-02 的入口 = M-01 / M-03） */}
          <View style={{ marginTop: theme.space('space_3') }}>
            <Button
              testID="me-edit-entry"
              label={t('me.edit.entry')}
              variant="secondary"
              size="small"
              onPress={() => router.push('/me/edit')}
            />
          </View>
        </Card>

        {/* ── 指标行：未读 / 今日待办 / 今日课程 ───────────────────── */}
        <MetricRow testID="me-metrics">
          <StatTile testID="me-stat-unread" value={badge.unreadCount} label={t('me.stat.unread')} />
          <StatTile
            testID="me-stat-todos"
            value={todos.loading ? null : todos.data.active}
            placeholder={t('me.valueUnknown')}
            label={t('me.stat.todos')}
          />
          <StatTile
            testID="me-stat-courses"
            value={timetable.loading ? null : todayCourses.count}
            placeholder={t('me.valueUnknown')}
            label={t('me.stat.courses')}
          />
        </MetricRow>

        {/* ── 今日课程：只给第一节 + 还剩几节 ─────────────────────── */}
        <View style={{ gap: theme.space('space_2') }}>
          <SectionHeader title={t('me.stat.courses')} />
          {firstCourse ? (
            <ListItem
              testID="me-course-first"
              title={t('me.courses.line', courseLineParams(firstCourse))}
              subtitle={firstCourse.venue ?? undefined}
              leading={<CalendarDays size={theme.space('space_6')} color={theme.color['icon-secondary'].value} />}
              variant="nav"
              onPress={() => router.push('/tools/timetable')}
            />
          ) : (
            <Text role="body" colorToken="text-secondary" testID="me-courses-none">
              {t('me.courses.none')}
            </Text>
          )}
          {todayCourses.restCount > 0 ? (
            <Text role="caption" colorToken="text-secondary" testID="me-courses-rest">
              {t('me.courses.more', { n: todayCourses.restCount })}
            </Text>
          ) : null}
        </View>

        {/* ── 今日待办：最多 3 条 + 出错只降级这一块 ─────────────── */}
        <View style={{ gap: theme.space('space_2') }}>
          <SectionHeader title={t('me.stat.todos')} />
          {todos.failed ? (
            <InlineNotice
              testID="me-todos-failed"
              tone="warning"
              message={t('me.section.failed')}
              actionLabel={t('action.retry')}
              onAction={reload}
            />
          ) : todos.data.top.length === 0 ? (
            <Text role="body" colorToken="text-secondary" testID="me-todos-none">
              {t('me.todos.none')}
            </Text>
          ) : (
            todos.data.top.map((item) => (
              <ListItem
                key={item.id}
                testID={`me-todo-${item.id}`}
                title={item.title}
                leading={<ListChecks size={theme.space('space_6')} color={theme.color['icon-secondary'].value} />}
              />
            ))
          )}
        </View>

        {/* ── 入口列表：**数据驱动**（加一项就多一行）；未上线的⛔ 不显示 ── */}
        {entries.length > 0 ? (
          <View style={{ gap: theme.space('space_2') }}>
            <SectionHeader title={t('me.entries.title')} />
            {entries.map((entry) => (
              <ListItem
                key={entry.key}
                testID={`me-entry-${entry.key}`}
                title={t(entry.labelKey)}
                variant="nav"
                onPress={() => router.push(entry.route as never)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
