/**
 * 仓库文件遍历（校验器与生成器共用）
 */
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules']);

/**
 * 递归列出仓库内所有普通文件，返回相对路径（POSIX 分隔符）
 * @param {string} root 仓库根绝对路径
 * @returns {string[]} 排序后的相对路径数组
 */
export function listAllFiles(root) {
  const out = [];

  function walk(absDir, relDir) {
    let entries;
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (SKIP_DIRS.has(ent.name)) continue;
      const abs = path.join(absDir, ent.name);
      const rel = relDir ? `${relDir}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        walk(abs, rel);
      } else if (ent.isFile()) {
        out.push(rel);
      }
    }
  }

  walk(root, '');
  return out.sort();
}

/** 文件字节大小；不存在返回 null */
export function sizeOf(root, rel) {
  try {
    return statSync(path.join(root, rel)).size;
  } catch {
    return null;
  }
}

/** 人类可读体积 */
export function humanBytes(n) {
  if (n == null) return '?';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
