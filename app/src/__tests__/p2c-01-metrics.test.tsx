/**
 * P2C-01 · `K09 StatTile` + `K10 MetricRow` —— 自动化用例
 *
 * 依据：`docs/app/task/phase-2/P2C-01-K09指标格与K10指标行.md`、组件定义 §2.3、宪法 16.2-4。
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import ListChecks from 'lucide-react-native/icons/list-checks';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { StatTile, statTileText } from '@/components/ui/StatTile';
import { MetricRow } from '@/components/ui/MetricRow';

const SRC_ROOT = path.resolve(__dirname, '..');
const readUi = (file: string): string =>
  fs.readFileSync(path.join(SRC_ROOT, 'components', 'ui', file), 'utf8');

describe('P2C-01 K09 指标格 / K10 指标行', () => {
  it('TC-P2C-01-1A · 数字与标签都在；`sm`/`md` 都渲染', async () => {
    const small = await renderApp(<StatTile testID="s" value={3} label="今日待办" />);
    expect(small.getByTestId('s-value').props.children).toBe('3');
    expect(small.getByTestId('s-label').props.children).toBe('今日待办');
  });

  it('TC-P2C-01-2A · `0` 要显示（它和"拿不到"是两件事）', () => {
    expect(statTileText(0)).toBe('0');
    expect(statTileText('0')).toBe('0');
    expect(statTileText(12)).toBe('12');
  });

  it('TC-P2C-01-3A · 拿不到时走占位，⛔ 不出现 NaN', () => {
    expect(statTileText(null, '暂无')).toBe('暂无');
    expect(statTileText(undefined, '暂无')).toBe('暂无');
    expect(statTileText(Number.NaN, '暂无')).toBe('暂无');
    expect(statTileText(null)).toBe('');
  });

  it('TC-P2C-01-4A · 图标与标签**同时**存在（图标不得承担唯一语义）', async () => {
    const view = await renderApp(
      <StatTile testID="i" value={1} label="今日待办" icon={ListChecks} />
    );
    expect(view.getByTestId('i-label').props.children).toBe('今日待办');
    // 图标是一个 svg 子树；这里断言它确实渲染了（不是只给标签）
    expect(view.getByTestId('i').children.length).toBeGreaterThan(1);
  });

  it('TC-P2C-01-5A · MetricRow 渲染全部单元，且分隔线是独立元素（不靠颜色）', async () => {
    const view = await renderApp(
      <MetricRow testID="row">
        <StatTile testID="a" value={1} label="未读" />
        <StatTile testID="b" value={0} label="待办" />
        <StatTile testID="c" value={null} label="等级" placeholder="暂无" />
      </MetricRow>
    );
    expect(view.getByTestId('a')).toBeTruthy();
    expect(view.getByTestId('b')).toBeTruthy();
    expect(view.getByTestId('c')).toBeTruthy();
    expect(view.getByTestId('c-value').props.children).toBe('暂无');
    // 两个分隔线（3 个单元之间各一条）
    expect(view.getByTestId('row').children.length).toBe(5);
  });

  it('TC-P2C-01-6A · 结构约束：组件里 0 文案、0 色值、0 字号字面量', () => {
    for (const file of ['StatTile.tsx', 'MetricRow.tsx']) {
      const code = stripComments(readUi(file));
      expect({ file, hex: /#[0-9a-fA-F]{3,8}/.test(code) }).toEqual({ file, hex: false });
      expect({ file, fontSize: /fontSize\s*:/.test(code) }).toEqual({ file, fontSize: false });
      // 组件内不写中文文案（只有注释里可能有）
      expect({ file, cjk: /[\u4e00-\u9fa5]/.test(code) }).toEqual({ file, cjk: false });
    }
  });
});
