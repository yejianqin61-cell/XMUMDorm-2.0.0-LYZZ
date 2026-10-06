import { getAllNamespacedKeys, getItem, setItem, removeItem, STORAGE_NAMESPACE } from '@/shared/storage';

let revision = 0;
const listeners = new Set<() => void>();
let diskQueue: Promise<void> = Promise.resolve();
let persistentVersion = 0;
let initialized: Promise<void> | null = null;
const VERSION_KEY = 'canteen:cache-generation';
const pending = new Map<string, Promise<unknown>>();
function initialize(): Promise<void> {
  initialized ??= getItem<unknown>(VERSION_KEY).then((value) => {
    persistentVersion = typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
  });
  return initialized;
}
export async function readCanteenCache(key: string, ttlMs: number): Promise<{ raw: unknown; fresh: boolean } | null> {
  await diskQueue; await initialize();
  const value = await getItem<{ version?: number; generation?: number; savedAt?: number; raw?: unknown }>(key);
  if (!value || value.version !== 1 || value.generation !== persistentVersion || typeof value.savedAt !== 'number' || !Number.isFinite(value.savedAt) || !Object.hasOwn(value, 'raw')) return null;
  const age = Date.now() - value.savedAt;
  return { raw: value.raw, fresh: age >= 0 && age < ttlMs };
}
export async function writeCanteenCache(key: string, raw: unknown, requestRevision: number, now: number = Date.now()): Promise<void> {
  const write = diskQueue.then(async () => {
    await initialize();
    if (revision === requestRevision) await setItem(key, { version: 1, generation: persistentVersion, savedAt: now, raw });
  });
  diskQueue = write.catch(() => undefined);
  await write;
}
export function requestCanteen(key: string, load: () => Promise<unknown>): Promise<unknown> {
  const requestKey = `${key}:${revision}`;
  const existing = pending.get(requestKey);
  if (existing) return existing;
  const promise = Promise.resolve().then(load).finally(() => { pending.delete(requestKey); });
  pending.set(requestKey, promise);
  return promise;
}
export function canteenRevision(): number { return revision; }
export function subscribeCanteen(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** A review changes the detail, menus and rankings, so invalidate the read domain. */
export async function invalidateCanteen(): Promise<void> {
  revision += 1;
  const prefix = `${STORAGE_NAMESPACE}:`;
  const clear = diskQueue.then(async () => {
    await initialize();
    persistentVersion += 1;
    await setItem(VERSION_KEY, persistentVersion);
    const keys = await getAllNamespacedKeys();
    await Promise.all(keys.filter((key) => key.startsWith(`${prefix}canteen:`) && key !== `${prefix}${VERSION_KEY}`)
      .map((key) => removeItem(key.slice(prefix.length))));
  });
  diskQueue = clear.catch(() => undefined);
  try { await clear; } finally { for (const listener of listeners) listener(); }
}
