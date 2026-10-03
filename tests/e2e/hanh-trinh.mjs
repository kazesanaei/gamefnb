// Hành trình dài qua giao diện thật (chạy tay, KHÔNG nằm trong `npm run e2e`; khoảng 10–15 phút):
//   node tests/e2e/hanh-trinh.mjs                 (SHOT_DIR=<thư mục> để lưu ảnh NN-ten.png + journey-report.json; SEED=6)
// Chromium 390×844 cảm ứng, đồng hồ giả (bắt đầu 05/10/2026 07:30 giờ Việt Nam):
// save mới → ngày 1 (chụp từng khâu quầy, bếp, thẻ vào bước, các mini-game kể cả đập trứng / lắc M5, con dấu, phiếu chấm, Tổng kết) → ngày 2 (tải lại giữa ca) →
// ngày 3 (Cài đặt: tình huống "Nhiều", âm lượng; mua Bánh tráng trộn; mất mạng, chơi cả ca offline, gặp tình huống)
// → rút ngắn bằng lõi (người chơi hoàn hảo, tới sát điều kiện lên chặng) → sang ngày thật mới: Hộp thư, Việc hôm nay,
// Chợ Công Thức (mua Cà phê sữa đá), Sổ công thức (+ chi tiết, Sổ từ vùng miền), Sổ tay nghề, Cài đặt (chép mã sao lưu)
// → chơi thật tới khi đủ điều kiện lên Chặng 2 (hộp mời + màn "sắp khai trương") → 13/11: màn sự kiện Tri ân 20/11.
// Đo sau mỗi ca: phần tử DOM, bộ nghe bus / window / document, heap, phần tử tách rời còn giữ, số vòng rAF.
// Ghi mọi lỗi console/trang, thao tác kẹt, chữ lỗi (undefined/NaN/{biến}), chữ < 13px, vùng chạm < 44px, tràn ngang.
// Thoát mã 1 nếu có lỗi, bị kẹt hoặc không đủ điều kiện lên chặng. Kết quả lần chạy gần nhất: docs/kien-truc.md mục 18.
import http from 'node:http'
import path from 'node:path'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { T, waitController, loadPlaywright, serveAtCounter, cookAndServe, waitCustomerOrEnd, resolveIncidentIfShown, readSave, waitSave, claimCheckinIfShown } from './helpers.mjs'
import { MIME } from '../helpers/static-server.mjs'
import { DATA } from '../../src/data/index.js'
import { encodeSave, migrate, SAVE_KEY } from '../../src/core/save.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { checkStageUp } from '../../src/core/progression.js'
import { buyShopRecipe } from '../../src/core/shop.js'
import { playShift as simShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx, vn } from '../helpers/meta-helpers.mjs'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + path.sep
const OUT = process.env.SHOT_DIR ? path.resolve(process.env.SHOT_DIR) + path.sep : null
if (OUT) mkdirSync(OUT, { recursive: true })
const SEED = Number(process.env.SEED || 6)
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const report = { seed: SEED, errors: [], notes: [], metrics: [], shifts: [], shots: [], stuck: [], timings: {} }

// ---------- Máy chủ tĩnh + đo bộ nghe bus (chỉ trong phiên thử: bus.js được phục vụ kèm sổ đăng ký trên globalThis) ----------
function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let rel = decodeURIComponent((req.url || '/').split('?')[0])
      if (rel.endsWith('/')) rel += 'index.html'
      const full = path.resolve(R, '.' + path.posix.normalize('/' + rel))
      if (!full.startsWith(R)) throw new Error('ngoài gốc')
      if (!(await stat(full)).isFile()) throw new Error('không phải tệp')
      let body = await readFile(full)
      if (rel === '/src/core/bus.js') {
        body = Buffer.from(body.toString('utf8').replace('let handlers = Object.create(null)',
          'let handlers = Object.create(null); (globalThis.__bknBuses = globalThis.__bknBuses || []).push({ get h() { return handlers } })'), 'utf8')
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
      res.end(body)
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end('Không tìm thấy')
    }
  })
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${server.address().port}/`,
    close: () => new Promise(r => { server.closeAllConnections?.(); server.close(() => r()) })
  })))
}

// ---------- Ảnh chụp theo thứ tự cố định ----------
const SHOTS = {
  'title': '01-man-mo-dau', 'diem-danh': '02-diem-danh', 'prep': '03-chuan-bi',
  'quay-order': '04-quay-order', 'quay-doc-lai': '05-quay-doc-lai-don', 'thanh-toan': '06-quay-thanh-toan',
  'tinh-tien': '07-quay-tinh-tien-thoi-tien', 'phieu-thu': '08-quay-phieu-thu-kep-phieu', 'bep-day-phieu': '09-bep-day-phieu',
  'bep-ke-chon': '10-bep-ke-chon', 'bep-thot': '11-bep-thot-so-che', 'mg-cha-vet-ban': '12-mg-cha-rua',
  'mg-thai-ngam': '13-mg-thai', 'mg-dap': '14-mg-dap-trung', 'mg-lua': '15-mg-canh-lua',
  'mg-cham-nem': '16-mg-cham-nem', 'mg-rot': '17-mg-rot', 'mg-cham-vat': '18-mg-cham-vat', 'mg-lac': '19-mg-lac',
  'bep-cong-bo-mon': '20-bep-ra-mon', 'phieu-cham': '21-phieu-cham', 'tong-ket': '22-tong-ket',
  'cho-cong-thuc': '23-cho-cong-thuc', 'viec-hom-nay': '24-viec-hom-nay', 'hop-thu': '25-hop-thu', 'su-kien': '26-su-kien',
  'so-tay-nghe': '27-so-tay-nghe', 'so-cong-thuc': '28-so-cong-thuc', 'so-cong-thuc-chi-tiet': '29-so-cong-thuc-chi-tiet',
  'cai-dat': '30-cai-dat', 'sap-khai-truong': '31-sap-khai-truong',
  'tinh-huong': '32-tinh-huong-trong-ca', 'tinh-huong-ket-qua': '33-tinh-huong-ket-qua', 'lên-chặng-modal': '34-du-dieu-kien-len-chang',
  'qr': '35-quay-qr', 'offline': '36-offline-chuan-bi', 'mg-cham-muong': '37-mg-cham-muong', 'tong-ket-tinh-huong': '38-tong-ket-tinh-huong',
  'nau-lai': '39-tai-lai-giua-ca',
  // M5 (0.5.0): thao tác mới khuấy / gọt / bày, thẻ vào bước "Bước k/N", con dấu kết quả bước; lắc-xé kiểu Chà còn lại
  // (xé khô mực, bóp muối) giữ nhãn cũ
  'mg-xoay': '40-mg-xoay', 'mg-got': '41-mg-got', 'mg-bay': '42-mg-bay', 'mg-the-buoc': '43-mg-the-buoc',
  'mg-con-dau': '44-mg-con-dau', 'mg-cha-lac': '45-mg-cha-xe',
  // M5 Đợt 2 (0.5.1): quầy mới — bảng chọn món ở lớp nổi (số phần, ghi chú có hình), con dấu "ĐÃ CHỐT" lúc chốt order
  'bang-chon-mon': '46-quay-bang-chon-mon', 'quay-chot-order': '47-quay-chot-order'
}
const taken = new Set()
// Các khâu trong ca bán cũng soát bố cục (chữ < 13px, vùng chạm < 44px, tràn ngang) lần đầu gặp (vòng soát lỗi M3).
const SHIFT_AUDIT = new Set(['quay-order', 'bang-chon-mon', 'quay-doc-lai', 'thanh-toan', 'tinh-tien', 'phieu-thu', 'qr', 'bep-day-phieu', 'bep-ke-chon', 'bep-thot', 'phieu-cham'])
const audited = new Set()

function makeG(page, server) {
  return {
    page, server,
    url: (p = '') => server.url + p.replace(/^\//, ''),
    async shot(label, { force = false, fullPage = false } = {}) {
      if (SHIFT_AUDIT.has(label) && !audited.has(label)) {
        audited.add(label)
        await checkLayout(page, 'ca bán · ' + label)
      }
      const name = SHOTS[label]
      if (!name || (taken.has(label) && !force)) return
      taken.add(label)
      if (!OUT) return
      await page.waitForTimeout(120)
      await page.screenshot({ path: OUT + name + '.png', fullPage })
      report.shots.push(name + '.png')
    }
  }
}

// ---------- Đo rò rỉ ----------
async function metrics(page, cdp, label) {
  await cdp.send('HeapProfiler.collectGarbage')
  await page.waitForTimeout(200)
  const inPage = await page.evaluate(async () => {
    const buses = (globalThis.__bknBuses || []).map(b => Object.values(b.h).reduce((a, l) => a + l.length, 0))
    // số vòng rAF đang chạy: lượt gọi requestAnimationFrame / số khung hình (đếm bằng rAF gốc)
    const r = window.__rafProbe
    const c0 = r.calls
    let frames = 0
    await new Promise(res => {
      const t0 = performance.now()
      const tick = () => { frames++; if (performance.now() - t0 < 1000) r.orig(tick); else res() }
      r.orig(tick)
    })
    const loops = frames ? (r.calls - c0) / frames : 0
    return {
      dom: document.getElementsByTagName('*').length,
      busHandlers: buses,
      rafLoops: Math.round(loops * 100) / 100,
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e4) / 100 : null,
      screen: document.getElementById('screen') && document.getElementById('screen').dataset.screen
    }
  })
  // bộ nghe window/document (CDP) + phần tử (kể cả tách rời) còn giữ trong heap
  const listeners = {}
  for (const expr of ['window', 'document']) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: expr })
    const { listeners: ls } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId })
    const byType = {}
    for (const l of ls) byType[l.type] = (byType[l.type] || 0) + 1
    listeners[expr] = { total: ls.length, byType }
  }
  const { result: proto } = await cdp.send('Runtime.evaluate', { expression: 'Element.prototype' })
  const { objects } = await cdp.send('Runtime.queryObjects', { prototypeObjectId: proto.objectId })
  const { result: cnt } = await cdp.send('Runtime.callFunctionOn', { objectId: objects.objectId, functionDeclaration: 'function () { const ok = e => { try { e.isConnected; return true } catch { return false } }; const real = this.filter(ok); return [real.length, real.filter(e => !e.isConnected).length] }', returnByValue: true })
  const hu = await cdp.send('Runtime.getHeapUsage')
  inPage.heapMB = Math.round(hu.usedSize / 1e4) / 100
  const m = { label, ...inPage, listeners, elementsInHeap: cnt.value[0], detached: cnt.value[1] }
  report.metrics.push(m)
  log('ĐO', label, JSON.stringify({ dom: m.dom, bus: m.busHandlers, raf: m.rafLoops, heap: m.heapMB, win: listeners.window.total, doc: listeners.document.total, detached: m.detached }))
  return m
}

// ---------- Chơi ca qua giao diện (như playShiftUi, có chụp ảnh, ghi tình huống) ----------
async function playShift(g, { shots = false, reloadAfter = 0, maxCustomers = 16 } = {}) {
  const { page } = g
  const served = []
  const incidents = []
  const t0 = Date.now()
  for (let guard = 0; guard < maxCustomers; guard++) {
    const inc0 = await maybeIncident(g, guard === 0 ? 1500 : 0)
    if (inc0) incidents.push(inc0)
    const what = await waitCustomerOrEnd(g, { useClock: true })
    if (what === 'summary') break
    const order = await serveAtCounter(g)
    if (order.rejected) { report.notes.push(`ngày ${(await readSave(page)).day}: từ chối ảnh chuyển khoản giả`); continue }
    const inc = await maybeIncident(g, 400)
    if (inc) {
      incidents.push(inc)
      const s = await readSave(page)
      const t = s && s.shift && s.shift.tickets.find(x => x.id === order.ticketId)
      const c = t && s.shift.customers[t.customerId]
      if (c) order.request = c.request
    }
    const res = await cookAndServe(g, order.ticketId, { shots })
    served.push({ ...order, ...res })
    if (reloadAfter && served.length === reloadAfter) {
      // tải lại giữa ca: vào thẳng màn ca bán, tiến độ giữ nguyên
      const before = await waitSave(page, st => st.shift && st.shift.served.length >= reloadAfter)
      await page.reload()
      await page.waitForSelector(T('screen-service'), { timeout: 15000 })
      await g.shot('nau-lai')
      const after = await readSave(page)
      assert.ok(after.shift, 'tải lại mất ca')
      assert.equal(after.shift.served.length, before.shift.served.length, 'tải lại mất khách đã phục vụ')
      report.notes.push(`tải lại giữa ca ngày ${after.shift.day} sau ${reloadAfter} khách: ca giữ nguyên (${after.shift.served.length} khách đã phục vụ, t=${after.shift.t.toFixed(1)}s)`)
    }
    await page.click(T('tab-counter'), { timeout: 2000 }).catch(() => {})
  }
  await page.waitForSelector(T('summary'), { timeout: 20000 })
  report.timings['ca-' + served.length + '-' + Date.now()] = Date.now() - t0
  return { served, incidents, ms: Date.now() - t0 }
}

// Tình huống: chụp hộp thoại + kết quả, chọn cách an toàn.
async function maybeIncident(g, waitMs = 0) {
  const { page } = g
  const modal = waitMs ? await page.waitForSelector(T('incident-modal'), { timeout: waitMs }).catch(() => null) : await page.$(T('incident-modal'))
  if (!modal) return null
  if (!taken.has('tinh-huong') && !(await page.$(T('incident-result')))) {
    await g.shot('tinh-huong')
    const safe = await page.$(`${T('incident-modal')} [data-safe="true"]`)
    await safe.click()
    await page.waitForSelector(T('incident-result'))
    await g.shot('tinh-huong-ket-qua')
  }
  const r = await resolveIncidentIfShown(g)
  if (r) {
    log('tình huống', JSON.stringify(r))
    const sv = await readSave(page)
    // M4: tối đa 2 tình huống mỗi ca (sh.incident, sh.incidentQueue): lấy tình huống vừa xử lý đúng loại
    const plans = sv && sv.shift ? [sv.shift.incident, ...(sv.shift.incidentQueue || [])].filter(Boolean) : []
    const hit = plans.filter(x => x.id === r.id && x.status === 'xong').pop()
    const det = hit && hit.detail
    if (r.id === 'doi_y' && r.choice === 'doi_mon' && det) {
      // dây phiếu chung phải vẽ lại theo món mới
      const name = DATA.RECIPES[det.toId].name
      const ok = await page.waitForFunction(([sel, n]) => { const el = document.querySelector(sel); return !!el && el.textContent.includes(n) },
        [T('rail-ticket-' + det.ticketId), name], { timeout: 3000 }).then(() => true).catch(() => false)
      if (!ok) report.stuck.push(`dây phiếu không đổi sang ${name} sau khi khách đổi ý`)
      else report.notes.push(`khách đổi ý: dây phiếu ${det.no} đổi sang ${name}`)
    }
  }
  return r
}

// Màn Chuẩn bị: hộp mời xem lên chặng (lần đầu đủ điều kiện) có thể bật bất cứ lúc nào quay về (sau ca, sau khi nhận thư…)
let eligibleSeen = false
async function settlePrep(g, waitMs = 1200) {
  const { page } = g
  const modal = await page.waitForSelector(T('stage-up-modal'), { timeout: waitMs }).catch(() => null)
  if (!modal) return false
  await page.waitForTimeout(300)
  await g.shot('lên-chặng-modal')
  await page.tap(T('stage-up-open'))
  await page.waitForSelector(T('screen-stage-up'))
  await page.waitForTimeout(400)
  await g.shot('sap-khai-truong')
  await checkLayout(page, 'Sắp khai trương')
  eligibleSeen = (await page.getAttribute(T('screen-stage-up'), 'data-eligible')) === 'true'
  const s = await readSave(page)
  report.notes.push(`đủ điều kiện lên Chặng 2 ở ngày game ${s.day}: danh tiếng ${s.reputation}, ví ${s.wallet}, ${Object.keys(s.recipes).length} công thức`)
  await page.tap(T('meta-back'))
  await page.waitForSelector(T('screen-prep'))
  return true
}

async function backToPrep(g) {
  const { page } = g
  await page.tap(T('meta-back'))
  await page.waitForSelector(T('screen-prep'))
  await settlePrep(g, 800)
}

async function nextDay(g) {
  const { page } = g
  await page.tap(T('next-day'))
  await page.waitForSelector(T('screen-prep'))
  await claimCheckinIfShown(g, 1500)
  // hộp mời xem lên chặng (nếu có) để sau xử lý
}

async function prepStats(page) {
  const s = await readSave(page)
  const st = checkStageUp(migrate(s, DATA), { data: DATA, emit() {} })
  return { day: s.day, wallet: s.wallet, rep: s.reputation, gold: s.goldSpoons, recipes: Object.keys(s.recipes), eligible: st.eligible, conds: st.conditions.map(c => `${c.id}:${c.done ? 'ok' : c.current + '/' + c.target}`).join(' ') }
}

// ---------- Bố cục: tràn ngang, chữ < 14px, vùng chạm < 44px ----------
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
      // cỡ 0 là chữ cố ý ẩn (vd số thứ tự trong chấm của thanh 4 khâu, chỉ để đọc màn hình), không phải chữ nhỏ
      if (fs > 0 && fs < 13) out.push(`chữ ${fs}px ở ${name(el)}: "${t.textContent.trim().slice(0, 30)}"`)
      if (/undefined|NaN|\[object|null\b|\{\w+\}/.test(t.textContent)) out.push(`chữ lỗi ở ${name(el)}: "${t.textContent.trim().slice(0, 60)}"`)
    }
    for (const el of document.querySelectorAll('button, a, input, select, [role=button], summary')) {
      if (!vis(el) || el.type === 'checkbox') continue
      // kích thước bố cục (không tính transform đang chạy hiệu ứng, vd tờ tiền vừa bay vào khay đang thu nhỏ)
      const b = el.getBoundingClientRect()
      const w = Math.max(b.width, el.offsetWidth || 0), hgt = Math.max(b.height, el.offsetHeight || 0)
      if (hgt < 43.5 || w < 43.5) out.push(`vùng chạm ${Math.round(w)}×${Math.round(hgt)} ở ${name(el)}`)
    }
    return out
  })
}
async function checkLayout(page, where) {
  const issues = await layoutIssues(page)
  if (issues.length) { report.notes.push(`bố cục ${where}: ${issues.join('; ')}`); log('BỐ CỤC', where, issues.join('; ')) }
  return issues
}

// =====================================================================================================
const { chromium } = loadPlaywright()
const server = await startServer()
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
  locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh'
})
const page = await context.newPage()
// trang HTTPS thật cho chép mã sao lưu vào bộ nhớ tạm; Chromium thử nghiệm cần cấp quyền (không có thì game không ghi mốc
// "đã sao lưu", đúng như khi chơi qua http)
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.url.replace(/\/$/, '') })
const cdp = await context.newCDPSession(page)
page.on('pageerror', e => { report.errors.push('pageerror: ' + e.message); log('LỖI', e.message) })
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { report.errors.push(`console.${m.type()}: ${m.text()}`); log('CONSOLE', m.type(), m.text()) } })
page.on('response', r => { if (r.status() >= 400) report.errors.push(`HTTP ${r.status()}: ${r.url()}`) })
const T0 = vn('2026-10-05T07:30')
await page.clock.install({ time: T0 })
await page.addInitScript(() => {
  const orig = window.requestAnimationFrame.bind(window)
  const probe = { calls: 0, orig }
  window.__rafProbe = probe
  window.requestAnimationFrame = cb => { probe.calls++; return orig(cb) }
})
const g = makeG(page, server)
const started = Date.now()
try {
  // ---------------- Ngày 1: save mới ----------------
  await page.goto(g.url(`/?seed=${SEED}`))
  await page.waitForSelector(T('shop-name-input'))
  await g.shot('title')
  await checkLayout(page, 'màn mở đầu')
  await page.fill(T('shop-name-input'), 'Xe Hành Trình Cô Ba')
  await page.tap(T('start-button'))
  await page.waitForSelector(T('screen-prep'))
  const popup = await page.waitForSelector(T('checkin-popup'), { timeout: 3000 }).catch(() => null)
  if (popup) {
    await page.waitForTimeout(400)
    await g.shot('diem-danh')
    await page.tap(T('checkin-claim'))
    await page.waitForSelector(T('checkin-popup'), { state: 'detached' })
  } else report.stuck.push('không thấy bảng điểm danh ở lần mở đầu')
  await page.waitForTimeout(500)
  await g.shot('prep')
  await checkLayout(page, 'Chuẩn bị ngày 1')
  await waitController(page)
  report.notes.push('service worker đã điều khiển trang sau lần mở đầu')
  await metrics(page, cdp, 'chuẩn bị trước ca 1')

  await page.tap(T('open-shift'))
  await page.waitForSelector(T('screen-service'))
  const s1 = await playShift(g, { shots: true })
  report.shifts.push({ day: 1, served: s1.served.length, stars: s1.served.map(x => x.stars), incidents: s1.incidents, ms: s1.ms })
  await page.waitForTimeout(400)
  await g.shot('tong-ket')
  await checkLayout(page, 'Tổng kết ngày 1')
  await metrics(page, cdp, 'tổng kết ca 1')
  await nextDay(g)
  log('sau ca 1', JSON.stringify(await prepStats(page)))
  await metrics(page, cdp, 'chuẩn bị sau ca 1')

  // ---------------- Ngày 2: tải lại giữa ca ----------------
  await page.tap(T('open-shift'))
  await page.waitForSelector(T('screen-service'))
  const s2 = await playShift(g, { reloadAfter: 2 })
  report.shifts.push({ day: 2, served: s2.served.length, stars: s2.served.map(x => x.stars), incidents: s2.incidents, ms: s2.ms })
  await metrics(page, cdp, 'tổng kết ca 2')
  await nextDay(g)
  const st2 = await prepStats(page)
  log('sau ca 2', JSON.stringify(st2))
  await metrics(page, cdp, 'chuẩn bị sau ca 2')

  // ---------------- Ngày 3: Cài đặt (tình huống Nhiều), mua món 1, offline ----------------
  await page.tap(T('open-settings'))
  await page.waitForSelector(T('screen-settings'))
  await page.tap(T('setting-incident-nhieu'))
  await page.waitForSelector(`${T('setting-incident-nhieu')}[aria-checked="true"]`)
  await page.$eval(T('setting-volume'), el => { el.value = '60'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) })
  const sset = await waitSave(page, st => st.settings.incidentFrequency === 'nhieu' && Math.abs(st.settings.volume - 0.6) < 1e-9)
  assert.equal(sset.settings.incidentFrequency, 'nhieu')
  await checkLayout(page, 'Cài đặt')
  await page.tap(T('meta-back'))
  await page.waitForSelector(T('screen-prep'))
  if (st2.wallet >= DATA.RECIPES.banh_trang_tron.shopPrice) {
    await page.tap(T('open-shop'))
    await page.waitForSelector(T('shop-item-banh_trang_tron'))
    await page.tap(T('shop-buy-banh_trang_tron'))
    await page.tap(T('confirm-ok'))
    await page.waitForSelector(`${T('shop-item-banh_trang_tron')}.is-owned`)
    await waitSave(page, st => !!st.recipes.banh_trang_tron)
    report.notes.push(`mua Bánh tráng trộn qua giao diện ở ngày 3 (ví trước ${st2.wallet})`)
    await page.tap(T('meta-back'))
    await page.waitForSelector(T('screen-prep'))
    // nhận thưởng chuỗi (bước "Mua công thức đầu tiên")
    const claim = await page.$('[data-testid^="chain-claim-ngay_dau_ra_pho"]')
    if (claim) { await claim.tap(); await page.waitForTimeout(400); report.notes.push('nhận thưởng chuỗi Ngày đầu ra phố ở màn Chuẩn bị') }
  } else report.notes.push(`ngày 3 chưa đủ tiền mua Bánh tráng trộn (ví ${st2.wallet})`)

  // mất mạng: tải lại vẫn chơi được (service worker)
  await context.setOffline(true)
  await page.reload()
  await page.waitForSelector(T('start-button'), { timeout: 15000 })
  await page.tap(T('start-button'))
  await page.waitForSelector(T('screen-prep'))
  await g.shot('offline')
  await page.tap(T('open-shift'))
  await page.waitForSelector(T('screen-service'))
  const s3 = await playShift(g, {})
  report.shifts.push({ day: 3, offline: true, served: s3.served.length, stars: s3.served.map(x => x.stars), incidents: s3.incidents, ms: s3.ms })
  report.notes.push(`ca ngày 3 chơi khi mất mạng: ${s3.served.length} khách`)
  await page.waitForTimeout(400)
  if (s3.incidents.length) await g.shot('tong-ket-tinh-huong')
  await metrics(page, cdp, 'tổng kết ca 3')
  await context.setOffline(false)
  await nextDay(g)
  const st3 = await prepStats(page)
  log('sau ca 3', JSON.stringify(st3))
  await metrics(page, cdp, 'chuẩn bị sau ca 3')

  // ---------------- Rút ngắn: lõi chơi tiếp tới sát điều kiện lên chặng ----------------
  const raw = await readSave(page)
  let state = migrate(raw, DATA)
  const baseRev = state.rev
  const ctx = makeMetaCtx({ at: '2026-10-06T08:00', attach: true })
  ctx.setState(state)
  const HOURS = ['08:00', '12:00', '17:30']
  const days = ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']
  let simShifts = 0
  let lastT = ctx.clock.t
  const clone = s => JSON.parse(JSON.stringify(s))
  // hàm kiểm tra: sau khi mua Cà phê sữa đá + 1 ca hoàn hảo thì đủ điều kiện?
  const readyAfterUi = s => {
    const c = migrate(clone(s), DATA)
    const x = makeMetaCtx({ at: '2026-10-10T08:00', attach: true })
    x.setState(c)
    refreshMeta(c, makeNowInfo(c, x.clock.t), x)
    for (const rid of ['banh_trang_tron', 'ca_phe_sua_da']) if (!c.recipes[rid]) buyShopRecipe(c, rid, x)
    simShift(c, x)
    refreshMeta(c, makeNowInfo(c, x.clock.t), x)
    return checkStageUp(c, x).eligible
  }
  outer: for (const d of days) {
    for (const hh of HOURS) {
      ctx.clock.t = vn(`${d}T${hh}`)
      refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
      const snap = clone(state)
      simShift(state, ctx)
      refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
      simShifts++
      if (checkStageUp(state, ctx).eligible) { state = migrate(snap, DATA); ctx.setState(state); simShifts--; break outer }
      lastT = ctx.clock.t
      if (state.day >= 6 && readyAfterUi(state)) break outer
    }
  }
  const st = checkStageUp(state, ctx)
  report.notes.push(`rút ngắn bằng lõi: ${simShifts} ca (người chơi hoàn hảo) → ngày ${state.day}, ví ${state.wallet}, danh tiếng ${state.reputation}; điều kiện: ${st.conditions.map(c => `${c.id}:${c.done ? 'đạt' : c.current + '/' + c.target}`).join(' ')}`)
  log('rút ngắn', report.notes[report.notes.length - 1])
  state.rev = baseRev + 50
  state.checkin.lastDay = state.checkin.lastDay || ''
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, encodeSave(state)])
  // sang ngày thật kế tiếp (sau mốc cuối của phần rút ngắn)
  await page.clock.setSystemTime(vn('2026-10-10T07:30'))
  await page.reload()
  await page.waitForSelector(T('start-button'))
  await page.tap(T('start-button'))
  await page.waitForSelector(T('screen-prep'))
  await claimCheckinIfShown(g, 2500)
  await settlePrep(g, 800)
  await page.waitForTimeout(600)
  log('sau rút ngắn', JSON.stringify(await prepStats(page)))

  // ---------------- Hộp thư, Việc hôm nay, Chợ Công Thức, Sổ công thức, Sổ tay nghề, Cài đặt ----------------
  await page.tap(T('open-mail'))
  await page.waitForSelector(T('screen-mail'))
  await page.waitForTimeout(300)
  await g.shot('hop-thu')
  await checkLayout(page, 'Hộp thư')
  if (await page.$(`${T('mail-claim-all')}:not([disabled])`)) { await page.tap(T('mail-claim-all')); await page.waitForTimeout(500) }
  await backToPrep(g)

  await page.tap(T('open-quests'))
  await page.waitForSelector(T('screen-quests'))
  await page.waitForTimeout(300)
  await g.shot('viec-hom-nay')
  await checkLayout(page, 'Việc hôm nay')
  for (const b of await page.$$('[data-testid^="quest-claim-"]:not([disabled])')) { await b.tap().catch(() => {}); await page.waitForTimeout(300) }
  const chest = await page.$(`${T('daily-chest')}:not([disabled])`)
  if (chest) { await chest.tap().catch(() => {}); await page.waitForTimeout(400) }
  await backToPrep(g)

  const pre = await readSave(page)
  await page.tap(T('open-shop'))
  await page.waitForSelector(T('screen-shop'))
  await page.waitForTimeout(300)
  await g.shot('cho-cong-thuc')
  await checkLayout(page, 'Chợ Công Thức')
  for (const rid of ['banh_trang_tron', 'ca_phe_sua_da']) {
    if (pre.recipes[rid]) continue
    const btn = await page.$(`${T('shop-buy-' + rid)}:not([disabled])`)
    if (!btn) { report.stuck.push(`không mua được ${rid} (ví ${pre.wallet})`); continue }
    await btn.tap()
    await page.tap(T('confirm-ok'))
    await page.waitForSelector(`${T('shop-item-' + rid)}.is-owned`)
    await waitSave(page, s => !!s.recipes[rid])
    report.notes.push(`mua ${DATA.RECIPES[rid].name} qua giao diện`)
  }
  await backToPrep(g)
  for (const c of await page.$$('[data-testid^="chain-claim-"]')) { await c.tap().catch(() => {}); await page.waitForTimeout(300) }

  await page.tap(T('open-recipe-book'))
  await page.waitForSelector(T('screen-recipe-book'))
  await page.waitForTimeout(300)
  await g.shot('so-cong-thuc')
  await checkLayout(page, 'Sổ công thức')
  await page.tap(T('book-open-ca_phe_sua_da'))
  await page.waitForSelector(T('recipe-detail'))
  await page.waitForTimeout(400)
  await g.shot('so-cong-thuc-chi-tiet')
  await checkLayout(page, 'Sổ công thức chi tiết')
  await page.tap(T('recipe-detail-close'))
  await page.waitForSelector(T('recipe-detail'), { state: 'detached' })
  await page.tap(T('recipe-book-tab-tu'))
  await page.waitForSelector(T('dialect-list'))
  await backToPrep(g)

  await page.tap(T('open-notebook'))
  await page.waitForSelector(T('screen-notebook'))
  await page.waitForTimeout(300)
  await g.shot('so-tay-nghe')
  await checkLayout(page, 'Sổ tay nghề')
  const nclaim = await page.$('[data-testid^="notebook-claim-"]:not([disabled])')
  if (nclaim) { await nclaim.tap(); await page.waitForTimeout(400); report.notes.push('nhận thưởng một nhóm Sổ tay nghề') }
  await backToPrep(g)

  await page.tap(T('open-settings'))
  await page.waitForSelector(T('screen-settings'))
  await page.waitForTimeout(300)
  await g.shot('cai-dat')
  await page.tap(T('backup-copy'))
  await page.waitForSelector(T('backup-code-modal'))
  const code = await page.inputValue(T('backup-code'))
  assert.ok(code.startsWith('BKN1.z.'), 'mã sao lưu')
  await page.tap(T('backup-done'))
  await page.waitForSelector(T('backup-code-modal'), { state: 'detached' })
  report.notes.push(`chép mã sao lưu: ${code.length} ký tự`)
  await backToPrep(g)
  log('trước ca cuối', JSON.stringify(await prepStats(page)))

  // ---------------- Chơi thật (ít nhất 1 ca sau phần rút ngắn) tới khi đủ điều kiện ----------------
  for (let k = 0; k < 4 && (k === 0 || !eligibleSeen); k++) {
    for (const c of await page.$$('[data-testid^="chain-claim-"]')) { await c.tap().catch(() => {}); await page.waitForTimeout(300) }
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    // chụp ảnh: món mới mua (Bánh tráng trộn, Cà phê sữa đá) có các thao tác M5 gọt / khuấy / bày (mỗi nhãn chụp một lần)
    const s = await playShift(g, { shots: true })
    const sv = await readSave(page)
    report.shifts.push({ day: sv.day - 1, served: s.served.length, stars: s.served.map(x => x.stars), incidents: s.incidents, ms: s.ms })
    if (s.incidents.length) await g.shot('tong-ket-tinh-huong')
    await page.tap(T('next-day'))
    await page.waitForSelector(T('screen-prep'))
    await claimCheckinIfShown(g, 1200)
    await settlePrep(g, 2500)
    const ps = await prepStats(page)
    log('sau ca thật', JSON.stringify(ps))
    for (const c of await page.$$('[data-testid^="chain-claim-"]')) { await c.tap().catch(() => {}); await page.waitForTimeout(300) }
    await settlePrep(g, 800)
    if (ps.eligible && !eligibleSeen) report.stuck.push('đủ điều kiện nhưng không thấy hộp mời lên chặng')
  }
  const eligible = eligibleSeen
  report.eligible = eligible
  await metrics(page, cdp, 'chuẩn bị cuối hành trình')

  // ---------------- Sự kiện 20/11 ----------------
  await page.clock.setSystemTime(vn('2026-11-13T08:00'))
  await page.reload()
  await page.waitForSelector(T('start-button'))
  await page.tap(T('start-button'))
  await page.waitForSelector(T('screen-prep'))
  await claimCheckinIfShown(g, 2500)
  await page.waitForTimeout(500)
  await page.tap(T('open-event'))
  await page.waitForSelector(T('screen-event'))
  await page.waitForTimeout(400)
  await g.shot('su-kien')
  await checkLayout(page, 'Sự kiện')
  await page.tap(T('meta-back'))
  await page.waitForSelector(T('screen-prep'))
  // Tổng kết cuối (nếu chưa chụp)
} catch (err) {
  report.stuck.push('DỪNG: ' + (err && err.stack || err))
  log('DỪNG', err && err.stack || err)
  if (OUT) await page.screenshot({ path: OUT + 'zz-loi.png' }).catch(() => {})
} finally {
  report.totalMin = Math.round((Date.now() - started) / 600) / 100
  if (OUT) await writeFile(OUT + 'journey-report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ eligible: report.eligible, shifts: report.shifts, notes: report.notes, errors: report.errors, stuck: report.stuck }, null, 2))
  process.exitCode = report.errors.length || report.stuck.length || !report.eligible ? 1 : 0
  await context.close().catch(() => {})
  await browser.close().catch(() => {})
  await server.close()
  log('XONG', report.totalMin, 'phút; lỗi:', report.errors.length, '; kẹt:', report.stuck.length)
}
