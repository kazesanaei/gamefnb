// Chợ Công Thức: Kệ Chính (món mua bằng Tiền quán), thẻ bóng mờ Chặng 2, tab Nâng cấp, Góc Muỗng Vàng (màu dù),
// thẻ xem trước và NẤU THỬ miễn phí (phiên nấu tách biệt state.shift, không tốn tiền, không tính thạo món,
// không đếm nhiệm vụ). Lõi đọc dữ liệu qua ctx.data.
import { emit } from './state.js'
import { buyRecipe, buyUpgrade } from './economy.js'
import { customerCount, emptyLedger } from './shift.js'
import { effectiveSteps } from './kitchen.js'
import { makeFloat } from './money.js'

function D(ctx) { return (ctx && ctx.data) || {} }

function upgradeOf(ctx, id) {
  const U = D(ctx).UPGRADES
  if (!U) return null
  return Array.isArray(U) ? U.find(u => u.id === id) || null : (U[id] ? { id, ...U[id] } : null)
}

// Giá vốn thật của 1 phần (tổng nguyên liệu không tùy chọn).
export function recipeCost(recipe, ctx) {
  const INGS = D(ctx).INGREDIENTS || {}
  return (recipe.ingredients || []).filter(i => i.role !== 'tuy_chon')
    .reduce((s, i) => s + ((INGS[i.id] && INGS[i.id].cost) || 0) * (i.qty || 1), 0)
}

// Thẻ xem trước: số bước, cơ chế, độ khó, giá vốn, giá bán, lãi mỗi phần, số ca hoàn vốn ước tính.
export function recipePreview(state, recipeId, ctx) {
  const R = D(ctx).RECIPES || {}
  const r = R[recipeId]
  if (!r) return null
  const steps = effectiveSteps(r, [], null, 1)
  const cost = recipeCost(r, ctx)
  const profit = r.price - cost
  const mechanics = [...new Set(steps.map(s => s.type))]
  const known = new Set()
  for (const id of Object.keys(state.recipes || {})) for (const s of effectiveSteps(R[id], [], null, 1)) known.add(s.type)
  const S = D(ctx).SHOP || {}
  const menuSize = Object.keys(state.recipes || {}).length + 1
  const N = customerCount(state, ctx, state.day)
  const portions = (N * (S.portionsPerCustomer || 1.2)) / menuSize
  const price = r.shopPrice || 0
  const payback = price > 0 && profit > 0 ? Math.ceil(price / (profit * portions)) : 0
  return {
    id: r.id, name: r.name, icon: r.icon, desc: r.desc, difficulty: r.difficulty,
    steps: steps.length, boardSteps: steps.filter(s => s.type !== 'chon').length,
    mechanics, newMechanics: mechanics.filter(t => !known.has(t)),
    cost, price: r.price, profit, shopPrice: price, fromDay: r.shopFromDay || 1, paybackShifts: payback
  }
}

// Danh mục Chợ Công Thức cho giao diện.
export function shopCatalog(state, ctx) {
  const S = D(ctx).SHOP || {}
  const R = D(ctx).RECIPES || {}
  const C = D(ctx).COSMETICS || {}
  const tried = (state.shop && state.shop.tried) || []
  const recipes = (S.mainShelf || []).filter(id => R[id]).map(id => {
    const r = R[id]
    const owned = !!(state.recipes && state.recipes[id])
    const unlocked = state.day >= (r.shopFromDay || 1)
    return {
      ...recipePreview(state, id, ctx), owned, unlocked, canAfford: state.wallet >= (r.shopPrice || 0),
      canBuy: !owned && unlocked && !state.shift && state.wallet >= (r.shopPrice || 0),
      canTaste: !owned && !tried.includes(id) && !state.shift, tried: tried.includes(id)
    }
  })
  const upgrades = (S.upgrades || []).map(id => upgradeOf(ctx, id)).filter(Boolean).map(u => ({
    id: u.id, name: u.name, desc: u.desc, icon: u.icon, price: u.price, fromDay: u.fromDay || 1,
    owned: !!state.upgrades[u.id], unlocked: state.day >= (u.fromDay || 1), canAfford: state.wallet >= u.price,
    canBuy: !state.upgrades[u.id] && state.day >= (u.fromDay || 1) && !state.shift && state.wallet >= u.price
  }))
  const owned = (state.cosmetics && state.cosmetics.owned) || []
  const equipped = (state.cosmetics && state.cosmetics.equipped) || {}
  const umbrellas = (S.umbrellas || []).filter(id => C[id]).map(id => ({
    id, name: C[id].name, color: C[id].color, pattern: C[id].pattern || null, price: C[id].price || 0,
    owned: owned.includes(id), equipped: equipped.du === id, canAfford: (state.goldSpoons || 0) >= (C[id].price || 0)
  }))
  return { name: S.name || '', recipes, teasers: (S.teasers || []).map(t => ({ ...t, note: S.teaserNote || '', locked: true })), upgrades, umbrellas }
}

// Mua món ở Kệ Chính bằng Tiền quán (phát 'recipe.bought'). Món mới được gọi ×2 trong 2 ca đầu (boughtDay).
export function buyShopRecipe(state, recipeId, ctx) {
  const S = D(ctx).SHOP || {}
  const r = (D(ctx).RECIPES || {})[recipeId]
  if (!r || !(S.mainShelf || []).includes(recipeId) || r.source !== 'shop') return { ok: false, reason: 'khong_co' }
  if (state.recipes[recipeId]) return { ok: false, reason: 'da_co' }
  if (state.day < (r.shopFromDay || 1)) return { ok: false, reason: 'chua_mo' }
  if (state.shift) return { ok: false, reason: 'dang_ban' }
  const res = buyRecipe(state, recipeId, r.shopPrice, ctx)
  if (res.ok && state.tasting && state.tasting.recipeId === recipeId) state.tasting = null
  return res.ok ? { ok: true, price: r.shopPrice } : res
}

// Tab Nâng cấp (5 nâng cấp M1, mua bằng Tiền quán, theo fromDay).
export function buyShopUpgrade(state, upgradeId, ctx) {
  return buyUpgrade(state, upgradeId, ctx)
}

// Góc Muỗng Vàng: mua màu dù (chỉ thẩm mỹ) và dùng ngay.
export function buyUmbrella(state, id, ctx) {
  const S = D(ctx).SHOP || {}
  const c = (D(ctx).COSMETICS || {})[id]
  if (!c || !(S.umbrellas || []).includes(id)) return { ok: false, reason: 'khong_co' }
  state.cosmetics = state.cosmetics || { owned: [], equipped: {} }
  if (state.cosmetics.owned.includes(id)) return { ok: false, reason: 'da_co' }
  const price = c.price || 0
  if ((state.goldSpoons || 0) < price) return { ok: false, reason: 'thieu_muong' }
  state.goldSpoons -= price
  state.cosmetics.owned.push(id)
  state.cosmetics.equipped = { ...(state.cosmetics.equipped || {}), du: id }
  emit(ctx, 'cosmetic.bought', { id, price })
  return { ok: true, price }
}

// Áp đồ thẩm mỹ đã có lên xe (id = null: bỏ ở chỗ `slot`).
export function equipCosmetic(state, id, ctx, slot = null) {
  const C = D(ctx).COSMETICS || {}
  state.cosmetics = state.cosmetics || { owned: [], equipped: {} }
  if (id === null) {
    if (!slot) return { ok: false, reason: 'khong_co' }
    state.cosmetics.equipped = { ...(state.cosmetics.equipped || {}), [slot]: null }
    return { ok: true }
  }
  const c = C[id]
  if (!c || !state.cosmetics.owned.includes(id)) return { ok: false, reason: 'khong_co' }
  state.cosmetics.equipped = { ...(state.cosmetics.equipped || {}), [c.slot]: id }
  return { ok: true }
}

// ---------- Nấu thử ----------

// Có được nấu thử miễn phí món này không.
export function canTaste(state, recipeId, ctx) {
  const r = (D(ctx).RECIPES || {})[recipeId]
  if (!r) return { ok: false, reason: 'khong_co' }
  if (state.recipes && state.recipes[recipeId]) return { ok: false, reason: 'da_co' }
  if (state.shift) return { ok: false, reason: 'dang_ban' }
  if (((state.shop && state.shop.tried) || []).includes(recipeId)) return { ok: false, reason: 'da_nau_thu' }
  return { ok: true }
}

// Tạo phiên nấu thử (lưu ở state.tasting, tách biệt state.shift): 1 phiếu 1 dòng, không đếm giờ.
export function startTasting(state, recipeId, ctx) {
  if (state.tasting && state.tasting.recipeId === recipeId) return { ok: true, tasting: state.tasting }
  const c = canTaste(state, recipeId, ctx)
  if (!c.ok) return c
  const ticket = { id: 'thu1', no: '#000', customerId: 'thu', lines: [{ recipeId, qty: 1, notes: [] }],
    createdAt: 0, status: 'cho', done: [null], receiptNo: '#000' }
  state.tasting = {
    recipeId, result: null,
    shift: {
      day: state.day, tasting: true, t: 0, paused: true, plan: [], queue: [], counter: null,
      customers: {}, tickets: [ticket], cook: null, drawer: makeFloat(), floatAmount: 0, qrBalance: 0, tipJar: 0,
      ledger: emptyLedger(), served: [], lost: [], missed: 0, scoreSheets: [], counterStreak: 0, nextTicketNo: 2,
      counts: {}, reputationGain: 0, tipsShown: 0, reviews: [], receipts: [], mods: null
    }
  }
  return { ok: true, tasting: state.tasting }
}

// State "hộp cát" để giao diện gọi thẳng các hàm bếp (startCook, submitChon, submitStep, finishDish…)
// cho phiên nấu thử: ví, thạo món, Mẹo nghề, nhiệm vụ không bị ảnh hưởng (ctx im lặng).
// → { state: sandbox, ctx: quietCtx } | null. sandbox.shift chính là state.tasting.shift.
export function tastingSandbox(state, ctx) {
  if (!state.tasting) return null
  const sandbox = {
    day: state.day, seed: state.seed, wallet: 0, recipes: {}, upgrades: { ...(state.upgrades || {}) },
    settings: { ...(state.settings || {}), tips: false }, tipsSeen: [], stats: {}, shift: state.tasting.shift
  }
  const quiet = { data: ctx && ctx.data, emit: () => {} }
  return { state: sandbox, ctx: quiet }
}

// Kết thúc nấu thử: ghi đã thử (miễn phí 1 lần), xóa phiên. Trả kết quả món (nếu đã Ra món).
export function finishTasting(state, ctx) {
  const t = state.tasting
  if (!t) return { ok: false, reason: 'khong_co' }
  const cook = t.shift.cook
  const result = (cook && cook.result) || (t.shift.tickets[0] && t.shift.tickets[0].done[0]) || null
  state.shop = state.shop || { tried: [] }
  if (!state.shop.tried.includes(t.recipeId)) state.shop.tried.push(t.recipeId)
  state.tasting = null
  if (state.stats) state.stats.tastings = (state.stats.tastings || 0) + 1
  emit(ctx, 'recipe.tasted', { recipeId: t.recipeId, grade: result ? result.grade : null })
  return { ok: true, result }
}
