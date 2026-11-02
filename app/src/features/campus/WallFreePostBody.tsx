/**
 * WallFreePostBody —— 自由帖的**阶段 1 文字区**（临时样板）
 *
 * 只做一件事：把正文放进**固定的浅色文字容器**里，保证不同长度都能整段阅读。
 * ⛔ 阶段 1 不做五种海报模板、不做自动排版、不按字数切换字号（那是阶段 2 的《文字海报自动排版 V1》）。
 * ⛔ 不截断：没有 `numberOfLines`，长文与中英混排都完整展示。
 *
 * 与外壳的边界（阶段 1 收尾检查）：
 *   · 浅蓝内框**只属于本文件**，⛔ 没有写进 `WallCardShell`，所以它不会被所有帖子强制套用；
 *   · 阶段 2 要换背景 / 居中 / 不同高度的海报，只替换本文件的渲染，外壳与底部互动栏不动；
 *   · 需要让内容与白色外壳"融成一层"时，本文件直接返回正文 `Text`（去掉 `Surface`）即可，
 *     不必改外壳，也不存在"双层背景"的结构性依赖。
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
