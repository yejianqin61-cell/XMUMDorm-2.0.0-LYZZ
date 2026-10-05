/**
 * 课表抽取（**纯函数**：注入脚本回传的消息 → 行 → 制表符文本）
 *
 * 分工（这一点必须说清，否则会误以为"DOM 解析已被单测覆盖"）：
 *   - **DOM 侧的"表 → 二维数组"发生在 WebView 内的注入脚本里**（见 `injectedScripts.ts`），
 *     它的正确性由**真机 spike** 与 Jest 里的**假 DOM 冒烟测试**共同覆盖；
 *   - **本文件负责**：消息解析（防御式）、行清洗、转成**制表符文本**。
 *
 * 为什么要有"制表符文本"这条路：它是**降级路径 A** 的输入格式 ——
 * 若 R3 判定内嵌不可行，课表改为「手工粘贴文本」，而粘贴进来的也是同一种格式
 * （`POST /schedule/import/preview` 的既有口径）。
 */

import { SCRAPE_KIND } from './injectedScripts';

export type ScheduleRows = readonly (readonly string[])[];

export type ParsedScrapeMessage = {
  kind: string;
  rows: string[][];
};

/** 防御式解析注入消息：任何异常输入都返回 `null`，⛔ 不抛（渲染路径上抛异常会白屏） */
export function parseInjectedMessage(raw: unknown): ParsedScrapeMessage | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof decoded !== 'object' || decoded === null) return null;
  const candidate = decoded as { kind?: unknown; rows?: unknown };
  if (typeof candidate.kind !== 'string' || !Array.isArray(candidate.rows)) return null;
  // 逐格过滤：只保留字符串（畸形单元格丢掉，而不是丢掉整行 —— 一行坏一格不该毁掉整张表）
  const rows = candidate.rows.map((row) =>
    Array.isArray(row)
      ? row.filter((cell): cell is string => typeof cell === 'string').map((cell) => cell.trim())
      : []
  );
  return { kind: candidate.kind, rows };
}

/** 清洗：去掉全空行、去掉尾部空列（合并单元格常留出空列） */
export function normalizeRows(rows: ScheduleRows): string[][] {
  return rows
    .map((row) => {
      const cells = [...row].map((cell) => cell.trim());
      while (cells.length > 0 && cells[cells.length - 1] === '') {
        cells.pop();
      }
      return cells;
    })
    .filter((row) => row.some((cell) => cell !== ''));
}

/** 行 → 制表符文本：⛔ 无尾随 tab、⛔ 无空行（与导入接口的既有口径一致） */
export function toTabSeparated(rows: ScheduleRows): string {
  return normalizeRows(rows)
    .map((row) => row.join('\t'))
    .join('\n');
}

export type ExtractedSchedule = {
  rows: string[][];
  text: string;
  headerRow: string[] | null;
};

/** 从注入消息里抽出课表；不是课表消息或没有数据时返回 `null` */
export function extractScheduleFromMessage(raw: unknown): ExtractedSchedule | null {
  const parsed = parseInjectedMessage(raw);
  if (!parsed || parsed.kind !== SCRAPE_KIND) return null;
  const rows = normalizeRows(parsed.rows);
  if (rows.length === 0) return null;
  const [headerRow, ...rest] = rows;
  const body = rest.length > 0 ? rest : [];
  return {
    rows,
    text: toTabSeparated(body.length > 0 ? body : rows),
    headerRow: headerRow.length > 0 ? headerRow : null,
  };
}
