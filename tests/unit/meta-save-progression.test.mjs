// Save version 1 → 2 (migrate), lưu/tải trường meta, lên chặng, mục tiêu sau khi đủ điều kiện, cờ ?devNow, attachMeta.
import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeSave, decodeSave, migrate } from '../../src/core/save.js'
import { STATE_VERSION, defaultMeta } from '../../src/core/state.js'
import { startShift } from '../../src/core/shift.js'
import { refreshMeta, attachMeta } from '../../src/core/meta.js'
import { checkStageUp, updateStageUp, markStageUpSeen, postGoals } from '../../src/core/progression.js'
import { claimCheckin } from '../../src/core/checkin.js'
import { ensureDaily } from '../../src/core/quests.js'
import { parseDevNow, makeNowInfo, vnDayStartMs, addDaysKey, daysBetweenKeys } from '../../src/core/clock.js'
import { createBus } from '../../src/core/bus.js'
import { playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx, newState, at, vn, DATA } from '../helpers/meta-helpers.mjs'

// Save của M1 (version 1): không có trường meta nào.
function v1Save(seed = 5) {
  const s = newState(seed)
  for (const k of Object.keys(defaultMeta())) delete s[k]
  s.version = 1
  s.stats = { customersServed: 12, customersLost: 1, dishesCooked: 14, perfectSteps: 30, changeCorrect: 9, changeWrong: 1,
    readbacks: 12, qrConfirmed: 0, fakeQrCaught: 0, flawlessDishes: 3, totalRevenue: 180000, shiftsPlayed: 3 }
  s.day = 4
  s.wallet = 321000
  s.reputation = 40
  return s
}

// M4 (sửa có chủ ý): save v1 nay nâng thẳng lên STATE_VERSION 3; nhận cả thư phiên bản 0.2.0 và 0.4.0.
test('migrate save version 1 → STATE_VERSION: giữ tiến trình M1, thêm trường meta mặc định, ca đang dở vẫn giữ', () => {
  const ctx = makeMetaCtx()
  const old = v1Save()
  startShift(old, { data: DATA, emit: () => {} })
  delete old.shift.mods
  const raw = decodeSave(encodeSave(old))
  assert.equal(raw.version, 1)
  const s = migrate(raw, DATA)
  assert.equal(s.version, STATE_VERSION)
  assert.equal(STATE_VERSION, 3)
  assert.equal(s.day, 4)
  assert.equal(s.wallet, 321000)
  assert.equal(s.reputation, 40)
  assert.equal(s.stats.changeCorrect, 9)
  assert.equal(s.stats.fiveStarCustomers, 0)
  assert.deepEqual(s.checkin, { round: 1, next: 0, lastDay: '', total: 0 })
  assert.deepEqual(s.items, { phieu_cho_som: 0, bat_che_mua: 0 })
  assert.deepEqual(s.daily.quests, [])
  assert.deepEqual(s.chains, {})
  assert.equal(s.mail.seenVersion, '0.1.0')
  assert.deepEqual(s.clock, old.clock)
  assert.deepEqual(s.shift, old.shift)
  // nạp xong chạy được mọi hệ thống: có thư chào mừng + thư phiên bản mới, nhiệm vụ, điểm danh
  const ni = at(s, '2026-10-01T09:00')
  const r = refreshMeta(s, ni, ctx)
  assert.ok(r.newMail.includes('chao_mung'))
  assert.ok(r.newMail.includes('phien_ban_0_2_0'))
  assert.ok(r.newMail.includes('phien_ban_0_4_0'))
  assert.equal(s.daily.quests.length, 3)
  assert.equal(claimCheckin(s, ni, ctx).ok, true)
  // chuỗi "Làm quen QR" mở ngay vì đã ngày game 4
  assert.ok(s.chains.lam_quen_qr)
})

test('lưu/tải save version 2 giữ nguyên trường meta; dữ liệu hỏng bị kẹp', () => {
  const ctx = makeMetaCtx({ attach: true })
  const s = newState(6)
  ctx.setState(s)
  const ni = at(s, '2026-11-13T09:00')
  refreshMeta(s, ni, ctx)
  claimCheckin(s, ni, ctx)
  playShift(s, ctx)
  s.items.phieu_cho_som = 2
  s.cosmetics.owned.push('du_do')
  s.cosmetics.equipped.du = 'du_do'
  const back = migrate(decodeSave(encodeSave(s)), DATA)
  for (const k of Object.keys(defaultMeta())) assert.deepEqual(back[k], s[k], k)
  assert.deepEqual(back.stats, s.stats)
  // kẹp dữ liệu hỏng
  const bad = migrate({ seed: 1, version: 2, checkin: { round: -3, next: 99, lastDay: 'hôm qua' }, items: { phieu_cho_som: -4 },
    daily: { quests: [{ id: 'khong_co_that', target: 5 }, 'rác'] }, mail: { list: [{ id: 'x', claimed: 'có' }, 5] },
    cosmetics: { owned: ['du_do'], equipped: { du: 'du_xanh_la' } }, events: { tri_an_20_11: { tem: -5 } }, tasting: { recipeId: 'mon_la' } }, DATA)
  assert.deepEqual(bad.checkin, { round: 1, next: 6, lastDay: '', total: 0 })
  assert.equal(bad.items.phieu_cho_som, 0)
  assert.deepEqual(bad.daily.quests, [])
  assert.equal(bad.mail.list.length, 1)
  assert.equal(bad.mail.list[0].claimed, false)
  assert.equal(bad.cosmetics.equipped.du, null)
  assert.equal(bad.events.tri_an_20_11.tem, 0)
  assert.equal(bad.tasting, null)
  assert.equal(bad.mail.seenVersion, '')
  ctx.detach()
})

test('lên chặng: đủ 6 điều kiện mới đủ; thiếu thì có gợi ý cụ thể; đang nợ không lên được; hiện màn 1 lần', () => {
  const ctx = makeMetaCtx()
  const s = newState(7)
  let r = checkStageUp(s, ctx)
  assert.equal(r.chang, 2)
  assert.equal(r.name, 'Quán cóc vỉa hè')
  assert.equal(r.eligible, false)
  assert.equal(r.locked, true)
  assert.equal(r.lockedText, 'Sắp có ở bản sau')
  assert.equal(r.conditions.length, 6)
  const byId = id => r.conditions.find(c => c.id === id)
  assert.match(byId('thao_mon').hint, /Nấu thêm 5 lần Ngon món/)
  assert.match(byId('chuoi_chinh').hint, /bước 1/)
  assert.match(byId('tien').hint, /300\.000đ/)
  // đủ điều kiện (ngưỡng danh tiếng đọc từ dữ liệu)
  s.reputation = DATA.STAGE_UP[2].requirements.find(q => q.kind === 'reputation').target
  s.ratings = [4, 4, 4, 4, 4, 3]
  s.recipes.banh_trang_tron = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 2 }
  s.recipes.banh_mi_op_la.goodCooks = 5
  s.recipes.tra_tac.goodCooks = 7
  s.chains.ngay_dau_ra_pho = { step: 7, progress: 0, done: true, claimable: [], since: '' }
  s.wallet = 500000
  r = checkStageUp(s, ctx)
  assert.equal(r.eligible, true, JSON.stringify(r.conditions.filter(c => !c.done)))
  // không bắt buộc Chè bưởi
  assert.ok(!s.recipes.che_buoi)
  s.loan = { amount: 240000, remaining: 100000 }
  assert.equal(checkStageUp(s, ctx).eligible, false)
  s.loan = null
  s.wallet = 499000
  assert.equal(checkStageUp(s, ctx).eligible, false)
  s.wallet = 600000
  assert.equal(updateStageUp(s, ctx), true)
  assert.equal(s.progression.stageUpReady, true)
  assert.equal(updateStageUp(s, ctx), false)
  assert.equal(ctx.events.filter(e => e.type === 'stage.ready').length, 1)
  markStageUpSeen(s)
  assert.equal(s.progression.stageUpSeen, true)
  // vẫn chơi tiếp Chặng 1
  assert.equal(s.chang, 1)
})

test('mục tiêu sau khi đủ điều kiện: Không tì vết từng món, thạo cấp 3, kỷ lục ca', () => {
  const ctx = makeMetaCtx({ attach: true })
  const s = newState(8)
  ctx.setState(s)
  playShift(s, ctx)
  playShift(s, ctx)
  const g = postGoals(s, ctx)
  assert.equal(g.recipes.length, 2)
  assert.equal(g.mastery.level, 3)
  assert.ok(g.flawless.done >= 1)
  assert.ok(g.records.bestProfit > 0)
  assert.ok(g.records.mostFiveStars >= 3)
  assert.ok(g.records.longestStreak >= 3)
  ctx.detach()
})

test('đồng hồ: ?devNow chỉ trên localhost; mốc 04:00; thời điểm tin cậy', () => {
  assert.equal(parseDevNow('?devNow=2026-11-15T08:30', 'localhost'), vn('2026-11-15T08:30'))
  assert.equal(parseDevNow('?devNow=2026-11-15', '127.0.0.1'), vn('2026-11-15T12:00'))
  assert.equal(parseDevNow('?devNow=2026-11-15T08:30', 'example.com'), null)
  assert.equal(parseDevNow('?devNow=rác', 'localhost'), null)
  assert.equal(parseDevNow('', 'localhost'), null)
  assert.equal(vnDayStartMs('2026-11-12'), vn('2026-11-12T04:00'))
  assert.equal(addDaysKey('2026-12-31', 1), '2027-01-01')
  assert.equal(daysBetweenKeys('2026-11-12', '2026-11-22'), 10)
  const s = newState(1)
  const a = makeNowInfo(s, vn('2026-10-02T03:30'))
  assert.equal(a.dayKey, '2026-10-01')
  assert.equal(a.rewind, false)
  const b = makeNowInfo(s, vn('2026-10-01T20:00'))
  assert.equal(b.rewind, true)
  assert.equal(b.trusted, vn('2026-10-02T03:30'))
})

test('attachMeta gắn một lần, gỡ được; nhiệm vụ đổi ngày khi chơi qua mốc 04:00', () => {
  const bus = createBus()
  const s = newState(9)
  const clock = { t: vn('2026-10-01T03:50') }
  const ctx = { data: DATA, now: () => clock.t, emit: (t, p) => bus.emit(t, p) }
  const off = attachMeta(bus, () => s, ctx)
  ensureDaily(s, makeNowInfo(s, clock.t), ctx)
  assert.equal(s.daily.dayKey, '2026-09-30')
  bus.emit('customer.rated', { customerId: 'k', stars: 5, counterErrors: [], kitchenErrors: [] })
  assert.equal(s.stats.fiveStarCustomers, 1)
  clock.t = vn('2026-10-01T04:01')
  bus.emit('customer.rated', { customerId: 'k', stars: 5, counterErrors: [], kitchenErrors: [] })
  assert.equal(s.daily.dayKey, '2026-10-01')
  off()
  bus.emit('customer.rated', { customerId: 'k', stars: 5, counterErrors: [], kitchenErrors: [] })
  assert.equal(s.stats.fiveStarCustomers, 2)
})
