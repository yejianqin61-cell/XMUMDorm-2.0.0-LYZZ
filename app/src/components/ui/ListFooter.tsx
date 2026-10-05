/**
 * ListFooter（T05）—— 分页尾部状态（组件定义 §2.4）
 *
 * ⛔ **"错误必须带 retry"用类型保证**：`state: 'retry'` 那一支**必须**给 `onRetry`，
 *    否则 `tsc` 就不过。这比"写进文档让后人记得"可靠。
 *
 * 四态（组件定义 §2.4）：`idle`（什么都不显示）· `loading`（**不配文字**，10.5-5）·
 * `end`（没有更多了，是本组件唯一允许的一句文案，由页面传入）· `retry`（失败 + 重试按钮）。
 *
 * ⛔ `loading` 与 `retry` **不得同时**出现：分页状态机（`{refresh,append}×{Loading,Error}`）
 *    保证同一时刻只有一个在跑，组件按这个前提设计（多给一个 prop 就等于允许非法状态）。
 */

import * as React from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Button } from './Button';
import { Text } from './Text';

type CommonProps = {
  /** `end` 态文案（由页面传入词条，⛔ 组件不写死文案） */
  endLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export type ListFooterProps = CommonProps &
  (
    | { state: 'idle' | 'loading' | 'end' }
    | { state: 'retry'; onRetry: () => void; retryLabel: string }
  );

export function ListFooter(props: ListFooterProps): React.ReactElement | null {
  const theme = useTheme();
  const { endLabel, style, testID } = props;

  if (props.state === 'idle') return null;

  return (
    <View
      testID={testID}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: theme.space('space_4'),
        },
        style,
      ]}
    >
      {props.state === 'loading' ? (
        // ⛔ 不放「加载中…」这类文字（宪法 10.5-5）
        <ActivityIndicator size="small" color={theme.color['icon-secondary'].value} />
      ) : null}

      {props.state === 'end' && endLabel ? (
        <Text role="caption" colorToken="text-muted" align="center">
          {endLabel}
        </Text>
      ) : null}

      {props.state === 'retry' ? (
        <Button label={props.retryLabel} variant="secondary" size="small" onPress={props.onRetry} />
      ) : null}
    </View>
  );
}
