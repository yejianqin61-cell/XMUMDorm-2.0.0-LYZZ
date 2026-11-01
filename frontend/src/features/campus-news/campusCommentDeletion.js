// UI validation only. The server must independently recheck the current role.
export function deletionReason(comment, user, rawReason) {
  if (String(comment.user_id) === String(user?.id)) return null;
  const reason = String(rawReason ?? '').trim();
  if (!reason || [...reason].length > 500) throw new Error('请输入1–500字管理员删除原因');
  return reason;
}
