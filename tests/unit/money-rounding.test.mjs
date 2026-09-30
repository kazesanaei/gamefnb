// Soát tiền lẻ (M3): Tiền quán luôn là bội 500đ, mọi khoản thưởng Tiền quán là bội 1.000đ.
// Nguồn lẻ cũ: giá vốn nguyên liệu lẻ 100–400đ (ghi chú "Cay", "Không hành", "Không đá", lấy nhầm/thừa nguyên liệu),
// Phiếu Chợ Sớm ×0,8 → nay mỗi lượt nấu trừ giá vốn theo bội 500đ (roundCost); thưởng làm tròn lên bội 1.000đ.
// Mô phỏng nhiều ngày với "người chơi ẩu" (lấy thừa/nhầm nguyên liệu, báo thiếu tổng, thối dư, món hỏng → hoàn tiền,
// Phiếu Chợ Sớm, vay Dì Sáu, tình huống trong ca với lựa chọn ngẫu nhiên, nhận mọi thưởng, mua món/nâng cấp):
// sau MỌI thao tác đổi ví, ví chia hết cho 500.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState, refIncomeFor } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { startShift, advance, isShiftOver, endShift } from '../../src/core/shift.js'
import {
  addLine, readback, confirmOrder, priceOfLines, reportTotal, trayAdd, giveChange, changeOptions,
  resolveNoChange, changeRemaining, confirmQr, rejectQr, clipTicket
} from '../../src/core/order.js'
import { startCook, submitChon, availableSteps, getStep, submitStep, finishDish, serveTicket, resolveComplaint, retryStep } from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { minBillsChange, addBills, roundCost, roundReward, BILLS } from '../../src/core/money.js'
import { incomeMoney, resolveReward } from '../../src/core/rewards.js'
import { leftoverMoney, setMarketCoupon, dayEventInfo, setDayEventChoice } from '../../src/core/events.js'
import { takeLoan, offerLoan } from '../../src/core/economy.js'
import { checkinStatus, claimCheckin } from '../../src/core/checkin.js'
import { questList, claimQuest, claimDailyChest } from '../../src/core/quests.js'
import { claimAllMail } from '../../src/core/mail.js'
import { chainStatus, claimChainReward } from '../../src/core/chains.js'
import { shopCatalog, buyShopRecipe, buyShopUpgrade } from '../../src/core/shop.js'
import { claimNotebookGroup, notebookStatus } from '../../src/core/notebook.js'
import { handleIncident } from '../helpers/perfect-player.mjs'
import { makeMetaCtx, vn } from '../helpers/meta-helpers.mjs'

const DAY = 24 * 3600 * 1000

test('roundCost: bội 500đ gần nhất (0,5 lên); roundReward: lên bội 1.000đ', () => {
  assert.equal(roundCost(9250), 9500)       // Bánh mì "Cay" (+ tương ớt 250đ)
  assert.equal(roundCost(8750), 9000)       // "Không hành" (−250đ)
  assert.equal(roundCost(2600), 2500)       // Trà tắc "Không đá" (−400đ)
  assert.equal(roundCost(7200), 7000)       // Bánh mì × Phiếu Chợ Sớm 0,8
  assert.equal(roundCost(2400), 2500)
  assert.equal(roundCost(100), 0)
  assert.equal(roundCost(250), 500)
  assert.equal(roundCost(0), 0)
  assert.equal(roundReward(7000), 7000)
  assert.equal(roundReward(7001), 8000)
  assert.equal(roundReward(4500), 5000)
  assert.equal(roundReward(0), 0)
})

test('mọi con số tiền trong dữ liệu và mọi khoản thưởng quy đổi đều là bội 1.000đ', () => {
  const ctx = { data: DATA, emit() {} }
  const B = DATA.BALANCE
  // M4: bỏ tipBonus (tip một mức), thêm ngưỡng hóa đơn tipMinBill
  assert.equal(B.tipBonus, undefined)
  for (const k of ['startWallet', 'fixedCostPerShift', 'tipFiveStar', 'tipMinBill', 'loanAmount']) assert.equal(B[k] % 1000, 0, k)
  for (const r of Object.values(DATA.RECIPES)) {
    assert.equal(r.price % 5000, 0)
    if (r.shopPrice) assert.equal(r.shopPrice % 1000, 0)
    for (const n of r.notes || []) if (n.surcharge) assert.equal(n.surcharge % 1000, 0)
    for (const st of r.steps) if (st.retryCost) assert.equal(st.retryCost % 500, 0)
  }
  for (const u of Object.values(DATA.UPGRADES)) assert.equal(u.price % 1000, 0, u.id)
  for (const e of Object.values(DATA.DAY_EVENTS)) if (e.choice) assert.equal(e.choice.cost % 1000, 0)
  // phần thưởng khai báo (điểm danh, chuỗi, thư, việc, sự kiện): tiền cố định bội 1.000đ
  const rewards = []
  const walk = v => { if (v && typeof v === 'object') { if ('money' in v || 'incomeMul' in v) rewards.push(v); for (const x of Object.values(v)) walk(x) } }
  walk({ c: DATA.CHECKIN, ch: DATA.CHAINS, m: [DATA.MAIL_WELCOME, DATA.MAIL_VERSIONS, DATA.MAIL_HOLIDAYS], q: DATA.QUEST_CONFIG, e: DATA.EVENTS, t: DATA.TIP_GROUP_REWARDS })
  assert.ok(rewards.length > 10)
  const s = defaultState(1, DATA)
  for (let day = 1; day <= 30; day++) {
    s.day = day
    for (const r of rewards) {
      if (r.money) assert.equal(r.money % 1000, 0, JSON.stringify(r))
      const got = resolveReward(s, r, ctx)
      assert.equal((got.money || 0) % 1000, 0, `ngày ${day}: ${JSON.stringify(r)} → ${got.money}`)
    }
    for (let m = 0.05; m <= 3.001; m += 0.05) assert.equal(incomeMoney(ctx, m, day) % 1000, 0, `${m} × ${refIncomeFor(ctx, day)}`)
    for (const tem of [0, 1, 37, 99, 100, 155, 333, 999, 5000]) assert.equal(leftoverMoney(DATA.EVENTS.tri_an_20_11, tem, ctx, day) % 1000, 0)
  }
  // tiền lẻ trong dữ liệu đặt tay (vd 2.500đ) cũng được làm tròn lên khi trao
  assert.equal(resolveReward(s, { money: 2500 }, ctx).money, 3000)
  // nợ Dì Sáu (gốc + lãi) bội 1.000đ
  const l = defaultState(2, DATA)
  l.wallet = 0
  assert.ok(takeLoan(l, DATA.BALANCE))
  assert.equal(l.loan.remaining % 1000, 0)
})

// ---------- Người chơi ẩu ----------

function rng(seed) {
  let x = (seed >>> 0) || 1
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296 }
}

function sloppyCounter(state, ctx, rnd) {
  const sh = state.shift
  const c = sh.counter
  if (!c) return false
  const cust = sh.customers[c.customerId]
  const R = ctx.data.RECIPES
  if (c.stage === 'order') {
    if (!c.draft.length) for (const l of cust.request) addLine(state, l)
    readback(state, ctx)
    const r = confirmOrder(state, ctx)
    if (!r.ok) throw new Error('không chốt được order: ' + r.reason)
    return true
  }
  if (c.stage === 'thanh_toan') {
    const total = priceOfLines(cust.request, R)
    // thỉnh thoảng báo thiếu vài nghìn (khách trả theo số đã báo)
    const amount = rnd() < 0.15 ? Math.max(1000, total - 1000 * (1 + Math.floor(rnd() * 4))) : total
    reportTotal(state, amount, ctx)
    return true
  }
  if (c.stage === 'tinh_tien') {
    if (c.payMethod === 'cash' && !c.changeDone) {
      for (const o of ['lam_tron', 'moi_qr', 'xin_tien_le']) {
        const opts = changeOptions(state, ctx)
        if (!opts.length) break
        if (opts.includes(o)) resolveNoChange(state, o, ctx)
        if (c.payMethod !== 'cash') return true
      }
      if (changeOptions(state, ctx).length) return false
      const due = changeRemaining(state)
      const pool = addBills({ ...sh.drawer }, c.tray, 1)
      const best = minBillsChange(due, pool)
      if (!best) return false
      for (const b of Object.keys(best.bills)) for (let i = 0; i < best.bills[b]; i++) trayAdd(state, Number(b))
      // thỉnh thoảng thối dư một tờ 5.000đ
      if (rnd() < 0.12) trayAdd(state, 5000)
      giveChange(state, ctx)
      return true
    }
    if (c.payMethod === 'qr' && !c.paid) {
      if (c.fakeQr) { rejectQr(state, ctx); return true }
      if (!c.qrArrived) return false
      confirmQr(state, ctx)
    }
    const k = clipTicket(state, ctx)
    return k.ok
  }
  return false
}

function sloppyCook(state, ctx, ticket, rnd) {
  const R = ctx.data.RECIPES
  for (let i = 0; i < ticket.lines.length; i++) {
    if (ticket.done[i]) continue
    const cook = startCook(state, ticket.id, i, ctx)
    if (!cook) throw new Error('không mở được phiên nấu')
    const recipe = R[cook.recipeId]
    const req = requiredIngredients(recipe, cook.notes)
    const picked = req.required.slice()
    // lấy thừa / lấy nhầm bẫy (giá lẻ 100–500đ)
    if (rnd() < 0.3) picked.push(recipe.decoys[Math.floor(rnd() * recipe.decoys.length)])
    if (rnd() < 0.15) { const extra = recipe.shelf.find(id => !picked.includes(id)); if (extra) picked.push(extra) }
    const r = submitChon(state, picked, Math.floor(rnd() * 2), ctx)
    assert.equal(Math.abs(state.wallet) % 500, 0, `ví lẻ sau khi chọn nguyên liệu: ${state.wallet}`)
    if (!r.ok) throw new Error('chọn bị chặn')
    let av
    while ((av = availableSteps(state)).length) {
      const st = getStep(state, av[0])
      const score = rnd() < 0.1 ? 20 : 70 + Math.floor(rnd() * 31)
      submitStep(state, av[0], { score, method: st.method ? st.method.correct : undefined }, ctx)
      if (score < 50 && rnd() < 0.5 && retryStep(state, av[0], ctx).ok) {
        assert.equal(Math.abs(state.wallet) % 500, 0)
        submitStep(state, av[0], { score: 85, method: st.method ? st.method.correct : undefined }, ctx)
      }
    }
    finishDish(state, ctx)
  }
  let sheet = serveTicket(state, ticket.id, ctx)
  if (sheet && !sheet.final) {
    const action = rnd() < 0.6 ? 'refund' : 'remake'
    resolveComplaint(state, sheet.customerId, { apologyIndex: 0, action }, ctx)
  }
}

function playSloppyShift(state, ctx, rnd, check) {
  startShift(state, ctx)
  check('mở ca')
  let steps = 0
  while (!isShiftOver(state)) {
    if (++steps > 30000) throw new Error('ca không kết thúc')
    handleIncident(state, ctx, v => { const ok = v.choices.filter(c => c.available); return ok[Math.floor(rnd() * ok.length)].id })
    check('tình huống')
    while (sloppyCounter(state, ctx, rnd)) {
      handleIncident(state, ctx, v => { const ok = v.choices.filter(c => c.available); return ok[Math.floor(rnd() * ok.length)].id })
      check('quầy')
    }
    for (const t of state.shift.tickets.slice()) { sloppyCook(state, ctx, t, rnd); check('bếp') }
    if (!isShiftOver(state)) advance(state, 0.5, ctx)
  }
  const summary = endShift(state, ctx)
  check('cuối ca')
  return summary
}

for (const seed of [11, 42, 2024]) {
  test(`mô phỏng 7 ngày thật × 3 ca người chơi ẩu: Tiền quán luôn là bội 500đ, thưởng bội 1.000đ (seed ${seed})`, () => {
    const rnd = rng(seed * 7 + 1)
    const ctx = makeMetaCtx({ at: '2026-10-05T08:00', attach: true })
    const state = defaultState(seed, DATA)
    ctx.setState(state)
    state.shopName = 'Xe tiền lẻ'
    state.settings.incidentFrequency = 'nhieu'
    const log = []
    const check = where => {
      log.push(state.wallet)
      assert.equal(Math.abs(state.wallet) % 500, 0, `${where} (ngày game ${state.day}): ví ${state.wallet}`)
      assert.ok(Number.isInteger(state.wallet))
    }
    const claim = r => {
      if (!r || !r.ok) return
      const rewards = r.rewards ? r.rewards.map(x => x.reward) : [r.reward]
      for (const x of rewards) if (x && x.money) assert.equal(x.money % 1000, 0, `thưởng lẻ ${x.money}`)
      check('nhận thưởng')
    }
    let odd = 0
    for (let d = 0; d < 7; d++) {
      ctx.clock.t = vn('2026-10-05T08:00') + d * DAY
      const ni = () => makeNowInfo(state, ctx.clock.t)
      refreshMeta(state, ni(), ctx)
      if (checkinStatus(state, ni(), ctx).canClaim) claim(claimCheckin(state, ni(), ctx))
      for (let k = 0; k < 3; k++) {
        ctx.clock.t = vn('2026-10-05T08:00') + d * DAY + k * 4 * 3600 * 1000
        // chuẩn bị: Phiếu Chợ Sớm, căng bạt, vay khi hết tiền, mua món/nâng cấp khi dư
        if (state.items.phieu_cho_som > 0 && rnd() < 0.8) setMarketCoupon(state, true)
        const info = dayEventInfo(state, state.day, ctx)
        if (info && info.choice && !info.choice.free && info.choice.cost <= state.wallet) setDayEventChoice(state, info.choice.id, ctx)
        if (rnd() < 0.2 && !state.loan) state.wallet = Math.min(state.wallet, 15000)   // ép cạn ví để thử vay Dì Sáu
        if (offerLoan(state, DATA.BALANCE)) { takeLoan(state, DATA.BALANCE); check('vay') }
        for (const r of shopCatalog(state, ctx).recipes) if (r.canBuy && state.wallet > r.shopPrice + 50000) { buyShopRecipe(state, r.id, ctx); check('mua món') }
        for (const u of shopCatalog(state, ctx).upgrades) if (u.canBuy && state.wallet > u.price + 80000) { buyShopUpgrade(state, u.id, ctx); check('mua nâng cấp') }
        const sum = playSloppyShift(state, ctx, rnd, check)
        if (sum.cogs % 1000 || sum.waste % 1000) odd++
        for (const x of [sum.cogs, sum.waste, sum.refunds, sum.profit, sum.debtIn, sum.loanRepaid]) assert.equal(Math.abs(x) % 500, 0, JSON.stringify(sum))
        ctx.clock.t += 40 * 60000
        const info2 = ni()
        for (const q of questList(state, ctx).quests) if (q.canClaim) claim(claimQuest(state, q.index, info2, ctx))
        if (questList(state, ctx).chest.available) claim(claimDailyChest(state, info2, ctx))
        for (const c of chainStatus(state, info2, ctx)) for (const s of c.claimable) claim(claimChainReward(state, c.id, s.stepIndex, info2, ctx))
        claim(claimAllMail(state, info2, ctx))
        for (const g of notebookStatus(state, ctx).groups) if (g.canClaim) claim(claimNotebookGroup(state, g.id, ctx))
      }
    }
    assert.ok(log.length > 100)
    assert.ok(odd > 0, 'mô phỏng phải đi qua các khoản giá vốn lẻ nửa nghìn (nếu không thì không kiểm được gì)')
    assert.ok(state.incidents.total > 0, 'có tình huống trong ca')
    assert.ok(state.stats.shiftsPlayed === 21)
    assert.ok(BILLS.every(b => b % 5000 === 0))
  })
}
