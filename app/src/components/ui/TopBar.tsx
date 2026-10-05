/**
 * 顶栏 —— **标题 + 唯一动作（信箱）**
 *
 * 宪法 4.2：⛔ 顶栏不得变成图标收纳区，**只允许一个动作**。
 *   → 本组件**结构上**只接受一个动作（信箱），没有第二个插槽，因此"加第二个图标"需要改本文件，
 *     会被 review 与逐屏清单（13.1）拦下。
 * 宪法 4.7：信箱是**贯穿全局的顶栏动作**，四个一级 Tab 上图标 / 位置 / 命中区 / 角标语义**必须完全一致**
 *   → 唯一实现（不在各屏复制）。
 * 宪法 17.2-1：顶栏背景**铺满到屏幕顶边**，内容从 inset 之下开始（`headerPaddingTop` 由 Screen 传入）。
 */

import * as React from 'react';
import { View } from 'react-native';
import Mail from 'lucide-react-native/icons/mail';

import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { useTheme } from '@/design-system/theme';
import { Text } from './Text';
import { IconButton } from './IconButton';

export type TopBarProps = {
  /** 一级 Tab 显示**格名**；进入二级后标题保持格名（骨架规范 §5） */
  titleKey: MessageKey;
  /** 顶栏内容相对屏幕顶边的偏移（= 真实顶部 inset，由 Screen 计算） */
  headerPaddingTop: number;
  /** 是否显示信箱动作；默认显示（⛔ 不允许"只在某一屏才有信箱入口"） */
  showMailbox?: boolean;
  /** 未读角标数（单一未读真源，客户端不本地递减） */
  unreadCount?: number;
  onMailboxPress?: () => void;
};

export function TopBar({
  titleKey,
  headerPaddingTop,
  showMailbox = true,
  unreadCount = 0,
  onMailboxPress,
}: TopBarProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();

  const mailboxLabel =
    unreadCount > 0 ? t('topbar.mailboxUnread', { n: unreadCount }) : t('topbar.mailbox');

  return (
    <View
      style={{
        paddingTop: headerPaddingTop,
        backgroundColor: theme.color['bg-canvas'].value,
        borderBottomWidth: theme.borderWidth('border_width_hairline'),
        borderBottomColor: theme.color['border-subtle'].value,
      }}
    >
      <View
        style={{
          minHeight: theme.space('space_12'),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: theme.space('space_4'),
        }}
      >
        <Text role="headline" emphasis="strong" colorToken="text-primary">
          {t(titleKey)}
        </Text>
        {showMailbox ? (
          <IconButton
            testID="topbar-mailbox"
            Icon={Mail}
            accessibilityLabel={mailboxLabel}
            badgeCount={unreadCount}
            onPress={onMailboxPress}
          />
        ) : null}
      </View>
    </View>
  );
}
