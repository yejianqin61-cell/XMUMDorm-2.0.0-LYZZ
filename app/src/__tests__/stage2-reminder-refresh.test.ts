import { refreshClassReminders } from '@/features/tools/reminders/native';

const mockReplace = jest.fn(async (..._args: unknown[]) => ({ status: 'scheduled', scheduled: [], deferred: 0 }));
let mockScope = 'user:7:semester:2026-09';
let mockSemester: { id: string; startDate: string; weeks: number } | null;
jest.mock('@/features/tools/reminders/scheduler', () => ({
  ...jest.requireActual('@/features/tools/reminders/scheduler'),
  createReminderScheduler: () => ({ replaceDomain: (...args: unknown[]) => mockReplace(...args),
    invalidateSession: jest.fn() }),
}));
jest.mock('@/features/tools/cacheIdentity', () => ({ timetableIdentity: () => ({ scope: mockScope, epoch: 1 }) }));
jest.mock('../../../shared/config/semesters', () => ({
  ...jest.requireActual('../../../shared/config/semesters'),
  resolveSemesterContext: () => ({ semester: mockSemester }),
}));
jest.mock('../../../shared/api/schedule', () => ({ getScheduleWeek: jest.fn() }));
const load = jest.requireMock('../../../shared/api/schedule').getScheduleWeek as jest.Mock;
const labels = { title: 'Class', body: 'Starts soon' };
const raw = (start = '09:00') => ({ week: 1, days: { 1: [{ course_code: 'CS101', day_of_week: 1, start_time: start }] } });
beforeEach(() => {
  jest.clearAllMocks(); mockScope = 'user:7:semester:2026-09';
  mockSemester = { id: '2026-09', startDate: '2026-09-28', weeks: 1 };
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-27T00:00:00Z'));
});
afterEach(() => jest.useRealTimers());

it('replaces the plan after modification and clears it after all courses are deleted', async () => {
  load.mockResolvedValue(raw()); await refreshClassReminders(labels);
  expect(mockReplace.mock.calls.at(-1)?.[2]).toEqual([expect.objectContaining({ startsAt: '2026-09-28T01:00:00.000Z' })]);
  load.mockResolvedValue(raw('11:00')); await refreshClassReminders(labels);
  expect(mockReplace.mock.calls.at(-1)?.[2]).toEqual([expect.objectContaining({ startsAt: '2026-09-28T03:00:00.000Z' })]);
  load.mockResolvedValue({ week: 1, days: {} }); await refreshClassReminders(labels);
  expect(mockReplace).toHaveBeenLastCalledWith('user:7', 'class', [], labels);
});

it('never submits an old semester response after the scope changes', async () => {
  let finish!: (data: unknown) => void;
  load.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const pending = refreshClassReminders(labels);
  mockScope = 'user:7:semester:2027-02';
  finish(raw());
  expect(await pending).toEqual({ status: 'stale', scheduled: [], deferred: 0 });
  expect(mockReplace).not.toHaveBeenCalled();
});

it('lets the latest refresh win when an earlier response arrives late', async () => {
  let finish!: (data: unknown) => void;
  load.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const pending = refreshClassReminders(labels);
  load.mockResolvedValue(raw('11:00')); await refreshClassReminders(labels);
  finish(raw()); await pending;
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockReplace.mock.calls[0][2]).toEqual([expect.objectContaining({ startsAt: '2026-09-28T03:00:00.000Z' })]);
});

it('keeps the existing schedule when any week response is incomplete', async () => {
  load.mockResolvedValue({ week: 1 });
  await expect(refreshClassReminders(labels)).rejects.toThrow(/week/);
  expect(mockReplace).not.toHaveBeenCalled();
});
