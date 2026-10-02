// Hộp thư: không trùng id, hết hạn, trần quà, tối đa 100 thư, quà lễ lúc 04:00, thư phiên bản, review muộn, quà đời thường.
import test from 'node:test'
import assert from 'node:assert/strict'
import { pushMail, refreshMail, claimMail, claimAllMail, mailBadge, mailList, purgeExpired, compareVersion } from '../../src/core/mail.js'
import { handleMetaEvent, refreshMeta } from '../../src/core/meta.js'
import { makeNowInfo, addDaysKey } from '../../src/core/clock.js'
import { makeMetaCtx, newState, at, vn } from '../helpers/meta-helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { effectiveSteps } from '../../src/core/kitchen.js'
import { stepProgress } from '../../src/ui/components/step-card.js'

test('thư chào mừng đẩy đúng 1 lần theo id; đẩy trùng id bị từ chối', () => {
  const ctx = makeMetaCtx()
  const s = newState(1)
  const ni = at(s, '2026-10-01T09:00')
  assert.deepEqual(refreshMail(s, ni, ctx), ['chao_mung'])
  assert.deepEqual(refreshMail(s, ni, ctx), [])
  assert.equal(s.mail.list.filter(m => m.id === 'chao_mung').length, 1)
  const m = s.mail.list[0]
  assert.deepEqual(m.reward, { gold: 10, items: { phieu_cho_som: 1 } })
  assert.equal(pushMail(s, { id: 'chao_mung', kind: 'den_bu', reward: { gold: 99 } }, ni, ctx).reason, 'trung_id')
  // nhận rồi, hết hạn, bị dọn khỏi danh sách: vẫn không đẩy lại
  assert.equal(claimMail(s, 'chao_mung', ni, ctx).ok, true)
  assert.equal(claimMail(s, 'chao_mung', ni, ctx).reason, 'da_nhan')
  assert.equal(s.goldSpoons, 10)
  assert.equal(s.items.phieu_cho_som, 1)
  purgeExpired(s, at(s, '2026-12-01T09:00'))
  assert.equal(s.mail.list.length, 0)
  refreshMail(s, at(s, '2026-12-01T09:00'), ctx)
  assert.ok(!s.mail.list.some(x => x.id === 'chao_mung'))
  // save mới không nhận thư phiên bản
  assert.ok(!s.mail.list.some(x => x.kind === 'phien_ban'))
})

test('hết hạn: 30 ngày (quà lễ 14 ngày); thư hết hạn không nhận được và bị dọn', () => {
  const ctx = makeMetaCtx()
  const s = newState(2)
  const ni = at(s, '2026-10-01T09:00')
  pushMail(s, { id: 'den_bu_1', kind: 'den_bu', title: 'Đền bù', body: '', reward: { gold: 5 } }, ni, ctx)
  const m = s.mail.list.find(x => x.id === 'den_bu_1')
  assert.equal(m.createdDay, '2026-10-01')
  assert.equal(m.expiresDay, '2026-10-31')
  assert.equal(mailList(s, at(s, '2026-10-30T09:00'))[0].daysLeft, 1)
  assert.equal(claimMail(s, 'den_bu_1', at(s, '2026-10-31T04:00'), ctx).reason, 'het_han')
  assert.equal(mailBadge(s, at(s, '2026-10-31T04:00')), 0)
  assert.equal(purgeExpired(s, at(s, '2026-10-31T04:00')), 1)
  assert.equal(s.goldSpoons, 0)
})

test('quà lễ mở lúc 04:00 ngày lễ, hạn 14 ngày; khóa khi lùi giờ', () => {
  const ctx = makeMetaCtx()
  const s = newState(3)
  refreshMail(s, at(s, '2026-10-20T03:59'), ctx)
  assert.ok(!s.mail.list.some(m => m.id === 'le_20_10_2026'))
  refreshMail(s, at(s, '2026-10-20T04:00'), ctx)
  const m = s.mail.list.find(x => x.id === 'le_20_10_2026')
  assert.ok(m)
  assert.equal(m.kind, 'le')
  assert.equal(m.expiresDay, '2026-11-03')
  // 20/11: 20 Muỗng Vàng + 0,5 thu nhập tham chiếu (ngày game 1: 10.000đ)
  refreshMail(s, at(s, '2026-11-20T10:00'), ctx)
  const t = s.mail.list.find(x => x.id === 'le_20_11_2026')
  assert.deepEqual(t.reward, { money: 10000, gold: 20 })
  // lùi giờ: không đẩy quà lễ mới, không nhận được quà lễ
  const s2 = newState(4)
  makeNowInfo(s2, vn('2026-11-25T09:00'))
  const back = makeNowInfo(s2, vn('2026-11-20T09:00'))
  assert.equal(back.rewind, true)
  refreshMail(s2, { ...back, dayKey: '2026-11-20' }, ctx)
  assert.ok(!s2.mail.list.some(x => x.kind === 'le'))
  assert.equal(claimMail(s, 'le_20_11_2026', { ...at(s, '2026-11-21T09:00'), rewind: true }, ctx).reason, 'lui_gio')
  assert.equal(claimMail(s, 'le_20_11_2026', at(s, '2026-11-21T09:00'), ctx).ok, true)
})

test('trần quà: tối đa 2 quà lễ/tháng và tổng tiền ≤ 3 lần thu nhập tham chiếu; quà đền bù không bị trần', () => {
  const ctx = makeMetaCtx()
  const s = newState(5)
  const ni = at(s, '2026-10-05T09:00')
  assert.equal(pushMail(s, { id: 'le_a', kind: 'le', reward: { gold: 10 } }, ni, ctx).ok, true)
  assert.equal(pushMail(s, { id: 'le_b', kind: 'le', reward: { gold: 10 } }, ni, ctx).ok, true)
  assert.equal(pushMail(s, { id: 'le_c', kind: 'le', reward: { gold: 10 } }, ni, ctx).reason, 'tran')
  // tháng sau lại được
  assert.equal(pushMail(s, { id: 'le_c', kind: 'le', reward: { gold: 10 } }, at(s, '2026-11-02T09:00'), ctx).ok, true)
  // tổng tiền: ngày game 1 thu nhập tham chiếu 20.000đ → trần 60.000đ/tháng
  const n2 = at(s, '2026-12-02T09:00')
  assert.equal(pushMail(s, { id: 'dt_1', kind: 'doi_thuong', reward: { money: 50000 } }, n2, ctx).ok, true)
  assert.equal(pushMail(s, { id: 'dt_2', kind: 'doi_thuong', reward: { money: 20000 } }, n2, ctx).reason, 'tran')
  for (let i = 0; i < 5; i++) assert.equal(pushMail(s, { id: 'db_' + i, kind: 'den_bu', reward: { money: 50000 } }, n2, ctx).ok, true)
})

test('tối đa 100 thư: đầy thì bỏ thư cũ nhất đã nhận; Nhận tất cả; chấm đỏ', () => {
  const ctx = makeMetaCtx()
  const s = newState(6)
  const ni = at(s, '2026-10-01T09:00')
  for (let i = 0; i < 100; i++) pushMail(s, { id: 'm' + i, kind: 'den_bu', reward: { gold: 1 } }, ni, ctx)
  assert.equal(mailBadge(s, ni), 100)
  claimMail(s, 'm5', ni, ctx)
  pushMail(s, { id: 'm100', kind: 'den_bu', reward: { gold: 1 } }, ni, ctx)
  assert.equal(s.mail.list.length, 100)
  assert.ok(!s.mail.list.some(m => m.id === 'm5'), 'thư đã nhận cũ nhất bị bỏ')
  assert.ok(s.mail.list.some(m => m.id === 'm0'))
  const r = claimAllMail(s, ni, ctx)
  assert.equal(r.count, 100)
  assert.equal(s.goldSpoons, 101)
  assert.equal(mailBadge(s, ni), 0)
  // trong ca: thư có quà chưa nhận được
  pushMail(s, { id: 'x', kind: 'den_bu', reward: { gold: 1 } }, ni, ctx)
  s.shift = { day: 1 }
  assert.equal(claimMail(s, 'x', ni, ctx).reason, 'dang_ban')
  s.shift = null
})

test('thư phiên bản mới cho save cũ; so sánh phiên bản', () => {
  const ctx = makeMetaCtx()
  assert.equal(compareVersion('0.2.0', '0.1.0'), 1)
  assert.equal(compareVersion('0.2.0', '0.2.0'), 0)
  assert.equal(compareVersion('0.10.0', '0.9.1'), 1)
  const s = newState(7)
  s.mail.seenVersion = '0.1.0'
  refreshMail(s, at(s, '2026-10-01T09:00'), ctx)
  // M4 (sửa có chủ ý): bản 0.4.0 có thêm thư phiên bản 0.4.0 → save từ 0.1.0 nhận cả hai thư.
  // M5 (sửa có chủ ý): bản 0.5.0 có thêm thư phiên bản 0.5.0 (không quà) → nhận cả ba thư, seenVersion lên 0.5.0
  const v = s.mail.list.find(m => m.id === 'phien_ban_0_2_0')
  assert.ok(v)
  assert.deepEqual(v.reward, { gold: 10 })
  assert.ok(s.mail.list.some(m => m.id === 'phien_ban_0_4_0'))
  assert.ok(s.mail.list.some(m => m.id === 'phien_ban_0_5_0'))
  assert.equal(s.mail.seenVersion, '0.5.0')
  refreshMail(s, at(s, '2026-10-02T09:00'), ctx)
  assert.equal(s.mail.list.filter(m => m.kind === 'phien_ban').length, 3)
  // save của bản 0.2/0.3 (seenVersion '0.2.0') nhận thư 0.4.0 và 0.5.0
  const s2 = newState(8)
  s2.mail.seenVersion = '0.2.0'
  refreshMail(s2, at(s2, '2026-10-01T09:00'), ctx)
  assert.deepEqual(s2.mail.list.filter(m => m.kind === 'phien_ban').map(m => m.id), ['phien_ban_0_4_0', 'phien_ban_0_5_0'])
  // save của bản 0.4.x (seenVersion '0.4.0') chỉ nhận thư 0.5.0
  const s3 = newState(9)
  s3.mail.seenVersion = '0.4.0'
  refreshMail(s3, at(s3, '2026-10-01T09:00'), ctx)
  assert.deepEqual(s3.mail.list.filter(m => m.kind === 'phien_ban').map(m => m.id), ['phien_ban_0_5_0'])
  assert.equal(s3.mail.seenVersion, '0.5.0')
})

test('thư phiên bản 0.5.0: giới thiệu bếp mới, 5 thao tác, thẻ bước có tay mẫu, chế độ tập trung; không quà', () => {
  const ctx = makeMetaCtx()
  const { MAIL_CONFIG, MAIL_VERSIONS } = ctx.data
  assert.equal(MAIL_CONFIG.currentVersion, '0.5.0')
  const def = MAIL_VERSIONS.find(m => m.version === '0.5.0')
  assert.ok(def, 'có thư 0.5.0')
  assert.equal(def.id, 'phien_ban_0_5_0')
  assert.equal(def.kind, 'phien_ban')
  assert.match(def.title, /^Có gì mới: /)
  // đủ ý: giao diện bếp mới, 5 thao tác mới, thẻ bước có tay mẫu, chế độ tập trung khi nấu
  for (const w of [/Bếp/, /hình mới/, /5 thao tác mới/, /Đập trứng/, /Khuấy/, /Gọt vỏ/, /Lắc/, /Thả đá/, /bàn tay mẫu/,
    /màn hình thấp/, /ẩn dải khách và thanh 4 khâu/, /dây phiếu vẫn hiện/]) assert.match(def.body, w)
  // Ví dụ thẻ bước trong thư phải là thẻ có thật: bước Chọn là bước 1 và không có thẻ, nên thẻ đầu tiên của món đầu
  // (Bánh mì ốp la) là "Bước 2/6" theo stepProgress; thư từng ghi "Bước 1/5" (không bao giờ hiện).
  const first = DATA.RECIPES.banh_mi_op_la
  const board = effectiveSteps(first, []).filter(st => st.type !== 'chon')
  const p = stepProgress({ phase: 'thot', chonScore: 100, board, steps: {} }, board[0].id)
  assert.ok(def.body.includes(`"Bước ${p.index}/${p.total}"`), `thư phải lấy ví dụ thẻ đầu tiên "Bước ${p.index}/${p.total}"`)
  assert.doesNotMatch(def.body, /Bước 1\//, 'không có thẻ "Bước 1/N"')
  for (const m of def.body.matchAll(/Bước (\d+)\/(\d+)/g)) {
    const k = Number(m[1]), n = Number(m[2])
    assert.ok(k >= 2 && k <= n, `thẻ ${m[0]}: k phải trong [2, N]`)
    assert.ok(Object.values(DATA.RECIPES).some(r => r.steps.length === n), `${m[0]}: có món ${n} bước`)
  }
  // đúng giọng thư cũ (Dì Sáu gọi "con"), câu cuối có dấu chấm than
  assert.match(def.body, /\bcon\b/)
  assert.match(def.body, /!$/)
  // không quà: hộp thư không có nút Nhận, chấm đỏ tắt khi đã đọc
  const s = newState(10)
  s.mail.seenVersion = '0.4.0'
  const ni = at(s, '2026-10-01T09:00')
  const wallet = s.wallet, gold = s.goldSpoons
  assert.ok(refreshMail(s, ni, ctx).includes('phien_ban_0_5_0'))
  const item = mailList(s, ni).find(m => m.id === 'phien_ban_0_5_0')
  assert.equal(item.hasReward, false)
  assert.deepEqual(item.reward, {})
  const before = mailBadge(s, ni)
  s.mail.list.find(m => m.id === 'phien_ban_0_5_0').read = true
  assert.equal(mailBadge(s, ni), before - 1)
  // đánh dấu đã xem (kể cả đang trong ca) không cộng gì vào ví hay Muỗng Vàng
  s.shift = { day: 1 }
  const c = claimMail(s, 'phien_ban_0_5_0', ni, ctx)
  s.shift = null
  assert.equal(c.ok, true)
  assert.deepEqual(c.reward, {})
  assert.equal(s.wallet, wallet)
  assert.equal(s.goldSpoons, gold)
})

test('review muộn: thối thiếu không bị phát hiện → hôm sau có thư review 2 sao', () => {
  const ctx = makeMetaCtx()
  const s = newState(8)
  s.history.push({ day: 3, lateReviews: [{ customerId: 'k2', name: 'Lan', amount: 5000 }] })
  const ni = at(s, '2026-10-03T20:00')
  handleMetaEvent(s, 'shift.ended', { day: 3, profit: 1, served: 4, lost: 0 }, ctx, ni)
  refreshMail(s, at(s, '2026-10-04T03:59'), ctx)
  assert.ok(!s.mail.list.some(m => m.kind === 'review'))
  refreshMail(s, at(s, '2026-10-04T04:00'), ctx)
  const m = s.mail.list.find(x => x.id === 'review:3:k2')
  assert.ok(m)
  assert.match(m.title, /2 sao/)
  assert.match(m.body, /Lan/)
  assert.match(m.body, /5\.000đ/)
  // không đẩy trùng
  handleMetaEvent(s, 'shift.ended', { day: 3, profit: 1, served: 4, lost: 0 }, ctx, at(s, '2026-10-04T05:00'))
  refreshMail(s, at(s, '2026-10-05T09:00'), ctx)
  assert.equal(s.mail.list.filter(x => x.kind === 'review').length, 1)
})

test('quà đời thường: từ ngày thật thứ 3, khoảng 10% mỗi ngày, cần chất lượng, tối đa 2/tháng', () => {
  const ctx = makeMetaCtx()
  let total = 0
  for (let seed = 1; seed <= 20; seed++) {
    const s = newState(seed)
    s.ratings = [5, 5, 4, 5, 4, 5]
    const months = {}
    for (let i = 0; i < 90; i++) {
      const ni = makeNowInfo(s, vn('2026-10-01T09:00') + i * 86400000)
      refreshMeta(s, ni, ctx)
      if (i < 2) assert.ok(!s.mail.list.some(m => m.kind === 'doi_thuong'), 'trước ngày thật thứ 3')
    }
    for (const id of s.mail.pushed.filter(x => x.startsWith('doi_thuong:'))) {
      const mo = id.slice(11, 18)
      months[mo] = (months[mo] || 0) + 1
      total++
      const m = s.mail.list.find(x => x.id === id)
      if (m) assert.ok(m.reward.money >= 6000 && m.reward.money <= 12000, JSON.stringify(m.reward))
    }
    for (const n of Object.values(months)) assert.ok(n <= 2)
  }
  assert.ok(total > 20 && total < 150, String(total))
  // sao thấp: không có quà
  const low = newState(3)
  low.ratings = [2, 2, 3, 2, 3, 2]
  for (let i = 0; i < 60; i++) refreshMeta(low, makeNowInfo(low, vn('2026-10-01T09:00') + i * 86400000), ctx)
  assert.ok(!low.mail.pushed.some(x => x.startsWith('doi_thuong:')))
  assert.equal(addDaysKey('2026-10-31', 1), '2026-11-01')
})
