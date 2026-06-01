import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost } from '../api/client';

const PUSH_TOKEN_KEY = 'fcm_push_token';
const PUSH_REGISTERED_KEY = 'fcm_push_registered';

/**
 * Get Expo push token. Returns null if not available (e.g. Expo Go).
 */
async function getNativePushToken(): Promise<string | null> {
  try {
    const Notifications = require('expo-notifications');
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const token = await Notifications.getDevicePushTokenAsync();
    return token?.data ?? null;
  } catch {
    return null; // Expo Go or not available
  }
}

/**
 * Register the push token with the backend.
 * Returns true if successful, false in Expo Go / on failure.
 */
export async function registerPushToken(): Promise<boolean> {
  try {
    const token = await getNativePushToken();
    if (!token) return false;

    const prevToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (prevToken === token && (await AsyncStorage.getItem(PUSH_REGISTERED_KEY)) === '1') {
      return true;
    }

    const r = await apiPost('/api/push/subscribe', {
      endpoint: token,
      channel: 'fcm',
      keys: { p256dh: '', auth: '' },
    });

    if (r.status === 0) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      await AsyncStorage.setItem(PUSH_REGISTERED_KEY, '1');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Unregister the push token from the backend.
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await apiPost('/api/push/unsubscribe', { endpoint: token });
    }
    await AsyncStorage.multiRemove([PUSH_TOKEN_KEY, PUSH_REGISTERED_KEY]);
  } catch {}
}

export async function isPushRegistered(): Promise<boolean> {
  return (await AsyncStorage.getItem(PUSH_REGISTERED_KEY)) === '1';
}
