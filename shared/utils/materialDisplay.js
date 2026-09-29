/**
 * 学习资料 · 展示格式化纯函数（Web / RN 共用，可单测）
 */

/** 人类可读体积 */
export function humanSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** YYYY-MM-DD；非法输入返回空串（不抛错，避免脏数据把页面搞崩） */
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * 课程展示名。
 * 课程身份 = 名字 + 讲师；伪课程（id=1）显示为「通用 / 其他」。
 */
export function courseLabel(item, isZh = true, pseudoCourseId = 1) {
  if (!item) return '';
  if (Number(item.courseId) === Number(pseudoCourseId)) {
    return isZh ? '通用 / 其他' : 'General';
  }
  const name = item.courseName || `c${item.courseId}`;
  return item.lecturer ? `${name} · ${item.lecturer}` : name;
}

/** 把逗号（中英文）分隔的标签串切成数组，去空去重 */
export function parseTagInput(raw) {
  const list = Array.isArray(raw) ? raw : String(raw == null ? '' : raw).split(/[,，]/);
  const out = [];
  for (const t of list) {
    const s = String(t).trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}
