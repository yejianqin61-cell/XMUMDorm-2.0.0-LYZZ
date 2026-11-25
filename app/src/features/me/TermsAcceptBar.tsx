/**
 * 服务条款页底部的「同意并继续」。
 *
 * App 原来只有条款正文、**没有任何接受入口**：没在 Web 端接受过的账号会永远卡在发布门控上。
 * 只在「已登录且后端明确返回未接受」时出现；读不到状态就不画（⛔ 不猜）。
 * 同意必须由用户自己点，⛔ 不自动提交。
 */
import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { useSession } from '@/features/auth/session';
import { notifyTermsAccepted } from '@/features/publish/termsAcceptedSignal';
import { acceptCurrentTerms, getMyTermsStatus } from '../../../../shared/api/users';

/** 返回底栏节点；不需要时返回 `null`（调用方据此决定要不要给页面 footer） */
export function useTermsAcceptBar(enabled: boolean): React.ReactElement | null {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { isSignedIn } = useSession();
  const [version, setVersion] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setVersion(null);
    if (!enabled || !isSignedIn) return;
    let active = true;
    void (async () => {
      try {
        const status = (await getMyTermsStatus()) as { accepted?: unknown; version?: unknown } | null;
        if (active && status?.accepted === false && typeof status.version === 'string') setVersion(status.version);
      } catch {
        /* 读不到就不画 */
      }
    })();
    return () => {
      active = false;
    };
  }, [enabled, isSignedIn]);

  if (version === null) return null;

  const accept = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const result = (await acceptCurrentTerms(version)) as { accepted?: unknown } | null;
      if (result?.accepted !== true) throw new Error('not accepted');
      notifyTermsAccepted();
      toast.show({ message: t('me.legal.accepted'), tone: 'success' });
      setVersion(null);
      if (router.canGoBack()) router.back();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ padding: theme.space('space_4'), gap: theme.space('space_2') }}>
      {failed ? <InlineNotice testID="terms-accept-failed" tone="warning" message={t('me.legal.acceptFailed')} /> : null}
      <Button testID="terms-accept" label={t('me.legal.accept')} variant="primary" fullWidth loading={busy} onPress={() => void accept()} />
    </View>
  );
}
