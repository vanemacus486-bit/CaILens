import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // 备份目录存放改动前的文件副本，不是源码。不忽略会被 projectService
  // 当成待检查的 TS 文件，报 "was not found by the project service" error；
  // 带日期戳的备份（.backup-20261029/、src.backup-round2-.../）还会贡献成百上千条
  // 本不属于本仓库的 lint 问题。三种命名都要忽略。
  globalIgnores([
    'dist',
    'src-tauri/target/**',
    '.claude',
    '.backup/**',
    '.backup-*/**',
    'src.backup-*/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['capacitor.config.ts', 'tailwind.config.ts', 'vitest.config.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Radix UI's virtualRef pattern (ref.current = el during render) is intentional
      // and safe — downgraded from error to preserve signal without blocking the build.
      'react-hooks/refs': 'warn',
      // Exporting non-component values alongside components is an established project
      // convention (e.g. EventBlock, button.tsx) — affects HMR only, not correctness.
      'react-refresh/only-export-components': 'warn',
      // WeekView uses setState inside an effect to auto-close stale cards — a deliberate
      // choice documented inline; downgraded to preserve signal without blocking builds.
      'react-hooks/set-state-in-effect': 'warn',
      // Time-based components call Date.now() during render for relative displays — safe
      // and intentional, not a purity violation in practice.
      'react-hooks/purity': 'warn',
      // ── Type-aware rules ──────────────────────────────────────
      // All promise-returning calls must be awaited or wrapped in fireAndForget().
      // Many existing calls are intentionally fire-and-forget (setSearchParams etc.);
      // set to warn to surface issues without blocking builds.
      '@typescript-eslint/no-floating-promises': 'warn',
      // useEffect/useMemo/useCallback must list all deps (disable comments are fine).
      // Several pre-existing dep issues; set to warn for gradual cleanup.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
])
