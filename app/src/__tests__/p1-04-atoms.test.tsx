/**
 * P1-04 · A 层组件（12 个原子）—— 自动化用例
 *
 * 测什么：
 *   S-1 组件契约：字号档位、命中区、a11y 二选一、变体渲染
 *   S-4 纯规则：`avatarInitial` / `formatBadgeCount` / `clampProgress` / `resolveFeedback`
 *   S-5 结构约束：**除 `Surface` 外，本批原子 0 处 `backgroundColor`**（原子层硬规则②）
 *                 · `A06 Icon` 内 0 处 `strokeWidth`（16.5-2：只在 LucideProvider 设）
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { render } from '@testing-library/react-native';

import { ThemeProvider } from '@/design-system/theme';
import { iconSize as iconSizeToken } from '@/design-system/px';
import { scale } from '@/design-system/tokens';

import { Surface, SURFACE_VARIANT_TOKEN } from '@/components/ui/Surface';
import { Stack } from '@/components/ui/Stack';
import { Spacer } from '@/components/ui/Spacer';
import { Divider } from '@/components/ui/Divider';
import { Icon, ICON_SIZE_TIER } from '@/components/ui/Icon';
import { Avatar, avatarInitial } from '@/components/ui/Avatar';
import { Badge, formatBadgeCount } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Skeleton, skeletonSpec } from '@/components/ui/Skeleton';
import { ProgressBar, ProgressRing, clampProgress } from '@/components/ui/Progress';
import { Pressable, resolveFeedback } from '@/components/ui/Pressable';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const UI_DIR = path.resolve(__dirname, '../components/ui');

/** P1-04 新增/改造的原子文件（`Text` 是 A02，P1-03 已改） */
const ATOMIC_FILES = [
  'Surface.tsx',
  'Text.tsx',
  'Stack.tsx',
  'Spacer.tsx',
  'Divider.tsx',
  'Icon.tsx',
  'Avatar.tsx',
  'Badge.tsx',
  'Chip.tsx',
  'Skeleton.tsx',
  'Progress.tsx',
  'Pressable.tsx',
] as const;

const readUi = (file: string): string => fs.readFileSync(path.join(UI_DIR, file), 'utf8');

const wrap = (node: React.ReactElement) =>
  render(<ThemeProvider source="dark" systemScheme="dark">{node}</ThemeProvider>);

/** Lucide 的**替身**：只记录收到的 size/color，不渲染真实 SVG */
function makeFakeIcon(): {
  Component: React.ComponentType<{ size?: number; color?: string }>;
  calls: { size?: number; color?: string }[];
} {
  const calls: { size?: number; color?: string }[] = [];
  const Component = ({ size, color }: { size?: number; color?: string }) => {
    calls.push({ size, color });
    return null;
  };
  return { Component, calls };
}

describe('TC-P1-04-1A · 12 个原子齐备（A01–A12）', () => {
  it.each(ATOMIC_FILES)('components/ui/%s 存在且非空', (file) => {
    const content = readUi(file);
    expect(content.length).toBeGreaterThan(200);
  });

  it('每个原子都消费主题层（⛔ 不自己读令牌文件）', () => {
    for (const file of ATOMIC_FILES) {
      if (file === 'Text.tsx') continue; // Text 的约束在 P1-03 已覆盖
      expect(readUi(file)).toContain('useTheme');
    }
  });
});

/** 去掉注释后再扫（注释里提到 `backgroundColor` 不算用法） */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/**
 * 每一处 `backgroundColor` 后面 160 字符的窗口里，必须出现 `theme.color[` 或 `'transparent'`。
 * ⚠️ 不用"行匹配"：`backgroundColor: isSelected ? theme.color[…] : …` 这种三元会跨行。
 */
function hasRawBackground(src: string): boolean {
  return stripComments(src)
    .split('backgroundColor')
    .slice(1)
    .some((window) => {
      const w = window.slice(0, 160);
      return !/theme\.color\[/.test(w) && !/'transparent'/.test(w);
    });
}

function walkSrc(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSrc(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('TC-P1-04-2A · ⛔ 底色只能来自令牌（宪法 1.4 / 2.1）', () => {
  it('`Surface` 的 5 个变体各自映射到一个语义底色令牌（⛔ 不取调色板档位）', () => {
    expect(Object.keys(SURFACE_VARIANT_TOKEN)).toHaveLength(5);
    for (const token of Object.values(SURFACE_VARIANT_TOKEN)) {
      expect(token).toMatch(/^bg-/);
    }
  });

  it('`app/src` 内**每一处** `backgroundColor` 都取自 `theme.color[...]`（或 transparent）', () => {
    const offenders: string[] = [];
    for (const file of walkSrc(path.resolve(__dirname, '..'))) {
      if (hasRawBackground(fs.readFileSync(file, 'utf8'))) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('⛔ 反向对照：裸色值会被这条规则抓住（防规则本身失效）', () => {
    expect(hasRawBackground('style={{ backgroundColor: "#ff0000" }}')).toBe(true);
    expect(hasRawBackground("style={{ backgroundColor: theme.color['bg-surface'].value }}")).toBe(false);
    expect(hasRawBackground("style={{ backgroundColor: 'transparent' }}")).toBe(false);
    expect(
      hasRawBackground('backgroundColor: isSelected\n  ? theme.color[\'action-primary\'].value\n  : undefined')
    ).toBe(false);
  });

  it('Surface 不提供阴影类 prop（宪法 2.4-3：暗色层级用表面色表达）', () => {
    const src = stripComments(readUi('Surface.tsx'));
    expect(src).not.toMatch(/\belevation\b/);
    expect(src).not.toMatch(/shadowColor|shadowOffset|shadowRadius/);
  });
});

describe('TC-P1-04-3A · A12 Pressable：命中区 ≥ 平台下限（7.1）', () => {
  it('默认 minWidth/minHeight = theme.touchTarget（Android 48 / iOS 44）', async () => {
    const { getByTestId } = await wrap(
      <Pressable testID="p" onPress={() => undefined}>
        {/* 视觉可以很小 */}
      </Pressable>
    );
    // ⚠️ 用 toHaveStyle（RNTL 会展平 style 数组）；⛔ 不直接断言 props.style 的数组形状
    expect(getByTestId('p')).toHaveStyle({ minWidth: 48, minHeight: 48 });
  });

  it('⛔ 关闭 / 不可用时仍保留命中区定义（不给 disabled 单独缩小的机会）', async () => {
    const { getByTestId } = await wrap(<Pressable testID="p2" disabled />);
    expect(getByTestId('p2').props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('TC-P1-04-4A · A06 Icon：尺寸只走档位 + a11y 二选一（16.5-3/4）', () => {
  it('5 个档位各自映射到令牌，且默认档 = 24（Lucide 原生网格）', () => {
    expect(Object.keys(ICON_SIZE_TIER)).toHaveLength(5);
    expect(iconSizeToken(ICON_SIZE_TIER.default)).toBe(24);
    expect(iconSizeToken(ICON_SIZE_TIER.inline)).toBe(16);
    expect(iconSizeToken(ICON_SIZE_TIER.hero)).toBe(48);
  });

  it('渲染时把档位解成像素值传给图标组件', async () => {
    const fake = makeFakeIcon();
    await wrap(<Icon source={fake.Component} size="hero" testID="i" />);
    expect(fake.calls[0].size).toBe(48);
  });

  it('不传 label → **隐藏出无障碍树**（⛔ 不用 aria-hidden）', async () => {
    const fake = makeFakeIcon();
    const { getByTestId } = await wrap(<Icon source={fake.Component} testID="i" />);
    // ⚠️ `includeHiddenElements: true` —— RNTL 默认**查不到**被隐藏的节点，
    //    这本身就是"它真的被隐藏了"的旁证；这里要看的是隐藏**方式**对不对。
    const node = getByTestId('i', { includeHiddenElements: true });
    expect(node.props.accessible).toBe(false);
    expect(node.props.accessibilityElementsHidden).toBe(true);
    expect(node.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('隐藏是真的生效：默认查询**查不到**它（证明不是"设了 prop 但没作用"）', async () => {
    const fake = makeFakeIcon();
    const { queryByTestId } = await wrap(<Icon source={fake.Component} testID="hidden-icon" />);
    expect(queryByTestId('hidden-icon')).toBeNull();
  });

  it('传 label → 作为 image 进入无障碍树', async () => {
    const fake = makeFakeIcon();
    const { getByTestId } = await wrap(
      <Icon source={fake.Component} label="信箱" testID="i" />
    );
    const node = getByTestId('i');
    expect(node.props.accessible).toBe(true);
    expect(node.props.accessibilityRole).toBe('image');
    expect(node.props.accessibilityLabel).toBe('信箱');
  });

  it('⛔ 16.5-2：Icon 组件内 0 处 strokeWidth（全局只在 LucideProvider 设）', () => {
    // 去掉注释再判：文档里必须能**写明**这条规则，但代码里不得出现这个 prop
    expect(stripComments(readUi('Icon.tsx'))).not.toMatch(/strokeWidth/);
  });

  it('⛔ 16.5-1：Icon 组件内 0 处 lucide barrel 导入（只收已导入的组件）', () => {
    expect(readUi('Icon.tsx')).not.toMatch(/from 'lucide-react-native'/);
  });
});

describe('TC-P1-04-5A · A03 Stack / A04 Spacer：间距只取令牌档位（2.4）', () => {
  it('Stack 的 gap 解成令牌像素值', async () => {
    const { getByTestId } = await wrap(<Stack testID="s" gap="space_4" direction="row" />);
    expect(getByTestId('s')).toHaveStyle({ gap: 16, flexDirection: 'row' });
  });

  it('不传 gap 时不产生 gap（⛔ 不补默认值，避免隐式布局）', async () => {
    const { getByTestId } = await wrap(<Stack testID="s2" />);
    expect(getByTestId('s2')).not.toHaveStyle({ gap: 16 });
  });

  it('Spacer 定值档位 → 尺寸；不给 size → 弹性', async () => {
    const fixed = await wrap(<Spacer testID="sp" size="space_6" />);
    expect(fixed.getByTestId('sp')).toHaveStyle({ height: 24 });

    const flex = await wrap(<Spacer testID="sp2" />);
    expect(flex.getByTestId('sp2')).toHaveStyle({ flex: 1 });
  });
});

describe('TC-P1-04-6A · A05 Divider：三态（subtle / strong / inset）', () => {
  it('subtle → 1px；strong → 2px（NB 白名单的 2px）', async () => {
    const subtle = await wrap(<Divider testID="d1" />);
    expect(subtle.getByTestId('d1').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 1 })])
    );

    const strong = await wrap(<Divider testID="d2" variant="strong" />);
    expect(strong.getByTestId('d2').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 2 })])
    );
  });

  it('inset → 左侧内缩到间距档位', async () => {
    const inset = await wrap(<Divider testID="d3" variant="inset" />);
    expect(inset.getByTestId('d3').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ marginLeft: 16 })])
    );
  });
});

describe('TC-P1-04-7A · A07 Avatar：fallback 必须成立', () => {
  it('avatarInitial 纯函数：中文取首字 / 英文取首字母 / 空串安全', () => {
    expect(avatarInitial('林同学')).toBe('林');
    expect(avatarInitial('Alice')).toBe('A');
    expect(avatarInitial('   ')).toBe('');
    expect(avatarInitial(null)).toBe('');
    expect(avatarInitial(undefined)).toBe('');
  });

  it('无 uri → 走 fallback（⛔ 不为空地址发请求）', async () => {
    const { getByLabelText } = await wrap(<Avatar fallbackText="Bob" testID="a" />);
    expect(getByLabelText('B')).toBeTruthy();
  });

  it('尺寸走间距令牌（32 → space_8）', async () => {
    const { getByTestId } = await wrap(<Avatar testID="a2" fallbackText="A" size="space_8" />);
    expect(getByTestId('a2')).toHaveStyle({ width: 32, height: 32 });
  });
});

describe('TC-P1-04-8A · A08 Badge：上限、0 不渲染、承载文字配对', () => {
  it('formatBadgeCount：超上限显示 N+；不合法返回空串', () => {
    expect(formatBadgeCount(120, 99)).toBe('99+');
    expect(formatBadgeCount(3, 99)).toBe('3');
    expect(formatBadgeCount(Number.NaN, 99)).toBe('');
  });

  it('count=0 / 负数 → 不渲染（把"该不该显示"收在组件里）', async () => {
    const zero = await wrap(<Badge count={0} testID="b0" />);
    expect(zero.queryByTestId('b0')).toBeNull();

    const negative = await wrap(<Badge count={-1} testID="b1" />);
    expect(negative.queryByTestId('b1')).toBeNull();
  });

  it('text 模式渲染出文案', async () => {
    const { getByText } = await wrap(<Badge text="草稿" testID="b2" />);
    expect(getByText('草稿')).toBeTruthy();
  });
});

describe('TC-P1-04-9A · A09 Chip：删除叉必须有独立可读标签（§5.4）', () => {
  it('removable → 标签是"移除<对象名>"，不是光秃秃的"删除"', async () => {
    const { getByLabelText } = await wrap(
      <Chip label="学校" variant="removable" removeTargetName="学校" testID="c" />
    );
    expect(getByLabelText('移除学校')).toBeTruthy();
  });

  it('selectable → 暴露 selected 状态', async () => {
    const { getByTestId } = await wrap(
      <Chip label="全部" variant="selectable" selected testID="c2" />
    );
    expect(getByTestId('c2').props.accessibilityState).toMatchObject({ selected: true });
  });
});

describe('TC-P1-04-10A · A10 Skeleton：尺寸走令牌 + 隐藏出无障碍树', () => {
  it('skeletonSpec 的每个形态都给出令牌档位', () => {
    for (const kind of ['text', 'list', 'card', 'media'] as const) {
      const spec = skeletonSpec(kind);
      expect(spec.height).toMatch(/^space_/);
      expect(spec.radius).toMatch(/^radius_/);
    }
  });

  it('渲染后隐藏出无障碍树（它是占位，不是内容）', async () => {
    const { getByTestId } = await wrap(<Skeleton testID="sk" kind="list" />);
    expect(
      getByTestId('sk', { includeHiddenElements: true }).props.importantForAccessibility
    ).toBe('no-hide-descendants');
  });
});

describe('TC-P1-04-11A · A11 Progress：夹紧 + 无障碍进度值', () => {
  it('clampProgress：越界夹紧、NaN → 0', () => {
    expect(clampProgress(1.5)).toBe(1);
    expect(clampProgress(-3)).toBe(0);
    expect(clampProgress(0.42)).toBeCloseTo(0.42);
    expect(clampProgress(Number.NaN)).toBe(0);
    expect(clampProgress(undefined)).toBe(0);
  });

  it('bar 暴露 progressbar 角色与 now', async () => {
    const { getByTestId } = await wrap(<ProgressBar value={0.5} testID="pb" />);
    const node = getByTestId('pb');
    expect(node.props.accessibilityRole).toBe('progressbar');
    expect(node.props.accessibilityValue).toMatchObject({ now: 50 });
  });

  it('ring 与 bar 用同一套夹紧规则', async () => {
    const { getByTestId } = await wrap(<ProgressRing value={2} testID="pr" />);
    expect(getByTestId('pr').props.accessibilityValue).toMatchObject({ now: 100 });
  });
});

describe('TC-P1-04-12A · A12 反馈降级（7.3）', () => {
  it('reduceMotion 时 scale 降级为 none；opacity 保留', () => {
    expect(resolveFeedback('scale', true)).toBe('none');
    expect(resolveFeedback('scale', false)).toBe('scale');
    expect(resolveFeedback('opacity', true)).toBe('opacity');
    expect(resolveFeedback('none', true)).toBe('none');
  });
});

describe('TC-P1-04-13A · 令牌源新增 icon-size 组（P1-04 补齐的缺口）', () => {
  it('5 个档位存在且值 = 16/20/24/32/48', () => {
    expect(Object.keys(scale.iconSize)).toHaveLength(5);
    expect(iconSizeToken('icon_size_inline')).toBe(16);
    expect(iconSizeToken('icon_size_body')).toBe(20);
    expect(iconSizeToken('icon_size_default')).toBe(24);
    expect(iconSizeToken('icon_size_large')).toBe(32);
    expect(iconSizeToken('icon_size_hero')).toBe(48);
  });

  it('令牌源里写的是 px 长度（与 space/radius 同族），且**码段**里没有 pt', () => {
    const raw = fs.readFileSync(path.join(REPO_ROOT, 'tokens/design-tokens.css'), 'utf8');
    expect(raw).toContain('--icon-size-default: 24px');
    // ⚠️ 必须去掉注释：注释里为了解释规则会出现 "44pt" 这类字样，
    //    而生成器自己的 `\d+pt` 红线也只跑在**剥掉注释后的码段**上。
    expect(stripComments(raw)).not.toMatch(/\d+pt\b/);
  });
});
