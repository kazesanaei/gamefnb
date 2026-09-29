// Khách: sinh đơn theo ngày, chọn kiểu khách, máy trạng thái và kiên nhẫn.
import { nextFloat, chance, pick, weightedPick, makeRand } from './rng.js'
import { cfg, emit } from './state.js'
import { linePar } from './kitchen.js'

export const STATUSES = Object.freeze(['den', 'xep_hang', 'order', 'thanh_toan', 'tinh_tien', 'cho_mon', 'nhan_mon', 'roi_di', 'bo_ve'])
const TRANSITIONS = Object.freeze({
  den: ['xep_hang', 'bo_ve'],
  xep_hang: ['order', 'bo_ve'],
  order: ['thanh_toan', 'bo_ve'],
  thanh_toan: ['tinh_tien', 'order', 'bo_ve'],
  tinh_tien: ['cho_mon', 'bo_ve'],
  cho_mon: ['nhan_mon', 'bo_ve'],
  nhan_mon: ['roi_di', 'cho_mon'],
  roi_di: [],
  bo_ve: []
})

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to)
}

// Đổi trạng thái (kiểm tra luồng hợp lệ). Trả true nếu đổi được.
export function setStatus(customer, to) {
  if (customer.status === to) return true
  if (!canTransition(customer.status, to)) return false
  customer.status = to
  return true
}

// Khâu hiện tại cho thanh tiến trình 4 chấm: 'order' | 'thanh_toan' | 'tinh_tien' | 'lam_do' | null.
export function stageOf(customer) {
  switch (customer && customer.status) {
    case 'xep_hang': case 'order': return 'order'
    case 'thanh_toan': return 'thanh_toan'
    case 'tinh_tien': return 'tinh_tien'
    case 'cho_mon': case 'nhan_mon': return 'lam_do'
    default: return null
  }
}

export function isGone(customer) {
  return customer.status === 'roi_di' || customer.status === 'bo_ve'
}

// Khóa so sánh một dòng: recipeId + ghi chú đã sắp xếp.
export function lineKey(line) {
  return line.recipeId + '|' + [...(line.notes || [])].sort().join(',')
}

// Gộp dòng trùng khóa, sắp ghi chú.
export function normalizeLines(lines) {
  const out = []
  for (const l of lines || []) {
    const line = { recipeId: l.recipeId, qty: Math.max(1, Math.floor(Number(l.qty) || 1)), notes: [...new Set(l.notes || [])].sort() }
    const same = out.find(x => lineKey(x) === lineKey(line))
    if (same) same.qty += line.qty
    else out.push(line)
  }
  return out
}

// Món khách có thể gọi: có trong state.recipes và source 'default'/'shop' (hoặc 'event' khi đang mở).
export function orderableRecipes(state, ctx) {
  const R = (ctx.data && ctx.data.RECIPES) || {}
  const isEv = ctx.data && typeof ctx.data.isEventActive === 'function' ? ctx.data.isEventActive : null
  return Object.keys(state.recipes || {}).filter(id => {
    const r = R[id]
    if (!r) return false
    if (r.source === 'default' || r.source === 'shop') return true
    if (r.source === 'event' && isEv) {
      try { return !!isEv(r.eventId ?? r.id, state) } catch { return false }
    }
    return false
  })
}

function recipeWeight(state, id, day) {
  const p = state.recipes[id]
  // món mới mua được gọi ×2 trong 2 ca đầu
  if (p && p.boughtDay > 0 && day - p.boughtDay >= 0 && day - p.boughtDay < 2) return 2
  return 1
}

// Chọn ghi chú cho một dòng: mỗi nhóm (note.group, mặc định là id) tối đa 1.
function pickNotes(sh, recipe, day, ctx, max = 1) {
  const surchargeDay = cfg(ctx, 'surchargeFromDay')
  const cands = (recipe.notes || []).filter(n => !(n.surcharge > 0) || day >= surchargeDay)
  const chosen = []
  const groups = new Set()
  let pool = cands.slice()
  for (let i = 0; i < max && pool.length; i++) {
    const n = pick(sh, pool)
    chosen.push(n.id)
    groups.add(n.group || n.id)
    pool = pool.filter(x => !groups.has(x.group || x.id))
  }
  return chosen
}

// Sinh yêu cầu thật của một khách (theo lịch độ khó từng ngày).
export function makeRequest(state, sh, ctx, opts = {}) {
  const day = sh.day
  const R = ctx.data.RECIPES
  const menu = opts.menu || orderableRecipes(state, ctx)
  if (!menu.length) return []
  const weighted = menu.map(id => ({ id, w: recipeWeight(state, id, day) }))
  const pickRecipe = (exclude = []) => {
    const pool = weighted.filter(x => !exclude.includes(x.id))
    return (weightedPick(sh, pool.length ? pool : weighted) || weighted[0]).id
  }
  if (day < cfg(ctx, 'multiLineFromDay')) return [{ recipeId: pickRecipe(), qty: 1, notes: [] }]

  const noteRate = day < cfg(ctx, 'noteFromDay') ? 0 : (day >= 5 ? cfg(ctx, 'noteRateLate') : cfg(ctx, 'noteRateMid'))
  // đơn "tách dòng": cùng món, 2 dòng khác ghi chú
  if (day >= cfg(ctx, 'splitFromDay') && chance(sh, cfg(ctx, 'splitLineRate'))) {
    const cands = menu.filter(id => (R[id].notes || []).length > 0)
    if (cands.length) {
      const id = pick(sh, cands)
      const notes = pickNotes(sh, R[id], day, ctx, 1)
      if (notes.length) {
        return normalizeLines([
          { recipeId: id, qty: chance(sh, 0.3) ? 2 : 1, notes: [] },
          { recipeId: id, qty: 1, notes }
        ])
      }
    }
  }
  const w = cfg(ctx, 'lineCountWeights')
  const count = weightedPick(sh, [{ n: 1, w: w[0] }, { n: 2, w: w[1] }, { n: 3, w: w[2] }]).n
  const lines = []
  const used = []
  for (let i = 0; i < count; i++) {
    const id = pickRecipe(used)
    used.push(id)
    const r = nextFloat(sh)
    const qty = r < 0.8 ? 1 : (r < 0.97 ? 2 : 3)
    let notes = []
    if ((R[id].notes || []).length && chance(sh, noteRate)) notes = pickNotes(sh, R[id], day, ctx, chance(sh, 0.2) ? 2 : 1)
    lines.push({ recipeId: id, qty, notes })
  }
  return normalizeLines(lines)
}

// Kiên nhẫn xếp hàng (giây): 45 × persona, từ ngày 4 giảm 1 giây/ngày (sàn 32), ghế nhựa ×1,2.
export function patienceSecFor(state, persona, ctx, day) {
  day = day ?? state.day
  const base = Math.max(cfg(ctx, 'queuePatienceFloor'), cfg(ctx, 'queuePatienceBase') - Math.max(0, day - 3))
  let mul = (persona && persona.patience) || 1
  if (state.upgrades && state.upgrades.ghe_nhua) {
    const U = ctx.data && ctx.data.UPGRADES
    const u = U && (Array.isArray(U) ? U.find(x => x.id === 'ghe_nhua') : U.ghe_nhua)
    mul *= (u && u.effect && (u.effect.queuePatienceMul || u.effect.patienceMul)) || 1.2
  }
  return Math.round(base * mul * 10) / 10
}

// Thời gian phục vụ kỳ vọng (giây) = counterTimeEstimate + tổng par của đơn.
export function expectedServiceSec(request, ctx) {
  const R = ctx.data.RECIPES
  return cfg(ctx, 'counterTimeEstimate') + request.reduce((s, l) => s + linePar(R[l.recipeId], l), 0)
}

// Tên và giới tính ('nam' | 'nu') từ NAMES = {nam: [...], nu: [...]}.
function pickName(sh, ctx) {
  const N = ctx.data && ctx.data.NAMES
  if (!N) return { name: 'Khách', gender: null }
  if (Array.isArray(N)) { const n = pick(sh, N); return { name: typeof n === 'string' ? n : (n && n.name) || 'Khách', gender: null } }
  const keys = Object.keys(N).filter(k => Array.isArray(N[k]) && N[k].length)
  if (!keys.length) return { name: 'Khách', gender: null }
  const g = pick(sh, keys)
  const n = pick(sh, N[g])
  return { name: typeof n === 'string' ? n : (n && n.name) || 'Khách', gender: g === 'nam' || g === 'nu' ? g : null }
}

export function personaObj(ctx, id) {
  const P = (ctx.data && ctx.data.PERSONAS) || {}
  return P[id] ? { ...P[id], id } : { id, patience: 1, cash: 'small', qrRate: 0.25 }
}

// Chọn kiểu khách theo trọng số, chỉ các kiểu đã mở (fromDay ≤ ngày).
export function pickPersona(sh, ctx, day) {
  const P = (ctx.data && ctx.data.PERSONAS) || {}
  const items = Object.keys(P).filter(id => (P[id].fromDay || 1) <= day).map(id => ({ id, w: P[id].weight || 1 }))
  if (!items.length) return Object.keys(P)[0] || 'hoc_sinh'
  return weightedPick(sh, items).id
}

// Câu gọi món tự nhiên (dùng hàm nội dung makeSpeech nếu có; lỗi thì ghép câu đơn giản).
export function speechFor(customer, sh, ctx) {
  const R = (ctx.data && ctx.data.RECIPES) || {}
  const fn = ctx.data && ctx.data.makeSpeech
  if (typeof fn === 'function') {
    try {
      const s = fn({
        request: customer.request, persona: personaObj(ctx, customer.persona), region: customer.region, recipes: R,
        rand: makeRand(sh, 'rngText'), gender: customer.gender, name: customer.name,
        regularId: customer.regularId, firstVisit: !!customer.tutorial
      })
      if (s) return String(s)
    } catch { /* dùng câu dự phòng */ }
  }
  const parts = customer.request.map(l => {
    const r = R[l.recipeId]
    const notes = (l.notes || []).map(id => ((r && r.notes) || []).find(n => n.id === id)).filter(Boolean).map(n => n.label.toLowerCase())
    return `${l.qty} ${r ? r.name.toLowerCase() : l.recipeId}${notes.length ? ' ' + notes.join(', ') : ''}`
  })
  return `Cho ${parts.join(', ')} nha!`
}

// Câu thoại phản hồi (makeLine); lỗi → chuỗi rỗng.
export function lineFor(kind, customer, sh, ctx, vars = {}) {
  const fn = ctx.data && ctx.data.makeLine
  if (typeof fn !== 'function') return ''
  try {
    const v = { gender: customer.gender, name: customer.name, ...vars }
    return String(fn(kind, { persona: personaObj(ctx, customer.persona), region: customer.region, rand: makeRand(sh, 'rngText'), vars: v }) || '')
  } catch { return '' }
}

// Tạo khách (chưa tới quán, status 'den').
export function createCustomer(state, sh, ctx, { id, arriveAt = 0, regularId = null, tutorial = false, request = null, personaId = null, region = null, name = null, gender = null }) {
  const day = sh.day
  const pid = personaId || pickPersona(sh, ctx, day)
  const persona = personaObj(ctx, pid)
  const reg = region || (chance(sh, cfg(ctx, 'regionBacRate')) ? 'bac' : 'nam')
  const picked = name ? { name, gender } : pickName(sh, ctx)
  const req = request || makeRequest(state, sh, ctx)
  const c = {
    id, persona: pid, name: picked.name, gender: picked.gender || gender || null, region: reg, regularId, strict: !!persona.strict,
    request: normalizeLines(req), speech: '',
    status: 'den', arriveAt,
    patience: 1.0, patienceSec: patienceSecFor(state, persona, ctx, day),
    waitStart: null, waitBudget: null, waitRatio: null,
    payMethod: null, fakeQr: false, given: null,
    tutorial: !!tutorial,
    penalties: [], orderErrors: [],
    ticketId: null, dishes: [], stars: null, tip: 0, review: null,
    starCap: 5, apologyBonus: 0, complaint: null, reviewLate: null, lostReason: null,
    expectedSec: 0
  }
  c.expectedSec = expectedServiceSec(c.request, ctx)
  c.speech = speechFor(c, sh, ctx)
  return c
}

// Khách quen (REGULARS): tên, kiểu khách, vùng, món yêu thích.
export function createRegular(state, sh, ctx, regularId, { id, arriveAt = 0, tutorial = false }) {
  const RG = (ctx.data && ctx.data.REGULARS) || {}
  const r = RG[regularId] || {}
  const menu = orderableRecipes(state, ctx)
  // favorite: 'recipeId' hoặc {recipeId, notes}
  const favs = [r.favorite, r.favoriteRecipe, r.recipeId, ...(Array.isArray(r.favorites) ? r.favorites : [])]
    .filter(Boolean).map(f => (typeof f === 'string' ? { recipeId: f, notes: [] } : f))
  const fav = favs.find(f => f.recipeId && menu.includes(f.recipeId))
  // khách hướng dẫn ngày 1: không ghi chú
  const request = fav ? [{ recipeId: fav.recipeId, qty: 1, notes: tutorial ? [] : (fav.notes || []).slice() }] : [{ recipeId: menu[0], qty: 1, notes: [] }]
  const P = (ctx.data && ctx.data.PERSONAS) || {}
  const personaId = r.persona && P[r.persona] ? r.persona : null
  return createCustomer(state, sh, ctx, {
    id, arriveAt, regularId, tutorial, request, personaId,
    region: r.region === 'bac' || r.region === 'nam' ? r.region : null,
    name: r.name || null, gender: r.gender || null
  })
}

// Trừ kiên nhẫn của khách đang xếp hàng; từ ngày leaveFromDay, hết kiên nhẫn khi còn xếp hàng → bỏ về.
// Trả mảng id khách bỏ về.
export function drainPatience(state, dt, ctx) {
  const sh = state.shift
  const left = []
  const counterId = sh.counter ? sh.counter.customerId : null
  const mul = cfg(ctx, 'counterDrainMul')
  for (const id of sh.queue.slice()) {
    const c = sh.customers[id]
    if (!c || c.tutorial) continue
    const rate = (1 / Math.max(1, c.patienceSec)) * (id === counterId ? mul : 1)
    c.patience = Math.max(0, c.patience - rate * dt)
    if (c.patience <= 0 && c.status === 'xep_hang' && sh.day >= cfg(ctx, 'leaveFromDay')) {
      loseCustomer(state, c, 'het_kien_nhan', ctx)
      left.push(id)
    }
  }
  return left
}

// Khách rời quán không mua (bỏ về / từ chối QR / đóng ca).
export function loseCustomer(state, customer, reason, ctx) {
  const sh = state.shift
  customer.status = 'bo_ve'
  customer.lostReason = reason
  sh.queue = sh.queue.filter(x => x !== customer.id)
  if (sh.counter && sh.counter.customerId === customer.id) sh.counter = null
  if (!sh.lost.includes(customer.id)) sh.lost.push(customer.id)
  emit(ctx, 'customer.lost', { customerId: customer.id, reason })
}

