# 等 winlibs.zip 下完，自动解包 + 打包。
#
#   pwsh -File scripts\watch-and-build.ps1
#
# 设计成可以关掉终端再开：它只是轮询文件大小，直到达到 378,094,664 字节。
# 下载本身由后台 curl 负责，这个脚本不参与下载。

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$zip = Join-Path $env:USERPROFILE 'winlibs.zip'
$expected = 378094664

Write-Host '等待 winlibs.zip 下载完成…'
$lastPct = -1
while ($true) {
    if (-not (Test-Path $zip)) { Start-Sleep -Seconds 20; continue }
    $len = (Get-Item $zip).Length
    $pct = [math]::Floor($len / $expected * 100)
    if ($pct -ne $lastPct) {
        Write-Host "  $pct%  ($([math]::Round($len/1MB,1)) MB)"
        $lastPct = $pct
    }
    if ($len -ge $expected) { break }
    if (-not (Get-Process curl -ErrorAction SilentlyContinue)) {
        Start-Sleep -Seconds 15
        $len2 = (Get-Item $zip).Length
        if ($len2 -ge $expected) { break }
        Write-Host "curl 已退出但文件不完整（$([math]::Round($len2/1MB,1)) MB），重新续传…"
        $p = 'brechtsanders/winlibs_mingw/releases/download/14.2.0posix-19.1.1-12.0.0-ucrt-r2/winlibs-x86_64-posix-seh-gcc-14.2.0-llvm-19.1.1-mingw-w64ucrt-12.0.0-r2.zip'
        Start-Process -FilePath 'curl.exe' -ArgumentList @('-L','-sS','-C','-','-o',$zip,'--retry','5',"https://github.com/$p") -NoNewWindow
    }
    Start-Sleep -Seconds 20
}

Write-Host '下载完成，开始解包…'
& (Join-Path $PSScriptRoot 'unpack-mingw.ps1')
if ($LASTEXITCODE -ne 0) { Write-Host "unpack 退出码 $LASTEXITCODE"; exit $LASTEXITCODE }

Write-Host '开始打包…'
& (Join-Path $PSScriptRoot 'tauri-build.ps1')
exit $LASTEXITCODE
