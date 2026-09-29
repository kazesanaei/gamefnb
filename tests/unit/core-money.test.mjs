import test from 'node:test'
import assert from 'node:assert/strict'
import { BILLS, formatVND, formatK, drawerTotal, makeFloat, minBillsChange, canMakeChange, customerCash, roundUpTo, roundDownTo } from '../../src/core/money.js'
import { PERSONAS } from '../fixtures/data.mjs'

test('định dạng tiền', () => {
  assert.equal(formatVND(37000), '37.000đ')
  assert.equal(formatVND(1250000), '1.250.000đ')
  assert.equal(formatVND(0), '0đ')
  assert.equal(formatVND(-5000), '-5.000đ')
  assert.equal(formatK(37000), '37k')
  assert.equal(formatK(37500), '37,5k')
  assert.equal(formatK(1250000), '1,25tr')
  assert.equal(formatK(1000000), '1tr')
  assert.equal(formatK(500), '500đ')
})

test('quỹ lẻ 200.000đ và tổng két', () => {
  assert.equal(drawerTotal(makeFloat()), 200000)
  assert.deepEqual(makeFloat(), { 5000: 8, 10000: 5, 20000: 3, 50000: 1, 100000: 0, 200000: 0, 500000: 0 })
  assert.equal(drawerTotal(JSON.parse(JSON.stringify({ 5000: 2, 100000: 1 }))), 110000)
  assert.equal(roundUpTo(21000, 5000), 25000)
  assert.equal(roundDownTo(24000, 5000), 20000)
})

test('minBillsChange dùng số tờ thật trong két (không tham lam)', () => {
  // cần 60.000đ, két có 1 tờ 50k + 3 tờ 20k, không có 10k → 3 tờ 20k
  const r = minBillsChange(60000, { 50000: 1, 20000: 3, 10000: 0, 5000: 0 })
  assert.deepEqual(r, { count: 3, bills: { 20000: 3 } })
  assert.equal(minBillsChange(0, {}).count, 0)
  assert.equal(minBillsChange(15000, { 10000: 1 }), null)
  assert.equal(minBillsChange(12000, makeFloat()), null)
  assert.deepEqual(minBillsChange(35000, makeFloat()), { count: 3, bills: { 20000: 1, 10000: 1, 5000: 1 } })
  // tờ lớn nhất tối ưu khi có
  assert.deepEqual(minBillsChange(150000, { 100000: 1, 50000: 1, 20000: 5 }), { count: 2, bills: { 100000: 1, 50000: 1 } })
  assert.equal(canMakeChange(60000, { 50000: 1, 20000: 3 }), true)
  assert.equal(canMakeChange(5000, { 10000: 3 }), false)
})

test('minBillsChange tối ưu so với vét cạn trên két ngẫu nhiên', () => {
  const h = { rng: 5 }
  const brute = (amount, drawer) => {
    let best = null
    const rec = (i, rest, count) => {
      if (rest === 0) { if (best === null || count < best) best = count; return }
      if (i < 0) return
      const b = BILLS[i]
      for (let k = 0; k <= Math.min(drawer[b] || 0, Math.floor(rest / b)); k++) rec(i - 1, rest - k * b, count + k)
    }
    rec(BILLS.length - 1, amount, 0)
    return best
  }
  let seed = 1
  for (let t = 0; t < 300; t++) {
    const drawer = {}
    for (const b of BILLS.slice(0, 5)) { seed = (seed * 1103515245 + 12345) % 2147483648; drawer[b] = seed % 4 }
    seed = (seed * 1103515245 + 12345) % 2147483648
    const amount = (seed % 40) * 5000
    const r = minBillsChange(amount, drawer)
    const b = brute(amount, drawer)
    if (b === null) assert.equal(r, null)
    else {
      assert.equal(r.count, b)
      let sum = 0
      for (const k of Object.keys(r.bills)) { assert.ok(r.bills[k] <= drawer[k]); sum += Number(k) * r.bills[k] }
      assert.equal(sum, amount)
    }
  }
  void h
})

test('customerCash qua 1.000 seed: luôn ≥ tổng và chỉ gồm BILLS', () => {
  const totals = [10000, 15000, 20000, 25000, 30000, 35000, 45000, 60000, 85000, 130000, 23000]
  const personas = Object.values(PERSONAS).concat([null])
  for (let seed = 1; seed <= 1000; seed++) {
    const h = { rng: seed }
    const total = totals[seed % totals.length]
    const persona = personas[seed % personas.length]
    const day = 1 + (seed % 9)
    const cash = customerCash(h, total, persona, day)
    assert.ok(cash.total >= total, `seed ${seed}`)
    let sum = 0
    for (const k of Object.keys(cash.bills)) {
      assert.ok(BILLS.includes(Number(k)), `mệnh giá lạ ${k}`)
      assert.ok(Number.isInteger(cash.bills[k]) && cash.bills[k] > 0)
      sum += Number(k) * cash.bills[k]
    }
    assert.equal(sum, cash.total)
    // tờ 200k/500k chỉ từ ngày 4 và không quá 25 lần tổng
    if (day < 4 && total <= 50000) assert.ok(!cash.bills[200000] && !cash.bills[500000], `seed ${seed}`)
    if (cash.bills[500000]) assert.ok(500000 <= 25 * total)
  }
})

test('customerCash có đủ các kiểu đưa tiền', () => {
  const kinds = { exact: 0, big: 0, extra: 0 }
  for (let seed = 1; seed <= 2000; seed++) {
    const cash = customerCash({ rng: seed }, 35000, PERSONAS.hoc_sinh, 6)
    if (cash.total === 35000) kinds.exact++
    if (cash.bills[200000] || cash.bills[500000]) kinds.big++
    if (cash.total === 55000) kinds.extra++    // 50k + 5k → thối 20k
  }
  assert.ok(kinds.exact > 100, JSON.stringify(kinds))
  assert.ok(kinds.big > 20, JSON.stringify(kinds))
  assert.ok(kinds.extra > 20, JSON.stringify(kinds))
  // khách "exact" đưa vừa đủ nhiều hơn
  let ex = 0
  for (let seed = 1; seed <= 1000; seed++) if (customerCash({ rng: seed }, 35000, PERSONAS.cong_nhan, 2).total === 35000) ex++
  assert.ok(ex > 300, String(ex))
})
