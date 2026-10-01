// Tình huống trong ca (M3): chuyện bất ngờ GIỮA hai khách, người chơi chọn cách xử lý; mỗi lựa chọn ghi rõ cái giá,
// luôn có 1 lựa chọn an toàn, thiệt hại có trần. Dữ liệu: ctx.data.INCIDENTS, ctx.data.INCIDENT_CONFIG
// (src/data/incidents.js). Lõi thuần: ngẫu nhiên theo hạt giống của save + ngày game (tải lại không đổi), không DOM.
//
// Vòng đời trong ca (M4: tối đa 2 tình huống mỗi ca, sh.incident là tình huống thứ nhất, sh.incidentQueue các tình
// huống sau theo thứ tự; "tình huống đang chờ" = tình huống đầu tiên còn status 'cho', xem activeIncident):
//   startShift → planIncidents: bốc có/không (xác suất theo Cài đặt Nhiều/Vừa/Ít, bảo hiểm theo mức), lần 2 (ca đủ
//     khách), bốc loại (theo loại tốt/chọn/xấu và luật nhịp, không lặp 5 loại gần nhất, loại có lựa chọn vượt trần thì
//     bỏ), bốc lúc xuất hiện (sau khách thứ mấy; hai tình huống cách nhau ít nhất 2 khách).
//   Giao diện hỏi incidentDue (quầy trống, không đang chơi mini-game, đủ số khách, điều kiện riêng) khi đang ở tab
//     Quầy → openIncident (chốt chi tiết: ai, món gì, phiếu nào) → hộp thoại chặn thời gian ca (kiên nhẫn tạm dừng)
//     → resolveIncident(lựa chọn) áp hiệu ứng, ghi vào ca, phát 'incident.resolved'.
//   endShift → finishShiftIncidents: cập nhật bảo hiểm (state.incidents.since).
// state.incidents = { since, recent: [id], log: [...], debts: [...], bonus: {day, customers} | null, total,
//   lastKind, lastLoss, day: {key, loss, gain}, warn, lastEvent, announced } (M4: luật nhịp, sổ tiền sự kiện của ngày
//   thật ở economy.js, sự kiện ngày đã chốt ở events.announceDayEvent).
// M4 (thiết kế mục B.3): tình huống `generic: true` trong dữ liệu chạy chung loại 'chung' (KINDS.chung): điều kiện
//   `needs`, lựa chọn có `outcomes` (tiền bán, tiền thưởng, tiền mất, tiền chi, giá vốn, danh tiếng, hàng hiếm, mảnh
//   công thức, ngân sách chờ món), trần tự tính (maxLoss/maxGain/maxFine), kết quả bốc 1 lần lúc mở tình huống.
import { seedFrom, nextFloat, nextInt, pick, weightedPick, chance } from './rng.js'
import { clearLineMistakes } from './kitchen.js'
import { cfg, emit, unlockTip, refIncomeFor, defaultIncidents, defaultEventDay, eventFrequency } from './state.js'
import { formatVND, canMakeChange, minBillsChange, addBills, composeGreedy, drawerTotal, roundCost, COST_STEP, REWARD_STEP } from './money.js'
import { orderableRecipes, lineKey, customerCount, MAX_CUSTOMERS } from './customer.js'
import { priceOfLines, unitPriceOf, waitBudgetFor } from './order.js'
import { eventMoneyIn, eventMoneyOut } from './economy.js'
import { rollDayEvent, dayEventKind } from './events.js'
import { ensureRare, rareIngredientIds, rareRoom, ownsRareRecipe, grantRareStock, grantRareFragment, grantRare, grantFragment, isRareRecipe,
  rareDayRoom, overflowText } from './rare.js'

const DEFAULT_CONFIG = Object.freeze({
  fromDay: 3,
  chance: { nhieu: 0.75, vua: 0.55, it: 0.3 }, secondChance: { nhieu: 0.45, vua: 0.3, it: 0 },
  maxPerShift: { nhieu: 2, vua: 2, it: 1 }, guaranteeAfter: { nhieu: 1, vua: 2, it: 3 },
  secondMinCustomers: 6, minGap: 2, goodOnly: ['it'], badFromDay: 5, calmAfterLoss: 0.5, noRepeat: 5,
  lossCap: { revenueShare: 0.1, incomeMul: 0.5 }, gainCap: { revenueShare: 0.15, incomeMul: 0.75 },
  logMax: 20, recentMax: 10
})

function D(ctx) { return (ctx && ctx.data) || {} }

export function incidentConfig(ctx) {
  return { ...DEFAULT_CONFIG, ...(D(ctx).INCIDENT_CONFIG || {}) }
}

function defs(ctx) { return D(ctx).INCIDENTS || null }

export { defaultIncidents }

// Trạng thái tình huống trong save (tạo mặc định nếu thiếu).
export function ensureIncidents(state) {
  const s = state.incidents && typeof state.incidents === 'object' ? state.incidents : (state.incidents = defaultIncidents())
  if (!Number.isFinite(s.since)) s.since = 0
  if (!Array.isArray(s.recent)) s.recent = []
  if (!Array.isArray(s.log)) s.log = []
  if (!Array.isArray(s.debts)) s.debts = []
  if (s.bonus === undefined) s.bonus = null
  if (!Number.isFinite(s.total)) s.total = 0
  if (!INCIDENT_KINDS.includes(s.lastKind)) s.lastKind = null
  if (!Number.isFinite(s.lastLoss)) s.lastLoss = 0
  if (!s.day || typeof s.day !== 'object') s.day = defaultEventDay()
  if (!s.warn || typeof s.warn !== 'object' || Array.isArray(s.warn)) s.warn = {}
  if (!INCIDENT_KINDS.includes(s.lastEvent)) s.lastEvent = null
  if (!s.announced || typeof s.announced !== 'object' || Array.isArray(s.announced)) s.announced = {}
  return s
}

// Mức "Tần suất sự kiện" đang chọn trong Cài đặt ('nhieu' | 'vua' | 'it'; sai thì 'vua'), dùng chung với sự kiện ngày.
export function incidentFrequency(state) {
  return eventFrequency(state)
}

// M4: loại tình huống 'tot' | 'chon' | 'xau' (dữ liệu cũ không có kind: positive → 'tot', còn lại 'chon').
export const INCIDENT_KINDS = Object.freeze(['tot', 'chon', 'xau'])
export function incidentKind(d) {
  if (d && INCIDENT_KINDS.includes(d.kind)) return d.kind
  return d && d.positive ? 'tot' : 'chon'
}

// Giá trị theo mức: cấu hình có thể là số (mọi mức như nhau) hoặc bảng {nhieu, vua, it}.
function perLevel(v, freq, fallback = 0) {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && Number.isFinite(Number(v[freq]))) return Number(v[freq])
  return fallback
}

// Số ca liền không có tình huống thì ca kế chắc chắn có (theo mức).
export function incidentGuaranteeAfter(state, ctx) {
  return perLevel(incidentConfig(ctx).guaranteeAfter, incidentFrequency(state), 3)
}

// Xác suất có (ít nhất 1) tình huống của ca kế tiếp (0 trước ngày fromDay; 1 khi bảo hiểm đã tới).
export function incidentChance(state, ctx, day = state.day) {
  const C = incidentConfig(ctx)
  if (!defs(ctx) || day < C.fromDay) return 0
  if (ensureIncidents(state).since >= incidentGuaranteeAfter(state, ctx)) return 1
  return perLevel(C.chance, incidentFrequency(state), 0)
}

// ---------- Tiền ----------

function recipeOf(ctx, id) { return (D(ctx).RECIPES || {})[id] || null }

function lowerFirst(s) { return s ? s.charAt(0).toLocaleLowerCase('vi-VN') + s.slice(1) : '' }

// Giá vốn của qty phần món (nguyên liệu không tùy chọn), theo Phiếu Chợ Sớm nếu ca đang dùng; bội 500đ.
export function itemCost(ctx, sh, recipeId, qty = 1) {
  const r = recipeOf(ctx, recipeId)
  const INGS = D(ctx).INGREDIENTS || {}
  if (!r) return 0
  const unit = (r.ingredients || []).filter(i => i.role !== 'tuy_chon')
    .reduce((s, i) => s + ((INGS[i.id] && INGS[i.id].cost) || 0) * (i.qty || 1), 0)
  const mul = sh && sh.mods && sh.mods.cogsMul > 0 ? sh.mods.cogsMul : 1
  return roundCost(unit * qty * mul)
}

// Doanh thu dự kiến của ca: tổng giá niêm yết đơn thật của mọi khách trong lịch.
export function expectedRevenue(sh, ctx) {
  const R = D(ctx).RECIPES || {}
  return Object.values((sh && sh.customers) || {}).reduce((s, c) => s + priceOfLines(c.request || [], R), 0)
}

// Trần thiệt hại một tình huống: min(10% doanh thu dự kiến, 0,5 thu nhập tham chiếu), làm tròn xuống bội 500đ.
export function incidentLossCap(state, sh, ctx) {
  const C = incidentConfig(ctx)
  const L = C.lossCap || DEFAULT_CONFIG.lossCap
  const floor500 = v => Math.floor(Math.max(0, v) / COST_STEP) * COST_STEP
  const byRevenue = floor500(expectedRevenue(sh, ctx) * (L.revenueShare ?? 0.1))
  const byIncome = floor500(refIncomeFor(ctx, sh.day) * (L.incomeMul ?? 0.5))
  return Math.min(byRevenue, byIncome)
}

// M4: trần tiền thưởng một sự kiện/tình huống: min(15% doanh thu dự kiến, 0,75 thu nhập tham chiếu), làm tròn xuống
// bội 1.000đ. Dùng chung cho tiền thưởng của sự kiện ngày (economy.eventMoneyIn với cap).
export function incidentGainCap(state, sh, ctx) {
  const C = incidentConfig(ctx)
  const G = C.gainCap || DEFAULT_CONFIG.gainCap
  const floor1000 = v => Math.floor(Math.max(0, v) / REWARD_STEP) * REWARD_STEP
  const byRevenue = floor1000(expectedRevenue(sh, ctx) * (G.revenueShare ?? 0.15))
  const byIncome = floor1000(refIncomeFor(ctx, sh.day) * (G.incomeMul ?? 0.75))
  return Math.min(byRevenue, byIncome)
}

function spendCost(state, sh, amount) {
  if (!(amount > 0)) return
  state.wallet -= amount
  sh.ledger.cogs = (sh.ledger.cogs || 0) + amount
}

function fill(tpl, vars) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m))
}

// Số khách đã xong khâu quầy (kẹp phiếu) trong ca.
function clipsOf(sh) {
  return (sh.receipts || []).length
}

// Đang chơi dở một mini-game (bước Chọn hoặc một bước trên Thớt): không chen tình huống vào.
export function miniGameBusy(sh) {
  const c = sh && sh.cook
  return !!(c && c.phase !== 'xong' && (c.phase === 'chon' || c.activeStepId || c.retryPending))
}

// M4: các tình huống đã lên kế hoạch cho ca, theo thứ tự (sh.incident rồi sh.incidentQueue).
export function shiftIncidents(sh) {
  if (!sh) return []
  return [sh.incident, ...(Array.isArray(sh.incidentQueue) ? sh.incidentQueue : [])].filter(x => x && typeof x === 'object')
}

// Tình huống đầu ca (mở hàng) đã lỡ: ca đã có khách xong quầy hoặc đã bán được tiền (không bao giờ bật được nữa).
function openingMissed(sh, inc) {
  return !!(inc && inc.opening && inc.status === 'cho' && (clipsOf(sh) > 0 || (sh.ledger && sh.ledger.sales > 0)))
}

// Tình huống đang chờ: tình huống đầu tiên còn status 'cho' (các tình huống trước nó đã xử lý xong, hoặc là tình huống
// đầu ca đã lỡ — bỏ qua để tình huống sau vẫn bật được); null nếu hết.
export function activeIncident(sh) {
  return shiftIncidents(sh).find(x => x.status === 'cho' && !openingMissed(sh, x)) || null
}

// Tình huống ngay trước `inc` trong ca (null nếu `inc` là tình huống thứ nhất).
function previousIncident(sh, inc) {
  const list = shiftIncidents(sh)
  const i = list.indexOf(inc)
  return i > 0 ? list[i - 1] : null
}

// ---------- Từng loại tình huống ----------

// Khách đổi ý: phiếu vừa kẹp gần nhất còn chờ bếp (chưa nấu dòng nào), khách đã trả tiền thật, có dòng đúng yêu cầu
// và có món khác trong thực đơn để đổi.
function doiYTarget(state, sh, ctx) {
  const R = D(ctx).RECIPES || {}
  const menu = orderableRecipes(state, ctx)
  const tickets = (sh.tickets || [])
    .filter(t => t.status === 'cho' && !t.remake && (t.done || []).every(x => !x) && !(sh.cook && sh.cook.ticketId === t.id))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  for (const t of tickets) {
    const c = sh.customers[t.customerId]
    if (!c || c.tutorial || c.status !== 'cho_mon' || !c.receipt || (c.payMethod === 'qr' && c.fakeQr)) continue
    const bad = new Set((c.orderErrors || []).map(e => e.index))
    const present = new Set([...t.lines, ...(c.request || [])].map(l => l.recipeId))
    // M4: không đổi sang món hiếm (số phần món hiếm đã chốt theo tồn kho lúc mở ca)
    const alts = menu.filter(id => !present.has(id) && R[id] && !isRareRecipe(R[id]))
    if (!alts.length) continue
    for (let i = 0; i < t.lines.length; i++) {
      if (bad.has(i)) continue
      const line = t.lines[i]
      const j = (c.request || []).findIndex(l => lineKey(l) === lineKey(line) && Number(l.qty) === Number(line.qty))
      if (j < 0) continue
      return { ticket: t, customer: c, lineIndex: i, requestIndex: j, alts }
    }
  }
  return null
}

// Các phiếu thu của khách (bản trong khách và bản trong sổ ca; sau khi tải lại là 2 bản riêng).
function receiptsOf(sh, c, t) {
  const out = []
  if (c.receipt) out.push(c.receipt)
  const r2 = (sh.receipts || []).find(r => r.no === (t.receiptNo || t.no))
  if (r2 && !out.includes(r2)) out.push(r2)
  return out
}

// ---------- M4: hàng hiếm (kho, trần ngày, mảnh: src/core/rare.js) ----------
// Các hàm hàng hiếm dùng chung được xuất lại từ đây cho mã cũ (ensureRare, rareIngredientIds, rareRoom, ownsRareRecipe,
// grantRareStock, grantRareFragment). Chưa có dữ liệu hàng hiếm thì tình huống cần hàng hiếm (needs.stockRoom /
// ownsRare) không được bốc, phần thưởng hàng hiếm bỏ qua.
export { ensureRare, rareIngredientIds, rareRoom, ownsRareRecipe, grantRareStock, grantRareFragment }

// Chọn nguyên liệu hiếm còn chỗ chứa ít nhất `need` phần: ưu tiên nguyên liệu của công thức hiếm đã có (bốc bằng luồng
// ngẫu nhiên của tình huống). null nếu không có.
function pickRareFor(state, inc, ctx, need = 1) {
  const R = D(ctx).RECIPES || {}
  const ids = rareIngredientIds(ctx).filter(id => rareRoom(state, id, ctx) >= need)
  if (!ids.length) return null
  const used = new Set()
  for (const rid of Object.keys(state.recipes || {})) {
    const r = R[rid]
    if (r && r.source === 'hiem' && r.rare) for (const id of Object.keys(r.rare)) used.add(id)
  }
  const pref = ids.filter(id => used.has(id))
  return pick(inc, pref.length ? pref : ids)
}

// ---------- M4: loại 'chung' (tình huống chạy theo dữ liệu) ----------

// Số phần đã bán trong ca (các dòng trên phiếu thu đã kẹp).
function soldPortions(sh) {
  return (sh.receipts || []).reduce((s, r) => s + (r.lines || []).reduce((a, l) => a + (Number(l.qty) || 0), 0), 0)
}

// Tổng số phần của mọi đơn trong ca (để biết tình huống cần "đã bán n phần" có thể xảy ra không).
function plannedPortions(sh) {
  return Object.values(sh.customers || {}).reduce((s, c) => s + (c.request || []).reduce((a, l) => a + (Number(l.qty) || 0), 0), 0)
}

// Thực đơn có món nấu bằng bếp gas (bước Canh lửa, trừ phin cà phê).
function menuUsesGas(state, ctx) {
  const R = D(ctx).RECIPES || {}
  return orderableRecipes(state, ctx).some(id => (R[id] && R[id].steps || []).some(st => st.type === 'lua' && st.skin !== 'phin'))
}

// Giá bán và giá vốn món của tình huống (nếu có).
function genericItem(ctx, sh, d) {
  const r = d.recipeId ? recipeOf(ctx, d.recipeId) : null
  const qty = Math.max(1, Math.round(Number(d.qty) || 1))
  return { r, qty, price: r ? unitPriceOf(r, []) * qty : 0, cost: r ? itemCost(ctx, sh, d.recipeId, qty) : 0 }
}

// Giá vốn của một kết quả: bán món (sale) hoặc cogs 'mon' → giá vốn món của tình huống (1 lần); cogs là số → cộng thêm.
function outcomeCogs(o, item) {
  let v = o.sale || o.cogs === 'mon' ? item.cost : 0
  if (typeof o.cogs === 'number') v += roundCost(o.cogs)
  return v
}

// Tiền của một kết quả (theo chi tiết đã chốt, hoặc ước tính lúc bốc khi sold = null): { sale, gain, fine, spend, cogs }.
function outcomeMoney(o, item, sold) {
  let gain = 0
  if (typeof o.money === 'number') gain = o.money
  else if (o.money && typeof o.money === 'object') {
    const max = Number(o.money.max) || 0
    gain = sold === null ? max : Math.min(max, (Number(o.money.perSold) || 0) * sold)
  }
  return { sale: o.sale ? item.price : 0, gain: Math.max(0, gain), fine: Math.max(0, Number(o.fine) || 0),
    spend: Math.max(0, Number(o.spend) || 0), cogs: outcomeCogs(o, item) }
}

// Trần tự tính của một tình huống 'chung': lớn nhất trên mọi kết quả của mọi lựa chọn.
//   maxLoss = tiền mất + tiền chi + giá vốn − tiền bán − tiền thưởng; maxGain = tiền thưởng; maxFine = tiền mất.
export function genericMax(ctx, sh, d) {
  const item = genericItem(ctx, sh, d)
  let loss = 0, gain = 0, fine = 0
  for (const c of d.choices || []) {
    for (const o of c.outcomes || []) {
      const m = outcomeMoney(o, item, null)
      loss = Math.max(loss, m.fine + m.spend + m.cogs - m.sale - m.gain)
      gain = Math.max(gain, m.gain)
      fine = Math.max(fine, m.fine)
    }
  }
  return { maxLoss: Math.max(0, loss), maxGain: gain, maxFine: fine }
}

// Kỳ vọng tiền (đồng) của một lựa chọn: Σ p × (tiền bán + tiền thưởng − tiền mất − tiền chi − giá vốn). `sold`: số
// phần đã bán (null → lấy mức tối đa của tiền theo phần).
export function choiceExpectedMoney(ctx, sh, d, choiceId, sold = null) {
  const c = (d.choices || []).find(x => x.id === choiceId)
  if (!c) return 0
  const item = genericItem(ctx, sh, d)
  return (c.outcomes || []).reduce((s, o) => {
    const m = outcomeMoney(o, item, sold)
    return s + (Number(o.p) || 0) * (m.sale + m.gain - m.fine - m.spend - m.cogs)
  }, 0)
}

// Kết quả của lựa chọn theo số bốc u ∈ [0, 1): p cộng dồn (kết quả cuối nhận phần dư làm tròn).
function outcomeFor(c, u) {
  const list = c.outcomes || []
  let acc = 0
  for (const o of list) {
    acc += Number(o.p) || 0
    if (u < acc) return o
  }
  return list[list.length - 1] || {}
}

// Tình huống có quà hàng hiếm (kết quả có rare mà không phải tự bỏ tiền mua) / có hàng hiếm tự bỏ tiền mua.
function rareGift(d) {
  return (d.choices || []).some(c => (c.outcomes || []).some(o => Number(o.rare) > 0 && !(Number(o.spend) > 0)))
}
function rareBought(d) {
  return (d.choices || []).some(c => (c.outcomes || []).some(o => Number(o.rare) > 0 && Number(o.spend) > 0))
}

// Còn nhận được quà hàng hiếm hôm nay (trần phần mỗi ngày thật của ca, rare.rareDayRoom; hàng tự mua không tính trần).
function giftRoomToday(state, sh, ctx) {
  return rareDayRoom(state, ctx, typeof sh.dayKey === 'string' ? sh.dayKey : '').portions > 0
}

// Điều kiện "kho còn chỗ" (needs.stockRoom): có nguyên liệu hiếm còn chỗ chứa; tình huống chỉ có quà (không mua) còn cần
// mức hàng hiếm hôm nay chưa đủ — đã đủ thì không hứa tặng hàng rồi lại đổi thành Muỗng Vàng.
function stockRoomOk(state, sh, ctx, d) {
  if (!rareIngredientIds(ctx).some(id => rareRoom(state, id, ctx) > 0)) return false
  if (rareGift(d) && !rareBought(d) && !giftRoomToday(state, sh, ctx)) return false
  return true
}

// Tên nguyên liệu hiếm ('' nếu không có).
function rareName(ctx, id) {
  const g = id && (D(ctx).INGREDIENTS || {})[id]
  return g ? g.name : ''
}

const GENERIC = {
  planOk(state, sh, ctx, d) {
    if (d.recipeId && !recipeOf(ctx, d.recipeId)) return false
    const n = d.needs || {}
    if (n.qr && sh.day < cfg(ctx, 'qrFromDay')) return false
    if (n.lua && !menuUsesGas(state, ctx)) return false
    if (n.soldPortions && plannedPortions(sh) < Number(n.soldPortions)) return false
    if (n.ownsRare && !ownsRareRecipe(state, ctx)) return false
    if (n.stockRoom && !stockRoomOk(state, sh, ctx, d)) return false
    return true
  },
  maxLoss: (state, sh, ctx, d) => genericMax(ctx, sh, d).maxLoss,
  maxGain: (state, sh, ctx, d) => genericMax(ctx, sh, d).maxGain,
  maxFine: (state, sh, ctx, d) => genericMax(ctx, sh, d).maxFine,
  due(state, sh, ctx, d) {
    const n = d.needs || {}
    if (n.soldPortions && soldPortions(sh) < Number(n.soldPortions)) return false
    // kho / mức hàng hiếm hôm nay có thể đã đủ từ lúc mở ca (vd tình huống trước trong ca đã tặng hàng)
    if (n.stockRoom && !stockRoomOk(state, sh, ctx, d)) return false
    return true
  },
  // chốt chi tiết: ai, món, giá, số bốc kết quả (dùng chung cho mọi lựa chọn), nguyên liệu hiếm (nếu cần)
  // (who: chuỗi tên, hoặc {name, gender, persona, self} để hình minh họa và cách tự xưng {self} khớp người được chọn)
  detail(state, sh, ctx, d, inc) {
    const item = genericItem(ctx, sh, d)
    const w = pick(inc, d.who && d.who.length ? d.who : ['Khách']) || 'Khách'
    const who = typeof w === 'string' ? w : String(w.name || 'Khách')
    const roll = nextFloat(inc)
    // quà hàng hiếm chỉ khi còn mức hôm nay (hết mức thì lựa chọn dùng chữ costNoRare/resultNoRare, không hứa tặng hàng)
    const needRare = (d.choices || []).some(c => (c.outcomes || []).some(o => o.rare))
    const giftOnly = rareGift(d) && !rareBought(d)
    const rareId = needRare && (!giftOnly || giftRoomToday(state, sh, ctx)) ? pickRareFor(state, inc, ctx, 1) : null
    return { who, recipeId: d.recipeId || null, qty: item.qty, price: item.price, cost: item.cost, roll, rareId,
      sold: soldPortions(sh), bill: Number(d.bill) || 0,
      ...(w && typeof w === 'object' && w.gender ? { gender: w.gender } : {}),
      ...(w && typeof w === 'object' && w.persona ? { persona: w.persona } : {}),
      ...(w && typeof w === 'object' && w.self ? { self: String(w.self) } : {}) }
  },
  valid: () => true,
  vars(state, sh, ctx, d, det) {
    const r = det.recipeId ? recipeOf(ctx, det.recipeId) : null
    const sold = Number(det.sold) || 0
    const sell = (d.choices || []).flatMap(c => c.outcomes || []).find(o => o.money && typeof o.money === 'object')
    const sellAmount = sell ? Math.min(Number(sell.money.max) || 0, (Number(sell.money.perSold) || 0) * sold) : 0
    return { who: det.who, mon: lowerFirst(r ? r.name : ''), qty: det.qty, price: formatVND(det.price), amount: formatVND(det.price),
      cost: formatVND(det.cost), change: formatVND(Math.max(0, (Number(det.bill) || 0) - det.price)), qrDay: cfg(ctx, 'qrFromDay'),
      sold, sellAmount: formatVND(sellAmount), rare: lowerFirst(rareName(ctx, det.rareId)) || 'hàng hiếm',
      rarePrice: formatVND(Number(d.rarePrice) || 0), self: det.self || 'tôi' }
  },
  costTpl: (state, sh, ctx, d, det, c) => (c.costNoRare && !det.rareId ? c.costNoRare : c.cost),
  available(state, sh, ctx, d, det, c) {
    if (c.needs === 'qr') return sh.day >= cfg(ctx, 'qrFromDay')
    if (c.needs && typeof c.needs === 'object' && Number(c.needs.room) > 0) return !!det.rareId && rareRoom(state, det.rareId, ctx) >= Number(c.needs.room)
    return true
  },
  apply(state, sh, ctx, d, det, c, inc) {
    const out = { money: 0, cost: 0, refund: 0, rep: 0, bonus: 0, debt: null, starLoss: 0,
      gain: 0, fine: 0, spend: 0, spared: 0, capped: 0, rare: [], fragment: null, waitMul: 1, text: '' }
    const o = outcomeFor(c, Number(det.roll) || 0)
    const item = { price: det.price, cost: det.cost }
    const L = sh.ledger
    const vars = GENERIC.vars(state, sh, ctx, d, det)
    const note = { id: d.id, name: d.name, source: 'incident' }
    // bán món của tình huống (tiền mặt vào két đúng số, hoặc chuyển khoản), có giá vốn
    if (o.sale && item.price > 0) {
      if (o.sale === 'qr') { sh.qrBalance += item.price; L.qr += item.price } else {
        const bills = composeGreedy(item.price)
        if (bills) addBills(sh.drawer, bills, 1)
        L.cash += item.price
      }
      L.sales += item.price
      L.listValue += item.price
      out.money = item.price
    }
    // giá vốn (món bán ra, ly mời khách, món giao mà không thu được tiền)
    const cogs = outcomeCogs(o, item)
    if (cogs > 0) { out.cost += cogs; spendCost(state, sh, cogs) }
    // tiền thưởng (trần gainCap của tình huống và trần ngày thật)
    const want = outcomeMoney(o, { price: 0, cost: 0 }, Number(det.sold) || 0).gain
    if (want > 0) {
      const r = eventMoneyIn(state, want, { ...note, text: '' }, ctx, { cap: Number.isFinite(inc.gainCap) ? inc.gainCap : Infinity })
      out.gain = r.amount
      out.capped = r.capped
    }
    // tiền mất (có trần ngày thật: vượt thì Dì Sáu đỡ giùm) và tiền tự chi mua (chỉ trần của tình huống)
    const capLoss = Number.isFinite(inc.cap) ? inc.cap : Infinity
    if (Number(o.fine) > 0) {
      const r = eventMoneyOut(state, Number(o.fine), { ...note, text: '' }, ctx, { cap: capLoss, fine: true })
      out.fine = r.amount
      out.spared += r.spared
    }
    if (Number(o.spend) > 0) {
      const r = eventMoneyOut(state, Number(o.spend), { ...note, text: '' }, ctx, { cap: capLoss, fine: false })
      out.spend = r.amount
      out.spared += r.spared
    }
    // danh tiếng
    const rep = Math.max(0, Math.round(Number(o.rep) || 0))
    if (rep) { out.rep = rep; sh.reputationGain = (sh.reputationGain || 0) + rep }
    // hàng hiếm và mảnh công thức (chưa có dữ liệu hàng hiếm thì bỏ qua, dùng câu kết quả resultNoRare). Quà tặng tính
    // vào trần hàng hiếm mỗi ngày thật (dư đổi Muỗng Vàng); hàng tự bỏ tiền mua (spend) thì không tính trần ngày.
    let rareMissed = false
    const dayKey = typeof sh.dayKey === 'string' ? sh.dayKey : ''
    if (Number(o.rare) > 0) {
      const g = det.rareId ? grantRare(state, det.rareId, Number(o.rare), ctx, { bought: Number(o.spend) > 0, dayKey, source: 'tinh_huong' }) : null
      if (g && g.got > 0) out.rare.push({ id: det.rareId, name: rareName(ctx, det.rareId), n: g.got })
      if (g && g.spoons > 0) out.spoons = (out.spoons || 0) + g.spoons
      if (!g || (g.got <= 0 && g.spoons <= 0)) rareMissed = true
    }
    if (Number(o.fragment) > 0) {
      const f = grantFragment(state, Number(o.fragment), ctx, { dayKey, source: 'tinh_huong' })
      if (f && f.n > 0) out.fragment = { recipeId: f.recipeId, n: f.n, name: (recipeOf(ctx, f.recipeId) || {}).name || f.recipeId }
      if (f && f.spoons > 0) out.spoons = (out.spoons || 0) + f.spoons
    }
    // bếp chậm hơn tới cuối ca: ngân sách chờ món của các phiếu sau
    if (Number(o.waitMul) > 0 && Number(o.waitMul) !== 1) {
      sh.waitBudgetMul = Math.round((Number(sh.waitBudgetMul) || 1) * Number(o.waitMul) * 100) / 100
      out.waitMul = Number(o.waitMul)
    }
    // quà hàng hiếm không vào kho được phần nào (kho đầy hoặc đã đủ mức hôm nay) → câu không nói "cất vào kho"
    const rareGot = out.rare.reduce((a, x) => a + (Number(x.n) || 0), 0)
    const noRareText = (rareMissed || (Number(o.rare) > 0 && rareGot <= 0)) && o.resultNoRare
    out.text = fill(noRareText ? o.resultNoRare : (o.result || c.result || ''), vars)
    if (out.spared > 0) out.text += ' Dì Sáu đỡ giùm con phần vượt mức hôm nay.'
    if (out.spoons > 0) out.text += ' ' + overflowText(rareGot, out.spoons)
    return out
  }
}

// Bộ xử lý của một tình huống: loại 'chung' cho tình huống chạy theo dữ liệu, còn lại theo id.
function kindOf(d) {
  if (!d) return null
  return d.generic ? GENERIC : (KINDS[d.id] || null)
}

const KINDS = {
  khach_mo_hang: {
    planOk: (state, sh, ctx, d) => !!recipeOf(ctx, d.recipeId),
    maxLoss: (state, sh, ctx, d) => itemCost(ctx, sh, d.recipeId, d.qty || 1),
    // trước khách đầu tiên: chưa kẹp phiếu nào, chưa bán được đồng nào
    due: (state, sh) => clipsOf(sh) === 0 && !(sh.ledger && sh.ledger.sales > 0),
    detail(state, sh, ctx, d, inc) {
      const r = recipeOf(ctx, d.recipeId)
      const qty = d.qty || 1
      const price = unitPriceOf(r, []) * qty
      return { who: pick(inc, d.who || ['Khách']) || 'Khách', recipeId: d.recipeId, qty, price,
        cost: itemCost(ctx, sh, d.recipeId, qty), bill: d.bill || 500000, change: (d.bill || 500000) - price }
    },
    valid: (state, sh, ctx, d, det) => KINDS.khach_mo_hang.due(state, sh),
    vars(state, sh, ctx, d, det) {
      const r = recipeOf(ctx, det.recipeId)
      const tang = (d.choices || []).find(c => c.bonusCustomers) || {}
      return { who: det.who, mon: lowerFirst(r ? r.name : ''), qty: det.qty, price: formatVND(det.price), cost: formatVND(det.cost),
        change: formatVND(det.change), drawer: formatVND(drawerTotal(sh.drawer)), qrDay: cfg(ctx, 'qrFromDay'),
        cap: MAX_CUSTOMERS, rep: Number(tang.bonusRep) || 0 }
    },
    // ca sau đã đủ trần khách (từ ngày 9, hoặc sao trung bình cao): khách thêm không vào được → lựa chọn ghi rõ
    // và đổi hiệu ứng thành danh tiếng (lựa chọn an toàn không thành "mất tiền mà không được gì")
    costTpl: (state, sh, ctx, d, det, c) => (c.bonusCustomers && c.costFull && nextShiftFull(state, sh, ctx) ? c.costFull : c.cost),
    available(state, sh, ctx, d, det, c) {
      if (c.needs === 'change') return canMakeChange(det.change, sh.drawer)
      if (c.needs === 'qr') return sh.day >= cfg(ctx, 'qrFromDay')
      return true
    },
    apply(state, sh, ctx, d, det, c) {
      const L = sh.ledger
      const out = { money: 0, cost: det.cost, refund: 0, rep: 0, bonus: 0, debt: null, starLoss: 0 }
      if (c.id === 'thoi_het') {
        const best = minBillsChange(det.change, sh.drawer)
        addBills(sh.drawer, { [det.bill]: 1 }, 1)
        addBills(sh.drawer, best.bills, -1)
        L.cash += det.price
        L.sales += det.price
        L.listValue += det.price
        out.money = det.price
      } else if (c.id === 'moi_qr') {
        sh.qrBalance += det.price
        L.qr += det.price
        L.sales += det.price
        L.listValue += det.price
        out.money = det.price
      } else if (c.bonusCustomers) {
        const rep = Math.max(0, Math.round(Number(c.bonusRep) || 0))
        if (nextShiftFull(state, sh, ctx)) {
          // ca sau đã đủ khách: +danh tiếng ngay thay cho khách thêm
          out.rep = rep
          sh.reputationGain = (sh.reputationGain || 0) + rep
        } else {
          // rep: nếu tới ca sau vẫn đủ khách (vd Chợ phiên) thì startShift đổi khách thêm thành danh tiếng
          ensureIncidents(state).bonus = { day: sh.day + 1, customers: c.bonusCustomers, rep }
          out.bonus = c.bonusCustomers
        }
      }
      spendCost(state, sh, det.cost)
      return out
    }
  },

  ghi_no: {
    planOk: (state, sh, ctx, d) => !!recipeOf(ctx, d.recipeId) && Object.keys(D(ctx).REGULARS || {}).length > 0,
    maxLoss: (state, sh, ctx, d) => itemCost(ctx, sh, d.recipeId, d.qty || 1),
    due: () => true,
    detail(state, sh, ctx, d, inc) {
      const RG = D(ctx).REGULARS || {}
      const here = new Set(Object.values(sh.customers || {}).map(c => c.regularId).filter(Boolean))
      const ids = Object.keys(RG)
      const free = ids.filter(id => !here.has(id))
      const regularId = pick(inc, free.length ? free : ids)
      const qty = d.qty || 1
      return { regularId, who: (RG[regularId] && RG[regularId].name) || 'Khách quen', recipeId: d.recipeId, qty,
        amount: d.amount || 20000, cost: itemCost(ctx, sh, d.recipeId, qty) }
    },
    valid: () => true,
    vars(state, sh, ctx, d, det) {
      const r = recipeOf(ctx, det.recipeId)
      return { who: det.who, mon: lowerFirst(r ? r.name : ''), qty: det.qty, amount: formatVND(det.amount), cost: formatVND(det.cost) }
    },
    available: () => true,
    apply(state, sh, ctx, d, det, c, inc) {
      const out = { money: 0, cost: 0, refund: 0, rep: 0, bonus: 0, debt: null, starLoss: 0 }
      if (c.id === 'tu_choi') return out
      out.cost = det.cost
      spendCost(state, sh, det.cost)
      out.rep = Number(c.rep) || 0
      sh.reputationGain = (sh.reputationGain || 0) + out.rep
      if (c.id === 'cho_no') {
        const within = d.repayWithin || 3
        const willRepay = chance(inc, d.repayRate ?? 0.7)
        const repayDay = willRepay ? sh.day + nextInt(inc, 1, within) : null
        const S = ensureIncidents(state)
        const debt = { id: `no:${sh.day}:${det.regularId}`, regularId: det.regularId, name: det.who, amount: det.amount,
          fromDay: sh.day, dueDay: sh.day + within, repayDay, status: 'cho' }
        S.debts.push(debt)
        // chỉ giữ 20 mục gần nhất (nợ đang chờ luôn được giữ)
        while (S.debts.length > 20) {
          const k = S.debts.findIndex(x => x.status !== 'cho')
          if (k < 0) break
          S.debts.splice(k, 1)
        }
        out.debt = { name: det.who, amount: det.amount }
      }
      return out
    }
  },

  doi_y: {
    planOk: (state, sh, ctx) => orderableRecipes(state, ctx).length >= 2,
    maxLoss: () => 0,
    due: (state, sh, ctx) => !!doiYTarget(state, sh, ctx),
    detail(state, sh, ctx, d, inc) {
      const tg = doiYTarget(state, sh, ctx)
      if (!tg) return null
      const R = D(ctx).RECIPES || {}
      const t = tg.ticket, c = tg.customer
      const line = t.lines[tg.lineIndex]
      const to = pick(inc, tg.alts)
      const fromUnit = unitPriceOf(R[line.recipeId], line.notes)
      const toUnit = unitPriceOf(R[to], [])
      return { customerId: c.id, who: c.name, ticketId: t.id, no: t.no, lineIndex: tg.lineIndex, requestIndex: tg.requestIndex,
        fromId: line.recipeId, toId: to, qty: line.qty, notes: (line.notes || []).slice(), fromUnit, toUnit,
        diff: (toUnit - fromUnit) * line.qty, method: c.payMethod }
    },
    // chi tiết đã chốt còn dùng được: phiếu vẫn chờ bếp, dòng chưa đổi
    valid(state, sh, ctx, d, det) {
      const t = (sh.tickets || []).find(x => x.id === det.ticketId)
      const c = sh.customers[det.customerId]
      const line = t && t.lines[det.lineIndex]
      return !!(t && c && line && t.status === 'cho' && (t.done || []).every(x => !x) && line.recipeId === det.fromId &&
        !(sh.cook && sh.cook.ticketId === t.id) && c.status === 'cho_mon')
    },
    vars(state, sh, ctx, d, det) {
      const R = D(ctx).RECIPES || {}
      const X = formatVND(Math.abs(det.diff))
      return {
        who: det.who, qty: det.qty, no: det.no,
        from: lowerFirst(R[det.fromId] ? R[det.fromId].name : det.fromId) + ` (${formatVND(det.fromUnit * det.qty)})`,
        to: lowerFirst(R[det.toId] ? R[det.toId].name : det.toId) + ` (${formatVND(det.toUnit * det.qty)})`,
        diff: X,
        diffAction: det.diff > 0 ? `thu thêm ${X}` : det.diff < 0 ? `hoàn lại ${X}` : 'không chênh giá',
        diffDone: det.diff > 0 ? `thu thêm ${X}` : det.diff < 0 ? `hoàn lại ${X} cho khách` : 'không phải thu thêm'
      }
    },
    available: () => true,
    apply(state, sh, ctx, d, det, c, inc) {
      const out = { money: 0, cost: 0, refund: 0, rep: 0, bonus: 0, debt: null, starLoss: 0 }
      const cust = sh.customers[det.customerId]
      if (c.id !== 'doi_mon') {
        if (chance(inc, d.starLossRate ?? 0.5)) {
          cust.penalties = cust.penalties || []
          cust.penalties.push({ code: 'tu_choi_doi_mon', stars: 1, source: 'tinh_huong' })
          out.starLoss = 1
        }
        return out
      }
      const R = D(ctx).RECIPES || {}
      const L = sh.ledger
      const t = sh.tickets.find(x => x.id === det.ticketId)
      const newLine = { recipeId: det.toId, qty: det.qty, notes: [] }
      t.lines[det.lineIndex] = { ...newLine, notes: [] }
      // dòng đã sang món khác: lần chọn nhầm của món cũ (ghi lúc bỏ món, kitchen ticket.chonMistakes) không mang sang
      // (cả phiếu về 0 thì bỏ trường, như khi chốt bước Chọn)
      clearLineMistakes(t, det.lineIndex)
      // yêu cầu thật đổi theo (khách đã đổi ý): món làm ra so với món mới
      const j = (cust.request || []).findIndex(l => lineKey(l) === lineKey({ recipeId: det.fromId, notes: det.notes }) && Number(l.qty) === Number(det.qty))
      if (j >= 0) cust.request[j] = { ...newLine, notes: [] }
      const r = R[det.toId]
      for (const rc of receiptsOf(sh, cust, t)) {
        if (rc.lines && rc.lines[det.lineIndex]) {
          rc.lines[det.lineIndex] = { recipeId: det.toId, name: r ? r.name : det.toId, qty: det.qty, notes: [], unitPrice: det.toUnit, amount: det.toUnit * det.qty }
        }
        rc.total = (Number(rc.total) || 0) + det.diff
        rc.listTotal = (Number(rc.listTotal) || 0) + det.diff
      }
      if (det.diff > 0) {
        if (cust.payMethod === 'cash') {
          const bills = composeGreedy(det.diff)
          if (bills) addBills(sh.drawer, bills, 1)
          L.cash += det.diff
        } else {
          sh.qrBalance += det.diff
          L.qr += det.diff
        }
        L.sales += det.diff
        out.money = det.diff
      } else if (det.diff < 0) {
        L.refunds += -det.diff
        out.refund = -det.diff
      }
      L.listValue += det.diff
      cust.waitBudget = waitBudgetFor(sh, t.lines, R, ctx)
      return out
    }
  },

  // M4: loại dùng chung cho tình huống chạy theo dữ liệu (generic: true)
  chung: GENERIC
}

// ---------- Bốc tình huống cho ca ----------

// Chọn loại: không lặp `noRepeat` loại gần nhất nếu còn loại khác; hết loại mới thì lấy loại lâu chưa gặp nhất.
function chooseKind(holder, cands, recent, noRepeat) {
  const windowIds = recent.slice(-noRepeat)
  const fresh = cands.filter(d => !windowIds.includes(d.id))
  if (fresh.length) {
    const p = weightedPick(holder, fresh.map(d => ({ id: d.id, w: d.w ?? 1 })))
    return fresh.find(d => d.id === p.id)
  }
  const last = id => recent.lastIndexOf(id)
  const min = Math.min(...cands.map(d => last(d.id)))
  const oldest = cands.filter(d => last(d.id) === min)
  const p = weightedPick(holder, oldest.map(d => ({ id: d.id, w: d.w ?? 1 })))
  return oldest.find(d => d.id === p.id)
}

// Tiền tối đa của một loại (thiệt hại, tiền thưởng, tiền phạt): hàm riêng của loại (KINDS) hoặc số khai báo trong dữ liệu.
function kindMax(key, state, sh, ctx, d) {
  const K = kindOf(d)
  if (K && typeof K[key] === 'function') return Number(K[key](state, sh, ctx, d)) || 0
  return Math.max(0, Number(d[key]) || 0)
}

// Sự kiện ngày của ngày game `day` là loại xấu (ngày đã chốt thì theo sự kiện đã chốt).
function dayEventBad(state, day, ctx) {
  const DE = D(ctx).DAY_EVENTS
  const id = DE ? rollDayEvent(state, day, ctx) : null
  return !!(id && DE[id] && dayEventKind(DE[id]) === 'xau')
}

// Các loại bốc được cho ca này (chưa tính không lặp): có trong KINDS, điều kiện riêng (planOk), không vượt trần thiệt hại
// và trần tiền thưởng; mức chỉ-loại-tốt (Ít) chỉ loại tốt; loại xấu từ badFromDay, không khi luật nhịp chặn (tình huống
// trước là loại xấu hoặc lỗ nặng → chỉ loại tốt hoặc loại chọn không có phạt; ngày có sự kiện ngày loại xấu).
// M4 (soát lỗi): luật "không 2 sự kiện xấu liền nhau" xét trên dòng thời gian CHUNG của sự kiện ngày và tình huống:
//   - sự kiện ngay trước tình huống đầu ca (state.incidents.lastEvent: sự kiện ngày của ca này, hoặc sự kiện cuối của
//     các ca trước khi ca này không có sự kiện ngày) là loại xấu → không bốc loại xấu;
//   - sự kiện ngày của NGÀY MAI (đã chốt lúc mở ca, xem events.announceDayEvent) là loại xấu → ca này không bốc loại xấu
//     (tình huống cuối ca đứng ngay trước sự kiện ngày mai).
export function incidentCandidates(state, sh, ctx, caps = null) {
  const C = incidentConfig(ctx)
  const DEF = defs(ctx)
  if (!DEF || !sh) return []
  const S = ensureIncidents(state)
  const freq = incidentFrequency(state)
  const cap = caps ? caps.cap : incidentLossCap(state, sh, ctx)
  const gainCap = caps ? caps.gainCap : incidentGainCap(state, sh, ctx)
  const goodOnly = (C.goodOnly || []).includes(freq)
  const calm = S.lastKind === 'xau' || (Number(S.lastLoss) || 0) >= (C.calmAfterLoss ?? 0.5)
  const dayDef = sh.mods && sh.mods.dayEvent && D(ctx).DAY_EVENTS ? D(ctx).DAY_EVENTS[sh.mods.dayEvent.id] : null
  const dayBad = !!(dayDef && dayDef.kind === 'xau')
  const prevBad = S.lastEvent === 'xau'
  const nextBad = dayEventBad(state, sh.day + 1, ctx)
  return Object.values(DEF).filter(d => {
    if (!d || !kindOf(d)) return false
    if ((Number(d.fromDay) || 0) > sh.day) return false
    const kind = incidentKind(d)
    if (goodOnly && kind !== 'tot') return false
    if (kind === 'xau' && (sh.day < (C.badFromDay ?? 1) || dayBad || calm || prevBad || nextBad)) return false
    if (calm && kind === 'chon' && kindMax('maxFine', state, sh, ctx, d) > 0) return false
    if (!kindOf(d).planOk(state, sh, ctx, d)) return false
    if (kindMax('maxLoss', state, sh, ctx, d) > cap) return false
    if (kindMax('maxGain', state, sh, ctx, d) > gainCap) return false
    return true
  })
}

// Gọi trong startShift SAU khi đã có danh sách khách. Trả mảng kế hoạch (0..maxPerShift, theo thứ tự xuất hiện):
//   lần 1: có khi số bốc < chance[mức] hoặc bảo hiểm (since ≥ guaranteeAfter[mức]);
//   lần 2: đã có lần 1, mức cho phép 2, ca có từ secondMinCustomers khách, số bốc < secondChance[mức]; khác loại lần 1,
//     không phải tình huống đầu ca, không có 2 loại xấu trong ca;
//   afterClips: lần 1 = 0 nếu là tình huống đầu ca (mở hàng), còn lại trong 1..N−1 (N khách; có lần 2 thì 1..N−1−minGap);
//     lần 2 trong afterClips1 + minGap..N−1.
// Luồng ngẫu nhiên riêng seedFrom(seed, ngày, 'tinh_huong') (lần 2 có luồng riêng cho chi tiết/kết quả).
export function planIncidents(state, sh, ctx) {
  const C = incidentConfig(ctx)
  const DEF = defs(ctx)
  if (!DEF || !sh || sh.day < C.fromDay) return []
  const S = ensureIncidents(state)
  const freq = incidentFrequency(state)
  const holder = { rng: seedFrom(state.seed, sh.day, 'tinh_huong') }
  const roll = nextFloat(holder)
  const guaranteed = S.since >= incidentGuaranteeAfter(state, ctx)
  if (!guaranteed && roll >= perLevel(C.chance, freq, 0)) return []
  const cap = incidentLossCap(state, sh, ctx)
  const gainCap = incidentGainCap(state, sh, ctx)
  const cands = incidentCandidates(state, sh, ctx, { cap, gainCap })
  if (!cands.length) return []
  const d1 = chooseKind(holder, cands, S.recent, C.noRepeat)
  const n = Object.keys(sh.customers || {}).length
  const gap = Math.max(1, Math.round(Number(C.minGap) || 2))
  // lần 2
  let d2 = null
  const roll2 = nextFloat(holder)
  const maxN = perLevel(C.maxPerShift, freq, 1)
  if (maxN >= 2 && n >= (C.secondMinCustomers ?? 6) && roll2 < perLevel(C.secondChance, freq, 0)) {
    const bad1 = incidentKind(d1) === 'xau'
    const cands2 = cands.filter(d => d.id !== d1.id && d.when !== 'mo_hang' && !(bad1 && incidentKind(d) === 'xau'))
    const lo = d1.when === 'mo_hang' ? 0 : 1
    if (cands2.length && lo + gap <= n - 1) d2 = chooseKind(holder, cands2, [...S.recent, d1.id], C.noRepeat)
  }
  const a1 = d1.when === 'mo_hang' ? 0 : nextInt(holder, 1, Math.max(1, d2 ? n - 1 - gap : n - 1))
  const plan = (d, afterClips, rng, order) => ({ id: d.id, kind: incidentKind(d), order, afterClips, status: 'cho', rng, cap, gainCap,
    guaranteed: order === 1 && guaranteed, detail: null, choice: null, result: null, ...(d.when === 'mo_hang' ? { opening: true } : {}) })
  const out = [plan(d1, a1, 0, 1)]
  if (d2) {
    const a2 = nextInt(holder, a1 + gap, Math.max(a1 + gap, n - 1))
    out.push(plan(d2, a2, seedFrom(state.seed, sh.day, 'tinh_huong', 2), 2))
  }
  out[0].rng = holder.rng
  return out
}

// Tình huống thứ nhất của ca (tương thích M3: planIncident trả 1 kế hoạch hoặc null; startShift dùng planIncidents).
export function planIncident(state, sh, ctx) {
  return planIncidents(state, sh, ctx)[0] || null
}

// Ca sau (theo ngày game) đã đủ trần khách, không nhận thêm khách được (chưa tính sự kiện ngày của ca sau).
export function nextShiftFull(state, sh, ctx) {
  return customerCount(state, ctx, ((sh && sh.day) || state.day) + 1) >= MAX_CUSTOMERS
}

// Khách thêm của ca `day` nhờ tình huống ca trước (ly trà "mở hàng"): { customers, rep } (rep = danh tiếng thay thế khi
// ca đó đã đủ khách). Dùng xong thì bỏ.
export function takeIncidentBonusInfo(state, day) {
  const S = state.incidents
  const none = { customers: 0, rep: 0 }
  if (!S || !S.bonus) return none
  const b = S.bonus
  if (b.day < day) { S.bonus = null; return none }
  if (b.day !== day) return none
  S.bonus = null
  return { customers: Math.max(0, Math.round(Number(b.customers) || 0)), rep: Math.max(0, Math.round(Number(b.rep) || 0)) }
}

// Số khách thêm của ca `day` (dùng xong thì bỏ; xem takeIncidentBonusInfo).
export function takeIncidentBonus(state, day) {
  return takeIncidentBonusInfo(state, day).customers
}

// Khách thêm dự kiến cho ca `day` (không dùng, để màn Chuẩn bị/Tổng kết dự báo).
export function incidentBonusFor(state, day) {
  const b = state.incidents && state.incidents.bonus
  return b && b.day === day ? Math.max(0, Math.round(Number(b.customers) || 0)) : 0
}

// Đầu ca: khách quen trả nợ tới hạn (tiền vào sh.debtIn, tính vào lãi ca), nợ quá hạn không trả thì ghi nhận.
export function collectDebts(state, sh, ctx) {
  const S = ensureIncidents(state)
  const def = (defs(ctx) || {}).ghi_no || {}
  sh.debtIn = sh.debtIn || 0
  sh.debtNotes = sh.debtNotes || []
  for (const d of S.debts) {
    if (d.status !== 'cho') continue
    if (d.repayDay && d.repayDay <= sh.day) {
      d.status = 'da_tra'
      d.paidDay = sh.day
      sh.debtIn += d.amount
      sh.debtNotes.push({ kind: 'tra', name: d.name, amount: d.amount, text: fill(def.repaid || '{who} trả {amount}.', { who: d.name, amount: formatVND(d.amount) }) })
    } else if (!d.repayDay && sh.day > d.dueDay) {
      d.status = 'quen'
      sh.debtNotes.push({ kind: 'quen', name: d.name, amount: d.amount, text: fill(def.unpaid || '{who} chưa trả {amount}.', { who: d.name, amount: formatVND(d.amount) }) })
    }
  }
  return sh.debtNotes
}

// Nợ khách quen còn chờ trả (cho màn Chuẩn bị).
export function pendingDebts(state) {
  return ((state.incidents && state.incidents.debts) || []).filter(d => d.status === 'cho')
}

// ---------- Trong ca ----------

// Đã tới lúc bật tình huống chưa: ca có tình huống chờ, quầy trống (giữa hai khách), không đang chơi mini-game,
// đã đủ số khách xong khâu quầy, điều kiện riêng của loại đó (vd khách đổi ý cần một phiếu vừa kẹp còn chờ bếp).
// Giao diện chỉ hỏi khi đang ở tab Quầy và không có hộp thoại khác.
// M4: tình huống thứ hai chỉ bật khi tình huống trước đã xử lý và đã thêm ít nhất `minGap` khách xong quầy từ lúc đó.
export function incidentDue(state, ctx) {
  const sh = state && state.shift
  const inc = activeIncident(sh)
  if (!inc || inc.status !== 'cho' || sh.paused || sh.tasting) return false
  if (sh.counter) return false
  if (miniGameBusy(sh)) return false
  if (clipsOf(sh) < (inc.afterClips || 0)) return false
  const prev = previousIncident(sh, inc)
  if (prev) {
    const gap = Math.max(1, Math.round(Number(incidentConfig(ctx).minGap) || 2))
    const at = Number.isFinite(prev.atClips) ? prev.atClips : (prev.afterClips || 0)
    if (clipsOf(sh) < at + gap) return false
  }
  const d = (defs(ctx) || {})[inc.id]
  const K = kindOf(d)
  if (!K || !d) return false
  return !!K.due(state, sh, ctx, d)
}

// Nội dung hộp thoại của tình huống đang mở (chi tiết đã chốt); không có tình huống đang mở thì tình huống vừa xử lý
// gần nhất. null nếu chưa mở tình huống nào.
export function incidentView(state, ctx) {
  const sh = state && state.shift
  const act = activeIncident(sh)
  const inc = act && act.detail ? act : shiftIncidents(sh).filter(x => x.status === 'xong' && x.detail).pop() || null
  const d = inc && (defs(ctx) || {})[inc.id]
  if (!inc || !d || !inc.detail) return null
  const K = kindOf(d)
  const vars = K.vars(state, sh, ctx, d, inc.detail)
  const choices = (d.choices || []).map(c => {
    const available = inc.status === 'cho' ? !!K.available(state, sh, ctx, d, inc.detail, c) : false
    // M4: lựa chọn "xanh" nhờ hiện vật (vd có Loa báo tiền): ghi thêm lời nhắc
    const hint = c.hint && c.hint.upgrade && state.upgrades && state.upgrades[c.hint.upgrade] ? fill(c.hint.text || '', vars) : ''
    return {
      id: c.id, label: fill(c.label, vars), safe: !!c.safe, available,
      cost: fill(K.costTpl ? K.costTpl(state, sh, ctx, d, inc.detail, c) : c.cost, vars),
      reason: available ? '' : fill(c.blocked || 'Chưa làm được lúc này', vars),
      hint, green: !!hint
    }
  })
  return {
    id: d.id, name: d.name, kind: incidentKind(d), positive: incidentKind(d) === 'tot', when: d.when || 'giua_khach',
    text: fill(d.text, vars), note: d.note ? fill(d.note, vars) : '',
    who: vars.who || '', status: inc.status, choices, safeId: (choices.find(c => c.safe) || {}).id || null, cap: inc.cap,
    // hình minh họa: người được chọn (giới tính, kiểu khách) thay cho hình mặc định của tình huống
    art: d.art ? { ...d.art, ...(inc.detail.persona ? { persona: inc.detail.persona } : {}), ...(inc.detail.gender ? { gender: inc.detail.gender } : {}) } : null,
    generic: !!d.generic,
    detail: { ...inc.detail }
  }
}

// Mở tình huống: chốt chi tiết (ai, món, phiếu) bằng luồng ngẫu nhiên của tình huống. Trả nội dung hộp thoại hoặc null.
export function openIncident(state, ctx) {
  if (!incidentDue(state, ctx)) return null
  const sh = state.shift
  const inc = activeIncident(sh)
  const d = defs(ctx)[inc.id]
  const K = kindOf(d)
  if (!inc.detail || !K.valid(state, sh, ctx, d, inc.detail)) {
    const det = K.detail(state, sh, ctx, d, inc)
    if (!det) return null
    inc.detail = det
  }
  inc.shownAt = sh.t
  return incidentView(state, ctx)
}

// Chọn cách xử lý. → { ok, id, choice, safe, text, effects, tipId } | { ok: false, reason }
// effects = { money (tiền thu vào), cost (giá vốn bỏ ra), refund (tiền hoàn), rep, bonus (khách thêm ca sau),
//             debt {name, amount} | null, starLoss (0/1), loss (thiệt hại, ≤ trần) }
export function resolveIncident(state, choiceId, ctx) {
  const sh = state && state.shift
  const inc = activeIncident(sh)
  if (!inc || inc.status !== 'cho' || !inc.detail) return { ok: false, reason: 'khong_co' }
  const d = (defs(ctx) || {})[inc.id]
  const K = kindOf(d)
  if (!d || !K) return { ok: false, reason: 'khong_co' }
  if (!K.valid(state, sh, ctx, d, inc.detail)) return { ok: false, reason: 'het_han' }
  const c = (d.choices || []).find(x => x.id === choiceId)
  if (!c) return { ok: false, reason: 'khong_co' }
  if (!K.available(state, sh, ctx, d, inc.detail, c)) return { ok: false, reason: 'khong_duoc' }
  const vars = K.vars(state, sh, ctx, d, inc.detail)
  const eff = K.apply(state, sh, ctx, d, inc.detail, c, inc)
  // M4: thiệt hại = giá vốn + tiền mất + tiền chi − tiền bán − tiền thưởng (tình huống cũ chỉ có giá vốn và tiền bán)
  for (const k of ['gain', 'fine', 'spend', 'spared', 'capped']) eff[k] = Number(eff[k]) || 0
  if (!Array.isArray(eff.rare)) eff.rare = []
  if (eff.fragment === undefined) eff.fragment = null
  eff.loss = Math.max(0, eff.cost + eff.fine + eff.spend - eff.money - eff.gain)
  let text = fill(c.bonusCustomers && !eff.bonus && eff.rep > 0 && c.resultFull ? c.resultFull : c.result, vars)
  if (inc.id === 'doi_y' && c.id !== 'doi_mon') text = fill(eff.starLoss ? d.moodBad : d.moodOk, vars)
  if (eff.text) text = eff.text
  delete eff.text
  // thẻ Mẹo nghề liên quan: mở nếu chưa có (theo luật 1 thẻ/ca), giao diện nhắc lại thẻ đó trong kết quả
  let tipId = null
  const tipOn = d.tipOn || (d.tipTrigger ? 'all' : null)
  if (d.tipTrigger && (tipOn === 'all' || (Array.isArray(tipOn) && tipOn.includes(c.id)))) {
    tipId = unlockTip(state, d.tipTrigger, ctx) || null
    if (!tipId) {
      const T = D(ctx).TIPS || []
      const tip = (Array.isArray(T) ? T : Object.values(T)).find(x => x && x.trigger === d.tipTrigger)
      tipId = tip ? tip.id : null
    }
  }
  inc.status = 'xong'
  inc.choice = c.id
  inc.atClips = clipsOf(sh)
  const kind = incidentKind(d)
  inc.result = {
    id: d.id, name: d.name, kind, choice: c.id, label: fill(c.label, vars), safe: !!c.safe, text,
    money: eff.money, cost: eff.cost, refund: eff.refund, rep: eff.rep, bonus: eff.bonus, debt: eff.debt,
    starLoss: eff.starLoss, loss: eff.loss, who: vars.who || '', tipId,
    // M4: tiền thưởng, tiền mất, tiền chi (sổ sự kiện), phần Dì Sáu đỡ / phần thưởng vượt trần, hàng hiếm, mảnh
    gain: eff.gain, fine: eff.fine, spend: eff.spend, spared: eff.spared, capped: eff.capped,
    rare: eff.rare.map(x => ({ ...x })), fragment: eff.fragment ? { ...eff.fragment } : null,
    ...(eff.waitMul && eff.waitMul !== 1 ? { waitMul: eff.waitMul } : {}),
    ...(Number(eff.spoons) > 0 ? { spoons: Number(eff.spoons) } : {})
  }
  const C = incidentConfig(ctx)
  const S = ensureIncidents(state)
  S.since = 0
  S.total += 1
  // M4: luật nhịp cho tình huống kế tiếp (không 2 cái xấu liền nhau; vừa lỗ nặng thì lần sau nhẹ nhàng)
  S.lastKind = kind
  S.lastEvent = kind
  S.lastLoss = inc.cap > 0 ? Math.round(Math.min(1, eff.loss / inc.cap) * 100) / 100 : 0
  S.recent.push(d.id)
  if (S.recent.length > C.recentMax) S.recent.splice(0, S.recent.length - C.recentMax)
  S.log.unshift({ day: sh.day, id: d.id, choice: c.id, money: eff.money, cost: eff.cost, refund: eff.refund, rep: eff.rep,
    ...(eff.gain || eff.fine || eff.spend ? { gain: eff.gain, fine: eff.fine, spend: eff.spend } : {}) })
  if (S.log.length > C.logMax) S.log.length = C.logMax
  emit(ctx, 'incident.resolved', { id: d.id, choice: c.id, day: sh.day, safe: !!c.safe, money: eff.money, cost: eff.cost, rep: eff.rep,
    loss: eff.loss, gain: eff.gain, fine: eff.fine, spend: eff.spend })
  return { ok: true, id: d.id, choice: c.id, safe: !!c.safe, text, effects: eff, tipId }
}

// Cuối ca (endShift): ca từ ngày fromDay không có tình huống nào được xử lý → bảo hiểm +1.
export function finishShiftIncidents(state, ctx) {
  const sh = state.shift
  if (!sh) return
  const C = incidentConfig(ctx)
  if (!defs(ctx) || sh.day < C.fromDay) return
  const S = ensureIncidents(state)
  if (!shiftIncidents(sh).some(x => x.status === 'xong')) S.since += 1
}
