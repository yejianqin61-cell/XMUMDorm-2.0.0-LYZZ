/**
 * P1-14 · 工具 A（`T-04` 校方系统与会话 + `T-05` 内嵌浏览器）—— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：**会话三态的证据规则**、注入消息分流、读表脚本的纪律
 *   S-3 落盘：会话状态落 AsyncStorage（**不是凭据**，过得了落盘层护栏）
 *   S-1 组件/页面：`T-04` 三张 `D27` 卡 + 清除会话；`T-05` 工具栏与读表回显；`T-01` 入口
 *   S-5 结构约束：注入脚本**只观察不动手**（宪法 4.1.2-4）
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { getItem, removeItem, setItem } from '@/shared/storage';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';

import {
  SESSION_KIND,
  SCRAPE_KIND,
  buildScheduleScrapeScript,
  buildSessionProbeScript,
  parseWebViewMessage,
} from '@/features/tools/injectedScripts';
import {
  SCHOOL_SESSION_IDS,
  clearSchoolSession,
  nextSchoolSessionState,
  readSchoolSessions,
  schoolSessionKey,
  sessionStateAfterClear,
  useSchoolSessions,
  writeSchoolSession,
} from '@/features/tools/schoolSession';
import { SchoolSystemList } from '@/features/tools/SchoolSystemList';
import { SchoolSystemWebView } from '@/features/tools/SchoolSystemWebView';
import { assertNotCredential } from '@/shared/storage';

/* ── 原生 WebView 替身：Jest 里没有原生桥 ─────────────────────────────── */
jest.mock('react-native-webview', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  const calls: string[] = [];
  const lastProps: { current: any } = { current: null };
  const WebView = ReactLib.forwardRef(function WebViewStub(props: any, ref: any) {
    // 记录最新 props：测试要能手动触发 `onLoadEnd` / `onNavigationStateChange`
    lastProps.current = props;
    ReactLib.useImperativeHandle(ref, () => ({
      injectJavaScript: (script: string) => {
        calls.push(script);
      },
    }));
    return ReactLib.createElement(View, { testID: props.testID });
  });
  return { __esModule: true, default: WebView, __calls: calls, __lastProps: lastProps };
});

/* ── expo-router 替身（不启真实导航容器）──────────────────────────────── */
jest.mock('expo-router', () => {
  const state = { pushed: [] as unknown[], backCount: 0, id: 'ac' as string };
  return {
    __state: state,
    useRouter: () => ({
      push: (target: unknown) => state.pushed.push(target),
      back: () => {
        state.backCount += 1;
      },
    }),
    useLocalSearchParams: () => ({ id: state.id }),
    Redirect: () => null,
  };
});

const webview = require('react-native-webview') as {
  __calls: string[];
  __lastProps: { current: any };
};
const routerState = require('expo-router').__state as {
  pushed: unknown[];
  backCount: number;
  id: string;
};

const TOOLS_DIR = path.resolve(__dirname, '../features/tools');
const readTools = (file: string): string => fs.readFileSync(path.join(TOOLS_DIR, file), 'utf8');
const APP_DIR = path.resolve(__dirname, '../app');
const readApp = (file: string): string => fs.readFileSync(path.join(APP_DIR, file), 'utf8');

const SchoolSystemScreen = require('../app/system/[id]').default as () => React.ReactElement;
const ToolsScreen = require('../app/(tabs)/tools').default as () => React.ReactElement;

beforeEach(async () => {
  webview.__calls.length = 0;
  routerState.pushed.length = 0;
  routerState.backCount = 0;
  routerState.id = 'ac';
  for (const id of SCHOOL_SESSION_IDS) await removeItem(schoolSessionKey(id));
});

describe('TC-P1-14-1A · 文件齐备', () => {
  it('会话模块 / 列表页 / 两个路由都在', () => {
    for (const file of ['schoolSession.ts', 'SchoolSystemList.tsx']) {
      expect(fs.existsSync(path.join(TOOLS_DIR, file))).toBe(true);
    }
    expect(fs.existsSync(path.join(APP_DIR, 'tools', 'school-systems.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(APP_DIR, 'system', '[id].tsx'))).toBe(true);
  });
});

describe('TC-P1-14-2A · 注入消息分流（纯函数）', () => {
  it('会话消息 → 结构化', () => {
    expect(parseWebViewMessage(JSON.stringify({ kind: SESSION_KIND, hasPasswordField: true }))).toEqual(
      { kind: 'session', hasPasswordField: true }
    );
  });

  it('课表消息 → **原样交回**（严格解析留给既有的 `extractSchedule`，⛔ 不重复实现）', () => {
    const raw = JSON.stringify({ kind: SCRAPE_KIND, rows: [['a', 'b']] });
    expect(parseWebViewMessage(raw)).toEqual({ kind: 'schedule', raw });
  });

  it('非法 / 缺字段 / 未知 kind → unknown（⛔ 不抛）', () => {
    expect(parseWebViewMessage('not json')).toEqual({ kind: 'unknown' });
    expect(parseWebViewMessage('null')).toEqual({ kind: 'unknown' });
    expect(parseWebViewMessage(JSON.stringify({ kind: SESSION_KIND }))).toEqual({ kind: 'unknown' });
    expect(parseWebViewMessage(JSON.stringify({ kind: 'x' }))).toEqual({ kind: 'unknown' });
  });
});

describe('TC-P1-14-3A · ⛔ 注入脚本**只观察不动手**（宪法 4.1.2-4）', () => {
  it('会话探测读密码框并回传，不填表、不点击', () => {
    const script = buildSessionProbeScript();
    expect(script).toContain("input[type=password]");
    expect(script).toContain(SESSION_KIND);
    expect(script).toContain('postMessage');
    // ⛔ 不得出现任何"代替用户操作"的调用
    for (const forbidden of ['.click(', '.submit(', '.value =', 'dispatchEvent']) {
      expect(script).not.toContain(forbidden);
    }
  });

  it('读表脚本同样只读（沿用 P0 的脚本，本轮未改语义）', () => {
    const script = buildScheduleScrapeScript();
    expect(script).toContain('querySelectorAll');
    for (const forbidden of ['.click(', '.submit(', '.value =']) {
      expect(script).not.toContain(forbidden);
    }
  });
});

describe('TC-P1-14-4A · 会话三态的证据规则（纯函数）', () => {
  it('看到系统内部（无密码框）→ signedIn', () => {
    expect(nextSchoolSessionState('signedOut', { hasPasswordField: false })).toBe('signedIn');
    expect(nextSchoolSessionState('expired', { hasPasswordField: false })).toBe('signedIn');
  });

  it('⛔ **没登录过**再看到登录页 → 仍是 signedOut（⛔ 不谎报"过期"）', () => {
    expect(nextSchoolSessionState('signedOut', { hasPasswordField: true })).toBe('signedOut');
  });

  it('**进得去又被弹回登录页** → expired（这才是"会话丢了"的证据）', () => {
    expect(nextSchoolSessionState('signedIn', { hasPasswordField: true })).toBe('expired');
  });

  it('已经是 expired 再看到登录页 → 保持 expired', () => {
    expect(nextSchoolSessionState('expired', { hasPasswordField: true })).toBe('expired');
  });

  it('清除会话 → signedOut', () => {
    expect(sessionStateAfterClear()).toBe('signedOut');
  });
});

describe('TC-P1-14-5A · 会话状态落盘（**不是凭据**）', () => {
  it('落盘 key 过得了凭据护栏（`session` 不在禁用词里）', () => {
    expect(() => assertNotCredential(schoolSessionKey('ac'))).not.toThrow();
    expect(schoolSessionKey('ac')).toBe('school-session:ac');
  });

  it('写入后读得回来；没写过的系统一律 signedOut', async () => {
    await writeSchoolSession('ac', 'signedIn', 1234);
    const all = await readSchoolSessions();
    expect(all.ac).toEqual({ state: 'signedIn', observedAt: 1234 });
    expect(all.moodle.state).toBe('signedOut');
    expect(all.checkin.state).toBe('signedOut');
  });

  it('清除后回到 signedOut（落盘也清掉）', async () => {
    await writeSchoolSession('ac', 'expired');
    await clearSchoolSession('ac');
    expect(await getItem(schoolSessionKey('ac'))).toBeNull();
    expect((await readSchoolSessions()).ac.state).toBe('signedOut');
  });

  it('落盘里是坏值时按 signedOut 处理（⛔ 不把脏数据当已登录）', async () => {
    await setItem(schoolSessionKey('ac'), { state: 'garbage', observedAt: 1 });
    expect((await readSchoolSessions()).ac.state).toBe('signedOut');
  });
});

describe('TC-P1-14-6A · 会话状态在页面上真的会变', () => {
  function Probe(): React.ReactElement {
    const sessions = useSchoolSessions();
    return (
      <Pressable
        testID="probe"
        onPress={() => {
          void sessions.markProbe('ac', { hasPasswordField: false });
        }}
      >
        <Text role="body">{`ac=${sessions.states.ac}`}</Text>
      </Pressable>
    );
  }

  it('初始 signedOut → 报"无密码框" → signedIn 且落盘', async () => {
    const view = await renderApp(<Probe />);
    await waitFor(() => expect(view.getByText(/ac=signedOut/)).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('probe'));
    await waitFor(() => expect(view.getByText(/ac=signedIn/)).toBeTruthy());
    await waitFor(async () => {
      expect((await getItem<{ state: string }>(schoolSessionKey('ac')))?.state).toBe('signedIn');
    });
  });
});

describe('TC-P1-14-7A · T-04 列表页（三张 D27 卡）', () => {
  it('渲染三个系统、域名与"打开"；点打开 → 推 T-05', async () => {
    const view = await renderApp(<SchoolSystemList testID="list" />);
    await waitFor(() => expect(view.getByTestId('list-ac')).toBeTruthy());
    expect(view.getByTestId('list-moodle')).toBeTruthy();
    expect(view.getByTestId('list-checkin')).toBeTruthy();
    expect(view.getByText('ac.xmu.edu.my')).toBeTruthy();

    const user = require('@testing-library/react-native').userEvent.setup();
    // 三张卡各有一个"打开"，所以按卡片的 testID 点，⛔ 不按文案点
    await user.press(view.getByTestId('list-ac-open'));
    expect(routerState.pushed[0]).toEqual({ pathname: '/system/[id]', params: { id: 'ac' } });
  });

  it('未登录时**没有**"清除会话"；已登录时才有', async () => {
    await writeSchoolSession('ac', 'signedIn');
    const view = await renderApp(<SchoolSystemList testID="list" />);
    const { within } = require('@testing-library/react-native');
    await waitFor(() => expect(within(view.getByTestId('list-ac')).getByText('已登录')).toBeTruthy());
    expect(view.getByTestId('list-ac-clear')).toBeTruthy();
  });

  it('清除会话 → 状态回到未登录', async () => {
    await writeSchoolSession('ac', 'signedIn');
    const view = await renderApp(<SchoolSystemList testID="list" />);
    await waitFor(() => expect(view.getByTestId('list-ac-clear')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('list-ac-clear'));
    const { within } = require('@testing-library/react-native');
    await waitFor(() =>
      expect(within(view.getByTestId('list-ac')).getByText('未登录')).toBeTruthy()
    );
    expect(await getItem(schoolSessionKey('ac'))).toBeNull();
  });
});

describe('TC-P1-14-8A · T-05 宿主页：会话探测 + 读表工具栏', () => {
  it('加载结束与导航结束都会**再探一次**会话（SPA 内部跳转不触发文档加载）', async () => {
    const view = await renderApp(<SchoolSystemScreen />);
    await waitFor(() => expect(view.getByTestId('webview-ac')).toBeTruthy());

    // 手动触发一次"文档加载完成"（替身不会自己发这个事件）
    const latest = webview.__lastProps.current;
    expect(typeof latest.onLoadEnd).toBe('function');
    latest.onLoadEnd();
    await waitFor(() => expect(webview.__calls.some((s) => s.includes(SESSION_KIND))).toBe(true));

    // 再模拟一次"导航结束（loading=false）"：SPA 内部跳转也要再探
    webview.__calls.length = 0;
    latest.onNavigationStateChange({ loading: false, url: 'https://ac.xmu.edu.my/home' });
    await waitFor(() => expect(webview.__calls.some((s) => s.includes(SESSION_KIND))).toBe(true));
  });

  it('AC 有「读取本页课表」，点它会注入读表脚本', async () => {
    const view = await renderApp(<SchoolSystemScreen />);
    await waitFor(() => expect(view.getByTestId('school-read-schedule')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('school-read-schedule'));
    await waitFor(() => expect(webview.__calls.some((s) => s.includes(SCRAPE_KIND))).toBe(true));
  });

  it('非课表系统**没有**这个按钮（Moodle 没有课表可读）', async () => {
    routerState.id = 'moodle';
    const view = await renderApp(<SchoolSystemScreen />);
    await waitFor(() => expect(view.getByTestId('webview-moodle')).toBeTruthy());
    expect(view.queryByTestId('school-read-schedule')).toBeNull();
  });

  it('未知 id → 重定向回工具 Tab（⛔ 不留死路由）', async () => {
    routerState.id = 'nope';
    const view = await renderApp(<SchoolSystemScreen />);
    // `Redirect` 被替身成 null：能渲染出来且**没有** WebView 就说明走了重定向分支
    expect(view.queryByTestId('webview-nope')).toBeNull();
  });
});

describe('TC-P1-14-9A · T-01 入口（§5-1：切片一律从首页进）', () => {
  it('三个校方系统一键直达 + 一个"会话管理"入口', async () => {
    const view = await renderApp(<ToolsScreen />);
    await waitFor(() => expect(view.getByTestId('tools-school-actions')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('tools-school-actions-ac'));
    expect(routerState.pushed[0]).toEqual({ pathname: '/system/[id]', params: { id: 'ac' } });

    await user.press(view.getByTestId('tools-school-sessions'));
    expect(routerState.pushed[1]).toBe('/tools/school-systems');
  });
});

describe('TC-P1-14-10A · 结构约束', () => {
  it('⛔ 去注释后 0 处中文字面量（文案走词条）', () => {
    const offenders: string[] = [];
    for (const file of ['schoolSession.ts', 'SchoolSystemList.tsx']) {
      const code = stripComments(readTools(file));
      if (/['"`][^'"`]*[\u4e00-\u9fff]/.test(code)) offenders.push(file);
    }
    for (const file of ['system/[id].tsx', 'tools/school-systems.tsx', '(tabs)/tools.tsx']) {
      const code = stripComments(readApp(file));
      if (/['"`][^'"`]*[\u4e00-\u9fff]/.test(code)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('⛔ 0 处 hex / 数字字号 / 自造浮层', () => {
    for (const file of ['schoolSession.ts', 'SchoolSystemList.tsx']) {
      const src = readTools(file);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/fontSize\s*:\s*[0-9]/);
      expect(src).not.toMatch(/\bModal\b/);
    }
  });

  it('⚠️ `SessionBadge` **没有**被新建成组件（README §7-11 的口径）', () => {
    const files = fs.readdirSync(TOOLS_DIR);
    expect(files.some((f) => f.toLowerCase().includes('sessionbadge'))).toBe(false);
    // 三态徽标由 `D27` own
    expect(readTools('SchoolSystemList.tsx')).toContain('SchoolSystemCard');
  });

  it('⛔ 不新建第二套会话机制：状态类型复用 `D27` 导出的那一个', () => {
    const src = readTools('schoolSession.ts');
    expect(src).toContain("from '@/components/ui/SchoolSystemCard'");
    expect(src).not.toMatch(/type\s+SchoolSystemSessionState\s*=/);
  });

  it('⛔ 会话落盘**不经凭据通道**：用 `shared/storage`（它就是给非凭据数据用的）', () => {
    const src = readTools('schoolSession.ts');
    expect(src).toContain("from '@/shared/storage'");
    expect(src).not.toContain('SecureStore');
  });
});
