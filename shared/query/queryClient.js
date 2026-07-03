import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient: cache GET results to reduce repeat wait time when revisiting pages.
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
