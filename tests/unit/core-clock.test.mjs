import test from 'node:test'
import assert from 'node:assert/strict'
import { DAY_RESET_HOUR_VN, dayKeyVN, trustedNow, nextResetMs } from '../../src/core/clock.js'

test('mốc 04:00 giờ Việt Nam', () => {
  assert.equal(DAY_RESET_HOUR_VN, 4)
  // 03:59:59 ngày 30/09 giờ VN = 20:59:59Z ngày 29 → vẫn là ngày 29
  assert.equal(dayKeyVN(Date.parse('2026-09-29T20:59:59Z')), '2026-09-29')
  // 04:00 ngày 30/09 giờ VN
  assert.equal(dayKeyVN(Date.parse('2026-09-29T21:00:00Z')), '2026-09-30')
  // 23:00 giờ VN ngày 30 vẫn là ngày 30
  assert.equal(dayKeyVN(Date.parse('2026-09-30T16:00:00Z')), '2026-09-30')
  assert.equal(nextResetMs(Date.parse('2026-09-29T20:59:59Z')), Date.parse('2026-09-29T21:00:00Z'))
  assert.equal(nextResetMs(Date.parse('2026-09-29T21:00:00Z')), Date.parse('2026-09-30T21:00:00Z'))
})

test('trustedNow cập nhật maxSeen và phát hiện lùi giờ', () => {
  const state = { clock: { maxSeen: 0 } }
  const t0 = Date.parse('2026-10-01T01:00:00Z')
  assert.deepEqual(trustedNow(state, t0), { now: t0, rewind: false })
  assert.equal(state.clock.maxSeen, t0)
  // lùi 5 phút: chấp nhận
  assert.equal(trustedNow(state, t0 - 5 * 60000).rewind, false)
  assert.equal(state.clock.maxSeen, t0)
  // lùi hơn 10 phút: bị phát hiện
  assert.equal(trustedNow(state, t0 - 11 * 60000).rewind, true)
  // tiến giờ cập nhật mốc
  trustedNow(state, t0 + 3600000)
  assert.equal(state.clock.maxSeen, t0 + 3600000)
  const s2 = {}
  assert.equal(trustedNow(s2, 1000).rewind, false)
  assert.equal(s2.clock.maxSeen, 1000)
})
