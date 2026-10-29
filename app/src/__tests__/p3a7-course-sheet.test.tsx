/**
 * P3A7 · 课表课程详情半屏弹窗
 *
 * 依据：`docs/app/task/课表重做/T3-课程详情弹窗.md`
 *   · 点卡片弹半屏；· 展示全部字段；· 本周安排列出该课所有时段；· 关闭后不 push 路由。
 */
import * as React from 'react';
import { fireEvent, userEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/features/auth/session';
import TimetableScreen from '@/app/tools/timetable';

jest.mock('../../../shared/api/schedule', () => ({ getScheduleWeek: jest.fn() }));
jest.mock('expo-router', () => {
  const state = { pushed: [] as unknown[] };
  return {
    __state: state,
    useRouter: () => ({
      push: (target: unknown) => state.pushed.push(target),
      back: () => undefined,
      canGoBack: () => false,
      replace: () => undefined,
    }),
    useLocalSearchParams: () => ({}),
  };
});

const api = jest.requireMock('../../../shared/api/schedule') as { getScheduleWeek: jest.Mock };
const routerState = jest.requireMock('expo-router').__state as { pushed: unknown[] };

const withProviders = (node: React.ReactElement): React.ReactElement => (
  <SessionProvider>
    <ToastProvider>{node}</ToastProvider>
  </SessionProvider>
);

const payload = (days: Record<string, unknown[]>, week: number) => ({ week, currentWeek: week, totalWeeks: 20, days });

const ENGLISH: Record<string, unknown> = {
  course_code: 'G0173',
  course_name: '大学英语',
  credit: 3,
  lecturer: '张三',
  day_of_week: 1,
  start_time: '08:00',
  end_time: '10:00',
  venue: 'A5#G11',
};

beforeEach(() => {
  api.getScheduleWeek.mockReset();
  routerState.pushed.length = 0;
});

async function openSheet(days: Record<string, unknown[]> = { 1: [ENGLISH] }) {
  api.getScheduleWeek.mockImplementation(async (week: number) => payload(days, week));
  const view = await renderApp(withProviders(<TimetableScreen />));
  await waitFor(() => expect(view.getAllByTestId('timetable-grid-card-G0173').length).toBeGreaterThan(0));
  const user = userEvent.setup();
  await user.press(view.getAllByTestId('timetable-grid-card-G0173')[0]);
  return view;
}

const hidden = { includeHiddenElements: true };

describe('P3A7 课程详情半屏弹窗', () => {
  it('loads the preceding Sunday when the displayed week begins after an overnight course', async () => {
    jest.useFakeTimers({ doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask',
      'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback',
      'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    jest.setSystemTime(new Date('2026-10-05T01:00:00Z'));
    api.getScheduleWeek.mockImplementation(async (week: number) => ({ week, currentWeek: 2, totalWeeks: 14,
      days: week === 1 ? { 7: [{ ...ENGLISH, course_code: 'SUN', day_of_week: 7,
        start_time: '23:30', end_time: '00:30' }] } : { 1: [{ ...ENGLISH,
        course_code: 'SUN', day_of_week: 1, start_time: '10:00', end_time: '11:00' }] } }));
    try {
      const view = await renderApp(withProviders(<TimetableScreen />));
      await waitFor(() => expect(view.getByTestId('timetable-grid-card-SUN-continuation')).toBeTruthy());
      await fireEvent.press(view.getByTestId('timetable-grid-card-SUN-continuation'));
      expect(view.getByTestId('course-sheet-occurrence-0', { includeHiddenElements: true })).toBeTruthy();
      expect(view.getByTestId('course-sheet-occurrence-1', { includeHiddenElements: true })).toBeTruthy();
      expect(api.getScheduleWeek).toHaveBeenCalledWith(1);
      expect(api.getScheduleWeek).toHaveBeenCalledWith(2);
    } finally { jest.useRealTimers(); }
  });
  it('点卡片弹出半屏，显示课程名称与地点', async () => {
    const view = await openSheet();
    expect(view.getByTestId('course-sheet')).toBeTruthy();
    // 卡片上 1 处 + 弹窗标题 1 处
    expect(view.getAllByText('大学英语').length).toBeGreaterThanOrEqual(2);
    expect(view.getByTestId('course-sheet-venue', hidden).props.children).toBe('A5#G11');
  });

  it('弹窗字段完整：课程码 / 时间 / 星期 / 教师 / 学分', async () => {
    const view = await openSheet();
    expect(view.getByTestId('course-sheet-code', hidden).props.children).toBe('G0173');
    expect(view.getByTestId('course-sheet-time', hidden).props.children).toBe('08:00–10:00');
    expect(view.getByTestId('course-sheet-weekday', hidden).props.children).toBe('周一');
    expect(view.getByTestId('course-sheet-lecturer', hidden).props.children).toBe('张三');
    expect(view.getByTestId('course-sheet-credit', hidden).props.children).toBe('3');
  });

  it('本周安排列出同一课程的两个时段', async () => {
    const view = await openSheet({
      1: [ENGLISH],
      3: [{ ...ENGLISH, day_of_week: 3, start_time: '14:00', end_time: '16:00', venue: 'C2#105' }],
    });
    expect(view.getByTestId('course-sheet-occurrence-0', hidden)).toBeTruthy();
    expect(view.getByTestId('course-sheet-occurrence-1', hidden)).toBeTruthy();
    expect(view.queryByTestId('course-sheet-occurrence-2', hidden)).toBeNull();
  });

  it('缺教师/地点时显示"未标注 / 地点待定"，不出现 null', async () => {
    const view = await openSheet({
      1: [{ ...ENGLISH, lecturer: null, venue: null }],
    });
    expect(view.getByTestId('course-sheet-lecturer', hidden).props.children).toBe('未标注');
    expect(view.getByTestId('course-sheet-venue', hidden).props.children).toBe('地点待定');
    expect(view.queryByText('null')).toBeNull();
  });

  it('点关闭键后弹窗消失，且没有 push 任何路由', async () => {
    const view = await openSheet();
    const user = userEvent.setup();
    await user.press(view.getByTestId('course-sheet-close'));
    await waitFor(() => expect(view.queryByTestId('course-sheet')).toBeNull());
    expect(routerState.pushed).toEqual([]);
  });

  it('点遮罩也能关闭', async () => {
    const view = await openSheet();
    const user = userEvent.setup();
    await user.press(view.getByTestId('course-sheet-backdrop'));
    await waitFor(() => expect(view.queryByTestId('course-sheet')).toBeNull());
  });
});
