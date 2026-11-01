'use strict';

// This parent never imports application modules, dotenv, Vite or database drivers.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const target = process.argv[2];
const allowedKeys = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];

function readConfig() {
  const filename = path.join(root, '.local/stage2/config.json');
  if (!fs.existsSync(filename)) throw new Error('Create .local/stage2/config.json from config.template.json first.');
  let config;
  try { config = JSON.parse(fs.readFileSync(filename, 'utf8')); }
  catch { throw new Error('Local configuration is not valid JSON; contents are never logged.'); }
  if (!config || Array.isArray(config) || typeof config !== 'object'
      || Object.keys(config).some(key => !allowedKeys.includes(key))) {
    throw new Error('Unexpected configuration keys; connection strings and extra settings are forbidden.');
  }
  if (config.DB_HOST !== '127.0.0.1' || config.DB_PORT !== 3306
      || config.DB_NAME !== 'xmumdorm_stage2_dev' || config.DB_USER !== 'xmumdorm_dev') {
    throw new Error('Database must be 127.0.0.1:3306 / xmumdorm_stage2_dev / xmumdorm_dev.');
  }
  for (const key of ['DB_PASSWORD', 'JWT_SECRET']) {
    if (typeof config[key] !== 'string' || !config[key].trim() || config[key].startsWith('REPLACE_')) {
      throw new Error(`Fill ${key} privately in the ignored local configuration.`);
    }
  }
  if (config.JWT_SECRET.length < 32) throw new Error('Local JWT_SECRET must contain at least 32 characters.');
  return config;
}

try {
  if (!['check', 'backend', 'frontend'].includes(target)) throw new Error('Usage: node scripts/stage2-local/launch.cjs check|backend|frontend');
  // Allow only OS/runtime essentials. Never inherit connection strings, VITE_*,
  // AWS credentials, proxy settings, NODE_OPTIONS or other application variables.
  const env = {};
  for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'Path', 'PATHEXT', 'TEMP', 'TMP', 'COMSPEC']) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  Object.assign(env, {
    NODE_ENV: 'development', STAGE2_LOCAL_ISOLATED: '1',
    HOST: '127.0.0.1', PORT: '4040', ENABLE_BACKGROUND_JOBS: '0',
    MATERIALS_ENABLED: '0', VITE_API_BASE_URL: '', VITE_MATERIALS_PREVIEW_GATEWAY: '0',
  });
  if (target !== 'frontend') {
    const config = readConfig();
    for (const key of allowedKeys) env[key] = String(config[key]);
  }
  if (target === 'check') {
    console.log('Configuration valid: fixed local database target; no connection or service was started.');
  } else {
    const file = target === 'backend' ? 'backend.cjs' : 'frontend.mjs';
    const child = spawn(process.execPath, [path.join(__dirname, file)], { cwd: root, env, stdio: 'inherit', windowsHide: true });
    child.on('error', () => { console.error('Could not start isolated child process.'); process.exitCode = 1; });
    child.on('exit', (code) => { process.exitCode = code === null ? 1 : code; });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
