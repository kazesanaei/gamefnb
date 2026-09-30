// Đồng hồ ngày game: ngày mới bắt đầu lúc 04:00 giờ Việt Nam (UTC+7). Thời gian luôn truyền vào.

export const DAY_RESET_HOUR_VN = 4
const HOUR = 3600000
export const REWIND_TOLERANCE_MS = 10 * 60 * 1000

// 'YYYY-MM-DD' của "ngày" theo mốc 04:00 giờ Việt Nam.
export function dayKeyVN(ms) {
  return new Date(Number(ms) + (7 - DAY_RESET_HOUR_VN) * HOUR).toISOString().slice(0, 10)
}

// M4: số phút kể từ 00:00 giờ Việt Nam của thời điểm ms (0..1439), cho phiên hàng hiếm theo khung giờ.
export function vnMinutes(ms) {
  const DAY = 24 * 60
  const m = Math.floor((Number(ms) + 7 * HOUR) / 60000)
  return ((m % DAY) + DAY) % DAY
}

// 'HH:MM' → số phút trong ngày (sai định dạng → NaN).
export function hhmmToMinutes(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN
}

// Mốc 04:00 giờ Việt Nam kế tiếp (ms) sau thời điểm ms.
export function nextResetMs(ms) {
  const shifted = Number(ms) + (7 - DAY_RESET_HOUR_VN) * HOUR
  const dayStart = Math.floor(shifted / (24 * HOUR)) * 24 * HOUR
  return dayStart + 24 * HOUR - (7 - DAY_RESET_HOUR_VN) * HOUR
}

// Cập nhật state.clock.maxSeen; rewind = true nếu giờ máy lùi quá 10 phút so với mốc lớn nhất đã thấy.
export function trustedNow(state, deviceNow) {
  if (!state.clock || typeof state.clock !== 'object') state.clock = { maxSeen: 0 }
  const now = Number(deviceNow) || 0
  const maxSeen = Number(state.clock.maxSeen) || 0
  const rewind = maxSeen > 0 && now < maxSeen - REWIND_TOLERANCE_MS
  if (now > maxSeen) state.clock.maxSeen = now
  return { now, rewind }
}

const DAY_MS = 24 * HOUR

// ---------- M2: thời điểm tin cậy cho các hệ thống theo ngày ----------

// Mốc 04:00 giờ Việt Nam của ngày dayKey ('YYYY-MM-DD') tính bằng ms.
export function vnDayStartMs(dayKey) {
  return Date.parse(String(dayKey) + 'T00:00:00Z') - (7 - DAY_RESET_HOUR_VN) * HOUR
}

// Cộng n ngày vào dayKey.
export function addDaysKey(dayKey, n) {
  return new Date(Date.parse(String(dayKey) + 'T00:00:00Z') + Math.round(Number(n) || 0) * DAY_MS).toISOString().slice(0, 10)
}

// Số ngày từ dayKey a tới b (b − a).
export function daysBetweenKeys(a, b) {
  return Math.round((Date.parse(String(b) + 'T00:00:00Z') - Date.parse(String(a) + 'T00:00:00Z')) / DAY_MS)
}

// Thông tin thời gian dùng chung cho điểm danh, nhiệm vụ, hộp thư, sự kiện:
// { now: giờ máy, trusted: max(giờ máy, mốc lớn nhất từng thấy), rewind, dayKey: ngày thật theo trusted }.
// Cập nhật state.clock.maxSeen (qua trustedNow). Khi rewind = true: khóa nhận quà theo ngày.
export function makeNowInfo(state, deviceNow) {
  const { now, rewind } = trustedNow(state, deviceNow)
  const trusted = Math.max(now, Number(state.clock.maxSeen) || 0)
  return { now, trusted, rewind, dayKey: dayKeyVN(trusted) }
}

// Cờ URL ?devNow=YYYY-MM-DDTHH:mm (giờ Việt Nam) hoặc ?devNow=YYYY-MM-DD (12:00 giờ Việt Nam).
// Chỉ có hiệu lực trên localhost/127.0.0.1. Trả ms hoặc null.
export function parseDevNow(search, hostname) {
  if (!['localhost', '127.0.0.1'].includes(String(hostname || ''))) return null
  let raw = null
  try { raw = new URLSearchParams(String(search || '')).get('devNow') } catch { raw = null }
  if (!raw) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(raw.trim())
  if (!m) return null
  const hh = m[4] !== undefined ? m[4] : '12'
  const mm = m[5] !== undefined ? m[5] : '00'
  const ms = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${hh}:${mm}:00+07:00`)
  return Number.isFinite(ms) ? ms : null
}
