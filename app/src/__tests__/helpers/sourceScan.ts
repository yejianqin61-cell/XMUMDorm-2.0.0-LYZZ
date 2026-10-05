/**
 * 源码扫描的共享工具（**扫描类断言的唯一入口**）
 *
 * ⚠️ **为什么必须共享**：本包已经为同一类缺陷付过三次学费 ——
 *   `P0-05`（描边宽度）、`P0-06`（下拉溢出）、`P0-04`（安全区调用点）的扫描都读**文件原文**，
 *   于是**注释里写明规则**也会被判违规：
 *   - `Icon.tsx` 的注释写"调用点不得传 strokeWidth" → 判违规；
 *   - 骨架规范描述 R5 时用的正是「更多 ▾」→ 判违规；
 *   - `Toast.tsx` / `InputSheet.tsx` 的注释写"本文件不调 `useSafeAreaInsets()`" → 判违规。
 *
 * **规则**：扫描类断言的判据必须落在**代码用法**上，而不是"文件里是否出现过某个字符串"。
 * 因此所有源码扫描**先过 `stripComments`**，⛔ 不要在用例里各写一份。
 *
 * ⚠️ 本文件放在 `__tests__/helpers/` 下但**不叫 `*.test.ts`**，所以不会被 Jest 当成用例
 *    （`jest.config.js` 的 `testMatch` 只收 `*.test.ts(x)`）；
 *    而 `walkSource` 会跳过 `__tests__`，所以它也不会被别处的扫描扫到。
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 剥掉注释（块注释 + 行注释），保留代码。
 * ⛔ 不处理字符串里的 `//`（如 URL）—— 那会把 `https://` 之后的内容误删。
 *    对本包当前的代码够用；若某天需要更严谨，应换成真正的词法扫描。
 */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * 遍历源码文件，**跳过 `__tests__`**（测试自身不是被测对象）。
 * 只收 `ts/tsx/js/jsx`。
 */
export function walkSource(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSource(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** 读文件并剥注释（扫描断言的最常用组合） */
export function readCode(file: string): string {
  return stripComments(fs.readFileSync(file, 'utf8'));
}
