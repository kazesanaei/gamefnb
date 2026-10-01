// E2E: game chạy dưới đường dẫn con /gamefnb/ giống GitHub Pages của kho dự án (https://<tài-khoản>.github.io/gamefnb/).
// Máy chủ tĩnh chỉ phục vụ gốc repo dưới /gamefnb/ (ngoài đó trả 404), nên mọi đường dẫn tuyệt đối "/..." trong game
// (manifest, service worker, biểu tượng, CSS, module, fetch) đều lộ ra thành lỗi 404.
// Kịch bản (Chromium 390×844 cảm ứng, localStorage trống): vào /gamefnb (thiếu / cuối → chuyển sang /gamefnb/) → không lỗi
// console/404 → đặt tên xe → mở hàng → phục vụ xong 1 khách qua 4 khâu → service worker kích hoạt với scope /gamefnb/,
// cache chỉ chứa tệp dưới /gamefnb/ → chơi hết ca → mất mạng → tải lại vẫn vào màn Chuẩn bị, mở ca, có khách.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  T, openGame, claimCheckinIfShown, waitCustomerOrEnd, serveAtCounter, cookAndServe, playShiftUi,
  readSave, waitSave, waitController
} from './helpers.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const VERSION = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version
const BASE = '/gamefnb'

test('chạy dưới đường dẫn con /gamefnb/ (như GitHub Pages): không 404, chơi 1 khách, service worker scope /gamefnb/, mất mạng vẫn mở ca', { timeout: 600000 }, async () => {
  // yêu cầu tới máy chủ trượt khỏi /gamefnb/ (đường dẫn tuyệt đối) hoặc lỗi ≥ 400 — soát ở máy chủ nên tính cả yêu cầu
  // do service worker gửi (cài đặt, tải nền), vốn không hiện ở page.on('response')
  const stray = []
  const g = await openGame({
    clock: true,
    name: 'duong-dan-con',
    basePath: BASE,
    onResponse: ({ url, status }) => {
      const p = url.split('?')[0]
      if (status >= 400 || !(p === BASE || p.startsWith(BASE + '/'))) stray.push(`${status} ${url}`)
    }
  })
  const { page, context, errors } = g
  // thêm một lớp soát ở cấp ngữ cảnh (gồm các trang/khung khác của ngữ cảnh)
  context.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} (ngữ cảnh): ${r.url()}`) })
  const origin = new URL(g.server.url).origin
  try {
    assert.equal(g.server.url, `${origin}${BASE}/`)

    // ---- vào trang: /gamefnb (thiếu / cuối) chuyển sang /gamefnb/, giữ query ----
    await page.goto(`${origin}${BASE}?seed=42&test=1`)
    assert.equal(page.url(), `${origin}${BASE}/?seed=42&test=1`)
    await page.waitForSelector(T('shop-name-input'))
    await g.shot('title')

    // manifest: start_url/scope phân giải về /gamefnb/; mọi biểu tượng tải được dưới /gamefnb/
    const man = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]')
      const res = await fetch(link.href)
      const json = await res.json()
      return {
        href: link.href,
        start: new URL(json.start_url, link.href).href,
        scope: new URL(json.scope, link.href).href,
        icons: await Promise.all(json.icons.map(async ic => {
          const u = new URL(ic.src, link.href).href
          const r = await fetch(u)
          return { url: u, status: r.status }
        }))
      }
    })
    assert.equal(man.href, `${origin}${BASE}/manifest.webmanifest`)
    assert.equal(man.start, `${origin}${BASE}/`)
    assert.equal(man.scope, `${origin}${BASE}/`)
    for (const ic of man.icons) {
      assert.ok(ic.url.startsWith(`${origin}${BASE}/icons/`), 'biểu tượng ngoài đường dẫn con: ' + ic.url)
      assert.equal(ic.status, 200, ic.url)
    }
    // biểu tượng/stylesheet khai báo trong trang đều nằm dưới /gamefnb/
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('link[href], script[src]')].map(e => e.href || e.src))
    for (const h of hrefs) assert.ok(h.startsWith(`${origin}${BASE}/`), 'tài nguyên ngoài đường dẫn con: ' + h)

    // ---- đặt tên xe → Chuẩn bị → mở hàng ----
    await page.fill(T('shop-name-input'), 'Xe Đường Dẫn Con')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await claimCheckinIfShown(g, 3000)
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    const first = await readSave(page)
    assert.equal(first.seed, 42)
    assert.equal(first.shopName, 'Xe Đường Dẫn Con')

    // ---- phục vụ xong 1 khách qua 4 khâu: Order → Thanh toán → Tính tiền → Làm đồ (bếp: Chọn, Thớt, mini-game) ----
    assert.equal(await waitCustomerOrEnd(g, { useClock: true }), 'customer')
    const order = await serveAtCounter(g)
    assert.ok(order.ticketId, 'chưa kẹp phiếu vào bếp')
    const res = await cookAndServe(g, order.ticketId, { shots: true })
    assert.ok(res.stars >= 4, `khách đầu tiên chỉ ${res.stars} sao`)
    // save ghi nhận khách đã được phục vụ trọn vẹn
    await waitSave(page, s => !!(s.shift && s.shift.served.includes(res.customerId)))
    // CSS bếp nạp động (new URL(..., import.meta.url)) cũng nằm dưới /gamefnb/
    const kitchenCss = await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.href).filter(h => h.includes('kitchen.css')))
    for (const h of kitchenCss) assert.ok(h.startsWith(`${origin}${BASE}/css/`), h)

    // ---- service worker: kích hoạt, scope /gamefnb/, cache chỉ chứa tệp của game dưới /gamefnb/ ----
    await waitController(page)
    const sw = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      const keys = await caches.keys()
      const urls = []
      for (const k of keys) for (const req of await (await caches.open(k)).keys()) urls.push(req.url)
      return { scope: reg.scope, script: reg.active.scriptURL, controller: navigator.serviceWorker.controller.scriptURL, keys, urls }
    })
    assert.equal(sw.scope, `${origin}${BASE}/`)
    assert.equal(sw.script, `${origin}${BASE}/sw.js`)
    assert.equal(sw.controller, `${origin}${BASE}/sw.js`)
    assert.deepEqual(sw.keys, ['bkn-' + VERSION])
    assert.ok(sw.urls.length > 50, 'cache quá ít tệp: ' + sw.urls.length)
    for (const u of sw.urls) assert.ok(u.startsWith(`${origin}${BASE}/`), 'cache tệp ngoài đường dẫn con: ' + u)
    for (const f of ['index.html', 'manifest.webmanifest', 'src/main.js', 'src/ui/minigames/_util.js', 'css/kitchen.css']) {
      assert.ok(sw.urls.includes(`${origin}${BASE}/${f}`), 'cache thiếu ' + f)
    }

    // ---- chơi hết ca (tải lại khi đang dở ca thì vào thẳng màn bán hàng) → sang ngày 2 → màn Chuẩn bị ----
    await page.click(T('tab-counter'), { timeout: 2000 }).catch(() => {})
    await playShiftUi(g, { useClock: true })
    await page.waitForSelector(T('summary'))
    await g.shot('tong-ket')
    await page.click(T('next-day'))
    await page.waitForSelector(T('open-shift'))
    await waitSave(page, s => !s.shift && s.day === 2)

    // ---- mất mạng: tải lại vẫn vào màn Chuẩn bị và mở ca được ----
    await context.setOffline(true)
    assert.equal(await page.evaluate(() => navigator.onLine), false)
    await page.reload()
    assert.equal(new URL(page.url()).pathname, `${BASE}/`)
    await page.waitForSelector(T('start-button'))
    assert.equal(await page.textContent('.title-shop'), 'Xe Đường Dẫn Con')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    assert.match(await page.textContent(T('prep-day')), /Ngày 2/)
    await claimCheckinIfShown(g, 1500)
    await g.shot('offline-chuan-bi')
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    assert.equal(await waitCustomerOrEnd(g, { useClock: true }), 'customer')
    await page.waitForSelector(T('speech-bubble'))
    await g.shot('offline-trong-ca')
    const s2 = await waitSave(page, st => !!st.shift)
    assert.equal(s2.shift.day, 2)
    await context.setOffline(false)

    assert.deepEqual(stray, [], 'yêu cầu trượt khỏi /gamefnb/ hoặc lỗi HTTP')
    assert.deepEqual(errors, [], 'có lỗi console/trang/HTTP')
  } finally {
    await g.close()
  }
})
