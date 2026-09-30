// Khởi động game: nạp save, tạo app, router, vòng lặp; đăng ký service worker (chơi offline, cài game).
import { DATA } from './data/index.js'
import { loadFrom, archiveUnreadable, DEV_KEYS } from './core/save.js'
import { defaultState } from './core/state.js'
import { parseDevNow, makeNowInfo } from './core/clock.js'
import { attachMeta, refreshMeta } from './core/meta.js'
import { createApp } from './ui/app.js'
import { createLoop } from './ui/loop.js'
import title from './ui/screens/title.js'
import prep from './ui/screens/prep.js'
import service from './ui/screens/service.js'
import summary from './ui/screens/summary.js'
import shop from './ui/screens/shop.js'
import tasting from './ui/screens/tasting.js'
import quests from './ui/screens/quests.js'
import mailbox from './ui/screens/mailbox.js'
import event from './ui/screens/event.js'
import stageUp from './ui/screens/stage-up.js'
import settings, { copyBackup } from './ui/screens/settings.js'
import { formatVND } from './ui/format.js'
import { DI_SAU } from './ui/art.js'
import notebook from './ui/screens/notebook.js'
import recipeBook from './ui/screens/recipe-book.js'

// Bảng màn (tên dùng trong app.go → module màn). Thêm màn mới: import rồi thêm một dòng ở đây
// (và thêm tệp vào PRECACHE của sw.js). Màn không phải 'title'/'prep' tự là màn con (Back → Chuẩn bị).
const SCREENS = Object.freeze({
  title, prep, service, summary, shop, tasting, quests, mailbox, event, 'stage-up': stageUp, settings,
  // M3 nội dung: Sổ tay nghề, Sổ công thức
  notebook, 'recipe-book': recipeBook
})

function getStorage() {
  try {
    const s = window.localStorage
    const k = 'bkn.probe'
    s.setItem(k, '1')
    s.removeItem(k)
    return s
  } catch {
    return null
  }
}

function randomSeed() {
  try {
    const a = new Uint32Array(1)
    crypto.getRandomValues(a)
    return a[0] >>> 0
  } catch {
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
  }
}

// 'DD/MM HH:mm' giờ Việt Nam của mốc giờ giả.
function devLabel(ms) {
  const d = new Date(ms + 7 * 3600 * 1000).toISOString()
  return `${d.slice(8, 10)}/${d.slice(5, 7)} ${d.slice(11, 16)}`
}

function boot() {
  const root = document.getElementById('app')
  const bootMsg = document.getElementById('boot')
  if (bootMsg) bootMsg.remove()
  const storage = getStorage()
  // ?devNow=YYYY-MM-DDTHH:mm (giờ Việt Nam, chỉ trên localhost/127.0.0.1): xem trước sự kiện; đồng hồ vẫn chạy tiếp từ mốc đó.
  const devNow = parseDevNow(location.search, location.hostname)
  const bootAt = Date.now()
  const now = devNow !== null ? () => devNow + (Date.now() - bootAt) : () => Date.now()
  // Giờ giả ghi mốc tương lai vào save (clock.maxSeen, ngày điểm danh, Việc hôm nay…): lưu ở khóa riêng để
  // save thật không bị khóa lùi giờ khi mở lại bình thường. Lần đầu xem trước thì chép từ save thật.
  const saveKeys = devNow !== null ? DEV_KEYS : null
  const devBanner = devNow !== null ? `Giờ giả ${devLabel(devNow)} · bản lưu riêng` : ''
  const app = createApp({ root, storage, now, saveKeys, devBanner, screens: SCREENS })

  // Dải/hộp thoại "Chưa lưu được tiến trình": nút Sao lưu mở mã sao lưu để chép tay.
  app.openBackup = () => { copyBackup(app).catch(err => console.error(err)) }
  if (!storage) app.setSaveProblem('chan')

  const params = new URLSearchParams(location.search)
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname)
  const report = {}
  let state = storage ? loadFrom(storage, DATA, { keys: saveKeys, report }) : null
  if (!state && storage && saveKeys) state = loadFrom(storage, DATA, { report })
  // Bản lưu không đọc được (sai checksum, định dạng lạ…) ở khóa sắp ghi: CẤT nguyên chuỗi sang '<khóa>.hong.<ms>'
  // trước lần ghi đầu tiên, không ghi đè im lặng. Cất lỗi (bộ nhớ đầy) → tạm không lưu để khỏi đè lên bản cũ.
  let broken = []
  if (storage) {
    const r = archiveUnreadable(storage, Date.now(), DATA, { keys: saveKeys })
    broken = r.archived
    if (!r.ok) app.setSaveProblem('loi_cat', { block: true })
  }
  if (!state) {
    // ?seed=N chỉ có tác dụng khi chưa có save.
    const raw = params.get('seed')
    const seed = raw !== null && /^\d+$/.test(raw) ? (Number(raw) >>> 0) : randomSeed()
    state = defaultState(seed, DATA)
  }
  // ?test=1 (chỉ trên máy cục bộ): bật Hỗ trợ thao tác cho kiểm thử tự động.
  if (params.get('test') === '1' && isLocal) state.settings.assistMotion = true
  app.state = state
  // M3: mốc nhắc sao lưu (save mới hoặc save cũ lần đầu mở ở bản có sao lưu)
  if (!state.backup || !state.backup.since) state.backup = { ...(state.backup || { lastAt: 0 }), since: app.now() }
  // M2: hệ thống meta nghe bus (nhiệm vụ, chuỗi, Tem, stats) và cập nhật theo ngày thật khi mở game
  attachMeta(app.bus, () => app.state, app.ctx)
  try {
    const res = refreshMeta(state, makeNowInfo(state, app.now()), app.ctx)
    // thư mới lúc mở game (vd thư chào mừng lần đầu): màn Chuẩn bị báo nhẹ, không chặn
    app.session.pendingMail = res.newMail.slice()
    // việc sự kiện hôm trước tự nhận lúc mở game: màn Chuẩn bị báo
    app.session.pendingEventAuto = (res.eventQuestsAuto || []).slice()
  } catch (err) { console.error(err) }
  // Ca đang dở mở ở phiên bản game khác (bản mới tự kích hoạt khi đóng hết tab rồi mở lại): ca vẫn đủ cấu trúc nên
  // chơi tiếp được; ghi nhận phiên bản mới và báo nhẹ.
  let versionNote = ''
  if (state.shift && state.shift.appVersion !== app.version) {
    if (state.shift.appVersion) versionNote = `Game vừa lên phiên bản ${app.version}. Ca đang bán vẫn giữ nguyên, bán tiếp nhé.`
    state.shift.appVersion = app.version
  }
  app.applySettings()
  app.saveNow()

  const loop = createLoop(app, {
    getScreen: () => app.router.current,
    shouldAdvance: () => app.router.name === 'service' && !app.modalBlocking() && !app.locked
  })
  app.go(state.shift ? 'service' : 'title')
  loop.start()
  setupPwa(app)
  bootNotices(app, { report, broken, versionNote })
}

// Báo người chơi những gì xảy ra với bản lưu lúc mở game (không im lặng): bản hỏng đã cất lại, ca dở không mở lại
// được (đã hoàn giá vốn), phiên bản mới giữa ca.
function bootNotices(app, { report, broken, versionNote }) {
  const notes = []
  if (report.shiftDropped) {
    const d = report.shiftDropped
    notes.push(`Ca đang bán dở (ngày ${d.day}) không mở lại được sau khi game cập nhật nên được hủy.` +
      (d.refund > 0 ? ` Giá vốn đã bỏ ra trong ca được hoàn ${formatVND(d.refund)} vào Tiền quán.` : '') + ` Bạn bán lại ngày ${app.state.day} nhé.`)
  }
  if (broken.length) {
    // nạp được bản chính thì bản dự phòng hỏng không ảnh hưởng gì (đã cất lại, không cần báo)
    if (!report.from) notes.push('Bản lưu cũ trong máy không đọc được (có thể do lỗi ghi hoặc của bản game khác) nên game bắt đầu bản mới. Bản cũ đã được cất lại trong máy, không bị xóa.')
    else if (report.from === app.saveKeys.backup) notes.push('Bản lưu chính bị hỏng nên game mở bản dự phòng (lưu lúc hết ca gần nhất). Bản hỏng đã được cất lại trong máy, không bị xóa.')
  }
  if (notes.length) {
    app.modal({
      title: 'Về bản lưu của bạn', icon: DI_SAU.lo, testid: 'save-notice', dismissible: true,
      text: notes.join(' '), actions: [{ label: 'Đã hiểu', value: true, testid: 'save-notice-ok' }]
    })
  } else if (versionNote) {
    app.toast(versionNote, { kind: 'info', duration: 4000, testid: 'version-toast' })
  }
}

// ---------- PWA: service worker, bản mới, cài game, lưu trữ bền vững ----------
function setupPwa(app) {
  // Cài game: trình duyệt báo có thể cài → hoãn lại, nút "Cài game" trong Cài đặt mở hộp cài.
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    app.setPwa({ installPrompt: e })
  })
  window.addEventListener('appinstalled', () => app.setPwa({ installed: true, installPrompt: null }))

  // Xin lưu trữ bền vững (trình duyệt ít tự dọn dữ liệu game) sau thao tác đầu tiên của người chơi.
  const askPersist = () => {
    window.removeEventListener('pointerdown', askPersist, true)
    try {
      const st = navigator.storage
      if (!st || typeof st.persist !== 'function') return
      const check = typeof st.persisted === 'function' ? st.persisted() : Promise.resolve(false)
      check.then(done => (done ? true : st.persist())).catch(() => {})
    } catch { /* bỏ qua */ }
  }
  window.addEventListener('pointerdown', askPersist, true)

  // Service worker: không đăng ký khi mở trực tiếp tệp (file://) hoặc trình duyệt không hỗ trợ.
  if (location.protocol === 'file:' || !('serviceWorker' in navigator)) return
  const sw = navigator.serviceWorker
  sw.addEventListener('controllerchange', () => {
    // chỉ tải lại khi người chơi đã bấm "Tải lại" (lần cài đầu tiên cũng đổi controller nhưng không tải lại)
    if (app.pwa.reloading) location.reload()
  })
  sw.register('./sw.js').then(reg => {
    const watch = worker => {
      if (!worker) return
      const onState = () => {
        if (worker.state === 'installed' && sw.controller) app.setUpdateReady(worker)
        if (worker.state === 'activated') app.setPwa({ offlineReady: true })
      }
      worker.addEventListener('statechange', onState)
      onState()
    }
    // bản mới đã tải xong từ lần mở trước, đang chờ
    if (reg.waiting && sw.controller) app.setUpdateReady(reg.waiting)
    if (reg.active) app.setPwa({ offlineReady: true })
    watch(reg.installing)
    reg.addEventListener('updatefound', () => watch(reg.installing))
    // kiểm tra bản mới khi quay lại game (tối đa mỗi 30 phút)
    let lastCheck = Date.now()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastCheck < 30 * 60 * 1000) return
      lastCheck = Date.now()
      reg.update().catch(() => {})
    })
  }).catch(() => { /* không đăng ký được (vd chế độ riêng tư): game vẫn chơi online bình thường */ })
}

boot()
