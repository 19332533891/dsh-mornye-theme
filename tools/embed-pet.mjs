// 把 assets/pet.png 压成 webp 并内嵌进 client/client.js 的 PET_IMG。
// 内嵌成 data URL 是为了不依赖 host 路由（省掉一次重启，也没有缓存不刷新问题）。
//
// 用法：node tools/embed-pet.mjs [--size 256] [--quality 88]
//   --client <path>   要改写的 client.js（默认 <repo>/client/client.js）
//   --png <path>      源图（默认 <repo>/assets/pet.png）
//
// 依赖 sharp：优先用本仓库 node_modules，其次用 DSH Desktop 自带的那份
// （用 DSH_APP_ROOT 指定 DSH 安装目录，默认 D:\ds\DSH Desktop\resources\app）。
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const argOf = (name, fallback) => {
  const i = process.argv.indexOf(name)
  if (i < 0) return fallback
  const v = process.argv[i + 1]
  return v === undefined || v.startsWith('--') ? fallback : v
}
const numArg = (name, fallback) => {
  const v = argOf(name, null)
  return v === null ? fallback : Number(v)
}

const size = numArg('--size', 256)
const quality = numArg('--quality', 88)
const PNG = argOf('--png', join(ROOT, 'assets', 'pet.png'))
const CLIENT = argOf('--client', join(ROOT, 'client', 'client.js'))
/* client.js 里这个变量的名字（avatar 那个脚本用同一个骨架） */
const VAR = argOf('--var', 'PET_IMG')

/* sharp 解析：本仓库 → DSH 自带。两条都失败就把话说清楚，别抛一个看不懂的 MODULE_NOT_FOUND。 */
function loadSharp() {
  const candidates = [
    join(ROOT, 'package.json'),
    join(process.env.DSH_APP_ROOT || 'D:\\ds\\DSH Desktop\\resources\\app', 'package.json'),
  ]
  const tried = []
  for (const c of candidates) {
    tried.push(c)
    try {
      return createRequire(c)('sharp')
    } catch {
      /* 试下一个 */
    }
  }
  throw new Error(
    'sharp not found. Tried:\n  ' + tried.join('\n  ') +
      '\nInstall it in this repo (npm i -D sharp) or point DSH_APP_ROOT at your DSH Desktop resources/app.',
  )
}

const sharp = loadSharp()

const webp = await sharp(PNG)
  .resize(size, size, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality, effort: 6 })
  .toBuffer()
const b64 = webp.toString('base64')

const src = readFileSync(CLIENT, 'utf8')
const re = new RegExp('(var ' + VAR + ' = "data:image\\/webp;base64,)[A-Za-z0-9+/=]*(";)')
if (!re.test(src)) throw new Error(`${CLIENT} 里找不到 ${VAR} 占位`)
const next = src.replace(re, `$1${b64}$2`)
if (next === src) {
  console.log(`${VAR} 已是最新，未改动`)
} else {
  writeFileSync(CLIENT, next)
  console.log(
    `已内嵌 ${VAR}：${PNG} → webp ${webp.length} bytes → base64 ${b64.length} 字符（${CLIENT} ${src.length} → ${next.length}）`,
  )
}
