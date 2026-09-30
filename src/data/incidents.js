// Tình huống trong ca (docs/de-xuat-thiet-ke.md mục 9.3b, docs/can-bang.md mục 14.2; M4: docs/tham-khao/m4-thiet-ke.md
// mục B, D). Lõi: src/core/incidents.js.
//
// Luật chung (INCIDENT_CONFIG), M4 tần suất "dày" theo Cài đặt "Tần suất sự kiện" (settings.incidentFrequency):
// - Từ ngày game `fromDay`, mỗi ca TỐI ĐA `maxPerShift[mức]` tình huống: lần 1 có xác suất `chance[mức]`; có lần 1 thì
//   lần 2 có xác suất `secondChance[mức]`, chỉ khi ca có từ `secondMinCustomers` khách. Hai tình huống cách nhau ít
//   nhất `minGap` khách (xong khâu quầy), không có 2 loại xấu trong cùng ca.
// - Bảo hiểm: `guaranteeAfter[mức]` ca liền (từ fromDay) không có tình huống thì ca kế chắc chắn có ít nhất 1.
//   Tỉ lệ thực (ca có ≥ 1 tình huống): Nhiều khoảng 80%, Vừa khoảng 60%, Ít khoảng 40%.
// - Loại (`kind`): 'tot' (có lợi), 'chon' (được mất tùy cách chọn), 'xau' (bất lợi, luôn có cách an toàn). Mức "Ít" chỉ
//   bốc loại tốt; loại xấu chỉ có từ ngày game `badFromDay`. Luật nhịp: không 2 tình huống xấu liền nhau; tình huống
//   trước lỗ từ `calmAfterLoss` trần trở lên thì lần sau chỉ bốc loại tốt hoặc loại chọn không có phạt; ngày có sự kiện
//   ngày loại xấu thì không bốc tình huống xấu.
// - Không lặp `noRepeat` tình huống gần nhất khi còn tình huống khác để chọn (còn ít loại thì lấy loại lâu chưa gặp nhất).
// - Trần mỗi tình huống: thiệt hại ≤ min(10% doanh thu dự kiến của ca, 0,5 thu nhập tham chiếu một ca), làm tròn xuống
//   bội 500đ (`lossCap`); tiền thưởng ≤ min(15% doanh thu dự kiến, 0,75 thu nhập tham chiếu), làm tròn xuống bội 1.000đ
//   (`gainCap`). Tình huống có lựa chọn vượt trần thì không được chọn cho ca đó. Trần mỗi ngày thật: BALANCE.eventDayCap.
// - Tình huống chỉ bật ở tab Quầy, GIỮA hai khách (quầy trống), không chen vào mini-game; hộp thoại chặn thời gian ca
//   nên kiên nhẫn của khách tạm dừng. Mỗi lựa chọn ghi rõ cái giá; luôn có 1 lựa chọn an toàn (`safe: true`).
//
// Chữ hiển thị có chỗ chèn: {who} người trong tình huống, {mon} tên món, {qty} số phần, {price} giá, {amount} số tiền,
// {change} tiền phải thối, {drawer} tiền trong két, {from}/{to} món cũ/món mới, {diff} phần chênh, {no} số phiếu,
// {qrDay} ngày mở QR; tình huống chạy theo dữ liệu (M4) thêm {cost} giá vốn, {sold} số phần đã bán trong ca,
// {sellAmount} tiền bán đồ cũ, {rare} tên nguyên liệu hiếm, {rarePrice} giá một phần hàng hiếm, {self} cách người trong
// tình huống tự xưng.
//
// M4 (thiết kế mục B.3): tình huống `generic: true` chạy chung một loại 'chung' trong src/core/incidents.js, không cần
// code riêng:
// - who: tên người trong tình huống (chuỗi, hoặc {name, gender, persona, self} để hình minh họa và cách tự xưng khớp người
//   được chọn). Tên chọn sao cho khớp hình minh họa (art).
// - fromDay: ngày game sớm nhất; needs (điều kiện của cả tình huống): qr (đã có mã QR), lua (thực đơn có món nấu bằng
//   bếp gas), soldPortions (đã bán đủ n phần trong ca mới bật), ownsRare (đã có công thức hiếm), stockRoom (kho hàng
//   hiếm còn chỗ). recipeId/qty: món dùng cho tiền bán ({price}) hoặc giá vốn ({cost}). art: hình minh họa.
// - Mỗi lựa chọn: needs ('qr' | {room: n}), cost (chữ ghi cái giá), costNoRare (khi chưa có hàng hiếm), hint (lựa chọn
//   "xanh" nhờ hiện vật: {upgrade, text}), outcomes: [{p, sale ('cash' | 'qr': bán món của tình huống, có giá vốn),
//   money (tiền thưởng, số hoặc {perSold, max}), fine (tiền mất/phạt), spend (tiền tự chi mua), cogs ('mon' | số),
//   rep, rare (số phần hàng hiếm), fragment (số mảnh công thức hiếm), waitMul (ngân sách chờ món phần còn lại của ca),
//   result, resultNoRare}]. Xác suất p của mỗi lựa chọn cộng lại bằng 1; một lần bốc (lưu trong tình huống) dùng chung
//   cho mọi lựa chọn nên tải lại trang không đổi kết quả.
// - maxLoss/maxGain/maxFine tự tính từ outcomes: thiệt hại = tiền mất + tiền chi + giá vốn − tiền bán − tiền thưởng.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const INCIDENT_CONFIG = deepFreeze({
  fromDay: 3,
  chance: { nhieu: 0.75, vua: 0.55, it: 0.3 },           // lần 1 mỗi ca
  secondChance: { nhieu: 0.45, vua: 0.3, it: 0 },        // lần 2 (đã có lần 1)
  maxPerShift: { nhieu: 2, vua: 2, it: 1 },
  guaranteeAfter: { nhieu: 1, vua: 2, it: 3 },           // số ca liền không có tình huống → ca kế chắc chắn có
  secondMinCustomers: 6,                                 // lần 2 chỉ khi ca có từ 6 khách
  minGap: 2,                                             // hai tình huống trong ca cách nhau ít nhất 2 khách
  goodOnly: ['it'],                                      // mức chỉ bốc loại tốt (không có khoản phạt)
  badFromDay: 5,                                         // loại xấu mở từ ngày game 5
  calmAfterLoss: 0.5,                                    // tình huống trước lỗ ≥ 50% trần → lần sau nhẹ nhàng
  noRepeat: 5,
  lossCap: { revenueShare: 0.1, incomeMul: 0.5 },
  gainCap: { revenueShare: 0.15, incomeMul: 0.75 },
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
    id: 'khach_mo_hang', name: 'Khách mở hàng bằng tờ 500.000đ', kind: 'tot', positive: true, w: 1,
    when: 'mo_hang',                 // trước khách đầu tiên của ca (chưa bán được gì)
    bill: 500000, recipeId: 'tra_tac', qty: 1,
    who: ['Chú Bảy', 'Cô Năm', 'Anh Tư xe ôm', 'Chị Út bán xôi'],
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
    id: 'ghi_no', name: 'Khách quen xin ghi nợ 20.000đ', kind: 'chon', positive: false, w: 1.2,
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
    id: 'doi_y', name: 'Khách đổi ý sau khi đã thanh toán', kind: 'chon', positive: false, w: 1.2,
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
  },

  // ---------- M4: tám tình huống chạy theo dữ liệu (thiết kế mục B.3) ----------
  // Tỉ lệ bốc ở mức Vừa theo trọng số: loại tốt 44,6%, loại chọn 42,9%, loại xấu 12,5%.

  // Xấu: tờ tiền nghi giả. Chỉ nêu cách nhận biết, không bao giờ nhận tiền giả để tiêu lại.
  tien_nghi_gia: {
    id: 'tien_nghi_gia', name: 'Tờ 20.000đ nghi là tiền giả', kind: 'xau', positive: false, w: 0.7, fromDay: 5,
    generic: true, when: 'giua_khach',
    recipeId: 'tra_tac', qty: 1, bill: 20000, art: { bill: 20000 },
    // (không gọi là "khách lạ": khách lạ ★ là khách mang quà quê, dễ bị hiểu lầm)
    who: ['Một anh khách đi đường', 'Một chị khách vãng lai', 'Một người đi ngang'],
    text: '{who} mua một ly {mon} ({price}), đưa tờ 20.000đ. Tờ tiền sờ hơi trơn, màu nhạt hơn thường ngày.',
    note: 'Cách nhận biết tiền thật: vuốt thấy chữ nổi hơi nhám, đưa ra chỗ sáng thấy hình ẩn, ô cửa sổ trong suốt không bong mép.',
    tipTrigger: 'tien_gia', tipOn: 'all',          // thẻ "Soi tiền trước khi thối"
    choices: [
      { id: 'soi_ky', label: 'Soi kỹ rồi mới nhận', safe: true,
        cost: 'Không mất gì · tiền thật thì bán được {price}, tiền giả thì từ chối lịch sự',
        outcomes: [
          { p: 0.5, sale: 'cash', result: 'Soi kỹ thấy đủ chữ nổi, hình ẩn: tiền thật. Đã bán ly {mon} và thối đủ.' },
          { p: 0.5, result: 'Tờ tiền không có hình ẩn, chữ không nổi. Mình từ chối lịch sự, {who} lặng lẽ đi luôn.' }
        ] },
      { id: 'moi_qr', label: 'Mời chuyển khoản QR', needs: 'qr',
        cost: '+{price} tiền bán qua QR · khỏi lo tiền giả',
        blocked: 'Xe chưa có mã QR (mở từ ngày {qrDay})',
        outcomes: [
          { p: 1, sale: 'qr', result: '{who} quét mã chuyển {price}, tiền về đúng số rồi mới giao ly {mon}.' }
        ] },
      { id: 'nhan_luon', label: 'Nhận luôn cho nhanh',
        cost: 'Tiền thật thì bán được {price} · tiền giả thì mất {change} tiền thối và {cost} giá vốn',
        outcomes: [
          { p: 0.5, sale: 'cash', result: 'May là tiền thật. Lần sau soi kỹ rồi mới thối cho chắc nha.' },
          { p: 0.5, fine: 10000, cogs: 'mon',
            result: 'Chốt két mới thấy tờ 20.000đ là tiền giả: mất {change} tiền thối và ly {mon}.' }
        ] }
    ]
  },

  // Chọn: người giao hàng nói khách đã chuyển khoản nhưng tiền chưa về
  shipper_chuyen_khoan: {
    id: 'shipper_chuyen_khoan', name: 'Người giao hàng nói "khách chuyển khoản rồi"', kind: 'chon', positive: false, w: 1.2, fromDay: 5,
    generic: true, when: 'giua_khach', needs: { qr: true },
    recipeId: 'tra_tac', qty: 2, art: { persona: 'cong_nhan', gender: 'nam' },
    // tên khớp hình minh họa (áo xanh, nón bảo hiểm vàng)
    who: [{ name: 'Anh giao hàng áo xanh', gender: 'nam' }, { name: 'Anh giao hàng đội nón vàng', gender: 'nam' }, { name: 'Chị giao hàng', gender: 'nu', persona: 'hoc_sinh' }],
    text: '{who} ghé lấy hộ {qty} ly {mon} ({price}) cho khách đặt qua điện thoại, nói "khách chuyển khoản rồi đó", nhưng chưa thấy tiền về.',
    tipTrigger: 'cho_tien_ve', tipOn: 'all',       // thẻ "Thấy tiền về mới giao món"
    choices: [
      { id: 'cho_tien_ve', label: 'Chờ tiền về rồi mới giao', safe: true,
        cost: 'Tiền về thì bán được {price} · đơn hủy thì chưa pha nên không mất gì',
        hint: { upgrade: 'loa_bao_tien', text: 'Nhờ có Loa báo tiền: loa đọc số là biết tiền về hay chưa.' },
        outcomes: [
          { p: 0.75, sale: 'qr', result: 'Chờ chút thì tiền về đúng {price}. Giao {qty} ly, {who} cảm ơn rồi chạy đi.' },
          { p: 0.25, result: 'Chờ mãi không thấy tiền về, khách hủy đơn. May mà chưa pha ly nào.' }
        ] },
      { id: 'giao_luon', label: 'Giao luôn cho kịp',
        cost: 'Tiền về thì bán được {price} · không về thì mất {cost} giá vốn',
        outcomes: [
          { p: 0.75, sale: 'qr', result: 'Vài phút sau tiền về đúng {price}. Lần này suôn sẻ.' },
          { p: 0.25, cogs: 'mon', result: 'Hết ca vẫn không thấy tiền về: mất {qty} ly {mon}. Thấy tiền về rồi mới giao nha con.' }
        ] }
    ]
  },

  // Xấu: bình gas mini hết giữa ca (chỉ khi thực đơn có món nấu bằng bếp gas)
  gas_het: {
    id: 'gas_het', name: 'Bình gas mini hết giữa ca', kind: 'xau', positive: false, w: 0.7, fromDay: 5,
    generic: true, when: 'giua_khach', needs: { lua: true },
    recipeId: 'tra_tac', qty: 1, art: { persona: 'co_chu', gender: 'nu' },
    who: ['Cô Út bán xôi'],
    text: 'Đang bán thì bình gas mini của bếp hết sạch. {who} kế bên có bếp đang rảnh.',
    note: 'Bài học: luôn để sẵn một bình gas dự phòng trên xe.',
    choices: [
      { id: 'mua_binh', label: 'Chạy đi mua bình mới',
        cost: '−12.000đ tiền mua bình gas',
        outcomes: [{ p: 1, spend: 12000, result: 'Mua bình mới lắp vào, bếp chạy lại ngay.' }] },
      { id: 'muon_bep', label: 'Mượn bếp cô bán xôi', safe: true,
        cost: '−{cost} giá vốn (mời cô 1 ly {mon}) · +1 danh tiếng · món nấu chậm hơn một chút tới cuối ca',
        outcomes: [{ p: 1, cogs: 'mon', rep: 1, waitMul: 0.9,
          result: '{who} cho mượn bếp, mình mời lại ly {mon}. Bếp xa hơn nên món ra chậm hơn một chút.' }] }
    ]
  },

  // Tốt: khách bỏ quên ví
  khach_quen_vi: {
    id: 'khach_quen_vi', name: 'Khách bỏ quên ví trên ghế', kind: 'tot', positive: true, w: 1, fromDay: 3,
    generic: true, when: 'giua_khach', art: { persona: 'co_chu', gender: 'nam' },
    who: [{ name: 'Chú Năm', gender: 'nam' }, { name: 'Cô Tư', gender: 'nu' },
      { name: 'Anh Hải', gender: 'nam', persona: 'van_phong' }, { name: 'Chị Mai', gender: 'nu', persona: 'van_phong' }],
    text: 'Dọn ghế thì thấy cái ví {who} bỏ quên, trong có giấy tờ và ít tiền.',
    choices: [
      { id: 'cat_giu', label: 'Cất giữ chờ khách quay lại', safe: true,
        cost: '+2 danh tiếng · khoảng 7/10 lần khách quay lại cảm ơn',
        outcomes: [
          { p: 0.7, money: 10000, rep: 2, result: '{who} hớt hải quay lại, mừng rỡ nhận ví và gửi 10.000đ cảm ơn.' },
          { p: 0.3, rep: 2, result: 'Hết ca khách chưa quay lại, mình mang ví nộp công an phường để trả lại chủ.' }
        ] },
      { id: 'bao_loa', label: 'Nhờ tổ dân phố báo loa',
        cost: '+1 danh tiếng · khoảng 6/10 lần khách gửi 1 phần nguyên liệu hiếm làm quà quê',
        costNoRare: '+1 danh tiếng · loa phường báo, khách tìm tới nhận lại ví',
        outcomes: [
          { p: 0.6, rep: 1, rare: 1, result: '{who} nghe loa tìm tới nhận ví, gửi tặng 1 phần {rare} làm quà quê.',
            resultNoRare: '{who} nghe loa tìm tới nhận lại ví, cảm ơn rối rít.' },
          { p: 0.4, rep: 1, result: '{who} nghe loa tìm tới nhận lại ví, cảm ơn rối rít.' }
        ] }
    ]
  },

  // Tốt: cô ve chai hỏi mua ly, thùng giấy (khi đã bán từ 3 phần)
  ve_chai: {
    id: 've_chai', name: 'Cô Hai ve chai hỏi mua ly, thùng giấy', kind: 'tot', positive: true, w: 1, fromDay: 3,
    generic: true, when: 'giua_khach', needs: { soldPortions: 3 }, art: { persona: 'co_chu', gender: 'nu' },
    who: ['Cô Hai ve chai'],
    text: '{who} ghé hỏi mua lại ly nhựa sạch và thùng giấy cũ. Ca này xe đã bán {sold} phần.',
    choices: [
      { id: 'ban', label: 'Bán cho cô', safe: true,
        cost: '+{sellAmount} (1.000đ mỗi phần đã bán, tối đa 8.000đ)',
        outcomes: [{ p: 1, money: { perSold: 1000, max: 8000 }, result: 'Cô Hai gom ly, thùng, gửi {sellAmount}. Đồ cũ đi gọn, xe cũng sạch.' }] },
      { id: 'cho', label: 'Cho cô luôn',
        cost: '+3 danh tiếng',
        outcomes: [{ p: 1, rep: 3, result: 'Cô Hai cảm ơn, đi đâu cũng kể xe mình tốt bụng.' }] }
    ]
  },

  // Tốt: đoàn khách du lịch hỏi đường
  doan_khach_hoi_duong: {
    id: 'doan_khach_hoi_duong', name: 'Đoàn khách du lịch hỏi đường ra chợ', kind: 'tot', positive: true, w: 1, fromDay: 4,
    generic: true, when: 'giua_khach', recipeId: 'tra_tac', qty: 2, art: { persona: 'van_phong', gender: 'nu' },
    // hình minh họa là một người: chị hướng dẫn viên đại diện đoàn
    who: ['Chị hướng dẫn viên của một đoàn khách du lịch'],
    text: '{who} dừng xe hỏi đường ra chợ. Trời nắng, ai trong đoàn cũng ngó bảng giá trà tắc.',
    choices: [
      { id: 'chi_duong', label: 'Chỉ đường tận tình', safe: true,
        cost: '+2 danh tiếng',
        outcomes: [{ p: 1, rep: 2, result: 'Đoàn cảm ơn rối rít, hứa về kể cho bạn bè nghe về xe mình.' }] },
      { id: 'moi_tra', label: 'Chỉ đường và mời mua 2 ly trà tắc',
        cost: '+{price} tiền bán · −{cost} giá vốn',
        outcomes: [{ p: 1, sale: 'cash', result: 'Đoàn mua {qty} ly {mon} uống cho mát rồi mới đi chợ.' }] }
    ]
  },

  // Tốt: khách quen từ quê lên gửi quà (nguồn nguyên liệu hiếm; chỉ khi kho hàng hiếm còn chỗ và mức hàng hiếm hôm nay
  // chưa đủ)
  khach_que_gui_qua: {
    id: 'khach_que_gui_qua', name: 'Khách quen từ quê lên gửi quà', kind: 'tot', positive: true, w: 1, fromDay: 3,
    generic: true, when: 'giua_khach', needs: { stockRoom: true },
    recipeId: 'tra_tac', qty: 1, art: { persona: 'co_chu', gender: 'nam' },
    who: [{ name: 'Chú Bảy dưới quê', gender: 'nam' }, { name: 'Cô Ba miền Tây', gender: 'nu' }, { name: 'Anh Tư Tây Ninh', gender: 'nam', persona: 'cong_nhan' }],
    text: '{who} là khách quen, mới ở quê lên, ghé xe gửi tặng 1 phần {rare}.',
    choices: [
      { id: 'moi_tra', label: 'Mời lại ly trà',
        cost: '−{cost} giá vốn · +2 danh tiếng · nhận 1 phần {rare}',
        outcomes: [{ p: 1, cogs: 'mon', rep: 2, rare: 1, result: 'Mời {who} ly {mon} ngồi nghỉ chân, chuyện quê rôm rả. Nhận 1 phần {rare}.',
          resultNoRare: 'Mời {who} ly {mon} ngồi nghỉ chân, chuyện quê rôm rả.' }] },
      { id: 'nhan', label: 'Nhận quà, cảm ơn', safe: true,
        cost: 'Nhận 1 phần {rare}',
        outcomes: [{ p: 1, rare: 1, result: 'Cảm ơn {who}, cất 1 phần {rare} vào kho hàng hiếm.',
          resultNoRare: 'Cảm ơn {who} đã nhớ tới xe mình.' }] }
    ]
  },

  // Chọn: cô bán dạo mời nguyên liệu hiếm (hàng biết trước, giá công khai; chỉ khi đã có công thức hiếm)
  nguoi_ban_dao: {
    id: 'nguoi_ban_dao', name: 'Cô bán dạo mời nguyên liệu hiếm', kind: 'chon', positive: false, w: 1.2, fromDay: 4,
    generic: true, when: 'giua_khach', needs: { ownsRare: true, stockRoom: true }, art: { persona: 'co_chu', gender: 'nu' },
    // self: cách người bán tự xưng ({self} trong câu kết quả)
    who: [{ name: 'Cô Tư bán dạo miền Tây', gender: 'nu', self: 'cô' }, { name: 'Cô Chín bán dạo quê Cà Mau', gender: 'nu', self: 'cô' }],
    rarePrice: 4000,
    text: '{who} gánh hàng quê ngang qua, mời mua {rare}, {rarePrice} một phần. Hàng thật, nhìn tận mắt rồi mới mua.',
    choices: [
      { id: 'mua_2', label: 'Mua 2 phần', needs: { room: 2 },
        cost: '−8.000đ · +2 phần {rare}',
        blocked: 'Kho {rare} không đủ chỗ cho 2 phần',
        outcomes: [{ p: 1, spend: 8000, rare: 2, result: 'Mua 2 phần {rare}, cất vào kho hàng hiếm.' }] },
      { id: 'mua_1', label: 'Mua 1 phần', needs: { room: 1 },
        cost: '−4.000đ · +1 phần {rare}',
        blocked: 'Kho {rare} đã đầy',
        outcomes: [{ p: 1, spend: 4000, rare: 1, result: 'Mua 1 phần {rare}, cất vào kho hàng hiếm.' }] },
      { id: 'hen', label: 'Hẹn bữa khác', safe: true,
        cost: 'Không tốn gì',
        outcomes: [{ p: 1, result: '{who} cười: "Bữa sau {self} ghé nữa nha!"' }] }
    ]
  }
})
