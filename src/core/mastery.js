// Thạo món: cấp theo số lần đạt hạng Ngon trở lên (goodCooks), không bao giờ tụt.

export const DEFAULT_MASTERY_LEVELS = Object.freeze([0, 5, 15])
const GOOD_GRADES = ['ngon', 'tuyet_hao']

export function masteryLevel(progress, levels = DEFAULT_MASTERY_LEVELS) {
  const good = Number(progress && progress.goodCooks) || 0
  let lv = 1
  for (let i = 0; i < levels.length; i++) if (good >= levels[i]) lv = i + 1
  return Math.max(1, Math.min(levels.length, lv))
}

// Cập nhật cooks/goodCooks/excellent/flawless/best. Món chưa sở hữu (nấu thử) không ghi.
// Trả {levelBefore, levelAfter, levelUp} hoặc null.
export function recordDish(state, recipeId, dishResult, levels = DEFAULT_MASTERY_LEVELS) {
  const p = state.recipes && state.recipes[recipeId]
  if (!p || !dishResult) return null
  const before = masteryLevel(p, levels)
  p.cooks = (p.cooks || 0) + 1
  if (GOOD_GRADES.includes(dishResult.grade)) p.goodCooks = (p.goodCooks || 0) + 1
  if (dishResult.grade === 'tuyet_hao') p.excellent = (p.excellent || 0) + 1
  if (dishResult.flawless) p.flawless = (p.flawless || 0) + 1
  p.best = Math.max(p.best || 0, Math.round(Number(dishResult.q) || 0))
  const after = masteryLevel(p, levels)
  return { levelBefore: before, levelAfter: after, levelUp: after > before }
}

export function canAutoStep(state, recipeId, levels = DEFAULT_MASTERY_LEVELS) {
  const p = state.recipes && state.recipes[recipeId]
  return !!p && masteryLevel(p, levels) >= 2
}
