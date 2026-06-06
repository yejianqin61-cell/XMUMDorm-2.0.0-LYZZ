# /code-review

Run a comprehensive code review against the current changes.

## Usage
```
/code-review
```

## Workflow
1. Read `docs/00-Constitution/` — Check alignment with principles
2. Read `.claude/rules/` — Check compliance with coding rules
3. Read `docs/00-Constitution/安全策略.md` — Check security
4. Review changed files for:
   - Security issues (SQL injection, XSS, missing auth)
   - Performance issues (N+1 queries, missing indexes)
   - Code quality (naming, structure, error handling)
   - Test coverage gaps
5. Write findings to `docs/06-Analyze/code-review-<date>.md`

## Check Categories
- [ ] Security — Auth bypass, SQL injection, XSS, input validation
- [ ] Performance — N+1 queries, missing indexes, unnecessary re-renders
- [ ] Database — Migration discipline, parameterized queries, logical delete
- [ ] Testing — New routes have tests, edge cases covered
- [ ] Code Quality — Naming, error handling, logging
