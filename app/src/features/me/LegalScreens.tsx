/**
 * 关于与法律（`M-18`，法律文本入口）与两份法务文档（`M-19`/`M-20`）—— P2C-05
 *
 * 三页共用**同一个** `StaticPage`（`P16` 骨架）：
 *   · `M-18` 是入口列表（`ListItem` + `SectionHeader`，页面清单的关键组件就是这两个）；
 *   · `M-19`/`M-20` 的正文**内置**，`fetchRemote` 返回内置文本 → `StaticPage` 视为权威来源，
 *     ⛔ 不挂"这不是最新的"（那段提示是给回落内容用的，见 `legal.ts` 文件头）。
 *
 * ⛔ 不用 WebView 渲染法务长文（宪法 4.1.2：那是省事做法，且离线不可读）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { StaticPage, useStaticDoc } from '@/proto/P16';
import { LEGAL_DOCS, legalDocText, type LegalDocId } from './legal';

/** `M-18`：关于与法律（入口聚合） */
export function LegalHubScreen(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();

  return (
    <Screen testID="screen-legal-hub" titleKey="me.entry.about" bottomMode="none">
      <View style={{ padding: theme.space('space_4'), gap: theme.space('space_2') }}>
        <SectionHeader title={t('me.legal.docs')} />
        {LEGAL_DOCS.map((doc) => (
          <ListItem
            key={doc.id}
            testID={`legal-entry-${doc.id}`}
            title={t(doc.titleKey)}
            variant="nav"
            onPress={() => router.push(doc.route as never)}
          />
        ))}
      </View>
    </Screen>
  );
}

export type LegalDocScreenProps = { docId: LegalDocId };

/** `M-19`/`M-20`：正文页（同一个组件，靠 `docId` 区分） */
export function LegalDocScreen({ docId }: LegalDocScreenProps): React.ReactElement {
  const { t, locale } = useI18n();
  const doc = LEGAL_DOCS.find((item) => item.id === docId);

  const state = useStaticDoc({
    docId: `legal:${docId}`,
    bundled: null,
    // 内置正文 = 权威来源（本地即时可得、永不失败）→ 不会出现"不是最新"的提示
    fetchRemote: async () => legalDocText(docId, locale),
    enableCache: false,
  });

  return (
    <StaticPage
      testID={`screen-legal-${docId}`}
      title={doc ? t(doc.titleKey) : ''}
      state={state}
      labels={{
        staleCache: t('me.legal.stale'),
        staleBundled: t('me.legal.stale'),
        retry: t('action.retry'),
        emptyTitle: t('me.legal.empty'),
        emptyAction: t('action.retry'),
      }}
      onRetry={state.reload}
    />
  );
}
