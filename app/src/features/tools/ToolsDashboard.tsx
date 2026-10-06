import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import BookOpen from 'lucide-react-native/icons/book-open';
import ListChecks from 'lucide-react-native/icons/list-checks';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { currentTeachingWeek, clampWeek } from '../../../../shared/config/semesters';
import { getScheduleWeek } from '../../../../shared/api/schedule';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListItem } from '@/components/ui/ListItem';
import { LoadingState } from '@/components/ui/LoadingState';
import { MetricRow } from '@/components/ui/MetricRow';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { QuickActionGrid } from '@/components/ui/QuickActionGrid';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/features/auth/session';
import { meetingsOf, formatClockTime } from '@/features/me/dashboard';
import { useTodayTodos } from '@/features/todos/useTodayTodos';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import type { AppError } from '@/i18n/errors';
import { SCHOOL_SYSTEMS } from './schoolSystems';
import { todayWeekday, useTimetableWeek } from './timetable';
import { toToolsError } from './requestError';

const SYSTEM_ICONS = { ac: ListChecks, moodle: BookOpen, checkin: ShieldCheck } as const;
export function ToolsDashboardContent({ onRequestError }: { onRequestError?: (error: unknown) => Promise<AppError> }): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const week = clampWeek(currentTeachingWeek() ?? 1);
  const timetable = useTimetableWeek(week, async (target) => {
    try { return await getScheduleWeek(target); }
    catch (error) { throw toToolsError(error, await onRequestError?.(error)); }
  });
  const todos = useTodayTodos(onRequestError);
  const courses = meetingsOf(timetable.week, timetable.week?.currentWeek == null ? null : todayWeekday());
  return <View style={{ padding: theme.space('space_4'), gap: theme.space('space_4') }}>
    <View testID="tools-courses" style={{ gap: theme.space('space_2') }}>
      <SectionHeader title={t('tools.dashboard.schedule')} />
      {timetable.source === 'cache' ? <OfflineBanner testID="tools-courses-stale" variant="stale" message={t('timetable.stale')} actionLabel={t('action.refresh')} onAction={timetable.reload} /> : null}
      {timetable.loading && !timetable.week ? <LoadingState testID="tools-courses-loading" /> : timetable.error && !timetable.week ? <ErrorState testID="tools-courses-error" error={timetable.error} onAction={timetable.reload} /> : courses.length === 0 ? <Text role="body" colorToken="text-secondary">{t('tools.dashboard.noCourses')}</Text> :
        courses.slice(0, 3).map((course, index) => <ListItem key={`${course.courseCode}:${index}`} title={course.courseName ?? course.courseCode} subtitle={t('tools.dashboard.courseLine', { start: formatClockTime(course.startTime), end: formatClockTime(course.endTime), venue: course.venue ?? t('tools.dashboard.noVenue') })} onPress={() => router.push('/tools/timetable')} />)}
      <ListItem testID="tools-timetable" title={t('tools.timetable')} onPress={() => router.push('/tools/timetable')} />
    </View>
    <View testID="tools-today-todos" style={{ gap: theme.space('space_2') }}>
      <SectionHeader title={t('tools.dashboard.todos')} />
      {todos.loading ? <LoadingState testID="tools-todos-loading" /> : todos.error ? <ErrorState testID="tools-todos-error" error={todos.error} onAction={todos.reload} /> : todos.data ? <>
        <Text role="caption">{t('tools.dashboard.todoCount', { total: todos.data.total, completed: todos.data.completed })}</Text>
        <MetricRow><StatTile value={todos.data.active} label={t('tools.dashboard.active')} /><StatTile value={todos.data.completed} label={t('tools.dashboard.completed')} /></MetricRow>
        {todos.data.top.length ? todos.data.top.map((todo) => <ListItem key={todo.id} title={todo.title} onPress={() => router.push({ pathname: '/tools/todos/[id]', params: { id: String(todo.id) } })} />) : <Text role="body" colorToken="text-secondary">{t('tools.dashboard.noTodos')}</Text>}
      </> : null}
      <ListItem testID="tools-todos" title={t('tools.todos.title')} onPress={() => router.push('/tools/todos')} />
    </View>
    <View style={{ gap: theme.space('space_2') }}>
      <SectionHeader title={t('tools.systems.title')} />
      <QuickActionGrid testID="tools-school-actions" actions={SCHOOL_SYSTEMS.map((system) => ({ key: system.id, label: t(system.titleKey), icon: SYSTEM_ICONS[system.id], onPress: () => router.push({ pathname: '/system/[id]', params: { id: system.id } }) }))} />
      <ListItem testID="tools-school-sessions" title={t('tools.systems.title')} subtitle={t('tools.sessions.short')} onPress={() => router.push('/tools/school-systems')} />
      <ListItem testID="tools-schedule-import" title={t('import.title')} subtitle={t('import.pasteHelp')} onPress={() => router.push('/tools/schedule-import')} />
    </View>
    <Button label={t('action.refresh')} variant="ghost" onPress={() => { timetable.reload(); todos.reload(); }} />
  </View>;
}

export function ToolsDashboardScreen(): React.ReactElement {
  const session = useSession();
  return <Screen testID="screen-tools-dashboard" titleKey="screen.tools" bottomMode="own" scroll>
    <ToolsDashboardContent onRequestError={session.handleAuthFailure} />
  </Screen>;
}
