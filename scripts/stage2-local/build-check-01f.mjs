// In-memory build check. No original Vite config/env, server or remote access.
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
createRequire(import.meta.url)('./network.cjs')([]);
for(const key of Object.keys(process.env)) if(key.startsWith('VITE_')) delete process.env[key];
const require=createRequire(path.join(root,'frontend/package.json'));
const {build}=await import(pathToFileURL(require.resolve('vite')).href);
const {default:react}=await import(pathToFileURL(require.resolve('@vitejs/plugin-react')).href);
const {default:tailwind}=await import(pathToFileURL(require.resolve('@tailwindcss/vite')).href);
const result=await build({root:path.join(root,'frontend'),configFile:false,envDir:false,cacheDir:path.join(root,'.local/stage2/build-cache-01f'),plugins:[react(),tailwind()],resolve:{alias:[
  {find:/^@capacitor\/browser$/,replacement:path.join(root,'scripts/stage2-local/capacitor-browser.web.mjs')},
  {find:'@shared',replacement:path.join(root,'shared')},
  {find:'react',replacement:path.join(root,'frontend/node_modules/react')},
  {find:'@tanstack/react-query',replacement:path.join(root,'frontend/node_modules/@tanstack/react-query')},
]},define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify(''),'import.meta.env.VITE_MATERIALS_PREVIEW_GATEWAY':JSON.stringify('0')},build:{write:false,outDir:path.join(root,'.local/stage2/build-01f'),emptyOutDir:false}});
console.log(`Isolated in-memory build passed: ${(Array.isArray(result)?result:[result]).reduce((n,r)=>n+r.output.length,0)} outputs; nothing deployed.`);
