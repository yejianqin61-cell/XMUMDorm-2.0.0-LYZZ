import { loadNotificationClient } from '@/features/notifications/client';
import { getScheduleWeek } from '../../../../../shared/api/schedule';
import { resolveSemesterContext } from '../../../../../shared/config/semesters';
import { notificationPermission } from '@/features/notifications/permissions';
import { timetableIdentity } from '../cacheIdentity';
import { loadSemesterClassReminderPlan } from './runtime';
import type { ReminderSemester } from './plan';
import type { MoodleReminderDelivery } from '../moodle/deadlines';
import { createReminderScheduler, reminderOwnerFromScope, type NativeReminderPort, type ReminderLabels } from './scheduler';

const port: NativeReminderPort = {
  async getPermissionsAsync() {
    return { granted: (await notificationPermission.read()) === 'granted' };
  },
  async getAllScheduledNotificationsAsync() {
    const client = await loadNotificationClient();
    if (!client) return [];
    return (await client.getAllScheduledNotificationsAsync()).map((item) => ({
      identifier: item.identifier,
      content: { data: item.content.data as Record<string, unknown> | null | undefined },
    }));
  },
  async scheduleNotificationAsync(input) {
    const client = await loadNotificationClient();
    if (!client) throw new Error('Notifications are unavailable in this preview');
    return client.scheduleNotificationAsync({
      content: { title: input.content.title, body: input.content.body, data: input.content.data },
      trigger: input.trigger as never,
    });
  },
  async cancelScheduledNotificationAsync(identifier) {
    const client = await loadNotificationClient();
    if (client) await client.cancelScheduledNotificationAsync(identifier);
  },
};

const scheduler = createReminderScheduler({
  port,
  getOwner: () => reminderOwnerFromScope(timetableIdentity().scope),
  getSessionEpoch: () => timetableIdentity().epoch,
});

function owner(): string | null {
  return reminderOwnerFromScope(timetableIdentity().scope);
}

export async function replaceMoodleReminders(plan: readonly { id: string; fireAt: number }[],
  labels: ReminderLabels): Promise<MoodleReminderDelivery> {
  const current = owner();
  if (!current) return 'stale';
  const result = await scheduler.replaceDomain(current, 'moodle',
    plan.map((item) => ({ id: item.id, fireAt: item.fireAt })), labels);
  if (result.status === 'permission-denied') return 'denied';
  if (result.status === 'stale') return 'stale';
  return result.deferred > 0 ? 'partial' : 'planned';
}

export async function clearMoodleReminders(): Promise<void> {
  const current = owner();
  if (current) await scheduler.clearDomain(current, 'moodle');
}

export async function clearReminderOwner(previousOwner: string): Promise<void> {
  await scheduler.clearOwner(previousOwner);
}

export async function refreshClassReminders(labels: ReminderLabels): Promise<void> {
  const current = owner();
  if (!current) return;
  const semester = resolveSemesterContext().semester as ReminderSemester | null;
  if (!semester) {
    await scheduler.replaceDomain(current, 'class', [], labels);
    return;
  }
  const epoch = timetableIdentity().epoch;
  const plan = await loadSemesterClassReminderPlan({
    semester,
    now: new Date(),
    loadWeek: getScheduleWeek,
    isCurrent: () => timetableIdentity().epoch === epoch && owner() === current,
  });
  await scheduler.replaceDomain(current, 'class', plan, labels);
}

export function invalidateReminderSession(): void {
  scheduler.invalidateSession();
}
