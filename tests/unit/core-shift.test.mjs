import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA, BALANCE, RECIPES, makeCtx } from '../fixtures/data.mjs'
import { defaultState } from '../../src/core/state.js'
import { startShift, advance, isShiftOver, endShift, setPaused, loadFactor, customerCount, gameTime } from '../../src/core/shift.js'
import { makeRequest } from '../../src/core/customer.js'
import { encodeSave, decodeSave, migrate } from '../../src/core/save.js'
import { playShift, counterStep, cookTicket } from '../helpers/perfect-player.mjs'

const EVENTS = ['order.readback', 'order.confirmed', 'total.reported', 'payment.received', 'change.given', 'ticket.clipped',
  'step.done', 'dish.done', 'dish.served', 'customer.rated', 'shift.started', 'shift.ended']

test('mô phỏng ca với "người chơi hoàn hảo": bất biến ví = lãi, 5 sao', () => {
  for (const seed of [1, 7, 99]) {
    const ctx = makeCtx()
    const state = defaultState(seed)
    for (let day = 1; day <= 9; day++) {
      const { summary, walletBefore, walletAfter } = playShift(state, ctx)
      assert.equal(walletAfter - walletBefore, summary.profit, `seed ${seed} ngày ${day}`)
      assert.equal(summary.day, day)
      assert.equal(state.day, day + 1)
      assert.equal(state.shift, null)
      assert.ok(summary.served >= 3)
      for (const s of summary.ratings) assert.equal(s, 5)
      assert.equal(summary.undercharge, 0)
      assert.equal(summary.overchange, 0)
      assert.equal(summary.drawerDiff + summary.rounding, 0)
      // M4: lãi gồm cả sổ tiền sự kiện (+ tiền từ sự kiện − phạt, chi sự kiện)
      assert.equal(summary.eventIn, 0)
      assert.equal(summary.eventOut, 0)
      const recomputed = summary.cashSales + summary.qrSales + summary.tips + summary.eventIn - summary.cogs - summary.waste -
        summary.fixedCost - summary.refunds - summary.rounding - summary.eventOut
      assert.equal(summary.profit, recomputed)
    }
    assert.equal(state.history.length, 9)
    assert.equal(state.stats.shiftsPlayed, 9)
    assert.ok(state.stats.customersServed > 40)
    assert.ok(state.reputation > 100)
    assert.ok(state.ratings.length === 30)
    assert.ok(state.reviews.length > 0)
    const types = new Set(ctx.events.map(e => e.type))
    for (const t of EVENTS) assert.ok(types.has(t), 'thiếu sự kiện ' + t)
    assert.ok(state.recipes.banh_mi_op_la.goodCooks > 0)
    // payload sự kiện đúng hợp đồng
    const ended = ctx.events.filter(e => e.type === 'shift.ended').map(e => Object.keys(e.payload).sort().join(','))
    assert.ok(ended.every(k => k === 'day,lost,profit,served'))
  }
})

test('ngày 1: 2 khách đầu là cô Thu và bạn Nam (hướng dẫn)', () => {
  const ctx = makeCtx()
  const state = defaultState(5)
  const sh = startShift(state, ctx)
  const [a, b, c] = ['k1', 'k2', 'k3'].map(id => sh.customers[id])
  assert.equal(a.regularId, 'co_thu'); assert.equal(a.name, 'Cô Thu'); assert.equal(a.tutorial, true)
  assert.equal(b.regularId, 'ban_nam'); assert.equal(b.tutorial, true)
  assert.deepEqual(a.request, [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }])
  assert.deepEqual(b.request, [{ recipeId: 'tra_tac', qty: 1, notes: [] }])
  assert.equal(c.tutorial, false)
  assert.equal(Object.keys(sh.customers).length, 4)
  assert.ok(ctx.events.some(e => e.type === 'shift.started' && e.payload.day === 1))
  assert.ok(typeof a.speech === 'string' && a.speech.length > 3)
})

test('từ ngày 2: khoảng 15% ca có khách quen quay lại', () => {
  let withRegular = 0
  for (let seed = 1; seed <= 400; seed++) {
    const state = defaultState(seed)
    state.day = 2 + (seed % 5)
    const sh = startShift(state, makeCtx())
    const regs = Object.values(sh.customers).filter(c => c.regularId)
    assert.ok(regs.length <= 1)
    if (regs.length) { withRegular++; assert.equal(regs[0].tutorial, false) }
  }
  assert.ok(withRegular > 30 && withRegular < 95, String(withRegular))
})

test('sinh đơn theo ngày: 1 dòng ngày 1–2, tỉ lệ dòng/ghi chú từ ngày 3, tách dòng từ ngày 5', () => {
  const ctx = makeCtx()
  const mk = (day, seed) => {
    const state = defaultState(seed)
    state.day = day
    return makeRequest(state, { day, rng: seed * 7919 }, ctx)
  }
  for (let s = 1; s <= 300; s++) {
    const r = mk(1 + (s % 2), s)
    assert.equal(r.length, 1); assert.equal(r[0].qty, 1); assert.deepEqual(r[0].notes, [])
  }
  const count = { 1: 0, 2: 0, 3: 0 }
  let noted = 0, lines = 0, split = 0, surcharge = 0
  for (let s = 1; s <= 3000; s++) {
    const day = 3 + (s % 2)
    const r = mk(day, s)
    count[r.length] = (count[r.length] || 0) + 1
    for (const l of r) {
      lines++
      if (l.notes.length) noted++
      const groups = l.notes.map(id => { const n = RECIPES[l.recipeId].notes.find(x => x.id === id); return n.group || n.id })
      assert.equal(new Set(groups).size, groups.length, 'mỗi nhóm ghi chú tối đa 1')
      for (const id of l.notes) if (RECIPES[l.recipeId].notes.find(x => x.id === id).surcharge) surcharge++
    }
    if (new Set(r.map(l => l.recipeId)).size < r.length) split++
  }
  assert.ok(count[1] > 1900 && count[1] < 2300, JSON.stringify(count))
  // thực đơn mẫu chỉ 2 món: đơn 3 dòng gộp về 2 dòng khác món
  assert.ok(count[2] > 700 && count[2] < 1100, JSON.stringify(count))
  assert.equal(count[3] || 0, 0)
  // thực đơn 3 món: khoảng 5% đơn 3 dòng
  const data3 = { ...DATA, RECIPES: { ...RECIPES, tra_moi: { ...RECIPES.tra_tac, id: 'tra_moi', source: 'shop' } } }
  let three = 0
  for (let s = 1; s <= 3000; s++) {
    const st = defaultState(s)
    st.recipes.tra_moi = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 }
    if (makeRequest(st, { day: 4, rng: s }, makeCtx(data3)).length === 3) three++
  }
  assert.ok(three > 90 && three < 220, String(three))
  assert.ok(noted / lines > 0.14 && noted / lines < 0.26, String(noted / lines))
  assert.equal(split, 0)
  assert.equal(surcharge, 0)                               // phụ thu từ ngày 6
  let split5 = 0, noted5 = 0, lines5 = 0
  for (let s = 1; s <= 2000; s++) {
    const r = mk(6, s)
    if (new Set(r.map(l => l.recipeId)).size < r.length) split5++
    for (const l of r) { lines5++; if (l.notes.length) noted5++ }
  }
  assert.ok(split5 > 100, String(split5))
  assert.ok(noted5 / lines5 > 0.3, String(noted5 / lines5))
})

test('sinh đơn: chỉ món đã sở hữu, món mới mua được gọi ×2 trong 2 ca đầu', () => {
  const extra = { ...RECIPES.tra_tac, id: 'tra_moi', name: 'Trà mới', source: 'shop' }
  const ev = { ...RECIPES.tra_tac, id: 'mon_su_kien', name: 'Món sự kiện', source: 'event', eventId: 'x' }
  const data = { ...DATA, RECIPES: { ...RECIPES, tra_moi: extra, mon_su_kien: ev } }
  const ctx = makeCtx(data)
  const tally = (state, day) => {
    const c = {}
    for (let s = 1; s <= 3000; s++) for (const l of makeRequest(state, { day, rng: s }, ctx)) c[l.recipeId] = (c[l.recipeId] || 0) + 1
    return c
  }
  const state = defaultState(1)
  state.recipes.mon_su_kien = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 }
  let t = tally(state, 2)
  assert.equal(t.tra_moi, undefined)
  assert.equal(t.mon_su_kien, undefined)                    // món sự kiện chưa mở
  state.recipes.tra_moi = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 3 }
  t = tally(state, 3)
  assert.ok(t.tra_moi > t.tra_tac * 1.6, JSON.stringify(t))
  t = tally(state, 5)
  assert.ok(t.tra_moi < t.tra_tac * 1.3, JSON.stringify(t))
  const ctx2 = makeCtx({ ...data, isEventActive: id => id === 'x' })
  let n = 0
  for (let s = 1; s <= 500; s++) for (const l of makeRequest(state, { day: 2, rng: s }, ctx2)) if (l.recipeId === 'mon_su_kien') n++
  assert.ok(n > 0)
})

test('nhịp khách: hệ số tải ρ ≤ 0,9 mọi ngày, mọi seed', () => {
  for (let day = 1; day <= 14; day++) {
    for (let seed = 1; seed <= 60; seed++) {
      const state = defaultState(seed)
      state.day = day
      const sh = startShift(state, makeCtx())
      const rho = loadFactor(sh)
      assert.ok(rho <= 0.9 + 1e-9, `ngày ${day} seed ${seed}: ρ = ${rho}`)
      const times = sh.plan.map(p => p.arriveAt)
      for (let i = 1; i < times.length; i++) assert.ok(times[i] > times[i - 1])
      assert.ok(sh.plan.length >= 3 && sh.plan.length <= 8)
    }
  }
})

test('số khách theo ngày ±1 theo sao trung bình', () => {
  const ctx = makeCtx()
  const s = defaultState(1)
  assert.equal(customerCount(s, ctx, 1), 4)
  assert.equal(customerCount(s, ctx, 7), 7)
  assert.equal(customerCount(s, ctx, 20), 8)
  s.ratings = [5, 5, 5, 5, 5]
  assert.equal(customerCount(s, ctx, 3), 6)
  assert.equal(customerCount(s, ctx, 20), 8)
  s.ratings = [2, 3, 3, 2, 3]
  assert.equal(customerCount(s, ctx, 3), 4)
  assert.equal(customerCount(s, ctx, 2), 3)
})

test('kiên nhẫn: từ ngày 4 khách xếp hàng hết kiên nhẫn thì bỏ về; hàng đầy thì lỡ khách', () => {
  const ctx = makeCtx()
  const state = defaultState(11)
  state.day = 4
  const sh = startShift(state, ctx)
  // không phục vụ ai: khách đầu ở quầy không bỏ về, khách xếp sau bỏ về
  for (let i = 0; i < 4000 && !Object.values(sh.customers).every(c => c.status !== 'den'); i++) advance(state, 0.5, ctx)
  for (let i = 0; i < 400; i++) advance(state, 0.5, ctx)
  const head = sh.customers[sh.counter.customerId]
  assert.equal(head.status, 'order')
  assert.equal(head.patience, 0)
  assert.ok(sh.lost.length >= 1)
  assert.ok(ctx.events.some(e => e.type === 'customer.lost' && e.payload.reason === 'het_kien_nhan'))
  // ngày 1–3 không bỏ về
  const s2 = defaultState(11)
  s2.day = 3
  const sh2 = startShift(s2, ctx)
  for (let i = 0; i < 3000; i++) advance(s2, 0.5, ctx)
  assert.equal(sh2.lost.length, 0)
  assert.ok(sh2.missed >= 1)                                  // hàng đầy 3 người
  assert.equal(sh2.queue.length, 3)
})

test('tạm dừng và giờ trong game', () => {
  const ctx = makeCtx()
  const state = defaultState(2)
  const sh = startShift(state, ctx)
  assert.equal(gameTime(sh), '06:00')
  setPaused(state, true)
  advance(state, 10, ctx)
  assert.equal(sh.t, 0)
  setPaused(state, false)
  advance(state, 10, ctx)
  assert.equal(sh.t, 10)
  assert.equal(startShift(state, ctx), sh)                  // ca đang dở giữ nguyên
})

test('lưu giữa ca rồi tải lại: chơi tiếp cho kết quả y hệt', () => {
  const run = (interrupt) => {
    const ctx = makeCtx()
    let state = defaultState(21)
    state.day = 5
    startShift(state, ctx)
    let n = 0
    while (!isShiftOver(state)) {
      if (interrupt && n === 40) state = migrate(decodeSave(encodeSave(state)), DATA)
      while (counterStep(state, ctx)) { /* quầy */ }
      for (const t of state.shift.tickets.slice()) cookTicket(state, ctx, t)
      if (!isShiftOver(state)) advance(state, 0.5, ctx)
      n++
    }
    return endShift(state, ctx)
  }
  const a = run(false), b = run(true)
  assert.deepEqual(a, b)
})

test('endShift sớm: khách đã trả tiền được hoàn, bất biến ví vẫn đúng', () => {
  const ctx = makeCtx()
  const state = defaultState(8)
  state.day = 3
  const w0 = state.wallet
  startShift(state, ctx)
  for (let i = 0; i < 200; i++) { counterStep(state, ctx); advance(state, 0.5, ctx) }
  assert.ok(state.shift.tickets.length > 0)
  const summary = endShift(state, ctx)
  assert.ok(summary.refunds > 0)
  assert.equal(state.wallet - w0, summary.profit)
  assert.equal(state.shift, null)
})
