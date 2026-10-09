/**
 * 我的帖子（`M-04`）—— 页面级组合（P2C-04）
 *
 * 形态依据：
 *   · **骨架**：`P2` 列表 → `K05 ListScreen`（四态与分页状态机只在骨架里）
 *   · **两步取数**：先 `/api/users/me` 拿自己的 `id`，再取该 id 的 profile（⛔ 不猜 id、⛔ 没有 `?mine` 这种接口）
 *   · **空态**用 `firstRun`（引导去发布），不是 `noResult`
 *
 * ⚠️ 两处如实登记：
 *   1. 行**不可点**：帖子详情（`C-02`）是丙的页面，App 里还没有这个路由 —— ⛔ 不跳到 404；
 *   2. 删帖成功后**本地先移除**：服务端 profile 有 10s 缓存，刷新可能又看到它（缺口，登记在案）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Trash from 'lucide-react-native/icons/trash';

import { AlertDialog } from '@/components/ui/AlertDialog';
import { EntityCard } from '@/components/ui/EntityCard';
import { IconButton } from '@/components/ui/IconButton';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { getMe, getProfile } from '../../../../shared/api/users';
import { deletePost } from '../../../../shared/api/posts';
import { toMailboxError } from '@/features/mailbox/conversations';
import {
  mergePostRows,
  normalizeProfilePosts,
  postExcerpt,
  removePostRow,
  type MyPostRow,
} from './posts';

const PAGE_SIZE = 20;
const SCOPE = { primaryTab: 'me', secondaryTab: 'posts' } as const;

export function PostsScreen(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();

  const [rows, setRows] = React.useState<readonly MyPostRow[]>([]);
  const [pendingDelete, setPendingDelete] = React.useState<MyPostRow | null>(null);
  const myIdRef = React.useRef<number | null>(null);
  const pageRef = React.useRef(1);
  const { pagination, dispatch, restoredScrollOffset, persistScrollOffset } = useListPagination({
    scope: SCOPE,
  });

  const load = React.useCallback(
    async (mode: 'refresh' | 'append') => {
      dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
      try {
        if (myIdRef.current === null) {
          const me = await getMe();
          const id = Number((me as { id?: number } | null)?.id);
          if (!Number.isInteger(id) || id <= 0) throw { kind: 'unknown' };
          myIdRef.current = id;
        }
        const page = mode === 'refresh' ? 1 : pageRef.current + 1;
        const payload = await getProfile(myIdRef.current, { page, pageSize: PAGE_SIZE });
        const normalized = normalizeProfilePosts(payload);
        pageRef.current = page;
        setRows((previous) =>
          mode === 'refresh' ? normalized.rows : mergePostRows(previous, normalized.rows)
        );
        dispatch({
          type: mode === 'refresh' ? 'refresh:success' : 'append:success',
          // ⚠️ 用服务端给的 `hasMore`，⛔ 不用"条数 < pageSize"自己推
          hasMore: normalized.hasMore,
        });
      } catch (error) {
        dispatch({
          type: mode === 'refresh' ? 'refresh:failure' : 'append:failure',
          error: toMailboxError(error),
        });
      }
    },
    [dispatch]
  );

  React.useEffect(() => {
    void load('refresh');
  }, [load]);

  const confirmDelete = React.useCallback(async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (target === null) return;
    // 本地先移除：服务端 profile 有 10s 缓存，等它过期会让用户以为"没删掉"
    setRows((previous) => removePostRow(previous, target.id));
    try {
      await deletePost(target.id);
    } catch {
      // 删失败就把列表拉回来（⛔ 不静默吞掉）
      await load('refresh');
    }
  }, [load, pendingDelete]);

  return (
    <Screen testID="screen-me-posts" titleKey="me.entry.posts" bottomMode="none">
      <View style={{ flex: 1 }}>
        <ListScreen
          testID="me-posts-list"
          data={rows}
          keyExtractor={(row) => String(row.id)}
          pagination={pagination}
          onRefresh={() => void load('refresh')}
          onEndReached={() => void load('append')}
          onRetryRefresh={() => void load('refresh')}
          onRetryAppend={() => void load('append')}
          restoredScrollOffset={restoredScrollOffset}
          onScrollOffset={persistScrollOffset}
          labels={{
            empty: {
              kind: 'firstRun',
              title: t('me.posts.empty.title'),
              description: t('me.posts.empty.description'),
              actionLabel: t('me.posts.empty.action'),
              onAction: () => router.push('/publish-center'),
            },
            errorActionLabel: t('action.retry'),
            retryLabel: t('action.retry'),
            endLabel: t('mailbox.conversations.end'),
          }}
          renderItem={(row) => (
            <View
              testID={`me-post-${row.id}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}
            >
              <View style={{ flex: 1 }}>
                {/* ⛔ 行不可点：帖子详情（C-02）是丙的页面，App 里还没有这个路由 */}
                <EntityCard
                  domain="post"
                  title={postExcerpt(row.excerpt, t('me.posts.noText'))}
                  subtitle={t('me.posts.meta', { likes: row.likeCount, comments: row.commentCount })}
                  mediaUri={row.imageUri ?? undefined}
                />
              </View>
              <IconButton
                testID={`me-post-delete-${row.id}`}
                Icon={Trash}
                accessibilityLabel={t('me.posts.delete')}
                onPress={() => setPendingDelete(row)}
              />
            </View>
          )}
        />
      </View>

      <AlertDialog
        testID="me-posts-delete-dialog"
        visible={pendingDelete !== null}
        variant="danger"
        title={t('me.posts.delete.title')}
        body={t('me.posts.delete.body')}
        confirmLabel={t('me.posts.delete.confirm')}
        cancelLabel={t('action.cancel')}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </Screen>
  );
}
