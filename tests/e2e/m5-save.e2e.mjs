// E2E M5 (bản 0.5.0) — bản lưu kiểu 0.4.1 đang nấu dở ở Thớt sơ chế, gặp bản 0.5.0. Nhóm e2e: G3.
// Save dựng bằng lõi (cookShiftSave của helpers.mjs, ca ngày 5): khách gọi 2 Trà tắc (hóa đơn 20.000đ — đủ mức có tip),
// phiếu đã kẹp, đã chọn nguyên liệu (giá vốn đã trừ ví), các bước Bổ / Vắt tắc, Rót trà, Nêm đường đã xong; riêng bảng bước
// lưu trong save là của bản 0.4.1: bước "Lắc đều" còn là thao tác Chà (type 'cha', params { strokes }) và đang mở dở
// (activeStepId). Trang mở bằng đồng hồ giả đúng giờ ca, Chromium 390×844 cảm ứng:
//  1. Mở game: migrate dựng lại bảng bước theo công thức mới (Lắc kiểu mới, số lượt nhân theo 2 phần), bước đang dở mở lại
//     đúng bằng trò Lắc mới; ví, phiếu, giá vốn, sổ ca không đổi; game ghi save đã nâng cấp; thư "Có gì mới" 0.5.0 không quà.
//  2. Tải lại trang giữa bước: vẫn là ca đó, trò Lắc mở lại.
//  3. Chơi Lắc (bộ giải chung của helpers.mjs) → ≥ 90 điểm; con dấu đóng trong 1,2 giây (giờ thật).
//  4. Ra món: Q và hạng trên bảng ra món đúng bằng lõi tính (submitStep với cùng điểm + finishDish trên bản migrate).
//  5. Giao món: số sao, tip trên phiếu chấm, ví (Tiền quán không đổi: tiền khách đã vào két từ lúc thu, giá vốn đã trừ lúc
//     chọn, không bị trừ lại) và hũ tip đúng như lõi tính (serveTicket trên bản lưu ngay trước lúc giao).
// Không có lỗi console/trang.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, seedSave, readSave, waitSave, resolveIncidentIfShown, playStage, cookShiftSave, COOK_OPEN_MS } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { migrate } from '../../src/core/save.js'
import { beginStep, submitStep, finishDish, serveTicket } from '../../src/core/kitchen.js'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'

const clone = o => JSON.parse(JSON.stringify(o))

// Save kiểu 0.4.1: bảng bước "Lắc đều" là Chà (đúng như bản cũ lưu vào cook.board), bước đang mở dở; phiên bản ghi ở ca và
// hộp thư là 0.4.1.
function oldSave() {
  const { state, ticket } = cookShiftSave({ recipeId: 'tra_tac', qty: 2 }, 'lac', { tickets: 1, cooks: 5, name: 'Xe Bản Cũ' })
  const cook = state.shift.cook
  const i = cook.board.findIndex(s => s.id === 'lac')
  assert.ok(i >= 0, 'bảng bước có Lắc đều')
  const old = { ...cook.board[i], type: 'cha', params: { strokes: cook.board[i].params.strokes } }
  delete old.skin
  cook.board[i] = old
  if (!beginStep(state, 'lac')) throw new Error('không mở được bước Lắc đều')
  state.shift.appVersion = '0.4.1'
  state.mail.seenVersion = '0.4.1'
  return { raw: clone(state), ticket }
}

// Ngữ cảnh lõi để tính trước kết quả (đồng hồ giả đúng giờ đang chơi).
function coreCtx(state, at) {
  const ctx = makeMetaCtx({ at, attach: true })
  ctx.setState(state)
  return ctx
}

const vnClock = ms => new Date(ms + 7 * 3600 * 1000).toISOString().slice(0, 16)

test('save 0.4.1 dở ở Thớt (Lắc kiểu Chà đang mở) → 0.5.0: tải lại, chơi Lắc mới, ra món, giao món — Q, sao, tip, ví đúng như lõi tính', { timeout: 240000 }, async t => {
  const { raw, ticket } = oldSave()
  const oldLac = raw.shift.cook.board.find(s => s.id === 'lac')
  assert.equal(oldLac.type, 'cha')
  // lõi: migrate như lúc game mở (bản dự tính)
  const mig = migrate(clone(raw), DATA)
  const lac = mig.shift.cook.board.find(s => s.id === 'lac')
  assert.equal(lac.type, 'lac', 'migrate đổi Lắc đều sang thao tác lắc')
  assert.equal(lac.params.strokes, oldLac.params.strokes, 'số lượt giữ nguyên (đã nhân theo 2 phần)')
  assert.equal(lac.params.strokes, 2 * DATA.RECIPES.tra_tac.steps.find(s => s.id === 'lac').params.strokes)
  assert.equal(mig.shift.cook.activeStepId, 'lac', 'bước đang dở vẫn mở')

  const g = await openGame({ clock: { time: COOK_OPEN_MS }, name: 'm5-save', viewport: { width: 390, height: 844 } })
  const { page, errors } = g
  try {
    await seedSave(page, raw)
    await page.goto(g.url('/'))
    await page.waitForSelector(T('screen-service'))
    await resolveIncidentIfShown(g, { waitMs: 300 })
    await page.tap(T('tab-kitchen'))
    // 1. bước dở mở lại bằng trò Lắc mới (không còn sân khấu Chà)
    await page.waitForSelector(`${T('minigame-stage')}[data-type="lac"] ${T('lac-count')}`, { timeout: 8000 })
    assert.equal(await page.$(`${T('minigame-stage')}[data-type="cha"]`), null, 'không còn trò Chà cho bước Lắc')
    assert.equal(Number(await page.getAttribute(T('lac-count'), 'data-n')), lac.params.strokes)
    await g.shot('lac-mo-lai')
    const s1 = await waitSave(page, st => st.shift && st.shift.cook && st.shift.cook.board.some(x => x.id === 'lac' && x.type === 'lac'))
    assert.equal(s1.wallet, raw.wallet, 'nâng cấp save không đổi ví')
    assert.deepEqual(s1.shift.ledger, raw.shift.ledger, 'sổ ca không đổi')
    assert.deepEqual(s1.shift.cook.cost, raw.shift.cook.cost, 'giá vốn món không đổi')
    assert.deepEqual(s1.shift.cook.steps, raw.shift.cook.steps, 'kết quả các bước đã làm giữ nguyên')
    assert.deepEqual(s1.shift.tickets.find(t => t.id === ticket.id).lines, raw.shift.tickets.find(t => t.id === ticket.id).lines, 'phiếu không đổi')
    assert.equal(s1.shift.cook.activeStepId, 'lac')
    const letter = (s1.mail.list || []).find(m => m && m.id === 'phien_ban_0_5_0')
    assert.ok(letter, 'thư "Có gì mới" 0.5.0 đã vào hộp thư')
    assert.ok(!letter.reward || !Object.keys(letter.reward).length, 'thư 0.5.0 không kèm quà')
    assert.equal(Number(await page.getAttribute(T('hud-wallet'), 'data-amount')), raw.wallet, 'Tiền quán trên HUD đúng ví')

    // 2. tải lại giữa bước
    await page.reload()
    await page.waitForSelector(T('screen-service'))
    await resolveIncidentIfShown(g, { waitMs: 300 })
    if (!(await page.isVisible(T('panel-kitchen')))) await page.tap(T('tab-kitchen'))
    const hint = await page.waitForSelector(T('step-hint'), { timeout: 400 }).catch(() => null)
    if (hint) await hint.tap().catch(() => {})
    await page.waitForSelector(`${T('minigame-stage')}[data-type="lac"] .mg-foot`, { timeout: 8000 })
    await page.waitForTimeout(300)

    // 3. chơi Lắc; đo con dấu bằng giờ thật của trang
    await page.evaluate(() => {
      const P = window.__save = { at: null, off: null }
      const layer = document.querySelector('[data-testid="kitchen"] .k-layer')
      new MutationObserver(() => {
        if (P.at === null && layer.querySelector('[data-testid="step-result"]')) P.at = performance.now()
        if (P.at !== null && P.off === null && layer.hidden) P.off = performance.now()
      }).observe(layer, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] })
    })
    await playStage(g, lac)
    await page.waitForSelector(`${T('board-step-lac')}.is-done`, { timeout: 8000 })
    const s2 = await waitSave(page, st => st.shift && st.shift.cook && st.shift.cook.steps.lac)
    const score = s2.shift.cook.steps.lac.score
    assert.ok(score >= 90, `Lắc kiểu mới: ${score} điểm`)
    const stamp = await page.evaluate(() => window.__save)
    assert.ok(stamp.at !== null && stamp.off !== null && stamp.off - stamp.at <= 1200, `con dấu hiện ${stamp.off - stamp.at} ms`)
    assert.equal(s2.wallet, raw.wallet, 'chơi bước không đổi ví')

    // 4. ra món: Q đúng như lõi tính trên bản migrate với cùng điểm bước
    const pred = clone(mig)
    const pctx = coreCtx(pred, vnClock(COOK_OPEN_MS))
    assert.equal(submitStep(pred, 'lac', { score }, pctx).ok, true)
    const dish = finishDish(pred, pctx)
    assert.ok(dish, 'lõi ra món được')
    await page.tap(T('finish-dish'))
    const rv = await page.waitForSelector(T('dish-reveal'))
    assert.equal(Number(await rv.getAttribute('data-q')), dish.q, 'Q trên bảng ra món đúng như lõi tính')
    assert.equal(await rv.getAttribute('data-grade'), dish.grade)
    await g.shot('ra-mon')
    await page.waitForSelector(T('dish-reveal'), { state: 'detached', timeout: 5000 })
    await page.waitForSelector(`${T('dish-result')}[data-q="${dish.q}"]`)

    // 5. giao món: sao, tip, ví, hũ tip đúng như lõi tính trên bản lưu ngay trước lúc giao
    const before = await waitSave(page, st => st.shift && st.shift.cook && st.shift.cook.phase === 'xong')
    const want = clone(before)
    const wctx = coreCtx(want, vnClock(COOK_OPEN_MS))
    const sheetWant = serveTicket(want, ticket.id, wctx)
    assert.ok(sheetWant && sheetWant.final, 'lõi giao món được (không phàn nàn)')
    await page.tap(`${T('serve-ticket')}[data-ticket-id="${ticket.id}"]`)
    const sheet = await page.waitForSelector(`${T('score-sheet')}[data-customer-id="${ticket.customerId}"]`, { timeout: 5000 })
    assert.equal(Number(await sheet.getAttribute('data-stars')), sheetWant.stars, 'số sao đúng như lõi tính')
    const tipEl = await sheet.$(T('score-sheet-tip'))
    const tipUi = tipEl ? Number(await tipEl.getAttribute('data-tip')) : 0
    assert.equal(tipUi, sheetWant.tip, 'tip trên phiếu chấm đúng như lõi tính')
    await g.shot('giao-mon')
    const after = await waitSave(page, st => st.shift && !st.shift.tickets.some(t => t.id === ticket.id))
    assert.equal(after.wallet, want.wallet, 'ví sau khi giao đúng như lõi tính')
    assert.equal(after.wallet, raw.wallet, 'Tiền quán không đổi khi nấu và giao (giá vốn đã trừ lúc chọn ở bản cũ)')
    assert.equal(after.shift.tipJar - before.shift.tipJar, sheetWant.tip, 'hũ tip tăng đúng tip')
    assert.equal(after.shift.tipJar, want.shift.tipJar)
    if (sheetWant.stars === 5) assert.equal(sheetWant.tip, DATA.BALANCE.tipFiveStar || 5000, '5 sao, hóa đơn 20.000đ: có tip')
    const c = after.shift.customers[ticket.customerId]
    assert.equal(c.status, 'roi_di')
    assert.equal(c.dishes[0].q, dish.q, 'món giao đúng Q')
    // HUD đúng ví sau khi giao
    await page.waitForFunction(w => Number(document.querySelector('[data-testid="hud-wallet"]').dataset.amount) === w, after.wallet, { timeout: 3000 })
    t.diagnostic(`Lắc ${score} điểm, Q ${dish.q} (${dish.grade}), ${sheetWant.stars} sao, tip ${sheetWant.tip}, ví ${after.wallet}`)
    const final = await readSave(page)
    assert.equal(final.shift.cook, null, 'phiên nấu đã đóng')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
