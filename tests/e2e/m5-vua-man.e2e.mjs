// E2E "Vừa màn" (M5, sau 0.5.1) — mỗi khâu trong ca thao tác TRỌN TRONG MỘT MÀN, KHÔNG cuộn tay, trên khung điện thoại thật.
// Đặc tả: phương án ghép "Cảnh + Khay" (mục 9 của đặc tả "Vừa màn": testid phải thấy không cuộn ngay khi vào khâu).
//
// Khung CHÍNH (mọi testid cần cho khâu): 402×874 iPhone 16 Pro cài app (vùng an toàn 62/34), 402×680 iPhone 16 Pro Safari,
// 390×844 (vùng an toàn 47/34), 360×780 Android. Khung NHỎ (cột "khung nhỏ" của bảng mục 9 — nút chính của khâu): 360×600,
// 375×553 (vùng an toàn 47/34). Khung iOS mô phỏng iOS cắt phần tử ngoài vùng cuộn (clip-path: inset(0) trên .screen,
// .panel, .k-main) như các e2e iPhone khác.
//
// Bốn luồng × sáu khung (mỗi luồng một ngữ cảnh trình duyệt, 3 luồng chạy song song, cả tệp < 8 phút):
//  · Quầy tiền mặt (ngày 5, thực đơn 4 món, đơn 2 dòng có ghi chú): Order phiếu trống → bảng chọn món → phiếu 2 dòng → đọc
//    lại → Thanh toán (đã gõ tổng) → Tính tiền khay trống → đã lấy tiền thối → Phiếu thu → quầy trống.
//  · Quầy chuyển khoản: chờ tiền về (giờ trang dừng) → tiền đã về → Phiếu thu sau chuyển khoản.
//  · Phiếu chấm có tip (tab Bếp, giao món).
//  · Bếp (3 phiếu, bánh tráng trộn Tây Ninh 9 bước): dây phiếu → phiếu mở → Chọn (rổ trống) → Thớt → sân khấu Thái (giờ
//    trang dừng).
// Ở MỖI trạng thái, không gọi cuộn nào (mọi lần chạm là chạm vào tọa độ đang thấy; phải cuộn mới chạm được thì ghi lỗi rồi mới
// để Playwright tự cuộn cho luồng đi tiếp):
//  · mỗi testid cần của khâu có trong DOM, đang hiện, hộp nằm TRỌN trong vùng nhìn thấy: [0, innerWidth] × [đáy HUD, đỉnh
//    thanh tab] (phần tử HUD: từ mép dưới vùng an toàn trên; thanh tab: tới mép trên vùng an toàn dưới; lớp nổi như bảng chọn
//    món: khung nhìn trừ vùng an toàn), cắt theo mọi tổ tiên có overflow / clip-path, trừ hàng nút dính đáy cùng vùng cuộn;
//  · elementFromPoint ở tâm phần nhìn thấy trúng chính phần tử (nút: thêm 4 điểm gần mép) — không bị thanh tab, hàng nút, lớp
//    khác đè (thẻ thông báo đang bay ngang không tính); nút ≥ 44×44;
//  · chữ đang thấy của màn Ca bán + lớp nổi ≥ 13px, không chữ lỗi; không tràn ngang;
//  · khung chính: hình đĩa món của thực đơn, hình kệ Chọn, hình nguyên liệu trên Thớt ≥ 48px.
// Mỗi luồng gom MỌI chỗ chưa đạt (kèm số đo px) rồi mới báo đỏ một lần, để thấy đủ các chỗ phải sửa.
// Biến môi trường: VUA_MAN_KHUNG=402x874,360x600 (chỉ chạy các khung này), VUA_MAN_LOG=1 (in bậc data-fit, --scene-h,
// --tray-h, vùng cuộn của từng trạng thái), SHOT_DIR=<thư mục> (chụp ảnh từng trạng thái, như các e2e khác).
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  T, openGame, seedSave, readSave, resolveIncidentIfShown, cookShiftSave, COOK_SHIFT_AT, COOK_OPEN_MS
} from './helpers.mjs'
import { playedSave, tipShiftSave, TIP_AT, vn } from '../helpers/m4-saves.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { newRecipeProgress } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { startShift, advance } from '../../src/core/shift.js'
import { priceOfLines, addLine, readback, confirmOrder, reportTotal, changeOptions } from '../../src/core/order.js'
import { normalizeLines, expectedServiceSec, speechFor } from '../../src/core/customer.js'
import { minBillsChange, BILLS } from '../../src/core/money.js'
import { requiredIngredients } from '../../src/core/scoring.js'

const LOG = !!process.env.VUA_MAN_LOG

// ---------- Khung ----------
const FRAMES = {
  '402x874': { w: 402, h: 874, top: 62, bottom: 34, ios: true, main: true, ten: 'iPhone 16 Pro cài app (an toàn 62/34)' },
  '402x680': { w: 402, h: 680, top: 0, bottom: 0, ios: true, main: true, ten: 'iPhone 16 Pro Safari 402×680' },
  '390x844': { w: 390, h: 844, top: 47, bottom: 34, ios: true, main: true, ten: 'iPhone 390×844 cài app (an toàn 47/34)' },
  '360x780': { w: 360, h: 780, top: 0, bottom: 0, ios: false, main: true, ten: 'Android 360×780' },
  '360x600': { w: 360, h: 600, top: 0, bottom: 0, ios: false, main: false, ten: 'Android thấp 360×600 (khung nhỏ)' },
  '375x553': { w: 375, h: 553, top: 47, bottom: 34, ios: true, main: false, ten: 'iPhone SE + Safari 375×553 (khung nhỏ, an toàn 47/34)' }
}
const WANT = (process.env.VUA_MAN_KHUNG || '').split(',').map(s => s.trim()).filter(Boolean)
// khung lạ dạng RỘNGxCAO trong VUA_MAN_KHUNG (vd 402x1700 để soát chính bộ đo): coi như khung chính, không vùng an toàn
for (const k of WANT) {
  const m = /^(\d+)x(\d+)$/.exec(k)
  if (m && !FRAMES[k]) FRAMES[k] = { w: Number(m[1]), h: Number(m[2]), top: 0, bottom: 0, ios: false, main: true, ten: 'Khung thử ' + k }
}
const FRAME_KEYS = Object.keys(FRAMES).filter(k => !WANT.length || WANT.includes(k))

const frameCss = f => `:root { --safe-top: ${f.top}px !important; --safe-bottom: ${f.bottom}px !important; }` +
  (f.ios ? '\n.screen, .panel, .k-main { clip-path: inset(0); }' : '')

// ---------- Phần tử cần của từng khâu (đặc tả mục 9) ----------
// Cú pháp: testid ('readback'), tiền tố testid ('menu-item-*'), hoặc bộ chọn CSS (bắt đầu bằng . # [ hay có dấu cách).
// Đuôi '?' = có thì phải đạt, không có không sao. Đầu 'any:' = ít nhất một phần tử khớp đạt; 'first:' = phần tử đầu tiên đạt.
// main: khung chính; small: khung nhỏ; img: [bộ chọn hình, cạnh nhỏ nhất px], scene: phần tử của cảnh (chỉ khung chính).
const QUAY = ['hud', 'hud-wallet', 'help-button', 'queue', 'progress-4', 'ticket-rail', 'tab-counter', 'tab-kitchen']
// Phần tử thuộc CẢNH của tab Quầy (đặc tả mục 2.3, 4.2, 5): khi màn đã có khay (--tray-h) thì đáy phải nằm trên đỉnh khay.
const CANH = ['queue', 'ticket-rail', 'progress-4', 'speech-bubble']
const ORDER = ['speech-bubble', 'menu-item-*', 'readback', 'confirm-order']
const LINES = ['order-line-0', 'order-line-1', 'order-line-remove-0']
// quầy trống sau khi kẹp phiếu: còn phiếu trên dây nên có nút "Sang Bếp" (go-kitchen)
const IDLE = ['hud', 'hud-wallet', 'help-button', 'tab-counter', 'tab-kitchen', 'counter-idle', 'queue', 'ticket-rail', 'go-kitchen']
const STAGE = '[data-testid="minigame-stage"]'
const NEED = {
  order: { ten: 'Order · phiếu trống', main: [...QUAY, ...ORDER], small: [...QUAY, 'speech-bubble', 'confirm-order', 'any:menu-item-*'], img: [['.co-menu-plate', 48]], scene: CANH },
  sheet: { ten: 'Bảng chọn món', main: ['order-sheet', 'qty-plus', 'qty-minus', 'qty-value', 'note-chip-*', 'add-line', 'sheet-close'], small: ['add-line', 'sheet-close'] },
  lines: { ten: 'Order · phiếu 2 dòng', main: [...QUAY, ...ORDER, ...LINES], small: [...QUAY, 'readback', 'confirm-order'], img: [['.co-menu-plate', 48]], scene: CANH },
  readback: { ten: 'Order · đã đọc lại, chốt được', main: [...QUAY, ...ORDER, ...LINES], small: [...QUAY, 'readback', 'confirm-order'], scene: CANH },
  pay: { ten: 'Thanh toán', main: [...QUAY, 'price-board', 'numpad-*', 'report-total'], small: [...QUAY, 'numpad-*', 'report-total'], scene: CANH },
  // thẻ Khách đưa + thẻ Tổng đặt trên mặt quầy (cảnh) ở khâu Tính tiền
  cash: { ten: 'Tính tiền · khay trống', main: [...QUAY, 'given-cash', 'amount-due', 'drawer', 'drawer-*', 'tray', 'give-change'], small: [...QUAY, 'drawer', 'drawer-*', 'give-change'], scene: [...CANH, 'given-cash', 'amount-due'] },
  tray: { ten: 'Tính tiền · đã lấy tiền thối', main: [...QUAY, 'given-cash', 'amount-due', 'drawer', 'drawer-*', 'tray', 'give-change'], small: [...QUAY, 'drawer', 'drawer-*', 'give-change'], scene: [...CANH, 'given-cash', 'amount-due'] },
  receipt: { ten: 'Phiếu thu (tiền mặt)', main: [...QUAY, 'receipt', 'clip-ticket'], small: [...QUAY, 'clip-ticket'], scene: CANH },
  idle: { ten: 'Quầy trống (đã kẹp phiếu)', main: IDLE, small: IDLE, scene: ['queue', 'ticket-rail'] },
  // khâu chuyển khoản: thẻ Tổng nằm trong khối QR của khay (không phải cảnh)
  qrWait: { ten: 'Chuyển khoản · chờ tiền về', main: [...QUAY, 'qr-status', 'qr-confirm', 'qr-reject', 'amount-due'], small: [...QUAY, 'qr-confirm', 'qr-reject'], scene: CANH },
  qrIn: { ten: 'Chuyển khoản · tiền đã về', main: [...QUAY, 'qr-status', 'qr-confirm', 'qr-reject', 'amount-due'], small: [...QUAY, 'qr-confirm', 'qr-reject'], scene: CANH },
  receiptQr: { ten: 'Phiếu thu (sau chuyển khoản)', main: [...QUAY, 'receipt', 'clip-ticket'], small: [...QUAY, 'clip-ticket'], scene: CANH },
  score: { ten: 'Phiếu chấm có tip', main: ['score-sheet'], small: ['score-sheet'] },
  rail: { ten: 'Bếp · dây phiếu (3 phiếu)', main: ['ticket-rail', 'ticket-p*', 'serve-ticket?'], small: ['first:ticket-p*'] },
  // "‹ Phiếu" (kitchen-back) chỉ có ở đầu bước Chọn / Thớt: ở danh sách phiếu thì có mới đo
  open: { ten: 'Bếp · phiếu mở', main: ['cook-line-*', 'kitchen-back?'], small: ['cook-line-*', 'kitchen-back?'] },
  chon: { ten: 'Bếp · Chọn (rổ trống)', main: ['recipe-card', 'minigame-stage', 'shelf-*', 'chon-basket', 'chon-done', 'kitchen-back'], small: ['chon-done', 'any:shelf-*', 'kitchen-back'], img: [['.chon-icon', 48]] },
  thot: { ten: 'Bếp · Thớt sơ chế', main: ['board', 'board-step-*', 'finish-dish', 'abandon-dish'], small: ['finish-dish', 'any:[data-testid^="board-step-"].is-available'], img: [['.k-ing-art', 48]] }
}
// Sân khấu: đích thao tác theo loại (đặc tả mục 9: "đích thao tác của mini-game, nút trong .mg-foot")
const STAGE_TARGET = { thai: 'thai-board', cha: 'cha-area', dap: 'dap-egg', got: 'got-fruit', lua: 'lua-lift', rot: 'rot-pour', lac: 'lac-shaker', xoay: 'xoay-bowl', bay: 'bay-target', cham: 'cham-done' }
function stageNeed(type) {
  const st = `${STAGE}[data-type="${type}"]`
  const req = [st, STAGE_TARGET[type] ? `${st} [data-testid="${STAGE_TARGET[type]}"]` : null, `${st} .mg-foot`, `${st} .mg-foot button?`].filter(Boolean)
  return { ten: `Bếp · sân khấu ${type}`, main: req, small: req }
}

// ---------- Bản lưu dựng bằng lõi (dựng một lần cho mọi khung) ----------

// Đơn 2 dòng có ghi chú (bánh mì ×2 thêm trứng + cay, bánh tráng trộn thêm trứng cút) trên thực đơn 4 món.
const REQUEST = [
  { recipeId: 'banh_mi_op_la', qty: 2, notes: ['them_trung', 'cay'] },
  { recipeId: 'banh_trang_tron', qty: 1, notes: ['them_trung_cut'] }
]
const MENU_EXTRA = ['ca_phe_sua_da']

// Chạy thử quầy của khách trên BẢN SAO state bằng lõi (ghi đúng, đọc lại, chốt, báo đúng tổng) → khâu Tính tiền của bản sao.
function trialCounter(state, customerId) {
  const st = JSON.parse(JSON.stringify(state))
  const ctx = makeMetaCtx({ at: COOK_SHIFT_AT })
  ctx.setState(st)
  const sh = st.shift
  for (let k = 0; k < 4000 && !(sh.counter && sh.counter.customerId === customerId); k++) {
    if (sh.counter) return null
    advance(st, 0.25, ctx)
  }
  const c = sh.counter
  if (!c || c.customerId !== customerId) return null
  const cust = sh.customers[customerId]
  for (const l of cust.request) addLine(st, l)
  readback(st, ctx)
  if (!confirmOrder(st, ctx).ok) return null
  const result = reportTotal(st, priceOfLines(cust.request, DATA.RECIPES), ctx)
  return { counter: sh.counter, result, drawer: sh.drawer, state: st, ctx }
}

// Như counterShiftSave của helpers.mjs (4 ca người chơi hoàn hảo, mở ca ngày 5 lúc COOK_SHIFT_AT, không tình huống, khách
// đầu rất kiên nhẫn, các khách sau tới muộn 4 phút) nhưng thực đơn đủ 4 món. pay: 'cash' (có tiền thối, két thối được) | 'qr'.
function counterSave(pay) {
  const { state } = playedSave(3, 4, { name: pay === 'qr' ? 'Xe Vừa Màn QR' : 'Xe Vừa Màn', freq: 'it' })
  for (const rid of [...REQUEST.map(l => l.recipeId), ...MENU_EXTRA]) {
    if (!state.recipes[rid]) state.recipes[rid] = newRecipeProgress(0)
    for (const ing of Object.keys(DATA.RECIPES[rid].rare || {})) state.rare.stock[ing] = Math.max(Number(state.rare.stock[ing]) || 0, 4)
  }
  state.upgrades = { ...(state.upgrades || {}) }
  delete state.upgrades.loa_bao_tien
  const ctx = makeMetaCtx({ at: COOK_SHIFT_AT, attach: true })
  ctx.setState(state)
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  const sh = startShift(state, ctx)
  sh.incident = null
  sh.incidentQueue = []
  const customerId = sh.plan[0].customerId
  for (const p of sh.plan.slice(1)) p.arriveAt += 240
  const cust = sh.customers[customerId]
  cust.request = normalizeLines(REQUEST)
  cust.expectedSec = expectedServiceSec(cust.request, ctx)
  cust.speech = speechFor(cust, sh, ctx)
  cust.tutorial = false
  cust.patienceSec = 3600
  delete cust.forcePay
  const total = priceOfLines(cust.request, DATA.RECIPES)
  const base = Number(sh.rng) >>> 0
  for (let k = 0; k < 4000; k++) {
    sh.rng = (base + k * 2654435761) >>> 0
    const t = trialCounter(state, customerId)
    if (!t || t.result.result !== 'dung') continue
    const c = t.counter
    const ok = pay === 'qr'
      ? c.payMethod === 'qr' && !c.fakeQr
      : c.payMethod === 'cash' && c.changeDue > 0 && !changeOptions(t.state, t.ctx).length && !!minBillsChange(c.changeDue, t.drawer)
    if (ok) return { state, customerId, total, request: cust.request }
  }
  throw new Error('không tìm được hạt ngẫu nhiên cho cách trả ' + pay)
}

const SAVES = {
  cash: counterSave('cash'),
  qr: counterSave('qr'),
  tip: (() => {
    const { state, tickets } = tipShiftSave(1)
    const high = tickets.find(t => t.bill >= 20000)
    assert.ok(high, 'ca dựng sẵn có phiếu từ 20.000đ')
    return { state, ticketId: high.ticketId }
  })(),
  // 3 phiếu trên dây: bánh tráng trộn Tây Ninh (9 bước) + trà tắc, rồi 2 phiếu trà tắc; món đã nấu 5 lần (thẻ bước gọn)
  cook: cookShiftSave({ recipeId: 'banh_trang_tron_tay_ninh', extra: ['tra_tac'] }, null, { tickets: 3, cooks: 5, name: 'Xe Bếp Vừa Màn' })
}

// ---------- Thư viện đo trong trang (gắn bằng addInitScript; tự chứa, không dùng biến ngoài) ----------
function installVm() {
  const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
  const rd = v => Math.round(v)
  const clsOf = el => String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').split(/\s+/).filter(Boolean)
  const nameOf = el => {
    if (!el || el.nodeType !== 1) return String(el)
    const t = el.getAttribute('data-testid')
    if (t) return t
    const c = clsOf(el)[0]
    const up = el.parentElement && el.parentElement.closest('[data-testid]')
    return (c ? '.' + c : el.tagName.toLowerCase()) + (up ? '@' + up.getAttribute('data-testid') : '')
  }
  const toCss = s => (/^[.#[]/.test(s) || s.includes(' ') ? s : s.endsWith('*') ? `[data-testid^="${s.slice(0, -1)}"]` : `[data-testid="${s}"]`)
  const shown = el => {
    if (!el || !el.isConnected || !el.getClientRects().length) return false
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return false
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (Number(getComputedStyle(n).opacity) < 0.05) return false
    const r = el.getBoundingClientRect()
    return r.width >= 1 && r.height >= 1
  }
  // bản sao ở lớp hiệu ứng (két bay, phiếu bay) không phải phần tử thao tác
  const find = s => { try { return [...document.querySelectorAll(toCss(s))].filter(e => !e.closest('.vfx-layer') && shown(e)) } catch { return [] } }
  const tappable = el => el.matches('button, [role="button"], a[href], summary, input, select')
  const frame = () => {
    const cs = getComputedStyle(document.documentElement)
    const safeTop = num(cs.getPropertyValue('--safe-top')), safeBottom = num(cs.getPropertyValue('--safe-bottom'))
    const svc = document.querySelector('[data-testid="screen-service"]')
    const hud = svc && svc.querySelector(':scope > .hud')
    const tab = svc && svc.querySelector(':scope > .tabbar')
    return {
      safeTop, safeBottom, svc,
      hudBottom: hud && shown(hud) ? hud.getBoundingClientRect().bottom : safeTop,
      tabTop: tab && shown(tab) ? tab.getBoundingClientRect().top : innerHeight - safeBottom
    }
  }
  // vùng được phép của phần tử theo chỗ nó nằm (đặc tả mục 9)
  const band = (el, F) => {
    if (el.matches('[data-testid="hud"]')) return { top: 0, bottom: innerHeight, zone: 'khung nhìn' }
    if (el.closest('.tabbar')) return { top: F.tabTop, bottom: innerHeight - F.safeBottom, zone: 'thanh tab' }
    // bảng chọn món dính đáy: nền bảng phủ cả vùng an toàn dưới (có đệm riêng), các nút trong bảng thì phải trên vùng đó
    if (el.matches('[data-testid="order-sheet"]')) return { top: F.safeTop, bottom: innerHeight, zone: 'lớp nổi, bảng dính đáy' }
    if (el.closest('.hud')) return { top: F.safeTop, bottom: F.tabTop, zone: 'HUD' }
    if (el.closest('.overlay-root')) return { top: F.safeTop, bottom: innerHeight - F.safeBottom, zone: 'lớp nổi' }
    return { top: F.hudBottom, bottom: F.tabTop, zone: 'giữa HUD và thanh tab' }
  }
  const isVScroll = el => {
    const cs = getComputedStyle(el)
    return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1
  }
  const vScrollerOf = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) if (isVScroll(a)) return a; return null }
  const clipAncestors = el => {
    const out = []
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      if (!a.getClientRects().length) continue
      const cs = getComputedStyle(a)
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || (cs.clipPath && cs.clipPath !== 'none')) out.push(a)
    }
    return out
  }
  // hàng dính (position: sticky) của cùng vùng cuộn: hàng dính đáy nằm sau phần tử thì che phần dưới, dính đầu nằm trước thì
  // che phần trên
  const stickiesOf = (sc, cache) => {
    if (cache.has(sc)) return cache.get(sc)
    const out = []
    for (const s of sc.querySelectorAll('*')) {
      const cs = getComputedStyle(s)
      if (cs.position !== 'sticky' || !shown(s) || vScrollerOf(s) !== sc) continue
      out.push({ s, bottom: cs.bottom !== 'auto', top: cs.top !== 'auto' })
    }
    cache.set(sc, out)
    return out
  }
  const geo = (el, F, cache) => {
    const r = el.getBoundingClientRect()
    const B = band(el, F)
    let t = B.top, b = B.bottom, l = 0, rr = innerWidth
    for (const a of clipAncestors(el)) {
      const ar = a.getBoundingClientRect()
      const top = ar.top + a.clientTop, left = ar.left + a.clientLeft
      t = Math.max(t, top); b = Math.min(b, top + a.clientHeight); l = Math.max(l, left); rr = Math.min(rr, left + a.clientWidth)
    }
    const sc = vScrollerOf(el)
    if (sc) {
      for (const x of stickiesOf(sc, cache)) {
        if (x.s.contains(el) || el.contains(x.s)) continue
        const pos = el.compareDocumentPosition(x.s)
        const sr = x.s.getBoundingClientRect()
        if (x.bottom && (pos & Node.DOCUMENT_POSITION_FOLLOWING)) b = Math.min(b, sr.top)
        else if (x.top && (pos & Node.DOCUMENT_POSITION_PRECEDING)) t = Math.max(t, sr.bottom)
      }
    }
    const v = { top: Math.max(r.top, t), bottom: Math.min(r.bottom, b), left: Math.max(r.left, l), right: Math.min(r.right, rr) }
    return { r, t, b, l, rr, v, zone: B.zone }
  }
  // thẻ thông báo bay ngang (toast) là tạm thời: chạm vào nó không tính là bị che
  const hitOk = (el, x, y) => {
    const e = document.elementFromPoint(x, y)
    return { ok: !!e && (e === el || el.contains(e) || !!e.closest('.toast-stack')), e }
  }
  // lớp trong suốt (không nền, không ảnh nền) nằm trên phần tử CHỈ ĐỂ XEM (vd panel Quầy trong suốt phủ lên cảnh): vẫn thấy
  // phần tử bên dưới nên không tính là bị che; với NÚT thì vẫn là bị che (chạm không tới nút)
  const clearAt = e => {
    if (!e) return false
    const cs = getComputedStyle(e)
    const bg = cs.backgroundColor
    return (bg === 'transparent' || /^rgba\(.*,\s*0\)$/.test(bg)) && cs.backgroundImage === 'none'
  }
  const checkEl = (el, F, cache) => {
    const out = []
    const name = nameOf(el)
    const g = geo(el, F, cache)
    const cut = [['trên', g.t - g.r.top], ['dưới', g.r.bottom - g.b], ['trái', g.l - g.r.left], ['phải', g.r.right - g.rr]]
    const bad = cut.filter(([, px]) => px > 0.5)
    if (bad.length) {
      out.push(`${name} khuất ${bad.map(([k, px]) => `${k} ${rd(px)}px`).join(', ')} (hộp y ${rd(g.r.top)}–${rd(g.r.bottom)} x ${rd(g.r.left)}–${rd(g.r.right)}; vùng thấy y ${rd(g.t)}–${rd(g.b)} x ${rd(g.l)}–${rd(g.rr)}, ${g.zone})`)
    }
    const vw = g.v.right - g.v.left, vh = g.v.bottom - g.v.top
    const tap = tappable(el)
    if (vw < 2 || vh < 2) {
      if (!bad.length) out.push(`${name} không thấy (${rd(Math.max(0, vw))}×${rd(Math.max(0, vh))}px)`)
    } else if (tap || getComputedStyle(el).pointerEvents !== 'none') {
      const cx = g.v.left + vw / 2, cy = g.v.top + vh / 2
      const pts = [[cx, cy]]
      if (tap) {
        const d = Math.min(6, vh / 4), dx = Math.min(vh / 2, vw / 4)
        pts.push([g.v.left + dx, cy], [g.v.right - dx, cy], [cx, g.v.top + d], [cx, g.v.bottom - d])
      }
      const miss = pts.map(([x, y]) => ({ x, y, h: hitOk(el, x, y) })).filter(p => !p.h.ok && (tap || !clearAt(p.h.e)))
      if (miss.length) out.push(`${name} bị che: ${miss.map(p => `${nameOf(p.h.e)} @${rd(p.x)},${rd(p.y)}`).join('; ')}`)
    }
    if (tap && Math.min(g.r.width, g.r.height) < 43.5) out.push(`${name} nút ${rd(g.r.width)}×${rd(g.r.height)} (< 44px)`)
    return out
  }
  const fitInfo = F => {
    const svc = F.svc
    if (!svc) return {}
    const cs = getComputedStyle(svc)
    const sc = []
    for (const p of document.querySelectorAll('.panels > .panel, .k-main, .co-tray, .counter')) {
      if (!shown(p) || !isVScroll(p)) continue
      sc.push(`${nameOf(p)} ${rd(p.clientHeight)}/${rd(p.scrollHeight)} ở ${rd(p.scrollTop)}`)
    }
    return {
      fit: svc.getAttribute('data-fit') || '', tab: svc.getAttribute('data-tab') || '', focus: svc.classList.contains('is-focus'),
      scene: cs.getPropertyValue('--scene-h').trim(), tray: cs.getPropertyValue('--tray-h').trim(),
      hud: rd(F.hudBottom), tabTop: rd(F.tabTop), cuon: sc
    }
  }
  window.__vm = {
    // spec: { req: [...], img: [[bộ chọn, px]] } → { out: [chuỗi chưa đạt], info }
    audit(spec) {
      const F = frame()
      const cache = new Map()
      const out = []
      for (const raw of spec.req) {
        let s = raw, mode = 'all', opt = false
        if (s.startsWith('any:')) { mode = 'any'; s = s.slice(4) } else if (s.startsWith('first:')) { mode = 'first'; s = s.slice(6) }
        if (s.endsWith('?')) { opt = true; s = s.slice(0, -1) }
        let els = find(s)
        if (!els.length) { if (!opt) out.push(`thiếu ${s} (không có trong DOM hoặc đang ẩn)`); continue }
        if (mode === 'first') els = els.slice(0, 1)
        const probs = els.map(el => checkEl(el, F, cache))
        if (mode === 'any') {
          if (!probs.some(p => !p.length)) out.push(`không ${s} nào thấy trọn: ${probs[0].join('; ')}`)
        } else for (const p of probs) out.push(...p)
      }
      // phần tử của cảnh không lấn khay (chỉ khi màn đã chia cảnh / khay: tab Quầy có --tray-h)
      const trayH = F.svc ? num(getComputedStyle(F.svc).getPropertyValue('--tray-h')) : 0
      if ((spec.scene || []).length && trayH > 0 && F.svc.getAttribute('data-tab') === 'counter') {
        const trayTop = F.tabTop - trayH
        for (const s of spec.scene) {
          for (const el of find(s)) {
            const r = el.getBoundingClientRect()
            if (r.bottom > trayTop + 0.5) out.push(`${nameOf(el)} (cảnh) lấn khay ${rd(r.bottom - trayTop)}px (đáy ${rd(r.bottom)} > đỉnh khay ${rd(trayTop)})`)
          }
        }
      }
      // hình đủ to để nhận ra
      for (const [sel, min] of spec.img || []) {
        const els = find(sel).filter(e => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight })
        const small = els.map(e => e.getBoundingClientRect()).filter(r => Math.min(r.width, r.height) < min - 0.5)
        if (small.length) {
          const m = small.reduce((a, r) => (Math.min(r.width, r.height) < Math.min(a.width, a.height) ? r : a))
          out.push(`hình ${sel} nhỏ: ${small.length}/${els.length} hình < ${min}px (nhỏ nhất ${rd(m.width)}×${rd(m.height)})`)
        }
      }
      // chữ đang thấy ≥ 13px, không chữ lỗi (màn Ca bán + lớp nổi; bỏ lớp hiệu ứng và chữ ẩn kiểu "chỉ cho máy đọc")
      const roots = [F.svc, document.querySelector('.overlay-root')].filter(Boolean)
      const seen = new Set()
      const texts = []
      for (const root of roots) {
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        while (w.nextNode()) {
          const t = w.currentNode
          const el = t.parentElement
          const txt = t.textContent.trim()
          if (!txt || !el || seen.has(el) || el.closest('svg') || el.closest('.vfx-layer')) continue
          seen.add(el)
          if (!shown(el)) continue
          const r = el.getBoundingClientRect()
          if (r.width < 3 || r.height < 3 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue
          const fs = parseFloat(getComputedStyle(el).fontSize)
          if (fs > 0 && fs < 12.95) texts.push(`chữ ${fs}px ở ${nameOf(el)}: "${txt.slice(0, 28)}"`)
          if (/undefined|NaN|\[object|\{\w+\}/.test(t.textContent)) texts.push(`chữ lỗi ở ${nameOf(el)}: "${txt.slice(0, 50)}"`)
        }
      }
      if (texts.length) out.push(`${texts.length} chữ < 13px / lỗi: ${texts.slice(0, 6).join('; ')}${texts.length > 6 ? '; …' : ''}`)
      // tràn ngang
      const ov = [document.documentElement.scrollWidth - innerWidth]
      for (const p of document.querySelectorAll('.panels > .panel, .k-main, .overlay-root [data-testid="order-sheet"]')) if (shown(p)) ov.push(p.scrollWidth - p.clientWidth)
      const over = Math.max(0, ...ov)
      if (over > 0.5) out.push(`tràn ngang ${rd(over)}px`)
      return { out, info: fitInfo(F) }
    },
    // Điểm chạm của phần tử đầu tiên khớp, KHÔNG cuộn: phần thấy đủ ≥ 44px (hoặc trọn phần tử) và tâm trúng chính nó.
    tapPoint(sel) {
      const F = frame()
      const el = find(sel)[0]
      if (!el) return { ok: false, why: 'không thấy' }
      const g = geo(el, F, new Map())
      const vw = g.v.right - g.v.left, vh = g.v.bottom - g.v.top
      const key = [g.r.left, g.r.top, g.r.width, g.r.height].map(rd).join(',')
      if (vw < Math.min(43.5, g.r.width - 0.5) || vh < Math.min(43.5, g.r.height - 0.5)) {
        return { ok: false, key, why: `chỉ thấy ${rd(Math.max(0, vw))}×${rd(Math.max(0, vh))}px (hộp y ${rd(g.r.top)}–${rd(g.r.bottom)}, vùng thấy y ${rd(g.t)}–${rd(g.b)})` }
      }
      const x = g.v.left + vw / 2, y = g.v.top + vh / 2
      const h = hitOk(el, x, y)
      if (!h.ok) return { ok: false, key, why: `tâm bị ${nameOf(h.e)} che` }
      return { ok: true, key, x, y }
    },
    // khóa bố cục của các phần tử cần (đứng yên khi hai lần đọc giống nhau)
    layoutKey(req) {
      const out = []
      for (const raw of req) {
        const s = raw.replace(/^(any|first):/, '').replace(/\?$/, '')
        let els = []
        try { els = [...document.querySelectorAll(toCss(s))] } catch { els = [] }
        for (const e of els.slice(0, 40)) { const r = e.getBoundingClientRect(); out.push(rd(r.top), rd(r.height), rd(r.left), rd(r.width)) }
      }
      for (const p of document.querySelectorAll('.panels > .panel, .k-main')) out.push(p.scrollTop)
      return out.join(',')
    }
  }
}

// ---------- Mở khung, ghi lỗi, đo ----------

function openFrame(fk, name, time) {
  const f = FRAMES[fk]
  return openGame({ clock: { time }, name: 'vua-man-' + name, viewport: { width: f.w, height: f.h }, initCss: frameCss(f) })
}

async function boot(g, state) {
  const { page } = g
  await seedSave(page, state)
  await page.addInitScript(installVm)
  await page.goto(g.url('/'))
  await page.waitForSelector(T('screen-service'), { timeout: 30000 })
  await resolveIncidentIfShown(g, { waitMs: 400 })
}

function recorder(fk, flow) {
  const list = []
  const seen = new Set()
  return {
    fk, F: FRAMES[fk], flow, list,
    add(msg) { if (!seen.has(msg)) { seen.add(msg); list.push(msg) } }
  }
}

// Chờ bố cục các phần tử cần đứng yên (hai lần đọc cách 120 ms giống nhau, tối đa ~3 giây).
async function settle(page, req) {
  let prev = ''
  for (let i = 0; i < 25; i++) {
    const k = await page.evaluate(r => window.__vm.layoutKey(r), req)
    if (k === prev) return
    prev = k
    await page.waitForTimeout(120)
  }
}

// Đo một trạng thái (không cuộn gì): ghi mọi chỗ chưa đạt vào R.
async function check(g, R, key, { wait = 400, need = null } = {}) {
  const { page } = g
  const N = need || NEED[key]
  const req = R.F.main ? N.main : N.small
  const img = R.F.main ? (N.img || []) : []
  const scene = R.F.main ? (N.scene || []) : []
  await page.waitForTimeout(wait)
  await settle(page, req)
  const m = await page.evaluate(spec => window.__vm.audit(spec), { req, img, scene })
  for (const s of m.out) R.add(`${N.ten}: ${s}`)
  if (LOG) {
    const i = m.info
    console.log(`[vừa màn] ${R.fk} · ${N.ten}: fit=${i.fit || '-'} tab=${i.tab || '-'}${i.focus ? ' tập trung' : ''} cảnh=${i.scene || '-'} khay=${i.tray || '-'} HUD đáy ${i.hud} · tab đỉnh ${i.tabTop}` +
      (i.cuon && i.cuon.length ? ` · cuộn được: ${i.cuon.join(', ')}` : '') + ` · ${m.out.length} chỗ chưa đạt`)
  }
  await g.shot(key)
}

// Chạm như người chơi, KHÔNG cuộn: chờ phần tử đứng yên rồi chạm vào tọa độ đang thấy. Phải cuộn / bị che mới chạm được thì
// ghi lỗi rồi để Playwright tự cuộn cho luồng đi tiếp. Khung chính ghi mọi lần chạm (record); khung nhỏ được cuộn ngắn nên
// chỉ ghi lần chạm NÚT CHÍNH của khâu (chinh).
async function tap(g, R, sel, { record = true, chinh = false } = {}) {
  const { page } = g
  await page.waitForSelector(sel, { state: 'visible', timeout: 15000 })
  let p = null
  for (let i = 0; i < 15; i++) {
    const a = await page.evaluate(s => window.__vm.tapPoint(s), sel)
    if (p && a.key === p.key && a.ok === p.ok) { p = a; break }
    p = a
    await page.waitForTimeout(70)
  }
  if (p.ok) {
    await page.touchscreen.tap(p.x, p.y)
    return
  }
  if (record && R && (R.F.main || chinh)) R.add(`chạm ${sel} phải cuộn / bị che: ${p.why}`)
  await page.tap(sel)
}

async function pauseClock(page, lead = 60) {
  const t = await page.evaluate(() => Date.now())
  await page.clock.pauseAt(t + lead)
}

function verdict(g, R) {
  const lines = [...R.list, ...g.errors.map(e => 'lỗi trang: ' + e)]
  if (lines.length) assert.fail(`${R.F.ten} · ${R.flow}: ${lines.length} chỗ chưa vừa màn\n  - ${lines.join('\n  - ')}`)
}

// ---------- Quầy ----------

async function waitOrder(page) {
  await page.waitForSelector(T('speech-bubble'), { timeout: 30000 })
  await page.waitForSelector(`${T('progress-4')}[data-stage="order"]`, { timeout: 10000 })
  await page.waitForSelector('[data-testid^="menu-item-"]', { timeout: 10000 })
}

// Ghi phiếu theo đơn; onFirstSheet chạy khi bảng chọn món của dòng đầu vừa mở (trước khi chọn).
async function writeOrder(g, R, request, { record = true, onFirstSheet = null } = {}) {
  const { page } = g
  for (const [i, line] of request.entries()) {
    await tap(g, R, T('menu-item-' + line.recipeId), { record })
    await page.waitForSelector(T('order-sheet'))
    if (i === 0 && onFirstSheet) await onFirstSheet()
    for (const n of line.notes || []) await tap(g, R, T('note-chip-' + n), { record })
    for (let q = 1; q < line.qty; q++) await tap(g, R, T('qty-plus'), { record })
    assert.equal(await page.textContent(T('qty-value')), String(line.qty))
    await tap(g, R, T('add-line'), { record, chinh: true })
    await page.waitForSelector(T('order-sheet'), { state: 'detached' })
  }
  for (let i = 0; i < request.length; i++) await page.waitForSelector(T('order-line-' + i))
}

// Đọc lại đơn: phiếu đúng thì "Chốt order" bật, khách không bắt lỗi.
async function readbackOk(g, R, { record = true } = {}) {
  const { page } = g
  await tap(g, R, T('readback'), { record, chinh: true })
  await page.waitForSelector(`${T('confirm-order')}:not([disabled])`, { timeout: 10000 })
  assert.equal(!!(await page.$(T('caught-list'))), false, 'phiếu đúng mà khách bắt lỗi')
}

async function typeTotal(g, R, total, { record = true } = {}) {
  const { page } = g
  await page.waitForSelector(`${T('progress-4')}[data-stage="thanh_toan"]`, { timeout: 10000 })
  await page.waitForSelector(T('report-total'))
  // con dấu "ĐÃ CHỐT" + phiếu bay (~0,6 giây) xong mới gõ
  await page.waitForTimeout(900)
  for (const d of String(total / 1000)) await tap(g, R, T('numpad-' + d), { record, chinh: true })
  assert.equal(Number(await page.getAttribute(T('numpad-display'), 'data-amount')), total)
}

async function cashFlow(g, R) {
  const { page } = g
  const sv = SAVES.cash
  await boot(g, sv.state)
  await waitOrder(page)
  await check(g, R, 'order', { wait: 900 })
  await writeOrder(g, R, sv.request, { onFirstSheet: () => check(g, R, 'sheet', { wait: 450 }) })
  await check(g, R, 'lines', { wait: 700 })
  await readbackOk(g, R)
  await check(g, R, 'readback', { wait: 900 })
  await tap(g, R, T('confirm-order'), { chinh: true })
  await typeTotal(g, R, sv.total)
  await check(g, R, 'pay', { wait: 300 })
  await tap(g, R, T('report-total'), { chinh: true })
  await page.waitForSelector(T('given-cash'), { timeout: 10000 })
  await check(g, R, 'cash', { wait: 900 })
  // lấy tiền thối ra khay: ít tờ nhất theo két
  const given = Number(await page.getAttribute(T('given-cash'), 'data-amount'))
  const hint = await page.$(T('change-hint'))
  const due = hint ? Number(await hint.getAttribute('data-amount')) : given - sv.total
  const counts = {}
  for (const b of BILLS) counts[b] = Number(await page.getAttribute(T('drawer-' + b), 'data-count')) || 0
  const best = minBillsChange(due, counts)
  assert.ok(best, `két không thối được ${due}đ`)
  for (const b of Object.keys(best.bills).map(Number).sort((a, c) => c - a)) {
    for (let k = 0; k < best.bills[b]; k++) await tap(g, R, T('drawer-' + b), { chinh: true })
  }
  assert.equal(Number(await page.getAttribute(T('tray'), 'data-amount')), due)
  await check(g, R, 'tray', { wait: 500 })
  await tap(g, R, T('give-change'), { chinh: true })
  await page.waitForSelector(T('receipt'), { timeout: 10000 })
  await page.waitForSelector(`${T('clip-ticket')}:not([disabled])`, { timeout: 10000 })
  await check(g, R, 'receipt', { wait: 1300 })
  await tap(g, R, T('clip-ticket'), { chinh: true })
  await page.waitForSelector('[data-testid^="rail-ticket-"]', { timeout: 10000 })
  await page.waitForSelector(T('counter-idle'), { timeout: 10000 })
  await check(g, R, 'idle', { wait: 1500 })
}

async function qrFlow(g, R) {
  const { page } = g
  const sv = SAVES.qr
  await boot(g, sv.state)
  await waitOrder(page)
  // Order → Thanh toán đã đo ở luồng tiền mặt: chạm vẫn không cuộn nhưng không ghi lại lần nữa
  await writeOrder(g, R, sv.request, { record: false })
  await readbackOk(g, R, { record: false })
  await tap(g, R, T('confirm-order'), { record: false })
  await typeTotal(g, R, sv.total, { record: false })
  await tap(g, R, T('report-total'), { record: false })
  await page.waitForSelector(`${T('qr-status')}[data-arrived="false"]`, { timeout: 10000 })
  // dừng giờ trang để tiền chưa về lúc đo (hoạt ảnh CSS vẫn chạy theo giờ thật)
  await pauseClock(page)
  await check(g, R, 'qrWait', { wait: 1200 })
  await page.clock.resume()
  await page.waitForSelector(`${T('qr-status')}[data-arrived="true"]`, { timeout: 10000 })
  await check(g, R, 'qrIn', { wait: 1200 })
  await tap(g, R, T('qr-confirm'), { chinh: true })
  await page.waitForSelector(T('receipt'), { timeout: 10000 })
  await page.waitForSelector(`${T('clip-ticket')}:not([disabled])`, { timeout: 10000 })
  await check(g, R, 'receiptQr', { wait: 1300 })
}

async function scoreFlow(g, R) {
  const { page } = g
  const sv = SAVES.tip
  await boot(g, sv.state)
  await tap(g, R, T('tab-kitchen'), { record: false })
  await page.waitForSelector(T('panel-kitchen'), { state: 'visible' })
  const sel = `${T('serve-ticket')}[data-ticket-id="${sv.ticketId}"]`
  await page.waitForSelector(sel, { timeout: 10000 })
  await tap(g, R, sel)
  await page.waitForSelector(T('score-sheet'), { timeout: 8000 })
  // phiếu chấm đứng yên rồi mới đo (giờ trang dừng: phiếu không tự đóng lúc đo)
  await pauseClock(page)
  await check(g, R, 'score', { wait: 1600 })
}

// ---------- Bếp ----------

// Con dấu kết quả bước đã tắt: không còn step-result, lớp sân khấu của bếp đã ẩn.
async function stampGone(page) {
  await page.waitForFunction(() => {
    const r = document.querySelector('[data-testid="step-result"]')
    const layer = document.querySelector('[data-testid="kitchen"] .k-layer')
    return !(r && r.getClientRects().length) && !(layer && !layer.hidden)
  }, null, { timeout: 6000 }).catch(() => {})
  await page.waitForTimeout(300)
}

// Vừa chạm một bước trên Thớt: qua bảng chọn cách sơ chế / thẻ vào bước tới khi sân khấu dựng xong.
async function enterStage(g, R, def) {
  const { page } = g
  const stageSel = `${STAGE}[data-type="${def.type}"] .mg-foot`
  const done = { sheet: false, hint: false }
  for (let guard = 0; guard < 5; guard++) {
    const what = await (await page.waitForFunction(([st, sh, hi, dn]) => {
      const seen = e => !!e && e.getClientRects().length > 0
      if (!dn.sheet && seen(document.querySelector(sh))) return 'sheet'
      const hint = document.querySelector(hi + ':not(.is-leaving)')
      if (!dn.hint && seen(hint)) return 'hint'
      if (!hint && document.querySelector(st)) return 'stage'
      return ''
    }, [stageSel, T('step-sheet'), T('step-hint'), done], { timeout: 15000 })).jsonValue()
    if (what === 'stage') return
    if (what === 'sheet') {
      done.sheet = true
      await tap(g, R, def.method ? T('method-' + def.method.correct) : T('step-start'), { record: false })
    } else {
      done.hint = true
      await page.tap(T('step-hint'), { timeout: 2000 }).catch(() => {})
    }
  }
  await page.waitForSelector(stageSel, { timeout: 10000 })
}

async function kitchenFlow(g, R) {
  const { page } = g
  const sv = SAVES.cook
  await boot(g, sv.state)
  await tap(g, R, T('tab-kitchen'), { record: false })
  await page.waitForSelector(T('panel-kitchen'), { state: 'visible' })
  await page.waitForSelector('[data-testid^="ticket-p"]', { timeout: 10000 })
  await check(g, R, 'rail', { wait: 700 })
  if (!(await page.$('[data-testid^="cook-line-"]'))) await tap(g, R, `[data-testid="ticket-${sv.ticket.id}"]`, { chinh: true })
  await page.waitForSelector(T('cook-line-0'), { timeout: 5000 })
  await check(g, R, 'open', { wait: 600 })
  await tap(g, R, T('cook-line-0'), { chinh: true })
  await page.waitForSelector(`${STAGE}[data-type="chon"]`, { timeout: 10000 })
  await check(g, R, 'chon', { wait: 900 })
  const s = await readSave(page)
  const cook = s && s.shift && s.shift.cook
  assert.ok(cook, 'chưa có phiên nấu')
  const recipe = DATA.RECIPES[cook.recipeId]
  for (const id of requiredIngredients(recipe, cook.notes || []).required) await tap(g, R, T('shelf-' + id))
  await tap(g, R, T('chon-done'), { chinh: true })
  await page.waitForSelector(T('board'), { timeout: 10000 })
  await stampGone(page)
  await check(g, R, 'thot', { wait: 500 })
  // một sân khấu: bước Thái đang làm được (không có thì bước làm được đầu tiên)
  const stepId = await page.evaluate(() => {
    const av = [...document.querySelectorAll('[data-testid^="board-step-"].is-available')]
    const pick = av.find(e => e.dataset.type === 'thai') || av[0]
    return pick ? pick.dataset.stepId : null
  })
  assert.ok(stepId, 'Thớt không có bước làm được')
  const def = recipe.steps.find(x => x.id === stepId)
  await tap(g, R, T('board-step-' + stepId))
  await enterStage(g, R, def)
  // dừng giờ trang (trò có đồng hồ / kim chạy không tự kết thúc lúc đo)
  await page.waitForTimeout(350)
  await pauseClock(page)
  await check(g, R, 'stage', { wait: 700, need: stageNeed(def.type) })
}

// ---------- Kịch bản ----------

const FLOWS = [
  ['Quầy tiền mặt: Order → bảng chọn món → phiếu 2 dòng → đọc lại → Thanh toán → Tính tiền → Phiếu thu → quầy trống', 'tien-mat', COOK_OPEN_MS, cashFlow],
  ['Quầy chuyển khoản: chờ tiền về → tiền đã về → Phiếu thu', 'qr', COOK_OPEN_MS, qrFlow],
  ['Phiếu chấm có tip', 'phieu-cham', vn(TIP_AT) + 2 * 60 * 1000, scoreFlow],
  ['Bếp: dây phiếu → phiếu mở → Chọn → Thớt → sân khấu Thái', 'bep', COOK_OPEN_MS, kitchenFlow]
]

describe('Vừa màn: mỗi khâu trong ca thao tác trọn một màn, không cuộn tay', { concurrency: 3 }, () => {
  for (const fk of FRAME_KEYS) {
    const f = FRAMES[fk]
    for (const [ten, name, time, run] of FLOWS) {
      it(`${fk} ${f.main ? '(khung chính)' : '(khung nhỏ)'} · ${ten}: ${f.main ? 'mọi testid cần của khâu' : 'nút chính của khâu'} thấy trọn, chạm trúng, không bị che, chữ ≥ 13px, không tràn ngang`, { timeout: 150000 }, async () => {
        const g = await openFrame(fk, name, time)
        const R = recorder(fk, ten)
        try {
          await run(g, R)
          verdict(g, R)
        } finally {
          await g.close()
        }
      })
    }
  }
})
