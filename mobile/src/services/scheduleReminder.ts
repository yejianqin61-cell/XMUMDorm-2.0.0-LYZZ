import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_KEY = 'schedule_reminders_v1';
const REMINDER_MINUTES_BEFORE = 30;

interface Meeting {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  venue?: string;
  course_name: string;
  course_code: string;
}

/**
 * Check if expo-notifications is available (not available in Expo Go since SDK 53).
 * Returns a safe Notifications API or null.
 */
async function getNotifications() {
  try {
    const Notifications = require('expo-notifications');
    // Quick probe to see if native module is actually available
    await Notifications.getPermissionsAsync();
    return Notifications;
  } catch {
    return null;
  }
}

let NotificationsCache: any = undefined;
let cacheChecked = false;

async function getNotifs() {
  if (!cacheChecked) {
    NotificationsCache = await getNotifications();
    cacheChecked = true;
  }
  return NotificationsCache;
}

/* ── Public API ─────────────────────────── */

/** Request notification permission. Returns true if granted. Returns false in Expo Go. */
export async function requestReminderPermission(): Promise<boolean> {
  const N = await getNotifs();
  if (!N) return false; // Expo Go — not available

  try {
    const { status: existing } = await N.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return false;

    // Android notification channel
    try {
      await N.setNotificationChannelAsync('class-reminder', {
        name: '课前提醒',
        importance: N.AndroidImportance?.HIGH ?? 4,
        vibrationPattern: [0, 250, 250, 250],
      });
    } catch { /* channel might already exist */ }

    // Configure foreground handler
    try {
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch { /* best effort */ }

    return true;
  } catch {
    return false;
  }
}

/** Schedule all reminders for a list of meetings. Returns count of scheduled notifications. */
export async function scheduleAllReminders(meetings: Meeting[]): Promise<number> {
  const N = await getNotifs();
  if (!N) return 0; // Expo Go

  await cancelAllReminders();

  let count = 0;
  const scheduledIds: string[] = [];
  const now = new Date();

  for (const meeting of meetings) {
    const dedupKey = `reminder_${meeting.id}_${meeting.day_of_week}_${meeting.start_time}`;
    const existing = await AsyncStorage.getItem(dedupKey);
    if (existing) continue;

    const [h, m] = (meeting.start_time || '0:0').split(':').map(Number);
    const classDate = nextDayOfWeek(meeting.day_of_week, now);
    classDate.setHours(h || 0, m || 0, 0, 0);
    const reminderDate = new Date(classDate.getTime() - REMINDER_MINUTES_BEFORE * 60 * 1000);
    if (reminderDate <= now) continue;

    try {
      const id = await N.scheduleNotificationAsync({
        content: {
          title: `📚 ${meeting.course_name}`,
          body: `${(meeting.start_time || '').substring(0, 5)}-${(meeting.end_time || '').substring(0, 5)} · ${meeting.venue || '教室未定'} · ${meeting.course_code}`,
          sound: true,
        },
        trigger: { type: 'date' as any, date: reminderDate },
      });
      scheduledIds.push(id);
      await AsyncStorage.setItem(dedupKey, id);
      count++;
    } catch { /* skip */ }
  }

  try { await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(scheduledIds)); } catch {}
  return count;
}

/** Cancel all scheduled reminders */
export async function cancelAllReminders(): Promise<void> {
  const N = await getNotifs();
  try {
    if (N) {
      const raw = await AsyncStorage.getItem(REMINDER_KEY);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        for (const id of ids) {
          try { await N.cancelScheduledNotificationAsync(id); } catch {}
        }
      }
      try { await N.cancelAllScheduledNotificationsAsync(); } catch {}
    }
    // Clear dedup keys (always runs, even in Expo Go)
    const keys = await AsyncStorage.getAllKeys();
    const reminderKeys = keys.filter((k) => k.startsWith('reminder_'));
    if (reminderKeys.length > 0) await AsyncStorage.multiRemove(reminderKeys);
    await AsyncStorage.removeItem(REMINDER_KEY);
  } catch {}
}

/** Check if reminders are currently enabled */
export async function hasScheduledReminders(): Promise<boolean> {
  const N = await getNotifs();
  if (!N) return false;
  try {
    const scheduled = await N.getAllScheduledNotificationsAsync();
    return scheduled.length > 0;
  } catch {
    return false;
  }
}

/* ── Helpers ────────────────────────────── */

function nextDayOfWeek(targetDow: number, afterDate: Date): Date {
  const today = afterDate.getDay();
  const target = targetDow === 7 ? 0 : targetDow;
  let daysUntil = target - today;
  if (daysUntil <= 0) daysUntil += 7;
  const result = new Date(afterDate);
  result.setDate(result.getDate() + daysUntil);
  return result;
}
