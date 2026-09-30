// Chuỗi nhiệm vụ: "Ngày đầu ra phố" đếm từ lúc bước hiện ra, luôn 1 bước đang làm, thưởng + Mẹo nghề;
// "Làm quen QR" ép 1 khách QR giả, Loa chặn cũng tính là xong, không bao giờ kẹt.
import test from 'node:test'
import assert from 'node:assert/strict'
import { handleMetaEvent } from '../../src/core/meta.js'
import { chainStatus, claimChainReward, refreshChains, chainForcesFakeQr } from '../../src/core/chains.js'
import { buyShopRecipe } from '../../src/core/shop.js'
import { buyUpgrade } from '../../src/core/economy.js'
import { startShift, advance, isShiftOver, endShift } from '../../src/core/shift.js'
import { confirmQr } from '../../src/core/order.js'
import { counterStep, cookTicket } from '../helpers/perfect-player.mjs'
import { makeMetaCtx, newState, at } from '../helpers/meta-helpers.mjs'

const C1 = 'ngay_dau_ra_pho'
const QR = 'lam_quen_qr'

function ev(s, ctx, ni, type, payload = {}, n = 1) {
  for (let i = 0; i < n; i++) handleMetaEvent(s, type, payload, ctx, ni)
}
const rated = (stars = 5) => ({ customerId: 'k', stars, counterErrors: [], kitchenErrors: [] })
const changeOk = { correct: true, optimal: true, diff: 0, due: 10000, attempt: 1 }

test('C1: bước "làm N lần" chỉ đếm từ lúc bước hiện ra; luôn đúng 1 bước đang làm', () => {
  const ctx = makeMetaCtx()
  const s = newState(1)
  const ni = at(s, '2026-10-01T09:00')
  refreshChains(s, ni, ctx)
  let st = chainStatus(s, ni, ctx).find(c => c.id === C1)
  assert.equal(st.step, 0)
  assert.equal(st.total, 7)
  assert.equal(st.text, 'Phục vụ khách đầu tiên')
  // thối đúng trước khi bước 2 hiện ra: không tính
  ev(s, ctx, ni, 'change.given', changeOk, 4)
  ev(s, ctx, ni, 'order.readback', { errorsFound: 0, errorsMissed: 0 })
  ev(s, ctx, ni, 'customer.rated', rated())
  st = chainStatus(s, ni, ctx).find(c => c.id === C1)
  assert.equal(st.step, 1)
  assert.equal(st.progress, 0)
  assert.equal(st.text, 'Thối đúng 3 lần')
  assert.equal(st.claimable.length, 1)
  ev(s, ctx, ni, 'change.given', changeOk, 2)
  ev(s, ctx, ni, 'change.given', { ...changeOk, due: 0 })        // không phải thối: không tính
  assert.equal(s.chains[C1].progress, 2)
  ev(s, ctx, ni, 'change.given', changeOk)
  assert.equal(s.chains[C1].step, 2)
  // đọc lại: chỉ lần đọc lại đầu tiên của mỗi khách, không lỗi
  for (let i = 0; i < 3; i++) {
    ev(s, ctx, ni, 'counter.begin', { customerId: 'k' + i })
    ev(s, ctx, ni, 'order.readback', { errorsFound: i === 0 ? 1 : 0, errorsMissed: 0 })
    ev(s, ctx, ni, 'order.readback', { errorsFound: 0, errorsMissed: 0 })
  }
  assert.equal(s.chains[C1].progress, 2)
  ev(s, ctx, ni, 'counter.begin', { customerId: 'k9' })
  ev(s, ctx, ni, 'order.readback', { errorsFound: 0, errorsMissed: 0 })
  assert.equal(s.chains[C1].step, 3)
  // Hoàn hảo ở bước bếp (Tự làm không tính)
  ev(s, ctx, ni, 'step.done', { type: 'cha', score: 99, auto: true }, 5)
  assert.equal(s.chains[C1].progress, 0)
  ev(s, ctx, ni, 'step.done', { type: 'cha', score: 90, auto: false }, 5)
  assert.equal(s.chains[C1].step, 4)
  // thưởng từng bước + thẻ Mẹo nghề
  const g = s.goldSpoons, w = s.wallet
  const r0 = claimChainReward(s, C1, 0, ni, ctx)
  assert.equal(r0.ok, true)
  assert.equal(s.goldSpoons, g + 5)
  assert.ok(s.tipsSeen.includes('tra_truoc'))
  for (const k of [1, 2, 3]) assert.equal(claimChainReward(s, C1, k, ni, ctx).ok, true)
  assert.equal(s.wallet, w + 5000 + 5000 + 15000)
  assert.equal(claimChainReward(s, C1, 3, ni, ctx).reason, 'chua_xong')
  // không nhận trong ca
  ev(s, ctx, ni, 'recipe.bought', {})
  s.shift = { day: 1 }
  assert.equal(claimChainReward(s, C1, null, ni, ctx).reason, 'dang_ban')
  s.shift = null
})

test('C1: bước "đạt mức" kiểm tra trạng thái hiện tại; hoàn thành → danh hiệu, Muỗng Vàng, mở thẻ Quán cóc', () => {
  const ctx = makeMetaCtx()
  const s = newState(2)
  const ni = at(s, '2026-10-02T09:00')
  // mua công thức TRƯỚC khi tới bước 5
  s.day = 2
  s.wallet = 400000
  assert.equal(buyShopRecipe(s, 'banh_trang_tron', ctx).ok, true)
  s.chains[C1] = { step: 4, progress: 0, done: false, claimable: [], since: '' }
  refreshChains(s, ni, ctx)
  assert.equal(s.chains[C1].step, 5, 'bước mua công thức xong ngay vì đã có món Shop')
  ev(s, ctx, ni, 'dish.done', { recipeId: 'banh_mi_op_la', grade: 'tuyet_hao', q: 95, flawless: true, errors: [] }, 3)
  assert.equal(s.chains[C1].step, 6)
  // bước 7: 150 danh tiếng và sao trung bình ≥ 3,8
  s.reputation = 149
  s.ratings = [5, 5, 5, 5, 5, 5]
  ev(s, ctx, ni, 'shift.ended', { day: 2, profit: 0, served: 0, lost: 0 })
  assert.equal(s.chains[C1].done, false)
  s.reputation = 150
  s.ratings = [3, 3, 3, 3, 3, 3]
  ev(s, ctx, ni, 'shift.ended', { day: 2, profit: 0, served: 0, lost: 0 })
  assert.equal(s.chains[C1].done, false)
  s.ratings = [4, 4, 4, 4, 3, 4]
  ev(s, ctx, ni, 'shift.ended', { day: 2, profit: 0, served: 0, lost: 0 })
  assert.equal(s.chains[C1].done, true)
  const g = s.goldSpoons
  while (s.chains[C1].claimable.length) assert.equal(claimChainReward(s, C1, null, ni, ctx).ok, true)
  assert.ok(s.titles.includes('chu_xe_dau_hem'))
  assert.ok(s.unlocks.includes('the_quan_coc'))
  assert.equal(s.goldSpoons, g + 5 + 20)
  const st = chainStatus(s, ni, ctx).find(c => c.id === C1)
  assert.equal(st.done, true)
})

// Chơi 1 ca bằng người chơi hoàn hảo, nhưng khách trả ảnh chuyển khoản giả do onFake xử lý.
function playWithFake(s, ctx, onFake) {
  startShift(s, ctx)
  let fakes = 0, guard = 0
  while (!isShiftOver(s)) {
    if (++guard > 20000) throw new Error('ca không kết thúc')
    for (;;) {
      const c = s.shift.counter
      if (c && c.stage === 'tinh_tien' && c.payMethod === 'qr' && c.fakeQr && !c.paid) { fakes++; onFake(s, ctx); continue }
      if (!counterStep(s, ctx)) break
    }
    for (const t of s.shift.tickets.slice()) cookTicket(s, ctx, t)
    if (!isShiftOver(s)) advance(s, 0.5, ctx)
  }
  endShift(s, ctx)
  return fakes
}

test('"Làm quen QR": mở từ ngày game 4; ép 1 khách QR giả ở ca kế tiếp; nhận nhầm thì ca sau ép tiếp; bắt được → xong bước', () => {
  const ctx = makeMetaCtx({ attach: true, at: '2026-10-05T09:00' })
  const s = newState(31)
  ctx.setState(s)
  const ni = at(s, '2026-10-05T09:00')
  s.day = 3
  refreshChains(s, ni, ctx)
  assert.equal(s.chains[QR], undefined)
  s.day = 4
  refreshChains(s, ni, ctx)
  assert.equal(s.chains[QR].step, 0)
  ev(s, ctx, ni, 'qr.confirmed', { fake: false, blocked: false }, 3)
  assert.equal(s.chains[QR].step, 1)
  assert.equal(chainForcesFakeQr(s, ctx), true)
  // ca 1: người chơi xác nhận nhầm ảnh giả → bước chưa xong
  const f1 = playWithFake(s, ctx, st => confirmQr(st, ctx))
  assert.equal(f1, 1, 'phải có đúng 1 khách QR giả được ép')
  assert.equal(s.chains[QR].step, 1)
  // ca 2: vẫn ép; lần này từ chối ảnh giả (người chơi hoàn hảo) → xong bước
  const f2 = playWithFake(s, ctx, st => { const r = counterStep(st, ctx); assert.ok(r) })
  assert.equal(f2, 1)
  assert.equal(s.chains[QR].step, 2)
  assert.equal(chainForcesFakeQr(s, ctx), false)
  // bước 3: mua Loa báo tiền
  s.wallet = 1000000
  s.day = 5
  assert.equal(buyUpgrade(s, 'loa_bao_tien', ctx).ok, true)
  assert.equal(s.chains[QR].done, true)
  while (s.chains[QR].claimable.length) claimChainReward(s, QR, null, ni, ctx)
  assert.ok(s.tipsSeen.includes('qr_dung_so'))
  ctx.detach()
})

test('"Làm quen QR": đã có Loa báo tiền thì Loa chặn ảnh giả cũng tính là xong, chuỗi không kẹt', () => {
  const ctx = makeMetaCtx({ attach: true, at: '2026-10-05T09:00' })
  const s = newState(32)
  ctx.setState(s)
  const ni = at(s, '2026-10-05T09:00')
  s.day = 6
  s.upgrades.loa_bao_tien = true
  s.chains[QR] = { step: 1, progress: 0, done: false, claimable: [0], since: '' }
  const fakes = playWithFake(s, ctx, st => { const r = confirmQr(st, ctx); assert.equal(r.blocked, true) })
  assert.equal(fakes, 1)
  // bước phát hiện ảnh giả xong nhờ Loa chặn; bước mua Loa xong ngay vì đã có Loa
  assert.equal(s.chains[QR].done, true)
  assert.deepEqual(s.chains[QR].claimable, [0, 1, 2])
  assert.ok(s.stats.fakeQrDetected >= 1)
  ctx.detach()
})
