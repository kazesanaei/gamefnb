// Vòng lặp khung hình: advance(state, dt) cho ca đang chơi và screen.update(dt).
import { advance } from '../core/shift.js'

export const MAX_DT = 0.05

/**
 * createLoop(app, { getScreen, shouldAdvance }) → { start(), stop(), running }
 * - getScreen(): màn hiện tại ({ update?(dt) }).
 * - shouldAdvance(): true khi được chạy thời gian ca (đang ở màn ca bán, không có hộp thoại chặn).
 * Tạm dừng khi tab bị ẩn (visibilitychange).
 */
export function createLoop(app, { getScreen, shouldAdvance } = {}) {
  let raf = 0
  let last = 0
  let running = false
  let hidden = typeof document !== 'undefined' && document.hidden

  const frame = ts => {
    raf = requestAnimationFrame(frame)
    if (hidden) { last = ts; return }
    const dt = last ? Math.min(MAX_DT, Math.max(0, (ts - last) / 1000)) : 0
    last = ts
    if (!(dt > 0)) return
    try {
      if (app.state && app.state.shift && (!shouldAdvance || shouldAdvance())) advance(app.state, dt, app.ctx)
      const scr = getScreen && getScreen()
      if (scr && typeof scr.update === 'function') scr.update(dt)
    } catch (err) {
      // Không để một lỗi giao diện làm đứng cả vòng lặp.
      console.error(err)
    }
  }

  const onVis = () => {
    hidden = document.hidden
    last = 0
  }

  return {
    start() {
      if (running) return
      running = true
      last = 0
      document.addEventListener('visibilitychange', onVis)
      raf = requestAnimationFrame(frame)
    },
    stop() {
      running = false
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
    },
    get running() { return running }
  }
}
