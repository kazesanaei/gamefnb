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
