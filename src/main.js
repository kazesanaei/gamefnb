// Khởi động game: nạp save, tạo app, router, vòng lặp.
import { DATA } from './data/index.js'
import { loadFrom } from './core/save.js'
import { defaultState } from './core/state.js'
import { trustedNow } from './core/clock.js'
import { createApp } from './ui/app.js'
import { createLoop } from './ui/loop.js'
import title from './ui/screens/title.js'
import prep from './ui/screens/prep.js'
import service from './ui/screens/service.js'
import summary from './ui/screens/summary.js'

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
  const app = createApp({ root, storage, now: () => Date.now(), screens: { title, prep, service, summary } })

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
  try { trustedNow(state, app.now()) } catch { /* bỏ qua */ }
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
