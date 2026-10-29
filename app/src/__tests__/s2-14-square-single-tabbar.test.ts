/**
 * 阶段4-04 · 广场「只有一条 Tab 导航」的源码断言
 *
 * 宪法 4.8：一级格内的子栏目导航**只能**有一条顶部 Tab 条。
 * 广场改造后上部会收起、Tab 条吸顶，最容易被顺手加出"第二条 Tab 导航"，
 * 所以这里把结构钉死：壳里只有一处 `TopTabStrip`，内容 pane 里一处都没有。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { stripComments } from './helpers/sourceScan';

const SRC_ROOT = path.resolve(__dirname, '..');
const read = (rel: string): string => stripComments(fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8'));

/** 广场的五个内容 pane 各属乙/丙，甲不改它们，但可以断言它们不新增 Tab 条 */
const SQUARE_PANES = [
  'features/square/TodayPane.tsx',
  'features/square/CanteenHome.tsx',
  'features/campus/CampusScreens.tsx',
  'features/errand/ErrandScreens.tsx',
];

describe('广场只有一条二级 Tab 导航', () => {
  it('广场壳里恰好一处 TopTabStrip', () => {
    const source = read('features/square/SquareHome.tsx');
    expect(source.match(/<TopTabStrip\b/g) ?? []).toHaveLength(1);
  });

  it('五个内容 pane 都不自带 Tab 条', () => {
    for (const rel of SQUARE_PANES) {
      expect(read(rel)).not.toMatch(/TopTabStrip/);
    }
  });

  it('收起逻辑仍只有一处实现（纯函数模块被壳引用）', () => {
    const source = read('features/square/SquareHome.tsx');
    expect(source).toMatch(/from '\.\/squareCollapse'/);
    expect(source).toMatch(/<SquarePaneScrollScope\b/);
  });
});
