// Hợp đồng plugin mini-game (mục 13 docs/kien-truc.md) và các hàm thuần của giao diện bếp.
// Import được trong Node vì plugin chỉ chạm DOM bên trong mount().
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MINIGAMES, playStep, hintFor } from '../../src/ui/minigames/index.js'
import {
  scaledZone, thaiGuides, nearestUncut, createReversalCounter, rotSpeed, ROT_NEAR_CAP, luaValue,
  stepLimitSec, uiRand, hashKey
} from '../../src/ui/minigames/_util.js'
import { layoutSpots } from '../../src/ui/minigames/cha.js'
import { doneness } from '../../src/ui/minigames/lua.js'
import { mountKitchen, waitLevel, waitRatio, moodForGrade, dishComment } from '../../src/ui/screens/kitchen.js'
import kitchenScreen from '../../src/ui/screens/kitchen.js'
import { DATA } from '../../src/data/index.js'

const TYPES = ['chon', 'cha', 'thai', 'cham', 'lua', 'rot']

test('mỗi file plugin export default {type, mount} đúng loại', async () => {
  for (const t of TYPES) {
    const mod = await import(`../../src/ui/minigames/${t}.js`)
    assert.ok(mod.default, `${t}.js thiếu export default`)
    assert.equal(mod.default.type, t)
    assert.equal(typeof mod.default.mount, 'function')
    assert.equal(mod.default.mount.length >= 2, true, `${t}.mount nhận (stage, step, ctx)`)
  }
})

test('MINIGAMES gồm đủ 6 loại, khớp MINIGAME_TYPES trong dữ liệu', () => {
  assert.deepEqual(Object.keys(MINIGAMES).sort(), [...TYPES].sort())
  for (const t of TYPES) assert.equal(MINIGAMES[t].type, t)
  for (const t of Object.keys(DATA.MINIGAME_TYPES)) assert.ok(MINIGAMES[t], `thiếu plugin cho ${t}`)
  assert.equal(typeof playStep, 'function')
})

test('mọi bước trong công thức đều có plugin và thẻ gợi ý', () => {
  for (const r of Object.values(DATA.RECIPES)) {
    for (const s of r.steps) {
      assert.ok(MINIGAMES[s.type], `${r.id}.${s.id}: không có plugin ${s.type}`)
      const hint = hintFor(s, DATA)
      assert.ok(hint.text && hint.text.length > 5, `${r.id}.${s.id}: thiếu gợi ý`)
    }
  }
})

test('playStep báo lỗi rõ với loại bước lạ', () => {
  assert.throws(() => playStep({}, { type: 'khong_co' }, {}), /Không có mini-game/)
})

test('màn bếp export mountKitchen và quy ước router', () => {
  assert.equal(typeof mountKitchen, 'function')
  assert.equal(typeof kitchenScreen.mount, 'function')
})

test('scaledZone nhân quanh tâm và kẹp biên', () => {
  const [a, b] = scaledZone([0.55, 0.72], 1.2, 0, 1.2)
  assert.ok(Math.abs((a + b) / 2 - 0.635) < 1e-9)
  assert.ok(Math.abs((b - a) - 0.17 * 1.2) < 1e-9)
  const [c, d] = scaledZone([0.9, 1.0], 3, 0, 1)
  assert.ok(Math.abs(c - 0.8) < 1e-9)
  assert.equal(d, 1)
})

test('vạch thái nằm trong nguyên liệu, đủ số, không trùng nhau', () => {
  for (const n of [1, 3, 5, 6, 9, 10]) {
    for (const w of [280, 320, 360]) {
      const xs = thaiGuides(n, w, uiRand(hashKey(`${n}:${w}`)))
      assert.equal(xs.length, n)
      for (const x of xs) assert.ok(x > 0 && x < w, `vạch ${x} ngoài [0,${w}]`)
      for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 14, `vạch quá sát: ${xs}`)
    }
  }
})

test('nhát cắt gán cho vạch chưa cắt gần nhất', () => {
  const g = [50, 100, 150]
  const cut = [null, null, null]
  let hit = nearestUncut(g, cut, 104)
  assert.deepEqual(hit, { index: 1, dev: 4 })
  cut[1] = hit.dev
  hit = nearestUncut(g, cut, 99)           // vạch 1 đã cắt → vạch 0 gần hơn vạch 2
  assert.deepEqual(hit, { index: 0, dev: 49 })
  cut[0] = 0; cut[2] = 0
  assert.equal(nearestUncut(g, cut, 10), null)
})

test('đếm đổi chiều bỏ qua rung tay nhỏ', () => {
  const rc = createReversalCounter(20)
  for (const x of [100, 105, 98, 103]) rc.push(x)
  assert.equal(rc.count, 0)
  for (const x of [140, 180, 150, 120, 90, 130, 170]) rc.push(x)
  assert.equal(rc.count, 2)
})

test('tốc độ rót gần vạch không quá 25%/giây; rót bù chậm hơn', () => {
  for (let hold = 0; hold < 6; hold += 0.25) {
    for (let lv = 0.5; lv <= 1.02; lv += 0.01) {
      assert.ok(rotSpeed(lv, hold, 1, 0.62) <= ROT_NEAR_CAP + 1e-9)
    }
  }
  assert.ok(ROT_NEAR_CAP <= 0.25)
  assert.ok(rotSpeed(0.1, 3, 1, 0.7) > rotSpeed(0.1, 0, 1, 0.7), 'dâng nhanh dần')
  assert.ok(rotSpeed(0.7, 3, 2, 0.7) < rotSpeed(0.7, 3, 1, 0.7))
})

test('kim canh lửa đi 0 → 1,2 trong period giây; chảo chống dính chậm lại qua vùng', () => {
  assert.equal(luaValue(0, 5), 0)
  assert.ok(Math.abs(luaValue(5, 5) - 1.2) < 1e-9)
  assert.ok(luaValue(5, 5, 0.8) < 1.2)
  assert.ok(Math.abs(luaValue(2, 5, 0.8) - luaValue(2, 5)) < 1e-9)
  assert.equal(doneness(1.05), 'chay')
  assert.equal(doneness(0.2), 'song')
})

test('giới hạn thời gian 2,5 × par; Hỗ trợ thao tác × 1,5', () => {
  assert.equal(stepLimitSec(4), 10)
  assert.equal(stepLimitSec(4, true), 15)
})

test('vết bẩn được rải đủ số, trong vùng', () => {
  const pts = layoutSpots(8, 160, 140, 90, 50, uiRand(7))
  assert.equal(pts.length, 8)
  for (const p of pts) assert.ok(Math.hypot(p.x - 160, p.y - 140) <= 91)
})

test('màu viền phiếu theo ngân sách chờ', () => {
  assert.equal(waitLevel(0.2), 'green')
  assert.equal(waitLevel(0.5), 'yellow')
  assert.equal(waitLevel(0.8), 'yellow')
  assert.equal(waitLevel(0.81), 'red')
  const sh = { t: 50, customers: { k1: { waitStart: 10, waitBudget: 80 } } }
  assert.equal(waitRatio(sh, { customerId: 'k1', createdAt: 10 }), 0.5)
  assert.equal(waitRatio(sh, { customerId: 'k9', createdAt: 10 }), 0)
})

test('Dì Sáu góp ý đúng lỗi nặng nhất / bước kém nhất', () => {
  const R = DATA.RECIPES.banh_mi_op_la
  assert.equal(moodForGrade('tuyet_hao'), 'tu_hao')
  assert.equal(moodForGrade('hong'), 'tiec')
  assert.equal(moodForGrade('duoc'), 'lo')
  const bay = dishComment({ q: 60, notes: [], ingErrors: [{ code: 'thieu_phu', ing: 'dua_leo' }, { code: 'bay', ing: 'nuoc_mam' }], steps: {} }, R, DATA)
  assert.match(bay, /Nước mắm đâu phải nước tương/)
  const trai = dishComment({ q: 60, notes: ['khong_hanh'], ingErrors: [{ code: 'trai_ghi_chu', ing: 'hanh_la' }], steps: {} }, R, DATA)
  assert.match(trai, /Không hành/)
  const chay = dishComment({ q: 30, notes: [], ingErrors: [], steps: { chon: { score: 100 }, chien_trung: { score: 0, tag: 'chay' }, rua_dua: { score: 60 } } }, R, DATA)
  assert.match(chay, /Chiên trứng bị cháy/)
  const quen = dishComment({ q: 70, notes: [], ingErrors: [], steps: { rua_dua: { score: 0, tag: 'bo_qua', skipped: true } } }, R, DATA)
  assert.match(quen, /quên rửa dưa leo/)
  const sai = dishComment({ q: 80, notes: [], ingErrors: [], steps: { thai_dua: { score: 85, tag: 'sai_cach' } } }, R, DATA)
  assert.match(sai, /Dưa leo phải thái lát/)
  const khen = dishComment({ q: 95, notes: [], ingErrors: [], steps: { chon: { score: 100 } } }, R, DATA)
  assert.ok(DATA.DIALOGUE.diSau.praise.includes(khen))
})
