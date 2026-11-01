'use strict';
// Opt-in local transport faults only. Never fabricates favorite state or content.
const fs = require('node:fs');
const path = require('node:path');
const control = path.resolve(__dirname, '../../.local/stage5/batch05c/run-02/read-fault.json');
module.exports = function campusFavoriteTest(req, res, next) {
  if (process.env.STAGE2_LOCAL_ISOLATED !== '1' || !fs.existsSync(control)) return false;
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(control, 'utf8')); } catch { return false; }
  if (cfg.path !== req.path) return false;
  if (cfg.mode === 'lost-write-response' && ['PUT', 'DELETE'].includes(req.method)) {
    const json = res.json.bind(res);
    res.json = payload => payload.status === 0 ? json.call(res.status(503), { status: -1, message: '本地验收：保存响应丢失，请核对状态' }) : json(payload);
    return false;
  }
  if (req.method !== 'GET') return false;
  if (cfg.mode === 'error') { res.status(503).json({ status: -1, message: '本地验收：网络暂不可用' }); return true; }
  if (cfg.mode === 'delay') { setTimeout(next, 10000); return true; }
  return false;
};
