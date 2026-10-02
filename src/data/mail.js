// Hộp thư quà hệ thống (docs/de-xuat-thiet-ke.md mục 9.5). Mỗi quà có id riêng, chỉ đẩy vào hộp thư 1 lần.
// Phần thưởng theo lược đồ Reward (xem src/data/checkin.js). Ngày ghi dạng 'YYYY-MM-DD' theo ngày thật
// (đổi lúc 04:00 giờ Việt Nam).

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const MAIL_CONFIG = deepFreeze({
  // phiên bản nội dung mới nhất (thư phiên bản ≤ số này được gửi cho save cũ); 0.3.0 không có thư riêng
  // (0.4.1, 0.4.2 cũng không; 0.5.0 có thư giới thiệu bếp mới, không kèm quà)
  currentVersion: '0.5.0',
  maxMails: 100,           // đầy thì bỏ thư cũ nhất đã nhận
  expireDays: 30,          // hạn nhận mặc định
  holidayExpireDays: 14,   // quà lễ
  questExpireDays: 7,      // nhiệm vụ quên nhận
  pushedMemory: 1000,      // số id đã đẩy được nhớ để không đẩy trùng
  // Trần quà (ngoài quà đền bù): tối đa 2 quà lễ/mốc mỗi tháng, quà đời thường tối đa 2 mỗi tháng,
  // tổng tiền quà lễ + đời thường trong tháng không quá 3 lần thu nhập tham chiếu một ca.
  // Tiền đổi Tem dư của sự kiện (kind su_kien, không phải đền bù) cũng tính vào trần tiền của tháng.
  cap: { countKinds: ['le', 'moc'], maxCount: 2, everydayMax: 2, valueKinds: ['le', 'moc', 'doi_thuong', 'su_kien'], valueIncomeMul: 3 },
  kinds: {
    chao_mung: 'Chào mừng',
    phien_ban: 'Phiên bản mới',
    den_bu: 'Đền bù',
    le: 'Quà lễ',
    doi_thuong: 'Quà đời thường',
    nhiem_vu: 'Việc chưa nhận',
    review: 'Review muộn',
    su_kien: 'Sự kiện',
    moc: 'Quà mốc'
  }
})

export const MAIL_WELCOME = deepFreeze({
  id: 'chao_mung', kind: 'chao_mung',
  title: 'Chào mừng tới đầu hẻm!',
  body: 'Dì Sáu gửi con ít Muỗng Vàng và một Phiếu Chợ Sớm để mở hàng cho suôn sẻ. Cố lên nha!',
  reward: { gold: 10, items: { phieu_cho_som: 1 } }
})

// Thư phiên bản mới: đẩy cho save cũ khi phiên bản trong dữ liệu mới hơn phiên bản người chơi đã thấy.
export const MAIL_VERSIONS = deepFreeze([
  { version: '0.2.0', id: 'phien_ban_0_2_0', kind: 'phien_ban',
    title: 'Có gì mới: Chợ Công Thức và Việc hôm nay',
    body: 'Xe đẩy đã có Chợ Công Thức, điểm danh, Việc hôm nay, Hộp thư, sự kiện ngày và chuỗi nhiệm vụ của Dì Sáu. Cảm ơn con đã chờ!',
    reward: { gold: 10 } },
  // M4: luật tip mới, sự kiện thưởng/phạt, phiên hàng và khách lạ; quà làm quen hàng hiếm (không tính trần ngày).
  // Save mới không nhận thư phiên bản (xem refreshMail), nên quà này chỉ đến người đã chơi từ bản trước.
  { version: '0.4.0', id: 'phien_ban_0_4_0', kind: 'phien_ban',
    title: 'Có gì mới: tip mới, sự kiện mới và hàng hiếm',
    body: 'Luật tip mới: hóa đơn từ 20.000đ mà khách chấm 5 sao thì khách bỏ hũ tip 5.000đ; bán kèm món thứ hai là dễ đủ hóa đơn. ' +
      'Đầu hẻm có thêm sự kiện ngày và tình huống trong ca, có cái được thưởng, có cái phải phòng trước, luôn có một cách xử lý an toàn ' +
      '(chỉnh "Tần suất sự kiện" trong Cài đặt nếu muốn ít hơn). ' +
      'Mỗi ngày có ba phiên hàng hiếm: Chợ sớm 05:00–09:00, Xe ba gác trưa 11:00–13:30, Gánh đặc sản tối 17:30–21:00, ' +
      'cùng một vị khách lạ ghé ca đầu ngày mang quà quê. Gom đủ 3 mảnh công thức rồi nấu thử đạt hạng Được là mở món hiếm. ' +
      'Dì gửi con 1 mảnh Trà tắc mật ong rừng và 1 phần Mật ong rừng U Minh để làm quen nha!',
    reward: { fragments: { tra_tac_mat_ong: 1 }, rare: { mat_ong_rung: 1 } } },
  // M5 (0.5.0): bếp làm lại kiểu game nấu ăn, 5 thao tác mới, thẻ bước có tay mẫu, chế độ tập trung khi nấu.
  // Thư giới thiệu, KHÔNG kèm quà (quyết định đã chốt): reward rỗng nên hộp thư chỉ hiện thư, không có nút Nhận.
  { version: '0.5.0', id: 'phien_ban_0_5_0', kind: 'phien_ban',
    title: 'Có gì mới: bếp mới và 5 thao tác mới',
    body: 'Bếp của xe vừa được sửa sang: nguyên liệu, món và dụng cụ có hình mới to rõ, xong mỗi bước là được đóng dấu chấm điểm ngay, ' +
      'nấu xong món thì có màn ra món chừng 2 giây (chạm để bỏ qua). ' +
      'Có thêm 5 thao tác mới: Đập trứng (chạm quả trứng khi kim nằm trong vùng xanh, rồi vuốt xuống cho trứng vào chảo), ' +
      'Khuấy (vẽ vòng tròn quanh tô hoặc ly, quay vừa tay kẻo văng), Gọt vỏ (vuốt thẳng từ trên xuống theo từng dải vỏ), ' +
      'Lắc (kéo bình hoặc rổ lên xuống thật đều tay) và Thả đá (kéo từng viên đá thả vào giữa ly rồi bấm Xong). ' +
      'Trước mỗi bước có thẻ "Bước 1/5" kèm bàn tay mẫu làm thử cho con xem; nấu quen món rồi thì thẻ tự thu gọn. ' +
      'Máy có màn hình thấp thì lúc nấu, bếp tự ẩn dải khách và thanh 4 khâu cho rộng chỗ, dây phiếu vẫn hiện để con canh khách chờ. ' +
      'Giá bán, giá vốn và thời gian dành cho mỗi bước vẫn giữ như cũ. Con vào bếp thử tay nghề nha!',
    reward: {} }
])

// Quà lễ: đẩy từ 04:00 ngày `date` tới hết `pushDays` ngày sau đó (mở game muộn vẫn nhận), hạn nhận 14 ngày.
export const MAIL_HOLIDAYS = deepFreeze([
  { id: 'le_20_10_2026', kind: 'le', date: '2026-10-20', pushDays: 7,
    title: 'Chúc mừng ngày Phụ nữ Việt Nam 20/10',
    body: 'Cảm ơn những người phụ nữ đứng bếp, đứng quầy mỗi ngày. Quán gửi chút quà nhỏ!',
    reward: { gold: 20 } },
  { id: 'le_20_11_2026', kind: 'le', date: '2026-11-20', pushDays: 7,
    title: 'Tri ân ngày Nhà giáo Việt Nam 20/11',
    body: 'Nhớ ơn thầy cô đã dạy mình những bài học đầu đời. Quán gửi quà tri ân!',
    reward: { gold: 20, incomeMul: 0.5 } },
  { id: 'le_tet_2027', kind: 'le', date: '2027-02-06', pushDays: 7,
    title: 'Chúc mừng năm mới Đinh Mùi',
    body: 'Năm mới buôn may bán đắt, khách đông như hội! Lì xì đầu năm cho chủ quán đây.',
    reward: { gold: 88, incomeMul: 1 } }
])

// Quà đời thường: từ ngày thật thứ `fromRealDay`, mỗi ngày có `chance` xảy ra (bốc theo hạt giống của save + ngày),
// cần sao trung bình ≥ `minRating` (điều kiện chất lượng). Tiền = incomeMul trong [min, max].
export const MAIL_EVERYDAY = deepFreeze({
  fromRealDay: 3,
  chance: 0.1,
  minRating: 3.8,
  minRatings: 5,
  incomeMul: [0.3, 0.6],
  variants: [
    { title: 'Khách quen lì xì', body: 'Cô Thu ghé ngang, nói quán dạo này làm ngon nên gửi chút tiền uống nước.' },
    { title: 'Trả lại ví rơi', body: 'Hôm trước con nhặt được ví và trả lại khách. Họ quay lại cảm ơn kèm chút quà.' },
    { title: 'Bán ve chai', body: 'Dọn gọn góc xe, gom vỏ chai bán được một khoản nho nhỏ.' }
  ]
})

// Review đến muộn: khách bị thối thiếu mà không phát hiện tại quầy, về nhà đếm lại (ngày thật hôm sau).
export const MAIL_LATE_REVIEW = deepFreeze({
  kind: 'review', stars: 2,
  title: 'Review muộn: 2 sao',
  body: '{name}: "Về nhà đếm lại mới thấy thối thiếu {amount}. Lần sau quán đếm kỹ giùm nha."'
})

// Thư nhiệm vụ quên nhận và Rương ngày quên mở. {when}: "hôm qua" (cách 1 ngày) hoặc "ngày 01/10";
// {When}: như {when} nhưng viết hoa chữ đầu (đầu câu); {day}: "hôm qua" hoặc "01/10" (đặt sau chữ "ngày").
export const MAIL_QUEST = deepFreeze({
  title: 'Việc {when} chưa nhận thưởng',
  body: '{When} con đã làm xong "{text}" mà quên nhận. Dì gửi lại qua hộp thư nè.',
  chestTitle: 'Rương ngày {day} chưa mở',
  chestBody: '{When} con xong đủ 3 việc mà chưa mở Rương ngày. Dì gửi lại qua hộp thư nè.'
})
