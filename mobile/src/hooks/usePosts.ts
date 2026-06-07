import { useState, useEffect, useCallback, useRef } from 'react';
import { getPostList } from '../api/posts';

export interface PostItem {
  id: number;
  content?: string;
  title?: string;
  images?: string[];
  user_id?: number;
  username?: string;
  nickname?: string;
  avatar?: string;
  tag_id?: number;
  tag_slug?: string;
  likes_count?: number;
  comments_count?: number;
  created_at?: string;
}

function mergePostsById(existing: PostItem[], incoming: PostItem[]): PostItem[] {
  const seen = new Set(existing.map((p) => p.id));
  const merged = [...existing];
  for (const p of incoming) {
    if (p?.id == null || seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  return merged;
}

/**
 * Custom hook for fetching and managing post list with infinite scroll.
 * Used by TreeholeScreen and other post list screens.
 */
export function usePosts(pageSize = 10) {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const slugRef = useRef<string | null>(null);

  const fetchPosts = useCallback(
    async (pageNum = 1, slug: string | null = slugRef.current, append = false) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params: any = { page: pageNum, pageSize };
        if (slug) params.tagSlug = slug;

        const data = await getPostList(params);
        const list: PostItem[] = data?.list || [];

        setPosts((prev) => (append ? mergePostsById(prev, list) : list));
        const more = !!data?.hasMore;
        setHasMore(more);
        hasMoreRef.current = more;
        setPage(pageNum);
        pageRef.current = pageNum;
      } catch {
        if (!append) setPosts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        fetchingRef.current = false;
      }
    },
    [pageSize]
  );

  const refresh = useCallback(
    (slug?: string | null) => {
      slugRef.current = slug ?? null;
      fetchPosts(1, slugRef.current, false);
    },
    [fetchPosts]
  );

  const loadMore = useCallback(() => {
    if (hasMoreRef.current && !fetchingRef.current) {
      fetchPosts(pageRef.current + 1, slugRef.current, true);
    }
  }, [fetchPosts]);

  return { posts, loading, loadingMore, page, hasMore, refresh, loadMore, fetchPosts };
}
