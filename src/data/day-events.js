// Sự kiện ngày (docs/de-xuat-thiet-ke.md mục 9.3a): báo trước ở Tổng kết ca hôm trước, hiện ở màn Chuẩn bị.
// Từ ngày game `fromDay`, mỗi ngày game có `chance` xảy ra 1 sự kiện, bốc theo hạt giống của save + ngày game.
// effects: customerMul (nhân số khách, làm tròn, sàn 3), extraCustomers (+ khách), patienceMul (kiên nhẫn xếp hàng),
//   tipMul (tip nhân lên, vẫn làm tròn bội 5.000đ), recipeWeight {recipeId: hệ số được gọi},
//   noteBoost {recipeId: [noteId]} (tăng khả năng khách dặn các ghi chú này).
// choice: lựa chọn ở màn Chuẩn bị, có giá (cost, đồng) và hiệu ứng thay thế; freeWithItem: có hiện vật thì miễn phí.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const DAY_EVENT_CONFIG = deepFreeze({
  fromDay: 3,
  chance: 0.3,
  noteBoostRate: 0.35,   // xác suất thêm 1 ghi chú "hợp thời tiết" cho dòng chưa có ghi chú
  minCustomers: 3
})

export const DAY_EVENTS = deepFreeze({
  troi_mua: {
    id: 'troi_mua', name: 'Trời mưa', icon: 'troi_mua', w: 30, fromDay: 3,
    desc: 'Mưa lâm râm, khách thưa hơn nhưng chịu khó chờ hơn.',
    effects: { customerMul: 0.8, patienceMul: 1.2 },
    choice: {
      id: 'cang_bat', label: 'Căng bạt', cost: 20000, freeWithItem: 'bat_che_mua',
      desc: 'Căng bạt che mưa để khách vẫn ghé: khách chỉ giảm nhẹ.',
      effects: { customerMul: 0.95, patienceMul: 1.2 }
    }
  },
  nang_nong: {
    id: 'nang_nong', name: 'Nắng nóng', icon: 'nang_nong', w: 30, fromDay: 3,
    desc: 'Trời oi bức, ai đi ngang cũng muốn một ly mát lạnh.',
    effects: {
      extraCustomers: 1,
      recipeWeight: { tra_tac: 2, ca_phe_sua_da: 2 },
      noteBoost: { tra_tac: ['it_duong'], ca_phe_sua_da: ['it_ngot'] }
    }
  },
  lanh_luong: {
    id: 'lanh_luong', name: 'Ngày lãnh lương', icon: 'lanh_luong', w: 20, fromDay: 3,
    desc: 'Đầu tháng lãnh lương, khách vui vẻ, hào phóng tiền tip hơn.',
    effects: { tipMul: 1.5 }
  },
  cho_phien: {
    id: 'cho_phien', name: 'Chợ phiên', icon: 'cho_phien', w: 20, fromDay: 3,
    desc: 'Hẻm họp chợ phiên, người qua lại đông hơn hẳn. Ca sẽ dài hơn một chút.',
    effects: { customerMul: 1.3 }
  }
})
