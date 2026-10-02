// E2E lỗi iPhone (ảnh chụp người chơi thật, bản 0.4.0): ở khâu Order, bảng chọn món bị cắt ở mép trên thanh tab Quầy/Bếp,
// nút "Thêm vào phiếu" bị che, chỉ lộ một vệt vàng. Nguyên nhân: bảng (position: fixed) nằm trong panel Quầy — vùng cuộn —
// mà WebKit iOS cắt mọi thứ nằm trong vùng cuộn (kể cả phần tử fixed) theo khung vùng cuộn. Bản sửa đưa bảng chọn món và
// các bảng/hộp của bếp lên lớp nổi gốc của app (phủ cả thanh tab), cao tối đa bằng khung nhìn động, thân bảng cuộn được,
// hàng nút dính đáy có chừa vùng an toàn.
//
// Mô phỏng iPhone trên Chromium (không có WebKit): UA iPhone, isMobile, hasTouch, deviceScaleFactor 3, khung 320×568,
// 375×553 (iPhone SE + thanh Safari), 390×664 (iPhone 14 + thanh Safari); thêm
//  - vùng an toàn đáy 34px (thanh Home) bằng cách ghi đè biến --safe-bottom (base.css đọc env(safe-area-inset-bottom) vào đây);
//  - cách WebKit iOS cắt vùng cuộn: clip-path: inset(0) trên các vùng cuộn (.screen, .panel, .k-main) — đúng điều kiện tái
//    hiện được lỗi ở bản 0.4.0 (bảng chọn món chỉ lộ vệt vàng trên thanh tab).
// Mỗi lớp phủ chính: nút hành động chính nằm trọn trong khung nhìn (trừ vùng an toàn đáy), elementFromPoint tại tâm và bốn
// góc trúng chính nút (không bị thanh tab hay lớp nào che), chạm bằng page.touchscreen.tap và nút có tác dụng:
//  1. Ngày 1: bảng điểm danh, "Mở hàng", bảng chọn món (chip ghi chú, "Thêm vào phiếu"), bảng sửa dòng ("Bỏ dòng này").
//  2. Bếp trong ca thật: bảng chọn cách sơ chế ("Để sau"), Nhấc chảo ngay → hộp "Chiên trứng hỏng rồi!" (không bị click ma
//     bấm nhầm), "Làm lại" / "Để vậy", hộp "Ra món luôn?", bảng công bố món, khách phàn nàn (xin lỗi, hoàn tiền), phiếu chấm
//     (nằm trọn phía trên thanh tab).
//  3. Tình huống trong ca ("Khách mở hàng bằng tờ 500.000đ"): cách an toàn, "Bán tiếp".
//  4. Chợ Công Thức: hộp xác nhận mua nâng cấp.
//  5. Cài đặt: mã sao lưu ("Xong"), nhập mã (xem trước, "Dùng bản này" / "Thôi"), chơi lại 2 bước, giới thiệu.
//  6. Lựa hàng (gánh hàng quê): "Bắt đầu lựa", "Xong" của kệ, "Về màn Chuẩn bị".
//  7. Thẻ sự kiện ngày có lựa chọn (Trời mưa → "Chọn" căng bạt) và "Mở hàng".
//  8. Bếp ở màn thấp (0.4.1, ẩn dải "Giờ giả" như máy người chơi): bước Chọn — vuốt bắt đầu trên ô kệ cuộn được khung bếp,
//     mọi ô kệ có chỗ cuộn để nằm trọn trên thanh "Trong rổ / Xong" và chạm trúng; bước Thái — thớt, nguyên liệu, vạch nằm
//     trọn giữa đầu sân khấu và thanh "Nhát / Xong", thái bằng cảm ứng ngay trên nguyên liệu được điểm tối đa.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, seedSave, waitSave, readSave, resolveIncidentIfShown } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { defaultState, newRecipeProgress } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { startShift, advance } from '../../src/core/shift.js'
import { startCook, submitChon, availableSteps, submitStep } from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { playShift, counterStep } from '../helpers/perfect-player.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'
import { playedSave, builtRareSave, RARE_AT } from '../helpers/m4-saves.mjs'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const VIEWPORTS = [{ width: 320, height: 568 }, { width: 375, height: 553 }, { width: 390, height: 664 }]
const SAFE_BOTTOM = 34
const IOS_CSS = `.screen, .panel, .k-main { clip-path: inset(0); }
:root { --safe-bottom: ${SAFE_BOTTOM}px !important; }`

const vpName = vp => `${vp.width}×${vp.height}`

function openIphone(vp, name, extra = {}) {
  return openGame({
    viewport: vp, name: `iphone-${name}`, ...extra,
    contextOptions: { userAgent: UA, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, initCss: extra.initCss || IOS_CSS
  })
}

// Chạy kịch bản ở từng khung; lỗi trang/console làm hỏng test.
async function eachViewport(name, fn, extra = {}) {
  for (const vp of VIEWPORTS) {
    const g = await openIphone(vp, name, extra)
    try {
      await fn(g, vp)
      assert.deepEqual(g.errors, [], `${vpName(vp)}: có lỗi console/trang`)
    } finally {
      await g.close()
    }
  }
}

// Chờ phần tử đứng yên (hết hiệu ứng trượt lên / phóng to của lớp phủ).
async function settle(page, sel) {
  let prev = ''
  for (let i = 0; i < 40; i++) {
    const cur = await page.evaluate(s => {
      const e = document.querySelector(s)
      if (!e) return ''
      const r = e.getBoundingClientRect()
      return [r.left, r.top, r.width, r.height].map(v => Math.round(v * 4)).join(',')
    }, sel)
    if (cur && cur === prev) return
    prev = cur
    await page.waitForTimeout(70)
  }
}

// Đo một phần tử: nằm trọn trong khung nhìn (trừ vùng an toàn đáy); với nút (pointer): tâm và bốn điểm sát mép trái, phải,
// trên, dưới trúng chính phần tử. coveredBy: phần tử đang nằm trên tâm (vd thanh tab).
function measure(page, sel, pointer = true) {
  return page.evaluate(([s, safe, pointer]) => {
    const b = document.querySelector(s)
    if (!b) return { ok: false, why: 'không thấy ' + s }
    const r = b.getBoundingClientRect()
    if (!r.width || !r.height) return { ok: false, why: 'bị ẩn' }
    const hits = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === b || b.contains(e)) }
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    // bốn điểm sát mép (trái, phải, trên, dưới) nằm trong mọi hình nút bo tròn (kể cả chip hình viên thuốc)
    const d = Math.min(6, r.height / 4)
    const dx = Math.min(r.height / 2, r.width / 4)
    const pts = [[r.left + dx, cy], [r.right - dx, cy], [cx, r.top + d], [cx, r.bottom - d]]
    const corners = pts.map(([x, y]) => hits(x, y))
    const inView = r.top >= -0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight - safe + 0.5
    const name = e => (e ? ((e.closest('[data-testid]') || e).getAttribute('data-testid') || String(e.className)) : null)
    const top = document.elementFromPoint(cx, cy)
    const coveredBy = top && !(top === b || b.contains(top)) ? name(top) : null
    const cornerHits = corners.every(Boolean) ? null
      : pts.map(([x, y]) => name(document.elementFromPoint(x, y)))
    const tab = document.querySelector('.tabbar')
    const tabTop = tab && tab.getClientRects().length ? tab.getBoundingClientRect().top : null
    const ok = inView && (!pointer || (hits(cx, cy) && corners.every(Boolean)))
    return {
      ok, cx, cy, inView, corners: corners.map(Number).join(''), coveredBy, cornerHits, vh: innerHeight, tabTop,
      rect: [r.left, r.top, r.right, r.bottom].map(Math.round)
    }
  }, [sel, SAFE_BOTTOM, pointer])
}

// Nút hành động: chờ hiện, (cuộn trong lớp phủ nếu scroll), đo, khẳng định chạm trọn được.
async function reach(g, sel, label, { scroll = false } = {}) {
  const { page } = g
  await page.waitForSelector(sel, { state: 'visible', timeout: 15000 })
  if (scroll) await page.$eval(sel, e => e.scrollIntoView({ block: 'nearest' }))
  await settle(page, sel)
  const m = await measure(page, sel)
  assert.ok(m.ok, `${vpName(g.viewport)} ${label}: nút không chạm trọn được ${JSON.stringify(m)}`)
  return m
}

// Như reach rồi chạm bằng cảm ứng vào tâm nút.
async function tapReach(g, sel, label, opts) {
  const m = await reach(g, sel, label, opts)
  await g.page.touchscreen.tap(m.cx, m.cy)
  return m
}

// Save đã chơi n ca bằng người chơi hoàn hảo (mỗi ca một ngày thật từ 26/09), mức tần suất sự kiện `freq`.
function builtShiftSave(seed, { shifts = 4, freq = 'nhieu', name = 'Xe iPhone' } = {}) {
  const ctx = makeMetaCtx({ at: '2026-09-26T08:00', attach: true })
  const state = defaultState(seed, DATA)
  ctx.setState(state)
  state.shopName = name
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  for (let i = 0; i < shifts; i++) { playShift(state, ctx); ctx.clock.t += 24 * 3600 * 1000 }
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  if (freq) { state.settings.incidentFrequency = freq; state.incidents.since = 3 }
  state.checkin.lastDay = '2026-12-31'
  return state
}

test('iPhone ngày 1: bảng điểm danh, Mở hàng, bảng chọn món và bảng sửa dòng không bị thanh tab che', { timeout: 300000 }, async () => {
  await eachViewport('ngay-1', async g => {
    const { page } = g
    await page.goto(g.url('/?seed=42&test=1'))
    await page.fill(T('shop-name-input'), 'Xe Bánh Mì iPhone')
    await page.tap(T('start-button'))
    // bảng điểm danh tự bật lần đầu mở game
    await tapReach(g, T('checkin-claim'), 'Bảng điểm danh: Nhận')
    await waitSave(page, s => s.checkin && s.checkin.total === 1)
    await page.waitForSelector(T('checkin-popup'), { state: 'detached', timeout: 8000 })
    await tapReach(g, T('open-shift'), 'Màn Chuẩn bị: Mở hàng')
    await page.waitForSelector(T('screen-service'))

    // khâu Order, khách hướng dẫn: chạm thẻ Bánh mì ốp la → bảng chọn món
    await page.waitForSelector(T('menu-item-banh_mi_op_la'), { timeout: 60000 })
    await page.tap(T('menu-item-banh_mi_op_la'))
    await page.waitForSelector(T('order-sheet'))
    await g.shot('bang-chon-mon')
    // chip ghi chú bấm được (bật rồi tắt), bảng vẽ lại vẫn ở chỗ cũ
    await tapReach(g, T('note-chip-them_trung'), 'Bảng chọn món: chip Thêm trứng')
    await page.waitForSelector(`${T('note-chip-them_trung')}[aria-pressed="true"]`)
    await tapReach(g, T('note-chip-them_trung'), 'Bảng chọn món: chip Thêm trứng (tắt)')
    await page.waitForSelector(`${T('note-chip-them_trung')}[aria-pressed="false"]`)
    await tapReach(g, T('qty-plus'), 'Bảng chọn món: +')
    await page.waitForSelector(`${T('qty-value')}:text-is("2")`)
    await tapReach(g, T('qty-minus'), 'Bảng chọn món: −')
    await page.waitForSelector(`${T('qty-value')}:text-is("1")`)
    // nút "Thêm vào phiếu" (có viền sáng hướng dẫn) nằm trên thanh tab, trong khung nhìn
    const m = await tapReach(g, T('add-line'), 'Bảng chọn món: Thêm vào phiếu')
    if (m.tabTop !== null) assert.ok(m.rect[3] <= m.vh - SAFE_BOTTOM, 'nút Thêm vào phiếu lấn vùng an toàn')
    await page.waitForSelector(T('order-sheet'), { state: 'detached' })
    await page.waitForSelector(T('order-line-0'))
    await waitSave(page, s => s.shift && s.shift.counter && s.shift.counter.draft.length === 1)

    // chạm dòng vừa ghi → bảng sửa dòng: "Lưu" và "Bỏ dòng này" đều chạm được
    await page.tap(T('order-line-0'))
    await page.waitForSelector(T('remove-line'))
    await reach(g, T('add-line'), 'Bảng sửa dòng: Lưu')
    await tapReach(g, T('remove-line'), 'Bảng sửa dòng: Bỏ dòng này')
    await page.waitForSelector(T('order-sheet'), { state: 'detached' })
    await page.waitForSelector(T('order-line-0'), { state: 'detached' })
    await waitSave(page, s => s.shift && s.shift.counter && s.shift.counter.draft.length === 0)
    // bảng đóng thì lớp nổi gốc không còn sót lớp phủ nào chặn chạm
    assert.equal(await page.$$eval('.overlay-root .sheet-layer', els => els.length), 0)
    await tapReach(g, T('tab-kitchen'), 'Thanh tab: Bếp')
    await page.waitForSelector(T('panel-kitchen'), { state: 'visible' })
  })
})

// ---------- Bếp, phàn nàn, phiếu chấm (ca thật dựng sẵn) ----------

const BM = DATA.RECIPES.banh_mi_op_la
// Ca ngày 5 đang dở: khách đầu gọi 1 Bánh mì ốp la, phiếu đã kẹp, đã chọn đủ nguyên liệu, đã làm Rửa dưa leo và Đập trứng
// → Thái dưa leo (bảng chọn cách) và Chiên trứng (bước chí mạng) đang mở. Đã nấu 5 lần nên không còn thẻ gợi ý.
function kitchenSave() {
  const { state } = playedSave(3, 4, { name: 'Xe Bếp iPhone', freq: 'it' })
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
  if (!submitChon(state, requiredIngredients(BM, cook.notes).required, 0, ctx).ok) throw new Error('chọn bị chặn')
  for (const id of ['rua_dua', 'dap_trung']) submitStep(state, id, { score: 100 }, ctx)
  assert.deepEqual(availableSteps(state).sort(), ['chien_trung', 'thai_dua'])
  return { state, ticket }
}

test('iPhone bếp: bảng chọn cách, hộp bước hỏng, Ra món luôn, công bố món, phàn nàn, phiếu chấm', { timeout: 300000 }, async () => {
  await eachViewport('bep', async g => {
    const { page } = g
    const { state, ticket } = kitchenSave()
    await seedSave(page, state)
    await page.goto(g.url('/?devNow=2026-09-30T09:02'))
    await page.waitForSelector(T('screen-service'))
    await resolveIncidentIfShown(g, { waitMs: 300 })
    await tapReach(g, T('tab-kitchen'), 'Thanh tab: Bếp')
    await page.waitForSelector(T('board'))

    // Thái dưa leo: bảng chọn cách sơ chế (lớp nổi, phủ cả thanh tab)
    await page.click(T('board-step-thai_dua'))
    await page.waitForSelector(T('step-sheet'))
    await g.shot('bang-chon-cach')
    await reach(g, T('method-' + BM.steps.find(s => s.id === 'thai_dua').method.correct), 'Bảng chọn cách: Thái lát')
    await tapReach(g, `${T('step-sheet')} ${T('sheet-close')}`, 'Bảng chọn cách: Để sau')
    await page.waitForSelector(T('step-sheet'), { state: 'detached' })

    // Chiên trứng: Nhấc ngay (chốt ở pointerdown) → món sống, bước chí mạng hỏng → hộp hỏi lại hiện đúng chỗ ngón tay vừa
    // nhấc; cú click sinh ra lúc nhấc ngón không được bấm nhầm nút của hộp
    await page.click(T('board-step-chien_trung'))
    await page.waitForSelector(`${T('minigame-stage')}[data-type="lua"] ${T('lua-lift')}`)
    await page.waitForTimeout(150)
    await page.tap(`${T('minigame-stage')} ${T('lua-lift')}`)
    await page.waitForSelector(T('critical-prompt'))
    await page.waitForTimeout(400)
    assert.ok(await page.$(T('critical-prompt')), 'hộp bước hỏng bị click ma đóng mất')
    await g.shot('hop-buoc-hong')
    await reach(g, `${T('critical-prompt')} ${T('abandon-dish')}`, 'Hộp bước hỏng: Bỏ món')
    await reach(g, `${T('critical-prompt')} ${T('prompt-close')}`, 'Hộp bước hỏng: Để vậy')
    await tapReach(g, `${T('critical-prompt')} ${T('retry-step')}`, 'Hộp bước hỏng: Làm lại')
    // Làm lại → sân khấu chảo mở lại; nhấc ngay lần nữa → hộp hỏi lại, lần này "Để vậy"
    await page.waitForSelector(T('critical-prompt'), { state: 'detached' })
    await page.waitForSelector(`${T('minigame-stage')}[data-type="lua"] ${T('lua-lift')}`)
    await page.waitForTimeout(150)
    await page.tap(`${T('minigame-stage')} ${T('lua-lift')}`)
    await page.waitForSelector(T('critical-prompt'))
    await tapReach(g, `${T('critical-prompt')} ${T('prompt-close')}`, 'Hộp bước hỏng: Để vậy')
    await page.waitForSelector(T('critical-prompt'), { state: 'detached' })
    await page.waitForSelector(T('board'))

    // Ra món khi còn bước chưa làm → hộp "Ra món luôn?" → bảng công bố món (lớp nổi)
    await tapReach(g, T('finish-dish'), 'Thớt: Ra món')
    await tapReach(g, T('confirm-ok'), 'Hộp Ra món luôn: Vẫn ra món')
    await page.waitForSelector(T('dish-reveal'))
    // dừng đồng hồ trang để bảng công bố không tự đóng (REVEAL_MS 2,2 giây) trước khi đo; chờ hoạt ảnh phóng to (CSS) xong.
    // Hẹn dừng sau 300 ms để không bị "tua về quá khứ" khi máy chạy nặng.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 300))
    await page.waitForTimeout(1400)
    const rv = await measure(page, T('dish-reveal'), false)
    assert.ok(rv.ok, `${vpName(g.viewport)} bảng công bố món tràn khung: ${JSON.stringify(rv)}`)
    await g.shot('cong-bo-mon')
    await page.clock.resume()
    await page.waitForSelector(T('dish-reveal'), { state: 'detached', timeout: 8000 })

    // giao món hỏng → khách phàn nàn: chọn câu xin lỗi, hoàn tiền → phiếu chấm nằm trọn phía trên thanh tab
    await page.click(`${T('serve-ticket')}[data-ticket-id="${ticket.id}"]`)
    await page.waitForSelector(T('complaint-modal'))
    await g.shot('phan-nan')
    await tapReach(g, T('complaint-apology-0'), 'Phàn nàn: câu xin lỗi', { scroll: true })
    await reach(g, T('complaint-remake'), 'Phàn nàn: Làm lại món')
    await tapReach(g, T('complaint-refund'), 'Phàn nàn: Hoàn tiền')
    await page.waitForSelector(T('complaint-modal'), { state: 'detached' })
    const sheet = `${T('score-sheet')}[data-customer-id="${ticket.customerId}"]`
    await page.waitForSelector(sheet, { timeout: 8000 })
    await settle(page, sheet)
    const ss = await measure(page, sheet, false)
    assert.ok(ss.ok, `${vpName(g.viewport)} phiếu chấm tràn khung: ${JSON.stringify(ss)}`)
    assert.ok(ss.tabTop === null || ss.rect[3] <= ss.tabTop + 0.5, `${vpName(g.viewport)} phiếu chấm đè lên thanh tab: ${JSON.stringify(ss)}`)
    const s = await waitSave(page, st => st.shift && st.shift.customers[ticket.customerId].status === 'roi_di')
    assert.equal(s.shift.customers[ticket.customerId].complaint, null, 'phàn nàn chưa được xử lý')
  }, { clock: true })
})

test('iPhone tình huống trong ca: lựa chọn an toàn và "Bán tiếp" chạm được', { timeout: 240000 }, async () => {
  await eachViewport('tinh-huong', async g => {
    const { page } = g
    await seedSave(page, builtShiftSave(8))
    await page.goto(g.url('/?devNow=2026-09-30T09:00'))
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await tapReach(g, T('open-shift'), 'Màn Chuẩn bị: Mở hàng')
    await page.waitForSelector(T('incident-modal'))
    await g.shot('tinh-huong')
    // lựa chọn đầu tiên thấy ngay; cách an toàn (có thể nằm dưới) cuộn trong hộp là tới, không bị gì che
    await reach(g, `${T('incident-modal')} .incident-choice`, 'Tình huống: lựa chọn đầu')
    await tapReach(g, `${T('incident-modal')} [data-safe="true"]`, 'Tình huống: cách an toàn', { scroll: true })
    await page.waitForSelector(T('incident-result'))
    await tapReach(g, T('incident-ok'), 'Tình huống: Bán tiếp')
    await page.waitForSelector(T('incident-modal'), { state: 'detached' })
    const s = await readSave(page)
    assert.ok(s.incidents.total >= 1, 'tình huống chưa được ghi nhận')
  }, { clock: true })
})

test('iPhone Chợ Công Thức: hộp xác nhận mua nâng cấp', { timeout: 180000 }, async () => {
  await eachViewport('cho', async g => {
    const { page } = g
    const state = builtShiftSave(42, { shifts: 1, freq: null, name: 'Xe Chợ iPhone' })
    state.wallet = 700000
    state.goldSpoons = 45
    await seedSave(page, state)
    await page.goto(g.url('/?devNow=2026-10-06T09:00&test=1'))
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await page.tap(T('open-shop'))
    await page.tap(T('shop-tab-upgrades'))
    await page.waitForSelector(T('upgrade-dao_thep'))
    await page.tap(T('upgrade-buy-dao_thep'))
    await page.waitForSelector(T('confirm-ok'))
    await reach(g, T('confirm-cancel'), 'Hộp mua: Để sau')
    await tapReach(g, T('confirm-ok'), 'Hộp mua: Mua')
    await page.waitForSelector(`${T('upgrade-dao_thep')}.is-owned`)
    await waitSave(page, s => s.upgrades && s.upgrades.dao_thep === true)
  })
})

test('iPhone Cài đặt: mã sao lưu, nhập mã, chơi lại, giới thiệu', { timeout: 180000 }, async () => {
  await eachViewport('cai-dat', async g => {
    const { page } = g
    await seedSave(page, builtShiftSave(42, { shifts: 2, freq: null, name: 'Xe Sao Lưu' }))
    await page.goto(g.url('/?devNow=2026-09-28T09:00'))
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await page.tap(T('open-settings'))
    await page.waitForSelector(T('screen-settings'))
    // mã sao lưu
    await page.tap(T('backup-copy'))
    await page.waitForSelector(T('backup-code-modal'))
    await reach(g, T('backup-copy-again'), 'Mã sao lưu: Chép lại')
    const code = await page.$eval(T('backup-code'), el => el.value)
    await tapReach(g, T('backup-done'), 'Mã sao lưu: Xong')
    await page.waitForSelector(T('backup-code-modal'), { state: 'detached' })
    // nhập mã: Xem trước → "Dùng bản này" / "Thôi"
    await page.tap(T('backup-import'))
    await page.waitForSelector(T('backup-input'))
    await page.fill(T('backup-input'), code)
    await page.$eval(T('backup-input'), el => el.blur())
    await tapReach(g, T('backup-check'), 'Nhập mã: Xem trước')
    await page.waitForSelector(T('backup-preview'))
    await g.shot('nhap-ma-xem-truoc')
    await reach(g, T('backup-confirm'), 'Nhập mã: Dùng bản này')
    await tapReach(g, T('backup-cancel'), 'Nhập mã: Thôi')
    await page.waitForSelector(T('backup-import-modal'), { state: 'detached' })
    // chơi lại: 2 bước xác nhận, thôi ở bước 2
    await page.tap(T('reset-game'))
    await tapReach(g, T('reset-next'), 'Chơi lại: Tiếp tục')
    await page.waitForSelector(T('reset-step2'))
    await reach(g, T('reset-confirm'), 'Chơi lại: Chơi lại từ đầu')
    await tapReach(g, `${T('reset-step2')} ${T('reset-cancel')}`, 'Chơi lại: Thôi')
    await page.waitForSelector(T('reset-step2'), { state: 'detached' })
    // giới thiệu
    await page.tap(T('open-about'))
    await tapReach(g, T('about-close'), 'Giới thiệu: Đóng')
    await page.waitForSelector(T('about-modal'), { state: 'detached' })
    const s = await readSave(page)
    assert.equal(s.shopName, 'Xe Sao Lưu', 'bản lưu bị thay dù đã bấm Thôi')
  })
})

test('iPhone Lựa hàng: Bắt đầu lựa, Xong của kệ, Về màn Chuẩn bị', { timeout: 180000 }, async () => {
  await eachViewport('lua-hang', async g => {
    const { page } = g
    await seedSave(page, builtRareSave(3))
    await page.goto(g.url(`/?devNow=${RARE_AT}`))
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await page.tap(T('open-market'))
    await page.waitForSelector(T('stall-start'))
    await page.$eval(T('stall-start'), el => el.scrollIntoView({ block: 'center' }))
    await tapReach(g, T('stall-start'), 'Lựa hàng: Bắt đầu lựa')
    await page.waitForSelector(`${T('market-stage')} ${T('minigame-stage')}[data-type="chon"]`)
    const stall = await page.getAttribute(T('market-stage'), 'data-stall')
    for (const id of DATA.STALLS.find(s => s.id === stall).goods) if (await page.$(T('shelf-' + id))) await page.click(T('shelf-' + id))
    await tapReach(g, T('chon-done'), 'Lựa hàng: Xong')
    await page.waitForSelector(T('market-result'))
    await page.$eval(T('market-done'), el => el.scrollIntoView({ block: 'nearest' }))
    await tapReach(g, T('market-done'), 'Lựa hàng: Về màn Chuẩn bị')
    await page.waitForSelector(T('screen-prep'))
  })
})

test('iPhone thẻ sự kiện ngày có lựa chọn: nút Chọn và Mở hàng', { timeout: 180000 }, async () => {
  await eachViewport('su-kien', async g => {
    const { page } = g
    const s = builtShiftSave(3, { shifts: 3, freq: null, name: 'Xe Kiểm Thử' })
    s.checkin.lastDay = '2026-09-29'
    await seedSave(page, s)
    await page.goto(g.url('/?devNow=2026-09-29T09:00'))
    await page.tap(T('start-button'))
    await page.waitForSelector(`${T('day-event-card')}[data-event="troi_mua"]`)
    await page.$eval(T('day-event-choice-cang_bat'), el => el.scrollIntoView({ block: 'center' }))
    await tapReach(g, T('day-event-choice-cang_bat'), 'Sự kiện ngày: Chọn căng bạt')
    await page.waitForSelector(`${T('day-event-choice-cang_bat')}[aria-pressed="true"]`)
    await reach(g, T('open-shift'), 'Màn Chuẩn bị: Mở hàng')
  })
})

// ---------- 8. Bếp ở màn thấp: kệ Chọn, thớt Thái ----------
// Dải "Giờ giả" của chế độ xem trước (?devNow) không có trên máy người chơi: ẩn đi để đo đúng chỗ còn lại của panel Bếp.
const LOW_CSS = IOS_CSS + `
.app-frame.is-dev-now { --bar-dev: 0px !important; } .dev-banner { display: none !important; }`

// Ca ngày 5: phiếu 1 Bánh mì ốp la KHÔNG HÀNH đã kẹp; `upTo` = 'chon' (đang ở bước Chọn) | 'thai' (đã chọn, đã Rửa dưa leo:
// bước Thái dưa leo mở được).
function lowKitchenSave(upTo) {
  const { state } = playedSave(8, 4, { name: 'Xe Màn Thấp', freq: 'it' })
  state.recipes.banh_mi_op_la = { ...(state.recipes.banh_mi_op_la || newRecipeProgress(0)), cooks: 5 }
  const ctx = makeMetaCtx({ at: '2026-09-30T09:00', attach: true })
  ctx.setState(state)
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  const sh = startShift(state, ctx)
  sh.customers[sh.plan[0].customerId].request = [{ recipeId: 'banh_mi_op_la', qty: 1, notes: ['khong_hanh'] }]
  for (let guard = 0; !sh.tickets.length; guard++) {
    if (guard > 20000) throw new Error('không kẹp được phiếu')
    if (!counterStep(state, ctx)) advance(state, 0.5, ctx)
  }
  const cook = startCook(state, sh.tickets[0].id, 0, ctx)
  if (upTo === 'thai') {
    if (!submitChon(state, requiredIngredients(BM, cook.notes).required, 0, ctx).ok) throw new Error('chọn bị chặn')
    submitStep(state, 'rua_dua', { score: 100 }, ctx)
  }
  return state
}

// Vuốt bằng ngón tay thật (CDP: tôn trọng touch-action như trình duyệt điện thoại).
async function swipe(page, cdp, x, y0, y1) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] })
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (y1 - y0) * i / 12 }] })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(400)
}

test('iPhone bếp màn thấp: kệ Chọn vuốt cuộn được, mọi ô kệ chạm trọn; thớt Thái nằm trọn trên thanh chân', { timeout: 300000 }, async () => {
  for (const vp of VIEWPORTS) {
    const label = vpName(vp)
    // --- bước Chọn ---
    let g = await openIphone(vp, 'ke-chon', { initCss: LOW_CSS })
    try {
      const { page } = g
      await seedSave(page, lowKitchenSave('chon'))
      await page.goto(g.url('/?devNow=2026-09-30T09:02'))
      await page.waitForSelector(T('screen-service'))
      await resolveIncidentIfShown(g, { waitMs: 400 })
      await page.tap(T('tab-kitchen'))
      await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"] .chon-cell`)
      await page.waitForTimeout(300)
      const cdp = await g.context.newCDPSession(page)
      const scrollTop = () => page.evaluate(() => document.querySelector('.k-main').scrollTop)
      const max = await page.evaluate(() => { const m = document.querySelector('.k-main'); return m.scrollHeight - m.clientHeight })
      if (max > 40) {
        // cuộn giữa chừng cho một ô kệ lộ ra, rồi vuốt bắt đầu ngay trên ô đó
        const cell = await page.evaluate(() => {
          const m = document.querySelector('.k-main')
          m.scrollTop = Math.round((m.scrollHeight - m.clientHeight) / 2)
          const mr = m.getBoundingClientRect()
          const fr = document.querySelector('.mg-chon .mg-foot').getBoundingClientRect()
          const b = [...document.querySelectorAll('.chon-cell')].map(c => c.getBoundingClientRect())
            .find(r => (r.top + r.bottom) / 2 > mr.top + 20 && (r.top + r.bottom) / 2 < fr.top - 20)
          return b ? [(b.left + b.right) / 2, (b.top + b.bottom) / 2, m.scrollTop] : null
        })
        assert.ok(cell, `${label}: không có ô kệ nào lộ ra để vuốt`)
        await swipe(page, cdp, cell[0], cell[1], cell[1] + 60)
        assert.ok(await scrollTop() < cell[2] - 20, `${label}: vuốt trên ô kệ không cuộn được khung bếp`)
      }
      // mỗi ô kệ: có chỗ cuộn để nằm trọn giữa mép trên khung bếp và thanh "Trong rổ / Xong", chạm trúng cả mép trên/dưới
      const need = requiredIngredients(BM, ['khong_hanh']).required
      const ids = await page.$$eval('.chon-cell', els => els.map(e => e.dataset.testid.replace('shelf-', '')))
      for (const id of ids) {
        const m = await page.evaluate(sel => {
          const m = document.querySelector('.k-main')
          const c = document.querySelector(sel)
          const foot = document.querySelector('.mg-chon .mg-foot')
          let b = c.getBoundingClientRect()
          if (b.bottom > foot.getBoundingClientRect().top - 4) m.scrollTop += b.bottom - (foot.getBoundingClientRect().top - 4)
          b = c.getBoundingClientRect()
          if (b.top < m.getBoundingClientRect().top + 4) m.scrollTop -= m.getBoundingClientRect().top + 4 - b.top
          b = c.getBoundingClientRect()
          const mr = m.getBoundingClientRect()
          const fr = foot.getBoundingClientRect()
          const hit = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && c.contains(e) }
          const cx = (b.left + b.right) / 2
          return { ok: b.top >= mr.top - 0.5 && b.bottom <= fr.top + 0.5 && hit(cx, b.top + 2) && hit(cx, b.bottom - 2), cx, cy: (b.top + b.bottom) / 2, rect: [b.top, b.bottom], foot: fr.top, main: mr.top }
        }, T('shelf-' + id))
        assert.ok(m.ok, `${label}: ô kệ ${id} không có chỗ nằm trọn trên thanh "Trong rổ / Xong" ${JSON.stringify(m)}`)
        if (need.includes(id)) {
          await page.touchscreen.tap(m.cx, m.cy)
          await page.waitForSelector(`${T('shelf-' + id)}.is-picked`)
        }
      }
      await tapReach(g, T('chon-done'), 'Xong (bước Chọn)')
      await page.waitForSelector(T('board'))
      const saved = await waitSave(page, s => s.shift && s.shift.cook && s.shift.cook.steps && s.shift.cook.steps.chon)
      assert.equal(saved.shift.cook.steps.chon.score, 100, `${label}: chọn bằng cảm ứng mà bước Chọn không đủ điểm`)
      assert.deepEqual(g.errors, [], `${label}: có lỗi console/trang`)
    } finally {
      await g.close()
    }
    // --- bước Thái dưa leo ---
    g = await openIphone(vp, 'thot-thai', { initCss: LOW_CSS })
    try {
      const { page } = g
      await seedSave(page, lowKitchenSave('thai'))
      await page.goto(g.url('/?devNow=2026-09-30T09:02'))
      await page.waitForSelector(T('screen-service'))
      await resolveIncidentIfShown(g, { waitMs: 400 })
      await page.tap(T('tab-kitchen'))
      // thớt ở màn thấp phải cuộn khung bếp mới thấy bước (giữa hai thanh dính)
      await page.$eval(`${T('board-step-thai_dua')}.is-available`, e => e.scrollIntoView({ block: 'center' }))
      await tapReach(g, `${T('board-step-thai_dua')}.is-available`, 'bước Thái dưa leo')
      const def = BM.steps.find(x => x.id === 'thai_dua')
      await tapReach(g, T('method-' + def.method.correct), 'cách thái đúng')
      const S = `${T('minigame-stage')}[data-type="thai"]`
      await page.waitForSelector(`${S} .mg-foot`)
      await page.waitForTimeout(400)
      const geo = await page.evaluate(S => {
        const st = document.querySelector(S)
        const R = e => { const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom } }
        return {
          head: R(st.querySelector('.mg-head')), foot: R(st.querySelector('.mg-foot')), board: R(st.querySelector('[data-testid="thai-board"]')),
          food: R(st.querySelector('.thai-food')), guides: [...st.querySelectorAll('[data-testid^="thai-guide-"]')].map(R),
          xs: [...st.querySelectorAll('[data-testid^="thai-guide-"]')].map(e => e.getBoundingClientRect().left + 1)
        }
      }, S)
      const inside = r => r.t >= geo.head.b - 0.5 && r.b <= geo.foot.t + 0.5
      for (const [name, r] of [['thớt', geo.board], ['nguyên liệu', geo.food], ...geo.guides.map((x, i) => ['vạch ' + i, x])]) {
        assert.ok(inside(r), `${label}: ${name} không nằm trọn giữa đầu sân khấu và thanh "Nhát / Xong" ${JSON.stringify({ r, head: geo.head.b, foot: geo.foot.t })}`)
      }
      assert.ok(geo.food.b - geo.food.t >= 36, `${label}: nguyên liệu thấp quá (${geo.food.b - geo.food.t}px)`)
      // thái bằng cảm ứng ngay giữa nguyên liệu, nhấc tay đúng vạch
      const cdp = await g.context.newCDPSession(page)
      const y = (geo.food.t + geo.food.b) / 2
      for (const x of geo.xs) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 20, y }] })
        for (let i = 1; i <= 4; i++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 20 + 5 * i, y }] })
          await page.waitForTimeout(16)
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await page.waitForTimeout(120)
      }
      const s = await waitSave(page, x => x.shift && x.shift.cook && x.shift.cook.steps && x.shift.cook.steps.thai_dua, 8000)
      assert.ok(s.shift.cook.steps.thai_dua.score >= 90, `${label}: thái đúng vạch mà chỉ được ${s.shift.cook.steps.thai_dua.score} điểm`)
      assert.deepEqual(g.errors, [], `${label}: có lỗi console/trang`)
    } finally {
      await g.close()
    }
  }
})
