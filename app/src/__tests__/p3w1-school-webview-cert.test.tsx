/**
 * W-1 / W-2（docs/app/evaluation/校方系统WebView评估与UIUX改进方向.md）
 *   W-1 Moodle 证书链缺交叉证书 → Android ≤13 打不开 → 网络安全配置为校方域名补信 Sectigo R46/E46
 *   W-2 WebView 失败时不再露出库自带的技术性错误页
 */
import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { classifyWebViewError } from '@/features/tools/webViewError';
import { SchoolSystemWebView } from '@/features/tools/SchoolSystemWebView';
import { getSchoolSystem } from '@/features/tools/schoolSystems';

jest.mock('react-native-webview', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  const lastProps: { current: any } = { current: null };
  const reloads: { count: number } = { count: 0 };
  const WebView = ReactLib.forwardRef(function WebViewStub(props: any, ref: any) {
    lastProps.current = props;
    ReactLib.useImperativeHandle(ref, () => ({ injectJavaScript: () => {}, reload: () => { reloads.count += 1; } }));
    return ReactLib.createElement(View, { testID: props.testID });
  });
  return { __esModule: true, default: WebView, __lastProps: lastProps, __reloads: reloads };
});
const webview = require('react-native-webview') as { __lastProps: { current: any }; __reloads: { count: number } };

const APP_ROOT = path.resolve(__dirname, '../..');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require('../../plugins/withSchoolNetworkSecurity') as {
  buildXml: (cleartext: boolean) => string; ROOTS: string[]; SCHOOL_DOMAIN: string;
};

describe('W-1 · 校方域名补信 Sectigo 公开根', () => {
  it('插件已挂进 app.json', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'app.json'), 'utf8'));
    expect(appJson.expo.plugins).toContain('./plugins/withSchoolNetworkSecurity');
  });

  it('只对 xmu.edu.my 补根；正式包不放明文，debug 放明文（Metro）', () => {
    const release = plugin.buildXml(false);
    expect(release).toContain('<domain includeSubdomains="true">xmu.edu.my</domain>');
    expect(release).toContain('<base-config cleartextTrafficPermitted="false">');
    expect(plugin.buildXml(true)).toContain('<base-config cleartextTrafficPermitted="true">');
    // 自定义根只出现在 domain-config 里，base-config 仍只信系统根
    const base = release.slice(release.indexOf('<base-config'), release.indexOf('</base-config>'));
    expect(base).not.toContain('@raw/');
    // ⛔ 不信任用户自装 CA
    expect(release).not.toContain('src="user"');
  });

  it.each(['sectigo_public_server_auth_root_r46', 'sectigo_public_server_auth_root_e46'])(
    '%s 是自签公开根，资源名合法', (name) => {
      expect(plugin.ROOTS).toContain(name);
      expect(name).toMatch(/^[a-z0-9_]+$/);
      const pem = fs.readFileSync(path.join(APP_ROOT, 'plugins', 'certs', `${name}.pem`), 'utf8');
      expect(pem.trim().startsWith('-----BEGIN CERTIFICATE-----')).toBe(true);
      expect(pem).not.toMatch(/PRIVATE KEY/);
    });

  it('⛔ 不放行证书错误（源码里没有 proceed / 忽略 SSL 的开关）', () => {
    const src = fs.readFileSync(path.join(APP_ROOT, 'src/features/tools/SchoolSystemWebView.tsx'), 'utf8');
    expect(src).not.toMatch(/proceed\(|ignoreSslError|onReceivedSslError/);
  });
});

describe('W-2 · WebView 错误分类', () => {
  it.each([
    [{ code: 3, description: 'SSL error: The certificate authority is not trusted' }, 'certificate'],
    [{ code: -11, description: 'net::ERR_SSL_PROTOCOL_ERROR' }, 'certificate'],
    [{ code: -8, description: 'net::ERR_TIMED_OUT' }, 'timeout'],
    [{ code: -2, description: 'net::ERR_NAME_NOT_RESOLVED' }, 'unreachable'],
    [{ code: -2, description: 'net::ERR_INTERNET_DISCONNECTED' }, 'offline'],
    [{ code: -2, description: 'net::ERR_CERT_DATE_INVALID' }, 'certificate'],
    [{ code: -6, description: 'net::ERR_CONNECTION_REFUSED' }, 'unreachable'],
    [{ domain: 'NSURLErrorDomain', code: -1202, description: 'The certificate for this server is invalid.' }, 'certificate'],
    [{ domain: 'NSURLErrorDomain', code: -1001, description: 'The request timed out.' }, 'timeout'],
    [{ domain: 'NSURLErrorDomain', code: -1009, description: 'The Internet connection appears to be offline.' }, 'offline'],
    [{ domain: 'NSURLErrorDomain', code: -1004, description: 'Could not connect to the server.' }, 'unreachable'],
  ] as const)('%j → %s', (input, kind) => {
    expect(classifyWebViewError(input)).toBe(kind);
  });
});

describe('W-2 · 自定义错误页', () => {
  const system = getSchoolSystem('moodle')!;
  /** 宿主和错误页放在同一棵树里：错误页的「重试」要走宿主的 ref */
  const setters: { show?: (el: React.ReactElement) => void } = {};
  function Harness(): React.ReactElement {
    const [errorEl, setErrorEl] = React.useState<React.ReactElement | null>(null);
    setters.show = setErrorEl;
    return <><SchoolSystemWebView system={system} testID="wv" />{errorEl}</>;
  }
  const showError = (code: number, description: string) =>
    act(async () => { setters.show!(webview.__lastProps.current.renderError(undefined, code, description)); });

  it('证书错：显示设计系统错误态，主行动交给系统浏览器', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const view = await renderApp(<Harness />, { inScreen: true });
    await showError(3, 'SSL error: The certificate authority is not trusted');
    expect(view.getByTestId('school-system-error-certificate')).toBeTruthy();
    expect(view.queryByText(/Error Code|Domain:|SSL error/)).toBeNull();
    fireEvent.press(view.getByRole('button'));
    expect(open).toHaveBeenCalledWith(system.startUrl);
    open.mockRestore();
  });

  it('不可达：主行动是重新加载', async () => {
    const view = await renderApp(<Harness />, { inScreen: true });
    const before = webview.__reloads.count;
    await showError(-2, 'net::ERR_NAME_NOT_RESOLVED');
    expect(view.getByTestId('school-system-error-unreachable')).toBeTruthy();
    fireEvent.press(view.getByRole('button'));
    expect(webview.__reloads.count).toBe(before + 1);
  });
});
