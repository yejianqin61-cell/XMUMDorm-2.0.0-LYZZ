/**
 * 共享测试辅助（纯 helper，不含 jest.mock）
 */
const express = require('express');

function createApp(router, mountPath = '/api') {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  app.use((err, _req, res, _next) => {
    if (res.headersSent) return;
    res.status(500).json({ status: -1, message: err.message || 'Internal error' });
  });
  return app;
}

function count(n) { return [{ c: n }]; }
function total(n) { return [{ total: n }]; }
function rows(...arr) { return arr; }
function row(obj) { return [obj]; }
function inserted(id) { return { insertId: id, affectedRows: 1 }; }
function affected(n = 1) { return { affectedRows: n }; }
function empty() { return []; }

module.exports = { createApp, count, total, rows, row, inserted, affected, empty };
