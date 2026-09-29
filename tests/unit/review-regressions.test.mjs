// Test hồi quy cho các lỗi logic do vòng soát lỗi M1 phát hiện (L1, L2, SPEC-01, SPEC-02, SPEC-04, TIP-01).
// Dùng DATA thật, ép các tỉ lệ ngẫu nhiên về 0/1 để kịch bản tất định.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { startShift, advance } from '../../src/core/shift.js'
import {
  addLine, readback, confirmOrder, reportTotal, trayAdd, giveChange, changeOptions, resolveNoChange,
  confirmQr, clipTicket, changeRemaining
} from '../../src/core/order.js'
import {
  startCook, submitChon, availableSteps, getStep, submitStep, finishDish, serveTicket, resolveComplaint
} from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { summarizeShift, tipForError } from '../../src/core/economy.js'
import { drawerTotal } from '../../src/core/money.js'

const BM = { recipeId: 'banh_mi_op_la', qty: 1, notes: [] }
const TT = { recipeId: 'tra_tac', qty: 1, notes: [] }

function makeData(balance = {}, personaPatch = {}) {
  const PERSONAS = {}
  for (const [k, p] of Object.entries(DATA.PERSONAS)) PERSONAS[k] = { ...p, ...personaPatch }
  return { ...DATA, BALANCE: { ...DATA.BALANCE, ...balance }, PERSONAS }
}

function makeCtx(data) {
  const events = []
  return { events, data, emit: (type, payload) => events.push({ type, payload }) }
}

// Ca với khách đầu (không phải hướng dẫn) đang ở quầy, yêu cầu `request`.
function counterEnv({ day = 4, request = [BM], balance = {}, persona = {} } = {}) {
  const ctx = makeCtx(makeData({ qrRate: 0, ...balance }, { qrRate: 0, ...persona }))
  const state = defaultState(11)
  state.day = day
  startShift(state, ctx)
  const sh = state.shift
  let guard = 0
  while (!sh.counter && guard++ < 20000) advance(state, 0.05, ctx)
  const c = sh.customers[sh.counter.customerId]
  Object.assign(c, { tutorial: false, strict: false, request: request.map(l => ({ ...l, notes: l.notes.slice() })) })
  return { ctx, state, sh, c, k: sh.counter }
}

function orderAndReport(env, draft = env.c.request, amount = null) {
  for (const l of draft) addLine(env.state, l)
  const rb = readback(env.state, env.ctx)
  if (rb.caught.length) throw new Error('khách bắt lỗi khi đọc lại (tỉ lệ bắt đang > 0)')
  assert.equal(confirmOrder(env.state, env.ctx).ok, true)
  const total = amount ?? draft.reduce((s, l) => s + DATA.RECIPES[l.recipeId].price * l.qty, 0)
  return reportTotal(env.state, total, env.ctx)
}

// Két không có tờ 5.000đ/10.000đ; khách đưa 1 tờ 50.000đ cho hóa đơn 20.000đ.
function shortChangeSetup(balance) {
  const env = counterEnv({ balance: { shortChangeDetectRate: 1, ...balance } })
  const r = orderAndReport(env)
  assert.equal(r.method, 'cash')
  env.k.given = { bills: { 50000: 1 }, total: 50000 }
  env.c.given = env.k.given
  env.k.changeDue = 30000
  env.sh.drawer[5000] = 0
  env.sh.drawer[10000] = 0
  env.drawer0 = drawerTotal(env.sh.drawer)
  // người chơi đưa 20.000đ (thiếu 10.000đ), khách phát hiện
  assert.equal(trayAdd(env.state, 20000), true)
  const g = giveChange(env.state, env.ctx)
  assert.equal(g.detected, true)
  assert.equal(changeRemaining(env.state), 10000)
  assert.equal(env.sh.ledger.cash, 20000)
  return env
}

// Két khớp sổ: tiền két − két ban đầu = tiền mặt đã ghi − thối dư − làm tròn.
function assertDrawerConsistent(sh, base = sh.floatAmount) {
  assert.equal(drawerTotal(sh.drawer) - base, sh.ledger.cash - sh.ledger.overchange - (sh.ledger.rounding || 0))
}

test('L1: thối thiếu rồi "Mời khách chuyển khoản" → hoàn tác tiền mặt, khách chỉ trả một lần', () => {
  const env = shortChangeSetup({})
  const { state, ctx, sh, k } = env
  const drawerStart = env.drawer0                // két trước khi lấy tờ 20.000đ ra khay
  assert.ok(changeOptions(state, ctx).includes('moi_qr'))
  const r = resolveNoChange(state, 'moi_qr', ctx)
  assert.equal(r.ok, true); assert.equal(r.undone, true)
  assert.equal(k.payMethod, 'qr')
  assert.equal(k.cashDeposited, false); assert.equal(k.changePaid, 0)
  assert.equal(sh.ledger.cash, 0)
  assert.equal(drawerTotal(sh.drawer), drawerStart, 'két trở về như trước khi khách trả tiền mặt')
  advance(state, 5, ctx)
  assert.equal(confirmQr(state, ctx).ok, true)
  const cl = clipTicket(state, ctx)
  assert.equal(cl.ok, true)
  assert.equal(cl.receipt.method, 'qr'); assert.equal(cl.receipt.given, null)
  assert.equal(sh.ledger.qr, 20000)
  assert.equal(sh.ledger.cash + sh.ledger.qr, cl.receipt.total, 'tổng thu đúng bằng hóa đơn')
  assertDrawerConsistent(sh, drawerStart)
})

test('L1: thối thiếu rồi "Xin khách tiền lẻ" thành công → trả lại tờ lớn, nhận tiền vừa đủ', () => {
  const env = shortChangeSetup({ changeAskRate: 1 })
  const { state, ctx, sh, k } = env
  const drawerStart = env.drawer0
  const r = resolveNoChange(state, 'xin_tien_le', ctx)
  assert.equal(r.success, true); assert.equal(r.undone, true)
  assert.equal(k.given.total, 20000)
  assert.equal(sh.ledger.cash, 0)
  assert.equal(drawerTotal(sh.drawer), drawerStart)
  assert.equal(changeRemaining(state), 0)
  const g = giveChange(state, ctx)
  assert.equal(g.correct, true); assert.equal(g.done, true)
  assert.equal(drawerTotal(sh.drawer), drawerStart + 20000)
  assert.equal(sh.ledger.cash, 20000)
  const cl = clipTicket(state, ctx)
  assert.equal(cl.receipt.given, 20000); assert.equal(cl.receipt.change, 0)
  assertDrawerConsistent(sh, drawerStart)
})

test('L1: xin tiền lẻ khi chưa thối lần nào vẫn như cũ (không hoàn tác gì)', () => {
  const env = counterEnv({ balance: { changeAskRate: 1 } })
  orderAndReport(env)
  env.k.given = { bills: { 50000: 1 }, total: 50000 }
  env.k.changeDue = 30000
  env.sh.drawer[5000] = 0; env.sh.drawer[10000] = 0; env.sh.drawer[20000] = 0
  const before = drawerTotal(env.sh.drawer)
  const r = resolveNoChange(env.state, 'xin_tien_le', env.ctx)
  assert.equal(r.success, true); assert.equal(r.undone, false)
  assert.equal(drawerTotal(env.sh.drawer), before)
  assert.equal(giveChange(env.state, env.ctx).correct, true)
  assert.equal(env.sh.ledger.cash, 20000)
  assertDrawerConsistent(env.sh, before)
})

// ---------- Bếp: hoàn tiền theo số khách đã trả ----------

function kitchenEnv({ request, draft = request, receipt, payMethod = 'cash', fakeQr = false, orderErrors = [] }) {
  const ctx = makeCtx(DATA)
  const state = defaultState(5)
  state.day = 3
  startShift(state, ctx)
  const sh = state.shift
  const c = Object.values(sh.customers)[0]
  Object.assign(c, {
    tutorial: false, strict: false, request, orderErrors, status: 'cho_mon', waitStart: 0, waitBudget: 1000,
    ticketId: 'p1', payMethod, fakeQr, receipt
  })
  sh.tickets.push({ id: 'p1', no: '#001', customerId: c.id, lines: draft.map(l => ({ ...l, notes: l.notes.slice() })), createdAt: 0, status: 'cho', done: draft.map(() => null) })
  sh.nextTicketNo = 2
  return { ctx, state, sh, c }
}

function cook(env, ticketId, i, score = 100, { skip = [] } = {}) {
  startCook(env.state, ticketId, i, env.ctx)
  const ck = env.sh.cook
  submitChon(env.state, requiredIngredients(DATA.RECIPES[ck.recipeId], ck.notes).required, 0, env.ctx)
  let av
  while ((av = availableSteps(env.state).filter(id => !skip.includes(id))).length) {
    const st = getStep(env.state, av[0])
    submitStep(env.state, av[0], { score, method: st.method ? st.method.correct : undefined }, env.ctx)
  }
  return finishDish(env.state, env.ctx)
}

function receiptOf(lines, total) {
  const rl = lines.map(l => ({ recipeId: l.recipeId, name: DATA.RECIPES[l.recipeId].name, qty: l.qty, notes: [], unitPrice: DATA.RECIPES[l.recipeId].price, amount: DATA.RECIPES[l.recipeId].price * l.qty }))
  const list = rl.reduce((s, l) => s + l.amount, 0)
  return { no: '#001', lines: rl, listTotal: list, total: total ?? list, given: null, change: 0, method: 'cash' }
}

test('L2: sai món → hoàn đúng số khách đã trả cho món ghi nhầm (không phải giá món khách gọi)', () => {
  const err = { type: 'sai_mon', index: 0, requestIndex: 0, recipeId: 'tra_tac', notes: [], expectedRecipeId: 'banh_mi_op_la', expectedNotes: [], qty: 1 }
  const env = kitchenEnv({ request: [BM], draft: [TT], receipt: receiptOf([TT]), orderErrors: [err] })
  cook(env, 'p1', 0)
  const sheet = serveTicket(env.state, 'p1', env.ctx)
  assert.equal(sheet.final, false)
  assert.equal(sheet.complaint.items[0].kind, 'sai_mon')
  assert.equal(sheet.complaint.items[0].refund, 10000)
  resolveComplaint(env.state, env.c.id, { apologyIndex: 0, action: 'refund' }, env.ctx)
  assert.equal(env.sh.ledger.refunds, 10000)
})

test('L2: khách trả bằng ảnh chuyển khoản giả → không hoàn tiền', () => {
  const env = kitchenEnv({ request: [BM], receipt: { ...receiptOf([BM]), method: 'qr' }, payMethod: 'qr', fakeQr: true })
  cook(env, 'p1', 0, 10)
  const sheet = serveTicket(env.state, 'p1', env.ctx)
  assert.equal(sheet.complaint.items[0].kind, 'hong')
  assert.equal(sheet.complaint.items[0].refund, 0)
  resolveComplaint(env.state, env.c.id, { apologyIndex: 0, action: 'refund' }, env.ctx)
  assert.equal(env.sh.ledger.refunds, 0)
})

test('L2: báo tổng thiếu → hoàn theo tỉ lệ thực thu, không vượt số khách đã trả', () => {
  const env = kitchenEnv({ request: [BM], receipt: receiptOf([BM], 15000) })
  cook(env, 'p1', 0, 10)
  const sheet = serveTicket(env.state, 'p1', env.ctx)
  assert.equal(sheet.complaint.items[0].refund, 15000)
})

// ---------- Phiếu chấm: lỗi quầy 0 sao, lỗi bếp sau khi làm lại ----------

test('SPEC-01: báo tổng thiếu, thối dư, QR giả vẫn ghi lỗi quầy (0 sao) trên phiếu chấm', () => {
  for (const [patch, code] of [[{ undercharge: 5000 }, 'bao_thieu'], [{ overchanged: true }, 'thoi_du'], [{ payMethod: 'qr', fakeQr: true }, 'qr_gia']]) {
    const env = kitchenEnv({ request: [BM], receipt: receiptOf([BM]) })
    Object.assign(env.c, patch)
    cook(env, 'p1', 0)
    const sheet = serveTicket(env.state, 'p1', env.ctx)
    assert.equal(sheet.final, true)
    assert.ok(sheet.counterErrors.includes(code), `${code} phải có trong counterErrors`)
    assert.equal(sheet.stars, 5, 'lỗi 0 sao không trừ sao')
  }
})

test('SPEC-01: báo tổng thiếu qua quầy thật → phiếu chấm và Tổng kết ghi "bao_thieu"', () => {
  const env = counterEnv({ day: 3 })
  orderAndReport(env, env.c.request, 15000)
  assert.equal(env.c.undercharge, 5000)
  env.k.given = { bills: { 20000: 1 }, total: 20000 }
  env.k.changeDue = 5000
  trayAdd(env.state, 5000)
  giveChange(env.state, env.ctx)
  const t = clipTicket(env.state, env.ctx).ticket
  const e2 = { ...env, state: env.state, sh: env.sh }
  cook(e2, t.id, 0)
  const sheet = serveTicket(env.state, t.id, env.ctx)
  assert.ok(sheet.counterErrors.includes('bao_thieu'))
  const sum = summarizeShift(env.state, DATA)
  assert.equal(sum.counterErrors.bao_thieu, 1)
})

test('SPEC-04: món Hỏng được làm lại → phiếu chấm cuối vẫn ghi lỗi bếp', () => {
  const env = kitchenEnv({ request: [BM], receipt: receiptOf([BM]) })
  cook(env, 'p1', 0, 10)
  serveTicket(env.state, 'p1', env.ctx)
  const r = resolveComplaint(env.state, env.c.id, { apologyIndex: 0, action: 'remake' }, env.ctx)
  cook(env, r.ticket.id, 0)
  const final = serveTicket(env.state, r.ticket.id, env.ctx)
  assert.equal(final.final, true)
  assert.ok(final.kitchenErrors.includes('hong'), JSON.stringify(final.kitchenErrors))
})

test('SPEC-04: phiếu thu ghi phần làm tròn', () => {
  const env = counterEnv({ day: 1 })
  orderAndReport(env)
  env.k.given = { bills: { 50000: 1 }, total: 50000 }
  env.k.changeDue = 25000
  env.sh.drawer = { 5000: 0, 10000: 0, 20000: 0, 50000: 0, 100000: 0, 200000: 0, 500000: 0 }
  env.sh.drawer[10000] = 3
  const r = resolveNoChange(env.state, 'lam_tron', env.ctx)
  assert.equal(r.success, true); assert.equal(r.extra, 5000)
  trayAdd(env.state, 10000); trayAdd(env.state, 10000); trayAdd(env.state, 10000)
  assert.equal(giveChange(env.state, env.ctx).correct, true)
  assert.equal(clipTicket(env.state, env.ctx).receipt.rounding, 5000)
})

// ---------- Lời khuyên và thẻ Mẹo nghề ----------

test('SPEC-02: lỗi quầy/bếp phổ biến đều có lời khuyên từ thẻ Mẹo nghề', () => {
  const codes = ['bao_du', 'bao_thieu', 'thoi_thieu', 'thoi_du', 'qr_gia', 'sai_mon', 'thieu_mon', 'thua_mon', 'sai_so_luong', 'sai_ghi_chu',
    'bay_nguyen_lieu', 'thieu_nguyen_lieu', 'thua_nguyen_lieu', 'song', 'chay', 'tran', 'chua_so_che', 'sai_cach', 'cho_goi_mon', 'cho_lau', 'hong']
  for (const code of codes) assert.ok(tipForError(code, DATA.TIPS), `không có thẻ cho ${code}`)
  const env = kitchenEnv({ request: [BM], receipt: receiptOf([BM]) })
  env.sh.scoreSheets.push({ final: true, stars: 4, counterErrors: ['bao_du'], kitchenErrors: [], dishes: [] })
  env.sh.scoreSheets.push({ final: true, stars: 4, counterErrors: ['bao_du'], kitchenErrors: [], dishes: [] })
  const sum = summarizeShift(env.state, DATA)
  assert.equal(sum.advice.code, 'bao_du')
  assert.ok(sum.advice.text.length > 0)
  assert.equal(sum.advice.tipId, 'bao_tong_ro_rang')
})

test('TIP-01: bỏ bước lắc của Trà tắc không mở thẻ "Rửa rồi mới thái"; bỏ bước rửa thì mở', () => {
  let env = kitchenEnv({ request: [TT], receipt: receiptOf([TT]) })
  env.state.tipsSeen = []
  cook(env, 'p1', 0, 100, { skip: ['lac'] })
  assert.ok(!env.state.tipsSeen.includes('rua_roi_moi_thai'))

  env = kitchenEnv({ request: [BM], receipt: receiptOf([BM]) })
  env.state.tipsSeen = []
  env.sh.day = 1                       // ngày 1: không giới hạn số thẻ mỗi ca
  cook(env, 'p1', 0, 100, { skip: ['rua_dua', 'thai_dua'] })
  assert.ok(env.state.tipsSeen.includes('rua_roi_moi_thai'))
})
