// Hằng số cân bằng game (Chặng 1). Đúng mục 6 docs/kien-truc.md.

export const BALANCE = Object.freeze({
  startWallet: 200000,
  fixedCostPerShift: 20000,
  // thứ tự 4 khâu, nhãn: Order · Thanh toán · Tính tiền · Làm đồ
  stageFlow: Object.freeze(['order', 'thanh_toan', 'tinh_tien', 'lam_do']),
  stageLabels: Object.freeze({ order: 'Order', thanh_toan: 'Thanh toán', tinh_tien: 'Tính tiền', lam_do: 'Làm đồ' }),
  queueMax: 3, ticketRailMax: 3,
  queuePatienceBase: 45, queuePatienceFloor: 32,          // giây
  counterDrainMul: 0.5,
  waitBudgetBase: 30, waitBudgetParMul: 2,               // B = 30 + 2 × tổng par
  arrivalLoad: 1.15, peakMul: 0.9, counterTimeEstimate: 20,
  customersPerShift: day => Math.min(8, 4 + Math.floor((day - 1) / 2)),
  qrFromDay: 4, fakeQrFromDay: 7, fakeQrRate: 0.04, qrRate: 0.25,
  leaveFromDay: 4,
  readbackCatchRate: 0.8, readbackPatienceCost: 0.08,
  zoneMulStage: 1.2, zoneDailyNarrow: 0.02, zoneFloor: 0.75, zoneMulCap: 1.6,
  gradeThresholds: Object.freeze([
    Object.freeze([90, 'tuyet_hao', 5]), Object.freeze([75, 'ngon', 4]), Object.freeze([60, 'duoc', 3]),
    Object.freeze([40, 'kem', 2]), Object.freeze([0, 'hong', 1])
  ]),
  gradeLabels: Object.freeze({ tuyet_hao: 'Tuyệt hảo', ngon: 'Ngon', duoc: 'Được', kem: 'Kém', hong: 'Hỏng' }),
  stepLabels: Object.freeze([
    Object.freeze([90, 'Hoàn hảo']), Object.freeze([70, 'Tốt']), Object.freeze([50, 'Đạt']), Object.freeze([0, 'Hỏng'])
  ]),
  tipFiveStar: 5000, tipBonus: 10000,                    // bội 5.000đ, bỏ vào hũ tip
  reputationByStars: Object.freeze({ 5: 3, 4: 2, 3: 1, 2: 0, 1: 0 }),
  masteryLevels: Object.freeze([0, 5, 15]),              // goodCooks cần cho cấp 1,2,3
  autoStepScore: 80, retryScoreCap: 85,
  loanAmount: 240000, loanRepayRate: 0.25, loanInterest: 0.10
})
