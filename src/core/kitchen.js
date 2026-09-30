// Khâu bếp: phiếu, phiên nấu (chọn nguyên liệu → Thớt sơ chế), ra món, giao món, xử lý phàn nàn.
import { cfg, emit, unlockTip } from './state.js'
import { requiredIngredients, ingredientErrors, dishQuality, customerStars, tipFor, noteObjects, ING_ERROR_REVIEW } from './scoring.js'
import { scoreChon, stepLabel } from './minigame-scoring.js'
import { recordDish, canAutoStep } from './mastery.js'
import { makeRand } from './rng.js'

const SCALE_KEYS = ['n', 'N', 'cuts', 'strokes']

function isPlainObject(v) { return v && typeof v === 'object' && !Array.isArray(v) }

function mergeParams(base, patch) {
  const out = { ...(base || {}) }
  for (const k of Object.keys(patch || {})) {
    if (isPlainObject(patch[k]) && isPlainObject(out[k])) out[k] = { ...out[k], ...patch[k] }
    else out[k] = Array.isArray(patch[k]) ? patch[k].slice() : (isPlainObject(patch[k]) ? { ...patch[k] } : patch[k])
  }
  return out
}

function deepCopy(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)) }

// Các bước thực tế của một dòng: áp removes/patch của ghi chú; bỏ bước của nguyên liệu bị loại,
// nguyên liệu tùy chọn không được yêu cầu, hoặc (khi biết picked) nguyên liệu không được chọn.
// Nhân tham số đếm theo qty; par × (1 + 0,4(qty − 1)). Trả mảng bước mới (JSON thuần).
export function effectiveSteps(recipe, notes, picked = null, qty = 1) {
  if (!recipe) return []
  qty = Math.max(1, Math.floor(Number(qty) || 1))
  const req = requiredIngredients(recipe, notes)
  const ns = noteObjects(recipe, notes)
  const pickedSet = Array.isArray(picked) ? new Set(picked) : null
  const out = []
  for (const st of recipe.steps || []) {
    if (st.type !== 'chon' && st.ing) {
      if (req.removed.includes(st.ing)) continue
      if (req.optional.includes(st.ing)) continue
      if (pickedSet && !pickedSet.has(st.ing)) continue
    }
    let params = deepCopy(st.params) || {}
    for (const n of ns) if (n.patch && n.patch[st.id]) params = mergeParams(params, n.patch[st.id])
    if (params.targets && isPlainObject(params.targets)) {
      const t = {}
      for (const k of Object.keys(params.targets)) {
        if (req.removed.includes(k)) continue
        if (pickedSet && !pickedSet.has(k)) continue
        if (!pickedSet && req.optional.includes(k)) continue
        t[k] = params.targets[k] * qty
      }
      params.targets = t
    }
    for (const k of SCALE_KEYS) if (typeof params[k] === 'number') params[k] = params[k] * qty
    const par = Math.round((Number(st.par) || 0) * (1 + 0.4 * (qty - 1)) * 10) / 10
    const step = { ...deepCopy(st), params, par, qty }
    out.push(step)
  }
  const ids = new Set(out.map(s => s.id))
  for (const s of out) if (s.after) s.after = s.after.filter(id => ids.has(id))
  return out
}

// Tổng par (giây) của một dòng phiếu.
export function linePar(recipe, line) {
  return effectiveSteps(recipe, line.notes || [], null, line.qty || 1).reduce((s, st) => s + (Number(st.par) || 0), 0)
}

export function linesPar(lines, recipes) {
  return (lines || []).reduce((s, l) => s + linePar(recipes && recipes[l.recipeId], l), 0)
}

function unitPrice(recipe, notes) {
  let p = (recipe && recipe.price) || 0
  for (const n of noteObjects(recipe, notes)) p += Number(n.surcharge) || 0
  return p
}

function linePrice(recipes, line) {
  return unitPrice(recipes && recipes[line.recipeId], line.notes) * (line.qty || 1)
}

// Số tiền khách THỰC TRẢ cho `qty` phần của dòng phiếu `lineIndex` (theo phiếu thu):
// đơn giá trên phiếu × tỉ lệ thực thu (báo thiếu thì khách trả ít hơn giá niêm yết).
// QR giả (ảnh chụp) → khách chưa trả gì → 0.
function paidForLine(customer, lineIndex, qty, fallback) {
  const rc = customer.receipt
  if (customer.payMethod === 'qr' && customer.fakeQr) return 0
  if (!rc) return fallback
  const rl = (rc.lines || [])[lineIndex]
  const unit = rl ? Number(rl.unitPrice) || 0 : 0
  const list = Number(rc.listTotal) || 0
  const total = Number(rc.total) || 0
  let amount = unit * qty
  if (list > 0 && total < list) amount = Math.floor((amount * total) / list / 1000) * 1000
  return Math.max(0, amount)
}

// Tổng hoàn cho các mục phàn nàn, kẹp theo số khách đã trả trừ phần đã hoàn trước đó.
function clampRefunds(customer, items) {
  const rc = customer.receipt
  const paid = customer.payMethod === 'qr' && customer.fakeQr ? 0 : (rc ? Number(rc.total) || 0 : Infinity)
  let left = Math.max(0, paid - (Number(customer.refunded) || 0))
  for (const it of items) {
    it.refund = Math.min(it.refund, left)
    left -= it.refund
  }
  return items
}

function findTicket(shift, ticketId) {
  return (shift.tickets || []).find(t => t.id === ticketId) || null
}

function recipeOf(ctx, id) { return ctx && ctx.data && ctx.data.RECIPES && ctx.data.RECIPES[id] }

function bumpCount(shift, key, n = 1) {
  if (!shift.counts) shift.counts = {}
  shift.counts[key] = (shift.counts[key] || 0) + n
}

function spend(state, amount, ledgerKey) {
  if (!amount) return
  state.wallet -= amount
  state.shift.ledger[ledgerKey] = (state.shift.ledger[ledgerKey] || 0) + amount
}

// Mở phiên nấu cho một dòng phiếu. Trả CookSession, hoặc null nếu không hợp lệ
// (đang nấu dở món khác, dòng đã xong, phiếu không tồn tại).
export function startCook(state, ticketId, lineIndex, ctx) {
  const sh = state.shift
  if (!sh) return null
  const cur = sh.cook
  if (cur && cur.phase !== 'xong') {
    if (cur.ticketId === ticketId && cur.lineIndex === lineIndex) return cur
    return null
  }
  const ticket = findTicket(sh, ticketId)
  if (!ticket) return null
  const line = ticket.lines[lineIndex]
  if (!line || ticket.done[lineIndex]) return null
  ticket.status = 'dang_lam'
  sh.cook = {
    ticketId, lineIndex, recipeId: line.recipeId, qty: line.qty || 1, notes: (line.notes || []).slice(),
    phase: 'chon', picked: [], chonScore: null, chonMistakes: 0,
    steps: {}, activeStepId: null, retriesLeft: 1,
    board: null, cost: { cogs: 0, waste: 0 }, retryPending: null, result: null,
    remake: !!ticket.remake
  }
  emit(ctx, 'cook.started', { ticketId, lineIndex, recipeId: line.recipeId })
  return sh.cook
}

// Chốt bước chọn. Thiếu nguyên liệu chính → {ok:false, blockedMissingMain:true}, không trừ tiền.
// Thành công: trừ giá vốn vào ví (phần cần → cogs, phần thừa/bẫy/trái ghi chú → waste), sang Thớt sơ chế.
export function submitChon(state, picked, mistakes, ctx) {
  const sh = state.shift
  const cook = sh && sh.cook
  if (!cook || cook.phase !== 'chon') return { ok: false, blockedMissingMain: false, reason: 'khong_hop_le' }
  const recipe = recipeOf(ctx, cook.recipeId)
  if (!recipe) return { ok: false, blockedMissingMain: false, reason: 'khong_co_mon' }
  const uniq = [...new Set(picked || [])]
  const req = requiredIngredients(recipe, cook.notes)
  const missingMain = req.main.filter(id => !uniq.includes(id))
  if (missingMain.length) return { ok: false, blockedMissingMain: true, missing: missingMain }
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  let cogs = 0, waste = 0
  for (const id of uniq) {
    const def = (recipe.ingredients || []).find(i => i.id === id)
    const unit = (INGS[id] && INGS[id].cost) || 0
    const amount = Math.round(unit * ((def && def.qty) || 1) * cook.qty)
    if (req.required.includes(id)) cogs += amount
    else waste += amount
  }
  // M2: Phiếu Chợ Sớm (sh.mods.cogsMul) giảm giá vốn trong ca
  const cogsMul = sh.mods && sh.mods.cogsMul > 0 ? sh.mods.cogsMul : 1
  if (cogsMul !== 1) { cogs = Math.round(cogs * cogsMul); waste = Math.round(waste * cogsMul) }
  spend(state, cogs, 'cogs')
  spend(state, waste, 'waste')
  cook.cost = { cogs, waste }
  cook.picked = uniq
  cook.chonMistakes = Math.max(0, Number(mistakes) || 0)
  const chon = scoreChon({ required: req.required, optional: req.optional, decoys: req.decoys, picked: uniq, mistakes: cook.chonMistakes })
  cook.chonScore = chon.score
  const labels = cfg(ctx, 'stepLabels')
  cook.steps.chon = { score: chon.score, grade: stepLabel(chon.score, labels), method: null, auto: false, retried: false }
  cook.board = effectiveSteps(recipe, cook.notes, uniq, cook.qty).filter(s => s.type !== 'chon')
  cook.phase = 'thot'
  if (chon.score >= 90) bumpCount(sh, 'perfectSteps')
  const ingErr = ingredientErrors(recipe, cook.notes, uniq)
  unlockTip(state, 'first_board', ctx)
  for (const e of ingErr) unlockTip(state, ING_ERROR_REVIEW[e.code] || e.code, ctx)
  emit(ctx, 'step.done', { recipeId: cook.recipeId, type: 'chon', score: chon.score, grade: cook.steps.chon.grade, auto: false })
  return { ok: true, blockedMissingMain: false, score: chon.score, errors: ingErr, cost: cogs + waste }
}

// Các bước trên Thớt sơ chế chưa làm và đã đủ ràng buộc after.
export function availableSteps(state) {
  const cook = state.shift && state.shift.cook
  if (!cook || cook.phase !== 'thot' || !cook.board) return []
  return cook.board
    .filter(s => !cook.steps[s.id])
    .filter(s => (s.after || []).every(id => cook.steps[id]))
    .map(s => s.id)
}

// Bước (đã áp ghi chú, nhân qty) trên thớt, để UI mount mini-game.
export function getStep(state, stepId) {
  const cook = state.shift && state.shift.cook
  if (!cook || !cook.board) return null
  return cook.board.find(s => s.id === stepId) || null
}

// Danh sách bước cho giao diện Thớt sơ chế.
export function boardSteps(state, ctx) {
  const cook = state.shift && state.shift.cook
  if (!cook || !cook.board) return []
  const avail = new Set(availableSteps(state))
  const autoOk = canAutoStep(state, cook.recipeId, cfg(ctx, 'masteryLevels'))
  return cook.board.map(s => {
    const r = cook.steps[s.id] || null
    return {
      id: s.id, type: s.type, label: s.label, ing: s.ing || null, w: s.w || 1, critical: !!s.critical,
      par: s.par, params: s.params, method: s.method || null, after: s.after || [],
      done: !!r, available: avail.has(s.id), result: r,
      canAuto: !r && autoOk && (s.w || 1) === 1,
      canRetry: !!r && !r.auto && !r.retried && cook.retriesLeft > 0
    }
  })
}

// Đánh dấu bước đang chơi (để tải lại giữa chừng thì chơi lại bước đó).
export function beginStep(state, stepId) {
  const cook = state.shift && state.shift.cook
  if (!cook || cook.phase !== 'thot') return null
  const ok = availableSteps(state).includes(stepId) || cook.retryPending === stepId
  if (!ok) return null
  cook.activeStepId = stepId
  return getStep(state, stepId)
}

// Lưu điểm bước. result: {score, method?, tag?, details?}. Chọn sai cách sơ chế → −15.
// tag (tùy chọn): 'chay' | 'song' … dùng cho review; với lua có thể suy ra từ details.value.
export function submitStep(state, stepId, result, ctx) {
  const sh = state.shift
  const cook = sh && sh.cook
  if (!cook || cook.phase !== 'thot') return { ok: false, reason: 'khong_hop_le' }
  const isRetry = cook.retryPending === stepId
  if (!isRetry && !availableSteps(state).includes(stepId)) return { ok: false, reason: 'chua_mo' }
  const step = getStep(state, stepId)
  const res = result || {}
  let score = Math.max(0, Math.min(100, Number(res.score) || 0))
  let methodWrong = false
  if (step.method && step.method.correct) {
    if (res.method !== step.method.correct) { score -= 15; methodWrong = true }
  }
  if (isRetry) score = Math.min(score, cfg(ctx, 'retryScoreCap'))
  score = Math.round(Math.max(0, score))
  let tag = res.tag || null
  const d = res.details || {}
  if (!tag && step.type === 'lua' && typeof d.value === 'number') {
    const zone = (step.params && step.params.zone) || [0, 1]
    if (d.value > 1.0) tag = 'chay'
    else if (d.value < zone[0] && score < 50) tag = 'song'
  }
  if (!tag && step.type === 'rot' && typeof d.level === 'number' && d.level > 1.02) tag = 'tran'
  if (!tag && methodWrong) tag = 'sai_cach'
  const grade = stepLabel(score, cfg(ctx, 'stepLabels'))
  cook.steps[stepId] = { score, grade, method: res.method ?? null, auto: false, retried: isRetry, tag }
  if (isRetry) cook.retryPending = null
  cook.activeStepId = null
  if (score >= 90) bumpCount(sh, 'perfectSteps')
  if (tag) unlockTip(state, tag, ctx)
  if (step.type === 'cham' && step.params && step.params.mode === 'targets' && score < 70) unlockTip(state, 'nem_lech', ctx)
  emit(ctx, 'step.done', { recipeId: cook.recipeId, type: step.type, score, grade, auto: false })
  return { ok: true, score, grade, methodWrong, tag }
}

// "Tự làm": chỉ bước w = 1, không phải chon, cần thạo cấp 2 → autoStepScore (80).
export function autoStep(state, stepId, ctx) {
  const sh = state.shift
  const cook = sh && sh.cook
  if (!cook || cook.phase !== 'thot') return { ok: false, reason: 'khong_hop_le' }
  const step = getStep(state, stepId)
  if (!step || step.type === 'chon' || (step.w || 1) !== 1) return { ok: false, reason: 'khong_tu_lam' }
  if (!availableSteps(state).includes(stepId)) return { ok: false, reason: 'chua_mo' }
  if (!canAutoStep(state, cook.recipeId, cfg(ctx, 'masteryLevels'))) return { ok: false, reason: 'chua_thao' }
  const score = cfg(ctx, 'autoStepScore')
  const grade = stepLabel(score, cfg(ctx, 'stepLabels'))
  cook.steps[stepId] = { score, grade, method: step.method ? step.method.correct : null, auto: true, retried: false, tag: null }
  emit(ctx, 'step.done', { recipeId: cook.recipeId, type: step.type, score, grade, auto: true })
  return { ok: true, score, grade }
}

// Làm lại bước: 1 lượt/món, trừ retryCost vào ví (ledger.waste); bước mở lại, điểm mới tối đa 85.
export function retryStep(state, stepId, ctx) {
  const sh = state.shift
  const cook = sh && sh.cook
  if (!cook || cook.phase !== 'thot') return { ok: false, reason: 'khong_hop_le' }
  const prev = cook.steps[stepId]
  const step = getStep(state, stepId)
  if (!step || !prev || prev.auto || prev.retried) return { ok: false, reason: 'khong_lam_lai' }
  if (cook.retriesLeft <= 0) return { ok: false, reason: 'het_luot' }
  if (cook.retryPending) return { ok: false, reason: 'dang_lam_lai' }
  cook.retriesLeft -= 1
  const cost = Math.max(0, Math.round(Number(step.retryCost) || 0))
  spend(state, cost, 'waste')
  delete cook.steps[stepId]
  cook.retryPending = stepId
  cook.activeStepId = stepId
  emit(ctx, 'step.retry', { recipeId: cook.recipeId, stepId, cost })
  return { ok: true, cost, step }
}

// "Ra món": bước chưa làm = 0 điểm; tính Q; ghi vào ticket.done. Trả DishResult.
export function finishDish(state, ctx) {
  const sh = state.shift
  const cook = sh && sh.cook
  if (!cook || cook.phase !== 'thot') return null
  const recipe = recipeOf(ctx, cook.recipeId)
  const list = [{ id: 'chon', ...cook.steps.chon }]
  const steps = { chon: cook.steps.chon }
  for (const st of cook.board) {
    const r = cook.steps[st.id] || { score: 0, grade: stepLabel(0, cfg(ctx, 'stepLabels')), auto: false, retried: false, tag: 'bo_qua', skipped: true }
    steps[st.id] = r
    list.push({ id: st.id, w: st.w, critical: st.critical, ...r })
  }
  const ingErr = ingredientErrors(recipe, cook.notes, cook.picked)
  const qual = dishQuality(recipe, list, ingErr, {
    thresholds: cfg(ctx, 'gradeThresholds'),
    assist: !!(state.settings && state.settings.assistMotion)
  })
  const errors = []
  for (const e of ingErr) { const c = ING_ERROR_REVIEW[e.code] || e.code; if (!errors.includes(c)) errors.push(c) }
  for (const id of Object.keys(steps)) { const t = steps[id].tag; if (t && t !== 'bo_qua' && !errors.includes(t)) errors.push(t) }
  if (Object.values(steps).some(s => s.skipped) && !errors.includes('chua_so_che')) errors.push('chua_so_che')
  const dish = {
    recipeId: cook.recipeId, qty: cook.qty, notes: cook.notes.slice(), lineIndex: cook.lineIndex,
    q: qual.q, grade: qual.grade, flawless: qual.flawless, capped: qual.capped,
    steps, ingErrors: ingErr, errors, remake: !!cook.remake
  }
  const ticket = findTicket(sh, cook.ticketId)
  if (ticket) {
    ticket.done[cook.lineIndex] = dish
    if (ticket.done.every(Boolean)) ticket.status = 'xong'
  }
  cook.phase = 'xong'
  cook.result = dish
  cook.activeStepId = null
  bumpCount(sh, 'dishesCooked')
  if (dish.flawless) bumpCount(sh, 'flawlessDishes')
  const mastery = recordDish(state, cook.recipeId, dish, cfg(ctx, 'masteryLevels'))
  dish.mastery = mastery
  if (dish.grade === 'hong') unlockTip(state, 'dish_hong', ctx)
  // "Rửa rồi mới thái" chỉ mở khi bỏ bước RỬA, không mở khi bỏ bước lắc/trộn/gọt
  const isWash = st => st.type === 'cha' && (String(st.id).startsWith('rua') || /^rửa/i.test(String(st.label || '')))
  if (cook.board.some(st => isWash(st) && steps[st.id].skipped)) unlockTip(state, 'chua_rua', ctx)
  emit(ctx, 'dish.done', { recipeId: dish.recipeId, q: dish.q, grade: dish.grade, flawless: dish.flawless, errors: dish.errors.slice() })
  return dish
}

// Bỏ món: giá vốn đã trừ chuyển sang hao hụt; phiếu quay lại dây.
export function abandonDish(state, ctx) {
  const sh = state.shift
  const cook = sh && sh.cook
  if (!cook || cook.phase === 'xong') return { ok: false }
  const moved = cook.cost ? cook.cost.cogs : 0
  sh.ledger.cogs -= moved
  sh.ledger.waste += moved
  const ticket = findTicket(sh, cook.ticketId)
  if (ticket && !ticket.done.some(Boolean)) ticket.status = 'cho'
  sh.cook = null
  emit(ctx, 'dish.abandoned', { ticketId: cook.ticketId, lineIndex: cook.lineIndex, recipeId: cook.recipeId, waste: moved })
  return { ok: true, waste: moved }
}

function personaOf(ctx, id) {
  const P = (ctx.data && ctx.data.PERSONAS) || {}
  return P[id] ? { ...P[id], id } : { id }
}

// Phạt lỗi order lọt qua (so yêu cầu thật với phiếu).
function orderPenalties(customer) {
  const out = []
  let noteStars = 0
  for (const e of customer.orderErrors || []) {
    if (e.type === 'sai_mon') out.push({ code: 'sai_mon', stars: 2, source: 'quay' })
    else if (e.type === 'sai_ghi_chu') {
      const s = Math.min(1, 2 - noteStars)
      noteStars += s
      out.push({ code: 'sai_ghi_chu', stars: s, source: 'quay' })
    } else if (e.type === 'thieu_mon' || (e.type === 'sai_so_luong' && e.short)) {
      out.push({ code: 'thieu_mon', stars: 1, source: 'quay' })
    }
  }
  return out
}

function waitPenalty(customer, t) {
  if (!customer.waitBudget) return null
  const ratio = (t - customer.waitStart) / customer.waitBudget
  customer.waitRatio = Math.round(ratio * 100) / 100
  if (ratio > 1.5) return { code: 'cho_lau', stars: 2, source: 'cho' }
  if (ratio > 1.0) return { code: 'cho_lau', stars: 1, source: 'cho' }
  if (ratio > 0.75) return { code: 'cho_lau', stars: 0.5, source: 'cho' }
  return null
}

function safeReview(ctx, args) {
  const fn = ctx.data && ctx.data.makeReview
  if (typeof fn !== 'function') return ''
  try { return String(fn(args) || '') } catch { return '' }
}

// M2: trong mùa sự kiện (sh.mods.events), mỗi phần món lễ đạt Ngon trở lên được thêm danh tiếng (EVENTS[id].festiveRep).
function festiveReputation(sh, dishes, ctx) {
  const ids = (sh.mods && sh.mods.events) || []
  const E = (ctx.data && ctx.data.EVENTS) || {}
  let rep = 0
  for (const id of ids) {
    const ev = E[id]
    if (!ev || !ev.festiveRep) continue
    for (const d of dishes || []) {
      if (d && (ev.recipes || []).includes(d.recipeId) && (d.grade === 'ngon' || d.grade === 'tuyet_hao')) {
        rep += ev.festiveRep * Math.max(1, Number(d.qty) || 1)
      }
    }
  }
  return rep
}

// Chốt sao, tip, review, danh tiếng; khách rời đi. Trả ScoreSheet.
function finalizeCustomer(state, customer, ctx) {
  const sh = state.shift
  const R = (ctx.data && ctx.data.RECIPES) || {}
  const persona = personaOf(ctx, customer.persona)
  const res = customerStars(customer, customer.dishes, R, { thresholds: cfg(ctx, 'gradeThresholds') })
  const flawlessAny = (customer.dishes || []).some(d => d && d.flawless)
  const B = { tipFiveStar: cfg(ctx, 'tipFiveStar'), tipBonus: cfg(ctx, 'tipBonus') }
  let tip = tipFor(res.stars, flawlessAny, persona, B)
  // M2: đang trong chuỗi "Quầy chuẩn" (≥ 5 khách liên tiếp không lỗi quầy) → tip 10.000đ; không áp khi bật Hỗ trợ tính tiền
  const assistCash = !!(state.settings && state.settings.assistCash)
  if (tip > 0 && !assistCash && (sh.counterStreak || 0) >= 5) tip = Math.max(tip, B.tipBonus)
  // M2: Ngày lãnh lương (sh.mods.tipMul), tip vẫn là bội 5.000đ
  if (tip > 0 && sh.mods && sh.mods.tipMul > 0 && sh.mods.tipMul !== 1) tip = Math.max(5000, Math.round((tip * sh.mods.tipMul) / 5000) * 5000)
  const repTable = cfg(ctx, 'reputationByStars') || {}
  let rep = Number(repTable[res.stars]) || 0
  if (flawlessAny) rep += 1
  rep += festiveReputation(sh, customer.dishes, ctx)
  const counterErrors = [...new Set(res.penalties.filter(p => p.source === 'quay' && p.code !== 'kho_tinh').map(p => p.code))]
  for (const e of customer.orderErrors || []) if (!counterErrors.includes(e.type)) counterErrors.push(e.type)
  // lỗi quầy 0 sao (không trừ sao, không vào review) để phiếu chấm và Tổng kết ghi đúng nguồn lỗi
  const silent = []
  if (customer.undercharge > 0) silent.push('bao_thieu')
  if (customer.overchanged) silent.push('thoi_du')
  if (customer.payMethod === 'qr' && customer.fakeQr) silent.push('qr_gia')
  for (const code of silent) if (!counterErrors.includes(code)) counterErrors.push(code)
  const kitchenErrors = []
  // món bị phàn nàn rồi làm lại: vẫn ghi lỗi bếp của món cũ (và 'hong' nếu món cũ Hỏng)
  const complaintItems = (customer.complaint && customer.complaint.items) || []
  if (complaintItems.some(it => it.kind === 'hong')) kitchenErrors.push('hong')
  for (const c of customer.remadeErrors || []) if (!kitchenErrors.includes(c)) kitchenErrors.push(c)
  for (const d of customer.dishes || []) for (const c of (d && d.errors) || []) if (!kitchenErrors.includes(c)) kitchenErrors.push(c)
  const allErrors = [...counterErrors.filter(c => !silent.includes(c)), ...kitchenErrors, ...res.penalties.filter(p => p.source === 'cho').map(p => p.code)]
  const firstDish = (customer.dishes || []).find(Boolean)
  const firstIng = (customer.dishes || []).flatMap(d => (d && d.ingErrors) || [])[0]
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const review = safeReview(ctx, {
    stars: res.stars,
    errors: allErrors.length ? allErrors : (flawlessAny ? ['hoan_hao'] : []),
    dishName: firstDish && R[firstDish.recipeId] ? R[firstDish.recipeId].name : '',
    ingredientName: firstIng && INGS[firstIng.ing] ? INGS[firstIng.ing].name : '',
    rand: makeRand(sh, 'rngText')
  })
  customer.stars = res.stars
  customer.tip = tip
  customer.review = review
  customer.status = 'roi_di'
  customer.complaint = null
  if (tip > 0) { sh.tipJar += tip; sh.ledger.tips += tip }
  sh.reputationGain = (sh.reputationGain || 0) + rep
  if (!sh.served.includes(customer.id)) sh.served.push(customer.id)
  sh.reviews = sh.reviews || []
  sh.reviews.push({ day: sh.day, stars: res.stars, name: customer.name, text: review })
  const sheet = {
    customerId: customer.id, name: customer.name, final: true, tutorial: !!customer.tutorial,
    stars: res.stars, base: res.base, cap: res.cap, penalties: res.penalties,
    counterErrors, kitchenErrors, tip, reputation: rep, review,
    dishes: (customer.dishes || []).filter(Boolean).map(d => ({ recipeId: d.recipeId, qty: d.qty, notes: d.notes, q: d.q, grade: d.grade, flawless: d.flawless, errors: d.errors })),
    waitRatio: customer.waitRatio ?? null, apologyBonus: customer.apologyBonus || 0, complaint: null
  }
  sh.scoreSheets.push(sheet)
  emit(ctx, 'customer.rated', { customerId: customer.id, stars: res.stars, counterErrors, kitchenErrors })
  return sheet
}

// Giao phiếu khi mọi dòng đã xong. Có món Hỏng hoặc sai món → mở phàn nàn (sheet.final = false).
export function serveTicket(state, ticketId, ctx) {
  const sh = state.shift
  if (!sh) return null
  const ticket = findTicket(sh, ticketId)
  if (!ticket || !ticket.done.every(Boolean)) return null
  const customer = sh.customers[ticket.customerId]
  if (!customer) return null
  sh.tickets = sh.tickets.filter(t => t.id !== ticketId)
  if (sh.cook && sh.cook.ticketId === ticketId) sh.cook = null
  emit(ctx, 'dish.served', { customerId: customer.id })
  const R = (ctx.data && ctx.data.RECIPES) || {}

  if (ticket.remake) {
    // món làm lại: thay các món bị phàn nàn
    const keep = (customer.dishes || []).filter(d => d && !d.complained)
    const old = (customer.dishes || []).filter(d => d && d.complained)
    customer.remadeErrors = [...new Set(old.flatMap(d => d.errors || []))]
    customer.dishes = keep.concat(ticket.done.map(d => ({ ...d, remake: true })))
    customer.status = 'nhan_mon'
    return finalizeCustomer(state, customer, ctx)
  }

  customer.dishes = ticket.done.map(d => ({ ...d }))
  customer.status = 'nhan_mon'
  if (!customer.tutorial) {
    for (const p of orderPenalties(customer)) customer.penalties.push(p)
    if ((customer.orderErrors || []).some(e => e.type === 'sai_ghi_chu')) unlockTip(state, 'sai_ghi_chu', ctx)
    const wp = waitPenalty(customer, sh.t)
    if (wp) { customer.penalties.push(wp); unlockTip(state, 'cho_lau', ctx) }
  } else {
    waitPenalty(customer, sh.t)
  }

  // phàn nàn: món Hỏng hoặc sai món (khách hướng dẫn không phàn nàn)
  const items = []
  if (!customer.tutorial) {
    for (const e of customer.orderErrors || []) {
      if (e.type !== 'sai_mon') continue
      const line = { recipeId: e.expectedRecipeId, qty: e.qty || 1, notes: (e.expectedNotes || []).slice() }
      // hoàn đúng số khách đã trả cho món ghi nhầm (không phải giá món khách gọi)
      const wrong = ticket.lines[e.index] || line
      items.push({ kind: 'sai_mon', lineIndex: e.index, line, refund: paidForLine(customer, e.index, e.qty || 1, linePrice(R, { ...wrong, qty: e.qty || 1 })) })
      const d = customer.dishes[e.index]
      if (d) d.complained = true
    }
    customer.dishes.forEach((d, i) => {
      if (d.grade !== 'hong' || d.complained) return
      const line = { recipeId: d.recipeId, qty: d.qty, notes: d.notes.slice() }
      items.push({ kind: 'hong', lineIndex: i, line, refund: paidForLine(customer, i, d.qty, linePrice(R, line)) })
      d.complained = true
    })
    clampRefunds(customer, items)
  }
  if (items.length) {
    unlockTip(state, 'complaint', ctx)
    const apologies = ((ctx.data && ctx.data.DIALOGUE && ctx.data.DIALOGUE.apologies) || []).map(a => (typeof a === 'string' ? a : a.text))
    customer.complaint = { items, resolved: false }
    return {
      customerId: customer.id, name: customer.name, final: false, tutorial: false,
      stars: null, penalties: customer.penalties.slice(), dishes: customer.dishes.map(d => ({ recipeId: d.recipeId, q: d.q, grade: d.grade })),
      complaint: { items, apologies }
    }
  }
  return finalizeCustomer(state, customer, ctx)
}

// Xử lý phàn nàn: xin lỗi đúng (DIALOGUE.apologies[i].correct) +1 sao (vẫn theo trần).
// remake: thêm lại các dòng bị phàn nàn vào đầu dây phiếu (cờ remake, sao tối đa 3), khách về 'cho_mon'.
// refund: ledger.refunds += số khách đã thực trả cho các dòng đó (item.refund), chốt sao ngay.
export function resolveComplaint(state, customerId, choice, ctx) {
  const sh = state.shift
  const customer = sh && sh.customers[customerId]
  if (!customer || !customer.complaint || customer.complaint.resolved) return { ok: false, reason: 'khong_co_phan_nan' }
  const { apologyIndex, action } = choice || {}
  if (action !== 'remake' && action !== 'refund') return { ok: false, reason: 'khong_hop_le' }
  const apologies = (ctx.data && ctx.data.DIALOGUE && ctx.data.DIALOGUE.apologies) || []
  const ap = apologies[apologyIndex]
  const apologyCorrect = !!(ap && typeof ap === 'object' && ap.correct)
  customer.apologyBonus = apologyCorrect ? 1 : 0
  customer.complaint.resolved = true
  customer.complaint.action = action
  const items = customer.complaint.items
  if (action === 'refund') {
    const amount = items.reduce((s, it) => s + it.refund, 0)
    sh.ledger.refunds += amount
    customer.refunded = amount
    emit(ctx, 'complaint.resolved', { customerId, action, apologyCorrect, amount })
    const sheet = finalizeCustomer(state, customer, ctx)
    return { ok: true, apologyCorrect, sheet }
  }
  const no = sh.nextTicketNo++
  const ticket = {
    id: 'p' + no, no: '#' + String(no).padStart(3, '0'), customerId,
    lines: items.map(it => ({ ...it.line, notes: it.line.notes.slice() })),
    createdAt: sh.t, status: 'cho', done: items.map(() => null), remake: true
  }
  sh.tickets.unshift(ticket)
  customer.starCap = Math.min(Number(customer.starCap) || 5, 3)
  customer.status = 'cho_mon'
  customer.ticketId = ticket.id
  emit(ctx, 'complaint.resolved', { customerId, action, apologyCorrect, ticketId: ticket.id })
  emit(ctx, 'ticket.clipped', { ticketId: ticket.id })
  return { ok: true, apologyCorrect, ticket }
}
