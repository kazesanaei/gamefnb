// Hàm chấm điểm mini-game (thuần). UI đo thao tác rồi gọi các hàm này.
import { masteryLevel } from './mastery.js'
import { DEFAULT_BALANCE } from './state.js'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const clampScore = s => Math.round(clamp(Number(s) || 0, 0, 100))

// Hệ số dụng cụ theo loại mini-game (ghi đè được bằng UPGRADES[id].effect.zoneMul = {type: hệ số}).
export const TOOL_ZONE_MUL = Object.freeze({
  dao_thep: Object.freeze({ thai: 1.2 }),
  chao_chong_dinh: Object.freeze({ lua: 1.15 })
})
export const MASTERY_ZONE_MUL = Object.freeze({ 1: 1, 2: 1.05, 3: 1.10 })
export const ASSIST_ZONE_MUL = 1.25

// Hệ số vùng mục tiêu: chặng × hẹp dần theo ngày × dụng cụ × thạo món × hỗ trợ thao tác; có trần.
// balance: BALANCE (tùy chọn), upgradesData: UPGRADES (tùy chọn) để đọc effect.zoneMul.
export function zoneMul(state, type, recipeId, balance = DEFAULT_BALANCE, upgradesData = null) {
  const B = { ...DEFAULT_BALANCE, ...(balance || {}) }
  const day = Number((state.shift && state.shift.day) || state.day) || 1
  let m = B.zoneMulStage * Math.max(B.zoneFloor, 1 - B.zoneDailyNarrow * (day - 1))
  const owned = state.upgrades || {}
  for (const id of Object.keys(owned)) {
    if (!owned[id]) continue
    let f = TOOL_ZONE_MUL[id] ? TOOL_ZONE_MUL[id][type] : undefined
    if (upgradesData) {
      // effect.zoneMul = {thai: 1.2} hoặc effect.thaiMul = 1.2 (src/data/upgrades.js)
      const u = Array.isArray(upgradesData) ? upgradesData.find(x => x.id === id) : upgradesData[id]
      const e = u && u.effect
      if (e) f = (e.zoneMul && e.zoneMul[type]) ?? e[type + 'Mul'] ?? f
    }
    if (f) m *= f
  }
  const prog = state.recipes && state.recipes[recipeId]
  if (prog) m *= MASTERY_ZONE_MUL[masteryLevel(prog, B.masteryLevels)] || 1
  if (state.settings && state.settings.assistMotion) m *= ASSIST_ZONE_MUL
  return Math.min(B.zoneMulCap, m)
}

// Bước chọn: 100 − 15 × số lần chạm nhầm. Thiếu/thừa/bẫy chỉ liệt kê ở errors (phạt ở Q, 1 dòng/nguyên liệu).
export function scoreChon({ required = [], optional = [], decoys = [], picked = [], mistakes = 0 }) {
  const errors = []
  const set = new Set(picked)
  for (const id of required) if (!set.has(id)) errors.push({ code: 'thieu', ing: id })
  for (const id of picked) {
    if (required.includes(id)) continue
    if (decoys.includes(id)) errors.push({ code: 'bay', ing: id })
    else if (!optional.includes(id)) errors.push({ code: 'thua', ing: id })
  }
  return { score: clampScore(100 - 15 * Math.max(0, Number(mistakes) || 0)), errors }
}

// Chà: spots → trung bình độ sạch; strokes → min(1, reversals/strokes); −15 nếu quá 2 × par.
export function scoreCha({ spots, reversals = 0, strokes, elapsed = 0, par = 0 }) {
  let ratio = 0
  if (Array.isArray(spots) && spots.length) {
    ratio = spots.reduce((s, v) => s + clamp(Number(v) || 0, 0, 1), 0) / spots.length
  } else if (strokes) {
    ratio = Math.min(1, (Number(reversals) || 0) / strokes)
  }
  let score = ratio * 100
  if (par > 0 && elapsed > 2 * par) score -= 15
  return clampScore(score)
}

// Điểm một nhát thái theo độ lệch px.
export function thaiCutScore(px, mul = 1) {
  const d = Math.abs(Number(px))
  if (!Number.isFinite(d)) return 0
  const m = mul > 0 ? mul : 1
  if (d <= 6 * m) return 100
  if (d <= 14 * m) return 80
  if (d <= 24 * m) return 55
  return 20
}

// Thái: cuts = độ lệch px từng nhát theo thứ tự vạch; thiếu nhát → 0 cho nhát đó; nhát thừa −10.
export function scoreThai({ cuts = [], expected, extra, mul = 1 }) {
  const n = Math.max(1, Number(expected) || cuts.length || 1)
  let sum = 0
  for (let i = 0; i < n; i++) sum += i < cuts.length && cuts[i] !== null && cuts[i] !== undefined ? thaiCutScore(cuts[i], mul) : 0
  const ex = extra !== undefined ? Number(extra) || 0 : Math.max(0, cuts.length - n)
  return clampScore(sum / n - 10 * ex)
}

// Chạm đúng n lần (có thể có vùng đích): điểm theo khoảng cách tới tâm, lệch số lần −30 mỗi lần.
export function scoreChamExact({ taps = 0, n = 1, distances, mul = 1 }) {
  let base = 100
  if (Array.isArray(distances) && distances.length) {
    const m = mul > 0 ? mul : 1
    const pts = distances.map(d => {
      d = Math.abs(Number(d))
      if (!Number.isFinite(d)) return 0
      if (d <= 0.08 * m) return 100
      if (d <= 0.15 * m) return 80
      if (d <= 0.25 * m) return 55
      return 20
    })
    base = pts.reduce((a, b) => a + b, 0) / pts.length
  }
  if (!taps) return 0
  return clampScore(base - 30 * Math.abs(taps - n))
}

// Chạm tối thiểu N lần trong thời gian: r = taps/N.
export function scoreChamMin({ taps = 0, N = 1 }) {
  if (!taps || taps <= 0) return 0
  const r = taps / Math.max(1, N)
  if (r >= 1.0 && r <= 1.2) return 100
  if (r >= 0.85 && r <= 1.35) return 80
  if (r >= 0.65 && r <= 1.6) return 55
  return 20
}

// Nhiều chai, mỗi chai đúng số nấc: 100 − 30 × tổng |lệch|.
export function scoreChamTargets({ counts = {}, targets = {} }) {
  const keys = new Set([...Object.keys(targets), ...Object.keys(counts)])
  let diff = 0
  for (const k of keys) diff += Math.abs((Number(counts[k]) || 0) - (Number(targets[k]) || 0))
  return clampScore(100 - 30 * diff)
}

// Hàm liên tục, đối xứng quanh tâm vùng. c tâm, h nửa bề rộng × mul, d = |v − c|.
export function zoneScore(v, zone, mul = 1) {
  const a = Number(zone[0]), b = Number(zone[1])
  const c = (a + b) / 2
  const h = Math.max(1e-6, (Math.abs(b - a) / 2) * (mul > 0 ? mul : 1))
  const d = Math.abs(Number(v) - c)
  if (!Number.isFinite(d)) return 0
  let s
  if (d <= 0.3 * h) s = 100
  else if (d <= h) s = 100 - 20 * (d - 0.3 * h) / (0.7 * h)
  else if (d <= h + 0.08) s = 80 - 25 * (d - h) / 0.08
  else s = Math.max(10, 55 - 45 * (d - h - 0.08) / 0.3)
  return Math.round(s)
}

// Canh lửa: value > 1,0 là cháy → 0.
export function scoreLua({ value, zone, mul = 1 }) {
  if (Number(value) > 1.0) return 0
  return clampScore(zoneScore(value, zone, mul))
}

// Rót: tràn > 1,02 → 0.
export function scoreRot({ level, zone, mul = 1 }) {
  if (Number(level) > 1.02) return 0
  return clampScore(zoneScore(level, zone, mul))
}

export function stepLabel(score, labels = DEFAULT_BALANCE.stepLabels) {
  const s = Number(score) || 0
  for (const [min, label] of labels) if (s >= min) return label
  return labels[labels.length - 1][1]
}

// ---------- M5 (0.5.0): năm thao tác mới — đập trứng, khuấy, gọt, lắc, bày ----------
// Mỗi hàm chọn để cùng nghĩa với bước nó thay (thiết kế M5 mục 1.5): lắc/khuấy/gọt thay chà (giữ "−15 nếu quá giờ" và tỉ
// lệ đủ lượt), bày thay chạm đúng số lần (−30 mỗi lần lệch số lượng). Đầu vào lỗi (NaN, âm, rỗng, sai kiểu) cho 0 hoặc bỏ
// qua phần lỗi, không bao giờ ra NaN; kết quả là số nguyên 0..100.
// Mốc "quá giờ" của thao tác mới = max(2 × par, sàn giờ theo số lượng) (overtimeAt): thao tác mới chậm hơn bước chà nó thay
// (vẽ 3 vòng lâu hơn chà 6 lượt) mà par bị khóa (par quyết định ngân sách chờ của khách), nên mốc trừ không được thấp hơn
// sàn giờ — người khuấy vừa tay không bị trừ oan.

// Vùng xanh của thước lực khi đập trứng (phần của thước 0..1; nới quanh tâm theo mul như zoneScore).
export const DAP_ZONE = Object.freeze([0.40, 0.70])

const num = (v, d = 0) => { const x = Number(v); return Number.isFinite(x) ? x : d }
const posInt = (v, d = 1) => { const x = Math.floor(Number(v)); return Number.isFinite(x) && x >= 1 ? x : d }
const mulOf = m => { const x = Number(m); return Number.isFinite(x) && x > 0 ? x : 1 }
const zoneOf = z => (Array.isArray(z) && z.length >= 2 && Number.isFinite(Number(z[0])) && Number.isFinite(Number(z[1])) ? z : DAP_ZONE)

// Sàn giờ theo số lượng (giây) của từng thao tác mới = per × số lượng + base, với số lượng là tham số `key` đã nhân theo số
// phần (effectiveSteps). Dùng hai chỗ: giới hạn giờ của bước = max(2,5 × par, sàn) (gestureLimitSec ở
// ui/minigames/_gesture.js, Hỗ trợ thao tác nhân 1,5 cả hai) và mốc trừ quá giờ = max(2 × par, sàn) (overtimeAt). Sàn không
// đổi par, chỉ tránh "Thêm trứng" hay đơn nhiều phần không làm kịp, và tránh trừ oan người làm vừa tay.
// Khuấy 1,4 giây mỗi vòng (≈ 0,7 vòng/giây, người khuấy chậm; bản đầu 1,1). Mô phỏng người chơi trung bình (1,2 ± 0,3
// vòng/giây, chạm sau 0,9 ± 0,25 giây) ở Khuấy đều (3 vòng, par 2), tính cả lượt hết giờ: 1,1 → bị trừ 28% số lượt (mức
// nghiệm thu < 15%, docs/can-bang.md chỉ số 30); 1,3 → 13% nhưng tỉ lệ 5 sao Cà phê muối thấp hơn bản 0.4.1 khoảng 6
// điểm; 1,4 → 9%, điểm trung bình 97,7 (bản 0.4.1 chà 6 lượt: 99,3). Sàn vượt 2,5 × par thì giới hạn giờ của bước cũng là
// sàn (gestureLimitSec), nên Khuấy đều 1 phần chỉ bị trừ khi hết giờ (5,2 giây).
export const MIN_LIMIT = Object.freeze({
  dap: Object.freeze({ key: 'n', per: 1.5, base: 1 }),
  xoay: Object.freeze({ key: 'turns', per: 1.4, base: 1 }),
  got: Object.freeze({ key: 'strips', per: 1.2, base: 1 }),
  lac: Object.freeze({ key: 'strokes', per: 0.4, base: 1 }),
  bay: Object.freeze({ key: 'n', per: 1.3, base: 1.5 })
})

/** Sàn giờ (giây) của loại bước với tham số params (số lượng thiếu / lỗi / < 1 → 1); loại khác → 0. */
export function minLimitSec(type, params) {
  const r = MIN_LIMIT[type]
  if (!r) return 0
  const q = Math.max(1, num(params && params[r.key], 1))
  return Math.round((r.per * q + r.base) * 100) / 100
}

/**
 * Mốc trừ 15 vì quá giờ (giây) của thao tác mới: max(2 × par, sàn giờ của loại `type` với số lượng `count`).
 * par không phải số dương hữu hạn (0, lỗi, Infinity khi nấu thử) → Infinity: không bao giờ trừ.
 */
export function overtimeAt(type, count, par) {
  const p = num(par)
  if (!(p > 0)) return Infinity
  const r = MIN_LIMIT[type]
  return Math.max(2 * p, r ? minLimitSec(type, { [r.key]: count }) : 0)
}
// −15 khi elapsed vượt mốc (cùng mức trừ với chà).
const overtime = (elapsed, mark) => (num(elapsed) > mark ? 15 : 0)

// Đập trứng: cracks = [{ force /*vị trí kim 0..1 lúc chạm*/, split /*đã tách*/, shell /*vỏ rơi vào chảo*/ }] theo thứ tự quả.
// Mỗi quả = zoneScore(lực, vùng xanh, mul) nếu đã tách; vỏ rơi thì tối đa 40; quả chưa đập / chưa tách = 0.
// Điểm = trung bình n quả (quả đập dư bỏ qua).
export function scoreDap({ cracks = [], n = 1, zone = DAP_ZONE, mul = 1 } = {}) {
  const N = posInt(n)
  const list = Array.isArray(cracks) ? cracks : []
  const z = zoneOf(zone)
  let sum = 0
  for (let i = 0; i < N; i++) {
    const c = list[i]
    if (!c || typeof c !== 'object' || !c.split) continue
    const f = Number(c.force)
    if (!Number.isFinite(f)) continue
    let s = zoneScore(f, z, mulOf(mul))
    if (c.shell) s = Math.min(40, s)
    sum += s
  }
  return clampScore(sum / N)
}

// Khuấy: 100 · min(1, vòng/K) − 12 · số lần sánh − (cv thời gian mỗi vòng > 0,45 · mul ? 10 : 0)
// − (quá max(2 · par, sàn giờ 'xoay' của K vòng) ? 15 : 0). Nấu thử: par = Infinity → không trừ quá giờ.
export function scoreXoay({ turns = 0, target = 1, spills = 0, cv = 0, elapsed = 0, par = 0, mul = 1 } = {}) {
  const t = Math.max(0, num(turns))
  if (t <= 0) return 0
  const K = posInt(target)
  let s = 100 * Math.min(1, t / K)
  s -= 12 * Math.max(0, Math.floor(num(spills)))
  if (num(cv) > 0.45 * mulOf(mul)) s -= 10
  s -= overtime(elapsed, overtimeAt('xoay', K, par))
  return clampScore(s)
}

// Gọt: trung bình min(1, phủ/0,85) của K dải × 100 − min(24, 8 · nhát hụt) − (quá max(2 · par, sàn giờ 'got') ? 15 : 0).
// coverage[i] = phần dải i đã gọt (0..1); thiếu dải → 0. K = target (số dải), không có thì số phần tử coverage.
export function scoreGot({ coverage = [], target, misses = 0, elapsed = 0, par = 0 } = {}) {
  const list = Array.isArray(coverage) ? coverage : []
  const K = posInt(target, Math.max(1, list.length))
  let sum = 0
  for (let i = 0; i < K; i++) sum += Math.min(1, clamp(num(list[i]), 0, 1) / 0.85)
  if (sum <= 0) return 0
  let s = (sum / K) * 100
  s -= Math.min(24, 8 * Math.max(0, Math.floor(num(misses))))
  s -= overtime(elapsed, overtimeAt('got', K, par))
  return clampScore(s)
}

// Phạt lắc quá tay theo r = lượt/K khi bước có maxRatio (m): cùng bậc với chạm tối thiểu cũ (scoreChamMin: r ≤ 1,2 → 100;
// ≤ 1,35 → 80; ≤ 1,6 → 55; còn lại 20) — r ≤ m: 0; ≤ m + 0,15: 20; ≤ m + 0,4: 45; hơn nữa: 80.
export function lacOverPenalty(strokes, target, maxRatio) {
  const m = num(maxRatio)
  if (!(m >= 1)) return 0
  const r = Math.max(0, Math.floor(num(strokes))) / posInt(target)
  if (r <= m + 1e-9) return 0
  if (r <= m + 0.15 + 1e-9) return 20
  if (r <= m + 0.4 + 1e-9) return 45
  return 80
}

// Lắc: 100 · min(1, lượt/K) − (cv nhịp > 0,6 · mul ? 10 : 0) − (quá max(2 · par, sàn giờ 'lac') ? 15 : 0)
// − phạt lắc quá tay (chỉ khi bước có params.maxRatio, vd áo bột: lắc quá tay thì bột văng — lacOverPenalty).
// Không có maxRatio: lắc dư không phạt — cùng nghĩa với chà kiểu strokes cũ.
export function scoreLac({ strokes = 0, target = 1, cv = 0, elapsed = 0, par = 0, mul = 1, maxRatio } = {}) {
  const k = Math.max(0, Math.floor(num(strokes)))
  if (k <= 0) return 0
  const K = posInt(target)
  let s = 100 * Math.min(1, k / K)
  if (num(cv) > 0.6 * mulOf(mul)) s -= 10
  s -= overtime(elapsed, overtimeAt('lac', K, par))
  s -= lacOverPenalty(k, K, maxRatio)
  return clampScore(s)
}

// Điểm vị trí một món đã thả: d = khoảng cách tới tâm đích / bán kính đích.
export function bayPlaceScore(d, mul = 1) {
  const x = Math.abs(Number(d))
  if (!Number.isFinite(x)) return 0
  const m = mulOf(mul)
  if (x <= 0.35 * m) return 100
  if (x <= 0.6 * m) return 80
  if (x <= 1) return 55
  return 20
}

// Bày: trung bình điểm vị trí các món đã thả − 30 · |số đã thả − n|; chưa thả gì = 0. Cùng nghĩa với chạm đúng số lần cũ.
// placed = [d] (hoặc [{ d }]) theo thứ tự thả.
export function scoreBay({ placed = [], n = 1, mul = 1 } = {}) {
  const list = (Array.isArray(placed) ? placed : []).map(p => (p && typeof p === 'object' ? p.d : p))
  if (!list.length) return 0
  const base = list.reduce((s, d) => s + bayPlaceScore(d, mul), 0) / list.length
  return clampScore(base - 30 * Math.abs(list.length - posInt(n)))
}
