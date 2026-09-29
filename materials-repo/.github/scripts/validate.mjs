#!/usr/bin/env node
/**
 * ============================================
 * 学习资料库 · PR 校验器
 * ============================================
 * 由 .github/workflows/validate.yml 在 pull_request 上调用，
 * 作为分支保护的 required status check（名为 `validate`）。
 *
 * 校验内容：
 *   A. 变更文件绊线：.github/** 的改动一律失败（见下方 SECURITY 注释）
 *   B. 路径规范：只允许 c<id>/<type>/<file> 与白名单保留文件
 *   C. 文件名：字符集、长度、隐藏文件
 *   D. 扩展名：必须在允许表内，且不得命中永久黑名单
 *   E. 体积：单文件 ≤ 20MB；仓库总量 ≤ 1GB
 *   F. index.json：schema 正确，且与磁盘上的材料文件双向一致
 *
 * 退出码：0 通过；1 失败。
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  SCHEMA_VERSION,
  TYPES,
  EXAM_NODES,
  SOURCES,
  EXT_KIND,
  ALLOWED_EXT,
  BLOCKED_EXT,
  MAX_FILE_BYTES,
  MAX_REPO_BYTES,
  MAX_TITLE_LEN,
  MAX_DESCRIPTION_LEN,
  MAX_LESSON_TITLE_LEN,
  MAX_TAGS,
  MAX_TAG_LEN,
  MAX_PATH_LEN,
  MAX_FILENAME_LEN,
  MATERIAL_PATH_RE,
  FORBIDDEN_NAME_CHARS,
  extOf,
  isMaterialPath,
  isReservedPath,
} from './lib/rules.mjs';
import { listAllFiles, sizeOf, humanBytes } from './lib/walk.mjs';

const ROOT = process.cwd();
const errors = [];
const warnings = [];

const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ---------------------------------------------------------------- A. 变更文件
/**
 * SECURITY：为什么 .github/** 的改动必须失败
 *
 * 本仓库启用了「Allow auto-merge」且 required approvals = 0，
 * validate workflow 又持有 contents: write。
 * 这意味着：任何能推送分支并开 PR 的人，只要改掉 .github/workflows/*.yml，
 * 就能让 CI 以写权限执行任意命令 —— 这是一条完整的提权链。
 *
 * 校验器本身无法在事后阻止（workflow 一旦被改，它可能根本不会跑），
 * 但把 .github/** 的改动变成硬失败有两点作用：
 *   1) required check 不通过 → auto-merge 不会发生 → 必须真人介入；
 *   2) 若攻击者删掉/改名 validate job，required check 永远不会上报为成功，
 *      GitHub 同样会一直卡住该 PR。
 * 这是绊线，不是完整防护。完整防护需要 CODEOWNERS + 「Require review from
 * Code Owners」覆盖 .github/**，见 CONTRIBUTING.md「安全」一节。
 */
function changedFiles() {
  const base = process.env.BASE_REF || 'main';
  const candidates = [
    `origin/${base}...HEAD`,
    `${base}...HEAD`,
    `origin/${base}`,
    base,
  ];
  for (const ref of candidates) {
    try {
      const out = execFileSync('git', ['diff', '--name-only', `--diff-filter=ACMR`, ref], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return out.split('\n').map((s) => s.trim()).filter(Boolean);
    } catch {
      /* 试下一个 ref */
    }
  }
  warn(`无法计算对比基线（BASE_REF=${base}），已退化为「全量校验」`);
  return null;
}

const changed = changedFiles();
if (changed) {
  for (const f of changed) {
    if (f.startsWith('.github/')) {
      err(
        `[安全] 本 PR 修改了 CI 配置：${f}\n` +
          `        资料库启用了自动合并（无人工审核）且 workflow 持有写权限，` +
          `因此 .github/** 的改动必须由真人手动合并。请让管理员关闭 auto-merge 后人工审查。`
      );
    }
  }
}

// ---------------------------------------------------------------- B/C/D/E. 扫描
const allFiles = listAllFiles(ROOT);
const materialFiles = [];
const unexpected = [];

for (const rel of allFiles) {
  if (rel === 'index.json') continue;
  if (isMaterialPath(rel)) {
    materialFiles.push(rel);
  } else if (!isReservedPath(rel)) {
    unexpected.push(rel);
  }
}

for (const rel of unexpected) {
  err(
    `[路径] 不允许的文件：${rel}\n` +
      `        只允许 c<courseId>/<notes|lecture|exam|answer|other>/<文件> 与顶层保留文件` +
      `（README.md / CONTRIBUTING.md / LICENSE / .nojekyll / index.json）`
  );
}

let totalMaterialBytes = 0;

/** 结构本身就不合法的文件，不再重复报「缺少索引条目」（避免级联噪音） */
const badPaths = new Set();

for (const rel of materialFiles) {
  const errorsBefore = errors.length;
  const m = rel.match(MATERIAL_PATH_RE);
  const [, courseId, dirType, filename] = m;

  // 路径长度
  if (rel.length > MAX_PATH_LEN) {
    err(`[路径] 过长（${rel.length} > ${MAX_PATH_LEN}）：${rel}`);
  }

  // 文件名
  if (filename.length > MAX_FILENAME_LEN) {
    err(`[文件名] 过长（${filename.length} > ${MAX_FILENAME_LEN}）：${rel}`);
  }
  if (filename.startsWith('.')) {
    err(`[文件名] 不允许隐藏文件：${rel}`);
  }
  if (FORBIDDEN_NAME_CHARS.test(filename)) {
    err(
      `[文件名] 含禁用字符（会破坏 CDN URL）：${filename}\n` +
        `        禁用：# ? % & = + : ; , @ $ ! * ' " ( ) [ ] { } | \\ < > ^ ~ ` + '`' + ` 及控制字符`
    );
  }
  if (filename !== filename.trim()) {
    err(`[文件名] 首尾不允许空格：${JSON.stringify(filename)}`);
  }
  if (filename.includes('..')) {
    err(`[文件名] 不允许 ".."：${filename}`);
  }

  // 扩展名
  const ext = extOf(filename);
  if (!ext) {
    err(`[扩展名] 缺少扩展名：${rel}`);
  } else if (BLOCKED_EXT.has(ext)) {
    err(
      `[扩展名] .${ext} 属于永久黑名单（浏览器可执行/可脚本化），一律禁止：${rel}`
    );
  } else if (!ALLOWED_EXT.has(ext)) {
    err(
      `[扩展名] .${ext} 不在允许列表内：${rel}\n` +
        `        允许：${[...ALLOWED_EXT].sort().join(' .')}`
    );
  }

  // 体积
  const size = sizeOf(ROOT, rel);
  if (size == null) {
    err(`[体积] 无法读取文件：${rel}`);
  } else {
    totalMaterialBytes += size;
    if (size > MAX_FILE_BYTES) {
      err(
        `[体积] 单文件超限：${rel} = ${humanBytes(size)} > ${humanBytes(MAX_FILE_BYTES)}`
      );
    }
    if (size === 0) {
      warn(`[体积] 空文件：${rel}`);
    }
  }

  if (errors.length > errorsBefore) badPaths.add(rel);
}

if (totalMaterialBytes > MAX_REPO_BYTES) {
  err(
    `[体积] 仓库材料总量超限：${humanBytes(totalMaterialBytes)} > ${humanBytes(MAX_REPO_BYTES)}\n` +
      `        请清理过期资料，或把超大文件迁至 R2（设计文档 FR-15）`
  );
}

// ---------------------------------------------------------------- F. index.json
const INDEX_PATH = path.join(ROOT, 'index.json');
let index = null;

if (!existsSync(INDEX_PATH)) {
  // 引导状态：仓库刚建好、还没有任何资料时，index.json 尚不存在是正常的
  // （它由第一份资料的上传 PR 一并创建）。只要有材料文件却缺索引，就必须报错。
  if (materialFiles.length === 0) {
    warn(
      '[索引] 仓库尚无 index.json（空仓库引导状态）——' +
        '首份资料上传时会随 PR 一并创建，此处不视为失败。'
    );
  } else {
    err(
      `[索引] 缺少 index.json，但仓库已有 ${materialFiles.length} 个材料文件。\n` +
        `        可用 \`node .github/scripts/build-index.mjs\` 生成后一并提交。`
    );
  }
} else {
  let raw;
  try {
    raw = readFileSync(INDEX_PATH, 'utf8');
  } catch (e) {
    err(`[索引] 无法读取 index.json：${e.message}`);
  }
  if (raw != null) {
    try {
      index = JSON.parse(raw);
    } catch (e) {
      err(`[索引] index.json 不是合法 JSON：${e.message}`);
    }
  }
}

if (index) {
  if (index.schemaVersion !== SCHEMA_VERSION) {
    err(
      `[索引] schemaVersion 应为 ${SCHEMA_VERSION}，实际为 ${JSON.stringify(index.schemaVersion)}`
    );
  }
  if (!Array.isArray(index.files)) {
    err(`[索引] files 必须是数组`);
  } else {
    const seen = new Set();

    for (const [i, f] of index.files.entries()) {
      const at = `files[${i}]`;
      if (!f || typeof f !== 'object') {
        err(`[索引] ${at} 不是对象`);
        continue;
      }
      const p = f.path;
      if (typeof p !== 'string' || !p) {
        err(`[索引] ${at}.path 缺失`);
        continue;
      }
      if (seen.has(p)) {
        err(`[索引] path 重复：${p}`);
      }
      seen.add(p);

      const mp = p.match(MATERIAL_PATH_RE);
      if (!mp) {
        err(`[索引] ${at}.path 不符合 c<id>/<type>/<file> 形状：${p}`);
        continue;
      }
      const [, pathCourseId, pathType] = mp;

      if (!existsSync(path.join(ROOT, p))) {
        err(`[索引] 条目指向不存在的文件（幽灵条目）：${p}`);
      }

      // 与路径交叉校验
      if (String(f.courseId) !== pathCourseId) {
        err(`[索引] ${at}.courseId=${f.courseId} 与路径中的 c${pathCourseId} 不一致：${p}`);
      }
      if (f.type !== pathType) {
        err(`[索引] ${at}.type=${f.type} 与路径中的 ${pathType} 不一致：${p}`);
      }

      // 枚举
      if (!TYPES.includes(f.type)) {
        err(`[索引] ${at}.type 非法：${JSON.stringify(f.type)}（允许 ${TYPES.join('/')}）`);
      }
      if (f.examNode != null && !EXAM_NODES.includes(f.examNode)) {
        err(`[索引] ${at}.examNode 非法：${JSON.stringify(f.examNode)}`);
      }
      if (f.source != null && !SOURCES.includes(f.source)) {
        err(`[索引] ${at}.source 非法：${JSON.stringify(f.source)}`);
      }
      if (f.source != null && f.type !== 'exam') {
        err(`[索引] ${at}.source 只允许出现在 type=exam 上（当前 type=${f.type}）：${p}`);
      }

      // 字段
      if (typeof f.title !== 'string' || !f.title.trim()) {
        err(`[索引] ${at}.title 不能为空：${p}`);
      } else if (f.title.length > MAX_TITLE_LEN) {
        err(`[索引] ${at}.title 超长（>${MAX_TITLE_LEN}）：${p}`);
      }
      if (!f.kind) {
        err(`[索引] ${at}.kind 缺失：${p}`);
      } else {
        const ext = extOf(p);
        const expect = EXT_KIND[ext];
        if (expect && f.kind !== expect) {
          err(`[索引] ${at}.kind=${f.kind} 与扩展名 .${ext} 不符（应为 ${expect}）：${p}`);
        }
      }
      if (f.lesson != null && (!Number.isInteger(f.lesson) || f.lesson <= 0)) {
        err(`[索引] ${at}.lesson 必须是正整数：${JSON.stringify(f.lesson)}`);
      }
      if (f.lessonTitle != null && String(f.lessonTitle).length > MAX_LESSON_TITLE_LEN) {
        err(`[索引] ${at}.lessonTitle 超长（>${MAX_LESSON_TITLE_LEN}）：${p}`);
      }
      if (f.description != null && String(f.description).length > MAX_DESCRIPTION_LEN) {
        err(`[索引] ${at}.description 超长（>${MAX_DESCRIPTION_LEN}）：${p}`);
      }
      if (f.tags != null) {
        if (!Array.isArray(f.tags)) {
          err(`[索引] ${at}.tags 必须是数组：${p}`);
        } else {
          if (f.tags.length > MAX_TAGS) {
            err(`[索引] ${at}.tags 超过 ${MAX_TAGS} 个：${p}`);
          }
          for (const t of f.tags) {
            if (typeof t !== 'string' || !t.trim()) {
              err(`[索引] ${at}.tags 含空标签：${p}`);
            } else if (t.length > MAX_TAG_LEN) {
              err(`[索引] ${at}.tags 含超长标签（>${MAX_TAG_LEN}）：${t}`);
            }
          }
        }
      }

      // 体积一致性
      const size = sizeOf(ROOT, p);
      if (size != null && typeof f.size === 'number' && f.size !== size) {
        err(
          `[索引] ${at}.size=${f.size} 与磁盘实际 ${size} 不一致（元数据过期）：${p}\n` +
            `        重新运行 build-index.mjs 并提交。`
        );
      }
    }

    // 反向一致性：磁盘上每个材料都必须有条目
    for (const rel of materialFiles) {
      if (badPaths.has(rel)) continue;
      if (!seen.has(rel)) {
        err(
          `[索引] 材料文件缺少 index.json 条目：${rel}\n` +
            `        运行 \`node .github/scripts/build-index.mjs\` 生成后一并提交。`
        );
      }
    }

    // courses[] 覆盖性
    const courseIds = new Set(
      (Array.isArray(index.courses) ? index.courses : []).map((c) => String(c?.courseId))
    );
    for (const f of index.files) {
      if (f?.courseId != null && !courseIds.has(String(f.courseId))) {
        err(`[索引] courses[] 缺少 courseId=${f.courseId} 的课程条目`);
      }
    }
  }
}

// ---------------------------------------------------------------- 输出
const line = '─'.repeat(64);
console.log(line);
console.log(`学习资料库校验 · 材料文件 ${materialFiles.length} 个 · 材料总量 ${humanBytes(totalMaterialBytes)}`);
console.log(line);

for (const w of warnings) console.log(`警告  ${w}`);

if (errors.length === 0) {
  console.log('✅ 全部通过');
  process.exit(0);
}

console.error('');
for (const e of errors) console.error(`❌ ${e}`);
console.error('');
console.error(`共 ${errors.length} 项失败，${warnings.length} 项警告。`);
process.exit(1);
