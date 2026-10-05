/**
 * P0-03 · 双语词条层与错误文案渲染器 —— 自动化用例（TC-P0-03-1A … 7A）
 *
 * 依据：App 设计宪法 6.x / 10.4 / 10.5 / 14。
 */
import * as fs from 'fs';
import * as path from 'path';

import { en, normalizeLocale, translate, zh, type MessageKey } from '@/i18n';
import {
  classifyNetworkFailure,
  toErrorCopy,
  type AppErrorKind,
} from '@/i18n/errors';

const SRC_ROOT = path.resolve(__dirname, '..');
const INLINE_TERNARY_RE = /isZh\s*\?/;

function walkSource(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSource(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const cjkCount = (s: string): number => (s.match(/[\u4e00-\u9fa5]/g) ?? []).length;
const wordCount = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

/** 被禁止的笼统措辞 / 占位废话（宪法 10.4 / 10.5-5） */
const BANNED_ZH = [
  '出错了',
  '操作失败',
  '网络错误',
  '请稍后重试',
  '系统繁忙',
  '加载中',
  '暂无数据',
  '请稍候',
  '未知错误',
];
const BANNED_EN = [
  'Something went wrong',
  'Please try again later',
  'Operation failed',
  'Network error',
  'Loading...',
];

describe('P0-03 双语词条层与错误文案', () => {
  describe('TC-P0-03-1A · zh / en 键集合完全相等', () => {
    it('对称差为空', () => {
      expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
    });

    it('没有空词条', () => {
      for (const [key, value] of Object.entries(zh)) {
        expect(`${key}:${value.trim().length > 0}`).toBe(`${key}:true`);
      }
      for (const [key, value] of Object.entries(en)) {
        expect(`${key}:${value.trim().length > 0}`).toBe(`${key}:true`);
      }
    });
  });

  describe('TC-P0-03-2A · 禁用词 0 命中', () => {
    it.each(BANNED_ZH)('中文词条不含「%s」', (word) => {
      const hits = Object.entries(zh).filter(([, v]) => v.includes(word));
      expect(hits.map(([k]) => k)).toEqual([]);
    });

    it.each(BANNED_EN)('英文词条不含「%s」', (word) => {
      const hits = Object.entries(en).filter(([, v]) => v.includes(word));
      expect(hits.map(([k]) => k)).toEqual([]);
    });
  });

  describe('TC-P0-03-5A · 字数约束（宪法 10.5-3；错误文案按 10.5-6 豁免）', () => {
    const LABEL_PREFIXES = ['tab.', 'publish.entry.', 'action.'];
    const TITLE_PREFIXES = ['screen.', 'publish.title', 'secondary.'];

    it('按钮 / 标签：中文 ≤6 汉字，英文 ≤2 词', () => {
      const bad: string[] = [];
      for (const key of Object.keys(zh)) {
        if (key.endsWith('Hint')) continue; // a11y 提示语不是按钮标签
        if (!LABEL_PREFIXES.some((p) => key.startsWith(p))) continue;
        if (cjkCount(zh[key as MessageKey]) > 6) bad.push(`zh:${key}`);
        if (wordCount(en[key as MessageKey]) > 2) bad.push(`en:${key}`);
      }
      expect(bad).toEqual([]);
    });

    it('标题：中文 ≤12 汉字', () => {
      const bad = Object.keys(zh).filter(
        (key) =>
          TITLE_PREFIXES.some((p) => key.startsWith(p)) &&
          cjkCount(zh[key as MessageKey]) > 12
      );
      expect(bad).toEqual([]);
    });

    it('⛔ 没有说明性旁白（"这是/你可以/注意"开头）', () => {
      const bad = Object.entries(zh).filter(([, v]) => /^(这是|你可以|注意|本功能)/.test(v));
      expect(bad.map(([k]) => k)).toEqual([]);
    });
  });

  describe('TC-P0-03-3A / 4A · 错误文案三要素与网络三分', () => {
    const KINDS: AppErrorKind[] = [
      'offline',
      'unreachable',
      'timeout',
      'validation',
      'permission',
      'content',
      'conflict',
      'unknown',
    ];
    const ZH_VERB = /^(打开|连上|稍后|修改|切换|刷新|返回|重试)/;
    const EN_VERB = /^(Turn|Join|Retry|Edit|Switch|Refresh|Go)/;

    it.each(KINDS)('%s：三要素齐全且 fix 动词开头', (kind) => {
      const copy = toErrorCopy({ kind, target: '二手标题' }, (k, p) => translate('zh', k, p));
      expect(copy.perceive.length).toBeGreaterThan(0);
      expect(copy.understand.length).toBeGreaterThan(0);
      expect(copy.fix.length).toBeGreaterThan(0);
      expect(copy.fix).toMatch(ZH_VERB);

      const copyEn = toErrorCopy({ kind, target: 'title' }, (k, p) => translate('en', k, p));
      expect(copyEn.fix).toMatch(EN_VERB);
    });

    it('网络三类的 fix 必须两两不同（否则就是没区分，宪法 10.4）', () => {
      const fixes = (['offline', 'unreachable', 'timeout'] as AppErrorKind[]).map(
        (kind) => toErrorCopy({ kind }, (k, p) => translate('zh', k, p)).fix
      );
      expect(new Set(fixes).size).toBe(3);
    });

    it('⛔ 文案里不出现技术细节（状态码 / 堆栈 / SQL）', () => {
      for (const kind of KINDS) {
        const copy = toErrorCopy({ kind }, (k, p) => translate('zh', k, p));
        const text = `${copy.perceive}${copy.understand}${copy.fix}`;
        expect(text).not.toMatch(/\b(HTTP|SQL|stack|Error:|\d{3}\b)/i);
      }
    });

    it('一个错误只给一个主行动（actionKind 是单值枚举）', () => {
      const copy = toErrorCopy({ kind: 'offline' }, (k, p) => translate('zh', k, p));
      expect([
        'retry',
        'edit',
        'refresh',
        'reopen',
        'switchAccount',
      ]).toContain(copy.actionKind);
    });

    it('插值不留下空洞：timeout 的秒数被替换', () => {
      const copy = toErrorCopy(
        { kind: 'timeout', params: { seconds: 8 } },
        (k, p) => translate('zh', k, p)
      );
      expect(copy.understand).toContain('8');
      expect(copy.understand).not.toContain('{seconds}');
    });

    it('classifyNetworkFailure 把三类分清楚', () => {
      expect(classifyNetworkFailure({ reachable: false })).toBe('offline');
      expect(classifyNetworkFailure({ timedOut: true })).toBe('timeout');
      expect(classifyNetworkFailure({})).toBe('unreachable');
    });
  });

  describe('TC-P0-03-6A · 取词与插值', () => {
    it('t 插值替换 {n}', () => {
      expect(translate('zh', 'topbar.mailboxUnread', { n: 3 })).toContain('3');
      expect(translate('en', 'a11y.tabPosition', { i: 2, n: 5 })).toBe('Tab 2 of 5');
    });

    it('缺词条返回 key 本身且不抛（⛔ 不返回空串）', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const missing = 'definitely.missing.key' as MessageKey;
      expect(translate('zh', missing)).toBe(missing);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('normalizeLocale 收敛到 zh / en', () => {
      expect(normalizeLocale('zh-Hans-CN')).toBe('zh');
      expect(normalizeLocale('en-MY')).toBe('en');
      expect(normalizeLocale('ms')).toBe('en');
      expect(normalizeLocale(null)).toBe('zh');
      expect(normalizeLocale(undefined)).toBe('zh');
    });

    it('两种语言下同一 key 都能取到（双语完整）', () => {
      for (const key of Object.keys(zh) as MessageKey[]) {
        expect(translate('zh', key).length).toBeGreaterThan(0);
        expect(translate('en', key).length).toBeGreaterThan(0);
      }
    });
  });

  describe('TC-P0-03-7A · 源码扫描：没有内联双语三元', () => {
    it('app/src 内（排除 __tests__）0 处 isZh ?', () => {
      const hits = walkSource(SRC_ROOT).filter((f) =>
        INLINE_TERNARY_RE.test(fs.readFileSync(f, 'utf8'))
      );
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
    });

    it('词条表是"平坦 key → string"（⛔ 不做嵌套，否则 key 类型推导与缺词条检查会失效）', () => {
      for (const [key, value] of Object.entries(zh)) {
        expect(`${key}:${typeof value}`).toBe(`${key}:string`);
      }
      // key 命名空间必须收敛在已知前缀里，防止出现无归属的散 key
      const knownPrefixes = [
        'tab.',
        'topbar.',
        'a11y.',
        'publish.',
        'screen.',
        'secondary.',
        'tools.',
        'error.',
        'action.',
      ];
      const stray = Object.keys(zh).filter((k) => !knownPrefixes.some((p) => k.startsWith(p)));
      expect(stray).toEqual([]);
    });
  });
});
