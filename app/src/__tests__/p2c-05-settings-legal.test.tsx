/**
 * P2C-05 · `M-13` 设置 + `M-18/19/20` 静态三页 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：法务文本**三份 × 两语言都非空**；
 *   S-1 页面：设置页的语言切换**立即生效**、未上线入口不显示；法务页**离线也读得到**且⛔ 不误报"不是最新"；
 *   S-5 结构约束：三页共用一个 `StaticPage`（⛔ 没有第二套长文渲染）。
 *
 * 依据：`docs/app/task/phase-2/P2C-05-M13设置与静态三页.md`（含 Q5 的默认口径：占位正文 + 登记上架前替换）。
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { zh } from '@/i18n';
import { SettingsScreen } from '@/features/me/SettingsScreen';
import { LegalDocScreen, LegalHubScreen } from '@/features/me/LegalScreens';
import { LEGAL_DOCS, assertLegalDocsComplete, legalDocText } from '@/features/me/legal';
import { EXPECTED_UNAVAILABLE, ME_ENTRIES, visibleEntries } from '@/features/me/profile';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

const SRC_ROOT = path.resolve(__dirname, '..');

describe('P2C-05 设置与法务三页', () => {
  it('TC-P2C-05-1A · 法务文本：两份文档 × 两种语言都非空，且是**可辨识的占位**', () => {
    expect(() => assertLegalDocsComplete()).not.toThrow();
    for (const doc of LEGAL_DOCS) {
      expect(legalDocText(doc.id, 'zh').trim().length).toBeGreaterThan(0);
      // ⛔ 不假装是最终文本：开头就写明"占位"
      expect(legalDocText(doc.id, 'zh')).toContain('占位正文');
      expect(legalDocText(doc.id, 'en').toLowerCase()).toContain('placeholder');
    }
    expect(LEGAL_DOCS.map((doc) => doc.id)).toEqual(['privacy', 'terms']);
  });

  it('TC-P2C-05-2A · 离线可读：远端拿不到也显示内置正文，且⛔ 不报"不是最新"', async () => {
    // `fetchRemote` 就是内置正文（语义上=权威来源，不需要网络）→ 不该出现 stale 提示
    const view = await renderApp(<LegalDocScreen docId="privacy" />);
    await waitFor(() => expect(view.getByTestId('screen-legal-privacy')).toBeTruthy());
    expect(view.queryByText(zh['me.legal.stale'])).toBeNull();
  });

  it('TC-P2C-05-3A · 切换语言：当前页文案**立即**跟着变（⛔ 不用重启）', async () => {
    const view = await renderApp(<SettingsScreen />);
    // ⚠️ 用**唯一**的字符串断言（'设置' 同时是页面标题与入口行）
    expect(view.getByText(zh['me.settings.language'])).toBeTruthy();

    fireEvent.press(view.getByTestId('settings-locale-en'));
    await waitFor(() => expect(view.getAllByText('Language').length).toBeGreaterThan(0));
    // 中文文案应当消失（不是两套并存）
    expect(view.queryByText(zh['me.settings.language'])).toBeNull();
  });

  it('TC-P2C-05-4A · 未上线的入口不显示；能进去的才显示', async () => {
    const view = await renderApp(<SettingsScreen />);
    // 记账本：`about` 已落地 → 出现在设置里；`posts` 不在这里（它直接在「我的」上）
    expect(view.getByTestId('settings-entry-about')).toBeTruthy();
    expect(view.queryByTestId('settings-entry-posts')).toBeNull();
    // 未上线的三页（通知与推送/屏蔽用户/账号注销）⛔ 不显示禁用占位
    expect(view.queryByText('通知与推送')).toBeNull();
    expect(view.queryByText('屏蔽用户')).toBeNull();
  });

  it('TC-P2C-05-5A · 入口账本已清空（三条都落地了）', () => {
    expect(EXPECTED_UNAVAILABLE).toEqual([]);
    expect(visibleEntries().map((entry) => entry.key)).toEqual(['posts', 'settings', 'about']);
    // 每个入口的路由文件都真的在磁盘上
    for (const entry of ME_ENTRIES) {
      const candidates = [
        path.join(SRC_ROOT, 'app', `${entry.route.replace(/^\//, '')}.tsx`),
        path.join(SRC_ROOT, 'app', entry.route.replace(/^\//, ''), 'index.tsx'),
      ];
      expect({ route: entry.route, exists: candidates.some((file) => fs.existsSync(file)) }).toEqual({
        route: entry.route,
        exists: true,
      });
    }
  });

  it('TC-P2C-05-6A · `M-18` 是入口列表，两份法务文档都在', async () => {
    const view = await renderApp(<LegalHubScreen />);
    expect(view.getByTestId('legal-entry-privacy')).toBeTruthy();
    expect(view.getByTestId('legal-entry-terms')).toBeTruthy();
  });

  it('TC-P2C-05-7A · 结构约束：三页共用同一个 `StaticPage`（⛔ 没有第二套长文渲染）', () => {
    const code = stripComments(
      fs.readFileSync(path.join(SRC_ROOT, 'features', 'me', 'LegalScreens.tsx'), 'utf8')
    );
    expect(code).toContain('StaticPage');
    expect(code).toContain('useStaticDoc');
    // ⛔ 不用 WebView 渲染法务长文（宪法 4.1.2）
    expect(code).not.toMatch(/WebView/);
    // 两份文档由同一处配置驱动（LEGAL_DOCS），⛔ 不逐页复制
    expect(code).toContain('LEGAL_DOCS');
  });
});
