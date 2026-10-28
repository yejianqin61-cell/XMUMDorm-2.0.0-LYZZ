/**
 * `P11` 课表网格 —— 原型骨架（组件定义 §2.7）
 *
 * §2.7 对它的定义：**星期 × 节次**；交互契约：**周切换、今天高亮、课程卡点击、导入入口**
 * （`D15 TimetableGrid` 已降为本骨架的**渲染器**）。
 *
 * 2026-10-18 所有者重做：
 *   ① 卡片必须**同时显示课程名称与上课地点**，并按**课程色**填充（同课同色 / 异课异色）；
 *   ② **时间轴固定 08:00–21:00**，没课的小时也要画出来（空行可见）；
 *   ③ 课程卡按真实起止时间**绝对定位**在轴上（⛔ 不再按"开始时间行"堆叠）。
 *
 * ⚠️ **"节次"落地为"开始时间"**：接口只给 `start_time`/`end_time`，**没有节次编号也没有节次表**
 *   → 时间轴用真实时钟，⛔ 不猜"第几节"。已登记 README §7-12。
 *
 * ⛔ 组件内不写业务文案（星期与提示由页面传词条）；本文件只负责"怎么摆"。
 */

import * as React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import type { MessageKey } from '@/i18n/zh';
import { formatClockTime } from '@/features/me/dashboard';
import type { TimetableMeeting, TimetableWeek } from '@/features/tools/timetable';
import {
  FALLBACK_COURSE_ACCENT,
  TIMETABLE_AXIS_END_HOUR,
  TIMETABLE_AXIS_START_HOUR,
  visibleTimetableWeekdays,
  clockMinutes,
  layoutTimetableCard,
  type CourseAccent,
} from '@/features/tools/timetableView';

export const PROTO_ID = 'P11' as const;

/** 星期列头（`weekday.1..7` 词条） */
const WEEKDAY_KEYS: readonly MessageKey[] = [
  'weekday.1',
  'weekday.2',
  'weekday.3',
  'weekday.4',
  'weekday.5',
  'weekday.6',
  'weekday.7',
];

const pad2 = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

export type TimetableGridProps = {
  week: TimetableWeek;
  /** 显示哪几列（默认周一–周五） */
  visibleWeekdays?: readonly number[];
  /** 课程 → 课程色（由页面按本周分配；缺省时用兜底色） */
  getCourseAccent?: (meeting: TimetableMeeting) => CourseAccent;
  /** 高亮哪一列（`1..7`）；`null` = 不高亮（例如用户翻到了别的周） */
  highlightWeekday?: number | null;
  onPressMeeting?: (meeting: TimetableMeeting) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type PlacedCard = {
  meeting: TimetableMeeting;
  accent: CourseAccent;
  top: number;
  height: number;
  lane: number;
  lanes: number;
};

export function TimetableGrid({
  week,
  visibleWeekdays,
  getCourseAccent,
  highlightWeekday = null,
  onPressMeeting,
  style,
  testID,
}: TimetableGridProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const days = visibleWeekdays ?? visibleTimetableWeekdays(week);
  // 一小时格高 40dp（令牌相加，⛔ 不写裸数字）：13 小时一屏放得下，21:00 不用滚到底才看到
  const hourHeight = theme.space('space_8') + theme.space('space_2');
  const minCardHeight = Math.max(theme.touchTarget + theme.space('space_1'), theme.space('space_12') - theme.space('space_1'));
  let axisStart = TIMETABLE_AXIS_START_HOUR, axisEnd = TIMETABLE_AXIS_END_HOUR;
  for (const day of days) {
    for (const meeting of week.days[day] ?? []) {
      const start = clockMinutes(meeting.startTime), end = clockMinutes(meeting.endTime);
      if (start === null) continue;
      axisStart = Math.min(axisStart, Math.floor(start / 60));
      const endMinute = end === null || end === start ? Math.min(1440, start + 60) : end < start ? 1440 : end;
      axisEnd = Math.max(axisEnd, Math.ceil(endMinute / 60));
    }
  }
  const axisHours = axisEnd - axisStart;
  const axisHeight = axisHours * hourHeight;

  // 每天一张卡列表：先在渲染前算好 top/height（纯函数，可单测）
  const cardsByDay = React.useMemo(() => {
    const resolveAccent = getCourseAccent ?? (() => FALLBACK_COURSE_ACCENT);
    const map = new Map<number, PlacedCard[]>();
    for (const day of days) {
      const placed: PlacedCard[] = [];
      for (const meeting of week.days[day] ?? []) {
        const layout = layoutTimetableCard(meeting, hourHeight, minCardHeight, axisStart, axisEnd);
        if (layout !== null) {
          placed.push({ meeting, accent: resolveAccent(meeting), top: layout.top, height: layout.height, lane: 0, lanes: 1 });
        }
      }
      placed.sort((a, b) => a.top - b.top || b.height - a.height);
      let group: PlacedCard[] = [], laneEnds: number[] = [], groupEnd = -1;
      const finish = () => { for (const card of group) card.lanes = laneEnds.length; };
      for (const card of placed) {
        if (card.top >= groupEnd) { finish(); group = []; laneEnds = []; groupEnd = -1; }
        let lane = laneEnds.findIndex((end) => end <= card.top);
        if (lane < 0) lane = laneEnds.length;
        card.lane = lane;
        laneEnds[lane] = card.top + card.height;
        groupEnd = Math.max(groupEnd, laneEnds[lane]);
        group.push(card);
      }
      finish();
      map.set(day, placed);
    }
    return map;
  }, [week, days.join(','), getCourseAccent, hourHeight, minCardHeight, axisStart, axisEnd]);

  const dayMinWidth = (day: number) => theme.touchTarget * Math.max(1, ...(cardsByDay.get(day) ?? []).map((card) => card.lanes));
  const minWidth = theme.space('space_8') + theme.space('space_2')
    + days.reduce((total, day) => total + dayMinWidth(day) + theme.space('space_1'), 0);

  return (
    <View testID={testID} style={[{ flex: 1 }, style]}>
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, minWidth }}>
      {/* 列头固定，只有下面的时间轴纵向滚动 */}
      <View style={{ flexDirection: 'row', gap: theme.space('space_1') }}>
        <View style={{ width: theme.space('space_8') + theme.space('space_2') }} />
        {days.map((day) => {
          const isToday = highlightWeekday === day;
          return (
            <View
              key={day}
              testID={testID ? `${testID}-head-${day}` : undefined}
              style={{
                flex: 1,
                minWidth: dayMinWidth(day),
                paddingVertical: theme.space('space_1'),
                alignItems: 'center',
                backgroundColor: isToday
                  ? theme.color['bg-brand-soft'].value
                  : theme.color['bg-sunken'].value,
                borderRadius: theme.radius('radius_small'),
              }}
            >
              <Text
                role="caption"
                emphasis={isToday ? 'strong' : 'regular'}
                colorToken={isToday ? 'text-brand' : 'text-secondary'}
                numberOfLines={1}
              >
                {t(WEEKDAY_KEYS[day - 1])}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 08:00–21:00 固定时间轴：没课的小时也是可见的空行 */}
      <ScrollView
        testID={testID ? `${testID}-axis` : undefined}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.space('space_4') }}
      >
        <View style={{ flexDirection: 'row', gap: theme.space('space_1') }}>
          {/* 时间刻度 */}
          <View style={{ width: theme.space('space_8') + theme.space('space_2') }}>
            {Array.from({ length: axisHours }, (_, index) => (
              <View
                key={index}
                testID={testID ? `${testID}-hour-${axisStart + index}` : undefined}
                style={{ height: hourHeight, paddingTop: theme.space('space_1') }}
              >
                <Text role="caption" colorToken="text-muted" numberOfLines={1}>
                  {pad2(axisStart + index)}
                </Text>
              </View>
            ))}
            {/* 末端 21:00 刻度落在轴底 */}
            <View testID={testID ? `${testID}-hour-${axisEnd}` : undefined}>
              <Text role="caption" colorToken="text-muted" numberOfLines={1}>
                {pad2(axisEnd)}
              </Text>
            </View>
          </View>

          {/* 每天一列：背景是整点网格，课程卡绝对定位 */}
          {days.map((day) => (
            <View
              key={day}
              testID={testID ? `${testID}-day-${day}` : undefined}
              style={{
                flex: 1,
                minWidth: dayMinWidth(day),
                height: axisHeight,
                borderLeftWidth: theme.borderWidth('border_width_hairline'),
                borderLeftColor: theme.color['border-subtle'].value,
              }}
            >
              {Array.from({ length: axisHours }, (_, index) => (
                <View
                  key={index}
                  style={{
                    height: hourHeight,
                    borderTopWidth: index === 0 ? 0 : theme.borderWidth('border_width_hairline'),
                    borderTopColor: theme.color['border-subtle'].value,
                    backgroundColor:
                      index % 2 === 1 ? theme.color['bg-sunken'].value : undefined,
                  }}
                />
              ))}

              {(cardsByDay.get(day) ?? []).map(({ meeting, accent, top, height, lane, lanes }) => {
                const name = meeting.courseName ?? meeting.courseCode;
                const venue = meeting.venue ?? t('timetable.noVenue');
                const start = formatClockTime(meeting.startTime);
                const end = formatClockTime(meeting.endTime);
                return (
                  <Pressable
                    key={`${meeting.courseCode}-${meeting.startTime ?? ''}-${meeting.venue ?? ''}`}
                    testID={testID ? `${testID}-card-${meeting.courseCode}` : undefined}
                    onPress={
                      onPressMeeting === undefined ? undefined : () => onPressMeeting(meeting)
                    }
                    disabled={onPressMeeting === undefined}
                    accessibilityRole="button"
                    accessibilityLabel={[name, venue, [start, end].filter(Boolean).join('–')]
                      .filter(Boolean)
                      .join('，')}
                    style={{
                      position: 'absolute',
                      left: `${(lane / lanes) * 100}%`,
                      width: `${100 / lanes}%`,
                      top: top + theme.space('space_1') / 2,
                      height: height - theme.space('space_1'),
                      borderRadius: theme.radius('radius_small'),
                      backgroundColor: theme.color[accent.fill].value,
                      padding: theme.space('space_1'),
                      gap: theme.space('space_1'),
                      overflow: 'hidden',
                    }}
                  >
                    <Text role="caption" emphasis="strong" colorToken={accent.ink} numberOfLines={2}>
                      {name}
                    </Text>
                    <Text role="caption" colorToken={accent.ink} numberOfLines={1}>
                      {venue}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      </View>
      </ScrollView>
    </View>
  );
}
