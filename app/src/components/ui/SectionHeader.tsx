/**
 * SectionHeader（K07）—— 分区标题（组件定义 §2.3）
 *
 * **Neo-Brutalism 白名单第 3 类**（组件定义 §5.2：`A08 Badge` / `K07 SectionHeader` 允许 NB）。
 * 白名单给的三件套是"`border.strong` 2px + 硬偏移 + 高对比色块"。
 * ⚠️ **本组件只取其中的 2px 描边**，理由是另外两件在这里会打架：
 *   - "高对比色块"会在每个分区上盖一块色，直接违反宪法 2.4-3（暗色层级由**表面色**表达）；
 *   - "硬偏移"是给**小块**（角标）设计的，拉成整行后视觉噪音远大于收益。
 *   → 结论：NB 是**允许**而非**必须**；这里保留它最有信息量的那一件（2px 硬描边）。
 *   ⛔ 这不是"忽略白名单"，是**在白名单内做取舍**，差异已写在这里与任务文档。
 *
 * 变体：`plain` · `withAction`（右侧文字动作，⛔ 动作文案 ≤6 汉字，§3.6）
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Button } from './Button';
import { Text } from './Text';

export type SectionHeaderVariant = 'plain' | 'withAction';

export type SectionHeaderProps = {
  title: string;
  variant?: SectionHeaderVariant;
  /** `withAction` 必填 */
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function SectionHeader({
  title,
  variant = 'plain',
  actionLabel,
  onActionPress,
  style,
  testID,
}: SectionHeaderProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.space('space_3'),
          paddingHorizontal: theme.space('space_4'),
          paddingBottom: theme.space('space_1'),
          // NB 白名单用法：2px 硬描边（⛔ 不是阴影）
          borderBottomWidth: theme.borderWidth('border_width_brutal'),
          borderBottomColor: theme.color['border-strong'].value,
        },
        style,
      ]}
    >
      <Text role="headline" emphasis="strong" colorToken="text-primary" numberOfLines={1}>
        {title}
      </Text>
      {variant === 'withAction' && actionLabel ? (
        <Button label={actionLabel} variant="link" size="small" onPress={onActionPress} />
      ) : null}
    </View>
  );
}
