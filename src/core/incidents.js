// Tình huống trong ca (M3): chuyện bất ngờ GIỮA hai khách, người chơi chọn cách xử lý; mỗi lựa chọn ghi rõ cái giá,
// luôn có 1 lựa chọn an toàn, thiệt hại có trần. Dữ liệu: ctx.data.INCIDENTS, ctx.data.INCIDENT_CONFIG
// (src/data/incidents.js). Lõi thuần: ngẫu nhiên theo hạt giống của save + ngày game (tải lại không đổi), không DOM.
//
// Vòng đời trong ca (state.shift.incident):
//   startShift → planIncident: bốc có/không (xác suất theo Cài đặt Nhiều/Vừa/Ít, bảo hiểm 3 ca), bốc loại
//     (không lặp 5 loại gần nhất, loại có lựa chọn lỗ quá trần thì bỏ), bốc lúc xuất hiện (sau khách thứ mấy).
//   Giao diện hỏi incidentDue (quầy trống, không đang chơi mini-game, đủ số khách, điều kiện riêng) khi đang ở tab
//     Quầy → openIncident (chốt chi tiết: ai, món gì, phiếu nào) → hộp thoại chặn thời gian ca (kiên nhẫn tạm dừng)
//     → resolveIncident(lựa chọn) áp hiệu ứng, ghi vào ca, phát 'incident.resolved'.
//   endShift → finishShiftIncidents: cập nhật bảo hiểm (state.incidents.since).
// state.incidents = { since, recent: [id], log: [...], debts: [...], bonus: {day, customers} | null, total }.
import { seedFrom, nextFloat, nextInt, pick, weightedPick, chance } from './rng.js'
import { cfg, emit, unlockTip, refIncomeFor, INCIDENT_FREQUENCIES, defaultIncidents } from './state.js'
import { formatVND, canMakeChange, minBillsChange, addBills, composeGreedy, drawerTotal, roundCost, COST_STEP } from './money.js'
import { orderableRecipes, lineKey, customerCount, MAX_CUSTOMERS } from './customer.js'
import { priceOfLines, unitPriceOf } from './order.js'
import { linesPar } from './kitchen.js'

const DEFAULT_CONFIG = Object.freeze({
  fromDay: 3, chance: { nhieu: 0.5, vua: 0.35, it: 0.15 }, guaranteeAfter: 3, noRepeat: 5,
  lossCap: { revenueShare: 0.1, incomeMul: 0.5 }, logMax: 20, recentMax: 10
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
  return s
}

// Mức tần suất đang chọn trong Cài đặt ('nhieu' | 'vua' | 'it'; sai thì 'vua').
export function incidentFrequency(state) {
  const f = state && state.settings && state.settings.incidentFrequency
  return INCIDENT_FREQUENCIES.includes(f) ? f : 'vua'
}

// Xác suất có tình huống của ca kế tiếp (0 trước ngày fromDay; 1 khi bảo hiểm đã tới).
export function incidentChance(state, ctx, day = state.day) {
  const C = incidentConfig(ctx)
  if (!defs(ctx) || day < C.fromDay) return 0
  if (ensureIncidents(state).since >= C.guaranteeAfter) return 1
  return Number(C.chance[incidentFrequency(state)]) || 0
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
    const alts = menu.filter(id => !present.has(id) && R[id])
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
      cust.waitBudget = cfg(ctx, 'waitBudgetBase') + cfg(ctx, 'waitBudgetParMul') * linesPar(t.lines, R)
      return out
    }
  }
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

// Gọi trong startShift SAU khi đã có danh sách khách. Trả kế hoạch (lưu ở sh.incident) hoặc null.
export function planIncident(state, sh, ctx) {
  const C = incidentConfig(ctx)
  const DEF = defs(ctx)
  if (!DEF || !sh || sh.day < C.fromDay) return null
  const S = ensureIncidents(state)
  const holder = { rng: seedFrom(state.seed, sh.day, 'tinh_huong') }
  const freq = incidentFrequency(state)
  const roll = nextFloat(holder)
  const guaranteed = S.since >= C.guaranteeAfter
  if (!guaranteed && roll >= (Number(C.chance[freq]) || 0)) return null
  const cap = incidentLossCap(state, sh, ctx)
  const cands = Object.values(DEF).filter(d => KINDS[d.id] && (freq !== 'it' || d.positive) &&
    KINDS[d.id].planOk(state, sh, ctx, d) && KINDS[d.id].maxLoss(state, sh, ctx, d) <= cap)
  if (!cands.length) return null
  const d = chooseKind(holder, cands, S.recent, C.noRepeat)
  const n = Object.keys(sh.customers || {}).length
  const afterClips = d.when === 'mo_hang' ? 0 : nextInt(holder, 1, Math.max(1, n - 1))
  return { id: d.id, afterClips, status: 'cho', rng: holder.rng, cap, guaranteed, detail: null, choice: null, result: null }
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
export function incidentDue(state, ctx) {
  const sh = state && state.shift
  const inc = sh && sh.incident
  if (!inc || inc.status !== 'cho' || sh.paused || sh.tasting) return false
  if (sh.counter) return false
  if (miniGameBusy(sh)) return false
  if (clipsOf(sh) < (inc.afterClips || 0)) return false
  const K = KINDS[inc.id]
  const d = (defs(ctx) || {})[inc.id]
  if (!K || !d) return false
  return !!K.due(state, sh, ctx, d)
}

// Nội dung hộp thoại của tình huống đang mở (chi tiết đã chốt). null nếu chưa mở.
export function incidentView(state, ctx) {
  const sh = state && state.shift
  const inc = sh && sh.incident
  const d = inc && (defs(ctx) || {})[inc.id]
  if (!inc || !d || !inc.detail) return null
  const K = KINDS[inc.id]
  const vars = K.vars(state, sh, ctx, d, inc.detail)
  const choices = (d.choices || []).map(c => {
    const available = inc.status === 'cho' ? !!K.available(state, sh, ctx, d, inc.detail, c) : false
    return {
      id: c.id, label: fill(c.label, vars), safe: !!c.safe, available,
      cost: fill(K.costTpl ? K.costTpl(state, sh, ctx, d, inc.detail, c) : c.cost, vars),
      reason: available ? '' : fill(c.blocked || 'Chưa làm được lúc này', vars)
    }
  })
  return {
    id: d.id, name: d.name, positive: !!d.positive, when: d.when || 'giua_khach', text: fill(d.text, vars), note: d.note ? fill(d.note, vars) : '',
    who: vars.who || '', status: inc.status, choices, safeId: (choices.find(c => c.safe) || {}).id || null, cap: inc.cap,
    detail: { ...inc.detail }
  }
}

// Mở tình huống: chốt chi tiết (ai, món, phiếu) bằng luồng ngẫu nhiên của tình huống. Trả nội dung hộp thoại hoặc null.
export function openIncident(state, ctx) {
  if (!incidentDue(state, ctx)) return null
  const sh = state.shift
  const inc = sh.incident
  const d = defs(ctx)[inc.id]
  const K = KINDS[inc.id]
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
  const inc = sh && sh.incident
  if (!inc || inc.status !== 'cho' || !inc.detail) return { ok: false, reason: 'khong_co' }
  const d = (defs(ctx) || {})[inc.id]
  const K = KINDS[inc.id]
  if (!d || !K) return { ok: false, reason: 'khong_co' }
  if (!K.valid(state, sh, ctx, d, inc.detail)) return { ok: false, reason: 'het_han' }
  const c = (d.choices || []).find(x => x.id === choiceId)
  if (!c) return { ok: false, reason: 'khong_co' }
  if (!K.available(state, sh, ctx, d, inc.detail, c)) return { ok: false, reason: 'khong_duoc' }
  const vars = K.vars(state, sh, ctx, d, inc.detail)
  const eff = K.apply(state, sh, ctx, d, inc.detail, c, inc)
  eff.loss = Math.max(0, eff.cost - eff.money)
  let text = fill(c.bonusCustomers && !eff.bonus && eff.rep > 0 && c.resultFull ? c.resultFull : c.result, vars)
  if (inc.id === 'doi_y' && c.id !== 'doi_mon') text = fill(eff.starLoss ? d.moodBad : d.moodOk, vars)
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
  inc.result = {
    id: d.id, name: d.name, choice: c.id, label: fill(c.label, vars), safe: !!c.safe, text,
    money: eff.money, cost: eff.cost, refund: eff.refund, rep: eff.rep, bonus: eff.bonus, debt: eff.debt,
    starLoss: eff.starLoss, loss: eff.loss, who: vars.who || '', tipId
  }
  const C = incidentConfig(ctx)
  const S = ensureIncidents(state)
  S.since = 0
  S.total += 1
  S.recent.push(d.id)
  if (S.recent.length > C.recentMax) S.recent.splice(0, S.recent.length - C.recentMax)
  S.log.unshift({ day: sh.day, id: d.id, choice: c.id, money: eff.money, cost: eff.cost, refund: eff.refund, rep: eff.rep })
  if (S.log.length > C.logMax) S.log.length = C.logMax
  emit(ctx, 'incident.resolved', { id: d.id, choice: c.id, day: sh.day, safe: !!c.safe, money: eff.money, cost: eff.cost, rep: eff.rep, loss: eff.loss })
  return { ok: true, id: d.id, choice: c.id, safe: !!c.safe, text, effects: eff, tipId }
}

// Cuối ca (endShift): ca từ ngày fromDay không có tình huống nào được xử lý → bảo hiểm +1.
export function finishShiftIncidents(state, ctx) {
  const sh = state.shift
  if (!sh) return
  const C = incidentConfig(ctx)
  if (!defs(ctx) || sh.day < C.fromDay) return
  const S = ensureIncidents(state)
  if (!(sh.incident && sh.incident.status === 'xong')) S.since += 1
}
