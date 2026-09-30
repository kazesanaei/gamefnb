// Hồi quy vòng ráp nối M4 (DATA thật):
// - tiền sự kiện bị kẹp: lời giải thích đúng nguyên nhân — trần của một sự kiện trong ca (theo doanh thu dự kiến) khác
//   trần ngày thật (trước đây giải Hội thi bị kẹp theo trần của ca lại ghi "Hôm nay tiền thưởng từ sự kiện đã đủ mức",
//   phạt kiểm tra vệ sinh bị kẹp theo trần của ca chỉ ghi "Dì Sáu đỡ giùm con lần này" mà không nói vì sao ít hơn);
// - số tiền có dấu trên giao diện dùng dấu trừ dài "−" như các dòng trừ của sổ lãi lỗ;
// - Giỏ chợ / quà khách lạ khi kho đầy hoặc đã đủ 6 phần hôm nay: ghi rõ quà đổi Muỗng Vàng (trước đây vẫn ghi "Giỏ chợ có
//   nguyên liệu hiếm." dù kho không thêm phần nào — chơi thử 3 phiên hàng + khách lạ là chạm mức ngay ca thứ hai).
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { startShift } from '../../src/core/shift.js'
import { eventMoneyIn, eventMoneyOut, eventDayCaps } from '../../src/core/economy.js'
import { signedVND } from '../../src/ui/format.js'
import { finishShiftRare } from '../../src/core/rare.js'
import { vn } from '../helpers/meta-helpers.mjs'

function openShift(day = 9) {
  const events = []
  const ctx = { data: DATA, events, emit: (type, payload) => events.push({ type, payload }), now: () => vn('2026-10-07T08:00') }
  const s = defaultState(4, DATA)
  s.day = day
  startShift(s, ctx)
  return { s, ctx }
}

const note = { id: 'hoi_thi_xe_sach', name: 'Hội thi', text: 'Giải Nhất.' }

test('tiền thưởng sự kiện bị kẹp theo trần của ca: ghi "tối đa … theo doanh thu ca", không ghi "hôm nay đã đủ mức"', () => {
  const { s, ctx } = openShift()
  const r = eventMoneyIn(s, 20000, note, ctx, { cap: 18000 })
  assert.equal(r.amount, 18000)
  assert.equal(r.capped, 2000)
  const n = s.shift.eventNotes.at(-1)
  assert.equal(n.text, 'Giải Nhất. Tiền thưởng mỗi sự kiện ca này tối đa 18.000đ (theo doanh thu ca), phần dư Dì Sáu ghi công bằng lời khen.')
  assert.doesNotMatch(n.text, /Hôm nay/)
  assert.equal(ctx.events.find(e => e.type === 'event.money').payload.text, n.text)
})

test('tiền thưởng sự kiện chạm trần ngày thật: vẫn ghi "Hôm nay tiền thưởng từ sự kiện đã đủ mức"', () => {
  const { s, ctx } = openShift()
  const caps = eventDayCaps(ctx, s.day)
  s.incidents.day = { key: s.shift.dayKey, loss: 0, gain: caps.gain - 5000 }
  const r = eventMoneyIn(s, 20000, note, ctx, { cap: 18000 })
  assert.equal(r.amount, 5000)
  assert.match(s.shift.eventNotes.at(-1).text, /Hôm nay tiền thưởng từ sự kiện đã đủ mức/)
})

test('phạt sự kiện bị kẹp theo trần của ca: ghi mức tối đa và phần Dì Sáu đỡ giùm; chạm trần ngày: "Dì Sáu đỡ giùm con lần này"', () => {
  const { s, ctx } = openShift()
  const w0 = s.wallet
  const fine = { id: 'kiem_tra_attp', name: 'Đoàn kiểm tra', text: 'Tái phạm.' }
  const r = eventMoneyOut(s, 20000, fine, ctx, { cap: 18000 })
  assert.equal(r.amount, 18000)
  assert.equal(r.spared, 2000)
  assert.equal(s.wallet, w0 - 18000)
  assert.equal(s.shift.eventNotes.at(-1).text, 'Tái phạm. Mỗi lần phạt ca này tối đa 18.000đ (theo doanh thu ca), Dì Sáu đỡ giùm con 2.000đ.')
  // trần ngày thật còn ít hơn trần của ca
  const { s: t, ctx: c2 } = openShift()
  const caps = eventDayCaps(c2, t.day)
  t.incidents.day = { key: t.shift.dayKey, loss: caps.loss - 5000, gain: 0 }
  const r2 = eventMoneyOut(t, 20000, fine, c2, { cap: 18000 })
  assert.equal(r2.amount, 5000)
  assert.equal(t.shift.eventNotes.at(-1).text, 'Tái phạm. Dì Sáu đỡ giùm con lần này.')
})

test('signedVND: dấu trừ dài "−" như sổ lãi lỗ, dấu cộng cho số dương, 0đ không dấu', () => {
  assert.equal(signedVND(-18000), '−18.000đ')
  assert.equal(signedVND(5000), '+5.000đ')
  assert.equal(signedVND(0), '0đ')
})

test('Giỏ chợ khi đã đủ mức hàng hiếm hôm nay: quà đổi Muỗng Vàng và ghi chú nói rõ', () => {
  const { s, ctx } = openShift()
  // đã nhận đủ 6 phần + 3 mảnh trong ngày thật này → lượt Giỏ chợ chắc chắn ra nguyên liệu nhưng không vào kho được
  s.rare.today = { key: s.shift.dayKey, got: 6, frags: 3, stalls: [], strangerDay: s.shift.dayKey }
  s.shift.rareRolls = 1
  const gold0 = Number(s.goldSpoons) || 0
  const stock0 = JSON.stringify(s.rare.stock)
  const notes = finishShiftRare(s, ctx)
  const n = notes.find(x => x.kind === 'gio_cho')
  assert.equal(n.got.reduce((a, x) => a + x.n, 0), 0)
  assert.equal(n.spoons, DATA.RARE_CONFIG.overflowGold)
  assert.equal(n.text, `Giỏ chợ có nguyên liệu hiếm. Kho hoặc mức hôm nay đã đủ, quà đổi thành ${DATA.RARE_CONFIG.overflowGold} Muỗng Vàng.`)
  assert.equal(s.goldSpoons, gold0 + DATA.RARE_CONFIG.overflowGold)
  assert.equal(JSON.stringify(s.rare.stock), stock0, 'kho không đổi')
})
