/**
 * TranslateToggle —— 帖子 / 评论 / 点评的 AI 翻译（推特式）
 *
 * 规则与 Web 同一份（`shared/utils/translation.js`）：
 *   内容语言 ≠ 界面语言才出现「翻译」；点了才请求（控制成本）；译文在原文下方，可收起。
 * 未登录（页面传 isSignedIn）、服务端没配置翻译服务时整个组件不渲染。
 * 后端只按 kind + id 取原文（`POST /api/translate`），这里不上传任何文本。
 */

import * as React from 'react';
import { View } from 'react-native';

import { LoadingState } from '@/components/ui/LoadingState';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { getTranslateConfig, translateContent } from '../../../../shared/api/translate';
import { needsTranslation, translationTarget } from '../../../../shared/utils/translation';

export type TranslateKind = 'post' | 'comment' | 'review';

/** 配置每个进程只问一次；失败了清掉，下次再问。 */
let configPromise: Promise<boolean> | null = null;
function loadEnabled(): Promise<boolean> {
  if (configPromise === null) {
    configPromise = Promise.resolve(getTranslateConfig())
      .then((data: { enabled?: boolean } | null) => Boolean(data?.enabled))
      .catch(() => {
        configPromise = null;
        return false;
      });
  }
  return configPromise;
}

/** 测试用：重置模块级配置缓存 */
export function resetTranslateConfigForTests(): void {
  configPromise = null;
}

type Phase = 'idle' | 'pending' | 'done' | 'failed';
type TranslationState = { target: string; open: boolean; phase: Phase; translated: string };
const initialState = (target: string): TranslationState => ({ target, open: false, phase: 'idle', translated: '' });

export function TranslateToggle({
  kind,
  id,
  text,
  isSignedIn,
  testID = 'translate-toggle',
}: {
  kind: TranslateKind;
  id: number;
  text: string;
  /** 登录态由页面给：本组件不读 session，渲染它的地方不必有 SessionProvider */
  isSignedIn: boolean;
  testID?: string;
}): React.ReactElement | null {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const [enabled, setEnabled] = React.useState(false);
  const target = translationTarget(locale);
  // 状态和目标语言绑在一起：界面语言一变，旧译文自然作废（不用 effect 重置）
  const [state, setState] = React.useState<TranslationState>(() => initialState(target));
  const current = state.target === target ? state : initialState(target);
  const { open, phase, translated } = current;
  const relevant = isSignedIn && id > 0 && needsTranslation(text, locale);

  React.useEffect(() => {
    if (!relevant) return undefined;
    let alive = true;
    void loadEnabled().then((value) => {
      if (alive) setEnabled(value);
    });
    return () => {
      alive = false;
    };
  }, [relevant]);

  if (!relevant || !enabled) return null;

  /** 只更新请求发出时那个语言的状态；回来时语言已经变了就丢掉 */
  const settle = (requested: string, phaseNext: Phase, value = ''): void => {
    setState((prev) => (prev.target === requested ? { ...prev, phase: phaseNext, translated: value } : prev));
  };

  const request = (): void => {
    Promise.resolve(translateContent({ kind, id, target }))
      .then((data: { text?: string } | null) => {
        if (typeof data?.text === 'string' && data.text.trim()) settle(target, 'done', data.text);
        else settle(target, 'failed');
      })
      .catch(() => settle(target, 'failed'));
  };

  const onPress = (): void => {
    const next = !open;
    const needsRequest = next && (phase === 'idle' || phase === 'failed');
    setState({ ...current, open: next, phase: needsRequest ? 'pending' : phase });
    if (needsRequest) request();
  };

  const label = t(open ? 'translate.hide' : 'translate.action');

  return (
    <View testID={testID} style={{ gap: theme.space('space_1') }}>
      <Pressable
        testID={`${testID}-button`}
        accessibilityLabel={label}
        onPress={onPress}
        style={{ minHeight: theme.touchTarget, justifyContent: 'center', alignSelf: 'flex-start' }}
      >
        <Text role="caption" colorToken="text-brand">
          {label}
        </Text>
      </Pressable>
      {open && phase === 'pending' ? <LoadingState testID={`${testID}-pending`} variant="spinner" /> : null}
      {open && phase === 'failed' ? (
        <Text role="caption" colorToken="text-muted" testID={`${testID}-failed`}>
          {t('translate.failed')}
        </Text>
      ) : null}
      {open && phase === 'done' ? (
        <View testID={`${testID}-result`} style={{ gap: theme.space('space_1') }}>
          <Text role="caption" colorToken="text-muted">
            {t('translate.byAi')}
          </Text>
          <Text role="body" colorToken="text-secondary">
            {translated}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
