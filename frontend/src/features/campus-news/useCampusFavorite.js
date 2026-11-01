import { useEffect } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCampusFavorite, setCampusFavorite } from '@shared/api/campusFavorites';
import { useAuth } from '../../context/AuthContextState';
import { createFavoriteCoordinator } from './campusFavoriteCoordinator';

const coordinators = new WeakMap();
function coordinator(client) {
  if (!coordinators.has(client)) coordinators.set(client, createFavoriteCoordinator());
  return coordinators.get(client);
}
function valid(data, id) {
  if (data?.target_type !== 'campus_post' || String(data.post_id) !== id || typeof data.favorited !== 'boolean') throw new Error('收藏状态无效，请重新核对');
  return data;
}
function refreshUnavailable(client, token, userId, postId) {
  void client.invalidateQueries({ queryKey: ['my-content', 'favorites:news', token] });
  void client.invalidateQueries({ queryKey: ['myzone', 'favoritesCount'] });
  void client.invalidateQueries({ predicate: q => (['campus-news-live', 'campus-news-detail-live', 'campus-news-route'].includes(q.queryKey[0]) && q.queryKey[1] === userId)
    || (q.queryKey[0] === 'square' && q.queryKey[1] === 'campusPost' && String(q.queryKey[2]) === postId) });
}
export function useCampusFavorite(value) {
  const postId = String(value);
  const { token, user, isLoggedIn } = useAuth();
  const client = useQueryClient();
  const key = ['campus-favorite', token ?? 'guest', postId];
  const mutationKey = ['campus-favorite-write', token ?? 'guest', postId];
  const read = async () => valid(await getCampusFavorite(postId, { token: token ?? null }), postId);
  const query = useQuery({ queryKey: key, queryFn: read, enabled: isLoggedIn, retry: false, staleTime: 0, gcTime: 0 });
  const refreshLists = () => {
    void client.invalidateQueries({ queryKey: ['my-content', 'favorites:news', token] });
    void client.invalidateQueries({ queryKey: ['myzone', 'favoritesCount'] });
  };
  // If a target or reader becomes unavailable, remove stale content through the
  // existing feed/detail/list readers, which enforce their current permissions.
  const inaccessible = [401,403,404].includes(query.error?.status);
  useEffect(() => {
    if (!inaccessible) return;
    refreshUnavailable(client, token, user?.id, postId);
  }, [inaccessible, client, token, user?.id, postId]);
  const mutation = useMutation({ mutationKey, retry: false, mutationFn: desired => coordinator(client)({
    key: JSON.stringify(key), desired,
    write: async state => valid(await setCampusFavorite(postId, state, { token: token ?? null }), postId), read,
    apply: state => client.setQueryData(key, state),
    unavailable: () => client.setQueryData(key, { target_type: 'campus_post', post_id: postId, favorited: null }),
  }), onSettled: refreshLists, onError: error => {
    if ([401,403,404].includes(error.status)) refreshUnavailable(client, token, user?.id, postId);
  } });
  const pending = useIsMutating({ mutationKey }) > 0;
  const known = typeof query.data?.favorited === 'boolean' && !query.isError;
  return { isLoggedIn, favorited: known ? query.data.favorited : null, pending,
    loading: isLoggedIn && query.isPending, canWrite: isLoggedIn && !pending && known,
    error: query.error?.message || mutation.error?.message || (!query.isPending && !known && isLoggedIn ? '收藏状态未确认，请重试' : null),
    retry: () => { mutation.reset(); void query.refetch(); },
    set: desired => { if (!pending && isLoggedIn) mutation.mutate(desired); },
  };
}
