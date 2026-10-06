/**
 * P2C-02 · `K15 LevelBadge` + `K16 ExpBar` —— 自动化用例
 *
 * 依据：`docs/app/task/phase-2/P2C-02-K15等级徽章与K16经验条.md`、组件定义 §2.3、宪法 16（禁 Emoji 图标）。
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { LEVEL_MAX, LEVEL_MIN, LevelBadge, clampLevel } from '@/components/ui/LevelBadge';
import { ExpBar, clampProgress } from '@/components/ui/ExpBar';

const SRC_ROOT = path.resolve(__dirname, '..');
const readUi = (file: string): string =>
  fs.readFileSync(path.join(SRC_ROOT, 'components', 'ui', file), 'utf8');

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

describe('P2C-02 K15 等级徽章 / K16 经验条', () => {
  it('TC-P2C-02-1A · `iconWithName` 显示等级数字与词条名；`icon` 形态只显示数字', async () => {
    const withName = await renderApp(
      <LevelBadge testID="lv" level={3} name="贡献者" variant="iconWithName" />
    );
    expect(withName.getByTestId('lv-level').props.children).toBe('3');
    expect(withName.getByTestId('lv-name').props.children).toBe('贡献者');
  });

  it('TC-P2C-02-1B · `icon` 形态不显示名字（名字是页面给的词条，不是组件写死的）', async () => {
    const only = await renderApp(<LevelBadge testID="lv" level={3} name="贡献者" />);
    expect(only.getByTestId('lv-level').props.children).toBe('3');
    expect(only.queryByTestId('lv-name')).toBeNull();
  });

  it('TC-P2C-02-2A · 等级夹紧到 1..6（⛔ 不出现 Lv0 / Lv7 / NaN）', () => {
    expect(clampLevel(0)).toBe(LEVEL_MIN);
    expect(clampLevel(-3)).toBe(LEVEL_MIN);
    expect(clampLevel(7)).toBe(LEVEL_MAX);
    expect(clampLevel(6)).toBe(LEVEL_MAX);
    expect(clampLevel(Number.NaN)).toBe(LEVEL_MIN);
    expect(clampLevel('3')).toBe(3);
    expect(clampLevel(3.9)).toBe(3);
  });

  it('TC-P2C-02-3A · ⛔ 组件里 0 个 Emoji、也不引用后端的 `badgeEmoji`', () => {
    for (const file of ['LevelBadge.tsx', 'ExpBar.tsx']) {
      const source = fs.readFileSync(path.join(SRC_ROOT, 'components', 'ui', file), 'utf8');
      const code = stripComments(source);
      expect({ file, emoji: EMOJI_RE.test(code) }).toEqual({ file, emoji: false });
      expect({ file, badgeEmoji: code.includes('badgeEmoji') }).toEqual({ file, badgeEmoji: false });
    }
  });

  it('TC-P2C-02-4A · 进度 0 / 1 与文字原样显示（文字由页面给）', async () => {
    const view = await renderApp(<ExpBar testID="exp" progress={0.5} text="12/200" variant="full" />);
    expect(view.getByTestId('exp-bar')).toBeTruthy();
    expect(view.getByTestId('exp-text').props.children).toBe('12/200');
    expect(clampProgress(0)).toBe(0);
    expect(clampProgress(1)).toBe(1);
  });

  it('TC-P2C-02-5A · 进度夹紧：越界与非数（⛔ 不出现 NaN / 溢出）', () => {
    expect(clampProgress(1.5)).toBe(1);
    expect(clampProgress(-1)).toBe(0);
    expect(clampProgress(Number.NaN)).toBe(0);
    expect(clampProgress(undefined)).toBe(0);
    expect(clampProgress('0.25')).toBe(0.25);
  });

  it('TC-P2C-02-6A · 结构约束：组件里 0 中文文案、0 色值、0 字号字面量', () => {
    for (const file of ['LevelBadge.tsx', 'ExpBar.tsx']) {
      const code = stripComments(readUi(file));
      expect({ file, hex: /#[0-9a-fA-F]{3,8}/.test(code) }).toEqual({ file, hex: false });
      expect({ file, fontSize: /fontSize\s*:/.test(code) }).toEqual({ file, fontSize: false });
      expect({ file, cjk: /[\u4e00-\u9fa5]/.test(code) }).toEqual({ file, cjk: false });
    }
  });
});
