// Phần thưởng dùng chung cho các hệ thống meta (điểm danh, nhiệm vụ, hộp thư, chuỗi, sự kiện).
// Lược đồ Reward xem src/data/checkin.js. Lõi đọc dữ liệu qua ctx.data.
import { emit, refIncomeFor, newRecipeProgress } from './state.js'

const isObj = v => v && typeof v === 'object' && !Array.isArray(v)

function findUpgrade(data, id) {
  const U = data && data.UPGRADES
  if (!U) return null
  return Array.isArray(U) ? U.find(u => u.id === id) || null : (U[id] || null)
}

function itemDef(data, id) {
  return (data && data.ITEMS && data.ITEMS[id]) || null
}

// Tiền của một bội thu nhập tham chiếu (làm tròn lên bội 1.000đ).
export function incomeMoney(ctx, mul, day) {
  const m = Number(mul) || 0
  if (m <= 0) return 0
  return Math.ceil((m * refIncomeFor(ctx, day)) / 1000) * 1000
}

// Hiện vật vĩnh viễn đã có (hoặc nâng cấp đã mua) → phần thưởng cần quy đổi.
function needsFallback(state, reward, data) {
  if (reward.upgrade && state.upgrades && state.upgrades[reward.upgrade]) return true
  if (reward.recipe && state.recipes && state.recipes[reward.recipe]) return !!reward.fallback
  if (isObj(reward.items)) {
    for (const id of Object.keys(reward.items)) {
      const d = itemDef(data, id)
      if (d && d.permanent && (state.items && state.items[id] > 0)) return true
    }
  }
  return false
}

// Quy phần thưởng về dạng cụ thể (không sửa state): incomeMul → money theo ngày game hiện tại,
// nâng cấp/hiện vật vĩnh viễn đã có → dùng fallback. Trả object mới, có converted: true khi đã quy đổi.
export function resolveReward(state, reward, ctx, opts = {}) {
  if (!isObj(reward)) return {}
  const data = ctx && ctx.data
  let src = reward
  let converted = false
  if (needsFallback(state, reward, data) && isObj(reward.fallback)) { src = reward.fallback; converted = true }
  const out = {}
  const day = opts.day ?? state.day ?? 1
  const money = (Math.round(Number(src.money) || 0)) + incomeMoney(ctx, src.incomeMul, day)
  if (money > 0) out.money = money
  for (const k of ['gold', 'rep', 'tem']) {
    const v = Math.round(Number(src[k]) || 0)
    if (v > 0) out[k] = v
  }
  if (isObj(src.items)) {
    const items = {}
    for (const [id, n] of Object.entries(src.items)) { const v = Math.round(Number(n) || 0); if (v > 0) items[id] = v }
    if (Object.keys(items).length) out.items = items
  }
  for (const k of ['upgrade', 'cosmetic', 'title', 'recipe', 'tipId', 'unlock', 'label']) if (src[k]) out[k] = src[k]
  if (reward.label && !out.label) out.label = reward.label
  if (converted) out.converted = true
  if (opts.eventId && out.tem) out.eventId = opts.eventId
  return out
}

function addUnique(arr, id) {
  if (!arr.includes(id)) arr.push(id)
}

// Giá trị quy ra tiền của phần thưởng đã resolve (dùng cho trần quà Hộp thư): chỉ tính tiền.
export function rewardMoneyValue(resolved) {
  return (resolved && Number(resolved.money)) || 0
}

// Trao phần thưởng đã resolve (hoặc Reward thô: tự resolve). Sửa state. Trả phần thưởng cụ thể đã trao.
// opts.eventId: Tem thuộc sự kiện nào; opts.resolved = true: reward đã là dạng cụ thể.
export function grantReward(state, reward, ctx, opts = {}) {
  const r = opts.resolved ? { ...reward } : resolveReward(state, reward, ctx, opts)
  const data = ctx && ctx.data
  if (r.money) state.wallet += r.money
  if (r.gold) state.goldSpoons = (state.goldSpoons || 0) + r.gold
  if (r.rep) state.reputation = (state.reputation || 0) + r.rep
  if (r.items) {
    state.items = state.items || {}
    for (const [id, n] of Object.entries(r.items)) {
      const d = itemDef(data, id)
      state.items[id] = d && d.permanent ? 1 : (Number(state.items[id]) || 0) + n
    }
  }
  if (r.upgrade && findUpgrade(data, r.upgrade)) {
    if (!state.upgrades[r.upgrade]) {
      state.upgrades[r.upgrade] = true
      emit(ctx, 'upgrade.gained', { upgradeId: r.upgrade })
    }
  }
  if (r.cosmetic) {
    state.cosmetics = state.cosmetics || { owned: [], equipped: {} }
    addUnique(state.cosmetics.owned, r.cosmetic)
  }
  if (r.title) { state.titles = state.titles || []; addUnique(state.titles, r.title) }
  if (r.unlock) { state.unlocks = state.unlocks || []; addUnique(state.unlocks, r.unlock) }
  if (r.tipId) { state.tipsSeen = state.tipsSeen || []; addUnique(state.tipsSeen, r.tipId) }
  if (r.recipe && data && data.RECIPES && data.RECIPES[r.recipe] && !state.recipes[r.recipe]) {
    state.recipes[r.recipe] = newRecipeProgress(state.day)
    const rec = data.RECIPES[r.recipe]
    if (rec.source === 'event') {
      const ev = rec.eventId && data.EVENTS && data.EVENTS[rec.eventId]
      state.eventRecipes = state.eventRecipes || {}
      state.eventRecipes[r.recipe] = { eventId: rec.eventId || null, label: (ev && ev.label) || '', day: state.day }
    }
    emit(ctx, 'recipe.gained', { recipeId: r.recipe })
  }
  if (r.tem) {
    const evId = r.eventId || opts.eventId
    if (evId) {
      state.events = state.events || {}
      const ev = state.events[evId] || (state.events[evId] = defaultEventState())
      ev.tem += r.tem
      ev.temTotal = (ev.temTotal || 0) + r.tem
      if (state.stats) state.stats.temEarned = (state.stats.temEarned || 0) + r.tem
    }
  }
  return r
}

// Trạng thái mặc định của một sự kiện có thời hạn trong save.
export function defaultEventState() {
  return {
    tem: 0, temTotal: 0, temDay: '', temToday: 0,
    days: [],                                  // ngày thật đã chơi trong mùa
    quests: { dayKey: '', list: [] },
    checkin: { next: 0, lastDay: '' },
    exchanged: {},
    settled: false
  }
}
