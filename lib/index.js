/**
 * mornye-theme — host 半边（只做主题、壁纸、余额与外观开关）
 *
 *   GET  /plugins/mornye-theme/health          → host 半边与当前开关状态（探针）
 *   GET  /plugins/mornye-theme/balance         → DeepSeek 余额（旧；换 OpenCode Go 订阅后已不走 UI）
 *   GET  /plugins/mornye-theme/quota           → OpenCode Go 订阅额度（rolling/weekly/monthly + 今日用量）
 *   GET  /plugins/mornye-theme/wallpaper.mp4   → 莫宁壁纸视频（支持 Range）
 *   GET  /plugins/mornye-theme/poster.jpg      → 壁纸封面
 *   GET  /plugins/mornye-theme/lines           → 桌宠台词库（实时读用户那个 txt）
 *   GET/POST /plugins/mornye-theme/flag        → 外观开关 + 生效主题 + 铺满方式 + 桌宠位置
 */
import { createReadStream, statSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readLines, TEXT_PATH } from './lines.js'

export const name = 'mornye-theme'

/* ================= 配置（全部可用环境变量覆盖，仓库里不含任何密钥） ================= */
/* DeepSeek 余额路由（历史功能，UI 已不用；保留给还想用余额的人）。
 * key 只从环境变量取 —— 上游 phoebe 那版把 key 写死在源码里，这里不再这么做。 */
const API_KEY = process.env.DSH_MORNYE_API_KEY || process.env.DEEPSEEK_API_KEY || ''
const BALANCE_URL = 'https://api.deepseek.com/user/balance'
/* OpenCode Go 订阅额度：官方只给"已用百分比"，没有余额/金额。
 * 每次请求会消耗一次「已用」，但 1 分钟 1 次的频率可忽略。 */
const OPENCODE_USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'
/* key 来源：环境变量优先，其次从 DSH 的凭据文件里读（本机装 DSH Desktop 时 key 就在那里）。
 * 路径可用 DSH_MORNYE_CREDENTIALS 覆盖；文件不存在只是拿不到 key，不影响插件加载。 */
const CREDENTIALS_PATH =
  process.env.DSH_MORNYE_CREDENTIALS ||
  join(process.env.APPDATA || '', 'dsh-desktop', 'harness', '.credentials.yaml')
const ROUTE_PREFIX = '/plugins/mornye-theme'
/* ======================================= */

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const ASSETS = join(ROOT, 'assets')
/* 壁纸视频**不进仓库**（111MB + 版权素材）：默认去 DSH 配置目录找，
 * 可以用 DSH_MORNYE_WALLPAPER 指向任意 mp4（放 assets/wallpaper.mp4 也行，会自动兜底）。 */
const CONFIG_DIR =
  process.env.DSH_MORNYE_CONFIG_DIR ||
  join(process.env.APPDATA || process.env.HOME || '.', 'dsh-desktop', 'mornye-theme')

/* 运行期状态（外观开关 / 额度采样）：写到配置目录，不写进插件目录 ——
 * 插件目录在升级/重装时可能被覆盖，且不该把状态提交进 git。 */
const FLAG_PATH = join(CONFIG_DIR, 'theme-flag.json')
/* 额度采样：按「窗口 reset 时间」分桶存，日内涨跌一眼可见（今日用量 = 本桶 max-min）。
 * 只保留最近 24 小时 + 1 个桶，够算"今日"也够跨窗口重置。 */
const QUOTA_SAMPLES_PATH = join(CONFIG_DIR, 'quota-samples.json')
const QUOTA_KEEP_MS = 26 * 3600 * 1000

function ensureConfigDir() {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true })
  } catch {
    /* 建不了就算了，写文件时会各自兜错 */
  }
}

/** 壁纸/封面按候选顺序找第一个存在的文件 */
function firstExisting(paths) {
  for (const p of paths) {
    try {
      if (p && existsSync(p) && statSync(p).isFile()) return p
    } catch {
      /* 下一个 */
    }
  }
  return null
}

function wallpaperPath() {
  return firstExisting([
    process.env.DSH_MORNYE_WALLPAPER,
    join(ASSETS, 'wallpaper.mp4'),
    join(CONFIG_DIR, 'wallpaper.mp4'),
  ])
}

function posterPath() {
  return firstExisting([
    process.env.DSH_MORNYE_POSTER,
    join(ASSETS, 'poster.jpg'),
    join(CONFIG_DIR, 'poster.jpg'),
  ])
}


const MIME = {
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
}

function sendJson(res, status, body) {
  const payload = Buffer.from(JSON.stringify(body))
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(payload)
}

function readJsonFile(path, fallback) {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    /* fall through */
  }
  return fallback
}

function readBody(req, res, onValue) {
  let body = ''
  req.on('data', (chunk) => {
    body += chunk
    if (body.length > 16384) req.destroy()
  })
  req.on('end', () => {
    try {
      onValue(JSON.parse(body || '{}'))
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String((err && err.message) || err) })
    }
  })
}

/** 静态文件 + 单区间 Range（mp4 拖动进度需要）。cache 可覆盖默认长缓存。 */
function serveFile(req, res, filePath, mime, cache = 'public, max-age=86400') {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    res.end()
    return
  }
  let size
  try {
    const st = statSync(filePath)
    if (!st.isFile()) throw new Error('not a file')
    size = st.size
  } catch {
    res.writeHead(404)
    res.end()
    return
  }
  const base = {
    'content-type': mime,
    'accept-ranges': 'bytes',
    'cache-control': cache,
  }
  const range = req.headers.range
  if (typeof range === 'string' && range.startsWith('bytes=')) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (m) {
      let start = m[1] === '' ? null : parseInt(m[1], 10)
      let end = m[2] === '' ? null : parseInt(m[2], 10)
      if (start === null && end === null) {
        res.writeHead(416, { 'content-range': `bytes */${size}` })
        res.end()
        return
      }
      if (start === null) {
        start = Math.max(0, size - end)
        end = size - 1
      } else {
        if (end === null || end >= size) end = size - 1
        if (start > end || start >= size) {
          res.writeHead(416, { 'content-range': `bytes */${size}` })
          res.end()
          return
        }
      }
      res.writeHead(206, {
        ...base,
        'content-length': end - start + 1,
        'content-range': `bytes ${start}-${end}/${size}`,
      })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      createReadStream(filePath, { start, end }).pipe(res)
      return
    }
  }
  res.writeHead(200, { ...base, 'content-length': size })
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  createReadStream(filePath).pipe(res)
}

/* ---------- 外观开关 + 生效主题 + 铺满方式 + 桌宠/dock 位置（跨重启持久） ---------- */
function readJsonNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

/** null / {x,y} 归一化，脏数据一律丢掉 */
function normalizePos(value) {
  if (value === null) return null
  if (!value || !readJsonNumber(value.x) || !readJsonNumber(value.y)) return undefined
  return { x: Math.round(value.x), y: Math.round(value.y) }
}

function readFlag() {
  const raw = readJsonFile(FLAG_PATH, {})
  return {
    wallpaper: raw.wallpaper !== false,
    active: typeof raw.active === 'string' ? raw.active : 'mornye',
    fit: raw.fit === 'contain' ? 'contain' : 'cover',
    petPos: normalizePos(raw.petPos) ?? null,
    dockPos: normalizePos(raw.dockPos) ?? null,
  }
}

function handleFlag(req, res) {
  if (req.method === 'GET') {
    sendJson(res, 200, readFlag())
    return
  }
  if (req.method === 'POST') {
    readBody(req, res, (value) => {
      const next = readFlag()
      if (typeof value.wallpaper === 'boolean') next.wallpaper = value.wallpaper
      if (typeof value.active === 'string') next.active = value.active
      if (value.fit === 'cover' || value.fit === 'contain') next.fit = value.fit
      for (const key of ['petPos', 'dockPos']) {
        if (!(key in value)) continue
        const pos = normalizePos(value[key])
        if (pos !== undefined) next[key] = pos
      }
      writeFileSync(FLAG_PATH, JSON.stringify(next))
      sendJson(res, 200, { ok: true, ...next })
    })
    return
  }
  res.writeHead(405)
  res.end()
}

/* ---------- 桌宠台词库：读一个纯文本文件，一行一句（路径见 lib/lines.js 顶部的可配常量） ----------
 * 每次请求现读，改完文件不用重启也不用刷新；文件为空/不存在时返回空数组，
 * 由客户端用自带的兜底台词顶上。
 */
function handleLines(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405)
    res.end()
    return
  }
  const r = readLines()
  sendJson(res, 200, {
    lines: r.lines,
    count: r.lines.length,
    file: TEXT_PATH,
    mtime: r.mtime,
    encoding: r.encoding,
    error: r.error,
  })
}

/* ---------- OpenCode Go 订阅额度 ----------
 * 官方接口：GET https://opencode.ai/zen/go/v1/usage  +  Authorization: Bearer <key>
 *   → { usage: { rolling|weekly|monthly: { status, percent, resetsAt } } }
 * 注意：**只给已用百分比**，没有余额、没有"今日使用"字段 ——
 *   · 剩余 = 100 - percent（客户端算，host 只透传原始值 + 一个采样算出的 todayUsedPercent）；
 *   · "今日使用"= 本窗口桶内 percent 的最大跨度（滚动窗口随旧请求过期会回落，故用 max-min）；
 *   · key 用 `x-api-key` 会 401，必须是 `Authorization: Bearer`（实测）。
 */
function readOpenCodeKey() {
  if (process.env.OPENCODE_GO_API_KEY) return process.env.OPENCODE_GO_API_KEY
  try {
    const text = readFileSync(CREDENTIALS_PATH, 'utf8').replace(/^\uFEFF/, '')
    const m = /OPENCODE_GO_API_KEY:\s*(\S+)/.exec(text)
    if (m) return m[1]
  } catch {
    /* 凭据文件读不到就当作没配 */
  }
  return null
}

/** 采样桶 key：优先用上游给的窗口重置时间来分组（每个 5 小时窗口一个桶）。
 *  ⚠️ 实测上游的 `resetsAt` **每次请求都在毫秒级漂移**（…49.311Z → …49.287Z），
 *  直接拿它当 key 会"每次轮询都开新桶"，今日用量永远算不出来 —— 所以量化到 30 分钟。
 *  5 小时窗口之间的间隔远大于 30 分钟，量化后仍能正确分辨不同窗口。 */
const BUCKET_QUANTUM_MS = 30 * 60 * 1000
function quotaBucketKey(rolling, nowMs) {
  const resets = rolling && typeof rolling.resetsAt === 'string' ? rolling.resetsAt : null
  const t = resets ? Date.parse(resets) : NaN
  if (Number.isFinite(t)) return 'r' + Math.round(t / BUCKET_QUANTUM_MS)
  return 'h' + Math.round(nowMs / BUCKET_QUANTUM_MS)
}

function pctOf(w) {
  return w && typeof w.percent === 'number' && Number.isFinite(w.percent) ? w.percent : null
}

/** 追加一条采样并返回 { bucketKey, samples, todayUsedPercent } */
function recordSample(usage, nowMs) {
  const rolling = usage && usage.rolling ? usage.rolling : null
  const percent = pctOf(rolling)
  const state = readJsonFile(QUOTA_SAMPLES_PATH, { buckets: [] })
  let buckets = Array.isArray(state.buckets) ? state.buckets : []
  const key = quotaBucketKey(rolling, nowMs)
  let bucket = buckets.find((b) => b && b.key === key)
  if (!bucket) {
    bucket = { key, samples: [] }
    buckets.push(bucket)
  }
  if (percent !== null) {
    const last = bucket.samples[bucket.samples.length - 1]
    // 同一时间点的重复请求不重复记；percent 变了才记
    if (!last || last.percent !== percent) bucket.samples.push({ t: nowMs, percent })
  }
  buckets = buckets.filter((b) => {
    const last = b.samples && b.samples.length ? b.samples[b.samples.length - 1].t : 0
    return last > nowMs - QUOTA_KEEP_MS
  })
  try {
    writeFileSync(QUOTA_SAMPLES_PATH, JSON.stringify({ buckets }))
  } catch {
    /* 磁盘写不了不影响返回 */
  }
  const list = bucket.samples || []
  const percents = list.map((s) => s.percent).filter((v) => typeof v === 'number')
  const todayUsedPercent =
    percents.length >= 2 ? Math.max(...percents) - Math.min(...percents) : null
  return { bucketKey: key, sampleCount: percents.length, todayUsedPercent, windowStartedAt: list.length ? list[0].t : null }
}

async function fetchOpenCodeUsage() {
  const key = readOpenCodeKey()
  if (!key) throw new Error('OPENCODE_GO_API_KEY not found (env or .credentials.yaml)')
  const upstream = await fetch(OPENCODE_USAGE_URL, {
    headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  })
  if (!upstream.ok) throw new Error(`OpenCode Go HTTP ${upstream.status}`)
  return upstream.json()
}

async function handleQuota(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405)
    res.end()
    return
  }
  const nowMs = Date.now()
  try {
    const body = await fetchOpenCodeUsage()
    const usage = body && body.usage ? body.usage : {}
    const sample = recordSample(usage, nowMs)
    sendJson(res, 200, {
      ok: true,
      provider: 'opencode-go',
      windows: {
        rolling: usage.rolling || null,
        weekly: usage.weekly || null,
        monthly: usage.monthly || null,
      },
      todayUsedPercent: sample.todayUsedPercent,
      rollingWindowStartedAt: sample.windowStartedAt,
      sampleCount: sample.sampleCount,
      fetchedAt: nowMs,
    })
  } catch (err) {
    sendJson(res, 502, { ok: false, error: String((err && err.message) || err) })
  }
}

async function handleBalance(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405)
    res.end()
    return
  }
  try {
    const upstream = await fetch(BALANCE_URL, {
      headers: { authorization: `Bearer ${API_KEY}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!upstream.ok) throw new Error(`DeepSeek HTTP ${upstream.status}`)
    sendJson(res, 200, await upstream.json())
  } catch (err) {
    sendJson(res, 502, { ok: false, error: String((err && err.message) || err) })
  }
}

/* ---------- 启动预热：第一帧就是莫宁的冷色外观，不闪默认外观 ----------
 * 与菲比同一思路：外壳还没执行任何脚本时，index.html 里就已经带着首屏必需的样式。
 * 主题关掉（flags.wallpaper=false）就不注入；运行中切走由客户端移除。
 */
const PREHEAT_STYLE_ID = 'mornye-preheat'
const PREHEAT_CSS = [
  'html,body{background:#05070d !important}',
  '#root{background:transparent !important}',
  'div:has(> [data-shell-overlay]){background:transparent !important}',
  /* 壁纸层直接写在 HTML 里（见 injectWallpaperLayer）：外壳一挂载壁纸就已经在加载，
     先出封面帧、视频解好再淡入 —— 不必等客户端插件跑起来才建 DOM，壁纸能早出现一大截。 */
  '.mornye-wallpaper{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:#05070d}',
  '.mornye-wallpaper-backdrop{position:absolute;inset:-8%;background-position:center;background-size:cover;',
  'filter:blur(42px) saturate(1.08) brightness(0.5);opacity:0;transition:opacity .5s ease}',
  ".mornye-wallpaper[data-fit='contain'] .mornye-wallpaper-backdrop{opacity:.92}",
  '.mornye-wallpaper video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;',
  'background:transparent;opacity:0;transition:opacity .55s ease}',
  ".mornye-wallpaper[data-fit='contain'] video{object-fit:contain}",
  '.mornye-wallpaper video.ready{opacity:1}',
  '.mornye-wallpaper::after{content:"";position:absolute;inset:0;pointer-events:none;',
  'background:radial-gradient(125% 95% at 50% 46%,rgba(0,0,0,0) 52%,rgba(3,5,10,0.62) 100%)}',
  /* 外壳自带的表面 token：主题挂上之前它们没有值，输入框等就会按浅色渲染成白色。
     ① 写 :root + body 两处（只写 :root 会被"最近祖先"上的外壳定义压掉，实测卡片仍会变白）；
     ② 再给输入框卡片补一条字面色规则 —— 无论 token 怎么被改写，它都不会白。 */
  ':root,body{',
  '--dsw-specific-input-major:rgba(17,24,40,0.80) !important;',
  '--dsw-specific-input-minor:rgba(22,30,50,0.72) !important;',
  '--dsw-specific-selector:rgba(20,28,46,0.86) !important;',
  '--dsw-specific-menu:rgba(14,21,38,0.94) !important;',
  '--dsw-specific-tip:rgba(14,21,38,0.94) !important;',
  '--dsw-specific-login-input:rgba(12,18,34,0.92) !important;',
  '--dsw-specific-bubble:rgba(16,22,36,0.82) !important;',
  '--dsw-specific-bubble-highlight:rgba(160,195,245,0.12) !important',
  '}',
  '[class*="_composerSeat"] [class*="_card"],[class*="_cardWorkspaceTrigger"],[class*="_composerStack"] [class*="_card"]{',
  'background:rgba(17,24,40,0.80) !important',
  '}',
  'div:has(> [data-shell-overlay])>div:first-child{',
  'background:rgba(10,15,26,0.66) !important;color:#e6ecf8 !important;',
  '--dsw-specific-sidebar-fill:rgba(10,15,26,0.66);',
  '--dsw-alias-label-primary:#e6ecf8;--dsw-alias-label-secondary:#a8b6cd;--dsw-alias-label-tertiary:#8595ad;',
  '--dsw-alias-label-primary-inverted:#e6ecf8;',
  '--dsw-alias-button-elevated-fill:rgba(18,26,44,0.95);',
  '--dsw-alias-interactive-bg-hover:rgba(160,195,245,0.14);',
  '--dsw-specific-sidebar-nav-item-hover:rgba(160,195,245,0.12);',
  '--dsw-specific-sidebar-nav-item-active:rgba(160,195,245,0.20);',
  '--dsw-alias-scrollbar-bg-l2:rgba(160,195,245,0.28);',
  '--dsw-alias-border-l2:rgba(150,180,230,0.20)',
  '}',
  'div:has(> [data-shell-overlay])>div:nth-child(3){background:rgba(8,12,22,0.22) !important}',
  "[data-dsh-sidebar-brand-identity]{color:#f2f6ff !important;--dsw-alias-label-primary-inverted:#0a0f1a !important}",
  "[data-phase='hero'],[data-phase='settling'],[data-phase='active']{",
  'background:rgba(10,15,26,0.62) !important;',
  '--dsw-alias-label-primary:#e9eefb;--dsw-alias-label-secondary:#a8b6cd;--dsw-alias-label-tertiary:#8595ad;',
  '--dsw-alias-label-caption:#8595ad;--dsw-alias-label-primary-bluish:#e9eefb;--dsw-alias-label-primary-dimmed:#8595ad;',
  '--dsw-alias-bg-layer-1:#121a29;--dsw-alias-bg-layer-2:#0e1523;--dsw-alias-bg-module-platform:#121a29;',
  '--dsw-specific-tip:#0f1626;--dsw-specific-menu:#0f1626;--dsw-alias-bg-overlay:#0f1626;',
  '--dsw-alias-border-l1:rgba(150,180,230,0.26);--dsw-alias-border-l2:rgba(150,180,230,0.18)',
  '}',
  '.mornye-wallpaper{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:#05070d}',
  /* 外壳自带的「HARNESS / Loading plugins…」开屏：实测默认是白底
     （前端 CSS：._boot_*{--dsh-boot-bg:#fff;background:var(--dsw-alias-bg-base,var(--dsh-boot-bg))}），
     主题挂上之前会白闪一下，看着就像「原版主题又冒出来了」。用它对外的稳定钩子 data-dsh-boot 染成莫宁深色。
     变量与 background 都带 !important —— 那条类规则是外壳运行期才注入的，靠先后顺序压不住。 */
  '[data-dsh-boot]{background:#05070d !important;',
  '--dsh-boot-bg:#05070d !important;--dsh-boot-brand:#eef2ff !important;',
  '--dsh-boot-label-primary:#eef2ff !important;--dsh-boot-label-secondary:#a8b6cd !important;',
  '--dsh-boot-label-tertiary:#8595ad !important;--dsh-boot-border:rgba(150,180,230,0.22) !important;',
  '--dsh-boot-arc:#9dc0f0 !important}',
].join('')

function injectPreheat(html) {
  if (html.includes(`id="${PREHEAT_STYLE_ID}"`)) return html
  const markup =
    `<link rel="preload" as="image" href="${ROUTE_PREFIX}/poster.jpg">` +
    `<style id="${PREHEAT_STYLE_ID}">${PREHEAT_CSS}</style>`
  const open = /<head(?:\s[^>]*)?>/i.exec(html)
  if (open === null) return markup + html
  const at = open.index + open[0].length
  return html.slice(0, at) + markup + html.slice(at)
}

export { injectPreheat, injectWallpaperLayer, PREHEAT_CSS }

/* ---------- 壁纸层直接写进 index.html ----------
 * 目的：壁纸别再等客户端插件（要等外壳挂载完才轮到插件跑）。
 * 写在 <body> 之后 → 外壳还没画，壁纸已经在下载；封面帧先显示，视频解好再淡入。
 * 客户端半边会“接管”这个已存在的层（不重复建 DOM）。 */
function injectWallpaperLayer(html) {
  if (html.includes('class="mornye-wallpaper"')) return html
  const markup =
    `<div class="mornye-wallpaper" data-fit="cover" aria-hidden="true">` +
    `<div class="mornye-wallpaper-backdrop" style="background-image:url('${ROUTE_PREFIX}/poster.jpg')"></div>` +
    `<video src="${ROUTE_PREFIX}/wallpaper.mp4" poster="${ROUTE_PREFIX}/poster.jpg" muted autoplay loop playsinline preload="auto"></video>` +
    `</div>`
  const body = /<body(?:\s[^>]*)?>/i.exec(html)
  if (body !== null) {
    const at = body.index + body[0].length
    return html.slice(0, at) + markup + html.slice(at)
  }
  const close = /<\/body>/i.exec(html)
  if (close !== null) return html.slice(0, close.index) + markup + html.slice(close.index)
  return html + markup
}

export function apply(ctx) {
  ctx.inject(['webServer'], (hostCtx) => {
    hostCtx.effect(() => {
      /* 运行期状态写在配置目录里（theme-flag.json / quota-samples.json） */
      ensureConfigDir()
      const disposers = [
        hostCtx.webServer.tapIndex((html) => {
          if (!readFlag().wallpaper) return html
          return injectWallpaperLayer(injectPreheat(html))
        }),
        hostCtx.webServer.register({
          kind: 'exact',
          path: `${ROUTE_PREFIX}/health`,
          handler: (req, res) =>
            sendJson(res, 200, { ok: true, plugin: 'mornye-theme', pid: process.pid, flag: readFlag() }),
        }),
        hostCtx.webServer.register({ kind: 'exact', path: `${ROUTE_PREFIX}/balance`, handler: handleBalance }),
        hostCtx.webServer.register({ kind: 'exact', path: `${ROUTE_PREFIX}/quota`, handler: handleQuota }),
        hostCtx.webServer.register({ kind: 'exact', path: `${ROUTE_PREFIX}/lines`, handler: handleLines }),
        hostCtx.webServer.register({
          kind: 'exact',
          path: `${ROUTE_PREFIX}/wallpaper.mp4`,
          handler: (req, res) => {
            const file = wallpaperPath()
            if (file === null) {
              /* 仓库不带视频（体积 + 版权），所以这里给一条能照做的说明 */
              res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
              res.end(
                'wallpaper.mp4 not found.\n' +
                  'Put your own video at assets/wallpaper.mp4, or set DSH_MORNYE_WALLPAPER=<path to .mp4>.\n',
              )
              return
            }
            serveFile(req, res, file, MIME['.mp4'])
          },
        }),
        hostCtx.webServer.register({
          kind: 'exact',
          path: `${ROUTE_PREFIX}/poster.jpg`,
          handler: (req, res) => {
            const file = posterPath()
            if (file === null) {
              res.writeHead(404)
              res.end()
              return
            }
            serveFile(req, res, file, MIME['.jpg'])
          },
        }),
        /* 桌宠图不从这里出：它内嵌在 client 半边的 data URL 里（同菲比那版），省掉一次重启 */
        hostCtx.webServer.register({ kind: 'exact', path: `${ROUTE_PREFIX}/flag`, handler: handleFlag }),
      ]
      return () => {
        for (const dispose of disposers) {
          try {
            dispose?.()
          } catch {
            /* ignore */
          }
        }
      }
    }, 'mornye-theme: http routes')
  })
}
