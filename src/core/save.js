// Lưu/tải: 'BKN1.' + base64url(UTF-8 JSON) + '.' + fnv1a(SALT + payload). Bản chính + bản dự phòng.
import { hashString } from './rng.js'
import {
  defaultState, defaultStats, defaultSettings, defaultMeta, newRecipeProgress, STATE_VERSION, INCIDENT_FREQUENCIES,
  defaultIncidents, defaultNotebook, defaultRare
} from './state.js'
import { normalizeChonDraft, normalizeLineMistakes, effectiveSteps } from './kitchen.js'
import { migrateTour } from './tour.js'

export const SAVE_KEY = 'bkn.save'
export const BACKUP_KEY = 'bkn.bak'
// Khóa riêng khi xem trước bằng ?devNow (giờ giả): không bao giờ ghi đè save thật.
export const DEV_SAVE_KEY = 'bkn.save.dev'
export const DEV_BACKUP_KEY = 'bkn.bak.dev'
export const DEV_KEYS = Object.freeze({ save: DEV_SAVE_KEY, backup: DEV_BACKUP_KEY })
const MAIN_KEYS = Object.freeze({ save: SAVE_KEY, backup: BACKUP_KEY })

function keysOf(opts) {
  const k = opts && opts.keys
  return k && typeof k.save === 'string' && typeof k.backup === 'string' ? k : MAIN_KEYS
}
const PREFIX = 'BKN1'
const SALT = 'bep-khoi-nghiep:v1:muong-vang'

function bytesToBase64Url(bytes) {
  let bin = ''
  const CH = 0x8000
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(s) {
  let b = s.replace(/-/g, '+').replace(/_/g, '/')
  while (b.length % 4) b += '='
  const bin = atob(b)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function toBase64Url(str) {
  return bytesToBase64Url(new TextEncoder().encode(str))
}

function fromBase64Url(s) {
  return new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(s))
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

// M3 (mục 17.4): Tiền quán luôn là bội 500đ, thưởng Tiền quán bội 1.000đ.
const WALLET_STEP = 500
const ceilTo = (n, step) => (Math.ceil(n / step) * step) || 0

// Quà trong thư chưa nhận: tiền thưởng làm tròn LÊN bội 1.000đ (thư của bản cũ có thể mang số lẻ).
function mailReward(x) {
  if (!isObj(x.reward)) return {}
  const money = Number(x.reward.money)
  if (x.claimed === true || !Number.isFinite(money) || money <= 0 || money % 1000 === 0) return x.reward
  return { ...x.reward, money: ceilTo(money, 1000) }
}

// Số bước của từng chuỗi trong dữ liệu (CHAINS + chuỗi của sự kiện). null khi không có dữ liệu.
function chainStepCounts(data) {
  if (!data || (!data.CHAINS && !data.EVENTS)) return null
  const out = {}
  for (const [id, c] of Object.entries(data.CHAINS || {})) if (c && Array.isArray(c.steps)) out[id] = c.steps.length
  for (const ev of Object.values(data.EVENTS || {})) {
    if (ev && ev.chain && ev.chain.id && Array.isArray(ev.chain.steps)) out[ev.chain.id] = ev.chain.steps.length
  }
  return out
}

// Ca dở đủ cấu trúc để chơi tiếp (bản game khác đổi cấu trúc ca hoặc save hỏng → không giữ được).
function shiftUsable(sh, day) {
  return isObj(sh) && isObj(sh.customers) && Array.isArray(sh.plan) && Array.isArray(sh.queue) &&
    Array.isArray(sh.tickets) && isObj(sh.drawer) && isObj(sh.ledger) && sh.day === day
}

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
    quests: Array.isArray(d.quests) ? d.quests.filter(q => isObj(q) && typeof q.id === 'string').slice(0, 3).map(q => {
      const e = { id: q.id, group: typeof q.group === 'string' ? q.group : '', target: int(q.target, 1, 1),
        progress: int(q.progress, 0, 0), claimed: q.claimed === true }
      if (Array.isArray(q.recipeIds)) e.recipeIds = strArr(q.recipeIds)
      return e
    }) : [],
    prevIds: strArr(d.prevIds, 3), rerolls: int(d.rerolls, 0, 0), chestClaimed: d.chestClaimed === true
  }
  if (data && data.QUESTS) s.daily.quests = s.daily.quests.filter(q => data.QUESTS.some(x => x.id === q.id))
  // hộp thư
  const m = isObj(raw.mail) ? raw.mail : {}
  s.mail = {
    list: Array.isArray(m.list) ? m.list.filter(x => isObj(x) && typeof x.id === 'string').slice(-100).map(x => ({
      id: x.id, kind: typeof x.kind === 'string' ? x.kind : 'den_bu', title: String(x.title || ''), body: String(x.body || ''),
      reward: mailReward(x), createdDay: dayKeyOr(x.createdDay), expiresDay: dayKeyOr(x.expiresDay),
      claimed: x.claimed === true, read: x.read === true
    })) : [],
    pushed: strArr(m.pushed, 1000),
    monthly: isObj(m.monthly) ? m.monthly : {},
    seenVersion: typeof m.seenVersion === 'string' ? m.seenVersion : (v1 ? '0.1.0' : ''),
    pendingReviews: Array.isArray(m.pendingReviews) ? m.pendingReviews.filter(isObj) : []
  }
  // chuỗi: kẹp bước theo số bước trong dữ liệu (mã từ bản khác/mã sửa tay có thể ghi bước vượt quá → refreshChains
  // đọc bước không tồn tại). Bước ≥ số bước thì chuỗi đã xong; thưởng chờ nhận ngoài khoảng bị bỏ.
  const stepCounts = chainStepCounts(data)
  s.chains = {}
  if (isObj(raw.chains)) {
    for (const [id, c] of Object.entries(raw.chains)) {
      if (!isObj(c)) continue
      const n = stepCounts ? stepCounts[id] : undefined
      const cs = { step: int(c.step, 0, 0), progress: int(c.progress, 0, 0), done: c.done === true,
        claimable: Array.isArray(c.claimable) ? [...new Set(c.claimable.map(x => int(x, -1)).filter(x => x >= 0))] : [],
        since: dayKeyOr(c.since) }
      if (n !== undefined) {
        if (cs.step >= n) { cs.step = n; cs.done = true; cs.progress = 0 }
        cs.claimable = cs.claimable.filter(k => k < n)
      }
      s.chains[id] = cs
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
    // kỷ lục lãi ca của bản cũ có thể lẻ (giá vốn lẻ): làm tròn lên bội 500đ như Tiền quán
    records: { bestProfit: rec.bestProfit === null || rec.bestProfit === undefined ? null : ceilTo(int(rec.bestProfit, 0), WALLET_STEP),
      mostFiveStars: int(rec.mostFiveStars, 0, 0), longestStreak: int(rec.longestStreak, 0, 0) },
    cur: { fiveStars: int(isObj(p.cur) ? p.cur.fiveStars : 0, 0, 0) }
  }
  const tr = isObj(raw.track) ? raw.track : {}
  s.track = { rbCustomer: typeof tr.rbCustomer === 'string' ? tr.rbCustomer : null, rbFirst: tr.rbFirst === true }
  return s
}

// Cài đặt: công tắc (boolean) giữ nếu đúng kiểu; âm lượng kẹp 0..1; tần suất tình huống thuộc INCIDENT_FREQUENCIES.
// Khóa lạ bị bỏ, khóa thiếu lấy mặc định (save v1/v2 chưa có volume, incidentFrequency).
export function migrateSettings(rawSettings) {
  const settings = defaultSettings()
  const rset = isObj(rawSettings) ? rawSettings : {}
  for (const k of Object.keys(settings)) {
    if (typeof settings[k] === 'boolean' && typeof rset[k] === 'boolean') settings[k] = rset[k]
  }
  if (rset.volume !== undefined && rset.volume !== null && rset.volume !== '') settings.volume = Math.round(num(rset.volume, settings.volume, 0, 1) * 100) / 100
  if (INCIDENT_FREQUENCIES.includes(rset.incidentFrequency)) settings.incidentFrequency = rset.incidentFrequency
  return settings
}

// Gộp với defaultState, kẹp giá trị âm/NaN, bỏ id không còn trong dữ liệu (khi có data).
// Nâng version 1 → 2: thêm các trường meta M2 (migrateMeta). Version 2 → 3 (M4, bản 0.4.0): tình huống, kho hàng hiếm,
// ca đang dở (migrateContentM4). Mọi bản cũ nâng thẳng lên STATE_VERSION trong một lần nạp.
// report (tùy chọn, object): migrate ghi thêm điều người chơi nên biết:
//   report.walletRounded = { from, to }      ví lẻ của bản cũ đã làm tròn lên bội 500đ
//   report.shiftDropped = { day, refund }    ca dở không chơi tiếp được (bản khác đổi cấu trúc ca, save hỏng) → hủy ca,
//                                            hoàn giá vốn/hao hụt đã trừ khỏi ví trong ca đó (tiền khách coi như đã trả lại),
//                                            M4: cả tiền phạt/chi sự kiện và tiền lựa chọn ở màn Chuẩn bị của ca đó
export function migrate(raw, data = null, report = null) {
  if (!isObj(raw)) return null
  const rep = isObj(report) ? report : {}
  const def = defaultState(raw.seed, data)
  const s = { ...def, ...raw }
  s.version = STATE_VERSION
  s.seed = (Number(raw.seed) >>> 0)
  s.shopName = typeof raw.shopName === 'string' ? raw.shopName.slice(0, 40) : ''
  s.day = int(raw.day, 1, 1)
  s.chang = int(raw.chang, 1, 1, 7)
  // Ví được phép âm. M3 (mục 17.4): Tiền quán là bội 500đ; save v1/v2 có ví lẻ do giá vốn lẻ (vd 437.250đ) →
  // làm tròn LÊN một lần (có lợi cho người chơi). Bội 500đ thì không đổi nên chạy mỗi lần nạp vẫn an toàn.
  const wallet0 = int(raw.wallet, def.wallet)
  s.wallet = ceilTo(wallet0, WALLET_STEP)
  if (s.wallet !== wallet0) rep.walletRounded = { from: wallet0, to: s.wallet }
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
  s.settings = migrateSettings(raw.settings)
  // nợ Dì Sáu: bội 500đ (làm tròn XUỐNG, có lợi cho người chơi) để trả nợ không làm ví lẻ
  const loanLeft = isObj(raw.loan) ? Math.floor(int(raw.loan.remaining, 0, 0) / WALLET_STEP) * WALLET_STEP : 0
  s.loan = loanLeft > 0 ? { ...raw.loan, remaining: loanLeft } : null
  s.clock = { maxSeen: num(raw.clock && raw.clock.maxSeen, 0, 0) }
  // số hiệu bản ghi: tăng mỗi lần lưu, để tab cũ không ghi đè bản mới hơn (writeSave)
  s.rev = int(raw.rev, 0, 0)
  // M3: mốc sao lưu (nhắc sao lưu mỗi 7 ngày thật)
  const bk = isObj(raw.backup) ? raw.backup : {}
  s.backup = { lastAt: num(bk.lastAt, 0, 0), since: num(bk.since, 0, 0) }
  // ca đang dở: giữ nguyên nếu đủ cấu trúc
  const sh = raw.shift
  if (shiftUsable(sh, s.day)) {
    // ví vừa làm tròn: dời mốc ví đầu ca theo, giữ bất biến "ví sau ca − ví đầu ca = lãi − trả nợ"
    const delta = s.wallet - wallet0
    s.shift = delta && Number.isFinite(Number(sh.walletStart)) ? { ...sh, walletStart: Number(sh.walletStart) + delta } : sh
  } else {
    s.shift = null
    // Không bỏ ca im lặng: giá vốn/hao hụt của ca đã trừ khỏi ví lúc nấu (tiền khách nằm trong két/QR của ca, mất theo
    // ca) → hủy ca và hoàn phần đã trừ, người chơi không mất tiền vì bản game đổi giữa ca. Ngày game giữ nguyên.
    // M4: hoàn cả tiền phạt/chi sự kiện (ledger.eventOut, đã trừ ví lúc phát sinh) — trừ phần tự bỏ tiền mua hàng hiếm đã
    // vào kho (hàng vẫn giữ) — và tiền chi cho lựa chọn ở màn Chuẩn bị (mods.prepCost: mua đá cây, chuẩn bị đón đoàn…).
    if (isObj(sh)) {
      const L = isObj(sh.ledger) ? sh.ledger : {}
      const refund = ceilTo(int(L.cogs, 0, 0) + int(L.waste, 0, 0) + droppedEventRefund(sh), WALLET_STEP)
      s.wallet += refund
      rep.shiftDropped = { day: int(sh.day, s.day, 1), refund }
    }
  }
  migrateMeta(raw, s, data)
  migrateContentM3(raw, s, data)
  migrateContentM4(raw, s, data)
  // rổ đang chọn dở của bước Chọn và lần chọn nhầm theo dòng phiếu: ca thật và phiên nấu thử
  // M5 (0.5.0): phiên nấu đang ở Thớt dựng lại bảng bước theo công thức hiện tại (bước đổi loại thao tác) — migrateCookBoard
  if (isObj(s.shift)) s.shift = migrateLineMistakes(migrateCookBoard(migrateCookDraft(s.shift, data), data))
  if (isObj(s.tasting) && isObj(s.tasting.shift)) {
    const tsh = migrateLineMistakes(migrateCookBoard(migrateCookDraft(s.tasting.shift, data), data))
    if (tsh !== s.tasting.shift) s.tasting = { ...s.tasting, shift: tsh }
  }
  // 0.4.1: hướng dẫn lần đầu (state.tour); bản cũ chưa có trường này: tour của vòng chơi chính coi như đã xem với người
  // chơi đã bán ca (không bật hướng dẫn giữa ca của người quen tay), các tour khác vẫn tự hiện lần đầu
  migrateTour(raw, s, data)
  return s
}

// Lần chọn nhầm theo dòng phiếu (ticket.chonMistakes, kitchen.abandonDish — mục 25) của các phiếu trên dây ca `sh`:
// mảng dài đúng số dòng phiếu, mỗi phần tử số nguyên 0..99 (không phải số → 0, âm → 0, lẻ → làm tròn xuống, thừa dòng thì
// cắt, thiếu thì thêm 0); không phải mảng (hay phiếu không có mảng dòng) → bỏ trường. Save cũ không có trường này và dữ
// liệu hợp lệ giữ nguyên (lưu rồi tải lại không đổi). Không sửa object đầu vào: có thay đổi thì trả bản sao nông của ca
// (mảng phiếu mới, chỉ sao phiếu bị sửa), không thì trả chính `sh`.
export function migrateLineMistakes(sh) {
  if (!isObj(sh) || !Array.isArray(sh.tickets)) return sh
  let changed = false
  const tickets = sh.tickets.map(t => {
    if (!isObj(t) || !('chonMistakes' in t)) return t
    const next = Array.isArray(t.lines) ? normalizeLineMistakes(t.chonMistakes, t.lines.length) : null
    if (next && JSON.stringify(next) === JSON.stringify(t.chonMistakes)) return t
    changed = true
    const t2 = { ...t }
    if (next) t2.chonMistakes = next
    else delete t2.chonMistakes
    return t2
  })
  return changed ? { ...sh, tickets } : sh
}

// Rổ đang chọn dở (cook.chonDraft = {picked, mistakes, overtime?}, kitchen.saveChonDraft) của ca `sh`: picked chỉ giữ id
// nguyên liệu có trên kệ của món (khi có dữ liệu), mistakes số nguyên 0..99, overtime chỉ giữ khi đúng là true; phiên nấu
// đã qua bước Chọn (hoặc rổ hỏng kiểu) thì bỏ rổ. Save cũ không có trường này giữ nguyên; rổ hợp lệ giữ nguyên (lưu rồi tải lại không đổi). Không sửa object đầu vào:
// có thay đổi thì trả bản sao nông của ca (kèm bản sao phiên nấu), không thì trả chính `sh`.
export function migrateCookDraft(sh, data = null) {
  const cook = isObj(sh) ? sh.cook : null
  if (!isObj(cook) || !('chonDraft' in cook)) return sh
  const R = data && data.RECIPES && data.RECIPES[cook.recipeId]
  const shelf = R && Array.isArray(R.shelf) ? R.shelf : null
  const next = cook.phase === 'chon' && isObj(cook.chonDraft) ? normalizeChonDraft(cook.chonDraft, shelf) : null
  if (next && JSON.stringify(next) === JSON.stringify(cook.chonDraft)) return sh
  const c2 = { ...cook }
  if (next) c2.chonDraft = next
  else delete c2.chonDraft
  return { ...sh, cook: c2 }
}

// M5 (0.5.0): bước đổi loại thao tác (vd Lắc đều: chà → lắc). Phiên nấu ở Thớt giữ bảng bước cũ trong save → dựng lại
// cook.board theo công thức hiện tại (cùng ghi chú, nguyên liệu đã chọn, số phần — effectiveSteps như lúc chốt bước Chọn);
// giữ kết quả bước đã làm (cùng id, cook.steps không đổi), giữ activeStepId/retryPending nếu bước còn trên bảng (không thì
// về null); không đổi tiền, phiếu, giá vốn, lượt làm lại. Chạy lại nhiều lần không đổi. Thiếu dữ liệu công thức, phiên không
// ở Thớt (chọn/xong) hay phiên hỏng kiểu → giữ nguyên. Không sửa object đầu vào: có thay đổi thì trả bản sao nông của ca
// (kèm bản sao phiên nấu), không thì trả chính `sh`.
export function migrateCookBoard(sh, data = null) {
  const cook = isObj(sh) ? sh.cook : null
  if (!isObj(cook) || cook.phase !== 'thot' || !Array.isArray(cook.board)) return sh
  const R = data && data.RECIPES && data.RECIPES[cook.recipeId]
  if (!isObj(R) || !Array.isArray(R.steps) || !Array.isArray(cook.picked)) return sh
  const notes = Array.isArray(cook.notes) ? cook.notes : []
  const board = effectiveSteps(R, notes, cook.picked, cook.qty).filter(st => st.type !== 'chon')
  if (!board.length || JSON.stringify(board) === JSON.stringify(cook.board)) return sh
  const ids = new Set(board.map(st => st.id))
  const c2 = { ...cook, board }
  if (c2.activeStepId != null && !ids.has(c2.activeStepId)) c2.activeStepId = null
  if (c2.retryPending != null && !ids.has(c2.retryPending)) c2.retryPending = null
  return { ...sh, cook: c2 }
}

// M4: tiền sự kiện hoàn lại khi hủy ca dở (migrate): tiền phạt/chi sự kiện đã trừ ví (ledger.eventOut) trừ phần tự bỏ tiền
// mua hàng hiếm đã vào kho (kết quả tình huống có spend và rare), cộng tiền lựa chọn ở màn Chuẩn bị (mods.prepCost).
function droppedEventRefund(sh) {
  const L = isObj(sh.ledger) ? sh.ledger : {}
  const incs = [sh.incident, ...(Array.isArray(sh.incidentQueue) ? sh.incidentQueue : [])].filter(isObj)
  const bought = incs.reduce((a, x) => {
    const r = isObj(x.result) ? x.result : null
    return a + (r && Array.isArray(r.rare) && r.rare.some(g => isObj(g) && int(g.n, 0, 0) > 0) ? int(r.spend, 0, 0) : 0)
  }, 0)
  const prep = isObj(sh.mods) ? int(sh.mods.prepCost, 0, 0) : 0
  return Math.max(0, int(L.eventOut, 0, 0) - bought) + prep
}

// M4 (save v3, bản 0.4.0): các trường mới của M4.
//   - incidents: lastKind, lastLoss, lastEvent (luật nhịp), day (sổ tiền sự kiện của ngày thật), warn (lần nhắc nhở của sự
//     kiện ngày), announced (sự kiện ngày đã chốt);
//   - rare: kho nguyên liệu và công thức hiếm (migrateRare);
//   - ca đang dở của bản 0.3 (save v2): thêm các trường M4 còn thiếu với giá trị mặc định (migrateShiftM4), nên ca dở
//     chơi tiếp được bằng mã M4. Lịch sử ca cũ (history) giữ nguyên: nơi đọc eventIn/eventOut/rare đều có mặc định.
// Save v1/v2 nhận mặc định; save v3 hợp lệ giữ nguyên (lưu rồi tải lại không đổi).
export function migrateContentM4(raw, s, data = null) {
  const def = defaultIncidents()
  const inc = isObj(raw.incidents) ? raw.incidents : {}
  s.incidents = {
    ...(isObj(s.incidents) ? s.incidents : def),
    // luật nhịp: loại và tỉ lệ lỗ (so với trần) của tình huống gần nhất
    lastKind: ['tot', 'chon', 'xau'].includes(inc.lastKind) ? inc.lastKind : def.lastKind,
    lastLoss: Number.isFinite(Number(inc.lastLoss)) ? Math.min(1, Math.max(0, Math.round(Number(inc.lastLoss) * 100) / 100)) : def.lastLoss,
    // sổ tiền sự kiện của ngày thật {key, loss, gain}
    day: isObj(inc.day) && typeof inc.day.key === 'string'
      ? { key: inc.day.key.slice(0, 20), loss: int(inc.day.loss, 0, 0), gain: int(inc.day.gain, 0, 0) }
      : def.day,
    // lần nhắc nhở gần nhất {eventId: ngày game}, chỉ giữ id sự kiện ngày có trong dữ liệu
    warn: migrateWarn(inc.warn, data),
    // loại sự kiện gần nhất trên dòng thời gian chung (sự kiện ngày + tình huống) và sự kiện ngày đã chốt
    lastEvent: ['tot', 'chon', 'xau'].includes(inc.lastEvent) ? inc.lastEvent : def.lastEvent,
    announced: migrateAnnounced(inc.announced, data, s.day)
  }
  migrateRare(raw, s, data)
  if (isObj(s.shift)) s.shift = migrateShiftM4(s.shift)
  return s
}

// Tiền trong sổ ca: số hữu hạn, không âm.
const okMoney = v => typeof v === 'number' && Number.isFinite(v) && v >= 0

// Khóa hiệu ứng M4 của sh.mods (events.prepareShiftMods) và giá trị khi ca không có sự kiện ngày.
function modsM4Defaults() {
  return { lineCountWeights: null, fixedCostDelta: 0, ingCostMul: {}, noQrSpeaker: false, queueMax: null, queueFine: null,
    bigOrder: null, endCheck: null, rareRolls: 0 }
}

// Ca đang dở: thêm các trường M4 còn thiếu (ca mở ở bản 0.3 chưa có). Chỉ thêm hoặc sửa trường thiếu/hỏng, không đổi
// trường hợp lệ. Trả bản sao nông của ca.
//   ledger.eventIn / eventOut = 0; incidentQueue, eventNotes, rareMenu (ca cũ không có món hiếm), rareNotes = [];
//   rareRolls, eventCostExtra, eventMissed = 0; dayKey = '' (trần tiền sự kiện tính theo ngày game); mods thêm khóa M4
//   với giá trị "không có hiệu ứng". eventCap không thêm: thiếu thì trần là tình huống của ca tự mang (events.shiftEventCap).
export function migrateShiftM4(sh) {
  if (!isObj(sh)) return sh
  const out = { ...sh }
  const L = isObj(sh.ledger) ? sh.ledger : {}
  if (!okMoney(L.eventIn) || !okMoney(L.eventOut)) {
    out.ledger = { ...L, eventIn: okMoney(L.eventIn) ? L.eventIn : 0, eventOut: okMoney(L.eventOut) ? L.eventOut : 0 }
  }
  for (const k of ['incidentQueue', 'eventNotes', 'rareNotes']) if (!Array.isArray(sh[k])) out[k] = []
  if (!Array.isArray(sh.rareMenu)) out.rareMenu = []
  else if (sh.rareMenu.some(x => typeof x !== 'string')) out.rareMenu = sh.rareMenu.filter(x => typeof x === 'string')
  for (const k of ['rareRolls', 'eventCostExtra', 'eventMissed']) if (!okMoney(sh[k])) out[k] = 0
  // số lượt Giỏ chợ là số nguyên
  if (!Number.isInteger(out.rareRolls)) out.rareRolls = Math.round(out.rareRolls)
  if (typeof sh.dayKey !== 'string') out.dayKey = ''
  if (isObj(sh.mods)) {
    const md = modsM4Defaults()
    const missing = Object.keys(md).filter(k => !(k in sh.mods))
    if (missing.length) {
      out.mods = { ...sh.mods }
      for (const k of missing) out.mods[k] = md[k]
    }
  }
  return out
}

// M4 (hàng hiếm): kho state.rare. Chỉ giữ id có trong dữ liệu (nguyên liệu rare: true, công thức source 'hiem', phiên
// hàng STALLS); kẹp số phần 0..stockMax, mảnh 0..fragmentsNeed; pity, today, seen, pendingStall về dạng chuẩn. Save v1/v2
// chưa có → mặc định. Giữ nguyên state hợp lệ (lưu rồi tải lại không đổi).
export function migrateRare(raw, s, data = null) {
  const def = defaultRare()
  const r = isObj(raw.rare) ? raw.rare : {}
  const C = (data && data.RARE_CONFIG) || {}
  const stockMax = Number(C.stockMax) > 0 ? Number(C.stockMax) : 6
  const need = Number(C.fragmentsNeed) > 0 ? Number(C.fragmentsNeed) : 3
  const INGS = data && data.INGREDIENTS
  const REC = data && data.RECIPES
  const ingOk = id => /^[a-z0-9_]{1,40}$/.test(id) && (!INGS || !!(INGS[id] && INGS[id].rare))
  const recOk = id => /^[a-z0-9_]{1,40}$/.test(id) && (!REC || !!(REC[id] && REC[id].source === 'hiem'))
  const stallIds = data && Array.isArray(data.STALLS) ? data.STALLS.map(x => x.id) : null
  const stock = {}
  if (isObj(r.stock)) for (const [id, v] of Object.entries(r.stock)) if (ingOk(id)) stock[id] = int(v, 0, 0, stockMax)
  const fragments = {}
  if (isObj(r.fragments)) for (const [id, v] of Object.entries(r.fragments)) if (recOk(id)) fragments[id] = int(v, 0, 0, need)
  const p = isObj(r.pity) ? r.pity : {}
  const t = isObj(r.today) ? r.today : {}
  const ps = r.pendingStall
  s.rare = {
    stock, fragments,
    pity: { ing: int(p.ing, 0, 0, 99), frag: int(p.frag, 0, 0, 99) },
    today: {
      key: dayKeyOr(t.key), got: int(t.got, 0, 0, 999), frags: int(t.frags, 0, 0, 999),
      stalls: strArr(t.stalls).filter(id => !stallIds || stallIds.includes(id)), strangerDay: dayKeyOr(t.strangerDay)
    },
    seen: strArr(r.seen).filter(ingOk),
    pendingStall: isObj(ps) && typeof ps.id === 'string' && (!stallIds || stallIds.includes(ps.id)) && dayKeyOr(ps.dayKey)
      ? { id: ps.id, dayKey: ps.dayKey, ...stallDraftOf(ps) } : def.pendingStall
  }
  return s
}

// Rổ đang lựa dở của phiên hàng (rare.saveStallDraft): {picked: [id ô kệ], mistakes: số lần chọn nhầm 0..99}; lượt lựa
// chưa chạm ô nào (bản cũ) thì không có hai trường này.
function stallDraftOf(ps) {
  if (!Array.isArray(ps.picked) && ps.mistakes === undefined) return {}
  const picked = [...new Set(strArr(ps.picked).filter(id => /^[a-z0-9_]{1,40}$/.test(id)))].slice(0, 12)
  return { picked, mistakes: int(ps.mistakes, 0, 0, 99) }
}

// M3 nội dung: tình huống trong ca (bảo hiểm, loại gần đây, sổ ghi nợ, khách thêm) và Sổ tay nghề (nhóm đã nhận thưởng).
// Các trường M4 của incidents (lastKind, lastLoss, day, warn) do migrateContentM4 thêm.
export function migrateContentM3(raw, s, data = null) {
  const def = defaultIncidents()
  const inc = isObj(raw.incidents) ? raw.incidents : {}
  const ids = data && data.INCIDENTS ? Object.keys(data.INCIDENTS) : null
  s.incidents = {
    since: int(inc.since, 0, 0, 1000),
    recent: Array.isArray(inc.recent) ? inc.recent.filter(x => typeof x === 'string' && (!ids || ids.includes(x))).slice(-10) : def.recent,
    log: Array.isArray(inc.log) ? inc.log.filter(isObj).slice(0, 20) : def.log,
    debts: Array.isArray(inc.debts) ? inc.debts.filter(d => isObj(d) && typeof d.id === 'string').slice(-20).map(d => ({
      id: d.id, regularId: typeof d.regularId === 'string' ? d.regularId : null, name: String(d.name || ''),
      amount: int(d.amount, 0, 0), fromDay: int(d.fromDay, 1, 1), dueDay: int(d.dueDay, 1, 1),
      repayDay: d.repayDay === null || d.repayDay === undefined ? null : int(d.repayDay, 1, 1),
      status: ['cho', 'da_tra', 'quen'].includes(d.status) ? d.status : 'cho',
      ...(d.paidDay !== undefined ? { paidDay: int(d.paidDay, 1, 1) } : {})
    })) : def.debts,
    bonus: isObj(inc.bonus) ? { day: int(inc.bonus.day, 1, 1), customers: int(inc.bonus.customers, 0, 0, 3), rep: int(inc.bonus.rep, 0, 0, 10) } : null,
    total: int(inc.total, 0, 0)
  }
  const nb = isObj(raw.notebook) ? raw.notebook : {}
  const groups = data && data.TIP_GROUPS ? Object.keys(data.TIP_GROUPS) : null
  s.notebook = { ...defaultNotebook(), claimed: strArr(nb.claimed).filter(g => !groups || groups.includes(g)) }
  return s
}

// Sự kiện ngày đã chốt {ngày game: id | ''}: khóa là số ngày trong khoảng [ngày − 20, ngày + 1] (lõi chỉ giữ 15 ngày
// gần nhất), giá trị '' hoặc id sự kiện ngày có trong dữ liệu.
function migrateAnnounced(raw, data, day) {
  const out = {}
  if (!isObj(raw)) return out
  const ids = data && data.DAY_EVENTS ? Object.keys(data.DAY_EVENTS) : null
  for (const [k, v] of Object.entries(raw)) {
    if (!/^\d{1,6}$/.test(k)) continue
    const d = Number(k)
    if (d < 1 || d < day - 20 || d > day + 1) continue
    if (v === '' || (typeof v === 'string' && /^[a-z0-9_]{1,40}$/.test(v) && (!ids || ids.includes(v)))) out[k] = v
  }
  return out
}

function migrateWarn(raw, data) {
  const out = {}
  if (!isObj(raw)) return out
  const ids = data && data.DAY_EVENTS ? Object.keys(data.DAY_EVENTS) : null
  for (const [id, day] of Object.entries(raw)) {
    if (!/^[a-z0-9_]{1,40}$/.test(id) || (ids && !ids.includes(id))) continue
    const d = int(day, 0, 0)
    if (d > 0) out[id] = d
  }
  return out
}

// Số hiệu bản ghi (state.rev) của save đang nằm trong storage; null nếu không có hoặc hỏng.
export function storedRev(storage, opts = {}) {
  let raw = null
  try { raw = storage.getItem(keysOf(opts).save) } catch { raw = null }
  if (!raw) return null
  const obj = decodeSave(raw)
  return obj ? int(obj.rev, 0, 0) : null
}

// Ghi save. opts: { backup (ghi thêm bản dự phòng), keys ({save, backup}, mặc định SAVE_KEY/BACKUP_KEY),
//   guard (kiểm tra tab khác đã ghi bản mới hơn), lastCode (chuỗi save mà phiên này ghi/nạp gần nhất:
//   storage còn đúng chuỗi đó thì khỏi giải mã) }.
// Mỗi lần ghi tăng state.rev. guard: bản trong storage có rev lớn hơn state.rev → KHÔNG ghi.
// → { ok: true, code } | { ok: false, reason: 'tab_khac' | 'loi_ghi' }
export function writeSave(storage, state, opts = {}) {
  const keys = keysOf(opts)
  if (opts.guard) {
    let cur = null
    try { cur = storage.getItem(keys.save) } catch { cur = null }
    if (cur && cur !== opts.lastCode) {
      const obj = decodeSave(cur)
      if (obj && int(obj.rev, 0, 0) > int(state.rev, 0, 0)) return { ok: false, reason: 'tab_khac' }
    }
  }
  const prevRev = state.rev
  state.rev = int(state.rev, 0, 0) + 1
  const code = encodeSave(state)
  try {
    storage.setItem(keys.save, code)
    if (opts.backup) storage.setItem(keys.backup, code)
    return { ok: true, code }
  } catch {
    state.rev = prevRev
    return { ok: false, reason: 'loi_ghi' }
  }
}

// storage có getItem/setItem. opts.backup: ghi thêm bản dự phòng (cuối ca); opts.keys, opts.guard như writeSave.
export function saveTo(storage, state, opts = {}) {
  return writeSave(storage, state, opts).ok
}

// Thử bản chính rồi bản dự phòng; trả state đã migrate hoặc null. opts.keys: khóa lưu (vd DEV_KEYS);
// opts.report (object): nhận ghi chú của migrate (walletRounded, shiftDropped) và report.from = khóa đã nạp.
export function loadFrom(storage, data = null, opts = {}) {
  const keys = keysOf(opts)
  for (const key of [keys.save, keys.backup]) {
    let raw = null
    try { raw = storage.getItem(key) } catch { raw = null }
    if (!raw) continue
    const obj = decodeSave(raw)
    if (obj) {
      const s = migrate(obj, data, opts.report)
      if (s) {
        if (isObj(opts.report)) opts.report.from = key
        return s
      }
    }
  }
  return null
}

// ---------- Bản lưu không đọc được ----------
// Chuỗi ở khóa save/dự phòng mà không nạp được (sai checksum, định dạng lạ, save của chương trình khác…) KHÔNG bị
// ghi đè im lặng: trước lần ghi đầu tiên, chép nguyên chuỗi sang '<khóa save>.hong.<ms>' (không bao giờ xóa).

export function brokenPrefix(opts = {}) {
  return keysOf(opts).save + '.hong.'
}

/**
 * Các khóa save/dự phòng đang chứa chuỗi không nạp được: [{ key, raw }] (chuỗi trùng nhau chỉ tính 1 lần).
 */
export function unreadableSaves(storage, data = null, opts = {}) {
  const keys = keysOf(opts)
  const out = []
  for (const key of [keys.save, keys.backup]) {
    let raw = null
    try { raw = storage.getItem(key) } catch { raw = null }
    if (typeof raw !== 'string' || !raw) continue
    const obj = decodeSave(raw)
    if (obj && migrate(obj, data)) continue
    if (!out.some(x => x.raw === raw)) out.push({ key, raw })
  }
  return out
}

/**
 * Cất nguyên chuỗi các bản lưu không đọc được sang '<khóa save>.hong.<ms>' (khóa đã có thì lùi thêm 1 ms, không ghi đè),
 * đọc lại để chắc đã chép đúng. → { ok: true, archived: [khóa mới] } | { ok: false, reason: 'loi_ghi', archived }
 * ok: false thì KHÔNG được ghi bản mới đè lên (chuỗi cũ chưa được cất).
 */
export function archiveUnreadable(storage, ms, data = null, opts = {}) {
  const list = unreadableSaves(storage, data, opts)
  const prefix = brokenPrefix(opts)
  let at = Math.max(0, Math.floor(Number(ms) || 0))
  const archived = []
  // chuỗi đã cất ở lần mở trước (vd bản dự phòng hỏng chưa bị ghi đè) thì không cất lại
  const kept = new Set()
  for (const key of storageKeys(storage)) {
    if (typeof key !== 'string' || !key.startsWith(prefix)) continue
    try { kept.add(storage.getItem(key)) } catch { /* bỏ qua */ }
  }
  for (const { raw } of list) {
    if (kept.has(raw)) continue
    try {
      let key = prefix + at
      let guard = 0
      while (storage.getItem(key) !== null && guard++ < 1000) key = prefix + (++at)
      storage.setItem(key, raw)
      if (storage.getItem(key) !== raw) return { ok: false, reason: 'loi_ghi', archived }
      archived.push(key)
      at += 1
    } catch {
      return { ok: false, reason: 'loi_ghi', archived }
    }
  }
  return { ok: true, archived }
}

/** Số bản lưu không đọc được đã cất ('<khóa save>.hong.<ms>'). */
export function countBrokenArchives(storage, opts = {}) {
  const prefix = brokenPrefix(opts)
  return storageKeys(storage).filter(k => typeof k === 'string' && k.startsWith(prefix) && /^\d+$/.test(k.slice(prefix.length))).length
}

// Mọi khóa trong storage: localStorage (length/key(i)) hoặc bộ nhớ giả có keys().
function storageKeys(storage) {
  try {
    if (typeof storage.keys === 'function') return [...storage.keys()]
    const out = []
    for (let i = 0; i < storage.length; i++) out.push(storage.key(i))
    return out
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------------------------
// Mã sao lưu (M3): chép tiến trình sang máy khác.
// Định dạng: 'BKN1.z.' + base64url(nén LZ(UTF-8 JSON)) + '.' + fnv1a(SALT + 'z.' + payload) (8 ký tự hex).
// Nén LZ77 kiểu LZ4 viết tay, chạy đồng bộ, không cần CompressionStream (save 45 KB → khoảng 8 KB).
// importCode/readCode nhận cả mã save thô 'BKN1.<payload>.<checksum>' (encodeSave) và bỏ qua khoảng trắng,
// xuống dòng, chữ thừa quanh mã (dán từ file sao lưu hoặc tin nhắn).
// ---------------------------------------------------------------------------------------------

const Z_TAG = 'z'
const LZ_MIN = 4
const LZ_MAX_OFFSET = 0xffff
const LZ_HASH_BITS = 15
// Trần kích thước sau giải nén (chống mã độc làm treo trang): 8 MB.
export const BACKUP_MAX_BYTES = 8 * 1024 * 1024

// Bộ ghi byte tự nới dung lượng.
function byteWriter(cap = 1024) {
  let buf = new Uint8Array(cap)
  let len = 0
  const ensure = n => {
    if (len + n <= buf.length) return
    let c = buf.length * 2
    while (c < len + n) c *= 2
    const nb = new Uint8Array(c)
    nb.set(buf.subarray(0, len))
    buf = nb
  }
  return {
    push(b) { ensure(1); buf[len++] = b },
    pushRun(v) { while (v >= 255) { this.push(255); v -= 255 } this.push(v) },
    copy(src, from, n) { ensure(n); buf.set(src.subarray(from, from + n), len); len += n },
    get length() { return len },
    bytes() { return buf.slice(0, len) }
  }
}

// Nén LZ77 (định dạng khối kiểu LZ4): mỗi chuỗi = token (4 bit độ dài chữ + 4 bit độ dài khớp − 4),
// phần mở rộng độ dài (các byte 255 + phần dư), chữ, rồi độ lệch 2 byte (little endian). Chuỗi cuối chỉ có chữ.
export function lzCompress(src) {
  const n = src.length
  const out = byteWriter(Math.max(64, n >> 2))
  const table = new Int32Array(1 << LZ_HASH_BITS).fill(-1)
  const hashAt = i => (Math.imul(src[i] | (src[i + 1] << 8) | (src[i + 2] << 16) | (src[i + 3] << 24), 2654435761) >>> (32 - LZ_HASH_BITS))
  const emit = (anchor, litLen, offset, matchLen) => {
    const ml = matchLen ? matchLen - LZ_MIN : 0
    out.push((Math.min(litLen, 15) << 4) | Math.min(ml, 15))
    if (litLen >= 15) out.pushRun(litLen - 15)
    out.copy(src, anchor, litLen)
    if (!matchLen) return
    out.push(offset & 0xff)
    out.push(offset >> 8)
    if (ml >= 15) out.pushRun(ml - 15)
  }
  let anchor = 0
  let i = 0
  while (i + LZ_MIN <= n) {
    const h = hashAt(i)
    const ref = table[h]
    table[h] = i
    if (ref >= 0 && i - ref <= LZ_MAX_OFFSET && src[ref] === src[i] && src[ref + 1] === src[i + 1] &&
        src[ref + 2] === src[i + 2] && src[ref + 3] === src[i + 3]) {
      let len = LZ_MIN
      while (i + len < n && src[ref + len] === src[i + len]) len++
      emit(anchor, i - anchor, i - ref, len)
      const end = i + len
      // ghi băm các vị trí trong đoạn khớp để lần sau khớp dài hơn
      for (let j = i + 1; j < end && j + LZ_MIN <= n; j++) table[hashAt(j)] = j
      i = end
      anchor = i
    } else {
      i++
    }
  }
  emit(anchor, n - anchor, 0, 0)
  return out.bytes()
}

// Giải nén; dữ liệu hỏng hoặc vượt maxBytes → ném lỗi.
export function lzDecompress(buf, maxBytes = BACKUP_MAX_BYTES) {
  const bad = () => { throw new Error('ma_hong') }
  let out = new Uint8Array(Math.max(256, buf.length * 4))
  let len = 0
  const grow = need => {
    if (len + need > maxBytes) bad()
    if (len + need <= out.length) return
    let c = out.length * 2
    while (c < len + need) c *= 2
    const nb = new Uint8Array(c)
    nb.set(out.subarray(0, len))
    out = nb
  }
  let i = 0
  const readRun = base => {
    let v = base
    let b
    do {
      if (i >= buf.length) bad()
      b = buf[i++]
      v += b
    } while (b === 255)
    return v
  }
  while (i < buf.length) {
    const tok = buf[i++]
    let lit = tok >> 4
    if (lit === 15) lit = readRun(15)
    if (i + lit > buf.length) bad()
    grow(lit)
    out.set(buf.subarray(i, i + lit), len)
    len += lit
    i += lit
    if (i >= buf.length) break            // chuỗi cuối: chỉ có chữ
    if (i + 2 > buf.length) bad()
    const offset = buf[i] | (buf[i + 1] << 8)
    i += 2
    let ml = tok & 15
    if (ml === 15) ml = readRun(15)
    ml += LZ_MIN
    if (offset === 0 || offset > len) bad()
    grow(ml)
    // chép từng byte: đoạn khớp có thể chồng lên chính nó (lặp lại chuỗi ngắn)
    let from = len - offset
    for (let k = 0; k < ml; k++) out[len++] = out[from++]
  }
  return out.slice(0, len)
}

/** Mã sao lưu của state: 'BKN1.z.<payload>.<checksum>'. */
export function exportCode(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state))
  const payload = bytesToBase64Url(lzCompress(bytes))
  return PREFIX + '.' + Z_TAG + '.' + payload + '.' + checksum(Z_TAG + '.' + payload)
}

/**
 * Tách mã sao lưu ra khỏi đoạn chữ người chơi dán (bỏ khoảng trắng/xuống dòng, chữ thừa trước và sau mã).
 * → chuỗi mã | null (không thấy 'BKN1.').
 */
export function extractCode(text) {
  if (typeof text !== 'string') return null
  const compact = text.replace(/\s+/g, '')
  // có thể có nhiều đoạn giống mã (vd tên xe "BKN1.abc" ở dòng đầu file): lấy đoạn dài nhất
  let best = null
  for (const m of compact.matchAll(/BKN1\.[A-Za-z0-9_.-]*/g)) {
    const code = m[0].replace(/\.+$/, '')
    if (!best || code.length > best.length) best = code
  }
  return best
}

/**
 * Đọc mã sao lưu: → { ok: true, state (đã migrate), code } | { ok: false, reason }
 * reason: 'rong' (chưa dán gì) | 'khong_phai_ma' (không có 'BKN1.') | 'sai_ma' (sai/thiếu ký tự, checksum lệch)
 *         | 'hong' (đúng checksum nhưng không đọc được nội dung).
 */
export function readCode(text, data = null) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, reason: 'rong' }
  const code = extractCode(text)
  if (!code) return { ok: false, reason: 'khong_phai_ma' }
  const parts = code.split('.')
  let raw = null
  if (parts.length === 4 && parts[1] === Z_TAG) {
    const payload = parts[2]
    if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload) || checksum(Z_TAG + '.' + payload) !== parts[3]) return { ok: false, reason: 'sai_ma' }
    try {
      const json = new TextDecoder('utf-8', { fatal: true }).decode(lzDecompress(base64UrlToBytes(payload)))
      raw = JSON.parse(json)
    } catch {
      return { ok: false, reason: 'hong' }
    }
  } else if (parts.length === 3) {
    raw = decodeSave(code)
    if (!raw) return { ok: false, reason: 'sai_ma' }
  } else {
    return { ok: false, reason: 'sai_ma' }
  }
  if (!isObj(raw)) return { ok: false, reason: 'hong' }
  const losses = codeLosses(raw, data)
  const report = {}
  const state = migrate(raw, data, report)
  if (!state) return { ok: false, reason: 'hong' }
  const newer = Number(raw.version) > STATE_VERSION || losses.recipes.length > 0 || losses.upgrades.length > 0
  return { ok: true, state, code, warn: newer ? 'ban_moi_hon' : null, lost: losses, report }
}

// Phần trong mã mà bản game này chưa có (mã tạo từ bản mới hơn): id công thức, nâng cấp không có trong dữ liệu.
// migrate sẽ bỏ các phần này → giao diện phải cảnh báo trước khi dùng mã.
export function codeLosses(raw, data = null) {
  const out = { recipes: [], upgrades: [] }
  if (!isObj(raw) || !data) return out
  if (data.RECIPES && isObj(raw.recipes)) out.recipes = Object.keys(raw.recipes).filter(id => !data.RECIPES[id])
  const U = data.UPGRADES
  if (U && isObj(raw.upgrades)) {
    const has = id => (Array.isArray(U) ? U.some(u => u.id === id) : !!U[id])
    out.upgrades = Object.keys(raw.upgrades).filter(id => raw.upgrades[id] && !has(id))
  }
  return out
}

/** Đọc mã sao lưu → state đã migrate | null. */
export function importCode(str, data = null) {
  const r = readCode(str, data)
  return r.ok ? r.state : null
}

/** Thông tin xem trước của một bản lưu (so sánh trước khi ghi đè). */
export function backupSummary(state) {
  const s = isObj(state) ? state : {}
  const stats = isObj(s.stats) ? s.stats : {}
  return {
    shopName: typeof s.shopName === 'string' ? s.shopName : '',
    day: int(s.day, 1, 1),
    chang: int(s.chang, 1, 1, 7),
    wallet: int(s.wallet, 0),
    reputation: int(s.reputation, 0, 0),
    goldSpoons: int(s.goldSpoons, 0, 0),
    recipes: isObj(s.recipes) ? Object.keys(s.recipes).length : 0,
    shiftsPlayed: int(stats.shiftsPlayed, 0, 0),
    inShift: !!isObj(s.shift)
  }
}

// ---------- Cất bản lưu cũ (không bao giờ xóa) ----------
// Trước khi ghi đè (nhập mã, chơi lại từ đầu) bản hiện tại được cất sang khóa riêng '<khóa save>.old.<ms>'
// (vd 'bkn.save.old.1790000000000'), giá trị là mã sao lưu (exportCode). Không có hàm xóa bản đã cất.

export const ARCHIVE_PREFIX = SAVE_KEY + '.old.'

export function archivePrefix(opts = {}) {
  return keysOf(opts).save + '.old.'
}

/**
 * Cất state vào khóa lưu trữ riêng. ms: thời điểm (giao diện truyền giờ máy). Khóa đã có thì lùi thêm 1 ms
 * (không ghi đè bản cất trước). → { ok: true, key, code } | { ok: false, reason: 'loi_ghi' }
 */
export function archiveSave(storage, state, ms, opts = {}) {
  const prefix = archivePrefix(opts)
  let at = Math.max(0, Math.floor(Number(ms) || 0))
  let key = prefix + at
  try {
    let guard = 0
    while (storage.getItem(key) !== null && guard++ < 1000) key = prefix + (++at)
    const code = exportCode(state)
    storage.setItem(key, code)
    if (storage.getItem(key) !== code) return { ok: false, reason: 'loi_ghi' }
    return { ok: true, key, code }
  } catch {
    return { ok: false, reason: 'loi_ghi' }
  }
}

/**
 * Danh sách bản đã cất (mới nhất trước): [{ key, at, code }]. storage cần length/key(i) (localStorage)
 * hoặc keys() (bộ nhớ giả trong test).
 */
export function listArchives(storage, opts = {}) {
  const prefix = archivePrefix(opts)
  const out = []
  let keys = []
  try {
    if (typeof storage.keys === 'function') keys = [...storage.keys()]
    else for (let i = 0; i < storage.length; i++) keys.push(storage.key(i))
  } catch { keys = [] }
  for (const key of keys) {
    if (typeof key !== 'string' || !key.startsWith(prefix)) continue
    const rest = key.slice(prefix.length)
    if (!/^\d+$/.test(rest)) continue
    let code = null
    try { code = storage.getItem(key) } catch { code = null }
    if (code) out.push({ key, at: Number(rest), code })
  }
  return out.sort((a, b) => b.at - a.at)
}

// ---------- Nhắc sao lưu ----------
export const BACKUP_REMIND_MS = 7 * 24 * 3600 * 1000

/**
 * Đến lúc nhắc sao lưu chưa: đã bán ít nhất 1 ca và đã 7 ngày thật kể từ lần sao lưu gần nhất
 * (chưa sao lưu lần nào thì tính từ backup.since). nowMs do giao diện truyền.
 */
export function backupDue(state, nowMs, everyMs = BACKUP_REMIND_MS) {
  if (!isObj(state)) return false
  const played = (isObj(state.stats) && Number(state.stats.shiftsPlayed) > 0) || (Array.isArray(state.history) && state.history.length > 0)
  if (!played) return false
  const bk = isObj(state.backup) ? state.backup : {}
  const base = Math.max(Number(bk.lastAt) || 0, Number(bk.since) || 0)
  if (!base) return false
  return Number(nowMs) - base >= everyMs
}
