/**
 * 导入预览列表（`ImportPreviewList`）—— **`T-03` 的域组件**
 *
 * ⚠️ 为什么放在 `features/tools/` 而不是 `components/ui/`：
 *   页面清单把它列为 `T-03` 的关键组件，但组件定义 §2.6/§2.3 里**没有它的 ID**，
 *   而它**只有 1 个消费者** → 按 9.14-③「1 处使用 = 就地写」就地实现，
 *   ⛔ 不为它新造一个组件 ID。
 *
 * ⛔ 组件内不写文案（摘要与星期都走词条 + 纯函数映射）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import {
  summarizePreview,
  weekdayLabelKey,
  type ScheduleImportPreview,
} from './scheduleImport';

export type ImportPreviewListProps = {
  preview: ScheduleImportPreview;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ImportPreviewList({
  preview,
  style,
  testID,
}: ImportPreviewListProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const summary = summarizePreview(preview);

  return (
    <View testID={testID} style={[{ gap: theme.space('space_3') }, style]}>
      <Text role="headline" emphasis="strong" colorToken="text-primary" testID={testID ? `${testID}-summary` : undefined}>
        {t('import.summary', { courses: summary.courseCount, meetings: summary.meetingCount })}
      </Text>

      {/* 课程 + 它的上课时间（按课程分组显示，⛔ 不平铺成一堆行） */}
      {preview.courses.map((course) => {
        const meetings = preview.meetings.filter((m) => m.courseCode === course.courseCode);
        return (
          <Surface
            key={course.courseCode}
            testID={testID ? `${testID}-course-${course.courseCode}` : undefined}
            rounded="radius_medium"
            bordered="subtle"
            padding="space_3"
          >
            <View style={{ gap: theme.space('space_1') }}>
              <Text role="label" emphasis="strong" colorToken="text-primary">
                {course.courseName ?? course.courseCode}
              </Text>
              <Text role="caption" colorToken="text-muted">
                {[course.courseCode, course.lecturer, course.credit !== null ? `${course.credit}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {/* 每段上课时间：星期 + 时间 + 地点（星期走词条，⛔ 不显示 1–7 的数字） */}
              {meetings.map((meeting, index) => {
                const dayKey = weekdayLabelKey(meeting.dayOfWeek);
                const when = [dayKey ? t(dayKey) : null, meeting.startTime, meeting.endTime]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <Text
                    key={`${course.courseCode}-${index}`}
                    role="caption"
                    colorToken="text-secondary"
                  >
                    {[when, meeting.venue].filter(Boolean).join(' · ')}
                  </Text>
                );
              })}
              {meetings.length === 0 ? (
                <Text role="caption" colorToken="text-warning">
                  {t('tools.schedule.none')}
                </Text>
              ) : null}
            </View>
          </Surface>
        );
      })}

      {/* 未能解析的行：**如实列出**（⛔ 不吞掉，否则用户不知道少了什么） */}
      {preview.errors.length > 0 ? (
        <Surface
          testID={testID ? `${testID}-errors` : undefined}
          rounded="radius_medium"
          bordered="subtle"
          padding="space_3"
        >
          <View style={{ gap: theme.space('space_1') }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}>
              {/* 警告双通道：图标 + 文案（⛔ 不只靠颜色） */}
              <Icon source={TriangleAlert} size="inline" tint="warning" />
              <Text role="label" colorToken="text-warning">
                {t('import.errorsTitle', { n: preview.errors.length })}
              </Text>
            </View>
            {preview.errors.map((message, index) => (
              <Text key={`err-${index}`} role="caption" colorToken="text-muted">
                {message}
              </Text>
            ))}
          </View>
        </Surface>
      ) : null}
    </View>
  );
}
