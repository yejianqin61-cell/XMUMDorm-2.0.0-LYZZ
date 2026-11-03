/**
 * 文字海报预览（节点 A）的**固定样本**：七种文字形状 + 一个超短句。
 *
 * 样本只服务于"模板能不能装下这种文字"的视觉判断：
 *   · 中文短 / 中 / 长、纯英文、中英混排、多段落、Emoji；
 *   · 超短句用来检查 A / D 的留白是否过头（卡片高度不能为了一句话而虚高）。
 *
 * ⛔ 不联网、不写库；阶段 2-B 的发布预览会用用户真实输入替换这些样本。
 */

import type { MessageKey } from '@/i18n';

export type WallPosterLabCaseKey =
  | 'micro'
  | 'shortZh'
  | 'mediumZh'
  | 'longZh'
  | 'english'
  | 'mixed'
  | 'paragraphs'
  | 'emoji';

export type WallPosterLabCase = {
  key: WallPosterLabCaseKey;
  labelKey: MessageKey;
  content: string;
};

export const WALL_POSTER_LAB_CASES: readonly WallPosterLabCase[] = [
  {
    key: 'micro',
    labelKey: 'wall.poster.case.micro',
    content: '晚安。',
  },
  {
    key: 'shortZh',
    labelKey: 'wall.poster.case.shortZh',
    content: '有没有人知道学校哪里最适合自习？',
  },
  {
    key: 'mediumZh',
    labelKey: 'wall.poster.case.mediumZh',
    content:
      '想问问大家，期末周的打印店一般要排多久队？昨天下午在 B1 打印课程报告，等了差不多四十分钟。',
  },
  {
    key: 'longZh',
    labelKey: 'wall.poster.case.longZh',
    content:
      '最近在整理这学期的时间表，发现真正完整空出来的晚上其实没有几个。白天上课、下午社团、晚上赶作业，周末还要补实验报告。\n\n很想问问大家是怎么安排休息的？我现在基本靠周日睡到中午补回来，但周一又会特别困。有没有更稳定的办法？',
  },
  {
    key: 'english',
    labelKey: 'wall.poster.case.english',
    content: 'Anyone up for a slow run around the lake tonight?',
  },
  {
    key: 'mixed',
    labelKey: 'wall.poster.case.mixed',
    content: 'A3 的通宵自习室这周还开吗？Any update would be great — 想提前安排复习时间。',
  },
  {
    key: 'paragraphs',
    labelKey: 'wall.poster.case.paragraphs',
    content:
      '搬进新宿舍的第一周。\n\n阳台下午有很长一段阳光，晒被子刚刚好。\n\n唯一的问题是水压，洗澡要等一会儿。',
  },
  {
    key: 'emoji',
    labelKey: 'wall.poster.case.emoji',
    content: '今天的海南鸡饭也太好吃了吧 🍗🍚 明天还想再去一次！',
  },
];

export function wallPosterLabCase(key: WallPosterLabCaseKey): WallPosterLabCase {
  return WALL_POSTER_LAB_CASES.find((item) => item.key === key) ?? WALL_POSTER_LAB_CASES[1];
}
