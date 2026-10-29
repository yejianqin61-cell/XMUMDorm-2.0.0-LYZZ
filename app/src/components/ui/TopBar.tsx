/**
 * 顶栏 —— **标题**
 *
 * 宪法 4.2：⛔ 顶栏不得变成图标收纳区。消息迁移到一级格后，顶栏默认无入口。
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
  /** 是否显示旧信箱动作；仅保留给尚未迁移的显式调用。 */
  showMailbox?: boolean;
  /** 未读角标数（单一未读真源，客户端不本地递减） */
  unreadCount?: number;
  onMailboxPress?: () => void;
  /** 页面已登记的少量顶栏动作；不用于承载二级导航。 */
  rightActions?: React.ReactNode;
};

export function TopBar({
  titleKey,
  headerPaddingTop,
  showMailbox = false,
  unreadCount = 0,
  onMailboxPress,
  rightActions,
}: TopBarProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();

  const mailboxLabel =
    unreadCount > 0 ? t('topbar.mailboxUnread', { n: unreadCount }) : t('topbar.mailbox');

  return (
    <View
      style={{
        paddingTop: headerPaddingTop,
        backgroundColor: theme.color['bg-canvas']['value'],
        borderBottomWidth: theme.borderWidth('border_width_hairline'),
        borderBottomColor: theme.color['border-subtle']['value'],
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {rightActions}
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
    </View>
  );
}
