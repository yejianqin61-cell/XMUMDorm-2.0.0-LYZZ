/**
 * MediaGrid（K18）—— 图片网格（组件定义 §2.6）
 *
 * 形态：`grid`（1/2/3/4/9 宫格）· `hero`（头图，单图满宽）。
 * 列数**由张数决定**（1/2/3 → 单行；4 → 2×2；9 → 3×3），不是由页面随便传一个数字 ——
 * 所以 `mediaGridColumns` 是纯函数、可测，页面只给"有几张图"。
 *
 * ⚠️ **图片替代文本**（§7.3：图片要有替代文本）：调用方传 `alt`；
 *   ⛔ 传不出替代文本时**不要让读屏念"图片"**（那是纯噪音）——
 *   本组件在这种情况把它当**装饰**处理（不进无障碍树），并把这件事写在 props 注释里。
 *
 * ⛔ 组件内不写任何文案（无 i18n 字面量）：宫格本身没有可读文字。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '@/design-system/theme';
import { Pressable } from './Pressable';

export type MediaGridVariant = 'grid' | 'hero';

/** 张数 → 列数（纯函数）。⛔ 不要给页面一个 `columns` prop：那会让同一份数据在不同页面排得不一样 */
export function mediaGridColumns(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 2;
  return 3; // 5–9 张一律 3 列（9 宫格；5–8 张末行不满）
}

export type MediaGridProps = {
  uris: readonly string[];
  variant?: MediaGridVariant;
  /** 每张图的替代文本（与 `uris` 同序；缺项视为装饰） */
  alt?: readonly string[];
  onPressImage?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function MediaGrid({
  uris,
  variant = 'grid',
  alt,
  onPressImage,
  style,
  testID,
}: MediaGridProps): React.ReactElement {
  const theme = useTheme();
  const gap = theme.space('space_1');
  const columns = variant === 'hero' ? 1 : mediaGridColumns(uris.length);
  if (columns === 0) {
    return <View testID={testID} style={style} />;
  }

  return (
    <View
      testID={testID}
      style={[{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap,
      }, style]}
    >
      {uris.map((uri, index) => {
        const label = alt?.[index];
        // 末行不满时补位：三列时第 1 张占两列（视觉上不留一个空洞）
        const span = columns === 3 && uris.length === 2 && index === 0 ? 2 : 1;
        return (
          <Pressable
            key={`media-${index}`}
            testID={testID ? `${testID}-${index}` : undefined}
            onPress={onPressImage ? () => onPressImage(index) : undefined}
            disabled={onPressImage === undefined}
            // 有替代文本才是"图像"；没有就整块隐藏（⛔ 不播报"图片"这种噪音）
            accessibilityRole={label ? 'image' : undefined}
            accessibilityLabel={label}
            accessibilityState={{ disabled: onPressImage === undefined }}
            importantForAccessibility={label ? undefined : 'no-hide-descendants'}
            accessibilityElementsHidden={label === undefined}
            style={{
              // 用 flex 比例而不是固定像素宽：宫格宽度随容器走（宪法 17 大屏也成立）
              flexGrow: span,
              flexBasis: `${100 / columns}%`,
              aspectRatio: variant === 'hero' ? 16 / 9 : 1,
              borderRadius: theme.radius('radius_small'),
              overflow: 'hidden',
            }}
          >
            <Image
              source={{ uri }}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
              accessible={false}
              transition={0}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
