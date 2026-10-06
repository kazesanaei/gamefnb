// E2E M5 Đợt 3 (bản 0.5.3) — các màn ngoài ca kiểu game trên giao diện thật. Nhóm e2e: G1 (chạy riêng:
// node --test tests/e2e/m5-meta.e2e.mjs, dưới 6 phút). Save dựng bằng lõi (người chơi hoàn hảo 6 ca, seed 6: ngày 7 "Trời
// mưa", 14/11 12:00 có sự kiện Tri ân 20/11 và phiên Xe ba gác trưa); trang mở bằng đồng hồ giả của Playwright (không có
// dải "Giờ giả", bố cục như máy thật). Không bật tour (navigator.webdriver).
//  (a) Sảnh Chuẩn bị ở 402×874 (vùng an toàn 62/34, iPhone 16 Pro cài app), 402×680 (Safari), 390×844 và 360×600: không cuộn
//      vẫn thấy biển ngày, đủ 7 lối vào và biển "Mở hàng" (nằm trọn trong khung, tâm chạm trúng chính phần tử).
//  (b) 390×844 và 360×600: bảng điểm danh tự bật → nhận ô hôm nay (đúng ô kế tiếp, data-claimed), bảng đóng thì xu / muỗng
//      bay về ví ở sảnh, ví đúng bản lưu, lớp hiệu ứng (.vfx-layer) về 0 nút sau 2 giây; mỗi lối vào mở đúng màn (Chợ Công
//      Thức, Việc hôm nay, Hộp thư, Sổ công thức, Sổ tay nghề, Cài đặt; Điểm danh là bảng nổi) và có nút quay lại; mọi nút
//      đang hiện ≥ 44px, nút nằm trọn trong khung (ngoài thanh dính) thì tâm chạm trúng; không tràn ngang; chữ ≥ 13px (sảnh
//      Chuẩn bị ≥ 14px).
//  (c) Việc hôm nay: nhận quà việc đã xong → Tiền quán / danh tiếng tăng đúng phần thưởng của lõi, viên ví đếm lên rồi dừng
//      đúng số (data-amount = bản lưu), xu bay (rewardBurst) rồi lớp hiệu ứng tự dọn về 0 sau 2 giây; vẽ lại (đổi việc khác)
//      không phát lại hoạt ảnh (không thêm xu / hạt / chữ bay, tờ việc đã nhận không đóng dấu lại).
//  (d) Chợ Công Thức: mua món → món có trong thực đơn (.is-owned), Tiền quán trừ đúng giá, hiệu ứng tự dọn; đổi kệ qua lại
//      (vẽ lại) không phát lại hoạt ảnh; quay về sảnh không phát lại xu bay.
//  (e) Tổng kết: số "Lãi trong ca" đếm lên qua các số trung gian (không giảm) và dừng đúng lãi (data-amount), viên Tiền quán
//      dừng đúng ví của bản lưu, sổ lãi lỗ đếm xong không còn số dở (data-shown), chữ thật trong ô luôn là số cuối.
//  (g) Khung chính của người dùng (iPhone 16 Pro: 402×874 cài app, vùng an toàn 62/34; Safari 402×680): sảnh thấy ngay hộp
//      quà chờ nhận; Chợ Công Thức, Việc hôm nay, Hộp thư, Sổ công thức, Sổ tay nghề, Gánh hàng, Sự kiện 20/11, Tổng kết — nút
//      quay lại, phần thưởng đang chờ nhận và nút chính của màn thấy ngay (không cuộn), tâm chạm trúng.
//  (f) Giảm chuyển động (reducedMotion: 'reduce'), 390×844: sảnh, điểm danh, Việc hôm nay (nhận quà), Chợ Công Thức, Hộp thư,
//      Sổ tay nghề, Tổng kết — không có hoạt ảnh vô hạn nào đang chạy, nhận quà không có xu / phiếu bay, Tổng kết hiện thẳng
//      (is-static, số cuối ngay).
// Không có lỗi console ở mọi kịch bản.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, seedSave, readSave, waitSave, resolveIncidentIfShown, pollEval } from './helpers.mjs'
import { playedSave, vn } from '../helpers/m4-saves.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'
import { counterStep, cookTicket } from '../helpers/perfect-player.mjs'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { questList } from '../../src/core/quests.js'
import { shopCatalog } from '../../src/core/shop.js'
import { startShift, advance, isShiftOver } from '../../src/core/shift.js'
import { signedVND, formatMoneyShort } from '../../src/ui/format.js'

const LOBBY_AT = '2026-11-14T12:00'
const SUM_AT = '2026-09-30T09:02'
const SAFE_CSS = `:root { --safe-top: 62px !important; --safe-bottom: 34px !important; }
.screen, .panel, .k-main { clip-path: inset(0); }`
const FRAMES = {
  '402x874': { vp: { width: 402, height: 874 }, css: SAFE_CSS },
  '402x680': { vp: { width: 402, height: 680 }, css: '.screen, .panel, .k-main { clip-path: inset(0); }' },
  '390x844': { vp: { width: 390, height: 844 }, css: '' },
  '360x600': { vp: { width: 360, height: 600 }, css: '' }
}
const ENTRIES = [
  ['open-shop', 'screen-shop'], ['open-quests', 'screen-quests'], ['open-mail', 'screen-mail'],
  ['open-recipe-book', 'screen-recipe-book'], ['open-notebook', 'screen-notebook'], ['open-settings', 'screen-settings']
]
const LOBBY_ENTRIES = ['open-shop', 'open-quests', 'open-checkin', 'open-mail', 'open-recipe-book', 'open-notebook', 'open-settings']

// ---------- save dựng sẵn ----------

// 6 ca (8–13/11), mở game 14/11 12:00 → ngày 7. checkin: 'today' = điểm danh hôm nay chưa nhận (bảng tự bật), 'done' = đã
// nhận (bảng không tự bật). Việc 1 đã xong chưa nhận, việc 2 chưa xong (đổi miễn phí được).
function lobbySave(checkin = 'done') {
  const { state } = playedSave(6, 6, { from: '2026-11-08T08:00', name: 'Xe Sảnh Chính' })
  state.checkin.lastDay = checkin === 'today' ? '2026-11-13' : '2026-11-14'
  state.goldSpoons = 40
  const q = state.daily.quests
  q[0].progress = q[0].target
  q[1].progress = 0
  return state
}
// Phần thưởng của việc đầu theo lõi, đúng lúc mở game (cùng state, cùng giờ).
function questReward(state) {
  return questList(JSON.parse(JSON.stringify(state)), makeMetaCtx({ at: LOBBY_AT })).quests[0].reward
}
// Ca ngày 5 đã phục vụ hết khách nhưng chưa kết ca: mở trang là màn ca bán tự sang Tổng kết.
function summarySave() {
  const { state } = playedSave(5, 4, { name: 'Xe Tổng Kết', freq: 'it' })
  const ctx = makeMetaCtx({ at: '2026-09-30T09:00', attach: true })
  ctx.setState(state)
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  startShift(state, ctx)
  for (let guard = 0; !isShiftOver(state); guard++) {
    if (guard > 20000) throw new Error('ca không kết thúc')
    while (counterStep(state, ctx)) { /* quầy tới khi phải chờ */ }
    for (const t of state.shift.tickets.slice()) cookTicket(state, ctx, t)
    if (!isShiftOver(state)) advance(state, 0.5, ctx)
  }
  return state
}

function openFrame(frame, name, { at = LOBBY_AT, reduced = false } = {}) {
  const f = FRAMES[frame]
  return openGame({
    clock: { time: vn(at) }, viewport: f.vp, name: 'm5-meta-' + name, initCss: f.css,
    contextOptions: reduced ? { reducedMotion: 'reduce' } : null
  })
}

// ---------- đầu dò trong trang ----------

// Ghi mọi nút được thêm vào lớp hiệu ứng (lớp, thời điểm) — để biết vẽ lại có phát lại hoạt ảnh không.
async function watchVfx(page) {
  await page.addInitScript(() => {
    window.__vfxAdds = []
    new MutationObserver(muts => {
      for (const m of muts) {
        if (!m.target.classList || !m.target.classList.contains('vfx-layer')) continue
        for (const n of m.addedNodes) if (n.nodeType === 1) window.__vfxAdds.push({ cls: String(n.className || n.tagName), t: performance.now() })
      }
    }).observe(document, { childList: true, subtree: true })
  })
}
const vfxMark = page => page.evaluate(() => window.__vfxAdds.length)
// Nút "hoạt ảnh phần thưởng" (xu, phiếu bay, hạt, chữ bay) thêm vào lớp hiệu ứng kể từ mốc `from`.
const rewardAddsSince = (page, from) => page.evaluate(n => window.__vfxAdds.slice(n).filter(a => /vfx-(coin|fly|p|text)\b/.test(a.cls)).map(a => a.cls), from)
const vfxNodes = page => page.evaluate(() => { const l = document.querySelector('.vfx-layer'); return l ? l.childElementCount : 0 })

// Lớp hiệu ứng trống hẳn trong `ms` (tính từ lúc gọi).
async function vfxClearsWithin(page, ms, label) {
  const end = Date.now() + ms
  for (;;) {
    if ((await vfxNodes(page)) === 0) return
    if (Date.now() > end) throw new Error(`${label}: lớp hiệu ứng chưa tự dọn sau ${ms} ms (${await vfxNodes(page)} nút)`)
    await page.waitForTimeout(100)
  }
}

// Phần tử nằm trọn trong khung nhìn và tâm chạm trúng chính nó.
function inViewHit(page, testid) {
  return page.evaluate(id => {
    const el = document.querySelector(`[data-testid="${id}"]`)
    if (!el) return { ok: false, why: 'không có' }
    const r = el.getBoundingClientRect()
    const inside = r.width > 0 && r.height > 0 && r.top >= -0.5 && r.left >= -0.5 && r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return { ok: inside && !!hit && (hit === el || el.contains(hit)), rect: [r.left, r.top, r.right, r.bottom].map(Math.round), inside, at: hit ? (hit.closest('[data-testid]') || hit).getAttribute('data-testid') || String(hit.className) : null }
  }, testid)
}

// Soát màn đang mở (hoặc hộp nổi đang mở): nút ≥ 44px; nút nằm trọn trong khung, ngoài thanh dính, không bị thông báo phủ →
// tâm chạm trúng; không tràn ngang; chữ đang hiện ≥ minFont.
function auditScreen(page, minFont) {
  return page.evaluate(minFont => {
    const out = []
    const STICKY = '.act-bar, .sticky-foot, .k-toolbar, .meta-head, .mg-foot, .prep-toprow, .sum-head-row, .co-pad-actions'
    const vis = el => {
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false
      const b = el.getBoundingClientRect()
      return b.width > 0 && b.height > 0
    }
    const name = el => (el.dataset && el.dataset.testid) || String(el.className || el.tagName).split(' ')[0]
    const s = document.getElementById('screen')
    const ov = Math.max(document.documentElement.scrollWidth - innerWidth, s ? s.scrollWidth - s.clientWidth : 0)
    if (ov > 0) out.push('tràn ngang ' + ov + 'px')
    const sticky = [...document.querySelectorAll(STICKY)].filter(vis).map(e => e.getBoundingClientRect())
    // hộp nổi đang mở (bảng điểm danh…) phủ màn bên dưới: chỉ soát hộp nổi
    const modal = [...document.querySelectorAll('.modal-layer:not(.hide)')].filter(vis)
    const scope = modal.length ? modal : [document.getElementById('screen')].filter(Boolean)
    for (const root of scope) {
      for (const b of root.querySelectorAll('button, a, input, select, [role=button], summary')) {
        if (!vis(b) || b.type === 'checkbox') continue
        const r = b.getBoundingClientRect()
        if (r.width < 43.5 || r.height < 43.5) out.push(`vùng chạm ${Math.round(r.width)}×${Math.round(r.height)} ở ${name(b)}`)
        if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) continue
        if (!b.closest(STICKY) && sticky.some(k => k.top < r.bottom && k.bottom > r.top)) continue
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        if (hit && hit.closest('.toast, .toast-stack')) continue
        if (!hit || !(hit === b || b.contains(hit))) out.push(`${name(b)} bị che (tâm chạm vào ${hit ? name(hit.closest('[data-testid]') || hit) : 'không gì'})`)
      }
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const seen = new Set()
    while (walker.nextNode()) {
      const t = walker.currentNode
      const el = t.parentElement
      if (!t.textContent.trim() || !el || el.closest('svg, .tour-layer, .vfx-layer') || seen.has(el)) continue
      seen.add(el)
      if (!vis(el)) continue
      const fs = parseFloat(getComputedStyle(el).fontSize)
      if (fs < minFont - 0.01) out.push(`chữ ${fs}px ở ${name(el)}: "${t.textContent.trim().slice(0, 24)}"`)
      if (/undefined|NaN|\{[a-z]+\}/.test(t.textContent)) out.push(`chữ lỗi ở ${name(el)}: "${t.textContent.trim().slice(0, 30)}"`)
    }
    return out
  }, minFont)
}

// Hoạt ảnh vô hạn đang chạy (CSS hoặc WAAPI).
function infiniteAnims(page) {
  return page.evaluate(() => document.getAnimations().filter(a => {
    if (a.playState !== 'running') return false
    const t = a.effect && typeof a.effect.getComputedTiming === 'function' ? a.effect.getComputedTiming() : null
    return !!t && t.iterations === Infinity
  }).map(a => {
    const el = a.effect && a.effect.target
    return `${a.animationName || 'waapi'} @ ${el ? (el.dataset && el.dataset.testid) || String(el.className || el.tagName).split(' ')[0] : '?'}`
  }))
}

const amount = (page, testid) => page.getAttribute(T(testid), 'data-amount').then(Number)
const pillNum = (page, testid) => page.textContent(`${T(testid)} .pill-num`).then(s => s.trim())

async function enterPrep(g, checkin) {
  const { page } = g
  await page.goto(g.url('/'))
  await page.waitForSelector(T('start-button'))
  await page.tap(T('start-button'))
  await page.waitForSelector(T('screen-prep'))
  if (checkin === 'today') await page.waitForSelector(T('checkin-popup'))
  else await page.waitForTimeout(300)
}

async function back(page) {
  await page.tap(T('meta-back'))
  await page.waitForSelector(T('screen-prep'))
}

// ---------- (a) sảnh: thấy ngay ngày, lối vào, Mở hàng ----------

test('sảnh Chuẩn bị ở 402×874, 402×680, 390×844, 360×600: không cuộn vẫn thấy biển ngày, 7 lối vào, biển Mở hàng', { timeout: 120000 }, async () => {
  const state = lobbySave('done')
  for (const frame of Object.keys(FRAMES)) {
    const g = await openFrame(frame, 'sanh-' + frame)
    const { page, errors } = g
    try {
      await seedSave(page, state)
      await enterPrep(g, 'done')
      assert.equal(await page.evaluate(() => document.getElementById('screen').scrollTop), 0)
      assert.match(await page.textContent(T('prep-day')), /Ngày 7/)
      for (const id of ['prep-day', ...LOBBY_ENTRIES, 'open-shift']) {
        const m = await inViewHit(page, id)
        assert.ok(m.ok, `${frame}: ${id} phải thấy ngay, không cuộn ${JSON.stringify(m)}`)
      }
      // 7 lối vào: 4 đồ vật trên mặt xe cùng một hàng, 3 đồ vật trong hộc xe cùng một hàng
      const rows = await page.evaluate(ids => ids.map(id => Math.round(document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect().top)), LOBBY_ENTRIES)
      assert.equal(new Set(rows.slice(0, 4)).size, 1, `${frame}: hàng trên mặt xe lệch ${rows}`)
      assert.equal(new Set(rows.slice(4)).size, 1, `${frame}: hàng trong hộc xe lệch ${rows}`)
      await g.shot('sanh')
      assert.deepEqual(errors, [], `${frame}: có lỗi console/trang`)
    } finally {
      await g.close()
    }
  }
})

// ---------- (b) điểm danh + lối vào ----------

for (const frame of ['390x844', '360x600']) {
  test(`điểm danh nhận ô hôm nay, xu bay về ví rồi tự dọn; mỗi lối vào mở đúng màn có nút quay lại; nút ≥ 44px chạm trúng (${frame})`, { timeout: 150000 }, async () => {
    const state = lobbySave('today')
    const g = await openFrame(frame, 'loi-vao-' + frame)
    const { page, errors } = g
    try {
      await watchVfx(page)
      await seedSave(page, state)
      await enterPrep(g, 'today')
      // bảng điểm danh tự bật: ô kế tiếp chưa nhận, nút "Nhận" ghi đúng ngày
      const before = await page.$$eval('[data-testid^="checkin-slot-"]', els => els.map(e => e.dataset.claimed === 'true'))
      const next = before.indexOf(false)
      assert.ok(next >= 0, 'không có ô nào để nhận')
      assert.match(await page.textContent(T('checkin-claim')), new RegExp(`Ngày ${next + 1}`))
      assert.deepEqual(await auditScreen(page, 13), [], `${frame}: bảng điểm danh`)
      const w0 = (await readSave(page)).wallet
      const g0 = (await readSave(page)).goldSpoons
      const mark = await vfxMark(page)
      await page.tap(T('checkin-claim'))
      await page.waitForSelector(T('checkin-popup'), { state: 'detached', timeout: 6000 })
      const s1 = await waitSave(page, s => s.checkin.lastDay === '2026-11-14')
      assert.ok(s1.wallet > w0 || s1.goldSpoons > g0, 'điểm danh không có quà')
      // bảng đóng thì quà bay về ví ở sảnh; số trên ví dừng đúng bản lưu, lớp hiệu ứng tự dọn
      await pollEval(page, m => window.__vfxAdds.length > m, mark, { timeout: 3000, label: 'quà điểm danh bay về ví' })
      await vfxClearsWithin(page, 2600, `${frame} điểm danh`)
      assert.equal(await amount(page, 'prep-wallet'), s1.wallet)
      assert.equal(await amount(page, 'prep-spoons'), s1.goldSpoons)
      await pollEval(page, ([w, n]) => {
        const a = document.querySelector('[data-testid="prep-spoons"] .pill-num')
        return a && a.textContent.trim() === String(n) && document.querySelector('[data-testid="prep-wallet"]').getAttribute('data-amount') === String(w)
      }, [s1.wallet, s1.goldSpoons], { timeout: 3000, label: 'ví ở sảnh dừng đúng số' })
      // mở lại: ô vừa nhận đã đóng dấu, nút khóa; lối vào Điểm danh hết chấm đỏ
      assert.equal(await page.getAttribute(T('open-checkin'), 'data-dot'), '0')
      await page.tap(T('open-checkin'))
      await page.waitForSelector(T('checkin-popup'))
      assert.equal(await page.getAttribute(T('checkin-slot-' + next), 'data-claimed'), 'true')
      assert.equal(await page.isDisabled(T('checkin-claim')), true)
      const close = await inViewHit(page, 'checkin-close')
      assert.ok(close.ok, `${frame}: nút đóng bảng điểm danh bị che ${JSON.stringify(close)}`)
      await page.tap(T('checkin-close'))
      await page.waitForSelector(T('checkin-popup'), { state: 'detached' })

      // sảnh: soát nút / chữ (≥ 14px)
      assert.deepEqual(await auditScreen(page, 14), [], `${frame}: sảnh Chuẩn bị`)
      // mỗi lối vào mở đúng màn, có nút quay lại (thấy ngay, chạm trúng, ≥ 44px)
      for (const [entry, screen] of ENTRIES) {
        await page.tap(T(entry))
        await page.waitForSelector(T(screen))
        await page.waitForTimeout(250)
        const b = await inViewHit(page, 'meta-back')
        assert.ok(b.ok, `${frame} ${screen}: nút quay lại khuất ${JSON.stringify(b)}`)
        const issues = await auditScreen(page, 13)
        assert.deepEqual(issues, [], `${frame} ${screen}`)
        await g.shot(screen)
        await back(page)
      }
      assert.deepEqual(errors, [], `${frame}: có lỗi console/trang`)
    } finally {
      await g.close()
    }
  })
}

// ---------- (c) Việc hôm nay: nhận quà, ví tăng đúng, hiệu ứng tự dọn, vẽ lại không phát lại ----------

for (const frame of ['390x844', '360x600']) {
  test(`Việc hôm nay: nhận quà → ví tăng đúng phần thưởng, xu bay rồi tự dọn; đổi việc (vẽ lại) không phát lại hoạt ảnh (${frame})`, { timeout: 120000 }, async () => {
    const state = lobbySave('done')
    const reward = questReward(state)
    assert.ok(reward.money > 0, 'việc đầu phải thưởng tiền (để thấy xu bay)')
    const g = await openFrame(frame, 'viec-' + frame)
    const { page, errors } = g
    try {
      await watchVfx(page)
      await seedSave(page, state)
      await enterPrep(g, 'done')
      const s0 = await readSave(page)
      await page.tap(T('open-quests'))
      await page.waitForSelector(T('quest-0'))
      assert.equal(await amount(page, 'meta-wallet'), s0.wallet)
      // nút Nhận thấy ngay, chạm trúng
      const m = await inViewHit(page, 'quest-claim-0')
      assert.ok(m.ok, `${frame}: nút Nhận của việc đã xong phải thấy ngay ${JSON.stringify(m)}`)
      const mark = await vfxMark(page)
      await page.tap(T('quest-claim-0'))
      const s1 = await waitSave(page, s => s.daily.quests[0].claimed === true)
      assert.equal(s1.wallet - s0.wallet, reward.money, 'Tiền quán tăng đúng phần thưởng của lõi')
      assert.equal((s1.reputation || 0) - (s0.reputation || 0), reward.rep || 0, 'danh tiếng tăng đúng')
      assert.equal((s1.goldSpoons || 0) - (s0.goldSpoons || 0), reward.gold || 0, 'Muỗng Vàng tăng đúng')
      await pollEval(page, mk => window.__vfxAdds.slice(mk).some(a => /vfx-coin/.test(a.cls)), mark, { timeout: 2000, label: 'xu bay về ví' })
      // viên ví đếm lên rồi dừng đúng số; data-amount luôn là số thật
      assert.equal(await amount(page, 'meta-wallet'), s1.wallet)
      await pollEval(page, want => {
        const n = document.querySelector('[data-testid="meta-wallet"] .pill-num')
        return n && n.textContent.trim() === want
      }, formatMoneyShort(s1.wallet), { timeout: 3000, label: 'ví dừng đúng số' })
      await vfxClearsWithin(page, 2000, `${frame} nhận quà việc`)
      assert.match(await page.textContent(T('quest-claim-0')), /Đã nhận/)
      // vẽ lại: đổi việc 2 (miễn phí) → màn vẽ lại; không thêm xu / hạt / chữ bay, tờ đã nhận không đóng dấu lại
      await page.waitForTimeout(400)
      const mark2 = await vfxMark(page)
      await page.tap(T('quest-reroll-1'))
      await waitSave(page, s => (s.daily.rerolls || 0) >= 1)
      await page.waitForTimeout(900)
      assert.deepEqual(await rewardAddsSince(page, mark2), [], `${frame}: vẽ lại phát lại hoạt ảnh phần thưởng`)
      assert.equal(await page.$$eval('.is-stamping', els => els.length), 0, 'tờ việc đã nhận đóng dấu lại khi vẽ lại')
      assert.equal(await amount(page, 'meta-wallet'), s1.wallet)
      // quay về sảnh: không phát lại xu bay
      const mark3 = await vfxMark(page)
      await back(page)
      await page.waitForTimeout(900)
      assert.deepEqual(await rewardAddsSince(page, mark3), [], `${frame}: quay về sảnh phát lại xu bay`)
      assert.deepEqual(errors, [], `${frame}: có lỗi console/trang`)
    } finally {
      await g.close()
    }
  })
}

// ---------- (d) Chợ Công Thức: mua món ----------

for (const frame of ['390x844', '360x600']) {
  test(`Chợ Công Thức: mua món → vào thực đơn, Tiền quán trừ đúng giá, hiệu ứng tự dọn; đổi kệ không phát lại (${frame})`, { timeout: 120000 }, async () => {
    const state = lobbySave('done')
    const buyable = shopCatalog(JSON.parse(JSON.stringify(state)), makeMetaCtx({ at: LOBBY_AT })).recipes.filter(r => r.canBuy)
    assert.ok(buyable.length, 'save phải có món mua được')
    const r = buyable[0]
    const g = await openFrame(frame, 'cho-' + frame)
    const { page, errors } = g
    try {
      await watchVfx(page)
      await seedSave(page, state)
      await enterPrep(g, 'done')
      const s0 = await readSave(page)
      await page.tap(T('open-shop'))
      await page.waitForSelector(T('shop-buy-' + r.id))
      assert.equal(Number(await page.getAttribute(T('shop-buy-' + r.id), 'data-price')), r.shopPrice)
      await page.$eval(T('shop-buy-' + r.id), e => e.scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(200)
      const m = await inViewHit(page, 'shop-buy-' + r.id)
      assert.ok(m.ok, `${frame}: nút Mua bị che ${JSON.stringify(m)}`)
      await page.tap(T('shop-buy-' + r.id))
      await page.waitForSelector(T('confirm-ok'))
      const mark = await vfxMark(page)
      await page.tap(T('confirm-ok'))
      await page.waitForSelector(`${T('shop-item-' + r.id)}.is-owned`)
      const s1 = await waitSave(page, s => !!s.recipes[r.id])
      assert.equal(s0.wallet - s1.wallet, r.shopPrice, 'Tiền quán trừ đúng giá món')
      assert.equal(await amount(page, 'meta-wallet'), s1.wallet)
      await pollEval(page, mk => window.__vfxAdds.length > mk, mark, { timeout: 2000, label: 'hiệu ứng mua món' })
      await vfxClearsWithin(page, 2400, `${frame} mua món`)
      await pollEval(page, want => {
        const n = document.querySelector('[data-testid="meta-wallet"] .pill-num')
        return n && n.textContent.trim() === want
      }, formatMoneyShort(s1.wallet), { timeout: 3000, label: 'ví dừng đúng số sau khi mua' })
      // đổi kệ qua lại (vẽ lại cả khu): không phát lại hoạt ảnh
      const mark2 = await vfxMark(page)
      for (const tab of ['shop-tab-upgrades', 'shop-tab-spoons', 'shop-tab-recipes']) {
        await page.tap(T(tab))
        await page.waitForSelector(T(tab.replace('tab-', '')))
      }
      await page.waitForTimeout(700)
      assert.deepEqual(await rewardAddsSince(page, mark2), [], `${frame}: đổi kệ phát lại hoạt ảnh`)
      assert.ok(await page.$(`${T('shop-item-' + r.id)}.is-owned`))
      const mark3 = await vfxMark(page)
      await back(page)
      await page.waitForTimeout(900)
      assert.deepEqual(await rewardAddsSince(page, mark3), [], `${frame}: quay về sảnh phát lại xu bay`)
      assert.equal(await amount(page, 'prep-wallet'), s1.wallet)
      assert.deepEqual(errors, [], `${frame}: có lỗi console/trang`)
    } finally {
      await g.close()
    }
  })
}

// ---------- (e) Tổng kết: số đếm lên dừng đúng giá trị cuối ----------

for (const frame of ['390x844', '360x600']) {
  test(`Tổng kết: lãi trong ca đếm lên và dừng đúng, viên Tiền quán dừng đúng ví, sổ lãi lỗ đếm xong không còn số dở (${frame})`, { timeout: 120000 }, async () => {
    const g = await openFrame(frame, 'tong-ket-' + frame, { at: SUM_AT })
    const { page, errors } = g
    try {
      await seedSave(page, summarySave())
      // ghi mọi số "Lãi trong ca" đã hiện (đếm lên)
      await page.addInitScript(() => {
        window.__hero = []
        new MutationObserver(() => {
          const n = document.querySelector('.sum-result-num')
          if (n && window.__hero[window.__hero.length - 1] !== n.textContent) window.__hero.push(n.textContent)
        }).observe(document, { childList: true, subtree: true, characterData: true })
      })
      await page.goto(g.url('/'))
      await page.waitForSelector(`${T('screen-service')}, ${T('summary')}`)
      await resolveIncidentIfShown(g, { waitMs: 300 })
      await page.waitForSelector(T('summary'), { timeout: 15000 })
      const profit = await amount(page, 'summary-profit')
      // chữ thật trong ô lãi là số cuối ngay từ đầu (e2e và trình đọc màn hình đọc ngay)
      assert.equal((await page.textContent(`${T('summary-profit')} .sum-amt`)).trim(), signedVND(profit))
      assert.ok(await page.$('.summary-screen.is-anim'), 'không giảm chuyển động: màn Tổng kết phải diễn hiệu ứng vào màn')
      const s = await readSave(page)
      await pollEval(page, ([p, w]) => {
        const hero = document.querySelector('.sum-result-num')
        const wallet = document.querySelector('[data-testid="summary-wallet"] .pill-num')
        return hero && wallet && hero.textContent.trim() === p && wallet.textContent.trim() === w
      }, [signedVND(profit), formatMoneyShort(s.wallet)], { timeout: 5000, label: 'số đếm lên dừng đúng giá trị cuối' })
      const hero = await page.evaluate(() => window.__hero)
      assert.ok(hero.length >= 3, `"Lãi trong ca" phải đếm qua các số trung gian (${hero.join(' → ')})`)
      const val = t => (/^[−-]/.test(t) ? -1 : 1) * (Number(t.replace(/[^\d]/g, '')) || 0)
      const seq = hero.map(val)
      for (let i = 1; i < seq.length; i++) assert.ok(profit >= 0 ? seq[i] >= seq[i - 1] : seq[i] <= seq[i - 1], `số đếm lên bị lùi: ${hero.join(' → ')}`)
      assert.equal(seq[seq.length - 1], profit)
      assert.equal(await amount(page, 'summary-wallet'), s.wallet)
      // sổ lãi lỗ: cuộn tới, đếm xong không còn số dở; ô lãi giữ đúng số
      await page.$eval('table.ledger', e => e.scrollIntoView({ block: 'center' }))
      await pollEval(page, () => !document.querySelector('.summary-screen td.is-counting, .summary-screen td[data-shown]'), null,
        { timeout: 4000, label: 'sổ lãi lỗ đếm xong' })
      assert.equal((await page.textContent(`${T('summary-profit')} .sum-amt`)).trim(), signedVND(profit))
      await vfxClearsWithin(page, 3000, `${frame} Tổng kết`)
      assert.deepEqual(await auditScreen(page, 14), [], `${frame}: Tổng kết`)
      await g.shot('tong-ket')
      assert.deepEqual(errors, [], `${frame}: có lỗi console/trang`)
    } finally {
      await g.close()
    }
  })
}

// ---------- (g) khung chính iPhone 16 Pro: thấy ngay đầu màn, phần thưởng chờ nhận, nút chính ----------

// Màn con mở từ sảnh: lối vào (cuộn tới nếu nằm dưới sảnh), testid màn, các phần tử phải thấy ngay (bộ chọn: phần tử đầu
// tiên khớp).
const MAIN_VIEWS = [
  { entry: 'open-shop', screen: 'screen-shop', must: ['meta-back', 'shop-tab-recipes', '[data-testid^="shop-item-"]:not(.is-owned) [data-testid^="shop-buy-"]', 'button[data-testid^="shop-trial-"]'] },
  { entry: 'open-quests', screen: 'screen-quests', must: ['meta-back', 'quest-0', 'quest-claim-0'] },
  { entry: 'open-mail', screen: 'screen-mail', must: ['meta-back', 'mail-claim-all', 'button[data-testid^="mail-claim-"]:not([data-testid="mail-claim-all"])'] },
  { entry: 'open-recipe-book', screen: 'screen-recipe-book', must: ['meta-back', 'recipe-book-tab-mon', '[data-testid^="book-open-"]'] },
  { entry: 'open-notebook', screen: 'screen-notebook', must: ['meta-back', 'notebook-progress', '[data-testid^="notebook-tab-"]'] },
  { entry: 'open-market', screen: 'screen-market', must: ['meta-back', 'market-intro', 'stall-start'] },
  { entry: 'open-event', screen: 'screen-event', must: ['meta-back', 'event-tem', 'event-checkin-claim'] }
]
function firstInViewHit(page, sel) {
  return page.evaluate(sel => {
    const q = /[^A-Za-z0-9_-]/.test(sel) ? sel : `[data-testid="${sel}"]`
    const el = document.querySelector(q)
    if (!el) return { ok: false, why: 'không có ' + sel }
    const r = el.getBoundingClientRect()
    // phần tử cao hơn khung (vd tờ giấy, khung giới thiệu): đủ khi phần đầu nằm trong khung
    const inside = r.width > 0 && r.height > 0 && r.top >= -0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5 &&
      (r.bottom <= innerHeight + 0.5 || r.top <= innerHeight * 0.6)
    const y = Math.min(r.top + r.height / 2, r.top + 22)
    const hit = document.elementFromPoint(r.left + r.width / 2, y)
    return { ok: inside && !!hit && (hit === el || el.contains(hit)), rect: [r.left, r.top, r.right, r.bottom].map(Math.round), at: hit ? (hit.closest('[data-testid]') || hit).getAttribute('data-testid') || String(hit.className) : null }
  }, sel)
}

for (const frame of ['402x874', '402x680']) {
  test(`khung chính iPhone 16 Pro ${frame}: sảnh thấy hộp quà; mỗi màn thấy ngay đầu màn, phần thưởng chờ nhận, nút chính`, { timeout: 150000 }, async () => {
    const state = lobbySave('done')
    const g = await openFrame(frame, 'khung-chinh-' + frame)
    const { page, errors } = g
    try {
      await seedSave(page, state)
      await enterPrep(g, 'done')
      const gift = await inViewHit(page, 'prep-gift')
      assert.ok(gift.ok, `${frame}: hộp quà chờ nhận ở sảnh phải thấy ngay ${JSON.stringify(gift)}`)
      for (const v of MAIN_VIEWS) {
        await page.evaluate(() => { document.getElementById('screen').scrollTop = 0 })
        await page.$eval(T(v.entry), e => e.scrollIntoView({ block: 'center' }))
        await page.waitForTimeout(150)
        await page.tap(T(v.entry))
        await page.waitForSelector(T(v.screen))
        await page.waitForTimeout(350)
        assert.equal(await page.evaluate(() => document.getElementById('screen').scrollTop), 0, `${v.screen}: màn mở ra đã cuộn`)
        for (const sel of v.must) {
          const m = await firstInViewHit(page, sel)
          assert.ok(m.ok, `${frame} ${v.screen}: ${sel} phải thấy ngay ${JSON.stringify(m)}`)
        }
        await g.shot(v.screen)
        await back(page)
      }
      assert.deepEqual(errors, [], `${frame}: có lỗi console/trang`)
    } finally {
      await g.close()
    }
    // Tổng kết: sao ca này, lãi trong ca và nút Ngày mai thấy ngay
    const h = await openFrame(frame, 'khung-chinh-tk-' + frame, { at: SUM_AT })
    try {
      const { page, errors } = h
      await seedSave(page, summarySave())
      await page.goto(h.url('/'))
      await page.waitForSelector(`${T('screen-service')}, ${T('summary')}`)
      await resolveIncidentIfShown(h, { waitMs: 300 })
      await page.waitForSelector(T('summary'), { timeout: 15000 })
      for (const sel of ['summary-stars', '.sum-result', 'next-day', 'help-button']) {
        const m = await firstInViewHit(page, sel)
        assert.ok(m.ok, `${frame} Tổng kết: ${sel} phải thấy ngay ${JSON.stringify(m)}`)
      }
      await h.shot('tong-ket')
      assert.deepEqual(errors, [], `${frame} Tổng kết: có lỗi console/trang`)
    } finally {
      await h.close()
    }
  })
}

// ---------- (f) Giảm chuyển động ----------

test('giảm chuyển động (390×844): không hoạt ảnh vô hạn ở các màn ngoài ca, nhận quà không có xu bay, Tổng kết hiện thẳng', { timeout: 150000 }, async () => {
  let g = await openFrame('390x844', 'giam', { reduced: true })
  try {
    const { page, errors } = g
    await watchVfx(page)
    await seedSave(page, lobbySave('today'))
    await enterPrep(g, 'today')
    assert.deepEqual(await infiniteAnims(page), [], 'bảng điểm danh: có hoạt ảnh vô hạn')
    let mark = await vfxMark(page)
    await page.tap(T('checkin-claim'))
    await page.waitForSelector(T('checkin-popup'), { state: 'detached', timeout: 6000 })
    await page.waitForTimeout(700)
    assert.deepEqual((await rewardAddsSince(page, mark)).filter(c => /vfx-(coin|fly)/.test(c)), [], 'giảm chuyển động mà xu vẫn bay')
    assert.deepEqual(await infiniteAnims(page), [], 'sảnh: có hoạt ảnh vô hạn')
    const s0 = await readSave(page)
    await page.tap(T('open-quests'))
    await page.waitForSelector(T('quest-claim-0'))
    mark = await vfxMark(page)
    await page.tap(T('quest-claim-0'))
    const s1 = await waitSave(page, s => s.daily.quests[0].claimed === true)
    assert.ok(s1.wallet > s0.wallet)
    await page.waitForTimeout(500)
    assert.deepEqual((await rewardAddsSince(page, mark)).filter(c => /vfx-(coin|fly)/.test(c)), [], 'giảm chuyển động mà xu vẫn bay (Việc hôm nay)')
    // số trên ví cập nhật ngay
    assert.equal((await pillNum(page, 'meta-wallet')), formatMoneyShort(s1.wallet))
    assert.deepEqual(await infiniteAnims(page), [], 'Việc hôm nay: có hoạt ảnh vô hạn')
    for (const [entry, screen] of [['open-shop', 'screen-shop'], ['open-mail', 'screen-mail'], ['open-notebook', 'screen-notebook'], ['open-recipe-book', 'screen-recipe-book']]) {
      await back(page)
      await page.tap(T(entry))
      await page.waitForSelector(T(screen))
      await page.waitForTimeout(400)
      assert.deepEqual(await infiniteAnims(page), [], `${screen}: có hoạt ảnh vô hạn`)
    }
    await back(page)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
  // Tổng kết: hiện thẳng, số cuối ngay, không hoạt ảnh vô hạn
  g = await openFrame('390x844', 'giam-tong-ket', { at: SUM_AT, reduced: true })
  try {
    const { page, errors } = g
    await seedSave(page, summarySave())
    await page.goto(g.url('/'))
    await page.waitForSelector(`${T('screen-service')}, ${T('summary')}`)
    await resolveIncidentIfShown(g, { waitMs: 300 })
    await page.waitForSelector(T('summary'), { timeout: 15000 })
    assert.ok(await page.$('.summary-screen.is-static'), 'giảm chuyển động: Tổng kết phải hiện thẳng')
    const profit = await amount(page, 'summary-profit')
    assert.equal((await page.textContent('.sum-result-num')).trim(), signedVND(profit))
    const s = await readSave(page)
    assert.equal(await pillNum(page, 'summary-wallet'), formatMoneyShort(s.wallet))
    await page.waitForTimeout(400)
    assert.deepEqual(await infiniteAnims(page), [], 'Tổng kết: có hoạt ảnh vô hạn')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
