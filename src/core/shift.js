// Ca bán hàng: lịch khách, vòng thời gian, kết thúc ca.
import { seedFrom, nextRange, chance, nextInt, pick } from './rng.js'
import { makeFloat, drawerTotal } from './money.js'
import { cfg, emit, unlockTip } from './state.js'
import { createCustomer, createRegular, drainPatience, isGone, loseCustomer } from './customer.js'
import { beginCounter, confirmQr } from './order.js'
import { abandonDish } from './kitchen.js'
import { averageRating } from './scoring.js'
import { summarizeShift, settleShift } from './economy.js'

export function emptyLedger() {
  return { sales: 0, cash: 0, qr: 0, listValue: 0, undercharge: 0, overchange: 0, rounding: 0,
    cogs: 0, waste: 0, refunds: 0, tips: 0, fakeQrLoss: 0 }
}

// Số khách của ca: customersPerShift(day) ±1 theo sao trung bình (sàn 3, trần 8).
export function customerCount(state, ctx, day = state.day) {
  const f = cfg(ctx, 'customersPerShift')
  let n = typeof f === 'function' ? f(day) : Number(f) || 4
  const ratings = state.ratings || []
  if (day > 1 && ratings.length >= 5) {
    const avg = averageRating(ratings)
    if (avg >= 4.5) n += 1
    else if (avg < 3.5) n -= 1
  }
  return Math.max(3, Math.min(8, n))
}

// Lịch đến: khoảng cách = arrivalLoad × thời gian phục vụ kỳ vọng của khách trước × [0,85; 1,15];
// đoạn giữa ca × peakMul; sau khách hướng dẫn × tutorialGapMul. Co giãn để hệ số tải ρ ≤ maxLoad.
export function planArrivals(sh, list, ctx) {
  const N = list.length
  const gaps = []
  for (let i = 1; i < N; i++) {
    const prev = list[i - 1]
    let g = cfg(ctx, 'arrivalLoad') * prev.expectedSec * nextRange(sh, 0.85, 1.15)
    if (i >= N / 3 && i < (2 * N) / 3) g *= cfg(ctx, 'peakMul')
    if (prev.tutorial) g *= cfg(ctx, 'tutorialGapMul')
    gaps.push(g)
  }
  const work = list.slice(0, -1).reduce((s, c) => s + c.expectedSec, 0)
  const span = gaps.reduce((a, b) => a + b, 0)
  // chừa 1% cho sai số làm tròn mốc đến (0,1 giây)
  const target = cfg(ctx, 'maxLoad') * 0.99
  if (span > 0 && work / span > target) {
    const k = (work / span) / target
    for (let i = 0; i < gaps.length; i++) gaps[i] *= k
  }
  let t = cfg(ctx, 'firstArrival')
  const plan = []
  for (let i = 0; i < N; i++) {
    if (i > 0) t += gaps[i - 1]
    const at = Math.round(t * 10) / 10
    list[i].arriveAt = at
    plan.push({ customerId: list[i].id, arriveAt: at })
  }
  return plan
}

// Hệ số tải ρ = tổng thời gian phục vụ kỳ vọng (trừ khách cuối) / khoảng thời gian khách đến.
export function loadFactor(shift) {
  const plan = (shift.plan || []).slice().sort((a, b) => a.arriveAt - b.arriveAt)
  if (plan.length < 2) return 0
  const span = plan[plan.length - 1].arriveAt - plan[0].arriveAt
  const work = plan.slice(0, -1).reduce((s, p) => s + (shift.customers[p.customerId].expectedSec || 0), 0)
  return span > 0 ? work / span : Infinity
}

// Tạo ca mới cho state.day (ca đang dở thì trả lại ca đó).
export function startShift(state, ctx) {
  if (state.shift) return state.shift
  const day = state.day
  const float = makeFloat()
  const sh = {
    day, rng: seedFrom(state.seed, day), rngText: seedFrom(state.seed, day, 'text'),
    t: 0, paused: false,
    plan: [], customers: {}, queue: [], counter: null, tickets: [], cook: null,
    drawer: float, floatAmount: drawerTotal(float),
    qrBalance: 0, tipJar: 0,
    ledger: emptyLedger(),
    served: [], lost: [], missed: 0,
    scoreSheets: [], counterStreak: 0, nextTicketNo: 1,
    counts: {}, reputationGain: 0, tipsShown: 0, reviews: [], receipts: [],
    fixedCost: cfg(ctx, 'fixedCostPerShift'), loanRepayRate: cfg(ctx, 'loanRepayRate'),
    walletStart: state.wallet
  }
  const N = customerCount(state, ctx, day)
  const RG = (ctx.data && ctx.data.REGULARS) || {}
  const regIds = Object.keys(RG)
  // khách quen quay lại (từ ngày 2)
  let regularSlot = -1, regularId = null
  if (day >= 2 && regIds.length && chance(sh, cfg(ctx, 'regularReturnRate'))) {
    regularSlot = N > 1 ? nextInt(sh, 1, N - 1) : 0
    regularId = pick(sh, regIds)
  }
  const list = []
  for (let i = 0; i < N; i++) {
    const id = 'k' + (i + 1)
    let c
    if (day === 1 && i < 2 && RG[i === 0 ? 'co_thu' : 'ban_nam']) {
      c = createRegular(state, sh, ctx, i === 0 ? 'co_thu' : 'ban_nam', { id, tutorial: true })
    } else if (i === regularSlot) {
      c = createRegular(state, sh, ctx, regularId, { id, tutorial: false })
    } else {
      c = createCustomer(state, sh, ctx, { id })
    }
    list.push(c)
    sh.customers[id] = c
  }
  sh.plan = planArrivals(sh, list, ctx)
  state.shift = sh
  emit(ctx, 'shift.started', { day })
  return sh
}

// Tiến thời gian dt giây: khách tới, mở quầy, trừ kiên nhẫn, khách bỏ về, báo QR về.
export function advance(state, dt, ctx) {
  const sh = state.shift
  if (!sh || sh.paused || !(dt > 0)) return
  sh.t += dt
  const qmax = cfg(ctx, 'queueMax')
  for (const p of sh.plan) {
    const c = sh.customers[p.customerId]
    if (!c || c.status !== 'den' || p.arriveAt > sh.t) continue
    if (sh.queue.length < qmax) {
      c.status = 'xep_hang'
      c.arrivedAt = sh.t
      sh.queue.push(c.id)
      emit(ctx, 'customer.arrived', { customerId: c.id })
    } else {
      // hàng đầy: khách đi ngang (lỡ khách)
      c.status = 'bo_ve'
      c.lostReason = 'hang_day'
      sh.missed += 1
      emit(ctx, 'customer.lost', { customerId: c.id, reason: 'hang_day' })
    }
  }
  beginCounter(state, ctx)
  const left = drainPatience(state, dt, ctx)
  if (left.length) beginCounter(state, ctx)
  const c = sh.counter
  if (c && c.payMethod === 'qr' && !c.paid && c.qrArriveAt !== null && !c.qrArrived && sh.t >= c.qrArriveAt) {
    c.qrArrived = true
    emit(ctx, 'qr.arrived', { customerId: c.customerId, amount: c.amountDue })
    if (state.upgrades && state.upgrades.loa_bao_tien) confirmQr(state, ctx)
  }
}

// Mọi khách đã rời (phục vụ xong hoặc bỏ về) và không còn phiếu.
export function isShiftOver(state) {
  const sh = state.shift
  if (!sh) return false
  if (sh.counter || sh.tickets.length) return false
  if (sh.cook && sh.cook.phase !== 'xong') return false
  return Object.values(sh.customers).every(isGone)
}

export function setPaused(state, paused) {
  if (state.shift) state.shift.paused = !!paused
}

// Giờ trong game (06:00 → 10:00 theo tiến độ ca), dạng 'HH:MM'.
export function gameTime(shift) {
  const last = shift.plan.length ? shift.plan[shift.plan.length - 1].arriveAt : 0
  const total = Math.max(60, last + 90)
  const minutes = 360 + Math.min(1, shift.t / total) * 240
  const h = Math.floor(minutes / 60), m = Math.floor(minutes % 60)
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}

// Đóng các khách còn dở khi kết thúc ca sớm: khách đã trả tiền được hoàn tiền.
function closeRemaining(state, ctx) {
  const sh = state.shift
  if (sh.cook && sh.cook.phase !== 'xong') abandonDish(state, ctx)
  for (const c of Object.values(sh.customers)) {
    if (isGone(c)) continue
    if (c.status === 'den') { c.status = 'bo_ve'; c.lostReason = 'dong_ca'; continue }
    let paid = 0
    if (c.status === 'cho_mon' || c.status === 'nhan_mon') {
      paid = c.receipt && !(c.payMethod === 'qr' && c.fakeQr) ? c.receipt.total : 0
    } else if (sh.counter && sh.counter.customerId === c.id) {
      const k = sh.counter
      if (k.cashDeposited) paid = k.amountDue - 0
      else if (k.payMethod === 'qr' && k.paid && !k.fakeQr) paid = k.amountDue
    }
    if (paid > 0) sh.ledger.refunds += paid
    loseCustomer(state, c, 'dong_ca', ctx)
  }
  sh.tickets = []
  sh.counter = null
  sh.cook = null
}

function compactHistory(s) {
  return {
    day: s.day, served: s.served, lost: s.lost, missed: s.missed, profit: s.profit,
    cashSales: s.cashSales, qrSales: s.qrSales, tips: s.tips, cogs: s.cogs, waste: s.waste,
    refunds: s.refunds, undercharge: s.undercharge, overchange: s.overchange, fakeQrLoss: s.fakeQrLoss,
    fixedCost: s.fixedCost, drawerDiff: s.drawerDiff, avgStars: s.avgStars, reputationGain: s.reputationGain,
    counterErrors: s.counterErrors, kitchenErrors: s.kitchenErrors, loanRepaid: s.loanRepaid
  }
}

// Tất toán ví, cập nhật stats/ratings/reviews/history, day += 1, shift = null. Trả Summary.
export function endShift(state, ctx) {
  const sh = state.shift
  if (!sh) return null
  if (!isShiftOver(state)) closeRemaining(state, ctx)
  unlockTip(state, 'shift_end', ctx)
  const summary = summarizeShift(state, ctx && ctx.data)
  settleShift(state, summary)
  const st = state.stats
  const k = sh.counts || {}
  st.customersServed += summary.served
  st.customersLost += summary.lost
  st.dishesCooked += k.dishesCooked || 0
  st.perfectSteps += k.perfectSteps || 0
  st.changeCorrect += k.changeCorrect || 0
  st.changeWrong += k.changeWrong || 0
  st.readbacks += k.readbacks || 0
  st.qrConfirmed += k.qrConfirmed || 0
  st.fakeQrCaught += k.fakeQrCaught || 0
  st.flawlessDishes += k.flawlessDishes || 0
  st.totalRevenue += summary.cashSales + summary.qrSales
  st.shiftsPlayed += 1
  state.ratings = (state.ratings || []).concat(summary.ratings).slice(-30)
  state.reviews = (state.reviews || []).concat(sh.reviews || []).slice(-60)
  state.reputation += summary.reputationGain
  state.history = (state.history || []).concat([compactHistory(summary)]).slice(-60)
  state.day += 1
  state.shift = null
  emit(ctx, 'shift.ended', { day: summary.day, profit: summary.profit, served: summary.served, lost: summary.lost })
  return summary
}
