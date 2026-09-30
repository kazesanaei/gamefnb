// Sự kiện: (1) sự kiện có thời hạn theo lịch thật (Tri ân 20/11…) chạy theo dữ liệu EVENTS;
// (2) sự kiện ngày (Trời mưa, Nắng nóng…) bốc theo seed + ngày game, móc vào startShift/sinh khách.
// Thời gian luôn truyền vào (nowMs / nowInfo từ makeNowInfo); không đọc đồng hồ.
import { EVENTS as DEFAULT_EVENTS } from '../data/events.js'
import { seedFrom, nextFloat, weightedPick } from './rng.js'
import { cfg, emit } from './state.js'
import { vnDayStartMs, addDaysKey } from './clock.js'
import { defaultEventState, grantReward, incomeMoney } from './rewards.js'
import { pushMail, mailValueRoom } from './mail.js'
import { spend } from './economy.js'

const DAY_MS = 24 * 3600 * 1000

// Chấp nhận ctx, ctx.data hoặc bảng EVENTS.
function eventsOf(src) {
  if (!src) return DEFAULT_EVENTS
  if (src.data && src.data.EVENTS) return src.data.EVENTS
  if (src.EVENTS) return src.EVENTS
  if (src.data) return DEFAULT_EVENTS
  return src
}

function D(ctx) { return (ctx && ctx.data) || {} }

// Các mốc thời gian (ms) của một sự kiện.
export function eventWindow(ev) {
  const fromMs = vnDayStartMs(ev.from)
  const toMs = vnDayStartMs(ev.to)
  return {
    fromMs, toMs,
    teaserMs: fromMs - (ev.teaserDays ?? 3) * DAY_MS,
    graceEndMs: toMs + (ev.graceDays ?? 3) * DAY_MS,
    lastDay: addDaysKey(ev.to, -1)
  }
}

// Sự kiện đang mở tại nowMs? from ≤ now < to (mốc 04:00 giờ Việt Nam).
export function isEventActive(eventId, nowMs, events = null) {
  const ev = eventsOf(events)[eventId]
  if (!ev) return false
  const w = eventWindow(ev)
  const t = Number(nowMs)
  return t >= w.fromMs && t < w.toMs
}

// 'chua_toi' | 'sap_dien_ra' (thẻ "Sắp diễn ra") | 'dang_dien_ra' | 'an_han' (đổi Tem nốt) | 'da_ket_thuc'
export function eventPhase(ev, nowMs) {
  const w = eventWindow(ev)
  const t = Number(nowMs)
  if (t < w.teaserMs) return 'chua_toi'
  if (t < w.fromMs) return 'sap_dien_ra'
  if (t < w.toMs) return 'dang_dien_ra'
  if (t < w.graceEndMs) return 'an_han'
  return 'da_ket_thuc'
}

export function activeEventIds(nowMs, ctx) {
  const E = eventsOf(ctx)
  return Object.keys(E).filter(id => isEventActive(id, nowMs, E))
}

export function eventState(state, eventId) {
  state.events = state.events && typeof state.events === 'object' ? state.events : {}
  if (!state.events[eventId]) state.events[eventId] = defaultEventState()
  return state.events[eventId]
}

// Thẻ sự kiện cho giao diện: chỉ các sự kiện đang ở giai đoạn sắp diễn ra / đang diễn ra / ân hạn.
export function eventsOverview(state, nowInfo, ctx) {
  const E = eventsOf(ctx)
  const t = nowInfo.trusted
  const out = []
  for (const ev of Object.values(E)) {
    const phase = eventPhase(ev, t)
    if (phase === 'chua_toi' || phase === 'da_ket_thuc') continue
    const w = eventWindow(ev)
    const es = state.events && state.events[ev.id]
    const tem = es ? es.tem : 0
    const temToday = es && es.temDay === nowInfo.dayKey ? es.temToday : 0
    out.push({
      id: ev.id, name: ev.name, label: ev.label, desc: ev.desc, phase,
      pending: eventPending(state, ev, phase, nowInfo, ctx),
      fromMs: w.fromMs, toMs: w.toMs, graceEndMs: w.graceEndMs,
      msToStart: Math.max(0, w.fromMs - t), msToEnd: Math.max(0, w.toMs - t),
      currencyName: ev.currencyName, tem, temToday, dailyCap: (ev.tem && ev.tem.dailyCap) || 0,
      recipes: (ev.recipes || []).map(id => ({ id, owned: !!(state.recipes && state.recipes[id]) })),
      playDays: es ? es.days.length : 0
    })
  }
  return out
}

// Số mục đang chờ nhận của một sự kiện (chấm đỏ ở thẻ sự kiện màn Chuẩn bị): điểm danh sự kiện nhận được,
// việc sự kiện xong chưa nhận (trong mùa), bước chuỗi sự kiện xong chưa nhận (trong mùa và ân hạn).
export function eventPending(state, ev, phase, nowInfo, ctx) {
  const es = state.events && state.events[ev.id]
  let n = 0
  if (phase === 'dang_dien_ra') {
    if (ev.checkin && eventCheckinStatus(state, ev.id, nowInfo, ctx).canClaim) n += 1
    if (es && es.quests && es.quests.dayKey === nowInfo.dayKey) n += es.quests.list.filter(q => !q.claimed && q.progress >= q.target).length
  }
  if (phase === 'dang_dien_ra' || phase === 'an_han') {
    const cs = ev.chain && state.chains && state.chains[ev.chain.id]
    if (cs && Array.isArray(cs.claimable)) n += cs.claimable.length
  }
  return n
}

// Ghi nhận ngày thật đã chơi trong mùa (gọi khi mở ca).
export function markEventDay(state, nowInfo, ctx) {
  for (const id of activeEventIds(nowInfo.trusted, ctx)) {
    const es = eventState(state, id)
    if (!es.days.includes(nowInfo.dayKey)) es.days.push(nowInfo.dayKey)
  }
}

// Tem từ món đạt Ngon trở lên (món lễ thêm festiveBonus), trần dailyCap mỗi ngày thật. Trả tổng Tem nhận.
export function awardDishTem(state, recipeId, grade, nowInfo, ctx) {
  if (grade !== 'ngon' && grade !== 'tuyet_hao') return 0
  const E = eventsOf(ctx)
  let total = 0
  for (const id of activeEventIds(nowInfo.trusted, ctx)) {
    const ev = E[id]
    const T = ev.tem || {}
    const es = eventState(state, id)
    if (es.temDay !== nowInfo.dayKey) { es.temDay = nowInfo.dayKey; es.temToday = 0 }
    let n = (T.perGoodDish || 0) + ((ev.recipes || []).includes(recipeId) ? (T.festiveBonus || 0) : 0)
    const cap = T.dailyCap ?? Infinity
    n = Math.max(0, Math.min(n, cap - es.temToday))
    if (n <= 0) continue
    es.temToday += n
    es.tem += n
    es.temTotal = (es.temTotal || 0) + n
    if (state.stats) state.stats.temEarned = (state.stats.temEarned || 0) + n
    total += n
    emit(ctx, 'tem.gained', { eventId: id, n, today: es.temToday, cap })
  }
  return total
}

// ---------- Nhiệm vụ sự kiện (mỗi ngày thật, cố định theo dữ liệu) ----------

// Việc sự kiện của ngày thật hôm nay. Sang ngày mới: việc hôm trước đã xong mà chưa nhận được tự cộng Tem
// (lỡ ngày không mất gì, kể cả ngày cuối mùa). Trả [{eventId, tem, dayKey}] các lần tự nhận để giao diện báo.
export function ensureEventQuests(state, nowInfo, ctx) {
  const E = eventsOf(ctx)
  const auto = []
  for (const [id, es] of Object.entries(state.events || {})) {
    const ev = E[id]
    if (!ev || es.settled || !es.quests || !es.quests.dayKey || es.quests.dayKey === nowInfo.dayKey) continue
    let tem = 0
    for (const q of es.quests.list || []) {
      if (q.claimed || !(q.progress >= q.target)) continue
      const def = (ev.quests || []).find(x => x.id === q.id) || {}
      q.claimed = true
      tem += grantReward(state, def.reward || {}, ctx, { eventId: id }).tem || 0
    }
    if (tem > 0) auto.push({ eventId: id, tem, dayKey: es.quests.dayKey })
  }
  for (const id of activeEventIds(nowInfo.trusted, ctx)) {
    const es = eventState(state, id)
    if (es.quests.dayKey === nowInfo.dayKey) continue
    es.quests = { dayKey: nowInfo.dayKey, list: (E[id].quests || []).map(q => ({ id: q.id, target: q.target, progress: 0, claimed: false })) }
  }
  return auto
}

// Tín hiệu mà việc sự kiện đang đếm: bật Hỗ trợ (def.assist) thì đếm tín hiệu thay thế (def.assistSignal).
function questSignalOf(state, def) {
  return def.assistSignal && def.assist && state.settings && state.settings[def.assist] ? def.assistSignal : def.signal
}

export function applyEventQuestSignal(state, sig, n, nowInfo, ctx) {
  const E = eventsOf(ctx)
  const changes = []
  for (const id of activeEventIds(nowInfo.trusted, ctx)) {
    const es = eventState(state, id)
    if (es.quests.dayKey !== nowInfo.dayKey) continue
    for (const q of es.quests.list) {
      const def = (E[id].quests || []).find(x => x.id === q.id)
      if (!def || questSignalOf(state, def) !== sig || q.claimed || q.progress >= q.target) continue
      q.progress = Math.min(q.target, q.progress + (Number(n) || 0))
      const done = q.progress >= q.target
      const c = { eventId: id, id: q.id, progress: q.progress, target: q.target, done, justDone: done }
      changes.push(c)
      emit(ctx, 'event.quest', c)
    }
  }
  return changes
}

export function eventQuestList(state, eventId, nowInfo, ctx) {
  const ev = eventsOf(ctx)[eventId]
  const es = state.events && state.events[eventId]
  if (!ev || !es || es.quests.dayKey !== nowInfo.dayKey) return []
  return es.quests.list.map(q => {
    const def = (ev.quests || []).find(x => x.id === q.id) || {}
    const alt = questSignalOf(state, def) !== def.signal
    return { id: q.id, text: String(def.text || '').replace('{n}', String(q.target)), progress: q.progress, target: q.target,
      done: q.progress >= q.target, claimed: q.claimed, reward: def.reward || {}, assistText: alt ? def.assistText || '' : '' }
  })
}

export function claimEventQuest(state, eventId, questId, nowInfo, ctx) {
  const ev = eventsOf(ctx)[eventId]
  if (!ev) return { ok: false, reason: 'khong_co' }
  if (!isEventActive(eventId, nowInfo.trusted, ctx)) return { ok: false, reason: 'het_su_kien' }
  const es = eventState(state, eventId)
  const q = es.quests.dayKey === nowInfo.dayKey ? es.quests.list.find(x => x.id === questId) : null
  if (!q) return { ok: false, reason: 'khong_co' }
  if (q.claimed) return { ok: false, reason: 'da_nhan' }
  if (q.progress < q.target) return { ok: false, reason: 'chua_xong' }
  const def = (ev.quests || []).find(x => x.id === questId) || {}
  q.claimed = true
  const reward = grantReward(state, def.reward || {}, ctx, { eventId })
  return { ok: true, reward }
}

// ---------- Điểm danh sự kiện ----------

export function eventCheckinStatus(state, eventId, nowInfo, ctx) {
  const ev = eventsOf(ctx)[eventId]
  if (!ev || !ev.checkin) return { canClaim: false, reason: 'khong_co', next: 0, slots: 0 }
  const es = eventState(state, eventId)
  const slots = ev.checkin.slots || 7
  let reason = null
  if (!isEventActive(eventId, nowInfo.trusted, ctx)) reason = 'het_su_kien'
  else if (nowInfo.rewind) reason = 'lui_gio'
  else if (es.checkin.next >= slots) reason = 'het_luot'
  else if (es.checkin.lastDay && nowInfo.dayKey <= es.checkin.lastDay) reason = 'da_nhan'
  return { canClaim: reason === null, reason, next: es.checkin.next, slots, tem: ev.checkin.tem || 0 }
}

export function claimEventCheckin(state, eventId, nowInfo, ctx) {
  const st = eventCheckinStatus(state, eventId, nowInfo, ctx)
  if (!st.canClaim) return { ok: false, reason: st.reason }
  const es = eventState(state, eventId)
  es.checkin.next += 1
  es.checkin.lastDay = nowInfo.dayKey
  const reward = grantReward(state, { tem: st.tem }, ctx, { eventId })
  return { ok: true, index: es.checkin.next - 1, reward }
}

// ---------- Quầy đổi Tem ----------

export function exchangeList(state, eventId, ctx) {
  const ev = eventsOf(ctx)[eventId]
  if (!ev) return []
  const es = eventState(state, eventId)
  return (ev.exchange || []).map(x => {
    const used = es.exchanged[x.id] || 0
    return { ...x, used, left: Math.max(0, (x.limit ?? Infinity) - used), canAfford: es.tem >= x.price }
  })
}

// Đổi Tem: trong mùa và trong thời gian ân hạn.
export function exchangeTem(state, eventId, itemId, nowInfo, ctx) {
  const ev = eventsOf(ctx)[eventId]
  if (!ev) return { ok: false, reason: 'khong_co' }
  const phase = eventPhase(ev, nowInfo.trusted)
  if (phase !== 'dang_dien_ra' && phase !== 'an_han') return { ok: false, reason: 'het_su_kien' }
  const x = (ev.exchange || []).find(y => y.id === itemId)
  if (!x) return { ok: false, reason: 'khong_co' }
  const es = eventState(state, eventId)
  const used = es.exchanged[x.id] || 0
  if (x.limit !== undefined && used >= x.limit) return { ok: false, reason: 'het_luot' }
  if (x.gives && x.gives.cosmetic && state.cosmetics && (state.cosmetics.owned || []).includes(x.gives.cosmetic)) return { ok: false, reason: 'da_co' }
  if (es.tem < x.price) return { ok: false, reason: 'thieu_tem' }
  es.tem -= x.price
  es.exchanged[x.id] = used + 1
  const reward = grantReward(state, x.gives || {}, ctx)
  return { ok: true, reward, tem: es.tem }
}

// Tiền đổi từ `tem` Tem dư (tỉ lệ thấp, leftover { per, incomeMul, maxIncomeMul }) theo ngày game `day`.
export function leftoverMoney(ev, tem, ctx, day) {
  const L = ev.leftover || { per: 100, incomeMul: 0.2, maxIncomeMul: 1 }
  const unit = incomeMoney(ctx, L.incomeMul ?? 0.2, day)
  let money = Math.floor(((Number(tem) || 0) / (L.per || 100)) * unit / 1000) * 1000
  if (L.maxIncomeMul) money = Math.min(money, incomeMoney(ctx, L.maxIncomeMul, day))
  return Math.max(0, money)
}

// Hết ân hạn: Tem dư tự đổi ra Tiền quán (tỉ lệ thấp, có trần mỗi sự kiện) và gửi qua Hộp thư. Thư tính vào trần
// tiền quà của tháng (không phải quà đền bù): còn ít chỗ thì đổi ít lại. Trả mảng id thư.
export function settleEvents(state, nowInfo, ctx) {
  const E = eventsOf(ctx)
  const out = []
  for (const [id, es] of Object.entries(state.events || {})) {
    const ev = E[id]
    if (!ev || es.settled) continue
    if (eventPhase(ev, nowInfo.trusted) !== 'da_ket_thuc') continue
    es.settled = true
    if (es.tem > 0) {
      const tem = es.tem
      es.tem = 0
      const full = leftoverMoney(ev, tem, ctx, state.day)
      const money = Math.min(full, Math.floor(mailValueRoom(state, nowInfo, ctx) / 1000) * 1000)
      if (full <= 0) continue
      const r = pushMail(state, {
        id: `tem_du:${id}`, kind: 'su_kien', title: `${ev.name}: đổi ${ev.currencyName} dư`,
        body: money > 0
          ? `Còn ${tem} ${ev.currencyName} chưa dùng, quán đổi ra Tiền quán cho bạn.`
          : `Còn ${tem} ${ev.currencyName} chưa dùng, nhưng quà tháng này đã đủ nên không đổi thêm được.`,
        reward: money > 0 ? { money } : {}
      }, nowInfo, ctx)
      if (r.ok) out.push(r.mail.id)
    }
  }
  return out
}

// ---------- Sự kiện ngày ----------

// Sự kiện của ngày game `day` (tất định theo seed); null nếu không có.
export function rollDayEvent(state, day, ctx) {
  const DE = D(ctx).DAY_EVENTS
  const C = D(ctx).DAY_EVENT_CONFIG || { fromDay: 3, chance: 0.3 }
  if (!DE || day < (C.fromDay ?? 3)) return null
  const holder = { rng: seedFrom(state.seed, day, 'su_kien_ngay') }
  if (nextFloat(holder) >= (C.chance ?? 0.3)) return null
  const items = Object.values(DE).filter(e => (e.fromDay || 1) <= day).map(e => ({ id: e.id, w: e.w || 1 }))
  if (!items.length) return null
  return weightedPick(holder, items).id
}

// Thông tin sự kiện ngày cho màn Chuẩn bị / Tổng kết ("Ngày mai: …").
export function dayEventInfo(state, day, ctx) {
  const id = rollDayEvent(state, day, ctx)
  if (!id) return null
  const ev = D(ctx).DAY_EVENTS[id]
  let choice = null
  if (ev.choice) {
    const free = !!(ev.choice.freeWithItem && state.items && state.items[ev.choice.freeWithItem] > 0)
    const chosen = free || !!(state.prep && state.prep.day === day && state.prep.dayEventChoice === ev.choice.id)
    choice = { id: ev.choice.id, label: ev.choice.label, desc: ev.choice.desc, cost: free ? 0 : (ev.choice.cost || 0), free, chosen }
  }
  return { id, name: ev.name, desc: ev.desc, icon: ev.icon, effects: ev.effects, choice }
}

// Hiệu ứng thật của sự kiện ngày: đã chọn (hoặc tự áp nhờ hiện vật) lựa chọn như Căng bạt thì dùng hiệu ứng của lựa chọn.
export function dayEventEffects(info, ctx) {
  if (!info) return {}
  const def = D(ctx).DAY_EVENTS && D(ctx).DAY_EVENTS[info.id]
  if (info.choice && (info.choice.chosen || info.choice.free) && def && def.choice && def.choice.effects) return def.choice.effects
  return info.effects || {}
}

function ensurePrep(state) {
  if (!state.prep || typeof state.prep !== 'object' || state.prep.day !== state.day) {
    state.prep = { day: state.day, coupon: false, dayEventChoice: null }
  }
  return state.prep
}

// Chọn/bỏ lựa chọn của sự kiện ngày (vd 'cang_bat') cho ca sắp mở. Tiền trừ lúc mở ca.
export function setDayEventChoice(state, choiceId, ctx) {
  if (state.shift) return { ok: false, reason: 'dang_ban' }
  const info = dayEventInfo(state, state.day, ctx)
  const prep = ensurePrep(state)
  if (!choiceId) { prep.dayEventChoice = null; return { ok: true } }
  if (!info || !info.choice || info.choice.id !== choiceId) return { ok: false, reason: 'khong_co' }
  if (info.choice.cost > state.wallet) return { ok: false, reason: 'thieu_tien' }
  prep.dayEventChoice = choiceId
  return { ok: true, cost: info.choice.cost }
}

// Bật/tắt dùng Phiếu Chợ Sớm cho ca sắp mở (trừ phiếu lúc mở ca).
export function setMarketCoupon(state, on) {
  if (state.shift) return { ok: false, reason: 'dang_ban' }
  const prep = ensurePrep(state)
  if (on && !(state.items && state.items.phieu_cho_som > 0)) return { ok: false, reason: 'khong_co' }
  prep.coupon = !!on
  return { ok: true }
}

// Tính hệ số của ca sắp mở và thực hiện các khoản đi kèm (trừ tiền căng bạt, dùng Phiếu Chợ Sớm).
// Gọi từ startShift TRƯỚC khi ghi walletStart. nowMs (tùy chọn) để biết sự kiện có thời hạn đang mở.
export function prepareShiftMods(state, ctx, nowMs = null) {
  const mods = { customerMul: 1, extraCustomers: 0, patienceMul: 1, tipMul: 1, recipeWeight: {}, noteBoost: {},
    noteBoostRate: 0, cogsMul: 1, dayEvent: null, events: [], prepCost: 0 }
  const day = state.day
  const info = dayEventInfo(state, day, ctx)
  if (info) {
    const def = D(ctx).DAY_EVENTS[info.id]
    let eff = def.effects || {}
    let choice = null
    if (info.choice && info.choice.chosen) {
      if (info.choice.cost > 0 && spend(state, info.choice.cost, 'day_event')) { mods.prepCost += info.choice.cost; choice = info.choice.id }
      else if (info.choice.cost === 0) choice = info.choice.id
      if (choice) eff = def.choice.effects || eff
    }
    mods.customerMul = eff.customerMul ?? 1
    mods.extraCustomers = eff.extraCustomers || 0
    mods.patienceMul = eff.patienceMul ?? 1
    mods.tipMul = eff.tipMul ?? 1
    for (const [id, w] of Object.entries(eff.recipeWeight || {})) mods.recipeWeight[id] = w
    for (const [id, notes] of Object.entries(eff.noteBoost || {})) mods.noteBoost[id] = notes.slice()
    const C = D(ctx).DAY_EVENT_CONFIG || {}
    if (Object.keys(mods.noteBoost).length) mods.noteBoostRate = C.noteBoostRate ?? 0.35
    mods.dayEvent = { id: info.id, choice }
  }
  // Phiếu Chợ Sớm
  const prep = state.prep && state.prep.day === day ? state.prep : null
  if (prep && prep.coupon && state.items && state.items.phieu_cho_som > 0) {
    state.items.phieu_cho_som -= 1
    const it = D(ctx).ITEMS && D(ctx).ITEMS.phieu_cho_som
    mods.cogsMul = (it && it.effect && it.effect.cogsMul) || 0.8
  }
  if (prep) { prep.coupon = false; prep.dayEventChoice = null }
  // Sự kiện có thời hạn: món lễ được gọi nhiều hơn (giá không đổi)
  if (nowMs !== null && nowMs !== undefined) {
    const E = eventsOf(ctx)
    for (const id of activeEventIds(nowMs, ctx)) {
      mods.events.push(id)
      for (const rid of E[id].recipes || []) mods.recipeWeight[rid] = (mods.recipeWeight[rid] || 1) * (E[id].recipeWeightMul || 1)
    }
  }
  return mods
}

// Số khách sau hệ số sự kiện ngày: làm tròn, sàn minCustomers; tăng khách thì trần eventCustomerCap (Chợ phiên),
// còn lại trần 8.
export function applyCustomerMods(n, mods, ctx) {
  if (!mods) return n
  const C = D(ctx).DAY_EVENT_CONFIG || {}
  let v = Math.round(n * (mods.customerMul ?? 1)) + (mods.extraCustomers || 0)
  const cap = (mods.customerMul ?? 1) > 1 ? cfg(ctx, 'eventCustomerCap') : Math.max(8, n)
  v = Math.min(cap, v)
  return Math.max(Math.min(n, C.minCustomers ?? 3), v)
}

