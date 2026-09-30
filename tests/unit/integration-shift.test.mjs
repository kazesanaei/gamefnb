// Test tích hợp: DATA thật (src/data) + toàn bộ lõi, không giao diện.
// Mô phỏng 3 ca liên tiếp (ngày 1–3) với "người chơi hoàn hảo" và "người chơi ẩu".
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { startShift, advance, isShiftOver, endShift, loadFactor } from '../../src/core/shift.js'
import {
  beginCounter, addLine, readback, confirmOrder, priceOfLines, reportTotal, trayAdd, giveChange,
  changeOptions, resolveNoChange, changeRemaining, confirmQr, rejectQr, clipTicket
} from '../../src/core/order.js'
import {
  startCook, submitChon, availableSteps, getStep, submitStep, finishDish, serveTicket, resolveComplaint
} from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { minBillsChange, addBills } from '../../src/core/money.js'
import { encodeSave, decodeSave, migrate } from '../../src/core/save.js'

function makeCtx() {
  const events = []
  return { events, data: DATA, emit: (type, payload) => events.push({ type, payload }) }
}

// ---------- Hai kiểu người chơi ----------

const PERFECT = { name: 'hoàn hảo', sloppy: false }
const SLOPPY = { name: 'ẩu', sloppy: true }

// Gom tờ tiền thối `amount` từ két (quy hoạch động theo số tờ có thật) rồi đưa. Trả kết quả giveChange hoặc null.
function payChange(state, ctx, amount) {
  const sh = state.shift
  const c = sh.counter
  const pool = addBills({ ...sh.drawer }, c.tray, 1)
  const best = minBillsChange(amount, pool)
  if (!best) return null
  for (const b of Object.keys(best.bills)) {
    for (let i = 0; i < best.bills[b]; i++) assert.ok(trayAdd(state, Number(b)), 'két hết tờ ' + b)
  }
  return giveChange(state, ctx)
}

// Một bước ở quầy. Trả true nếu có tiến triển.
function counterStep(state, ctx, player, log) {
  const sh = state.shift
  if (!sh.counter) beginCounter(state, ctx)
  const c = sh.counter
  if (!c) return false
  const cust = sh.customers[c.customerId]
  const R = DATA.RECIPES
  if (c.stage === 'order') {
    if (!c.draft.length) for (const l of cust.request) addLine(state, { recipeId: l.recipeId, qty: l.qty, notes: l.notes.slice() })
    const rb = readback(state, ctx)
    assert.equal(rb.caught.length, 0, 'phiếu ghi đúng mà khách bắt lỗi')
    assert.ok(confirmOrder(state, ctx).ok)
    return true
  }
  if (c.stage === 'thanh_toan') {
    const trueTotal = priceOfLines(cust.request, R)
    if (player.sloppy && !c.totalAttempts) {
      // báo cao hơn → khách phát hiện (−1 sao), phải báo lại
      const r1 = reportTotal(state, trueTotal + 5000, ctx)
      assert.equal(r1.result, 'du')
      assert.equal(r1.reason, 'cong_sai')
      log.wrongTotals++
      return true
    }
    const amount = player.sloppy ? trueTotal - 5000 : trueTotal
    const r = reportTotal(state, amount, ctx)
    assert.equal(r.result, player.sloppy ? 'thieu' : 'dung')
    return true
  }
  if (c.stage === 'tinh_tien') {
    if (c.payMethod === 'cash' && !c.changeDone) {
      // két không thối được: làm tròn → mời QR → xin tiền lẻ
      for (const o of ['lam_tron', 'moi_qr', 'xin_tien_le']) {
        const opts = changeOptions(state, ctx)
        if (!opts.length) break
        if (opts.includes(o)) resolveNoChange(state, o, ctx)
        if (c.payMethod !== 'cash') return true
      }
      assert.equal(changeOptions(state, ctx).length, 0, 'kẹt tiền lẻ')
      const due = changeRemaining(state)
      let g = null
      if (player.sloppy && due >= 5000 && c.changePaid === 0) {
        g = payChange(state, ctx, due - 5000)
        if (g) {
          assert.equal(g.correct, false)
          log.shortChanges++
          if (g.mustTopUp) g = payChange(state, ctx, changeRemaining(state))
        }
      }
      if (!g) g = payChange(state, ctx, due)
      assert.ok(g, 'không gom được tiền thối')
      if (!player.sloppy) assert.ok(g.correct && g.optimal, 'người chơi hoàn hảo phải thối đúng và gọn')
      assert.equal(c.changeDone, true)
    }
    if (c.payMethod === 'qr' && !c.paid) {
      if (c.fakeQr) { rejectQr(state, ctx); return true }
      if (!c.qrArrived) return false
      assert.ok(confirmQr(state, ctx).ok)
    }
    const k = clipTicket(state, ctx)
    if (!k.ok) {
      assert.equal(k.reason, 'bep_day')
      return false
    }
    assert.ok(k.receipt && k.receipt.no.startsWith('#'))
    return true
  }
  return false
}

// Nấu hết một phiếu và giao. Trả ScoreSheet cuối.
function cookTicket(state, ctx, ticket, player) {
  const R = DATA.RECIPES
  for (let i = 0; i < ticket.lines.length; i++) {
    if (ticket.done[i]) continue
    const cook = startCook(state, ticket.id, i, ctx)
    assert.ok(cook, 'không mở được phiên nấu')
    const req = requiredIngredients(R[cook.recipeId], cook.notes)
    let picked = req.required.slice()
    if (player.sloppy && req.side.length) picked = picked.filter(id => id !== req.side[0])
    const r = submitChon(state, picked, 0, ctx)
    assert.ok(r.ok, 'chọn nguyên liệu bị chặn')
    let av
    while ((av = availableSteps(state)).length) {
      const st = getStep(state, av[0])
      const res = submitStep(state, av[0], { score: 100, method: st.method ? st.method.correct : undefined }, ctx)
      assert.ok(res.ok)
    }
    const dish = finishDish(state, ctx)
    assert.ok(dish)
    if (!player.sloppy) assert.equal(dish.grade, 'tuyet_hao')
  }
  let sheet = serveTicket(state, ticket.id, ctx)
  assert.ok(sheet, 'không giao được phiếu')
  if (!sheet.final) {
    const aps = DATA.DIALOGUE.apologies
    const idx = Math.max(0, aps.findIndex(a => a.correct))
    sheet = resolveComplaint(state, sheet.customerId, { apologyIndex: idx, action: 'refund' }, ctx).sheet
  }
  return sheet
}

// Chơi trọn ca hiện tại (đã startShift). Trả {summary, sheets, log}.
function finishShift(state, ctx, player, { dt = 0.5, maxSteps = 40000, stopAfterTickets = null } = {}) {
  const sheets = []
  const log = { wrongTotals: 0, shortChanges: 0, clipped: 0 }
  let steps = 0
  while (!isShiftOver(state)) {
    assert.ok(++steps < maxSteps, 'ca không kết thúc')
    const sh = state.shift
    while (counterStep(state, ctx, player, log)) { /* xử lý quầy tới khi phải chờ */ }
    if (stopAfterTickets !== null && sh.nextTicketNo - 1 >= stopAfterTickets) return { paused: true, sheets, log }
    for (const t of sh.tickets.slice()) sheets.push(cookTicket(state, ctx, t, player))
    if (!isShiftOver(state)) advance(state, dt, ctx)
  }
  const summary = endShift(state, ctx)
  return { summary, sheets, log }
}

function playDays(seed, player, days = 3) {
  const ctx = makeCtx()
  const state = defaultState(seed, DATA)
  state.shopName = 'Xe thử nghiệm'
  const out = []
  for (let d = 1; d <= days; d++) {
    const walletBefore = state.wallet
    startShift(state, ctx)
    const r = finishShift(state, ctx, player)
    out.push({ ...r, walletBefore, walletAfter: state.wallet })
  }
  return { state, ctx, days: out }
}

// ---------- Test ----------

const SEEDS = [42, 7, 2024]

test('tích hợp: người chơi hoàn hảo chơi 3 ca (ngày 1–3) với dữ liệu thật', () => {
  for (const seed of SEEDS) {
    const { state, ctx, days } = playDays(seed, PERFECT)
    assert.equal(state.day, 4)
    assert.equal(state.shift, null)
    assert.equal(state.history.length, 3)
    days.forEach((d, i) => {
      const s = d.summary
      assert.ok(s, 'ca không kết thúc')
      assert.equal(s.day, i + 1)
      // bất biến: chênh lệch ví = lãi tổng kết (không nợ nên không trả nợ)
      assert.equal(d.walletAfter - d.walletBefore, s.profit - s.loanRepaid, `seed ${seed} ngày ${i + 1}`)
      assert.equal(s.loanRepaid, 0)
      assert.ok(s.served >= 3, 'phục vụ quá ít khách')
      assert.equal(s.lost, 0)
      assert.equal(s.served, d.sheets.length)
      // sao: người chơi hoàn hảo luôn 5 sao
      for (const sh of d.sheets) assert.equal(sh.stars, 5, `seed ${seed} ngày ${i + 1}: ${sh.name} ${sh.stars} sao`)
      for (const v of s.ratings) assert.equal(v, 5)
      assert.equal(s.avgStars, 5)
      assert.equal(s.undercharge, 0)
      assert.equal(s.overchange, 0)
      assert.equal(s.drawerDiff + s.rounding, 0)
      assert.ok(s.profit > 0, 'người chơi hoàn hảo phải có lãi')
      assert.deepEqual(s.counterErrors, {})
      assert.deepEqual(s.kitchenErrors, {})
    })
    // ngày 1: 2 khách hướng dẫn
    const types = new Set(ctx.events.map(e => e.type))
    for (const t of ['shift.started', 'order.readback', 'order.confirmed', 'total.reported', 'payment.received', 'change.given',
      'ticket.clipped', 'step.done', 'dish.done', 'dish.served', 'customer.rated', 'shift.ended']) {
      assert.ok(types.has(t), 'thiếu sự kiện ' + t)
    }
    assert.equal(state.stats.shiftsPlayed, 3)
    assert.ok(state.reputation > 0)
    assert.ok(state.recipes.banh_mi_op_la.cooks + state.recipes.tra_tac.cooks >= 9)
  }
})

test('tích hợp: người chơi ẩu (thiếu nguyên liệu phụ, thối thiếu, báo tổng sai) lãi kém hơn ít nhất 25%', () => {
  let perfectTotal = 0
  let sloppyTotal = 0
  for (const seed of SEEDS) {
    const P = playDays(seed, PERFECT)
    const S = playDays(seed, SLOPPY)
    let wrongTotals = 0, shortChanges = 0
    S.days.forEach((d, i) => {
      const s = d.summary
      assert.ok(s, 'ca của người chơi ẩu không kết thúc')
      assert.equal(d.walletAfter - d.walletBefore, s.profit - s.loanRepaid, `ẩu seed ${seed} ngày ${i + 1}`)
      assert.ok(s.undercharge > 0, 'báo tổng thiếu phải ghi vào undercharge')
      wrongTotals += d.log.wrongTotals
      shortChanges += d.log.shortChanges
      // khách không hướng dẫn bị trừ sao
      for (const sh of d.sheets) if (!sh.tutorial) assert.ok(sh.stars < 5, `khách ${sh.name} vẫn 5 sao`)
      assert.ok((s.counterErrors.bao_du || 0) > 0 || d.sheets.every(x => x.tutorial))
      assert.ok((s.kitchenErrors.thieu_nguyen_lieu || 0) > 0)
    })
    assert.ok(wrongTotals > 0)
    assert.ok(shortChanges > 0)
    const p = P.days.reduce((a, d) => a + d.summary.profit, 0)
    const q = S.days.reduce((a, d) => a + d.summary.profit, 0)
    assert.ok(p > q, `seed ${seed}: hoàn hảo ${p} ≤ ẩu ${q}`)
    perfectTotal += p
    sloppyTotal += q
  }
  // "lãi hơn ít nhất 25%": P ≥ Q + 25% |Q|
  // META_SIM_LOG=1 npm test: in chênh lệch (chỉ số 21, docs/can-bang.md mục 15)
  if (process.env.META_SIM_LOG) {
    console.log(`chỉ số 21: hoàn hảo ${perfectTotal}, ẩu ${sloppyTotal}, hơn ${((perfectTotal - sloppyTotal) / Math.abs(sloppyTotal) * 100).toFixed(0)}%`)
  }
  assert.ok(perfectTotal >= sloppyTotal + 0.25 * Math.abs(sloppyTotal),
    `hoàn hảo ${perfectTotal} chưa hơn ẩu ${sloppyTotal} ít nhất 25%`)
})

test('tích hợp: hệ số tải ρ ≤ 0,9 với dữ liệu thật (ngày 1–14)', () => {
  let worst = 0
  for (let seed = 1; seed <= 40; seed++) {
    for (let day = 1; day <= 14; day++) {
      const state = defaultState(seed, DATA)
      state.day = day
      const sh = startShift(state, makeCtx())
      const rho = loadFactor(sh)
      worst = Math.max(worst, rho)
      assert.ok(rho <= 0.9 + 1e-9, `seed ${seed} ngày ${day}: ρ = ${rho}`)
      // mỗi khách có đơn hợp lệ theo thực đơn thật
      for (const c of Object.values(sh.customers)) {
        assert.ok(c.request.length >= 1)
        for (const l of c.request) assert.ok(DATA.RECIPES[l.recipeId], 'món lạ ' + l.recipeId)
        assert.ok(c.speech.length > 5)
      }
    }
  }
  assert.ok(worst > 0.3, 'ρ quá thấp, lịch khách thưa bất thường: ' + worst)
})

test('tích hợp: lưu giữa ca (encode/decode) rồi chơi tiếp ra đúng kết quả như chơi liền mạch', () => {
  for (const seed of SEEDS) {
    // chơi liền mạch ngày 1–2
    const A = playDays(seed, PERFECT, 2)
    // chơi ngày 1 trọn, ngày 2 dừng sau khi kẹp 2 phiếu, lưu/khôi phục rồi chơi tiếp
    const ctx = makeCtx()
    let state = defaultState(seed, DATA)
    state.shopName = 'Xe thử nghiệm'
    startShift(state, ctx)
    finishShift(state, ctx, PERFECT)
    const walletBefore = state.wallet
    startShift(state, ctx)
    const mid = finishShift(state, ctx, PERFECT, { stopAfterTickets: 2 })
    assert.equal(mid.paused, true)
    assert.ok(state.shift.tickets.length >= 1, 'phải còn phiếu trên dây khi lưu')
    const code = encodeSave(state)
    const raw = decodeSave(code)
    assert.ok(raw, 'giải mã save thất bại')
    const restored = migrate(raw, DATA)
    assert.ok(restored && restored.shift, 'mất ca đang dở khi khôi phục')
    assert.deepEqual(restored.shift, state.shift)
    assert.equal(restored.shopName, 'Xe thử nghiệm')
    // sửa 1 ký tự → checksum sai
    const tampered = code.slice(0, 20) + (code[20] === 'A' ? 'B' : 'A') + code.slice(21)
    assert.equal(decodeSave(tampered), null)

    state = restored
    const rest = finishShift(state, ctx, PERFECT)
    const s = rest.summary
    assert.ok(s, 'không chơi tiếp được sau khi khôi phục')
    assert.equal(state.wallet - walletBefore, s.profit)
    const ref = A.days[1].summary
    assert.equal(s.profit, ref.profit)
    assert.equal(s.served, ref.served)
    assert.deepEqual(s.ratings, ref.ratings)
    assert.equal(state.wallet, A.state.wallet)
    assert.equal(s.drawerActual, ref.drawerActual)
    assert.deepEqual(state.history, A.state.history)
  }
})
