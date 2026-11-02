/**
 * WallFreePostBody —— 自由帖的**阶段 1 文字区**（临时样板）
 *
 * 只做一件事：把正文放进**固定的浅色文字容器**里，保证不同长度都能整段阅读。
 * ⛔ 阶段 1 不做五种海报模板、不做自动排版、不按字数切换字号（那是阶段 2 的《文字海报自动排版 V1》）。
 * ⛔ 不截断：没有 `numberOfLines`，长文与中英混排都完整展示。
 */

import * as React from 'react';
import { View } from 'react-native';

import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';

export function WallFreePostBody({ content }: { content: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <Surface
      testID="wall-free-body"
      variant="brandSoft"
      rounded="radius_medium"
      padding="space_4"
      style={{ minHeight: theme.space('space_12'), justifyContent: 'center' }}
    >
      <Text testID="wall-free-text" role="body" colorToken="text-primary">
        {content}
      </Text>
    </Surface>
  );
}

/** 详情页复用的自由帖正文（页面级正文，不套卡片容器） */
export function WallFreePostText({ content }: { content: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <View testID="wall-free-text" style={{ gap: theme.space('space_2') }}>
      <Text role="body" colorToken="text-primary">
        {content}
      </Text>
    </View>
  );
}
