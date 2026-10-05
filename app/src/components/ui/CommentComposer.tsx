/**
 * CommentComposer（D03）—— 评论输入条（组件定义 §2.6）
 *
 * 它**不是** `O08 InputSheet` 的复制品，而是"O08 + 评论域的匿名规则"：
 *
 * ⛔ **匿名域不得回显被回复者身份**（§2.6 `D04` 的同一条铁律，宪法 4.1.1）。
 *   万能墙/课评是匿名域：回复某人时**不能**显示"正在回复 @张三" ——那等于把匿名破掉了。
 *   所以这里把回复上下文分成两态：
 *   - `replyContext: { kind: 'named'; label: string }` → 显示"正在回复 X"并可取消
 *   - `replyContext: { kind: 'anonymous' }` → **只显示"正在回复某条评论"这类不含身份的文案**，
 *     由页面传 `anonymousReplyLabel`（本组件不写死文案）
 *
 * ⛔ 上限**由页面注入**（万能墙与指南的评论上限不同，§3.2.2-③：限额不写在控件里）。
 */

import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { InputSheet } from './InputSheet';

/** 回复上下文：**两种域两种类型**（匿名域拿不到身份字段） */
export type CommentReplyContext =
  | { kind: 'named'; label: string; cancelLabel: string; onCancel: () => void }
  | { kind: 'anonymous'; anonymousLabel: string; cancelLabel: string; onCancel: () => void };

export type CommentComposerProps = {
  value: string;
  onChangeText?: (next: string) => void;
  /** 上限（**页面注入**） */
  maxLength?: number;
  placeholder?: string;
  sendLabel: string;
  onSend: () => void;
  sending?: boolean;
  disabled?: boolean;
  replyContext?: CommentReplyContext;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function CommentComposer({
  value,
  onChangeText,
  maxLength,
  placeholder,
  sendLabel,
  onSend,
  sending = false,
  disabled = false,
  replyContext,
  style,
  testID,
}: CommentComposerProps): React.ReactElement {
  // 匿名域：只把**不含身份**的文案交给底框；命名域才给"正在回复 X"
  const replyingTo =
    replyContext === undefined
      ? undefined
      : replyContext.kind === 'named'
        ? replyContext.label
        : replyContext.anonymousLabel;

  return (
    <InputSheet
      testID={testID}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      sendLabel={sendLabel}
      onSend={onSend}
      // 有上限就显示计数器（评论超限要能看见，10.5 的双通道在 InputSheet 里）
      maxLength={maxLength}
      counter={maxLength !== undefined}
      sending={sending}
      disabled={disabled}
      replyingTo={replyingTo}
      replyCancelLabel={replyContext?.cancelLabel}
      onCancelReply={replyContext?.onCancel}
      style={style}
    />
  );
}
