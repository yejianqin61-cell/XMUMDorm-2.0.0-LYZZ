/**
 * CampusScreens —— 校园内容（树洞 / 万能墙）的**页面组合层**
 *
 * 本文件只做三件事：
 * 1. 把广场首页的模块入口接到 `TreeholeFeed` / `WallFeed`（**壳只有一份**）；
 * 2. 详情页：**原生 Header**（宪法 4.3）+ 单列平铺正文 + 评论串 + **粘性底栏评论输入**；
 * 3. 举报走 Header 右上 `⋯`（唯一入口，负责人 2026-10-18 裁决）。
 *
 * ⛔ 不在这里拼 HeroUI 原语、不自己画返回按钮、不自己算 insets。
 */

import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

import { ActionSheet } from '@/components/ui/ActionSheet';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { CommentComposer } from '@/components/ui/CommentComposer';
import { CommentThread } from '@/components/ui/CommentThread';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { LoadingState } from '@/components/ui/LoadingState';
import { ReportSheet } from '@/components/ui/ReportSheet';
import { Screen, useScreenInsets } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { useSession } from '@/features/auth/session';
import type { AppError } from '@/i18n/errors';
import { getPostDetail } from '../../../../shared/api/posts';
import { deleteConfession, getConfession } from '../../../../shared/api/confessions';
import { getQueryClient } from '@/shared/queryClient';
import { QK } from '../../../../shared/query/queryKeys';
import { formatPostTime } from '../../../../shared/utils/formatTime';
import { asPost, asWall, errorFor, type Post } from './campusModel';
import { TreeholeFeed } from './TreeholeFeed';
import { WallFeed, type WallFeedSnapshot } from './WallFeed';
import { TreeholePostDetail } from './TreeholePostDetail';
import { toTreeholePostViewModel } from './treeholePostViewModel';
import { WallTemplateContent } from './wallTemplates';
import { useCampusActions } from './useCampusActions';
import type { CampusReportReason } from './useCampusReport';

export type CampusKind = 'confession' | 'wall';

/** 广场首页的模块入口：树洞 / 万能墙互斥（宪法 4.1.1） */
export function CampusFeed({ kind }: { kind: CampusKind }): React.ReactElement {
  return kind === 'confession' ? <TreeholeFeed /> : <WallFeed />;
}

/**
 * 发布成功后返回的落点（纯函数，可测）：`published` 时**必须 replace 到广场**，
 * 否则返回会回到"发布表单/发布中心"，用户会以为自己又要发一遍。
 */
export function detailBackTarget(published: boolean): '/' | null {
  return published ? '/' : null;
}

const REPORT_REASONS = [
  'spam',
  'fraud',
  'abuse',
  'nsfw',
  'trolling',
  'privacy',
  'illegal_trade',
  'other',
] as const;

const REPORT_REASON_KEYS = {
  spam: 'screen.campus.report.spam',
  fraud: 'screen.campus.report.fraud',
  abuse: 'screen.campus.report.abuse',
  nsfw: 'screen.campus.report.nsfw',
  trolling: 'screen.campus.report.trolling',
  privacy: 'screen.campus.report.privacy',
  illegal_trade: 'screen.campus.report.illegal_trade',
  other: 'screen.campus.report.other',
} as const;

export type CampusDetailScreenProps = {
  postId: string;
  kind?: CampusKind;
  /** 发布成功后进入详情：返回一律回广场（不得回到发布表单） */
  published?: boolean;
};

export function CampusDetailScreen({
  postId,
  kind = 'confession',
  published = false,
}: CampusDetailScreenProps): React.ReactElement {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { handleAuthFailure, status: sessionStatus, identifier, isSignedIn } = useSession();
  const identity = JSON.stringify(kind === 'wall' ? [sessionStatus, identifier, isSignedIn] : []);
  const identityRef = React.useRef(identity);
  identityRef.current = identity;
  const theme = useTheme();
  const toast = useToast();
  const [post, setPost] = React.useState<Post | null>(null);
  const [postIdentity, setPostIdentity] = React.useState<string | null>(null);
  const [error, setError] = React.useState<AppError | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState<string | null>(null);
  const [reportDetail, setReportDetail] = React.useState('');
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<'login' | 'denied' | 'retry' | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const deleteLocked = React.useRef(false);
  const [deleteCommentId, setDeleteCommentId] = React.useState<string | null>(null);
  const scrollRef = React.useRef<ScrollView | null>(null);
  const generation = React.useRef(0);
  const readPending = React.useRef<number | null>(null);
  const loginRequired = React.useRef<string | null>(null);

  const load = React.useCallback(async () => {
    if (readPending.current !== null) return;
    const request = ++generation.current;
    readPending.current = request;
    const current = () => request === generation.current && identity === identityRef.current;
    setPost(null);
    setPostIdentity(null);
    setError(null);
    setLoading(true);
    setMenuOpen(false);
    setDeleteOpen(false);
    setDeleteError(null);
    setDeleting(false);
    deleteLocked.current = false;
    try {
      if (!/^[1-9]\d*$/.test(postId) || !Number.isSafeInteger(Number(postId))) throw { kind: 'content' };
      const row =
        kind === 'wall'
          ? asWall(await getConfession(Number(postId)))
          : asPost(await getPostDetail(Number(postId)));
      if (row.id !== Number(postId)) throw { kind: 'content' };
      if (current()) {
        setPost(row);
        setPostIdentity(identity);
        loginRequired.current = null;
      }
    } catch (failure) {
      if (!current()) return;
      setError(errorFor(failure));
      const status = (failure as { status?: unknown } | null)?.status;
      if (kind === 'wall' && status === 401) {
        loginRequired.current = postId;
        setDeleteError('login');
        setLoading(false);
        await handleAuthFailure(failure).catch(() => undefined);
      } else if (kind === 'wall' && status === 403) {
        setDeleteError('denied');
      }
    } finally {
      if (current()) {
        readPending.current = null;
        setLoading(false);
      }
    }
  }, [postId, kind, identity, handleAuthFailure]);

  React.useEffect(() => {
    if (kind === 'wall') return;
    void load();
    return () => {
      generation.current++;
      readPending.current = null;
    };
  }, [load, kind]);

  useFocusEffect(React.useCallback(() => {
    if (kind !== 'wall') return;
    setDeleting(false);
    deleteLocked.current = false;
    if (loginRequired.current === postId && !isSignedIn) {
      // 取消登录仍可再次恢复；不带失效身份重读，也不保留请求中状态。
      setLoading(false);
      setDeleteError('login');
    } else {
      void load();
    }
    return () => {
      generation.current++;
      readPending.current = null;
      deleteLocked.current = false;
    };
  }, [kind, postId, isSignedIn, load]));

  const actions = useCampusActions(post, kind);

  React.useEffect(() => {
    setMenuOpen(false);
    setDeleteOpen(false);
    setDeleteError(null);
    setDeleting(false);
    deleteLocked.current = false;
    setReportOpen(false);
    setReportReason(null);
    setReportDetail('');
  }, [postId, kind]);

  React.useEffect(() => {
    if (actions.report.state !== 'success') return;
    setReportOpen(false);
    // 回执统一走全局 Toast（旧实现树洞用 HeroUI Toast、万能墙用自有 Toast，两套视觉）
    toast.show({ message: t('screen.campus.report.success'), tone: 'success' });
  }, [actions.report.state, toast, t]);

  const reportReasons = REPORT_REASONS.map((value) => ({
    value,
    label: t(REPORT_REASON_KEYS[value]),
  }));
  const reportMessage = ['failed', 'denied', 'invalid', 'login'].includes(actions.report.state)
    ? t(
        actions.report.state === 'login'
          ? 'screen.campus.write.login'
          : actions.report.state === 'denied'
            ? 'screen.campus.write.denied'
            : 'screen.campus.report.failed'
      )
    : undefined;

  const state: 'loading' | 'error' | 'empty' | 'content' = loading
    ? 'loading'
    : error?.kind === 'content'
      ? 'empty'
      : error
        ? 'error'
        : post
          ? 'content'
          : 'empty';

  const backToFeed = React.useCallback(() => {
    const target = detailBackTarget(published);
    if (target !== null) router.replace(target as never);
    else if (router.canGoBack()) router.back();
    else router.replace((kind === 'wall' ? '/?tab=wall' : '/') as never);
  }, [kind, published, router]);

  const removeWallPost = React.useCallback(async (): Promise<void> => {
    if (deleteLocked.current || !isSignedIn || postIdentity !== identity || !post?.is_mine) return;
    deleteLocked.current = true;
    const request = generation.current;
    const deletedId = Number(postId);
    setDeleteOpen(false);
    setDeleteError(null);
    setDeleting(true);
    try {
      const acknowledgement = await deleteConfession(deletedId);
      if (!acknowledgement || typeof acknowledgement !== 'object' || (acknowledgement as { status?: unknown }).status !== 0) {
        throw new Error('Invalid delete acknowledgement');
      }
      const client = getQueryClient();
      const snapshotKey = [...QK.confessionWindow('_guest'), 'wallReadSnapshot'];
      client.setQueryData<WallFeedSnapshot>(snapshotKey, (previous) => {
        const snapshot = previous ?? { rows: [], cursor: null, hasMore: true, needsRefresh: true };
        return {
          ...snapshot,
          rows: snapshot.rows.filter((row) => row.id !== deletedId),
          deletedIds: [...new Set([...(snapshot.deletedIds ?? []), deletedId])],
        };
      });
      if (request === generation.current && identity === identityRef.current) backToFeed();
    } catch (failure) {
      if (request !== generation.current || identity !== identityRef.current) return;
      // shared API 的 Error.status 是 HTTP 状态；403 也用于非作者，不能统一按登录过期处理。
      const status = (failure as { status?: unknown } | null)?.status;
      if (status === 401) {
        loginRequired.current = postId;
        setDeleteError('login');
        // 即使凭据存储清理失败，页内登录恢复入口仍可用。
        await handleAuthFailure(failure).catch(() => undefined);
      } else if (status === 403) {
        setDeleteError('denied');
      } else if (status === 404) {
        // 失败回执只切换详情失效态；不写成功删除标记，也不乐观删除列表。
        setPost(null);
        setError({ kind: 'content' });
      } else {
        setDeleteError('retry');
      }
    } finally {
      if (request === generation.current && identity === identityRef.current) {
        deleteLocked.current = false;
        setDeleting(false);
      }
    }
  }, [backToFeed, handleAuthFailure, postId, identity, isSignedIn, postIdentity, post?.is_mine]);

  const headerOptions = React.useMemo(
    () => ({
      headerShown: true,
      title: kind === 'wall' ? t('screen.campus.read.wallTitle') : t('screen.campus.read.post'),
      headerStyle: { backgroundColor: theme.color['bg-canvas'].value },
      headerTintColor: theme.color['text-primary'].value,
      headerTitleStyle: { color: theme.color['text-primary'].value },
      headerShadowVisible: false,
      headerBackButtonDisplayMode: 'minimal' as const,
      gestureEnabled: !published,
      ...(published
        ? {
            headerLeft: () => (
              <HeaderIconButton
                testID="campus-detail-back"
                label={t('action.back')}
                onPress={backToFeed}
                ios="chevron.left"
                android="arrow_back"
              />
            ),
          }
        : {}),
      ...(post !== null
        ? {
            headerRight: () => (
              <HeaderIconButton
                testID="campus-detail-more"
                label={t('screen.campus.read.moreActions')}
                onPress={() => setMenuOpen(true)}
                ios="ellipsis"
                android="more_vert"
              />
            ),
          }
        : {}),
    }),
    [backToFeed, kind, post, published, t, theme]
  );

  const vm = post ? toTreeholePostViewModel(post) : null;
  const timeLabel =
    post && post.created_at ? formatPostTime(post.created_at, { locale, absolute: true }) : '';

  const likeNotice =
    actions.likeNotice === null ? null : actions.likeNotice === 'login' ? (
      <InlineNotice
        testID="campus-detail-like-notice"
        tone="info"
        message={t('screen.campus.write.login')}
        actionLabel={t('action.login')}
        onAction={() => router.push('/login')}
      />
    ) : (
      <InlineNotice
        testID="campus-detail-like-notice"
        tone="danger"
        message={t(
          actions.likeNotice === 'denied'
            ? 'screen.campus.write.denied'
            : 'screen.campus.write.likeFailed'
        )}
      />
    );

  const composeNotice =
    actions.composeNotice === null ? null : actions.composeNotice === 'login' ? (
      <InlineNotice
        testID="campus-composer-notice"
        tone="info"
        message={t('screen.campus.write.login')}
        actionLabel={t('action.login')}
        onAction={() => router.push('/login')}
      />
    ) : (
      <InlineNotice
        testID="campus-composer-notice"
        tone="danger"
        message={t(
          actions.composeNotice === 'denied'
            ? 'screen.campus.write.denied'
            : 'screen.campus.write.sendFailed'
        )}
      />
    );

  const composer = (
    <View
      style={{
        paddingHorizontal: theme.space('space_2'),
        paddingTop: theme.space('space_2'),
        gap: theme.space('space_1'),
      }}
    >
      {composeNotice}
      <CommentComposer
        testID="campus-composer"
        value={actions.draft}
        onChangeText={actions.setDraft}
        placeholder={t('screen.campus.write.placeholder')}
        sendLabel={t('screen.campus.write.send')}
        onSend={actions.send}
        sending={actions.sending}
        maxLength={kind === 'wall' ? 500 : undefined}
        replyContext={actions.replyContext}
      />
    </View>
  );

  const commentCount = actions.interactions.commentCount ?? actions.comments.nodes.length;

  return (
    <>
      <Stack.Screen options={headerOptions} />
      <Screen
        testID="campus-detail"
        topMode="none"
        bottomMode="none"
        footer={state === 'content' ? composer : undefined}
      >
        {state === 'content' && vm !== null ? (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1, minHeight: 0 }}
            contentInsetAdjustmentBehavior="never"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: theme.space('space_6') }}
          >
            {deleting ? <LoadingState testID="wall-delete-pending" variant="spinner" /> : null}
            {deleteError ? (
              <View style={{ paddingHorizontal: theme.space('space_4'), paddingTop: theme.space('space_2') }}>
                <InlineNotice
                  testID="wall-delete-notice"
                  tone="danger"
                  message={t(
                    deleteError === 'login' ? 'auth.expired'
                      : deleteError === 'denied' ? 'screen.campus.write.denied'
                        : 'screen.campus.read.deleteFailed'
                  )}
                  actionLabel={t(
                    deleteError === 'login' ? 'action.login'
                      : deleteError === 'denied' ? 'screen.campus.read.backToList'
                        : 'action.retry'
                  )}
                  onAction={
                    deleteError === 'login' ? () => router.push('/login')
                      : deleteError === 'denied' ? backToFeed : () => setDeleteOpen(true)
                  }
                />
              </View>
            ) : null}
            <TreeholePostDetail
              post={vm}
              timeLabel={timeLabel}
              liked={actions.interactions.liked}
              likeCount={actions.interactions.likeCount}
              commentCount={actions.interactions.commentCount}
              onLike={actions.onToggleLike}
              onComment={() => scrollRef.current?.scrollToEnd({ animated: true })}
              anonymous={kind === 'wall'}
              wallContent={
                kind === 'wall' ? (
                  <WallTemplateContent templateKey={post?.template_key} content={vm.content} />
                ) : undefined
              }
              likeNotice={likeNotice}
            />

            <Divider />

            <View
              style={{
                paddingHorizontal: theme.space('space_4'),
                paddingTop: theme.space('space_3'),
                paddingBottom: theme.space('space_2'),
              }}
            >
              <Text role="label" emphasis="strong" colorToken="text-primary">
                {t('screen.campus.read.commentsCount', { count: commentCount })}
              </Text>
              {actions.comments.deleteFailed ? (
                <InlineNotice
                  testID="campus-comment-delete-notice"
                  tone="danger"
                  message={t('screen.campus.read.deleteCommentFailed')}
                  style={{ marginTop: theme.space('space_2') }}
                />
              ) : null}
            </View>

            <View style={{ paddingHorizontal: theme.space('space_4') }}>
              {actions.comments.loading && actions.comments.nodes.length === 0 ? (
                <LoadingState variant="skeleton" rows={3} testID="campus-detail-comments-loading" />
              ) : actions.comments.error && actions.comments.nodes.length === 0 ? (
                <InlineNotice
                  testID="campus-detail-comments-error"
                  tone="danger"
                  message={t('screen.campus.read.commentsFailed')}
                  actionLabel={t('action.retry')}
                  onAction={actions.comments.retry}
                />
              ) : actions.comments.nodes.length === 0 ? (
                <Text role="body" colorToken="text-muted" testID="campus-detail-comments-empty">
                  {t('screen.campus.read.noComments')}
                </Text>
              ) : (
                <CommentThread
                  testID="campus-detail-comments"
                  nodes={actions.comments.nodes}
                  onReply={actions.comments.onReply}
                  onDelete={kind === 'wall' ? (id: string) => setDeleteCommentId(id) : undefined}
                  labels={{
                    anonymous: t('screen.campus.read.anonymous'),
                    deleteLabel: t('screen.campus.read.delete'),
                    replyLabel: t('screen.campus.read.reply'),
                    likeLabel: t('screen.campus.read.like'),
                    moreReplies: (count: number) => String(count),
                    collapse: t('screen.campus.read.collapse'),
                  }}
                />
              )}
            </View>

            <DetailSheetHost
              menuOpen={menuOpen}
              onCloseMenu={() => setMenuOpen(false)}
              onReport={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
              deleteAction={
                kind === 'wall' && isSignedIn && postIdentity === identity && post?.is_mine
                  ? {
                      label: t('screen.campus.read.delete'),
                      disabled: deleting || deleteError === 'login' || deleteError === 'denied',
                      onPress: () => {
                        setMenuOpen(false);
                        setDeleteOpen(true);
                      },
                    }
                  : undefined
              }
              reportOpen={reportOpen}
              reportReasons={reportReasons}
              reportReason={reportReason}
              onReportReason={setReportReason}
              reportDetail={reportDetail}
              onReportDetail={setReportDetail}
              reportBusy={actions.report.state === 'sending'}
              reportMessage={reportMessage}
              reportAction={
                actions.report.state === 'login'
                  ? {
                      label: t('screen.campus.write.login'),
                      onPress: () => {
                        setReportOpen(false);
                        router.push('/login');
                      },
                    }
                  : undefined
              }
              onSubmitReport={() => {
                if (reportReason) {
                  void actions.report.submit(reportReason as CampusReportReason, reportDetail);
                }
              }}
              onCancelReport={() => setReportOpen(false)}
              reportLabels={{
                title: t('screen.campus.read.report'),
                reason: t('screen.campus.report.reason'),
                detail: t('screen.campus.report.detail'),
                submit: t('screen.campus.read.report'),
                cancel: t('action.cancel'),
              }}
              menuLabels={{
                title: t('screen.campus.read.moreActions'),
                report: t('screen.campus.read.report'),
                cancel: t('action.cancel'),
              }}
            />
            <AlertDialog
              testID="wall-delete-dialog"
              visible={deleteOpen}
              variant="danger"
              title={t('screen.campus.read.delete')}
              body={t('screen.campus.read.deleteBody')}
              confirmLabel={t('screen.campus.read.delete')}
              cancelLabel={t('action.cancel')}
              onCancel={() => setDeleteOpen(false)}
              onConfirm={() => { void removeWallPost(); }}
            />
            <AlertDialog
              testID="wall-comment-delete-dialog"
              visible={deleteCommentId !== null}
              variant="danger"
              title={t('screen.campus.read.delete')}
              body={t('screen.campus.read.deleteCommentBody')}
              confirmLabel={t('screen.campus.read.delete')}
              cancelLabel={t('action.cancel')}
              onCancel={() => setDeleteCommentId(null)}
              onConfirm={() => {
                const id = deleteCommentId;
                setDeleteCommentId(null);
                if (id !== null) actions.comments.deleteComment(id);
              }}
            />
          </ScrollView>
        ) : state === 'loading' ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <LoadingState testID="campus-detail-loading" />
          </View>
        ) : state === 'error' ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ErrorState
              testID="campus-detail-error"
              error={error ?? { kind: 'unknown' }}
              onAction={() => void load()}
            />
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState
              testID="campus-detail-empty"
              kind={error?.kind === 'content' ? 'noResult' : 'broken'}
              title={t('screen.campus.read.unavailable')}
              actionLabel={t('screen.campus.read.backToList')}
              onAction={backToFeed}
            />
          </View>
        )}
      </Screen>
    </>
  );
}

/**
 * 覆盖层的 insets 从 `Screen` 上下文取（S2/S7）：`ActionSheet` / `ReportSheet` 是 `Modal`，
 * 但它们**仍在 Screen 的 React 子树里**，所以能拿到唯一容器算好的值。
 */
function DetailSheetHost({
  menuOpen,
  onCloseMenu,
  onReport,
  deleteAction,
  reportOpen,
  reportReasons,
  reportReason,
  onReportReason,
  reportDetail,
  onReportDetail,
  reportBusy,
  reportMessage,
  reportAction,
  onSubmitReport,
  onCancelReport,
  reportLabels,
  menuLabels,
}: {
  menuOpen: boolean;
  onCloseMenu: () => void;
  onReport: () => void;
  /** 万能墙作者本人的删除入口；不传（树洞/非作者）时菜单里不出现 */
  deleteAction?: { label: string; onPress: () => void; disabled?: boolean };
  reportOpen: boolean;
  reportReasons: readonly { value: string; label: string }[];
  reportReason: string | null;
  onReportReason: (value: string) => void;
  reportDetail: string;
  onReportDetail: (value: string) => void;
  reportBusy: boolean;
  reportMessage?: string;
  reportAction?: { label: string; onPress: () => void };
  onSubmitReport: () => void;
  onCancelReport: () => void;
  reportLabels: { title: string; reason: string; detail: string; submit: string; cancel: string };
  menuLabels: { title: string; report: string; cancel: string };
}): React.ReactElement {
  const insets = useScreenInsets();
  return (
    <>
      <ActionSheet
        testID="campus-detail-menu"
        visible={menuOpen}
        title={menuLabels.title}
        actions={[
          ...(deleteAction ? [{ key: 'delete', label: deleteAction.label, disabled: deleteAction.disabled }] : []),
          { key: 'report', label: menuLabels.report },
        ]}
        onSelect={(key) => {
          if (key === 'delete') deleteAction?.onPress();
          if (key === 'report') onReport();
        }}
        onCancel={onCloseMenu}
        cancelLabel={menuLabels.cancel}
        bottomInset={insets.insets.bottom}
      />
      <ReportSheet
        visible={reportOpen}
        reasons={reportReasons}
        reason={reportReason}
        detail={reportDetail}
        onReason={onReportReason}
        onDetail={onReportDetail}
        onSubmit={onSubmitReport}
        onCancel={onCancelReport}
        busy={reportBusy}
        message={reportMessage}
        action={reportAction}
        labels={reportLabels}
        maxDetailLength={1000}
        bottomInset={insets.insets.bottom}
      />
    </>
  );
}

/**
 * 原生 Header 里的图标动作（第 2 层图标：平台原生名，⛔ 不拿 Lucide 冒充系统图标）。
 * ⚠️ Android 侧 Material Symbols 由 `expo-symbols` 用字体渲染，首帧可能是空占位（宽度已定，不会跳版）。
 */
function HeaderIconButton({
  testID,
  label,
  onPress,
  ios,
  android,
}: {
  testID: string;
  label: string;
  onPress: () => void;
  ios: SFSymbol;
  android: AndroidSymbol;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minWidth: theme.touchTarget,
        minHeight: theme.touchTarget,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SymbolView
        name={{ ios, android }}
        size={theme.iconSize('icon_size_default')}
        tintColor={theme.color['icon-primary'].value}
      />
    </Pressable>
  );
}

export { WallFeed } from './WallFeed';
export { TreeholeFeed } from './TreeholeFeed';
export { wallTemplateLabel } from './wallTemplates';
export type { Post } from './campusModel';
