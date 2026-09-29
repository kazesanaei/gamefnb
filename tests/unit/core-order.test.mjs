import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA, BALANCE, PERSONAS, makeCtx } from '../fixtures/data.mjs'
import { defaultState } from '../../src/core/state.js'
import { startShift, advance } from '../../src/core/shift.js'
import {
  compareLines, addLine, updateLine, removeLine, readback, confirmOrder, priceOfLines, reportTotal,
  trayAdd, trayRemove, giveChange, changeOptions, resolveNoChange, confirmQr, rejectQr, clipTicket, changeRemaining
} from '../../src/core/order.js'
import { drawerTotal } from '../../src/core/money.js'

const BM = (qty = 1, notes = []) => ({ recipeId: 'banh_mi_op_la', qty, notes })
const TT = (qty = 1, notes = []) => ({ recipeId: 'tra_tac', qty, notes })

function withData({ balance = {}, personas = {} } = {}) {
  return { ...DATA, BALANCE: { ...BALANCE, ...balance }, PERSONAS: { ...PERSONAS, ...personas } }
}

// Ca với khách k1 (không phải hướng dẫn) đang ở quầy.
function setup({ day = 1, request = [BM()], persona = 'hoc_sinh', data = DATA, seed = 7 } = {}) {
  const ctx = makeCtx(data)
  const state = defaultState(seed)
  state.day = day
  startShift(state, ctx)
  const sh = state.shift
  const c = sh.customers.k1
  c.tutorial = false
  c.request = request
  c.persona = persona
  c.strict = false
  advance(state, sh.plan[0].arriveAt + 0.01, ctx)
  assert.equal(sh.counter.customerId, 'k1')
  return { state, ctx, sh, c }
}

function orderCorrect(env) {
  for (const l of env.c.request) addLine(env.state, l)
  const rb = readback(env.state, env.ctx)
  assert.equal(rb.caught.length, 0)
  assert.equal(confirmOrder(env.state, env.ctx).ok, true)
}

function forceCash(env, bills) {
  const k = env.sh.counter
  const total = Object.keys(bills).reduce((s, b) => s + Number(b) * bills[b], 0)
  k.given = { bills, total }
  env.c.given = k.given
  k.changeDue = total - k.amountDue
}

test('compareLines: đúng, sai món, thiếu/thừa món, sai số lượng, sai ghi chú', () => {
  assert.deepEqual(compareLines([BM(2), TT()], [TT(), BM(2)]).errors, [])
  // ghi chú không phân biệt thứ tự
  assert.deepEqual(compareLines([BM(1, ['cay', 'khong_hanh'])], [BM(1, ['khong_hanh', 'cay'])]).errors, [])
  const t = (r, d) => compareLines(r, d).errors.map(e => e.type)
  assert.deepEqual(t([BM()], [TT()]), ['sai_mon'])
  assert.deepEqual(t([BM(), TT()], [BM()]), ['thieu_mon'])
  assert.deepEqual(t([BM()], [BM(), TT()]), ['thua_mon'])
  assert.deepEqual(t([BM(2)], [BM(1)]), ['sai_so_luong'])
  assert.equal(compareLines([BM(2)], [BM(1)]).errors[0].short, true)
  assert.equal(compareLines([BM(1)], [BM(3)]).errors[0].short, false)
  assert.deepEqual(t([BM(1, ['khong_hanh'])], [BM(1)]), ['sai_ghi_chu'])
  // "2 ổ, 1 ổ không hành" ghi thành 2 ổ thường → 1 lỗi ghi chú
  const e = compareLines([BM(1), BM(1, ['khong_hanh'])], [BM(2)]).errors
  assert.deepEqual(e.map(x => x.type), ['sai_ghi_chu'])
  assert.equal(e[0].index, 0)
  assert.deepEqual(e[0].expectedNotes, ['khong_hanh'])
  // sai món giữ chỉ số dòng phiếu để tô đỏ
  const e2 = compareLines([BM(), TT()], [BM(), BM(1, ['cay'])]).errors
  assert.deepEqual(e2.map(x => [x.type, x.index, x.expectedRecipeId]), [['sai_mon', 1, 'tra_tac']])
  assert.deepEqual(t([BM(2)], [BM(1), TT()]), ['sai_mon'])
  assert.deepEqual(t([BM(2), TT()], [BM(1)]), ['sai_so_luong', 'thieu_mon'])
  const e3 = compareLines([TT(2)], [BM(2)]).errors
  assert.deepEqual(e3.map(x => [x.type, x.qty, x.expectedRecipeId]), [['sai_mon', 2, 'tra_tac']])
})

test('sửa phiếu làm mất trạng thái đã đọc lại', () => {
  const env = setup()
  addLine(env.state, BM())
  readback(env.state, env.ctx)
  assert.equal(env.sh.counter.readbackDone, true)
  updateLine(env.state, 0, { qty: 2 })
  assert.equal(env.sh.counter.readbackDone, false)
  assert.equal(env.sh.counter.draft[0].qty, 2)
  addLine(env.state, TT())
  assert.equal(removeLine(env.state, 1), true)
  assert.equal(env.sh.counter.draft.length, 1)
})

test('readback bắt buộc; lỗi bị bắt: −8% kiên nhẫn, phải sửa rồi đọc lại', () => {
  const env = setup({ request: [BM(1, ['khong_hanh']), TT()], data: withData({ balance: { readbackCatchRate: 1 } }) })
  assert.equal(confirmOrder(env.state, env.ctx).reason, 'phieu_rong')
  addLine(env.state, BM())
  addLine(env.state, TT(2))
  assert.equal(confirmOrder(env.state, env.ctx).reason, 'chua_doc_lai')
  const p0 = env.c.patience
  const rb = readback(env.state, env.ctx)
  assert.equal(rb.caught.length, 2)
  assert.deepEqual(rb.caught.map(e => e.index).sort(), [0, 1])
  assert.ok(Math.abs(env.c.patience - (p0 - 0.16)) < 1e-9)
  assert.equal(confirmOrder(env.state, env.ctx).ok, false)
  const ev = env.ctx.events.find(e => e.type === 'order.readback')
  assert.deepEqual(ev.payload, { errorsFound: 2, errorsMissed: 0 })
  updateLine(env.state, 0, { notes: ['khong_hanh'] })
  updateLine(env.state, 1, { qty: 1 })
  assert.equal(readback(env.state, env.ctx).caught.length, 0)
  assert.equal(confirmOrder(env.state, env.ctx).ok, true)
  assert.deepEqual(env.c.orderErrors, [])
  assert.equal(env.c.status, 'thanh_toan')
  assert.ok(env.ctx.events.some(e => e.type === 'order.confirmed' && e.payload.customerId === 'k1'))
})

test('readback: lỗi lọt qua được ghi lại để phạt khi phục vụ', () => {
  const env = setup({ request: [BM(1, ['khong_hanh'])], data: withData({ balance: { readbackCatchRate: 0 } }) })
  addLine(env.state, BM())
  const rb = readback(env.state, env.ctx)
  assert.equal(rb.missed.length, 1)
  assert.equal(confirmOrder(env.state, env.ctx).ok, true)
  assert.deepEqual(env.c.orderErrors.map(e => e.type), ['sai_ghi_chu'])
})

test('priceOfLines có phụ thu ghi chú × qty', () => {
  assert.equal(priceOfLines([BM(2), TT(1)], DATA.RECIPES), 50000)
  assert.equal(priceOfLines([BM(2, ['them_trung'])], DATA.RECIPES), 50000)
})

test('reportTotal: dư (phạt 1 lần, báo lại), thiếu (thu thiếu), đúng', () => {
  const env = setup({ request: [BM(), TT()] })
  orderCorrect(env)
  let r = reportTotal(env.state, 35000, env.ctx)
  assert.equal(r.result, 'du'); assert.equal(r.trueTotal, 30000); assert.equal(r.reason, 'cong_sai')
  assert.deepEqual(env.c.penalties, [{ code: 'bao_du', stars: 1, source: 'quay' }])
  r = reportTotal(env.state, 40000, env.ctx)
  assert.equal(r.result, 'du')
  assert.equal(env.c.penalties.length, 1)
  assert.equal(env.sh.counter.stage, 'thanh_toan')
  r = reportTotal(env.state, 25000, env.ctx)
  assert.equal(r.result, 'thieu')
  assert.equal(env.sh.ledger.undercharge, 5000)
  assert.equal(env.sh.counter.amountDue, 25000)
  assert.equal(env.sh.counter.stage, 'tinh_tien')
  assert.equal(r.method, 'cash')                  // ngày 1: chỉ tiền mặt
  assert.ok(env.sh.counter.given.total >= 25000)
  const evs = env.ctx.events.filter(e => e.type === 'total.reported').map(e => e.payload)
  assert.deepEqual(evs, [{ correct: false, diff: 5000 }, { correct: false, diff: 10000 }, { correct: false, diff: -5000 }])
  assert.ok(env.ctx.events.some(e => e.type === 'payment.received' && e.payload.method === 'cash'))
})

test('reportTotal: phiếu ghi thừa → quay lại sửa phiếu, không trừ sao', () => {
  const env = setup({ request: [BM()], data: withData({ balance: { readbackCatchRate: 0 } }) })
  addLine(env.state, BM()); addLine(env.state, TT())
  readback(env.state, env.ctx)
  confirmOrder(env.state, env.ctx)
  const r = reportTotal(env.state, 30000, env.ctx)
  assert.equal(r.result, 'du'); assert.equal(r.reason, 'phieu_thua')
  assert.equal(env.c.penalties.length, 0)
  assert.equal(env.sh.counter.stage, 'order')
  removeLine(env.state, 1)
  readback(env.state, env.ctx)
  assert.equal(confirmOrder(env.state, env.ctx).ok, true)
  assert.equal(reportTotal(env.state, 20000, env.ctx).result, 'dung')
})

test('giveChange: đúng + gọn; tiền khách vào két, khay rời két', () => {
  const env = setup({ request: [BM(), TT()] })
  orderCorrect(env)
  reportTotal(env.state, 30000, env.ctx)
  forceCash(env, { 50000: 1 })
  assert.equal(changeRemaining(env.state), 20000)
  assert.equal(trayAdd(env.state, 10000), true)
  assert.equal(trayAdd(env.state, 10000), true)
  assert.equal(trayAdd(env.state, 5000), true)
  assert.equal(trayRemove(env.state, 5000), true)
  assert.equal(trayAdd(env.state, 200000), false)          // két không có
  let r = giveChange(env.state, env.ctx)
  assert.equal(r.correct, true); assert.equal(r.optimal, false); assert.equal(r.diff, 0); assert.equal(r.optimalCount, 1)
  assert.equal(drawerTotal(env.sh.drawer), 200000 + 30000)
  assert.equal(env.sh.ledger.cash, 30000)
  assert.deepEqual(env.ctx.events.filter(e => e.type === 'change.given').map(e => e.payload), [{ correct: true, optimal: false, diff: 0 }])
  assert.equal(giveChange(env.state, env.ctx).ok, false)   // đã xong
  const clip = clipTicket(env.state, env.ctx)
  assert.equal(clip.ok, true)
  assert.equal(clip.receipt.total, 30000); assert.equal(clip.receipt.given, 50000); assert.equal(clip.receipt.change, 20000)
  assert.equal(clip.receipt.method, 'cash'); assert.equal(clip.receipt.no, '#001')
  assert.deepEqual(clip.receipt.lines.map(l => [l.name, l.qty, l.amount]), [['Bánh mì ốp la', 1, 20000], ['Trà tắc', 1, 10000]])
  assert.equal(env.c.status, 'cho_mon')
  assert.equal(env.sh.counter, null)
  assert.equal(env.sh.tickets[0].no, '#001')
  assert.ok(env.c.waitBudget > 30)
  assert.equal(env.sh.ledger.sales, 30000)
})

test('giveChange: không cần thối vẫn phải xác nhận', () => {
  const env = setup({ request: [BM()] })
  orderCorrect(env)
  reportTotal(env.state, 20000, env.ctx)
  forceCash(env, { 20000: 1 })
  assert.equal(clipTicket(env.state, env.ctx).reason, 'chua_thanh_toan')
  const r = giveChange(env.state, env.ctx)
  assert.equal(r.correct, true); assert.equal(r.optimal, true)
  assert.equal(clipTicket(env.state, env.ctx).ok, true)
})

test('giveChange thiếu: khách phát hiện → −1 sao, phải thối bù', () => {
  const env = setup({ request: [BM()], data: withData({ balance: { shortChangeDetectRate: 1 } }) })
  orderCorrect(env)
  reportTotal(env.state, 20000, env.ctx)
  forceCash(env, { 50000: 1 })
  trayAdd(env.state, 20000)
  let r = giveChange(env.state, env.ctx)
  assert.equal(r.correct, false); assert.equal(r.diff, -10000); assert.equal(r.detected, true); assert.equal(r.remaining, 10000)
  assert.deepEqual(env.c.penalties, [{ code: 'thoi_thieu', stars: 1, source: 'quay' }])
  assert.equal(clipTicket(env.state, env.ctx).reason, 'chua_thanh_toan')
  trayAdd(env.state, 10000)
  r = giveChange(env.state, env.ctx)
  assert.equal(r.correct, true)
  assert.equal(drawerTotal(env.sh.drawer), 220000)
  assert.equal(env.c.penalties.length, 1)
  assert.equal(env.state.shift.counts.changeWrong, 1)
})

test('giveChange thiếu không bị phát hiện → reviewLate', () => {
  const env = setup({ request: [BM()], data: withData({ balance: { shortChangeDetectRate: 0 } }) })
  orderCorrect(env)
  reportTotal(env.state, 20000, env.ctx)
  forceCash(env, { 50000: 1 })
  trayAdd(env.state, 20000)
  const r = giveChange(env.state, env.ctx)
  assert.equal(r.detected, false); assert.equal(r.done, true)
  assert.deepEqual(env.c.reviewLate, { code: 'thoi_thieu', amount: 10000, stars: 2 })
  assert.equal(env.c.penalties.length, 0)
  assert.equal(drawerTotal(env.sh.drawer), 230000)
})

test('giveChange dư: mất tiền; khách thật thà trả lại (+1 danh tiếng)', () => {
  for (const rate of [0, 1]) {
    const env = setup({ request: [BM()], data: withData({ balance: { overChangeReturnRate: rate } }) })
    orderCorrect(env)
    reportTotal(env.state, 20000, env.ctx)
    forceCash(env, { 50000: 1 })
    trayAdd(env.state, 20000); trayAdd(env.state, 20000)
    const r = giveChange(env.state, env.ctx)
    assert.equal(r.diff, 10000); assert.equal(r.correct, false)
    if (rate === 0) {
      assert.equal(env.sh.ledger.overchange, 10000)
      assert.equal(drawerTotal(env.sh.drawer), 210000)
      assert.equal(env.sh.reputationGain, 0)
    } else {
      assert.equal(r.returned, true)
      assert.equal(env.sh.ledger.overchange, 0)
      assert.equal(drawerTotal(env.sh.drawer), 220000)
      assert.equal(env.sh.reputationGain, 1)
    }
  }
})

test('két không thối được: xin tiền lẻ / làm tròn / mời QR', () => {
  const mk = (day, balance = {}) => {
    const env = setup({ day, request: [BM(), BM(1, ['them_trung'])], data: withData({ balance: { qrRate: 0, ...balance }, personas: { hoc_sinh: { ...PERSONAS.hoc_sinh, qrRate: 0 } } }) })
    orderCorrect(env)
    reportTotal(env.state, 45000, env.ctx)
    forceCash(env, { 50000: 1 })
    env.sh.drawer = { 5000: 0, 10000: 1, 20000: 0, 50000: 1, 100000: 0, 200000: 0, 500000: 0 }
    return env
  }
  let env = mk(1)
  assert.deepEqual(changeOptions(env.state, env.ctx), ['xin_tien_le', 'lam_tron'])
  let r = resolveNoChange(env.state, 'lam_tron', env.ctx)
  assert.equal(r.success, true); assert.equal(r.newDue, 10000); assert.equal(r.extra, 5000)
  trayAdd(env.state, 10000)
  assert.equal(giveChange(env.state, env.ctx).correct, true)
  assert.equal(env.sh.ledger.rounding, 5000)
  assert.deepEqual(changeOptions(env.state, env.ctx), [])

  env = mk(1, { changeAskRate: 1 })
  const p0 = env.c.patience
  r = resolveNoChange(env.state, 'xin_tien_le', env.ctx)
  assert.equal(r.success, true)
  assert.ok(Math.abs(env.c.patience - (p0 - 0.05)) < 1e-9)
  assert.equal(env.sh.counter.given.total, 45000)
  assert.equal(changeRemaining(env.state), 0)
  assert.equal(giveChange(env.state, env.ctx).correct, true)

  env = mk(1, { changeAskRate: 0 })
  r = resolveNoChange(env.state, 'xin_tien_le', env.ctx)
  assert.equal(r.success, false)
  assert.deepEqual(changeOptions(env.state, env.ctx), ['lam_tron'])

  env = mk(4)
  assert.deepEqual(changeOptions(env.state, env.ctx), ['xin_tien_le', 'moi_qr', 'lam_tron'])
  r = resolveNoChange(env.state, 'moi_qr', env.ctx)
  assert.equal(r.success, true)
  assert.equal(env.sh.counter.payMethod, 'qr')
  assert.equal(confirmQr(env.state, env.ctx).reason, 'chua_ve')
  advance(env.state, 5, env.ctx)
  assert.equal(env.sh.counter.qrArrived, true)
  assert.equal(confirmQr(env.state, env.ctx).ok, true)
  assert.equal(env.sh.qrBalance, 45000)
  assert.equal(clipTicket(env.state, env.ctx).ok, true)
})

test('QR thật: chỉ xác nhận khi tiền đã về', () => {
  const data = withData({ personas: { hoc_sinh: { ...PERSONAS.hoc_sinh, qrRate: 1 } }, balance: { fakeQrRate: 0 } })
  const env = setup({ day: 4, request: [BM()], data })
  orderCorrect(env)
  const r = reportTotal(env.state, 20000, env.ctx)
  assert.equal(r.method, 'qr')
  const k = env.sh.counter
  assert.ok(k.qrArriveAt >= env.sh.t + 1 && k.qrArriveAt <= env.sh.t + 4)
  assert.equal(confirmQr(env.state, env.ctx).ok, false)
  advance(env.state, 4.01, env.ctx)
  assert.equal(k.qrArrived, true)
  assert.deepEqual(confirmQr(env.state, env.ctx), { ok: true, fake: false, blocked: false })
  assert.equal(env.sh.ledger.qr, 20000)
  assert.ok(env.ctx.events.some(e => e.type === 'qr.confirmed' && e.payload.fake === false))
  assert.ok(env.ctx.events.some(e => e.type === 'payment.received' && e.payload.method === 'qr' && e.payload.amount === 20000))
  assert.equal(clipTicket(env.state, env.ctx).receipt.method, 'qr')
})

test('QR giả: xác nhận → mất trọn hóa đơn; từ chối → khách bỏ đi; loa báo tiền chặn', () => {
  const data = withData({ personas: { hoc_sinh: { ...PERSONAS.hoc_sinh, qrRate: 1 } }, balance: { fakeQrRate: 1 } })
  let env = setup({ day: 7, request: [BM()], data })
  orderCorrect(env)
  assert.equal(reportTotal(env.state, 20000, env.ctx).fake, true)
  assert.equal(env.sh.counter.qrArriveAt, null)
  advance(env.state, 10, env.ctx)
  assert.equal(env.sh.counter.qrArrived, false)
  assert.deepEqual(confirmQr(env.state, env.ctx), { ok: true, fake: true, blocked: false })
  assert.equal(env.sh.ledger.fakeQrLoss, 20000)
  assert.equal(env.sh.qrBalance, 0)
  assert.equal(clipTicket(env.state, env.ctx).ok, true)     // khách vẫn được phục vụ

  env = setup({ day: 7, request: [BM()], data })
  orderCorrect(env)
  reportTotal(env.state, 20000, env.ctx)
  assert.deepEqual(rejectQr(env.state, env.ctx), { ok: true, fake: true })
  assert.equal(env.c.status, 'bo_ve'); assert.equal(env.c.fakeQrCaught, true)
  assert.equal(env.sh.counts.fakeQrCaught, 1)
  assert.ok(env.sh.lost.includes('k1'))
  assert.equal(env.sh.counter, null)

  env = setup({ day: 7, request: [BM()], data })
  env.state.upgrades.loa_bao_tien = true
  orderCorrect(env)
  reportTotal(env.state, 20000, env.ctx)
  const r = confirmQr(env.state, env.ctx)
  assert.equal(r.blocked, true)
  assert.equal(env.sh.ledger.fakeQrLoss, 0)
  assert.ok(env.ctx.events.some(e => e.type === 'qr.confirmed' && e.payload.blocked === true))
  assert.equal(env.c.status, 'bo_ve')
})

test('clipTicket: dây phiếu đầy → bep_day', () => {
  const env = setup({ request: [BM()] })
  orderCorrect(env)
  reportTotal(env.state, 20000, env.ctx)
  forceCash(env, { 20000: 1 })
  giveChange(env.state, env.ctx)
  for (let i = 0; i < 3; i++) env.sh.tickets.push({ id: 'x' + i, lines: [], done: [], status: 'cho' })
  assert.deepEqual(clipTicket(env.state, env.ctx), { ok: false, reason: 'bep_day' })
  env.sh.tickets.pop()
  assert.equal(clipTicket(env.state, env.ctx).ok, true)
})
