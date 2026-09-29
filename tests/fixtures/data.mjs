// Bộ dữ liệu mẫu nhỏ cho test lõi (đúng lược đồ mục 6 docs/kien-truc.md). Không import src/data.

export const BALANCE = Object.freeze({
  startWallet: 200000,
  fixedCostPerShift: 20000,
  stageFlow: ['order', 'thanh_toan', 'tinh_tien', 'lam_do'],
  stageLabels: { order: 'Order', thanh_toan: 'Thanh toán', tinh_tien: 'Tính tiền', lam_do: 'Làm đồ' },
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
  gradeLabels: { tuyet_hao: 'Tuyệt hảo', ngon: 'Ngon', duoc: 'Được', kem: 'Kém', hong: 'Hỏng' },
  stepLabels: [[90, 'Hoàn hảo'], [70, 'Tốt'], [50, 'Đạt'], [0, 'Hỏng']],
  tipFiveStar: 5000, tipBonus: 10000,
  reputationByStars: { 5: 3, 4: 2, 3: 1, 2: 0, 1: 0 },
  masteryLevels: [0, 5, 15],
  autoStepScore: 80, retryScoreCap: 85,
  loanAmount: 240000, loanRepayRate: 0.25, loanInterest: 0.10
})

export const INGREDIENTS = Object.freeze({
  banh_mi: { name: 'Bánh mì', icon: 'banh_mi', cost: 3000 },
  trung_ga: { name: 'Trứng gà', icon: 'trung_ga', cost: 2500 },
  trung_vit: { name: 'Trứng vịt', icon: 'trung_vit', cost: 3000 },
  dua_leo: { name: 'Dưa leo', icon: 'dua_leo', cost: 500 },
  hanh_la: { name: 'Hành lá', icon: 'hanh_la', cost: 250 },
  hanh_tay: { name: 'Hành tây', icon: 'hanh_tay', cost: 500 },
  nuoc_tuong: { name: 'Nước tương', icon: 'nuoc_tuong', cost: 250 },
  nuoc_mam: { name: 'Nước mắm', icon: 'nuoc_mam', cost: 250 },
  tuong_ot: { name: 'Tương ớt', icon: 'tuong_ot', cost: 250 },
  tra: { name: 'Trà', icon: 'tra', cost: 800 },
  tac: { name: 'Tắc', icon: 'tac', cost: 400 },
  chanh: { name: 'Chanh', icon: 'chanh', cost: 500 },
  duong: { name: 'Đường', icon: 'duong', cost: 300 },
  muoi: { name: 'Muối', icon: 'muoi', cost: 100 },
  da: { name: 'Đá', icon: 'da', cost: 400 },
  ly: { name: 'Ly nhựa', icon: 'ly', cost: 300 },
  sua_dac: { name: 'Sữa đặc', icon: 'sua_dac', cost: 1500 }
})

export const RECIPES = Object.freeze({
  banh_mi_op_la: {
    id: 'banh_mi_op_la', name: 'Bánh mì ốp la', chang: 1, price: 20000, cost: 9000,
    source: 'default', eventId: null, difficulty: 1, icon: 'mon_banh_mi_op_la',
    shelf: ['banh_mi', 'trung_ga', 'dua_leo', 'hanh_la', 'nuoc_tuong', 'tuong_ot', 'trung_vit', 'hanh_tay', 'nuoc_mam'],
    ingredients: [
      { id: 'banh_mi', role: 'chinh' }, { id: 'trung_ga', role: 'chinh', qty: 2 },
      { id: 'dua_leo', role: 'phu' }, { id: 'hanh_la', role: 'phu' }, { id: 'nuoc_tuong', role: 'phu' },
      { id: 'tuong_ot', role: 'tuy_chon' }
    ],
    decoys: ['trung_vit', 'hanh_tay', 'nuoc_mam'],
    notes: [
      { id: 'khong_hanh', label: 'Không hành', removes: ['hanh_la'] },
      { id: 'cay', label: 'Cay', adds: ['tuong_ot'], patch: { nem: { targets: { tuong_ot: 2 } } } },
      { id: 'long_dao', label: 'Lòng đào', group: 'do_chin', patch: { chien_trung: { zone: [0.45, 0.60] } } },
      { id: 'chin_ky', label: 'Chín kỹ', group: 'do_chin', patch: { chien_trung: { zone: [0.70, 0.85] } } },
      { id: 'them_trung', label: 'Thêm trứng', surcharge: 5000, patch: { dap_trung: { n: 3 } } }
    ],
    steps: [
      { id: 'chon', type: 'chon', label: 'Chọn nguyên liệu', par: 6, w: 1 },
      { id: 'rua_dua', type: 'cha', label: 'Rửa dưa leo', ing: 'dua_leo', params: { spots: 4 }, par: 3, w: 1 },
      { id: 'thai_dua', type: 'thai', label: 'Thái dưa leo', ing: 'dua_leo', after: ['rua_dua'],
        method: { options: ['thai_lat', 'thai_soi', 'bao'], correct: 'thai_lat' }, params: { cuts: 3 }, par: 4, w: 1 },
      { id: 'thai_hanh', type: 'thai', label: 'Thái hành lá', ing: 'hanh_la', params: { cuts: 4 }, par: 3, w: 1 },
      { id: 'dap_trung', type: 'cham', label: 'Đập trứng vào chảo', ing: 'trung_ga', params: { mode: 'exact', n: 2, target: true }, par: 2, w: 2 },
      { id: 'chien_trung', type: 'lua', label: 'Chiên trứng', ing: 'trung_ga', after: ['dap_trung'], critical: true,
        params: { period: 5, zone: [0.55, 0.72] }, par: 5, w: 3, retryCost: 6000 },
      { id: 'nem', type: 'cham', label: 'Nêm nước tương', ing: 'nuoc_tuong', after: ['chien_trung'],
        params: { mode: 'targets', targets: { nuoc_tuong: 1 } }, par: 2, w: 1 }
    ]
  },
  tra_tac: {
    id: 'tra_tac', name: 'Trà tắc', chang: 1, price: 10000, cost: 3000,
    source: 'default', eventId: null, difficulty: 1, icon: 'mon_tra_tac',
    shelf: ['tra', 'tac', 'duong', 'da', 'ly', 'chanh', 'muoi', 'sua_dac'],
    ingredients: [
      { id: 'tra', role: 'chinh' }, { id: 'tac', role: 'chinh', qty: 3 }, { id: 'duong', role: 'chinh' },
      { id: 'ly', role: 'chinh' }, { id: 'da', role: 'phu' }
    ],
    decoys: ['chanh', 'muoi', 'sua_dac'],
    notes: [
      { id: 'it_duong', label: 'Ít đường', group: 'duong', patch: { nem_duong: { n: 1 } } },
      { id: 'nhieu_duong', label: 'Nhiều đường', group: 'duong', patch: { nem_duong: { n: 3 } } },
      { id: 'khong_da', label: 'Không đá', removes: ['da'] }
    ],
    steps: [
      { id: 'chon', type: 'chon', label: 'Chọn nguyên liệu', par: 5, w: 1 },
      { id: 'thai_tac', type: 'thai', label: 'Bổ đôi tắc', ing: 'tac', params: { cuts: 3 }, par: 3, w: 1 },
      { id: 'vat_tac', type: 'cham', label: 'Vắt tắc', ing: 'tac', after: ['thai_tac'], params: { mode: 'min', N: 6, T: 3 }, par: 3, w: 1 },
      { id: 'rot_tra', type: 'rot', label: 'Rót trà', ing: 'tra', params: { zone: [0.70, 0.82] }, par: 3, w: 2 },
      { id: 'nem_duong', type: 'cham', label: 'Nêm đường', ing: 'duong', params: { mode: 'exact', n: 2, target: false }, par: 2, w: 3 },
      { id: 'them_da', type: 'cham', label: 'Thêm đá', ing: 'da', params: { mode: 'exact', n: 2, target: false }, par: 2, w: 1 },
      { id: 'lac', type: 'cha', label: 'Lắc đều', after: ['rot_tra', 'nem_duong', 'vat_tac'], params: { strokes: 6 }, par: 2, w: 1 }
    ]
  }
})

export const METHOD_LABELS = Object.freeze({ thai_lat: 'Thái lát', thai_soi: 'Thái sợi', bao: 'Bào' })

export const MINIGAME_TYPES = Object.freeze({
  chon: { name: 'Chọn nguyên liệu', hint: 'Chạm để bỏ vào rổ, chạm lần nữa để lấy ra.' },
  cha: { name: 'Chà rửa', hint: 'Vuốt qua lại lên các vết bẩn.' },
  thai: { name: 'Thái', hint: 'Kéo dao tới vạch chấm, nhấc tay để cắt.' },
  cham: { name: 'Chạm', hint: 'Chạm đúng số lần.' },
  lua: { name: 'Canh lửa', hint: 'Nhấc chảo khi kim nằm trong vùng xanh.' },
  rot: { name: 'Rót', hint: 'Giữ để rót, thả tay đúng vạch.' }
})

export const PERSONAS = Object.freeze({
  hoc_sinh: { name: 'Học sinh', weight: 30, patience: 1.0, fromDay: 1, address: ['con', 'em'], cash: 'small', qrRate: 0.3 },
  cong_nhan: { name: 'Công nhân', weight: 20, patience: 0.6, fromDay: 1, address: ['anh', 'chị'], cash: 'exact', qrRate: 0.1 },
  co_chu: { name: 'Cô chú', weight: 20, patience: 1.3, fromDay: 1, address: ['cô', 'chú'], cash: 'big', qrRate: 0.05 },
  van_phong: { name: 'Dân văn phòng', weight: 20, patience: 0.8, fromDay: 4, address: ['anh', 'chị'], cash: 'medium', qrRate: 0.7 },
  kho_tinh: { name: 'Khách khó tính', weight: 10, patience: 0.85, fromDay: 5, address: ['anh', 'chị'], cash: 'medium', qrRate: 0.3, strict: true }
})

export const REGULARS = Object.freeze({
  co_thu: { id: 'co_thu', name: 'Cô Thu', persona: 'co_chu', gender: 'nu', region: 'nam', favorite: { recipeId: 'banh_mi_op_la', notes: [] } },
  ban_nam: { id: 'ban_nam', name: 'Bạn Nam', persona: 'hoc_sinh', gender: 'nam', region: 'bac', favorite: 'tra_tac' }
})

export const NAMES = Object.freeze({ nam: ['Tuấn', 'Hùng', 'Minh'], nu: ['Lan', 'Hoa', 'Mai'] })

export const DIALOGUE = Object.freeze({
  apologies: [
    { text: 'Dạ, em xin lỗi, lỗi ở em. Em làm lại ngay ạ.', correct: true },
    { text: 'Tại mình gọi không rõ thôi.', correct: false },
    { text: 'Khẩu vị mỗi người mỗi khác mà.', correct: false }
  ]
})

export function makeSpeech({ request, persona, region, recipes, rand }) {
  const self = persona && persona.address ? persona.address[Math.floor(rand() * persona.address.length)] : 'em'
  const items = request.map(l => {
    const r = recipes[l.recipeId]
    const notes = (l.notes || []).map(id => r.notes.find(n => n.id === id).label.toLowerCase())
    return `${l.qty} ${r.name.toLowerCase()}${notes.length ? ' ' + notes.join(', ') : ''}`
  }).join(', ')
  return `Cho ${self} ${items} ${region === 'bac' ? 'nhé' : 'nha'}!`
}

export function makeLine(kind, { region }) {
  const map = { readback_ok: 'Đúng rồi.', readback_wrong: 'Sai rồi em ơi.', total_too_high: 'Sao nhiều vậy?', total_ok: 'Đây em.', change_short: 'Thiếu tiền rồi.', change_over_returned: 'Dư nè em.', thanks: 'Cảm ơn nha.' }
  return (map[kind] || 'Dạ.') + (region === 'bac' ? '' : '')
}

export function makeReview({ stars, errors, dishName, ingredientName }) {
  if (errors && errors.includes('thieu_nguyen_lieu')) return `Thiếu ${ingredientName || 'nguyên liệu'} rồi.`
  if (stars >= 5) return `${dishName} ngon tuyệt!`
  if (stars >= 3) return `${dishName} tạm được.`
  return 'Lần sau làm kỹ hơn nha.'
}

export const TIPS = Object.freeze([
  { id: 'doc_lai_order', group: 'quay', text: 'Luôn đọc lại order trước khi báo tổng.', trigger: 'first_readback' },
  { id: 'dem_hai_lan', group: 'quay', text: 'Đếm tiền thối hai lần.', trigger: 'change_wrong' },
  { id: 'qr_dung_so', group: 'quay', text: 'Chỉ xác nhận khi tiền đã về.', trigger: 'fake_qr' },
  { id: 'dinh_luong', group: 'kho', text: 'Định lượng chuẩn giúp món đồng đều.', trigger: 'thieu_nguyen_lieu' }
])

export const UPGRADES = Object.freeze({
  dao_thep: { id: 'dao_thep', name: 'Dao thép tốt', price: 150000, fromDay: 2, desc: 'Vùng thái rộng hơn 20%.', effect: { thaiMul: 1.2 } },
  chao_chong_dinh: { id: 'chao_chong_dinh', name: 'Chảo chống dính', price: 200000, fromDay: 3, desc: 'Vùng chín rộng hơn 15%.', effect: { luaMul: 1.15 } },
  ghe_nhua: { id: 'ghe_nhua', name: 'Ghế nhựa chờ', price: 180000, fromDay: 3, desc: 'Khách kiên nhẫn hơn 20%.', effect: { queuePatienceMul: 1.2 } },
  may_tinh: { id: 'may_tinh', name: 'Máy tính cầm tay', price: 150000, fromDay: 7, desc: 'Tự cộng tổng.', effect: { autoTotal: true } },
  loa_bao_tien: { id: 'loa_bao_tien', name: 'Loa báo tiền', price: 150000, fromDay: 5, desc: 'Tự xác nhận QR, chặn ảnh giả.', effect: { qrAutoConfirm: true, blockFakeQr: true } }
})

export const STRINGS = Object.freeze({ gameTitle: 'Bếp Khởi Nghiệp', openShift: 'Mở hàng' })

export const DATA = Object.freeze({
  BALANCE, INGREDIENTS, RECIPES, METHOD_LABELS, MINIGAME_TYPES,
  PERSONAS, REGULARS, NAMES, DIALOGUE, makeSpeech, makeLine, makeReview, TIPS, UPGRADES, STRINGS
})

// ctx cho test: ghi lại sự kiện đã phát.
export function makeCtx(data = DATA) {
  const events = []
  return { data, events, emit: (type, payload) => events.push({ type, payload }) }
}
