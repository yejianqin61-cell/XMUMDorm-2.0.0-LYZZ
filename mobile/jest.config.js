module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.js'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '<rootDir>/__tests__/helpers/asyncStorageMock.js',
  },
};
