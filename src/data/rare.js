// M4: nguyên liệu và công thức hiếm (thiết kế docs/tham-khao/m4-thiet-ke.md mục C).
// RARE_CONFIG: luật kho, trần mỗi ngày thật, Giỏ chợ, phiên hàng, khách lạ, mở công thức hiếm.
// STALLS: 3 phiên hàng theo giờ thật Việt Nam (mini-game "Lựa hàng" dùng lại bước Chọn nguyên liệu).
// STRANGERS: khách lạ ghé ca đầu mỗi ngày thật, mang quà quê là nguyên liệu hiếm.
// Nguyên liệu hiếm khai báo ở ingredients.js (rare: true), công thức hiếm ở recipes.js (source: 'hiem').

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const RARE_CONFIG = deepFreeze({
  // hệ thống hàng hiếm (phiên hàng, khách lạ) mở từ ngày game này
  fromDay: 3,
  // kho: tối đa 6 phần mỗi loại; phần dư (kho đầy hoặc quá mức mỗi ngày) đổi thành Muỗng Vàng
  stockMax: 6,
  overflowGold: 2,
  // trần mỗi ngày thật (mọi nguồn trừ phần tự bỏ tiền mua): 6 phần nguyên liệu và 3 mảnh công thức
  dailyCap: 6,
  dailyFragCap: 3,
  // mở công thức hiếm: gom đủ 3 mảnh rồi nấu thử đạt hạng Được trở lên
  fragmentsNeed: 3,
  unlockGrade: 'duoc',
  // bảo hiểm mảnh: 3 lần liền ở nguồn có tỉ lệ (phiên hàng, Giỏ chợ) mà không ra mảnh thì lần sau chắc chắn có
  fragmentPityAfter: 3,
  // Giỏ chợ: 40% ra 1 phần nguyên liệu, 60% ra 1 mảnh; 2 lượt liền không ra nguyên liệu thì lượt thứ 3 chắc chắn có
  basket: { ingredient: 0.4, pityAfter: 2 },
  // phiên hàng: luôn được 1 phần; từ 90 điểm thêm 1 phần; từ 75 điểm có 50% được 1 mảnh
  stall: { base: 1, bonusAt: 90, fragmentAt: 75, fragmentRate: 0.5, shelfSize: 9, par: 6 },
  // khách lạ: quà theo số sao khách chấm
  stranger: {
    gifts: [
      { minStars: 5, portions: 2 },
      { minStars: 4, portions: 1 },
      { minStars: 3, fragments: 1 }
    ]
  },
  // khách gọi món hiếm nhiều hơn (×1,5); mỗi phần món hiếm đạt Ngon trở lên +1 danh tiếng
  orderWeight: 1.5,
  repPerGood: 1
})

// Phiên hàng theo giờ thật Việt Nam (from ≤ giờ < to). Mỗi phiên 1 lượt mỗi ngày thật, chỉ nhận ở màn Chuẩn bị.
// (Tên người bán khác tên Dì Sáu để người mới không lẫn.)
// seller: người bán (persona, gender: hình khuôn mặt).
// goods: 2 món hàng hiếm bày trên kệ; kệ 9 ô gồm hàng hiếm, hàng thường dễ nhầm của từng món (INGREDIENTS[id].traps),
// rồi lấy lần lượt fillers (hàng thường khác) cho đủ ô.
export const STALLS = deepFreeze([
  {
    id: 'cho_som', name: 'Chợ sớm', seller: 'Cô Ba', persona: 'co_chu', gender: 'nu', from: '05:00', to: '09:00',
    goods: ['trung_ga_ta', 'muoi_tom_tay_ninh'], fillers: ['hanh_la', 'dua_leo', 'xoai_xanh', 'tac'],
    desc: 'Cô Ba bày trứng gà ta và muối tôm mới về từ sáng tinh mơ.',
    hello: 'Hàng quê mới về nè con, lựa kỹ rồi hẵng lấy nha.'
  },
  {
    id: 'ba_gac_trua', name: 'Xe ba gác trưa', seller: 'Chú Tư', persona: 'co_chu', gender: 'nam', from: '11:00', to: '13:30',
    goods: ['mat_ong_rung', 'trung_ga_ta'], fillers: ['tac', 'chanh', 'dau_xanh', 'hanh_la'],
    desc: 'Chú Tư chở hàng miền Tây lên: mật ong rừng U Minh và trứng gà ta.',
    hello: 'Mật ong rừng thứ thiệt nè con, coi kỹ đừng lộn với đường nghen.'
  },
  {
    id: 'ganh_toi', name: 'Gánh đặc sản tối', seller: 'Anh Tám', persona: 'cong_nhan', gender: 'nam', from: '17:30', to: '21:00',
    goods: ['ca_phe_bmt', 'kho_muc'], fillers: ['dau_phong', 'banh_trang', 'sua_dac', 'hanh_phi'],
    desc: 'Anh Tám gánh cà phê hạt Buôn Ma Thuột và khô mực Phan Thiết ra đầu hẻm.',
    hello: 'Cà phê hạt với khô mực mới nhập nè em, lựa đúng hàng thật nha.'
  }
])

// Khách lạ (ca đầu mỗi ngày thật, từ ngày game 3): gọi món như khách thường, có biểu tượng riêng ở hàng chờ.
// Chọn người mang nguyên liệu kho đang cần nhất. self: cách khách tự xưng.
export const STRANGERS = deepFreeze([
  {
    id: 'ba_ca_mau', name: 'Cụ bà quê Cà Mau', gender: 'nu', persona: 'co_chu', region: 'nam', self: 'bà',
    ing: 'mat_ong_rung', thanks: 'Mật ong rừng nhà bà đó, con cất pha trà cho khách nghen.'
  },
  {
    id: 'ngu_dan_phan_thiet', name: 'Anh ngư dân Phan Thiết', gender: 'nam', persona: 'cong_nhan', region: 'nam', self: 'anh',
    ing: 'kho_muc', thanks: 'Khô mực nhà anh phơi đó, em cất dùng dần nha.'
  },
  {
    id: 'chi_ban_me', name: 'Chị buôn cà phê Ban Mê', gender: 'nu', persona: 'van_phong', region: 'nam', self: 'chị',
    ing: 'ca_phe_bmt', thanks: 'Cà phê hạt Buôn Ma Thuột, em pha thử cho khách coi.'
  },
  {
    id: 'chu_nam_tay_ninh', name: 'Chú Năm Tây Ninh', gender: 'nam', persona: 'co_chu', region: 'nam', self: 'chú',
    ing: 'muoi_tom_tay_ninh', thanks: 'Muối tôm nhà làm đó con, trộn bánh tráng là hết sẩy.'
  },
  {
    id: 'co_bay_nuoi_ga', name: 'Cô Bảy nuôi gà thả vườn', gender: 'nu', persona: 'co_chu', region: 'nam', self: 'cô',
    ing: 'trung_ga_ta', thanks: 'Trứng gà ta nhà cô nuôi, con chiên cho khách thử nha.'
  }
])
