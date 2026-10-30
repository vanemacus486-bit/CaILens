import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    hookTimeout: 60000,
    // 备份目录（src.backup-*）也带 __tests__，默认 include 会把它们算进来，
    // 每次跑测试等于跑两遍。显式排除，只测真正参与构建的 src/。
    exclude: ['**/node_modules/**', '**/dist/**', '**/src.backup-*/**', '**/src/../src.backup-*/**'],
  },
  bench: {
    hookTimeout: 120000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
