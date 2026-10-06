/**
 * P2B-05 · 分类切换控件的裁决 —— 守卫用例
 *
 * 依据：`docs/app/task/phase-2/P2B-05-分类切换控件的裁决与回写.md`
 *      · 组件定义里那段 **P2B-05 裁决**（[提案·需所有者签字]）
 *      · 先例：`K21 Tabs` 因">5 项 underline tab 本轮无消费者"被删（同表第 10 行）
 *
 * 这条用例守两件事：
 *   1. **`K22` 没有被偷偷建出来**（无消费者就抽象 = 9.14-③ 的老毛病）；
 *   2. **裁决的前提还成立**（一旦 `C14` 的 `withCount` 被删，那段裁决就过期，必须有人重看）。
 *
 * 它是**结构约束**（S-5），不是渲染测：渲染测测不出"多了一个同语义组件"。
 */
import * as fs from 'fs';
import * as path from 'path';

import { stripComments } from './helpers/sourceScan';

const SRC_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SRC_ROOT, '..', '..');
const COMPONENT_DOC = path.join(REPO_ROOT, 'docs', 'app', 'design', 'App组件类型定义.md');

const readUi = (file: string): string =>
  fs.readFileSync(path.join(SRC_ROOT, 'components', 'ui', file), 'utf8');

describe('P2B-05 分类切换控件的裁决', () => {
  it('TC-P2B-05-1A · `K22 SegmentedTabs` 本轮不建（组件目录里没有它）', () => {
    const dir = path.join(SRC_ROOT, 'components', 'ui');
    const hits = fs
      .readdirSync(dir)
      .filter((name) => /SegmentedTabs/i.test(name));
    expect(hits).toEqual([]);
  });

  it('TC-P2B-05-2A · 组件定义里记着这段裁决（含分工判据与"本轮不建"）', () => {
    const doc = fs.readFileSync(COMPONENT_DOC, 'utf8');
    expect(doc).toContain('P2B-05 裁决');
    expect(doc).toContain('本轮不建');
    // 四条判据必须都在，否则后来者只看到一句"不建"而不知道为什么
    expect(doc).toMatch(/`C14` = 控件/);
    expect(doc).toMatch(/`K22` = 页面级数据切换/);
    expect(doc).toContain('4.8.1-R4');
    expect(doc).toContain('提案·需所有者签字');
  });

  it('TC-P2B-05-3A · 裁决前提仍在：`C14` 必须还具备 `withCount`（否则裁决过期，必须重看）', () => {
    const code = stripComments(readUi('SegmentedControl.tsx'));
    expect(code).toContain('withCount');
    expect(code).toContain('count?: number');
    // 项数硬上限也还在（2–5 项）—— 超了就该换组件，而不是挤一挤
    expect(code).toContain('SEGMENTED_MAX_ITEMS');
  });

  it('TC-P2B-05-4A · 二级导航仍然是 `TopTabStrip` 的唯一职责（三者不得互相冒充）', () => {
    const strip = stripComments(readUi('TopTabStrip.tsx'));
    expect(strip).toContain('SecondaryTabDefinition');
    // 二级导航的唯一集合来源
    expect(strip).toContain('assertNoOverflowMenu');
    // 段控不得承担导航：`C14` 的注释里明确写着不许当导航用
    expect(readUi('SegmentedControl.tsx')).toContain('不把它当导航用');
  });
});
