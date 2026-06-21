import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function manualChunks(id) {
  if (!id.includes('node_modules')) return undefined
  if (
    id.includes('/react/') ||
    id.includes('\\react\\') ||
    id.includes('react-dom') ||
    id.includes('scheduler')
  ) {
    return 'react-core'
  }
  if (id.includes('react-router-dom')) return 'react-core'
  if (id.includes('@tanstack/react-query')) return 'query'
  if (id.includes('framer-motion')) return 'motion'
  if (id.includes('react-markdown') || id.includes('remark-gfm')) return 'markdown'
  if (id.includes('lucide-react')) return 'icons'
  return 'vendor'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Capacitor plugins are available at runtime in the WebView,
      // but not installed in frontend/node_modules. Vite should skip them.
      external: (id) => id.startsWith('@capacitor/'),
      output: {
        manualChunks,
      },
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
