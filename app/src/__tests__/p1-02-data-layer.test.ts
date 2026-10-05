/**
 * P1-02 · 依赖准入与数据层 —— 自动化用例
 *
 * 测什么（接缝见 Phase1测试用例 §2）：
 *   S-3 数据适配：QueryClient 的默认值、与 shared 的 query key 契约、连通性接线
 *   S-4 纯规则：落盘层的命名空间 / JSON 往返 / 脏数据 / **凭据护栏**
 *   S-5 结构约束：每个 package.json 依赖都在准入登记里有记录（宪法 3.4 的机器化）
 */
import * as fs from 'fs';
import * as path from 'path';

import { onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

import { QK } from '../../../shared/query/queryKeys';
import {
  STORAGE_NAMESPACE,
  clearNamespace,
  getItem,
  namespacedKey,
  removeItem,
  setItem,
} from '@/shared/storage';
import {
  APP_QUERY_DEFAULTS,
  configureConnectivity,
  getQueryClient,
} from '@/shared/queryClient';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const APP_PKG = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'app/package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
const ADMISSION_DOC = fs.readFileSync(
  path.join(REPO_ROOT, 'docs/app/evaluation/App依赖准入登记.md'),
  'utf8'
);

const AsyncStorage = require('@react-native-async-storage/async-storage');

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('TC-P1-02-1A · 宪法 3.4：每个依赖都要在准入登记里有记录', () => {
  it('package.json 的 dependencies / devDependencies 全部出现在登记表里', () => {
    const declared = [
      ...Object.keys(APP_PKG.dependencies),
      ...Object.keys(APP_PKG.devDependencies),
    ];
    const missing = declared.filter((name) => !ADMISSION_DOC.includes(`\`${name}\``));
    expect(missing).toEqual([]);
  });

  it('登记表里出现了本次新增的 5 个包', () => {
    for (const name of [
      '@tanstack/react-query',
      '@shopify/flash-list',
      '@react-native-async-storage/async-storage',
      '@ronradtke/react-native-markdown-display',
      '@react-native-community/netinfo',
    ]) {
      expect(ADMISSION_DOC).toContain(`\`${name}\``);
    }
  });
});

describe('TC-P1-02-2A · 准入五项在这 5 个包上是齐的（版本 + 许可证 + 原生代码）', () => {
  /** 取出登记表里某一行的原文（表格行以 | 开头且含反引号包名） */
  const rowFor = (name: string): string => {
    const line = ADMISSION_DOC.split(/\r?\n/).find(
      (l) => l.startsWith('|') && l.includes(`\`${name}\``)
    );
    return line ?? '';
  };

  it.each([
    ['@tanstack/react-query', '5.96.2'],
    ['@shopify/flash-list', '2.0.2'],
    ['@react-native-async-storage/async-storage', '2.2.0'],
    ['@ronradtke/react-native-markdown-display', '9.0.3'],
    ['@react-native-community/netinfo', '12.0.1'],
  ])('%s 的行含版本与许可证', (name, version) => {
    const row = rowFor(name);
    expect(row).not.toBe('');
    expect(row).toContain(version);
    expect(row).toContain('MIT');
  });

  it('含原生代码的三项被标注为「有」，纯 JS 的两项标注为「无」', () => {
    expect(rowFor('@react-native-async-storage/async-storage')).toContain('有');
    expect(rowFor('@react-native-community/netinfo')).toContain('有');
    expect(rowFor('@shopify/flash-list')).toContain('无');
    expect(rowFor('@tanstack/react-query')).toContain('无');
    expect(rowFor('@ronradtke/react-native-markdown-display')).toContain('无');
  });
});

describe('TC-P1-02-3A · 落盘层：命名空间与 JSON 往返', () => {
  it('底层 key 带命名空间前缀', async () => {
    await setItem('draft:publish', { text: 'hi' });
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).toContain(namespacedKey('draft:publish'));
    expect(namespacedKey('draft:publish').startsWith(`${STORAGE_NAMESPACE}:`)).toBe(true);
  });

  it('对象往返（深等）', async () => {
    const value = { a: 1, b: [1, 2], c: { d: 'e' } };
    await setItem('cache:regions', value);
    expect(await getItem('cache:regions')).toEqual(value);
  });

  it('removeItem 之后读到 null', async () => {
    await setItem('k', 1);
    await removeItem('k');
    expect(await getItem('k')).toBeNull();
  });

  it('clearNamespace 只清自己的前缀', async () => {
    await AsyncStorage.setItem('someone-else', 'x');
    await setItem('a', 1);
    await clearNamespace();
    expect(await getItem('a')).toBeNull();
    expect(await AsyncStorage.getItem('someone-else')).toBe('x');
  });
});

describe('TC-P1-02-4A · 落盘层：脏数据不抛（渲染路径上抛异常会白屏）', () => {
  it('非 JSON 内容 → 返回 null 而不是抛', async () => {
    await AsyncStorage.setItem(namespacedKey('broken'), '{{{not json');
    await expect(getItem('broken')).resolves.toBeNull();
  });

  it('读不存在的 key → null', async () => {
    await expect(getItem('never-written')).resolves.toBeNull();
  });
});

describe('TC-P1-02-5A · ⛔ 凭据护栏（宪法 4.1.2-2：不得把凭据写入 AsyncStorage）', () => {
  it.each(['token', 'jwt', 'auth:token', 'refresh_token', 'user:password', 'api.credential'])(
    '拒绝写入 %s 并抛错',
    async (key) => {
      await expect(setItem(key, 'secret-value')).rejects.toThrow();
      expect(await AsyncStorage.getAllKeys()).toEqual([]);
    }
  );

  it('不误伤正常业务 key（含 token 字样的长词不算）', async () => {
    await expect(setItem('draft:publish', 'ok')).resolves.toBeUndefined();
    await expect(setItem('cache:tokenizer:size', 3)).resolves.toBeUndefined();
    await expect(setItem('cache:schedule:week', 3)).resolves.toBeUndefined();
  });
});

describe('TC-P1-02-6A · QueryClient：默认值与单实例', () => {
  it('默认值与登记一致', () => {
    expect(APP_QUERY_DEFAULTS.staleTime).toBe(60_000);
    expect(APP_QUERY_DEFAULTS.gcTime).toBe(15 * 60_000);
    expect(APP_QUERY_DEFAULTS.retry).toBe(1);
    // RN 没有 window focus：必须显式关掉，否则语义悬空
    expect(APP_QUERY_DEFAULTS.refetchOnWindowFocus).toBe(false);
    expect(APP_QUERY_DEFAULTS.refetchOnReconnect).toBe(true);
  });

  it('两次取的是同一个实例（全 App 单一 client）', () => {
    expect(getQueryClient()).toBe(getQueryClient());
  });

  it('client 的 defaultOptions 真的应用了上面的值', () => {
    const options = getQueryClient().getDefaultOptions().queries;
    expect(options?.staleTime).toBe(APP_QUERY_DEFAULTS.staleTime);
    expect(options?.retry).toBe(APP_QUERY_DEFAULTS.retry);
  });
});

describe('TC-P1-02-7A · query key 契约来自 shared（⛔ 不得本地重写一份）', () => {
  it('QK.scheduleWeek / QK.canteenRegions 的键形状与 shared 一致', () => {
    expect(QK.scheduleWeek(3)).toEqual(['schedule', 'week', 3]);
    expect(QK.canteenRegions()).toEqual(['canteen', 'regions']);
  });

  it('App 的 src 里 0 处重写 queryKeys（只允许从 shared 引入）', () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['__tests__', 'node_modules'].includes(entry.name)) continue;
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          const text = fs.readFileSync(full, 'utf8');
          if (/export\s+const\s+QK\b/.test(text)) {
            offenders.push(path.relative(REPO_ROOT, full));
          }
        }
      }
    };
    walk(path.join(REPO_ROOT, 'app/src'));
    expect(offenders).toEqual([]);
  });
});

describe('TC-P1-02-8A · 连通性接线（NetInfo → TanStack onlineManager）', () => {
  it('configureConnectivity 订阅了 NetInfo，并返回可解绑的函数', () => {
    const spy = jest.spyOn(NetInfo, 'addEventListener');
    const unsubscribe = configureConnectivity();
    expect(spy).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('订阅回调会把离线状态同步给 onlineManager', () => {
    // ⛔ 不读 NetInfo mock 的内部结构（那是别人的实现细节）：
    //    用 spy 把监听器接出来，自己驱动状态推进。
    const captured: { handler: ((state: unknown) => void) | null } = { handler: null };
    jest
      .spyOn(NetInfo, 'addEventListener')
      .mockImplementation(((handler: (state: unknown) => void) => {
        captured.handler = handler;
        return () => undefined;
      }) as unknown as typeof NetInfo.addEventListener);

    const unsubscribe = configureConnectivity();
    expect(typeof captured.handler).toBe('function');
    const handler = captured.handler as (state: {
      isConnected: boolean;
      isInternetReachable: boolean;
    }) => void;

    handler({ isConnected: false, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);

    handler({ isConnected: true, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);

    handler({ isConnected: true, isInternetReachable: true });
    expect(onlineManager.isOnline()).toBe(true);
    unsubscribe();
  });
});
