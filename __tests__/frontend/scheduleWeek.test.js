/**
 * 课程表「周次」接线回归测试
 *
 * 缺陷（修复前）：`week` 概念在后端是齐的（timetable_meetings.week_start/week_end、
 * /api/schedule/week?week=N 都按周过滤），但**没有任何地方知道现在是第几周**：
 *   - frontend/src/pages/Schedule.jsx  `const FIXED_WEEK = 1`
 *   - frontend/src/pages/MyZone.jsx     getScheduleWeek(1)
 *   - frontend/src/components/shell/PersonalAside.jsx  getScheduleWeek(1)
 *   - services/classReminderPush.js     CLASS_REMINDER_WEEK（默认 1）
 *   - shared/api/schedule.js            getScheduleWeek(week = 1)
 * 结果：课表永远只显示第 1 周；`(Week 9-14)` 的课永远收不到课前提醒。
 *
 * jest 是 testEnvironment: node，frontend/ 的 JSX 跑不起来（package.json type: module），
 * 所以真实逻辑在 shared/config/semesters.js 里做单测（见 __tests__/shared/semester.test.js），
 * 这里只锁住「页面/接口有没有接上那份日历」这个契约。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (...segments) => fs.readFileSync(path.resolve(ROOT, ...segments), 'utf8');

/** 去掉注释再匹配，避免注释里提到旧写法导致误判 */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('课表页默认落在当前周，而不是写死的第 1 周', () => {
  const src = stripComments(read('frontend', 'src', 'pages', 'Schedule.jsx'));

  it('不再有 FIXED_WEEK 常量', () => {
    expect(src).not.toMatch(/FIXED_WEEK/);
  });

  it('从共享学期日历导入周次解析', () => {
    expect(src).toMatch(/from '@shared\/config\/semesters'/);
    expect(src).toMatch(/resolveSemesterContext/);
    expect(src).toMatch(/clampWeek/);
  });

  it('查询用的周次来自状态（可翻周），而不是常量', () => {
    expect(src).toMatch(/QK\.scheduleWeek\(week\)/);
    expect(src).toMatch(/getScheduleWeek\(week\)/);
    expect(src).toMatch(/const \[week, setWeek\] = useState/);
  });

  it('有周次栏：第 N 周 + 日期范围 + 左右翻周', () => {
    expect(src).toContain('schedule-weekbar');
    expect(src).toContain('schedule-weekbar__nav');
    expect(src).toContain('formatWeekDateRangeLabel');
    expect(src).toMatch(/第 \$\{week\} 周/);
  });

  it('不在当前周时提供「回到本周」', () => {
    expect(src).toContain('schedule-weekbar__back');
    expect(src).toMatch(/回到本周/);
    expect(src).toMatch(/isViewingCurrentWeek/);
  });

  it('未开学 / 学期结束后有提示条', () => {
    expect(src).toContain('schedule-semester-note');
    expect(src).toMatch(/status === 'before'/);
    expect(src).toMatch(/status === 'after'/);
  });

  it('「今日课程」只在正看当前周时渲染（翻到别的周时今天不属那一周）', () => {
    expect(src).toMatch(/\{isViewingCurrentWeek \? \(/);
  });

  it('重新导入课表会清掉所有周次的本地缓存', () => {
    expect(src).toMatch(/clearPersistedScheduleWeeks\(\)/);
    expect(src).toMatch(/invalidateQueries\(\{ queryKey: \['schedule', 'week'\] \}\)/);
  });
});

describe('只关心「现在有没有课」的两个入口也按本周查', () => {
  it('MyZone 的当前/下一节课用当前周', () => {
    const src = stripComments(read('frontend', 'src', 'pages', 'MyZone.jsx'));
    expect(src).not.toMatch(/getScheduleWeek\(1\)/);
    expect(src).toMatch(/resolveSemesterContext/);
    expect(src).toMatch(/getScheduleWeek\(scheduleWeek\)/);
    expect(src).toMatch(/enabled: isLoggedIn && scheduleWeek != null/);
  });

  it('侧边栏「今日课程」用当前周，未开学就不发请求', () => {
    const src = stripComments(read('frontend', 'src', 'components', 'shell', 'PersonalAside.jsx'));
    expect(src).not.toMatch(/getScheduleWeek\(1\)/);
    expect(src).toMatch(/resolveSemesterContext/);
    expect(src).toMatch(/getScheduleWeek\(scheduleWeek\)/);
    expect(src).toMatch(/enabled: isLoggedIn && scheduleWeek != null/);
  });
});

describe('接口层不再偷偷把周次默认成 1', () => {
  it('getScheduleWeek 必须显式传周次', () => {
    const src = stripComments(read('shared', 'api', 'schedule.js'));
    expect(src).not.toMatch(/getScheduleWeek\(week = 1\)/);
    expect(src).toMatch(/export function getScheduleWeek\(week\)/);
  });

  it('/api/schedule/week 响应带上当前周次上下文', () => {
    const src = read('routes', 'schedule.js');
    expect(src).toMatch(/resolveSemesterContext/);
    expect(src).toMatch(/currentWeek/);
    expect(src).toMatch(/semesterStatus/);
  });
});

describe('课前提醒跟着周次自动走（修掉线上 bug）', () => {
  it('不再依赖环境变量 CLASS_REMINDER_WEEK', () => {
    const src = stripComments(read('services', 'classReminderPush.js'));
    expect(src).not.toMatch(/CLASS_REMINDER_WEEK/);
    expect(src).toMatch(/resolveSemesterContext/);
    // 未开学 / 学期结束后直接不发
    expect(src).toMatch(/if \(!week\) return;/);
  });

  it('.env.example 不再宣传这个变量', () => {
    const src = stripComments(read('.env.example'));
    expect(src).not.toMatch(/CLASS_REMINDER_WEEK/);
    expect(src).toMatch(/shared\/config\/semesters\.js/);
  });
});

describe('本地缓存按周分开，重新导入时能整体作废', () => {
  it('schedulePersist 导出 clearPersistedScheduleWeeks', () => {
    const src = read('frontend', 'src', 'utils', 'schedulePersist.js');
    expect(src).toMatch(/export function clearPersistedScheduleWeeks/);
    expect(src).toMatch(/KEY_PREFIX/);
  });
});
