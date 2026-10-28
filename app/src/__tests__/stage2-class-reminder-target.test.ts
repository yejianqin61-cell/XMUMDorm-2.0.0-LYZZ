import { buildClassReminderPlan } from '@/features/tools/reminders/plan';
import { createReminderScheduler, type NativeReminderPort } from '@/features/tools/reminders/scheduler';

it('carries a stable course target from the timetable into the scheduled notification', async () => {
  const reminders = buildClassReminderPlan({
    semester: { id: '2026-09', startDate: '2026-09-28', weeks: 1 },
    weeks: [{ week: 1, currentWeek: 1, totalWeeks: 1, days: { 1: [{
      courseCode: 'CS101', courseName: 'Algorithms', credit: 3, lecturer: 'Private name',
      venue: 'Private room', dayOfWeek: 1, startTime: '09:00', endTime: '10:00',
    }] } }],
    now: new Date('2026-09-27T00:00:00Z'),
  });
  const schedule = jest.fn(async () => 'notification-1');
  const port: NativeReminderPort = {
    getPermissionsAsync: async () => ({ granted: true }),
    getAllScheduledNotificationsAsync: async () => [],
    cancelScheduledNotificationAsync: async () => {},
    scheduleNotificationAsync: schedule,
  };
  const scheduler = createReminderScheduler({ port, getOwner: () => 'user:7', getSessionEpoch: () => 1,
    now: () => new Date('2026-09-27T00:00:00Z') });
  await scheduler.replaceDomain('user:7', 'class', reminders, { title: 'Class', body: 'Upcoming class' });
  expect(schedule).toHaveBeenCalledWith(expect.objectContaining({ content: expect.objectContaining({
    data: expect.objectContaining({ target: { semesterId: '2026-09', courseCode: 'CS101',
      date: '2026-09-28', startTime: '09:00:00' } }),
  }) }));
  expect(JSON.stringify(schedule.mock.calls)).not.toMatch(/Private name|Private room/);
});
