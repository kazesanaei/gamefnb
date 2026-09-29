import test from 'node:test'
import assert from 'node:assert/strict'
import { hashString, seedFrom, nextFloat, nextInt, pick, weightedPick, shuffle, makeRand } from '../../src/core/rng.js'

test('hashString: FNV-1a 32 bit chuẩn', () => {
  assert.equal(hashString(''), 0x811c9dc5)
  assert.equal(hashString('a'), 0xe40c292c)
  assert.equal(hashString('foobar'), 0xbf9cf968)
})

test('seedFrom tất định và phân biệt thứ tự', () => {
  assert.equal(seedFrom(1, 'x'), seedFrom(1, 'x'))
  assert.notEqual(seedFrom(1, 2), seedFrom(2, 1))
  assert.notEqual(seedFrom(12, 3), seedFrom(1, 23))
})

test('nextFloat tất định, trong [0,1), trạng thái nằm trong JSON', () => {
  const a = { rng: 42 }, b = { rng: 42 }
  const xs = Array.from({ length: 200 }, () => nextFloat(a))
  const ys = Array.from({ length: 200 }, () => nextFloat(b))
  assert.deepEqual(xs, ys)
  for (const x of xs) assert.ok(x >= 0 && x < 1)
  // khôi phục từ JSON giữa chừng cho cùng dãy
  const c = { rng: 7 }
  nextFloat(c); nextFloat(c)
  const d = JSON.parse(JSON.stringify(c))
  assert.equal(nextFloat(c), nextFloat(d))
  // khóa tùy chọn
  const h = { other: 5 }
  nextFloat(h, 'other')
  assert.notEqual(h.other, 5)
  assert.equal(h.rng, undefined)
})

test('nextInt bao cả hai đầu; pick/weightedPick/shuffle', () => {
  const h = { rng: 1 }
  const seen = new Set()
  for (let i = 0; i < 500; i++) { const v = nextInt(h, 1, 4); assert.ok(v >= 1 && v <= 4); seen.add(v) }
  assert.deepEqual([...seen].sort(), [1, 2, 3, 4])
  assert.equal(pick(h, []), undefined)
  for (let i = 0; i < 200; i++) assert.equal(weightedPick(h, [{ w: 0, k: 'a' }, { w: 3, k: 'b' }, { w: 0, k: 'c' }]).k, 'b')
  const arr = [1, 2, 3, 4, 5, 6]
  const s = shuffle(h, arr)
  assert.deepEqual([...s].sort(), arr)
  assert.deepEqual(arr, [1, 2, 3, 4, 5, 6])
  const r = makeRand({ rng: 9 })
  assert.equal(typeof r(), 'number')
})

test('weightedPick xấp xỉ đúng tỉ lệ', () => {
  const h = { rng: 123 }
  let a = 0
  for (let i = 0; i < 10000; i++) if (weightedPick(h, [{ w: 1, k: 'a' }, { w: 3, k: 'b' }]).k === 'a') a++
  assert.ok(a > 2200 && a < 2800, String(a))
})
