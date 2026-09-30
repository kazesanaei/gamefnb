// E2E hồi quy giao diện vòng soát lỗi M3, ngày 1 ở khung thấp 360×740 (không bật ?test=1):
// - khách hướng dẫn đưa vừa đủ: lời Dì Sáu "khỏi thối", khay ghi "Không cần thối tiền"; lấy dư 1 tờ → cảnh báo "Đang thối dư";
// - dòng phiếu vừa ghi không bị thanh nút "Đọc lại đơn" che;
// - thẻ công thức "Trứng gà ×2 (chạm 1 lần)", ô đã chọn có huy hiệu ×2; cả 12 ô kệ nằm trên thanh "Trong rổ / Xong";
// - lời Dì Sáu trên Thớt nằm trong khung nhìn, không bị thanh "Bỏ món / Ra món" che;
// - phiếu chấm: nhãn "Lỗi tại quầy" và "Lỗi tại bếp" chữ trắng, cao bằng nhau;
// - thông báo nổi không bao giờ che thanh 4 khâu;
// - chép mã sao lưu thất bại (như chơi qua http) → không ghi mốc "đã sao lưu"; tự chép từ ô mã (sự kiện copy) thì ghi.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, lineTotal, playBoard, readSave } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { minBillsChange } from '../../src/core/money.js'

// Vị trí phần tử so với khung nhìn và phần tử đang nằm trên nó (bị che?).
const where = (page, sel) => page.evaluate(sel => {
  const el = document.querySelector(sel)
  if (!el) return null
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2, cy = r.top + Math.min(r.height / 2, 10)
  const top = cy >= 0 && cy <= innerHeight ? document.elementFromPoint(cx, cy) : null
  const covered = top && !el.contains(top) ? ((top.closest('[data-testid]') || top).getAttribute('data-testid') || String(top.className)) : null
  return { top: r.top, bottom: r.bottom, inView: r.top >= 0 && r.bottom <= innerHeight, coveredBy: covered }
}, sel)

test('ngày 1 ở 360×740: Tính tiền vừa đủ, dòng phiếu, kệ ×2, lời Dì Sáu trên Thớt, nhãn phiếu chấm, thông báo nổi', { timeout: 240000 }, async () => {
  const g = await openGame({ name: 'ux-m3', viewport: { width: 360, height: 740 } })
  const { page, errors } = g
  // theo dõi chồng thông báo: không được vượt xuống thanh 4 khâu
  const overlaps = []
  let watching = true
  const watch = (async () => {
    while (watching) {
      const o = await page.evaluate(() => {
        const st = document.querySelector('.toast-stack'); const bar = document.querySelector('[data-testid="progress-4"]')
        if (!st || !bar || !st.children.length) return null
        const a = st.getBoundingClientRect(), b = bar.getBoundingClientRect()
        return a.bottom > b.top + 1 ? [...st.children].map(c => c.textContent.slice(0, 50)).join(' / ') : null
      }).catch(() => null)
      if (o) overlaps.push(o)
      await new Promise(r => setTimeout(r, 120))
    }
  })()
  try {
    await page.goto(g.url('/?seed=11'))
    await page.fill(T('shop-name-input'), 'Bánh mì Út Hiền')
    await page.tap(T('start-button'))
    const pop = await page.waitForSelector(T('checkin-popup'), { timeout: 3000 }).catch(() => null)
    if (pop) { await page.tap(T('checkin-claim')); await page.waitForSelector(T('checkin-popup'), { state: 'detached' }) }
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('speech-bubble'), { timeout: 60000 })
    const request = JSON.parse(await page.getAttribute(T('speech-bubble'), 'data-request'))
    for (const line of request) {
      await page.tap(T('menu-item-' + line.recipeId))
      await page.waitForSelector(T('order-sheet'))
      await page.tap(T('add-line'))
      await page.waitForSelector(T('order-sheet'), { state: 'detached' })
    }
    await page.waitForTimeout(300)
    const ol = await where(page, T('order-line-' + (request.length - 1)))
    assert.ok(ol.inView && !ol.coveredBy, 'dòng phiếu vừa ghi bị che: ' + JSON.stringify(ol))
    await page.tap(T('readback'))
    await page.waitForSelector(`${T('confirm-order')}:not([disabled])`)
    await page.tap(T('confirm-order'))
    await page.waitForSelector(T('report-total'))
    const total = lineTotal(request)
    for (const d of String(total / 1000)) await page.tap(T('numpad-' + d))
    await page.tap(T('report-total'))
    await page.waitForSelector(T('given-cash'))
    const given = Number(await page.getAttribute(T('given-cash'), 'data-amount'))
    const due = given - total
    if (due === 0) {
      assert.match(await page.textContent(T('tutor-hint')), /khỏi thối.*Không cần thối/)
      assert.equal((await page.textContent(T('tray-empty'))).trim(), 'Không cần thối tiền')
      assert.equal((await page.textContent(T('give-change'))).trim(), 'Không cần thối')
    }
    // lấy dư 1 tờ 5K: cảnh báo đỏ + Dì Sáu nhắc trả về két → tờ đó để lại (thối dư) cho phiếu chấm có "Lỗi tại quầy"
    await page.tap(T('drawer-5000'))
    await page.waitForSelector(T('change-over'))
    assert.match(await page.textContent(T('change-over')), /Đang thối dư/)
    if (due === 0) assert.match(await page.textContent(T('tutor-hint')), /dư 5\.000đ/)
    if (due > 0) {
      const best = minBillsChange(due, { 5000: 7, 10000: 5, 20000: 3, 50000: 1, 100000: 0, 200000: 0, 500000: 0 })
      for (const b of Object.keys(best.bills)) for (let k = 0; k < best.bills[b]; k++) await page.tap(T('drawer-' + b))
    }
    await page.tap(T('give-change'))
    await page.waitForSelector(`${T('clip-ticket')}:not([disabled])`)
    await page.tap(T('clip-ticket'))
    // Bếp: kệ chọn
    await page.tap(T('tab-kitchen'))
    await page.waitForSelector('[data-testid^="ticket-p"]')
    await page.tap('[data-testid^="ticket-p"]')
    await page.tap(T('cook-line-0'))
    await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
    await page.waitForTimeout(300)
    const recipe = DATA.RECIPES[request[0].recipeId]
    const multi = recipe.ingredients.find(i => i.qty > 1)
    if (multi) assert.match(await page.textContent(T('recipe-card')), /×\d \(chạm 1 lần\)/)
    const hidden = await page.$$eval('.chon-cell', els => {
      const foot = document.querySelector('[data-testid="chon-done"]').getBoundingClientRect()
      return els.filter(e => e.getBoundingClientRect().bottom > foot.top + 1).map(e => e.dataset.ing)
    })
    assert.deepEqual(hidden, [], 'ô kệ bị thanh "Trong rổ / Xong" che')
    const req = requiredIngredients(recipe, request[0].notes)
    const side = req.side[0]
    for (const id of req.required) if (id !== side) await page.tap(T('shelf-' + id))
    if (multi) {
      assert.equal(await page.isVisible(T('shelf-qty-' + multi.id)), true, 'ô đã chọn có huy hiệu ×n')
      assert.equal((await page.textContent(T('shelf-qty-' + multi.id))).trim(), '×' + multi.qty)
    }
    await page.tap(T('chon-done'))
    await page.waitForSelector(T('board'))
    await page.waitForTimeout(300)
    const ds = await where(page, T('disau-line'))
    assert.ok(ds && ds.inView && !ds.coveredBy, 'lời Dì Sáu trên Thớt bị che/khuất: ' + JSON.stringify(ds))
    await playBoard(g, recipe, {})
    await page.tap(T('finish-dish'))
    await page.waitForSelector(T('dish-reveal'))
    await page.waitForSelector(T('dish-reveal'), { state: 'detached', timeout: 5000 })
    await page.tap(T('serve-ticket'))
    await page.waitForSelector(T('score-sheet'))
    const tags = await page.$$eval('.err-tag', els => els.map(e => ({ t: e.textContent, color: getComputedStyle(e).color, h: Math.round(e.getBoundingClientRect().height) })))
    assert.equal(tags.length, 2, 'có cả nhãn lỗi quầy và lỗi bếp: ' + JSON.stringify(tags))
    for (const t of tags) assert.equal(t.color, 'rgb(255, 255, 255)', 'chữ nhãn phải trắng: ' + t.t)
    assert.equal(tags[0].h, tags[1].h, 'hai nhãn cao bằng nhau')
    await page.waitForTimeout(1500)
    watching = false
    await watch
    assert.deepEqual(overlaps, [], 'thông báo nổi che thanh 4 khâu')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    watching = false
    await g.close()
  }
})

test('chép mã sao lưu thất bại (như chơi qua http): không ghi mốc "đã sao lưu"; tự chép từ ô mã thì ghi', { timeout: 120000 }, async () => {
  const g = await openGame({ name: 'chep-loi' })
  const { page, errors } = g
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, get() { return { writeText: () => Promise.reject(new Error('không cho chép')) } } })
      document.execCommand = () => false
    })
    await page.goto(g.url('/?seed=5'))
    await page.fill(T('shop-name-input'), 'Xe Chép Lỗi')
    await page.tap(T('start-button'))
    const pop = await page.waitForSelector(T('checkin-popup'), { timeout: 3000 }).catch(() => null)
    if (pop) { await page.tap(T('checkin-claim')); await page.waitForSelector(T('checkin-popup'), { state: 'detached' }) }
    await page.tap(T('open-settings'))
    await page.waitForSelector(T('screen-settings'))
    await page.tap(T('backup-copy'))
    await page.waitForSelector(T('backup-code-modal'))
    assert.equal(await page.getAttribute(T('backup-copy-status'), 'data-copied'), 'false')
    assert.match(await page.textContent(T('backup-copy-status')), /Chưa chép tự động được/)
    await page.tap(T('backup-copy-again'))
    assert.equal(await page.getAttribute(T('backup-copy-status'), 'data-copied'), 'false')
    await page.tap(T('backup-done'))
    await page.waitForSelector(T('backup-code-modal'), { state: 'detached' })
    await page.waitForTimeout(400)
    assert.match(await page.textContent(T('backup-last')), /Chưa sao lưu lần nào/)
    assert.equal((await readSave(page)).backup.lastAt, 0)
    // người chơi tự chép từ ô mã (sự kiện copy) → ghi nhận đã sao lưu
    await page.tap(T('backup-copy'))
    await page.waitForSelector(T('backup-code-modal'))
    await page.dispatchEvent(T('backup-code'), 'copy')
    assert.equal(await page.getAttribute(T('backup-copy-status'), 'data-copied'), 'true')
    await page.tap(T('backup-done'))
    await page.waitForSelector(T('backup-code-modal'), { state: 'detached' })
    assert.ok((await readSave(page)).backup.lastAt > 0)
    assert.match(await page.textContent(T('backup-last')), /Lần sao lưu gần nhất/)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
