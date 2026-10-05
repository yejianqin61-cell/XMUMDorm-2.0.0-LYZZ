/**
 * JWT 落盘（P1-13）—— **`expo-secure-store` 是唯一的家**
 *
 * 依据宪法 **4.1.2-2**：
 * > 我们自己的 JWT 走 `expo-secure-store`；**禁止**把任何凭据写入 AsyncStorage 明文或自建文件。
 *
 * 因此本文件里**不会**出现 `@/shared/storage`（那是 AsyncStorage，且它自己就有凭据护栏，
 * 见到 `token`/`jwt` 这类 key 会直接抛）。用例也把这条写成源码断言。
 *
 * ## 为什么要有"内存镜像"
 * 请求层（`shared/api/request.js`）读 token 是**同步**的（`getToken()`），
 * 而 SecureStore 只有异步 API。所以：
 *   · 冷启动 / 登录 / 登出时用异步 API 读写**真源**；
 *   · 同时维护一份**内存镜像**给请求层同步读（`setTokenGetter` 注入的就是它）。
 */

import * as SecureStore from 'expo-secure-store';

/** SecureStore 的 key 只允许 `[A-Za-z0-9._-]` */
export const JWT_STORAGE_KEY = 'xmumdorm.jwt';

let memoryToken: string | null = null;

/** 请求层用的**同步**读取器（⛔ 不要拿它当"是否已登录"的唯一依据，见 `session.tsx`） */
export function readTokenSync(): string | null {
  return memoryToken;
}

/**
 * 冷启动水合：把 SecureStore 里的令牌灌进内存镜像。
 * ⛔ 失败一律当作"没有令牌"（SecureStore 在 Web/无原生环境下不可用）——**不抛**，
 *    否则会让根布局在启动时白屏。
 */
export async function hydrateToken(): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(JWT_STORAGE_KEY);
    memoryToken = stored ?? null;
    return memoryToken;
  } catch {
    memoryToken = null;
    return null;
  }
}

/** 登录成功后写入（同时更新内存镜像，登录后的第一个请求就能带上它） */
export async function saveToken(token: string): Promise<void> {
  memoryToken = token;
  try {
    await SecureStore.setItemAsync(JWT_STORAGE_KEY, token);
  } catch {
    // 写不进去也不要回滚内存镜像：本次会话仍可用；下次冷启动需要重新登录
  }
}

/** 登出 / 会话失效时清除（**先清内存**：清完立刻生效，⛔ 不给"清了一半"的中间态） */
export async function clearToken(): Promise<void> {
  memoryToken = null;
  try {
    await SecureStore.deleteItemAsync(JWT_STORAGE_KEY);
  } catch {
    // 删不掉也只能继续：内存已清，请求不会再带旧令牌
  }
}

/** 测试辅助：把镜像重置（生产代码不调用） */
export function resetTokenMirrorForTests(): void {
  memoryToken = null;
}
