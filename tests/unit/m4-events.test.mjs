// M4 bước 4 (docs/tham-khao/m4-thiet-ke.md mục B.1, B.2, F.5; tần suất "dày" theo quyết định của người dùng):
// tám sự kiện ngày mới chạy theo dữ liệu với các khóa hiệu ứng mới — fixedCostDelta (Tiền điện nước tăng), ingCostMul
// (Tắc lên giá, phần tăng có trần), noQrSpeaker (Cúp điện: Loa báo tiền tắt), queueMax / queueFine (Trật tự đô thị),
// bigOrder (Văn phòng đặt 3 ly), endCheck (Hội thi theo sao, Tài trợ theo số ly, Kiểm tra vệ sinh: nhắc nhở rồi mới
// phạt), rareRolls (Chợ phiên +1 lượt Giỏ chợ); finishShiftEvents chạy trước summarizeShift; tỉ lệ và bảo hiểm, cách
// quãng 7 ngày, mức Ít chỉ loại tốt; trần tiền mỗi sự kiện (gainCap, lossCap) và mỗi ngày thật; bất biến ví.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState, refIncomeFor } from '../../src/core/state.js'
import { startShift, endShift, advance, isShiftOver, loadFactor } from '../../src/core/shift.js'
import { dayEventSeries, rollDayEvent, dayEventInfo, setDayEventChoice, dayEventKind, finishShiftEvents } from '../../src/core/events.js'
import { incidentLossCap, incidentGainCap } from '../../src/core/incidents.js'
import { eventDayCaps } from '../../src/core/economy.js'
import { confirmQr, rejectQr } from '../../src/core/order.js'
import { startCook, submitChon } from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { encodeSave, decodeSave, migrate } from '../../src/core/save.js'
import { ICONS } from '../../src/ui/art.js'
import { playShift, counterStep, cookTicket } from '../helpers/perfect-player.mjs'
import { vn } from '../helpers/meta-helpers.mjs'

const NEW_EVENTS = ['hoi_thi_xe_sach', 'don_van_phong', 'tai_tro_dai_ly', 'tat_gia', 'tien_dien_nuoc', 'cup_dien',
  'trat_tu_do_thi', 'kiem_tra_attp']
const PENALTY = ['tat_gia', 'tien_dien_nuoc', 'cup_dien', 'trat_tu_do_thi', 'kiem_tra_attp']

function makeCtx(data = DATA, at = null) {
  const events = []
  const ctx = { data, events, emit: (type, payload) => events.push({ type, payload }) }
  if (at) { ctx.clock = { t: vn(at) }; ctx.now = () => ctx.clock.t }
  return ctx
}

function stateAt(seed, day, freq = 'vua') {
  const s = defaultState(seed, DATA)
  s.shopName = 'Xe thử sự kiện ngày'
  s.day = day
  s.settings.incidentFrequency = freq
  return s
}

// Dữ liệu chỉ có 1 sự kiện ngày, ngày nào cũng có (bỏ cách quãng; loại xấu vẫn không 2 ngày liền), không có tình huống.
function only(id) {
  return {
    ...DATA, INCIDENTS: undefined,
    DAY_EVENT_CONFIG: { ...DATA.DAY_EVENT_CONFIG, fromDay: 1, chance: 1, badFromDay: 1, cooldowns: [], noRepeat: false },
    DAY_EVENTS: { [id]: DATA.DAY_EVENTS[id] }
  }
}

// Ngày game đầu tiên (từ `from`) có sự kiện `id` với hạt giống `seed`.
function dayWith(ctx, seed, id, from = 9) {
  const s = stateAt(seed, 1)
  const days = dayEventSeries(s, from + 20, ctx)
  for (let d = from; d <= from + 20; d++) if (days[d] === id) return d
  throw new Error('không có ngày ' + id)
}

// Chơi hết ca như playShift nhưng dừng trước endShift (để chỉnh phiếu chấm rồi mới kết ca).
function playUntilOver(state, ctx, { score = 100 } = {}) {
  let guard = 0
  while (!isShiftOver(state)) {
    if (++guard > 20000) throw new Error('ca không kết thúc')
    while (counterStep(state, ctx)) { /* xử lý quầy */ }
    for (const t of state.shift.tickets.slice()) cookTicket(state, ctx, t, { score })
    if (!isShiftOver(state)) advance(state, 0.5, ctx)
  }
}

// ---------- Dữ liệu ----------

test('dữ liệu: 12 sự kiện ngày, trọng số 100 (tốt 58 / chọn, xấu 42), loại, ngày mở, icon, lời Dì Sáu; mọi sự kiện có cách không bị phạt', () => {
  const E = DATA.DAY_EVENTS
  assert.deepEqual(Object.keys(E).sort(), ['cho_phien', 'lanh_luong', 'nang_nong', 'troi_mua', ...NEW_EVENTS].sort())
  const w = Object.values(E).reduce((a, e) => a + e.w, 0)
  assert.equal(w, 100)
  const good = Object.values(E).filter(e => dayEventKind(e) === 'tot').reduce((a, e) => a + e.w, 0)
  assert.equal(good, 58)
  assert.deepEqual([E.troi_mua.w, E.nang_nong.w, E.lanh_luong.w, E.cho_phien.w], [13, 13, 10, 10])
  const expect = {
    hoi_thi_xe_sach: ['tot', 4, 9], don_van_phong: ['tot', 4, 9], tai_tro_dai_ly: ['tot', 6, 7], tat_gia: ['xau', 5, 6],
    tien_dien_nuoc: ['xau', 5, 5], cup_dien: ['chon', 5, 6], trat_tu_do_thi: ['xau', 5, 6], kiem_tra_attp: ['chon', 6, 6]
  }
  for (const [id, [kind, from, weight]] of Object.entries(expect)) assert.deepEqual([E[id].kind, E[id].fromDay, E[id].w], [kind, from, weight], id)
  // loại có phạt đều không phải loại tốt (mức Ít bỏ hết)
  for (const id of PENALTY) assert.notEqual(dayEventKind(E[id]), 'tot', id)
  for (const e of Object.values(E)) {
    assert.ok(ICONS[e.icon], `thiếu icon ${e.icon}`)
    assert.ok(ICONS[e.icon].includes('viewBox="0 0 64 64"'))
    assert.ok(DATA.DIALOGUE.diSau.dayEvent[e.id] && DATA.DIALOGUE.diSau.dayEvent[e.id].length >= 1, `thiếu lời Dì Sáu ${e.id}`)
    assert.ok(/[à-ỹ]/i.test(e.desc) && /[à-ỹ]/i.test(e.name), e.id)
    // sự kiện có phạt (queueFine, hygiene) luôn có lựa chọn an toàn không phạt
    const eff = e.effects || {}
    if (eff.queueFine || (eff.endCheck && eff.endCheck.fine)) {
      assert.ok(e.choice && e.choice.safe, `${e.id}: cần lựa chọn an toàn`)
      const ce = e.choice.effects || {}
      assert.ok(!ce.queueFine && !(ce.endCheck && ce.endCheck.fine && !ce.endCheck.sure), `${e.id}: lựa chọn an toàn không được có phạt`)
    }
    // tiền: thưởng bội 1.000đ, phạt/chi bội 500đ
    for (const src of [eff, (e.choice && e.choice.effects) || {}]) {
      for (const t of (src.endCheck && src.endCheck.tiers) || []) assert.equal((t.money || 0) % 1000, 0)
      if (src.endCheck && src.endCheck.fine) assert.equal(src.endCheck.fine % 500, 0)
      if (src.queueFine) assert.equal(src.queueFine.fine % 500, 0)
      if (src.bigOrder) assert.equal(src.bigOrder.bonus % 1000, 0)
      if (src.fixedCostDelta) assert.equal(src.fixedCostDelta % 500, 0)
    }
    if (e.choice) assert.equal((e.choice.cost || 0) % 500, 0)
  }
  // Chợ phiên +1 lượt Giỏ chợ; Ngày lãnh lương không nhân tip
  assert.equal(E.cho_phien.effects.rareRolls, 1)
  assert.equal(E.lanh_luong.effects.tipMul, undefined)
})

// ---------- Tần suất (dữ liệu thật) ----------

test('tần suất với dữ liệu thật: khoảng 74%, bảo hiểm 1 ngày, không trùng hôm trước, loại xấu từ ngày 5 và không 2 ngày liền, Trật tự đô thị/Kiểm tra ATTP cách ≥ 7 ngày, mức Ít chỉ loại tốt', () => {
  const ctx = makeCtx()
  const E = DATA.DAY_EVENTS
  const seen = new Set()
  for (const freq of ['nhieu', 'vua', 'it']) {
    let hit = 0, total = 0
    for (let seed = 1; seed <= 40; seed++) {
      const s = stateAt(seed, 1, freq)
      const days = dayEventSeries(s, 120, ctx)
      let lastGroup = -Infinity
      for (let d = 3; d <= 120; d++) {
        const id = days[d]
        total++
        if (!id) { assert.ok(d === 3 || days[d - 1], `${freq} seed ${seed} ngày ${d}: 2 ngày liền trống`); continue }
        hit++
        seen.add(id)
        const e = E[id]
        assert.ok(d >= e.fromDay, `${id} trước ngày ${e.fromDay}`)
        assert.notEqual(id, days[d - 1], 'trùng hôm trước')
        if (freq === 'it') {
          assert.equal(dayEventKind(e), 'tot', `mức Ít: ${id}`)
          assert.ok(!PENALTY.includes(id))
        }
        if (e.kind === 'xau') {
          assert.ok(d >= 5)
          assert.ok(!days[d - 1] || E[days[d - 1]].kind !== 'xau', `${freq} seed ${seed} ngày ${d}: 2 ngày xấu liền`)
        }
        if (id === 'trat_tu_do_thi' || id === 'kiem_tra_attp') {
          assert.ok(d - lastGroup >= 7, `${freq} seed ${seed} ngày ${d}: kiểm tra cách ${d - lastGroup} ngày`)
          lastGroup = d
        }
      }
    }
    const rate = hit / total
    assert.ok(rate >= 0.70 && rate <= 0.78, `${freq}: ${rate.toFixed(3)}`)
  }
  for (const id of Object.keys(E)) assert.ok(seen.has(id), `${id} không bao giờ xuất hiện`)
})

// ---------- Từng khóa hiệu ứng ----------

test('fixedCostDelta (Tiền điện nước tăng): chi phí cố định ca +5.000đ, ghi chú Tổng kết; bất biến ví', () => {
  const ctx = makeCtx(only('tien_dien_nuoc'))
  const day = dayWith(ctx, 5, 'tien_dien_nuoc')
  const s = stateAt(5, day)
  const r = playShift(s, ctx)
  assert.equal(r.summary.fixedCost, 25000)
  assert.equal(r.walletAfter - r.walletBefore, r.summary.profit - r.summary.loanRepaid)
  const note = r.summary.eventNotes.find(n => n.id === 'tien_dien_nuoc')
  assert.ok(note && /Chi phí cố định \+5\.000đ/.test(note.fx), JSON.stringify(note))
  assert.equal(note.money, 0)
  assert.equal(r.summary.eventOut, 0, 'khoản này nằm ở dòng Chi phí cố định, không tính 2 lần')
  // ngày thường: 20.000đ
  const plain = playShift(stateAt(5, day), makeCtx({ ...DATA, DAY_EVENTS: null, INCIDENTS: undefined }))
  assert.equal(plain.summary.fixedCost, 20000)
})

test('ingCostMul (Tắc lên giá): mỗi ly Trà tắc thêm 1.200đ giá vốn (làm tròn 500đ), tổng phần tăng ≤ trần thiệt hại; Phiếu Chợ Sớm giảm cả phần tăng', () => {
  const ctx = makeCtx(only('tat_gia'))
  const plainCtx = makeCtx({ ...DATA, DAY_EVENTS: null, INCIDENTS: undefined })
  const day = dayWith(ctx, 8, 'tat_gia')
  // một ly trà tắc: giá vốn 3.000đ → 4.000đ (3.000 + 1.200 = 4.200, làm tròn 500đ)
  const cogsOf = (c, coupon = false, capLoss = null) => {
    const s = stateAt(8, day)
    if (coupon) { s.items.phieu_cho_som = 1; s.prep = { day, coupon: true, dayEventChoice: null } }
    const sh = startShift(s, c)
    if (capLoss !== null) sh.eventCap.loss = capLoss
    sh.tickets.push({ id: 'pt', no: '#900', customerId: 'k1', lines: [{ recipeId: 'tra_tac', qty: 2, notes: [] }], createdAt: 0, status: 'cho', done: [null] })
    startCook(s, 'pt', 0, c)
    const R = DATA.RECIPES.tra_tac
    const r = submitChon(s, requiredIngredients(R, []).required, 0, c)
    assert.ok(r.ok)
    return { cogs: sh.ledger.cogs, extra: sh.eventCostExtra || 0 }
  }
  const base = cogsOf(plainCtx)
  const hi = cogsOf(ctx)
  assert.equal(base.cogs, 6000)
  assert.equal(hi.cogs, 8500, '2 ly: 6.000 + 2.400 → 8.500đ')
  assert.equal(hi.extra, 2500)
  // Phiếu Chợ Sớm ×0,8 áp cả phần tăng: 8.400 × 0,8 = 6.720 → 6.500đ
  const cp = cogsOf(ctx, true)
  assert.equal(cp.cogs, 6500)
  assert.equal(cp.extra, 1500)
  // trần: phần tăng cả ca không quá sh.eventCap.loss
  const capped = cogsOf(ctx, false, 1000)
  assert.equal(capped.extra, 1000)
  assert.equal(capped.cogs, 7000)
  // chơi cả ca: phần tăng ≤ lossCap của ca, ghi chú Tổng kết, bất biến ví
  const s = stateAt(8, day)
  s.recipes.banh_trang_tron = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 }
  const r = playShift(s, ctx)
  const sh = s.history[s.history.length - 1]
  assert.ok(sh)
  assert.equal(r.walletAfter - r.walletBefore, r.summary.profit - r.summary.loanRepaid)
  const note = r.summary.eventNotes.find(n => n.id === 'tat_gia')
  if (note) assert.ok(/Giá vốn \+/.test(note.fx))
  assert.equal(r.summary.cogs % 500, 0)
})

test('noQrSpeaker (Cúp điện): Loa báo tiền tắt → không tự xác nhận QR, không chặn ảnh giả; khách ×0,85, món có đá ít được gọi; Mua đá cây 10.000đ', () => {
  const ctx = makeCtx(only('cup_dien'))
  const plainCtx = makeCtx({ ...DATA, DAY_EVENTS: null, INCIDENTS: undefined })
  const day = dayWith(ctx, 4, 'cup_dien')
  const info = dayEventInfo(stateAt(4, day), day, ctx)
  assert.equal(info.kind, 'chon')
  assert.equal(info.choice.cost, 10000)
  // khách ×0,85; món có đá (Trà tắc…) được gọi ×0,5
  let traEv = 0, allEv = 0, traP = 0, allP = 0
  for (let seed = 1; seed <= 120; seed++) {
    const d = dayWith(ctx, seed, 'cup_dien')
    const a = stateAt(seed, d), b = stateAt(seed, d)
    const sa = startShift(a, ctx), sb = startShift(b, plainCtx)
    assert.equal(sa.plan.length, Math.max(3, Math.round(sb.plan.length * 0.85)))
    assert.equal(sa.mods.noQrSpeaker, true)
    for (const c of Object.values(sa.customers)) if (c.request.length === 1) { allEv++; if (c.request[0].recipeId === 'tra_tac') traEv++ }
    for (const c of Object.values(sb.customers)) if (c.request.length === 1) { allP++; if (c.request[0].recipeId === 'tra_tac') traP++ }
  }
  assert.ok(traEv / allEv < (traP / allP) * 0.8, `${(traEv / allEv).toFixed(3)} vs ${(traP / allP).toFixed(3)}`)
  // Loa báo tiền tắt: QR về nhưng không tự xác nhận; ảnh giả xác nhận được (mất tiền) — như chưa có loa
  const qrRun = c => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = stateAt(seed, dayWith(c === plainCtx ? ctx : c, seed, 'cup_dien'))
      s.upgrades.loa_bao_tien = true
      const sh = startShift(s, c)
      let guard = 0
      while (!isShiftOver(s) && guard++ < 4000) {
        const k = sh.counter
        if (k && k.stage === 'tinh_tien' && k.payMethod === 'qr' && !k.fakeQr) {
          while (!k.qrArrived && guard++ < 4000) advance(s, 0.5, c)
          return { paid: k.paid }
        }
        if (!counterStep(s, c)) {
          for (const t of sh.tickets.slice()) cookTicket(s, c, t)
          advance(s, 0.5, c)
        }
      }
    }
    throw new Error('không gặp khách QR')
  }
  assert.equal(qrRun(ctx).paid, false, 'cúp điện: loa tắt, người chơi phải tự xác nhận')
  assert.equal(qrRun(plainCtx).paid, true, 'ngày thường: loa tự xác nhận')
  // ảnh giả + loa tắt: xác nhận được (không bị chặn)
  const s = stateAt(4, day)
  s.upgrades.loa_bao_tien = true
  startShift(s, ctx)
  const sh = s.shift
  sh.counter = { customerId: 'k1', stage: 'tinh_tien', payMethod: 'qr', fakeQr: true, paid: false, amountDue: 10000, qrArriveAt: null, qrArrived: false }
  sh.customers.k1.status = 'tinh_tien'
  const r = confirmQr(s, ctx)
  assert.equal(r.ok, true)
  assert.equal(r.blocked, false)
  assert.equal(sh.ledger.fakeQrLoss, 10000)
  rejectQr(s, ctx)
  // Mua đá cây: trừ 10.000đ lúc mở ca (không tính vào lãi ca), khách như thường, loa vẫn tắt
  const t = stateAt(4, day)
  assert.ok(setDayEventChoice(t, 'mua_da_cay', ctx).ok)
  const w = t.wallet
  const sht = startShift(t, ctx)
  assert.equal(w - t.wallet, 10000)
  assert.equal(sht.mods.prepCost, 10000)
  assert.equal(sht.walletStart, t.wallet)
  assert.equal(sht.mods.customerMul, 1)
  assert.equal(sht.mods.noQrSpeaker, true)
  assert.deepEqual(sht.mods.recipeWeight, {})
})

test('queueFine (Trật tự đô thị): hàng chờ chạm 3 người → phạt 1 lần (trần min(20.000đ, lossCap) và trần ngày), nhắc trước ở 2 người; Thu gọn chỗ đứng (queueMax 2) không bị phạt', () => {
  const ctx = makeCtx(only('trat_tu_do_thi'), '2026-10-06T08:00')
  const day = dayWith(ctx, 6, 'trat_tu_do_thi')
  // để hàng dồn: không phục vụ, chỉ cho thời gian trôi
  const s = stateAt(6, day)
  const sh = startShift(s, ctx)
  const w0 = s.wallet
  const cap = incidentLossCap(s, sh, ctx)
  assert.equal(sh.eventCap.loss, cap)
  let guard = 0
  while (sh.queue.length < 3 && guard++ < 4000) advance(s, 0.5, ctx)
  assert.equal(sh.queue.length, 3)
  const warns = ctx.events.filter(e => e.type === 'event.warn')
  assert.equal(warns.length, 1)
  assert.match(warns[0].payload.text, /2 người/)
  const fines = ctx.events.filter(e => e.type === 'event.fined')
  assert.equal(fines.length, 1)
  const fine = Math.min(20000, cap)
  assert.equal(fines[0].payload.amount, fine)
  assert.equal(fines[0].payload.name, DATA.DAY_EVENTS.trat_tu_do_thi.name)
  assert.equal(s.wallet, w0 - fine, 'phạt trừ ví ngay')
  assert.equal(sh.ledger.eventOut, fine)
  assert.ok(s.tipsSeen.includes('giu_loi_di'), 'mở thẻ Giữ lối đi')
  // phạt đúng 1 lần dù hàng còn dài
  for (let i = 0; i < 200; i++) advance(s, 0.5, ctx)
  assert.equal(ctx.events.filter(e => e.type === 'event.fined').length, 1)
  playUntilOver(s, ctx)
  const w1 = sh.walletStart
  const sum = endShift(s, ctx)
  assert.equal(sum.eventOut, fine)
  assert.equal(s.wallet - w1, sum.profit - sum.loanRepaid)
  // Thu gọn chỗ đứng: tối đa 2 người, khách thứ 3 đi ngang, không phạt
  const c2 = makeCtx(only('trat_tu_do_thi'))
  const t = stateAt(6, day)
  assert.ok(setDayEventChoice(t, 'thu_gon', c2).ok)
  const sh2 = startShift(t, c2)
  assert.equal(sh2.mods.queueMax, 2)
  assert.equal(sh2.mods.queueFine, null)
  // cả ca kéo tới cùng lúc: 2 người đứng chờ, người thứ 3 trở đi đi ngang
  for (const p of sh2.plan) p.arriveAt = 3
  let maxQ = 0
  for (let i = 0; i < 20; i++) { advance(t, 0.5, c2); maxQ = Math.max(maxQ, sh2.queue.length) }
  assert.equal(maxQ, 2)
  assert.equal(sh2.eventMissed, sh2.plan.length - 2)
  assert.equal(sh2.missed, sh2.plan.length - 2)
  assert.ok(t.tipsSeen.includes('giu_loi_di'), 'mở thẻ Giữ lối đi')
  assert.equal(c2.events.filter(e => e.type === 'event.fined').length, 0)
  playUntilOver(t, c2)
  const sum2 = endShift(t, c2)
  assert.equal(sum2.eventOut, 0)
  assert.ok(sum2.eventNotes.some(n => n.id === 'trat_tu_do_thi' && /khách đi ngang/.test(n.fx)))
})

test('bigOrder (Văn phòng đặt 3 ly): nhận đơn thì thêm 1 khách lấy 3 ly Trà tắc giữa ca, giao đạt từ 4 sao +5.000đ; không nhận thì như thường; ρ ≤ 0,9', () => {
  const ctx = makeCtx(only('don_van_phong'))
  const plainCtx = makeCtx({ ...DATA, DAY_EVENTS: null, INCIDENTS: undefined })
  for (let seed = 1; seed <= 40; seed++) {
    const day = dayWith(ctx, seed, 'don_van_phong', 4)
    const a = stateAt(seed, day), b = stateAt(seed, day)
    assert.ok(setDayEventChoice(a, 'nhan_don', ctx).ok)
    const w = a.wallet
    const sa = startShift(a, ctx)
    assert.equal(a.wallet, w, 'nhận đơn không tốn tiền')
    const sb = startShift(b, plainCtx)
    assert.equal(sa.plan.length, sb.plan.length + 1)
    const list = Object.values(sa.customers)
    const order = list.filter(c => c.bigOrder)
    assert.equal(order.length, 1)
    assert.deepEqual(order[0].request, [{ recipeId: 'tra_tac', qty: 3, notes: [] }])
    assert.notEqual(order[0].id, 'k1', 'không phải khách đầu')
    assert.deepEqual(Object.keys(sa.customers), list.map((c, i) => 'k' + (i + 1)))
    assert.deepEqual(sa.plan.map(p => p.customerId), Object.keys(sa.customers))
    assert.ok(loadFactor(sa) <= 0.9 + 1e-9)
    // không nhận đơn: không thêm khách
    const c = stateAt(seed, day)
    assert.equal(startShift(c, ctx).plan.length, sb.plan.length)
  }
  // chơi giỏi: khách văn phòng 5 sao → +5.000đ tiền đúng hẹn
  const day = dayWith(ctx, 3, 'don_van_phong', 5)
  const s = stateAt(3, day)
  setDayEventChoice(s, 'nhan_don', ctx)
  const r = playShift(s, ctx)
  assert.equal(r.summary.eventIn, 5000)
  assert.ok(r.summary.eventNotes.some(n => n.id === 'don_van_phong' && n.money === 5000))
  assert.equal(r.walletAfter - r.walletBefore, r.summary.profit - r.summary.loanRepaid)
  // chơi ẩu (món kém, dưới 4 sao): không có tiền đúng hẹn, ghi rõ lý do
  const u = stateAt(3, day)
  setDayEventChoice(u, 'nhan_don', ctx)
  const ru = playShift(u, ctx, { score: 30 })
  assert.equal(ru.summary.eventIn, 0)
  assert.ok(ru.summary.eventNotes.some(n => n.id === 'don_van_phong' && n.money === 0 && /tiền đúng hẹn/.test(n.fx + n.text)))
})

test('endCheck stars (Hội thi xe sạch): sao trung bình ≥ 4,5 → Giải Nhất +20.000đ +5 danh tiếng (trần gainCap), ≥ 4 → Khuyến khích; thấp hơn không có giải', () => {
  const ctx = makeCtx(only('hoi_thi_xe_sach'))
  const day = dayWith(ctx, 2, 'hoi_thi_xe_sach')
  const s = stateAt(2, day)
  const sh = startShift(s, ctx)
  const gainCap = incidentGainCap(s, sh, ctx)
  assert.equal(sh.eventCap.gain, gainCap)
  s.shift = null
  const r = playShift(stateAt(2, day), ctx)
  assert.ok(r.summary.avgStars >= 4.5)
  assert.equal(r.summary.eventIn, Math.min(20000, gainCap))
  const note = r.summary.eventNotes.find(n => n.id === 'hoi_thi_xe_sach')
  assert.match(note.text, /Giải Nhất/)
  assert.equal(note.fx, '+5 danh tiếng')
  const plain = playShift(stateAt(2, day), makeCtx({ ...DATA, DAY_EVENTS: null, INCIDENTS: undefined }))
  assert.equal(r.summary.reputationGain - plain.summary.reputationGain, 5)
  // chơi ẩu: không có giải
  const bad = playShift(stateAt(2, day), ctx, { score: 30 })
  assert.ok(bad.summary.avgStars < 4)
  assert.equal(bad.summary.eventIn, 0)
  assert.ok(bad.summary.eventNotes.some(n => n.id === 'hoi_thi_xe_sach' && n.fx === 'Chưa có giải'))
  // mức Khuyến khích: sao trung bình từ 4 tới dưới 4,5
  const k = stateAt(2, day)
  startShift(k, ctx)
  playUntilOver(k, ctx)
  for (const x of k.shift.scoreSheets) x.stars = 4
  const got = finishShiftEvents(k, ctx)
  assert.equal(got[0].money, Math.min(10000, gainCap))
  assert.match(got[0].text, /Khuyến khích/)
  assert.deepEqual(finishShiftEvents(k, ctx), [], 'chỉ chấm 1 lần mỗi ca')
})

test('endCheck portions (Đại lý trà tài trợ): nhận tài trợ → bán từ 3 ly Trà tắc +15.000đ, ít hơn +5.000đ; không nhận → không có gì', () => {
  const ctx = makeCtx(only('tai_tro_dai_ly'))
  for (let seed = 1; seed <= 12; seed++) {
    const day = dayWith(ctx, seed, 'tai_tro_dai_ly', 6)
    const s = stateAt(seed, day)
    assert.ok(setDayEventChoice(s, 'nhan_tai_tro', ctx).ok)
    const probe = stateAt(seed, day)
    const gainCap = incidentGainCap(probe, startShift(probe, ctx), ctx)
    const r = playShift(s, ctx)
    const n = r.sheets.flatMap(x => x.dishes).filter(d => d.recipeId === 'tra_tac').reduce((a, d) => a + d.qty, 0)
    // tiền của sự kiện ngày kẹp theo trần tiền thưởng của ca (gainCap)
    assert.equal(r.summary.eventIn, Math.min(n >= 3 ? 15000 : 5000, gainCap), `seed ${seed}: ${n} ly`)
    const note = r.summary.eventNotes.find(x => x.id === 'tai_tro_dai_ly')
    assert.match(note.text, new RegExp(`bán ${n} ly`))
    // không nhận tài trợ
    const t = stateAt(seed, day)
    assert.equal(playShift(t, ctx).summary.eventIn, 0)
  }
  // bán ít hơn 3 ly (chỉ còn 2 ly trà tắc trên phiếu chấm): vẫn được 5.000đ; món Hỏng không tính
  const day = dayWith(ctx, 4, 'tai_tro_dai_ly', 6)
  const u = stateAt(4, day)
  setDayEventChoice(u, 'nhan_tai_tro', ctx)
  startShift(u, ctx)
  playUntilOver(u, ctx)
  let keep = 2
  for (const x of u.shift.scoreSheets) {
    for (const d of x.dishes) {
      if (d.recipeId !== 'tra_tac') continue
      if (keep > 0) { d.qty = 1; keep-- } else d.grade = 'hong'
    }
  }
  const got = finishShiftEvents(u, ctx)
  assert.equal(got[0].money, 5000)
  assert.match(got[0].text, /bán 2 ly/)
})

test('endCheck hygiene (Kiểm tra vệ sinh ATTP): bếp sạch +3 danh tiếng; có lỗi lần đầu nhắc nhở, tái phạm trong 14 ngày bị phạt; Chuẩn bị đón đoàn 10.000đ chắc chắn đạt +5', () => {
  const ctx = makeCtx(only('kiem_tra_attp'), '2026-10-06T08:00')
  const plainCtx = makeCtx({ ...DATA, DAY_EVENTS: null, INCIDENTS: undefined })
  const day = dayWith(ctx, 7, 'kiem_tra_attp')
  // bếp sạch
  const r = playShift(stateAt(7, day), ctx)
  const p = playShift(stateAt(7, day), plainCtx)
  assert.equal(r.summary.reputationGain - p.summary.reputationGain, 3)
  assert.ok(r.summary.eventNotes.some(n => n.id === 'kiem_tra_attp' && n.fx === '+3 danh tiếng'))
  // có lỗi (chưa sơ chế): lần đầu nhắc nhở, không mất tiền
  const dirty = (s, c) => {
    startShift(s, c)
    playUntilOver(s, c)
    const x = s.shift.scoreSheets.find(y => y.final)
    x.kitchenErrors = [...(x.kitchenErrors || []), 'chua_so_che']
    return endShift(s, c)
  }
  const s = stateAt(7, day)
  const s1 = dirty(s, ctx)
  assert.equal(s1.eventOut, 0)
  assert.equal(s.incidents.warn.kiem_tra_attp, day)
  const warnNote = s1.eventNotes.find(n => n.id === 'kiem_tra_attp')
  assert.equal(warnNote.fx, 'Nhắc nhở lần đầu')
  assert.match(warnNote.text, /chưa sơ chế/)
  // lưu/tải giữ lần nhắc nhở
  const back = migrate(decodeSave(encodeSave(s)), DATA)
  assert.deepEqual(back.incidents.warn, { kiem_tra_attp: day })
  // tái phạm trong 14 ngày: phạt min(20.000đ, lossCap), xóa nhắc nhở
  s.day = day + 7
  const w0 = s.wallet
  startShift(s, ctx)
  const cap = s.shift.eventCap.loss
  s.shift = null
  s.wallet = w0
  const s2 = dirty(s, ctx)
  assert.equal(s2.eventOut, Math.min(20000, cap))
  assert.equal(s.incidents.warn.kiem_tra_attp, undefined)
  assert.ok(ctx.events.some(e => e.type === 'event.fined' && e.payload.id === 'kiem_tra_attp'))
  // quá 14 ngày sau lần nhắc: chỉ nhắc nhở lại
  const q = stateAt(7, day)
  q.incidents.warn = { kiem_tra_attp: day - 15 }
  const s3 = dirty(q, ctx)
  assert.equal(s3.eventOut, 0)
  assert.equal(q.incidents.warn.kiem_tra_attp, day)
  // Chuẩn bị đón đoàn: 10.000đ lúc mở ca, chắc chắn đạt +5 dù có lỗi
  const t = stateAt(7, day)
  t.incidents.warn = { kiem_tra_attp: day - 3 }
  assert.ok(setDayEventChoice(t, 'chuan_bi', ctx).ok)
  const w = t.wallet
  startShift(t, ctx)
  assert.equal(w - t.wallet, 10000)
  assert.equal(t.shift.mods.prepCost, 10000)
  playUntilOver(t, ctx)
  t.shift.scoreSheets[0].kitchenErrors = ['chua_so_che']
  const rep0 = t.shift.reputationGain
  const s4 = endShift(t, ctx)
  assert.equal(s4.eventOut, 0)
  assert.equal(s4.reputationGain - rep0, 5)
})

test('rareRolls: Chợ phiên +1 lượt Giỏ chợ cuối ca (sh.rareRolls); ngày thường 0', () => {
  const ctx = makeCtx(only('cho_phien'))
  const s = stateAt(3, 9)
  assert.equal(startShift(s, ctx).rareRolls, 1)
  const t = stateAt(3, 9)
  assert.equal(startShift(t, makeCtx({ ...DATA, DAY_EVENTS: null })).rareRolls, 0)
})

// ---------- Trần tiền ----------

test('trần: tiền thưởng sự kiện ngày ≤ gainCap của ca và ≤ trần ngày thật (Dì Sáu ghi công bằng lời khen phần dư); phạt ≤ trần ngày (Dì Sáu đỡ giùm)', () => {
  const ctx = makeCtx(only('hoi_thi_xe_sach'), '2026-10-07T08:00')
  const day = dayWith(ctx, 2, 'hoi_thi_xe_sach')
  // gainCap nhỏ: giải bị kẹp theo trần của ca
  const s = stateAt(2, day)
  startShift(s, ctx)
  s.shift.eventCap.gain = 7000
  playUntilOver(s, ctx)
  const sum = endShift(s, ctx)
  assert.equal(sum.eventIn, 7000)
  assert.ok(sum.eventNotes.some(n => n.capped === 13000))
  // trần ngày thật đã gần đủ: chỉ nhận phần còn lại
  const t = stateAt(2, day)
  const caps = eventDayCaps(ctx, day)
  t.incidents.day = { key: '2026-10-07', loss: 0, gain: caps.gain - 4000 }
  startShift(t, ctx)
  playUntilOver(t, ctx)
  const st = endShift(t, ctx)
  assert.equal(st.eventIn, 4000)
  assert.equal(t.incidents.day.gain, caps.gain)
  assert.ok(st.eventNotes.some(n => /lời khen/.test(n.text)))
  // phạt: trần ngày thật gần đủ → Dì Sáu đỡ giùm phần vượt
  const c2 = makeCtx(only('trat_tu_do_thi'), '2026-10-07T08:00')
  const d2 = dayWith(c2, 6, 'trat_tu_do_thi')
  const u = stateAt(6, d2)
  u.incidents.day = { key: '2026-10-07', loss: refIncomeFor(c2, d2) - 5000, gain: 0 }
  const sh = startShift(u, c2)
  let guard = 0
  while (sh.queue.length < 3 && guard++ < 4000) advance(u, 0.5, c2)
  const f = c2.events.find(e => e.type === 'event.fined')
  assert.equal(f.payload.amount, 5000)
  assert.ok(f.payload.spared > 0)
  assert.match(f.payload.text, /Dì Sáu đỡ giùm/)
})

test('mức Ít không có sự kiện phạt; dự báo "Ngày mai" khớp sự kiện thật khi mở ca; lưu/tải ca dở giữ các khóa hiệu ứng mới', () => {
  const ctx = makeCtx(DATA, '2026-10-05T08:00')
  for (let seed = 1; seed <= 20; seed++) {
    const s = stateAt(seed, 3, 'it')
    const days = dayEventSeries(s, 80, ctx)
    for (let d = 3; d <= 80; d++) if (days[d]) assert.ok(!PENALTY.includes(days[d]) && days[d] !== 'troi_mua', `mức Ít: ${days[d]}`)
  }
  // ca dở có mods mới: lưu/tải nguyên vẹn
  let saved = 0
  for (let seed = 1; seed <= 60 && saved < 3; seed++) {
    for (let d = 5; d <= 20; d++) {
      const s = stateAt(seed, d)
      const id = rollDayEvent(s, d, ctx)
      if (!['don_van_phong', 'trat_tu_do_thi', 'kiem_tra_attp', 'tat_gia'].includes(id)) continue
      const info = dayEventInfo(s, d, ctx)
      if (info.choice && info.choice.cost === 0) setDayEventChoice(s, info.choice.id, ctx)
      startShift(s, ctx)
      const back = migrate(decodeSave(encodeSave(s)), DATA)
      assert.deepEqual(back.shift, JSON.parse(JSON.stringify(s.shift)))
      assert.equal(back.shift.mods.dayEvent.id, id)
      saved++
      break
    }
  }
  assert.ok(saved >= 3)
  // ca dở từ bản cũ (mods chưa có khóa mới) vẫn chơi hết và tổng kết đúng
  const old = stateAt(9, 9)
  const sh = startShift(old, makeCtx())
  for (const k of ['fixedCostDelta', 'ingCostMul', 'noQrSpeaker', 'queueMax', 'queueFine', 'bigOrder', 'endCheck', 'rareRolls']) delete sh.mods[k]
  delete sh.eventCap
  delete sh.eventCostExtra
  delete sh.eventMissed
  playUntilOver(old, makeCtx())
  const sum = endShift(old, makeCtx())
  assert.ok(Number.isFinite(sum.profit))
})
