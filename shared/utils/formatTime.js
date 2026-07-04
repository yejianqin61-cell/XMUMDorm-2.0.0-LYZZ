/**
 * 帖子/评论时间展示
 * @param {string|Date} createdAt - ISO 字符串或 Date
 * @param {Object} [opts]
 * @param {boolean} [opts.absolute] - 为 true 时返回绝对时间，否则返回相对时间
 * @param {'zh'|'en'} [opts.locale='zh'] - 语言（'zh' 中文, 'en' 英文）
 */
export function formatPostTime(createdAt, opts = {}) {
  // Backward-compat: second arg used to be a boolean `absolute`
  const { absolute = false, locale = 'zh' } =
    typeof opts === 'boolean' ? { absolute: opts, locale: 'zh' } : opts;

  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  const localeStr = locale === 'en' ? 'en-US' : 'zh-CN';

  if (absolute) {
    return date.toLocaleString(localeStr, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  const isZh = locale === 'zh';

  if (diffMin < 1) return isZh ? '刚刚' : 'just now';
  if (diffMin < 60) return isZh ? `${diffMin} 分钟前` : `${diffMin} min ago`;
  if (diffHour < 24) return isZh ? `${diffHour} 小时前` : `${diffHour} h ago`;
  if (diffDay === 1) return isZh ? '昨天' : 'yesterday';
  if (diffDay < 7) return isZh ? `${diffDay} 天前` : `${diffDay} days ago`;
  return date.toLocaleDateString(localeStr, { month: 'short', day: '2-digit' });
}
