// E2E Phòng mẫu giao diện M5 (mau.html, bản 0.4.2). Nhóm e2e: G3 (chạy riêng: node --test tests/e2e/mau.e2e.mjs).
// Ở 4 khung 390×844 (vùng an toàn 47/34), 360×600, 320×568, 375×553 (vùng an toàn 47/34, ghi đè --safe-top /
// --safe-bottom qua initCss như iphone-overlays.e2e): mở mau.html qua máy chủ tĩnh (khung 390×844 chạy dưới đường dẫn con
// /gamefnb/ như GitHub Pages), không lỗi console / pageerror / requestfailed / HTTP ≥ 400; ở mỗi thẻ: mọi nút hiển thị
// ≥ 44px, chữ hiển thị ≥ 13px, nút chính không bị che (elementFromPoint) và nằm trong vùng an toàn; font Baloo 2 nạp được.
//  - Gọi món: chạy trọn luồng thật (món, số lượng, ghi chú, đọc lại, chốt order) → có con dấu ĐÃ CHỐT, phiếu mới lên dây.
//  - Bếp: Thái: thẻ "Bước 3/6 · Thái dưa leo!" → thái theo data-x của thai-guide-i → điểm ≥ 90, con dấu hạng hoan_hao,
//    Dì Sáu phản ứng; nút xem nhanh dấu đổi đúng hạng.
//  - Ra món: dish-reveal có data-grade / data-q đúng bảng mẫu cho cả 5 hạng.
//  - Giảm chuyển động (công tắc trong trang): không còn hoạt ảnh vô hạn đang chạy, vfx không còn hạt.
//  - Lớp .vfx-layer không nhận chạm, ≤ 30 nút; trang không ghi bản lưu của game (localStorage 'bkn.save').
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame } from './helpers.mjs'
import { REVEAL_SAMPLES, REVEAL_GRADES, STAMP_SAMPLES, MAU_TABS, LOW_PANEL_PX } from '../../mau/mau.js'

const SAFE_TOP = 47
const SAFE_BOTTOM = 34
const VIEWPORTS = [
  { width: 390, height: 844, safe: true, basePath: '/gamefnb' },
  { width: 360, height: 600, safe: false, low: true },
  { width: 320, height: 568, safe: false },
  { width: 375, height: 553, safe: true }
]
const vpName = vp => `${vp.width}×${vp.height}${vp.safe ? ' (vùng an toàn)' : ''}`

async function openMau(vp) {
  const stray = []
  const g = await openGame({
    viewport: { width: vp.width, height: vp.height }, name: 'mau', basePath: vp.basePath || '',
    initCss: vp.safe ? `:root { --safe-top: ${SAFE_TOP}px !important; --safe-bottom: ${SAFE_BOTTOM}px !important; }` : '',
    onResponse: vp.basePath ? ({ url, status }) => {
      const p = url.split('?')[0]
      if (status >= 400 || !(p === vp.basePath || p.startsWith(vp.basePath + '/'))) stray.push(`${status} ${url}`)
    } : null
  })
  g.page.on('requestfailed', r => g.errors.push('requestfailed: ' + r.url() + ' ' + ((r.failure() || {}).errorText || '')))
  g.stray = stray
  g.safeTop = vp.safe ? SAFE_TOP : 0
  g.safeBottom = vp.safe ? SAFE_BOTTOM : 0
  await g.page.goto(g.url('mau.html'))
  await g.page.waitForFunction(() => window.__mau && window.__mau.ready)
  return g
}

// Mọi nút / liên kết / thẻ / công tắc đang hiện trong khung nhìn: ≥ 44×44. Mọi chữ đang hiện: ≥ 13px (bỏ chữ trong SVG).
function audit(page) {
  return page.evaluate(() => {
    const bad = []
    const inView = r => r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight
    const shown = e => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    const sel = 'button, a[href], [role="button"], [role="tab"], [role="switch"], summary, input, select'
    for (const b of document.querySelectorAll(sel)) {
      if (b.closest('.vfx-layer') || !shown(b)) continue
      const r = b.getBoundingClientRect()
      if (!r.width || !r.height || !inView(r)) continue
      if (r.width < 43.5 || r.height < 43.5) bad.push(`nút nhỏ ${Math.round(r.width)}×${Math.round(r.height)}: ${b.dataset.testid || b.className} "${b.textContent.trim().slice(0, 20)}"`)
    }
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.data.trim()) continue
      const p = n.parentElement
      if (!p || p.closest('svg, script, style, noscript, .vfx-layer') || !shown(p)) continue
      const range = document.createRange()
      range.selectNodeContents(n)
      const r = range.getBoundingClientRect()
      if (!r.width || !r.height || !inView(r)) continue
      const fs = parseFloat(getComputedStyle(p).fontSize)
      if (fs < 12.95) bad.push(`chữ nhỏ ${fs}px: "${n.data.trim().slice(0, 24)}" (${p.className})`)
    }
    return bad
  })
}

// Nút chính: nằm trong khung nhìn trừ vùng an toàn, tâm và 4 điểm sát mép trúng chính nút (không bị che).
function reachable(page, sel, safeTop, safeBottom) {
  return page.evaluate(([s, st, sb]) => {
    const b = document.querySelector(s)
    if (!b) return 'không thấy ' + s
    const r = b.getBoundingClientRect()
    if (!r.width || !r.height) return 'bị ẩn ' + s
    if (r.top < st - 0.5 || r.left < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight - sb + 0.5) {
      return `${s} ra ngoài vùng an toàn [${[r.left, r.top, r.right, r.bottom].map(Math.round)}] khung ${innerWidth}×${innerHeight}`
    }
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const d = Math.min(6, r.height / 4), dx = Math.min(r.height / 2, r.width / 4)
    for (const [x, y] of [[cx, cy], [r.left + dx, cy], [r.right - dx, cy], [cx, r.top + d], [cx, r.bottom - d]]) {
      const e = document.elementFromPoint(x, y)
      if (!e || !(e === b || b.contains(e))) return `${s} bị che tại (${Math.round(x)},${Math.round(y)}) bởi ${e ? (e.dataset.testid || e.className) : 'không có gì'}`
    }
    return ''
  }, [sel, safeTop, safeBottom])
}

async function assertReach(g, sels, label) {
  for (const s of sels) {
    const why = await reachable(g.page, s, g.safeTop, g.safeBottom)
    assert.equal(why, '', `${label}: ${why}`)
  }
}

async function assertAudit(g, label) {
  const bad = await audit(g.page)
  assert.deepEqual(bad, [], `${label}: vi phạm cỡ nút / chữ`)
}

async function vfxOk(page, label) {
  const v = await page.evaluate(() => {
    const layer = document.querySelector('.vfx-layer')
    return { pe: layer ? getComputedStyle(layer).pointerEvents : 'none', stats: window.__mau.vfx.stats() }
  })
  assert.equal(v.pe, 'none', label + ': .vfx-layer phải có pointer-events: none')
  assert.ok(v.stats.dom <= 30, `${label}: .vfx-layer có ${v.stats.dom} nút (> 30)`)
}

async function openTab(g, id) {
  await g.page.click(T('mau-tab-' + id))
  await g.page.waitForSelector(T('mau-view-' + id), { state: 'visible' })
  assert.equal(await g.page.getAttribute(T('mau-tab-' + id), 'aria-selected'), 'true')
}

// Đợi các phần tử đứng yên (hết hoạt ảnh vào) trước khi đo bằng elementFromPoint.
async function settle(page, ms = 450) { await page.waitForTimeout(ms) }

// ---------- Gọi món ----------
async function orderFlow(g, label) {
  const { page } = g
  await openTab(g, 'goi-mon')
  await page.waitForSelector(T('speech-bubble'))
  const req = JSON.parse(await page.getAttribute(T('speech-bubble'), 'data-request'))
  assert.equal(req.length, 2, label + ': khách gọi 2 dòng')
  assert.equal((await page.textContent(T('rare-left-banh_mi_trung_ga_ta'))).trim(), '★ còn 2')
  assert.equal(await page.getAttribute(T('menu-item-tra_tac_mat_ong'), 'aria-disabled'), 'true', label + ': món hết hàng')
  await settle(page)
  await assertAudit(g, label + ' Gọi món')
  await assertReach(g, [T('mau-tab-goi-mon'), T('mau-settings'), T('readback')], label + ' Gọi món')
  // dòng 1: 2 bánh mì ốp la, không hành, cay
  await page.click(T('menu-item-banh_mi_op_la'))
  await page.waitForSelector(T('order-sheet'), { state: 'visible' })
  await settle(page)
  await assertAudit(g, label + ' bảng chọn món')
  await page.click(T('qty-plus'))
  assert.equal((await page.textContent(T('qty-value'))).trim(), '2')
  await page.click(T('note-chip-khong_hanh'))
  await page.click(T('note-chip-cay'))
  assert.equal(await page.getAttribute(T('note-chip-cay'), 'aria-pressed'), 'true')
  await assertReach(g, [T('add-line')], label + ' bảng chọn món')
  await page.click(T('add-line'))
  await page.waitForSelector(T('order-sheet'), { state: 'detached' })
  await page.waitForSelector(T('order-line-0'))
  // dòng 2: 1 trà tắc ít đường
  await page.click(T('menu-item-tra_tac'))
  await page.waitForSelector(T('order-sheet'), { state: 'visible' })
  await page.click(T('note-chip-it_duong'))
  await page.click(T('add-line'))
  await page.waitForSelector(T('order-sheet'), { state: 'detached' })
  await page.waitForSelector(T('order-line-1'))
  // đọc lại → khách xác nhận đúng → nút chốt bật
  await page.click(T('readback'))
  await page.waitForSelector(`${T('confirm-order')}:not([disabled])`, { timeout: 8000 })
  await settle(page, 300)
  await assertReach(g, [T('confirm-order')], label + ' sau đọc lại')
  // theo dõi con dấu ĐÃ CHỐT (nằm trên bản sao phiếu trong lớp hiệu ứng, tự gỡ sau khi bay)
  await page.evaluate(() => {
    window.__stampSeen = false
    const mo = new MutationObserver(() => { if (document.querySelector('.co-stamp')) window.__stampSeen = true })
    mo.observe(document.body, { childList: true, subtree: true })
    window.__stampMo = mo
  })
  await page.click(T('confirm-order'))
  await page.waitForSelector(T('mau-order-stamp'), { state: 'visible' })
  assert.equal((await page.textContent(T('mau-order-stamp'))).trim(), 'ĐÃ CHỐT')
  await page.waitForFunction(() => window.__stampSeen === true, null, { timeout: 3000 })
  await vfxOk(page, label + ' lúc chốt')
  await page.waitForSelector(T('mau-ticket-new'), { timeout: 5000 })
  const events = await page.evaluate(() => window.__mau.log.events.map(e => e.type))
  assert.ok(events.includes('mau.order.confirmed'), label + ': bus nhận sự kiện chốt order')
  await settle(page)
  await assertAudit(g, label + ' sau chốt')
  await assertReach(g, [T('mau-order-again')], label + ' sau chốt')
}

// ---------- Bếp: Thái ----------
async function thaiFlow(g, label) {
  const { page } = g
  await openTab(g, 'thai')
  await page.waitForSelector(T('step-hint'), { state: 'visible' })
  const cardText = await page.textContent(T('step-hint'))
  assert.match(cardText, /Bước 3\/6/, label + ': ruy băng bước')
  assert.match(cardText, /Thái dưa leo!/, label + ': động từ của bước')
  assert.ok(await page.$(T('step-card-demo')), label + ': có tay mẫu')
  await settle(page, 500)
  await assertAudit(g, label + ' thẻ bước')
  await assertReach(g, [T('step-card-go'), T('mau-thai-again'), ...STAMP_SAMPLES.map(s => T('mau-stamp-' + s.key))], label + ' thẻ bước')
  await page.click(T('step-card-go'))
  await page.waitForSelector(T('thai-board'), { state: 'visible' })
  await page.waitForSelector(T('step-hint'), { state: 'detached' })
  await settle(page, 300)
  await assertAudit(g, label + ' sân khấu Thái')
  await assertReach(g, [T('thai-done')], label + ' sân khấu Thái')
  // kéo dao tới vạch (data-x tính từ mép trái sân khấu), nhấc tay để cắt
  const stage = await (await page.$(T('minigame-stage'))).boundingBox()
  const food = await (await page.$('.thai-food')).boundingBox()
  const y = food.y + food.height / 2
  const xs = await page.$$eval('[data-testid^="thai-guide-"]', els => els.map(e => Number(e.dataset.x)))
  assert.ok(xs.length >= 1, label + ': có vạch thái')
  for (const gx of xs) {
    const x = stage.x + gx
    await page.mouse.move(x - 30, y)
    await page.mouse.down()
    await page.mouse.move(x, y, { steps: 4 })
    await page.mouse.up()
    await page.waitForTimeout(120)
  }
  await page.waitForSelector(T('step-result'), { timeout: 8000 })
  const res = await page.evaluate(() => {
    const e = document.querySelector('[data-testid="step-result"]')
    return { score: Number(e.dataset.score), grade: e.dataset.grade }
  })
  assert.ok(res.score >= 90, `${label}: thái theo vạch phải ≥ 90 điểm, được ${res.score}`)
  assert.equal(res.grade, 'hoan_hao', label + ': con dấu Hoàn hảo')
  assert.ok(await page.$('.g-stamp.grade-hoan_hao'), label + ': con dấu có lớp grade-hoan_hao')
  await page.waitForSelector(T('disau-react'))
  const ev = await page.evaluate(() => window.__mau.log.events.filter(e => e.type === 'mau.step.result').pop())
  assert.equal(ev && ev.score, res.score, label + ': con dấu theo điểm thật của bước')
  await vfxOk(page, label + ' sau con dấu')
  // xem nhanh 4 hạng dấu
  for (const s of STAMP_SAMPLES) {
    await page.click(T('mau-stamp-' + s.key))
    await page.waitForFunction(k => { const e = document.querySelector('[data-testid="step-result"]'); return e && e.dataset.grade === k }, s.key, { timeout: 3000 })
    assert.equal(Number(await page.getAttribute(T('step-result'), 'data-score')), s.score)
  }
  await settle(page)
  await assertAudit(g, label + ' sau xem dấu')
  // Thái lại: thẻ bước hiện lại
  await page.click(T('mau-thai-again'))
  await page.waitForSelector(T('step-hint'), { state: 'visible' })
}

// ---------- Ra món ----------
async function revealFlow(g, label) {
  const { page } = g
  await openTab(g, 'ra-mon')
  await page.waitForSelector(T('dish-reveal'))
  for (const grade of REVEAL_GRADES) {
    await page.click(T('mau-grade-' + grade))
    await page.waitForFunction(gr => { const e = document.querySelector('[data-testid="dish-reveal"]'); return e && e.dataset.grade === gr }, grade, { timeout: 3000 })
    const q = Number(await page.getAttribute(T('dish-reveal'), 'data-q'))
    assert.equal(q, REVEAL_SAMPLES[grade].q, `${label}: ${grade} data-q`)
    assert.match(await page.textContent(`${T('dish-reveal')} .k-bubble`), new RegExp(REVEAL_SAMPLES[grade].comment.slice(0, 12)))
  }
  // lên cấp: có dòng lên cấp; đợi đủ nhịp rồi đo
  await page.click(T('mau-grade-tuyet_hao'))
  await page.click(T('mau-levelup'))
  await page.waitForSelector('.g-reveal-lvup')
  await vfxOk(page, label + ' ra món lên cấp')
  await page.waitForTimeout(2400)
  await assertAudit(g, label + ' Ra món')
  await assertReach(g, [T('mau-grade-tuyet_hao'), T('mau-grade-hong'), T('mau-flawless'), T('mau-levelup'), T('mau-reveal-again')], label + ' Ra món')
  // chạm màn ra món = đóng; Xem lại phát lại
  await page.click(T('dish-reveal'))
  await page.waitForSelector(T('mau-reveal-rest'))
  await page.click(T('mau-reveal-again'))
  await page.waitForSelector(T('dish-reveal'))
}

// ---------- Hình ----------
async function artFlow(g, label) {
  const { page } = g
  await openTab(g, 'hinh')
  await page.waitForSelector(T('mau-art-grid'))
  const n = await page.$$eval(`${T('mau-art-grid')} > *`, els => els.length)
  assert.ok(n >= 15, label + ': lưới so hình đủ chủ thể')
  for (const size of [48, 120, 200, 72]) {
    await page.click(T('mau-size-' + size))
    const w = await page.$eval(`${T('mau-art-dua_leo')} .mau-pic[data-v="moi"]`, e => Math.round(e.getBoundingClientRect().width))
    assert.equal(w, size, `${label}: hình mới cỡ ${size}`)
    const old = await page.$eval(`${T('mau-art-dua_leo')} .mau-pic[data-v="cu"]`, e => Math.round(e.getBoundingClientRect().width))
    assert.equal(old, size, `${label}: hình cũ cỡ ${size}`)
  }
  await page.click(T('mau-bg-go'))
  assert.ok(await page.$(`${T('mau-art-dua_leo')} .mau-well.g-wood`), label + ': nền gỗ')
  await page.click(T('mau-bg-giay'))
  await settle(page, 200)
  await assertAudit(g, label + ' Hình')
  await assertReach(g, [T('mau-tab-hinh'), T('mau-tab-ra-mon'), T('mau-home'), T('mau-settings')], label + ' Hình')
}

// ---------- Giảm chuyển động ----------
async function reducedFlow(g, label) {
  const { page } = g
  await page.click(T('mau-settings'))
  await page.waitForSelector(T('mau-sw-reduce'), { state: 'visible' })
  await settle(page, 350)
  await assertAudit(g, label + ' bảng Tùy chỉnh')
  await assertReach(g, [T('mau-sw-reduce'), T('mau-sw-sound'), T('mau-sw-low'), T('mau-settings-close')], label + ' bảng Tùy chỉnh')
  if ((await page.getAttribute(T('mau-sw-reduce'), 'aria-checked')) !== 'true') await page.click(T('mau-sw-reduce'))
  assert.equal(await page.getAttribute(T('mau-sw-reduce'), 'aria-checked'), 'true')
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('reduce-motion')), true)
  await page.click(T('mau-settings-close'))
  await page.waitForSelector(T('mau-settings-layer'), { state: 'detached' })
  const infinite = () => page.evaluate(() => {
    const list = document.getAnimations().filter(a => {
      const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {}
      return t.iterations === Infinity && a.playState === 'running'
    })
    return { n: list.length, names: list.slice(0, 5).map(a => (a.animationName || a.id || '?') + '@' + ((a.effect && a.effect.target && a.effect.target.className) || '')) , particles: window.__mau.vfx.stats().particles }
  })
  for (const t of MAU_TABS) {
    await openTab(g, t.id)
    if (t.id === 'ra-mon') { await page.click(T('mau-grade-tuyet_hao')); await page.waitForSelector(T('dish-reveal')) }
    if (t.id === 'goi-mon' && await page.$(T('mau-order-again'))) { await page.click(T('mau-order-again')); await page.waitForSelector(T('speech-bubble')) }
    await page.waitForTimeout(400)
    const r = await infinite()
    assert.equal(r.n, 0, `${label} ${t.id}: còn hoạt ảnh vô hạn khi giảm chuyển động: ${r.names.join(', ')}`)
    assert.equal(r.particles, 0, `${label} ${t.id}: vfx còn hạt khi giảm chuyển động`)
  }
  // dấu Hoàn hảo khi giảm chuyển động: không hạt, không chuyển động vô hạn
  await openTab(g, 'thai')
  await page.click(T('mau-stamp-hoan_hao'))
  await page.waitForSelector('.g-stamp.grade-hoan_hao')
  await page.waitForTimeout(400)
  const r = await infinite()
  assert.equal(r.n, 0, label + ' con dấu: còn hoạt ảnh vô hạn')
  assert.equal(r.particles, 0, label + ' con dấu: còn hạt')
  // tắt lại
  await page.click(T('mau-settings'))
  await page.click(T('mau-sw-reduce'))
  await page.click(T('mau-settings-close'))
}

// ---------- Khung thấp ----------
async function lowFlow(g, label) {
  const { page } = g
  await page.click(T('mau-settings'))
  await page.click(T('mau-sw-low'))
  await page.click(T('mau-settings-close'))
  await openTab(g, 'thai')
  await page.waitForSelector(T('step-hint'), { state: 'visible' })
  const h = await page.$eval(T('mau-kitchen'), e => e.getBoundingClientRect().height)
  assert.ok(h <= LOW_PANEL_PX + 1 && h >= 200, `${label}: khung thấp cao ${h}`)
  await settle(page, 500)
  await assertAudit(g, label + ' khung thấp thẻ bước')
  await assertReach(g, [T('step-card-go')], label + ' khung thấp')
  await page.click(T('step-card-go'))
  await page.waitForSelector(T('thai-board'), { state: 'visible' })
  await settle(page, 300)
  await assertReach(g, [T('thai-done')], label + ' khung thấp sân khấu')
  await openTab(g, 'ra-mon')
  await page.waitForSelector(T('dish-reveal'))
  await page.click(T('mau-settings'))
  await page.click(T('mau-sw-low'))
  await page.click(T('mau-settings-close'))
}

for (const vp of VIEWPORTS) {
  test(`Phòng mẫu ${vpName(vp)}${vp.basePath ? ' dưới ' + vp.basePath + '/' : ''}: 4 thẻ, luồng gọi món, Thái, ra món, giảm chuyển động`, { timeout: 240000 }, async () => {
    const g = await openMau(vp)
    const label = vpName(vp)
    try {
      const { page } = g
      // font tiêu đề tự lưu (kể cả phần tiếng Việt)
      const font = await page.evaluate(async () => {
        await document.fonts.load('800 20px "Baloo 2"', 'Phòng mẫu Ắ')
        await document.fonts.ready
        return document.fonts.check('800 20px "Baloo 2"')
      })
      assert.equal(font, true, label + ': font Baloo 2 chưa nạp')
      assert.equal(await page.title(), 'Bếp Khởi Nghiệp – Phòng mẫu')
      // không đăng ký service worker
      assert.equal(await page.evaluate(async () => (navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0)), 0)
      await artFlow(g, label)
      await orderFlow(g, label)
      await thaiFlow(g, label)
      await revealFlow(g, label)
      if (vp.low) await lowFlow(g, label)
      await reducedFlow(g, label)
      await vfxOk(page, label + ' cuối')
      // không ghi bản lưu của game
      const saved = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('bkn.')))
      assert.deepEqual(saved, [], label + ': phòng mẫu không được ghi localStorage của game')
      assert.deepEqual(g.stray, [], label + ': yêu cầu trượt khỏi đường dẫn con hoặc lỗi')
      assert.deepEqual(g.errors, [], label + ': có lỗi console / trang / mạng')
    } finally {
      await g.close()
    }
  })
}
