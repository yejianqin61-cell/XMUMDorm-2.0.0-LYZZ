/**
 * 将扁平评论列表嵌套为一级 + replies（与树洞详情一致）。
 *
 * 阶段 3 起数据允许多级父子关系，但**视觉仍只有两层**：
 * 任意深度的后代都扁平挂到根评论的 `replies` 里，逐条保留 `parent_id`
 * 与 `reply_to_id` / `reply_to_excerpt`，由客户端用「回复 某人」表达对话关系。
 * Web 的 `root.replies` 结构保持不变。
 *
 * 排序：
 *   - `options.sort === 'latest'` → 一级评论最新优先
 *   - `options.sort === 'hot'`    → 一级评论按「点赞 + 回复」综合热度
 *   - 缺省保持传入顺序（后端按 created_at ASC 给出，兼容 Web 旧口径）
 *   - 二级回复**永远**按时间从早到晚，不参与热度重排
 *   - 楼主精选（featured）始终置顶，按精选时间先后排列
 */

function timeValue(value) {
  const parsed = typeof value === 'string' || value instanceof Date ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function byTimeAsc(a, b) {
  return timeValue(a.created_at) - timeValue(b.created_at) || Number(a.id) - Number(b.id);
}

function hotScore(node, replyCount) {
  const likes = Number(node.like_count) || 0;
  return likes * 2 + replyCount;
}

export function nestComments(flat, options = {}) {
  const rows = Array.isArray(flat) ? flat : [];
  const byId = new Map(rows.map((row) => [row.id, row]));

  const rootOf = (row) => {
    const seen = new Set();
    let current = row;
    while (current.parent_id != null) {
      if (seen.has(current.id)) return null;
      seen.add(current.id);
      const parent = byId.get(current.parent_id);
      if (!parent) return null;
      current = parent;
    }
    return current;
  };

  const roots = [];
  const repliesByRoot = new Map();
  for (const row of rows) {
    if (row.parent_id == null) {
      roots.push(row);
      continue;
    }
    const root = rootOf(row);
    if (!root) continue;
    const bucket = repliesByRoot.get(root.id);
    if (bucket) bucket.push(row);
    else repliesByRoot.set(root.id, [row]);
  }

  const featured = (node) => node.featured === true && node.featured_at != null;
  const pinned = roots.filter(featured).sort((a, b) => timeValue(a.featured_at) - timeValue(b.featured_at));
  const rest = roots.filter((node) => !featured(node));

  if (options.sort === 'latest') {
    rest.sort((a, b) => timeValue(b.created_at) - timeValue(a.created_at) || Number(b.id) - Number(a.id));
  } else if (options.sort === 'hot') {
    rest.sort((a, b) => {
      const replyA = (repliesByRoot.get(a.id) || []).length;
      const replyB = (repliesByRoot.get(b.id) || []).length;
      return hotScore(b, replyB) - hotScore(a, replyA) || byTimeAsc(a, b);
    });
  }

  return [...pinned, ...rest].map((root) => ({
    ...root,
    replies: (repliesByRoot.get(root.id) || [])
      .slice()
      .sort(byTimeAsc)
      // root_id 让客户端把任意深度的后代归到同一条一级评论下（不增加视觉层级）
      .map((reply) => ({ ...reply, root_id: root.id })),
  }));
}
