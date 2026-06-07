import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Capacitor plugins are available at runtime in the WebView,
      // but not installed in frontend/node_modules. Vite should skip them.
      external: (id) => id.startsWith('@capacitor/'),
    },
  },
  server: {
    host: true, // 允许局域网访问，便于手机通过电脑 IP 访问
    // 代理 /api 到后端，手机访问时请求同源 /api/* 会由 Vite 转发到本机后端
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4040',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:4040',
        changeOrigin: true,
      },
    },
  },
})
