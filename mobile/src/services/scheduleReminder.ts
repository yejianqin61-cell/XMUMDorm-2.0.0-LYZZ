import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const REMINDER_KEY = 'schedule_reminders_v1'; // stored notification IDs
const REMINDER_MINUTES_BEFORE = 30;

interface Meeting {
  id: number;
  day_of_week: number;
  start_time: string; // "HH:mm:ss"
  end_time: string;
  venue?: string;
  course_name: string;
  course_code: string;
}

// Configure notification handler (show even when app is in foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Request notification permission. Returns true if granted. */
export async function requestReminderPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    // On Android, we can try again; on iOS user must go to Settings
    if (Platform.OS === 'ios') {
      return false;
    }
    return false;
  }

  // Android: need notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('class-reminder', {
      name: '课前提醒',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

/** Calculate the day-of-week JS Date for the next occurrence of a given day_of_week (1=Mon..7=Sun) */
function nextDayOfWeek(targetDow: number, afterDate: Date): Date {
  const today = afterDate.getDay(); // 0=Sun in JS
  const target = targetDow === 7 ? 0 : targetDow; // map 7(Sun) → 0(JS Sun)
  let daysUntil = target - today;
  if (daysUntil <= 0) daysUntil += 7;
  const result = new Date(afterDate);
  result.setDate(result.getDate() + daysUntil);
  return result;
}

/** Parse "HH:mm:ss" → { hours, minutes } */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

/** Schedule all reminders for a list of meetings. Returns count of scheduled notifications. */
export async function scheduleAllReminders(meetings: Meeting[]): Promise<number> {
  // Cancel existing first
  await cancelAllReminders();

  let count = 0;
  const scheduledIds: string[] = [];
  const now = new Date();

  for (const meeting of meetings) {
    const dedupKey = `reminder_${meeting.id}_${meeting.day_of_week}_${meeting.start_time}`;
    const existing = await AsyncStorage.getItem(dedupKey);
    if (existing) continue; // Already scheduled for this week

    const { hours, minutes } = parseTime(meeting.start_time);
    // Calculate trigger date: next occurrence of day_of_week
    const classDate = nextDayOfWeek(meeting.day_of_week, now);
    classDate.setHours(hours, minutes, 0, 0);

    // Reminder time = class time - 30 minutes
    const reminderDate = new Date(classDate.getTime() - REMINDER_MINUTES_BEFORE * 60 * 1000);

    // Skip if reminder time is in the past
    if (reminderDate <= now) continue;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📚 ${meeting.course_name}`,
          body: `${meeting.start_time.substring(0, 5)}-${meeting.end_time.substring(0, 5)} · ${meeting.venue || '教室未定'} · ${meeting.course_code}`,
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: 'class-reminder' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });

      scheduledIds.push(id);
      await AsyncStorage.setItem(dedupKey, id);
      count++;
    } catch {
      // skip failed schedules
    }
  }

  // Save all scheduled IDs for bulk cancellation
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(scheduledIds));
  return count;
}

/** Cancel all scheduled reminders */
export async function cancelAllReminders(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_KEY);
    if (raw) {
      const ids: string[] = JSON.parse(raw);
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }
    // Also cancel all (belt and suspenders)
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Clear dedup keys
    const keys = await AsyncStorage.getAllKeys();
    const reminderKeys = keys.filter((k) => k.startsWith('reminder_'));
    if (reminderKeys.length > 0) {
      await AsyncStorage.multiRemove(reminderKeys);
    }
    await AsyncStorage.removeItem(REMINDER_KEY);
  } catch { /* ignore */ }
}

/** Check if reminders are currently enabled (have any scheduled) */
export async function hasScheduledReminders(): Promise<boolean> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length > 0;
  } catch {
    return false;
  }
}
