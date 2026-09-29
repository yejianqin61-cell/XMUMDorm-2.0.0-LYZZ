/**
 * ============================================
 * 学习资料 · 规则单一来源（前端 / RN / 后端共用）
 * ============================================
 * 这是**唯一的权威定义**：后端校验、前端表单校验、RN 端展示都读这一份。
 *
 * ⚠️ 同步注意：还有一个「独立实现」在**资料库仓库**里
 *    （materials repo: .github/scripts/lib/rules.mjs）。
 *    那是故意的 —— 校验器与生成器共享实现等于共享 bug。
 *    改动本文件的枚举/上限时，必须同步改那边。
 *
 * 本文件是 ESM。后端通过 require() 读取（项目已有先例：
 * routes/confessions.js → shared/utils/nestComments.js），
 * 这依赖 Node 的 require(ESM) 能力（Node ≥ 22.12 默认开启）。
 */

/** index.json 数据结构版本 */
export const SCHEMA_VERSION = 2;

/* ------------------------------------------------------------------ *
 * 第一层：文件类型
 * ------------------------------------------------------------------ */
export const TYPES = ['notes', 'lecture', 'exam', 'answer', 'other'];

export const TYPE_META = {
  notes: { labelZh: '笔记', labelEn: 'Notes', emoji: '📝' },
  lecture: { labelZh: '课件', labelEn: 'Lecture', emoji: '📊' },
  exam: { labelZh: '试题', labelEn: 'Exam', emoji: '📄' },
  answer: { labelZh: '答案', labelEn: 'Answers', emoji: '✅' },
  other: { labelZh: '其他', labelEn: 'Other', emoji: '📦' },
};

/* ------------------------------------------------------------------ *
 * 第三层 b：考试节点（null = 整门课/无）
 * ------------------------------------------------------------------ */
export const EXAM_NODES = ['midterm', 'final', 'quiz', 'assignment', 'monthly'];

export const EXAM_NODE_META = {
  midterm: { labelZh: '期中', labelEn: 'Midterm' },
  final: { labelZh: '期末', labelEn: 'Final' },
  quiz: { labelZh: '平时测验', labelEn: 'Quiz' },
  assignment: { labelZh: '作业', labelEn: 'Assignment' },
  monthly: { labelZh: '月考', labelEn: 'Monthly test' },
};

/* ------------------------------------------------------------------ *
 * 试题来源（仅 type=exam 允许非 null）
 * ------------------------------------------------------------------ */
export const SOURCES = ['official', 'recalled'];

export const SOURCE_META = {
  official: { labelZh: '官方', labelEn: 'Official' },
  recalled: { labelZh: '回忆版', labelEn: 'Recalled' },
};

/* ------------------------------------------------------------------ *
 * 体积上限
 * ------------------------------------------------------------------ */
/**
 * 20 MiB。**实测**：jsDelivr 对 GitHub 源的上限恰为 20 MiB（含），
 * 21 MiB 返回 403 "File size exceeded the configured limit of 20 MB."
 * 即本上限与 CDN 上限「零余量压线」—— 超限内容仍可下载（raw 兜底），
 * 但无法在线预览。详见 Module10 设计文档 §3.4。
 */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** 资料库材料总量上限（GitHub 官方建议 < 1GB） */
export const MAX_REPO_BYTES = 1024 * 1024 * 1024;

/* ------------------------------------------------------------------ *
 * 字段长度
 * ------------------------------------------------------------------ */
export const MAX_TITLE_LEN = 100;
export const MIN_TITLE_LEN = 2;
export const MAX_DESCRIPTION_LEN = 300;
export const MAX_LESSON_TITLE_LEN = 64;
export const MAX_TAGS = 5;
export const MAX_TAG_LEN = 16;
export const MAX_COURSE_NAME_LEN = 180;
export const MAX_LECTURER_LEN = 120;
export const MAX_COURSE_CODE_LEN = 32;
export const MAX_SEMESTER_LEN = 16;
export const MAX_PATH_LEN = 512;
export const MAX_FILENAME_LEN = 200;

/* ------------------------------------------------------------------ *
 * 扩展名
 * ------------------------------------------------------------------ */
/** 允许的材料扩展名 → index.json 的 kind（前端据此选渲染器） */
export const EXT_KIND = {
  md: 'markdown',
  markdown: 'markdown',
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  zip: 'archive',
  docx: 'document',
  pptx: 'document',
  xlsx: 'document',
  txt: 'document',
};

export const ALLOWED_EXT = Object.keys(EXT_KIND);

/** 渲染类型 */
export const KINDS = ['markdown', 'pdf', 'image', 'archive', 'document'];

/**
 * 永久黑名单（纵深防御）
 *
 * 即使将来放宽白名单，也绝不能出现「会在浏览器里执行」的文件：
 * 资料库是公开仓库，HTML/SVG 被直链打开即等同于在 *.github.io 源上执行脚本，
 * 而我们无法通过响应头（CSP / nosniff）缓解。
 */
export const BLOCKED_EXT = [
  // 浏览器会执行
  'html', 'htm', 'shtml', 'xhtml', 'xht', 'svg', 'svgz', 'js', 'mjs', 'cjs',
  'xml', 'xsl', 'xslt', 'xsd', 'rss', 'atom',
  // 动态页面 / 配置
  'hta', 'htc', 'jsp', 'asp', 'aspx', 'php', 'phtml', 'cgi',
  // 可执行 / 脚本
  'exe', 'dll', 'bat', 'cmd', 'com', 'scr', 'msi', 'ps1', 'psm1',
  'sh', 'bash', 'zsh', 'py', 'rb', 'pl', 'jar', 'apk', 'app', 'dmg', 'vbs',
];

/* ------------------------------------------------------------------ *
 * 路径与命名
 * ------------------------------------------------------------------ */
/** 材料路径：c<courseId>/<type>/<filename> */
export const MATERIAL_PATH_RE = /^c(\d+)\/(notes|lecture|exam|answer|other)\/(.+)$/;

/**
 * 文件名禁用字符（会破坏 CDN URL，或被 shell / 正则误解析）
 * 允许：中日韩文字、字母、数字、`-` `_` `.` 空格
 */
export const FORBIDDEN_NAME_CHARS = /[#?%&=+:;,@$!*'"()[\]{}|\\<>^~`\u0000-\u001f\u007f]/;

/** 「通用 / 其他」伪课程的保留 id（承接不属于任何课程的资料） */
export const PSEUDO_COURSE_ID = 1;
export const PSEUDO_COURSE_NAME = '通用 / 其他';

/* ------------------------------------------------------------------ *
 * 纯函数
 * ------------------------------------------------------------------ */

/** 取小写扩展名（不含点）；无扩展名返回 '' */
export function extOf(filename) {
  const s = String(filename || '');
  const i = s.lastIndexOf('.');
  if (i <= 0) return '';
  return s.slice(i + 1).toLowerCase();
}

/** 扩展名 → kind；未知扩展名返回 null */
export function kindOf(filename) {
  return EXT_KIND[extOf(filename)] || null;
}

/** 该扩展名是否允许上传 */
export function isAllowedExt(ext) {
  const e = String(ext || '').toLowerCase().replace(/^\./, '');
  if (!e) return false;
  if (BLOCKED_EXT.includes(e)) return false;
  return ALLOWED_EXT.includes(e);
}

/** 路径是否为材料文件 */
export function isMaterialPath(p) {
  return MATERIAL_PATH_RE.test(String(p || ''));
}

/** 构造仓库内路径 */
export function buildMaterialPath(courseId, type, filename) {
  return `c${courseId}/${type}/${filename}`;
}

/**
 * URL 路径逐段编码（中文文件名必须编码；不能整体 encodeURIComponent，
 * 否则 `/` 会被编成 %2F）
 */
export function encodeCdnPath(p) {
  return String(p || '').split('/').map(encodeURIComponent).join('/');
}

/** 拼接完整 CDN 地址 */
export function buildCdnUrl(baseUrl, path) {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  return `${base}/${encodeCdnPath(path)}`;
}
