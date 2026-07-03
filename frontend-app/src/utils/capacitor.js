/**
 * Capacitor Platform Detection Utility
 *
 * All Capacitor-native logic is gated behind isNative() checks.
 * This ensures ZERO impact on the web experience.
 *
 * Usage:
 *   import { isNative, isIOS, isAndroid, isWeb, initCapacitor } from '../utils/capacitor';
 *
 *   if (isNative()) {
 *     // Capacitor-specific code (push, camera, haptics...)
 *   }
 *   // Web path continues unchanged
 */

let _platform = 'web';

/**
 * Initialize Capacitor platform detection.
 * Call once in main.jsx before any Capacitor-specific code.
 *
 * In Capacitor WebView, window.Capacitor is injected as a global before the app loads.
 * Vite externalizes @capacitor/*, so dynamic import() won't work — use the global.
 */
export async function initCapacitor() {
  try {
    // Capacitor WebView: available as window.Capacitor global
    const Capacitor = window.Capacitor;
    if (Capacitor) {
      _platform = Capacitor.getPlatform();
      if (_platform !== 'web') {
        document.body.classList.add('capacitor-native');
        document.body.classList.add(`capacitor-${_platform}`);
        console.log(`[capacitor] Running on ${_platform}`);
      }
    }
  } catch {
    _platform = 'web';
  }
}

export function isNative() {
  return _platform !== 'web';
}

export function isIOS() {
  return _platform === 'ios';
}

export function isAndroid() {
  return _platform === 'android';
}

export function isWeb() {
  return _platform === 'web';
}

export function getPlatform() {
  return _platform;
}
