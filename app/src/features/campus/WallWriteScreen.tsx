import * as React from 'react';
import { onlineManager } from '@tanstack/react-query';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextArea } from '@/components/ui/TextArea';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/design-system/theme';
import { classifyAuthFailure, isSessionInvalid } from '@/features/auth/authFailure';
import { useSession } from '@/features/auth/session';
import { readTokenSync, tokenAccountId } from '@/features/auth/tokenStore';
import { canSubmit, TERMS_ROUTE } from '@/features/publish/complianceGate';
import { normalizeTermsAccepted } from '@/features/publish/viewer';
import { useI18n, type MessageKey } from '@/i18n';
import { toErrorCopy } from '@/i18n/errors';
import { getQueryClient } from '@/shared/queryClient';
import { readItem, setItem, removeItem, WALL_DRAFT_PREFIX } from '@/shared/storage';
import { createConfession, getConfession, getConfessionMeta, updateConfession } from '../../../../shared/api/confessions';
import { getMyTermsStatus } from '../../../../shared/api/users';
import posterContract from '../../../../shared/constants/wallPosterContract.json';
import { asWall, errorFor, type Post } from './campusModel';
import { WALL_SNAPSHOT_KEY } from './WallFeed';
import { PosterChoices } from './WallPosterLab';
import { isWallPosterStyle, wallPosterStyle } from './wallPosterLayout';
import type { WallPosterStyle } from './wallPosterTemplates';

type Draft = {
  content: string;
  style?: WallPosterStyle;
  revision?: number;
  publishKey?: string;
};

type Notice = { message: string; actionLabel?: string; onAction?: () => void };

export function WallWriteScreen({ edit }: { edit?: string }): React.ReactElement {
  const session = useSession();
  const owner = session.isSignedIn ? tokenAccountId(readTokenSync()) : null;
  return <WallWriteForm key={JSON.stringify([owner, session.status, edit])} edit={edit} owner={owner} />;
}

function WallWriteForm({ edit, owner }: { edit?: string; owner: string | null }): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const id = edit === undefined ? null : Number(edit);
  const storageKey = `${WALL_DRAFT_PREFIX}${owner}:${id ?? 'new'}`;
  const [draft, setDraft] = React.useState<Draft>();
  const [original, setOriginal] = React.useState<Post>();
  const [notice, setNotice] = React.useState<Notice>();
  const [attempt, setAttempt] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const locked = React.useRef(false);
  const active = React.useRef(false);
  const writes = React.useRef<Promise<void>>(Promise.resolve());

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/?tab=wall');
  };

  const describe = (key: MessageKey) => ({ message: t(key) });
  const failureText = (failure: unknown) => {
    const copy = toErrorCopy(onlineManager.isOnline() ? errorFor(failure) : { kind: 'offline' }, t);
    return [copy.perceive, copy.understand, copy.fix].join(' ');
  };

  const { handleAuthFailure } = session;
  const authFailure = React.useCallback(async (error: unknown) => {
    const code = (error as { body?: { code?: string } })?.body?.code;
    if (code !== 'CONFESSION_NOT_AUTHOR' && code !== 'TERMS_NOT_ACCEPTED' && isSessionInvalid(classifyAuthFailure(error))) await handleAuthFailure(error);
  }, [handleAuthFailure]);
  const readFailure = React.useEffectEvent((failure: unknown) => {
    setNotice({ message: failureText(failure), actionLabel: t('action.retry'), onAction: () => setAttempt((n) => n + 1) });
  });

  React.useEffect(() => {
    let current = true;
    active.current = true;
    if (!session.isSignedIn) return;
    void (async () => {
      try {
        if (owner === null) throw { kind: 'permission' };
        if (id !== null && (!Number.isSafeInteger(id) || id <= 0)) throw { kind: 'content' };
        const [saved, data] = await Promise.all([
          readItem<Draft>(storageKey),
          id === null ? undefined : getConfession(id).then(asWall),
        ]);
        if (!current) return;
        if (data && !data.is_mine) throw { kind: 'permission' };
        setOriginal(data);
        setDraft(saved && typeof saved.content === 'string' ? {
          ...saved, style: isWallPosterStyle(saved.style) ? saved.style : undefined,
        } : {
          content: data?.content ?? '',
          style: data ? wallPosterStyle(data.id, data.poster_style) : undefined,
          revision: data?.revision,
        });
        setNotice(undefined);
      } catch (failure) {
        if (!current) return;
        readFailure(failure);
        await authFailure(failure);
      }
    })();
    return () => { current = false; active.current = false; };
  }, [attempt, authFailure, id, owner, session.isSignedIn, storageKey]);

  const persist = (next: Draft) => {
    const operation = writes.current.catch(() => {}).then(() => setItem(storageKey, next));
    writes.current = operation;
    return operation;
  };

  const change = (next: Draft) => {
    setDraft(next);
    setNotice(undefined);
    void persist(next).catch(() => {
      if (active.current) setNotice(describe('wall.write.draftFailed'));
    });
  };

  const submit = async (style: WallPosterStyle) => {
    if (!draft || !session.isSignedIn || locked.current ||
        !draft.content.trim() || draft.content.length > posterContract.maxLength) return;
    locked.current = true;
    setBusy(true);
    setNotice(undefined);
    let submitted = draft;
    try {
      const acceptedTerms = normalizeTermsAccepted(await getMyTermsStatus({ timeoutMs: 15000 }));
      if (!active.current) return;
      const gate = canSubmit({ signedIn: true, acceptedTerms: acceptedTerms === true });
      if (!gate.allowed) {
        setNotice({
          message: [t(gate.perceiveKey), t(gate.understandKey)].join(' '),
          actionLabel: t('publish.gate.terms.button'),
          onAction: () => router.push(TERMS_ROUTE),
        });
        return;
      }

      if (id !== null && draft.revision !== original?.revision) {
        setNotice(describe('wall.write.conflict'));
        return;
      }
      if (id === null) {
        const wall = await getConfessionMeta();
        if (!active.current) return;
        if (wall?.poster_style_version !== posterContract.version) {
          setNotice(describe('wall.write.serviceUnavailable'));
          return;
        }
      }
      submitted = {
        ...draft, style,
        ...(id === null ? {
          publishKey: draft.publishKey ?? [Date.now(), Math.random(), Math.random()].join('-').replaceAll('.', ''),
        } : {}),
      };
      await persist(submitted);
      if (!active.current) return;
      setDraft(submitted);
      const body = { content: submitted.content, poster_style: style };
      if (id === null) {
        const published = asWall(await createConfession({ ...body, publish_key: submitted.publishKey! }));
        if (!published.is_mine || !published.poster_style) throw { kind: 'unknown' };
      } else {
        const updated = await updateConfession(id, { ...body, revision: submitted.revision });
        if (updated?.id !== id || updated?.revision !== (submitted.revision ?? -1) + 1) throw { kind: 'unknown' };
      }

      getQueryClient().removeQueries({ queryKey: WALL_SNAPSHOT_KEY, exact: true });
      const cleared = await (async () => {
        if (JSON.stringify(await readItem<Draft>(storageKey)) === JSON.stringify(submitted)) {
          await removeItem(storageKey);
        }
      })().then(() => true, () => false);
      if (!active.current) return;
      toast.show({ message: t(id === null ? 'wall.write.published' : 'wall.write.saved'), tone: 'success' });
      if (!cleared) toast.show({ message: t('wall.write.clearFailed'), tone: 'danger' });
      if (id === null) router.replace('/?tab=wall');
      else if (router.canGoBack()) router.back();
      else router.replace(`/campus/wall/${id}`);
    } catch (failure) {
      if (!active.current) return;
      const status = (failure as { status?: number })?.status;
      const code = (failure as { body?: { code?: string } })?.body?.code;
      if (id === null && submitted.publishKey && (status === 400 || status === 410)) {
        change({ ...submitted, publishKey: undefined });
      }
      if (code === 'TERMS_NOT_ACCEPTED') {
        setNotice({
          message: t('publish.gate.terms.understand'),
          actionLabel: t('publish.gate.terms.button'),
          onAction: () => router.push(TERMS_ROUTE),
        });
      } else if (id !== null && status === 409) {
        setNotice({
          message: t('wall.write.conflict'),
          actionLabel: t('wall.write.reviewLatest'),
          onAction: () => setAttempt((n) => n + 1),
        });
      } else {
        const message = status === 400 ? t('wall.write.rejected')
          : status === 404 || status === 410 ? t('wall.write.gone')
          : code === 'CONFESSION_NOT_AUTHOR' ? t('wall.write.forbidden')
          : failureText(failure);
        setNotice({ message });
      }
      await authFailure(failure);
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  };

  const hasConflict = Boolean(draft && original && draft.revision !== original.revision);
  const tooLong = (draft?.content.length ?? 0) > posterContract.maxLength;
  const title = t(id === null ? 'wall.write.create' : 'wall.write.edit');

  return (
    <Screen scroll testID="wall-write-screen" header={
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space('space_2') }}>
        <IconButton Icon={ArrowLeft} accessibilityLabel={t('action.back')} onPress={back} />
        <Text role="headline" emphasis="strong">{title}</Text>
      </View>
    }>
      <View style={{ paddingVertical: theme.space('space_3'), gap: theme.space('space_3') }}>
        <View style={{ paddingHorizontal: theme.space('space_4'), gap: theme.space('space_2') }}>
          {notice ? <InlineNotice tone="warning" {...notice} /> : null}
          {!draft && !notice ? <LoadingState variant="spinner" /> : null}
          {draft ? (
            <>
              <TextArea testID="wall-write-content" label={t('wall.write.input')} placeholder={t('wall.write.placeholder')} value={draft.content}
                disabled={busy || Boolean(draft.publishKey)}
                onChangeText={(content) => change({ ...draft, content })} />
              <Text role="caption">{t(tooLong ? 'wall.write.tooLong' : 'wall.write.length', {
                count: draft.content.length, limit: posterContract.maxLength,
              })}</Text>
              {!draft.content.trim() ? (
                <>
                  <View testID="wall-write-empty-preview" style={{
                    padding: theme.space('space_4'), gap: theme.space('space_2'),
                    minHeight: theme.touchTarget * 2, justifyContent: 'center',
                    borderRadius: theme.radius('radius_large'),
                    backgroundColor: theme.color['bg-sunken'].value,
                  }}>
                    <Text role="label">{t('wall.write.preview')}</Text>
                    <Text role="caption" colorToken="text-secondary">{t('wall.write.emptyHint')}</Text>
                  </View>
                  <Button testID="wall-write-submit" disabled fullWidth
                    label={t(id === null ? 'publish.submit' : 'wall.write.save')} />
                </>
              ) : null}
              {draft.publishKey && !busy ? <InlineNotice tone="warning" message={t('wall.write.retryPending')} /> : null}
              {hasConflict && original ? (
                <>
                  <Text role="caption">{t('wall.write.latest')}</Text>
                  <Text>{original.content}</Text>
                  <Button variant="secondary" label={t('wall.write.keepDraft')} disabled={busy}
                    onPress={() => change({ ...draft, revision: original.revision })} />
                </>
              ) : null}
            </>
          ) : null}
        </View>
        {draft?.content.trim() ? (
          <PosterChoices identity={id === null ? 'new-post' : String(id)} content={draft.content} production={{
            selection: draft.style, originalContent: original?.content,
            onSelection: (style) => change({ ...draft, style }),
            locked: busy || Boolean(draft.publishKey),
            action: (style, measuring) => (
              <Button testID="wall-write-submit" label={t(busy ? 'wall.write.submitting'
                : draft.publishKey ? 'wall.write.retry' : id === null ? 'publish.submit' : 'wall.write.save')}
                disabled={tooLong || hasConflict || busy || (measuring && !draft.publishKey)}
                onPress={() => { void submit(style); }} />
            ),
          }} />
        ) : null}
      </View>
    </Screen>
  );
}
