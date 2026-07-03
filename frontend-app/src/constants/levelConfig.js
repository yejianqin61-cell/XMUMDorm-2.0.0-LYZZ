/** 等级展示配置（与后端 constants/levelThresholds.js 对齐） */
export const LEVEL_THRESHOLDS = [0, 100, 300, 800, 1800, 4000, 8000];

export const LEVEL_BADGES = {
  1: { key: 'freshman', emoji: '🌱', labelZh: '新生', labelEn: 'Freshman' },
  2: { key: 'explorer', emoji: '🧭', labelZh: '探索者', labelEn: 'Explorer' },
  3: { key: 'contributor', emoji: '✨', labelZh: '贡献者', labelEn: 'Contributor' },
  4: { key: 'campus_star', emoji: '⭐', labelZh: '校园达人', labelEn: 'Campus Star' },
  5: { key: 'senior', emoji: '🔥', labelZh: '资深成员', labelEn: 'Senior' },
  6: { key: 'legend', emoji: '👑', labelZh: '校园传奇', labelEn: 'Legend' },
};

export function getLevelFromExp(exp) {
  const n = Math.max(0, Number(exp) || 0);
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 2; i >= 1; i -= 1) {
    if (n >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, 6);
}

export function getBadgeForLevel(level, isZh = true) {
  const b = LEVEL_BADGES[level] || LEVEL_BADGES[1];
  return { ...b, label: isZh ? b.labelZh : b.labelEn };
}

export function formatLevelLabel(level, isZh = true) {
  const b = getBadgeForLevel(level, isZh);
  return `Lv${level}`;
}

/** 经验规则（与后端 EXP_ACTION_CONFIG 对齐，供说明页展示） */
export const EXP_RULES = [
  { key: 'login', amount: 5, dailyCap: 5, labelZh: '每日登录', labelEn: 'Daily login' },
  { key: 'like', amount: 1, dailyCap: 15, labelZh: '点赞树洞/热搜帖', labelEn: 'Like posts (Tree Hole / Trending)' },
  { key: 'comment', amount: 5, dailyCap: 15, labelZh: '评论树洞/热搜帖（≥5 字）', labelEn: 'Comment (≥5 chars)' },
  { key: 'post', amount: 10, dailyCap: 15, labelZh: '发布树洞/热搜帖（≥10 字）', labelEn: 'Post (≥10 chars)' },
  { key: 'cafeteria_review', amount: 10, dailyCap: 30, labelZh: '食堂普通点评', labelEn: 'Canteen review' },
  { key: 'quality_bonus', amount: 5, dailyCap: 15, labelZh: '食堂优质点评加成', labelEn: 'Quality review bonus' },
  { key: 'post_popular_like', amount: 20, dailyCap: null, labelZh: '帖子获赞≥10（每帖一次）', labelEn: 'Post reaches 10 likes (once per post)' },
  { key: 'post_popular_comment', amount: 20, dailyCap: null, labelZh: '帖子评论≥10（每帖一次）', labelEn: 'Post reaches 10 comments (once per post)' },
];

/** 等级说明用：累计经验阈值行 */
export function getLevelRows(isZh = true) {
  return [1, 2, 3, 4, 5, 6].map((lv) => {
    const b = getBadgeForLevel(lv, isZh);
    return {
      level: lv,
      emoji: b.emoji,
      name: b.label,
      minExp: LEVEL_THRESHOLDS[lv - 1] ?? 0,
    };
  });
}
