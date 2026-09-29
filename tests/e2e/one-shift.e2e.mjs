// E2E: người chơi mới chơi trọn ca ngày 1 trên Chromium 390×844 (cảm ứng), chỉ qua giao diện thật.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  T, openGame, startNewGame, waitCustomerOrEnd, serveAtCounter, cookAndServe, readSave
} from './helpers.mjs'

test('một ca ngày 1: phục vụ hết khách qua 4 khâu, nấu, giao, ra màn tổng kết', { timeout: 600000 }, async () => {
  const g = await openGame({ clock: true, name: 'mot-ca' })
  const { page, errors } = g
  try {
    // ngữ cảnh mới: localStorage trống → ?seed=42 có hiệu lực
    await startNewGame(g, 'Xe Bánh Mì Cô Ba')
    const first = await readSave(page)
    assert.equal(first.seed, 42)
    assert.ok(first.shift && first.shift.day === 1)
    await page.waitForSelector(`${T('hud-day')}`)
    assert.match(await page.textContent(T('hud-day')), /Ngày 1/)

    const served = []
    for (let guard = 0; guard < 12; guard++) {
      const what = await waitCustomerOrEnd(g, { useClock: true })
      if (what === 'summary') break
      const order = await serveAtCounter(g)
      const res = await cookAndServe(g, order.ticketId, { shots: served.length < 2 })
      served.push({ ...order, ...res })
      // tab Quầy để chờ khách tiếp theo
      await page.click(T('tab-counter'))
      if (served.length === 1) await g.shot('quay-trong')
    }

    console.log('Đã phục vụ:', served.map(s => `${s.name} ${s.ticketNo} ${s.total}đ ${s.stars}★`).join(' | '))
    await page.waitForSelector(T('summary'), { timeout: 10000 })
    await page.waitForTimeout(300)
    await g.shot('summary')
    const profitText = await page.textContent(T('summary-profit'))
    assert.match(profitText, /\d/, 'summary-profit không có số')
    const profit = Number(await page.getAttribute(T('summary-profit'), 'data-amount'))
    console.log('Lãi ca:', profitText)
    assert.ok(Number.isFinite(profit))
    assert.equal(await page.textContent(T('summary-drawer-diff')), '0đ')

    // localStorage có save, ca đã chốt
    const raw = await page.evaluate(() => localStorage.getItem('bkn.save'))
    assert.ok(raw && raw.startsWith('BKN1.'), 'localStorage thiếu bkn.save')
    const save = await readSave(page)
    assert.equal(save.shift, null)
    assert.equal(save.day, 2)
    assert.equal(save.shopName, 'Xe Bánh Mì Cô Ba')
    assert.equal(save.history.length, 1)
    assert.equal(save.history[0].served, served.length)
    assert.equal(save.history[0].lost, 0)
    assert.equal(save.history[0].profit, profit)
    assert.ok(served.length >= 3, 'phục vụ quá ít khách: ' + served.length)
    // hỗ trợ thao tác (?test=1) giới hạn hạng Ngon → khách hài lòng 4 sao
    for (const s of served) assert.ok(s.stars >= 4, `${s.name}: ${s.stars} sao`)

    // không cuộn ngang
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    assert.ok(overflow <= 0, 'trang bị tràn ngang')

    await page.click(T('next-day'))
    await page.waitForSelector(T('open-shift'))
    assert.match(await page.textContent(T('prep-day')), /Ngày 2/)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
