import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
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
    },
  },
])
