// State gốc của save và vài tiện ích dùng chung cho lõi (đọc cân bằng, phát sự kiện, mở Mẹo nghề).

// Phiên bản cấu trúc save: 1 = M1 (0.1), 2 = M2–M3 (0.2–0.3), 3 = M4 (0.4: tình huống/sự kiện tiền, hàng hiếm).
// save.migrate nâng mọi bản cũ lên bản này.
export const STATE_VERSION = 3
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
  tipFiveStar: 5000, tipMinBill: 20000, strictFiveStarRep: 1,
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
  loanOfferBelow: 20000,  // mời vay khi Tiền quán < chi phí cố định 1 ca (thiết kế mục Dì Sáu cho mượn)
  // M2: thu nhập tham chiếu một ca theo ngày game [từ ngày, đồng] (cơ sở tính thưởng; docs/can-bang.md mục 9)
  refIncomeTable: [[1, 20000], [3, 35000], [5, 65000], [7, 85000], [9, 100000]],
  eventCustomerCap: 10,
  // M4: trần tiền sự kiện mỗi ngày thật (hệ số × thu nhập tham chiếu): phạt/chi bắt buộc và tiền thưởng
  eventDayCap: { lossIncomeMul: 1, gainIncomeMul: 1 }
})

// Thu nhập tham chiếu một ca của ngày game `day` (đồng).
export function refIncomeFor(ctx, day) {
  const table = cfg(ctx, 'refIncomeTable') || DEFAULT_BALANCE.refIncomeTable
  let v = table.length ? table[0][1] : 0
  for (const [from, amount] of table) if (day >= from) v = amount
  return v
}

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
    flawlessDishes: 0, totalRevenue: 0, shiftsPlayed: 0,
    // M2: đếm trực tiếp qua bus (src/core/stats.js), không qua endShift
    fiveStarCustomers: 0, goodDishes: 0, excellentDishes: 0, perfectThai: 0, perfectLua: 0,
    changeOptimal: 0, readbackClean: 0, fakeQrDetected: 0, recipesBought: 0, upgradesBought: 0,
    questsClaimed: 0, checkins: 0, mailClaimed: 0, tastings: 0, temEarned: 0
  }
}

// Các trường meta M2 của save (điểm danh, nhiệm vụ, hộp thư, chuỗi, shop, sự kiện, lên chặng).
// mailVersion '' = save mới (không nhận thư phiên bản); save cũ nâng cấp từ version 1 đặt '0.1.0'.
export function defaultMeta() {
  return {
    items: { phieu_cho_som: 0, bat_che_mua: 0 },
    cosmetics: { owned: [], equipped: { du: null, bien: null, trang_tri: null } },
    titles: [],
    unlocks: [],
    prep: { day: 0, coupon: false, dayEventChoice: null },
    checkin: { round: 1, next: 0, lastDay: '', total: 0 },
    daily: { dayKey: '', gameDay: 0, quests: [], prevIds: [], rerolls: 0, chestClaimed: false },
    mail: { list: [], pushed: [], monthly: {}, seenVersion: '', pendingReviews: [] },
    chains: {},
    shop: { tried: [] },
    eventRecipes: {},        // món sự kiện đã nhận: recipeId → {eventId, label, day} (giữ vĩnh viễn, bán quanh năm)
    tasting: null,
    events: {},
    realDays: { first: '', last: '', count: 0 },
    progression: {
      stageUpReady: false, stageUpSeen: false,
      records: { bestProfit: null, mostFiveStars: 0, longestStreak: 0 },
      cur: { fiveStars: 0 }
    },
    track: { rbCustomer: null, rbFirst: false },
    // M4: kho nguyên liệu và công thức hiếm (src/core/rare.js)
    rare: defaultRare()
  }
}

// M4: kho hàng hiếm (src/core/rare.js, thiết kế mục C.1): stock {ingId: số phần} (0..stockMax), fragments {recipeId: số
// mảnh công thức hiếm}, pity {ing: số lượt Giỏ chợ liền không ra nguyên liệu, frag: số lần liền ở nguồn có tỉ lệ mà không
// ra mảnh}, today = sổ của ngày thật đang chơi {key, got: phần đã nhận, frags: mảnh đã nhận, stalls: [phiên hàng đã ghé],
// strangerDay: ngày thật khách lạ đã ghé}, seen: nguyên liệu hiếm đã từng có, pendingStall: {id, dayKey} khi đang lựa hàng.
export function defaultRareToday() {
  return { key: '', got: 0, frags: 0, stalls: [], strangerDay: '' }
}

export function defaultRare() {
  return { stock: {}, fragments: {}, pity: { ing: 0, frag: 0 }, today: defaultRareToday(), seen: [], pendingStall: null }
}

// Mức "Tần suất sự kiện" (Cài đặt; M3 gọi là tần suất tình huống trong ca): Nhiều / Vừa / Ít. M4: áp cho cả sự kiện
// ngày và tình huống trong ca; mức 'it' chỉ gồm sự kiện/tình huống loại tốt (kind 'tot'), không có khoản phạt.
export const INCIDENT_FREQUENCIES = Object.freeze(['nhieu', 'vua', 'it'])

// Mức tần suất sự kiện đang chọn trong Cài đặt (sai hoặc thiếu thì 'vua'). Dùng chung cho sự kiện ngày (events.js)
// và tình huống trong ca (incidents.js).
export function eventFrequency(state) {
  const f = state && state.settings && state.settings.incidentFrequency
  return INCIDENT_FREQUENCIES.includes(f) ? f : 'vua'
}

export function defaultSettings() {
  return {
    sound: true, vibrate: true, tips: true, reducedMotion: false, assistCash: false, assistMotion: false,
    // M3: âm lượng 0..1; tần suất tình huống trong ca ('nhieu' | 'vua' | 'it')
    volume: 0.8, incidentFrequency: 'vua'
  }
}

// M3: tình huống trong ca (src/core/incidents.js): since = số ca liền (từ ngày có tình huống) chưa gặp tình huống nào
// (bảo hiểm), recent = loại gặp gần nhất (không lặp), log = nhật ký ngắn, debts = sổ ghi nợ khách quen,
// bonus = khách thêm ở ca sau ({day, customers}), total = số tình huống đã xử lý.
// M4: lastKind = loại ('tot' | 'chon' | 'xau') của tình huống gần nhất đã xử lý, lastLoss = tỉ lệ lỗ của nó so với trần
// (0..1) → luật nhịp (không 2 cái xấu liền nhau, vừa lỗ nặng thì ca sau nhẹ nhàng); day = sổ tiền sự kiện của ngày thật
// đang chơi {key, loss, gain} (trần phạt/thưởng mỗi ngày thật, economy.eventMoneyIn/eventMoneyOut); warn = lần nhắc
// nhở gần nhất của sự kiện ngày có "nhắc nhở trước, tái phạm mới phạt" {eventId: ngày game} (Kiểm tra vệ sinh an toàn
// thực phẩm, events.finishShiftEvents).
// M4 (soát lỗi): lastEvent = loại của sự kiện gần nhất trên dòng thời gian chung (sự kiện ngày lúc mở ca, rồi các tình
// huống trong ca theo thứ tự xử lý) → tình huống kế tiếp không bốc loại xấu khi sự kiện ngay trước là loại xấu;
// announced = sự kiện ngày đã chốt {ngày game: id | ''} (đã báo trước / đang diễn ra, đổi mức "Tần suất sự kiện" không
// bốc lại; events.announceDayEvent).
export function defaultEventDay() {
  return { key: '', loss: 0, gain: 0 }
}

export function defaultIncidents() {
  return { since: 0, recent: [], log: [], debts: [], bonus: null, total: 0, lastKind: null, lastLoss: 0, day: defaultEventDay(), warn: {},
    lastEvent: null, announced: {} }
}

// M3: Sổ tay nghề (src/core/notebook.js): claimed = nhóm Mẹo nghề đã nhận thưởng đủ nhóm (mỗi nhóm 1 lần).
export function defaultNotebook() {
  return { claimed: [] }
}

// M3: mốc sao lưu (ms, giờ máy do giao diện ghi): lastAt = lần chép/tải mã sao lưu gần nhất,
// since = lần đầu bản lưu này được mở ở bản có sao lưu (làm mốc nhắc khi chưa sao lưu lần nào).
export function defaultBackupInfo() {
  return { lastAt: 0, since: 0 }
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
    clock: { maxSeen: 0 },
    rev: 0,                  // số hiệu bản ghi, tăng mỗi lần lưu (chống tab cũ ghi đè bản mới hơn)
    backup: defaultBackupInfo(),
    incidents: defaultIncidents(),
    notebook: defaultNotebook(),
    ...defaultMeta()
  }
}

// Mở thẻ Mẹo nghề đầu tiên có trigger = code mà người chơi chưa thấy.
// Ngoài ngày 1 (hướng dẫn), tối đa 1 thẻ mỗi ca. Công tắc "Mẹo nghề" (settings.tips = false) chỉ tắt thẻ NỔI trong ca
// (giao diện không hiện): thẻ vẫn được mở và ghi vào Sổ tay nghề, nên thưởng đủ nhóm vẫn đạt được.
// Trả id thẻ hoặc null. Phát 'tip.unlocked' {tipId}.
export function unlockTip(state, code, ctx) {
  const tips = ctx && ctx.data && ctx.data.TIPS
  if (!tips || !code) return null
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
