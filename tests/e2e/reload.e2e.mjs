// E2E: tải lại trang giữa ca (sau khi kẹp phiếu) → vẫn ở ca đó, phiếu còn trên dây, chơi tiếp xong khách đó.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, startNewGame, waitCustomerOrEnd, serveAtCounter, cookAndServe, readSave, waitSave } from './helpers.mjs'

test('tải lại giữa ca: khôi phục ca, dây phiếu, rồi nấu và giao được', { timeout: 300000 }, async () => {
  const g = await openGame({ name: 'tai-lai' })
  const { page, errors } = g
  try {
    await startNewGame(g, 'Xe Tải Lại')
    assert.equal(await waitCustomerOrEnd(g), 'customer')
    const order = await serveAtCounter(g)
    const before = await waitSave(page, s => s.shift && s.shift.tickets.some(t => t.id === order.ticketId))
    const cust = Object.values(before.shift.customers).find(c => c.ticketId === order.ticketId)
    assert.ok(cust, 'không thấy khách của phiếu')
    assert.equal(cust.status, 'cho_mon')
    const tBefore = before.shift.t

    await page.reload()
    await page.waitForSelector(T('screen-service'))
    await page.waitForSelector(T('rail-ticket-' + order.ticketId))
    assert.match(await page.textContent(T('hud-day')), /Ngày 1/)
    assert.equal(await page.getAttribute(T('rail-ticket-' + order.ticketId), 'data-status'), 'cho')
    const after = await readSave(page)
    assert.ok(after.shift, 'mất ca sau khi tải lại')
    assert.ok(after.shift.t >= tBefore - 0.001)
    assert.equal(after.shift.customers[cust.id].status, 'cho_mon')
    assert.equal(after.shopName, 'Xe Tải Lại')
    await g.shot('sau-tai-lai')

    const res = await cookAndServe(g, order.ticketId, { shots: false })
    assert.equal(res.customerId, cust.id)
    assert.ok(res.stars >= 1 && res.stars <= 5)
    const done = await waitSave(page, s => s.shift && s.shift.customers[cust.id].status === 'roi_di')
    assert.ok(done.shift.served.includes(cust.id))
    assert.equal(done.shift.tickets.some(t => t.id === order.ticketId), false)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
