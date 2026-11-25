/**
 * 设置（`M-13`）—— 页面级组合（P2C-05）
 *
 * `M-13` **没有自己的端点**（页面清单：「语言为本地状态；其余为入口聚合」）→ 本页只做两件事：
 *   1. **语言切换**（本地状态，⛔ 不请求后端；切完当前页立即跟着变）；
 *   2. **入口聚合**：指向已经能进去的页面。
 *
 * ⛔ **未上线的入口不显示**（通知与推送 / 屏蔽用户 / 账号注销的三个页面都还没有，
 * 显示成"禁用占位"等于把用户送到一个不存在的页面）。这条与 `ME_ENTRIES` 的账本同一判据。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { ListItem } from '@/components/ui/ListItem';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/design-system/theme';
import { useI18n, type Locale } from '@/i18n';
import { NotificationSettingsSection } from '@/features/notifications/NotificationSettingsSection';
import { useSession } from '@/features/auth/session';
import { deactivateMyAccount } from '../../../../shared/api/users';
import { ME_ENTRIES, visibleEntries } from './profile';

const LOCALES: readonly Locale[] = ['zh', 'en'];

export function isDeactivationAcknowledged(value: unknown): boolean {
  return !!value && typeof value === 'object' && (value as { status?: unknown }).status === 0;
}

export function SettingsScreen(): React.ReactElement {
  const { t, locale, setLocale } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const session = useSession();
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [deactivationFailed, setDeactivationFailed] = React.useState(false);

  /**
   * 入口来自**同一份**账本（`ME_ENTRIES`）：能进去的才显示，⛔ 不在这里另写一份列表。
   * 2026-10-18 起这份表里只剩「关于与法律」（设置与我的帖子两个入口都已删除：
   * 前者由顶栏齿轮承担，后者提升为主页 Tab）—— 所以这里不再需要过滤。
   */
  const entries = visibleEntries(ME_ENTRIES);
  const deactivate = async (): Promise<void> => {
    setDeactivateOpen(false);
    setDeactivationFailed(false);
    try {
      if (!isDeactivationAcknowledged(await deactivateMyAccount())) throw new Error('deactivation was not acknowledged');
      await session.logout();
    } catch {
      setDeactivationFailed(true);
    }
  };

  return (
    <Screen testID="screen-me-settings" titleKey="me.settings.title" bottomMode="none">
      <View style={{ padding: theme.space('space_4'), gap: theme.space('space_3') }}>
        <SectionHeader title={t('me.settings.language')} />
        <SegmentedControl
          testID="settings-locale"
          options={LOCALES.map((value) => ({
            value,
            label: t(value === 'zh' ? 'me.settings.language.zh' : 'me.settings.language.en'),
          }))}
          value={locale}
          onChange={(next) => setLocale(next as Locale)}
        />

        <NotificationSettingsSection />

        {session.isSignedIn ? <>
        <SectionHeader title={t('me.settings.account')} />
        <ListItem testID="settings-logout" title={t('auth.logout')} variant="action" onPress={() => void session.logout()} />
        <ListItem testID="settings-deactivate" title={t('me.settings.deactivate')} variant="danger" onPress={() => setDeactivateOpen(true)} />
        </> : null}
        {deactivationFailed ? <InlineNotice testID="settings-deactivate-failed" tone="warning" message={t('me.settings.deactivate.failed')} /> : null}

        {entries.length > 0 ? (
          <>
            <SectionHeader title={t('me.settings.more')} />
            {entries.map((entry) => (
              <ListItem
                key={entry.key}
                testID={`settings-entry-${entry.key}`}
                title={t(entry.labelKey)}
                variant="nav"
                onPress={() => router.push(entry.route as never)}
              />
            ))}
          </>
        ) : null}
      </View>
      <AlertDialog
        testID="settings-deactivate-dialog"
        visible={deactivateOpen}
        variant="danger"
        title={t('me.settings.deactivate.title')}
        body={t('me.settings.deactivate.body')}
        confirmLabel={t('me.settings.deactivate.confirm')}
        cancelLabel={t('action.cancel')}
        onConfirm={() => void deactivate()}
        onCancel={() => setDeactivateOpen(false)}
      />
    </Screen>
  );
}
