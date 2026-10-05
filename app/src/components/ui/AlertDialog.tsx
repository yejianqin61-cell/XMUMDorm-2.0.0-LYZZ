/**
 * AlertDialog（O03）—— **需要决策**的阻断式对话框（组件定义 §2.5）
 *
 * ⛔ `O04 ConfirmDialog` **已并入本组件的 `danger` 变体**（§2.5 已移除清单：
 *    它是 `variant` 而不是独立组件 —— 9.14-①）。所以页面里写 `ConfirmDialog` 的地方
 *    一律改用 `<AlertDialog variant="danger" …>`。
 *
 * 用在哪：**不可逆 / 高风险**（删除、整表覆盖、退出未保存）。⛔ 不用它报成功（§3.2.5-②）——
 * 成功走 `O01 Toast` + 跳转。
 *
 * `danger` 的**二次输入确认**：把"要删的东西的名字"逐字输入才放行 ——
 * 这是唯一能拦住"连点两下确认"的手段（`isConfirmationSatisfied` 是可测的纯函数）。
 *
 * a11y（§7.3）：标题 + 正文 + 按钮文案全部可读；**主行动为默认焦点**。
 */

import * as React from 'react';
import { Modal, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Button } from './Button';
import { Input } from './Input';
import { Surface } from './Surface';
import { Text } from './Text';

export type AlertDialogVariant = 'default' | 'danger';

/**
 * 二次确认是否满足。
 * - 未要求逐字确认 → 永远满足；
 * - 要求了 → **必须完全一致**（去首尾空格，⛔ 不忽略大小写差异——"删除/刪除"不该混过）。
 */
export function isConfirmationSatisfied(required: string | undefined, typed: string): boolean {
  if (required === undefined || required === '') return true;
  return typed.trim() === required.trim();
}

export type AlertDialogProps = {
  visible: boolean;
  title: string;
  /** 说明"会发生什么、为什么"（≤30 汉字）；⛔ 不写说明性旁白 */
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: AlertDialogVariant;
  /** `danger` 的二次输入确认：要求逐字输入这个词 */
  requireTypedConfirmation?: string;
  /** 二次输入框的标签（要求 `requireTypedConfirmation` 时必填） */
  confirmationLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function AlertDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'default',
  requireTypedConfirmation,
  confirmationLabel,
  style,
  testID,
}: AlertDialogProps): React.ReactElement {
  const theme = useTheme();
  const [typed, setTyped] = React.useState('');

  // 每次重新打开都清空输入（⛔ 不把上一次的输入带进来，那会让"逐字确认"形同虚设）
  React.useEffect(() => {
    if (!visible) setTyped('');
  }, [visible]);

  const satisfied = isConfirmationSatisfied(requireTypedConfirmation, typed);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={[
          {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.space('space_6'),
            backgroundColor: theme.color['bg-canvas'].value,
          },
          style,
        ]}
      >
        <Surface
          testID={testID}
          rounded="radius_large"
          bordered="strong"
          padding="space_4"
          style={{ alignSelf: 'stretch' }}
        >
          <View accessibilityViewIsModal style={{ gap: theme.space('space_3') }}>
            <Text role="headline" emphasis="strong" colorToken="text-primary">
              {title}
            </Text>
            {body ? (
              <Text role="body" colorToken="text-secondary">
                {body}
              </Text>
            ) : null}

            {requireTypedConfirmation !== undefined && requireTypedConfirmation !== '' ? (
              <Input
                label={confirmationLabel ?? requireTypedConfirmation}
                value={typed}
                onChangeText={setTyped}
                testID={testID ? `${testID}-confirm-input` : undefined}
              />
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: theme.space('space_2'),
                marginTop: theme.space('space_1'),
              }}
            >
              <Button label={cancelLabel} variant="ghost" onPress={onCancel} />
              <Button
                label={confirmLabel}
                variant={variant === 'danger' ? 'danger' : 'primary'}
                onPress={satisfied ? onConfirm : undefined}
                disabled={!satisfied}
              />
            </View>
          </View>
        </Surface>
      </View>
    </Modal>
  );
}
