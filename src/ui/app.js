// Đối tượng app dùng chung cho mọi màn: state, dữ liệu, bus, ctx, lưu, điều hướng, thông báo, hộp thoại.
import { DATA } from '../data/index.js'
import { createBus } from '../core/bus.js'
import { makeNowInfo } from '../core/clock.js'
import { writeSave, decodeSave, SAVE_KEY, BACKUP_KEY } from '../core/save.js'
import { h } from './dom.js'
import { createRouter } from './router.js'
import { createToaster } from './components/toast.js'
import { createModalHost } from './components/modal.js'
import { createAudio } from './audio.js'
import { DI_SAU } from './art.js'

export const SAVE_DEBOUNCE_MS = 300

// Màn con: nút Back của điện thoại / cử chỉ vuốt lùi đưa về màn Chuẩn bị thay vì rời game.
export const SUB_SCREENS = Object.freeze(['shop', 'tasting', 'quests', 'mailbox', 'event', 'stage-up', 'service', 'summary'])

/**
 * createApp({ root, storage, now, screens, saveKeys, devBanner }) → app
 * app = { state, data, bus, ctx: { emit, data, now }, save(), saveNow(opts), go(name, params), toast(text, opts),
 *         modal(opts) → Promise, vibrate(ms), sound(name), now(), nowInfo(), session, router, screens, locked }
 * saveKeys: {save, backup} (xem trước bằng ?devNow dùng khóa riêng); devBanner: chữ dải cảnh báo giờ giả.
 * Hai tab cùng mở: tab nào thấy bản lưu mới hơn do tab khác ghi (state.rev lớn hơn) thì tự khóa, không ghi đè.
 */
export function createApp({ root, storage = null, now = () => Date.now(), screens = {}, saveKeys = null, devBanner = '' } = {}) {
  const keys = saveKeys || { save: SAVE_KEY, backup: BACKUP_KEY }
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
  if (devBanner) {
    // xem trước bằng giờ giả: nhắc rõ, tiến trình lưu riêng
    root.classList.add('is-dev-now')
    root.appendChild(h('div', { class: 'dev-banner', testid: 'devnow-banner', role: 'status' }, devBanner))
  }
  root.appendChild(screenRoot)
  root.appendChild(overlay)
  const toaster = createToaster(overlay)
  const modals = createModalHost(overlay)

  let saveTimer = 0
  let lastCode = null        // chuỗi save phiên này ghi gần nhất
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
    saveKeys: keys,
    locked: false,           // tab khác đã ghi bản mới hơn: tab này dừng hẳn, không lưu nữa
    now,
    // Trạng thái riêng của lần mở trang này (không lưu): đã hiện bảng điểm danh ngày nào, đã báo thư mới…
    session: { checkinShownDay: '', mailToastIds: [], pendingMail: [], pendingEventAuto: [] },

    // Thời điểm tin cậy cho các hệ thống theo ngày thật (cập nhật state.clock.maxSeen).
    nowInfo() {
      return makeNowInfo(app.state, app.now())
    },

    // Lưu có debounce 300 ms.
    save() {
      if (!storage || !app.state || app.locked) return
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => { saveTimer = 0; app.saveNow() }, SAVE_DEBOUNCE_MS)
    },
    // Lưu ngay (opts.backup: ghi thêm bản dự phòng). Tab khác đã ghi bản mới hơn → không ghi, khóa tab này.
    saveNow(opts = {}) {
      if (!storage || !app.state || app.locked) return false
      clearTimeout(saveTimer)
      saveTimer = 0
      const r = writeSave(storage, app.state, { ...opts, keys, guard: true, lastCode })
      if (r.ok) { lastCode = r.code; return true }
      if (r.reason === 'tab_khac') lockTab()
      return false
    },
    go(name, params) {
      const scr = app.router.go(name, params)
      syncHistory(name)
      return scr
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
  const flush = () => { if (app.state && !app.locked) app.saveNow() }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
  window.addEventListener('pagehide', flush)

  // ---------- Một tab chơi tại một thời điểm ----------
  // Tab khác vừa ghi save (mở game ở tab mới, nhận quà…): bản trong bộ nhớ của tab này đã cũ → khóa tab này
  // để nó không ghi đè (mất quà, mất ca, lùi ca hỏng). Người chơi bấm nút thì tải lại bản mới nhất.
  window.addEventListener('storage', e => {
    if (!app.state || app.locked || e.key !== keys.save || !e.newValue || e.newValue === lastCode) return
    const obj = decodeSave(e.newValue)
    if (obj && (Number(obj.rev) || 0) > (Number(app.state.rev) || 0)) lockTab()
  })

  function lockTab() {
    if (app.locked) return
    app.locked = true
    clearTimeout(saveTimer)
    saveTimer = 0
    overlay.appendChild(h('div', { class: 'tab-lock', testid: 'tab-lock', role: 'alertdialog', 'aria-modal': 'true' },
      h('div', { class: 'tab-lock-card' },
        h('h2', { class: 'modal-title' }, 'Game đang mở ở tab khác'),
        h('p', { class: 'modal-text' }, 'Tab này đã tạm dừng để không ghi đè tiến trình mới hơn. Bấm nút dưới để tải bản lưu mới nhất và chơi tiếp ở đây.'),
        h('button', { class: 'btn btn-primary btn-big', type: 'button', testid: 'tab-lock-reload', onclick: () => location.reload() }, 'Chơi ở tab này'))))
  }

  // ---------- Nút Back của điện thoại ----------
  // Vào màn con thì đẩy 1 mục lịch sử; Back: đóng hộp thoại (nếu đóng được), màn tự xử lý (onBack: Nấu thử hỏi
  // xác nhận, ca bán ở lại), còn lại về màn Chuẩn bị. Về màn gốc bằng nút trong game thì bỏ mục lịch sử đó.
  const hist = { pushed: false, ignore: 0 }
  function canHistory() {
    return typeof history !== 'undefined' && typeof history.pushState === 'function'
  }
  function pushEntry(name) {
    try { history.pushState({ bkn: name }, ''); hist.pushed = true } catch { /* bỏ qua */ }
  }
  function syncHistory(name) {
    if (!canHistory()) return
    const sub = SUB_SCREENS.includes(name)
    if (sub && !hist.pushed) pushEntry(name)
    else if (!sub && hist.pushed) {
      hist.pushed = false
      hist.ignore += 1
      try { history.back() } catch { hist.ignore -= 1 }
    }
  }
  window.addEventListener('popstate', () => {
    if (hist.ignore > 0) { hist.ignore -= 1; return }
    hist.pushed = false
    const name = app.router && app.router.name
    if (!SUB_SCREENS.includes(name) || app.locked) return
    if (modals.isOpen()) {
      pushEntry(name)
      if (modals.isDismissible()) modals.closeActive(null)
      return
    }
    const cur = app.router.current
    if (cur && typeof cur.onBack === 'function') {
      pushEntry(name)
      cur.onBack()
      return
    }
    app.go('prep')
  })

  return app
}
