// Điểm danh 7 ô: mốc 04:00 giờ Việt Nam, 1 lần/ngày, lỡ ngày không reset, lùi giờ bị khóa, Tuần Khai Trương tặng hiện vật.
import test from 'node:test'
import assert from 'node:assert/strict'
import { checkinStatus, claimCheckin } from '../../src/core/checkin.js'
import { makeNowInfo, dayKeyVN } from '../../src/core/clock.js'
import { makeMetaCtx, newState, at, vn } from '../helpers/meta-helpers.mjs'

test('điểm danh qua mốc 04:00 giờ Việt Nam (03:59 → 04:00)', () => {
  const ctx = makeMetaCtx()
  const s = newState(1)
  const a = at(s, '2026-10-01T03:59')
  assert.equal(a.dayKey, '2026-09-30')
  const r1 = claimCheckin(s, a, ctx)
  assert.equal(r1.ok, true)
  assert.equal(r1.index, 0)
  // 03:59:59 vẫn cùng ngày → không nhận lần 2
  const r2 = claimCheckin(s, at(s, '2026-10-01T03:59'), ctx)
  assert.deepEqual(r2, { ok: false, reason: 'da_nhan' })
  // 04:00 → ngày mới
  const b = at(s, '2026-10-01T04:00')
  assert.equal(b.dayKey, '2026-10-01')
  assert.equal(checkinStatus(s, b, ctx).canClaim, true)
  const r3 = claimCheckin(s, b, ctx)
  assert.equal(r3.ok, true)
  assert.equal(r3.index, 1)
})

test('không nhận 2 lần trong một ngày thật; tới 03:59 hôm sau vẫn là ngày cũ', () => {
  const ctx = makeMetaCtx()
  const s = newState(2)
  assert.equal(claimCheckin(s, at(s, '2026-10-05T08:00'), ctx).ok, true)
  for (const t of ['2026-10-05T12:00', '2026-10-05T23:59', '2026-10-06T00:30', '2026-10-06T03:59']) {
    const st = checkinStatus(s, at(s, t), ctx)
    assert.equal(st.canClaim, false, t)
    assert.equal(st.reason, 'da_nhan')
    assert.equal(claimCheckin(s, at(s, t), ctx).ok, false)
  }
  assert.equal(s.checkin.next, 1)
  assert.equal(s.checkin.total, 1)
})

test('lỡ ngày không reset: lần sau nhận ô kế tiếp', () => {
  const ctx = makeMetaCtx()
  const s = newState(3)
  claimCheckin(s, at(s, '2026-10-01T09:00'), ctx)
  claimCheckin(s, at(s, '2026-10-02T09:00'), ctx)
  // nghỉ 5 ngày
  const r = claimCheckin(s, at(s, '2026-10-08T09:00'), ctx)
  assert.equal(r.ok, true)
  assert.equal(r.index, 2)
  assert.equal(s.checkin.round, 1)
})

test('lùi giờ: khóa điểm danh, game vẫn chơi được', () => {
  const ctx = makeMetaCtx()
  const s = newState(4)
  claimCheckin(s, at(s, '2026-10-10T09:00'), ctx)
  // tua giờ lùi 2 ngày
  const back = makeNowInfo(s, vn('2026-10-08T09:00'))
  assert.equal(back.rewind, true)
  // ngày thật tính theo mốc tin cậy (không lùi theo giờ máy)
  assert.equal(back.dayKey, '2026-10-10')
  const st = checkinStatus(s, back, ctx)
  assert.equal(st.canClaim, false)
  assert.equal(st.reason, 'lui_gio')
  assert.deepEqual(claimCheckin(s, back, ctx), { ok: false, reason: 'lui_gio' })
  // lùi ít hơn 10 phút thì không tính là lùi giờ
  const s2 = newState(5)
  makeNowInfo(s2, vn('2026-10-10T09:00'))
  assert.equal(makeNowInfo(s2, vn('2026-10-10T08:55')).rewind, false)
  // hôm sau (giờ thật) vẫn nhận bình thường
  assert.equal(claimCheckin(s, at(s, '2026-10-11T09:00'), ctx).ok, true)
})

test('Tuần Khai Trương tặng hiện vật; đã có dao thì quy đổi; hết 7 ô sang vòng thường', () => {
  const ctx = makeMetaCtx()
  const s = newState(6)
  const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']
  const got = days.map(d => claimCheckin(s, at(s, d + 'T09:00'), ctx))
  assert.deepEqual(got[0].reward, { gold: 10, cosmetic: 'vien_khai_truong' })
  assert.ok(s.cosmetics.owned.includes('vien_khai_truong'))
  assert.deepEqual(got[1].reward, { items: { phieu_cho_som: 1 } })
  assert.equal(s.items.phieu_cho_som, 1)
  assert.equal(s.goldSpoons, 20)
  assert.equal(s.items.bat_che_mua, 1)
  // ô 5: dao thép (chưa có → nhận dao)
  const s2 = JSON.parse(JSON.stringify(s))
  const r5 = claimCheckin(s2, at(s2, '2026-10-05T09:00'), ctx)
  assert.equal(r5.reward.upgrade, 'dao_thep')
  assert.equal(s2.upgrades.dao_thep, true)
  // ô 5 khi đã mua dao → quy đổi 2 Phiếu Chợ Sớm
  s.upgrades.dao_thep = true
  const r5b = claimCheckin(s, at(s, '2026-10-05T09:00'), ctx)
  assert.equal(r5b.reward.converted, true)
  assert.deepEqual(r5b.reward.items, { phieu_cho_som: 2 })
  assert.equal(s.items.phieu_cho_som, 3)
  claimCheckin(s, at(s, '2026-10-06T09:00'), ctx)
  const w = s.wallet
  const r7 = claimCheckin(s, at(s, '2026-10-07T09:00'), ctx)
  assert.equal(r7.reward.money, 100000)
  assert.equal(r7.reward.gold, 20)
  assert.equal(s.wallet, w + 100000)
  assert.ok(s.titles.includes('chu_xe_moi_toanh'))
  assert.equal(s.checkin.round, 2)
  assert.equal(s.checkin.next, 0)
  // vòng thường ô 1: 0,3 thu nhập tham chiếu (ngày game 1: 20.000đ → 6.000đ)
  const st = checkinStatus(s, at(s, '2026-10-08T09:00'), ctx)
  assert.equal(st.roundName, 'Điểm danh')
  assert.equal(st.slots[0].reward.money, 6000)
  assert.equal(st.slots.length, 7)
  assert.equal(dayKeyVN(vn('2026-10-08T09:00')), '2026-10-08')
})
