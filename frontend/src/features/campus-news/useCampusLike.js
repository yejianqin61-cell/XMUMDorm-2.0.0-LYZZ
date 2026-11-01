import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCampusInteractions, setCampusLike } from '@shared/api/square';
import { useAuth } from '../../context/AuthContextState';
import { Toast } from '../../context/toast';
import { createLikeCoordinator } from './campusLikeCoordinator';

const coordinators = new WeakMap();
function coordinator(client) {
  if (!coordinators.has(client)) coordinators.set(client, createLikeCoordinator());
  return coordinators.get(client);
}
function validState(data, postId) {
  if (data?.target_type !== 'campus_post' || String(data.post_id) !== String(postId)
    || ![true, false, null].includes(data.liked)
    || !Number.isSafeInteger(data.like_count) || data.like_count < 0
    || !Number.isSafeInteger(data.comment_count) || data.comment_count < 0) throw new Error('点赞数据无效，请刷新核对');
  return data;
}
export function useCampusLike(post) {
  const { user, token, isLoggedIn } = useAuth();
  const client = useQueryClient();
  const postId = String(post.id);
  const key = ['campus-interactions', user?.id ?? 'guest', postId];
  const mutationKey = ['campus-like-write', user?.id ?? 'guest', postId];
  const enabled = Boolean(post.real);
  const read = async () => validState(await getCampusInteractions(postId, { token: token ?? null }), postId);
  const query = useQuery({ queryKey: key, queryFn: read, enabled,
    initialData: enabled ? post.interactions : undefined, staleTime: 15000, retry: false });
  const refreshViews = () => client.invalidateQueries({ predicate: q => {
    const k = q.queryKey;
    return (['campus-news-live', 'campus-news-detail-live', 'campus-news-route'].includes(k[0]) && k[1] === user?.id)
      || (k[0] === 'square' && k[1] === 'campusPost' && String(k[2]) === postId);
  } });
  const mutation = useMutation({ mutationKey, retry: false, mutationFn: async () => {
    if (!isLoggedIn) throw new Error('请先登录后点赞');
    const current = client.getQueryData(key);
    if (typeof current?.liked !== 'boolean' || current.can_like === false) throw new Error('当前帖子不能点赞，请刷新核对');
    return coordinator(client)({ key: JSON.stringify(key), desired: !current.liked,
      write: async desired => validState(await setCampusLike(postId, desired, { token: token ?? null }), postId), read,
      apply: result => client.setQueryData(key, result), unavailable: () => client.setQueryData(key, null) });
  }, onSettled: () => { void refreshViews(); }, onError: error => Toast.error(error.message || '点赞失败，请刷新核对') });
  const pending = useIsMutating({ mutationKey }) > 0;
  return { liked: query.data?.liked, likeCount: query.data?.like_count, commentCount: query.data?.comment_count,
    pending, canLike: isLoggedIn && !pending && Boolean(query.data) && query.data.can_like !== false && !query.isError,
    error: query.isError ? query.error.message : !query.data && !query.isPending ? '互动状态未确认，请重试' : null,
    retry: query.refetch, onLike: () => { if (!pending) mutation.mutate(); } };
}
