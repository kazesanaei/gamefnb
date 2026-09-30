// Chợ Công Thức (docs/de-xuat-thiet-ke.md mục 7), hiện vật, đồ thẩm mỹ, danh hiệu.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const SHOP = deepFreeze({
  name: 'Chợ Công Thức',
  // Kệ Chính: món mua bằng Tiền quán (giá shopPrice, mở từ shopFromDay trong src/data/recipes.js)
  mainShelf: ['banh_trang_tron', 'ca_phe_sua_da'],
  // Thẻ bóng mờ của Chặng 2: chỉ tên và hình, chưa mua được
  teasers: [
    { id: 'goi_cuon', name: 'Gỏi cuốn', icon: 'mon_goi_cuon', chang: 2 },
    { id: 'bun_thit_nuong', name: 'Bún thịt nướng', icon: 'mon_bun_thit_nuong', chang: 2 },
    { id: 'che_ba_mau', name: 'Chè ba màu', icon: 'mon_che_ba_mau', chang: 2 }
  ],
  teaserNote: 'Cần Quán cóc vỉa hè',
  // Tab Nâng cấp: thứ tự hiện (dữ liệu trong src/data/upgrades.js)
  upgrades: ['dao_thep', 'chao_chong_dinh', 'ghe_nhua', 'loa_bao_tien', 'may_tinh'],
  // Góc Muỗng Vàng: màu dù xe, chỉ thẩm mỹ
  umbrellas: ['du_do', 'du_xanh_la', 'du_soc'],
  // Ước tính số phần mỗi ca của một món (để tính số ca hoàn vốn): khách × phần/khách ÷ số món đang bán
  portionsPerCustomer: 1.2,
  tasteFree: 1   // nấu thử miễn phí mỗi món chưa mua
})

// Hiện vật. consumable: dùng hết thì mất; permanent: có 1 lần là đủ (tặng lại thì quy đổi).
export const ITEMS = deepFreeze({
  phieu_cho_som: {
    id: 'phieu_cho_som', name: 'Phiếu Chợ Sớm', icon: 'phieu_cho_som', consumable: true,
    desc: 'Đi chợ sớm lấy giá sỉ: giá vốn giảm 20% trong 1 ca. Dùng ở màn Chuẩn bị ca.',
    effect: { cogsMul: 0.8 }
  },
  bat_che_mua: {
    id: 'bat_che_mua', name: 'Bạt che mưa', icon: 'bat_che_mua', permanent: true,
    desc: 'Ngày mưa tự căng bạt, không tốn 20.000đ.',
    effect: { freeTarp: true }
  }
})

// Đồ thẩm mỹ. slot: chỗ áp lên hình xe đẩy. price: Muỗng Vàng (chỉ đồ bán ở Góc Muỗng Vàng).
export const COSMETICS = deepFreeze({
  vien_khai_truong: { id: 'vien_khai_truong', name: 'Viền biển xe "Khai Trương"', slot: 'bien' },
  du_do: { id: 'du_do', name: 'Dù đỏ cờ', slot: 'du', color: '#d64545', price: 30 },
  du_xanh_la: { id: 'du_xanh_la', name: 'Dù xanh lá mạ', slot: 'du', color: '#4caf50', price: 30 },
  du_soc: { id: 'du_soc', name: 'Dù sọc kẹo', slot: 'du', color: '#f2a93b', pattern: 'soc', price: 30 },
  // đồ đổi Tem sự kiện Tri ân 20/11
  bang_den_tri_an: { id: 'bang_den_tri_an', name: 'Bảng đèn "Tri ân thầy cô"', slot: 'bien' },
  chau_hoa_tri_an: { id: 'chau_hoa_tri_an', name: 'Chậu hoa cúc tri ân', slot: 'trang_tri' },
  co_phan_trang: { id: 'co_phan_trang', name: 'Dù hình hộp phấn trắng', slot: 'du', color: '#f5f1e6' }
})

export const TITLES = deepFreeze({
  chu_xe_moi_toanh: { id: 'chu_xe_moi_toanh', name: 'Chủ xe mới toanh' },
  chu_xe_dau_hem: { id: 'chu_xe_dau_hem', name: 'Chủ xe đầu hẻm' },
  // M3 Sổ tay nghề: đủ một nhóm thẻ Mẹo nghề (src/data/tips.js TIP_GROUP_REWARDS)
  thu_ngan_chu_dao: { id: 'thu_ngan_chu_dao', name: 'Thu ngân chu đáo' },
  tay_bep_can_than: { id: 'tay_bep_can_than', name: 'Tay bếp cẩn thận' },
  giu_kho_ky_luong: { id: 'giu_kho_ky_luong', name: 'Giữ kho kỹ lưỡng' },
  chu_quan_tu_te: { id: 'chu_quan_tu_te', name: 'Chủ quán tử tế' }
})

// Mở khóa (thẻ, màn) theo id.
export const UNLOCKS = deepFreeze({
  the_quan_coc: { id: 'the_quan_coc', name: 'Quán cóc vỉa hè – sắp khai trương' }
})
