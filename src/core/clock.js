// Đồng hồ ngày game: ngày mới bắt đầu lúc 04:00 giờ Việt Nam (UTC+7). Thời gian luôn truyền vào.

export const DAY_RESET_HOUR_VN = 4
const HOUR = 3600000
export const REWIND_TOLERANCE_MS = 10 * 60 * 1000

// 'YYYY-MM-DD' của "ngày" theo mốc 04:00 giờ Việt Nam.
export function dayKeyVN(ms) {
  return new Date(Number(ms) + (7 - DAY_RESET_HOUR_VN) * HOUR).toISOString().slice(0, 10)
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
