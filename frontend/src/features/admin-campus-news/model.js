export const CATEGORIES = [
  { code: 'competition', name: 'Competition · 竞赛' },
  { code: 'lecture', name: 'Lecture · 讲座' },
  { code: 'campus-life', name: 'Campus Life · 校园生活' },
];
export const STATUSES = { draft: '草稿', published: '已发布', withdrawn: '已撤回' };
export const MAX_IMAGES = 10;
export const MAX_TITLE = 200;
// Client-side ceiling only; the future upload API must enforce its own limits.
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const EMPTY_FORM = { title: '', content: '', category: '', audienceScope: 'all', collegeIds: [], images: [] };

export function toForm(news) {
  return news ? {
    title: news.title, content: news.content, category: news.category || '',
    audienceScope: news.audience.scope, collegeIds: [...news.audience.collegeIds],
    images: news.images.map(image => ({ ...image })),
  } : { ...EMPTY_FORM, collegeIds: [], images: [] };
}

export function validateForm(form, publish = false) {
  const errors = [];
  if (form.title.length > MAX_TITLE) errors.push(`标题不能超过 ${MAX_TITLE} 字。`);
  if (form.content.length > 50000) errors.push('正文不能超过 50000 字。');
  if (form.category && !CATEGORIES.some(c => c.code === form.category)) errors.push('请选择有效分类。');
  if (!['all', 'colleges'].includes(form.audienceScope)) errors.push('请选择有效受众。');
  if (form.audienceScope === 'all' && form.collegeIds.length) errors.push('全体学生与指定学院不能同时选择。');
  if (form.images.length > MAX_IMAGES) errors.push('最多选择十张图片。');
  if (form.images.some(image => !image.id || image.file)) errors.push('请先成功上传所有图片，或移除尚未上传的图片。');
  if (publish) {
    if (!form.title.trim()) errors.push('发布前请填写标题。');
    if (!form.content.trim()) errors.push('发布前请填写正文。');
    if (!form.category) errors.push('发布前请选择分类。');
    if (form.audienceScope === 'colleges' && !form.collegeIds.length) errors.push('发布前请至少选择一个学院。');
  }
  return errors;
}

export function payloadFor(form, expectedRevision) {
  return {
    title: form.title, content: form.content, category: form.category || null,
    audience: { scope: form.audienceScope, collegeIds: form.audienceScope === 'all' ? [] : [...form.collegeIds] },
    imageAssetIds: form.images.map(image => image.id),
    ...(expectedRevision === undefined ? {} : { expectedRevision }),
  };
}

export function validateFiles(files, count) {
  if (count + files.length > MAX_IMAGES) return '最多选择十张图片，请减少本次选择数量。';
  if (files.some(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type))) return '只支持 JPEG、PNG 和 WebP 图片。';
  if (files.some(f => f.size > MAX_IMAGE_BYTES)) return '单张图片不能超过 8 MiB（后端限制仍需对齐）。';
  return '';
}

export function moveImage(images, index, offset) {
  const target = index + offset;
  if (target < 0 || target >= images.length) return images;
  const result = [...images];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

export function canAct(news, action) {
  if (!news || news.deletedAt || news.sourceKind !== 'news') return false;
  if (action === 'edit') return Object.hasOwn(STATUSES, news.lifecycleStatus);
  if (news.hiddenByAdmin) return false;
  return action === 'publish' ? ['draft', 'withdrawn'].includes(news.lifecycleStatus)
    : action === 'withdraw' && news.lifecycleStatus === 'published';
}

export function errorMessage(error) {
  if ([401, 403].includes(error?.status)) return '管理员身份已失效或权限不足，请重新登录并确认当前管理员权限。';
  if (error?.status === 409) return '其他管理员已修改此快讯。请刷新并核对最新版本，当前修改未覆盖服务器内容。';
  if ([404, 405, 501].includes(error?.status)) return '校园快讯管理接口尚未接入或记录不存在。本次操作未获成功确认。';
  return error?.message || '请求失败，请稍后重试。本次操作未获成功确认。';
}

export function safeImageUrl(url) {
  if (typeof url !== 'string') return '';
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) return url;
  try { const parsed = new URL(url); return ['http:', 'https:', 'blob:'].includes(parsed.protocol) ? url : ''; }
  catch { return ''; }
}
