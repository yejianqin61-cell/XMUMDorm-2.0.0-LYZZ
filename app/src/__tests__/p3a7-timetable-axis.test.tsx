/**
 * P3A7 · 课表时间轴（08:00–21:00 固定窗口）
 *
 * 依据：所有者 2026-10-18「从早上 8 点一直到晚上 9 点的时间轴都要做出来。就算没课也要空着。」
 *   · 纯规则：分钟解析、卡片在轴上的 top/height、窗口外丢弃、最短可读高度；
 *   · 渲染：整点刻度 08:00…21:00 全在（没课也在），课程卡按真实时间定位。
 */
import * as React from 'react';

import { renderApp } from './helpers/renderApp';
import { TimetableGrid } from '@/proto/P11';
import { normalizeTimetableWeek } from '@/features/tools/timetable';
import {
  TIMETABLE_AXIS_HOURS,
  clockMinutes,
  layoutTimetableCard,
} from '@/features/tools/timetableView';

const HOUR_HEIGHT = 48;
const MIN_CARD_HEIGHT = 44;

const meeting = (overrides: Record<string, unknown> = {}) => ({
  course_code: 'G0173',
  course_name: '大学英语',
  credit: 3,
  lecturer: '张三',
  day_of_week: 1,
  start_time: '08:00',
  end_time: '10:00',
  venue: 'A5#G11',
  ...overrides,
});

const week = (days: Record<string, unknown[]>) =>
  normalizeTimetableWeek({ week: 3, currentWeek: 3, totalWeeks: 20, days })!;

/** `layoutTimetableCard` 吃的是规范化后的 camelCase 会议对象 */
function parsedMeeting(overrides: Partial<{ startTime: string; endTime: string }> = {}) {
  return {
    courseCode: 'G0173',
    courseName: '大学英语',
    credit: 3,
    lecturer: '张三',
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '10:00',
    venue: 'A5#G11',
    ...overrides,
  };
}

function flattenStyle(style: unknown): Record<string, unknown> {
  const list = Array.isArray(style) ? style.flat(Infinity) : [style];
  return Object.assign({}, ...list.filter((item) => item !== null && typeof item === 'object'));
}

describe('P3A7 时间轴纯规则', () => {
  it('解析 HH:MM 与 HH:MM:SS，非法返回 null', () => {
    expect(clockMinutes('08:00')).toBe(480);
    expect(clockMinutes('13:30:00')).toBe(810);
    expect(clockMinutes('')).toBeNull();
    expect(clockMinutes(null)).toBeNull();
    expect(clockMinutes('25:00')).toBeNull();
  });

  it('两小时的课：top = 0、height = 2 × 小时高', () => {
    const layout = layoutTimetableCard(parsedMeeting(), HOUR_HEIGHT, MIN_CARD_HEIGHT)!;
    expect(layout.top).toBe(0);
    expect(layout.height).toBe(96);
  });

  it('半小时的课也有最短可读高度', () => {
    const layout = layoutTimetableCard(
      parsedMeeting({ startTime: '09:00', endTime: '09:30' }),
      HOUR_HEIGHT,
      MIN_CARD_HEIGHT
    )!;
    expect(layout.top).toBe(48);
    expect(layout.height).toBe(MIN_CARD_HEIGHT);
  });

  it('窗口外的课不画（08:00 之前 / 21:00 之后）', () => {
    expect(layoutTimetableCard(parsedMeeting({ startTime: '07:00', endTime: '08:00' }), HOUR_HEIGHT, MIN_CARD_HEIGHT)).toBeNull();
    expect(layoutTimetableCard(parsedMeeting({ startTime: '21:00', endTime: '22:00' }), HOUR_HEIGHT, MIN_CARD_HEIGHT)).toBeNull();
  });

  it('跨出窗口的部分钳到窗口内', () => {
    const layout = layoutTimetableCard(
      parsedMeeting({ startTime: '20:30', endTime: '21:30' }),
      HOUR_HEIGHT,
      MIN_CARD_HEIGHT
    )!;
    expect(layout.top).toBe(600);
    expect(layout.height).toBe(MIN_CARD_HEIGHT);
  });

  it('时间轴行数 = 13（08–09 … 20–21），刻度 14 个（08…21）', () => {
    expect(TIMETABLE_AXIS_HOURS).toBe(13);
    expect(TIMETABLE_AXIS_HOURS).toBe(21 - 8);
  });
});

describe('P3A7 时间轴渲染', () => {
  it('shows a weekend class outside the usual time window', async () => {
    const view = await renderApp(<TimetableGrid testID="grid" week={week({ 6: [meeting({
      course_code: 'LATE', day_of_week: 6, start_time: '22:00', end_time: '23:00',
    })] })} />);
    expect(view.getByTestId('grid-head-6')).toBeTruthy();
    expect(view.getByTestId('grid-hour-22')).toBeTruthy();
    expect(view.getByTestId('grid-card-LATE')).toBeTruthy();
  });

  it('places overlapping courses in separate lanes and both remain actionable', async () => {
    const onPress = jest.fn();
    const view = await renderApp(<TimetableGrid testID="grid" onPressMeeting={onPress}
      week={week({ 1: [meeting(), meeting({ course_code: 'OTHER', start_time: '09:00', end_time: '11:00' })] })} />);
    const first = flattenStyle(view.getByTestId('grid-card-G0173').props.style);
    const second = flattenStyle(view.getByTestId('grid-card-OTHER').props.style);
    expect(first.left).not.toEqual(second.left);
    expect(first.width).toEqual('50%');
    expect(second.width).toEqual('50%');
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('grid-card-G0173'));
    await user.press(view.getByTestId('grid-card-OTHER'));
    expect(onPress.mock.calls.map(([course]: [ { courseCode: string } ]) => course.courseCode)).toEqual(['G0173', 'OTHER']);
  });
  it('没课的周也画完整 08:00–21:00 刻度', async () => {
    const view = await renderApp(<TimetableGrid testID="grid" week={week({})} />);
    expect(view.getAllByTestId(/^grid-hour-/)).toHaveLength(14); // 08…21 共 14 个整点刻度
    expect(view.getByTestId('grid-hour-8')).toBeTruthy();
    expect(view.getByTestId('grid-hour-21')).toBeTruthy();
    expect(view.queryByTestId('grid-card-G0173')).toBeNull();
  });

  it('课程卡按真实时间定位（08:00 → 顶部；10:00 → 两格之后）', async () => {
    const view = await renderApp(
      <TimetableGrid
        testID="grid"
        week={week({ 1: [meeting(), meeting({ course_code: 'BSC130', start_time: '10:00', end_time: '12:00' })] })}
      />
    );
    // 渲染端一小时格高 = 40dp（令牌相加），卡片上下各留 2dp
    const first = flattenStyle(view.getByTestId('grid-card-G0173').props.style);
    const second = flattenStyle(view.getByTestId('grid-card-BSC130').props.style);
    expect(first.top).toBe(2);
    expect(second.top).toBe(82);
    expect(first.height).toBe(76);
  });
});
