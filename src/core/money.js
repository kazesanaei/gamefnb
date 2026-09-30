// Tiền: số nguyên đồng. Két, thối tiền (quy hoạch động), cách khách đưa tiền.
import { weightedPick, pick } from './rng.js'

export const BILLS = Object.freeze([5000, 10000, 20000, 50000, 100000, 200000, 500000])   // Chặng 1–2
const UNIT = 5000

function groupThousands(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// 37000 → '37.000đ'; âm → '-37.000đ'
export function formatVND(n) {
  const v = Math.round(Number(n) || 0)
  return (v < 0 ? '-' : '') + groupThousands(Math.abs(v)) + 'đ'
}

function trimDecimal(x, digits) {
  return x.toFixed(digits).replace(/\.?0+$/, '').replace('.', ',')
}

// 37000 → '37k'; 37500 → '37,5k'; 1250000 → '1,25tr'; 800 → '800đ'
export function formatK(n) {
  const v = Math.round(Number(n) || 0)
  const sign = v < 0 ? '-' : ''
  const a = Math.abs(v)
  if (a >= 1000000) return sign + trimDecimal(a / 1000000, 2) + 'tr'
  if (a >= 1000) return sign + trimDecimal(a / 1000, 1) + 'k'
  return sign + a + 'đ'
}

export function drawerTotal(drawer) {
  let s = 0
  if (!drawer) return 0
  for (const k of Object.keys(drawer)) s += Number(k) * (Math.max(0, Number(drawer[k]) || 0))
  return s
}

// Quỹ tiền lẻ đầu ca 200.000đ.
export function makeFloat() {
  return { 5000: 8, 10000: 5, 20000: 3, 50000: 1, 100000: 0, 200000: 0, 500000: 0 }
}

export function emptyDrawer() {
  const d = {}
  for (const b of BILLS) d[b] = 0
  return d
}

// Cộng/trừ tờ tiền (sửa trực tiếp drawer). sign = +1 | -1
export function addBills(drawer, bills, sign = 1) {
  for (const k of Object.keys(bills || {})) {
    const n = Number(bills[k]) || 0
    if (!n) continue
    drawer[k] = (Number(drawer[k]) || 0) + sign * n
  }
  return drawer
}

export function billsCount(bills) {
  let c = 0
  for (const k of Object.keys(bills || {})) c += Number(bills[k]) || 0
  return c
}

// Số tờ ít nhất để thối đúng `amount` từ số tờ có thật trong két (quy hoạch động có giới hạn).
// Trả {count, bills} hoặc null nếu không thối được.
export function minBillsChange(amount, drawer) {
  amount = Math.round(Number(amount) || 0)
  if (amount < 0) return null
  if (amount === 0) return { count: 0, bills: {} }
  if (amount % UNIT !== 0) return null
  const V = amount / UNIT
  const INF = 1e9
  let dp = new Array(V + 1).fill(INF)
  dp[0] = 0
  const choices = []   // choices[i][v] = số tờ mệnh giá i dùng để đạt v
  for (let i = 0; i < BILLS.length; i++) {
    const d = BILLS[i] / UNIT
    const avail = Math.max(0, Math.floor(Number(drawer?.[BILLS[i]]) || 0))
    const next = new Array(V + 1).fill(INF)
    const ch = new Array(V + 1).fill(0)
    for (let v = 0; v <= V; v++) {
      const maxK = Math.min(avail, Math.floor(v / d))
      for (let k = 0; k <= maxK; k++) {
        const prev = dp[v - k * d]
        if (prev + k < next[v]) { next[v] = prev + k; ch[v] = k }
      }
    }
    choices.push(ch)
    dp = next
  }
  if (dp[V] >= INF) return null
  const bills = {}
  let v = V
  for (let i = BILLS.length - 1; i >= 0; i--) {
    const k = choices[i][v]
    if (k > 0) { bills[BILLS[i]] = k; v -= k * (BILLS[i] / UNIT) }
  }
  return { count: dp[V], bills }
}

export function canMakeChange(amount, drawer) {
  return minBillsChange(amount, drawer) !== null
}

export function roundUpTo(n, step) {
  return Math.ceil(n / step) * step
}

// M3: bước làm tròn giá vốn mỗi lượt nấu (nguyên liệu lẻ 100–400đ) và bước làm tròn tiền thưởng.
export const COST_STEP = 500
export const REWARD_STEP = 1000

// Giá vốn trừ vào ví: làm tròn tới bội 500đ gần nhất (0,5 làm tròn lên), để Tiền quán luôn là bội 500đ.
export function roundCost(n) {
  const v = Math.max(0, Number(n) || 0)
  return Math.round(v / COST_STEP) * COST_STEP
}

// Tiền thưởng (quà, thu nhập tham chiếu × hệ số…): làm tròn LÊN bội 1.000đ.
export function roundReward(n) {
  const v = Math.max(0, Number(n) || 0)
  return Math.ceil(Math.round(v) / REWARD_STEP) * REWARD_STEP
}

export function roundDownTo(n, step) {
  return Math.floor(n / step) * step
}

// Phân tích số tiền thành tờ (không giới hạn số tờ), tham lam — đúng với dãy BILLS.
export function composeGreedy(amount) {
  let rest = Math.round(amount)
  const bills = {}
  for (let i = BILLS.length - 1; i >= 0; i--) {
    const k = Math.floor(rest / BILLS[i])
    if (k > 0) { bills[BILLS[i]] = k; rest -= k * BILLS[i] }
  }
  return rest === 0 ? bills : null
}

function single(b) { return { [b]: 1 } }

// Cách khách đưa tiền cho hóa đơn `total` (mục 3.6 tài liệu thiết kế).
// persona.cash: 'exact' | 'small' | 'medium' | 'big' dịch trọng số. Chỉ dùng mệnh giá BILLS.
export function customerCash(holder, total, persona, day) {
  total = Math.max(0, Math.round(Number(total) || 0))
  day = Number(day) || 1
  const style = persona && persona.cash
  const smallest = BILLS.find(b => b >= total)
  const w = { exact: 20, smallest: 45, bigger: 20, big: day >= 4 ? 10 : 0, extra: day >= 5 ? 5 : 0 }
  if (style === 'exact') { w.exact *= 3; w.big *= 0.3 }
  else if (style === 'small') { w.smallest *= 1.5; w.big *= 0.3 }
  else if (style === 'medium') { w.bigger *= 1.5 }
  else if (style === 'big') { w.big *= 3; w.bigger *= 1.5; w.exact *= 0.5 }
  const kind = weightedPick(holder, Object.keys(w).map(k => ({ k, w: w[k] }))).k

  const fallback = () => {
    if (smallest !== undefined) return single(smallest)
    // hóa đơn lớn hơn tờ lớn nhất: làm tròn lên bội 100.000đ
    return composeGreedy(roundUpTo(total, 100000))
  }
  let bills = null
  if (total === 0) bills = {}
  else if (kind === 'exact') {
    bills = total % UNIT === 0 ? composeGreedy(total) : null
  } else if (kind === 'smallest') {
    bills = null
  } else if (kind === 'bigger') {
    const i = smallest !== undefined ? BILLS.indexOf(smallest) : -1
    if (i >= 0 && i + 1 < BILLS.length) bills = single(BILLS[i + 1])
  } else if (kind === 'big') {
    const opts = [200000, 500000].filter(b => b >= total && b <= 25 * total)
    if (opts.length) bills = single(pick(holder, opts))
  } else if (kind === 'extra') {
    // đưa thêm tiền lẻ để được thối chẵn, vd hóa đơn 35k: 50k + 5k → thối 20k
    if (smallest !== undefined && smallest > total) {
      const change = smallest - total
      for (const e of [5000, 10000, 20000]) {
        if (e >= smallest) break
        if (BILLS.includes(change + e)) { bills = { [smallest]: 1, [e]: 1 }; break }
      }
    }
  }
  if (!bills) bills = fallback()
  return { bills, total: drawerTotal(bills) }
}
