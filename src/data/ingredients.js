// Nguyên liệu: tên hiển thị, khóa hình (src/ui/art.js) và giá vốn (đồng / 1 phần).

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

// Bẫy ghi chú ở trường `trapOf` (nguyên liệu dễ nhầm với nó).
export const INGREDIENTS = deepFreeze({
  // Bánh mì ốp la
  banh_mi:        { name: 'Bánh mì',        icon: 'banh_mi',        cost: 3000 },
  trung_ga:       { name: 'Trứng gà',       icon: 'trung_ga',       cost: 2500 },
  trung_vit:      { name: 'Trứng vịt',      icon: 'trung_vit',      cost: 3000, trapOf: 'trung_ga' },
  dua_leo:        { name: 'Dưa leo',        icon: 'dua_leo',        cost: 500 },
  hanh_la:        { name: 'Hành lá',        icon: 'hanh_la',        cost: 250 },
  hanh_tay:       { name: 'Hành tây',       icon: 'hanh_tay',       cost: 500,  trapOf: 'hanh_la' },
  nuoc_tuong:     { name: 'Nước tương',     icon: 'nuoc_tuong',     cost: 250 },
  nuoc_mam:       { name: 'Nước mắm',       icon: 'nuoc_mam',       cost: 250,  trapOf: 'nuoc_tuong' },
  tuong_ot:       { name: 'Tương ớt',       icon: 'tuong_ot',       cost: 250 },
  // Trà tắc
  tra:            { name: 'Trà',            icon: 'tra',            cost: 800 },
  tac:            { name: 'Tắc',            icon: 'tac',            cost: 400 },
  chanh:          { name: 'Chanh',          icon: 'chanh',          cost: 500,  trapOf: 'tac' },
  duong:          { name: 'Đường',          icon: 'duong',          cost: 300 },
  muoi:           { name: 'Muối',           icon: 'muoi',           cost: 100,  trapOf: 'duong' },
  da:             { name: 'Đá',             icon: 'da',             cost: 400 },
  ly:             { name: 'Ly nhựa',        icon: 'ly',             cost: 300 },
  sua_dac:        { name: 'Sữa đặc',        icon: 'sua_dac',        cost: 1500 },
  // Bánh tráng trộn
  banh_trang:     { name: 'Bánh tráng',     icon: 'banh_trang',     cost: 1500 },
  banh_trang_me:  { name: 'Bánh tráng mè',  icon: 'banh_trang_me',  cost: 2000, trapOf: 'banh_trang' },
  xoai_xanh:      { name: 'Xoài xanh',      icon: 'xoai_xanh',      cost: 2000 },
  trung_cut:      { name: 'Trứng cút',      icon: 'trung_cut',      cost: 400 },
  kho_bo:         { name: 'Khô bò',         icon: 'kho_bo',         cost: 1600 },
  rau_ram:        { name: 'Rau răm',        icon: 'rau_ram',        cost: 200 },
  rau_hung_lui:   { name: 'Húng lủi',       icon: 'rau_hung_lui',   cost: 200,  trapOf: 'rau_ram' },
  hanh_phi:       { name: 'Hành phi',       icon: 'hanh_phi',       cost: 300 },
  dau_phong:      { name: 'Đậu phộng',      icon: 'dau_phong',      cost: 300 },
  sa_te:          { name: 'Sa tế',          icon: 'sa_te',          cost: 500 },
  // Cà phê sữa đá
  ca_phe:         { name: 'Cà phê phin',    icon: 'ca_phe',         cost: 2800 },
  ca_phe_hoa_tan: { name: 'Cà phê hòa tan', icon: 'ca_phe_hoa_tan', cost: 1500, trapOf: 'ca_phe' },
  sua_tuoi:       { name: 'Sữa tươi',       icon: 'sua_tuoi',       cost: 1500, trapOf: 'sua_dac' },
  duong_phen:     { name: 'Đường phèn',     icon: 'duong_phen',     cost: 500,  trapOf: 'duong' },
  // Chè bưởi
  vo_buoi:        { name: 'Vỏ bưởi',        icon: 'vo_buoi',        cost: 1400 },
  bot_nang:       { name: 'Bột năng',       icon: 'bot_nang',       cost: 500 },
  bot_mi:         { name: 'Bột mì',         icon: 'bot_mi',         cost: 400,  trapOf: 'bot_nang' },
  cot_dua:        { name: 'Nước cốt dừa',   icon: 'cot_dua',        cost: 1200 },
  dua_nao:        { name: 'Dừa nạo',        icon: 'dua_nao',        cost: 1000, trapOf: 'cot_dua' },
  dau_xanh:       { name: 'Đậu xanh',       icon: 'dau_xanh',       cost: 800 },

  // M4: nguyên liệu hiếm (thiết kế mục C.2). Lấy từ kho hàng hiếm (state.rare), KHÔNG trừ Tiền quán khi nấu;
  // `cost` là giá quy đổi để tính giá vốn tham khảo của món hiếm. rare: true; star: độ hiếm (★1–★2); origin: quê;
  // portion: số đơn vị trong 1 phần kho (trứng gà ta: 2 quả mỗi phần); traps: hàng thường dễ nhầm (bẫy ở phiên hàng).
  mat_ong_rung:      { name: 'Mật ong rừng U Minh',      icon: 'mat_ong_rung',      cost: 3300, rare: true, star: 2,
    origin: 'Cà Mau', portion: 1, traps: ['duong', 'duong_phen'] },
  trung_ga_ta:       { name: 'Trứng gà ta',              icon: 'trung_ga_ta',       cost: 3500, rare: true, star: 1,
    origin: 'Long An', portion: 2, traps: ['trung_ga', 'trung_vit'] },
  muoi_tom_tay_ninh: { name: 'Muối tôm Tây Ninh',        icon: 'muoi_tom_tay_ninh', cost: 1500, rare: true, star: 1,
    origin: 'Tây Ninh', portion: 1, traps: ['muoi', 'sa_te'] },
  kho_muc:           { name: 'Khô mực Phan Thiết',       icon: 'kho_muc',           cost: 4100, rare: true, star: 2,
    origin: 'Bình Thuận', portion: 1, traps: ['kho_bo'] },
  ca_phe_bmt:        { name: 'Cà phê hạt Buôn Ma Thuột', icon: 'ca_phe_bmt',        cost: 3700, rare: true, star: 2,
    origin: 'Đắk Lắk', portion: 1, traps: ['ca_phe', 'ca_phe_hoa_tan'] }
})
