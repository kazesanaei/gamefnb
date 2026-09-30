// Tình huống trong ca (docs/de-xuat-thiet-ke.md mục 9.3b, docs/can-bang.md mục 14.3). Lõi: src/core/incidents.js.
//
// Luật chung (INCIDENT_CONFIG):
// - Từ ngày game `fromDay`, mỗi ca có xác suất `chance[mức]` ra TỐI ĐA 1 tình huống; mức lấy từ Cài đặt
//   (settings.incidentFrequency: Nhiều / Vừa / Ít). Mức "Ít" chỉ gồm tình huống tích cực (`positive: true`).
// - Bảo hiểm: `guaranteeAfter` ca liền (từ fromDay) không có tình huống thì ca kế chắc chắn có.
// - Không lặp `noRepeat` tình huống gần nhất khi còn tình huống khác để chọn (còn ít loại thì lấy loại lâu chưa gặp nhất).
// - Trần thiệt hại mỗi tình huống: min(10% doanh thu dự kiến của ca, 0,5 thu nhập tham chiếu một ca), làm tròn xuống
//   bội 500đ. Tình huống có lựa chọn lỗ quá trần thì không được chọn cho ca đó.
// - Tình huống chỉ bật ở tab Quầy, GIỮA hai khách (quầy trống), không chen vào mini-game; hộp thoại chặn thời gian ca
//   nên kiên nhẫn của khách tạm dừng. Mỗi lựa chọn ghi rõ cái giá; luôn có 1 lựa chọn an toàn (`safe: true`).
//
// Chữ hiển thị có chỗ chèn: {who} người trong tình huống, {mon} tên món, {qty} số phần, {price} giá, {amount} số tiền,
// {change} tiền phải thối, {drawer} tiền trong két, {from}/{to} món cũ/món mới, {diff} phần chênh, {no} số phiếu,
// {qrDay} ngày mở QR.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const INCIDENT_CONFIG = deepFreeze({
  fromDay: 3,
  chance: { nhieu: 0.5, vua: 0.35, it: 0.15 },
  guaranteeAfter: 3,
  noRepeat: 5,
  lossCap: { revenueShare: 0.1, incomeMul: 0.5 },
  logMax: 20,
  recentMax: 10,
  // Nhãn chung cho giao diện
  safeLabel: 'An toàn',
  intro: 'Tình huống giữa hai khách',
  introOpening: 'Tình huống đầu ca',
  positiveTag: 'chuyện vui'
})

export const INCIDENTS = deepFreeze({
  // (a) Tình huống tích cực: khách đầu tiên của ca (mở hàng) chỉ có tờ tiền lớn.
  khach_mo_hang: {
    id: 'khach_mo_hang', name: 'Khách mở hàng bằng tờ 500.000đ', positive: true, w: 1,
    when: 'mo_hang',                 // trước khách đầu tiên của ca (chưa bán được gì)
    bill: 500000, recipeId: 'tra_tac', qty: 1,
    who: ['Chú Bảy', 'Cô Năm', 'Anh Tư xe ôm', 'Chị Út bán vé số'],
    text: '{who} ghé mở hàng một ly {mon} ({price}) nhưng chỉ có tờ 500.000đ. Két đầu ca đang có {drawer} tiền lẻ.',
    note: 'Trà rót từ bình pha sẵn đầu ca, không cần vào bếp.',
    tipTrigger: 'no_small_change', tipOn: 'all',      // thẻ "Đủ tiền lẻ đầu ca"
    choices: [
      { id: 'thoi_het', label: 'Thối hết tiền lẻ', needs: 'change',
        cost: '+{price} tiền bán · thối {change}, két gần cạn tiền lẻ cho khách sau',
        blocked: 'Két chỉ có {drawer}, không đủ thối {change}',
        result: 'Đã thối {change}. Két còn ít tiền lẻ, để ý khách sau nha.' },
      { id: 'moi_qr', label: 'Mời chuyển khoản QR', needs: 'qr',
        cost: '+{price} tiền bán qua QR, két giữ nguyên tiền lẻ',
        blocked: 'Xe chưa có mã QR (mở từ ngày {qrDay})',
        result: '{who} quét mã chuyển {price}. Két vẫn đủ tiền lẻ cho cả ca.' },
      { id: 'tang', label: 'Tặng ly trà tắc "mở hàng"', safe: true, bonusCustomers: 1, bonusRep: 2,
        cost: '−{cost} giá vốn · ca sau thêm 1 khách (ca đã đủ {cap} khách thì +{rep} danh tiếng)',
        costFull: '−{cost} giá vốn · ca sau đã đủ {cap} khách nên thay bằng +{rep} danh tiếng',
        result: '{who} vui vẻ nhận ly trà mở hàng, hứa mai rủ thêm người quen ghé xe.',
        resultFull: '{who} vui vẻ nhận ly trà mở hàng, đi đâu cũng khen xe mình với người quen.' }
    ]
  },

  // (b) Khách quen xin ghi nợ.
  ghi_no: {
    id: 'ghi_no', name: 'Khách quen xin ghi nợ 20.000đ', positive: false, w: 1,
    when: 'giua_khach',
    amount: 20000, recipeId: 'tra_tac', qty: 2,
    repayRate: 0.7, repayWithin: 3,    // 70% trả trong 3 ca kế tiếp
    text: '{who} ghé lấy {qty} ly {mon} mang về ({amount}) mà quên ví, xin ghi sổ nợ, mai mốt trả.',
    note: 'Trà rót từ bình pha sẵn đầu ca, không cần vào bếp.',
    choices: [
      { id: 'cho_no', label: 'Cho nợ, ghi vào sổ', rep: 2,
        cost: '−{cost} giá vốn · +2 danh tiếng · khoảng 7/10 khách quen trả đủ {amount} trong 3 ca',
        result: 'Đã ghi sổ: {who} nợ {amount}. Khách quen thường trả trong vài ca tới.' },
      { id: 'tu_choi', label: 'Từ chối khéo', safe: true,
        cost: 'Không tốn gì · khách quen hiểu chuyện, hẹn bữa khác',
        result: '{who} cười xòa: "Ừ, để mai mang tiền rồi ghé nha!"' },
      { id: 'tang', label: 'Tặng luôn, không lấy tiền', rep: 5,
        cost: '−{cost} giá vốn · +5 danh tiếng',
        result: '{who} cảm động, đi đâu cũng khen xe mình tử tế.' }
    ],
    repaid: '{who} ghé trả {amount} tiền ghi nợ hôm trước.',
    unpaid: '{who} chưa trả {amount} tiền ghi nợ. Cho nợ thì nhớ ghi sổ rõ ràng nha.'
  },

  // (c) Khách đổi ý sau khi đã thanh toán, phiếu chưa nấu.
  doi_y: {
    id: 'doi_y', name: 'Khách đổi ý sau khi đã thanh toán', positive: false, w: 1,
    when: 'giua_khach',
    starLossRate: 0.5,               // từ chối: 50% khách phật ý (−1 sao khi nhận món)
    text: '{who} vừa trả tiền xong thì đổi ý: muốn đổi {qty} {from} sang {to}. Phiếu {no} chưa nấu.',
    tipTrigger: 'first_ticket', tipOn: ['doi_mon'],    // thẻ "Thu tiền rồi mới gửi bếp" khi đổi món đúng quy trình
    choices: [
      { id: 'doi_mon', label: 'Đổi món, {diffAction}', safe: true,
        cost: 'Sửa phiếu bếp và phiếu thu, {diffAction} · đúng quy trình',
        result: 'Đã đổi sang {to} và {diffDone}. Phiếu {no} trên dây bếp đã sửa.' },
      { id: 'tu_choi', label: 'Từ chối lịch sự, giữ món cũ',
        cost: 'Không tốn tiền · khoảng một nửa khách sẽ phật ý (−1 sao khi nhận món)',
        result: '{mood}' }
    ],
    moodOk: '{who} gật đầu: "Thôi cũng được, để lần sau thử."',
    moodBad: '{who} hơi phật ý (−1 sao khi nhận món).'
  }
})
