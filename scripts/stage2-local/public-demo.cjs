'use strict';
// Read-only public gateway: static build only; no Vite, source files or passwords.
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const dist = path.join(root, '.local/public-demo/dist');
const upstream = 'http://127.0.0.1:4040';
let token, expires = 0;
async function session() {
  if (token && Date.now() < expires) return token;
  const accounts = JSON.parse(fs.readFileSync(path.join(root, '.local/stage2/integration-01e/credentials.json'), 'utf8'));
  const account = accounts.admin;
  if (account.username !== 'stage2_test_admin_01e') throw new Error('Unexpected demo identity');
  const response = await fetch(upstream + '/api/auth/login', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: account.username, password: account.password }), signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  if (!response.ok || !body.token) throw new Error('Demo login unavailable');
  token = body.token; expires = Date.now() + 20 * 60 * 1000;
  return token;
}
const allowed = pathname => /^\/api\/admin\/campus-news(?:\/|$)/.test(pathname)
  || /^\/api\/campus-news(?:\/|$)/.test(pathname)
  || /^\/api\/square\/campus-(?:feed|posts\/[1-9]\d*(?:\/comments(?:\/[1-9]\d*\/replies)?|\/interactions)?)$/.test(pathname)
  || /^\/api\/users\/me(?:\/terms)?$/.test(pathname)
  || /^\/api\/academic-directory\/colleges(?:\/[a-z0-9-]+\/programmes)?$/.test(pathname)
  || /^\/uploads\/[a-zA-Z0-9_./-]+$/.test(pathname);
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'self'");
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(403).json({ status: -1, code: 'DEMO_READ_ONLY', message: '这是只读演示站点，可查看页面与编辑表单，不能保存或发布。' });
  const raw = req.originalUrl.split('?')[0];
  let pathname;
  try { pathname = decodeURIComponent(raw); } catch { return res.sendStatus(400); }
  if (pathname.includes('..') || pathname.includes('\\') || pathname.includes('//') || /%[0-9a-f]{2}/i.test(pathname)) return res.sendStatus(400);
  if (/^\/api(?:\/|$)/i.test(pathname) || pathname.startsWith('/uploads/')) {
    if (!allowed(pathname)) return res.status(503).json({ status: -1, message: '此演示入口仅开放校园快讯相关页面。' });
    return (async () => {
      const authorization = await session();
      const response = await fetch(upstream + req.originalUrl, { headers: { Authorization: `Bearer ${authorization}` }, signal: AbortSignal.timeout(20000), redirect: 'error' });
      res.status(response.status);
      res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
      res.send(Buffer.from(await response.arrayBuffer()));
    })().catch(() => res.status(503).json({ status: -1, message: '本地演示服务暂不可用，请稍后重试。' }));
  }
  next();
});
app.get('/demo-health', (_req, res) => res.json({ status: 'ok', mode: 'read-only', scope: 'local-test-campus-news' }));
app.use(express.static(dist, { dotfiles: 'deny', index: false }));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
session().then(() => app.listen(8787, '127.0.0.1', () => console.log('Read-only demo: http://127.0.0.1:8787/about')))
  .catch(() => { console.error('Cannot authenticate isolated demo administrator; gateway not started.'); process.exitCode = 1; });
