/**
 * P0-03 · 词条层 Provider 渲染用例
 *
 * ⚠️ RNTL 14 的 `render` 返回 Promise，必须 await。
 */
import * as React from 'react';
import { act, render } from '@testing-library/react-native';

import { I18nProvider, useI18n, type I18nValue } from '@/i18n';

let captured: I18nValue | undefined;

function Probe(): React.ReactElement | null {
  captured = useI18n();
  return null;
}

async function renderWithLocale(props: {
  locale?: 'zh' | 'en' | null;
  systemLocale?: 'zh' | 'en' | null;
}): Promise<void> {
  await render(
    <I18nProvider locale={props.locale} systemLocale={props.systemLocale}>
      <Probe />
    </I18nProvider>
  );
}

describe('P0-03 词条层 Provider', () => {
  beforeEach(() => {
    captured = undefined;
  });

  it('未指定时跟随 systemLocale', async () => {
    await renderWithLocale({ systemLocale: 'en' });
    expect(captured?.locale).toBe('en');
    expect(captured?.t('tab.square')).toBe('Square');
  });

  it('显式 locale 覆盖系统语言', async () => {
    await renderWithLocale({ locale: 'zh', systemLocale: 'en' });
    expect(captured?.locale).toBe('zh');
    expect(captured?.t('tab.square')).toBe('广场');
  });

  it('systemLocale 缺失时落在默认语言（不是 undefined）', async () => {
    await renderWithLocale({ systemLocale: null });
    expect(['zh', 'en']).toContain(captured?.locale);
  });

  it('setLocale 能切换语言（设置页三态的基础）', async () => {
    await renderWithLocale({ systemLocale: 'en' });
    await act(async () => {
      captured?.setLocale('zh');
    });
    expect(captured?.locale).toBe('zh');
    expect(captured?.t('tab.square')).toBe('广场');
  });
});
