/**
 * 落盘层（P1-02）—— AsyncStorage 的**唯一**封装。
 *
 * 三条规则（都有测试守着）：
 *   1. **命名空间前缀**：避免与同机其它库/将来 Web 的数据串味；
 *   2. **JSON 序列化 + 脏数据返回 `null`**：⛔ 绝不在渲染路径上抛（会白屏）；
 *   3. ⛔ **凭据护栏**：`token` / `jwt` / `password` / `secret` / `credential` 一律**拒绝落盘**。
 *      依据：宪法 **4.1.2-2** —— 我们自己的 JWT 走 `expo-secure-store`；
 *      "禁止把任何凭据写入 AsyncStorage 明文或自建文件"。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_NAMESPACE = 'xmumdorm';

/**
 * 凭据 key 的判定：按**分隔符切分的整段**匹配，避免误伤
 * （例：`cache:tokenizer:size` 的 `tokenizer` 不是 `token`）。
 */
const CREDENTIAL_KEY_PATTERN =
  /(^|[:._/-])(token|jwt|password|passwd|secret|credential|authorization)([:._/-]|$)/i;

export class CredentialStorageError extends Error {
  constructor(key: string) {
    super(
      `⛔ 宪法 4.1.2-2：凭据不得写入 AsyncStorage（key=${key}）。我们自己的 JWT 走 expo-secure-store。`
    );
    this.name = 'CredentialStorageError';
  }
}

export function namespacedKey(key: string): string {
  return `${STORAGE_NAMESPACE}:${key}`;
}

/** 写入前的护栏（导出以便调用方提前自检） */
export function assertNotCredential(key: string): void {
  if (CREDENTIAL_KEY_PATTERN.test(namespacedKey(key))) {
    throw new CredentialStorageError(key);
  }
}

export async function setItem(key: string, value: unknown): Promise<void> {
  assertNotCredential(key);
  await AsyncStorage.setItem(namespacedKey(key), JSON.stringify(value));
}

/** 读不到 / 读坏了都返回 `fallback`（默认 `null`），⛔ 不抛 */
export async function getItem<T>(key: string, fallback: T | null = null): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(namespacedKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(namespacedKey(key));
}

/** 只列本 App 自己的 key（调试与清理用） */
export async function getAllNamespacedKeys(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter((key) => key.startsWith(`${STORAGE_NAMESPACE}:`));
  } catch {
    return [];
  }
}

/**
 * 清掉本 App 的**全部**落盘（登出时调用）。
 * ⛔ 不需要"顺便清凭据"：凭据本来就不在这里（护栏保证）。
 */
export async function clearNamespace(): Promise<void> {
  const keys = await getAllNamespacedKeys();
  if (keys.length > 0) {
    await AsyncStorage.multiRemove(keys);
  }
}
