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
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/design-system/theme';
import { useI18n, type Locale } from '@/i18n';
import { ME_ENTRIES, visibleEntries } from './profile';

const LOCALES: readonly Locale[] = ['zh', 'en'];

export function SettingsScreen(): React.ReactElement {
  const { t, locale, setLocale } = useI18n();
  const theme = useTheme();
  const router = useRouter();

  // 入口来自**同一份**账本（`ME_ENTRIES`）：能进去的才显示，⛔ 不在这里另写一份列表
  const entries = visibleEntries(ME_ENTRIES).filter((entry) => entry.key !== 'posts');

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
    </Screen>
  );
}
