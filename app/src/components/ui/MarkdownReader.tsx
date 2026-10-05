/**
 * MarkdownReader（D18）—— Markdown 渲染 + **TOC 由它 own**（组件定义 §2.6）
 *
 * 两件事：
 *   1. **渲染**：用**已准入**的 `@ronradtke/react-native-markdown-display`
 *      （依赖登记：MIT、0 原生文件 → 可 OTA，2026-06-29 准入）。
 *      ⚠️ **必须 `mergeStyle={false}`**：否则库自带的默认样式会与我们的令牌**混在一起**，
 *      出现"设计系统管不到的字体和颜色"——那正是宪法 1.4 要防的。关掉之后
 *      **每一处视觉都来自 `markdownStyles(theme)`**，而它只读令牌。
 *   2. **TOC**：后端只存原文，**目录在客户端生成**（`D19 TocDrawer` 已并入本组件）。
 *      `extractToc` 是纯函数，所以"标题层级、锚点 id、跳过代码块里的 `#`"都能被测。
 *
 * ⛔ 组件内不写文案；链接文案来自原文。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Markdown, { type MarkdownStyleMap } from '@ronradtke/react-native-markdown-display';

import { useTheme, type Theme } from '@/design-system/theme';
import { textStyleForRole, type TextRole } from '@/design-system/typography';
import type { SpaceKey } from '@/design-system/px';

/** TOC 各层级的缩进档位（⛔ 不做 `space * 层数` 的算术：那会算出令牌里不存在的值） */
const TOC_INDENT: Record<number, SpaceKey> = {
  1: 'space_1',
  2: 'space_3',
  3: 'space_4',
  4: 'space_6',
  5: 'space_8',
  6: 'space_12',
};

export function tocIndentKey(level: number): SpaceKey {
  return TOC_INDENT[level] ?? 'space_1';
}

export type TocEntry = {
  level: number;
  text: string;
  /** 锚点 id（由文本 slug 得到；重复标题自动加序号） */
  id: string;
};

/** 文本 → 锚点 id（纯函数）：保留中英文与数字，其余压成 `-` */
export function slugifyHeading(text: string, taken: ReadonlySet<string> = new Set()): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  const fallback = base === '' ? 'section' : base;
  if (!taken.has(fallback)) return fallback;
  let index = 2;
  while (taken.has(`${fallback}-${index}`)) index += 1;
  return `${fallback}-${index}`;
}

/**
 * 从 Markdown 原文提取目录（纯函数）。
 * - **跳过围栏代码块**（``` 里的 `#` 是注释，不是标题）—— 这是最容易错的一点；
 * - `#`–`######` 六级都收（层级给渲染方决定怎么缩进）；
 * - 行内标记（`**粗**`、`` `码` ``）从标题文本里去掉，避免 TOC 出现星号。
 */
export function extractToc(markdown: string): readonly TocEntry[] {
  const out: TocEntry[] = [];
  const taken = new Set<string>();
  let inFence = false;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1,6})\s+(.*)$/.exec(line);
    if (!match) continue;

    const text = match[2]
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\*\*([^*]*)\*\*/g, '$1')
      .replace(/[*_]/g, '')
      .trim();
    if (text === '') continue;

    const id = slugifyHeading(text, taken);
    taken.add(id);
    out.push({ level: match[1].length, text, id });
  }
  return out;
}

/**
 * 令牌 → Markdown 样式表（纯函数，**唯一的视觉来源**）。
 * ⚠️ 每个键都显式给值：配合 `mergeStyle={false}`，"没给"就等于"没有样式"，
 *    而不是"偷偷用库的默认值"。
 */
export function markdownStyles(theme: Theme): MarkdownStyleMap {
  const textColor = theme.color['text-primary'].value;
  const mutedColor = theme.color['text-secondary'].value;
  const brandColor = theme.color['text-brand'].value;
  const borderColor = theme.color['border-subtle'].value;

  const body = { color: textColor, ...textStyleForRole('body') } as const;
  const heading = (role: TextRole) => ({
    color: textColor,
    ...textStyleForRole(role),
    fontWeight: 'bold' as const,
    marginTop: theme.space('space_4'),
    marginBottom: theme.space('space_2'),
  });

  return {
    body: { ...body, gap: theme.space('space_2') },
    paragraph: { ...body, marginTop: 0, marginBottom: theme.space('space_2') },
    heading1: heading('title'),
    heading2: heading('headline'),
    heading3: heading('headline'),
    heading4: heading('headline'),
    heading5: { ...heading('headline') },
    heading6: { ...heading('headline') },
    strong: { ...body, fontWeight: 'bold' },
    em: { ...body, fontStyle: 'italic' },
    link: { ...body, color: brandColor, textDecorationLine: 'underline' },
    blockquote: {
      ...body,
      color: mutedColor,
      borderLeftWidth: theme.borderWidth('border_width_brutal'),
      borderLeftColor: theme.color['border-strong'].value,
      paddingLeft: theme.space('space_3'),
      marginBottom: theme.space('space_2'),
    },
    bullet_list: { ...body, marginBottom: theme.space('space_2') },
    ordered_list: { ...body, marginBottom: theme.space('space_2') },
    list_item: { ...body, marginBottom: theme.space('space_1') },
    code_inline: {
      ...body,
      color: textColor,
      // ⚠️ 令牌表达式**内联**写在 `backgroundColor` 右边（同 `A05 Divider`）：
      //    先赋给局部变量会让"底色只能来自令牌"的源码扫描判不了（P1-04 的教训）
      backgroundColor: theme.color['bg-sunken'].value,
      paddingHorizontal: theme.space('space_1'),
      borderRadius: theme.radius('radius_small'),
    },
    code_block: {
      ...body,
      color: textColor,
      backgroundColor: theme.color['bg-sunken'].value,
      padding: theme.space('space_3'),
      borderRadius: theme.radius('radius_medium'),
      marginBottom: theme.space('space_2'),
    },
    fence: {
      ...body,
      color: textColor,
      backgroundColor: theme.color['bg-sunken'].value,
      padding: theme.space('space_3'),
      borderRadius: theme.radius('radius_medium'),
      marginBottom: theme.space('space_2'),
    },
    hr: {
      backgroundColor: theme.color['border-subtle'].value,
      height: theme.borderWidth('border_width_hairline'),
    },
    image: { borderRadius: theme.radius('radius_medium') },
    table: { borderColor, borderWidth: theme.borderWidth('border_width_hairline') },
    tr: { borderColor, borderWidth: theme.borderWidth('border_width_hairline') },
    th: { ...body, padding: theme.space('space_2') },
    td: { ...body, padding: theme.space('space_2') },
  };
}

export type MarkdownReaderProps = {
  /** Markdown 原文（后端只存原文） */
  content: string;
  /** 点链接：**由页面决定怎么处理**（站内路由 / 系统浏览器）；返回 true 表示已消费 */
  onLinkPress?: (url: string) => boolean;
  /** 目录（`extractToc` 的结果）；给了就渲染在正文之前 */
  toc?: readonly TocEntry[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function MarkdownReader({
  content,
  onLinkPress,
  toc,
  style,
  testID,
}: MarkdownReaderProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View testID={testID} style={style}>
      {toc && toc.length > 0 ? (
        <View style={{ marginBottom: theme.space('space_4'), gap: theme.space('space_1') }}>
          {toc.map((entry) => (
            <View key={entry.id} style={{ paddingLeft: theme.space(tocIndentKey(entry.level)) }}>
              <Markdown
                mergeStyle={false}
                style={markdownStyles(theme)}
                onLinkPress={onLinkPress}
              >{`- ${entry.text}`}</Markdown>
            </View>
          ))}
        </View>
      ) : null}

      {/* ⚠️ `mergeStyle={false}`：视觉**只**来自 `markdownStyles(theme)`（全部令牌） */}
      <Markdown
        mergeStyle={false}
        style={markdownStyles(theme)}
        onLinkPress={onLinkPress ?? (() => false)}
      >
        {content}
      </Markdown>
    </View>
  );
}
