/**
 * P2D-04 · 缺陷与更正总账的**守卫**
 *
 * 台账：[甲-已知缺陷与更正总账.md](../../../docs/app/task/phase-2/甲-已知缺陷与更正总账.md)
 *
 * 为什么需要守卫：总账最容易变成"写一次就烂掉"的文档 ——
 *   · 修好的条目没更新状态 → 团队按过时信息排期；
 *   · 新缺陷只写在聊天里 → 下一个人看不到。
 * 所以本用例把几件**可机器判定**的事钉住：状态图例合法、ID 不重复、统计数字与表格行数一致、
 * 以及**回写过的上游文档真的被改了**（⛔ 不许台账说"已回写"而文档没动）。
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const LEDGER = path.join(REPO_ROOT, 'docs', 'app', 'task', 'phase-2', '甲-已知缺陷与更正总账.md');

const readDoc = (rel: string): string => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

/** 表格里某一节的行（用节标题切段，避免跨节误取） */
function rowsOf(doc: string, sectionTitle: string): string[] {
  const start = doc.indexOf(sectionTitle);
  expect(start).toBeGreaterThan(-1);
  const rest = doc.slice(start + sectionTitle.length);
  const end = rest.search(/\n## /);
  const body = end === -1 ? rest : rest.slice(0, end);
  return body.split('\n').filter((line) => /^\|\s*(D|U|P|C|Q)-?\d+\s*\|/.test(line));
}

describe('P2D-04 缺陷与更正总账', () => {
  const doc = fs.readFileSync(LEDGER, 'utf8');

  it('每条状态都在合法图例内（⛔ 没有"大概修好了"这种词）', () => {
    const statuses = doc.match(/`(OPEN|BLOCKED|CLOSED|WONTFIX)`/g) ?? [];
    expect(statuses.length).toBeGreaterThan(0);
    // 表格里不允许出现未加反引号的状态词
    for (const row of doc.split('\n').filter((line) => /^\|\s*(D|U|P)-\d+\s*\|/.test(line))) {
      expect(row).toMatch(/`(OPEN|BLOCKED|CLOSED|WONTFIX)`/);
    }
  });

  it('ID 不重复（同一件事不许两个号）', () => {
    const ids = (doc.match(/^\|\s*([DUP]-\d+)\s*\|/gm) ?? []).map((line) =>
      (line.match(/^\|\s*([DUP]-\d+)/) as RegExpMatchArray)[1]
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(18);
  });

  it('缺陷 10 条 / 未结案 6 条 / 占位 2 条 —— 与 §6 的统计一致', () => {
    expect(rowsOf(doc, '## 1. 缺陷（代码/体验层面）')).toHaveLength(10);
    expect(rowsOf(doc, '## 2. 不能结案的验收项')).toHaveLength(6);
    expect(rowsOf(doc, '## 3. 占位内容')).toHaveLength(2);
    expect(doc).toContain('**缺陷 10 条**');
    expect(doc).toContain('**不能结案 6 条**');
    expect(doc).toContain('**占位 2 条**');
  });

  it('⛔ 没有把未修的说成已修（`OPEN`/`BLOCKED` 必须还在）', () => {
    const rows = doc.split('\n').filter((line) => /^\|\s*D-\d+\s*\|/.test(line));
    const openOrBlocked = rows.filter((row) => /`(OPEN|BLOCKED)`/.test(row));
    const closed = rows.filter((row) => /`CLOSED`/.test(row));
    expect(openOrBlocked.length).toBe(rows.length); // 本轮没有代码改动 → 一条都不该是 CLOSED
    expect(closed).toHaveLength(0);
  });

  it('台账说"已回写"的上游文档**真的被改了**（C-1/C-2 两处 P2C 实测更正）', () => {
    const inventory = readDoc(path.join('docs', 'app', 'product', 'App页面清单与结构盘点.md'));
    // C-1：M-02 的 PUT/POST → PATCH
    expect(inventory).toContain('`PATCH /api/users/me`');
    expect(inventory).not.toContain('`PUT /api/users/me`');
    // C-2：M-04 的 `?mine` 已被更正
    expect(inventory).toContain('无 `GET /api/posts?mine`');
  });

  it('Q10（真机）被点名为**卡住 5 条**的那个原因', () => {
    expect(doc).toContain('Q10');
    expect(doc).toContain('没有设备');
  });
});
