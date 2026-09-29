// E2E: đang chọn nguyên liệu mà về dây phiếu → rổ được giữ, "Làm tiếp" quay lại đúng rổ; chọn xong vào thẳng Thớt sơ chế.
// Kèm kiểm tra nút thao tác chính của quầy nằm trong vùng nhìn thấy của panel (không phải cuộn tay).
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, startNewGame, waitCustomerOrEnd, serveAtCounter, waitSave } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { requiredIngredients } from '../../src/core/scoring.js'

// Nút có nằm trọn trong panel và không bị phần tử khác đè ở tâm?
async function reachable(page, testid, panelSel) {
  return page.evaluate(([tid, ps]) => {
    const el = document.querySelector(`[data-testid="${tid}"]`)
    const p = document.querySelector(ps)
    if (!el || !p) return { ok: false, why: 'missing' }
    const a = el.getBoundingClientRect(), b = p.getBoundingClientRect()
    const top = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2)
    const inside = a.top >= b.top - 1 && a.bottom <= b.bottom + 1
    return { ok: inside && !!top && el.contains(top), inside, cover: top && !el.contains(top) ? (top.dataset.testid || top.className) : null }
  }, [testid, panelSel])
}

test('bếp: về dây phiếu giữa bước chọn giữ rổ; nút quầy chạm được không cần cuộn', { timeout: 300000 }, async () => {
  const g = await openGame({ name: 'bep-ve-day-phieu' })
  const { page, errors } = g
  try {
    await startNewGame(g, 'Xe Về Dây Phiếu')
    assert.equal(await waitCustomerOrEnd(g), 'customer')
    const P = T('panel-counter')
    // Quầy: sau khi ghi món, nút Đọc lại đơn / Chốt order nằm trong panel
    const request = JSON.parse(await page.getAttribute(T('speech-bubble'), 'data-request'))
    await page.tap(T('menu-item-' + request[0].recipeId))
    await page.waitForSelector(T('order-sheet'))
    for (const n of request[0].notes || []) await page.tap(T('note-chip-' + n))
    for (let q = 1; q < request[0].qty; q++) await page.tap(T('qty-plus'))
    await page.tap(T('add-line'))
    await page.waitForSelector(T('order-sheet'), { state: 'detached' })
    for (const id of ['readback', 'confirm-order']) {
      const r = await reachable(page, id, P)
      assert.ok(r.ok, `${id} không chạm được ngay: ${JSON.stringify(r)}`)
    }
    // xóa dòng vừa ghi để helper phục vụ lại từ đầu
    await page.tap(T('order-line-remove-0'))
    const order = await serveAtCounter(g)

    await page.tap(T('tab-kitchen'))
    await page.tap(T('ticket-' + order.ticketId))
    await page.tap(T('cook-line-0'))
    await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
    const save = await waitSave(page, s => s.shift && s.shift.cook)
    const recipe = DATA.RECIPES[save.shift.cook.recipeId]
    const need = requiredIngredients(recipe, save.shift.cook.notes).required
    await page.tap(T('shelf-' + need[0]))
    await page.tap(T('shelf-' + need[1]))
    assert.match(await page.textContent(T('chon-count')), /2/)

    // về dây phiếu: thấy dây phiếu, có nút Làm tiếp và Bỏ món
    await page.tap(T('kitchen-back'))
    await page.waitForSelector('.k-main[data-view="rail"]')
    assert.ok(await page.$(T('cook-resume')))
    assert.ok(await page.$(T('abandon-dish')))

    // quay lại: rổ còn nguyên 2 món
    await page.tap(T('cook-resume'))
    await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
    assert.match(await page.textContent(T('chon-count')), /2/)
    assert.equal(await page.getAttribute(T('shelf-' + need[0]), 'aria-pressed'), 'true')
    for (const id of need.slice(2)) await page.tap(T('shelf-' + id))
    await page.tap(T('chon-done'))
    // chọn xong → vào thẳng Thớt sơ chế (không bị đẩy ra dây phiếu)
    await page.waitForSelector(T('board'))
    assert.equal(await page.getAttribute('.k-main', 'data-view'), 'thot')

    // về dây phiếu rồi bỏ món từ đó
    await page.tap(T('kitchen-back'))
    await page.waitForSelector('.k-main[data-view="rail"]')
    await page.tap(T('abandon-dish'))
    await page.tap(T('confirm-ok'))
    const after = await waitSave(page, s => s.shift && !s.shift.cook)
    assert.equal(after.shift.tickets.find(t => t.id === order.ticketId).status, 'cho')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
