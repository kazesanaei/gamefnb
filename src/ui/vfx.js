// Hệ hiệu ứng (VFX) dùng chung cho giao diện M5: hạt vẽ trên canvas (lấp lánh, vụn, giọt, dầu, khói, sao, vỏ, xu,
// pháo giấy), chữ nổi, gợn chạm, rung, nảy, squash, dừng hình, "nhân bản rồi bay" và xu bay về ví.
// Luật:
// - Chỉ animate transform/opacity (WAAPI) và vẽ canvas; will-change chỉ bật khi đang chạy.
// - Lớp .vfx-layer (z-index 25 trong .overlay-root) luôn pointer-events:none; tạo lười ở lần gọi đầu.
// - Tối đa VFX_LIMITS.dom nút trong lớp (kể cả canvas), tối đa VFX_LIMITS.particles hạt; canvas tạo lười, DPR ≤ 2,
//   rAF chỉ chạy khi còn hạt; trang ẩn (visibilitychange) thì dọn sạch.
// - Đầu mỗi hàm hỏi reduced(): giảm chuyển động thì chỉ đổi opacity / hiện thẳng, không hạt bay, không rung.
// - KHÔNG phát sự kiện lên bus miền (app.js lưu sau mỗi sự kiện bus).
// - Import trong Node an toàn: không chạm document/window ở cấp module.
import { isReduced } from './motion.js'

export const VFX_LIMITS = Object.freeze({ dom: 30, particles: 150, dpr: 2 })
export const VFX_KINDS = Object.freeze(['sparkle', 'crumb', 'drop', 'oil', 'smoke', 'star', 'peel', 'coin', 'confetti'])
// Trọng lực chuẩn (px/s²); mỗi loại hạt nhân thêm hệ số riêng (âm: bay lên, như khói).
export const GRAVITY = 1400

const TAU = Math.PI * 2
const UP = -Math.PI / 2
const INK = '#3a2618'

// ---------- Hàm thuần (test trong Node) ----------

const clamp01 = t => (Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0)

// easeOutBack: vượt nhẹ rồi về đích (nảy vào). f(0) = 0, f(1) = 1.
export function easeOutBack(t, s = 1.70158) {
  const x = clamp01(t)
  if (x === 0) return 0
  if (x === 1) return 1
  const c3 = s + 1
  return 1 + c3 * (x - 1) ** 3 + s * (x - 1) ** 2
}

// easeOutCubic: nhanh rồi chậm dần. f(0) = 0, f(1) = 1.
export function easeOutCubic(t) {
  const x = clamp01(t)
  return 1 - (1 - x) ** 3
}

function easeInOutCubic(t) {
  const x = clamp01(t)
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

function easeInQuad(t) {
  const x = clamp01(t)
  return x * x
}

/**
 * bezier(p0, p1, p2, t): đường cong Bézier bậc hai. Điểm là số hoặc { x, y }; t ngoài [0, 1] được kẹp lại.
 * t = 0 → p0, t = 1 → p2, p1 là điểm kéo (đỉnh cung bay).
 */
export function bezier(p0, p1, p2, t) {
  const u = clamp01(t)
  const a = (1 - u) * (1 - u)
  const b = 2 * (1 - u) * u
  const c = u * u
  if (typeof p0 === 'number' || typeof p1 === 'number' || typeof p2 === 'number') {
    return a * (Number(p0) || 0) + b * (Number(p1) || 0) + c * (Number(p2) || 0)
  }
  const P = p => ({ x: Number(p && p.x) || 0, y: Number(p && p.y) || 0 })
  const q0 = P(p0), q1 = P(p1), q2 = P(p2)
  return { x: a * q0.x + b * q1.x + c * q2.x, y: a * q0.y + b * q1.y + c * q2.y }
}

// Bảng hạt theo loại: n (số hạt), colors, speed [min,max] px/s, dir (hướng chính, radian; −π/2 là lên trên),
// spread (lệch tối đa hai bên), gravity (hệ số × GRAVITY), drag (hãm /s), life [min,max] ms, size [min,max] px,
// spin (rad/s tối đa), shape (cách vẽ), jitter (độ tỏa điểm xuất phát theo kích thước đích), grow, alpha.
const PLANS = deepFreeze({
  sparkle: { n: 12, colors: ['#ffd23f', '#fff4b8', '#ffffff', '#ffb31a'], speed: [150, 340], dir: UP, spread: Math.PI, gravity: 0.15, drag: 2.6, life: [550, 950], size: [11, 19], spin: 2.5, shape: 'sparkle', jitter: 0.5, grow: 0, alpha: 1 },
  crumb: { n: 5, colors: ['#9fd36b', '#5aa83c', '#e9f5c9'], speed: [140, 280], dir: UP, spread: 1.1, gravity: 1, drag: 0.4, life: [420, 650], size: [7, 11], spin: 9, shape: 'crumb', jitter: 0.2, grow: 0, alpha: 1 },
  drop: { n: 7, colors: ['#8fd3ff', '#cdeeff', '#5bb8f0'], speed: [150, 310], dir: UP, spread: 0.95, gravity: 1, drag: 0.3, life: [350, 550], size: [7, 11], spin: 0, shape: 'drop', jitter: 0.2, grow: 0, alpha: 1 },
  oil: { n: 8, colors: ['#ffe27a', '#f6c343', '#fff6c8'], speed: [170, 340], dir: UP, spread: 1.25, gravity: 1, drag: 0.3, life: [300, 500], size: [5, 8], spin: 0, shape: 'dot', jitter: 0.3, grow: 0, alpha: 0.95 },
  smoke: { n: 7, colors: ['#8a8178', '#a39b92', '#6f675f'], speed: [30, 80], dir: UP, spread: 0.55, gravity: -0.06, drag: 0.6, life: [800, 1200], size: [18, 28], spin: 0.6, shape: 'puff', jitter: 0.45, grow: 1.4, alpha: 0.7 },
  star: { n: 6, colors: ['#ffd23f', '#ffe680', '#ffc21a'], speed: [180, 330], dir: UP, spread: Math.PI, gravity: 0.45, drag: 1.6, life: [620, 900], size: [13, 19], spin: 5, shape: 'star', jitter: 0.3, grow: 0, alpha: 1 },
  peel: { n: 3, colors: ['#7cbf4a', '#4f9a3c', '#b6e07c'], speed: [70, 150], dir: UP, spread: 1.4, gravity: 0.9, drag: 0.5, life: [520, 720], size: [13, 19], spin: 6, shape: 'peel', jitter: 0.3, grow: 0, alpha: 1 },
  coin: { n: 8, colors: ['#ffd23f', '#ffc21a'], speed: [220, 400], dir: UP, spread: 0.9, gravity: 1, drag: 0.2, life: [560, 820], size: [11, 15], spin: 10, shape: 'coin', jitter: 0.2, grow: 0, alpha: 1 },
  confetti: { n: 36, colors: ['#e8483a', '#ffd23f', '#43a63d', '#3f8fd8', '#f28a1e', '#f47fb0'], speed: [450, 820], dir: UP, spread: 0.6, gravity: 0.35, drag: 2.6, life: [1200, 1800], size: [9, 14], spin: 8, shape: 'rect', jitter: 0.6, grow: 0, alpha: 1 }
})
// Giảm chuyển động: tối đa 3 dấu tĩnh (chỉ mờ dần), loại khác không có hạt.
const REDUCED_N = Object.freeze({ sparkle: 3, star: 1, coin: 1 })

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const v of Object.values(o)) deepFreeze(v)
  }
  return o
}

/**
 * particlePlan(kind, reduced) → kế hoạch hạt (đã đóng băng):
 * { kind, n, colors, speed, dir, spread, gravity, drag, life, size, spin, shape, jitter, grow, alpha, trajectory }.
 * kind lạ thì dùng 'sparkle'. reduced → n ≤ 3, speed [0, 0], không trọng lực, không xoay, trajectory: false
 * (giao diện vẽ dấu tĩnh bằng DOM, chỉ đổi opacity).
 */
export function particlePlan(kind, reduced = false) {
  const k = Object.prototype.hasOwnProperty.call(PLANS, kind) ? kind : 'sparkle'
  const p = PLANS[k]
  if (!reduced) return Object.freeze({ kind: k, ...p, trajectory: true })
  return Object.freeze({
    kind: k, ...p,
    n: Math.min(3, REDUCED_N[k] || 0),
    speed: Object.freeze([0, 0]), gravity: 0, drag: 0, spin: 0, grow: 0,
    life: Object.freeze([600, 600]),
    trajectory: false
  })
}

/**
 * spawnParticles(plan, { x, y, w, h }, rand = Math.random, n = plan.n) → mảng hạt mới tại điểm (x, y), tỏa theo
 * jitter × kích thước (w, h). Hạt: { x, y, vx, vy, age, life, size, color, rot, vr, g, drag, shape, grow, alpha }.
 * Đơn vị: px, px/s, ms (age, life). Số hạt kẹp trong [0, VFX_LIMITS.particles].
 */
export function spawnParticles(plan, origin = {}, rand = Math.random, n = null) {
  if (!plan) return []
  const want = Number.isFinite(Number(n)) && n !== null ? Number(n) : Number(plan.n)
  const count = Math.max(0, Math.min(VFX_LIMITS.particles, Math.floor(Number.isFinite(want) ? want : 0)))
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0)
  const ox = num(origin.x), oy = num(origin.y)
  const w = Math.max(0, num(origin.w)), h = Math.max(0, num(origin.h))
  const between = r => r[0] + (r[1] - r[0]) * rand()
  const colors = plan.colors && plan.colors.length ? plan.colors : ['#ffd23f']
  const jit = Number(plan.jitter) || 0
  const out = []
  for (let i = 0; i < count; i++) {
    const ang = plan.dir + (rand() * 2 - 1) * plan.spread
    const sp = plan.trajectory === false ? 0 : between(plan.speed)
    out.push({
      x: ox + (rand() - 0.5) * w * jit,
      y: oy + (rand() - 0.5) * h * jit,
      vx: sp ? Math.cos(ang) * sp : 0,
      vy: sp ? Math.sin(ang) * sp : 0,
      age: 0,
      life: between(plan.life),
      size: between(plan.size),
      color: colors[Math.min(colors.length - 1, Math.floor(rand() * colors.length))],
      rot: rand() * TAU,
      vr: (rand() * 2 - 1) * (plan.spin || 0),
      g: plan.gravity || 0,
      drag: plan.drag || 0,
      shape: plan.shape,
      grow: plan.grow || 0,
      alpha: plan.alpha ?? 1
    })
  }
  return out
}

/**
 * stepParticles(list, dt, g = GRAVITY) → mảng hạt còn sống sau dt giây.
 * Mỗi hạt: vận tốc hãm theo drag (e^(−drag·dt)), cộng trọng lực g × p.g, dời vị trí, xoay, cộng tuổi (ms).
 * Hạt có age ≥ life bị bỏ. Cập nhật tại chỗ từng hạt (tránh rác bộ nhớ mỗi khung); dt lỗi/âm coi như 0.
 */
export function stepParticles(list, dt, g = GRAVITY) {
  const d = Number.isFinite(dt) && dt > 0 ? dt : 0
  const grav = Number.isFinite(g) ? g : GRAVITY
  const out = []
  for (const p of Array.isArray(list) ? list : []) {
    if (!p) continue
    if (d > 0) {
      const k = p.drag > 0 ? Math.exp(-p.drag * d) : 1
      p.vx = (p.vx || 0) * k
      p.vy = (p.vy || 0) * k + grav * (p.g ?? 1) * d
      p.x = (p.x || 0) + p.vx * d
      p.y = (p.y || 0) + p.vy * d
      p.rot = (p.rot || 0) + (p.vr || 0) * d
      p.age = (p.age || 0) + d * 1000
    }
    if ((p.age || 0) < (p.life || 0)) out.push(p)
  }
  return out
}

// ---------- Vẽ hạt lên canvas ----------

function drawParticle(g, p) {
  const t = p.life > 0 ? Math.min(1, p.age / p.life) : 1
  const a = (p.alpha ?? 1) * (t < 0.65 ? 1 : Math.max(0, 1 - (t - 0.65) / 0.35))
  let s = p.size * (1 + (p.grow || 0) * t)
  if (p.shape === 'sparkle') s *= t < 0.18 ? 0.4 + (t / 0.18) * 0.8 : 1.2 - (t - 0.18) * 0.5
  if (a <= 0.01 || s <= 0.2) return
  g.save()
  g.globalAlpha = a
  g.translate(p.x, p.y)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  switch (p.shape) {
    case 'sparkle': {
      const r = s * 0.62, q = r * 0.28
      g.rotate(p.rot * 0.3)
      g.beginPath(); g.arc(0, 0, r * 0.75, 0, TAU); g.fillStyle = 'rgba(255,240,170,.35)'; g.fill()
      g.beginPath()
      g.moveTo(0, -r); g.lineTo(q, -q); g.lineTo(r, 0); g.lineTo(q, q)
      g.lineTo(0, r); g.lineTo(-q, q); g.lineTo(-r, 0); g.lineTo(-q, -q)
      g.closePath()
      g.fillStyle = p.color
      g.fill()
      g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU); g.fillStyle = '#fff'; g.fill()
      break
    }
    case 'star': {
      const r = s * 0.6, ri = r * 0.46
      g.rotate(p.rot)
      g.beginPath()
      for (let i = 0; i < 10; i++) {
        const ang = UP + (i * Math.PI) / 5
        const rr = i % 2 ? ri : r
        if (i) g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); else g.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
      }
      g.closePath()
      g.fillStyle = p.color
      g.fill()
      g.lineWidth = 1.6; g.strokeStyle = INK; g.stroke()
      g.beginPath(); g.arc(-r * 0.18, -r * 0.22, r * 0.16, 0, TAU); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill()
      break
    }
    case 'crumb': {
      const w = s, h = s * 0.7
      g.rotate(p.rot)
      g.beginPath(); g.rect(-w / 2, -h / 2, w, h)
      g.fillStyle = p.color; g.fill()
      g.lineWidth = 1.3; g.strokeStyle = INK; g.stroke()
      break
    }
    case 'drop': {
      const r = s * 0.5
      g.rotate(Math.atan2(p.vy || 0, p.vx || 0) + Math.PI / 2)
      g.scale(1, 1.4)
      g.beginPath(); g.arc(0, 0, r, 0, TAU)
      g.fillStyle = p.color; g.fill()
      g.lineWidth = 1; g.strokeStyle = 'rgba(58,38,24,.55)'; g.stroke()
      g.beginPath(); g.arc(-r * 0.3, -r * 0.3, r * 0.28, 0, TAU); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill()
      break
    }
    case 'dot': {
      const r = s * 0.5
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = p.color; g.fill()
      g.beginPath(); g.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, TAU); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill()
      break
    }
    case 'puff': {
      const r = s * 0.6
      const grad = g.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r)
      grad.addColorStop(0, p.color)
      grad.addColorStop(0.55, p.color)
      grad.addColorStop(1, 'rgba(138,129,120,0)')
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = grad; g.fill()
      break
    }
    case 'peel': {
      const r = s * 0.55
      g.rotate(p.rot)
      g.beginPath(); g.arc(0, 0, r, 0.2 * Math.PI, 1.5 * Math.PI)
      g.lineWidth = s * 0.42 + 2.6; g.strokeStyle = INK; g.stroke()
      g.lineWidth = s * 0.42; g.strokeStyle = p.color; g.stroke()
      break
    }
    case 'coin': {
      const r = s * 0.6
      g.scale(Math.max(0.15, Math.abs(Math.cos(p.rot))), 1)
      g.beginPath(); g.arc(0, 0, r, 0, TAU)
      g.fillStyle = p.color; g.fill()
      g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke()
      g.beginPath(); g.arc(0, 0, r * 0.58, 0, TAU); g.lineWidth = 1.3; g.strokeStyle = '#d99000'; g.stroke()
      break
    }
    default: { // 'rect': mảnh pháo giấy lật phấp phới
      const w = s, h = s * 0.62
      g.rotate(p.rot)
      g.scale(1, Math.max(0.2, Math.abs(Math.cos(p.rot * 1.3))))
      g.fillStyle = p.color
      g.fillRect(-w / 2, -h / 2, w, h)
    }
  }
  g.restore()
}

// ---------- Hệ hiệu ứng gắn DOM ----------

function rectOf(t) {
  if (!t) return null
  try {
    if (typeof t.getBoundingClientRect === 'function') {
      const r = t.getBoundingClientRect()
      return { left: r.left, top: r.top, width: r.width, height: r.height, point: false }
    }
  } catch { return null }
  if (Number.isFinite(t.left) && Number.isFinite(t.top)) {
    const w = Number(t.width) || 0, h = Number(t.height) || 0
    return { left: t.left, top: t.top, width: w, height: h, point: !(w > 0 || h > 0) }
  }
  if (Number.isFinite(t.x) && Number.isFinite(t.y)) {
    const w = Number(t.width) || 0, h = Number(t.height) || 0
    return { left: t.x, top: t.y, width: w, height: h, point: !(w > 0 || h > 0) }
  }
  if (Number.isFinite(t.clientX) && Number.isFinite(t.clientY)) return { left: t.clientX, top: t.clientY, width: 0, height: 0, point: true }
  return null
}

/**
 * createVfx({ host, reduced }) → {
 *   layer                                   div.vfx-layer (tạo lười khi đọc lần đầu, gắn vào host = app.overlay)
 *   burst(target, kind, { n, colors })      nổ hạt trên canvas tại tâm đích → số hạt đã tạo
 *   floatText(target, text, { tone, size }) chữ nổi bay lên (tone: gold | good | bad | info | sky) → phần tử
 *   ripple(x, y)                            gợn chạm tại tọa độ khung nhìn (giữ khi giảm chuyển động, chỉ opacity)
 *   shake(el, power 1..3)                   rung ngang 2/4/6 px giảm dần (giảm chuyển động: chớp viền đỏ tĩnh)
 *   squash(el), pop(el)                     nảy squash 420 ms gốc ở đáy / bật vào easeOutBack (WAAPI)
 *   hitstop(ms)                             dừng hình 60–90 ms (Promise), giữ cả khi giảm chuyển động
 *   fly(from, to, { node, html, ms, arc, scale, bump }) "nhân bản rồi bay" theo cung Bézier → Promise<boolean>
 *   coins(from, to, n, { stagger, ms, bump }) xu bay tỏa ra rồi về đích → Promise<số xu đã bay>
 *   confetti(target, n = 36)                pháo giấy trên canvas → số mảnh đã tạo
 *   stats() → { dom, particles }            số nút trong lớp, số hạt canvas (canvas cũng ghi data-n)
 *   clear(), destroy()
 * }
 * target / from / to: phần tử, hình chữ nhật { left, top, width, height } hoặc điểm { x, y } (tọa độ khung nhìn).
 * reduced: hàm () → boolean (mặc định isReduced() của motion.js) hoặc giá trị boolean.
 */
export function createVfx({ host = null, reduced = null } = {}) {
  const red = () => {
    try {
      if (typeof reduced === 'function') return !!reduced()
      if (reduced === null || reduced === undefined) return isReduced()
      return !!reduced
    } catch {
      return false
    }
  }
  let destroyed = false
  let layer = null
  let doc = null
  let canvas = null
  let c2d = null
  let cw = 0, ch = 0, dpr = 1
  let parts = []
  let raf = 0
  let lastTs = 0
  let frozen = 0
  const pool = []                 // phần tử rảnh để dùng lại
  const live = new Set()          // hiệu ứng đang chạy trong lớp: { el, anim, end }
  const extern = new Map()        // phần tử ngoài lớp → Animation (rung, nảy…)
  const timers = new Set()

  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn() }, ms)
    timers.add(id)
    return id
  }
  const win = () => (doc && doc.defaultView) || (typeof window !== 'undefined' ? window : null)

  function onVisibility() {
    if (doc && doc.visibilityState === 'hidden') clear()
  }

  function ensureLayer() {
    if (destroyed) return null
    if (layer) {
      if (!layer.isConnected && host && typeof host.appendChild === 'function') host.appendChild(layer)
      return layer
    }
    doc = (host && host.ownerDocument) || (typeof document !== 'undefined' ? document : null)
    if (!doc || typeof doc.createElement !== 'function') return null
    if (!host) host = doc.body
    if (!host || typeof host.appendChild !== 'function') return null
    layer = doc.createElement('div')
    layer.className = 'vfx-layer'
    layer.setAttribute('aria-hidden', 'true')
    host.appendChild(layer)
    if (typeof doc.addEventListener === 'function') doc.addEventListener('visibilitychange', onVisibility)
    return layer
  }

  // Tọa độ trong lớp của một đích.
  function local(target) {
    const r = rectOf(target)
    if (!r || !ensureLayer()) return null
    const L = layer.getBoundingClientRect()
    const x = r.left - L.left, y = r.top - L.top
    return { x, y, w: r.width, h: r.height, cx: x + r.width / 2, cy: y + r.height / 2, point: r.point, W: L.width, H: L.height }
  }

  // Lấy một nút từ pool (null nếu đã đủ VFX_LIMITS.dom nút trong lớp).
  function take(cls) {
    if (!ensureLayer()) return null
    if (layer.childElementCount >= VFX_LIMITS.dom) return null
    const el = pool.pop() || doc.createElement('div')
    el.className = cls
    el.removeAttribute('style')
    el.removeAttribute('data-kind')
    el.removeAttribute('data-tone')
    el.removeAttribute('data-size')
    el.textContent = ''
    layer.appendChild(el)
    return el
  }

  function give(el) {
    if (!el) return
    try { if (typeof el.getAnimations === 'function') for (const a of el.getAnimations()) a.cancel() } catch { /* bỏ qua */ }
    if (el.parentNode) el.parentNode.removeChild(el)
    el.textContent = ''
    if (pool.length < VFX_LIMITS.dom) pool.push(el)
  }

  // Chạy WAAPI trên nút của lớp; xong (hoặc bị hủy, hoặc quá giờ an toàn) thì trả nút về pool. → Promise
  function run(el, keyframes, opts) {
    return new Promise(resolve => {
      const rec = { el, anim: null, done: false, end: null }
      rec.end = () => {
        if (rec.done) return
        rec.done = true
        live.delete(rec)
        give(el)
        resolve(true)
      }
      live.add(rec)
      let anim = null
      try {
        el.style.willChange = 'transform, opacity'
        anim = typeof el.animate === 'function' ? el.animate(keyframes, { fill: 'both', ...opts }) : null
      } catch { anim = null }
      if (!anim) { rec.end(); return }
      rec.anim = anim
      if (frozen) { try { anim.pause() } catch { /* bỏ qua */ } }
      anim.addEventListener('finish', rec.end)
      anim.addEventListener('cancel', rec.end)
      later(rec.end, (opts.delay || 0) + (opts.duration || 0) + 700)
    })
  }

  // Animation trên phần tử ngoài lớp (giữ transform sẵn có của phần tử, hủy hoạt ảnh cũ cùng phần tử).
  function animateExt(el, build, opts) {
    if (!el || typeof el.animate !== 'function') return null
    try {
      const prev = extern.get(el)
      if (prev) prev.cancel()
      const cs = el.ownerDocument && el.ownerDocument.defaultView ? el.ownerDocument.defaultView.getComputedStyle(el) : null
      const base = cs && cs.transform && cs.transform !== 'none' ? cs.transform + ' ' : ''
      const keep = el.style.willChange
      el.style.willChange = 'transform, opacity'
      const anim = el.animate(build(base), { fill: 'none', ...opts })
      extern.set(el, anim)
      const done = () => {
        if (extern.get(el) === anim) extern.delete(el)
        el.style.willChange = keep
      }
      anim.addEventListener('finish', done)
      anim.addEventListener('cancel', done)
      return anim
    } catch {
      return null
    }
  }

  // ----- canvas hạt -----
  function ensureCanvas() {
    if (!ensureLayer()) return null
    if (!canvas) {
      if (layer.childElementCount >= VFX_LIMITS.dom) return null
      const cv = doc.createElement('canvas')
      let g = null
      try { g = cv.getContext('2d') } catch { g = null }
      if (!g) return null
      canvas = cv
      c2d = g
      canvas.className = 'vfx-canvas'
      canvas.setAttribute('data-n', '0')
      shownN = 0
    }
    if (canvas.parentNode !== layer) layer.insertBefore(canvas, layer.firstChild)
    const w = layer.clientWidth, h = layer.clientHeight
    const w0 = win()
    const r = Math.min(VFX_LIMITS.dpr, Math.max(1, (w0 && w0.devicePixelRatio) || 1))
    if (w !== cw || h !== ch || r !== dpr || canvas.width === 0) {
      cw = w; ch = h; dpr = r
      canvas.width = Math.max(1, Math.round(w * r))
      canvas.height = Math.max(1, Math.round(h * r))
    }
    return c2d
  }

  function draw() {
    if (!c2d) return
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0)
    c2d.clearRect(0, 0, cw, ch)
    for (const p of parts) drawParticle(c2d, p)
  }

  function frame(ts) {
    raf = 0
    if (destroyed) return
    const dt = lastTs ? Math.min(0.05, Math.max(0, (ts - lastTs) / 1000)) : 1 / 60
    lastTs = ts
    if (!frozen) parts = stepParticles(parts, dt, GRAVITY)
    draw()
    setCount(parts.length)
    if (parts.length) {
      const w0 = win()
      raf = w0 && typeof w0.requestAnimationFrame === 'function' ? w0.requestAnimationFrame(frame) : 0
    } else {
      idleCanvas()
    }
  }

  // Ghi số hạt lên canvas (data-n, cho e2e) chỉ khi đổi.
  let shownN = -1
  function setCount(n) {
    if (!canvas || n === shownN) return
    shownN = n
    canvas.setAttribute('data-n', String(n))
  }

  // Hết hạt: dừng rAF, nhả bộ nhớ canvas (iOS tốn RAM cho canvas lớn).
  function idleCanvas() {
    lastTs = 0
    if (canvas) {
      setCount(0)
      canvas.width = 0
      canvas.height = 0
      cw = 0; ch = 0
    }
  }

  function startLoop() {
    if (raf || !parts.length) return
    const w0 = win()
    if (!w0 || typeof w0.requestAnimationFrame !== 'function') { parts = []; return }
    lastTs = 0
    setCount(parts.length)
    raf = w0.requestAnimationFrame(frame)
  }

  function addParticles(plan, origin, n, colors) {
    if (!ensureCanvas()) return 0
    const room = VFX_LIMITS.particles - parts.length
    const want = Math.max(0, Math.min(room, Math.floor(n ?? plan.n)))
    if (!want) return 0
    const usePlan = Array.isArray(colors) && colors.length ? { ...plan, colors } : plan
    const fresh = spawnParticles(usePlan, origin, Math.random, want)
    parts = parts.concat(fresh)
    startLoop()
    return fresh.length
  }

  // ----- hiệu ứng -----

  // Dấu tĩnh khi giảm chuyển động: chỉ hiện rồi mờ (opacity), không bay.
  const STATIC_SPOTS = [[0, 0], [-18, -10], [18, -8]]
  function staticMarks(L, kind, count) {
    for (let i = 0; i < count; i++) {
      const el = take('vfx-p')
      if (!el) break
      el.setAttribute('data-kind', kind)
      const [dx, dy] = STATIC_SPOTS[i % STATIC_SPOTS.length]
      el.style.left = `${L.cx + dx}px`
      el.style.top = `${L.cy + dy}px`
      run(el, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 600, easing: 'linear' })
    }
  }

  function burst(target, kind = 'sparkle', { n, colors } = {}) {
    if (destroyed) return 0
    const isRed = red()
    const plan = particlePlan(kind, isRed)
    const L = local(target)
    if (!L) return 0
    if (isRed) {
      if (plan.n > 0 && (plan.kind === 'sparkle' || plan.kind === 'star' || plan.kind === 'coin')) staticMarks(L, plan.kind, Math.min(3, plan.n))
      return 0
    }
    if (plan.kind === 'sparkle' || plan.kind === 'star' || plan.kind === 'coin') flashRing(L)
    const oy = plan.kind === 'smoke' ? L.y + L.h * 0.3 : L.cy
    return addParticles(plan, { x: L.cx, y: oy, w: L.w, h: plan.kind === 'smoke' ? L.h * 0.3 : L.h }, n ?? plan.n, colors)
  }

  // Vòng sáng lóe ra tại tâm (1 nút DOM, chỉ transform/opacity).
  function flashRing(L) {
    const el = take('vfx-ring')
    if (!el) return
    el.style.left = `${L.cx}px`
    el.style.top = `${L.cy}px`
    const k = Math.max(0.6, Math.min(1.6, Math.max(L.w, L.h) / 140))
    run(el, [
      { opacity: 0.9, transform: `scale(${(0.25 * k).toFixed(3)})` },
      { opacity: 0, transform: `scale(${(1.25 * k).toFixed(3)})` }
    ], { duration: 380, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' })
  }

  function confetti(target, n = 36) {
    if (destroyed || red()) return 0
    const L = local(target)
    if (!L) return 0
    const base = particlePlan('confetti', false)
    const oy = L.y + L.h * 0.35
    // đích sát mép trên thì bắn nhẹ hơn để pháo giấy không vọt khỏi màn
    const k = Math.max(0.45, Math.min(1, oy / Math.max(1, (L.H || oy) * 0.45)))
    const plan = k < 1 ? { ...base, speed: [base.speed[0] * k, base.speed[1] * k] } : base
    return addParticles(plan, { x: L.cx, y: oy, w: Math.max(L.w, 80), h: 10 }, n, null)
  }

  function floatText(target, text, { tone = 'gold', size = '' } = {}) {
    if (destroyed) return null
    const isRed = red()
    const L = local(target)
    if (!L) return null
    const el = take('vfx-text')
    if (!el) return null
    el.textContent = String(text ?? '').slice(0, 40)
    el.setAttribute('data-tone', String(tone || 'gold'))
    if (size) el.setAttribute('data-size', String(size))
    // điểm (ngón tay): đặt cao hơn ngón 48px; phần tử: ở phần trên của phần tử
    let x = L.point ? L.x : L.cx
    let y = L.point ? L.y - 48 : L.y + Math.min(L.h * 0.3, 48)
    x = Math.max(56, Math.min((L.W || x + 56) - 56, x))
    y = Math.max(40, Math.min((L.H || y + 10) - 10, y))
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    const T = 'translate(-50%, -100%)'
    if (isRed) {
      run(el, [
        { opacity: 0, transform: T },
        { opacity: 1, transform: T, offset: 0.15 },
        { opacity: 1, transform: T, offset: 0.75 },
        { opacity: 0, transform: T }
      ], { duration: 700, easing: 'linear' })
    } else {
      run(el, [
        { opacity: 0, transform: `${T} translateY(10px) scale(.55)` },
        { opacity: 1, transform: `${T} translateY(-4px) scale(1.14)`, offset: 0.18 },
        { opacity: 1, transform: `${T} translateY(-10px) scale(1)`, offset: 0.32 },
        { opacity: 1, transform: `${T} translateY(-34px) scale(1)`, offset: 0.8 },
        { opacity: 0, transform: `${T} translateY(-46px) scale(.96)` }
      ], { duration: 820, easing: 'linear' })
    }
    return el
  }

  function ripple(x, y) {
    if (destroyed) return null
    const pt = typeof x === 'object' && x ? rectOf(x) : { left: Number(x), top: Number(y), width: 0, height: 0 }
    if (!pt || !Number.isFinite(pt.left) || !Number.isFinite(pt.top)) return null
    const L = local({ x: pt.left + pt.width / 2, y: pt.top + pt.height / 2 })
    if (!L) return null
    const el = take('vfx-ripple')
    if (!el) return null
    el.style.left = `${L.x}px`
    el.style.top = `${L.y}px`
    if (red()) run(el, [{ opacity: 0.4, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1)' }], { duration: 250, easing: 'linear' })
    else run(el, [{ opacity: 0.5, transform: 'scale(.2)' }, { opacity: 0, transform: 'scale(1.35)' }], { duration: 250, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' })
    return el
  }

  // Giảm chuyển động: chớp viền đỏ tĩnh thay cho rung.
  function flashAlert(el) {
    if (!el || !el.classList) return null
    el.classList.add('vfx-alert')
    later(() => { try { el.classList.remove('vfx-alert') } catch { /* bỏ qua */ } }, 380)
    return null
  }

  function shake(el, power = 1) {
    if (destroyed || !el) return null
    if (red()) return flashAlert(el)
    const p = Math.max(1, Math.min(3, Math.round(Number(power) || 1)))
    const amp = [2, 4, 6][p - 1]
    const xs = [0, amp, -amp, amp * 0.7, -amp * 0.5, amp * 0.3, -amp * 0.15, 0]
    const rot = p === 3 ? 0.5 : 0
    return animateExt(el, base => xs.map((x, i) => ({
      transform: `${base}translateX(${x.toFixed(2)}px) rotate(${((i % 2 ? -rot : rot) * (1 - i / (xs.length - 1))).toFixed(3)}deg)`
    })), { duration: [180, 260, 380][p - 1], easing: 'linear' })
  }

  function squash(el) {
    if (destroyed || !el || red()) return null
    return animateExt(el, base => [
      { transform: `${base}scale(1, 1)`, transformOrigin: '50% 100%' },
      { transform: `${base}scale(1.12, .86)`, transformOrigin: '50% 100%', offset: 0.2 },
      { transform: `${base}scale(.95, 1.06)`, transformOrigin: '50% 100%', offset: 0.5 },
      { transform: `${base}scale(1.02, .98)`, transformOrigin: '50% 100%', offset: 0.75 },
      { transform: `${base}scale(1, 1)`, transformOrigin: '50% 100%' }
    ], { duration: 420, easing: 'ease-out' })
  }

  function pop(el) {
    if (destroyed || !el) return null
    if (red()) return animateExt(el, () => [{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear' })
    return animateExt(el, base => [
      { opacity: 0, transform: `${base}scale(.4)` },
      { opacity: 1, transform: `${base}scale(1.12)`, offset: 0.6 },
      { opacity: 1, transform: `${base}scale(1)` }
    ], { duration: 320, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' })
  }

  // Đích nảy nhẹ khi xu / mảnh bay tới (két, ví HUD).
  function bump(el) {
    if (!el || red()) return null
    return animateExt(el, base => [
      { transform: `${base}scale(1)` },
      { transform: `${base}scale(1.15)`, offset: 0.4 },
      { transform: `${base}scale(1)` }
    ], { duration: 180, easing: 'ease-out' })
  }

  // Dừng hình: đóng băng hạt và hoạt ảnh của lớp trong d ms (không phải chuyển động nên giữ cả khi giảm chuyển
  // động). Hẹn giờ riêng, không bị clear() hủy, để Promise luôn kết thúc.
  function hitstop(ms = 70) {
    const d = Math.max(0, Math.min(250, Math.round(Number(ms) || 0)))
    if (!d || destroyed) return Promise.resolve()
    frozen++
    for (const rec of live) { try { rec.anim && rec.anim.pause() } catch { /* bỏ qua */ } }
    return new Promise(resolve => {
      setTimeout(() => {
        frozen = Math.max(0, frozen - 1)
        if (!frozen) for (const rec of live) { try { rec.anim && rec.anim.play() } catch { /* bỏ qua */ } }
        resolve()
      }, d)
    })
  }

  // Bản sao để bay: bỏ id và data-testid (tránh trùng đích của e2e), tắt hoạt ảnh CSS của bản sao.
  function cloneForFlight(node, w, h) {
    const c = node.cloneNode(true)
    if (c.removeAttribute) { c.removeAttribute('id'); c.removeAttribute('data-testid') }
    if (typeof c.querySelectorAll === 'function') {
      for (const e of c.querySelectorAll('[id],[data-testid]')) { e.removeAttribute('id'); e.removeAttribute('data-testid') }
    }
    if (c.style) {
      c.style.position = 'absolute'
      c.style.left = '0'
      c.style.top = '0'
      c.style.margin = '0'
      c.style.width = `${w}px`
      c.style.height = `${h}px`
      c.style.transform = 'none'
      c.style.animation = 'none'
      c.style.transition = 'none'
      c.style.boxSizing = 'border-box'
    }
    return c
  }

  function fly(from, to, { node = null, html = '', ms = 450, arc = 0.35, scale = null, bump: doBump = true } = {}) {
    if (destroyed || red()) return Promise.resolve(false)
    const A = local(from), B = local(to)
    if (!A || !B) return Promise.resolve(false)
    const el = take('vfx-fly')
    if (!el) return Promise.resolve(false)
    const w = Math.max(1, A.w || 32), h = Math.max(1, A.h || 32)
    el.style.left = `${A.cx - w / 2}px`
    el.style.top = `${A.cy - h / 2}px`
    el.style.width = `${w}px`
    el.style.height = `${h}px`
    try {
      if (node && typeof node.cloneNode === 'function') el.appendChild(cloneForFlight(node, w, h))
      else if (html) el.innerHTML = String(html)
    } catch { /* nội dung lỗi: bay khung rỗng */ }
    const s = { x: A.cx, y: A.cy }, e = { x: B.cx, y: B.cy }
    const dist = Math.hypot(e.x - s.x, e.y - s.y)
    const c = { x: (s.x + e.x) / 2, y: Math.min(s.y, e.y) - (Number(arc) || 0) * dist }
    const ratio = B.w > 0 && B.h > 0 ? Math.max(B.w / w, B.h / h) : 1
    const sEnd = Number.isFinite(Number(scale)) && scale !== null ? Number(scale) : Math.max(0.25, Math.min(1.5, ratio))
    const K = 14
    const kf = []
    for (let i = 0; i <= K; i++) {
      const u = i / K
      const v = easeInOutCubic(u)
      const pt = bezier(s, c, e, v)
      const sc = 1 + (sEnd - 1) * v
      const rot = -7 * Math.sin(Math.PI * u)
      kf.push({ offset: u, transform: `translate(${(pt.x - s.x).toFixed(1)}px, ${(pt.y - s.y).toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})` })
    }
    const duration = Math.max(120, Math.min(1500, Number(ms) || 450))
    return run(el, kf, { duration, easing: 'linear' }).then(() => {
      if (doBump && to && typeof to.animate === 'function') bump(to)
      return true
    })
  }

  function coins(from, to, n = 8, { stagger = 40, ms = 620, bump: doBump = true } = {}) {
    if (destroyed || red()) return Promise.resolve(0)
    const A = local(from), B = local(to)
    if (!A || !B) return Promise.resolve(0)
    const count = Math.max(1, Math.min(12, Math.floor(Number(n) || 1)))
    const s = { x: A.cx, y: A.cy }, e = { x: B.cx, y: B.cy }
    const jobs = []
    const dur = Math.max(200, Math.min(1500, Number(ms) || 620))
    for (let i = 0; i < count; i++) {
      const el = take('vfx-coin')
      if (!el) break
      el.style.left = `${s.x}px`
      el.style.top = `${s.y}px`
      // tỏa ra quanh nguồn (chủ yếu lên trên), dừng một nhịp, rồi bay cong về đích
      const ang = UP + (Math.random() * 2 - 1) * 1.25
      const r = 26 + Math.random() * 30
      const m = { x: s.x + Math.cos(ang) * r, y: s.y + Math.sin(ang) * r }
      const c = { x: (m.x + e.x) / 2 + (Math.random() - 0.5) * 40, y: Math.min(m.y, e.y) - 50 - Math.random() * 40 }
      const K = 16
      const kf = []
      for (let k = 0; k <= K; k++) {
        const u = k / K
        let pt, sc
        if (u <= 0.28) {
          const v = easeOutCubic(u / 0.28)
          pt = { x: s.x + (m.x - s.x) * v, y: s.y + (m.y - s.y) * v }
          sc = 0.5 + 0.6 * v
        } else if (u <= 0.38) {
          pt = m
          sc = 1.1 - ((u - 0.28) / 0.1) * 0.1
        } else {
          const v = easeInQuad((u - 0.38) / 0.62)
          pt = bezier(m, c, e, v)
          sc = 1 - 0.35 * v
        }
        kf.push({ offset: u, opacity: u === 0 ? 0 : 1, transform: `translate(${(pt.x - s.x).toFixed(1)}px, ${(pt.y - s.y).toFixed(1)}px) scale(${sc.toFixed(3)})` })
      }
      jobs.push(run(el, kf, { duration: dur, delay: i * Math.max(0, Number(stagger) || 0), easing: 'linear' }).then(() => {
        if (doBump && to && typeof to.animate === 'function') bump(to)
      }))
    }
    return Promise.all(jobs).then(() => jobs.length)
  }

  function stats() {
    return { dom: layer ? layer.childElementCount : 0, particles: parts.length }
  }

  // Dọn ngay mọi hiệu ứng (trang ẩn, rời màn): hủy rAF, xóa hạt, trả nút về pool, kết thúc các Promise đang chờ.
  function clear() {
    const w0 = win()
    if (raf && w0 && typeof w0.cancelAnimationFrame === 'function') w0.cancelAnimationFrame(raf)
    raf = 0
    parts = []
    frozen = 0
    idleCanvas()
    for (const rec of [...live]) rec.end()
    for (const [el, anim] of [...extern]) { try { anim.cancel() } catch { /* bỏ qua */ } extern.delete(el) }
    for (const id of timers) clearTimeout(id)
    timers.clear()
    if (layer) {
      for (const el of [...layer.children]) if (el !== canvas) give(el)
    }
    if (doc && typeof doc.querySelectorAll === 'function') {
      for (const el of doc.querySelectorAll('.vfx-alert')) el.classList.remove('vfx-alert')
    }
  }

  function destroy() {
    if (destroyed) return
    clear()
    destroyed = true
    if (doc && typeof doc.removeEventListener === 'function') doc.removeEventListener('visibilitychange', onVisibility)
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer)
    layer = null
    canvas = null
    c2d = null
    pool.length = 0
  }

  return {
    get layer() { return ensureLayer() },
    burst,
    floatText,
    ripple,
    shake,
    squash,
    pop,
    hitstop,
    fly,
    coins,
    confetti,
    stats,
    clear,
    destroy
  }
}
