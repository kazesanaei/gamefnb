// Hướng dẫn lần đầu (tour) — trạng thái thuần, lưu trong state.tour = { seen: { tourId: true }, disabled: false }.
// Lõi không biết giao diện: src/ui/components/tour.js hỏi shouldShowTour trước khi TỰ hiện một tour (lần đầu người chơi
// tới màn/khâu đó), gọi markSeen khi người chơi xem hết hoặc bấm "Bỏ qua hướng dẫn". Nút "?" chạy lại tour bất cứ lúc nào
// (không cần hỏi lõi). Cài đặt "Hướng dẫn lần đầu" bật/tắt tự hiện (setToursEnabled). Danh sách tour ở src/data/tours.js.
// Không dùng DOM, đồng hồ hay ngẫu nhiên.

export const TOUR_ID_MAX = 40

/** Trạng thái tour của bản lưu mới. */
export function defaultTour() {
  return { seen: {}, disabled: false }
}

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v)
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= TOUR_ID_MAX
const toursOf = data => (data && isObj(data.TOURS) ? data.TOURS : null)

// state.tour luôn đủ cấu trúc (bản lưu thiếu trường thì tạo mới).
function tourOf(state) {
  if (!isObj(state.tour)) state.tour = defaultTour()
  if (!isObj(state.tour.seen)) state.tour.seen = {}
  if (typeof state.tour.disabled !== 'boolean') state.tour.disabled = false
  return state.tour
}

/** Tự hiện tour đang bật (công tắc "Hướng dẫn lần đầu" trong Cài đặt)? */
export function toursEnabled(state) {
  return !!state && !(isObj(state.tour) && state.tour.disabled === true)
}

/** Bật/tắt tự hiện tour. Không đổi danh sách đã xem. */
export function setToursEnabled(state, on) {
  if (!state) return false
  tourOf(state).disabled = !on
  return true
}

/** Tour đã được xem (hoặc bỏ qua) chưa. */
export function isTourSeen(state, tourId) {
  return !!(state && isObj(state.tour) && isObj(state.tour.seen) && state.tour.seen[tourId] === true)
}

/**
 * Có nên TỰ hiện tour này không: tự hiện đang bật, tour chưa xem; có data thì tour phải có trong TOURS và không phải tour
 * chỉ chạy bằng nút "?" (auto === false).
 */
export function shouldShowTour(state, tourId, data = null) {
  if (!state || !validId(tourId) || !toursEnabled(state) || isTourSeen(state, tourId)) return false
  const T = toursOf(data)
  if (T && (!T[tourId] || T[tourId].auto === false)) return false
  return true
}

/** Ghi đã xem một hoặc nhiều tour. → true nếu có thay đổi. */
export function markSeen(state, tourIds) {
  if (!state) return false
  const ids = (Array.isArray(tourIds) ? tourIds : [tourIds]).filter(validId)
  if (!ids.length) return false
  const t = tourOf(state)
  let changed = false
  for (const id of ids) {
    if (t.seen[id] === true) continue
    t.seen[id] = true
    changed = true
  }
  return changed
}

/**
 * "Xem lại tất cả hướng dẫn từ đầu": xóa danh sách đã xem; mặc định bật lại tự hiện (người chơi muốn xem lại thì phải
 * hiện được). → số tour vừa được đặt lại.
 */
export function resetTours(state, { enable = true } = {}) {
  if (!state) return 0
  const t = tourOf(state)
  const n = Object.keys(t.seen).length
  t.seen = {}
  if (enable) t.disabled = false
  return n
}

/**
 * Chuẩn hóa state.tour khi nạp bản lưu (save.migrate gọi). Bản có trường tour: giữ tour đã xem hợp lệ (id có trong TOURS
 * nếu có data, giá trị true), disabled boolean. Bản cũ chưa có trường tour (trước 0.4.1): người chơi đã bán ít nhất một ca
 * thì các tour của vòng chơi chính họ chắc chắn đã đi qua (TOURS[id].veteranDay ≤ ngày game hiện tại) được ghi là đã xem,
 * để bản cập nhật không bật hướng dẫn giữa ca của người chơi quen tay; tour của màn đã đặt tên xe (screen 'title') ghi đã
 * xem khi xe đã có tên. Các tour còn lại vẫn tự hiện lần đầu; nút "?" luôn xem lại được.
 */
export function migrateTour(raw, s, data = null) {
  const T = toursOf(data)
  const known = id => validId(id) && (!T || !!T[id])
  const out = defaultTour()
  const src = raw && isObj(raw.tour) ? raw.tour : null
  if (src) {
    if (isObj(src.seen)) for (const id of Object.keys(src.seen)) if (src.seen[id] === true && known(id)) out.seen[id] = true
    out.disabled = src.disabled === true
  } else if (T) {
    const played = Math.max(0, Math.floor(Number(s && s.stats && s.stats.shiftsPlayed) || 0))
    const day = Math.max(1, Math.floor(Number(s && s.day) || 1))
    const named = !!(s && typeof s.shopName === 'string' && s.shopName.trim())
    for (const id of Object.keys(T)) {
      const def = T[id] || {}
      if (named && def.screen === 'title') out.seen[id] = true
      else if (played > 0 && Number(def.veteranDay) > 0 && day >= Number(def.veteranDay)) out.seen[id] = true
    }
  }
  if (s) s.tour = out
  return s
}
