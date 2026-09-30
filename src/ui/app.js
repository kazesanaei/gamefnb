// Đối tượng app dùng chung cho mọi màn: state, dữ liệu, bus, ctx, lưu, điều hướng, thông báo, hộp thoại.
import { DATA } from '../data/index.js'
import { createBus } from '../core/bus.js'
import { makeNowInfo } from '../core/clock.js'
import { saveTo } from '../core/save.js'
import { h } from './dom.js'
import { createRouter } from './router.js'
import { createToaster } from './components/toast.js'
import { createModalHost } from './components/modal.js'
import { createAudio } from './audio.js'
import { DI_SAU } from './art.js'

export const SAVE_DEBOUNCE_MS = 300

/**
 * createApp({ root, storage, now }) → app
 * app = { state, data, bus, ctx: { emit, data, now }, save(), saveNow(opts), go(name, params), toast(text, opts),
 *         modal(opts) → Promise, vibrate(ms), sound(name), now(), nowInfo(), session, router, screens }
 */
export function createApp({ root, storage = null, now = () => Date.now(), screens = {} } = {}) {
  const bus = createBus()
  // Lỗi trong một bộ nghe giao diện không được làm đứt hàm lõi đang chạy dở (vd advance, clipTicket).
  const safeEmit = (type, payload) => {
    try { bus.emit(type, payload) } catch (err) { console.error(err) }
  }
  // ctx.now: giờ (ms) cho lõi M2 (sự kiện có thời hạn khi mở ca, Tem, nhiệm vụ theo ngày thật)
  const ctx = { emit: safeEmit, data: DATA, now: () => now() }

  // Khung: vùng màn + lớp nổi (thông báo, hộp thoại).
  const screenRoot = h('main', { class: 'screen', id: 'screen' })
  const overlay = h('div', { class: 'overlay-root' })
  root.appendChild(screenRoot)
  root.appendChild(overlay)
  const toaster = createToaster(overlay)
  const modals = createModalHost(overlay)

  let saveTimer = 0
  const app = {
    state: null,
    data: DATA,
    bus,
    ctx,
    root,
    screenRoot,
    overlay,
    screens,
    router: null,
    storage,
    now,
    // Trạng thái riêng của lần mở trang này (không lưu): đã hiện bảng điểm danh ngày nào, đã báo thư mới…
    session: { checkinShownDay: '', mailToastIds: [], pendingMail: [], rewindNoted: false },

    // Thời điểm tin cậy cho các hệ thống theo ngày thật (cập nhật state.clock.maxSeen).
    nowInfo() {
      return makeNowInfo(app.state, app.now())
    },

    // Lưu có debounce 300 ms.
    save() {
      if (!storage || !app.state) return
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => { saveTimer = 0; app.saveNow() }, SAVE_DEBOUNCE_MS)
    },
    // Lưu ngay (opts.backup: ghi thêm bản dự phòng).
    saveNow(opts = {}) {
      if (!storage || !app.state) return false
      clearTimeout(saveTimer)
      saveTimer = 0
      return saveTo(storage, app.state, opts)
    },
    go(name, params) {
      return app.router.go(name, params)
    },
    toast(text, opts) {
      return toaster.show(text, opts)
    },
    modal(opts) {
      return modals.open(opts)
    },
    modalOpen() {
      return modals.isOpen()
    },
    modalBlocking() {
      return modals.isBlocking()
    },
    vibrate(ms = 30) {
      const s = app.state && app.state.settings
      if (s && s.vibrate === false) return
      try { if (navigator.vibrate) navigator.vibrate(ms) } catch { /* bỏ qua */ }
    },
    sound(name) {
      audio.play(name)
    },
    settings() {
      return (app.state && app.state.settings) || {}
    },
    applySettings() {
      const s = app.settings()
      document.documentElement.classList.toggle('reduce-motion', !!s.reducedMotion)
    }
  }
  const audio = createAudio(() => app.settings().sound !== false)
  app.router = createRouter(screenRoot, app, screens)

  // Thẻ Mẹo nghề: lõi đã ghi tipsSeen và giới hạn 1 thẻ/ca; ở đây chỉ hiện thông báo 3 giây.
  bus.on('tip.unlocked', ({ tipId } = {}) => {
    const tips = Array.isArray(DATA.TIPS) ? DATA.TIPS : Object.values(DATA.TIPS || {})
    const tip = tips.find(t => t.id === tipId)
    if (!tip) return
    // thẻ mở lúc kết ca hiện trong mục "Mẹo của Dì Sáu" của màn Tổng kết, không nổi đè lên tiêu đề
    if (tip.trigger === 'shift_end') { app.save(); return }
    app.toast(tip.text, { title: 'Mẹo nghề: ' + tip.title, kind: 'tip', icon: DI_SAU.vui, duration: 3000, testid: 'tip-card' })
    app.save()
  })

  // Lưu sau mỗi sự kiện miền (debounce gom lại).
  bus.on('*', () => app.save())

  // Lưu khi ẩn tab hoặc rời trang.
  const flush = () => { if (app.state) app.saveNow() }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
  window.addEventListener('pagehide', flush)

  return app
}
