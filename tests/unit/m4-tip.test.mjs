// M4 bước 1 (docs/tham-khao/m4-thiet-ke.md mục A): tip một mức 5.000đ khi khách chấm 5 sao VÀ số tiền khách thực trả
// (kitchen.billOf) từ 20.000đ. Bỏ tip 10.000đ: món Không tì vết chỉ +1 danh tiếng như cũ, khách khó tính 5 sao
// +1 danh tiếng, chuỗi "Quầy chuẩn" 5 khách → 1 lượt Giỏ chợ mỗi ca (sh.rareRolls), Ngày lãnh lương → khách gọi thêm món.
// Bảng tip theo sao × hóa đơn × ảnh chuyển khoản giả × hoàn tiền × báo thiếu × Ngày lãnh lương; DATA thật.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState, DEFAULT_BALANCE } from '../../src/core/state.js'
import { startShift, advance, isShiftOver, endShift } from '../../src/core/shift.js'
import { addLine, readback, confirmOrder, priceOfLines, reportTotal, confirmQr, clipTicket } from '../../src/core/order.js'
import { billOf } from '../../src/core/kitchen.js'
import { tipFor } from '../../src/core/scoring.js'
import { counterStep, cookTicket, playShift } from '../helpers/perfect-player.mjs'

const R = DATA.RECIPES

function makeCtx(data = DATA) {
  const events = []
  return { data, events, emit: (type, payload) => events.push({ type, payload }) }
}

function stateAt(seed, day) {
  const s = defaultState(seed, DATA)
  s.shopName = 'Xe thử tip'
  s.day = day
  s.recipes.banh_trang_tron = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 }
  return s
}

// Mở ca, đặt yêu cầu của khách đầu tiên, phục vụ khách đó ở quầy (báo tổng `report`, mặc định đúng giá), nấu hoàn hảo,
// giao món. Trả phiếu chấm.
function serveFirst(s, ctx, request, { report = null, fake = false } = {}) {
  const sh = startShift(s, ctx)
  const k1 = sh.customers.k1
  k1.request = request.map(l => ({ ...l, notes: (l.notes || []).slice() }))
  k1.tutorial = false
  k1.strict = false
  if (fake) k1.forcePay = 'qr_fake'
  let guard = 0
  while (!sh.counter || sh.counter.customerId !== 'k1') { advance(s, 0.5, ctx); if (++guard > 2000) throw new Error('khách chưa tới') }
  for (const l of k1.request) addLine(s, l)
  assert.equal(readback(s, ctx).caught.length, 0)
  assert.ok(confirmOrder(s, ctx).ok)
  const total = priceOfLines(k1.request, R)
  const r = reportTotal(s, report ?? total, ctx)
  assert.ok(['dung', 'thieu'].includes(r.result), r.result)
  if (fake) {
    assert.equal(confirmQr(s, ctx).fake, true, 'nhận nhầm ảnh chuyển khoản giả')
    assert.ok(clipTicket(s, ctx).ok)
  } else {
    guard = 0
    while (sh.counter && sh.counter.customerId === 'k1') { if (!counterStep(s, ctx)) advance(s, 0.5, ctx); if (++guard > 2000) throw new Error('kẹt quầy') }
  }
  const t = sh.tickets.find(x => x.customerId === 'k1')
  return cookTicket(s, ctx, t)
}

test('tipFor: 5.000đ duy nhất khi 5 sao và hóa đơn từ 20.000đ', () => {
  const B = DATA.BALANCE
  assert.equal(B.tipFiveStar, 5000)
  assert.equal(B.tipMinBill, 20000)
  assert.equal(B.strictFiveStarRep, 1)
  assert.equal(B.tipBonus, undefined, 'bỏ tip 10.000đ')
  assert.equal(DEFAULT_BALANCE.tipBonus, undefined)
  const table = [
    [5, 20000, 5000], [5, 25000, 5000], [5, 150000, 5000], [5, 19500, 0], [5, 15000, 0], [5, 10000, 0], [5, 0, 0],
    [4, 20000, 0], [4, 50000, 0], [3, 30000, 0], [1, 30000, 0]
  ]
  for (const [stars, bill, tip] of table) assert.equal(tipFor(stars, bill, B), tip, `${stars} sao, hóa đơn ${bill}`)
})

test('billOf: số tiền khách thực trả (ảnh giả 0, phiếu thu − phần đã hoàn, chưa có phiếu thu thì giá niêm yết kèm phụ thu)', () => {
  // chưa có phiếu thu: giá niêm yết theo yêu cầu thật, gồm phụ thu ghi chú ("Thêm trứng" +5.000đ)
  assert.equal(billOf({ request: [{ recipeId: 'tra_tac', qty: 1, notes: [] }] }, R), 10000)
  assert.equal(billOf({ request: [{ recipeId: 'banh_mi_op_la', qty: 1, notes: ['them_trung'] }] }, R), 25000)
  assert.equal(billOf({ request: [{ recipeId: 'tra_tac', qty: 2, notes: [] }, { recipeId: 'ca_phe_sua_da', qty: 1, notes: [] }] }, R), 35000)
  // có phiếu thu: theo số đã thu (báo thiếu thì thấp hơn giá niêm yết), trừ phần đã hoàn
  const rc = { total: 18000, listTotal: 20000, lines: [] }
  assert.equal(billOf({ receipt: rc, payMethod: 'cash', request: [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }] }, R), 18000)
  assert.equal(billOf({ receipt: { total: 30000 }, refunded: 10000, payMethod: 'cash' }, R), 20000)
  assert.equal(billOf({ receipt: { total: 30000 }, refunded: 15000, payMethod: 'qr', fakeQr: false }, R), 15000)
  assert.equal(billOf({ receipt: { total: 30000 }, refunded: 40000 }, R), 0, 'không âm')
  // ảnh chuyển khoản giả: khách chưa trả gì
  assert.equal(billOf({ receipt: { total: 30000 }, payMethod: 'qr', fakeQr: true }, R), 0)
  assert.equal(billOf(null, R), 0)
})

test('phục vụ thật: 1 ly trà tắc 5 sao → tip 0; 2 ly hoặc bánh mì → 5.000đ; báo thiếu dưới 20.000đ → mất tip; ảnh giả → 0', () => {
  const cases = [
    { request: [{ recipeId: 'tra_tac', qty: 1 }], bill: 10000, tip: 0 },
    { request: [{ recipeId: 'ca_phe_sua_da', qty: 1 }], bill: 15000, tip: 0 },
    { request: [{ recipeId: 'tra_tac', qty: 2 }], bill: 20000, tip: 5000 },
    { request: [{ recipeId: 'banh_mi_op_la', qty: 1 }], bill: 20000, tip: 5000 },
    { request: [{ recipeId: 'banh_mi_op_la', qty: 1 }, { recipeId: 'tra_tac', qty: 1 }], bill: 30000, tip: 5000 },
    // báo tổng thiếu: khách trả theo số đã báo (lỗi quầy 0 sao) → hóa đơn thực trả 15.000đ, mất tip
    { request: [{ recipeId: 'banh_mi_op_la', qty: 1 }], report: 15000, bill: 15000, tip: 0 },
    // bán kèm món thứ hai thì báo thiếu nhẹ vẫn đủ ngưỡng
    { request: [{ recipeId: 'banh_mi_op_la', qty: 1 }, { recipeId: 'tra_tac', qty: 1 }], report: 25000, bill: 25000, tip: 5000 }
  ]
  for (const [i, c] of cases.entries()) {
    const ctx = makeCtx()
    const s = stateAt(40 + i, 3)
    const sheet = serveFirst(s, ctx, c.request, { report: c.report })
    assert.equal(sheet.final, true)
    assert.equal(sheet.stars, 5, `ca ${i}: phục vụ hoàn hảo`)
    assert.equal(sheet.bill, c.bill, `ca ${i}: hóa đơn`)
    assert.equal(sheet.tip, c.tip, `ca ${i}: tip`)
    assert.equal(s.shift.tipJar, c.tip)
    assert.equal(s.shift.ledger.tips, c.tip)
  }
  // nhận nhầm ảnh chuyển khoản giả (ngày 7): khách vẫn 5 sao nhưng chưa trả tiền thật → không có tip
  const ctx = makeCtx()
  const s = stateAt(9, 7)
  const sheet = serveFirst(s, ctx, [{ recipeId: 'banh_mi_op_la', qty: 1 }, { recipeId: 'tra_tac', qty: 1 }], { fake: true })
  assert.ok(sheet.counterErrors.includes('qr_gia'))
  assert.equal(sheet.bill, 0)
  assert.equal(sheet.tip, 0)
})

test('danh tiếng thay tip 10.000đ: Không tì vết +1 (như cũ), khách khó tính 5 sao +1; tip vẫn 5.000đ', () => {
  const ctx = makeCtx()
  const s = stateAt(21, 5)
  const sh = startShift(s, ctx)
  sh.customers.k1.strict = true
  sh.customers.k1.persona = 'kho_tinh'
  sh.customers.k1.tutorial = false
  sh.customers.k1.request = [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }]
  let guard = 0
  while (!(sh.receipts || []).length) { if (!counterStep(s, ctx)) advance(s, 0.5, ctx); if (++guard > 4000) throw new Error('kẹt') }
  const t = sh.tickets.find(x => x.customerId === 'k1')
  const sheet = cookTicket(s, ctx, t)
  assert.equal(sheet.stars, 5)
  assert.equal(sheet.tip, 5000)
  const flawless = sheet.dishes.some(d => d.flawless)
  assert.equal(sheet.reputation, 3 + (flawless ? 1 : 0) + DATA.BALANCE.strictFiveStarRep)
})

test('chuỗi Quầy chuẩn chạm 5 khách → 1 lượt Giỏ chợ mỗi ca (không cộng thêm khi chuỗi dài hơn); bật Hỗ trợ tính tiền → 0', () => {
  for (const assistCash of [false, true]) {
    const ctx = makeCtx()
    const s = stateAt(3, 9)
    s.settings.assistCash = assistCash
    const sh = startShift(s, ctx)
    // M4 bước 4 (sửa có chủ ý): ngày Chợ phiên có sẵn +1 lượt Giỏ chợ (mods.rareRolls); đếm riêng lượt theo chuỗi
    const ev = Number(sh.mods.rareRolls) || 0
    assert.equal(sh.rareRolls, ev)
    const seen = []
    let guard = 0
    while (!isShiftOver(s)) {
      if (++guard > 20000) throw new Error('ca không kết thúc')
      while (counterStep(s, ctx)) seen.push([sh.counterStreak, sh.rareRolls - ev])
      for (const t of sh.tickets.slice()) cookTicket(s, ctx, t)
      if (!isShiftOver(s)) advance(s, 0.5, ctx)
    }
    const maxStreak = Math.max(...seen.map(x => x[0]))
    if (assistCash) {
      assert.equal(maxStreak, 0)
      assert.equal(sh.rareRolls - ev, 0)
    } else {
      assert.ok(maxStreak >= 6, `chuỗi ${maxStreak}`)
      assert.equal(sh.rareRolls - ev, 1, 'tối đa 1 lượt theo chuỗi mỗi ca')
      for (const [streak, rolls] of seen) assert.equal(rolls, streak >= 5 ? 1 : 0)
    }
    const sum = endShift(s, ctx)
    assert.equal(sum.tips % 5000, 0, 'tổng tip là bội 5.000đ')
  }
  // ca dở từ bản cũ (chưa có rareRolls/streakRoll) vẫn đếm được
  const ctx = makeCtx()
  const s = stateAt(3, 9)
  const sh = startShift(s, ctx)
  delete sh.rareRolls
  delete sh.mods.rareRolls
  sh.counterStreak = 4
  let guard = 0
  while (!(sh.receipts || []).length) { if (!counterStep(s, ctx)) advance(s, 0.5, ctx); if (++guard > 4000) throw new Error('kẹt') }
  assert.equal(sh.counterStreak, 5)
  assert.equal(sh.rareRolls, 1)
})

test('Ngày lãnh lương không có ngoại lệ luật tip; mọi khách 5 sao có tip ⇔ hóa đơn từ 20.000đ (mô phỏng nhiều ca)', () => {
  const only = { ...DATA, DAY_EVENT_CONFIG: { ...DATA.DAY_EVENT_CONFIG, fromDay: 1, chance: 1 }, DAY_EVENTS: { lanh_luong: DATA.DAY_EVENTS.lanh_luong } }
  assert.equal(DATA.DAY_EVENTS.lanh_luong.effects.tipMul, undefined)
  assert.deepEqual([...DATA.DAY_EVENTS.lanh_luong.effects.lineCountWeights], [60, 32, 8])
  let five = 0, tipped = 0
  for (const [data, seeds] of [[only, [1, 2, 3]], [DATA, [4, 5, 6]]]) {
    for (const seed of seeds) {
      const ctx = makeCtx(data)
      const s = stateAt(seed, 3)
      for (let k = 0; k < 4; k++) {
        const r = playShift(s, ctx, { incident: v => v.safeId })
        assert.equal(r.walletAfter - r.walletBefore, r.summary.profit - r.summary.loanRepaid)
        let sumTips = 0
        for (const x of r.sheets.filter(Boolean)) {
          assert.ok(x.tip === 0 || x.tip === 5000, String(x.tip))
          assert.equal(x.tip, x.stars === 5 && x.bill >= 20000 ? 5000 : 0)
          if (x.stars === 5) { five++; if (x.tip) tipped++ }
          sumTips += x.tip
        }
        assert.equal(r.summary.tips, sumTips)
      }
    }
  }
  // người chơi hoàn hảo: phần lớn khách 5 sao có tip, nhưng không phải tất cả (đơn 1 món rẻ không có tip)
  assert.ok(five > 50)
  assert.ok(tipped / five > 0.4 && tipped / five < 0.98, `${tipped}/${five}`)
})
