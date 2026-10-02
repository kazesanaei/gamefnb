// Hàm thuần đo cử chỉ cho năm thao tác M5 (thiết kế mục 1.5): vẽ vòng (khuấy), vuốt theo hướng (gọt, tách trứng), độ phủ
// dải (gọt), đổi chiều và nhịp (lắc), kim thước lực (đập trứng), sàn giờ theo số lượng. Không chạm DOM, không đọc đồng hồ:
// bên gọi đưa tọa độ (px) và thời điểm (giây) vào → test được trong Node (tests/unit/m5-gesture.test.mjs).
import { stepLimitSec } from './_util.js'

const TAU = Math.PI * 2
const fin = (v, d = 0) => { const x = Number(v); return Number.isFinite(x) ? x : d }

/** Hệ số biến thiên (độ lệch chuẩn / trung bình) của dãy số dương; ít hơn 2 giá trị hợp lệ → 0. */
export function cvOf(list) {
  const xs = (Array.isArray(list) ? list : []).map(Number).filter(x => Number.isFinite(x) && x > 0)
  if (xs.length < 2) return 0
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  const v = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length
  return Math.round((Math.sqrt(v) / mean) * 1000) / 1000
}

/**
 * createTurnCounter({ cx, cy, minR }) → bộ đếm vòng quanh tâm (cx, cy).
 *   push(x, y, t) → số vòng hiện có. Góc được "tháo vòng" (cộng dồn từng bước nhỏ, mỗi bước kẹp trong (−π, π]) nên quay
 *   chiều nào cũng được; điểm nằm trong bán kính minR (sát tâm, góc vô nghĩa) bị bỏ và ngắt mạch (điểm kế tiếp bắt đầu lại).
 *   turns: số vòng đã quay (|góc ròng| lớn nhất từng đạt / 2π — không lùi khi người chơi đổi chiều).
 *   laps: số vòng trọn. speed(): vòng/giây trong cửa sổ gần nhất (mặc định 0,3 s). cv(): độ đều thời gian mỗi vòng trọn.
 *   lift(): nhấc ngón (điểm sau không nối với điểm trước). setCenter(cx, cy, minR): đổi tâm (vd sân khấu đổi cỡ).
 */
export function createTurnCounter({ cx = 0, cy = 0, minR = 0 } = {}) {
  let C = { x: fin(cx), y: fin(cy), r: Math.max(0, fin(minR)) }
  let prev = null            // góc điểm trước (null: chưa có / vừa ngắt mạch)
  let total = 0              // góc ròng đã cộng dồn (rad, có dấu)
  let best = 0               // |total| lớn nhất
  let laps = 0
  let lapStart = null        // thời điểm bắt đầu vòng hiện tại
  const lapTimes = []
  const samples = []         // [{ t, a }] a = |total| để đo tốc độ
  return {
    push(x, y, t = 0) {
      const dx = fin(x) - C.x, dy = fin(y) - C.y
      const time = fin(t)
      if (Math.hypot(dx, dy) < C.r || (dx === 0 && dy === 0)) { prev = null; return best / TAU }
      const ang = Math.atan2(dy, dx)
      if (prev !== null) {
        let d = ang - prev
        while (d > Math.PI) d -= TAU
        while (d <= -Math.PI) d += TAU
        total += d
      }
      prev = ang
      if (lapStart === null) lapStart = time
      if (Math.abs(total) > best) best = Math.abs(total)
      const done = Math.floor(best / TAU)
      while (laps < done) {
        laps++
        lapTimes.push(Math.max(0, time - lapStart))
        lapStart = time
      }
      samples.push({ t: time, a: Math.abs(total) })
      while (samples.length > 2 && samples[0].t < time - 1) samples.shift()
      return best / TAU
    },
    lift() { prev = null },
    setCenter(x, y, r = C.r) { C = { x: fin(x), y: fin(y), r: Math.max(0, fin(r)) }; prev = null },
    get turns() { return best / TAU },
    get laps() { return laps },
    get lapTimes() { return lapTimes.slice() },
    speed(windowSec = 0.3) {
      if (samples.length < 2) return 0
      const last = samples[samples.length - 1]
      let first = samples[0]
      for (const s of samples) { if (s.t >= last.t - windowSec) { first = s; break } }
      const dt = last.t - first.t
      if (dt <= 0) return 0
      return Math.abs(last.a - first.a) / TAU / dt
    },
    cv() { return cvOf(lapTimes) }
  }
}

/**
 * createSpillMeter({ max, holdSec, cooldownSec }) → đo "quay quá nhanh": push(speed, t) trả true đúng lúc một lần sánh ra
 * (tốc độ vượt max liên tục quá holdSec giây). Sau mỗi lần sánh phải chậm lại dưới max (hoặc chờ cooldownSec) mới tính lần sau.
 */
export function createSpillMeter({ max = 2.2, holdSec = 0.25, cooldownSec = 0.6 } = {}) {
  let overSince = null
  let lastSpill = -Infinity
  let armed = true
  let count = 0
  return {
    push(speed, t = 0) {
      const time = fin(t)
      if (fin(speed) <= max) { overSince = null; armed = true; return false }
      if (overSince === null) overSince = time
      if ((armed || time - lastSpill >= cooldownSec) && time - overSince >= holdSec) {
        count++
        lastSpill = time
        overSince = time
        armed = false
        return true
      }
      return false
    },
    get count() { return count }
  }
}

/**
 * classifySwipe(p0, p1, { axis: 'y'|'x', tolDeg, minLen, dir }) → { ok, reason, len, dev }
 * Vuốt từ p0 tới p1 có hợp lệ không: đủ dài (≥ minLen px), lệch khỏi trục ≤ tolDeg độ, đúng chiều (dir +1: xuống/phải,
 * −1: lên/trái, 0: chiều nào cũng được). reason: 'ok' | 'ngan' (quá ngắn) | 'lech' (nghiêng quá) | 'nguoc' (ngược chiều).
 */
export function classifySwipe(p0, p1, { axis = 'y', tolDeg = 35, minLen = 24, dir = 1 } = {}) {
  const dx = fin(p1 && p1.x) - fin(p0 && p0.x)
  const dy = fin(p1 && p1.y) - fin(p0 && p0.y)
  const len = Math.hypot(dx, dy)
  const along = axis === 'x' ? dx : dy
  const across = axis === 'x' ? dy : dx
  const dev = len > 0 ? Math.round(Math.atan2(Math.abs(across), Math.abs(along)) * 180 / Math.PI * 10) / 10 : 0
  const out = r => ({ ok: r === 'ok', reason: r, len: Math.round(len * 10) / 10, dev })
  if (len < fin(minLen, 24)) return out('ngan')
  if (dir && Math.sign(along) !== Math.sign(dir)) return out('nguoc')
  if (dev > fin(tolDeg, 35)) return out('lech')
  return out('ok')
}

/**
 * bandCoverage(segments, y0, y1) → phần (0..1) của đoạn [y0, y1] được phủ bởi HỢP các đoạn segments
 * (mỗi đoạn [a, b] hoặc { a, b }, thứ tự a/b tùy ý; đoạn lỗi bị bỏ; đoạn chồng nhau chỉ tính một lần).
 */
export function bandCoverage(segments, y0, y1) {
  const lo = Math.min(fin(y0), fin(y1)), hi = Math.max(fin(y0), fin(y1))
  if (!(hi > lo)) return 0
  const segs = []
  for (const s of Array.isArray(segments) ? segments : []) {
    const a = Number(Array.isArray(s) ? s[0] : s && s.a)
    const b = Number(Array.isArray(s) ? s[1] : s && s.b)
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue
    const s0 = Math.max(lo, Math.min(a, b)), s1 = Math.min(hi, Math.max(a, b))
    if (s1 > s0) segs.push([s0, s1])
  }
  segs.sort((p, q) => p[0] - q[0])
  let cov = 0, curA = null, curB = null
  for (const [a, b] of segs) {
    if (curB === null || a > curB) {
      if (curB !== null) cov += curB - curA
      curA = a; curB = b
    } else if (b > curB) curB = b
  }
  if (curB !== null) cov += curB - curA
  return Math.min(1, Math.round((cov / (hi - lo)) * 1000) / 1000)
}

/** Hợp các đoạn (để vẽ phần đã gọt): mảng [a, b] đã sắp và gộp, cắt trong [lo, hi]. */
export function mergeSegments(segments, lo = -Infinity, hi = Infinity) {
  const segs = []
  for (const s of Array.isArray(segments) ? segments : []) {
    const a = Number(Array.isArray(s) ? s[0] : s && s.a)
    const b = Number(Array.isArray(s) ? s[1] : s && s.b)
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue
    const s0 = Math.max(lo, Math.min(a, b)), s1 = Math.min(hi, Math.max(a, b))
    if (s1 > s0) segs.push([s0, s1])
  }
  segs.sort((p, q) => p[0] - q[0])
  const out = []
  for (const s of segs) {
    const last = out[out.length - 1]
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1])
    else out.push([s[0], s[1]])
  }
  return out
}

/**
 * createRhythm() → ghi các nhịp (thời điểm, giây): beat(t) trả số nhịp; intervals; cv() độ đều khoảng cách giữa các nhịp
 * (0 = đều tuyệt đối); mean() khoảng cách trung bình.
 */
export function createRhythm() {
  const times = []
  return {
    beat(t) {
      const x = Number(t)
      if (Number.isFinite(x)) times.push(x)
      return times.length
    },
    get count() { return times.length },
    get intervals() {
      const out = []
      for (let i = 1; i < times.length; i++) out.push(times[i] - times[i - 1])
      return out
    },
    cv() { return cvOf(this.intervals) },
    mean() {
      const iv = this.intervals.filter(x => x > 0)
      return iv.length ? iv.reduce((s, x) => s + x, 0) / iv.length : 0
    }
  }
}

/**
 * createReversalCounter({ threshold }) → đếm số lần đổi chiều trên MỘT trục (lắc lên xuống: đưa tọa độ y), có ngưỡng
 * chống rung tay (px). push(v, t) trả số lần đổi chiều; mỗi lần đổi chiều ghi một nhịp (thời điểm t) để đo độ đều: cv().
 * Nhận cả số (ngưỡng) thay cho đối tượng tùy chọn.
 */
export function createReversalCounter(opts = {}) {
  const threshold = typeof opts === 'number' ? opts : fin(opts && opts.threshold, 24)
  let dir = 0
  let extreme = null
  let count = 0
  const rhythm = createRhythm()
  return {
    push(v, t = 0) {
      const x = Number(v)
      if (!Number.isFinite(x)) return count
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
        rhythm.beat(t)
      }
      return count
    },
    // nhấc ngón: lần chạm sau bắt đầu lại từ điểm mới (không tính cú nhảy giữa hai lần chạm là một lần đổi chiều)
    reset() { dir = 0; extreme = null },
    get count() { return count },
    get dir() { return dir },
    cv() { return rhythm.cv() }
  }
}

/** Kim thước lực chạy đi về 0 → 1 → 0, chu kỳ `period` giây (mặc định 1,1 s); t lỗi → 0. */
export const NEEDLE_PERIOD = 1.1
export function needleValue(t, period = NEEDLE_PERIOD) {
  const p = fin(period, NEEDLE_PERIOD) > 0 ? fin(period, NEEDLE_PERIOD) : NEEDLE_PERIOD
  const x = fin(t)
  const ph = (((x % p) + p) % p) / p
  const v = ph < 0.5 ? 2 * ph : 2 - 2 * ph
  return Math.round(v * 1000) / 1000
}

// Sàn giờ theo số lượng (giây) của từng thao tác mới: không đổi par (par quyết định ngân sách chờ của khách), chỉ tránh
// trường hợp nhiều trứng / nhiều phần không thể làm kịp. Tham số đã nhân theo số phần (effectiveSteps).
export const MIN_LIMIT = Object.freeze({
  dap: Object.freeze({ key: 'n', per: 1.5, base: 1 }),
  xoay: Object.freeze({ key: 'turns', per: 1.1, base: 1 }),
  got: Object.freeze({ key: 'strips', per: 1.2, base: 1 }),
  lac: Object.freeze({ key: 'strokes', per: 0.4, base: 1 }),
  bay: Object.freeze({ key: 'n', per: 1.3, base: 1.5 })
})

/** Sàn giờ (giây) của loại bước với tham số params; loại khác → 0. */
export function minLimitSec(type, params) {
  const r = MIN_LIMIT[type]
  if (!r) return 0
  const q = Math.max(1, fin(params && params[r.key], 1))
  return Math.round((r.per * q + r.base) * 100) / 100
}

/**
 * Giới hạn giờ của một bước thao tác mới: max(2,5 × par, sàn giờ) — Hỗ trợ thao tác nhân 1,5 cả hai; nấu thử: Infinity.
 * step: { type, params, par }.
 */
export function gestureLimitSec(step, { assist = false, untimed = false } = {}) {
  if (untimed) return Infinity
  const s = step || {}
  return Math.max(stepLimitSec(s.par, assist), minLimitSec(s.type, s.params) * (assist ? 1.5 : 1))
}
