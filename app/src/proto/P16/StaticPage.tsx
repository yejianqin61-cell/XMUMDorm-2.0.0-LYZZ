/**
 * `P16` 静态说明骨架 —— StaticPage（组件定义 §2.7 · 原型层，**不是组件**）
 *
 * §2.7 对它的定义很短，但**故意很短**：
 * > **标题 + 富文本**；交互契约：**无交互（仅滚动与链接）**；9 页（`A-05` `A-07` `M-17`–`M-23`）
 *
 * 所以本骨架的三条纪律是：
 * 1. ⛔ **不引入任何交互控件**（没有输入框、没有按钮、没有表单）—— 用例用源码断言守住；
 * 2. **离线优先 + 回落本地**（宪法 10.6）：`remote → cache → bundled` 三级取内容，
 *    **有内容就渲染内容 + 一条 `T04(stale)` 说明来源**，⛔ **绝不**因为请求失败就把
 *    整屏换成错误页（那正是 10.6 要避免的）；
 * 3. ⚠️ **落点按 README §5-3**：`StaticPage` 没有正式组件 ID，按 §1.2
 *    「原型骨架豁免 9.14-③」落 `src/proto/P16`，收尾回写 §2.7（宪法 15.4-3）。
 *
 * ⛔ 文案全部由页面传词条；本文件不写一句界面文案。
 */

import * as React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { AppError } from '@/i18n/errors';
import { getItem, setItem, assertNotCredential } from '@/shared/storage';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { LoadingState } from '@/components/ui/LoadingState';
import { MarkdownReader, extractToc } from '@/components/ui/MarkdownReader';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

export const PROTO_ID = 'P16' as const;

/* ────────────────────────── 三级取内容（纯函数） ────────────────────────── */

export type StaticSource = 'remote' | 'cache' | 'bundled';

/**
 * `remote → cache → bundled` 的取值顺序（纯函数）。
 * ⚠️ **`cache` 优先于 `bundled`**：cached 是"上次真正拿到过的版本"，
 *    比随包发的内置副本新。反过来的话，服务端更新过的手册永远读不到新版。
 */
export function resolveStaticContent(input: {
  remote: string | null;
  cached: string | null;
  bundled: string | null;
}): { content: string | null; source: StaticSource | null } {
  if (isUsable(input.remote)) return { content: input.remote, source: 'remote' };
  if (isUsable(input.cached)) return { content: input.cached, source: 'cache' };
  if (isUsable(input.bundled)) return { content: input.bundled, source: 'bundled' };
  return { content: null, source: null };
}

function isUsable(value: string | null): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/** 四态判定（纯函数）：**有内容就是 content**，⛔ 请求失败不接管整屏 */
export function resolveStaticState(input: {
  loading: boolean;
  error: AppError | null;
  hasContent: boolean;
}): 'content' | 'loading' | 'error' | 'empty' {
  if (input.hasContent) return 'content';
  if (input.loading) return 'loading';
  if (input.error !== null) return 'error';
  return 'empty';
}

/** 非 `remote` 来源都要给用户一条"这不是最新的"提示（10.6 的可见化） */
export function shouldShowStaleNotice(source: StaticSource | null): boolean {
  return source === 'cache' || source === 'bundled';
}

/* ────────────────────────── 本地缓存（复用落盘层） ────────────────────────── */

export const STATIC_CACHE_PREFIX = 'static:';

export function staticCacheKey(docId: string): string {
  return `${STATIC_CACHE_PREFIX}${docId}`;
}

/**
 * 该文档 id 允许落盘吗。
 * ⚠️ 与 `K01` 的草稿同一条护栏（宪法 4.1.2-2）：落盘层会拒绝 key 里出现
 * `password`/`secret` 这类**整段**的 key → 这里预检，**不通过就不缓存**（⛔ 不崩）。
 */
export function canCacheStatic(docId: string): boolean {
  try {
    // 复用落盘层的护栏（`assertNotCredential` 会在命名空间后做**整段**匹配）
    assertNotCredential(staticCacheKey(docId));
    return true;
  } catch {
    return false;
  }
}

export async function readCachedStatic(docId: string): Promise<string | null> {
  if (!canCacheStatic(docId)) return null;
  return getItem<string>(staticCacheKey(docId));
}

export async function writeCachedStatic(docId: string, content: string): Promise<void> {
  if (!canCacheStatic(docId)) return;
  await setItem(staticCacheKey(docId), content);
}

/* ────────────────────────── 离线优先读取 hook ────────────────────────── */

export type StaticDocState = {
  content: string | null;
  source: StaticSource | null;
  loading: boolean;
  error: AppError | null;
};

export type UseStaticDocOptions = {
  docId: string;
  /** 随包发的内置副本（页面 import 进来；⛔ 骨架不知道它从哪来） */
  bundled: string | null;
  /** 远端取内容（失败请抛 `AppError`） */
  fetchRemote: () => Promise<string>;
  /** 关掉本地缓存（默认开） */
  enableCache?: boolean;
};

/**
 * 离线优先读取（顺序：**先给缓存 → 再打远端 → 失败就留在缓存/内置**）。
 * ⛔ 关键点：**远端失败不会把已有内容清掉** —— 状态里始终保留"当前能显示的内容"。
 */
export function useStaticDoc(options: UseStaticDocOptions): StaticDocState & { reload: () => void } {
  const { docId, bundled, fetchRemote, enableCache = true } = options;
  const [state, setState] = React.useState<StaticDocState>({
    content: null,
    source: null,
    loading: true,
    error: null,
  });
  const [nonce, setNonce] = React.useState(0);
  const fetchRef = React.useRef(fetchRemote);
  fetchRef.current = fetchRemote;

  React.useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    void (async () => {
      // ① 先把能立刻显示的东西显示出来（缓存 → 内置）
      const cached = enableCache ? await readCachedStatic(docId) : null;
      if (cancelled) return;
      const immediate = resolveStaticContent({ remote: null, cached, bundled });
      if (immediate.content !== null) {
        setState({ content: immediate.content, source: immediate.source, loading: true, error: null });
      }

      // ② 再打远端；成功就覆盖并落缓存
      try {
        const remote = await fetchRef.current();
        if (cancelled) return;
        const resolved = resolveStaticContent({ remote, cached, bundled });
        setState({ content: resolved.content, source: resolved.source, loading: false, error: null });
        if (enableCache && isUsable(remote)) await writeCachedStatic(docId, remote);
      } catch (error) {
        if (cancelled) return;
        // ③ 失败：**保留已有内容**（这就是"离线优先"的全部意义）
        const resolved = resolveStaticContent({ remote: null, cached, bundled });
        setState({
          content: resolved.content,
          source: resolved.source,
          loading: false,
          error: (error as AppError | undefined) ?? { kind: 'unknown' },
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [docId, bundled, enableCache, nonce]);

  const reload = React.useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

/* ────────────────────────── Props ────────────────────────── */

export type StaticPageLabels = {
  /** 返回（顶栏动作） */
  back?: string;
  /** `T04(stale)` 的文案：缓存来源 */
  staleCache: string;
  /** `T04(stale)` 的文案：内置来源 */
  staleBundled: string;
  /** 出错时的主行动（`T02` 的 fix 文案由词条层给，这里只给重试动作） */
  retry?: string;
  /** 空态（理论上不该出现，但四态要齐） */
  emptyTitle: string;
  emptyAction: string;
};

export type StaticPageProps = {
  title: string;
  state: StaticDocState;
  labels: StaticPageLabels;
  /** 点链接：由页面决定站内跳转 or 系统浏览器 */
  onLinkPress?: (url: string) => boolean;
  /** 重试（远端失败且**没有**任何内容可显示时才用得上） */
  onRetry?: () => void;
  /** 是否生成目录（`D18` own TOC） */
  showToc?: boolean;
  /** 顶栏右侧插槽（与 `P3` 同规：C-06 待定，骨架不预占） */
  topBar?: React.ReactNode;
  topMode?: 'topbar' | 'overlay' | 'none';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/* ────────────────────────── 组件 ────────────────────────── */

export function StaticPage({
  title,
  state,
  labels,
  onLinkPress,
  onRetry,
  showToc = false,
  topBar,
  topMode = 'topbar',
  style,
  testID,
}: StaticPageProps): React.ReactElement {
  const theme = useTheme();
  const screenState = resolveStaticState({
    loading: state.loading,
    error: state.error,
    hasContent: isUsable(state.content),
  });

  return (
    <Screen topMode={topMode} testID={testID} style={style}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.space('space_4'),
          paddingVertical: theme.space('space_2'),
        }}
      >
        {/* ⛔ 静态页**没有主行动**（§2.7：无交互，仅滚动与链接）——顶栏只放页面注入的插槽 */}
        <View style={{ flex: 1 }} />
        {topBar}
      </View>

      {/* 来源不是远端时，如实标出来（10.6：离线优先要**可见**） */}
      {screenState === 'content' && shouldShowStaleNotice(state.source) ? (
        <OfflineBanner
          testID={testID ? `${testID}-stale` : undefined}
          variant="stale"
          message={state.source === 'bundled' ? labels.staleBundled : labels.staleCache}
        />
      ) : null}

      {screenState === 'loading' ? (
        <LoadingState testID={testID ? `${testID}-loading` : undefined} />
      ) : screenState === 'error' ? (
        <ErrorState
          error={state.error ?? { kind: 'unknown' }}
          onAction={onRetry ?? (() => undefined)}
          testID={testID ? `${testID}-error` : undefined}
        />
      ) : screenState === 'empty' ? (
        /* 无内容且无错误：给一个动作（⛔ 不留死屏，⛔ 也不谎报成"错误"） */
        <EmptyState
          kind="broken"
          title={labels.emptyTitle}
          actionLabel={labels.emptyAction}
          onAction={onRetry ?? (() => undefined)}
          testID={testID ? `${testID}-empty` : undefined}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.space('space_4'), gap: theme.space('space_3') }}>
          <Text role="title" emphasis="strong" colorToken="text-primary">
            {title}
          </Text>
          {/* 富文本交给 `D18`（TOC 也由它 own） */}
          <MarkdownReader
            content={state.content ?? ''}
            toc={showToc && state.content ? extractToc(state.content) : undefined}
            onLinkPress={onLinkPress}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
