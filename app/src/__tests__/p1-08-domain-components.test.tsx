/**
 * P1-08 · 切片必经域组件（10 个）—— 自动化用例
 *
 * 测什么：
 *   S-1 组件契约：状态三通道、a11y 角色/状态、匿名投影、跳转分发
 *   S-4 纯规则：非线性权重、宫格列数、TOC 提取、评论树分组、跳转安全边界
 *   S-5 结构约束：匿名域**结构上没有身份字段**、无 hex/数字字号、0 处写死文案
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { fireEvent, userEvent } from '@testing-library/react-native';

import { useTheme, type Theme } from '@/design-system/theme';
import { scale } from '@/design-system/tokens';
import { textStyleForRole, TEXT_ROLES } from '@/design-system/typography';
import { stripComments } from './helpers/sourceScan';
import { renderApp } from './helpers/renderApp';

import { RATING_TIERS, RatingScale, ratingTierForWeight, ratingWeightFor } from '@/components/ui/RatingScale';
import { StarRating, clampStars, STAR_MAX, STAR_MIN } from '@/components/ui/StarRating';
import { MediaGrid, mediaGridColumns } from '@/components/ui/MediaGrid';
import {
  BannerSlot,
  resolveBannerTarget,
  shouldAutoRotate,
  type Banner,
} from '@/components/ui/BannerSlot';
import { CommentItem, commentAuthorLabel, type CommentAuthor } from '@/components/ui/CommentItem';
import {
  CommentThread,
  canReplyTo,
  groupComments,
  visibleReplies,
  type CommentNode,
} from '@/components/ui/CommentThread';
import { CommentComposer } from '@/components/ui/CommentComposer';
import { QuickActionGrid, quickActionColumns, type QuickAction } from '@/components/ui/QuickActionGrid';
import { MarkdownReader, extractToc, markdownStyles, slugifyHeading, tocIndentKey } from '@/components/ui/MarkdownReader';
import { SchoolSystemCard, SESSION_STATE_SPEC } from '@/components/ui/SchoolSystemCard';
import Wrench from 'lucide-react-native/icons/wrench';

const UI_DIR = path.resolve(__dirname, '../components/ui');
const readUi = (file: string): string => fs.readFileSync(path.join(UI_DIR, file), 'utf8');

const FILES = [
  'RatingScale.tsx',
  'StarRating.tsx',
  'MediaGrid.tsx',
  'BannerSlot.tsx',
  'CommentItem.tsx',
  'CommentThread.tsx',
  'CommentComposer.tsx',
  'QuickActionGrid.tsx',
  'MarkdownReader.tsx',
  'SchoolSystemCard.tsx',
] as const;

const wrap = (node: React.ReactElement) =>
  renderApp(node);

const wrapInScreen = (node: React.ReactElement) =>
  renderApp(node, { inScreen: true });

describe('TC-P1-08-1A · 10 个域组件齐备且都消费主题层', () => {
  it.each(FILES)('components/ui/%s 存在且非空', (file) => {
    expect(readUi(file).length).toBeGreaterThan(400);
  });

  it('每个文件要么用 useTheme，要么是**只做委托**的壳（有据可查）', () => {
    // ⛔ `CommentComposer` 自己不画任何东西（全部委托给 `O08 InputSheet`），
    //    因此它**不该**有主题依赖 —— 这是设计，不是遗漏。
    const THEME_FREE = ['CommentComposer.tsx'];
    for (const file of FILES) {
      const src = readUi(file);
      if (THEME_FREE.includes(file)) {
        expect(src).toContain("from './InputSheet'");
      } else {
        expect(src).toContain('useTheme');
      }
    }
  });
});

describe('TC-P1-08-2A · D11 RatingScale：**非线性**权重（⛔ 不得被星级代替）', () => {
  it('5 档权重严格等于后端口径 10/7/4/1/−1', () => {
    expect(RATING_TIERS.map((tier) => tier.weight)).toEqual([10, 7, 4, 1, -1]);
    expect(RATING_TIERS.map((tier) => tier.key)).toEqual(['hot', 'top', 'above', 'npc', 'dead']);
  });

  it('**权重不是线性刻度**（相邻差不是常数）—— 这正是不能用 D10 的原因', () => {
    const weights = RATING_TIERS.map((tier) => tier.weight);
    const diffs = weights.slice(1).map((w, i) => weights[i] - w);
    expect(new Set(diffs).size).toBeGreaterThan(1);
  });

  it('权重 ↔ 档位往返一致；未知权重返回 undefined（⛔ 不猜最近档）', () => {
    for (const tier of RATING_TIERS) {
      expect(ratingTierForWeight(tier.weight)?.key).toBe(tier.key);
      expect(ratingWeightFor(tier.key)).toBe(tier.weight);
    }
    expect(ratingTierForWeight(5)).toBeUndefined();
    expect(ratingWeightFor('nope' as never)).toBeUndefined();
  });

  it('可写形态：点某一档回调该档的 key', async () => {
    const onChange = jest.fn();
    const view = await wrap(<RatingScale value={null} onChange={onChange} testID="rs" />);
    fireEvent.press(view.getByTestId('rs-hot'));
    expect(onChange).toHaveBeenCalledWith('hot');
  });

  it('只读形态：选中项为 checked 且整体不可交互', async () => {
    const view = await wrap(<RatingScale value="top" testID="rs2" />);
    expect(view.getByTestId('rs2-top').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: true,
    });
  });

  it('档位名与权重都要能播报（权重是排序口径）', async () => {
    const view = await wrap(<RatingScale value={null} testID="rs3" />);
    expect(view.getByTestId('rs3-dead').props.accessibilityLabel).toContain('权重 -1');
  });
});

describe('TC-P1-08-3A · D10 StarRating：1–5 星（课评两组）', () => {
  it('clampStars：非数字 → null（⛔ 不把"没评"变成 0 分）；越界夹到 1–5', () => {
    expect(clampStars(null)).toBeNull();
    expect(clampStars(undefined)).toBeNull();
    expect(clampStars(Number.NaN)).toBeNull();
    expect(clampStars(0)).toBe(STAR_MIN);
    expect(clampStars(3)).toBe(3);
    expect(clampStars(4.4)).toBe(4);
    expect(clampStars(9)).toBe(STAR_MAX);
  });

  it('单组渲染 5 个星，可点回调；暴露 adjustable + value', async () => {
    const onChange = jest.fn();
    const view = await wrap(<StarRating value={2} label="评分" onChange={onChange} testID="sr" />);
    expect(view.getAllByRole('adjustable').length).toBe(1);
    fireEvent.press(view.getByLabelText('5'));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('两组（评分 + 难度）：各自独立渲染', async () => {
    const view = await wrap(
      <StarRating
        groups={[
          { key: 'rating', label: '评分', value: 4 },
          { key: 'difficulty', label: '难度', value: 2 },
        ]}
        testID="sr2"
      />
    );
    expect(view.getAllByRole('adjustable').length).toBe(2);
    expect(view.getByText('评分')).toBeTruthy();
    expect(view.getByText('难度')).toBeTruthy();
  });
});

describe('TC-P1-08-4A · K18 MediaGrid：列数由**张数**决定', () => {
  it('mediaGridColumns 覆盖 0–9', () => {
    expect(mediaGridColumns(0)).toBe(0);
    expect(mediaGridColumns(1)).toBe(1);
    expect(mediaGridColumns(2)).toBe(2);
    expect(mediaGridColumns(3)).toBe(3);
    expect(mediaGridColumns(4)).toBe(2);
    expect(mediaGridColumns(5)).toBe(3);
    expect(mediaGridColumns(9)).toBe(3);
  });

  it('有替代文本 → 是 image 且可读', async () => {
    const labeled = await wrap(
      <MediaGrid uris={['https://a/1.jpg']} alt={['食堂招牌菜']} testID="mg" />
    );
    expect(labeled.getByTestId('mg-0').props.accessibilityRole).toBe('image');
    expect(labeled.getByTestId('mg-0').props.accessibilityLabel).toBe('食堂招牌菜');
  });

  it('没有替代文本 → 整块隐藏出无障碍树（⛔ 不播报"图片"噪音）', async () => {
    const decorative = await wrap(<MediaGrid uris={['https://a/1.jpg']} testID="mg2" />);
    // ⚠️ RNTL 默认查询**不返回被 a11y 隐藏的节点**（P1-04 已记过这条），
    //    所以这里必须显式 `includeHiddenElements` —— 这同时正好证明隐藏生效
    expect(decorative.getByTestId('mg2-0', { includeHiddenElements: true })).toBeTruthy();
    expect(decorative.queryByTestId('mg2-0')).toBeNull();
  });

  it('hero 形态恒为 1 列', () => {
    const src = readUi('MediaGrid.tsx');
    expect(src).toContain("variant === 'hero' ? 1");
  });
});

describe('TC-P1-08-5A · D24 BannerSlot：跳转安全边界 + 轮播约束 + 上报', () => {
  it('link_type 分发：https **只放行 https://**（http/javascript/data 一律拒绝）', () => {
    expect(resolveBannerTarget({ linkType: 'https', linkValue: 'https://a.com/x' })).toEqual({
      kind: 'external',
      url: 'https://a.com/x',
    });
    expect(resolveBannerTarget({ linkType: 'https', linkValue: 'http://a.com' })).toEqual({ kind: 'none' });
    expect(resolveBannerTarget({ linkType: 'https', linkValue: 'javascript:alert(1)' })).toEqual({ kind: 'none' });
    expect(resolveBannerTarget({ linkType: 'https', linkValue: 'data:text/html,x' })).toEqual({ kind: 'none' });
    expect(resolveBannerTarget({ linkType: 'https', linkValue: null })).toEqual({ kind: 'none' });
  });

  it('internal 只放行站内路径（⛔ 绝对 URL 与协议相对地址都不行）', () => {
    expect(resolveBannerTarget({ linkType: 'internal', linkValue: '/shops/3' })).toEqual({
      kind: 'internal',
      path: '/shops/3',
    });
    expect(resolveBannerTarget({ linkType: 'internal', linkValue: '//evil.com' })).toEqual({ kind: 'none' });
    expect(resolveBannerTarget({ linkType: 'internal', linkValue: 'https://evil.com' })).toEqual({ kind: 'none' });
  });

  it('实体类交给页面路由（组件不认识路由表）', () => {
    expect(resolveBannerTarget({ linkType: 'shop', linkValue: '7' })).toEqual({
      kind: 'entity',
      entity: 'shop',
      id: '7',
    });
    expect(resolveBannerTarget({ linkType: 'region', linkValue: '' })).toEqual({ kind: 'none' });
    expect(resolveBannerTarget({ linkType: 'none', linkValue: '/x' })).toEqual({ kind: 'none' });
  });

  it('shouldAutoRotate：单张不转；减弱动态不转；多张且允许才转', () => {
    expect(shouldAutoRotate({ count: 1, autoRotate: true, reduceMotion: false })).toBe(false);
    expect(shouldAutoRotate({ count: 3, autoRotate: true, reduceMotion: true })).toBe(false);
    expect(shouldAutoRotate({ count: 3, autoRotate: false, reduceMotion: false })).toBe(false);
    expect(shouldAutoRotate({ count: 3, autoRotate: true, reduceMotion: false })).toBe(true);
  });

  it('点击同时触发曝光/点击上报与打开回调', async () => {
    const onClick = jest.fn();
    const onOpen = jest.fn();
    const banner: Banner = {
      id: 1,
      imageUri: 'https://a/1.jpg',
      label: '新学期活动',
      linkType: 'https',
      linkValue: 'https://a.com',
    };
    const view = await wrap(
      <BannerSlot banners={[banner]} autoRotate={false} onClick={onClick} onOpen={onOpen} testID="bn" />
    );
    fireEvent.press(view.getByTestId('bn-1'));
    expect(onClick).toHaveBeenCalledWith(1);
    expect(onOpen).toHaveBeenCalledWith(banner, { kind: 'external', url: 'https://a.com' });
  });

  it('⛔ **不展示排期**：源码里没有 starts_at / ends_at（后端写不进这两个字段）', () => {
    const src = stripComments(readUi('BannerSlot.tsx'));
    expect(src).not.toContain('starts_at');
    expect(src).not.toContain('ends_at');
  });
});

describe('TC-P1-08-6A · D02 CommentItem：**匿名域结构上没有身份字段**', () => {
  it('匿名投影的类型里只有 kind（⛔ 不是 name+anonymous 布尔）', () => {
    const src = stripComments(readUi('CommentItem.tsx'));
    expect(src).toMatch(/\{ kind: 'anonymous' \}/);
    // 不允许出现"名字与匿名并存"的形状
    expect(src).not.toMatch(/name\?[^;]*anonymous/);
  });

  it('commentAuthorLabel：匿名只给匿名文案，不回退成昵称', () => {
    expect(commentAuthorLabel({ kind: 'anonymous' }, '匿名')).toBe('匿名');
    expect(commentAuthorLabel({ kind: 'named', name: '张三' }, '匿名')).toBe('张三');
  });

  it('匿名条目**不渲染头像位**（连占位都不给）', async () => {
    const view = await wrap(
      <CommentItem
        author={{ kind: 'anonymous' }}
        content="内容"
        createdAtLabel="刚刚"
        labels={{ anonymous: '匿名', deleteLabel: '删除', replyLabel: '回复', likeLabel: '赞' }}
        testID="ci"
      />
    );
    expect(view.getByText('匿名')).toBeTruthy();
    // 没有 user 头像（Avatar 的 fallback 文字不会出现）
    expect(view.queryByText('张')).toBeNull();
  });

  it('depth=1 时**没有回复入口**（仅二级）', async () => {
    const onReply = jest.fn();
    const view = await wrap(
      <CommentItem
        author={{ kind: 'anonymous' }}
        content="回复"
        createdAtLabel="刚刚"
        depth={1}
        onReply={onReply}
        labels={{ anonymous: '匿名', deleteLabel: '删除', replyLabel: '回复', likeLabel: '赞' }}
      />
    );
    expect(view.queryByText('回复')).toBeTruthy(); // 正文里有"回复"两字
    expect(view.queryByLabelText('回复')).toBeNull(); // 但没有回复按钮
  });

  it('can_delete 才显示删除入口', async () => {
    const withDelete = await wrap(
      <CommentItem
        author={{ kind: 'anonymous' }}
        content="x"
        createdAtLabel="刚刚"
        canDelete
        onDelete={() => undefined}
        labels={{ anonymous: '匿名', deleteLabel: '删除', replyLabel: '回复', likeLabel: '赞' }}
      />
    );
    expect(withDelete.getByLabelText('删除')).toBeTruthy();
  });
});

describe('TC-P1-08-7A · D01 CommentThread：分页/两级/组内展开', () => {
  const node = (id: string, depth: 0 | 1, parentId: string | null): CommentNode => ({
    id,
    parentId,
    depth,
    author: { kind: 'anonymous' },
    content: `内容${id}`,
    createdAtLabel: '刚刚',
  });

  it('canReplyTo：只有一级可回复', () => {
    expect(canReplyTo(0)).toBe(true);
    expect(canReplyTo(1)).toBe(false);
    expect(canReplyTo(2)).toBe(false);
  });

  it('groupComments：一级带回复；**孤儿回复不丢**（分页时必然出现）', () => {
    const groups = groupComments([node('a', 0, null), node('a1', 1, 'a'), node('x1', 1, 'missing')]);
    expect(groups).toHaveLength(2);
    expect(groups[0].root.id).toBe('a');
    expect(groups[0].replies.map((r) => r.id)).toEqual(['a1']);
    expect(groups[1].root.id).toBe('x1');
  });

  it('visibleReplies：折叠时只给前 N 条，展开后全给', () => {
    const replies = [node('r1', 1, 'a'), node('r2', 1, 'a'), node('r3', 1, 'a')];
    expect(visibleReplies(replies, false, 2).map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(visibleReplies(replies, true, 2)).toHaveLength(3);
    expect(visibleReplies(replies, false, 0)).toHaveLength(0);
  });

  it('渲染：一级有回复入口，回复项**没有**；折叠时出现"展开其余 N 条"', async () => {
    const onReply = jest.fn();
    const view = await wrap(
      <CommentThread
        nodes={[node('a', 0, null), node('a1', 1, 'a'), node('a2', 1, 'a'), node('a3', 1, 'a')]}
        labels={{
          anonymous: '匿名',
          deleteLabel: '删除',
          replyLabel: '回复',
          likeLabel: '赞',
          moreReplies: (n) => `展开其余 ${n} 条`,
          collapse: '收起',
        }}
        onReply={onReply}
        testID="ct"
      />
    );
    expect(view.getByText('展开其余 1 条')).toBeTruthy();
    // 回复项（depth=1）不该有回复按钮：整棵树里回复按钮数量应为 1（只有一级那条）
    expect(view.getAllByLabelText('回复')).toHaveLength(1);

    // ⚠️ **必须用 `userEvent`**：实测 `fireEvent.press` 会调用 handler，但
    //    **不会把 setState 引起的重渲染冲出来**（所以 UI 断言会假失败）。
    //    断言"回调被调用"时 `fireEvent` 够用；断言"界面变了"就必须用 userEvent。
    const user = userEvent.setup();
    await user.press(view.getByTestId('ct-a-toggle'));
    expect(view.getByText('收起')).toBeTruthy();
  });
});

describe('TC-P1-08-8A · D03 CommentComposer：匿名域不回显被回复者身份', () => {
  it('匿名域：回复上下文只给不含身份的文案', async () => {
    const view = await wrapInScreen(
      <CommentComposer
        value=""
        sendLabel="发送"
        onSend={() => undefined}
        replyContext={{
          kind: 'anonymous',
          anonymousLabel: '正在回复一条评论',
          cancelLabel: '取消回复',
          onCancel: () => undefined,
        }}
        testID="cc"
      />
    );
    expect(view.getByText('正在回复一条评论')).toBeTruthy();
  });

  it('命名域才显示"正在回复 X"', async () => {
    const view = await wrapInScreen(
      <CommentComposer
        value=""
        sendLabel="发送"
        onSend={() => undefined}
        replyContext={{
          kind: 'named',
          label: '正在回复 张三',
          cancelLabel: '取消回复',
          onCancel: () => undefined,
        }}
        testID="cc2"
      />
    );
    expect(view.getByText('正在回复 张三')).toBeTruthy();
  });

  it('上限由页面注入：给了才出现计数器（⛔ 组件不内置任何域的限额）', () => {
    const src = stripComments(readUi('CommentComposer.tsx'));
    expect(src).toContain('maxLength');
    // 组件里不得出现具体限额数字
    expect(src).not.toMatch(/\b(500|800|1200|3000)\b/);
  });
});

describe('TC-P1-08-9A · K11 QuickActionGrid：列数由项数决定', () => {
  it('quickActionColumns', () => {
    expect(quickActionColumns(0, 'grid')).toBe(0);
    expect(quickActionColumns(2, 'grid')).toBe(2);
    expect(quickActionColumns(3, 'grid')).toBe(3);
    expect(quickActionColumns(4, 'grid')).toBe(2);
    expect(quickActionColumns(7, 'grid')).toBe(4);
    expect(quickActionColumns(7, 'list')).toBe(1);
  });

  it('渲染入口、可点、带角标；disabled 不触发', async () => {
    const onPress = jest.fn();
    const disabledPress = jest.fn();
    const actions: QuickAction[] = [
      { key: 'ac', label: '教务 AC', icon: Wrench, onPress, badgeCount: 3 },
      { key: 'x', label: '停用', icon: Wrench, onPress: disabledPress, disabled: true },
    ];
    const view = await wrap(<QuickActionGrid actions={actions} testID="qa" />);
    fireEvent.press(view.getByTestId('qa-ac'));
    expect(onPress).toHaveBeenCalledTimes(1);
    fireEvent.press(view.getByTestId('qa-x'));
    expect(disabledPress).not.toHaveBeenCalled();
  });
});

describe('TC-P1-08-10A · D18 MarkdownReader：TOC 自建 + 视觉只来自令牌', () => {
  it('extractToc：**跳过围栏代码块里的 #**（最容易错的一点）', () => {
    const md = ['# 标题一', '```', '# 这不是标题', '```', '## 标题二', '普通段落'].join('\n');
    expect(extractToc(md).map((e) => e.text)).toEqual(['标题一', '标题二']);
  });

  it('extractToc：去掉标题里的行内标记（⛔ TOC 里不该出现星号）', () => {
    const toc = extractToc('## **加粗**与`代码`标题');
    expect(toc[0].text).toBe('加粗与代码标题');
  });

  it('slugifyHeading：重复标题自动加序号；空标题有兜底', () => {
    const taken = new Set<string>();
    const first = slugifyHeading('Hello World', taken);
    taken.add(first);
    expect(first).toBe('hello-world');
    expect(slugifyHeading('Hello World', taken)).toBe('hello-world-2');
    expect(slugifyHeading('！！！')).toBe('section');
  });

  it('TOC 缩进取**令牌档位**（⛔ 不做 space × 层数 的算术）', () => {
    expect(tocIndentKey(1)).toBe('space_1');
    expect(tocIndentKey(3)).toBe('space_4');
    expect(tocIndentKey(99)).toBe('space_1');
  });

  it('markdownStyles：**颜色只来自颜色令牌**、数字都落在令牌取值集合内', async () => {
    let captured: Theme | null = null;
    function Probe(): React.ReactElement | null {
      captured = useTheme();
      return null;
    }
    await renderApp(<Probe />);
    const theme = captured as unknown as Theme;
    const styles = markdownStyles(theme);

    // ⚠️ 令牌的**值本身就是 hex**（如 `#f2f4f9`），所以判据不是"没有 hex"，
    //    而是"**每个颜色都必须是某个颜色令牌的值**"。
    const allowedColors = new Set(Object.values(theme.color).map((token) => token.value));
    // ⚠️ 两个坑：
    //   ① `theme.space/radius/borderWidth` 是**取值函数**，对函数取 `Object.values` 得到空数组；
    //   ② `scale.*` 里存的是 **CSS 字符串**（`"8px"`），而 `theme.space()` 给的是**数字**（`8`）
    //      —— 所以必须先把 px 字符串解析成数字，否则判据永远不匹配。
    const pxToNumber = (value: unknown): number | null => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const matched = /^(-?\d+(?:\.\d+)?)px$/.exec(value);
        return matched ? Number(matched[1]) : null;
      }
      return null;
    };
    const allowedNumbers = new Set<number>(
      [
        ...Object.values(scale.space),
        ...Object.values(scale.radius),
        ...Object.values(scale.borderWidth),
        ...TEXT_ROLES.flatMap((role) => Object.values(textStyleForRole(role))),
      ]
        .map(pxToNumber)
        .filter((value): value is number => value !== null)
    );

    const offenders: string[] = [];
    const visit = (value: unknown, keyPath: string): void => {
      if (typeof value === 'string') {
        const isColorLike = /^#|^rgba?\(/.test(value);
        if (isColorLike && !allowedColors.has(value)) offenders.push(`${keyPath}=${value}`);
        return;
      }
      if (typeof value === 'number') {
        if (!allowedNumbers.has(value)) offenders.push(`${keyPath}=${value}`);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, i) => visit(item, `${keyPath}[${i}]`));
        return;
      }
      if (value !== null && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) visit(v, `${keyPath}.${k}`);
      }
    };
    visit(styles, 'styles');
    expect(offenders).toEqual([]);
  });

  it('⛔ 必须 `mergeStyle={false}`：否则库的默认样式会绕过令牌', () => {
    const src = readUi('MarkdownReader.tsx');
    expect(src).toContain('mergeStyle={false}');
  });

  it('渲染正文（Markdown 组件确实被挂上）', async () => {
    const view = await wrap(<MarkdownReader content={'# 标题\n正文'} testID="md" />);
    expect(view.getByTestId('md')).toBeTruthy();
  });
});

describe('TC-P1-08-11A · D27 SchoolSystemCard：会话三态 + 清除会话', () => {
  it('三态映射齐备，且 **expired ≠ signedOut**（可改正的动作不同）', () => {
    expect(Object.keys(SESSION_STATE_SPEC).sort()).toEqual(['expired', 'signedIn', 'signedOut']);
    expect(SESSION_STATE_SPEC.expired.labelKey).not.toBe(SESSION_STATE_SPEC.signedOut.labelKey);
    expect(SESSION_STATE_SPEC.expired.fill).not.toBe(SESSION_STATE_SPEC.signedOut.fill);
  });

  it('状态可播报（`系统名：状态`）且不只靠色块（图标 + 文案）', async () => {
    const view = await wrap(
      <SchoolSystemCard
        title="教务 AC"
        origin="ac.xmu.edu.my"
        state="expired"
        openLabel="打开"
        onOpen={() => undefined}
        onClearSession={() => undefined}
        testID="ssc"
      />
    );
    expect(view.getByLabelText('教务 AC：会话已过期')).toBeTruthy();
    expect(view.getByText('会话已过期')).toBeTruthy();
  });

  it('清除会话只在**非** signedOut 时出现', async () => {
    const signedIn = await wrap(
      <SchoolSystemCard
        title="签到"
        state="signedIn"
        openLabel="打开"
        onOpen={() => undefined}
        onClearSession={() => undefined}
        testID="b"
      />
    );
    expect(signedIn.getByTestId('b-clear')).toBeTruthy();
  });

  it('signedOut 时不出现清除会话（没有会话可清）', async () => {
    const signedOut = await wrap(
      <SchoolSystemCard
        title="签到"
        state="signedOut"
        openLabel="打开"
        onOpen={() => undefined}
        onClearSession={() => undefined}
        testID="a"
      />
    );
    expect(signedOut.queryByTestId('a-clear')).toBeNull();
  });

  it('打开与清除各自回调', async () => {
    const onOpen = jest.fn();
    const onClear = jest.fn();
    const view = await wrap(
      <SchoolSystemCard
        title="Moodle"
        state="signedIn"
        openLabel="打开"
        onOpen={onOpen}
        onClearSession={onClear}
        testID="c"
      />
    );
    fireEvent.press(view.getByText('打开'));
    fireEvent.press(view.getByTestId('c-clear'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('TC-P1-08-12A · 结构约束：10 个域组件合规', () => {
  it('⛔ 去注释后 0 处中文字面量（文案一律走词条或 props）', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const code = stripComments(readUi(file)).replace(
        /new Error\((['"`])[^'"`]*\1\)/g,
        'new Error()'
      );
      if (/['"`][^'"`]*[\u4e00-\u9fff]/.test(code)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('⛔ 0 处 hex / 0 处数字字号 / 0 处自造浮层', () => {
    for (const file of FILES) {
      const src = stripComments(readUi(file));
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/fontSize\s*:\s*[0-9]/);
      expect(src).not.toMatch(/\bModal\b/);
    }
  });

  it('⛔ 不出现 `space_X * 数字` 这类"算出来的尺寸"（令牌里没有的值不许现算）', () => {
    for (const file of FILES) {
      const src = stripComments(readUi(file));
      expect(src).not.toMatch(/space\('space_\d+'\)\s*\*/);
    }
  });
});
