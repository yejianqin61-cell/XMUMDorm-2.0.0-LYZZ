import { useState, useRef, useCallback } from 'react';
import { ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

/**
 * Custom hook for scroll-to-top button visibility and behavior.
 * Shows a floating button when scrolled past threshold pixels.
 */
export function useScrollToTop(threshold = 480) {
  const scrollRef = useRef<ScrollView>(null);
  const [showTopBtn, setShowTopBtn] = useState(false);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      setShowTopBtn(y > threshold);
    },
    [threshold]
  );

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  return { scrollRef, showTopBtn, onScroll, scrollToTop };
}
