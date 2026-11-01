import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { loginPath } from '../../utils/loginReturn';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContextState';
import CampusNewsFeed from './CampusNewsFeed';
import { CAMPUS_NEWS_CATEGORIES } from './campusNewsModel';
import { campusNewsApi as api, presentNews } from './campusNewsApi';

export function NewsFailure({ error, retry }) {
  const location = useLocation();
  return <div className="campus-news-empty" role="alert"><p>{[401,403].includes(error?.status) ? '请登录有效账号后阅读校园快讯。' : error?.status === 404 ? '此快讯不存在或已不再公开。' : error?.message || '加载失败，请重试。'}</p>
    {[401,403].includes(error?.status) ? <Link to={loginPath(location)}>前往登录</Link> : retry && <button type="button" onClick={retry}>重试</button>}</div>;
}
export default function CampusNewsRemote() {
  const { user, isLoggedIn } = useAuth();
  const [category, setCategory] = useState(''), [related, setRelated] = useState('0'), [page, setPage] = useState(1);
  const context = useQuery({ queryKey: ['campus-news-context',user?.id], queryFn: api.context, enabled: isLoggedIn, staleTime: 0, retry: false });
  const feed = useQuery({ queryKey: ['campus-news-live',user?.id,category,related,page], queryFn: async () => {
    const result = await api.list({ category, related, page });
    return { ...result, items: result.items.map(post => presentNews(post, context.data?.items)) };
  }, enabled: isLoggedIn && context.isSuccess, staleTime: 0, retry: false });
  if (!isLoggedIn) return <NewsFailure error={{ status: 401 }} />;
  return <section className="campus-news-live">
    <nav className="campus-news-filters" aria-label="快讯分类">{[['','全部'], ...Object.entries(CAMPUS_NEWS_CATEGORIES).map(([code,c])=>[code,c.name])].map(([code,name]) => <button type="button" key={code} aria-pressed={category===code} onClick={()=>{setCategory(code);setPage(1);}}>{name}</button>)}</nav>
    <nav className="campus-news-filters" aria-label="通知相关性">{[['0','全部通知'],['1','与我相关']].map(([code,name])=><button type="button" key={code} aria-pressed={related===code} onClick={()=>{setRelated(code);setPage(1);}}>{name}</button>)}</nav>
    {related==='1' && !context.data?.collegeId && <p className="campus-news-end">学院尚未匹配，当前仅显示面向全体学生的通知。</p>}
    {context.isError ? <NewsFailure error={context.error} retry={context.refetch} /> : feed.isError ? <NewsFailure error={feed.error} retry={feed.refetch} />
      : context.isPending || feed.isPending ? <p className="campus-news-empty" role="status">正在加载校园快讯…</p>
        : <><CampusNewsFeed posts={feed.data.items} hasMore={page*10<feed.data.total} /><nav className="campus-news-filters" aria-label="快讯分页"><button type="button" disabled={page===1} onClick={()=>setPage(p=>p-1)}>上一页</button><span>第 {page} 页 · 共 {feed.data.total} 条</span><button type="button" disabled={page*10>=feed.data.total} onClick={()=>setPage(p=>p+1)}>下一页</button></nav></>}
  </section>;
}
