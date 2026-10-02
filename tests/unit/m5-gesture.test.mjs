// M5 (0.5.0): hàm thuần đo cử chỉ của năm thao tác mới (src/ui/minigames/_gesture.js, thiết kế M5 mục 1.5):
// đếm vòng (tháo vòng góc, cả hai chiều, tốc độ, độ đều), sánh ra khi quay quá nhanh, phân loại vuốt, độ phủ dải, đổi chiều
// và nhịp, kim thước lực, sàn giờ theo số lượng. Import trong Node không chạm DOM.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createTurnCounter, createSpillMeter, classifySwipe, bandCoverage, mergeSegments, createRhythm, createReversalCounter,
  needleValue, NEEDLE_PERIOD, minLimitSec, MIN_LIMIT, gestureLimitSec, cvOf
} from '../../src/ui/minigames/_gesture.js'
import { stepLimitSec } from '../../src/ui/minigames/_util.js'

// Vẽ vòng tròn bán kính r quanh (cx, cy): `turns` vòng, `perTurn` điểm mỗi vòng, mỗi vòng `sec` giây; dir 1 / −1.
function circle(tc, { cx = 100, cy = 100, r = 80, turns = 1, perTurn = 24, sec = 1, dir = 1, t0 = 0, a0 = 0 } = {}) {
  let t = t0
  const n = Math.round(turns * perTurn)
  for (let i = 0; i <= n; i++) {
    const a = a0 + dir * (i / perTurn) * Math.PI * 2
    tc.push(cx + r * Math.cos(a), cy + r * Math.sin(a), t)
    if (i < n) t += sec / perTurn
  }
  return t
}

test('createTurnCounter: đếm vòng theo cả hai chiều, tốc độ (vòng/giây), vòng trọn', () => {
  const a = createTurnCounter({ cx: 100, cy: 100, minR: 10 })
  circle(a, { turns: 3, sec: 1 })
  assert.ok(Math.abs(a.turns - 3) < 1e-6, String(a.turns))
  assert.equal(a.laps, 3)
  assert.ok(Math.abs(a.speed() - 1) < 0.05, 'khoảng 1 vòng/giây')
  const b = createTurnCounter({ cx: 100, cy: 100, minR: 10 })
  circle(b, { turns: 2, sec: 0.5, dir: -1 })
  assert.ok(Math.abs(b.turns - 2) < 1e-6, 'ngược chiều kim đồng hồ cũng tính')
  assert.ok(Math.abs(b.speed() - 2) < 0.1, 'khoảng 2 vòng/giây')
  // nửa vòng
  const c = createTurnCounter({ cx: 0, cy: 0 })
  circle(c, { cx: 0, cy: 0, turns: 0.5 })
  assert.ok(Math.abs(c.turns - 0.5) < 1e-6)
  assert.equal(c.laps, 0)
})

test('createTurnCounter: tháo vòng góc qua mốc ±π, không lùi khi đổi chiều, bỏ điểm sát tâm', () => {
  const tc = createTurnCounter({ cx: 0, cy: 0, minR: 20 })
  // bắt đầu ngay cạnh mốc π (bên trái tâm) và quay qua mốc
  circle(tc, { cx: 0, cy: 0, r: 60, turns: 1, a0: Math.PI - 0.05 })
  assert.ok(Math.abs(tc.turns - 1) < 1e-6, String(tc.turns))
  // đổi chiều nửa vòng: số vòng đã đạt không giảm
  circle(tc, { cx: 0, cy: 0, r: 60, turns: 0.5, dir: -1, a0: Math.PI - 0.05 })
  assert.ok(Math.abs(tc.turns - 1) < 1e-6, 'không lùi')
  // điểm sát tâm (trong minR) bị bỏ, không nhảy góc
  const before = tc.turns
  tc.push(1, 1, 5)
  tc.push(-60, 0.1, 5.1)
  assert.equal(tc.turns, before)
  // lift(): điểm sau không nối với điểm trước (nhảy nửa vòng không được tính)
  const d = createTurnCounter({ cx: 0, cy: 0 })
  d.push(50, 0, 0)
  d.lift()
  d.push(-50, 0.01, 0.1)
  assert.equal(d.turns, 0)
  // đầu vào lỗi không làm hỏng
  d.push(NaN, undefined, 'x')
  assert.ok(Number.isFinite(d.turns))
})

test('createTurnCounter: cv của thời gian mỗi vòng — đều tay ≈ 0, giật cục thì lớn; setCenter đổi tâm', () => {
  const even = createTurnCounter({ cx: 100, cy: 100 })
  let t = 0
  for (let k = 0; k < 4; k++) t = circle(even, { turns: 1, sec: 1, t0: t, a0: 0 })
  assert.equal(even.laps, 4)
  assert.ok(even.cv() < 0.1, String(even.cv()))
  const jerky = createTurnCounter({ cx: 100, cy: 100 })
  t = 0
  for (const sec of [0.4, 1.6, 0.5, 1.8]) t = circle(jerky, { turns: 1, sec, t0: t })
  assert.ok(jerky.cv() > 0.45, String(jerky.cv()))
  const s = createTurnCounter({ cx: 0, cy: 0 })
  s.setCenter(200, 200, 5)
  circle(s, { cx: 200, cy: 200, turns: 1 })
  assert.ok(Math.abs(s.turns - 1) < 1e-6)
})

test('createSpillMeter: vượt tốc độ liên tục quá 0,25 s mới sánh; chậm lại mới tính lần sau', () => {
  const m = createSpillMeter({ max: 2.2, holdSec: 0.25 })
  assert.equal(m.push(3, 0), false)
  assert.equal(m.push(3, 0.2), false)
  assert.equal(m.push(3, 0.26), true)
  assert.equal(m.count, 1)
  assert.equal(m.push(3, 0.4), false, 'đang sánh, chưa tính thêm')
  assert.equal(m.push(1, 0.5), false)
  assert.equal(m.push(3, 0.6), false)
  assert.equal(m.push(3, 0.9), true)
  assert.equal(m.count, 2)
  // nhá qua ngưỡng ngắn không tính
  const q = createSpillMeter({ max: 2 })
  for (let i = 0; i < 20; i++) q.push(i % 2 ? 3 : 1, i * 0.1)
  assert.equal(q.count, 0)
})

test('classifySwipe: đủ dài, đúng chiều, lệch trục ≤ tolDeg', () => {
  const P = { x: 100, y: 100 }
  assert.deepEqual(classifySwipe(P, { x: 100, y: 180 }, { axis: 'y', tolDeg: 35, minLen: 24, dir: 1 }), { ok: true, reason: 'ok', len: 80, dev: 0 })
  assert.equal(classifySwipe(P, { x: 100, y: 110 }).reason, 'ngan')
  assert.equal(classifySwipe(P, { x: 100, y: 20 }).reason, 'nguoc')
  assert.equal(classifySwipe(P, { x: 100, y: 20 }, { dir: -1 }).ok, true)
  assert.equal(classifySwipe(P, { x: 100, y: 20 }, { dir: 0 }).ok, true, 'dir 0: chiều nào cũng được')
  // lệch 30° được, 40° không (tol 35)
  const at = deg => ({ x: 100 + 80 * Math.sin(deg * Math.PI / 180), y: 100 + 80 * Math.cos(deg * Math.PI / 180) })
  assert.equal(classifySwipe(P, at(30)).ok, true)
  assert.equal(classifySwipe(P, at(40)).reason, 'lech')
  assert.equal(classifySwipe(P, at(40), { tolDeg: 35 * 1.3 }).ok, true, 'mul nới góc')
  // trục ngang
  assert.equal(classifySwipe(P, { x: 160, y: 104 }, { axis: 'x' }).ok, true)
  // đầu vào lỗi
  const bad = classifySwipe(null, { x: NaN })
  assert.equal(bad.ok, false)
  assert.ok(Number.isFinite(bad.len) && Number.isFinite(bad.dev))
})

test('bandCoverage: hợp các đoạn, cắt trong dải, đoạn chồng tính một lần, đoạn lỗi bỏ qua', () => {
  assert.equal(bandCoverage([[0, 100]], 0, 100), 1)
  assert.equal(bandCoverage([[0, 50]], 0, 100), 0.5)
  assert.equal(bandCoverage([[0, 50], [40, 80]], 0, 100), 0.8)
  assert.equal(bandCoverage([[80, 40], [0, 50]], 0, 100), 0.8, 'đoạn ngược chiều')
  assert.equal(bandCoverage([[-50, 30], [90, 300]], 0, 100), 0.4, 'cắt trong dải')
  assert.equal(bandCoverage([{ a: 10, b: 20 }, { a: 30, b: 40 }], 0, 100), 0.2)
  assert.equal(bandCoverage([[NaN, 50], null, 'x', [20, 30]], 0, 100), 0.1)
  assert.equal(bandCoverage([], 0, 100), 0)
  assert.equal(bandCoverage([[0, 10]], 50, 50), 0, 'dải rỗng')
  assert.equal(bandCoverage(null, 0, 1), 0)
  assert.deepEqual(mergeSegments([[0.5, 0.7], [0, 0.2], [0.1, 0.3], [0.65, 0.9]], 0, 1), [[0, 0.3], [0.5, 0.9]])
})

test('createRhythm: nhịp đều → cv 0; nhịp lệch → cv lớn; mean', () => {
  const r = createRhythm()
  for (let i = 0; i < 6; i++) r.beat(i * 0.25)
  assert.equal(r.count, 6)
  assert.equal(r.cv(), 0)
  assert.ok(Math.abs(r.mean() - 0.25) < 1e-9)
  const j = createRhythm()
  for (const t of [0, 0.1, 0.6, 0.7, 1.5, 1.55]) j.beat(t)
  assert.ok(j.cv() > 0.6, String(j.cv()))
  j.beat(NaN)
  assert.equal(j.count, 6, 'nhịp lỗi bỏ qua')
  assert.equal(cvOf([]), 0)
  assert.equal(cvOf([1]), 0)
  assert.equal(cvOf([2, 2, 2]), 0)
})

test('createReversalCounter: đổi chiều trên một trục có ngưỡng chống rung tay; đo nhịp; nhận cả số', () => {
  const rc = createReversalCounter({ threshold: 24 })
  // rung tay nhỏ không tính
  for (const y of [300, 305, 298, 303]) rc.push(y, 0)
  assert.equal(rc.count, 0)
  // lắc lên xuống ±70px đều nhịp 0,1 s
  let t = 0
  for (let k = 0; k < 8; k++) { t += 0.1; rc.push(k % 2 ? 230 : 370, t) }
  assert.equal(rc.count, 7)
  assert.ok(rc.cv() < 0.05, String(rc.cv()))
  // tương thích kiểu cũ: ngưỡng là số
  const old = createReversalCounter(20)
  for (const x of [100, 105, 98, 103]) old.push(x)
  assert.equal(old.count, 0)
  for (const x of [140, 180, 150, 120, 90, 130, 170]) old.push(x)
  assert.equal(old.count, 2)
  // reset (nhấc ngón): cú nhảy giữa hai lần chạm không thành lượt
  const r2 = createReversalCounter({ threshold: 24 })
  r2.push(100, 0); r2.push(200, 0.1)
  r2.reset()
  r2.push(100, 0.5)
  assert.equal(r2.count, 0)
  r2.push(NaN, 0.6)
  assert.equal(r2.count, 0)
})

test('needleValue: kim chạy đi về 0 → 1 → 0, chu kỳ 1,1 s; đầu vào lỗi → 0', () => {
  assert.equal(NEEDLE_PERIOD, 1.1)
  assert.equal(needleValue(0), 0)
  assert.equal(needleValue(0.55), 1)
  assert.ok(Math.abs(needleValue(1.1)) < 1e-9)
  assert.equal(needleValue(0.275), 0.5)
  assert.equal(needleValue(0.825), 0.5)
  assert.equal(needleValue(1.1 + 0.275), 0.5, 'lặp theo chu kỳ')
  assert.equal(needleValue(1, 2), 1)
  assert.equal(needleValue(NaN), 0)
  assert.equal(needleValue(0.5, 0), needleValue(0.5), 'chu kỳ lỗi → mặc định')
  for (let t = 0; t < 5; t += 0.037) {
    const v = needleValue(t)
    assert.ok(v >= 0 && v <= 1)
  }
})

test('minLimitSec: sàn giờ theo bảng thiết kế (dap 1,5n+1; xoay 1,1·turns+1; got 1,2·strips+1; lac 0,4·strokes+1; bay 1,3n+1,5)', () => {
  assert.equal(minLimitSec('dap', { n: 2 }), 4)
  assert.equal(minLimitSec('dap', { n: 3 }), 5.5)
  assert.equal(minLimitSec('xoay', { turns: 5 }), 6.5)
  assert.equal(minLimitSec('got', { strips: 5 }), 7)
  assert.equal(minLimitSec('lac', { strokes: 6 }), 3.4)
  assert.equal(minLimitSec('bay', { n: 2 }), 4.1)
  assert.equal(minLimitSec('thai', { cuts: 3 }), 0, 'loại cũ không có sàn')
  assert.equal(minLimitSec('dap', {}), 2.5, 'thiếu tham số → 1')
  assert.equal(minLimitSec('dap', null), 2.5)
  assert.deepEqual(Object.keys(MIN_LIMIT).sort(), ['bay', 'dap', 'got', 'lac', 'xoay'])
})

test('gestureLimitSec = max(2,5 × par, sàn giờ) (Hỗ trợ thao tác × 1,5 cả hai); nấu thử: không giới hạn', () => {
  // thêm trứng ×2 phần: n = 6, par 2 × 1,4 = 2,8 → 2,5 × 2,8 = 7 < sàn 10
  assert.equal(gestureLimitSec({ type: 'dap', params: { n: 6 }, par: 2.8 }), 10)
  // bình thường: 2,5 × par lớn hơn
  assert.equal(gestureLimitSec({ type: 'dap', params: { n: 2 }, par: 2 }), Math.max(stepLimitSec(2), 4))
  assert.equal(gestureLimitSec({ type: 'xoay', params: { turns: 5 }, par: 4 }), 10)
  assert.equal(gestureLimitSec({ type: 'got', params: { strips: 5 }, par: 3 }), 7.5)
  assert.equal(gestureLimitSec({ type: 'got', params: { strips: 10 }, par: 4.2 }), 13)
  assert.equal(gestureLimitSec({ type: 'dap', params: { n: 6 }, par: 2.8 }, { assist: true }), 15)
  assert.equal(gestureLimitSec({ type: 'bay', params: { n: 2 }, par: 2 }, { untimed: true }), Infinity)
  assert.equal(gestureLimitSec({ type: 'thai', params: { cuts: 3 }, par: 4 }), stepLimitSec(4))
  assert.ok(Number.isFinite(gestureLimitSec(null)))
})
