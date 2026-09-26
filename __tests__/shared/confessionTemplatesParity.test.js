/**
 * 万能墙版式定义一致性测试 — M09
 *
 * 背景：后端是 CommonJS，无法 require() ESM 版式定义；前端是 ESM。
 * 因此按仓库既有惯例（constants/levelThresholds.js ↔ shared/constants/levelConfig.js）
 * 维护两份「刻意的双胞胎」：
 *   - constants/confessionTemplates.js        （后端校验用）
 *   - shared/constants/confessionTemplates.js （Web 前端渲染用）
 *
 * 本测试是这两份文件唯一的防漂移保障：一旦有人只改了一边（例如新增版式、
 * 调整字数上限），这里会立刻失败。
 */
const backend = require('../../constants/confessionTemplates');
const frontend = require('../../shared/constants/confessionTemplates');

describe('万能墙版式定义前后端一致性', () => {
  it('版式 key 集合完全一致且顺序相同', () => {
    expect(frontend.CONFESSION_TEMPLATE_KEYS).toEqual(backend.CONFESSION_TEMPLATE_KEYS);
  });

  it('每款版式的 maxLength 完全一致', () => {
    const backendMap = backend.CONFESSION_TEMPLATES.map((t) => [t.key, t.maxLength]);
    const frontendMap = frontend.CONFESSION_TEMPLATES.map((t) => [t.key, t.maxLength]);
    expect(frontendMap).toEqual(backendMap);
  });

  it('每款版式的双语标签与描述完全一致', () => {
    backend.CONFESSION_TEMPLATES.forEach((t) => {
      const twin = frontend.CONFESSION_TEMPLATES.find((x) => x.key === t.key);
      expect(twin).toBeDefined();
      expect(twin.labelZh).toBe(t.labelZh);
      expect(twin.labelEn).toBe(t.labelEn);
      expect(twin.descZh).toBe(t.descZh);
      expect(twin.descEn).toBe(t.descEn);
    });
  });

  it('默认版式一致', () => {
    expect(frontend.DEFAULT_CONFESSION_TEMPLATE).toBe(backend.DEFAULT_CONFESSION_TEMPLATE);
  });

  it('normalizeTemplateKey 行为一致（含未知 key 回落）', () => {
    const samples = ['bigtype', 'letter', 'note', '', null, undefined, 'nope', 'BIGTYPE'];
    samples.forEach((key) => {
      expect(frontend.normalizeTemplateKey(key)).toBe(backend.normalizeTemplateKey(key));
    });
  });

  it('getTemplate / getTemplateMaxLength 行为一致', () => {
    const samples = ['bigtype', 'letter', 'note', 'unknown'];
    samples.forEach((key) => {
      expect(frontend.getTemplate(key).key).toBe(backend.getTemplate(key).key);
      expect(frontend.getTemplateMaxLength(key)).toBe(backend.getTemplateMaxLength(key));
    });
  });

  it('三款版式恰好是大字卡 / 信笺卡 / 便签卡', () => {
    expect(backend.CONFESSION_TEMPLATE_KEYS).toEqual(['bigtype', 'letter', 'note']);
  });

  it('未知 key 回落到 bigtype', () => {
    expect(backend.normalizeTemplateKey('unknown')).toBe('bigtype');
    expect(frontend.normalizeTemplateKey('unknown')).toBe('bigtype');
  });

  it('字数上限为 60 / 1000 / 300', () => {
    expect(backend.getTemplateMaxLength('bigtype')).toBe(60);
    expect(backend.getTemplateMaxLength('letter')).toBe(1000);
    expect(backend.getTemplateMaxLength('note')).toBe(300);
  });
});
