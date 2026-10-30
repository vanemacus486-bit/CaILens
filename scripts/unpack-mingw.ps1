# 解包已下载的 winlibs.zip，并把 gcc/bin 路径报出来。
#
# 前置：winlibs.zip 已完整下载（378,094,664 字节）。
# 用法：pwsh -File scripts\unpack-mingw.ps1

$ErrorActionPreference = 'Stop'
$zip = Join-Path $env:USERPROFILE 'winlibs.zip'
$dest = Join-Path $env:USERPROFILE 'winlibs'

if (-not (Test-Path $zip)) { Write-Host "缺少 $zip"; exit 1 }
$len = (Get-Item $zip).Length
$expected = 378094664
Write-Host "zip 大小: $len / $expected"
if ($len -lt $expected) { Write-Host "下载未完成（差 $($expected - $len) 字节），继续等"; exit 2 }

if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
Write-Host '解包中（约 1-2 分钟）…'
Expand-Archive -Path $zip -DestinationPath $dest -Force

$gcc = Get-ChildItem $dest -Recurse -Filter 'gcc.exe' | Select-Object -First 1
if (-not $gcc) { Write-Host '解包后找不到 gcc.exe'; exit 3 }

$bin = $gcc.DirectoryName
Write-Host "gcc: $($gcc.FullName)"
Write-Host "bin: $bin"

# 冒烟测试：这个 gcc 必须能真的编译 C，而不只是当链接器
$tmp = Join-Path $env:TEMP 'mingw-smoke'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
'#include <stdio.h>`nint main(void){puts("ok");return 0;}' | Set-Content "$tmp\t.c" -Encoding ascii
& $gcc.FullName "$tmp\t.c" -o "$tmp\t.exe" 2>&1 | Select-Object -First 10
if ($LASTEXITCODE -ne 0) { Write-Host "gcc 编译失败，exit=$LASTEXITCODE"; exit 4 }
$out = & "$tmp\t.exe" 2>&1
Write-Host "冒烟测试输出: $out"
if ($out -ne 'ok') { Write-Host '冒烟测试输出不符'; exit 5 }

Write-Host "OK — MinGW 可用，把 $bin 加进 PATH 即可编译 ring 等含 C 代码的 crate。"
