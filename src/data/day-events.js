// Sự kiện ngày (docs/de-xuat-thiet-ke.md mục 9.3a, M4: docs/tham-khao/m4-thiet-ke.md mục B.1, B.2, D): báo trước ở
// Tổng kết ca hôm trước, hiện ở màn Chuẩn bị. Lõi: rollDayEvent/dayEventSeries, prepareShiftMods, finishShiftEvents trong
// src/core/events.js.
//
// Tần suất (M4, "dày"): từ ngày game `fromDay`, mỗi ngày game có `chance` xảy ra 1 sự kiện; bảo hiểm: `guaranteeAfter`
// ngày game liền không có sự kiện thì ngày kế chắc chắn có (tỉ lệ thực khoảng 74% với 0,65 và 1 ngày). Bốc TUẦN TỰ,
// tất định theo hạt giống của save + ngày game + mức "Tần suất sự kiện" (không lưu gì thêm), nên dòng "Ngày mai: …" ở
// Tổng kết luôn khớp ngày thật sự diễn ra.
// - noRepeat: không trùng loại hôm trước (khi còn loại khác để bốc).
// - cooldowns: các sự kiện trong cùng nhóm cách nhau ít nhất `days` ngày game (tính cả chính nó).
// - Loại (`kind`): 'tot' (có lợi), 'chon' (có lựa chọn, được mất tùy cách chọn), 'xau' (bất lợi, phòng được hoặc báo
//   trước). Loại xấu chỉ có từ ngày game `badFromDay`, không 2 ngày xấu liền nhau; mức "Ít" chỉ bốc loại tốt (không có
//   khoản phạt).
// - Trọng số `w` cộng lại 100: loại tốt 58, loại chọn/xấu 42 (thiết kế M4 mục B.2).
//
// effects (hiệu ứng mặc định; lựa chọn `choice` có bộ hiệu ứng thay thế):
//   customerMul (nhân số khách, làm tròn, sàn 3), extraCustomers (+ khách), patienceMul (kiên nhẫn xếp hàng),
//   lineCountWeights [1 món, 2 món, 3 món] (tỉ trọng số món khác nhau mỗi đơn; M4 thay tipMul của Ngày lãnh lương),
//   recipeWeight {recipeId: hệ số được gọi} (> 1 gọi nhiều hơn, < 1 gọi ít hơn),
//   noteBoost {recipeId: [noteId]} (tăng khả năng khách dặn các ghi chú này),
//   M4: fixedCostDelta (đồng, cộng vào chi phí cố định của ca), ingCostMul {ingId: hệ số giá vốn} (phần tăng có trần
//   bằng trần thiệt hại một sự kiện), noQrSpeaker (Loa báo tiền tắt: tự kiểm tiền về, loa không chặn ảnh giả),
//   queueMax (số người đứng chờ tối đa, người đến sau đi ngang), queueFine {at, fine} (hàng chờ chạm `at` người thì phạt
//   `fine` một lần, có trần), bigOrder {recipeId, qty, persona, who, bonus, minStars} (thêm 1 khách đặt trước, giao đạt
//   từ minStars sao thì thêm tiền "đúng hẹn"), endCheck (chấm cuối ca, xem dưới), rareRolls (lượt Giỏ chợ cuối ca).
//   endCheck.type: 'stars' (sao trung bình của ca theo bậc tiers [{min, money, rep, label}]), 'portions' (số phần các
//   món `recipes` đã giao theo bậc tiers [{min, money}]), 'hygiene' (bếp không có lỗi `codes`: +passRep danh tiếng; có
//   lỗi: lần đầu nhắc nhở, tái phạm trong `warnDays` ngày game thì phạt `fine`; sure: chắc chắn đạt).
// choice: lựa chọn ở màn Chuẩn bị, có giá (cost, đồng; trả lúc mở ca, không tính vào lãi ca) và hiệu ứng thay thế;
//   freeWithItem: có hiện vật thì miễn phí; safe: lựa chọn an toàn (không có khoản phạt); skipText: lời nhắc đầu ca khi
//   không chọn.
// Sự kiện có phạt luôn có ít nhất một cách không bị phạt; vài sự kiện loại xấu chỉ là chi phí nhỏ được báo trước, không
// có lựa chọn (Tắc lên giá, Tiền điện nước tăng). Tiền thưởng bội 1.000đ, phạt bội 500đ, đều có trần (economy.js).
// Sự kiện đã báo trước (Tổng kết "Ngày mai", màn Chuẩn bị) được chốt, đổi mức "Tần suất sự kiện" không bốc lại
// (events.announceDayEvent).

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const DAY_EVENT_CONFIG = deepFreeze({
  fromDay: 3,
  chance: 0.65,
  guaranteeAfter: 1,     // 1 ngày game liền không có sự kiện → ngày kế chắc chắn có
  noRepeat: true,        // không trùng loại hôm trước
  badFromDay: 5,         // sự kiện loại xấu mở từ ngày game 5
  // nhóm cách quãng: Trật tự đô thị và Kiểm tra vệ sinh an toàn thực phẩm cách nhau ít nhất 7 ngày game
  cooldowns: [{ ids: ['trat_tu_do_thi', 'kiem_tra_attp'], days: 7 }],
  noteBoostRate: 0.35,   // xác suất thêm 1 ghi chú "hợp thời tiết" cho dòng chưa có ghi chú
  minCustomers: 3
})

// Món có đá (Trà tắc, Cà phê sữa đá, Chè bưởi): ngày cúp điện ít được gọi hơn (chưa mua đá cây).
const ICE_DRINKS = { tra_tac: 0.5, ca_phe_sua_da: 0.5, che_buoi: 0.5 }

export const DAY_EVENTS = deepFreeze({
  troi_mua: {
    id: 'troi_mua', name: 'Trời mưa', icon: 'troi_mua', kind: 'chon', w: 13, fromDay: 3,
    desc: 'Mưa lâm râm, khách thưa hơn nhưng chịu khó chờ hơn.',
    effects: { customerMul: 0.8, patienceMul: 1.2 },
    choice: {
      id: 'cang_bat', label: 'Căng bạt', cost: 20000, freeWithItem: 'bat_che_mua', safe: true,
      desc: 'Căng bạt che mưa để khách vẫn ghé: khách chỉ giảm nhẹ.',
      effects: { customerMul: 0.95, patienceMul: 1.2 }
    }
  },
  nang_nong: {
    id: 'nang_nong', name: 'Nắng nóng', icon: 'nang_nong', kind: 'tot', w: 13, fromDay: 3,
    desc: 'Trời oi bức, ai đi ngang cũng muốn một ly mát lạnh.',
    effects: {
      extraCustomers: 1,
      recipeWeight: { tra_tac: 2, ca_phe_sua_da: 2 },
      noteBoost: { tra_tac: ['it_duong'], ca_phe_sua_da: ['it_ngot'] }
    }
  },
  lanh_luong: {
    id: 'lanh_luong', name: 'Ngày lãnh lương', icon: 'lanh_luong', kind: 'tot', w: 10, fromDay: 3,
    desc: 'Đầu tháng lãnh lương, khách hay gọi thêm món, hóa đơn dễ qua 20.000đ để có tip.',
    // M4: khách gọi thêm món (bình thường [70, 25, 5]); luật tip không có ngoại lệ
    effects: { lineCountWeights: [60, 32, 8] }
  },
  cho_phien: {
    id: 'cho_phien', name: 'Chợ phiên', icon: 'cho_phien', kind: 'tot', w: 10, fromDay: 3,
    desc: 'Hẻm họp chợ phiên, người qua lại đông hơn hẳn. Ca sẽ dài hơn một chút.',
    // M4: +1 lượt Giỏ chợ cuối ca (nguyên liệu hiếm; lõi Giỏ chợ ở bước hàng hiếm)
    effects: { customerMul: 1.3, rareRolls: 1 }
  },

  // ---------- M4: tám sự kiện ngày mới (thiết kế mục B.2) ----------

  // Tốt: phường chấm xe đẩy theo sao trung bình của ca (chấm theo tay nghề, không dựa vào may rủi)
  hoi_thi_xe_sach: {
    id: 'hoi_thi_xe_sach', name: 'Hội thi "Xe đẩy sạch, ngon" của phường', icon: 'hoi_thi_xe_sach', kind: 'tot', w: 9, fromDay: 4,
    desc: 'Phường chấm điểm các xe đẩy trong hẻm theo lời khen của khách. Phục vụ chu đáo là có giải.',
    effects: {
      endCheck: {
        type: 'stars',
        tiers: [
          { min: 4.5, money: 20000, rep: 5, label: 'Giải Nhất' },
          { min: 4.0, money: 10000, rep: 2, label: 'Giải Khuyến khích' }
        ],
        none: 'Ca này sao trung bình chưa tới 4 sao, chưa có giải. Lần sau ráng lên nha!'
      }
    }
  },
  // Tốt: văn phòng đầu hẻm đặt trước 3 ly trà tắc (nhận đơn thì thêm 1 khách)
  don_van_phong: {
    id: 'don_van_phong', name: 'Văn phòng đầu hẻm đặt 3 ly trà tắc', icon: 'don_van_phong', kind: 'tot', w: 9, fromDay: 4,
    desc: 'Văn phòng đầu hẻm gọi điện đặt trước 3 ly trà tắc, giữa ca sẽ cử người ghé lấy.',
    effects: {},
    choice: {
      id: 'nhan_don', label: 'Nhận đơn', cost: 0, safe: true, skipText: 'Hôm nay xe không nhận đơn này.',
      desc: 'Thêm 1 khách lấy 3 ly Trà tắc (30.000đ). Giao đạt từ 4 sao thì văn phòng thưởng thêm 5.000đ.',
      effects: {
        bigOrder: {
          recipeId: 'tra_tac', qty: 3, persona: 'van_phong', bonus: 5000, minStars: 4,
          who: [{ name: 'Chị Hoa văn phòng', gender: 'nu' }, { name: 'Anh Minh văn phòng', gender: 'nam' }],
          done: 'Giao đúng hẹn, văn phòng thưởng thêm tiền đúng hẹn.',
          low: 'Văn phòng chưa hài lòng lắm ({stars} sao) nên không có tiền đúng hẹn.',
          lost: 'Người của văn phòng chưa lấy được đơn nên không có tiền đúng hẹn.'
        }
      }
    }
  },
  // Tốt: đại lý trà tài trợ bảng hiệu, tính theo số ly trà tắc bán được
  tai_tro_dai_ly: {
    id: 'tai_tro_dai_ly', name: 'Đại lý trà tài trợ bảng hiệu', icon: 'tai_tro_dai_ly', kind: 'tot', w: 7, fromDay: 6,
    desc: 'Đại lý trà mời treo bảng hiệu nhỏ, cuối ca trả tiền tài trợ theo số ly trà tắc bán được.',
    effects: {},
    choice: {
      id: 'nhan_tai_tro', label: 'Nhận tài trợ', cost: 0, safe: true, skipText: 'Hôm nay xe không nhận tài trợ.',
      desc: 'Bán từ 3 ly Trà tắc trong ca: tối đa +15.000đ (theo doanh thu ca); ít hơn vẫn được 5.000đ.',
      effects: {
        endCheck: {
          type: 'portions', recipes: ['tra_tac'],
          tiers: [{ min: 3, money: 15000 }, { min: 0, money: 5000 }],
          text: 'Ca này bán {n} ly Trà tắc.'
        }
      }
    }
  },
  // Xấu nhẹ: tắc lên giá (giá vốn Trà tắc tăng, có trần), gợi ý dùng Phiếu Chợ Sớm
  tat_gia: {
    id: 'tat_gia', name: 'Tắc lên giá', icon: 'tat_gia', kind: 'xau', w: 6, fromDay: 5,
    desc: 'Mối tắc báo hết mùa, giá tắc tăng gấp đôi. Mỗi ly Trà tắc tốn thêm giá vốn.',
    effects: { ingCostMul: { tac: 2 } }
  },
  // Xấu nhẹ: tiền điện nước tháng này tăng (khoản nhỏ, đã báo trước)
  tien_dien_nuoc: {
    id: 'tien_dien_nuoc', name: 'Tiền điện nước tháng này tăng', icon: 'tien_dien_nuoc', kind: 'xau', w: 5, fromDay: 5,
    desc: 'Hóa đơn điện nước tháng này cao hơn, chi phí cố định của ca tăng thêm một chút.',
    effects: { fixedCostDelta: 5000 }
  },
  // Chọn: cúp điện theo lịch (có lịch báo trước); mua đá cây thì khách ghé như thường
  cup_dien: {
    id: 'cup_dien', name: 'Cúp điện theo lịch', icon: 'cup_dien', kind: 'chon', w: 6, fromDay: 5,
    desc: 'Điện lực báo cúp điện cả buổi sáng. Không có tủ đá, món có đá khó bán, Loa báo tiền cũng tắt.',
    effects: { customerMul: 0.85, recipeWeight: ICE_DRINKS, noQrSpeaker: true },
    choice: {
      id: 'mua_da_cay', label: 'Mua đá cây', cost: 10000, safe: true,
      desc: 'Mua sẵn đá cây ướp thùng: khách ghé như thường, chỉ còn Loa báo tiền tắt.',
      effects: { noQrSpeaker: true }
    }
  },
  // Xấu (phòng được): trật tự đô thị nhắc giữ vỉa hè; thu gọn chỗ đứng thì không bị phạt
  trat_tu_do_thi: {
    id: 'trat_tu_do_thi', name: 'Trật tự đô thị nhắc giữ vỉa hè', icon: 'trat_tu_do_thi', kind: 'xau', w: 6, fromDay: 5,
    desc: 'Hôm nay phường đi nhắc giữ lối đi trên vỉa hè. Hàng chờ dài lấn lối đi là bị phạt.',
    effects: {
      queueFine: {
        at: 3, fine: 20000,
        warn: 'Hàng chờ đã {n} người rồi con, thêm người nữa là lấn lối đi đó.',
        text: 'Hàng chờ {n} người lấn lối đi trên vỉa hè.'
      }
    },
    choice: {
      id: 'thu_gon', label: 'Thu gọn chỗ đứng', cost: 0, safe: true, skipText: 'Nhớ giữ hàng chờ dưới 3 người nha.',
      desc: 'Chỉ cho 2 người đứng chờ, không bị phạt nhưng người thứ 3 sẽ đi ngang.',
      effects: { queueMax: 2 }
    }
  },
  // Chọn: đoàn kiểm tra vệ sinh an toàn thực phẩm (lần đầu có lỗi chỉ nhắc nhở; chuẩn bị trước thì chắc chắn đạt)
  kiem_tra_attp: {
    id: 'kiem_tra_attp', name: 'Đoàn kiểm tra vệ sinh an toàn thực phẩm', icon: 'kiem_tra_attp', kind: 'chon', w: 6, fromDay: 6,
    desc: 'Cuối ca có đoàn kiểm tra bếp: sơ chế đủ bước, không lấy nhầm nguyên liệu, không giao món hỏng là đạt.',
    effects: {
      endCheck: {
        type: 'hygiene', codes: ['chua_so_che', 'bo_qua', 'hong', 'bay', 'bay_nguyen_lieu'],
        passRep: 3, fine: 20000, warnDays: 14,
        pass: 'Bếp sạch, sơ chế đủ bước. Đoàn kiểm tra khen xe mình.',
        warn: 'Đoàn thấy lỗi {errors} nên nhắc nhở lần đầu. Tái phạm trong {days} ngày sẽ bị phạt.',
        fined: 'Tái phạm lỗi {errors} sau lần nhắc nhở nên bị phạt.'
      }
    },
    choice: {
      id: 'chuan_bi', label: 'Chuẩn bị đón đoàn', cost: 10000, safe: true, skipText: 'Nhớ sơ chế đủ bước, lấy đúng nguyên liệu nha.',
      desc: 'Mua bao tay, khăn sạch, dọn lại bếp trước giờ mở hàng: chắc chắn đạt, +5 danh tiếng.',
      effects: {
        endCheck: { type: 'hygiene', sure: true, passRep: 5, pass: 'Bếp chuẩn bị chu đáo, đoàn kiểm tra khen hết lời.' }
      }
    }
  }
})
