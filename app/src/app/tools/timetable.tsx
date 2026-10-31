import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TimetableGrid } from '@/proto/P11';
import { TimetableScreen, type TimetableRenderProps } from '@/features/tools/TimetableScreen';
import { parseFocusCourse, parseFocusWeek } from '@/features/tools/timetableFocus';

/**
 * T-02 route owner: the feature supplies state; P11 remains the shared renderer.
 * 阶段C-03：接受通知/深链带来的 `week` 与 `course`，非法值一律丢弃（回落到当前周）。
 */
export default function TimetableRoute(): React.ReactElement {
  const params = useLocalSearchParams<{ week?: string; course?: string }>();
  const initialWeek = parseFocusWeek(params.week);
  const focusCourseCode = parseFocusCourse(params.course);
  return <TimetableScreen
    initialWeek={initialWeek}
    focusCourseCode={focusCourseCode}
    renderGrid={(props: TimetableRenderProps) => (
      <TimetableGrid
        testID={props.testID}
        week={props.week}
        visibleWeekdays={props.visibleWeekdays}
        getCourseAccent={props.getCourseAccent}
        highlightWeekday={props.highlightWeekday}
        onPressMeeting={props.onPressMeeting}
      />
    )}
    legacyControls
  />;
}
