/**
 * Database mocking utilities for tests.
 * Provides a mock query() function that returns configurable results.
 */

const mockQuery = jest.fn();
const mockQueryRaw = jest.fn(); // for raw query results without array destructuring

function mockQueryResult(rows) {
  // Simulate mysql2/promise behavior: [rows, fields]
  return [[rows], []];
}

function mockQueryResults(results) {
  // Return multiple result sets for Promise.all patterns
  return results.map((r) => [[r], []]);
}

function mockQueryCount(count) {
  return [[{ c: count }], []];
}

function mockQueryList(list) {
  return [[list], []];
}

function mockQueryPaginated(list, total) {
  return [[{ total }], [list]];
}

function resetMockQuery() {
  mockQuery.mockReset();
}

// Create a mock database module
const mockDatabase = {
  query: mockQuery,
};

// Create a mock query module for middleware tests
const mockQueryModule = mockQuery;

module.exports = {
  mockQuery,
  mockQueryRaw,
  mockQueryResult,
  mockQueryResults,
  mockQueryCount,
  mockQueryList,
  mockQueryPaginated,
  resetMockQuery,
  mockDatabase,
  mockQueryModule,
};
