// Hộp thư quà hệ thống (docs/de-xuat-thiet-ke.md mục 9.5). Mỗi quà có id riêng, chỉ đẩy vào hộp thư 1 lần.
// Phần thưởng theo lược đồ Reward (xem src/data/checkin.js). Ngày ghi dạng 'YYYY-MM-DD' theo ngày thật
// (đổi lúc 04:00 giờ Việt Nam).

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const MAIL_CONFIG = deepFreeze({
  // phiên bản nội dung mới nhất (thư phiên bản ≤ số này được gửi cho save cũ); 0.3.0 không có thư riêng
  // (0.4.1, 0.4.2 cũng không; 0.5.0 có thư giới thiệu bếp mới, 0.5.1 có thư giới thiệu quầy mới, 0.5.2 có thư báo màn hình gọn vừa điện thoại,
  // 0.5.3 có thư báo các màn ngoài ca đổi giao diện, đều không kèm quà)
  currentVersion: '0.5.3',
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
  // Ví dụ thẻ bước phải là thẻ có thật: bước Chọn là bước 1 và không có thẻ (stepProgress ở src/ui/components/step-card.js),
  // nên thẻ đầu tiên của Bánh mì ốp la (6 bước) là "Bước 2/6"; không bao giờ có thẻ "Bước 1/N".
  { version: '0.5.0', id: 'phien_ban_0_5_0', kind: 'phien_ban',
    title: 'Có gì mới: bếp mới và 5 thao tác mới',
    body: 'Bếp của xe vừa được sửa sang: nguyên liệu, món và dụng cụ có hình mới to rõ, xong mỗi bước là được đóng dấu chấm điểm ngay, ' +
      'nấu xong món thì có màn ra món chừng 2 giây (chạm để bỏ qua). ' +
      'Có thêm 5 thao tác mới: Đập trứng (chạm quả trứng khi kim nằm trong vùng xanh, rồi vuốt xuống cho trứng vào chảo), ' +
      'Khuấy (vẽ vòng tròn quanh tô hoặc ly, quay vừa tay kẻo văng), Gọt vỏ (vuốt thẳng từ trên xuống theo từng dải vỏ), ' +
      'Lắc (kéo bình hoặc rổ lên xuống thật đều tay) và Thả đá (kéo từng viên đá thả vào giữa ly rồi bấm Xong). ' +
      'Trước mỗi bước trên thớt có thẻ ghi số bước như "Bước 2/6" (bước 1 là chọn nguyên liệu), kèm bàn tay mẫu làm thử cho con xem; ' +
      'nấu quen món rồi thì thẻ tự thu gọn. ' +
      'Máy có màn hình thấp thì lúc nấu, bếp tự ẩn dải khách và thanh 4 khâu cho rộng chỗ, dây phiếu vẫn hiện để con canh khách chờ. ' +
      'Giá bán, giá vốn và thời gian dành cho mỗi bước vẫn giữ như cũ. Con vào bếp thử tay nghề nha!',
    reward: {} },
  // M5 Đợt 2 (0.5.1): quầy làm lại kiểu game bán hàng — khách bán thân sau mặt quầy xe đẩy, phiếu order giấy, máy tính tiền,
  // két 7 ngăn (tiền khách đưa bay vào két, xu bay về ví), điện thoại QR, máy in phiếu thu, phiếu chấm mới; chỉ đổi giao
  // diện (luật, tiền, sao, tip giữ nguyên). Thư giới thiệu, KHÔNG kèm quà như thư 0.5.0.
  { version: '0.5.1', id: 'phien_ban_0_5_1', kind: 'phien_ban',
    title: 'Có gì mới: quầy mới và phiếu chấm mới',
    body: 'Quầy của xe vừa được sửa sang cho đẹp như bếp! Khách đứng sau mặt quầy xe đẩy, hiện rõ nửa người, nét mặt đổi theo ' +
      'độ kiên nhẫn, sắp hết kiên nhẫn thì trên đầu bốc hơi nóng. ' +
      'Order ghi trên phiếu giấy, chốt order là phiếu được đóng dấu rồi bay lên dây phiếu. ' +
      'Báo tổng bằng máy tính tiền, khách nhận tổng thì máy kêu "keng". ' +
      'Két mở đủ 7 ngăn: chạm ngăn để lấy tờ tiền bỏ vào khay thối; đưa tiền thối xong là tiền khách đưa bay vào két, ' +
      'thối đúng còn có xu vàng bay về ví. ' +
      'Chuyển khoản thì khách giơ điện thoại có mã QR, tiền về nghe "ting". Phiếu thu in ra từ máy in nhỏ. ' +
      'Phiếu chấm mới có mặt khách vui hay buồn theo số sao, sao bật lên từng ngôi, được tip thì xu bay về ví. ' +
      'Giá bán, giá vốn, cách chấm sao và luật tip vẫn giữ như cũ. Con ra quầy bán thử nha!',
    reward: {} },
  { version: '0.5.2', id: 'phien_ban_0_5_2', kind: 'phien_ban',
    title: 'Có gì mới: màn hình gọn, vừa điện thoại',
    body: 'Quầy và bếp đã được sắp lại cho vừa màn hình điện thoại, không phải vuốt lên vuốt xuống nữa! ' +
      'Phía trên là cảnh quầy có khách đứng chờ, phía dưới là khay đồ nghề đổi theo từng việc: thực đơn và phiếu order, ' +
      'máy tính tiền, két tiền, điện thoại nhận chuyển khoản, phiếu thu. ' +
      'Thanh trên cùng và thanh Quầy – Bếp cũng gọn hơn để chừa chỗ cho tay thao tác. ' +
      'Giá bán, giá vốn, cách chấm sao và luật tip vẫn giữ như cũ. Con ra quầy thử nha!',
    reward: {} },
  // M5 Đợt 3 (0.5.3): các màn ngoài ca vẽ lại (sảnh Chuẩn bị có xe đẩy và Dì Sáu, Việc hôm nay trên bảng gỗ, thư trong
  // phong bì, quà là vật phẩm có hình); chỉ đổi giao diện (giá, phần thưởng, luật giữ nguyên). Thư ngắn, KHÔNG kèm quà như
  // các thư 0.5.x.
  { version: '0.5.3', id: 'phien_ban_0_5_3', kind: 'phien_ban',
    title: 'Có gì mới: các màn ngoài ca mặc áo mới',
    body: 'Ngoài giờ bán, xe đẩy cũng được sửa sang cho đẹp như quầy và bếp! ' +
      'Màn Chuẩn bị có Dì Sáu đứng cạnh xe, lối vào là hình to có chấm đỏ báo việc mới. ' +
      'Việc hôm nay dán trên bảng gỗ, thư nằm trong phong bì, quà là vật phẩm có hình như xu, Muỗng Vàng, rương; ' +
      'nhận xong là xu bay về ví. ' +
      'Giá bán, phần thưởng và luật chơi vẫn như cũ. Con ghé xem thử nha!',
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
