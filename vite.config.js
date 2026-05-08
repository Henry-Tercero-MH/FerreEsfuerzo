import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Plugin que inyecta el timestamp de build en sw.js para forzar detección de nueva versión
function injectSwVersion() {
  return {
    name: 'inject-sw-version',
    closeBundle() {
      const swPath = path.resolve('dist/sw.js')
      if (!fs.existsSync(swPath)) return
      let content = fs.readFileSync(swPath, 'utf-8')
      content = content.replace('esfuerzo-v2', `esfuerzo-${Date.now()}`)
      fs.writeFileSync(swPath, content)
    },
  }
}

export default defineConfig(({ mode }) => {
  // ELECTRON=true  → base './'  (rutas relativas, necesario para cargar desde archivo)
  // Sin ELECTRON   → base '/'   (rutas absolutas, correcto para Vercel / web)
  const isElectron = process.env.ELECTRON === 'true'

  // Leer .env para el proxy — así vite.config y el frontend usan siempre la misma URL
  const env = loadEnv(mode, process.cwd(), '')
  const gasUrl = env.VITE_APPS_SCRIPT_URL || ''
  let gasProxyPath = ''
  try { gasProxyPath = gasUrl ? new URL(gasUrl).pathname : '' } catch { /* sin URL */ }

  return {
  plugins: [react(), injectSwVersion()],
  base: isElectron ? './' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api/gas': {
        target: 'https://script.google.com',
        changeOrigin: true,
        rewrite: () => gasProxyPath,
        configure(proxy) {
          proxy.on('proxyRes', (proxyRes, req) => {
            const origin = req.headers.origin || ''
            const allowedOrigins = new Set([
              'http://localhost:5173',
              'http://127.0.0.1:5173',
              'http://localhost:4173',
              'http://127.0.0.1:4173',
            ])

            if (origin && allowedOrigins.has(origin)) {
              proxyRes.headers['access-control-allow-origin'] = origin
              proxyRes.headers['vary'] = 'Origin'
            } else {
              delete proxyRes.headers['access-control-allow-origin']
            }

            delete proxyRes.headers['access-control-allow-credentials']
          })
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react:  ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          icons:  ['lucide-react'],
        },
      },
    },
  },
  }
})
