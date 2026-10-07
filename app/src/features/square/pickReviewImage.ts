import * as ImagePicker from 'expo-image-picker';
import type { PickResult } from '@/components/ui/MediaPicker';

/** SDK57 image-library selection needs no camera/microphone permission. */
export async function pickReviewImage(): Promise<PickResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1 });
    if (result.canceled) return { ok: false, reason: 'cancelled' };
    const image = result.assets[0];
    if (!image || !image.uri || !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType ?? '') || typeof image.fileSize !== 'number') return { ok: false, reason: 'failed' };
    return { ok: true, image: { uri: image.uri, mimeType: image.mimeType, sizeBytes: image.fileSize } };
  } catch { return { ok: false, reason: 'failed' }; }
}
