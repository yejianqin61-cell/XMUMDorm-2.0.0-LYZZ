import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import Button from './ui/Button';
import { isChunkLoadError, recoverFromChunkLoadError } from '@shared/utils/chunkLoadRecovery';

/**
 * 路由级错误边界 —— 懒加载路由 + Suspense 的兜底。
 *
 * 为什么必须有：仓库此前**没有任何 ErrorBoundary**（`App.jsx` 里也没有），
 * 于是任何一处渲染期抛错（包括「部署后旧 chunk 失效」导致的动态 import 失败）
 * 都会让 React 卸载整棵树 → 地址栏变了、页面全白、控制台一条 MRO。
 *
 * 行为分两类：
 *   - chunk 失效（部署换血）：静默自动重载一次（闸门见 shared/utils/chunkLoadRecovery），
 *     恢复不了才显示兜底 UI；
 *   - 其它渲染报错：直接显示兜底 UI，保留侧边导航，用户可点「重新加载」。
 */

function getSessionStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch (_) {
    return null;
  }
}

function reloadPage() {
  if (typeof window !== 'undefined') window.location.reload();
}

class RouteErrorBoundaryBase extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    recoverFromChunkLoadError(error, { storage: getSessionStorage(), reload: reloadPage });
  }

  componentDidUpdate(prevProps) {
    // 路由变了就把错误状态清掉，否则同一个位置（如 /eat/food/1 → /eat/food/2）会一直卡在兜底 UI
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  handleRetry() {
    // 用户手动重试：跳过「每会话一次」的闸门
    recoverFromChunkLoadError(this.state.error, {
      storage: getSessionStorage(),
      reload: reloadPage,
      force: true,
    });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunkFailed = isChunkLoadError(error);
    const message = (error && error.message) || String(error);

    return (
      <div className="route-error state-error" role="alert">
        <p className="route-error__title">
          {chunkFailed ? '页面资源已更新，需要重新加载' : '页面渲染失败'}
        </p>
        <p className="route-error__hint">
          {chunkFailed
            ? '站点刚发布了新版本，当前页面引用的旧资源已失效。重新加载即可恢复。'
            : '可以重新加载重试；若持续失败，请返回首页或稍后再试。'}
        </p>
        <div className="route-error__actions">
          <Button variant="primary" onClick={this.handleRetry}>重新加载</Button>
        </div>
        <details className="route-error__detail">
          <summary>错误详情</summary>
          <pre>{message}</pre>
        </details>
      </div>
    );
  }
}

export default function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <RouteErrorBoundaryBase resetKey={pathname}>{children}</RouteErrorBoundaryBase>;
}

export { RouteErrorBoundaryBase };
