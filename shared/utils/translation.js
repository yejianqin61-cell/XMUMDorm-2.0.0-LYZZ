/**
 * 帖子 / 评论 / 点评「翻译」按钮的显示判定（像推特：语言和界面不一样才出现）。
 *
 * 只数两类字符：汉字与拉丁字母（英文、马来文都算拉丁）。表情、数字、标点不参与。
 * 一个汉字的信息量约等于一个英文单词的几个字母，所以汉字按 3 个字母计权。
 * - 中文界面：拉丁字母权重占比 > 60% → 显示（英文、马来文翻成中文）
 * - 英文界面：汉字权重占比 > 30% → 显示（中文、中英夹杂翻成英文）
 * 有效字符少于 4 个（「ok」「哈哈」之类）不显示，翻了也没意义。
 */
const HAN = /\p{Script=Han}/gu;
const LATIN = /[A-Za-zÀ-ɏ]/g;
const HAN_WEIGHT = 3;
const MIN_LETTERS = 4;

export function needsTranslation(text, uiLang) {
  if (typeof text !== 'string' || !text.trim()) return false;
  const han = (text.match(HAN) || []).length;
  const latin = (text.match(LATIN) || []).length;
  if (han + latin < MIN_LETTERS) return false;
  const weighted = han * HAN_WEIGHT + latin;
  return uiLang === 'en' ? (han * HAN_WEIGHT) / weighted > 0.3 : latin / weighted > 0.6;
}

/** 界面语言 → 翻译目标语言；只支持站点已有的两种界面语言。 */
export function translationTarget(uiLang) {
  return uiLang === 'en' ? 'en' : 'zh';
}
