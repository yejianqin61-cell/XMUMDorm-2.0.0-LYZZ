/**
 * Capacitor Push Notification Service
 *
 * Native (iOS/Android): Uses @capacitor/push-notifications
 * Web: Uses existing Service Worker Web Push (sw.js) — UNCHANGED
 *
 * All native code is gated behind isNative() — ZERO impact on web.
 */
import { isNative, isIOS, isAndroid } from '../utils/capacitor';

/**
 * Initialize push notifications on native platforms only.
 * Call once after React renders (in main.jsx or App.jsx).
 *
 * Web push is handled by registerServiceWorker.js + sw.js — not touched.
 */
export async function initPush() {
  if (!isNative()) return; // Web: use existing sw.js push

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      console.log('[push] Permission denied');
      return;
    }

    // Register with FCM/APNs
    await PushNotifications.register();

    // Foreground notification received
    PushNotifications.addListener('pushNotificationReceived', (notif) => {
      console.log('[push] Received:', notif.title);
      // In-app banner could be shown here
    });

    // User tapped notification → navigate
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification?.data?.url;
      if (url) {
        // Use location to navigate (works with React Router hash routing)
        window.location.href = url;
      }
    });

    // Registration success → send token to backend
    PushNotifications.addListener('registration', (token) => {
      console.log('[push] Device token:', token.value);
      // TODO: POST token.value to /api/push/register
      registerToken(token.value);
    });

    // Registration error
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[push] Registration error:', err);
    });

    console.log('[push] Initialized on ' + (isIOS() ? 'iOS' : 'Android'));
  } catch (err) {
    console.warn('[push] Not available:', err.message);
  }
}

/**
 * Send device push token to backend for targeting.
 */
async function registerToken(token) {
  try {
    const { API_BASE_URL } = await import('../api/config');
    const token_ = await getAuthToken();
    await fetch(`${API_BASE_URL}/api/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token_ ? { Authorization: `Bearer ${token_}` } : {}),
      },
      body: JSON.stringify({ token, platform: isIOS() ? 'ios' : 'android' }),
    });
  } catch {
    // Silently fail — push registration is best-effort
  }
}

async function getAuthToken() {
  try {
    const { getToken } = await import('../api/request');
    return await getToken();
  } catch {
    return null;
  }
}
