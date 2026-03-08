import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../api/users';
import PostCard from '../components/PostCard';
import { API_BASE_URL } from '../api/config';
import './MyPosts.css';

/** 我的帖子列表：从 GET /api/users/:id/profile 获取当前用户的帖子 */
function MyPosts() {
  const { user, isLoggedIn, refreshUser } = useAuth();
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
        if (!cancelled) setError(err.message || '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isLoggedIn, user?.id]);

  if (!isLoggedIn) {
    return (
      <div className="myposts-page">
        <p className="myposts-empty state-empty">请先登录后查看我的帖子。Please log in to view your posts.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="myposts-page">
        <p className="myposts-loading state-loading">加载中…</p>
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
        <p className="myposts-empty state-empty">暂无帖子，去首页发一条吧 No posts yet. Post one on the home feed.</p>
      </div>
    );
  }

  return (
    <ul className="myposts-list">
      {list.map((post) => (
        <li key={post.id}>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  );
}

export default MyPosts;
