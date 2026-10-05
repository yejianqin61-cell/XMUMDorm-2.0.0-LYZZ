const expoPreset = require('jest-expo/android/jest-preset');

module.exports = {
  preset: 'jest-expo/android',
  // 见 app/jest/resolver.js 的注释：串起 worklets 的扩展名过滤与 RN 官方解析器
  resolver: '<rootDir>/jest/resolver.js',
  // P1-02：AsyncStorage / NetInfo 需要官方 mock。⛔ 必须展开 preset 的 setupFiles，
  // 否则会把 jest-expo 自己的 setup 丢掉。
  setupFiles: [...(expoPreset.setupFiles ?? []), '<rootDir>/jest.setup.js'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  // ⚠️ P1-08：`@ronradtke/react-native-markdown-display` 的 `dist/` **带着未编译的 JSX**
  //    （Metro 会编，Jest 不会）→ 必须把它加进 preset 的**例外**名单，否则
  //    `SyntaxError: Unexpected token '<'`。⛔ 必须展开 preset 自己的正则，
  //    只追加一项；手写一份完整名单会随 preset 升级静默过期。
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@ronradtke/react-native-markdown-display))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  moduleNameMapper: {
    // ⚠️ 必须展开 preset 的映射，否则会连带丢掉它给 react-native / @/ 的映射
    ...expoPreset.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1',
    // P1-01：shared/*.js 由 app 的 babel 编译后会 require('@babel/runtime/helpers/*')，
    // 而该包只装在 app 下（仓库根 node_modules 里没有）→ jest 从 shared/ 向上解析不到。
    // 显式指到 app 自己的 node_modules（⛔ 不改根 package.json）。
    '^@babel/runtime/(.*)$': '<rootDir>/node_modules/@babel/runtime/$1',
    // lucide-react-native 的 exports map 在 Jest 下会解析到 ESM（.mjs），
    // 而 jest-expo 的 transformIgnorePatterns 不含它 → "Cannot use import statement outside a module"。
    // 这里显式指向它自带的 CJS 产物（与运行时同一份代码，只是模块格式不同）。
    '^lucide-react-native/icons/(.*)$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
    // ⚠️ 试过把 `react-native-reanimated` 映射到官方 `mock.js` 来关掉
    // "shared value's .value inside reanimated inline style" 的**误报**（它把令牌的 `.value`
    // 当成 SharedValue），但 RN/`react-native-screens` 会调用 reanimated 的
    // `getUseOfValueInStyleWarning`，官方 mock 没实现 → 全部渲染用例崩。
    // 结论：**保留真实 reanimated，接受这条警告噪音**（它在开发期只影响日志，不影响渲染）。
  },
  clearMocks: true,
  restoreMocks: true,
  verbose: false,
  // RNTL 14 用 concurrent root 渲染，单个渲染用例在本机上可以跑十几秒；
  // 默认 5s 会在机器负载高时**随机超时**（实测 P0-06 出现过一次），因此放宽并限制并发。
  testTimeout: 30000,
  maxWorkers: '50%',
};
