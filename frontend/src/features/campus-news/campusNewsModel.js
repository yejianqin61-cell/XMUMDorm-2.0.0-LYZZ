/**
 * UI model, independent of campus_posts.feed_tab and database IDs.
 * Future API adapters must explicitly provide category and interaction state.
 * @typedef {Object} CampusNews
 * @property {string} id Namespaced preview ID; never sent to campus-post APIs.
 * @property {'competition'|'lecture'|'campus-life'} category
 * @property {{scope:"all"|"colleges",collegeCodes:string[]}} audience
 * @property {string} title
 * @property {string} content
 * @property {{src:string, alt:string}[]} images
 * @property {string} createdAt ISO timestamp with timezone.
 * @property {number} likeCount
 * @property {number} commentCount
 * @property {number} favoriteCount
 * @property {boolean} liked
 * @property {boolean} favorited
 */
export const CAMPUS_NEWS_CATEGORIES = {
  competition: { name: '竞赛', nameEn: 'Competitions', avatar: '/default-avatar.svg', tone: 'competition' },
  lecture: { name: '讲座', nameEn: 'Lectures', avatar: '/default-avatar.svg', tone: 'lecture' },
  'campus-life': { name: '校园生活', nameEn: 'Campus life', avatar: '/default-avatar.svg', tone: 'campus-life' },
};

export const CAMPUS_NEWS_IMAGE_LIMIT = 10;

// Stable display codes are independent of translated names and future DB IDs.
export const CAMPUS_NEWS_COLLEGES = {
  computing: { name: '计算机学院', nameEn: 'School of Computing', collegeId: null },
};

export function normalizeAudience(audience) {
  if (!audience || !['all', 'colleges'].includes(audience.scope)) throw new Error('Explicit audience scope required');
  const codes = [...new Set(audience.collegeCodes || [])];
  if (audience.scope === 'all') {
    if (codes.length) throw new Error('All students and specific colleges are mutually exclusive');
    return { scope: 'all', collegeCodes: [] };
  }
  if (!codes.length || codes.some((code) => !CAMPUS_NEWS_COLLEGES[code])) throw new Error('Unknown or empty college audience');
  return { scope: 'colleges', collegeCodes: codes };
}

/** Future profile/API boundary: callers provide the approved ID-to-code mapping. */
export function audienceFromCollegeIds(collegeIds, codeByCollegeId) {
  return normalizeAudience({ scope: 'colleges', collegeCodes: collegeIds.map((id) => codeByCollegeId[String(id)]) });
}

/** Normalize presentation inputs; never infer categories from school/college. */
export function toCampusNewsViewModel(post) {
  if (!CAMPUS_NEWS_CATEGORIES[post.category]) throw new Error(`Unknown campus news category: ${post.category}`);
  const count = (value) => Math.max(0, Number(value) || 0);
  return {
    id: String(post.id), category: post.category, audience: normalizeAudience(post.audience),
    title: String(post.title ?? ''), content: String(post.content ?? ''),
    images: (post.images || []).slice(0, CAMPUS_NEWS_IMAGE_LIMIT).map((image) => ({ src: image.src, alt: image.alt || '' })),
    createdAt: post.createdAt,
    likeCount: count(post.likeCount), commentCount: count(post.commentCount), favoriteCount: count(post.favoriteCount),
    liked: Boolean(post.liked), favorited: Boolean(post.favorited),
  };
}

/** Real IDs and directory labels stay independent from the preview code map. */
export function toRealCampusNewsViewModel(post, colleges = []) {
  if (!/^[1-9]\d*$/.test(String(post.id)) || !CAMPUS_NEWS_CATEGORIES[post.category]) throw new Error('真实快讯 ID 或分类无效');
  if (post.lifecycleStatus !== 'published' || post.hiddenByAdmin || post.deletedAt) throw new Error('此快讯不可读取');
  const audience = post.audience;
  if (!['all','colleges'].includes(audience?.scope) || !Array.isArray(audience.collegeIds)
    || (audience.scope === 'all' ? audience.collegeIds.length > 0 : audience.collegeIds.length === 0)) throw new Error('快讯受众尚未补录');
  return {
    id: String(post.id), category: post.category, title: post.title, content: post.content,
    audience: { scope: audience.scope, colleges: audience.collegeIds.map(id => ({ id, name: colleges.find(c => c.id === id)?.name || `学院（${id}）` })) },
    createdAt: post.sourceKind === 'legacy' ? post.createdAt : post.publishedAt || post.createdAt,
    images: post.images.slice(0,10).map(image => {
      const src = image.url;
      if (typeof src !== 'string' || src.includes('\\') || !(src.startsWith('/') && !src.startsWith('//') || /^https?:\/\//i.test(src))) throw new Error('图片地址无效');
      return { src, alt: `${post.title} · 图片` };
    }),
    detailPath: `/about/campus/${post.id}`, real: true, interactions: post.interactions,
  };
}
