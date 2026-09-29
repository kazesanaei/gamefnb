import test from 'node:test'
import assert from 'node:assert/strict'
import {
  zoneMul, scoreChon, scoreCha, scoreThai, scoreChamExact, scoreChamMin, scoreChamTargets,
  scoreLua, scoreRot, zoneScore, stepLabel
} from '../../src/core/minigame-scoring.js'
import { defaultState } from '../../src/core/state.js'
import { BALANCE, UPGRADES } from '../fixtures/data.mjs'

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps

test('zoneMul: chặng, hẹp dần theo ngày, dụng cụ, thạo món, hỗ trợ, trần', () => {
  const s = defaultState(1)
  assert.ok(near(zoneMul(s, 'thai', 'banh_mi_op_la', BALANCE), 1.2))
  s.day = 6
  assert.ok(near(zoneMul(s, 'thai', 'banh_mi_op_la', BALANCE), 1.2 * 0.9))
  s.day = 40
  assert.ok(near(zoneMul(s, 'thai', 'banh_mi_op_la', BALANCE), 1.2 * 0.75))
  s.day = 1
  s.upgrades.dao_thep = true
  assert.ok(near(zoneMul(s, 'thai', 'banh_mi_op_la', BALANCE, UPGRADES), 1.2 * 1.2))
  assert.ok(near(zoneMul(s, 'lua', 'banh_mi_op_la', BALANCE, UPGRADES), 1.2))
  s.upgrades.chao_chong_dinh = true
  assert.ok(near(zoneMul(s, 'lua', 'banh_mi_op_la', BALANCE), 1.2 * 1.15))
  s.recipes.banh_mi_op_la.goodCooks = 5
  assert.ok(near(zoneMul(s, 'lua', 'banh_mi_op_la', BALANCE), 1.2 * 1.15 * 1.05))
  s.recipes.banh_mi_op_la.goodCooks = 15
  assert.ok(near(zoneMul(s, 'cham', 'banh_mi_op_la', BALANCE), 1.2 * 1.10))
  s.settings.assistMotion = true
  assert.equal(zoneMul(s, 'thai', 'banh_mi_op_la', BALANCE), 1.6)   // 1,2 × 1,2 × 1,1 × 1,25 = 1,98 → trần
})

test('scoreChon', () => {
  const r = scoreChon({ required: ['a', 'b'], optional: ['o'], decoys: ['d'], picked: ['a', 'd', 'x'], mistakes: 2 })
  assert.equal(r.score, 70)
  assert.deepEqual(r.errors.map(e => e.code).sort(), ['bay', 'thieu', 'thua'])
  assert.equal(scoreChon({ required: ['a'], picked: ['a'], mistakes: 9 }).score, 0)
})

test('scoreCha: vết bẩn, số lần đổi chiều, quá giờ', () => {
  assert.equal(scoreCha({ spots: [1, 1, 1, 1], elapsed: 2, par: 3 }), 100)
  assert.equal(scoreCha({ spots: [1, 0.5, 1, 0.5], elapsed: 2, par: 3 }), 75)
  assert.equal(scoreCha({ spots: [1, 1, 1, 1], elapsed: 6, par: 3 }), 100)   // đúng 2×par chưa phạt
  assert.equal(scoreCha({ spots: [1, 1, 1, 1], elapsed: 6.01, par: 3 }), 85)
  assert.equal(scoreCha({ strokes: 6, reversals: 3, elapsed: 1, par: 2 }), 50)
  assert.equal(scoreCha({ strokes: 6, reversals: 9, elapsed: 1, par: 2 }), 100)
  assert.equal(scoreCha({ spots: [0, 0], elapsed: 10, par: 2 }), 0)
})

test('scoreThai: ngưỡng px (biên), nhát thừa, thiếu nhát, hệ số vùng', () => {
  assert.equal(scoreThai({ cuts: [6, 0, -6], expected: 3 }), 100)
  assert.equal(scoreThai({ cuts: [6.01], expected: 1 }), 80)
  assert.equal(scoreThai({ cuts: [14], expected: 1 }), 80)
  assert.equal(scoreThai({ cuts: [14.5], expected: 1 }), 55)
  assert.equal(scoreThai({ cuts: [24], expected: 1 }), 55)
  assert.equal(scoreThai({ cuts: [25], expected: 1 }), 20)
  assert.equal(scoreThai({ cuts: [0, 0], expected: 4 }), 50)            // thiếu 2 nhát = 0
  assert.equal(scoreThai({ cuts: [0, 0, 0], expected: 3, extra: 1 }), 90)
  assert.equal(scoreThai({ cuts: [0, 0, 0, 3], expected: 3 }), 90)      // nhát dư tính là thừa
  assert.equal(scoreThai({ cuts: [9], expected: 1, mul: 1.5 }), 100)    // ngưỡng × mul
})

test('scoreCham: exact/min/targets', () => {
  assert.equal(scoreChamExact({ taps: 2, n: 2 }), 100)
  assert.equal(scoreChamExact({ taps: 3, n: 2 }), 70)
  assert.equal(scoreChamExact({ taps: 0, n: 2 }), 0)
  assert.equal(scoreChamExact({ taps: 2, n: 2, distances: [0.08, 0.15] }), 90)
  assert.equal(scoreChamExact({ taps: 2, n: 2, distances: [0.25, 0.3] }), 38)
  assert.equal(scoreChamExact({ taps: 1, n: 1, distances: [0.1], mul: 1.25 }), 100)
  assert.equal(scoreChamMin({ taps: 6, N: 6 }), 100)
  assert.equal(scoreChamMin({ taps: 7, N: 6 }), 100)       // r = 1,17
  assert.equal(scoreChamMin({ taps: 8, N: 6 }), 80)        // 1,33
  assert.equal(scoreChamMin({ taps: 5, N: 6 }), 55)        // 0,83
  assert.equal(scoreChamMin({ taps: 3, N: 6 }), 20)
  assert.equal(scoreChamMin({ taps: 0, N: 6 }), 0)
  assert.equal(scoreChamTargets({ counts: { a: 1, b: 2 }, targets: { a: 1, b: 2 } }), 100)
  assert.equal(scoreChamTargets({ counts: { a: 2 }, targets: { a: 1, b: 1 } }), 40)
  assert.equal(scoreChamTargets({ counts: { a: 5 }, targets: { a: 1 } }), 0)
})

test('scoreLua: liên tục, đối xứng, biên cháy', () => {
  const zone = [0.55, 0.72]           // c = 0,635; h = 0,085
  const c = 0.635, h = 0.085
  assert.equal(scoreLua({ value: c, zone }), 100)
  assert.equal(scoreLua({ value: c + 0.3 * h, zone }), 100)
  assert.equal(scoreLua({ value: c + h, zone }), 80)
  assert.equal(scoreLua({ value: c - h, zone }), 80)
  assert.equal(scoreLua({ value: c + h + 0.08, zone }), 55)
  assert.equal(scoreLua({ value: c - h - 0.08, zone }), 55)
  assert.equal(scoreLua({ value: 0, zone }), 10)
  assert.equal(scoreLua({ value: 1.0, zone }), 25)       // muộn nhưng chưa cháy
  assert.equal(scoreLua({ value: 1.0001, zone }), 0)
  assert.equal(scoreLua({ value: 1.2, zone }), 0)
  // đối xứng và liên tục
  for (let x = 0; x < 0.3; x += 0.01) {
    assert.equal(zoneScore(c + x, zone), zoneScore(c - x, zone))
    assert.ok(Math.abs(zoneScore(c + x, zone) - zoneScore(c + x + 0.001, zone)) <= 1)
  }
  // đơn điệu giảm theo khoảng cách
  let prev = 101
  for (let x = 0; x < 0.6; x += 0.01) { const s = zoneScore(c + x, zone); assert.ok(s <= prev); prev = s }
  // mul rộng vùng
  assert.equal(scoreLua({ value: c + h, zone, mul: 1.6 }), 91)
})

test('scoreRot: tràn > 1,02 → 0', () => {
  const zone = [0.70, 0.82]
  assert.equal(scoreRot({ level: 0.76, zone }), 100)
  assert.equal(scoreRot({ level: 1.02, zone }), 37)
  assert.equal(scoreRot({ level: 1.021, zone }), 0)
  assert.equal(scoreRot({ level: 0.82, zone }), 80)
})

test('stepLabel', () => {
  assert.equal(stepLabel(95), 'Hoàn hảo')
  assert.equal(stepLabel(90), 'Hoàn hảo')
  assert.equal(stepLabel(89), 'Tốt')
  assert.equal(stepLabel(50), 'Đạt')
  assert.equal(stepLabel(49), 'Hỏng')
})
