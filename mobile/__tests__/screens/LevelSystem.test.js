/**
 * 等级系统测试
 * 覆盖：等级计算、EXP进度、徽章映射、每日上限、EXP反馈
 */
const LEVEL_THRESHOLDS = [0, 100, 300, 800, 1800, 4000, 8000];

const BADGES = {
  1: { emoji: '🌱', label: '新生' },
  2: { emoji: '🧭', label: '探索者' },
  3: { emoji: '✨', label: '贡献者' },
  4: { emoji: '⭐', label: '校园达人' },
  5: { emoji: '🔥', label: '资深成员' },
  6: { emoji: '👑', label: '校园传奇' },
};

const EXP_RULES = {
  login: { amount: 5, dailyCap: 5 },
  like: { amount: 1, dailyCap: 15 },
  comment: { amount: 5, dailyCap: 15 },
  post: { amount: 10, dailyCap: 30 },
  cafeteria_review: { amount: 10, dailyCap: 30 },
  quality_bonus: { amount: 5, dailyCap: 15 },
  post_popular_like: { amount: 20, dailyCap: null },
};

function getLevelByExp(exp) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_THRESHOLDS[i]) { level = i + 1; break; }
  }
  return Math.min(level, 6);
}

function getExpProgress(exp) {
  const level = getLevelByExp(exp);
  const currentMin = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextMin = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[level - 1] * 2;
  const progress = nextMin > currentMin ? (exp - currentMin) / (nextMin - currentMin) : 1;
  return { level, exp, currentMin, nextMin, progress: Math.min(1, Math.max(0, progress)) };
}

function getBadgeForLevel(level) { return BADGES[level] || BADGES[1]; }

function formatLevelLabel(level) { return `Lv.${level}`; }

function calcDailyRemaining(todayUsed, cap) {
  if (cap === null) return Infinity;
  return Math.max(0, cap - (todayUsed || 0));
}

function shouldShowExpFeedback(expResult) {
  return !!(expResult && (expResult.delta !== 0 || expResult.levelUp));
}

describe('等级 — 计算', () => {
  it('1. 0 EXP → Lv.1', () => { expect(getLevelByExp(0)).toBe(1); });
  it('2. 99 EXP → Lv.1', () => { expect(getLevelByExp(99)).toBe(1); });
  it('3. 100 EXP → Lv.2', () => { expect(getLevelByExp(100)).toBe(2); });
  it('4. 300 EXP → Lv.3', () => { expect(getLevelByExp(300)).toBe(3); });
  it('5. 800 → Lv.4', () => { expect(getLevelByExp(800)).toBe(4); });
  it('6. 1800 → Lv.5', () => { expect(getLevelByExp(1800)).toBe(5); });
  it('7. 4000 → Lv.6', () => { expect(getLevelByExp(4000)).toBe(6); });
  it('8. 8000+ → Lv.6 (上限)', () => { expect(getLevelByExp(99999)).toBe(6); });
});

describe('等级 — EXP 进度', () => {
  it('9. 50 EXP → Lv.1 50%', () => {
    const p = getExpProgress(50);
    expect(p.level).toBe(1);
    expect(p.progress).toBeCloseTo(0.5);
  });
  it('10. 200 EXP → Lv.2 50%', () => {
    const p = getExpProgress(200);
    expect(p.level).toBe(2);
    expect(p.progress).toBeCloseTo(0.5);
  });
  it('11. 0 EXP → progress 0', () => {
    expect(getExpProgress(0).progress).toBe(0);
  });
  it('12. 满级 → progress 1', () => {
    expect(getExpProgress(8000).progress).toBe(1);
  });
});

describe('等级 — 徽章', () => {
  it('13. Lv.1 → 🌱 新生', () => {
    expect(getBadgeForLevel(1).emoji).toBe('🌱');
    expect(getBadgeForLevel(1).label).toBe('新生');
  });
  it('14. Lv.6 → 👑 校园传奇', () => {
    expect(getBadgeForLevel(6).emoji).toBe('👑');
    expect(getBadgeForLevel(6).label).toBe('校园传奇');
  });
  it('15. 未知等级 → 回退 Lv.1', () => {
    expect(getBadgeForLevel(99).emoji).toBe('🌱');
  });
});

describe('等级 — 标签', () => {
  it('16. formatLevelLabel', () => {
    expect(formatLevelLabel(1)).toBe('Lv.1');
    expect(formatLevelLabel(6)).toBe('Lv.6');
  });
});

describe('等级 — 每日上限', () => {
  it('17. 有剩余', () => { expect(calcDailyRemaining(10, 15)).toBe(5); });
  it('18. 已满', () => { expect(calcDailyRemaining(15, 15)).toBe(0); });
  it('19. 无上限', () => { expect(calcDailyRemaining(100, null)).toBe(Infinity); });
  it('20. 0 使用', () => { expect(calcDailyRemaining(0, 5)).toBe(5); });
});
