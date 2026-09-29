/**
 * ============================================
 * 学习资料 · 上传校验
 * ============================================
 * 职责：把「一个上传请求」变成「一份可信的落库数据」，或在任何环节失败时
 * 抛出带 code 的 MaterialError。路由层只负责 catch 并转成 HTTP 响应。
 *
 * 校验顺序（任一失败即拒绝，见需求 FR-07）：
 *   1. 文件存在且非空
 *   2. 扩展名在白名单内（服务端强制，不信任前端）
 *   3. 体积 ≤ 20MiB
 *   4. **魔数嗅探**：真实类型必须与扩展名相符（防「.exe 改名 .pdf」）
 *   5. 文件名安全化（字符集 / 长度 / 路径分隔符）
 *   6. 元数据字段校验（标题 / 类型 / 课时 / 考试节点 / 来源 / 标签 …）
 *   7. 敏感词（**仅标题 / 简介 / 课时标题 / 标签**；文件正文按政策不扫，见 assertNoSensitive）
 *   8. 软去重（同 sha 且同 课程+类型+路径 → 拒绝）
 *
 * 全部为纯函数 + 只读查询，可独立单测（不依赖 GitHub）。
 */

const crypto = require('crypto');
const {
  TYPES,
  EXAM_NODES,
  SOURCES,
  MAX_FILE_BYTES,
  MIN_TITLE_LEN,
  MAX_TITLE_LEN,
  MAX_DESCRIPTION_LEN,
  MAX_LESSON_TITLE_LEN,
  MAX_TAGS,
  MAX_TAG_LEN,
  MAX_COURSE_NAME_LEN,
  MAX_LECTURER_LEN,
  MAX_COURSE_CODE_LEN,
  MAX_SEMESTER_LEN,
  MAX_FILENAME_LEN,
  FORBIDDEN_NAME_CHARS,
  extOf,
  kindOf,
  isAllowedExt,
} = require('../shared/constants/materials');

const sensitive = require('../middleware/sensitiveWordFilter');
const { query } = require('../database');
const { MaterialError } = require('./materialErrors');
const fixMultipartFilename = require('../utils/multipartFilename');

/* ============================================================
 * 魔数嗅探
 * ============================================================ */

const latin = (buf, start, end) => buf.slice(start, end).toString('latin1');

/** 明确的「可执行 / 危险」头部，命中即拒绝（与扩展名无关，纵深防御） */
const DANGEROUS_MAGIC = [
  { name: 'Windows PE (MZ)', test: (b) => latin(b, 0, 2) === 'MZ' },
  { name: 'ELF', test: (b) => b[0] === 0x7f && latin(b, 1, 4) === 'ELF' },
  { name: 'Mach-O', test: (b) => [0xfeedface, 0xfeedfacf, 0xcafebabe, 0xcefaedfe, 0xcffaedfe].includes(b.readUInt32BE(0)) },
  { name: 'Java class', test: (b) => latin(b, 0, 4) === '\xca\xfe\xba\xbe' },
  { name: 'shell script', test: (b) => latin(b, 0, 2) === '#!' },
];

/** 二进制文件族识别；返回 family 或 null */
function detectBinaryFamily(buf) {
  if (buf.length < 12) return null;
  if (latin(buf, 0, 5) === '%PDF-') return 'pdf';
  if (buf[0] === 0x89 && latin(buf, 1, 4) === 'PNG') return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (latin(buf, 0, 4) === 'RIFF' && latin(buf, 8, 12) === 'WEBP') return 'webp';
  if (latin(buf, 0, 3) === 'GIF') return 'gif';
  if (latin(buf, 0, 4) === 'PK\x03\x04' || latin(buf, 0, 4) === 'PK\x05\x06' || latin(buf, 0, 4) === 'PK\x07\x08') {
    return 'zip';
  }
  return null;
}

/** 前 8KB 是否含 NUL 字节（文本文件不应有） */
function looksBinaryText(buf) {
  const head = buf.slice(0, 8192);
  return head.includes(0x00);
}

/**
 * 扩展名 → 期望的真实类型
 * marker 用于 OOXML 三兄弟（它们都是 zip 容器，靠内部目录名区分）
 */
const EXPECTED = {
  pdf: { family: 'pdf', label: 'PDF' },
  png: { family: 'png', label: 'PNG' },
  jpg: { family: 'jpeg', label: 'JPEG' },
  jpeg: { family: 'jpeg', label: 'JPEG' },
  webp: { family: 'webp', label: 'WebP' },
  zip: { family: 'zip', label: 'ZIP' },
  docx: { family: 'zip', marker: 'word/', label: 'Word 文档' },
  pptx: { family: 'zip', marker: 'ppt/', label: 'PPT 文档' },
  xlsx: { family: 'zip', marker: 'xl/', label: 'Excel 文档' },
  md: { family: 'text', label: '文本' },
  markdown: { family: 'text', label: '文本' },
  txt: { family: 'text', label: '文本' },
};

/**
 * 校验文件的真实类型与扩展名是否相符。
 * @returns {{ family: string, label: string }}
 */
function verifyFileType(buffer, filename) {
  const ext = extOf(filename);
  const expect = EXPECTED[ext];
  if (!expect) {
    throw new MaterialError('MATERIALS_BAD_EXT', `不支持的文件类型 .${ext || '(无扩展名)'}`);
  }

  // 危险头部优先拦截
  for (const d of DANGEROUS_MAGIC) {
    if (d.test(buffer)) {
      throw new MaterialError(
        'MATERIALS_DANGEROUS_FILE',
        `文件内容看起来是可执行文件（${d.name}），已拒绝`
      );
    }
  }

  if (expect.family === 'text') {
    if (looksBinaryText(buffer)) {
      throw new MaterialError(
        'MATERIALS_TYPE_MISMATCH',
        `文件标称 .${ext} 但实际是二进制内容，已拒绝`
      );
    }
    const bin = detectBinaryFamily(buffer);
    if (bin && bin !== 'text') {
      throw new MaterialError(
        'MATERIALS_TYPE_MISMATCH',
        `文件标称 .${ext} 但实际是 ${bin} 格式，已拒绝`
      );
    }
    return { family: 'text', label: expect.label };
  }

  const actual = detectBinaryFamily(buffer);
  if (!actual) {
    throw new MaterialError(
      'MATERIALS_TYPE_MISMATCH',
      `无法识别文件真实类型，与扩展名 .${ext} 不符，已拒绝`
    );
  }
  if (actual !== expect.family) {
    throw new MaterialError(
      'MATERIALS_TYPE_MISMATCH',
      `文件标称 .${ext}（${expect.label}）但实际是 ${actual} 格式，已拒绝`
    );
  }
  if (expect.marker && buffer.indexOf(Buffer.from(expect.marker)) < 0) {
    throw new MaterialError(
      'MATERIALS_TYPE_MISMATCH',
      `文件标称 .${ext}（${expect.label}）但内部结构不符，已拒绝`
    );
  }
  return { family: actual, label: expect.label };
}

/* ============================================================
 * 文件名安全化
 * ============================================================ */

/**
 * 把用户提供的原始文件名变成可安全放进 URL 路径的名字。
 * 原则：**尽量保留原名**（含中文，下载时用），只清理危险部分。
 */
function safeFileName(original) {
  // 修复 multipart latin1 乱码（幂等；同时也兜住其它调用方）
  let name = String(fixMultipartFilename(String(original || ''))).trim();

  // 去掉任何目录成分（防路径穿越）
  name = name.replace(/\\/g, '/').split('/').pop() || '';

  // 去掉控制字符与 URL 危险字符
  name = name.replace(FORBIDDEN_NAME_CHARS, '');

  // 折叠空白
  name = name.replace(/\s+/g, ' ').trim();

  // 去掉开头/结尾的点（防隐藏文件、防 ..）
  name = name.replace(/^\.+/, '').replace(/\.+$/, '');

  // 长度（保留扩展名）
  if (name.length > MAX_FILENAME_LEN) {
    const ext = extOf(name);
    const stem = name.slice(0, name.length - (ext ? ext.length + 1 : 0));
    name = stem.slice(0, MAX_FILENAME_LEN - (ext ? ext.length + 1 : 0)) + (ext ? `.${ext}` : '');
  }

  return name;
}

/* ============================================================
 * 元数据校验
 * ============================================================ */

const asString = (v) => (v == null ? '' : String(v).trim());

function parseTags(raw) {
  if (raw == null || raw === '') return [];
  let list;
  if (Array.isArray(raw)) list = raw;
  else list = String(raw).split(/[,，]/);
  const out = [];
  for (const t of list) {
    const s = asString(t);
    if (!s) continue;
    if (s.length > MAX_TAG_LEN) {
      throw new MaterialError('MATERIALS_BAD_TAG', `标签「${s}」超过 ${MAX_TAG_LEN} 字`);
    }
    if (!out.includes(s)) out.push(s);
  }
  if (out.length > MAX_TAGS) {
    throw new MaterialError('MATERIALS_BAD_TAG', `最多 ${MAX_TAGS} 个标签`);
  }
  return out;
}

/**
 * 校验并归一化上传表单元数据。
 * @param {object} body - multipart 文本字段（multer 已解析）
 * @returns {object} 归一化后的元数据
 */
function validateMetadata(body = {}) {
  const title = asString(body.title);
  if (title.length < MIN_TITLE_LEN || title.length > MAX_TITLE_LEN) {
    throw new MaterialError('MATERIALS_BAD_TITLE', `标题需 ${MIN_TITLE_LEN}–${MAX_TITLE_LEN} 字`);
  }

  const type = asString(body.type);
  if (!TYPES.includes(type)) {
    throw new MaterialError('MATERIALS_BAD_TYPE', `类型必须是：${TYPES.join(' / ')}`);
  }

  let examNode = asString(body.examNode ?? body.exam_node);
  if (examNode) {
    if (!EXAM_NODES.includes(examNode)) {
      throw new MaterialError('MATERIALS_BAD_EXAM_NODE', `考试节点非法：${examNode}`);
    }
  } else {
    examNode = null;
  }

  let source = asString(body.source);
  if (source) {
    if (!SOURCES.includes(source)) {
      throw new MaterialError('MATERIALS_BAD_SOURCE', `来源非法：${source}`);
    }
    if (type !== 'exam') {
      throw new MaterialError('MATERIALS_BAD_SOURCE', '「来源（官方/回忆版）」只适用于试题类型');
    }
  } else {
    source = null;
  }

  let lesson = body.lesson;
  if (lesson == null || lesson === '') {
    lesson = null;
  } else {
    lesson = Number(lesson);
    if (!Number.isInteger(lesson) || lesson <= 0) {
      throw new MaterialError('MATERIALS_BAD_LESSON', '课时序号必须是正整数');
    }
  }

  const lessonTitle = asString(body.lessonTitle ?? body.lesson_title);
  if (lessonTitle.length > MAX_LESSON_TITLE_LEN) {
    throw new MaterialError('MATERIALS_BAD_LESSON', `课时标题超过 ${MAX_LESSON_TITLE_LEN} 字`);
  }

  const description = asString(body.description);
  if (description.length > MAX_DESCRIPTION_LEN) {
    throw new MaterialError('MATERIALS_BAD_DESCRIPTION', `简介超过 ${MAX_DESCRIPTION_LEN} 字`);
  }

  const semester = asString(body.semester);
  if (semester.length > MAX_SEMESTER_LEN) {
    throw new MaterialError('MATERIALS_BAD_SEMESTER', `学期字段超过 ${MAX_SEMESTER_LEN} 字`);
  }

  return {
    title,
    type,
    examNode,
    source,
    lesson,
    lessonTitle: lessonTitle || null,
    description: description || null,
    semester: semester || null,
    tags: parseTags(body.tags),
  };
}

/** 校验课程输入（名字 + 讲师 [+ 可选 code]） */
function validateCourseInput(body = {}) {
  const name = asString(body.courseName ?? body.course_name);
  if (!name) {
    throw new MaterialError('MATERIALS_BAD_COURSE', '请填写课程名');
  }
  if (name.length > MAX_COURSE_NAME_LEN) {
    throw new MaterialError('MATERIALS_BAD_COURSE', `课程名超过 ${MAX_COURSE_NAME_LEN} 字`);
  }
  const lecturer = asString(body.lecturer);
  if (lecturer.length > MAX_LECTURER_LEN) {
    throw new MaterialError('MATERIALS_BAD_COURSE', `讲师名超过 ${MAX_LECTURER_LEN} 字`);
  }
  const code = asString(body.courseCode ?? body.course_code);
  if (code.length > MAX_COURSE_CODE_LEN) {
    throw new MaterialError('MATERIALS_BAD_COURSE', `课程编码超过 ${MAX_COURSE_CODE_LEN} 字`);
  }
  return { name, lecturer, code: code || null };
}

/* ============================================================
 * 敏感词
 * ============================================================ */

/**
 * 检查若干**元数据**文本是否命中敏感词。
 *
 * ⚠️ 策略（2026-09-29 定稿，见设计文档 §17.11）：**只扫元数据，不扫文件正文**。
 *
 * 原因：本站词表（`sensitive_words`）是给树洞/广场那种几十字短贴调的，
 * 里面含 `fk` / `sb` 这类**两个字母**的缩写。把它套到最长 1MB 的课件正文上做匹配，
 * 会把 `FK`(外键) / `SB`(南桥) / `USB` / `ISBN` / base64 串统统误杀 ——
 * 实测 7 个正常场景里 5 个被拒。
 *
 * 正文的内容风险改由两条兜底：① 每次上传都会开一个 GitHub PR，
 * 仓库侧有人工可见的 diff；② admin 有下架能力（`DELETE /api/materials/:id`）。
 *
 * @param {Array<string|{field: string, text: string}>} entries
 * @throws {MaterialError} 命中时抛 MATERIALS_SENSITIVE，`meta` 带 `word` 与 `field`
 */
async function assertNoSensitive(entries) {
  const items = (entries || [])
    .map((e) => (typeof e === 'string' ? { field: '', text: e } : e || {}))
    .filter((e) => typeof e.text === 'string' && e.text.trim());
  if (items.length === 0) return;

  let words = [];
  try {
    words = await sensitive.getSensitiveWords();
  } catch (e) {
    console.warn('[materials] 敏感词表读取失败，跳过检查:', e.message || e);
    return;
  }
  if (!words || words.length === 0) return;

  for (const { field, text } of items) {
    const hit = sensitive.checkText(text, words);
    if (hit && hit.hit) {
      // 必须把**命中的词与字段**一起回给用户。
      // 旧版只说「包含违规词汇」，用户根本不知道改哪儿 —— 实测这是最恼人的一点。
      throw new MaterialError(
        'MATERIALS_SENSITIVE',
        field
          ? `${field}包含违规词汇「${hit.word}」，请修改后重新上传`
          : `内容包含违规词汇「${hit.word}」，请修改后重新上传`,
        400,
        { word: hit.word, field: field || null }
      );
    }
  }
}

/* ============================================================
 * 去重（软去重）
 * ============================================================ */

/**
 * 软去重规则（设计文档 §16.2 N1）：
 *   · 同 sha 且同 (course, type, path) → 视为重复，拒绝
 *   · 同 sha 但不同课程 → 允许（同一份公共讲义被多门课引用是合法场景）
 * @returns {Promise<object|null>} 命中的既有记录（若重复）
 */
async function findDuplicate({ sha256, courseId, type, materialPath }) {
  const rows = await query(
    `SELECT id, course_id, type, material_path, title, status
       FROM materials
      WHERE file_sha256 = ? AND course_id = ? AND type = ? AND material_path = ?
        AND deleted_at IS NULL
      LIMIT 1`,
    [sha256, courseId, type, materialPath]
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/**
 * 检查「同内容已在别的课程存在」—— 不拒绝，但提示前端确认。
 */
async function findSameContentElsewhere({ sha256, courseId }) {
  const rows = await query(
    `SELECT m.id, m.course_id, m.title, c.name AS course_name
       FROM materials m
       LEFT JOIN courses c ON c.id = m.course_id
      WHERE m.file_sha256 = ? AND m.course_id <> ? AND m.deleted_at IS NULL
      LIMIT 3`,
    [sha256, courseId]
  );
  return Array.isArray(rows) ? rows : [];
}

/* ============================================================
 * 主入口
 * ============================================================ */

/**
 * 校验一个上传请求。
 * @param {object} opts
 * @param {object} opts.file - multer 文件对象（memoryStorage）
 * @param {object} opts.body - 表单文本字段
 * @returns {Promise<{ sha256, size, kind, ext, fileName, meta }>}
 * @throws {MaterialError}
 */
async function validateUpload({ file, body }) {
  // 1. 文件存在
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new MaterialError('MATERIALS_NO_FILE', '请选择要上传的文件');
  }

  // 2. 扩展名白名单
  const originalName = file.originalname || '';
  if (!isAllowedExt(extOf(originalName))) {
    const ext = extOf(originalName);
    throw new MaterialError(
      'MATERIALS_BAD_EXT',
      `不支持的文件类型 .${ext || '(无扩展名)'}`
    );
  }

  // 3. 体积
  if (file.buffer.length > MAX_FILE_BYTES) {
    throw new MaterialError(
      'MATERIALS_TOO_LARGE',
      `文件超过 ${MAX_FILE_BYTES / 1024 / 1024}MB 上限`
    );
  }

  // 4. 文件名安全化（必须在类型校验前，因扩展名可能被清理后变化 —— 但扩展名已校验）
  const fileName = safeFileName(originalName);
  if (!fileName || !extOf(fileName)) {
    throw new MaterialError('MATERIALS_BAD_FILENAME', '文件名不合法，请重命名后重试');
  }

  // 5. 魔数嗅探
  verifyFileType(file.buffer, fileName);

  // 6. 元数据
  const meta = validateMetadata(body);

  // 7. 敏感词（**只查元数据；文件正文按策略不扫**，理由见 assertNoSensitive）
  await assertNoSensitive([
    { field: '标题', text: meta.title },
    { field: '简介', text: meta.description },
    { field: '课时标题', text: meta.lessonTitle },
    ...meta.tags.map((t) => ({ field: '标签', text: t })),
  ]);

  // 8. 摘要
  const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

  return {
    sha256,
    size: file.buffer.length,
    kind: kindOf(fileName),
    ext: extOf(fileName),
    fileName,
    meta,
  };
}

module.exports = {
  MaterialError,
  validateUpload,
  validateMetadata,
  validateCourseInput,
  verifyFileType,
  safeFileName,
  detectBinaryFamily,
  assertNoSensitive,
  findDuplicate,
  findSameContentElsewhere,
  parseTags,
};
