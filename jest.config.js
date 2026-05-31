module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'middleware/adminAuth.js',
    'middleware/checkSanction.js',
    'routes/admin.js',
    'routes/reports.js',
    'services/auditLog.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 70,
      lines: 95,
      statements: 92,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
};
