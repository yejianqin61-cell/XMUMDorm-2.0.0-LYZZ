/** 在条款页接受后通知发布门控重新读取状态（返回表单时不能还停在旧的「未接受」上）。 */
const listeners = new Set<() => void>();

export function notifyTermsAccepted(): void {
  for (const listener of listeners) listener();
}

export function subscribeTermsAccepted(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
