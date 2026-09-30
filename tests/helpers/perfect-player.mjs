// "Người chơi hoàn hảo": gọi đúng các hàm lõi để chơi hết một ca (dùng cho test mô phỏng).
import { startShift, advance, isShiftOver, endShift } from '../../src/core/shift.js'
import {
  addLine, readback, confirmOrder, priceOfLines, reportTotal, trayAdd, giveChange, changeOptions,
  resolveNoChange, changeRemaining, confirmQr, rejectQr, clipTicket
} from '../../src/core/order.js'
import { startCook, submitChon, availableSteps, getStep, submitStep, finishDish, serveTicket, resolveComplaint } from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { minBillsChange, addBills } from '../../src/core/money.js'
import { incidentDue, openIncident, resolveIncident } from '../../src/core/incidents.js'

// Tình huống trong ca (M3), như giao diện ở tab Quầy: quầy trống giữa hai khách → mở → chọn.
// choose(view, state) → id lựa chọn (mặc định: cách an toàn). Trả { view, res } hoặc null.
export function handleIncident(state, ctx, choose = view => view.safeId) {
  if (!incidentDue(state, ctx)) return null
  const view = openIncident(state, ctx)
  if (!view) return null
  const id = choose(view, state)
  const res = resolveIncident(state, id, ctx)
  if (!res.ok) throw new Error('không xử lý được tình huống ' + view.id + '/' + id + ': ' + res.reason)
  return { view, res }
}

// Một bước ở quầy. Trả true nếu có tiến triển.
export function counterStep(state, ctx) {
  const sh = state.shift
  const c = sh.counter
  if (!c) return false
  const cust = sh.customers[c.customerId]
  const R = ctx.data.RECIPES
  if (c.stage === 'order') {
    if (!c.draft.length) for (const l of cust.request) addLine(state, l)
    const rb = readback(state, ctx)
    if (rb.caught.length) throw new Error('phiếu đúng mà bị bắt lỗi')
    const r = confirmOrder(state, ctx)
    if (!r.ok) throw new Error('không chốt được order: ' + r.reason)
    return true
  }
  if (c.stage === 'thanh_toan') {
    const r = reportTotal(state, priceOfLines(cust.request, R), ctx)
    if (r.result !== 'dung') throw new Error('báo tổng sai')
    return true
  }
  if (c.stage === 'tinh_tien') {
    if (c.payMethod === 'cash' && !c.changeDone) {
      // két không thối được: thử làm tròn → mời QR → xin tiền lẻ
      for (const o of ['lam_tron', 'moi_qr', 'xin_tien_le']) {
        const opts = changeOptions(state, ctx)
        if (!opts.length) break
        if (opts.includes(o)) resolveNoChange(state, o, ctx)
        if (c.payMethod !== 'cash') return true
      }
      if (changeOptions(state, ctx).length) throw new Error('kẹt tiền lẻ')
      const due = changeRemaining(state)
      const pool = addBills({ ...sh.drawer }, c.tray, 1)
      const best = minBillsChange(due, pool)
      for (const b of Object.keys(best.bills)) for (let i = 0; i < best.bills[b]; i++) trayAdd(state, Number(b))
      const g = giveChange(state, ctx)
      if (!g.correct || !g.optimal) throw new Error('thối sai')
    }
    if (c.payMethod === 'qr' && !c.paid) {
      if (c.fakeQr) { rejectQr(state, ctx); return true }
      if (!c.qrArrived) return false
      const q = confirmQr(state, ctx)
      if (!q.ok) throw new Error('QR không xác nhận được')
    }
    const k = clipTicket(state, ctx)
    if (!k.ok && k.reason !== 'bep_day') throw new Error('không kẹp được phiếu: ' + k.reason)
    return k.ok
  }
  return false
}

// Nấu hết một phiếu và giao. Trả ScoreSheet cuối.
export function cookTicket(state, ctx, ticket, { score = 100 } = {}) {
  const R = ctx.data.RECIPES
  for (let i = 0; i < ticket.lines.length; i++) {
    if (ticket.done[i]) continue
    const cook = startCook(state, ticket.id, i, ctx)
    if (!cook) throw new Error('không mở được phiên nấu')
    const r = submitChon(state, requiredIngredients(R[cook.recipeId], cook.notes).required, 0, ctx)
    if (!r.ok) throw new Error('chọn nguyên liệu bị chặn')
    let av
    while ((av = availableSteps(state)).length) {
      const st = getStep(state, av[0])
      submitStep(state, av[0], { score, method: st.method ? st.method.correct : undefined }, ctx)
    }
    finishDish(state, ctx)
  }
  let sheet = serveTicket(state, ticket.id, ctx)
  if (sheet && !sheet.final) {
    const aps = (ctx.data.DIALOGUE && ctx.data.DIALOGUE.apologies) || []
    const idx = Math.max(0, aps.findIndex(a => a.correct))
    sheet = resolveComplaint(state, sheet.customerId, { apologyIndex: idx, action: 'refund' }, ctx).sheet
  }
  return sheet
}

// Chơi trọn một ca. Trả {summary, sheets, walletBefore, walletAfter, steps, incidents}.
// incident (tùy chọn, M3): hàm chọn cách xử lý tình huống trong ca (xem handleIncident); không có thì bỏ qua
// tình huống (như người chơi không ở tab Quầy lúc quầy trống).
export function playShift(state, ctx, { dt = 0.5, maxSteps = 20000, score = 100, incident = null } = {}) {
  const walletBefore = state.wallet
  startShift(state, ctx)
  const sheets = []
  const incidents = []
  const tryIncident = () => {
    if (!incident) return
    const r = handleIncident(state, ctx, incident)
    if (r) incidents.push(r)
  }
  let steps = 0
  while (!isShiftOver(state)) {
    if (++steps > maxSteps) throw new Error('ca không kết thúc')
    const sh = state.shift
    tryIncident()
    while (counterStep(state, ctx)) { tryIncident() /* xử lý quầy tới khi phải chờ */ }
    tryIncident()
    for (const t of sh.tickets.slice()) sheets.push(cookTicket(state, ctx, t, { score }))
    if (!isShiftOver(state)) advance(state, dt, ctx)
  }
  const summary = endShift(state, ctx)
  return { summary, sheets, walletBefore, walletAfter: state.wallet, steps, incidents }
}
