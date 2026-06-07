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
 */
export async function initCapacitor() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    _platform = Capacitor.getPlatform();
    if (_platform !== 'web') {
      // Add class to body for CSS targeting (e.g., remove phone-simulator)
      document.body.classList.add('capacitor-native');
      document.body.classList.add(`capacitor-${_platform}`);
      console.log(`[capacitor] Running on ${_platform}`);
    }
  } catch {
    // @capacitor/core not available → web environment
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
