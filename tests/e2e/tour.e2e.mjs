// E2E hướng dẫn lần đầu (tour) và nút "?" (bản 0.4.1). Mở bằng ?tour=1 trên máy chủ cục bộ: khi trình duyệt do kiểm thử tự
// động điều khiển (navigator.webdriver), tour chỉ tự hiện khi có tham số này — các e2e khác không bị tour chặn.
// Chromium mô phỏng iPhone (UA iPhone, isMobile, hasTouch) ở 375×553 (iPhone SE + thanh Safari) và 390×844:
//  1. Save mới: tour màn mở đầu tự hiện → "Tiếp" hết → tải lại trang không hiện lại; tour màn Chuẩn bị (sau bảng điểm danh);
//     vào ca → tour Quầy khâu Order tự hiện, ca TẠM DỪNG (giờ ca, kiên nhẫn khách đứng yên, save có shift.paused) →
//     "Bỏ qua hướng dẫn" → ca chạy tiếp; nút "?" trên HUD → bảng Hướng dẫn (ca dừng) → "Xem lại hướng dẫn màn này" → tour
//     Order hiện lại; "Cách chơi" mở được. Mọi bước: bong bóng nằm trọn trong khung (và lớp phủ), nút "Tiếp" không bị che,
//     vùng chạm ≥ 44px, vùng sáng ôm đúng phần nhìn thấy của phần tử đích (so khung bao).
//  2. Bàn phím (Esc bỏ qua, → sang bước), công tắc "Hướng dẫn lần đầu" trong Cài đặt, "Xem lại tất cả hướng dẫn từ đầu"
//     (xác nhận trong trang) → tour màn đang mở hiện lại.
//  3. Tour không chen vào giữa mini-game: bước Chiên trứng đang chơi dở thì tour Thớt chờ, bước xong mới hiện.
//  4. Tour bước Chọn: đồng hồ kệ đứng yên khi tour hiện.
//  5. Tour phiếu chấm tự hiện đủ bước (Phiếu chấm, Lỗi tại quầy/bếp, Tip) — không hiện lúc phiếu còn đang trượt lên.
//  6. Thẻ Mẹo nghề mở ngay trước một tour (đọc lại đơn → chốt → tour Thanh toán) không bị tour "nuốt": giữ trong lúc tour
//     hiện, tour đóng thì nổi lên ≥ 1 giây.
//  8. Đích của bước đúng chỗ: chạm phiếu trên dây ở đầu màn (mở thẳng phiếu trong Bếp) → tour Dây phiếu và Dòng món nối tiếp,
//     bước "Làm món này" khoét sáng nút bắt đầu làm; tour Thớt: bước "Chọn cách sơ chế" chỉ vào bước có chọn cách (Thái dưa
//     leo); Việc hôm nay: bước "Nhận thưởng" chỉ vào nút Nhận đang bật.
//  7. Nút "?" luôn bấm được: màn Chuẩn bị và Tổng kết cuộn tới đáy (sau khi tour tự cuộn xuống) vẫn thấy "?" ở đầu màn; HUD,
//     đầu màn con, Chuẩn bị, Tổng kết chừa vùng an toàn trên (mô phỏng tai thỏ 47px).
//  9. M5 (0.5.0) tour trên thẻ vào bước "Bước k/N" của 5 thao tác mới (bep_dap, bep_xoay, bep_got, bep_lac, bep_bay; chỗ
//     'card-<loại>'): món chưa nấu lần nào → chạm bước trên Thớt → thẻ đầy đủ hiện, tour tự hiện ngay trên thẻ (bước 1 khoét
//     sáng tay mẫu step-card-demo, bước 2 nút step-card-go), ca TẠM DỪNG và thẻ đứng chờ (không tự vào trò dù quá 1,1 giây);
//     "Bỏ qua hướng dẫn" → tour ghi đã xem, ca chạy tiếp, thẻ chạy tiếp phần thời gian còn lại rồi tự vào trò, chơi tiếp được.
// Không có lỗi console ở mọi kịch bản.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, seedSave, readSave, waitSave, resolveIncidentIfShown, cookShiftSave, COOK_OPEN_MS, playStage } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { newRecipeProgress } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { startShift, advance, isShiftOver } from '../../src/core/shift.js'
import { startCook, submitChon, submitStep, beginStep } from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { markSeen } from '../../src/core/tour.js'
import { counterStep, cookTicket } from '../helpers/perfect-player.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'
import { playedSave, tipShiftSave, TIP_AT } from '../helpers/m4-saves.mjs'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const VIEWPORTS = [{ width: 375, height: 553 }, { width: 390, height: 844 }]
const vpName = vp => `${vp.width}×${vp.height}`
const PAD = 6   // vùng sáng rộng hơn phần tử đích (HOLE_PAD của ui/components/tour.js)

function openIphone(vp, name) {
  return openGame({ viewport: vp, name: 'tour-' + name, contextOptions: { userAgent: UA, deviceScaleFactor: 3, isMobile: true, hasTouch: true } })
}

// Đo trong trang: bong bóng, vùng sáng, phần nhìn thấy của phần tử đích (tìm giống cách game tìm), nút "Tiếp".
function measureTour() {
  const layer = document.querySelector('[data-testid="tour"]')
  if (!layer) return null
  const bubble = layer.querySelector('[data-testid="tour-bubble"]')
  const hole = layer.querySelector('[data-testid="tour-hole"]')
  const R = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom } }
  const sel = t => (/[^A-Za-z0-9_-]/.test(t) ? t : `[data-testid="${t}"]`)
  const shown = el => {
    if (!el.getClientRects().length) return false
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0
  }
  const find = list => {
    for (const t of list) {
      if (!t) continue
      for (const n of document.querySelectorAll(sel(t))) if (!n.closest('.tour-layer') && shown(n)) return n
    }
    return null
  }
  const tgt = bubble.dataset.target ? find(bubble.dataset.target.split('|')) : null
  const span = bubble.dataset.span ? find([bubble.dataset.span]) : null
  let vis = null
  if (tgt) {
    let r = R(tgt)
    if (span) { const q = R(span); r = { l: Math.min(r.l, q.l), t: Math.min(r.t, q.t), r: Math.max(r.r, q.r), b: Math.max(r.b, q.b) } }
    for (let n = tgt.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const q = R(n)
        r = { l: Math.max(r.l, q.l), t: Math.max(r.t, q.t), r: Math.min(r.r, q.r), b: Math.min(r.b, q.b) }
      }
    }
    vis = r
  }
  const next = layer.querySelector('[data-testid="tour-next"]')
  const skip = layer.querySelector('[data-testid="tour-skip"]')
  const nr = next.getBoundingClientRect()
  const hit = document.elementFromPoint(nr.left + nr.width / 2, nr.top + nr.height / 2)
  const size = e => { const r = e.getBoundingClientRect(); return [r.width, r.height] }
  return {
    tour: layer.dataset.tour, count: (layer.querySelector('[data-testid="tour-count"]') || {}).textContent || '',
    title: (layer.querySelector('[data-testid="tour-title"]') || {}).textContent || '',
    text: (layer.querySelector('[data-testid="tour-text"]') || {}).textContent || '',
    target: bubble.dataset.target, bubble: R(bubble), hole: hole.hidden ? null : R(hole), vis, layer: R(layer),
    safe: [parseFloat(getComputedStyle(layer).paddingTop) || 0, parseFloat(getComputedStyle(layer).paddingBottom) || 0],
    vw: innerWidth, vh: innerHeight, nextHit: !!hit && (hit === next || next.contains(hit)),
    nextSize: size(next), skipSize: size(skip), role: bubble.getAttribute('role'), modal: bubble.getAttribute('aria-modal'),
    textSize: parseFloat(getComputedStyle(layer.querySelector('[data-testid="tour-text"]')).fontSize)
  }
}

function checkMeasure(m, label) {
  const L = m.layer
  const B = m.bubble
  const eps = 0.75
  assert.ok(B.l >= L.l - eps && B.r <= L.r + eps && B.t >= L.t - eps && B.b <= L.b + eps, `${label}: bong bóng tràn lớp phủ ${JSON.stringify(B)}`)
  assert.ok(B.t >= L.t + m.safe[0] - eps && B.b <= L.b - m.safe[1] + eps, `${label}: bong bóng lấn vùng an toàn (tai thỏ, thanh Home)`)
  assert.ok(B.l >= -eps && B.r <= m.vw + eps && B.t >= -eps && B.b <= m.vh + eps, `${label}: bong bóng ra ngoài khung nhìn`)
  assert.ok(m.nextHit, `${label}: nút Tiếp bị che`)
  for (const [w, h] of [m.nextSize, m.skipSize]) assert.ok(w >= 43.5 && h >= 43.5, `${label}: nút nhỏ hơn 44px (${w}×${h})`)
  assert.ok(m.textSize >= 14, `${label}: chữ nhỏ hơn 14px`)
  assert.equal(m.role, 'dialog')
  assert.equal(m.modal, 'true')
  assert.match(m.count, /^\d+\/\d+$/)
  if (!m.target) { assert.equal(m.hole, null, `${label}: bước không có phần tử đích mà vẫn khoét sáng`); return }
  assert.ok(m.vis && m.hole, `${label}: không khoét sáng phần tử đích ${m.target}`)
  const cx = v => Math.max(L.l, Math.min(L.r, v))
  const cy = v => Math.max(L.t, Math.min(L.b, v))
  const want = { l: cx(m.vis.l - PAD), t: cy(m.vis.t - PAD), r: cx(m.vis.r + PAD), b: cy(m.vis.b + PAD) }
  for (const k of ['l', 't', 'r', 'b']) assert.ok(Math.abs(m.hole[k] - want[k]) <= 1.5, `${label}: vùng sáng lệch (${k}: ${m.hole[k]} ≠ ${want[k]}, ${m.target})`)
  assert.ok(m.vis.b - m.vis.t >= 8 && m.vis.r - m.vis.l >= 8, `${label}: phần tử đích gần như khuất (${m.target})`)
}

// Chờ bong bóng và vùng sáng đứng yên (hết hiệu ứng trượt).
async function stable(page) {
  let prev = ''
  for (let i = 0; i < 30; i++) {
    const cur = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="tour-bubble"]')
      const h = document.querySelector('[data-testid="tour-hole"]')
      if (!b) return 'x'
      const f = e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(v => Math.round(v * 2)).join(',') }
      return f(b) + '|' + (h && !h.hidden ? f(h) : '')
    })
    if (cur === prev) return
    prev = cur
    await page.waitForTimeout(90)
  }
}

const tourSel = id => `${T('tour')}[data-tour~="${id}"]`
async function countText(page) {
  return page.evaluate(() => { const l = document.querySelector('[data-testid="tour"]'); return l ? l.querySelector('[data-testid="tour-count"]').textContent + l.dataset.tour : '' })
}
async function waitChange(page, before) {
  for (let k = 0; k < 60; k++) {
    if ((await countText(page)) !== before) return
    await page.waitForTimeout(50)
  }
  throw new Error('bấm Tiếp mà tour không đổi bước')
}

// Đi hết tour `id` bằng nút "Tiếp" (chạm), đo từng bước. Trả danh sách số đo.
async function walkTour(g, id, label, { timeout = 15000 } = {}) {
  const { page } = g
  await page.waitForSelector(tourSel(id), { timeout })
  const out = []
  for (let i = 0; i < 14 && (await page.$(T('tour'))); i++) {
    await stable(page)
    const m = await page.evaluate(measureTour)
    if (!m) break
    checkMeasure(m, `${label} ${id} ${m.count}`)
    out.push(m)
    if (i === 0) await g.shot(id)
    const before = await countText(page)
    await page.tap(T('tour-next'))
    await waitChange(page, before)
  }
  const n = Number((out[0] || { count: '0/0' }).count.split('/')[1])
  assert.equal(out.length, n, `${label} ${id}: số bước đã đi khác số bước ghi trên bong bóng`)
  assert.equal(out[out.length - 1].count, `${n}/${n}`)
  return out
}

const shiftT = page => page.getAttribute(T('screen-service'), 'data-t').then(Number)

test('tour lần đầu: màn mở đầu, Chuẩn bị, Quầy (ca tạm dừng, Bỏ qua, nút "?" xem lại, Cách chơi) ở 375×553 và 390×844', { timeout: 360000 }, async () => {
  for (const vp of VIEWPORTS) {
    const g = await openIphone(vp, 'lan-dau')
    const { page, errors } = g
    const label = vpName(vp)
    try {
      // 1) save mới → tour màn mở đầu tự hiện
      await page.goto(g.url('/?seed=42&test=1&tour=1'))
      const first = await walkTour(g, 'mo_dau', label)
      assert.equal(first[0].title, DATA.TOURS.mo_dau.steps[0].title)
      await page.waitForSelector(T('tour'), { state: 'detached' })
      const s1 = await waitSave(page, s => s.tour && s.tour.seen.mo_dau === true)
      assert.equal(s1.shopName, '', 'chưa đặt tên xe')
      // tải lại: vẫn màn đặt tên xe nhưng tour không hiện lại
      await page.reload()
      await page.waitForSelector(T('shop-name-input'))
      await page.waitForTimeout(1500)
      assert.ok(!(await page.$(T('tour'))), `${label}: tour màn mở đầu hiện lại sau khi tải lại trang`)

      // 2) đặt tên → bảng điểm danh tự bật trước, tour màn Chuẩn bị chờ bảng đóng rồi mới hiện
      await page.fill(T('shop-name-input'), 'Xe Hướng Dẫn')
      await page.tap(T('start-button'))
      await page.waitForSelector(T('checkin-claim'))
      assert.ok(!(await page.$(T('tour'))), 'tour chồng lên bảng điểm danh')
      await page.tap(T('checkin-claim'))
      await page.waitForSelector(T('checkin-popup'), { state: 'detached' })
      const prep = await walkTour(g, 'chuan_bi', label)
      assert.ok(prep.some(m => m.target === 'help-button'), 'tour màn Chuẩn bị giới thiệu nút "?"')
      await waitSave(page, s => s.tour.seen.chuan_bi === true)

      // 3) vào ca → tour Quầy khâu Order tự hiện, ca tạm dừng
      await page.tap(T('open-shift'))
      await page.waitForSelector(tourSel('quay_order'), { timeout: 60000 })
      await stable(page)
      checkMeasure(await page.evaluate(measureTour), `${label} quay_order 1`)
      const t0 = await shiftT(page)
      const before = await waitSave(page, s => s.shift && s.shift.paused === true)
      const pat0 = Object.values(before.shift.customers).filter(c => c.status === 'xep_hang').map(c => [c.id, c.patience])
      await page.waitForTimeout(1500)
      assert.equal(await shiftT(page), t0, `${label}: tour đang hiện mà giờ ca vẫn chạy`)
      const mid = await readSave(page)
      for (const [id, p] of pat0) assert.equal(mid.shift.customers[id].patience, p, 'kiên nhẫn khách giảm trong lúc tour hiện')
      assert.ok(!(await page.$(`${T('screen-service')} .tour-layer`)), 'lớp tour phải nằm ở lớp nổi gốc, ngoài màn ca bán')
      assert.ok(await page.$(`.overlay-root > .tour-layer`), 'lớp tour nằm ở lớp nổi gốc (trên thanh tab)')
      // Bỏ qua hướng dẫn → ca chạy tiếp, tour ghi đã xem
      await page.tap(T('tour-skip'))
      await page.waitForSelector(T('tour'), { state: 'detached' })
      await waitSave(page, s => s.tour.seen.quay_order === true && s.shift && s.shift.paused === false)
      const t1 = await shiftT(page)
      await page.waitForTimeout(1200)
      assert.ok(await shiftT(page) > t1, `${label}: bỏ qua hướng dẫn mà ca không chạy tiếp`)

      // 4) nút "?" trên HUD → bảng Hướng dẫn (ca dừng) → Xem lại hướng dẫn màn này → tour Order hiện lại
      const hb = await page.evaluate(() => { const r = document.querySelector('.hud [data-testid="help-button"]').getBoundingClientRect(); return [r.width, r.height] })
      assert.ok(hb[0] >= 43.5 && hb[1] >= 43.5, 'nút "?" nhỏ hơn 44px')
      assert.equal(await page.getAttribute(`.hud ${T('help-button')}`, 'aria-label'), 'Hướng dẫn')
      await page.tap(`.hud ${T('help-button')}`)
      await page.waitForSelector(T('help-sheet'))
      await page.waitForTimeout(300)
      const h0 = await shiftT(page)
      await page.waitForTimeout(1000)
      assert.equal(await shiftT(page), h0, `${label}: bảng Hướng dẫn mở mà ca vẫn chạy`)
      assert.match(await page.textContent(T('help-replay')), /Quầy · Order/)
      await page.tap(T('help-replay'))
      const again = await walkTour(g, 'quay_order', label)
      assert.equal(again.length, DATA.TOURS.quay_order.steps.length, 'xem lại đủ các bước của tour Order')
      // Cách chơi
      await page.tap(`.hud ${T('help-button')}`)
      await page.tap(T('help-how'))
      await page.waitForSelector(T('how-to-play'))
      assert.equal(await page.$$eval('[data-testid^="how-card-"]', els => els.length), DATA.HOW_TO_PLAY.length)
      assert.match(await page.textContent(T('how-to-play')), /Order.*Thanh toán.*Tính tiền.*Làm đồ/s)
      await g.shot('cach-choi')
      await page.tap(T('help-close'))
      await page.waitForSelector(T('help-sheet'), { state: 'detached' })
      const tz = await shiftT(page)
      await page.waitForTimeout(800)
      assert.ok(await shiftT(page) > tz, 'đóng bảng Hướng dẫn mà ca không chạy tiếp')
      assert.deepEqual(errors, [], `${label}: có lỗi console/trang`)
    } finally {
      await g.close()
    }
  }
})

test('tour: bàn phím, công tắc "Hướng dẫn lần đầu" trong Cài đặt, xem lại tất cả từ đầu (xác nhận trong trang)', { timeout: 180000 }, async () => {
  const g = await openIphone({ width: 390, height: 844 }, 'cai-dat')
  const { page, errors } = g
  try {
    await page.goto(g.url('/?seed=7&tour=1'))
    await page.waitForSelector(tourSel('mo_dau'))
    // tiêu điểm ở nút "Tiếp"; → sang bước kế; Tab đi vòng trong bong bóng; Esc = bỏ qua
    await page.waitForFunction(() => document.activeElement && document.activeElement.dataset.testid === 'tour-next')
    await page.keyboard.press('ArrowRight')
    await page.waitForFunction(() => document.querySelector('[data-testid="tour-count"]').textContent === '2/4')
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement.dataset.testid), 'tour-skip')
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement.dataset.testid), 'tour-next')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('[data-testid="tour-count"]').textContent === '3/4')
    await page.keyboard.press('Escape')
    await page.waitForSelector(T('tour'), { state: 'detached' })
    await waitSave(page, s => s.tour.seen.mo_dau === true)
    await page.fill(T('shop-name-input'), 'Xe Bàn Phím')
    await page.tap(T('start-button'))
    await page.tap(T('checkin-claim'))
    await page.waitForSelector(tourSel('chuan_bi'))
    await page.tap(T('tour-skip'))
    await waitSave(page, s => s.tour.seen.chuan_bi === true)

    // Cài đặt: tắt rồi bật lại tự hiện
    await page.tap(T('open-settings'))
    await page.waitForSelector(T('setting-tour'))
    assert.equal(await page.isChecked(T('setting-tour')), true)
    await page.tap(T('setting-tour'))
    await waitSave(page, s => s.tour.disabled === true)
    await page.tap(T('setting-tour'))
    await waitSave(page, s => s.tour.disabled === false)
    await page.tap(T('setting-tour'))
    await waitSave(page, s => s.tour.disabled === true)
    await page.tap(T('meta-back'))
    await page.waitForSelector(T('screen-prep'))

    // Xem lại tất cả từ đầu: xác nhận ngay trong bảng (Thôi không đổi gì), xác nhận → bật lại tự hiện, tour màn này hiện lại
    await page.tap(T('help-button'))
    await page.tap(T('help-reset'))
    await page.waitForSelector(T('help-reset-confirm'))
    await page.tap(T('help-reset-cancel'))
    await page.waitForSelector(T('help-replay'))
    let s = await readSave(page)
    assert.equal(s.tour.seen.chuan_bi, true, 'bấm Thôi mà vẫn đặt lại')
    await page.tap(T('help-reset'))
    await page.tap(T('help-reset-confirm'))
    await page.waitForSelector(T('help-reset-done'))
    s = await waitSave(page, x => Object.keys(x.tour.seen).length === 0 && x.tour.disabled === false)
    await walkTour(g, 'chuan_bi', '390×844')
    // màn con có tour: lần đầu ghé thì tự hiện, đầu màn có nút "?"
    await page.tap(T('open-shop'))
    await page.waitForSelector(tourSel('cho_cong_thuc'))
    await page.tap(T('tour-skip'))
    assert.ok(await page.$(`.meta-head ${T('help-button')}`), 'màn Chợ Công Thức thiếu nút "?"')
    await page.tap(T('meta-back'))
    await page.waitForSelector(T('screen-prep'))
    await page.waitForTimeout(800)
    assert.ok(!(await page.$(T('tour'))), 'tour đã xem lại hiện thêm lần nữa')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

// Ca ngày 5 dựng sẵn: khách đầu gọi 1 Bánh mì ốp la, phiếu đã kẹp, đã chọn nguyên liệu, đã Rửa dưa leo và Đập trứng;
// bước Chiên trứng (canh lửa) đang mở dở → mở tab Bếp là chơi lại bước này. Mọi tour đã xem trừ tour Thớt.
function kitchenSave() {
  const { state } = playedSave(3, 4, { name: 'Xe Bếp Tour', freq: 'it' })
  state.recipes.banh_mi_op_la = { ...(state.recipes.banh_mi_op_la || newRecipeProgress(0)), cooks: 5 }
  const ctx = makeMetaCtx({ at: '2026-09-30T09:00', attach: true })
  ctx.setState(state)
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  const sh = startShift(state, ctx)
  sh.customers[sh.plan[0].customerId].request = [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }]
  for (let guard = 0; !sh.tickets.length; guard++) {
    if (guard > 20000) throw new Error('không kẹp được phiếu')
    if (!counterStep(state, ctx)) advance(state, 0.5, ctx)
  }
  const ticket = sh.tickets[0]
  const cook = startCook(state, ticket.id, 0, ctx)
  if (!submitChon(state, requiredIngredients(DATA.RECIPES.banh_mi_op_la, cook.notes).required, 0, ctx).ok) throw new Error('chọn bị chặn')
  for (const id of ['rua_dua', 'dap_trung']) submitStep(state, id, { score: 100 }, ctx)
  if (!beginStep(state, 'chien_trung')) throw new Error('không mở được bước Chiên trứng')
  markSeen(state, Object.keys(DATA.TOURS).filter(id => id !== 'bep_thot'))
  return state
}

test('tour không chen vào giữa mini-game: bước đang chơi xong mới hiện tour Thớt sơ chế', { timeout: 120000 }, async () => {
  const g = await openIphone({ width: 375, height: 553 }, 'mini-game')
  const { page, errors } = g
  try {
    await seedSave(page, kitchenSave())
    await page.goto(g.url('/?devNow=2026-09-30T09:02&tour=1'))
    await page.waitForSelector(T('screen-service'))
    await resolveIncidentIfShown(g, { waitMs: 300 })
    await page.tap(T('tab-kitchen'))
    await page.waitForSelector(`${T('minigame-stage')}[data-type="lua"] ${T('lua-lift')}`)
    await page.waitForTimeout(1200)
    assert.ok(!(await page.$(T('tour'))), 'tour chen vào giữa mini-game')
    await page.tap(T('lua-lift'))
    // nhấc sớm → bước chí mạng hỏng → hộp hỏi lại (lớp nổi của bếp): tour vẫn chờ
    const prompt = await page.waitForSelector(T('critical-prompt'), { timeout: 4000 }).catch(() => null)
    if (prompt) {
      await page.waitForTimeout(600)
      assert.ok(!(await page.$(T('tour'))), 'tour chồng lên hộp hỏi lại của bếp')
      await page.tap(T('prompt-close'))
    }
    await page.waitForSelector(T('board'))
    const steps = await walkTour(g, 'bep_thot', '375×553')
    assert.ok(steps.some(m => m.target === 'finish-dish'))
    await waitSave(page, s => s.tour.seen.bep_thot === true && s.shift && s.shift.paused === false)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

// Ca ngày 5 dựng sẵn: phiếu 1 Trà tắc đã kẹp, chưa nấu. Mọi tour đã xem trừ tour bước Chọn nguyên liệu.
function chonSave() {
  const { state } = playedSave(3, 4, { name: 'Xe Kệ Tour', freq: 'it' })
  const ctx = makeMetaCtx({ at: '2026-09-30T09:00', attach: true })
  ctx.setState(state)
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  const sh = startShift(state, ctx)
  sh.customers[sh.plan[0].customerId].request = [{ recipeId: 'tra_tac', qty: 1, notes: [] }]
  for (let guard = 0; !sh.tickets.length; guard++) {
    if (guard > 20000) throw new Error('không kẹp được phiếu')
    if (!counterStep(state, ctx)) advance(state, 0.5, ctx)
  }
  markSeen(state, Object.keys(DATA.TOURS).filter(id => id !== 'bep_chon'))
  return { state, ticket: sh.tickets[0] }
}

test('tour bước Chọn nguyên liệu: đồng hồ của kệ đứng yên khi tour đang hiện (không bị tính quá giờ)', { timeout: 120000 }, async () => {
  const g = await openIphone({ width: 390, height: 844 }, 'ke-chon')
  const { page, errors } = g
  try {
    const { state, ticket } = chonSave()
    await seedSave(page, state)
    await page.goto(g.url('/?devNow=2026-09-30T09:02&tour=1'))
    await page.waitForSelector(T('screen-service'))
    await resolveIncidentIfShown(g, { waitMs: 300 })
    await page.tap(T('tab-kitchen'))
    await page.tap(T('ticket-' + ticket.id))
    await page.tap(T('cook-line-0'))
    await page.waitForSelector(tourSel('bep_chon'))
    // giới hạn bước Chọn của Trà tắc: 2,5 × par = 12,5 giây; tour hiện lâu hơn vẫn không tính quá giờ, không nhấp nháy gợi ý
    const limit = 2.5 * DATA.RECIPES.tra_tac.steps.find(s => s.type === 'chon').par
    await page.waitForTimeout((limit + 1.5) * 1000)
    assert.ok(!(await page.$('.chon-cell.is-hint')), 'kệ nhấp nháy gợi ý quá giờ trong lúc tour hiện')
    const mid = await readSave(page)
    assert.ok(!(mid.shift.cook.chonDraft && mid.shift.cook.chonDraft.overtime), 'bị ghi quá giờ trong lúc tour hiện')
    await page.tap(T('tour-skip'))
    await page.waitForSelector(T('tour'), { state: 'detached' })
    for (const id of requiredIngredients(DATA.RECIPES.tra_tac, []).required) await page.tap(T('shelf-' + id))
    await page.tap(T('chon-done'))
    await page.waitForSelector(T('board'))
    const after = await waitSave(page, s => s.shift && s.shift.cook && s.shift.cook.steps && s.shift.cook.steps.chon)
    assert.equal(after.shift.cook.steps.chon.score, 100, 'bước Chọn bị trừ điểm vì thời gian đọc hướng dẫn')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('tour phiếu chấm tự hiện đủ bước: Phiếu chấm, Lỗi tại quầy/bếp, Tip (không hiện lúc phiếu còn đang trượt lên)', { timeout: 120000 }, async () => {
  const g = await openIphone({ width: 375, height: 553 }, 'phieu-cham')
  const { page, errors } = g
  try {
    const { state, tickets } = tipShiftSave(4)
    markSeen(state, Object.keys(DATA.TOURS).filter(id => id !== 'phieu_cham'))
    await seedSave(page, state)
    // ghi độ mờ của phiếu chấm lúc lớp tour vừa gắn vào
    await page.addInitScript(() => {
      window.__sheetAtTour = null
      new MutationObserver(muts => {
        for (const m of muts) for (const n of m.addedNodes) {
          if (n.nodeType !== 1 || !n.matches('[data-testid="tour"]') || window.__sheetAtTour) continue
          const sh = document.querySelector('[data-testid="score-sheet"]')
          window.__sheetAtTour = sh ? Number(getComputedStyle(sh).opacity) : -1
        }
      }).observe(document, { childList: true, subtree: true })
    })
    await page.goto(g.url(`/?devNow=${TIP_AT}&tour=1`))
    await page.waitForSelector(T('screen-service'))
    await resolveIncidentIfShown(g, { waitMs: 600 })
    await page.tap(T('tab-kitchen'))
    const sel = `${T('serve-ticket')}[data-ticket-id="${tickets[0].ticketId}"]`
    await page.waitForSelector(sel)
    await page.tap(sel)
    await page.waitForSelector(T('score-sheet'))
    const steps = await walkTour(g, 'phieu_cham', '375×553')
    assert.ok(await page.evaluate(() => window.__sheetAtTour) >= 0.9, 'tour bắt đầu lúc phiếu chấm còn trong suốt')
    const want = DATA.TOURS.phieu_cham.steps.map(x => x.title)
    assert.deepEqual(steps.map(m => m.title), want, 'tour phiếu chấm tự hiện thiếu bước')
    assert.ok(steps.some(m => m.title === 'Tip' && /5\.000đ/.test(m.text) && /20\.000đ/.test(m.text)), 'thiếu bước Tip (5.000đ, hóa đơn từ 20.000đ)')
    await waitSave(page, s => s.tour.seen.phieu_cham === true)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('thẻ Mẹo nghề mở ngay trước tour không bị tour nuốt: tour đóng thì thẻ nổi lên ≥ 1 giây', { timeout: 180000 }, async () => {
  const g = await openIphone({ width: 390, height: 844 }, 'meo-nghe')
  const { page, errors } = g
  try {
    // đo thời gian mỗi thẻ Mẹo nghề thật sự nhìn thấy được (không bị ẩn, đã hiện rõ)
    await page.addInitScript(() => {
      window.__tipCards = []
      const seen = new Map()
      let last = performance.now()
      setInterval(() => {
        const now = performance.now()
        const dt = now - last
        last = now
        const touring = !!document.querySelector('[data-testid="tour"]')
        for (const c of document.querySelectorAll('[data-testid="tip-card"]')) {
          let rec = seen.get(c)
          if (!rec) {
            rec = { title: (c.querySelector('.toast-title') || {}).textContent || '', visibleMs: 0, touringMs: 0 }
            seen.set(c, rec)
            window.__tipCards.push(rec)
          }
          const cs = getComputedStyle(c)
          if (cs.visibility !== 'hidden' && Number(cs.opacity) > 0.5) rec.visibleMs += dt
          if (touring) rec.touringMs += dt
        }
      }, 40)
    })
    await page.goto(g.url('/?seed=42&test=1&tour=1'))
    await page.waitForSelector(tourSel('mo_dau'))
    await page.tap(T('tour-skip'))
    await page.fill(T('shop-name-input'), 'Xe Mẹo Nghề')
    await page.tap(T('start-button'))
    await page.tap(T('checkin-claim'))
    await page.waitForSelector(tourSel('chuan_bi'))
    await page.tap(T('tour-skip'))
    await page.tap(T('open-shift'))
    await page.waitForSelector(tourSel('quay_order'), { timeout: 60000 })
    await page.tap(T('tour-skip'))
    await page.waitForSelector(T('tour'), { state: 'detached' })
    const request = JSON.parse(await page.getAttribute(T('speech-bubble'), 'data-request'))
    for (const line of request) {
      await page.tap(T('menu-item-' + line.recipeId))
      const tour = await page.waitForSelector(tourSel('quay_bang_mon'), { timeout: 1500 }).catch(() => null)
      if (tour) { await page.tap(T('tour-skip')); await page.waitForSelector(T('tour'), { state: 'detached' }) }
      for (const n of line.notes || []) await page.tap(T('note-chip-' + n))
      for (let q = 1; q < line.qty; q++) await page.tap(T('qty-plus'))
      await page.tap(T('add-line'))
      await page.waitForSelector(T('order-sheet'), { state: 'detached' })
    }
    // đọc lại đơn → thẻ "Đọc lại order" mở; chốt ngay → tour Thanh toán tự hiện ở khung hình kế
    await page.tap(T('readback'))
    await page.waitForSelector(`${T('confirm-order')}:not([disabled])`)
    await page.tap(T('confirm-order'))
    await page.waitForSelector(tourSel('quay_thanh_toan'))
    // người mới đọc hướng dẫn vài giây: lâu hơn thời gian nổi của thẻ (3 giây)
    await page.waitForTimeout(3500)
    let cards = await page.evaluate(() => window.__tipCards)
    assert.ok(cards.length >= 1, 'chưa có thẻ Mẹo nghề nào sau khi đọc lại đơn')
    assert.ok(cards[0].visibleMs < 400, `thẻ Mẹo nghề nổi lên trong lúc tour hiện (${Math.round(cards[0].visibleMs)}ms)`)
    assert.ok(await page.$(T('tip-card')), 'thẻ Mẹo nghề hết giờ trong lúc tour hiện (người chơi không kịp thấy)')
    await page.tap(T('tour-skip'))
    await page.waitForSelector(T('tour'), { state: 'detached' })
    await page.waitForTimeout(1500)
    cards = await page.evaluate(() => window.__tipCards)
    assert.match(cards[0].title, /Đọc lại order/)
    assert.ok(cards[0].visibleMs >= 1000, `thẻ Mẹo nghề đầu tiên chỉ hiện ${Math.round(cards[0].visibleMs)}ms`)
    const vis = await page.evaluate(() => { const c = document.querySelector('[data-testid="tip-card"]'); return c ? getComputedStyle(c).visibility : 'gone' })
    assert.ok(vis === 'visible' || vis === 'gone', 'thẻ Mẹo nghề vẫn bị ẩn sau khi tour đóng')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

// Ca ngày 5 đã phục vụ hết khách nhưng chưa kết ca: mở màn ca bán là tự sang Tổng kết. Mọi tour đã xem.
function shiftDoneSave() {
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
  markSeen(state, Object.keys(DATA.TOURS))
  return state
}

const SAFE_TOP = 47
// nút "?" đang hiện trong khung, dưới vùng an toàn trên, tâm và mép trên/dưới chạm trúng
function helpHit(page, scope) {
  return page.evaluate(([scope, safeTop]) => {
    const b = document.querySelector(`${scope} [data-testid="help-button"]`)
    if (!b) return { ok: false, why: 'không có nút' }
    const r = b.getBoundingClientRect()
    const hit = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && b.contains(e) }
    const cx = r.left + r.width / 2
    const ok = r.top >= safeTop - 0.5 && r.bottom <= innerHeight && hit(cx, r.top + r.height / 2) && hit(cx, r.top + 4) && hit(cx, r.bottom - 4)
    const at = document.elementFromPoint(cx, r.top + r.height / 2)
    return { ok, rect: [r.left, r.top, r.right, r.bottom].map(Math.round), at: at ? (at.closest('[data-testid]') || at).getAttribute('data-testid') || at.className : null }
  }, [scope, SAFE_TOP])
}
async function scrollScreenToEnd(page) {
  return page.evaluate(() => { const s = document.getElementById('screen'); s.scrollTop = s.scrollHeight; return s.scrollTop })
}

test('nút "?" luôn bấm được: Chuẩn bị và Tổng kết cuộn tới đáy, HUD và đầu màn con chừa vùng an toàn trên', { timeout: 180000 }, async () => {
  const vp = { width: 375, height: 553 }
  // mô phỏng chạy toàn màn hình có tai thỏ (biến --safe-top của base.css), ẩn dải Giờ giả như máy người chơi
  const css = `:root { --safe-top: ${SAFE_TOP}px !important; --safe-bottom: 34px !important; }
.app-frame.is-dev-now { --bar-dev: 0px !important; } .dev-banner { display: none !important; }`
  const g = await openGame({ viewport: vp, name: 'tour-help-sticky', initCss: css, contextOptions: { userAgent: UA, deviceScaleFactor: 3, isMobile: true, hasTouch: true } })
  const { page, errors } = g
  try {
    await seedSave(page, shiftDoneSave())
    await page.goto(g.url('/?devNow=2026-09-30T09:02'))
    // màn ca bán (HUD) trước khi tự sang Tổng kết
    await page.waitForSelector(T('screen-service'))
    await resolveIncidentIfShown(g, { waitMs: 300 })
    let m = await helpHit(page, '.hud')
    assert.ok(m.ok, `HUD: nút "?" lấn vùng an toàn trên hoặc bị che ${JSON.stringify(m)}`)
    await page.waitForSelector(T('summary'), { timeout: 15000 })
    await page.waitForTimeout(300)
    assert.ok(await scrollScreenToEnd(page) > 50, 'màn Tổng kết phải cuộn được ở 375×553')
    await page.waitForTimeout(150)
    m = await helpHit(page, '.summary-screen')
    assert.ok(m.ok, `Tổng kết cuộn tới đáy: nút "?" khuất ${JSON.stringify(m)}`)
    await page.tap('.summary-screen [data-testid="help-button"]')
    await page.waitForSelector(T('help-sheet'))
    assert.match(await page.textContent(T('help-replay')), /Tổng kết ca/)
    await page.tap(T('help-close'))
    await page.waitForSelector(T('help-sheet'), { state: 'detached' })
    // Ngày mai → màn Chuẩn bị, cuộn tới đáy
    await page.$eval(T('next-day'), e => e.scrollIntoView({ block: 'center' }))
    await page.tap(T('next-day'))
    await page.waitForSelector(T('screen-prep'))
    await page.waitForTimeout(300)
    assert.ok(await scrollScreenToEnd(page) > 50, 'màn Chuẩn bị phải cuộn được ở 375×553')
    await page.waitForTimeout(150)
    m = await helpHit(page, '.prep-screen')
    assert.ok(m.ok, `Chuẩn bị cuộn tới đáy: nút "?" khuất ${JSON.stringify(m)}`)
    // tên xe và Muỗng Vàng vẫn cùng hàng với "?"
    assert.ok(await page.isVisible('.prep-toprow .prep-shop'))
    // màn con (Việc hôm nay): đầu màn dính, chừa vùng an toàn trên
    await page.evaluate(() => { document.getElementById('screen').scrollTop = 0 })
    await page.tap(T('open-quests'))
    await page.waitForSelector(T('quest-0'))
    await scrollScreenToEnd(page)
    m = await helpHit(page, '.meta-head')
    assert.ok(m.ok, `Việc hôm nay: nút "?" lấn vùng an toàn trên hoặc khuất ${JSON.stringify(m)}`)
    const back = await page.evaluate(() => document.querySelector('[data-testid="meta-back"]').getBoundingClientRect().top)
    assert.ok(back >= SAFE_TOP - 0.5, 'nút Quay lại của màn con lấn vùng an toàn trên')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

// Vùng sáng đang ôm đúng phần tử `sel` (khung bao + HOLE_PAD, sai số 1,5px)?
function holeOn(page, sel) {
  return page.evaluate(([sel, pad]) => {
    const hole = document.querySelector('[data-testid="tour-hole"]')
    const el = document.querySelector(sel)
    if (!hole || hole.hidden || !el) return false
    const a = hole.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    return Math.abs(a.left - (b.left - pad)) <= 1.5 && Math.abs(a.right - (b.right + pad)) <= 1.5 &&
      Math.abs(a.top - (b.top - pad)) <= 1.5 && Math.abs(a.bottom - (b.bottom + pad)) <= 1.5
  }, [sel, PAD])
}
async function toStep(page, title) {
  for (let i = 0; i < 10; i++) {
    await stable(page)
    if ((await page.textContent(T('tour-title'))) === title) return
    const before = await countText(page)
    await page.tap(T('tour-next'))
    await waitChange(page, before)
  }
  throw new Error('không tới bước ' + title)
}

// Ca ngày 5: phiếu 1 Bánh mì ốp la đã kẹp, chưa nấu. Mọi tour đã xem trừ tour Bếp (dây phiếu, dòng món, Thớt).
function railSave() {
  const { state } = playedSave(3, 4, { name: 'Xe Dây Phiếu', freq: 'it' })
  state.recipes.banh_mi_op_la = { ...(state.recipes.banh_mi_op_la || newRecipeProgress(0)), cooks: 5 }
  const ctx = makeMetaCtx({ at: '2026-09-30T09:00', attach: true })
  ctx.setState(state)
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  const sh = startShift(state, ctx)
  sh.customers[sh.plan[0].customerId].request = [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }]
  for (let guard = 0; !sh.tickets.length; guard++) {
    if (guard > 20000) throw new Error('không kẹp được phiếu')
    if (!counterStep(state, ctx)) advance(state, 0.5, ctx)
  }
  markSeen(state, Object.keys(DATA.TOURS).filter(id => !['bep_day_phieu', 'bep_dong_mon', 'bep_thot'].includes(id)))
  return { state, ticket: sh.tickets[0] }
}

test('đích của bước đúng chỗ: Dây phiếu + Dòng món khi mở thẳng phiếu, Chọn cách sơ chế, Nhận thưởng đang bật', { timeout: 180000 }, async () => {
  let g = await openIphone({ width: 390, height: 844 }, 'dich-buoc')
  try {
    const { page, errors } = g
    const { state, ticket } = railSave()
    await seedSave(page, state)
    await page.goto(g.url('/?devNow=2026-09-30T09:02&tour=1'))
    await page.waitForSelector(T('screen-service'))
    await resolveIncidentIfShown(g, { waitMs: 400 })
    // chạm phiếu trên dây ở đầu màn: Bếp mở luôn phiếu đó → hai tour nối tiếp, đủ 4 bước
    await page.tap(T('rail-ticket-' + ticket.id))
    await page.waitForSelector(tourSel('bep_dong_mon'))
    assert.equal(await page.getAttribute(T('tour'), 'data-tour'), 'bep_day_phieu bep_dong_mon')
    const steps = await walkTour(g, 'bep_dong_mon', '390×844')
    assert.deepEqual(steps.map(m => m.title), [...DATA.TOURS.bep_day_phieu.steps, ...DATA.TOURS.bep_dong_mon.steps].map(x => x.title))
    await waitSave(page, s => s.tour.seen.bep_day_phieu === true && s.tour.seen.bep_dong_mon === true)
    // bếp, "?" → Xem lại khi phiếu đang mở: bước "Làm món này" khoét sáng đúng nút
    await page.tap(`.hud ${T('help-button')}`)
    await page.tap(T('help-replay'))
    await page.waitForSelector(tourSel('bep_dong_mon'))
    await toStep(page, 'Làm món này')
    assert.ok(await holeOn(page, T('cook-line-0')), 'bước "Làm món này" không khoét sáng nút bắt đầu làm')
    await page.tap(T('tour-skip'))
    await page.waitForSelector(T('tour'), { state: 'detached' })
    // làm món → Thớt: tour Thớt tự hiện, bước "Chọn cách sơ chế" chỉ vào Thái dưa leo (bước có chọn cách)
    await page.tap(T('cook-line-0'))
    await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
    for (const id of requiredIngredients(DATA.RECIPES.banh_mi_op_la, []).required) await page.tap(T('shelf-' + id))
    await page.tap(T('chon-done'))
    await page.waitForSelector(tourSel('bep_thot'))
    await toStep(page, 'Chọn cách sơ chế')
    assert.ok(await holeOn(page, T('board-step-thai_dua')), 'bước "Chọn cách sơ chế" không chỉ vào bước Thái dưa leo')
    await page.tap(T('tour-skip'))
    await page.waitForSelector(T('tour'), { state: 'detached' })
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }

  // Việc hôm nay: việc thứ 2 đã xong (Nhận đang bật), việc đầu chưa → bước "Nhận thưởng" chỉ vào nút Nhận đang bật
  g = await openIphone({ width: 375, height: 553 }, 'dich-viec')
  try {
    const { page, errors } = g
    const { state } = playedSave(3, 4, { name: 'Xe Việc', freq: 'it' })
    const ctx = makeMetaCtx({ at: '2026-09-30T09:00', attach: true })
    ctx.setState(state)
    refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
    const q = state.daily.quests
    q[0].progress = 0
    q[1].progress = q[1].target
    markSeen(state, Object.keys(DATA.TOURS).filter(id => id !== 'viec_hom_nay'))
    await seedSave(page, state)
    await page.goto(g.url('/?devNow=2026-09-30T09:02&tour=1'))
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await page.tap(T('open-quests'))
    await page.waitForSelector(tourSel('viec_hom_nay'))
    assert.equal(await page.isDisabled(T('quest-claim-0')), true)
    assert.equal(await page.isDisabled(T('quest-claim-1')), false)
    await toStep(page, 'Nhận thưởng')
    assert.ok(await holeOn(page, T('quest-claim-1')), 'bước "Nhận thưởng" không chỉ vào nút Nhận đang bật')
    await toStep(page, 'Đổi việc')
    assert.ok(await holeOn(page, T('quest-reroll-0')), 'bước "Đổi việc" không chỉ vào nút Đổi đang bật')
    await page.tap(T('tour-skip'))
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

// ---------- 9. M5: tour trên thẻ vào bước của 5 thao tác mới ----------

const CARD_TOURS = [
  { type: 'dap', vp: { width: 375, height: 553 }, line: { recipeId: 'banh_mi_op_la' }, stepId: 'dap_trung' },
  { type: 'xoay', vp: { width: 390, height: 844 }, line: { recipeId: 'ca_phe_sua_da' }, stepId: 'khuay' },
  { type: 'got', vp: { width: 375, height: 553 }, line: { recipeId: 'che_buoi' }, stepId: 'got_vo' },
  { type: 'lac', vp: { width: 390, height: 844 }, line: { recipeId: 'tra_tac' }, stepId: 'lac' },
  { type: 'bay', vp: { width: 375, height: 553 }, line: { recipeId: 'ca_phe_sua_da' }, stepId: 'them_da' }
]

for (const c of CARD_TOURS) {
  const id = 'bep_' + c.type
  const label = `${vpName(c.vp)} ${id}`
  test(`tour thẻ vào bước ${id} (${vpName(c.vp)}): tour hiện trên thẻ "Bước k/N", ca dừng, thẻ đứng chờ; Bỏ qua → ca và thẻ chạy tiếp`, { timeout: 120000 }, async () => {
    // ca thật dựng sẵn (ngày 5, phiếu đã kẹp, nấu tới bước cần thử), món chưa nấu lần nào nên thẻ vào bước là bản đầy đủ;
    // mọi tour đã xem trừ tour của thẻ này. Đồng hồ giả đúng giờ ca (chạy như thường).
    const { state } = cookShiftSave(c.line, c.stepId, { tickets: 1, cooks: 0, name: 'Xe Thẻ Bước' })
    markSeen(state, Object.keys(DATA.TOURS).filter(t => t !== id))
    const g = await openGame({
      clock: { time: COOK_OPEN_MS }, viewport: c.vp, name: 'tour-the-' + c.type,
      contextOptions: { userAgent: UA, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
    })
    const { page, errors } = g
    try {
      await seedSave(page, state)
      await page.goto(g.url('/?tour=1'))
      await page.waitForSelector(T('screen-service'))
      await resolveIncidentIfShown(g, { waitMs: 300 })
      await page.tap(T('tab-kitchen'))
      await page.waitForSelector(T('board'))
      assert.ok(!(await page.$(T('tour'))), `${label}: tour thẻ bước hiện khi chưa có thẻ`)
      await page.tap(T('board-step-' + c.stepId))
      const sheet = await page.waitForSelector(T('step-sheet'), { timeout: 500 }).catch(() => null)
      if (sheet) await page.tap(T('step-start'))
      await page.waitForSelector(T('step-hint'))
      // tour tự hiện ngay trên thẻ (trước khi thẻ tự chạy sau 1,1 giây)
      await page.waitForSelector(tourSel(id), { timeout: 1000 })
      await stable(page)
      const m1 = await page.evaluate(measureTour)
      checkMeasure(m1, `${label} 1`)
      assert.equal(m1.target, 'step-card-demo', `${label}: bước 1 chỉ vào tay mẫu`)
      assert.equal(m1.title, DATA.TOURS[id].steps[0].title)
      await g.shot(id)
      // ca dừng, thẻ đứng chờ (không tự vào trò dù quá thời gian tự chạy)
      await waitSave(page, s => s.shift && s.shift.paused === true)
      const t0 = await shiftT(page)
      await page.waitForTimeout(1600)
      assert.equal(await shiftT(page), t0, `${label}: tour đang hiện mà giờ ca vẫn chạy`)
      assert.ok(await page.$(`${T('step-hint')}.is-held`), `${label}: thẻ vào bước không đứng chờ`)
      assert.ok(!(await page.$(`${T('minigame-stage')}[data-type="${c.type}"]`)), `${label}: thẻ tự vào trò trong lúc tour hiện`)
      // bước 2: nút bắt đầu
      const before = await countText(page)
      await page.tap(T('tour-next'))
      await waitChange(page, before)
      await stable(page)
      const m2 = await page.evaluate(measureTour)
      checkMeasure(m2, `${label} 2`)
      assert.equal(m2.target, 'step-card-go', `${label}: bước 2 chỉ vào nút "Chạm để bắt đầu"`)
      assert.equal(m2.count, `2/${DATA.TOURS[id].steps.length}`)
      // Bỏ qua hướng dẫn → tour ghi đã xem, ca chạy tiếp, thẻ chạy tiếp rồi tự vào trò (không cần chạm)
      await page.tap(T('tour-skip'))
      await page.waitForSelector(T('tour'), { state: 'detached' })
      await waitSave(page, s => s.tour.seen[id] === true && s.shift && s.shift.paused === false)
      await page.waitForSelector(`${T('minigame-stage')}[data-type="${c.type}"] .mg-foot`, { timeout: 4000 })
      const t1 = await shiftT(page)
      await page.waitForTimeout(1200)
      assert.ok(await shiftT(page) > t1, `${label}: bỏ qua hướng dẫn mà ca không chạy tiếp`)
      // chơi tiếp bước (bộ giải chung) → bước xong, tour không hiện lại
      await playStage(g, state.shift.cook.board.find(s => s.id === c.stepId))
      await page.waitForSelector(`${T('board-step-' + c.stepId)}.is-done`, { timeout: 8000 })
      assert.ok(!(await page.$(T('tour'))), `${label}: tour hiện lại sau khi đã bỏ qua`)
      assert.deepEqual(errors, [], `${label}: có lỗi console/trang`)
    } finally {
      await g.close()
    }
  })
}
