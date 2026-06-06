# /deploy-check

Run the pre-deployment checklist to verify readiness for production release.

## Usage
```
/deploy-check
```

## Workflow
1. Run `npm test` — Verify all tests pass
2. Check all migrations applied: `node scripts/run-incremental-migrations.js`
3. Verify environment variables against `.env.example`
4. Check security configuration (helmet, rate-limit, CORS)
5. Verify file upload directory exists and is writable
6. Write deployment readiness report to `docs/09-Deploy/deploy-check-<date>.md`

## Checklist
- [ ] All tests pass (108/108 expected)
- [ ] All migrations applied
- [ ] `.env` configured with production values
- [ ] `JWT_SECRET` set (≥ 32 chars)
- [ ] `DATABASE_URL` points to production
- [ ] `PUBLIC_ASSET_BASE_URL` configured
- [ ] `NODE_ENV=production`
- [ ] Rate limiting enabled
- [ ] Helmet security headers active
- [ ] CORS whitelist configured
- [ ] Upload directory writable
- [ ] Database backup completed
- [ ] Rollback plan documented

## Exit Codes
- **PASS** — Safe to deploy
- **WARN** — Non-blocking issues found (document them)
- **FAIL** — Do NOT deploy (fix issues first)
