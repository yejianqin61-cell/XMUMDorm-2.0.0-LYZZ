import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './MyZone.css';

/** 我的：头像+用户名邮箱，我的帖子，我的点评，本周点评数；商家显示管理店铺；登录后显示退出登录 */
function MyZone() {
  const { isLoggedIn, isMerchant, displayName, displayAvatar, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleBar1Click = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: '/myzone' } } });
      return;
    }
    navigate('/myzone/profile');
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="myzone-page">
      <button type="button" className="myzone-bar myzone-bar-1" onClick={handleBar1Click}>
        <div className="myzone-avatar-wrap">
          {displayAvatar ? (
            <img src={displayAvatar} alt="" className="myzone-avatar" />
          ) : (
            <img src="/default-avatar.svg" alt="" className="myzone-avatar myzone-avatar-default" />
          )}
        </div>
        <div className="myzone-bar1-text">
          <p className="myzone-username">{isLoggedIn ? displayName : '点击登录 Tap to Login'}</p>
          <p className="myzone-email">{isLoggedIn ? (user?.email || '—') : '登录后同步信息 Sync after login'}</p>
        </div>
      </button>

      <Link to="/myzone/posts" className="myzone-bar myzone-bar-2">
        <span className="myzone-bar-label">我的帖子 My Posts</span>
      </Link>

      <Link to="/myzone/reviews" className="myzone-bar myzone-bar-3">
        <span className="myzone-bar-label">我的点评 My Reviews</span>
      </Link>

      <div className="myzone-bar myzone-bar-4">
        <span className="myzone-bar-label">本周点评数 Weekly Reviews</span>
        <span className="myzone-bar-value">0</span>
      </div>

      {isMerchant && (
        <Link to="/merchant/manage" className="myzone-bar myzone-bar-merchant">
          <span className="myzone-bar-label">管理店铺 Manage Store</span>
        </Link>
      )}

      {isLoggedIn && (
        <button type="button" className="myzone-bar myzone-bar-logout" onClick={handleLogout}>
          <span className="myzone-bar-label myzone-bar-label-logout">退出登录 Log out</span>
        </button>
      )}
    </div>
  );
}

export default MyZone;
