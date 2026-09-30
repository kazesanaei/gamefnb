// Khâu quầy: Order → Thanh toán → Tính tiền → kẹp phiếu bếp.
import { chance, nextInt } from './rng.js'
import { cfg, emit, unlockTip } from './state.js'
import { drawerTotal, addBills, billsCount, minBillsChange, canMakeChange, customerCash, composeGreedy, BILLS } from './money.js'
import { normalizeLines, lineKey, personaObj, lineFor, loseCustomer } from './customer.js'
import { linesPar } from './kitchen.js'
import { noteObjects } from './scoring.js'

function counterOf(state, stage) {
  const sh = state.shift
  const c = sh && sh.counter
  if (!c) return null
  if (stage && c.stage !== stage) return null
  return c
}

function customerOf(state) {
  const sh = state.shift
  return sh && sh.counter ? sh.customers[sh.counter.customerId] : null
}

function bump(sh, key, n = 1) {
  if (!sh.counts) sh.counts = {}
  sh.counts[key] = (sh.counts[key] || 0) + n
}

function addPenalty(customer, code, stars, source = 'quay') {
  if (customer.penalties.some(p => p.code === code)) return false
  customer.penalties.push({ code, stars, source })
  return true
}

// ---------- Order ----------

// Khi quầy trống và có khách đầu hàng → mở phiên quầy, khách sang 'order'.
export function beginCounter(state, ctx) {
  const sh = state.shift
  if (!sh || sh.counter || !sh.queue.length) return sh ? sh.counter : null
  const id = sh.queue[0]
  const c = sh.customers[id]
  if (!c || c.status !== 'xep_hang') return null
  c.status = 'order'
  sh.counter = {
    customerId: id, stage: 'order',
    draft: [], readbackDone: false, readbackErrors: 0, caught: [],
    reportedTotal: null, totalAttempts: 0, trueTotal: null, amountDue: null,
    payMethod: null, fakeQr: false, given: null,
    changeDue: 0, changePaid: 0, changeDone: false, changeAttempts: 0, cashDeposited: false,
    changeOptionsUsed: [], rounding: 0, changeBills: {},
    tray: {},
    qrArriveAt: null, qrArrived: false, paid: false,
    receipt: null
  }
  const ids = c.request.map(l => l.recipeId)
  if (new Set(ids).size < ids.length) unlockTip(state, 'split_line', ctx)
  emit(ctx, 'counter.begin', { customerId: id })
  return sh.counter
}

function cleanLine(line) {
  return { recipeId: line.recipeId, qty: Math.max(1, Math.min(9, Math.floor(Number(line.qty) || 1))), notes: [...new Set(line.notes || [])].sort() }
}

function draftChanged(c) {
  c.readbackDone = false
  c.caught = []
}

// Thêm dòng vào phiếu đang ghi. Trả chỉ số dòng hoặc -1.
export function addLine(state, line) {
  const c = counterOf(state, 'order')
  if (!c || !line || !line.recipeId) return -1
  c.draft.push(cleanLine(line))
  draftChanged(c)
  return c.draft.length - 1
}

export function updateLine(state, index, line) {
  const c = counterOf(state, 'order')
  if (!c || !c.draft[index] || !line) return false
  c.draft[index] = cleanLine({ ...c.draft[index], ...line })
  draftChanged(c)
  return true
}

export function removeLine(state, index) {
  const c = counterOf(state, 'order')
  if (!c || !c.draft[index]) return false
  c.draft.splice(index, 1)
  draftChanged(c)
  return true
}

// So yêu cầu thật với phiếu (đa tập theo khóa recipeId + ghi chú đã sắp xếp).
// Lỗi: sai_ghi_chu, sai_so_luong (short: true = thiếu), sai_mon, thieu_mon, thua_mon.
// index = chỉ số dòng trong phiếu (draft) để tô đỏ; requestIndex = dòng yêu cầu.
export function compareLines(request, draft) {
  const mk = (l, i) => ({ recipeId: l.recipeId, notes: [...(l.notes || [])].sort(), qty: Math.max(0, Math.floor(Number(l.qty) || 0)), i, left: Math.max(0, Math.floor(Number(l.qty) || 0)), key: lineKey(l) })
  const req = (request || []).map(mk)
  const drf = (draft || []).map(mk)
  const errors = []
  // 1. khớp đúng khóa
  for (const r of req) for (const d of drf) {
    if (r.left && d.left && r.key === d.key) { const m = Math.min(r.left, d.left); r.left -= m; d.left -= m }
  }
  // 2. cùng món khác ghi chú
  for (const r of req) for (const d of drf) {
    if (r.left && d.left && r.recipeId === d.recipeId && r.key !== d.key) {
      const m = Math.min(r.left, d.left); r.left -= m; d.left -= m
      errors.push({ type: 'sai_ghi_chu', index: d.i, requestIndex: r.i, recipeId: d.recipeId, notes: d.notes, expectedRecipeId: r.recipeId, expectedNotes: r.notes, qty: m })
    }
  }
  // 3. khác món: cặp dòng còn dư hai phía
  for (const r of req) for (const d of drf) {
    if (r.left && d.left) {
      const m = Math.min(r.left, d.left); r.left -= m; d.left -= m
      errors.push({ type: 'sai_mon', index: d.i, requestIndex: r.i, recipeId: d.recipeId, notes: d.notes, expectedRecipeId: r.recipeId, expectedNotes: r.notes, qty: m })
    }
  }
  // 4. sai số lượng (chỉ còn dư một phía của cùng món)
  for (const r of req) {
    if (!r.left) continue
    const d = drf.find(x => x.key === r.key) || drf.find(x => x.recipeId === r.recipeId)
    if (d) {
      errors.push({ type: 'sai_so_luong', short: true, index: d.i, requestIndex: r.i, recipeId: r.recipeId, notes: r.notes, expectedRecipeId: r.recipeId, expectedNotes: r.notes, qty: r.left, expectedQty: r.qty, gotQty: d.qty })
      r.left = 0
    }
  }
  for (const d of drf) {
    if (!d.left) continue
    const r = req.find(x => x.key === d.key) || req.find(x => x.recipeId === d.recipeId)
    if (r) {
      errors.push({ type: 'sai_so_luong', short: false, index: d.i, requestIndex: r.i, recipeId: d.recipeId, notes: d.notes, expectedRecipeId: r.recipeId, expectedNotes: r.notes, qty: d.left, expectedQty: r.qty, gotQty: d.qty })
      d.left = 0
    }
  }
  // 5. còn lại
  for (const r of req) if (r.left) errors.push({ type: 'thieu_mon', index: null, requestIndex: r.i, recipeId: null, notes: [], expectedRecipeId: r.recipeId, expectedNotes: r.notes, qty: r.left })
  for (const d of drf) if (d.left) errors.push({ type: 'thua_mon', index: d.i, requestIndex: null, recipeId: d.recipeId, notes: d.notes, expectedRecipeId: null, expectedNotes: [], qty: d.left })
  return { errors, ok: errors.length === 0 }
}

// Đọc lại đơn (bắt buộc trước confirmOrder). Mỗi lỗi bị khách bắt với xác suất readbackCatchRate;
// mỗi lỗi bị bắt −8% kiên nhẫn. Có lỗi bị bắt → phải sửa rồi đọc lại (readbackDone = false).
export function readback(state, ctx) {
  const sh = state.shift
  const c = counterOf(state, 'order')
  if (!c || !c.draft.length) return { caught: [], missed: [], ok: false }
  const customer = customerOf(state)
  const { errors } = compareLines(customer.request, c.draft)
  const rate = cfg(ctx, 'readbackCatchRate')
  const caught = [], missed = []
  for (const e of errors) (chance(sh, rate) ? caught : missed).push(e)
  const cost = cfg(ctx, 'readbackPatienceCost')
  customer.patience = Math.max(0, customer.patience - cost * caught.length)
  c.readbackErrors += caught.length
  c.caught = caught
  c.readbackDone = caught.length === 0
  bump(sh, 'readbacks')
  unlockTip(state, 'first_readback', ctx)
  if (caught.length) unlockTip(state, 'readback_caught', ctx)
  const line = lineFor(caught.length ? 'readback_wrong' : 'readback_ok', customer, sh, ctx)
  emit(ctx, 'order.readback', { errorsFound: caught.length, errorsMissed: missed.length })
  return { caught, missed, ok: true, readbackDone: c.readbackDone, line }
}

// Chốt order: cần đã đọc lại và phiếu khác rỗng → 'thanh_toan'. Lỗi còn lại ghi vào customer.orderErrors.
export function confirmOrder(state, ctx) {
  const c = counterOf(state, 'order')
  if (!c) return { ok: false, reason: 'khong_hop_le' }
  if (!c.draft.length) return { ok: false, reason: 'phieu_rong' }
  if (!c.readbackDone) return { ok: false, reason: 'chua_doc_lai' }
  const customer = customerOf(state)
  c.draft = normalizeLines(c.draft)
  customer.orderErrors = compareLines(customer.request, c.draft).errors
  c.stage = 'thanh_toan'
  customer.status = 'thanh_toan'
  emit(ctx, 'order.confirmed', { customerId: customer.id })
  return { ok: true }
}

// ---------- Thanh toán ----------

export function unitPriceOf(recipe, notes) {
  let p = (recipe && recipe.price) || 0
  for (const n of noteObjects(recipe, notes)) p += Number(n.surcharge) || 0
  return p
}

// Tổng theo giá niêm yết + phụ thu ghi chú (note.surcharge × qty).
export function priceOfLines(lines, recipes) {
  return (lines || []).reduce((s, l) => s + unitPriceOf(recipes && recipes[l.recipeId], l.notes) * (Number(l.qty) || 0), 0)
}

// Báo tổng. So với giá của YÊU CẦU THẬT.
// 'du': nếu đúng bằng tổng phiếu ghi thừa → reason 'phieu_thua' (−8% kiên nhẫn, quay lại sửa phiếu);
//       còn lại → phạt bao_du −1 sao (1 lần), phải báo lại.
// 'thieu': khách trả theo số đã báo, ledger.undercharge += chênh. 'dung'.
// Xong → khách chọn phương thức (cash/qr), stage 'tinh_tien'.
export function reportTotal(state, amount, ctx) {
  const sh = state.shift
  const c = counterOf(state, 'thanh_toan')
  if (!c) return { result: 'khong_hop_le', trueTotal: null }
  const customer = customerOf(state)
  const R = ctx.data.RECIPES
  const trueTotal = priceOfLines(customer.request, R)
  amount = Math.round(Number(amount) || 0)
  c.trueTotal = trueTotal
  if (amount <= 0) return { result: 'khong_hop_le', trueTotal }
  c.totalAttempts += 1
  c.reportedTotal = amount
  if (amount > trueTotal) {
    const draftTotal = priceOfLines(c.draft, R)
    emit(ctx, 'total.reported', { correct: false, diff: amount - trueTotal })
    if (amount === draftTotal && draftTotal > trueTotal) {
      // phiếu ghi thừa: khách chỉ ra, quay lại sửa phiếu
      customer.patience = Math.max(0, customer.patience - cfg(ctx, 'readbackPatienceCost'))
      c.stage = 'order'
      c.readbackDone = false
      customer.status = 'order'
      return { result: 'du', reason: 'phieu_thua', trueTotal, line: lineFor('total_too_high', customer, sh, ctx) }
    }
    const penalized = addPenalty(customer, 'bao_du', 1, 'quay')
    if (penalized) unlockTip(state, 'total_too_high', ctx)
    return { result: 'du', reason: 'cong_sai', penalized, trueTotal, line: lineFor('total_too_high', customer, sh, ctx) }
  }
  const result = amount === trueTotal ? 'dung' : 'thieu'
  if (result === 'thieu') {
    sh.ledger.undercharge += trueTotal - amount
    customer.undercharge = trueTotal - amount     // lỗi 0 sao 'bao_thieu' trên phiếu chấm
  }
  c.amountDue = amount
  emit(ctx, 'total.reported', { correct: result === 'dung', diff: amount - trueTotal })
  // khách chọn phương thức
  const persona = personaObj(ctx, customer.persona)
  const day = sh.day
  let method = 'cash', fake = false
  if (customer.forcePay === 'qr_fake' && !customer.tutorial) {
    // M2: chuỗi "Làm quen QR" ép 1 khách trả bằng ảnh chuyển khoản giả
    method = 'qr'
    fake = true
  } else if (!customer.tutorial && day >= cfg(ctx, 'qrFromDay') && chance(sh, persona.qrRate ?? cfg(ctx, 'qrRate'))) {
    method = 'qr'
    if (day >= cfg(ctx, 'fakeQrFromDay') && chance(sh, cfg(ctx, 'fakeQrRate'))) fake = true
  }
  c.payMethod = method
  c.fakeQr = fake
  customer.payMethod = method
  customer.fakeQr = fake
  if (method === 'cash') {
    const given = customerCash(sh, amount, persona, day)
    c.given = given
    customer.given = given
    c.changeDue = given.total - amount
    unlockTip(state, 'first_cash', ctx)
    emit(ctx, 'payment.received', { method: 'cash', amount: given.total })
  } else {
    c.given = null
    c.changeDue = 0
    c.qrArriveAt = fake ? null : sh.t + nextInt(sh, 1, 4)
    c.qrArrived = false
  }
  c.stage = 'tinh_tien'
  customer.status = 'tinh_tien'
  return { result, trueTotal, method, fake, given: c.given, line: lineFor('total_ok', customer, sh, ctx) }
}

// ---------- Tính tiền ----------

// Lấy 1 tờ từ két vào khay thối.
export function trayAdd(state, bill) {
  const c = counterOf(state, 'tinh_tien')
  const sh = state.shift
  bill = Number(bill)
  if (!c || c.payMethod !== 'cash' || c.changeDone || !BILLS.includes(bill)) return false
  if ((Number(sh.drawer[bill]) || 0) <= 0) return false
  sh.drawer[bill] -= 1
  c.tray[bill] = (Number(c.tray[bill]) || 0) + 1
  return true
}

// Trả 1 tờ từ khay về két.
export function trayRemove(state, bill) {
  const c = counterOf(state, 'tinh_tien')
  const sh = state.shift
  bill = Number(bill)
  if (!c || !(Number(c.tray[bill]) > 0)) return false
  c.tray[bill] -= 1
  if (!c.tray[bill]) delete c.tray[bill]
  sh.drawer[bill] = (Number(sh.drawer[bill]) || 0) + 1
  return true
}

// Tiền thối còn phải đưa.
export function changeRemaining(state) {
  const c = counterOf(state, 'tinh_tien')
  if (!c || c.payMethod !== 'cash') return 0
  return Math.max(0, c.changeDue - c.changePaid)
}

function depositGiven(sh, c) {
  if (c.cashDeposited || !c.given) return
  addBills(sh.drawer, c.given.bills, 1)
  c.cashDeposited = true
  sh.ledger.cash += c.amountDue
}

// Đưa tiền thối (kể cả khay rỗng khi không cần thối). Tiền khách đưa vào két; khay rời két.
// Thiếu: 90% khách phát hiện (thoi_thieu −1 sao, phải thối bù), 10% không (reviewLate).
// Dư: ledger.overchange += dư; 50% khách trả lại (+1 danh tiếng).
export function giveChange(state, ctx) {
  const sh = state.shift
  const c = counterOf(state, 'tinh_tien')
  if (!c || c.payMethod !== 'cash' || c.changeDone) return { ok: false, correct: false, due: 0, given: 0, optimal: false, diff: 0 }
  const customer = customerOf(state)
  const due = c.changeDue - c.changePaid
  const tray = { ...c.tray }
  const traySum = drawerTotal(tray)
  const pool = addBills({ ...sh.drawer }, tray, 1)
  const best = minBillsChange(due, pool)
  depositGiven(sh, c)
  c.tray = {}
  c.changePaid += traySum
  c.changeBills = addBills({ ...(c.changeBills || {}) }, tray, 1)
  c.changeAttempts += 1
  const diff = traySum - due
  const correct = diff === 0
  const optimal = correct && !!best && billsCount(tray) === best.count
  if (c.changeAttempts === 1) bump(sh, correct ? 'changeCorrect' : 'changeWrong')
  unlockTip(state, 'first_change', ctx)
  if (!correct) { c.changeWrongAny = true; unlockTip(state, 'change_wrong', ctx) }
  const res = { ok: true, correct, due, given: traySum, optimal, diff, optimalCount: best ? best.count : null }
  if (diff < 0) {
    if (chance(sh, cfg(ctx, 'shortChangeDetectRate'))) {
      addPenalty(customer, 'thoi_thieu', 1, 'quay')
      res.detected = true
      res.mustTopUp = true
      res.remaining = -diff
      res.line = lineFor('change_short', customer, sh, ctx, { amount: -diff })
    } else {
      customer.reviewLate = { code: 'thoi_thieu', amount: -diff, stars: 2 }
      res.detected = false
      c.changeDone = true
    }
  } else {
    if (diff > 0) {
      customer.overchanged = true                  // lỗi 0 sao 'thoi_du' (kể cả khi khách trả lại)
      sh.ledger.overchange += diff
      if (chance(sh, cfg(ctx, 'overChangeReturnRate'))) {
        const back = composeGreedy(diff)
        if (back) {
          addBills(sh.drawer, back, 1)
          sh.ledger.overchange -= diff
          sh.reputationGain = (sh.reputationGain || 0) + 1
          customer.returnedOver = true
          res.returned = true
          res.line = lineFor('change_over_returned', customer, sh, ctx, { amount: diff })
        }
      }
    }
    c.changeDone = true
  }
  res.done = c.changeDone
  emit(ctx, 'change.given', { correct, optimal, diff })
  return res
}

// Lựa chọn khi két không thối được: ['xin_tien_le', 'moi_qr'?, 'lam_tron'] (rỗng nếu thối được).
export function changeOptions(state, ctx = null) {
  const sh = state.shift
  const c = counterOf(state, 'tinh_tien')
  if (!c || c.payMethod !== 'cash' || c.changeDone) return []
  const due = c.changeDue - c.changePaid
  const pool = addBills({ ...sh.drawer }, c.tray, 1)
  if (canMakeChange(due, pool)) return []
  const qrDay = ctx ? cfg(ctx, 'qrFromDay') : 4
  const opts = ['xin_tien_le']
  if (sh.day >= qrDay) opts.push('moi_qr')
  opts.push('lam_tron')
  return opts.filter(o => !c.changeOptionsUsed.includes(o))
}

// Hoàn tác tiền mặt đã nhận (khi đổi cách trả sau lần thối thiếu): khách trả lại mọi tờ
// tiền thối đã cầm, quán trả lại tiền khách đưa; hủy doanh thu tiền mặt và phần làm tròn.
function undoCashPayment(sh, c) {
  if (c.rounding) {
    sh.ledger.rounding = Math.max(0, (sh.ledger.rounding || 0) - c.rounding)
    c.changeDue -= c.rounding
    c.rounding = 0
  }
  if (!c.cashDeposited) return false
  const back = c.changeBills && drawerTotal(c.changeBills) === c.changePaid ? c.changeBills : (composeGreedy(c.changePaid) || {})
  addBills(sh.drawer, back, 1)
  for (const [b, n] of Object.entries((c.given && c.given.bills) || {})) {
    sh.drawer[b] = Math.max(0, (Number(sh.drawer[b]) || 0) - (Number(n) || 0))
  }
  sh.ledger.cash -= c.amountDue
  c.cashDeposited = false
  c.changePaid = 0
  c.changeBills = {}
  return true
}

// Xử lý khi két không thối được.
// xin_tien_le: 40% khách có tiền lẻ (trả vừa đủ), luôn −5% kiên nhẫn.
// moi_qr: chuyển sang QR (ngày ≥ qrFromDay). lam_tron: thối dư tối đa 5.000đ có lợi cho khách.
export function resolveNoChange(state, option, ctx) {
  const sh = state.shift
  const c = counterOf(state, 'tinh_tien')
  if (!c || !changeOptions(state, ctx).includes(option)) return { ok: false, reason: 'khong_hop_le' }
  const customer = customerOf(state)
  c.changeOptionsUsed.push(option)
  unlockTip(state, 'no_small_change', ctx)
  // trả tờ đang gom trong khay về két
  addBills(sh.drawer, c.tray, 1)
  c.tray = {}
  if (option === 'xin_tien_le') {
    customer.patience = Math.max(0, customer.patience - cfg(ctx, 'changeAskPatienceCost'))
    const exact = c.amountDue % 5000 === 0 ? composeGreedy(c.amountDue) : null
    if (exact && chance(sh, cfg(ctx, 'changeAskRate'))) {
      // đổi tờ: hoàn tác lần đưa trước (nếu tiền đã vào két) rồi nhận tiền vừa đủ
      const undone = undoCashPayment(sh, c)
      c.given = { bills: exact, total: c.amountDue }
      customer.given = c.given
      c.changeDue = 0
      c.changePaid = 0
      return { ok: true, success: true, option, undone }
    }
    return { ok: true, success: false, option }
  }
  if (option === 'moi_qr') {
    // khách lấy lại tiền mặt đã đưa (trả lại tiền thối đã cầm) rồi chuyển khoản trọn hóa đơn
    const undone = undoCashPayment(sh, c)
    c.payMethod = 'qr'
    customer.payMethod = 'qr'
    c.given = null
    customer.given = null
    c.changeDue = 0
    c.fakeQr = false
    customer.fakeQr = false
    c.qrArriveAt = sh.t + nextInt(sh, 1, 4)
    c.qrArrived = false
    return { ok: true, success: true, option, undone }
  }
  // lam_tron
  const due = c.changeDue - c.changePaid
  const max = cfg(ctx, 'roundingMax')
  for (let x = Math.ceil(due / 5000) * 5000; x <= due + max; x += 5000) {
    if (x > due && canMakeChange(x, sh.drawer)) {
      c.rounding = x - due
      c.changeDue += x - due
      sh.ledger.rounding = (sh.ledger.rounding || 0) + (x - due)
      return { ok: true, success: true, option, newDue: x, extra: x - due }
    }
  }
  return { ok: true, success: false, option }
}

// Xác nhận QR: chỉ hợp lệ khi tiền đã về. Ảnh giả mà xác nhận → mất trọn hóa đơn
// (có Loa báo tiền thì bị chặn: khách bỏ đi, tính là đã bắt được ảnh giả).
export function confirmQr(state, ctx) {
  const sh = state.shift
  const c = counterOf(state, 'tinh_tien')
  if (!c || c.payMethod !== 'qr' || c.paid) return { ok: false, fake: false, reason: 'khong_hop_le' }
  if (c.fakeQr) {
    if (state.upgrades && state.upgrades.loa_bao_tien) {
      emit(ctx, 'qr.confirmed', { fake: true, blocked: true })
      rejectQr(state, ctx, { blocked: true })
      return { ok: false, fake: true, blocked: true }
    }
    sh.ledger.fakeQrLoss += c.amountDue
    c.paid = true
    unlockTip(state, 'fake_qr', ctx)
    emit(ctx, 'qr.confirmed', { fake: true, blocked: false })
    return { ok: true, fake: true, blocked: false }
  }
  if (!c.qrArrived) return { ok: false, fake: false, reason: 'chua_ve' }
  sh.qrBalance += c.amountDue
  sh.ledger.qr += c.amountDue
  c.paid = true
  bump(sh, 'qrConfirmed')
  emit(ctx, 'qr.confirmed', { fake: false, blocked: false })
  emit(ctx, 'payment.received', { method: 'qr', amount: c.amountDue })
  return { ok: true, fake: false, blocked: false }
}

// Từ chối ảnh chuyển khoản: ảnh giả → khách xấu hổ bỏ đi (fakeQrCaught); QR thật → khách bực bỏ đi.
// Phát 'qr.rejected' {customerId, fake, blocked} (blocked: Loa báo tiền tự chặn).
export function rejectQr(state, ctx, opts = {}) {
  const sh = state.shift
  const c = counterOf(state, 'tinh_tien')
  if (!c || c.payMethod !== 'qr' || c.paid) return { ok: false, fake: false }
  const customer = customerOf(state)
  const fake = !!c.fakeQr
  if (fake) {
    customer.fakeQrCaught = true
    bump(sh, 'fakeQrCaught')
    unlockTip(state, 'fake_qr', ctx)
  }
  emit(ctx, 'qr.rejected', { customerId: customer.id, fake, blocked: !!opts.blocked })
  loseCustomer(state, customer, fake ? 'qr_gia' : 'tu_choi_qr', ctx)
  return { ok: true, fake }
}

// Dây phiếu đầy?
export function railFull(state, ctx = null) {
  const sh = state.shift
  const max = ctx ? cfg(ctx, 'ticketRailMax') : 3
  return !!sh && sh.tickets.length >= max
}

// Kẹp phiếu: tạo phiếu thu + phiếu bếp; khách → 'cho_mon'; quầy trống.
// Trả {ok:true, ticket, receipt} hoặc {ok:false, reason: 'bep_day' | 'chua_thanh_toan' | 'khong_hop_le'}.
export function clipTicket(state, ctx) {
  const sh = state.shift
  const c = counterOf(state, 'tinh_tien')
  if (!c) return { ok: false, reason: 'khong_hop_le' }
  if (c.payMethod === 'cash' ? !c.changeDone : !c.paid) return { ok: false, reason: 'chua_thanh_toan' }
  if (sh.tickets.length >= cfg(ctx, 'ticketRailMax')) return { ok: false, reason: 'bep_day' }
  const customer = customerOf(state)
  const R = ctx.data.RECIPES
  const no = sh.nextTicketNo++
  const noStr = '#' + String(no).padStart(3, '0')
  const receipt = {
    no: noStr, shopName: state.shopName || '', day: sh.day, time: Math.round(sh.t),
    lines: c.draft.map(l => {
      const r = R[l.recipeId]
      const unit = unitPriceOf(r, l.notes)
      return { recipeId: l.recipeId, name: r ? r.name : l.recipeId, qty: l.qty, notes: noteObjects(r, l.notes).map(n => n.label), unitPrice: unit, amount: unit * l.qty }
    }),
    listTotal: priceOfLines(c.draft, R), total: c.amountDue,
    given: c.payMethod === 'cash' && c.given ? c.given.total : null,
    change: c.payMethod === 'cash' ? c.changePaid : 0,
    rounding: c.payMethod === 'cash' ? (c.rounding || 0) : 0,
    method: c.payMethod
  }
  const ticket = {
    id: 'p' + no, no: noStr, customerId: customer.id,
    lines: c.draft.map(l => ({ recipeId: l.recipeId, qty: l.qty, notes: l.notes.slice() })),
    createdAt: sh.t, status: 'cho', done: c.draft.map(() => null), receiptNo: noStr
  }
  sh.tickets.push(ticket)
  c.receipt = receipt
  sh.ledger.sales += c.amountDue
  sh.ledger.listValue += c.trueTotal ?? priceOfLines(customer.request, R)
  sh.receipts = sh.receipts || []
  sh.receipts.push(receipt)
  // phạt chờ gọi món (quá 60% / 85% kiên nhẫn)
  if (!customer.tutorial && sh.day > 1) {
    if (customer.patience < 0.15) customer.penalties.push({ code: 'cho_goi_mon', stars: 1, source: 'cho' })
    else if (customer.patience < 0.4) customer.penalties.push({ code: 'cho_goi_mon', stars: 0.5, source: 'cho' })
  }
  const counterErr = customer.orderErrors.length > 0 || customer.penalties.some(p => p.source === 'quay') || !!c.changeWrongAny ||
    (customer.undercharge > 0) || (c.payMethod === 'qr' && !!c.fakeQr)
  // chuỗi "Quầy chuẩn": Hỗ trợ tính tiền (hiện sẵn tổng và tiền thối) thì không được đếm
  const assistCash = !!(state.settings && state.settings.assistCash)
  sh.counterStreak = counterErr || assistCash ? 0 : (sh.counterStreak || 0) + 1
  customer.ticketId = ticket.id
  customer.status = 'cho_mon'
  customer.waitStart = sh.t
  customer.waitBudget = cfg(ctx, 'waitBudgetBase') + cfg(ctx, 'waitBudgetParMul') * linesPar(ticket.lines, R)
  customer.receipt = receipt
  sh.counter = null
  sh.queue = sh.queue.filter(x => x !== customer.id)
  unlockTip(state, 'first_ticket', ctx)
  emit(ctx, 'ticket.clipped', { ticketId: ticket.id })
  return { ok: true, ticket, receipt }
}
