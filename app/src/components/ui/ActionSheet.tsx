/**
 * ActionSheet（O05）—— 多个**平级动作**选一（组件定义 §2.5）
 *
 * 与相邻组件的分工（§2.5 通知阶梯）：
 *   - `O03 AlertDialog` 是**决策**（不可逆/高风险，默认焦点在确认上）；
 *   - `O05 ActionSheet` 是**一组平级选项**（"分享 / 复制链接 / 举报"），没有"取消/确认"语义，
 *     所以⛔ 不给"主行动"，也⛔ 不把危险项藏在中间 —— 危险项单独置底并标危险色（**同时带文字**）。
 *   - `O14 ReportSheet`（举报）是**域专用**的，不是本组件的变体。
 *
 * a11y（§7.3）：Sheet 打开时**焦点移入**、关闭时**归还触发元素**；本组件用
 * `accessibilityViewIsModal` 把焦点限制在表内；取消项有独立可读文案。
 */

import * as React from 'react';
import { Modal, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Pressable } from './Pressable';
import { Surface } from './Surface';
import { Text } from './Text';

export type ActionSheetAction = {
  key: string;
  label: string;
  /** 危险动作（删除/举报/退出）：文字用危险色，**且文案本身要写清后果** */
  danger?: boolean;
  disabled?: boolean;
};

export type ActionSheetProps = {
  visible: boolean;
  /** 标题（可选，≤12 汉字）：说明"这些动作作用于什么" */
  title?: string;
  actions: readonly ActionSheetAction[];
  onSelect: (key: string) => void;
  onCancel: () => void;
  cancelLabel: string;
  /** 底部安全区（由调用方的 `Screen` 提供；⛔ 本文件不读 insets，见 17.1-S2/S7） */
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ActionSheet({
  visible,
  title,
  actions,
  onSelect,
  onCancel,
  cancelLabel,
  bottomInset = 0,
  style,
  testID,
}: ActionSheetProps): React.ReactElement {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View
        style={[
          {
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: theme.color['bg-canvas'].value,
          },
          style,
        ]}
      >
        <View accessibilityViewIsModal style={{ paddingBottom: bottomInset }}>
          <Surface testID={testID} rounded="radius_large" padding="space_2">
            {title ? (
              <View style={{ paddingHorizontal: theme.space('space_3'), paddingVertical: theme.space('space_2') }}>
                <Text role="label" colorToken="text-muted" numberOfLines={1}>
                  {title}
                </Text>
              </View>
            ) : null}

            {actions.map((action) => (
              <Pressable
                key={action.key}
                testID={testID ? `${testID}-${action.key}` : undefined}
                onPress={
                  action.disabled
                    ? undefined
                    : () => {
                        onSelect(action.key);
                      }
                }
                disabled={action.disabled}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityState={{ disabled: action.disabled === true }}
                style={{
                  minHeight: theme.touchTarget,
                  paddingHorizontal: theme.space('space_3'),
                  justifyContent: 'center',
                }}
              >
                <Text
                  role="body"
                  colorToken={
                    action.disabled
                      ? 'text-disabled'
                      : action.danger
                        ? 'text-danger'
                        : 'text-primary'
                  }
                  numberOfLines={1}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}

            {/* 取消独立成块：它是"退出这个 Sheet"，不是一个平级动作 */}
            <Pressable
              testID={testID ? `${testID}-cancel` : undefined}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              style={{
                minHeight: theme.touchTarget,
                paddingHorizontal: theme.space('space_3'),
                justifyContent: 'center',
                marginTop: theme.space('space_2'),
              }}
            >
              <Text role="body" emphasis="strong" colorToken="text-primary">
                {cancelLabel}
              </Text>
            </Pressable>
          </Surface>
        </View>
      </View>
    </Modal>
  );
}
