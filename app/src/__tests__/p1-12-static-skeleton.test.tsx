/**
 * P1-12 · 骨架 `P16` 静态说明（`src/proto/P16`）—— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：`remote → cache → bundled` 取值顺序、四态判定、何时该提示"不是最新"
 *   S-3 离线优先：**先给缓存 → 再打远端 → 失败留在缓存/内置**（⛔ 不清空已有内容）
 *   S-1 组件契约：标题 + 富文本 + 链接；⛔ **无任何交互控件**（§2.7 明确）
 *   S-5 结构约束：原型落点、复用落盘层与 `D18`
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { getItem, removeItem } from '@/shared/storage';
import { Text } from '@/components/ui/Text';

import {
  PROTO_ID,
  StaticPage,
  canCacheStatic,
  readCachedStatic,
  resolveStaticContent,
  resolveStaticState,
  shouldShowStaleNotice,
  staticCacheKey,
  useStaticDoc,
  writeCachedStatic,
  type StaticDocState,
  type StaticPageLabels,
} from '@/proto/P16';

const SRC_ROOT = path.resolve(__dirname, '..');
const PROTO_FILE = path.join(SRC_ROOT, 'proto', 'P16', 'StaticPage.tsx');
const readProto = (): string => fs.readFileSync(PROTO_FILE, 'utf8');

const LABELS: StaticPageLabels = {
  staleCache: '显示的是上次同步的内容',
  staleBundled: '显示的是随应用内置的版本',
  retry: '重试',
  emptyTitle: '内容还没准备好',
  emptyAction: '重试',
};

const state = (over: Partial<StaticDocState> = {}): StaticDocState => ({
  content: '# 标题\n正文',
  source: 'remote',
  loading: false,
  error: null,
  ...over,
});

describe('TC-P1-12-1A · 落点与口径（原型骨架）', () => {
  it('文件在 `src/proto/P16`，PROTO_ID 与 §5-3 一致', () => {
    expect(fs.existsSync(PROTO_FILE)).toBe(true);
    expect(fs.existsSync(path.join(SRC_ROOT, 'proto', 'P16', 'index.ts'))).toBe(true);
    expect(PROTO_ID).toBe('P16');
  });

  it('全部通过引用 `components/ui/**` 构成（⛔ 原型层不新增 UI 组件）', () => {
    const src = readProto();
    expect(src).toContain('@/components/ui/');
    expect(stripComments(src)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(stripComments(src)).not.toMatch(/fontSize\s*:\s*[0-9]/);
  });
});

describe('TC-P1-12-2A · 三级取内容（纯函数）', () => {
  it('优先级：remote > cache > bundled', () => {
    expect(
      resolveStaticContent({ remote: 'R', cached: 'C', bundled: 'B' })
    ).toEqual({ content: 'R', source: 'remote' });
    expect(resolveStaticContent({ remote: null, cached: 'C', bundled: 'B' })).toEqual({
      content: 'C',
      source: 'cache',
    });
    expect(resolveStaticContent({ remote: null, cached: null, bundled: 'B' })).toEqual({
      content: 'B',
      source: 'bundled',
    });
    expect(resolveStaticContent({ remote: null, cached: null, bundled: null })).toEqual({
      content: null,
      source: null,
    });
  });

  it('⚠️ **`cache` 优先于 `bundled`**：缓存是"上次真正拿到过的版本"，比随包副本新', () => {
    const result = resolveStaticContent({ remote: null, cached: '新版', bundled: '旧版' });
    expect(result.source).toBe('cache');
    expect(result.content).toBe('新版');
  });

  it('空串 / 空白不算内容（否则会渲染出一张白屏）', () => {
    expect(resolveStaticContent({ remote: '   ', cached: '', bundled: 'B' }).source).toBe('bundled');
    expect(resolveStaticContent({ remote: '', cached: '  ', bundled: '' }).content).toBeNull();
  });
});

describe('TC-P1-12-3A · 四态与"不是最新"提示（纯函数）', () => {
  it('四态：有内容优先，其次 loading，再次 error，最后 empty', () => {
    expect(resolveStaticState({ loading: false, error: null, hasContent: true })).toBe('content');
    expect(resolveStaticState({ loading: true, error: null, hasContent: false })).toBe('loading');
    expect(
      resolveStaticState({ loading: false, error: { kind: 'offline' }, hasContent: false })
    ).toBe('error');
    expect(resolveStaticState({ loading: false, error: null, hasContent: false })).toBe('empty');
  });

  it('⛔ **有缓存时渲染 stale 而不是错误屏**（宪法 10.6 / 验收索引）', () => {
    expect(
      resolveStaticState({ loading: false, error: { kind: 'offline' }, hasContent: true })
    ).toBe('content');
  });

  it('只有 cache / bundled 才提示"不是最新"', () => {
    expect(shouldShowStaleNotice('remote')).toBe(false);
    expect(shouldShowStaleNotice('cache')).toBe(true);
    expect(shouldShowStaleNotice('bundled')).toBe(true);
    expect(shouldShowStaleNotice(null)).toBe(false);
  });
});

describe('TC-P1-12-4A · 本地缓存：复用落盘层 + 凭据护栏', () => {
  it('缓存 key 带前缀；普通文档 id 可缓存', () => {
    expect(staticCacheKey('handbook')).toBe('static:handbook');
    expect(canCacheStatic('handbook')).toBe(true);
  });

  it('⛔ 文档 id 形如 `…-password…` 时**不缓存也不崩**（落盘层的凭据护栏）', async () => {
    expect(canCacheStatic('reset-password')).toBe(false);
    await expect(readCachedStatic('reset-password')).resolves.toBeNull();
    // 写入应当是 no-op（不抛）
    await expect(writeCachedStatic('reset-password', 'secret-content')).resolves.toBeUndefined();
  });

  it('写进去能读回来（真落盘，不是内存假象）', async () => {
    await writeCachedStatic('p1-12-probe', '# 缓存内容');
    await expect(readCachedStatic('p1-12-probe')).resolves.toBe('# 缓存内容');
    expect(await getItem(staticCacheKey('p1-12-probe'))).toBe('# 缓存内容');
    await removeItem(staticCacheKey('p1-12-probe'));
  });
});

describe('TC-P1-12-5A · 离线优先读取链（hook）', () => {
  function Probe({ docId, bundled, fetchRemote }: {
    docId: string;
    bundled: string | null;
    fetchRemote: () => Promise<string>;
  }): React.ReactElement {
    const doc = useStaticDoc({ docId, bundled, fetchRemote });
    return (
      <Text role="body">{`source=${doc.source} loading=${doc.loading} error=${doc.error?.kind ?? 'none'} content=${String(doc.content)}`}</Text>
    );
  }

  it('远端成功 → source=remote 且落缓存', async () => {
    const docId = 'p1-12-fresh';
    await removeItem(staticCacheKey(docId));
    const view = await renderApp(
      <Probe docId={docId} bundled="内置版" fetchRemote={async () => '远端新版'} />
    );
    await waitFor(() => expect(view.getByText(/source=remote/)).toBeTruthy());
    expect(view.getByText(/content=远端新版/)).toBeTruthy();
    // 落盘（下次离线就有东西可读）
    await waitFor(async () => {
      expect(await readCachedStatic(docId)).toBe('远端新版');
    });
    await removeItem(staticCacheKey(docId));
  });

  it('⛔ 远端失败但**有缓存** → 仍显示缓存内容（不清空、不换错误屏）', async () => {
    const docId = 'p1-12-cached';
    await writeCachedStatic(docId, '缓存版内容');
    const view = await renderApp(
      <Probe
        docId={docId}
        bundled="内置版"
        fetchRemote={async () => {
          throw { kind: 'offline' as const };
        }}
      />
    );
    await waitFor(() => expect(view.getByText(/loading=false/)).toBeTruthy());
    expect(view.getByText(/content=缓存版内容/)).toBeTruthy();
    expect(view.getByText(/source=cache/)).toBeTruthy();
    // 错误确实被记下来了（页面据此显示 stale 提示），但**内容还在**
    expect(view.getByText(/error=offline/)).toBeTruthy();
    await removeItem(staticCacheKey(docId));
  });

  it('远端失败且无缓存 → 回落到**内置副本**', async () => {
    const docId = 'p1-12-bundled';
    await removeItem(staticCacheKey(docId));
    const view = await renderApp(
      <Probe
        docId={docId}
        bundled="内置版内容"
        fetchRemote={async () => {
          throw { kind: 'unreachable' as const };
        }}
      />
    );
    await waitFor(() => expect(view.getByText(/loading=false/)).toBeTruthy());
    expect(view.getByText(/source=bundled/)).toBeTruthy();
    expect(view.getByText(/content=内置版内容/)).toBeTruthy();
  });

  it('远端失败且无缓存无内置 → 才允许进入错误态', async () => {
    const docId = 'p1-12-nothing';
    await removeItem(staticCacheKey(docId));
    const view = await renderApp(
      <Probe
        docId={docId}
        bundled={null}
        fetchRemote={async () => {
          throw { kind: 'timeout' as const };
        }}
      />
    );
    await waitFor(() => expect(view.getByText(/source=null/)).toBeTruthy());
    expect(view.getByText(/error=timeout/)).toBeTruthy();
  });
});

describe('TC-P1-12-6A · 渲染：标题 + 富文本 + 来源提示', () => {
  it('remote：标题与正文渲染，**没有** stale 提示', async () => {
    const view = await renderApp(
      <StaticPage title="用户协议" state={state()} labels={LABELS} testID="sp" />
    );
    expect(view.getByText('用户协议')).toBeTruthy();
    expect(view.queryByTestId('sp-stale')).toBeNull();
  });

  it('cache：内容照样渲染，并给出 stale 提示', async () => {
    const view = await renderApp(
      <StaticPage title="用户协议" state={state({ source: 'cache' })} labels={LABELS} testID="sp" />
    );
    expect(view.getByTestId('sp-stale')).toBeTruthy();
    expect(view.getByText('显示的是上次同步的内容')).toBeTruthy();
  });

  it('bundled：提示文案与 cache **不同**（来源要说清楚）', async () => {
    const view = await renderApp(
      <StaticPage title="用户协议" state={state({ source: 'bundled' })} labels={LABELS} testID="sp" />
    );
    expect(view.getByText('显示的是随应用内置的版本')).toBeTruthy();
  });

  it('**有内容 + 有错误** → 仍然是内容页 + stale 提示（⛔ 不是错误屏）', async () => {
    const view = await renderApp(
      <StaticPage
        title="新生指南"
        state={state({ source: 'cache', error: { kind: 'offline' } })}
        labels={LABELS}
        testID="sp"
      />
    );
    expect(view.queryByTestId('sp-error')).toBeNull();
    expect(view.getByTestId('sp-stale')).toBeTruthy();
  });

  it('loading（且无内容）→ `T03`；error（且无内容）→ `T02` 可重试；empty → `T01` 有动作', async () => {
    const loading = await renderApp(
      <StaticPage
        title="t"
        state={{ content: null, source: null, loading: true, error: null }}
        labels={LABELS}
        testID="sp"
      />
    );
    expect(loading.getByTestId('sp-loading')).toBeTruthy();
  });

  it('无内容 + 有错误 → `T02`，主行动可点', async () => {
    const onRetry = jest.fn();
    const view = await renderApp(
      <StaticPage
        title="t"
        state={{ content: null, source: null, loading: false, error: { kind: 'offline' } }}
        labels={LABELS}
        onRetry={onRetry}
        testID="sp"
      />
    );
    expect(view.getByTestId('sp-error')).toBeTruthy();
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByText('打开网络后重试'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('无内容且无错误 → `T01`（⛔ 不谎报成错误）', async () => {
    const view = await renderApp(
      <StaticPage
        title="t"
        state={{ content: null, source: null, loading: false, error: null }}
        labels={LABELS}
        testID="sp"
      />
    );
    expect(view.getByTestId('sp-empty')).toBeTruthy();
    expect(view.getByText('内容还没准备好')).toBeTruthy();
  });

  it('目录按需生成（`D18` own TOC）', async () => {
    const withToc = await renderApp(
      <StaticPage
        title="协议"
        state={state({ content: '# 第一章\n内容\n## 第一节\n内容' })}
        labels={LABELS}
        showToc
        testID="sp"
      />
    );
    expect(withToc.getByTestId('sp')).toBeTruthy();
  });
});

describe('TC-P1-12-7A · §2.7 的"无交互"是硬约束', () => {
  it('⛔ 源码里没有任何交互控件（输入框 / 按钮 / 控件层组件）', () => {
    const src = readProto();
    for (const forbidden of [
      'TextInput',
      '@/components/ui/Button',
      '@/components/ui/Input',
      '@/components/ui/TextArea',
      '@/components/ui/Checkbox',
      '@/components/ui/Switch',
      '@/components/ui/Pressable',
      'AlertDialog',
    ]) {
      expect(src).not.toContain(forbidden);
    }
  });

  it('⛔ 也不自建分页/弹层（静态页只有滚动与链接）', () => {
    const code = stripComments(readProto());
    expect(code).not.toMatch(/\bModal\b/);
    expect(code).not.toContain('useReducer');
    expect(code).not.toContain('FlashList');
  });

  it('⛔ 去注释后 0 处中文字面量（文案全部由页面传词条）', () => {
    const code = stripComments(readProto());
    expect(/['"`][^'"`]*[\u4e00-\u9fff]/.test(code)).toBe(false);
  });

  it('链接交给页面（骨架不决定站内/站外）', () => {
    const code = stripComments(readProto());
    expect(code).toContain('onLinkPress');
    expect(code).toContain('MarkdownReader');
  });

  it('安全区用 `Screen`（⛔ 不自算 paddingTop）', () => {
    const code = stripComments(readProto());
    expect(code).toContain("from '@/components/ui/Screen'");
    expect(code).not.toMatch(/useSafeAreaInsets\s*\(/);
    expect(code).not.toMatch(/paddingTop\s*:/);
  });
});
