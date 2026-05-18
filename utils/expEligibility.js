/** 计数字符（去 HTML 后长度，中英文均计） */
function textCharCount(raw) {
  const s = String(raw || '').replace(/\s+/g, '').trim();
  return s.length;
}

function isPostContentEligible(title, content, minLen = 10) {
  const combined = [title, content].filter(Boolean).join('');
  return textCharCount(combined) >= minLen;
}

function isCommentEligible(content, minLen = 5) {
  return textCharCount(content) >= minLen;
}

function isQualityReview(content, hasImages) {
  if (hasImages) return true;
  return textCharCount(content) >= 20;
}

module.exports = {
  textCharCount,
  isPostContentEligible,
  isCommentEligible,
  isQualityReview,
};
