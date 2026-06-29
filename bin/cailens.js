#!/usr/bin/env node

// CaILens — one-command launcher.
// Usage:   npx cailens                (always latest)
//          npm install -g cailens     (global install, then `cailens`)

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// Read version from package.json
let version = '3.23.0'
try {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
  version = pkg.version ?? version
} catch { /* fallback */ }

const server = spawn('npx', ['vite', '--host', '0.0.0.0', '--open'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' },
})

console.log(`\n  ✦ CaILens v${version}\n`)

server.on('exit', (code) => process.exit(code ?? 0))
