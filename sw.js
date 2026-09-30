// Service worker của Bếp Khởi Nghiệp: lưu sẵn TOÀN BỘ tệp của game để chơi offline từ lần mở thứ hai.
// - Cài (install): tải mọi tệp trong PRECACHE vào cache 'bkn-<VERSION>' (bỏ qua bộ nhớ đệm HTTP).
// - Không tự kích hoạt bản mới khi game đang mở: bản mới chờ tới khi người chơi bấm "Có bản mới – Tải lại" ở màn
//   Chuẩn bị/Tổng kết (trang gửi { type: 'SKIP_WAITING' }), nên tải lại trang giữa ca vẫn dùng bản cũ.
//   Lưu ý: khi người chơi đóng HẾT tab/ứng dụng rồi mở lại, trình duyệt tự kích hoạt bản đang chờ, có thể rơi vào giữa
//   ca. Ca dở vẫn nạp được (main.js báo "Game vừa lên phiên bản …"); bản sau có đổi cấu trúc ca thì save.migrate hủy ca
//   và hoàn giá vốn đã trừ, không bỏ ca im lặng (docs/kien-truc.md mục 16.1).
// - Kích hoạt (activate): dọn cache của các phiên bản cũ ('bkn-…' khác bản này), nhận quyền điều khiển trang.
// - Tải tệp (fetch): cache trước (cache-first) cho tài nguyên tĩnh cùng nguồn; so khóa cache bỏ qua query
//   (?devNow, ?test, ?seed…); mở trang (navigate) luôn trả index.html đã lưu.
// VERSION trùng "version" trong package.json (có test đối chiếu); đổi tệp của game thì tăng VERSION.
// Thêm/bớt tệp trong src/, css/, icons/ thì sửa PRECACHE (test tests/unit/pwa.test.mjs đối chiếu với cây thư mục thật).

const VERSION = '0.3.0'
const CACHE_PREFIX = 'bkn-'
const CACHE = CACHE_PREFIX + VERSION

const PRECACHE = [
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'css/base.css',
  'css/game.css',
  'css/kitchen.css',
  'css/meta.css',
  'css/settings.css',
  'src/main.js',
  'src/core/bus.js',
  'src/core/chains.js',
  'src/core/checkin.js',
  'src/core/clock.js',
  'src/core/customer.js',
  'src/core/economy.js',
  'src/core/events.js',
  'src/core/incidents.js',
  'src/core/kitchen.js',
  'src/core/mail.js',
  'src/core/mastery.js',
  'src/core/meta.js',
  'src/core/minigame-scoring.js',
  'src/core/money.js',
  'src/core/notebook.js',
  'src/core/order.js',
  'src/core/progression.js',
  'src/core/quests.js',
  'src/core/recipe-book.js',
  'src/core/rewards.js',
  'src/core/rng.js',
  'src/core/save.js',
  'src/core/scoring.js',
  'src/core/shift.js',
  'src/core/shop.js',
  'src/core/state.js',
  'src/core/stats.js',
  'src/data/balance.js',
  'src/data/chains.js',
  'src/data/checkin.js',
  'src/data/customers.js',
  'src/data/day-events.js',
  'src/data/dialogue.js',
  'src/data/events.js',
  'src/data/incidents.js',
  'src/data/index.js',
  'src/data/ingredients.js',
  'src/data/mail.js',
  'src/data/minigame-types.js',
  'src/data/progression.js',
  'src/data/quests.js',
  'src/data/recipes.js',
  'src/data/reviews.js',
  'src/data/shop.js',
  'src/data/strings.js',
  'src/data/tips.js',
  'src/data/upgrades.js',
  'src/ui/app.js',
  'src/ui/art.js',
  'src/ui/audio.js',
  'src/ui/dom.js',
  'src/ui/format.js',
  'src/ui/input.js',
  'src/ui/loop.js',
  'src/ui/router.js',
  'src/ui/components/cash-drawer.js',
  'src/ui/components/chain-card.js',
  'src/ui/components/checkin-popup.js',
  'src/ui/components/hud.js',
  'src/ui/components/meta-ui.js',
  'src/ui/components/modal.js',
  'src/ui/components/numpad.js',
  'src/ui/components/patience.js',
  'src/ui/components/progress4.js',
  'src/ui/components/ticket-rail.js',
  'src/ui/components/toast.js',
  'src/ui/minigames/_util.js',
  'src/ui/minigames/cha.js',
  'src/ui/minigames/cham.js',
  'src/ui/minigames/chon.js',
  'src/ui/minigames/index.js',
  'src/ui/minigames/lua.js',
  'src/ui/minigames/rot.js',
  'src/ui/minigames/thai.js',
  'src/ui/screens/counter.js',
  'src/ui/screens/event.js',
  'src/ui/screens/kitchen.js',
  'src/ui/screens/mailbox.js',
  'src/ui/screens/notebook.js',
  'src/ui/screens/prep.js',
  'src/ui/screens/quests.js',
  'src/ui/screens/recipe-book.js',
  'src/ui/screens/service.js',
  'src/ui/screens/settings.js',
  'src/ui/screens/shop.js',
  'src/ui/screens/stage-up.js',
  'src/ui/screens/summary.js',
  'src/ui/screens/tasting.js',
  'src/ui/screens/title.js'
]

// Chạy ở máy cục bộ (npm run serve, e2e): vẫn trả từ cache trước, đồng thời tải lại tệp ở nền để lần mở sau
// thấy ngay code vừa sửa (không phải tăng VERSION mỗi lần sửa khi phát triển).
const LOCAL_DEV = ['localhost', '127.0.0.1'].includes(self.location.hostname)

const INDEX_URL = new URL('index.html', self.location).href

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE.map(p => new Request(p, { cache: 'reload' }))))
  )
})

// Trang gửi khi người chơi bấm "Tải lại" (màn Chuẩn bị/Tổng kết): kích hoạt bản mới.
self.addEventListener('message', event => {
  const msg = event.data || {}
  if (msg.type === 'SKIP_WAITING') self.skipWaiting()
  else if (msg.type === 'GET_VERSION' && event.source) event.source.postMessage({ type: 'VERSION', version: VERSION })
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Dọn cache của chính game ở các phiên bản cũ (không đụng dữ liệu lưu của người chơi trong localStorage).
    const keys = await caches.keys()
    await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (req.mode === 'navigate') {
    event.respondWith(cacheFirst(event, INDEX_URL, req))
    return
  }
  event.respondWith(cacheFirst(event, req, req))
})

// Trả bản trong cache (so khóa bỏ qua query); chưa có thì tải mạng (và cất lại nếu là tệp của game).
async function cacheFirst(event, key, req) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(key, { ignoreSearch: true })
  if (hit) {
    if (LOCAL_DEV) event.waitUntil(refresh(cache, key, req))
    return hit
  }
  try {
    const res = await fetch(req)
    if (res && res.ok && res.type === 'basic' && isGameFile(req.url)) {
      const copy = res.clone()
      event.waitUntil(cache.put(key, copy).catch(() => {}))
    }
    return res
  } catch (err) {
    // mất mạng mà tệp chưa có trong cache: mở trang thì trả index.html nếu có
    if (req.mode === 'navigate') {
      const shell = await cache.match(INDEX_URL)
      if (shell) return shell
    }
    throw err
  }
}

async function refresh(cache, key, req) {
  try {
    const res = await fetch(typeof key === 'string' ? key : req.url, { cache: 'no-store' })
    if (res && res.ok && res.type === 'basic') await cache.put(key, res)
  } catch { /* mất mạng: giữ bản cũ */ }
}

function isGameFile(href) {
  const path = new URL(href).pathname
  const scope = new URL('./', self.location).pathname
  const rel = path.startsWith(scope) ? path.slice(scope.length) : path
  return rel === '' || PRECACHE.includes(rel)
}
