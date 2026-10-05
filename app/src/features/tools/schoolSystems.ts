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

/** 登录方式：AC = 学号登录（已确认）；另两个**待首周实测**（若走 Google SSO 必须降级为系统浏览器） */
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
 * ⚠️ `moodle` / `checkin` 的 `loginMethod` 仍是 `unknown` → **不得当已成立**（C-04 残余 / D-08）。
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
    // ⏳ 待实测：若走 Google SSO → 必须 embed: 'external'（Google 禁止在内嵌 webview 做 OAuth）
    loginMethod: 'unknown',
    embed: 'webview',
  },
  {
    id: 'checkin',
    titleKey: 'tools.system.checkin',
    origin: 'acad.xmu.edu.my',
    startUrl: 'https://acad.xmu.edu.my/mobile',
    loginMethod: 'unknown',
    embed: 'webview',
  },
];

/** 课表所在的系统（头号功能的主链路：AC → 学号登录 → 读课表） */
export const SCHEDULE_SYSTEM_ID: SchoolSystemId = 'ac';

export function getSchoolSystem(id: SchoolSystemId): SchoolSystem | undefined {
  return SCHOOL_SYSTEMS.find((system) => system.id === id);
}

/** 把 `unknown` / `googleSso` 的登录方式收敛成**可执行的打开方式** */
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
