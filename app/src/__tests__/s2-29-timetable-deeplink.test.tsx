/**
 * 阶段C-03 · 课表定位参数
 *
 * 两层：纯解析/高亮（不依赖 UI）+ 路由是否把参数传进课表（mock 组件只收 props）。
 */
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/features/tools/TimetableScreen', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    TimetableScreen: (props: Record<string, unknown>) => {
      mockTimetableProps(props);
      return <View testID="timetable-probe" />;
    },
  };
});

import * as React from 'react';
import { renderApp } from './helpers/renderApp';
import TimetableRoute from '@/app/tools/timetable';
import {
  focusCourseWeekday,
  parseFocusCourse,
  parseFocusWeek,
} from '@/features/tools/timetableFocus';
import type { TimetableWeek } from '@/features/tools/timetable';

const mockTimetableProps = jest.fn();
let mockParams: { week?: string; course?: string } = {};

const meeting = (courseCode: string, dayOfWeek: number) => ({
  courseCode,
  dayOfWeek,
  startTime: '08:00:00',
  endTime: '09:00:00',
  venue: null,
  courseName: courseCode,
} as never);

const week = (days: Record<number, unknown[]>): TimetableWeek =>
  ({ week: 5, totalWeeks: 16, currentWeek: 5, days } as unknown as TimetableWeek);

beforeEach(() => {
  mockParams = {};
  mockTimetableProps.mockClear();
});

describe('课表定位（阶段C-03）', () => {
  it('周次参数：正整数才接受，非法回落', () => {
    expect(parseFocusWeek('5')).toBe(5);
    expect(parseFocusWeek(5 as never)).toBe(5);
    expect(parseFocusWeek('abc')).toBeNull();
    expect(parseFocusWeek('0')).toBeNull();
    expect(parseFocusWeek('-2')).toBeNull();
    expect(parseFocusWeek(undefined)).toBeNull();
  });

  it('课程码：去空格，空串视为没给', () => {
    expect(parseFocusCourse(' CS101 ')).toBe('CS101');
    expect(parseFocusCourse('')).toBeNull();
    expect(parseFocusCourse(undefined)).toBeNull();
  });

  it('按课程码找出它在本周的星期几；同课跨天取第一个；找不到为 null', () => {
    expect(focusCourseWeekday(week({ 2: [meeting('CS101', 2)] }), 'CS101')).toBe(2);
    expect(
      focusCourseWeekday(week({ 2: [meeting('CS101', 2)], 4: [meeting('CS101', 4)] }), 'CS101')
    ).toBe(2);
    expect(focusCourseWeekday(week({ 2: [meeting('MA201', 2)] }), 'CS101')).toBeNull();
    expect(focusCourseWeekday(null, 'CS101')).toBeNull();
  });

  it('路由把 week/course 传进课表', async () => {
    mockParams = { week: '7', course: 'CS101' };
    await renderApp(<TimetableRoute />);
    expect(mockTimetableProps.mock.calls.at(-1)?.[0]).toMatchObject({
      initialWeek: 7,
      focusCourseCode: 'CS101',
    });
  });

  it('非法参数传 null（回落到当前周）', async () => {
    mockParams = { week: 'oops' };
    await renderApp(<TimetableRoute />);
    expect(mockTimetableProps.mock.calls.at(-1)?.[0]).toMatchObject({
      initialWeek: null,
      focusCourseCode: null,
    });
  });
});
