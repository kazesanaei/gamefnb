// Kiểu khách, khách quen và kho tên.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

// `address`: cách khách tự xưng. `selfByGender`: xưng hô theo giới (dialogue.js dùng).
export const PERSONAS = deepFreeze({
  hoc_sinh: {
    name: 'Học sinh', weight: 30, patience: 1.0, fromDay: 1, address: ['con', 'em'], cash: 'small', qrRate: 0.3,
    selfByGender: { nam: ['con', 'em'], nu: ['con', 'em'] }
  },
  cong_nhan: {
    name: 'Công nhân', weight: 20, patience: 0.6, fromDay: 1, address: ['anh', 'chị'], cash: 'exact', qrRate: 0.1,
    selfByGender: { nam: ['anh'], nu: ['chị'] }
  },
  co_chu: {
    name: 'Cô chú', weight: 20, patience: 1.3, fromDay: 1, address: ['cô', 'chú'], cash: 'big', qrRate: 0.05,
    selfByGender: { nam: ['chú'], nu: ['cô'] }
  },
  van_phong: {
    name: 'Dân văn phòng', weight: 20, patience: 0.8, fromDay: 4, address: ['anh', 'chị'], cash: 'medium', qrRate: 0.7,
    selfByGender: { nam: ['anh'], nu: ['chị'] }
  },
  kho_tinh: {
    name: 'Khách khó tính', weight: 10, patience: 0.85, fromDay: 5, address: ['anh', 'chị'], cash: 'medium', qrRate: 0.3,
    strict: true,
    selfByGender: { nam: ['anh'], nu: ['chị'] }
  }
})

// Khách quen: ngày 1 hướng dẫn, sau đó thỉnh thoảng quay lại gọi món ruột. `self`: cách tự xưng cố định.
export const REGULARS = deepFreeze({
  co_thu: {
    id: 'co_thu', name: 'Cô Thu', persona: 'co_chu', gender: 'nu', region: 'nam', self: 'cô',
    favorite: { recipeId: 'banh_mi_op_la', notes: [] },
    greeting: 'Cô Thu nè con! Hôm nay xe mở hàng, cô ủng hộ liền.',
    returnGreeting: 'Như mọi khi nha con!',
    thanks: 'Ngon lắm, mai cô ghé nữa nghen.'
  },
  ban_nam: {
    id: 'ban_nam', name: 'Bạn Nam', persona: 'hoc_sinh', gender: 'nam', region: 'nam', self: 'em',
    favorite: { recipeId: 'tra_tac', notes: [] },
    greeting: 'Em là Nam, nhà ở cuối hẻm nè. Đi học về khát nước quá!',
    returnGreeting: 'Như mọi khi nha!',
    thanks: 'Đã quá! Mai em rủ tụi bạn ra uống.'
  }
})

// Tên gọi (không kèm họ), dùng chung với xưng hô theo kiểu khách.
export const NAMES = deepFreeze({
  nam: ['Tuấn', 'Hùng', 'Minh', 'Phúc', 'Long', 'Khang', 'Bảo', 'Đạt', 'Quân', 'Tín',
    'Hải', 'Sơn', 'Toàn', 'Vinh', 'Lộc', 'Hiếu', 'Thịnh', 'Duy', 'Tài', 'Nghĩa'],
  nu: ['Lan', 'Hoa', 'Mai', 'Hằng', 'Trang', 'Ngọc', 'Vy', 'Linh', 'Hương', 'Thảo',
    'Nhung', 'Yến', 'Diễm', 'Trâm', 'Hạnh', 'Loan', 'My', 'Tuyết', 'Oanh', 'Quyên']
})
