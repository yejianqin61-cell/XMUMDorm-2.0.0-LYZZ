/**
 * FormSection（K02）—— 表单分节（组件定义 §2.3 / §3.2.1）
 *
 * 职责只有一件：**把一串字段归到一个小标题下**（"标题 + 字段组"）。
 * ⛔ 它**不管**字段级错误、不管提交——那些是 `K03` / `K01` 的事。
 * ⛔ 组件内不写文案：标题与说明由页面传词条。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Text } from './Text';

export type FormSectionProps = {
  /** 分节标题（≤12 汉字，§3.2.1） */
  title: string;
  /** 可选说明（≤30 汉字）；⛔ 不写说明性旁白 */
  description?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function FormSection({
  title,
  description,
  children,
  style,
  testID,
}: FormSectionProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View testID={testID} style={[{ gap: theme.space('space_3') }, style]}>
      <View style={{ gap: theme.space('space_1') }}>
        <Text role="headline" emphasis="strong" colorToken="text-primary" numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text role="caption" colorToken="text-secondary" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
