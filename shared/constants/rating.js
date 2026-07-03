/** 点评星级 1–5 的展示文案（与后端一致） */
export const RATING_LABELS = {
  1: '拉完了 just soso',
  2: 'NPC ordinary',
  3: '顶级 excellent',
  4: '人上人 great',
  5: '夯爆了 amazing',
};

/** 后端枚举档位文本（中文）→ 双语展示 */
export const RATING_LABELS_BY_TEXT = {
  '拉完了': '拉完了 just soso',
  NPC: 'NPC ordinary',
  '顶级': '顶级 excellent',
  '人上人': '人上人 great',
  '夯爆了': '夯爆了 amazing',
};

/**
 * 统一格式化评级标签（支持 number 1-5 或中文档位文本）
 * @param {number|string|null|undefined} rating
 */
export function formatRatingLabel(rating) {
  if (rating == null) return '';
  if (typeof rating === 'number') return RATING_LABELS[rating] ?? String(rating);
  const s = String(rating).trim();
  return RATING_LABELS_BY_TEXT[s] ?? s;
}
