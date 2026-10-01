// Hồi quy: rổ đang chọn dở của bước Chọn nguyên liệu lưu vào state (state.shift.cook.chonDraft = {picked, mistakes}),
// tải lại trang giữa bước Chọn vẫn còn rổ và số lần chọn nhầm; xóa khi submitChon thành công, bỏ món, sang món khác;
// không dùng được để xóa lần nhầm hay phạt quá giờ (overtime); nấu thử giữ rổ trong hộp cát (state.tasting); save cũ nạp
// được, trường mới được làm sạch.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { startShift } from '../../src/core/shift.js'
import {
  startCook, submitChon, abandonDish, chonDraft, saveChonDraft, normalizeChonDraft, CHON_DRAFT_MISTAKES_MAX
} from '../../src/core/kitchen.js'
import { encodeSave, decodeSave, migrate, migrateCookDraft } from '../../src/core/save.js'
import { startTasting, tastingSandbox } from '../../src/core/shop.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'
import { SAVE_V2_MID_SHIFT } from '../fixtures/save-v2.mjs'

const BM = DATA.RECIPES.banh_mi_op_la
const REQ = requiredIngredients(BM, []).required
const DECOY = BM.decoys.find(id => BM.shelf.includes(id))
const plain = v => JSON.parse(JSON.stringify(v))
// "tải lại trang": mã hóa → giải mã → migrate như lúc mở game
const reload = s => migrate(decodeSave(encodeSave(s)), DATA)

// Ca thật (dữ liệu thật) có 2 phiếu chờ: p1 = Bánh mì ốp la, p2 = Trà tắc.
function env(seed = 5) {
  const ctx = makeMetaCtx({ at: '2026-10-01T09:00' })
  const state = defaultState(seed, DATA)
  state.day = 2
  startShift(state, ctx)
  const sh = state.shift
  const ids = sh.plan.map(p => p.customerId)
  const mk = (id, cid, recipeId) => {
    const lines = [{ recipeId, qty: 1, notes: [] }]
    Object.assign(sh.customers[cid], { request: lines, status: 'cho_mon', waitStart: 0, waitBudget: 100, ticketId: id })
    sh.tickets.push({ id, no: '#00' + id.slice(1), customerId: cid, lines, createdAt: 0, status: 'cho', done: [null] })
  }
  mk('p1', ids[0], 'banh_mi_op_la')
  mk('p2', ids[1], 'tra_tac')
  sh.nextTicketNo = 3
  return { ctx, state, sh }
}

test('normalizeChonDraft: id hợp lệ, không trùng, chỉ ô trên kệ; lần nhầm số nguyên 0..99; dữ liệu hỏng → rổ trống', () => {
  assert.deepEqual(normalizeChonDraft({ picked: ['banh_mi', 'banh_mi', 'X Y', 7, null, 'trung_ga'], mistakes: 2 }),
    { picked: ['banh_mi', 'trung_ga'], mistakes: 2 })
  assert.deepEqual(normalizeChonDraft({ picked: ['banh_mi', 'ca_phe_bmt'], mistakes: 1 }, BM.shelf), { picked: ['banh_mi'], mistakes: 1 })
  assert.deepEqual(normalizeChonDraft({ picked: [], mistakes: -3 }), { picked: [], mistakes: 0 })
  assert.deepEqual(normalizeChonDraft({ picked: [], mistakes: 2.7 }), { picked: [], mistakes: 2 })
  assert.deepEqual(normalizeChonDraft({ picked: [], mistakes: '3' }), { picked: [], mistakes: 3 })
  assert.deepEqual(normalizeChonDraft({ picked: [], mistakes: 'x' }), { picked: [], mistakes: 0 })
  assert.deepEqual(normalizeChonDraft({ picked: [], mistakes: 1e9 }), { picked: [], mistakes: CHON_DRAFT_MISTAKES_MAX })
  for (const bad of [null, undefined, 5, 'abc', [1, 2], { picked: 'banh_mi' }]) {
    assert.deepEqual(normalizeChonDraft(bad), { picked: [], mistakes: 0 })
  }
})

test('saveChonDraft: lưu rổ + lần nhầm vào cook.chonDraft (JSON thuần), chỉ giữ ô trên kệ, lần nhầm chỉ tăng; chonDraft đọc lại', () => {
  const { ctx, state, sh } = env()
  assert.equal(chonDraft(state, ctx), null, 'chưa mở phiên nấu')
  assert.equal(saveChonDraft(state, { picked: [REQ[0]], mistakes: 0 }, ctx).ok, false, 'không có phiên nấu thì không lưu')
  startCook(state, 'p1', 0, ctx)
  assert.equal(chonDraft(state, ctx), null, 'phiên mới chưa có rổ dở')
  let r = saveChonDraft(state, { picked: [REQ[0], DECOY], mistakes: 1 }, ctx)
  assert.deepEqual(r, { ok: true, picked: [REQ[0], DECOY], mistakes: 1, raised: true })
  assert.deepEqual(sh.cook.chonDraft, { picked: [REQ[0], DECOY], mistakes: 1 })
  assert.deepEqual(plain(sh.cook.chonDraft), sh.cook.chonDraft, 'JSON thuần')
  // bỏ hàng nhầm ra khỏi rổ (giao diện gửi lần nhầm cũ) — hay gửi lần nhầm nhỏ hơn: lần nhầm không giảm
  r = saveChonDraft(state, { picked: [REQ[0]], mistakes: 0 }, ctx)
  assert.deepEqual(r, { ok: true, picked: [REQ[0]], mistakes: 1, raised: false })
  // id lạ / không có trên kệ món này bị bỏ
  r = saveChonDraft(state, { picked: [REQ[0], 'ca_phe_bmt', '<b>', REQ[0]], mistakes: 1 }, ctx)
  assert.deepEqual(r.picked, [REQ[0]])
  assert.deepEqual(chonDraft(state, ctx), { picked: [REQ[0]], mistakes: 1 })
  r = saveChonDraft(state, { picked: [REQ[0], DECOY], mistakes: 2 }, ctx)
  assert.equal(r.raised, true)
  assert.equal(chonDraft(state, ctx).mistakes, 2)
})

test('submitChon: thiếu nguyên liệu chính giữ rổ dở; thành công xóa rổ dở, lần nhầm tính = max(gửi lên, đã lưu)', () => {
  const { ctx, state, sh } = env()
  startCook(state, 'p1', 0, ctx)
  saveChonDraft(state, { picked: [REQ[0], DECOY], mistakes: 1 }, ctx)
  const wallet = state.wallet
  const blocked = submitChon(state, [REQ[0]], 1, ctx)
  assert.equal(blocked.ok, false)
  assert.equal(blocked.blockedMissingMain, true)
  assert.equal(state.wallet, wallet, 'bị chặn: không trừ tiền')
  assert.deepEqual(chonDraft(state, ctx), { picked: [REQ[0], DECOY], mistakes: 1 }, 'bị chặn: rổ dở giữ nguyên')
  const ok = submitChon(state, REQ, 0, ctx)
  assert.equal(ok.ok, true)
  assert.equal(sh.cook.phase, 'thot')
  assert.equal(sh.cook.chonMistakes, 1, 'lần nhầm đã lưu vẫn tính')
  assert.equal(sh.cook.chonScore, 85)
  assert.equal('chonDraft' in sh.cook, false, 'rổ dở đã xóa')
  assert.equal(chonDraft(state, ctx), null)
  assert.equal(saveChonDraft(state, { picked: REQ, mistakes: 0 }, ctx).ok, false, 'đã qua bước Chọn: không lưu rổ nữa')
  // không có rổ dở: như cũ (điểm theo lần nhầm gửi lên)
  const e2 = env(6)
  startCook(e2.state, 'p1', 0, e2.ctx)
  assert.equal(submitChon(e2.state, REQ, 0, e2.ctx).score, 100)
  const e3 = env(7)
  startCook(e3.state, 'p1', 0, e3.ctx)
  assert.equal(submitChon(e3.state, REQ, 2, e3.ctx).score, 70)
})

test('chống gian lận: chọn nhầm → tải lại trang → rổ và lần nhầm còn; gửi 0 lần nhầm vẫn bị tính (85 điểm)', () => {
  const { ctx, state } = env()
  startCook(state, 'p1', 0, ctx)
  saveChonDraft(state, { picked: [REQ[0], REQ[1], DECOY], mistakes: 1 }, ctx)
  const back = reload(state)
  assert.deepEqual(back.shift.cook.chonDraft, { picked: [REQ[0], REQ[1], DECOY], mistakes: 1 })
  assert.deepEqual(chonDraft(back, ctx), { picked: [REQ[0], REQ[1], DECOY], mistakes: 1 })
  // giao diện mở lại bước Chọn với rổ khôi phục; người chơi bỏ hàng nhầm, lấy đủ rồi Xong — kể cả khi gửi lên 0 lần nhầm
  assert.equal(startCook(back, 'p1', 0, ctx), back.shift.cook, 'mở lại đúng dòng đang chọn: cùng phiên nấu')
  const r = submitChon(back, REQ, 0, ctx)
  assert.equal(r.ok, true)
  assert.equal(r.score, 85)
  assert.equal(back.shift.cook.chonMistakes, 1)
})

test('bỏ món / sang món khác: rổ dở mất theo phiên nấu, món mới bắt đầu rổ trống', () => {
  const { ctx, state, sh } = env()
  startCook(state, 'p1', 0, ctx)
  saveChonDraft(state, { picked: [REQ[0], DECOY], mistakes: 1 }, ctx)
  assert.equal(startCook(state, 'p2', 0, ctx), null, 'đang chọn dở món khác: không mở được món mới')
  assert.equal(chonDraft(state, ctx).mistakes, 1)
  assert.equal(abandonDish(state, ctx).ok, true)
  assert.equal(sh.cook, null)
  assert.equal(chonDraft(state, ctx), null)
  const c2 = startCook(state, 'p2', 0, ctx)
  assert.ok(c2)
  assert.equal('chonDraft' in c2, false)
  assert.equal(chonDraft(state, ctx), null, 'món khác: rổ trống')
  // quay lại món cũ sau khi bỏ: rổ trống nhưng lần nhầm của dòng đó vẫn còn (mục 25, ticket.chonMistakes);
  // chi tiết ở tests/unit/fix-chon-line-mistakes.test.mjs
  abandonDish(state, ctx)
  startCook(state, 'p1', 0, ctx)
  assert.deepEqual(chonDraft(state, ctx), { picked: [], mistakes: 1 })
})

test('save v3 có rổ dở (ca thật và nấu thử) lưu rồi tải lại giống hệt', () => {
  const { ctx, state } = env()
  startCook(state, 'p1', 0, ctx)
  saveChonDraft(state, { picked: [REQ[1], DECOY, REQ[0]], mistakes: 2 }, ctx)
  assert.deepEqual(reload(state), plain(state))
  // rổ rỗng nhưng đã có lần nhầm (bỏ hết ra) cũng giữ
  saveChonDraft(state, { picked: [], mistakes: 2 }, ctx)
  assert.deepEqual(reload(state).shift.cook.chonDraft, { picked: [], mistakes: 2 })
  // nấu thử ngoài ca
  const s2 = defaultState(9, DATA)
  s2.day = 3
  assert.equal(startTasting(s2, 'banh_trang_tron', ctx).ok, true)
  const sb = tastingSandbox(s2, ctx)
  startCook(sb.state, 'thu1', 0, sb.ctx)
  saveChonDraft(sb.state, { picked: ['banh_trang', 'kho_bo'], mistakes: 1 }, sb.ctx)
  assert.deepEqual(reload(s2), plain(s2))
})

test('migrate: rổ dở hỏng được làm sạch, rổ của bước đã qua Chọn bị bỏ; không sửa object đầu vào', () => {
  const { ctx, state } = env()
  startCook(state, 'p1', 0, ctx)
  const raw = plain(state)
  raw.shift.cook.chonDraft = { picked: [REQ[0], REQ[0], 'ca_phe_bmt', 'X Y', 12, DECOY], mistakes: -2.5, extra: 1 }
  const before = JSON.stringify(raw)
  const s = migrate(raw, DATA)
  assert.equal(JSON.stringify(raw), before, 'không sửa object đầu vào')
  assert.deepEqual(s.shift.cook.chonDraft, { picked: [REQ[0], DECOY], mistakes: 0 })
  for (const [m, want] of [[3.9, 3], ['4', 4], [1e6, CHON_DRAFT_MISTAKES_MAX], [NaN, 0], [null, 0]]) {
    const r2 = plain(state)
    r2.shift.cook.chonDraft = { picked: [REQ[0]], mistakes: m }
    assert.equal(migrate(r2, DATA).shift.cook.chonDraft.mistakes, want, `mistakes ${m}`)
  }
  for (const bad of [null, 'abc', 7, [REQ[0]]]) {
    const r3 = plain(state)
    r3.shift.cook.chonDraft = bad
    assert.equal('chonDraft' in migrate(r3, DATA).shift.cook, false, `rổ ${JSON.stringify(bad)} bị bỏ`)
  }
  // phiên nấu đã sang Thớt mà còn sót rổ dở → bỏ
  submitChon(state, REQ, 0, ctx)
  const r4 = plain(state)
  r4.shift.cook.chonDraft = { picked: REQ, mistakes: 1 }
  const s4 = migrate(r4, DATA)
  assert.equal('chonDraft' in s4.shift.cook, false)
  assert.equal(s4.shift.cook.phase, 'thot', 'phiên nấu còn lại giữ nguyên')
  assert.deepEqual(s4.shift.cook.picked, state.shift.cook.picked)
  // không có dữ liệu (data null): chỉ kiểm dạng id, không lọc theo kệ
  assert.deepEqual(migrateCookDraft({ cook: { phase: 'chon', recipeId: 'la', chonDraft: { picked: ['ca_phe_bmt', 'X'], mistakes: 1 } } }).cook.chonDraft,
    { picked: ['ca_phe_bmt'], mistakes: 1 })
  // ca không có phiên nấu / phiên nấu không có rổ: trả nguyên ca
  const sh0 = { cook: null }
  assert.equal(migrateCookDraft(sh0, DATA), sh0)
  const sh1 = { cook: { phase: 'chon', recipeId: 'banh_mi_op_la' } }
  assert.equal(migrateCookDraft(sh1, DATA), sh1)
  // nấu thử: rổ hỏng được làm sạch như ca thật
  const s5 = defaultState(9, DATA)
  s5.day = 3
  startTasting(s5, 'banh_trang_tron', ctx)
  const sb = tastingSandbox(s5, ctx)
  startCook(sb.state, 'thu1', 0, sb.ctx)
  const r5 = plain(s5)
  r5.tasting.shift.cook.chonDraft = { picked: ['banh_trang', 'banh_mi'], mistakes: -1 }
  assert.deepEqual(migrate(r5, DATA).tasting.shift.cook.chonDraft, { picked: ['banh_trang'], mistakes: 0 })
})

test('save cũ v1/v2 (chưa có rổ dở, kể cả ca dở đang ở bước Chọn) vẫn nạp được, không thêm trường mới', () => {
  // v2 thật của bản 0.3.0 đang dở ca (không có phiên nấu)
  const s = migrate(decodeSave(SAVE_V2_MID_SHIFT), DATA)
  assert.ok(s.shift)
  assert.equal(s.shift.cook, null)
  // ca dở v2 đang ở bước Chọn (phiên nấu không có chonDraft)
  const ctx = makeMetaCtx({ at: '2026-10-06T08:00' })
  const t = s.shift.tickets.find(x => x.status === 'cho')
  startCook(s, t.id, 0, ctx)
  const raw2 = plain(s)
  raw2.version = 2
  const s2 = migrate(decodeSave(encodeSave(raw2)), DATA)
  assert.equal(s2.shift.cook.phase, 'chon')
  assert.equal('chonDraft' in s2.shift.cook, false)
  assert.equal(chonDraft(s2, ctx), null)
  // chơi tiếp được: lưu rổ, chốt bước Chọn
  const R = DATA.RECIPES[s2.shift.cook.recipeId]
  const req = requiredIngredients(R, s2.shift.cook.notes).required
  assert.equal(saveChonDraft(s2, { picked: [req[0]], mistakes: 0 }, ctx).ok, true)
  assert.equal(submitChon(s2, req, 0, ctx).ok, true)
  // v1 (bản 0.1): ca dở bước Chọn cũng nạp được
  const raw1 = plain(raw2)
  raw1.version = 1
  const s1 = migrate(decodeSave(encodeSave(raw1)), DATA)
  assert.equal(s1.shift.cook.phase, 'chon')
  assert.equal('chonDraft' in s1.shift.cook, false)
})

test('phạt quá giờ của bước Chọn nằm trong rổ dở (overtime): giữ qua tải lại / đổi tab, chốt bước vẫn bị tính +1 lần nhầm', () => {
  // chuẩn hóa: overtime chỉ giữ khi đúng là true
  assert.deepEqual(normalizeChonDraft({ picked: ['banh_mi'], mistakes: 1, overtime: true }), { picked: ['banh_mi'], mistakes: 1, overtime: true })
  for (const v of [false, 'true', 1, null, {}]) {
    assert.deepEqual(normalizeChonDraft({ picked: [], mistakes: 0, overtime: v }), { picked: [], mistakes: 0 }, `overtime ${JSON.stringify(v)}`)
  }
  const { ctx, state, sh } = env()
  startCook(state, 'p1', 0, ctx)
  saveChonDraft(state, { picked: REQ, mistakes: 0 }, ctx)
  // vừa quá giờ: giao diện gửi overtime → lưu, raised để ghi save ngay
  let r = saveChonDraft(state, { picked: REQ, mistakes: 0, overtime: true }, ctx)
  assert.deepEqual(r, { ok: true, picked: REQ, mistakes: 0, overtime: true, raised: true })
  assert.deepEqual(sh.cook.chonDraft, { picked: REQ, mistakes: 0, overtime: true })
  // lượt sau (giao diện cũ / mở lại không gửi overtime) không xóa được cờ; lần nhầm vẫn chỉ tăng
  r = saveChonDraft(state, { picked: REQ.slice(1), mistakes: 0 }, ctx)
  assert.deepEqual(r, { ok: true, picked: REQ.slice(1), mistakes: 0, overtime: true, raised: false })
  assert.deepEqual(chonDraft(state, ctx), { picked: REQ.slice(1), mistakes: 0, overtime: true })
  // tải lại trang: cờ còn; chốt bước gửi 0 lần nhầm vẫn bị tính 1 (85 điểm), rổ dở bị xóa
  const back = reload(state)
  assert.deepEqual(back.shift.cook.chonDraft, { picked: REQ.slice(1), mistakes: 0, overtime: true })
  const ok = submitChon(back, REQ, 0, ctx)
  assert.equal(ok.ok, true)
  assert.equal(back.shift.cook.chonMistakes, 1)
  assert.equal(ok.score, 85)
  assert.equal('chonDraft' in back.shift.cook, false)
  // giao diện đã cộng sẵn phạt quá giờ vào số gửi lên (lần nhầm chạm 1 + quá giờ 1 = 2): không cộng lần nữa
  const e2 = env(8)
  startCook(e2.state, 'p1', 0, e2.ctx)
  saveChonDraft(e2.state, { picked: [REQ[0], DECOY], mistakes: 1, overtime: true }, e2.ctx)
  assert.equal(submitChon(e2.state, REQ, 2, e2.ctx).score, 70)
  assert.equal(e2.state.shift.cook.chonMistakes, 2)
  // migrate: cờ hỏng kiểu bị bỏ, cờ đúng giữ nguyên (lưu rồi tải lại không đổi)
  const e3 = env(9)
  startCook(e3.state, 'p1', 0, e3.ctx)
  const raw = plain(e3.state)
  raw.shift.cook.chonDraft = { picked: [REQ[0]], mistakes: 1, overtime: 'yes' }
  assert.deepEqual(migrate(raw, DATA).shift.cook.chonDraft, { picked: [REQ[0]], mistakes: 1 })
  saveChonDraft(e3.state, { picked: [REQ[0]], mistakes: 1, overtime: true }, e3.ctx)
  assert.deepEqual(reload(e3.state), plain(e3.state))
})
