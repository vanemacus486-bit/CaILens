# 一键打包桌面 exe。
#
#   pwsh -File scripts\tauri-build.ps1
#
# 前置（本机已就位，见 scripts/build-env.ps1 的注释）：
#   - rustup + stable-x86_64-pc-windows-gnu
#   - MinGW 在 %USERPROFILE%\winlibs\mingw64
#
# 顺序：注入环境 → 关掉运行中的 App → npm run tauri:build → 核实 release/ 产物。

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    . (Join-Path $PSScriptRoot 'build-env.ps1')

    $gcc = Join-Path $env:USERPROFILE 'winlibs\mingw64\bin\gcc.exe'
    if (-not (Test-Path $gcc)) {
        Write-Host '缺 MinGW：先跑 scripts\fetch-mingw.ps1 再跑 scripts\unpack-mingw.ps1'
        exit 1
    }

    Get-Process CaILens -ErrorAction SilentlyContinue | Stop-Process -Force

    $log = Join-Path $root 'build-tauri.log'
    Write-Host "开始打包，日志：$log"
    & npm run tauri:build 2>&1 | Tee-Object -FilePath $log
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
