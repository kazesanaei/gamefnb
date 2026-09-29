// Lưu/tải: 'BKN1.' + base64url(UTF-8 JSON) + '.' + fnv1a(SALT + payload). Bản chính + bản dự phòng.
import { hashString } from './rng.js'
import { defaultState, defaultStats, defaultSettings, newRecipeProgress, STATE_VERSION } from './state.js'

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

// Gộp với defaultState, kẹp giá trị âm/NaN, bỏ id không còn trong dữ liệu (khi có data).
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
