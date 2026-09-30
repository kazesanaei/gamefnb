// Bộ định tuyến màn: mỗi màn là module { mount(root, app, params) → { unmount(), update?(dt), onBack?() } }.
//
// Thêm màn mới (vd Sổ công thức, Sổ tay nghề): viết src/ui/screens/<tên>.js, import rồi thêm vào bảng SCREENS
// ở src/main.js (khóa = tên màn dùng trong app.go). Nhớ thêm tệp vào danh sách PRECACHE của sw.js (có test đối chiếu).
// Màn không nằm trong ROOT_SCREENS tự là màn con: nút Back của điện thoại đưa về màn Chuẩn bị.

// Màn gốc: ở đây nút Back của điện thoại rời trang như thường.
export const ROOT_SCREENS = Object.freeze(['title', 'prep'])

/** Màn con (Back → Chuẩn bị): mọi màn đã đăng ký trừ màn gốc. */
export function isSubScreen(name) {
  return typeof name === 'string' && name !== '' && !ROOT_SCREENS.includes(name)
}

export function createRouter(root, app, screens = {}) {
  const table = { ...screens }
  let current = null
  let currentName = null
  const router = {
    /** Đăng ký thêm màn lúc chạy (ghi đè màn cùng tên). */
    register(name, screen) {
      if (!name || !screen || typeof screen.mount !== 'function') throw new Error('Màn không hợp lệ: ' + name)
      table[name] = screen
      return router
    },
    has(name) { return Object.prototype.hasOwnProperty.call(table, name) },
    names() { return Object.keys(table) },
    go(name, params = {}) {
      const scr = table[name]
      if (!scr) throw new Error('Không có màn: ' + name)
      if (current && typeof current.unmount === 'function') {
        try { current.unmount() } catch (err) { console.error(err) }
      }
      current = null
      root.textContent = ''
      root.dataset.screen = name
      currentName = name
      current = scr.mount(root, app, params || {}) || {}
      root.scrollTop = 0
      return current
    },
    get current() { return current },
    get name() { return currentName }
  }
  return router
}
