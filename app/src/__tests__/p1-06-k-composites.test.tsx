/**
 * P1-06 · K 层组合（内容与列表）—— 自动化用例
 *
 * 测什么：
 *   S-1 组件契约：变体渲染、行级语义（switch/checkbox 在**行**上）、整卡一条语义
 *   S-4 纯规则：奖牌档位、**null 语义**（后端确实会返回 null）、逐域指标
 *   S-5 结构约束：卡底不得有 NB；无 hex / 无数字字号 / 无自造浮层
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ThemeProvider } from '@/design-system/theme';

import { ListItem, type ListItemVariant } from '@/components/ui/ListItem';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { RankingRow, medalTier } from '@/components/ui/RankingRow';
import {
  EntityCard,
  ENTITY_STATUS_LABEL,
  entityMetrics,
  formatNullablePrice,
  formatNullableScore,
  type EntityCardDomain,
} from '@/components/ui/EntityCard';

const UI_DIR = path.resolve(__dirname, '../components/ui');
const readUi = (file: string): string => fs.readFileSync(path.join(UI_DIR, file), 'utf8');

const K_FILES = [
  'ListItem.tsx',
  'SectionHeader.tsx',
  'Card.tsx',
  'RankingRow.tsx',
  'EntityCard.tsx',
] as const;

const wrap = (node: React.ReactElement) =>
  render(<ThemeProvider source="dark" systemScheme="dark">{node}</ThemeProvider>);

describe('TC-P1-06-1A · K 层 5 个组合件齐备且都消费主题层', () => {
  it.each(K_FILES)('components/ui/%s 存在且非空', (file) => {
    expect(readUi(file).length).toBeGreaterThan(400);
  });

  it('每个组合件都通过 useTheme 取令牌（⛔ 不自己读令牌文件）', () => {
    for (const file of K_FILES) {
      expect(readUi(file)).toContain('useTheme');
    }
  });
});

describe('TC-P1-06-2A · K06 ListItem：5 变体 + 行级语义 + 视觉控件不抢点击', () => {
  it('5 个变体都存在', () => {
    const src = readUi('ListItem.tsx');
    for (const variant of ['nav', 'action', 'toggle', 'select', 'danger'] as ListItemVariant[]) {
      expect(src).toContain(`'${variant}'`);
    }
  });

  it('toggle 变体：**行本身**是 switch，点行只触发一次 onValueChange', async () => {
    const onValueChange = jest.fn();
    const { getByTestId } = await wrap(
      <ListItem
        title="暗色模式"
        variant="toggle"
        toggle={{ value: false, onValueChange }}
        testID="row"
      />
    );
    const row = getByTestId('row');
    expect(row.props.accessibilityRole).toBe('switch');
    expect(row.props.accessibilityState).toMatchObject({ checked: false });

    fireEvent.press(row);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('select 变体：行是 checkbox 并带上 checked', async () => {
    const { getByTestId } = await wrap(
      <ListItem title="全选" variant="select" selected testID="row2" />
    );
    expect(getByTestId('row2').props.accessibilityRole).toBe('checkbox');
    expect(getByTestId('row2').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('nav 变体默认给"可进入"指示；danger 变体存在（标题用危险色）', () => {
    const src = readUi('ListItem.tsx');
    expect(src).toContain('ChevronRight');
    expect(src).toContain("'text-danger'");
  });

  it('⛔ 视觉开关/勾选框**不接管点击、不进无障碍树**（否则真机会双重切换）', () => {
    const src = readUi('ListItem.tsx');
    expect(src).toContain('pointerEvents="none"');
    expect(src).toContain('accessibilityElementsHidden');
  });
});

describe('TC-P1-06-3A · K07 SectionHeader：NB 白名单只取 2px 描边', () => {
  it('用 2px（border_width_brutal）硬描边，⛔ 不是阴影', async () => {
    const { getByTestId } = await wrap(<SectionHeader title="我的帖子" testID="sh" />);
    expect(getByTestId('sh')).toHaveStyle({ borderBottomWidth: 2 });
    expect(readUi('SectionHeader.tsx')).not.toMatch(/shadowColor|shadowOffset|elevation/);
  });

  it('withAction 渲染出动作；plain 不渲染', async () => {
    const withAction = await wrap(
      <SectionHeader title="分区" variant="withAction" actionLabel="更多" testID="sh2" />
    );
    expect(withAction.getByText('更多')).toBeTruthy();

    const plain = await wrap(<SectionHeader title="分区" testID="sh3" />);
    expect(plain.queryByText('更多')).toBeNull();
  });
});

describe('TC-P1-06-4A · K08 Card：⛔ 卡底不得使用 Neo-Brutalism', () => {
  it('源码里没有 NB 的三件套（2px 描边 / 硬偏移 / 阴影）', () => {
    const src = readUi('Card.tsx');
    expect(src).not.toMatch(/border_width_brutal/);
    expect(src).not.toMatch(/borderRightWidth|borderBottomWidth/);
    expect(src).not.toMatch(/shadowColor|shadowOffset|elevation/);
  });

  it('interactive 变体：整卡是**一条**可点语义，并带上 label', async () => {
    const onPress = jest.fn();
    const { getByTestId } = await wrap(
      <Card variant="interactive" accessibilityLabel="二手：自行车" onPress={onPress} testID="card">
        <SectionHeader title="内部标题" />
      </Card>
    );
    const card = getByTestId('card');
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toBe('二手：自行车');
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('TC-P1-06-5A · K12 RankingRow：名次不靠颜色表达', () => {
  it('medalTier：1/2/3 有名次档位，4 起为 null', () => {
    expect(medalTier(1)).toBe('gold');
    expect(medalTier(2)).toBe('silver');
    expect(medalTier(3)).toBe('bronze');
    expect(medalTier(4)).toBeNull();
    expect(medalTier(0)).toBeNull();
  });

  it('medal 变体下**名次数字仍然渲染**（宪法 2.1.1：不得只靠色块）', async () => {
    const { getByText } = await wrap(<RankingRow rank={1} title="最夯单品" variant="medal" testID="r" />);
    expect(getByText('1')).toBeTruthy();
  });

  it('plain 变体在 4 名之后也渲染名次', async () => {
    const { getByText } = await wrap(<RankingRow rank={12} title="榜外" testID="r2" />);
    expect(getByText('12')).toBeTruthy();
  });

  it('可播报标签含名次与指标', async () => {
    const { getByTestId } = await wrap(
      <RankingRow rank={2} title="某某店" metric="4.8（32）" testID="r3" />
    );
    expect(getByTestId('r3').props.accessibilityLabel).toBe('第 2 名，某某店，4.8（32）');
  });
});

describe('TC-P1-06-6A · K17 EntityCard：null 是常态，⛔ 不得当成 0', () => {
  it('formatNullablePrice：null / 非有限数 → 暂无价格；有值 → ¥N', () => {
    expect(formatNullablePrice(null)).toBe('暂无价格');
    expect(formatNullablePrice(undefined)).toBe('暂无价格');
    expect(formatNullablePrice(Number.NaN)).toBe('暂无价格');
    expect(formatNullablePrice(12.5)).toBe('¥12.5');
    expect(formatNullablePrice(0)).toBe('¥0');
  });

  it('formatNullableScore：null → 暂无评分（⛔ 不是 0.0）', () => {
    expect(formatNullableScore(null, 0)).toBe('暂无评分');
    expect(formatNullableScore(undefined)).toBe('暂无评分');
    expect(formatNullableScore(4.75, 32)).toBe('4.8（32）');
    expect(formatNullableScore(4.75, null)).toBe('4.8');
  });

  it('entityMetrics：逐域给出正确指标，且整域都为 null 时给"暂无…"而不是空', () => {
    expect(entityMetrics({ domain: 'food', price: null, score: null, reviewCount: null })).toEqual([
      '暂无价格',
      '暂无评分',
    ]);
    expect(entityMetrics({ domain: 'listing', price: 20, status: 'sold' })).toEqual(['¥20', '已售']);
    expect(entityMetrics({ domain: 'errand', reward: null, status: 'open' })).toEqual([
      '暂无价格',
      '待接',
    ]);
    expect(entityMetrics({ domain: 'review', score: 3.5, reviewCount: 2 })).toEqual(['3.5（2）']);
    expect(entityMetrics({ domain: 'post', status: 'done' })).toEqual(['已完成']);
    expect(entityMetrics({ domain: 'post' })).toEqual([]);
  });

  it('状态映射表覆盖内测用到的全部取值（二手 2 + 跑腿 3）', () => {
    expect(Object.keys(ENTITY_STATUS_LABEL).sort()).toEqual([
      'done',
      'on_sale',
      'open',
      'sold',
      'taken',
    ]);
  });

  it('5 个域都能渲染（域变体不是空壳）', async () => {
    const domains: EntityCardDomain[] = ['post', 'food', 'review', 'listing', 'errand'];
    for (const domain of domains) {
      const view = await wrap(
        <EntityCard
          domain={domain}
          title={`${domain} 标题`}
          price={null}
          reward={null}
          score={null}
          reviewCount={null}
          testID={`ec-${domain}`}
        />
      );
      expect(view.getByTestId(`ec-${domain}`)).toBeTruthy();
      expect(view.getByText(`${domain} 标题`)).toBeTruthy();
    }
  });

  it('⛔ 整卡只给一条语义（§7.3）：label 由 title/subtitle/指标合成', async () => {
    const { getByTestId } = await wrap(
      <EntityCard domain="listing" title="自行车" subtitle="九成新" price={80} status="on_sale" testID="ec" />
    );
    expect(getByTestId('ec').props.accessibilityLabel).toBe('自行车，九成新，¥80，在售');
  });
});

describe('TC-P1-06-7A · 结构约束：5 个组合件无 hex / 无数字字号 / 无自造浮层', () => {
  it('逐文件断言', () => {
    for (const file of K_FILES) {
      const src = readUi(file);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/fontSize\s*:\s*[0-9]/);
      expect(src).not.toMatch(/\bModal\b/);
    }
  });
});
