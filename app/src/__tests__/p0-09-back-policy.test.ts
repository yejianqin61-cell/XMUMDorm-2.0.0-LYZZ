/**
 * P0-09 · Android 返回键 spike（R1）—— 自动化用例
 *
 * 自动可判的部分：返回策略的四类状态、⛔ 不劫持系统返回、app.json 的显式字段、
 * 备用插件**未被启用**（挂了就意味着我们放弃了对默认值翻转的感知）。
 *
 * ⛔ 必须真机（见 R1 结论文档 §4）：五格各 Tab 的逐级返回、栈底再按一次、发布中心内返回、
 *    后台恢复后返回键是否仍有效（RN 0.86 修的就是 API 36+ 这一条）。
 */
import * as fs from 'fs';
import * as path from 'path';

import { isExitIntent, resolveBackAction } from '@/features/navigation/backPolicy';

const APP_ROOT = path.resolve(__dirname, '..', '..');
const SRC_ROOT = path.resolve(__dirname, '..');
const readSrc = (rel: string): string => fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');

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

describe('P0-09 Android 返回键（R1）', () => {
  describe('TC-P0-09-1A … 3A · 返回策略', () => {
    it('发布中心内 → 只关闭发布中心（⛔ 不得把底栏切到别处，4.9.2-④）', () => {
      expect(
        resolveBackAction({ overlay: 'publishCenter', canGoBack: true, atTabRoot: false })
      ).toBe('closeOverlay');
    });

    it('校方系统 / 信箱内 → 关闭该覆盖层', () => {
      expect(resolveBackAction({ overlay: 'schoolSystem', canGoBack: true, atTabRoot: false })).toBe(
        'closeOverlay'
      );
      expect(resolveBackAction({ overlay: 'mailbox', canGoBack: true, atTabRoot: false })).toBe(
        'closeOverlay'
      );
    });

    it('二级页 → 正常出栈（回到进入前的 Tab 与滚动位置）', () => {
      expect(resolveBackAction({ overlay: null, canGoBack: true, atTabRoot: false })).toBe('popStack');
    });

    it('栈底 → 交给系统（⛔ 我们不劫持、不自己退出）', () => {
      expect(resolveBackAction({ overlay: null, canGoBack: false, atTabRoot: true })).toBe('exitApp');
      expect(isExitIntent({ overlay: null, canGoBack: false, atTabRoot: true })).toBe(true);
    });

    it('覆盖层优先级最高（即使能出栈也先关覆盖层）', () => {
      expect(
        resolveBackAction({ overlay: 'publishCenter', canGoBack: true, atTabRoot: false })
      ).not.toBe('popStack');
    });
  });

  describe('TC-P0-09-4A · ⛔ 不劫持系统返回键（宪法 4.4.2）', () => {
    it('全仓 0 处 hardwareBackPress / BackHandler 订阅', () => {
      const hits = walkSource(SRC_ROOT).filter((f) =>
        /hardwareBackPress|BackHandler\.addEventListener/.test(fs.readFileSync(f, 'utf8'))
      );
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
    });

    it('返回策略是纯逻辑：不含任何平台 API', () => {
      const policy = readSrc(path.join('features', 'navigation', 'backPolicy.ts'));
      expect(policy).not.toMatch(/from 'react-native'/);
      expect(policy).not.toMatch(/BackHandler/);
    });
  });

  describe('TC-P0-09-5A · app.json 显式声明与备用插件未启用', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'app.json'), 'utf8')) as {
      expo: { android: Record<string, unknown>; plugins?: unknown[] };
    };

    it('predictiveBackGestureEnabled **显式为 false**（⛔ 不吃默认值，防 SDK 翻转）', () => {
      expect(appJson.expo.android.predictiveBackGestureEnabled).toBe(false);
    });

    it('⚠️ 备用插件存在但**没有**挂进 plugins（挂了就失去对默认值翻转的感知）', () => {
      const pluginPath = path.join(APP_ROOT, 'plugins', 'withDisablePredictiveBack.js');
      expect(fs.existsSync(pluginPath)).toBe(true);
      const plugins = (appJson.expo.plugins ?? []).map((entry) =>
        typeof entry === 'string' ? entry : Array.isArray(entry) ? String(entry[0]) : ''
      );
      expect(plugins.join('|')).not.toContain('withDisablePredictiveBack');
    });
  });
});
