// Hộp thư quà hệ thống (docs/de-xuat-thiet-ke.md mục 9.5). Mỗi quà có id riêng, chỉ đẩy vào hộp thư 1 lần.
// Phần thưởng theo lược đồ Reward (xem src/data/checkin.js). Ngày ghi dạng 'YYYY-MM-DD' theo ngày thật
// (đổi lúc 04:00 giờ Việt Nam).

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const MAIL_CONFIG = deepFreeze({
  currentVersion: '0.2.0',
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
    reward: { gold: 10 } }
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
