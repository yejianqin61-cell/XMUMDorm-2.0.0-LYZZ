/**
 * 学习资料（M10）API 封装 —— Web / RN 共用
 *
 * 设计与契约见 docs/04-Module/M10-学习资料/Module10-学习资料设计.md §4。
 * 后端路由：routes/materials.js，挂载于 /api/materials。
 *
 * 读路径约定：
 *   · 列表/元数据走本 API（后端从 GitHub API 读最新 index，避免 CDN 过期副本）；
 *   · **文件字节**用响应里的 `baseUrl` + `item.path` 拼好后**直连 CDN**
 *     （零服务器带宽）；CDN 不可达时可用 materialTextUrl(path) 走后端兜底。
 *
 * 规则常量与后端同源：`shared/constants/materials.js`（后端 require 同一份 ESM）。
 */

import { get, post, patch, request } from './request';
import { API_BASE_URL } from './config';
import {
  TYPES,
  TYPE_META,
  EXAM_NODES,
  EXAM_NODE_META,
  SOURCES,
  SOURCE_META,
  MAX_FILE_BYTES,
  MAX_TAGS,
  MAX_TAG_LEN,
  MAX_TITLE_LEN,
  MIN_TITLE_LEN,
  MAX_DESCRIPTION_LEN,
  MAX_LESSON_TITLE_LEN,
  ALLOWED_EXT,
  BLOCKED_EXT,
  PSEUDO_COURSE_ID,
  encodeCdnPath,
  isAllowedExt,
  extOf,
  kindOf,
} from '../constants/materials';

export {
  TYPES,
  TYPE_META,
  EXAM_NODES,
  EXAM_NODE_META,
  SOURCES,
  SOURCE_META,
  MAX_FILE_BYTES,
  MAX_TAGS,
  MAX_TAG_LEN,
  MAX_TITLE_LEN,
  MIN_TITLE_LEN,
  MAX_DESCRIPTION_LEN,
  MAX_LESSON_TITLE_LEN,
  ALLOWED_EXT,
  BLOCKED_EXT,
  PSEUDO_COURSE_ID,
  isAllowedExt,
  extOf,
  kindOf,
};

/* ============================================================
 * 列表 / 课程
 * ============================================================ */

/**
 * 资料列表（公开）。
 * @param {object} [opts]
 * @param {string} [opts.q] 关键词（匹配标题/描述/课程名/标签，不搜正文）
 * @param {number} [opts.course] 课程 id
 * @param {'notes'|'lecture'|'exam'|'answer'|'other'} [opts.type]
 * @param {'midterm'|'final'|'quiz'|'assignment'|'monthly'} [opts.examNode]
 * @param {string} [opts.kind]
 * @param {'recent'|'name'|'size'} [opts.sort]
 * @param {number} [opts.page]
 * @param {number} [opts.pageSize]
 */
export function listMaterials(opts = {}) {
  const p = new URLSearchParams();
  const set = (k, v) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  };
  set('q', opts.q);
  set('course', opts.course);
  set('type', opts.type);
  set('examNode', opts.examNode);
  set('kind', opts.kind);
  set('sort', opts.sort);
  set('page', opts.page);
  set('pageSize', opts.pageSize);
  const qs = p.toString();
  return get(`/api/materials${qs ? `?${qs}` : ''}`);
}

/** 课程字典（轻量，公开；供选课与自动补全） */
export function listCourses({ q = '', limit = 200 } = {}) {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  p.set('limit', String(limit));
  return get(`/api/materials/courses?${p.toString()}`);
}

/**
 * 解析课程：命中返回已有课程，未命中可自注册（需登录）。
 * 上传表单的「课程名 + 讲师」自动补全用它。
 */
export function resolveCourse({
  courseName,
  lecturer = '',
  courseCode = '',
  courseId = null,
  autoCreate = true,
} = {}) {
  return post('/api/materials/courses/resolve', {
    courseName,
    lecturer,
    courseCode,
    courseId,
    autoCreate,
  });
}

/* ============================================================
 * 文件字节
 * ============================================================ */

/** 用列表返回的 baseUrl 拼出文件的 CDN 地址（前端直连，零服务器带宽） */
export function materialCdnUrl(baseUrl, path) {
  if (!baseUrl || !path) return null;
  return `${String(baseUrl).replace(/\/+$/, '')}/${encodeCdnPath(path)}`;
}

/**
 * 文本兜底地址：CDN 不可达时由后端代理返回 Markdown 正文。
 * 二进制文件访问该地址会 302 跳转到 CDN。
 */
export function materialTextUrl(path) {
  return `/api/materials/file/${encodeCdnPath(path)}`;
}

/** 取 Markdown 正文（走后端兜底，返回纯文本） */
export function getMaterialText(path) {
  return request(materialTextUrl(path), { method: 'GET' });
}

/**
 * 直接取文本内容（不走 JSON 包装层）。
 *
 * 为什么需要它：`request()` 只处理 JSON 响应，而 /api/materials/file/* 返回
 * `text/plain`，会被当成错误。这个函数按纯文本读取，并用 API_BASE_URL 拼绝对地址
 * （生产环境前后端不同源时也正确）。
 *
 * @param {string} path 资料在仓库内的相对路径
 * @returns {Promise<string>}
 */
export async function fetchMaterialText(path) {
  const url = `${API_BASE_URL}${materialTextUrl(path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * 取 Markdown 正文：**优先 CDN（零服务器带宽）**，失败再走后端兜底。
 * @param {object} opts
 * @param {string} opts.cdnUrl - 钉到 commit 的 CDN 地址
 * @param {string} opts.path
 */
export async function fetchMarkdownText({ cdnUrl, path }) {
  if (cdnUrl) {
    try {
      const res = await fetch(cdnUrl);
      if (res.ok) return await res.text();
    } catch {
      /* 落到后端兜底 */
    }
  }
  return fetchMaterialText(path);
}

/* ============================================================
 * 上传
 * ============================================================ */

/**
 * 上传资料。
 *
 * @param {object} input
 * @param {File|Blob} input.file
 * @param {string} input.title
 * @param {'notes'|'lecture'|'exam'|'answer'|'other'} input.type
 * @param {string} [input.courseName] 课程名（与 courseId 二选一）
 * @param {string} [input.lecturer]
 * @param {string} [input.courseCode]
 * @param {number} [input.courseId] 已从字典选中的课程 id（优先）
 * @param {number} [input.lesson]
 * @param {string} [input.lessonTitle]
 * @param {'midterm'|'final'|'quiz'|'assignment'|'monthly'} [input.examNode]
 * @param {'official'|'recalled'} [input.source] 仅 type=exam
 * @param {string[]|string} [input.tags]
 * @param {string} [input.semester]
 * @param {string} [input.description]
 * @param {string} [input.fileName] 覆盖原始文件名（移动端可用）
 */
export function uploadMaterial(input = {}) {
  const fd = new FormData();
  const fileName = input.fileName || (input.file && input.file.name) || 'file';
  fd.append('file', input.file, fileName);

  const text = {
    title: input.title,
    type: input.type,
    courseName: input.courseName,
    lecturer: input.lecturer,
    courseCode: input.courseCode,
    courseId: input.courseId,
    lesson: input.lesson,
    lessonTitle: input.lessonTitle,
    examNode: input.examNode,
    source: input.source,
    semester: input.semester,
    description: input.description,
  };
  for (const [k, v] of Object.entries(text)) {
    if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
  }
  if (Array.isArray(input.tags)) fd.append('tags', input.tags.join(','));
  else if (input.tags) fd.append('tags', String(input.tags));

  // request() 对 FormData 不设 Content-Type，交给运行时带 boundary
  return post('/api/materials/upload', fd);
}

/** 轮询某次上传的状态（pending → merged / rejected） */
export function getUploadStatus(id) {
  return get(`/api/materials/upload/${id}/status`);
}

/** 我上传的 */
export function getMyUploads({ page = 1, pageSize = 20 } = {}) {
  return get(`/api/materials/me/uploads?page=${page}&pageSize=${pageSize}`);
}

/* ============================================================
 * 修改 / 下架
 * ============================================================ */

/**
 * 修改元数据（走 metadata-only PR，不改文件本体）。
 * 不允许改 type（会影响存储目录）。
 */
export function patchMaterial(id, data = {}) {
  return patch(`/api/materials/${id}`, data);
}

/** 下架（本人或管理员）。返回体含 notice：CDN 可能有残留缓存。 */
export function removeMaterial(id, reason = '') {
  return request(`/api/materials/${id}`, { method: 'DELETE', body: { reason } });
}

/* ============================================================
 * 互动 / 管理端
 * ============================================================ */

/** 下载计数（尽力而为；下载本身直连 CDN，不经过后端） */
export function countDownload(path) {
  return post('/api/materials/download', { path });
}

/** 收藏 toggle */
export function toggleMaterialSave(id) {
  return post(`/api/materials/${id}/save`, {});
}

/** 我的收藏 */
export function getMyMaterialSaves() {
  return get('/api/materials/me/saves');
}

/** 管理端看板 */
export function getMaterialsAdminStats() {
  return get('/api/materials/admin/stats');
}

/** 管理端：改课程（改名 / 讲师 / code） */
export function updateCourse(id, data = {}) {
  return patch(`/api/materials/admin/courses/${id}`, data);
}

/** 管理端：合并课程（资料与别名并入 toId，并重写资料库 index） */
export function mergeCourses({ fromId, toId }) {
  return post('/api/materials/admin/courses/merge', { fromId, toId });
}

/* ============================================================
 * 前端本地预校验（与后端同源规则，仅用于提前提示）
 * ============================================================ */

/**
 * 上传前的本地校验，返回可读错误数组（空数组 = 通过）。
 * 真正的强制校验在服务端与资料库 CI，这里只是省一次往返。
 */
export function validateUploadLocally({ file, title, type, courseName, courseId, examNode, source, tags } = {}) {
  const errors = [];
  const name = (file && file.name) || '';
  const size = file && file.size;

  if (!file) {
    errors.push('请选择文件');
  } else {
    const ext = extOf(name);
    if (!ext) errors.push('文件缺少扩展名');
    else if (BLOCKED_EXT.includes(ext)) errors.push(`出于安全考虑，不支持 .${ext} 文件`);
    else if (!ALLOWED_EXT.includes(ext)) errors.push(`不支持的文件类型 .${ext}`);
    if (typeof size === 'number' && size > MAX_FILE_BYTES) {
      errors.push(`文件超过 ${MAX_FILE_BYTES / 1024 / 1024}MB 上限`);
    }
    if (typeof size === 'number' && size === 0) errors.push('文件为空');
  }

  const t = String(title || '').trim();
  if (t.length < MIN_TITLE_LEN || t.length > MAX_TITLE_LEN) {
    errors.push(`标题需 ${MIN_TITLE_LEN}–${MAX_TITLE_LEN} 字`);
  }
  if (!TYPES.includes(type)) errors.push('请选择文件类型');
  if (!courseId && !courseName) errors.push('请选择或填写课程名');
  if (examNode && !EXAM_NODES.includes(examNode)) errors.push('考试节点不合法');
  if (source) {
    if (type !== 'exam') errors.push('「来源（官方/回忆版）」只适用于试题类型');
    else if (!SOURCES.includes(source)) errors.push('来源不合法');
  }

  const tagList = Array.isArray(tags)
    ? tags
    : String(tags || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  if (tagList.length > MAX_TAGS) errors.push(`最多 ${MAX_TAGS} 个标签`);
  for (const tag of tagList) {
    if (String(tag).length > MAX_TAG_LEN) errors.push(`标签「${tag}」超过 ${MAX_TAG_LEN} 字`);
  }

  return errors;
}
