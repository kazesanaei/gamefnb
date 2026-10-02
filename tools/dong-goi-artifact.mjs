// Đóng gói một trang của game thành trang artifact claude.ai (trang HTML không có khung tài liệu + bản đồ tệp kèm theo).
// Cách dùng:
//   node tools/dong-goi-artifact.mjs                         → trang game (index.html)
//   node tools/dong-goi-artifact.mjs --entry mau.html        → Phòng mẫu giao diện
//   tùy chọn: --out <thư mục> (mặc định thư mục tạm của hệ điều hành), --name <tên tệp trang, không đuôi>
// Kết quả: <out>/<tên>.html và <out>/files.json ({ "đường dẫn đăng": "đường dẫn nguồn tính từ gốc repo" }).
//  - Trang = <title> + phần còn lại của <head> (bỏ meta charset, meta viewport, title, chú thích) + nội dung <body>
//    (trình đăng artifact tự bọc khung tài liệu, nên thẻ <html>/<head>/<body> và thuộc tính của chúng không giữ được).
//  - Tệp kèm = danh sách PRECACHE của sw.js (trừ index.html, chính là trang) — nên tự kèm font fonts/*.woff2; với
//    mau.html thêm mọi tệp trong mau/.
//  - Kiểm trước khi ghi: mọi tệp có thật; mọi import tương đối (tĩnh và động) đi đệ quy từ module của trang (src/main.js
//    hoặc mau/mau.js) đều có trong tệp kèm; mọi href/src cục bộ của trang và mọi url() cục bộ trong CSS kèm theo cũng vậy.
//    Thiếu là dừng, báo lỗi, không ghi gì.
// Chỉ dùng node:fs / node:path, không cần cài thêm gói.
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Tên tệp trang mặc định theo trang nguồn.
const DEFAULT_NAMES = { 'index.html': 'bep-khoi-nghiep', 'mau.html': 'bep-khoi-nghiep-phong-mau' }
// Thư mục kèm thêm theo trang nguồn (ngoài PRECACHE).
const EXTRA_DIRS = { 'mau.html': ['mau'] }

const posix = p => p.split(path.sep).join('/')

/** Danh sách PRECACHE (đường dẫn tương đối) đọc từ sw.js. */
export function precacheList(root = ROOT) {
  const sw = readFileSync(path.join(root, 'sw.js'), 'utf8')
  const m = /const PRECACHE\s*=\s*\[([\s\S]*?)\]/.exec(sw)
  if (!m) throw new Error('Không tìm thấy PRECACHE trong sw.js')
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1].replace(/^\.\//, ''))
}

function walkDir(root, dir) {
  const out = []
  const abs = path.join(root, dir)
  if (!existsSync(abs)) return out
  for (const name of readdirSync(abs).sort()) {
    if (name.startsWith('.')) continue
    const rel = dir + '/' + name
    if (statSync(path.join(root, rel)).isDirectory()) out.push(...walkDir(root, rel))
    else out.push(rel)
  }
  return out
}

// Đường dẫn cục bộ (không phải http:, https:, //, data:, blob:, mailto:, tel:, javascript:, #neo, gốc trang './').
function localRef(ref) {
  const r = String(ref || '').trim()
  if (!r || r === '.' || r === './' || r.startsWith('#')) return null
  if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(r)) return null
  return r.split('#')[0].split('?')[0]
}

/**
 * Dựng trang artifact từ entry (không ghi tệp). Trả:
 * { entry, page, files: { đăng: nguồn }, modules: [module đã kiểm], refs: [href/src cục bộ], cssRefs: [url() cục bộ] }.
 * Ném lỗi (tiếng Việt) khi thiếu tệp hoặc tham chiếu không có trong tệp kèm.
 */
export function buildArtifact({ root = ROOT, entry = 'index.html' } = {}) {
  const entryPath = path.join(root, entry)
  if (!existsSync(entryPath)) throw new Error('Không có trang nguồn: ' + entry)
  const html = readFileSync(entryPath, 'utf8')
  const headM = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html)
  const bodyM = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html)
  if (!headM || !bodyM) throw new Error(entry + ': thiếu <head> hoặc <body>')
  const titleM = /<title>([\s\S]*?)<\/title>/i.exec(headM[1])
  const title = titleM ? titleM[1].trim() : 'Bếp Khởi Nghiệp'
  // bỏ chú thích (kể cả chú thích nhiều dòng) trước khi lọc từng dòng của <head>
  const head = headM[1].replace(/<!--[\s\S]*?-->/g, '')
  const keep = head.split('\n').map(s => s.trim()).filter(s =>
    s && !/^<meta\s+charset/i.test(s) && !/^<meta\s+name="viewport"/i.test(s) && !/^<title>/i.test(s))
  const body = bodyM[1].trim()
  const page = [`<title>${title}</title>`, ...keep, body].join('\n') + '\n'

  // tệp kèm: PRECACHE (trừ trang game) + thư mục riêng của trang
  const files = {}
  const add = rel => {
    if (!rel || rel === entry || rel === 'index.html') return
    const abs = path.join(root, rel)
    if (!existsSync(abs) || !statSync(abs).isFile()) throw new Error('Thiếu tệp ' + rel)
    files[rel] = rel
  }
  for (const p of precacheList(root)) add(p)
  for (const dir of EXTRA_DIRS[entry] || []) for (const rel of walkDir(root, dir)) add(rel)

  // import đệ quy từ module của trang
  const modules = []
  const seen = new Set()
  const walk = rel => {
    if (seen.has(rel)) return
    seen.add(rel)
    if (!files[rel]) throw new Error('Module không có trong tệp kèm: ' + rel)
    modules.push(rel)
    const src = readFileSync(path.join(root, rel), 'utf8')
    const re = /(?:import|export)\s[^'"`;]*?from\s*['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)|import\s*['"](\.[^'"]+)['"]/g
    for (const m of src.matchAll(re)) {
      const spec = m[1] || m[2] || m[3]
      walk(path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec)))
    }
  }
  const scripts = [...page.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/gi)].map(m => localRef(m[1])).filter(Boolean)
  if (!scripts.length) throw new Error(entry + ': không thấy <script type="module" src="…">')
  for (const s of scripts) walk(path.posix.normalize(s))

  // mọi href / src cục bộ của trang
  const refs = []
  for (const m of page.matchAll(/\b(?:href|src)="([^"]*)"/gi)) {
    const r = localRef(m[1])
    if (!r) continue
    const rel = path.posix.normalize(r)
    refs.push(rel)
    if (!files[rel]) throw new Error(`${entry}: tham chiếu "${m[1]}" không có trong tệp kèm`)
  }
  // url() cục bộ trong các tệp CSS kèm theo (vd font của css/theme.css)
  const cssRefs = []
  for (const rel of Object.keys(files).filter(f => f.endsWith('.css'))) {
    const css = readFileSync(path.join(root, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
      const r = localRef(m[2])
      if (!r) continue
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), r))
      cssRefs.push(target)
      if (!files[target]) throw new Error(`${rel}: url(${m[2]}) không có trong tệp kèm`)
    }
  }
  return { entry, page, files, modules, refs, cssRefs }
}

function parseArgs(argv) {
  const out = { entry: 'index.html', out: null, name: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const val = () => { const v = argv[++i]; if (!v) throw new Error('Thiếu giá trị cho ' + a); return v }
    if (a === '--entry') out.entry = val()
    else if (a.startsWith('--entry=')) out.entry = a.slice(8)
    else if (a === '--out') out.out = val()
    else if (a.startsWith('--out=')) out.out = a.slice(6)
    else if (a === '--name') out.name = val()
    else if (a.startsWith('--name=')) out.name = a.slice(7)
    else if (a === '-h' || a === '--help') out.help = true
    else throw new Error('Tham số lạ: ' + a)
  }
  out.entry = posix(path.normalize(out.entry)).replace(/^\.\//, '')
  return out
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2))
    if (args.help) {
      console.log('node tools/dong-goi-artifact.mjs [--entry index.html|mau.html] [--out <thư mục>] [--name <tên>]')
      process.exit(0)
    }
    const res = buildArtifact({ entry: args.entry })
    const base = path.basename(args.entry, path.extname(args.entry))
    const name = args.name || DEFAULT_NAMES[args.entry] || base
    const outDir = path.resolve(args.out || path.join(os.tmpdir(), 'bkn-artifact-' + base))
    mkdirSync(outDir, { recursive: true })
    writeFileSync(path.join(outDir, name + '.html'), res.page)
    writeFileSync(path.join(outDir, 'files.json'), JSON.stringify(res.files, null, 1) + '\n')
    console.log(`Trang ${args.entry} → ${path.join(outDir, name + '.html')} (${res.page.length} byte)`)
    console.log(`Tệp kèm: ${Object.keys(res.files).length} (files.json); module đã kiểm: ${res.modules.length}; tham chiếu trang: ${res.refs.length}; url() trong CSS: ${res.cssRefs.length}`)
    console.log('Đăng: dùng công cụ Artifact với file_path là trang trên và files là nội dung files.json (đường dẫn nguồn tính từ gốc repo).')
  } catch (err) {
    console.error('Không đóng gói được: ' + err.message)
    process.exit(1)
  }
}
