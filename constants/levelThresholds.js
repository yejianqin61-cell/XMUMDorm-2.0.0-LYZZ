/** 累计经验达到阈值即为对应等级（Lv1 从 0 起） */
const LEVEL_THRESHOLDS = [0, 100, 300, 800, 1800, 4000, 8000];

const BADGES = {
  1: { key: 'freshman', emoji: '🌱', labelZh: '新生', labelEn: 'Freshman' },
  2: { key: 'explorer', emoji: '🧭', labelZh: '探索者', labelEn: 'Explorer' },
  3: { key: 'contributor', emoji: '✨', labelZh: '贡献者', labelEn: 'Contributor' },
  4: { key: 'campus_star', emoji: '⭐', labelZh: '校园达人', labelEn: 'Campus Star' },
  5: { key: 'senior', emoji: '🔥', labelZh: '资深成员', labelEn: 'Senior' },
  6: { key: 'legend', emoji: '👑', labelZh: '校园传奇', labelEn: 'Legend' },
};

/** 行为默认经验与每日上限（null = 无日上限） */
const EXP_ACTION_CONFIG = {
  login: { amount: 5, dailyCap: 5 },
  like: { amount: 1, dailyCap: 15 },
  comment: { amount: 5, dailyCap: 15 },
  post: { amount: 10, dailyCap: 15 },
  cafeteria_review: { amount: 10, dailyCap: 30 },
  quality_bonus: { amount: 5, dailyCap: 15 },
  post_popular_like: { amount: 20, dailyCap: null },
  post_popular_comment: { amount: 20, dailyCap: null },
  level_up: { amount: 0, dailyCap: null },
};

function getLevelByExp(exp) {
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

function getBadgeByLevel(level) {
  return BADGES[level] || BADGES[1];
}

function getExpProgress(exp) {
  const n = Math.max(0, Number(exp) || 0);
  const level = getLevelByExp(n);
  const currentMin = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextMin = level >= 6 ? LEVEL_THRESHOLDS[6] : (LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[6]);
  const span = Math.max(1, nextMin - currentMin);
  const inLevel = Math.min(span, Math.max(0, n - currentMin));
  return {
    level,
    exp: n,
    currentMin,
    nextMin,
    progress: level >= 6 && n >= LEVEL_THRESHOLDS[6] ? 1 : inLevel / span,
    progressText: `${inLevel}/${span}`,
  };
}

module.exports = {
  LEVEL_THRESHOLDS,
  BADGES,
  EXP_ACTION_CONFIG,
  getLevelByExp,
  getBadgeByLevel,
  getExpProgress,
};
