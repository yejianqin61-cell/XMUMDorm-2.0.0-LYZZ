#!/usr/bin/env node
/**
 * ============================================
 * 学习资料库 · index.json 生成器
 * ============================================
 * 用途：
 *   1) 管理员手工往仓库丢文件后，重新生成索引；
 *   2) 修复「元数据过期」（validate 报 size 不一致 / 幽灵条目 / 缺条目）；
 *   3) 作为主仓库后端生成器的**参考实现**。
 *
 * 设计原则：
 *   - **保留式生成**：已存在的条目元数据（title/tags/lesson/examNode/...）原样保留，
 *     只补齐缺失项、删除幽灵条目、刷新 size/sha256/updatedAt 之外的派生字段。
 *   - **不做网络请求**：纯本地文件系统操作。
 *   - **确定性输出**：files 按 path 排序，courses 按 courseId 排序，2 空格缩进，
 *     末尾换行 —— 同样输入必得同样字节，便于 diff 与 --check。
 *
 * 用法：
 *   node .github/scripts/build-index.mjs            # 写入 index.json
 *   node .github/scripts/build-index.mjs --check     # 只检查是否最新，不写入（CI 可用）
 *
 * 环境变量（可选）：OWNER / REPO / SHA（由 Actions 注入；本地会退回 git rev-parse）
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { SCHEMA_VERSION, EXT_KIND, MATERIAL_PATH_RE, extOf, isMaterialPath } from './lib/rules.mjs';
import { listAllFiles, sizeOf, humanBytes } from './lib/walk.mjs';

const ROOT = process.cwd();
const INDEX_FILE = path.join(ROOT, 'index.json');
const CHECK_ONLY = process.argv.includes('--check');
const warnings = [];

/** 读取既有索引（容错：不存在或损坏都返回空壳） */
function readExisting() {
  if (!existsSync(INDEX_FILE)) return { files: [], courses: [] };
  try {
    const j = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
    return {
      files: Array.isArray(j.files) ? j.files : [],
      courses: Array.isArray(j.courses) ? j.courses : [],
    };
  } catch (e) {
    warnings.push(`既有 index.json 无法解析（${e.message}），将按空索引重建`);
    return { files: [], courses: [] };
  }
}

function gitSha() {
  if (process.env.SHA) return process.env.SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/** 由文件名与路径合成兜底元数据（保证新文件一定有条目） */
function synthesize(rel, courseId, type) {
  const filename = rel.split('/').pop();
  const base = filename.replace(/\.[^.]+$/, '');
  warnings.push(
    `新文件缺少元数据，已用文件名兜底：${rel}\n` +
      `        → title="${base}"；courseName 需要人工补全（courses[] 中的 courseId=${courseId}）`
  );
  return {
    path: rel,
    name: filename,
    ext: extOf(filename),
    kind: EXT_KIND[extOf(filename)] || 'document',
    title: base.slice(0, 100),
    courseId: Number(courseId),
    courseName: null,
    lecturer: '',
    type,
    lesson: null,
    lessonTitle: null,
    examNode: null,
    source: null,
    tags: [],
    semester: null,
    description: null,
    uploaderNickname: null,
    downloads: 0,
  };
}

const existing = readExisting();
const byPath = new Map(existing.files.filter((f) => f && typeof f.path === 'string').map((f) => [f.path, f]));

const materialFiles = listAllFiles(ROOT).filter(isMaterialPath);
const files = [];
let totalBytes = 0;

for (const rel of materialFiles) {
  const m = rel.match(MATERIAL_PATH_RE);
  const [, courseId, type] = m;
  const size = sizeOf(ROOT, rel) ?? 0;
  totalBytes += size;

  const prev = byPath.get(rel);
  const entry = prev ? { ...prev } : synthesize(rel, courseId, type);

  // 派生字段：始终以磁盘为准
  entry.path = rel;
  entry.name = rel.split('/').pop();
  entry.ext = extOf(entry.name);
  entry.kind = EXT_KIND[entry.ext] || entry.kind || 'document';
  entry.size = size;
  entry.sha256 = createHash('sha256').update(readFileSync(path.join(ROOT, rel))).digest('hex');
  entry.courseId = Number(courseId);
  entry.type = type;

  // 归一化可选字段，保证输出稳定
  if (entry.tags == null) entry.tags = [];
  if (entry.downloads == null) entry.downloads = 0;
  for (const k of ['lesson', 'lessonTitle', 'examNode', 'source', 'semester', 'description', 'uploaderNickname', 'lecturer', 'courseName']) {
    if (entry[k] === undefined) entry[k] = null;
  }

  // 路径级约束兜底（validate 会再查一遍）
  if (entry.source != null && entry.type !== 'exam') entry.source = null;

  files.push(entry);
}

files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

// ---- courses[]：以既有索引为准，补齐新出现的 courseId
const courseMap = new Map();
for (const c of existing.courses) {
  if (c && c.courseId != null) courseMap.set(Number(c.courseId), { ...c, courseId: Number(c.courseId) });
}
for (const f of files) {
  if (!courseMap.has(f.courseId)) {
    courseMap.set(f.courseId, {
      courseId: f.courseId,
      name: f.courseName ?? null,
      lecturer: f.lecturer ?? '',
    });
  }
  // 用条目里的信息回填课程名（若既有课程名为空）
  const c = courseMap.get(f.courseId);
  if ((c.name == null || c.name === '') && f.courseName) c.name = f.courseName;
  if ((c.lecturer == null || c.lecturer === '') && f.lecturer) c.lecturer = f.lecturer;
}
const courses = [...courseMap.values()].sort((a, b) => a.courseId - b.courseId);

// 幽灵条目提示
const present = new Set(materialFiles);
for (const p of byPath.keys()) {
  if (!present.has(p)) warnings.push(`删除幽灵条目（文件已不存在）：${p}`);
}

const owner = process.env.OWNER || 'OWNER';
const repo = process.env.REPO || 'REPO';
const sha = gitSha();

const index = {
  schemaVersion: SCHEMA_VERSION,
  generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  commit: sha,
  baseUrl: `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${sha}`,
  stats: { totalFiles: files.length, totalBytes },
  courses,
  files,
};

const next = JSON.stringify(index, null, 2) + '\n';
const prevRaw = existsSync(INDEX_FILE) ? readFileSync(INDEX_FILE, 'utf8') : '';

console.log('─'.repeat(64));
console.log(`index.json 生成 · 文件 ${files.length} 个 · 课程 ${courses.length} 门 · 总量 ${humanBytes(totalBytes)}`);
console.log('─'.repeat(64));
for (const w of warnings) console.log(`提示  ${w}`);

if (CHECK_ONLY) {
  if (prevRaw === next) {
    console.log('✅ index.json 已是最新');
    process.exit(0);
  }
  console.error('❌ index.json 不是最新，请运行 `node .github/scripts/build-index.mjs` 后提交');
  process.exit(1);
}

if (prevRaw === next) {
  console.log('✅ index.json 无变化，未写入');
  process.exit(0);
}

writeFileSync(INDEX_FILE, next, 'utf8');
console.log(`✅ 已写入 index.json（${humanBytes(Buffer.byteLength(next))}）`);
