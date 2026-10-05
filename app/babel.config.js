/**
 * Babel 配置 —— 版本与 `expo@57.0.26` 内嵌的 `babel-preset-expo` 保持一致（57.0.13）。
 * ⚠️ 存在理由：SDK 57 的模板没有这个文件（Metro 有默认值），但 **jest-expo 需要一个可解析的
 *    babel 配置**，否则 `@react-native/jest-preset/jest/setup.js` 的 Flow 语法会解析失败
 *    （现象：`SyntaxError: Unexpected token, expected ","`）。
 * 依据：docs/app/task/phase-0/P0-01-工程脚手架与依赖准入.md
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
