import { QueryClient } from '@tanstack/react-query';

/**
 * 全局 QueryClient：缓存 GET 结果，减少重复进入页面时的等待（如分区 shops 接口较慢时，二次进入可走缓存）
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
