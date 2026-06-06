---
name: testing
description: Write and run Jest + Supertest tests for backend. Verify implementations against acceptance criteria. Generate test reports.
---

# Testing

## Purpose
Write and execute tests for XMUMDorm. Verify that implementations meet acceptance criteria. Generate structured test reports.

## When to Use
- After implementing a new backend route
- Adding new middleware
- QA phase: verifying all tasks are complete
- User asks "test this" or "write tests"
- Pre-deploy verification

## Workflow Stage
`08-Test` (QA)

## Inputs
- `docs/07-Implement/` — What was implemented
- `docs/05-Tasks/` — Acceptance criteria
- `docs/01-Requirement/` — Original requirements
- Source code: `routes/`, `middleware/`, `services/`

## Outputs
- `__tests__/routes/<module>.test.js` — Integration tests
- `__tests__/middleware/<name>.test.js` — Middleware tests
- `docs/08-Test/<feature>-test-report.md` — Test report

## Test Patterns

### Route Test
```js
const request = require('supertest');
const app = require('express')();
app.use(express.json());
app.use('/api/resource', require('../../routes/resource'));

describe('GET /api/resource', () => {
  it('returns 200 with paginated data', async () => {
    const res = await request(app).get('/api/resource');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/resource').send({});
    expect(res.status).toBe(401);
  });
});
```

### Required Test Cases Per Route
1. ✅ Happy path (200/201)
2. ❌ No auth (401)
3. ❌ Missing field (400)
4. ❌ Not found (404)
5. ❌ No permission (403)
6. 💥 Server error (500)

## Running Tests
```bash
npm test                    # All
npx jest --coverage         # With coverage
npx jest __tests__/routes/  # Specific
```
