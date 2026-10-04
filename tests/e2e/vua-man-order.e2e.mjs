// E2E "Vừa màn" — khâu ORDER (gói L1): panel Quầy là lưới CẢNH + KHAY (lớp co-scene), khâu Order trọn một màn điện thoại.
// Đặc tả "Vừa màn" mục 5.0, 5.1 và bảng 9 (testid phải THẤY KHÔNG CUỘN ngay khi vào khâu). Bổ sung cho m5-vua-man.e2e.mjs
// (thực đơn 4 món, đơn 2 dòng) các ca khó của khâu Order:
//  · ca đông: thực đơn 8 món (4 món thường + 4 món hiếm "★ còn n"), đơn 3 dòng có ghi chú — phiếu trống, bảng chọn món mở,
//    khách bắt lỗi (đọc lại khi còn thiếu một dòng), phiếu đủ 3 dòng đã đọc lại;
//  · ngày 1: khách hướng dẫn, lời Dì Sáu (tutor-hint) là một hàng của khay — phiếu trống và phiếu đã ghi;
//  · đơn chuẩn 2 dòng (như e2e T) của KHÁCH LẠ tên dài: lời gọi món trọn trong bong bóng lúc vào khâu và sau "Đọc lại đơn",
//    nhãn tên không tràn khỏi viên nhãn / mép màn / bong bóng.
// Vòng sửa: khách bắt lỗi ở phiếu 3 dòng + thực đơn 8 món (một dòng sai ghi chú + ghi thiếu một món): mọi dòng phiếu, nhãn lỗi
// trên dòng và lỗi ghi thiếu món đều thấy không cuộn; nhãn "★ còn n" không đè tem giá.
// Khung CHÍNH (mọi testid của khâu): 402×874 (an toàn 62/34), 402×680, 402×760, 390×844 (47/34), 360×780, 412×915.
// Khung NHỎ (nút chính của khâu, cuộn ngắn trong khay được phép): 375×667, 360×600, 375×553 (47/34), 320×568.
// Ở mỗi trạng thái, KHÔNG gọi cuộn nào:
//  · testid cần: có, đang hiện, hộp nằm trọn trong [0, innerWidth] × [đáy HUD, đỉnh thanh tab] (bảng chọn món ở lớp nổi: khung
//    nhìn trừ vùng an toàn; nền bảng được phủ cả vùng an toàn dưới), cắt theo mọi tổ tiên có overflow / clip-path, trừ hàng
//    nút dính đáy cùng vùng cuộn; nút: elementFromPoint ở tâm và 4 điểm gần mép trúng chính nút, cỡ ≥ 44×44;
//  · phần tử của cảnh (bong bóng khách) nằm trên đỉnh khay (không lấn khay);
//  · bong bóng: lời khách không bị cắt câm (chữ dài hơn bong bóng thì vùng chữ cuộn được); khung chính: lời gọi món nằm TRỌN
//    trong bong bóng (scrollHeight ≤ clientHeight + 1, không phải cuộn trong bong bóng); khung nhỏ còn dài thì có dấu ⌄;
//  · chữ đang thấy của màn Ca bán + lớp nổi ≥ 13px; không tràn ngang;
//  · khung chính: hình đĩa món của thực đơn ≥ 48px.
// Mỗi luồng gom MỌI chỗ chưa đạt rồi mới báo đỏ một lần. VUA_MAN_KHUNG=402x874,360x600 để chạy vài khung; SHOT_DIR=<thư mục>
// để chụp ảnh từng trạng thái.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, seedSave, resolveIncidentIfShown, COOK_SHIFT_AT, COOK_OPEN_MS } from './helpers.mjs'
import { playedSave } from '../helpers/m4-saves.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { defaultState, newRecipeProgress } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { startShift, advance } from '../../src/core/shift.js'
import { normalizeLines, expectedServiceSec, speechFor } from '../../src/core/customer.js'
import { addLine, readback } from '../../src/core/order.js'

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
// Ca đông: thực đơn 8 món (4 thường + 4 hiếm, mỗi nguyên liệu hiếm còn 4 phần), đơn 3 dòng có ghi chú.
const MENU8 = ['banh_mi_op_la', 'tra_tac', 'banh_trang_tron', 'ca_phe_sua_da', 'tra_tac_mat_ong', 'banh_mi_trung_ga_ta', 'banh_trang_tron_tay_ninh', 'ca_phe_muoi']
const REQUEST3 = [
  { recipeId: 'banh_mi_op_la', qty: 2, notes: ['them_trung', 'cay'] },
  { recipeId: 'banh_trang_tron_tay_ninh', qty: 1, notes: ['them_trung_cut'] },
  { recipeId: 'tra_tac', qty: 1, notes: ['it_duong'] }
]
// Phiếu ghi sai để khách bắt lỗi: đủ 3 dòng nhưng dòng 2 sai ghi chú (tách đôi bánh mì) và ghi thiếu trà tắc.
const WRONG3 = [
  { recipeId: 'banh_mi_op_la', qty: 1, notes: ['them_trung', 'cay'] },
  { recipeId: 'banh_mi_op_la', qty: 1, notes: ['them_trung'] },
  { recipeId: 'banh_trang_tron_tay_ninh', qty: 1, notes: ['them_trung_cut'] }
]
// Chọn hạt sh.rng để lần "Đọc lại đơn" phiếu `draft` khách bắt ĐỦ mọi lỗi (chạy thử trên bản sao, như trialCounter của
// helpers.mjs): ca đo luôn có cả nhãn lỗi trên dòng lẫn lỗi ghi thiếu món.
function catchAll(state, draft) {
  const base = Number(state.shift.rng) >>> 0
  for (let k = 0; k < 3000; k++) {
    const st = JSON.parse(JSON.stringify(state))
    st.shift.rng = (base + k * 2654435761) >>> 0
    const ctx = makeMetaCtx({ at: COOK_SHIFT_AT })
    ctx.setState(st)
    const cid = st.shift.plan[0].customerId
    for (let i = 0; i < 4000 && !(st.shift.counter && st.shift.counter.customerId === cid); i++) advance(st, 0.25, ctx)
    for (const l of draft) addLine(st, l)
    const r = readback(st, ctx)
    if (r.caught.length >= 2 && !r.missed.length && r.caught.some(e => e.type === 'thieu_mon') && r.caught.some(e => Number.isInteger(e.index))) {
      state.shift.rng = st.shift.rng
      return state
    }
  }
  throw new Error('không tìm được hạt để khách bắt đủ lỗi')
}
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
  return catchAll(state, WRONG3)
}
// Đơn chuẩn 2 dòng (như e2e T) của khách lạ tên dài (khách mang nguyên liệu hiếm, src/data/rare.js).
const REQUEST2 = [{ recipeId: 'banh_mi_op_la', qty: 2, notes: ['them_trung', 'cay'] }, { recipeId: 'banh_trang_tron', qty: 1, notes: ['them_trung_cut'] }]
function strangerSave() {
  const { state } = playedSave(3, 4, { name: 'Xe Khách Lạ', freq: 'it' })
  for (const l of REQUEST2) if (!state.recipes[l.recipeId]) state.recipes[l.recipeId] = newRecipeProgress(0)
  const ctx = makeMetaCtx({ at: COOK_SHIFT_AT, attach: true })
  ctx.setState(state)
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  const sh = startShift(state, ctx)
  sh.incident = null
  sh.incidentQueue = []
  for (const p of sh.plan.slice(1)) p.arriveAt += 240
  const cust = sh.customers[sh.plan[0].customerId]
  Object.assign(cust, { stranger: 'ngu_dan_phan_thiet', name: 'Anh ngư dân Phan Thiết', gender: 'nam', persona: 'cong_nhan', region: 'nam', self: 'anh' })
  cust.request = normalizeLines(REQUEST2)
  cust.expectedSec = expectedServiceSec(cust.request, ctx)
  cust.speech = speechFor(cust, sh, ctx)
  cust.tutorial = false
  cust.patienceSec = 3600
  return state
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
  return state
}
const SAVES = { busy: busySave(), day1: day1Save(), stranger: strangerSave() }

// ---------- Đo trong trang (tự chứa) ----------
function auditOrder(spec) {
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
  const isVScroll = el => { const cs = getComputedStyle(el); return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1 }
  const vScrollerOf = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) if (isVScroll(a)) return a; return null }
  const band = el => {
    if (el.matches('[data-testid="order-sheet"]')) return { top: safeTop, bottom: innerHeight }
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
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible' && (!cs.clipPath || cs.clipPath === 'none')) continue
      const ar = a.getBoundingClientRect()
      if (cs.clipPath && cs.clipPath !== 'none' && cs.overflowX === 'visible' && cs.overflowY === 'visible') continue   // clip-path rộng hơn hộp (khung khách)
      t = Math.max(t, ar.top + a.clientTop); b = Math.min(b, ar.top + a.clientTop + a.clientHeight)
      l = Math.max(l, ar.left + a.clientLeft); rr = Math.min(rr, ar.left + a.clientLeft + a.clientWidth)
    }
    const sc = vScrollerOf(el)
    if (sc) {
      for (const s of sc.querySelectorAll('*')) {
        const cs = getComputedStyle(s)
        if (cs.position !== 'sticky' || s.contains(el) || el.contains(s) || !shown(s) || vScrollerOf(s) !== sc) continue
        const pos = el.compareDocumentPosition(s)
        const sr = s.getBoundingClientRect()
        if (cs.bottom !== 'auto' && (pos & Node.DOCUMENT_POSITION_FOLLOWING)) b = Math.min(b, sr.top)
        else if (cs.top !== 'auto' && (pos & Node.DOCUMENT_POSITION_PRECEDING)) t = Math.max(t, sr.bottom)
      }
    }
    return { r, t, b, l, rr }
  }
  const tappable = el => el.matches('button, [role="button"], a[href], input, select, summary')
  const hit = (el, x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e) || !!e.closest('.toast-stack')) }
  for (const raw of spec.req || []) {
    const any = raw.startsWith('any:')
    const sel = any ? raw.slice(4) : raw
    let els = []
    try { els = [...document.querySelectorAll(toCss(sel))].filter(e => !e.closest('.vfx-layer') && shown(e)) } catch { els = [] }
    if (!els.length) { out.miss.push(`${sel}: không có / không hiện`); continue }
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
  // phần tử của cảnh nằm trên đỉnh khay
  const tray = document.querySelector('[data-testid="counter-panel"] > .co-tray')
  const trayTop = tray ? tray.getBoundingClientRect().top : null
  out.info.trayTop = trayTop === null ? null : rd(trayTop)
  for (const sel of spec.scene || []) {
    const el = document.querySelector(toCss(sel))
    if (!el || !shown(el) || trayTop === null) continue
    const r = el.getBoundingClientRect()
    if (r.bottom > trayTop + 0.5) out.miss.push(`${sel} (cảnh) lấn khay ${rd(r.bottom - trayTop)}px`)
  }
  // lời khách không bị cắt câm: chữ dài hơn bong bóng thì vùng chữ phải cuộn được
  const say = document.querySelector('[data-testid="speech-bubble"] .co-bubble-say')
  if (spec.bubble && say && shown(say)) {
    const cs = getComputedStyle(say)
    const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none'
    if (!clamp && say.scrollHeight > say.clientHeight + 1 && !/(auto|scroll)/.test(cs.overflowY)) out.miss.push(`lời khách bị cắt (${say.scrollHeight} > ${say.clientHeight}) mà không cuộn được`)
    const b = say.closest('[data-testid="speech-bubble"]').getBoundingClientRect()
    if (b.top < hudBottom - 0.5) out.miss.push(`bong bóng khách lấn HUD ${rd(hudBottom - b.top)}px`)
  }
  // khung chính: lời gọi món trọn trong bong bóng (không phải cuộn trong bong bóng); khung nhỏ: còn dài thì có dấu ⌄
  if (spec.bubble && say && shown(say)) {
    const cs = getComputedStyle(say)
    const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none'
    const hidden = say.scrollHeight - say.clientHeight
    if (!clamp && hidden > 1) {
      const bub = say.closest('[data-testid="speech-bubble"]')
      if (spec.bubbleFit) out.miss.push(`lời khách khuất ${hidden}px trong bong bóng ("${say.textContent.trim().slice(-24)}")`)
      else if (!bub.classList.contains('is-more')) out.miss.push(`lời khách khuất ${hidden}px mà bong bóng không có dấu ⌄`)
    }
    out.info.say = [say.clientHeight, say.scrollHeight]
  }
  // nhãn "★ còn n" của món hiếm không đè tem giá
  for (const c of document.querySelectorAll('.co-menu-card')) {
    const l = c.querySelector('.co-menu-left')
    const p = c.querySelector('.co-price')
    if (!l || !p || !shown(l) || !shown(p)) continue
    const a = l.getBoundingClientRect()
    const b = p.getBoundingClientRect()
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
    const hh = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    if (w > 1 && hh > 1) { out.miss.push(`${nameOf(c)}: nhãn "${l.textContent.trim()}" đè tem giá ${rd(w)}×${rd(hh)}px`); break }
  }
  // nhãn tên khách: chữ nằm trọn trong viên nhãn, trong bề ngang màn, không lấn bong bóng
  const tag = document.querySelector('.co-scene .co-cust-name')
  if (spec.name && tag && shown(tag)) {
    const r = tag.getBoundingClientRect()
    const rg = document.createRange()
    rg.selectNodeContents(tag)
    const t = rg.getBoundingClientRect()
    const bub = document.querySelector('.co-scene .co-bubble')
    const br = bub && shown(bub) ? bub.getBoundingClientRect() : null
    const bad = []
    if (t.left < r.left - 1 || t.right > r.right + 1) bad.push(`chữ tràn khỏi viên nhãn [${rd(t.left)}–${rd(t.right)} / ${rd(r.left)}–${rd(r.right)}]`)
    if (Math.min(t.left, r.left) < -0.5 || Math.max(t.right, r.right) > innerWidth + 0.5) bad.push('tràn mép màn')
    if (br && Math.max(t.right, r.right) > br.left + 1 && r.bottom > br.top && r.top < br.bottom) bad.push(`lấn bong bóng ${rd(Math.max(t.right, r.right) - br.left)}px`)
    if (tag.scrollWidth > tag.clientWidth + 1) bad.push(`scrollWidth ${tag.scrollWidth} > ${tag.clientWidth}`)
    for (const x of bad) out.miss.push(`nhãn tên "${tag.textContent.trim()}": ${x}`)
    out.info.name = [rd(r.left), rd(r.right), rd(r.height)]
  }
  // nhãn lỗi ngay trên dòng sai (khách bắt lỗi ở một dòng)
  if (spec.lineErr && ![...document.querySelectorAll('.co-scene .co-line-err')].some(shown)) out.miss.push('không thấy nhãn lỗi trên dòng sai')
  // hình đĩa món của thực đơn (khung chính)
  if (spec.plate) {
    for (const p of document.querySelectorAll('.co-menu-plate')) {
      if (!shown(p)) continue
      const r = p.getBoundingClientRect()
      if (Math.min(r.width, r.height) < spec.plate - 0.5) { out.miss.push(`hình món ${rd(r.width)}×${rd(r.height)} < ${spec.plate}px`); break }
    }
  }
  // chữ ≥ 13px (màn Ca bán + bảng chọn món), không chữ lỗi
  const roots = [svc, document.querySelector('.overlay-root [data-testid="order-sheet"]')].filter(Boolean)
  for (const root of roots) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    while (w.nextNode()) {
      const tn = w.currentNode
      const el = tn.parentElement
      if (!tn.textContent.trim() || !el || el.closest('svg') || !shown(el)) continue
      const cs = getComputedStyle(el)
      if (cs.clipPath && cs.clipPath.includes('inset(50%')) continue   // chữ chỉ cho máy đọc
      const fs = num(cs.fontSize)
      if (fs > 0 && fs < 13) { out.miss.push(`chữ ${fs}px ở ${nameOf(el)}: "${tn.textContent.trim().slice(0, 24)}"`); break }
      if (/undefined|NaN|\[object|\{\w+\}/.test(tn.textContent)) out.miss.push(`chữ lỗi ở ${nameOf(el)}`)
    }
  }
  const over = Math.max(document.documentElement.scrollWidth - innerWidth, ...[...document.querySelectorAll('.panels > .panel, [data-testid="counter-panel"] > .co-tray')].filter(shown).map(p => p.scrollWidth - p.clientWidth))
  if (over > 0) out.miss.push(`tràn ngang ${over}px`)
  out.info.fit = svc ? svc.dataset.fit : ''
  const hOf = q => { const e = document.querySelector(q); return e && shown(e) ? rd(e.getBoundingClientRect().height) : 0 }
  out.info.h = { tray: hOf('[data-testid="counter-panel"] > .co-tray'), menu: hOf('.co-scene .co-menu'), tutor: hOf('[data-testid="tutor-hint"]'), pad: hOf('.co-scene .co-pad'), lines: hOf('[data-testid="draft"]'), head: hOf('.co-scene .co-pad-head'), card: hOf('[data-testid^="menu-item-"]') }
  out.info.scene = svc ? svc.dataset.scene || '' : ''
  return out
}

// ---------- Thao tác ----------
async function waitOrder(page) {
  await page.waitForSelector(T('speech-bubble'), { timeout: 40000 })
  await page.waitForSelector(`${T('progress-4')}[data-stage="order"]`, { timeout: 10000 })
  await page.waitForSelector('[data-testid^="menu-item-"]', { timeout: 10000 })
}
async function openSheet(page, line) {
  await page.click(T('menu-item-' + line.recipeId))
  await page.waitForSelector(T('order-sheet'))
}
async function fillSheet(page, line) {
  for (const n of line.notes || []) await page.click(T('note-chip-' + n))
  for (let q = 1; q < (line.qty || 1); q++) await page.click(T('qty-plus'))
  await page.click(T('add-line'))
  await page.waitForSelector(T('order-sheet'), { state: 'detached' })
}

const SCENE = ['queue', 'progress-4', 'ticket-rail']
const NEED = {
  order8: { main: [...SCENE, 'speech-bubble', 'menu-item-*', 'readback', 'confirm-order'], small: [...SCENE, 'speech-bubble', 'confirm-order', 'any:menu-item-*'], scene: ['speech-bubble'], bubble: true, plate: 48 },
  sheet: { main: ['order-sheet', 'qty-plus', 'qty-minus', 'qty-value', 'note-chip-*', 'add-line', 'sheet-close'], small: ['add-line', 'sheet-close'] },
  caught: { main: [...SCENE, 'speech-bubble', 'caught-list', 'order-line-0', 'order-line-1', 'order-line-2', 'order-line-remove-0', 'readback', 'confirm-order'], small: ['readback', 'confirm-order'], scene: ['speech-bubble'], bubble: true, lineErr: true },
  plain: { main: [...SCENE, 'speech-bubble', 'menu-item-*', 'readback', 'confirm-order'], small: [...SCENE, 'speech-bubble', 'confirm-order', 'any:menu-item-*'], scene: ['speech-bubble'], bubble: true, plate: 48 },
  plainLines: { main: [...SCENE, 'speech-bubble', 'order-line-0', 'order-line-1', 'order-line-remove-0', 'readback', 'confirm-order'], small: ['readback', 'confirm-order'], scene: ['speech-bubble'], bubble: true },
  lines3: { main: [...SCENE, 'speech-bubble', 'menu-item-*', 'order-line-0', 'order-line-1', 'order-line-2', 'order-line-remove-0', 'readback', 'confirm-order'], small: ['readback', 'confirm-order'], scene: ['speech-bubble'], bubble: true, plate: 48 },
  day1: { main: [...SCENE, 'speech-bubble', 'tutor-hint', 'menu-item-*', 'readback', 'confirm-order'], small: ['speech-bubble', 'confirm-order', 'any:menu-item-*'], scene: ['speech-bubble'], bubble: true, plate: 48 },
  day1Lines: { main: [...SCENE, 'speech-bubble', 'tutor-hint', 'order-line-0', 'order-line-remove-0', 'readback', 'confirm-order'], small: ['readback', 'confirm-order'], scene: ['speech-bubble'], bubble: true }
}

async function check(g, f, key, label, fails) {
  await g.page.waitForTimeout(500)
  const N = NEED[key]
  const spec = { req: f.main ? N.main : N.small, scene: f.main ? N.scene : [], bubble: !!N.bubble, bubbleFit: !!(N.bubble && f.main), plate: f.main ? N.plate : 0, name: true, lineErr: !!(N.lineErr && f.main) }
  const m = await g.page.evaluate(auditOrder, spec)
  if (process.env.VUA_MAN_LOG) console.log(label, JSON.stringify(m.info))
  if (!m.info.scene) fails.push(`${label}: panel Quầy chưa theo bố cục cảnh (thiếu data-scene)`)
  for (const x of m.miss) fails.push(`${label}: ${x}`)
  await g.shot(key)
}

describe('Vừa màn · khâu Order (ca đông 8 món / 3 dòng, khách lạ, ngày 1)', { concurrency: 3 }, () => {
  for (const k of FRAME_KEYS) {
    const f = FRAMES[k]
    it(`${k}${f.main ? '' : ' (khung nhỏ)'}: ca đông — phiếu trống, bảng chọn món, khách bắt lỗi, phiếu 3 dòng`, { timeout: 150000 }, async () => {
      const g = await openGame({ clock: { time: COOK_OPEN_MS }, viewport: { width: f.w, height: f.h }, initCss: frameCss(f), name: 'vua-man-order-' + k })
      const fails = []
      try {
        const { page } = g
        await seedSave(page, SAVES.busy)
        await page.goto(g.url('/'))
        await resolveIncidentIfShown(g, { waitMs: 300 })
        await waitOrder(page)
        assert.equal(await page.locator('[data-testid^="menu-item-"]').count(), 8, 'thực đơn 8 món')
        await check(g, f, 'order8', `${k} phiếu trống 8 món`, fails)
        await openSheet(page, REQUEST3[0])
        await check(g, f, 'sheet', `${k} bảng chọn món`, fails)
        await fillSheet(page, WRONG3[0])
        for (const line of WRONG3.slice(1)) { await openSheet(page, line); await fillSheet(page, line) }
        // đọc lại phiếu 3 dòng ghi sai: khách bắt lỗi ở dòng 2 (sai ghi chú) và ghi thiếu trà tắc
        await page.click(T('readback'))
        await page.waitForSelector(T('caught-list'), { timeout: 10000 })
        await page.waitForTimeout(900)
        const caughtText = await page.textContent(T('caught-list'))
        assert.match(caughtText, /Dòng 2/, 'khách bắt lỗi dòng 2')
        assert.match(caughtText, /thiếu món/, 'khách bắt lỗi ghi thiếu món')
        await check(g, f, 'caught', `${k} khách bắt lỗi (3 dòng + thiếu món)`, fails)
        // sửa: bỏ dòng 2, dòng 1 lên 2 phần, ghi thêm trà tắc
        await page.click(T('order-line-remove-1'))
        await page.waitForSelector(T('order-line-2'), { state: 'detached' })
        await page.click(T('order-line-0'))
        await page.waitForSelector(T('order-sheet'))
        await page.click(T('qty-plus'))
        await page.click(T('add-line'))
        await page.waitForSelector(T('order-sheet'), { state: 'detached' })
        await openSheet(page, REQUEST3[2])
        await fillSheet(page, REQUEST3[2])
        await page.click(T('readback'))
        await page.waitForSelector(`${T('confirm-order')}:not([disabled])`, { timeout: 10000 })
        await page.waitForTimeout(700)
        await check(g, f, 'lines3', `${k} phiếu 3 dòng đã đọc lại`, fails)
        assert.deepEqual(g.errors, [], 'lỗi trang')
      } finally {
        await g.close()
      }
      assert.deepEqual(fails, [], `${k}: ${fails.length} chỗ chưa vừa màn`)
    })
    it(`${k}${f.main ? '' : ' (khung nhỏ)'}: đơn chuẩn 2 dòng của khách lạ tên dài — lời gọi món trọn bong bóng, nhãn tên gọn`, { timeout: 150000 }, async () => {
      const g = await openGame({ clock: { time: COOK_OPEN_MS }, viewport: { width: f.w, height: f.h }, initCss: frameCss(f), name: 'vua-man-order-khachla-' + k })
      const fails = []
      try {
        const { page } = g
        await seedSave(page, SAVES.stranger)
        await page.goto(g.url('/'))
        await resolveIncidentIfShown(g, { waitMs: 300 })
        await waitOrder(page)
        await check(g, f, 'plain', `${k} đơn chuẩn lúc vào khâu`, fails)
        for (const line of REQUEST2) { await openSheet(page, line); await fillSheet(page, line) }
        await page.click(T('readback'))
        await page.waitForSelector(`${T('confirm-order')}:not([disabled])`, { timeout: 10000 })
        await page.waitForTimeout(700)
        await check(g, f, 'plainLines', `${k} đơn chuẩn sau Đọc lại`, fails)
        assert.deepEqual(g.errors, [], 'lỗi trang')
      } finally {
        await g.close()
      }
      assert.deepEqual(fails, [], `${k}: ${fails.length} chỗ chưa vừa màn`)
    })
    it(`${k}${f.main ? '' : ' (khung nhỏ)'}: ngày 1 — lời Dì Sáu là hàng của khay, phiếu trống và phiếu đã ghi`, { timeout: 150000 }, async () => {
      const g = await openGame({ clock: { time: COOK_OPEN_MS }, viewport: { width: f.w, height: f.h }, initCss: frameCss(f), name: 'vua-man-order-ngay1-' + k })
      const fails = []
      try {
        const { page } = g
        await seedSave(page, SAVES.day1)
        await page.goto(g.url('/'))
        await resolveIncidentIfShown(g, { waitMs: 300 })
        await waitOrder(page)
        await page.waitForSelector(T('tutor-hint'), { timeout: 10000 })
        await check(g, f, 'day1', `${k} ngày 1 phiếu trống`, fails)
        // lời Dì Sáu nằm trong khay Order, không trong cảnh / cột nút
        const where = await page.evaluate(() => {
          const t = document.querySelector('[data-testid="tutor-hint"]')
          return { inOrder: !!t.closest('.co-order'), inActions: !!t.closest('.co-pad-actions'), inScene: !!t.closest('.co-cust-area') }
        })
        assert.deepEqual(where, { inOrder: true, inActions: false, inScene: false }, 'lời Dì Sáu là một hàng của khay Order')
        const request = JSON.parse(await page.getAttribute(T('speech-bubble'), 'data-request'))
        for (const line of request) { await openSheet(page, line); await fillSheet(page, line) }
        await check(g, f, 'day1Lines', `${k} ngày 1 phiếu đã ghi`, fails)
        assert.deepEqual(g.errors, [], 'lỗi trang')
      } finally {
        await g.close()
      }
      assert.deepEqual(fails, [], `${k}: ${fails.length} chỗ chưa vừa màn`)
    })
  }
})
