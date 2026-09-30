import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA, RECIPES, makeCtx } from '../fixtures/data.mjs'
import { defaultState } from '../../src/core/state.js'
import { startShift } from '../../src/core/shift.js'
import {
  effectiveSteps, linePar, startCook, submitChon, availableSteps, getStep, boardSteps, submitStep, autoStep,
  retryStep, finishDish, abandonDish, serveTicket, resolveComplaint
} from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'

const BM = RECIPES.banh_mi_op_la
const FULL = ['banh_mi', 'trung_ga', 'dua_leo', 'hanh_la', 'nuoc_tuong']

function kitchenEnv(lines, { day = 1, orderErrors = [], persona = 'hoc_sinh' } = {}) {
  const ctx = makeCtx()
  const state = defaultState(3)
  state.day = day
  startShift(state, ctx)
  const sh = state.shift
  const c = sh.customers.k1
  Object.assign(c, { tutorial: false, strict: false, persona, request: lines, orderErrors, status: 'cho_mon', waitStart: 0, waitBudget: 100, ticketId: 'p1' })
  sh.tickets.push({ id: 'p1', no: '#001', customerId: 'k1', lines, createdAt: 0, status: 'cho', done: lines.map(() => null) })
  sh.nextTicketNo = 2
  return { ctx, state, sh, c }
}

function playAll(env, score = 100) {
  let av
  while ((av = availableSteps(env.state)).length) {
    const st = getStep(env.state, av[0])
    assert.equal(submitStep(env.state, av[0], { score, method: st.method ? st.method.correct : undefined }, env.ctx).ok, true)
  }
}

function cookLine(env, i, { score = 100, picked } = {}) {
  const t = env.sh.tickets.find(x => x.done.some(d => !d))
  startCook(env.state, t.id, i, env.ctx)
  const cook = env.sh.cook
  submitChon(env.state, picked || requiredIngredients(RECIPES[cook.recipeId], cook.notes).required, 0, env.ctx)
  playAll(env, score)
  return finishDish(env.state, env.ctx)
}

test('effectiveSteps: removes, patch, adds, qty, picked, after', () => {
  const ids = s => s.map(x => x.id)
  assert.deepEqual(ids(effectiveSteps(BM, [])), ['chon', 'rua_dua', 'thai_dua', 'thai_hanh', 'dap_trung', 'chien_trung', 'nem'])
  assert.deepEqual(ids(effectiveSteps(BM, ['khong_hanh'])), ['chon', 'rua_dua', 'thai_dua', 'dap_trung', 'chien_trung', 'nem'])
  const nem = effectiveSteps(BM, []).find(s => s.id === 'nem')
  assert.deepEqual(nem.params.targets, { nuoc_tuong: 1 })
  const nemCay = effectiveSteps(BM, ['cay']).find(s => s.id === 'nem')
  assert.deepEqual(nemCay.params.targets, { nuoc_tuong: 1, tuong_ot: 2 })
  assert.deepEqual(effectiveSteps(BM, ['long_dao']).find(s => s.id === 'chien_trung').params.zone, [0.45, 0.60])
  assert.equal(effectiveSteps(BM, ['them_trung']).find(s => s.id === 'dap_trung').params.n, 3)
  const q2 = effectiveSteps(BM, [], null, 2)
  assert.equal(q2.find(s => s.id === 'dap_trung').params.n, 4)
  assert.equal(q2.find(s => s.id === 'thai_dua').params.cuts, 6)
  assert.deepEqual(q2.find(s => s.id === 'nem').params.targets, { nuoc_tuong: 2 })
  assert.equal(q2.find(s => s.id === 'dap_trung').par, 2.8)
  assert.deepEqual(q2.find(s => s.id === 'chien_trung').params.zone, [0.55, 0.72])
  // thiếu dưa leo: bỏ bước rửa/thái dưa (chỉ phạt 1 dòng ở Q)
  const noDua = effectiveSteps(BM, [], ['banh_mi', 'trung_ga', 'hanh_la', 'nuoc_tuong'])
  assert.deepEqual(ids(noDua), ['chon', 'thai_hanh', 'dap_trung', 'chien_trung', 'nem'])
  // cay nhưng không lấy tương ớt: bỏ chai tương ớt khỏi targets
  const nemNoOt = effectiveSteps(BM, ['cay'], FULL).find(s => s.id === 'nem')
  assert.deepEqual(nemNoOt.params.targets, { nuoc_tuong: 1 })
  // dữ liệu gốc không bị sửa
  assert.equal(BM.steps.find(s => s.id === 'dap_trung').params.n, 2)
  assert.equal(linePar(BM, { recipeId: 'banh_mi_op_la', qty: 1, notes: [] }), 25)
  assert.equal(Math.round(linePar(BM, { recipeId: 'banh_mi_op_la', qty: 2, notes: [] }) * 10) / 10, 35)
})

test('chọn nguyên liệu: thiếu chính bị chặn, trừ giá vốn vào ví', () => {
  const env = kitchenEnv([{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }])
  assert.equal(startCook(env.state, 'nope', 0, env.ctx), null)
  const cook = startCook(env.state, 'p1', 0, env.ctx)
  assert.equal(cook.phase, 'chon')
  assert.equal(env.sh.tickets[0].status, 'dang_lam')
  const w0 = env.state.wallet
  const r1 = submitChon(env.state, ['banh_mi', 'dua_leo'], 0, env.ctx)
  assert.equal(r1.ok, false); assert.equal(r1.blockedMissingMain, true)
  assert.equal(env.state.wallet, w0)
  const r2 = submitChon(env.state, [...FULL, 'nuoc_mam'], 1, env.ctx)
  assert.equal(r2.ok, true); assert.equal(r2.score, 85)
  assert.equal(env.sh.ledger.cogs, 3000 + 2 * 2500 + 500 + 250 + 250)
  // M3: mỗi lượt nấu trừ theo bội 500đ (nước mắm bẫy 250đ → 500đ) để Tiền quán không lẻ
  assert.equal(env.sh.ledger.waste, 500)
  assert.equal(env.state.wallet, w0 - 9500)
  assert.deepEqual(availableSteps(env.state).sort(), ['dap_trung', 'rua_dua', 'thai_hanh'])
  assert.ok(env.ctx.events.some(e => e.type === 'step.done' && e.payload.type === 'chon'))
  const board = boardSteps(env.state, env.ctx)
  assert.equal(board.length, 6)
  assert.equal(board.find(b => b.id === 'thai_dua').available, false)
})

test('submitStep: ràng buộc after, chọn sai cách −15; tự làm cần thạo cấp 2', () => {
  const env = kitchenEnv([{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }])
  startCook(env.state, 'p1', 0, env.ctx)
  submitChon(env.state, FULL, 0, env.ctx)
  assert.equal(submitStep(env.state, 'thai_dua', { score: 100 }, env.ctx).reason, 'chua_mo')
  submitStep(env.state, 'rua_dua', { score: 100 }, env.ctx)
  const r = submitStep(env.state, 'thai_dua', { score: 100, method: 'bao' }, env.ctx)
  assert.equal(r.score, 85); assert.equal(r.methodWrong, true)
  assert.equal(autoStep(env.state, 'thai_hanh', env.ctx).reason, 'chua_thao')
  env.state.recipes.banh_mi_op_la.goodCooks = 5
  assert.equal(autoStep(env.state, 'dap_trung', env.ctx).reason, 'khong_tu_lam')     // w = 2
  const a = autoStep(env.state, 'thai_hanh', env.ctx)
  assert.equal(a.ok, true); assert.equal(a.score, 80)
  assert.ok(env.ctx.events.some(e => e.type === 'step.done' && e.payload.auto === true))
})

test('làm lại bước: trừ retryCost vào hao hụt, tối đa 85, 1 lượt/món', () => {
  const env = kitchenEnv([{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }])
  startCook(env.state, 'p1', 0, env.ctx)
  submitChon(env.state, FULL, 0, env.ctx)
  submitStep(env.state, 'dap_trung', { score: 100 }, env.ctx)
  const s = submitStep(env.state, 'chien_trung', { score: 0, details: { value: 1.1 } }, env.ctx)
  assert.equal(s.tag, 'chay')
  const w0 = env.state.wallet
  const r = retryStep(env.state, 'chien_trung', env.ctx)
  assert.equal(r.ok, true); assert.equal(r.cost, 6000)
  assert.equal(env.state.wallet, w0 - 6000)
  assert.equal(env.sh.ledger.waste, 6000)
  assert.equal(submitStep(env.state, 'chien_trung', { score: 100 }, env.ctx).score, 85)
  assert.equal(retryStep(env.state, 'chien_trung', env.ctx).ok, false)
  assert.equal(retryStep(env.state, 'dap_trung', env.ctx).reason, 'het_luot')
})

test('finishDish: bước chưa làm = 0 điểm, ghi ticket.done, thạo món', () => {
  const env = kitchenEnv([{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }])
  startCook(env.state, 'p1', 0, env.ctx)
  submitChon(env.state, FULL, 0, env.ctx)
  for (const id of ['rua_dua', 'thai_dua', 'dap_trung', 'chien_trung', 'nem']) {
    const st = getStep(env.state, id)
    submitStep(env.state, id, { score: 100, method: st.method && st.method.correct }, env.ctx)
  }
  const d = finishDish(env.state, env.ctx)
  // thai_hanh (w1) = 0: (9 × 100) / 10
  assert.equal(d.q, 90); assert.equal(d.grade, 'tuyet_hao'); assert.equal(d.flawless, false)
  assert.ok(d.errors.includes('chua_so_che'))
  assert.equal(env.sh.tickets[0].done[0], d)
  assert.equal(env.sh.tickets[0].status, 'xong')
  assert.equal(env.sh.cook.phase, 'xong')
  assert.equal(env.state.recipes.banh_mi_op_la.cooks, 1)
  assert.equal(env.state.recipes.banh_mi_op_la.goodCooks, 1)
  assert.equal(env.state.recipes.banh_mi_op_la.best, 90)
  const ev = env.ctx.events.find(e => e.type === 'dish.done').payload
  assert.deepEqual(Object.keys(ev).sort(), ['errors', 'flawless', 'grade', 'q', 'recipeId'])
})

test('abandonDish: giá vốn chuyển sang hao hụt, phiếu quay lại dây', () => {
  const env = kitchenEnv([{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }])
  startCook(env.state, 'p1', 0, env.ctx)
  submitChon(env.state, FULL, 0, env.ctx)
  const w = env.state.wallet
  assert.equal(abandonDish(env.state, env.ctx).waste, 9000)
  assert.equal(env.sh.ledger.cogs, 0); assert.equal(env.sh.ledger.waste, 9000)
  assert.equal(env.state.wallet, w)
  assert.equal(env.sh.cook, null)
  assert.equal(env.sh.tickets[0].status, 'cho')
})

test('serveTicket hoàn hảo: 5 sao, tip, danh tiếng, khách rời đi', () => {
  const env = kitchenEnv([{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }, { recipeId: 'tra_tac', qty: 1, notes: ['it_duong'] }])
  cookLine(env, 0); cookLine(env, 1)
  const sheet = serveTicket(env.state, 'p1', env.ctx)
  assert.equal(sheet.final, true)
  assert.equal(sheet.stars, 5)
  assert.equal(sheet.tip, 10000)                // có món Không tì vết
  assert.equal(sheet.reputation, 4)
  assert.equal(env.c.status, 'roi_di')
  assert.deepEqual(env.sh.served, ['k1'])
  assert.equal(env.sh.tickets.length, 0)
  assert.equal(env.sh.tipJar, 10000)
  assert.ok(env.ctx.events.some(e => e.type === 'dish.served'))
  assert.deepEqual(env.ctx.events.find(e => e.type === 'customer.rated').payload, { customerId: 'k1', stars: 5, counterErrors: [], kitchenErrors: [] })
})

test('phạt chờ: vượt 75% / 100% / 150% ngân sách, chỉ mức cao nhất', () => {
  for (const [t, stars] of [[70, 5], [80, 4], [120, 4], [160, 3]]) {
    const env = kitchenEnv([{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }])
    cookLine(env, 0)
    env.sh.t = t
    const sheet = serveTicket(env.state, 'p1', env.ctx)
    assert.equal(sheet.stars, stars, `t=${t}`)
    assert.ok(sheet.penalties.filter(p => p.code === 'cho_lau').length <= 1)
  }
})

test('món Hỏng → phàn nàn → xin lỗi đúng + hoàn tiền', () => {
  const env = kitchenEnv([{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }])
  cookLine(env, 0, { score: 20 })
  const sheet = serveTicket(env.state, 'p1', env.ctx)
  assert.equal(sheet.final, false)
  assert.equal(sheet.complaint.items[0].kind, 'hong')
  assert.equal(sheet.complaint.apologies.length, 3)
  assert.equal(env.c.status, 'nhan_mon')
  const r = resolveComplaint(env.state, 'k1', { apologyIndex: 0, action: 'refund' }, env.ctx)
  assert.equal(r.ok, true); assert.equal(r.apologyCorrect, true)
  assert.equal(env.sh.ledger.refunds, 20000)
  assert.equal(r.sheet.stars, 2)                // Hỏng: base 1, xin lỗi +1
  assert.equal(env.c.status, 'roi_di')
  assert.equal(resolveComplaint(env.state, 'k1', { apologyIndex: 0, action: 'refund' }, env.ctx).ok, false)
})

test('sai món → −2 sao, làm lại đúng món (sao tối đa 3)', () => {
  const errs = [{ type: 'sai_mon', index: 0, requestIndex: 0, recipeId: 'banh_mi_op_la', notes: [], expectedRecipeId: 'tra_tac', expectedNotes: [], qty: 1 }]
  const env = kitchenEnv([{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }], { orderErrors: errs })
  env.c.request = [{ recipeId: 'tra_tac', qty: 1, notes: [] }]
  cookLine(env, 0)
  const sheet = serveTicket(env.state, 'p1', env.ctx)
  assert.equal(sheet.final, false)
  assert.equal(sheet.complaint.items[0].kind, 'sai_mon')
  assert.deepEqual(sheet.complaint.items[0].line, { recipeId: 'tra_tac', qty: 1, notes: [] })
  const r = resolveComplaint(env.state, 'k1', { apologyIndex: 1, action: 'remake' }, env.ctx)
  assert.equal(r.ok, true); assert.equal(r.apologyCorrect, false)
  assert.equal(env.sh.tickets[0].remake, true)
  assert.equal(env.sh.tickets[0].lines[0].recipeId, 'tra_tac')
  assert.equal(env.c.status, 'cho_mon')
  cookLine(env, 0)
  const final = serveTicket(env.state, env.sh.tickets[0].id, env.ctx)
  assert.equal(final.final, true)
  assert.equal(final.stars, 3)                  // 5 − 2 = 3, trần làm lại 3
  assert.equal(env.c.dishes.length, 1)
  assert.equal(env.c.dishes[0].recipeId, 'tra_tac')
})
