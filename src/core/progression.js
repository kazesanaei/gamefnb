// Lên chặng (MVP: Chặng 1 → màn "Quán cóc vỉa hè – sắp khai trương" với nút khóa) và mục tiêu sau khi đủ điều kiện.
import { emit, cfg } from './state.js'
import { averageRating } from './scoring.js'
import { masteryLevel } from './mastery.js'
import { formatVND } from './money.js'

function D(ctx) { return (ctx && ctx.data) || {} }

function fill(tpl, vars) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m))
}

// Kiểm tra điều kiện lên chặng kế tiếp.
// → { chang, name, eligible, locked, lockedText, conditions: [{id, kind, label, current, target, done, progress, hint}] }
export function checkStageUp(state, ctx) {
  const next = (state.chang || 1) + 1
  const S = (D(ctx).STAGE_UP || {})[next]
  if (!S) return { chang: next, name: '', eligible: false, locked: true, conditions: [] }
  const R = D(ctx).RECIPES || {}
  const levels = cfg(ctx, 'masteryLevels')
  const conds = S.requirements.map(req => {
    let current = 0, done = false, hint = ''
    switch (req.kind) {
      case 'reputation':
        current = state.reputation || 0
        done = current >= req.target
        break
      case 'avgRating':
        current = Math.round(averageRating(state.ratings || []) * 100) / 100
        done = current >= req.target
        break
      case 'recipes':
        current = Object.keys(state.recipes || {}).length
        done = current >= req.target
        break
      case 'mastery': {
        const lv = req.level || 2
        const list = Object.entries(state.recipes || {}).map(([id, p]) => ({ id, p, lv: masteryLevel(p, levels) }))
        current = list.filter(x => x.lv >= lv).length
        done = current >= req.target
        if (!done) {
          // món gần lên cấp nhất
          const need = levels[lv - 1] || 0
          const cand = list.filter(x => x.lv < lv).sort((a, b) => (b.p.goodCooks || 0) - (a.p.goodCooks || 0))[0]
          if (cand) hint = fill(req.hint, { n: Math.max(1, need - (cand.p.goodCooks || 0)), mon: (R[cand.id] && R[cand.id].name) || cand.id })
        }
        break
      }
      case 'chain': {
        const cs = (state.chains || {})[req.chainId]
        current = cs && cs.done ? 1 : 0
        done = current >= 1
        if (!done) {
          const def = (D(ctx).CHAINS || {})[req.chainId]
          const k = cs ? cs.step : 0
          const st = def && def.steps[k]
          if (st) hint = fill(req.hint, { step: k + 1, text: String(st.text || '').replace('{n}', String(st.target || 1)) })
        }
        break
      }
      case 'wallet':
        current = state.wallet || 0
        done = current >= req.target && !(req.noLoan && state.loan)
        if (!done) hint = fill(req.hint, { money: formatVND(Math.max(0, req.target - current)) })
        break
      default: break
    }
    if (!done && !hint) hint = fill(req.hint, {})
    // sao trung bình luôn 1 chữ số thập phân ("5,0"), tiền theo đồng, còn lại là số đếm
    const shown = req.kind === 'wallet' ? formatVND(current)
      : req.kind === 'avgRating' ? current.toFixed(1).replace('.', ',') : String(current).replace('.', ',')
    const target = req.kind === 'wallet' ? formatVND(req.target) : String(req.target).replace('.', ',')
    return {
      id: req.id, kind: req.kind, label: fill(req.label, { cur: shown, target }), current, target: req.target, done,
      progress: req.target > 0 ? Math.min(1, current / req.target) : (done ? 1 : 0), hint: done ? '' : hint
    }
  })
  const eligible = conds.every(c => c.done)
  return { chang: next, name: S.name, screenTitle: S.screenTitle, eligible, locked: !!S.locked, lockedText: S.lockedText || '', conditions: conds }
}

// Ghi nhận lần đầu đủ điều kiện (để giao diện hiện màn "sắp khai trương" 1 lần). Trả true nếu vừa đủ.
export function updateStageUp(state, ctx) {
  const p = state.progression || (state.progression = { stageUpReady: false, stageUpSeen: false, records: {}, cur: {} })
  if (p.stageUpReady) return false
  const r = checkStageUp(state, ctx)
  if (!r.eligible) return false
  p.stageUpReady = true
  emit(ctx, 'stage.ready', { chang: r.chang })
  return true
}

export function markStageUpSeen(state) {
  if (!state.progression) return false
  state.progression.stageUpSeen = true
  return true
}

// Mục tiêu sau khi đủ điều kiện: "Không tì vết" từng món, thạo cấp 3 mọi món, kỷ lục ca.
export function postGoals(state, ctx) {
  const R = D(ctx).RECIPES || {}
  const levels = cfg(ctx, 'masteryLevels')
  const P = D(ctx).POST_GOALS || {}
  const target = (P.mastery && P.mastery.level) || 3
  const recipes = Object.entries(state.recipes || {}).map(([id, p]) => ({
    id, name: (R[id] && R[id].name) || id, flawless: (p.flawless || 0) > 0, level: masteryLevel(p, levels),
    mastered: masteryLevel(p, levels) >= target
  }))
  const rec = (state.progression && state.progression.records) || {}
  return {
    flawless: { done: recipes.filter(r => r.flawless).length, total: recipes.length },
    mastery: { done: recipes.filter(r => r.mastered).length, total: recipes.length, level: target },
    recipes,
    records: { bestProfit: rec.bestProfit ?? null, mostFiveStars: rec.mostFiveStars || 0, longestStreak: rec.longestStreak || 0 }
  }
}
