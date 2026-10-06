// Hướng dẫn lần đầu (tour) theo từng màn / khâu, và trang "Cách chơi" của nút "?".
//
// Mỗi tour: {
//   screen:     tên màn (router) nơi tour chạy
//   spot:       (màn ca bán) chỗ đang làm: order | order-sheet | thanh_toan | tinh_tien | qr | receipt (Quầy),
//               rail | line | chon | thot | ready (Bếp), card-<loại bước> (0.5.0: thẻ "Bước k/N" đầy đủ đang chờ chạm,
//               vd card-dap — ui/screens/kitchen.js tourSpot), score (phiếu chấm); không có spot = cả màn
//   lead:       (tùy chọn, màn ca bán) tour đi trước nếu người chơi chưa xem: tới thẳng chỗ này mà bỏ qua chỗ của tour
//               dẫn (vd chạm phiếu trên dây ở đầu màn là mở luôn phiếu trong Bếp) thì hai tour nối tiếp nhau
//   name:       tên ngắn (bảng Hướng dẫn)
//   auto:       false = chỉ chạy bằng nút "?" (không tự hiện)
//   requires:   (tùy chọn) data-testid phải đang hiện thì tour mới TỰ hiện (vd ô đặt tên xe, nút bắt đầu lựa hàng);
//               nút "?" vẫn xem lại được
//   veteranDay: bản lưu cũ (trước khi có tour) đã bán ít nhất một ca và đang ở ngày ≥ số này thì coi như đã xem
//               (core/tour.js migrateTour) — chỉ đặt cho vòng chơi chính người chơi chắc chắn đã đi qua
//   delayMs:    (tùy chọn, 0.5.2) TỰ hiện chậm ít nhất chừng này ms sau khi vào màn, để màn diễn xong hiệu ứng vào màn
//               (vd Tổng kết: sao bật, số đếm lên, xu bay về ví) rồi mới làm tối nền; nút "?" xem lại thì hiện ngay
//   steps: [{
//     target:   data-testid, hoặc bộ chọn CSS (bắt đầu bằng . # [ hoặc có dấu cách), hoặc mảng các lựa chọn (lấy cái đầu
//               tiên đang hiện); null = bong bóng giữa khung, không khoét sáng. Không tìm thấy phần tử → bỏ qua bước
//     span:     (tùy chọn) phần tử cuối của một dải: vùng sáng phủ từ target tới span (vd một hàng ô lối vào)
//     title:    tiêu đề ngắn
//     text:     lời Dì Sáu, tối đa 2 câu ("dì", gọi người chơi là "con")
//     place:    'auto' | 'top' | 'bottom' — bong bóng nằm trên/dưới phần tử (mặc định tự chọn bên rộng hơn)
//     when:     (tùy chọn) điều kiện thêm do giao diện kiểm (TOUR_CONDITIONS của ui/components/tour.js)
//   }]
// }
// Tour giới thiệu GIAO DIỆN; lời nhắc từng bước của khách hướng dẫn ngày 1 (cô Thu, bạn Nam) và lời Dì Sáu trong khung
// vẫn giữ, nên chữ ở đây không lặp lại lời nhắc đó.

const step = (target, title, text, extra = {}) => Object.freeze({ target, title, text, place: 'auto', ...extra })

export const TOURS = Object.freeze({
  // ---------- Màn mở đầu: đặt tên xe ----------
  mo_dau: Object.freeze({
    screen: 'title', name: 'Màn mở đầu', veteranDay: 1, requires: 'shop-name-input',
    steps: Object.freeze([
      step('title-talk', 'Lời Dì Sáu', 'Dì dặn dò con ở khung như vầy, đọc là biết việc kế tiếp. Chỗ nào mới dì khoanh sáng chỉ một lần, bấm "Tiếp" để xem từng chỗ nha.'),
      step('shop-name-input', 'Tên xe', 'Đặt tên cho xe ở đây, tên này in trên tấm bảng và trên phiếu thu. Giữ tên dì gợi ý cũng được.'),
      step('title-import', 'Đã chơi ở máy khác?', 'Con từng chơi ở máy khác thì bấm đây, dán mã sao lưu là chơi tiếp được.'),
      step('start-button', 'Bắt đầu', 'Đặt tên xong bấm nút này để dọn xe ra bán. Sau này quên chỗ nào thì bấm nút "?" ở góc trên màn hình nha.')
    ])
  }),

  // ---------- Màn Chuẩn bị ca ("sảnh chính") ----------
  // 0.5.2 (M5 Đợt 3): sảnh là cảnh phố — biển ngày treo dưới mái bạt (Ngày N, ba con số bằng hình: ví, huy hiệu, ngôi sao;
  // hình sự kiện ngày ở góc biển), xe đẩy là bảng lối vào (4 đồ vật trên mặt xe, 3 đồ vật trong hộc xe, chấm đỏ ở góc
  // hình), Dì Sáu đứng vỉa hè với bong bóng lời dặn (hộp quà có số dán ở góc khi có thưởng chờ nhận), sổ "Dì Sáu dặn" là tờ
  // giấy ghim có hàng chấm bước, nút Mở hàng là biển treo đỏ dính đáy.
  chuan_bi: Object.freeze({
    screen: 'prep', name: 'Màn Chuẩn bị', veteranDay: 2,
    steps: Object.freeze([
      step('prep-stats', 'Ba con số của xe', 'Cái ví là Tiền quán, huy hiệu là danh tiếng, ngôi sao là sao trung bình của xe. Bán khéo, khách vui thì cả ba cùng lên.'),
      step('open-shop', 'Trên mặt xe', 'Chợ Công Thức để mua món mới, Việc hôm nay để nhận thưởng, Điểm danh mỗi ngày, Hộp thư có quà. Chấm đỏ ở góc hình là có việc đang chờ con.', { span: 'open-mail' }),
      step('open-recipe-book', 'Trong hộc xe', 'Sổ công thức ghi cách làm từng món, Sổ tay nghề gom các thẻ Mẹo nghề. Cài đặt có âm thanh, hỗ trợ và sao lưu.', { span: 'open-settings' }),
      // tờ sổ cao (nhiều bước, ô nhận thưởng): chỉ khoét sáng đầu sổ và hàng chấm bước để bong bóng không che sổ
      step(['[data-testid="chain-card"] .chain-head', 'chain-card'], 'Dì Sáu dặn', 'Sổ này ghi việc dì dặn theo từng bước, chấm xanh là bước đã xong, ô cuối hàng là quà cuối. Xong bước nào thì quay lại đây nhận thưởng.',
        { span: '[data-testid="chain-card"] .chain-path' }),
      step('help-button', 'Nút "?"', 'Quên chỗ nào thì bấm nút này: xem lại hướng dẫn của màn, hoặc đọc trang Cách chơi.'),
      step('open-shift', 'Mở hàng', 'Sẵn sàng rồi thì bấm biển Mở hàng, khách ghé xe trong ca sáng từ 06:00 tới 10:00.')
    ])
  }),
  // Thẻ sự kiện ngày: tự hiện lần đầu thẻ xuất hiện ở màn Chuẩn bị (0.5.2: bắt đầu từ hình sự kiện ở góc biển ngày)
  su_kien_ngay: Object.freeze({
    screen: 'prep', spot: 'day-event', name: 'Sự kiện ngày',
    steps: Object.freeze([
      step('prep-wx', 'Hình sự kiện', 'Góc biển ngày có hình sự kiện hôm nay: dấu "!" là ngày khó hoặc còn lựa chọn chưa chọn, dấu ✓ là đã lo xong. Chạm hình là tới tờ thông báo.'),
      // tờ thông báo cao (lời, các dòng ảnh hưởng, lựa chọn): khoét sáng đầu tờ tới hết các dòng có hình
      step(['[data-testid="day-event-card"] .day-ev-head', 'day-event-card'], 'Sự kiện ngày', 'Có ngày trời mưa, có chợ phiên, có đoàn kiểm tra ghé. Đọc kỹ mấy dòng có hình để biết hôm nay khách đông hay vắng.',
        { span: '[data-testid="day-event-card"] .day-ev-effects' }),
      step('[data-testid^="day-event-choice-"]', 'Chuẩn bị trước', 'Sự kiện nào có lựa chọn thì chọn trước khi Mở hàng, tốn chút tiền mà đỡ thiệt. Đổi ý thì bấm Bỏ chọn.')
    ])
  }),
  // Hộp quà ở sảnh (0.5.2): có thưởng chờ nhận ngay ở sảnh (bước "Dì Sáu dặn" đã xong, quà sự kiện) thì hộp quà có số dán ở
  // góc bong bóng Dì Sáu; tour tự hiện lần đầu hộp quà xuất hiện (thường là sáng ngày 2, sau ca đầu)
  qua_sanh: Object.freeze({
    screen: 'prep', spot: 'gift', name: 'Quà chờ nhận',
    steps: Object.freeze([
      step('prep-gift', 'Quà chờ nhận', 'Hộp quà trên lời dì báo có thưởng đang chờ ngay ở sảnh, số đỏ là số phần thưởng. Chạm hộp quà là dì dẫn con tới chỗ nhận.'),
      step(['.ps-body > .chain-card.has-claim .chain-claim-row', '.ps-body > .event-card.has-pending [data-testid="open-event"]'], 'Nhận thưởng',
        'Bấm Nhận ở đây là xu và Muỗng Vàng bay thẳng về ví. Quà sự kiện thì vào thẻ sự kiện để nhận.')
    ])
  }),
  // Thẻ gánh hàng quê và kho hàng hiếm
  hang_hiem: Object.freeze({
    screen: 'prep', spot: 'stall', name: 'Hàng hiếm',
    steps: Object.freeze([
      step(['[data-testid="stall-card"] .ps-stall-head', 'stall-card'], 'Gánh hàng quê', 'Gánh hàng quê mở theo giờ thật trong ngày, mỗi phiên bán vài nguyên liệu hiếm. Ghé lựa đúng hàng là được mang về kho.',
        { span: '[data-testid="stall-card"] .ps-goods' }),
      // biển tên kho + hàng ô kệ đầu (cả kệ cao quá khung thấp, bong bóng sẽ che kệ)
      step(['[data-testid="rare-stock-card"] .ps-plaque', '[data-testid="rare-stock-card"] .rare-stock', 'rare-stock-card'], 'Kho hàng hiếm', 'Mỗi ô kệ ghi số phần đang có trong kho, nấu món hiếm thì lấy ở đây. Bên dưới là mảnh công thức hiếm, đủ mảnh thì nấu thử để mở món mới.',
        { span: '[data-testid="rare-stock-card"] .rare-stock-item' }),
      step(['[data-testid="basket-luck"] .basket-head', 'basket-luck'], 'Giỏ chợ', 'Phục vụ liền 5 khách không sai ở quầy, hoặc gặp ngày Chợ phiên, thì cuối ca được một lượt Giỏ chợ. Tỉ lệ ghi ở đây, lâu chưa ra nguyên liệu thì thanh may mắn đầy dần.',
        { span: '[data-testid="basket-luck"] .pbar' })
    ])
  }),

  // ---------- Ca bán: tổng quan (chỉ chạy bằng nút "?" khi quầy trống) ----------
  // 0.5.1 (M5 Đợt 2): lời theo giao diện mới — HUD gỗ (mặt trời giờ ca, thẻ xanh tiền thu trong ca dưới Tiền quán), khách
  // bán thân dưới mái bạt (vòng kiên nhẫn quanh đầu, bốc hơi khi sắp hết), 4 khâu là 4 biểu tượng, dây phiếu có dải màu chờ,
  // tab có số đếm.
  ca_ban: Object.freeze({
    screen: 'service', spot: 'idle', name: 'Ca bán', auto: false,
    steps: Object.freeze([
      step('hud', 'Thanh trên', 'Ngày, giờ ca có mặt trời chạy dần tới cuối ca, Tiền quán và sao trung bình của xe. Thẻ xanh dưới Tiền quán là tiền thu trong ca, đóng ca mới cộng vào quán.'),
      step('queue', 'Hàng khách', 'Vòng quanh đầu khách là kiên nhẫn, khách bốc hơi là sắp hết. Từ ngày 2 vòng xuống thấp thì khách trừ sao, từ ngày 4 vòng cạn là khách bỏ về.'),
      step('progress-4', 'Bốn khâu', 'Mỗi khách đi qua 4 khâu: Order, Thanh toán, Tính tiền rồi Làm đồ. Khâu đang làm có nền vàng kèm tên khâu, khâu xong có dấu ✓ xanh.'),
      step('ticket-rail', 'Dây phiếu', 'Phiếu kẹp ở Quầy treo trên dây này, tối đa 3 phiếu, dải màu dưới phiếu ngả dần sang đỏ khi khách chờ lâu. Chạm phiếu là mở nó trong Bếp.'),
      step('tab-counter', 'Quầy và Bếp', 'Hai thẻ này đổi qua lại giữa Quầy và Bếp, số trên thẻ là khách đang xếp hàng và phiếu đang chờ. Chấm đỏ báo bên kia có việc mới.', { span: 'tab-kitchen' })
    ])
  }),

  // ---------- Quầy: khâu Order ----------
  // Khách bán thân sau quầy, bong bóng gọi món (ngày 1–2 có hình món, ×n và hình ghi chú; từ ngày 3 chỉ còn lời khách), bảng
  // Thực đơn gỗ, phiếu order giấy, hàng nút dính đáy "Đọc lại đơn" / "Chốt order" (con dấu ĐÃ CHỐT).
  quay_order: Object.freeze({
    screen: 'service', spot: 'order', name: 'Quầy · Order', veteranDay: 2,
    steps: Object.freeze([
      step('queue', 'Hàng khách', 'Vòng quanh đầu khách là kiên nhẫn, khách bốc hơi là sắp hết. Từ ngày 2 vòng xuống thấp thì khách trừ sao, từ ngày 4 vòng cạn là khách bỏ về.'),
      step('speech-bubble', 'Khách gọi món', 'Khách gọi món trong bong bóng này, mấy ngày đầu có hình món kèm số phần, về sau chỉ còn lời khách. Đọc hết câu, có khi khách dặn thêm ở cuối.'),
      step('progress-4', 'Bốn khâu', 'Mỗi khách đi qua 4 khâu: Order, Thanh toán, Tính tiền rồi Làm đồ. Khâu đang làm có nền vàng kèm tên khâu, khâu xong có dấu ✓ xanh.'),
      step('[data-testid^="menu-item-"]', 'Thẻ món', 'Chạm thẻ món trên bảng Thực đơn để mở bảng chọn số lượng và ghi chú. Ghi xong, món hiện trên Phiếu order bên dưới.'),
      step('readback', 'Đọc lại đơn', 'Bấm để đọc lại từng dòng cho khách nghe, dòng khách bắt lỗi bị đánh dấu ✗. Muốn sửa dòng nào thì chạm dòng đó trên phiếu.'),
      step('confirm-order', 'Chốt order', 'Khách nghe đúng rồi mới chốt được, phiếu được đóng dấu Đã chốt. Chốt xong là sang khâu Thanh toán.')
    ])
  }),
  quay_bang_mon: Object.freeze({
    screen: 'service', spot: 'order-sheet', name: 'Quầy · Bảng chọn món', veteranDay: 2,
    steps: Object.freeze([
      step('qty-row', 'Số lượng', 'Bấm + hoặc − cho đúng số phần khách gọi, mỗi dòng tối đa 3 phần. Trên mặt gỗ bày đúng số phần đang chọn.'),
      step('note-block', 'Ghi chú', 'Khách dặn gì thì chạm ghi chú đó cho hiện dấu ✓, ghi chú in lên phiếu bếp. Ghi chú có tính thêm tiền thì giá ghi ngay trên nút.'),
      step('add-line', 'Thêm vào phiếu', 'Chọn xong bấm nút này để ghi dòng vào phiếu, số dưới chữ là tiền của dòng. Bấm dấu ✕ trên đầu bảng là đóng mà không ghi.')
    ])
  }),

  // ---------- Quầy: khâu Thanh toán ----------
  // Bảng giá phấn, phiếu order tóm tắt bằng hình món, máy tính tiền có màn LED (gõ theo nghìn), phím chuông "Báo tổng".
  quay_thanh_toan: Object.freeze({
    screen: 'service', spot: 'thanh_toan', name: 'Quầy · Thanh toán', veteranDay: 2,
    steps: Object.freeze([
      step('price-board', 'Bảng giá', 'Bảng phấn ghi giá từng món và phần cộng thêm của ghi chú. Cộng theo đúng Phiếu order có hình món bên cạnh.'),
      step('numpad-display', 'Máy tính tiền', 'Màn số hiện số con gõ, gõ theo nghìn: 30 là 30.000đ. Nút ⌫ xóa một số, nút Xóa xóa hết để gõ lại.'),
      step('report-total', 'Báo tổng', 'Bấm để đọc tổng trên màn cho khách nghe. Báo dư khách sẽ kêu, báo thiếu thì quán chịu phần thiếu.')
    ])
  }),

  // ---------- Quầy: khâu Tính tiền (tiền mặt) ----------
  // Tiền khách đưa trên mặt quầy gỗ, khay inox đựng tiền thối, ngăn kéo két 7 ngăn có số tờ, nút "Đưa tiền thối" dính đáy.
  quay_tinh_tien: Object.freeze({
    screen: 'service', spot: 'tinh_tien', name: 'Quầy · Tính tiền', veteranDay: 2,
    steps: Object.freeze([
      step('given-cash', 'Tiền khách đưa', 'Tờ tiền khách đưa nằm trên mặt quầy gỗ. Lấy tiền khách đưa trừ tổng hóa đơn là ra tiền thối.'),
      step('drawer', 'Két tiền', 'Chạm một ngăn két là lấy ra một tờ mệnh giá đó, số tròn trên ngăn là số tờ còn lại. Két hết tiền lẻ thì có cách xử lý riêng.'),
      step('tray', 'Khay tiền thối', 'Tờ con lấy ra nằm trong khay, chạm chồng tiền trong khay là trả một tờ về két. Thối đủ mà ít tờ là khéo nhất.'),
      step('give-change', 'Đưa tiền thối', 'Bấm khi khay đã đủ tiền thối, khách đưa vừa đủ thì nút ghi Không cần thối. Thối thiếu khách đòi bù, thối dư thì quán dễ mất phần dư.')
    ])
  }),
  // ---------- Quầy: khách chuyển khoản QR (từ ngày 4) ----------
  // Kệ "Mã QR của xe" trên mặt quầy, khách giơ điện thoại có ảnh "Đã chuyển ✓ → tên xe + số tiền" (ảnh thật, ảnh giả như nhau),
  // ô báo tiền của quán (chuông điện thoại quán hoặc Loa báo tiền) — chỉ ô này cho biết tiền về thật; hai nút dính đáy.
  quay_qr: Object.freeze({
    screen: 'service', spot: 'qr', name: 'Quầy · Chuyển khoản', veteranDay: 5,
    steps: Object.freeze([
      step('qr-status', 'Chuyển khoản', 'Khách quét mã QR của xe rồi giơ điện thoại báo đã chuyển. Ô báo tiền này mới cho biết tiền thật đã về hay còn đang chờ.'),
      step('qr-confirm', 'Đã nhận đủ', 'Bấm khi ô báo tiền đã báo về đúng số. Khách giơ điện thoại mà ô báo tiền vẫn chờ thì đừng vội tin.'),
      step('qr-reject', 'Ảnh giả', 'Khách đưa ảnh cũ, tiền không về thì bấm Từ chối ảnh giả. Từ chối nhầm khách thật là khách giận bỏ đi đó.')
    ])
  }),
  // ---------- Quầy: phiếu thu, kẹp phiếu bếp ----------
  // Máy in phiếu sau mép quầy, phiếu thu có hình món và con dấu ĐÃ THU, nút "Kẹp phiếu bếp" dính đáy (phiếu bay lên dây).
  quay_phieu_thu: Object.freeze({
    screen: 'service', spot: 'receipt', name: 'Quầy · Phiếu thu', veteranDay: 2,
    steps: Object.freeze([
      step('receipt', 'Phiếu thu', 'Thu tiền xong, máy in ra phiếu thu ghi món, tổng tiền, tiền thối và đóng dấu Đã thu. Liếc lại cho chắc trước khi kẹp.'),
      step('clip-ticket', 'Kẹp phiếu bếp', 'Kẹp phiếu lên dây là khách qua chỗ chờ món, quầy đón khách kế tiếp. Dây đủ 3 phiếu thì làm bớt món rồi mới kẹp tiếp được.')
    ])
  }),

  // ---------- Bếp ----------
  bep_day_phieu: Object.freeze({
    screen: 'service', spot: 'rail', name: 'Bếp · Dây phiếu', veteranDay: 2,
    steps: Object.freeze([
      step('ticket-rail', 'Dây phiếu', 'Phiếu kẹp ở Quầy hiện trên dây này. Viền phiếu đổi vàng rồi đỏ khi khách chờ lâu.'),
      step(['.k-ticket:not(.is-open)', '.k-ticket'], 'Phiếu bếp', 'Chạm phiếu để mở ra xem từng dòng món. Mỗi dòng món làm riêng một lượt.')
    ])
  }),
  // phiếu đã mở (chạm phiếu trong Bếp, hoặc chạm phiếu trên dây ở đầu màn): các dòng món và nút bắt đầu làm
  bep_dong_mon: Object.freeze({
    screen: 'service', spot: 'line', lead: Object.freeze(['bep_day_phieu']), name: 'Bếp · Chọn dòng món', veteranDay: 2,
    steps: Object.freeze([
      step(['.k-ticket.is-open .k-line:not(.is-done)', '.k-ticket.is-open'], 'Dòng món', 'Mỗi dòng ghi số phần và tên món, chữ đỏ là ghi chú khách dặn. Làm xong, dòng đó hiện hạng dì chấm.'),
      step('[data-testid^="cook-line-"]', 'Làm món này', 'Bấm để bắt đầu làm dòng món này. Phiếu nhiều dòng thì làm dòng nào trước cũng được.')
    ])
  }),
  bep_chon: Object.freeze({
    screen: 'service', spot: 'chon', name: 'Bếp · Chọn nguyên liệu', veteranDay: 2,
    steps: Object.freeze([
      step('recipe-card', 'Thẻ công thức', 'Hàng hình trên thẻ là nguyên liệu món này cần, chữ đỏ là ghi chú khách dặn. Ghi chú kiểu "không hành" là phải bỏ thứ đó ra.'),
      step('.chon-shelf', 'Kệ và bẫy', 'Trên kệ có cả bẫy: thứ trông giống mà khác, như nước mắm với nước tương. Lấy nhầm bẫy là món bị trừ điểm.'),
      step('chon-basket', 'Rổ', 'Đồ con đã lấy nằm trong rổ. Đối chiếu rổ với thẻ công thức cho chắc.'),
      step('chon-done', 'Xong', 'Lấy đủ rồi bấm Xong để qua Thớt sơ chế. Chọn lâu quá cũng bị trừ điểm, nên nhìn thẻ rồi lấy liền tay.')
    ])
  }),
  bep_thot: Object.freeze({
    screen: 'service', spot: 'thot', name: 'Bếp · Thớt sơ chế', veteranDay: 2,
    steps: Object.freeze([
      step('board', 'Thớt sơ chế', 'Mỗi nguyên liệu trên thớt có huy hiệu cho từng bước cần làm. Huy hiệu có ổ khóa thì chờ bước ghi bên dưới xong.'),
      // 0.5.0: bước là huy hiệu tròn (biểu tượng thao tác); lời nhắc đủ các thao tác mới (đập trứng, khuấy, gọt, lắc, thả đá)
      step(['.k-step.is-available', '[data-testid^="board-step-"]'], 'Trò nhỏ', 'Chạm huy hiệu để làm bước đó, mỗi bước là một trò nhỏ: thái, chà, gọt, đập trứng, khuấy, lắc, thả đá, nêm, canh lửa, rót. Làm khéo thì món ngon, khách chấm sao cao.'),
      // chỉ vào bước có chọn cách (món không có bước nào như vậy thì bỏ qua bước này)
      step(['.k-step.has-method:not(.is-done)', '.k-step.has-method'], 'Chọn cách sơ chế', 'Bước này phải chọn cách trước khi làm, như thái lát hay thái sợi. Chọn sai cách là bị trừ điểm.'),
      step('finish-dish', 'Ra món', 'Làm xong các bước thì bấm Ra món, dì chấm món liền. Bước nào chưa làm thì tính 0 điểm.'),
      step('abandon-dish', 'Bỏ món', 'Món hỏng nặng thì bỏ món, phiếu quay lại dây để làm lại từ đầu. Nguyên liệu đã lấy thành hao hụt.')
    ])
  }),
  bep_ra_mon: Object.freeze({
    screen: 'service', spot: 'ready', name: 'Bếp · Giao món', veteranDay: 2,
    steps: Object.freeze([
      step(['dish-result', '.k-ticket.is-ready'], 'Kết quả món', 'Món vừa ra được dì chấm hạng ở đây, kèm một lời góp ý. Món càng ngon khách chấm sao càng cao.'),
      step('serve-ticket', 'Giao cho khách', 'Phiếu đủ món thì nút này hiện ra. Giao sớm khách đỡ chờ lâu.')
    ])
  }),

  // ---------- Bếp: thẻ "Bước k/N" của 5 thao tác mới (0.5.0) ----------
  // Tự hiện lần đầu thẻ đầy đủ của loại bước đó đang chờ chạm (thẻ dừng tự chạy trong lúc tour hiện — kitchen.guideHold).
  // Không đặt veteranDay: thao tác mới, người chơi cũ cũng nên xem. Đích: bàn tay làm mẫu và nút "Chạm để bắt đầu".
  bep_dap: Object.freeze({
    screen: 'service', spot: 'card-dap', name: 'Bếp · Đập trứng',
    steps: Object.freeze([
      step('step-card-demo', 'Chạm rồi vuốt xuống', 'Kim vào vùng xanh thì chạm trứng cho nứt, rồi vuốt xuống để tách vào chảo. Chạm mà không vuốt là vỏ rơi vào chảo.'),
      step('step-card-go', 'Bắt đầu', 'Chạm đây là vào bước liền, không chạm thì thẻ tự chạy. Đập đủ số trứng ghi ở thanh dưới là bước tự xong.')
    ])
  }),
  bep_xoay: Object.freeze({
    screen: 'service', spot: 'card-xoay', name: 'Bếp · Khuấy',
    steps: Object.freeze([
      step('step-card-demo', 'Vẽ vòng tròn', 'Vẽ vòng tròn quanh lòng tô hay ly, chiều nào cũng được. Quay nhanh quá là văng ra ngoài, bị trừ điểm.'),
      step('step-card-go', 'Bắt đầu', 'Chạm đây là vào bước liền. Khuấy đủ số vòng ghi ở thanh dưới là bước tự xong, quay đều tay thì điểm cao.')
    ])
  }),
  bep_got: Object.freeze({
    screen: 'service', spot: 'card-got', name: 'Bếp · Gọt vỏ',
    steps: Object.freeze([
      step('step-card-demo', 'Vuốt từ trên xuống', 'Vuốt thẳng từ trên xuống theo từng dải vỏ, lệch chút vẫn được. Vuốt ngược hay trượt ra ngoài là bị trừ điểm.'),
      step('step-card-go', 'Bắt đầu', 'Chạm đây là vào bước liền. Gọt sạch hết các dải vỏ là bước tự xong.')
    ])
  }),
  bep_lac: Object.freeze({
    screen: 'service', spot: 'card-lac', name: 'Bếp · Lắc',
    steps: Object.freeze([
      step('step-card-demo', 'Kéo lên kéo xuống', 'Giữ bình hay rổ rồi kéo lên kéo xuống, mỗi lần đổi chiều là một lượt lắc. Lắc đều nhịp thì điểm cao.'),
      step('step-card-go', 'Bắt đầu', 'Chạm đây là vào bước liền. Lắc đủ số lượt ghi ở thanh dưới là bước tự xong.')
    ])
  }),
  bep_bay: Object.freeze({
    screen: 'service', spot: 'card-bay', name: 'Bếp · Thả đá',
    steps: Object.freeze([
      step('step-card-demo', 'Kéo thả vào ly', 'Kéo từng viên đá thả vào giữa ly, càng gần tâm càng tốt. Thả trượt thì đá tự về khay, chạm viên trong ly là lấy ra.'),
      step('step-card-go', 'Bắt đầu', 'Chạm đây là vào bước liền. Thả đủ số đá ghi ở thanh dưới rồi bấm Xong, thả dư hay thiếu đều bị trừ điểm.')
    ])
  }),

  // ---------- Phiếu chấm sau khi khách nhận món ----------
  // 0.5.1: chân dung khách đổi mặt theo sao, sao bật lần lượt, 5 hàng có dấu ✓ / ✗, tem lỗi đóng lên phiếu, xu tip bay lên ví.
  phieu_cham: Object.freeze({
    screen: 'service', spot: 'score', name: 'Phiếu chấm', veteranDay: 2,
    steps: Object.freeze([
      step('score-sheet', 'Phiếu chấm', 'Khách nhận món xong chấm sao theo 5 hàng: Order, Báo tổng, Thối tiền, Bếp và Thời gian chờ. Hàng có dấu ✗ đỏ ghi Sai là chỗ cần sửa.'),
      step(['.ss-tags', '.ss-rows'], 'Lỗi tại quầy, lỗi tại bếp', 'Tem Lỗi tại quầy là sai lúc ghi order, báo tổng hay thối tiền. Tem Lỗi tại bếp là sai nguyên liệu, sơ chế hoặc món hỏng.'),
      step(['score-sheet-tip', 'score-sheet'], 'Tip', 'Khách chấm 5 sao và hóa đơn từ 20.000đ thì tip thêm 5.000đ, xu vàng bay lên ví. Hóa đơn nhỏ hơn thì 5 sao cũng không có tip.')
    ])
  }),

  // ---------- Tổng kết ca ----------
  // 0.5.2 (M5 Đợt 3): băng rôn "Hết ca!" với 5 sao lớn và hạng ca, Dì Sáu, lãi trong ca đếm lên; tờ sổ lãi lỗ kẻ dòng có hình
  // từng khoản, dòng lãi đóng dấu LÃI / LỖ; Chốt két; Tiền quán trên thanh gỗ. Tour chờ hiệu ứng vào màn diễn xong (delayMs).
  tong_ket: Object.freeze({
    screen: 'summary', name: 'Tổng kết ca', veteranDay: 2, delayMs: 2600,
    steps: Object.freeze([
      step('summary-stars', 'Sao ca này', 'Năm sao lớn là sao trung bình khách chấm ca này, chữ bên dưới là hạng ca. Sao của xe tính theo 30 lượt chấm gần nhất.'),
      step(['.ledger .total', '.ledger'], 'Sổ lãi lỗ', 'Sổ cộng tiền bán, tip rồi trừ giá vốn và chi phí, dòng đóng dấu này là lãi của ca. Lãi đã cộng vào Tiền quán trên thanh gỗ.'),
      step('summary-drawer-diff', 'Lệch két', 'Dòng này cho biết tiền trong két có khớp sổ không. Lệch là do thối thiếu hoặc thối dư trong ca.'),
      step('summary-reviews', 'Lời khách', 'Khách ăn xong để lại vài lời. Đọc để biết khách khen gì, chê gì.'),
      step('next-day', 'Ngày mai', 'Bấm để về màn Chuẩn bị cho ngày kế tiếp. Có việc xong thì nhớ ghé Việc hôm nay nhận thưởng nha.')
    ])
  }),

  // ---------- Màn con ----------
  // 0.5.2 (M5 Đợt 3): thanh gỗ đầu màn (nút quay lại, ví, Muỗng Vàng, "?") + biển treo tên màn; nội dung là bảng gỗ, tờ
  // giấy ghim, phong bì, sổ bìa da; phần thưởng là ô vật phẩm có hình.
  cho_cong_thuc: Object.freeze({
    screen: 'shop', name: 'Chợ Công Thức',
    steps: Object.freeze([
      step('shop-tab-recipes', 'Ba kệ', 'Kệ Chính bán công thức món mới, Nâng cấp bán dụng cụ, Góc Muỗng Vàng đổi màu dù và đồ trang trí.', { span: 'shop-tab-spoons' }),
      step(['[data-testid^="shop-item-"]:not(.is-owned) .shop-facts', '[data-testid^="shop-item-"]'], 'Món mới', 'Mỗi món ghi giá bán, giá vốn, lãi mỗi phần, chừng mấy ca hoàn vốn và thao tác mới. Món mới mua về thì khách gọi nhiều gấp đôi trong 2 ca đầu.',
        { span: '[data-testid^="shop-item-"]:not(.is-owned) .shop-mech' }),
      step('button[data-testid^="shop-trial-"]', 'Nấu thử', 'Mỗi món được nấu thử miễn phí một lần, không tính giờ, có gợi ý tận tay. Làm quen trước rồi hẵng mua.'),
      step('[data-testid^="shop-buy-"]', 'Mua món', 'Đủ Tiền quán và điều kiện thì bấm Mua, giá ghi ngay trên nút. Món mới có trong thực đơn từ ca kế tiếp.')
    ])
  }),
  viec_hom_nay: Object.freeze({
    screen: 'quests', name: 'Việc hôm nay',
    steps: Object.freeze([
      // hình loại việc tới thanh tiến độ của tờ việc đầu (hàng nút bên dưới có bước riêng)
      step(['[data-testid="quest-0"] .qs-type', 'quest-0'], 'Việc hôm nay', 'Mỗi tờ giấy là một việc nhỏ như thối đúng, ra món ngon; nhãn màu ghi việc thuộc Quầy, Bếp hay Chất lượng. Làm trong ca là việc tự đếm.',
        { span: '[data-testid="quest-0"] .quest-prog' }),
      // ưu tiên nút Nhận đang bật (việc đã xong), không có thì nút của việc đầu
      step(['[data-testid^="quest-claim-"]:not([disabled])', 'quest-claim-0', '[data-testid^="quest-claim-"]'], 'Nhận thưởng', 'Việc xong thì bấm Nhận, quà trong mấy ô bên trái bay về ví. Chấm đỏ ở màn Chuẩn bị nhắc con khi có quà chờ.'),
      step(['[data-testid^="quest-reroll-"]:not([disabled])', '[data-testid^="quest-reroll-"]'], 'Đổi việc', 'Việc nào khó quá thì đổi sang việc khác. Mỗi ngày đổi miễn phí 1 lần, lần sau tốn Muỗng Vàng.'),
      step('daily-chest-card', 'Rương ngày', 'Xong đủ 3 việc thì Rương ngày sáng lên, mở rương lấy thêm quà. Biển phấn trên bảng ghi giờ có việc mới, lúc 04:00 sáng.')
    ])
  }),
  hop_thu: Object.freeze({
    screen: 'mailbox', name: 'Hộp thư',
    steps: Object.freeze([
      // phong bì của thư đầu (danh sách thư rất cao: khoét sáng cả danh sách thì bong bóng che mất thư)
      step(['[data-testid^="mail-item-"] .mail-head', 'mail-list'], 'Phong bì', 'Mỗi thư là một phong bì, chấm đỏ là thư mới, hộp quà nhỏ là thư có quà. Chạm phong bì để mở thư ra đọc.'),
      step('button[data-testid^="mail-claim-"]:not([data-testid="mail-claim-all"])', 'Quà trong thư', 'Thư có quà thì bấm Nhận quà, xu và Muỗng Vàng bay về ví. Quà giữ tối đa 30 ngày, nhớ nhận sớm.'),
      step('mail-claim-all', 'Nhận hết', 'Nhiều thư có quà thì bấm nút này nhận một lần cho lẹ.')
    ])
  }),
  lua_hang: Object.freeze({
    screen: 'market', name: 'Lựa hàng hiếm', requires: 'stall-start',
    steps: Object.freeze([
      step(['[data-testid="market-intro"] .npc-talk', 'market-intro'], 'Gánh hàng quê', 'Mỗi phiên có một người bán mang vài món hàng hiếm từ quê lên. Mỗi phiên con được lựa một lượt mỗi ngày.'),
      step(['.market-goods', 'market-intro'], 'Nhìn kỹ hàng', 'Nhớ hình và tên món hàng hiếm, dòng Dễ nhầm ghi hàng thường na ná. Lúc lựa sẽ có cả hàng na ná để thử mắt con.'),
      step('market-clock', 'Phiên chợ hôm nay', 'Biển tre ghi ba phiên chợ theo giờ thật, phiên đang mở nổi bật. Lỡ phiên này thì chờ phiên sau.'),
      step('stall-start', 'Bắt đầu lựa', 'Bỏ đúng hàng hiếm vào rổ rồi bấm Xong. Lựa càng chuẩn càng được nhiều phần, có khi được thêm mảnh công thức hiếm.')
    ])
  }),
  so_cong_thuc: Object.freeze({
    screen: 'recipe-book', name: 'Sổ công thức',
    steps: Object.freeze([
      step('recipe-book-tab-mon', 'Hai mục', 'Mục Món ăn là các công thức, mục Sổ từ vùng miền ghi cách khách mỗi miền gọi món.', { span: 'recipe-book-tab-tu' }),
      step('[data-testid^="book-recipe-"]', 'Trang món', 'Mỗi trang đôi ghi giá, số lần nấu, điểm cao nhất; huy hiệu khiên có sao là cấp thạo món. Nấu nhiều, nấu khéo thì thạo món lên cấp.'),
      step('[data-testid^="book-open-"]', 'Xem cách làm', 'Chạm hình món để xem nguyên liệu và các bước của món. Quên cách làm thì vô đây coi lại.')
    ])
  })
})

// Tour tự hiện thêm ở màn có nhiều phần (chạy nối tiếp khi bấm "Xem lại hướng dẫn màn này").
export const TOUR_SCREENS = Object.freeze({
  title: Object.freeze(['mo_dau']),
  prep: Object.freeze(['chuan_bi', 'su_kien_ngay', 'qua_sanh', 'hang_hiem']),
  summary: Object.freeze(['tong_ket']),
  shop: Object.freeze(['cho_cong_thuc']),
  quests: Object.freeze(['viec_hom_nay']),
  mailbox: Object.freeze(['hop_thu']),
  market: Object.freeze(['lua_hang']),
  'recipe-book': Object.freeze(['so_cong_thuc'])
})

// Trang "Cách chơi" (nút "?"): vài thẻ ngắn có hình (icon: tên hình trong ui/art.js; 'di_sau' = mặt Dì Sáu).
export const HOW_TO_PLAY = Object.freeze([
  Object.freeze({
    id: 'quay', icon: 'mon_banh_mi_op_la', title: 'Bốn khâu: Order → Thanh toán → Tính tiền → Làm đồ',
    text: 'Order: nghe khách gọi, ghi phiếu, đọc lại rồi chốt. Thanh toán: cộng theo bảng giá rồi báo tổng. Tính tiền: thối đúng hoặc nhận chuyển khoản, rồi kẹp phiếu bếp. Làm đồ: qua Bếp nấu món và giao cho khách.'
  }),
  Object.freeze({
    id: 'bep', icon: 'thot', title: 'Bếp và trò nhỏ',
    text: 'Mở phiếu, chọn dòng món, lấy đúng nguyên liệu trên kệ (coi chừng bẫy na ná nhau). Lên Thớt làm từng bước: thái, chà, gọt, đập trứng, khuấy, lắc, thả đá, nêm, canh lửa, rót, làm bước nào trước cũng được (trừ bước có ổ khóa). Mỗi bước có thẻ bàn tay làm mẫu, xong bước dì đóng dấu chấm điểm. Ra món rồi bấm Giao cho khách.'
  }),
  Object.freeze({
    id: 'sao', icon: 'sao', title: 'Chấm sao và tip',
    text: 'Khách chấm sao theo Order, Báo tổng, Thối tiền, Bếp và Thời gian chờ. Khách chấm 5 sao với hóa đơn từ 20.000đ thì tip 5.000đ.'
  }),
  Object.freeze({
    id: 'su_kien', icon: 'troi_mua', title: 'Sự kiện',
    text: 'Có ngày mưa, chợ phiên, đoàn kiểm tra… Thẻ sự kiện ở màn Chuẩn bị báo trước để con chuẩn bị. Giữa hai khách có thể gặp tình huống: luôn có cách an toàn, khách đang chờ cũng tạm dừng lúc con chọn.'
  }),
  Object.freeze({
    id: 'hang_hiem', icon: 'ro', title: 'Hàng hiếm',
    text: 'Gánh hàng quê mở theo giờ thật trong ngày: lựa đúng hàng hiếm để mang về kho. Gom đủ mảnh công thức hiếm thì nấu thử để mở món mới.'
  }),
  Object.freeze({
    id: 'meo', icon: 'di_sau', title: 'Mẹo của dì',
    text: 'Đọc lại đơn trước khi chốt, đếm tiền thối hai lần. Ghé Việc hôm nay và Điểm danh mỗi ngày để nhận quà, chép mã sao lưu ở Cài đặt để khỏi mất tiến trình.'
  })
])
