import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
