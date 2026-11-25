/**
 * P3A6 · 广场「今日」pane 渲染
 *
 * 依据：`docs/app/task/广场今日页/T3-今日pane.md`
 *   · 今日课表全量（不截断）+ 四态；
 *   · Moodle 只展示 3 条（由数据层截断），未同步给同步入口；
 *   · 点课程去课表页、点待交去 Moodle 系统页。
 */
import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { TodayPane } from '@/features/square/TodayPane';
import type { AgendaDeadline } from '@/features/square/todayAgenda';
import type { TimetableMeeting, TimetableWeek } from '@/features/tools/timetable';
import type { AppError } from '@/i18n/errors';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/square/useTodayTimetable', () => ({ useTodayTimetable: () => mockTimetable }));
jest.mock('@/features/square/useMoodleAgenda', () => ({ useMoodleAgenda: () => mockAgenda }));
jest.mock('@/features/todos/useTodayTodos', () => ({ useTodayTodos: () => ({ data: mockTodos, loading: false, error: null, reload: jest.fn() }) }));
jest.mock('@/features/todos/todoApi', () => ({ toggleTodo: jest.fn(async () => ({})) }));
let mockTodos: { top: readonly { id: number; title: string }[] } | null = null;

const mockPush = jest.fn();

type PaneTimetable = {
  week: TimetableWeek | null;
  source: 'remote' | 'cache' | null;
  loading: boolean;
  error: AppError | null;
  reload: () => void;
};

let mockTimetable: PaneTimetable;
let mockAgenda: { synced: boolean; deadlines: readonly AgendaDeadline[] };

function meeting(startTime: string, courseCode: string): TimetableMeeting {
  return {
    courseCode,
    courseName: courseCode,
    credit: 3,
    lecturer: null,
    dayOfWeek: 1,
    startTime,
    endTime: startTime,
    venue: 'A101',
  };
}

/** 7 天都给同一份课，避免用例依赖"今天是周几" */
function weekWith(courses: readonly TimetableMeeting[]): TimetableWeek {
  const days: Record<number, readonly TimetableMeeting[]> = {};
  for (let day = 1; day <= 7; day += 1) days[day] = courses;
  return { week: 7, days, currentWeek: 7, totalWeeks: 20 };
}

function deadline(title: string, dueAt: number): AgendaDeadline {
  return { key: title, courseId: 1, courseName: 'Algorithms', title, dueAt };
}

beforeEach(() => {
  mockTimetable = { week: weekWith([]), source: 'remote', loading: false, error: null, reload: jest.fn() };
  mockAgenda = { synced: true, deadlines: [] };
  mockTodos = null;
});

describe('P3A6 今日 pane', () => {
  it('今日课表：两节课都渲染，并按开始时间展示', async () => {
    mockTimetable.week = weekWith([meeting('08:00:00', 'CS101'), meeting('10:00:00', 'CS102')]);
    const view = await renderApp(<TodayPane />);
    expect(view.getByTestId('today-course-0')).toBeTruthy();
    expect(view.getByTestId('today-course-1')).toBeTruthy();
    expect(view.getByText('CS101')).toBeTruthy();
    expect(view.getByText('CS102')).toBeTruthy();
  });

  it('今天没课：显示空态而不是空白', async () => {
    const view = await renderApp(<TodayPane />);
    expect(view.getByText('今天没有课')).toBeTruthy();
  });

  it('Moodle 待交：最多展示 3 条（数据层已截断），点任一条去系统页', async () => {
    mockAgenda = {
      synced: true,
      deadlines: [
        deadline('Task A', Date.now() + 86_400_000),
        deadline('Task B', Date.now() + 2 * 86_400_000),
        deadline('Task C', Date.now() + 3 * 86_400_000),
      ],
    };
    const view = await renderApp(<TodayPane />);
    expect(view.getByTestId('today-deadline-0')).toBeTruthy();
    expect(view.getByTestId('today-deadline-2')).toBeTruthy();
    expect(view.queryByTestId('today-deadline-3')).toBeNull();
    await fireEvent.press(view.getByTestId('today-deadline-1'));
    expect(mockPush).toHaveBeenCalledWith('/system/moodle');
  });

  it('未同步：给出同步入口，点击打开 Moodle 系统页', async () => {
    mockAgenda = { synced: false, deadlines: [] };
    const view = await renderApp(<TodayPane />);
    expect(view.getByText('Moodle 待交尚未同步')).toBeTruthy();
    await fireEvent.press(view.getByTestId('today-moodle-sync'));
    expect(mockPush).toHaveBeenCalledWith('/system/moodle');
  });

  it('今天截止的作业按时间插进课程之间；开课 15 分钟内给「去签到」', async () => {
    // 马来西亚时间 2026-11-26 10:10
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask', 'nextTick'] });
    jest.setSystemTime(new Date('2026-11-26T02:10:00Z'));
    try {
      mockTimetable.week = weekWith([
        { ...meeting('10:00:00', 'CS101'), endTime: '12:00:00' },
        meeting('18:00:00', 'CS102'),
      ]);
      mockAgenda = { synced: true, deadlines: [deadline('Lab 3', Date.parse('2026-11-26T06:00:00Z'))] };
      const view = await renderApp(<TodayPane />);
      const text = JSON.stringify(view.toJSON());
      expect(text.indexOf('CS101')).toBeLessThan(text.indexOf('Lab 3'));
      expect(text.indexOf('Lab 3')).toBeLessThan(text.indexOf('CS102'));
      expect(view.queryByTestId('today-deadlines')).toBeNull();
      expect(view.queryByTestId('today-course-1-checkin')).toBeNull();
      await fireEvent.press(view.getByTestId('today-course-0-checkin'));
      expect(mockPush).toHaveBeenCalledWith('/system/checkin');
    } finally {
      jest.useRealTimers();
    }
  });

  it('今日待办并入时间轴，点勾调用完成接口', async () => {
    mockTodos = { top: [{ id: 5, title: '取快递' }] };
    const view = await renderApp(<TodayPane />);
    expect(view.getByTestId('today-todos')).toBeTruthy();
    await fireEvent.press(view.getByTestId('today-todo-5'));
    expect(jest.requireMock('@/features/todos/todoApi').toggleTodo).toHaveBeenCalledWith(5);
  });

  it('课表首次加载：显示 LoadingState，不显示空态', async () => {
    mockTimetable = { week: null, source: null, loading: true, error: null, reload: jest.fn() };
    const view = await renderApp(<TodayPane />);
    expect(view.getByTestId('today-courses-loading')).toBeTruthy();
    expect(view.queryByText('今天没有课')).toBeNull();
  });
});
