/**
 * P2C-03 · `M-01` 我的仪表盘 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：资料归一化（头像 URL 归一化、等级夹紧、缺字段兜底）、今日课程摘要、待办摘要、入口账本；
 *   S-1 页面：四块内容、**分区降级**（一块挂了不吞整页）、四态；
 *   S-5 结构约束：入口只有"路由文件真的存在"时才显示（⛔ 不做 404 入口）。
 *
 * 依据：`docs/app/task/phase-2/P2C-03-M01我的仪表盘.md`。
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { zh } from '@/i18n';
import { MeScreen } from '@/features/me/MeScreen';
import {
  EXPECTED_UNAVAILABLE,
  ME_ENTRIES,
  levelNameKey,
  normalizeProfile,
  visibleEntries,
} from '@/features/me/profile';
import {
  courseLineParams,
  formatClockTime,
  meetingsOf,
  normalizeTodayTodos,
  summarizeTodayCourses,
} from '@/features/me/dashboard';
import { unreadStore } from '@/features/mailbox/unread';
import { secondaryTabStore } from '@/features/navigation/secondaryTabs';
import { clearToken } from '@/features/auth/tokenStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('../../../shared/api/users', () => ({ getMe: jest.fn() }));
jest.mock('../../../shared/api/todos', () => ({ getTodayTodos: jest.fn() }));
jest.mock('../../../shared/api/schedule', () => ({ getScheduleWeek: jest.fn() }));
jest.mock('../../../shared/api/notifications', () => ({ getUnreadSummary: jest.fn() }));

const api = {
  users: require('../../../shared/api/users') as { getMe: jest.Mock },
  todos: require('../../../shared/api/todos') as { getTodayTodos: jest.Mock },
  schedule: require('../../../shared/api/schedule') as { getScheduleWeek: jest.Mock },
  notifications: require('../../../shared/api/notifications') as { getUnreadSummary: jest.Mock },
};

const APP_DIR = path.resolve(__dirname, '..', 'app');

const PROFILE = {
  id: 7,
  username: 'student7',
  nickname: '小明',
  avatar: 'avatars/u7.png',
  level: 3,
  badgeEmoji: '✨',
  levelProgress: { level: 3, exp: 320, currentMin: 300, nextMin: 800, progress: 0.04, progressText: '20/500' },
  college: '信息学院',
  grade: '2025',
  major: '软件工程',
};

const WEEK_PAYLOAD = {
  week: 3,
  currentWeek: 3,
  totalWeeks: 18,
  days: {
    1: [
      { course_code: 'G0173', course_name: '大学英语', day_of_week: 1, start_time: '08:00', end_time: '10:00', venue: 'A5#G11' },
      { course_code: 'G0200', course_name: '高数', day_of_week: 1, start_time: '14:00', end_time: '16:00', venue: 'B2#101' },
    ],
  },
};

beforeEach(async () => {
  // ⚠️ 每个模块是一组函数，不是函数本身 —— 要下探一层
  for (const mod of Object.values(api)) {
    for (const fn of Object.values(mod)) (fn as jest.Mock).mockReset();
  }
  api.users.getMe.mockResolvedValue(PROFILE);
  api.todos.getTodayTodos.mockResolvedValue({ total: 4, completed: 1, active: 3, topItems: [{ id: 9, title: '交作业' }] });
  api.schedule.getScheduleWeek.mockResolvedValue(WEEK_PAYLOAD);
  api.notifications.getUnreadSummary.mockResolvedValue({ total: 2, byType: {}, byModule: {}, byCategory: {} });
  await clearToken();
  unreadStore.reset();
  secondaryTabStore.clear();
});

describe('P2C-03 M-01 我的仪表盘', () => {
  describe('TC-P2C-03-1A · 资料归一化', () => {
    it('缺字段给空、等级夹紧、进度缺失为 0（⛔ 不出现 undefined / NaN）', () => {
      const full = normalizeProfile(PROFILE);
      expect(full.displayName).toBe('小明');
      expect(full.level).toBe(3);
      expect(full.progress).toBeCloseTo(0.04);
      expect(full.progressText).toBe('20/500');
      expect(full.college).toBe('信息学院');

      const sparse = normalizeProfile({ id: 7, level: 99 });
      expect(sparse.displayName).toBeNull();
      expect(sparse.level).toBe(6);
      expect(sparse.progress).toBe(0);
      expect(sparse.progressText).toBeNull();
      expect(String(sparse.progress)).not.toContain('NaN');

      expect(normalizeProfile(null).level).toBe(1);
    });

    it('头像 URL 过 `getUploadUrl`（相对路径在真机上会空白）', () => {
      const uri = normalizeProfile(PROFILE).avatarUri;
      expect(uri).not.toBeNull();
      expect(String(uri)).toContain('u7.png');
      expect(normalizeProfile({ avatar: 'https://cdn.test/a.png' }).avatarUri).toBe('https://cdn.test/a.png');
      expect(normalizeProfile({ avatar: '' }).avatarUri).toBeNull();
    });

    it('等级名走词条（6 级都在词条表里）', () => {
      for (let level = 1; level <= 6; level += 1) {
        expect(Object.keys(zh)).toContain(levelNameKey(level));
      }
      expect(levelNameKey(99)).toBe('me.level.6');
      expect(levelNameKey(0)).toBe('me.level.1');
    });
  });

  describe('TC-P2C-03-2A · 今日课程摘要', () => {
    it('按开始时间排序，给"第一节 + 还剩几节"', () => {
      // ⚠️ 形状是**规范化之后**的 `TimetableMeeting`（camelCase）—— 原始载荷由 `normalizeTimetableWeek` 转
      const meetings = meetingsOf(
        {
          week: 3,
          currentWeek: 3,
          totalWeeks: 18,
          days: {
            1: [
              { courseCode: 'G0200', courseName: '高数', credit: null, lecturer: null, dayOfWeek: 1, startTime: '14:00', endTime: '16:00', venue: 'B2#101' },
              { courseCode: 'G0173', courseName: '大学英语', credit: null, lecturer: null, dayOfWeek: 1, startTime: '08:00', endTime: '10:00', venue: 'A5#G11' },
            ],
          },
        },
        1
      );
      const summary = summarizeTodayCourses(meetings);
      expect(summary.hasAny).toBe(true);
      expect(summary.first?.courseName).toBe('大学英语');
      expect(summary.restCount).toBe(1);
      expect(summary.count).toBe(2);
    });

    it('不是教学周（weekday 为 null）或没有课 → 空摘要', () => {
      expect(meetingsOf({ week: 3, days: {}, currentWeek: null, totalWeeks: 18 }, null)).toEqual([]);
      const empty = summarizeTodayCourses([]);
      expect(empty.hasAny).toBe(false);
      expect(empty.first).toBeNull();
    });

    it('⏱ 时段去秒：真后端给的是 `"14:00:00"`（打真服务实测），⛔ 界面不许显示 `14:00:00`', () => {
      // 这条是"打真服务"逼出来的：mock 里我写的是 '08:00'，真数据带秒
      expect(formatClockTime('14:00:00')).toBe('14:00');
      expect(formatClockTime('08:05:30')).toBe('08:05');
      expect(formatClockTime('9:05:00')).toBe('09:05');
      expect(formatClockTime('14:00')).toBe('14:00');
      expect(formatClockTime(null)).toBe('');
      expect(formatClockTime('')).toBe('');
      expect(formatClockTime('上午')).toBe('上午'); // 认不出来就原样返回，⛔ 不猜

      const line = courseLineParams({
        courseCode: 'BSC129',
        courseName: '离散数学',
        credit: 4,
        lecturer: null,
        dayOfWeek: 1,
        startTime: '14:00:00',
        endTime: '16:00:00',
        venue: 'A4#G01',
      });
      expect(line.time).toBe('14:00');
      expect(line.time).not.toContain(':00:00');
    });
  });

  describe('TC-P2C-03-3A · 待办摘要', () => {
    it('缺字段给 0；缺 id/title 的条目丢掉（⛔ 不渲染出 undefined）', () => {
      const summary = normalizeTodayTodos({ total: 4, completed: 1, active: 3, topItems: [{ id: 9, title: '交作业' }, { title: '没有 id' }, null] });
      expect(summary.active).toBe(3);
      expect(summary.top).toEqual([{ id: 9, title: '交作业' }]);
      expect(normalizeTodayTodos(null)).toEqual({ total: 0, active: 0, completed: 0, top: [] });
    });
  });

  describe('TC-P2C-03-4A · 页面：四块内容都在', () => {
    it('资料卡 + 等级 + 经验 + 三格指标 + 课程 + 待办', async () => {
      const view = await renderApp(<MeScreen />);

      await waitFor(() => expect(view.getByTestId('me-profile')).toBeTruthy());
      expect(view.getByText('小明')).toBeTruthy();
      expect(view.getByTestId('me-level-level').props.children).toBe('3');
      expect(view.getByTestId('me-exp-text').props.children).toBe('20/500');
      expect(view.getByTestId('me-stat-unread')).toBeTruthy();
      expect(view.getByTestId('me-stat-todos')).toBeTruthy();
      expect(view.getByTestId('me-stat-courses')).toBeTruthy();
      await waitFor(() => expect(view.getByTestId('me-todo-9')).toBeTruthy());
      expect(view.getByText('交作业')).toBeTruthy();
    });
  });

  describe('TC-P2C-03-5A · 分区降级：一块挂了不吞整页', () => {
    it('待办接口失败 → 只有待办那格显示错误行，资料卡照常', async () => {
      api.todos.getTodayTodos.mockRejectedValue({ kind: 'offline' });
      const view = await renderApp(<MeScreen />);

      await waitFor(() => expect(view.getByTestId('me-todos-failed')).toBeTruthy());
      expect(view.getByText(zh['me.section.failed'])).toBeTruthy();
      // 资料卡与课程**不受影响**
      expect(view.getByTestId('me-profile')).toBeTruthy();
      expect(view.getByText('小明')).toBeTruthy();
    });
  });

  describe('TC-P2C-03-6A · 入口账本：没落地的路由⛔ 不显示', () => {
    it('账本与实现一致（落地一个就要从这里删一个）', () => {
      const actuallyUnavailable = ME_ENTRIES.filter((entry) => !entry.available).map((entry) => entry.key);
      expect([...actuallyUnavailable].sort()).toEqual([...EXPECTED_UNAVAILABLE].sort());
    });

    it('每个 `available: true` 的入口，路由文件**真的在磁盘上**（⛔ 不做 404 入口）', () => {
      for (const entry of ME_ENTRIES.filter((item) => item.available)) {
        const rel = entry.route.replace(/^\//, '');
        const candidates = [
          path.join(APP_DIR, `${rel}.tsx`),
          // ⚠️ 也要认 index 路由（`/me/legal` 落在 `me/legal/index.tsx`）
          path.join(APP_DIR, rel, 'index.tsx'),
        ];
        expect({ route: entry.route, exists: candidates.some((file) => fs.existsSync(file)) }).toEqual({
          route: entry.route,
          exists: true,
        });
      }
    });

    it('只有 `available` 的入口会显示；账本里还没落地的**一个都不出现**', () => {
      const shown = visibleEntries().map((entry) => entry.key);
      const available = ME_ENTRIES.filter((entry) => entry.available).map((entry) => entry.key);
      expect(shown).toEqual(available);
      for (const key of EXPECTED_UNAVAILABLE) {
        expect(shown).not.toContain(key);
      }
    });
  });
});
