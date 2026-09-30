// E2E nền tảng M3 (Chromium 390×844 cảm ứng):
// (5) chơi được offline sau lần mở đầu: chờ service worker, tải lại, mất mạng → tải lại vẫn vào màn Chuẩn bị, mở ca, có khách;
// bản mới của game: nút "Có bản mới – Tải lại" ở màn Chuẩn bị (không bao giờ giữa ca), bấm thì dùng bản mới, tiến trình giữ nguyên;
// sao lưu: xuất mã (và tải file) → máy mới (localStorage trống) nhập mã → xem trước đúng → xác nhận → dữ liệu khớp;
// mã sai 1 ký tự → báo lỗi thân thiện; "Chơi lại từ đầu" (2 bước) → bản cũ còn trong khóa lưu trữ, khôi phục lại được;
// màn Cài đặt: công tắc lưu vào save, nhắc sao lưu sau 7 ngày thật, bố cục 360×740 (không tràn, chạm ≥ 44px, chữ ≥ 14px).
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import path from 'node:path'
import { readFile, stat } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { T, openGame, loadPlaywright, readSave, waitSave, seedSave, claimCheckinIfShown, enterPrep, waitCustomerOrEnd, waitController, pollEval } from './helpers.mjs'
import { MIME } from '../helpers/static-server.mjs'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { readCode, importCode, exportCode } from '../../src/core/save.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx, vn } from '../helpers/meta-helpers.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const VERSION = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version

// Save đã chơi `shifts` ca (mỗi ca một ngày thật từ `at`).
function builtSave({ seed = 3, shifts = 3, at = '2026-09-20T08:00', name = 'Xe Sao Lưu Cô Ba' } = {}) {
  const ctx = makeMetaCtx({ at, attach: true })
  const state = defaultState(seed, DATA)
  ctx.setState(state)
  state.shopName = name
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  for (let i = 0; i < shifts; i++) {
    playShift(state, ctx)
    ctx.clock.t += 24 * 3600 * 1000
  }
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  return state
}

// Soát bố cục màn hiện tại (giống m2-ui): tràn ngang, chữ < 14px, vùng chạm < 44px.
async function layoutIssues(page) {
  return page.evaluate(() => {
    const out = []
    const s = document.getElementById('screen')
    const ov = Math.max(document.documentElement.scrollWidth - window.innerWidth, s ? s.scrollWidth - s.clientWidth : 0)
    if (ov > 0) out.push('tràn ngang ' + ov + 'px')
    const vis = el => {
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false
      const b = el.getBoundingClientRect()
      return b.width > 0 && b.height > 0
    }
    const name = el => (el.dataset && el.dataset.testid) || String(el.className || el.tagName).split(' ')[0]
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const seen = new Set()
    while (walker.nextNode()) {
      const t = walker.currentNode
      const el = t.parentElement
      if (!t.textContent.trim() || !el || el.closest('svg') || seen.has(el)) continue
      seen.add(el)
      if (!vis(el)) continue
      const fs = parseFloat(getComputedStyle(el).fontSize)
      if (fs < 14) out.push(`chữ ${fs}px ở ${name(el)}: "${t.textContent.trim().slice(0, 30)}"`)
    }
    for (const el of document.querySelectorAll('button, a, input, select, [role=button], summary')) {
      if (!vis(el) || el.type === 'checkbox') continue
      const b = el.getBoundingClientRect()
      if (b.height < 43.5 || b.width < 43.5) out.push(`vùng chạm ${Math.round(b.width)}×${Math.round(b.height)} ở ${name(el)}`)
    }
    return out
  })
}

// Máy chủ tĩnh có thể thay nội dung sw.js (giả lập phát hành bản mới); setAppVersion thay cả APP_VERSION của app.js.
// host: tên máy trong địa chỉ trả về (vd 'bkn.localhost' — không phải localhost/127.0.0.1 nên sw.js không tải lại nền,
// giống máy chủ thật; trình duyệt phải chạy với --host-resolver-rules trỏ tên này về 127.0.0.1).
function startSwServer({ host = '127.0.0.1' } = {}) {
  const over = { sw: null, app: null }
  const server = http.createServer(async (req, res) => {
    try {
      let rel = decodeURIComponent((req.url || '/').split('?')[0])
      if (rel.endsWith('/')) rel += 'index.html'
      const full = path.resolve(ROOT, '.' + path.posix.normalize('/' + rel))
      if (!full.startsWith(ROOT + path.sep)) throw new Error('ngoài gốc')
      let body = null
      if (rel === '/sw.js' && over.sw) body = Buffer.from(over.sw, 'utf8')
      else if (rel === '/src/ui/app.js' && over.app) body = Buffer.from(over.app, 'utf8')
      else if ((await stat(full)).isFile()) body = await readFile(full)
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
      res.end(body)
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end('Không tìm thấy')
    }
  })
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({
    url: `http://${host}:${server.address().port}/`,
    setSwVersion(v) { over.sw = readFileSync(path.join(ROOT, 'sw.js'), 'utf8').replace(`const VERSION = '${VERSION}'`, `const VERSION = '${v}'`) },
    setAppVersion(v) { over.app = readFileSync(path.join(ROOT, 'src/ui/app.js'), 'utf8').replace(`APP_VERSION = '${VERSION}'`, `APP_VERSION = '${v}'`) },
    close: () => new Promise(r => { server.closeAllConnections?.(); server.close(() => r()) })
  })))
}

test('(5) chơi được offline sau lần mở đầu: tải lại khi mất mạng vẫn vào màn Chuẩn bị, mở ca, có khách', { timeout: 180000 }, async () => {
  const g = await openGame({ name: 'offline' })
  const { page, context, errors } = g
  try {
    await page.goto(g.url('/?seed=42&test=1'))
    await page.waitForSelector(T('shop-name-input'))
    await waitController(page)
    const keys = await page.evaluate(() => caches.keys())
    assert.deepEqual(keys, ['bkn-' + VERSION], 'cache theo phiên bản')
    await page.fill(T('shop-name-input'), 'Xe Mất Mạng')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await claimCheckinIfShown(g, 3000)
    await page.reload()
    await page.waitForSelector(T('start-button'))

    await context.setOffline(true)
    assert.equal(await page.evaluate(() => navigator.onLine), false)
    await page.reload()
    await page.waitForSelector(T('start-button'))
    assert.equal(await page.textContent('.title-shop'), 'Xe Mất Mạng')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await g.shot('offline-chuan-bi')
    // Cài đặt báo đã sẵn sàng chơi offline
    await page.tap(T('open-settings'))
    await page.waitForSelector(T('screen-settings'))
    assert.match(await page.textContent(T('offline-state')), /sẵn sàng chơi khi không có mạng/)
    await page.tap(T('meta-back'))
    await page.waitForSelector(T('screen-prep'))
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    assert.equal(await waitCustomerOrEnd(g), 'customer')
    await page.waitForSelector(T('speech-bubble'))
    await g.shot('offline-trong-ca')
    const s = await waitSave(page, st => !!st.shift)
    assert.equal(s.shopName, 'Xe Mất Mạng')
    assert.equal(s.shift.day, 1)
    await context.setOffline(false)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('bản mới của game: nút Tải lại chỉ ở màn Chuẩn bị, không bật giữa ca; bấm thì dùng bản mới, tiến trình giữ nguyên', { timeout: 180000 }, async () => {
  const { chromium } = loadPlaywright()
  const srv = await startSwServer()
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text()}`) })
  const g = { page, shot: async () => {} }
  const update = () => page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()))
  const waitingState = () => page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => (r.waiting ? r.waiting.state : null)))
  try {
    await page.goto(srv.url + '?seed=42&test=1')
    await page.waitForSelector(T('shop-name-input'))
    await waitController(page)
    await page.fill(T('shop-name-input'), 'Xe Bản Mới')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await claimCheckinIfShown(g, 3000)
    assert.equal(!!(await page.$(T('update-ready'))), false, 'chưa có bản mới thì không hiện nút')

    // phát hành bản mới khi đang ở màn Chuẩn bị: nút hiện ngay
    srv.setSwVersion(VERSION + '-moi')
    await update()
    await page.waitForSelector(T('update-ready'), { timeout: 20000 })
    assert.match(await page.textContent(T('update-ready')), /Có bản mới/)
    assert.equal(await waitingState(), 'installed', 'bản mới chờ, không tự kích hoạt')
    await Promise.all([page.waitForEvent('load', { timeout: 20000 }), page.tap(T('update-reload'))])
    await page.waitForSelector(T('start-button'))
    // cache bản cũ đã dọn, chỉ còn bản mới (thăm dò bằng evaluate: waitForFunction không chờ Promise)
    await pollEval(page, v => caches.keys().then(k => k.length === 1 && k[0] === 'bkn-' + v), VERSION + '-moi', { timeout: 10000, label: 'chỉ còn cache bản mới' })
    assert.deepEqual(await page.evaluate(() => caches.keys()), ['bkn-' + VERSION + '-moi'])
    assert.equal(await page.textContent('.title-shop'), 'Xe Bản Mới', 'tiến trình giữ nguyên')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    assert.equal(!!(await page.$(T('update-ready'))), false)

    // bản mới nữa phát hành GIỮA CA: không hiện nút, không tự đổi bản, tải lại vẫn bán tiếp
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    srv.setSwVersion(VERSION + '-moi2')
    await update()
    await pollEval(page, () => navigator.serviceWorker.getRegistration().then(r => !!(r.waiting && r.waiting.state === 'installed')), null, { timeout: 20000, label: 'bản mới cài xong, đang chờ' })
    assert.equal(await waitingState(), 'installed', 'bản mới đã cài xong trước khi kiểm tra nút')
    await page.waitForTimeout(400)
    assert.equal(!!(await page.$(T('update-ready'))), false, 'không bao giờ hiện giữa ca')
    assert.ok(await page.$(T('screen-service')))
    await page.reload()
    await page.waitForSelector(T('screen-service'))   // ca đang dở: mở thẳng màn bán hàng
    await page.waitForTimeout(400)
    assert.equal(!!(await page.$(T('update-ready'))), false)
    assert.equal(await waitingState(), 'installed', 'bản mới vẫn chờ tới khi xong ca')
    assert.deepEqual((await page.evaluate(() => caches.keys())).sort(), ['bkn-' + VERSION + '-moi', 'bkn-' + VERSION + '-moi2'], 'bản đang dùng và bản đang chờ')
    const s = await readSave(page)
    assert.ok(s.shift, 'ca vẫn đang dở')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
    await srv.close()
  }
})

test('bản mới tự kích hoạt khi đóng hết tab giữa ca (máy chủ không phải localhost): ca giữ nguyên, báo phiên bản mới', { timeout: 180000 }, async () => {
  const { chromium } = loadPlaywright()
  const HOST = 'bkn.localhost'
  const srv = await startSwServer({ host: HOST })
  const origin = srv.url.replace(/\/$/, '')
  const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1`, `--unsafely-treat-insecure-origin-as-secure=${origin}`] })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })
  const errors = []
  const watch = p => {
    p.on('pageerror', e => errors.push('pageerror: ' + e.message))
    p.on('console', m => { if (m.type() === 'error') errors.push(`console.${m.type()}: ${m.text()}`) })
  }
  let page = await context.newPage()
  watch(page)
  const NEW = VERSION + '-giua-ca'
  try {
    await page.goto(srv.url + '?seed=42&test=1')
    await page.waitForSelector(T('shop-name-input'))
    await waitController(page)
    assert.equal(await page.evaluate(() => isSecureContext), true)
    await page.fill(T('shop-name-input'), 'Xe Đổi Bản')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await claimCheckinIfShown({ page, shot: async () => {} }, 3000)
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    const s0 = await waitSave(page, st => !!(st.shift && st.shift.appVersion))
    assert.equal(s0.shift.appVersion, VERSION, 'ca ghi phiên bản lúc mở ca')
    // phát hành bản mới GIỮA CA: bản mới cài xong và chờ, không hiện nút
    srv.setSwVersion(NEW)
    srv.setAppVersion(NEW)
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()))
    await pollEval(page, () => navigator.serviceWorker.getRegistration().then(r => !!(r.waiting && r.waiting.state === 'installed')), null, { timeout: 20000, label: 'bản mới chờ' })
    assert.equal(!!(await page.$(T('update-ready'))), false, 'không hiện nút giữa ca')
    // người chơi đóng app (hết tab) rồi mở lại: trình duyệt kích hoạt bản chờ
    await page.close()
    await new Promise(r => setTimeout(r, 1000))
    page = await context.newPage()
    watch(page)
    await page.goto(srv.url)
    await page.waitForSelector(T('screen-service'), { timeout: 15000 })
    const running = await page.evaluate(() => import('./src/ui/app.js').then(m => m.APP_VERSION))
    assert.equal(running, NEW, 'bản mới chạy sau khi mở lại (đúng hành vi trình duyệt, tài liệu mục 16.1)')
    await page.waitForSelector(T('version-toast'), { timeout: 5000 })
    assert.match(await page.textContent(T('version-toast')), new RegExp(`phiên bản ${NEW.replace(/\./g, '\\.')}.*Ca đang bán vẫn giữ nguyên`))
    const s1 = await waitSave(page, st => !!(st.shift && st.shift.appVersion === NEW))
    assert.equal(s1.shift.day, s0.shift.day, 'ca dở giữ nguyên')
    assert.equal(s1.wallet, s0.wallet)
    assert.deepEqual(await page.evaluate(() => caches.keys()), ['bkn-' + NEW])
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
    await srv.close()
  }
})

test('sao lưu: xuất mã + tải file → máy mới nhập mã (xem trước đúng) → dữ liệu khớp; mã sai 1 ký tự báo lỗi thân thiện', { timeout: 180000 }, async () => {
  const g = await openGame({ name: 'sao-luu' })
  const { page, browser, errors } = g
  let ctxB = null
  try {
    const state = builtSave()
    state.goldSpoons = 37
    await seedSave(page, state)
    await enterPrep(g)
    await claimCheckinIfShown(g, 2000)
    const orig = await readSave(page)
    assert.equal(orig.shopName, 'Xe Sao Lưu Cô Ba')
    assert.equal(orig.backup.lastAt, 0)
    // trang HTTPS thật cho chép vào bộ nhớ tạm; Chromium thử nghiệm cần cấp quyền (chép thất bại thì game KHÔNG ghi mốc
    // "đã sao lưu" — e2e review-m3-ux kiểm trường hợp đó)
    await g.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: g.url('').replace(/\/$/, '') })

    await page.tap(T('open-settings'))
    await page.waitForSelector(T('screen-settings'))
    assert.match(await page.textContent(T('backup-last')), /Chưa sao lưu/)
    await page.tap(T('backup-copy'))
    await page.waitForSelector(T('backup-code-modal'))
    const code = await page.inputValue(T('backup-code'))
    assert.match(code, /^BKN1\.z\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/)
    assert.ok(await page.textContent(T('backup-copy-status')))
    assert.equal(await page.getAttribute(T('backup-copy-status'), 'data-copied'), 'true', 'đã chép vào bộ nhớ tạm')
    await g.shot('ma-sao-luu')
    await page.tap(T('backup-done'))
    await page.waitForSelector(T('backup-code-modal'), { state: 'detached' })
    const afterCopy = await waitSave(page, s => s.backup.lastAt > 0)
    assert.match(await page.textContent(T('backup-last')), /Lần sao lưu gần nhất: \d\d\/\d\d\/\d{4} \d\d:\d\d/)
    // mã chứa đúng bản đang chơi
    const fromCode = importCode(code, DATA)
    for (const k of ['shopName', 'day', 'wallet', 'reputation', 'goldSpoons', 'seed']) assert.deepEqual(fromCode[k], afterCopy[k], k)
    assert.deepEqual(Object.keys(fromCode.recipes).sort(), Object.keys(afterCopy.recipes).sort())

    // tải file sao lưu (.txt): đọc lại được bằng readCode
    const [dl] = await Promise.all([page.waitForEvent('download'), page.tap(T('backup-download'))])
    assert.match(dl.suggestedFilename(), /^bep-khoi-nghiep-xe-sao-luu-co-ba-ngay-\d+-\d{8}\.txt$/)
    const fileText = readFileSync(await dl.path(), 'utf8')
    assert.match(fileText, /Bếp Khởi Nghiệp – mã sao lưu/)
    const fromFile = readCode(fileText, DATA)
    assert.equal(fromFile.ok, true)
    assert.equal(fromFile.state.shopName, 'Xe Sao Lưu Cô Ba')

    // ---- máy mới: ngữ cảnh trình duyệt khác, localStorage trống ----
    ctxB = await browser.newContext({ viewport: g.viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })
    const pb = await ctxB.newPage()
    pb.on('pageerror', e => errors.push('B pageerror: ' + e.message))
    pb.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`B console.${m.type()}: ${m.text()}`) })
    await pb.goto(g.url('/'))
    await pb.waitForSelector(T('shop-name-input'))
    assert.equal((await readSave(pb)).shopName, '', 'máy mới chưa có tiến trình')
    await pb.tap(T('title-import'))
    await pb.waitForSelector(T('backup-import-modal'))
    // chưa dán gì
    await pb.tap(T('backup-check'))
    await pb.waitForSelector(`${T('backup-error')}:not([hidden])`)
    assert.match(await pb.textContent(T('backup-error')), /Chưa có mã/)
    // sai 1 ký tự ở giữa mã
    const i = Math.floor(code.length / 2)
    const bad = code.slice(0, i) + (code[i] === 'A' ? 'B' : 'A') + code.slice(i + 1)
    await pb.fill(T('backup-input'), bad)
    await pb.tap(T('backup-check'))
    await pb.waitForSelector(`${T('backup-error')}:not([hidden])`)
    assert.match(await pb.textContent(T('backup-error')), /sai hoặc thiếu ký tự/)
    assert.equal(await pb.isVisible(T('backup-confirm')), false, 'mã sai thì không cho ghi đè')
    // không phải mã
    await pb.fill(T('backup-input'), 'Xin chào Dì Sáu')
    await pb.tap(T('backup-check'))
    assert.match(await pb.textContent(T('backup-error')), /không phải mã sao lưu/)
    // mã đúng, dán kèm xuống dòng như chép từ tin nhắn
    await pb.fill(T('backup-input'), '\n  ' + code.match(/.{1,70}/g).join('\n') + '  \n')
    await pb.tap(T('backup-check'))
    await pb.waitForSelector(T('backup-preview'))
    assert.equal(await pb.isVisible(T('backup-error')), false)
    const pv = await pb.$eval(T('backup-preview'), el => ({ ...el.dataset }))
    assert.equal(pv.shop, 'Xe Sao Lưu Cô Ba')
    assert.equal(Number(pv.day), afterCopy.day)
    assert.equal(Number(pv.wallet), afterCopy.wallet)
    assert.equal(Number(pv.chang), 1)
    assert.equal(Number(pv.recipes), Object.keys(afterCopy.recipes).length)
    const pvText = await pb.textContent(T('backup-preview'))
    assert.match(pvText, /Xe Sao Lưu Cô Ba/)
    assert.match(pvText, new RegExp(`Ngày ${afterCopy.day}`))
    assert.match(pvText, /Xe đẩy đầu hẻm/)
    await pb.tap(T('backup-confirm'))
    await pb.waitForSelector(T('backup-import-modal'), { state: 'detached' })
    await pb.waitForSelector(T('screen-title'))
    assert.equal(await pb.textContent('.title-shop'), 'Xe Sao Lưu Cô Ba')
    const bSave = await waitSave(pb, s => s.shopName === 'Xe Sao Lưu Cô Ba')
    for (const k of ['day', 'wallet', 'reputation', 'goldSpoons', 'seed', 'chang', 'ratings', 'recipes', 'upgrades', 'history', 'reviews', 'stats', 'tipsSeen', 'checkin', 'chains', 'eventRecipes', 'items']) {
      assert.deepEqual(bSave[k], afterCopy[k], 'lệch ' + k)
    }
    // bản trống ban đầu của máy mới cũng được cất (không xóa gì)
    const archived = await pb.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('bkn.save.old.')))
    assert.equal(archived.length, 1)
    // vào chơi tiếp được
    await pb.tap(T('start-button'))
    await pb.waitForSelector(T('screen-prep'))
    assert.match(await pb.textContent(T('prep-day')), new RegExp(`Ngày ${afterCopy.day}`))
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    if (ctxB) await ctxB.close().catch(() => {})
    await g.close()
  }
})

test('Chơi lại từ đầu: xác nhận 2 bước, bản cũ cất trong khóa lưu trữ (không xóa), khôi phục lại được', { timeout: 180000 }, async () => {
  const g = await openGame({ name: 'choi-lai' })
  const { page, errors } = g
  try {
    const state = builtSave({ seed: 9, shifts: 2, name: 'Xe Cũ Của Tui' })
    await seedSave(page, state)
    await enterPrep(g)
    await claimCheckinIfShown(g, 2000)
    const old = await readSave(page)
    await page.tap(T('open-settings'))
    await page.waitForSelector(T('screen-settings'))
    // bước 1 → Thôi: không đổi gì
    await page.tap(T('reset-game'))
    await page.waitForSelector(T('reset-step1'))
    assert.match(await page.textContent(T('reset-step1')), /không bị xóa/)
    await page.tap(T('reset-cancel'))
    await page.waitForSelector(T('reset-step1'), { state: 'detached' })
    assert.equal((await readSave(page)).shopName, 'Xe Cũ Của Tui')
    // bước 2 → Thôi: vẫn không đổi
    await page.tap(T('reset-game'))
    await page.tap(T('reset-next'))
    await page.waitForSelector(T('reset-step2'))
    await page.tap(T('reset-cancel'))
    await page.waitForSelector(T('reset-step2'), { state: 'detached' })
    assert.equal((await readSave(page)).shopName, 'Xe Cũ Của Tui')
    assert.equal(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('bkn.save.old.')).length), 0)
    // đủ 2 bước
    await page.tap(T('reset-game'))
    await page.tap(T('reset-next'))
    await page.waitForSelector(T('reset-step2'))
    await g.shot('choi-lai-buoc-2')
    await page.tap(T('reset-confirm'))
    await page.waitForSelector(T('shop-name-input'))
    const fresh = await waitSave(page, s => s.shopName === '' && s.day === 1)
    assert.equal(fresh.wallet, DATA.BALANCE.startWallet)
    assert.equal(fresh.history.length, 0)
    assert.ok(fresh.rev > old.rev, 'số hiệu bản ghi nối tiếp (tab cũ tự khóa)')
    const arch = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('bkn.save.old.')).map(k => [k, localStorage.getItem(k)]))
    assert.equal(arch.length, 1, 'bản cũ được cất')
    assert.match(arch[0][0], /^bkn\.save\.old\.\d{13}$/)
    const back = importCode(arch[0][1], DATA)
    assert.equal(back.shopName, 'Xe Cũ Của Tui')
    assert.equal(back.day, old.day)
    assert.equal(back.wallet, old.wallet)
    assert.deepEqual(back.history, old.history)
    // xe mới, rồi khôi phục bản đã cất từ Cài đặt
    await page.fill(T('shop-name-input'), 'Xe Mới Toanh')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await claimCheckinIfShown(g, 3000)
    await page.tap(T('open-settings'))
    await page.waitForSelector(T('archive-list'))
    await page.tap(`${T('archive-list')} summary`)
    const at = arch[0][0].split('.').pop()
    await page.tap(T('archive-restore-' + at))
    await page.waitForSelector(T('backup-preview'))
    assert.equal(await page.getAttribute(T('backup-preview'), 'data-shop'), 'Xe Cũ Của Tui')
    assert.match(await page.textContent(T('backup-preview')), /Bản hiện tại/)
    await page.tap(T('backup-confirm'))
    await page.waitForSelector(T('screen-title'))
    const restored = await waitSave(page, s => s.shopName === 'Xe Cũ Của Tui')
    assert.equal(restored.day, old.day)
    assert.equal(restored.wallet, old.wallet)
    const codes = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('bkn.save.old.')).map(k => localStorage.getItem(k)))
    assert.equal(codes.length, 2, 'bản "Xe Mới Toanh" cũng được cất, bản cũ vẫn còn')
    assert.deepEqual(codes.map(c => importCode(c, DATA).shopName).sort(), ['Xe Cũ Của Tui', 'Xe Mới Toanh'])
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('Cài đặt: nhắc sao lưu sau 7 ngày thật, công tắc lưu vào save, cài game, giới thiệu, bố cục 360×740', { timeout: 180000 }, async () => {
  const g = await openGame({ name: 'cai-dat', viewport: { width: 360, height: 740 } })
  const { page, errors } = g
  const problems = []
  const check = async label => {
    await page.waitForTimeout(150)
    for (const p of await layoutIssues(page)) problems.push(`${label}: ${p}`)
  }
  try {
    const state = builtSave({ seed: 4, shifts: 2 })
    state.checkin.lastDay = '2026-10-02'
    state.backup = { lastAt: vn('2026-09-24T09:00'), since: vn('2026-09-20T09:00') }
    await seedSave(page, state)
    await g.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: g.url('').replace(/\/$/, '') })
    await enterPrep(g, '?devNow=2026-10-02T09:00')
    await page.waitForSelector(T('backup-reminder'))
    assert.equal(!!(await page.$(T('setting-sound'))), false, 'đã gỡ công tắc cài đặt rời ở màn Chuẩn bị')
    await page.waitForTimeout(2500)   // chờ thông báo thư tắt
    await check('Chuẩn bị')
    await page.tap(T('backup-reminder'))
    await page.waitForSelector(T('screen-settings'))
    // cuộn tới mục Sao lưu
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="settings-backup"]')
      const r = el.getBoundingClientRect()
      return r.top < window.innerHeight && r.bottom > 0
    })
    await page.evaluate(() => { document.getElementById('screen').scrollTop = 0 })
    await check('Cài đặt')
    await g.shot('cai-dat')

    // công tắc và âm lượng lưu ngay vào save
    await page.tap(T('setting-sound'))
    let s = await waitSave(page, st => st.settings.sound === false)
    assert.equal(await page.isDisabled(T('setting-volume')), true, 'tắt tiếng thì khóa âm lượng')
    await page.tap(T('setting-sound'))
    s = await waitSave(page, st => st.settings.sound === true)
    await page.$eval(T('setting-volume'), el => { el.value = '50'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) })
    s = await waitSave(page, st => st.settings.volume === 0.5)
    assert.equal(await page.textContent(T('setting-volume-value')), '50%')
    await page.tap(T('setting-incident-it'))
    s = await waitSave(page, st => st.settings.incidentFrequency === 'it')
    assert.equal(await page.getAttribute(T('setting-incident-it'), 'aria-checked'), 'true')
    await page.tap(T('setting-assistMotion'))
    s = await waitSave(page, st => st.settings.assistMotion === true)
    await page.tap(T('setting-reducedMotion'))
    s = await waitSave(page, st => st.settings.reducedMotion === true)
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('reduce-motion')), true)
    await page.tap(T('setting-tips'))
    s = await waitSave(page, st => st.settings.tips === false)
    await page.tap(T('setting-assistCash'))
    s = await waitSave(page, st => st.settings.assistCash === true && st.settings.vibrate === true)

    // phiên bản, giới thiệu
    assert.match(await page.textContent(T('app-version')), new RegExp(VERSION.replace(/\./g, '\\.')))
    await page.tap(T('open-about'))
    await page.waitForSelector(T('about-modal'))
    const about = await page.textContent(T('about-modal'))
    assert.match(about, /hư cấu/)
    assert.match(about, /số liệu minh họa/)
    assert.match(about, /không liên quan tới thương hiệu/)
    await check('Giới thiệu')
    await page.tap(T('about-close'))
    await page.waitForSelector(T('about-modal'), { state: 'detached' })
    // cài game: trình duyệt thử nghiệm không có hộp cài → hiện hướng dẫn
    await page.tap(T('install-app'))
    await page.waitForSelector(T('install-hint'))
    assert.match(await page.textContent(T('install-hint')), /Thêm vào màn hình chính|Cài đặt ứng dụng/)
    await page.tap(T('install-hint-ok'))
    await page.waitForSelector(T('install-hint'), { state: 'detached' })
    // hộp nhập mã: bố cục
    await page.tap(T('backup-import'))
    await page.waitForSelector(T('backup-import-modal'))
    await page.fill(T('backup-input'), exportCode(s))
    await page.tap(T('backup-check'))
    await page.waitForSelector(T('backup-preview'))
    await check('Nhập mã')
    await g.shot('nhap-ma')
    await page.tap(T('backup-cancel'))
    await page.waitForSelector(T('backup-import-modal'), { state: 'detached' })
    // sao lưu xong thì hết nhắc
    await page.tap(T('backup-copy'))
    await page.waitForSelector(`${T('backup-copy-status')}[data-copied="true"]`)
    await page.tap(T('backup-done'))
    await page.tap(T('meta-back'))
    await page.waitForSelector(T('screen-prep'))
    assert.equal(!!(await page.$(T('backup-reminder'))), false, 'vừa sao lưu thì không nhắc')
    // Back của điện thoại ở màn Cài đặt về màn Chuẩn bị
    await page.tap(T('open-settings'))
    await page.waitForSelector(T('screen-settings'))
    await page.goBack()
    await page.waitForSelector(T('screen-prep'))
    assert.deepEqual(problems, [], 'lỗi bố cục:\n' + problems.join('\n'))
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
