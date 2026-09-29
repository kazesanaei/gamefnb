// Kinh tế: tổng kết ca, tất toán ví, chi tiêu, vay Dì Sáu, mua nâng cấp/công thức.
import { drawerTotal } from './money.js'
import { DEFAULT_BALANCE, emit, newRecipeProgress } from './state.js'

function countCodes(into, codes) {
  for (const c of codes || []) into[c] = (into[c] || 0) + 1
}

// Tổng kết ca (không sửa state). data (tùy chọn) để tra lời khuyên từ TIPS.
export function summarizeShift(state, data = null) {
  const sh = state.shift
  if (!sh) return null
  const L = sh.ledger
  const drawerActual = drawerTotal(sh.drawer)
  const drawerExpected = sh.floatAmount + L.cash
  const fixedCost = sh.fixedCost ?? DEFAULT_BALANCE.fixedCostPerShift
  const cashNet = drawerActual - sh.floatAmount
  const profit = cashNet + sh.qrBalance + sh.tipJar - fixedCost - L.refunds - L.cogs - L.waste
  const sheets = sh.scoreSheets.filter(s => s.final)
  const starsList = sheets.map(s => s.stars)
  const avgStars = starsList.length ? Math.round((starsList.reduce((a, b) => a + b, 0) / starsList.length) * 100) / 100 : 0
  const counterErrors = {}, kitchenErrors = {}
  for (const s of sheets) { countCodes(counterErrors, s.counterErrors); countCodes(kitchenErrors, s.kitchenErrors) }
  let bestDish = null
  for (const s of sheets) for (const d of s.dishes || []) {
    if (!bestDish || d.q > bestDish.q) bestDish = { recipeId: d.recipeId, q: d.q, grade: d.grade }
  }
  // lời khuyên: lỗi gặp nhiều nhất
  const all = { ...counterErrors }
  for (const k of Object.keys(kitchenErrors)) all[k] = (all[k] || 0) + kitchenErrors[k]
  let topCode = null
  for (const k of Object.keys(all)) if (!topCode || all[k] > all[topCode]) topCode = k
  let advice = null
  if (topCode) {
    advice = { code: topCode, count: all[topCode], tipId: null, text: '' }
    const tips = data && data.TIPS ? (Array.isArray(data.TIPS) ? data.TIPS : Object.values(data.TIPS)) : []
    const t = tips.find(x => x.trigger === topCode)
    if (t) { advice.tipId = t.id; advice.text = t.text }
  }
  const lateReviews = Object.values(sh.customers).filter(c => c.reviewLate).map(c => ({ customerId: c.id, name: c.name, ...c.reviewLate }))
  return {
    day: sh.day,
    served: sh.served.length, lost: sh.lost.length, missed: sh.missed || 0,
    cashSales: L.cash, qrSales: L.qr, sales: L.sales, listValue: L.listValue,
    tips: L.tips, cogs: L.cogs, waste: L.waste, refunds: L.refunds,
    undercharge: L.undercharge, overchange: L.overchange, rounding: L.rounding || 0, fakeQrLoss: L.fakeQrLoss,
    fixedCost, profit,
    drawerExpected, drawerActual, drawerDiff: drawerActual - drawerExpected,
    qrBalance: sh.qrBalance, tipJar: sh.tipJar,
    avgStars, ratings: starsList, reputationGain: sh.reputationGain || 0,
    counterErrors, kitchenErrors, bestDish, advice,
    lateReviews, loanRepaid: 0
  }
}

// Tất toán ví: wallet += (tiền mặt vượt quỹ lẻ) + QR + tip − chi phí cố định − hoàn tiền; trả nợ nếu có.
// (Giá vốn/hao hụt đã trừ vào ví ngay lúc nấu.)
export function settleShift(state, summary) {
  const sh = state.shift
  const cashNet = drawerTotal(sh.drawer) - sh.floatAmount
  state.wallet += cashNet + sh.qrBalance + sh.tipJar - summary.fixedCost - summary.refunds
  let repaid = 0
  if (state.loan && state.loan.remaining > 0 && summary.profit > 0) {
    const rate = sh.loanRepayRate ?? DEFAULT_BALANCE.loanRepayRate
    repaid = Math.min(state.loan.remaining, Math.ceil((summary.profit * rate) / 1000) * 1000)
    state.wallet -= repaid
    state.loan.remaining -= repaid
    if (state.loan.remaining <= 0) state.loan = null
  }
  summary.loanRepaid = repaid
  return summary
}

export function canAfford(state, price) {
  return state.wallet >= price
}

export function spend(state, price, reason = '') {
  price = Math.round(Number(price) || 0)
  if (price < 0 || !canAfford(state, price)) return false
  state.wallet -= price
  return true
}

export function earn(state, amount, reason = '') {
  amount = Math.round(Number(amount) || 0)
  if (amount <= 0) return false
  state.wallet += amount
  return true
}

// Mời vay khi ví dưới ngưỡng và chưa có khoản nợ.
export function offerLoan(state, balance = DEFAULT_BALANCE) {
  const below = balance.loanOfferBelow ?? DEFAULT_BALANCE.loanOfferBelow
  return !state.loan && !state.shift && state.wallet < below
}

// Nhận khoản vay: ví += loanAmount; nợ = loanAmount × (1 + lãi).
export function takeLoan(state, balance = DEFAULT_BALANCE) {
  if (state.loan) return false
  const amount = balance.loanAmount ?? DEFAULT_BALANCE.loanAmount
  const interest = balance.loanInterest ?? DEFAULT_BALANCE.loanInterest
  state.wallet += amount
  state.loan = { amount, remaining: Math.round(amount * (1 + interest)) }
  return true
}

function findUpgrade(data, id) {
  const U = data && data.UPGRADES
  if (!U) return null
  return Array.isArray(U) ? U.find(u => u.id === id) || null : (U[id] ? { id, ...U[id] } : null)
}

// Mua nâng cấp (UPGRADES[id]: {price, fromDay}). Phát 'upgrade.bought'.
export function buyUpgrade(state, upgradeId, ctx) {
  const u = findUpgrade(ctx && ctx.data, upgradeId)
  if (!u) return { ok: false, reason: 'khong_co' }
  if (state.upgrades[upgradeId]) return { ok: false, reason: 'da_co' }
  if ((u.fromDay || 1) > state.day) return { ok: false, reason: 'chua_mo' }
  if (state.shift) return { ok: false, reason: 'dang_ban' }
  if (!spend(state, u.price, 'upgrade')) return { ok: false, reason: 'thieu_tien' }
  state.upgrades[upgradeId] = true
  emit(ctx, 'upgrade.bought', { upgradeId })
  return { ok: true }
}

// Mua công thức (M2 dùng cho Shop). Phát 'recipe.bought'.
export function buyRecipe(state, recipeId, price, ctx) {
  const R = ctx && ctx.data && ctx.data.RECIPES
  if (!R || !R[recipeId]) return { ok: false, reason: 'khong_co' }
  if (state.recipes[recipeId]) return { ok: false, reason: 'da_co' }
  if (!spend(state, price, 'recipe')) return { ok: false, reason: 'thieu_tien' }
  state.recipes[recipeId] = newRecipeProgress(state.day)
  emit(ctx, 'recipe.bought', { recipeId })
  return { ok: true }
}
