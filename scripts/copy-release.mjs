import { readFileSync, copyFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const releaseDir = join(root, 'release');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node copy-release.mjs <tauri|android>');
  process.exit(1);
}

mkdirSync(releaseDir, { recursive: true });

function tauriVersion() {
  const conf = JSON.parse(readFileSync(join(root, 'src-tauri', 'tauri.conf.json'), 'utf-8'));
  return conf.version;
}

if (target === 'tauri') {
  const targetDir = join(root, 'src-tauri', 'target', 'release');
  const bundleDir = join(targetDir, 'bundle');
  const msiDir = join(bundleDir, 'msi');
  const nsisDir = join(bundleDir, 'nsis');

  let copied = 0;

  // Copy raw exe + DLLs (always needed alongside exe)
  for (const f of readdirSync(targetDir)) {
    if (f === 'CaILens.exe' || f.endsWith('.dll')) {
      copyFileSync(join(targetDir, f), join(releaseDir, f));
      console.log(`Copied ${f} → release/`);
      copied++;
    }
  }

  // Copy MSI and NSIS installer artifacts
  for (const dir of [msiDir, nsisDir]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.msi') || f.endsWith('.exe')) {
        copyFileSync(join(dir, f), join(releaseDir, f));
        console.log(`Copied ${f} → release/`);
        copied++;
      }
    }
  }
  if (copied === 0) {
    console.log('No Tauri build artifacts found. Run `npm run tauri:build` first.');
  } else {
    console.log(`Done — ${copied} file(s) copied to release/`);
  }
} else if (target === 'android') {
  const apkDir = join(root, 'android', 'app', 'build', 'outputs', 'apk');
  const debugApk = join(apkDir, 'debug', 'app-debug.apk');
  const releaseApk = join(apkDir, 'release', 'app-release.apk');

  let copied = 0;
  if (existsSync(debugApk)) {
    const dest = join(releaseDir, 'CaILens-android-debug.apk');
    copyFileSync(debugApk, dest);
    console.log(`Copied app-debug.apk → release/CaILens-android-debug.apk`);
    copied++;
  }
  if (existsSync(releaseApk)) {
    const dest = join(releaseDir, 'CaILens-android-release.apk');
    copyFileSync(releaseApk, dest);
    console.log(`Copied app-release.apk → release/CaILens-android-release.apk`);
    copied++;
  }
  if (copied === 0) {
    console.log('No APK found. Run `./gradlew assembleDebug` in android/ first.');
  } else {
    console.log(`Done — ${copied} file(s) copied to release/`);
  }
} else {
  console.error(`Unknown target: ${target}. Use "tauri" or "android".`);
  process.exit(1);
}
