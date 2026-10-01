// E2E (mục 25): số lần chọn nhầm ở bước Chọn nguyên liệu giữ theo dòng phiếu qua "Bỏ món" (giao diện thật, Chromium cảm
// ứng, CA THẬT mở bằng ?devNow). Trước khi sửa: chọn nhầm → ‹ Phiếu → Bỏ món → mở lại đúng dòng đó → 0 lần nhầm, bước Chọn
// 100 điểm (né được phạt). Nay:
//  (a) 360×640: chọn nhầm 1 lần → Bỏ món → mở lại: rổ trống nhưng mang 1 lần nhầm → lấy đủ, Xong → điểm Chọn 85
//      (nhãn nổi và save), phiếu không còn giữ lần nhầm sau khi chốt.
//  (b) 390×844: chọn nhầm → Bỏ món → tải lại trang (F5) ngay → mở lại → vẫn 85 (lần nhầm nằm trong save, trên phiếu).
//  (c) 360×600: quá giờ bước Chọn (không chạm nhầm) → Bỏ món → mở lại → Xong → 85 (phạt quá giờ cũng không né được).
//  (d) 360×640: chọn nhầm → Xong (85) → Bỏ món trên Thớt → mở lại: chọn lại từ đầu nhưng vẫn mang lần nhầm → 85 (trước
//      đây chốt rồi bỏ món trên Thớt thì mở lại được 100).
// Save dựng bằng lõi thật: 4 ca người chơi hoàn hảo (seed 3, mức tần suất Ít), mở ca ngày 5, khách đầu gọi Bánh mì ốp la,
// phiếu đã kẹp lên dây.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, seedSave, waitSave, resolveIncidentIfShown } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { startShift, advance } from '../../src/core/shift.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { playedSave } from '../helpers/m4-saves.mjs'
import { counterStep } from '../helpers/perfect-player.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'
import { stepLimitSec } from '../../src/ui/minigames/_util.js'

const SHIFT_AT = '2026-09-30T09:00'
const OPEN_URL = '/?devNow=2026-09-30T09:02'
const BM = DATA.RECIPES.banh_mi_op_la
const REQ = requiredIngredients(BM, []).required
const DECOY = BM.decoys.find(id => BM.shelf.includes(id))

// Ca thật đang dở: khách đầu gọi Bánh mì ốp la, phiếu đã kẹp lên dây. Trả { state, ticket }.
function shiftSave() {
  const { state } = playedSave(3, 4, { name: 'Xe Sửa Lỗi', freq: 'it' })
  const ctx = makeMetaCtx({ at: SHIFT_AT, attach: true })
  ctx.setState(state)
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  const sh = startShift(state, ctx)
  sh.customers[sh.plan[0].customerId].request = [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }]
  for (let guard = 0; sh.tickets.length < 1; guard++) {
    if (guard > 20000) throw new Error('không kẹp được phiếu')
    if (!counterStep(state, ctx)) advance(state, 0.5, ctx)
  }
  return { state, ticket: sh.tickets[0] }
}

// Mở game với save dựng sẵn, sang tab Bếp.
async function openKitchen(g, state) {
  const { page } = g
  await seedSave(page, state)
  await page.goto(g.url(OPEN_URL))
  await page.waitForSelector(T('screen-service'))
  await resolveIncidentIfShown(g, { waitMs: 300 })
  await page.tap(T('tab-kitchen'))
}

// Chạm phiếu trên dây → dòng 0 → bước Chọn.
async function openLine(page, ticketId) {
  await page.tap(T('ticket-' + ticketId))
  await page.tap(T('cook-line-0'))
  await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
  await page.waitForTimeout(150)
}

// Từ bước Chọn: ‹ Phiếu → Bỏ món → xác nhận. Chờ save không còn phiên nấu.
async function abandonFromChon(page) {
  await page.tap(T('kitchen-back'))
  await page.waitForSelector('.k-main[data-view="rail"]')
  await page.tap(T('abandon-dish'))
  await page.tap(T('confirm-ok'))
  return waitSave(page, st => st.shift && !st.shift.cook)
}

const pickedOnShelf = page => page.$$eval('[data-testid^="shelf-"][aria-pressed="true"]', els => els.map(e => e.dataset.ing).sort())

// Lấy đủ nguyên liệu cần, Xong → Thớt. Trả { flash: điểm trên nhãn nổi, save }.
async function pickAllAndDone(page) {
  for (const id of REQ) await page.tap(T('shelf-' + id))
  await page.tap(T('chon-done'))
  const flash = await page.waitForSelector(T('step-result'))
  const score = Number(await flash.getAttribute('data-score'))
  await page.waitForSelector(T('board'))
  const s = await waitSave(page, st => st.shift.cook && st.shift.cook.phase === 'thot')
  return { flash: score, save: s }
}

test('(a) chọn nhầm → Bỏ món → mở lại đúng dòng: rổ trống nhưng mang lần nhầm cũ → Xong → điểm Chọn 85', { timeout: 240000 }, async () => {
  const g = await openGame({ clock: true, name: 'nham-bo-mon', viewport: { width: 360, height: 640 } })
  const { page, errors } = g
  try {
    const { state, ticket } = shiftSave()
    await openKitchen(g, state)
    await openLine(page, ticket.id)
    await page.tap(T('shelf-' + DECOY))
    await waitSave(page, st => st.shift.cook && st.shift.cook.chonDraft && st.shift.cook.chonDraft.mistakes === 1)
    await g.shot('chon-nham')
    const after = await abandonFromChon(page)
    const t1 = after.shift.tickets.find(t => t.id === ticket.id)
    assert.equal(t1.status, 'cho', 'phiếu quay lại dây')
    assert.deepEqual(t1.chonMistakes, [1], 'lần nhầm ghi vào phiếu theo dòng')
    // mở lại đúng dòng: rổ trống (bỏ món vẫn xóa rổ như cũ), lần nhầm còn
    await openLine(page, ticket.id)
    assert.deepEqual(await pickedOnShelf(page), [])
    assert.equal((await page.textContent(T('chon-count'))).trim(), 'Trong rổ: 0')
    const s1 = await waitSave(page, st => st.shift.cook && st.shift.cook.phase === 'chon')
    assert.equal(s1.shift.cook.chonMistakes, 1)
    assert.deepEqual(s1.shift.cook.chonDraft, { picked: [], mistakes: 1 })
    await g.shot('mo-lai')
    const r = await pickAllAndDone(page)
    await g.shot('xong')
    assert.equal(r.flash, 85, 'nhãn nổi: bước Chọn 85 điểm (trước khi sửa: 100)')
    assert.equal(r.save.shift.cook.chonScore, 85)
    assert.equal(r.save.shift.cook.chonMistakes, 1)
    assert.equal('chonMistakes' in r.save.shift.tickets.find(t => t.id === ticket.id), false, 'đã chốt: phiếu không giữ nữa')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('(b) chọn nhầm → Bỏ món → tải lại trang ngay → mở lại: lần nhầm vẫn tính (85 điểm)', { timeout: 240000 }, async () => {
  const g = await openGame({ clock: true, name: 'nham-bo-mon-f5', viewport: { width: 390, height: 844 } })
  const { page, errors } = g
  try {
    const { state, ticket } = shiftSave()
    await openKitchen(g, state)
    await openLine(page, ticket.id)
    await page.tap(T('shelf-' + DECOY))
    await page.tap(T('shelf-' + DECOY))          // bỏ ra: rổ trống, lần nhầm vẫn còn
    await waitSave(page, st => st.shift.cook && st.shift.cook.chonDraft && st.shift.cook.chonDraft.mistakes === 1)
    await abandonFromChon(page)
    // F5 ngay sau khi bỏ món
    await page.reload()
    await page.waitForSelector(T('screen-service'))
    await resolveIncidentIfShown(g, { waitMs: 300 })
    if (!(await page.isVisible(T('panel-kitchen')))) await page.tap(T('tab-kitchen'))
    const s0 = await waitSave(page, st => st.shift && !st.shift.cook)
    assert.deepEqual(s0.shift.tickets.find(t => t.id === ticket.id).chonMistakes, [1], 'tải lại: lần nhầm còn trên phiếu')
    await openLine(page, ticket.id)
    assert.deepEqual(await pickedOnShelf(page), [])
    const s1 = await waitSave(page, st => st.shift.cook && st.shift.cook.phase === 'chon')
    assert.deepEqual(s1.shift.cook.chonDraft, { picked: [], mistakes: 1 })
    const r = await pickAllAndDone(page)
    assert.equal(r.flash, 85)
    assert.equal(r.save.shift.cook.chonScore, 85, 'tải lại sau khi bỏ món không xóa được lần nhầm')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('(c) quá giờ bước Chọn → Bỏ món → mở lại → Xong: phạt quá giờ vẫn tính (85 điểm)', { timeout: 240000 }, async () => {
  const g = await openGame({ clock: true, name: 'qua-gio-bo-mon', viewport: { width: 360, height: 600 } })
  const { page, errors } = g
  try {
    const { state, ticket } = shiftSave()
    await openKitchen(g, state)
    await openLine(page, ticket.id)
    const par = BM.steps.find(s => s.type === 'chon').par
    await page.clock.runFor(Math.ceil(stepLimitSec(par) * 1000) + 2000)
    await waitSave(page, st => st.shift.cook && st.shift.cook.chonDraft && st.shift.cook.chonDraft.overtime === true)
    const after = await abandonFromChon(page)
    assert.deepEqual(after.shift.tickets.find(t => t.id === ticket.id).chonMistakes, [1], 'quá giờ = 1 lần nhầm')
    await openLine(page, ticket.id)
    const r = await pickAllAndDone(page)
    assert.equal(r.flash, 85)
    assert.equal(r.save.shift.cook.chonMistakes, 1)
    assert.equal(r.save.shift.cook.chonScore, 85)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('(d) chọn nhầm → Xong → Bỏ món trên Thớt → mở lại: vẫn mang lần nhầm của lượt đã chốt (85 điểm)', { timeout: 240000 }, async () => {
  const g = await openGame({ clock: true, name: 'nham-bo-mon-thot', viewport: { width: 360, height: 640 } })
  const { page, errors } = g
  try {
    const { state, ticket } = shiftSave()
    await openKitchen(g, state)
    await openLine(page, ticket.id)
    await page.tap(T('shelf-' + DECOY))
    await page.tap(T('shelf-' + DECOY))          // bỏ ra: rổ không còn hàng nhầm, lần nhầm vẫn tính
    await waitSave(page, st => st.shift.cook && st.shift.cook.chonDraft && st.shift.cook.chonDraft.mistakes === 1)
    const first = await pickAllAndDone(page)
    assert.equal(first.flash, 85)
    assert.equal('chonMistakes' in first.save.shift.tickets.find(t => t.id === ticket.id), false, 'đang trên Thớt: phiếu chưa ghi')
    // Bỏ món ngay trên Thớt (nút ở thanh dưới) → xác nhận
    await page.tap(T('abandon-dish'))
    await page.tap(T('confirm-ok'))
    const after = await waitSave(page, st => st.shift && !st.shift.cook)
    assert.deepEqual(after.shift.tickets.find(t => t.id === ticket.id).chonMistakes, [1], 'bỏ trên Thớt: ghi lần nhầm của lượt đã chốt')
    // mở lại: rổ trống (chọn lại từ đầu), lần nhầm còn → lấy đủ, Xong → 85 (trước khi sửa: 100)
    await openLine(page, ticket.id)
    assert.deepEqual(await pickedOnShelf(page), [])
    const s1 = await waitSave(page, st => st.shift.cook && st.shift.cook.phase === 'chon')
    assert.deepEqual(s1.shift.cook.chonDraft, { picked: [], mistakes: 1 })
    const r = await pickAllAndDone(page)
    await g.shot('thot-mo-lai-xong')
    assert.equal(r.flash, 85)
    assert.equal(r.save.shift.cook.chonScore, 85)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
