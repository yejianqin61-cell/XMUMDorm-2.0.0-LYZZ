/**
 * 数据层：App 自己的 QueryClient + 连通性/前后台接线（P1-02）
 *
 * **为什么 App 自己建 client 而不复用 `shared/query/queryClient.js`**：
 * 那个文件导出的是 **Web 的** client（默认值按浏览器语义调过）。
 * 共享的是**契约**（query key 一律来自 `shared/query/queryKeys.js` 的 `QK`），
 * 而 client 的配置是**宿主事实** —— 与 `shared/api/platform.js` 的分工一致：
 * 宿主提供事实，shared 提供契约。
 *
 * ⛔ 默认值改这里就改了全局；各接口的 TTL 精度（banners 5min / regions 10min /
 * rankings 30s，见生产计划 §3）在**各自的 query 调用点**用 `staleTime` 覆盖。
 */

import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * 全局默认。逐条理由：
 * - `staleTime` 60s：与 Web 的 `shared/query/queryClient.js` 对齐，避免同屏两端手感不同；
 * - `gcTime` 15min：进详情再返回不重拉；
 * - `retry` 1：Weak/校园网抖动重试一次即可，⛔ 不叠到用户可感知的等待；
 * - `refetchOnWindowFocus` **false**：RN 没有 window focus 语义，开着等于悬空；
 * - `refetchOnReconnect` **true**：断网恢复后自愈（10.6 本地优先的另一半）。
 */
export const APP_QUERY_DEFAULTS = {
  staleTime: 60_000,
  gcTime: 15 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

let client: QueryClient | null = null;

/** 全 App 单一 client（惰性单例；测试可断言两次取到同一个） */
export function getQueryClient(): QueryClient {
  if (client === null) {
    client = new QueryClient({ defaultOptions: { queries: { ...APP_QUERY_DEFAULTS } } });
  }
  return client;
}

/**
 * `NetInfo → onlineManager`。
 * 为什么必须接：TanStack 默认靠 `navigator.onLine`，RN 里它不存在 → 永远认为在线，
 * "离线时用缓存 + 标 stale"（10.6 / T04）就永远不会触发。
 * @returns 解绑函数
 */
export function configureConnectivity(): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    onlineManager.setOnline(online);
  });
  return () => {
    unsubscribe();
  };
}

/**
 * `AppState → focusManager`：回到前台才算"聚焦"，让 stale 查询按需重取。
 * @returns 解绑函数
 */
export function configureFocusTracking(): () => void {
  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  });
  return () => {
    subscription.remove();
  };
}
