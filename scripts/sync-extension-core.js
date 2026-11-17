#!/usr/bin/env node
/**
 * 把 shared/moodle/moodle-core.js 拷到 extension/lib/（扩展是免构建的普通脚本，不能直接引用仓库外层文件）。
 * 改了 shared 里的那份之后执行：npm run extension:sync-core
 * __tests__/shared/moodleCore.test.js 会检查两份是否一致。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const from = path.join(root, 'shared', 'moodle', 'moodle-core.js');
const to = path.join(root, 'extension', 'lib', 'moodle-core.js');
fs.mkdirSync(path.dirname(to), { recursive: true });
fs.copyFileSync(from, to);
console.log(`copied ${path.relative(root, from)} -> ${path.relative(root, to)}`);
