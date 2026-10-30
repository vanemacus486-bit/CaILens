# 为 Tauri / GNU 构建准备环境（只影响当前进程树，不改系统 PATH）。
#
#   . .\scripts\build-env.ps1
#   npm run tauri:build
#
# 本机现状（2026-10-29 实测）：Rust 只有 rustup 装的 stable-x86_64-pc-windows-gnu，
# 没有 MSVC Build Tools。windows-gnu target 需要真正的 MinGW：
#   - rustup 的 self-contained 里那个 gcc.exe 只是链接器壳子，没有 sysroot 库
#     （crt2.o / crtbegin.o / libkernel32.a 全缺），不能当编译器用
#   - 它的 dlltool.exe 内部还要 as.exe，同样不存在
# 所以 MinGW 取自 WinLibs（%USERPROFILE%\winlibs\mingw64），由
# scripts/fetch-mingw.ps1 + scripts/unpack-mingw.ps1 装好。
#
# ⚠️ PATH 顺序是关键：必须让真 MinGW 排在 rustup 的 self-contained 之前，
# 否则 `x86_64-w64-mingw32-gcc` 会命中那个没有库的假货，链接报
# `ld: cannot find crt2.o / -lkernel32`。
# 本文件**不把 self-contained 加进 PATH**，彻底避免这个歧义。

$ErrorActionPreference = 'Stop'

$cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
$mingwBin = Join-Path $env:USERPROFILE 'winlibs\mingw64\bin'

# 从尾部追加，保证最后处理的项排在最前；这里只需 mingwBin 最优先
foreach ($p in @($cargoBin, $mingwBin)) {
    if (-not (Test-Path $p)) { continue }
    $parts = @($env:PATH -split ';' | Where-Object { $_ -and $_ -ne $p })
    $env:PATH = ($parts + $p) -join ';'
}

if (Test-Path "$mingwBin\gcc.exe") {
    $gcc = Join-Path $mingwBin 'gcc.exe'
    $env:CC_x86_64_pc_windows_gnu = $gcc
    $env:CXX_x86_64_pc_windows_gnu = Join-Path $mingwBin 'g++.exe'
    $env:AR_x86_64_pc_windows_gnu = Join-Path $mingwBin 'ar.exe'
    # cc-rs 与 ring 的 build.rs 有时读无前缀变量，一并设上
    $env:CC = $gcc
    $env:AR = $env:AR_x86_64_pc_windows_gnu
}

Write-Host "mingw gcc    : $mingwBin $(if (Test-Path "$mingwBin\gcc.exe") { 'OK' } else { 'MISSING' })"
Write-Host "mingw windres: $(if (Test-Path "$mingwBin\windres.exe") { 'OK' } else { 'MISSING' })"
Write-Host "mingw dlltool: $(if (Test-Path "$mingwBin\dlltool.exe") { 'OK' } else { 'MISSING' })"
Write-Host "cargo        : $(if (Test-Path "$cargoBin\cargo.exe") { 'OK' } else { 'MISSING' })"
Write-Host "gcc resolves : $((Get-Command x86_64-w64-mingw32-gcc -ErrorAction SilentlyContinue).Source)"
Write-Host "CC override  : $(if ($env:CC_x86_64_pc_windows_gnu) { $env:CC_x86_64_pc_windows_gnu } else { '(未设置)' })"
