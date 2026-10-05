/**
 * Jest 解析器 —— 把 **worklets 的扩展名过滤** 与 **RN 官方解析器** 串起来。
 *
 * 为什么需要（实测踩到）：
 *   `react-native-worklets@0.10.1` 的 `NativeWorklets.native.ts` 在模块顶层就会去拿原生
 *   TurboModule，Jest 里没有 → `TypeError: Cannot read properties of undefined (reading 'loadUnpackers')`。
 *   worklets 官方为此提供了 `react-native-worklets/jest/resolver.js`（在 worklets 内部**剥掉 `.native.*`**），
 *   但它直接调用 `options.defaultResolver`，会**丢掉** `jest-expo` preset 用的 RN 解析器
 *   （`@react-native/jest-preset/jest/resolver.js` 会为 `react-native` 包删除 `exports` 字段）。
 *   所以这里把两者串起来：先做 worklets 的扩展名过滤，再交给 RN 的解析器。
 *
 * 依据：docs/app/task/phase-0/P0-04-唯一安全区容器.md §8 执行记录。
 */
const rnResolver = require('@react-native/jest-preset/jest/resolver');

module.exports = (request, options) => {
  const touchesWorklets =
    options.basedir.includes('react-native-worklets') || request.includes('react-native-worklets');

  const nextOptions = touchesWorklets
    ? {
        ...options,
        extensions: (options.extensions ?? []).filter((ext) => !ext.includes('native')),
      }
    : options;

  return rnResolver(request, nextOptions);
};
