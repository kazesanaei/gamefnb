// E2E "Vừa màn" — gói L2: khâu THANH TOÁN và TÍNH TIỀN (tiền mặt) trọn một màn điện thoại (đặc tả "Vừa màn" mục 5.2, 5.3, 9).
// Bổ sung cho m5-vua-man.e2e.mjs (chỉ có đơn 2 dòng, thực đơn 4 món) các ca khó / ca chưa e2e nào phủ của hai khâu này:
//  · tiền mặt, đơn 2 dòng (bảng giá NGẮN 3 dòng): Thanh toán (màn LED chưa gõ) → Tính tiền khay trống → đã lấy tiền thối;
//  · đơn 3 dòng nhiều ghi chú + thực đơn 8 món (bảng giá dài, phiếu order hình 2 hàng ở cảnh): Thanh toán;
//  · ngày 1 (khách hướng dẫn, lời Dì Sáu tutor-hint): Thanh toán → Tính tiền;
//  · khách đưa vừa đủ: nút "Không cần thối" + khay ghi "Không cần thối tiền" (tray-empty);
//  · két hết tiền lẻ (5K–50K = 0): hộp no-change-modal (mọi lựa chọn + "Để con xem lại két") → đóng hộp → thẻ "két không đủ tiền
//    lẻ" (no-change, nút no-change-open), két và nút "Đưa tiền thối" vẫn thấy, không bị che.
// Khung CHÍNH (mọi testid của khâu, bảng 9): 402×874 (an toàn 62/34), 402×680, 402×760, 390×844 (47/34), 360×780, 412×915.
// Khung NHỎ (nút chính của khâu; cuộn ngắn trong khay được phép): 375×667, 360×600, 375×553 (47/34), 320×568.
// Ở mỗi trạng thái, KHÔNG gọi cuộn nào:
//  · testid cần: có, đang hiện, hộp nằm trọn trong [0, innerWidth] × [đáy HUD, đỉnh thanh tab] (lớp nổi: khung nhìn trừ vùng
//    an toàn), cắt theo mọi tổ tiên có overflow / clip-path; nút: elementFromPoint ở tâm và 4 điểm gần mép trúng chính nút,
//    cỡ ≥ 44×44; phím số ≥ 48px cao ở khung chính;
//  · phần tử của cảnh (thẻ Khách đưa, thẻ Tổng, phiếu order hình) nằm trên đỉnh khay;
//  · vòng sửa L2: (1) phiếu order hình và ghim không đè chữ của bong bóng khách đang hiện; (2) chữ nhắc "Gõ theo nghìn" của màn
//    LED không chạm / đè chữ số đang hiện; (3) mặt quầy đầu khay Tính tiền (lòng ≥ 46px) có hũ tip + chậu cây (không là tấm gỗ
//    trơn); (4) bảng giá ngắn (≤ 4 dòng) ở khung chính: hàng ≤ 76px, hình món ≥ 48px;
//  · két: mỗi ngăn rộng ≥ 60px, tờ tiền trong ngăn có chữ "TIỀN GAME" + mệnh giá, huy hiệu số tờ không đè ngăn khác;
//  · chữ đang thấy của màn Ca bán + lớp nổi ≥ 13px; không tràn ngang; không lỗi trang.
// Mỗi luồng gom MỌI chỗ chưa đạt rồi mới báo đỏ một lần. VUA_MAN_KHUNG=402x680,360x600 để chạy vài khung; SHOT_DIR=<thư mục>
// để chụp ảnh từng trạng thái; VUA_MAN_LOG=1 in số đo.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, seedSave, counterShiftSave, lineTotal, resolveIncidentIfShown, COOK_SHIFT_AT, COOK_OPEN_MS } from './helpers.mjs'
import { playedSave } from '../helpers/m4-saves.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { defaultState, newRecipeProgress } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { startShift, advance } from '../../src/core/shift.js'
import { normalizeLines, expectedServiceSec, speechFor } from '../../src/core/customer.js'
import { addLine, readback, confirmOrder, reportTotal, priceOfLines } from '../../src/core/order.js'
import { minBillsChange } from '../../src/core/money.js'

// ---------- Khung ----------
const FRAMES = {
  '402x874': { w: 402, h: 874, top: 62, bottom: 34, ios: true, main: true },
  '402x680': { w: 402, h: 680, top: 0, bottom: 0, ios: true, main: true },
  '402x760': { w: 402, h: 760, top: 0, bottom: 0, ios: true, main: true },
  '390x844': { w: 390, h: 844, top: 47, bottom: 34, ios: true, main: true },
  '360x780': { w: 360, h: 780, top: 0, bottom: 0, ios: false, main: true },
  '412x915': { w: 412, h: 915, top: 0, bottom: 0, ios: false, main: true },
  '375x667': { w: 375, h: 667, top: 0, bottom: 0, ios: true, main: false },
  '360x600': { w: 360, h: 600, top: 0, bottom: 0, ios: false, main: false },
  '375x553': { w: 375, h: 553, top: 47, bottom: 34, ios: true, main: false },
  '320x568': { w: 320, h: 568, top: 0, bottom: 0, ios: true, main: false }
}
const WANT = (process.env.VUA_MAN_KHUNG || '').split(',').map(s => s.trim()).filter(Boolean)
const FRAME_KEYS = Object.keys(FRAMES).filter(k => !WANT.length || WANT.includes(k))
const frameCss = f => `:root { --safe-top: ${f.top}px !important; --safe-bottom: ${f.bottom}px !important; }` +
  (f.ios ? '\n.screen, .panel, .k-main { clip-path: inset(0); }' : '')

// ---------- Bản lưu dựng bằng lõi ----------
const REQUEST2 = [{ recipeId: 'banh_mi_op_la', qty: 2, notes: ['them_trung', 'cay'] }, { recipeId: 'tra_tac', qty: 1, notes: [] }]
// đơn 3 dòng tên dài, nhiều ghi chú (phiếu order hình 2 hàng ở cảnh bậc m) + thực đơn 8 món (bảng giá dài)
const MENU8 = ['banh_mi_op_la', 'tra_tac', 'banh_trang_tron', 'ca_phe_sua_da', 'tra_tac_mat_ong', 'banh_mi_trung_ga_ta', 'banh_trang_tron_tay_ninh', 'ca_phe_muoi']
const REQUEST3 = [
  { recipeId: 'banh_trang_tron_tay_ninh', qty: 2, notes: ['cay_nhieu', 'them_trung_cut', 'khong_rau_ram'] },
  { recipeId: 'tra_tac_mat_ong', qty: 1, notes: ['khong_da'] },
  { recipeId: 'ca_phe_muoi', qty: 1, notes: ['it_ngot', 'it_da'] }
]
const BILLS = [5000, 10000, 20000, 50000, 100000, 200000, 500000]

// Chạy thử quầy của khách đầu trên BẢN SAO state (ghi đúng phiếu, đọc lại, chốt, báo đúng tổng) → khâu Tính tiền của bản sao.
function trial(state) {
  const st = JSON.parse(JSON.stringify(state))
  const ctx = makeMetaCtx({ at: COOK_SHIFT_AT })
  ctx.setState(st)
  const sh = st.shift
  const cid = sh.plan[0].customerId
  for (let k = 0; k < 4000 && !(sh.counter && sh.counter.customerId === cid); k++) advance(st, 0.25, ctx)
  if (!sh.counter || sh.counter.customerId !== cid) return null
  const cust = sh.customers[cid]
  for (const l of cust.request) addLine(st, l)
  readback(st, ctx)
  if (!confirmOrder(st, ctx).ok) return null
  const r = reportTotal(st, priceOfLines(cust.request, DATA.RECIPES), ctx)
  return { r, c: sh.counter }
}
// Khách đầu trả tiền mặt và đưa VỪA ĐỦ (không cần thối): dò hạt luồng ngẫu nhiên của ca từ bản lưu tiền mặt chuẩn.
function exactSave() {
  const sv = counterShiftSave({ pay: 'cash', request: [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }, { recipeId: 'tra_tac', qty: 1, notes: [] }], delayOthers: 240, name: 'Xe Vừa Đủ' })
  const sh = sv.state.shift
  const base = Number(sh.rng) >>> 0
  for (let k = 1; k < 6000; k++) {
    sh.rng = (base + k * 2654435761) >>> 0
    const t = trial(sv.state)
    if (t && t.r.result === 'dung' && t.c.payMethod === 'cash' && t.c.changeDue === 0) return sv
  }
  throw new Error('không tìm được hạt để khách đưa vừa đủ tiền')
}
// Két hết tiền lẻ: bản lưu tiền mặt chuẩn (có tiền thối), rút sạch ngăn 5K–50K → hộp "Két không đủ tiền lẻ" tự mở ở Tính tiền.
function noChangeSave() {
  const sv = counterShiftSave({ pay: 'cash', request: REQUEST2, delayOthers: 240, name: 'Xe Hết Lẻ' })
  for (const b of BILLS) if (b <= 50000) sv.state.shift.drawer[b] = 0
  return sv
}
// Ca đông: thực đơn 8 món (nguyên liệu hiếm còn 4 phần), khách đầu gọi đơn 3 dòng.
function busySave() {
  const { state } = playedSave(3, 4, { name: 'Xe Ca Đông', freq: 'it' })
  for (const rid of MENU8) {
    if (!state.recipes[rid]) state.recipes[rid] = newRecipeProgress(0)
    for (const ing of Object.keys(DATA.RECIPES[rid].rare || {})) state.rare.stock[ing] = Math.max(Number(state.rare.stock[ing]) || 0, 4)
  }
  const ctx = makeMetaCtx({ at: COOK_SHIFT_AT, attach: true })
  ctx.setState(state)
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  const sh = startShift(state, ctx)
  sh.incident = null
  sh.incidentQueue = []
  for (const p of sh.plan.slice(1)) p.arriveAt += 240
  const cust = sh.customers[sh.plan[0].customerId]
  cust.request = normalizeLines(REQUEST3)
  cust.expectedSec = expectedServiceSec(cust.request, ctx)
  cust.speech = speechFor(cust, sh, ctx)
  cust.tutorial = false
  cust.patienceSec = 3600
  return { state, request: cust.request }
}
// Ngày 1 của xe mới: ca vừa mở, khách đầu là khách hướng dẫn (lời Dì Sáu).
function day1Save() {
  const ctx = makeMetaCtx({ at: COOK_SHIFT_AT, attach: true })
  const state = defaultState(42, DATA)
  ctx.setState(state)
  state.shopName = 'Xe Bánh Mì Cô Ba'
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  state.checkin.lastDay = '2026-12-31'
  startShift(state, ctx)
  return { state }
}
const SAVES = {
  cash: counterShiftSave({ pay: 'cash', request: REQUEST2, delayOthers: 240, name: 'Xe Vừa Màn' }),
  busy: busySave(),
  day1: day1Save(),
  exact: exactSave(),
  noChange: noChangeSave()
}

// ---------- Đo trong trang (tự chứa) ----------
function auditMoney(spec) {
  const out = { miss: [], info: {} }
  const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
  const rd = v => Math.round(v)
  const rootCs = getComputedStyle(document.documentElement)
  const safeTop = num(rootCs.getPropertyValue('--safe-top'))
  const safeBottom = num(rootCs.getPropertyValue('--safe-bottom'))
  const svc = document.querySelector('[data-testid="screen-service"]')
  const hud = svc && svc.querySelector(':scope > .hud')
  const tab = svc && svc.querySelector(':scope > .tabbar')
  const hudBottom = hud ? hud.getBoundingClientRect().bottom : safeTop
  const tabTop = tab ? tab.getBoundingClientRect().top : innerHeight - safeBottom
  const shown = el => {
    if (!el || !el.isConnected || !el.getClientRects().length) return false
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return false
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (Number(getComputedStyle(n).opacity) < 0.05) return false
    const r = el.getBoundingClientRect()
    return r.width >= 1 && r.height >= 1
  }
  const nameOf = el => (el ? (el.getAttribute('data-testid') || String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || el.tagName).split(' ')[0]) : 'không có')
  const toCss = s => (/^[.#[]/.test(s) || s.includes(' ') ? s : s.endsWith('*') ? `[data-testid^="${s.slice(0, -1)}"]` : `[data-testid="${s}"]`)
  const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  const band = el => {
    if (el.matches('[data-testid="hud"]')) return { top: 0, bottom: innerHeight }
    if (el.closest('.overlay-root')) return { top: safeTop, bottom: innerHeight - safeBottom }
    if (el.closest('.tabbar')) return { top: tabTop, bottom: innerHeight - safeBottom }
    if (el.closest('.hud')) return { top: safeTop, bottom: tabTop }
    return { top: hudBottom, bottom: tabTop }
  }
  const visibleBox = el => {
    const r = el.getBoundingClientRect()
    const B = band(el)
    let t = B.top, b = B.bottom, l = 0, rr = innerWidth
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      if (!a.getClientRects().length) continue
      const cs = getComputedStyle(a)
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
      const ar = a.getBoundingClientRect()
      t = Math.max(t, ar.top + a.clientTop); b = Math.min(b, ar.top + a.clientTop + a.clientHeight)
      l = Math.max(l, ar.left + a.clientLeft); rr = Math.min(rr, ar.left + a.clientLeft + a.clientWidth)
    }
    return { r, t, b, l, rr }
  }
  const tappable = el => el.matches('button, [role="button"], a[href], input, select, summary')
  const hit = (el, x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e) || !!e.closest('.toast-stack')) }
  for (const raw of spec.req || []) {
    const any = raw.startsWith('any:')
    const opt = raw.endsWith('?')
    const sel = (any ? raw.slice(4) : raw).replace(/\?$/, '')
    let els = []
    try { els = [...document.querySelectorAll(toCss(sel))].filter(e => !e.closest('.vfx-layer') && shown(e)) } catch { els = [] }
    if (!els.length) { if (!opt) out.miss.push(`${sel}: không có / không hiện`); continue }
    const bad = []
    for (const el of els) {
      const { r, t, b, l, rr } = visibleBox(el)
      const cut = Math.max(0, t - r.top) + Math.max(0, r.bottom - b) + Math.max(0, l - r.left) + Math.max(0, r.right - rr)
      if (cut > 1) { bad.push(`${nameOf(el)} khuất ${rd(cut)}px [${rd(r.top)}–${rd(r.bottom)} / thấy ${rd(t)}–${rd(b)}]`); continue }
      if (tappable(el)) {
        if (r.width < 43.5 || r.height < 43.5) { bad.push(`${nameOf(el)} nhỏ ${rd(r.width)}×${rd(r.height)}`); continue }
        const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, dx = Math.min(10, r.width / 4), dy = Math.min(8, r.height / 4)
        const pts = [[cx, cy], [r.left + dx, cy], [r.right - dx, cy], [cx, r.top + dy], [cx, r.bottom - dy]]
        const miss = pts.filter(([x, y]) => !hit(el, x, y))
        if (miss.length) bad.push(`${nameOf(el)} bị che (${miss.map(([x, y]) => nameOf(document.elementFromPoint(x, y))).join(', ')})`)
      }
    }
    if (any ? bad.length === els.length : bad.length) out.miss.push(...(any ? [bad[0]] : bad))
  }
  // phím số: cao tối thiểu (48px ở khung chính)
  if (spec.keyMin) {
    for (const k of document.querySelectorAll('.cs-pos .cs-key')) {
      if (!shown(k)) continue
      const r = k.getBoundingClientRect()
      if (r.height < spec.keyMin - 0.5) { out.miss.push(`phím ${nameOf(k)} cao ${rd(r.height)} < ${spec.keyMin}px`); break }
    }
  }
  // phần tử của cảnh nằm trên đỉnh khay
  const stage = document.querySelector('[data-testid="counter-panel"] > .stage, .co-scene > .stage')
  const trayTop = stage ? stage.getBoundingClientRect().top : null
  out.info.trayTop = trayTop === null ? null : rd(trayTop)
  for (const sel of spec.scene || []) {
    const el = document.querySelector(toCss(sel))
    if (!el || !shown(el) || trayTop === null) continue
    const r = el.getBoundingClientRect()
    if (r.bottom > trayTop + 0.5) out.miss.push(`${sel} (cảnh) lấn khay ${rd(r.bottom - trayTop)}px`)
  }
  // (1) phiếu order hình + ghim không đè chữ của bong bóng khách đang hiện
  const slip = document.querySelector('.co-scene .cs-slip')
  const bub = document.querySelector('.co-scene .co-bubble')
  if (slip && shown(slip) && bub && shown(bub)) {
    const say = bub.querySelector('.co-bubble-say') || bub
    const rg = document.createRange()
    rg.selectNodeContents(say)
    const tr = rg.getBoundingClientRect()
    const sr = slip.getBoundingClientRect()
    if (overlap(tr, sr) > 1) out.miss.push(`phiếu order hình đè chữ bong bóng khách ${rd(Math.min(tr.bottom, sr.bottom) - Math.max(tr.top, sr.top))}px`)
    const pin = slip.querySelector('.cs-slip-pin')
    if (pin && shown(pin) && overlap(tr, pin.getBoundingClientRect()) > 1) out.miss.push('ghim phiếu order đè chữ bong bóng khách')
    out.info.slip = [rd(sr.top), rd(sr.bottom), 'bóng', rd(tr.top), rd(tr.bottom)]
  }
  // (2) chữ nhắc "Gõ theo nghìn" không chạm chữ số đang hiện của màn LED
  const tip = document.querySelector('.cs-pos .cs-led-tip')
  if (tip && shown(tip)) {
    const tr = (() => { const rg = document.createRange(); rg.selectNodeContents(tip); return rg.getBoundingClientRect() })()
    const frame = tip.closest('.cs-led-frame').getBoundingClientRect()
    if (tr.left < frame.left - 0.5 || tr.right > frame.right + 0.5) out.miss.push(`chữ nhắc màn LED tràn khung [${rd(tr.left)}–${rd(tr.right)} / ${rd(frame.left)}–${rd(frame.right)}]`)
    for (const d of document.querySelectorAll('[data-testid="numpad-display"] > *')) {
      if (!shown(d) || !d.textContent.trim()) continue
      const rg = document.createRange()
      rg.selectNodeContents(d)
      const dr = rg.getBoundingClientRect()
      const gap = Math.max(dr.left - tr.right, tr.left - dr.right)
      if (gap < 4 && Math.min(dr.bottom, tr.bottom) > Math.max(dr.top, tr.top)) { out.miss.push(`chữ nhắc màn LED chạm số "${d.textContent}" (khe ${rd(gap)}px)`); break }
    }
    out.info.ledTip = [rd(tr.left), rd(tr.right), rd(frame.width)]
  }
  // (3) mặt quầy đầu khay Tính tiền: lòng cao ≥ 46px (cả mép ≈ 49px) thì có hũ tip + chậu cây, không là tấm gỗ trơn
  const top = document.querySelector('.co-scene .cs-counter-top')
  if (top && shown(top)) {
    const h = top.clientHeight
    out.info.counterTop = rd(h)
    if (h >= 46) for (const s of ['.cs-tipjar', '.cs-plant']) if (!shown(top.querySelector(s))) out.miss.push(`mặt quầy cao ${rd(h)}px mà không có ${s}`)
  }
  // (4) bảng giá ngắn (≤ 4 dòng) ở khung chính: hàng gọn, hình món ≥ 48px
  const rows = [...document.querySelectorAll('[data-testid="price-board"] .cs-board-row')].filter(shown)
  if (spec.board && rows.length && rows.length <= 4) {
    const hs = rows.map(r => r.getBoundingClientRect().height)
    out.info.boardRows = hs.map(rd)
    if (Math.max(...hs) > 76) out.miss.push(`bảng giá ngắn: hàng cao ${rd(Math.max(...hs))}px (> 76, bảng thưa)`)
    for (const d of document.querySelectorAll('[data-testid="price-board"] .cs-board-dish')) {
      const r = d.getBoundingClientRect()
      if (shown(d) && Math.min(r.width, r.height) < 47.5) { out.miss.push(`bảng giá ngắn: hình món ${rd(r.width)}px < 48`); break }
    }
  }
  // két: ngăn rộng ≥ 60px, tờ tiền đọc được (chữ TIỀN GAME + mệnh giá), huy hiệu số tờ không đè ngăn khác
  const slots = [...document.querySelectorAll('.co-scene [data-testid^="drawer-"]')].filter(shown)
  if (spec.drawer && slots.length) {
    const narrow = slots.find(s => s.getBoundingClientRect().width < 59.5)
    if (narrow) out.miss.push(`ngăn két ${nameOf(narrow)} rộng ${rd(narrow.getBoundingClientRect().width)}px < 60`)
    for (const s of slots) {
      const svgText = [...s.querySelectorAll('svg text')].map(t => t.textContent).join(' ')
      if (!/TIỀN GAME/.test(svgText)) { out.miss.push(`tờ tiền ngăn ${nameOf(s)} không có chữ TIỀN GAME`); break }
      const badge = s.querySelector('.cs-slot-count')
      if (!badge) continue
      const br = badge.getBoundingClientRect()
      // chạm mép (< 1px) không tính, lấn vào ngăn khác mới tính
      const other = slots.find(o => {
        if (o === s) return false
        const r = o.getBoundingClientRect()
        return Math.min(br.right, r.right) - Math.max(br.left, r.left) > 1 && Math.min(br.bottom, r.bottom) - Math.max(br.top, r.top) > 1
      })
      if (other) { out.miss.push(`huy hiệu số tờ ${nameOf(s)} đè ngăn ${nameOf(other)}`); break }
    }
    out.info.slot = [rd(Math.min(...slots.map(s => s.getBoundingClientRect().width))), rd(Math.min(...slots.map(s => s.getBoundingClientRect().height)))]
  }
  // chữ ≥ 13px (màn Ca bán + lớp nổi), không chữ lỗi
  const roots = [svc, ...document.querySelectorAll('.overlay-root [data-testid="no-change-modal"]')].filter(Boolean)
  for (const root of roots) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    while (w.nextNode()) {
      const tn = w.currentNode
      const el = tn.parentElement
      if (!tn.textContent.trim() || !el || el.closest('svg') || !shown(el)) continue
      const cs = getComputedStyle(el)
      if (cs.clipPath && cs.clipPath.includes('inset(50%')) continue
      const fs = num(cs.fontSize)
      if (fs > 0 && fs < 13) { out.miss.push(`chữ ${fs}px ở ${nameOf(el)}: "${tn.textContent.trim().slice(0, 24)}"`); break }
      if (/undefined|NaN|\[object|\{\w+\}/.test(tn.textContent)) out.miss.push(`chữ lỗi ở ${nameOf(el)}`)
    }
  }
  const over = document.documentElement.scrollWidth - innerWidth
  if (over > 0) out.miss.push(`tràn ngang ${over}px`)
  out.info.fit = svc ? svc.dataset.fit : ''
  out.info.scene = svc ? svc.dataset.scene || '' : ''
  return out
}

// ---------- Thao tác ----------
async function waitOrder(page) {
  await page.waitForSelector(T('speech-bubble'), { timeout: 40000 })
  await page.waitForSelector(`${T('progress-4')}[data-stage="order"]`, { timeout: 10000 })
}
async function writeOrder(page, request) {
  for (const line of request) {
    await page.click(T('menu-item-' + line.recipeId))
    await page.waitForSelector(T('order-sheet'))
    for (const n of line.notes || []) await page.click(T('note-chip-' + n))
    for (let q = 1; q < (line.qty || 1); q++) await page.click(T('qty-plus'))
    await page.click(T('add-line'))
    await page.waitForSelector(T('order-sheet'), { state: 'detached' })
  }
  await page.click(T('readback'))
  await page.waitForSelector(`${T('confirm-order')}:not([disabled])`, { timeout: 10000 })
  await page.click(T('confirm-order'))
  await page.waitForSelector(T('report-total'), { timeout: 10000 })
}
async function reportTotalUi(page, total) {
  for (const d of String(total / 1000)) await page.click(T('numpad-' + d))
  await page.click(T('report-total'))
  await page.waitForSelector(T('given-cash'), { timeout: 10000 })
}
async function drawerCounts(page) {
  const d = {}
  for (const b of BILLS) d[b] = Number(await page.getAttribute(T('drawer-' + b), 'data-count')) || 0
  return d
}

const QUAY = ['hud', 'hud-wallet', 'help-button', 'queue', 'progress-4', 'ticket-rail', 'tab-counter', 'tab-kitchen']
const KEYS = ['numpad-0', 'numpad-1', 'numpad-2', 'numpad-3', 'numpad-4', 'numpad-5', 'numpad-6', 'numpad-7', 'numpad-8', 'numpad-9', 'numpad-clear', 'numpad-back']
const DRAWER = ['drawer', ...BILLS.map(b => 'drawer-' + b)]
const NEED = {
  pay: { main: [...QUAY, 'price-board', ...KEYS, 'numpad-display', 'report-total'], small: [...KEYS, 'numpad-display', 'report-total'], scene: ['.cs-slip'], board: true },
  payDay1: { main: [...QUAY, 'tutor-hint', 'price-board', ...KEYS, 'numpad-display', 'report-total'], small: [...KEYS, 'numpad-display', 'report-total'], scene: ['.cs-slip'], board: true },
  cash: { main: [...QUAY, 'given-cash', 'amount-due', ...DRAWER, 'tray', 'give-change'], small: [...DRAWER, 'give-change'], scene: ['given-cash', 'amount-due'], drawer: true },
  cashDay1: { main: [...QUAY, 'tutor-hint', 'given-cash', 'amount-due', ...DRAWER, 'tray', 'give-change'], small: [...DRAWER, 'give-change'], scene: ['given-cash', 'amount-due'], drawer: true },
  exact: { main: [...QUAY, 'given-cash', 'amount-due', ...DRAWER, 'tray', 'tray-empty', 'give-change'], small: [...DRAWER, 'tray-empty', 'give-change'], scene: ['given-cash', 'amount-due'], drawer: true },
  modal: { main: ['no-change-modal', 'no-change-xin_tien_le?', 'no-change-moi_qr?', 'no-change-lam_tron?', 'any:[data-testid^="no-change-"].choice', 'no-change-cancel'], small: ['any:[data-testid^="no-change-"].choice', 'no-change-cancel'] },
  banner: { main: [...QUAY, 'given-cash', 'amount-due', 'no-change', 'no-change-open', ...DRAWER, 'tray', 'give-change'], small: ['no-change-open', ...DRAWER, 'give-change'], scene: ['given-cash', 'amount-due'], drawer: true }
}

async function check(g, f, key, label, fails) {
  await g.page.waitForTimeout(450)
  const N = NEED[key]
  const spec = { req: f.main ? N.main : N.small, scene: f.main ? (N.scene || []) : [], keyMin: f.main ? 48 : 44, board: !!(N.board && f.main), drawer: !!N.drawer }
  if (!/^pay/.test(key)) spec.keyMin = 0
  const m = await g.page.evaluate(auditMoney, spec)
  if (process.env.VUA_MAN_LOG) console.log(label, JSON.stringify(m.info))
  if (key !== 'modal' && !m.info.scene) fails.push(`${label}: panel Quầy chưa theo bố cục cảnh (thiếu data-scene)`)
  for (const x of m.miss) fails.push(`${label}: ${x}`)
  await g.shot(key)
}
const pageErrors = g => g.errors.filter(e => !/favicon|ERR_ABORTED/.test(e))

async function open(f, name, state) {
  const g = await openGame({ clock: { time: COOK_OPEN_MS }, viewport: { width: f.w, height: f.h }, initCss: frameCss(f), name })
  await seedSave(g.page, state)
  await g.page.goto(g.url('/'))
  await resolveIncidentIfShown(g, { waitMs: 300 })
  await waitOrder(g.page)
  return g
}

describe('Vừa màn · Thanh toán + Tính tiền (L2)', { concurrency: 3 }, () => {
  for (const k of FRAME_KEYS) {
    const f = FRAMES[k]
    const tag = `${k}${f.main ? '' : ' (khung nhỏ)'}`
    it(`${tag}: tiền mặt đơn 2 dòng — Thanh toán (bảng giá ngắn, màn LED chưa gõ), Tính tiền khay trống, đã lấy tiền thối`, { timeout: 150000 }, async () => {
      const g = await open(f, 'vua-man-tien-' + k, SAVES.cash.state)
      const fails = []
      try {
        const { page } = g
        await writeOrder(page, SAVES.cash.request)
        await check(g, f, 'pay', `${k} Thanh toán (2 dòng)`, fails)
        await reportTotalUi(page, SAVES.cash.total)
        await check(g, f, 'cash', `${k} Tính tiền khay trống`, fails)
        const hint = await page.$(T('change-hint'))
        const given = Number(await page.getAttribute(T('given-cash'), 'data-amount'))
        const due = hint ? Number(await hint.getAttribute('data-amount')) : given - SAVES.cash.total
        const best = minBillsChange(due, await drawerCounts(page))
        assert.ok(best, 'két thối được')
        for (const b of Object.keys(best.bills).map(Number).sort((a, c) => c - a)) for (let i = 0; i < best.bills[b]; i++) await page.click(T('drawer-' + b))
        assert.equal(Number(await page.getAttribute(T('tray'), 'data-amount')), due)
        await page.waitForTimeout(500)
        await check(g, f, 'cash', `${k} Tính tiền đã lấy tiền thối`, fails)
        await page.click(T('give-change'))
        await page.waitForSelector(T('receipt'), { timeout: 10000 })
        assert.deepEqual(pageErrors(g), [], 'lỗi trang')
      } finally {
        await g.close()
      }
      assert.deepEqual(fails, [], `${k}: ${fails.length} chỗ chưa vừa màn`)
    })
    it(`${tag}: đơn 3 dòng nhiều ghi chú + thực đơn 8 món — Thanh toán (phiếu order hình không đè bong bóng)`, { timeout: 150000 }, async () => {
      const g = await open(f, 'vua-man-tien-3dong-' + k, SAVES.busy.state)
      const fails = []
      try {
        const { page } = g
        assert.equal(await page.locator('[data-testid^="menu-item-"]').count(), 8, 'thực đơn 8 món')
        await writeOrder(page, SAVES.busy.request)
        await check(g, f, 'pay', `${k} Thanh toán (3 dòng, 8 món)`, fails)
        assert.equal(await page.locator('.cs-slip-line').count(), 3, 'phiếu order hình 3 dòng')
        assert.deepEqual(pageErrors(g), [], 'lỗi trang')
      } finally {
        await g.close()
      }
      assert.deepEqual(fails, [], `${k}: ${fails.length} chỗ chưa vừa màn`)
    })
    it(`${tag}: ngày 1 — Thanh toán và Tính tiền có lời Dì Sáu`, { timeout: 150000 }, async () => {
      const g = await open(f, 'vua-man-tien-ngay1-' + k, SAVES.day1.state)
      const fails = []
      try {
        const { page } = g
        await page.waitForSelector(T('tutor-hint'), { timeout: 10000 })
        const request = JSON.parse(await page.getAttribute(T('speech-bubble'), 'data-request'))
        await writeOrder(page, request)
        await page.waitForSelector(T('tutor-hint'), { timeout: 10000 })
        await check(g, f, 'payDay1', `${k} ngày 1 Thanh toán`, fails)
        await reportTotalUi(page, lineTotal(request))
        await page.waitForSelector(T('tutor-hint'), { timeout: 10000 })
        await check(g, f, 'cashDay1', `${k} ngày 1 Tính tiền`, fails)
        assert.deepEqual(pageErrors(g), [], 'lỗi trang')
      } finally {
        await g.close()
      }
      assert.deepEqual(fails, [], `${k}: ${fails.length} chỗ chưa vừa màn`)
    })
    it(`${tag}: khách đưa vừa đủ — "Không cần thối", khay "Không cần thối tiền"`, { timeout: 150000 }, async () => {
      const g = await open(f, 'vua-man-tien-vuadu-' + k, SAVES.exact.state)
      const fails = []
      try {
        const { page } = g
        await writeOrder(page, SAVES.exact.request)
        await reportTotalUi(page, SAVES.exact.total)
        assert.equal(Number(await page.getAttribute(T('given-cash'), 'data-amount')), SAVES.exact.total, 'khách đưa vừa đủ')
        assert.equal((await page.textContent(T('give-change'))).trim(), 'Không cần thối')
        assert.equal((await page.textContent(T('tray-empty'))).trim(), 'Không cần thối tiền')
        await check(g, f, 'exact', `${k} Không cần thối`, fails)
        await page.click(T('give-change'))
        await page.waitForSelector(T('receipt'), { timeout: 10000 })
        assert.deepEqual(pageErrors(g), [], 'lỗi trang')
      } finally {
        await g.close()
      }
      assert.deepEqual(fails, [], `${k}: ${fails.length} chỗ chưa vừa màn`)
    })
    it(`${tag}: két hết tiền lẻ — hộp chọn cách xử lý, đóng hộp thì thẻ báo + két + nút vẫn thấy`, { timeout: 150000 }, async () => {
      const g = await open(f, 'vua-man-tien-hetle-' + k, SAVES.noChange.state)
      const fails = []
      try {
        const { page } = g
        await writeOrder(page, SAVES.noChange.request)
        await reportTotalUi(page, SAVES.noChange.total)
        await page.waitForSelector(`${T('no-change-modal')}:not(.hide)`, { timeout: 8000 })
        await page.waitForTimeout(400)
        await check(g, f, 'modal', `${k} hộp két hết tiền lẻ`, fails)
        await page.click(T('no-change-cancel'))
        await page.waitForSelector(T('no-change-modal'), { state: 'hidden', timeout: 5000 }).catch(() => {})
        await page.waitForSelector(T('no-change-open'), { timeout: 5000 })
        await check(g, f, 'banner', `${k} thẻ két hết tiền lẻ`, fails)
        // mở lại hộp bằng nút của thẻ, xin khách tiền lẻ: luồng đi tiếp không lỗi
        await page.click(T('no-change-open'))
        await page.waitForSelector(`${T('no-change-modal')}:not(.hide)`, { timeout: 5000 })
        const pick = (await page.$(T('no-change-xin_tien_le'))) || (await page.$(T('no-change-lam_tron'))) || (await page.$(T('no-change-moi_qr')))
        assert.ok(pick, 'hộp có lựa chọn')
        await pick.click()
        await page.waitForTimeout(800)
        assert.deepEqual(pageErrors(g), [], 'lỗi trang')
      } finally {
        await g.close()
      }
      assert.deepEqual(fails, [], `${k}: ${fails.length} chỗ chưa vừa màn`)
    })
  }
})
