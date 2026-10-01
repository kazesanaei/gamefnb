// Đối tượng app dùng chung cho mọi màn: state, dữ liệu, bus, ctx, lưu, điều hướng, thông báo, hộp thoại.
import { DATA } from '../data/index.js'
import { createBus } from '../core/bus.js'
import { makeNowInfo } from '../core/clock.js'
import { writeSave, decodeSave, storedRev, archiveSave, SAVE_KEY, BACKUP_KEY } from '../core/save.js'
import { h } from './dom.js'
import { createRouter, isSubScreen } from './router.js'
import { createToaster } from './components/toast.js'
import { createModalHost } from './components/modal.js'
import { createAudio } from './audio.js'
import { createTourHost } from './components/tour.js'
import { DI_SAU } from './art.js'

export const SAVE_DEBOUNCE_MS = 300

// Phiên bản game: trùng "version" trong package.json và VERSION của sw.js (có test đối chiếu).
export const APP_VERSION = '0.4.1'

// Màn con: nút Back của điện thoại / cử chỉ vuốt lùi đưa về màn Chuẩn bị thay vì rời game.
// (Danh sách tham khảo; thực tế mọi màn không phải màn gốc của router.js đều là màn con — isSubScreen.)
export const SUB_SCREENS = Object.freeze(['shop', 'tasting', 'quests', 'mailbox', 'event', 'stage-up', 'service', 'summary', 'settings', 'notebook', 'recipe-book', 'market'])

// Trạng thái riêng của lần mở trang (không lưu): đã hiện bảng điểm danh ngày nào, đã báo thư mới…
export function freshSession() {
  return { checkinShownDay: '', mailToastIds: [], pendingMail: [], pendingEventAuto: [] }
}

/**
 * createApp({ root, storage, now, screens, saveKeys, devBanner }) → app
 * app = { state, data, bus, ctx: { emit, data, now }, save(), saveNow(opts), go(name, params), toast(text, opts),
 *         modal(opts) → Promise, vibrate(ms), sound(name), now(), nowInfo(), session, router, screens, locked,
 *         version, pwa, onPwaChange(fn), updateSlot(), applyUpdate(), installMode(), promptInstall(), replaceState(next),
 *         tour (0.4.1: hướng dẫn lần đầu, components/tour.js) }
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
  fitFrameHeight(root)
  const toaster = createToaster(overlay)
  const modals = createModalHost(overlay)

  let saveTimer = 0
  let lastCode = null        // chuỗi save phiên này ghi gần nhất
  // Không lưu được tiến trình: kind 'chan' (trình duyệt chặn bộ nhớ trang) | 'loi_ghi' (ghi lỗi, vd bộ nhớ đầy)
  // | 'loi_cat' (không cất được bản lưu hỏng nên tạm không ghi đè lên nó; blocked = true).
  const saveIssue = { kind: null, fails: 0, blocked: false, banner: null, told: {} }
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
    version: APP_VERSION,
    // Trạng thái riêng của lần mở trang này (không lưu): đã hiện bảng điểm danh ngày nào, đã báo thư mới…
    session: freshSession(),

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
    // Ghi lỗi (bộ nhớ đầy/bị chặn) → dải cảnh báo "Chưa lưu được tiến trình" (setSaveProblem); ghi lại được thì tắt.
    saveNow(opts = {}) {
      if (!storage || !app.state || app.locked || saveIssue.blocked) return false
      clearTimeout(saveTimer)
      saveTimer = 0
      const r = writeSave(storage, app.state, { ...opts, keys, guard: true, lastCode })
      if (r.ok) {
        lastCode = r.code
        saveIssue.fails = 0
        if (saveIssue.kind === 'loi_ghi') app.setSaveProblem(null)
        return true
      }
      if (r.reason === 'tab_khac') lockTab()
      else if (r.reason === 'loi_ghi') { saveIssue.fails += 1; app.setSaveProblem('loi_ghi') }
      return false
    },
    go(name, params) {
      const scr = app.router.go(name, params)
      syncHistory(name)
      // hướng dẫn lần đầu: đóng tour của màn cũ; màn mới có tour thì chờ lúc hiện được (lần đầu tới màn)
      if (app.tour) app.tour.onRoute(name)
      return scr
    },
    toast(text, opts) {
      return toaster.show(text, opts)
    },
    // Giới hạn chiều cao chồng thông báo (màn ca bán: không che thanh 4 khâu). fn() → px | null; null để bỏ giới hạn.
    toastLimit(fn) {
      toaster.setLimit(fn)
    },
    // Giữ thẻ Mẹo nghề (hướng dẫn lần đầu đang hiện, chồng thông báo bị ẩn): thẻ đang nổi dừng đồng hồ, thẻ mới chờ;
    // thôi giữ thì thẻ hiện tiếp (toast.js hold).
    toastHold(on) {
      toaster.hold(on)
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
      // chưa chạm trang lần nào (vd mở lại trang giữa ca, hộp tình huống bật ngay) thì trình duyệt chặn rung và báo lỗi
      // lên console: bỏ qua
      const ua = typeof navigator !== 'undefined' && navigator.userActivation
      if (ua && !ua.hasBeenActive) return
      try { if (navigator.vibrate) navigator.vibrate(ms) } catch { /* bỏ qua */ }
    },
    sound(name) {
      return audio.play(name)
    },
    settings() {
      return (app.state && app.state.settings) || {}
    },
    applySettings() {
      const s = app.settings()
      document.documentElement.classList.toggle('reduce-motion', !!s.reducedMotion)
    }
  }
  // Âm thanh: đọc Cài đặt (bật/tắt, âm lượng) mỗi lần phát.
  const audio = createAudio(() => app.settings())
  app.audio = audio
  app.router = createRouter(screenRoot, app, screens)
  // Hướng dẫn lần đầu (tour) và nút "?" (components/tour.js, components/help.js)
  app.tour = createTourHost(app)

  // ---------- Không lưu được tiến trình ----------
  // Trình duyệt chặn bộ nhớ của trang, bộ nhớ đầy… → game vẫn chơi được nhưng đóng/tải lại trang là mất tiến trình.
  // Không im lặng: dải cảnh báo cố định trên cùng (nút "Sao lưu" mở mã sao lưu, app.openBackup do main.js gắn) và hộp
  // thoại giải thích một lần cho mỗi loại lỗi (trong ca bán chỉ báo nhẹ, không chặn thao tác).
  const SAVE_PROBLEM_TEXT = Object.freeze({
    chan: 'Trình duyệt đang chặn bộ nhớ của trang (chế độ riêng tư, hoặc đã chặn dữ liệu trang web) nên game không lưu được tiến trình. Đóng hoặc tải lại trang là mất hết. Hãy cho phép trang lưu dữ liệu, hoặc chép mã sao lưu trước khi đóng.',
    loi_ghi: 'Bộ nhớ của trình duyệt đã đầy hoặc bị chặn nên game không lưu được phần vừa chơi. Đóng hoặc tải lại trang là mất. Hãy chép mã sao lưu, rồi dọn bớt dữ liệu trình duyệt.',
    loi_cat: 'Bản lưu cũ trong máy không đọc được, và bộ nhớ đầy nên chưa cất lại được bản đó. Game tạm không lưu để khỏi ghi đè lên bản cũ. Đóng trang là mất phần vừa chơi; hãy chép mã sao lưu.'
  })
  app.saveProblem = () => saveIssue.kind
  app.setSaveProblem = (kind, { block = false } = {}) => {
    if (block) saveIssue.blocked = true
    const next = kind || (saveIssue.blocked ? 'loi_cat' : null)
    if (next === saveIssue.kind) return
    saveIssue.kind = next
    if (saveIssue.banner) { saveIssue.banner.remove(); saveIssue.banner = null }
    root.classList.toggle('has-save-warning', !!next)
    if (!next) return
    saveIssue.banner = h('div', { class: 'save-warning', testid: 'save-warning', role: 'alert', dataset: { kind: next } },
      h('span', { class: 'save-warning-text' },
        h('b', null, 'Chưa lưu được tiến trình'),
        h('small', null, 'Đóng trang là mất. Hãy chép mã sao lưu.')),
      h('button', {
        class: 'btn btn-small save-warning-btn', type: 'button', testid: 'save-warning-backup',
        onclick: () => { app.sound('click'); openBackup() }
      }, 'Sao lưu'))
    root.insertBefore(saveIssue.banner, screenRoot)
    if (saveIssue.told[next]) return
    saveIssue.told[next] = true
    if (app.router && app.router.name === 'service') {
      app.toast('Chưa lưu được tiến trình: xem dải cảnh báo trên cùng.', { kind: 'bad', duration: 4000, testid: 'save-warning-toast' })
      return
    }
    app.modal({
      title: 'Chưa lưu được tiến trình', icon: DI_SAU.lo, testid: 'save-warning-modal', text: SAVE_PROBLEM_TEXT[next],
      actions: [
        { label: 'Để sau', value: false, kind: 'ghost', testid: 'save-warning-later' },
        { label: 'Chép mã sao lưu', value: true, testid: 'save-warning-copy' }
      ]
    }).then(v => { if (v) openBackup() })
  }
  function openBackup() {
    if (typeof app.openBackup === 'function') app.openBackup()
  }

  // ---------- Thay cả bản lưu (nhập mã sao lưu, khôi phục bản đã cất, chơi lại từ đầu) ----------
  // Bản hiện tại luôn được CẤT sang khóa riêng '<khóa save>.old.<ms>' trước khi ghi đè (không bao giờ xóa).
  // Số hiệu bản ghi nối tiếp bản trong storage để tab cũ tự khóa, không ghi đè bản mới.
  // → { ok: true, archived: khóa đã cất | null } | { ok: false, reason: 'tab_khac' | 'loi_cat' | 'loi_ghi' }
  app.replaceState = function replaceState(next, { archive = true } = {}) {
    if (app.locked) return { ok: false, reason: 'tab_khac' }
    if (!next || typeof next !== 'object') return { ok: false, reason: 'loi_ghi' }
    const prev = app.state
    let archived = null
    // không có bộ nhớ trình duyệt thì không cất được bản đang chơi: không thay (tránh mất tiến trình)
    if (!storage && prev && archive && prev.shopName) return { ok: false, reason: 'loi_cat' }
    if (storage && prev && archive) {
      const r = archiveSave(storage, prev, app.now(), { keys })
      if (!r.ok) return { ok: false, reason: 'loi_cat' }
      archived = r.key
    }
    clearTimeout(saveTimer)
    saveTimer = 0
    const cur = storage ? storedRev(storage, { keys }) : null
    next.rev = Math.max(Number(next.rev) || 0, Number(prev && prev.rev) || 0, Number(cur) || 0)
    app.state = next
    if (storage) {
      const w = writeSave(storage, next, { keys, backup: true, guard: true, lastCode })
      if (!w.ok) {
        app.state = prev
        if (w.reason === 'tab_khac') lockTab()
        return { ok: false, reason: w.reason === 'tab_khac' ? 'tab_khac' : 'loi_ghi' }
      }
      lastCode = w.code
    }
    app.session = freshSession()
    app.applySettings()
    return { ok: true, archived }
  }

  // ---------- Ứng dụng cài được (PWA): bản mới, cài game ----------
  // main.js đăng ký service worker và báo vào đây; màn Chuẩn bị/Tổng kết hiện "Có bản mới – Tải lại" (không bao giờ giữa ca).
  const pwaListeners = new Set()
  const pwa = {
    updateReady: false,      // có service worker bản mới đang chờ
    waiting: null,           // ServiceWorker đang chờ kích hoạt
    reloading: false,        // người chơi đã bấm Tải lại (controllerchange → tải lại trang)
    installPrompt: null,     // sự kiện beforeinstallprompt đã hoãn
    installed: false,
    offlineReady: false      // service worker đã lưu sẵn tệp để chơi offline
  }
  app.pwa = pwa
  const notifyPwa = () => {
    for (const fn of [...pwaListeners]) {
      try { fn(pwa) } catch (err) { console.error(err) }
    }
  }
  app.onPwaChange = fn => { pwaListeners.add(fn); return () => pwaListeners.delete(fn) }
  app.setPwa = patch => { Object.assign(pwa, patch || {}); notifyPwa() }
  // Có bản mới (worker đang chờ): chỉ ghi nhận, màn Chuẩn bị/Tổng kết tự hiện nút.
  app.setUpdateReady = worker => app.setPwa({ updateReady: true, waiting: worker || pwa.waiting })
  // Người chơi bấm "Tải lại": lưu, bảo worker mới kích hoạt; main.js tải lại khi controllerchange. Không làm giữa ca.
  app.applyUpdate = () => {
    if (app.router.name === 'service' || (app.state && app.state.shift)) return false
    app.saveNow()
    pwa.reloading = true
    const w = pwa.waiting
    if (w) {
      try { w.postMessage({ type: 'SKIP_WAITING' }) } catch { /* bỏ qua */ }
      setTimeout(() => location.reload(), 4000)   // phòng khi controllerchange không tới
    } else {
      location.reload()
    }
    return true
  }
  // Ô chứa nút "Có bản mới – Tải lại" (màn Chuẩn bị, Tổng kết): tự hiện khi có bản mới, kể cả khi đang mở màn.
  const updateSlots = new Set()
  const fillSlot = slot => {
    slot.textContent = ''
    if (!pwa.updateReady) return
    slot.appendChild(h('div', { class: 'update-card', testid: 'update-ready', role: 'status' },
      h('span', { class: 'update-text' }, h('b', null, 'Có bản mới'), h('small', null, 'Tải lại để dùng bản mới nhất. Tiến trình giữ nguyên.')),
      h('button', {
        class: 'btn btn-primary btn-small', type: 'button', testid: 'update-reload',
        onclick: e => { e.currentTarget.disabled = true; app.sound('click'); app.applyUpdate() }
      }, 'Tải lại')))
  }
  app.onPwaChange(() => {
    for (const slot of updateSlots) {
      if (slot.isConnected) fillSlot(slot)
      else updateSlots.delete(slot)
    }
  })
  app.updateSlot = () => {
    // màn vẽ lại thì ô cũ đã rời trang: bỏ khỏi danh sách
    for (const old of updateSlots) if (!old.isConnected) updateSlots.delete(old)
    const slot = h('div', { class: 'update-slot' })
    fillSlot(slot)
    updateSlots.add(slot)
    return slot
  }
  // Cách cài game trên máy này: 'installed' | 'prompt' (có hộp cài của trình duyệt) | 'ios' (Chia sẻ → Thêm vào
  // Màn hình chính) | 'manual' (menu trình duyệt).
  app.installMode = () => {
    if (pwa.installed || isStandalone()) return 'installed'
    if (pwa.installPrompt) return 'prompt'
    if (isIOS()) return 'ios'
    return 'manual'
  }
  // Mở hộp cài của trình duyệt → 'accepted' | 'dismissed' | 'unavailable'.
  app.promptInstall = async () => {
    const ev = pwa.installPrompt
    if (!ev || typeof ev.prompt !== 'function') return 'unavailable'
    app.setPwa({ installPrompt: null })
    try {
      await ev.prompt()
      const choice = await ev.userChoice
      const outcome = (choice && choice.outcome) || 'dismissed'
      if (outcome === 'accepted') app.setPwa({ installed: true })
      return outcome
    } catch {
      return 'unavailable'
    }
  }

  // Thẻ Mẹo nghề: lõi đã ghi tipsSeen và giới hạn 1 thẻ/ca; ở đây chỉ hiện thông báo 3 giây.
  bus.on('tip.unlocked', ({ tipId } = {}) => {
    const tips = Array.isArray(DATA.TIPS) ? DATA.TIPS : Object.values(DATA.TIPS || {})
    const tip = tips.find(t => t.id === tipId)
    if (!tip) return
    // thẻ mở lúc kết ca hiện trong mục "Mẹo của Dì Sáu" của màn Tổng kết, không nổi đè lên tiêu đề;
    // tắt công tắc "Mẹo nghề": thẻ vẫn vào Sổ tay nghề nhưng không nổi lên trong ca
    if (tip.trigger === 'shift_end' || app.settings().tips === false) { app.save(); return }
    // hướng dẫn lần đầu đang hiện (hoặc hiện ở khung hình kế — thẻ thường mở bởi chính thao tác chuyển khâu): toaster giữ
    // thẻ, đồng hồ 3 giây chỉ chạy khi thẻ thật sự nổi, không chồng lên bong bóng của Dì Sáu (tour gọi app.toastHold)
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
  // history.back() chạy KHÔNG đồng bộ: trong lúc lùi (ignore > 0) mà người chơi đã mở màn con khác thì chưa đẩy
  // mục mới (đẩy chen vào sẽ lệch sổ: lần lùi đang chờ rơi vào mục vừa đẩy, lần sau lùi ra khỏi trang). Ghi lại màn
  // muốn có (`want`) và đẩy khi popstate của lần lùi về tới (hoặc sau `BACK_SETTLE_MS` nếu trình duyệt không báo).
  const BACK_SETTLE_MS = 1500
  const hist = { pushed: false, ignore: 0, want: false, timer: 0 }
  function canHistory() {
    return typeof history !== 'undefined' && typeof history.pushState === 'function'
  }
  function pushEntry(name) {
    try { history.pushState({ bkn: name }, ''); hist.pushed = true } catch { /* bỏ qua */ }
  }
  // lần lùi đã xong: đẩy mục cho màn con đang mở (nếu trong lúc chờ người chơi đã vào màn con)
  function settleBack() {
    clearTimeout(hist.timer)
    hist.timer = 0
    const want = hist.want
    hist.want = false
    const name = app.router && app.router.name
    if (want && isSubScreen(name) && !hist.pushed) pushEntry(name)
  }
  function syncHistory(name) {
    if (!canHistory()) return
    const sub = isSubScreen(name)
    if (hist.ignore > 0) { hist.want = sub; return }
    if (sub && !hist.pushed) pushEntry(name)
    else if (!sub && hist.pushed) {
      hist.pushed = false
      hist.ignore += 1
      try {
        history.back()
        hist.timer = setTimeout(() => { hist.ignore = 0; settleBack() }, BACK_SETTLE_MS)
      } catch { hist.ignore -= 1 }
    }
  }
  window.addEventListener('popstate', () => {
    if (hist.ignore > 0) {
      hist.ignore -= 1
      if (hist.ignore === 0) settleBack()
      return
    }
    hist.pushed = false
    const name = app.router && app.router.name
    if (!isSubScreen(name) || app.locked) return
    // hướng dẫn lần đầu đang hiện: Back đóng hướng dẫn (như "Bỏ qua hướng dẫn"), ở lại màn
    if (app.tour && app.tour.isActive()) {
      pushEntry(name)
      app.tour.skip()
      return
    }
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

// Khung app cao bằng khung nhìn động (CSS 100dvh): mọi lớp phủ, bảng trượt cao tối đa bằng khung này. Trình duyệt chưa hiểu
// dvh (iOS Safari trước 15.4) lấy 100vh, cao hơn phần nhìn thấy (tính cả chỗ thanh công cụ Safari) nên đáy khung — thanh
// tab, nút của bảng trượt — nằm dưới thanh công cụ. Khi đó đo chiều cao phần nhìn thấy (innerHeight, đổi theo thanh công
// cụ) gắn vào biến --app-h (lớp .is-fit-h của base.css), đo lại khi xoay máy, đổi cỡ.
function fitFrameHeight(root) {
  if (typeof window === 'undefined' || !root) return
  try {
    if (window.CSS && typeof CSS.supports === 'function' && CSS.supports('height', '100dvh')) return
  } catch { /* đo bằng JS */ }
  const fit = () => {
    const hgt = window.innerHeight
    if (hgt > 0) root.style.setProperty('--app-h', Math.round(hgt) + 'px')
  }
  fit()
  root.classList.add('is-fit-h')
  window.addEventListener('resize', fit)
  window.addEventListener('orientationchange', () => setTimeout(fit, 250))
}

// Đang chạy như ứng dụng đã cài (màn hình chính, không thanh địa chỉ).
export function isStandalone() {
  try {
    if (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) return true
  } catch { /* bỏ qua */ }
  return typeof navigator !== 'undefined' && navigator.standalone === true
}

// iPhone/iPad (Safari không có hộp cài: hướng dẫn Chia sẻ → Thêm vào Màn hình chính).
export function isIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
