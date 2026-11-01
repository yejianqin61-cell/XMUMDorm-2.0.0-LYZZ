import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sharedRoot = path.resolve(__dirname, '../shared')

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
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const previewGatewayUrl = env.PREVIEW_GATEWAY_URL?.trim()
  const previewGatewayToken = env.PREVIEW_GATEWAY_TOKEN?.trim()
  const previewGatewayOrigin = env.PREVIEW_GATEWAY_ORIGIN?.trim() || 'http://localhost:5173'
  const previewProxy = previewGatewayUrl && previewGatewayToken
    ? {
        '/api/preview': {
          target: previewGatewayUrl,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('X-Preview-Token', previewGatewayToken)
              proxyReq.setHeader('Origin', previewGatewayOrigin)
            })
          },
        },
      }
    : {}

  return {
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': sharedRoot,
      'react': path.resolve(__dirname, 'node_modules/react'),
      '@tanstack/react-query': path.resolve(__dirname, 'node_modules/@tanstack/react-query'),
    },
  },
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
    port: 5173,
    strictPort: true,
    host: true, // 允许局域网访问，便于手机通过电脑 IP 访问
    // 代理 /api 到后端，手机访问时请求同源 /api/* 会由 Vite 转发到本机后端
    proxy: {
      ...previewProxy,
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
  }
})
