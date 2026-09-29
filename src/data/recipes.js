// Công thức món (thuần dữ liệu). Lược đồ: mục 6 docs/kien-truc.md.
// Giá vốn thật = tổng cost × qty của nguyên liệu 'chinh' + 'phu' (xem ingredients.js); `cost` ở đây khớp con số đó.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const RECIPES = deepFreeze({
  banh_mi_op_la: {
    id: 'banh_mi_op_la', name: 'Bánh mì ốp la', chang: 1,
    price: 20000, cost: 9000,
    source: 'default', eventId: null, difficulty: 1,
    icon: 'mon_banh_mi_op_la',
    desc: 'Ổ bánh mì giòn kẹp hai trứng ốp la, dưa leo, hành lá và chút nước tương.',
    shelf: ['banh_mi', 'trung_vit', 'dua_leo', 'tac', 'hanh_la', 'nuoc_mam',
      'trung_ga', 'duong', 'hanh_tay', 'nuoc_tuong', 'da', 'tuong_ot'],
    ingredients: [
      { id: 'banh_mi', role: 'chinh' }, { id: 'trung_ga', role: 'chinh', qty: 2 },
      { id: 'dua_leo', role: 'phu' }, { id: 'hanh_la', role: 'phu' }, { id: 'nuoc_tuong', role: 'phu' },
      { id: 'tuong_ot', role: 'tuy_chon' }
    ],
    decoys: ['trung_vit', 'hanh_tay', 'nuoc_mam'],
    notes: [
      { id: 'khong_hanh', label: 'Không hành', removes: ['hanh_la'] },
      { id: 'cay', label: 'Cay', adds: ['tuong_ot'], patch: { nem: { targets: { nuoc_tuong: 1, tuong_ot: 2 } } } },
      { id: 'long_dao', label: 'Lòng đào', group: 'do_chin', patch: { chien_trung: { zone: [0.45, 0.60] } } },
      { id: 'chin_ky', label: 'Chín kỹ', group: 'do_chin', patch: { chien_trung: { zone: [0.70, 0.85] } } },
      { id: 'them_trung', label: 'Thêm trứng', surcharge: 5000, patch: { dap_trung: { n: 3 } } }
    ],
    steps: [
      { id: 'chon', type: 'chon', label: 'Chọn nguyên liệu', par: 6, w: 1 },
      { id: 'rua_dua', type: 'cha', label: 'Rửa dưa leo', ing: 'dua_leo', params: { spots: 4 }, par: 3, w: 1 },
      { id: 'thai_dua', type: 'thai', label: 'Thái dưa leo', ing: 'dua_leo', after: ['rua_dua'],
        method: { options: ['thai_lat', 'thai_soi', 'bao'], correct: 'thai_lat' }, params: { cuts: 3 }, par: 4, w: 1 },
      { id: 'dap_trung', type: 'cham', label: 'Đập trứng vào chảo', ing: 'trung_ga',
        params: { mode: 'exact', n: 2, target: true }, par: 2, w: 2 },
      { id: 'chien_trung', type: 'lua', label: 'Chiên trứng', ing: 'trung_ga', after: ['dap_trung'], critical: true,
        params: { period: 5, zone: [0.55, 0.72] }, par: 5, w: 3, retryCost: 6000 },
      { id: 'nem', type: 'cham', label: 'Nêm nước tương', ing: 'nuoc_tuong', after: ['chien_trung'],
        params: { mode: 'targets', targets: { nuoc_tuong: 1 } }, par: 2, w: 1 }
    ]
  },

  tra_tac: {
    id: 'tra_tac', name: 'Trà tắc', chang: 1,
    price: 10000, cost: 3000,
    source: 'default', eventId: null, difficulty: 1,
    icon: 'mon_tra_tac',
    desc: 'Ly trà xanh mát lạnh, chua chua ngọt ngọt vị tắc tươi.',
    shelf: ['tra', 'chanh', 'da', 'tac', 'muoi', 'ly', 'sua_dac', 'duong', 'dua_leo'],
    ingredients: [
      { id: 'tra', role: 'chinh' }, { id: 'tac', role: 'chinh', qty: 3 }, { id: 'duong', role: 'chinh' },
      { id: 'ly', role: 'chinh' }, { id: 'da', role: 'phu' }
    ],
    decoys: ['chanh', 'muoi', 'sua_dac'],
    notes: [
      { id: 'it_duong', label: 'Ít đường', group: 'duong', patch: { nem_duong: { n: 1 } } },
      { id: 'nhieu_duong', label: 'Nhiều đường', group: 'duong', patch: { nem_duong: { n: 3 } } },
      { id: 'khong_da', label: 'Không đá', removes: ['da'] }
    ],
    steps: [
      { id: 'chon', type: 'chon', label: 'Chọn nguyên liệu', par: 5, w: 1 },
      { id: 'thai_tac', type: 'thai', label: 'Bổ đôi tắc', ing: 'tac', params: { cuts: 3 }, par: 3, w: 1 },
      { id: 'vat_tac', type: 'cham', label: 'Vắt tắc', ing: 'tac', after: ['thai_tac'],
        params: { mode: 'min', N: 6, T: 3 }, par: 3, w: 1 },
      { id: 'rot_tra', type: 'rot', label: 'Rót trà', ing: 'tra', params: { zone: [0.70, 0.82] }, par: 3, w: 2 },
      { id: 'nem_duong', type: 'cham', label: 'Nêm đường', ing: 'duong',
        params: { mode: 'exact', n: 2, target: false }, par: 2, w: 3 },
      { id: 'lac', type: 'cha', label: 'Lắc đều', after: ['rot_tra', 'nem_duong', 'vat_tac'],
        params: { strokes: 6 }, par: 2, w: 1 }
    ]
  },

  banh_trang_tron: {
    id: 'banh_trang_tron', name: 'Bánh tráng trộn', chang: 1,
    price: 20000, cost: 8000,
    source: 'shop', shopPrice: 250000, shopFromDay: 2, eventId: null, difficulty: 2,
    icon: 'mon_banh_trang_tron',
    desc: 'Bánh tráng cắt sợi trộn xoài xanh, trứng cút, khô bò, sa tế và rau răm thơm lừng.',
    shelf: ['banh_trang', 'rau_hung_lui', 'xoai_xanh', 'trung_cut', 'banh_trang_me', 'kho_bo',
      'rau_ram', 'trung_ga', 'hanh_phi', 'dau_phong', 'sa_te', 'tac'],
    ingredients: [
      { id: 'banh_trang', role: 'chinh' }, { id: 'xoai_xanh', role: 'chinh' },
      { id: 'trung_cut', role: 'chinh', qty: 3 }, { id: 'kho_bo', role: 'chinh' },
      { id: 'rau_ram', role: 'phu' }, { id: 'hanh_phi', role: 'phu' }, { id: 'dau_phong', role: 'phu' },
      { id: 'sa_te', role: 'phu' }, { id: 'tac', role: 'phu' }
    ],
    decoys: ['rau_hung_lui', 'banh_trang_me', 'trung_ga'],
    notes: [
      { id: 'khong_cay', label: 'Không cay', group: 'cay', removes: ['sa_te'], patch: { nem: { targets: { tac: 2 } } } },
      { id: 'cay_nhieu', label: 'Cay nhiều', group: 'cay', patch: { nem: { targets: { sa_te: 4, tac: 2 } } } },
      { id: 'khong_rau_ram', label: 'Không rau răm', removes: ['rau_ram'] },
      { id: 'them_trung_cut', label: 'Thêm trứng cút', surcharge: 5000, patch: { boc_trung_cut: { spots: 5 } } }
    ],
    steps: [
      { id: 'chon', type: 'chon', label: 'Chọn nguyên liệu', par: 8, w: 1 },
      { id: 'cat_banh_trang', type: 'thai', label: 'Cắt bánh tráng', ing: 'banh_trang',
        method: { options: ['cat_soi', 'cat_vuong', 'de_nguyen'], correct: 'cat_soi' }, params: { cuts: 5 }, par: 4, w: 1 },
      { id: 'got_xoai', type: 'cha', label: 'Gọt vỏ xoài', ing: 'xoai_xanh', params: { spots: 5 }, par: 3, w: 1 },
      { id: 'thai_xoai', type: 'thai', label: 'Thái xoài', ing: 'xoai_xanh', after: ['got_xoai'],
        method: { options: ['thai_soi', 'thai_lat', 'hat_luu'], correct: 'thai_soi' }, params: { cuts: 5 }, par: 4, w: 1 },
      { id: 'boc_trung_cut', type: 'cha', label: 'Bóc trứng cút', ing: 'trung_cut', params: { spots: 3 }, par: 3, w: 1 },
      { id: 'nem', type: 'cham', label: 'Nêm sa tế, vắt tắc', ing: 'tac',
        params: { mode: 'targets', targets: { sa_te: 2, tac: 2 } }, par: 3, w: 2 },
      { id: 'rot_dau_hanh', type: 'rot', label: 'Rưới dầu hành phi', ing: 'hanh_phi',
        params: { zone: [0.55, 0.70] }, par: 2, w: 1 },
      { id: 'tron', type: 'cha', label: 'Trộn đều',
        after: ['cat_banh_trang', 'got_xoai', 'thai_xoai', 'boc_trung_cut', 'nem', 'rot_dau_hanh'],
        params: { strokes: 8 }, par: 4, w: 3 }
    ]
  },

  ca_phe_sua_da: {
    id: 'ca_phe_sua_da', name: 'Cà phê sữa đá', chang: 1,
    price: 15000, cost: 5000,
    source: 'shop', shopPrice: 200000, shopFromDay: 4, eventId: null, difficulty: 2,
    icon: 'mon_ca_phe_sua_da',
    desc: 'Cà phê phin nhỏ giọt pha sữa đặc, thêm đá lạnh; ngoài Bắc gọi là nâu đá.',
    shelf: ['ca_phe', 'sua_tuoi', 'da', 'duong_phen', 'sua_dac', 'tra', 'ly', 'ca_phe_hoa_tan', 'duong'],
    ingredients: [
      { id: 'ca_phe', role: 'chinh' }, { id: 'sua_dac', role: 'chinh' }, { id: 'ly', role: 'chinh' },
      { id: 'da', role: 'phu' }
    ],
    decoys: ['sua_tuoi', 'ca_phe_hoa_tan', 'duong_phen'],
    notes: [
      { id: 'it_ngot', label: 'Ít ngọt', group: 'ngot', patch: { them_sua: { n: 1 } } },
      { id: 'ngot_dam', label: 'Ngọt đậm', group: 'ngot', patch: { them_sua: { n: 3 } } },
      { id: 'it_da', label: 'Ít đá', patch: { them_da: { n: 1 } } }
    ],
    steps: [
      { id: 'chon', type: 'chon', label: 'Chọn nguyên liệu', par: 5, w: 1 },
      { id: 'rot_nuoc', type: 'rot', label: 'Chế nước sôi vào phin', ing: 'ca_phe',
        params: { zone: [0.60, 0.75] }, par: 3, w: 2 },
      { id: 'u_phin', type: 'lua', label: 'Chờ phin nhỏ giọt', ing: 'ca_phe', after: ['rot_nuoc'],
        params: { period: 6, zone: [0.60, 0.80] }, par: 6, w: 2 },
      { id: 'them_sua', type: 'cham', label: 'Thêm sữa đặc', ing: 'sua_dac',
        params: { mode: 'exact', n: 2, target: false }, par: 2, w: 3 },
      { id: 'them_da', type: 'cham', label: 'Thêm đá', ing: 'da',
        params: { mode: 'exact', n: 2, target: false }, par: 2, w: 1 },
      { id: 'khuay', type: 'cha', label: 'Khuấy đều', after: ['rot_nuoc', 'u_phin', 'them_sua', 'them_da'],
        params: { strokes: 6 }, par: 2, w: 1 }
    ]
  },

  che_buoi: {
    id: 'che_buoi', name: 'Chè bưởi', chang: 1,
    price: 15000, cost: 5000,
    source: 'event', eventId: 'tri_an_20_11', difficulty: 3,
    icon: 'mon_che_buoi',
    desc: 'Cùi bưởi giòn sần sật áo bột năng, ăn cùng đậu xanh và nước cốt dừa béo ngậy.',
    shelf: ['vo_buoi', 'bot_mi', 'dau_xanh', 'cot_dua', 'tac', 'duong',
      'dua_nao', 'bot_nang', 'muoi', 'sua_dac', 'da', 'ly'],
    ingredients: [
      { id: 'vo_buoi', role: 'chinh' }, { id: 'bot_nang', role: 'chinh' }, { id: 'cot_dua', role: 'chinh' },
      { id: 'ly', role: 'chinh' },
      { id: 'dau_xanh', role: 'phu' }, { id: 'duong', role: 'phu' }, { id: 'muoi', role: 'phu' }, { id: 'da', role: 'phu' }
    ],
    decoys: ['bot_mi', 'sua_dac', 'dua_nao'],
    notes: [
      { id: 'nhieu_cot_dua', label: 'Nhiều nước cốt dừa', patch: { rot_cot_dua: { zone: [0.80, 0.92] } } },
      { id: 'khong_da', label: 'Không đá', removes: ['da'] }
    ],
    steps: [
      { id: 'chon', type: 'chon', label: 'Chọn nguyên liệu', par: 6, w: 1 },
      { id: 'got_vo', type: 'cha', label: 'Gọt lớp vỏ xanh', ing: 'vo_buoi', params: { spots: 5 }, par: 3, w: 1 },
      { id: 'thai_cui', type: 'thai', label: 'Thái cùi bưởi', ing: 'vo_buoi', after: ['got_vo'],
        method: { options: ['hat_luu', 'thai_lat', 'thai_soi'], correct: 'hat_luu' }, params: { cuts: 4 }, par: 4, w: 1 },
      { id: 'bop_muoi', type: 'cha', label: 'Bóp muối, xả cho hết đắng', ing: 'muoi', after: ['thai_cui'],
        params: { strokes: 6 }, par: 3, w: 1 },
      { id: 'ao_bot', type: 'cham', label: 'Lăn bột năng', ing: 'bot_nang', after: ['bop_muoi'],
        params: { mode: 'min', N: 8, T: 3.5 }, par: 4, w: 2 },
      { id: 'luoc', type: 'lua', label: 'Luộc tới khi trong', ing: 'bot_nang', after: ['ao_bot'], critical: true,
        params: { period: 5, zone: [0.55, 0.75] }, par: 5, w: 3, retryCost: 3000 },
      { id: 'rot_cot_dua', type: 'rot', label: 'Rưới nước cốt dừa', ing: 'cot_dua',
        params: { zone: [0.65, 0.80] }, par: 2, w: 2 }
    ]
  }
})

// Nhãn cách sơ chế (bước có `method`).
export const METHOD_LABELS = deepFreeze({
  thai_lat: 'Thái lát',
  thai_soi: 'Thái sợi',
  bao: 'Bào',
  cat_soi: 'Cắt sợi',
  cat_vuong: 'Cắt miếng vuông',
  de_nguyen: 'Để nguyên',
  hat_luu: 'Cắt hạt lựu'
})

// Nhãn vai trò nguyên liệu.
export const ROLE_LABELS = deepFreeze({ chinh: 'Chính', phu: 'Phụ', tuy_chon: 'Tùy chọn' })
