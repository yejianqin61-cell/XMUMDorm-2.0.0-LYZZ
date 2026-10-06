import { getAllNamespacedKeys, removeItem, STORAGE_NAMESPACE } from '@/shared/storage';

let revision = 0;
const listeners = new Set<() => void>();
export function canteenRevision(): number { return revision; }
export function subscribeCanteen(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** A review changes the detail, menus and rankings, so invalidate the read domain. */
export async function invalidateCanteen(): Promise<void> {
  revision += 1;
  const prefix = `${STORAGE_NAMESPACE}:`;
  try {
    const keys = await getAllNamespacedKeys();
    await Promise.all(keys.filter((key) => key.startsWith(`${prefix}canteen:`))
      .map((key) => removeItem(key.slice(prefix.length))));
  } finally { for (const listener of listeners) listener(); }
}
