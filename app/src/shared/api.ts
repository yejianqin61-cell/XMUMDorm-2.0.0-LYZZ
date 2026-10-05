/**
 * App 侧 **唯一** 的 `shared/` 接入点（P1-01）
 *
 * **为什么必须收口在这里**：`shared/api/config.js` 的 `API_BASE_URL` 是 **import 时求值** 的
 * 模块常量，而宿主注入发生在运行时 —— 所以 App **不能依赖那个常量**。真正被消费的是
 * `request()` / `getUploadUrl()` 里的"**注入优先**"，它们读 `platform.js` 的实时值。
 * 结论：注入只需发生在**第一次请求之前**，不需要抢在 import 之前。
 *
 * ⛔ **本文件只允许 import `shared/api/platform`**，不得 import `config` 或任何其它
 * `shared/` 模块 —— 一旦把 `config` 拉进本文件的模块图，它就会在本文件顶层语句**之前**
 * 求值。业务模块请直接 `import { ... } from '../../../shared/api/xxx'`。
 */
import { configureApi } from '../../../shared/api/platform';

/** 开发期默认后端（与后端 `PORT=4040` 一致）；可用 `EXPO_PUBLIC_API_BASE_URL` 覆盖 */
const DEV_FALLBACK_BASE_URL = 'http://127.0.0.1:4040';
const PROD_BASE_URL = 'https://xmumdorm-200-lyzz-production.up.railway.app';

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv;
  return __DEV__ ? DEV_FALLBACK_BASE_URL : PROD_BASE_URL;
}

/**
 * token 的**同步**读取器。
 * ⛔ 实现（`expo-secure-store` + 内存镜像）属 **P1-13**；本任务只提供接缝：
 * 登录 / 登出 / 冷启动水合时调用 `setTokenGetter` 把镜像交给请求层。
 */
let tokenGetter: (() => string | null) | null = null;

export function setTokenGetter(getter: (() => string | null) | null): void {
  tokenGetter = getter;
  configureApi({ getToken: getter === null ? null : () => tokenGetter?.() ?? null });
}

let configured = false;

/** 幂等：根布局启动时调一次即可（重复调用无副作用） */
export function configureAppApi(): void {
  if (configured) return;
  configureApi({
    baseUrl: resolveBaseUrl(),
    getToken: () => tokenGetter?.() ?? null,
  });
  configured = true;
}

/** 测试辅助：重置本模块的配置状态（生产代码不调用） */
export function resetAppApiConfiguration(): void {
  configured = false;
  tokenGetter = null;
  configureApi({ baseUrl: null, getToken: null });
}

/**
 * **防御式解包**：`shared/api/request.js` 在响应体带 `exp` 时，会把**数组**包成
 * `{ __payload, __exp }`。今天食堂的读端点不带 `exp`，但一旦带了，所有列表会**静默变成对象**
 * → 所有列表数据统一过这个函数。
 */
export function unwrapArray<T>(data: T): T {
  if (Array.isArray(data)) return data;
  const wrapped = (data as { __payload?: unknown } | null | undefined)?.__payload;
  return (Array.isArray(wrapped) ? wrapped : data) as T;
}
