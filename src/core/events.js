// Sự kiện: (1) sự kiện có thời hạn theo lịch thật (Tri ân 20/11…) chạy theo dữ liệu EVENTS;
// (2) sự kiện ngày (Trời mưa, Nắng nóng…) bốc theo seed + ngày game, móc vào startShift/sinh khách.
// Thời gian luôn truyền vào (nowMs / nowInfo từ makeNowInfo); không đọc đồng hồ.
import { EVENTS as DEFAULT_EVENTS } from '../data/events.js'
import { seedFrom, nextFloat, weightedPick } from './rng.js'
import { cfg, emit, eventFrequency, defaultIncidents } from './state.js'
import { vnDayStartMs, addDaysKey } from './clock.js'
import { defaultEventState, grantReward, incomeMoney } from './rewards.js'
import { pushMail, mailValueRoom } from './mail.js'
import { spend, eventMoneyIn, eventMoneyOut, eventNote } from './economy.js'
import { formatVND } from './money.js'

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

const DAY_EVENT_DEFAULTS = Object.freeze({ fromDay: 3, chance: 0.3, guaranteeAfter: 0, noRepeat: false, badFromDay: 1, cooldowns: [] })

// Loại của sự kiện ngày: 'tot' | 'chon' | 'xau' (thiếu thì coi là 'tot').
export function dayEventKind(def) {
  const k = def && def.kind
  return k === 'chon' || k === 'xau' ? k : 'tot'
}

// Nhóm cách quãng chứa sự kiện `id` (cooldowns của cấu hình và cooldownDays riêng của sự kiện): [{ids, days}].
function cooldownGroupsOf(id, def, C) {
  const out = []
  for (const g of C.cooldowns || []) if (g && Array.isArray(g.ids) && g.ids.includes(id) && g.days > 0) out.push(g)
  if (def && def.cooldownDays > 0) out.push({ ids: [id], days: def.cooldownDays })
  return out
}

// M4 (soát lỗi): sự kiện ngày đã CHỐT (đã báo trước hoặc đang diễn ra) lưu ở state.incidents.announced
// {ngày game: id | ''} ('' = ngày đó không có sự kiện). Ngày đã chốt không bốc lại, kể cả khi người chơi đổi mức "Tần
// suất sự kiện" (đổi mức chỉ áp cho các ngày chưa chốt, không thành một lượt bốc lại sự kiện đã báo). Chốt ở:
//   - màn Chuẩn bị (meta.refreshMeta → announceDayEvent(state.day)): sự kiện hôm nay đang hiện;
//   - mở ca (startShift): hôm nay và NGÀY MAI (dòng "Ngày mai" ở Tổng kết của ca này; tình huống trong ca cần biết ngày
//     mai có sự kiện xấu không để giữ luật nhịp "không 2 sự kiện xấu liền nhau", incidents.incidentCandidates).
// Chỉ giữ ANNOUNCE_KEEP ngày gần nhất (đủ cho nhóm cách quãng 7 ngày và luật "không trùng hôm trước").
export const ANNOUNCE_KEEP = 15

function announcedMap(state) {
  const A = state && state.incidents && state.incidents.announced
  return A && typeof A === 'object' && !Array.isArray(A) ? A : null
}

// Sự kiện đã chốt của ngày `d`: id | null (ngày không có sự kiện) | undefined (chưa chốt, hoặc id không còn trong dữ liệu).
function lockedDayEvent(A, d, DE) {
  if (!A || !Object.prototype.hasOwnProperty.call(A, String(d))) return undefined
  const v = A[String(d)]
  if (v === '' || v === null) return null
  return typeof v === 'string' && DE[v] ? v : undefined
}

// M4: chuỗi sự kiện ngày từ ngày fromDay tới ngày toDay, bốc TUẦN TỰ và tất định theo (hạt giống, ngày game, mức "Tần
// suất sự kiện"): mỗi ngày dùng luồng ngẫu nhiên riêng seedFrom(seed, ngày, 'su_kien_ngay') →
//   có sự kiện khi số bốc < chance hoặc đã `guaranteeAfter` ngày liền không có (bảo hiểm);
//   loại hợp lệ: đã tới fromDay của sự kiện, loại xấu từ badFromDay và không 2 ngày xấu liền, mức Ít chỉ loại tốt,
//   nhóm cách quãng (cooldowns) chưa có sự kiện trong `days` ngày gần nhất; không trùng loại hôm trước (noRepeat) khi còn
//   loại khác; bốc theo trọng số w.
// Ngày đã chốt (state.incidents.announced) dùng đúng sự kiện đã chốt, các ngày sau bốc tiếp theo đó; không lưu gì khác
// nên "Ngày mai: …" ở Tổng kết luôn khớp ngày thật sự diễn ra.
// avoidBadOn (tùy chọn): ngày không được bốc loại xấu vì sự kiện ngay trước nó trên dòng thời gian chung là loại xấu
// (announceDayEvent; chỉ đổi loại được bốc, không đổi có/không có sự kiện).
// Trả mảng `days` (days[d] = id | null với fromDay ≤ d ≤ toDay).
export function dayEventSeries(state, toDay, ctx, { avoidBadOn = null } = {}) {
  const DE = D(ctx).DAY_EVENTS
  const C = { ...DAY_EVENT_DEFAULTS, ...(D(ctx).DAY_EVENT_CONFIG || {}) }
  const days = []
  if (!DE) return days
  const freq = eventFrequency(state)
  const defs = Object.values(DE).filter(e => e && e.id)
  const fromDay = C.fromDay ?? 3
  const A = announcedMap(state)
  let since = 0            // số ngày liền (từ fromDay) không có sự kiện
  let prev = null          // sự kiện hôm trước (null nếu không có)
  const lastDay = {}       // id → ngày gần nhất có sự kiện đó
  for (let d = fromDay; d <= toDay; d++) {
    const holder = { rng: seedFrom(state.seed, d, 'su_kien_ngay') }
    const roll = nextFloat(holder)
    const guaranteed = C.guaranteeAfter > 0 && since >= C.guaranteeAfter
    let id = null
    const locked = lockedDayEvent(A, d, DE)
    if (locked !== undefined) id = locked
    else if (guaranteed || roll < (C.chance ?? 0.3)) {
      const prevBad = (prev && dayEventKind(DE[prev]) === 'xau') || d === avoidBadOn
      let cands = defs.filter(e => {
        const kind = dayEventKind(e)
        if ((e.fromDay || 1) > d) return false
        if (kind === 'xau' && (d < (C.badFromDay ?? 1) || prevBad)) return false
        if (freq === 'it' && kind !== 'tot') return false
        for (const g of cooldownGroupsOf(e.id, e, C)) {
          for (const other of g.ids) if (lastDay[other] && d - lastDay[other] < g.days) return false
        }
        return true
      })
      if (C.noRepeat && prev) {
        const fresh = cands.filter(e => e.id !== prev)
        if (fresh.length) cands = fresh
      }
      if (cands.length) id = weightedPick(holder, cands.map(e => ({ id: e.id, w: e.w || 1 }))).id
    }
    days[d] = id
    if (id) { since = 0; lastDay[id] = d } else since += 1
    prev = id
  }
  return days
}

// Sự kiện của ngày game `day` (tất định theo seed, ngày và mức "Tần suất sự kiện"; ngày đã chốt thì theo sự kiện đã chốt);
// null nếu không có.
export function rollDayEvent(state, day, ctx) {
  const DE = D(ctx).DAY_EVENTS
  const C = D(ctx).DAY_EVENT_CONFIG || DAY_EVENT_DEFAULTS
  if (!DE || !(day >= (C.fromDay ?? 3))) return null
  const locked = lockedDayEvent(announcedMap(state), day, DE)
  if (locked !== undefined) return locked
  return dayEventSeries(state, day, ctx)[day] || null
}

// Chốt sự kiện của ngày game `day` (hôm nay state.day, hoặc ngày mai state.day + 1 lúc mở ca) nếu chưa chốt, theo mức
// "Tần suất sự kiện" hiện tại; bỏ các ngày cũ hơn ANNOUNCE_KEEP ngày. Trả id | null.
// Luật nhịp "không 2 sự kiện xấu liền nhau" trên dòng thời gian chung: sự kiện gần nhất (state.incidents.lastEvent) là
// loại xấu và giữa nó với ngày `day` chắc chắn không có sự kiện nào khác (chốt hôm nay; hoặc chốt ngày mai khi hôm nay
// không có sự kiện ngày — tình huống của ca hôm nay có thể không xảy ra) → ngày `day` không bốc loại xấu. Ngày mai có
// sự kiện xấu thì tình huống của ca hôm nay không bốc loại xấu (incidents.incidentCandidates).
export function announceDayEvent(state, day, ctx) {
  const DE = D(ctx).DAY_EVENTS
  const C = D(ctx).DAY_EVENT_CONFIG || DAY_EVENT_DEFAULTS
  if (!DE || !(day >= (C.fromDay ?? 3)) || !state) return null
  if (!state.incidents || typeof state.incidents !== 'object') state.incidents = defaultIncidents()
  const S = state.incidents
  if (!announcedMap(state)) S.announced = {}
  const locked = lockedDayEvent(S.announced, day, DE)
  if (locked !== undefined) return locked
  const lastBad = S.lastEvent === 'xau'
  const avoid = lastBad && (day <= state.day || (day === state.day + 1 && !rollDayEvent(state, state.day, ctx)))
  const id = dayEventSeries(state, day, ctx, { avoidBadOn: avoid ? day : null })[day] || null
  S.announced[String(day)] = id || ''
  for (const k of Object.keys(S.announced)) if (!(Number(k) >= day - ANNOUNCE_KEEP)) delete S.announced[k]
  return id
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
  return { id, name: ev.name, desc: ev.desc, icon: ev.icon, kind: dayEventKind(ev), effects: ev.effects, choice }
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

// Bản sao dữ liệu thuần (dữ liệu sự kiện bị đóng băng; sh.mods nằm trong save).
function plain(v) {
  return v === undefined ? null : JSON.parse(JSON.stringify(v))
}

// Tính hệ số của ca sắp mở và thực hiện các khoản đi kèm (trừ tiền căng bạt / mua đá cây / chuẩn bị đón đoàn kiểm tra,
// dùng Phiếu Chợ Sớm). Gọi từ startShift TRƯỚC khi ghi walletStart. nowMs (tùy chọn) để biết sự kiện có thời hạn đang mở.
// M4: bỏ tipMul (Ngày lãnh lương nay là khách gọi thêm món: lineCountWeights, null = mặc định BALANCE); thêm các khóa
// hiệu ứng của sự kiện ngày: fixedCostDelta, ingCostMul, noQrSpeaker, queueMax, queueFine, bigOrder, endCheck, rareRolls
// (xem src/data/day-events.js). Ca dở từ bản cũ thiếu các khóa này: nơi đọc đều có mặc định.
export function prepareShiftMods(state, ctx, nowMs = null) {
  const mods = { customerMul: 1, extraCustomers: 0, patienceMul: 1, lineCountWeights: null, recipeWeight: {}, noteBoost: {},
    noteBoostRate: 0, cogsMul: 1, dayEvent: null, events: [], prepCost: 0,
    fixedCostDelta: 0, ingCostMul: {}, noQrSpeaker: false, queueMax: null, queueFine: null, bigOrder: null, endCheck: null,
    rareRolls: 0 }
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
    if (Array.isArray(eff.lineCountWeights) && eff.lineCountWeights.length) mods.lineCountWeights = eff.lineCountWeights.slice()
    for (const [id, w] of Object.entries(eff.recipeWeight || {})) mods.recipeWeight[id] = w
    for (const [id, notes] of Object.entries(eff.noteBoost || {})) mods.noteBoost[id] = notes.slice()
    const C = D(ctx).DAY_EVENT_CONFIG || {}
    if (Object.keys(mods.noteBoost).length) mods.noteBoostRate = C.noteBoostRate ?? 0.35
    // M4: các khóa hiệu ứng mới
    mods.fixedCostDelta = Math.round((Number(eff.fixedCostDelta) || 0) / 500) * 500
    for (const [id, mul] of Object.entries(eff.ingCostMul || {})) if (Number(mul) > 0) mods.ingCostMul[id] = Number(mul)
    mods.noQrSpeaker = !!eff.noQrSpeaker
    if (Number(eff.queueMax) > 0) mods.queueMax = Math.round(Number(eff.queueMax))
    if (eff.queueFine && Number(eff.queueFine.at) > 0 && Number(eff.queueFine.fine) > 0) mods.queueFine = plain(eff.queueFine)
    if (eff.bigOrder && eff.bigOrder.recipeId) mods.bigOrder = plain(eff.bigOrder)
    if (eff.endCheck && eff.endCheck.type) mods.endCheck = plain(eff.endCheck)
    mods.rareRolls = Math.max(0, Math.round(Number(eff.rareRolls) || 0))
    mods.dayEvent = { id: info.id, choice, kind: info.kind }
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

// ---------- M4: kết thúc ca theo sự kiện ngày ----------

// Món nền của một món (món hiếm dùng Trà tắc làm nền vẫn tính là Trà tắc): chính nó và baseRecipe nếu có.
function recipeFamily(R, id) {
  const r = R && R[id]
  return r && r.baseRecipe ? [id, r.baseRecipe] : [id]
}

// Các phiếu chấm đã chốt (khách đã nhận món) của ca.
function finalSheets(sh) {
  return ((sh && sh.scoreSheets) || []).filter(x => x && x.final)
}

// Số phần các món `recipes` (kể cả món dùng chúng làm nền) đã giao trong ca, không tính món Hỏng.
export function servedPortions(sh, recipes, ctx) {
  const R = D(ctx).RECIPES || {}
  const want = new Set(recipes || [])
  let n = 0
  for (const s of finalSheets(sh)) {
    for (const d of s.dishes || []) {
      if (!d || d.grade === 'hong') continue
      if (recipeFamily(R, d.recipeId).some(id => want.has(id))) n += Math.max(1, Number(d.qty) || 1)
    }
  }
  return n
}

// Sao trung bình của các khách đã nhận món trong ca (null nếu chưa có khách nào).
export function shiftAvgStars(sh) {
  const list = finalSheets(sh).map(x => Number(x.stars) || 0)
  return list.length ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 100) / 100 : null
}

// Lỗi vệ sinh trong ca (mã thuộc `codes` trên phiếu chấm, hoặc món Hỏng): danh sách mã không trùng.
export function hygieneErrors(sh, codes) {
  const want = new Set(codes || [])
  const out = []
  const add = c => { if (want.has(c) && !out.includes(c)) out.push(c) }
  for (const s of finalSheets(sh)) {
    for (const c of s.kitchenErrors || []) add(c)
    for (const d of s.dishes || []) {
      if (d && d.grade === 'hong') add('hong')
      for (const c of (d && d.errors) || []) add(c)
    }
  }
  // lấy nhầm nguyên liệu: một lỗi (hai mã cùng nghĩa)
  if (out.includes('bay') && out.includes('bay_nguyen_lieu')) out.splice(out.indexOf('bay_nguyen_lieu'), 1)
  return out
}

function fillText(tpl, vars) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m))
}

// Trần tiền của một sự kiện trong ca: sh.eventCap {loss, gain} chốt lúc mở ca (startShift); ca dở từ bản cũ chưa có
// thì không kẹp theo sự kiện (vẫn kẹp theo trần ngày thật).
export function shiftEventCap(sh) {
  const c = sh && sh.eventCap
  return {
    loss: c && Number.isFinite(Number(c.loss)) ? Number(c.loss) : Infinity,
    gain: c && Number.isFinite(Number(c.gain)) ? Number(c.gain) : Infinity
  }
}

// Gọi ở endShift TRƯỚC summarizeShift: chấm cuối ca của sự kiện ngày (endCheck: hội thi theo sao, tài trợ theo số ly,
// kiểm tra vệ sinh), tiền "đúng hẹn" của đơn đặt trước (bigOrder), ghi chú các khoản đã nằm trong sổ (chi phí cố định
// tăng, giá vốn tăng, khách đi ngang vì thu gọn chỗ đứng). Tiền thưởng qua eventMoneyIn (trần gainCap + trần ngày thật),
// phạt qua eventMoneyOut (trần lossCap + trần ngày thật), danh tiếng cộng vào sh.reputationGain. Chạy 1 lần mỗi ca.
// (Lượt Giỏ chợ sh.rareRolls và quà Khách lạ: phần hàng hiếm.) Trả mảng ghi chú đã thêm.
export function finishShiftEvents(state, ctx) {
  const sh = state.shift
  if (!sh || !sh.mods || sh.eventsFinished) return []
  sh.eventsFinished = true
  const m = sh.mods
  const de = m.dayEvent
  const def = de && D(ctx).DAY_EVENTS ? D(ctx).DAY_EVENTS[de.id] : null
  const base = { id: de ? de.id : '', name: def ? def.name : '' }
  const cap = shiftEventCap(sh)
  const before = (sh.eventNotes || []).length
  const addRep = n => { if (n > 0) sh.reputationGain = (sh.reputationGain || 0) + n }
  // tiền chi cho lựa chọn ở màn Chuẩn bị (căng bạt, mua đá cây, chuẩn bị đón đoàn): đã trừ Tiền quán lúc mở ca, không
  // tính vào lãi ca → ghi chú để người chơi đối chiếu
  if (Number(m.prepCost) > 0) {
    const c = def && def.choice
    eventNote(state, { ...base, fx: `Đã chi ${formatVND(m.prepCost)} lúc mở hàng` + (c && c.label ? ` (${c.label})` : ''),
      text: 'Khoản này trừ Tiền quán lúc mở ca, không tính vào lãi ca.' })
  }
  // khoản đã nằm trong sổ ca (chi phí cố định, giá vốn)
  if (Number(m.fixedCostDelta) > 0) {
    eventNote(state, { ...base, fx: `Chi phí cố định +${formatVND(m.fixedCostDelta)}`,
      text: `Chi phí cố định ca này ${formatVND(sh.fixedCost)} (đã tính trong dòng Chi phí cố định).` })
  }
  if (Number(sh.eventCostExtra) > 0) {
    eventNote(state, { ...base, fx: `Giá vốn +${formatVND(sh.eventCostExtra)}`,
      text: 'Phần giá vốn tăng thêm đã tính trong dòng Giá vốn.' })
  }
  if (Number(sh.eventMissed) > 0) {
    eventNote(state, { ...base, fx: `${sh.eventMissed} khách đi ngang`,
      text: 'Thu gọn chỗ đứng nên không bị phạt, bù lại có khách thấy hàng đầy mà đi ngang.' })
  }
  // đơn đặt trước: giao đạt từ minStars sao thì thêm tiền "đúng hẹn"
  const bo = m.bigOrder
  if (bo) {
    const c = Object.values(sh.customers || {}).find(x => x && x.bigOrder)
    if (c && c.status === 'roi_di' && (Number(c.stars) || 0) >= (Number(bo.minStars) || 0)) {
      eventMoneyIn(state, Number(bo.bonus) || 0, { ...base, text: bo.done || '' }, ctx, { cap: cap.gain })
    } else if (c) {
      eventNote(state, { ...base, fx: 'Không có tiền đúng hẹn',
        text: fillText(c.status === 'roi_di' ? bo.low : bo.lost, { stars: Number(c.stars) || 0 }) })
    }
  }
  // chấm cuối ca
  const E = m.endCheck
  if (E && E.type === 'stars') {
    const avg = shiftAvgStars(sh)
    const tier = avg === null ? null : (E.tiers || []).find(t => avg >= Number(t.min))
    if (tier) {
      addRep(Number(tier.rep) || 0)
      const fx = tier.rep ? `+${tier.rep} danh tiếng` : ''
      const text = `${tier.label || 'Đạt giải'}: sao trung bình ca ${String(avg).replace('.', ',')}.`
      if (Number(tier.money) > 0) eventMoneyIn(state, Number(tier.money), { ...base, text, fx }, ctx, { cap: cap.gain })
      else eventNote(state, { ...base, text, fx })
    } else {
      eventNote(state, { ...base, fx: 'Chưa có giải', text: E.none || '' })
    }
  } else if (E && E.type === 'portions') {
    const n = servedPortions(sh, E.recipes, ctx)
    const tier = (E.tiers || []).find(t => n >= Number(t.min))
    const text = fillText(E.text || '', { n })
    if (tier && Number(tier.money) > 0) eventMoneyIn(state, Number(tier.money), { ...base, text }, ctx, { cap: cap.gain })
    else eventNote(state, { ...base, text })
  } else if (E && E.type === 'hygiene') {
    const passRep = Number(E.passRep) || 0
    const errs = E.sure ? [] : hygieneErrors(sh, E.codes)
    if (!errs.length) {
      addRep(passRep)
      eventNote(state, { ...base, fx: passRep ? `+${passRep} danh tiếng` : 'Đạt', text: E.pass || '' })
    } else {
      const S = state.incidents && typeof state.incidents === 'object' ? state.incidents : (state.incidents = defaultIncidents())
      if (!S.warn || typeof S.warn !== 'object') S.warn = {}
      const ERR = (D(ctx).STRINGS && D(ctx).STRINGS.errors) || {}
      const errors = errs.map(c => ERR[c] || c).join(', ').toLocaleLowerCase('vi-VN')
      const days = Number(E.warnDays) || 14
      const last = Number(S.warn[base.id]) || 0
      if (last > 0 && sh.day - last <= days) {
        delete S.warn[base.id]
        eventMoneyOut(state, Number(E.fine) || 0, { ...base, text: fillText(E.fined, { errors, days }) }, ctx, { cap: cap.loss })
      } else {
        S.warn[base.id] = sh.day
        eventNote(state, { ...base, fx: 'Nhắc nhở lần đầu', text: fillText(E.warn, { errors, days }) })
      }
    }
  }
  return (sh.eventNotes || []).slice(before)
}
