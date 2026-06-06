# Mobile Development Rules

## Tech Stack
- **Framework**: Expo SDK 52+
- **Routing**: Expo Router (file-based)
- **State**: TanStack Query + React Context
- **Styling**: `StyleSheet.create()` + `expo-blur` for glass effects
- **HTTP**: same `fetch()` API layer as Web
- **Icons**: `@expo/vector-icons`

## Naming Conventions
- **Screens**: `camelCase.tsx` in `mobile/src/app/` (matching route path)
- **Components**: `PascalCase.tsx` in `mobile/src/components/`
- **API files**: `camelCase.ts` in `mobile/src/api/` (same name as Web counterpart)
- **Context**: `PascalCase.ctx.tsx` in `mobile/src/context/`

## Component Pattern

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchPosts } from '../../api/posts';
import { GlassView } from '../../components/ui/GlassView';
import { EmptyState } from '../../components/ui/EmptyState';

export default function ScreenName() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

  if (isLoading) return <SkeletonPost />;
  if (error) return <EmptyState message="加载失败" />;

  return (
    <View style={styles.container}>
      {/* content */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
```

## Performance Rules (CRITICAL)
1. **Large lists** → `FlatList` or `FlashList`, NEVER `ScrollView` for large datasets
2. **Memoize list items** → `React.memo()` for item components
3. **Stable callbacks** → `useCallback` for `onPress` handlers in lists
4. **Images** → use `expo-image`, NEVER bare React Native `Image`
5. **Animations** → only animate `transform` + `opacity` (GPU-accelerated)
6. **Avoid inline objects** → `style={{...}}` creates new object every render

## Liquid Glass Effect
```tsx
import { BlurView } from 'expo-blur';

// Primary approach: expo-blur
<BlurView intensity={20} tint="light" style={styles.glass}>
  <Text>Content</Text>
</BlurView>

// Fallback: semi-transparent background
<View style={styles.glassFallback}>
  <Text>Content</Text>
</View>
```

## Platform-Specific
- **Safe areas**: Always wrap in `SafeAreaView` or use `useSafeAreaInsets()`
- **Keyboard**: Handle with `KeyboardAvoidingView`
- **Touch**: Use `Pressable`, NOT `TouchableOpacity`
- **Conditional rendering**: Use ternary `condition ? <A /> : null`, NOT `condition && <A />`

## 1:1 Web Parity
- Same component hierarchy as Web counterpart
- Same state management patterns
- Same API calls (reuse `api/` layer)
- Visual match through equivalent RN styles
