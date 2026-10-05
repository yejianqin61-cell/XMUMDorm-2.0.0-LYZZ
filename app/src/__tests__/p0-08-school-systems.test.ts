/**
 * P0-08 · 校方系统内嵌容器（R3）—— 自动化用例
 *
 * 能自动判的部分：配置不变量、注入脚本结构、**用假 DOM 真跑一遍读表脚本**、
 * 纯函数抽取链路（消息 → 行 → 制表符文本）、容器源码上的必需 props 与禁令。
 *
 * ⛔ 不能自动判的（必须真机，见 R3 结论文档）：三个系统是否反 WebView、
 *    会话能否跨重启保持、课表页是否异步渲染、Moodle/签到 是否走 Google SSO。
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  SCHOOL_SYSTEMS,
  SCHEDULE_SYSTEM_ID,
  assertDomainOnly,
  getSchoolSystem,
  resolveEmbedMode,
  type SchoolSystem,
} from '@/features/tools/schoolSystems';
import {
  SCRAPE_KIND,
  buildInsetBootstrapScript,
  buildScheduleScrapeScript,
} from '@/features/tools/injectedScripts';
import {
  extractScheduleFromMessage,
  normalizeRows,
  parseInjectedMessage,
  toTabSeparated,
} from '@/features/tools/extractSchedule';
import { zh } from '@/i18n';

const SRC_ROOT = path.resolve(__dirname, '..');
const readSrc = (rel: string): string => fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');

/** 假 DOM：只实现注入脚本用到的那几件事，用来**真跑**读表逻辑 */
function runScrapeScript(script: string, table: string[][]): string | null {
  let captured: string | null = null;
  const fakeRows = table.map((cells) => ({
    querySelectorAll: () => cells.map((text) => ({ innerText: text })),
  }));
  const fakeDocument = {
    querySelectorAll: (selector: string) => (selector === 'table tr' ? fakeRows : []),
  };
  const fakeWindow = {
    ReactNativeWebView: {
      postMessage: (payload: string) => {
        captured = payload;
      },
    },
  };
  const fakeSetInterval = (callback: () => void) => {
    callback();
    return 1;
  };
  const fakeClearInterval = () => undefined;

  // eslint-disable-next-line no-new-func
  new Function('document', 'window', 'setInterval', 'clearInterval', script)(
    fakeDocument,
    fakeWindow,
    fakeSetInterval,
    fakeClearInterval
  );
  return captured;
}

const FIXTURE_TABLE = [
  ['课程', '教师', '教室', '周次'],
  ['数据结构', 'Dr. Lim', 'A-301', '1-14'],
  ['线性代数', 'Dr. Tan', 'B-102', '1-14'],
];

describe('P0-08 校方系统内嵌容器（R3）', () => {
  describe('TC-P0-08-1A · 系统配置：只写域名、必须 HTTPS', () => {
    it('三个系统 id 唯一且齐全', () => {
      expect(SCHOOL_SYSTEMS.map((s) => s.id)).toEqual(['ac', 'moodle', 'checkin']);
    });

    it('⛔ 配置里 0 个 IP 字面量（内外双解析；写 IP 会在另一种网络下失败）', () => {
      expect(() => assertDomainOnly(SCHOOL_SYSTEMS.map((s) => s.startUrl))).not.toThrow();
      expect(() => assertDomainOnly(['http://10.68.12.158/'])).toThrow();
      expect(() => assertDomainOnly(['http://ac.xmu.edu.my/'])).toThrow(/HTTPS/);
    });

    it('三条真实 URL 与所有者给定的一致', () => {
      expect(getSchoolSystem('ac')?.startUrl).toBe('https://ac.xmu.edu.my/');
      expect(getSchoolSystem('moodle')?.startUrl).toBe('https://l.xmu.edu.my/');
      expect(getSchoolSystem('checkin')?.startUrl).toBe('https://acad.xmu.edu.my/mobile');
    });

    it('AC = 学号登录（主链路可行）；Moodle / 签到 仍为 unknown（⛔ 不得当已成立）', () => {
      expect(getSchoolSystem('ac')?.loginMethod).toBe('studentId');
      expect(getSchoolSystem('moodle')?.loginMethod).toBe('unknown');
      expect(getSchoolSystem('checkin')?.loginMethod).toBe('unknown');
    });

    it('课表在 AC（头号功能主链路）', () => {
      expect(SCHEDULE_SYSTEM_ID).toBe('ac');
    });

    it('⛔ 走 Google SSO 的系统必须降级为系统浏览器（Google 禁止嵌入 webview 做 OAuth）', () => {
      const sso: SchoolSystem = {
        ...(SCHOOL_SYSTEMS[0] as SchoolSystem),
        id: 'moodle',
        loginMethod: 'googleSso',
      };
      expect(resolveEmbedMode(sso)).toBe('external');
      expect(resolveEmbedMode(SCHOOL_SYSTEMS[0] as SchoolSystem)).toBe('webview');
    });

    it('每个系统的标题词条都在词条表里', () => {
      for (const system of SCHOOL_SYSTEMS) {
        expect(Object.keys(zh)).toContain(system.titleKey);
      }
    });
  });

  describe('TC-P0-08-2A · 注入脚本：只读页面，⛔ 不代替用户操作', () => {
    const script = buildScheduleScrapeScript();

    it('脚本里 0 处"代替用户完成校方动作"的写法（宪法 4.1.2-4）', () => {
      for (const forbidden of ['click(', 'submit(', 'dispatchEvent', '.submit()', '签到']) {
        expect(script).not.toContain(forbidden);
      }
    });

    it('脚本包含轮询、表格选择器与 postMessage 回传', () => {
      expect(script).toContain('setInterval');
      expect(script).toContain("'table tr'");
      expect(script).toContain('ReactNativeWebView.postMessage');
      expect(script).toContain(SCRAPE_KIND);
    });

    it('轮询上限可配置（避免永久等待）', () => {
      const custom = buildScheduleScrapeScript({ maxTries: 3, intervalMs: 100 });
      expect(custom).toContain('100');
      expect(custom).toContain('3');
    });
  });

  describe('TC-P0-08-3A / 4A · 用假 DOM 真跑读表脚本', () => {
    it('正常表格 → 回传全部行的单元格文本', () => {
      const raw = runScrapeScript(buildScheduleScrapeScript(), FIXTURE_TABLE);
      expect(raw).not.toBeNull();
      const parsed = parseInjectedMessage(raw);
      expect(parsed?.kind).toBe(SCRAPE_KIND);
      expect(parsed?.rows).toEqual(FIXTURE_TABLE);
    });

    it('单元格前后空格被 trim', () => {
      const raw = runScrapeScript(buildScheduleScrapeScript(), [[' 课程 ', '教师'], [' 数据结构 ', ' Dr. Lim ']]);
      const parsed = parseInjectedMessage(raw);
      expect(parsed?.rows).toEqual([
        ['课程', '教师'],
        ['数据结构', 'Dr. Lim'],
      ]);
    });

    it('页面还没渲染出表 → **不回传**（而不是回传空表）', () => {
      expect(runScrapeScript(buildScheduleScrapeScript(), [])).toBeNull();
      expect(runScrapeScript(buildScheduleScrapeScript(), [['只有表头']])).toBeNull();
    });
  });

  describe('TC-P0-08-5A · 抽取链路（消息 → 行 → 制表符文本）', () => {
    it('正常消息 → 行 + 制表符文本 + 表头', () => {
      const raw = JSON.stringify({ kind: SCRAPE_KIND, rows: FIXTURE_TABLE });
      const extracted = extractScheduleFromMessage(raw);
      expect(extracted?.headerRow).toEqual(FIXTURE_TABLE[0]);
      expect(extracted?.text).toBe('数据结构\tDr. Lim\tA-301\t1-14\n线性代数\tDr. Tan\tB-102\t1-14');
    });

    it('⛔ 制表符文本无尾随 tab、无空行', () => {
      const text = toTabSeparated([
        ['a', 'b', '', ''],
        ['', '  ', ''],
        ['c', 'd'],
      ]);
      expect(text).toBe('a\tb\nc\td');
      expect(text.includes('\t\n')).toBe(false);
      expect(text.startsWith('\n')).toBe(false);
    });

    it('normalizeRows 去掉全空行与尾部空列', () => {
      expect(normalizeRows([['x', '', ''], ['', ''], ['y']])).toEqual([['x'], ['y']]);
    });

    it('畸形输入一律返回 null / 空，不抛异常（渲染路径上不许白屏）', () => {
      for (const bad of [null, undefined, 123, '', '{', 'null', '[]', '{"kind":1}', '{"rows":[]}']) {
        expect(() => parseInjectedMessage(bad)).not.toThrow();
        expect(parseInjectedMessage(bad)).toBeNull();
      }
      expect(extractScheduleFromMessage(JSON.stringify({ kind: 'other', rows: [['a']] }))).toBeNull();
      expect(
        extractScheduleFromMessage(JSON.stringify({ kind: SCRAPE_KIND, rows: [] }))
      ).toBeNull();
    });

    it('非字符串单元格被过滤掉（防御式）', () => {
      const parsed = parseInjectedMessage(
        JSON.stringify({ kind: SCRAPE_KIND, rows: [['a', 1, null, 'b']] })
      );
      expect(parsed?.rows).toEqual([['a', 'b']]);
    });
  });

  describe('TC-P0-08-6A · insets 传给内嵌页（宪法 17.3）', () => {
    it('注入脚本把真实 insets 写成 CSS 变量', () => {
      const script = buildInsetBootstrapScript({ top: 24, bottom: 48, left: 12, right: 12 });
      expect(script).toContain('--dorm-inset-top');
      expect(script).toContain('24px');
      expect(script).toContain('--dorm-inset-bottom');
      expect(script).toContain('48px');
      expect(script).toContain('--dorm-inset-left');
      expect(script.trim().endsWith('true;')).toBe(true);
    });
  });

  describe('TC-P0-08-7A / 8A · 容器源码：会话 props 与三条禁令', () => {
    const container = readSrc(path.join('features', 'tools', 'SchoolSystemWebView.tsx'));

    it('会话保持的意图声明齐全（且默认就是持久）', () => {
      expect(container).toContain('sharedCookiesEnabled');
      expect(container).toContain('cacheEnabled');
      expect(container).toContain('thirdPartyCookiesEnabled');
      expect(container).toContain('domStorageEnabled');
    });

    it('⛔ 不使用 incognito（Android 上它还会 removeAllCookies，不可逆）', () => {
      expect(container).not.toMatch(/incognito/);
    });

    it('⛔ 不整串覆盖 userAgent（只追加 applicationNameForUserAgent）', () => {
      expect(container).toContain('applicationNameForUserAgent');
      expect(container).not.toMatch(/\buserAgent=/);
    });

    it('必须给 onMessage（官方：否则注入代码不会执行）', () => {
      expect(container).toContain('onMessage');
    });

    it('injectedJavaScript 只跑一次 → onLoadEnd 里用 ref 再补一枪', () => {
      expect(container).toContain('onLoadEnd');
      expect(container).toContain('injectJavaScript');
    });

    it('⛔ 0 处读取 / 回传校方 cookie（凭据不出设备，宪法 4.1.2-3）', () => {
      const files = [
        container,
        readSrc(path.join('features', 'tools', 'schoolSystems.ts')),
        readSrc(path.join('app', 'system', '[id].tsx')),
      ].join('\n');
      // 只看**用法**：注释里提到平台名不算（文档需要写清"凭据由谁持有"）
      for (const forbidden of [
        /CookieManager\.(get|set|remove|flush)/,
        /getCookie/,
        /document\.cookie/,
        /NSHTTPCookieStorage/,
      ]) {
        expect(files).not.toMatch(forbidden);
      }
    });

    it('S7 + S2：覆盖层从唯一容器拿 insets，⛔ 不自己去读安全区', () => {
      expect(container).toContain('useScreenInsets');
      expect(container).not.toMatch(/useSafeAreaInsets\s*\(/);
      expect(container).not.toMatch(/from 'react-native-safe-area-context'/);
    });

    it('宿主页在 unknown id 时重定向回工具 Tab（⛔ 无死路由）', () => {
      const host = readSrc(path.join('app', 'system', '[id].tsx'));
      expect(host).toContain('<Redirect');
      expect(host).toContain('/tools');
    });

    it('宿主页只在 AC 上开启读表', () => {
      const host = readSrc(path.join('app', 'system', '[id].tsx'));
      expect(host).toContain("system.id === 'ac'");
    });
  });
});
