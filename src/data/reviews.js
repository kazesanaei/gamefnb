// Câu review của khách: theo mã lỗi và theo số sao. Hài hước, lịch sự, không chê vùng miền.
// Chỗ chèn: {mon} (tên món), {nguyen_lieu} (tên nguyên liệu); viết hoa chữ đầu: {Mon}, {Nguyen_lieu}.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const REVIEWS = deepFreeze({
  byError: {
    thieu_nguyen_lieu: [
      'Thiếu {nguyen_lieu} rồi em ơi, {mon} mà thiếu nó như phim thiếu nhạc nền.',
      '{Mon} ngon, mà {nguyen_lieu} đi đâu mất tiêu rồi?',
      'Tìm hoài không thấy {nguyen_lieu}, chắc nó xin nghỉ phép hôm nay.',
      'Ăn tới miếng cuối vẫn ngồi chờ {nguyen_lieu} xuất hiện.',
      'Món thiếu thiếu cái gì đó, ăn cứ thấy trống trải sao sao.'
    ],
    thua_nguyen_lieu: [
      'Có thêm {nguyen_lieu} trong {mon}, lạ miệng nhưng hơi thừa.',
      'Món hơi dư dư cái gì đó, ăn vẫn được mà chưa đúng vị quen.'
    ],
    sai_ghi_chu: [
      'Đã dặn rồi mà món vẫn khác ý, lần sau ghi phiếu giùm nha.',
      'Dặn một đằng, món ra một nẻo. Nhớ ghi chú kỹ nhé!',
      'Mình dặn kỹ lắm rồi đó, mong lần sau đúng ý hơn.',
      'Lời dặn chắc bay theo gió rồi, {mon} không giống mình muốn.'
    ],
    bay_nguyen_lieu: [
      'Ủa, sao có {nguyen_lieu} trong {mon} vậy? Vị lạ lắm luôn.',
      '{Nguyen_lieu} lạc vào {mon} như đi nhầm nhà.',
      'Món có vị gì là lạ, chắc lấy nhầm hũ rồi.',
      'Vị hôm nay lạ quá, hình như có ai đó đổi vai với nguyên liệu.'
    ],
    chay: [
      '{Mon} hơi khét, ăn thấy mùi than hồng.',
      'Hơi cháy xíu, chắc bếp đang vội.',
      'Khét nhẹ, nhưng thấy chủ xe dễ thương nên bỏ qua một lần.',
      'Giòn hơi quá tay, nhai nghe rộp rộp luôn.'
    ],
    song: [
      '{Mon} còn sống sống, lần sau để lửa thêm chút nha.',
      'Chưa chín tới, ăn mà hồi hộp.',
      'Hơi non lửa, chắc bếp nôn nóng quá.'
    ],
    chua_so_che: [
      'Hình như {nguyen_lieu} chưa được sơ chế kỹ.',
      'Có khâu nào bị bỏ qua thì phải, ăn thấy chưa tới.',
      'Món làm hơi vội, sơ chế thêm chút là ngon liền.'
    ],
    sai_cach_so_che: [
      '{Nguyen_lieu} cắt kiểu lạ ghê, ăn không quen miệng.',
      'Món cắt thái hơi khác mọi khi, nhìn là lạ.'
    ],
    tran: [
      'Ly rót tràn ra ngoài, cầm dính tay quá trời.',
      'Hào phóng tới mức tràn ly, mà hơi lem nhem.'
    ],
    hong: [
      '{Mon} hôm nay chưa tới, mong xe mình cố gắng hơn.',
      'Chắc bếp đang có ngày không vui, món chưa ổn lắm.'
    ],
    cho_lau: [
      'Chờ lâu quá, bụng réo muốn thành bài hát luôn.',
      'Đồ ăn được, mà chờ hơi lâu, lỡ chuyến xe buýt rồi nè.',
      'Đợi món mà tưởng đợi tin nhắn trả lời.',
      'Ngồi chờ lâu tới mức học thuộc luôn bảng giá.'
    ],
    sai_mon: [
      'Gọi một đằng ra một nẻo, thôi coi như món bất ngờ.',
      'Mình gọi món khác mà ta? Nghe lại giùm mình nha.',
      'Nhận nhầm món, chắc phiếu ghi vội quá.'
    ],
    thieu_mon: [
      'Gọi đủ phần mà nhận thiếu, phần kia chắc đi lạc.',
      'Thiếu một phần rồi, may mà mình đếm lại.'
    ],
    thoi_thieu: [
      'Về đếm lại tiền thối thấy hụt, lần sau đếm kỹ giùm nha.',
      'Tiền thối hơi thiếu, chắc két đang ăn kiêng.',
      'Món ổn, chỉ có tiền thối là chưa đủ.'
    ],
    bao_du: [
      'Suýt nữa trả dư tiền, may mà mình để ý.',
      'Tính tiền hơi mạnh tay, nhớ nhìn bảng giá nha.',
      'Báo giá cao hơn bảng giá, lần sau cộng kỹ giùm nhé.'
    ],
    khong_ti_vet: [
      '{Mon} chuẩn không cần chỉnh, xứng đáng mười điểm!',
      'Làm món mà như biểu diễn, không chê được chỗ nào.',
      'Không tì vết thiệt sự, mai quay lại liền.',
      '{Mon} ngon tới mức muốn chụp hình khoe cả xóm.'
    ],
    ngon: [
      '{Mon} ngon, giá hợp lý, sẽ ghé nữa.',
      'Ăn một lần là nhớ đường tới xe luôn.',
      'Ngon, sạch sẽ, chủ xe vui vẻ.',
      '{Mon} vừa miệng, ăn xong thấy yêu đời hẳn.'
    ]
  },
  byStars: {
    1: ['Hôm nay chưa được như mong đợi, mong lần sau tốt hơn.', 'Chưa ổn lắm, nhưng vẫn chúc xe mình đắt hàng.'],
    2: ['Tạm được thôi, còn nhiều chỗ phải sửa.', 'Ăn được, mà chưa muốn quay lại liền.'],
    3: ['Cũng được, không có gì để chê nhiều.', 'Bình thường, ăn no bụng là được.'],
    4: ['Ngon nha, thêm chút nữa là hoàn hảo.', 'Khá ngon, phục vụ nhanh nhẹn.'],
    5: ['Tuyệt vời, năm sao không cần suy nghĩ!', 'Quá đỉnh, giới thiệu bạn bè liền!']
  }
})

// Mã lỗi đồng nghĩa (từ lõi) → mã có mẫu câu.
export const REVIEW_CODE_ALIASES = deepFreeze({
  thieu_phu: 'thieu_nguyen_lieu', thieu_chinh: 'thieu_nguyen_lieu', thieu: 'thieu_nguyen_lieu',
  thua: 'thua_nguyen_lieu', thua_phu: 'thua_nguyen_lieu',
  bay: 'bay_nguyen_lieu',
  trai_ghi_chu: 'sai_ghi_chu',
  thua_mon: 'sai_mon', sai_so_luong: 'thieu_mon',
  change_short: 'thoi_thieu', total_too_high: 'bao_du',
  cho: 'cho_lau', wait: 'cho_lau', cho_goi_mon: 'cho_lau',
  sai_cach: 'sai_cach_so_che', bo_qua: 'chua_so_che',
  hoan_hao: 'khong_ti_vet', flawless: 'khong_ti_vet', hoan_my: 'khong_ti_vet',
  kem: 'hong'
})

// Thứ tự ưu tiên khi khách gặp nhiều lỗi: nói lỗi nặng nhất.
const PRIORITY = ['sai_mon', 'thieu_mon', 'bay_nguyen_lieu', 'sai_ghi_chu', 'chay', 'song', 'hong',
  'thieu_nguyen_lieu', 'chua_so_che', 'sai_cach_so_che', 'tran', 'thoi_thieu', 'bao_du', 'cho_lau', 'thua_nguyen_lieu', 'khong_ti_vet', 'ngon']

function normCode(e) {
  const code = typeof e === 'string' ? e : (e && e.code) || ''
  return REVIEW_CODE_ALIASES[code] || code
}

function lowerFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

function capFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function fillReview(t, mon, ing) {
  let ok = true
  const out = t.replace(/\{(Mon|mon|Nguyen_lieu|nguyen_lieu)\}/g, (_, k) => {
    const v = k.toLowerCase() === 'mon' ? mon : ing
    if (!v) { ok = false; return '' }
    return k.charAt(0) === k.charAt(0).toUpperCase() ? capFirst(v) : v
  })
  return ok ? capFirst(out) : null
}

/** Câu review theo lỗi nặng nhất; không có lỗi thì theo số sao. */
export function makeReview({ stars, errors, dishName, ingredientName, rand } = {}) {
  const r = typeof rand === 'function' ? rand : () => 0
  const s = Math.min(5, Math.max(1, Math.round(Number(stars) || 3)))
  const codes = (Array.isArray(errors) ? errors : []).map(normCode)
  let code = PRIORITY.find(c => codes.includes(c))
  if (!code && s === 5) code = r() < 0.5 ? 'ngon' : null
  const mon = typeof dishName === 'string' && dishName ? lowerFirst(dishName) : 'món'
  const ing = typeof ingredientName === 'string' && ingredientName ? lowerFirst(ingredientName) : ''
  const pool = code ? REVIEWS.byError[code] : REVIEWS.byStars[s]
  const usable = pool.map(t => fillReview(t, mon, ing)).filter(Boolean)
  const list = usable.length ? usable : REVIEWS.byStars[s]
  return list[Math.min(list.length - 1, Math.floor(r() * list.length))]
}
