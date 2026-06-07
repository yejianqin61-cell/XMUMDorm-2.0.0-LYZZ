import { useCallback } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface UseInfiniteScrollOptions {
  hasMoreRef: React.MutableRefObject<boolean>;
  fetchingRef: React.MutableRefObject<boolean>;
  onLoadMore: () => void;
  threshold?: number;
}

/**
 * Custom hook that triggers loadMore when the user scrolls near the bottom.
 * Uses refs (not state) to avoid re-renders during scroll.
 */
export function useInfiniteScroll({
  hasMoreRef,
  fetchingRef,
  onLoadMore,
  threshold = 800,
}: UseInfiniteScrollOptions) {
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - threshold) {
        if (hasMoreRef.current && !fetchingRef.current) {
          onLoadMore();
        }
      }
    },
    [hasMoreRef, fetchingRef, onLoadMore, threshold]
  );

  return { onScroll };
}
