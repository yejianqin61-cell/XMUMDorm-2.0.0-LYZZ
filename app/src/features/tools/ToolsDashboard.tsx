import * as React from 'react';
import { AppState, View } from 'react-native';
import { useRouter } from 'expo-router';
import BookOpen from 'lucide-react-native/icons/book-open';
import ListChecks from 'lucide-react-native/icons/list-checks';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { currentTeachingWeek, clampWeek, kualaLumpurCalendarParts, resolveSemesterContext, addDaysYmd } from '../../../../shared/config/semesters';
import { getScheduleWeek } from '../../../../shared/api/schedule';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListItem } from '@/components/ui/ListItem';
import { LoadingState } from '@/components/ui/LoadingState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { QuickActionGrid } from '@/components/ui/QuickActionGrid';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/features/auth/session';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { timetableIdentity } from './cacheIdentity';
import { meetingsOf, formatClockTime } from '@/features/me/dashboard';
import { useTodayTodos } from '@/features/todos/useTodayTodos';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import type { AppError } from '@/i18n/errors';
import { SCHOOL_SYSTEMS } from './schoolSystems';
import { requestWeek, todayWeekday, useTimetableWeek, type TimetableMeeting } from './timetable';
import { clockMinutes } from './timetableView';
import { toToolsError } from './requestError';
import { nextHoliday, remainingTodayCourses, schoolClockMinutes, selectCoursesNow } from './todaySummary';
import { HolidaysContent } from './HolidaysScreen';

const SYSTEM_ICONS = { ac: ListChecks, moodle: BookOpen, checkin: ShieldCheck } as const;
export function ToolsDashboardContent({ onRequestError }: { onRequestError?: (error: unknown) => Promise<AppError> }): React.ReactElement {
  const session = useSession();
  const handleError = onRequestError ?? session.handleAuthFailure;
  const { t, locale } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const [holidaysOpen, setHolidaysOpen] = React.useState(false);
  const closeHolidays = React.useCallback(() => setHolidaysOpen(false), []);
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') setNow(new Date()); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const day = kualaLumpurCalendarParts(now).ymd;
  const week = clampWeek(currentTeachingWeek(now) ?? 1);
  const loadWeek = async (target: number) => {
    const owner = timetableIdentity().epoch;
    try { return await getScheduleWeek(target); }
    catch (error) {
      if (owner !== timetableIdentity().epoch) throw error;
      throw toToolsError(error, await handleError(error));
    }
  };
  const timetable = useTimetableWeek(week, loadWeek);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const currentContext = resolveSemesterContext(now);
  const previousContext = resolveSemesterContext(yesterday);
  const sameSemester = currentContext.status === 'during' && previousContext.status === 'during'
    && currentContext.startDate === previousContext.startDate;
  const previousTimetable = useTimetableWeek(sameSemester ? clampWeek(previousContext.week ?? week) : week, loadWeek);
  const todos = useTodayTodos(handleError, day);
  const minutes = schoolClockMinutes(now);
  const todayCourses = remainingTodayCourses(meetingsOf(timetable.week, timetable.week?.currentWeek == null ? null : todayWeekday(now)), minutes);
  const previousCourses = sameSemester ? meetingsOf(previousTimetable.week, todayWeekday(yesterday)) : [];
  const { current, next } = selectCoursesNow(todayCourses, minutes, previousCourses);
  const courses = current && !todayCourses.includes(current) ? [current, ...todayCourses] : todayCourses;
  const [future, setFuture] = React.useState<{ course: TimetableMeeting; date: string } | null>(null);
  const [futureError, setFutureError] = React.useState(false);
  const [futureRetry, setFutureRetry] = React.useState(0);
  React.useEffect(() => {
    let active = true;
    setFuture(null); setFutureError(false);
    const weekday = todayWeekday(now);
    if (!timetable.week || timetable.week.currentWeek === null || next || weekday === null
      || currentContext.status !== 'during') return () => { active = false; };
    const epoch = timetableIdentity().epoch;
    const seek = async () => {
      try {
        for (let target = week; target <= currentContext.totalWeeks; target += 1) {
          const data = target === week ? timetable.week : await requestWeek(target, loadWeek);
          if (!active || timetableIdentity().epoch !== epoch || !data) return;
          const firstDay = target === week ? weekday + 1 : 1;
          for (let targetDay = firstDay; targetDay <= 7; targetDay += 1) {
            const first = [...(data.days[targetDay] ?? [])]
              .filter((item) => clockMinutes(item.startTime) !== null)
              .sort((a, b) => clockMinutes(a.startTime)! - clockMinutes(b.startTime)!)[0];
            if (first) {
              const date = addDaysYmd(day, (target - week) * 7 + targetDay - weekday);
              if (date && active) setFuture({ course: first, date });
              return;
            }
          }
        }
      } catch {
        if (active) setFutureError(true);
      }
    };
    void seek();
    return () => { active = false; };
  }, [day, week, timetable.week, next, currentContext.status, currentContext.totalWeeks, futureRetry]);
  const holiday = nextHoliday(day);
  if (holidaysOpen) return <HolidaysContent now={now} onBack={closeHolidays} />;
  return <View testID="tools-dashboard-content" style={{ padding: theme.space('space_4'), gap: theme.space('space_4') }}>
    <View testID="tools-courses" style={{ gap: theme.space('space_2') }}>
      <SectionHeader title={t('tools.dashboard.schedule')} />
      {current ? <Text role="caption" testID="tools-current-course">{t('tools.dashboard.current', { name: current.courseName ?? current.courseCode })}</Text> : null}
      {next ? <Text role="caption" testID="tools-next-course">{t('tools.dashboard.next', { name: next.courseName ?? next.courseCode })}</Text> : null}
      {!next && future ? <Text role="caption" testID="tools-next-course">{t('tools.dashboard.next', {
        name: `${future.course.courseName ?? future.course.courseCode} (${future.date} ${formatClockTime(future.course.startTime)})`,
      })}</Text> : null}
      {futureError ? <ErrorState testID="tools-next-error" error={{ kind: 'unknown' }} onAction={() => setFutureRetry((value) => value + 1)} /> : null}
      {timetable.source === 'cache' ? <OfflineBanner testID="tools-courses-stale" variant="stale" message={t('timetable.stale')} actionLabel={t('action.refresh')} onAction={timetable.reload} /> : null}
      {timetable.loading && !timetable.week ? <LoadingState testID="tools-courses-loading" /> : timetable.error && !timetable.week ? <ErrorState testID="tools-courses-error" error={timetable.error} onAction={timetable.reload} /> : courses.length === 0 ? <Text role="body" colorToken="text-secondary">{t('tools.dashboard.noCourses')}</Text> :
        courses.slice(0, 3).map((course, index) => <ListItem key={`${course.courseCode}:${index}`} title={course.courseName ?? course.courseCode} subtitle={t('tools.dashboard.courseLine', { start: formatClockTime(course.startTime), end: formatClockTime(course.endTime), venue: course.venue ?? t('tools.dashboard.noVenue') })} onPress={() => router.push('/tools/timetable')} />)}
      <ListItem testID="tools-timetable" title={t('tools.timetable')} onPress={() => router.push('/tools/timetable')} />
    </View>
    <View testID="tools-holidays" style={{ gap: theme.space('space_2') }}>
      <SectionHeader title={t('tools.dashboard.holiday')} />
      <ListItem testID="tools-holiday-open" title={holiday ? t('tools.dashboard.holidayLine', { name: { zh: holiday.nameZh, en: holiday.nameEn }[locale], start: holiday.start, end: holiday.end }) : t('tools.dashboard.noHoliday')} onPress={() => setHolidaysOpen(true)} />
    </View>
    <View testID="tools-today-todos" style={{ gap: theme.space('space_2') }}>
      <SectionHeader title={t('tools.dashboard.todos')} variant="withAction" actionLabel={t('tools.todos.create')} onActionPress={() => router.push('/tools/todos/new')} />
      {todos.loading ? <LoadingState testID="tools-todos-loading" /> : todos.error ? <ErrorState testID="tools-todos-error" error={todos.error} onAction={todos.reload} /> : todos.data ? <>
        <Text role="caption">{t('tools.dashboard.todoCount', { total: todos.data.total, completed: todos.data.completed })}</Text>
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
  const badge = useMailboxBadge();
  return <Screen testID="screen-tools-dashboard" titleKey="screen.tools" bottomMode="own" scroll {...badge}>
    <ToolsDashboardContent onRequestError={session.handleAuthFailure} />
  </Screen>;
}
