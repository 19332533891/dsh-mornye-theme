# install.ps1 — 一键把「莫宁」皮肤装进 DSH Desktop（Windows）
#
# 用法（在解压出来的 dsh-mornye-theme 目录里执行）：
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
#
# 可选参数：
#   -PluginDir <路径>   插件最终目录（默认 %APPDATA%\dsh-desktop\harness\profiles\web\local-plugins\dsh-mornye-theme）
#   -Download           忽略当前目录，自动下载 GitHub Release 的 zip（约 21MB）
#
# 它会做四件事，每步都会打印结果：
#   1) 定位 profile 目录（找不到就报错并告诉你怎么办）
#   2) 把插件文件放到 local-plugins\dsh-mornye-theme 并校验壁纸视频完整
#   3) 安全改写 profile 的 package.json（JSON 解析后写回，先备份）
#   4) 建 node_modules 下的 junction（不是复制文件）
# 最后提示重启 DSH Desktop。
#
# 注意：只用 Windows 自带 PowerShell + 宿主 Node 自带能力，不需要 git / pnpm。

[CmdletBinding()]
param(
  [string]$PluginDir,
  [switch]$Download
)

$ErrorActionPreference = 'Stop'
$EXPECT_VIDEO_BYTES = 20629262
# Download strategy: ask the GitHub API for the latest release first (so new versions work
# without editing this script), then fall back to this known-good URL.
$REPO_ZIP = 'https://github.com/eraerkni/dsh-mornye-theme/releases/download/v0.1.2/dsh-mornye-theme-v0.1.2.zip'
$LATEST_API = 'https://api.github.com/repos/eraerkni/dsh-mornye-theme/releases/latest'
$NAME = 'dsh-mornye-theme'

function Info($m) { Write-Host "[ok]   $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[warn] $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "[fail] $m" -ForegroundColor Red; exit 1 }

function Get-LatestZipUrl {
  try {
    $r = Invoke-WebRequest -Uri $LATEST_API -UseBasicParsing -Headers @{ 'User-Agent' = 'mornye-installer' } -TimeoutSec 30
    $m = [regex]::Match($r.Content, '"browser_download_url"\s*:\s*"([^"]+\.zip)"')
    if ($m.Success) { return $m.Groups[1].Value }
  } catch {
    Warn "querying latest release failed, using built-in URL: $($_.Exception.Message)"
  }
  return $null
}

Write-Host "=== 莫宁皮肤 安装脚本 ===" -ForegroundColor Cyan

# ---------- 1) 定位 profile ----------
$web = Join-Path $env:APPDATA 'dsh-desktop\harness\profiles\web'
if (-not (Test-Path $web)) {
  Die "找不到 DSH 的 profile 目录：$web`n       请确认已安装 DSH Desktop，或用 -PluginDir 手动指定插件目录。"
}
$profilePkg = Join-Path $web 'package.json'
if (-not (Test-Path $profilePkg)) { Die "profile 缺少 package.json：$profilePkg" }
if (-not $PluginDir) { $PluginDir = Join-Path $web "local-plugins\$NAME" }
Info "profile = $web"
Info "插件目录 = $PluginDir"

# ---------- 2) 取文件 / 校验 ----------
$src = $PSScriptRoot
$needCopy = $true
if ($Download -or -not (Test-Path (Join-Path $src 'package.json'))) {
  $tmp = Join-Path $env:TEMP ("mornye-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  $zip = Join-Path $tmp 'pkg.zip'
  $url = Get-LatestZipUrl
  if (-not $url) { $url = $REPO_ZIP }
  Write-Host "       下载 Release zip（约 21MB）：$url"
  try {
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  } catch {
    Die "下载失败：$($_.Exception.Message)`n       可改用 git clone 后重跑本脚本（不要加 -Download）。"
  }
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  $src = Join-Path $tmp $NAME
  if (-not (Test-Path (Join-Path $src 'package.json'))) {
    $inner = Get-ChildItem $tmp -Directory | Select-Object -First 1
    if ($inner) { $src = $inner.FullName }
  }
  Info "已下载并解压到临时目录"
}

if ((Resolve-Path $src).Path -ne (Join-Path $PluginDir '').TrimEnd('\')) {
  New-Item -ItemType Directory -Force -Path (Split-Path $PluginDir) | Out-Null
  if (Test-Path $PluginDir) { Remove-Item $PluginDir -Recurse -Force }
  Copy-Item $src $PluginDir -Recurse -Force
  Info "插件文件已放到 $PluginDir"
} else {
  Info "插件文件已在目标位置，跳过复制"
}

foreach ($f in @('package.json', 'cordis.patch.yml', 'lib\index.js', 'client\client.js')) {
  if (-not (Test-Path (Join-Path $PluginDir $f))) { Die "缺少文件：$f（取文件不完整，请改用 zip 方式重装）" }
}
$video = Join-Path $PluginDir 'assets\wallpaper.mp4'
if (Test-Path $video) {
  $len = (Get-Item $video).Length
  if ($len -eq $EXPECT_VIDEO_BYTES) { Info "壁纸视频完整（$len 字节）" }
  else { Warn "壁纸视频大小异常：$len（预期 $EXPECT_VIDEO_BYTES）—— 可能下载不完整，皮肤能用但壁纸可能有问题" }
} else {
  Warn "没有 assets\wallpaper.mp4 —— 装好后界面没有动态壁纸。可单独下载："
  Warn "  Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/eraerkni/dsh-mornye-theme/main/assets/wallpaper.mp4' -OutFile '$video'"
}

# ---------- 3) 安全改写 profile package.json（用 Node 解析，不用字符串替换） ----------
Write-Host "       注册进 profile（改 package.json，先备份）..."
$bak = "$profilePkg.bak-mornye"
if (-not (Test-Path $bak)) { Copy-Item $profilePkg $bak; Info "已备份 -> $bak" }

$nodeExe = $null
foreach ($cand in @(
    (Join-Path $env:ProgramFiles 'nodejs\node.exe'),
    'D:\ds\DSH Desktop\resources\app\node_modules\node\bin\node.exe'
  )) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $nodeExe = $cmd.Source }
}
if (-not $nodeExe) { Die "找不到 node.exe（改写 package.json 需要它）。请手动按 README 编辑 profile 的 package.json。" }

$editScript = Join-Path $env:TEMP ("mornye-edit-" + [guid]::NewGuid().ToString('N').Substring(0, 8) + '.mjs')
$editBody = @'
import { readFileSync, writeFileSync } from 'node:fs'
const [pkgPath, name] = process.argv.slice(2)
const raw = readFileSync(pkgPath, 'utf8')
let doc
try { doc = JSON.parse(raw) } catch (e) { console.error('PARSE_FAIL ' + e.message); process.exit(2) }
const rel = 'file:local-plugins/' + name
doc.dependencies = doc.dependencies || {}
const before = JSON.stringify(doc)
doc.dependencies[name] = rel
doc.dsh = doc.dsh || {}
doc.dsh.profile = doc.dsh.profile || {}
const bundles = Array.isArray(doc.dsh.profile.bundles) ? doc.dsh.profile.bundles : []
if (!bundles.includes(name)) bundles.push(name)
doc.dsh.profile.bundles = bundles
const after = JSON.stringify(doc)
if (before === after) { console.log('ALREADY_REGISTERED'); process.exit(0) }
writeFileSync(pkgPath, JSON.stringify(doc, null, 2) + '\n')
console.log('REGISTERED deps=' + doc.dependencies[name] + ' bundles=' + bundles.length)
'@
[System.IO.File]::WriteAllText($editScript, $editBody, (New-Object System.Text.UTF8Encoding($false)))

$out = & $nodeExe $editScript $profilePkg $NAME 2>&1
$code = $LASTEXITCODE
Remove-Item $editScript -Force -ErrorAction SilentlyContinue
if ($code -ne 0) { Die "改写 package.json 失败（退出码 $code）：$out`n       已备份原文件：$bak，可从中恢复。" }
if ($out -match 'ALREADY_REGISTERED') { Info "profile 里已经注册过，跳过" } else { Info "已注册：$out" }

# ---------- 4) 建 junction ----------
$link = Join-Path $web "node_modules\$NAME"
New-Item -ItemType Directory -Force -Path (Join-Path $web 'node_modules') | Out-Null
$existing = Get-Item $link -Force -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.LinkType -eq 'Junction') {
    $target = ($existing.Target | Select-Object -First 1)
    if ($target -and (Test-Path $target)) { Info "junction 已存在且有效 -> $target" }
    else { Remove-Item $link -Recurse -Force; New-Item -ItemType Junction -Path $link -Target $PluginDir | Out-Null; Info "junction 已重建" }
  } else {
    Remove-Item $link -Recurse -Force
    New-Item -ItemType Junction -Path $link -Target $PluginDir | Out-Null
    Info "已用 junction 替换原来的普通目录"
  }
} else {
  New-Item -ItemType Junction -Path $link -Target $PluginDir | Out-Null
  Info "已建 junction：$link"
}

# ---------- 结果 ----------
Write-Host ""
Write-Host "=== 安装完成 ===" -ForegroundColor Cyan
Write-Host "  插件目录 : $PluginDir"
Write-Host "  注册名   : $NAME"
Write-Host "  壁纸视频 : $(if (Test-Path $video) { '已就位' } else { '缺失（见上面的提示）' })"
Write-Host ""
Write-Host "下一步：重启 DSH Desktop，然后打开 设置 → 通用设置 →「外观」，" -ForegroundColor Yellow
Write-Host "        你会看到多出一个「莫宁」方块，点它即可启用皮肤。" -ForegroundColor Yellow
Write-Host "        想卸载：删掉 junction、把 package.json 里的 $NAME 两处去掉、再删插件目录。"
