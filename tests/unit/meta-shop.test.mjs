// Chợ Công Thức: thẻ xem trước, mua trừ tiền đúng, không mua 2 lần, nấu thử không đổi ví/ca, nâng cấp, màu dù.
import test from 'node:test'
import assert from 'node:assert/strict'
import { shopCatalog, recipePreview, buyShopRecipe, buyShopUpgrade, buyUmbrella, equipCosmetic,
  canTaste, startTasting, tastingSandbox, finishTasting } from '../../src/core/shop.js'
import { startCook, submitChon, availableSteps, getStep, submitStep, finishDish } from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { makeRequest } from '../../src/core/customer.js'
import { makeMetaCtx, newState, DATA } from '../helpers/meta-helpers.mjs'

test('danh mục: Kệ Chính 2 món, 3 thẻ bóng mờ Chặng 2, 5 nâng cấp, 3 màu dù', () => {
  const ctx = makeMetaCtx()
  const s = newState(1)
  const cat = shopCatalog(s, ctx)
  assert.equal(cat.name, 'Chợ Công Thức')
  assert.deepEqual(cat.recipes.map(r => r.id), ['banh_trang_tron', 'ca_phe_sua_da'])
  assert.deepEqual(cat.teasers.map(t => t.name), ['Gỏi cuốn', 'Bún thịt nướng', 'Chè ba màu'])
  assert.ok(cat.teasers.every(t => t.locked && t.note === 'Cần Quán cóc vỉa hè'))
  assert.equal(cat.upgrades.length, 5)
  assert.equal(cat.umbrellas.length, 3)
  assert.ok(cat.umbrellas.every(u => u.price === 30))
  // ngày 1: chưa mở món nào
  assert.ok(cat.recipes.every(r => !r.unlocked && !r.canBuy))
  assert.ok(cat.recipes.every(r => r.canTaste))
})

test('thẻ xem trước: số bước, độ khó, giá vốn, giá bán, lãi mỗi phần, số ca hoàn vốn', () => {
  const ctx = makeMetaCtx()
  const s = newState(1)
  s.day = 2
  const p = recipePreview(s, 'banh_trang_tron', ctx)
  assert.equal(p.cost, 8000)
  assert.equal(p.price, 20000)
  assert.equal(p.profit, 12000)
  assert.equal(p.shopPrice, 250000)
  assert.equal(p.fromDay, 2)
  assert.equal(p.difficulty, 2)
  assert.equal(p.steps, DATA.RECIPES.banh_trang_tron.steps.length)
  assert.ok(p.paybackShifts >= 5 && p.paybackShifts <= 20, String(p.paybackShifts))
  const q = recipePreview(s, 'ca_phe_sua_da', ctx)
  assert.equal(q.profit, 10000)
  assert.ok(q.mechanics.includes('rot'))
})

test('mua món: đúng ngày mở, trừ tiền đúng giá, không mua 2 lần, không mua trong ca; món mới được gọi ×2 hai ca đầu', () => {
  const ctx = makeMetaCtx()
  const s = newState(2)
  assert.equal(buyShopRecipe(s, 'banh_trang_tron', ctx).reason, 'chua_mo')
  s.day = 2
  s.wallet = 200000
  assert.equal(buyShopRecipe(s, 'banh_trang_tron', ctx).reason, 'thieu_tien')
  assert.equal(s.wallet, 200000)
  s.wallet = 300000
  s.shift = { day: 2 }
  assert.equal(buyShopRecipe(s, 'banh_trang_tron', ctx).reason, 'dang_ban')
  s.shift = null
  const r = buyShopRecipe(s, 'banh_trang_tron', ctx)
  assert.deepEqual(r, { ok: true, price: 250000 })
  assert.equal(s.wallet, 50000)
  assert.equal(s.recipes.banh_trang_tron.boughtDay, 2)
  assert.ok(ctx.events.some(e => e.type === 'recipe.bought' && e.payload.recipeId === 'banh_trang_tron'))
  assert.equal(buyShopRecipe(s, 'banh_trang_tron', ctx).reason, 'da_co')
  assert.equal(s.wallet, 50000)
  // món không có ở Kệ Chính (món sự kiện) không mua được
  assert.equal(buyShopRecipe(s, 'che_buoi', ctx).reason, 'khong_co')
  // cà phê mở từ ngày 4
  s.wallet = 999999
  assert.equal(buyShopRecipe(s, 'ca_phe_sua_da', ctx).reason, 'chua_mo')
  // ×2 trong 2 ca đầu
  const tally = day => {
    let n = 0, all = 0
    for (let k = 1; k <= 2000; k++) for (const l of makeRequest(s, { day, rng: k }, ctx)) { all++; if (l.recipeId === 'banh_trang_tron') n++ }
    return n / all
  }
  assert.ok(tally(2) > tally(5) * 1.4)
})

test('tab Nâng cấp mua bằng Tiền quán theo ngày mở; Góc Muỗng Vàng mua màu dù', () => {
  const ctx = makeMetaCtx()
  const s = newState(3)
  assert.equal(buyShopUpgrade(s, 'dao_thep', ctx).reason, 'chua_mo')
  s.day = 2
  assert.equal(buyShopUpgrade(s, 'dao_thep', ctx).ok, true)
  assert.equal(s.wallet, 50000)
  assert.equal(buyShopUpgrade(s, 'dao_thep', ctx).reason, 'da_co')
  s.goldSpoons = 25
  assert.equal(buyUmbrella(s, 'du_do', ctx).reason, 'thieu_muong')
  s.goldSpoons = 65
  assert.deepEqual(buyUmbrella(s, 'du_do', ctx), { ok: true, price: 30 })
  assert.equal(s.goldSpoons, 35)
  assert.equal(s.cosmetics.equipped.du, 'du_do')
  assert.equal(buyUmbrella(s, 'du_do', ctx).reason, 'da_co')
  assert.equal(buyUmbrella(s, 'du_xanh_la', ctx).ok, true)
  assert.equal(s.goldSpoons, 5)
  assert.equal(equipCosmetic(s, 'du_do', ctx).ok, true)
  assert.equal(s.cosmetics.equipped.du, 'du_do')
  assert.equal(equipCosmetic(s, 'du_soc', ctx).reason, 'khong_co')
  assert.equal(shopCatalog(s, ctx).umbrellas.find(u => u.id === 'du_do').equipped, true)
})

test('nấu thử miễn phí 1 lần: không đổi ví, ca, thạo món, nhiệm vụ; lần 2 bị từ chối', () => {
  const ctx = makeMetaCtx({ attach: true })
  const s = newState(4)
  ctx.setState(s)
  const snap = JSON.stringify({ wallet: s.wallet, recipes: s.recipes, stats: s.stats, daily: s.daily, chains: s.chains, shift: s.shift, tipsSeen: s.tipsSeen })
  assert.equal(canTaste(s, 'banh_trang_tron', ctx).ok, true)
  const t = startTasting(s, 'banh_trang_tron', ctx)
  assert.equal(t.ok, true)
  assert.equal(s.shift, null)
  const box = tastingSandbox(s, ctx)
  const cook = startCook(box.state, 'thu1', 0, box.ctx)
  assert.ok(cook)
  const R = DATA.RECIPES.banh_trang_tron
  assert.equal(submitChon(box.state, requiredIngredients(R, []).required, 0, box.ctx).ok, true)
  let av
  while ((av = availableSteps(box.state)).length) {
    const st = getStep(box.state, av[0])
    submitStep(box.state, av[0], { score: 95, method: st.method ? st.method.correct : undefined }, box.ctx)
  }
  const dish = finishDish(box.state, box.ctx)
  assert.equal(dish.grade, 'tuyet_hao')
  // phiên nấu thử lưu trong state.tasting (tải lại được), không đụng tới state thật
  assert.equal(s.tasting.shift.cook.phase, 'xong')
  const fin = finishTasting(s, ctx)
  assert.equal(fin.ok, true)
  assert.equal(fin.result.grade, 'tuyet_hao')
  assert.equal(s.tasting, null)
  const after = JSON.parse(JSON.stringify({ wallet: s.wallet, recipes: s.recipes, stats: s.stats, daily: s.daily, chains: s.chains, shift: s.shift, tipsSeen: s.tipsSeen }))
  const before = JSON.parse(snap)
  after.stats.tastings = 0
  assert.deepEqual(after, before)
  assert.deepEqual(s.shop.tried, ['banh_trang_tron'])
  assert.equal(canTaste(s, 'banh_trang_tron', ctx).reason, 'da_nau_thu')
  assert.equal(startTasting(s, 'banh_trang_tron', ctx).reason, 'da_nau_thu')
  // món đã có không cần nấu thử; trong ca không nấu thử
  assert.equal(canTaste(s, 'banh_mi_op_la', ctx).reason, 'da_co')
  s.shift = { day: 1 }
  assert.equal(canTaste(s, 'ca_phe_sua_da', ctx).reason, 'dang_ban')
  s.shift = null
  // không có sự kiện miền nào lọt ra bus trong lúc nấu thử
  assert.ok(!ctx.events.some(e => ['step.done', 'dish.done', 'cook.started'].includes(e.type)))
  ctx.detach()
})
