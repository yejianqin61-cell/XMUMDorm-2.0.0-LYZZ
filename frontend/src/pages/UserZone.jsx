import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getProfile } from '../api/users';
import { getMyProductReviews } from '../api/canteen';
import { API_BASE_URL } from '../api/config';
import { getApiErrorMessage } from '../utils/apiError';
import EmptyState from '../components/EmptyState';
import './MyZone.css';

const TAB_POSTS = 'posts';
const TAB_REVIEWS = 'reviews';

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

/** 他人个人主页：与 MyZone 同布局，但只读（不能编辑资料/退出登录），展示该用户的帖子与点评 */
function UserZone() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = id ? parseInt(id, 10) : 0;

  const [activeTab, setActiveTab] = useState(TAB_POSTS);
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
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
    Promise.all([
      getProfile(userId, { page: 1, pageSize: 50 }),
      getMyProductReviews({ page: 1, pageSize: 50, userId }),
    ])
      .then(([profileData, reviewsData]) => {
        if (cancelled) return;
        const u = profileData?.user || null;
        setProfileUser(u ? { ...u, avatar: u.avatar ? prefixAvatar(u.avatar) : null } : null);
        const rawPosts = profileData?.posts ?? profileData?.postList ?? [];
        const postList = rawPosts.map((p) => ({
          ...p,
          author: u ? { ...u, avatar: u.avatar } : null,
        }));
        setPosts(postList);
        setReviews(reviewsData?.list ?? []);
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
  const reviewCount = reviews.length;
  const displayName = profileUser?.nickname ?? profileUser?.username ?? '未设置';

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
                  <strong>{postCount}</strong> 帖子
                </span>
                <span className="myzone-header-stat">
                  <strong>{reviewCount}</strong> 点评
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

      {/* Tab 栏：仅帖子 / 点评 */}
      <div className="myzone-tabs" role="tablist" aria-label="内容切换">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TAB_POSTS}
          className={`myzone-tab ${activeTab === TAB_POSTS ? 'active' : ''}`}
          onClick={() => setActiveTab(TAB_POSTS)}
        >
          帖子
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TAB_REVIEWS}
          className={`myzone-tab ${activeTab === TAB_REVIEWS ? 'active' : ''}`}
          onClick={() => setActiveTab(TAB_REVIEWS)}
        >
          点评
        </button>
      </div>

      {/* 内容区：帖子/点评网格，复用 MyZone 的网格样式组件结构（略简化为空态提示） */}
      <section className="myzone-content" role="tabpanel">
        {activeTab === TAB_POSTS && (
          <div className="myzone-grid-wrap">
            {posts.length === 0 ? (
              <EmptyState
                title="暂无帖子"
                description="该用户还没有发布帖子。"
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
        )}
        {activeTab === TAB_REVIEWS && (
          <div className="myzone-grid-wrap">
            {reviews.length === 0 ? (
              <EmptyState
                title="暂无点评"
                description="该用户还没有发表过食堂点评。"
              />
            ) : (
              <div className="myzone-grid myzone-grid-reviews">
                {reviews.map((r) => {
                  const cover = r.product_image || (r.images && r.images[0]?.url);
                  const imgUrl =
                    cover && typeof cover === 'string'
                      ? cover
                      : cover && cover.url
                      ? cover.url
                      : null;
                  return (
                    <Link
                      key={r.id}
                      to={`/eat/food/${r.product_id}`}
                      className="myzone-grid-item myzone-grid-item-review"
                    >
                      <div className="myzone-grid-item-media">
                        {imgUrl ? (
                          <img src={imgUrl} alt="" />
                        ) : (
                          <div className="myzone-grid-item-placeholder">⭐</div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default UserZone;

