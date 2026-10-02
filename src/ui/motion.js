// Giảm chuyển động dùng chung cho giao diện (M5): công tắc "Giảm chuyển động" trong Cài đặt của game, lớp
// 'reduce-motion' trên <html> (app.applySettings gắn) hoặc tùy chọn của hệ điều hành (prefers-reduced-motion).
// Luật CSS ở base.css chỉ ép thời lượng hoạt ảnh CSS; hoạt ảnh JS (WAAPI, canvas, rAF) KHÔNG bị chặn, nên mọi hiệu ứng
// phải hỏi isReduced() trước khi chạy.
// Import trong Node an toàn: chỉ chạm document / window / matchMedia bên trong hàm, luôn kiểm typeof trước.

// Đường cong chuyển động chuẩn (trùng biến --g-ease-* ở css/theme.css).
export const EASE = Object.freeze({
  outBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  outCubic: 'cubic-bezier(0.33, 1, 0.68, 1)'
})

// Đọc cài đặt từ app ở mọi dạng đang có: app.settings() (app thật), app.settings (đối tượng, hộp cát / test),
// app.state.settings (state gốc).
function settingsOf(app) {
  const out = []
  if (!app || typeof app !== 'object') return out
  try {
    const s = typeof app.settings === 'function' ? app.settings() : app.settings
    if (s && typeof s === 'object') out.push(s)
  } catch { /* bỏ qua cài đặt lỗi */ }
  try {
    if (app.state && app.state.settings && typeof app.state.settings === 'object') out.push(app.state.settings)
  } catch { /* bỏ qua */ }
  return out
}

// Lớp 'reduce-motion' trên <html>.
function htmlReduced() {
  try {
    if (typeof document === 'undefined' || !document || !document.documentElement) return false
    const cl = document.documentElement.classList
    return !!(cl && typeof cl.contains === 'function' && cl.contains('reduce-motion'))
  } catch {
    return false
  }
}

// prefers-reduced-motion của hệ điều hành (gọi matchMedia qua window để không lỗi "Illegal invocation").
function osReduced() {
  try {
    if (typeof window !== 'undefined' && window && typeof window.matchMedia === 'function') {
      return !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    if (typeof matchMedia === 'function') return !!matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { /* trình duyệt cũ: coi như không giảm */ }
  return false
}

/**
 * isReduced(app?) → true nếu người chơi bật "Giảm chuyển động" trong game (app.settings / app.state.settings
 * .reducedMotion), hoặc <html> có lớp 'reduce-motion', hoặc hệ điều hành bật prefers-reduced-motion.
 * Không có app thì chỉ xét lớp trên <html> và hệ điều hành. Không ném lỗi trong Node.
 */
export function isReduced(app) {
  for (const s of settingsOf(app)) if (s.reducedMotion) return true
  return htmlReduced() || osReduced()
}
