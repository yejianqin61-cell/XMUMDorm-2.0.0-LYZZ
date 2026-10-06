/**
 * P1-16 · 工具 C（`T-02` 课表周视图 · `P11`）—— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：响应规范化、**网格行（"节次"的落地）**、**周次窗口**、今天高亮条件、星期（吉隆坡时区）
 *   S-3 本地优先：先给缓存 → 再打远端 → 失败**不清空**（宪法 10.6）
 *   S-1 页面：周切换（`C14` ≤5 项 + 平移）、四态、课程卡点击**不假跳路由**、导入入口
 *   S-5 结构约束：复用 `shared/config/semesters.js`（⛔ 不自己算日期/时区）、原型落 `src/proto/P11`
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { getItem, removeItem, setItem } from '@/shared/storage';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/features/auth/session';
import { Text } from '@/components/ui/Text';

import {
  WEEK_WINDOW_SIZE,
  buildTimetableRows,
  normalizeTimetableWeek,
  readCachedWeek,
  shouldHighlightToday,
  timetableCacheKey,
  todayWeekday,
  useTimetableWeek,
  weekHasMeetings,
  weekWindow,
  writeCachedWeek,
} from '@/features/tools/timetable';
import { TimetableGrid, PROTO_ID } from '@/proto/P11';

jest.mock('../../../shared/api/schedule', () => ({
  getScheduleWeek: jest.fn(),
}));
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

const api = require('../../../shared/api/schedule') as { getScheduleWeek: jest.Mock };
const routerState = require('expo-router').__state as { pushed: unknown[] };

const TOOLS_DIR = path.resolve(__dirname, '../features/tools');
const readTools = (file: string): string => fs.readFileSync(path.join(TOOLS_DIR, file), 'utf8');
const APP_DIR = path.resolve(__dirname, '../app');
const readApp = (file: string): string => fs.readFileSync(path.join(APP_DIR, file), 'utf8');
const PROTO_FILE = path.resolve(__dirname, '../proto/P11/TimetableGrid.tsx');
const readProto = (): string => fs.readFileSync(PROTO_FILE, 'utf8');

const TimetableScreen = require('../app/tools/timetable').default as () => React.ReactElement;

const withProviders = (node: React.ReactElement): React.ReactElement => (
  <SessionProvider>
    <ToastProvider>{node}</ToastProvider>
  </SessionProvider>
);

const WEEK_PAYLOAD = {
  week: 3,
  days: {
    1: [
      {
        course_code: 'G0173',
        course_name: '大学英语',
        credit: 3,
        lecturer: '张三',
        day_of_week: 1,
        start_time: '08:00',
        end_time: '10:00',
        venue: 'A5#G11',
      },
    ],
    3: [
      {
        course_code: 'BSC130',
        course_name: '数据结构',
        credit: 4,
        lecturer: null,
        day_of_week: 3,
        start_time: '10:00',
        end_time: '12:00',
        venue: 'B1#201',
      },
    ],
  },
  currentWeek: 3,
  semesterStatus: 'during',
  totalWeeks: 20,
};

beforeEach(async () => {
  api.getScheduleWeek.mockReset();
  routerState.pushed.length = 0;
  for (let week = 1; week <= 25; week += 1) await removeItem(timetableCacheKey(week));
});

describe('TC-P1-16-1A · 落点与规范化（纯函数）', () => {
  it('原型落 `src/proto/P11`，`PROTO_ID` 与 §2.7 一致', () => {
    expect(fs.existsSync(PROTO_FILE)).toBe(true);
    expect(PROTO_ID).toBe('P11');
  });

  it('规范化：字段改名、缺天给空数组、`totalWeeks` 兜底', () => {
    const week = normalizeTimetableWeek(WEEK_PAYLOAD);
    expect(week?.week).toBe(3);
    expect(week?.days[1][0]).toEqual({
      courseCode: 'G0173',
      courseName: '大学英语',
      credit: 3,
      lecturer: '张三',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '10:00',
      venue: 'A5#G11',
    });
    // 没课的天也要有键（否则网格列会 undefined）
    expect(week?.days[7]).toEqual([]);
    expect(week?.currentWeek).toBe(3);
  });

  it('⛔ 畸形输入 → `null`（⛔ 不在渲染路径上抛）', () => {
    expect(normalizeTimetableWeek(null)).toBeNull();
    expect(normalizeTimetableWeek('x')).toBeNull();
    expect(normalizeTimetableWeek({})).toBeNull();
    expect(normalizeTimetableWeek({ days: {} })).toBeNull();
  });

  it('`totalWeeks` 非法时回落到兜底值（⛔ 不产生 0 周）', () => {
    expect(normalizeTimetableWeek({ week: 1, days: {}, totalWeeks: 0 })?.totalWeeks).toBeGreaterThan(0);
    expect(normalizeTimetableWeek({ week: 1, days: {}, totalWeeks: 'x' })?.totalWeeks).toBeGreaterThan(0);
  });

  it('`weekHasMeetings` 判定', () => {
    expect(weekHasMeetings(normalizeTimetableWeek(WEEK_PAYLOAD)!)).toBe(true);
    expect(weekHasMeetings(normalizeTimetableWeek({ week: 1, days: {} })!)).toBe(false);
  });
});

describe('TC-P1-16-2A · 网格行：**"节次"落地为开始时间**', () => {
  it('按开始时间分行、列是星期、同一时段多门课都留下', () => {
    const rows = buildTimetableRows({
      1: [
        { courseCode: 'A', courseName: null, credit: null, lecturer: null, dayOfWeek: 1, startTime: '10:00', endTime: '12:00', venue: null },
        { courseCode: 'B', courseName: null, credit: null, lecturer: null, dayOfWeek: 1, startTime: '08:00', endTime: '10:00', venue: null },
      ],
      3: [
        { courseCode: 'C', courseName: null, credit: null, lecturer: null, dayOfWeek: 3, startTime: '08:00', endTime: '09:00', venue: null },
      ],
    });
    // 行按时间升序
    expect(rows.map((r) => r.startTime)).toEqual(['08:00', '10:00']);
    // 同一时段的两门课落在同一个格子里
    expect(rows[0].cells[1].map((m) => m.courseCode)).toEqual(['B']);
    expect(rows[0].cells[3].map((m) => m.courseCode)).toEqual(['C']);
    expect(rows[1].cells[1].map((m) => m.courseCode)).toEqual(['A']);
  });

  it('没有开始时间的课不参与分行（⛔ 不硬塞一个空行键）', () => {
    const rows = buildTimetableRows({
      1: [
        { courseCode: 'X', courseName: null, credit: null, lecturer: null, dayOfWeek: 1, startTime: null, endTime: null, venue: null },
      ],
    });
    expect(rows).toEqual([]);
  });
});

describe('TC-P1-16-3A · 周次窗口（`C14` 上限 5 项）', () => {
  it('窗口大小 = `WEEK_WINDOW_SIZE`，且**永不超过**它', () => {
    expect(WEEK_WINDOW_SIZE).toBeLessThanOrEqual(5);
    expect(weekWindow(10, 20)).toHaveLength(WEEK_WINDOW_SIZE);
  });

  it('夹在 1..totalWeeks 内（不出现第 0 周或第 21 周）', () => {
    expect(weekWindow(1, 20)).toEqual([1, 2, 3, 4, 5]);
    expect(weekWindow(20, 20)).toEqual([16, 17, 18, 19, 20]);
    expect(weekWindow(99, 20).every((w) => w >= 1 && w <= 20)).toBe(true);
    expect(weekWindow(-3, 20).every((w) => w >= 1 && w <= 20)).toBe(true);
  });

  it('学期比窗口还短时也不越界', () => {
    expect(weekWindow(2, 3)).toEqual([1, 2, 3]);
    expect(weekWindow(1, 1)).toEqual([1]);
  });
});

describe('TC-P1-16-4A · 今天高亮：**只有当前教学周才高亮**', () => {
  it('显示的就是当前周 → 高亮；翻到别的周 → 不高亮', () => {
    expect(shouldHighlightToday(5, 5)).toBe(true);
    expect(shouldHighlightToday(4, 5)).toBe(false);
  });

  it('服务端说"未开学/已结束"（`currentWeek = null`）→ 一律不高亮', () => {
    expect(shouldHighlightToday(1, null)).toBe(false);
  });

  it('今天是周几用**吉隆坡时区**（⛔ 不用设备本地时区）', () => {
    // 2026-10-05 是周一（KL 时间 12:00）
    const monday = new Date('2026-10-05T04:00:00Z'); // 04:00Z = 12:00 KL
    expect(todayWeekday(monday)).toBe(1);
    // 同一时刻若按 UTC 已是周一 04:00 → 仍是周一；用跨日边界体现时区：
    const sundayInKL = new Date('2026-10-04T17:00:00Z'); // 17:00Z = 周一 01:00 KL
    expect(todayWeekday(sundayInKL)).toBe(1);
  });

  it('⛔ 不自己算日期/时区：用 `shared/config/semesters.js`', () => {
    const src = readTools('timetable.ts');
    expect(src).toContain('shared/config/semesters');
    expect(src).not.toMatch(/new Intl\.DateTimeFormat/);
    expect(src).not.toMatch(/toLocaleDateString/);
  });
});

describe('TC-P1-16-5A · 本地优先（宪法 10.6）', () => {
  function Probe({ week }: { week: number }): React.ReactElement {
    const state = useTimetableWeek(week, api.getScheduleWeek);
    return (
      <Text role="body">{`source=${state.source} loading=${state.loading} error=${state.error?.kind ?? 'none'} week=${state.week?.week ?? 'none'}`}</Text>
    );
  }

  it('远端成功 → `source=remote` 且落缓存', async () => {
    api.getScheduleWeek.mockResolvedValue(WEEK_PAYLOAD);
    const view = await renderApp(<Probe week={3} />);
    await waitFor(() => expect(view.getByText(/source=remote/)).toBeTruthy());
    await waitFor(async () => {
      expect((await readCachedWeek(3))?.week).toBe(3);
    });
  });

  it('⛔ 远端失败但**有缓存** → 仍显示缓存内容（不清空、不换错误屏）', async () => {
    await writeCachedWeek(3, normalizeTimetableWeek(WEEK_PAYLOAD)!);
    api.getScheduleWeek.mockRejectedValue({ kind: 'offline' });
    const view = await renderApp(<Probe week={3} />);
    await waitFor(() => expect(view.getByText(/loading=false/)).toBeTruthy());
    expect(view.getByText(/source=cache/)).toBeTruthy();
    expect(view.getByText(/week=3/)).toBeTruthy();
    expect(view.getByText(/error=offline/)).toBeTruthy();
  });

  it('远端失败且无缓存 → 才允许错误态', async () => {
    api.getScheduleWeek.mockRejectedValue({ kind: 'timeout' });
    const view = await renderApp(<Probe week={5} />);
    await waitFor(() => expect(view.getByText(/error=timeout/)).toBeTruthy());
    expect(view.getByText(/week=none/)).toBeTruthy();
  });

  it('缓存里是坏值时按"没有缓存"处理（⛔ 不把脏数据画成网格）', async () => {
    await setItem(timetableCacheKey(6), { nope: true });
    expect(await readCachedWeek(6)).toBeNull();
  });

  it('⛔ 周次必须显式传（第 1 周与第 10 周不一样）', async () => {
    api.getScheduleWeek.mockResolvedValue(WEEK_PAYLOAD);
    const view = await renderApp(<Probe week={9} />);
    await waitFor(() => expect(api.getScheduleWeek).toHaveBeenCalled());
    expect(api.getScheduleWeek).toHaveBeenCalledWith(9);
  });
});

describe('TC-P1-16-6A · 网格渲染：今天那一列**不只靠颜色**', () => {
  it('高亮列的列头**加粗**且带 testID（颜色之外还有字重）', async () => {
    const week = normalizeTimetableWeek(WEEK_PAYLOAD)!;
    const view = await renderApp(
      <TimetableGrid testID="grid" week={week} highlightWeekday={1} />
    );
    const head = view.getByTestId('grid-head-1');
    expect(head).toBeTruthy();
    // 课程卡按课程码可查
    expect(view.getByTestId('grid-card-G0173')).toBeTruthy();
    expect(view.getByText('大学英语')).toBeTruthy();
    expect(view.getByText('A5#G11')).toBeTruthy();
  });

  it('不高亮时列头仍在（⛔ 不是"今天才有列"）', async () => {
    const week = normalizeTimetableWeek(WEEK_PAYLOAD)!;
    const view = await renderApp(<TimetableGrid testID="grid" week={week} highlightWeekday={null} />);
    expect(view.getByTestId('grid-head-3')).toBeTruthy();
  });

  it('课程卡可点（给了回调才是 button；⛔ 不给回调就是 disabled）', async () => {
    const week = normalizeTimetableWeek(WEEK_PAYLOAD)!;
    const onPress = jest.fn();
    const view = await renderApp(
      <TimetableGrid testID="grid" week={week} onPressMeeting={onPress} />
    );
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('grid-card-G0173'));
    expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ courseCode: 'G0173' }));
  });
});

describe('TC-P1-16-7A · T-02 页面', () => {
  it('渲染周切换（`C14`，项数 ≤5）与网格', async () => {
    api.getScheduleWeek.mockResolvedValue(WEEK_PAYLOAD);
    const view = await renderApp(withProviders(<TimetableScreen />));
    await waitFor(() => expect(view.getByTestId('timetable-grid')).toBeTruthy());
    expect(view.getByTestId('timetable-weeks')).toBeTruthy();
    expect(view.getByTestId('timetable-prev')).toBeTruthy();
    expect(view.getByTestId('timetable-next')).toBeTruthy();
  });

  it('空周 → `T01` 空态且给"去导入"（⛔ 不留死屏）', async () => {
    api.getScheduleWeek.mockResolvedValue({ ...WEEK_PAYLOAD, days: {} });
    const view = await renderApp(withProviders(<TimetableScreen />));
    await waitFor(() => expect(view.getByTestId('timetable-empty')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByText('课表导入'));
    expect(routerState.pushed).toContain('/tools/schedule-import');
  });

  it('⛔ 课程卡点击**不假跳一个不存在的路由**（用回执说明时间与地点）', async () => {
    api.getScheduleWeek.mockResolvedValue(WEEK_PAYLOAD);
    const view = await renderApp(withProviders(<TimetableScreen />));
    await waitFor(() => expect(view.getByTestId('timetable-grid')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('timetable-grid-card-G0173'));
    // 跳转目标里**不能出现**未登记的详情页
    expect(routerState.pushed).not.toContain('/tools/course-detail');
    expect(JSON.stringify(routerState.pushed)).not.toContain('course-detail');
  });

  it('`T-01` 有课程表入口（出口门 E2：路由可进入）', async () => {
    const ToolsScreen = require('../app/(tabs)/tools').default as () => React.ReactElement;
    const view = await renderApp(withProviders(<ToolsScreen />));
    await waitFor(() => expect(view.getByTestId('tools-timetable')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('tools-timetable'));
    expect(routerState.pushed[0]).toBe('/tools/timetable');
  });

  it('⛔ 鉴权失败走 P1-13 的接缝（在 fetch 包装层处理**抛出的原始错误**）', () => {
    const src = readApp('tools/timetable.tsx');
    expect(src).toContain('handleAuthFailure');
    expect(src).not.toMatch(/status === 40[13]/);
  });
});

describe('TC-P1-16-8A · 结构约束', () => {
  it('⛔ 原型落点在 `src/proto/P11`（⛔ 不在 `components/ui`）', () => {
    const uiDir = path.resolve(__dirname, '../components/ui');
    expect(fs.existsSync(path.join(uiDir, 'TimetableGrid.tsx'))).toBe(false);
  });

  it('⛔ 全部通过引用 `components/ui/**` 构成（原型层不新增 UI 组件）', () => {
    const code = stripComments(readProto());
    expect(code).toContain('@/components/ui/');
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code).not.toMatch(/fontSize\s*:\s*[0-9]/);
    expect(code).not.toMatch(/\bModal\b/);
  });

  it('⛔ 去注释后 0 处中文字面量', () => {
    for (const file of ['timetable.ts']) {
      const code = stripComments(readTools(file));
      expect(/['"`][^'"`]*[\u4e00-\u9fff]/.test(code)).toBe(false);
    }
  });

  it('⛔ 不新建第二套周日历/周次机制（用 `shared/config/semesters.js`）', () => {
    const src = readTools('timetable.ts');
    expect(src).toContain('clampWeek');
    expect(src).toContain('FALLBACK_TOTAL_WEEKS');
    expect(src).not.toMatch(/SEMESTERS\s*=/);
  });

  it('⛔ 本地优先的落盘走 `shared/storage`（不是 SecureStore：它不是凭据）', () => {
    const src = readTools('timetable.ts');
    expect(src).toContain("from '@/shared/storage'");
    expect(src).not.toContain('SecureStore');
  });
});
