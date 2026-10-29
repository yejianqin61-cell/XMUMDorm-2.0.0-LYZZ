/**
 * 通知目标摘要解析器注册表（阶段3-02）
 *
 * ## 为什么要有这一层
 * 通知的 `target.type` 跨越树洞 / 万能墙 / 社团 / 攻略 / 课程测评 / 二手 多个域。
 * **帖子类**在通知列表的 SQL 里已经 JOIN 到了正文（`posts.content`），可以零成本取摘要；
 * 其余域各自有自己的表与权限口径，⛔ 不能由通用通知模块擅自拼别人的 SQL。
 *
 * 所以：
 *   · 甲提供**注册表接口**（本文件）与帖子类解析器；
 *   · 丙（树洞/万能墙之外的来源）、戊（社团/攻略/课评）、丁（二手）按交接说明各交一条；
 *   · **未注册的类型返回 null** —— App 用「类型 + 标题」兜底，⛔ 不抛错、不猜表名。
 *
 * ## 接口（交接给丙丁戊）
 * ```js
 * // 行内解析：数据已经在通知列表的 row 里（如 posts JOIN 出来的正文）
 * registerRowExcerptResolver('handbook_article', row => truncate(row.handbook_content));
 *
 * // ⚠️ 批量解析（需要额外查表时）走 `registerBatchExcerptResolver`：
 * //    输入是本次列表里该类型的 id 数组，输出 Map<id, excerpt|null>；
 * //    ⛔ 允许一次批量查，禁止一行一查。
 * ```
 * 摘要一律由本注册表负责**截断**（`SOURCE_EXCERPT_MAX`），App 只按可见行数再截一次。
 */

/** 服务端摘要长度上限（字符）。⛔ 客户端不得依赖更长 */
const SOURCE_EXCERPT_MAX = 140;

function truncate(value) {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  if (text === '') return null;
  return text.length > SOURCE_EXCERPT_MAX ? `${text.slice(0, SOURCE_EXCERPT_MAX)}…` : text;
}

/** 行内解析器：`row` 是通知列表 SQL 的原始行，返回摘要或 null */
const rowResolvers = new Map();
/** 批量解析器：`(ids) => Promise<Map<number, string|null>>`，给需要额外查表的域 */
const batchResolvers = new Map();

function registerRowExcerptResolver(targetType, resolver) {
  if (typeof targetType !== 'string' || targetType === '' || typeof resolver !== 'function') {
    throw new Error('registerRowExcerptResolver 参数无效');
  }
  rowResolvers.set(targetType, resolver);
}

function registerBatchExcerptResolver(targetType, resolver) {
  if (typeof targetType !== 'string' || targetType === '' || typeof resolver !== 'function') {
    throw new Error('registerBatchExcerptResolver 参数无效');
  }
  batchResolvers.set(targetType, resolver);
}

function hasExcerptResolver(targetType) {
  return rowResolvers.has(targetType) || batchResolvers.has(targetType);
}

/** 行内摘要（未注册或数据缺失 → null） */
function resolveRowExcerpt(targetType, row) {
  const resolver = rowResolvers.get(targetType);
  if (!resolver) return null;
  try {
    return truncate(resolver(row));
  } catch {
    // 解析器自己的问题不许把整个列表打成 500：只丢这一段摘要
    return null;
  }
}

/**
 * 批量摘要：按 targetType 分组后**各查一次**，返回 `Map<"type:id", excerpt|null>`。
 * ⛔ 未注册的类型不查、不猜。
 */
async function resolveBatchExcerpts(items) {
  const result = new Map();
  const grouped = new Map();
  for (const item of items) {
    if (!item || typeof item.type !== 'string' || !Number.isInteger(item.id)) continue;
    if (!batchResolvers.has(item.type)) continue;
    if (!grouped.has(item.type)) grouped.set(item.type, []);
    grouped.get(item.type).push(item.id);
  }
  for (const [type, ids] of grouped) {
    const resolver = batchResolvers.get(type);
    try {
      const resolved = await resolver(ids);
      for (const id of ids) {
        result.set(`${type}:${id}`, truncate(resolved instanceof Map ? resolved.get(id) : null));
      }
    } catch {
      // 同上：单个域的解析失败只让该域摘要为空
      for (const id of ids) result.set(`${type}:${id}`, null);
    }
  }
  return result;
}

/* ── 帖子类：正文已经在列表 SQL 的 row 里（`post_content`），零成本 ── */
const postRowResolver = row => row.post_content ?? null;
for (const type of ['post', 'trending_post', 'campus_post', 'announcement']) {
  registerRowExcerptResolver(type, postRowResolver);
}

module.exports = {
  SOURCE_EXCERPT_MAX,
  truncate,
  registerRowExcerptResolver,
  registerBatchExcerptResolver,
  hasExcerptResolver,
  resolveRowExcerpt,
  resolveBatchExcerpts,
};
