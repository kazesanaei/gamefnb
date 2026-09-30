// Gắn các hệ thống meta M2 vào bus: nhiệm vụ, chuỗi, Tem sự kiện, stats chỉ LẮNG NGHE sự kiện miền.
// UI gọi attachMeta(app.bus, () => app.state, app.ctx) một lần; ctx.now() (tùy chọn) trả giờ máy (ms).
// refreshMeta(state, nowInfo, ctx) gọi khi mở game / vào màn Chuẩn bị (và tự gọi khi mở ca).
import { makeNowInfo } from './clock.js'
import { signalsFor, lastHistory } from './stats.js'
import { ensureDaily, applyQuestSignal } from './quests.js'
import { refreshMail, queueLateReviews } from './mail.js'
import { refreshChains, applyChainSignal } from './chains.js'
import { markEventDay, awardDishTem, ensureEventQuests, applyEventQuestSignal, settleEvents } from './events.js'
import { updateStageUp } from './progression.js'

// Sự kiện do chính hệ thống meta phát ra (bỏ qua để không tự gọi lại).
const OWN_PREFIXES = ['quest.', 'chain.', 'mail.', 'tem.', 'checkin.', 'stage.', 'recipe.tasted', 'cosmetic.', 'event.']

// Sự kiện miền làm thay đổi điều kiện "đạt mức" của chuỗi / lên chặng.
const RECHECK = ['shift.ended', 'recipe.bought', 'recipe.gained', 'upgrade.bought', 'upgrade.gained', 'customer.rated']

function nowInfoFrom(state, ctx) {
  if (!ctx || typeof ctx.now !== 'function') return null
  const ms = Number(ctx.now())
  return Number.isFinite(ms) ? makeNowInfo(state, ms) : null
}

// Ghi nhận ngày thật đã mở game (quà đời thường tính từ ngày thật thứ 3).
export function trackRealDay(state, nowInfo) {
  const r = state.realDays && typeof state.realDays === 'object' ? state.realDays : (state.realDays = { first: '', last: '', count: 0 })
  if (!r.first) r.first = nowInfo.dayKey
  if (!r.last || nowInfo.dayKey > r.last) { r.last = nowInfo.dayKey; r.count = (r.count || 0) + 1 }
}

// Cập nhật mọi thứ theo ngày thật: đổi nhiệm vụ, hộp thư, nhiệm vụ sự kiện, chuỗi, Tem dư, lên chặng.
// Chuỗi chạy TRƯỚC khi tất toán Tem dư: thưởng chuỗi sự kiện chưa nhận (khi đã hết ân hạn) cộng Tem vào phần dư
// để đổi chung, phần còn lại (công thức) gửi qua Hộp thư.
// → { questsRolled, newMail: [id mọi thư mới đẩy trong lần này], chains, stageUp, eventQuestsAuto: [{eventId, tem, dayKey}] }
export function refreshMeta(state, nowInfo, ctx) {
  trackRealDay(state, nowInfo)
  const before = new Set(((state.mail && state.mail.list) || []).map(m => m.id))
  const daily = ensureDaily(state, nowInfo, ctx)
  refreshMail(state, nowInfo, ctx)
  const eventQuestsAuto = ensureEventQuests(state, nowInfo, ctx)
  const chains = refreshChains(state, nowInfo, ctx)
  settleEvents(state, nowInfo, ctx)
  const stageUp = updateStageUp(state, ctx)
  const newMail = ((state.mail && state.mail.list) || []).map(m => m.id).filter(id => !before.has(id))
  return { questsRolled: daily.rolled, newMail, chains, stageUp, eventQuestsAuto }
}

// Xử lý một sự kiện miền (thuần; dùng được trong test không cần bus). nowInfo có thể null (bỏ phần theo ngày thật).
export function handleMetaEvent(state, type, payload, ctx, nowInfo = null) {
  if (!state || !type || OWN_PREFIXES.some(p => type.startsWith(p))) return []
  if (type === 'shift.started' && nowInfo) {
    refreshMeta(state, nowInfo, ctx)
    markEventDay(state, nowInfo, ctx)
  }
  // tiến độ tính vào bộ nhiệm vụ của hôm nay: đổi ngày ngay cả khi đang chơi qua mốc 04:00
  // (Việc hôm nay, việc sự kiện; ca vắt qua 04:00 cũng tính là đã chơi ngày mới trong mùa sự kiện)
  if (nowInfo && state.daily && state.daily.dayKey && nowInfo.dayKey > state.daily.dayKey) {
    ensureDaily(state, nowInfo, ctx)
    ensureEventQuests(state, nowInfo, ctx)
    if (state.shift) markEventDay(state, nowInfo, ctx)
  }
  const sigs = signalsFor(state, type, payload || {})
  if (type === 'shift.ended' && nowInfo) {
    const late = (payload && payload.lateReviews) || ((lastHistory(state, payload && payload.day) || {}).lateReviews) || []
    if (late.length) queueLateReviews(state, late, payload.day, nowInfo)
  }
  for (const s of sigs) {
    applyQuestSignal(state, s.sig, s.n, ctx, { recipeId: s.recipeId })
    applyChainSignal(state, s.sig, s.n, nowInfo, ctx)
    if (nowInfo) applyEventQuestSignal(state, s.sig, s.n, nowInfo, ctx)
  }
  if (type === 'dish.done' && nowInfo && payload) awardDishTem(state, payload.recipeId, payload.grade, nowInfo, ctx)
  if (RECHECK.includes(type)) {
    refreshChains(state, nowInfo, ctx)
    if (type !== 'customer.rated') updateStageUp(state, ctx)
  }
  return sigs
}

// Gắn vào bus (on '*'). Trả hàm gỡ.
export function attachMeta(bus, getState, ctx) {
  return bus.on('*', (payload, type) => {
    const state = getState()
    if (!state) return
    handleMetaEvent(state, type, payload, ctx, nowInfoFrom(state, ctx))
  })
}

