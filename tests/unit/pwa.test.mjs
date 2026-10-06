// PWA (M3): danh sách PRECACHE của sw.js khớp cây thư mục thật (thiếu hay thừa đều hỏng), VERSION trùng package.json,
// manifest hợp lệ (tên, màu, biểu tượng 192/512 + maskable đúng kích thước), index.html gắn manifest và mọi CSS,
// mọi import tương đối trong src/ trỏ tới tệp có trong PRECACHE; chạy thử service worker trong môi trường giả:
// cài → lưu đủ tệp, kích hoạt → dọn cache bản cũ, mất mạng vẫn trả tệp (bỏ qua ?devNow/?test khi so khóa).
// 0.4.2: PRECACHE gồm cả font tự lưu fonts/*.woff2 (không gồm fonts/OFL.txt, trang mẫu mau.html, mau/); mở trang
// (navigate) chỉ gốc scope và index.html mới trả trang game đã lưu, trang khác (mau.html) lấy từ mạng, mất mạng mới trả game.
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

// Tệp phải có trong PRECACHE: trang, manifest, mọi .js trong src/, mọi .css trong css/, mọi tệp trong icons/,
// font tự lưu fonts/*.woff2 (giấy phép fonts/OFL.txt không cần cho game chạy offline).
function expectedFiles() {
  return [
    'index.html', 'manifest.webmanifest',
    ...walk('src', n => n.endsWith('.js')),
    ...walk('css', n => n.endsWith('.css')),
    ...walk('icons', n => !n.startsWith('.')),
    ...walk('fonts', n => n.endsWith('.woff2'))
  ].sort()
}

// Chạy sw.js trong môi trường giả (Node vm): trả { ctx, listeners, store, calls }.
// basePath (vd '/gamefnb'): game nằm dưới đường dẫn con như GitHub Pages; tệp ngoài đường dẫn con trả 404.
function loadServiceWorker({ origin = 'https://bep.example', offline = { on: false }, basePath = '' } = {}) {
  const listeners = {}
  const store = new Map()              // tên cache → Map(url → { body, type })
  const calls = { fetch: [], skipWaiting: 0, claim: 0 }
  const base = origin + basePath + '/sw.js'
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
    if (!u.pathname.startsWith(basePath + '/')) return makeResponse('Không tìm thấy', 404)
    const sub = u.pathname.slice(basePath.length)
    const rel = sub === '/' ? 'index.html' : decodeURIComponent(sub.slice(1))
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
  return { ctx, listeners, store, calls, offline, origin: origin + basePath }
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
  // font tiêu đề tự lưu (chơi offline vẫn đúng chữ); trang mẫu và giấy phép font không thuộc game
  for (const f of ['fonts/baloo2-800-latin.woff2', 'fonts/baloo2-800-vi.woff2']) assert.ok(list.includes(f), f)
  for (const f of list) {
    assert.ok(f !== 'mau.html' && !f.startsWith('mau/'), 'trang mẫu không được nằm trong PRECACHE: ' + f)
    assert.ok(f !== 'fonts/OFL.txt', 'fonts/OFL.txt không cần nằm trong PRECACHE')
  }
})

test('GitHub Pages: có tệp rỗng .nojekyll ở gốc (giữ tệp tên bắt đầu bằng "_"), không cần nằm trong PRECACHE', () => {
  // Jekyll của GitHub Pages bỏ qua tệp/thư mục bắt đầu bằng "_" (vd src/ui/minigames/_util.js) → thiếu .nojekyll là hỏng game.
  const file = path.join(ROOT, '.nojekyll')
  assert.ok(existsSync(file), 'thiếu tệp .nojekyll ở gốc repo')
  assert.equal(statSync(file).size, 0, '.nojekyll phải là tệp rỗng')
  assert.ok(expectedFiles().some(f => f.split('/').some(part => part.startsWith('_'))), 'game có tệp tên bắt đầu bằng "_"')
  const list = precacheOf(loadServiceWorker())
  assert.equal(list.includes('.nojekyll'), false, '.nojekyll không phải tệp của game, không đưa vào PRECACHE')
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

// 0.5.1 (M5 Đợt 2): CSS tách khỏi tệp cũ phải nạp đúng chỗ để giữ thứ tự cascade; CSS kiểu game nạp sau CSS cũ để đè lên.
test('index.html (0.5.1): thứ tự CSS giữ cascade — tệp tách nằm ngay sau tệp gốc, CSS kiểu game sau CSS cũ, sheet.css cuối', () => {
  const html = read('index.html')
  const order = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"]+\.css)">/g)].map(m => m[1])
  assert.equal(new Set(order).size, order.length, 'mỗi tệp CSS chỉ gắn một lần')
  assert.deepEqual([...order].sort(), walk('css', n => n.endsWith('.css')), 'gắn đủ và chỉ gắn tệp có thật trong css/')
  const at = f => order.indexOf(f)
  assert.equal(order[0], 'css/base.css', 'base.css (biến, nền) nạp đầu tiên')
  // tệp tách từ game.css / kitchen.css nằm NGAY SAU tệp gốc
  assert.equal(at('css/street.css'), at('css/game.css') + 1, 'street.css ngay sau game.css')
  assert.deepEqual(order.slice(at('css/kitchen.css') + 1, at('css/kitchen.css') + 4), ['css/mg-prep.css', 'css/mg-heat.css', 'css/mg-mix.css'],
    'CSS sân khấu mini-game ngay sau kitchen.css')
  // CSS kiểu game (theme, fx) nạp sau mọi CSS cũ; Quầy mới (counter → cashier, receipt) sau theme và game.css
  for (const old of ['css/game.css', 'css/street.css', 'css/kitchen.css', 'css/meta.css', 'css/settings.css', 'css/tour.css']) {
    assert.ok(at(old) < at('css/theme.css'), `${old} phải nạp trước theme.css`)
  }
  assert.ok(at('css/theme.css') < at('css/fx.css') && at('css/fx.css') < at('css/counter.css'), 'theme.css → fx.css → counter.css')
  for (const f of ['css/cashier.css', 'css/receipt.css']) assert.ok(at(f) > at('css/counter.css'), `${f} sau counter.css`)
  // phiếu chấm / tình huống đè kiểu cũ ở game.css, meta.css: nạp cuối
  assert.equal(order.at(-1), 'css/sheet.css', 'sheet.css nạp cuối')
})

// 0.5.3 (M5 Đợt 3): meta.css là nền chung các màn ngoài ca; CSS từng màn (tách ở 0.5.2, vẽ lại ở 0.5.3) nạp NGAY SAU meta.css,
// đúng thứ tự đã kiểm khi tách (luật dùng chung như .ev-assist / .ev-grace-note của meta.css phải đứng trước luật của màn),
// rồi tới settings.css, tour.css và CSS kiểu game (theme.css…).
const SCREEN_CSS = ['css/prep.css', 'css/shop.css', 'css/quests.css', 'css/mail.css', 'css/book.css', 'css/summary.css', 'css/market.css']
test('index.html (0.5.3): meta.css nạp trước CSS các màn ngoài ca, 7 tệp màn liền sau meta.css đúng thứ tự, tất cả trước theme.css', () => {
  const order = [...read('index.html').matchAll(/<link rel="stylesheet" href="(css\/[^"]+\.css)">/g)].map(m => m[1])
  const at = f => order.indexOf(f)
  for (const f of ['css/meta.css', ...SCREEN_CSS]) assert.ok(at(f) >= 0, 'chưa gắn ' + f)
  assert.deepEqual(order.slice(at('css/meta.css') + 1, at('css/meta.css') + 1 + SCREEN_CSS.length), SCREEN_CSS,
    'CSS màn ngoài ca liền sau meta.css, đúng thứ tự prep → shop → quests → mail → book → summary → market')
  for (const f of ['css/meta.css', ...SCREEN_CSS]) {
    assert.ok(at(f) > at('css/mg-mix.css'), `${f} sau CSS bếp`)
    for (const later of ['css/settings.css', 'css/tour.css', 'css/theme.css']) assert.ok(at(f) < at(later), `${f} phải nạp trước ${later}`)
  }
  // mọi tệp CSS màn đều có trong PRECACHE (chơi offline vẫn đúng giao diện)
  const list = precacheOf(loadServiceWorker())
  for (const f of ['css/meta.css', ...SCREEN_CSS, 'src/ui/art/meta.js']) assert.ok(list.includes(f), 'PRECACHE thiếu ' + f)
})

// 0.5.3 (ráp nối Đợt 3): mặt tiền src/ui/art.js xuất lại hình meta (cùng tham chiếu với src/ui/art/meta.js), giữ mọi export
// cũ; icon() giữ hành vi, màn ngoài ca gọi metaArt(id) để lấy hình meta.
test('art.js (0.5.3): xuất lại metaArt, META_ART, EVENT_ART của art/meta.js; export cũ còn đủ; icon() giữ hành vi', async () => {
  const A = await import('../../src/ui/art.js')
  const M = await import('../../src/ui/art/meta.js')
  assert.equal(A.metaArt, M.metaArt)
  assert.equal(A.META_ART, M.META_ART)
  assert.equal(A.EVENT_ART, M.EVENT_ART)
  assert.equal(A.metaArt('ruong_dong'), M.META_ART.ruong_dong)
  assert.equal(A.metaArt('tri_an_20_11_chuoi'), M.META_ART.tri_an_20_11)
  assert.equal(A.metaArt('khong_co'), '')
  assert.ok(Object.isFrozen(A.META_ART) && Object.isFrozen(A.EVENT_ART))
  for (const k of ['icon', 'art', 'prop', 'legacyIcon', 'ICONS', 'ICONS_V2', 'LEGACY_ICONS', 'STATES', 'PROPS', 'PROP_META', 'escapeXml',
    'MOODS', 'FACES', 'face', 'headFace', 'legacyFace', 'LEGACY_FACES', 'DI_SAU', 'ANH_KHOA', 'CO_HANH', 'bust', 'head', 'BUSTS', 'HEADS',
    'PEOPLE_META', 'WHO_LOOKS', 'DI_SAU_POSES', 'DI_SAU_POSE_MOOD', 'ANH_KHOA_BUSTS', 'CO_HANH_BUSTS', 'billSvg', 'fakeQrSvg', 'scene', 'SCENE',
    'SCENE_ICONS', 'SCENE_META', 'STAGE_ICONS', 'TAB_ICONS', 'HUD_ICONS', 'phoneQr', 'phoneQrSvg', 'cartSvg', 'CART']) {
    assert.ok(k in A, 'art.js mất export ' + k)
  }
  // icon() giữ hành vi cũ (tra ICONS, tiền tố mon_, hình dự phòng)
  assert.equal(A.icon('ruong'), A.ICONS.ruong)
  assert.equal(A.icon('banh_mi_op_la'), A.ICONS.mon_banh_mi_op_la)
  assert.equal(A.icon('khong_co_hinh'), A.ICONS.fallback)
})

test('index.html (0.5.0): tải sớm font tiêu đề Latin đúng tệp CSS dùng, có crossorigin, nằm trong PRECACHE, trước CSS', () => {
  const html = read('index.html')
  const tag = '<link rel="preload" as="font" type="font/woff2" href="fonts/baloo2-800-latin.woff2" crossorigin>'
  assert.ok(html.includes(tag), 'thiếu thẻ preload font: ' + tag)
  // chỉ tải sớm một tệp (bộ dấu tiếng Việt tải theo unicode-range khi cần, tránh cảnh báo "preload chưa dùng")
  assert.equal((html.match(/rel="preload"/g) || []).length, 1)
  assert.ok(html.indexOf(tag) < html.indexOf('<link rel="stylesheet"'), 'preload đặt trước CSS')
  // cùng URL với @font-face của theme.css (khác URL thì trình duyệt tải hai lần)
  assert.match(read('css/theme.css'), /url\('\.\.\/fonts\/baloo2-800-latin\.woff2'\)/)
  assert.ok(precacheOf(loadServiceWorker()).includes('fonts/baloo2-800-latin.woff2'))
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

test('service worker dưới đường dẫn con /gamefnb/ (GitHub Pages): cài đủ tệp trong /gamefnb/, mất mạng vẫn mở trang', async () => {
  const sw = loadServiceWorker({ origin: 'https://kazesanaei.github.io', basePath: '/gamefnb' })
  assert.equal(vm.runInContext('INDEX_URL', sw.ctx), 'https://kazesanaei.github.io/gamefnb/index.html')
  const list = precacheOf(sw)
  await dispatch(sw, 'install')
  await dispatch(sw, 'activate')
  const cache = sw.store.get('bkn-' + JSON.parse(read('package.json')).version)
  assert.equal(cache.size, list.length)
  for (const k of cache.keys()) assert.ok(k.startsWith('https://kazesanaei.github.io/gamefnb/'), 'cất ngoài đường dẫn con: ' + k)
  assert.ok(sw.calls.fetch.every(p => p.startsWith('/gamefnb/')), 'tải tệp ngoài đường dẫn con: ' + sw.calls.fetch.filter(p => !p.startsWith('/gamefnb/')).join(', '))
  sw.offline.on = true
  for (const p of ['/gamefnb/', '/gamefnb/?seed=42', '/gamefnb/index.html']) {
    const nav = await dispatch(sw, 'fetch', fetchEvent(sw, p.slice('/gamefnb'.length), { mode: 'navigate' }))
    assert.equal(nav.response.status, 200, p)
    assert.match(await nav.response.text(), /<title>Bếp Khởi Nghiệp<\/title>/)
  }
  const util = await dispatch(sw, 'fetch', fetchEvent(sw, '/src/ui/minigames/_util.js'))
  assert.equal(util.response.status, 200)
  // tệp của game tải lúc chạy (chưa có trong cache) cũng được cất theo đường dẫn con
  sw.offline.on = false
  const fresh = loadServiceWorker({ origin: 'https://kazesanaei.github.io', basePath: '/gamefnb' })
  const r = await dispatch(fresh, 'fetch', fetchEvent(fresh, '/css/kitchen.css'))
  assert.equal(r.response.status, 200)
  const c2 = fresh.store.get('bkn-' + JSON.parse(read('package.json')).version)
  assert.ok(c2 && c2.has('https://kazesanaei.github.io/gamefnb/css/kitchen.css'), 'tệp của game dưới /gamefnb/ phải được cất')
})

test('service worker: mở trang khác (mau.html) khi có mạng lấy từ mạng, không bị thay bằng trang game; gốc vẫn ra game', async () => {
  for (const basePath of ['', '/gamefnb']) {
    const sw = loadServiceWorker({ origin: 'https://kazesanaei.github.io', basePath })
    await dispatch(sw, 'install')
    await dispatch(sw, 'activate')
    const n = sw.calls.fetch.length
    for (const p of ['/mau.html', '/mau.html?tab=thai', '/mau.html#ra-mon']) {
      const nav = await dispatch(sw, 'fetch', fetchEvent(sw, p, { mode: 'navigate' }))
      assert.ok(nav.handled, basePath + p)
      assert.equal(nav.response.status, 200, basePath + p)
      const text = await nav.response.text()
      assert.match(text, /<title>Bếp Khởi Nghiệp – Phòng mẫu<\/title>/, basePath + p + ': phải là trang mẫu, không phải trang game')
      assert.doesNotMatch(text, /src\/main\.js/, basePath + p)
    }
    assert.ok(sw.calls.fetch.length >= n + 3, basePath + ': trang mẫu phải lấy từ mạng')
    assert.ok(sw.calls.fetch.slice(n).every(u => u.startsWith(basePath + '/mau.html')), basePath + ': ' + sw.calls.fetch.slice(n).join(', '))
    // trang mẫu không bị cất vào cache của game
    const cache = sw.store.get('bkn-' + JSON.parse(read('package.json')).version)
    assert.ok(![...cache.keys()].some(k => k.includes('mau.html')), basePath + ': không cất mau.html')
    // gốc scope và index.html (kể cả có query) vẫn trả trang game đã lưu, không gọi mạng (không phải máy cục bộ)
    const m = sw.calls.fetch.length
    for (const p of ['/', '/?seed=42', '/index.html', '/index.html?devNow=2026-11-13T09:00']) {
      const nav = await dispatch(sw, 'fetch', fetchEvent(sw, p, { mode: 'navigate' }))
      assert.equal(nav.response.status, 200, basePath + p)
      assert.match(await nav.response.text(), /<title>Bếp Khởi Nghiệp<\/title>/, basePath + p)
    }
    assert.equal(sw.calls.fetch.length, m, basePath + ': trang game lấy từ cache')
  }
})

test('service worker: mất mạng thì mở gốc vẫn ra trang game; mở trang khác (mau.html) cũng trả trang game đã lưu', async () => {
  for (const basePath of ['', '/gamefnb']) {
    const sw = loadServiceWorker({ origin: 'https://kazesanaei.github.io', basePath })
    await dispatch(sw, 'install')
    await dispatch(sw, 'activate')
    sw.offline.on = true
    for (const p of ['/', '/?seed=7', '/index.html', '/mau.html']) {
      const nav = await dispatch(sw, 'fetch', fetchEvent(sw, p, { mode: 'navigate' }))
      assert.ok(nav.handled, basePath + p)
      assert.equal(nav.response.status, 200, basePath + p)
      assert.match(await nav.response.text(), /<title>Bếp Khởi Nghiệp<\/title>/, basePath + p + ': mất mạng phải ra trang game')
    }
    // font tự lưu có trong cache (chữ tiêu đề đúng khi chơi offline)
    const font = await dispatch(sw, 'fetch', fetchEvent(sw, '/fonts/baloo2-800-latin.woff2'))
    assert.equal(font.response.status, 200, basePath + ': font trong cache')
  }
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
