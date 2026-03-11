import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getProfile } from '../api/users';
import { API_BASE_URL } from '../api/config';
import { getApiErrorMessage } from '../utils/apiError';
import EmptyState from '../components/EmptyState';
import './MyZone.css';

const TAB_POSTS = 'posts';

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

/** 他人个人主页：与 MyZone 同布局，但只读（不能编辑资料/退出登录），展示该用户的帖子与点评 */
function UserZone() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = id ? parseInt(id, 10) : 0;

  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError('用户不存在');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProfile(userId, { page: 1, pageSize: 50 })
      .then((profileData) => {
        if (cancelled) return;
        const u = profileData?.user || null;
        setProfileUser(u ? { ...u, avatar: u.avatar ? prefixAvatar(u.avatar) : null } : null);
        const rawPosts = profileData?.posts ?? profileData?.postList ?? [];
        const postList = rawPosts.map((p) => ({
          ...p,
          author: u ? { ...u, avatar: u.avatar } : null,
        }));
        setPosts(postList);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  if (!userId) {
    return (
      <div className="myzone-page">
        <EmptyState
          title="用户不存在"
          description="User not found"
          actionLabel="返回首页"
          actionTo="/"
        />
      </div>
    );
  }

  if (loading && !profileUser) {
    return (
      <div className="myzone-page">
        <p className="myzone-loading">加载中…</p>
      </div>
    );
  }

  if (error && !profileUser) {
    return (
      <div className="myzone-page">
        <p className="myzone-error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  const avatarBg = profileUser?.avatar ? prefixAvatar(profileUser.avatar) : '';
  const postCount = posts.length;
  const displayName = profileUser?.nickname ?? profileUser?.username ?? 'Not set';

  return (
    <div className="myzone-page">
      {/* 头部：头像 + 昵称 + 统计（只读，无编辑按钮/店铺入口） */}
      <header
        className="myzone-header"
        style={avatarBg ? { backgroundImage: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.75) 100%), url(${avatarBg})` } : undefined}
      >
        <div className="myzone-header-inner">
          <div className="myzone-header-top" aria-hidden />
          <div className="myzone-header-body">
            <div className="myzone-header-avatar-wrap" onClick={() => {}}>
              {profileUser?.avatar ? (
                <img src={profileUser.avatar} alt="" className="myzone-header-avatar" />
              ) : (
                <img src="/default-avatar.svg" alt="" className="myzone-header-avatar myzone-header-avatar-default" />
              )}
            </div>
            <div className="myzone-header-card">
              <p className="myzone-header-name">
                {displayName}
              </p>
              <div className="myzone-header-stats">
                <span className="myzone-header-stat">
                  <strong>{postCount}</strong> Posts
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <p className="myzone-error" role="alert">
          {error}
        </p>
      )}

      {/* Content area: posts grid (read-only) */}
      <section className="myzone-content" role="tabpanel">
        <div className="myzone-grid-wrap">
          {posts.length === 0 ? (
            <EmptyState
              title="No posts yet"
              description="This user has not posted anything yet."
            />
          ) : (
            <div className="myzone-grid">
              {posts.map((post) => (
                <Link key={post.id} to={`/post/${post.id}`} className="myzone-grid-item myzone-grid-item-post">
                  <div className="myzone-grid-item-media">
                    {post.images && post.images[0]?.url ? (
                      <img src={prefixAvatar(post.images[0].url)} alt="" />
                    ) : (
                      <div className="myzone-grid-item-placeholder">📝</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default UserZone;

