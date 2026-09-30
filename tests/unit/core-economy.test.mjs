import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultState, unlockTip } from '../../src/core/state.js'
import { canAfford, spend, earn, offerLoan, takeLoan, buyUpgrade, buyRecipe } from '../../src/core/economy.js'
import { masteryLevel, recordDish, canAutoStep } from '../../src/core/mastery.js'
import { startShift } from '../../src/core/shift.js'
import { playShift } from '../helpers/perfect-player.mjs'
import { DATA, BALANCE, makeCtx } from '../fixtures/data.mjs'

test('defaultState đúng hợp đồng', () => {
  const s = defaultState(0xdeadbeef)
  // M4 (sửa có chủ ý): save lên version 3 (bản 0.4.0: tình huống/sự kiện tiền, kho hàng hiếm)
  assert.equal(s.version, 3); assert.equal(s.seed, 0xdeadbeef); assert.equal(s.day, 1); assert.equal(s.wallet, 200000)
  assert.deepEqual(Object.keys(s.recipes), ['banh_mi_op_la', 'tra_tac'])
  assert.deepEqual(s.recipes.tra_tac, { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 })
  assert.equal(s.shift, null); assert.deepEqual(s.clock, { maxSeen: 0 })
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(s))), JSON.stringify(s))
  assert.deepEqual(Object.keys(defaultState(1, DATA).recipes), ['banh_mi_op_la', 'tra_tac'])
})

test('chi tiêu, thu, vay Dì Sáu và trả nợ 25% lãi mỗi ca', () => {
  const s = defaultState(1)
  assert.equal(canAfford(s, 200000), true)
  assert.equal(spend(s, 250000), false)
  assert.equal(spend(s, 150000), true); assert.equal(s.wallet, 50000)
  assert.equal(earn(s, 10000), true); assert.equal(s.wallet, 60000)
  assert.equal(offerLoan(s, BALANCE), false)
  s.wallet = 10000
  assert.equal(offerLoan(s, BALANCE), true)
  assert.equal(takeLoan(s, BALANCE), true)
  assert.equal(takeLoan(s, BALANCE), false)
  assert.equal(s.wallet, 250000)
  assert.deepEqual(s.loan, { amount: 240000, remaining: 264000 })
  const ctx = makeCtx()
  const { summary, walletBefore, walletAfter } = playShift(s, ctx)
  assert.ok(summary.profit > 0)
  assert.equal(summary.loanRepaid, Math.ceil(summary.profit * 0.25 / 1000) * 1000)
  assert.equal(walletAfter - walletBefore, summary.profit - summary.loanRepaid)
  assert.equal(s.loan.remaining, 264000 - summary.loanRepaid)
})

test('mua nâng cấp và công thức', () => {
  const ctx = makeCtx()
  const s = defaultState(1)
  assert.equal(buyUpgrade(s, 'dao_thep', ctx).reason, 'chua_mo')
  s.day = 2
  assert.equal(buyUpgrade(s, 'dao_thep', ctx).ok, true)
  assert.equal(s.upgrades.dao_thep, true); assert.equal(s.wallet, 50000)
  assert.equal(buyUpgrade(s, 'dao_thep', ctx).reason, 'da_co')
  s.day = 5
  assert.equal(buyUpgrade(s, 'loa_bao_tien', ctx).reason, 'thieu_tien')
  assert.ok(ctx.events.some(e => e.type === 'upgrade.bought'))
  const data = { ...DATA, RECIPES: { ...DATA.RECIPES, mon_moi: { ...DATA.RECIPES.tra_tac, id: 'mon_moi', source: 'shop' } } }
  const ctx2 = makeCtx(data)
  s.wallet = 300000
  assert.equal(buyRecipe(s, 'mon_moi', 250000, ctx2).ok, true)
  assert.equal(s.recipes.mon_moi.boughtDay, 5)
  assert.deepEqual(ctx2.events.at(-1), { type: 'recipe.bought', payload: { recipeId: 'mon_moi' } })
})

test('thạo món: cấp theo goodCooks, ghi khi ra món', () => {
  assert.equal(masteryLevel({ goodCooks: 0 }), 1)
  assert.equal(masteryLevel({ goodCooks: 4 }), 1)
  assert.equal(masteryLevel({ goodCooks: 5 }), 2)
  assert.equal(masteryLevel({ goodCooks: 15 }), 3)
  assert.equal(masteryLevel({ goodCooks: 99 }), 3)
  const s = defaultState(1)
  for (let i = 0; i < 4; i++) recordDish(s, 'tra_tac', { grade: 'ngon', q: 80, flawless: false })
  assert.equal(canAutoStep(s, 'tra_tac'), false)
  recordDish(s, 'tra_tac', { grade: 'duoc', q: 65 })
  assert.equal(canAutoStep(s, 'tra_tac'), false)
  const r = recordDish(s, 'tra_tac', { grade: 'tuyet_hao', q: 97, flawless: true })
  assert.deepEqual(r, { levelBefore: 1, levelAfter: 2, levelUp: true })
  assert.deepEqual(s.recipes.tra_tac, { cooks: 6, goodCooks: 5, excellent: 1, flawless: 1, best: 97, boughtDay: 0 })
  assert.equal(canAutoStep(s, 'tra_tac'), true)
  assert.equal(recordDish(s, 'khong_co', { grade: 'ngon', q: 80 }), null)
})

test('Mẹo nghề: mở 1 lần; ngoài ngày 1 tối đa 1 thẻ mỗi ca', () => {
  const ctx = makeCtx()
  const s = defaultState(1)
  assert.equal(unlockTip(s, 'first_readback', ctx), 'doc_lai_order')
  assert.equal(unlockTip(s, 'first_readback', ctx), null)
  s.day = 3
  startShift(s, ctx)
  assert.equal(unlockTip(s, 'change_wrong', ctx), 'dem_hai_lan')
  assert.equal(unlockTip(s, 'fake_qr', ctx), null)
  assert.deepEqual(s.tipsSeen, ['doc_lai_order', 'dem_hai_lan'])
  assert.equal(ctx.events.filter(e => e.type === 'tip.unlocked').length, 2)
  // M3 (vòng soát lỗi): tắt công tắc "Mẹo nghề" chỉ tắt thẻ nổi; thẻ vẫn mở và vào Sổ tay nghề
  s.settings.tips = false
  s.shift = null
  assert.equal(unlockTip(s, 'fake_qr', ctx), 'qr_dung_so')
  assert.ok(s.tipsSeen.includes('qr_dung_so'))
})
