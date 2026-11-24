/**
 * 广场「今日」tab 的内容（2026-10-18 所有者指令）
 *
 * 两块，顺序固定：
 *   ① 今日课表 —— 今天**全部**课程（教学周外显示"今天没有课"）；
 *   ② Moodle 待交 —— 最近 3 条未过期 DDL；未同步时给同步入口。
 *
 * 边界：
 *   · 只读缓存 + 复用课表 hook，⛔ 不在这里发 Moodle 请求；
 *   · 纵向滚动归本 pane，横向手势归广场分页（`nestedScrollEnabled`）；
 *   · 每 60s 重算一次"今天/明天/分钟"，让跨零点与临近 DDL 不会停在旧文案。
 */

import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ErrorState } from '@/components/ui/ErrorState';
import { ListItem } from '@/components/ui/ListItem';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n, type Translate } from '@/i18n';
import { formatClockTime } from '@/features/me/dashboard';
import type { TimetableMeeting } from '@/features/tools/timetable';
import { SquareModuleEntries } from './SquareModuleEntries';
import { AgentEntry } from './AgentEntry';
import { agendaCourses, deadlineWhen } from './todayAgenda';
import { useMoodleAgenda } from './useMoodleAgenda';
import { useTodayTimetable } from './useTodayTimetable';

/** 截止时间的单行文案（课程名 · 今天/明天/日期 + 时钟） */
export function deadlineLine(
  t: Translate,
  deadline: { courseName: string; title: string; dueAt: number },
  now: number
): { title: string; subtitle: string } {
  const when = deadlineWhen(now, deadline.dueAt);
  const date = when === null ? '' : when.ymd.slice(5);
  const clock = when?.clock ?? '';
  const due = when === null
    ? t('square.today.deadlineLater', { date, clock })
    : when.kind === 'today'
      ? t('square.today.deadlineToday', { clock })
      : when.kind === 'tomorrow'
        ? t('square.today.deadlineTomorrow', { clock })
        : t('square.today.deadlineLater', { date, clock });
  return {
    title: deadline.title,
    subtitle: deadline.courseName === '' ? due : `${deadline.courseName} · ${due}`,
  };
}

export function TodayPane(): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const timetable = useTodayTimetable(now);
  const agenda = useMoodleAgenda(now.getTime());
  const courses = React.useMemo<TimetableMeeting[]>(
    () => (timetable.week === null ? [] : agendaCourses(timetable.week, now)),
    [timetable.week, now]
  );

  const loadingCourses = timetable.loading && timetable.week === null;

  return (
    <ScrollView
      testID="today-pane"
      nestedScrollEnabled
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: theme.space('space_4'),
        paddingBottom: theme.space('space_8'),
        gap: theme.space('space_6'),
      }}
    >
      <Surface testID="today-courses" rounded="radius_large" padding="space_4" style={{ gap: theme.space('space_2') }}>
        <SectionHeader title={t('square.today.courses')} />
        {loadingCourses ? (
          <LoadingState testID="today-courses-loading" />
        ) : timetable.error?.kind === 'signin' && timetable.week === null ? (
          // 游客：一行入口，别让一整屏中间只剩「去登录」
          <ListItem
            testID="today-courses-signin"
            title={t('error.signin.perceive')}
            subtitle={t('error.signin.understand')}
            onPress={() => router.push('/login')}
          />
        ) : timetable.error !== null && timetable.week === null ? (
          <ErrorState
            testID="today-courses-error"
            error={timetable.error}
            onAction={timetable.reload}
          />
        ) : courses.length === 0 ? (
          <Text role="body" colorToken="text-secondary">
            {t('square.today.noCourses')}
          </Text>
        ) : (
          courses.map((course, index) => (
            <ListItem
              key={`${course.courseCode}:${course.startTime ?? ''}:${index}`}
              testID={`today-course-${index}`}
              title={course.courseName ?? course.courseCode}
              subtitle={t('tools.dashboard.courseLine', {
                start: formatClockTime(course.startTime),
                end: formatClockTime(course.endTime),
                venue: course.venue ?? t('tools.dashboard.noVenue'),
              })}
              meta={formatClockTime(course.startTime)}
              onPress={() => router.push('/tools/timetable')}
            />
          ))
        )}
      </Surface>

      <Surface testID="today-deadlines" rounded="radius_large" padding="space_4" style={{ gap: theme.space('space_2') }}>
        <SectionHeader title={t('square.today.deadlines')} />
        {!agenda.synced ? (
          <ListItem
            testID="today-moodle-sync"
            title={t('square.today.moodleUnsynced')}
            subtitle={t('square.today.moodleSync')}
            onPress={() => router.push('/system/moodle')}
          />
        ) : agenda.deadlines.length === 0 ? (
          <Text role="body" colorToken="text-secondary">
            {t('square.today.noDeadlines')}
          </Text>
        ) : (
          agenda.deadlines.map((deadline, index) => {
            const line = deadlineLine(t, deadline, now.getTime());
            return (
              <ListItem
                key={deadline.key}
                testID={`today-deadline-${index}`}
                title={line.title}
                subtitle={line.subtitle}
                onPress={() => router.push('/system/moodle')}
              />
            );
          })
        )}
      </Surface>
      {/* 常用入口（原型：时间轴之下的一排小卡，不再常驻在所有 Tab 上方） */}
      <SquareModuleEntries />
      <AgentEntry />
    </ScrollView>
  );
}
