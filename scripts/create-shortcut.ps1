# 在桌面创建 CaILens 快捷方式。
#
#   pwsh -File scripts\create-shortcut.ps1
#
# 关键点：**工作目录必须设成 release/**。绿色版 CaILens.exe 启动时要找同目录的
# WebView2Loader.dll，工作目录不对会直接闪退（双击 exe 时 Windows 自动用它所在目录，
# 但通过快捷方式启动时用的是快捷方式里写的工作目录，默认是别处）。
#
# 图标：exe 里没有嵌入 Tauri 图标（打包时 createUpdaterArtifacts=false 跳过了资源嵌入），
# 所以 IconLocation 指向 exe 自己只会得到系统默认图标。这不影响功能。

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$exe = Join-Path $root 'release\CaILens.exe'
$workDir = Join-Path $root 'release'

if (-not (Test-Path $exe)) {
    Write-Host "找不到 $exe —— 先跑 scripts\finish-build.ps1 打包"
    exit 1
}
if (-not (Test-Path (Join-Path $workDir 'WebView2Loader.dll'))) {
    Write-Host "警告：$workDir 里没有 WebView2Loader.dll，启动会失败"
}

# 兼容 OneDrive 重定向的桌面
$desktop = [Environment]::GetFolderPath('Desktop')
if (-not (Test-Path $desktop)) { Write-Host "桌面路径不存在: $desktop"; exit 1 }

$lnkPath = Join-Path $desktop 'CaILens.lnk'
$hadOld = Test-Path $lnkPath

$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($lnkPath)
$lnk.TargetPath = $exe
$lnk.WorkingDirectory = $workDir
$lnk.IconLocation = "$exe,0"
$lnk.Description = 'CaILens — 本地优先的时间记录工具'
$lnk.Save()
[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell)

if (Test-Path $lnkPath) {
    $item = Get-Item $lnkPath
    Write-Host "$(if ($hadOld) { '已覆盖' } else { '已创建' })：$lnkPath"
    Write-Host "  目标：$exe"
    Write-Host "  工作目录：$workDir"
} else {
    Write-Host '创建失败'
    exit 1
}
