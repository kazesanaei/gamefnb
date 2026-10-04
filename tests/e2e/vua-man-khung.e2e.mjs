// E2E "Vừa màn" — gói L0, KHUNG CHUNG của màn Ca bán (đặc tả "Vừa màn" mục 2–4, 6, 9 "Chung tab Quầy").
// 10 khung (6 khung chính + 4 khung nhỏ; vùng an toàn giả bằng --safe-top / --safe-bottom, khung iOS thêm clip-path: inset(0)
// như iOS cắt vùng cuộn) × 4 trạng thái:
//   1. Quầy · Order, hàng đủ 3 khách (khách ở quầy + 2), đầu ca có 3 thông báo "Sổ ghi nợ" cùng lúc;
//   2. Quầy trống, dây 3 phiếu (nút "Qua Bếp");
//   3. Bếp · dây phiếu (sang tab Bếp từ trạng thái 2);
//   4. Bếp · Thớt sơ chế (phiên nấu đang dở).
// Kiểm ở mỗi trạng thái:
//   - bậc data-fit, biến --usable-h / --avail-h / --scene-h / --tray-h / --kitchen-h đúng bảng mục 3.1 / 3.2 (±1px);
//     HUD = 47 + an toàn trên, thanh tab = 49 + max(4, an toàn dưới); data-tab đúng tab đang mở;
//   - tab Quầy: cảnh (.street) tuyệt đối ngay dưới HUD, cao --scene-h khi panel Quầy theo bố cục cảnh (data-scene) hoặc mái
//     bạt + hàng trên + dải xe đẩy 36px (bố cục 0.5.1); biển 4 khâu và kẹp phiếu nằm trọn trong cảnh; mục "Chung tab Quầy"
//     của bảng 9 (hud, hud-wallet, help-button, queue, progress-4, ticket-rail, tab-counter, tab-kitchen) THẤY KHÔNG CUỘN:
//     đang hiện, hộp nằm trọn trong [0, innerWidth] × [đáy HUD (phần tử HUD: mép dưới vùng an toàn trên), đỉnh thanh tab
//     (thanh tab: mép trên vùng an toàn dưới)], nút ≥ 44px và elementFromPoint ở tâm + 4 điểm gần mép trúng chính nút;
//     hàng khách: tối đa 2 khách sau khách ở quầy (1 ở bề ngang < 360, 0 ở bậc s / xs), dư thì viên "+n" (queue-more);
//   - tab Bếp: dải mặt khách 58 (ẩn khi tập trung khi nấu), dây phiếu đầy đủ 56, thanh 4 khâu cao 0, .panels ngay dưới;
//     .is-focus đúng chiều cao dùng được U (U < 760 khi đang nấu);
//   - chồng thông báo: lúc có từ 2 thông báo trở lên, đáy chồng không xuống quá mốc (tab Quầy: min(đáy hàng trên của cảnh
//     + 6, đỉnh biển 4 khâu); tab Bếp: đỉnh .panels);
//   - không tràn ngang; không lỗi console / trang.
// Biến môi trường: VUA_MAN_KHUNG=402x874,360x600 (chỉ chạy các khung này), SHOT_DIR=<thư mục> (chụp ảnh từng trạng thái).
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, seedSave, counterShiftSave, cookShiftSave, resolveIncidentIfShown, COOK_OPEN_MS } from './helpers.mjs'

// Khung: rộng × cao, vùng an toàn trên / dưới, iOS (cắt vùng cuộn), bảng mục 3.1 (bậc, U, A, cảnh S) — khay T = A − S.
const FRAMES = [
  { name: '402x874', w: 402, h: 874, top: 62, bottom: 34, ios: true, main: true, fit: 'l', U: 778, A: 682, S: 256 },
  { name: '402x680', w: 402, h: 680, top: 0, bottom: 0, ios: true, main: true, fit: 'm', U: 680, A: 580, S: 194 },
  { name: '402x760', w: 402, h: 760, top: 0, bottom: 0, ios: true, main: true, fit: 'l', U: 760, A: 660, S: 248 },
  { name: '390x844', w: 390, h: 844, top: 47, bottom: 34, ios: true, main: true, fit: 'l', U: 763, A: 667, S: 250 },
  { name: '360x780', w: 360, h: 780, top: 0, bottom: 0, ios: false, main: true, fit: 'l', U: 780, A: 680, S: 255 },
  { name: '412x915', w: 412, h: 915, top: 0, bottom: 0, ios: false, main: true, fit: 'l', U: 915, A: 815, S: 296 },
  { name: '375x667', w: 375, h: 667, top: 0, bottom: 0, ios: true, main: false, fit: 'm', U: 667, A: 567, S: 190 },
  { name: '360x600', w: 360, h: 600, top: 0, bottom: 0, ios: false, main: false, fit: 's', U: 600, A: 500, S: 163 },
  { name: '375x553', w: 375, h: 553, top: 47, bottom: 34, ios: true, main: false, fit: 'xs', U: 472, A: 376, S: 116 },
  { name: '320x568', w: 320, h: 568, top: 0, bottom: 0, ios: true, main: false, fit: 's', U: 568, A: 468, S: 152 }
]
const ONLY = (process.env.VUA_MAN_KHUNG || '').split(',').map(s => s.trim()).filter(Boolean)
const RUN = ONLY.length ? FRAMES.filter(f => ONLY.includes(f.name)) : FRAMES
const FOCUS_MAX_H = 760
const SCENE_ROW = { l: 60, m: 58, s: 56, xs: 54 }
const STRIP = 58
const RAIL = 56
const queueShow = (fit, w) => (fit === 's' || fit === 'xs' ? 0 : w < 360 ? 1 : 2)

const cssOf = f => `:root { --safe-top: ${f.top}px !important; --safe-bottom: ${f.bottom}px !important; }` +
  (f.ios ? '\n.screen, .panel, .k-main { clip-path: inset(0); }' : '')

// Số đo khung trong trang (một lần gọi).
function frameProbe() {
  const s = document.querySelector('[data-testid="screen-service"]')
  const cs = getComputedStyle(s)
  const px = k => parseFloat(cs.getPropertyValue(k)) || 0
  const R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } }
  const shown = e => !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0
  return {
    fit: s.dataset.fit, tab: s.dataset.tab, scene: s.dataset.scene || '', focus: s.classList.contains('is-focus'),
    usable: px('--usable-h'), avail: px('--avail-h'), sceneH: px('--scene-h'), tray: px('--tray-h'), kitchen: px('--kitchen-h'),
    hud: R(s.querySelector(':scope > .hud')), tabbar: R(s.querySelector(':scope > .tabbar')),
    street: R(s.querySelector(':scope > .street')), streetShown: shown(s.querySelector(':scope > .street')),
    p4: R(s.querySelector('[data-testid="progress-4"]')), rail: R(s.querySelector('[data-testid="ticket-rail"]')),
    panels: R(s.querySelector(':scope > .panels')), panelCounter: R(s.querySelector('.panel-counter')),
    qVisible: [...s.querySelectorAll('.street .q-cust')].filter(shown).length,
    qMore: (() => { const e = s.querySelector('[data-testid="queue-more"]'); return shown(e) ? e.textContent : '' })(),
    sw: document.documentElement.scrollWidth, vw: innerWidth, vh: innerHeight
  }
}

// Mục "Chung tab Quầy" của bảng 9: thấy không cuộn (đang hiện, hộp trọn trong vùng thấy, nút chạm trúng ≥ 44px).
function commonProbe([ids, safeTop, safeBottom]) {
  const s = document.querySelector('[data-testid="screen-service"]')
  const hud = s.querySelector(':scope > .hud').getBoundingClientRect()
  const tab = s.querySelector(':scope > .tabbar').getBoundingClientRect()
  const bad = []
  for (const id of ids) {
    const e = document.querySelector(`[data-testid="${id}"]`)
    if (!e) { bad.push(`${id}: không có trong DOM`); continue }
    const st = getComputedStyle(e)
    if (st.display === 'none' || st.visibility === 'hidden' || !e.getClientRects().length) { bad.push(`${id}: bị ẩn`); continue }
    for (let n = e; n && n !== document.body; n = n.parentElement) if (Number(getComputedStyle(n).opacity) === 0) { bad.push(`${id}: trong suốt`); break }
    const r = e.getBoundingClientRect()
    const inHud = !!e.closest('.hud'), inTab = !!e.closest('.tabbar')
    // phần tử HUD: từ mép dưới vùng an toàn trên (riêng 'hud' trùm cả vùng an toàn như 0.5.1: xét hàng viên bên trong)
    const top = inHud ? safeTop : hud.bottom - 0.5
    const bottom = inTab ? innerHeight - safeBottom : tab.top + 0.5
    const box = id === 'hud' ? s.querySelector('.hud .hud-cell').getBoundingClientRect() : r
    if (box.top < top - 0.5 || r.bottom > bottom + 0.5 || r.left < -0.5 || r.right > innerWidth + 0.5) {
      bad.push(`${id}: [${[r.left, r.top, r.right, r.bottom].map(Math.round)}] ra ngoài vùng thấy [0,${Math.round(top)},${innerWidth},${Math.round(bottom)}]`)
      continue
    }
    if (e.tagName === 'BUTTON') {
      if (r.width < 43.5 || r.height < 43.5) bad.push(`${id}: nút ${Math.round(r.width)}×${Math.round(r.height)} < 44`)
      const hits = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t)) }
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      const d = Math.min(6, r.height / 4), dx = Math.min(r.height / 2, r.width / 4)
      const pts = [[cx, cy], [r.left + dx, cy], [r.right - dx, cy], [cx, r.top + d], [cx, r.bottom - d]]
      const miss = pts.filter(([x, y]) => !hits(x, y))
      if (miss.length) {
        const t = document.elementFromPoint(miss[0][0], miss[0][1])
        bad.push(`${id}: chạm không trúng (${miss.length}/5 điểm) → ${t ? ((t.closest('[data-testid]') || t).getAttribute('data-testid') || t.className) : 'null'}`)
      }
    }
  }
  return bad
}

const near = (a, b, tol = 1.01) => Math.abs(a - b) <= tol
const COMMON = ['hud', 'hud-wallet', 'help-button', 'queue', 'progress-4', 'ticket-rail', 'tab-counter', 'tab-kitchen']

// Theo dõi chồng thông báo trong trang: lúc có ≥ 2 thông báo đang hiện, đáy chồng không xuống quá mốc.
async function watchToasts(page) {
  await page.evaluate(([row]) => {
    const W = window.__vmToast = { seen: 0, over: [], debt: 0 }
    const tick = () => {
      const st = document.querySelector('.toast-stack')
      const s = document.querySelector('[data-testid="screen-service"]')
      if (st && s) {
        const live = [...st.children].filter(n => !n.classList.contains('hide') && n.classList.contains('show'))
        W.seen = Math.max(W.seen, live.length)
        W.debt = Math.max(W.debt, st.querySelectorAll('[data-testid="debt-toast"]').length)
        if (live.length >= 2) {
          let edge
          if (s.dataset.tab === 'counter') {
            const street = s.querySelector(':scope > .street').getBoundingClientRect()
            const p4 = s.querySelector('[data-testid="progress-4"]').getBoundingClientRect()
            edge = Math.min(street.top + (row[s.dataset.fit] || 60) + 6, p4.top)
          } else edge = s.querySelector(':scope > .panels').getBoundingClientRect().top
          const b = st.getBoundingClientRect().bottom
          if (b > edge + 1) W.over.push(`${live.length} thông báo, đáy ${Math.round(b)} > mốc ${Math.round(edge)}`)
        }
      }
      W.timer = setTimeout(tick, 60)
    }
    tick()
  }, [SCENE_ROW])
}

function checkFrame(f, m, label, { tab }) {
  const errs = []
  const T_ = f.A - f.S
  if (m.fit !== f.fit) errs.push(`data-fit ${m.fit} ≠ ${f.fit}`)
  if (m.tab !== tab) errs.push(`data-tab ${m.tab} ≠ ${tab}`)
  if (!near(m.usable, f.U)) errs.push(`--usable-h ${m.usable} ≠ ${f.U}`)
  if (!near(m.avail, f.A)) errs.push(`--avail-h ${m.avail} ≠ ${f.A}`)
  if (!near(m.sceneH, f.S)) errs.push(`--scene-h ${m.sceneH} ≠ ${f.S}`)
  if (!near(m.tray, T_)) errs.push(`--tray-h ${m.tray} ≠ ${T_}`)
  if (!near(m.hud.h, 47 + f.top)) errs.push(`HUD cao ${m.hud.h} ≠ ${47 + f.top}`)
  if (!near(m.tabbar.h, 49 + Math.max(4, f.bottom))) errs.push(`thanh tab cao ${m.tabbar.h} ≠ ${49 + Math.max(4, f.bottom)}`)
  if (!near(m.tabbar.b, m.vh)) errs.push(`thanh tab không sát đáy (${m.tabbar.b} / ${m.vh})`)
  if (!near(m.tabbar.t - m.hud.b, f.A)) errs.push(`chỗ giữa HUD và thanh tab ${m.tabbar.t - m.hud.b} ≠ A ${f.A}`)
  if (m.sw > m.vw) errs.push(`tràn ngang ${m.sw - m.vw}px`)
  if (tab === 'counter') {
    const sh = m.scene ? f.S : SCENE_ROW[f.fit] + 36
    if (!m.streetShown || !near(m.street.t, m.hud.b) || !near(m.street.h, sh)) errs.push(`cảnh [${Math.round(m.street.t)}, cao ${m.street.h}] ≠ [${m.hud.b}, cao ${sh}]`)
    if (!near(m.panels.t, m.hud.b) || !near(m.panels.h, f.A)) errs.push(`.panels [${m.panels.t}, cao ${m.panels.h}] không phủ A`)
    const pTop = m.scene ? m.hud.b : m.hud.b + sh
    if (!near(m.panelCounter.t, pTop)) errs.push(`panel Quầy bắt đầu ở ${m.panelCounter.t} ≠ ${pTop}`)
    for (const [k, b] of [['progress-4', m.p4], ['ticket-rail', m.rail]]) {
      if (b.t < m.street.t - 0.5 || b.b > m.street.b + 0.5) errs.push(`${k} [${Math.round(b.t)}–${Math.round(b.b)}] ra ngoài cảnh [${Math.round(m.street.t)}–${Math.round(m.street.b)}]`)
    }
    if (b4(m.p4) && m.p4.h < 29) errs.push(`biển 4 khâu cao ${m.p4.h}`)
  } else {
    if (!near(m.p4.h, 0)) errs.push(`thanh 4 khâu cao ${m.p4.h} ở tab Bếp`)
    if (!near(m.rail.h, RAIL)) errs.push(`dây phiếu cao ${m.rail.h} ≠ ${RAIL}`)
    const stripOn = !m.focus
    if (stripOn) {
      if (!m.streetShown || !near(m.street.h, STRIP) || !near(m.street.t, m.hud.b)) errs.push(`dải mặt khách [${m.street && m.street.t}, cao ${m.street && m.street.h}] ≠ [${m.hud.b}, ${STRIP}]`)
    } else if (m.streetShown) errs.push('tập trung khi nấu mà dải mặt khách còn hiện')
    const top = m.hud.b + (stripOn ? STRIP : 0) + RAIL
    if (!near(m.rail.t, m.hud.b + (stripOn ? STRIP : 0))) errs.push(`dây phiếu ở ${m.rail.t} ≠ ${m.hud.b + (stripOn ? STRIP : 0)}`)
    if (!near(m.panels.t, top)) errs.push(`.panels ở ${m.panels.t} ≠ ${top}`)
    if (!near(m.kitchen, m.panels.h)) errs.push(`--kitchen-h ${m.kitchen} ≠ .panels cao ${m.panels.h}`)
  }
  return errs.map(e => `${f.name} ${label}: ${e}`)
}
const b4 = b => !!b && b.w > 0

// Mỗi trạng thái một trình duyệt riêng (đồng hồ giả từ giờ mở ca của bản lưu dựng sẵn); gom lỗi console / trang.
async function withGame(f, label, errs, fn) {
  const g = await openGame({ clock: { time: COOK_OPEN_MS }, name: `vua-man-khung-${f.name}-${label}`, viewport: { width: f.w, height: f.h }, initCss: cssOf(f) })
  try {
    await fn(g)
    for (const e of g.errors) errs.push(`${f.name} ${label}: ${e}`)
  } finally {
    await g.close()
  }
}

for (const f of RUN) {
  test(`khung ${f.name} (${f.main ? 'chính' : 'nhỏ'}, an toàn ${f.top}/${f.bottom}): bậc ${f.fit}, cảnh ${f.S}, khay ${f.A - f.S}; Quầy, quầy trống, Bếp dây phiếu, Thớt`, { timeout: 180000 }, async () => {
    const errs = []
    // ---------- 1. Quầy · Order, hàng đủ 3 khách, 3 thông báo đầu ca ----------
    await withGame(f, 'quay', errs, async g => {
      const page = g.page
      {
        const sv = counterShiftSave({ pay: 'cash', name: 'Xe Khung Chung' })
        const sh = sv.state.shift
        const first = sh.plan.find(p => p.customerId === sv.customerId)
        const others = sh.plan.filter(p => p.customerId !== sv.customerId).sort((a, b) => a.arriveAt - b.arriveAt).slice(0, 2)
        others.forEach((p, i) => { p.arriveAt = first.arriveAt + 0.6 + i * 0.6; sh.customers[p.customerId].patienceSec = 3600 })
        sh.debtNotes = [1, 2, 3].map(i => ({ kind: 'tra', name: 'Khách ' + i, amount: 10000 * i, text: `Khách ${i} trả ${10 * i}.000đ.` }))
        await seedSave(page, sv.state)
        await page.goto(g.url('/'))
        await page.waitForSelector(T('screen-service'))
        await watchToasts(page)
        await resolveIncidentIfShown(g, { waitMs: 300 })
        await page.waitForSelector(T('speech-bubble'), { timeout: 30000 })
        await page.waitForFunction(() => document.querySelectorAll('.street .q-cust').length >= 3, null, { timeout: 30000 })
        await page.waitForTimeout(500)
        await g.shot('quay-order')
        const m = await page.evaluate(frameProbe)
        errs.push(...checkFrame(f, m, 'Quầy · Order', { tab: 'counter' }))
        for (const e of await page.evaluate(commonProbe, [COMMON, f.top, f.bottom])) errs.push(`${f.name} Quầy · Order: ${e}`)
        const show = 1 + queueShow(f.fit, f.w)
        if (m.qVisible !== Math.min(3, show)) errs.push(`${f.name} Quầy · Order: ${m.qVisible} thẻ khách thấy ≠ ${Math.min(3, show)}`)
        const wantMore = 3 - Math.min(3, show)
        if (m.qMore !== (wantMore > 0 ? '+' + wantMore : '')) errs.push(`${f.name} Quầy · Order: viên "+n" = "${m.qMore}" ≠ "${wantMore > 0 ? '+' + wantMore : ''}"`)
        // đợi các thông báo đầu ca hiện / xếp hàng hết rồi xem kết quả theo dõi chồng thông báo
        await page.waitForTimeout(3500)
        const W = await page.evaluate(() => window.__vmToast)
        if (!W.debt) errs.push(`${f.name} Quầy · Order: không thấy thông báo "Sổ ghi nợ" đầu ca`)
        for (const o of W.over) errs.push(`${f.name} Quầy · Order: chồng thông báo xuống quá mốc (${o})`)
      }
    })
    // ---------- 2. Quầy trống (dây 3 phiếu) → 3. Bếp · dây phiếu ----------
    await withGame(f, 'quay-trong', errs, async g => {
      const page = g.page
      {
        const { state } = cookShiftSave({ recipeId: 'tra_tac' }, null, { tickets: 3, name: 'Xe Khung Chung' })
        const sh = state.shift
        for (const p of sh.plan) if (sh.customers[p.customerId].status === 'den') p.arriveAt = sh.t + 5000
        await seedSave(page, state)
        await page.goto(g.url('/'))
        await page.waitForSelector(T('screen-service'))
        await page.waitForSelector(T('counter-idle'), { timeout: 30000 })
        await page.waitForSelector(T('go-kitchen'))
        await page.waitForTimeout(400)
        await g.shot('quay-trong')
        const m = await page.evaluate(frameProbe)
        errs.push(...checkFrame(f, m, 'Quầy trống', { tab: 'counter' }))
        for (const e of await page.evaluate(commonProbe, [COMMON, f.top, f.bottom])) errs.push(`${f.name} Quầy trống: ${e}`)
        await page.tap(T('tab-kitchen'))
        await page.waitForSelector('[data-testid^="ticket-"]:not([data-testid^="ticket-rail"])', { timeout: 15000 })
        await page.waitForTimeout(400)
        await g.shot('bep-day-phieu')
        const k = await page.evaluate(frameProbe)
        errs.push(...checkFrame(f, k, 'Bếp · dây phiếu', { tab: 'kitchen' }))
        if (k.focus) errs.push(`${f.name} Bếp · dây phiếu: tập trung khi chưa nấu`)
        for (const e of await page.evaluate(commonProbe, [['hud', 'help-button', 'ticket-rail', 'tab-counter', 'tab-kitchen'], f.top, f.bottom])) errs.push(`${f.name} Bếp · dây phiếu: ${e}`)
      }
    })
    // ---------- 4. Bếp · Thớt sơ chế ----------
    await withGame(f, 'thot', errs, async g => {
      const page = g.page
      {
        const { state } = cookShiftSave({ recipeId: 'banh_trang_tron' }, 'got_xoai', { tickets: 1, cooks: 5, name: 'Xe Khung Chung' })
        await seedSave(page, state)
        await page.goto(g.url('/'))
        await page.waitForSelector(T('screen-service'))
        await page.tap(T('tab-kitchen'))
        await page.waitForSelector(T('board'), { timeout: 20000 })
        await page.waitForTimeout(400)
        await g.shot('thot')
        const k = await page.evaluate(frameProbe)
        const wantFocus = f.U < FOCUS_MAX_H
        if (k.focus !== wantFocus) errs.push(`${f.name} Thớt: .is-focus ${k.focus} ≠ ${wantFocus} (U ${f.U})`)
        errs.push(...checkFrame(f, k, 'Thớt', { tab: 'kitchen' }))
        for (const e of await page.evaluate(commonProbe, [['hud', 'help-button', 'ticket-rail', 'tab-counter', 'tab-kitchen'], f.top, f.bottom])) errs.push(`${f.name} Thớt: ${e}`)
        // quay lại Quầy: hết tập trung, cảnh Quầy trở lại
        await page.tap(T('tab-counter'))
        await page.waitForTimeout(300)
        const q = await page.evaluate(frameProbe)
        if (q.focus) errs.push(`${f.name} Thớt → Quầy: còn .is-focus`)
        if (q.tab !== 'counter' || !q.streetShown) errs.push(`${f.name} Thớt → Quầy: cảnh Quầy không hiện`)
      }
    })
    assert.deepEqual(errs, [], `${f.name}: khung chung chưa đạt`)
  })
}
