// Compile the current Web checkout without production env files or credentials.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
createRequire(import.meta.url)('./network.cjs')([]);
for (const key of Object.keys(process.env)) if (key.startsWith('VITE_')) delete process.env[key];
const require = createRequire(path.join(root, 'frontend/package.json'));
const { build } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')).href);
const { default: tailwind } = await import(pathToFileURL(require.resolve('@tailwindcss/vite')).href);
const outDir = path.join(root, '.local/public-demo/dist');
await build({ root: path.join(root, 'frontend'), configFile: false, envDir: false,
  plugins: [react(), tailwind()],
  resolve: { alias: [
    { find: /^@capacitor\/browser$/, replacement: path.join(root, 'scripts/stage2-local/capacitor-browser.web.mjs') },
    { find: '@shared', replacement: path.join(root, 'shared') },
    { find: 'react', replacement: path.join(root, 'frontend/node_modules/react') },
    { find: '@tanstack/react-query', replacement: path.join(root, 'frontend/node_modules/@tanstack/react-query') },
  ] },
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''), 'import.meta.env.VITE_MATERIALS_PREVIEW_GATEWAY': JSON.stringify('0') },
  build: { outDir, emptyOutDir: false, sourcemap: false },
});
// Keep an always-visible way to switch between the two requested views.
const filename = path.join(outDir, 'index.html');
let html = fs.readFileSync(filename, 'utf8');
html = html.replace('<head>', `<head><script>localStorage.setItem('token','public-readonly-demo');localStorage.setItem('user',JSON.stringify({id:1,role:'admin',nickname:'演示管理员'}));sessionStorage.removeItem('skipLogin');</script>`);
html = html.replace('</body>', `<nav style="position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#172c29;color:white;padding:10px 18px;border-radius:24px;box-shadow:0 3px 18px #0004;font:13px system-ui;display:flex;gap:16px;align-items:center;white-space:nowrap"><span>只读演示</span><a style="color:white" href="/about">广场</a><a style="color:white" href="/myzone/admin/campus-news">快讯管理</a><a style="color:white" href="/myzone/admin/campus-news/new">发布编辑器</a></nav></body>`);
fs.writeFileSync(filename, html);
console.log('Public demo compiled into ignored .local/public-demo/dist.');
