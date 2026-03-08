import { Link } from 'react-router-dom';
import './EmptyState.css';

/**
 * 统一空状态：无数据时展示标题、描述与可选操作
 * @param {string} title 主文案，如「暂无帖子」
 * @param {string} [description] 副文案，如「去发布第一条吧」
 * @param {string} [actionLabel] 操作按钮文案，如「去发布第一条吧 →」
 * @param {string} [actionTo] 使用 React Router Link 时的 to
 * @param {string} [actionHref] 使用 <a> 时的 href
 * @param {Function} [onActionClick] 点击操作（与 actionTo/actionHref 二选一或配合 actionTo 用于额外逻辑）
 */
function EmptyState({ title, description, actionLabel, actionTo, actionHref, onActionClick }) {
  const hasAction = actionLabel && (actionTo != null || actionHref != null || onActionClick);

  return (
    <div className="empty-state" role="status" aria-label={title}>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {hasAction && (
        <div className="empty-state-action">
          {actionTo != null ? (
            <Link to={actionTo} className="empty-state-btn" onClick={onActionClick}>
              {actionLabel}
            </Link>
          ) : actionHref != null ? (
            <a href={actionHref} className="empty-state-btn" onClick={onActionClick}>
              {actionLabel}
            </a>
          ) : (
            <button type="button" className="empty-state-btn" onClick={onActionClick}>
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
