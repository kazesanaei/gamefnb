import test from 'node:test'
import assert from 'node:assert/strict'
import { SAVE_KEY, BACKUP_KEY, encodeSave, decodeSave, migrate, saveTo, loadFrom, exportCode, importCode } from '../../src/core/save.js'
import { defaultState } from '../../src/core/state.js'
import { startShift } from '../../src/core/shift.js'
import { DATA, makeCtx } from '../fixtures/data.mjs'

function memStorage() {
  const m = {}
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v) }, _m: m }
}

test('encode/decode giữ nguyên chữ có dấu', () => {
  const s = defaultState(123)
  s.shopName = 'Xe Bánh tráng trộn Dì Sáu — ngon ơi là ngon ✓'
  s.reviews.push({ day: 1, stars: 5, name: 'Cô Thu', text: 'Bánh tráng trộn đậm đà, ưng lắm!' })
  const code = encodeSave(s)
  assert.match(code, /^BKN1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/)
  const back = decodeSave(code)
  assert.deepEqual(back, s)
  assert.equal(back.shopName, 'Xe Bánh tráng trộn Dì Sáu — ngon ơi là ngon ✓')
  assert.equal(importCode(exportCode(s)).reviews[0].text, 'Bánh tráng trộn đậm đà, ưng lắm!')
})

test('sửa 1 ký tự bị phát hiện', () => {
  const code = encodeSave(defaultState(9))
  const parts = code.split('.')
  for (const i of [0, 5, Math.floor(parts[1].length / 2), parts[1].length - 1]) {
    const ch = parts[1][i]
    const repl = ch === 'A' ? 'B' : 'A'
    const bad = parts[0] + '.' + parts[1].slice(0, i) + repl + parts[1].slice(i + 1) + '.' + parts[2]
    assert.equal(decodeSave(bad), null, 'vị trí ' + i)
  }
  assert.equal(decodeSave(code.slice(0, -1) + (code.endsWith('0') ? '1' : '0')), null)
  assert.equal(decodeSave('rác'), null)
  assert.equal(decodeSave(null), null)
})

test('lưu ca đang dở rồi khôi phục nguyên vẹn', () => {
  const s = defaultState(4)
  startShift(s, makeCtx())
  const back = migrate(decodeSave(encodeSave(s)), DATA)
  assert.deepEqual(back.shift, s.shift)
})

test('migrate: gộp mặc định, kẹp số âm/NaN, bỏ id không còn', () => {
  const raw = {
    seed: 5, day: -3, wallet: 'abc', reputation: -10, goldSpoons: NaN, ratings: [5, 9, 0, 3, 'x'],
    recipes: { banh_mi_op_la: { cooks: -2, goodCooks: 4 }, mon_da_xoa: { cooks: 1 } },
    upgrades: { dao_thep: true, khong_ton_tai: true }, settings: { sound: false, tips: 'x' },
    stats: { dishesCooked: -5, readbacks: 3 }, shift: { broken: true }, loan: { remaining: -1 }
  }
  const s = migrate(raw, DATA)
  assert.equal(s.day, 1)
  assert.equal(s.wallet, 200000)
  assert.equal(s.reputation, 0)
  assert.equal(s.goldSpoons, 0)
  assert.deepEqual(s.ratings, [5, 3])
  assert.deepEqual(s.recipes.banh_mi_op_la, { cooks: 0, goodCooks: 4, excellent: 0, flawless: 0, best: 0, boughtDay: 0 })
  assert.ok(s.recipes.tra_tac)
  assert.equal(s.recipes.mon_da_xoa, undefined)
  assert.deepEqual(s.upgrades, { dao_thep: true })
  assert.equal(s.settings.sound, false); assert.equal(s.settings.tips, true)
  assert.equal(s.stats.dishesCooked, 0); assert.equal(s.stats.readbacks, 3); assert.equal(s.stats.shiftsPlayed, 0)
  assert.equal(s.shift, null)
  assert.equal(s.loan, null)
  assert.deepEqual(s.clock, { maxSeen: 0 })
  // ví được phép âm
  assert.equal(migrate({ wallet: -15000 }).wallet, -15000)
  assert.equal(migrate(null), null)
})

test('saveTo/loadFrom: thử bản chính rồi bản dự phòng', () => {
  const st = memStorage()
  const s = defaultState(77)
  s.shopName = 'Xe Ốp La'
  assert.equal(saveTo(st, s, { backup: true }), true)
  assert.equal(loadFrom(st, DATA).shopName, 'Xe Ốp La')
  // bản chính hỏng → bản dự phòng
  s.shopName = 'Mới'
  saveTo(st, s)
  st._m[SAVE_KEY] = st._m[SAVE_KEY].replace('BKN1.', 'BKN1.x')
  assert.equal(loadFrom(st, DATA).shopName, 'Xe Ốp La')
  st._m[BACKUP_KEY] = 'hỏng'
  assert.equal(loadFrom(st, DATA), null)
  assert.equal(loadFrom(memStorage()), null)
  // storage ném lỗi
  assert.equal(saveTo({ setItem() { throw new Error('đầy') } }, s), false)
})
