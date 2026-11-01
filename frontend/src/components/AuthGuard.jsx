import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContextState';
import { loginPath } from '../utils/loginReturn';

/**
 * 未登录且未点击过「暂不登录」时跳转到登录页；否则渲染子组件。
 */
function AuthGuard({ children }) {
  const { isLoggedIn, hasSkippedLogin } = useAuth();
  const location = useLocation();

  if (isLoggedIn) return children;
  if (hasSkippedLogin()) return children;

  return <Navigate to={loginPath(location)} replace state={{ from: location }} />;
}

export default AuthGuard;
