// Quét mã nguồn: cấm tên thương hiệu, game tham khảo, ngân hàng/ví/app giao hàng thật,
// và từ nội bộ lộ ra chuỗi hiển thị.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const BANNED = [
  'cooking mama', 'ipos', 'fabi', 'bánh mì bé xíu', 'một ổ nha', 'xôi bà tám', 'tiệm trà nhỏ', 'tiệm mì cay',
  'spaanimal', 'tiệm hoa sớm mai', 'michelin', 'momo', 'zalopay', 'vnpay', 'vietqr', 'napas', 'grab',
  'shopeefood', 'baemin', 'vietcombank', 'techcombank'
]

// Từ nội bộ không được lộ trong các file chứa chuỗi hiển thị.
const INTERNAL = ['TNC', 'seed']
const INTERNAL_WORDS = ['par', 'toast', 'chip', 'MV'] // so khớp nguyên từ
// M4: thêm src/data/rare.js (gánh hàng quê, khách lạ), src/data/mail.js (thư phiên bản 0.4.0 giải thích luật tip)
const DISPLAY_FILES = ['src/data/strings.js', 'src/data/dialogue.js', 'src/data/reviews.js', 'src/data/tips.js', 'src/data/incidents.js', 'src/data/rare.js',
  'src/data/mail.js']

const TEXT_EXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.md', '.svg', '.webmanifest', '.txt'])

function listFiles(dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) out.push(...listFiles(p))
    else if (TEXT_EXT.has(extname(name))) out.push(p)
  }
  return out
}

function targets() {
  const files = [...listFiles(join(ROOT, 'src')), ...listFiles(join(ROOT, 'css'))]
  for (const f of ['index.html', 'lab.html', 'manifest.webmanifest', 'sw.js']) {
    const p = join(ROOT, f)
    if (existsSync(p)) files.push(p)
  }
  return files
}

// Chuẩn hóa trước khi quét: bỏ giá trị CSS "cursor: grab/grabbing" (không phải tên thương hiệu).
function normalize(text) {
  return text.normalize('NFC').toLowerCase().replace(/cursor\s*:\s*(-webkit-)?grab(bing)?/g, 'cursor:_')
}

test('không có từ cấm trong src/, css/, index.html', () => {
  const hits = []
  for (const file of targets()) {
    const text = normalize(readFileSync(file, 'utf8'))
    for (const w of BANNED) {
      if (text.includes(w.normalize('NFC'))) hits.push(`${relative(ROOT, file)}: "${w}"`)
    }
  }
  assert.deepEqual(hits, [], 'Tìm thấy từ cấm:\n' + hits.join('\n'))
})

test('từ nội bộ không lộ trong file chuỗi hiển thị', () => {
  const hits = []
  for (const rel of DISPLAY_FILES) {
    const file = join(ROOT, rel)
    if (!existsSync(file)) continue
    const raw = readFileSync(file, 'utf8')
    const low = raw.toLowerCase()
    for (const w of INTERNAL) if (low.includes(w.toLowerCase())) hits.push(`${rel}: "${w}"`)
    for (const w of INTERNAL_WORDS) {
      // Chỉ xét phần nằm trong dấu nháy (chuỗi hiển thị).
      const strings = raw.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) || []
      const re = new RegExp(`(^|[^\\p{L}\\p{N}_])${w}($|[^\\p{L}\\p{N}_])`, w === 'MV' ? 'u' : 'iu')
      if (strings.some(s => re.test(s))) hits.push(`${rel}: "${w}"`)
    }
  }
  assert.deepEqual(hits, [], 'Lộ từ nội bộ:\n' + hits.join('\n'))
})

test('bộ quét thật sự phát hiện được từ cấm', () => {
  assert.ok(normalize('Thanh toán qua MoMo').includes('momo'))
  assert.ok(!normalize('.x { cursor: grab }').includes('grab'))
})

// Vòng soát lỗi M3: chuỗi hiển thị (chuỗi có chữ tiếng Việt có dấu) không lộ đơn vị kỹ thuật như "14px".
test('chuỗi hiển thị không có đơn vị "px"', () => {
  const hits = []
  const files = [...listFiles(join(ROOT, 'src', 'ui')), ...DISPLAY_FILES.map(r => join(ROOT, r))].filter(f => /\.m?js$/.test(f) && existsSync(f))
  const viet = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i
  for (const file of files) {
    const raw = readFileSync(file, 'utf8')
    const strings = raw.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) || []
    for (const s of strings) {
      if (viet.test(s) && /(\d|\})\s*px\b/.test(s)) hits.push(`${relative(ROOT, file)}: ${s.slice(0, 60)}`)
    }
  }
  assert.deepEqual(hits, [], 'Chuỗi hiển thị có "px":\n' + hits.join('\n'))
  // bộ quét bắt được mẫu cũ
  assert.ok(/(\d|\})\s*px\b/.test('`Lệch ${n}px`') && viet.test('Lệch'))
})
