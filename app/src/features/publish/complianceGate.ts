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

/**
 * 提交前门禁。
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

/** 接受条款后要把这个标记落到哪（Phase 0 只声明真源，不实现存储） */
export const TERMS_ACCEPTED_MARKER = 'viewer.acceptedTerms';
