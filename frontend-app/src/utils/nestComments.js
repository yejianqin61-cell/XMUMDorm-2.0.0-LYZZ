/** 将扁平评论列表嵌套为一级 + replies（与树洞详情一致） */
export function nestComments(flat) {
  const rows = Array.isArray(flat) ? flat : [];
  const top = rows.filter((r) => r.parent_id == null);
  const replies = rows.filter((r) => r.parent_id != null);
  return top.map((t) => ({
    ...t,
    replies: replies.filter((r) => r.parent_id === t.id),
  }));
}
