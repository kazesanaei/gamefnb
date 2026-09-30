// Điểm danh 7 ô tích lũy. Mỗi ngày thật (dayKey, đổi lúc 04:00 giờ Việt Nam) nhận 1 ô; lỡ ngày không reset.
// Vòng 1 là "Tuần Khai Trương" (hiện vật), các vòng sau theo bảng thường. Khóa khi phát hiện lùi giờ.
// nowInfo = makeNowInfo(state, deviceNow) từ src/core/clock.js.
import { resolveReward, grantReward } from './rewards.js'
import { emit } from './state.js'

function cfgOf(ctx) {
  return (ctx && ctx.data && ctx.data.CHECKIN) || null
}

function ensure(state) {
  if (!state.checkin || typeof state.checkin !== 'object') state.checkin = { round: 1, next: 0, lastDay: '', total: 0 }
  return state.checkin
}

function roundTable(C, round) {
  return round <= 1 ? C.firstRound : C.round
}

// Trạng thái bảng điểm danh cho giao diện.
// → { round, roundName, next, slots: [{index, reward (đã quy đổi theo hiện tại), claimed, isNext}],
//     canClaim, reason: null | 'da_nhan' | 'lui_gio', dayKey }
export function checkinStatus(state, nowInfo, ctx) {
  const C = cfgOf(ctx)
  const ck = ensure(state)
  if (!C) return { round: ck.round, roundName: '', next: ck.next, slots: [], canClaim: false, reason: 'khong_co', dayKey: nowInfo.dayKey }
  const table = roundTable(C, ck.round)
  const slots = table.rewards.map((rw, i) => ({
    index: i,
    reward: resolveReward(state, rw, ctx),
    claimed: i < ck.next,
    isNext: i === ck.next
  }))
  let reason = null
  if (nowInfo.rewind) reason = 'lui_gio'
  else if (ck.lastDay && nowInfo.dayKey <= ck.lastDay) reason = 'da_nhan'
  return { round: ck.round, roundName: table.name, next: ck.next, slots, canClaim: reason === null, reason, dayKey: nowInfo.dayKey }
}

// Nhận ô kế tiếp. → { ok, index, round, reward } | { ok: false, reason }
export function claimCheckin(state, nowInfo, ctx) {
  const C = cfgOf(ctx)
  if (!C) return { ok: false, reason: 'khong_co' }
  const st = checkinStatus(state, nowInfo, ctx)
  if (!st.canClaim) return { ok: false, reason: st.reason }
  const ck = ensure(state)
  const table = roundTable(C, ck.round)
  const index = ck.next
  const round = ck.round
  const reward = grantReward(state, table.rewards[index], ctx)
  ck.lastDay = nowInfo.dayKey
  ck.total = (ck.total || 0) + 1
  ck.next += 1
  if (ck.next >= table.rewards.length) { ck.round += 1; ck.next = 0 }
  if (state.stats) state.stats.checkins = (state.stats.checkins || 0) + 1
  emit(ctx, 'checkin.claimed', { round, index, reward })
  return { ok: true, index, round, reward }
}
