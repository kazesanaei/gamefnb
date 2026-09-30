// Dựng biểu tượng PNG của game từ icons/icon.svg bằng Chromium (Playwright). Chạy 1 lần khi đổi hình:
//   node tools/make-icons.mjs
// Tạo (ghi đè) icons/icon-192.png, icons/icon-512.png, icons/apple-touch-icon.png (180×180). Các tệp PNG được commit
// cùng mã nguồn; game khi chạy không cần công cụ này. Chỉ đọc icon.svg và ghi 3 tệp PNG trên, không xóa gì.
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ICONS = path.join(ROOT, 'icons')
export const OUTPUTS = Object.freeze([
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 }
])

function loadPlaywright() {
  const require = createRequire(import.meta.url)
  try { return require('playwright') } catch { /* thử bản cài toàn cục */ }
  return require('/opt/node22/lib/node_modules/playwright')
}

// Đọc kích thước ảnh PNG (khối IHDR) để tự kiểm tra kết quả.
export function pngSize(buf) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (buf.length < 24 || !sig.every((b, i) => buf[i] === b)) return null
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

async function main() {
  const svg = readFileSync(path.join(ICONS, 'icon.svg'), 'utf8')
  const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64')
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch()
  try {
    for (const { file, size } of OUTPUTS) {
      const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
      await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}
        img{display:block;width:${size}px;height:${size}px}</style></head><body><img alt="" src="${dataUrl}"></body></html>`)
      await page.waitForFunction(() => { const i = document.querySelector('img'); return i && i.complete && i.naturalWidth > 0 })
      const png = await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size }, omitBackground: true })
      const dim = pngSize(png)
      if (!dim || dim.width !== size || dim.height !== size) throw new Error(`${file}: kích thước sai ${JSON.stringify(dim)}`)
      writeFileSync(path.join(ICONS, file), png)
      console.log(`Đã tạo icons/${file} (${size}×${size}, ${png.length} byte)`)
      await page.close()
    }
  } finally {
    await browser.close()
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch(err => {
    console.error('Không dựng được biểu tượng:', err.message)
    process.exit(1)
  })
}
