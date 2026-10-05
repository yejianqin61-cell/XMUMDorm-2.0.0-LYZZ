/**
 * Metro 配置（monorepo 读取）
 *
 * 存在理由：设计令牌的**单一事实源**在仓库根（`tokens/design-tokens.css` → `tokens/generated/`），
 * 而 App 工程在 `app/`。Metro 默认只允许解析 projectRoot 下的模块，因此需要显式 watchFolders。
 *
 * ⛔ 只纳入真正跨包读取的两个目录：
 *    - `tokens/`  —— 令牌生成物（宪法 2.1）
 *    - `shared/`  —— 宪法 9.6 允许 App 与 Web 共用的五个子目录（api/constants/utils/config/query）
 * 不把整个仓库根加进来：那会把 `frontend/`、`uploads/`、根 `node_modules` 一起卷进 Metro 的解析范围。
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  path.resolve(workspaceRoot, 'tokens'),
  path.resolve(workspaceRoot, 'shared'),
];

// P1-01：`shared/*.js` 由 app 的 babel 编译后会 require('@babel/runtime/helpers/*')，
// 而该包只装在 app 下（仓库根 node_modules 里没有）→ Metro 从 shared/ 向上解析不到。
// 显式指路。（jest 侧的同一问题由 app/jest.config.js 的 moduleNameMapper 处理。）
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@babel/runtime': path.resolve(projectRoot, 'node_modules', '@babel', 'runtime'),
};

module.exports = config;
