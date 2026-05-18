import { getBadgeForLevel } from '../constants/levelConfig';
import './UserLevelBadge.css';

/**
 * @param {{ level?: number, badgeEmoji?: string, size?: 'sm'|'md', isZh?: boolean, className?: string }} props
 */
export default function UserLevelBadge({ level = 1, badgeEmoji, size = 'sm', isZh = true, className = '' }) {
  const lv = Math.min(6, Math.max(1, Number(level) || 1));
  const badge = getBadgeForLevel(lv, isZh);
  const emoji = badgeEmoji || badge.emoji;

  return (
    <span
      className={`user-level-badge user-level-badge--${size} ${className}`.trim()}
      title={badge.label}
    >
      <span className="user-level-badge-emoji" aria-hidden>{emoji}</span>
      <span className="user-level-badge-lv">Lv{lv}</span>
    </span>
  );
}
