// Khởi động game: nạp save, tạo app, router, vòng lặp.
import { DATA } from './data/index.js'
import { loadFrom } from './core/save.js'
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

function boot() {
  const root = document.getElementById('app')
  const bootMsg = document.getElementById('boot')
  if (bootMsg) bootMsg.remove()
  const storage = getStorage()
  // ?devNow=YYYY-MM-DDTHH:mm (giờ Việt Nam, chỉ trên localhost/127.0.0.1): xem trước sự kiện; đồng hồ vẫn chạy tiếp từ mốc đó.
  const devNow = parseDevNow(location.search, location.hostname)
  const bootAt = Date.now()
  const now = devNow !== null ? () => devNow + (Date.now() - bootAt) : () => Date.now()
  const app = createApp({ root, storage, now, screens: { title, prep, service, summary, shop, tasting, quests, mailbox, event, 'stage-up': stageUp } })

  const params = new URLSearchParams(location.search)
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname)
  let state = storage ? loadFrom(storage, DATA) : null
  if (!state) {
    // ?seed=N chỉ có tác dụng khi chưa có save.
    const raw = params.get('seed')
    const seed = raw !== null && /^\d+$/.test(raw) ? (Number(raw) >>> 0) : randomSeed()
    state = defaultState(seed, DATA)
  }
  // ?test=1 (chỉ trên máy cục bộ): bật Hỗ trợ thao tác cho kiểm thử tự động.
  if (params.get('test') === '1' && isLocal) state.settings.assistMotion = true
  app.state = state
  // M2: hệ thống meta nghe bus (nhiệm vụ, chuỗi, Tem, stats) và cập nhật theo ngày thật khi mở game
  attachMeta(app.bus, () => app.state, app.ctx)
  try {
    const res = refreshMeta(state, makeNowInfo(state, app.now()), app.ctx)
    // thư mới lúc mở game (vd thư chào mừng lần đầu): màn Chuẩn bị báo nhẹ, không chặn
    app.session.pendingMail = res.newMail.slice()
  } catch (err) { console.error(err) }
  app.applySettings()
  app.saveNow()

  const loop = createLoop(app, {
    getScreen: () => app.router.current,
    shouldAdvance: () => app.router.name === 'service' && !app.modalBlocking()
  })
  app.go(state.shift ? 'service' : 'title')
  loop.start()
}

boot()
