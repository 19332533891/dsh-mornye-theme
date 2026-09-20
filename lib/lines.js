/**
 * 台词库：读一个纯文本文件，一行一句。
 *  - 每次请求都重新读盘（改完文件不用重启、不用刷新就能生效）
 *  - 编码自适应：UTF-8（含 BOM）优先，不是合法 UTF-8 就按 GBK 解（记事本另存为 ANSI 的老习惯）
 *  - 空行、以 # 或 // 开头的行当注释丢掉；同一句重复只留一次
 *  - 行首序号（1， 2、 3.）与列表符号会被剥掉：那些只是人看的顺序，念出来要吃掉
 *
 * 路径优先级（仓库里不含任何个人路径）：
 *   1. 环境变量 DSH_MORNYE_LINES
 *   2. DSH 配置目录下的 lines.txt（Windows: %APPDATA%\dsh-desktop\mornye-theme\lines.txt）
 */
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const TEXT_PATH =
  process.env.DSH_MORNYE_LINES ||
  join(process.env.APPDATA || process.env.HOME || '.', 'dsh-desktop', 'mornye-theme', 'lines.txt')

const utf8 = new TextDecoder('utf-8', { fatal: true })
const gbk = new TextDecoder('gbk')

/** 纯函数：文本 → 台词数组（便于单独测） */
export function parseLines(text) {
  if (typeof text !== 'string') return []
  const seen = new Set()
  const out = []
  for (const raw of text.split(/\r\n|\r|\n/)) {
    let line = raw.replace(/^\uFEFF/, '').trim()
    if (line === '') continue
    if (line.startsWith('#') || line.startsWith('//')) continue
    /* 行首序号只是人看的顺序（1， 2、 3. 4) 5: ），念的时候要吃掉；列表符号同理 */
    line = line
      .replace(/^\d{1,3}\s*[.、,，。:：)）\]】\-]\s*/, '')
      .replace(/^[-*•·]\s+/, '')
      .trim()
    if (line === '') continue
    if (line.startsWith('#') || line.startsWith('//')) continue
    if (seen.has(line)) continue
    seen.add(line)
    out.push(line)
  }
  return out
}

/** 读文件 → { lines, file, mtime, encoding, error } */
export function readLines(file = TEXT_PATH) {
  try {
    const st = statSync(file)
    const buf = readFileSync(file)
    let text
    let encoding = 'utf-8'
    try {
      text = utf8.decode(buf)
    } catch {
      text = gbk.decode(buf)
      encoding = 'gbk'
    }
    return { lines: parseLines(text), file, mtime: st.mtimeMs, encoding, error: null }
  } catch (err) {
    return { lines: [], file, mtime: null, encoding: null, error: String((err && err.message) || err) }
  }
}
