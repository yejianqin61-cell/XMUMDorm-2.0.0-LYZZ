/**
 * 发布合规门禁（A-05）—— 宪法 12.2 的 P0 红线。
 *
 * 原话要求：**"发布 UGC 前必须已接受 ToS/用户政策"（发帖前门禁，不是注册弹窗）**。
 * ⛔ 因此它**必须挂在每一个发布表单的提交链路上**，与入口形态无关：
 *    把发布上提到第 5 格**不改变**这条红线（宪法 4.9.8 / 骨架规范 §3.7）。
 *
 * 本文件是**纯逻辑**：每个发布表单在提交前调用 `canSubmit(viewer)`；
 * 被拦时 UI 必须展示「可感知 / 可理解 / 可改正」三要素（10.4），并把用户送去接受条款。
 */

import type { MessageKey } from '@/i18n';
import type { Viewer } from './registry';

export type ComplianceGateResult =
  | { allowed: true }
  | {
      allowed: false;
      perceiveKey: MessageKey;
      understandKey: MessageKey;
      fixKey: MessageKey;
    };

/** 提交前门禁。
 * ⚠️ `acceptedTerms` 只影响**能否提交**，不影响条目是否可见 —— 否则用户会"看不到功能却不知道为什么"。
 */
export function canSubmit(viewer: Viewer): ComplianceGateResult {
  if (viewer.acceptedTerms === true) {
    return { allowed: true };
  }
  return {
    allowed: false,
    perceiveKey: 'publish.gate.terms.perceive',
    understandKey: 'publish.gate.terms.understand',
    fixKey: 'publish.gate.terms.fix',
  };
}

/**
 * 接受条款的落地页（A-05 的**页面**在 Phase C 才建；本常量先占位，⛔ 不留裸字符串）。
 * ⚠️ 该路由在 Phase C 之前**不存在** —— 所以只有"后端明确返回未接受"时才可能走到它。
 */
export const TERMS_ROUTE = '/me/legal/terms';

/**
 * 宿主用的提交门控（P2A-04）—— 把"**真源在不在**"和"**用户接受没接受**"分开。
 *
 * 为什么需要这一层（缺口 G4，2026-10-06 实测）：后端**没有**接受状态的读写端点
 * （全仓 grep `accepted_terms|acceptedTerms` = 0 命中），而 `canSubmit` 是**fail-closed**
 * 的（既有用例 TC-P0-07-6A 要求"未接受条款必拦"）→ 若直接用它，
 * 源缺失期间**一切发布都发不出去**，主链路在内测期完全不可用。
 *
 * 所以口径是 **Q2-A【提案·需所有者签字】**：
 *   · 后端**明确**说 `false` → 拦住（这才是宪法 12.2 要拦的那件事）；
 *   · 后端**根本没有**这个真源（`undefined`）→ 放行，但打上 `bypassed` 标记，
 *     由页面/登记册如实记账（内测已知缺陷 + **上架阻塞项**）。
 *
 * ⛔ `canSubmit` 的语义一个字节都不改；⛔ 不许把这个 `undefined` 分支当成永久设计 ——
 *    后端补齐一天，它就必须自动不可达（`bypassed` 分支有对应用例）。
 */
export type SubmitGate =
  | { allowed: true; bypassed?: 'terms-source-missing' }
  | {
      allowed: false;
      perceiveKey: MessageKey;
      understandKey: MessageKey;
      fixKey: MessageKey;
    };

export function resolveSubmitGate(viewer: Viewer): SubmitGate {
  if (viewer.acceptedTerms === undefined) {
    return { allowed: true, bypassed: 'terms-source-missing' };
  }
  const result = canSubmit(viewer);
  if (result.allowed) {
    return { allowed: true };
  }
  return {
    allowed: false,
    perceiveKey: result.perceiveKey,
    understandKey: result.understandKey,
    fixKey: result.fixKey,
  };
}

/** 接受条款后要把这个标记落到哪（Phase 0 只声明真源，不实现存储） */
export const TERMS_ACCEPTED_MARKER = 'viewer.acceptedTerms';
