/**
 * P0-02 · 令牌接入与主题层 —— 自动化用例（TC-P0-02-1A … 5A / 7A）
 *
 * 依据：App 设计宪法 2.1 / 2.3 / 2.5 / 9.12 / 1.4 / 14。
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  colors,
  colorsFor,
  darkColors,
  lightColors,
  scale,
  type ColorToken,
} from '@/design-system/tokens';
import {
  borderWidth,
  motionDuration,
  ms,
  px,
  radius,
  space,
} from '@/design-system/px';
import { TEXT_ROLES } from '@/design-system/typography';

const SRC_ROOT = path.resolve(__dirname, '..');
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;
const FONT_SIZE_RE = /fontSize\s*:/;

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

const TOKEN_ENTRIES: Array<[string, Record<string, ColorToken>]> = [
  ['dark', darkColors as Record<string, ColorToken>],
  ['light', lightColors as Record<string, ColorToken>],
];

describe('P0-02 令牌接入与主题层', () => {
  describe('TC-P0-02-1A · 色令牌字面量格式', () => {
    it.each(TOKEN_ENTRIES)('%s：每个 value 都是 6 位小写 hex', (_theme, tokens) => {
      const bad = Object.entries(tokens).filter(([, t]) => !/^#[0-9a-f]{6}$/.test(t.value));
      expect(bad.map(([k]) => k)).toEqual([]);
    });

    it('两套主题都非空（防止暗色漏令牌）', () => {
      expect(Object.keys(darkColors).length).toBeGreaterThan(20);
      expect(Object.keys(lightColors).length).toBeGreaterThan(20);
    });
  });

  describe('TC-P0-02-2A · textSafe 逐个实测达标（宪法 2.3）', () => {
    it.each(TOKEN_ENTRIES)('%s：textSafe=true ⇒ contrastRatio ≥ minRatio', (_theme, tokens) => {
      const bad = Object.entries(tokens)
        .filter(([, t]) => t.textSafe)
        .filter(([, t]) => t.contrastRatio === null || t.contrastRatio < t.minRatio)
        .map(([k, t]) => `${k}(${t.contrastRatio}/${t.minRatio})`);
      expect(bad).toEqual([]);
    });

    it('可承载正文的文字令牌都存在（text-primary 两套都要有）', () => {
      for (const [, tokens] of TOKEN_ENTRIES) {
        expect(tokens['text-primary'].textSafe).toBe(true);
      }
    });
  });

  describe('TC-P0-02-3A · 令牌元数据自洽', () => {
    it.each(TOKEN_ENTRIES)('%s：usage 取值合法且 theme 字段与所在主题一致', (theme, tokens) => {
      const allowed = ['surface', 'fill', 'text', 'icon', 'border'];
      const bad = Object.entries(tokens)
        .filter(([, t]) => !allowed.includes(t.usage) || t.theme !== theme)
        .map(([k]) => k);
      expect(bad).toEqual([]);
    });

    it('每个令牌都带宪法 2.3 要求的六项元数据（缺一即不合格）', () => {
      const required = ['value', 'usage', 'textSafe', 'contrastOn', 'contrastRatio', 'minRatio'];
      for (const [, tokens] of TOKEN_ENTRIES) {
        for (const [name, t] of Object.entries(tokens)) {
          const missing = required.filter((k) => !Object.prototype.hasOwnProperty.call(t, k));
          expect(`${name}:${missing.join(',')}`).toBe(`${name}:`);
        }
      }
    });

    it('text / icon / border 三类令牌必须有可算定的对比度数值（surface / fill 允许为 null）', () => {
      // 生成物的契约：`contrastRatio` 为 null 只在"无法定位基准底"时出现，即仅 surface / fill
      // （fill 的配对文字记录在对应的 text 令牌上，如 text-on-fill 的 contrastOn = action-primary）
      const needsRatio = ['text', 'icon', 'border'];
      for (const [, tokens] of TOKEN_ENTRIES) {
        for (const [name, t] of Object.entries(tokens)) {
          if (!needsRatio.includes(t.usage)) continue;
          const ok = typeof t.contrastRatio === 'number' && t.contrastRatio > 0;
          expect(`${name}:${ok}`).toBe(`${name}:true`);
        }
      }
    });
  });

  describe('TC-P0-02-4A · px / ms 转换（屏内不得再写数字）', () => {
    it('px 正常 / 边界 / 非法输入', () => {
      expect(px('16px')).toBe(16);
      expect(px('9999px')).toBe(9999);
      expect(px('4px')).toBe(4);
      expect(px('0.5px')).toBe(0.5);
      expect(px(24)).toBe(24);
      expect(px('-4px')).toBe(-4);
      expect(px('')).toBe(0);
      expect(px('auto')).toBe(0);
      expect(px(undefined)).toBe(0);
      expect(px(null)).toBe(0);
      expect(px(Number.NaN)).toBe(0);
    });

    it('ms 支持 ms 与 s', () => {
      expect(ms('120ms')).toBe(120);
      expect(ms('1.5s')).toBe(1500);
      expect(ms('bad')).toBe(0);
    });

    it('space / radius / borderWidth / motionDuration 逐键都能转成 number', () => {
      expect(space('space_4')).toBe(16);
      expect(space('space_12')).toBe(48);
      expect(radius('radius_full')).toBe(9999);
      expect(borderWidth('border_width_brutal')).toBe(2);
      expect(motionDuration('motion_duration_base')).toBe(220);
      for (const key of Object.keys(scale.space) as Array<keyof typeof scale.space>) {
        expect(Number.isFinite(space(key))).toBe(true);
      }
    });
  });

  describe('TC-P0-02-5A · 源码扫描：0 处 hex / 0 处 fontSize 字面量', () => {
    const files = walkSource(SRC_ROOT);

    it('至少扫到了生产代码文件（防止扫描路径写错导致"假绿"）', () => {
      expect(files.length).toBeGreaterThanOrEqual(5);
    });

    it('没有硬编码色值', () => {
      const hits = files.filter((f) => HEX_RE.test(fs.readFileSync(f, 'utf8')));
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
    });

    it('没有 fontSize 字面量', () => {
      const hits = files.filter((f) => FONT_SIZE_RE.test(fs.readFileSync(f, 'utf8')));
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
    });

    it('⛔ 每个生产代码文件都不得写死 paddingTop: <数字>（宪法 17.1-S1）', () => {
      const re = /padding(Top|Bottom|Left|Right)\s*:\s*\d/;
      const hits = files.filter((f) => re.test(fs.readFileSync(f, 'utf8')));
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
    });
  });

  describe('TC-P0-02-6A · 两套主题键集合完全一致', () => {
    it('dark 与 light 的令牌名集合相等', () => {
      expect(Object.keys(colors.dark).sort()).toEqual(Object.keys(colors.light).sort());
    });

    it('colorsFor 返回对应主题的对象', () => {
      expect(colorsFor('dark')).toBe(colors.dark);
      expect(colorsFor('light')).toBe(colors.light);
    });
  });

  describe('TC-P0-02-7A · 字阶角色集合 = 令牌源声明', () => {
    it('TEXT_ROLES 与 scale.fontRole 的值集合相等', () => {
      expect([...TEXT_ROLES].sort()).toEqual(Object.values(scale.fontRole).sort());
    });

    it('⛔ 角色层不产生绝对字号（本层只有角色名）', () => {
      expect(TEXT_ROLES.every((r) => typeof r === 'string')).toBe(true);
      expect(TEXT_ROLES.length).toBe(7);
    });
  });

  describe('令牌层的两条结构性约束', () => {
    it('⛔ design-system/tokens.ts 不导出 palette（业务代码不得按档位取色，宪法 2.3）', () => {
      const content = fs.readFileSync(path.join(SRC_ROOT, 'design-system', 'tokens.ts'), 'utf8');
      expect(content).not.toMatch(/^\s*palette,\s*$/m);
    });

    it('design-system 层只做重导出，不复制生成物的数值（宪法 2.1 末句）', () => {
      const content = fs.readFileSync(path.join(SRC_ROOT, 'design-system', 'tokens.ts'), 'utf8');
      expect(content).toContain("from '../../../tokens/generated/native-tokens'");
      expect(content).not.toMatch(HEX_RE);
    });
  });
});
