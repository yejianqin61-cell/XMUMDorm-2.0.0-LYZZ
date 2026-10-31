/**
 * 学习日历纯函数（shared/utils/studyCalendar.js）回归测试
 *
 * 锁住四件事：
 * 1. 月历格子周一开头、行数按需（不多出整行空白周）；
 * 2. 教学周来自 shared/config/semesters.js（2026-09-28 = 第 1 周周一）；
 * 3. 「今天还有 N 项待办」只数未完成项，并正确区分逾期 / 今天 / 3 天内 / 无日期；
 * 4. 多天假期覆盖区间内每一天；课表按「周次 + 星期几」取当天的课。
 */
const {
  isoWeekday,
  monthGrid,
  teachingWeekOf,
  teachingWeeksIn,
  holidaysOn,
  classesOn,
  todoState,
  summarizeTodos,
  groupTodosByDate,
  shiftMonth,
  localYmd,
} = require('../../shared/utils/studyCalendar');

const SEMESTERS = [{ id: 'test', nameZh: '测试学期', nameEn: 'Test', startDate: '2026-09-28', weeks: 14 }];

describe('isoWeekday', () => {
  it('周一 = 1，周日 = 7', () => {
    expect(isoWeekday('2026-09-28')).toBe(1);
    expect(isoWeekday('2026-10-31')).toBe(6);
    expect(isoWeekday('2026-11-01')).toBe(7);
  });

  it('非法日期返回 null', () => {
    expect(isoWeekday('2026-02-31')).toBeNull();
  });
});

describe('monthGrid', () => {
  it('2026 年 10 月：周一开头，5 行 35 格，首格是 9 月 28 日', () => {
    const cells = monthGrid(2026, 9);
    expect(cells).toHaveLength(35);
    expect(cells[0]).toMatchObject({ ymd: '2026-09-28', inMonth: false, weekday: 1 });
    expect(cells.find((c) => c.ymd === '2026-10-01')).toMatchObject({ inMonth: true, weekday: 4 });
    expect(cells[34]).toMatchObject({ ymd: '2026-11-01', inMonth: false, weekday: 7 });
  });

  it('2026 年 2 月：1 日是周日，需要 5 行', () => {
    const cells = monthGrid(2026, 1);
    expect(cells).toHaveLength(35);
    expect(cells.filter((c) => c.inMonth)).toHaveLength(28);
    expect(cells[0].weekday).toBe(1);
  });

  it('只返回需要的行数：2026 年 8 月（周六开头，31 天）需要 6 行', () => {
    expect(monthGrid(2026, 7)).toHaveLength(42);
  });
});

describe('teachingWeekOf / teachingWeeksIn', () => {
  it('学期第一天是第 1 周，第 8 天是第 2 周', () => {
    expect(teachingWeekOf('2026-09-28', SEMESTERS)).toEqual({ semesterId: 'test', week: 1 });
    expect(teachingWeekOf('2026-10-04', SEMESTERS)).toEqual({ semesterId: 'test', week: 1 });
    expect(teachingWeekOf('2026-10-05', SEMESTERS)).toEqual({ semesterId: 'test', week: 2 });
  });

  it('学期之外返回 null，不猜周次', () => {
    expect(teachingWeekOf('2026-09-27', SEMESTERS)).toBeNull();
    expect(teachingWeekOf('2027-01-10', SEMESTERS)).toBeNull();
  });

  it('10 月月历覆盖第 1–5 周', () => {
    expect(teachingWeeksIn(monthGrid(2026, 9), SEMESTERS)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('holidaysOn', () => {
  const holidays = [
    { id: 'deepavali', start: '2026-11-08', end: '2026-11-09', nameZh: '屠妖节', nameEn: 'Deepavali' },
    { id: 'xmas', start: '2026-12-25', end: '2026-12-25', nameZh: '圣诞节', nameEn: 'Christmas' },
  ];

  it('多天假期的每一天都算', () => {
    expect(holidaysOn('2026-11-08', holidays).map((h) => h.id)).toEqual(['deepavali']);
    expect(holidaysOn('2026-11-09', holidays).map((h) => h.id)).toEqual(['deepavali']);
    expect(holidaysOn('2026-11-10', holidays)).toEqual([]);
  });

  it('默认使用共享假期表', () => {
    expect(holidaysOn('2026-12-25').length).toBeGreaterThan(0);
  });
});

describe('classesOn', () => {
  const weekData = {
    5: {
      days: {
        1: [{ course_code: 'CST204', start_time: '16:00:00' }],
        6: [
          { course_code: 'B', start_time: '14:00:00' },
          { course_code: 'A', start_time: '09:00:00' },
        ],
      },
    },
  };

  it('按周次 + 星期几取当天的课，并按开始时间排序', () => {
    // 2026-10-31 是第 5 周周六
    expect(classesOn('2026-10-31', weekData, SEMESTERS).map((c) => c.course_code)).toEqual(['A', 'B']);
    expect(classesOn('2026-10-26', weekData, SEMESTERS).map((c) => c.course_code)).toEqual(['CST204']);
  });

  it('该周课表还没加载、或不在教学周时返回空数组', () => {
    expect(classesOn('2026-10-05', weekData, SEMESTERS)).toEqual([]);
    expect(classesOn('2027-03-01', weekData, SEMESTERS)).toEqual([]);
    expect(classesOn('2026-10-31', undefined, SEMESTERS)).toEqual([]);
  });
});

describe('todoState / summarizeTodos', () => {
  const today = '2026-10-31';
  const todos = [
    { id: 1, title: '逾期', due_date: '2026-10-29', is_completed: false },
    { id: 2, title: '今天', due_date: '2026-10-31', due_time: '20:00', is_completed: 0 },
    { id: 3, title: '后天', due_date: '2026-11-02', is_completed: false },
    { id: 4, title: '第三天', due_date: '2026-11-03', is_completed: false },
    { id: 5, title: '下周', due_date: '2026-11-10', is_completed: false },
    { id: 6, title: '无日期', due_date: null, is_completed: false },
    { id: 7, title: '已完成且逾期', due_date: '2026-10-01', is_completed: 1 },
    { id: 8, title: 'ISO 日期格式', due_date: '2026-10-31T00:00:00.000Z', is_completed: false },
  ];

  it('逐条判定状态', () => {
    expect(todos.map((t) => todoState(t, today))).toEqual([
      'overdue', 'today', 'soon', 'soon', 'later', 'undated', 'done', 'today',
    ]);
  });

  it('今天还有 N 项待办：只数未完成项，并分出逾期 / 今天 / 3 天内 / 无日期', () => {
    expect(summarizeTodos(todos, today)).toEqual({ open: 7, overdue: 1, dueToday: 2, dueSoon: 2, undated: 1 });
  });

  it('空输入或非数组时全为 0', () => {
    expect(summarizeTodos(undefined, today)).toEqual({ open: 0, overdue: 0, dueToday: 0, dueSoon: 0, undated: 0 });
  });
});

describe('groupTodosByDate', () => {
  it('按截止日期分组；同一天内未完成在前、再按时间', () => {
    const map = groupTodosByDate([
      { id: 'done', due_date: '2026-11-01', due_time: '08:00', is_completed: true },
      { id: 'late', due_date: '2026-11-01', due_time: '21:00', is_completed: false },
      { id: 'early', due_date: '2026-11-01', due_time: '09:00', is_completed: false },
      { id: 'notime', due_date: '2026-11-01', is_completed: false },
      { id: 'undated', due_date: null, is_completed: false },
    ]);
    expect([...map.keys()]).toEqual(['2026-11-01']);
    expect(map.get('2026-11-01').map((t) => t.id)).toEqual(['early', 'late', 'notime', 'done']);
  });
});

describe('shiftMonth / localYmd', () => {
  it('跨年翻月', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, monthIndex: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, monthIndex: 11 });
  });

  it('本地日期格式化为 YYYY-MM-DD', () => {
    expect(localYmd(new Date(2026, 9, 5))).toBe('2026-10-05');
  });
});
