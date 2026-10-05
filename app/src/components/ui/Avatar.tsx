/**
 * Avatar（A07）—— 用户 / 社团 / 组织头像（组件定义 §2.1）
 *
 * 三件事说清楚：
 *   1. **尺寸用间距令牌表达**：令牌源里**没有** avatar 尺寸档位（调研已登记该缺口），
 *      所以本组件的 `size` 收 `SpaceKey`（如 `space_8` = 32）。⛔ 不收裸数字。
 *      若设计日后定了专用档位，只需把这里换成新令牌组，**调用点不用改形状**。
 *   2. **必须有 fallback**：没图时显示**首字母**，不显示"灰色方块"——空头像是最常见的破版来源。
 *   3. **加载器用 `expo-image`**（宪法 9.9 第①层清单指定，⛔ 不重造），它给了跨端一致的
 *      占位与缓存；`contentFit="cover"` 是头像唯一正确的裁切方式。
 *
 * ⛔ 本组件不设底色（`Surface` 的事）；无图时的底色用 `bg-sunken`，**只在这一处**出现。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '@/design-system/theme';
import type { SpaceKey } from '@/design-system/px';
import { Text } from './Text';

export type AvatarKind = 'user' | 'club' | 'org';

export type AvatarProps = {
  kind?: AvatarKind;
  /** 图片地址；给了 `uri` 才走 Image，否则一律 fallback（⛔ 不为空地址发请求） */
  uri?: string | null;
  /** 尺寸档位（间距令牌）。默认 `space_8` = 32 */
  size?: SpaceKey;
  /** fallback 的首字母（`user` 用昵称首字，`club`/`org` 用名称首字） */
  fallbackText?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** 取首个字符作为 fallback（中英文都成立：中文取一个字，英文取一个字母） */
export function avatarInitial(text: string | null | undefined): string {
  if (typeof text !== 'string') return '';
  const trimmed = text.trim();
  return trimmed.length > 0 ? [...trimmed][0] : '';
}

export function Avatar({
  kind = 'user',
  uri,
  size = 'space_8',
  fallbackText,
  style,
  testID,
}: AvatarProps): React.ReactElement {
  const theme = useTheme();
  const dimension = theme.space(size);
  const hasImage = typeof uri === 'string' && uri.length > 0;
  const initial = avatarInitial(fallbackText);

  const base: StyleProp<ViewStyle> = [
    {
      width: dimension,
      height: dimension,
      borderRadius: theme.radius('radius_full'),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    style,
  ];

  if (hasImage) {
    return (
      <View testID={testID} style={base}>
        <Image
          source={{ uri }}
          style={{ width: dimension, height: dimension }}
          contentFit="cover"
          // 头像不承载文字，读屏标签由外层（列表行 / 作者行）给
          accessible={false}
          transition={0}
        />
      </View>
    );
  }

  return (
    <View
      testID={testID}
      // 无图时用 sunken 底 + 主文字色；⛔ 不用品牌色（会把"占位"误读成"选中"）
      style={[base, { backgroundColor: theme.color['bg-sunken'].value }]}
      accessibilityRole="image"
      accessibilityLabel={initial}
    >
      {initial.length > 0 ? (
        <Text role="label" emphasis="strong" colorToken="text-secondary" numberOfLines={1}>
          {initial}
        </Text>
      ) : null}
    </View>
  );
}
