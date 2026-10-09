/**
 * 错误模型与文案渲染器（宪法 10.4 的落地）
 *
 * **每条错误必须同时给出三件事**：
 *   - **可感知**：指明具体对象（哪个字段 / 哪条内容 / 哪个操作）
 *   - **可理解**：说明真实原因，可归因，不甩锅给"系统"
 *   - **可改正**：给一个可执行动作，**动词开头**
 *
 * ⛔ 禁止：HTTP 状态码 / 堆栈 / SQL / 内部错误码原文；⛔ 也不得用"未知错误"掩盖已知原因。
 * ⛔ 禁止笼统措辞：「出错了」「操作失败」「网络错误」「请稍后重试」「系统繁忙」。
 * ⛔ **网络类必须分三种**：无网络 / 服务不可达 / 超时 —— 因为用户能做的事不同。
 */

import type { MessageKey } from './zh';

/** 错误种类（网络三类 + 业务四类 + 兜底一类） */
export type AppErrorKind =
  | 'offline'
  | 'unreachable'
  | 'timeout'
  | 'validation'
  | 'permission'
  | 'terms'
  | 'content'
  | 'conflict'
  | 'unknown';

/** 业务侧抛出的结构化错误（⛔ 不携带技术细节到 UI） */
export type AppError = {
  kind: AppErrorKind;
  /** 出问题的具体对象（字段名 / 动作名 / 内容位置）—— 10.4「可感知」 */
  target?: string;
  /** 可公示的原因参数（如规则、秒数、角色） */
  params?: Record<string, string | number>;
};

export type ErrorCopy = {
  kind: AppErrorKind;
  /**
   * 10.4「可感知」的**具体对象**（有则必须显示）。
   *
   * ⚠️ **为什么不是把 target 拼进 `perceive` 模板里**：`zh`/`en` 两个词条表的句式不同，
   *    用代码拼字符串会把语序写死在代码里；而**单独一行**在两种语言里都自然。
   *    更关键的是：P1-07 发现原来的三段词条**完全没有引用 `target`**，
   *    于是「网络没连上」这种不含对象的文案就通过了检查 —— 这正是 10.4 要防的。
   *    → 所以由这里给出，由 `T02` / `K04` 负责显示（**同一个真源**）。
   */
  objectLabel?: string;
  perceive: string;
  understand: string;
  fix: string;
  /** 主行动的类型（⛔ 一个错误只给一个主行动） */
  actionKind: 'retry' | 'edit' | 'refresh' | 'reopen' | 'switchAccount';
};

export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

const COPY_KEY: Record<AppErrorKind, { perceive: MessageKey; understand: MessageKey; fix: MessageKey }> = {
  offline: {
    perceive: 'error.net.offline.perceive',
    understand: 'error.net.offline.understand',
    fix: 'error.net.offline.fix',
  },
  unreachable: {
    perceive: 'error.net.unreachable.perceive',
    understand: 'error.net.unreachable.understand',
    fix: 'error.net.unreachable.fix',
  },
  timeout: {
    perceive: 'error.net.timeout.perceive',
    understand: 'error.net.timeout.understand',
    fix: 'error.net.timeout.fix',
  },
  validation: {
    perceive: 'error.validation.perceive',
    understand: 'error.validation.understand',
    fix: 'error.validation.fix',
  },
  permission: {
    perceive: 'error.permission.perceive',
    understand: 'error.permission.understand',
    fix: 'error.permission.fix',
  },
  terms: {
    perceive: 'error.terms.perceive',
    understand: 'error.terms.understand',
    fix: 'error.terms.fix',
  },
  content: {
    perceive: 'error.content.perceive',
    understand: 'error.content.understand',
    fix: 'error.content.fix',
  },
  conflict: {
    perceive: 'error.conflict.perceive',
    understand: 'error.conflict.understand',
    fix: 'error.conflict.fix',
  },
  unknown: {
    perceive: 'error.unknown.perceive',
    understand: 'error.unknown.understand',
    fix: 'error.unknown.fix',
  },
};

const ACTION_KIND: Record<AppErrorKind, ErrorCopy['actionKind']> = {
  offline: 'retry',
  unreachable: 'retry',
  timeout: 'retry',
  validation: 'edit',
  permission: 'switchAccount',
  terms: 'reopen',
  content: 'edit',
  conflict: 'refresh',
  unknown: 'reopen',
};

/** 默认原因参数：缺参数时不出现 `{xxx}` 空洞（那本身就是"不可理解"） */
const DEFAULTS: Record<string, string | number> = {
  seconds: 10,
  field: '',
  rule: '',
  action: '',
  role: '',
  position: 1,
};

/**
 * 把结构化错误渲染成三段用户文案。
 * ⛔ 若 `perceive`/`understand`/`fix` 任一为空，调用方可直接视为"未完成"（宪法 13.1）。
 */
export function toErrorCopy(error: AppError, t: Translate): ErrorCopy {
  const keys = COPY_KEY[error.kind] ?? COPY_KEY.unknown;
  const merged: Record<string, string | number> = { ...DEFAULTS, ...(error.params ?? {}) };
  if (error.target !== undefined) {
    merged.field = merged.field || error.target;
    merged.action = merged.action || error.target;
  }
  const target = error.target?.trim();
  return {
    kind: error.kind,
    // 10.4「可感知」：有具体对象就必须显示出来（原实现的三段词条都不引用 target）
    ...(target ? { objectLabel: target } : null),
    perceive: t(keys.perceive, merged),
    understand: t(keys.understand, merged),
    fix: t(keys.fix, merged),
    actionKind: ACTION_KIND[error.kind] ?? ACTION_KIND.unknown,
  };
}

/** 从网络失败分类出三种之一（⛔ 不允许退化成笼统的"网络错误"） */
export function classifyNetworkFailure(input: {
  reachable?: boolean;
  timedOut?: boolean;
}): AppErrorKind {
  if (input.reachable === false) return 'offline';
  if (input.timedOut === true) return 'timeout';
  return 'unreachable';
}
