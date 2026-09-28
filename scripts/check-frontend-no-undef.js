#!/usr/bin/env node
/**
 * 前端源码「未定义标识符」检查（只查 no-undef）
 *
 * 为什么单独做一个脚本，而不是直接 `npm run lint`：
 *   frontend 现有存量还有 100+ 条别的规则告警（no-unused-vars / react-hooks/* / react-refresh），
 *   完整 lint 直接红，谁也不会每天看。而 no-undef 是**唯一会当场崩页**的一类：
 *   未定义变量在渲染期抛 ReferenceError → 整棵路由树被卸载。
 *   2026-09-26 的 `/about/club/my` 崩溃（retroui/Avatar.jsx 里 `shape is not defined`）就是这一类。
 *
 * 用法：
 *   node scripts/check-frontend-no-undef.js      # 直接跑，有未定义标识符则退出码 1
 *   也由 __tests__/frontend/frontendSourceLint.test.js 自动调用，纳入 npx jest
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');
const eslintEntry = path.join(FRONTEND_DIR, 'node_modules', 'eslint', 'package.json');

async function main() {
  if (!fs.existsSync(eslintEntry)) {
    console.error('[no-undef] 跳过：未安装 frontend 依赖（请先 cd frontend && npm install）');
    process.exit(0);
  }

  // 从 frontend 自己的 node_modules 解析 eslint（根目录没有装）
  const frontendRequire = createRequire(path.join(FRONTEND_DIR, 'package.json'));
  const { ESLint } = frontendRequire('eslint');

  const eslint = new ESLint({ cwd: FRONTEND_DIR });
  // 传目录（而不是 glob）——ESLint 9 的 API 对 `src/**/*.{js,jsx}` 这类模式只匹配到少数文件，
  // 传目录才会真正遍历全部源码（实测 246 个文件 vs 3 个）。
  const results = await eslint.lintFiles(['src']);

  const offenders = [];
  for (const result of results) {
    for (const message of result.messages) {
      if (message.ruleId !== 'no-undef') continue;
      offenders.push(`${path.relative(process.cwd(), result.filePath)}:${message.line}:${message.column}  ${message.message}`);
    }
  }

  if (offenders.length > 0) {
    console.error(`[no-undef] 发现 ${offenders.length} 处未定义标识符（渲染时会直接崩掉整个路由）：`);
    offenders.forEach((line) => console.error('  ' + line));
    process.exit(1);
  }

  console.log(`[no-undef] OK — frontend/src 下 ${results.length} 个文件没有未定义标识符`);
}

main().catch((e) => {
  console.error('[no-undef] 检查失败：', e && (e.stack || e.message || e));
  process.exit(1);
});
