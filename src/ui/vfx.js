// Hệ hiệu ứng (VFX) dùng chung cho giao diện M5: hạt vẽ trên canvas (lấp lánh, vụn, giọt, dầu, khói, sao, vỏ, xu,
// pháo giấy), chữ nổi (chống chồng), gợn chạm, rung, nảy, squash, dừng hình, "nhân bản rồi bay", luồng xu về két / ví
// HUD (Đợt 2: dừng giữa đường, số xu theo số tiền, onArrive từng xu) và bộ đếm số countUp cho ví HUD.
// Luật:
// - Chỉ animate transform/opacity (WAAPI) và vẽ canvas; will-change chỉ bật khi đang chạy.
// - Lớp .vfx-layer (z-index 25 trong .overlay-root) luôn pointer-events:none; tạo lười ở lần gọi đầu.
// - Tối đa VFX_LIMITS.dom nút trong lớp (kể cả canvas), tối đa VFX_LIMITS.particles hạt; canvas tạo lười, DPR ≤ 2,
//   rAF chỉ chạy khi còn hạt, hết hạt thì canvas rời lớp (đứng yên: stats().dom === 0); trang ẩn (visibilitychange)
//   thì dọn sạch và không nhận hiệu ứng mới cho tới khi trang hiện lại; đích đã rời DOM thì bỏ qua hiệu ứng.
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

// ---------- Luồng xu (tiền vào két / ví HUD) ----------

const num0 = v => (Number.isFinite(Number(v)) ? Number(v) : 0)
const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const lerp = (a, b, t) => a + (b - a) * t
const nowMs = () => (typeof performance !== 'undefined' && performance && typeof performance.now === 'function' ? performance.now() : Date.now())

// Số xu theo số tiền: ít nhất min, trần max (trần cứng 12), tăng theo log từ lo đến hi (đồng).
export const COIN_LIMITS = Object.freeze({ min: 6, max: 12, lo: 5000, hi: 200000 })
// Nhịp bay của một xu (ms): tỏa ra (out), DỪNG GIỮA ĐƯỜNG (hold), bay về đích (fly); xu sau phát trễ stagger,
// tổng độ trễ của cả đàn không quá spread (12 xu vẫn kết thúc gọn).
export const COIN_TIMING = Object.freeze({ out: 170, hold: 120, fly: 400, stagger: 40, spread: 480 })

/**
 * coinCount(amount, { min, max, lo, hi }) → số xu nên bay cho số tiền amount (đồng).
 * amount ≤ 0 hoặc lỗi → 0. amount ≤ lo → min; amount ≥ hi → max; ở giữa tăng theo log (không giảm khi tiền tăng).
 * Trần cứng COIN_LIMITS.max (12) dù truyền max lớn hơn. Vd mặc định: 5.000đ → 6, 20.000đ → 8, 50.000đ → 10, 200.000đ → 12.
 */
export function coinCount(amount, { min = COIN_LIMITS.min, max = COIN_LIMITS.max, lo = COIN_LIMITS.lo, hi = COIN_LIMITS.hi } = {}) {
  const a = Number(amount)
  if (!Number.isFinite(a) || a <= 0) return 0
  const top = clampN(Math.floor(num0(max)) || COIN_LIMITS.max, 1, COIN_LIMITS.max)
  const bot = clampN(Math.floor(num0(min)) || 1, 1, top)
  const L = num0(lo) > 0 ? num0(lo) : COIN_LIMITS.lo
  const Hh = num0(hi) > L ? num0(hi) : L * 40
  if (a <= L) return bot
  if (a >= Hh) return top
  const t = Math.log(a / L) / Math.log(Hh / L)
  return clampN(bot + Math.round((top - bot) * t), bot, top)
}

/**
 * coinShares(amount, n, unit = 1) → mảng n phần tiền (bội của unit) cộng lại ĐÚNG bằng amount; phần lẻ dưới một unit dồn
 * vào xu cuối. Dùng để ví HUD đếm lên theo từng xu tới đích. n ≤ 0 → []; amount âm → các phần âm.
 */
export function coinShares(amount, n, unit = 1) {
  const count = Math.max(0, Math.floor(num0(n)))
  if (!count) return []
  const a = num0(amount)
  if (!a) return new Array(count).fill(0)
  const sign = a < 0 ? -1 : 1
  const abs = Math.abs(a)
  const u = num0(unit) > 0 ? num0(unit) : 1
  const units = Math.floor(abs / u)
  const base = Math.floor(units / count)
  const extra = units - base * count
  const out = []
  for (let i = 0; i < count; i++) out.push((base + (i < extra ? 1 : 0)) * u)
  out[count - 1] += abs - units * u
  return out.map(v => (v === 0 ? 0 : sign * v))
}

// Thứ tự phát xu theo góc: từ giữa ra hai bên xen kẽ (đàn xu bung ra như quạt, không quét một chiều).
function fanOrder(count) {
  const c = (count - 1) / 2
  return [...Array(count).keys()].sort((a, b) => Math.abs(a - c) - Math.abs(b - c) || a - b)
}

/**
 * coinFlight(n, { from, to, ms, hold, stagger, rand }) → lịch bay của n xu (n kẹp trong [0, 12]):
 * [{ index, delay, duration, arriveAt, mid, ctrl, frames: [{ offset, x, y, scale, opacity }] }]
 * - Mỗi xu: tỏa ra từ from tới điểm mid (cách 48–84 px, hai vòng xen kẽ) trên cung quạt ±1,25 rad quanh hướng lên
 *   (easeOutCubic), ĐỨNG YÊN tại mid trong
 *   hold ms (mặc định 120), rồi bay cong Bézier (điểm kéo ctrl) về to, nhanh dần (easeInQuad), co lại 0,65.
 * - ms: thời gian chuyển động (tỏa ra + bay về, mặc định 570, kẹp 200–1500), KHÔNG tính hold; duration = ms + hold.
 * - delay = index × stagger, stagger tự giảm để cả đàn trễ tối đa COIN_TIMING.spread ms. arriveAt = delay + duration.
 * - frames: offset tăng dần trong [0, 1]; khung đầu ở from (mờ, nhỏ), khung cuối đúng to. Tọa độ cùng hệ với from / to.
 */
export function coinFlight(n, { from = null, to = null, ms = null, hold = COIN_TIMING.hold, stagger = COIN_TIMING.stagger, rand = Math.random } = {}) {
  const count = clampN(Math.floor(num0(n)), 0, COIN_LIMITS.max)
  if (!count) return []
  const R = typeof rand === 'function' ? rand : Math.random
  const s = { x: num0(from && from.x), y: num0(from && from.y) }
  const e = { x: num0(to && to.x), y: num0(to && to.y) }
  const base = COIN_TIMING.out + COIN_TIMING.fly
  const move = ms === null || ms === undefined || !Number.isFinite(Number(ms)) ? base : clampN(Number(ms), 200, 1500)
  const out = Math.round(move * COIN_TIMING.out / base)
  const fly = move - out
  const hd = clampN(Number.isFinite(Number(hold)) && hold !== null ? Number(hold) : COIN_TIMING.hold, 0, 400)
  const dur = out + hd + fly
  const st = count > 1 ? Math.min(Math.max(0, num0(stagger)), COIN_TIMING.spread / (count - 1)) : 0
  const order = fanOrder(count)
  const K1 = 4, K2 = 10
  const res = []
  for (let i = 0; i < count; i++) {
    const u = count === 1 ? 0.5 : order[i] / (count - 1)
    const ang = UP + (u - 0.5) * 2.5 + (R() - 0.5) * 0.16
    const r = (i % 2 ? 72 : 48) + R() * 12      // hai vòng xen kẽ: xu liền nhau không đè lên nhau lúc dừng
    const m = { x: s.x + Math.cos(ang) * r, y: s.y + Math.sin(ang) * r }
    const side = m.x >= s.x ? 1 : -1
    const c = { x: (m.x + e.x) / 2 + side * (18 + R() * 30), y: Math.min(m.y, e.y) - 40 - R() * 36 }
    const frames = [{ offset: 0, x: s.x, y: s.y, scale: 0.45, opacity: 0 }]
    for (let k = 1; k <= K1; k++) {
      const v = easeOutCubic(k / K1)
      frames.push({ offset: (out * k) / K1 / dur, x: lerp(s.x, m.x, v), y: lerp(s.y, m.y, v), scale: 0.45 + 0.65 * v, opacity: 1 })
    }
    // dừng giữa đường: đứng yên tại mid trong hd ms (chỉ co nhẹ 1,1 → 1)
    if (hd > 0) frames.push({ offset: (out + hd) / dur, x: m.x, y: m.y, scale: 1, opacity: 1 })
    for (let k = 1; k <= K2; k++) {
      const v = easeInQuad(k / K2)
      const pt = bezier(m, c, e, v)
      frames.push({ offset: k === K2 ? 1 : (out + hd + (fly * k) / K2) / dur, x: k === K2 ? e.x : pt.x, y: k === K2 ? e.y : pt.y, scale: 1 - 0.35 * v, opacity: 1 })
    }
    const delay = Math.round(i * st)
    res.push({ index: i, delay, duration: dur, arriveAt: delay + dur, mid: m, ctrl: c, frames })
  }
  return res
}

/**
 * countValue(from, to, t, step = 1) → số hiển thị ở tiến độ t ∈ [0, 1] khi đếm từ from lên (hoặc xuống) to:
 * easeOutCubic, làm tròn theo step, luôn nằm giữa from và to; t ≤ 0 → from, t ≥ 1 (hoặc lỗi) → đúng to.
 * from lỗi → coi như to; to lỗi → from (hoặc 0).
 */
export function countValue(from, to, t, step = 1) {
  const bRaw = Number(to)
  const aRaw = Number(from)
  if (!Number.isFinite(bRaw)) return Number.isFinite(aRaw) ? aRaw : 0
  const a = Number.isFinite(aRaw) && from !== null ? aRaw : bRaw
  const x = Number(t)
  if (!Number.isFinite(x) || x >= 1) return bRaw
  if (x <= 0) return a
  const st = num0(step) > 0 ? num0(step) : 1
  const v = Math.round((a + (bRaw - a) * easeOutCubic(x)) / st) * st
  return clampN(v, Math.min(a, bRaw), Math.max(a, bRaw))
}

// Bộ đếm số đang chạy trên từng phần tử (countUp): phần tử → bộ đếm (WeakMap, không giữ phần tử đã rời trang).
const COUNTERS = new WeakMap()

/** isCounting(el) → true khi el đang có bộ đếm countUp chạy (vd HUD bỏ qua lần ghi số của chính nó lúc này). */
export function isCounting(el) {
  return !!el && typeof el === 'object' && COUNTERS.has(el)
}

/**
 * countUp(el, from, to, ms = 600, fmt = String, { reduced, step, glow, onDone }) → { done, value, finish(), cancel() }
 * Đếm chữ của el từ from tới to trong ms (easeOutCubic qua countValue), mỗi khung ghi el.textContent = fmt(số).
 * KHÔNG đụng data-* của el (vd data-amount của ví HUD vẫn do HUD ghi số thật).
 * - from null/undefined: tiếp từ số đang hiện của bộ đếm cũ trên el (xu tới liên tiếp → đếm nối, không giật lùi), hoặc
 *   số bộ đếm đã ghi lần cuối nếu chữ trên el chưa bị bên khác ghi đè; không biết số đang hiện thì hiện thẳng to.
 *   Gọi lại trên cùng el thì bộ đếm cũ dừng tại chỗ (done của nó → false).
 * - reduced (mặc định isReduced(); nhận boolean hoặc hàm): cập nhật ngay + một nhịp sáng (glow), không đếm.
 * - glow: 'auto' (mặc định: chỉ khi giảm chuyển động), true (cả khi đếm xong), false (không); hàm (el) → vẽ nhịp sáng.
 *   Bản rời này không có lớp hiệu ứng nên chỉ gọi glow khi glow là hàm; vfx.countUp tự vẽ nhịp sáng trong .vfx-layer.
 * - done: Promise<boolean> — true khi đã ghi số cuối (chạy hết hoặc finish()), false khi bị cancel() / bộ đếm mới thay.
 * - Trang ẩn (rAF dừng) vẫn kết thúc nhờ hẹn giờ an toàn ms + 250.
 */
export function countUp(el, from, to, ms = 600, fmt = null, opts = {}) {
  const o = opts && typeof opts === 'object' ? opts : {}
  let red
  try {
    red = typeof o.reduced === 'function' ? !!o.reduced() : (o.reduced === null || o.reduced === undefined ? isReduced() : !!o.reduced)
  } catch { red = false }
  return startCount(el, from, to, ms, fmt, { ...o, reduced: red, glow: typeof o.glow === 'function' ? o.glow : null, glowMode: glowModeOf(o.glow) })
}

const glowModeOf = g => (g === false ? 'never' : g === true ? 'always' : 'auto')

// Số mà bộ đếm ghi lần cuối lên từng phần tử (kèm chữ đã ghi): from = null mà không còn bộ đếm chạy thì đếm tiếp từ số
// này — chỉ khi chữ trên phần tử vẫn đúng là chữ bộ đếm đã ghi (bên khác ghi đè rồi thì không tin nữa).
const SHOWN = new WeakMap()
function shownValue(el) {
  const s = el && typeof el === 'object' ? SHOWN.get(el) : null
  return s && el.textContent === s.text ? s.value : null
}

function startCount(el, from, to, ms, fmt, { reduced = false, step = 1, glow = null, glowMode = 'auto', onDone = null } = {}) {
  const target = Number(to)
  const f = typeof fmt === 'function' ? fmt : v => String(v)
  const isEl = !!el && typeof el === 'object'
  const write = v => {
    if (!isEl) return
    try {
      el.textContent = f(v)
      SHOWN.set(el, { value: v, text: el.textContent })
    } catch { /* định dạng lỗi: bỏ qua */ }
  }
  const prev = isEl ? COUNTERS.get(el) : null
  let start = Number(from)
  if (from === null || from === undefined || !Number.isFinite(start)) start = prev ? prev.value : (shownValue(el) ?? target)
  if (prev) prev.stop()
  let cur = Number.isFinite(start) ? start : target
  let over = false
  let rafId = null            // { raf: id } hoặc { timer: id } (không có rAF, vd Node)
  let safety = 0
  let resolve = null
  const done = new Promise(r => { resolve = r })
  const win = (el && el.ownerDocument && el.ownerDocument.defaultView) || (typeof window !== 'undefined' ? window : null)
  const hasRaf = !!win && typeof win.requestAnimationFrame === 'function'
  const caf = () => {
    if (!rafId) return
    try {
      if (rafId.raf !== undefined) { if (typeof win.cancelAnimationFrame === 'function') win.cancelAnimationFrame(rafId.raf) } else clearTimeout(rafId.timer)
    } catch { /* bỏ qua */ }
    rafId = null
  }
  const raf = cb => (hasRaf ? { raf: win.requestAnimationFrame(cb) } : { timer: setTimeout(cb, 16) })
  const doGlow = () => {
    if (typeof glow !== 'function') return
    try { glow(el) } catch { /* bỏ qua */ }
  }
  const settle = ok => {
    over = true
    caf()
    if (safety) { clearTimeout(safety); safety = 0 }
    if (isEl && COUNTERS.get(el) === handle) COUNTERS.delete(el)
    resolve(ok)
    if (ok && typeof onDone === 'function') { try { onDone(target) } catch { /* bỏ qua */ } }
  }
  const handle = {
    done,
    get value() { return cur },
    // nhảy tới số cuối ngay (dọn lớp, rời màn, trang ẩn)
    finish() {
      if (over) return
      cur = target
      write(target)
      if (glowMode === 'always') doGlow()
      settle(true)
    },
    // dừng tại chỗ (giữ số đang hiện)
    cancel() { if (!over) settle(false) },
    stop() { if (!over) settle(false) }
  }
  if (!Number.isFinite(target)) { settle(false); return handle }
  const dur = clampN(num0(ms), 0, 3000)
  if (reduced || dur <= 0 || cur === target) {
    const before = isEl ? el.textContent : null
    cur = target
    write(target)
    const changed = start !== target || (isEl && el.textContent !== before)
    if (changed && (glowMode === 'always' || (glowMode === 'auto' && reduced))) doGlow()
    over = true
    Promise.resolve().then(() => settle(true))
    return handle
  }
  if (isEl) COUNTERS.set(el, handle)
  const a = cur
  const t0 = nowMs()
  write(a)
  const tick = () => {
    rafId = null
    if (over) return
    const p = (nowMs() - t0) / dur
    if (p >= 1) { handle.finish(); return }
    const v = countValue(a, target, p, step)
    if (v !== cur) { cur = v; write(v) }
    rafId = raf(tick)
  }
  rafId = raf(tick)
  safety = setTimeout(() => { safety = 0; handle.finish() }, dur + 250)
  return handle
}

// ---------- Chữ nổi: chuyển động và chống chồng ----------

// Thời gian sống của chữ nổi (ms) và đường bay lên: [phần thời gian, translateY px, scale, opacity] (khung WAAPI).
export const FLOAT_MS = Object.freeze({ normal: 820, reduced: 700 })
const RISE = Object.freeze([[0, 10, 0.55, 0], [0.18, -4, 1.14, 1], [0.32, -10, 1, 1], [0.8, -34, 1, 1], [1, -46, 0.96, 0]])
const FLOAT_LIVE = 0.88         // chữ đã mờ quá nửa (88% đời, pha mờ dần bắt đầu ở 80%) thì không còn tính là vướng
const FLOAT_MERGE_MS = 160      // cùng chữ, gần như cùng chỗ, cách nhau < 160 ms → gộp "×2"
const FLOAT_MERGE_PX = 16
const FLOAT_SAMPLE_MS = 50

/** floatRise(age, reduced) → độ dời dọc (px, âm là lên) của chữ nổi ở tuổi age ms. Giảm chuyển động: luôn 0. */
export function floatRise(age, reduced = false) {
  if (reduced) return 0
  const u = clamp01(num0(age) / FLOAT_MS.normal)
  for (let i = 1; i < RISE.length; i++) {
    const [o0, y0] = RISE[i - 1]
    const [o1, y1] = RISE[i]
    if (u <= o1) return y0 + ((y1 - y0) * (u - o0)) / (o1 - o0)
  }
  return RISE[RISE.length - 1][1]
}

/**
 * floatSlot(active, cand, { now, minY, gap, zig, maxLift, reduced }) → { x, y, lift, merge }
 * Chọn chỗ cho chữ nổi mới cand { x, y, w, h, text } (x, y: tâm-đáy của chữ, tọa độ lớp) để KHÔNG đè chữ đang bay.
 * active: chữ đang bay [{ x, y, w, h, t (ms lúc hiện), text, reduced }]. Hai chữ bay lên theo cùng đường floatRise
 * nhưng lệch tuổi, nên xét chồng ở mọi thời điểm cả hai còn hiện (lấy mẫu 50 ms), không chỉ lúc mới hiện.
 * - Cùng chữ, cách < 16 px, hiện chưa tới 160 ms → gộp: merge = chữ cũ, (x, y) = chỗ chữ cũ đang đứng (bên gọi thay chữ cũ
 *   bằng "chữ ×2" ở đó).
 * - Vướng → dời lên vừa đủ để đáy chữ mới luôn cao hơn đỉnh chữ vướng gap px (mặc định 4), so le ngang ±zig px (14),
 *   lặp tối đa maxLift (4) tầng; lift = số tầng đã dời.
 * - Dời lên tới quá mép trên minY (40) hoặc hết tầng → gộp vào chữ đang vướng gần nhất (merge, lift 0).
 */
export function floatSlot(active, cand, { now = 0, minY = 40, gap = 4, zig = 14, maxLift = 4, reduced = false } = {}) {
  const c = {
    x: num0(cand && cand.x), y: num0(cand && cand.y),
    w: Math.max(1, num0(cand && cand.w)), h: Math.max(1, num0(cand && cand.h)),
    text: String((cand && cand.text) ?? '')
  }
  const t = num0(now)
  const lifeC = (reduced ? FLOAT_MS.reduced : FLOAT_MS.normal) * FLOAT_LIVE
  const live = []
  for (const e of active && typeof active[Symbol.iterator] === 'function' ? active : []) {
    if (!e) continue
    const age = Math.max(0, t - num0(e.t))
    const life = (e.reduced ? FLOAT_MS.reduced : FLOAT_MS.normal) * FLOAT_LIVE
    if (age >= life) continue
    live.push({ e, age, life, w: Math.max(1, num0(e.w)), h: Math.max(1, num0(e.h)), x: num0(e.x), y: num0(e.y) })
  }
  const riseC = tau => floatRise(tau, reduced)
  const riseE = (L, tau) => floatRise(L.age + tau, !!L.e.reduced)
  const mergeInto = L => ({ x: L.x, y: L.y + riseE(L, 0) - riseC(0), lift: 0, merge: L.e })
  if (!live.length) return { x: c.x, y: c.y, lift: 0, merge: null }

  let twin = null
  for (const L of live) {
    if (L.e.text !== c.text || L.age >= FLOAT_MERGE_MS) continue
    if (Math.abs(L.x - c.x) > FLOAT_MERGE_PX || Math.abs(L.y - c.y) > FLOAT_MERGE_PX) continue
    if (!twin || L.age < twin.age) twin = L
  }
  if (twin) return mergeInto(twin)

  // Khoảng dời dọc (≤ 0) để chữ mới ở (x, y) nằm hẳn trên chữ L suốt lúc cả hai còn hiện; 0 khi không vướng.
  const needFor = (L, x, y) => {
    if (Math.abs(L.x - x) >= (L.w + c.w) / 2) return 0
    let clash = false
    let need = 0
    for (let tau = 0; tau < lifeC && L.age + tau < L.life; tau += FLOAT_SAMPLE_MS) {
      const botE = L.y + riseE(L, tau), topE = botE - L.h
      const botC = y + riseC(tau), topC = botC - c.h
      if (botC > topE - gap && topC < botE + gap) clash = true
      need = Math.min(need, topE - gap - botC)
    }
    return clash ? need : 0
  }
  let x = c.x, y = c.y
  let first = null
  for (let k = 0; k <= maxLift; k++) {
    let need = 0
    for (const L of live) {
      const d = needFor(L, x, y)
      if (d < need) need = d
      if (d < 0 && !first) first = L
    }
    if (need >= 0) return { x, y, lift: k, merge: null }
    if (k === maxLift) break
    y += need
    x = c.x + (k % 2 === 0 ? zig : -zig)
    if (y < minY) break
  }
  // không còn chỗ phía trên: gộp vào chữ vướng gần chỗ định đặt nhất
  let near = first || live[0]
  let best = Infinity
  for (const L of live) {
    const d = Math.hypot(L.x - c.x, L.y + riseE(L, 0) - (c.y + riseC(0)))
    if (d < best) { best = d; near = L }
  }
  return mergeInto(near)
}

// Kích thước ước lượng của chữ nổi (không đo DOM để khỏi ép trình duyệt tính bố cục giữa lúc chơi): Baloo 2 đậm 800,
// cỡ 26px (small 18, big 32), mỗi ký tự ~0,6em, cao = cỡ chữ + viền mực.
function floatBox(text, size) {
  const fs = size === 'small' ? 18 : size === 'big' ? 32 : 26
  return { w: Math.round(String(text).length * fs * 0.6 + 8), h: fs + 6 }
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

// Hình chữ nhật (tọa độ khung nhìn) của đích. Phần tử đã rời DOM (isConnected === false) hoặc không có hộp hiển thị
// (display: none, getClientRects() rỗng) → null, để hiệu ứng không nổ ở góc trên-trái (0, 0).
function rectOf(t) {
  if (!t) return null
  try {
    if (typeof t.getBoundingClientRect === 'function') {
      if (t.isConnected === false) return null
      if (typeof t.getClientRects === 'function' && t.getClientRects().length === 0) return null
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
 *   floatText(target, text, { tone, size }) chữ nổi bay lên (tone: gold | good | bad | info | sky) → phần tử; chữ trước
 *                                           còn bay gần đó thì chữ mới dời lên trên, so le ngang (floatSlot), trùng chữ
 *                                           trùng chỗ trong 160 ms thì gộp thành "chữ ×2" — không bao giờ đè nhau
 *   ripple(x, y)                            gợn chạm tại tọa độ khung nhìn (giữ khi giảm chuyển động, chỉ opacity)
 *   shake(el, power 1..3)                   rung ngang 2/4/6 px giảm dần (giảm chuyển động: chớp viền đỏ tĩnh)
 *   squash(el), pop(el)                     nảy squash 420 ms gốc ở đáy / bật vào easeOutBack (WAAPI)
 *   hitstop(ms)                             dừng hình 60–90 ms (Promise), giữ cả khi giảm chuyển động
 *   fly(from, to, { node, html, ms, arc, scale, bump }) "nhân bản rồi bay" theo cung Bézier → Promise<boolean>
 *   coins(from, to, n, { stagger, ms, hold, bump, amount, unit, onArrive, scale }) luồng xu: tỏa ra, dừng giữa đường
 *                                           120 ms, bay về đích; số xu theo amount (coinCount, có trần); onArrive mỗi xu
 *                                           để HUD đếm lên → Promise<số xu đã bay>
 *   countUp(el, from, to, ms = 600, fmt)    đếm chữ số của el (ví HUD) → { done, value, finish(), cancel() }; giảm chuyển
 *                                           động: cập nhật ngay + một nhịp sáng; clear() cho nhảy tới số cuối
 *   counting(el)                            el đang có bộ đếm chạy (HUD đừng ghi đè chữ lúc này)
 *   glow(target)                            một nhịp sáng ôm đích (giảm chuyển động: chỉ opacity) → phần tử | null
 *   confetti(target, n = 36)                pháo giấy trên canvas → số mảnh đã tạo
 *   stats() → { dom, particles }            số nút đang nằm trong lớp, số hạt canvas (canvas cũng ghi data-n)
 *   clear(), destroy()
 * }
 * target / from / to: phần tử, hình chữ nhật { left, top, width, height } hoặc điểm { x, y } (tọa độ khung nhìn).
 * reduced: hàm () → boolean (mặc định isReduced() của motion.js) hoặc giá trị boolean.
 * Quy ước dọn:
 * - Hết hạt thì canvas được gỡ khỏi lớp (giữ tham chiếu để dùng lại), nên đứng yên ~1 s sau hiệu ứng cuối thì
 *   stats().dom === 0 và stats().particles === 0.
 * - Đích là phần tử đã rời DOM hoặc không hiển thị → hiệu ứng không chạy (burst/confetti → 0, floatText/ripple → null,
 *   fly → false, coins → 0).
 * - Trang đang ẩn (document.visibilityState === 'hidden') → không nhận hiệu ứng mới (cùng giá trị trả như trên;
 *   shake/squash/pop → null). Lúc trang chuyển sang ẩn thì clear().
 * - fly/coins bị clear() / destroy() / hủy hoạt ảnh giữa chừng → Promise trả false / chỉ đếm xu đã tới đích (onArrive của
 *   coins vẫn giao nốt phần tiền còn lại, cut: true); bộ đếm countUp nhảy tới số cuối.
 * - Chỉ nút do vfx tự tạo mới vào pool. Nút module khác tự chèn vào lớp (vd bản sao phiếu) thì clear() chỉ gỡ ra,
 *   không tái dùng, không hủy hoạt ảnh của nó.
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
  const pool = []                 // phần tử rảnh để dùng lại (chỉ nút do vfx tự tạo)
  const owned = new WeakSet()     // nút do vfx tự tạo (khác nút module khác chèn vào lớp)
  const live = new Set()          // hiệu ứng đang chạy trong lớp: { el, anim, end }
  const extern = new Map()        // phần tử ngoài lớp → Animation (rung, nảy…)
  const timers = new Set()

  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn() }, ms)
    timers.add(id)
    return id
  }
  const win = () => (doc && doc.defaultView) || (typeof window !== 'undefined' ? window : null)

  // Trang đang ẩn: không nhận hiệu ứng mới (rAF dừng khi ẩn, hạt sẽ đứng yên rồi bung ra lúc quay lại).
  function pageHidden() {
    const d = doc || (host && host.ownerDocument) || (typeof document !== 'undefined' ? document : null)
    return !!d && d.visibilityState === 'hidden'
  }
  // Không nhận hiệu ứng mới: đã destroy() hoặc trang đang ẩn.
  const blocked = () => destroyed || pageHidden()

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

  // Lấy một nút từ pool (null nếu đã đủ VFX_LIMITS.dom nút trong lớp, hoặc trang đang ẩn).
  function take(cls) {
    if (blocked() || !ensureLayer()) return null
    if (layer.childElementCount >= VFX_LIMITS.dom) return null
    let el = pool.pop()
    if (!el) {
      el = doc.createElement('div')
      owned.add(el)
    }
    el.className = cls
    el.removeAttribute('style')
    el.removeAttribute('data-kind')
    el.removeAttribute('data-tone')
    el.removeAttribute('data-size')
    el.textContent = ''
    layer.appendChild(el)
    return el
  }

  // Trả nút về pool. Nút lạ (module khác chèn vào lớp) thì chỉ gỡ khỏi lớp: không hủy hoạt ảnh, không xóa nội dung,
  // không tái dùng — module chủ vẫn giữ tham chiếu tới nó.
  function give(el) {
    if (!el) return
    if (!owned.has(el)) {
      if (el.parentNode) el.parentNode.removeChild(el)
      return
    }
    try { if (typeof el.getAnimations === 'function') for (const a of el.getAnimations()) a.cancel() } catch { /* bỏ qua */ }
    if (el.parentNode) el.parentNode.removeChild(el)
    el.textContent = ''
    if (pool.length < VFX_LIMITS.dom && !pool.includes(el)) pool.push(el)
  }

  // Chạy WAAPI trên nút của lớp; xong (hoặc bị hủy, hoặc quá giờ an toàn) thì trả nút về pool.
  // → Promise<boolean>: true khi chạy hết (hoặc quá giờ an toàn), false khi bị hủy / clear() giữa chừng.
  function run(el, keyframes, opts) {
    return new Promise(resolve => {
      const rec = { el, anim: null, done: false, end: null }
      rec.end = (ok = true) => {
        if (rec.done) return
        rec.done = true
        live.delete(rec)
        give(el)
        resolve(ok !== false)
      }
      live.add(rec)
      let anim = null
      try {
        el.style.willChange = 'transform, opacity'
        anim = typeof el.animate === 'function' ? el.animate(keyframes, { fill: 'both', ...opts }) : null
      } catch { anim = null }
      if (!anim) { rec.end(true); return }
      rec.anim = anim
      if (frozen) { try { anim.pause() } catch { /* bỏ qua */ } }
      anim.addEventListener('finish', () => rec.end(true))
      anim.addEventListener('cancel', () => rec.end(false))
      later(() => rec.end(true), (opts.delay || 0) + (opts.duration || 0) + 700)
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
    if (blocked() || !ensureLayer()) return null
    if (!canvas) {
      if (layer.childElementCount >= VFX_LIMITS.dom) return null
      const cv = doc.createElement('canvas')
      let g = null
      try { g = cv.getContext('2d') } catch { g = null }
      if (!g) return null
      canvas = cv
      c2d = g
      owned.add(canvas)
      canvas.className = 'vfx-canvas'
      canvas.setAttribute('data-n', '0')
      shownN = 0
    }
    // canvas được gỡ khỏi lớp lúc hết hạt (idleCanvas): gắn lại ở đáy lớp, vẫn tính vào giới hạn số nút
    if (canvas.parentNode !== layer) {
      if (layer.childElementCount >= VFX_LIMITS.dom) return null
      layer.insertBefore(canvas, layer.firstChild)
    }
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

  // Hết hạt: dừng rAF, nhả bộ nhớ canvas (iOS tốn RAM cho canvas lớn) và gỡ canvas khỏi lớp (giữ tham chiếu để dùng
  // lại), để lớp về 0 nút khi đứng yên.
  function idleCanvas() {
    lastTs = 0
    if (canvas) {
      setCount(0)
      canvas.width = 0
      canvas.height = 0
      cw = 0; ch = 0
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
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
    if (blocked()) return 0
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
    if (blocked() || red()) return 0
    const L = local(target)
    if (!L) return 0
    const base = particlePlan('confetti', false)
    const oy = L.y + L.h * 0.35
    // đích sát mép trên thì bắn nhẹ hơn để pháo giấy không vọt khỏi màn
    const k = Math.max(0.45, Math.min(1, oy / Math.max(1, (L.H || oy) * 0.45)))
    const plan = k < 1 ? { ...base, speed: [base.speed[0] * k, base.speed[1] * k] } : base
    return addParticles(plan, { x: L.cx, y: oy, w: Math.max(L.w, 80), h: 10 }, n, null)
  }

  // Chữ nổi đang bay (chống chồng): { el, rec, x, y, w, h, t, text, n, reduced }.
  const floats = new Set()

  // Bỏ ngay một chữ nổi (khi gộp vào chữ mới): kết thúc hoạt ảnh, trả nút về pool.
  function dropFloat(entry) {
    floats.delete(entry)
    for (const rec of live) {
      if (rec.el === entry.el) { rec.end(false); return }
    }
  }

  function floatText(target, text, { tone = 'gold', size = '' } = {}) {
    if (blocked()) return null
    const isRed = red()
    const L = local(target)
    if (!L) return null
    const base = String(text ?? '').slice(0, 40)
    // điểm (ngón tay): đặt cao hơn ngón 48px; phần tử: ở phần trên của phần tử
    const W = L.W || 0, H = L.H || 0
    const fitX = v => Math.max(56, Math.min((W || v + 56) - 56, v))
    const fitY = v => Math.max(40, Math.min((H || v + 10) - 10, v))
    const x0 = fitX(L.point ? L.x : L.cx)
    const y0 = fitY(L.point ? L.y - 48 : L.y + Math.min(L.h * 0.3, 48))
    // chống chồng: chữ trước còn bay gần đó thì dời chữ mới lên trên (so le ngang), hoặc gộp "×2" khi trùng hẳn
    const box = floatBox(base, size)
    const t = nowMs()
    // tuổi thật của chữ đang bay lấy theo thời gian của chính hoạt ảnh (đúng cả khi dừng hình hitstop làm chữ đứng lại)
    for (const e of floats) {
      const ct = e.rec && e.rec.anim ? Number(e.rec.anim.currentTime) : NaN
      if (Number.isFinite(ct)) e.t = t - ct
    }
    const slot = floatSlot(floats, { x: x0, y: y0, w: box.w, h: box.h, text: base }, { now: t, minY: 40, reduced: isRed })
    let n = 1
    if (slot.merge) {
      if (slot.merge.text === base) n = (slot.merge.n || 1) + 1
      dropFloat(slot.merge)
    }
    const el = take('vfx-text')
    if (!el) return null
    el.textContent = n > 1 ? `${base} ×${n}` : base
    el.setAttribute('data-tone', String(tone || 'gold'))
    if (size) el.setAttribute('data-size', String(size))
    const x = fitX(slot.x)
    const y = fitY(slot.y)
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    const entry = { el, x, y, w: box.w, h: box.h, t, text: base, n, reduced: isRed }
    floats.add(entry)
    const T = 'translate(-50%, -100%)'
    let job
    if (isRed) {
      job = run(el, [
        { opacity: 0, transform: T },
        { opacity: 1, transform: T, offset: 0.15 },
        { opacity: 1, transform: T, offset: 0.75 },
        { opacity: 0, transform: T }
      ], { duration: FLOAT_MS.reduced, easing: 'linear' })
    } else {
      // gộp: chữ "×2" hiện ngay chỗ chữ cũ, không nảy từ nhỏ lại từ đầu
      const kf = RISE.map(([o, dy, sc, op], i) => ({
        opacity: n > 1 && i === 0 ? 1 : op,
        transform: `${T} translateY(${dy}px) scale(${n > 1 && i === 0 ? 0.9 : sc})`,
        ...(i > 0 && i < RISE.length - 1 ? { offset: o } : {})
      }))
      job = run(el, kf, { duration: FLOAT_MS.normal, easing: 'linear' })
    }
    for (const rec of live) if (rec.el === el) entry.rec = rec
    job.then(() => floats.delete(entry))
    return el
  }

  function ripple(x, y) {
    if (blocked()) return null
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
    if (blocked() || !el) return null
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
    if (blocked() || !el || red()) return null
    return animateExt(el, base => [
      { transform: `${base}scale(1, 1)`, transformOrigin: '50% 100%' },
      { transform: `${base}scale(1.12, .86)`, transformOrigin: '50% 100%', offset: 0.2 },
      { transform: `${base}scale(.95, 1.06)`, transformOrigin: '50% 100%', offset: 0.5 },
      { transform: `${base}scale(1.02, .98)`, transformOrigin: '50% 100%', offset: 0.75 },
      { transform: `${base}scale(1, 1)`, transformOrigin: '50% 100%' }
    ], { duration: 420, easing: 'ease-out' })
  }

  function pop(el) {
    if (blocked() || !el) return null
    if (red()) return animateExt(el, () => [{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear' })
    return animateExt(el, base => [
      { opacity: 0, transform: `${base}scale(.4)` },
      { opacity: 1, transform: `${base}scale(1.12)`, offset: 0.6 },
      { opacity: 1, transform: `${base}scale(1)` }
    ], { duration: 320, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' })
  }

  // Đích nảy nhẹ khi xu / mảnh bay tới (két, ví HUD).
  function bump(el) {
    if (blocked() || !el || red()) return null
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
    if (blocked() || red()) return Promise.resolve(false)
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
    // bị clear() / hủy giữa chừng → false, không nảy đích
    return run(el, kf, { duration, easing: 'linear' }).then(ok => {
      if (ok && doBump && to && typeof to.animate === 'function') bump(to)
      return ok
    })
  }

  /**
   * coins(from, to, n = 8, { stagger, ms, hold, bump, amount, unit, onArrive, scale }) → Promise<số xu đã tới đích>
   * Luồng xu tiền vào két / ví HUD theo coinFlight: tỏa ra như quạt, DỪNG GIỮA ĐƯỜNG hold ms (120), rồi bay cong về đích;
   * đích nảy mỗi khi một xu chạm tới (bump, mặc định bật).
   * - n: số xu (1–12). Bỏ trống n (null / undefined, hoặc truyền thẳng đối tượng tùy chọn ở vị trí n) mà có amount thì
   *   số xu = coinCount(amount) (6–12 theo số tiền, có trần), không có amount thì 8 như cũ.
   * - onArrive({ index, count, share, sum, amount, last, skipped, cut }): gọi MỖI xu tới đích (index theo thứ tự tới,
   *   share = phần tiền của xu đó theo coinShares(amount, count, unit), sum = tổng đã tới) để HUD đếm lên theo xu.
   *   Luôn có đúng một lần gọi last === true và khi đó sum === amount: xu không bay được (giảm chuyển động, trang ẩn,
   *   đích ẩn, hết chỗ trong lớp) → một lần gọi gộp skipped: true (không đồng bộ, sau lời gọi coins); bị clear() / hủy giữa
   *   chừng → phần còn lại giao gộp trong lần gọi cuối cut: true. Lỗi trong onArrive bị nuốt.
   * - Giá trị trả giữ như cũ: số xu đã thật sự bay tới đích (giảm chuyển động / không bay được → 0).
   */
  function coins(from, to, n = 8, opts = {}) {
    let o = opts && typeof opts === 'object' ? opts : {}
    let want = n
    if (n && typeof n === 'object') { o = n; want = null }
    const {
      stagger = COIN_TIMING.stagger, ms = null, hold = COIN_TIMING.hold, bump: doBump = true,
      amount = null, unit = 1, onArrive = null, scale = 1
    } = o
    const amt = num0(amount)
    const send = info => {
      if (typeof onArrive !== 'function') return
      try { onArrive(info) } catch { /* lỗi bên gọi không chặn hiệu ứng */ }
    }
    const planned = want === null || want === undefined
      ? (amount !== null && amount !== undefined ? Math.max(1, coinCount(amt)) : 8)
      : clampN(Math.floor(Number(want) || 1), 1, COIN_LIMITS.max)
    // không bay được: giao gộp cả số tiền một lần (không đồng bộ, để bên gọi kịp dựng bộ đếm sau lời gọi coins)
    const skip = () => {
      if (typeof onArrive === 'function') {
        Promise.resolve().then(() => send({ index: -1, count: planned, share: amt, sum: amt, amount: amt, last: true, skipped: true, cut: false }))
      }
      return Promise.resolve(0)
    }
    if (blocked() || red()) return skip()
    const A = local(from), B = local(to)
    if (!A || !B) return skip()
    const s = { x: A.cx, y: A.cy }
    const plan = coinFlight(planned, { from: s, to: { x: B.cx, y: B.cy }, ms, hold, stagger })
    const k = Number(scale) > 0 ? Number(scale) : 1
    const els = []
    for (const c of plan) {
      const el = take('vfx-coin')
      if (!el) break
      el.style.left = `${s.x}px`
      el.style.top = `${s.y}px`
      els.push([el, c])
    }
    if (!els.length) return skip()
    const count = els.length
    const shares = coinShares(amt, count, unit)
    let pending = count, got = 0, failed = 0, sum = 0, closed = false
    const jobs = els.map(([el, c]) => run(el, c.frames.map(f => ({
      offset: f.offset,
      opacity: f.opacity,
      transform: `translate(${(f.x - s.x).toFixed(1)}px, ${(f.y - s.y).toFixed(1)}px) scale(${(f.scale * k).toFixed(3)})`
    })), { duration: c.duration, delay: c.delay, easing: 'linear' }).then(ok => {
      pending--
      if (ok) {
        const share = shares[got] || 0
        got++
        sum += share
        if (doBump && to && typeof to.animate === 'function') bump(to)
        const last = pending === 0 && failed === 0
        if (last) closed = true
        send({ index: got - 1, count, share, sum, amount: amt, last, skipped: false, cut: false })
      } else {
        failed++
      }
      if (pending === 0 && !closed) {
        closed = true
        send({ index: -1, count, share: amt - sum, sum: amt, amount: amt, last: true, skipped: false, cut: true })
      }
      return ok
    }))
    // số xu đã tới đích (xu bị clear() / hủy giữa chừng không tính)
    return Promise.all(jobs).then(list => list.filter(Boolean).length)
  }

  // Nhịp sáng quanh đích (ví HUD, két): vòng sáng bo tròn ôm đích (lòng trong suốt), chỉ opacity khi giảm chuyển động.
  // → phần tử | null
  function glow(target) {
    if (blocked()) return null
    const L = local(target)
    if (!L) return null
    const el = take('vfx-ring')
    if (!el) return null
    el.setAttribute('data-kind', 'glow')
    const w = Math.max(28, L.w + 18), h = Math.max(28, L.h + 14)
    el.style.left = `${L.cx}px`
    el.style.top = `${L.cy}px`
    el.style.width = `${w}px`
    el.style.height = `${h}px`
    el.style.margin = `${(-h / 2).toFixed(1)}px 0 0 ${(-w / 2).toFixed(1)}px`
    el.style.borderRadius = `${(h / 2).toFixed(1)}px`
    el.style.borderWidth = '3px'
    // sáng ở viền và quầng ngoài, lòng trong suốt: không làm mờ con số vừa đổi
    el.style.background = 'none'
    el.style.boxShadow = '0 0 0 3px rgba(255, 246, 196, .55), 0 0 16px 6px rgba(255, 214, 90, .6)'
    if (red()) run(el, [{ opacity: 0 }, { opacity: 0.95, offset: 0.3 }, { opacity: 0 }], { duration: 480, easing: 'linear' })
    else {
      run(el, [
        { opacity: 0, transform: 'scale(.92)' },
        { opacity: 0.95, transform: 'scale(1.04)', offset: 0.3 },
        { opacity: 0, transform: 'scale(1.1)' }
      ], { duration: 480, easing: 'linear' })
    }
    return el
  }

  // Bộ đếm số do vfx này chạy: clear() / destroy() cho nhảy tới số cuối (không kẹt số dở dang).
  const counters = new Set()
  /**
   * countUp(el, from, to, ms = 600, fmt, opts) — như countUp() rời của module nhưng theo reduced() của vfx này, và nhịp
   * sáng vẽ trong .vfx-layer (glow 'auto': chỉ khi giảm chuyển động — "số cập nhật ngay, kèm một nhịp sáng").
   * Trang đang ẩn / vfx đã hủy: ghi thẳng số cuối, không nhịp sáng.
   */
  function countUpFx(el, from, to, ms = 600, fmt = null, opts = {}) {
    const o = opts && typeof opts === 'object' ? opts : {}
    const off = blocked()
    const h = startCount(el, from, to, off ? 0 : ms, fmt, {
      ...o,
      reduced: off || red(),
      glow: off ? null : (typeof o.glow === 'function' ? o.glow : glow),
      glowMode: off ? 'never' : glowModeOf(o.glow)
    })
    counters.add(h)
    h.done.then(() => counters.delete(h))
    return h
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
    floats.clear()
    for (const h of [...counters]) h.finish()
    for (const rec of [...live]) rec.end(false)
    for (const [el, anim] of [...extern]) { try { anim.cancel() } catch { /* bỏ qua */ } extern.delete(el) }
    for (const id of timers) clearTimeout(id)
    timers.clear()
    // nút của vfx về pool; nút lạ (module khác chèn vào) chỉ gỡ khỏi lớp, không tái dùng
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
    countUp: countUpFx,
    counting: isCounting,
    glow,
    confetti,
    stats,
    clear,
    destroy
  }
}
