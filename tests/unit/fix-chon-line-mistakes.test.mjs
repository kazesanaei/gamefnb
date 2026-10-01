// Hồi quy (mục 25): số lần chọn nhầm ở bước Chọn nguyên liệu lưu theo dòng phiếu (ticket.chonMistakes[lineIndex]).
// Trước đây "Bỏ món" giữa bước Chọn xóa rổ dở kèm lần nhầm → mở lại đúng dòng đó là 0 lần nhầm, 100 điểm (né được phạt).
// Nay: bỏ món ghi lần nhầm (cả phạt quá giờ) vào phiếu, chỉ tăng; mở lại dòng đó bắt đầu từ số lần nhầm cũ (rổ trống);
// chốt bước Chọn thành công thì dòng đó về 0; phiếu làm lại (remake) không mang lần nhầm cũ; khách đổi món ở dòng đó thì
// lần nhầm của món cũ không mang sang; nấu thử tách biệt ca thật; migrate làm sạch dữ liệu hỏng, save cũ nạp được, dữ
// liệu hợp lệ lưu rồi tải lại không đổi.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { startShift, advance } from '../../src/core/shift.js'
import {
  startCook, submitChon, abandonDish, chonDraft, saveChonDraft, availableSteps, getStep, submitStep, finishDish,
  serveTicket, resolveComplaint, normalizeLineMistakes, lineChonMistakes, clearLineMistakes, CHON_DRAFT_MISTAKES_MAX
} from '../../src/core/kitchen.js'
import { encodeSave, decodeSave, migrate, migrateLineMistakes } from '../../src/core/save.js'
import { startTasting, tastingSandbox } from '../../src/core/shop.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { openIncident, resolveIncident, incidentLossCap } from '../../src/core/incidents.js'
import { counterStep, cookTicket } from '../helpers/perfect-player.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'
import { SAVE_V2_MID_SHIFT } from '../fixtures/save-v2.mjs'

const BM = DATA.RECIPES.banh_mi_op_la
const REQ = requiredIngredients(BM, []).required
const DECOY = BM.decoys.find(id => BM.shelf.includes(id))
const TT = DATA.RECIPES.tra_tac
const REQ_TT = requiredIngredients(TT, []).required
const plain = v => JSON.parse(JSON.stringify(v))
// "tải lại trang": mã hóa → giải mã → migrate như lúc mở game
const reload = s => migrate(decodeSave(encodeSave(s)), DATA)

// Ca thật (dữ liệu thật): phiếu p1 = `lines` (mặc định 1 dòng Bánh mì ốp la), p2 = Trà tắc. tasting: mở nấu thử
// Bánh tráng trộn TRƯỚC khi mở ca (save có cả state.tasting lẫn ca thật).
function env({ seed = 5, lines = [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }], tasting = false } = {}) {
  const ctx = makeMetaCtx({ at: '2026-10-01T09:00' })
  const state = defaultState(seed, DATA)
  state.day = tasting ? 3 : 2
  if (tasting) assert.equal(startTasting(state, 'banh_trang_tron', ctx).ok, true)
  startShift(state, ctx)
  const sh = state.shift
  const ids = sh.plan.map(p => p.customerId)
  const mk = (id, cid, ls) => {
    Object.assign(sh.customers[cid], { request: ls, status: 'cho_mon', waitStart: 0, waitBudget: 100, ticketId: id, tutorial: false })
    sh.tickets.push({ id, no: '#00' + id.slice(1), customerId: cid, lines: ls, createdAt: 0, status: 'cho', done: ls.map(() => null) })
  }
  mk('p1', ids[0], lines)
  mk('p2', ids[1], [{ recipeId: 'tra_tac', qty: 1, notes: [] }])
  sh.nextTicketNo = 3
  return { ctx, state, sh, t1: sh.tickets[0] }
}

// Chọn nhầm `mistakes` lần (giao diện lưu rổ dở mỗi lần chạm) rồi bỏ món giữa bước Chọn.
function pickWrongThenAbandon(state, ctx, ticketId, lineIndex, mistakes, { overtime = false, picked = [DECOY] } = {}) {
  assert.ok(startCook(state, ticketId, lineIndex, ctx))
  const d = { picked, mistakes }
  if (overtime) d.overtime = true
  assert.equal(saveChonDraft(state, d, ctx).ok, true)
  assert.equal(abandonDish(state, ctx).ok, true)
  assert.equal(state.shift.cook, null)
}

function playAll(state, ctx, score = 100) {
  let av
  while ((av = availableSteps(state)).length) {
    const st = getStep(state, av[0])
    submitStep(state, av[0], { score, method: st.method ? st.method.correct : undefined }, ctx)
  }
}

test('bỏ món giữa bước Chọn: lần nhầm ghi vào phiếu theo dòng; mở lại đúng dòng: rổ trống, mang lần nhầm cũ → 85 điểm', () => {
  const { ctx, state, sh, t1 } = env()
  pickWrongThenAbandon(state, ctx, 'p1', 0, 1)
  assert.deepEqual(t1.chonMistakes, [1], 'ghi theo dòng phiếu')
  assert.deepEqual(plain(t1), t1, 'JSON thuần')
  assert.equal(t1.status, 'cho', 'phiếu quay lại dây như cũ')
  assert.equal(lineChonMistakes(t1, 0), 1)
  // mở lại đúng dòng đó: phiên nấu mới, rổ trống, lần nhầm cũ còn nguyên (giao diện nhận initial.mistakes = 1)
  const c = startCook(state, 'p1', 0, ctx)
  assert.equal(c.chonMistakes, 1)
  assert.deepEqual(c.picked, [])
  assert.deepEqual(chonDraft(state, ctx), { picked: [], mistakes: 1 })
  // giao diện cũ / gửi 0 lần nhầm vẫn bị tính
  const r = submitChon(state, REQ, 0, ctx)
  assert.equal(r.ok, true)
  assert.equal(r.score, 85, 'trước khi sửa: 100 điểm')
  assert.equal(sh.cook.chonMistakes, 1)
  assert.equal(sh.cook.chonScore, 85)
  // chốt bước Chọn thành công: lần nhầm đã vào điểm, phiếu không giữ nữa
  assert.equal('chonMistakes' in t1, false)
  // bị chặn vì thiếu nguyên liệu chính: không mất lần nhầm mang sang
  const e2 = env({ seed: 6 })
  pickWrongThenAbandon(e2.state, e2.ctx, 'p1', 0, 2)
  startCook(e2.state, 'p1', 0, e2.ctx)
  assert.equal(submitChon(e2.state, [REQ[0]], 0, e2.ctx).blockedMissingMain, true)
  assert.deepEqual(e2.t1.chonMistakes, [2], 'chưa chốt: phiếu vẫn giữ')
  assert.equal(submitChon(e2.state, REQ, 0, e2.ctx).score, 70)
})

test('theo dòng: phiếu 2 dòng giữ riêng từng dòng; dòng khác bắt đầu 0 lần nhầm', () => {
  const lines = [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }, { recipeId: 'tra_tac', qty: 1, notes: [] }]
  const { ctx, state, sh, t1 } = env({ lines })
  pickWrongThenAbandon(state, ctx, 'p1', 0, 2)
  assert.deepEqual(t1.chonMistakes, [2, 0], 'mảng dài đúng số dòng phiếu')
  // dòng 1 không bị ảnh hưởng
  const c1 = startCook(state, 'p1', 1, ctx)
  assert.equal(c1.chonMistakes, 0)
  assert.equal(chonDraft(state, ctx), null)
  assert.equal(submitChon(state, REQ_TT, 0, ctx).score, 100)
  assert.deepEqual(t1.chonMistakes, [2, 0], 'chốt dòng 1 không xóa lần nhầm của dòng 0')
  playAll(state, ctx)
  assert.ok(finishDish(state, ctx))
  // dòng 0: mang 2 lần nhầm
  const c0 = startCook(state, 'p1', 0, ctx)
  assert.equal(c0.chonMistakes, 2)
  assert.equal(submitChon(state, REQ, 0, ctx).score, 70)
  assert.equal('chonMistakes' in t1, false, 'mọi dòng về 0: bỏ trường')
  assert.equal(sh.cook.lineIndex, 0)
  // phiếu khác (p2) không bị ảnh hưởng
  assert.equal('chonMistakes' in sh.tickets.find(t => t.id === 'p2'), false)
})

test('chỉ tăng: bỏ món lần nữa không làm giảm; chọn nhầm thêm thì tăng; trần 99', () => {
  const { ctx, state, sh, t1 } = env()
  pickWrongThenAbandon(state, ctx, 'p1', 0, 2)
  // mở lại, giao diện gửi lần nhầm nhỏ hơn (0) rồi bỏ món: vẫn 2
  startCook(state, 'p1', 0, ctx)
  saveChonDraft(state, { picked: [REQ[0]], mistakes: 0 }, ctx)
  abandonDish(state, ctx)
  assert.deepEqual(t1.chonMistakes, [2])
  // phiên nấu bị sửa tay (rổ dở mất, lần nhầm 0) cũng không làm giảm lần nhầm đã ghi trên phiếu
  startCook(state, 'p1', 0, ctx)
  delete sh.cook.chonDraft
  sh.cook.chonMistakes = 0
  abandonDish(state, ctx)
  assert.deepEqual(t1.chonMistakes, [2])
  // mở lại không chọn gì rồi bỏ ngay: vẫn 2 (không cộng dồn khi không mắc thêm)
  startCook(state, 'p1', 0, ctx)
  abandonDish(state, ctx)
  assert.deepEqual(t1.chonMistakes, [2])
  // chọn nhầm thêm 1 lần (giao diện gửi 2 + 1)
  pickWrongThenAbandon(state, ctx, 'p1', 0, 3)
  assert.deepEqual(t1.chonMistakes, [3])
  // trần CHON_DRAFT_MISTAKES_MAX (kể cả khi cộng phạt quá giờ)
  pickWrongThenAbandon(state, ctx, 'p1', 0, 1e6, { overtime: true })
  assert.deepEqual(t1.chonMistakes, [CHON_DRAFT_MISTAKES_MAX])
  startCook(state, 'p1', 0, ctx)
  assert.equal(submitChon(state, REQ, 0, ctx).score, 0)
})

test('phạt quá giờ (overtime) của rổ dở tính vào lần nhầm của dòng khi bỏ món', () => {
  const { ctx, state, t1 } = env()
  pickWrongThenAbandon(state, ctx, 'p1', 0, 0, { overtime: true, picked: REQ })
  assert.deepEqual(t1.chonMistakes, [1], 'quá giờ = +1 lần nhầm')
  // mở lại: lượt mới ở kệ (đếm giờ lại từ đầu, không mang cờ overtime), mang 1 lần nhầm
  assert.ok(startCook(state, 'p1', 0, ctx))
  assert.deepEqual(chonDraft(state, ctx), { picked: [], mistakes: 1 })
  assert.equal(submitChon(state, REQ, 0, ctx).score, 85)
  // 1 lần chạm nhầm + quá giờ = 2
  const e2 = env({ seed: 7 })
  pickWrongThenAbandon(e2.state, e2.ctx, 'p1', 0, 1, { overtime: true })
  assert.deepEqual(e2.t1.chonMistakes, [2])
  startCook(e2.state, 'p1', 0, e2.ctx)
  assert.equal(submitChon(e2.state, REQ, 0, e2.ctx).score, 70)
})

test('bỏ món không lần nhầm không thêm trường (cả giữa bước Chọn lẫn trên Thớt)', () => {
  const { ctx, state, t1 } = env()
  // không nhầm gì: phiếu không có trường mới (save không đổi hình dạng)
  startCook(state, 'p1', 0, ctx)
  saveChonDraft(state, { picked: [REQ[0]], mistakes: 0 }, ctx)
  abandonDish(state, ctx)
  assert.equal('chonMistakes' in t1, false)
  // chốt bước Chọn không nhầm (100 điểm) rồi bỏ món trên Thớt: vẫn không thêm trường, mở lại 100
  startCook(state, 'p1', 0, ctx)
  assert.equal(submitChon(state, REQ, 0, ctx).score, 100)
  abandonDish(state, ctx)
  assert.equal('chonMistakes' in t1, false)
  startCook(state, 'p1', 0, ctx)
  assert.equal(chonDraft(state, ctx), null)
  assert.equal(submitChon(state, REQ, 0, ctx).score, 100)
})

test('bỏ món trên Thớt (đã chốt bước Chọn) ghi lại lần nhầm của lượt đã chốt: chốt rồi bỏ món không né được phạt', () => {
  const { ctx, state, sh, t1 } = env()
  // chốt bước Chọn với 3 lần nhầm (55 điểm) rồi bỏ món trên Thớt: phiếu tạm không giữ (đã vào điểm), bỏ món thì ghi lại
  startCook(state, 'p1', 0, ctx)
  saveChonDraft(state, { picked: [REQ[0], DECOY], mistakes: 3 }, ctx)
  assert.equal(submitChon(state, REQ, 3, ctx).score, 55)
  assert.equal('chonMistakes' in t1, false, 'đang trên Thớt: lần nhầm nằm trong phiên nấu')
  const before = sh.ledger.waste
  const r = abandonDish(state, ctx)
  assert.equal(r.ok, true)
  assert.equal(sh.ledger.waste, before + r.waste, 'giá vốn đã trừ vẫn thành hao hụt như cũ')
  assert.deepEqual(t1.chonMistakes, [3])
  assert.equal(t1.status, 'cho')
  // mở lại: chọn lại từ đầu (rổ trống) nhưng mang 3 lần nhầm → không về 100
  const c = startCook(state, 'p1', 0, ctx)
  assert.equal(c.phase, 'chon')
  assert.equal(c.chonMistakes, 3)
  assert.deepEqual(chonDraft(state, ctx), { picked: [], mistakes: 3 })
  assert.equal(submitChon(state, REQ, 0, ctx).score, 55)
  assert.equal('chonMistakes' in t1, false, 'chốt lại xong: phiếu không giữ nữa')
  // chỉ tăng: bỏ trên Thớt lần nữa vẫn 3, không cộng dồn
  abandonDish(state, ctx)
  assert.deepEqual(t1.chonMistakes, [3])
  // quá giờ lúc chốt cũng được giữ (rổ dở mang overtime → +1)
  const e2 = env({ seed: 9 })
  startCook(e2.state, 'p1', 0, e2.ctx)
  saveChonDraft(e2.state, { picked: [REQ[0]], mistakes: 1, overtime: true }, e2.ctx)
  assert.equal(submitChon(e2.state, REQ, 1, e2.ctx).score, 70)
  abandonDish(e2.state, e2.ctx)
  assert.deepEqual(e2.t1.chonMistakes, [2])
  startCook(e2.state, 'p1', 0, e2.ctx)
  assert.equal(submitChon(e2.state, REQ, 0, e2.ctx).score, 70)
  // bỏ món đã bỏ trên Thớt rồi lưu, tải lại: vẫn giữ
  abandonDish(e2.state, e2.ctx)
  const back = reload(e2.state)
  assert.deepEqual(back.shift.tickets[0].chonMistakes, [2])
})

test('phiếu làm lại theo khiếu nại (remake, phiếu mới) không mang lần nhầm cũ', () => {
  const { ctx, state, sh, t1 } = env()
  pickWrongThenAbandon(state, ctx, 'p1', 0, 2)
  startCook(state, 'p1', 0, ctx)
  assert.equal(submitChon(state, REQ, 0, ctx).score, 70)
  playAll(state, ctx, 0)                       // các bước 0 điểm → món Hỏng → khách phàn nàn
  assert.equal(finishDish(state, ctx).grade, 'hong')
  t1.chonMistakes = [5]                        // phiếu cũ còn sót lần nhầm (dữ liệu cũ): cũng không được mang sang
  const sheet = serveTicket(state, 'p1', ctx)
  assert.equal(sheet.final, false)
  const r = resolveComplaint(state, sheet.customerId, { apologyIndex: 0, action: 'remake' }, ctx)
  assert.equal(r.ok, true)
  const rt = r.ticket
  assert.equal(rt.remake, true)
  assert.notEqual(rt.id, 'p1')
  assert.equal('chonMistakes' in rt, false)
  const c = startCook(state, rt.id, 0, ctx)
  assert.equal(c.chonMistakes, 0)
  assert.equal(chonDraft(state, ctx), null)
  assert.equal(submitChon(state, REQ, 0, ctx).score, 100)
  assert.equal(sh.cook.remake, true)
})

test('nấu thử (state.tasting) tách biệt ca thật: lần nhầm ghi vào phiếu nấu thử, không đụng phiếu ca thật', () => {
  const { ctx, state, sh, t1 } = env({ tasting: true })
  const sb = tastingSandbox(state, ctx)
  const tt = state.tasting.shift.tickets[0]
  // nấu thử: chọn nhầm 2 lần rồi bỏ món (lõi cho phép; giao diện nấu thử không có nút Bỏ món)
  startCook(sb.state, 'thu1', 0, sb.ctx)
  saveChonDraft(sb.state, { picked: ['banh_trang', 'banh_mi'], mistakes: 2 }, sb.ctx)
  abandonDish(sb.state, sb.ctx)
  assert.deepEqual(tt.chonMistakes, [2])
  assert.equal(sh.cook, null, 'ca thật không có phiên nấu')
  assert.ok(sh.tickets.every(t => !('chonMistakes' in t)), 'phiếu ca thật không bị ghi')
  // ca thật: lần nhầm riêng
  pickWrongThenAbandon(state, ctx, 'p1', 0, 1)
  assert.deepEqual(t1.chonMistakes, [1])
  assert.deepEqual(tt.chonMistakes, [2], 'phiếu nấu thử giữ nguyên')
  assert.equal(startCook(state, 'p1', 0, ctx).chonMistakes, 1)
  assert.equal(startCook(sb.state, 'thu1', 0, sb.ctx).chonMistakes, 2)
  assert.notEqual(sb.state.shift.cook, state.shift.cook)
  // lưu rồi tải lại: cả hai giữ nguyên
  assert.deepEqual(reload(state), plain(state))
})

test('khách đổi món ở dòng đã bỏ (tình huống "khách đổi ý"): lần nhầm của món cũ không mang sang món mới', () => {
  let checked = 0
  for (let seed = 1; seed <= 40 && checked < 3; seed++) {
    const ctx = { data: DATA, events: [], emit() {} }
    const s = defaultState(seed, DATA)
    s.shopName = 'Xe thử'
    s.day = 5
    startShift(s, ctx)
    const sh = s.shift
    sh.incident = { id: 'doi_y', afterClips: 1, status: 'cho', rng: (s.seed * 7919 + 13) >>> 0, cap: incidentLossCap(s, sh, ctx), guaranteed: true, detail: null, choice: null, result: null }
    sh.incidentQueue = []
    for (let guard = 0; (sh.receipts || []).length < 1; guard++) {
      if (guard > 20000) throw new Error('không kẹp được phiếu')
      if (!counterStep(s, ctx)) advance(s, 0.5, ctx)
    }
    const t = sh.tickets[sh.tickets.length - 1]
    // mọi dòng của phiếu: chọn nhầm 1 lần (đã bỏ ra) rồi bỏ món
    t.lines.forEach((l, i) => {
      startCook(s, t.id, i, ctx)
      saveChonDraft(s, { picked: [], mistakes: 1 }, ctx)
      abandonDish(s, ctx)
    })
    assert.deepEqual(t.chonMistakes, t.lines.map(() => 1))
    if (!openIncident(s, ctx)) continue
    const det = sh.incident.detail
    if (det.ticketId !== t.id) continue
    const keep = JSON.parse(JSON.stringify(s))
    assert.ok(resolveIncident(s, 'doi_mon', ctx).ok)
    assert.equal(t.lines[det.lineIndex].recipeId, det.toId)
    assert.equal(lineChonMistakes(t, det.lineIndex), 0, 'dòng đổi món: về 0')
    t.lines.forEach((l, i) => { if (i !== det.lineIndex) assert.equal(t.chonMistakes[i], 1, 'dòng khác giữ nguyên') })
    // cả phiếu về 0 thì bỏ trường (như khi chốt bước Chọn), còn dòng khác có lần nhầm thì giữ mảng đủ dòng
    if (t.lines.length === 1) assert.equal('chonMistakes' in t, false, 'phiếu 1 dòng: bỏ trường')
    else assert.equal(t.chonMistakes.length, t.lines.length)
    assert.equal(startCook(s, t.id, det.lineIndex, ctx).chonMistakes, 0)
    // từ chối đổi: dòng giữ món cũ, giữ lần nhầm
    const kt = keep.shift.tickets.find(x => x.id === t.id)
    assert.ok(resolveIncident(keep, 'tu_choi', ctx).ok)
    assert.equal(kt.chonMistakes[det.lineIndex], 1)
    // nấu tiếp cho xong phiếu được (không vướng gì)
    abandonDish(s, ctx)
    assert.ok(cookTicket(s, ctx, t))
    checked++
  }
  assert.ok(checked >= 1, 'có ít nhất một ca kiểm được tình huống khách đổi ý')
})

test('normalizeLineMistakes: mảng đúng số dòng, số nguyên 0..99; hỏng → 0; không phải mảng → null', () => {
  assert.deepEqual(normalizeLineMistakes([1, 2, 3], 3), [1, 2, 3])
  assert.deepEqual(normalizeLineMistakes(['x', -2, 3.7], 3), [0, 0, 3])
  assert.deepEqual(normalizeLineMistakes([1e9, null, NaN], 3), [CHON_DRAFT_MISTAKES_MAX, 0, 0])
  assert.deepEqual(normalizeLineMistakes(['3', true, {}], 3), [0, 0, 0], 'không phải số → 0')
  assert.deepEqual(normalizeLineMistakes([1, 2, 3, 4, 5], 2), [1, 2], 'thừa dòng → cắt')
  assert.deepEqual(normalizeLineMistakes([2], 3), [2, 0, 0], 'thiếu dòng → 0')
  assert.deepEqual(normalizeLineMistakes([Infinity, -Infinity], 2), [CHON_DRAFT_MISTAKES_MAX, 0], 'quá lớn → trần, như 1e9')
  for (const bad of [null, undefined, 5, 'abc', { 0: 2 }]) assert.equal(normalizeLineMistakes(bad, 1), null)
  assert.equal(lineChonMistakes({ chonMistakes: [4] }, 0), 4)
  assert.equal(lineChonMistakes({ chonMistakes: [4] }, 3), 0, 'lineIndex ngoài mảng')
  assert.equal(lineChonMistakes({ chonMistakes: { 0: 4 } }, 0), 0)
  assert.equal(lineChonMistakes({}, 0), 0)
  assert.equal(lineChonMistakes(null, 0), 0)
  // xóa lần nhầm một dòng (dòng đổi món): dòng đó về 0; cả phiếu về 0 thì bỏ trường; dòng sai / chưa có trường thì thôi
  const two = { lines: [{}, {}], chonMistakes: [3, 2] }
  clearLineMistakes(two, 1)
  assert.deepEqual(two.chonMistakes, [3, 0])
  clearLineMistakes(two, 0)
  assert.equal('chonMistakes' in two, false)
  const one = { lines: [{}], chonMistakes: [4] }
  clearLineMistakes(one, 5)
  assert.deepEqual(one.chonMistakes, [4], 'lineIndex ngoài phiếu: không đổi')
  clearLineMistakes(one, 0)
  assert.equal('chonMistakes' in one, false)
  const none = { lines: [{}] }
  clearLineMistakes(none, 0)
  assert.equal('chonMistakes' in none, false, 'chưa có trường: không thêm')
})

test('migrate: lần nhầm theo dòng hỏng được kẹp (không phải số, âm, lineIndex sai); không sửa object đầu vào; nấu thử cũng vậy', () => {
  const lines = [0, 1, 2].map(() => ({ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }))
  const { ctx, state } = env({ lines, tasting: true })
  const cases = [
    [['x', -2, 3.7], [0, 0, 3]],
    [[1e9, null, '4'], [CHON_DRAFT_MISTAKES_MAX, 0, 0]],
    [[1, 2, 3, 4, 5], [1, 2, 3]],
    [[2], [2, 0, 0]],
    [[0, 0, 0], [0, 0, 0]]
  ]
  for (const [bad, want] of cases) {
    const raw = plain(state)
    raw.shift.tickets[0].chonMistakes = bad
    const before = JSON.stringify(raw)
    const s = migrate(raw, DATA)
    assert.equal(JSON.stringify(raw), before, 'không sửa object đầu vào')
    assert.deepEqual(s.shift.tickets[0].chonMistakes, want, `chonMistakes ${JSON.stringify(bad)}`)
    assert.deepEqual(s.shift.tickets[1], raw.shift.tickets[1], 'phiếu khác giữ nguyên')
  }
  for (const bad of [null, 'abc', 7, { 0: 2 }, true]) {
    const raw = plain(state)
    raw.shift.tickets[0].chonMistakes = bad
    assert.equal('chonMistakes' in migrate(raw, DATA).shift.tickets[0], false, `${JSON.stringify(bad)} bị bỏ`)
  }
  // phiếu hỏng không có mảng dòng: bỏ trường
  assert.equal('chonMistakes' in migrateLineMistakes({ tickets: [{ id: 'p9', chonMistakes: [1] }] }).tickets[0], false)
  // không có gì để sửa: trả chính ca đó
  const sh0 = { tickets: [{ id: 'p1', lines: [{}], chonMistakes: [1] }, { id: 'p2', lines: [{}] }] }
  assert.equal(migrateLineMistakes(sh0), sh0)
  for (const v of [null, {}, { tickets: 'x' }]) assert.equal(migrateLineMistakes(v), v)
  // nấu thử: được làm sạch như ca thật
  const raw = plain(state)
  raw.tasting.shift.tickets[0].chonMistakes = [-1, 9]
  assert.deepEqual(migrate(raw, DATA).tasting.shift.tickets[0].chonMistakes, [0])
  // dữ liệu đã làm sạch chơi tiếp được: dòng 2 mang 3 lần nhầm
  const raw2 = plain(state)
  raw2.shift.tickets[0].chonMistakes = ['x', -2, 3.7]
  const s2 = migrate(raw2, DATA)
  assert.equal(startCook(s2, 'p1', 2, ctx).chonMistakes, 3)
  assert.equal(submitChon(s2, REQ, 0, ctx).score, 55)
})

test('lưu rồi tải lại giữ nguyên lần nhầm theo dòng (ca thật và nấu thử); tải lại sau khi bỏ món vẫn tính phạt', () => {
  const lines = [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }, { recipeId: 'tra_tac', qty: 1, notes: [] }]
  const { ctx, state } = env({ lines, tasting: true })
  pickWrongThenAbandon(state, ctx, 'p1', 0, 2)
  const sb = tastingSandbox(state, ctx)
  startCook(sb.state, 'thu1', 0, sb.ctx)
  saveChonDraft(sb.state, { picked: [], mistakes: 1, overtime: true }, sb.ctx)
  abandonDish(sb.state, sb.ctx)
  const enc = encodeSave(state)
  const back = migrate(decodeSave(enc), DATA)
  assert.deepEqual(back, plain(state), 'round-trip giữ nguyên')
  assert.equal(encodeSave(back), enc, 'mã hóa lại giống hệt')
  assert.deepEqual(back.shift.tickets[0].chonMistakes, [2, 0])
  assert.deepEqual(back.tasting.shift.tickets[0].chonMistakes, [2])
  // "F5" sau khi bỏ món: mở lại dòng 0 vẫn bị tính 2 lần nhầm
  startCook(back, 'p1', 0, ctx)
  assert.deepEqual(chonDraft(back, ctx), { picked: [], mistakes: 2 })
  // đang mở lại (rổ dở mang lần nhầm) rồi tải lại lần nữa: vẫn vậy
  const back2 = reload(back)
  assert.deepEqual(back2, plain(back))
  assert.equal(submitChon(back2, REQ, 0, ctx).score, 70)
})

test('save cũ (v2 của bản 0.3, chưa có trường này) nạp được, chơi tiếp được, không thêm trường khi không cần', () => {
  const s = migrate(decodeSave(SAVE_V2_MID_SHIFT), DATA)
  assert.ok(s.shift)
  assert.ok(s.shift.tickets.length > 0)
  assert.ok(s.shift.tickets.every(t => !('chonMistakes' in t)))
  const ctx = makeMetaCtx({ at: '2026-10-06T08:00' })
  const t = s.shift.tickets.find(x => x.status === 'cho')
  const c = startCook(s, t.id, 0, ctx)
  assert.equal(c.chonMistakes, 0)
  assert.equal(chonDraft(s, ctx), null)
  const R = DATA.RECIPES[c.recipeId]
  const decoy = (R.decoys || []).find(id => R.shelf.includes(id)) || R.shelf.find(id => !requiredIngredients(R, c.notes).required.includes(id))
  saveChonDraft(s, { picked: [decoy], mistakes: 1 }, ctx)
  abandonDish(s, ctx)
  assert.equal(lineChonMistakes(t, 0), 1)
  assert.equal(t.chonMistakes.length, t.lines.length)
  // ghi bằng version cũ rồi nạp lại: trường mới giữ nguyên
  const raw = plain(s)
  raw.version = 2
  assert.deepEqual(migrate(decodeSave(encodeSave(raw)), DATA).shift.tickets.find(x => x.id === t.id).chonMistakes, t.chonMistakes)
})
