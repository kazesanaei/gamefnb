// Tiện ích e2e: nạp Playwright, máy chủ tĩnh, ngữ cảnh điện thoại, thu lỗi trang,
// và "người chơi tự động" điều khiển giao diện thật chỉ qua data-testid / data-* (chuột + chạm).
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { startServer } from '../helpers/static-server.mjs'
import { DATA } from '../../src/data/index.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { priceOfLines } from '../../src/core/order.js'
import { minBillsChange, BILLS } from '../../src/core/money.js'
import { decodeSave, encodeSave, SAVE_KEY, DEV_SAVE_KEY } from '../../src/core/save.js'

const require = createRequire(import.meta.url)

// Thử require('playwright') rồi tới bản cài toàn cục.
export function loadPlaywright() {
  try { return require('playwright') } catch { /* thử đường dẫn cố định */ }
  return require('/opt/node22/lib/node_modules/playwright')
}

export const T = id => `[data-testid="${id}"]`

// Kích thước khung nhìn: mặc định 390×844; E2E_VIEWPORT=1280x800 để chụp ảnh máy tính.
export function viewportFromEnv() {
  const m = /^(\d+)x(\d+)$/.exec(process.env.E2E_VIEWPORT || '')
  return m ? { width: Number(m[1]), height: Number(m[2]) } : { width: 390, height: 844 }
}

/**
 * Khởi động máy chủ (cổng 0) + Chromium + ngữ cảnh điện thoại. Thu lỗi console/pageerror/HTTP ≥ 400.
 * clock: true → page.clock.install() (giờ thật); { time } → cài đồng hồ giả bắt đầu từ time (ms/Date/chuỗi).
 * viewport (tùy chọn) {width, height}: ghi đè khung nhìn mặc định (vd 360×740).
 * Trả { page, context, browser, server, errors, url(pathAndQuery), shot(name), close() }.
 */
export async function openGame({ clock = false, name = 'e2e', viewport: vp = null } = {}) {
  const { chromium } = loadPlaywright()
  const server = await startServer(0)
  const browser = await chromium.launch()
  const viewport = vp || viewportFromEnv()
  const mobile = viewport.width < 600
  const context = await browser.newContext({
    viewport, hasTouch: true, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1,
    locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh'
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text()}`) })
  page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`) })
  if (clock) await page.clock.install(typeof clock === 'object' ? clock : undefined)
  const shotDir = process.env.SHOT_DIR ? path.join(process.env.SHOT_DIR, `${viewport.width}x${viewport.height}`) : null
  if (shotDir) mkdirSync(shotDir, { recursive: true })
  let shotNo = 0
  return {
    page, context, browser, server, errors, viewport,
    url: (p = '') => server.url + p.replace(/^\//, ''),
    // Chụp ảnh khi đặt SHOT_DIR (không lưu vào repo).
    async shot(label) {
      if (!shotDir) return
      await page.screenshot({ path: path.join(shotDir, `${name}-${String(++shotNo).padStart(2, '0')}-${label}.png`) })
    },
    async close() {
      await context.close().catch(() => {})
      await browser.close().catch(() => {})
      await server.close()
    }
  }
}

// ---------- Đọc state từ localStorage (chỉ đọc, để kiểm tra) ----------

// Mở bằng ?devNow (giờ giả) thì game lưu ở khóa riêng DEV_SAVE_KEY (save thật không đổi): đọc bản đó nếu có.
export async function readSave(page) {
  const raw = await page.evaluate(([k, d]) => localStorage.getItem(d) || localStorage.getItem(k), [SAVE_KEY, DEV_SAVE_KEY])
  return raw ? decodeSave(raw) : null
}

// Nạp save dựng sẵn (state thuần, mã hóa bằng encodeSave của src/core/save.js) vào localStorage TRƯỚC khi game khởi động.
// Chỉ nạp 1 lần cho cả phiên tab: tải lại / đổi ?devNow sau đó giữ save game đã ghi.
export async function seedSave(page, state) {
  await page.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('bkn.seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('bkn.seeded', '1') }
  }, [SAVE_KEY, encodeSave(state)])
}

// Chờ state lưu thỏa điều kiện (save có debounce 300 ms).
export async function waitSave(page, pred, timeout = 5000) {
  const end = Date.now() + timeout
  for (;;) {
    const s = await readSave(page)
    if (s && pred(s)) return s
    if (Date.now() > end) throw new Error('save không đạt điều kiện chờ')
    await page.waitForTimeout(100)
  }
}

// Thăm dò page.evaluate(fn, arg) tới khi trả giá trị truthy (fn được phép async). KHÔNG dùng page.waitForFunction với
// hàm trả Promise: Playwright coi Promise là truthy nên trả ngay, kể cả khi Promise ra false. → giá trị cuối cùng.
export async function pollEval(page, fn, arg, { timeout = 20000, every = 200, label = 'điều kiện' } = {}) {
  const end = Date.now() + timeout
  for (;;) {
    const v = await page.evaluate(fn, arg)
    if (v) return v
    if (Date.now() > end) throw new Error('hết giờ chờ: ' + label)
    await page.waitForTimeout(every)
  }
}

// Chờ service worker kích hoạt (đã lưu đủ tệp để chơi offline) và điều khiển trang.
// Không dùng page.waitForFunction với hàm async: Playwright coi Promise trả về là "đúng" nên không chờ gì cả.
export async function waitController(page, timeout = 20000) {
  const end = Date.now() + timeout
  for (;;) {
    const ok = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      return !!(reg && reg.active && reg.active.state === 'activated' && navigator.serviceWorker.controller)
    })
    if (ok) return
    if (Date.now() > end) throw new Error('service worker chưa kích hoạt')
    await page.waitForTimeout(200)
  }
}

// ---------- Bắt đầu game ----------

// Bảng điểm danh tự bật ở lần mở đầu tiên trong ngày thật (kể cả save mới): nhận ô kế tiếp rồi chờ bảng đóng.
// Trả true nếu đã nhận. waitMs: thời gian chờ bảng hiện.
export async function claimCheckinIfShown(g, waitMs = 1500) {
  const { page } = g
  const popup = await page.waitForSelector(T('checkin-popup'), { timeout: waitMs }).catch(() => null)
  if (!popup) return false
  await g.shot('diem-danh')
  await page.click(T('checkin-claim'))
  await page.waitForSelector(T('checkin-popup'), { state: 'detached', timeout: 5000 })
  return true
}

export async function startNewGame(g, shopName = 'Xe Bánh Mì Cô Ba') {
  const { page } = g
  await page.goto(g.url('/?seed=42&test=1'))
  await page.waitForSelector(T('shop-name-input'))
  await g.shot('title')
  await page.fill(T('shop-name-input'), shopName)
  await page.click(T('start-button'))
  await page.waitForSelector(T('open-shift'))
  // lần mở đầu tiên: bảng điểm danh "Tuần Khai Trương" hiện trước khi mở hàng
  await claimCheckinIfShown(g, 3000)
  await g.shot('prep')
  await page.click(T('open-shift'))
  await page.waitForSelector(T('screen-service'))
}

// Mở game với save đã có (query vd '?devNow=2026-11-13T09:00'): màn mở đầu → "Vào quán" → màn Chuẩn bị.
export async function enterPrep(g, query = '') {
  const { page } = g
  await page.goto(g.url('/' + query))
  await page.waitForSelector(T('start-button'))
  await page.tap(T('start-button'))
  await page.waitForSelector(T('screen-prep'))
}

// Tiến thời gian game khi đang rảnh: có đồng hồ giả thì chạy nhanh, không thì chờ thật.
export async function passTime(g, ms, useClock) {
  if (useClock) await g.page.clock.runFor(ms)
  else await g.page.waitForTimeout(ms)
}

// ---------- Tình huống trong ca (M3) ----------

// Hộp thoại tình huống (hiện giữa hai khách, ở tab Quầy): chọn `choice` hoặc cách an toàn (data-safe="true"),
// rồi bấm "Bán tiếp". waitMs > 0: chờ hộp hiện tối đa waitMs. Trả { id, choice } nếu đã xử lý, null nếu không có.
export async function resolveIncidentIfShown(g, { choice = null, waitMs = 0 } = {}) {
  const { page } = g
  const modal = waitMs
    ? await page.waitForSelector(T('incident-modal'), { timeout: waitMs }).catch(() => null)
    : await page.$(T('incident-modal'))
  if (!modal) return null
  // hộp vừa bấm "Bán tiếp" đang mờ dần: chờ biến mất
  if (await page.$(`.modal-layer.hide ${T('incident-modal')}`)) {
    await page.waitForSelector(T('incident-modal'), { state: 'detached' }).catch(() => {})
    return null
  }
  const id = await page.getAttribute(`${T('incident-modal')} .incident`, 'data-incident').catch(() => null)
  if (!(await page.$(T('incident-result')))) {
    await g.shot('tinh-huong')
    await page.click(choice ? T('incident-choice-' + choice) : `${T('incident-modal')} [data-safe="true"]`)
    await page.waitForSelector(T('incident-result'))
  }
  const picked = await page.getAttribute(T('incident-result'), 'data-choice')
  await page.click(T('incident-ok'))
  await page.waitForSelector(T('incident-modal'), { state: 'detached' })
  return { id, choice: picked }
}

// Chờ tới khi có khách ở khâu order (bóng thoại) hoặc hết ca (màn tổng kết). Trả 'customer' | 'summary'.
// Gặp tình huống trong ca (vd khách mở hàng trước khách đầu tiên) thì chọn cách an toàn.
export async function waitCustomerOrEnd(g, { useClock = false, timeoutGameMs = 400000 } = {}) {
  const { page } = g
  let waited = 0
  for (;;) {
    await resolveIncidentIfShown(g)
    if (await page.$(T('summary'))) return 'summary'
    if (await page.$(T('speech-bubble'))) return 'customer'
    if (await page.$(`${T('counter-panel')}[data-stage]:not([data-stage=""])`)) return 'customer'
    if (waited > timeoutGameMs) throw new Error('chờ khách quá lâu')
    const step = useClock ? 1500 : 250
    await passTime(g, step, useClock)
    waited += step
  }
}

// ---------- Khâu quầy ----------

export function lineTotal(request) {
  return priceOfLines(request, DATA.RECIPES)
}

// Phục vụ khách đang ở quầy qua 3 khâu Order → Thanh toán → Tính tiền và kẹp phiếu. Trả {request, total, ticketNo}.
export async function serveAtCounter(g) {
  const { page } = g
  await resolveIncidentIfShown(g)
  if (!(await page.isVisible(T('panel-counter')))) await page.click(T('tab-counter'))
  await page.waitForSelector(T('speech-bubble'))
  const request = JSON.parse(await page.getAttribute(T('speech-bubble'), 'data-request'))
  const name = await page.getAttribute(T('progress-4'), 'data-customer')
  await page.waitForSelector(`${T('progress-4')}[data-stage="order"]`)
  await g.shot('quay-order')

  // Order: chọn món, ghi chú, số lượng
  for (const line of request) {
    await page.click(T('menu-item-' + line.recipeId))
    await page.waitForSelector(T('order-sheet'))
    for (const n of line.notes || []) await page.click(T('note-chip-' + n))
    for (let q = 1; q < line.qty; q++) await page.click(T('qty-plus'))
    assert.equal(await page.textContent(T('qty-value')), String(line.qty))
    await page.click(T('add-line'))
    await page.waitForSelector(T('order-sheet'), { state: 'detached' })
  }
  for (let i = 0; i < request.length; i++) await page.waitForSelector(T('order-line-' + i))
  assert.equal(await page.isDisabled(T('confirm-order')), true, 'chưa đọc lại mà đã chốt được')
  await page.click(T('readback'))
  await page.waitForSelector(`${T('confirm-order')}:not([disabled])`)
  assert.equal(!!(await page.$(T('caught-list'))), false, 'phiếu đúng mà khách bắt lỗi')
  await g.shot('quay-doc-lai')
  await page.click(T('confirm-order'))

  // Thanh toán: gõ tổng theo nghìn
  await page.waitForSelector(T('report-total'))
  await page.waitForSelector(`${T('progress-4')}[data-stage="thanh_toan"]`)
  const total = lineTotal(request)
  for (const d of String(total / 1000)) await page.click(T('numpad-' + d))
  assert.equal(Number(await page.getAttribute(T('numpad-display'), 'data-amount')), total)
  await g.shot('thanh-toan')
  await page.click(T('report-total'))

  // Tính tiền
  await page.waitForSelector(`${T('given-cash')}, ${T('qr-status')}`)
  await page.waitForSelector(`${T('progress-4')}[data-stage="tinh_tien"]`)
  if (!(await page.$(T('qr-status')))) await giveChangeUi(g, total)
  // chuyển khoản (khách chọn QR, hoặc mời QR khi két hết tiền lẻ): chờ tiền về rồi xác nhận
  if (await page.$(T('qr-status')) && !(await confirmQrUi(g))) return { request, total, name, ticketNo: null, ticketId: null, rejected: true }
  await page.waitForSelector(`${T('clip-ticket')}:not([disabled])`)
  await page.waitForSelector(T('receipt'))
  const ticketNo = (await page.textContent(`${T('receipt')} .receipt-head span`)).trim().split(' ').pop()
  await g.shot('phieu-thu')
  await page.click(T('clip-ticket'))
  await page.waitForSelector(`${T('progress-4')}[data-stage="lam_do"]`)
  const ticketId = 'p' + Number(ticketNo.replace('#', ''))
  await page.waitForSelector(T('rail-ticket-' + ticketId))
  return { request, total, name, ticketNo, ticketId }
}

async function drawerCounts(page) {
  const d = {}
  for (const b of BILLS) d[b] = Number(await page.getAttribute(T('drawer-' + b), 'data-count')) || 0
  return d
}

// Chờ thông báo tiền về rồi bấm "Đã nhận đủ" (dùng đồng hồ giả nếu có).
export async function confirmQrUi(g) {
  const { page } = g
  await g.shot('qr')
  // tiền thật về sau 1–4 giây; quá 6 giây không có thông báo → ảnh chuyển khoản giả, từ chối
  const ok = await page.waitForSelector(`${T('qr-status')}[data-arrived="true"]`, { timeout: 6000 }).catch(() => null)
  if (!ok) {
    await page.click(T('qr-reject'))
    return false
  }
  await page.click(T('qr-confirm'))
  await page.waitForSelector(T('qr-confirm'), { state: 'detached' })
  return true
}

// Két không đủ tiền lẻ: hộp chọn tự mở; chọn lần lượt làm tròn → mời QR → xin tiền lẻ tới khi xong.
async function resolveNoChangeUi(g) {
  const { page } = g
  for (let k = 0; k < 4; k++) {
    const modal = await page.waitForSelector(`${T('no-change-modal')}:not(.hide)`, { timeout: 500 }).catch(() => null)
    if (!modal) return
    await g.shot('ket-het-tien-le')
    let chosen = null
    for (const o of ['lam_tron', 'moi_qr', 'xin_tien_le']) {
      const btn = await modal.$(T('no-change-' + o))
      if (btn) { chosen = btn; break }
    }
    assert.ok(chosen, 'hộp két hết tiền lẻ không có lựa chọn')
    await chosen.click()
    await modal.waitForElementState('hidden').catch(() => {})
    await page.waitForTimeout(250)
  }
}

// Thối tiền: đọc tiền khách đưa (given-cash data-amount), tính tiền thối bằng số tờ có trong két.
export async function giveChangeUi(g, total) {
  const { page } = g
  for (let attempt = 0; attempt < 3; attempt++) {
    await resolveNoChangeUi(g)
    // mời QR thành công → không còn thối tiền mặt
    if (await page.$(T('qr-status'))) return
    const giveBtn = await page.$(T('give-change'))
    if (!giveBtn) return
    const given = Number(await page.getAttribute(T('given-cash'), 'data-amount'))
    assert.ok(given >= total, `khách đưa ${given} < tổng ${total}`)
    const hint = await page.$(T('change-hint'))
    const due = hint ? Number(await hint.getAttribute('data-amount')) : given - total
    if (!hint) assert.equal(due, given - total)
    const best = minBillsChange(due, await drawerCounts(page))
    if (!best) continue   // két vẫn không thối được: hộp chọn sẽ mở lại
    for (const b of Object.keys(best.bills).map(Number).sort((a, b2) => b2 - a)) {
      for (let k = 0; k < best.bills[b]; k++) await page.click(T('drawer-' + b))
    }
    assert.equal(Number(await page.getAttribute(T('tray'), 'data-amount')), due)
    await g.shot('tinh-tien')
    await page.click(T('give-change'))
    await page.waitForSelector(T('give-change'), { state: 'detached' })
    return
  }
  throw new Error('không thối được tiền')
}

// Chơi ca đang mở qua giao diện: phục vụ lần lượt từng khách (quầy → bếp → giao).
// until(order, result) → true: dừng ngay sau khách đó (ca còn dở). Không có until: chơi tới màn Tổng kết.
// Trả danh sách khách đã phục vụ [{request, total, name, ticketId, stars, customerId}].
export async function playShiftUi(g, { useClock = false, until = null, maxCustomers = 14 } = {}) {
  const { page } = g
  const served = []
  for (let guard = 0; guard < maxCustomers; guard++) {
    const what = await waitCustomerOrEnd(g, { useClock })
    if (what === 'summary') return served
    const order = await serveAtCounter(g)
    if (order.rejected) continue
    // M3: tình huống giữa hai khách (ngay sau khi kẹp phiếu) → cách an toàn; khách đổi ý thì cập nhật yêu cầu thật
    const inc = await resolveIncidentIfShown(g, { waitMs: 300 })
    if (inc) {
      order.incident = inc
      const s = await readSave(page)
      const t = s && s.shift && s.shift.tickets.find(x => x.id === order.ticketId)
      const c = t && s.shift.customers[t.customerId]
      if (c) order.request = c.request
    }
    const res = await cookAndServe(g, order.ticketId, { shots: false })
    served.push({ ...order, ...res })
    if (until && await until(order, res)) return served
    // khách cuối xong thì màn Tổng kết có thể đã hiện: không bắt buộc có tab Quầy
    await page.click(T('tab-counter'), { timeout: 2000 }).catch(() => {})
  }
  await page.waitForSelector(T('summary'), { timeout: 10000 })
  return served
}

// ---------- Khâu bếp ----------

// Nấu hết các dòng của phiếu (ticketId dạng 'p1') và giao. Trả số sao trên phiếu chấm.
// M4: trả thêm tip trên phiếu chấm ({tip: số đồng ở data-tip, tipText: chữ dòng tip, '' nếu phiếu không có dòng tip}).
// Tùy chọn: onChon(line, recipe, i) chạy lúc kệ Chọn nguyên liệu vừa hiện (vd soát nhãn "còn n" của nguyên liệu hiếm);
// wrongPick: true → dòng đầu tiên lấy thêm 1 hàng bẫy có trên kệ (cố ý lỗi "lấy nhầm nguyên liệu").
export async function cookAndServe(g, ticketId, { shots = true, onChon = null, wrongPick = false } = {}) {
  const { page } = g
  await resolveIncidentIfShown(g)
  if (!(await page.isVisible(T('panel-kitchen')))) await page.click(T('tab-kitchen'))
  await page.waitForSelector(T('ticket-' + ticketId))
  const save = await waitSave(page, st => st.shift && st.shift.tickets.some(t => t.id === ticketId))
  const ticket = save.shift.tickets.find(t => t.id === ticketId)
  assert.ok(ticket, 'không thấy phiếu ' + ticketId + ' trong save')
  if (shots) await g.shot('bep-day-phieu')
  for (let i = 0; i < ticket.lines.length; i++) {
    const line = ticket.lines[i]
    const recipe = DATA.RECIPES[line.recipeId]
    if (!(await page.$(T('cook-line-' + i)))) await page.click(T('ticket-' + ticketId))
    await page.click(T('cook-line-' + i))
    await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
    if (onChon) await onChon(line, recipe, i)
    const req = requiredIngredients(recipe, line.notes)
    for (const id of req.required) await page.click(T('shelf-' + id))
    if (wrongPick && i === 0) {
      const decoy = []
      for (const id of recipe.decoys || []) if (await page.$(T('shelf-' + id))) decoy.push(id)
      assert.ok(decoy.length, 'kệ không có hàng bẫy để cố ý lấy nhầm')
      await page.click(T('shelf-' + decoy[0]))
    }
    if (shots) await g.shot('bep-ke-chon')
    await page.click(T('chon-done'))
    await page.waitForSelector(T('board'))
    if (shots) await g.shot('bep-thot')
    await playBoard(g, recipe, { shots })
    await page.click(T('finish-dish'))
    await page.waitForSelector(T('dish-reveal'))
    if (shots) { await page.waitForTimeout(250); await g.shot('bep-cong-bo-mon') }
    await page.waitForSelector(T('dish-reveal'), { state: 'detached', timeout: 5000 })
  }
  await page.waitForSelector(`${T('serve-ticket')}[data-ticket-id="${ticketId}"]`)
  await page.click(`${T('serve-ticket')}[data-ticket-id="${ticketId}"]`)
  const sheet = await page.waitForSelector(`${T('score-sheet')}[data-customer-id="${ticket.customerId}"]`, { timeout: 5000 })
  const stars = Number(await sheet.getAttribute('data-stars'))
  const tipInfo = await readSheetTip(sheet)
  if (shots) { await page.waitForTimeout(300); await g.shot('phieu-cham') }
  return { stars, customerId: ticket.customerId, ...tipInfo }
}

// M4: dòng tip trên phiếu chấm (ElementHandle của score-sheet) → {tip, tipText}.
export async function readSheetTip(sheet) {
  const el = await sheet.$(T('score-sheet-tip'))
  if (!el) return { tip: 0, tipText: '' }
  return { tip: Number(await el.getAttribute('data-tip')) || 0, tipText: ((await el.textContent()) || '').trim() }
}

// Làm mọi bước trên Thớt sơ chế theo thứ tự có thể làm (dùng cả cho Nấu thử ở Chợ Công Thức).
export async function playBoard(g, recipe, { shots = false } = {}) {
  const { page } = g
  for (let guard = 0; guard < 20; guard++) {
    const next = await page.$('[data-testid^="board-step-"].is-available')
    if (!next) break
    const stepId = await next.getAttribute('data-step-id')
    const def = recipe.steps.find(s => s.id === stepId)
    await next.click()
    const sheet = await page.waitForSelector(T('step-sheet'), { timeout: 300 }).catch(() => null)
    if (sheet) {
      if (def.method) await page.click(T('method-' + def.method.correct))
      else await page.click(T('step-start'))
    }
    const hint = await page.waitForSelector(T('step-hint'), { timeout: 400 }).catch(() => null)
    if (hint) await hint.tap().catch(() => {})     // chạm để bỏ qua thẻ gợi ý
    await page.waitForSelector(`${T('minigame-stage')}[data-type="${def.type}"] .mg-foot`)
    await playStage(g, def, { shots })
    await page.waitForSelector('.k-layer', { state: 'hidden', timeout: 60000 })
    await page.waitForSelector(`${T('board-step-' + stepId)}.is-done`)
  }
  const left = await page.$$('[data-testid^="board-step-"]:not(.is-done)')
  assert.equal(left.length, 0, 'còn bước chưa làm')
}

async function center(page, sel) {
  const b = await (await page.$(sel)).boundingBox()
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, box: b }
}

// Chơi một mini-game bằng chuột/cảm ứng, đọc vị trí mục tiêu từ data-*.
export async function playStage(g, def, { shots = false } = {}) {
  const { page } = g
  const S = `${T('minigame-stage')}[data-type="${def.type}"]`
  const mode = def.params && def.params.mode
  const snap = async label => { if (shots) await g.shot('mg-' + label) }

  if (def.type === 'cha') {
    const spots = await page.$$(`${S} [data-testid^="cha-spot-"]`)
    if (spots.length) {
      // vuốt qua lại trên từng vết bẩn
      for (const [k, sp] of spots.entries()) {
        const b = await sp.boundingBox()
        if (!b) continue
        const cx = b.x + b.width / 2, cy = b.y + b.height / 2
        const clean = Number(await sp.getAttribute('data-clean'))
        if (clean >= 1) continue
        await page.mouse.move(cx - 24, cy)
        await page.mouse.down()
        for (let r = 0; r < 5; r++) {
          await page.mouse.move(cx + 24, cy, { steps: 4 })
          await page.waitForTimeout(20)
          await page.mouse.move(cx - 24, cy, { steps: 4 })
          await page.waitForTimeout(20)
          if (k === 0 && r === 1) await snap('cha-vet-ban')
        }
        await page.mouse.up()
      }
    } else {
      // lắc/trộn: vuốt qua lại đủ số lượt
      const c = await center(page, `${S} ${T('cha-area')}`)
      const strokes = Number(def.params.strokes) || 6
      await page.mouse.move(c.x, c.y)
      await page.mouse.down()
      for (let k = 0; k < strokes + 2; k++) {
        await page.mouse.move(c.x + (k % 2 ? -70 : 70), c.y, { steps: 5 })
        // chờ 1 khung hình: trình duyệt gộp các pointermove trong cùng khung, ngón tay thật không đảo chiều nhanh vậy
        await page.waitForTimeout(24)
        if (k === 2) await snap('cha-lac')
      }
      await page.mouse.up()
    }
  } else if (def.type === 'thai') {
    // kéo dao tới vạch (data-x tính từ mép trái sân khấu), nhấc tay để cắt
    const stage = await (await page.$(S)).boundingBox()
    const board = await (await page.$(`${S} ${T('thai-board')}`)).boundingBox()
    const y = board.y + board.height * 0.7
    const xs = await page.$$eval(`${S} [data-testid^="thai-guide-"]`, els => els.map(e => Number(e.dataset.x)))
    for (const [k, gx] of xs.entries()) {
      const x = stage.x + gx
      await page.mouse.move(x - 30, y)
      await page.mouse.down()
      await page.mouse.move(x, y, { steps: 4 })
      if (k === 0) await snap('thai-ngam')
      await page.mouse.up()
    }
  } else if (def.type === 'cham' && mode === 'targets') {
    const bottles = await page.$$(`${S} [data-testid^="cham-bottle-"]`)
    for (const b of bottles) {
      const n = Number(await b.getAttribute('data-target'))
      for (let k = 0; k < n; k++) await b.tap()
    }
    await snap('cham-nem')
    await page.click(`${S} ${T('cham-done')}`)
  } else if (def.type === 'cham' && mode === 'min') {
    const pad = await page.$(`${S} ${T('cham-pad')}`)
    const n = Number(await pad.getAttribute('data-n'))
    const c = await center(page, `${S} ${T('cham-pad')}`)
    for (let k = 0; k < n; k++) {
      await page.mouse.click(c.x, c.y)
      if (k === Math.floor(n / 2)) await snap('cham-vat')
    }
    // bước tự kết thúc sau T giây tính từ lần chạm đầu
  } else if (def.type === 'cham') {
    const n = Number(await page.getAttribute(`${S} ${T('cham-target')}`, 'data-n'))
    const pan = await page.$(`${S} ${T('cham-pan')}`)
    if (pan) {
      // đập trứng vào tâm chảo; đủ n lần tự xong
      const c = await center(page, `${S} ${T('cham-target')}`)
      for (let k = 0; k < n; k++) {
        await page.mouse.click(c.x, c.y)
        if (k === 0) await snap('cham-dap-trung')
      }
    } else {
      for (let k = 0; k < n; k++) await page.tap(`${S} ${T('cham-target')}`)
      await snap('cham-muong')
      await page.click(`${S} ${T('cham-done')}`)
    }
  } else if (def.type === 'lua') {
    // chờ kim tới tâm vùng xanh rồi bấm Nhấc
    const za = Number(await page.getAttribute(`${S} ${T('lua-zone')}`, 'data-a'))
    const zb = Number(await page.getAttribute(`${S} ${T('lua-zone')}`, 'data-b'))
    const target = (za + zb) / 2 - 0.012
    const lift = await center(page, `${S} ${T('lua-lift')}`)
    await snap('lua')
    await page.waitForFunction(([sel, v]) => {
      const n = document.querySelector(sel)
      return !n || Number(n.dataset.v) >= v
    }, [`${S} ${T('lua-needle')}`, target], { polling: 'raf', timeout: 20000 })
    await page.mouse.click(lift.x, lift.y)
  } else if (def.type === 'rot') {
    // giữ để rót, thả tay khi mực tới giữa vạch
    const za = Number(await page.getAttribute(`${S} ${T('rot-zone')}`, 'data-a'))
    const zb = Number(await page.getAttribute(`${S} ${T('rot-zone')}`, 'data-b'))
    const target = (za + zb) / 2 - 0.008
    const pour = await center(page, `${S} ${T('rot-pour')}`)
    await page.mouse.move(pour.x, pour.y)
    await page.mouse.down()
    await page.waitForFunction(([sel, v]) => Number(document.querySelector(sel).dataset.v) >= v * 0.7,
      [`${S} ${T('rot-level')}`, target], { polling: 'raf', timeout: 20000 })
    await snap('rot')
    await page.waitForFunction(([sel, v]) => Number(document.querySelector(sel).dataset.v) >= v,
      [`${S} ${T('rot-level')}`, target], { polling: 'raf', timeout: 20000 })
    await page.mouse.up()
    await page.click(`${S} ${T('rot-done')}:not([disabled])`)
  } else {
    throw new Error('Không biết chơi mini-game: ' + def.type)
  }
}
