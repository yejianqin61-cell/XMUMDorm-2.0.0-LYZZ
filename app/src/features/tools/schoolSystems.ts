/**
 * 三个校方系统（工具 Tab —— **本 App 最主要功能**，宪法 4.1.2）
 *
 * ⛔ 三条铁律：
 *   1. **只写域名，绝不写 IP**（实测：三个系统都是**内外双解析**，校内 `10.68.x.x` / 公网 `203.106.6.x`
 *      → 写 IP 会在另一种网络下直接失败）
 *   2. **工具 Tab 里只有这三个是网页**，其余（课表 / 待办 / 放假日…）全部原生实现
 *   3. **凭据不落我们手里**：校方 cookie 由平台 WebView 的 cookie 存储持有，
 *      ⛔ App 代码不读、不落盘、不上传；⛔ 后端也不接收（安全红线）
 */

import type { MessageKey } from '@/i18n';

export type SchoolSystemId = 'ac' | 'moodle' | 'checkin';

/**
 * 登录方式。当前**三个系统全部是 `studentId`**（所有者 2026-10-02 确认：
 * "学校的所有系统都是学号登陆，不会涉及 Google 登录"）。
 * `googleSso` / `unknown` 保留在联合类型里，是给**将来新增的校方系统**留的位置
 * —— 它们不是"待实测状态"，而是"可能的取值"。
 */
export type LoginMethod = 'studentId' | 'googleSso' | 'unknown';

export type SchoolSystem = {
  id: SchoolSystemId;
  titleKey: MessageKey;
  /** 只写域名（⛔ 绝不写 IP） */
  origin: string;
  startUrl: string;
  loginMethod: LoginMethod;
  /** `webview` = 内嵌（默认）；`external` = 系统浏览器（**仅当走 Google SSO**） */
  embed: 'webview' | 'external';
};

/**
 * 三个系统（URL 由所有者 2026-10-02 给出；均为校园内使用，不把校外可达性当需求）。
 * ✅ **三个都是学号登录**（所有者 2026-10-02 确认，⛔ 不涉及 Google）→ **三格全部内嵌**，
 *    C-04 残余与 D-08 的"唯一遗留"就此关闭，R3 不再有任何例外分支。
 */
export const SCHOOL_SYSTEMS: readonly SchoolSystem[] = [
  {
    id: 'ac',
    titleKey: 'tools.system.ac',
    origin: 'ac.xmu.edu.my',
    startUrl: 'https://ac.xmu.edu.my/',
    loginMethod: 'studentId',
    embed: 'webview',
  },
  {
    id: 'moodle',
    titleKey: 'tools.system.moodle',
    origin: 'l.xmu.edu.my',
    startUrl: 'https://l.xmu.edu.my/',
    // ✅ 所有者 2026-10-02 确认：学校所有系统都是学号登录，不涉及 Google
    loginMethod: 'studentId',
    embed: 'webview',
  },
  {
    id: 'checkin',
    titleKey: 'tools.system.checkin',
    origin: 'acad.xmu.edu.my',
    startUrl: 'https://acad.xmu.edu.my/mobile',
    // ✅ 所有者 2026-10-02 确认：学校所有系统都是学号登录，不涉及 Google
    loginMethod: 'studentId',
    embed: 'webview',
  },
];

/** 课表所在的系统（头号功能的主链路：AC → 学号登录 → 读课表） */
export const SCHEDULE_SYSTEM_ID: SchoolSystemId = 'ac';

export function getSchoolSystem(id: SchoolSystemId): SchoolSystem | undefined {
  return SCHOOL_SYSTEMS.find((system) => system.id === id);
}

/**
 * 把登录方式收敛成**可执行的打开方式**。
 *
 * ⚠️ **当前三个系统全部是学号登录**（所有者 2026-10-02 确认）→ 对 `SCHOOL_SYSTEMS`
 *    的每一项都返回 `webview`。下面的 `googleSso` 分支是**防御性保留**，不是当前路径：
 *    Google 官方《OAuth 2.0 Policies》「Use secure browsers」逐字禁止把 OAuth 授权请求
 *    交给"开发者掌控的 embedded user-agent"，且**点名了"注入任意脚本"与"访问会话
 *    cookie"两种能力** —— 恰是本容器的能力。因此**若将来某个校方系统改走 Google 登录，
 *    它必须走系统浏览器**，这条规则不能靠"我们相信能行"绕过。
 */
export function resolveEmbedMode(system: SchoolSystem): 'webview' | 'external' {
  if (system.loginMethod === 'googleSso') {
    // ⛔ Google 官方明令不得在嵌入浏览环境里做 OAuth → 只能走系统浏览器
    return 'external';
  }
  return system.embed;
}

/** 域名/IP 不变量：⛔ 配置里出现 IP 字面量即视为错误（实证规则） */
export function assertDomainOnly(urls: readonly string[]): void {
  const ipv4 = /\b\d{1,3}(\.\d{1,3}){3}\b/;
  for (const url of urls) {
    if (ipv4.test(url)) {
      throw new Error(`⛔ 校方系统配置里不得出现 IP（内外双解析，写 IP 会在另一种网络下失败）：${url}`);
    }
    if (!url.startsWith('https://')) {
      throw new Error(`校方系统必须走 HTTPS：${url}`);
    }
  }
}
