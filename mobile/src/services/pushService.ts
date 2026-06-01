import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiPost } from '../api/client';
import { STORAGE_TOKEN } from '../context/AuthContext';

const PUSH_TOKEN_KEY = 'fcm_push_token';
const PUSH_REGISTERED_KEY = 'fcm_push_registered';

/**
 * Get the Expo push token (FCM on Android, APNs on iOS via Expo).
 * Returns null if permissions are not granted.
 */
export async function getPushToken(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return null;
    }

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '通知',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const token = await Notifications.getDevicePushTokenAsync();
    return token.data; // FCM token string
  } catch {
    return null;
  }
}

/**
 * Register the push token with the backend server.
 * Call this after login or when token changes.
 */
export async function registerPushToken(): Promise<boolean> {
  try {
    const token = await getPushToken();
    if (!token) return false;

    // Check if already registered with the same token
    const prevToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (prevToken === token && (await AsyncStorage.getItem(PUSH_REGISTERED_KEY)) === '1') {
      return true; // Already registered
    }

    // Send to server
    const r = await apiPost('/api/push/subscribe', {
      endpoint: token,
      channel: 'fcm',
      keys: { p256dh: '', auth: '' }, // FCM doesn't use these, but keep format compatible
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
 * Call this on logout.
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await apiPost('/api/push/unsubscribe', { endpoint: token });
    }
    await AsyncStorage.multiRemove([PUSH_TOKEN_KEY, PUSH_REGISTERED_KEY]);
  } catch { /* ignore */ }
}

/**
 * Check if push is currently registered
 */
export async function isPushRegistered(): Promise<boolean> {
  return (await AsyncStorage.getItem(PUSH_REGISTERED_KEY)) === '1';
}
