// 20 thẻ Mẹo nghề của MVP. Mỗi thẻ mở lần đầu khi gặp `trigger` (mã sự kiện hoặc mã lỗi).
// Con số trong mẹo là số liệu minh họa, cần người làm nghề duyệt lại trước khi dùng đào tạo.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const TIP_GROUPS = deepFreeze({
  quay: 'Quầy',
  bep: 'Bếp',
  kho: 'Kho',
  phuc_vu: 'Phục vụ, Quản lý'
})

export const TIPS = deepFreeze([
  // Quầy
  { id: 'doc_lai_order', group: 'quay', title: 'Đọc lại order', trigger: 'first_readback',
    text: 'Luôn đọc lại order trước khi báo tổng: sửa ở quầy mất vài giây, sửa ở bếp mất cả một món (số liệu minh họa).' },
  { id: 'ghi_ngay_loi_dan', group: 'quay', title: 'Ghi ngay lời dặn', trigger: 'readback_caught',
    text: 'Khách dặn kiêng gì thì ghi ngay lên phiếu, đừng tin trí nhớ.' },
  { id: 'tach_dong', group: 'quay', title: 'Tách dòng', trigger: 'split_line',
    text: 'Hai phần cùng món mà khác yêu cầu thì tách thành hai dòng trên phiếu.' },
  { id: 'bao_tong_ro_rang', group: 'quay', title: 'Báo tổng rõ ràng', trigger: 'total_too_high',
    text: 'Báo tổng rõ ràng và chỉ bảng giá cho khách thấy. Khách tin quán hơn khi nhìn được giá.' },
  { id: 'tien_tren_nap_ket', group: 'quay', title: 'Tiền để trên nắp két', trigger: 'first_cash',
    text: 'Để tờ tiền khách đưa trên nắp két tới khi thối xong. Lỡ có tranh cãi thì tờ tiền vẫn còn đó làm chứng.' },
  { id: 'dem_hai_lan', group: 'quay', title: 'Đếm tiền hai lần', trigger: 'change_wrong',
    text: 'Đếm tiền thối hai lần: lúc lấy khỏi két và trước mặt khách.' },
  { id: 'noi_to_so_tien', group: 'quay', title: 'Nói to số tiền', trigger: 'first_change',
    text: 'Nói to khi nhận và thối, ví dụ: "Nhận 200 nghìn, thối 170 nghìn".' },
  { id: 'du_tien_le', group: 'quay', title: 'Đủ tiền lẻ đầu ca', trigger: 'no_small_change',
    text: 'Chuẩn bị đủ tiền lẻ trước khi mở hàng. Hết tiền lẻ giữa giờ đông khách là kẹt cả hàng.' },
  { id: 'qr_dung_so', group: 'quay', title: 'Chuyển khoản phải về đúng số', trigger: 'fake_qr',
    text: 'Chỉ xác nhận chuyển khoản khi loa hoặc ứng dụng báo tiền đã về đúng số. Ảnh chụp màn hình không phải là tiền.' },
  { id: 'tra_truoc', group: 'quay', title: 'Thu tiền rồi mới gửi bếp', trigger: 'first_ticket',
    text: 'Bán trả trước thì thu tiền xong mới gửi phiếu vào bếp.' },
  { id: 'ghi_chu_tren_phieu', group: 'quay', title: 'Ghi chú nằm trên phiếu', trigger: 'sai_ghi_chu',
    text: 'Ghi chú đặc biệt phải nằm trên phiếu bếp, đừng chỉ dặn miệng.' },
  { id: 'bao_truoc_thoi_gian_cho', group: 'quay', title: 'Báo trước thời gian chờ', trigger: 'cho_lau',
    text: 'Bếp quá tải thì báo trước thời gian chờ cho khách mới. Khách chờ có hẹn dễ chịu hơn khách chờ mù mờ.' },
  // Bếp
  { id: 'rua_roi_moi_thai', group: 'bep', title: 'Rửa rồi mới thái', trigger: 'chua_rua',
    text: 'Rửa rau dưới vòi nước chảy rồi mới thái.' },
  { id: 'thot_rieng', group: 'bep', title: 'Thớt riêng', trigger: 'first_board',
    text: 'Dùng thớt riêng cho đồ sống và đồ chín, rau. Như vậy tránh được nhiễm chéo.' },
  { id: 'nem_tu_it', group: 'bep', title: 'Nêm từ ít tới nhiều', trigger: 'nem_lech',
    text: 'Nêm từ ít tới nhiều. Thiếu thì thêm được, dư thì khó sửa.' },
  { id: 'chao_dau_boc_chay', group: 'bep', title: 'Chảo dầu bốc cháy', trigger: 'chay',
    text: 'Chảo dầu bốc cháy: tắt bếp, đậy kín nắp. Tuyệt đối không dội nước.' },
  { id: 'lam_lai_khi_hong', group: 'bep', title: 'Hỏng thì làm lại', trigger: 'dish_hong',
    text: 'Làm hỏng thì làm lại. Ra món kém còn tốn hơn một phần nguyên liệu.' },
  // Kho
  { id: 'dinh_luong_chuan', group: 'kho', title: 'Định lượng chuẩn', trigger: 'thieu_nguyen_lieu',
    text: 'Định lượng chuẩn giúp món đồng đều và giữ được giá vốn.' },
  // Phục vụ, Quản lý
  { id: 'xu_ly_phan_nan', group: 'phuc_vu', title: 'Xử lý phàn nàn', trigger: 'complaint',
    text: 'Khách phàn nàn: lắng nghe, xin lỗi, giải quyết, cảm ơn.' },
  { id: 'ty_le_gia_von', group: 'phuc_vu', title: 'Tỉ lệ giá vốn', trigger: 'shift_end',
    text: 'Quán nhỏ thường có giá vốn khoảng 35–45% giá bán; nhà hàng thường giữ khoảng 28–35% (số liệu minh họa).' }
])

/** Các thẻ mở bởi một mã sự kiện/lỗi. */
export function tipsForTrigger(trigger) {
  return TIPS.filter(t => t.trigger === trigger)
}
