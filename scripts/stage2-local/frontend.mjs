import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (process.env.STAGE2_LOCAL_ISOLATED !== '1') throw new Error('Use the Stage 2 launcher.');
const require = createRequire(path.join(root, 'frontend/package.json'));
// Vite may proxy HTTP and HMR to itself; no remote TCP destinations are allowed.
createRequire(import.meta.url)('./network.cjs')([4040, 5173]);
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')).href);
const { default: tailwind } = await import(pathToFileURL(require.resolve('@tailwindcss/vite')).href);
const server = await createServer({
  root: path.join(root, 'frontend'), configFile: false, envDir: false,
  cacheDir: path.join(root, '.local/stage2/vite-cache'),
  plugins: [react(), tailwind(), {
    name: 'stage2-local-boundary',
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url, 'http://127.0.0.1:5173').pathname;
        if (/^\/api\/(preview|materials)(\/|$)/.test(pathname)) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ status: -1, message: 'Disabled in Stage 2 local mode' }));
        }
        next();
      });
    },
  }],
  resolve: { alias: [
    { find: /^@capacitor\/browser$/, replacement: path.join(root, 'scripts/stage2-local/capacitor-browser.web.mjs') },
    { find: '@shared', replacement: path.join(root, 'shared') },
    { find: 'react', replacement: path.join(root, 'frontend/node_modules/react') },
    { find: '@tanstack/react-query', replacement: path.join(root, 'frontend/node_modules/@tanstack/react-query') },
  ] },
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''), 'import.meta.env.VITE_MATERIALS_PREVIEW_GATEWAY': JSON.stringify('0') },
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true, open: false,
    fs: {
      allow: [root],
      // @shared requires workspace access; never expose ignored credentials
      // through Vite's /@fs/ endpoint while allowing that parent directory.
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.local/**'],
    },
    headers: { 'Content-Security-Policy': "default-src 'self'; connect-src 'self' ws://127.0.0.1:5173 http://127.0.0.1:4040; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; font-src 'self' data:; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
    proxy: {
      '/api': { target: 'http://127.0.0.1:4040', changeOrigin: true, ws: false },
      '/uploads': { target: 'http://127.0.0.1:4040', changeOrigin: true, ws: false },
    },
  },
});
await server.listen();
server.printUrls();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.close(); process.exit(0); });
