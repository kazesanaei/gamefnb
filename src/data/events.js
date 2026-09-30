// Sự kiện có thời hạn (docs/de-xuat-thiet-ke.md mục 7.3–7.5). Engine chạy hoàn toàn theo dữ liệu:
// thêm Giáng sinh, Tết… chỉ cần khai báo thêm một mục ở đây (và món có source 'event', eventId trùng id).
//
// Thời gian: from / to là ngày 'YYYY-MM-DD'; sự kiện mở lúc 04:00 giờ Việt Nam ngày `from` và đóng lúc
// 04:00 giờ Việt Nam ngày `to` (không tính ngày `to`). Thẻ "Sắp diễn ra" hiện trước `teaserDays` ngày.
// Tem dư có `graceDays` ngày ân hạn sau khi đóng, rồi tự đổi ra Tiền quán theo `leftover`.
//
// tem: perGoodDish (mỗi món đạt Ngon trở lên), festiveBonus (thêm cho món lễ), dailyCap (trần Tem từ món/ngày).
// quests: nhiệm vụ sự kiện mỗi ngày (đếm tín hiệu như src/data/quests.js), thưởng Tem.
// checkin: điểm danh sự kiện (mỗi ô `tem`).
// chain: chuỗi sự kiện; gates[k] = số ngày thật đã chơi trong mùa cần có để mở bước k (gộp bước khi còn ít ngày).
// exchange: Quầy đổi Tem; gives là Reward, limit là số lần đổi tối đa.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const EVENTS = deepFreeze({
  tri_an_20_11: {
    id: 'tri_an_20_11', name: 'Tri ân 20/11', year: 2026,
    from: '2026-11-12', to: '2026-11-22', teaserDays: 3, graceDays: 3,
    label: 'Tri ân 20/11 · 2026',
    desc: 'Mùa tri ân thầy cô: nấu món ngon, gom Phấn Trắng, nhận công thức Chè bưởi miễn phí.',
    currencyId: 'phan_trang', currencyName: 'Phấn Trắng',
    recipes: ['che_buoi'],
    recipeWeightMul: 2,      // trong mùa, món lễ (đã sở hữu) được gọi ×2; giá bán không đổi
    tem: { perGoodDish: 1, festiveBonus: 2, dailyCap: 30 },
    quests: [
      { id: 'ev_phuc_vu', text: 'Phục vụ {n} khách', signal: 'served', target: 4, reward: { tem: 10 } },
      { id: 'ev_mon_ngon', text: 'Nấu {n} món đạt Ngon trở lên', signal: 'dish_good', target: 3, reward: { tem: 10 } },
      { id: 'ev_nam_sao', text: 'Được {n} khách chấm 5 sao', signal: 'five_star', target: 2, reward: { tem: 10 } }
    ],
    checkin: { slots: 7, tem: 15 },
    chain: {
      id: 'tri_an_20_11_chuoi', name: 'Nồi chè tri ân', npc: 'co_giao',
      gates: [1, 1, 2, 2, 3],
      steps: [
        { id: 'thu_co_giao', text: 'Thư của cô giáo cũ: phục vụ {n} khách', where: 'quay',
          signal: 'served', target: 5, reward: { tem: 20 } },
        { id: 'chuan_bi_qua', text: 'Chuẩn bị quà tri ân: nấu {n} món đạt Ngon trở lên', where: 'bep',
          signal: 'dish_good', target: 3, reward: { tem: 25 } },
        { id: 'goi_qua', text: 'Gói quà cẩn thận: thối đúng {n} lần', where: 'quay',
          signal: 'change_correct', target: 3, reward: { tem: 30 } },
        { id: 'loi_cam_on', text: 'Lời cảm ơn: được {n} khách chấm 5 sao', where: 'quay',
          signal: 'five_star', target: 3, reward: { tem: 35 } },
        { id: 'noi_che', text: 'Nồi chè tri ân: nấu {n} món Tuyệt hảo', where: 'bep',
          signal: 'dish_excellent', target: 2, reward: { tem: 40, recipe: 'che_buoi' } }
      ],
      doneText: 'Cô Hạnh: "Chè bưởi này là quà của cô. Con giữ công thức mà nấu quanh năm nhé!"'
    },
    exchange: [
      { id: 'bang_den_tri_an', name: 'Bảng đèn "Tri ân thầy cô"', price: 150, gives: { cosmetic: 'bang_den_tri_an' }, limit: 1 },
      { id: 'chau_hoa_tri_an', name: 'Chậu hoa cúc tri ân', price: 200, gives: { cosmetic: 'chau_hoa_tri_an' }, limit: 1 },
      { id: 'co_phan_trang', name: 'Dù hình hộp phấn trắng', price: 250, gives: { cosmetic: 'co_phan_trang' }, limit: 1 },
      { id: 'doi_muong_vang', name: '10 Muỗng Vàng', price: 50, gives: { gold: 10 }, limit: 5 }
    ],
    // Tem dư sau ân hạn: 100 Tem đổi 1 lần thu nhập tham chiếu một ca (tỉ lệ thấp), gửi qua Hộp thư
    leftover: { per: 100, incomeMul: 1 }
  }
})
