// E2E an toàn dữ liệu người chơi (vòng soát lỗi M3), Chromium 390×844 cảm ứng:
// - trình duyệt chặn bộ nhớ trang (localStorage ném SecurityError) → dải "Chưa lưu được tiến trình" + hộp thoại,
//   nút Sao lưu mở mã sao lưu chép tay được; game vẫn chơi được;
// - bộ nhớ đầy (setItem ném QuotaExceededError với khóa save) → cảnh báo; ghi lại được thì cảnh báo tự tắt;
// - bản lưu không đọc được ở cả bản chính lẫn bản dự phòng → chuỗi cũ được CẤT nguyên vẹn sang bkn.save.hong.<ms>
//   trước khi game ghi bản mới, có thông báo; mở lại không cất trùng;
// - bản chính hỏng, bản dự phòng tốt → mở bản dự phòng, bản hỏng được cất, có thông báo;
// - mã sao lưu tạo từ bản game mới hơn (version 3, món/nâng cấp lạ) → xem trước cảnh báo phần sẽ mất.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, readSave, waitSave, claimCheckinIfShown } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { encodeSave, decodeSave, importCode, exportCode, SAVE_KEY, BACKUP_KEY } from '../../src/core/save.js'

// Chuỗi save sai 1 ký tự giữa payload (checksum lệch → không đọc được).
function corrupt(code) {
  const i = Math.floor(code.length / 2)
  return code.slice(0, i) + (code[i] === 'A' ? 'B' : 'A') + code.slice(i + 1)
}

function namedState(name, seed = 5) {
  const s = defaultState(seed, DATA)
  s.shopName = name
  s.day = 3
  s.wallet = 312500
  return s
}

// Nạp các khóa localStorage trước khi game chạy (chỉ lần đầu của phiên tab).
async function seedKeys(page, entries) {
  await page.addInitScript(list => {
    if (sessionStorage.getItem('bkn.seeded')) return
    for (const [k, v] of list) localStorage.setItem(k, v)
    sessionStorage.setItem('bkn.seeded', '1')
  }, entries)
}

const brokenKeys = page => page.evaluate(() => Object.keys(localStorage).filter(k => /^bkn\.save\.hong\.\d+$/.test(k)).sort()
  .map(k => [k, localStorage.getItem(k)]))

test('trình duyệt chặn bộ nhớ trang: cảnh báo không lưu được, chép mã sao lưu tay được, game vẫn chơi', { timeout: 120000 }, async () => {
  const g = await openGame({ name: 'chan-bo-nho' })
  const { page, errors } = g
  try {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Trang bị chặn lưu dữ liệu', 'SecurityError') } })
    })
    await page.goto(g.url('/?seed=42'))
    await page.waitForSelector(T('save-warning'))
    assert.equal(await page.getAttribute(T('save-warning'), 'data-kind'), 'chan')
    await page.waitForSelector(T('save-warning-modal'))
    assert.match(await page.textContent(T('save-warning-modal')), /không lưu được tiến trình/)
    await g.shot('canh-bao')
    await page.tap(T('save-warning-later'))
    await page.waitForSelector(T('save-warning-modal'), { state: 'detached' })
    // màn chơi lùi xuống dưới dải cảnh báo, không bị che
    const layout = await page.evaluate(() => ({
      bar: document.querySelector('[data-testid="save-warning"]').getBoundingClientRect().bottom,
      screen: document.getElementById('screen').getBoundingClientRect().top
    }))
    assert.ok(layout.screen >= layout.bar - 0.5, `màn chơi bị dải cảnh báo che: ${JSON.stringify(layout)}`)
    // vẫn chơi được
    await page.fill(T('shop-name-input'), 'Xe Không Lưu')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await claimCheckinIfShown(g, 3000)
    assert.ok(await page.isVisible(T('save-warning')), 'dải cảnh báo vẫn còn')
    // nút Sao lưu trên dải: hiện mã để chép tay
    await page.tap(T('save-warning-backup'))
    await page.waitForSelector(T('backup-code-modal'))
    const code = await page.inputValue(T('backup-code'))
    assert.equal(importCode(code, DATA).shopName, 'Xe Không Lưu')
    await g.shot('ma-sao-luu')
    await page.tap(T('backup-done'))
    await page.waitForSelector(T('backup-code-modal'), { state: 'detached' })
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('bộ nhớ đầy khi ghi save: cảnh báo; ghi lại được thì cảnh báo tự tắt', { timeout: 120000 }, async () => {
  const g = await openGame({ name: 'bo-nho-day' })
  const { page, errors } = g
  try {
    await page.addInitScript(([saveKey, bakKey]) => {
      const orig = Storage.prototype.setItem
      window.__fullStorage = true
      Storage.prototype.setItem = function (k, v) {
        if (window.__fullStorage && (k === saveKey || k === bakKey)) throw new DOMException('Bộ nhớ đầy', 'QuotaExceededError')
        return orig.call(this, k, v)
      }
    }, [SAVE_KEY, BACKUP_KEY])
    await page.goto(g.url('/?seed=42'))
    await page.waitForSelector(T('save-warning'))
    assert.equal(await page.getAttribute(T('save-warning'), 'data-kind'), 'loi_ghi')
    await page.waitForSelector(T('save-warning-modal'))
    // "Chép mã sao lưu" ngay trong hộp thoại
    await page.tap(T('save-warning-copy'))
    await page.waitForSelector(T('backup-code-modal'))
    assert.match(await page.inputValue(T('backup-code')), /^BKN1\.z\./)
    await page.tap(T('backup-done'))
    await page.waitForSelector(T('backup-code-modal'), { state: 'detached' })
    assert.equal(await readSave(page), null, 'chưa ghi được gì')
    // bộ nhớ trống lại: lần lưu kế tiếp thành công, cảnh báo tự tắt
    await page.evaluate(() => { window.__fullStorage = false })
    await page.fill(T('shop-name-input'), 'Xe Hết Chỗ')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await claimCheckinIfShown(g, 3000)
    await waitSave(page, s => s.shopName === 'Xe Hết Chỗ')
    await page.waitForSelector(T('save-warning'), { state: 'detached' })
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('bản lưu không đọc được ở cả bản chính và dự phòng: cất nguyên chuỗi sang bkn.save.hong.<ms> trước khi ghi, có thông báo', { timeout: 120000 }, async () => {
  const g = await openGame({ name: 'save-hong' })
  const { page, errors } = g
  try {
    const bad = corrupt(encodeSave(namedState('Xe Hỏng Mã')))
    assert.equal(decodeSave(bad), null)
    await seedKeys(page, [[SAVE_KEY, bad], [BACKUP_KEY, bad]])
    await page.goto(g.url('/?seed=42'))
    await page.waitForSelector(T('save-notice'))
    assert.match(await page.textContent(T('save-notice')), /không đọc được.*đã được cất lại/)
    await g.shot('thong-bao')
    await page.tap(T('save-notice-ok'))
    await page.waitForSelector(T('shop-name-input'))
    const kept = await brokenKeys(page)
    assert.equal(kept.length, 1, 'hai khóa cùng chuỗi hỏng: cất 1 lần')
    assert.equal(kept[0][1], bad, 'chuỗi cũ cất nguyên vẹn')
    // bản chính giờ là save mới đọc được; chuỗi cũ không mất
    const cur = await readSave(page)
    assert.ok(cur && cur.shopName === '')
    // Cài đặt báo có bản hỏng đã cất
    await page.fill(T('shop-name-input'), 'Xe Làm Lại')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await claimCheckinIfShown(g, 3000)
    await page.tap(T('open-settings'))
    await page.waitForSelector(T('broken-archives'))
    assert.match(await page.textContent(T('broken-archives')), /1 bản lưu không đọc được/)
    // mở lại: bản dự phòng vẫn là chuỗi hỏng (chưa hết ca) nhưng đã cất rồi thì không cất trùng, không báo lại
    await page.reload()
    await page.waitForSelector(T('start-button'))
    await page.waitForTimeout(400)
    assert.equal(!!(await page.$(T('save-notice'))), false)
    assert.equal((await brokenKeys(page)).length, 1)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('bản chính hỏng, bản dự phòng tốt: mở bản dự phòng, bản hỏng được cất', { timeout: 120000 }, async () => {
  const g = await openGame({ name: 'mo-du-phong' })
  const { page, errors } = g
  try {
    const good = encodeSave(namedState('Xe Dự Phòng'))
    const bad = corrupt(good)
    await seedKeys(page, [[SAVE_KEY, bad], [BACKUP_KEY, good]])
    await page.goto(g.url('/'))
    await page.waitForSelector(T('save-notice'))
    assert.match(await page.textContent(T('save-notice')), /bản dự phòng/)
    await page.tap(T('save-notice-ok'))
    await page.waitForSelector(T('start-button'))
    assert.equal(await page.textContent('.title-shop'), 'Xe Dự Phòng')
    const kept = await brokenKeys(page)
    assert.equal(kept.length, 1)
    assert.equal(kept[0][1], bad)
    const cur = await waitSave(page, s => s.shopName === 'Xe Dự Phòng')
    assert.equal(cur.wallet, 312500)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('mã sao lưu từ bản game mới hơn: xem trước cảnh báo phần sẽ mất, nút xác nhận hỏi lại', { timeout: 120000 }, async () => {
  const g = await openGame({ name: 'ma-ban-moi' })
  const { page, errors } = g
  try {
    const s = namedState('Xe Bản Mới Hơn')
    s.version = 3
    s.recipes.pho_bo_moi = { cooks: 4, goodCooks: 4, excellent: 1, flawless: 0, best: 91, boughtDay: 2 }
    s.upgrades = { xe_moi_toanh: true }
    await page.goto(g.url('/?seed=42'))
    await page.waitForSelector(T('title-import'))
    await page.tap(T('title-import'))
    await page.waitForSelector(T('backup-import-modal'))
    await page.fill(T('backup-input'), exportCode(s))
    await page.tap(T('backup-check'))
    await page.waitForSelector(T('backup-newer'))
    assert.match(await page.textContent(T('backup-newer')), /bản game mới hơn.*1 món và 1 nâng cấp/)
    assert.equal((await page.textContent(T('backup-confirm'))).trim(), 'Vẫn dùng bản này')
    await g.shot('canh-bao-ban-moi')
    // mã bình thường thì không cảnh báo
    await page.tap(T('backup-change'))
    await page.fill(T('backup-input'), exportCode(namedState('Xe Thường')))
    await page.tap(T('backup-check'))
    await page.waitForSelector(T('backup-preview'))
    assert.equal(!!(await page.$(T('backup-newer'))), false)
    assert.equal((await page.textContent(T('backup-confirm'))).trim(), 'Dùng bản này')
    await page.tap(T('backup-cancel'))
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
