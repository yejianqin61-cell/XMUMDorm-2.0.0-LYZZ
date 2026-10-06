/**
 * 登记册守卫（`easy-registry` 的机器化）—— TODO.md §六 与 TO-CONFIRM.md 新条目
 *
 * ## 为什么需要它
 * 登记册是**唯一会被反复改写**的文档，它的死法固定：
 *   · **状态行与行数不一致** —— 第一句是读者唯一不核对就信的话，它一烂整册就开始说谎；
 *   · **同一条两个号** / 一个号两行；
 *   · **状态词自创**（"大概修好了"）—— 声明过的词表之外不许有词；
 *   · **正文里出现删除线/轮次号** —— 那是在要求读者从过去重建现在。
 * 本用例把这些**可机器判定**的检查钉住，让"改完忘记更新状态行"当场变红。
 *
 * 依据：`easy-registry` 技能（kind = Work：`待能力`/`待实测`/`待排期`/`进行中`/`已完成`）
 * 与 `docs/app/TODO.md` 文件头自declared 的五个状态词。
 */

import * as fs from 'fs';
import * as path from 'path';

const DOCS_APP = path.resolve(__dirname, '..', '..', '..', 'docs', 'app');
const TODO = path.join(DOCS_APP, 'TODO.md');
const CONFIRM = path.join(DOCS_APP, 'TO-CONFIRM.md');

/** `TODO.md` 文件头声明的状态词 —— 只有这五个 */
const TODO_STATES = ['待能力', '待实测', '待排期', '进行中', '已完成'] as const;

const read = (file: string): string => fs.readFileSync(file, 'utf8');

/** §六 一节的行（标题切段，避免取到 §一…§五 的行） */
function sectionRows(doc: string, heading: string): { id: string; state: string; line: string }[] {
  const start = doc.indexOf(heading);
  expect(start).toBeGreaterThan(-1);
  const rest = doc.slice(start + heading.length);
  const end = rest.indexOf('\n## ');
  const body = end === -1 ? rest : rest.slice(0, end);
  return body
    .split('\n')
    .filter((line) => /^\|\s*TD-\d+\s*\|/.test(line))
    .map((line) => {
      const cells = line.split('|').map((cell) => cell.trim());
      // cells[0] 为空（行首的 `|`），cells[1] = ID，cells[3] = 状态
      return { id: cells[1], state: cells[3], line };
    });
}

describe('登记册守卫（TODO / TO-CONFIRM）', () => {
  const todo = read(TODO);

  it('§六 每行状态都在声明过的五个词里（⛔ 不许自创"大概好了"）', () => {
    const rows = sectionRows(todo, '## 六、Phase 2 甲域交付后的缺陷与待办');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect({ id: row.id, known: (TODO_STATES as readonly string[]).includes(row.state) }).toEqual({
        id: row.id,
        known: true,
      });
    }
  });

  it('§六 的 ID 不重复、且不与 §一…§五 的号冲突（一条只有一个号）', () => {
    const section = sectionRows(todo, '## 六、Phase 2 甲域交付后的缺陷与待办');
    const ids = section.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    // ⚠️ 判据是"**定义行**只有一行"，不是"编号只出现一次" ——
    //    登记册本来就靠**引用**别的条目来避免复述（"每提一次都带上编号"），
    //    所以引用造成的重复是**正确**的；一条挂两行才是错。
    const definingRows = todo
      .split('\n')
      .filter((line) => /^\|\s*TD-\d+\s*\|/.test(line))
      .map((line) => line.split('|')[1].trim());
    const dupes = definingRows.filter((id, index) => definingRows.indexOf(id) !== index);
    expect([...new Set(dupes)]).toEqual([]);
  });

  it('⛔ 状态行与行数一致（改完行必须重算第一句）', () => {
    const rows = sectionRows(todo, '## 六、Phase 2 甲域交付后的缺陷与待办');
    const tally = (state: string): number => rows.filter((row) => row.state === state).length;
    const statusLine = todo
      .split('\n')
      .find((line) => /\*\*现在（\d{4}-\d{2}-\d{2}）\*\*：本节/.test(line)) as string;
    expect(statusLine).toBeTruthy();
    expect(statusLine).toContain(`**${rows.length} 条**`);
    for (const state of TODO_STATES) {
      const count = tally(state);
      if (count > 0) expect({ state, inLine: statusLine.includes(`\`${state}\` ${count}`) }).toEqual({ state, inLine: true });
    }
  });

  it('⛔ §六 正文里没有删除线、没有轮次号（正文只写"现在为真"的东西）', () => {
    const start = todo.indexOf('## 六、Phase 2 甲域交付后的缺陷与待办');
    const body = todo.slice(start);
    expect(body).not.toContain('~~');
    expect(body).not.toMatch(/第[一二三四五六七八九十]+轮/);
    expect(body).not.toContain('previously');
    expect(body).not.toContain('此前');
  });

  it('两册都有变更记录，且在文末（⛔ 变更记录不许跑到第一屏）', () => {
    for (const file of [TODO, CONFIRM]) {
      const doc = read(file);
      const at = doc.indexOf('## 变更记录') >= 0 ? doc.indexOf('## 变更记录') : doc.indexOf('## 六、变更记录');
      expect({ file: path.basename(file), hasLog: at >= 0 }).toEqual({ file: path.basename(file), hasLog: true });
      // 变更记录必须在文档后半段（防止"变更记录在头部"这个反模式）
      expect({ file: path.basename(file), inSecondHalf: at > doc.length / 2 }).toEqual({
        file: path.basename(file),
        inSecondHalf: true,
      });
    }
  });

  it('TO-CONFIRM 的新条目编号连续且不重复（C-20…C-27）', () => {
    const doc = read(CONFIRM);
    const ids = (doc.match(/\*\*C-\d{2}\*\*/g) ?? []).map((token) => token.replace(/\*/g, ''));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ['C-20', 'C-21', 'C-22', 'C-23', 'C-24', 'C-25', 'C-26', 'C-27']) {
      expect({ id, present: ids.includes(id) }).toEqual({ id, present: true });
    }
  });

  it('本册引用的编号都在对方册子里真实存在（⛔ 不许悬空引用）', () => {
    const confirm = read(CONFIRM);
    const referenced = [...new Set((todo.match(/C-\d{2}/g) ?? []))];
    for (const id of referenced) {
      expect({ id, exists: confirm.includes(id) }).toEqual({ id, exists: true });
    }
  });
});
