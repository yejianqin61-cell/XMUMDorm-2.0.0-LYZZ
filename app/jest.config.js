const expoPreset = require('jest-expo/android/jest-preset');

module.exports = {
  preset: 'jest-expo/android',
  // 见 app/jest/resolver.js 的注释：串起 worklets 的扩展名过滤与 RN 官方解析器
  resolver: '<rootDir>/jest/resolver.js',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    // ⚠️ 必须展开 preset 的映射，否则会连带丢掉它给 react-native / @/ 的映射
    ...expoPreset.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1',
    // lucide-react-native 的 exports map 在 Jest 下会解析到 ESM（.mjs），
    // 而 jest-expo 的 transformIgnorePatterns 不含它 → "Cannot use import statement outside a module"。
    // 这里显式指向它自带的 CJS 产物（与运行时同一份代码，只是模块格式不同）。
    '^lucide-react-native/icons/(.*)$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  clearMocks: true,
  restoreMocks: true,
  verbose: false,
};
