/**
 * `T-02` 课程表 / Timetable（页面清单 `T-02`，父 `T-01`，原型 `P11`）
 *
 * - 数据：`GET /api/schedule/week?week=N`（**必须显式传周次**；第 1 周与第 10 周不一样）
 * - 周切换：`C14 SegmentedControl`（页面清单指定）—— 它**上限 5 项**，而一学期 ~20 周，
 *   所以用**窗口 + 左右平移**（`weekWindow`）。
 * - 今天高亮：**只有显示的就是当前教学周时**才高亮（否则翻到第 3 周也会点亮今天那一列）。
 * - 本地优先：先给缓存再打远端，失败**不清空已有内容**，并标出「不是最新」（宪法 10.6）。
 * - 四态齐全（出口门 E2）：`T03` 加载 / `T01` 空（去导入）/ `T02` 错误 / 有数据。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { LoadingState } from '@/components/ui/LoadingState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { TimetableGrid } from '@/proto/P11';
import { getScheduleWeek } from '../../../../shared/api/schedule';
import { useSession } from '@/features/auth/session';
import {
  WEEK_WINDOW_SIZE,
  shouldHighlightToday,
  todayWeekday,
  useTimetableWeek,
  weekHasMeetings,
  weekWindow,
} from '@/features/tools/timetable';
import { FALLBACK_TOTAL_WEEKS, clampWeek } from '../../../../shared/config/semesters';
import { timetableIdentity } from '@/features/tools/cacheIdentity';

export default function TimetableScreen(): React.ReactElement {
  const badge = useMailboxBadge();
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const session = useSession();
  const toast = useToast();

  // 默认显示"当前教学周"；服务端未开学/已结束时给 1
  const [week, setWeek] = React.useState(1);
  const [totalWeeks, setTotalWeeks] = React.useState(FALLBACK_TOTAL_WEEKS);

  /**
   * ⚠️ **鉴权失败必须在这里处理**（P1-13 的接缝），而不是在 `T02` 的 onAction 里：
   *    接缝要的是**抛出来的原始错误**（带 `status`/`body`），而 hook 存下来的是
   *    `AppError`（已经没有 `status` 了）→ 拿 AppError 去分类只会得到 `other`。
   *    所以这里包一层：原始错误 → `handleAuthFailure`（会话失效就清令牌）→ 抛 `AppError`。
   */
  const fetchWeek = React.useCallback(
    async (target: number) => {
      const owner = timetableIdentity().epoch;
      try {
        return await getScheduleWeek(target);
      } catch (error) {
        if (owner !== timetableIdentity().epoch) throw error;
        throw await session.handleAuthFailure(error);
      }
    },
    [session]
  );

  const timetable = useTimetableWeek(week, fetchWeek);

  // 拿到数据后同步"总周数"，并把当前周作为默认值（只做一次）
  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (initialized.current) return;
    if (timetable.week === null) return;
    initialized.current = true;
    setTotalWeeks(timetable.week.totalWeeks);
    if (timetable.week.currentWeek !== null) setWeek(clampWeek(timetable.week.currentWeek, timetable.week.totalWeeks));
  }, [timetable.week]);

  const window = weekWindow(week, totalWeeks, WEEK_WINDOW_SIZE);
  const highlight = shouldHighlightToday(week, timetable.week?.currentWeek ?? null)
    ? todayWeekday()
    : null;

  const stepWindow = (direction: -1 | 1): void => {
    setWeek(clampWeek(week + direction * WEEK_WINDOW_SIZE, totalWeeks));
  };

  const hasData = timetable.week !== null && weekHasMeetings(timetable.week);

  return (
    <Screen testID="screen-timetable" titleKey="tools.timetable" bottomMode="own" {...badge}>
      <View style={{ flex: 1, padding: theme.space('space_4'), gap: theme.space('space_3') }}>
        {/* 周切换：窗口 ≤5 项（`C14` 的硬上限），左右平移一整屏 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}>
          <IconButton
            testID="timetable-prev"
            Icon={ChevronLeft}
            accessibilityLabel={t('timetable.prevWeek')}
            onPress={() => stepWindow(-1)}
          />
          <View style={{ flex: 1 }}>
            <SegmentedControl
              testID="timetable-weeks"
              options={window.map((value) => ({
                value: String(value),
                label: t('timetable.weekLabel', { n: value }),
              }))}
              value={String(week)}
              onChange={(next) => setWeek(Number(next))}
            />
          </View>
          <IconButton
            testID="timetable-next"
            Icon={ChevronRight}
            accessibilityLabel={t('timetable.nextWeek')}
            onPress={() => stepWindow(1)}
          />
        </View>

        {/* 不是最新（本地优先的可见化，宪法 10.6） */}
        {timetable.source === 'cache' ? (
          <OfflineBanner
            testID="timetable-stale"
            variant="stale"
            message={t('timetable.stale')}
            actionLabel={t('action.refresh')}
            onAction={timetable.reload}
          />
        ) : null}

        {timetable.loading && timetable.week === null ? (
          <LoadingState testID="timetable-loading" />
        ) : timetable.error !== null && timetable.week === null ? (
          <ErrorState
            testID="timetable-error"
            error={timetable.error}
            onAction={timetable.reload}
          />
        ) : !hasData ? (
          <EmptyState
            testID="timetable-empty"
            kind="firstRun"
            title={t('timetable.empty')}
            actionLabel={t('import.title')}
            onAction={() => router.push('/tools/schedule-import')}
          />
        ) : (
          <>
            <TimetableGrid
              testID="timetable-grid"
              week={timetable.week!}
              highlightWeekday={highlight}
              onPressMeeting={(meeting) => {
                // ⚠️ 页面清单只要求"课程卡可点"，**没有课程详情页**（也不在组件/原型清单里）
                //    → 用一条回执把该课的时间与地点说清楚，⛔ **不假跳一个不存在的路由**
                toast.show({
                  message: t('timetable.courseInfo', {
                    name: meeting.courseName ?? meeting.courseCode,
                    when: [meeting.startTime, meeting.endTime].filter(Boolean).join('-'),
                    venue: meeting.venue ?? '',
                  }),
                  tone: 'info',
                });
              }}
            />
            <InlineNotice
              testID="timetable-import-entry"
              tone="info"
              message={t('timetable.importHint')}
              actionLabel={t('import.title')}
              onAction={() => router.push('/tools/schedule-import')}
            />
          </>
        )}

        {/* 手动刷新（下滑刷新留给 `T06`，这里给一个显式入口） */}
        <View style={{ flexDirection: 'row' }}>
          <Button
            testID="timetable-reload"
            label={t('action.refresh')}
            variant="ghost"
            onPress={timetable.reload}
          />
        </View>
        <Text role="caption" colorToken="text-muted">{t('timetable.semesterNote')}</Text>
      </View>
    </Screen>
  );
}
