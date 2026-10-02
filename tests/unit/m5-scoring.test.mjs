// M5 (0.5.0): năm hàm chấm của thao tác mới (thiết kế M5 mục 1.5) — đập trứng, khuấy, gọt, lắc, bày.
// Mỗi hàm: ca đạt 100, sát ngưỡng hạng bước (90 Hoàn hảo / 70 Tốt / 50 Đạt), đầu vào lỗi (NaN, âm, rỗng, sai kiểu) cho 0
// chứ không ra NaN, mul nới vùng (hàm có mul). Kết quả luôn là số nguyên 0..100.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DAP_ZONE, scoreDap, scoreXoay, scoreGot, scoreLac, scoreBay, bayPlaceScore, zoneScore, stepLabel
} from '../../src/core/minigame-scoring.js'

const ok = s => Number.isInteger(s) && s >= 0 && s <= 100
const BAD = [NaN, -5, undefined, null, 'abc', {}, [], Infinity]
const C = (DAP_ZONE[0] + DAP_ZONE[1]) / 2          // tâm vùng xanh 0,55
const H = (DAP_ZONE[1] - DAP_ZONE[0]) / 2          // nửa bề rộng 0,15

test('DAP_ZONE = [0,40; 0,70], đóng băng', () => {
  assert.deepEqual([...DAP_ZONE], [0.40, 0.70])
  assert.ok(Object.isFrozen(DAP_ZONE))
})

test('scoreDap: 100 khi mọi quả tách sạch ở tâm vùng; vỏ rơi tối đa 40; quả chưa đập / chưa tách = 0; trung bình n quả', () => {
  const egg = (force, extra = {}) => ({ force, split: true, shell: false, ...extra })
  assert.equal(scoreDap({ cracks: [egg(C), egg(C)], n: 2 }), 100)
  assert.equal(scoreDap({ cracks: [egg(C)], n: 1 }), 100)
  // vỏ rơi: kẹp 40 dù lực chuẩn
  assert.equal(scoreDap({ cracks: [egg(C, { shell: true })], n: 1 }), 40)
  // một quả chưa đập
  assert.equal(scoreDap({ cracks: [egg(C)], n: 2 }), 50)
  // nứt mà chưa tách = 0
  assert.equal(scoreDap({ cracks: [egg(C), { force: C, split: false }], n: 2 }), 50)
  // quả đập dư bị bỏ
  assert.equal(scoreDap({ cracks: [egg(C), egg(0), egg(0)], n: 1 }), 100)
  // không có gì
  assert.equal(scoreDap({ cracks: [], n: 2 }), 0)
  assert.equal(scoreDap({}), 0)
  assert.equal(scoreDap(), 0)
})

test('scoreDap: sát ngưỡng 90 / 70 / 50', () => {
  const egg = force => ({ force, split: true })
  // mép vùng xanh (d = h) = 80 điểm
  assert.equal(zoneScore(DAP_ZONE[1], DAP_ZONE, 1), 80)
  // 100 + 80 → 90 (Hoàn hảo), 100 + 40 (vỏ) → 70 (Tốt), 100 + 0 → 50 (Đạt)
  const s90 = scoreDap({ cracks: [egg(C), egg(DAP_ZONE[1])], n: 2 })
  assert.equal(s90, 90)
  assert.equal(stepLabel(s90), 'Hoàn hảo')
  const s70 = scoreDap({ cracks: [egg(C), { force: C, split: true, shell: true }], n: 2 })
  assert.equal(s70, 70)
  assert.equal(stepLabel(s70), 'Tốt')
  const s50 = scoreDap({ cracks: [egg(C)], n: 2 })
  assert.equal(s50, 50)
  assert.equal(stepLabel(s50), 'Đạt')
  // lệch thêm chút khỏi mép thì rớt dưới 90
  assert.ok(scoreDap({ cracks: [egg(C), egg(DAP_ZONE[1] + 0.02)], n: 2 }) < 90)
})

test('scoreDap: đầu vào lỗi cho 0 hoặc bỏ phần lỗi, không ra NaN; mul nới vùng', () => {
  for (const b of BAD) {
    assert.ok(ok(scoreDap({ cracks: b, n: 2 })), `cracks ${String(b)}`)
    assert.ok(ok(scoreDap({ cracks: [{ force: C, split: true }], n: b })), `n ${String(b)}`)
    assert.ok(ok(scoreDap({ cracks: [{ force: b, split: true }], n: 1 })), `force ${String(b)}`)
    assert.ok(ok(scoreDap({ cracks: [{ force: C, split: true }], n: 1, mul: b })), `mul ${String(b)}`)
    assert.ok(ok(scoreDap({ cracks: [{ force: C, split: true }], n: 1, zone: b })), `zone ${String(b)}`)
  }
  assert.equal(scoreDap({ cracks: [{ force: NaN, split: true }], n: 1 }), 0)
  assert.equal(scoreDap({ cracks: [null, 5, 'x'], n: 3 }), 0)
  // n lỗi → 1 quả
  assert.equal(scoreDap({ cracks: [{ force: C, split: true }], n: NaN }), 100)
  // mul nới vùng: lực hơi quá mép vùng được điểm cao hơn khi mul lớn
  const f = DAP_ZONE[1] + 0.03
  const s1 = scoreDap({ cracks: [{ force: f, split: true }], n: 1, mul: 1 })
  const s2 = scoreDap({ cracks: [{ force: f, split: true }], n: 1, mul: 1.5 })
  assert.ok(s2 > s1, `${s2} > ${s1}`)
  assert.ok(scoreDap({ cracks: [{ force: C + 0.3 * H * 1.4, split: true }], n: 1, mul: 1.5 }) === 100)
})

test('scoreXoay: 100 khi đủ vòng, đều tay, không sánh, đúng giờ; tỉ lệ vòng; −12 mỗi lần sánh; cv > 0,45·mul −10; quá 2·par −15', () => {
  assert.equal(scoreXoay({ turns: 5, target: 5, spills: 0, cv: 0.1, elapsed: 5, par: 4 }), 100)
  assert.equal(scoreXoay({ turns: 7, target: 5 }), 100, 'dư vòng không phạt')
  assert.equal(scoreXoay({ turns: 2.5, target: 5 }), 50)
  assert.equal(scoreXoay({ turns: 5, target: 5, spills: 1 }), 88)
  assert.equal(scoreXoay({ turns: 5, target: 5, spills: 2 }), 76)
  assert.equal(scoreXoay({ turns: 5, target: 5, cv: 0.46 }), 90)
  assert.equal(scoreXoay({ turns: 5, target: 5, cv: 0.45 }), 100)
  assert.equal(scoreXoay({ turns: 5, target: 5, elapsed: 8.1, par: 4 }), 85)
  assert.equal(scoreXoay({ turns: 5, target: 5, elapsed: 8, par: 4 }), 100)
})

test('scoreXoay: sát ngưỡng 90 / 70 / 50; mul nới ngưỡng đều tay', () => {
  assert.equal(scoreXoay({ turns: 4.5, target: 5 }), 90)
  assert.equal(stepLabel(scoreXoay({ turns: 4.45, target: 5 })), 'Tốt')
  assert.equal(scoreXoay({ turns: 5, target: 5, spills: 1, cv: 0.5, elapsed: 0 }), 78)
  assert.equal(scoreXoay({ turns: 3.5, target: 5 }), 70)
  assert.equal(scoreXoay({ turns: 2.5, target: 5 }), 50)
  assert.equal(stepLabel(scoreXoay({ turns: 2.45, target: 5 })), 'Hỏng')
  // mul 1,2: ngưỡng cv thành 0,54
  assert.equal(scoreXoay({ turns: 5, target: 5, cv: 0.5, mul: 1.2 }), 100)
  assert.equal(scoreXoay({ turns: 5, target: 5, cv: 0.5, mul: 1 }), 90)
})

test('scoreXoay: đầu vào lỗi không ra NaN; chưa quay vòng nào = 0', () => {
  assert.equal(scoreXoay({}), 0)
  assert.equal(scoreXoay(), 0)
  assert.equal(scoreXoay({ turns: 0, target: 5 }), 0)
  assert.equal(scoreXoay({ turns: -3, target: 5 }), 0)
  for (const b of BAD) {
    for (const key of ['turns', 'target', 'spills', 'cv', 'elapsed', 'par', 'mul']) {
      assert.ok(ok(scoreXoay({ turns: 5, target: 5, [key]: b })), `${key} ${String(b)}`)
    }
  }
  assert.equal(scoreXoay({ turns: 5, target: NaN }), 100, 'mục tiêu lỗi → 1 vòng')
  assert.equal(scoreXoay({ turns: 5, target: 5, spills: -2 }), 100, 'số lần sánh âm bỏ qua')
  assert.equal(scoreXoay({ turns: 5, target: 5, spills: 99 }), 0, 'kẹp 0')
})

test('scoreGot: 100 khi mọi dải phủ ≥ 85%; trung bình min(1, phủ/0,85); −8 mỗi nhát hụt (tối đa −24); quá 2·par −15', () => {
  assert.equal(scoreGot({ coverage: [1, 1, 1, 1, 1], target: 5 }), 100)
  assert.equal(scoreGot({ coverage: [0.85, 0.9, 0.86, 1, 0.85], target: 5 }), 100)
  assert.equal(scoreGot({ coverage: [1, 1, 1, 1], target: 5 }), 80, 'thiếu dải = 0')
  assert.equal(scoreGot({ coverage: [1, 1, 1, 1, 1], target: 5, misses: 1 }), 92)
  assert.equal(scoreGot({ coverage: [1, 1, 1, 1, 1], target: 5, misses: 3 }), 76)
  assert.equal(scoreGot({ coverage: [1, 1, 1, 1, 1], target: 5, misses: 10 }), 76, 'nhát hụt tối đa −24')
  assert.equal(scoreGot({ coverage: [1, 1, 1, 1, 1], target: 5, elapsed: 6.5, par: 3 }), 85)
  assert.equal(scoreGot({ coverage: [1, 1, 1] }), 100, 'không có target: K = số dải')
})

test('scoreGot: sát ngưỡng 90 / 70 / 50', () => {
  assert.equal(scoreGot({ coverage: [1, 1, 1, 1, 0.85 / 2], target: 5 }), 90)
  assert.equal(stepLabel(scoreGot({ coverage: [1, 1, 1, 1, 0.4], target: 5 })), 'Tốt')
  assert.equal(scoreGot({ coverage: [1, 1, 1, 0.85 / 2, 0], target: 5 }), 70)
  assert.equal(scoreGot({ coverage: [1, 1, 1, 1, 1], target: 5, misses: 2, elapsed: 7, par: 3 }), 69)
  assert.equal(scoreGot({ coverage: [1, 1, 0.85 / 2, 0, 0], target: 5 }), 50)
  assert.equal(stepLabel(scoreGot({ coverage: [1, 1, 0.4, 0, 0], target: 5 })), 'Hỏng')
})

test('scoreGot: đầu vào lỗi không ra NaN; chưa gọt gì = 0', () => {
  assert.equal(scoreGot({}), 0)
  assert.equal(scoreGot(), 0)
  assert.equal(scoreGot({ coverage: [0, 0, 0], target: 3, misses: 0 }), 0)
  for (const b of BAD) {
    assert.ok(ok(scoreGot({ coverage: b, target: 5 })), `coverage ${String(b)}`)
    assert.ok(ok(scoreGot({ coverage: [b, 1, 1], target: 3 })), `phủ ${String(b)}`)
    for (const key of ['target', 'misses', 'elapsed', 'par']) assert.ok(ok(scoreGot({ coverage: [1, 1], target: 2, [key]: b })), `${key} ${String(b)}`)
  }
  assert.equal(scoreGot({ coverage: [2, 5], target: 2 }), 100, 'phủ > 1 kẹp 1')
  assert.equal(scoreGot({ coverage: [-1, 1], target: 2 }), 50, 'phủ âm = 0')
})

test('scoreLac: 100 khi đủ lượt, đều nhịp, đúng giờ; tỉ lệ lượt; cv > 0,6·mul −10; quá 2·par −15', () => {
  assert.equal(scoreLac({ strokes: 6, target: 6, cv: 0.2, elapsed: 3, par: 2 }), 100)
  assert.equal(scoreLac({ strokes: 9, target: 6 }), 100)
  assert.equal(scoreLac({ strokes: 3, target: 6 }), 50)
  assert.equal(scoreLac({ strokes: 6, target: 6, cv: 0.61 }), 90)
  assert.equal(scoreLac({ strokes: 6, target: 6, cv: 0.6 }), 100)
  assert.equal(scoreLac({ strokes: 6, target: 6, elapsed: 4.5, par: 2 }), 85)
  // mul nới ngưỡng đều nhịp
  assert.equal(scoreLac({ strokes: 6, target: 6, cv: 0.7, mul: 1.2 }), 100)
  assert.equal(scoreLac({ strokes: 6, target: 6, cv: 0.7, mul: 1 }), 90)
})

test('scoreLac: sát ngưỡng 90 / 70 / 50', () => {
  assert.equal(scoreLac({ strokes: 9, target: 10 }), 90)
  assert.equal(stepLabel(scoreLac({ strokes: 8, target: 9 })), 'Tốt', '8/9 = 89 → chưa tới Hoàn hảo')
  assert.equal(scoreLac({ strokes: 8, target: 10 }), 80)
  assert.equal(scoreLac({ strokes: 8, target: 10, cv: 1 }), 70)
  assert.equal(scoreLac({ strokes: 6, target: 8, cv: 1, elapsed: 9, par: 4 }), 50)
  assert.equal(stepLabel(scoreLac({ strokes: 4, target: 9 })), 'Hỏng')
})

test('scoreLac: đầu vào lỗi không ra NaN; chưa lắc = 0', () => {
  assert.equal(scoreLac({}), 0)
  assert.equal(scoreLac(), 0)
  assert.equal(scoreLac({ strokes: -2, target: 6 }), 0)
  for (const b of BAD) {
    for (const key of ['strokes', 'target', 'cv', 'elapsed', 'par', 'mul']) {
      assert.ok(ok(scoreLac({ strokes: 6, target: 6, [key]: b })), `${key} ${String(b)}`)
    }
  }
})

test('scoreBay: điểm vị trí (≤0,35·m 100, ≤0,6·m 80, ≤1 55); −30 mỗi món lệch số lượng; chưa thả = 0', () => {
  assert.equal(bayPlaceScore(0), 100)
  assert.equal(bayPlaceScore(0.35), 100)
  assert.equal(bayPlaceScore(0.36), 80)
  assert.equal(bayPlaceScore(0.6), 80)
  assert.equal(bayPlaceScore(0.61), 55)
  assert.equal(bayPlaceScore(1), 55)
  assert.equal(bayPlaceScore(1.2), 20)
  assert.equal(scoreBay({ placed: [0.1, 0.2], n: 2 }), 100)
  assert.equal(scoreBay({ placed: [{ d: 0.1 }, { d: 0.2 }], n: 2 }), 100, 'nhận cả { d }')
  assert.equal(scoreBay({ placed: [0.1], n: 2 }), 70)
  assert.equal(scoreBay({ placed: [0.1, 0.1, 0.1], n: 2 }), 70)
  assert.equal(scoreBay({ placed: [0.1, 0.1, 0.1], n: 1 }), 40)
  assert.equal(scoreBay({ placed: [], n: 2 }), 0)
  // ghi chú "Ít đá" (n = 1): thả đúng 1 viên là 100
  assert.equal(scoreBay({ placed: [0.2], n: 1 }), 100)
})

test('scoreBay: sát ngưỡng 90 / 70 / 50; mul nới vùng', () => {
  assert.equal(scoreBay({ placed: [0.2, 0.5], n: 2 }), 90)
  assert.equal(stepLabel(scoreBay({ placed: [0.2, 0.5], n: 2 })), 'Hoàn hảo')
  assert.equal(scoreBay({ placed: [0.2], n: 2 }), 70)
  assert.equal(scoreBay({ placed: [0.5, 0.5], n: 3 }), 50)
  assert.equal(stepLabel(scoreBay({ placed: [0.9, 0.5], n: 3 })), 'Hỏng')
  assert.equal(scoreBay({ placed: [0.45], n: 1, mul: 1 }), 80)
  assert.equal(scoreBay({ placed: [0.45], n: 1, mul: 1.3 }), 100)
})

test('scoreBay: đầu vào lỗi không ra NaN', () => {
  assert.equal(scoreBay({}), 0)
  assert.equal(scoreBay(), 0)
  for (const b of BAD) {
    assert.ok(ok(scoreBay({ placed: b, n: 2 })), `placed ${String(b)}`)
    assert.ok(ok(scoreBay({ placed: [b, 0.1], n: 2 })), `d ${String(b)}`)
    assert.ok(ok(scoreBay({ placed: [0.1], n: b })), `n ${String(b)}`)
    assert.ok(ok(scoreBay({ placed: [0.1], n: 1, mul: b })), `mul ${String(b)}`)
  }
  assert.equal(bayPlaceScore(NaN), 0)
  assert.equal(bayPlaceScore(-0.2), 100, 'khoảng cách lấy trị tuyệt đối')
})

test('năm hàm mới luôn trả số nguyên 0..100 (quét ngẫu nhiên tất định)', () => {
  let a = 12345
  const r = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648 }
  for (let k = 0; k < 400; k++) {
    const n = 1 + Math.floor(r() * 4)
    assert.ok(ok(scoreDap({ cracks: Array.from({ length: n }, () => ({ force: r() * 1.2 - 0.1, split: r() < 0.8, shell: r() < 0.2 })), n, mul: 0.5 + r() })))
    assert.ok(ok(scoreXoay({ turns: r() * 8, target: n + 2, spills: Math.floor(r() * 3), cv: r(), elapsed: r() * 12, par: 4, mul: 0.8 + r() })))
    assert.ok(ok(scoreGot({ coverage: Array.from({ length: 5 }, () => r()), target: 5, misses: Math.floor(r() * 5), elapsed: r() * 9, par: 3 })))
    assert.ok(ok(scoreLac({ strokes: Math.floor(r() * 10), target: 6, cv: r(), elapsed: r() * 6, par: 2, mul: 1 })))
    assert.ok(ok(scoreBay({ placed: Array.from({ length: Math.floor(r() * 4) }, () => r() * 1.2), n, mul: 0.8 + r() })))
  }
})
