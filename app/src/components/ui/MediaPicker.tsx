/**
 * MediaPicker（`C20`）—— 媒体输入（组件定义 §2.3 / §3.3.4）
 *
 * ## 两条纪律
 *   1. **上限由页面注入**（`maxBytes` / `allowGif` / `single|multi`）—— ⛔ 不把限额写进控件：
 *      帖子 ≤3 / 二手 ≤4 且**不收 gif** / 头像 ≤8MB 且**收 gif**，同一控件在不同业务下限额不同。
 *   2. **选图这件事是可注入的**（`onPick`）——
 *      ⚠️ 真机选图要 `expo-image-picker`，而它**不在依赖准入清单里**（宪法 3.4）。
 *      所以本组件只做"显示 + 校验 + 回调"，把"怎么拿到图"留给调用方注入；
 *      依赖准入通过后，只需在调用方把 `onPick` 换成真实现，⛔ 本组件不改。
 *
 * ## 校验（纯函数，可测）
 * `validatePickedImage` 是**服务端规则的镜像**（镜像不是权威）：
 *   · `allowGif === false` 时拒 `image/gif`（二手商品的硬规则）；
 *   · 超过 `maxBytes` 拒（头像 8MB / 帖子 8MB）。
 */

import * as React from 'react';
import { View } from 'react-native';
import ImagePlus from 'lucide-react-native/icons/image-plus';

import { useTheme } from '@/design-system/theme';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Text } from './Text';
import X from 'lucide-react-native/icons/x';

/** 一张"选好的图"（尚未上传） */
export type PickedImage = {
  uri: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

export type PickResult = { ok: true; image: PickedImage } | { ok: false; reason: 'cancelled' | 'failed' };

export type MediaPickerProps = {
  /** 当前已选（受控）；`null` = 没选 */
  value: PickedImage | null;
  onChange: (next: PickedImage | null) => void;
  /** 选择动作（可注入；缺省时按钮不可用并说明原因） */
  onPick?: () => Promise<PickResult>;
  /** 上限（页面注入） */
  maxBytes?: number;
  /** 是否接受 gif（页面注入；二手为 false） */
  allowGif?: boolean;
  /** 按钮文案（页面给词条） */
  pickLabel: string;
  /** 替换文案（已有图时） */
  replaceLabel?: string;
  /** 移除按钮的无障碍标签 */
  removeLabel?: string;
  /** 不可用时的说明（例如"依赖未准入"） */
  unavailableLabel?: string;
  /** 校验失败文案（三条，页面给词条） */
  tooLargeLabel?: string;
  gifNotAllowedLabel?: string;
  disabled?: boolean;
  testID?: string;
};

/** 头像的默认上限（`middleware/upload.js:17-25` 的 8MB） */
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export type ImageRuleInput = {
  mimeType?: string | null;
  sizeBytes?: number | null;
  allowGif: boolean;
  maxBytes: number;
};

/**
 * 选中的图能不能用（纯函数）。
 * ⛔ 这里**不猜**：`mimeType` 缺失时放行（让服务端拒），但大小超限一律拦（省一次往返）。
 */
export function validatePickedImage(
  input: ImageRuleInput
): { ok: true } | { ok: false; reason: 'tooLarge' | 'gifNotAllowed' } {
  const { mimeType, sizeBytes, allowGif, maxBytes } = input;
  if (!allowGif && typeof mimeType === 'string' && mimeType.toLowerCase() === 'image/gif') {
    return { ok: false, reason: 'gifNotAllowed' };
  }
  if (typeof sizeBytes === 'number' && Number.isFinite(sizeBytes) && sizeBytes > maxBytes) {
    return { ok: false, reason: 'tooLarge' };
  }
  return { ok: true };
}

export function MediaPicker({
  value,
  onChange,
  onPick,
  maxBytes = IMAGE_MAX_BYTES,
  allowGif = true,
  pickLabel,
  replaceLabel,
  removeLabel,
  unavailableLabel,
  tooLargeLabel,
  gifNotAllowedLabel,
  disabled = false,
  testID,
}: MediaPickerProps): React.ReactElement {
  const theme = useTheme();
  const [message, setMessage] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const pick = React.useCallback(async () => {
    if (!onPick || disabled) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await onPick();
      if (!result.ok) return; // 取消 / 失败：⛔ 不打扰用户
      const verdict = validatePickedImage({
        mimeType: result.image.mimeType,
        sizeBytes: result.image.sizeBytes,
        allowGif,
        maxBytes,
      });
      if (!verdict.ok) {
        setMessage(verdict.reason === 'tooLarge' ? tooLargeLabel ?? null : gifNotAllowedLabel ?? null);
        return;
      }
      onChange(result.image);
    } finally {
      setBusy(false);
    }
  }, [allowGif, disabled, gifNotAllowedLabel, maxBytes, onChange, onPick, tooLargeLabel]);

  const hasImage = value !== null;

  return (
    <View testID={testID} style={{ gap: theme.space('space_2') }}>
      <Text role="label" colorToken="text-secondary" testID={testID ? `${testID}-label` : undefined}>
        {hasImage ? value.uri : (unavailableLabel ?? pickLabel)}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}>
        <Button
          testID={testID ? `${testID}-pick` : undefined}
          label={hasImage ? (replaceLabel ?? pickLabel) : pickLabel}
          variant="secondary"
          size="small"
          loading={busy}
          disabled={disabled || !onPick}
          onPress={() => void pick()}
        />
        {hasImage ? (
          <IconButton
            testID={testID ? `${testID}-remove` : undefined}
            Icon={X}
            accessibilityLabel={removeLabel ?? pickLabel}
            disabled={disabled}
            onPress={() => onChange(null)}
          />
        ) : (
          <ImagePlus size={theme.space('space_6')} color={theme.color['icon-secondary'].value} />
        )}
      </View>

      {message ? (
        <Text role="caption" colorToken="state-danger" testID={testID ? `${testID}-error` : undefined}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
