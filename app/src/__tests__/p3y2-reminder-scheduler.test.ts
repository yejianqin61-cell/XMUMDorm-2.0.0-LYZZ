import { createReminderScheduler, reminderOwnerFromScope } from '@/features/tools/reminders/scheduler';
import type { NativeReminderPort, NativeReminderRequest, ReminderTime } from '@/features/tools/reminders/scheduler';
import { loadSemesterClassReminderPlan } from '@/features/tools/reminders/runtime';

const labels = { title: 'Study reminder', body: 'Open your timetable.' };
const now = new Date('2026-09-27T00:00:00Z');
const plan = (id: string, at = '2026-09-28T00:30:00Z'): ReminderTime => ({ id, fireAt: Date.parse(at) });
const tagged = (identifier: string, owner: string, domain: string): NativeReminderRequest => ({
  identifier, content: { data: { dormReminder: 'phase3-v1', owner, domain } },
});

it('replaces repeated and modified class schedules, then removes deleted courses without affecting Moodle', async () => {
  const h = setup([tagged('moodle', 'user:7', 'moodle')]);
  const classPlan = [plan('class:2026-09:CS101')];
  await h.scheduler.replaceDomain('user:7', 'class', classPlan, labels);
  await h.scheduler.replaceDomain('user:7', 'class', classPlan, labels);
  expect(h.requests().filter((item) => item.content.data?.domain === 'class')).toHaveLength(1);
  await h.scheduler.replaceDomain('user:7', 'class', [plan('class:2027-02:CS101', '2027-02-01T02:30:00Z')], labels);
  expect(jest.mocked(h.port.scheduleNotificationAsync).mock.calls.at(-1)?.[0].trigger)
    .toEqual(new Date('2027-02-01T02:30:00Z'));
  expect(h.requests().filter((item) => item.content.data?.domain === 'class')).toHaveLength(1);
  await h.scheduler.replaceDomain('user:7', 'class', [], labels);
  expect(h.requests().map((item) => item.identifier)).toEqual(['moodle']);
});
function setup(initial: NativeReminderRequest[] = [], capacity = 50) {
  let owner: string | null = 'user:7', epoch = 1;
  let requests = [...initial];
  const port: NativeReminderPort = {
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    getAllScheduledNotificationsAsync: jest.fn(async () => [...requests]),
    scheduleNotificationAsync: jest.fn(async (input) => {
      const identifier = `native-${requests.length + 1}`;
      requests.push({ identifier, content: input.content });
      return identifier;
    }),
    cancelScheduledNotificationAsync: jest.fn(async (identifier) => {
      requests = requests.filter((item) => item.identifier !== identifier);
    }),
  };
  const scheduler = createReminderScheduler({ port, capacity, now: () => now,
    getOwner: () => owner, getSessionEpoch: () => epoch });
  return { port, scheduler, requests: () => requests, session: (next: string | null) => { owner = next; epoch += 1; } };
}

it('uses only safe numeric project owner ids across semesters and rejects credentials', () => {
  expect(reminderOwnerFromScope('user:7:semester:2026-09')).toBe('user:7');
  expect(reminderOwnerFromScope('user:7:semester:2027-02')).toBe('user:7');
  for (const scope of ['guest', 'user:guest:semester:1', 'user:unresolved:semester:1', 'user:0',
    'header.payload.signature', 'user:9007199254740992', 'user:7:token:secret']) {
    expect(reminderOwnerFromScope(scope)).toBeNull();
  }
});

it('replaces only exact owner/domain notifications, uses Date triggers and sends no academic fields', async () => {
  const h = setup([tagged('old-class', 'user:7', 'class'), tagged('moodle', 'user:7', 'moodle'),
    tagged('other-user', 'user:8', 'class'), { identifier: 'unrelated', content: { data: { owner: 'user:7', domain: 'class' } } }]);
  const result = await h.scheduler.replaceDomain('user:7', 'class', [plan('class:CS101:Private-name')], labels);
  expect(h.port.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
  expect(h.port.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-class');
  expect(result).toMatchObject({ status: 'scheduled', deferred: 0, scheduled: [{ domain: 'class', id: 'class:CS101:Private-name' }] });
  const request = jest.mocked(h.port.scheduleNotificationAsync).mock.calls[0][0];
  expect(request.trigger).toEqual(new Date('2026-09-28T00:30:00Z'));
  expect(request.content).toEqual({ ...labels, data: { dormReminder: 'phase3-v1', owner: 'user:7', domain: 'class' } });
  expect(JSON.stringify(request)).not.toMatch(/CS101|Private|signature|fireAt/);
});

it('withdraws old domain reminders when permission is denied and does not request permission', async () => {
  const h = setup([tagged('old', 'user:7', 'class'), tagged('moodle', 'user:7', 'moodle')]);
  jest.mocked(h.port.getPermissionsAsync).mockResolvedValue({ granted: false });
  expect(await h.scheduler.replaceDomain('user:7', 'class', [plan('one')], labels))
    .toEqual({ status: 'permission-denied', scheduled: [], deferred: 1 });
  expect(h.requests().map((item) => item.identifier)).toEqual(['moodle']);
  expect(h.port.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('shares capacity, reserves other requests, and reports the unarranged nearest-first remainder', async () => {
  const h = setup([tagged('moodle', 'user:7', 'moodle'), tagged('other-user', 'user:8', 'class')], 3);
  const result = await h.scheduler.replaceDomain('user:7', 'class', [plan('late', '2026-10-01T00:30Z'),
    plan('early'), plan('middle', '2026-09-29T00:30Z')], labels);
  expect(result.scheduled.map((item) => item.id)).toEqual(['early']);
  expect(result.deferred).toBe(2);
  await h.scheduler.clearDomain('user:7', 'moodle');
  expect(h.requests().some((item) => item.content.data?.domain === 'class' && item.content.data?.owner === 'user:7')).toBe(true);
  expect(h.requests().map((item) => item.identifier)).not.toContain('moodle');
});

it('explicitly reconciles both complete domain plans in global date order', async () => {
  const h = setup([tagged('old-class', 'user:7', 'class'), tagged('old-moodle', 'user:7', 'moodle'),
    tagged('reserved', 'user:8', 'class')], 3);
  const result = await h.scheduler.reconcileOwner('user:7', {
    class: { plan: [plan('later-class', '2026-10-01T00:30Z'), plan('early-class')], labels },
    moodle: { plan: [plan('middle-moodle', '2026-09-29T00:30Z')], labels: { title: 'Due reminder', body: 'Open Moodle.' } },
  });
  expect(result.scheduled.map((item) => `${item.domain}:${item.id}`)).toEqual(['class:early-class', 'moodle:middle-moodle']);
  expect(result.deferred).toBe(1);
  expect(h.requests().map((item) => item.identifier)).toContain('reserved');
});

it.each(['clear', 'replace'] as const)('keeps class notifications when concurrent Moodle %s supersedes only that domain', async (operation) => {
  const h = setup([tagged('old-class', 'user:7', 'class'), tagged('old-moodle', 'user:7', 'moodle')]);
  const cancel = jest.mocked(h.port.cancelScheduledNotificationAsync), normal = cancel.getMockImplementation();
  if (!normal) throw new Error('missing native test port');
  let resume!: () => void, entered!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  cancel.mockImplementationOnce(async (identifier) => {
    await normal(identifier);
    entered();
    await new Promise<void>((resolve) => { resume = resolve; });
  });
  const reconcile = h.scheduler.reconcileOwner('user:7', {
    class: { plan: [plan('new-class')], labels }, moodle: { plan: [plan('obsolete-moodle')], labels },
  });
  await started; // Old class is really absent on the native port before Moodle supersedes its plan.
  const moodle = operation === 'clear' ? h.scheduler.clearDomain('user:7', 'moodle')
    : h.scheduler.replaceDomain('user:7', 'moodle', [plan('new-moodle')], labels);
  resume();
  const result = await reconcile;
  await moodle;
  expect(result.status).toBe('stale');
  expect(result.scheduled.map((item) => `${item.domain}:${item.id}`)).toEqual(['class:new-class']);
  const requests = h.requests();
  expect(requests.filter((item) => item.content.data?.domain === 'class')).toHaveLength(1);
  expect(requests.filter((item) => item.content.data?.domain === 'moodle')).toHaveLength(operation === 'clear' ? 0 : 1);
  expect(requests.map((item) => item.identifier)).not.toContain('old-class');
});

it('deduplicates one domain id, drops past/invalid firing times and keeps simultaneous different ids', async () => {
  const h = setup();
  const result = await h.scheduler.replaceDomain('user:7', 'class', [plan('one'), plan('one'), plan('two'),
    plan('past', now.toISOString()), plan('invalid', 'nonsense')], labels);
  expect(result.scheduled.map((item) => item.id)).toEqual(['one', 'two']);
  expect(result.deferred).toBe(0);
});

it('cancels a native schedule that resolves after a concurrent clear', async () => {
  const h = setup();
  let finish!: (id: string) => void, entered!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  jest.mocked(h.port.scheduleNotificationAsync).mockImplementationOnce(async () => {
    entered();
    const identifier = await new Promise<string>((resolve) => { finish = resolve; });
    return identifier;
  });
  const pending = h.scheduler.replaceDomain('user:7', 'class', [plan('old')], labels);
  await started;
  const clear = h.scheduler.clearDomain('user:7', 'class');
  finish('late-native');
  expect((await pending).status).toBe('stale');
  await clear;
  expect(h.port.cancelScheduledNotificationAsync).toHaveBeenCalledWith('late-native');
});

it.each(['user:8', 'user:7'])('blocks old-session scheduling after switch or same-account re-login to %s', async (next) => {
  const h = setup();
  let finish!: (value: { granted: boolean }) => void, entered!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  jest.mocked(h.port.getPermissionsAsync).mockImplementationOnce(() => {
    entered(); return new Promise((resolve) => { finish = resolve; });
  });
  const pending = h.scheduler.replaceDomain('user:7', 'class', [plan('old')], labels);
  await started;
  h.session(next);
  h.scheduler.invalidateSession();
  finish({ granted: true });
  expect((await pending).status).toBe('stale');
  expect(h.port.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('cleans an old owner on logout without clearing other owners or untagged notifications', async () => {
  const h = setup([tagged('old-class', 'user:7', 'class'), tagged('old-moodle', 'user:7', 'moodle'),
    tagged('other', 'user:8', 'moodle'), { identifier: 'unrelated', content: {} }]);
  h.session(null);
  h.scheduler.invalidateSession();
  await h.scheduler.clearOwner('user:7');
  expect(h.requests().map((item) => item.identifier)).toEqual(['other', 'unrelated']);
});

it('does not leave a partially scheduled replacement on native failure and recovers its queue', async () => {
  const h = setup();
  const schedule = jest.mocked(h.port.scheduleNotificationAsync);
  const normal = schedule.getMockImplementation();
  if (!normal) throw new Error('missing native test port');
  schedule.mockImplementationOnce(normal).mockRejectedValueOnce(new Error('native failed'));
  await expect(h.scheduler.replaceDomain('user:7', 'class', [plan('one'), plan('two')], labels)).rejects.toThrow('native failed');
  expect(h.requests()).toEqual([]);
  expect(h.port.cancelScheduledNotificationAsync).toHaveBeenCalledWith('native-1');
  expect((await h.scheduler.replaceDomain('user:7', 'class', [plan('two')], labels)).status).toBe('scheduled');
});

it('loads all 14 explicitly numbered weeks before planning the full semester', async () => {
  const loadWeek = jest.fn(async (week: number) => ({ week, totalWeeks: 14, currentWeek: null, days: {
    1: [{ course_code: 'CS101', day_of_week: 1, start_time: '09:00' }],
    5: [{ course_code: 'MA101', day_of_week: 5, start_time: '15:00' }],
  } }));
  const result = await loadSemesterClassReminderPlan({ semester: { id: '2026-09', startDate: '2026-09-28', weeks: 14 },
    loadWeek, now, isCurrent: () => true });
  expect(loadWeek.mock.calls.map(([week]) => week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  expect(result).toHaveLength(28);
  expect(result[0].fireAt).toBe(Date.parse('2026-09-28T00:30:00.000Z'));
  expect(result[27].fireAt).toBe(Date.parse('2027-01-01T06:30:00.000Z'));
});

it('refuses an incomplete semester response and an obsolete loading session', async () => {
  const semester = { id: '2026-09', startDate: '2026-09-28', weeks: 14 };
  await expect(loadSemesterClassReminderPlan({ semester, now, isCurrent: () => true,
    loadWeek: async () => ({ week: 1, days: {} }) }))
    .rejects.toThrow(/week/);
  await expect(loadSemesterClassReminderPlan({ semester, now, isCurrent: () => true,
    loadWeek: async (week) => ({ week }) })).rejects.toThrow(/week/);
  let current = true;
  await expect(loadSemesterClassReminderPlan({ semester, now, isCurrent: () => current,
    loadWeek: async (week) => { current = false; return { week, days: {} }; } }))
    .rejects.toThrow(/stale/);
});
