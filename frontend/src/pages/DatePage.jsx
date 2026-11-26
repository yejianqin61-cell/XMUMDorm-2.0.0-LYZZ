import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContextState';
import { useAuth } from '../context/AuthContextState';
import { getPostList } from '@shared/api/posts';
import { getApiErrorMessage } from '@shared/utils/apiError';
import PostCard from '../components/PostCard';
import './DatePage.css';

const CATEGORIES = [
  { key: 'friends', slug: 'friendship-friends', zh: '交朋友', en: 'Make friends' },
  { key: 'study', slug: 'friendship-study', zh: '学习搭子', en: 'Study buddies' },
  { key: 'activity', slug: 'friendship-activity', zh: '活动搭子', en: 'Activity buddies' },
];

export default function DatePage() {
  const { lang } = useLanguage();
  const { isLoggedIn } = useAuth();
  const isEn = lang === 'en';
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getPostList({ page: 1, pageSize: 20, ...(category.slug ? { tagSlug: category.slug } : {}) })
      .then((data) => {
        if (!active) return;
        setPosts(data?.list || []);
        setHasMore(!!data?.hasMore);
        setPage(1);
      })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError('');
    try {
      const nextPage = page + 1;
      const data = await getPostList({ page: nextPage, pageSize: 20, ...(category.slug ? { tagSlug: category.slug } : {}) });
      setPosts((prev) => [...prev, ...(data?.list || [])]);
      setHasMore(!!data?.hasMore);
      setPage(nextPage);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="date-page">
      <header className="date-hero">
        <div>
          <p className="date-eyebrow">{isEn ? 'CAMPUS COMMUNITY' : '校园社区'}</p>
          <h1>{isEn ? 'Meet through posts' : '交友'}</h1>
          <p>{isEn ? 'Make friends and find study or activity buddies through posts.' : '通过帖子结识新朋友，寻找学习搭子或活动搭子。'}</p>
        </div>
        {isLoggedIn ? (
          <div className="date-compose-actions">
            <Link className="date-compose" to="/post/new?friendship=friends"><PenLine size={17} aria-hidden />{isEn ? 'Make friends' : '发布交友帖'}</Link>
            <Link className="date-compose" to="/post/new?friendship=study"><PenLine size={17} aria-hidden />{isEn ? 'Find a study buddy' : '招募学习搭子'}</Link>
            <Link className="date-compose date-compose-secondary" to="/post/new?friendship=activity"><PenLine size={17} aria-hidden />{isEn ? 'Find an activity buddy' : '招募活动搭子'}</Link>
          </div>
        ) : <Link className="date-compose" to="/login">{isEn ? 'Log in to post' : '登录后发帖'}</Link>}
      </header>
      <p className="date-safety"><ShieldCheck size={17} aria-hidden />{isEn
        ? 'Keep phone numbers, social handles, addresses, and other private details out of public posts. Use report or block if something feels wrong.'
        : '请勿在公开帖子中留下电话、社交账号、住址等隐私信息；遇到不舒服的内容可使用举报或拉黑。'}</p>
      <nav className="date-categories" aria-label={isEn ? 'Post category' : '帖子分类'}>
        {CATEGORIES.map((item) => (
          <button key={item.key} type="button" aria-pressed={category.key === item.key} className={category.key === item.key ? 'is-active' : ''} onClick={() => setCategory(item)}>
            {isEn ? item.en : item.zh}
          </button>
        ))}
      </nav>
      {error ? <p className="date-error" role="alert">{error}</p> : null}
      {!loading && posts.length === 0 ? <div className="date-empty">{isEn ? 'No posts here yet. Be the first to post!' : '这里还没有帖子，来发布第一条吧。'}</div> : null}
      <div className="date-posts">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
      {loading ? <p className="date-status">{isEn ? 'Loading…' : '加载中…'}</p> : null}
      {hasMore && !loading ? <button type="button" className="date-more" onClick={loadMore}>{isEn ? 'Load more' : '加载更多'}</button> : null}
    </main>
  );
}
