import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

const BUILD_TIME = new Date().toISOString()

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'html-version',
      transformIndexHtml(html) {
        return html.replaceAll('%APP_VERSION%', pkg.version)
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 只把「首屏必加载」的共享第三方库拆成稳定 vendor chunk（利于长期缓存）。
        // ⚠️ 不要把 recharts / react-markdown 等「仅懒加载页面用」的库写进来——
        // Rolldown 会对 manualChunks 产出的每个 chunk 注入 modulepreload，等于把它们
        // 提前拉回首屏预载，反而拖慢启动。让它们自然留在各自的 lazy 分包里。
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('dexie')) return 'vendor-dexie'
          if (id.includes('date-fns')) return 'vendor-date'
          if (id.includes('react-router') || id.includes('@remix-run/router')) return 'vendor-router'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react'
        },
      },
    },
  },
})
