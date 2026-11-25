import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { loginPath } from '../../utils/loginReturn';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContextState';
import { useLanguage } from '../../context/LanguageContextState';
import CampusNewsFeed from './CampusNewsFeed';
import { CAMPUS_NEWS_CATEGORIES } from './campusNewsModel';
import { campusNewsApi as api, presentNews } from './campusNewsApi';

const PAGE_SIZE = 10;

export function NewsFailure({ error, retry }) {
  const location = useLocation();
  const { lang } = useLanguage();
  const en = lang === 'en';
  const needLogin = [401, 403].includes(error?.status);
  const message = needLogin
    ? (en ? 'Log in with a valid account to read campus news.' : '请登录有效账号后阅读校园快讯。')
    : error?.status === 404
      ? (en ? 'This post does not exist or is no longer public.' : '此快讯不存在或已不再公开。')
      : error?.message || (en ? 'Failed to load. Please try again.' : '加载失败，请重试。');
  return <div className="campus-news-empty" role="alert"><p>{message}</p>
    {needLogin ? <Link to={loginPath(location)}>{en ? 'Log in' : '前往登录'}</Link> : retry && <button type="button" onClick={retry}>{en ? 'Retry' : '重试'}</button>}</div>;
}

export default function CampusNewsRemote() {
  const { user, isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const en = lang === 'en';
  const [category, setCategory] = useState(''), [related, setRelated] = useState('0'), [page, setPage] = useState(1);
  const topRef = useRef(null);
  const context = useQuery({ queryKey: ['campus-news-context', user?.id], queryFn: api.context, enabled: isLoggedIn, staleTime: 0, retry: false });
  const feed = useQuery({
    queryKey: ['campus-news-live', user?.id, category, related, page],
    queryFn: async () => {
      const result = await api.list({ category, related, page });
      return { ...result, items: result.items.map(post => presentNews(post, context.data?.items)) };
    },
    enabled: isLoggedIn && context.isSuccess,
    staleTime: 0,
    retry: false,
    // 切换分类、翻页时先保留上一屏，避免整块变成"加载中"再跳回来
    placeholderData: (previous) => previous,
  });
  if (!isLoggedIn) return <NewsFailure error={{ status: 401 }} />;

  const choose = (apply) => { apply(); setPage(1); };
  const goPage = (next) => {
    setPage(next);
    topRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };
  const total = feed.data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const updating = feed.isFetching && feed.isPlaceholderData;

  return <section className="campus-news-live" ref={topRef}>
    {/* 分类和"只看与我相关"合成一行：原来两行长得一样的按钮（全部 / 全部通知）容易混 */}
    <div className="campus-news-toolbar">
      <nav className="campus-news-filters" aria-label={en ? 'News category' : '快讯分类'}>
        {[['', en ? 'All' : '全部'], ...Object.entries(CAMPUS_NEWS_CATEGORIES).map(([code, c]) => [code, en ? c.nameEn : c.name])].map(([code, name]) => (
          <button type="button" key={code || 'all'} aria-pressed={category === code} onClick={() => choose(() => setCategory(code))}>{name}</button>
        ))}
      </nav>
      <button
        type="button"
        className="campus-news-related"
        aria-pressed={related === '1'}
        onClick={() => choose(() => setRelated(related === '1' ? '0' : '1'))}
        title={en ? 'Only notices for all students or your college' : '只看面向全体学生和你所在学院的通知'}
      >
        {en ? 'Relevant to me' : '只看与我相关'}
      </button>
    </div>
    {related === '1' && context.isSuccess && !context.data?.collegeId && (
      <p className="campus-news-end">{en ? 'Your college is not matched yet, so only notices for all students are shown.' : '学院尚未匹配，当前仅显示面向全体学生的通知。'}</p>
    )}
    {context.isError ? <NewsFailure error={context.error} retry={context.refetch} /> : feed.isError ? <NewsFailure error={feed.error} retry={feed.refetch} />
      : context.isPending || feed.isPending ? <p className="campus-news-empty" role="status">{en ? 'Loading campus news…' : '正在加载校园快讯…'}</p>
        : <div className={updating ? 'campus-news-updating' : undefined} aria-busy={updating}>
          <CampusNewsFeed posts={feed.data.items} hasMore={page * PAGE_SIZE < total} />
          {pages > 1 && (
            <nav className="campus-news-filters campus-news-pager" aria-label={en ? 'Pages' : '快讯分页'}>
              <button type="button" disabled={page === 1 || updating} onClick={() => goPage(page - 1)}>{en ? 'Previous' : '上一页'}</button>
              <span>{en ? `Page ${page} of ${pages} · ${total} posts` : `第 ${page} / ${pages} 页 · 共 ${total} 条`}</span>
              <button type="button" disabled={page >= pages || updating} onClick={() => goPage(page + 1)}>{en ? 'Next' : '下一页'}</button>
            </nav>
          )}
        </div>}
  </section>;
}
