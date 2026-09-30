// Nguyên liệu và công thức hiếm (M4, thiết kế docs/tham-khao/m4-thiet-ke.md mục C). Lõi thuần: không DOM, không đọc
// đồng hồ (giờ thật truyền vào qua nowInfo / sh.dayKey), ngẫu nhiên tất định theo hạt giống của save (rng.js).
//
// Kho state.rare (mặc định ở state.defaultRare):
//   stock {ingId: số phần, 0..stockMax}; phần dư (kho đầy hoặc quá mức mỗi ngày thật) đổi overflowGold Muỗng Vàng/phần.
//   fragments {recipeId: số mảnh}; đủ fragmentsNeed mảnh → nấu thử (shop.js) đạt hạng Được là mở món.
//   pity {ing, frag}: bảo hiểm Giỏ chợ (2 lượt liền không ra nguyên liệu → lượt 3 chắc chắn) và mảnh (3 lần liền ở nguồn
//     có tỉ lệ — Giỏ chợ, phiên hàng — không ra mảnh → lần sau ở nguồn có tỉ lệ chắc chắn ra mảnh).
//   today {key, got, frags, stalls, strangerDay}: trần mỗi ngày thật (6 phần + 3 mảnh, mọi nguồn trừ phần tự bỏ tiền
//     mua), phiên hàng đã ghé, ngày khách lạ đã ghé (tải lại trang không làm khách lạ ghé 2 lần).
//   seen: nguyên liệu hiếm đã từng có; pendingStall {id, dayKey, picked?, mistakes?}: đang lựa hàng dở ở phiên hàng (rổ
//     đang chọn và số lần chọn nhầm được lưu mỗi lần chạm: rời chợ hay tải lại trang rồi "Lựa tiếp" vẫn giữ nguyên rổ và
//     lỗi đã mắc, không thành một lượt lựa mới sạch).
// Nguồn: phiên hàng theo giờ thật (startStall/finishStall, mini-game "Lựa hàng" dùng lại bước Chọn nguyên liệu), khách lạ
// ở ca đầu mỗi ngày thật (pickStranger ở startShift, quà theo sao ở finishShiftRare), Giỏ chợ rút cuối ca (rollBasket),
// tình huống trong ca (incidents.js), phần thưởng (rewards.js: khóa rare, fragments).
// Tiêu hao: mỗi phần món hiếm trừ kho lúc "Ra món" (kitchen.finishDish); món hiếm chỉ được gọi khi kho còn (chốt lúc
// mở ca: sh.rareMenu, đơn không vượt tồn kho), quầy giới hạn theo rareLeft.
import { seedFrom, nextFloat, pick, shuffle } from './rng.js'
import { emit, unlockTip, defaultRare, defaultRareToday } from './state.js'
import { vnMinutes, hhmmToMinutes } from './clock.js'

const DEFAULTS = Object.freeze({
  fromDay: 3, stockMax: 6, overflowGold: 2, dailyCap: 6, dailyFragCap: 3, fragmentsNeed: 3, unlockGrade: 'duoc',
  fragmentPityAfter: 3, orderWeight: 1.5, repPerGood: 1,
  basket: Object.freeze({ ingredient: 0.4, pityAfter: 2 }),
  stall: Object.freeze({ base: 1, bonusAt: 90, fragmentAt: 75, fragmentRate: 0.5, shelfSize: 9, par: 6 }),
  stranger: Object.freeze({ gifts: Object.freeze([
    Object.freeze({ minStars: 5, portions: 2 }), Object.freeze({ minStars: 4, portions: 1 }), Object.freeze({ minStars: 3, fragments: 1 })
  ]) })
})

// Thứ tự hạng món (nấu thử đạt từ unlockGrade là mở món hiếm).
export const GRADE_ORDER = Object.freeze(['hong', 'kem', 'duoc', 'ngon', 'tuyet_hao'])

function D(ctx) { return (ctx && ctx.data) || {} }
function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v) }
function int0(v) { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0 }

// Cấu hình hàng hiếm (dữ liệu RARE_CONFIG gộp với mặc định).
export function rareConfig(ctx) {
  const C = D(ctx).RARE_CONFIG || {}
  return {
    ...DEFAULTS, ...C,
    basket: { ...DEFAULTS.basket, ...(C.basket || {}) },
    stall: { ...DEFAULTS.stall, ...(C.stall || {}) },
    stranger: { ...DEFAULTS.stranger, ...(C.stranger || {}) }
  }
}

// ---------- Dữ liệu ----------

export function rareIngredientIds(ctx) {
  return Object.entries(D(ctx).INGREDIENTS || {}).filter(([, g]) => g && g.rare).map(([id]) => id)
}

export function isRareIngredient(ctx, id) {
  const g = id && (D(ctx).INGREDIENTS || {})[id]
  return !!(g && g.rare)
}

export function isRareRecipe(recipe) {
  return !!(recipe && recipe.source === 'hiem')
}

// Id các công thức hiếm có trong dữ liệu (theo thứ tự khai báo).
export function rareRecipeIds(ctx) {
  return Object.values(D(ctx).RECIPES || {}).filter(isRareRecipe).map(r => r.id)
}

// Hệ thống hàng hiếm có dữ liệu (nguyên liệu hiếm và cấu hình).
export function rareActive(ctx) {
  return !!D(ctx).RARE_CONFIG && rareIngredientIds(ctx).length > 0
}

// Nguyên liệu hiếm tiêu hao mỗi phần món: {ingId: số phần kho} (chỉ số nguyên dương).
export function recipeRareNeed(recipe) {
  const out = {}
  if (!recipe || !isObj(recipe.rare)) return out
  for (const [id, n] of Object.entries(recipe.rare)) if (int0(n) > 0) out[id] = int0(n)
  return out
}

// Món nền phải có trước khi gom mảnh / nấu thử món hiếm.
export function rareBaseIds(recipe) {
  const ids = new Set()
  if (recipe && recipe.baseRecipe) ids.add(recipe.baseRecipe)
  for (const id of (recipe && recipe.requires) || []) ids.add(id)
  return [...ids]
}

function ingName(ctx, id) {
  const g = (D(ctx).INGREDIENTS || {})[id]
  return g ? g.name : id
}

function recipeName(ctx, id) {
  const r = (D(ctx).RECIPES || {})[id]
  return r ? r.name : id
}

// Giá quy đổi của 1 phần kho (giá × số đơn vị mỗi phần), đồng.
export function rareValue(ctx, id) {
  const g = (D(ctx).INGREDIENTS || {})[id]
  return g && g.rare ? (Number(g.cost) || 0) * (int0(g.portion) || 1) : 0
}

// ---------- Kho ----------

// Kho trong save (tạo mặc định / sửa trường hỏng nếu cần).
export function ensureRare(state) {
  if (!isObj(state.rare)) state.rare = defaultRare()
  const R = state.rare
  if (!isObj(R.stock)) R.stock = {}
  if (!isObj(R.fragments)) R.fragments = {}
  if (!isObj(R.pity)) R.pity = { ing: 0, frag: 0 }
  if (!Number.isFinite(R.pity.ing)) R.pity.ing = 0
  if (!Number.isFinite(R.pity.frag)) R.pity.frag = 0
  if (!isObj(R.today)) R.today = defaultRareToday()
  const t = R.today
  if (typeof t.key !== 'string') t.key = ''
  if (!Number.isFinite(t.got)) t.got = 0
  if (!Number.isFinite(t.frags)) t.frags = 0
  if (!Array.isArray(t.stalls)) t.stalls = []
  if (typeof t.strangerDay !== 'string') t.strangerDay = ''
  if (!Array.isArray(R.seen)) R.seen = []
  if (!(R.pendingStall === null || (isObj(R.pendingStall) && typeof R.pendingStall.id === 'string'))) R.pendingStall = null
  if (R.pendingStall === undefined) R.pendingStall = null
  return R
}

// Sổ của ngày thật `key` (sang ngày thật mới thì mở sổ mới). Ngày cũ hơn sổ đang có (giờ máy bị lùi) hoặc không có giờ
// thật → dùng sổ hiện tại (vẫn tính vào trần của ngày đang có).
export function rareToday(state, key = '') {
  const R = ensureRare(state)
  if (key && (!R.today.key || key > R.today.key)) R.today = { ...defaultRareToday(), key }
  return R.today
}

export function rareStock(state, id) {
  return Number(state.rare && isObj(state.rare.stock) && state.rare.stock[id]) || 0
}

// Số phần còn chứa được của nguyên liệu hiếm `id` (0 nếu không phải nguyên liệu hiếm).
export function rareRoom(state, id, ctx) {
  if (!isRareIngredient(ctx, id)) return 0
  return Math.max(0, rareConfig(ctx).stockMax - rareStock(state, id))
}

// Phần và mảnh còn nhận được trong ngày thật `key` (trần mỗi ngày thật).
export function rareDayRoom(state, ctx, key = '') {
  const C = rareConfig(ctx)
  const t = rareToday(state, key)
  return { portions: Math.max(0, C.dailyCap - (Number(t.got) || 0)), frags: Math.max(0, C.dailyFragCap - (Number(t.frags) || 0)) }
}

// Cộng n phần nguyên liệu hiếm vào kho. Trong sức chứa kho và trong trần ngày thật (dayCap; hàng tự bỏ tiền mua
// `bought` và phần thưởng cố định của thư/chuỗi `dayCap: false` không tính trần ngày); phần dư đổi overflowGold Muỗng
// Vàng mỗi phần (hàng mua thì không có phần dư: giao diện chỉ cho mua trong sức chứa).
// Phát 'rare.gained' {id, n, spoons, source, bought} (bought: hàng tự bỏ tiền mua, không phải thưởng). Trả {id, name, got,
// spoons, over}.
export function grantRare(state, id, n, ctx, { bought = false, dayCap = true, dayKey = '', source = '' } = {}) {
  const want = int0(n)
  const out = { id, name: ingName(ctx, id), got: 0, spoons: 0, over: 0 }
  if (!want || !isRareIngredient(ctx, id)) return out
  const R = ensureRare(state)
  const C = rareConfig(ctx)
  const t = rareToday(state, dayKey)
  const capped = dayCap && !bought
  let room = rareRoom(state, id, ctx)
  if (capped) room = Math.min(room, Math.max(0, C.dailyCap - (Number(t.got) || 0)))
  const got = Math.min(want, room)
  out.got = got
  out.over = want - got
  if (got > 0) {
    R.stock[id] = rareStock(state, id) + got
    if (capped) t.got = (Number(t.got) || 0) + got
    if (!R.seen.includes(id)) R.seen.push(id)
  }
  if (!bought && out.over > 0) {
    out.spoons = out.over * (Number(C.overflowGold) || 0)
    if (out.spoons > 0) state.goldSpoons = (Number(state.goldSpoons) || 0) + out.spoons
  }
  if (got > 0 || out.spoons > 0) emit(ctx, 'rare.gained', { id, n: got, spoons: out.spoons, source, bought: !!bought })
  return out
}

// Bản gọn cho tình huống/thưởng cũ: trả số phần thật sự vào kho.
export function grantRareStock(state, id, n, ctx, opts = {}) {
  return grantRare(state, id, n, ctx, opts).got
}

// Đã có công thức hiếm nào chưa.
export function ownsRareRecipe(state, ctx) {
  const R = D(ctx).RECIPES || {}
  return Object.keys(state.recipes || {}).some(id => isRareRecipe(R[id]))
}

// ---------- Mảnh công thức ----------

// Món hiếm còn nhận mảnh: chưa có, đã có món nền, chưa đủ mảnh. Món đang gom dở (nhiều mảnh hơn) lên trước.
export function fragmentCandidates(state, ctx) {
  const C = rareConfig(ctx)
  const owned = state.recipes || {}
  const frags = (state.rare && isObj(state.rare.fragments)) ? state.rare.fragments : {}
  const list = Object.values(D(ctx).RECIPES || {}).filter(r => isRareRecipe(r) && !owned[r.id] &&
    rareBaseIds(r).every(b => owned[b]) && (Number(frags[r.id]) || 0) < C.fragmentsNeed)
  return list.map((r, i) => ({ r, i, n: Number(frags[r.id]) || 0 })).sort((a, b) => (b.n - a.n) || (a.i - b.i)).map(x => x.r.id)
}

// Cộng n mảnh công thức (từng mảnh cho món đang cần nhất, hoặc đúng món `recipeId`); quá trần mảnh mỗi ngày thật thì
// đổi Muỗng Vàng (dayCap: false → không tính trần ngày, cho phần thưởng cố định của thư/chuỗi).
// Trả {recipeId, name, n, spoons, list: [{recipeId, name, n}]} hoặc null khi không món nào nhận mảnh.
export function grantFragment(state, n, ctx, { dayKey = '', recipeId = null, source = '', dayCap = true } = {}) {
  const want = int0(n)
  if (!want) return null
  const C = rareConfig(ctx)
  const R = ensureRare(state)
  const t = rareToday(state, dayKey)
  const got = {}
  let spoons = 0
  let any = false
  for (let k = 0; k < want; k++) {
    const cands = fragmentCandidates(state, ctx)
    const id = recipeId ? (cands.includes(recipeId) ? recipeId : null) : cands[0]
    if (!id) break
    any = true
    if (dayCap && (Number(t.frags) || 0) >= C.dailyFragCap) { spoons += Number(C.overflowGold) || 0; continue }
    R.fragments[id] = (Number(R.fragments[id]) || 0) + 1
    if (dayCap) t.frags = (Number(t.frags) || 0) + 1
    got[id] = (got[id] || 0) + 1
  }
  if (!any) return null
  if (spoons > 0) state.goldSpoons = (Number(state.goldSpoons) || 0) + spoons
  const list = Object.entries(got).map(([id, k]) => ({ recipeId: id, name: recipeName(ctx, id), n: k }))
  const first = list[0] || { recipeId: recipeId || fragmentCandidates(state, ctx)[0] || '', name: '', n: 0 }
  emit(ctx, 'rare.fragment', { recipeId: first.recipeId, n: list.reduce((s, x) => s + x.n, 0), spoons, source })
  return { recipeId: first.recipeId, name: first.name || recipeName(ctx, first.recipeId), n: list.reduce((s, x) => s + x.n, 0), spoons, list }
}

// Bản gọn cho tình huống: {recipeId, n} hoặc null.
export function grantRareFragment(state, n, ctx, opts = {}) {
  const r = grantFragment(state, n, ctx, opts)
  return r && r.n > 0 ? { recipeId: r.recipeId, n: r.n } : null
}

// Nguồn có tỉ lệ ra mảnh (phiên hàng, Giỏ chợ): có bảo hiểm sau fragmentPityAfter lần liền không ra.
function fragmentPitySure(state, ctx) {
  return (Number(ensureRare(state).pity.frag) || 0) >= rareConfig(ctx).fragmentPityAfter
}

// Tình trạng mở món hiếm: {recipeId, owned, baseOwned, bases, n, need, ready}.
export function rareUnlockInfo(state, recipeId, ctx) {
  const r = (D(ctx).RECIPES || {})[recipeId]
  const C = rareConfig(ctx)
  const owned = !!(state.recipes && state.recipes[recipeId])
  const bases = rareBaseIds(r)
  const baseOwned = bases.every(b => state.recipes && state.recipes[b])
  const n = Number(state.rare && isObj(state.rare.fragments) && state.rare.fragments[recipeId]) || 0
  return { recipeId, owned, baseOwned, bases, n: Math.min(n, C.fragmentsNeed), need: C.fragmentsNeed,
    ready: !!r && isRareRecipe(r) && !owned && baseOwned && n >= C.fragmentsNeed }
}

// Hạng món đạt mức mở món (mặc định từ hạng Được).
export function gradeUnlocks(grade, ctx) {
  const need = GRADE_ORDER.indexOf(rareConfig(ctx).unlockGrade)
  return GRADE_ORDER.indexOf(grade) >= Math.max(0, need)
}

// ---------- Nhu cầu kho (chọn hàng nào cho người chơi) ----------

// Khóa nhu cầu của một nguyên liệu hiếm: [kho đầy ? 1 : 0, hạng dùng (0 = món hiếm đã có, 1 = món đang gom mảnh / chờ
// nấu thử, 2 = còn lại), số phần đang có]. Nhỏ hơn = cần hơn.
function needKey(state, ctx, id, frag) {
  const R = D(ctx).RECIPES || {}
  const owned = state.recipes || {}
  let tier = 2
  for (const r of Object.values(R)) {
    if (!isRareRecipe(r) || !recipeRareNeed(r)[id]) continue
    if (owned[r.id]) tier = Math.min(tier, 0)
    else if (frag.has(r.id) || rareUnlockInfo(state, r.id, ctx).ready) tier = Math.min(tier, 1)
  }
  return [rareRoom(state, id, ctx) <= 0 ? 1 : 0, tier, rareStock(state, id)]
}

// Xếp nguyên liệu hiếm theo nhu cầu (needKey); hòa thì giữ thứ tự đầu vào. Không ngẫu nhiên.
export function rareNeedOrder(state, ids, ctx) {
  const frag = new Set(fragmentCandidates(state, ctx))
  return (ids || []).map((id, i) => ({ id, i, k: needKey(state, ctx, id, frag) }))
    .sort((a, b) => (a.k[0] - b.k[0]) || (a.k[1] - b.k[1]) || (a.k[2] - b.k[2]) || (a.i - b.i)).map(x => x.id)
}

// Hai nguyên liệu cần như nhau.
function sameNeed(state, ctx, a, b) {
  if (a === b) return true
  const frag = new Set(fragmentCandidates(state, ctx))
  const x = needKey(state, ctx, a, frag), y = needKey(state, ctx, b, frag)
  return x.every((v, i) => v === y[i])
}

// Nguyên liệu kho đang cần nhất (hòa thì bốc bằng holder).
function neededIngredient(state, ctx, holder, ids = rareIngredientIds(ctx)) {
  const order = rareNeedOrder(state, ids, ctx)
  if (!order.length) return null
  const top = order.filter(id => sameNeed(state, ctx, order[0], id))
  return top.length > 1 ? pick(holder, top) : order[0]
}

// ---------- Món hiếm trong ca ----------

// Số phần món hiếm làm được với tồn kho (trừ phần đã giữ `used` {ingId: n}). Món thường → Infinity.
export function rarePortions(state, recipe, used = {}) {
  const need = recipeRareNeed(recipe)
  let n = Infinity
  for (const [id, k] of Object.entries(need)) n = Math.min(n, Math.floor(Math.max(0, rareStock(state, id) - (Number(used[id]) || 0)) / k))
  return n
}

// Món hiếm bán được lúc mở ca: đã có và kho đủ ít nhất 1 phần (chốt vào sh.rareMenu).
export function rareMenuFor(state, ctx) {
  const R = D(ctx).RECIPES || {}
  return Object.keys(state.recipes || {}).filter(id => isRareRecipe(R[id]) && rarePortions(state, R[id]) >= 1)
}

function addNeed(into, recipe, qty) {
  for (const [id, k] of Object.entries(recipeRareNeed(recipe))) into[id] = (into[id] || 0) + k * Math.max(1, int0(qty) || 1)
  return into
}

// Nguyên liệu hiếm đã "giữ chỗ" trong ca: dòng phiếu bếp chưa ra món + phiếu đang ghi ở quầy (bỏ dòng skipDraftIndex,
// hoặc cả phiếu đang ghi khi withDraft = false).
export function rareCommitted(state, ctx, { skipDraftIndex = -1, withDraft = true } = {}) {
  const R = D(ctx).RECIPES || {}
  const sh = state.shift
  const out = {}
  if (!sh) return out
  for (const t of sh.tickets || []) {
    (t.lines || []).forEach((l, i) => { if (!(t.done && t.done[i])) addNeed(out, R[l.recipeId], l.qty) })
  }
  // món đang nấu dở của phiếu đã rời dây (hiếm gặp) vẫn giữ chỗ tới lúc Ra món
  if (sh.cook && sh.cook.phase !== 'xong' && !(sh.tickets || []).some(t => t.id === sh.cook.ticketId)) addNeed(out, R[sh.cook.recipeId], sh.cook.qty)
  if (withDraft && sh.counter && Array.isArray(sh.counter.draft)) {
    sh.counter.draft.forEach((l, i) => { if (i !== skipDraftIndex) addNeed(out, R[l.recipeId], l.qty) })
  }
  return out
}

// Số phần món hiếm còn ghi phiếu được (tồn kho trừ phần đã nằm trên phiếu bếp chưa ra món và phiếu đang ghi).
// Món thường → Infinity.
export function rareLeft(state, recipeId, ctx, opts = {}) {
  const r = (D(ctx).RECIPES || {})[recipeId]
  if (!isRareRecipe(r)) return Infinity
  return rarePortions(state, r, rareCommitted(state, ctx, opts))
}

// Phiếu `lines` có vượt tồn kho hiếm không (so với phần đã giữ trên phiếu bếp; withDraft: tính cả phiếu đang ghi ở quầy).
// true = đủ hàng.
export function rareLinesFit(state, lines, ctx, { withDraft = false } = {}) {
  const R = D(ctx).RECIPES || {}
  const used = rareCommitted(state, ctx, { withDraft })
  for (const l of lines || []) addNeed(used, R[l.recipeId], l.qty)
  return Object.entries(used).every(([id, n]) => n <= rareStock(state, id))
}

// Trừ kho khi Ra món (nấu thử không gọi). Thiếu thì trừ tới 0. Phát 'rare.used'. Trả {ingId: số phần đã trừ}.
export function consumeRare(state, recipeId, qty, ctx) {
  const r = (D(ctx).RECIPES || {})[recipeId]
  const used = {}
  if (!isRareRecipe(r)) return used
  const R = ensureRare(state)
  for (const [id, k] of Object.entries(addNeed({}, r, qty))) {
    const take = Math.min(k, rareStock(state, id))
    if (take > 0) { R.stock[id] = rareStock(state, id) - take; used[id] = take }
  }
  if (Object.keys(used).length) emit(ctx, 'rare.used', { recipeId, qty: Math.max(1, int0(qty) || 1), used })
  return used
}

// Danh tiếng của món hiếm đạt Ngon trở lên: repPerGood mỗi phần.
export function rareReputation(dishes, ctx) {
  const R = D(ctx).RECIPES || {}
  const per = Number(rareConfig(ctx).repPerGood) || 0
  let rep = 0
  for (const d of dishes || []) {
    if (d && isRareRecipe(R[d.recipeId]) && (d.grade === 'ngon' || d.grade === 'tuyet_hao')) rep += per * Math.max(1, int0(d.qty) || 1)
  }
  return rep
}

// Một dòng món hiếm về món nền (giữ ghi chú món nền cũng có).
export function baseLineOf(line, R) {
  const r = R[line.recipeId]
  const base = r && r.baseRecipe && R[r.baseRecipe] ? R[r.baseRecipe] : null
  if (!base) return null
  const ok = new Set((base.notes || []).map(n => n.id))
  return { recipeId: base.id, qty: line.qty, notes: (line.notes || []).filter(n => ok.has(n)) }
}

// Vòng tất định sau khi sinh mọi đơn của ca (không dùng số ngẫu nhiên): cộng dồn phần hiếm theo thứ tự khách, dòng nào
// vượt tồn kho thì đổi về món nền. `list`: khách theo thứ tự đến. Trả danh sách khách có đơn bị đổi.
export function capRareRequests(state, list, ctx) {
  const R = D(ctx).RECIPES || {}
  const used = {}
  const changed = []
  for (const c of list || []) {
    let touched = false
    c.request = (c.request || []).map(l => {
      const r = R[l.recipeId]
      if (!isRareRecipe(r)) return l
      const need = addNeed({}, r, l.qty)
      const fits = Object.entries(need).every(([id, n]) => (used[id] || 0) + n <= rareStock(state, id))
      if (fits) { for (const [id, n] of Object.entries(need)) used[id] = (used[id] || 0) + n; return l }
      const b = baseLineOf(l, R)
      if (!b) return l
      touched = true
      return b
    })
    if (touched) changed.push(c)
  }
  return changed
}

// ---------- Giỏ chợ ----------

// Tỉ lệ công khai của lượt Giỏ chợ kế tiếp (ngày thật `dayKey`): {ingredient, fragment, pity, pityAfter, sure, fragSure,
// allIng, allReason}.
// - Không còn món nhận mảnh hoặc hết mức mảnh hôm nay → 100% nguyên liệu (allIng), lý do allReason: 'het_muc_ngay' (hôm
//   nay đã đủ mảnh), 'can_mon_nen' (món hiếm còn lại cần mua món nền trước), 'du_manh' (đã mở / đủ mảnh mọi món hiếm).
// - Bảo hiểm nguyên liệu (sure): pityAfter lượt liền không ra nguyên liệu → lượt kế chắc chắn ra nguyên liệu.
// - Bảo hiểm mảnh (fragSure): fragmentPityAfter lần liền ở nguồn có tỉ lệ (Giỏ chợ, phiên hàng) không ra mảnh → lượt kế
//   chắc chắn ra mảnh. Hai bảo hiểm cùng tới hạn thì nguyên liệu trước (thanh may mắn công khai), mảnh để lượt sau.
export function basketOdds(state, ctx, dayKey = '') {
  const C = rareConfig(ctx)
  const R = ensureRare(state)
  const hasCand = fragmentCandidates(state, ctx).length > 0
  const dayFrag = rareDayRoom(state, ctx, dayKey).frags > 0
  const fragOk = hasCand && dayFrag
  const after = Math.max(1, int0(C.basket.pityAfter) || 2)
  const pity = Math.min(after, Math.max(0, Math.round(Number(R.pity.ing) || 0)))
  const ingSure = !fragOk || pity >= after
  const fragSure = fragOk && !ingSure && fragmentPitySure(state, ctx)
  // tỉ lệ công khai của mỗi lượt (bảo hiểm tới hạn thì sure/fragSure quyết định lượt kế tiếp)
  const ing = !fragOk ? 1 : Math.min(1, Math.max(0, Number(C.basket.ingredient) || 0))
  let allReason = null
  if (!fragOk) {
    const R2 = D(ctx).RECIPES || {}
    const owned = state.recipes || {}
    const waitBase = Object.values(R2).some(r => isRareRecipe(r) && !owned[r.id] && !rareBaseIds(r).every(b => owned[b]))
    allReason = hasCand ? 'het_muc_ngay' : waitBase ? 'can_mon_nen' : 'du_manh'
  }
  return { ingredient: ing, fragment: 1 - ing, pity, pityAfter: after, sure: ingSure, fragSure, allIng: !fragOk, allReason }
}

// Rút 1 lượt Giỏ chợ bằng luồng `holder` (tất định). Trả ghi chú {kind: 'gio_cho', result: 'ing'|'frag', got, fragment,
// spoons, sure (bảo hiểm nguyên liệu), fragSure (bảo hiểm mảnh)}.
export function rollBasket(state, ctx, holder, { dayKey = '' } = {}) {
  const R = ensureRare(state)
  const odds = basketOdds(state, ctx, dayKey)
  const u = nextFloat(holder)
  let result = odds.sure ? 'ing' : odds.fragSure ? 'frag' : u < odds.ingredient ? 'ing' : 'frag'
  const out = { kind: 'gio_cho', result, got: [], fragment: null, spoons: 0, sure: odds.sure && !odds.allIng, fragSure: !!odds.fragSure }
  if (result === 'frag') {
    const f = grantFragment(state, 1, ctx, { dayKey, source: 'gio_cho' })
    if (f && f.n > 0) {
      out.fragment = { recipeId: f.recipeId, name: f.name, n: f.n }
      out.spoons += f.spoons
      R.pity.ing = Math.min(99, (Number(R.pity.ing) || 0) + 1)
      R.pity.frag = 0
    } else result = out.result = 'ing'
  }
  if (result === 'ing') {
    const id = neededIngredient(state, ctx, holder)
    if (id) {
      const g = grantRare(state, id, 1, ctx, { dayKey, source: 'gio_cho' })
      out.got.push({ id: g.id, name: g.name, n: g.got })
      out.spoons += g.spoons
    }
    R.pity.ing = 0
    if (!odds.allIng) R.pity.frag = Math.min(99, (Number(R.pity.frag) || 0) + 1)
  }
  return out
}

// ---------- Phiên hàng theo giờ thật ----------

// Các phiên hàng (dữ liệu STALLS) kèm phút mở/đóng trong ngày.
export function stallList(ctx) {
  return (D(ctx).STALLS || []).map(s => ({ ...s, fromMin: hhmmToMinutes(s.from), toMin: hhmmToMinutes(s.to) }))
    .filter(s => Number.isFinite(s.fromMin) && Number.isFinite(s.toMin) && s.fromMin < s.toMin)
}

function stallView(s, extra = {}) {
  return { id: s.id, name: s.name, seller: s.seller || '', persona: s.persona || null, gender: s.gender || null, from: s.from, to: s.to, goods: (s.goods || []).slice(),
    desc: s.desc || '', hello: s.hello || '', ...extra }
}

// Trạng thái phiên hàng theo giờ thật: { dayKey, minutes, locked (giờ máy bị lùi), tooEarly (chưa tới ngày game mở),
// inShift, current (phiên đang mở, kèm done/canStart/reason), next (phiên kế tiếp trong ngày), tomorrow (phiên đầu ngày
// mai khi hôm nay hết phiên), pending (id phiên đang lựa dở), stalls: [...] }.
export function stallStatus(state, nowInfo, ctx) {
  const C = rareConfig(ctx)
  const list = stallList(ctx)
  const ni = nowInfo || {}
  const ms = Number(ni.trusted ?? ni.now) || 0
  const minutes = vnMinutes(ms)
  const dayKey = String(ni.dayKey || '')
  const R = ensureRare(state)
  const done = R.today.key === dayKey ? R.today.stalls : []
  const locked = !!ni.rewind
  const tooEarly = (Number(state.day) || 1) < C.fromDay
  const inShift = !!state.shift
  const pending = R.pendingStall && R.pendingStall.dayKey === dayKey ? R.pendingStall.id : null
  const cur = list.find(s => minutes >= s.fromMin && minutes < s.toMin) || null
  const next = list.find(s => s.fromMin > minutes) || null
  const reason = s => (done.includes(s.id) ? 'da_nhan' : locked ? 'lui_gio' : tooEarly ? 'chua_toi_ngay' : inShift ? 'dang_ban' : null)
  const current = cur ? stallView(cur, { done: done.includes(cur.id), canStart: !reason(cur), reason: reason(cur) }) : null
  return {
    active: list.length > 0 && rareActive(ctx), dayKey, minutes, locked, tooEarly, inShift, pending,
    current, next: next ? stallView(next) : null, tomorrow: !next && list.length ? stallView(list[0]) : null,
    stalls: list.map(s => stallView(s, { open: s === cur, done: done.includes(s.id) }))
  }
}

function stallById(ctx, id) {
  return stallList(ctx).find(s => s.id === id) || null
}

// Kệ "Lựa hàng" của phiên `stall` (9 ô): hàng hiếm + hàng thường dễ nhầm của từng món + hàng thường khác cho đủ ô;
// vị trí xáo tất định theo (save, ngày thật, phiên). Trả công thức dựng tạm cho bước Chọn nguyên liệu:
// { recipe: {id, name, icon, ingredients (hàng hiếm, vai 'chinh'), decoys, shelf, notes, steps}, step, goods, traps }.
export function stallGame(state, stall, dayKey, ctx) {
  const INGS = D(ctx).INGREDIENTS || {}
  const C = rareConfig(ctx).stall
  const size = Math.max(3, int0(C.shelfSize) || 9)
  const goods = (stall.goods || []).filter(id => INGS[id])
  const traps = []
  for (const g of goods) for (const t of (INGS[g] && INGS[g].traps) || []) if (INGS[t] && !goods.includes(t) && !traps.includes(t)) traps.push(t)
  const cells = [...goods, ...traps]
  for (const f of stall.fillers || []) if (cells.length < size && INGS[f] && !cells.includes(f)) cells.push(f)
  const shelf = shuffle({ rng: seedFrom(state.seed, dayKey, stall.id) }, cells.slice(0, Math.max(size, goods.length)))
  const step = { id: 'chon', type: 'chon', label: 'Lựa hàng', par: Number(C.par) || 6, w: 1 }
  const decoys = shelf.filter(id => !goods.includes(id))
  const recipe = {
    id: 'lua_hang_' + stall.id, name: stall.name, icon: (INGS[goods[0]] && INGS[goods[0]].icon) || 'ro',
    ingredients: goods.map(id => ({ id, role: 'chinh' })), decoys, shelf, notes: [], steps: [step]
  }
  return { recipe, step, goods, traps: traps.slice(), shelf }
}

// Bắt đầu (hoặc lựa tiếp) phiên hàng `id`: chỉ ở màn Chuẩn bị (không trong ca), không khi giờ máy bị lùi, từ ngày game
// fromDay, đúng khung giờ, mỗi phiên 1 lượt mỗi ngày thật. Ghi pendingStall. Trả {ok, stall, game, resumed} | {ok:false, reason}.
export function startStall(state, id, nowInfo, ctx) {
  const st = stallStatus(state, nowInfo, ctx)
  const stall = stallById(ctx, id)
  if (!stall || !st.active) return { ok: false, reason: 'khong_co' }
  if (state.shift) return { ok: false, reason: 'dang_ban' }
  if (st.locked) return { ok: false, reason: 'lui_gio' }
  if (st.tooEarly) return { ok: false, reason: 'chua_toi_ngay' }
  const R = ensureRare(state)
  const resumed = st.pending === id
  if (!resumed) {
    if (!st.current || st.current.id !== id) return { ok: false, reason: 'ngoai_gio' }
    if (st.current.done) return { ok: false, reason: 'da_nhan' }
    rareToday(state, st.dayKey)
    R.pendingStall = { id, dayKey: st.dayKey }
  }
  const game = stallGame(state, stall, st.dayKey, ctx)
  return { ok: true, resumed, stall: stallView(stall), game, draft: stallDraft(state, game.shelf) }
}

// Rổ đang lựa dở của phiên hàng (pendingStall): {picked, mistakes}, picked chỉ gồm ô có trên kệ `shelf`.
export function stallDraft(state, shelf = null) {
  const p = ensureRare(state).pendingStall
  const picked = p && Array.isArray(p.picked) ? p.picked.filter(id => typeof id === 'string' && (!shelf || shelf.includes(id))) : []
  return { picked, mistakes: p ? int0(p.mistakes) : 0 }
}

// Lưu rổ đang lựa dở (mỗi lần chạm ô kệ): picked = rổ hiện tại, mistakes = số lần chọn nhầm — chỉ tăng, không giảm
// (bỏ hàng nhầm ra khỏi rổ không xóa lần nhầm đã mắc). Không có lượt đang lựa thì bỏ qua. Trả {ok, picked, mistakes}.
export function saveStallDraft(state, draft) {
  const R = ensureRare(state)
  const p = R.pendingStall
  if (!p) return { ok: false, reason: 'khong_co' }
  const d = draft || {}
  const picked = [...new Set((Array.isArray(d.picked) ? d.picked : []).filter(id => typeof id === 'string' && /^[a-z0-9_]{1,40}$/.test(id)))].slice(0, 12)
  const mistakes = Math.min(99, Math.max(int0(p.mistakes), int0(d.mistakes)))
  R.pendingStall = { id: p.id, dayKey: p.dayKey, picked, mistakes }
  return { ok: true, picked: picked.slice(), mistakes }
}

// Kết thúc phiên hàng đang lựa (pendingStall) với điểm `score` (bước Chọn: 100 − 15 × lần chọn nhầm) và chi tiết
// {picked, mistakes}. Luôn được `base` phần (món kho cần nhất); từ bonusAt điểm thêm 1 phần (món còn lại); từ fragmentAt
// điểm có fragmentRate được 1 mảnh (có bảo hiểm). Chọn nhầm hàng thường → mở thẻ Mẹo nghề "Kiểm hàng" (kiem_hang).
// Trả {ok, stallId, score, got: [{id, name, n}], fragment, spoons, tipId} | {ok:false, reason}.
export function finishStall(state, result, nowInfo, ctx) {
  const R = ensureRare(state)
  const p = R.pendingStall
  const ni = nowInfo || {}
  if (!p) return { ok: false, reason: 'khong_co' }
  if (state.shift) return { ok: false, reason: 'dang_ban' }
  if (ni.rewind) return { ok: false, reason: 'lui_gio' }
  if (p.dayKey !== ni.dayKey) { R.pendingStall = null; return { ok: false, reason: 'het_han' } }
  const stall = stallById(ctx, p.id)
  if (!stall) { R.pendingStall = null; return { ok: false, reason: 'khong_co' } }
  const t = rareToday(state, p.dayKey)
  if (t.stalls.includes(p.id)) { R.pendingStall = null; return { ok: false, reason: 'da_nhan' } }
  const C = rareConfig(ctx).stall
  const res = result || {}
  // lần chọn nhầm đã lưu (lượt lựa dở trước khi rời chợ / tải lại trang) vẫn tính: điểm không vượt 100 − 15 × số lần nhầm
  const savedMistakes = int0(p.mistakes)
  const mistakes = Math.max(savedMistakes, int0(res.mistakes))
  const score = Math.max(0, Math.min(100, Math.round(Number(res.score) || 0), 100 - 15 * mistakes))
  const goods = (stall.goods || []).filter(id => isRareIngredient(ctx, id))
  const order = rareNeedOrder(state, goods, ctx)
  const got = []
  let spoons = 0
  const give = (id, n) => {
    if (!id) return
    const g = grantRare(state, id, n, ctx, { dayKey: p.dayKey, source: 'phien_hang' })
    spoons += g.spoons
    const same = got.find(x => x.id === id)
    if (same) same.n += g.got
    else got.push({ id, name: g.name, n: g.got })
  }
  give(order[0], Math.max(1, int0(C.base) || 1))
  if (score >= C.bonusAt) {
    // phần thưởng thêm: món hàng còn lại (còn chỗ chứa), không thì món cần nhất
    const o2 = rareNeedOrder(state, goods, ctx)
    give(o2.find(id => id !== order[0] && rareRoom(state, id, ctx) > 0) || o2[0], 1)
  }
  let fragment = null
  if (score >= C.fragmentAt && fragmentCandidates(state, ctx).length && rareDayRoom(state, ctx, p.dayKey).frags > 0) {
    const holder = { rng: seedFrom(state.seed, p.dayKey, p.id, 'manh') }
    const hit = fragmentPitySure(state, ctx) || nextFloat(holder) < Number(C.fragmentRate)
    if (hit) {
      const f = grantFragment(state, 1, ctx, { dayKey: p.dayKey, source: 'phien_hang' })
      if (f && f.n > 0) { fragment = { recipeId: f.recipeId, name: f.name, n: f.n }; spoons += f.spoons }
      R.pity.frag = 0
    } else R.pity.frag = Math.min(99, (Number(R.pity.frag) || 0) + 1)
  }
  t.stalls.push(p.id)
  R.pendingStall = null
  // chọn nhầm hàng thường (hoặc chọn rồi bỏ ra) → thẻ Mẹo nghề "Kiểm hàng trước khi nhận"
  const picked = Array.isArray(res.picked) ? res.picked : []
  const wrong = mistakes > 0 || picked.some(id => !goods.includes(id))
  const tipId = wrong ? unlockTip(state, 'kiem_hang', ctx) : null
  emit(ctx, 'rare.stall', { id: p.id, score, got: got.map(x => ({ ...x })), fragment, spoons })
  return { ok: true, stallId: p.id, name: stall.name, score, got, fragment, spoons, tipId, wrong }
}

// Bỏ lượt lựa dở (không nhận gì; phiên vẫn còn lượt nếu còn trong khung giờ).
export function cancelStall(state) {
  const R = ensureRare(state)
  R.pendingStall = null
  return { ok: true }
}

// ---------- Khách lạ ----------

// Khách lạ cho ca đầu mỗi ngày thật (từ ngày game fromDay): chọn người mang nguyên liệu kho cần nhất, vị trí bốc bằng
// luồng riêng seedFrom(hạt giống, ngày game, 'khach_la') (không phải khách đầu, không phải khách hướng dẫn/khách quen/
// đơn đặt trước/khách bị ép trả ảnh giả). `dayKey`: ngày thật tin cậy lúc mở ca ('' hoặc giờ máy bị lùi → không có).
// Ghi today.strangerDay (tải lại trang không làm khách lạ ghé lại). Trả {index, def} | null.
export function pickStranger(state, sh, list, ctx, dayKey) {
  const C = rareConfig(ctx)
  const defs = (D(ctx).STRANGERS || []).filter(x => x && isRareIngredient(ctx, x.ing))
  if (!rareActive(ctx) || !defs.length || !dayKey || (Number(sh.day) || 0) < C.fromDay) return null
  const R = ensureRare(state)
  if (R.today.key && dayKey < R.today.key) return null
  const t = rareToday(state, dayKey)
  if (t.strangerDay === dayKey) return null
  const idx = []
  ;(list || []).forEach((c, i) => { if (i >= 1 && c && !c.tutorial && !c.bigOrder && !c.regularId && !c.forcePay) idx.push(i) })
  if (!idx.length) return null
  const holder = { rng: seedFrom(state.seed, sh.day, 'khach_la') }
  const index = pick(holder, idx)
  const order = rareNeedOrder(state, defs.map(d => d.ing), ctx)
  const best = order[0]
  const top = defs.filter(d => sameNeed(state, ctx, best, d.ing))
  const def = top.length > 1 ? pick(holder, top) : defs.find(d => d.ing === best)
  t.strangerDay = dayKey
  return { index, def: { ...def } }
}

// Quà của khách lạ theo số sao: {portions} | {fragments} | null (dưới 3 sao chỉ cảm ơn).
export function strangerGift(stars, ctx) {
  const s = Number(stars) || 0
  for (const g of rareConfig(ctx).stranger.gifts || []) if (s >= Number(g.minStars)) return { ...g }
  return null
}

// ---------- Cuối ca ----------

// Câu giải thích phần quà đổi Muỗng Vàng (kho đầy hoặc đã đủ mức hàng hiếm hôm nay); dùng chung cho tình huống trong ca.
export function overflowText(got, spoons) {
  return got > 0
    ? `Kho hoặc mức hôm nay đã đủ, phần dư đổi ${spoons} Muỗng Vàng.`
    : `Kho hoặc mức hôm nay đã đủ, quà đổi thành ${spoons} Muỗng Vàng.`
}

// Gọi ở endShift (sau finishShiftEvents, trước summarizeShift): quà khách lạ, rút các lượt Giỏ chợ (sh.rareRolls, luồng
// seedFrom(hạt giống, ngày game, 'gio_cho')). Chạy 1 lần mỗi ca (sh.rareFinished). Ghi sh.rareNotes, trả ghi chú mới:
// [{kind: 'khach_la' | 'gio_cho', name, text, got: [{id, name, n}], fragment, spoons, stars?}].
export function finishShiftRare(state, ctx) {
  const sh = state.shift
  if (!sh || sh.rareFinished) return []
  sh.rareFinished = true
  if (!rareActive(ctx)) return []
  const dayKey = typeof sh.dayKey === 'string' ? sh.dayKey : ''
  const notes = []
  const S = D(ctx).STRANGERS || []
  for (const c of Object.values(sh.customers || {})) {
    if (!c || !c.stranger) continue
    const def = S.find(x => x.id === c.stranger) || {}
    const note = { kind: 'khach_la', id: c.stranger, name: c.name, stars: c.stars || 0, got: [], fragment: null, spoons: 0, text: '' }
    if (c.status !== 'roi_di') {
      note.text = 'Khách lạ chưa kịp nhận món đã đi, hẹn dịp khác ghé.'
      notes.push(note)
      continue
    }
    const gift = strangerGift(c.stars, ctx)
    if (gift && gift.portions) {
      const g = grantRare(state, def.ing, gift.portions, ctx, { dayKey, source: 'khach_la' })
      note.got.push({ id: g.id, name: g.name, n: g.got })
      note.spoons += g.spoons
      note.text = def.thanks || 'Khách lạ gửi quà quê cảm ơn.'
      // kho đầy hoặc đã đủ mức hôm nay: nói rõ phần quà đổi thành Muỗng Vàng (không để người chơi tưởng kho có thêm hàng)
      if (g.spoons > 0) note.text += ` ${overflowText(g.got, g.spoons)}`
    } else if (gift && gift.fragments) {
      const f = grantFragment(state, gift.fragments, ctx, { dayKey, source: 'khach_la' })
      if (f && f.n > 0) note.fragment = { recipeId: f.recipeId, name: f.name, n: f.n }
      if (f) note.spoons += f.spoons
      note.text = f ? 'Khách lạ chép lại cho một mảnh công thức nhà làm.' : 'Khách lạ cảm ơn, hẹn bữa sau ghé tiếp.'
    } else {
      note.text = 'Khách lạ cảm ơn rồi đi. Phục vụ từ 3 sao trở lên thì khách hay gửi quà quê.'
    }
    notes.push(note)
  }
  const rolls = int0(sh.rareRolls)
  if (rolls > 0) {
    const holder = { rng: seedFrom(state.seed, sh.day, 'gio_cho') }
    for (let k = 0; k < rolls; k++) {
      const r = rollBasket(state, ctx, holder, { dayKey })
      const got = (r.got || []).reduce((sum, x) => sum + (Number(x.n) || 0), 0)
      let text = r.result === 'frag' ? (r.fragSure ? 'Bảo hiểm mảnh: Giỏ chợ chắc chắn ra một mảnh công thức hiếm.' : 'Giỏ chợ có một mảnh công thức hiếm.')
        : (r.sure ? 'Bảo hiểm Giỏ chợ: chắc chắn ra nguyên liệu.' : 'Giỏ chợ có nguyên liệu hiếm.')
      if (r.result !== 'frag' && r.spoons > 0) text += ' ' + overflowText(got, r.spoons)
      notes.push({ ...r, name: 'Giỏ chợ', text })
    }
  }
  sh.rareNotes = (Array.isArray(sh.rareNotes) ? sh.rareNotes : []).concat(notes)
  return notes
}

// ---------- Tổng quan cho giao diện ----------

// Kho hàng hiếm cho màn Chuẩn bị / Túi đồ: { active, stock: [...], fragments: [...], today, basket, total }.
export function rareOverview(state, nowInfo, ctx) {
  const C = rareConfig(ctx)
  const INGS = D(ctx).INGREDIENTS || {}
  const RC = D(ctx).RECIPES || {}
  const key = (nowInfo && nowInfo.dayKey) || ''
  const R = ensureRare(state)
  const today = R.today.key === key || !key ? R.today : defaultRareToday()
  const stock = rareIngredientIds(ctx).map(id => ({
    id, name: INGS[id].name, icon: INGS[id].icon || id, star: int0(INGS[id].star) || 1, origin: INGS[id].origin || '',
    n: rareStock(state, id), max: C.stockMax, value: rareValue(ctx, id), seen: R.seen.includes(id)
  }))
  const fragments = rareRecipeIds(ctx).map(id => {
    const r = RC[id]
    const info = rareUnlockInfo(state, id, ctx)
    const baseNames = info.bases.filter(b => !(state.recipes && state.recipes[b])).map(b => recipeName(ctx, b))
    return { recipeId: id, name: r.name, icon: r.icon || id, owned: info.owned, n: info.n, need: info.need, ready: info.ready,
      baseOwned: info.baseOwned, needBase: baseNames, rare: Object.keys(recipeRareNeed(r)).map(i => ({ id: i, name: ingName(ctx, i), n: recipeRareNeed(r)[i] })),
      portions: info.owned ? rarePortions(state, r) : 0 }
  })
  return {
    active: rareActive(ctx), fromDay: C.fromDay, stock, fragments,
    total: stock.reduce((s, x) => s + x.n, 0),
    today: { got: Number(today.got) || 0, cap: C.dailyCap, frags: Number(today.frags) || 0, fragCap: C.dailyFragCap },
    basket: basketOdds(state, ctx, key), stockMax: C.stockMax, overflowGold: C.overflowGold
  }
}
