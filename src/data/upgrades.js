// Nâng cấp Chặng 1 (mua ở màn Chuẩn bị ca). Mỗi hiệu ứng phải vẽ ra trên màn hình.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const UPGRADES = deepFreeze({
  dao_thep: {
    id: 'dao_thep', name: 'Dao thép tốt', price: 150000, fromDay: 2, icon: 'dao_thep',
    desc: 'Vùng Hoàn hảo khi thái rộng hơn 20%, vạch chấm to và rõ hơn.',
    effect: { thaiMul: 1.2 }
  },
  chao_chong_dinh: {
    id: 'chao_chong_dinh', name: 'Chảo chống dính', price: 200000, fromDay: 3, icon: 'chao_chong_dinh',
    desc: 'Vùng chín khi canh lửa rộng hơn 15%, vùng xanh nở ra rõ ràng.',
    effect: { luaMul: 1.15 }
  },
  ghe_nhua: {
    id: 'ghe_nhua', name: 'Ghế nhựa chờ', price: 180000, fromDay: 3, icon: 'ghe_nhua',
    desc: 'Có ghế ngồi đợi, khách xếp hàng kiên nhẫn hơn 20%.',
    effect: { queuePatienceMul: 1.2 }
  },
  may_tinh: {
    id: 'may_tinh', name: 'Máy tính cầm tay', price: 150000, fromDay: 7, icon: 'may_tinh',
    desc: 'Tự cộng tổng tiền theo phiếu. Tiền thối vẫn phải tự tính nhé!',
    effect: { autoTotal: true }
  },
  loa_bao_tien: {
    id: 'loa_bao_tien', name: 'Loa báo tiền', price: 150000, fromDay: 5, icon: 'loa_bao_tien',
    desc: 'Tự xác nhận khi tiền chuyển khoản về và chặn ảnh chụp màn hình giả.',
    effect: { qrAutoConfirm: true, blockFakeQr: true }
  }
})
