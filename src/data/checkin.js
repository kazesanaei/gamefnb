// Điểm danh 7 ô tích lũy (docs/de-xuat-thiet-ke.md mục 9.2, docs/can-bang.md mục 10).
// Lỡ ngày không mất ô: lần sau nhận ô kế tiếp. Mỗi ngày thật (đổi lúc 04:00 giờ Việt Nam) nhận 1 ô.
//
// Phần thưởng (Reward) dùng chung cho mọi hệ thống meta:
//   { money?: đồng, incomeMul?: bội thu nhập tham chiếu một ca (làm tròn lên bội 1.000đ lúc nhận),
//     gold?: Muỗng Vàng, rep?: danh tiếng, items?: {itemId: số lượng}, upgrade?: upgradeId,
//     fallback?: Reward (quy đổi khi đã có nâng cấp/hiện vật vĩnh viễn), cosmetic?: id, title?: id,
//     recipe?: recipeId, tem?: số Tem (của sự kiện theo ngữ cảnh), tipId?: id thẻ Mẹo nghề, unlock?: id }

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const CHECKIN = deepFreeze({
  slots: 7,
  // Vòng đầu "Tuần Khai Trương" (chỉ 1 lần): tặng hiện vật thay cho tiền.
  firstRound: {
    name: 'Tuần Khai Trương',
    rewards: [
      { gold: 10, cosmetic: 'vien_khai_truong' },
      { items: { phieu_cho_som: 1 } },
      { gold: 10 },
      { items: { bat_che_mua: 1 }, fallback: { money: 20000 } },
      // Dao thép tốt; đã có dao thì quy đổi thành 2 Phiếu Chợ Sớm (đúng giá trị ô 5 trong bảng cân bằng)
      { upgrade: 'dao_thep', fallback: { items: { phieu_cho_som: 2 } } },
      { gold: 15 },
      { gold: 20, money: 100000, title: 'chu_xe_moi_toanh', label: 'Rương Khai Trương' }
    ]
  },
  // Các vòng sau
  round: {
    name: 'Điểm danh',
    rewards: [
      { incomeMul: 0.3 },
      { items: { phieu_cho_som: 1 } },
      { gold: 10 },
      { incomeMul: 0.4 },
      { items: { phieu_cho_som: 2 } },
      { gold: 15 },
      { gold: 30, incomeMul: 0.5, label: 'Rương điểm danh' }
    ]
  }
})
