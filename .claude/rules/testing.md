# Testing Rules

## Testing Stack
- **Framework**: Jest 30
- **HTTP Testing**: Supertest
- **Coverage**: Jest built-in (`--coverage`)
- **Location**: `__tests__/`

## Test Requirements by Layer

| Layer | Must Test | Target Coverage |
|-------|-----------|-----------------|
| Middleware | Every middleware | ≥ 95% statements, 100% functions |
| Routes | Every new route | ≥ 75% statements |
| Services | Every exported function | ≥ 80% statements |
| Utils | Every exported function | ≥ 90% statements |

## Required Test Cases for Every Route

```js
describe('POST /api/resource', () => {
  it('should return 201 on valid input');        // Happy path
  it('should return 401 without auth token');     // Auth check
  it('should return 400 when field is missing');  // Validation
  it('should return 404 when parent not found');  // Not found
  it('should return 403 when lacking permission');// AuthZ check
  it('should return 500 on database error');      // Error handling
});
```

## Required Test Cases for Every Middleware

```js
describe('middlewareName', () => {
  it('should call next() for valid request');     // Pass-through
  it('should return 401 for missing token');      // Block
  it('should return 403 for wrong role');         // Block
  it('should handle edge case (null/empty)');     // Edge
  it('should handle database error gracefully');  // Error
});
```

## Test File Pattern

```js
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Setup: create minimal Express app with just the route under test
const app = express();
app.use(express.json());
app.use('/api/resource', require('../../routes/resource'));

// Helper: generate test token
const generateToken = (user = { id: 1, role: 'student' }) =>
  jwt.sign(user, process.env.JWT_SECRET || 'test-secret');

describe('POST /api/resource', () => {
  it('should create resource', async () => {
    const res = await request(app)
      .post('/api/resource')
      .set('Authorization', `Bearer ${generateToken()}`)
      .send({ content: 'test' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
});
```

## Running Tests

```bash
npm test                    # All tests
npx jest __tests__/routes/  # Route tests only
npx jest --coverage         # With coverage
npx jest --watch            # Watch mode
```

## Forbidden

- ❌ Submitting new routes without tests
- ❌ `test.skip` without a documented reason
- ❌ Hardcoded secrets in test files
- ❌ Tests that depend on execution order (each test must be independent)
- ❌ Tests that mutate shared state between test cases
