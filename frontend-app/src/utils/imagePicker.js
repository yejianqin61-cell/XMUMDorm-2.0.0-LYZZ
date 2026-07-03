/**
 * Unified Image Picker — Capacitor Camera + Web fallback.
 *
 * Native (iOS/Android): Uses @capacitor/camera for camera/photo-library
 * Web: Uses <input type="file"> — EXACTLY as before, unchanged behavior.
 *
 * Usage:
 *   import { pickImage } from '../utils/imagePicker';
 *   const file = await pickImage('gallery');  // or 'camera'
 *   // file is a Blob/File ready for FormData upload
 */
import { isNative } from './capacitor';

/**
 * Pick an image from gallery or camera.
 * @param {'gallery' | 'camera'} source — default 'gallery'
 * @returns {Promise<File | null>} — File for FormData upload, or null if cancelled
 */
export async function pickImage(source = 'gallery') {
  // === Web path: existing <input type="file"> behavior — UNCHANGED ===
  if (!isNative()) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (source === 'camera') {
        input.capture = 'environment';
      }
      input.onchange = () => {
        const file = input.files?.[0] || null;
        resolve(file);
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  // === Native path: Capacitor Camera ===
  try {
    const { Camera, CameraSource } = await import('@capacitor/camera');

    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      resultType: 'base64',
    });

    if (!photo.base64String) return null;

    // Convert base64 to Blob for FormData upload
    const byteChars = atob(photo.base64String);
    const byteArrays = [];
    for (let offset = 0; offset < byteChars.length; offset += 512) {
      const slice = byteChars.slice(offset, offset + 512);
      const nums = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) nums[i] = slice.charCodeAt(i);
      byteArrays.push(new Uint8Array(nums));
    }
    const blob = new Blob(byteArrays, { type: `image/${photo.format || 'jpeg'}` });

    return new File([blob], `photo_${Date.now()}.${photo.format || 'jpg'}`, {
      type: `image/${photo.format || 'jpeg'}`,
    });
  } catch (err) {
    if (err?.message?.includes('cancel') || err?.message?.includes('Cancelled')) {
      return null;
    }
    console.warn('[imagePicker] Capacitor camera failed, falling back to input:', err);
    // Fallback to web input even on native (graceful degradation)
    return pickImageFallback(source);
  }
}

/** Fallback using <input type="file"> — same as web path */
function pickImageFallback(source) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.capture = 'environment';
    input.onchange = () => resolve(input.files?.[0] || null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
