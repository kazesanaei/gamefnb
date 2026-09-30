// Nhiệm vụ ngày "Việc hôm nay" (docs/de-xuat-thiet-ke.md mục 9.1).
// Mỗi ngày thật bốc 3 nhiệm vụ: 1 Quầy, 1 Bếp, 1 Chất lượng/Kinh doanh. Không có nhiệm vụ "tiêu tiền".
//
// Mỗi nhiệm vụ đếm một tín hiệu (signal) do lõi dịch từ sự kiện miền (src/core/stats.js):
//   served, five_star, change_correct, change_wrong, change_optimal, readback_clean, qr_ok, fake_detected,
//   perfect_step, perfect_thai, perfect_lua, dish_good, dish_excellent, dish_clean, dish_new_recipe,
//   shift_no_loss, revenue (n = doanh thu ca).
// target: { base } cố định, hoặc { perCustomer, min, max, round } co giãn theo số khách dự kiến của 2 ca.
// breakOn: tín hiệu làm đứt chuỗi (nhiệm vụ "liên tiếp"). assist: không đếm khi bật công tắc Hỗ trợ đó.
// cond: { fromDayKey: khóa BALANCE (ngày game tối thiểu), recentRecipeDays: có món mua trong N ngày game gần nhất }.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const QUEST_GROUPS = deepFreeze({ quay: 'Quầy', bep: 'Bếp', chat_luong: 'Chất lượng' })

export const QUESTS = deepFreeze([
  // Quầy
  { id: 'thoi_dung_lien_tiep', group: 'quay', text: 'Thối đúng {n} lần liên tiếp', signal: 'change_correct',
    breakOn: 'change_wrong', target: { base: 5 }, assist: 'assistCash' },
  { id: 'doc_lai_dung', group: 'quay', text: 'Ghi phiếu đúng ngay lần đọc lại đầu cho {n} khách', signal: 'readback_clean',
    target: { perCustomer: 0.5, min: 3, max: 6 }, assist: 'assistCash' },
  { id: 'thoi_gon', group: 'quay', text: 'Thối gọn (ít tờ nhất) {n} lần', signal: 'change_optimal',
    target: { perCustomer: 0.375, min: 3, max: 6 }, assist: 'assistCash' },
  { id: 'qr_dung', group: 'quay', text: 'Xác nhận đúng {n} thanh toán QR', signal: 'qr_ok',
    target: { base: 2 }, cond: { fromDayKey: 'qrFromDay' }, assist: 'assistCash' },
  // Bếp
  { id: 'thai_hoan_hao', group: 'bep', text: '{n} lần Hoàn hảo ở bước Thái', signal: 'perfect_thai',
    target: { perCustomer: 0.625, min: 5, max: 8 }, assist: 'assistMotion' },
  { id: 'mon_du_nguyen_lieu', group: 'bep', text: '{n} món không có lỗi nguyên liệu', signal: 'dish_clean',
    target: { perCustomer: 0.375, min: 3, max: 6 } },
  { id: 'lua_hoan_hao', group: 'bep', text: '{n} lần Hoàn hảo ở bước Canh lửa', signal: 'perfect_lua',
    target: { base: 3 }, assist: 'assistMotion' },
  { id: 'mon_vua_mua', group: 'bep', text: 'Nấu {n} phần món vừa mua', signal: 'dish_new_recipe',
    target: { base: 2 }, cond: { recentRecipeDays: 3 } },
  // Chất lượng / Kinh doanh
  { id: 'tuyet_hao', group: 'chat_luong', text: 'Nấu {n} món Tuyệt hảo', signal: 'dish_excellent',
    target: { perCustomer: 0.375, min: 3, max: 6 } },
  { id: 'phuc_vu', group: 'chat_luong', text: 'Phục vụ {n} khách', signal: 'served',
    target: { perCustomer: 1, min: 8, max: 14 } },
  { id: 'khong_bo_ve', group: 'chat_luong', text: 'Không để khách nào bỏ về trong 1 ca', signal: 'shift_no_loss',
    target: { base: 1 }, cond: { fromDayKey: 'leaveFromDay' } },
  { id: 'doanh_thu', group: 'chat_luong', text: 'Doanh thu trong ngày đạt {money}', signal: 'revenue', money: true,
    target: { perCustomer: 12000, min: 80000, max: 200000, round: 5000 } }
])

export const QUEST_CONFIG = deepFreeze({
  perDay: 3,
  groups: ['quay', 'bep', 'chat_luong'],   // mỗi nhóm 1 nhiệm vụ, theo thứ tự này
  shiftsPerDay: 2,                         // chỉ tiêu tính cho khoảng 2 ca
  reward: { incomeMul: 0.2, rep: 5 },      // mỗi nhiệm vụ: 0,2 thu nhập tham chiếu + 5 danh tiếng
  chest: { incomeMul: 0.2, gold: 5 },      // Rương ngày khi đủ 3 nhiệm vụ
  freeRerolls: 1,                          // đổi nhiệm vụ miễn phí mỗi ngày
  rerollCost: 5,                           // Muỗng Vàng cho mỗi lần đổi sau đó
  forgottenMailDays: 7                     // nhiệm vụ quên nhận vào Hộp thư, giữ 7 ngày
})
