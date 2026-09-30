// Việc hôm nay: bốc tất định theo seed + ngày, không lặp hôm qua, đủ điều kiện, đếm qua bus, Rương ngày,
// đổi nhiệm vụ trừ Muỗng Vàng, quên nhận thì vào Hộp thư.
import test from 'node:test'
import assert from 'node:assert/strict'
import { rollDailyQuests, ensureDaily, questList, claimQuest, claimDailyChest, rerollQuest, questTarget, questDef } from '../../src/core/quests.js'
import { SIGNALS } from '../../src/core/stats.js'
import { claimMail } from '../../src/core/mail.js'
import { makeNowInfo, addDaysKey } from '../../src/core/clock.js'
import { playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx, newState, at, vn, DATA } from '../helpers/meta-helpers.mjs'

const entry = (s, id, ctx) => ({ id, group: questDef(ctx, id).group, target: questTarget(s, questDef(ctx, id), ctx), progress: 0, claimed: false })

test('bốc 3 nhiệm vụ tất định theo seed + ngày, mỗi nhóm 1 việc', () => {
  const ctx = makeMetaCtx()
  const a = newState(77), b = newState(77), c = newState(78)
  const ids = s => rollDailyQuests(s, '2026-10-01', ctx).map(q => q.id)
  assert.deepEqual(ids(a), ids(b))
  assert.deepEqual(rollDailyQuests(a, '2026-10-01', ctx).map(q => q.group), ['quay', 'bep', 'chat_luong'])
  // khác ngày / khác seed thì có lúc khác
  const seen = new Set()
  for (let i = 0; i < 20; i++) seen.add(rollDailyQuests(a, addDaysKey('2026-10-01', i), ctx).map(q => q.id).join(','))
  assert.ok(seen.size > 5)
  let diff = 0
  for (let i = 0; i < 20; i++) {
    const k = addDaysKey('2026-10-01', i)
    if (rollDailyQuests(a, k, ctx).map(q => q.id).join() !== rollDailyQuests(c, k, ctx).map(q => q.id).join()) diff++
  }
  assert.ok(diff > 5)
})

test('không lặp nhiệm vụ hôm qua; chỉ bốc nhiệm vụ đủ điều kiện', () => {
  const ctx = makeMetaCtx()
  for (const seed of [1, 2, 3, 4, 5]) {
    const s = newState(seed)
    let prev = null
    for (let i = 0; i < 40; i++) {
      const ni = makeNowInfo(s, vn('2026-10-01T09:00') + i * 86400000)
      ensureDaily(s, ni, ctx)
      const ids = s.daily.quests.map(q => q.id)
      assert.equal(ids.length, 3)
      if (prev) for (const id of ids) assert.ok(!prev.includes(id), `seed ${seed} ngày ${i}: lặp ${id}`)
      // ngày game 1: chưa có QR, khách chưa bỏ về, chưa mua món mới
      for (const id of ['qr_dung', 'khong_bo_ve', 'mon_vua_mua']) assert.ok(!ids.includes(id), id)
      prev = ids
    }
  }
  // ngày game 5, vừa mua món → nhiệm vụ QR / món vừa mua có thể xuất hiện
  const s = newState(9)
  s.day = 5
  s.recipes.banh_trang_tron = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 4 }
  const all = new Set()
  for (let i = 0; i < 60; i++) for (const q of rollDailyQuests(s, addDaysKey('2026-10-01', i), ctx)) all.add(q.id)
  for (const id of ['qr_dung', 'khong_bo_ve', 'mon_vua_mua']) assert.ok(all.has(id), id)
  // không có nhiệm vụ "tiêu tiền": mọi nhiệm vụ đều đếm tín hiệu chơi hợp lệ
  for (const q of DATA.QUESTS) {
    assert.ok(SIGNALS.includes(q.signal), q.id)
    assert.ok(!/tiêu|chi tiền|trả tiền/i.test(q.text), q.id)
  }
  assert.equal(DATA.QUESTS.length, 12)
})

test('chỉ tiêu co giãn theo số khách dự kiến', () => {
  const ctx = makeMetaCtx()
  const s = newState(1)
  assert.equal(questTarget(s, questDef(ctx, 'phuc_vu'), ctx), 8)        // 2 ca × 4 khách
  s.day = 9
  assert.equal(questTarget(s, questDef(ctx, 'phuc_vu'), ctx), 14)       // 2 × 8 = 16, trần 14
  assert.equal(questTarget(s, questDef(ctx, 'thoi_dung_lien_tiep'), ctx), 5)
  const rev = questTarget(s, questDef(ctx, 'doanh_thu'), ctx)
  assert.equal(rev % 5000, 0)
  assert.ok(rev >= 80000 && rev <= 200000)
})

test('tiến độ đếm qua bus; chuỗi "liên tiếp" đứt khi thối sai; Nhận thưởng; Rương ngày', () => {
  const ctx = makeMetaCtx({ attach: true })
  const s = newState(11)
  ctx.setState(s)
  const ni = at(s, '2026-10-01T09:00')
  ensureDaily(s, ni, ctx)
  s.daily.quests = ['thoi_dung_lien_tiep', 'thai_hoan_hao', 'phuc_vu'].map(id => entry(s, id, ctx))
  const change = ok => ctx.emit('change.given', { correct: ok, optimal: ok, diff: ok ? 0 : -5000, due: 15000, attempt: 1 })
  change(true); change(true); change(true)
  assert.equal(s.daily.quests[0].progress, 3)
  change(false)
  assert.equal(s.daily.quests[0].progress, 0)
  // không phải thối (due = 0) thì không tính
  ctx.emit('change.given', { correct: true, optimal: true, diff: 0, due: 0, attempt: 1 })
  assert.equal(s.daily.quests[0].progress, 0)
  for (let i = 0; i < 6; i++) change(true)
  assert.equal(s.daily.quests[0].progress, 5)
  assert.ok(ctx.events.some(e => e.type === 'quest.progress' && e.payload.justDone))
  // Hoàn hảo ở bước Thái (không tính Tự làm)
  ctx.emit('step.done', { recipeId: 'banh_mi_op_la', type: 'thai', score: 95, grade: 'Hoàn hảo', auto: true })
  ctx.emit('step.done', { recipeId: 'banh_mi_op_la', type: 'lua', score: 95, grade: 'Hoàn hảo', auto: false })
  assert.equal(s.daily.quests[1].progress, 0)
  for (let i = 0; i < 5; i++) ctx.emit('step.done', { recipeId: 'banh_mi_op_la', type: 'thai', score: 92, grade: 'Hoàn hảo', auto: false })
  assert.equal(s.daily.quests[1].progress, 5)
  // Hỗ trợ thao tác bật: nhiệm vụ đếm bước Hoàn hảo không đếm
  s.daily.quests[1] = entry(s, 'thai_hoan_hao', ctx)
  s.settings.assistMotion = true
  ctx.emit('step.done', { recipeId: 'banh_mi_op_la', type: 'thai', score: 99, grade: 'Hoàn hảo', auto: false })
  assert.equal(s.daily.quests[1].progress, 0)
  s.settings.assistMotion = false
  for (let i = 0; i < 5; i++) ctx.emit('step.done', { recipeId: 'banh_mi_op_la', type: 'thai', score: 99, grade: 'Hoàn hảo', auto: false })
  for (let i = 0; i < 8; i++) ctx.emit('customer.rated', { customerId: 'k' + i, stars: 4, counterErrors: [], kitchenErrors: [] })
  const L = questList(s, ctx)
  assert.deepEqual(L.quests.map(q => q.done), [true, true, true])
  assert.equal(L.chest.available, true)
  // Rương chưa mở được khi chưa… (đủ 3 việc là mở được, không cần nhận trước)
  const w = s.wallet, rep = s.reputation
  const r = claimQuest(s, 0, ni, ctx)
  assert.equal(r.ok, true)
  assert.equal(r.reward.money, 4000)          // 0,2 × 20.000đ, làm tròn lên bội 1.000đ
  assert.equal(r.reward.rep, 5)
  assert.equal(s.wallet, w + 4000)
  assert.equal(s.reputation, rep + 5)
  assert.deepEqual(claimQuest(s, 0, ni, ctx), { ok: false, reason: 'da_nhan' })
  // Rương ngày khóa khi lùi giờ
  const back = makeNowInfo(s, vn('2026-10-01T06:00'))
  assert.equal(back.rewind, true)
  assert.deepEqual(claimDailyChest(s, back, ctx), { ok: false, reason: 'lui_gio' })
  const g = s.goldSpoons
  const c = claimDailyChest(s, at(s, '2026-10-01T10:00'), ctx)
  assert.equal(c.ok, true)
  assert.equal(s.goldSpoons, g + 5)
  assert.equal(claimDailyChest(s, at(s, '2026-10-01T10:00'), ctx).reason, 'da_nhan')
  ctx.detach()
})

test('không nhận thưởng trong ca; chưa xong thì không nhận', () => {
  const ctx = makeMetaCtx()
  const s = newState(12)
  const ni = at(s, '2026-10-01T09:00')
  ensureDaily(s, ni, ctx)
  assert.equal(claimQuest(s, 0, ni, ctx).reason, 'chua_xong')
  s.daily.quests[0].progress = s.daily.quests[0].target
  s.shift = { day: 1 }
  assert.equal(claimQuest(s, 0, ni, ctx).reason, 'dang_ban')
  s.shift = null
  assert.equal(claimQuest(s, 0, ni, ctx).ok, true)
})

test('đổi nhiệm vụ: lần đầu miễn phí, sau đó 5 Muỗng Vàng; cùng nhóm, không trùng', () => {
  const ctx = makeMetaCtx()
  const s = newState(13)
  const ni = at(s, '2026-10-01T09:00')
  ensureDaily(s, ni, ctx)
  const before = s.daily.quests.map(q => q.id)
  const r1 = rerollQuest(s, 1, ni, ctx)
  assert.equal(r1.ok, true)
  assert.equal(r1.cost, 0)
  assert.equal(s.goldSpoons, 0)
  assert.equal(s.daily.quests[1].group, 'bep')
  assert.notEqual(s.daily.quests[1].id, before[1])
  assert.equal(new Set(s.daily.quests.map(q => q.id)).size, 3)
  // lần 2: cần 5 Muỗng Vàng
  assert.deepEqual(rerollQuest(s, 2, ni, ctx), { ok: false, reason: 'thieu_muong' })
  s.goldSpoons = 12
  const r2 = rerollQuest(s, 2, ni, ctx)
  assert.equal(r2.ok, true)
  assert.equal(r2.cost, 5)
  assert.equal(s.goldSpoons, 7)
  assert.equal(questList(s, ctx).reroll.cost, 5)
  // nhiệm vụ đã nhận thì không đổi
  s.daily.quests[0].progress = s.daily.quests[0].target
  claimQuest(s, 0, ni, ctx)
  assert.equal(rerollQuest(s, 0, ni, ctx).reason, 'da_nhan')
  // sang ngày mới: lại được đổi miễn phí
  ensureDaily(s, at(s, '2026-10-02T09:00'), ctx)
  assert.equal(questList(s, ctx).reroll.free, true)
})

test('xong mà quên nhận trước 04:00 → tự vào Hộp thư (không trùng), nhận được qua thư', () => {
  const ctx = makeMetaCtx()
  const s = newState(14)
  ensureDaily(s, at(s, '2026-10-01T09:00'), ctx)
  for (const q of s.daily.quests) q.progress = q.target
  claimQuest(s, 0, at(s, '2026-10-01T09:00'), ctx)
  const r = ensureDaily(s, at(s, '2026-10-02T04:00'), ctx)
  assert.equal(r.rolled, true)
  const ids = s.mail.list.map(m => m.id)
  const q1 = `nv:2026-10-01:${r.mailed[0].split(':')[2]}`
  assert.equal(r.mailed.length, 3)                   // 2 nhiệm vụ + Rương ngày
  assert.ok(ids.includes(q1))
  assert.ok(ids.includes('ruong:2026-10-01'))
  assert.ok(!ids.some(id => id.endsWith(':' + s.daily.prevIds[0]) && id.startsWith('nv:')), 'việc đã nhận không vào hộp thư')
  const m = s.mail.list.find(x => x.id === q1)
  assert.equal(m.kind, 'nhiem_vu')
  assert.equal(m.expiresDay, '2026-10-09')
  const w = s.wallet
  assert.equal(claimMail(s, q1, at(s, '2026-10-02T09:00'), ctx).ok, true)
  assert.equal(s.wallet, w + 4000)
  // gọi lại không đẩy trùng
  ensureDaily(s, at(s, '2026-10-02T10:00'), ctx)
  assert.equal(s.mail.list.filter(x => x.id === q1).length, 1)
})

test('tích hợp: gắn meta vào bus, chơi 2 ca thật → nhiệm vụ tự đếm', () => {
  const ctx = makeMetaCtx({ attach: true, at: '2026-10-01T09:00' })
  const s = newState(21)
  ctx.setState(s)
  ensureDaily(s, at(s, '2026-10-01T09:00'), ctx)
  s.daily.quests = ['doc_lai_dung', 'mon_du_nguyen_lieu', 'phuc_vu'].map(id => entry(s, id, ctx))
  playShift(s, ctx)
  playShift(s, ctx)
  const L = questList(s, ctx).quests
  assert.ok(L[0].progress >= 3, JSON.stringify(L[0]))
  assert.equal(L[1].done, true)
  assert.equal(L[2].done, true)
  assert.ok(s.stats.readbackClean >= 3)
  assert.ok(s.stats.fiveStarCustomers >= 6)
  ctx.detach()
})
