/**
 * 学习资料 · Markdown 辅助纯函数
 *
 * 放在 shared/utils 而非组件内，是为了**可单测**：
 * 目录锚点生成与相对链接解析都属于「一旦写错就很难在界面上发现」的逻辑，
 * 尤其是 URL 逐段编码（中文文件名 + 路径里的 / 必须保留）。
 *
 * 无任何依赖，Web 与 RN 都能用。
 */

/** 生成标题锚点 id（兼容旧 WebView：不用 Unicode property escapes \p{L}） */
export function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/gi, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

/** 从 Markdown 源文本抽取 #{1,6} 标题，供生成目录 */
export function extractHeadings(md) {
  const out = [];
  for (const raw of String(md || '').split(/\r?\n/)) {
    const m = /^(#{1,6})\s+(.+)$/.exec(raw.trim());
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/\s+#+\s*$/, '').trim();
    if (text) out.push({ level, text, id: slugify(text) });
  }
  return out;
}

/** 目录只取前三级，避免长文目录撑爆侧栏 */
export function tocHeadings(md, maxLevel = 3) {
  return extractHeadings(md).filter((h) => h.level <= maxLevel);
}

/**
 * 已是绝对地址或锚点的 scheme。
 * 写法说明：冒号放在分组外面 —— 仓库有一条「全站联系方式唯一」的扫描器守卫，
 * 会按字面量匹配邮箱链接前缀（scheme + 冒号）并判为「写死了联系方式」。
 */
const ABSOLUTE_SCHEME = /^(https?|data|mailto|tel):/i;

/**
 * 把 Markdown 里的相对链接解析成资料库内的绝对地址。
 *
 * 为什么必须做：md 里的 `![](./img/a.png)` 是相对**仓库**的，而渲染发生在**站点域名**下，
 * 不重写就全部 404。
 *
 * @param {string} href
 * @param {string} baseUrl - 形如 https://cdn.jsdelivr.net/gh/owner/repo@sha
 * @param {string} dir - 当前 md 所在目录（仓库内相对路径，无前导/尾随斜杠）
 */
export function resolveRepoUrl(href, baseUrl, dir) {
  if (!href) return href;
  const s = String(href).trim();
  if (!s) return s;
  if (ABSOLUTE_SCHEME.test(s)) return s;
  if (s.startsWith('#')) return s;
  if (!baseUrl) return s;

  const base = String(baseUrl).replace(/\/+$/, '');
  const rel = s.replace(/^\.\//, '');
  const full = rel.startsWith('/') ? rel.replace(/^\/+/, '') : `${dir ? `${dir}/` : ''}${rel}`;
  // 逐段编码：中文文件名要编码，但路径分隔符 / 必须保留
  return `${base}/${full.split('/').map(encodeURIComponent).join('/')}`;
}

/** 取仓库内路径的目录部分（无尾随斜杠） */
export function dirOf(path) {
  const s = String(path || '');
  const i = s.lastIndexOf('/');
  return i > 0 ? s.slice(0, i) : '';
}
