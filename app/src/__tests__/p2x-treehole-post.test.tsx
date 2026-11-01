/**
 * P2X 树洞帖子（行 / 详情块 / 折叠判定）
 *
 * 这里守的是**渲染层**的四条不变量（对应评审 P0-4 / P0-5 / P1-2 / P1-9）：
 * 1. 折叠只有一把尺子：能截断就一定有"阅读全文"（⛔ 不存在静默丢内容）；
 * 2. 层级：昵称 label、正文 body、时间 caption；
 * 3. 信息顺序：标题 → 正文 → 标签 → 媒体 → 计数（正文在媒体之前）；
 * 4. 内容区可点、动作区是**兄弟节点**（⛔ 按钮套按钮）；万能墙详情不出现实名。
 */

import * as React from 'react';
import { PixelRatio } from 'react-native';
import { fireEvent, within } from '@testing-library/react-native';

import { TreeholePostRow } from '@/features/campus/TreeholePostRow';
import { TreeholePostDetail } from '@/features/campus/TreeholePostDetail';
import { Text } from '@/components/ui/Text';
import {
  treeholeCanExpand,
  treeholePreviewLines,
  treeholeTextUnits,
} from '@/features/campus/treeholePreview';
import type { TreeholePostViewModel } from '@/features/campus/treeholePostViewModel';
import { renderApp } from './helpers/renderApp';

const post: TreeholePostViewModel = {
  id: 7,
  title: '晚自习搭子',
  content: '今晚有人想去图书馆吗？',
  authorName: '小蓝',
  authorId: 9,
  authorLevel: 3,
  authorBadge: 'contributor',
  avatarUrl: null,
  createdAt: null,
  liked: false,
  likeCount: 2,
  commentCount: 3,
  mediaUrls: [],
  tags: [{ id: 1, slug: 'help', nameZh: '求助', nameEn: 'Help' }],
};

function row(overrides: Partial<React.ComponentProps<typeof TreeholePostRow>> = {}) {
  return (
    <TreeholePostRow
      post={post}
      timeLabel="2 小时前"
      liked={false}
      likeCount={2}
      commentCount={3}
      onOpen={() => undefined}
      onLike={() => undefined}
      {...overrides}
    />
  );
}

describe('P2X TreeholePreview（折叠判定）', () => {
  it('短正文不截断也不给阅读全文', () => {
    expect(treeholeCanExpand('短正文', 1)).toBe(false);
    expect(treeholePreviewLines('短正文', 1, false)).toBeUndefined();
  });

  it('宽字符按 2 个单位计，长正文才允许折叠', () => {
    expect(treeholeTextUnits('ab')).toBe(2);
    expect(treeholeTextUnits('中')).toBe(2);
    expect(treeholeCanExpand('中'.repeat(200), 1)).toBe(true);
    expect(treeholePreviewLines('中'.repeat(200), 1, false)).toBe(8);
  });

  it('只要截断就一定同时给展开入口（P0-4 的回归守卫）', () => {
    const samples = ['短', '中'.repeat(120), 'a'.repeat(300), '中'.repeat(400), '混合 mixed 正文'.repeat(30)];
    for (const content of samples) {
      const lines = treeholePreviewLines(content, 1, false);
      if (lines !== undefined) expect(treeholeCanExpand(content, 1)).toBe(true);
    }
  });

  it('大字号不截断，展开后也不截断', () => {
    expect(treeholeCanExpand('中'.repeat(400), 2)).toBe(false);
    expect(treeholePreviewLines('中'.repeat(400), 2, false)).toBeUndefined();
    expect(treeholePreviewLines('中'.repeat(400), 1, true)).toBeUndefined();
  });
});

describe('P2X TreeholePostRow', () => {
  it('信息流完整展示标题和正文，身份标签与计数保持', async () => {
    const view = await renderApp(row());
    expect(view.getByTestId('treehole-author-name')).toHaveTextContent('小蓝');
    expect(view.getByTestId('treehole-author-time')).toHaveTextContent('2 小时前');
    expect(view.getByText('晚自习搭子')).toBeTruthy();
    expect(view.getByTestId('treehole-content-7')).toHaveTextContent('今晚有人想去图书馆吗？');
    // 标签排在日期右边，不单独占一行
    expect(view.getByTestId('treehole-row-tags')).toHaveTextContent('求助');
    const tree = JSON.stringify(view.toJSON());
    expect(tree.indexOf('treehole-author-time')).toBeLessThan(tree.indexOf('treehole-row-tags'));
    expect(view.getByTestId('campus-row-7-like-count')).toHaveTextContent('2');
    expect(view.getByTestId('campus-row-7-comment-count')).toHaveTextContent('3');
  });

  it('没有标题的多行正文只展示一次，不重复首行', async () => {
    const view = await renderApp(row({ post: { ...post, title: '', content: '只有正文的帖子\n第二段尾句' } }));
    expect(view.getAllByText('只有正文的帖子\n第二段尾句')).toHaveLength(1);
    expect(view.queryByText('只有正文的帖子')).toBeNull();
  });

  it('搜索命中正文尾部，长文不截断且仍可进入详情', async () => {
    const onOpen = jest.fn();
    const content = '长文段落\n'.repeat(80) + '尾部自习';
    const view = await renderApp(row({ post: { ...post, content }, query: '自习', onOpen }));
    expect(view.getByTestId('treehole-content-7')).toHaveTextContent(/尾部\s*自习/);
    expect(view.getByTestId('treehole-content-7').props.numberOfLines).toBeUndefined();
    expect(view.getAllByTestId('campus-search-match').length).toBeGreaterThan(0);
    await fireEvent.press(view.getByTestId('campus-row-7'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('空正文不产生空文本块，图片和操作仍可用', async () => {
    const view = await renderApp(row({ post: { ...post, content: '', mediaUrls: ['https://example.test/a.jpg'] } }));
    expect(view.queryByTestId('treehole-content-7')).toBeNull();
    expect(view.getByTestId('campus-row-7-media')).toBeTruthy();
    expect(view.getByTestId('campus-row-7-like')).toBeTruthy();
  });

  it('内容区与动作区是兄弟节点：点内容进详情，点动作只触发动作', async () => {
    const onOpen = jest.fn();
    const onLike = jest.fn();
    const view = await renderApp(row({ onOpen, onLike }));
    await fireEvent.press(view.getByTestId('campus-row-7'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByTestId('campus-row-7-like'));
    expect(onLike).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
    // 动作按钮的读屏状态带 selected（点赞态双通道：图标 + 状态）
    expect(view.getByTestId('campus-row-7-like').props.accessibilityState.selected).toBe(false);
  });

  it('列表不提供媒体切换控件（R-7：feed 静态）', async () => {
    const view = await renderApp(row({ post: { ...post, mediaUrls: ['https://example.test/a.jpg'] } }));
    expect(view.queryByTestId('treehole-media-next')).toBeNull();
    expect(view.queryByTestId('treehole-media-preview')).toBeNull();
  });

  it('图组距正文 12dp：内容列 4 + 媒体上边距 8', async () => {
    const view = await renderApp(
      row({ post: { ...post, mediaUrls: ['https://example.test/a.jpg'] } })
    );
    expect(view.getByTestId('campus-row-7-media')).toHaveStyle({ marginTop: 8 });
  });

  it('点图组仍进详情（2026-10-31：只去掉按压变灰，不减少交互）', async () => {
    const onOpen = jest.fn();
    const view = await renderApp(
      row({ onOpen, post: { ...post, mediaUrls: ['https://example.test/a.jpg'] } })
    );
    await fireEvent.press(view.getByTestId('campus-row-7-media'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('正文在媒体之前：详情顺序 = 标题/正文 → 标签 → 媒体', async () => {
    const view = await renderApp(
      <TreeholePostDetail
        post={{ ...post, mediaUrls: ['https://example.test/a.jpg'] }}
        timeLabel="2026-10-18 10:00"
        liked={false}
        likeCount={2}
        commentCount={3}
        onLike={() => undefined}
        onComment={() => undefined}
      />
    );
    const tree = JSON.stringify(view.toJSON());
    expect(tree.indexOf('晚自习搭子')).toBeLessThan(tree.indexOf('今晚有人想去图书馆吗？'));
    expect(tree.indexOf('今晚有人想去图书馆吗？')).toBeLessThan(tree.indexOf('treehole-tags'));
    expect(tree.indexOf('treehole-tags')).toBeLessThan(tree.indexOf('treehole-media-detail'));
  });

  it('详情 tag 退为辅助信息：字号 = 正文 × 0.85（12sp），胶囊内边距收到 4/12', async () => {
    const view = await renderApp(
      <TreeholePostDetail
        post={post}
        timeLabel="2026-10-18 10:00"
        liked={false}
        likeCount={2}
        commentCount={3}
        onLike={() => undefined}
        onComment={() => undefined}
      />
    );
    const chip = view.getByTestId('treehole-tag-1');
    expect(chip).toHaveStyle({
      minHeight: 24,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 9999,
    });
    // 正文 body = 14sp → tag caption = 12sp（0.857×，落 0.85 档）；常规字重，不抢正文
    expect(within(chip).getByText('求助')).toHaveStyle({ fontSize: 12, fontWeight: 'normal' });
  });

  it('短正文直接完整显示，不给"阅读全文"', async () => {
    const view = await renderApp(
      <TreeholePostDetail
        post={{ ...post, content: '短正文' }}
        timeLabel="2026-10-18 10:00"
        liked={false}
        likeCount={2}
        commentCount={3}
        onLike={() => undefined}
        onComment={() => undefined}
      />
    );
    expect(view.queryByTestId('treehole-detail-read-more')).toBeNull();
    expect(view.getByTestId('treehole-post-content')).toHaveTextContent('短正文');
  });

  it('长正文直接完整显示，无需展开', async () => {
    // RN 的 Jest 预设把字号缩放固定成 2，而 ≥2 的设计是"不截断"；这里显式回到 1 才测得到折叠
    const spy = jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1);
    try {
      const view = await renderApp(
        <TreeholePostDetail
          post={{ ...post, content: '中'.repeat(200) }}
          timeLabel="2026-10-18 10:00"
          liked={false}
          likeCount={2}
          commentCount={3}
          onLike={() => undefined}
          onComment={() => undefined}
        />
      );
      expect(view.queryByTestId('treehole-detail-read-more')).toBeNull();
      expect(view.getByTestId('treehole-post-content').props.numberOfLines).toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });

  it('万能墙详情匿名：没有昵称、没有等级、没有标题', async () => {
    const view = await renderApp(
      <TreeholePostDetail
        post={post}
        timeLabel=""
        liked={false}
        likeCount={2}
        commentCount={3}
        onLike={() => undefined}
        onComment={() => undefined}
        anonymous
        wallContent={<Text>匿名正文</Text>}
      />
    );
    expect(view.getByText('匿名')).toBeTruthy();
    expect(view.queryByText('小蓝')).toBeNull();
    expect(view.queryByTestId('treehole-author-level')).toBeNull();
    expect(view.queryByText('晚自习搭子')).toBeNull();
    expect(view.getByText('匿名正文')).toBeTruthy();
  });
});
