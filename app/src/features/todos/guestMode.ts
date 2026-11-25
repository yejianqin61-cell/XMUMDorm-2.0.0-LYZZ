/**
 * 游客态开关（模块级，非 React）：待办层要在 hook 之外决定「走本地还是走账号接口」。
 * 只有 SessionProvider 在「已确认未登录」时才置 true；水合中 / 已登录 / 过期都为 false。
 */
let guest = false;
export function setGuestMode(value: boolean): void { guest = value; }
export function isGuestMode(): boolean { return guest; }
