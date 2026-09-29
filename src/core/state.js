// State gốc của save và vài tiện ích dùng chung cho lõi (đọc cân bằng, phát sự kiện, mở Mẹo nghề).

export const STATE_VERSION = 1
export const DEFAULT_RECIPE_IDS = Object.freeze(['banh_mi_op_la', 'tra_tac'])

// Giá trị mặc định khi ctx.data.BALANCE thiếu khóa (khớp mục 6 docs/kien-truc.md).
export const DEFAULT_BALANCE = Object.freeze({
  startWallet: 200000,
  fixedCostPerShift: 20000,
  queueMax: 3, ticketRailMax: 3,
  queuePatienceBase: 45, queuePatienceFloor: 32,
  counterDrainMul: 0.5,
  waitBudgetBase: 30, waitBudgetParMul: 2,
  arrivalLoad: 1.15, peakMul: 0.9, counterTimeEstimate: 20,
  customersPerShift: day => Math.min(8, 4 + Math.floor((day - 1) / 2)),
  qrFromDay: 4, fakeQrFromDay: 7, fakeQrRate: 0.04, qrRate: 0.25,
  leaveFromDay: 4,
  readbackCatchRate: 0.8, readbackPatienceCost: 0.08,
  zoneMulStage: 1.2, zoneDailyNarrow: 0.02, zoneFloor: 0.75, zoneMulCap: 1.6,
  gradeThresholds: [[90, 'tuyet_hao', 5], [75, 'ngon', 4], [60, 'duoc', 3], [40, 'kem', 2], [0, 'hong', 1]],
  stepLabels: [[90, 'Hoàn hảo'], [70, 'Tốt'], [50, 'Đạt'], [0, 'Hỏng']],
  tipFiveStar: 5000, tipBonus: 10000,
  reputationByStars: { 5: 3, 4: 2, 3: 1, 2: 0, 1: 0 },
  masteryLevels: [0, 5, 15],
  autoStepScore: 80, retryScoreCap: 85,
  loanAmount: 240000, loanRepayRate: 0.25, loanInterest: 0.10,
  // khóa bổ sung (không bắt buộc có trong src/data/balance.js)
  regularReturnRate: 0.15, regionBacRate: 0.3, maxLoad: 0.9, firstArrival: 3, tutorialGapMul: 1.5,
  noteRateMid: 0.2, noteRateLate: 0.35, noteFromDay: 3, splitFromDay: 5, splitLineRate: 0.15,
  surchargeFromDay: 6, multiLineFromDay: 3, lineCountWeights: [70, 25, 5],
  changeAskRate: 0.4, changeAskPatienceCost: 0.05, roundingMax: 5000,
  shortChangeDetectRate: 0.9, overChangeReturnRate: 0.5,
  loanOfferBelow: 50000
})

// Đọc một khóa cân bằng: ctx.data.BALANCE[key] nếu có, không thì mặc định.
export function cfg(ctx, key) {
  const B = ctx && ctx.data && ctx.data.BALANCE
  if (B && B[key] !== undefined) return B[key]
  return DEFAULT_BALANCE[key]
}

export function emit(ctx, type, payload) {
  if (ctx && typeof ctx.emit === 'function') ctx.emit(type, payload)
}

export function newRecipeProgress(boughtDay = 0) {
  return { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay }
}

export function defaultStats() {
  return {
    customersServed: 0, customersLost: 0, dishesCooked: 0, perfectSteps: 0,
    changeCorrect: 0, changeWrong: 0, readbacks: 0, qrConfirmed: 0, fakeQrCaught: 0,
    flawlessDishes: 0, totalRevenue: 0, shiftsPlayed: 0
  }
}

export function defaultSettings() {
  return { sound: true, vibrate: true, tips: true, reducedMotion: false, assistCash: false, assistMotion: false }
}

// data (tùy chọn): lấy các món source 'default' của chặng 1 thay cho danh sách mặc định.
export function defaultState(seed = 0, data = null) {
  let ids = DEFAULT_RECIPE_IDS
  if (data && data.RECIPES) {
    const found = Object.values(data.RECIPES).filter(r => r.source === 'default' && (r.chang ?? 1) <= 1).map(r => r.id)
    if (found.length) ids = found
  }
  const recipes = {}
  for (const id of ids) recipes[id] = newRecipeProgress(0)
  const startWallet = (data && data.BALANCE && data.BALANCE.startWallet) ?? DEFAULT_BALANCE.startWallet
  return {
    version: STATE_VERSION,
    seed: (Number(seed) >>> 0),
    shopName: '',
    day: 1,
    chang: 1,
    wallet: startWallet,
    reputation: 0,
    goldSpoons: 0,
    ratings: [],
    reviews: [],
    recipes,
    upgrades: {},
    tipsSeen: [],
    stats: defaultStats(),
    loan: null,
    settings: defaultSettings(),
    history: [],
    shift: null,
    clock: { maxSeen: 0 }
  }
}

// Mở thẻ Mẹo nghề đầu tiên có trigger = code mà người chơi chưa thấy.
// Ngoài ngày 1 (hướng dẫn), tối đa 1 thẻ mỗi ca; tắt khi settings.tips = false.
// Trả id thẻ hoặc null. Phát 'tip.unlocked' {tipId}.
export function unlockTip(state, code, ctx) {
  const tips = ctx && ctx.data && ctx.data.TIPS
  if (!tips || !code) return null
  if (state.settings && state.settings.tips === false) return null
  const list = Array.isArray(tips) ? tips : Object.values(tips)
  const seen = state.tipsSeen || (state.tipsSeen = [])
  const tip = list.find(t => t && t.trigger === code && !seen.includes(t.id))
  if (!tip) return null
  const sh = state.shift
  if (sh && sh.day > 1 && (sh.tipsShown || 0) >= 1) return null
  seen.push(tip.id)
  if (sh) sh.tipsShown = (sh.tipsShown || 0) + 1
  emit(ctx, 'tip.unlocked', { tipId: tip.id })
  return tip.id
}
