/**
 * P1-11 · 骨架 `P3` 详情（`src/proto/P3`）—— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：四态判定、计数缺省语义、互动条动作集合
 *   S-1 组件契约：**匿名投影四点断开**、四态渲染、互动条、评论区页脚映射、顶栏可注入
 *   S-5 结构约束：原型骨架的落点与"不自建第二套机制"
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { INITIAL_PAGINATION } from '@/components/ui/ListScreen';
import type { CommentNode, CommentThreadLabels } from '@/components/ui/CommentThread';
import { Text } from '@/components/ui/Text';

import {
  DetailScreen,
  PROTO_ID,
  formatInteractionCount,
  interactionKinds,
  resolveDetailState,
  type DetailComments,
  type DetailLabels,
} from '@/proto/P3';

const SRC_ROOT = path.resolve(__dirname, '..');
const PROTO_FILE = path.join(SRC_ROOT, 'proto', 'P3', 'DetailScreen.tsx');
const readProto = (): string => fs.readFileSync(PROTO_FILE, 'utf8');

const COMMENT_LABELS: CommentThreadLabels = {
  anonymous: '匿名',
  deleteLabel: '删除',
  replyLabel: '回复',
  likeLabel: '赞',
  moreReplies: (n: number) => `展开其余 ${n} 条`,
  collapse: '收起',
};

const LABELS: DetailLabels = {
  back: '返回',
  like: '赞',
  favorite: '收藏',
  comment: '评论',
  report: '更多',
  countPlaceholder: '—',
  anonymous: '匿名',
  comments: COMMENT_LABELS,
  commentsEnd: '没有更多了',
  commentsRetry: '重试',
};

const node = (id: string, depth: 0 | 1, parentId: string | null): CommentNode => ({
  id,
  parentId,
  depth,
  author: { kind: 'anonymous' },
  content: `内容${id}`,
  createdAtLabel: '刚刚',
});

function comments(over: Partial<DetailComments> = {}): DetailComments {
  return {
    nodes: [node('a', 0, null)],
    pagination: INITIAL_PAGINATION,
    onLoadMore: () => undefined,
    onRetry: () => undefined,
    title: '评论 1',
    ...over,
  };
}

function renderDetail(over: Partial<React.ComponentProps<typeof DetailScreen>> = {}) {
  return renderApp(
    <DetailScreen
      title="食堂点评"
      author={{ kind: 'anonymous' }}
      interactions={{ likeCount: 3, commentCount: 1 }}
      labels={LABELS}
      body={<Text role="body">正文内容</Text>}
      testID="detail"
      {...over}
    />
  );
}

describe('TC-P1-11-1A · 落点与口径（原型骨架）', () => {
  it('文件在 `src/proto/P3`（⛔ 不是 components/ui）', () => {
    expect(fs.existsSync(PROTO_FILE)).toBe(true);
    expect(fs.existsSync(path.join(SRC_ROOT, 'proto', 'P3', 'index.ts'))).toBe(true);
  });

  it('PROTO_ID 与 §5-3 的裁定一致', () => {
    expect(PROTO_ID).toBe('P3');
  });

  it('它**全部通过引用** `components/ui/**` 构成（尺子统计的正是这个路径的引用）', () => {
    const src = readProto();
    expect(src).toContain('@/components/ui/');
    // ⛔ 不自己画令牌视觉（原型层不新增 UI 组件）
    expect(stripComments(src)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(stripComments(src)).not.toMatch(/fontSize\s*:\s*[0-9]/);
  });
});

describe('TC-P1-11-2A · 四态判定（纯函数）', () => {
  it('四态', () => {
    expect(resolveDetailState({ loading: true, error: null, hasContent: false })).toBe('loading');
    expect(
      resolveDetailState({ loading: false, error: { kind: 'offline' }, hasContent: false })
    ).toBe('error');
    expect(resolveDetailState({ loading: false, error: null, hasContent: false })).toBe('empty');
    expect(resolveDetailState({ loading: false, error: null, hasContent: true })).toBe('content');
  });

  it('⚠️ 有内容时**错误不接管整屏**（评论失败不该把正文换掉）', () => {
    expect(
      resolveDetailState({ loading: false, error: { kind: 'unreachable' }, hasContent: true })
    ).toBe('content');
    expect(resolveDetailState({ loading: true, error: null, hasContent: true })).toBe('content');
  });
});

describe('TC-P1-11-3A · 计数缺省语义（G17：计数类字段可能是 null）', () => {
  it('null / undefined / NaN → 占位符（⛔ 不当成 0）', () => {
    expect(formatInteractionCount(null, '—')).toBe('—');
    expect(formatInteractionCount(undefined, '—')).toBe('—');
    expect(formatInteractionCount(Number.NaN, '—')).toBe('—');
  });

  it('**`0` 是真实值**，必须显示成 0（"没有赞"与"没有数据"是两件事）', () => {
    expect(formatInteractionCount(0, '—')).toBe('0');
    expect(formatInteractionCount(12, '—')).toBe('12');
  });
});

describe('TC-P1-11-4A · 互动条动作集合（纯函数）', () => {
  it('固定四个：赞 / 收藏 / 评论 / 更多（举报入口）', () => {
    expect(interactionKinds()).toEqual(['like', 'favorite', 'comment', 'report']);
  });
});

describe('TC-P1-11-5A · **匿名投影四点断开**（宪法 4.1.1 / 验收索引）', () => {
  it('匿名：无主页跳转、无昵称、无等级徽章', async () => {
    const view = await renderDetail({
      author: { kind: 'anonymous' },
      metaLabel: '3 天前',
    });
    // ① 跳转出口断开
    expect(view.queryByTestId('detail-author')).toBeNull();
    // ② 昵称出口：只剩"匿名"这一句
    expect(view.getByText('匿名')).toBeTruthy();
    // ③ 等级出口：没有可点的作者区域，自然也没有徽章
    expect(view.queryByText('Lv.5')).toBeNull();
  });

  it('实名：作者可点、昵称与等级都在', async () => {
    const onPressAuthor = jest.fn();
    const view = await renderDetail({
      author: { kind: 'named', name: '张三', levelLabel: 'Lv.5', onPressAuthor },
    });
    expect(view.getByText('张三')).toBeTruthy();
    expect(view.getByText('Lv.5')).toBeTruthy();
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('detail-author'));
    expect(onPressAuthor).toHaveBeenCalledTimes(1);
  });

  it('⛔ 匿名分支**没有头像槽**（连占位都不给）：源码里匿名分支只走 `commentAuthorLabel`', () => {
    const src = readProto();
    // 匿名那一支必须走唯一的口径函数（⛔ 不许在页面层再拼一次身份）
    expect(src).toContain('commentAuthorLabel(author, labels.anonymous)');
    // ⛔ 原型层不新增第二个投影类型（9.14-①：复用 D02 的联合）
    expect(src).not.toMatch(/type\s+\w*Author\w*\s*=/);
    expect(src).toContain("from '@/components/ui/CommentItem'");
  });
});

describe('TC-P1-11-6A · 四态渲染', () => {
  it('content：标题 + 正文 + 互动条', async () => {
    const view = await renderDetail();
    expect(view.getByText('食堂点评')).toBeTruthy();
    expect(view.getByText('正文内容')).toBeTruthy();
    expect(view.getByTestId('detail-like')).toBeTruthy();
  });

  it('loading：出 `T03` 且不渲染正文', async () => {
    const view = await renderDetail({ state: 'loading' });
    expect(view.getByTestId('detail-loading')).toBeTruthy();
    expect(view.queryByText('正文内容')).toBeNull();
  });

  it('empty：出 `T01`（且只给一个动作）', async () => {
    const view = await renderDetail({
      state: 'empty',
      empty: {
        kind: 'broken',
        title: '内容已被删除',
        actionLabel: '返回列表',
        onAction: () => undefined,
      },
    });
    expect(view.getByTestId('detail-empty')).toBeTruthy();
    expect(view.getByText('内容已被删除')).toBeTruthy();
  });

  it('error：出 `T02`，主行动可点', async () => {
    const onRetry = jest.fn();
    const view = await renderDetail({
      state: 'error',
      error: { kind: 'offline', target: '食堂点评' },
      onRetry,
    });
    expect(view.getByTestId('detail-error')).toBeTruthy();
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByText('打开网络后重试'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('TC-P1-11-7A · ⚠️ **业务失败 ≠ 网络失败**（宪法 10.4 / 验收索引）', () => {
  it('业务类错误渲染业务文案，**不含**网络文案', async () => {
    const view = await renderDetail({
      state: 'error',
      error: { kind: 'content', target: '食堂点评' },
      onRetry: () => undefined,
    });
    // 业务三要素
    expect(view.getByText('内容未通过检查')).toBeTruthy();
    expect(view.getByText(/不允许发布的词/)).toBeTruthy();
    // ⛔ 绝不能出现网络类文案
    expect(view.queryByText('网络没连上')).toBeNull();
    expect(view.queryByText('手机当前没有可用网络')).toBeNull();
  });

  it('网络类错误才渲染网络文案（反向对照，避免"因为都不显示而通过"）', async () => {
    const view = await renderDetail({
      state: 'error',
      error: { kind: 'offline' },
      onRetry: () => undefined,
    });
    expect(view.getByText('网络没连上')).toBeTruthy();
    expect(view.queryByText('内容未通过检查')).toBeNull();
  });

  it('⛔ 骨架不自己写错误文案（只把 `AppError` 交给 `T02`）', () => {
    const code = stripComments(readProto());
    expect(code).toContain('ErrorState');
    expect(code).not.toMatch(/['"`][^'"`]*[\u4e00-\u9fff]/);
  });
});

describe('TC-P1-11-8A · 互动条渲染与回调', () => {
  it('点赞/收藏可点且带选中态；计数缺失显示占位', async () => {
    const onToggleLike = jest.fn();
    const onToggleFavorite = jest.fn();
    const view = await renderDetail({
      interactions: { liked: true, likeCount: null, favorited: false, favoriteCount: 7, commentCount: null },
      onToggleLike,
      onToggleFavorite,
    });
    const like = view.getByTestId('detail-like');
    expect(like.props.accessibilityState).toMatchObject({ selected: true });
    // 计数为 null → 播报里是占位符，⛔ 不是 0
    expect(like.props.accessibilityLabel).toBe('赞，—');

    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(like);
    expect(onToggleLike).toHaveBeenCalledTimes(1);
    await user.press(view.getByTestId('detail-favorite'));
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it('举报入口在互动条上（⛔ 不埋进二级菜单）', async () => {
    const onReport = jest.fn();
    const view = await renderDetail({ onReport });
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('detail-report'));
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it('没给回调的动作是 disabled（⛔ 不给"看起来能点但没反应"的按钮）', async () => {
    const view = await renderDetail();
    expect(view.getByTestId('detail-report').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });
});

describe('TC-P1-11-9A · 评论区：分页交给既有件', () => {
  it('不给评论数据 → 整块不渲染（跑腿详情那类页面）', async () => {
    const view = await renderDetail();
    expect(view.queryByTestId('detail-comments')).toBeNull();
  });

  it('给了 → 评论项 + 标题渲染', async () => {
    const view = await renderDetail({ comments: comments() });
    expect(view.getByTestId('detail-comments')).toBeTruthy();
    expect(view.getByText('评论 1')).toBeTruthy();
    expect(view.getByText('内容a')).toBeTruthy();
  });

  it('页脚映射：追加失败 → retry（可点）；到底 → end', async () => {
    const onRetry = jest.fn();
    const view = await renderDetail({
      comments: comments({
        pagination: { ...INITIAL_PAGINATION, append: 'error', hasMore: false },
        onRetry,
      }),
    });
    await waitFor(() => expect(view.getByTestId('detail-comments-footer')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByText('重试'));
    expect(onRetry).toHaveBeenCalledTimes(1);

    // 到底（另起一个用例才能避免同用例二次 render）
  });

  it('到底 → 显示 endLabel（不是 retry）', async () => {
    const view = await renderDetail({
      comments: comments({ pagination: { ...INITIAL_PAGINATION, hasMore: false } }),
    });
    await waitFor(() => expect(view.getByText('没有更多了')).toBeTruthy());
  });

  it('⛔ 骨架里**没有第二个分页状态机**：直接用 `K05` 的 `listFooterState`', () => {
    const code = stripComments(readProto());
    expect(code).toContain('listFooterState');
    // 不得自己定义 page/phase 之类的 reducer
    expect(code).not.toMatch(/function\s+\w*[Rr]educer/);
    expect(code).not.toContain('useReducer');
  });
});

describe('TC-P1-11-10A · 顶栏可注入（README §5-2：C-06 待所有者拍板）', () => {
  it('`topBar` 插槽渲染出来，且返回按钮可用', async () => {
    const onBack = jest.fn();
    const view = await renderDetail({
      onBack,
      topBar: <Text role="label">信箱</Text>,
    });
    expect(view.getByText('信箱')).toBeTruthy();
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('detail-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('两种口径都能接：给 `topMode="overlay"` 也能渲染（骨架不预占该决定）', async () => {
    const view = await renderDetail({ topMode: 'overlay' });
    expect(view.getByTestId('detail')).toBeTruthy();
  });

  it('⛔ 骨架里**不写死**信箱按钮（那是所有者的决定，不是骨架的）', () => {
    const src = readProto();
    expect(src).not.toContain('IconButton');
    expect(src).not.toContain('Badge');
  });
});

describe('TC-P1-11-11A · 结构约束', () => {
  it('⛔ 去注释后 0 处中文字面量（文案全部由页面传词条）', () => {
    const code = stripComments(readProto());
    expect(/['"`][^'"`]*[\u4e00-\u9fff]/.test(code)).toBe(false);
  });

  it('⛔ 0 处自造浮层 / 0 处裸色值 / 0 处数字字号', () => {
    const code = stripComments(readProto());
    expect(code).not.toMatch(/\bModal\b/);
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code).not.toMatch(/fontSize\s*:\s*[0-9]/);
  });

  it('⛔ 安全区不自算：用 `Screen`（宪法 17.1-S2）', () => {
    const code = stripComments(readProto());
    expect(code).toContain("from '@/components/ui/Screen'");
    expect(code).not.toMatch(/useSafeAreaInsets\s*\(/);
    expect(code).not.toMatch(/paddingTop\s*:/);
  });
});
