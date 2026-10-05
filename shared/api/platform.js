/**
 * 平台注入点 —— `shared/` 里**唯一**允许"由宿主告诉我事实"的地方。
 *
 * ⛔ 本文件以及整个 `shared/**` **不得**出现任何平台判断
 *    （不读 RN 的 Platform 模块、不靠"我在原生里跑"这类布尔标志、不靠 window 存在与否判断宿主）。
 *    理由：`shared/` 是 App 与 Web 的**唯一真源**（宪法 9.6/9.7）；
 *    一旦它长出平台分支，每加一个宿主都要改它。
 *    正确形态是**宿主启动时注入**：
 *      · App  → `app/src/shared/api.ts` 的 `configureAppApi()`
 *      · Web  → 不注入（保持历史默认）
 *
 * ⛔ 不注入时行为与改造前**完全一致**（相对路径 + localStorage）→ Web 零变化。
 *
 * **为什么 token 是一个"同步 getter"**：`request.js` 的读取是同步的，而 App 的
 * 安全存储（`expo-secure-store`）是异步 API → 宿主必须传一个读**内存镜像**的同步函数，
 * 由登录/登出/冷启动水合时负责写这个镜像（P1-13）。
 */

/** 未注入时的取值（＝历史行为） */
const defaults = {
  baseUrl: null,
  getToken: null,
};

const overrides = { ...defaults };

/**
 * 注入宿主事实。可多次调用（幂等覆盖）；`undefined` 视为"清掉这一项"。
 * @param {{ baseUrl?: string|null, getToken?: (() => string|null)|null }} [patch]
 */
export function configureApi(patch = {}) {
  if ('baseUrl' in patch) overrides.baseUrl = patch.baseUrl ?? null;
  if ('getToken' in patch) overrides.getToken = patch.getToken ?? null;
}

/** 清回未注入状态。只给测试用（宿主不会调用它）。 */
export function resetApiConfiguration() {
  overrides.baseUrl = defaults.baseUrl;
  overrides.getToken = defaults.getToken;
}

/**
 * 注入的后端根地址。
 * @returns {string|undefined} `undefined` = 没注入 → 调用方用 `??` 回落历史值
 */
export function getInjectedBaseUrl() {
  const value = overrides.baseUrl;
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * 注入的 token。
 * @returns {string|null|undefined}
 *   `undefined` = **没有注入** → 调用方应回落历史行为（localStorage）
 *   `null`      = 注入了但当前无 token → 调用方 **⛔ 不得再回落**，
 *                 否则 App 会去读并不存在的 localStorage
 */
export function readInjectedToken() {
  if (typeof overrides.getToken !== 'function') return undefined;
  try {
    const value = overrides.getToken();
    return typeof value === 'string' && value !== '' ? value : null;
  } catch {
    // 读 token 失败不应让请求路径崩（渲染路径上抛异常会白屏）
    return null;
  }
}
