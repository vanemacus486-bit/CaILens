# 收尾：对齐 NPM 侧 tauri 包版本 → 打包桌面 exe。
#
#   pwsh -File scripts\finish-build.ps1
#
# 背景：tauri CLI 会校验 NPM 包与 Rust crate 的 major.minor 一致。
# 本仓库 Rust 侧是 tauri 2.11.0 + 各插件，NPM 侧被装成了更新的 2.12/2.14/2.8，
# 于是 `tauri build` 第一步就 Error 退出。
#
# 做法：把 NPM 侧降到与 Rust 侧同 minor 的**最高**版本（能精确对上就精确对上）。
# 升 Rust 侧反而要重下 crate，且新 crate 又可能带来新的 minor 漂移。

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    $pins = @(
        '@tauri-apps/api@2.11.1'
        '@tauri-apps/plugin-updater@2.10.1'
        '@tauri-apps/plugin-dialog@2.7.3'
        '@tauri-apps/plugin-http@2.5.9'
        '@tauri-apps/plugin-process@2.3.1'
        '@tauri-apps/plugin-notification@2.3.3'
        '@tauri-apps/plugin-opener@2.5.5'
    )

    Write-Host '=== 安装对齐版本 ==='
    & npm install --save-exact @pins 2>&1 | Select-Object -Last 20
    Write-Host "NPM_INSTALL_EXIT=$LASTEXITCODE"
    if ($LASTEXITCODE -ne 0) { Write-Host 'npm install 失败'; exit 1 }

    Write-Host '=== 构建环境 ==='
    . (Join-Path $PSScriptRoot 'build-env.ps1')

    Get-Process CaILens -ErrorAction SilentlyContinue | Stop-Process -Force

    Write-Host '=== 打包 ==='
    & npm run tauri:build 2>&1 | Tee-Object -FilePath (Join-Path $root 'build-tauri.log')
    $code = $LASTEXITCODE
    Write-Host "TAURI_EXIT=$code"

    $rel = Join-Path $root 'release'
    if (Test-Path $rel) {
        Get-ChildItem $rel | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
    } else {
        Write-Host 'release/ 未生成'
    }
    exit $code
}
finally {
    Pop-Location
}
