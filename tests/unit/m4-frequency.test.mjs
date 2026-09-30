// M4 bước 2–3 (docs/tham-khao/m4-thiet-ke.md mục B.1, D; tần suất "dày" theo quyết định của người dùng):
// - Sự kiện ngày: chance 0,65 + bảo hiểm 1 ngày → tỉ lệ thực khoảng 74% (0,70–0,78 trên ≥ 2.000 ngày mô phỏng, nhiều
//   hạt giống); không 2 ngày trống liền; không trùng loại hôm trước; nhóm Trật tự đô thị / Kiểm tra ATTP cách nhau ≥ 7
//   ngày game; loại xấu từ ngày 5, không 2 ngày xấu liền; mức Ít chỉ loại tốt; bốc tuần tự tất định ("Ngày mai" đúng).
// - Tình huống trong ca: tối đa 2 mỗi ca; tỉ lệ ca có ≥ 1 tình huống ở mức Vừa 0,55–0,65, Nhiều ≥ 0,75, Ít 0,30–0,45;
//   lần 2 chỉ khi ca từ 6 khách, cách lần 1 ít nhất 2 khách; không 2 loại xấu trong cùng ca, không 2 tình huống xấu liền
//   nhau; mức Ít không có loại xấu; lỗ nặng → lần sau nhẹ nhàng; ngày có sự kiện xấu → không tình huống xấu; gainCap.
// - Sổ tiền sự kiện: ledger.eventIn / eventOut, trần mỗi sự kiện và mỗi ngày thật, bất biến ví.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState, refIncomeFor } from '../../src/core/state.js'
import { startShift, endShift, advance } from '../../src/core/shift.js'
import { rollDayEvent, dayEventSeries, dayEventInfo, dayEventKind } from '../../src/core/events.js'
import {
  shiftIncidents, incidentKind, incidentCandidates, incidentLossCap, incidentGainCap, incidentGuaranteeAfter,
  ensureIncidents, activeIncident, incidentDue
} from '../../src/core/incidents.js'
import { eventMoneyIn, eventMoneyOut, eventDayCaps, eventDayBook } from '../../src/core/economy.js'
import { encodeSave, decodeSave, migrate } from '../../src/core/save.js'
import { playShift, counterStep, cookTicket } from '../helpers/perfect-player.mjs'
import { vn } from '../helpers/meta-helpers.mjs'

const DAY_MS = 24 * 3600 * 1000

function makeCtx(data = DATA, at = null) {
  const events = []
  const ctx = { data, events, emit: (type, payload) => events.push({ type, payload }) }
  if (at) { ctx.clock = { t: vn(at) }; ctx.now = () => ctx.clock.t }
  return ctx
}

function stateAt(seed, day, freq = 'vua') {
  const s = defaultState(seed, DATA)
  s.shopName = 'Xe thử tần suất'
  s.day = day
  s.settings.incidentFrequency = freq
  return s
}

// ---------- Sự kiện ngày ----------

test('sự kiện ngày: tỉ lệ thực 0,70–0,78 trên ≥ 2.000 ngày (nhiều hạt giống, cả 3 mức); không 2 ngày trống liền; không trùng hôm trước', () => {
  const ctx = makeCtx()
  const C = DATA.DAY_EVENT_CONFIG
  assert.equal(C.chance, 0.65)
  assert.equal(C.guaranteeAfter, 1)
  for (const freq of ['nhieu', 'vua', 'it']) {
    let hit = 0, total = 0
    for (let seed = 1; seed <= 10; seed++) {
      const s = stateAt(seed, 1, freq)
      const days = dayEventSeries(s, 252, ctx)
      assert.equal(days[1], undefined)
      assert.equal(days[2], undefined)
      for (let d = 3; d <= 252; d++) {
        const id = days[d]
        total++
        if (id) {
          hit++
          assert.ok(DATA.DAY_EVENTS[id])
          assert.notEqual(id, days[d - 1], `seed ${seed} ngày ${d}: trùng loại hôm trước`)
          if (freq === 'it') assert.equal(dayEventKind(DATA.DAY_EVENTS[id]), 'tot', 'mức Ít chỉ loại tốt')
        } else {
          assert.ok(d === 3 || days[d - 1], `seed ${seed} ngày ${d}: 2 ngày liền không có sự kiện`)
        }
      }
    }
    assert.ok(total >= 2000)
    const rate = hit / total
    assert.ok(rate >= 0.70 && rate <= 0.78, `${freq}: tỉ lệ thực ${rate.toFixed(3)}`)
  }
  // mọi sự kiện ngày có loại
  for (const e of Object.values(DATA.DAY_EVENTS)) assert.ok(['tot', 'chon', 'xau'].includes(e.kind), e.id)
})

test('sự kiện ngày bốc tuần tự tất định: rollDayEvent khớp chuỗi, không phụ thuộc thứ tự hỏi; "Ngày mai" đúng ngày thật sự diễn ra', () => {
  const ctx = makeCtx()
  for (const seed of [3, 42, 777]) {
    const s = stateAt(seed, 1)
    const days = dayEventSeries(s, 80, ctx)
    const order = [80, 3, 41, 17, 4, 60, 5, 79, 33]
    for (const d of order) assert.equal(rollDayEvent(s, d, ctx), days[d] || null)
    // chuỗi ngắn hơn là tiền tố của chuỗi dài hơn
    const short = dayEventSeries(s, 30, ctx)
    for (let d = 3; d <= 30; d++) assert.equal(short[d], days[d])
  }
  // chơi thật: dự báo sau ca (Tổng kết "Ngày mai: …") = sự kiện thật sự áp khi mở ca kế (sh.mods.dayEvent)
  let events = 0
  for (const seed of [5, 11]) {
    const s = stateAt(seed, 1)
    const c = makeCtx(DATA, '2026-10-05T08:00')
    const applied = []
    const emit = c.emit
    c.emit = (type, payload) => { if (type === 'shift.started') applied.push(s.shift.mods.dayEvent ? s.shift.mods.dayEvent.id : null); emit(type, payload) }
    for (let k = 0; k < 10; k++) {
      const forecast = dayEventInfo(s, s.day, c)
      playShift(s, c, { incident: v => v.safeId })
      assert.equal(applied[k], forecast ? forecast.id : null, `seed ${seed} ngày ${k + 1}`)
      if (forecast) events++
      c.clock.t += 3 * 3600 * 1000
    }
  }
  assert.ok(events >= 8)
})

// Dữ liệu thử: thêm sự kiện loại xấu và nhóm cách quãng (các sự kiện thật M4 bước 4 chưa có).
const FAKE_DAY = {
  ...DATA,
  DAY_EVENTS: {
    nang_nong: DATA.DAY_EVENTS.nang_nong,
    troi_mua: DATA.DAY_EVENTS.troi_mua,
    trat_tu_do_thi: { id: 'trat_tu_do_thi', name: 'Thử 1', icon: 'troi_mua', kind: 'xau', w: 30, fromDay: 3, desc: 'thử', effects: {} },
    kiem_tra_attp: { id: 'kiem_tra_attp', name: 'Thử 2', icon: 'troi_mua', kind: 'chon', w: 30, fromDay: 3, desc: 'thử', effects: {} },
    xau_khac: { id: 'xau_khac', name: 'Thử 3', icon: 'troi_mua', kind: 'xau', w: 25, fromDay: 3, desc: 'thử', effects: {} }
  }
}

test('sự kiện ngày: loại xấu từ ngày 5, không 2 ngày xấu liền; nhóm Trật tự đô thị / Kiểm tra ATTP cách nhau ≥ 7 ngày; mức Ít chỉ loại tốt', () => {
  const ctx = makeCtx(FAKE_DAY)
  let groupHits = 0, bad = 0
  for (let seed = 1; seed <= 30; seed++) {
    for (const freq of ['vua', 'it']) {
      const s = stateAt(seed, 1, freq)
      const days = dayEventSeries(s, 200, ctx)
      let lastGroup = -Infinity
      for (let d = 3; d <= 200; d++) {
        const id = days[d]
        if (!id) continue
        const kind = FAKE_DAY.DAY_EVENTS[id].kind
        if (freq === 'it') { assert.equal(kind, 'tot', `mức Ít: ${id}`); continue }
        if (kind === 'xau') {
          bad++
          assert.ok(d >= 5, `ngày ${d}: loại xấu trước ngày 5`)
          const prev = days[d - 1]
          assert.ok(!prev || FAKE_DAY.DAY_EVENTS[prev].kind !== 'xau', `seed ${seed} ngày ${d}: 2 ngày xấu liền`)
        }
        if (id === 'trat_tu_do_thi' || id === 'kiem_tra_attp') {
          groupHits++
          assert.ok(d - lastGroup >= 7, `seed ${seed} ngày ${d}: nhóm kiểm tra cách ${d - lastGroup} ngày`)
          lastGroup = d
        }
      }
    }
  }
  assert.ok(groupHits > 100 && bad > 100, `${groupHits} lần nhóm kiểm tra, ${bad} ngày xấu`)
})

// ---------- Tình huống trong ca ----------

// Dữ liệu thử: 3 tình huống M3, 2 cái gắn nhãn loại xấu (kiểm luật loại xấu trên bộ nhỏ, dễ đọc).
// M4 bước 5 (sửa có chủ ý): dữ liệu thật nay có 11 tình huống (gồm loại xấu thật) nên bộ thử chỉ giữ 3 tình huống M3;
// luật nhịp với dữ liệu thật ở tests/unit/m4-incidents.test.mjs.
const XDATA = {
  ...DATA,
  INCIDENTS: {
    khach_mo_hang: DATA.INCIDENTS.khach_mo_hang,
    ghi_no: { ...DATA.INCIDENTS.ghi_no, kind: 'xau' },
    doi_y: { ...DATA.INCIDENTS.doi_y, kind: 'xau' }
  }
}
const M3DATA = { ...DATA, INCIDENTS: { khach_mo_hang: DATA.INCIDENTS.khach_mo_hang, ghi_no: DATA.INCIDENTS.ghi_no, doi_y: DATA.INCIDENTS.doi_y } }

// Mô phỏng nhiều ca liên tiếp (mỗi ca một ngày game mới, luồng ngẫu nhiên độc lập): bốc kế hoạch ở startShift rồi coi
// như người chơi xử lý mọi tình huống đã bốc (giống resolveIncident: đặt lại bảo hiểm, ghi loại gần nhất).
function simulateShifts(data, freq, seeds, perSeed, onShift = null) {
  const ctx = makeCtx(data)
  let withAny = 0, total = 0
  const seq = []
  for (const seed of seeds) {
    const s = stateAt(seed, 3, freq)
    const S = ensureIncidents(s)
    for (let k = 0; k < perSeed; k++) {
      s.day = 3 + k
      const sh = startShift(s, ctx)
      const list = shiftIncidents(sh)
      total++
      if (onShift) onShift(sh, list, s)
      if (list.length) {
        withAny++
        S.since = 0
        for (const x of list) { S.recent.push(x.id); seq.push({ seed, day: sh.day, kind: x.kind }) }
        if (S.recent.length > 10) S.recent.splice(0, S.recent.length - 10)
        S.lastKind = list[list.length - 1].kind
        S.lastLoss = 0
      } else S.since += 1
      s.shift = null
    }
  }
  return { rate: withAny / total, total, seq }
}

test('tình huống: tỉ lệ ca có ≥ 1 tình huống — Vừa 0,55–0,65, Nhiều ≥ 0,75, Ít 0,30–0,45; tối đa 2 mỗi ca; lần 2 đúng luật', () => {
  const seeds = [1, 2, 3, 4]
  const res = {}
  for (const freq of ['nhieu', 'vua', 'it']) {
    let two = 0
    res[freq] = simulateShifts(DATA, freq, seeds, 520, (sh, list) => {
      assert.ok(list.length <= (freq === 'it' ? 1 : 2), `${freq}: ${list.length} tình huống trong ca`)
      if (list.length === 2) {
        two++
        const n = Object.keys(sh.customers).length
        assert.ok(n >= 6, 'lần 2 chỉ khi ca từ 6 khách')
        assert.ok(list[1].afterClips >= list[0].afterClips + 2 && list[1].afterClips <= n - 1, 'cách nhau ≥ 2 khách, trước khách cuối')
        assert.notEqual(list[0].id, list[1].id)
        assert.notEqual(list[1].id, 'khach_mo_hang', 'tình huống đầu ca chỉ có thể là lần 1')
        assert.ok(!(list[0].kind === 'xau' && list[1].kind === 'xau'))
      }
      for (const x of list) assert.ok(['tot', 'chon', 'xau'].includes(x.kind))
      if (freq === 'it') for (const x of list) assert.equal(x.kind, 'tot', 'mức Ít chỉ loại tốt')
    })
    assert.ok(res[freq].total >= 2000)
    if (freq !== 'it') assert.ok(two > 100, `${freq}: ${two} ca có 2 tình huống`)
  }
  assert.ok(res.vua.rate >= 0.55 && res.vua.rate <= 0.65, `Vừa ${res.vua.rate.toFixed(3)}`)
  assert.ok(res.nhieu.rate >= 0.75, `Nhiều ${res.nhieu.rate.toFixed(3)}`)
  assert.ok(res.it.rate >= 0.30 && res.it.rate <= 0.45, `Ít ${res.it.rate.toFixed(3)}`)
  // bảo hiểm theo mức
  const probe = stateAt(1, 5)
  for (const [freq, n] of [['nhieu', 1], ['vua', 2], ['it', 3]]) {
    probe.settings.incidentFrequency = freq
    assert.equal(incidentGuaranteeAfter(probe, makeCtx()), n)
  }
})

test('tình huống loại xấu: không 2 xấu trong ca, không 2 xấu liền nhau, không trước ngày 5, mức Ít không có; lỗ nặng/ngày xấu → nhẹ nhàng', () => {
  for (const freq of ['nhieu', 'vua', 'it']) {
    const { seq } = simulateShifts(XDATA, freq, [7, 8], 400, (sh, list) => {
      assert.ok(list.filter(x => x.kind === 'xau').length <= 1, 'không 2 loại xấu trong cùng ca')
      for (const x of list) if (x.kind === 'xau') assert.ok(sh.day >= 5, 'loại xấu từ ngày 5')
      if (freq === 'it') for (const x of list) assert.notEqual(x.kind, 'xau')
    })
    if (freq === 'it') { assert.ok(seq.every(x => x.kind === 'tot')); continue }
    let bads = 0
    for (let i = 1; i < seq.length; i++) {
      if (seq[i].seed !== seq[i - 1].seed) continue
      if (seq[i].kind === 'xau') bads++
      assert.ok(!(seq[i].kind === 'xau' && seq[i - 1].kind === 'xau'), `${freq}: 2 tình huống xấu liền nhau (ngày ${seq[i].day})`)
    }
    assert.ok(bads > 50, `${freq}: có đủ tình huống xấu để kiểm (${bads})`)
  }
  // luật nhịp trực tiếp trên danh sách ứng viên
  const ctx = makeCtx(XDATA)
  const s = stateAt(12, 9)
  const sh = startShift(s, ctx)
  const ids = () => incidentCandidates(s, sh, ctx).map(d => d.id).sort()
  assert.deepEqual(ids(), ['doi_y', 'ghi_no', 'khach_mo_hang'])
  s.incidents.lastKind = 'xau'
  assert.deepEqual(ids(), ['khach_mo_hang'], 'tình huống trước xấu → không xấu nữa')
  s.incidents.lastKind = 'chon'
  s.incidents.lastLoss = 0.6
  assert.deepEqual(ids(), ['khach_mo_hang'], 'lỗ ≥ 50% trần → chỉ loại tốt hoặc chọn không phạt')
  s.incidents.lastLoss = 0.2
  // loại chọn có phạt bị bỏ khi đang "nhẹ nhàng"
  const fineData = { ...M3DATA, INCIDENTS: { ...M3DATA.INCIDENTS, ghi_no: { ...DATA.INCIDENTS.ghi_no, maxFine: 5000 } } }
  const c2 = makeCtx(fineData)
  s.incidents.lastLoss = 0.5
  assert.deepEqual(incidentCandidates(s, sh, c2).map(d => d.id).sort(), ['doi_y', 'khach_mo_hang'])
  s.incidents.lastLoss = 0
  // ngày có sự kiện ngày loại xấu → không bốc tình huống xấu
  const badDay = { ...XDATA, DAY_EVENTS: { ...DATA.DAY_EVENTS, cho_phien: { ...DATA.DAY_EVENTS.cho_phien, kind: 'xau' } } }
  sh.mods.dayEvent = { id: 'cho_phien', choice: null }
  assert.deepEqual(incidentCandidates(s, sh, makeCtx(badDay)).map(d => d.id), ['khach_mo_hang'])
  sh.mods.dayEvent = null
  // trần tiền thưởng: loại có thể thưởng vượt gainCap bị bỏ
  const gain = incidentGainCap(s, sh, ctx)
  assert.equal(gain % 1000, 0)
  assert.ok(gain > 0 && gain <= 0.75 * refIncomeFor(ctx, 9))
  const bigGain = { ...M3DATA, INCIDENTS: { ...M3DATA.INCIDENTS, khach_mo_hang: { ...DATA.INCIDENTS.khach_mo_hang, maxGain: gain + 1000 } } }
  assert.ok(!incidentCandidates(s, sh, makeCtx(bigGain)).some(d => d.id === 'khach_mo_hang'))
  // trước ngày 5 không có loại xấu
  const early = stateAt(12, 4)
  const sh4 = startShift(early, ctx)
  assert.deepEqual(incidentCandidates(early, sh4, ctx).map(d => d.id), ['khach_mo_hang'])
})

test('chơi thật mức Nhiều: tối đa 2 tình huống mỗi ca, lần 2 chỉ bật sau lần 1 và cách ít nhất 2 khách; tổng kết, lịch sử, ví khớp', () => {
  let twice = 0
  for (const seed of [2, 6, 25, 31]) {
    const ctx = makeCtx(DATA, '2026-10-05T08:00')
    const s = stateAt(seed, 5, 'nhieu')
    // số khách đã xong khâu quầy lúc xử lý từng tình huống
    let at = []
    const emit = ctx.emit
    ctx.emit = (type, payload) => {
      if (type === 'incident.resolved') at.push((s.shift.receipts || []).length)
      if (type === 'shift.started') at = []
      emit(type, payload)
    }
    for (let k = 0; k < 8; k++) {
      const r = playShift(s, ctx, { incident: v => v.safeId })
      assert.ok(r.incidents.length <= 2)
      assert.equal(at.length, r.incidents.length)
      assert.equal(r.summary.incidents.length, r.incidents.length)
      assert.equal(s.history[s.history.length - 1].incidents.length, r.incidents.length)
      assert.equal(r.walletAfter - r.walletBefore, r.summary.profit - r.summary.loanRepaid)
      if (r.incidents.length === 2) {
        twice++
        assert.ok(at[1] - at[0] >= 2, `seed ${seed} ngày ${r.summary.day}: 2 tình huống cách ${at[1] - at[0]} khách`)
        assert.notEqual(r.incidents[0].view.id, r.incidents[1].view.id)
      }
      if (r.incidents.length) assert.equal(s.incidents.since, 0)
      ctx.clock.t += 3 * 3600 * 1000
    }
  }
  assert.ok(twice >= 3, `chỉ ${twice} ca có 2 tình huống`)
  // tình huống đầu ca (mở hàng) bị lỡ (không ở tab Quầy lúc mở ca) thì tình huống thứ hai vẫn bật được
  {
    const c = makeCtx(DATA)
    let tested = false
    for (let seed = 1; seed <= 200 && !tested; seed++) {
      const s = stateAt(seed, 9, 'nhieu')
      s.incidents.since = 5
      const sh = startShift(s, c)
      const list = shiftIncidents(sh)
      if (list.length !== 2 || list[0].id !== 'khach_mo_hang') continue
      assert.equal(list[0].opening, true)
      let guard = 0
      while ((sh.receipts || []).length < list[1].afterClips || sh.counter) {
        if (++guard > 20000) throw new Error('kẹt')
        if (counterStep(s, c)) continue
        for (const t of sh.tickets.slice()) cookTicket(s, c, t)
        advance(s, 0.5, c)
      }
      assert.equal(activeIncident(sh), list[1], 'bỏ qua tình huống đầu ca đã lỡ')
      if (list[1].id !== 'doi_y') assert.equal(incidentDue(s, c), true)
      tested = true
    }
    assert.ok(tested, 'không có ca mở hàng + tình huống thứ hai để kiểm')
  }
  // lưu/tải giữ nguyên kế hoạch 2 tình huống của ca dở
  const ctx = makeCtx(DATA)
  for (let seed = 1; seed <= 60; seed++) {
    const s = stateAt(seed, 9, 'nhieu')
    const sh = startShift(s, ctx)
    if (sh.incidentQueue.length !== 1) continue
    const back = migrate(decodeSave(encodeSave(s)), DATA)
    assert.deepEqual(back.shift.incidentQueue, sh.incidentQueue)
    assert.deepEqual(back.shift.incident, sh.incident)
    return
  }
  assert.fail('không có ca nào 2 tình huống để lưu thử')
})

// ---------- Sổ tiền sự kiện ----------

test('sổ tiền sự kiện: eventIn vào ví lúc tất toán, eventOut trừ ngay; lãi gồm cả hai; bất biến ví; bội 1.000đ / 500đ', () => {
  // M4 bước 4–5 (sửa có chủ ý): sự kiện ngày và tình huống mới cũng có tiền thưởng/phạt (chấm cuối ca, tiền cảm ơn…)
  // nên test này tắt sự kiện ngày và bỏ qua tình huống để chỉ còn 2 khoản thử
  const NODAY = { ...DATA, DAY_EVENTS: null }
  for (const seed of [4, 19, 88]) {
    const ctx = makeCtx(NODAY, '2026-10-07T12:00')
    const s = stateAt(seed, 9)
    const sh = startShift(s, ctx)
    const w0 = sh.walletStart
    assert.equal(sh.dayKey, '2026-10-07')
    assert.equal(sh.ledger.eventIn, 0)
    assert.equal(sh.ledger.eventOut, 0)
    const gainCap = incidentGainCap(s, sh, ctx)
    const lossCap = incidentLossCap(s, sh, ctx)
    const a = eventMoneyIn(s, 12345, { id: 'thu', name: 'Giải thưởng thử' }, ctx, { cap: gainCap })
    assert.equal(a.amount, Math.min(12000, gainCap))
    assert.equal(s.wallet, w0, 'tiền thưởng chưa vào ví trước khi tất toán')
    const b = eventMoneyOut(s, 7300, { id: 'phat', name: 'Phạt thử', text: 'Phạt thử.' }, ctx, { cap: lossCap })
    assert.equal(b.amount, Math.min(7000, lossCap))
    assert.equal(s.wallet, w0 - b.amount, 'phạt trừ ví ngay')
    const r = playShift(s, ctx)
    const sum = r.summary
    assert.equal(sum.eventIn, a.amount)
    assert.equal(sum.eventOut, b.amount)
    assert.equal(sum.eventIn % 1000, 0)
    assert.equal(sum.eventOut % 500, 0)
    assert.equal(s.wallet - w0, sum.profit - sum.loanRepaid, 'ví sau ca − ví đầu ca = lãi − trả nợ')
    // tiền mặt thực vào két = doanh thu tiền mặt + lệch két
    const recomputed = sum.cashSales + sum.drawerDiff + sum.qrSales + sum.tips + (sum.debtIn || 0) + sum.eventIn -
      sum.cogs - sum.waste - sum.fixedCost - sum.refunds - sum.eventOut
    assert.equal(sum.profit, recomputed)
    assert.equal(s.wallet % 500, 0)
    assert.deepEqual(sum.eventNotes.map(n => [n.id, n.money]), [['thu', a.amount], ['phat', -b.amount]])
    const h = s.history[s.history.length - 1]
    assert.equal(h.eventIn, a.amount)
    assert.equal(h.eventOut, b.amount)
  }
})

test('trần tiền sự kiện: mỗi sự kiện (cap) và mỗi ngày thật (1 thu nhập tham chiếu); vượt thì Dì Sáu đỡ giùm; sang ngày mới mở sổ mới', () => {
  const ctx = makeCtx(DATA, '2026-10-08T08:00')
  const s = stateAt(31, 9)
  startShift(s, ctx)
  const caps = eventDayCaps(ctx, 9)
  assert.deepEqual(caps, { loss: refIncomeFor(ctx, 9), gain: refIncomeFor(ctx, 9) })
  // mỗi sự kiện: kẹp theo cap
  assert.equal(eventMoneyIn(s, 50000, { id: 'a' }, ctx, { cap: 15000 }).amount, 15000)
  assert.equal(eventMoneyOut(s, 30000, { id: 'b' }, ctx, { cap: 20000 }).amount, 20000)
  // mỗi ngày thật: tổng thưởng ≤ 1 TNC, tổng phạt ≤ 1 TNC
  let gain = 15000, loss = 20000, lastIn = null, lastOut = null
  for (let i = 0; i < 8; i++) {
    lastIn = eventMoneyIn(s, 20000, { id: 'g' + i, name: 'Thưởng' }, ctx)
    gain += lastIn.amount
    lastOut = eventMoneyOut(s, 20000, { id: 'f' + i, name: 'Phạt', text: 'Bị phạt.' }, ctx)
    loss += lastOut.amount
  }
  assert.equal(gain, caps.gain)
  assert.equal(loss, caps.loss)
  assert.equal(lastIn.capped, 20000)
  assert.equal(lastOut.spared, 20000)
  const notes = s.shift.eventNotes
  assert.ok(notes.some(n => /Dì Sáu đỡ giùm con lần này/.test(n.text) && n.spared > 0))
  assert.ok(ctx.events.some(e => e.type === 'event.fined' && e.payload.spared > 0))
  // tiền người chơi tự chọn chi (mua hàng) không bị trần phạt ngày chặn
  assert.equal(eventMoneyOut(s, 8000, { id: 'mua' }, ctx, { fine: false }).amount, 8000)
  assert.equal(eventDayBook(s).loss, caps.loss)
  const r = playShift(s, ctx, { incident: v => v.safeId })
  assert.equal(r.summary.eventIn, caps.gain)
  assert.equal(r.summary.eventOut, caps.loss + 8000)
  // ca sau cùng ngày thật: sổ giữ nguyên (đã đủ trần)
  ctx.clock.t = vn('2026-10-08T17:30')
  startShift(s, ctx)
  assert.equal(eventMoneyIn(s, 5000, { id: 'x' }, ctx).amount, 0)
  assert.equal(eventMoneyOut(s, 5000, { id: 'y' }, ctx).amount, 0)
  endShift(s, ctx)
  // sang ngày thật mới: mở sổ mới
  ctx.clock.t = vn('2026-10-09T08:00')
  startShift(s, ctx)
  assert.equal(eventMoneyIn(s, 5000, { id: 'x' }, ctx).amount, 5000)
  assert.equal(eventMoneyOut(s, 5000, { id: 'y' }, ctx).amount, 5000)
  assert.equal(s.incidents.day.key, '2026-10-09')
  assert.deepEqual({ loss: s.incidents.day.loss, gain: s.incidents.day.gain }, { loss: 5000, gain: 5000 })
  // lưu/tải giữ sổ ngày và sổ ca
  const back = migrate(decodeSave(encodeSave(s)), DATA)
  assert.deepEqual(back.incidents, JSON.parse(JSON.stringify(s.incidents)))
  assert.deepEqual(back.shift.ledger, s.shift.ledger)
  endShift(s, ctx)
  // không có giờ thật (test lõi): sổ theo ngày game
  const t = stateAt(2, 6)
  const c0 = makeCtx()
  const sh0 = startShift(t, c0)
  assert.equal(sh0.dayKey, '')
  eventMoneyIn(t, 3000, { id: 'z' }, c0)
  assert.equal(t.incidents.day.key, 'ngay-6')
  // ca dở từ bản cũ (sổ ca chưa có eventIn/eventOut) vẫn tổng kết được, lãi như cũ
  const u = stateAt(3, 5)
  const shu = startShift(u, c0)
  delete shu.ledger.eventIn
  delete shu.ledger.eventOut
  delete shu.eventNotes
  const ru = playShift(u, c0)
  assert.equal(ru.summary.eventIn, 0)
  assert.equal(ru.summary.eventOut, 0)
  assert.equal(ru.walletAfter - shu.walletStart, ru.summary.profit - ru.summary.loanRepaid)
})
