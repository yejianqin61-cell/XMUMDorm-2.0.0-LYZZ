/**
 * JPush Service — Capacitor native push via 极光推送
 *
 * iOS: APNs → JPush → App
 * Android (有 Google): FCM → JPush → App
 * Android (华为/小米/OPPO/vivo): 厂商通道 → JPush → App
 * Web: 继续使用 sw.js Web Push — 不受影响
 */
import { isNative, isIOS, isAndroid } from '../utils/capacitor';

let _registrationId = null;

/**
 * Initialize JPush on native platforms.
 * Web push is handled by sw.js — not touched.
 */
export async function initJPush() {
  if (!isNative()) return;

  try {
    // JPush phonegap plugin is available at window.plugins.jPushPlugin
    const jpush = window.plugins && window.plugins.jPushPlugin;
    if (!jpush) {
      console.warn('[jpush] Plugin not available on this device');
      return;
    }

    // Initialize JPush
    jpush.init();

    // Listen for registration ID
    jpush.getRegistrationID((rid) => {
      _registrationId = rid;
      console.log('[jpush] Registration ID:', rid);
      // Send registration ID to backend
      registerDevice(rid);
    });

    // Foreground notification received
    jpush.receiveNotificationInAndroidCallback = true;
    if (isAndroid()) {
      window.addEventListener('jpush.receiveNotification', (event) => {
        const notif = event && event.detail;
        console.log('[jpush] Received notification:', notif?.title);
        // Could show in-app banner here
      });
    }

    // User tapped notification
    window.addEventListener('jpush.openNotification', (event) => {
      const extras = event?.detail?.extras || event?.detail || {};
      const url = extras.url || extras['cn.jpush.android.EXTRA']?.url;
      if (url) {
        window.location.href = url;
      }
    });

    console.log('[jpush] Initialized on', isIOS() ? 'iOS' : 'Android');
  } catch (err) {
    console.warn('[jpush] Init failed:', err);
  }
}

/**
 * Get the current JPush registration ID (device token).
 */
export function getRegistrationId() {
  return _registrationId;
}

/**
 * Send registration ID to backend for push targeting.
 */
async function registerDevice(rid) {
  try {
    const { API_BASE_URL } = await import('@shared/api/config');
    const token = await getAuthToken();
    await fetch(`${API_BASE_URL}/api/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        token: rid,
        platform: isIOS() ? 'ios' : 'android',
        provider: 'jpush',
      }),
    });
    console.log('[jpush] Device registered with backend');
  } catch {
    // Best-effort
  }
}

async function getAuthToken() {
  try {
    const localStorage = window.localStorage;
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}
