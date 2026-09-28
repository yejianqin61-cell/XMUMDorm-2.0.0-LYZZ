/**
 * 课前提醒的「当前周」回归测试
 *
 * 历史缺陷（线上）：services/classReminderPush.js 用环境变量 CLASS_REMINDER_WEEK
 * （默认 1）固定按第 1 周过滤，于是
 *   - (Week 9-14) 的课永远收不到提醒（week_start=9 > 1）
 *   - (Week 1-14) 的课在学期结束后还在推（week_end=14 >= 1）
 * 现在改为按学期日历动态算出「今天第几周」，未开学 / 学期结束后不发。
 *
 * 这里锁两件事：
 * 1. 传给 SQL 的周次参数 = 当前周（而不是写死的 1）
 * 2. 周次过滤条件仍然是 week_start <= 本周 <= week_end
 */
const { runClassReminderTick } = require('../../services/classReminderPush');

jest.mock('../../database', () => ({
  query: jest.fn(),
}));

jest.mock('../../services/pushSend', () => ({
  configureWebPush: jest.fn(() => true),
  sendPushToUser: jest.fn(async () => ({ ok: true })),
}));

const { query } = require('../../database');
const { sendPushToUser } = require('../../services/pushSend');

/** 吉隆坡 2026-10-26（周一）09:00 = 01:00Z；该天属于第 5 周 */
const WEEK5_MONDAY_9AM_KL = new Date('2026-10-26T01:00:00Z');

const ENV_KEYS = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'];
const savedEnv = {};

/** 取最近一次「查候选课程」的 SQL 与参数 */
function lastCandidateQuery() {
  const calls = query.mock.calls.filter(([sql]) => String(sql).includes('FROM timetable_meetings'));
  return calls[calls.length - 1] || null;
}

describe('课前提醒按「当前周」过滤', () => {
  beforeEach(() => {
    query.mockReset();
    sendPushToUser.mockClear();
    for (const k of ENV_KEYS) {
      savedEnv[k] = process.env[k];
      process.env[k] = 'test-key';
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  it('第 5 周用 week=5 过滤（而不是写死的 1）', async () => {
    query.mockResolvedValue([]);
    await runClassReminderTick({ now: WEEK5_MONDAY_9AM_KL });

    const call = lastCandidateQuery();
    expect(call).not.toBeNull();
    const [, args] = call;
    expect(args[0]).toBe(1); // 周一
    expect(args[1]).toBe(5);
    expect(args[2]).toBe(5);
  });

  it('SQL 仍是 week_start <= 本周 <= week_end，所以 (Week 9-14) 的课到第 9 周才出现', async () => {
    query.mockResolvedValue([]);
    await runClassReminderTick({ now: WEEK5_MONDAY_9AM_KL });

    const [sql] = lastCandidateQuery();
    expect(sql).toContain('m.week_start IS NULL OR m.week_start <=');
    expect(sql).toContain('m.week_end IS NULL OR m.week_end >=');
  });

  it('开学前不发提醒，也不查库', async () => {
    query.mockResolvedValue([]);
    // 2026-09-26 是开学前 2 天
    await runClassReminderTick({ now: new Date('2026-09-26T01:00:00Z') });
    expect(lastCandidateQuery()).toBeNull();
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it('学期结束后不发提醒', async () => {
    query.mockResolvedValue([]);
    // 学期 2026-09-28 ~ 2027-01-03，2027-03-01 已结束
    await runClassReminderTick({ now: new Date('2027-03-01T01:00:00Z') });
    expect(lastCandidateQuery()).toBeNull();
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it('第 1 周仍然正常按 week=1 过滤（开学那周不能被误伤）', async () => {
    query.mockResolvedValue([]);
    // 2026-09-28（周一）09:00 KL
    await runClassReminderTick({ now: new Date('2026-09-28T01:00:00Z') });
    const [, args] = lastCandidateQuery();
    expect(args[1]).toBe(1);
    expect(args[2]).toBe(1);
  });

  it('课前 30 分钟内才推送，并写入去重表', async () => {
    query.mockImplementation(async (sql) => {
      if (String(sql).includes('FROM timetable_meetings')) {
        return [
          {
            meeting_id: 77,
            day_of_week: 1,
            start_time: '09:30:00',
            venue: 'A3#509',
            user_id: 21,
            course_code: 'CST204',
            course_name: 'Data Structures',
          },
        ];
      }
      return [{ insertId: 1 }];
    });

    await runClassReminderTick({ now: WEEK5_MONDAY_9AM_KL });

    expect(sendPushToUser).toHaveBeenCalledTimes(1);
    const [userId, payload] = sendPushToUser.mock.calls[0];
    expect(userId).toBe(21);
    expect(payload.title).toContain('CST204');
    expect(payload.tag).toBe('class-77-2026-10-26');

    const insertCall = query.mock.calls.find(([sql]) => String(sql).includes('INSERT IGNORE INTO class_reminder_sent'));
    expect(insertCall).toBeTruthy();
    expect(insertCall[1]).toEqual([21, 77, '2026-10-26']);
  });

  it('没到推送窗口（课前 2 小时）不推', async () => {
    query.mockImplementation(async (sql) => {
      if (String(sql).includes('FROM timetable_meetings')) {
        return [
          {
            meeting_id: 78,
            day_of_week: 1,
            start_time: '11:30:00',
            venue: null,
            user_id: 21,
            course_code: 'CST204',
            course_name: 'Data Structures',
          },
        ];
      }
      return [{ insertId: 1 }];
    });

    // 09:00 KL，离 11:30 上课还有 2 小时
    await runClassReminderTick({ now: WEEK5_MONDAY_9AM_KL });
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it('未配置 VAPID 时直接跳过（线上默认关闭）', async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    query.mockResolvedValue([]);

    await runClassReminderTick({ now: WEEK5_MONDAY_9AM_KL });
    expect(query).not.toHaveBeenCalled();
  });

  it('options.week 可覆盖周次（仅排查问题用）', async () => {
    query.mockResolvedValue([]);
    await runClassReminderTick({ now: WEEK5_MONDAY_9AM_KL, week: 11 });
    const [, args] = lastCandidateQuery();
    expect(args[1]).toBe(11);
  });
});

describe('kualaLumpurCalendarParts 与课表页共用同一份实现', () => {
  it('service 导出的就是 shared/config/semesters.js 里的那个', () => {
    const service = require('../../services/classReminderPush');
    const shared = require('../../shared/config/semesters');
    expect(service.kualaLumpurCalendarParts).toBe(shared.kualaLumpurCalendarParts);
  });

  it('KL 的周一 00:00 边界正确', () => {
    const { kualaLumpurCalendarParts } = require('../../services/classReminderPush');
    expect(kualaLumpurCalendarParts(new Date('2026-09-27T15:59:00Z'))).toEqual({
      ymd: '2026-09-27',
      dayOfWeek: 7,
    });
    expect(kualaLumpurCalendarParts(new Date('2026-09-27T16:00:00Z'))).toEqual({
      ymd: '2026-09-28',
      dayOfWeek: 1,
    });
  });
});
