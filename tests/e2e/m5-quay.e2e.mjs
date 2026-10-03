// E2E M5 Đợt 2 (bản 0.5.1) — Quầy mới trên giao diện thật, ca thật (HUD gỗ, dải phố, thanh 4 khâu, dây phiếu, thanh tab).
// Save dựng bằng lõi (counterShiftSave của helpers.mjs: 4 ca người chơi hoàn hảo, mở ca ngày 5, khách đầu sắp tới quầy và
// sẽ trả đúng cách định trước: tiền mặt có tiền thối / chuyển khoản thật / ảnh chuyển khoản giả, không có tình huống chen
// vào); trang mở bằng đồng hồ giả của Playwright đặt đúng giờ ca (không có dải "Giờ giả", bố cục như máy thật). Nhóm e2e: G2.
//  (a) 3 luồng × 4 khung {390×844, 360×600, 320×568, 375×553 có vùng an toàn 47/34 (mô phỏng iPhone, vùng cuộn bị cắt như
//      iOS)}: tiền mặt (Order → bảng chọn món → đọc lại → chốt → Báo tổng → thối tiền → phiếu thu → kẹp phiếu), chuyển
//      khoản (… → chờ tiền về → Đã nhận đủ → phiếu thu → kẹp phiếu), ảnh giả (… → Từ chối ảnh giả, khách bỏ đi, quầy trống).
//      Ở mỗi khâu: mọi nút đang hiện của panel Quầy (hoặc bảng chọn món) ≥ 44px; cuộn vào phần nhìn thấy phía trên hàng nút
//      dính đáy thì elementFromPoint ở tâm và 4 điểm sát mép trúng chính nút; chữ đang hiện của màn ca bán ≥ 13px, không chữ
//      lỗi (undefined/NaN/{biến}); không tràn ngang; hàng nút dính đáy nằm trên thanh tab.
//  (b) Chốt order: bản sao phiếu có con dấu "ĐÃ CHỐT" trong .vfx-layer, phiếu bay (.vfx-fly); 2 giây sau .vfx-layer không còn
//      nút nào (kể cả sau kẹp phiếu, sau khi từ chối ảnh giả). Lớp hiệu ứng không nhận chạm, ≤ 30 nút.
//  (c) Vẽ lại theo stateSig không phát lại hoạt ảnh: khâu Tính tiền — lấy / trả / lấy / trả tờ tiền (4 lần đổi state, panel vẽ
//      lại cả khâu) → không có animationstart nào trong panel Quầy; khâu chuyển khoản — đổi tab Bếp ↔ Quầy 3 lần (panel vẽ lại
//      khi hiện lại) → không có animationstart, không có hoạt ảnh mới (WAAPI) nào trong panel (điện thoại không giơ lại,
//      vệt quét không chạy lại).
//  (d) Ví HUD: thối đúng / nhận chuyển khoản → xu bay về ví, mỗi xu phát 'vfx-coin' trên [hud-wallet], xu cuối có tổng đúng
//      bằng hóa đơn; thẻ "thu trong ca" [hud-take] đếm lên qua các số trung gian (không giảm) và dừng đúng số cuối
//      (shiftTake của bản lưu); số ví [hud-wallet] và data-amount đúng state.wallet.
//  (e) Phiếu chấm (5 sao, có tip): sao bật lần lượt (hoạt ảnh ss-star trễ tăng dần 180 ms, animationstart theo đúng thứ tự),
//      phiếu đứng yên trong 2 giây (sheetSettled: có .show, không hoạt ảnh trên chính phiếu, rõ hẳn), hết hoạt ảnh con, không
//      hoạt ảnh vô hạn; xu tip bay về ví (source 'tip'), thẻ thu trong ca dừng đúng số; chữ phiếu ≥ 13px.
//  (f) Giảm chuyển động (reducedMotion: 'reduce'), 375×553 vùng an toàn: không có hoạt ảnh vô hạn nào đang chạy ở mọi khâu,
//      lớp hiệu ứng không có hạt (canvas data-n) và không có phiếu bay; con dấu vẫn hiện; xu giao gộp một lần (skipped) và
//      thẻ thu trong ca đúng số; phiếu chấm hiện thẳng (is-static), không hoạt ảnh.
// Không có lỗi console ở mọi kịch bản.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  T, openGame, seedSave, readSave, waitSave, counterShiftSave, COOK_OPEN_MS, giveChangeUi, resolveIncidentIfShown
} from './helpers.mjs'
import { tipShiftSave, TIP_AT, vn } from '../helpers/m4-saves.mjs'
import { shiftTake } from '../../src/ui/components/hud.js'
import { formatMoneyShort } from '../../src/ui/format.js'
import { SHEET_FX } from '../../src/ui/components/score-sheet.js'

// Mô phỏng iPhone có tai thỏ và thanh Home (vùng an toàn 47/34), iOS cắt phần tử nằm ngoài vùng cuộn.
const SAFE_CSS = `:root { --safe-top: 47px !important; --safe-bottom: 34px !important; }
.screen, .panel, .k-main { clip-path: inset(0); }`

const FRAMES = {
  '390x844': { vp: { width: 390, height: 844 } },
  '360x600': { vp: { width: 360, height: 600 } },
  '320x568': { vp: { width: 320, height: 568 } },
  '375x553': { vp: { width: 375, height: 553 }, safe: true }
}
const frameLabel = f => f + (FRAMES[f].safe ? ' vùng an toàn' : '')

// Đơn hai dòng (có số lượng, có ghi chú tính thêm tiền) để phiếu, bảng giá, phiếu thu có đủ phần.
const REQUEST = [{ recipeId: 'banh_mi_op_la', qty: 2, notes: ['them_trung'] }, { recipeId: 'tra_tac', qty: 1, notes: [] }]

function openFrame(frame, name, extra = {}) {
  const f = FRAMES[frame]
  return openGame({ clock: { time: COOK_OPEN_MS }, name, viewport: f.vp, initCss: f.safe ? SAFE_CSS : '', ...extra })
}

// ---------- Đầu dò trong trang ----------

// Gắn trước khi chơi: lớp hiệu ứng (con dấu ĐÃ CHỐT, phiếu bay, hạt canvas, số nút lớn nhất, pointer-events), sự kiện
// 'vfx-coin' trên ví HUD, mọi chữ của thẻ "thu trong ca", animationstart trong panel Quầy (đếm theo cửa sổ đo).
async function installProbes(page) {
  await page.evaluate(() => {
    const P = window.__q = { stamp: '', fly: 0, maxDom: 0, maxN: 0, canvas: 0, pe: [], coins: [], take: [], anim: null }
    const root = document.querySelector('.overlay-root') || document.body
    const scan = () => {
      for (const v of document.querySelectorAll('.vfx-layer')) {
        P.maxDom = Math.max(P.maxDom, v.childElementCount)
        const pe = getComputedStyle(v).pointerEvents
        if (!P.pe.includes(pe)) P.pe.push(pe)
        for (const c of v.querySelectorAll('canvas')) P.maxN = Math.max(P.maxN, Number(c.getAttribute('data-n')) || 0)
      }
    }
    new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1 || !n.closest('.vfx-layer')) continue
          const st = n.matches('.co-stamp') ? n : n.querySelector('.co-stamp')
          if (st) P.stamp = st.textContent.trim()
          if (n.classList.contains('vfx-fly')) P.fly++
          if (n.tagName === 'CANVAS') P.canvas++
        }
      }
      scan()
    }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-n'] })
    const wallet = document.querySelector('[data-testid="hud-wallet"]')
    wallet.addEventListener('vfx-coin', e => {
      const d = e.detail || {}
      P.coins.push({ index: d.index, sum: d.sum, amount: d.amount, last: !!d.last, skipped: !!d.skipped, source: d.source })
    })
    const take = document.querySelector('[data-testid="hud-take"]')
    new MutationObserver(() => { P.take.push(take.textContent) }).observe(take, { childList: true, characterData: true, subtree: true })
    document.addEventListener('animationstart', e => {
      if (!P.anim) return
      const t = e.target
      if (!t || !t.closest || !t.closest('[data-testid="counter-panel"]')) return
      // hoạt ảnh lặp vô hạn (khách thở nhẹ…) tự chạy lại khi panel ẩn rồi hiện (đổi tab): không phải phát lại do vẽ lại
      const cs = getComputedStyle(t, e.pseudoElement || null)
      const names = cs.animationName.split(',').map(x => x.trim())
      const iters = cs.animationIterationCount.split(',').map(x => x.trim())
      if ((iters[names.indexOf(e.animationName)] || iters[0]) === 'infinite') return
      P.anim.push(e.animationName + '@' + String(t.className && t.className.baseVal !== undefined ? t.className.baseVal : t.className).split(' ')[0])
    }, true)
    scan()
  })
}
const probes = page => page.evaluate(() => window.__q)
const resetProbes = page => page.evaluate(() => { const P = window.__q; P.stamp = ''; P.fly = 0; P.coins = []; P.take = [] })

// Đo một khâu: nút (cỡ, chạm trúng sau khi cuộn vào phần nhìn thấy phía trên hàng nút dính đáy), chữ, tràn ngang, hàng nút
// dính đáy so với thanh tab. Bảng chọn món đang mở thì đo nút trong bảng (thân bảng cuộn được).
function auditCounter() {
  const out = { buttons: 0, small: [], miss: [], texts: [], bad: [], overflow: 0, bar: null }
  const panel = document.querySelector('[data-testid="counter-panel"]')
  const sheet = document.querySelector('.overlay-root [data-testid="order-sheet"]')
  const scope = sheet || panel
  const name = el => (el ? ((el.closest('[data-testid]') || el).getAttribute('data-testid') || String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).split(' ')[0] || el.tagName) : null)
  const vis = el => {
    if (!el || !el.isConnected) return false
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return false
    for (let n = el; n && n !== document.body; n = n.parentElement) if (Number(getComputedStyle(n).opacity) === 0) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const scrollerOf = el => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p)
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p
    }
    return null
  }
  const safeBottom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) || 0
  const bars = [...scope.querySelectorAll('.act-bar')].filter(b => vis(b) && getComputedStyle(b).position === 'sticky')
  const restore = []
  // nút: panel Quầy (hoặc bảng chọn món đang mở) + thanh tab, HUD, dây phiếu của màn ca bán
  const btnScopes = sheet ? [sheet] : [panel, ...['.tabbar', '.hud', '[data-testid="ticket-rail"]'].map(q => document.querySelector(q))].filter(Boolean)
  const buttons = btnScopes.flatMap(x => [...x.querySelectorAll('button, a, input, select, [role=button], summary')])
  for (const b of buttons) {
    if (!vis(b)) continue
    out.buttons++
    const r0 = b.getBoundingClientRect()
    const w = Math.max(r0.width, b.offsetWidth || 0), h = Math.max(r0.height, b.offsetHeight || 0)
    if (w < 43.5 || h < 43.5) out.small.push(`${name(b)} ${Math.round(w)}×${Math.round(h)}`)
    // cuộn nút vào phần nhìn thấy của vùng cuộn, phía trên hàng nút dính đáy (nút nằm trong hàng nút thì giữ nguyên)
    const sc = scrollerOf(b)
    const inBar = bars.some(x => x.contains(b))
    const regionOf = () => {
      if (!sc) return { top: 0, bottom: innerHeight - safeBottom }
      const box = sc.getBoundingClientRect()
      const bar = inBar ? null : bars.find(x => sc.contains(x))
      return { top: box.top, bottom: bar ? Math.min(box.bottom, bar.getBoundingClientRect().top) : box.bottom }
    }
    if (sc && !inBar) {
      if (!restore.some(x => x[0] === sc)) restore.push([sc, sc.scrollTop])
      const g0 = regionOf()
      const r = b.getBoundingClientRect()
      if (r.top < g0.top || r.bottom > g0.bottom) sc.scrollTop += (r.top + r.height / 2) - (g0.top + g0.bottom) / 2
    }
    // phần nhìn thấy của nút (nút cao hơn phần nhìn thấy của panel, vd phím "Báo tổng" cao 4 hàng ở khung rất thấp: đo phần
    // lộ ra, phải cao ít nhất 44px)
    const r = b.getBoundingClientRect()
    const g = regionOf()
    const v = { left: r.left, right: r.right, top: Math.max(r.top, g.top, 0), bottom: Math.min(r.bottom, g.bottom, innerHeight - safeBottom) }
    const vh = v.bottom - v.top
    const hits = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === b || b.contains(e)) }
    const cx = v.left + (v.right - v.left) / 2, cy = v.top + vh / 2
    const d = Math.min(6, vh / 4), dx = Math.min(vh / 2, (v.right - v.left) / 4)
    const pts = [[cx, cy], [v.left + dx, cy], [v.right - dx, cy], [cx, v.top + d], [cx, v.bottom - d]]
    const inView = v.left >= -0.5 && v.right <= innerWidth + 0.5 && vh >= Math.min(43.5, r.height - 0.5)
    if (!inView || !pts.every(([x, y]) => hits(x, y))) {
      out.miss.push(`${name(b)} [${[r.left, r.top, r.right, r.bottom].map(Math.round)}] thấy ${Math.round(vh)}px → ${pts.map(([x, y]) => name(document.elementFromPoint(x, y))).join(',')}`)
    }
  }
  for (const [sc, top] of restore) sc.scrollTop = top
  // chữ: cả màn ca bán (HUD, phố, 4 khâu, dây phiếu, panel, tab) và bảng chọn món
  const roots = [document.querySelector('[data-testid="screen-service"]'), sheet].filter(Boolean)
  const seen = new Set()
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const t = walker.currentNode
      const el = t.parentElement
      if (!t.textContent.trim() || !el || el.closest('svg') || seen.has(el)) continue
      seen.add(el)
      if (!vis(el)) continue
      out.texts.push(el)
      const fs = parseFloat(getComputedStyle(el).fontSize)
      if (fs > 0 && fs < 13) out.bad.push(`chữ ${fs}px ở ${name(el)}: "${t.textContent.trim().slice(0, 30)}"`)
      if (/undefined|NaN|\[object|\{\w+\}/.test(t.textContent)) out.bad.push(`chữ lỗi ở ${name(el)}: "${t.textContent.trim().slice(0, 60)}"`)
    }
  }
  out.texts = out.texts.length
  out.overflow = Math.max(document.documentElement.scrollWidth - innerWidth, panel ? panel.scrollWidth - panel.clientWidth : 0)
  const tab = document.querySelector('.tabbar')
  const pbar = panel && [...panel.querySelectorAll('.act-bar')].find(vis)
  if (pbar && tab && !sheet) out.bar = { bottom: pbar.getBoundingClientRect().bottom, tabTop: tab.getBoundingClientRect().top }
  return out
}

async function audit(page, label) {
  const m = await page.evaluate(auditCounter)
  if (process.env.M5_QUAY_LOG) console.log(`${label}: ${m.buttons} nút, ${m.texts} chữ`)
  assert.ok(m.buttons > 0, `${label}: không thấy nút nào`)
  assert.deepEqual(m.small, [], `${label}: nút nhỏ hơn 44px`)
  assert.deepEqual(m.miss, [], `${label}: nút bị che / chạm không trúng`)
  assert.deepEqual(m.bad, [], `${label}: chữ nhỏ hơn 13px hoặc chữ lỗi`)
  assert.ok(m.overflow <= 0, `${label}: tràn ngang ${m.overflow}px`)
  if (m.bar) assert.ok(m.bar.bottom <= m.bar.tabTop + 0.5, `${label}: hàng nút dính đáy lấn thanh tab (${m.bar.bottom} > ${m.bar.tabTop})`)
  return m
}

// Lớp hiệu ứng về 0 nút trong ~2 giây (giờ thật: hoạt ảnh WAAPI / CSS không theo đồng hồ giả của Playwright).
async function vfxEmptyWithin(page, ms, label) {
  const end = Date.now() + ms
  let n = -1
  for (;;) {
    n = await page.evaluate(() => [...document.querySelectorAll('.vfx-layer')].reduce((a, v) => a + v.childElementCount, 0))
    if (n === 0) return
    if (Date.now() > end) break
    await page.waitForTimeout(100)
  }
  const left = await page.evaluate(() => [...document.querySelectorAll('.vfx-layer > *')].map(e => e.className || e.tagName))
  assert.fail(`${label}: .vfx-layer còn ${n} nút sau ${ms} ms: ${JSON.stringify(left)}`)
}

// Hoạt ảnh vô hạn đang chạy (cả trang).
function infiniteAnims() {
  return document.getAnimations()
    .filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity)
    .map(a => (a.animationName || a.id || '?') + '@' + String((a.effect.target && (a.effect.target.className && a.effect.target.className.baseVal !== undefined ? a.effect.target.className.baseVal : a.effect.target.className)) || '').split(' ')[0])
}

// Thẻ "thu trong ca" và ví HUD dừng đúng số cuối (bản lưu), các số đã hiện của thẻ không giảm; counted: đã đếm qua số trung
// gian (không nhảy thẳng).
async function checkWallet(page, label, { counted = true } = {}) {
  const read = () => page.evaluate(() => ({
    take: document.querySelector('[data-testid="hud-take"]').textContent,
    on: document.querySelector('[data-testid="hud-take"]').classList.contains('is-on'),
    wallet: document.querySelector('[data-testid="hud-wallet"]').textContent,
    amount: document.querySelector('[data-testid="hud-wallet"]').dataset.amount
  }))
  const end = Date.now() + 6000
  let now = null, s = null, want = ''
  for (;;) {
    s = await readSave(page)
    want = '+' + formatMoneyShort(shiftTake(s.shift))
    now = await read()
    if (now.take === want && now.amount === String(s.wallet)) break
    if (Date.now() > end) break
    await page.waitForTimeout(150)
  }
  assert.equal(now.take, want, `${label}: thẻ thu trong ca dừng sai số`)
  assert.ok(now.on, `${label}: thẻ thu trong ca không hiện`)
  assert.equal(now.amount, String(s.wallet), `${label}: data-amount của ví khác state.wallet`)
  assert.equal(now.wallet, formatMoneyShort(s.wallet), `${label}: số ví khác state.wallet`)
  const P = await probes(page)
  const vals = P.take.map(t => Number(String(t).replace(/\D/g, '')) || 0)
  for (let i = 1; i < vals.length; i++) assert.ok(vals[i] >= vals[i - 1], `${label}: thẻ thu trong ca giảm (${P.take.join(' → ')})`)
  if (counted) assert.ok(new Set(vals).size >= 3, `${label}: thẻ thu trong ca không đếm lên qua số trung gian (${P.take.join(' → ')})`)
  return P
}

// ---------- Các bước của quầy (chạm như người chơi) ----------

async function waitCounter(g) {
  const { page } = g
  await page.waitForSelector(T('screen-service'))
  await resolveIncidentIfShown(g, { waitMs: 300 })
  await page.waitForSelector(T('speech-bubble'), { timeout: 20000 })
  await page.waitForSelector(T('menu-item-' + REQUEST[0].recipeId))
}

// Ghi phiếu theo yêu cầu thật; onSheet(i) chạy khi bảng chọn món của dòng i vừa mở và đã chọn xong.
async function writeOrder(g, request, onSheet = null) {
  const { page } = g
  for (const [i, line] of request.entries()) {
    await page.tap(T('menu-item-' + line.recipeId))
    await page.waitForSelector(T('order-sheet'))
    for (const n of line.notes || []) await page.tap(T('note-chip-' + n))
    for (let q = 1; q < line.qty; q++) await page.tap(T('qty-plus'))
    assert.equal(await page.textContent(T('qty-value')), String(line.qty))
    if (onSheet) await onSheet(i)
    await page.tap(T('add-line'))
    await page.waitForSelector(T('order-sheet'), { state: 'detached' })
  }
  for (let i = 0; i < request.length; i++) await page.waitForSelector(T('order-line-' + i))
}

async function readbackOk(g) {
  const { page } = g
  assert.equal(await page.isDisabled(T('confirm-order')), true, 'chưa đọc lại mà đã chốt được')
  await page.tap(T('readback'))
  await page.waitForSelector(`${T('confirm-order')}:not([disabled])`)
  assert.equal(!!(await page.$(T('caught-list'))), false, 'phiếu đúng mà khách bắt lỗi')
}

// Chốt order: con dấu ĐÃ CHỐT trên bản sao phiếu ở lớp hiệu ứng, phiếu bay (trừ khi giảm chuyển động), lớp về 0 nút ≤ 2 giây.
async function confirmWithStamp(g, label, { reduced = false } = {}) {
  const { page } = g
  await resetProbes(page)
  await page.tap(T('confirm-order'))
  await page.waitForSelector(`${T('progress-4')}[data-stage="thanh_toan"]`)
  await page.waitForFunction(() => window.__q.stamp !== '', null, { timeout: 2000 })
  if (!reduced) await page.waitForFunction(() => window.__q.fly > 0, null, { timeout: 2500 })
  const P = await probes(page)
  assert.equal(P.stamp, 'ĐÃ CHỐT', `${label}: con dấu chốt order`)
  if (reduced) assert.equal(P.fly, 0, `${label}: giảm chuyển động mà phiếu vẫn bay`)
  await vfxEmptyWithin(page, 2000, `${label} chốt order`)
}

async function reportTotalUi(g, total) {
  const { page } = g
  await page.waitForSelector(T('report-total'))
  for (const d of String(total / 1000)) await page.tap(T('numpad-' + d))
  assert.equal(Number(await page.getAttribute(T('numpad-display'), 'data-amount')), total)
}

// Đếm animationstart trong panel Quầy trong lúc chạy fn (panel vẽ lại).
async function countAnimStarts(page, fn) {
  await page.evaluate(() => { window.__q.anim = [] })
  await fn()
  await page.waitForTimeout(250)
  return page.evaluate(() => { const a = window.__q.anim; window.__q.anim = null; return a })
}

// Hoạt ảnh vừa mới bắt đầu (< 400 ms, không vô hạn) trong panel Quầy: WAAPI / CSS chạy lại do vẽ lại.
function freshPanelAnims() {
  const panel = document.querySelector('[data-testid="counter-panel"]')
  return panel.getAnimations({ subtree: true })
    .filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity && Number(a.currentTime) < 400)
    .map(a => (a.animationName || 'waapi') + '@' + String(a.effect.target && a.effect.target.className).split(' ')[0])
}

// Đổi tab Bếp ↔ Quầy 3 lần (mỗi lần hiện lại panel Quầy vẽ lại cả khâu): không animationstart, không hoạt ảnh mới.
async function tabRoundTrips(page, label) {
  const starts = await countAnimStarts(page, async () => {
    for (let k = 0; k < 3; k++) {
      await page.tap(T('tab-kitchen'))
      await page.waitForSelector(T('panel-kitchen'), { state: 'visible' })
      await page.tap(T('tab-counter'))
      await page.waitForSelector(T('panel-counter'), { state: 'visible' })
      assert.deepEqual(await page.evaluate(freshPanelAnims), [], `${label}: vẽ lại chạy lại hoạt ảnh`)
    }
  })
  assert.deepEqual(starts, [], `${label}: vẽ lại phát lại hoạt ảnh CSS`)
}

// ---------- (a)–(d) Ba luồng × bốn khung ----------

async function cashFlow(g, frame) {
  const { page } = g
  const label = frameLabel(frame) + ' tiền mặt'
  const sv = counterShiftSave({ pay: 'cash', request: REQUEST, name: 'Xe Quầy Tiền Mặt', delayOthers: 240 })
  await seedSave(page, sv.state)
  await page.goto(g.url('/'))
  await waitCounter(g)
  await installProbes(page)
  await page.waitForTimeout(600)
  await audit(page, label + ' · Order')
  await g.shot('order')
  await writeOrder(g, sv.request, async i => {
    if (i) return
    await page.waitForTimeout(450)
    await audit(page, label + ' · bảng chọn món')
    await g.shot('bang-chon-mon')
  })
  await readbackOk(g)
  await page.waitForTimeout(700)
  await audit(page, label + ' · phiếu đã đọc lại')
  await g.shot('doc-lai')
  await confirmWithStamp(g, label)
  await reportTotalUi(g, sv.total)
  await audit(page, label + ' · Thanh toán')
  await g.shot('thanh-toan')
  await page.tap(T('report-total'))
  await page.waitForSelector(T('given-cash'))
  await page.waitForTimeout(900)
  await audit(page, label + ' · Tính tiền')
  await g.shot('tinh-tien')
  // (c) lấy / trả / lấy / trả một tờ 5.000đ: panel vẽ lại cả khâu 4 lần, không hoạt ảnh CSS nào chạy lại
  const bill = 5000
  const starts = await countAnimStarts(page, async () => {
    for (const [k, sel] of [T('drawer-' + bill), T('tray-' + bill), T('drawer-' + bill), T('tray-' + bill)].entries()) {
      await page.tap(sel)
      await page.waitForFunction(([want]) => Number(document.querySelector('[data-testid="tray"]').dataset.amount) === want, [k % 2 ? 0 : bill])
      await page.waitForTimeout(120)
    }
  })
  assert.deepEqual(starts, [], `${label}: vẽ lại khâu Tính tiền phát lại hoạt ảnh`)
  await resetProbes(page)
  await giveChangeUi(g, sv.total)
  await page.waitForSelector(T('receipt'))
  // (d) xu bay về ví: tổng đúng hóa đơn, thẻ thu trong ca đếm lên tới đúng số
  await page.waitForFunction(() => window.__q.coins.some(c => c.last), null, { timeout: 4000 })
  const P = await checkWallet(page, label)
  const last = P.coins.find(c => c.last)
  assert.equal(last.sum, sv.total, `${label}: tổng xu khác hóa đơn`)
  assert.ok(P.coins.every(c => c.source === 'tien_mat'))
  assert.ok(P.coins.length >= 6 && P.coins.length <= 12, `${label}: ${P.coins.length} xu`)
  await page.waitForTimeout(600)
  await audit(page, label + ' · Phiếu thu')
  await g.shot('phieu-thu')
  assert.match(await page.textContent(`${T('receipt')} .receipt-head span`), /^Phiếu thu #\d{3}$/)
  await page.tap(T('clip-ticket'))
  await page.waitForSelector(`${T('progress-4')}[data-stage="lam_do"], ${T('counter-idle')}`)
  await page.waitForSelector('[data-testid^="rail-ticket-"]')
  await vfxEmptyWithin(page, 2000, `${label} kẹp phiếu`)
  const p = await probes(page)
  assert.deepEqual(p.pe, ['none'], `${label}: lớp hiệu ứng nhận chạm`)
  assert.ok(p.maxDom <= 30, `${label}: ${p.maxDom} nút trong lớp hiệu ứng`)
}

async function qrFlow(g, frame) {
  const { page } = g
  const label = frameLabel(frame) + ' chuyển khoản'
  const sv = counterShiftSave({ pay: 'qr', request: REQUEST, name: 'Xe Quầy QR', delayOthers: 240 })
  await seedSave(page, sv.state)
  await page.goto(g.url('/'))
  await waitCounter(g)
  await installProbes(page)
  await writeOrder(g, sv.request)
  await readbackOk(g)
  await confirmWithStamp(g, label)
  await reportTotalUi(g, sv.total)
  await page.tap(T('report-total'))
  await page.waitForSelector(`${T('qr-status')}[data-arrived="false"]`)
  await page.waitForTimeout(600)
  await audit(page, label + ' · chờ tiền về')
  await g.shot('qr-cho')
  await page.waitForSelector(`${T('qr-status')}[data-arrived="true"]`, { timeout: 8000 })
  await page.waitForTimeout(1200)
  await audit(page, label + ' · tiền đã về')
  await g.shot('qr-ve')
  // (c) tiền đã về (vệt quét đã chạy xong): đổi tab Bếp ↔ Quầy 3 lần, panel vẽ lại khi hiện lại — điện thoại không giơ lại,
  // vệt quét không chạy lại
  await tabRoundTrips(page, label)
  await resetProbes(page)
  await page.tap(T('qr-confirm'))
  await page.waitForSelector(T('receipt'))
  await page.waitForFunction(() => window.__q.coins.some(c => c.last), null, { timeout: 4000 })
  const P = await checkWallet(page, label)
  assert.equal(P.coins.find(c => c.last).sum, sv.total)
  assert.ok(P.coins.every(c => c.source === 'qr'))
  await page.waitForTimeout(600)
  await audit(page, label + ' · Phiếu thu')
  await g.shot('qr-phieu-thu')
  await page.tap(T('clip-ticket'))
  await page.waitForSelector('[data-testid^="rail-ticket-"]')
  await vfxEmptyWithin(page, 2000, `${label} kẹp phiếu`)
  const s = await readSave(page)
  assert.equal(s.shift.ledger.qr, sv.total)
}

async function fakeQrFlow(g, frame, { accept = false } = {}) {
  const { page } = g
  const label = frameLabel(frame) + (accept ? ' nhận nhầm ảnh giả' : ' ảnh giả')
  const sv = counterShiftSave({ pay: 'qr_fake', request: REQUEST, name: 'Xe Quầy Ảnh Giả', delayOthers: 240 })
  await seedSave(page, sv.state)
  await page.goto(g.url('/'))
  await waitCounter(g)
  await installProbes(page)
  await writeOrder(g, sv.request)
  await readbackOk(g)
  await confirmWithStamp(g, label)
  await reportTotalUi(g, sv.total)
  await page.tap(T('report-total'))
  await page.waitForSelector(`${T('qr-status')}[data-arrived="false"]`)
  await page.waitForTimeout(900)
  // (c) khách đang giơ ảnh (điện thoại đã giơ lên): đổi tab 3 lần, điện thoại không giơ lại
  await tabRoundTrips(page, label)
  // ảnh giả: tiền không bao giờ về
  await page.waitForTimeout(3000)
  assert.equal(await page.getAttribute(T('qr-status'), 'data-arrived'), 'false', `${label}: ảnh giả mà tiền về`)
  await audit(page, label + ' · khách giơ ảnh')
  if (accept) {
    await page.tap(T('qr-confirm'))
    await page.waitForSelector(T('receipt'))
    await page.waitForTimeout(900)
    assert.equal(await page.getAttribute('.qc-qr', 'data-qr'), 'lost')
    assert.match(await page.textContent(`${T('receipt')} .rc-stamp`), /ẢNH GIẢ/)
    await audit(page, label + ' · Phiếu thu (mất tiền)')
    await g.shot('anh-gia-nhan-nham')
    const s = await readSave(page)
    assert.equal(s.shift.ledger.fakeQrLoss, sv.total)
    await page.tap(T('clip-ticket'))
    await page.waitForSelector('[data-testid^="rail-ticket-"]')
  } else {
    await page.tap(T('qr-reject'))
    await page.waitForSelector(T('counter-idle'))
    await page.waitForFunction(() => !!document.querySelector('.vfx-layer .qc-fx-stamp'), null, { timeout: 1500 })
    assert.equal(await page.textContent('.vfx-layer .qc-fx-stamp'), 'ẢNH GIẢ')
    await g.shot('anh-gia-tu-choi')
    const s = await waitSave(page, x => x.shift && x.shift.customers[sv.customerId].status === 'bo_ve')
    assert.equal(s.shift.customers[sv.customerId].fakeQrCaught, true)
    await page.waitForTimeout(900)
    await audit(page, label + ' · quầy trống')
  }
  await vfxEmptyWithin(page, 2600, `${label} sau ảnh giả`)
}

for (const frame of Object.keys(FRAMES)) {
  test(`(a–d) ${frameLabel(frame)}: tiền mặt, chuyển khoản, ảnh giả — nút ≥ 44px chạm trúng, chữ ≥ 13px, con dấu + phiếu bay, lớp hiệu ứng sạch, vẽ lại không phát lại hoạt ảnh, ví HUD đếm đúng số`, { timeout: 240000 }, async () => {
    const flows = [['tien-mat', g => cashFlow(g, frame)], ['qr', g => qrFlow(g, frame)], ['anh-gia', g => fakeQrFlow(g, frame)]]
    if (frame === '360x600') flows.push(['anh-gia-nhan', g => fakeQrFlow(g, frame, { accept: true })])
    for (const [name, run] of flows) {
      const g = await openFrame(frame, `m5-quay-${name}`)
      try {
        await run(g)
        assert.deepEqual(g.errors, [], `${frameLabel(frame)} ${name}: có lỗi console/trang`)
      } finally {
        await g.close()
      }
    }
  })
}

// ---------- (e) Phiếu chấm ----------

// Đầu dò phiếu chấm: lúc gắn, các animationstart của sao (thứ tự, giờ trang), hoạt ảnh của các sao lúc gắn (trễ).
async function installSheetProbe(page) {
  await page.addInitScript(() => {
    const S = window.__ss = { starts: [], delays: null, mounted: null }
    document.addEventListener('animationstart', e => {
      const t = e.target
      if (!t || !t.closest || !t.closest('[data-testid="score-sheet"]') || e.animationName !== 'ss-star') return
      const cell = t.closest('.ss-star')
      S.starts.push({ i: Number(cell && cell.style.getPropertyValue('--i')), at: performance.now() })
    }, true)
    new MutationObserver(() => {
      if (S.mounted !== null) return
      const sh = document.querySelector('[data-testid="score-sheet"]')
      if (!sh) return
      S.mounted = performance.now()
    }).observe(document, { childList: true, subtree: true })
  })
}

// sheetSettled của service.js, đo trong trang.
function sheetState() {
  const node = document.querySelector('.sheet-host [data-testid="score-sheet"]')
  if (!node) return null
  const own = node.getAnimations().filter(a => a.playState === 'running' || a.playState === 'pending').length
  const sub = node.getAnimations({ subtree: true }).filter(a => a.playState === 'running' || a.playState === 'pending')
  return {
    show: node.classList.contains('show'), isStatic: node.classList.contains('is-static'), own, opacity: Number(getComputedStyle(node).opacity),
    sub: sub.length, infinite: sub.filter(a => a.effect && a.effect.getTiming().iterations === Infinity).length,
    stars: Number(node.dataset.stars), on: node.querySelectorAll('.ss-star.is-on').length,
    delays: [...node.querySelectorAll('.ss-star.is-on .ss-star-fg')].map(e => {
      const a = e.getAnimations().find(x => x.animationName === 'ss-star')
      return a ? Number(a.effect.getTiming().delay) : null
    }),
    tip: (node.querySelector('[data-testid="score-sheet-tip"]') || {}).dataset ? Number(node.querySelector('[data-testid="score-sheet-tip"]').dataset.tip) : 0
  }
}

async function serveForSheet(g, reduced) {
  const { page } = g
  // seed 1 (như m4-tip-events): 2 phiếu đã nấu xong (Tuyệt hảo) chờ giao, phiếu hóa đơn từ 20.000đ → 5 sao có tip
  const { state, tickets } = tipShiftSave(1)
  const high = tickets.find(t => t.bill >= 20000)
  assert.ok(high, 'ca dựng sẵn có phiếu từ 20.000đ')
  await seedSave(page, state)
  await installSheetProbe(page)
  await page.goto(g.url('/'))
  await page.waitForSelector(T('screen-service'))
  await resolveIncidentIfShown(g, { waitMs: 600 })
  await installProbes(page)
  await page.tap(T('tab-kitchen'))
  const sel = `${T('serve-ticket')}[data-ticket-id="${high.ticketId}"]`
  await page.waitForSelector(sel)
  await page.tap(sel)
  await page.waitForSelector(T('score-sheet'))
  // ngay lúc gắn: các sao chưa đạt đủ / đang chờ trễ (không giảm chuyển động)
  const first = await page.evaluate(sheetState)
  return { first, ticket: high }
}

test('(e) phiếu chấm 390×844: sao bật lần lượt rồi đứng yên (sheetSettled), không hoạt ảnh vô hạn, xu tip về ví, chữ ≥ 13px', { timeout: 120000 }, async () => {
  const g = await openGame({ clock: { time: vn(TIP_AT) + 2 * 60 * 1000 }, name: 'm5-quay-phieu-cham', viewport: { width: 390, height: 844 } })
  const { page, errors } = g
  try {
    const { first } = await serveForSheet(g, false)
    assert.equal(first.isStatic, false, 'phiếu chấm mới mà hiện thẳng (không diễn)')
    assert.equal(first.stars, 5, 'món Tuyệt hảo, giao ngay: 5 sao')
    assert.equal(first.on, 5)
    assert.equal(first.tip, 5000, 'hóa đơn từ 20.000đ, 5 sao: có tip')
    // trễ của từng sao: starStart + k × starGap
    assert.deepEqual(first.delays, [0, 1, 2, 3, 4].map(k => SHEET_FX.starStart + k * SHEET_FX.starGap), 'sao không bật lần lượt')
    // trong SHEET_MS (2 giây): phiếu đứng yên, hết hoạt ảnh con
    let st = null
    const end = Date.now() + 1900
    for (;;) {
      st = await page.evaluate(sheetState)
      if (st && st.show && st.own === 0 && st.opacity >= 0.9 && st.sub === 0) break
      if (Date.now() > end) break
      await page.waitForTimeout(80)
    }
    assert.ok(st && st.show && st.own === 0 && st.opacity >= 0.9, `phiếu chấm chưa đứng yên trong 2 giây ${JSON.stringify(st)}`)
    assert.equal(st.sub, 0, 'phiếu chấm còn hoạt ảnh con sau khi diễn xong')
    assert.equal(st.infinite, 0)
    await g.shot('phieu-cham')
    const S = await page.evaluate(() => window.__ss)
    assert.deepEqual(S.starts.map(x => x.i), [0, 1, 2, 3, 4], `sao bật không theo thứ tự ${JSON.stringify(S.starts)}`)
    for (let k = 1; k < S.starts.length; k++) assert.ok(S.starts[k].at >= S.starts[k - 1].at, 'sao bật lùi thứ tự')
    // chữ phiếu ≥ 13px
    const small = await page.evaluate(() => {
      const out = []
      const node = document.querySelector('[data-testid="score-sheet"]')
      const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
      while (w.nextNode()) {
        const el = w.currentNode.parentElement
        if (!w.currentNode.textContent.trim() || !el || el.closest('svg')) continue
        const fs = parseFloat(getComputedStyle(el).fontSize)
        if (fs > 0 && fs < 13) out.push(`${fs}px "${w.currentNode.textContent.trim().slice(0, 30)}"`)
      }
      return out
    })
    assert.deepEqual(small, [], 'chữ phiếu chấm nhỏ hơn 13px')
    // xu tip: bay về ví, thẻ thu trong ca đếm lên đúng số
    await page.waitForFunction(() => window.__q.coins.some(c => c.last && c.source === 'tip'), null, { timeout: 4000 })
    const P = await checkWallet(page, 'phiếu chấm', { counted: false })
    assert.equal(P.coins.find(c => c.last).sum, first.tip)
    assert.ok(P.coins.length >= 4 && P.coins.length <= 6, `${P.coins.length} xu tip`)
    await vfxEmptyWithin(page, 2500, 'phiếu chấm')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

// ---------- (f) Giảm chuyển động ----------

test('(f) giảm chuyển động 375×553 vùng an toàn: không hoạt ảnh vô hạn, không hạt, không phiếu bay, con dấu vẫn hiện, xu giao một lần, phiếu chấm hiện thẳng', { timeout: 180000 }, async () => {
  const reduced = { contextOptions: { reducedMotion: 'reduce' } }
  let g = await openFrame('375x553', 'm5-quay-giam', reduced)
  try {
    const { page, errors } = g
    const label = 'giảm chuyển động'
    const sv = counterShiftSave({ pay: 'cash', request: REQUEST, name: 'Xe Quầy Êm', delayOthers: 240 })
    await seedSave(page, sv.state)
    await page.goto(g.url('/'))
    await waitCounter(g)
    await installProbes(page)
    await page.waitForTimeout(400)
    assert.deepEqual(await page.evaluate(infiniteAnims), [], `${label}: hoạt ảnh vô hạn ở khâu Order`)
    await writeOrder(g, sv.request, async () => {
      assert.deepEqual(await page.evaluate(infiniteAnims), [], `${label}: hoạt ảnh vô hạn ở bảng chọn món`)
    })
    await readbackOk(g)
    await confirmWithStamp(g, label, { reduced: true })
    await reportTotalUi(g, sv.total)
    assert.deepEqual(await page.evaluate(infiniteAnims), [], `${label}: hoạt ảnh vô hạn ở khâu Thanh toán`)
    await page.tap(T('report-total'))
    await page.waitForSelector(T('given-cash'))
    assert.deepEqual(await page.evaluate(infiniteAnims), [], `${label}: hoạt ảnh vô hạn ở khâu Tính tiền`)
    await resetProbes(page)
    await giveChangeUi(g, sv.total)
    await page.waitForSelector(T('receipt'))
    await page.waitForFunction(() => window.__q.coins.some(c => c.last), null, { timeout: 3000 })
    const P = await checkWallet(page, label, { counted: false })
    assert.equal(P.coins.length, 1, `${label}: xu phải giao gộp một lần`)
    assert.ok(P.coins[0].skipped && P.coins[0].last && P.coins[0].sum === sv.total, JSON.stringify(P.coins))
    assert.deepEqual(await page.evaluate(infiniteAnims), [], `${label}: hoạt ảnh vô hạn ở phiếu thu`)
    await page.tap(T('clip-ticket'))
    await page.waitForSelector('[data-testid^="rail-ticket-"]')
    await vfxEmptyWithin(page, 1500, `${label} kẹp phiếu`)
    const p = await probes(page)
    assert.equal(p.maxN, 0, `${label}: lớp hiệu ứng có ${p.maxN} hạt`)
    assert.equal(p.canvas, 0, `${label}: lớp hiệu ứng có canvas hạt`)
    assert.equal(p.fly, 0, `${label}: có phiếu / tờ tiền bay`)
    assert.deepEqual(errors, [], `${label}: có lỗi console/trang`)
  } finally {
    await g.close()
  }
  // phiếu chấm khi giảm chuyển động: hiện thẳng (is-static), không hoạt ảnh nào trong phiếu
  g = await openGame({ clock: { time: vn(TIP_AT) + 2 * 60 * 1000 }, name: 'm5-quay-phieu-cham-giam', viewport: { width: 375, height: 553 }, initCss: SAFE_CSS, ...reduced })
  try {
    const { page, errors } = g
    const { first } = await serveForSheet(g, true)
    assert.equal(first.isStatic, true, 'giảm chuyển động mà phiếu chấm vẫn diễn')
    await page.waitForTimeout(400)
    const st = await page.evaluate(sheetState)
    assert.ok(st.show && st.own === 0 && st.sub === 0 && st.opacity >= 0.9, `phiếu chấm chưa đứng yên ${JSON.stringify(st)}`)
    assert.deepEqual(await page.evaluate(() => window.__ss.starts), [], 'giảm chuyển động mà sao vẫn bật')
    assert.deepEqual(await page.evaluate(infiniteAnims), [], 'hoạt ảnh vô hạn khi phiếu chấm hiện')
    const p = await probes(page)
    assert.equal(p.maxN, 0, 'phiếu chấm: có hạt khi giảm chuyển động')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
