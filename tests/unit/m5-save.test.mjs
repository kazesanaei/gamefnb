// M5 (0.5.0): migrateCookBoard (src/core/save.js, thiết kế M5 mục 1.7). Save của bản 0.4.1 đang dở ca ở Thớt giữ bảng bước
// cũ (vd Lắc đều kiểu chà) → tải bản mới thì bảng được dựng lại theo công thức hiện tại: bước đổi loại hiện thao tác mới,
// kết quả bước đã làm, ví, sổ ca, phiếu, giá vốn, lượt làm lại giữ nguyên; chạy lại nhiều lần không đổi.
// Save 0.4.1 được dựng bằng lõi thật với dữ liệu công thức của bản 0.4.1 (15 bước về loại cũ, đúng như bản đó).
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { startShift } from '../../src/core/shift.js'
import {
  startCook, submitChon, submitStep, retryStep, beginStep, finishDish, effectiveSteps, availableSteps
} from '../../src/core/kitchen.js'
import { encodeSave, decodeSave, migrate, migrateCookBoard } from '../../src/core/save.js'
import { startTasting, tastingSandbox } from '../../src/core/shop.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'

const plain = v => JSON.parse(JSON.stringify(v))
const reload = (s, data = DATA) => migrate(decodeSave(encodeSave(s)), data)

// Loại và tham số của 15 bước ở bản 0.4.1 (trước M5).
const OLD = {
  banh_mi_op_la: { dap_trung: { type: 'cham', params: { mode: 'exact', n: 2, target: true } } },
  banh_mi_trung_ga_ta: { dap_trung: { type: 'cham', params: { mode: 'exact', n: 2, target: true } } },
  tra_tac: { lac: { type: 'cha', params: { strokes: 6 } } },
  tra_tac_mat_ong: { lac: { type: 'cha', params: { strokes: 6 } } },
  banh_trang_tron: { got_xoai: { type: 'cha', params: { spots: 5 } }, tron: { type: 'cha', params: { strokes: 8 } } },
  banh_trang_tron_tay_ninh: { got_xoai: { type: 'cha', params: { spots: 5 } }, tron: { type: 'cha', params: { strokes: 8 } } },
  ca_phe_sua_da: {
    them_da: { type: 'cham', params: { mode: 'exact', n: 2, target: false }, label: 'Thêm đá' },
    khuay: { type: 'cha', params: { strokes: 6 } }
  },
  ca_phe_muoi: {
    them_da: { type: 'cham', params: { mode: 'exact', n: 2, target: false }, label: 'Thêm đá' },
    khuay: { type: 'cha', params: { strokes: 6 } },
    danh_sua_muoi: { type: 'cha', params: { strokes: 8 } }
  },
  che_buoi: {
    got_vo: { type: 'cha', params: { spots: 5 } },
    ao_bot: { type: 'cham', params: { mode: 'min', N: 8, T: 3.5 }, label: 'Lăn bột năng' }
  }
}

function oldRecipes() {
  const R = plain(DATA.RECIPES)
  for (const [rid, m] of Object.entries(OLD)) {
    for (const [sid, o] of Object.entries(m)) {
      const st = R[rid].steps.find(s => s.id === sid)
      st.type = o.type
      st.params = { ...o.params }
      delete st.skin
      if (o.label) st.label = o.label
    }
  }
  return R
}
const OLD_DATA = Object.freeze({ ...DATA, RECIPES: oldRecipes() })

// Ca thật ngày 2 có một phiếu p1 (recipeId × qty, notes), nấu bằng dữ liệu bản 0.4.1 tới Thớt (chọn đúng nguyên liệu).
function v041AtBoard(recipeId = 'tra_tac', { qty = 1, notes = [], seed = 5 } = {}) {
  const ctx = makeMetaCtx({ data: OLD_DATA, at: '2026-10-01T09:00' })
  const state = defaultState(seed, DATA)
  state.day = 2
  startShift(state, ctx)
  const sh = state.shift
  const cid = sh.plan[0].customerId
  const lines = [{ recipeId, qty, notes }]
  Object.assign(sh.customers[cid], { request: lines, status: 'cho_mon', waitStart: 0, waitBudget: 100, ticketId: 'p1' })
  sh.tickets.push({ id: 'p1', no: '#001', customerId: cid, lines, createdAt: 0, status: 'cho', done: [null] })
  sh.nextTicketNo = 2
  startCook(state, 'p1', 0, ctx)
  const R = OLD_DATA.RECIPES[recipeId]
  const r = submitChon(state, requiredIngredients(R, notes).required, 0, ctx)
  assert.equal(r.ok, true)
  return { state, ctx, sh }
}

const newCtx = () => makeMetaCtx({ data: DATA, at: '2026-10-01T09:05' })
const boardStep = (s, id) => s.shift.cook.board.find(x => x.id === id)

test('1. ca dở ở Thớt (Lắc đều kiểu chà, Bổ đôi tắc đã xong): lắc thành `lac`, strokes giữ, kết quả bước, ví, sổ ca, phiếu giữ nguyên', () => {
  const { state, ctx } = v041AtBoard('tra_tac')
  assert.equal(submitStep(state, 'thai_tac', { score: 70 }, ctx).ok, true)
  assert.equal(boardStep(state, 'lac').type, 'cha', 'bảng cũ trong save')
  const raw = plain(state)
  const before = JSON.stringify(raw)
  const s = migrate(raw, DATA)
  assert.equal(JSON.stringify(raw), before, 'không sửa object đầu vào')
  const lac = boardStep(s, 'lac')
  assert.equal(lac.type, 'lac')
  assert.deepEqual(lac.params, { strokes: 6 })
  assert.equal(lac.skin, 'binh')
  assert.equal(lac.par, 2)
  assert.deepEqual(s.shift.cook.steps, raw.shift.cook.steps, 'kết quả bước đã làm')
  assert.deepEqual(s.shift.cook.steps.thai_tac, raw.shift.cook.steps.thai_tac)
  assert.equal(s.wallet, raw.wallet)
  assert.deepEqual(s.shift.ledger, raw.shift.ledger)
  assert.deepEqual(s.shift.tickets, raw.shift.tickets)
  assert.deepEqual(s.shift.cook.cost, raw.shift.cook.cost)
  assert.deepEqual(s.shift.cook.picked, raw.shift.cook.picked)
  assert.equal(s.shift.cook.retriesLeft, raw.shift.cook.retriesLeft)
  assert.equal(s.shift.cook.phase, 'thot')
  // các bước không đổi loại giữ nguyên từng trường
  for (const st of raw.shift.cook.board) if (st.id !== 'lac') assert.deepEqual(boardStep(s, st.id), st, st.id)
  // phần còn lại của ca (khách, két, giờ) giữ nguyên
  const strip = sh => ({ ...sh, cook: null })
  assert.deepEqual(strip(s.shift), strip(raw.shift))
})

test('2. số phần 2 và ghi chú vá: tham số và par nhân đúng như effectiveSteps', () => {
  const a = v041AtBoard('tra_tac', { qty: 2 })
  assert.deepEqual(boardStep(a.state, 'lac').params, { strokes: 12 })
  const s = migrate(plain(a.state), DATA)
  const lac = boardStep(s, 'lac')
  assert.equal(lac.type, 'lac')
  assert.deepEqual(lac.params, { strokes: 12 })
  assert.equal(lac.par, 2.8)
  const want = effectiveSteps(DATA.RECIPES.tra_tac, [], s.shift.cook.picked, 2).filter(x => x.type !== 'chon')
  assert.deepEqual(s.shift.cook.board, plain(want))
  // bánh mì ốp la, Thêm trứng, 2 phần: đập trứng n = 3 × 2
  const b = v041AtBoard('banh_mi_op_la', { qty: 2, notes: ['them_trung'] })
  assert.equal(boardStep(b.state, 'dap_trung').type, 'cham')
  const s2 = migrate(plain(b.state), DATA)
  const dap = boardStep(s2, 'dap_trung')
  assert.equal(dap.type, 'dap')
  assert.deepEqual(dap.params, { n: 6 })
  assert.equal(dap.par, 2.8)
  // cà phê muối 3 phần: khuấy turns 9, đánh sữa muối turns 18 (fast giữ), thả đá n 6
  const c = v041AtBoard('ca_phe_muoi', { qty: 3 })
  const s3 = migrate(plain(c.state), DATA)
  assert.deepEqual(boardStep(s3, 'khuay').params, { turns: 9 })
  assert.deepEqual(boardStep(s3, 'danh_sua_muoi').params, { turns: 18, fast: true })
  assert.deepEqual(boardStep(s3, 'them_da').params, { n: 6 })
  assert.equal(boardStep(s3, 'them_da').label, 'Thả đá vào ly')
})

test('3. retryPending và activeStepId trỏ vào bước vừa đổi loại vẫn được giữ; trỏ vào bước không còn thì về null', () => {
  const { state, ctx } = v041AtBoard('tra_tac')
  for (const id of ['thai_tac', 'vat_tac', 'rot_tra', 'nem_duong', 'lac']) assert.equal(submitStep(state, id, { score: 60 }, ctx).ok, true)
  const rr = retryStep(state, 'lac', ctx)
  assert.equal(rr.ok, true)
  assert.equal(state.shift.cook.retryPending, 'lac')
  assert.equal(state.shift.cook.activeStepId, 'lac')
  const raw = plain(state)
  const s = migrate(raw, DATA)
  assert.equal(s.shift.cook.retryPending, 'lac')
  assert.equal(s.shift.cook.activeStepId, 'lac')
  assert.equal(s.shift.cook.retriesLeft, 0)
  assert.equal(s.wallet, raw.wallet, 'phí làm lại không bị trừ/hoàn lần nữa')
  assert.equal(boardStep(s, 'lac').type, 'lac')
  // làm lại xong bằng thao tác mới: điểm tối đa 85
  const r = submitStep(s, 'lac', { score: 100 }, newCtx())
  assert.deepEqual([r.ok, r.score], [true, 85])
  // activeStepId (đang chơi dở bước, chưa làm lại)
  const b = v041AtBoard('che_buoi')
  for (const id of ['got_vo', 'thai_cui', 'bop_muoi']) assert.equal(submitStep(b.state, id, { score: 90 }, b.ctx).ok, true)
  assert.ok(beginStep(b.state, 'ao_bot'))
  const s2 = migrate(plain(b.state), DATA)
  assert.equal(s2.shift.cook.activeStepId, 'ao_bot')
  assert.equal(boardStep(s2, 'ao_bot').type, 'lac')
  assert.deepEqual(boardStep(s2, 'ao_bot').params, { strokes: 8, maxRatio: 1.2 })
  // bước không còn trên bảng (bản sau bỏ bước) → về null, không kẹt
  const sh = plain(b.state.shift)
  sh.cook.activeStepId = 'buoc_da_bo'
  sh.cook.retryPending = 'buoc_da_bo'
  const m = migrateCookBoard(sh, DATA)
  assert.equal(m.cook.activeStepId, null)
  assert.equal(m.cook.retryPending, null)
})

test('4. phiên ở bước Chọn (chưa có bảng) và đã Ra món (xong) không bị đụng', () => {
  const ctx = makeMetaCtx({ data: OLD_DATA })
  const state = defaultState(5, DATA)
  state.day = 2
  startShift(state, ctx)
  const sh = state.shift
  const cid = sh.plan[0].customerId
  const lines = [{ recipeId: 'tra_tac', qty: 1, notes: [] }]
  Object.assign(sh.customers[cid], { request: lines, status: 'cho_mon', waitStart: 0, waitBudget: 100, ticketId: 'p1' })
  sh.tickets.push({ id: 'p1', no: '#001', customerId: cid, lines, createdAt: 0, status: 'cho', done: [null] })
  startCook(state, 'p1', 0, ctx)
  const chon = plain(state.shift)
  assert.equal(chon.cook.phase, 'chon')
  assert.equal(migrateCookBoard(chon, DATA), chon, 'bước Chọn: trả chính ca')
  assert.deepEqual(migrate(plain(state), DATA).shift.cook, chon.cook)
  // đã Ra món bằng dữ liệu cũ: bảng cũ giữ nguyên (món đã chấm xong)
  const { state: s2, ctx: c2 } = v041AtBoard('tra_tac')
  finishDish(s2, c2)
  const xong = plain(s2.shift)
  assert.equal(xong.cook.phase, 'xong')
  assert.equal(migrateCookBoard(xong, DATA), xong)
  assert.equal(migrate(plain(s2), DATA).shift.cook.board.find(x => x.id === 'lac').type, 'cha')
})

test('5. phiên nấu thử (state.tasting.shift) được xử lý như ca thật', () => {
  const ctx = makeMetaCtx({ data: OLD_DATA })
  const state = defaultState(9, DATA)
  state.day = 3
  assert.equal(startTasting(state, 'banh_trang_tron', ctx).ok, true)
  const sb = tastingSandbox(state, ctx)
  startCook(sb.state, 'thu1', 0, sb.ctx)
  const R = OLD_DATA.RECIPES.banh_trang_tron
  assert.equal(submitChon(sb.state, requiredIngredients(R, []).required, 0, sb.ctx).ok, true)
  assert.equal(submitStep(sb.state, 'cat_banh_trang', { score: 95, method: 'cat_soi' }, sb.ctx).ok, true)
  const raw = plain(state)
  assert.equal(raw.tasting.shift.cook.board.find(x => x.id === 'tron').type, 'cha')
  const s = migrate(raw, DATA)
  const board = s.tasting.shift.cook.board
  assert.equal(board.find(x => x.id === 'tron').type, 'xoay')
  assert.deepEqual(board.find(x => x.id === 'tron').params, { turns: 5 })
  assert.equal(board.find(x => x.id === 'got_xoai').type, 'got')
  assert.deepEqual(board.find(x => x.id === 'got_xoai').params, { strips: 5 })
  assert.deepEqual(s.tasting.shift.cook.steps, raw.tasting.shift.cook.steps)
  assert.equal(s.tasting.recipeId, 'banh_trang_tron')
  assert.deepEqual(reload(s), plain(s))
})

test('6. chạy migrate hai lần cho cùng kết quả; lưu rồi tải lại không đổi; bảng đã mới thì trả chính ca', () => {
  const { state, ctx } = v041AtBoard('ca_phe_sua_da')
  submitStep(state, 'rot_nuoc', { score: 88 }, ctx)
  const s1 = migrate(plain(state), DATA)
  const s2 = migrate(plain(s1), DATA)
  assert.deepEqual(s2, plain(s1))
  assert.deepEqual(reload(s1), plain(s1))
  assert.deepEqual(reload(reload(s1)), plain(s1))
  assert.equal(migrateCookBoard(s1.shift, DATA), s1.shift, 'không có gì đổi → không sao chép')
  // ca mới của bản 0.5.0 (bảng dựng bằng dữ liệu mới) nạp lại y nguyên
  const ctxN = newCtx()
  const st = defaultState(7, DATA)
  st.day = 2
  startShift(st, ctxN)
  const sh = st.shift
  const cid = sh.plan[0].customerId
  const lines = [{ recipeId: 'banh_trang_tron_tay_ninh', qty: 2, notes: ['cay_nhieu'] }]
  Object.assign(sh.customers[cid], { request: lines, status: 'cho_mon', waitStart: 0, waitBudget: 100, ticketId: 'p1' })
  sh.tickets.push({ id: 'p1', no: '#001', customerId: cid, lines, createdAt: 0, status: 'cho', done: [null] })
  startCook(st, 'p1', 0, ctxN)
  submitChon(st, requiredIngredients(DATA.RECIPES.banh_trang_tron_tay_ninh, ['cay_nhieu']).required, 0, ctxN)
  assert.deepEqual(reload(st), plain(st))
})

test('7. thiếu dữ liệu công thức (hay phiên hỏng kiểu) thì giữ nguyên', () => {
  const { state } = v041AtBoard('tra_tac')
  const sh = plain(state.shift)
  assert.equal(migrateCookBoard(sh, null), sh)
  assert.equal(migrateCookBoard(sh, {}), sh)
  assert.equal(migrateCookBoard(sh, { RECIPES: {} }), sh)
  assert.equal(migrateCookBoard(sh, { RECIPES: { tra_tac: { id: 'tra_tac' } } }), sh, 'công thức không có bước')
  for (const bad of [null, 5, 'x', {}, { cook: null }, { cook: 3 }, { cook: { phase: 'thot', board: 'x' } }]) {
    assert.equal(migrateCookBoard(bad, DATA), bad)
  }
  const noPicked = { ...sh, cook: { ...sh.cook, picked: null } }
  assert.equal(migrateCookBoard(noPicked, DATA), noPicked)
  // migrate không có dữ liệu: bảng cũ giữ nguyên
  assert.equal(migrate(plain(state), null).shift.cook.board.find(x => x.id === 'lac').type, 'cha')
})

test('8. sau migrate: submitStep("lac", 100) rồi finishDish cho Q đúng như tính tay', () => {
  const { state, ctx } = v041AtBoard('tra_tac')
  // chon 100 (w1), thai_tac 70 (w1), vat_tac 100 (w1), rot_tra 85 (w2), nem_duong 100 (w3) — lắc chưa làm
  assert.equal(submitStep(state, 'thai_tac', { score: 70 }, ctx).ok, true)
  assert.equal(submitStep(state, 'vat_tac', { score: 100 }, ctx).ok, true)
  assert.equal(submitStep(state, 'rot_tra', { score: 85 }, ctx).ok, true)
  assert.equal(submitStep(state, 'nem_duong', { score: 100 }, ctx).ok, true)
  const s = reload(state)
  const c = newCtx()
  assert.deepEqual(availableSteps(s), ['lac'])
  const r = submitStep(s, 'lac', { score: 100, details: { strokes: 6, target: 6, cv: 0.1, elapsed: 2 } }, c)
  assert.deepEqual([r.ok, r.score, r.grade], [true, 100, 'Hoàn hảo'])
  assert.ok(c.events.some(e => e.type === 'step.done' && e.payload.type === 'lac'), 'step.done mang loại mới')
  const dish = finishDish(s, c)
  // Q = (100·1 + 70·1 + 100·1 + 85·2 + 100·3 + 100·1) / 9 = 840 / 9 = 93,3 → 93
  assert.equal(dish.q, Math.round((100 + 70 + 100 + 85 * 2 + 100 * 3 + 100) / 9))
  assert.equal(dish.q, 93)
  assert.equal(dish.grade, 'tuyet_hao')
  assert.equal(dish.steps.lac.score, 100)
  assert.equal(s.shift.tickets[0].done[0].q, 93)
})
