// Nhiệm vụ ngày "Việc hôm nay": reset 04:00 giờ Việt Nam, bốc 3 nhiệm vụ (Quầy, Bếp, Chất lượng/Kinh doanh)
// bằng seedFrom(state.seed, dayKey); tiến độ tự đếm qua tín hiệu từ bus (src/core/stats.js);
// bấm Nhận lấy thưởng; đủ 3 mở Rương ngày; đổi nhiệm vụ 1 lần miễn phí/ngày, sau đó tốn Muỗng Vàng.
// Nhiệm vụ đã xong mà chưa nhận trước giờ reset → tự vào Hộp thư.
import { seedFrom, pick } from './rng.js'
import { cfg, emit } from './state.js'
import { customerCount } from './shift.js'
import { formatVND } from './money.js'
import { isRecentRecipe } from './stats.js'
import { resolveReward, grantReward } from './rewards.js'
import { pushMail } from './mail.js'
import { addDaysKey } from './clock.js'

function D(ctx) { return (ctx && ctx.data) || {} }
function questDefs(ctx) { return D(ctx).QUESTS || [] }
function qcfg(ctx) {
  return D(ctx).QUEST_CONFIG || { perDay: 3, groups: ['quay', 'bep', 'chat_luong'], shiftsPerDay: 2,
    reward: { incomeMul: 0.2, rep: 5 }, chest: { incomeMul: 0.2, gold: 5 }, freeRerolls: 1, rerollCost: 5, forgottenMailDays: 7 }
}
export function questDef(ctx, id) { return questDefs(ctx).find(q => q.id === id) || null }

function ensure(state) {
  if (!state.daily || typeof state.daily !== 'object') {
    state.daily = { dayKey: '', gameDay: 0, quests: [], prevIds: [], rerolls: 0, chestClaimed: false }
  }
  return state.daily
}

// Nhiệm vụ đủ điều kiện ở ngày game hiện tại?
export function questEligible(state, def, ctx) {
  const c = def.cond || {}
  if (c.fromDayKey && state.day < cfg(ctx, c.fromDayKey)) return false
  if (c.fromDay && state.day < c.fromDay) return false
  if (c.recentRecipeDays) {
    const ok = Object.keys(state.recipes || {}).some(id => isRecentRecipe(state, id, c.recentRecipeDays))
    if (!ok) return false
  }
  return true
}

// Chỉ tiêu: cố định (base) hoặc co giãn theo số khách dự kiến của ~2 ca.
export function questTarget(state, def, ctx) {
  const t = def.target || {}
  if (typeof t === 'number') return t
  if (t.base) return t.base
  const N = customerCount(state, ctx, state.day)
  const raw = (t.perCustomer || 1) * N * (qcfg(ctx).shiftsPerDay || 2)
  const step = t.round || 1
  let v = Math.round(raw / step) * step
  if (t.min) v = Math.max(t.min, v)
  if (t.max) v = Math.min(t.max, v)
  return Math.max(1, v)
}

function makeEntry(state, def, ctx) {
  return { id: def.id, group: def.group, target: questTarget(state, def, ctx), progress: 0, claimed: false }
}

// Bốc bộ nhiệm vụ của dayKey (tất định theo seed + ngày). exclude: id không được bốc (hôm qua).
export function rollDailyQuests(state, dayKey, ctx, exclude = []) {
  const holder = { rng: seedFrom(state.seed, dayKey, 'viec_hom_nay') }
  const defs = questDefs(ctx)
  const out = []
  for (const g of qcfg(ctx).groups) {
    const inGroup = defs.filter(d => d.group === g)
    const eligible = inGroup.filter(d => questEligible(state, d, ctx))
    let pool = eligible.filter(d => !exclude.includes(d.id))
    if (!pool.length) pool = eligible
    if (!pool.length) pool = inGroup
    const d = pick(holder, pool)
    if (d) out.push(makeEntry(state, d, ctx))
  }
  return out
}

function questDone(q) { return q.progress >= q.target }

// Đổi ngày: nhiệm vụ xong chưa nhận (và Rương ngày chưa mở) → Hộp thư; bốc bộ mới không lặp hôm qua.
// Trả { rolled, mailed: [mailId] }. Lùi giờ (dayKey nhỏ hơn ngày đang có) → không đổi.
export function ensureDaily(state, nowInfo, ctx) {
  const d = ensure(state)
  const key = nowInfo.dayKey
  if (d.dayKey === key) return { rolled: false, mailed: [] }
  if (d.dayKey && key < d.dayKey) return { rolled: false, mailed: [] }
  const mailed = []
  const QC = qcfg(ctx)
  const MQ = D(ctx).MAIL_QUEST || {}
  if (d.dayKey) {
    const expires = addDaysKey(key, QC.forgottenMailDays || 7)
    for (const q of d.quests) {
      if (!questDone(q) || q.claimed) continue
      const def = questDef(ctx, q.id)
      const id = `nv:${d.dayKey}:${q.id}`
      const r = pushMail(state, {
        id, kind: 'nhiem_vu', title: MQ.title || 'Việc hôm qua chưa nhận thưởng',
        body: String(MQ.body || '').replace('{text}', def ? questText(def, q.target) : q.id),
        reward: resolveReward(state, QC.reward, ctx), expiresDay: expires
      }, nowInfo, ctx)
      if (r.ok) mailed.push(id)
    }
    if (d.quests.length && d.quests.every(questDone) && !d.chestClaimed) {
      const id = `ruong:${d.dayKey}`
      const r = pushMail(state, {
        id, kind: 'nhiem_vu', title: MQ.chestTitle || 'Rương ngày chưa mở', body: MQ.chestBody || '',
        reward: resolveReward(state, QC.chest, ctx), expiresDay: expires
      }, nowInfo, ctx)
      if (r.ok) mailed.push(id)
    }
  }
  d.prevIds = d.quests.map(q => q.id)
  d.quests = rollDailyQuests(state, key, ctx, d.prevIds)
  d.dayKey = key
  d.gameDay = state.day
  d.rerolls = 0
  d.chestClaimed = false
  return { rolled: true, mailed }
}

export function questText(def, target) {
  return String(def.text || '').replace('{n}', String(target)).replace('{money}', formatVND(target))
}

// Danh sách cho giao diện.
export function questList(state, ctx) {
  const d = ensure(state)
  const QC = qcfg(ctx)
  const G = D(ctx).QUEST_GROUPS || {}
  const list = d.quests.map((q, index) => {
    const def = questDef(ctx, q.id) || {}
    return {
      index, id: q.id, group: q.group, groupName: G[q.group] || q.group,
      text: questText(def, q.target), progress: Math.min(q.progress, q.target), target: q.target,
      done: questDone(q), claimed: q.claimed, canClaim: questDone(q) && !q.claimed,
      reward: resolveReward(state, QC.reward, ctx)
    }
  })
  const allDone = d.quests.length > 0 && d.quests.every(questDone)
  return {
    dayKey: d.dayKey, quests: list,
    chest: { available: allDone && !d.chestClaimed, claimed: d.chestClaimed, reward: resolveReward(state, QC.chest, ctx) },
    reroll: { free: d.rerolls < (QC.freeRerolls ?? 1), cost: d.rerolls < (QC.freeRerolls ?? 1) ? 0 : (QC.rerollCost ?? 5) }
  }
}

// Cộng tiến độ theo tín hiệu. Trả mảng thay đổi [{index, id, progress, target, done, justDone}].
export function applyQuestSignal(state, sig, n, ctx) {
  const d = ensure(state)
  const changes = []
  const settings = state.settings || {}
  d.quests.forEach((q, index) => {
    if (q.claimed) return
    const def = questDef(ctx, q.id)
    if (!def) return
    if (def.assist && settings[def.assist]) return
    const wasDone = questDone(q)
    if (wasDone) return
    if (def.breakOn === sig) {
      if (q.progress > 0) { q.progress = 0; changes.push({ index, id: q.id, progress: 0, target: q.target, done: false, justDone: false }) }
      return
    }
    if (def.signal !== sig) return
    q.progress = Math.min(q.target, q.progress + (Number(n) || 0))
    const done = questDone(q)
    changes.push({ index, id: q.id, progress: q.progress, target: q.target, done, justDone: done && !wasDone })
  })
  for (const c of changes) emit(ctx, 'quest.progress', c)
  return changes
}

function findIndex(d, key) {
  if (typeof key === 'number') return key
  return d.quests.findIndex(q => q.id === key)
}

// Nhận thưởng một nhiệm vụ (không nhận trong ca). → { ok, reward } | { ok: false, reason }
export function claimQuest(state, key, nowInfo, ctx) {
  const d = ensure(state)
  if (state.shift) return { ok: false, reason: 'dang_ban' }
  const i = findIndex(d, key)
  const q = d.quests[i]
  if (!q) return { ok: false, reason: 'khong_co' }
  if (q.claimed) return { ok: false, reason: 'da_nhan' }
  if (!questDone(q)) return { ok: false, reason: 'chua_xong' }
  q.claimed = true
  const reward = grantReward(state, qcfg(ctx).reward, ctx)
  if (state.stats) state.stats.questsClaimed = (state.stats.questsClaimed || 0) + 1
  emit(ctx, 'quest.claimed', { id: q.id, reward })
  return { ok: true, reward }
}

// Mở Rương ngày khi đủ 3 nhiệm vụ. Khóa khi lùi giờ.
export function claimDailyChest(state, nowInfo, ctx) {
  const d = ensure(state)
  if (nowInfo && nowInfo.rewind) return { ok: false, reason: 'lui_gio' }
  if (state.shift) return { ok: false, reason: 'dang_ban' }
  if (d.chestClaimed) return { ok: false, reason: 'da_nhan' }
  if (!d.quests.length || !d.quests.every(questDone)) return { ok: false, reason: 'chua_xong' }
  d.chestClaimed = true
  const reward = grantReward(state, qcfg(ctx).chest, ctx)
  emit(ctx, 'quest.chest', { reward })
  return { ok: true, reward }
}

// Đổi một nhiệm vụ chưa nhận: lần đầu mỗi ngày miễn phí, sau đó trừ Muỗng Vàng.
export function rerollQuest(state, key, nowInfo, ctx) {
  const d = ensure(state)
  const QC = qcfg(ctx)
  const i = findIndex(d, key)
  const q = d.quests[i]
  if (!q) return { ok: false, reason: 'khong_co' }
  if (q.claimed) return { ok: false, reason: 'da_nhan' }
  const cost = d.rerolls < (QC.freeRerolls ?? 1) ? 0 : (QC.rerollCost ?? 5)
  if (cost > 0 && (state.goldSpoons || 0) < cost) return { ok: false, reason: 'thieu_muong' }
  const current = d.quests.map(x => x.id)
  const pool = questDefs(ctx).filter(x => x.group === q.group && !current.includes(x.id) &&
    !(d.prevIds || []).includes(x.id) && questEligible(state, x, ctx))
  if (!pool.length) return { ok: false, reason: 'het_luot' }
  const holder = { rng: seedFrom(state.seed, d.dayKey, 'doi_viec', d.rerolls) }
  const def = pick(holder, pool)
  if (cost > 0) state.goldSpoons -= cost
  d.rerolls += 1
  d.quests[i] = makeEntry(state, def, ctx)
  emit(ctx, 'quest.rerolled', { index: i, from: q.id, to: def.id, cost })
  return { ok: true, cost, quest: d.quests[i] }
}
