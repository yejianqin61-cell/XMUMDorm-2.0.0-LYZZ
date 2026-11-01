import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContextState';
import { useLanguage } from '../context/LanguageContextState';
import { getApiErrorMessage } from '@shared/utils/apiError';
import EmptyState from './ui/EmptyState';
import './MyContentPage.css';

export default function MyContentPage(props) {
  const { token } = useAuth();
  return <ContentSession key={token || 'guest'} {...props} token={token} />;
}

function ContentSession({ token, kind, title, category, load, renderItem, emptyTitle, actionLabel, actionTo }) {
  const { isZh } = useLanguage();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['my-content', kind, token, page],
    queryFn: () => load({ page, pageSize: 10 }, { token }),
    enabled: !!token, staleTime: 0, gcTime: 0, retry: false,
  });
  const list = query.data?.list || [];
  const lastPage = Math.max(1, Math.ceil(Number(query.data?.total || 0) / 10));
  if (query.isSuccess && page > lastPage) setPage(lastPage);
  return <main className="my-content-page">
    <Link to="/myzone">‹ {isZh ? '个人中心' : 'My zone'}</Link>
    <header><h1>{title}</h1>{category && <nav aria-label={isZh ? '收藏分类' : 'Favorite categories'}>{typeof category === 'string' ? <span aria-current="page">{category}</span> : category}</nav>}</header>
    {!token ? <EmptyState title={isZh ? '请先登录' : 'Login required'} actionLabel={isZh ? '去登录' : 'Log in'} actionTo="/login" />
      : query.isPending ? <p role="status">{isZh ? '加载中…' : 'Loading…'}</p>
      : query.isError ? <div role="alert"><p>{getApiErrorMessage(query.error)}</p><button type="button" onClick={() => query.refetch()}>{isZh ? '重试' : 'Retry'}</button></div>
      : <>
        <p>{isZh ? `共 ${query.data?.total || 0} 条` : `${query.data?.total || 0} items`}</p>
        {list.length ? <ul className="my-content-list">{list.map(item => <li key={item.id ?? item.product_id}>{renderItem(item)}</li>)}</ul>
          : <EmptyState title={emptyTitle} actionLabel={actionLabel} actionTo={actionTo} />}
      </>}
    {token && <nav className="my-content-pagination" aria-label={isZh ? '分页' : 'Pagination'}>
      <button disabled={page === 1 || query.isFetching} onClick={() => setPage(p => p - 1)}>{isZh ? '上一页' : 'Previous'}</button>
      <span>{isZh ? `第 ${page} 页` : `Page ${page}`}</span>
      <button disabled={!query.data?.hasMore || query.isFetching || query.isError} onClick={() => setPage(p => p + 1)}>{isZh ? '下一页' : 'Next'}</button>
    </nav>}
  </main>;
}
