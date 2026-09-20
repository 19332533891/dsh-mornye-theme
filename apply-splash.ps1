# apply-splash.ps1 — 把「莫宁启动画面」投放进 DSH Desktop 安装目录
#
# 为什么需要它：开屏页是应用自带的静态文件（<DSH>\resources\splash.html），**桌面端升级会覆盖掉**。
# 升级后重跑一次本脚本即可恢复。
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File .\apply-splash.ps1
#   powershell -ExecutionPolicy Bypass -File .\apply-splash.ps1 -ResourcesDir "D:\ds\DSH Desktop\resources"
#
# 会用到的环境变量（都可选）：
#   DSH_RESOURCES_DIR   安装目录里的 resources 路径（默认 D:\ds\DSH Desktop\resources）
#   DSH_MORNYE_WALLPAPER 壁纸视频；给了就一并复制进 resources 并在开屏页里指向它
param(
  [string]$ResourcesDir = $(if ($env:DSH_RESOURCES_DIR) { $env:DSH_RESOURCES_DIR } else { 'D:\ds\DSH Desktop\resources' })
)

$ErrorActionPreference = 'Stop'

$root    = $PSScriptRoot
$assets  = Join-Path $root 'assets'
$splash  = Join-Path $assets 'splash.mornye.html'
$target  = Join-Path $ResourcesDir 'splash.html'
$video   = if ($env:DSH_MORNYE_WALLPAPER) { $env:DSH_MORNYE_WALLPAPER } else { Join-Path $assets 'wallpaper.mp4' }

if (-not (Test-Path $ResourcesDir)) { throw "resources 目录不存在：$ResourcesDir（用 -ResourcesDir 指定）" }
if (-not (Test-Path $splash))       { throw "找不到开屏页模板：$splash" }

# 1) 先把现有 splash.html 备份（只在还没有备份时备份，避免把原生版覆盖掉）
$backup = Join-Path $ResourcesDir 'splash.stock.html'
if ((Test-Path $target) -and -not (Test-Path $backup)) {
  Copy-Item $target $backup
  Write-Output "[ok] 已备份原开屏页 -> $backup"
}

# 2) 决定视频来源：给了壁纸就复制进 resources，否则用相对路径 ../wallpaper.mp4
if (Test-Path $video) {
  $dest = Join-Path $ResourcesDir 'wallpaper.mp4'
  if ((Resolve-Path $video).Path -ne (Join-Path $ResourcesDir 'wallpaper.mp4')) {
    Copy-Item $video $dest -Force
  }
  $src = 'wallpaper.mp4'
  Write-Output "[ok] 壁纸视频 -> $dest"
} else {
  $src = '../wallpaper.mp4'
  Write-Output "[warn] 没找到壁纸视频（$video）：开屏页会指向 $src，请自行把视频放到该位置，"
  Write-Output "       或设置 DSH_MORNYE_WALLPAPER 指向你的 mp4 后重跑本脚本。"
}

# 3) 写 splash.html（UTF-8 无 BOM；带 BOM 的话 HTML 仍能解析，但保持一致更省心）
$html = [System.IO.File]::ReadAllText($splash, [System.Text.Encoding]::UTF8)
$html = $html.Replace('__WALLPAPER_SRC__', $src)
[System.IO.File]::WriteAllText($target, $html, (New-Object System.Text.UTF8Encoding($false)))

Write-Output "[ok] 启动画面已应用：$target"
Write-Output "     下次启动 DSH Desktop 生效（不需要重启当前进程）。"
