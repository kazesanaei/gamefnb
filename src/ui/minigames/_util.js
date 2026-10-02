// Tiện ích nội bộ cho bếp và mini-game: đồng hồ tạm dừng được, vòng lặp khung hình,
// hàm thuần (vùng mục tiêu, vạch thái, đếm đổi chiều) và vài phần tử dựng sẵn.
// Không chạm DOM khi import (test Node nạp được).
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import { isReduced } from '../motion.js'

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
export const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

// Giới hạn thời gian của một bước: 2,5 × par (Hỗ trợ thao tác: × 1,5).
export function stepLimitSec(par, assist = false) {
  const p = Math.max(1, Number(par) || 1)
  return 2.5 * p * (assist ? 1.5 : 1)
}

// Vùng mục tiêu đã nhân hệ số quanh tâm, kẹp trong [lo, hi].
export function scaledZone(zone, mul = 1, lo = 0, hi = 1.2) {
  const a = Number(zone && zone[0]) || 0
  const b = Number(zone && zone[1]) || 0
  const c = (a + b) / 2
  const half = (Math.abs(b - a) / 2) * (mul > 0 ? mul : 1)
  return [clamp(c - half, lo, hi), clamp(c + half, lo, hi)]
}

// Bộ sinh số ngẫu nhiên mulberry32 cho giao diện (bố trí vạch, vết bẩn, kệ) — tất định theo số gốc.
export function uiRand(seed) {
  let a = (Number(seed) >>> 0) || 0x9e3779b9
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Băm chuỗi FNV-1a (để tạo số gốc cho uiRand).
export function hashKey(str) {
  let x = 0x811c9dc5
  const s = String(str)
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i)
    x = Math.imul(x, 0x01000193) >>> 0
  }
  return x >>> 0
}

// Tọa độ n vạch thái trên nguyên liệu rộng `width` px: rải đều trong [12%, 88%], lệch nhẹ ngẫu nhiên.
export function thaiGuides(n, width, rand = Math.random) {
  const count = Math.max(1, Math.floor(Number(n) || 1))
  const lo = width * 0.12
  const hi = width * 0.88
  const gap = count > 1 ? (hi - lo) / (count - 1) : 0
  const jitter = Math.min(10, gap * 0.15)
  const xs = []
  for (let i = 0; i < count; i++) {
    const base = count > 1 ? lo + gap * i : width / 2
    xs.push(Math.round(base + (rand() * 2 - 1) * jitter))
  }
  return xs
}

// Gán một nhát cắt tại x cho vạch chưa cắt gần nhất. Trả {index, dev} hoặc null (hết vạch).
export function nearestUncut(guides, cut, x) {
  let best = -1
  let bestD = Infinity
  for (let i = 0; i < guides.length; i++) {
    if (cut[i] !== null && cut[i] !== undefined) continue
    const d = Math.abs(x - guides[i])
    if (d < bestD) { bestD = d; best = i }
  }
  return best < 0 ? null : { index: best, dev: Math.round((x - guides[best]) * 10) / 10 }
}

// Đếm số lần đổi chiều khi vuốt qua lại theo trục ngang (có ngưỡng chống rung tay).
export function createReversalCounter(threshold = 24) {
  let dir = 0
  let extreme = null
  let count = 0
  return {
    push(x) {
      if (extreme === null) { extreme = x; return count }
      if (dir === 0) {
        if (Math.abs(x - extreme) >= threshold) { dir = Math.sign(x - extreme); extreme = x }
        return count
      }
      if ((x - extreme) * dir > 0) { extreme = x; return count }
      if (Math.abs(x - extreme) >= threshold) {
        dir = -dir
        extreme = x
        count++
      }
      return count
    },
    reset() { dir = 0; extreme = null },
    get count() { return count }
  }
}

// Tốc độ dâng (phần dung tích/giây) khi rót. pour = lần nhấn (1: rót chính, ≥2: rót bù chậm).
// Gần vạch (từ a − 0,12) tốc độ không vượt 0,22/giây (≤ 25%/giây theo thiết kế).
export const ROT_NEAR_CAP = 0.22
export function rotSpeed(level, holdSec, pour, zoneA) {
  if (pour >= 2) return 0.08
  const s = Math.min(0.6, 0.12 + 0.3 * Math.max(0, holdSec))
  return level >= zoneA - 0.12 ? Math.min(s, ROT_NEAR_CAP) : s
}

// Giá trị kim canh lửa sau t giây: 0 → 1,2 trong period giây; slowAfter (tùy chọn): qua mốc này chậm lại 20%.
export function luaValue(t, period, slowAfter = null) {
  const rate = 1.2 / Math.max(0.5, Number(period) || 5)
  if (slowAfter === null || slowAfter === undefined) return t * rate
  const tB = slowAfter / rate
  if (t <= tB) return t * rate
  return slowAfter + (t - tB) * rate * 0.8
}

// ---- Phần dùng DOM (chỉ gọi bên trong mount) ----

// Đồng hồ đo bằng performance.now(), tự tạm dừng khi tab bị ẩn.
// hold(true): giữ đồng hồ đứng yên (vd hướng dẫn lần đầu đang che bước Chọn) — hiện lại tab không tự chạy tiếp; hold(false)
// chạy tiếp (nếu tab đang hiện).
export function createClock() {
  let acc = 0
  let start = nowMs()
  let running = true
  let held = false
  const onVis = () => {
    if (document.hidden) pause()
    else if (!held) resume()
  }
  function pause() { if (running) { acc += nowMs() - start; running = false } }
  function resume() { if (!running) { start = nowMs(); running = true } }
  function hold(on) {
    held = !!on
    if (held) pause()
    else if (typeof document === 'undefined' || !document.hidden) resume()
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis)
  return {
    // giây đã trôi (không tính lúc ẩn tab, lúc bị giữ)
    elapsed() { return (acc + (running ? nowMs() - start : 0)) / 1000 },
    get running() { return running },
    pause, resume, hold,
    destroy() { if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis) }
  }
}

// Vòng lặp requestAnimationFrame; fn(dt) nhận dt giây (kẹp 0,05). Tự nghỉ khi tab ẩn (rAF không chạy).
export function frameLoop(fn) {
  let raf = 0
  let last = nowMs()
  let stopped = false
  const tick = () => {
    if (stopped) return
    const t = nowMs()
    const dt = Math.min(0.05, (t - last) / 1000)
    last = t
    try { fn(dt) } catch (err) { console.error(err) }
    if (!stopped) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  const onVis = () => { if (!document.hidden) last = nowMs() }
  document.addEventListener('visibilitychange', onVis)
  return {
    stop() {
      stopped = true
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
    }
  }
}

// Promise có resolve bên ngoài; settle() chỉ nhận lần đầu.
export function settleOnce() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  let done = false
  return {
    promise,
    get done() { return done },
    settle(v) { if (done) return false; done = true; resolve(v); return true }
  }
}

// Hệ hiệu ứng dùng chung của màn chơi: ctx.vfx (bếp truyền app.vfx); thiếu thì lấy app.vfx (vd màn Gánh hàng quê) — không tự
// tạo vfx riêng. Không có thì null (mọi hiệu ứng bỏ qua, chỉ còn âm và rung).
export function vfxOf(ctx) {
  const v = (ctx && ctx.vfx) || (ctx && ctx.app && ctx.app.vfx) || null
  return v && typeof v.burst === 'function' ? v : null
}

// Hàm hỏi "giảm chuyển động" của màn chơi: ctx.reduced (hàm hoặc giá trị) nếu bên gọi truyền, không thì isReduced(app)
// (cài đặt trong game, lớp reduce-motion trên <html>, tùy chọn của hệ điều hành). Hoạt ảnh JS (WAAPI) phải tự hỏi hàm này.
export function reducedOf(ctx) {
  return () => {
    try {
      if (ctx && typeof ctx.reduced === 'function') return !!ctx.reduced()
      if (ctx && ctx.reduced !== undefined && ctx.reduced !== null) return !!ctx.reduced
    } catch { /* bỏ qua */ }
    return isReduced(ctx && ctx.app)
  }
}

// Chấm bước cho đầu sân khấu buildFrame2 (ctx.stepIndex / stepTotal / stepGrades do bếp truyền); thiếu thì null (ẩn chấm).
export function frameSteps(ctx) {
  return ctx && Number(ctx.stepTotal) > 0
    ? { index: ctx.stepIndex, total: ctx.stepTotal, grades: Array.isArray(ctx.stepGrades) ? ctx.stepGrades : [] }
    : null
}

// Hiệu ứng hình đi kèm phản hồi (thiết kế M5 mục 6.4): loại hạt và số hạt nổ tại đích.
// (dạng { fx, n } — khác dạng [âm, rung] của bảng âm bên dưới, test âm thanh quét bảng đó)
const FEEDBACK_FX = Object.freeze({
  good: { fx: 'sparkle', n: 4 }, done: { fx: 'sparkle', n: 6 }, hit: { fx: 'sparkle', n: 2 }, cut: { fx: 'crumb', n: 3 },
  chop: { fx: 'crumb', n: 2 }, spill: { fx: 'drop', n: 6 }, sizzle: { fx: 'oil', n: 6 }, pour: { fx: 'drop', n: 3 },
  peel: { fx: 'peel', n: 3 }
})

// Âm thanh và rung qua app (bỏ qua nếu không có). Âm tổng hợp ở src/ui/audio.js:
// cut/chop = dao thái "tách" (cut: nhát chuẩn, rung 15 ms), hit = chạm trúng, sizzle = dầu "xèo", pour = rót nước,
// peel = gọt vỏ "sột".
// target (tùy chọn, M5): phần tử hoặc điểm {x, y} / {clientX, clientY} nơi thao tác vừa xảy ra → thêm hiệu ứng hình qua
// vfx (ctx.vfx, thiếu thì app.vfx): good/done/hit lấp lánh, cut/chop vụn, spill giọt, sizzle dầu, peel vỏ cuộn; bad/spill
// rung đích 1 nhịp (giảm chuyển động: vfx tự đổi thành chớp viền đỏ tĩnh, hạt chỉ còn dấu tĩnh hoặc không có).
export function feedback(ctx, kind, target = null) {
  const app = ctx && ctx.app
  if (app) {
    const map = {
      tap: ['click', 0], cut: ['chop', 15], chop: ['chop', 0], hit: ['click', 15], good: ['ding', 15], ok: ['click', 0],
      bad: ['error', 80], done: ['bell', 0], spill: ['error', 80], sizzle: ['sizzle', 0], pour: ['pour', 0], peel: ['peel', 0]
    }
    const [snd, vib] = map[kind] || ['click', 0]
    try { if (typeof app.sound === 'function') app.sound(snd) } catch { /* bỏ qua */ }
    try { if (vib && typeof app.vibrate === 'function') app.vibrate(vib) } catch { /* bỏ qua */ }
  }
  const vfx = target ? vfxOf(ctx) : null
  if (!vfx) return
  try {
    const isEl = typeof target.getBoundingClientRect === 'function'
    if ((kind === 'bad' || kind === 'spill') && isEl) vfx.shake(target, 1)
    const fx = FEEDBACK_FX[kind]
    if (fx) vfx.burst(target, fx.fx, { n: fx.n })
  } catch { /* hiệu ứng lỗi không làm hỏng màn chơi */ }
}

// Dựng khung chung của sân khấu: đầu (tên bước, nguyên liệu, thanh thời gian) + vùng chơi + chân (nút).
export function buildFrame(stage, step, ctx, { title, sub } = {}) {
  const ingId = step.ing || null
  const iconSvg = ingIcon(ingId, ctx, step.icon || null)
  const timeFill = h('div', { class: 'mg-time-fill' })
  const time = h('div', { class: 'mg-time', 'data-testid': 'mg-time' }, timeFill)
  const subEl = h('div', { class: 'mg-sub' }, sub || '')
  const head = h('div', { class: 'mg-head' },
    iconSvg ? svgBox(iconSvg, 'mg-head-icon') : null,
    h('div', { class: 'mg-head-text' }, h('div', { class: 'mg-title' }, title || step.label || ''), subEl),
    time)
  const area = h('div', { class: 'mg-area' })
  const foot = h('div', { class: 'mg-foot' })
  stage.append(head, area, foot)
  return {
    head, area, foot, subEl,
    setTime(frac) {
      const f = clamp(frac, 0, 1)
      timeFill.style.transform = `scaleX(${1 - f})`
      time.classList.toggle('is-late', f > 0.75)
    },
    setSub(text) { subEl.textContent = text }
  }
}

// SVG của nguyên liệu (không có nguyên liệu → hình món).
// iconId (tùy chọn): hình riêng của bước (step.icon, vd chén sữa muối) thay cho hình nguyên liệu.
export function ingIcon(ingId, ctx, iconId = null) {
  const INGS = (ctx && ctx.data && ctx.data.INGREDIENTS) || {}
  if (iconId) return icon(iconId)
  if (ingId) return icon((INGS[ingId] && INGS[ingId].icon) || ingId)
  return icon((ctx && ctx.recipe && ctx.recipe.icon) || 'fallback')
}

export function ingName(ingId, ctx) {
  const INGS = (ctx && ctx.data && ctx.data.INGREDIENTS) || {}
  return (INGS[ingId] && INGS[ingId].name) || ingId || ''
}

// Nhãn nổi ngắn tại một điểm trong phần tử (vd "+100", "Hơi lệch"). (x, y): tọa độ trong host, chữ nằm ngay trên điểm.
// ctx (tùy chọn, M5): có vfx (ctx.vfx / app.vfx, hoặc chính đối tượng vfx) thì dùng chữ nổi vfx.floatText ở lớp hiệu ứng
// chung (viền mực, tự theo giảm chuyển động); cls 'is-good' → xanh, 'is-off' → vàng, 'is-bad' → đỏ. Không có vfx (hoặc
// vfx bỏ qua, vd trang đang ẩn) thì dùng nhãn cũ .mg-pop trong host như trước.
export function popLabel(host, text, x, y, cls = '', ctx = null) {
  const vfx = ctx && typeof ctx.floatText === 'function' ? ctx : vfxOf(ctx)
  if (vfx && host && typeof host.getBoundingClientRect === 'function') {
    try {
      const r = host.getBoundingClientRect()
      const tone = /\bis-good\b/.test(cls) ? 'good' : /\bis-off\b/.test(cls) ? 'gold' : /\bis-bad\b/.test(cls) ? 'bad' : 'info'
      const el = vfx.floatText({ left: r.left + x - 0.5, top: r.top + y - 0.5, width: 1, height: 1 }, text, { tone, size: 'small' })
      if (el) return el
    } catch { /* dùng nhãn cũ */ }
  }
  const el = h('div', { class: ['mg-pop', cls].filter(Boolean).join(' '), style: { left: x + 'px', top: y + 'px' } }, text)
  host.appendChild(el)
  setTimeout(() => el.remove(), 700)
  return el
}
