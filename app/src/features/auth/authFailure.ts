/**
 * 鉴权失败的口径（P1-13）—— **纯函数，可测**
 *
 * ## ⚠️ 上游文档写"401 口径"，但**后端实际用了两个状态码**
 * 读 [middleware/auth.js](../../../../middleware/auth.js) 可以确认：
 * | 情形 | HTTP | 响应体 |
 * |---|---|---|
 * | **没带令牌** | **401** | `{ status: -1, message: '未提供身份验证令牌，请先登录' }` |
 * | **令牌无效 / 已过期** | **403** | `{ status: -1, message: '身份验证令牌无效或已过期，请重新登录' }` |
 *
 * 而 **403 还被 `checkSanction` 用来表示"被封禁 / 被禁言"**，两者的区别**只在响应体的
 * `banned` / `muted` 标记上**。所以：
 * - 只处理 401 的话，**令牌过期永远不会触发重新登录**（用户会一直看到普通错误）；
 * - 把 403 一律当成"会话过期"的话，**被封禁的用户会被静默登出**——把处罚伪装成"登录过期"。
 *
 * 这正是 P1-13 先给 `shared/api/request.js` 的抛出错误补上 `err.body` 的原因。
 */

import type { AppError } from '@/i18n/errors';

export type AuthFailureKind =
  /** 没带令牌（后端 401） */
  | 'noToken'
  /** 令牌无效/过期（后端 403，且**没有**处罚标记） */
  | 'expiredToken'
  /** 账号被封禁 / 禁言（后端 403 + `banned`/`muted`）—— ⛔ **不是**会话失效 */
  | 'sanctioned'
  /** 登录时的凭据错误（登录接口的 401） */
  | 'badCredentials'
  /** 与鉴权无关的失败 */
  | 'other';

/** 失败发生在哪个阶段：**同一个 401 在登录与在普通请求里含义不同** */
export type AuthPhase = 'login' | 'request';

type ThrownLike = {
  status?: number;
  apiStatus?: number;
  body?: { banned?: unknown; muted?: unknown; message?: string } | null;
};

function asThrown(error: unknown): ThrownLike {
  if (error !== null && typeof error === 'object') return error as ThrownLike;
  return {};
}

export function classifyAuthFailure(error: unknown, phase: AuthPhase = 'request'): AuthFailureKind {
  const { status, body } = asThrown(error);
  if (typeof status !== 'number') return 'other';

  if (status === 401) {
    return phase === 'login' ? 'badCredentials' : 'noToken';
  }

  if (status === 403) {
    // ⚠️ **顺序要紧**：先看处罚标记，再当成"令牌过期"
    if (body?.banned === true || body?.muted === true) return 'sanctioned';
    return 'expiredToken';
  }

  return 'other';
}

/**
 * 是否属于"**这个会话不能用了**" → 调用方应当清令牌并把人送回登录。
 * ⛔ `sanctioned` **不在其中**：被封禁的账号令牌仍然有效（只是不能发内容），
 *    清掉它会让用户连"看自己被封的理由"都做不到。
 */
export function isSessionInvalid(kind: AuthFailureKind): boolean {
  return kind === 'noToken' || kind === 'expiredToken';
}

/**
 * 归到统一的错误模型（`i18n/errors.ts` 的三要素由它渲染）。
 * ⚠️ `badCredentials` 归为 `validation`：它是"这一项填错了"，不是权限问题 ——
 *    用 `permission` 的话文案会变成"切换账号"，而用户其实只需要重输密码。
 */
export function authFailureToAppError(
  kind: AuthFailureKind,
  options: { fieldLabel?: string } = {}
): AppError {
  switch (kind) {
    case 'noToken':
    case 'expiredToken':
      return { kind: 'permission', target: options.fieldLabel };
    case 'sanctioned':
      return { kind: 'permission', params: { role: 'sanctioned' } };
    case 'badCredentials':
      return { kind: 'validation', target: options.fieldLabel, params: { rule: 'match' } };
    case 'other':
    default:
      return { kind: 'unknown' };
  }
}
