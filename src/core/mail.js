// Hộp thư quà hệ thống: Mail = { id, kind, title, body, reward (đã quy đổi), createdDay, expiresDay, claimed, read }.
// Mỗi id chỉ đẩy 1 lần (state.mail.pushed). Tối đa 100 thư (đầy thì bỏ thư cũ nhất đã nhận).
// Trần quà (ngoài quà đền bù) theo MAIL_CONFIG.cap. Nguồn thư: chào mừng, phiên bản mới, quà lễ theo lịch,
// quà đời thường, nhiệm vụ quên nhận (src/core/quests.js), review muộn, Tem dư của sự kiện.
import { seedFrom, nextFloat, pick } from './rng.js'
import { emit, refIncomeFor } from './state.js'
import { addDaysKey, daysBetweenKeys } from './clock.js'
import { resolveReward, grantReward, rewardMoneyValue } from './rewards.js'
import { averageRating } from './scoring.js'
import { formatVND } from './money.js'

function D(ctx) { return (ctx && ctx.data) || {} }
function mcfg(ctx) {
  return D(ctx).MAIL_CONFIG || { currentVersion: '0.0.0', maxMails: 100, expireDays: 30, holidayExpireDays: 14,
    questExpireDays: 7, pushedMemory: 1000, cap: { countKinds: ['le', 'moc'], maxCount: 2, everydayMax: 2, valueKinds: ['le', 'moc', 'doi_thuong'], valueIncomeMul: 3 } }
}

export function ensureMail(state) {
  const m = state.mail && typeof state.mail === 'object' ? state.mail : (state.mail = {})
  if (!Array.isArray(m.list)) m.list = []
  if (!Array.isArray(m.pushed)) m.pushed = []
  if (!m.monthly || typeof m.monthly !== 'object') m.monthly = {}
  if (typeof m.seenVersion !== 'string') m.seenVersion = ''
  if (!Array.isArray(m.pendingReviews)) m.pendingReviews = []
  return m
}

// So sánh phiên bản 'a.b.c'.
export function compareVersion(a, b) {
  const pa = String(a || '0').split('.').map(n => Number(n) || 0)
  const pb = String(b || '0').split('.').map(n => Number(n) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d) return d > 0 ? 1 : -1
  }
  return 0
}

function isExpired(mail, dayKey) {
  return !!mail.expiresDay && dayKey >= mail.expiresDay
}

// Đẩy 1 thư. opts.compensation: quà đền bù (không tính trần).
// → { ok: true, mail } | { ok: false, reason: 'trung_id' | 'tran' | 'khong_hop_le' }
export function pushMail(state, mail, nowInfo, ctx, opts = {}) {
  const m = ensureMail(state)
  if (!mail || !mail.id) return { ok: false, reason: 'khong_hop_le' }
  if (m.pushed.includes(mail.id) || m.list.some(x => x.id === mail.id)) return { ok: false, reason: 'trung_id' }
  const C = mcfg(ctx)
  const kind = mail.kind || 'den_bu'
  const reward = resolveReward(state, mail.reward || {}, ctx)
  const dayKey = nowInfo.dayKey
  const month = dayKey.slice(0, 7)
  const cap = C.cap || {}
  const compensation = opts.compensation || kind === 'den_bu'
  const mon = m.monthly[month] || { count: 0, everyday: 0, value: 0 }
  if (!compensation) {
    if ((cap.countKinds || []).includes(kind) && mon.count >= (cap.maxCount ?? 2)) return { ok: false, reason: 'tran' }
    if (kind === 'doi_thuong' && mon.everyday >= (cap.everydayMax ?? 2)) return { ok: false, reason: 'tran' }
    if ((cap.valueKinds || []).includes(kind)) {
      const limit = (cap.valueIncomeMul ?? 3) * refIncomeFor(ctx, state.day)
      if (mon.value + rewardMoneyValue(reward) > limit) return { ok: false, reason: 'tran' }
    }
  }
  const days = mail.expiresDays ?? (kind === 'le' ? C.holidayExpireDays : C.expireDays)
  const item = {
    id: mail.id, kind, title: String(mail.title || ''), body: String(mail.body || ''), reward,
    createdDay: mail.createdDay || dayKey,
    expiresDay: mail.expiresDay || addDaysKey(mail.createdDay || dayKey, days ?? 30),
    claimed: false, read: false
  }
  m.list.push(item)
  m.pushed.push(item.id)
  if (m.pushed.length > (C.pushedMemory || 1000)) m.pushed.splice(0, m.pushed.length - (C.pushedMemory || 1000))
  if (!compensation) {
    if ((cap.countKinds || []).includes(kind)) mon.count += 1
    if (kind === 'doi_thuong') mon.everyday += 1
    if ((cap.valueKinds || []).includes(kind)) mon.value += rewardMoneyValue(reward)
    m.monthly[month] = mon
  }
  // đầy: bỏ thư cũ nhất đã nhận; không có thì bỏ thư cũ nhất
  const max = C.maxMails || 100
  while (m.list.length > max) {
    let idx = m.list.findIndex(x => x.claimed)
    if (idx < 0) idx = 0
    m.list.splice(idx, 1)
  }
  emit(ctx, 'mail.new', { id: item.id, kind })
  return { ok: true, mail: item }
}

// Bỏ thư đã hết hạn. Trả số thư bỏ.
export function purgeExpired(state, nowInfo) {
  const m = ensureMail(state)
  const before = m.list.length
  m.list = m.list.filter(x => !isExpired(x, nowInfo.dayKey))
  return before - m.list.length
}

function hasReward(r) {
  return !!r && Object.keys(r).some(k => k !== 'label' && k !== 'converted')
}

// Danh sách thư mới nhất trước, kèm expired và daysLeft.
export function mailList(state, nowInfo) {
  const m = ensureMail(state)
  return m.list.slice().reverse().map(x => ({
    ...x, hasReward: hasReward(x.reward), expired: isExpired(x, nowInfo.dayKey),
    daysLeft: Math.max(0, daysBetweenKeys(nowInfo.dayKey, x.expiresDay))
  }))
}

// Số thư cần chú ý (chấm đỏ): thư có quà chưa nhận hoặc thư chưa đọc, còn hạn.
export function mailBadge(state, nowInfo) {
  const m = ensureMail(state)
  return m.list.filter(x => !isExpired(x, nowInfo.dayKey) && (hasReward(x.reward) ? !x.claimed : !x.read)).length
}

export function markMailRead(state, id) {
  const x = ensureMail(state).list.find(y => y.id === id)
  if (!x) return false
  x.read = true
  return true
}

// Nhận quà một thư. → { ok, reward } | { ok: false, reason }
export function claimMail(state, id, nowInfo, ctx) {
  const m = ensureMail(state)
  const x = m.list.find(y => y.id === id)
  if (!x) return { ok: false, reason: 'khong_co' }
  if (x.claimed) return { ok: false, reason: 'da_nhan' }
  if (isExpired(x, nowInfo.dayKey)) return { ok: false, reason: 'het_han' }
  if (x.kind === 'le' && nowInfo.rewind) return { ok: false, reason: 'lui_gio' }
  if (state.shift && hasReward(x.reward)) return { ok: false, reason: 'dang_ban' }
  const reward = hasReward(x.reward) ? grantReward(state, x.reward, ctx, { resolved: true }) : {}
  x.claimed = true
  x.read = true
  if (state.stats) state.stats.mailClaimed = (state.stats.mailClaimed || 0) + 1
  emit(ctx, 'mail.claimed', { id, reward })
  return { ok: true, reward }
}

// "Nhận tất cả". → { ok, count, rewards: [{id, reward}], skipped: [{id, reason}] }
export function claimAllMail(state, nowInfo, ctx) {
  const m = ensureMail(state)
  const rewards = [], skipped = []
  for (const x of m.list.slice()) {
    if (x.claimed || isExpired(x, nowInfo.dayKey)) continue
    const r = claimMail(state, x.id, nowInfo, ctx)
    if (r.ok) rewards.push({ id: x.id, reward: r.reward })
    else skipped.push({ id: x.id, reason: r.reason })
  }
  return { ok: rewards.length > 0, count: rewards.length, rewards, skipped }
}

// Hàng chờ review muộn (khách bị thối thiếu không phát hiện): thư đến vào ngày thật hôm sau.
export function queueLateReviews(state, list, gameDay, nowInfo) {
  const m = ensureMail(state)
  for (const r of list || []) {
    const id = `review:${gameDay}:${r.customerId}`
    if (m.pushed.includes(id) || m.pendingReviews.some(p => p.id === id)) continue
    m.pendingReviews.push({ id, name: r.name || '', amount: Number(r.amount) || 0, fromDay: nowInfo.dayKey })
  }
}

// Đẩy các thư đến hạn theo ngày thật. Trả mảng id thư mới.
export function refreshMail(state, nowInfo, ctx) {
  const m = ensureMail(state)
  const data = D(ctx)
  const C = mcfg(ctx)
  const out = []
  const push = (mail, opts) => { const r = pushMail(state, mail, nowInfo, ctx, opts); if (r.ok) out.push(mail.id); return r }
  // chào mừng
  if (data.MAIL_WELCOME) push({ ...data.MAIL_WELCOME })
  // phiên bản mới (save mới: chỉ ghi nhận phiên bản, không tặng)
  const cur = C.currentVersion || '0.0.0'
  if (!m.seenVersion) m.seenVersion = cur
  else if (compareVersion(cur, m.seenVersion) > 0) {
    for (const v of data.MAIL_VERSIONS || []) {
      if (compareVersion(v.version, m.seenVersion) > 0 && compareVersion(v.version, cur) <= 0) push({ ...v })
    }
    m.seenVersion = cur
  }
  const key = nowInfo.dayKey
  // quà lễ (khóa khi lùi giờ)
  if (!nowInfo.rewind) {
    for (const h of data.MAIL_HOLIDAYS || []) {
      if (key >= h.date && key < addDaysKey(h.date, h.pushDays || 1)) {
        push({ id: h.id, kind: h.kind || 'le', title: h.title, body: h.body, reward: h.reward, expiresDays: C.holidayExpireDays })
      }
    }
    // quà đời thường
    const E = data.MAIL_EVERYDAY
    const real = (state.realDays && state.realDays.count) || 0
    if (E && real >= (E.fromRealDay || 3)) {
      const ratings = state.ratings || []
      const okQuality = ratings.length >= (E.minRatings || 0) && averageRating(ratings) >= (E.minRating || 0)
      const id = `doi_thuong:${key}`
      if (okQuality && !m.pushed.includes(id)) {
        const holder = { rng: seedFrom(state.seed, key, 'qua_doi_thuong') }
        if (nextFloat(holder) < (E.chance ?? 0.1)) {
          const [lo, hi] = E.incomeMul || [0.3, 0.6]
          const mul = Math.round((lo + nextFloat(holder) * (hi - lo)) * 20) / 20
          const v = pick(holder, E.variants || [{ title: 'Quà nhỏ', body: '' }])
          push({ id, kind: 'doi_thuong', title: v.title, body: v.body, reward: { incomeMul: mul } })
        }
      }
    }
  }
  // review muộn: đến vào ngày thật sau ngày xảy ra
  const LR = data.MAIL_LATE_REVIEW || { kind: 'review', title: 'Review muộn', body: '{name}' }
  const keep = []
  for (const p of m.pendingReviews) {
    if (key > p.fromDay) {
      push({ id: p.id, kind: LR.kind || 'review', title: LR.title,
        body: String(LR.body || '').replace('{name}', p.name).replace('{amount}', formatVND(p.amount)), reward: {} }, { compensation: true })
    } else keep.push(p)
  }
  m.pendingReviews = keep
  purgeExpired(state, nowInfo)
  return out
}
