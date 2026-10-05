/**
 * 校方系统会话状态（P1-14 · `T-04` 的"平台 cookie 存储状态"）
 *
 * ## 状态从哪来（**不猜 URL**）
 * `D27 SchoolSystemCard` 要显示三态：`signedOut` / `signedIn` / `expired`。
 * 判断依据是**内嵌页自己报上来的**事实（`injectedScripts.buildSessionProbeScript`）：
 * **页面上有没有密码输入框** —— 有就是登录页，没有就是已经进到系统内部。
 * ⛔ 不去猜"登录 URL 长什么样"：三个系统的登录路径我们没有实测，猜就是凭记忆写规则
 *    （宪法 15.2-1），而且随时会被对方改掉。
 *
 * ## 三态怎么区分（**证据**，不是感觉）
 * | 上一次 | 这次看到 | 结果 | 为什么 |
 * |---|---|---|---|
 * | 任何 | 无密码框 | `signedIn` | 已经进到系统内部了 |
 * | `signedIn` | 有密码框 | **`expired`** | 之前进得去、现在被弹回登录页 → 会话丢了 |
 * | `signedOut` | 有密码框 | `signedOut` | 从没登录过，不谎报"过期" |
 * | `expired` | 有密码框 | `expired` | 保持 |
 *
 * ## 落盘的是什么（**不是凭据**）
 * 只存"这个系统上次观察到什么状态 + 时间"，⛔ 不存 cookie、不存账号密码。
 * 真正的会话在 WebView 的平台 cookie 存储里（R3：默认持久）。
 * ⚠️ 落盘 key 形如 `school-session:<id>`，会过落盘层的**凭据护栏**（整段匹配
 *    `token|jwt|password|secret|credential|authorization`）—— `session` 不在其中，可以落。
 */

import * as React from 'react';

import { getItem, removeItem, setItem } from '@/shared/storage';
import type { SchoolSystemSessionState } from '@/components/ui/SchoolSystemCard';
import { SCHOOL_SYSTEMS, type SchoolSystemId } from './schoolSystems';

/* ────────────────────────── 纯规则 ────────────────────────── */

export type SessionProbe = {
  /** 页面上是否存在密码输入框（由注入脚本读取，见 `injectedScripts.ts`） */
  hasPasswordField: boolean;
};

/**
 * 由一次探测推出新状态（纯函数）。
 * ⛔ 只有"**上次已是 `signedIn`** 却又看到登录页"才算 `expired` —— 否则会把
 *    "还没登录"谎报成"登录过期"，用户会以为自己被踢了。
 */
export function nextSchoolSessionState(
  prev: SchoolSystemSessionState,
  probe: SessionProbe
): SchoolSystemSessionState {
  if (!probe.hasPasswordField) return 'signedIn';
  return prev === 'signedIn' ? 'expired' : prev;
}

/** 清除会话后的状态（纯函数）：回到"未登录" */
export function sessionStateAfterClear(): SchoolSystemSessionState {
  return 'signedOut';
}

/* ────────────────────────── 落盘 ────────────────────────── */

export type SchoolSessionRecord = {
  state: SchoolSystemSessionState;
  /** 观察时间（毫秒）。页面可据此显示"最近确认于…" */
  observedAt: number;
};

export function schoolSessionKey(id: SchoolSystemId): string {
  return `school-session:${id}`;
}

export const SCHOOL_SESSION_IDS: readonly SchoolSystemId[] = SCHOOL_SYSTEMS.map(
  (system) => system.id
);

/** 读全部三个系统的状态（读不到 / 读坏了都按"未登录"，⛔ 不抛） */
export async function readSchoolSessions(): Promise<Record<SchoolSystemId, SchoolSessionRecord>> {
  const entries = await Promise.all(
    SCHOOL_SESSION_IDS.map(async (id) => {
      const record = await getItem<SchoolSessionRecord>(schoolSessionKey(id));
      const state =
        record?.state === 'signedIn' || record?.state === 'expired' ? record.state : 'signedOut';
      return [id, { state, observedAt: record?.observedAt ?? 0 }] as const;
    })
  );
  return Object.fromEntries(entries) as Record<SchoolSystemId, SchoolSessionRecord>;
}

export async function writeSchoolSession(
  id: SchoolSystemId,
  state: SchoolSystemSessionState,
  now: number = Date.now()
): Promise<void> {
  await setItem(schoolSessionKey(id), { state, observedAt: now } satisfies SchoolSessionRecord);
}

export async function clearSchoolSession(id: SchoolSystemId): Promise<void> {
  await removeItem(schoolSessionKey(id));
}

/* ────────────────────────── Hook ────────────────────────── */

export type UseSchoolSessionsValue = {
  /** 三个系统的当前状态（未知一律 `signedOut`） */
  states: Record<SchoolSystemId, SchoolSystemSessionState>;
  records: Record<SchoolSystemId, SchoolSessionRecord>;
  loading: boolean;
  /** 内嵌页报来一次探测 → 更新并落盘 */
  markProbe: (id: SchoolSystemId, probe: SessionProbe) => Promise<void>;
  /** 清除会话（`D27` 的"清除会话"按钮） */
  clear: (id: SchoolSystemId) => Promise<void>;
  /** 重新从落盘读（进页面时用） */
  refresh: () => Promise<void>;
};

export function useSchoolSessions(): UseSchoolSessionsValue {
  const [records, setRecords] = React.useState<Record<SchoolSystemId, SchoolSessionRecord>>(
    () =>
      Object.fromEntries(
        SCHOOL_SESSION_IDS.map((id) => [id, { state: 'signedOut' as const, observedAt: 0 }])
      ) as Record<SchoolSystemId, SchoolSessionRecord>
  );
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    const next = await readSchoolSessions();
    setRecords(next);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await readSchoolSessions();
      if (!cancelled) {
        setRecords(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 内嵌页报来一次探测 → 更新并落盘。
   * ⚠️ 顺序是**读盘 → 算 → 写盘 → 更新内存**：
   *    `setState` 的 updater **不能有副作用**（React 可能重复调用它），
   *    所以⛔ 不在 updater 里算"上一态"、也不在里面写盘。
   */
  const markProbe = React.useCallback(async (id: SchoolSystemId, probe: SessionProbe) => {
    const current = await getItem<SchoolSessionRecord>(schoolSessionKey(id));
    const nextState = nextSchoolSessionState(current?.state ?? 'signedOut', probe);
    await writeSchoolSession(id, nextState);
    setRecords((prev) => ({ ...prev, [id]: { state: nextState, observedAt: Date.now() } }));
  }, []);

  const clear = React.useCallback(
    async (id: SchoolSystemId) => {
      await clearSchoolSession(id);
      setRecords((prev) => ({
        ...prev,
        [id]: { state: sessionStateAfterClear(), observedAt: Date.now() },
      }));
    },
    []
  );

  const states = React.useMemo(
    () =>
      Object.fromEntries(
        SCHOOL_SESSION_IDS.map((id) => [id, records[id]?.state ?? 'signedOut'])
      ) as Record<SchoolSystemId, SchoolSystemSessionState>,
    [records]
  );

  return { states, records, loading, markProbe, clear, refresh };
}
