/**
 * 通知目标摘要解析器注册表（阶段3-02）—— 自动化用例
 *
 * 测什么：注册表接口本身（丙丁戊后续按此接口交解析器）：
 *   1. 未注册类型 → null（不抛、不猜表名）；
 *   2. 行内解析器注册后能取到摘要，且一律截断；
 *   3. 批量解析器按类型分组、各查一次，返回 `Map<"type:id", excerpt>`；
 *   4. 解析器抛错只让该段摘要为空，不把列表打成 500。
 *
 * 依据：`docs/app_stage2/task/角色甲-公共壳与消息/阶段3-02-目标解析器注册表.md`。
 */

const {
  SOURCE_EXCERPT_MAX,
  truncate,
  registerRowExcerptResolver,
  registerBatchExcerptResolver,
  hasExcerptResolver,
  resolveRowExcerpt,
  resolveBatchExcerpts,
} = require('../../services/notificationTargetResolvers');

describe('通知目标摘要解析器注册表', () => {
  it('未注册类型返回 null，且 hasExcerptResolver 为假', () => {
    expect(hasExcerptResolver('marketplace_item')).toBe(false);
    expect(resolveRowExcerpt('marketplace_item', { anything: 'x' })).toBeNull();
  });

  it('行内解析器注册后返回截断后的摘要', () => {
    registerRowExcerptResolver('handbook_article', (row) => row.article_content);
    const long = '乙'.repeat(200);
    const excerpt = resolveRowExcerpt('handbook_article', { article_content: long });
    expect(excerpt).toHaveLength(SOURCE_EXCERPT_MAX + 1);
    expect(excerpt.endsWith('…')).toBe(true);
  });

  it('空格与换行归一，空白正文返回 null', () => {
    expect(truncate('  a\n\n b  ')).toBe('a b');
    expect(truncate('   ')).toBeNull();
    expect(truncate(null)).toBeNull();
  });

  it('批量解析器按类型分组，返回 type:id → 摘要', async () => {
    const calls = [];
    registerBatchExcerptResolver('marketplace_item', async (ids) => {
      calls.push(ids);
      return new Map(ids.map((id) => [id, `item-${id}`]));
    });
    const resolved = await resolveBatchExcerpts([
      { type: 'marketplace_item', id: 7 },
      { type: 'marketplace_item', id: 8 },
      { type: 'unknown_type', id: 9 },
    ]);
    expect(calls).toEqual([[7, 8]]);
    expect(resolved.get('marketplace_item:7')).toBe('item-7');
    expect(resolved.get('marketplace_item:8')).toBe('item-8');
    expect(resolved.has('unknown_type:9')).toBe(false);
  });

  it('解析器抛错只让该段摘要为空', async () => {
    registerRowExcerptResolver('exploding_type', () => {
      throw new Error('boom');
    });
    expect(resolveRowExcerpt('exploding_type', {})).toBeNull();
  });

  it('非法注册参数直接抛错（早失败）', () => {
    expect(() => registerRowExcerptResolver('', () => null)).toThrow();
    expect(() => registerRowExcerptResolver('x', null)).toThrow();
    expect(() => registerBatchExcerptResolver('x', undefined)).toThrow();
  });
});
