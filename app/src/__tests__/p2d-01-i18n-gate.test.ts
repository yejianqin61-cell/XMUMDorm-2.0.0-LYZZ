/**
 * P2D-01 · 词条门禁（Phase D 收口）—— 自动化用例
 *
 * ## 为什么需要它
 * `MessageKey` 类型能挡住**字面量**拼错的 key（`t('auth.login')` 写错就编译不过），
 * 但**动态拼出来的** key 一律靠 `as MessageKey` 强转绕过类型系统：
 *   · `features/me/profile.ts`  → `` `me.level.${1..6}` ``
 *   · `features/tools/scheduleImport.ts` → `` `weekday.${1..7}` ``
 * 这类 key 一旦漏进词条表，界面上就会出现**原始 key 字符串**（"me.level.4"这种），
 * 而且**没有任何编译期或运行期报错**。本用例把这两个范围的每个可能值都钉住（zh + en 都要有）。
 *
 * ## 还钉一条"账本"
 * 新增一处 `as MessageKey` 强转 = 新增一处**不受类型保护**的 key 来源。
 * 所以强转点必须登记在 `REGISTERED_CAST_FILES` 里 —— 加一处就要想一次。
 *
 * 依据：`docs/app/task/phase-2/开发设计文档-甲.md` Phase D ①（与 `p0-03` 的分工：
 * `p0-03` 管 zh/en **数量与内容**一致，本用例管子集**必须存在**）。
 */
import * as fs from 'fs';
import * as path from 'path';

import { en, zh } from '@/i18n';
import { levelNameKey } from '@/features/me/profile';
import { NOTIFICATION_CATEGORIES } from '@/features/mailbox/notifications';

const SRC_ROOT = path.resolve(__dirname, '..');

/** 允许出现 `as MessageKey` 强转的文件（新增一处就要在这里登记一次） */
const REGISTERED_CAST_FILES: readonly string[] = [
  path.join('features', 'me', 'profile.ts'),
  path.join('features', 'tools', 'scheduleImport.ts'),
  path.join('app', 'tools', 'schedule-import.tsx'),
  path.join('features', 'mailbox', 'MailboxScreen.tsx'),
];

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
};

describe('P2D-01 词条门禁（Phase D）', () => {
  it('TC-P2D-01-1A · 等级词条 6 级 × 2 语言全都存在（`as MessageKey` 拼出来的也不能漏）', () => {
    for (let level = 1; level <= 6; level += 1) {
      const key = levelNameKey(level);
      expect({ key, zh: Object.keys(zh).includes(key) }).toEqual({ key, zh: true });
      expect({ key, en: Object.keys(en).includes(key) }).toEqual({ key, en: true });
    }
  });

  it('TC-P2D-01-2A · 星期词条 1..7 × 2 语言全都存在（课表导入按星期拼 key）', () => {
    for (let day = 1; day <= 7; day += 1) {
      const key = `weekday.${day}`;
      expect({ key, zh: Object.keys(zh).includes(key) }).toEqual({ key, zh: true });
      expect({ key, en: Object.keys(en).includes(key) }).toEqual({ key, en: true });
    }
  });

  it('TC-P2D-01-3A · `as MessageKey` 强转点都有登记（新增一处就要在这里加一行）', () => {
    const offenders = walk(SRC_ROOT)
      .filter((file) => /as MessageKey/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC_ROOT, file))
      .filter((rel) => !REGISTERED_CAST_FILES.includes(rel))
      .sort();
    expect(offenders).toEqual([]);
  });

  it('TC-P2D-01-4A · 动态 key 来源都在**登记的**文件里（加一处就要登记一次）', () => {
    // 动态 key 本身不是错误，**无登记的**动态 key 才是
    const offenders = walk(SRC_ROOT)
      .filter((file) => /t\(`|as MessageKey/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC_ROOT, file))
      .filter((rel) => !REGISTERED_CAST_FILES.includes(rel))
      .sort();
    expect(offenders).toEqual([]);
  });

  it('TC-P2D-01-5A · 信箱三分类词条 × 2 语言都存在（`mailbox.category.${key}` 的取值域）', () => {
    for (const category of NOTIFICATION_CATEGORIES) {
      const key = `mailbox.category.${category}`;
      expect({ key, zh: Object.keys(zh).includes(key) }).toEqual({ key, zh: true });
      expect({ key, en: Object.keys(en).includes(key) }).toEqual({ key, en: true });
    }
    // 分类只有三个（多一个就会在界面上出现原始 key）
    expect([...NOTIFICATION_CATEGORIES]).toEqual(['interaction', 'transaction', 'system']);
  });
});
