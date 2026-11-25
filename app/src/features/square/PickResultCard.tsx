/**
 * 「今天吃什么」抽签结果卡（R4-22）：弹一下亮出抽到的菜，让用户决定「去看看」还是「换一个」。
 * 系统开了「减弱动态效果」时直接显示，不做缩放。
 */
import * as React from 'react';
import { Animated, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { tapFeedback } from '@/shared/haptics';
import { useI18n } from '@/i18n';

export type PickedMeal = { id: number; name: string; shop: string };

export function PickResultCard({ meal, busy, onOpen, onAgain }: { meal: PickedMeal; busy: boolean; onOpen: () => void; onAgain: () => void }): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const scale = React.useRef(new Animated.Value(theme.reduceMotion ? 1 : 0.8)).current;

  // 抽到结果时震一下（与动画无关，「减弱动态效果」下照常）
  React.useEffect(() => { tapFeedback('success'); }, [meal.id]);

  React.useEffect(() => {
    if (theme.reduceMotion) return;
    scale.setValue(0.8);
    const spring = Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true });
    spring.start();
    return () => spring.stop();
  }, [meal.id, scale, theme.reduceMotion]);

  return (
    <Animated.View
      testID="canteen-picked"
      accessibilityLiveRegion="polite"
      style={{
        transform: [{ scale }],
        gap: theme.space('space_3'),
        padding: theme.space('space_4'),
        borderRadius: theme.radius('radius_large'),
        borderWidth: theme.borderWidth('border_width_brutal'),
        borderColor: theme.color['action-accent'].value,
        backgroundColor: theme.color['bg-surface'].value,
      }}
    >
      <Text role="title" emphasis="strong" colorToken="text-primary" numberOfLines={2}>{meal.name}</Text>
      {meal.shop ? <Text role="caption" colorToken="text-secondary">{meal.shop}</Text> : null}
      <View style={{ flexDirection: 'row', gap: theme.space('space_2') }}>
        <Button testID="canteen-picked-open" label={t('canteen.pick.open')} variant="primary" size="small" onPress={onOpen} />
        <Button testID="canteen-picked-again" label={t('canteen.pick.again')} variant="ghost" size="small" loading={busy} onPress={onAgain} />
      </View>
    </Animated.View>
  );
}
