// PWA (M3): danh sách PRECACHE của sw.js khớp cây thư mục thật (thiếu hay thừa đều hỏng), VERSION trùng package.json,
// manifest hợp lệ (tên, màu, biểu tượng 192/512 + maskable đúng kích thước), index.html gắn manifest và mọi CSS,
// mọi import tương đối trong src/ trỏ tới tệp có trong PRECACHE; chạy thử service worker trong môi trường giả:
// cài → lưu đủ tệp, kích hoạt → dọn cache bản cũ, mất mạng vẫn trả tệp (bỏ qua ?devNow/?test khi so khóa).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { pngSize } from '../../tools/make-icons.mjs'
import { ROOT_SCREENS, isSubScreen, createRouter } from '../../src/ui/router.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8')

function walk(dir, filter) {
  const out = []
  const abs = path.join(ROOT, dir)
  if (!existsSync(abs)) return out
  for (const name of readdirSync(abs).sort()) {
    const rel = dir + '/' + name
    const st = statSync(path.join(ROOT, rel))
    if (st.isDirectory()) out.push(...walk(rel, filter))
    else if (filter(name)) out.push(rel)
  }
  return out
}

// Tệp phải có trong PRECACHE: trang, manifest, mọi .js trong src/, mọi .css trong css/, mọi tệp trong icons/.
function expectedFiles() {
  return [
    'index.html', 'manifest.webmanifest',
    ...walk('src', n => n.endsWith('.js')),
    ...walk('css', n => n.endsWith('.css')),
    ...walk('icons', n => !n.startsWith('.'))
  ].sort()
}

// Chạy sw.js trong môi trường giả (Node vm): trả { ctx, listeners, store, calls }.
function loadServiceWorker({ origin = 'https://bep.example', offline = { on: false } } = {}) {
  const listeners = {}
  const store = new Map()              // tên cache → Map(url → { body, type })
  const calls = { fetch: [], skipWaiting: 0, claim: 0 }
  const base = origin + '/sw.js'
  const urlOf = r => new URL(typeof r === 'string' ? r : r.url, base)
  const makeResponse = (body, status = 200) => {
    const res = new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    Object.defineProperty(res, 'type', { value: 'basic' })
    return res
  }
  const fakeFetch = async (req) => {
    const u = urlOf(req)
    calls.fetch.push(u.pathname + u.search)
    if (offline.on) throw new TypeError('Mất mạng')
    if (u.origin !== origin) return makeResponse('ngoài', 200)
    const rel = u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname.slice(1))
    const file = path.join(ROOT, rel)
    if (!existsSync(file) || !statSync(file).isFile()) return makeResponse('Không tìm thấy', 404)
    return makeResponse(readFileSync(file))
  }
  const cacheApi = name => {
    if (!store.has(name)) store.set(name, new Map())
    const map = store.get(name)
    return {
      async addAll(reqs) {
        for (const r of reqs) {
          const res = await fakeFetch(r)
          if (!res.ok) throw new TypeError('addAll: ' + urlOf(r).pathname + ' ' + res.status)
          map.set(urlOf(r).href, await res.clone().arrayBuffer())
        }
      },
      async put(req, res) { map.set(urlOf(req).href, await res.clone().arrayBuffer()) },
      async match(req, opts = {}) {
        const u = urlOf(req)
        for (const [k, body] of map) {
          const ku = new URL(k)
          const same = opts.ignoreSearch ? ku.origin + ku.pathname === u.origin + u.pathname : ku.href === u.href
          if (same) return makeResponse(body)
        }
        return undefined
      }
    }
  }
  const caches = {
    async open(name) { return cacheApi(name) },
    async keys() { return [...store.keys()] },
    async delete(name) { return store.delete(name) }
  }
  class SwRequest extends Request {
    constructor(input, init) { super(typeof input === 'string' ? new URL(input, base).href : input, init) }
  }
  const self = {
    location: new URL(base),
    addEventListener(type, fn) { listeners[type] = fn },
    skipWaiting() { calls.skipWaiting++; return Promise.resolve() },
    clients: { claim() { calls.claim++; return Promise.resolve() } }
  }
  const ctx = vm.createContext({ self, caches, fetch: fakeFetch, Request: SwRequest, Response, URL, Promise, console })
  vm.runInContext(read('sw.js'), ctx, { filename: 'sw.js' })
  return { ctx, listeners, store, calls, offline, origin }
}

// Gửi một sự kiện có waitUntil/respondWith; trả { handled, response, waits }.
async function dispatch(sw, type, init = {}) {
  const waits = []
  let responded = null
  const ev = { ...init, waitUntil(p) { waits.push(Promise.resolve(p)) }, respondWith(p) { responded = Promise.resolve(p) } }
  sw.listeners[type](ev)
  const response = responded ? await responded : null
  await Promise.all(waits)
  return { handled: !!responded, response, waits }
}

// Danh sách PRECACHE (chép sang mảng của realm này để so sánh chặt).
const precacheOf = sw => JSON.parse(JSON.stringify(vm.runInContext('PRECACHE', sw.ctx)))

const fetchEvent = (sw, pathAndQuery, extra = {}) => ({ request: { url: sw.origin + pathAndQuery, method: 'GET', mode: 'cors', ...extra } })

// ---------- Danh sách tệp ----------

test('PRECACHE của sw.js khớp đúng cây thư mục thật (thiếu hay thừa đều hỏng), không trùng', () => {
  const sw = loadServiceWorker()
  const list = precacheOf(sw)
  assert.ok(Array.isArray(list) && list.length > 50)
  assert.equal(new Set(list).size, list.length, 'PRECACHE có tệp trùng')
  const exp = expectedFiles()
  const missing = exp.filter(f => !list.includes(f))
  const extra = list.filter(f => !exp.includes(f))
  assert.deepEqual(missing, [], 'PRECACHE thiếu tệp:\n' + missing.join('\n'))
  assert.deepEqual(extra, [], 'PRECACHE thừa tệp (không có trong cây thư mục):\n' + extra.join('\n'))
  for (const f of list) assert.ok(!f.startsWith('/') && !f.startsWith('.'), 'đường dẫn phải tương đối: ' + f)
  // biểu tượng bắt buộc
  for (const f of ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png']) assert.ok(list.includes(f), f)
})

test('VERSION của sw.js và APP_VERSION trùng "version" trong package.json', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/)
  const sw = loadServiceWorker()
  assert.equal(vm.runInContext('VERSION', sw.ctx), pkg.version)
  assert.equal(vm.runInContext('CACHE', sw.ctx), 'bkn-' + pkg.version)
  const m = /export const APP_VERSION = '([^']+)'/.exec(read('src/ui/app.js'))
  assert.ok(m, 'thiếu APP_VERSION trong src/ui/app.js')
  assert.equal(m[1], pkg.version)
})

test('mọi import tương đối trong src/ trỏ tới tệp có thật và có trong PRECACHE (chơi offline đủ module)', () => {
  const sw = loadServiceWorker()
  const list = new Set(precacheOf(sw))
  const bad = []
  for (const file of walk('src', n => n.endsWith('.js'))) {
    const text = read(file)
    const re = /(?:import|export)\s[^'"`;]*?from\s*['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)|import\s*['"](\.[^'"]+)['"]/g
    let m
    while ((m = re.exec(text))) {
      const spec = m[1] || m[2] || m[3]
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec))
      if (!list.has(target) || !existsSync(path.join(ROOT, target))) bad.push(`${file} → ${spec}`)
    }
  }
  assert.deepEqual(bad, [], 'import trỏ tới tệp không có trong PRECACHE:\n' + bad.join('\n'))
  // trang tải src/main.js
  assert.match(read('index.html'), /<script type="module" src="src\/main\.js"><\/script>/)
})

// ---------- Manifest, trang ----------

test('manifest: tên, chế độ, màu theo bảng màu, biểu tượng 192/512 + maskable đúng kích thước', () => {
  const man = JSON.parse(read('manifest.webmanifest'))
  assert.equal(man.name, 'Bếp Khởi Nghiệp')
  assert.equal(man.short_name, 'Bếp KN')
  assert.equal(man.display, 'standalone')
  assert.equal(man.orientation, 'portrait')
  assert.equal(man.start_url, './')
  assert.equal(man.scope, './')
  const css = read('css/base.css')
  const color = name => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(css)[1].toLowerCase()
  assert.equal(man.theme_color.toLowerCase(), color('brick'), 'theme_color = đỏ gạch')
  assert.equal(man.background_color.toLowerCase(), color('bg'), 'background_color = nền kem')
  const meta = /<meta name="theme-color" content="(#[0-9a-f]{6})">/i.exec(read('index.html'))
  assert.equal(meta[1].toLowerCase(), man.theme_color.toLowerCase())
  const icons = man.icons
  const has = (size, purpose) => icons.some(i => i.sizes === size && i.type === 'image/png' && (i.purpose || 'any').split(' ').includes(purpose))
  assert.ok(has('192x192', 'any'))
  assert.ok(has('512x512', 'any'))
  assert.ok(has('512x512', 'maskable'))
  for (const ic of icons) {
    const file = path.join(ROOT, ic.src)
    assert.ok(existsSync(file), 'thiếu tệp biểu tượng ' + ic.src)
    if (ic.type === 'image/png') {
      const dim = pngSize(readFileSync(file))
      assert.ok(dim, ic.src + ' không phải PNG')
      assert.equal(`${dim.width}x${dim.height}`, ic.sizes, ic.src + ' sai kích thước khai báo')
    }
  }
  const apple = pngSize(readFileSync(path.join(ROOT, 'icons/apple-touch-icon.png')))
  assert.deepEqual(apple, { width: 180, height: 180 })
})

test('index.html gắn manifest, biểu tượng và mọi tệp CSS', () => {
  const html = read('index.html')
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/)
  assert.match(html, /<link rel="apple-touch-icon" href="icons\/apple-touch-icon\.png">/)
  assert.match(html, /<link rel="icon" href="icons\/icon\.svg"/)
  for (const css of walk('css', n => n.endsWith('.css'))) assert.ok(html.includes(`<link rel="stylesheet" href="${css}">`), 'index.html chưa gắn ' + css)
  // không dùng thẻ meta cũ mà Chrome báo cảnh báo trên console
  assert.ok(!html.includes('apple-mobile-web-app-capable'))
})

test('main.js đăng ký service worker (trừ file://) và gắn màn Cài đặt', () => {
  const main = read('src/main.js')
  assert.match(main, /register\('\.\/sw\.js'\)/)
  assert.match(main, /location\.protocol === 'file:'/)
  assert.match(main, /settings\b/)
  assert.match(main, /beforeinstallprompt/)
  assert.match(main, /storage\.persist|st\.persist\(\)/)
})

// ---------- Chạy thử service worker ----------

test('service worker: cài lưu đủ PRECACHE, không tự kích hoạt; SKIP_WAITING mới kích hoạt', async () => {
  const sw = loadServiceWorker()
  const list = precacheOf(sw)
  await dispatch(sw, 'install')
  const cache = sw.store.get('bkn-' + JSON.parse(read('package.json')).version)
  assert.ok(cache, 'chưa tạo cache phiên bản')
  assert.equal(cache.size, list.length)
  for (const f of list) assert.ok(cache.has(sw.origin + '/' + f), 'chưa lưu ' + f)
  assert.equal(sw.calls.skipWaiting, 0, 'bản mới không được tự kích hoạt giữa chừng')
  sw.listeners.message({ data: { type: 'SKIP_WAITING' } })
  assert.equal(sw.calls.skipWaiting, 1)
})

test('service worker: kích hoạt dọn cache bản cũ của game, giữ cache khác, nhận quyền điều khiển', async () => {
  const sw = loadServiceWorker()
  sw.store.set('bkn-0.2.0', new Map())
  sw.store.set('bkn-0.1.0', new Map())
  sw.store.set('cache-khac', new Map())
  await dispatch(sw, 'install')
  await dispatch(sw, 'activate')
  const keys = [...sw.store.keys()].sort()
  assert.deepEqual(keys, ['bkn-' + JSON.parse(read('package.json')).version, 'cache-khac'])
  assert.equal(sw.calls.claim, 1)
})

test('service worker: mất mạng vẫn mở trang và tải module (cache trước, bỏ qua ?devNow/?test khi so khóa)', async () => {
  const sw = loadServiceWorker()
  await dispatch(sw, 'install')
  await dispatch(sw, 'activate')
  sw.offline.on = true
  const before = sw.calls.fetch.length
  // mở trang có query giờ giả / kiểm thử
  const nav = await dispatch(sw, 'fetch', fetchEvent(sw, '/?devNow=2026-11-13T09:00&test=1', { mode: 'navigate' }))
  assert.ok(nav.handled)
  assert.equal(nav.response.status, 200)
  assert.match(await nav.response.text(), /<title>Bếp Khởi Nghiệp<\/title>/)
  // module và CSS (có query vẫn khớp)
  const js = await dispatch(sw, 'fetch', fetchEvent(sw, '/src/main.js'))
  assert.match(await js.response.text(), /function boot\(\)/)
  const css = await dispatch(sw, 'fetch', fetchEvent(sw, '/css/base.css?v=2'))
  assert.match(await css.response.text(), /--brick/)
  const icon = await dispatch(sw, 'fetch', fetchEvent(sw, '/icons/icon-192.png'))
  assert.deepEqual(pngSize(Buffer.from(await icon.response.arrayBuffer())), { width: 192, height: 192 })
  // không phải ở máy cục bộ: không tải lại nền → không gọi mạng lần nào
  assert.equal(sw.calls.fetch.length, before, 'cache-first: có tệp trong cache thì không gọi mạng')
})

test('service worker: bỏ qua yêu cầu khác nguồn và không phải GET; tệp lạ lấy từ mạng', async () => {
  const sw = loadServiceWorker()
  await dispatch(sw, 'install')
  const cross = await dispatch(sw, 'fetch', { request: { url: 'https://cdn.example/x.js', method: 'GET', mode: 'cors' } })
  assert.equal(cross.handled, false)
  const post = await dispatch(sw, 'fetch', fetchEvent(sw, '/api', { method: 'POST' }))
  assert.equal(post.handled, false)
  const n = sw.calls.fetch.length
  const pkg = await dispatch(sw, 'fetch', fetchEvent(sw, '/package.json'))
  assert.equal(pkg.response.status, 200)
  assert.equal(sw.calls.fetch.length, n + 1, 'tệp ngoài PRECACHE phải lấy từ mạng')
  assert.equal(sw.store.get('bkn-' + JSON.parse(read('package.json')).version).has(sw.origin + '/package.json'), false, 'không cất tệp ngoài game')
})

test('service worker ở máy cục bộ: trả cache trước rồi tải lại nền (thấy code mới ở lần mở sau)', async () => {
  const sw = loadServiceWorker({ origin: 'http://127.0.0.1:8080' })
  assert.equal(vm.runInContext('LOCAL_DEV', sw.ctx), true)
  await dispatch(sw, 'install')
  const n = sw.calls.fetch.length
  const r = await dispatch(sw, 'fetch', fetchEvent(sw, '/src/ui/app.js'))
  assert.equal(r.response.status, 200)
  assert.equal(sw.calls.fetch.length, n + 1, 'tải lại nền 1 lần')
})

// ---------- Router: màn con tự động ----------

test('router: màn không phải màn gốc tự là màn con (Back → Chuẩn bị); đăng ký thêm màn lúc chạy', () => {
  assert.deepEqual([...ROOT_SCREENS], ['title', 'prep'])
  for (const n of ['settings', 'shop', 'service', 'summary', 'recipe-book', 'notebook']) assert.equal(isSubScreen(n), true, n)
  for (const n of ['title', 'prep', '', null]) assert.equal(isSubScreen(n), false, String(n))
  const root = { textContent: 'x', dataset: {}, scrollTop: 5 }
  const log = []
  const mk = name => ({ mount(r, app, params) { log.push(['mount', name, params]); return { unmount() { log.push(['unmount', name]) } } } })
  const router = createRouter(root, {}, { title: mk('title') })
  router.register('notebook', mk('notebook'))
  assert.equal(router.has('notebook'), true)
  assert.deepEqual(router.names().sort(), ['notebook', 'title'])
  router.go('title')
  router.go('notebook', { tab: 'quay' })
  assert.equal(router.name, 'notebook')
  assert.equal(root.dataset.screen, 'notebook')
  assert.deepEqual(log, [['mount', 'title', {}], ['unmount', 'title'], ['mount', 'notebook', { tab: 'quay' }]])
  assert.throws(() => router.go('khong_co'))
  assert.throws(() => router.register('hong', {}))
})
