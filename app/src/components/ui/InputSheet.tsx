/**
 * InputSheet（O08）—— **文本底框**：底部输入条 / 底部输入 Sheet（组件定义 §2.3/§3.3.3）
 *
 * 与 `C04` / `C05` 的分工（§3.3.1 三个不同职责，不得混用）：
 *   - `C04 Input` / `C05 TextArea` = **表单内**字段
 *   - **`O08` = 不在表单内的"文本底框"**：评论 / 回复 / 私信
 *
 * ⛔ **跑腿详情永不出现输入框**（§3.3.3 反向规则①）—— 那是页面纪律，但本组件也**不提供**
 *    任何"私信"默认文案，避免被顺手用在跑腿详情上。
 * ⛔ 上限由**页面注入**（万能墙 500 / 指南 800 / 私信 1200 都是页面的事，§3.2.2-③）。
 * ⛔ **失败绝不丢内容**（§4 的状态表 `failed` 行）：`onSend` 是异步的话，失败由页面
 *    决定保留 `value`，本组件**从不清空输入** —— 清空是调用方在成功后的责任。
 *
 * **insets 从唯一容器取**（宪法 17.1-S2/S7）：本组件是覆盖层，用 `useScreenInsets()`
 * 拿键盘与底部留白，⛔ 不自己调 `useSafeAreaInsets()`。
 */

import * as React from 'react';
import { Pressable, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import X from 'lucide-react-native/icons/x';

import { useTheme } from '@/design-system/theme';
import { useScreenInsets } from './Screen';
import { counterLabel, counterState } from './TextArea';
import { Icon } from './Icon';
import { Text } from './Text';

export type InputSheetProps = {
  value: string;
  onChangeText?: (next: string) => void;
  placeholder?: string;
  /** 发送键文案（动词开头，≤6 汉字） */
  sendLabel: string;
  onSend: () => void;
  /** 上限（页面注入）；配 `counter` 使用 */
  maxLength?: number;
  counter?: boolean;
  /** 正在回复谁（显示 ReplyBar；匿名域**不得**回显身份，由页面决定传什么） */
  replyingTo?: string;
  replyCancelLabel?: string;
  onCancelReply?: () => void;
  disabled?: boolean;
  /** 发送失败时置位：**输入内容保持不动**，只换发送键的状态 */
  sending?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function InputSheet({
  value,
  onChangeText,
  placeholder,
  sendLabel,
  onSend,
  maxLength,
  counter = false,
  replyingTo,
  replyCancelLabel,
  onCancelReply,
  disabled = false,
  sending = false,
  style,
  testID,
}: InputSheetProps): React.ReactElement {
  const theme = useTheme();
  // S7：覆盖层从唯一安全区容器取 insets（⛔ 本文件不调 useSafeAreaInsets）
  const insets = useScreenInsets();
  const state = counterState(value.length, maxLength);

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: theme.color['bg-surface'].value,
          borderTopWidth: theme.borderWidth('border_width_hairline'),
          borderTopColor: theme.color['border-subtle'].value,
          // 键盘 + 底部安全区**合并计算**（宪法 17.1-S6）
          paddingBottom: insets.contentBottomPadding + insets.keyboardPadding,
        },
        style,
      ]}
    >
      {replyingTo ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space('space_2'),
            paddingHorizontal: theme.space('space_4'),
            paddingTop: theme.space('space_2'),
          }}
        >
          <View style={{ flex: 1 }}>
            <Text role="caption" colorToken="text-secondary" numberOfLines={1}>
              {replyingTo}
            </Text>
          </View>
          <Pressable
            onPress={onCancelReply}
            accessibilityLabel={replyCancelLabel}
            testID={testID ? `${testID}-cancel-reply` : undefined}
          >
            <Icon source={X} size="body" tint="secondary" />
          </Pressable>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: theme.space('space_2'),
          paddingHorizontal: theme.space('space_4'),
          paddingVertical: theme.space('space_2'),
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.color['text-muted'].value}
          editable={!disabled}
          multiline
          maxLength={maxLength}
          allowFontScaling
          accessibilityLabel={placeholder}
          accessibilityState={{ disabled }}
          style={{
            flex: 1,
            color: theme.color['text-primary'].value,
            backgroundColor: theme.color['bg-sunken'].value,
            borderRadius: theme.radius('radius_medium'),
            paddingHorizontal: theme.space('space_3'),
            paddingVertical: theme.space('space_2'),
            minHeight: theme.touchTarget,
          }}
        />
        <Pressable
          onPress={disabled || sending ? undefined : onSend}
          disabled={disabled || sending}
          accessibilityLabel={sendLabel}
          accessibilityState={{ disabled: disabled || sending, busy: sending }}
          testID={testID ? `${testID}-send` : undefined}
          style={{
            minHeight: theme.touchTarget,
            paddingHorizontal: theme.space('space_3'),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            role="label"
            emphasis="strong"
            colorToken={disabled || sending ? 'text-disabled' : 'text-brand'}
          >
            {sendLabel}
          </Text>
        </Pressable>
      </View>

      {counter ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: theme.space('space_1'),
            paddingHorizontal: theme.space('space_4'),
            paddingBottom: theme.space('space_2'),
          }}
        >
          {/* 警告双通道：图标 + 数字（⛔ 不只靠颜色） */}
          {state === 'normal' ? null : (
            <Icon
              source={TriangleAlert}
              size="inline"
              tint={state === 'over' ? 'danger' : 'warning'}
            />
          )}
          <Text
            role="caption"
            colorToken={
              state === 'over' ? 'text-danger' : state === 'near' ? 'text-warning' : 'text-muted'
            }
          >
            {counterLabel(value.length, maxLength)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
