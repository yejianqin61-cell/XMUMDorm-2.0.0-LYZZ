import * as React from 'react';
import { AppState, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { clampWeek, currentTeachingWeek, FALLBACK_TOTAL_WEEKS } from '../../../../shared/config/semesters';
import { getScheduleWeek } from '../../../../shared/api/schedule';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Pressable } from '@/components/ui/Pressable';
import { Screen, useScreenInsets } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/design-system/theme';
import { useSession } from '@/features/auth/session';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { useI18n } from '@/i18n';
import { notificationPermission, type NotificationPermission } from '@/features/notifications/permissions';
import { refreshClassReminders } from './reminders/native';
import { CourseInfoSheet } from './CourseInfoSheet';
import { timetableIdentity } from './cacheIdentity';
import { shouldHighlightToday, todayWeekday, useTimetableWeek, type TimetableMeeting, type TimetableWeek } from './timetable';
import { toToolsError } from './requestError';
import {
  FALLBACK_COURSE_ACCENT,
  visibleTimetableWeekdays,
  courseAccentMap,
  courseKey,
  weekdayTimetableWeek,
  type CourseAccent,
} from './timetableView';

export type TimetableRenderProps = {
  week: TimetableWeek;
  visibleWeekdays: readonly number[];
  getCourseAccent: (meeting: TimetableMeeting) => CourseAccent;
  highlightWeekday: number | null;
  onPressMeeting: (meeting: TimetableMeeting) => void;
  testID: string;
};

let firstPermissionRequest: Promise<NotificationPermission> | null = null;
function requestFirstTimetablePermission(): Promise<NotificationPermission> {
  if (!firstPermissionRequest) {
    firstPermissionRequest = (async () => {
      const status = await notificationPermission.request();
      if (status !== 'unavailable') {
        // Storage failure must not hide the actual OS result.
        await AsyncStorage.setItem('@dorm:timetable-notification-requested', '1').catch(() => undefined);
      }
      return status;
    })().finally(() => { firstPermissionRequest = null; });
  }
  return firstPermissionRequest;
}

function WeekNumbers({ value, totalWeeks, onChange, legacyControls }: { value: number; totalWeeks: number; onChange: (value: number) => void; legacyControls: boolean }) {
  const theme = useTheme();
  const { t } = useI18n();
  const scroll = React.useRef<ScrollView>(null);
  const offsets = React.useRef<Record<number, number>>({});
  React.useEffect(() => {
    const x = offsets.current[value];
    if (x !== undefined) scroll.current?.scrollTo({ x, animated: !theme.reduceMotion });
  }, [value, theme.reduceMotion]);
  return <View testID={legacyControls ? 'timetable-weeks' : undefined}><ScrollView testID="timetable-week-numbers" ref={scroll} horizontal showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ gap: theme.space('space_2'), paddingVertical: theme.space('space_1') }}>
      {Array.from({ length: totalWeeks }, (_, index) => index + 1).map((week) => {
        const selected = week === value;
        return <View key={week}
          onLayout={(event) => {
            const x = event.nativeEvent.layout.x;
            offsets.current[week] = x;
            if (selected) scroll.current?.scrollTo({ x, animated: !theme.reduceMotion });
          }}>
          <Pressable testID={`week-number-${week}`} accessibilityLabel={t('timetable.weekLabel', { n: week })}
            selected={selected} onPress={() => onChange(week)}>
            {/* 周次胶囊：选中 = 品牌填充 + 反白字，未选中 = 下沉底 + 次要字（两对都过对比度门） */}
            <View style={{
              minWidth: theme.space('space_8'),
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: theme.space('space_1'),
              paddingHorizontal: theme.space('space_2'),
              borderRadius: theme.radius('radius_full'),
              backgroundColor: theme.color[selected ? 'action-primary' : 'bg-sunken'].value,
            }}>
              <Text role="label" emphasis={selected ? 'strong' : 'regular'}
                colorToken={selected ? 'text-on-fill' : 'text-secondary'}>{String(week)}</Text>
            </View>
          </Pressable>
        </View>;
      })}
    </ScrollView></View>;
}

/** The navigation/UI owner supplies the existing P11 renderer with its extended inputs. */
export function TimetableScreen({ renderGrid, legacyControls = false }: { renderGrid: (props: TimetableRenderProps) => React.ReactNode; legacyControls?: boolean }): React.ReactElement {
  useSession();
  return <OwnedTimetableScreen key={timetableIdentity().epoch} renderGrid={renderGrid} legacyControls={legacyControls} />;
}

function OwnedTimetableScreen({ renderGrid, legacyControls }: { renderGrid: (props: TimetableRenderProps) => React.ReactNode; legacyControls: boolean }): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const badge = useMailboxBadge();
  const session = useSession();
  const [permission, setPermission] = React.useState<NotificationPermission | null>(null);
  const [reminderStatus, setReminderStatus] = React.useState<'partial' | 'failed' | 'stale' | null>(null);
  const mounted = React.useRef(true);
  const refreshReminders = React.useCallback(async () => {
    try {
      const result = await refreshClassReminders({ title: t('tools.reminders.class.title'),
        body: t('tools.reminders.class.body') });
      if (!mounted.current) return;
      if (result?.status === 'permission-denied') setPermission('denied');
      setReminderStatus(!result || result.status === 'stale' ? 'stale' : result.deferred > 0 ? 'partial' : null);
    } catch {
      if (mounted.current) setReminderStatus('failed');
    }
  }, [t]);
  const refreshRef = React.useRef(refreshReminders);
  refreshRef.current = refreshReminders;
  const retryPermission = React.useCallback(async () => {
    try {
      const status = await requestFirstTimetablePermission();
      if (!mounted.current) return;
      setPermission(status);
      if (status === 'granted') await refreshRef.current();
    } catch {
      if (mounted.current) setPermission('unavailable');
    }
  }, []);
  React.useEffect(() => {
    let active = true;
    mounted.current = true;
    const update = async (firstEntry: boolean) => {
      try {
        let status = await notificationPermission.read();
        if (firstEntry && status === 'undetermined') {
          const asked = await AsyncStorage.getItem('@dorm:timetable-notification-requested');
          if (!asked && active) {
            status = await requestFirstTimetablePermission();
          }
        }
        if (!active) return;
        setPermission(status);
        if (status === 'granted') await refreshRef.current();
      } catch {
        if (active) setPermission('unavailable');
      }
    };
    void update(true);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void update(false);
    });
    return () => { active = false; mounted.current = false; listener.remove(); };
  }, []);
  const [week, setWeek] = React.useState(() => clampWeek(currentTeachingWeek() ?? 1));
  const [selected, setSelected] = React.useState<TimetableMeeting | null>(null);
  const selectWeek = React.useCallback((next: number) => {
    setSelected(null); // 换周后旧课程详情不再成立
    setWeek(next);
  }, []);
  const loadWeek = async (target: number) => {
    const owner = timetableIdentity().epoch;
    try { return await getScheduleWeek(target); }
    catch (error) {
      if (owner !== timetableIdentity().epoch) throw error;
      throw toToolsError(error, await session.handleAuthFailure(error));
    }
  };
  const timetable = useTimetableWeek(week, loadWeek);
  const previousWeek = useTimetableWeek(week > 1 ? week - 1 : week, loadWeek);
  const shown = timetable.week ? { ...weekdayTimetableWeek(timetable.week),
    previousSunday: week > 1 && previousWeek.week?.week === week - 1 ? previousWeek.week.days[7] : [] } : null;
  // 本周课程 → 课程色（同课同色、异课异色）；`null` 时兜底调色板第一色
  const accents = React.useMemo(() => (shown === null ? null : courseAccentMap(shown)), [shown]);
  const resolveAccent = React.useCallback(
    (meeting: TimetableMeeting): CourseAccent =>
      accents?.get(courseKey(meeting)) ?? FALLBACK_COURSE_ACCENT,
    [accents]
  );
  const totalWeeks = shown?.totalWeeks ?? FALLBACK_TOTAL_WEEKS;
  const highlight = shouldHighlightToday(week, shown?.currentWeek ?? null) ? todayWeekday() : null;
  // 选中课程在本周的全部时段（同一 courseCode，跨天/跨时段）
  const occurrences = React.useMemo(() => {
    if (selected === null || shown === null) return [];
    const key = courseKey(selected);
    const list: TimetableMeeting[] = [];
    for (const day of Object.keys(shown.days)) {
      for (const meeting of shown.days[Number(day)] ?? []) {
        if (courseKey(meeting) === key) list.push(meeting);
      }
    }
    if (shown.previousSunday?.includes(selected)) list.push(selected);
    return list;
  }, [selected, shown]);
  const closeSheet = React.useCallback(() => setSelected(null), []);
  return <Screen titleKey="tools.timetable" bottomMode="own" testID="screen-phase3-timetable" {...badge}>
    <View style={{ flex: 1, padding: theme.space('space_4'), gap: theme.space('space_3') }}>
      {permission !== 'granted' ? <View style={{ gap: theme.space('space_1') }}>
        <Text testID="timetable-reminder-explanation" role="body" colorToken="text-secondary">
          {t('me.settings.notifications.description')}
        </Text>
        {permission === 'undetermined' ? <Button testID="timetable-reminder-request" variant="secondary"
          label={t('action.retry')} onPress={() => { void retryPermission(); }} /> : null}
        {permission === 'denied' || permission === 'undetermined' ?
          <Button testID="timetable-reminder-settings" variant="secondary"
            label={t('me.settings.notifications.openSettings')}
            onPress={() => { void notificationPermission.openSettings(); }} /> : null}
        {permission === 'unavailable' ? <Text role="body">{t('me.settings.notifications.unavailable')}</Text> : null}
      </View> : null}
      {permission === 'granted' && reminderStatus ? <View style={{ gap: theme.space('space_1') }}>
        <Text role="body">{t(reminderStatus === 'failed' ? 'tools.moodle.reminders.failed'
          : reminderStatus === 'partial' ? 'tools.moodle.reminders.partial' : 'tools.moodle.reminders.stale')}</Text>
        <Button testID="timetable-reminder-retry" variant="secondary" label={t('action.refresh')}
          onPress={() => { void refreshReminders(); }} />
      </View> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}>
        {legacyControls ? <IconButton testID="timetable-prev" Icon={ChevronLeft} accessibilityLabel={t('timetable.prevWeek')}
          onPress={() => selectWeek(clampWeek(week - 1, totalWeeks))} /> : null}
        <View style={{ flex: 1 }}><WeekNumbers value={week} totalWeeks={totalWeeks} onChange={selectWeek} legacyControls={legacyControls} /></View>
        {legacyControls ? <IconButton testID="timetable-next" Icon={ChevronRight} accessibilityLabel={t('timetable.nextWeek')}
          onPress={() => selectWeek(clampWeek(week + 1, totalWeeks))} /> : null}
      </View>
      {timetable.source === 'cache' ? <OfflineBanner testID="timetable-stale" variant="stale" message={t('timetable.stale')} actionLabel={t('action.refresh')} onAction={timetable.reload} /> : null}
      {timetable.loading && !shown ? <LoadingState testID="timetable-loading" /> : timetable.error && !shown ?
        <ErrorState testID="timetable-error" error={timetable.error} onAction={timetable.reload} /> : shown === null ? null :
        // 2026-10-18：即使这周没课也**画完整时间轴**（08:00–21:00 空着），不再用空态替换网格
          <View style={{ flex: 1 }}>{renderGrid({ week: shown, visibleWeekdays: visibleTimetableWeekdays(shown),
            getCourseAccent: resolveAccent, highlightWeekday: highlight, testID: 'timetable-grid',
            onPressMeeting: setSelected,
          })}</View>}
      {/* 底部固定一行：导入课表 / 刷新（空周也要能导入，所以不依赖 hasData） */}
      <View style={{ flexDirection: 'row', gap: theme.space('space_2') }}>
        <View style={{ flex: 1 }}>
          <Button testID="timetable-import" label={t('import.title')} variant="ghost"
            onPress={() => router.push('/tools/schedule-import')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button testID="timetable-refresh" label={t('action.refresh')} variant="ghost"
            onPress={timetable.reload} />
        </View>
      </View>
    </View>
    {selected !== null ? (
      <TimetableSheetHost
        meeting={selected}
        occurrences={occurrences}
        accent={resolveAccent(selected)}
        onClose={closeSheet}
      />
    ) : null}
  </Screen>;
}

/**
 * 弹窗宿主：`O06 BottomSheet` 需要底部 inset，而 inset 只能由 `Screen` 上下文提供
 * （宪法 17.1-S2/S7）。所以把这一小段放在 `Screen` 子树里，只做"取 inset → 传给容器"。
 */
function TimetableSheetHost(props: {
  meeting: TimetableMeeting;
  occurrences: readonly TimetableMeeting[];
  accent: CourseAccent;
  onClose: () => void;
}): React.ReactElement {
  const screen = useScreenInsets();
  return (
    <CourseInfoSheet
      meeting={props.meeting}
      occurrences={props.occurrences}
      accent={props.accent}
      onClose={props.onClose}
      bottomInset={screen.insets.bottom}
    />
  );
}
