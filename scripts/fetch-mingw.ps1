# 下载并解包 WinLibs MinGW（无管理员权限路径）
$ErrorActionPreference = 'Stop'
$url = 'https://github.com/brechtsanders/winlibs_mingw/releases/download/14.2.0posix-19.1.1-12.0.0-ucrt-r2/winlibs-x86_64-posix-seh-gcc-14.2.0-llvm-19.1.1-mingw-w64ucrt-12.0.0-r2.zip'
$zip = Join-Path $env:USERPROFILE 'winlibs.zip'
$dest = Join-Path $env:USERPROFILE 'winlibs'

if (Test-Path $zip) { Remove-Item $zip -Force }
Write-Host "downloading $url"
$sw = [Diagnostics.Stopwatch]::StartNew()
& curl.exe -L --retry 3 --connect-timeout 30 -o $zip $url
$code = $LASTEXITCODE
$sw.Stop()
Write-Host "curl_exit=$code elapsed_s=$([math]::Round($sw.Elapsed.TotalSeconds))"
if ($code -ne 0) { exit $code }
$len = (Get-Item $zip).Length
Write-Host "zip_mb=$([math]::Round($len/1MB,1))"
if ($len -lt 50MB) { Write-Host 'zip too small, abort'; exit 2 }

if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
Write-Host 'expanding...'
Expand-Archive -Path $zip -DestinationPath $dest -Force
$gcc = Get-ChildItem $dest -Recurse -Filter gcc.exe | Select-Object -First 1
if (-not $gcc) { Write-Host 'gcc not found after expand'; exit 3 }
Write-Host "gcc=$($gcc.FullName)"
Write-Host "bin=$($gcc.DirectoryName)"
