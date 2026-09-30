// Chuỗi nhiệm vụ (docs/de-xuat-thiet-ke.md mục 9.4). Luôn có đúng 1 bước đang làm; không hạn giờ, không thể thất bại.
// Bước dạng đếm { signal, target }: chỉ đếm từ lúc bước hiện ra (tín hiệu xem src/data/quests.js).
// Bước dạng đạt mức { check }: kiểm tra trạng thái hiện tại:
//   { reputation, avgRating, ownsShopRecipe: true, upgrade: id }.
// forceFakeQr: khi tới bước này, ca kế tiếp chắc chắn có 1 khách trả bằng ảnh chuyển khoản giả.
// assist + assistSignal: khi bật công tắc Hỗ trợ đó (món bị trần ở hạng Ngon nên không có Tuyệt hảo, khách tối đa 4 sao)
//   bước đếm tín hiệu thay thế để chuỗi không bao giờ kẹt; assistText hiện trên thẻ chuỗi.
// Phần thưởng theo lược đồ Reward (src/data/checkin.js); tipId là thẻ Mẹo nghề mở kèm.
// Chuỗi của sự kiện có thời hạn khai báo trong src/data/events.js (trường chain).

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const CHAINS = deepFreeze({
  ngay_dau_ra_pho: {
    id: 'ngay_dau_ra_pho', name: 'Ngày đầu ra phố', npc: 'di_sau', main: true, fromDay: 1,
    steps: [
      { id: 'khach_dau_tien', text: 'Phục vụ khách đầu tiên', where: 'quay',
        signal: 'served', target: 1, reward: { gold: 5, tipId: 'tra_truoc' } },
      { id: 'thoi_dung', text: 'Thối đúng {n} lần', where: 'quay',
        signal: 'change_correct', target: 3, reward: { money: 5000, tipId: 'dem_hai_lan' } },
      { id: 'doc_lai_dung', text: 'Ghi phiếu đúng ngay lần đọc lại đầu cho {n} khách', where: 'quay',
        signal: 'readback_clean', target: 3, reward: { money: 5000, tipId: 'doc_lai_order' } },
      // M4 (cân bằng, docs/can-bang.md mục 10.1 và 16): tiền thưởng bước 4 / 5 / 6 giảm 15k / 30k / 30k → 10k / 15k / 10k.
      // Luật tip mới làm lãi những ngày đầu của người chơi giỏi giảm khoảng 40%, chuỗi hướng dẫn trả gần hết vào ngày
      // thật 1–2 nên tỉ lệ thưởng vượt trần 35% ở 19/200 ngày mô phỏng (40 hạt giống); sau khi giảm: cao nhất 34,1%.
      { id: 'hoan_hao', text: 'Đạt {n} lần Hoàn hảo ở bước bếp', where: 'bep',
        signal: 'perfect_step', target: 5, reward: { money: 10000, tipId: 'thot_rieng' } },
      { id: 'mua_cong_thuc', text: 'Mua công thức đầu tiên ở Chợ Công Thức', where: 'shop',
        check: { ownsShopRecipe: true }, reward: { money: 15000, tipId: 'dinh_luong_chuan' } },
      { id: 'tuyet_hao', text: 'Nấu {n} món Tuyệt hảo', where: 'bep',
        signal: 'dish_excellent', target: 3, assist: 'assistMotion', assistSignal: 'dish_good',
        assistText: 'Đang bật Hỗ trợ thao tác nên món đạt Ngon trở lên cũng được đếm.',
        reward: { money: 10000, gold: 5, tipId: 'nem_tu_it' } },
      // cùng ngưỡng danh tiếng với điều kiện lên Chặng 2 (src/data/progression.js) để bước cuối xong cùng lúc
      { id: 'danh_tieng', text: 'Đạt 150 danh tiếng và sao trung bình từ 3,8', where: 'chung',
        check: { reputation: 150, avgRating: 3.8 },
        reward: { gold: 20, title: 'chu_xe_dau_hem', unlock: 'the_quan_coc', tipId: 'ty_le_gia_von' } }
    ],
    doneText: 'Dì Sáu: "Giỏi lắm con! Từ nay con là Chủ xe đầu hẻm rồi, mình tính chuyện dọn ra vỉa hè thôi."'
  },
  lam_quen_qr: {
    id: 'lam_quen_qr', name: 'Làm quen QR', npc: 'anh_khoa', main: false, fromDayKey: 'qrFromDay',
    steps: [
      { id: 'nhan_qr', text: 'Nhận đúng {n} thanh toán QR', where: 'quay',
        signal: 'qr_ok', target: 3, reward: { gold: 5 } },
      { id: 'bat_anh_gia', text: 'Phát hiện {n} ảnh chuyển khoản giả', where: 'quay',
        signal: 'fake_detected', target: 1, forceFakeQr: true, reward: { gold: 5 } },
      { id: 'mua_loa', text: 'Mua Loa báo tiền', where: 'shop',
        check: { upgrade: 'loa_bao_tien' }, reward: { tipId: 'qr_dung_so' } }
    ],
    doneText: 'Anh Khoa: "Nhớ nha, ảnh chụp màn hình không phải là tiền!"'
  }
})

// verb: động từ ghép với tên trên thẻ chuỗi, thông báo trong ca và Tổng kết ("Dì Sáu dặn", "Cô Hạnh nhờ").
export const NPCS = deepFreeze({
  di_sau: { name: 'Dì Sáu', verb: 'dặn' },
  anh_khoa: { name: 'Anh Khoa', verb: 'dặn' },
  co_giao: { name: 'Cô Hạnh', verb: 'nhờ' }
})

export const CHAIN_WHERE = deepFreeze({ quay: 'Làm ở Quầy', bep: 'Làm ở Bếp', shop: 'Làm ở Chợ Công Thức', chung: 'Cứ bán tốt là đạt' })
