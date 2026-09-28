/**
 * 万能墙单篇卡片 — M09
 *
 * 设计文档 §7.5。承载三款版式的正文 + 匿名作者行 + 互动行。
 * 身份信息**不可能**出现在这里：后端不下发，卡片也不接收。
 */
import { useLanguage } from '../../context/LanguageContext';
import { formatPostTime } from '@shared/utils/formatTime';
import { getTemplate } from '@shared/constants/confessionTemplates';
import ReportButton from '../ReportButton';
import ConfessionBody from './ConfessionBody';

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21.2l7.7-7.8 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-5.2A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.confession - 后端匿名投影后的帖子对象
 * @param {boolean} [props.isLoggedIn]
 * @param {boolean} [props.isAdmin]
 * @param {Function} [props.onToggleLike]
 * @param {Function} [props.onOpenComments]
 * @param {Function} [props.onDelete]
 * @param {boolean} [props.likePending]
 * @param {boolean} [props.commentsOpen] - 本篇的评论弹窗当前是否展开（仅用于无障碍状态播报）
 */
export default function ConfessionCard({
  confession,
  isLoggedIn = false,
  isAdmin = false,
  onToggleLike,
  onOpenComments,
  onDelete,
  likePending = false,
  commentsOpen = false,
}) {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  if (!confession) return null;

  const template = getTemplate(confession.template_key);
  const anonymousLabel = isZh ? '匿名' : 'Anonymous';
  const templateLabel = isZh ? template.labelZh : template.labelEn;
  // 只有作者本人或管理员能看到删除入口；viewer_is_author 由后端按真实身份计算
  const canDelete = Boolean(onDelete) && (confession.viewer_is_author || isAdmin);

  return (
    <article className={`cf-card cf-card--${template.key}`} data-confession-id={confession.id}>
      <span className="cf-card__template-tag">{templateLabel}</span>

      <ConfessionBody
        templateKey={confession.template_key}
        content={confession.content}
        anonymousLabel={anonymousLabel}
      />

      <div className="cf-card__meta">
        <span className="cf-card__author">{anonymousLabel}</span>
        <span className="cf-card__dot" aria-hidden="true">·</span>
        <time className="cf-card__time" dateTime={confession.created_at}>
          {formatPostTime(confession.created_at, { locale: isZh ? 'zh' : 'en' })}
        </time>
      </div>

      <div className="cf-card__actions">
        <button
          type="button"
          className={`cf-action cf-action--like${confession.liked ? ' is-active' : ''}`}
          onClick={() => onToggleLike && onToggleLike(confession)}
          disabled={likePending}
          aria-pressed={Boolean(confession.liked)}
          aria-label={isZh ? '点赞' : 'Like'}
        >
          <HeartIcon filled={Boolean(confession.liked)} />
          <span className="cf-action__count">{confession.like_count || 0}</span>
        </button>

        <button
          type="button"
          className="cf-action cf-action--comment"
          onClick={() => onOpenComments && onOpenComments()}
          aria-label={isZh ? '查看评论' : 'View comments'}
          aria-haspopup="dialog"
          aria-expanded={commentsOpen}
        >
          <CommentIcon />
          <span className="cf-action__count">{confession.comment_count || 0}</span>
        </button>

        {canDelete && (
          <button
            type="button"
            className="cf-action cf-action--danger"
            onClick={() => onDelete && onDelete(confession)}
            aria-label={isZh ? '删除' : 'Delete'}
          >
            <TrashIcon />
          </button>
        )}

        <span className="cf-card__actions-spacer" />

        {isLoggedIn && (
          <ReportButton
            target_type="confession"
            target_id={confession.id}
            className="cf-action cf-action--report"
            iconOnly
          />
        )}
      </div>
    </article>
  );
}
