import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

const BUILD_TIME = new Date().toISOString()

export default defineConfig({
  base: './',
  // ⚠️ Vite 的 watcher 不读 .gitignore，只认这里的 ignored。
  // src-tauri/target 里是 Rust 构建产物（8500+ 文件 / 4GB），tauri build 期间
  // 每个 .rlib/.exe 落地都会触发一次 HMR 重编译，叠加 tailwindcss v4 的全项目
  // 扫描，会让 Vite 单线程空转到 120% 以上，CPU 温度直冲风扇起转点。
  server: {
    watch: {
      ignored: [
        '**/src-tauri/target/**',
        '**/dist/**',
        '**/release/**',
        '**/.backup*/**',
        '**/src.backup*/**',
        '**/*.log',
      ],
    },
  },
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
          // zustand 必须单独成 vendor：store 模块顶层就调 create()，若 zustand 留在
          // 入口大 chunk 会与各 store 分包形成循环引用，求值顺序翻车时 create 尚未
          // 初始化 → 启动白屏(TypeError: r is not a function)。
          if (id.includes('zustand')) return 'vendor-state'
          if (id.includes('dexie')) return 'vendor-dexie'
          if (id.includes('date-fns')) return 'vendor-date'
          if (id.includes('react-router') || id.includes('@remix-run/router')) return 'vendor-router'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react'
        },
      },
    },
  },
})
