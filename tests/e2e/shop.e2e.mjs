// E2E Chợ Công Thức: save dựng sẵn (ngày game 2, đủ tiền, mã hóa bằng encodeSave của src/core/save.js) →
// nấu thử Bánh tráng trộn (ví không đổi, không tính thạo món) → mua ngay ở màn kết quả → mua Dao thép tốt →
// xem thử rồi mua dù đỏ bằng Muỗng Vàng (hình xe đổi màu) → mở ca: khách gọi Bánh tráng trộn và được phục vụ.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, readSave, waitSave, seedSave, enterPrep, playBoard, playShiftUi } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'

const DEV_NOW = '2026-10-06T09:00'
const BTT = 'banh_trang_tron'

// Seed 42 đã chơi 1 ca (ngày 05/10) → ngày game 2. Mua Bánh tráng trộn xong, khách đầu của ca ngày 2 gọi món này
// (món mới được gọi ×2 trong 2 ca đầu).
function builtSave() {
  const ctx = makeMetaCtx({ at: '2026-10-05T08:00', attach: true })
  const state = defaultState(42, DATA)
  ctx.setState(state)
  state.shopName = 'Xe Chợ Công Thức'
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  playShift(state, ctx)
  state.wallet = 700000
  state.goldSpoons = 45
  state.checkin.lastDay = '2026-10-06'   // hôm nay đã điểm danh: không bật bảng
  return state
}

test('Chợ Công Thức: nấu thử, mua món, mua nâng cấp, đổi màu dù; khách gọi món mới', { timeout: 600000 }, async () => {
  const g = await openGame({ clock: true, name: 'cho-cong-thuc' })
  const { page, errors } = g
  try {
    const state = builtSave()
    assert.ok(state.day >= 2)
    await seedSave(page, state)
    await enterPrep(g, `?devNow=${DEV_NOW}&test=1`)
    const s0 = await readSave(page)
    assert.equal(s0.wallet, 700000)
    assert.equal(!!(await page.$(T('prep-dish-' + BTT))), false, 'chưa mua thì chưa có trong thực đơn')

    // --- Kệ Chính: thẻ xem trước + nấu thử miễn phí
    await page.tap(T('open-shop'))
    await page.waitForSelector(T('shop-item-' + BTT))
    await g.shot('ke-chinh')
    assert.equal(await page.isDisabled(T('shop-buy-' + BTT)), false)
    assert.equal(Number(await page.getAttribute(T('shop-buy-' + BTT), 'data-price')), DATA.RECIPES[BTT].shopPrice)
    await page.tap(T('shop-trial-' + BTT))
    await page.waitForSelector(T('screen-tasting'))
    await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
    const recipe = DATA.RECIPES[BTT]
    for (const id of requiredIngredients(recipe, []).required) await page.click(T('shelf-' + id))
    await page.click(T('chon-done'))
    await page.waitForSelector(T('board'))
    await playBoard(g, recipe)
    await page.click(T('finish-dish'))
    await page.waitForSelector(T('tasting-result'), { timeout: 10000 })
    await g.shot('nau-thu-ket-qua')
    const tasted = await waitSave(page, st => !st.tasting && (st.shop.tried || []).includes(BTT))
    assert.equal(tasted.wallet, s0.wallet, 'nấu thử: ví không đổi')
    assert.equal(tasted.recipes[BTT], undefined)
    assert.deepEqual(tasted.recipes.banh_mi_op_la, s0.recipes.banh_mi_op_la, 'nấu thử không tính thạo món')
    assert.equal(tasted.shift, null)

    // --- Mua ngay ở màn kết quả nấu thử
    await page.tap(T('tasting-buy'))
    await page.tap(T('confirm-ok'))
    await page.waitForSelector(`${T('shop-item-' + BTT)}.is-owned`)
    const bought = await waitSave(page, st => !!st.recipes[BTT])
    assert.equal(bought.wallet, s0.wallet - recipe.shopPrice)
    assert.equal(bought.recipes[BTT].boughtDay, bought.day)
    assert.equal(bought.stats.recipesBought, (s0.stats.recipesBought || 0) + 1)

    // --- Nâng cấp: Dao thép tốt
    await page.tap(T('shop-tab-upgrades'))
    await page.waitForSelector(T('upgrade-dao_thep'))
    await page.tap(T('upgrade-buy-dao_thep'))
    await page.tap(T('confirm-ok'))
    await page.waitForSelector(`${T('upgrade-dao_thep')}.is-owned`)
    const up = await waitSave(page, st => !!st.upgrades.dao_thep)
    assert.equal(up.wallet, bought.wallet - DATA.UPGRADES.dao_thep.price)
    assert.equal(await page.isDisabled(T('upgrade-buy-dao_thep')), true)

    // --- Góc Muỗng Vàng: xem thử rồi mua dù đỏ
    await page.tap(T('shop-tab-spoons'))
    await page.waitForSelector(`${T('cart-view')}[data-umbrella="mac_dinh"]`)
    await page.tap(T('parasol-preview-du_do'))
    await page.waitForSelector(T('parasol-previewing'))
    assert.equal(await page.getAttribute(T('cart-view'), 'data-umbrella'), 'du_do')
    assert.equal((await readSave(page)).cosmetics.equipped.du, null, 'xem thử chưa phải đã đổi')
    await page.tap(T('parasol-du_do'))
    await page.tap(T('confirm-ok'))
    await page.waitForSelector(`${T('parasol-du_do')}[data-equipped="true"]`)
    await page.waitForSelector(`${T('cart-view')}[data-umbrella="du_do"]`)
    await g.shot('goc-muong-vang')
    const dress = await waitSave(page, st => st.cosmetics.equipped.du === 'du_do')
    assert.equal(dress.goldSpoons, 45 - DATA.COSMETICS.du_do.price)
    assert.equal(dress.wallet, up.wallet, 'màu dù trả bằng Muỗng Vàng, không đụng Tiền quán')
    // đổi về dù cũ rồi dùng lại dù đỏ (đã có, không trả thêm)
    await page.tap(T('parasol-mac_dinh'))
    await page.waitForSelector(`${T('cart-view')}[data-umbrella="mac_dinh"]`)
    await page.tap(T('parasol-du_do'))
    await page.waitForSelector(`${T('cart-view')}[data-umbrella="du_do"]`)
    assert.equal((await waitSave(page, st => st.cosmetics.equipped.du === 'du_do')).goldSpoons, dress.goldSpoons)

    // --- Mở ca: món mới trong thực đơn, khách gọi và được phục vụ
    await page.tap(T('meta-back'))
    await page.waitForSelector(T('prep-dish-' + BTT))
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    const served = await playShiftUi(g, { useClock: true, until: order => order.request.some(l => l.recipeId === BTT) })
    const last = served[served.length - 1]
    assert.ok(last && last.request.some(l => l.recipeId === BTT), 'không có khách gọi Bánh tráng trộn')
    assert.ok(last.stars >= 4, `khách gọi Bánh tráng trộn chấm ${last.stars} sao`)
    const after = await waitSave(page, st => st.recipes[BTT].cooks >= 1)
    assert.ok(after.recipes[BTT].goodCooks >= 1, 'món mới nấu đạt Ngon trở lên')
    assert.ok(after.shift, 'ca vẫn đang mở')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
