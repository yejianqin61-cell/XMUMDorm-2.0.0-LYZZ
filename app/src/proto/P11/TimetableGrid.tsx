/**
 * `P11` 课表网格 —— 原型骨架（组件定义 §2.7）
 *
 * §2.7 对它的定义：**星期 × 节次**；交互契约：**周切换、今天高亮、课程卡点击、导入入口**
 * （`D15 TimetableGrid` 已降为本骨架的**渲染器**）。
 *
 * ⚠️ **落点**：与 `P3`/`P16` 同规 —— 原型骨架落 `src/proto/`（§1.2 豁免 9.14-③），
 *   收尾时回写 §2.7（宪法 15.4-3）。
 *
 * ⚠️ **"节次"落地为"开始时间"**：接口（`GET /schedule/week`）只给
 *   `start_time`/`end_time`，**没有节次编号也没有节次表** → 行键用开始时间，
 *   ⛔ 不去猜"第几节"（那会凭记忆造一张节次表）。已登记 README §7-12。
 *
 * ⛔ 组件内不写业务文案（星期与提示由页面传词条）；本文件只负责"怎么摆"。
 */

import * as React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { Pressable } from '@/components/ui/Pressable';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import type { MessageKey } from '@/i18n/zh';
import { buildTimetableRows, type TimetableMeeting, type TimetableWeek } from '@/features/tools/timetable';

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

export type TimetableGridProps = {
  week: TimetableWeek;
  /** 高亮哪一列（`1..7`）；`null` = 不高亮（例如用户翻到了别的周） */
  highlightWeekday?: number | null;
  onPressMeeting?: (meeting: TimetableMeeting) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function TimetableGrid({
  week,
  highlightWeekday = null,
  onPressMeeting,
  style,
  testID,
}: TimetableGridProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const rows = buildTimetableRows(week.days);
  const timeColumnWidth = theme.space('space_12');

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style} testID={testID}>
      <View>
        {/* 表头：星期（今天那一列**文字加粗 + 底色**，⛔ 不只靠颜色） */}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: timeColumnWidth }} />
          {WEEKDAY_KEYS.map((key, index) => {
            const day = index + 1;
            const isToday = highlightWeekday === day;
            return (
              <View
                key={key}
                testID={testID ? `${testID}-head-${day}` : undefined}
                style={{
                  width: theme.space('space_12'),
                  paddingVertical: theme.space('space_1'),
                  alignItems: 'center',
                  backgroundColor: isToday
                    ? theme.color['bg-brand-soft'].value
                    : undefined,
                  borderRadius: theme.radius('radius_small'),
                }}
              >
                <Text
                  role="label"
                  emphasis={isToday ? 'strong' : 'regular'}
                  colorToken={isToday ? 'text-brand' : 'text-secondary'}
                >
                  {t(key)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 行：开始时间 + 7 列 */}
        {rows.map((row) => (
          <View
            key={row.startTime}
            style={{ flexDirection: 'row', alignItems: 'stretch' }}
            testID={testID ? `${testID}-row-${row.startTime}` : undefined}
          >
            <View style={{ width: timeColumnWidth, paddingVertical: theme.space('space_2') }}>
              <Text role="caption" colorToken="text-muted">
                {row.startTime}
              </Text>
            </View>
            {WEEKDAY_KEYS.map((key, index) => {
              const day = index + 1;
              const cell = row.cells[day] ?? [];
              return (
                <View
                  key={`${row.startTime}-${key}`}
                  style={{ width: theme.space('space_12'), padding: theme.space('space_1') }}
                >
                  {cell.map((meeting) => (
                    <Pressable
                      key={`${meeting.courseCode}-${meeting.startTime ?? ''}-${meeting.venue ?? ''}`}
                      testID={testID ? `${testID}-card-${meeting.courseCode}` : undefined}
                      onPress={
                        onPressMeeting === undefined ? undefined : () => onPressMeeting(meeting)
                      }
                      disabled={onPressMeeting === undefined}
                      accessibilityRole="button"
                      accessibilityLabel={[
                        meeting.courseName ?? meeting.courseCode,
                        meeting.venue,
                      ]
                        .filter(Boolean)
                        .join('，')}
                      style={{ marginBottom: theme.space('space_1') }}
                    >
                      <Surface rounded="radius_small" bordered="subtle" padding="space_1">
                        <View style={{ gap: theme.space('space_1') }}>
                          <Text role="caption" emphasis="strong" colorToken="text-primary" numberOfLines={2}>
                            {meeting.courseName ?? meeting.courseCode}
                          </Text>
                          {meeting.venue ? (
                            <Text role="caption" colorToken="text-muted" numberOfLines={1}>
                              {meeting.venue}
                            </Text>
                          ) : null}
                        </View>
                      </Surface>
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
