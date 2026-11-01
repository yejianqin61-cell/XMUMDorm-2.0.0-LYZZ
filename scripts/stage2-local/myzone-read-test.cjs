'use strict';
// Optional, local-only transport fault fixture. No data or business handler mocks.
const fs = require('node:fs');
const path = require('node:path');
const control = path.resolve(__dirname, '../../.local/stage5/batch05b/run-02/read-fault.json');
module.exports = function readTest(req, res, next) {
  if (process.env.STAGE2_LOCAL_ISOLATED !== '1' || !fs.existsSync(control)) return false;
  let config;
  try { config = JSON.parse(fs.readFileSync(control, 'utf8')); } catch { return false; }
  if (config.path !== req.path || !['delay', 'error'].includes(config.mode)) return false;
  if (config.mode === 'error') res.status(503).json({ status: -1, message: '本地验收：连接暂时不可用' });
  else setTimeout(next, Math.min(10000, Math.max(0, Number(config.delayMs) || 5000)));
  return true;
};
