// Khâu bếp: phiếu, phiên nấu (chọn nguyên liệu → Thớt sơ chế), ra món, giao món, xử lý phàn nàn.
import { cfg, emit, unlockTip } from './state.js'
import { requiredIngredients, ingredientErrors, dishQuality, customerStars, tipFor, noteObjects, ING_ERROR_REVIEW } from './scoring.js'
import { scoreChon, stepLabel } from './minigame-scoring.js'
import { recordDish, canAutoStep } from './mastery.js'
import { makeRand } from './rng.js'
import { roundCost } from './money.js'
import { consumeRare, rareReputation, rareLinesFit } from './rare.js'

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

// M4: "hóa đơn" để tính tip = số tiền khách THỰC TRẢ, cùng logic clampRefunds:
// - trả bằng ảnh chuyển khoản giả: 0;
// - có phiếu thu: receipt.total (số đã báo, báo thiếu thì nhỏ hơn giá niêm yết) trừ phần đã hoàn;
// - chưa có phiếu thu (khách dựng trong test lõi): giá niêm yết theo yêu cầu thật, gồm phụ thu ghi chú.
// (Không import order.js: order.js đã import kitchen.js.)
export function billOf(customer, recipes) {
  if (!customer) return 0
  if (customer.payMethod === 'qr' && customer.fakeQr) return 0
  const rc = customer.receipt
  const paid = rc ? Number(rc.total) || 0 : (customer.request || []).reduce((s, l) => s + linePrice(recipes, l), 0)
  return Math.max(0, paid - (Number(customer.refunded) || 0))
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
  // lần chọn nhầm đã mắc ở dòng này trước khi bỏ món (mục 25): phiên mới bắt đầu từ đó (rổ trống), không về 0
  const carried = lineChonMistakes(ticket, lineIndex)
  sh.cook = {
    ticketId, lineIndex, recipeId: line.recipeId, qty: line.qty || 1, notes: (line.notes || []).slice(),
    phase: 'chon', picked: [], chonScore: null, chonMistakes: carried,
    steps: {}, activeStepId: null, retriesLeft: 1,
    board: null, cost: { cogs: 0, waste: 0 }, retryPending: null, result: null,
    remake: !!ticket.remake
  }
  if (carried > 0) sh.cook.chonDraft = { picked: [], mistakes: carried }
  emit(ctx, 'cook.started', { ticketId, lineIndex, recipeId: line.recipeId })
  return sh.cook
}

// ---------- Lần chọn nhầm theo dòng phiếu (ticket.chonMistakes, mục 25) ----------
// Bỏ món giữa bước Chọn xóa phiên nấu (kèm rổ dở), nhưng số lần chọn nhầm đã mắc (cả phạt quá giờ) được ghi vào phiếu:
// ticket.chonMistakes[lineIndex] = số nguyên 0..CHON_DRAFT_MISTAKES_MAX, chỉ tăng. Mở lại đúng dòng đó → phiên nấu mới
// bắt đầu với số lần nhầm cũ (cook.chonMistakes + rổ dở trống mang lần nhầm) → bỏ món rồi mở lại không né được phạt.
// Chốt bước Chọn thành công thì dòng đó về 0 (lần nhầm đã vào điểm lượt đó); bỏ món trên Thớt sau đó thì ghi lại số lần
// nhầm của lượt đã chốt (mở lại phải chọn lại, vẫn mang lần nhầm). Phiếu làm lại (remake) là phiếu mới: không mang lần nhầm
// của phiếu cũ. Mảng dài đúng bằng ticket.lines; chỉ có trường này khi từng bỏ món có lần nhầm.

// Số lần nhầm hợp lệ: số → số nguyên 0..CHON_DRAFT_MISTAKES_MAX (âm → 0; quá lớn, kể cả Infinity của save sửa tay, → trần);
// còn lại (chuỗi, null, NaN…) → 0.
function cleanMistakes(v) {
  return typeof v === 'number' && !Number.isNaN(v) ? Math.min(CHON_DRAFT_MISTAKES_MAX, Math.max(0, Math.floor(v))) : 0
}

// Chuẩn hóa ticket.chonMistakes cho phiếu có `lineCount` dòng: mảng đúng `lineCount` phần tử số nguyên 0..99 (thừa thì
// cắt, thiếu thì thêm 0, hỏng thì 0). Không phải mảng → null (bỏ trường).
export function normalizeLineMistakes(value, lineCount) {
  if (!Array.isArray(value)) return null
  const n = Math.max(0, Math.floor(Number(lineCount) || 0))
  const out = []
  for (let i = 0; i < n; i++) out.push(cleanMistakes(value[i]))
  return out
}

// Số lần chọn nhầm đã ghi cho dòng `lineIndex` của phiếu (0 nếu chưa có).
export function lineChonMistakes(ticket, lineIndex) {
  return ticket && Array.isArray(ticket.chonMistakes) ? cleanMistakes(ticket.chonMistakes[lineIndex]) : 0
}

// Ghi số lần nhầm của dòng: mode 'max' (bỏ món: chỉ tăng) hoặc 'clear' (chốt bước Chọn: về 0; cả phiếu về 0 thì bỏ trường).
function recordLineMistakes(ticket, lineIndex, n, mode) {
  if (!ticket || !Array.isArray(ticket.lines) || !(lineIndex >= 0 && lineIndex < ticket.lines.length)) return
  if (mode === 'clear') {
    if (!Array.isArray(ticket.chonMistakes)) return
    const arr = normalizeLineMistakes(ticket.chonMistakes, ticket.lines.length)
    arr[lineIndex] = 0
    if (arr.every(x => x === 0)) delete ticket.chonMistakes
    else ticket.chonMistakes = arr
    return
  }
  const next = cleanMistakes(n)
  if (next <= lineChonMistakes(ticket, lineIndex)) return
  const arr = normalizeLineMistakes(ticket.chonMistakes, ticket.lines.length) || ticket.lines.map(() => 0)
  arr[lineIndex] = next
  ticket.chonMistakes = arr
}

// Xóa lần nhầm đã ghi của một dòng phiếu (dòng đổi sang món khác, vd tình huống "Khách đổi ý"): dòng đó về 0, cả phiếu về 0
// thì bỏ trường (như khi chốt bước Chọn).
export function clearLineMistakes(ticket, lineIndex) {
  recordLineMistakes(ticket, lineIndex, 0, 'clear')
}

// ---------- Rổ đang chọn dở của bước Chọn (cook.chonDraft) ----------
// Rổ dở lưu trong phiên nấu (state.shift.cook.chonDraft = {picked, mistakes, overtime?}, JSON thuần) mỗi lần người chơi
// thêm/bớt nguyên liệu (và lúc vừa quá giờ), để tải lại trang giữa bước Chọn vẫn còn rổ. Phiên nấu thử dùng chung
// (state.tasting.shift.cook). Rổ dở mất theo phiên nấu: submitChon thành công thì xóa; bỏ món (abandonDish) và món khác
// (startCook) là phiên mới — nhưng số lần nhầm của dòng đang chọn được ghi vào phiếu (ticket.chonMistakes, mục 25) nên
// mở lại đúng dòng đó vẫn còn lần nhầm (rổ trống).

// Trần số lần chọn nhầm lưu trong rổ dở (7 lần nhầm đã về 0 điểm).
export const CHON_DRAFT_MISTAKES_MAX = 99

// Chuẩn hóa rổ dở: picked = id nguyên liệu (chuỗi a-z0-9_, không trùng; biết kệ `shelf` thì chỉ giữ ô có trên kệ),
// mistakes = số nguyên 0..CHON_DRAFT_MISTAKES_MAX (lần chạm nhầm), overtime: true khi bước Chọn đã quá giờ (phạt thêm
// 1 lần nhầm lúc chốt; chỉ có trường này khi đúng là true). Dữ liệu hỏng → rổ trống, 0 lần nhầm.
export function normalizeChonDraft(draft, shelf = null) {
  const d = isPlainObject(draft) ? draft : {}
  const ok = id => typeof id === 'string' && /^[a-z0-9_]{1,40}$/.test(id) && (!Array.isArray(shelf) || shelf.includes(id))
  const picked = [...new Set((Array.isArray(d.picked) ? d.picked : []).filter(ok))]
  const n = Math.floor(Number(d.mistakes))
  const mistakes = Number.isFinite(n) ? Math.min(CHON_DRAFT_MISTAKES_MAX, Math.max(0, n)) : 0
  return d.overtime === true ? { picked, mistakes, overtime: true } : { picked, mistakes }
}

function shelfOf(ctx, cook) {
  const r = recipeOf(ctx, cook && cook.recipeId)
  return r && Array.isArray(r.shelf) ? r.shelf : null
}

// Rổ đang chọn dở để giao diện khôi phục: {picked, mistakes, overtime?} (picked chỉ gồm ô có trên kệ của món), hoặc null
// khi phiên nấu không ở bước Chọn hay chưa có rổ dở.
export function chonDraft(state, ctx) {
  const cook = state.shift && state.shift.cook
  if (!cook || cook.phase !== 'chon' || !isPlainObject(cook.chonDraft)) return null
  return normalizeChonDraft(cook.chonDraft, shelfOf(ctx, cook))
}

// Lưu rổ đang chọn dở (gọi mỗi lần thêm/bớt nguyên liệu, lúc vừa quá giờ và lúc rời bước Chọn): picked = rổ hiện tại,
// mistakes = số lần chọn nhầm — chỉ tăng, không giảm; overtime (đã quá giờ) — đã bật thì giữ. Bỏ hàng nhầm ra khỏi rổ,
// về dây phiếu, đổi tab, tải lại trang đều không xóa lần nhầm hay phạt quá giờ đã mắc.
// Trả {ok, picked, mistakes, overtime?, raised} (raised: lần nhầm vừa tăng / vừa quá giờ → nên ghi save ngay) |
// {ok:false, reason}.
export function saveChonDraft(state, draft, ctx) {
  const cook = state.shift && state.shift.cook
  if (!cook || cook.phase !== 'chon') return { ok: false, reason: 'khong_hop_le' }
  const shelf = shelfOf(ctx, cook)
  const prev = normalizeChonDraft(cook.chonDraft, shelf)
  const next = normalizeChonDraft(draft, shelf)
  const mistakes = Math.max(prev.mistakes, next.mistakes)
  const overtime = !!(prev.overtime || next.overtime)
  cook.chonDraft = overtime ? { picked: next.picked, mistakes, overtime } : { picked: next.picked, mistakes }
  const raised = mistakes > prev.mistakes || (overtime && !prev.overtime)
  return overtime
    ? { ok: true, picked: next.picked.slice(), mistakes, overtime, raised }
    : { ok: true, picked: next.picked.slice(), mistakes, raised }
}

// Chốt bước chọn. Thiếu nguyên liệu chính → {ok:false, blockedMissingMain:true}, không trừ tiền (rổ dở giữ nguyên).
// Thành công: trừ giá vốn vào ví (phần cần → cogs, phần thừa/bẫy/trái ghi chú → waste), sang Thớt sơ chế, xóa rổ dở.
// Số lần nhầm tính = max(mistakes gửi lên, lần nhầm đã lưu trong rổ dở + 1 nếu rổ dở ghi đã quá giờ): tải lại trang hay
// đổi tab không xóa được lần nhầm, phạt quá giờ.
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
  const saved = isPlainObject(cook.chonDraft) ? normalizeChonDraft(cook.chonDraft) : null
  const savedMistakes = saved ? saved.mistakes + (saved.overtime ? 1 : 0) : 0
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  // M4: sự kiện ngày làm tăng giá nguyên liệu (sh.mods.ingCostMul, vd Tắc lên giá ×2); nấu thử không tính
  const ingMul = !sh.tasting && sh.mods && sh.mods.ingCostMul ? sh.mods.ingCostMul : null
  let cogs = 0, waste = 0, xCogs = 0, xWaste = 0
  for (const id of uniq) {
    const def = (recipe.ingredients || []).find(i => i.id === id)
    // M4: nguyên liệu hiếm lấy từ kho hàng hiếm (trừ kho lúc Ra món), không trừ Tiền quán
    const unit = INGS[id] && INGS[id].rare ? 0 : (INGS[id] && INGS[id].cost) || 0
    const amount = Math.round(unit * ((def && def.qty) || 1) * cook.qty)
    const mul = ingMul && Number(ingMul[id]) > 1 ? Number(ingMul[id]) : 1
    const extra = mul > 1 ? Math.round(amount * (mul - 1)) : 0
    if (req.required.includes(id)) { cogs += amount; xCogs += extra } else { waste += amount; xWaste += extra }
  }
  // M2: Phiếu Chợ Sớm (sh.mods.cogsMul) giảm giá vốn trong ca (giảm cả phần tăng giá)
  const cogsMul = sh.mods && sh.mods.cogsMul > 0 ? sh.mods.cogsMul : 1
  // M3: mỗi lượt nấu trừ giá vốn theo bội 500đ (nguyên liệu lẻ 100–400đ, ghi chú bớt/thêm, Phiếu Chợ Sớm ×0,8)
  // để Tiền quán không bao giờ lẻ dưới 500đ.
  const base = { cogs: roundCost(cogs * cogsMul), waste: roundCost(waste * cogsMul) }
  // M4: phần tăng giá (bội 500đ) có trần: tổng cả ca ≤ trần thiệt hại một sự kiện (sh.eventCap.loss); vượt thì bớt
  // phần hao hụt trước. Ghi sh.eventCostExtra để Tổng kết ghi chú.
  let eC = 0, eW = 0
  if (xCogs > 0 || xWaste > 0) {
    eC = Math.max(0, roundCost((cogs + xCogs) * cogsMul) - base.cogs)
    eW = Math.max(0, roundCost((waste + xWaste) * cogsMul) - base.waste)
    const capLoss = sh.eventCap && Number.isFinite(Number(sh.eventCap.loss)) ? Number(sh.eventCap.loss) : Infinity
    const room = Math.max(0, Math.floor((capLoss - (Number(sh.eventCostExtra) || 0)) / 500) * 500)
    if (eC + eW > room) {
      const cut = eC + eW - room
      const cw = Math.min(eW, cut)
      eW -= cw
      eC -= cut - cw
    }
    sh.eventCostExtra = (Number(sh.eventCostExtra) || 0) + eC + eW
  }
  cogs = base.cogs + eC
  waste = base.waste + eW
  spend(state, cogs, 'cogs')
  spend(state, waste, 'waste')
  cook.cost = { cogs, waste }
  cook.picked = uniq
  // cook.chonMistakes lúc này là lần nhầm mang sang từ lần bỏ món trước (startCook, mục 25): không thấp hơn được
  cook.chonMistakes = Math.max(0, Number(mistakes) || 0, savedMistakes, cleanMistakes(cook.chonMistakes))
  delete cook.chonDraft
  // lần nhầm đã vào điểm bước Chọn: phiếu không cần giữ cho dòng này nữa
  recordLineMistakes(findTicket(sh, cook.ticketId), cook.lineIndex, 0, 'clear')
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
  // thẻ "Chảo dầu bốc cháy" chỉ hợp với bước chiên chảo; phin cà phê, nồi luộc (skin) quá lửa thì không mở thẻ này
  if (tag && !(tag === 'chay' && step.skin && step.skin !== 'chao')) unlockTip(state, tag, ctx)
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
  const cost = roundCost(step.retryCost)
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
  // M4: món hiếm trừ kho nguyên liệu hiếm lúc Ra món (bỏ món, làm lại bước không mất; nấu thử không trừ)
  if (!sh.tasting) {
    const used = consumeRare(state, cook.recipeId, cook.qty, ctx)
    if (Object.keys(used).length) dish.rareUsed = used
  }
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

// Bỏ món: giá vốn đã trừ chuyển sang hao hụt; phiếu quay lại dây. Bỏ giữa bước Chọn: rổ dở mất theo phiên nấu, số lần
// chọn nhầm (kể cả phạt quá giờ) ghi vào phiếu theo dòng (ticket.chonMistakes, chỉ tăng) để mở lại không về 0. Bỏ trên Thớt
// (đã chốt bước Chọn): ghi số lần nhầm đã tính lúc chốt (cook.chonMistakes), cũng chỉ tăng.
export function abandonDish(state, ctx) {
  const sh = state.shift
  const cook = sh && sh.cook
  if (!cook || cook.phase === 'xong') return { ok: false }
  const moved = cook.cost ? cook.cost.cogs : 0
  sh.ledger.cogs -= moved
  sh.ledger.waste += moved
  const ticket = findTicket(sh, cook.ticketId)
  if (cook.phase === 'chon') {
    const d = isPlainObject(cook.chonDraft) ? normalizeChonDraft(cook.chonDraft) : null
    const n = Math.max(cleanMistakes(cook.chonMistakes), d ? d.mistakes + (d.overtime ? 1 : 0) : 0)
    recordLineMistakes(ticket, cook.lineIndex, n, 'max')
  } else if (cook.chonScore !== null && cook.chonScore !== undefined) {
    // bỏ món trên Thớt (đã chốt bước Chọn): mở lại dòng này là chọn lại từ đầu (rổ trống, mua lại nguyên liệu) nhưng vẫn
    // mang số lần nhầm đã tính ở lượt chốt (cả phạt quá giờ) → chốt rồi bỏ món cũng không né được phạt bước Chọn
    recordLineMistakes(ticket, cook.lineIndex, cleanMistakes(cook.chonMistakes), 'max')
  }
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
  // M4: tip 5.000đ khi 5 sao và khách thực trả từ 20.000đ (không còn tip 10.000đ theo Không tì vết, khách khó tính,
  // chuỗi "Quầy chuẩn" hay Ngày lãnh lương ×1,5 — xem scoring.tipFor)
  const B = { tipFiveStar: cfg(ctx, 'tipFiveStar'), tipMinBill: cfg(ctx, 'tipMinBill') }
  const bill = billOf(customer, R)
  const tip = tipFor(res.stars, bill, B)
  const repTable = cfg(ctx, 'reputationByStars') || {}
  let rep = Number(repTable[res.stars]) || 0
  if (flawlessAny) rep += 1
  // M4: khách khó tính chấm 5 sao → thêm danh tiếng (thay tip 10.000đ cũ)
  const strict = !!(customer.strict || (persona && persona.strict))
  if (res.stars === 5 && strict && !customer.tutorial) rep += Number(cfg(ctx, 'strictFiveStarRep')) || 0
  rep += festiveReputation(sh, customer.dishes, ctx)
  // M4: mỗi phần món hiếm đạt Ngon trở lên +1 danh tiếng (RARE_CONFIG.repPerGood)
  rep += rareReputation(customer.dishes, ctx)
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
    counterErrors, kitchenErrors, tip, bill, reputation: rep, review,
    dishes: (customer.dishes || []).filter(Boolean).map(d => ({ recipeId: d.recipeId, qty: d.qty, notes: d.notes, q: d.q, grade: d.grade, flawless: d.flawless, errors: d.errors })),
    waitRatio: customer.waitRatio ?? null, apologyBonus: customer.apologyBonus || 0, complaint: null,
    // M4: khách lạ (quà quê theo số sao, trao lúc cuối ca: rare.finishShiftRare)
    ...(customer.stranger ? { stranger: customer.stranger } : {})
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

// M4: làm lại được không — các dòng bị phàn nàn có món hiếm thì kho phải còn đủ (như rareLeft: tồn kho trừ phần đã nằm
// trên phiếu bếp chưa ra món và phiếu đang ghi ở quầy); hết thì chỉ hoàn tiền được.
export function complaintRemakeOk(state, customerId, ctx) {
  const sh = state.shift
  const customer = sh && sh.customers[customerId]
  if (!customer || !customer.complaint) return false
  return rareLinesFit(state, (customer.complaint.items || []).map(it => it.line), ctx, { withDraft: true })
}

// Xử lý phàn nàn: xin lỗi đúng (DIALOGUE.apologies[i].correct) +1 sao (vẫn theo trần).
// remake: thêm lại các dòng bị phàn nàn vào đầu dây phiếu (cờ remake, sao tối đa 3), khách về 'cho_mon'.
//   M4: dòng món hiếm mà kho không đủ → {ok: false, reason: 'het_hang_hiem'} (chỉ hoàn tiền được).
// refund: ledger.refunds += số khách đã thực trả cho các dòng đó (item.refund), chốt sao ngay.
export function resolveComplaint(state, customerId, choice, ctx) {
  const sh = state.shift
  const customer = sh && sh.customers[customerId]
  if (!customer || !customer.complaint || customer.complaint.resolved) return { ok: false, reason: 'khong_co_phan_nan' }
  const { apologyIndex, action } = choice || {}
  if (action !== 'remake' && action !== 'refund') return { ok: false, reason: 'khong_hop_le' }
  if (action === 'remake' && !complaintRemakeOk(state, customerId, ctx)) return { ok: false, reason: 'het_hang_hiem' }
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
