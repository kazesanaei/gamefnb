// Điều kiện lên chặng (docs/de-xuat-thiet-ke.md mục 8 và 14.1, docs/can-bang.md mục 13).
// MVP: đủ điều kiện lên Chặng 2 thì hiện màn "Quán cóc vỉa hè – sắp khai trương" với nút bị khóa;
// người chơi vẫn chơi tiếp Chặng 1 với các mục tiêu sau khi đủ điều kiện.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const STAGE_UP = deepFreeze({
  2: {
    chang: 2, name: 'Quán cóc vỉa hè', locked: true, lockedText: 'Sắp có ở bản sau',
    screenTitle: 'Quán cóc vỉa hè – sắp khai trương',
    requirements: [
      // 150 theo docs/can-bang.md mục 13: người chơi trung bình (khoảng 4,0–4,2 sao) tới 150 ở khoảng ca 9–10,
      // không sớm hơn ca 8 nên chưa cần nâng lên 200 (tests/unit/integration-meta.test.mjs, người chơi trung bình).
      { id: 'danh_tieng', kind: 'reputation', target: 150, label: 'Danh tiếng {cur}/{target}',
        hint: 'Phục vụ thêm khách thật chu đáo: khách 5 sao cho nhiều danh tiếng nhất.' },
      { id: 'sao', kind: 'avgRating', target: 3.8, label: 'Sao trung bình {cur} (cần từ {target})',
        hint: 'Đọc lại đơn, thối đúng, nấu đủ nguyên liệu để khách chấm cao hơn.' },
      { id: 'cong_thuc', kind: 'recipes', target: 3, label: 'Công thức {cur}/{target}',
        hint: 'Ghé Chợ Công Thức mua thêm món mới.' },
      { id: 'thao_mon', kind: 'mastery', level: 2, target: 2, label: 'Món thạo cấp 2: {cur}/{target}',
        hint: 'Nấu thêm {n} lần Ngon món {mon}.' },
      { id: 'chuoi_chinh', kind: 'chain', chainId: 'ngay_dau_ra_pho', target: 1, label: 'Chuỗi "Ngày đầu ra phố"',
        hint: 'Làm tiếp bước {step} của Dì Sáu: {text}.' },
      { id: 'tien', kind: 'wallet', target: 500000, noLoan: true, label: 'Tiền quán {cur}/{target}',
        hint: 'Để dành thêm {money}. Đang nợ Dì Sáu thì phải trả hết trước.' }
    ]
  }
})

// Mục tiêu sau khi đủ điều kiện (Chặng 1 MVP).
export const POST_GOALS = deepFreeze({
  flawless: { label: 'Sưu tập "Không tì vết" cho mỗi món đang bán' },
  mastery: { level: 3, label: 'Đưa mọi món lên thạo cấp 3' },
  records: { label: 'Kỷ lục ca: lãi cao nhất, nhiều khách 5 sao nhất, chuỗi Quầy chuẩn dài nhất' }
})
