// M4 bước 6 (docs/tham-khao/m4-thiet-ke.md mục C, F.5): nguyên liệu và công thức hiếm.
// Phiên hàng theo giờ thật (biên khung giờ, khóa khi lùi giờ, 1 lượt mỗi khung mỗi ngày thật, sản lượng theo điểm),
// Giỏ chợ (40/60 trên 5.000 lượt, bảo hiểm 2 lượt, 100% nguyên liệu khi hết món nhận mảnh), trần mỗi ngày thật (6 phần
// + 3 mảnh), kho đầy đổi Muỗng Vàng, khách lạ (1 lần mỗi ngày thật, quà theo sao), mở món bằng nấu thử, đơn món hiếm
// không vượt tồn kho (40 hạt giống), giới hạn ở quầy, tiêu hao lúc Ra món, bỏ món/làm lại bước không mất hàng, khóa
// "Làm lại" khi hết hàng, "Khách đổi ý" không đổi sang món hiếm, lãi/giây ≤ 550đ, lưu/tải.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState, newRecipeProgress, STATE_VERSION } from '../../src/core/state.js'
import { startShift, advance, endShift } from '../../src/core/shift.js'
import {
  addLine, readback, confirmOrder, priceOfLines, reportTotal, clipTicket
} from '../../src/core/order.js'
import {
  startCook, submitChon, availableSteps, getStep, submitStep, finishDish, abandonDish, retryStep, serveTicket,
  resolveComplaint, complaintRemakeOk
} from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { orderableRecipes } from '../../src/core/customer.js'
import { makeNowInfo, vnMinutes } from '../../src/core/clock.js'
import { encodeSave, decodeSave, migrate } from '../../src/core/save.js'
import { canTaste, startTasting, tastingSandbox, finishTasting } from '../../src/core/shop.js'
import { grantReward } from '../../src/core/rewards.js'
import { checkStageUp } from '../../src/core/progression.js'
import { recipeBook } from '../../src/core/recipe-book.js'
import { isRecentRecipe } from '../../src/core/stats.js'
import { openIncident, resolveIncident, incidentLossCap, incidentGainCap } from '../../src/core/incidents.js'
import {
  rareConfig, ensureRare, stallStatus, startStall, finishStall, stallGame, rollBasket, basketOdds, grantRare, grantFragment,
  rareLeft, rareMenuFor, finishShiftRare, strangerGift, rareOverview, fragmentCandidates, rareStock, capRareRequests
} from '../../src/core/rare.js'
import { counterStep, cookTicket, playShift } from '../helpers/perfect-player.mjs'
import { vn } from '../helpers/meta-helpers.mjs'

const RARE_RECIPES = ['tra_tac_mat_ong', 'banh_mi_trung_ga_ta', 'banh_trang_tron_tay_ninh', 'ca_phe_muoi']

function makeCtx(at = null, data = DATA) {
  const events = []
  const ctx = { data, events, emit: (type, payload) => events.push({ type, payload }) }
  if (at) { ctx.clock = { t: vn(at) }; ctx.now = () => ctx.clock.t }
  return ctx
}

function stateAt(seed = 1, day = 6) {
  const s = defaultState(seed, DATA)
  s.shopName = 'Xe thử hàng hiếm'
  s.day = day
  return s
}

// Có đủ món nền cho 4 món hiếm.
function withBases(s) {
  for (const id of ['banh_trang_tron', 'ca_phe_sua_da']) if (!s.recipes[id]) s.recipes[id] = newRecipeProgress(0)
  return s
}

// Sở hữu món hiếm và kho có sẵn hàng.
function ownRare(s, ids = RARE_RECIPES, stock = {}) {
  withBases(s)
  for (const id of ids) s.recipes[id] = newRecipeProgress(0)
  ensureRare(s)
  Object.assign(s.rare.stock, stock)
  return s
}

const ni = (s, str) => makeNowInfo(s, vn(str))

// Nấu 1 dòng phiếu theo đúng công thức (điểm bước `score`), dừng trước "Ra món" nếu stopBeforeFinish.
function cookLine(s, ctx, ticket, i, { score = 100, finish = true } = {}) {
  const cook = startCook(s, ticket.id, i, ctx)
  assert.ok(cook, 'mở được phiên nấu')
  const r = submitChon(s, requiredIngredients(DATA.RECIPES[cook.recipeId], cook.notes).required, 0, ctx)
  assert.ok(r.ok)
  let av
  while ((av = availableSteps(s)).length) {
    const st = getStep(s, av[0])
    submitStep(s, av[0], { score, method: st.method ? st.method.correct : undefined }, ctx)
  }
  return finish ? finishDish(s, ctx) : null
}

// Khách đầu hàng gọi `lines` (ghi đè yêu cầu thật), quầy phục vụ tới kẹp phiếu. Trả phiếu.
function serveCounterWith(s, ctx, lines) {
  let guard = 0
  while (!s.shift.counter && guard++ < 400) advance(s, 0.5, ctx)
  const c = s.shift.customers[s.shift.counter.customerId]
  c.request = lines.map(l => ({ recipeId: l.recipeId, qty: l.qty, notes: l.notes || [] }))
  c.forcePay = null
  while (s.shift.counter && s.shift.counter.customerId === c.id) {
    if (!counterStep(s, ctx)) advance(s, 0.5, ctx)
  }
  return s.shift.tickets.find(t => t.customerId === c.id)
}

// ---------- Dữ liệu, cấu hình ----------

test('dữ liệu: RARE_CONFIG theo thiết kế C.1; 3 phiên hàng đúng khung giờ; 5 khách lạ mang 5 nguyên liệu hiếm', () => {
  const C = rareConfig({ data: DATA })
  assert.deepEqual([C.fromDay, C.stockMax, C.overflowGold, C.dailyCap, C.dailyFragCap, C.fragmentsNeed, C.unlockGrade],
    [3, 6, 2, 6, 3, 3, 'duoc'])
  assert.deepEqual([C.basket.ingredient, C.basket.pityAfter, C.orderWeight, C.repPerGood], [0.4, 2, 1.5, 1])
  assert.deepEqual(DATA.STALLS.map(x => [x.id, x.name, x.from, x.to]), [
    ['cho_som', 'Chợ sớm', '05:00', '09:00'], ['ba_gac_trua', 'Xe ba gác trưa', '11:00', '13:30'], ['ganh_toi', 'Gánh đặc sản tối', '17:30', '21:00']])
  assert.deepEqual(DATA.STRANGERS.map(x => x.ing).sort(), ['ca_phe_bmt', 'kho_muc', 'mat_ong_rung', 'muoi_tom_tay_ninh', 'trung_ga_ta'])
  for (const x of DATA.STRANGERS) assert.ok(DATA.PERSONAS[x.persona] && x.name && x.self && x.thanks)
  for (const st of DATA.STALLS) {
    const game = stallGame(stateAt(1), st, '2026-10-05', { data: DATA })
    assert.equal(game.shelf.length, 9, `${st.id}: kệ 9 ô`)
    assert.equal(new Set(game.shelf).size, 9)
    for (const g of st.goods) assert.ok(game.shelf.includes(g) && DATA.INGREDIENTS[g].rare)
    for (const g of st.goods) for (const t of DATA.INGREDIENTS[g].traps) assert.ok(game.shelf.includes(t), `${st.id}: bẫy ${t}`)
    assert.deepEqual(game.recipe.ingredients.map(i => i.role), st.goods.map(() => 'chinh'))
  }
})

test('lãi/giây nấu của món hiếm ≤ 550đ; nguyên liệu hiếm không trừ Tiền quán khi chọn', () => {
  for (const id of RARE_RECIPES) {
    const r = DATA.RECIPES[id]
    const par = r.steps.reduce((a, st) => a + st.par, 0)
    assert.ok((r.price - r.cost) / par <= 550, id)
  }
  const ctx = makeCtx()
  const s = ownRare(stateAt(3, 6), ['tra_tac_mat_ong'], { mat_ong_rung: 3 })
  startShift(s, ctx)
  const t = serveCounterWith(s, ctx, [{ recipeId: 'tra_tac_mat_ong', qty: 1 }])
  const before = s.wallet
  const cook = startCook(s, t.id, 0, ctx)
  submitChon(s, requiredIngredients(DATA.RECIPES.tra_tac_mat_ong, []).required, 0, ctx)
  // trà 800 + tắc 1.200 + ly 300 + đá 400 = 2.700đ → 2.500đ (mật ong lấy từ kho)
  assert.equal(before - s.wallet, 2500)
  assert.equal(cook.cost.cogs, 2500)
  assert.equal(rareStock(s, 'mat_ong_rung'), 3, 'chưa Ra món: kho chưa trừ')
})

// ---------- Phiên hàng ----------

test('phiên hàng: biên khung giờ 04:59/05:00/08:59/09:00/11:00/13:30/17:30/21:00 (giờ Việt Nam)', () => {
  const ctx = makeCtx()
  const s = stateAt(1, 5)
  const cur = str => { const st = stallStatus(s, ni(s, str), ctx); return st.current ? st.current.id : null }
  assert.equal(vnMinutes(vn('2026-10-05T04:59')), 299)
  assert.equal(cur('2026-10-05T04:59'), null)
  assert.equal(cur('2026-10-05T05:00'), 'cho_som')
  assert.equal(cur('2026-10-05T08:59'), 'cho_som')
  assert.equal(cur('2026-10-05T09:00'), null)
  assert.equal(cur('2026-10-05T10:59'), null)
  assert.equal(cur('2026-10-05T11:00'), 'ba_gac_trua')
  assert.equal(cur('2026-10-05T13:29'), 'ba_gac_trua')
  assert.equal(cur('2026-10-05T13:30'), null)
  assert.equal(cur('2026-10-05T17:30'), 'ganh_toi')
  assert.equal(cur('2026-10-05T20:59'), 'ganh_toi')
  assert.equal(cur('2026-10-05T21:00'), null)
  // phiên kế tiếp / ngày mai
  const t = stateAt(1, 5)
  assert.equal(stallStatus(t, ni(t, '2026-10-05T10:00'), ctx).next.id, 'ba_gac_trua')
  const u = stateAt(1, 5)
  const late = stallStatus(u, ni(u, '2026-10-05T22:00'), ctx)
  assert.deepEqual([late.next, late.tomorrow.id], [null, 'cho_som'])
  // chưa tới ngày game 3: chưa mở
  const early = stateAt(1, 2)
  const e = stallStatus(early, ni(early, '2026-10-05T12:00'), ctx)
  assert.equal(e.tooEarly, true)
  assert.equal(startStall(early, 'ba_gac_trua', ni(early, '2026-10-05T12:00'), ctx).reason, 'chua_toi_ngay')
})

test('phiên hàng: khóa khi giờ máy bị lùi; không nhận trong ca; ngoài khung giờ; 1 lượt mỗi khung mỗi ngày thật', () => {
  const ctx = makeCtx()
  const s = stateAt(2, 5)
  ni(s, '2026-10-05T19:00')
  const back = ni(s, '2026-10-05T12:00')
  assert.equal(back.rewind, true)
  assert.equal(stallStatus(s, back, ctx).locked, true)
  assert.equal(startStall(s, 'ba_gac_trua', back, ctx).reason, 'lui_gio')
  // ngoài khung giờ
  const t = stateAt(2, 5)
  assert.equal(startStall(t, 'cho_som', ni(t, '2026-10-05T12:00'), ctx).reason, 'ngoai_gio')
  // trong ca
  startShift(t, ctx)
  assert.equal(startStall(t, 'ba_gac_trua', ni(t, '2026-10-05T12:00'), ctx).reason, 'dang_ban')
  t.shift = null
  // lượt 1 → nhận; lượt 2 cùng khung → đã nhận; khung khác cùng ngày vẫn còn; ngày thật sau lại có
  const a = startStall(t, 'ba_gac_trua', ni(t, '2026-10-05T12:00'), ctx)
  assert.ok(a.ok && !a.resumed)
  assert.equal(t.rare.pendingStall.id, 'ba_gac_trua')
  // rời màn giữa chừng rồi quay lại: lựa tiếp đúng kệ cũ
  const again = startStall(t, 'ba_gac_trua', ni(t, '2026-10-05T12:30'), ctx)
  assert.ok(again.ok && again.resumed)
  assert.deepEqual(again.game.shelf, a.game.shelf, 'kệ tất định theo ngày thật và phiên')
  const done = finishStall(t, { score: 70, picked: a.game.goods, mistakes: 2 }, ni(t, '2026-10-05T12:30'), ctx)
  assert.ok(done.ok)
  assert.equal(t.rare.pendingStall, null)
  const noon = ni(t, '2026-10-05T12:40')
  assert.equal(stallStatus(t, noon, ctx).current.done, true)
  assert.equal(startStall(t, 'ba_gac_trua', noon, ctx).reason, 'da_nhan')
  // lượt dở vẫn lựa tiếp được khi khung giờ vừa tan (cùng ngày thật)
  assert.ok(startStall(t, 'ganh_toi', ni(t, '2026-10-05T20:55'), ctx).ok)
  const late = ni(t, '2026-10-05T21:05')
  assert.equal(stallStatus(t, late, ctx).current, null)
  assert.ok(startStall(t, 'ganh_toi', late, ctx).resumed)
  assert.ok(finishStall(t, { score: 100, picked: ['ca_phe_bmt', 'kho_muc'] }, late, ctx).ok)
  assert.deepEqual(t.rare.today.stalls, ['ba_gac_trua', 'ganh_toi'])
  const next = ni(t, '2026-10-06T12:00')
  assert.equal(stallStatus(t, next, ctx).current.done, false)
  assert.ok(startStall(t, 'ba_gac_trua', next, ctx).ok)
  // lượt lựa dở của hôm trước hết hạn
  assert.equal(finishStall(t, { score: 100 }, ni(t, '2026-10-07T12:00'), ctx).reason, 'het_han')
  assert.equal(t.rare.pendingStall, null)
})

test('phiên hàng: sản lượng theo điểm — luôn ≥ 1 phần, từ 90 điểm thêm 1 phần, từ 75 điểm 50% ra mảnh (có bảo hiểm); chọn nhầm → thẻ Kiểm hàng', () => {
  const ctx = makeCtx()
  const run = (seed, score, mistakes = 0) => {
    const s = withBases(stateAt(seed, 5))
    const n = ni(s, '2026-10-05T06:00')
    const a = startStall(s, 'cho_som', n, ctx)
    const r = finishStall(s, { score, picked: a.game.goods, mistakes }, n, ctx)
    return { s, r }
  }
  const low = run(1, 55, 3)
  assert.equal(low.r.got.reduce((x, g) => x + g.n, 0), 1, 'luôn được 1 phần')
  assert.equal(low.r.fragment, null)
  assert.equal(low.r.wrong, true)
  assert.equal(low.r.tipId, 'kiem_hang')
  assert.ok(low.s.tipsSeen.includes('kiem_hang'))
  const high = run(2, 100)
  assert.equal(high.r.got.reduce((x, g) => x + g.n, 0), 2, 'từ 90 điểm được 2 phần')
  assert.deepEqual(high.r.got.map(g => g.id).sort(), ['muoi_tom_tay_ninh', 'trung_ga_ta'], 'mỗi món 1 phần')
  assert.equal(high.r.tipId, null)
  const mid = run(3, 85, 1)
  assert.equal(mid.r.got.reduce((x, g) => x + g.n, 0), 1)
  // 75 điểm trở lên: khoảng 50% ra mảnh (bốc theo ngày thật + phiên, tải lại không đổi)
  let frag = 0
  const N = 400
  for (let seed = 1; seed <= N; seed++) if (run(seed, 80).r.fragment) frag++
  assert.ok(Math.abs(frag / N - 0.5) < 0.07, `tỉ lệ mảnh ${frag / N}`)
  // bảo hiểm mảnh: 3 lần liền không ra → lần sau chắc chắn
  const s = withBases(stateAt(9, 5))
  s.rare.pity.frag = 3
  const n = ni(s, '2026-10-05T06:00')
  const a = startStall(s, 'cho_som', n, ctx)
  const r = finishStall(s, { score: 76, picked: a.game.goods }, n, ctx)
  assert.ok(r.fragment, 'bảo hiểm mảnh')
  assert.equal(s.rare.pity.frag, 0)
})

// ---------- Kho, trần ngày ----------

test('kho: tối đa 6 phần mỗi loại, dư đổi 2 Muỗng Vàng mỗi phần; trần mỗi ngày thật 6 phần + 3 mảnh (hàng mua, thưởng thư không tính)', () => {
  const ctx = makeCtx()
  const s = withBases(stateAt(4, 5))
  s.rare.stock.kho_muc = 5
  const g = grantRare(s, 'kho_muc', 3, ctx, { dayKey: '2026-10-05' })
  assert.deepEqual([g.got, g.over, g.spoons, s.rare.stock.kho_muc, s.goldSpoons], [1, 2, 4, 6, 4])
  // trần ngày: đã nhận 1 phần hôm nay → còn 5
  for (const id of ['mat_ong_rung', 'trung_ga_ta']) grantRare(s, id, 2, ctx, { dayKey: '2026-10-05' })
  assert.equal(s.rare.today.got, 5)
  const over = grantRare(s, 'ca_phe_bmt', 3, ctx, { dayKey: '2026-10-05' })
  assert.deepEqual([over.got, over.spoons, s.rare.today.got], [1, 4, 6])
  // hàng tự bỏ tiền mua không tính trần ngày; phần thưởng cố định (thư, chuỗi) cũng không
  assert.equal(grantRare(s, 'ca_phe_bmt', 2, ctx, { dayKey: '2026-10-05', bought: true }).got, 2)
  const rw = grantReward(s, { rare: { muoi_tom_tay_ninh: 1 }, fragments: { tra_tac_mat_ong: 1 } }, ctx)
  assert.deepEqual(rw.rareGot.rare, [{ id: 'muoi_tom_tay_ninh', name: 'Muối tôm Tây Ninh', n: 1 }])
  assert.equal(s.rare.fragments.tra_tac_mat_ong, 1)
  assert.equal(s.rare.today.got, 6)
  // mảnh: 3 mảnh mỗi ngày thật, mảnh thứ 4 đổi Muỗng Vàng
  const spoons0 = s.goldSpoons
  const f = grantFragment(s, 4, ctx, { dayKey: '2026-10-05' })
  assert.equal(f.n, 3)
  assert.equal(s.goldSpoons - spoons0, 2)
  assert.equal(s.rare.today.frags, 3)
  // sang ngày thật mới: sổ mới
  assert.equal(grantRare(s, 'trung_ga_ta', 1, ctx, { dayKey: '2026-10-06' }).got, 1)
  assert.deepEqual([s.rare.today.key, s.rare.today.got, s.rare.today.frags], ['2026-10-06', 1, 0])
  // giờ máy lùi về ngày cũ: vẫn tính vào sổ của ngày đang có (không mở sổ cũ)
  grantRare(s, 'trung_ga_ta', 1, ctx, { dayKey: '2026-10-04' })
  assert.deepEqual([s.rare.today.key, s.rare.today.got], ['2026-10-06', 2])
})

// ---------- Giỏ chợ ----------

test('Giỏ chợ: 40% nguyên liệu / 60% mảnh trên 5.000 lượt; 2 lượt liền không ra nguyên liệu thì lượt 3 chắc chắn có; hết món nhận mảnh → 100% nguyên liệu', () => {
  const ctx = makeCtx()
  const s = withBases(stateAt(5, 5))
  const holder = { rng: 12345 }
  let ing = 0, free = 0, freeIng = 0, miss = 0, maxMiss = 0, ingRun = 0, maxIngRun = 0
  for (let k = 0; k < 5000; k++) {
    // làm trống kho và sổ ngày trước mỗi lượt (chỉ đo tỉ lệ, không để trần ngày/kho đầy chen vào)
    s.rare.stock = {}
    s.rare.fragments = {}
    s.rare.today = { key: '', got: 0, frags: 0, stalls: [], strangerDay: '' }
    const odds = basketOdds(s, ctx)
    const r = rollBasket(s, ctx, holder)
    // (soát lỗi M4: Giỏ chợ nay có cả bảo hiểm mảnh — lượt bảo hiểm mảnh không tính vào tỉ lệ 40/60)
    if (!odds.sure && !odds.fragSure) { free++; if (r.result === 'ing') freeIng++ }
    if (odds.fragSure) assert.equal(r.result, 'frag', 'bảo hiểm mảnh: chắc chắn ra mảnh')
    if (r.result === 'ing') { ing++; miss = 0; ingRun++; maxIngRun = Math.max(maxIngRun, ingRun) } else { miss++; maxMiss = Math.max(maxMiss, miss); ingRun = 0 }
  }
  assert.ok(Math.abs(freeIng / free - 0.4) < 0.025, `lượt không bảo hiểm: ${(freeIng / free).toFixed(3)}`)
  // có 2 bảo hiểm: tỉ lệ thực ra nguyên liệu = 1,56 / 3,16 ≈ 49% (chuỗi Markov: sau 2 lượt mảnh chắc chắn ra nguyên liệu,
  // sau 3 lượt nguyên liệu chắc chắn ra mảnh)
  assert.ok(Math.abs(ing / 5000 - 0.494) < 0.025, `tỉ lệ thực ${ing / 5000}`)
  assert.equal(maxMiss, 2, 'không bao giờ 3 lượt liền không ra nguyên liệu')
  assert.equal(maxIngRun, 3, 'không bao giờ 4 lượt liền không ra mảnh (bảo hiểm mảnh sau 3 lần)')
  // đủ mảnh / đã mở hết món → 100% nguyên liệu
  const t = ownRare(stateAt(6, 5))
  assert.equal(fragmentCandidates(t, ctx).length, 0)
  const odds = basketOdds(t, ctx)
  assert.deepEqual([odds.ingredient, odds.fragment, odds.allIng], [1, 0, true])
  for (let k = 0; k < 20; k++) assert.equal(rollBasket(t, ctx, holder).result, 'ing')
  // lượt Giỏ chợ rút cuối ca (sh.rareRolls) vào kho, ghi chú trong Tổng kết
  const u = withBases(stateAt(7, 5))
  const uc = makeCtx('2026-10-05T08:00')
  startShift(u, uc)
  u.shift.rareRolls = 3
  const notes = finishShiftRare(u, uc).filter(x => x.kind === 'gio_cho')
  assert.equal(notes.length, 3)
  assert.equal(finishShiftRare(u, uc).length, 0, 'chạy 1 lần mỗi ca')
})

// ---------- Khách lạ ----------

test('khách lạ: ca đầu mỗi ngày thật (từ ngày game 3), 1 lần mỗi ngày thật kể cả tải lại; không khi lùi giờ / không có giờ thật', () => {
  const ctx = makeCtx('2026-10-05T08:00')
  const s = stateAt(11, 3)
  startShift(s, ctx)
  const list = () => Object.values(s.shift.customers).filter(c => c.stranger)
  assert.equal(list().length, 1)
  const c = list()[0]
  const ids = Object.keys(s.shift.customers)
  assert.ok(ids.indexOf(c.id) >= 1, 'không phải khách đầu')
  assert.ok(!c.tutorial && !c.bigOrder && !c.regularId)
  assert.ok(DATA.STRANGERS.some(x => x.name === c.name && x.self === c.self))
  assert.equal(s.rare.today.strangerDay, '2026-10-05')
  // tải lại giữa ca: vẫn đúng 1 khách lạ (ca lưu nguyên), ca sau cùng ngày không có
  const back = migrate(decodeSave(encodeSave(s)), DATA)
  assert.equal(Object.values(back.shift.customers).filter(x => x.stranger).length, 1)
  playShift(s, ctx)
  ctx.clock.t = vn('2026-10-05T12:00')
  startShift(s, ctx)
  assert.equal(list().length, 0, 'ca thứ 2 trong ngày thật không có khách lạ')
  endShift(s, ctx)
  // ngày thật hôm sau lại có
  ctx.clock.t = vn('2026-10-06T08:00')
  startShift(s, ctx)
  assert.equal(list().length, 1)
  s.shift = null
  // trước ngày game 3 không có; không có giờ thật không có; giờ máy bị lùi không có
  const early = stateAt(12, 2)
  startShift(early, makeCtx('2026-10-05T08:00'))
  assert.equal(Object.values(early.shift.customers).filter(x => x.stranger).length, 0)
  const noClock = stateAt(13, 5)
  startShift(noClock, makeCtx())
  assert.equal(Object.values(noClock.shift.customers).filter(x => x.stranger).length, 0)
  const rw = stateAt(14, 5)
  rw.clock.maxSeen = vn('2026-10-08T08:00')
  startShift(rw, makeCtx('2026-10-05T08:00'))
  assert.equal(Object.values(rw.shift.customers).filter(x => x.stranger).length, 0)
})

test('khách lạ: quà theo sao — 5 sao 2 phần, 4 sao 1 phần, 3 sao 1 mảnh, dưới 3 sao chỉ cảm ơn; khách lạ gọi món bình thường', () => {
  assert.deepEqual(strangerGift(5, { data: DATA }), { minStars: 5, portions: 2 })
  assert.deepEqual(strangerGift(4, { data: DATA }), { minStars: 4, portions: 1 })
  assert.deepEqual(strangerGift(3, { data: DATA }), { minStars: 3, fragments: 1 })
  assert.equal(strangerGift(2, { data: DATA }), null)
  for (const [stars, portions, frag] of [[5, 2, 0], [4, 1, 0], [3, 0, 1], [2, 0, 0]]) {
    const ctx = makeCtx('2026-10-05T08:00')
    const s = withBases(stateAt(21, 5))
    startShift(s, ctx)
    const c = Object.values(s.shift.customers).find(x => x.stranger)
    const def = DATA.STRANGERS.find(x => x.id === c.stranger)
    for (const x of Object.values(s.shift.customers)) { if (x.status === 'den') x.status = 'bo_ve' }
    c.status = 'roi_di'
    c.stars = stars
    const notes = finishShiftRare(s, ctx).filter(x => x.kind === 'khach_la')
    assert.equal(notes.length, 1)
    assert.equal(rareStock(s, def.ing), portions, `${stars} sao`)
    assert.equal(Object.values(s.rare.fragments).reduce((a, b) => a + b, 0), frag, `${stars} sao: mảnh`)
  }
  // chơi trọn ca: khách lạ được phục vụ như khách thường, quà vào kho, Tổng kết có ghi chú
  const ctx = makeCtx('2026-10-05T08:00')
  const s = stateAt(22, 5)
  const res = playShift(s, ctx)
  const sn = res.summary.rareNotes.find(x => x.kind === 'khach_la')
  assert.ok(sn && sn.stars === 5)
  assert.equal(Object.values(s.rare.stock).reduce((a, b) => a + b, 0) >= 2, true)
  assert.ok(res.sheets.some(x => x.stranger), 'phiếu chấm ghi khách lạ')
  assert.ok(s.history[s.history.length - 1].rare.some(x => x.kind === 'khach_la'))
})

// ---------- Mở công thức hiếm ----------

test('mở món hiếm: đủ 3 mảnh + có món nền → nấu thử (không trừ kho, thử lại không giới hạn), đạt hạng Được là mở món', () => {
  const ctx = makeCtx()
  const s = stateAt(31, 5)
  assert.equal(canTaste(s, 'tra_tac_mat_ong', ctx).reason, 'chua_du_manh')
  assert.equal(canTaste(s, 'banh_trang_tron_tay_ninh', ctx).reason, 'thieu_mon_nen')
  s.rare.fragments.tra_tac_mat_ong = 3
  s.rare.stock.mat_ong_rung = 2
  assert.ok(canTaste(s, 'tra_tac_mat_ong', ctx).ok)
  const cookTasting = score => {
    assert.ok(startTasting(s, 'tra_tac_mat_ong', ctx).ok)
    const sb = tastingSandbox(s, ctx)
    startCook(sb.state, 'thu1', 0, sb.ctx)
    submitChon(sb.state, requiredIngredients(DATA.RECIPES.tra_tac_mat_ong, []).required, 0, sb.ctx)
    let av
    while ((av = availableSteps(sb.state)).length) submitStep(sb.state, av[0], { score }, sb.ctx)
    finishDish(sb.state, sb.ctx)
    return finishTasting(s, ctx)
  }
  const bad = cookTasting(20)
  assert.equal(bad.rare, true)
  assert.equal(bad.unlocked, false)
  assert.ok(!s.recipes.tra_tac_mat_ong)
  assert.equal(s.rare.fragments.tra_tac_mat_ong, 3, 'chưa đạt: giữ mảnh')
  assert.ok(canTaste(s, 'tra_tac_mat_ong', ctx).ok, 'thử lại không giới hạn')
  const good = cookTasting(100)
  assert.equal(good.unlocked, true)
  assert.ok(s.recipes.tra_tac_mat_ong)
  assert.equal(s.recipes.tra_tac_mat_ong.boughtDay, 0, 'không tính là món vừa mua')
  assert.equal(s.rare.fragments.tra_tac_mat_ong, undefined)
  assert.equal(rareStock(s, 'mat_ong_rung'), 2, 'nấu thử không trừ kho')
  assert.equal(s.wallet, 200000, 'nấu thử không tốn tiền')
  assert.ok(ctx.events.some(e => e.type === 'rare.unlocked'))
  assert.equal(canTaste(s, 'tra_tac_mat_ong', ctx).reason, 'da_co')
  // món hiếm không tính vào "3 công thức" lên chặng, không phải "món vừa mua"
  const cond = checkStageUp(s, ctx).conditions.find(c => c.kind === 'recipes')
  assert.equal(cond.current, 2)
  assert.equal(isRecentRecipe(s, 'tra_tac_mat_ong', 3), false)
  // Sổ công thức: món đã mở ở nhóm đang bán
  assert.equal(recipeBook(s, ctx).entries.find(e => e.id === 'tra_tac_mat_ong').status, 'owned')
})

// ---------- Khách gọi món hiếm ----------

test('đơn món hiếm không vượt tồn kho trên 40 hạt giống (chốt lúc mở ca); món hiếm được gọi nhiều hơn khi còn hàng', () => {
  let rareLines = 0
  for (let seed = 1; seed <= 40; seed++) {
    const ctx = makeCtx()
    const stock = { mat_ong_rung: seed % 3, trung_ga_ta: 1 + (seed % 2), kho_muc: 1, muoi_tom_tay_ninh: seed % 2, ca_phe_bmt: 2 }
    const s = ownRare(stateAt(seed, 8), RARE_RECIPES, stock)
    const menu = rareMenuFor(s, ctx)
    const sh = startShift(s, ctx)
    assert.deepEqual(sh.rareMenu, menu)
    const used = {}
    for (const c of Object.values(sh.customers)) {
      for (const l of c.request) {
        const r = DATA.RECIPES[l.recipeId]
        if (r.source !== 'hiem') continue
        rareLines++
        assert.ok(menu.includes(l.recipeId), `${seed}: món hiếm ngoài thực đơn ca`)
        for (const [id, n] of Object.entries(r.rare)) used[id] = (used[id] || 0) + n * l.qty
      }
    }
    for (const [id, n] of Object.entries(used)) assert.ok(n <= stock[id], `${seed}: ${id} ${n} > ${stock[id]}`)
    // thực đơn ở quầy không đổi giữa ca (chốt lúc mở ca)
    assert.deepEqual(orderableRecipes(s, ctx).filter(id => DATA.RECIPES[id].source === 'hiem').sort(), menu.slice().sort())
  }
  assert.ok(rareLines > 20, `món hiếm có được gọi (${rareLines} dòng)`)
  // hết hàng: không ai gọi; có hàng nhưng chưa có món: không ai gọi
  const ctx = makeCtx()
  const s = ownRare(stateAt(5, 8), RARE_RECIPES, {})
  assert.deepEqual(rareMenuFor(s, ctx), [])
  const t = withBases(stateAt(5, 8))
  t.rare.stock.mat_ong_rung = 6
  assert.ok(!orderableRecipes(t, ctx).includes('tra_tac_mat_ong'))
  // vòng tất định: dòng vượt tồn kho đổi về món nền
  const u = ownRare(stateAt(6, 8), ['tra_tac_mat_ong'], { mat_ong_rung: 2 })
  const list = [{ request: [{ recipeId: 'tra_tac_mat_ong', qty: 1, notes: [] }] }, { request: [{ recipeId: 'tra_tac_mat_ong', qty: 2, notes: ['khong_da'] }] },
    { request: [{ recipeId: 'tra_tac_mat_ong', qty: 1, notes: [] }] }]
  capRareRequests(u, list, ctx)
  assert.deepEqual(list.map(c => c.request[0].recipeId), ['tra_tac_mat_ong', 'tra_tac', 'tra_tac_mat_ong'])
  assert.deepEqual(list[1].request[0].notes, ['khong_da'])
})

test('quầy: "còn n" theo tồn kho trừ phiếu bếp và phiếu đang ghi; chốt order vượt tồn kho → het_hang_hiem', () => {
  const ctx = makeCtx()
  const s = ownRare(stateAt(41, 8), ['tra_tac_mat_ong'], { mat_ong_rung: 3 })
  startShift(s, ctx)
  assert.equal(rareLeft(s, 'tra_tac_mat_ong', ctx), 3)
  assert.equal(rareLeft(s, 'tra_tac', ctx), Infinity)
  const t = serveCounterWith(s, ctx, [{ recipeId: 'tra_tac_mat_ong', qty: 2 }])
  assert.ok(t)
  assert.equal(rareLeft(s, 'tra_tac_mat_ong', ctx), 1, 'phiếu bếp chưa ra món giữ chỗ')
  // khách kế tiếp: ghi 2 ly mà kho chỉ còn 1 → không chốt được
  let guard = 0
  while (!s.shift.counter && guard++ < 400) advance(s, 0.5, ctx)
  const c = s.shift.customers[s.shift.counter.customerId]
  c.request = [{ recipeId: 'tra_tac_mat_ong', qty: 2, notes: [] }]
  addLine(s, { recipeId: 'tra_tac_mat_ong', qty: 2, notes: [] })
  assert.equal(rareLeft(s, 'tra_tac_mat_ong', ctx), 0)
  assert.equal(rareLeft(s, 'tra_tac_mat_ong', ctx, { skipDraftIndex: 0 }), 1)
  readback(s, ctx)
  s.shift.counter.readbackDone = true
  assert.deepEqual(confirmOrder(s, ctx), { ok: false, reason: 'het_hang_hiem' })
})

test('tiêu hao lúc Ra món; bỏ món và làm lại bước không mất hàng; +1 danh tiếng mỗi phần món hiếm đạt Ngon', () => {
  const ctx = makeCtx()
  const s = ownRare(stateAt(51, 8), ['banh_mi_trung_ga_ta'], { trung_ga_ta: 3 })
  startShift(s, ctx)
  const t = serveCounterWith(s, ctx, [{ recipeId: 'banh_mi_trung_ga_ta', qty: 1 }])
  // bỏ món giữa chừng: kho không đổi
  const cook = startCook(s, t.id, 0, ctx)
  submitChon(s, requiredIngredients(DATA.RECIPES.banh_mi_trung_ga_ta, cook.notes).required, 0, ctx)
  abandonDish(s, ctx)
  assert.equal(rareStock(s, 'trung_ga_ta'), 3)
  // làm lại bước: kho không đổi; Ra món: trừ 1 phần
  cookLine(s, ctx, t, 0, { finish: false })
  const r = retryStep(s, 'chien_trung', ctx)
  assert.ok(r.ok)
  assert.equal(rareStock(s, 'trung_ga_ta'), 3)
  submitStep(s, 'chien_trung', { score: 100 }, ctx)
  const dish = finishDish(s, ctx)
  assert.deepEqual(dish.rareUsed, { trung_ga_ta: 1 })
  assert.equal(rareStock(s, 'trung_ga_ta'), 2)
  const sheet = serveTicket(s, t.id, ctx)
  assert.ok(sheet.final)
  // danh tiếng: sao + (món hiếm đạt Ngon) +1
  const base = DATA.BALANCE.reputationByStars[sheet.stars] + (sheet.dishes.some(d => d.flawless) ? 1 : 0)
  assert.equal(sheet.reputation, base + (['ngon', 'tuyet_hao'].includes(sheet.dishes[0].grade) ? 1 : 0))
  assert.ok(['ngon', 'tuyet_hao'].includes(sheet.dishes[0].grade))
})

test('phàn nàn món hiếm: kho không đủ → khóa "Làm lại" (chỉ hoàn tiền được); còn hàng thì làm lại được', () => {
  for (const [stock, ok] of [[1, false], [2, true]]) {
    const ctx = makeCtx()
    const s = ownRare(stateAt(61, 8), ['ca_phe_muoi'], { ca_phe_bmt: stock })
    startShift(s, ctx)
    const t = serveCounterWith(s, ctx, [{ recipeId: 'ca_phe_muoi', qty: 1 }])
    cookLine(s, ctx, t, 0, { score: 10 })
    const sheet = serveTicket(s, t.id, ctx)
    assert.equal(sheet.final, false, 'món hỏng → phàn nàn')
    assert.equal(complaintRemakeOk(s, sheet.customerId, ctx), ok)
    const res = resolveComplaint(JSON.parse(JSON.stringify(s)), sheet.customerId, { apologyIndex: 0, action: 'remake' }, ctx)
    if (ok) assert.ok(res.ok)
    else assert.deepEqual(res, { ok: false, reason: 'het_hang_hiem' })
    assert.ok(resolveComplaint(s, sheet.customerId, { apologyIndex: 0, action: 'refund' }, ctx).ok)
  }
})

test('"Khách đổi ý" không đổi sang món hiếm', () => {
  let checked = 0
  for (let seed = 1; seed <= 40; seed++) {
    const ctx = makeCtx()
    const s = ownRare(stateAt(seed, 9), RARE_RECIPES, { mat_ong_rung: 6, trung_ga_ta: 6, kho_muc: 6, muoi_tom_tay_ninh: 6, ca_phe_bmt: 6 })
    startShift(s, ctx)
    const sh = s.shift
    sh.incident = { id: 'doi_y', kind: 'chon', order: 1, afterClips: 1, status: 'cho', rng: (seed * 7919 + 13) >>> 0,
      cap: incidentLossCap(s, sh, ctx), gainCap: incidentGainCap(s, sh, ctx), guaranteed: true, detail: null, choice: null, result: null }
    sh.incidentQueue = []
    let guard = 0
    while (!sh.tickets.length && guard++ < 2000) { if (!counterStep(s, ctx)) advance(s, 0.5, ctx) }
    const view = openIncident(s, ctx)
    if (!view) continue
    checked++
    assert.notEqual(DATA.RECIPES[view.detail.toId].source, 'hiem', `${seed}: đổi sang ${view.detail.toId}`)
    assert.ok(resolveIncident(s, 'doi_mon', ctx).ok)
  }
  assert.ok(checked >= 20, `đã kiểm ${checked} lần`)
})

// ---------- Tình huống, thưởng, tổng quan, lưu ----------

test('tình huống trao hàng hiếm: quà tính trần ngày (dư đổi Muỗng Vàng), hàng mua của chị bán dạo không tính trần', () => {
  const ctx = makeCtx('2026-10-05T08:00')
  const s = ownRare(stateAt(71, 9), ['tra_tac_mat_ong'], {})
  startShift(s, ctx)
  s.rare.today = { key: s.shift.dayKey, got: 6, frags: 0, stalls: [], strangerDay: s.shift.dayKey }
  const sh = s.shift
  const force = id => {
    sh.incident = { id, kind: DATA.INCIDENTS[id].kind, order: 1, afterClips: 0, status: 'cho', rng: 777, cap: incidentLossCap(s, sh, ctx),
      gainCap: incidentGainCap(s, sh, ctx), guaranteed: true, detail: null, choice: null, result: null }
    sh.incidentQueue = []
    return openIncident(s, ctx)
  }
  // (soát lỗi M4, sửa có chủ ý) đã đủ mức hàng hiếm hôm nay: "Khách quê gửi quà" không bật (không hứa tặng hàng rồi đổi
  // thành Muỗng Vàng); "Khách quên ví" vẫn bật nhưng lựa chọn báo loa không hứa hàng hiếm
  assert.equal(force('khach_que_gui_qua'), null, 'đủ mức hôm nay: không bật tình huống gửi quà hàng hiếm')
  const vi = force('khach_quen_vi')
  assert.ok(vi)
  const loa = vi.choices.find(c => c.id === 'bao_loa')
  assert.doesNotMatch(loa.cost, /hàng hiếm/, 'không hứa tặng hàng hiếm khi đã đủ mức hôm nay')
  const rv = resolveIncident(s, 'bao_loa', ctx)
  assert.deepEqual([rv.effects.rare.length, Number(rv.effects.spoons) || 0], [0, 0])
  assert.doesNotMatch(rv.text, /phần|kho hàng hiếm/)
  // kho/mức hôm nay đầy SAU khi đã mở tình huống (hiếm gặp): quà đổi Muỗng Vàng, câu kết quả không nói "cất vào kho"
  s.rare.today.got = 5
  assert.ok(force('khach_que_gui_qua'))
  s.rare.today.got = 6
  const before = s.goldSpoons
  const r = resolveIncident(s, 'nhan', ctx)
  assert.deepEqual([r.effects.rare.length, r.effects.spoons, s.goldSpoons - before], [0, 2, 2], 'đủ mức hôm nay: đổi Muỗng Vàng')
  assert.doesNotMatch(r.text, /cất 1 phần|Kho hàng hiếm đã đủ/)
  assert.match(r.text, /Kho hoặc mức hôm nay đã đủ, quà đổi thành 2 Muỗng Vàng\./)
  assert.ok(force('nguoi_ban_dao'))
  const m = resolveIncident(s, 'mua_2', ctx)
  assert.equal(m.effects.rare.reduce((a, x) => a + x.n, 0), 2, 'hàng mua vẫn vào kho')
  assert.equal(s.rare.today.got, 6)
})

test('tổng quan kho cho màn Chuẩn bị; lưu/tải giữ nguyên kho; dữ liệu hỏng được làm sạch; save cũ nhận mặc định', () => {
  const ctx = makeCtx()
  const s = withBases(stateAt(81, 6))
  s.rare.stock.kho_muc = 2
  s.rare.fragments.banh_trang_tron_tay_ninh = 2
  const n = ni(s, '2026-10-05T12:00')
  const ov = rareOverview(s, n, ctx)
  assert.equal(ov.stock.length, 5)
  assert.equal(ov.stock.find(x => x.id === 'kho_muc').n, 2)
  assert.deepEqual(ov.fragments.find(f => f.recipeId === 'banh_trang_tron_tay_ninh') && [ov.fragments.find(f => f.recipeId === 'banh_trang_tron_tay_ninh').n, ov.fragments.find(f => f.recipeId === 'banh_trang_tron_tay_ninh').need], [2, 3])
  assert.equal(ov.basket.ingredient, 0.4)
  const a = startStall(s, 'ba_gac_trua', n, ctx)
  assert.ok(a.ok)
  const back = migrate(decodeSave(encodeSave(s)), DATA)
  assert.deepEqual(back.rare, s.rare)
  assert.equal(back.version, STATE_VERSION)
  // hỏng: id lạ bỏ, số kẹp, phiên lạ bỏ
  const bad = migrate({ seed: 1, version: 2, rare: { stock: { kho_muc: 99, trung_ga: 3, 'x y': 1 }, fragments: { ca_phe_muoi: 9, tra_tac: 2 },
    pity: { ing: -3, frag: 'a' }, today: { key: 'hôm nay', got: -1, stalls: ['cho_som', 'khong_co'] }, seen: ['kho_muc', 'banh_mi', 5],
    pendingStall: { id: 'khong_co', dayKey: '2026-10-05' } } }, DATA)
  assert.deepEqual(bad.rare, { stock: { kho_muc: 6 }, fragments: { ca_phe_muoi: 3 }, pity: { ing: 0, frag: 0 },
    today: { key: '', got: 0, frags: 0, stalls: ['cho_som'], strangerDay: '' }, seen: ['kho_muc'], pendingStall: null })
  // save v2 chưa có kho hàng hiếm
  const old = stateAt(82, 4)
  delete old.rare
  const v2 = migrate(decodeSave(encodeSave(old)), DATA)
  assert.deepEqual(v2.rare, { stock: {}, fragments: {}, pity: { ing: 0, frag: 0 }, today: { key: '', got: 0, frags: 0, stalls: [], strangerDay: '' }, seen: [], pendingStall: null })
  // ca dở từ bản cũ (chưa có sh.rareMenu): chơi tiếp được, không có món hiếm
  const ctx2 = makeCtx()
  const t = ownRare(stateAt(83, 6), ['tra_tac_mat_ong'], { mat_ong_rung: 2 })
  startShift(t, ctx2)
  delete t.shift.rareMenu
  delete t.shift.rareNotes
  assert.ok(!orderableRecipes(t, ctx2).includes('tra_tac_mat_ong'))
  const sum = endShift(t, ctx2)
  assert.ok(Array.isArray(sum.rareNotes))
})
