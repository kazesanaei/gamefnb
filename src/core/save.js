// Lưu/tải: 'BKN1.' + base64url(UTF-8 JSON) + '.' + fnv1a(SALT + payload). Bản chính + bản dự phòng.
import { hashString } from './rng.js'
import { defaultState, defaultStats, defaultSettings, defaultMeta, newRecipeProgress, STATE_VERSION } from './state.js'

export const SAVE_KEY = 'bkn.save'
export const BACKUP_KEY = 'bkn.bak'
const PREFIX = 'BKN1'
const SALT = 'bep-khoi-nghiep:v1:muong-vang'

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  const CH = 0x8000
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s) {
  let b = s.replace(/-/g, '+').replace(/_/g, '/')
  while (b.length % 4) b += '='
  const bin = atob(b)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

function checksum(payload) {
  return hashString(SALT + payload).toString(16).padStart(8, '0')
}

export function encodeSave(state) {
  const payload = toBase64Url(JSON.stringify(state))
  return PREFIX + '.' + payload + '.' + checksum(payload)
}

// Giải mã; sai định dạng/checksum → null. Trả object thô (chưa migrate).
export function decodeSave(str) {
  if (typeof str !== 'string') return null
  const parts = str.trim().split('.')
  if (parts.length !== 3 || parts[0] !== PREFIX) return null
  const [, payload, sum] = parts
  if (!/^[A-Za-z0-9_-]*$/.test(payload) || checksum(payload) !== sum) return null
  try {
    const obj = JSON.parse(fromBase64Url(payload))
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null
  } catch {
    return null
  }
}

const isObj = v => v && typeof v === 'object' && !Array.isArray(v)
const num = (v, def, min = -Infinity, max = Infinity) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.min(max, Math.max(min, n))
}
const int = (v, def, min = -Infinity, max = Infinity) => Math.round(num(v, def, min, max))

const strArr = (v, max = Infinity) => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string'))].slice(-max) : []
const dayKeyOr = (v, def = '') => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : def

// M2: kiểm tra/gộp các trường meta (điểm danh, nhiệm vụ, hộp thư, chuỗi, shop, sự kiện, lên chặng).
// Save version 1 (chưa có các trường này) nhận giá trị mặc định; mail.seenVersion = '0.1.0' để nhận thư phiên bản mới.
export function migrateMeta(raw, s, data = null) {
  const def = defaultMeta()
  const v1 = !(Number(raw.version) >= 2)
  // hiện vật
  const items = { ...def.items }
  if (isObj(raw.items)) for (const [k, v] of Object.entries(raw.items)) items[k] = int(v, 0, 0)
  s.items = items
  // đồ thẩm mỹ, danh hiệu, mở khóa
  const cos = isObj(raw.cosmetics) ? raw.cosmetics : {}
  s.cosmetics = { owned: strArr(cos.owned), equipped: { ...def.cosmetics.equipped } }
  if (isObj(cos.equipped)) for (const [k, v] of Object.entries(cos.equipped)) if (v === null || s.cosmetics.owned.includes(v)) s.cosmetics.equipped[k] = v
  s.titles = strArr(raw.titles)
  s.unlocks = strArr(raw.unlocks)
  const prep = isObj(raw.prep) ? raw.prep : {}
  s.prep = { day: int(prep.day, 0, 0), coupon: prep.coupon === true, dayEventChoice: typeof prep.dayEventChoice === 'string' ? prep.dayEventChoice : null }
  // điểm danh
  const ck = isObj(raw.checkin) ? raw.checkin : {}
  s.checkin = { round: int(ck.round, 1, 1), next: int(ck.next, 0, 0, 6), lastDay: dayKeyOr(ck.lastDay), total: int(ck.total, 0, 0) }
  // nhiệm vụ ngày
  const d = isObj(raw.daily) ? raw.daily : {}
  s.daily = {
    dayKey: dayKeyOr(d.dayKey), gameDay: int(d.gameDay, 0, 0),
    quests: Array.isArray(d.quests) ? d.quests.filter(q => isObj(q) && typeof q.id === 'string').slice(0, 3).map(q => ({
      id: q.id, group: typeof q.group === 'string' ? q.group : '', target: int(q.target, 1, 1),
      progress: int(q.progress, 0, 0), claimed: q.claimed === true
    })) : [],
    prevIds: strArr(d.prevIds, 3), rerolls: int(d.rerolls, 0, 0), chestClaimed: d.chestClaimed === true
  }
  if (data && data.QUESTS) s.daily.quests = s.daily.quests.filter(q => data.QUESTS.some(x => x.id === q.id))
  // hộp thư
  const m = isObj(raw.mail) ? raw.mail : {}
  s.mail = {
    list: Array.isArray(m.list) ? m.list.filter(x => isObj(x) && typeof x.id === 'string').slice(-100).map(x => ({
      id: x.id, kind: typeof x.kind === 'string' ? x.kind : 'den_bu', title: String(x.title || ''), body: String(x.body || ''),
      reward: isObj(x.reward) ? x.reward : {}, createdDay: dayKeyOr(x.createdDay), expiresDay: dayKeyOr(x.expiresDay),
      claimed: x.claimed === true, read: x.read === true
    })) : [],
    pushed: strArr(m.pushed, 1000),
    monthly: isObj(m.monthly) ? m.monthly : {},
    seenVersion: typeof m.seenVersion === 'string' ? m.seenVersion : (v1 ? '0.1.0' : ''),
    pendingReviews: Array.isArray(m.pendingReviews) ? m.pendingReviews.filter(isObj) : []
  }
  // chuỗi
  s.chains = {}
  if (isObj(raw.chains)) {
    for (const [id, c] of Object.entries(raw.chains)) {
      if (!isObj(c)) continue
      s.chains[id] = { step: int(c.step, 0, 0), progress: int(c.progress, 0, 0), done: c.done === true,
        claimable: Array.isArray(c.claimable) ? [...new Set(c.claimable.map(x => int(x, -1)).filter(x => x >= 0))] : [],
        since: dayKeyOr(c.since) }
    }
  }
  // shop, nấu thử, món sự kiện đã nhận
  const shop = isObj(raw.shop) ? raw.shop : {}
  s.shop = { tried: strArr(shop.tried) }
  const t = raw.tasting
  s.tasting = isObj(t) && typeof t.recipeId === 'string' && isObj(t.shift) && Array.isArray(t.shift.tickets) &&
    (!data || !data.RECIPES || data.RECIPES[t.recipeId]) ? t : null
  s.eventRecipes = {}
  if (isObj(raw.eventRecipes)) for (const [id, v] of Object.entries(raw.eventRecipes)) if (isObj(v) && s.recipes[id]) s.eventRecipes[id] = v
  // sự kiện có thời hạn
  s.events = {}
  if (isObj(raw.events)) {
    for (const [id, e] of Object.entries(raw.events)) {
      if (!isObj(e)) continue
      s.events[id] = {
        tem: int(e.tem, 0, 0), temTotal: int(e.temTotal, 0, 0), temDay: dayKeyOr(e.temDay), temToday: int(e.temToday, 0, 0),
        days: strArr(e.days).filter(x => dayKeyOr(x)),
        quests: isObj(e.quests) && Array.isArray(e.quests.list) ? { dayKey: dayKeyOr(e.quests.dayKey), list: e.quests.list.filter(isObj) } : { dayKey: '', list: [] },
        checkin: isObj(e.checkin) ? { next: int(e.checkin.next, 0, 0), lastDay: dayKeyOr(e.checkin.lastDay) } : { next: 0, lastDay: '' },
        exchanged: isObj(e.exchanged) ? e.exchanged : {},
        settled: e.settled === true
      }
    }
  }
  const rd = isObj(raw.realDays) ? raw.realDays : {}
  s.realDays = { first: dayKeyOr(rd.first), last: dayKeyOr(rd.last), count: int(rd.count, 0, 0) }
  const p = isObj(raw.progression) ? raw.progression : {}
  const rec = isObj(p.records) ? p.records : {}
  s.progression = {
    stageUpReady: p.stageUpReady === true, stageUpSeen: p.stageUpSeen === true,
    records: { bestProfit: rec.bestProfit === null || rec.bestProfit === undefined ? null : int(rec.bestProfit, 0),
      mostFiveStars: int(rec.mostFiveStars, 0, 0), longestStreak: int(rec.longestStreak, 0, 0) },
    cur: { fiveStars: int(isObj(p.cur) ? p.cur.fiveStars : 0, 0, 0) }
  }
  const tr = isObj(raw.track) ? raw.track : {}
  s.track = { rbCustomer: typeof tr.rbCustomer === 'string' ? tr.rbCustomer : null, rbFirst: tr.rbFirst === true }
  return s
}

// Gộp với defaultState, kẹp giá trị âm/NaN, bỏ id không còn trong dữ liệu (khi có data).
// Nâng version 1 → 2: thêm các trường meta M2 (migrateMeta).
export function migrate(raw, data = null) {
  if (!isObj(raw)) return null
  const def = defaultState(raw.seed, data)
  const s = { ...def, ...raw }
  s.version = STATE_VERSION
  s.seed = (Number(raw.seed) >>> 0)
  s.shopName = typeof raw.shopName === 'string' ? raw.shopName.slice(0, 40) : ''
  s.day = int(raw.day, 1, 1)
  s.chang = int(raw.chang, 1, 1, 7)
  s.wallet = int(raw.wallet, def.wallet)          // ví được phép âm
  s.reputation = int(raw.reputation, 0, 0)
  s.goldSpoons = int(raw.goldSpoons, 0, 0)
  s.ratings = Array.isArray(raw.ratings) ? raw.ratings.map(r => int(r, 0)).filter(r => r >= 1 && r <= 5).slice(-30) : []
  s.reviews = Array.isArray(raw.reviews) ? raw.reviews.filter(isObj).slice(-60) : []
  s.history = Array.isArray(raw.history) ? raw.history.filter(isObj).slice(-60) : []
  s.tipsSeen = Array.isArray(raw.tipsSeen) ? [...new Set(raw.tipsSeen.filter(x => typeof x === 'string'))] : []
  // công thức
  const recipes = {}
  const srcRecipes = isObj(raw.recipes) ? raw.recipes : def.recipes
  for (const id of Object.keys(srcRecipes)) {
    if (data && data.RECIPES && !data.RECIPES[id]) continue
    const p = isObj(srcRecipes[id]) ? srcRecipes[id] : {}
    const base = newRecipeProgress(0)
    const out = {}
    for (const k of Object.keys(base)) out[k] = int(p[k], base[k], 0)
    recipes[id] = out
  }
  for (const id of Object.keys(def.recipes)) if (!recipes[id]) recipes[id] = newRecipeProgress(0)
  s.recipes = recipes
  // nâng cấp
  const ups = {}
  const U = data && data.UPGRADES
  const exists = id => !U || (Array.isArray(U) ? U.some(u => u.id === id) : !!U[id])
  if (isObj(raw.upgrades)) for (const id of Object.keys(raw.upgrades)) if (raw.upgrades[id] && exists(id)) ups[id] = true
  s.upgrades = ups
  // bộ đếm, cài đặt
  const stats = defaultStats()
  const rs = isObj(raw.stats) ? raw.stats : {}
  for (const k of Object.keys(stats)) stats[k] = int(rs[k], 0, 0)
  s.stats = stats
  const settings = defaultSettings()
  const rset = isObj(raw.settings) ? raw.settings : {}
  for (const k of Object.keys(settings)) if (typeof rset[k] === 'boolean') settings[k] = rset[k]
  s.settings = settings
  s.loan = isObj(raw.loan) && num(raw.loan.remaining, 0) > 0 ? { ...raw.loan, remaining: int(raw.loan.remaining, 0, 0) } : null
  s.clock = { maxSeen: num(raw.clock && raw.clock.maxSeen, 0, 0) }
  // ca đang dở: giữ nguyên nếu đủ cấu trúc
  const sh = raw.shift
  s.shift = isObj(sh) && isObj(sh.customers) && Array.isArray(sh.plan) && Array.isArray(sh.queue) &&
    Array.isArray(sh.tickets) && isObj(sh.drawer) && isObj(sh.ledger) && sh.day === s.day ? sh : null
  migrateMeta(raw, s, data)
  return s
}

// storage có getItem/setItem. opts.backup: ghi thêm bản dự phòng (cuối ca).
export function saveTo(storage, state, opts = {}) {
  const code = encodeSave(state)
  try {
    storage.setItem(SAVE_KEY, code)
    if (opts.backup) storage.setItem(BACKUP_KEY, code)
    return true
  } catch {
    return false
  }
}

// Thử bản chính rồi bản dự phòng; trả state đã migrate hoặc null.
export function loadFrom(storage, data = null) {
  for (const key of [SAVE_KEY, BACKUP_KEY]) {
    let raw = null
    try { raw = storage.getItem(key) } catch { raw = null }
    if (!raw) continue
    const obj = decodeSave(raw)
    if (obj) {
      const s = migrate(obj, data)
      if (s) return s
    }
  }
  return null
}

export function exportCode(state) {
  return encodeSave(state)
}

export function importCode(str, data = null) {
  const obj = decodeSave(str)
  return obj ? migrate(obj, data) : null
}
