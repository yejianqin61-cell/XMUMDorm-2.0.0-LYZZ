/**
 * P2X 媒体 / 信息流：⛔ 不出现"手指刚碰到就变灰"的按压态（所有者 2026-10-31 指令）
 *
 * 现状问题（真机录屏 + 截图）：Pressable 默认 `feedback="opacity"`，触摸刚落下、还没完成
 * 点击时整个元素降到 0.6 透明度 ——
 *   · 信息流里滑动浏览会反复误触发，整条帖子 / 全部缩略图一闪一闪，像卡顿；
 *   · 详情轮播按住 / 滑动时图片整块发灰（截图右边缘灰条）。
 *
 * 本轮只去掉**按压视觉**，交互一个不少：点帖子进详情、点图进全屏看图器、左右滑翻页、
 * 点赞 / 评论。所以这里守两件事：
 *   1. 四类图区 / 卡片元素的 Pressable 显式 `feedback="none"`（不靠"默认值哪天变了"）；
 *   2. 它们仍然带 `onPress`（或仍带着原本的读屏动作），没有被改成不可点。
 *
 * ⚠️ 为什么是源码断言而不是"按下时查样式"：RN 的 `Pressable` 不把 `onPressIn` 透传到宿主节点，
 *   RNTL 的 `fireEvent(node, 'pressIn')` 触不到 pressed 状态（P1-04 已实测），
 *   而 Jest 里也没有真实触摸。真正能守住"调用点选了哪个反馈"的只有开标签本身；
 *   交互是否还在由既有渲染用例（`p2x-treehole-post` / `p2x-treehole-media`）覆盖。
 */

import * as path from 'path';

import { readCode } from './helpers/sourceScan';

const appRoot = path.resolve(__dirname, '..', '..');
const read = (...segments: string[]) => readCode(path.join(appRoot, ...segments));

/**
 * 取出某个组件标签的所有**开标签**源码。
 *
 * ⛔ 不能简单截到第一个 `>`：属性里有箭头函数（`onAccessibilityAction={(event) => {`），
 * 那样会把标签截成一半、漏掉后面的 `feedback`。这里按大括号深度 + 引号配对找真正的结尾。
 */
function openingTags(source: string, tag: string): string[] {
  const tags: string[] = [];
  const marker = `<${tag}`;
  let from = 0;
  while (from < source.length) {
    const start = source.indexOf(marker, from);
    if (start < 0) break;
    const boundary = source[start + marker.length];
    if (boundary !== undefined && !/[\s/>]/.test(boundary)) {
      from = start + marker.length;
      continue;
    }
    let depth = 0;
    let quote: string | null = null;
    let end = start + marker.length;
    for (; end < source.length; end += 1) {
      const char = source[end];
      if (quote !== null) {
        if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        quote = char;
        continue;
      }
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      else if (char === '>' && depth === 0) break;
    }
    tags.push(source.slice(start, end + 1));
    from = end + 1;
  }
  return tags;
}

describe('P2X 按压态：信息流 / 缩略图 / 详情轮播 / 全屏看图器', () => {
  it('信息流整条帖子（内容区 + 图组）不做按压变灰，点击仍进详情', () => {
    const row = read('src', 'features', 'campus', 'TreeholePostRow.tsx');
    const tags = openingTags(row, 'Pressable');
    // 内容区 + 图组，正好两个
    expect(tags).toHaveLength(2);
    for (const tag of tags) {
      expect(tag).toContain('feedback="none"');
      // ⛔ 只去视觉，不去交互
      expect(tag).toContain('onPress=');
    }
    // 图组（每张缩略图都在这一个可点区里）仍然指向"打开帖子"
    expect(tags[1]).toContain('onPress={onOpen}');
  });

  it('万能墙整条卡片同样不做按压变灰，点击仍进详情', () => {
    const row = read('src', 'features', 'campus', 'WallPostRow.tsx');
    const tags = openingTags(row, 'Pressable');
    expect(tags).toHaveLength(1);
    expect(tags[0]).toContain('feedback="none"');
    expect(tags[0]).toContain('onPress={onOpen}');
  });

  it('详情轮播与全屏看图器的图区不做按压变灰：点图放大 / 读屏翻页都保留', () => {
    const media = read('src', 'features', 'campus', 'TreeholeMedia.tsx');
    const tags = openingTags(media, 'AppPressable');
    // 详情页图区 + 全屏看图器覆盖层
    expect(tags).toHaveLength(2);
    for (const tag of tags) expect(tag).toContain('feedback="none"');
    // 详情图区：点一下仍打开全屏看图器
    expect(tags[0]).toContain('onPress={openViewer}');
    // 看图器覆盖层：翻页的读屏动作仍在
    expect(tags[1]).toContain('onAccessibilityAction=');
  });

  it('⛔ 全屏看图器的关闭按钮仍是可点控件（只给图区去反馈，不把按钮一起变成不可点）', () => {
    const media = read('src', 'features', 'campus', 'TreeholeMedia.tsx');
    expect(media).toContain('onPress={onClose}');
    expect(media).toContain("accessibilityLabel={t('action.close')}");
  });
});
