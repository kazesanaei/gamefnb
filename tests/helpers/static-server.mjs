// Máy chủ tĩnh tối giản (node:http) phục vụ gốc repo. Dùng cho `npm run serve` và e2e.
// Chạy trực tiếp: node tests/helpers/static-server.mjs 8080
// Thử dưới đường dẫn con như GitHub Pages: node tests/helpers/static-server.mjs 8080 /gamefnb → http://localhost:8080/gamefnb/
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
})

async function resolveFile(urlPath) {
  let rel
  try { rel = decodeURIComponent(urlPath.split('?')[0].split('#')[0]) } catch { return null }
  const full = path.resolve(ROOT, '.' + path.posix.normalize('/' + rel))
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return null
  try {
    const st = await stat(full)
    if (st.isDirectory()) {
      const idx = path.join(full, 'index.html')
      const s2 = await stat(idx).catch(() => null)
      return s2 && s2.isFile() ? idx : null
    }
    return st.isFile() ? full : null
  } catch {
    return null
  }
}

// Chuẩn hóa đường dẫn con: '' (mặc định, phục vụ ở gốc) hoặc '/ten' (có / đầu, không có / cuối).
export function normalizeBasePath(basePath) {
  const parts = String(basePath || '').split('/').filter(Boolean)
  return parts.length ? '/' + parts.join('/') : ''
}

// basePath '' → phục vụ gốc repo ở '/' (như cũ). basePath '/gamefnb' → gốc repo nằm dưới '/gamefnb/' giống GitHub Pages
// của một kho dự án: '/gamefnb' (thiếu / cuối) chuyển hướng 301 sang '/gamefnb/' (giữ query), ngoài '/gamefnb/' trả 404.
// onResponse(info) (tùy chọn): gọi sau mỗi yêu cầu với { method, url, status } (e2e soát yêu cầu trượt khỏi đường dẫn con).
function createHandler(base, onResponse) {
  return function handler(req, res) {
    const url = req.url || '/'
    const done = status => { if (onResponse) { try { onResponse({ method: req.method, url, status }) } catch { /* bỏ qua */ } } }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' })
      res.end()
      done(405)
      return
    }
    const notFound = () => {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end('Không tìm thấy')
      done(404)
    }
    let rest = url
    if (base) {
      const q = url.search(/[?#]/)
      const pathname = q < 0 ? url : url.slice(0, q)
      if (pathname === base) {
        res.writeHead(301, { Location: base + '/' + (q < 0 ? '' : url.slice(q)), 'Cache-Control': 'no-store' })
        res.end()
        done(301)
        return
      }
      if (!pathname.startsWith(base + '/')) { notFound(); return }
      rest = url.slice(base.length)
    }
    resolveFile(rest).then(async file => {
      if (!file) { notFound(); return }
      const body = await readFile(file)
      const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
      res.writeHead(200, {
        'Content-Type': type,
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
        'Date': new Date().toUTCString()
      })
      res.end(req.method === 'HEAD' ? undefined : body)
      done(200)
    }).catch(() => {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Lỗi máy chủ')
      done(500)
    })
  }
}

// Khởi động máy chủ; port = 0 → cổng ngẫu nhiên. Trả {url, port, close()}; url đã gồm đường dẫn con (vd .../gamefnb/).
// Tùy chọn: basePath (mặc định '' — phục vụ ở gốc như cũ), onResponse (xem createHandler).
export function startServer(port = 0, host = '127.0.0.1', { basePath = '', onResponse = null } = {}) {
  const base = normalizeBasePath(basePath)
  return new Promise((resolve, reject) => {
    const server = http.createServer(createHandler(base, onResponse))
    server.on('error', reject)
    server.listen(port, host, () => {
      const p = server.address().port
      resolve({
        url: `http://${host}:${p}${base}/`,
        basePath: base,
        port: p,
        close: () => new Promise(r => { server.closeAllConnections?.(); server.close(() => r()) })
      })
    })
  })
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const port = Number(process.argv[2]) || 8080
  const basePath = normalizeBasePath(process.argv[3])
  startServer(port, '0.0.0.0', { basePath }).then(({ port: p }) => {
    console.log(`Bếp Khởi Nghiệp đang chạy tại http://localhost:${p}${basePath}/`)
  }).catch(err => {
    console.error('Không khởi động được máy chủ:', err.message)
    process.exit(1)
  })
}
