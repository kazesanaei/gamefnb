// 24 thẻ Mẹo nghề (20 thẻ của MVP, M4 thêm 4 thẻ: Soi tiền, Chờ tiền về, Kiểm hàng, Giữ lối đi). Mỗi thẻ mở lần đầu
// khi gặp `trigger` (mã sự kiện hoặc mã lỗi). Nhóm: Quầy 14 / Bếp 5 / Kho 2 / Phục vụ, Quản lý 3.
// `hint`: gợi ý cách mở thẻ, hiện ở Sổ tay nghề khi thẻ còn khóa.
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

// M3 Sổ tay nghề: mở đủ mọi thẻ của một nhóm → danh hiệu + 20 Muỗng Vàng, nhận 1 lần tại Sổ tay nghề.
// (Phần thưởng theo lược đồ Reward của src/data/checkin.js; danh hiệu khai báo ở TITLES của src/data/shop.js.)
export const TIP_GROUP_REWARDS = deepFreeze({
  quay: { gold: 20, title: 'thu_ngan_chu_dao' },
  bep: { gold: 20, title: 'tay_bep_can_than' },
  kho: { gold: 20, title: 'giu_kho_ky_luong' },
  phuc_vu: { gold: 20, title: 'chu_quan_tu_te' }
})

export const TIPS = deepFreeze([
  // Quầy
  { id: 'doc_lai_order', group: 'quay', title: 'Đọc lại order', trigger: 'first_readback',
    text: 'Luôn đọc lại order trước khi báo tổng: sửa ở quầy mất vài giây, sửa ở bếp mất cả một món (số liệu minh họa).',
    hint: 'Đọc lại order cho khách nghe lần đầu.' },
  { id: 'ghi_ngay_loi_dan', group: 'quay', title: 'Ghi ngay lời dặn', trigger: 'readback_caught',
    text: 'Khách dặn kiêng gì thì ghi ngay lên phiếu, đừng tin trí nhớ.',
    hint: 'Để khách bắt được lỗi khi đọc lại order.' },
  { id: 'tach_dong', group: 'quay', title: 'Tách dòng', trigger: 'split_line',
    text: 'Hai phần cùng món mà khác yêu cầu thì tách thành hai dòng trên phiếu.',
    hint: 'Gặp khách gọi cùng món nhưng khác lời dặn (từ ngày 5).' },
  { id: 'bao_tong_ro_rang', group: 'quay', title: 'Báo tổng rõ ràng', trigger: 'total_too_high',
    text: 'Báo tổng rõ ràng và chỉ bảng giá cho khách thấy. Khách tin quán hơn khi nhìn được giá.',
    hint: 'Báo tổng cao hơn giá thật.' },
  { id: 'tien_tren_nap_ket', group: 'quay', title: 'Tiền để trên nắp két', trigger: 'first_cash',
    text: 'Để tờ tiền khách đưa trên nắp két tới khi thối xong. Lỡ có tranh cãi thì tờ tiền vẫn còn đó làm chứng.',
    hint: 'Nhận tiền mặt của khách lần đầu.' },
  { id: 'dem_hai_lan', group: 'quay', title: 'Đếm tiền hai lần', trigger: 'change_wrong',
    text: 'Đếm tiền thối hai lần: lúc lấy khỏi két và trước mặt khách.',
    hint: 'Thối sai một lần, hoặc xong bước "Thối đúng 3 lần" của Dì Sáu.' },
  { id: 'noi_to_so_tien', group: 'quay', title: 'Nói to số tiền', trigger: 'first_change',
    text: 'Nói to khi nhận và thối, ví dụ: "Nhận 200 nghìn, thối 170 nghìn".',
    hint: 'Thối tiền cho khách lần đầu.' },
  { id: 'du_tien_le', group: 'quay', title: 'Đủ tiền lẻ đầu ca', trigger: 'no_small_change',
    text: 'Chuẩn bị đủ tiền lẻ trước khi mở hàng. Hết tiền lẻ giữa giờ đông khách là kẹt cả hàng.',
    hint: 'Gặp lúc két không đủ tiền lẻ, hoặc khách mở hàng bằng tờ tiền lớn.' },
  { id: 'qr_dung_so', group: 'quay', title: 'Chuyển khoản phải về đúng số', trigger: 'fake_qr',
    text: 'Chỉ xác nhận chuyển khoản khi loa hoặc ứng dụng báo tiền đã về đúng số. Ảnh chụp màn hình không phải là tiền.',
    hint: 'Gặp ảnh chuyển khoản giả (từ ngày 7), hoặc mua Loa báo tiền theo lời Anh Khoa.' },
  { id: 'tra_truoc', group: 'quay', title: 'Thu tiền rồi mới gửi bếp', trigger: 'first_ticket',
    text: 'Bán trả trước thì thu tiền xong mới gửi phiếu vào bếp.',
    hint: 'Kẹp phiếu bếp lần đầu.' },
  { id: 'ghi_chu_tren_phieu', group: 'quay', title: 'Ghi chú nằm trên phiếu', trigger: 'sai_ghi_chu',
    text: 'Ghi chú đặc biệt phải nằm trên phiếu bếp, đừng chỉ dặn miệng.',
    hint: 'Ghi sai lời dặn của khách lên phiếu.' },
  { id: 'bao_truoc_thoi_gian_cho', group: 'quay', title: 'Báo trước thời gian chờ', trigger: 'cho_lau',
    text: 'Bếp quá tải thì báo trước thời gian chờ cho khách mới. Khách chờ có hẹn dễ chịu hơn khách chờ mù mờ.',
    hint: 'Để khách chờ món quá lâu.' },
  // M4: tình huống trong ca "Tờ tiền nghi giả" và "Người giao hàng nói khách chuyển khoản rồi"
  { id: 'soi_tien', group: 'quay', title: 'Soi tiền trước khi thối', trigger: 'tien_gia',
    text: 'Tờ tiền lớn thì soi trước khi thối: vuốt thấy chữ nổi, đưa ra chỗ sáng thấy hình ẩn. Nghi ngờ thì mời khách chuyển khoản.',
    hint: 'Gặp khách đưa tờ tiền nghi là tiền giả (từ ngày 5).' },
  { id: 'cho_tien_ve', group: 'quay', title: 'Thấy tiền về mới giao món', trigger: 'cho_tien_ve',
    text: 'Lời nói "chuyển khoản rồi" chưa phải là tiền. Thấy tiền về đúng số trong tài khoản mới giao món.',
    hint: 'Gặp người giao hàng nói khách đã chuyển khoản (từ ngày 5).' },
  // Bếp
  { id: 'rua_roi_moi_thai', group: 'bep', title: 'Rửa rồi mới thái', trigger: 'chua_rua',
    text: 'Rửa rau dưới vòi nước chảy rồi mới thái.',
    hint: 'Ra món mà bỏ qua bước rửa.' },
  { id: 'thot_rieng', group: 'bep', title: 'Thớt riêng', trigger: 'first_board',
    text: 'Dùng thớt riêng cho đồ sống và đồ chín, rau. Như vậy tránh được nhiễm chéo.',
    hint: 'Lên Thớt sơ chế lần đầu.' },
  { id: 'nem_tu_it', group: 'bep', title: 'Nêm từ ít tới nhiều', trigger: 'nem_lech',
    text: 'Nêm từ ít tới nhiều. Thiếu thì thêm được, dư thì khó sửa.',
    hint: 'Nêm lệch vị ở bước nêm, hoặc xong bước "Nấu 3 món Tuyệt hảo" của Dì Sáu.' },
  { id: 'chao_dau_boc_chay', group: 'bep', title: 'Chảo dầu bốc cháy', trigger: 'chay',
    text: 'Chảo dầu bốc cháy: tắt bếp, đậy kín nắp. Tuyệt đối không dội nước.',
    hint: 'Để chảo quá lửa ở bước Canh lửa.' },
  { id: 'lam_lai_khi_hong', group: 'bep', title: 'Hỏng thì làm lại', trigger: 'dish_hong',
    text: 'Làm hỏng thì làm lại. Ra món kém còn tốn hơn một phần nguyên liệu.',
    hint: 'Ra một món bị Hỏng.' },
  // Kho
  { id: 'dinh_luong_chuan', group: 'kho', title: 'Định lượng chuẩn', trigger: 'thieu_nguyen_lieu',
    text: 'Định lượng chuẩn giúp món đồng đều và giữ được giá vốn.',
    hint: 'Lấy thiếu, thừa hoặc nhầm nguyên liệu, hoặc mua món đầu tiên ở Chợ Công Thức.' },
  // M4: phiên hàng hiếm, mini-game Lựa hàng (chọn nhầm hàng thường)
  { id: 'kiem_hang', group: 'kho', title: 'Kiểm hàng trước khi nhận', trigger: 'kiem_hang',
    text: 'Nhận hàng thì kiểm tận mắt từng món, đúng loại, đúng nguồn rồi mới ký nhận.',
    hint: 'Chọn nhầm hàng thường khi lựa hàng hiếm ở gánh hàng quê.' },
  // Phục vụ, Quản lý
  { id: 'xu_ly_phan_nan', group: 'phuc_vu', title: 'Xử lý phàn nàn', trigger: 'complaint',
    text: 'Khách phàn nàn: lắng nghe, xin lỗi, giải quyết, cảm ơn.',
    hint: 'Gặp khách phàn nàn về món.' },
  { id: 'ty_le_gia_von', group: 'phuc_vu', title: 'Tỉ lệ giá vốn', trigger: 'shift_end',
    text: 'Quán nhỏ thường có giá vốn khoảng 35–45% giá bán; nhà hàng thường giữ khoảng 28–35% (số liệu minh họa).',
    hint: 'Bán xong một ca và đọc Tổng kết.' },
  // M4: sự kiện ngày "Trật tự đô thị nhắc giữ vỉa hè"
  { id: 'giu_loi_di', group: 'phuc_vu', title: 'Giữ lối đi cho người đi bộ', trigger: 'lan_chiem',
    text: 'Xe đẩy bán trên vỉa hè phải chừa lối đi cho người đi bộ. Hàng chờ dài thì mời khách đứng gọn một bên.',
    hint: 'Gặp ngày Trật tự đô thị nhắc giữ vỉa hè (từ ngày 5).' }
])

/** Các thẻ mở bởi một mã sự kiện/lỗi. */
export function tipsForTrigger(trigger) {
  return TIPS.filter(t => t.trigger === trigger)
}
