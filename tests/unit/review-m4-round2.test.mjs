// Hồi quy vòng soát lỗi M4 thứ hai (DATA thật):
// - M4R-01 / UX-04: luật "không 2 sự kiện xấu liền nhau" xét trên dòng thời gian CHUNG (sự kiện ngày lúc mở ca, rồi các
//   tình huống trong ca theo thứ tự) — trước đây chỉ xét riêng từng lớp nên tình huống xấu cuối ca vẫn đứng liền sự kiện
//   ngày xấu của ca sau và ngược lại;
// - M4R-05: sự kiện ngày đã báo trước được chốt (state.incidents.announced), đổi mức "Tần suất sự kiện" không bốc lại;
// - M4R-02: lựa hàng ở gánh hàng quê lưu rổ dở và số lần chọn nhầm, tải lại / rời chợ rồi "Lựa tiếp" không thành lượt mới
//   sạch (trước đây luôn đạt 100 điểm);
// - M4R-03: sổ trần tiền sự kiện mỗi ngày thật không mở lại khi lùi giờ máy rồi trả giờ về; khóa ngày ca theo giờ tin cậy;
// - M4R-06 / UX-06: Giỏ chợ có bảo hiểm mảnh; tỉ lệ 100% nguyên liệu ghi đúng lý do;
// - M4R-07: hủy ca dở hoàn cả tiền phạt/chi sự kiện và tiền lựa chọn ở màn Chuẩn bị;
// - M4R-08 / UX-05: dòng tiền thưởng sự kiện ghi "tối đa"; UX-11: Tổng kết ghi khoản chi lúc mở hàng; UX-12: Sổ công thức
//   ghi phần giá vốn là hàng hiếm quy đổi; UX-01: chữ quà hàng hiếm khi đủ mức hôm nay.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState, newRecipeProgress } from '../../src/core/state.js'
import { startShift, endShift } from '../../src/core/shift.js'
import { makeNowInfo, dayKeyVN } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { rollDayEvent, dayEventSeries, dayEventInfo, dayEventKind, announceDayEvent, setDayEventChoice, finishShiftEvents } from '../../src/core/events.js'
import { incidentCandidates, ensureIncidents, shiftIncidents } from '../../src/core/incidents.js'
import { eventMoneyIn, eventMoneyOut, eventDayBook } from '../../src/core/economy.js'
import { stallStatus, startStall, finishStall, saveStallDraft, basketOdds, rollBasket, fragmentCandidates, ensureRare } from '../../src/core/rare.js'
import { recipeBook } from '../../src/core/recipe-book.js'
import { encodeSave, decodeSave, migrate } from '../../src/core/save.js'
import { playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx, vn } from '../helpers/meta-helpers.mjs'
import { dayEffectLines } from '../../src/ui/screens/prep.js'
import { incidentLines } from '../../src/ui/screens/summary.js'

const DAY_MS = 24 * 3600 * 1000
const HOUR = 3600 * 1000
const kindOfDay = id => dayEventKind(DATA.DAY_EVENTS[id])

function freshState(seed, freq = 'vua') {
  const s = defaultState(seed, DATA)
  s.shopName = 'Xe soát lỗi'
  s.settings.incidentFrequency = freq
  return s
}

// ---------- M4R-01 / UX-04: dòng thời gian chung ----------

// Chơi nhiều ca (3 ca mỗi ngày thật), luôn chọn cách an toàn; ghi dòng thời gian chung: sự kiện ngày lúc mở ca rồi các
// tình huống đã xử lý theo thứ tự.
function playStream(seed, freq, shifts) {
  const ctx = makeMetaCtx({ at: '2026-09-01T08:10', attach: true })
  const s = freshState(seed, freq)
  ctx.setState(s)
  const stream = []
  for (let i = 0; i < shifts; i++) {
    ctx.clock.t = vn('2026-09-01T08:10') + Math.floor(i / 3) * DAY_MS + (i % 3) * 4 * HOUR
    refreshMeta(s, makeNowInfo(s, ctx.clock.t), ctx)
    const forecast = rollDayEvent(s, s.day, ctx)
    const r = playShift(s, ctx, { incident: v => v.safeId })
    const applied = s.history[s.history.length - 1] && r.summary
    assert.ok(applied)
    if (forecast) stream.push({ t: 'ngay', day: r.summary.day, id: forecast, kind: kindOfDay(forecast) })
    for (const x of r.summary.incidents) stream.push({ t: 'tinh_huong', day: r.summary.day, id: x.id, kind: x.kind })
  }
  return { stream, state: s }
}

test('M4R-01: không có 2 sự kiện xấu liền nhau trên dòng thời gian chung (sự kiện ngày + tình huống), mức Vừa và Nhiều', () => {
  const totals = { ngay: 0, tinh_huong: 0 }
  for (const freq of ['vua', 'nhieu']) {
    for (let seed = 1; seed <= 8; seed++) {
      const { stream } = playStream(seed, freq, 45)
      for (let k = 0; k < stream.length; k++) {
        if (stream[k].kind === 'xau') totals[stream[k].t]++
        if (k === 0) continue
        const a = stream[k - 1], b = stream[k]
        assert.ok(!(a.kind === 'xau' && b.kind === 'xau'),
          `${freq} seed ${seed}: ${a.t} ${a.id} (ngày ${a.day}) rồi ${b.t} ${b.id} (ngày ${b.day}) đều loại xấu`)
      }
    }
  }
  // vẫn có đủ sự kiện xấu ở cả hai lớp (luật nhịp không tắt hẳn loại xấu)
  assert.ok(totals.ngay > 30 && totals.tinh_huong > 30, JSON.stringify(totals))
})

test('M4R-01: ngày mai (đã chốt) có sự kiện xấu → ca hôm nay không bốc tình huống xấu; sự kiện gần nhất là loại xấu → cũng không', () => {
  const ctx = { data: DATA, emit: () => {} }
  let checked = 0
  for (let seed = 1; seed <= 200 && checked < 3; seed++) {
    const s = freshState(seed, 'nhieu')
    s.day = 9
    const next = rollDayEvent(s, 10, ctx)
    const today = rollDayEvent(s, 9, ctx)
    if (!next || kindOfDay(next) !== 'xau' || (today && kindOfDay(today) === 'xau')) continue
    const sh = startShift(s, ctx)
    assert.equal(s.incidents.announced['10'], next, 'mở ca chốt luôn sự kiện ngày mai')
    const kinds = incidentCandidates(s, sh, ctx).map(d => d.kind || (d.positive ? 'tot' : 'chon'))
    assert.ok(!kinds.includes('xau'), `seed ${seed}: ngày mai ${next} xấu mà vẫn bốc tình huống xấu`)
    for (const x of shiftIncidents(sh)) assert.notEqual(x.kind, 'xau')
    // bỏ ngày mai xấu (đổi chốt thành ngày không có sự kiện) → tình huống xấu lại bốc được
    s.incidents.announced['10'] = ''
    assert.ok(incidentCandidates(s, sh, ctx).some(d => d.kind === 'xau'), 'không còn luật nhịp chặn thì có loại xấu')
    // sự kiện gần nhất trên dòng thời gian chung là loại xấu → không bốc loại xấu
    s.incidents.lastEvent = 'xau'
    assert.ok(!incidentCandidates(s, sh, ctx).some(d => d.kind === 'xau'))
    checked++
  }
  assert.equal(checked, 3)
})

test('M4R-01: chốt sự kiện ngày khi sự kiện gần nhất là loại xấu → ngày đó không có loại xấu (chỉ đổi loại, không đổi có/không)', () => {
  const ctx = { data: DATA, emit: () => {} }
  let checked = 0
  for (let seed = 1; seed <= 400 && checked < 5; seed++) {
    const pure = dayEventSeries(freshState(seed), 40, ctx)
    for (let d = 6; d <= 40; d++) {
      if (!pure[d] || kindOfDay(pure[d]) !== 'xau') continue
      const s = freshState(seed)
      s.day = d
      ensureIncidents(s).lastEvent = 'xau'
      const id = announceDayEvent(s, d, ctx)
      assert.ok(id, 'vẫn có sự kiện (tỉ lệ ngày có sự kiện không đổi)')
      assert.notEqual(kindOfDay(id), 'xau')
      assert.equal(rollDayEvent(s, d, ctx), id, 'đã chốt thì các lần hỏi sau trả đúng sự kiện đã chốt')
      checked++
      break
    }
  }
  assert.equal(checked, 5)
})

// ---------- M4R-05: đổi mức tần suất không bốc lại sự kiện đã báo ----------

test('M4R-05: sự kiện hôm nay (màn Chuẩn bị) và ngày mai (Tổng kết) đã chốt, đổi mức Vừa → Ít không đổi; ngày chưa báo theo mức mới', () => {
  const ctx = makeMetaCtx({ at: '2026-10-05T08:00', attach: true })
  let found = 0
  for (let seed = 1; seed <= 300 && found < 4; seed++) {
    const pure = dayEventSeries(freshState(seed), 20, { data: DATA })
    // hôm nay (ngày 9) có sự kiện loại chọn/xấu ở mức Vừa, mà mức Ít sẽ ra sự kiện khác
    const it = dayEventSeries(freshState(seed, 'it'), 20, { data: DATA })
    if (!pure[9] || kindOfDay(pure[9]) === 'tot' || it[9] === pure[9]) continue
    const s = freshState(seed)
    s.day = 9
    ctx.setState(s)
    refreshMeta(s, makeNowInfo(s, ctx.clock.t), ctx)
    assert.equal(dayEventInfo(s, 9, ctx).id, pure[9], 'màn Chuẩn bị hiện sự kiện hôm nay')
    s.settings.incidentFrequency = 'it'
    assert.equal(dayEventInfo(s, 9, ctx).id, pure[9], 'đổi sang Ít: sự kiện hôm nay đã báo giữ nguyên')
    // lưu / tải giữ nguyên sự kiện đã chốt
    const back = migrate(decodeSave(encodeSave(s)), DATA)
    assert.deepEqual(back.incidents.announced, s.incidents.announced)
    assert.equal(rollDayEvent(back, 9, ctx), pure[9])
    // mở ca: áp đúng sự kiện đã báo; ngày mai chốt theo mức Ít (chỉ loại tốt)
    const sh = startShift(s, ctx)
    assert.equal(sh.mods.dayEvent.id, pure[9])
    const tomorrow = rollDayEvent(s, 10, ctx)
    if (tomorrow) assert.equal(kindOfDay(tomorrow), 'tot', 'ngày chưa báo theo mức mới')
    endShift(s, ctx)
    // Tổng kết báo "Ngày mai"; đổi lại Vừa cũng không đổi
    s.settings.incidentFrequency = 'vua'
    assert.equal(rollDayEvent(s, 10, ctx), tomorrow)
    found++
  }
  assert.equal(found, 4)
  // chỉ giữ 15 ngày gần nhất
  const s = freshState(5)
  for (let d = 3; d <= 40; d++) { s.day = d; announceDayEvent(s, d, { data: DATA }) }
  const keys = Object.keys(s.incidents.announced).map(Number)
  assert.ok(Math.min(...keys) >= 25 && Math.max(...keys) === 40, keys.join(','))
  // dữ liệu hỏng được làm sạch
  const bad = migrate({ seed: 1, day: 30, incidents: { announced: { 29: 'troi_mua', 30: '', 3: 'nang_nong', 31: 'la_lam', x: 'troi_mua', 32: 'nang_nong' }, lastEvent: 'rat_xau' } }, DATA)
  assert.deepEqual(bad.incidents.announced, { 29: 'troi_mua', 30: '' })
  assert.equal(bad.incidents.lastEvent, null)
})

// ---------- M4R-02: lựa hàng lưu rổ dở ----------

function stallState(seed = 3) {
  const s = freshState(seed)
  s.day = 5
  return s
}
const nowAt = (s, str) => makeNowInfo(s, vn(str))

test('M4R-02: lựa hàng dở (đã chọn nhầm) → lưu/tải lại → "Lựa tiếp" khôi phục rổ và lần nhầm; điểm không vượt 100 − 15 × lần nhầm', () => {
  const ctx = { data: DATA, emit: () => {} }
  const s = stallState()
  const n = nowAt(s, '2026-09-30T12:00')
  const a = startStall(s, 'ba_gac_trua', n, ctx)
  assert.ok(a.ok && !a.resumed)
  assert.deepEqual(a.draft, { picked: [], mistakes: 0 })
  const goods = a.game.goods
  const trap = a.game.traps[0]
  // chạm nhầm hàng thường, rồi bỏ ra (lần nhầm vẫn tính), rồi chạm 1 món đúng
  assert.deepEqual(saveStallDraft(s, { picked: [trap], mistakes: 1 }), { ok: true, picked: [trap], mistakes: 1 })
  saveStallDraft(s, { picked: [], mistakes: 1 })
  saveStallDraft(s, { picked: [goods[0]], mistakes: 0 })
  assert.equal(s.rare.pendingStall.mistakes, 1, 'số lần nhầm không giảm')
  // tải lại trang: save giữ rổ dở
  const back = migrate(decodeSave(encodeSave(s)), DATA)
  assert.deepEqual(back.rare.pendingStall, s.rare.pendingStall)
  const n2 = nowAt(back, '2026-09-30T12:05')
  assert.equal(stallStatus(back, n2, ctx).pending, 'ba_gac_trua')
  const b = startStall(back, 'ba_gac_trua', n2, ctx)
  assert.ok(b.ok && b.resumed)
  assert.deepEqual(b.draft, { picked: [goods[0]], mistakes: 1 }, '"Lựa tiếp" khôi phục đúng rổ và lần nhầm')
  // giao diện cũ gửi điểm 100, không có lần nhầm: lõi vẫn tính lần nhầm đã lưu
  const r = finishStall(back, { score: 100, picked: goods.slice(), mistakes: 0 }, n2, ctx)
  assert.ok(r.ok)
  assert.equal(r.score, 85)
  assert.equal(r.wrong, true)
  assert.equal(r.got.reduce((x, g) => x + g.n, 0), 1, 'dưới 90 điểm: không có phần thưởng thêm')
  assert.ok(back.tipsSeen.includes(DATA.TIPS.find(t => t.trigger === 'kiem_hang').id), 'mở thẻ Mẹo nghề "Kiểm hàng"')
  assert.equal(back.rare.pendingStall, null)
  // không có lượt đang lựa: lưu rổ bị bỏ qua
  assert.equal(saveStallDraft(back, { picked: [trap], mistakes: 3 }).ok, false)
  // lượt sạch (không chạm nhầm) vẫn được 100 điểm
  const c = stallState(4)
  const nc = nowAt(c, '2026-09-30T18:00')
  const g = startStall(c, 'ganh_toi', nc, ctx)
  saveStallDraft(c, { picked: g.game.goods.slice(), mistakes: 0 })
  const rc = finishStall(c, { score: 100, picked: g.game.goods.slice(), mistakes: 0 }, nc, ctx)
  assert.equal(rc.score, 100)
  assert.equal(rc.wrong, false)
})

// ---------- M4R-03: sổ trần ngày thật khi lùi giờ ----------

test('M4R-03: lùi giờ máy rồi trả giờ về không mở lại trần tiền sự kiện của ngày thật; khóa ngày ca theo giờ tin cậy', () => {
  const ctx = makeMetaCtx({ at: '2026-10-10T08:00' })
  const s = freshState(12)
  s.day = 12
  ctx.setState(s)
  makeNowInfo(s, ctx.clock.t)
  startShift(s, ctx)
  assert.equal(s.shift.dayKey, '2026-10-10')
  const cap = 100000
  assert.equal(eventMoneyIn(s, cap, { id: 'x', name: 'x' }, ctx).amount, cap)
  endShift(s, ctx)
  // lùi giờ máy về tối hôm trước: ca vẫn tính ngày thật 10/10 (giờ tin cậy), không nhận thêm
  ctx.clock.t = vn('2026-10-09T20:00')
  const ni = makeNowInfo(s, ctx.clock.t)
  assert.equal(ni.rewind, true)
  startShift(s, ctx)
  assert.equal(s.shift.dayKey, '2026-10-10')
  assert.equal(eventMoneyIn(s, cap, { id: 'x', name: 'x' }, ctx).amount, 0)
  endShift(s, ctx)
  // sổ có khóa cũ hơn (vd ca dở từ lúc lùi giờ): dùng tiếp sổ hiện tại, không mở sổ mới
  ctx.clock.t = vn('2026-10-10T08:30')
  startShift(s, ctx)
  s.shift.dayKey = '2026-10-09'
  assert.equal(eventDayBook(s).key, '2026-10-10')
  assert.equal(eventMoneyIn(s, cap, { id: 'x', name: 'x' }, ctx).amount, 0)
  assert.equal(eventMoneyOut(s, 20000, { id: 'y', name: 'y' }, ctx).amount, 20000)
  endShift(s, ctx)
  // sang ngày thật mới: mở sổ mới
  ctx.clock.t = vn('2026-10-11T08:00')
  makeNowInfo(s, ctx.clock.t)
  startShift(s, ctx)
  assert.equal(eventDayBook(s).key, '2026-10-11')
  assert.equal(eventMoneyIn(s, 30000, { id: 'x', name: 'x' }, ctx).amount, 30000)
})

// ---------- M4R-06 / UX-06: Giỏ chợ ----------

test('M4R-06: Giỏ chợ có bảo hiểm mảnh (3 lần liền không ra mảnh → lượt sau chắc chắn ra mảnh); bảo hiểm nguyên liệu ưu tiên khi cùng tới hạn', () => {
  const ctx = { data: DATA, emit: () => {} }
  const s = freshState(9)
  s.day = 6
  const R = ensureRare(s)
  assert.ok(fragmentCandidates(s, ctx).length > 0)
  R.pity = { ing: 0, frag: 3 }
  const o = basketOdds(s, ctx, '2026-10-05')
  assert.equal(o.fragSure, true)
  assert.equal(o.sure, false)
  for (let k = 0; k < 30; k++) {
    R.pity = { ing: 0, frag: 3 }
    R.fragments = {}
    R.today = { key: '2026-10-05', got: 0, frags: 0, stalls: [], strangerDay: '' }
    const r = rollBasket(s, ctx, { rng: 1000 + k }, { dayKey: '2026-10-05' })
    assert.equal(r.result, 'frag', 'bảo hiểm mảnh')
    assert.equal(r.fragSure, true)
    assert.equal(R.pity.frag, 0)
  }
  // cùng tới hạn: nguyên liệu trước (thanh may mắn công khai), mảnh để lượt sau
  R.pity = { ing: 2, frag: 3 }
  R.today = { key: '2026-10-05', got: 0, frags: 0, stalls: [], strangerDay: '' }
  const both = basketOdds(s, ctx, '2026-10-05')
  assert.deepEqual([both.sure, both.fragSure], [true, false])
  assert.equal(rollBasket(s, ctx, { rng: 7 }, { dayKey: '2026-10-05' }).result, 'ing')
  assert.equal(basketOdds(s, ctx, '2026-10-05').fragSure, true, 'lượt sau đến lượt bảo hiểm mảnh')
})

test('UX-06: Giỏ chợ 100% nguyên liệu ghi đúng lý do: hết mức mảnh hôm nay / món hiếm còn lại cần món nền / đủ mảnh mọi món', () => {
  const ctx = { data: DATA, emit: () => {} }
  const s = freshState(10)
  s.day = 6
  const R = ensureRare(s)
  R.today = { key: '2026-10-05', got: 0, frags: 3, stalls: [], strangerDay: '' }
  const a = basketOdds(s, ctx, '2026-10-05')
  assert.deepEqual([a.allIng, a.allReason], [true, 'het_muc_ngay'])
  // chưa có món nền của món hiếm nào (bỏ hết món) → cần món nền
  const t = freshState(11)
  t.recipes = {}
  const b = basketOdds(t, ctx, '2026-10-05')
  assert.deepEqual([b.allIng, b.allReason], [true, 'can_mon_nen'])
  // đã mở mọi món hiếm → đủ mảnh
  const u = freshState(12)
  for (const r of Object.values(DATA.RECIPES)) if (!u.recipes[r.id] && r.source !== 'event') u.recipes[r.id] = newRecipeProgress(0)
  const c = basketOdds(u, ctx, '2026-10-05')
  assert.deepEqual([c.allIng, c.allReason], [true, 'du_manh'])
  assert.equal(basketOdds(freshState(13), ctx, '2026-10-05').allReason, null)
  // chữ ở thẻ Kho hàng hiếm có câu riêng cho từng lý do
  const RS = DATA.STRINGS.rare
  assert.match(RS.basketAllIngDay, /đã nhận đủ \{fragCap\} mảnh/)
  assert.match(RS.basketAllIngBase, /món nền/)
})

// ---------- M4R-07: hủy ca dở hoàn tiền sự kiện ----------

test('M4R-07: ca dở hỏng bị hủy khi nạp → hoàn cả tiền phạt/chi sự kiện và tiền lựa chọn ở màn Chuẩn bị; hàng hiếm đã mua giữ, không hoàn', () => {
  const ctx = makeMetaCtx({ at: '2026-10-07T08:00' })
  const s = freshState(21)
  s.day = 9
  ctx.setState(s)
  s.wallet = 200000
  startShift(s, ctx)
  eventMoneyOut(s, 20000, { id: 'trat_tu_do_thi', name: 'Trật tự đô thị' }, ctx)
  // tiền mua hàng hiếm của cô bán dạo (hàng đã vào kho): không hoàn
  s.shift.incident = { id: 'nguoi_ban_dao', status: 'xong', result: { spend: 8000, rare: [{ id: 'mat_ong_rung', n: 2 }] } }
  s.shift.ledger.eventOut += 8000
  s.wallet -= 8000
  s.shift.mods.prepCost = 10000
  s.wallet -= 10000
  const raw = JSON.parse(JSON.stringify(s))
  raw.shift.plan = 'hỏng'
  const report = {}
  const m = migrate(raw, DATA, report)
  assert.equal(m.shift, null)
  assert.equal(report.shiftDropped.refund, 30000, '20.000đ phạt + 10.000đ lựa chọn; 8.000đ mua hàng không hoàn')
  assert.equal(m.wallet, 200000 - 8000)
})

// ---------- Chữ hiển thị ----------

test('M4R-08 / UX-05: dòng tiền thưởng sự kiện ghi "tối đa" và nói rõ trần theo doanh thu ca', () => {
  const hoi = dayEffectLines(DATA.DAY_EVENTS.hoi_thi_xe_sach.effects, DATA)
  assert.ok(hoi.some(t => /Giải Nhất tối đa \+20\.000đ/.test(t)), hoi.join(' | '))
  assert.ok(!hoi.some(t => /Giải Nhất \+20\.000đ/.test(t)))
  assert.ok(hoi.some(t => /mức trần theo doanh thu ca/.test(t)))
  const tai = dayEffectLines(DATA.DAY_EVENTS.tai_tro_dai_ly.choice.effects, DATA)
  assert.ok(tai.some(t => /Bán từ 3 ly Trà tắc: tối đa \+15\.000đ/.test(t)), tai.join(' | '))
  assert.match(DATA.DAY_EVENTS.tai_tro_dai_ly.choice.desc, /tối đa \+15\.000đ/)
})

test('UX-11: tiền chi cho lựa chọn ở màn Chuẩn bị có ghi chú trong Tổng kết (không tính vào lãi ca)', () => {
  const ctx = { data: DATA, emit: () => {} }
  for (let seed = 1; seed <= 300; seed++) {
    const s = freshState(seed)
    s.day = 9
    const info = dayEventInfo(s, 9, ctx)
    if (!info || !info.choice || !(info.choice.cost > 0)) continue
    assert.ok(setDayEventChoice(s, info.choice.id, ctx).ok)
    const w0 = s.wallet
    const sh = startShift(s, ctx)
    assert.equal(sh.mods.prepCost, info.choice.cost)
    assert.equal(s.wallet, w0 - info.choice.cost)
    finishShiftEvents(s, ctx)
    const note = sh.eventNotes.find(x => /lúc mở hàng/.test(x.fx || ''))
    assert.ok(note, JSON.stringify(sh.eventNotes))
    assert.match(note.fx, new RegExp(`Đã chi ${info.choice.cost.toLocaleString('vi-VN').replace(/,/g, '.')}đ lúc mở hàng`))
    assert.match(note.text, /không tính vào lãi ca/)
    assert.equal(note.money, 0)
    return
  }
  assert.fail('không có ngày nào có lựa chọn tốn tiền')
})

test('UX-12: Sổ công thức ghi phần giá vốn là hàng hiếm quy đổi (lấy từ kho, không trừ Tiền quán)', () => {
  const s = freshState(3)
  const e = recipeBook(s, { data: DATA }).entries.find(x => x.id === 'banh_mi_trung_ga_ta')
  assert.equal(e.rareCost, 7000, 'trứng gà ta 3.500đ × 2')
  assert.equal(e.cost - e.rareCost, 4000)
  const plain = recipeBook(s, { data: DATA }).entries.find(x => x.id === 'banh_mi_op_la')
  assert.equal(plain.rareCost, undefined)
})

test('UX-01: dòng Tổng kết của quà hàng hiếm đổi Muỗng Vàng nói "kho hoặc mức hôm nay", không nói "kho hàng hiếm đã đủ"', () => {
  const lines = incidentLines({ spoons: 2 })
  assert.deepEqual(lines, ['Kho hoặc mức hàng hiếm hôm nay đã đủ: +2 Muỗng Vàng'])
})

test('UX-07 / UX-08 / UX-09 / UX-13: tên gọi, cách xưng hô và hình minh họa khớp nhau; câu thư 0.4.0', () => {
  const I = DATA.INCIDENTS
  const names = w => (typeof w === 'string' ? w : w.name)
  assert.ok(!I.tien_nghi_gia.who.some(w => /khách lạ/.test(names(w))), 'tình huống tiền giả không gọi là "khách lạ"')
  assert.ok(!DATA.STALLS.some(x => x.seller === 'Anh Sáu'), 'người bán không trùng tên Dì Sáu')
  // cô bán dạo: câu hẹn dùng đúng cách tự xưng của người được chọn
  for (const w of I.nguoi_ban_dao.who) assert.ok(typeof w === 'object' && w.self, JSON.stringify(w))
  const hen = I.nguoi_ban_dao.choices.find(c => c.id === 'hen').outcomes[0].result
  assert.match(hen, /\{self\}/)
  // hình cô chú (tóc bạc) cho người gọi là "cô"
  assert.equal(I.gas_het.art.persona, 'co_chu')
  assert.ok(I.gas_het.who.every(w => /^Cô /.test(names(w))))
  assert.ok(!I.shipper_chuyen_khoan.who.some(w => /nón đỏ/.test(names(w))))
  assert.equal(DATA.RECIPES.ca_phe_muoi.steps.find(x => x.id === 'danh_sua_muoi').icon, 'sua_muoi')
  assert.notEqual(DATA.INGREDIENTS.trung_ga_ta.origin, 'Vườn quê')
  assert.equal(DATA.STRINGS.screens.market, 'Gánh hàng quê', 'khác tên sự kiện ngày "Chợ phiên"')
  const mail = DATA.MAIL_VERSIONS.find(m => m.version === '0.4.0')
  assert.match(mail.body, /hóa đơn từ 20\.000đ mà khách chấm 5 sao thì khách bỏ hũ tip 5\.000đ/)
})
