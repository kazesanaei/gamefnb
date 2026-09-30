// Kinh tế: tổng kết ca, tất toán ví, chi tiêu, vay Dì Sáu, mua nâng cấp/công thức.
import { drawerTotal, roundReward, formatVND, COST_STEP, REWARD_STEP } from './money.js'
import { DEFAULT_BALANCE, emit, newRecipeProgress, cfg, refIncomeFor, defaultIncidents, defaultEventDay } from './state.js'

function countCodes(into, codes) {
  for (const c of codes || []) into[c] = (into[c] || 0) + 1
}

// Mã lỗi → trigger thẻ Mẹo nghề dùng làm "Lời khuyên" (mã trùng trigger thì dùng thẳng).
export const ERROR_TIP_TRIGGER = Object.freeze({
  bao_du: 'total_too_high', bao_thieu: 'total_too_high',
  thoi_thieu: 'change_wrong', thoi_du: 'change_wrong', qr_gia: 'fake_qr',
  sai_mon: 'first_readback', thieu_mon: 'first_readback', thua_mon: 'first_readback', sai_so_luong: 'first_readback',
  sai_ghi_chu: 'sai_ghi_chu', trai_ghi_chu: 'sai_ghi_chu',
  cho_goi_mon: 'cho_lau', cho_lau: 'cho_lau',
  thieu_nguyen_lieu: 'thieu_nguyen_lieu', thua_nguyen_lieu: 'thieu_nguyen_lieu', bay_nguyen_lieu: 'thieu_nguyen_lieu',
  thieu_chinh: 'thieu_nguyen_lieu', thieu_phu: 'thieu_nguyen_lieu', thua: 'thieu_nguyen_lieu', bay: 'thieu_nguyen_lieu',
  chua_so_che: 'chua_rua', bo_qua: 'chua_rua',
  chay: 'chay', tran: 'nem_lech',
  song: 'dish_hong', hong: 'dish_hong', sai_cach: 'dish_hong', sai_cach_so_che: 'dish_hong'
})

// Thẻ Mẹo nghề hợp với mã lỗi (trigger trùng mã, không thì theo bảng ERROR_TIP_TRIGGER).
export function tipForError(code, tips) {
  const list = Array.isArray(tips) ? tips : Object.values(tips || {})
  return list.find(t => t && t.trigger === code) ||
    (ERROR_TIP_TRIGGER[code] ? list.find(t => t && t.trigger === ERROR_TIP_TRIGGER[code]) : null) || null
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
  // M3: tiền khách quen trả nợ (tình huống ghi nợ ở ca trước) vào ca này
  const debtIn = Number(sh.debtIn) || 0
  // M4: tiền sự kiện (thưởng vào lúc tất toán; phạt/chi đã trừ ví lúc phát sinh). Ca dở từ bản cũ chưa có → 0.
  const eventIn = Number(L.eventIn) || 0
  const eventOut = Number(L.eventOut) || 0
  const profit = cashNet + sh.qrBalance + sh.tipJar + debtIn + eventIn - fixedCost - L.refunds - L.cogs - L.waste - eventOut
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
    const t = tipForError(topCode, data && data.TIPS)
    if (t) { advice.tipId = t.id; advice.text = t.text }
  }
  const lateReviews = Object.values(sh.customers).filter(c => c.reviewLate).map(c => ({ customerId: c.id, name: c.name, ...c.reviewLate }))
  return {
    day: sh.day,
    served: sh.served.length, lost: sh.lost.length, missed: sh.missed || 0,
    // khách trả bằng ảnh chuyển khoản giả bị bắt (từ chối đúng hoặc Loa chặn): nằm trong lost nhưng là làm đúng
    scamCaught: sh.lost.filter(id => sh.customers[id] && sh.customers[id].lostReason === 'qr_gia').length,
    cashSales: L.cash, qrSales: L.qr, sales: L.sales, listValue: L.listValue,
    tips: L.tips, cogs: L.cogs, waste: L.waste, refunds: L.refunds,
    undercharge: L.undercharge, overchange: L.overchange, rounding: L.rounding || 0, fakeQrLoss: L.fakeQrLoss,
    fixedCost, profit,
    drawerExpected, drawerActual, drawerDiff: drawerActual - drawerExpected,
    qrBalance: sh.qrBalance, tipJar: sh.tipJar,
    avgStars, ratings: starsList, reputationGain: sh.reputationGain || 0,
    counterErrors, kitchenErrors, bestDish, advice,
    lateReviews, loanRepaid: 0,
    // M3: tình huống trong ca (đã xử lý, M4: tối đa 2 mỗi ca) và tiền khách quen trả nợ
    incidents: [sh.incident, ...(Array.isArray(sh.incidentQueue) ? sh.incidentQueue : [])]
      .filter(x => x && x.status === 'xong' && x.result).map(x => ({ ...x.result })),
    debtIn, debtNotes: (sh.debtNotes || []).map(n => ({ ...n })),
    // M4: sổ tiền sự kiện; quà hàng hiếm cuối ca (khách lạ, Giỏ chợ: rare.finishShiftRare)
    eventIn, eventOut, eventNotes: (sh.eventNotes || []).map(n => ({ ...n })),
    rareNotes: (Array.isArray(sh.rareNotes) ? sh.rareNotes : []).map(n => JSON.parse(JSON.stringify(n)))
  }
}

// Tất toán ví: wallet += (tiền mặt vượt quỹ lẻ) + QR + tip + tiền khách quen trả nợ + tiền thưởng sự kiện
// − chi phí cố định − hoàn tiền; trả nợ nếu có. (Giá vốn/hao hụt và phạt/chi sự kiện đã trừ vào ví lúc phát sinh.)
export function settleShift(state, summary) {
  const sh = state.shift
  const cashNet = drawerTotal(sh.drawer) - sh.floatAmount
  const eventIn = Number(sh.ledger && sh.ledger.eventIn) || 0
  state.wallet += cashNet + sh.qrBalance + sh.tipJar + (Number(sh.debtIn) || 0) + eventIn - summary.fixedCost - summary.refunds
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

// ---------- M4: tiền sự kiện (sự kiện ngày, tình huống trong ca) ----------
// ledger.eventIn: tiền thưởng/tiền vào từ sự kiện (bội 1.000đ), ví nhận lúc tất toán (settleShift, như debtIn).
// ledger.eventOut: phạt, chi phí, tiền mua từ sự kiện (bội 500đ), trừ ví NGAY lúc phát sinh (như giá vốn).
// Bất biến ví giữ nguyên: ví sau ca − ví đầu ca = lãi − trả nợ Dì Sáu (lãi đã gồm + eventIn − eventOut).
// Trần mỗi ngày thật: sổ state.incidents.day = {key, loss, gain}, key = ngày thật lúc mở ca theo giờ tin cậy (sh.dayKey;
// thiếu giờ thật thì theo ngày game; giờ máy bị lùi vẫn tính vào sổ của ngày đang có). Tổng phạt/chi bắt buộc ≤ lossIncomeMul × thu nhập tham chiếu, tổng tiền thưởng ≤ gainIncomeMul ×
// thu nhập tham chiếu (BALANCE.eventDayCap). Vượt trần: phạt phần dư được Dì Sáu đỡ giùm, thưởng phần dư không cộng.

// Lời giải thích khi tiền bị kẹp: theo trần ngày thật (spared, gainFull) hoặc theo trần của một sự kiện trong ca
// (sparedCap, gainCap: trần tính theo doanh thu dự kiến của ca, xem incidents.incidentLossCap/incidentGainCap).
const EVENT_TEXTS = Object.freeze({
  spared: 'Dì Sáu đỡ giùm con lần này.',
  gainFull: 'Hôm nay tiền thưởng từ sự kiện đã đủ mức, phần dư Dì Sáu ghi công bằng lời khen.',
  sparedCap: 'Mỗi lần phạt ca này tối đa {cap} (theo doanh thu ca), Dì Sáu đỡ giùm con {spared}.',
  gainCap: 'Tiền thưởng mỗi sự kiện ca này tối đa {cap} (theo doanh thu ca), phần dư Dì Sáu ghi công bằng lời khen.'
})

function eventTexts(ctx) {
  const C = (ctx && ctx.data && ctx.data.INCIDENT_CONFIG) || {}
  return {
    spared: C.sparedText || EVENT_TEXTS.spared, gainFull: C.gainFullText || EVENT_TEXTS.gainFull,
    sparedCap: C.sparedCapText || EVENT_TEXTS.sparedCap, gainCap: C.gainCapText || EVENT_TEXTS.gainCap
  }
}

function fillMoney(tpl, vars) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? formatVND(vars[k]) : m))
}

// Khóa ngày `a` mới hơn khóa `b`: cùng dạng 'YYYY-MM-DD' thì so ngày; cùng dạng 'ngay-N' (không có giờ thật) thì so số
// ngày game; khác dạng (vd ca dở từ bản cũ không có giờ thật) thì coi là sổ khác (mới hơn).
function dayKeyNewer(a, b) {
  const date = /^\d{4}-\d{2}-\d{2}$/
  if (date.test(a) && date.test(b)) return a > b
  const na = /^ngay-(\d+)$/.exec(a), nb = /^ngay-(\d+)$/.exec(b)
  if (na && nb) return Number(na[1]) > Number(nb[1])
  return a !== b
}

// Sổ tiền sự kiện của ngày thật đang chơi: sang ngày thật MỚI HƠN thì mở sổ mới; khóa ngày cũ hơn (giờ máy bị lùi) dùng
// tiếp sổ hiện tại (lùi giờ máy rồi trả giờ về không mở lại trần của ngày thật), giống rare.rareToday.
export function eventDayBook(state, sh = state.shift) {
  const S = state.incidents && typeof state.incidents === 'object' ? state.incidents : (state.incidents = defaultIncidents())
  const key = (sh && sh.dayKey) || ('ngay-' + ((sh && sh.day) || state.day))
  if (!S.day || typeof S.day !== 'object' || typeof S.day.key !== 'string' || !S.day.key) S.day = { ...defaultEventDay(), key }
  else if (S.day.key !== key && dayKeyNewer(key, S.day.key)) S.day = { ...defaultEventDay(), key }
  if (!Number.isFinite(S.day.loss)) S.day.loss = 0
  if (!Number.isFinite(S.day.gain)) S.day.gain = 0
  return S.day
}

// Trần phạt/thưởng sự kiện của cả ngày thật (đồng): { loss, gain }.
export function eventDayCaps(ctx, day) {
  const C = cfg(ctx, 'eventDayCap') || DEFAULT_BALANCE.eventDayCap
  const tnc = refIncomeFor(ctx, day)
  return {
    loss: Math.floor(Math.max(0, tnc * (C.lossIncomeMul ?? 1)) / COST_STEP) * COST_STEP,
    gain: Math.floor(Math.max(0, tnc * (C.gainIncomeMul ?? 1)) / REWARD_STEP) * REWARD_STEP
  }
}

// Phần còn lại trong trần ngày thật: { loss, gain } (đồng).
export function eventDayRoom(state, ctx, sh = state.shift) {
  const caps = eventDayCaps(ctx, (sh && sh.day) || state.day)
  const book = eventDayBook(state, sh)
  return { loss: Math.max(0, caps.loss - book.loss), gain: Math.max(0, caps.gain - book.gain) }
}

// Ghi chú tiền sự kiện của ca (Tổng kết "Sự kiện trong ca"): {id, name, text, money, fx?, source?, ...extra}.
// fx: hiệu ứng ngắn không phải tiền vào/ra sổ sự kiện (vd "+5 danh tiếng", "Chi phí cố định +5.000đ"); source:
// 'incident' khi là tiền của tình huống trong ca (thẻ tình huống đã ghi, Tổng kết không lặp lại).
function pushEventNote(sh, note, money, extra) {
  sh.eventNotes = Array.isArray(sh.eventNotes) ? sh.eventNotes : []
  const n = { id: (note && note.id) || '', name: (note && note.name) || '', text: (note && note.text) || '', money, ...extra }
  if (note && note.fx) n.fx = String(note.fx)
  if (note && note.source) n.source = String(note.source)
  sh.eventNotes.push(n)
  return n
}

// Ghi chú sự kiện không có tiền vào/ra sổ sự kiện (vd giải có danh tiếng, chi phí cố định tăng, lời nhắc nhở). Trả note.
export function eventNote(state, note) {
  const sh = state.shift
  if (!sh || !note) return null
  return pushEventNote(sh, note, 0, {})
}

// Tiền vào từ sự kiện (giải thưởng, tiền cảm ơn…): kẹp theo `cap` (trần của sự kiện, vd gainCap) và trần ngày thật,
// làm tròn xuống bội 1.000đ; ghi ledger.eventIn và sh.eventNotes. Trả { amount, capped } (capped = phần không cộng).
export function eventMoneyIn(state, amount, note, ctx, { cap = Infinity } = {}) {
  const sh = state.shift
  if (!sh) return { amount: 0, capped: 0 }
  const want = Math.max(0, Math.round(Number(amount) || 0))
  const room = eventDayRoom(state, ctx, sh).gain
  const got = Math.floor(Math.max(0, Math.min(want, Number(cap) >= 0 ? Number(cap) : Infinity, room)) / REWARD_STEP) * REWARD_STEP
  eventDayBook(state, sh).gain += got
  sh.ledger.eventIn = (Number(sh.ledger.eventIn) || 0) + got
  const capped = want - got
  // phần không cộng: do trần của sự kiện (cap nhỏ hơn phần còn lại của ngày) hay do trần ngày thật
  const byCap = Number(cap) >= 0 && Number(cap) < want && Number(cap) <= room
  const why = capped > 0 ? (byCap ? fillMoney(eventTexts(ctx).gainCap, { cap: got }) : eventTexts(ctx).gainFull) : ''
  const text = [note && note.text, why].filter(Boolean).join(' ')
  pushEventNote(sh, { ...note, text }, got, capped > 0 ? { capped } : {})
  if (got > 0 || capped > 0) {
    emit(ctx, 'event.money', { id: (note && note.id) || '', name: (note && note.name) || '', text, amount: got, capped,
      source: (note && note.source) || 'su_kien' })
  }
  return { amount: got, capped }
}

// Tiền ra vì sự kiện (phạt, chi phí, tiền mua): trừ ví ngay, ghi ledger.eventOut (bội 500đ) và sh.eventNotes.
// fine = true (mặc định: phạt/chi bắt buộc): kẹp theo `cap` (lossCap của sự kiện) và trần phạt của ngày thật, phần vượt
// được Dì Sáu đỡ giùm (spared). fine = false (tiền người chơi tự chọn chi, vd mua hàng): chỉ kẹp theo `cap`.
// Trả { amount, spared }.
export function eventMoneyOut(state, amount, note, ctx, { cap = Infinity, fine = true } = {}) {
  const sh = state.shift
  if (!sh) return { amount: 0, spared: 0 }
  const want = Math.max(0, Math.round(Number(amount) || 0))
  const limit = Number(cap) >= 0 ? Number(cap) : Infinity
  const room = fine ? eventDayRoom(state, ctx, sh).loss : Infinity
  const paid = Math.floor(Math.max(0, Math.min(want, limit, room)) / COST_STEP) * COST_STEP
  if (fine) eventDayBook(state, sh).loss += paid
  state.wallet -= paid
  sh.ledger.eventOut = (Number(sh.ledger.eventOut) || 0) + paid
  const spared = want - paid
  // phần Dì Sáu đỡ giùm: do trần của sự kiện (cap nhỏ hơn phần còn lại của ngày) hay do trần ngày thật; tiền tự chọn chi
  // (fine = false, không phải phạt) giữ câu chung
  const byCap = fine && limit < want && limit <= room
  const why = spared > 0 ? (byCap ? fillMoney(eventTexts(ctx).sparedCap, { cap: paid, spared }) : eventTexts(ctx).spared) : ''
  const text = [note && note.text, why].filter(Boolean).join(' ')
  pushEventNote(sh, { ...note, text }, -paid, spared > 0 ? { spared } : {})
  if (paid > 0 || spared > 0) {
    emit(ctx, 'event.fined', { id: (note && note.id) || '', name: (note && note.name) || '', text, amount: paid, spared,
      fine: !!fine, source: (note && note.source) || 'su_kien' })
  }
  return { amount: paid, spared }
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
  // tiền nợ (gốc + lãi) làm tròn lên bội 1.000đ để ví không lẻ
  state.loan = { amount, remaining: roundReward(amount * (1 + interest)) }
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
