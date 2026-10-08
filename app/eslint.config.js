const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/**'] },
  // React Compiler is not enabled in this app. Keep its migration diagnostics
  // visible while retaining the existing hooks correctness rules as errors.
  { rules: { 'react-hooks/refs': 'warn', 'react-hooks/set-state-in-effect': 'warn', 'react-hooks/globals': 'warn' } },
  // Test probes intentionally expose hook values to assertions outside render.
  { files: ['src/__tests__/**'], rules: { 'react-hooks/immutability': 'warn' } },
]);
