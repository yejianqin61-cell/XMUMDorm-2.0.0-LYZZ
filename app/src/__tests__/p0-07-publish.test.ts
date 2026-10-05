/**
 * P0-07 · 发布注册表驱动 —— 自动化用例
 *
 * 依据：App 设计宪法 4.9.3（入口唯一）/ 4.9.5（注册表 + 权限后端布尔）/ 12.2（A-05）/ 16.5。
 */
import * as fs from 'fs';
import * as path from 'path';

import { zh } from '@/i18n';
import {
  PUBLISH_FORM_ROUTE_PATTERN,
  PUBLISH_REGISTRY,
  assertFormRoutesCovered,
  assertRegistryInvariants,
  formRouteFor,
  getPublishEntry,
  visibleEntries,
  type PublishId,
  type Viewer,
} from '@/features/publish/registry';
import { publishIconNames } from '@/features/publish/icons';
import { canSubmit } from '@/features/publish/complianceGate';

const SRC_ROOT = path.resolve(__dirname, '..');
const DICT_KEYS = Object.keys(zh);

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

const readSrc = (rel: string): string => fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');

const ANONYMOUS: Viewer = { signedIn: false };
const STUDENT: Viewer = { signedIn: true, canManageClub: false };
const CLUB_ADMIN: Viewer = { signedIn: true, canManageClub: true };
const ALL_READY_IDS: PublishId[] = ['wall', 'confession', 'clubActivity', 'marketplace', 'errand'];

describe('P0-07 注册表驱动的发布中心', () => {
  describe('TC-P0-07-1A / 2A · 注册表契约', () => {
    it('不变量全部成立（id / titleKey 唯一、词条存在、图标名裸名）', () => {
      expect(() => assertRegistryInvariants(DICT_KEYS)).not.toThrow();
    });

    it('注册表覆盖七类发布（5 ready + 2 planned）', () => {
      const ready = PUBLISH_REGISTRY.filter((e) => e.status === 'ready');
      const planned = PUBLISH_REGISTRY.filter((e) => e.status === 'planned');
      expect(ready).toHaveLength(5);
      expect(planned.map((e) => e.id).sort()).toEqual(['carpool', 'qa']);
    });

    it('每条 titleKey 在 zh 词条表里都存在', () => {
      for (const entry of PUBLISH_REGISTRY) {
        expect(DICT_KEYS).toContain(entry.titleKey);
      }
    });

    it('表单路由模式唯一（一条动态路由承载全部发布表单，宪法 9.2）', () => {
      expect(PUBLISH_FORM_ROUTE_PATTERN).toBe('/publish/[type]');
      expect(() => assertFormRoutesCovered([PUBLISH_FORM_ROUTE_PATTERN])).not.toThrow();
      expect(() => assertFormRoutesCovered(['/publish/other'])).toThrow();
    });

    it('formRouteFor 落在动态路由下，且每类都不同', () => {
      const routes = ALL_READY_IDS.map((id) => formRouteFor(id));
      expect(routes.every((r) => r.startsWith('/publish/'))).toBe(true);
      expect(new Set(routes).size).toBe(ALL_READY_IDS.length);
    });
  });

  describe('TC-P0-07-3A / 4A · 权限矩阵与 planned 永不显示', () => {
    it('未登录 → 一条都不显示（⛔ 也不显示为"禁用"占位）', () => {
      expect(visibleEntries(ANONYMOUS)).toEqual([]);
    });

    it('普通学生 → 4 条（社团活动被后端布尔拦住）', () => {
      expect(visibleEntries(STUDENT).map((e) => e.id)).toEqual([
        'wall',
        'confession',
        'marketplace',
        'errand',
      ]);
    });

    it('社团管理员 → 5 条（多出 clubActivity）', () => {
      expect(visibleEntries(CLUB_ADMIN)).toHaveLength(5);
      expect(visibleEntries(CLUB_ADMIN).map((e) => e.id)).toContain('clubActivity');
    });

    it('carpool / qa 在任何 viewer 下都不出现（后端 0 表 0 端点，TODO TD-01/TD-02）', () => {
      for (const viewer of [ANONYMOUS, STUDENT, CLUB_ADMIN]) {
        const ids = visibleEntries(viewer).map((e) => e.id);
        expect(ids).not.toContain('carpool');
        expect(ids).not.toContain('qa');
      }
    });

    it('permission 只读后端布尔字段，不含任何本地推断', () => {
      const registry = readSrc(path.join('features', 'publish', 'registry.ts'));
      // 只看 permission 定义行（别把 assertRegistryInvariants 里的数组长度校验误判成推断）
      const permissionLines = registry
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('permission:') && !line.endsWith(';'));
      expect(permissionLines.length).toBe(PUBLISH_REGISTRY.length);
      for (const line of permissionLines) {
        expect(line).not.toMatch(/length|Date|count|\?\?/);
      }
      // 且必须出现"后端布尔 === true"这种读法
      expect(registry).toMatch(/=== true/);
    });
  });

  describe('TC-P0-07-8A · 图标覆盖面：注册表与图标表必须一一对应', () => {
    it('注册表里每个图标名都在图标表里有实现（少一处就红，不会静默空白）', () => {
      const available = publishIconNames();
      const missing = PUBLISH_REGISTRY.map((e) => e.icon).filter(
        (name) => !available.includes(name)
      );
      expect(missing).toEqual([]);
    });

    it('⛔ 图标表里没有多余实现（死代码）', () => {
      const used = PUBLISH_REGISTRY.map((e) => e.icon);
      const unused = publishIconNames().filter((name) => !used.includes(name));
      expect(unused).toEqual([]);
    });

    it('图标一律逐图标子路径导入（宪法 16.5-1）', () => {
      const icons = readSrc(path.join('features', 'publish', 'icons.ts'));
      const imports = icons.match(/from 'lucide-react-native[^']*'/g) ?? [];
      expect(imports.length).toBeGreaterThan(0);
      expect(imports.every((line) => line.includes('/icons/'))).toBe(true);
    });
  });

  describe('TC-P0-07-5A / 7A · 入口唯一与"无硬编码按钮列表"', () => {
    it('⛔ 发布中心的条目只能来自注册表（源码里没有硬的发布类型数组）', () => {
      const center = readSrc(path.join('app', 'publish-center.tsx'));
      expect(center).toContain('visibleEntries');
      // 不得逐个 if/数组列七类
      for (const id of [...ALL_READY_IDS, 'carpool', 'qa']) {
        expect(center).not.toContain(`'${id}'`);
        expect(center).not.toContain(`"${id}"`);
      }
    });

    it('⛔ 发布入口只有第 5 格：没有第二个打开发布中心的地方，也没有启用 FAB 降级', () => {
      const files = walkSource(SRC_ROOT);
      const openers = files.filter((f) => {
        const content = fs.readFileSync(f, 'utf8');
        return /router\.push\(PUBLISH_CENTER_ROUTE\)/.test(content);
      });
      expect(openers.map((f) => path.relative(SRC_ROOT, f))).toEqual([
        path.join('app', '(tabs)', '_layout.tsx'),
      ]);
    });

    it("⛔ 生产代码里没有调用降级路径 B（buildTabBarConfig('fab')）", () => {
      const hits = walkSource(SRC_ROOT).filter((f) =>
        /buildTabBarConfig\(\s*'fab'/.test(fs.readFileSync(f, 'utf8'))
      );
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
    });
  });

  describe('TC-P0-07-6A · A-05 合规门禁（宪法 12.2）', () => {
    it('未接受条款 → 拦住，并给出三段可执行文案', () => {
      const result = canSubmit({ signedIn: true, acceptedTerms: false });
      expect(result.allowed).toBe(false);
      if (result.allowed) return;
      for (const key of [result.perceiveKey, result.understandKey, result.fixKey]) {
        expect(DICT_KEYS).toContain(key);
      }
      // 「可改正」必须动词开头（10.4）
      expect(zh[result.fixKey]).toMatch(/^(打开|接受|修改|重试)/);
    });

    it('已接受条款 → 放行', () => {
      expect(canSubmit({ signedIn: true, acceptedTerms: true })).toEqual({ allowed: true });
    });

    it('门禁不看登录态（登录是 A-02 的事，门禁只管 UGC 条款）', () => {
      expect(canSubmit({ signedIn: false, acceptedTerms: true })).toEqual({ allowed: true });
    });

    it('两条文案不得是笼统措辞（10.4 禁用词）', () => {
      const barred = ['出错了', '操作失败', '网络错误', '请稍后重试'];
      const result = canSubmit({ signedIn: true });
      if (result.allowed) throw new Error('门禁应拦住未接受条款的用户');
      const text = `${zh[result.perceiveKey]}${zh[result.understandKey]}${zh[result.fixKey]}`;
      for (const word of barred) {
        expect(text).not.toContain(word);
      }
    });
  });

  describe('路由一致性', () => {
    it('表单承载路由文件存在（/publish/[type]）', () => {
      expect(fs.existsSync(path.join(SRC_ROOT, 'app', 'publish', '[type].tsx'))).toBe(true);
    });

    it('未知 type 会重定向回发布中心（⛔ 不留死路由）', () => {
      const host = readSrc(path.join('app', 'publish', '[type].tsx'));
      expect(host).toContain('<Redirect');
      expect(host).toContain('PUBLISH_CENTER_ROUTE');
    });

    it('getPublishEntry 对未知 id 返回 undefined', () => {
      expect(getPublishEntry('not-a-type' as PublishId)).toBeUndefined();
    });
  });
});
