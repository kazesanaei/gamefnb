// E2E sửa 2 lỗi tồn đọng (giao diện thật, Chromium cảm ứng, CA THẬT: HUD, dải phố, thanh 4 khâu, dây phiếu, thẻ công thức,
// thanh tab Quầy/Bếp ở đáy; mở bằng ?devNow nên còn thêm dải "Giờ giả" 24px — chật hơn máy thật):
//  (a) Bước Nêm nhiều chai (Bánh tráng trộn Tây Ninh: 3 chai; Bánh mì ốp la dặn "Cay": 2 chai) ở 360×600, 360×640,
//      390×844: mọi chai và nút Xong nằm trọn trong khung nhìn, phía trên thanh tab và thanh chân dính; elementFromPoint tại
//      tâm từng chai / nút Xong trúng chính nó; chạm đủ nấc rồi Xong → bước Nêm 100 điểm. (Trước đây ở 360×600–640 nút Xong
//      nằm dưới thanh tab Quầy/Bếp, không bấm được.)
//  (b) Bước Chọn nguyên liệu dở (2 món đúng + 1 lần chọn nhầm) → tải lại trang → rổ và số lần nhầm được khôi phục (lưu ở
//      state.shift.cook.chonDraft) → bỏ món nhầm, lấy đủ, Xong → Thớt sơ chế, điểm Chọn 85.
//  (c) Chọn nhầm rồi bỏ ra (rổ trống) → tải lại ngay → lần nhầm vẫn còn (không dùng tải lại để xóa lần nhầm) → điểm 85.
// Vòng kiểm chứng sau sửa (mục 24):
//  (d) Rổ đầy (Bánh tráng trộn Tây Ninh: 10 nguyên liệu) ở 360×600: rổ cuộn ngang bên trong, bếp không tràn ngang, nút Xong
//      và cột kệ thứ 4 nằm trong khung nhìn (trước đây sân khấu bị rổ kéo rộng 456px, nút Xong lòi ra mép phải).
//  (e) "Click ma" khi chạm cảm ứng: Nhấc của bước lửa (chốt ở pointerdown) không mở nhầm hộp "Bỏ món này?" nằm dưới ngón;
//      chạm thẻ gợi ý đúng chỗ nút Xong sắp hiện không chốt bước Nêm 0 điểm; chạm bảng công bố món không giao nhầm phiếu.
//  (f) Quá giờ bước Chọn rồi đổi tab, tải lại trang: phạt quá giờ vẫn tính (cờ overtime trong rổ dở) → 85 điểm.
//  (g) Màn thấp: ca đông 3 khách chờ (360×600) chai Nêm trọn phía trên thanh chân; bước Chà (rửa dưa leo, gọt xoài) ở
//      360×600 mọi vết bẩn trọn phía trên thanh chân, không phải cuộn.
//  (h) Bước Chà vừa khung: thớt chà co theo chỗ còn lại của sân khấu (vết theo tọa độ chuẩn hóa, vùng chạm ≥ 44px) — ở
//      360×600 (3 khách chờ, kể cả ghi chú "Thêm trứng cút" làm đầu sân khấu cao thêm), 360×640, 390×844: sân khấu không
//      cuộn, mọi vết trọn trong khung giữa đầu sân khấu và thanh chân, elementFromPoint tại tâm từng vết trúng thớt; chà
//      sạch hết bằng cảm ứng thật (touchStart/Move/End) → điểm cao. Bước lắc/xé (xé khô mực, bóp muối) cũng nằm trọn trên
//      thanh chân, vuốt cảm ứng đủ lượt → 100 điểm. (Trước đây ở 360×600 có 3 khách chờ, 1–3 vết nằm dưới thanh chân dính,
//      thớt lắc bị thanh chân che nửa dưới.) Thêm các ca đông khách có ghi chú / phiếu 3 món (Tây Ninh + Thêm trứng cút, Không
//      rau răm; Trà tắc mật ong + Không đá…): đầu sân khấu bước Chà gọn một dòng ở màn ≤ 700px, sàn thớt lắc 56px, sàn
//      thớt vết 44px → vẫn trọn khung, không cuộn.
// Save dựng bằng lõi thật: 4 ca người chơi hoàn hảo (seed 3, mức tần suất Ít), mở ca ngày 5, khách đầu gọi đúng món cần thử,
// phiếu đã kẹp lên dây; (a) nấu sẵn bằng lõi tới khi bước Nêm mở.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, seedSave, waitSave, resolveIncidentIfShown } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { startShift, advance } from '../../src/core/shift.js'
import { newRecipeProgress } from '../../src/core/state.js'
import { startCook, submitChon, availableSteps, getStep, submitStep } from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { playedSave } from '../helpers/m4-saves.mjs'
import { counterStep } from '../helpers/perfect-player.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'
import { stepLimitSec } from '../../src/ui/minigames/_util.js'

const SEED = 3
const SHIFT_AT = '2026-09-30T09:00'
const OPEN_URL = '/?devNow=2026-09-30T09:02'

// Ca thật đang dở: khách đầu gọi `line`, phiếu đã kẹp. stopAt (tùy chọn): nấu sẵn dòng 0 bằng lõi (chọn đủ, các bước 100 điểm)
// tới khi bước stopAt mở ('all': làm hết các bước, chỉ còn Ra món). tickets: số phiếu trên dây (khách sau gọi Trà tắc —
// ca đông, dải phố cao). cooks: số lần đã nấu món (< 3 thì thẻ gợi ý hiện trước mỗi bước). Trả { state, ticket }.
// line.extra (tùy chọn): id các món thêm vào cùng phiếu đầu (phiếu nhiều dòng, dây phiếu cao hơn).
function shiftSave(line, stopAt = null, { tickets = 1, cooks = null } = {}) {
  const { state } = playedSave(SEED, 4, { name: 'Xe Sửa Lỗi', freq: 'it' })
  const R = DATA.RECIPES[line.recipeId]
  const extra = line.extra || []
  if (!state.recipes[line.recipeId]) state.recipes[line.recipeId] = newRecipeProgress(0)
  if (cooks !== null) state.recipes[line.recipeId].cooks = cooks
  for (const rid of [line.recipeId, ...extra]) {
    if (!state.recipes[rid]) state.recipes[rid] = newRecipeProgress(0)
    for (const ing of Object.keys(DATA.RECIPES[rid].rare || {})) state.rare.stock[ing] = Math.max(Number(state.rare.stock[ing]) || 0, 4)
  }
  const ctx = makeMetaCtx({ at: SHIFT_AT, attach: true })
  ctx.setState(state)
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  const sh = startShift(state, ctx)
  for (let i = 0; i < tickets; i++) {
    sh.customers[sh.plan[i].customerId].request = i === 0
      ? [{ recipeId: line.recipeId, qty: 1, notes: (line.notes || []).slice() }, ...extra.map(rid => ({ recipeId: rid, qty: 1, notes: [] }))]
      : [{ recipeId: 'tra_tac', qty: 1, notes: [] }]
  }
  for (let guard = 0; sh.tickets.length < tickets; guard++) {
    if (guard > 20000) throw new Error('không kẹp đủ phiếu')
    if (!counterStep(state, ctx)) advance(state, 0.5, ctx)
  }
  const ticket = sh.tickets[0]
  if (stopAt) {
    const cook = startCook(state, ticket.id, 0, ctx)
    if (!submitChon(state, requiredIngredients(R, cook.notes).required, 0, ctx).ok) throw new Error('chọn bị chặn')
    const more = () => (stopAt === 'all' ? availableSteps(state).length > 0 : !availableSteps(state).includes(stopAt))
    for (let k = 0; more(); k++) {
      const av = availableSteps(state)
      if (!av.length || k > 30) throw new Error('không tới được bước ' + stopAt)
      const st = getStep(state, av[0])
      submitStep(state, av[0], { score: 100, method: st.method ? st.method.correct : undefined }, ctx)
    }
  }
  return { state, ticket }
}

// Mở game với save dựng sẵn tới màn ca bán, sang tab Bếp (Thớt sơ chế hoặc dây phiếu).
async function openShiftKitchen(g, state) {
  const { page } = g
  await seedSave(page, state)
  await page.goto(g.url(OPEN_URL))
  await page.waitForSelector(T('screen-service'))
  await resolveIncidentIfShown(g, { waitMs: 300 })
  await page.tap(T('tab-kitchen'))
}

// Mở một bước trên Thớt (bảng chọn cách → "Tự tay làm"; thẻ gợi ý: để nguyên khi keepHint).
async function openBoardStep(page, stepId, { keepHint = false } = {}) {
  await page.click(T('board-step-' + stepId))
  const sheet = await page.waitForSelector(T('step-sheet'), { timeout: 500 }).catch(() => null)
  if (sheet) await page.click(T('step-start'))
  if (keepHint) return
  const hint = await page.waitForSelector(T('step-hint'), { timeout: 500 }).catch(() => null)
  if (hint) await hint.tap().catch(() => {})
  await page.waitForSelector(T('minigame-stage'))
  await page.waitForTimeout(200)
}

// Tâm phần tử (tọa độ khung nhìn) — để chạm bằng touchscreen.tap, không để Playwright tự cuộn.
const centerOf = (page, sel) => page.$eval(sel, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })

// Đo các chai, nút Xong so với thanh chân dính, thanh tab và khung nhìn; elementFromPoint tại tâm từng phần tử.
async function measureNem(page) {
  return page.evaluate(() => {
    const st = document.querySelector('[data-testid="minigame-stage"][data-type="cham"]')
    const tab = document.querySelector('.tabbar').getBoundingClientRect()
    const foot = st.querySelector('.mg-foot').getBoundingClientRect()
    const sub = st.querySelector('.mg-sub').getBoundingClientRect()
    const box = el => {
      const r = el.getBoundingClientRect()
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { id: el.dataset.testid, top: r.top, bottom: r.bottom, left: r.left, right: r.right, hit: !!(at && (at === el || el.contains(at))) }
    }
    return {
      vw: innerWidth, vh: innerHeight, tabTop: tab.top, footTop: foot.top, subBottom: sub.bottom,
      bottles: [...st.querySelectorAll('[data-testid^="cham-bottle-"]')].map(box),
      done: box(st.querySelector('[data-testid="cham-done"]'))
    }
  })
}

const NEM_CASES = [
  { vp: { width: 360, height: 600 }, line: { recipeId: 'banh_trang_tron_tay_ninh', notes: [] } },
  { vp: { width: 360, height: 600 }, line: { recipeId: 'banh_mi_op_la', notes: ['cay'] } },
  { vp: { width: 360, height: 640 }, line: { recipeId: 'banh_trang_tron_tay_ninh', notes: [] } },
  { vp: { width: 360, height: 640 }, line: { recipeId: 'banh_mi_op_la', notes: ['cay'] } },
  { vp: { width: 390, height: 844 }, line: { recipeId: 'banh_trang_tron_tay_ninh', notes: [] } }
]

for (const c of NEM_CASES) {
  const label = `${c.vp.width}×${c.vp.height} ${c.line.recipeId}${c.line.notes.length ? ' (' + c.line.notes.join(',') + ')' : ''}`
  test(`(a) ca thật ${label}: bước Nêm nhiều chai — mọi chai và nút Xong thấy và bấm được, không bị thanh tab che`, { timeout: 240000 }, async () => {
    const g = await openGame({ clock: true, name: `nem-${c.vp.width}x${c.vp.height}-${c.line.recipeId}`, viewport: c.vp })
    const { page, errors } = g
    try {
      const { state, ticket } = shiftSave(c.line, 'nem')
      const targets = state.shift.cook.board.find(s => s.id === 'nem').params.targets
      assert.ok(Object.keys(targets).length >= 2, 'bước Nêm nhiều chai')
      await seedSave(page, state)
      await page.goto(g.url(OPEN_URL))
      await page.waitForSelector(T('screen-service'))
      await resolveIncidentIfShown(g, { waitMs: 300 })
      await page.tap(T('tab-kitchen'))
      // phiên nấu đang ở Thớt sơ chế (thẻ công thức, dây phiếu, thanh tab đều hiện)
      await page.waitForSelector(T('board'))
      assert.ok(await page.isVisible(T('recipe-card')))
      assert.ok(await page.isVisible(T('rail-ticket-' + ticket.id)))
      await page.click(T('board-step-nem'))
      const sheet = await page.waitForSelector(T('step-sheet'), { timeout: 500 }).catch(() => null)
      if (sheet) await page.click(T('step-start'))
      const hint = await page.waitForSelector(T('step-hint'), { timeout: 500 }).catch(() => null)
      if (hint) await hint.tap().catch(() => {})
      await page.waitForSelector(`${T('minigame-stage')}[data-type="cham"] ${T('cham-done')}`)
      await page.waitForTimeout(300)
      const m = await measureNem(page)
      await g.shot('nem')
      assert.equal(m.bottles.length, Object.keys(targets).length)
      for (const b of [...m.bottles, m.done]) {
        assert.ok(b.top >= 0 && b.bottom <= m.vh && b.left >= 0 && b.right <= m.vw, `${b.id} nằm trong khung nhìn`)
        assert.ok(b.bottom <= m.tabTop + 0.5, `${b.id} phía trên thanh tab (đáy ${b.bottom}, thanh tab ${m.tabTop})`)
        assert.ok(b.hit, `tâm ${b.id} bấm được (elementFromPoint)`)
      }
      for (const b of m.bottles) {
        assert.ok(b.bottom <= m.footTop + 0.5, `${b.id} không bị thanh chân che`)
        assert.ok(b.top >= m.subBottom - 0.5, `${b.id} không đè chữ hướng dẫn`)
      }
      // chạm đủ nấc từng chai rồi Xong
      for (const [id, n] of Object.entries(targets)) for (let k = 0; k < n; k++) await page.tap(T('cham-bottle-' + id))
      await page.click(T('cham-done'), { timeout: 3000 })
      await page.waitForSelector(`${T('board-step-nem')}.is-done`, { timeout: 5000 })
      const s = await waitSave(page, st => st.shift && st.shift.cook && st.shift.cook.steps.nem)
      assert.equal(s.shift.cook.steps.nem.score, 100, 'Nêm đúng nấc: 100 điểm')
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// Mở bếp tới bước Chọn của phiếu đầu (ca thật).
async function openChon(g, ticketId) {
  const { page } = g
  await resolveIncidentIfShown(g, { waitMs: 300 })
  await page.tap(T('tab-kitchen'))
  await page.click(T('ticket-' + ticketId))
  await page.click(T('cook-line-0'))
  await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
}

// Tải lại trang giữa ca: màn ca bán mở lại, sang Bếp → bước Chọn hiện ngay (phiên nấu đang ở bước Chọn).
async function reloadToChon(page) {
  await page.reload()
  await page.waitForSelector(T('screen-service'))
  if (!(await page.isVisible(T('panel-kitchen')))) await page.tap(T('tab-kitchen'))
  await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
  await page.waitForTimeout(200)
}

const pickedOnShelf = page => page.$$eval('[data-testid^="shelf-"][aria-pressed="true"]', els => els.map(e => e.dataset.ing).sort())

const BM = DATA.RECIPES.banh_mi_op_la
const REQ = requiredIngredients(BM, []).required
const DECOY = BM.decoys.find(id => BM.shelf.includes(id))

test('(b) Chọn dở (2 món + 1 lần nhầm) → tải lại trang → rổ và số lần nhầm được khôi phục → Xong → Thớt sơ chế', { timeout: 240000 }, async () => {
  const g = await openGame({ clock: true, name: 'chon-tai-lai', viewport: { width: 360, height: 640 } })
  const { page, errors } = g
  try {
    const { state, ticket } = shiftSave({ recipeId: 'banh_mi_op_la', notes: [] })
    await seedSave(page, state)
    await page.goto(g.url(OPEN_URL))
    await page.waitForSelector(T('screen-service'))
    await openChon(g, ticket.id)
    const picks = [REQ[0], REQ[1], DECOY]
    for (const id of picks) await page.click(T('shelf-' + id))
    const mid = await waitSave(page, st => st.shift.cook && st.shift.cook.chonDraft && st.shift.cook.chonDraft.picked.length === 3)
    assert.deepEqual(mid.shift.cook.chonDraft.picked.slice().sort(), picks.slice().sort())
    assert.equal(mid.shift.cook.chonDraft.mistakes, 1)
    await g.shot('chon-truoc-tai-lai')
    await reloadToChon(page)
    // rổ khôi phục đúng: 3 ô đã chọn, huy hiệu rổ, số đếm
    assert.deepEqual(await pickedOnShelf(page), picks.slice().sort())
    assert.equal((await page.textContent(T('chon-count'))).trim(), 'Trong rổ: 3')
    assert.equal(await page.$$eval(`${T('chon-basket')} .chon-in`, els => els.length), 3)
    await g.shot('chon-sau-tai-lai')
    // bỏ món nhầm ra, lấy đủ món đúng, Xong
    await page.click(T('shelf-' + DECOY))
    for (const id of REQ.slice(2)) await page.click(T('shelf-' + id))
    await page.click(T('chon-done'))
    await page.waitForSelector(T('board'))
    const s = await waitSave(page, st => st.shift.cook && st.shift.cook.phase === 'thot')
    assert.equal(s.shift.cook.chonMistakes, 1, 'lần chọn nhầm trước khi tải lại vẫn tính')
    assert.equal(s.shift.cook.chonScore, 85)
    assert.equal('chonDraft' in s.shift.cook, false, 'chốt bước Chọn: rổ dở đã xóa')
    assert.deepEqual(s.shift.cook.picked.slice().sort(), REQ.slice().sort())
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('(c) chọn nhầm rồi bỏ ra → tải lại ngay → lần nhầm không bị xóa (85 điểm, không phải 100)', { timeout: 240000 }, async () => {
  const g = await openGame({ clock: true, name: 'chon-gian-lan', viewport: { width: 390, height: 844 } })
  const { page, errors } = g
  try {
    const { state, ticket } = shiftSave({ recipeId: 'banh_mi_op_la', notes: [] })
    await seedSave(page, state)
    await page.goto(g.url(OPEN_URL))
    await page.waitForSelector(T('screen-service'))
    await openChon(g, ticket.id)
    await page.click(T('shelf-' + DECOY))
    await page.click(T('shelf-' + DECOY))           // bỏ ra: rổ trống
    assert.deepEqual(await pickedOnShelf(page), [])
    // tải lại ngay (không chờ): chọn nhầm được ghi save ngay lúc chạm
    await reloadToChon(page)
    assert.deepEqual(await pickedOnShelf(page), [], 'rổ trống như lúc rời')
    const s1 = await waitSave(page, st => st.shift.cook && st.shift.cook.phase === 'chon')
    assert.equal(s1.shift.cook.chonDraft.mistakes, 1, 'lần nhầm vẫn còn sau khi tải lại')
    for (const id of REQ) await page.click(T('shelf-' + id))
    await page.click(T('chon-done'))
    await page.waitForSelector(T('board'))
    const s2 = await waitSave(page, st => st.shift.cook && st.shift.cook.phase === 'thot')
    assert.equal(s2.shift.cook.chonMistakes, 1)
    assert.equal(s2.shift.cook.chonScore, 85, 'tải lại không xóa được lần chọn nhầm')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

// ---------- Vòng kiểm chứng sau sửa ----------

const TN = DATA.RECIPES.banh_trang_tron_tay_ninh
const REQ_TN = requiredIngredients(TN, []).required

test('(d) rổ đầy (Tây Ninh, 10 nguyên liệu) ở 360×600: rổ cuộn ngang bên trong, bếp không tràn ngang, nút Xong và kệ trong khung', { timeout: 240000 }, async () => {
  const g = await openGame({ clock: true, name: 'chon-ro-day', viewport: { width: 360, height: 600 } })
  const { page, errors } = g
  try {
    assert.ok(REQ_TN.length >= 8, 'món nhiều nguyên liệu')
    const { state, ticket } = shiftSave({ recipeId: 'banh_trang_tron_tay_ninh', notes: [] })
    await seedSave(page, state)
    await page.goto(g.url(OPEN_URL))
    await page.waitForSelector(T('screen-service'))
    await openChon(g, ticket.id)
    for (const id of REQ_TN) {
      // ô bị che (thanh chân dính / ngoài khung) thì cuộn dọc bếp như người chơi vuốt, rồi chạm theo tọa độ
      await page.$eval(T('shelf-' + id), e => {
        const r = e.getBoundingClientRect()
        const foot = document.querySelector('.mg-chon .mg-foot').getBoundingClientRect()
        if (r.top < 0 || r.bottom > foot.top) e.scrollIntoView({ block: 'center' })
      })
      const c = await centerOf(page, T('shelf-' + id))
      await page.touchscreen.tap(c.x, c.y)
    }
    await page.waitForTimeout(200)
    const m = await page.evaluate(() => {
      const km = document.querySelector('.k-main')
      const st = document.querySelector('[data-testid="minigame-stage"][data-type="chon"]')
      const basket = document.querySelector('[data-testid="chon-basket"]')
      const br = basket.getBoundingClientRect()
      const last = [...basket.querySelectorAll('.chon-in')].pop().getBoundingClientRect()
      const done = document.querySelector('[data-testid="chon-done"]')
      const d = done.getBoundingClientRect()
      const at = document.elementFromPoint(d.left + d.width / 2, d.top + d.height / 2)
      const cells = [...document.querySelectorAll('[data-testid^="shelf-"]')].map(e => e.getBoundingClientRect())
      return {
        vw: innerWidth, vh: innerHeight, tabTop: document.querySelector('.tabbar').getBoundingClientRect().top,
        kmSW: km.scrollWidth, kmCW: km.clientWidth, docSW: document.documentElement.scrollWidth, stageW: st.getBoundingClientRect().width,
        basketSW: basket.scrollWidth, basketCW: basket.clientWidth, inCount: basket.querySelectorAll('.chon-in').length,
        lastIn: { left: last.left, right: last.right }, basket: { left: br.left, right: br.right },
        done: { left: d.left, right: d.right, top: d.top, bottom: d.bottom }, doneHit: !!(at && done.contains(at)),
        cellsMaxRight: Math.max(...cells.map(r => r.right))
      }
    })
    await g.shot('ro-day')
    assert.equal(m.inCount, REQ_TN.length)
    assert.ok(m.kmSW <= m.kmCW + 1, `bếp không tràn ngang (scrollWidth ${m.kmSW}, clientWidth ${m.kmCW})`)
    assert.ok(m.docSW <= m.vw + 1, 'trang không cuộn ngang')
    assert.ok(m.stageW <= m.kmCW, `sân khấu Chọn không rộng hơn bếp (${m.stageW})`)
    assert.ok(m.basketSW > m.basketCW, 'rổ đầy cuộn ngang bên trong rổ')
    assert.ok(m.lastIn.right <= m.basket.right + 1 && m.lastIn.left >= m.basket.left - 1, 'món vừa bỏ vào thấy được trong rổ')
    assert.ok(m.cellsMaxRight <= m.vw + 0.5, `cột kệ cuối nằm trong khung (${m.cellsMaxRight})`)
    assert.ok(m.done.left >= 0 && m.done.right <= m.vw && m.done.bottom <= m.tabTop + 0.5, 'nút Xong trong khung, trên thanh tab')
    assert.ok(m.doneHit, 'tâm nút Xong bấm được')
    const c = await centerOf(page, T('chon-done'))
    await page.touchscreen.tap(c.x, c.y)
    await page.waitForSelector(T('board'))
    const s = await waitSave(page, st => st.shift.cook && st.shift.cook.phase === 'thot')
    assert.equal(s.shift.cook.chonScore, 100)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('(e1) chạm Nhấc (bước lửa, chốt ở pointerdown) bằng cảm ứng: không mở nhầm hộp "Bỏ món này?" nằm dưới ngón tay', { timeout: 240000 }, async () => {
  const g = await openGame({ clock: true, name: 'click-ma-nhac', viewport: { width: 390, height: 844 } })
  const { page, errors } = g
  try {
    const { state } = shiftSave({ recipeId: 'banh_mi_op_la', notes: [] }, 'chien_trung', { cooks: 5 })
    await openShiftKitchen(g, state)
    await page.waitForSelector(T('board'))
    await openBoardStep(page, 'chien_trung')
    await page.waitForSelector(`${T('minigame-stage')}[data-type="lua"] ${T('lua-lift')}`)
    await page.waitForFunction(() => { const n = document.querySelector('[data-testid="lua-needle"]'); return n && n.classList.contains('is-in') }, null, { timeout: 15000 })
    const c = await centerOf(page, T('lua-lift'))
    await page.touchscreen.tap(c.x, c.y)
    await page.waitForSelector(`${T('board-step-chien_trung')}.is-done`, { timeout: 5000 })
    await page.waitForTimeout(500)
    await g.shot('sau-nhac')
    // so giá trị đúng/sai (không so ElementHandle: assert in đối tượng Playwright rất lớn khi trượt)
    assert.equal(!!(await page.$(T('confirm-ok'))), false, 'không hiện hộp "Bỏ món này?"')
    assert.equal(!!(await page.$(T('step-sheet'))), false, 'không mở bảng chọn bước')
    // ngay dưới ngón tay (chỗ nút Nhấc vừa đóng) là nút "Bỏ món" của Thớt: kịch bản click ma có thật
    const under = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest('[data-testid="abandon-dish"]')) }, [c.x, c.y])
    assert.ok(under, 'nút "Bỏ món" nằm dưới chỗ chạm Nhấc')
    const s = await waitSave(page, st => st.shift.cook && st.shift.cook.steps.chien_trung)
    assert.ok(s.shift.cook.steps.chien_trung.score > 0, 'bước lửa đã chấm')
    assert.equal(s.shift.cook.phase, 'thot', 'món vẫn đang làm')
    // chạm mới lên "Bỏ món" vẫn hoạt động như thường (không chặn nhầm lần chạm sau)
    await page.touchscreen.tap(c.x, c.y)
    await page.waitForSelector(T('confirm-ok'))
    await page.click(T('confirm-cancel'))
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('(e2) chạm thẻ gợi ý đúng chỗ nút Xong sắp hiện: bước Nêm mở bình thường, không bị chốt 0 điểm', { timeout: 240000 }, async () => {
  const g = await openGame({ clock: true, name: 'click-ma-goi-y', viewport: { width: 360, height: 640 } })
  const { page, errors } = g
  try {
    const { state } = shiftSave({ recipeId: 'banh_trang_tron_tay_ninh', notes: [] }, 'nem', { cooks: 0 })
    const targets = state.shift.cook.board.find(s => s.id === 'nem').params.targets
    await openShiftKitchen(g, state)
    await page.waitForSelector(T('board'))
    await openBoardStep(page, 'nem', { keepHint: true })
    await page.waitForSelector(T('step-hint'))
    // dừng đồng hồ trang để thẻ gợi ý không tự đóng (0,8 giây) trước lần chạm
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 10))
    const p = await page.$eval('.k-stage-wrap', e => { const r = e.getBoundingClientRect(); return { x: r.right - 64, y: r.bottom - 28 } })
    await page.touchscreen.tap(p.x, p.y)
    await page.clock.resume()
    await page.waitForSelector(`${T('minigame-stage')}[data-type="cham"] ${T('cham-done')}`)
    await page.waitForTimeout(500)
    // chỗ vừa chạm thẻ gợi ý giờ là nút Xong
    const onDone = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest('[data-testid="cham-done"]')) }, [p.x, p.y])
    assert.ok(onDone, 'nút Xong nằm dưới chỗ chạm thẻ gợi ý')
    assert.ok(!!(await page.$(`${T('minigame-stage')}[data-type="cham"]`)), 'mini-game Nêm vẫn mở')
    const mid = await waitSave(page, st => st.shift.cook && st.shift.cook.phase === 'thot')
    assert.equal(mid.shift.cook.steps.nem, undefined, 'bước Nêm chưa bị chốt')
    for (const [id, n] of Object.entries(targets)) for (let k = 0; k < n; k++) await page.tap(T('cham-bottle-' + id))
    await page.click(T('cham-done'))
    const s = await waitSave(page, st => st.shift.cook && st.shift.cook.steps.nem)
    assert.equal(s.shift.cook.steps.nem.score, 100)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

// Bản 0.4.1 (mục 28): bảng công bố món nằm ở lớp nổi gốc của app, giữa cả khung (không còn giữa panel Bếp) — ở 360×640 nút
// "Giao cho khách" đã nằm dưới mép bảng, không còn dưới bảng; khung cao 390×844 thì nút vẫn nằm dưới bảng → thử ở khung này.
test('(e3) chạm bảng công bố món (đóng ở pointerdown): không giao nhầm phiếu nằm dưới ngón tay', { timeout: 240000 }, async () => {
  const g = await openGame({ clock: true, name: 'click-ma-cong-bo', viewport: { width: 390, height: 844 } })
  const { page, errors } = g
  try {
    const { state, ticket } = shiftSave({ recipeId: 'banh_mi_op_la', notes: [] }, 'all', { cooks: 5 })
    await openShiftKitchen(g, state)
    await page.waitForSelector(T('board'))
    await page.click(T('finish-dish'))
    await page.waitForSelector(T('dish-reveal'))
    // dừng đồng hồ trang để bảng công bố không tự đóng (1,2 giây) trước lần chạm; chờ hoạt ảnh phóng to của bảng (CSS,
    // không theo đồng hồ trang) xong để khung bảng đứng yên
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 10))
    await page.waitForTimeout(1400)
    await g.shot('cong-bo')
    // điểm trên bảng công bố mà ngay dưới (dây phiếu) là nút "Giao cho khách"
    const p = await page.evaluate(() => {
      const reveal = document.querySelector('[data-testid="dish-reveal"]')
      const r = reveal.getBoundingClientRect()
      // lớp chứa bảng công bố (lớp nổi của bếp, nằm ở lớp nổi gốc của app)
      const layer = reveal.closest('.k-layer')
      layer.style.visibility = 'hidden'
      let hit = null
      for (let y = r.top + 8; y < r.bottom - 4 && !hit; y += 6) {
        const e = document.elementFromPoint(r.left + r.width / 2, y)
        if (e && e.closest('[data-testid="serve-ticket"]')) hit = { x: r.left + r.width / 2, y }
      }
      layer.style.visibility = ''
      return hit
    })
    assert.ok(p, 'nút "Giao cho khách" nằm dưới bảng công bố món')
    await page.touchscreen.tap(p.x, p.y)
    await page.clock.resume()
    await page.waitForSelector(T('dish-reveal'), { state: 'detached' })
    await page.waitForTimeout(500)
    await g.shot('sau-cham-cong-bo')
    const s = await waitSave(page, st => st.shift && st.shift.cook && st.shift.cook.phase === 'xong')
    const t = s.shift.tickets.find(x => x.id === ticket.id)
    assert.ok(t && t.status === 'xong', 'phiếu chưa bị giao nhầm')
    assert.ok(!!(await page.$(T('serve-ticket'))), 'nút "Giao cho khách" vẫn còn')
    // chạm mới thì giao được
    await page.touchscreen.tap(p.x, p.y)
    await waitSave(page, st => !st.shift.tickets.some(x => x.id === ticket.id))
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('(f) quá giờ bước Chọn rồi đổi tab và tải lại trang: phạt quá giờ vẫn tính (85 điểm)', { timeout: 240000 }, async () => {
  const g = await openGame({ clock: true, name: 'chon-qua-gio', viewport: { width: 390, height: 844 } })
  const { page, errors } = g
  try {
    const { state, ticket } = shiftSave({ recipeId: 'banh_mi_op_la', notes: [] })
    await seedSave(page, state)
    await page.goto(g.url(OPEN_URL))
    await page.waitForSelector(T('screen-service'))
    await openChon(g, ticket.id)
    for (const id of REQ) await page.click(T('shelf-' + id))
    const par = BM.steps.find(s => s.type === 'chon').par
    await page.clock.runFor(Math.ceil(stepLimitSec(par) * 1000) + 2000)
    const s1 = await waitSave(page, st => st.shift.cook && st.shift.cook.chonDraft && st.shift.cook.chonDraft.overtime === true)
    assert.equal(s1.shift.cook.chonDraft.picked.length, REQ.length)
    // đổi tab rồi quay lại: rổ còn, phạt còn
    await page.tap(T('tab-counter'))
    await page.waitForTimeout(200)
    await resolveIncidentIfShown(g, { waitMs: 300 })
    await page.tap(T('tab-kitchen'))
    await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
    // tải lại trang: rổ còn, phạt còn
    await reloadToChon(page)
    assert.deepEqual(await pickedOnShelf(page), REQ.slice().sort())
    await page.click(T('chon-done'))
    await page.waitForSelector(T('board'))
    const s = await waitSave(page, st => st.shift.cook && st.shift.cook.phase === 'thot')
    assert.equal(s.shift.cook.chonMistakes, 1, 'quá giờ: +1 lần nhầm, tải lại / đổi tab không xóa được')
    assert.equal(s.shift.cook.chonScore, 85)
    assert.equal('chonDraft' in s.shift.cook, false)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('(g1) ca đông 3 khách chờ ở 360×600: chai Nêm trọn phía trên thanh chân (sân khấu tự cuộn vừa đủ), Nêm 100 điểm', { timeout: 240000 }, async () => {
  const g = await openGame({ clock: true, name: 'nem-ca-dong', viewport: { width: 360, height: 600 } })
  const { page, errors } = g
  try {
    const { state } = shiftSave({ recipeId: 'banh_trang_tron_tay_ninh', notes: [] }, 'nem', { tickets: 3, cooks: 5 })
    const targets = state.shift.cook.board.find(s => s.id === 'nem').params.targets
    await openShiftKitchen(g, state)
    await page.waitForSelector(T('board'))
    await openBoardStep(page, 'nem')
    await page.waitForSelector(`${T('minigame-stage')}[data-type="cham"] ${T('cham-done')}`)
    const m = await measureNem(page)
    await g.shot('nem-3-khach')
    assert.equal(m.bottles.length, Object.keys(targets).length)
    for (const b of [...m.bottles, m.done]) {
      assert.ok(b.top >= 0 && b.bottom <= m.tabTop + 0.5, `${b.id} trong khung, trên thanh tab`)
      assert.ok(b.hit, `tâm ${b.id} bấm được`)
    }
    for (const b of m.bottles) assert.ok(b.bottom <= m.footTop + 0.5, `${b.id} trọn phía trên thanh chân (đáy ${b.bottom}, thanh chân ${m.footTop})`)
    for (const [id, n] of Object.entries(targets)) {
      const c = await centerOf(page, T('cham-bottle-' + id))
      for (let k = 0; k < n; k++) await page.touchscreen.tap(c.x, c.y)
    }
    const d = await centerOf(page, T('cham-done'))
    await page.touchscreen.tap(d.x, d.y)
    const s = await waitSave(page, st => st.shift.cook && st.shift.cook.steps.nem)
    assert.equal(s.shift.cook.steps.nem.score, 100)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

for (const c of [
  { recipeId: 'banh_mi_op_la', stepId: 'rua_dua' },
  { recipeId: 'banh_trang_tron_tay_ninh', stepId: 'got_xoai' }
]) {
  test(`(g2) bước Chà ${c.stepId} ở 360×600: mọi vết bẩn trọn phía trên thanh chân, chà sạch không phải tự cuộn`, { timeout: 240000 }, async () => {
    const g = await openGame({ clock: true, name: 'cha-' + c.stepId, viewport: { width: 360, height: 600 } })
    const { page, errors } = g
    try {
      const { state } = shiftSave({ recipeId: c.recipeId, notes: [] }, c.stepId, { cooks: 5 })
      await openShiftKitchen(g, state)
      await page.waitForSelector(T('board'))
      await openBoardStep(page, c.stepId)
      await page.waitForSelector(`${T('minigame-stage')}[data-type="cha"] ${T('cha-area')}`)
      const m = await page.evaluate(() => {
        const st = document.querySelector('[data-testid="minigame-stage"]')
        const foot = st.querySelector('.mg-foot').getBoundingClientRect()
        const sr = st.getBoundingClientRect()
        const pad = st.querySelector('[data-testid="cha-area"]')
        return {
          over: st.scrollHeight - st.clientHeight, footTop: foot.top, stageTop: sr.top,
          spots: [...st.querySelectorAll('.cha-spot')].map(e => {
            const r = e.getBoundingClientRect()
            const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
            return { id: e.dataset.testid, x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, bottom: r.bottom, hit: !!(at && pad.contains(at)) }
          })
        }
      })
      await g.shot('cha')
      assert.ok(m.over <= 1, `thớt chà vừa chỗ còn lại: sân khấu không phải cuộn (thừa ${m.over}px)`)
      assert.ok(m.spots.length >= 3)
      for (const sp of m.spots) {
        assert.ok(sp.top >= m.stageTop - 0.5 && sp.bottom <= m.footTop + 0.5, `${sp.id} trọn phía trên thanh chân (${sp.top}–${sp.bottom}, thanh chân ${m.footTop})`)
        assert.ok(sp.hit, `${sp.id} nằm trên chỗ chà`)
      }
      // chà từng vết (kéo qua lại tại chỗ, không cuộn)
      for (const sp of m.spots) {
        await page.mouse.move(sp.x - 24, sp.y)
        await page.mouse.down()
        for (let k = 0; k < 5; k++) {
          await page.mouse.move(sp.x + 24, sp.y, { steps: 4 })
          await page.mouse.move(sp.x - 24, sp.y, { steps: 4 })
        }
        await page.mouse.up()
      }
      const s = await waitSave(page, st => st.shift.cook && st.shift.cook.steps[c.stepId])
      assert.ok(s.shift.cook.steps[c.stepId].score >= 90, `chà sạch mọi vết: ${s.shift.cook.steps[c.stepId].score} điểm`)
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// ---------- (h) Bước Chà vừa khung ở màn thấp ----------

// Vuốt cảm ứng thật qua CDP (touchStart → touchMove… → touchEnd): Chromium sinh pointer events loại touch như ngón tay.
// Mỗi điểm cách nhau ~1 khung hình để pointermove không bị gộp mất các lần đổi chiều.
async function touchSwipe(page, cdp, points) {
  const [first, ...rest] = points
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: first.x, y: first.y }] })
  for (const p of rest) {
    await page.waitForTimeout(12)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y }] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

// Đóng băng đồng hồ trang trong lúc vuốt: mỗi sự kiện chạm qua CDP chậm hơn ngón tay thật (nhất là khi máy chạy bận) nên
// điểm chỉ phản ánh độ sạch / số lượt, không phụ thuộc tốc độ của bộ test (phạt chậm > 2 × par không phải điều cần đo ở đây).
async function freezePageClock(page) {
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 60)
}

// Đo sân khấu Chà: tràn cuộn, đầu sân khấu, thanh chân, thanh tab, thớt và từng vết (elementFromPoint tại tâm).
async function measureCha(page) {
  return page.evaluate(() => {
    const st = document.querySelector('[data-testid="minigame-stage"][data-type="cha"]')
    const pad = st.querySelector('[data-testid="cha-area"]')
    const rect = e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height } }
    const hitsPad = (x, y) => { const at = document.elementFromPoint(x, y); return !!(at && (at === pad || pad.contains(at))) }
    const p = rect(pad)
    return {
      vw: innerWidth, vh: innerHeight, over: st.scrollHeight - st.clientHeight, scrollTop: st.scrollTop,
      head: rect(st.querySelector('.mg-head')), foot: rect(st.querySelector('.mg-foot')),
      tab: rect(document.querySelector('.tabbar')), pad: p,
      padHits: [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5], [0.5, 0.2], [0.5, 0.8]].map(([fx, fy]) => hitsPad(p.left + p.width * fx, p.top + p.height * fy)),
      spots: [...st.querySelectorAll('.cha-spot')].map(e => {
        const r = rect(e)
        const x = r.left + r.width / 2
        const y = r.top + r.height / 2
        return { id: e.dataset.testid, x, y, size: r.width, top: r.top, bottom: r.bottom, left: r.left, right: r.right, hit: hitsPad(x, y) }
      })
    }
  })
}

// Kiểm tra chung: không cuộn, thớt và mọi vết nằm trọn giữa đầu sân khấu và thanh chân, trong khung nhìn, trên thanh tab.
function assertChaFits(m, label) {
  assert.ok(m.over <= 1 && m.scrollTop === 0, `${label}: sân khấu không phải cuộn (thừa ${m.over}px, đã cuộn ${m.scrollTop})`)
  assert.ok(m.foot.bottom <= m.tab.top + 0.5, `${label}: thanh chân trên thanh tab`)
  assert.ok(m.pad.top >= m.head.bottom - 0.5 && m.pad.bottom <= m.foot.top + 0.5, `${label}: thớt trọn giữa đầu sân khấu và thanh chân (${m.pad.top}–${m.pad.bottom}, chân ${m.foot.top})`)
  assert.ok(m.pad.left >= 0 && m.pad.right <= m.vw + 0.5, `${label}: thớt không lòi ra mép`)
  for (const sp of m.spots) {
    assert.ok(sp.top >= m.head.bottom - 0.5 && sp.bottom <= m.foot.top + 0.5, `${label}: ${sp.id} trọn phía trên thanh chân (${sp.top}–${sp.bottom}, chân ${m.foot.top})`)
    assert.ok(sp.left >= 0 && sp.right <= m.vw + 0.5 && sp.bottom <= m.vh, `${label}: ${sp.id} trong khung nhìn`)
    assert.ok(sp.hit, `${label}: tâm ${sp.id} trúng thớt (bấm được)`)
    // vùng chạm = bán kính vết + 10 (theo tỉ lệ) → đường kính = 4/3 cỡ vết, tối thiểu 44px
    assert.ok(sp.size * 4 / 3 >= 44 - 0.5, `${label}: ${sp.id} vùng chạm ${(sp.size * 4 / 3).toFixed(1)}px ≥ 44px`)
  }
}

const CHA_FIT_CASES = [
  { vp: { width: 360, height: 600 }, tickets: 3, recipeId: 'banh_mi_op_la', stepId: 'rua_dua' },
  { vp: { width: 360, height: 600 }, tickets: 3, recipeId: 'banh_trang_tron', stepId: 'got_xoai' },
  { vp: { width: 360, height: 600 }, tickets: 3, recipeId: 'banh_trang_tron', stepId: 'boc_trung_cut', notes: ['them_trung_cut'] },
  { vp: { width: 360, height: 640 }, tickets: 3, recipeId: 'che_buoi', stepId: 'got_vo' },
  { vp: { width: 360, height: 640 }, tickets: 1, recipeId: 'banh_trang_tron', stepId: 'got_xoai' },
  { vp: { width: 390, height: 844 }, tickets: 3, recipeId: 'banh_mi_op_la', stepId: 'rua_dua' },
  // ca đông + phiếu có ghi chú (dây phiếu và đầu sân khấu cao hơn): trước vòng kiểm chứng thớt chạm sàn 48px, sân khấu tràn
  // 14–18px phải tự cuộn, vùng chạm vài vết bị thanh chân che một phần
  { vp: { width: 360, height: 600 }, tickets: 3, recipeId: 'banh_trang_tron_tay_ninh', stepId: 'got_xoai', notes: ['them_trung_cut'] },
  { vp: { width: 360, height: 600 }, tickets: 3, recipeId: 'banh_trang_tron_tay_ninh', stepId: 'boc_trung_cut', notes: ['khong_rau_ram'] },
  { vp: { width: 360, height: 600 }, tickets: 3, recipeId: 'banh_trang_tron_tay_ninh', stepId: 'boc_trung_cut', notes: ['khong_rau_ram', 'them_trung_cut'], extra: ['banh_mi_trung_ga_ta', 'tra_tac_mat_ong'] }
]

for (const c of CHA_FIT_CASES) {
  const label = `${c.vp.width}×${c.vp.height} ${c.tickets} phiếu ${c.recipeId}.${c.stepId}${c.notes ? ' (' + c.notes.join(',') + ')' : ''}${c.extra ? ' + ' + c.extra.join(',') : ''}`
  test(`(h) bước Chà vừa khung ${label}: mọi vết trong khung, không cuộn, chà sạch bằng cảm ứng → điểm cao`, { timeout: 240000 }, async () => {
    const g = await openGame({ clock: true, name: `cha-vua-${c.vp.width}x${c.vp.height}-${c.recipeId}-${c.stepId}-${c.tickets}${c.notes ? '-' + c.notes.length + 'gc' : ''}${c.extra ? '-' + (c.extra.length + 1) + 'mon' : ''}`, viewport: c.vp })
    const { page, errors } = g
    try {
      const { state } = shiftSave({ recipeId: c.recipeId, notes: c.notes || [], extra: c.extra }, c.stepId, { tickets: c.tickets, cooks: 5 })
      const n = state.shift.cook.board.find(s => s.id === c.stepId).params.spots
      await openShiftKitchen(g, state)
      await page.waitForSelector(T('board'))
      await openBoardStep(page, c.stepId)
      await page.waitForSelector(`${T('minigame-stage')}[data-type="cha"] ${T('cha-area')}`)
      const m = await measureCha(page)
      await g.shot('cha-vua-khung')
      assert.equal(m.spots.length, n, 'đủ số vết')
      assertChaFits(m, label)
      // chà từng vết bằng ngón tay: qua lại ngang tâm vết, biên độ 0,4 cỡ vết (trong vùng chạm)
      const cdp = await page.context().newCDPSession(page)
      await freezePageClock(page)
      for (const sp of m.spots) {
        const a = sp.size * 0.4
        const pts = [{ x: sp.x - a, y: sp.y }]
        for (let k = 0; k < 6; k++) pts.push({ x: sp.x, y: sp.y }, { x: sp.x + a, y: sp.y }, { x: sp.x, y: sp.y }, { x: sp.x - a, y: sp.y })
        await touchSwipe(page, cdp, pts)
      }
      await page.clock.resume()
      const s = await waitSave(page, st => st.shift.cook && st.shift.cook.steps[c.stepId])
      const done = s.shift.cook.steps[c.stepId]
      assert.ok(done.score >= 90, `chà sạch mọi vết bằng cảm ứng: ${done.score} điểm`)
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

for (const c of [
  { vp: { width: 360, height: 600 }, tickets: 3, recipeId: 'banh_trang_tron_tay_ninh', stepId: 'xe_kho_muc' },
  { vp: { width: 360, height: 640 }, tickets: 3, recipeId: 'che_buoi', stepId: 'bop_muoi' },
  // ca đông + phiếu có ghi chú: trước vòng kiểm chứng thớt lắc kẹt ở sàn 96px, khuất 13–43px dưới thanh chân
  { vp: { width: 360, height: 600 }, tickets: 3, recipeId: 'banh_trang_tron_tay_ninh', stepId: 'xe_kho_muc', notes: ['them_trung_cut'] },
  { vp: { width: 360, height: 600 }, tickets: 3, recipeId: 'banh_trang_tron_tay_ninh', stepId: 'tron', notes: ['khong_rau_ram'] },
  { vp: { width: 360, height: 600 }, tickets: 3, recipeId: 'banh_trang_tron', stepId: 'tron', notes: ['khong_rau_ram'] },
  { vp: { width: 360, height: 600 }, tickets: 3, recipeId: 'tra_tac_mat_ong', stepId: 'lac', notes: ['khong_da'] },
  { vp: { width: 360, height: 600 }, tickets: 3, recipeId: 'banh_trang_tron_tay_ninh', stepId: 'xe_kho_muc', notes: ['khong_rau_ram', 'them_trung_cut'], extra: ['banh_mi_trung_ga_ta', 'tra_tac_mat_ong'] },
  { vp: { width: 360, height: 640 }, tickets: 3, recipeId: 'banh_trang_tron_tay_ninh', stepId: 'tron', notes: ['khong_rau_ram', 'them_trung_cut'], extra: ['banh_mi_trung_ga_ta', 'tra_tac_mat_ong'] }
]) {
  const label = `${c.vp.width}×${c.vp.height} ${c.tickets} phiếu ${c.recipeId}.${c.stepId}${c.notes ? ' (' + c.notes.join(',') + ')' : ''}${c.extra ? ' + ' + c.extra.join(',') : ''}`
  test(`(h) bước lắc/xé vừa khung ${label}: thớt trọn phía trên thanh chân, vuốt cảm ứng đủ lượt → 100 điểm`, { timeout: 240000 }, async () => {
    const g = await openGame({ clock: true, name: `cha-lac-${c.vp.width}x${c.vp.height}-${c.recipeId}-${c.stepId}${c.notes ? '-' + c.notes.length + 'gc' : ''}${c.extra ? '-' + (c.extra.length + 1) + 'mon' : ''}`, viewport: c.vp })
    const { page, errors } = g
    try {
      const { state } = shiftSave({ recipeId: c.recipeId, notes: c.notes || [], extra: c.extra }, c.stepId, { tickets: c.tickets, cooks: 5 })
      const strokes = state.shift.cook.board.find(s => s.id === c.stepId).params.strokes
      await openShiftKitchen(g, state)
      await page.waitForSelector(T('board'))
      await openBoardStep(page, c.stepId)
      await page.waitForSelector(`${T('minigame-stage')}[data-type="cha"] ${T('cha-area')}`)
      const m = await measureCha(page)
      await g.shot('cha-lac-vua-khung')
      assert.equal(m.spots.length, 0)
      assertChaFits(m, label)
      assert.ok(m.padHits.every(Boolean), `${label}: giữa và bốn phía thớt đều chạm được`)
      // vuốt qua lại ngang giữa thớt (± 70px, quá ngưỡng đổi chiều 22px) đủ số lượt
      const cdp = await page.context().newCDPSession(page)
      const cx = m.pad.left + m.pad.width / 2
      const cy = m.pad.top + m.pad.height / 2
      const pts = [{ x: cx, y: cy }]
      for (let k = 0; k <= strokes + 1; k++) {
        const to = k % 2 ? -70 : 70
        for (let i = 1; i <= 4; i++) pts.push({ x: cx + (to * i) / 4, y: cy })
        for (let i = 3; i >= 0; i--) pts.push({ x: cx + (to * i) / 4, y: cy })
      }
      await freezePageClock(page)
      await touchSwipe(page, cdp, pts)
      await page.clock.resume()
      const s = await waitSave(page, st => st.shift.cook && st.shift.cook.steps[c.stepId])
      assert.equal(s.shift.cook.steps[c.stepId].score, 100)
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}
