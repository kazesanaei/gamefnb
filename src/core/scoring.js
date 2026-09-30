// Chấm chất lượng món (Q, hạng), sao của khách, tip, sao trung bình.
import { DEFAULT_BALANCE } from './state.js'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Ghi chú của món theo id (bỏ id không có).
export function noteObjects(recipe, notes) {
  const list = (recipe && recipe.notes) || []
  return (notes || []).map(id => list.find(n => n.id === id)).filter(Boolean)
}

// Nguyên liệu cần cho một dòng với ghi chú: chinh + phu (trừ removes) + tuy_chon được ghi chú thêm (adds).
// Trả { required, main, side, optional, removed, decoys }.
export function requiredIngredients(recipe, notes) {
  const ns = noteObjects(recipe, notes)
  const removed = new Set()
  const added = new Set()
  for (const n of ns) {
    for (const id of n.removes || []) removed.add(id)
    for (const id of n.adds || []) added.add(id)
  }
  const main = [], side = [], optional = []
  for (const ing of (recipe && recipe.ingredients) || []) {
    if (ing.role === 'chinh') main.push(ing.id)
    else if (ing.role === 'phu') { if (!removed.has(ing.id)) side.push(ing.id) }
    else if (ing.role === 'tuy_chon') { if (added.has(ing.id) && !removed.has(ing.id)) side.push(ing.id); else optional.push(ing.id) }
  }
  for (const id of added) if (!main.includes(id) && !side.includes(id) && !removed.has(id)) side.push(id)
  return { required: [...main, ...side], main, side, optional, removed: [...removed], decoys: (recipe && recipe.decoys) || [] }
}

// Mỗi nguyên liệu chỉ 1 lỗi, ưu tiên: trai_ghi_chu (Q ≤ 60, sao ≤ 2) > bay (Q ≤ 60) > thieu_phu (−10) > thua (−8).
export function ingredientErrors(recipe, notes, picked) {
  const req = requiredIngredients(recipe, notes)
  const set = new Set(picked || [])
  const errors = []
  const seen = new Set()
  const all = [...req.required, ...set]
  for (const ing of all) {
    if (seen.has(ing)) continue
    seen.add(ing)
    const has = set.has(ing)
    if (has && req.removed.includes(ing)) errors.push({ code: 'trai_ghi_chu', ing, cap: 60, starsCap: 2 })
    else if (has && req.decoys.includes(ing)) errors.push({ code: 'bay', ing, cap: 60 })
    else if (!has && req.main.includes(ing)) errors.push({ code: 'thieu_chinh', ing, penalty: 30 })
    else if (!has && req.side.includes(ing)) errors.push({ code: 'thieu_phu', ing, penalty: 10 })
    else if (has && !req.required.includes(ing)) errors.push({ code: 'thua', ing, penalty: 8 })
  }
  return errors
}

// Mã lỗi nguyên liệu → mã review (reviews.js).
export const ING_ERROR_REVIEW = Object.freeze({
  trai_ghi_chu: 'sai_ghi_chu', bay: 'bay_nguyen_lieu', thieu_phu: 'thieu_nguyen_lieu',
  thieu_chinh: 'thieu_nguyen_lieu', thua: 'thua_nguyen_lieu'
})

export function gradeOf(q, thresholds = DEFAULT_BALANCE.gradeThresholds) {
  for (const [min, grade, stars] of thresholds) if (q >= min) return { grade, stars }
  const last = thresholds[thresholds.length - 1]
  return { grade: last[1], stars: last[2] }
}

// stepsResult: [{id, score, w?, critical?, auto?, retried?}] hoặc {stepId: {score, …}}.
// opts: { thresholds, assist } — assist (Hỗ trợ thao tác): không Không tì vết, trần hạng Ngon.
export function dishQuality(recipe, stepsResult, ingErrors = [], opts = {}) {
  const thresholds = opts.thresholds || DEFAULT_BALANCE.gradeThresholds
  const defs = (recipe && recipe.steps) || []
  const list = Array.isArray(stepsResult)
    ? stepsResult
    : Object.keys(stepsResult || {}).map(id => ({ id, ...stepsResult[id] }))
  let sw = 0, sum = 0, critFail = false, allPerfect = list.length > 0, anyAuto = false, anyRetry = false
  for (const s of list) {
    const def = defs.find(d => d.id === s.id) || {}
    const w = Number(s.w ?? def.w ?? 1) || 1
    const score = clamp(Number(s.score) || 0, 0, 100)
    sw += w; sum += w * score
    if ((s.critical ?? def.critical) && score < 50) critFail = true
    if (score < 90) allPerfect = false
    if (s.auto) anyAuto = true
    if (s.retried) anyRetry = true
  }
  let q = sw > 0 ? sum / sw : 0
  let capped = false
  for (const e of ingErrors || []) {
    if (e.penalty) q -= e.penalty
  }
  for (const e of ingErrors || []) {
    if (e.cap !== undefined && q > e.cap) { q = e.cap; capped = true }
  }
  if (opts.assist) {
    const ngonMin = (thresholds.find(t => t[1] === 'tuyet_hao') || [90])[0]
    if (q >= ngonMin) { q = ngonMin - 1; capped = true }
  }
  q = Math.round(clamp(q, 0, 100))
  let { grade } = gradeOf(q, thresholds)
  if (critFail) {
    grade = 'hong'
    const hongMax = (thresholds.find(t => t[1] === 'kem') || [40])[0] - 1
    if (q > hongMax) { q = hongMax; capped = true }
  }
  const flawless = allPerfect && (ingErrors || []).length === 0 && !anyAuto && !anyRetry && !opts.assist && !critFail
  return { q, grade, flawless, capped }
}

// Sao của khách. customer.penalties: [{code, stars, source}].
// base = hạng của Q trung bình có trọng số theo giá; có món Hỏng → base ≤ 2.
// sao = kẹp(floor(base − Σphạt), 1, 5); khó tính có lỗi → −1 thêm; tutorial không bị phạt.
// Sau đó +customer.apologyBonus và áp trần (customer.starCap, lỗi trái ghi chú → 2).
export function customerStars(customer, dishes, recipes, opts = {}) {
  const thresholds = opts.thresholds || DEFAULT_BALANCE.gradeThresholds
  const ds = (dishes || []).filter(Boolean)
  let wsum = 0, qsum = 0, anyHong = false, anyKitchenError = false, trai = false
  for (const d of ds) {
    const r = recipes && recipes[d.recipeId]
    const w = Math.max(1, ((r && r.price) || 1) * (d.qty || 1))
    wsum += w; qsum += w * (Number(d.q) || 0)
    if (d.grade === 'hong') anyHong = true
    if ((d.ingErrors && d.ingErrors.length) || d.grade === 'hong') anyKitchenError = true
    if ((d.ingErrors || []).some(e => e.code === 'trai_ghi_chu')) trai = true
  }
  let base = wsum > 0 ? gradeOf(qsum / wsum, thresholds).stars : 1
  if (anyHong) base = Math.min(base, 2)
  const tutorial = !!customer.tutorial
  const penalties = tutorial ? [] : (customer.penalties || []).slice()
  // khách khó tính trừ thêm khi có LỖI (phạt do tình huống trong ca, vd từ chối đổi món, không phải lỗi)
  const faults = penalties.filter(p => p.source !== 'tinh_huong')
  if (!tutorial && customer.strict && (faults.length > 0 || anyKitchenError)) {
    penalties.push({ code: 'kho_tinh', stars: 1, source: faults.length ? faults[0].source : 'bep' })
  }
  const total = penalties.reduce((s, p) => s + (Number(p.stars) || 0), 0)
  let stars = clamp(Math.floor(base - total + 1e-9), 1, 5)
  stars += Number(customer.apologyBonus) || 0
  let cap = Number(customer.starCap) || 5
  if (trai && !tutorial) cap = Math.min(cap, 2)
  stars = clamp(Math.min(stars, cap), 1, 5)
  return { stars, base, penalties, cap }
}

// 5 sao: 5.000đ; có món Không tì vết hoặc khách khó tính: 10.000đ.
export function tipFor(stars, flawlessAny, persona, balance = DEFAULT_BALANCE) {
  if (stars < 5) return 0
  if (flawlessAny || (persona && persona.strict)) return balance.tipBonus ?? 10000
  return balance.tipFiveStar ?? 5000
}

// Trung bình 30 đánh giá gần nhất; ít hơn 5 thì đệm 4 sao cho đủ 5.
export function averageRating(ratings) {
  const r = (ratings || []).slice(-30).map(Number).filter(Number.isFinite)
  const padded = r.length < 5 ? r.concat(new Array(5 - r.length).fill(4)) : r
  return padded.reduce((a, b) => a + b, 0) / padded.length
}

export function customerMultiplier(avg) {
  if (avg >= 4.5) return 1.15
  if (avg >= 4.0) return 1.0
  if (avg >= 3.5) return 0.85
  return 0.7
}
