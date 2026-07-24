import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getProfile } from '@shared/api/users';
import PostCard from '../components/PostCard';
import EmptyState from '../components/ui/EmptyState';
import { API_BASE_URL } from '@shared/api/config';
import { getApiErrorMessage } from '@shared/utils/apiError';
import './MyPosts.css';

/** 我的帖子列表：从 GET /api/users/:id/profile 获取当前用户的帖子 */
function MyPosts() {
  const { user, isLoggedIn, refreshUser } = useAuth();
  const { isZh } = useLanguage();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setList([]);
      setLoading(false);
      return;
    }
    if (!user?.id) {
      refreshUser?.();
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProfile(user.id, { page: 1, pageSize: 30 })
      .then((data) => {
        if (cancelled) return;
        const rawPosts = data?.posts ?? data?.postList ?? [];
        const posts = rawPosts.map((p) => ({
          ...p,
          author: data.user
            ? {
                ...data.user,
                avatar: data.user.avatar && !data.user.avatar.startsWith('http')
                  ? `${API_BASE_URL}${data.user.avatar}`
                  : data.user.avatar,
              }
            : null,
        }));
        setList(posts);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isLoggedIn, user?.id]);

  if (!isLoggedIn) {
    return (
      <div className="myposts-page">
        <EmptyState
          title={isZh ? '请先登录' : 'Login required'}
          description={isZh ? '登录后查看我的帖子。' : 'Log in to view your posts.'}
          actionLabel={isZh ? '去登录' : 'Log in'}
          actionTo="/login"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="myposts-page">
        <p className="myposts-loading state-loading">{isZh ? '加载中…' : 'Loading…'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="myposts-page">
        <p className="myposts-error state-error">{error}</p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="myposts-page">
        <EmptyState
          title={isZh ? '暂无帖子' : 'No posts yet'}
          description={isZh ? '去发布第一条吧。' : 'Publish your first post.'}
          actionLabel={isZh ? '发布第一条 →' : 'Publish your first post →'}
          actionTo="/post/new"
        />
      </div>
    );
  }

  return (
    <div className="myposts-page">
      <section className="myposts-hero">
        <div className="myposts-hero__copy">
          <p className="myposts-hero__eyebrow">{isZh ? '我的帖子' : 'My posts'}</p>
          <h1 className="myposts-hero__title">{isZh ? '我发布过的树洞内容' : 'Posts I have published'}</h1>
          <p className="myposts-hero__subtitle">{isZh ? '你发布的所有帖子' : 'All posts you have published'}</p>
        </div>
        <div className="myposts-hero__stat">
          <span className="myposts-hero__stat-value">{list.length}</span>
          <span className="myposts-hero__stat-label">{isZh ? '帖子' : 'Posts'}</span>
        </div>
      </section>

      <div className="myposts-panel">
        <ul className="myposts-list">
          {list.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default MyPosts;
