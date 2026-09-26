/**
 * 学期周次（Week）回归测试
 *
 * 背景：课表数据里每条上课安排早就带了 week_start/week_end（如 `(Week 9-14)`），
 * 后端 /api/schedule/week?week=N 也一直按周过滤；但「今天算第几周」没有任何地方知道——
 * 前端写死 `FIXED_WEEK = 1`，课前提醒用环境变量 CLASS_REMINDER_WEEK（默认 1）。
 * 结果：课表永远显示第 1 周；`(Week 9-14)` 的课永远收不到提醒，
 * 而 `(Week 1-14)` 的课在学期结束后还在推。
 *
 * 现在「第几周」由 shared/config/semesters.js 统一回答，这里锁住它的行为。
 *
 * 关键约定（写错会导致整站周次偏移一周）：
 * - 第 1 周第 1 天 = startDate = 2026-09-28（周一）
 * - 周次边界按**吉隆坡时间**周一 00:00 切，不是服务器/浏览器本地时区
 */
const {
  SEMESTERS,
  FALLBACK_TOTAL_WEEKS,
  KL_TIME_ZONE,
  resolveSemesterContext,
  findSemesterContaining,
  weekDateRange,
  semesterEndYmd,
  formatWeekDateRangeLabel,
  formatYmdLabel,
  currentTeachingWeek,
  validateSemesterCalendar,
  clampWeek,
  parseYmd,
  addDaysYmd,
  ymdToDayNumber,
  kualaLumpurCalendarParts,
} = require('../../shared/config/semesters');

/** 吉隆坡某天的 12:00（UTC+8 → 04:00Z），避免落在日界附近 */
const kl = (ymd) => new Date(`${ymd}T04:00:00Z`);

const SEM = SEMESTERS[0];

describe('学期日历本身是健康的', () => {
  it('startDate 必须是周一、区间不重叠、周数合法', () => {
    expect(validateSemesterCalendar(SEMESTERS)).toEqual([]);
  });

  it('当前配置的学期就是 2026-09-28 开学、共 14 周', () => {
    expect(SEM.startDate).toBe('2026-09-28');
    expect(SEM.weeks).toBe(14);
  });

  it('validateSemesterCalendar 能抓出「startDate 不是周一」', () => {
    const problems = validateSemesterCalendar([
      { id: 'bad', nameZh: '', nameEn: '', startDate: '2026-09-29', weeks: 14 },
    ]);
    expect(problems.join('|')).toContain('不是周一');
  });

  it('validateSemesterCalendar 能抓出 id 重复 / weeks 非法 / 区间重叠 / 空日历', () => {
    expect(validateSemesterCalendar([]).join('|')).toContain('为空');
    expect(
      validateSemesterCalendar([
        { id: 'a', startDate: '2026-09-28', weeks: 14 },
        { id: 'a', startDate: '2027-03-01', weeks: 14 },
      ]).join('|')
    ).toContain('id 重复');
    expect(validateSemesterCalendar([{ id: 'a', startDate: '2026-09-28', weeks: 0 }]).join('|')).toContain(
      'weeks 非法'
    );
    expect(
      validateSemesterCalendar([
        { id: 'a', startDate: '2026-09-28', weeks: 14 },
        { id: 'b', startDate: '2026-12-28', weeks: 14 },
      ]).join('|')
    ).toContain('重叠');
  });
});

describe('第 1 周从 2026-09-28 开始', () => {
  it('开学当天是第 1 周', () => {
    const c = resolveSemesterContext(kl('2026-09-28'));
    expect(c.status).toBe('during');
    expect(c.week).toBe(1);
  });

  it('第 1 周是 9/28 ~ 10/4（周一到周日）', () => {
    expect(weekDateRange(SEM, 1)).toEqual({ start: '2026-09-28', end: '2026-10-04' });
    // 周日仍属于第 1 周
    expect(resolveSemesterContext(kl('2026-10-04')).week).toBe(1);
  });

  it('下一个周一是第 2 周', () => {
    expect(resolveSemesterContext(kl('2026-10-05')).week).toBe(2);
    expect(resolveSemesterContext(kl('2026-10-11')).week).toBe(2);
    expect(resolveSemesterContext(kl('2026-10-12')).week).toBe(3);
  });

  it('每周自动跟进：连续 14 个周一依次是第 1..14 周', () => {
    const weeks = [];
    for (let i = 0; i < 14; i += 1) {
      const monday = addDaysYmd(SEM.startDate, i * 7);
      weeks.push(resolveSemesterContext(kl(monday)).week);
    }
    expect(weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it('每周里的每一天都落在同一周（含周日 23:59 吉隆坡时间）', () => {
    for (let d = 0; d < 14 * 7; d += 1) {
      const ymd = addDaysYmd(SEM.startDate, d);
      const expected = Math.floor(d / 7) + 1;
      // 该天吉隆坡 00:30 与 23:59 都应是同一周
      const early = new Date(`${addDaysYmd(ymd, -1)}T16:30:00Z`); // 当天 00:30 KL
      const late = new Date(`${ymd}T15:59:00Z`); // 当天 23:59 KL
      expect(resolveSemesterContext(early).week).toBe(expected);
      expect(resolveSemesterContext(late).week).toBe(expected);
    }
  });

  it('最后一周是第 14 周：12/28 ~ 2027-01-03', () => {
    expect(weekDateRange(SEM, 14)).toEqual({ start: '2026-12-28', end: '2027-01-03' });
    expect(semesterEndYmd(SEM)).toBe('2027-01-03');
    expect(resolveSemesterContext(kl('2026-12-28')).week).toBe(14);
    expect(resolveSemesterContext(kl('2027-01-03')).week).toBe(14);
  });
});

describe('周次边界按吉隆坡时间算，不是本地时区', () => {
  it('2026-09-27 23:59 KL 还没开学；00:00 KL 就是第 1 周', () => {
    expect(kualaLumpurCalendarParts(new Date('2026-09-27T15:59:00Z')).ymd).toBe('2026-09-27');
    expect(kualaLumpurCalendarParts(new Date('2026-09-27T16:00:00Z')).ymd).toBe('2026-09-28');

    const before = resolveSemesterContext(new Date('2026-09-27T15:59:00Z'));
    expect(before.status).toBe('before');
    expect(before.week).toBeNull();

    const after = resolveSemesterContext(new Date('2026-09-27T16:00:00Z'));
    expect(after.status).toBe('during');
    expect(after.week).toBe(1);
  });

  it('第 2 周边界同样按 KL 的周一 00:00 切', () => {
    // 2026-10-04 23:59 KL 仍是第 1 周；2026-10-05 00:00 KL 进入第 2 周
    expect(resolveSemesterContext(new Date('2026-10-04T15:59:00Z')).week).toBe(1);
    expect(resolveSemesterContext(new Date('2026-10-04T16:00:00Z')).week).toBe(2);
  });

  it('时区常量与课前提醒一致（Asia/Kuala_Lumpur）', () => {
    expect(KL_TIME_ZONE).toBe('Asia/Kuala_Lumpur');
  });
});

describe('开学前 / 学期结束后', () => {
  it('今天（2026-09-26）是开学前 2 天，默认展示第 1 周', () => {
    const c = resolveSemesterContext(kl('2026-09-26'));
    expect(c.status).toBe('before');
    expect(c.week).toBeNull();
    expect(c.daysUntilStart).toBe(2);
    expect(c.totalWeeks).toBe(14);
    expect(c.defaultWeek).toBe(1);
    expect(c.semester.id).toBe('2026-09');
  });

  it('开学前一天是「距开学 1 天」', () => {
    const c = resolveSemesterContext(kl('2026-09-27'));
    expect(c.status).toBe('before');
    expect(c.daysUntilStart).toBe(1);
  });

  it('学期结束后第二天报「已结束 1 天」，不会算出第 15 周', () => {
    const c = resolveSemesterContext(kl('2027-01-04'));
    expect(c.status).toBe('after');
    expect(c.week).toBeNull();
    expect(c.daysSinceEnd).toBe(1);
    expect(c.totalWeeks).toBe(14);
    expect(c.defaultWeek).toBe(1);
    expect(c.semester.id).toBe('2026-09');
  });

  it('没配置任何学期时回落到 unknown，而不是猜一个错周次', () => {
    const c = resolveSemesterContext(kl('2026-10-01'), []);
    expect(c.status).toBe('unknown');
    expect(c.semester).toBeNull();
    expect(c.week).toBeNull();
    expect(c.totalWeeks).toBe(FALLBACK_TOTAL_WEEKS);
    expect(c.defaultWeek).toBe(1);
  });

  it('两个学期之间按日期自动选「即将开学的」那个', () => {
    const twoSemesters = [
      ...SEMESTERS,
      { id: '2027-02', nameZh: '2026/27 第二学期', nameEn: '2026/27 Semester 2', startDate: '2027-03-01', weeks: 14 },
    ];
    // 第一学期结束后、第二学期开学前
    const gap = resolveSemesterContext(kl('2027-02-01'), twoSemesters);
    expect(gap.status).toBe('before');
    expect(gap.semester.id).toBe('2027-02');
    expect(gap.daysUntilStart).toBe(28);

    // 进入第二学期后是第 1 周
    const s2 = resolveSemesterContext(kl('2027-03-01'), twoSemesters);
    expect(s2.status).toBe('during');
    expect(s2.semester.id).toBe('2027-02');
    expect(s2.week).toBe(1);

    // 第二学期结束很久之后，回落到最近结束的那个学期
    const far = resolveSemesterContext(kl('2027-09-01'), twoSemesters);
    expect(far.status).toBe('after');
    expect(far.semester.id).toBe('2027-02');
  });
});

describe('周次工具函数', () => {
  it('clampWeek 把越界周次夹回合法范围', () => {
    expect(clampWeek(0)).toBe(1);
    expect(clampWeek(-5)).toBe(1);
    expect(clampWeek('abc')).toBe(1);
    expect(clampWeek(3)).toBe(3);
    expect(clampWeek(15, 14)).toBe(14);
    expect(clampWeek(99)).toBe(FALLBACK_TOTAL_WEEKS);
  });

  it('weekDateRange 对非法输入返回 null', () => {
    expect(weekDateRange(null, 1)).toBeNull();
    expect(weekDateRange(SEM, 0)).toBeNull();
    expect(weekDateRange(SEM, 'abc')).toBeNull();
  });

  it('formatWeekDateRangeLabel 中英文都能生成区间文案', () => {
    expect(formatWeekDateRangeLabel(SEM, 1, true)).toBe('9月28日 – 10月4日');
    expect(formatWeekDateRangeLabel(SEM, 1, false)).toBe('Sep 28 – Oct 4');
    expect(formatWeekDateRangeLabel(SEM, 14, true)).toBe('12月28日 – 1月3日');
    expect(formatWeekDateRangeLabel(null, 1, true)).toBe('');
  });

  it('formatYmdLabel 单个日期中英文', () => {
    expect(formatYmdLabel('2026-09-28', true)).toBe('9月28日');
    expect(formatYmdLabel('2026-09-28', false)).toBe('Sep 28');
    expect(formatYmdLabel('2026-12-28', false)).toBe('Dec 28');
    expect(formatYmdLabel('bad', true)).toBe('');
  });

  it('currentTeachingWeek：教学周内给周次，未开学/已结束给 null', () => {
    expect(currentTeachingWeek(kl('2026-10-05'))).toBe(2);
    expect(currentTeachingWeek(kl('2026-09-27'))).toBeNull();
    expect(currentTeachingWeek(kl('2027-02-01'))).toBeNull();
    // 没配置任何学期时不猜周次（MyZone 等据此不发请求）
    expect(currentTeachingWeek(kl('2026-10-05'), [])).toBeNull();
  });

  it('parseYmd 拒绝 2026-02-31 这种会被 Date 自动进位的假日期', () => {
    expect(parseYmd('2026-02-31')).toBeNull();
    expect(parseYmd('2026-13-01')).toBeNull();
    expect(parseYmd('2026-9-28')).toBeNull();
    expect(parseYmd('')).toBeNull();
    expect(parseYmd('2026-09-28')).toMatchObject({ y: 2026, m: 9, d: 28 });
  });

  it('ymdToDayNumber / addDaysYmd 跨月跨年正确', () => {
    expect(ymdToDayNumber('2026-09-28') - ymdToDayNumber('2026-09-27')).toBe(1);
    expect(addDaysYmd('2026-09-28', 91)).toBe('2026-12-28');
    expect(addDaysYmd('2026-12-28', 6)).toBe('2027-01-03');
    expect(addDaysYmd('bad', 1)).toBeNull();
  });

  it('findSemesterContaining 首尾都算在学期内', () => {
    expect(findSemesterContaining('2026-09-28')?.id).toBe('2026-09');
    expect(findSemesterContaining('2027-01-03')?.id).toBe('2026-09');
    expect(findSemesterContaining('2026-09-27')).toBeNull();
    expect(findSemesterContaining('2027-01-04')).toBeNull();
  });
});
