import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContextState';
import { useAuth } from '../../context/AuthContextState';
import { getMySavedHandbookArticles } from '@shared/api/handbook';
import { flattenPages, nextPageParamFrom } from '@shared/utils/infiniteList';
import { QK } from '@shared/query/queryKeys';
import './Handbook.css';

function HandbookMe() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn, token } = useAuth();
  const tokenKey = token ? String(token).slice(0, 12) : 'anon';

  // 收藏文章按页加载。
  const savedQuery = useInfiniteQuery({
    queryKey: QK.handbookMeSaved(tokenKey, 20),
    queryFn: async ({ pageParam }) => {
      const data = await getMySavedHandbookArticles({ page: pageParam, pageSize: 20 });
      return { list: data?.list || [], hasMore: !!data?.hasMore, page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: nextPageParamFrom,
    placeholderData: (prev) => prev,
    enabled: isLoggedIn,
    staleTime: 15 * 1000,
  });

  const savedList = useMemo(() => flattenPages(savedQuery.data?.pages), [savedQuery.data]);

  return (
    <div className="handbook-page">
      <div className="handbook-detail-top">
        <Link to="/about/freshman-guide" className="handbook-back">
          {isZh ? '← 返回手册' : '← Back'}
        </Link>
      </div>

      <div className="handbook-collections">
        <div className="handbook-collections-title">{isZh ? '我的收藏' : 'Saved articles'}</div>

        {!isLoggedIn ? (
          <div className="handbook-empty" style={{ marginTop: 14 }}>
            <div className="handbook-empty-title">{isZh ? '需要登录' : 'Login required'}</div>
            <div className="handbook-empty-sub">{isZh ? '登录后才可以查看收藏。' : 'Please login.'}</div>
          </div>
        ) : (
          <>
              <div className="handbook-mini-list" style={{ marginTop: 10 }}>
                {savedList.map((a) => (
                  <Link key={a.id} to={`/about/freshman-guide/a/${a.id}`} className="handbook-mini-card">
                    <div className="handbook-mini-title">{a.title}</div>
                    {a.summary ? <div className="handbook-mini-sub">{a.summary}</div> : null}
                  </Link>
                ))}
                {!savedQuery.isFetching && savedList.length === 0 ? (
                  <div className="handbook-mini-empty">{isZh ? '暂无收藏文章' : 'No saved articles'}</div>
                ) : null}
                {savedQuery.hasNextPage ? (
                  <button
                    type="button"
                    className="handbook-loadmore"
                    onClick={() => savedQuery.fetchNextPage()}
                    disabled={savedQuery.isFetchingNextPage}
                  >
                    {savedQuery.isFetchingNextPage ? (isZh ? '加载中…' : 'Loading…') : (isZh ? '加载更多' : 'Load more')}
                  </button>
                ) : null}
              </div>
          </>
        )}
      </div>
    </div>
  );
}

export default HandbookMe;

