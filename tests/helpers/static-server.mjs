// Máy chủ tĩnh tối giản (node:http) phục vụ gốc repo. Dùng cho `npm run serve` và e2e.
// Chạy trực tiếp: node tests/helpers/static-server.mjs 8080
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
  '.ico': 'image/x-icon',
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

function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    res.end()
    return
  }
  resolveFile(req.url || '/').then(async file => {
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end('Không tìm thấy')
      return
    }
    const body = await readFile(file)
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      'Date': new Date().toUTCString()
    })
    res.end(req.method === 'HEAD' ? undefined : body)
  }).catch(() => {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Lỗi máy chủ')
  })
}

// Khởi động máy chủ; port = 0 → cổng ngẫu nhiên. Trả {url, port, close()}.
export function startServer(port = 0, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler)
    server.on('error', reject)
    server.listen(port, host, () => {
      const p = server.address().port
      resolve({
        url: `http://${host}:${p}/`,
        port: p,
        close: () => new Promise(r => { server.closeAllConnections?.(); server.close(() => r()) })
      })
    })
  })
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const port = Number(process.argv[2]) || 8080
  startServer(port, '0.0.0.0').then(({ port: p }) => {
    console.log(`Bếp Khởi Nghiệp đang chạy tại http://localhost:${p}/`)
  }).catch(err => {
    console.error('Không khởi động được máy chủ:', err.message)
    process.exit(1)
  })
}
