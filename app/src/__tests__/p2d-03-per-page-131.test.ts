/**
 * P2D-03 · 甲域逐屏 13.1 验收记录的**账本守卫**
 *
 * 台账：[甲-逐屏13.1验收记录.md](../../../docs/app/test/甲-逐屏13.1验收记录.md)
 *
 * 为什么需要守卫：逐屏验收最容易"悄悄漏一页" ——
 *   · 台账里少一行 → 少验一页，没人会发现；
 *   · 台账里多一行（页早删了）→ 记录变成假账。
 * 所以本用例把台账的**页面清单**与**磁盘上真实存在的路由文件**对起来：
 * 每一行引用的路由文件都必须存在，且**甲域的每个路由文件都必须被一行覆盖**。
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(SRC_ROOT, 'app');
const DOC = path.resolve(__dirname, '..', '..', '..', 'docs', 'app', 'test', '甲-逐屏13.1验收记录.md');

/** 甲域路由文件（↔ 台账第 2 节的行；新增一页就要在台账加一行） */
const JIA_ROUTE_FILES: readonly string[] = [
  '(tabs)/me.tsx',
  'me/edit.tsx',
  'me/posts.tsx',
  'me/conversations.tsx',
  'me/chat/[threadId].tsx',
  'me/settings.tsx',
  'me/legal/index.tsx',
  'me/legal/privacy.tsx',
  'me/legal/terms.tsx',
  'mailbox.tsx',
  'login.tsx',
  'register.tsx',
  'reset-password.tsx',
  'publish-center.tsx',
  'publish/[type].tsx',
  '(tabs)/publish.tsx',
];

describe('P2D-03 甲域逐屏 13.1 验收记录', () => {
  const doc = fs.readFileSync(DOC, 'utf8');

  it('台账正好 15 行记录（`15 页` 的口径要对得上）', () => {
    const rows = doc.split('\n').filter((line) => /^\|\s*\d+\s*\|/.test(line));
    expect(rows).toHaveLength(15);
  });

  it('台账里点名的每个路由文件都在磁盘上（⛔ 不许记录一个不存在的页）', () => {
    for (const rel of JIA_ROUTE_FILES) {
      // 台账用反引号包路径；逐个确认它出现在台账里
      expect({ rel, inDoc: doc.includes(rel) }).toEqual({ rel, inDoc: true });
      expect({ rel, onDisk: fs.existsSync(path.join(APP_DIR, rel)) }).toEqual({ rel, onDisk: true });
    }
  });

  it('`publish` 三条路由被**合并**成一条记录（发布链路），不是漏记', () => {
    const row = doc.split('\n').find((line) => line.includes('发布链路'));
    expect(row).toBeTruthy();
    expect(row).toContain('publish-center.tsx');
    expect(row).toContain('publish/[type].tsx');
    expect(row).toContain('(tabs)/publish.tsx');
  });

  it('⛔ 未验项必须显式出现（打不上勾就不打勾）', () => {
    // 大屏：15 行全部 `❌ 未验`
    const rows = doc.split('\n').filter((line) => /^\|\s*\d+\s*\|/.test(line));
    for (const row of rows) {
      expect({ row: row.slice(0, 24), largeScreenUnverified: /\|\s*❌ 未验\s*\|\s*⚠️ 静态\s*\|$/.test(row.trim()) }).toEqual({
        row: row.slice(0, 24),
        largeScreenUnverified: true,
      });
    }
    // 结论节必须写明"0 条全部打勾"
    expect(doc).toContain('**0 条**');
  });

  it('深链的两处缺陷在台账里被点名（不是留给读者猜）', () => {
    expect(doc).toContain('未登录深链落到登录页');
    expect(doc).toContain('`threadId` 无归属校验');
  });
});
