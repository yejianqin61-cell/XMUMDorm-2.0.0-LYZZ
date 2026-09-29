/**
 * LIMIT / OFFSET 的**整数内联**工具。
 *
 * 为什么不能用 `LIMIT ?`：
 *   `database.js` 的 `query()` 走 mysql2 `pool.execute()`，也就是**二进制预处理协议**。
 *   在 Railway 托管的那台 MySQL（实测 9.7.2）上，把 JS number 绑到 LIMIT 占位符上会抛
 *   `ER_WRONG_ARGUMENTS (1210) Incorrect arguments to mysqld_stmt_execute` —— 整条 SQL 直接 500。
 *   （把参数改成字符串反而能过，但那是靠服务端隐式转换，不可依赖。）
 *
 *   这不是理论风险：`routes/canteen.js` 早已踩过同一个坑，并在原处留了注释；
 *   学习资料模块（M10）第一次把 `LIMIT ?` 写回来，线上 `/api/materials/courses`
 *   与 `/api/materials/me/uploads` 立刻 500。守卫测试见 `__tests__/utils/sqlLimit.test.js`。
 *
 * 做法：先强制转成**有界整数**，再内联进 SQL 文本。
 * 结果一定只有十进制数字（末尾还会正则二次确认），因此不引入注入面。
 */

/** 「没给值」的判定：null / undefined / 空串 / 纯空白串。 */
function isAbsent(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

/** 把一个来路不明的值收敛成 [min, max] 内的整数；没给值或非法值取 fallback。 */
function toBoundedInt(value, { fallback, min, max }) {
  // 必须先判「没给值」：Number(null) 与 Number('') 都是 0，
  // 不拦的话 `?limit=` 会静默变成 1 条，而不是回退到默认值。
  if (isAbsent(value)) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

/**
 * 供 `LIMIT ${...}` 使用。
 * @param {*} value - 原始值（可能是 query string）
 * @param {object} [opts]
 * @param {number} [opts.fallback=20] - 非法值时的回退
 * @param {number} [opts.min=1]
 * @param {number} [opts.max=100]
 * @returns {number} 可直接内联进 SQL 的整数
 */
function inlineLimit(value, opts = {}) {
  const i = toBoundedInt(value, { fallback: 20, min: 1, max: 100, ...opts });
  // 二次确认：内联进 SQL 的必须只有十进制数字
  if (!/^\d+$/.test(String(i))) {
    throw new Error(`inlineLimit 产生了非整数：${JSON.stringify(value)}`);
  }
  return i;
}

/**
 * 供 `OFFSET ${...}` 使用（下界为 0）。
 * @param {*} value
 * @param {object} [opts]
 * @param {number} [opts.fallback=0]
 * @param {number} [opts.max=1000000]
 * @returns {number}
 */
function inlineOffset(value, opts = {}) {
  const i = toBoundedInt(value, { fallback: 0, min: 0, max: 1000000, ...opts });
  if (!/^\d+$/.test(String(i))) {
    throw new Error(`inlineOffset 产生了非整数：${JSON.stringify(value)}`);
  }
  return i;
}

module.exports = { inlineLimit, inlineOffset, toBoundedInt };
