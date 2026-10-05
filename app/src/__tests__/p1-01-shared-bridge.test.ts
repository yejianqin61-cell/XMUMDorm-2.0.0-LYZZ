/**
 * P1-01 · 平台接线：App 消费仓库根 `shared/` —— 自动化用例
 *
 * 测什么（**只在这两个接缝上**，见 Phase1测试用例 §2）：
 *   S-3 数据适配：注入后的 `request()` 行为（baseUrl / token）
 *   S-5 结构约束：`shared/` 内 0 处平台分支；`config.js` 的环境读取带可选链
 *
 * ⛔ 不测 `API_BASE_URL` 这个**模块级常量**：它是 import 时求值的，
 *   注入发生在其后也不会变 —— 那不是缺陷，而是"App 不该依赖它"的设计。
 *   真正要保证的是 `request()` 与 `getUploadUrl()` 走注入值（本文件断言这两条）。
 */
import * as fs from 'fs';
import * as path from 'path';

import { getRegions } from '../../../shared/api/canteen';
import { API_BASE_URL, getUploadUrl } from '../../../shared/api/config';
import { configureApi, resetApiConfiguration } from '../../../shared/api/platform';
import { getToken, request } from '../../../shared/api/request';
import { unwrapArray, setTokenGetter, configureAppApi } from '@/shared/api';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const SHARED_ROOT = path.join(REPO_ROOT, 'shared');

const CODE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '__tests__', '__mocks__']);

/** 递归收集 shared/ 下的源码文件（只读，用于源码扫描断言） */
function collectSharedFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectSharedFiles(full, out);
    } else if (entry.isFile() && CODE_EXT.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const readShared = (rel: string): string => fs.readFileSync(path.join(SHARED_ROOT, rel), 'utf8');

type FetchCall = { url: string; headers: Record<string, string> };

function installFetchMock(): FetchCall[] {
  const calls: FetchCall[] = [];
  (globalThis as unknown as { fetch: unknown }).fetch = (url: string, init: { headers?: Record<string, string> }) => {
    calls.push({ url, headers: init?.headers ?? {} });
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ status: 0, data: { ok: true } }),
    });
  };
  return calls;
}

afterEach(() => {
  resetApiConfiguration();
  setTokenGetter(null);
});

describe('TC-P1-01-1A / 2A · App 能加载仓库根 shared/（不抛）', () => {
  it('shared/api/canteen 导出可调用的 API', () => {
    expect(typeof getRegions).toBe('function');
  });

  it('shared/api/config 能加载，且 API_BASE_URL 是字符串', () => {
    // 关键：模块初始化**不得抛**（改前这里是 TypeError: import.meta.env is undefined）
    expect(typeof API_BASE_URL).toBe('string');
  });
});

describe('TC-P1-01-3A · 注入的 baseUrl 被 request() 真正使用', () => {
  it('configureApi 之后，请求打到注入的 origin', async () => {
    const calls = installFetchMock();
    configureApi({ baseUrl: 'https://example.test' });

    await request('/api/ping');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://example.test/api/ping');
  });

  it('未注入时回落历史行为（Web：同源相对路径）', async () => {
    const calls = installFetchMock();

    await request('/api/ping');

    expect(calls[0].url).toBe(`${API_BASE_URL}/api/ping`);
  });

  it('绝对 URL 不被拼接', async () => {
    const calls = installFetchMock();
    configureApi({ baseUrl: 'https://example.test' });

    await request('https://cdn.example.test/x.json');

    expect(calls[0].url).toBe('https://cdn.example.test/x.json');
  });
});

describe('TC-P1-01-9A · getUploadUrl 也走注入的 baseUrl（否则 App 图片是相对路径）', () => {
  it('注入后相对 uploads 路径变成绝对 URL', () => {
    configureApi({ baseUrl: 'https://example.test' });
    expect(getUploadUrl('/uploads/a.png')).toBe('https://example.test/uploads/a.png');
  });

  it('已是绝对 URL 的原样返回', () => {
    configureApi({ baseUrl: 'https://example.test' });
    expect(getUploadUrl('https://cdn.example.test/a.png')).toBe('https://cdn.example.test/a.png');
  });
});

describe('TC-P1-01-7A · 注入的 token 进入 Authorization 头', () => {
  it('注入了 token → 请求头带 Bearer', async () => {
    const calls = installFetchMock();
    configureApi({ baseUrl: 'https://example.test' });
    setTokenGetter(() => 'T');

    await request('/api/me');

    expect(calls[0].headers.Authorization).toBe('Bearer T');
  });

  it('注入的 getter 返回 null → 不带 Authorization（且不回落 localStorage）', async () => {
    const calls = installFetchMock();
    configureApi({ baseUrl: 'https://example.test' });
    setTokenGetter(() => null);

    await request('/api/me');

    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it('未注入任何 getter → getToken() 回落历史行为（RN 下为 null）', () => {
    expect(getToken()).toBeNull();
  });

  it('configureAppApi 会把 token 来源接上（App 侧唯一接入点）', async () => {
    const calls = installFetchMock();
    configureAppApi();
    setTokenGetter(() => 'APP_TOKEN');

    await request('/api/me');

    expect(calls[0].headers.Authorization).toBe('Bearer APP_TOKEN');
  });
});

describe('TC-P1-01-8A · unwrapArray 防住 exp 改变返回形状', () => {
  it('对象被包成 {__payload,__exp} 时取出数组', () => {
    expect(unwrapArray({ __payload: [1, 2], __exp: 5 })).toEqual([1, 2]);
  });

  it('本来就是数组时原样返回', () => {
    expect(unwrapArray([1])).toEqual([1]);
  });

  it('普通对象原样返回', () => {
    expect(unwrapArray({ a: 1 })).toEqual({ a: 1 });
  });

  it('null / undefined 不抛', () => {
    expect(unwrapArray(null)).toBeNull();
    expect(unwrapArray(undefined)).toBeUndefined();
  });
});

describe('TC-P1-01-4A · 源码扫描：config.js 的环境读取必须安全', () => {
  const config = readShared(path.join('api', 'config.js'));

  it('import.meta.env 的成员访问带可选链（RN 下 env 是 undefined）', () => {
    const memberReads = config.match(/import\.meta\.env[?.]*\./g) ?? [];
    expect(memberReads.length).toBeGreaterThan(0);
    for (const hit of memberReads) {
      expect(hit.startsWith('import.meta.env?.')).toBe(true);
    }
  });

  it('0 处裸 import.meta.env.VITE_*（不带可选链）', () => {
    expect(config).not.toMatch(/import\.meta\.env\.VITE_/);
  });
});

describe('TC-P1-01-6A · 源码扫描：shared/ 内 0 处平台分支', () => {
  it('不得出现 Platform.OS / isReactNative / 以 window 判断平台', () => {
    const offenders: string[] = [];
    for (const file of collectSharedFiles(SHARED_ROOT)) {
      const text = fs.readFileSync(file, 'utf8');
      // 只拦"用法"，注释里提到平台名不算
      const patterns: RegExp[] = [
        /\bPlatform\.(OS|select)\b/,
        /\bisReactNative\b/,
        /\btypeof\s+Platform\b/,
      ];
      for (const re of patterns) {
        if (re.test(text)) offenders.push(`${path.relative(SHARED_ROOT, file)} :: ${re}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
