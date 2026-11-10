/** 排版预览样例，覆盖中英文、不同长度、换行与 Emoji。 */

import type { MessageKey } from '@/i18n';

export type WallPosterLabCaseKey =
  | 'micro'
  | 'shortZh'
  | 'canteen'
  | 'haze'
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
    key: 'canteen',
    labelKey: 'wall.poster.case.canteen',
    content: '今天食堂的饭是不是涨价了？',
  },
  {
    key: 'haze',
    labelKey: 'wall.poster.case.haze',
    content: '我从没见过这么大的雾霾啊啊啊啊',
  },
  {
    key: 'mediumZh',
    labelKey: 'wall.poster.case.mediumZh',
    content:
      '想问问大家，期末周的打印店一般要排多久队？昨天下午在 B1 打印课程报告，等了差不多四十分钟。早上八点会快一点吗？还是图书馆楼下那家更快？',
  },
  {
    key: 'longZh',
    labelKey: 'wall.poster.case.longZh',
    content:
      '最近在整理这学期的时间表，发现真正完整空出来的晚上其实没有几个。白天上课、下午社团、晚上赶作业，周末还要补实验报告。\n\n很想问问大家是怎么安排休息的？我现在基本靠周日睡到中午补回来，但周一又会特别困。有没有更稳定的办法？也想听听每天通勤的同学是怎么安排复习和休息的。',
  },
  {
    key: 'english',
    labelKey: 'wall.poster.case.english',
    content: 'Anyone up for a slow run around the lake tonight?',
  },
  {
    key: 'mixed',
    labelKey: 'wall.poster.case.mixed',
    content: 'A3 的通宵自习室这周还开吗？听说 Final 周会延长开放时间。',
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
    content: '今天的海南鸡饭也太好吃了吧 🍗🍚\nTomorrow 12:30 再去一次！B1 的 A/C 也终于修好啦。',
  },
];

export function wallPosterLabCase(key: WallPosterLabCaseKey): WallPosterLabCase {
  return WALL_POSTER_LAB_CASES.find((item) => item.key === key) ?? WALL_POSTER_LAB_CASES[1];
}
