# Đề xuất thiết kế game F&B "Bếp Khởi Nghiệp" (tên làm việc)

Phiên bản 0.4 · ngày 30/09/2026

- Bản này biên tập lại bản đề xuất v0.1 (`docs/tham-khao/ban-tong-hop-v0.1.md`) và áp dụng các sửa đổi hợp lý trong bản phản biện (`docs/tham-khao/phan-bien-v0.1.md`).
- **v0.3 đồng bộ với bản chơi được M1 + M2** (đọc `src/data/*.js`, `src/core/*.js`). Chỗ nào code khác đặc tả cũ, tài liệu đã sửa theo code và ghi ngắn *(đã chỉnh theo bản chơi được)*. Tóm tắt các thay đổi ở Phụ lục B.
- **v0.4 thêm M4 (bản game 0.4.0)**: tip mới, sự kiện thưởng/phạt tiền có luật công bằng, tần suất sự kiện "dày", nguyên liệu và công thức hiếm, save v3. Thiết kế chi tiết: `docs/tham-khao/m4-thiet-ke.md`; tư liệu thể loại: `docs/nghien-cuu-the-loai-game.md`. Tóm tắt thay đổi ở Phụ lục C.
- Hợp đồng kỹ thuật để code MVP nằm ở `docs/kien-truc.md`. Nếu hai tài liệu lệch nhau về tên hàm, cấu trúc dữ liệu hay hằng số, **`kien-truc.md` được ưu tiên** và tài liệu này sẽ được sửa theo.
- Bảng số cân bằng của Chặng 1 nằm ở `docs/can-bang.md`. Cách chạy thử, triển khai và kiểm thử: `README.md`.

---

## Tóm tắt cho người đọc bận rộn

**Ý tưởng.** Game web chơi trên điện thoại (PWA, HTML/CSS/JS thuần). Người chơi bắt đầu với một chiếc xe đẩy đầu hẻm, tự tay nhận order, thu tiền, thối tiền và nấu từng món, rồi đi qua 7 chặng để thành nhà hàng sang trọng và chuỗi. Game lồng nhẹ kiến thức vận hành F&B qua thẻ "Mẹo nghề", dùng được cả để giải trí lẫn để ôn luyện cho nhân viên mới.

**Luồng 4 khâu của mỗi khách.** Mỗi khách có một thanh tiến trình 4 chấm:

| Khâu | Người chơi làm gì |
|---|---|
| **Order** | Nghe khách gọi món, ghi phiếu, đọc lại đơn (bắt buộc), chốt order |
| **Thanh toán** | Báo tổng tiền; khách chọn tiền mặt hoặc QR; khách đưa tiền |
| **Tính tiền** | Đếm tiền nhận, thối tiền (hoặc xác nhận QR), xuất phiếu thu, kẹp phiếu bếp |
| **Làm đồ** | Bếp thao tác từng bước: chọn đúng, đủ nguyên liệu, sơ chế đúng cách trên Thớt sơ chế, nấu, ra món |

**Năm hệ thống người dùng yêu cầu** (mục 9):
1. **Nhiệm vụ hằng ngày "Việc hôm nay"**: 3 việc mỗi ngày (Quầy, Bếp, Chất lượng) và một Rương ngày.
2. **Điểm danh nhận quà**: 7 ô tích lũy, lỡ ngày không mất; vòng đầu "Tuần Khai Trương" tặng hiện vật.
3. **Sự kiện ngẫu nhiên**: 12 sự kiện ngày báo trước (4 sự kiện M2 và 8 sự kiện thưởng/phạt tiền M4) và 11 tình huống trong ca (3 của M3, 8 của M4), luôn có lựa chọn an toàn; phạt chỉ khi có nguyên nhân phòng được hoặc báo trước, có trần (quyết định 31).
4. **Chuỗi nhiệm vụ**: chuỗi chính "Ngày đầu ra phố" là cổng lên chặng; chuỗi "Làm quen QR"; chuỗi sự kiện "Nồi chè tri ân".
5. **Quà hệ thống**: Hộp thư với thư chào mừng, quà lễ, quà đời thường, việc quên nhận, review muộn.

Kèm theo là **Chợ Công Thức** (mua món mới bằng Tiền quán, được nấu thử miễn phí; mua nâng cấp; màu dù xe bằng Muỗng Vàng), **món đặc biệt chỉ lấy qua sự kiện có thời hạn** (MVP có Chè bưởi của sự kiện Tri ân 20/11, kèm tiền sự kiện "Phấn Trắng" và Quầy đổi) và (M4) **nguyên liệu, công thức hiếm** (gánh hàng quê theo giờ thật, khách lạ, Giỏ chợ; 4 món hiếm mở bằng mảnh công thức và nấu thử).

**Đề xuất thêm nổi bật** (chi tiết ở mục 10):
- [MVP] **Thớt sơ chế**: người chơi tự chọn sơ chế nguyên liệu nào trước, tự chọn cách sơ chế; quên sơ chế là bị chấm.
- [MVP] **Phiếu chấm tách "Lỗi tại quầy" và "Lỗi tại bếp"**: người chơi và người đào tạo biết phải sửa ở đâu.
- [MVP] **Chuyển khoản giả và Loa báo tiền**: dạy "ảnh chụp màn hình không phải là tiền".
- [MVP] **Đặt tên xe đẩy ở ngày 1**, **khách quen cô Thu, bạn Nam** quay lại với câu "như mọi khi nha".
- [MVP] **Mục tiêu sau khi đủ điều kiện lên chặng**: sưu tập "Không tì vết", thạo cấp 3, kỷ lục ca, đếm ngược sự kiện.
- [GĐ2] **Thử thách ngày theo seed chung** kèm thẻ kết quả để chia sẻ; **Chế độ Học việc** cho người đào tạo.
- [GĐ2] Sơ chế đầu ca, nấu theo mẻ, chốt ca đếm két, voucher, thu ngân NPC.

**Phạm vi MVP**: chỉ Chặng 1 "Xe đẩy đầu hẻm", chia 3 mốc, mỗi mốc là một bản chạy được:

| Mốc | Trạng thái | Nội dung chính |
|---|---|---|
| **M1** – lõi chơi được | **Đã xong** | 2 món có sẵn; luồng 4 khâu với tiền mặt; 6 mini-game và Thớt sơ chế; phiếu chấm tách lỗi quầy/lỗi bếp; 20 thẻ Mẹo nghề; tổng kết ca; lưu tiến trình; unit test; e2e |
| **M2** – kinh tế và LiveOps | **Đã xong** | QR, ảnh chuyển khoản giả, Loa báo tiền; Chợ Công Thức 2 món và nấu thử; 5 nâng cấp; màu dù xe; thạo món cấp 1–3; điểm danh 7 ô; 3 việc ngày và Rương ngày; hộp thư; 2 chuỗi; 4 sự kiện ngày; sự kiện 20/11 với Chè bưởi, Tem và Quầy đổi; lên chặng; khóa quà khi lùi giờ; khóa một tab; nút Back |
| **M3** – hoàn thiện | **Đã xong** | PWA offline; sao lưu bằng mã; màn Cài đặt; âm thanh; tình huống trong ca; Sổ tay nghề; Sổ công thức; tiền chẵn; vòng soát lỗi an toàn dữ liệu người chơi |
| **M4** – tip mới, sự kiện tiền, hàng hiếm (bản 0.4.0) | **Đã xong** | Tip 5.000đ khi 5 sao và hóa đơn từ 20.000đ; sổ tiền sự kiện; tần suất sự kiện "dày"; 8 sự kiện ngày và 8 tình huống mới; 5 nguyên liệu hiếm, 4 công thức hiếm, gánh hàng quê, khách lạ, Giỏ chợ; save v3; thư phiên bản 0.4.0 |
| **M5** – giao diện kiểu game nấu ăn (0.4.2 → 0.5.0 → 0.5.1 → 0.5.2) | **Đợt 0, Đợt 1 đã làm**; Đợt 2, 3 chưa | Đợt 0 (0.4.2): Phòng mẫu đã được duyệt. Đợt 1 (0.5.0): Bếp làm lại (hình to viền mực, thẻ "Bước k/N" có tay mẫu, con dấu từng bước, màn ra món 2 giây, chế độ tập trung ở màn thấp) và 5 thao tác mới Đập trứng, Khuấy, Gọt vỏ, Lắc, Thả đá; giá, vốn, par giữ nguyên. Đợt 2: Quầy, HUD, phố, phiếu chấm; Đợt 3: các màn ngoài ca (mục 14.4c) |

---

## 0. Quy ước và các quyết định hợp nhất

### 0.1 Quy ước dùng trong tài liệu
- **Chặng 1–7** chỉ tiến trình trong game. **MVP / GĐ2 / GĐ3** chỉ lộ trình phát triển. **M1 / M2 / M3** là ba mốc bên trong MVP.
- **Ngày game**: ở Chặng 1–2, một ngày game là một ca bán. Từ Chặng 3, một ngày game có 2 ca (trưa và tối).
- **Ngày thật** là ngày theo lịch, dùng cho điểm danh, nhiệm vụ, sự kiện. Ngày đổi lúc **04:00 giờ Việt Nam (UTC+7)**, tính từ UTC nên không phụ thuộc múi giờ của máy.
- **Tiền** lưu bằng số nguyên đồng. Cách hiển thị: hóa đơn ghi "37.000đ", thanh trạng thái ghi "37k", số lớn ghi "1,25tr".
- **Tiền quán** là tên ví tiền vận hành của người chơi. **Muỗng Vàng** là tiền cao cấp, chỉ kiếm trong game. Tài liệu này luôn viết đầy đủ "Muỗng Vàng"; chữ viết tắt MV chỉ dùng trong code. Trên giao diện luôn hiện biểu tượng muỗng kèm chữ "Muỗng Vàng".
- **TNC (Thu nhập chuẩn một ca)**: lãi ròng một ca của người chơi trung bình (khoảng 4,2 sao) ở chặng hiện tại. Ở Chặng 1, TNC tăng theo ngày game (bảng ở mục 11.2). Phần thưởng bằng tiền được khai báo theo bội số TNC. TNC là từ nội bộ, không hiện cho người chơi. Trong code TNC được gọi là **thu nhập tham chiếu**: bảng `BALANCE.refIncomeTable`, hàm `refIncomeFor(ctx, ngày game)`; phần thưởng khai báo `incomeMul` (bội TNC), quy ra tiền theo ngày game hiện tại lúc nhận, làm tròn lên bội 1.000đ.
- **Par** là thời gian chuẩn (giây) của một bước bếp, dùng để tính nhịp khách và ngân sách chờ. Từ nội bộ, không hiện cho người chơi.
- **Quy ước đặt tên trong code**: hàm và biến viết bằng tiếng Anh; id dữ liệu viết tiếng Việt không dấu kiểu snake_case (ví dụ `banh_mi_op_la`); chuỗi hiển thị viết tiếng Việt có dấu.
- Các từ nội bộ **không được hiện** cho người chơi: TNC, seed, par, toast, chip, MV.

### 0.2 Các quyết định đã chốt

| # | Vấn đề | Chọn | Lý do |
|---|---|---|---|
| 1 | Số chặng | **7 chặng**: 6 chặng vận hành, cộng Chặng 7 "Chuỗi" làm phần cuối game | Đủ đường đi "xe đẩy → sang trọng", mỗi chặng đổi cách làm việc. Tái khởi nghiệp nằm sau Chặng 7 |
| 2 | Thuật ngữ | Chặng (trong game); MVP/GĐ2/GĐ3 và M1/M2/M3 (phát triển) | Tránh nhầm |
| 3 | Tiền vận hành | **Tiền quán** (VNĐ ảo) | Người Việt hiểu ngay; tránh câu mơ hồ kiểu "Tiền không đủ" |
| 4 | Tiền cao cấp | **Muỗng Vàng**, chỉ kiếm được trong game | Đúng chủ đề bếp, không trùng với "Tem" của sự kiện |
| 5 | Đơn vị lưu tiền | **Số nguyên đồng** | Về sau có khuyến mãi %, thuế GTGT (mô phỏng), chia hóa đơn mà không bị lệch |
| 6 | Thứ tự các khâu | **Order → Thanh toán → Tính tiền → Làm đồ**, trả trước đến hết Chặng 4. Thứ tự khai báo trong `balance.js` (`stageFlow`) | Đúng chữ người dùng dùng. Từ Chặng 5, trả sau là một "Quy trình mới"; quầy mang về vẫn trả trước |
| 7 | Bếp làm theo gì | **Làm theo phiếu.** Mỗi đơn lưu 3 lớp: *yêu cầu thật* – *phiếu người chơi ghi* – *món làm ra* | Sao của khách chỉ so *yêu cầu thật* với *món làm ra*. Phiếu dùng để quy lỗi về quầy hay bếp |
| 8 | Cách chấm sao khách | **Trừ dần**: sao gốc theo hạng món, trừ phạt quầy, trừ phạt chờ, **làm tròn xuống** | Minh bạch; mỗi lần trừ gắn với một lỗi và một câu review; khoản phạt −0,5 không bị làm tròn mất |
| 9 | Tên các thang điểm | Bước: *Hoàn hảo / Tốt / Đạt / Hỏng*. Món: *Tuyệt hảo / Ngon / Được / Kém / Hỏng*, kèm huy hiệu *Không tì vết*. Khách: *1–5 sao* | 3 thang dùng 3 bộ từ khác nhau, không có hai từ gần nghĩa |
| 10 | Danh tiếng | **Không bao giờ giảm.** Sao trung bình của 30 đánh giá gần nhất mới dao động | Công sức không bị "bốc hơi" |
| 11 | Khách đã trả tiền mà chờ quá lâu | **MVP: chỉ trừ sao.** GĐ2 thêm "đòi hoàn tiền" có lựa chọn xử lý | Không làm người mới ức chế khi còn đang học bếp |
| 12 | Kiên nhẫn khi khách đang ở quầy | **×0,5** | Vẫn giữ áp lực nhẹ để nhận order nhanh |
| 13 | Giờ reset ngày | **04:00 giờ Việt Nam** | Người Việt hay chơi khuya |
| 14 | Nhiệm vụ ngày | **3** (1 Quầy, 1 Bếp, 1 Chất lượng/Kinh doanh) kèm Rương ngày | Xong trong khoảng 2 ca, không thành việc vặt |
| 15 | Số mini-game ở MVP | **6 cơ chế gốc**: CHON, CHA, THAI, CHAM, LUA, ROT; 6 cơ chế còn lại ở GĐ2–3. *M5 (0.5.0): thêm 5 thao tác DAP, XOAY, GOT, LAC, BAY thay cho các bước đang dùng CHA/CHAM, không thêm hay bớt bước (mục 6.4)* | Đủ cho 5 món MVP. Mỗi cơ chế khoác được nhiều "lớp vỏ" thao tác |
| 16 | Món ở MVP | **5 món**: Bánh mì ốp la, Trà tắc (có sẵn); Bánh tráng trộn, Cà phê sữa đá (Shop); Chè bưởi (sự kiện 20/11) | Shop có lựa chọn thật; người dùng thấy được món chỉ lấy qua sự kiện; cả 5 món chỉ dùng 6 cơ chế có sẵn |
| 17 | Kho ở MVP | **Không có kho.** Giá vốn bị trừ khi chốt bước Chọn. Kho theo lô và sơ chế đầu ca ở GĐ2 | Giữ MVP tập trung vào trục 4 khâu |
| 18 | Tính tổng tiền ở Chặng 1 | **Tự nhẩm**. Nâng cấp "Máy tính cầm tay" từ ngày 7, chỉ cộng tổng, không hiện tiền thối. Máy POS là mốc của Chặng 3 | Không tự động hóa quá sớm đúng khâu người dùng muốn luyện |
| 19 | QR ở Chặng 1 | **Từ ngày 4, khoảng 25–30% khách.** Từ ngày 7 có 4% ảnh chụp chuyển khoản giả | Bài học có thật, chi phí làm thấp |
| 20 | Mệnh giá tiền | **Chặng 1–2: 7 tờ từ 5k đến 500k** (giá luôn tròn 5.000đ). Từ Chặng 3 thêm tờ 1k và 2k khi có khuyến mãi % | Két gọn trên màn hình nhỏ |
| 21 | Lãi của món đặc biệt | **Lãi trên mỗi giây nấu không vượt món mua bằng Tiền quán tốt nhất cùng chặng quá 10%**. Mùa sự kiện **không tăng giá bán**, chỉ tăng Tem và danh tiếng | Món sự kiện không trở thành "bắt buộc phải có" |
| 22 | Ngân sách thưởng ngoài bán hàng | **Mục tiêu 20–30%, trần 35%** tổng thu trong ngày thật (lãi bán hàng + thưởng) | Bán hàng vẫn là nguồn thu chính. Chặng 1 ước tính 19,5–35% mỗi ngày, 22,3% cả chặng (mục 11.5, sau luật tip M4). Mô phỏng M2 (người chơi hoàn hảo, 3 ca/ngày thật): cao nhất 25,2%. **M4**: tính cả hàng hiếm quy đổi (lúc dùng, như Phiếu Chợ Sớm), 40 hạt giống × 4 mốc bắt đầu: cao nhất 34,1% sau khi giảm thưởng tiền chuỗi "Ngày đầu ra phố" (mục 9.4) |
| 23 | Người dẫn dắt | **Dì Sáu** (cố vấn, kiêm mascot bếp) và **Anh Khoa** (kỹ thuật viên máy bán hàng) | Một cố vấn có cá tính, không trùng NPC của game tham khảo |
| 24 | Trần chất lượng khi nhân viên làm | **88**, thấp hơn ngưỡng Tuyệt hảo | Luật "Ra tay": món Tuyệt hảo chỉ đến từ tay chủ quán |
| 25 | Cách vẽ | **DOM/CSS + SVG**; nguyên liệu là SVG tự vẽ kèm nhãn chữ | Chữ Việt sắc nét, test được bằng `data-testid`; cặp bẫy phân biệt rõ |
| 26 | Cấu trúc code | `src/core` (logic thuần), `src/data` (nội dung, cân bằng), `src/ui` | Test logic bằng Node, cân bằng bằng dữ liệu |
| 27 | Quảng cáo | **Không có ở MVP và GĐ2.** GĐ3 thử quảng cáo tặng thưởng tùy chọn, trần 10% thu nhập ngày, tắt ở chế độ đào tạo | Đo tỉ lệ giữ chân khi chưa có quảng cáo trước |
| 28 | Cách kết thúc ca | **Số khách cố định, sinh bằng seed.** Ca kết thúc khi khách cuối cùng rời đi | Công bằng; tải lại trang không đổi được khách |
| 29 | Nhịp khách | **Khoảng cách giữa hai khách = 1,15 × thời gian phục vụ kỳ vọng**, giờ cao điểm ×0,9 | Một người làm hết mọi việc thì không làm song song được; hệ số tải ρ ≤ 0,9 có test |
| 30 | Tip | **(M4) Một mức 5.000đ**: khách chấm 5 sao **và** số tiền khách thực trả từ 20.000đ; khách bỏ vào **hũ tip**. Món Không tì vết +1 danh tiếng, khách khó tính 5 sao +1 danh tiếng, chuỗi "Quầy chuẩn" 5 khách +1 lượt Giỏ chợ, Ngày lãnh lương khách gọi thêm món *(trước M4: 10.000đ cho Không tì vết / khó tính / chuỗi Quầy chuẩn, Ngày lãnh lương ×1,5)* | Chặng 1–2 không có tờ 1k, 2k; tip không làm rối két |
| 31 | Sự kiện phạt tiền | **(M4) Được phép, nhưng phải công bằng**: có nguyên nhân người chơi phòng được hoặc có báo trước; luôn có lựa chọn an toàn; có trần mỗi sự kiện (thiệt hại ≤ min(10% doanh thu dự kiến của ca, 0,5 TNC)) và trần mỗi ngày thật (phạt ≤ 1 TNC, vượt thì Dì Sáu đỡ giùm); sự kiện tốt chiếm đa số; không 2 sự kiện xấu liền nhau; mức "Tần suất sự kiện" Ít không có sự kiện phạt. Thay câu cũ "không bao giờ phạt ngẫu nhiên" | Đời thật có phạt (trật tự đô thị, kiểm tra vệ sinh, tiền giả); bài học chỉ có giá trị khi người chơi thấy nguyên nhân và có cách phòng. Tiền sự kiện ghi riêng trong sổ lãi lỗ ca (mục 9.3) |
| 32 | Nguyên liệu và công thức hiếm | **(M4) Kho `state.rare`** 5 nguyên liệu (★1–★2, có quê), tối đa 6 phần mỗi loại; nhận tối đa 6 phần + 3 mảnh mỗi ngày thật (dư đổi 2 Muỗng Vàng); nguồn: 3 gánh hàng quê theo giờ thật (05:00–09:00, 11:00–13:30, 17:30–21:00), khách lạ ca đầu mỗi ngày thật (từ ngày game 3), Giỏ chợ có bảo hiểm công khai, tình huống; 4 công thức hiếm mở bằng 3 mảnh + nấu thử đạt hạng Được; mỗi phần món hiếm trừ kho lúc Ra món. Không bán lượt bốc, không hết hạn ở M4 | Thưởng gắn kỹ năng (lựa đúng hàng thật, phục vụ tốt khách lạ), dạy "kiểm hàng trước khi nhận" và "làm đúng một lần mới đưa lên thực đơn"; có trần để không thành nguồn tiền tự do (mục 7.1) |
| 33 | Tần suất sự kiện | **(M4, quyết định của người dùng: "dày")** sự kiện ngày 65% + bảo hiểm 1 ngày (thực khoảng 74%), không trùng loại hôm trước, Trật tự đô thị và Kiểm tra ATTP cách nhau ≥ 7 ngày game; tình huống tối đa 2 mỗi ca, cách nhau ≥ 2 khách, mức Vừa 55%/30% + bảo hiểm 2 ca (thực khoảng 60% ca có ≥ 1), Nhiều 75%/45% (khoảng 80%), Ít 30%, tối đa 1, chỉ loại tốt (khoảng 40%) | Mỗi ngày chơi "có chuyện" để luyện xử lý tình huống; tăng tần suất thì giảm độ lớn mỗi lần và có trần ngày (quyết định 31) |

---

## 1. Ý tưởng tổng thể

**Phương án tên game** (không trùng với game tham khảo; phải tra trùng nhãn hiệu và cửa hàng ứng dụng trước khi phát hành, xem mục 16):
1. **Bếp Khởi Nghiệp** (đề xuất dùng; mã lưu `bkn`).
2. **Từ Xe Đẩy Tới Nhà Hàng**.

**Câu chào hàng:** "Nhận order, thu tiền, thối tiền chuẩn như quầy thật, rồi vào bếp rửa, thái, chiên, nêm từng nguyên liệu, để biến chiếc xe đẩy đầu hẻm thành nhà hàng sang trọng."

**Đối tượng người chơi**
- Người chơi casual 16–40 tuổi, thích game quản lý quán ăn mang màu Việt trên điện thoại, mỗi ngày chơi 10–20 phút.
- Người mới vào ngành F&B (thu ngân, phục vụ, phụ bếp): học việc mà vẫn thấy vui.
- Người đào tạo, như chính người dùng: dùng Sổ tay nghề, Chế độ Học việc và mã bài thi (GĐ2–3).

**Điểm khác biệt so với 5 game tham khảo**
1. **Quy trình quầy chuẩn 4 khâu**: đọc hiểu order, ghi phiếu, đọc lại đơn, báo tổng, thối tiền bằng tờ mệnh giá Việt Nam (cách điệu), kiểm tra chuyển khoản, xuất phiếu thu, kẹp phiếu bếp. Không game tham khảo nào có phần này.
2. **Bếp thao tác từng bước, chạy bằng dữ liệu**: một món có nhiều nguyên liệu; người chơi phải *chọn đúng, đủ*, rồi tự *sơ chế từng thứ đúng cách* trên Thớt sơ chế. Mỗi bước được chấm điểm.
3. **Tách lỗi quầy và lỗi bếp** trên phiếu chấm, nên người chơi và người đào tạo biết phải sửa ở đâu.
4. **Công cụ bán hàng tiến hóa theo chặng**: sổ tay → máy tính cầm tay → máy POS → POS quản lý bàn → order tại bàn cùng màn hình bếp.
5. **LiveOps theo ngày thật**: điểm danh, nhiệm vụ, hộp thư quà, sự kiện lễ Việt có món giới hạn. Cả 5 game tham khảo đều thiếu phần này.
6. **Mẹo nghề lồng nhẹ** vào đúng khoảnh khắc chơi. Game không dùng gacha, không bán tiền ảo bằng tiền thật, không xóa save khi thua.

---

## 2. Luồng 4 khâu

Đây là trục gameplay chính. Mọi mục về quầy và bếp phía sau đều bám theo 4 khâu này.

### 2.1 Bốn khâu và thanh tiến trình 4 chấm

```
[Order] ─────────► [Thanh toán] ─────────► [Tính tiền] ─────────► [Làm đồ]
nghe, ghi phiếu,   báo tổng, khách chọn    đếm tiền, thối tiền,   chọn nguyên liệu,
đọc lại, chốt      tiền mặt/QR, đưa tiền   xác nhận QR, xuất      Thớt sơ chế, nấu,
                                           phiếu thu, kẹp phiếu   ra món, giao
```

| Khâu | Các việc | Kết quả của khâu | Chấm gì |
|---|---|---|---|
| **1. Order** | Nghe (đọc bóng thoại) → ghi phiếu (chạm thẻ món, số lượng, ghi chú) → **đọc lại đơn (bắt buộc)** → chốt order | Phiếu order | Phiếu có khớp yêu cầu thật không. Khi đọc lại, khách bắt mỗi lỗi với xác suất 80% |
| **2. Thanh toán** | Báo tổng tiền (tự nhẩm theo bảng giá) → khách chọn tiền mặt hoặc QR → khách đưa tiền | Số tiền phải thu và tiền khách đưa | Báo tổng đúng / dư / thiếu |
| **3. Tính tiền** | Đếm tiền nhận → tính và thối tiền (hoặc xác nhận QR khi thông báo đã về) → xuất phiếu thu → kẹp phiếu bếp | Phiếu thu, phiếu bếp trên dây | Thối đúng, thối gọn (ít tờ nhất theo két thật), không xác nhận QR giả |
| **4. Làm đồ** | Chọn phiếu → Chọn nguyên liệu → Thớt sơ chế (tự chọn thứ tự và cách sơ chế) → Ra món → giao | Món ăn, đồ uống | Điểm từng bước, lỗi nguyên liệu, điểm chất lượng Q, thời gian chờ |

- **Thanh tiến trình 4 chấm** hiện trên đầu mỗi khách (và trên thẻ khách ở dây phiếu). Chấm sáng dần theo khâu; chấm có dấu "!" khi khâu đó có lỗi. *(Bản chơi được: một thanh 4 khâu chung dưới dải phố cho khách đang ở quầy; từ 0.5.1 là 4 biểu tượng tròn, khâu xong có ✓ xanh, khâu đang làm nền vàng kèm tên — mục 5.10.)*
- Nhãn hiển thị dùng đúng chữ: **Order · Thanh toán · Tính tiền · Làm đồ** (`BALANCE.stageLabels`). Thứ tự khai báo ở `BALANCE.stageFlow` để đổi được nếu sau này muốn "Tính tiền" đứng trước "Thanh toán".
- **Luật trả trước**: phải xong khâu Tính tiền mới kẹp được phiếu. Bếp không bao giờ thấy đơn chưa thanh toán.
- Sau khi nhận món: chấm sao, tip vào hũ, review, danh tiếng, [Mẹo nghề nếu là lỗi lần đầu], khách rời đi.

### 2.2 Máy trạng thái khách

`den → xep_hang → order → thanh_toan → tinh_tien → cho_mon → nhan_mon → roi_di`

- Nhánh phụ: `xep_hang → bo_ve` khi hết kiên nhẫn lúc còn xếp hàng, chỉ từ ngày 4. Khách bỏ về chưa trả tiền.
- Sau khi kẹp phiếu, khách **không bỏ về**; chờ lâu chỉ bị trừ sao.
- Phiếu bếp có trạng thái riêng: `cho → dang_lam → xong`, theo dõi từng dòng.
- Chi tiết cấu trúc dữ liệu: `docs/kien-truc.md` mục 7–9.

### 2.3 Thời lượng và nhịp khách (Chặng 1)

| Khâu | Thời lượng mục tiêu |
|---|---|
| Order (gồm đọc lại) | 6–12 giây, cộng khoảng 1,5 giây đọc lại |
| Thanh toán (báo tổng) | 3–6 giây, cộng 2 giây cho mỗi dòng thêm |
| Tính tiền | 4–8 giây; QR chờ 1–4 giây |
| Làm đồ | 18–31 giây mỗi phần (tổng par của món, xem mục 6.14) |
| Giao món, đánh giá | 2 giây, không chặn thao tác |

- **Thời gian phục vụ kỳ vọng** của một khách = 20 giây ở quầy (`counterTimeEstimate`) + tổng par của đơn kỳ vọng.
- **Khoảng cách giữa hai khách** = 1,15 × thời gian phục vụ kỳ vọng × ngẫu nhiên [0,85; 1,15]. Đoạn giữa ca là cao điểm, khoảng cách ×0,9.
- Như vậy **hệ số tải ρ** = thời gian phục vụ / khoảng cách ≈ 0,87, luôn ≤ 0,9 (có unit test). Người chơi làm một mình vẫn theo kịp nếu không mắc nhiều lỗi.
- Ví dụ ngày 1 (đơn 1 món, món trung bình par 20 giây): phục vụ 40 giây, khách cách nhau khoảng 46 giây, ca 4 khách dài khoảng 3–4 phút.
- Từ ngày 3 đơn có thể nhiều dòng và số lượng 2–3 (mục 3.2), nên thời gian phục vụ kỳ vọng khoảng 48–57 giây mỗi khách; lịch khách ngày 9 trở đi dài khoảng 7,5–8,5 phút, hơi vượt mục tiêu 7 phút *(đã chỉnh theo bản chơi được; số đo ở `docs/can-bang.md` mục 4)*. Khoảng cách tính theo đơn thật của từng khách và được giãn ra nếu cần, nên ρ vẫn ≤ 0,9.
- Tỉ lệ thời gian mục tiêu: **khoảng 35% ở quầy, 65% ở bếp**.
- Số liệu theo từng ngày: `docs/can-bang.md` mục 4.

### 2.4 Công thức sao của khách

`Sao = kẹp(làm_tròn_xuống(sao_gốc − phạt_quầy − phạt_chờ), 1, 5)`

- **Sao gốc** = hạng của Q trung bình các món trong đơn, lấy trọng số theo giá. Có món Hỏng thì sao gốc tối đa 2.
- **Chỉ so yêu cầu thật với món làm ra.** Nếu món khớp yêu cầu thật thì không bị trừ, kể cả khi phiếu ghi sai (phiếu chấm ghi "Lệch phiếu" để nhắc quy trình, không trừ sao).
- Khi món lệch yêu cầu thật, lỗi được quy về:
  - **Lỗi tại quầy** nếu phiếu đã ghi sai và bếp làm đúng theo phiếu.
  - **Lỗi tại bếp** nếu phiếu ghi đúng mà món làm lệch phiếu.
- Làm tròn xuống, nên một khoản phạt −0,5 cũng làm mất một sao khi sao gốc là số nguyên (ví dụ 4 − 0,5 = 3,5 → 3). Hai khoản −0,5 cộng lại là −1. Có unit test cho trường hợp này.
- Khách khó tính: có bất kỳ lỗi nào thì −1 sao thêm.
- Khách hướng dẫn (ngày 1) không bị trừ sao.
- Bảng phạt quầy ở mục 5.9, luật nguyên liệu ở mục 6.6, phạt chờ ở mục 6.9.

### 2.5 Vòng lặp meta

| Nhịp | Nội dung |
|---|---|
| **Ca (ngày game)** | *Chuẩn bị*: xem dự báo khách, sự kiện ngày, nhiệm vụ, Shop, nâng cấp. *Ca bán*: khoảng 3–8 phút, 4–8 khách ở Chặng 1. *Tổng kết*: sổ lãi lỗ, lỗi quầy và lỗi bếp, két, review, Mẹo của ngày, "Ngày mai: …" |
| **Ngày thật** | Điểm danh, 3 nhiệm vụ và Rương ngày, hộp thư quà. Mục tiêu 3–4 ca, tổng 15–25 phút |
| **Tuần thật (GĐ2)** | Nhiệm vụ tuần, Rương tuần, kệ công thức xoay vòng, kiểm tra Mẹo nghề cuối tuần |
| **Mùa (MVP có 1 sự kiện; GĐ2–3 đầy đủ)** | Sự kiện lễ 7–14 ngày có món giới hạn, lịch điểm danh tháng, Thẻ Đầu Bếp 28 ngày (GĐ3) |
| **Dài hạn** | 7 chặng, Sổ công thức, thạo món, Sổ tay thất lạc của Dì Sáu, Đũa Vàng, Chuỗi, Tái khởi nghiệp |

---

## 3. Khâu Order

### 3.1 Bố cục màn hình dọc (chuẩn 390×844)
Từ trên xuống:
- **Thanh trên**: ngày, giờ trong game, Tiền quán, sao trung bình, Muỗng Vàng (hiện từ lần điểm danh đầu).
- **Vùng phố và quầy (khoảng 30%)**: xe đẩy mang tên người chơi đặt, tối đa 3 khách xếp hàng. Khách đứng đầu có bóng thoại, vòng kiên nhẫn đổi màu xanh → vàng → đỏ và thanh tiến trình 4 chấm.
- **Dây phiếu bếp (khoảng 6%)**, luôn hiện.
- **Vùng thao tác (khoảng 55%)**: Sổ order, bàn phím báo tổng, két, hoặc bếp.
- **Thanh tab**: `[Quầy · số khách chờ] [Bếp · số phiếu]`. Chỉ chuyển tab được khi không đang ở giữa một bước mini-game.

*M5:* bố cục gọi món kiểu mới (bản mẫu duyệt ở Phòng mẫu Đợt 0) **đã ráp vào Quầy ở Đợt 2 (bản 0.5.1)**: bóng thoại có hình món 64px kèm huy hiệu ×n và ghi chú bằng hình ở ngày 1–2 (từ ngày 3 chỉ còn lời khách, đúng luật bỏ dải icon), bảng gỗ thực đơn với thẻ món hình to (món hiếm "★ còn n", băng "HẾT"), bảng chọn số lượng và ghi chú có hình, phiếu order giấy có hình từng dòng, "Đọc lại" sáng lần lượt từng dòng, "Chốt order" đập con dấu ĐÃ CHỐT rồi phiếu bay lên dây phiếu. HUD gỗ, dải phố có mái bạt và khách bán thân, thanh 4 khâu bằng biểu tượng, dây phiếu, tab và các khâu sau mô tả ở mục 5.10. Từ 0.5.0, lúc đang nấu ở màn cao dưới 760px, dải khách và thanh 4 khâu tạm ẩn (chế độ tập trung, mục 6.5b).

Tín hiệu: có khách mới thì kêu chuông và hiện chấm đỏ trên tab Quầy; khách đầu hàng còn dưới 30% kiên nhẫn thì máy rung nhẹ (30 ms); phiếu đỏ thì nhấp nháy. Mọi tín hiệu âm thanh đều có tín hiệu hình đi kèm.

### 3.2 Nghe và ghi phiếu
- **Bóng thoại là câu nói tự nhiên**, ghép từ mẫu `[xưng hô] + [số lượng + món] + [ghi chú] + [đuôi câu]`. Giọng Nam chiếm 70%, giọng Bắc 30%. Ví dụ: "Cho con 2 ổ ốp la, 1 ổ hổng hành, trứng chín kỹ nghen!" và "Cho cô cái bánh mì trứng, không cho hành nhé."
- **Từ đồng nghĩa** (MVP tối thiểu 15 cặp): không hành = hổng hành = khỏi hành; ngò = rau mùi; hành lá = hành hoa; trà tắc = trà quất; ly = cốc; lạt = nhạt; đậu phộng = lạc; bánh mì trứng = bánh mì ốp la; ít ngọt = bớt đường; không đá = khỏi đá; cay = có ớt; cay nhiều = cay xé lưỡi; ít cay = cay nhẹ thôi; cà phê sữa đá = nâu đá; bánh tráng trộn = bánh tráng trộn thập cẩm.
- **Độ khó 7 ngày đầu**:

| Ngày game | Đơn *(đã chỉnh theo bản chơi được)* |
|---|---|
| 1–2 | Mỗi đơn 1 dòng, 1 phần, không ghi chú; có dải icon món dưới bóng thoại |
| 3–4 | Bỏ dải icon. Đơn 1 dòng 70%, 2 dòng 25%, 3 dòng 5% (mỗi dòng một món khác nhau, nên thực đơn 2 món thì tối đa 2 dòng); số lượng mỗi dòng 1 (80%), 2 (17%), 3 (3%); mỗi dòng 20% có ghi chú, trong đó 1/5 là 2 ghi chú |
| 5 | Ghi chú 35% mỗi dòng; 15% đơn phải "tách dòng" (cùng món, 2 dòng khác ghi chú, ví dụ "2 ổ, 1 ổ không hành") |
| 6 trở đi | Có ghi chú phụ thu: "Thêm trứng" (Bánh mì ốp la), "Thêm trứng cút" (Bánh tráng trộn), +5.000đ mỗi phần |

Đo từ code: số phần kỳ vọng mỗi khách là 1,0 (ngày 1–2), khoảng 1,6 (ngày 3–4), khoảng 1,7–1,76 (từ ngày 5). Thiết kế ban đầu mở dần chậm hơn (2 dòng từ ngày 4, số lượng 2 từ ngày 5, 3 dòng từ ngày 7); bản chơi được mở sớm từ ngày 3, cần theo dõi khi đo người chơi thật (`docs/can-bang.md` mục 3.1).

- **Sổ order**:
  - Lưới thẻ món 2 cột. Chạm thẻ thì mở bảng trượt gồm số lượng (−/+, 1–3), các ô ghi chú và nút "Thêm vào phiếu".
  - Trong danh sách dòng đã ghi: chạm để sửa, vuốt trái để xóa.
  - Hai nút ở cuối: "Đọc lại" và "Chốt order". "Chốt order" chỉ sáng sau khi đã đọc lại.
  - Mỗi dòng có dạng `{recipeId, qty, notes[]}`. Hai phần cùng món nhưng khác yêu cầu thì phải là hai dòng.
- **Bảng giá dán trên xe** luôn hiện ở góc màn hình.

### 3.3 Đọc lại đơn (bắt buộc)
- Đọc lại là **bước bắt buộc của quy trình chuẩn**: chưa đọc lại thì không chốt được order.
- Thu ngân đọc lại *nội dung phiếu*, không đọc lại bóng thoại, ví dụ: "Dạ em đọc lại: 1 bánh mì ốp la không hành, 1 trà tắc ít đường ạ."
- Với **mỗi lỗi** trên phiếu, khách phát hiện với **xác suất 80%** (theo seed của ca). Lỗi bị phát hiện: dòng đó tô đỏ, khách nói lại, khách mất 8% kiên nhẫn, **không trừ sao**. Người chơi sửa rồi đọc lại.
- Lỗi khách không phát hiện (20%) sẽ đi thẳng vào bếp.
- Phiếu đúng hết: khách nói "Đúng rồi em". Số lần "đúng ngay lần đầu" được đếm cho nhiệm vụ và chuỗi "Quầy chuẩn".

### 3.4 Khách quen và tên xe
- **[MVP] Đặt tên xe ngày 1**: màn đầu tiên cho người chơi đặt tên xe (ví dụ "Xe bánh mì Cô Ba"). Tên hiện trên biển xe, trên phiếu thu và thẻ chia sẻ.
- **[MVP] Khách quen hướng dẫn**: ngày 1, hai khách đầu là hàng xóm **cô Thu** và **bạn Nam**. Họ gọi 1 món, không ghi chú, có khung sáng quanh nút cần bấm và không bị trừ sao.
- **[MVP] Khách quen quay lại** *(đã chỉnh theo bản chơi được)*: từ ngày 2, mỗi ca có 15% một trong hai người quay lại (không phải khách đầu ca), có nhãn "Khách quen". Câu gọi món mở đầu bằng "Như mọi khi nha con!" / "Như mọi khi nha!" rồi vẫn nói rõ món quen (cô Thu: Bánh mì ốp la; bạn Nam: Trà tắc). **Sổ khách quen** và thưởng +1 danh tiếng khi ghi đúng món quen chưa làm, dời sang GĐ2 cùng 6 khách quen có tên.
- [GĐ2] Mở rộng thành 6 khách quen có tên và thiện cảm (mục 10.C).

### 3.5 Tình huống order thường gặp [GĐ2]
Ba mẫu thoại: khách gọi món quán chưa bán hoặc món đã hết, khách hỏi giá trước khi gọi, khách đổi món trước khi chốt. Có nút "Quán chưa bán món này / Báo hết món". Xử lý sai thì −0,5 sao. Nối với Mẹo nghề "báo hết món".

---

## 4. Khâu Thanh toán

### 4.1 Báo tổng (Chặng 1: tự nhẩm)
- Người chơi tự cộng theo bảng giá và gõ tổng trên bàn phím số theo đơn vị nghìn (gõ 30 thì hiện 30.000đ).
- Khách so số được báo với **giá của những món họ thật sự gọi**:
  - Báo **cao hơn** giá đúng: khách luôn phát hiện ("Sao nhiều vậy em?"). −1 sao (lỗi quầy, tính 1 lần mỗi khách) và phải báo lại *(đã chỉnh theo bản chơi được: thiết kế cũ −1,5)*. Riêng trường hợp số báo đúng bằng tổng của phiếu ghi thừa món: khách chỉ ra, không trừ sao, −8% kiên nhẫn, quay lại khâu Order để sửa phiếu và đọc lại.
  - Báo **thấp hơn**: khách trả đúng số đã báo. Quán mất phần chênh, sổ ghi "Thu thiếu". Không bị trừ sao.
  - Gian lận không bao giờ có lời.
- Thời gian mục tiêu: 4 giây, cộng 2 giây cho mỗi dòng thêm.
- **Máy tính cầm tay** (nâng cấp 150.000đ, **mở từ ngày 7**): tự cộng tổng khi chạm món, **không hiện tiền thối**. Bước báo tổng còn 1 chạm, người chơi vẫn phải tự tính tiền thối.
- **Hỗ trợ tính tiền** (công tắc trong Cài đặt; tới M3 đặt tạm ở thẻ "Cài đặt" của màn Chuẩn bị): hiện sẵn tổng tiền và tiền thối. Khi bật, chuỗi "Quầy chuẩn" và các nhiệm vụ Quầy không được đếm, không có lượt Giỏ chợ theo chuỗi (trước M4: tip 10.000đ theo chuỗi) và không ghi kỷ lục ca.

### 4.2 Khách chọn cách trả

| Ngày game | Tiền mặt | QR |
|---|---|---|
| 1–3 | 100% | — |
| Từ 4 | khoảng 70–75% | khoảng 25–30%, tùy kiểu khách (dân văn phòng 70%, học sinh 30%, cô chú 5%) |

- **QR tĩnh in sẵn**, vẽ bằng **hoa văn giả không quét được**, có chữ "QR GAME". Tên ngân hàng, ví điện tử trong game đều là tên hư cấu.
- Khách quét mã, sau 1–4 giây mới có thông báo "Đã nhận 30.000đ". Xử lý ở khâu Tính tiền (mục 5.3).

### 4.3 Cách khách đưa tiền mặt
T là tổng hóa đơn.
- 20% đưa vừa đủ.
- 45% đưa tờ nhỏ nhất lớn hơn hoặc bằng T.
- 20% đưa tờ lớn hơn một bậc.
- 10% đưa tờ 200k hoặc 500k (từ ngày 4; tờ đó không quá 25 lần T).
- 5% đưa thêm tiền lẻ để được thối chẵn (từ ngày 5).
- Cô chú lớn tuổi hay đưa tờ lớn; công nhân, shipper hay đưa tiền vừa đủ hoặc tờ nhỏ.
- Hàm `customerCash` ở `docs/kien-truc.md` mục 5.

---

## 5. Khâu Tính tiền

### 5.1 Két và quỹ tiền lẻ
- **Két 7 ngăn**: 5k, 10k, 20k, 50k, 100k, 200k, 500k. Mỗi ngăn có số tờ còn lại.
- **Tờ tiền cách điệu** có chữ "TIỀN GAME". Không vẽ chân dung, quốc huy, hoa văn bảo an hay dòng chữ của ngân hàng trung ương, không dùng tỉ lệ kích thước giống tờ thật. Tờ 20k và 500k cùng tông xanh nhưng khác sắc độ, là một cái bẫy nhẹ.
- **Quỹ tiền lẻ 200.000đ** (8 tờ 5k, 5 tờ 10k, 3 tờ 20k, 1 tờ 50k) là **tài sản riêng của két**, không nằm trong ví Tiền quán và không tiêu được. Đầu mỗi ca, quỹ lẻ tự tái lập đúng cơ cấu tờ.
- **Cuối ca**: tiền mặt vượt quỹ lẻ, tiền QR và hũ tip cùng gộp vào **ví Tiền quán**, trừ chi phí cố định và hoàn tiền. Shop, nâng cấp, trả nợ đều trừ vào ví này. Vốn đầu 200.000đ nằm trong ví.

### 5.2 Thối tiền
- **Tiền khách đưa nằm trên nắp két** (từ 0.5.1: trên mặt quầy gỗ cạnh két, mục 5.10) tới khi thối xong mới tự cất vào đúng ngăn.
- Người chơi chạm ngăn để một tờ bay vào khay thối, chạm tờ trong khay để trả về két, rồi bấm "Đưa tiền thối".
- **Gợi ý "Cần thối: X"**: hiện ở ngày 1–3. Từ ngày 4 ẩn, trừ khi bật Hỗ trợ tính tiền.
- **Chấm điểm**:
  - Thối đúng là đạt.
  - **Thối gọn**: số tờ bằng số tờ ít nhất có thể, tính bằng **quy hoạch động trên số tờ thật đang có trong két** (không dùng thuật toán tham lam, vì tham lam sai khi két thiếu tờ). Ví dụ cần thối 60k, két có 1 tờ 50k, 3 tờ 20k, không có tờ 10k: lời giải gọn là 3 tờ 20k.
  - Thời gian mục tiêu: 5 giây, cộng 0,8 giây cho mỗi tờ trong cách thối gọn.
  - Thối **thiếu**: 90% khách đếm lại và phát hiện, −1 sao (lỗi quầy) và phải bù. 10% không phát hiện, nhưng sáng hôm sau có review 2 sao gửi qua hộp thư (từ M2).
  - Thối **dư**: không trừ sao, quán mất tiền. 50% khách thật thà trả lại (+1 danh tiếng).

### 5.3 Xác nhận QR
- Người chơi chỉ được bấm "Đã nhận đủ" khi thông báo tiền về đã hiện.
- **Từ ngày 7**, 4% giao dịch QR là *ảnh chụp màn hình cũ*, không có thông báo đi kèm. Nếu xác nhận thì mất trọn hóa đơn và mở thẻ Mẹo nghề.
- **Loa báo tiền** (nâng cấp 150.000đ, mở từ ngày 5): đọc to số tiền về, tự xác nhận và chặn ảnh giả.

### 5.4 Phiếu thu, phiếu bếp và dây phiếu
- **Phiếu thu** tự sinh khi tính tiền xong: tên xe, số phiếu, món, tổng, khách đưa, tiền thối, phương thức. Phiếu thu đưa kèm tiền thối và dùng để đối soát ở tổng kết ca.
- **Phiếu bếp**: số phiếu (#001, đánh lại mỗi ngày), giờ trong game, từng dòng "2 × Bánh mì ốp la", ghi chú **VIẾT HOA MÀU ĐỎ** (ví dụ "KHÔNG HÀNH · CHÍN KỸ").
- **Dây phiếu chứa 3 phiếu** ở Chặng 1–2. Chặng 3 có kệ 5 phiếu; Chặng 5 có màn hình bếp 8 phiếu.
- **Viền phiếu đổi màu** theo phần trăm ngân sách chờ đã dùng: xanh dưới 50%, vàng 50–80%, đỏ trên 80% và nhấp nháy.
- Dây đầy thì nút "Kẹp phiếu" khóa và hiện "Bếp đang đầy (3/3)". Người chơi phải sang bếp làm bớt.

### 5.5 Hết tiền lẻ
Game kiểm tra còn thối được không bằng cùng hàm quy hoạch động ở mục 5.2. Nếu không thối được, mở 3 lựa chọn:
- "Xin khách tiền lẻ": 40% khách có, −5% kiên nhẫn.
- "Mời khách chuyển QR" (khi đã mở QR).
- "Làm tròn có lợi cho khách": thối dư tối đa 5.000đ.

### 5.6 Chốt ca
- **MVP**: màn tổng kết tự tính "Quỹ lẻ đầu ca + tiền mặt thu − đã thối = phải có trong két", so với két thật và chỉ ra khoản lệch do thối sai, kèm số phiếu thu gây lệch.
- **[GĐ2] (Chặng 3)**: người chơi tự đếm két theo từng mệnh giá (có nút −/+). Nếu lệch, nhật ký chỉ ra đúng phiếu gây lệch, ví dụ "Phiếu #007 thối dư 10.000đ" hoặc "Phiếu #011 khách chuyển khoản nhưng chọn Tiền mặt". Két khớp: +2 Muỗng Vàng và +5 danh tiếng.

### 5.7 Khuyến mãi [GĐ2, từ Chặng 3]
- **Combo**: máy POS hiện "Áp combo?". Nếu khách gọi đủ món combo mà không được áp, 60% khách phát hiện, −0,5 sao.
- **Voucher**: đối chiếu 4 điều kiện là hạn dùng, giá trị đơn tối thiểu, có được cộng dồn không, và món áp dụng. 70% hợp lệ, 30% không hợp lệ.
  - Áp voucher sai: sổ ghi "Thất thoát khuyến mãi".
  - Từ chối voucher hợp lệ: −1 sao.
  - Voucher hết hạn hôm qua: có lựa chọn "Du di".
- **Giờ vàng** và **thẻ tích điểm** (10 dấu tặng 1 món).
- **Quy tắc làm tròn**: số tiền giảm làm tròn **xuống** bội 1.000đ; tổng sau thuế GTGT (mô phỏng) và các phần chia hóa đơn làm tròn **lên**; người cuối cùng trả phần còn lại. Hóa đơn luôn có dòng "Làm tròn".

### 5.8 Quy trình quầy tiến hóa theo chặng

| Chặng | Order | Thanh toán (tính tổng) | Tính tiền | Gửi bếp | Mô hình |
|---|---|---|---|---|---|
| 1 Xe đẩy | Sổ order chạm ô | Tự nhẩm (+ Máy tính cầm tay từ ngày 7) | Tiền mặt; QR tĩnh từ ngày 4; phiếu thu | Kẹp tay, dây 3 phiếu | Trả trước, bán mang đi, một mình làm hết |
| 2 Quán cóc | Sổ order + Sổ khách quen | Máy tính cầm tay | Tiền mặt, QR + loa báo tiền | Kẹp tay + thẻ số | Trả trước, thêm ăn tại chỗ 2 bàn |
| 3 Tiệm nhỏ | **Máy POS**, gợi ý bán thêm | POS tự tính; combo, voucher, giờ vàng | + QR động, thẻ, tờ 1k/2k; chốt ca đếm két | In bếp tự động, gọi số, kệ 5 phiếu | Trả trước; thuê thu ngân NPC |
| 4 Quán gia đình | POS quản lý bàn, đặt bàn qua điện thoại | + thẻ thành viên | + chia nhiều phương thức | In bếp theo số bàn | Trả trước tại quầy, khách mang số bàn |
| 5 Nhà hàng | Máy order cầm tay tại bàn | Tạm tính; tách, gộp, chuyển bàn; thuế GTGT (mô phỏng); xuất hóa đơn cho doanh nghiệp | Chia hóa đơn theo nhiều phương thức | Màn hình bếp, chia trạm | **Trả sau** cho sảnh; quầy mang về vẫn trả trước |
| 6 Sang trọng | Trưởng bàn, đặt bàn có cọc, hồ sơ khách VIP | Phí phục vụ 5%, thuế GTGT (mô phỏng) | Thẻ quốc tế, tip ghi trên thẻ | Gọi món theo lượt | Trả sau, thực đơn nhiều món |
| 7 Chuỗi | Báo cáo chuỗi | — | — | — | Mỗi chi nhánh theo mô hình gốc của nó |

- Máy POS trong game là máy hư cấu, **không mô phỏng luồng màn hình đặc thù của sản phẩm thật nào**.
- Mỗi lần lên chặng có một "ngày khai trương quy trình mới": Anh Khoa hướng dẫn 30–60 giây bằng khung sáng quanh nút cần bấm, kèm một chuỗi huấn luyện 3 bước.

### 5.9 Bảng phạt quầy và phiếu chấm

Bảng này công khai trong Sổ tay. Các lỗi món chỉ bị tính khi **món làm ra lệch yêu cầu thật** (mục 2.4).

| Lỗi | Khâu | Hậu quả |
|---|---|---|
| Món giao sai món khách gọi | Order hoặc Làm đồ | −2 sao. Mở màn Xử lý phàn nàn: "Làm lại đúng món" (tốn thêm giá vốn, sao tối đa 3) hoặc "Hoàn tiền món đó" |
| Sai hoặc thiếu ghi chú | Order hoặc Làm đồ | −1 sao mỗi lỗi, tối đa −2 |
| Thiếu số lượng | Order hoặc Làm đồ | −1 sao, phải làm bù miễn phí |
| Làm thừa món | Order hoặc Làm đồ | Không trừ sao; giá vốn món thừa ghi vào Hao hụt |
| Phiếu sai nhưng món vẫn đúng yêu cầu | Order | "Lệch phiếu": không trừ sao, chỉ ghi nhắc |
| Báo tổng dư | Thanh toán | −1 sao, phải báo lại *(đã chỉnh theo bản chơi được)*; nếu số báo đúng bằng tổng phiếu ghi thừa: 0 sao, −8% kiên nhẫn, quay lại sửa phiếu |
| Báo tổng thiếu | Thanh toán | 0 sao, quán mất phần chênh |
| Thối thiếu: bị phát hiện / không bị phát hiện | Tính tiền | −1 sao và phải bù / review 2 sao hôm sau |
| Thối dư | Tính tiền | 0 sao, mất tiền; 50% khách trả lại |
| Xác nhận QR khi tiền chưa về | Tính tiền | Mất trọn hóa đơn, hiện Mẹo nghề |
| Chờ (xếp hàng và ở quầy, tính lúc kẹp phiếu) quá 60% / 85% kiên nhẫn | Order | −0,5 / −1 sao (chỉ mức cao nhất; từ ngày 2, khách hướng dẫn không bị tính) |
| Khách khó tính gặp bất kỳ lỗi nào | — | −1 sao thêm |

**Phiếu chấm từng khách** trượt lên trong 2 giây và không chặn thao tác. Phiếu ghi Đạt/Sai cho từng khâu **Order · Thanh toán · Tính tiền · Làm đồ** và Thời gian chờ; nhãn Nhanh/Ổn/Chậm; nhãn nguồn lỗi **"Lỗi tại quầy"** hoặc **"Lỗi tại bếp"**; và các nhãn tốt như "Thối gọn", "Không tì vết".

**Chuỗi "Quầy chuẩn"**: 5 khách liên tiếp không có lỗi quầy thì bật chuỗi, kéo dài tới lỗi quầy kế tiếp. Lỗi quầy tính cả lỗi 0 sao (báo thiếu, thối sai, xác nhận ảnh giả). [M2, đã làm] Khi chuỗi đang chạy, khách 5 sao cho tip 10.000đ thay vì 5.000đ; chuỗi dài nhất được ghi kỷ lục ở màn Lên chặng. Bật Hỗ trợ tính tiền thì chuỗi luôn là 0. Huy hiệu chuỗi trên thanh trên chưa có ở bản chơi được.

### 5.10 Giao diện quầy kiểu game (M5 Đợt 2, bản 0.5.1)
Thay cho các "ô vuông có chữ" của quầy cũ, cùng phong cách đã duyệt ở Phòng mẫu và màn Bếp 0.5.0 (mục 6.5b): hình to, viền mực
nâu, khối 3 tông, nút bánh kẹo, khung giấy / gỗ / phấn. **Chỉ đổi giao diện**: luật, tiền, sao, tip, độ khó giữ nguyên.

- **Thanh trên (HUD)**: thanh gỗ có 3 viên giấy. Viên giờ ca có đồng hồ và mặt trời chạy dần từ 06:00 tới cuối ca. Viên "Tiền
  quán" có hình ví; ngay dưới là thẻ xanh "+45.000đ" ghi tiền đã thu trong ca (tiền mặt + chuyển khoản + tip − hoàn tiền) — số
  này chỉ cộng vào Tiền quán lúc đóng ca, như luật cũ. Mỗi lần thu tiền, 6–12 đồng xu bay từ két (hoặc điện thoại khách; tip:
  4–6 xu từ dòng tip) về ví, thẻ xanh đếm lên theo từng xu và dừng đúng số. Viên sao trung bình có hình ngôi sao. Nút "?" ở cuối.
- **Dải phố**: mái bạt sọc đỏ trắng, mặt trước xe đẩy mang tên xe; khách **bán thân** (6 kiểu khách, 4 tâm trạng; khách quen và
  khách lạ có dáng riêng) đứng sau quầy, hàng chờ nhỏ dần 100% / 85% / 70%, nhãn "Ở quầy" / "Đơn đặt trước" / "Khách lạ". Vòng
  kiên nhẫn ôm quanh đầu, đổi màu xanh → vàng → đỏ; kiên nhẫn dưới 30% thì đầu khách bốc hơi. Khách vào trượt tới, khách rời
  vui thì nảy, giận thì có mây giận — mỗi khách chỉ diễn một lần.
- **Thanh 4 khâu**: 4 biểu tượng tròn (sổ order, máy tính tiền, két, chảo) nối bằng thanh; khâu xong có dấu ✓ xanh, khâu đang
  làm nền vàng kèm tên khâu, khâu sau mờ.
- **Dây phiếu**: phiếu giấy có kẹp gỗ, hình món, số phiếu; dải màu chờ ở đáy phiếu đổi xanh → vàng → cam → đỏ (theo ngân sách
  chờ, viền vẫn ngả vàng / đỏ như mục 5.4); phiếu mới đung đưa một lần. Thanh tab Quầy / Bếp có biểu tượng và số đếm (khách đang
  xếp hàng / phiếu trên dây), chấm đỏ khi bên kia có việc mới.
- **Order** (mục 3.1): khách bán thân lớn sau mặt quầy gỗ, bong bóng gọi món. Ngày 1–2 bong bóng có hình món 64px, huy hiệu ×n,
  ghi chú bằng hình (đúng dải hình món cũ); từ ngày 3 chỉ còn lời khách nguyên văn (giữ luật "bỏ dải icon từ ngày 3" ở mục 3.2).
  Bảng gỗ Thực đơn với thẻ món hình to (món hiếm "★ còn n", băng "HẾT"); chạm món mở bảng chọn số lượng (đĩa bày đúng số phần,
  1–3) và ghi chú có hình (nút có giá phụ thu), nút "Thêm vào phiếu" ghi tiền của dòng; món bay xuống phiếu order giấy (kẹp gỗ, kẻ
  dòng, mép răng cưa, dòng mới "viết ra"). "Đọc lại đơn" làm phiếu sáng lần lượt từng dòng rồi đánh ✓ / ✗, mặt khách nhỏ trên
  phiếu gật đầu hoặc lắc đầu. "Chốt order" đập con dấu **ĐÃ CHỐT** (phóng 1,8 → 1, nghiêng −8°, rung khung 2px, tiếng "cộp") rồi
  phiếu thu nhỏ bay cong lên dây phiếu. Ngày 1, Dì Sáu chỉ việc kế tiếp bằng bong bóng giấy và vòng sáng quanh nút.
- **Thanh toán** (mục 4.1): bảng giá **phấn** (hình món, giá gọn "20k", dòng phụ "+5k" của ghi chú), phiếu order tóm tắt bằng hình
  món có huy hiệu ×n, **máy tính tiền** xanh ngọc có màn LED (gõ theo nghìn, đuôi ".000đ" in mờ để nhắc), phím bánh kẹo ≥ 48px,
  phím chuông "Báo tổng" cao 4 hàng. Khách nhận tổng thì máy kêu "keng" và dấu ✓ nảy trên màn LED; báo dư thì màn LED rung, viền
  đỏ. (Báo thiếu cũng "keng" vì khách không biết mình được tính thiếu — lỗi chỉ lộ ở phiếu chấm, như luật cũ.)
- **Tính tiền, tiền mặt** (mục 5.1–5.2): tờ tiền khách đưa xòe trên **mặt quầy gỗ** kèm nhãn "Khách đưa"; phiếu số liệu (Tổng,
  Đã thối, Cần thối ngày 1–3, cảnh báo "Đang thối dư"); **khay inox** đựng tiền thối; **ngăn kéo két 7 ngăn** vẽ thật, mỗi ngăn
  có chồng tờ "TIỀN GAME" và huy hiệu số tờ. Chạm ngăn thì tờ tiền bay vào khay, chạm chồng trong khay thì tờ bay về két. Thối
  đúng: tiền trong khay bay sang khách, tiền khách đưa bay vào két, két nảy rồi đóng, xu bay về ví. Thẻ "Két không đủ tiền lẻ"
  có nút chọn cách xử lý (hộp tự mở như cũ). Nút "Đưa tiền thối" (hoặc "Không cần thối") dính đáy.
- **Chuyển khoản** (mục 5.3): khách giơ điện thoại có ảnh chuyển khoản (mã QR giả "QR GAME" của xe, số tiền ở dải dưới); ô báo
  tiền của quán (chuông điện thoại quán, hoặc Loa báo tiền nếu đã mua) ghi "Đang chờ tiền về…" / "Đã nhận …". Tiền về: tiếng
  "ting", vệt sáng quét dọc màn điện thoại, ô báo tiền nảy. "Đã nhận đủ" khi tiền đã về: "keng", xu bay từ điện thoại về ví.
  "Từ chối ảnh giả" đúng lúc: bản sao điện thoại bị đóng dấu đỏ **ẢNH GIẢ** rồi khách rút máy đi; từ chối nhầm khách thật: dấu
  **TỪ CHỐI** xám và rung. Nhận nhầm ảnh giả: phiếu thu đóng dấu ẢNH GIẢ.
- **Phiếu thu** (mục 5.4): máy in phiếu đặt sau mép quầy, phiếu giấy nhiệt trượt lên khỏi khe theo từng nấc rồi con dấu **ĐÃ
  THU** đập xuống; phiếu có tên xe, "Phiếu thu #001", giờ in, từng món có hình, Tổng, phương thức, khách đưa / tiền thối, làm
  tròn, "Cảm ơn quý khách!". "Kẹp phiếu bếp" thì phiếu (kèm kẹp gỗ) bay lên chỗ trống kế tiếp của dây phiếu.
- **Phiếu chấm** (mục 5.9): chân dung khách đổi mặt theo số sao kèm biểu cảm (tim, lấp lánh, ba chấm, mồ hôi, giận), 5 ngôi sao
  bật lần lượt 180 ms mỗi sao, 5 hàng Order · Báo tổng · Thối tiền · Bếp · Thời gian chờ có biểu tượng khâu và dấu ✓ / ✗ (màu
  luôn kèm hình), tem "Lỗi tại quầy" / "Lỗi tại bếp" đóng lên phiếu, dòng tip có đồng xu vàng (âm "coin2", chữ "+5.000đ" nổi, xu
  bay về ví). Phiếu vẫn hiện 2 giây, không chặn thao tác; giảm chuyển động thì hiện thẳng.
- **Tình huống trong ca và phàn nàn**: hình người / tờ tiền / Dì Sáu ở đầu hộp, các lựa chọn có biểu tượng an toàn / rủi ro /
  khóa, kết quả có mặt người đổi theo kết quả và chip ảnh hưởng có biểu tượng.
- **Bố cục màn thấp**: chạy được ở 390×844, 360×600, 320×568 và iPhone SE có thanh Safari (375×553, vùng an toàn 47/34). Panel quầy
  tự gọn theo chiều cao thật (khách và bong bóng thu nhỏ để hàng thẻ món đầu lộ trên hàng nút dính đáy); mọi nút ≥ 44px và chạm
  trúng, chữ ≥ 13px. Kiểm bằng `tests/e2e/m5-quay.e2e.mjs`.
- **Hiệu ứng** chỉ kích theo thao tác hoặc sự kiện của ca, không bao giờ phát lại khi màn vẽ lại; chỉ đổi vị trí và độ mờ, không
  chặn chạm, tự dọn sau khoảng 2 giây; "Giảm chuyển động" thì không hạt, không bay, không hoạt ảnh lặp, số tiền cập nhật ngay
  kèm một nhịp sáng.

---

## 6. Khâu Làm đồ (bếp thao tác từng bước)

### 6.1 Luồng bếp

```
Chọn phiếu trên dây → Chọn nguyên liệu (bắt buộc, luôn là bước đầu)
→ Thớt sơ chế: tự chạm từng nguyên liệu để sơ chế, tự chọn thứ tự, tự chọn cách sơ chế
→ Ra món (bấm lúc nào cũng được) → Giao cho khách
```

- **Một dòng phiếu có số lượng n = một lượt nấu.** Tham số nhân theo n (ví dụ đập 2n trứng), thời gian chuẩn của mỗi bước × (1 + 0,4 × (n − 1)). Chỉ các dòng khác ghi chú mới tách thành lượt riêng.
- Khi mọi dòng của phiếu xong, người chơi bấm "Giao món". Khách chấm sao theo mục 2.4.
- Thẻ công thức (tên món, nguyên liệu, ghi chú đỏ, trạng thái từng nguyên liệu) luôn nằm ở góc màn hình bếp.

### 6.2 Dữ liệu công thức (thuần dữ liệu, không viết code riêng cho từng món)
Lược đồ đầy đủ ở `docs/kien-truc.md` mục 6 (`recipes.js`). Tóm tắt:
- `ingredients`: nguyên liệu với vai trò `chinh` (chính), `phu` (phụ), `tuy_chon` (chỉ cần khi ghi chú yêu cầu, ví dụ tương ớt khi khách dặn "Cay").
- `decoys`: nguyên liệu bẫy, mỗi bẫy đi cặp với một nguyên liệu thật (trứng vịt ↔ trứng gà, nước mắm ↔ nước tương).
- `notes`: ghi chú khách có thể dặn. `removes` bỏ nguyên liệu (và bỏ luôn bước sơ chế của nó), `adds` thêm nguyên liệu tùy chọn, `patch` ghi đè tham số một bước, `surcharge` là phụ thu.
- `steps`: các bước. Mỗi bước có `type` (cơ chế), `ing` (nguyên liệu mà bước này xử lý), `after` (bước phải xong trước), `method` (cách sơ chế cần chọn), `par`, `w` (trọng số: 1 phụ, 2 chính, 3 linh hồn), `critical` (chí mạng), `retryCost`.
- Hình nguyên liệu có các trạng thái dùng chung cho mọi món: nguyên → đã rửa → đã thái → đã chín → trên đĩa. *Đến 0.4.x trạng thái làm bằng lớp phủ CSS; từ 0.5.0 (M5) mỗi trạng thái là **hình vẽ riêng** (dưa leo sạch / thái lát / thái sợi / bào; trứng nứt / ốp la sống / vừa / cháy; xoài gọt / sợi / lát / hạt lựu; vỏ bưởi gọt / áo bột / chín; trứng cút bóc; bánh tráng sợi / vuông; khô mực xé; bánh mì nướng; đá viên…), chọn theo bước đã làm và cách sơ chế đã chọn (`src/ui/art/state-map.js`).*
- Mỗi ô nguyên liệu là **SVG tự vẽ kèm nhãn chữ**. Cặp bẫy phải khác nhau rõ về hình hoặc màu (trứng vịt vỏ xanh nhạt, to hơn; nước mắm chai nắp đỏ, nước tương chai nắp vàng…). Không dùng emoji cho nguyên liệu.

### 6.3 Thớt sơ chế [MVP]
Thớt sơ chế biến "sơ chế đúng và đủ" thành lựa chọn thật của người chơi, thay vì một chuỗi bước do game ép.

- Sau bước Chọn, các nguyên liệu đã chọn nằm trên thớt. Mỗi nguyên liệu có **icon trạng thái cần đạt** (ví dụ dưa leo: đã rửa → đã thái lát; trứng: đã đập → đã chiên). *Từ 0.5.0: thớt gỗ lớn, nguyên liệu là hình 64–72px đổi sang hình trạng thái ngay khi xong bước; mỗi bước là một **huy hiệu tròn** có biểu tượng thao tác (dao, vòi nước, chảo, muỗng khuấy, bình lắc…), dưới huy hiệu là tên bước và chữ trạng thái 13px ("Tốt · 85", "Chạm để làm", "Sau: Rửa dưa leo"); bước xong có dấu ✓ viền màu theo hạng, bước khóa có ổ khóa, bước chí mạng có ★.*
- Người chơi **tự chạm vào từng nguyên liệu** để mở bước của nó. **Thứ tự tự do**, trừ các ràng buộc cứng khai báo bằng `after` (ví dụ phải rửa dưa trước khi thái, phải đập trứng trước khi chiên, phải chiên xong mới nêm).
- Bước bị khóa do `after` hiện ổ khóa nhỏ và dòng "Cần rửa dưa leo trước".
- **Chọn cách sơ chế** cho 1–2 nguyên liệu ở các món có bước cần chọn cách (Bánh mì ốp la: dưa leo; Bánh tráng trộn: bánh tráng, xoài; Chè bưởi: cùi bưởi): trước khi chơi bước, người chơi chọn một trong 2–3 cách (ví dụ dưa leo: Thái lát / Thái sợi / Bào). **Chọn sai thì điểm bước đó −15** và review nhắc đúng cách.
- **Nút "Ra món" luôn bấm được.** Bước chưa làm tính **0 điểm**. Review gọi đúng tên nguyên liệu, ví dụ "Dưa leo chưa rửa kìa em".
- Nguyên liệu không có bước sơ chế riêng (hành lá, rau thơm rắc lên, bánh mì) hiện sẵn dấu xong; phần kẹp nhân, bày món chạy hoạt hình tự động khi Ra món.
- Nguyên liệu phụ **không được chọn** ở bước Chọn thì các bước của nó không hiện trên thớt (đã có dòng phạt "thiếu" ở mục 6.6, không phạt lần hai).
- Các bước Canh lửa và Rót tạm dừng nếu người chơi ẩn trang giữa chừng. Tải lại trang giữa một bước thì bước đó chơi lại từ đầu với cùng tham số.

### 6.4 Thư viện cơ chế mini-game (11 cơ chế có trong game từ bản 0.5.0)

Bản 0.5.0 (M5 Đợt 1) thêm 5 thao tác **DAP, XOAY, GOT, LAC, BAY** thay cho các bước trước đây phải mượn CHA/CHAM (gọt vỏ bằng chà, đập trứng bằng chạm…). Chỉ đổi cơ chế của 15 bước; **id bước, par, w, chí mạng, giá làm lại, giá bán và giá vốn giữ nguyên** (bảng bất biến ở `docs/can-bang.md` mục 7.1). Mỗi hàm chấm mới được chọn để **cùng nghĩa với bước nó thay**: LAC, XOAY, GOT thay CHA nên giữ luật "−15 nếu quá 2 × par" và tỉ lệ đủ lượt; BAY thay CHAM `exact` nên giữ −30 cho mỗi lần lệch số lượng; chỉ DAP khó hơn bước cũ (thêm nhịp canh lực), bù bằng vùng xanh rộng và sàn giờ.

| Mã | Tên hiển thị | Thao tác | Dùng cho | Luật chấm | Có ở |
|---|---|---|---|---|---|
| CHON | Chọn nguyên liệu | Chạm ô trên kệ để bỏ vào rổ, chạm lại để lấy ra, bấm "Xong" | Mọi món | 100 − 15 × số lần chạm nhầm. Quá 2,5 × par thì −15 và các ô cần lấy nhấp nháy gợi ý. Thiếu, thừa, bẫy chấm riêng ở mục 6.6. Thiếu nguyên liệu chính thì không qua được | **MVP** |
| CHA | Chà rửa | Vuốt qua lại lên các vết bẩn hoặc vùng vỏ được đánh dấu; kiểu `strokes`: vuốt qua lại đổi chiều liên tục | Rửa, bóc, xé, bóp (*đến 0.4.x còn dùng cho gọt, trộn, khuấy, lắc — từ 0.5.0 chuyển sang GOT, XOAY, LAC*) | Theo độ phủ các vết/vùng đánh dấu (không phải chỉ đủ quãng vuốt); −15 nếu quá 2 × par | **MVP** |
| THAI | Thái | **Kéo dao để ngắm, nhấc tay để cắt** tại vạch chấm. Vạch dao hiện lệch lên trên ngón tay 40 px. Nguyên liệu rộng ít nhất 280 px | Thái lát, bổ đôi, cắt sợi | Mỗi nhát theo độ lệch so với vạch: ≤6 px → 100; ≤14 px → 80; ≤24 px → 55; còn lại → 20 (ngưỡng nhân hệ số vùng). Nhát thừa −10 | **MVP** |
| CHAM | Chạm | 3 chế độ. `exact`: đúng n lần, có thể có vùng đích. `min`: đủ N lần trong T giây. `targets`: nhiều chai, mỗi chai đúng số nấc | Nêm, vắt, thêm sữa (*đến 0.4.x còn dùng cho đập trứng, thêm đá, áo bột — từ 0.5.0 chuyển sang DAP, BAY, LAC*) | `exact`: lệch số lần −30 mỗi lần; điểm theo khoảng cách tới tâm (≤8% → 100, ≤15% → 80, ≤25% → 55). `min`: r = số lần / N; 1,0–1,2 → 100; 0,85–1,35 → 80; 0,65–1,6 → 55. `targets`: 100 − 30 × tổng độ lệch nấc | **MVP** |
| LUA | Canh lửa | Kim độ chín chạy từ 0 đến 1,2 trong `period` giây; bấm "Nhấc/Vớt" | Chiên, luộc, nướng, trụng | **Hàm liên tục, đối xứng quanh tâm vùng** (mục 6.5); **vượt 1,0 là cháy → 0** | **MVP** (bản có lửa và lật: GĐ2) |
| ROT | Rót | Giữ để rót, thả tay ở vạch; được nhấn lần 2 để bù (dâng chậm lại) | Rót trà, chế phin, rưới nước cốt dừa | Lệch ≤4% dung tích → 100; ≤9% → 80; ≤15% → 55; **tràn > 1,02 → 0**. Tốc độ dâng tại vạch không quá 25% dung tích mỗi giây | **MVP** |
| DAP | Đập trứng | Hai nhịp mỗi quả: (1) chạm quả trứng khi kim thước lực (chạy đi về, chu kỳ 1,1 giây) nằm trong vùng xanh thì trứng nứt; (2) vuốt xuống (lệch tối đa 35° × hệ số vùng, không quá 50°) để tách vào chảo. Chạm thay vì vuốt, hoặc chạm khi kim đã quá vùng xanh, thì vỏ rơi vào chảo ("Có vỏ!") | Đập trứng (Bánh mì ốp la, Bánh mì trứng gà ta; "Thêm trứng" đập 3 quả) | Mỗi quả theo vị trí kim lúc chạm, hàm vùng như Canh lửa với vùng xanh [0,40; 0,70] nới theo hệ số vùng; vỏ rơi vào thì tối đa 40; quả chưa đập 0; điểm là trung bình n quả | **MVP 0.5.0** |
| XOAY | Khuấy (*kế hoạch cũ: KHUAY*) | Vẽ vòng tròn quanh lòng tô, ly hoặc chén, chiều nào cũng được. Quay nhanh hơn 2,2 vòng/giây × hệ số vùng (gấp 1,8 lần ở bước đánh bông) quá 0,25 giây thì văng ra ngoài. Lớp vỏ: tô (Trộn đều), ly (Khuấy ly), chén (Đánh bông) | Trộn bánh tráng, khuấy cà phê, đánh sữa muối | 100 × min(1, vòng / K) − 12 mỗi lần văng − 10 nếu nhịp các vòng không đều (hệ số biến thiên > 0,45 × hệ số vùng) − 15 nếu quá 2 × par; chưa quay vòng nào 0 | **MVP 0.5.0** |
| GOT | Gọt vỏ | Vuốt thẳng từ trên xuống theo từng dải vỏ (K dải dọc cao bằng quả), lệch tối đa 35°; độ phủ mỗi dải là phần hợp của các nhát vuốt. Vuốt ngược, lệch hoặc trượt ra ngoài là nhát hụt | Gọt xoài xanh, gọt lớp vỏ xanh của bưởi | Trung bình min(1, độ phủ / 0,85) của K dải × 100 − 8 mỗi nhát hụt (tối đa −24) − 15 nếu quá 2 × par | **MVP 0.5.0** |
| LAC | Lắc | Giữ bình hay rổ kéo lên kéo xuống; mỗi lần đổi chiều quá 24px là một lượt. Không dùng cảm biến chuyển động của máy (iOS bắt xin quyền). Lớp vỏ: bình (Lắc bình), rổ (Lắc rổ áo bột năng) | Lắc trà tắc, lắc rổ áo bột năng | 100 × min(1, lượt / K) − 10 nếu nhịp không đều (hệ số biến thiên > 0,6 × hệ số vùng) − 15 nếu quá 2 × par | **MVP 0.5.0** |
| BAY | Bày (lớp vỏ ly: Thả đá) | Kéo từng món từ khay thả vào vùng đích rồi bấm Xong. Khay có max(n + 1, 3) món nên ghi chú "Ít đá" có nghĩa thật. Thả ngoài vùng thì món trôi về khay, không phạt; chạm món đã thả để lấy ra | Thả đá vào ly (Cà phê sữa đá, Cà phê muối) | Trung bình điểm vị trí (d = khoảng cách tới tâm / bán kính vùng: ≤ 0,35 × hệ số → 100; ≤ 0,6 × hệ số → 80; ≤ 1 → 55; xa hơn 20) − 30 × \|số đã thả − n\|; chưa thả gì 0 | **MVP 0.5.0** (bày đĩa xếp lớp có thứ tự: BAY_DIA ở GĐ2) |
| LUC | Giữ lấy lực | Giữ tay, kim lực chạy 0 → 100 → 0 theo chu kỳ 1,2 giây; thả tay | Đập tỏi, đập gừng, ép khuôn | Vùng rộng 15 đơn vị; đúng tâm → 100 | GĐ2 |
| BAY_DIA | Bày đĩa xếp lớp | Kéo thả thành phần vào bóng mờ theo thứ tự (mở rộng từ BAY) | Xếp lớp, trình bày | Lệch tâm ≤8% → 100; sai thứ tự lớp −20 | GĐ2 |
| VUOT_CHUOI | Vuốt theo mũi tên | Vuốt 3–5 hướng liên tiếp | Cuốn, gấp lá, gói | Đúng hướng ±30° → 100; ±45° → 70 | GĐ2 |
| VE_DUONG | Vẽ theo đường | Vuốt theo nét chấm | Tỉa hoa, rưới sốt, buộc lạt | % phủ nét × (1 − độ lệch) | GĐ3 |
| LAC_CHAO | Lắc chảo (*kế hoạch cũ ghi LAC; đổi mã để khỏi trùng LAC lên xuống của 0.5.0*) | Vuốt trái phải theo nhịp | Xào, lúc lắc, flambé (kết hợp LUC) | Dưới nhịp thì thanh khét tăng; quá nhanh thì văng ra | GĐ3 |

**Bước đổi cơ chế ở 0.5.0** (mã trong code: `dap`, `xoay`, `got`, `lac`, `bay`): Đập trứng vào chảo (`dap_trung`) CHAM `exact` → DAP 2 quả; Lắc đều (`lac`, 2 món trà tắc) CHA 6 lần vuốt → LAC 6 lượt; Gọt vỏ xoài (`got_xoai`, 2 món bánh tráng trộn) và Gọt lớp vỏ xanh (`got_vo`, Chè bưởi) CHA 5 vùng → GOT 5 dải; Trộn đều (`tron`, 2 món bánh tráng trộn) CHA 8 lần vuốt → XOAY 5 vòng trong tô; Khuấy đều (`khuay`, 2 món cà phê) CHA 6 lần vuốt → XOAY 3 vòng trong ly; Đánh sữa muối (`danh_sua_muoi`) CHA 8 lần vuốt → XOAY 6 vòng nhanh trong chén; Thêm đá (`them_da`, 2 món cà phê) CHAM `exact` → BAY "Thả đá vào ly" 2 viên; Lăn bột năng (`ao_bot`) CHAM `min` → LAC "Lắc rổ áo bột năng" 8 lượt. Bước giữ cơ chế cũ: Rửa dưa leo, Bóc trứng cút, Xé khô mực, Bóp muối (CHA); mọi bước Thái, Canh lửa, Rót và các bước Nêm/Vắt (CHAM).

**Sàn giờ của 5 thao tác mới**: giới hạn giờ = max(2,5 × par, sàn theo số lượng) — dap 1,5 giây mỗi quả + 1; xoay 1,1 mỗi vòng + 1; got 1,2 mỗi dải + 1; lac 0,4 mỗi lượt + 1; bay 1,3 mỗi viên + 1,5 (Hỗ trợ thao tác nhân 1,5 cả hai; nấu thử không giới hạn). Sàn không đổi par (par quyết định thời gian chờ của khách), chỉ để "Thêm trứng" hay đơn nhiều phần vẫn làm kịp.

Thang nhãn bước: **Hoàn hảo** (≥90), **Tốt** (≥70), **Đạt** (≥50), **Hỏng** (<50).

### 6.5 Quy tắc chung cho mọi cơ chế
- Mỗi bước dài 2–8 giây và **tự kết thúc ở 2,5 × par** để game không bao giờ kẹt. **Riêng bước Chọn không tự kết thúc** (quá giờ chỉ nhấp nháy gợi ý).
- Thời gian đo bằng `performance.now()`, không đếm khung hình. Mini-game tạm dừng khi tab bị ẩn.
- Tọa độ chuẩn hóa về 0..1. Vùng chạm tối thiểu 44px và cách mép màn hình 16px.
- Sân khấu mini-game chặn cuộn, phóng to, nhấn giữ lâu và menu chuột phải; chỉ nhận con trỏ chính; `pointercancel` coi như thả tay. Trên máy tính, phím Space thay cho nhấn hoặc giữ.
- **Thẻ gợi ý** 0,8 giây trước bước: chạm để bỏ qua, tự ẩn sau 3 lần nấu món đó. **Nhãn kết quả** chồng lên bước kế tiếp, không bắt chờ. *Từ 0.5.0 thay bằng thẻ bước, con dấu và màn ra món ở mục 6.5b.*
- **Biến thể theo seed** [MVP]: mỗi lần nấu xáo vị trí ô trên kệ, dịch nhẹ vị trí vạch thái. [GĐ2] 10–15% lần nấu có biến cố nhỏ (trứng hai lòng đỏ, vỏ trứng rơi vào chảo phải gắp ra).
- **Chấm Canh lửa bằng hàm liên tục đối xứng** (đề xuất ban đầu, tinh chỉnh trong `docs/can-bang.md`). Gọi d = |giá trị − tâm vùng| / nửa bề rộng vùng:

| d | Điểm |
|---|---|
| ≤ 0,25 | 100 |
| 0,25 → 1 (mép vùng) | giảm đều 100 → 80 |
| 1 → 2 | giảm đều 80 → 40 |
| 2 → 3 | giảm đều 40 → 10 |
| > 3 | 10 |
| Giá trị > 1,0 (cháy) | 0 |

  Ví dụ chiên trứng vùng [0,55; 0,72] (tâm 0,635, nửa rộng 0,085): nhấc ở 0,72 (mép) được 80; nhấc ở 0,80 (d ≈ 1,94) được khoảng 42, tức Hỏng; nhấc sớm ở 0,50 (d ≈ 1,59) được khoảng 56.

### 6.5b Thẻ bước, con dấu, màn ra món và phong cách (M5, bản 0.5.0)
Thay cho thẻ gợi ý chữ, nhãn kết quả dạng viên chữ và màn công bố 1,2 giây của bản cũ. Người dùng đã duyệt phong cách ở Phòng mẫu (Đợt 0, 02/10/2026).

- **Thẻ "Bước k/N"** trước mỗi bước trên Thớt: ruy băng "Bước 3/6" (N = số bước trên Thớt + 1 cho bước Chọn; k = số bước đã xong + 1), hình nguyên liệu hoặc dụng cụ **to** ở giữa, động từ chữ to ("Thái dưa leo!"), **bàn tay mẫu** diễn đúng cử chỉ của thao tác (chạm, chà, kéo dao, giữ, chạm rồi vuốt, vẽ vòng, vuốt xuống, lắc lên xuống, kéo thả) và nút "Chạm để bắt đầu". Thẻ tự vào bước sau 1,1 giây, chạm ở đâu trên thẻ cũng vào ngay. Từ lần nấu thứ 3 của món chỉ còn ruy băng gọn trong đầu sân khấu, không chờ. Lần đầu gặp thẻ của 5 thao tác mới thì Dì Sáu chỉ vào bàn tay mẫu và nút bắt đầu (hướng dẫn lần đầu; thẻ đứng chờ trong lúc đọc).
- **Đầu sân khấu gọn** (≤ 44px): chuỗi chấm bước tròn (bước đang làm to hơn và có hình nguyên liệu, bước xong có ✓ viền màu theo hạng), tên bước, đồng hồ. Dòng hướng dẫn ngắn là một thẻ giấy nhỏ ở mép trên vùng chơi. Trong bếp, sân khấu có tường gạch men phía sau và thanh chân là mặt quầy gỗ.
- **Con dấu kết quả bước**: xong bước là con dấu đập xuống ngay trên sân khấu (phóng 1,6 → 1, nghiêng −8°, 220 ms, dừng hình 60 ms), chữ theo 4 hạng **Hoàn hảo / Tốt / Đạt / Hỏng** kèm điểm. Hoàn hảo: 10–14 hạt vàng, ngôi sao bay về chấm bước; Tốt: vài hạt; Đạt: không hạt; Hỏng: khói xám, khung rung nhẹ. **Dì Sáu phản ứng** ở góc trên-phải bằng một câu ngắn (mỗi hạng 3–5 câu tự viết, ví dụ "Đẹp quá con ơi!", "Khá lắm, giữ vậy nha!", "Hơi lệch chút, không sao!", "Lỡ tay rồi, bước sau kỹ hơn nha!"; không dùng kiểu câu "để dì sửa giùm"). Sân khấu được giữ khoảng 0,7 giây (0,5 giây khi giảm chuyển động) rồi mới về Thớt; bước chí mạng Hỏng thì hỏi làm lại như cũ. Kết quả đã lưu ngay khi con dấu hiện.
- **Màn ra món** khoảng 2,2 giây (1,4 giây khi giảm chuyển động), chạm để bỏ qua (quyết định Q6 của người dùng): tia sáng xoay chậm sau lưng, món nảy vào, huy hiệu hạng món rơi xuống, % đếm lên có tiếng tích tắc, sao bật lần lượt, ruy băng "Không tì vết", pháo giấy khi lên cấp thạo món, Dì Sáu góp ý đúng bước còn yếu (5 thao tác mới có câu góp ý riêng). Món hiếm dùng hình món nền kèm huy hiệu ★ (quyết định Q3).
- **Chế độ tập trung khi nấu** (quyết định Q1): màn cao dưới 760px thì lúc đang nấu (bước Chọn, Thớt, một bước) dải khách và thanh 4 khâu tạm ẩn cho bếp rộng thêm khoảng 120px; dây phiếu (màu chờ của khách) vẫn hiện; thông báo nổi chờ tới lúc rời bếp.
- **Phong cách vẽ và chuyển động** (áp cho mọi đợt sau): hình to là nhân vật chính, chữ chỉ là phụ; viền mực nâu dày, khối 3 tông (mảng tối dưới-phải, điểm sáng trên-trái), bóng đất dưới chân; nút "bánh kẹo" có viền mực, mặt sáng trên đậm dưới, bóng cứng, nhấn thì lún; khung giấy, gỗ, bảng phấn; tiêu đề font tròn đậm Baloo 2 (tự lưu, giấy phép mở), chữ thân giữ font hệ thống. Cặp bẫy khác nhau ở **dáng**, nhận ra được ở 48px (nước mắm chai thấp hổ phách ↔ nước tương chai cao nâu đen…). Hiệu ứng chỉ đổi vị trí/độ mờ, không chặn chạm, tôn trọng "Giảm chuyển động"; iOS không rung được nên kết quả xấu dùng rung khung hình kèm âm thanh. Chỉ học cơ chế và cảm giác của game tham khảo; hình, câu thoại, âm thanh đều tự làm (mục G của `docs/tham-khao/m5-nghien-cuu-giao-dien.md`).

### 6.6 Luật nguyên liệu "đúng và đủ"
**Mỗi nguyên liệu chỉ tính một dòng phạt**, theo thứ tự ưu tiên: **trái ghi chú > bẫy > thiếu > thừa**. Bẫy lọt vào món thay cho nguyên liệu cặp của nó cũng chỉ tính một dòng "bẫy".

| Lỗi | Hậu quả |
|---|---|
| Thiếu nguyên liệu **chính** | Không qua được bước Chọn, không trừ tiền. Game chỉ báo chung "Còn thiếu nguyên liệu chính" và phạt 1,5 giây. Khi bật Hỗ trợ thao tác, ô cần lấy nhấp nháy |
| **Trái ghi chú trên phiếu** (có hành khi phiếu ghi "Không hành"; phiếu ghi "Cay" mà không có tương ớt) | Q tối đa 60, sao tối đa 2 |
| **Bẫy** lọt vào món (nước mắm thay nước tương, rau húng lủi thay rau răm) | Q tối đa 60, tức tối đa hạng Được. Review chỉ đích danh |
| Thiếu nguyên liệu **phụ** | Q −10 mỗi thứ. Bước sơ chế của nguyên liệu đó không hiện trên thớt. Review gọi đúng tên, ví dụ "Thiếu dưa leo rồi em ơi" |
| Thừa nguyên liệu không phải bẫy | Q −8; tiền nguyên liệu ghi vào Hao hụt |
| Sơ chế sai cách (chọn sai `method`) | −15 điểm bước đó (không phải phạt nguyên liệu) |
| Nguyên liệu đã chọn nhưng chưa sơ chế khi Ra món | Bước đó 0 điểm (không phải phạt nguyên liệu) |
| (GĐ2) Làm trái ghi chú dị ứng | Món bắt buộc Hỏng, 1 sao, hoàn tiền, sổ ghi "Sự cố nghiêm trọng" |
| (GĐ2) Sai thứ tự bắt buộc / dùng nhầm thớt sống-chín / dùng nguyên liệu sắp hỏng | −15 Q / −15 điểm bước kèm Mẹo "nhiễm chéo" / −20 Q |

- **Giá vốn** bị trừ khi chốt bước Chọn thành công: tổng giá mọi nguyên liệu đã chọn × số lượng. Phần thừa và bẫy ghi thêm vào Hao hụt.
- Q so với **phiếu** (bếp làm theo phiếu). Sao của khách so với **yêu cầu thật** (mục 2.4). Ví dụ: phiếu quên ghi "Không hành" và bếp cho hành theo phiếu → Q không bị trừ, khách −1 sao, "Lỗi tại quầy".

### 6.7 Chất lượng món, hạng món, Không tì vết
- **Q** (0–100) = Σ(w × điểm bước) / Σw, trừ phạt nguyên liệu, rồi áp các trần. Làm tròn tới số nguyên.
- **Hạng món và sao gốc**:

| Hạng | Q | Sao gốc |
|---|---|---|
| Tuyệt hảo | ≥ 90 | 5 |
| Ngon | 75–89 | 4 |
| Được | 60–74 | 3 |
| Kém | 40–59 | 2 |
| Hỏng | < 40 | 1 |

- **Bước chí mạng** (`critical`) có điểm dưới 50 thì món bị khóa ở hạng Hỏng.
- **Huy hiệu "Không tì vết"**: mọi bước ≥ 90 (Hoàn hảo), không lỗi nguyên liệu, không chọn sai cách sơ chế, không làm lại, không dùng "Tự làm", **không bật Hỗ trợ thao tác**. Thưởng +1 danh tiếng; khách 5 sao cho tip 10.000đ.
- **Ví dụ Bánh mì ốp la** (6 bước, Σw = 9), phiếu không ghi chú:
  - Chọn 100 (w1), Rửa dưa 90 (w1), Thái dưa 80 (w1), Đập trứng 80 (w2), Chiên trứng 85 (w3), Nêm 100 (w1). Q = 785 / 9 ≈ **87, Ngon**.
  - Chọn "Thái sợi" cho dưa leo (sai cách): Thái dưa còn 65, Q ≈ **86, Ngon**; review "Bánh mì mà dưa thái sợi hả em?".
  - Lấy dưa leo nhưng bấm Ra món khi chưa rửa, chưa thái: hai bước 0 điểm, Q = 615 / 9 ≈ **68, Được**.
  - Quên lấy dưa leo: hai bước của dưa leo không hiện, Q = 615 / 7 ≈ 88, trừ 10 còn **78, Ngon**. (Cần theo dõi: bỏ hẳn nguyên liệu phụ không được lợi hơn lấy mà không sơ chế; xem `docs/can-bang.md` mục 15.)
  - Lấy nước mắm thay nước tương (bẫy): Q bị giới hạn **60, Được**; review "Sao bánh mì có mùi nước mắm vậy em?".
  - Nhấc trứng sau khi kim vượt 1,0: bước chí mạng 0 điểm, món **Hỏng**.

### 6.8 Làm lại, Tự làm, bỏ món, xử lý phàn nàn
- **Bước chí mạng Hỏng**: hộp thoại "Trứng cháy rồi! Làm lại (tốn 6.000đ, khoảng 7 giây) / Bỏ món".
- **Làm lại bước**:
  - 1 lượt cho mỗi món (dụng cụ phụ cho thêm 1 lượt từ GĐ2).
  - Tốn thời lượng bước đó, cộng giá vốn khai báo trong `retryCost` (ghi vào Hao hụt).
  - Điểm mới thay điểm cũ nhưng **tối đa 85**.
  - Bước Chọn không làm lại được; muốn sửa thì phải bỏ món.
- **"Tự làm"** (mở từ **thạo cấp 2**): chỉ cho bước phụ (w = 1), **không áp dụng cho bước Chọn**. Bước được 80 điểm; món không thể đạt Không tì vết.
- **Bỏ món**: mất giá vốn đã trừ (vào Hao hụt), phiếu quay lại dây, thời gian chờ của khách vẫn chạy.
- **Món Hỏng hoặc sai món khi giao**: mở màn **Xử lý phàn nàn**.
  1. Chọn câu xin lỗi: có 3 câu, trong đó 1 câu đổ lỗi cho khách là sai. Chọn đúng thì +1 sao, nhưng không vượt trần.
  2. Chọn cách giải quyết: "Làm lại" (sao tối đa 3) hoặc "Hoàn tiền món đó".

### 6.9 Chờ món, tip, danh tiếng, sao trung bình
- **Ngân sách chờ món** B = 30 giây + 2 × tổng par của phiếu (par đã nhân theo số lượng). Tính từ lúc kẹp phiếu. Vượt 75% B: −0,5 sao; vượt 100%: −1 sao; vượt 150%: −2 sao (chỉ tính mức cao nhất). Khách không bỏ về.
- **Tip** (M4) chỉ có khi khách chấm 5 sao **và** số tiền khách thực trả từ 20.000đ, khách bỏ vào **hũ tip** (không đi qua két):
  - 5.000đ duy nhất. Chữ hiển thị: "Hóa đơn từ 20.000đ, khách vui (5 sao) sẽ bỏ hũ tip 5.000đ"; phiếu chấm ghi "Tip 0 (hóa đơn dưới 20.000đ)" khi khách 5 sao mà hóa đơn chưa tới ngưỡng.
  - Báo tổng thiếu làm khách trả dưới 20.000đ thì mất tip; bán kèm món thứ hai hoặc phụ thu thì đủ ngưỡng.
  - Thay tip 10.000đ cũ: món Không tì vết +1 danh tiếng (như cũ), khách khó tính 5 sao +1 danh tiếng, chuỗi "Quầy chuẩn" 5 khách +1 lượt Giỏ chợ mỗi ca; Ngày lãnh lương khách gọi thêm món (không nhân tip).
  - Câu thoại: "Ngon quá, cô bỏ hũ tip cho con nha."
- **Danh tiếng mỗi khách**: 5 sao +3, 4 sao +2, 3 sao +1, 2 sao trở xuống 0. Món Không tì vết +1. Khách trả lại tiền thối dư +1. (M2) Trong mùa sự kiện, mỗi phần món lễ đạt Ngon trở lên +1.
- **Sao trung bình** tính trên 30 đánh giá gần nhất; khi chưa đủ 5 đánh giá, phần thiếu tính là 4 sao.
- **Hệ số lượng khách** theo sao trung bình *(đã chỉnh theo bản chơi được)*: từ ngày 2 và khi đã có ít nhất 5 đánh giá, sao trung bình từ 4,5 thì +1 khách, dưới 3,5 thì −1 khách, 3,5–4,49 giữ nguyên (sàn 3, trần 8). Bảng hệ số ×1,15 / ×1,0 / ×0,85 / ×0,7 (`customerMultiplier`) giữ cho các chặng sau. Sự kiện ngày có thể đổi thêm số khách (mục 9.3). Màn Tổng kết có dự báo số khách ngày mai (đã tính sự kiện ngày); dòng giải thích "Vì sao hôm nay vắng khách?" chưa có.

### 6.10 Thạo món (5 cấp, không bao giờ tụt)
Thạo món tính theo số lần món đó đạt hạng **Ngon trở lên**:

| Cấp | Mốc | Quyền lợi | Có ở |
|---|---|---|---|
| 1 Tập làm | Vừa có công thức | Làm đủ mọi bước; có tay chỉ ở lần nấu đầu | MVP |
| 2 Quen tay | 5 lần | Vùng mục tiêu của món +5%; thẻ gợi ý thu gọn; **bước phụ có nút "Tự làm"** (80 điểm). Từ Chặng 3: giá +3% và dạy được cho nhân viên | MVP |
| 3 Thạo | 15 lần | Vùng mục tiêu +10%. Từ Chặng 3: giá +6%. (GĐ2) mở nấu mẻ 2 phần; +1 danh tiếng cho mỗi món Tuyệt hảo *(chưa có ở bản chơi được, dời sang GĐ2)* | MVP |
| 4 Tinh thông | 35 lần, trong đó 10 lần Tuyệt hảo | Sơ chế sẵn theo mẻ lớn, mẻ 3 phần, mở 1 biến tấu món; giá +9% | GĐ2 |
| 5 Bậc thầy | 70 lần, trong đó 25 lần Tuyệt hảo | Bước chính cũng "Tự làm" được (85 điểm); chỉ bước linh hồn bắt buộc tự tay. Nhãn "Món tủ". Giá +12%. Là điều kiện chuẩn hóa công thức cho chi nhánh | GĐ2 |

Ở Chặng 1–2, giá luôn tròn 5.000đ nên thạo món thưởng bằng tay nghề và danh tiếng. Thưởng bằng giá chỉ bắt đầu từ Chặng 3.

### 6.11 Dụng cụ bếp (mỗi hiệu ứng phải vẽ ra trên màn hình)

| Dụng cụ | Giá | Chặng | Hiệu ứng |
|---|---|---|---|
| Dao thép tốt | 150.000đ | 1 (**MVP**, từ ngày 2) | Vùng mục tiêu của THAI +20%, vạch chấm vẽ to hơn |
| Chảo chống dính | 200.000đ | 1 (**MVP**, từ ngày 3) | Vùng chín của LUA +15%, vùng xanh rộng ra; qua vùng thì cháy chậm hơn 20% |
| Ly đong có vạch | 120.000đ | 2 | Vùng rót +3% dung tích, hiện số ml |
| Bếp 2 họng | 400.000đ | 2 | Một bước LUA tự chạy nền trong lúc làm bước khác |
| Tủ mát | 1,2tr | 3 | Mở sơ chế đầu ca, giữ nguyên liệu thêm 1 ngày |
| Máy xay | 800.000đ | 3 | Bước băm "Tự làm" được 80 điểm |
| Dao Nhật | 900.000đ | 3 | Vùng thái +40%, hiện trước vạch kế tiếp |
| Nồi hầm lớn | 1tr | 3 | Nước dùng 20 phần mỗi mẻ (bắt buộc cho Phở) |
| Chảo gang dày, bếp khè | 1,2tr / 8tr | 5 | Mở Bò lúc lắc, flambé |
| Bộ nhíp và cọ trình bày | 15tr | 6 | Bước trình bày có lưới căn chỉnh |

Giá dụng cụ tăng theo đường cong ở mục 11.4. Có **unit test kiểm tra tham số trong dữ liệu khớp với hình vẽ**, để tránh lỗi "nâng cấp không có tác dụng".

### 6.12 Độ khó và chế độ Hỗ trợ
- **Hệ số vùng mục tiêu theo chặng**: Xe đẩy ×1,2 → Quán cóc ×1,1 → Tiệm nhỏ ×1,0 → Quán gia đình ×0,95 → Nhà hàng ×0,9 → Sang trọng ×0,8.
- Trong mỗi chặng, vùng hẹp dần 2% mỗi ngày game, sàn là 75% hệ số chặng. Dụng cụ, thạo món và Hỗ trợ nới lại vùng.
- **Trần tổng hệ số vùng ×1,6** (chặng × ngày × dụng cụ × thạo món × hỗ trợ), để các hệ số không cộng dồn tới ×2.
- **Hỗ trợ ở MVP có 2 công tắc** (Cài đặt; tới khi có màn Cài đặt ở M3, các công tắc nằm ở thẻ "Cài đặt" của màn Chuẩn bị):
  - *Hỗ trợ tính tiền*: hiện tổng và tiền thối. Khi bật, chuỗi "Quầy chuẩn" và nhiệm vụ Quầy không được đếm, không có tip 10.000đ theo chuỗi, không ghi kỷ lục ca.
  - *Hỗ trợ thao tác*: vùng mục tiêu ×1,25, thời lượng bước ×1,5, ô nguyên liệu cần lấy nhấp nháy sau 1,5 × par. Khi bật, **món không thể đạt Không tì vết và bị trần ở hạng Ngon** (Q ≤ 89) *(đã chỉnh theo bản chơi được)*; các việc đếm Tuyệt hảo và Hoàn hảo ở bước Thái/Canh lửa không được đếm và không được bốc. Để chuỗi không kẹt, bước chuỗi cần món Tuyệt hảo hoặc khách 5 sao sẽ đếm món Ngon trở lên hoặc khách từ 4 sao (thẻ chuỗi ghi rõ).
- [GĐ2] Thêm *Giữ bóng thoại và icon* và *Thong thả* (khách không mất kiên nhẫn, không tính kỷ lục).
- Mọi tín hiệu âm thanh luôn đi kèm tín hiệu hình. Vùng mục tiêu có cả vạch lẫn biểu tượng, không chỉ phân biệt bằng màu.

### 6.13 Phản hồi "sướng tay"
- Âm thanh tổng hợp bằng WebAudio (M3): dao "tách", dầu "xèo", nước, chuông Hoàn hảo, chuông ra món, tiếng tiền.
- Rung 15 ms khi thái đúng, 80 ms khi Hỏng (tắt được).
- Nguyên liệu đổi trạng thái ngay, có hơi nước bốc lên.
- Màn công bố món dài 1,2 giây (chạm để bỏ qua): món phóng to, hiện hạng và Q, **Dì Sáu** hiện với 4 biểu cảm (tự hào, vui, lo, tiếc) và góp ý đúng bước sai. *Từ 0.5.0: màn ra món 2,2 giây có tia sáng, huy hiệu hạng, % đếm lên, sao và pháo giấy; xong mỗi bước có con dấu và Dì Sáu phản ứng (mục 6.5b).*
- [M5, 0.5.0] Âm riêng cho từng thao tác mới: trứng nứt "cạch", muỗng chạm thành tô, tiếng gọt vỏ, đá lách cách trong bình, đá rơi "tõm"; thêm âm con dấu, lấp lánh, kèn ra món, tích tắc khi % đếm lên. Mỗi lần phát lệch cao độ nhẹ để không nghe đều đều.
- [GĐ2] **Chuỗi "Liên hoàn"**: nhiều bước Hoàn hảo liên tiếp thì hiệu ứng mạnh dần (chỉ hình và tiếng, không đổi tiền thưởng).
- Tôn trọng `prefers-reduced-motion` và công tắc giảm chuyển động.
- Nếu có hiệu ứng đứt tay (GĐ2) thì chỉ hiện băng cá nhân hài hước, không có máu.

### 6.14 Công thức

Năm món MVP dưới đây ban đầu chỉ dùng 6 cơ chế có sẵn; từ bản 0.5.0 (M5) 15 bước đổi sang 5 thao tác mới DAP, XOAY, GOT, LAC, BAY (mục 6.4) — các bảng dưới ghi cơ chế hiện tại, par và w giữ nguyên như cũ. Số liệu đã đối chiếu với `src/data/recipes.js` và `src/data/ingredients.js` ngày 30/09/2026 (bản M2); nếu code đổi thì code là chuẩn và bảng này được sửa theo. Giá vốn = tổng giá nguyên liệu chính và phụ (bảng giá từng nguyên liệu ở `docs/can-bang.md` mục 2); nguyên liệu tùy chọn chỉ tính khi ghi chú đòi (ví dụ tương ớt +250đ khi "Cay"). Ghi chú phụ thu (+5.000đ) không làm tăng giá vốn vì bước Chọn không đòi thêm nguyên liệu, chỉ tăng số lần thao tác. Cột "Sau" là ràng buộc `after`. Kệ luôn có thêm vài nguyên liệu của món khác để bước Chọn không quá dễ.

**(1) Bánh mì ốp la** — Chặng 1, có sẵn (M1). Độ khó 1.
- Giá 20.000đ, giá vốn 9.000đ.
- Chính: bánh mì, trứng gà ×2. Phụ: dưa leo, hành lá, nước tương. Tùy chọn: tương ớt (khi "Cay").
- Bẫy: trứng vịt, hành tây, nước mắm. Kệ 12 ô.
- Ghi chú: Không hành (bỏ hành lá); Cay (thêm tương ớt, nêm 2 nấc); Lòng đào (vùng chín [0,45; 0,60]); Chín kỹ (vùng chín [0,70; 0,85]); Thêm trứng (+5.000đ, đập 3 trứng, khách dặn từ ngày 6). Lòng đào và Chín kỹ loại trừ nhau.
- Hành lá không cần sơ chế riêng (rắc khi Ra món). Bước kẹp nhân chạy hoạt hình tự động.

| # | Bước | Cơ chế | Tham số | Sau | par | w |
|---|---|---|---|---|---|---|
| 1 | Chọn nguyên liệu | CHON | kệ 12 ô | — | 6 | 1 |
| 2 | Rửa dưa leo | CHA | 4 vết bẩn | — | 3 | 1 |
| 3 | Thái dưa leo | THAI | 3 vạch; chọn cách: **Thái lát** / Thái sợi / Bào | 2 | 4 | 1 |
| 4 | Đập trứng vào chảo | DAP (*đến 0.4.x: CHAM `exact`*) | n = 2 quả (3 khi "Thêm trứng"); vùng xanh của kim lực [0,40; 0,70] | — | 2 | 2 |
| 5 | Chiên trứng (**chí mạng**, linh hồn) | LUA | period 5 giây; vùng [0,55; 0,72]; làm lại 6.000đ | 4 | 5 | 3 |
| 6 | Nêm nước tương | CHAM `targets` | nước tương 1; tương ớt 2 khi "Cay" | 5 | 2 | 1 |

Tổng par 22 giây, Σw = 9.

**(2) Trà tắc** — Chặng 1, có sẵn (M1). Độ khó 1.
- Giá 10.000đ, giá vốn 3.000đ.
- Chính: trà, tắc ×3, đường, ly (trên kệ ghi "Ly nhựa"). Phụ: đá.
- Bẫy: chanh, muối, sữa đặc. Kệ 9 ô.
- Ghi chú: Ít đường (nêm 1), Nhiều đường (nêm 3), Không đá (bỏ đá).

| # | Bước | Cơ chế | Tham số | Sau | par | w |
|---|---|---|---|---|---|---|
| 1 | Chọn nguyên liệu | CHON | kệ 9 ô | — | 5 | 1 |
| 2 | Bổ đôi tắc | THAI | 3 vạch | — | 3 | 1 |
| 3 | Vắt tắc | CHAM `min` | N = 6 trong 3 giây | 2 | 3 | 1 |
| 4 | Rót trà | ROT | vạch [0,70; 0,82] | — | 3 | 2 |
| 5 | Nêm đường (linh hồn) | CHAM `exact` | ít 1 / thường 2 / nhiều 3 | — | 2 | 3 |
| 6 | Lắc đều | LAC, bình (*đến 0.4.x: CHA*) | 6 lượt lắc | 3, 4, 5 | 2 | 1 |

Tổng par 18 giây, Σw = 9. Đá cho vào tự động khi Ra món (bỏ khi "Không đá").

**(3) Bánh tráng trộn** — Chặng 1, Shop 250.000đ, mở từ ngày 2 (M2). Món thử luật "đúng và đủ". Độ khó 2.
- Giá 20.000đ, giá vốn 8.000đ.
- Chính: bánh tráng, xoài xanh, trứng cút ×3, khô bò. Phụ: rau răm, hành phi, đậu phộng, sa tế, tắc.
- Bẫy: **rau húng lủi** (cặp với rau răm), bánh tráng mè, trứng gà. Kệ 12 ô.
- Ghi chú: Không cay (bỏ sa tế), Cay nhiều (sa tế 4 nấc), Không rau răm (bỏ rau răm), Thêm trứng cút (+5.000đ, bóc 5 trứng, khách dặn từ ngày 6). Trên kệ, bẫy rau húng lủi ghi là "Húng lủi".

| # | Bước | Cơ chế | Tham số | Sau | par | w |
|---|---|---|---|---|---|---|
| 1 | Chọn nguyên liệu | CHON | kệ 12 ô | — | 8 | 1 |
| 2 | Cắt bánh tráng | THAI | 5 vạch; chọn cách: **Cắt sợi** / Cắt miếng vuông / Để nguyên | — | 4 | 1 |
| 3 | Gọt vỏ xoài | GOT (*đến 0.4.x: CHA*) | 5 dải vỏ | — | 3 | 1 |
| 4 | Thái xoài | THAI | 5 vạch; chọn cách: **Thái sợi** / Thái lát / Cắt hạt lựu | 3 | 4 | 1 |
| 5 | Bóc trứng cút | CHA | 3 vùng vỏ (5 khi thêm trứng) | — | 3 | 1 |
| 6 | Nêm sa tế, vắt tắc | CHAM `targets` | sa tế 2 (0 / 4 theo ghi chú); tắc 2 | — | 3 | 2 |
| 7 | Rưới dầu hành phi | ROT | vạch [0,55; 0,70] | — | 2 | 1 |
| 8 | Trộn đều (linh hồn) | XOAY, tô (*đến 0.4.x: CHA 8 lần vuốt*) | 5 vòng | 2–7 | 4 | 3 |

Tổng par 31 giây, Σw = 11. Đây là món dài nhất Chặng 1: nếu đo thấy quá dài, bỏ bước Rưới dầu hành phi trước (xem `docs/can-bang.md` mục 15).

**(4) Cà phê sữa đá** — Chặng 1, Shop 200.000đ, mở từ ngày 4 (M2). Độ khó 2.
- Giá 15.000đ, giá vốn 5.000đ.
- Chính: cà phê phin, sữa đặc, ly. Phụ: đá.
- Bẫy: sữa tươi, cà phê hòa tan, đường phèn. Kệ 9 ô.
- Ghi chú: Ít ngọt (sữa 1 nấc), Ngọt đậm (sữa 3 nấc), Ít đá (thêm đá 1 lần).
- Đề xuất cũ "trả bằng 60 Muỗng Vàng thay cho tiền" **không làm ở M2** *(đã chỉnh theo bản chơi được)*: món chỉ mua bằng Tiền quán. Muỗng Vàng ở MVP tiêu vào đổi việc và màu dù xe (mục 11.1).

| # | Bước | Cơ chế | Tham số | Sau | par | w |
|---|---|---|---|---|---|---|
| 1 | Chọn nguyên liệu | CHON | kệ 9 ô | — | 5 | 1 |
| 2 | Chế nước sôi vào phin | ROT | vạch [0,60; 0,75] | — | 3 | 2 |
| 3 | Chờ phin nhỏ giọt | LUA | period 6 giây; vùng [0,60; 0,80] | 2 | 6 | 2 |
| 4 | Thêm sữa đặc (linh hồn) | CHAM `exact` | 2 nấc (ít ngọt 1, ngọt đậm 3) | — | 2 | 3 |
| 5 | Thả đá vào ly | BAY, ly (*đến 0.4.x: CHAM `exact`*) | 2 viên (ít đá 1); khay luôn có ít nhất 3 viên | — | 2 | 1 |
| 6 | Khuấy đều | XOAY, ly (*đến 0.4.x: CHA 6 lần vuốt*) | 3 vòng | 2–5 | 2 | 1 |

Tổng par 20 giây, Σw = 10.

**(5) Chè bưởi** — Chặng 1, **món sự kiện Tri ân 20/11** (M2), chỉ lấy qua chuỗi sự kiện. Độ khó 3.
- Giá 15.000đ, giá vốn 5.000đ. Giá **không tăng** trong mùa sự kiện.
- Chính: cùi bưởi (trên kệ ghi "Vỏ bưởi"), bột năng, nước cốt dừa, ly. Phụ: đậu xanh, đường, muối, đá.
- Bẫy: bột mì (cặp với bột năng), sữa đặc (cặp với nước cốt dừa), dừa nạo. Kệ 12 ô.
- Ghi chú: Nhiều nước cốt dừa (vạch rót [0,80; 0,92]), Không đá.

| # | Bước | Cơ chế | Tham số | Sau | par | w |
|---|---|---|---|---|---|---|
| 1 | Chọn nguyên liệu | CHON | kệ 12 ô | — | 6 | 1 |
| 2 | Gọt lớp vỏ xanh | GOT (*đến 0.4.x: CHA*) | 5 dải vỏ | — | 3 | 1 |
| 3 | Thái cùi bưởi | THAI | 4 vạch; chọn cách: **Cắt hạt lựu** / Thái lát / Thái sợi | 2 | 4 | 1 |
| 4 | Bóp muối, xả cho hết đắng | CHA | 6 lần vuốt | 3 | 3 | 1 |
| 5 | Lắc rổ áo bột năng | LAC, rổ (*đến 0.4.x: "Lăn bột năng", CHAM `min` N = 8 trong 3,5 giây*) | 8 lượt lắc | 4 | 4 | 2 |
| 6 | Luộc tới khi trong (**chí mạng**, linh hồn) | LUA | period 5 giây; vùng [0,55; 0,75]; làm lại 3.000đ | 5 | 5 | 3 |
| 7 | Rưới nước cốt dừa | ROT | vạch [0,65; 0,80] | — | 2 | 2 |

Tổng par 27 giây, Σw = 11.

**Công thức mẫu ngoài MVP** (giữ để định hướng nội dung):

**(6) Gỏi cuốn tôm thịt** — Chặng 2, Kệ Chính 550.000đ, GĐ2.
- Giá 30.000đ, giá vốn 12.000đ.
- Các bước: CHON (bẫy: bánh tráng nướng mè, rau húng lủi, tương ớt) → CHA rửa rau → LUA luộc tôm và thịt (chí mạng; quá chín thì tôm teo) → THAI thịt 6 lát → THAI chẻ đôi tôm → ROT nhúng bánh tráng (nhúng lâu thì bánh rách) → BAY_DIA xếp lớp xà lách → bún → thịt → tôm (mặt đỏ úp xuống) → hẹ (w2) → VUOT_CHUOI cuốn: gập đáy, gập hai bên, cuộn 2 lần (w3) → KHUAY pha tương đen, rắc đậu phộng.
- Tổng par khoảng 42 giây.

**(7) Phở bò tái** — Chặng 3, Kệ Chính 1,35tr, cần Nồi hầm lớn, GĐ2.
- Giá 65.000đ, giá vốn 26.000đ.
- **Nồi nước dùng nấu một lần ở pha sơ chế đầu ca**, đủ 20 phần; điểm của nồi áp cho mọi bát trong ngày. Nấu nồi: LUA nướng gừng và hành → LUC đập gừng → CHON gói gia vị (bẫy: tiêu sọ, lá nguyệt quế) → CHAM `min` hớt bọt → CHAM `targets` nêm muối, đường phèn, nước mắm.
- Mỗi bát: CHON → THAI bò mỏng 6 lát (vùng hẹp ±2%, w3) → THAI hành tây → LUA trụng bánh phở → BAY_DIA xếp bò → ROT chan nước dùng sôi tới vạch (w3) → BAY_DIA rắc hành, ngò.
- Ghi chú: tái, chín, nạm, không hành, ít bánh. Tổng par khoảng 32 giây.

**(8) Bò lúc lắc** — Chặng 5, Kệ Chính 8tr, cần Chảo gang dày, GĐ3.
- Giá 195.000đ, giá vốn 62.000đ.
- Các bước: CHON (bẫy: bò xay, hành tím, xì dầu đậm) → THAI bò hạt lựu (4 nhát dọc, 4 nhát ngang) → ROT ướp rồi KHUAY trộn → THAI ớt chuông và hành tây → CHAM `min` băm tỏi → LUA làm nóng chảo tới khói nhẹ → LAC lắc chảo (w3) → LUC + LAC flambé (kèm Mẹo an toàn lửa) → VE_DUONG tỉa hoa cà chua → BAY_DIA bày lên xà lách xoong (w3).
- Phụ bếp làm thay bước thái ớt, băm tỏi, tỉa hoa. Tổng par khoảng 55 giây.

---

## 7. Shop công thức và món giới hạn theo sự kiện

### 7.1 Năm nguồn công thức
1. **Có sẵn**: 2 món ở đầu mỗi chặng, hoặc được tặng khi lên chặng. Chặng 1: Bánh mì ốp la, Trà tắc.
2. **Shop "Chợ Công Thức"**:
   - **Kệ Chính** [MVP, M2 đã làm]: cố định theo chặng, trả bằng Tiền quán. Chặng 1 có **2 món**: Bánh tráng trộn (250.000đ, từ ngày 2) và Cà phê sữa đá (200.000đ, từ ngày 4). Món của chặng cao hơn hiện bóng mờ kèm dòng "Cần Quán cóc vỉa hè" (Gỏi cuốn, Bún thịt nướng, Chè ba màu).
   - Chợ Công Thức ở M2 có 3 thẻ: **Công thức**, **Nâng cấp** (5 nâng cấp, mục 11.4) và **Góc Muỗng Vàng** (3 màu dù xe: Dù đỏ cờ, Dù xanh lá mạ, Dù sọc kẹo; 30 Muỗng Vàng mỗi màu, chỉ thẩm mỹ, chạm để xem thử trên hình xe trước khi mua; đổi lại "Dù cũ của Dì Sáu" bất cứ lúc nào). Màu dù vốn xếp ở GĐ2, đã làm sớm để Muỗng Vàng có chỗ tiêu.
   - **Kệ Đặc biệt** [GĐ2]: 1–2 món, đổi mỗi 7 ngày thật, giá 150–500 Muỗng Vàng hoặc 3 lần giá Tiền quán. **Không món nào chỉ mua được bằng Muỗng Vàng.** Món đã lỡ chắc chắn quay lại trong vòng 4 tuần.
   - **Kệ Đặc sản vùng miền** [GĐ2]: 3 ô, đổi mỗi 3 ngày game, luôn có 1 món giảm 20%.
   - **Tủ Kỷ Niệm** [GĐ3]: bán lại món sự kiện đã qua, sau 90 ngày, giá 600 Muỗng Vàng hoặc 30 Mảnh công thức.
3. **Bí truyền qua chuỗi nhiệm vụ** [GĐ2]: "Sổ tay thất lạc của Dì Sáu" có 12 trang (4 trang từ cốt truyện, 4 từ sự kiện, 4 từ thành tựu nghề). Đủ 12 trang mở món bí truyền "Hủ tiếu gõ của Dì Sáu". Món bí truyền cũng tuân theo trần lãi +10% (mục 7.2).
4. **Sự kiện có thời hạn**: MVP nhận món qua chuỗi sự kiện; MVP đã có Tem của sự kiện (Tri ân 20/11: "Phấn Trắng") và Quầy đổi Tem lấy đồ trang trí, Muỗng Vàng. GĐ2 thêm đổi món thứ hai, món đặc biệt bằng Tem.
5. **Công thức hiếm** [M4]: 4 món biến tấu của món nền dùng nguyên liệu hiếm (Trà tắc mật ong rừng, Bánh mì trứng gà ta, Bánh tráng trộn Tây Ninh, Cà phê muối). Gom 3 mảnh công thức (gánh hàng quê theo giờ thật, khách lạ, Giỏ chợ, tình huống) rồi nấu thử đạt hạng Được là mở món; nấu thử không tốn hàng hiếm, thử lại không giới hạn. Món hiếm chỉ được gọi khi kho còn nguyên liệu hiếm (kho 6 phần mỗi loại, trần 6 phần + 3 mảnh mỗi ngày thật), không tính vào điều kiện "3 công thức" lên chặng, tuân theo trần lãi +10% (tối đa 550đ/giây nấu ở Chặng 1). Chi tiết: `docs/tham-khao/m4-thiet-ke.md` mục C, `docs/can-bang.md` mục 2.1b và 14.5.

### 7.2 Thẻ xem trước, nấu thử, quy tắc ngang giá trị
- **Thẻ xem trước** ghi: số bước, cơ chế mới (nếu có), độ khó 1–5 (biểu tượng dao), giá vốn, giá bán, lãi mỗi phần, **số ca hoàn vốn ước tính**, dụng cụ bắt buộc.
- **Nấu thử miễn phí 1 lần** trước khi mua [MVP, M2 đã làm]: không đếm giờ, có tay chỉ (ô cần lấy ở bước Chọn nhấp nháy ngay), không tốn tiền, không tính vào thạo món, Việc hôm nay hay ví. Đang nấu thử dở một món thì phải ra món đó trước mới nấu thử món khác; thoát giữa chừng vẫn giữ phiên để làm tiếp. Màn kết quả có nút "Mua món". Không nấu thử và không mua được khi đang trong ca.
- Mua xong thì món vào thực đơn ngay. Món mới được khách gọi nhiều gấp đôi trong 2 ca đầu. Không hoàn tiền.
- **Giới hạn ô thực đơn** [GĐ2]: Chặng 1–2 có 6 ô, sau đó 8, 10, 12. Thực đơn gọn thì bếp nhanh hơn.
- **Quy tắc món ngang giá trị**: lãi trên mỗi giây nấu (lãi mỗi phần / tổng par) của món mua bằng Muỗng Vàng, món sự kiện và món bí truyền **không vượt món mua bằng Tiền quán tốt nhất cùng chặng quá 10%**. Món đặc biệt hấp dẫn nhờ danh tiếng, hình trình bày đẹp và khách riêng, không nhờ lãi.
  - Chặng 1: Bánh mì ốp la và Cà phê sữa đá cùng khoảng 500đ/giây là món Tiền quán tốt nhất (trần 550đ/giây); Chè bưởi khoảng 370đ/giây, trong trần. Số liệu ở `docs/can-bang.md` mục 2.

### 7.3 Sự kiện MVP: "Tri ân 20/11" với món Chè bưởi [MVP, M2 đã làm]

*(đã chỉnh theo bản chơi được: chuỗi 5 bước thưởng Tem thay cho 3 bước; Tem "Phấn Trắng", việc sự kiện, điểm danh sự kiện và Quầy đổi làm sớm ngay ở MVP. Dữ liệu: `src/data/events.js`, id `tri_an_20_11`.)*

- **Thời gian**: mở lúc 04:00 ngày 12/11/2026, đóng lúc 04:00 ngày 22/11/2026 (ngày chơi cuối là 21/11, theo giờ Việt Nam). Thẻ "Sắp diễn ra" kèm đếm ngược hiện từ 04:00 ngày 09/11. Sau khi đóng có **3 ngày ân hạn** (tới 04:00 ngày 25/11) để đổi Tem nốt và nhận thưởng chuỗi còn chờ.
- **Tiền sự kiện "Phấn Trắng"** (gọi chung là Tem, chỉ hiện khi có sự kiện):
  - Mỗi món đạt Ngon trở lên +1 Tem; Chè bưởi +2 Tem thêm. Trần 30 Tem/ngày thật từ nguồn này.
  - 3 việc sự kiện mỗi ngày thật, mỗi việc 10 Tem: Phục vụ 4 khách · Nấu 3 món đạt Ngon trở lên · Được 2 khách chấm 5 sao (bật Hỗ trợ thao tác thì khách từ 4 sao cũng được đếm). Việc đã xong mà quên nhận tự cộng Tem khi sang ngày mới.
  - Điểm danh sự kiện 7 ô, mỗi ô 15 Tem (khóa khi giờ máy bị lùi).
- **Chuỗi sự kiện "Nồi chè tri ân"** (Cô Hạnh nhờ), 5 bước, tổng 150 Tem, bước cuối tặng **công thức Chè bưởi vĩnh viễn**, nhãn "Tri ân 20/11 · 2026":

| Bước | Việc | Thưởng | Mở từ ngày chơi thứ |
|---|---|---|---|
| 1 | Thư của cô giáo cũ: phục vụ 5 khách | 20 Tem | 1 |
| 2 | Chuẩn bị quà tri ân: nấu 3 món đạt Ngon trở lên | 25 Tem | 1 |
| 3 | Gói quà cẩn thận: thối đúng 3 lần | 30 Tem | 2 |
| 4 | Lời cảm ơn: được 3 khách chấm 5 sao | 35 Tem | 2 |
| 5 | Nồi chè tri ân: nấu 2 món Tuyệt hảo | 40 Tem + công thức Chè bưởi | 3 |

- "Ngày chơi" là ngày thật có mở ca trong mùa (cổng `gates [1, 1, 2, 2, 3]`). Bước chưa tới cổng thì tín hiệu không được đếm, thẻ ghi "Mở hàng một ca hôm nay để mở bước này" hoặc "Bước này mở vào ngày chơi kế tiếp trong mùa sự kiện". Vì vậy **chỉ cần chơi 3 ngày thật bất kỳ trong mùa**, và không ai xong chuỗi trong ngày chơi thứ 2.
- Bắt đầu muộn: nếu chơi đủ mọi ngày còn lại vẫn không tới cổng thì cổng mở luôn (gộp bước), để vẫn kịp nhận món trong ngày cuối.
- Bật Hỗ trợ thao tác: bước 4 đếm khách từ 4 sao, bước 5 đếm món Ngon trở lên.
- Thưởng chuỗi nhận ở màn sự kiện, cả trong 3 ngày ân hạn. Hết ân hạn mà chưa nhận: Tem của bước cộng vào Tem dư, công thức gửi qua Hộp thư.
- **Quầy đổi Tem** (trong mùa và 3 ngày ân hạn): Bảng đèn "Tri ân thầy cô" 150 Tem · Chậu hoa cúc tri ân 200 Tem · Dù hình hộp phấn trắng 250 Tem · 10 Muỗng Vàng giá 50 Tem (tối đa 5 lần, tức tối đa 50 Muỗng Vàng mỗi sự kiện).
- **Tem dư sau ân hạn** tự đổi ra Tiền quán với tỉ lệ thấp: 100 Tem = 0,2 TNC, **tối đa 1 TNC mỗi sự kiện**, gửi thư loại "Sự kiện" và tính vào trần tiền quà tháng của Hộp thư (còn ít chỗ thì đổi ít lại, hết chỗ thì thư chỉ báo) *(đã chỉnh theo bản chơi được: bản đầu 100 Tem = 1 TNC làm thưởng ngày tất toán lên khoảng 59%)*.
- **Trong mùa**: Chè bưởi (khi đã có) được gọi nhiều gấp đôi; mỗi phần Chè bưởi đạt Ngon trở lên +1 danh tiếng. **Giá bán không đổi.**
- **Hộp thư ngày 20/11**: 20 Muỗng Vàng + 0,5 TNC (đẩy từ 04:00 ngày 20/11, trong 7 ngày).
- **Sau sự kiện**: giữ món vĩnh viễn, bán quanh năm cùng giá (`state.eventRecipes`). Người đã lỡ sẽ có cơ hội ở đợt **"Món trở lại"** năm sau (GĐ2).
- **Thời điểm hết hạn** tính theo thời gian tin cậy (mục 13): sự kiện hết khi `max(maxSeen, giờ máy)` vượt mốc kết thúc.
- **Xem trước khi phát triển**: tham số `?devNow=2026-11-15` (hoặc `?devNow=2026-11-15T08:00`, giờ Việt Nam) chỉ có tác dụng khi chạy ở `localhost` hoặc `127.0.0.1`. Khi dùng giờ giả, game **lưu ở khóa riêng** (`bkn.save.dev`), lần đầu chép từ bản lưu thật; bản lưu thật không bao giờ bị ghi, và màn hình có dải "Giờ giả … · bản lưu riêng".
- **E2E đã có** (`tests/e2e/event-2011.e2e.mjs`, `review-m2.e2e.mjs`): sự kiện mở → nhận món qua chuỗi → hết hạn vẫn giữ món, khách vẫn gọi Chè bưởi; nhận thưởng trong ân hạn.

### 7.4 Khuôn mẫu sự kiện đầy đủ [GĐ2]
Toàn bộ khai báo bằng dữ liệu (`from`, `to`, `eventId` trong dữ liệu món). Engine sự kiện của M2 đã chạy theo khuôn này (thêm Giáng sinh, Tết chỉ cần thêm một mục `EVENTS` và món `source: 'event'`); những phần đã có ở MVP được ghi rõ ở mục 7.3. Chưa làm: nhân đôi Tem hai ngày cuối, đổi món bằng Tem, "Món trở lại".
- Thời lượng: sự kiện lớn 10–14 ngày thật, sự kiện nhỏ 5–7 ngày. Thẻ "Sắp diễn ra" trước 3 ngày.
- Mỗi sự kiện có **Tem riêng**, tên đổi theo mùa (Phấn Trắng, Chuông Bạc, Bao Lì Xì, Lồng Đèn).
- **Nguồn Tem**:
  - Mỗi món đạt Ngon trở lên trong khung sự kiện được +1 Tem; món lễ +2 Tem thêm. Trần 30 Tem/ngày.
  - 3 nhiệm vụ sự kiện mỗi ngày, mỗi nhiệm vụ 10 Tem.
  - Điểm danh sự kiện 7 ô, mỗi ô 15 Tem.
  - Chuỗi sự kiện 5–7 bước, tổng 150 Tem.
  - Hai ngày cuối nhân đôi Tem.
- **Phần thưởng**:
  - Món chính **miễn phí qua chuỗi sự kiện**, chỉ cần chơi 3 ngày bất kỳ trong mùa.
  - Món thứ hai: 400 Tem. Món đặc biệt: 700 Tem. Trang trí: 150–250 Tem.
  - 50 Tem đổi 10 Muỗng Vàng, tối đa 5 lần.
- **Cân bằng**:
  - Người chơi nhẹ (1 ca/ngày, chơi 8 trên 14 ngày) được khoảng 495 Tem, lấy được món chính và món thứ hai.
  - Người chơi tích cực (3–4 ca/ngày, chơi đủ 14 ngày) được khoảng 1.100–1.200 Tem, lấy được hết.
- **Sau sự kiện**:
  - Công thức **giữ vĩnh viễn**, có nhãn mùa (ví dụ "Tết 2027").
  - Món bán quanh năm, **cùng giá**. Trong mùa, món chỉ cho thêm Tem và danh tiếng.
  - Nguyên liệu đặc biệt chỉ bán trong mùa ±7 ngày (khi đã có kho ở GĐ2).
  - Tem dư có 3 ngày ân hạn, sau đó tự đổi 100 Tem = 0,2 TNC Tiền quán, tối đa 1 TNC mỗi sự kiện, tính vào trần quà tháng *(đã chỉnh theo bản chơi được)*.
  - Năm sau có đợt **"Món trở lại"** với giá giảm 30% Tem. Ai đã có món thì nhận biến thể mới hoặc nguyên liệu.
- **Chống FOMO**: không gacha, không hộp ngẫu nhiên cho công thức, không bán Tem bằng tiền thật, lỡ ngày không mất gì.
- **Món sự kiện tự co giãn theo chặng**. Ví dụ Tết: ở xe đẩy là "Bánh tét chiên", ở nhà hàng là "Set mâm cỗ Tết".

### 7.5 Lịch sự kiện năm đầu
Ngày âm lịch lấy từ **bảng tra sẵn cho 2026–2030** trong `src/data/events.js`, phải kiểm chéo với lịch vạn niên.

| Thời gian | Sự kiện | Món giới hạn | Quy mô | Có ở |
|---|---|---|---|---|
| 12–21/11/2026 | Tri ân 20/11 | **Chè bưởi** (mục 6.14) | Nhỏ, sự kiện đầu tiên để tập dượt | **MVP** (đã làm ở M2) |
| 18–27/12/2026 | Giáng sinh | Bánh mì bơ tỏi | Vừa | GĐ2 |
| Từ 23 tháng Chạp (29 hoặc 30/01/2027, **phải tra bảng**) đến mùng 7 Tết (12/02/2027); **mùng 1 Tết Đinh Mùi là 06/02/2027** | Tết | **Bánh chưng** (CHON lá dong, nếp, đậu xanh, ba chỉ, lạt, với bẫy lá chuối, gạo tẻ, đậu đen → CHA lau lá → KHUAY vo nếp → ROT ướp thịt → BAY_DIA xếp khuôn lá → gạo → đậu → thịt → đậu → gạo → VUOT_CHUOI gấp 4 phía → VE_DUONG buộc lạt → LUA luộc có châm nước sôi, chí mạng); Thịt kho hột vịt; Dưa hành | Lớn đầu tiên. Nội dung phải chốt trước giữa tháng 01/2027 | GĐ2 |
| 8/3, Giỗ Tổ, Đoan Ngọ, Vu Lan | Sự kiện nhỏ | Bánh giầy, cơm rượu nếp, tuần món chay | Nhỏ | GĐ2 |
| Khoảng 03–17/09/2027 (**Rằm tháng Tám là 15/09/2027**) | Trung thu | Bánh nướng (ép khuôn bằng LUC, vùng lực 60–75), bánh dẻo, trà sen | Lớn thứ hai | GĐ2 |

---

## 8. Hành trình 7 chặng

| Chặng | Bối cảnh | Điều kiện lên chặng này (phải đủ tất cả; đầu tư trả một lần) | Mở khóa chính: món / khách / cơ chế | Khách mỗi ca · TNC | Thời lượng mục tiêu (người chơi trung bình, 3–4 ca/ngày thật) |
|---|---|---|---|---|---|
| **1 Xe đẩy đầu hẻm** | Xe đẩy cũ thuê lại của Dì Sáu, dù che, ghế nhựa; biển xe mang tên người chơi đặt | Bắt đầu với 200.000đ Tiền quán (quỹ lẻ 200.000đ nằm riêng trong két) | Bánh mì ốp la, Trà tắc; Bánh tráng trộn, Cà phê sữa đá (Shop); Chè bưởi (sự kiện). Khách: học sinh, công nhân/shipper, cô chú lớn tuổi, dân văn phòng (từ ngày 4), khó tính (từ ngày 5). Luồng 4 khâu tự nhẩm, tiền mặt + QR tĩnh, 6 cơ chế bếp, Thớt sơ chế, dây 3 phiếu | 4–8 · tăng dần 20k → 100k | Ca 1–15 · ngày thật 1–4 (mô phỏng M2: người chơi trung bình đủ điều kiện ở ca 9; người chơi hoàn hảo ở ngày thật 2–3) |
| **2 Quán cóc vỉa hè** | 2 bàn con, 4 ghế nhựa, đèn dây | 150 danh tiếng; sao trung bình ≥3,8; 3 công thức; 2 món thạo cấp 2; xong chuỗi "Ngày đầu ra phố"; 500.000đ | Ăn tại chỗ, dọn bàn, đóng gói mang về. 6 khách quen có tên, kèm Sổ khách quen. Bếp 2 họng. Cơ chế BAY_DIA, VUOT_CHUOI, LUC (KHUAY đã có từ 0.5.0 với tên XOAY). Kho theo lô có hạn dùng, đi chợ mặc cả. Món: Gỏi cuốn, Bún thịt nướng, Cơm tấm, Chè ba màu | 8–10 · khoảng 160k | Ca 16–45 · ngày thật 4–12 |
| **3 Tiệm nhỏ mặt tiền** | Mặt bằng thuê đầu tiên | 500 danh tiếng; ≥4,0 sao; 6 công thức; 3 món cấp 3; chuỗi "Tìm mặt bằng" (chọn gần trường học / văn phòng / chợ); 2tr | 2 ca/ngày. **Máy POS**, in bếp, gọi số. Khuyến mãi, QR động, thẻ, tờ 1k/2k. Chốt ca đếm két. Thu ngân NPC và kèm cặp, phụ bếp. Sơ chế đầu ca, nấu mẻ. Đơn app giao hàng hư cấu (phí 20%) và đóng gói. Kiểm tra ATTP "soi bếp 20 giây". Đối thủ Lâm. Món: Phở bò tái, Hủ tiếu, Cà phê muối | 10–12 · khoảng 300k | Ca 46–100 · ngày thật 12–25 |
| **4 Quán ăn gia đình** | 8 bàn đánh số, gạch bông | 1.500 danh tiếng; ≥4,2 sao; 10 công thức; 1 món cấp 4; thu ngân NPC bậc 2; chuỗi "Có tên có tuổi" (tên, logo, hộ kinh doanh mô phỏng); 6tr | Khách nhóm 2–6 người, món chia cả bàn, ra món đồng bộ. Đặt bàn qua điện thoại. Ghi chú dị ứng. Thẻ thành viên. Trang trí 10 ô. Món: Cá kho tộ, Canh chua, Lẩu Thái | 12 lượt bàn · khoảng 600k | Ngày thật 25–40 |
| **5 Nhà hàng** | Bếp mở chia trạm | 3.500 danh tiếng; ≥4,4 sao; 14 công thức; 2 món cấp 4; chuỗi "Đạt chuẩn ATTP"; 20tr | **Trả sau** (chuỗi huấn luyện "Phục vụ bàn" 3 bước). Máy order cầm tay, màn hình bếp. Tạm tính; tách, gộp, chuyển bàn; thuế GTGT (mô phỏng); xuất hóa đơn cho doanh nghiệp. Set menu 3 món, kiểm món ở Pass, bếp phó, đơn tiệc 20–50 suất. Thẩm định viên ẩn danh. Món: Bò lúc lắc, Gà nướng muối ớt | 12 bàn · khoảng 1,4tr | Ngày thật 40–60 |
| **6 Nhà hàng sang trọng** | Gỗ tối màu, gốm men lam | 7.500 danh tiếng; ≥4,6 sao; 18 công thức (ít nhất 2 món bí truyền hoặc sự kiện); 1 món cấp 5; 3 lần thẩm định đạt "Xuất sắc"; 70tr | Thực đơn 5–7 món. Trình bày nhiều lớp (VE_DUONG, nhíp). LAC và flambé. Nêm theo hồ sơ khẩu vị. Phí phục vụ 5%. Đặt bàn có cọc. **Đũa Vàng** 1–3 chiếc. Chế độ Bếp trưởng duyệt đĩa | 8–10 · khoảng 3,5tr | Ngày thật 60–85 |
| **7 Chuỗi và nhượng quyền** | Bản đồ chi nhánh | 12.000 danh tiếng; ít nhất 1 Đũa Vàng; 2 món cấp 5; chi nhánh đầu tiên từ 5tr (xe đẩy) tới 400tr (nhà hàng) | Chi nhánh tự chạy theo mô hình đã đi qua. Chuẩn hóa công thức từ món cấp 5. Quản lý chi nhánh. "Ghé thăm" chi nhánh để xử lý sự cố bằng một ca chơi thật. Thu nhập khi vắng mặt tối đa 12 giờ. Sau đó mở **Tái khởi nghiệp vùng miền** | — | Từ ngày thật 85 |

**Nguyên tắc tiến trình**
1. Mỗi chặng thêm một cách chơi mới, không chỉ tăng con số.
2. Càng lên cao, khách ít hơn nhưng món tinh và đắt hơn. Số lần chạm mỗi ca phải được **đo thật** (ước tính Chặng 1 khoảng 300–450 lần mỗi ca 8 khách); nếu đo thấy mỏi tay thì bớt bước hoặc bớt khách, ghi kết quả vào `docs/can-bang.md`.
3. Tự động hóa chỉ lấy đi phần lặp. Luật **"Ra tay"**: nhân viên và máy móc có trần 88 điểm; món Tuyệt hảo và món tủ chỉ đến từ tay chủ quán.
4. Không game over, không xóa save, không tụt chặng.
5. **Nhịp răng cưa**: độ khó tăng dần trong chặng, vừa lên chặng thì dịu lại, kèm **3 ngày "Mừng khai trương"** (khách ×1,3, khách dễ tính hơn).
6. Thẻ **"Giấc mơ tiếp theo"** luôn hiện các thanh tiến độ và gợi ý cụ thể, ví dụ "Nấu thêm 3 lần Ngon món Trà tắc".
7. **Bản đồ chặng** hiện đủ 7 ô. Ô chưa mở hiện bóng mờ kèm một câu gợi mở.

**Khi đủ điều kiện lên Chặng 2 ở MVP** [M2 đã làm]: lần đầu đủ điều kiện, màn Chuẩn bị mời xem màn "Quán cóc vỉa hè – sắp khai trương" (điều kiện kèm thanh tiến độ và gợi ý, bản đồ 7 chặng, nút "Sắp có ở bản sau" bị khóa); `state.chang` giữ 1 và người chơi vẫn chơi tiếp Chặng 1 bình thường với các **mục tiêu sau khi đủ điều kiện**:
- Sưu tập huy hiệu "Không tì vết" cho mọi món đang bán, ít nhất 3 món (danh sách đã hiện ở màn Lên chặng; Sổ công thức ở M3).
- Đưa mọi món lên thạo cấp 3.
- Kỷ lục ca: lãi cao nhất, nhiều khách 5 sao nhất, chuỗi "Quầy chuẩn" dài nhất (không ghi khi bật Hỗ trợ tính tiền).
- Đồng hồ đếm ngược tới sự kiện Tri ân 20/11: nằm ở thẻ sự kiện "Sắp diễn ra" của màn Chuẩn bị (từ 09/11).

---

## 9. Năm hệ thống người dùng yêu cầu

### 9.1 Nhiệm vụ hằng ngày "Việc hôm nay" [MVP, M2 đã làm]
- Reset lúc 04:00 giờ Việt Nam. Mỗi ngày bốc **3 nhiệm vụ**: 1 Quầy, 1 Bếp, 1 Chất lượng (Kinh doanh). Việc bốc dùng seed `hash(seed của save + ngày thật)` nên tải lại trang không đổi được nhiệm vụ.
- Chỉ bốc nhiệm vụ đã đủ điều kiện (chưa có QR thì không giao nhiệm vụ QR). Không lặp nhiệm vụ của hôm qua. Chỉ tiêu co giãn theo số khách dự kiến của 2 ca (N khách/ca × 2 × hệ số, kẹp trong khoảng min–max) để xong trong khoảng 2 ca.
- **Bể nhiệm vụ MVP (12)** *(chỉ tiêu theo `src/data/quests.js`)*:

| Nhóm | Nhiệm vụ (chỉ tiêu) |
|---|---|
| Quầy | Thối đúng 5 lần liên tiếp (thối sai là đứt chuỗi) · Ghi phiếu đúng ngay lần đọc lại đầu cho n khách (0,5 × khách dự kiến, 3–6) · Thối gọn (ít tờ nhất) n lần (0,375 ×, 3–6) · Xác nhận đúng 2 thanh toán QR (từ ngày 4) |
| Bếp | n lần Hoàn hảo ở bước Thái (0,625 ×, 5–8) · n món không có lỗi nguyên liệu (0,375 ×, 3–6) · 3 lần Hoàn hảo ở bước Canh lửa · Nấu 2 phần món vừa mua (khi có món mua trong 3 ngày game gần nhất; món hợp lệ chốt lúc bốc việc) |
| Chất lượng | Nấu n món Tuyệt hảo (0,375 ×, 3–6) · Phục vụ n khách (1 ×, 8–14) · Không để khách nào bỏ về trong 1 ca (từ ngày 4; khách dùng ảnh chuyển khoản giả bị bắt không tính là bỏ về) · Doanh thu trong ngày đạt mức (12.000đ × khách dự kiến, 80.000–200.000đ, làm tròn bội 5.000đ) |

- **Thưởng**:
  - Mỗi nhiệm vụ: 0,2 TNC của ngày game hiện tại (làm tròn lên bội 1.000đ) và +5 danh tiếng.
  - Đủ 3 nhiệm vụ thì mở **Rương ngày**: 0,2 TNC và 5 Muỗng Vàng. Rương ngày bị khóa khi giờ máy bị lùi.
  - Theo bảng TNC của code, mỗi phần 0,2 TNC là 4.000đ (ngày game 1–2), 7.000đ (3–4), 13.000đ (5–6), 17.000đ (7–8), 20.000đ (từ 9); cả 3 việc và Rương ngày là 16.000–80.000đ mỗi ngày thật (`docs/can-bang.md` mục 10).
- Tiến độ tự đếm qua bus sự kiện, có thông báo ngắn trong ca (ví dụ "Việc hôm nay: 4/5 · Thối đúng 5 lần liên tiếp"). Người chơi bấm "Nhận" để lấy thưởng (không nhận được khi đang trong ca). Nhiệm vụ đã xong mà chưa nhận, và Rương ngày chưa mở, trước giờ reset thì tự vào Hộp thư, giữ 7 ngày. Chơi một ca vắt qua mốc 04:00 thì tiến độ tự sang bộ việc của ngày mới.
- Khi bật Hỗ trợ tính tiền, nhiệm vụ Quầy không đếm; khi bật Hỗ trợ thao tác, các việc Hoàn hảo ở bước Thái/Canh lửa và Tuyệt hảo không đếm. Lúc bốc hoặc đổi việc, game ưu tiên việc còn đếm được với công tắc đang bật.
- **Đổi nhiệm vụ**: 1 lần miễn phí mỗi ngày, từ lần thứ hai tốn 5 Muỗng Vàng.
- Không bao giờ có nhiệm vụ "tiêu X tiền".

### 9.2 Điểm danh nhận quà hằng ngày [MVP, M2 đã làm]
- Bảng hiện ở lần mở game đầu tiên của mỗi ngày thật (kể cả ngay sau khi đặt tên xe ở lần chơi đầu), nhận bằng 1 chạm, không cần mở ca. Đang ở màn Chuẩn bị mà qua mốc 04:00 thì bảng tự hiện (kiểm tra mỗi 30 giây).
- **7 ô tích lũy**: lỡ ngày không bị reset, lần sau nhận tiếp ô kế tiếp.
- **Vòng đầu "Tuần Khai Trương"** (chỉ 1 lần) **tặng hiện vật thay cho tiền**, để thưởng không lấn át lãi bán hàng của những ngày đầu:

| Ô | Quà | Ghi chú |
|---|---|---|
| 1 | 10 Muỗng Vàng + Viền biển xe "Khai Trương" | Thẩm mỹ |
| 2 | Phiếu Chợ Sớm | Giá vốn −20% trong 1 ca, dùng ở màn Chuẩn bị |
| 3 | 10 Muỗng Vàng | |
| 4 | Bạt che mưa | Vĩnh viễn: ngày mưa tự căng bạt, không tốn 20.000đ. Đã có thì quy đổi 20.000đ |
| 5 | Phiếu Chợ Sớm ×2 | Đã soát lại theo bảng này ở vòng soát lỗi M2 (bản code trước tặng Dao thép tốt) |
| 6 | 15 Muỗng Vàng | |
| 7 | Rương Khai Trương: 20 Muỗng Vàng + 100.000đ + danh hiệu "Chủ xe mới toanh" | Thường rơi vào lúc đã sang giai đoạn Chặng 2 |

- **Vòng thường**: Ô1 0,3 TNC · Ô2 Phiếu Chợ Sớm · Ô3 10 Muỗng Vàng · Ô4 0,4 TNC · Ô5 Phiếu Chợ Sớm ×2 · Ô6 15 Muỗng Vàng · Ô7 Rương điểm danh (30 Muỗng Vàng + 0,5 TNC). Mỗi vòng tổng khoảng 1,2 TNC tiền, 2 lượt giảm giá vốn và 55 Muỗng Vàng.
- **[GĐ2]**:
  - Lịch tháng 28 ô chạy song song, mốc 7/14/21/28 có quà lớn, ô 28 là trang trí độc quyền.
  - Bù điểm danh tối đa 3 ô mỗi tháng, bằng 1 Vé Bù, 15 Muỗng Vàng, hoặc một "Ca bù" miễn phí (phục vụ 10 khách).
- Khi đồng hồ máy bị lùi hơn 10 phút so với mốc lớn nhất từng thấy thì quà theo ngày bị khóa (điểm danh thường và sự kiện, Rương ngày, nhận quà lễ trong Hộp thư; không đẩy thêm quà lễ và quà đời thường mới), màn Chuẩn bị hiện một dòng nhắc nhẹ; game vẫn chơi bình thường. *(đã chỉnh theo bản chơi được: làm sớm ở M2 thay vì M3; mục 13.)*

### 9.3 Sự kiện ngẫu nhiên
Có ba lớp (a–c), M4 thêm lớp (d) hàng hiếm trong ngày. Chúng có trần thiệt hại và có bảo hiểm tần suất.

**Nguyên tắc phạt công bằng** (M4, thay câu cũ "không bao giờ phạt ngẫu nhiên"; quyết định 31). Được phép có sự kiện làm mất tiền, nhưng mỗi sự kiện phải đạt đủ:
1. **Có nguyên nhân người chơi phòng được, hoặc được báo trước** (sự kiện ngày báo ở Tổng kết hôm trước và màn Chuẩn bị; Dì Sáu nhắc trước khi hàng chờ chạm mốc phạt; kiểm tra vệ sinh lần đầu chỉ nhắc nhở).
2. **Luôn có lựa chọn an toàn**, ghi rõ cái giá (thường là miễn phí hoặc một khoản nhỏ biết trước).
3. **Có trần**: mỗi sự kiện ≤ min(10% doanh thu dự kiến của ca, 0,5 TNC); tổng phạt mỗi ngày thật ≤ 1 TNC, vượt thì "Dì Sáu đỡ giùm con lần này".
4. **Tốt chiếm đa số** (sự kiện ngày: tốt 58% theo trọng số; tình huống mức Vừa: khoảng 45% tốt, 43% chọn, 12% xấu), không 2 sự kiện xấu liền nhau (xét chung sự kiện ngày và tình huống trong ca theo thứ tự thời gian), vừa lỗ nặng thì lần sau nhẹ nhàng. Sự kiện ngày đã báo trước được chốt: đổi mức "Tần suất sự kiện" chỉ áp cho ngày chưa báo.
5. **Mức "Tần suất sự kiện" Ít không có khoản phạt nào.**
6. **Gắn với nghiệp vụ và dạy một bài học** (thẻ Mẹo nghề: soi tiền, thấy tiền về mới giao món, giữ lối đi); không hối lộ, không cờ bạc hay bốc thăm, không hướng dẫn làm tiền giả (chỉ nêu cách nhận biết).

Tiền sự kiện ghi riêng trong sổ lãi lỗ ca ("Tiền từ sự kiện", "Phạt, chi sự kiện").

**(a) Sự kiện ngày** [MVP, M2 đã làm]: báo trước ở màn tổng kết ca hôm trước ("Ngày mai: …"), hiện ở màn Chuẩn bị kèm lời Dì Sáu và dòng Dự báo khách. Từ ngày game 3, mỗi ngày game có 30% xảy ra (bốc theo seed của save + ngày game, dữ liệu ở `src/data/day-events.js`). *(M4, tần suất "dày": 65% và 1 ngày không có sự kiện thì ngày kế chắc chắn có, tỉ lệ thực khoảng 74%; không trùng loại hôm trước; bốc tuần tự nên "Ngày mai" luôn đúng; mức Ít chỉ sự kiện loại tốt.)*

| Sự kiện | Trọng số (M4) | Tác động | Có ở |
|---|---|---|---|
| Trời mưa | 13 | Khách ×0,8 (làm tròn, sàn 3), kiên nhẫn ×1,2. Có lựa chọn "Căng bạt" 20.000đ (trừ lúc mở ca) để khách còn ×0,95 (miễn phí và tự căng nếu có Bạt che mưa) | MVP |
| Nắng nóng | 13 | Trà tắc và Cà phê sữa đá được gọi ×2; dòng chưa có ghi chú có 35% được thêm "Ít đường" / "Ít ngọt"; +1 khách (trong trần 8) | MVP |
| Ngày lãnh lương | 10 | (M4) Khách hay gọi thêm món (số món mỗi đơn [60, 32, 8] thay [70, 25, 5]), không nhân tip *(trước M4: tip ×1,5; đã chỉnh theo bản chơi được: làm sớm ở M2)* | MVP |
| Chợ phiên | 10 | Khách ×1,3, trần 10 khách (`BALANCE.eventCustomerCap`); lịch khách tự giãn nên ρ vẫn ≤ 0,9, ca dài hơn một chút *(làm sớm ở M2)*; (M4) +1 lượt Giỏ chợ | MVP |
| Hội thi "Xe đẩy sạch, ngon" của phường (tốt) | 9 | Sao trung bình ca ≥ 4,5: +20.000đ +5 danh tiếng; ≥ 4: +10.000đ +2 | M4 |
| Văn phòng đầu hẻm đặt 3 ly trà tắc (tốt) | 9 | Nhận đơn (miễn phí): thêm 1 khách lấy 3 ly giữa ca; giao đạt từ 4 sao +5.000đ "đúng hẹn" | M4 |
| Đại lý trà tài trợ bảng hiệu (tốt) | 7 | Nhận tài trợ (miễn phí): bán ≥ 3 ly Trà tắc +15.000đ, ít hơn +5.000đ | M4 |
| Tắc lên giá (xấu nhẹ) | 6 | Giá tắc ×2 (Trà tắc +1.200đ giá vốn mỗi ly, có trần); Phiếu Chợ Sớm giảm cả phần tăng | M4 |
| Tiền điện nước tăng (xấu nhẹ) | 5 | Chi phí cố định ca 25.000đ (báo trước) | M4 |
| Cúp điện theo lịch (chọn) | 6 | Khách ×0,85, món có đá được gọi ×0,5, Loa báo tiền tắt. Mua đá cây 10.000đ: chỉ còn Loa tắt | M4 |
| Trật tự đô thị nhắc giữ vỉa hè (xấu, phòng được) | 6 | Hàng chờ chạm 3 người phạt 20.000đ 1 lần (Dì Sáu nhắc trước ở 2 người). Thu gọn chỗ đứng (miễn phí, an toàn): tối đa 2 người chờ | M4 |
| Đoàn kiểm tra vệ sinh an toàn thực phẩm (chọn) | 6 | Không lỗi bếp: +3 danh tiếng; lỗi lần đầu chỉ nhắc nhở, tái phạm trong 14 ngày game phạt 20.000đ. Chuẩn bị đón đoàn 10.000đ: chắc chắn đạt, +5 danh tiếng | M4 |
| Chợ giảm giá / khan hàng / trận bóng đội tuyển / rằm và mùng 1 (30% khách ăn chay) / khách đoàn du lịch / người review ẩm thực | — | Theo từng sự kiện | GĐ2 |

Kỳ vọng chung xấp xỉ 0, hơi dương khi đã có Bạt che mưa. Phiếu Chợ Sớm (giá vốn ×0,8 trong 1 ca) cũng chọn dùng ở màn Chuẩn bị, trừ phiếu lúc mở ca. *(M4: 12 sự kiện, tốt 58% theo trọng số; sự kiện xấu từ ngày 5, không 2 ngày xấu liền; mức Ít chỉ sự kiện tốt; tiền sự kiện có trần mỗi sự kiện và mỗi ngày thật; người chơi luôn chọn cách an toàn được trung bình +2,4k tiền sự kiện mỗi ca, không bị phạt — `docs/can-bang.md` mục 14.1, 14.4.)*

**(b) Tình huống trong ca** [MVP, M3 đã làm]: từ ngày game 3, mỗi ca có 35% (mức Vừa) ra tối đa 1 tình huống *(đã chỉnh theo bản chơi được: giới hạn tính theo ca, không thêm giới hạn 1 lần mỗi ngày thật)*. *(M4, tần suất "dày": tối đa 2 tình huống mỗi ca, cách nhau ít nhất 2 khách; mức Vừa lần 1 55%, lần 2 30% khi ca từ 6 khách, bảo hiểm sau 2 ca liền không có — thực khoảng 60% ca có tình huống; Nhiều 75%/45%, bảo hiểm sau 1 ca — khoảng 80%; Ít 30%, tối đa 1, chỉ loại tốt, bảo hiểm sau 3 ca — khoảng 40%.)* Tình huống chỉ bật khi đang ở tab Quầy, giữa hai khách, **không chen vào mini-game nấu**. Kiên nhẫn tạm dừng khi hộp thoại mở. Mỗi lựa chọn ghi rõ cái giá và luôn có 1 lựa chọn an toàn. Thiệt hại tối đa của một tình huống là mức nhỏ hơn giữa 10% doanh thu dự kiến của ca và 0,5 TNC (làm tròn xuống bội 500đ); tình huống nào có lựa chọn lỗ quá trần thì không ra ở ca đó. Nếu 3 ca liền không có tình huống thì ca kế chắc chắn có. Không lặp lại 5 tình huống gần nhất. Tình huống bốc theo seed của save + ngày game nên tải lại không đổi.

MVP có 3 tình huống *(đã chỉnh theo bản chơi được: 2 tình huống sau làm sớm từ GĐ2)*:
- **Khách mở hàng bằng tờ 500k** (tích cực, trước khách đầu tiên của ca): thối hết tiền lẻ (nếu két đủ; két đầu ca 200.000đ nên thường bị khóa kèm lý do, dạy thẻ "Đủ tiền lẻ đầu ca") / mời chuyển QR (khi đã mở QR) / tặng ly trà tắc "mở hàng" (an toàn: −3.000đ vốn, ca sau +1 khách trong trần 8).
- **Khách quen xin ghi nợ 20.000đ** (2 ly trà tắc mang về): cho nợ (−giá vốn, +2 danh tiếng, 70% trả trong 3 ca; tiền trả vào lãi của ca đó) / từ chối khéo (an toàn) / tặng luôn (−giá vốn, +5 danh tiếng).
- **Khách đổi ý sau khi đã thanh toán** (phiếu mới kẹp, chưa nấu): đổi món, thu thêm hoặc hoàn phần chênh, sửa phiếu bếp và phiếu thu (an toàn, đúng quy trình, hiện Mẹo nghề "Thu tiền rồi mới gửi bếp") / từ chối lịch sự (50% khách −1 sao khi nhận món; không tính là lỗi quầy/bếp).

Kết quả tình huống ghi ở màn Tổng kết ca (và sổ nợ ở màn Chuẩn bị).

**M4 thêm 8 tình huống chạy theo dữ liệu** (không viết code riêng cho từng tình huống; mỗi lựa chọn khai báo kết quả có xác suất, bốc 1 lần lúc mở nên tải lại không đổi): Tờ 20.000đ nghi giả (chỉ nêu cách nhận biết), Người giao hàng nói "khách chuyển rồi" (có Loa báo tiền thì lựa chọn an toàn "xanh"), Bình gas mini hết, Khách bỏ quên ví, Cô Hai ve chai, Đoàn khách hỏi đường, Khách quen từ quê gửi quà (hàng hiếm), Cô bán dạo mời hàng hiếm (món đã biết trước, không phải hộp ngẫu nhiên). Mỗi tình huống có ít nhất 1 lựa chọn an toàn, thiệt hại và tiền thưởng tối đa phải nằm trong trần của ca; bảng đủ ở `docs/can-bang.md` mục 14.2.

GĐ2 thêm:
- Cúp điện giữa ca (bán ngoại tuyến, ghi order giấy), chảo dầu bốc lửa (chọn "dội nước" là sai và được giải thích), hàng rau hỏng, tiệc trong hẻm đặt cọc. *(Hết gas, đoàn kiểm tra ATTP, khách quên ví, cúp điện theo lịch đã làm ở M4.)*

**(c) Đơn bất chợt ngoài ca** [GĐ2]: từ ngày thật thứ 3, mỗi ngày có 30% ra một đơn ở màn Chuẩn bị, ví dụ "Văn phòng đặt 6 phần". Hạn tới 04:00 hôm sau. Trả 1,5 lần giá và 10 Muỗng Vàng. Bỏ qua thì chỉ mất cơ hội.

Trong Cài đặt (M3) có mức **Nhiều / Vừa / Ít** thay cho nút tắt hẳn. *(M4: đổi tên "Tần suất sự kiện", áp cho cả sự kiện ngày; mức "Ít" 30%/ca, tối đa 1, chỉ gồm sự kiện và tình huống loại tốt, không có khoản phạt. Trước M4: 15%/ca.)*

**(d) Hàng hiếm trong ngày** [M4]: 3 gánh hàng quê theo giờ thật Việt Nam (Chợ sớm 05:00–09:00, Xe ba gác trưa 11:00–13:30, Gánh đặc sản tối 17:30–21:00; mỗi phiên 1 lượt mỗi ngày thật, chỉ ở màn Chuẩn bị, khóa khi lùi giờ, lỡ không bị phạt) với mini-game "Lựa hàng" (lấy đúng hàng hiếm, tránh hàng thường dễ nhầm; luôn được ít nhất 1 phần); khách lạ ở ca đầu mỗi ngày thật từ ngày game 3 (quà theo số sao); Giỏ chợ rút cuối ca (chuỗi "Quầy chuẩn" 5 khách, Chợ phiên) với tỉ lệ và thanh may mắn công khai. Chi tiết mục 7.1 (nguồn 5) và `docs/can-bang.md` mục 14.5.

### 9.4 Chuỗi nhiệm vụ [MVP, M2 đã làm]
- **Chuỗi chính "Hành trình khởi nghiệp"**: mỗi chặng có một chuỗi 5–7 bước, cũng là cổng lên chặng. Luôn có đúng 1 bước đang làm, ghim ở màn Chuẩn bị, có gợi ý "làm ở đâu". Không hạn giờ, không thể thất bại.
- **C1 "Ngày đầu ra phố"** (Dì Sáu, MVP):

| Bước | Việc | Thưởng |
|---|---|---|
| 1 | Phục vụ khách đầu tiên | 5 Muỗng Vàng |
| 2 | Thối đúng 3 lần | 5.000đ |
| 3 | Ghi phiếu đúng ngay lần đọc lại đầu cho 3 khách | 5.000đ |
| 4 | Đạt 5 lần Hoàn hảo ở bước bếp | 10.000đ *(trước M4: 15.000đ)* |
| 5 | Mua công thức đầu tiên | 15.000đ *(trước M4: 30.000đ)* |
| 6 | Nấu 3 món Tuyệt hảo (bật Hỗ trợ thao tác: món Ngon trở lên cũng được đếm) | 10.000đ + 5 Muỗng Vàng *(trước M4: 30.000đ)* |
| 7 | Đạt 150 danh tiếng và sao trung bình ≥3,8 (cùng ngưỡng với điều kiện lên Chặng 2) | Hoàn thành chuỗi: danh hiệu "Chủ xe đầu hẻm", 20 Muỗng Vàng, mở thẻ "Quán cóc vỉa hè – sắp khai trương". *Trang 1 Sổ tay của Dì Sáu chưa có ở bản chơi được, dời sang GĐ2 cùng chuỗi "Sổ tay thất lạc".* |

  Mỗi bước kèm 1 thẻ Mẹo nghề liên quan, mở khi nhận thưởng bước *(đã làm ở M2)*. Tổng tiền cả chuỗi 45.000đ *(M4, cân bằng: trước là 85.000đ; luật tip mới làm lãi những ngày đầu của người chơi giỏi giảm khoảng 40%, mà người chơi giỏi xong bước 2–6 ngay ngày thật 1–2, nên tỉ lệ thưởng vượt trần 35% ở 44/800 ngày mô phỏng; sau khi giảm cao nhất 34,1% — `docs/can-bang.md` mục 10, 16)*. Thưởng chuỗi nhận ở màn Chuẩn bị (nút gộp khi có nhiều bước chờ), không nhận được khi đang trong ca.
- **"Làm quen QR"** (Anh Khoa, MVP, từ ngày 4):
  1. Nhận đúng 3 thanh toán QR → 5 Muỗng Vàng.
  2. Phát hiện 1 ảnh chuyển khoản giả: mỗi ca sau khi tới bước này, một khách (không phải khách đầu ca) chắc chắn trả bằng ảnh giả, kể cả trước ngày 7, cho tới khi bắt được. **Nếu Loa báo tiền đã chặn ảnh giả thì cũng tính là xong bước này**, để chuỗi không bao giờ kẹt → 5 Muỗng Vàng.
  3. Mua Loa báo tiền → thẻ Mẹo nghề "Chuyển khoản phải về đúng số".
- **Chuỗi sự kiện "Nồi chè tri ân"** (Cô Hạnh, sự kiện Tri ân 20/11): mục 7.3.
- Trên thẻ chuỗi, tên người giao việc ghép với động từ: "Dì Sáu dặn", "Anh Khoa dặn", "Cô Hạnh nhờ"; thông báo trong ca dạng "Dì Sáu dặn · 2/3 · …".
- Các chặng sau: "Dựng quán cóc", "Tìm mặt bằng" và "Làm quen máy POS" (bấm đúng 5 order, áp đúng 3 combo, chốt ca lệch 0đ), "Có tên có tuổi", "Đạt chuẩn ATTP" và "Phục vụ bàn", "Đón thẩm định viên", "Mở chi nhánh đầu tiên".
- **Chuỗi phụ** [GĐ2, tối đa 2 chuỗi cùng lúc]:
  - "Sổ tay thất lạc của Dì Sáu" (12 trang).
  - "Cô Út sạp rau" (mở mặc cả, giá rau −5%).
  - "Anh shipper Tài" (mở đơn giao hàng).
  - "Phúc – cậu phụ bếp vụng về" (truyền nghề: làm mẫu 3 món Tuyệt hảo để Phúc làm thay 1 bước).
  - "Lâm Tốc Độ" (đối thủ, 3 hồi: phá giá → thi ẩm thực phố → bị kiểm tra; người chơi chọn giúp đỡ hoặc thâu tóm).
  - Chuyện riêng của khách quen khi thiện cảm đạt 60.
- **Luật đếm**: bước dạng "làm N lần" chỉ đếm từ lúc bước hiện ra. Bước dạng "đạt mức" kiểm tra trạng thái hiện tại.

### 9.5 Quà hệ thống và Hộp thư [MVP, M2 đã làm]
- Hộp thư chạy cục bộ trong MVP. Mỗi thư gồm tiêu đề, lời nhắn và tệp quà. Hạn nhận 30 ngày (quà lễ 14 ngày, việc quên nhận 7 ngày). Tối đa 100 thư; khi đầy thì bỏ thư cũ nhất đã nhận. Có nút "Nhận tất cả" và chấm đỏ báo thư mới; thư mới lúc vào màn Chuẩn bị được báo bằng thông báo nổi (sau khi bảng điểm danh đóng). Thư có quà không nhận được khi đang trong ca.
- **Các loại quà**:

| Loại | Quà | Có ở |
|---|---|---|
| Chào mừng | 10 Muỗng Vàng + 1 Phiếu Chợ Sớm (không tặng tiền) | MVP |
| Phiên bản mới (thư "Có gì mới: …") | Chỉ gửi cho save cũ, save mới không nhận. `phien_ban_0_2_0`: 10 Muỗng Vàng (save từ bản M1). `phien_ban_0_4_0` (M4): giải thích luật tip "hóa đơn từ 20.000đ mà khách chấm 5 sao thì khách bỏ hũ tip 5.000đ", giới thiệu sự kiện mới, 3 gánh hàng quê và khách lạ; quà làm quen 1 mảnh Trà tắc mật ong rừng + 1 phần Mật ong rừng U Minh (save từ bản 0.1–0.3). `phien_ban_0_5_0` (M5): "Có gì mới: bếp mới và 5 thao tác mới" — giới thiệu hình mới, con dấu từng bước, màn ra món, 5 thao tác, thẻ bàn tay mẫu, chế độ tập trung ở màn thấp; **không kèm quà** (quyết định Q4; save có `seenVersion` từ 0.4.x trở xuống nhận) | MVP, M4, M5 |
| Đền bù lỗi | Theo id, không nhận trùng | MVP |
| Quà lễ (đẩy từ 04:00 ngày lễ, trong 7 ngày) | 20/10: 20 Muỗng Vàng; 20/11: 20 Muỗng Vàng + 0,5 TNC; Tết Đinh Mùi (06/02/2027): 88 Muỗng Vàng + lì xì 1 TNC | MVP (cả 3 quà đã có trong dữ liệu M2) |
| Quà đời thường | Từ ngày thật thứ 3, mỗi ngày 10% nhận 0,3–0,6 TNC (khách quen lì xì, trả ví rơi, bán ve chai); cần ít nhất 5 đánh giá và sao trung bình ≥ 3,8; tối đa 2 thư mỗi tháng | MVP |
| Việc chưa nhận; Rương ngày chưa mở | Thư ghi đúng ngày ("hôm qua" hoặc "ngày 01/10"), giữ 7 ngày | MVP |
| Review muộn | Khách bị thối thiếu mà không phát hiện: thư review 2 sao vào ngày thật hôm sau (không có quà) | MVP |
| Sự kiện | Tem dư đổi ra Tiền quán sau ân hạn (mục 7.3); thưởng chuỗi sự kiện chưa nhận | MVP |
| Quà mốc | Khách thứ 100/1.000, lên chặng mới, "sinh nhật quán" ngày thật 30/100/365; "Quán được bình chọn" cần từ 20 đánh giá và sao trung bình ≥4,5 | GĐ2 |

- **Cấu hình** (`src/data/mail.js`): mỗi quà có id riêng, ngày đẩy và phần thưởng. Client đẩy mỗi quà vào hộp thư đúng 1 lần theo id (nhớ 1.000 id). Trần: ngoài quà đền bù, tối đa 2 quà lễ/mốc mỗi tháng, quà đời thường tối đa 2 mỗi tháng, và tổng tiền quà lễ + mốc + đời thường + Tem dư sự kiện không quá 3 TNC mỗi tháng.
- GĐ2 tải `gifts.json` từ host tĩnh (có bản cache khi mất mạng). GĐ3 dùng máy chủ ký quà.

---

## 10. Các đề xuất thêm

Mỗi đề xuất ghi kèm mức ưu tiên [MVP], [GĐ2] hoặc [GĐ3]; với [MVP] ghi thêm mốc M1/M2/M3.

### A. Quầy và vận hành
- **[MVP, M1] Đọc lại đơn là bước bắt buộc**: khách bắt mỗi lỗi với xác suất 80%, lỗi bị bắt chỉ tốn kiên nhẫn, không tốn sao. Người chơi thấm bài học "sửa ở quầy rẻ hơn sửa ở bếp" mà không cần ai giảng.
- **[MVP, M1] Phiếu thu tự sinh** ở khâu Tính tiền, dùng để đối soát cuối ca, giống máy bán hàng thật.
- **[MVP, M2] Chuyển khoản giả và Loa báo tiền**: dạy "ảnh chụp màn hình không phải là tiền" bằng một lần mất tiền trong game.
- **[GĐ2] Tình huống order thường gặp**: món chưa bán hoặc đã hết, khách hỏi giá, khách đổi món trước khi chốt (mục 3.5).
- **[GĐ2] Gợi ý bán thêm**: mời đúng cặp món (bánh mì + trà tắc) thì 30–45% khách nhận; mời lạc đề 5–8% và khách giảm kiên nhẫn. Không mời khách đang vội.
- **[GĐ2] Chốt ca đếm két, kèm nhật ký lệch từng phiếu**: lỗi trong ca có thêm vòng phản hồi cuối ngày.
- **[GĐ2] Voucher như một câu đố 4 điều kiện**: áp sai là thất thoát, từ chối voucher hợp lệ thì khách giận.
- **[GĐ2] Thu ngân NPC và "kèm cặp"**: người chơi tự đứng quầy 5 khách không lỗi để nhân viên lên bậc (miễn phí), hoặc trả 150.000đ cho mỗi khóa học. Lỗi của nhân viên hiện trên phiếu chấm.
- **[GĐ3] Sơ đồ bàn, tạm tính, tách/gộp/chuyển bàn, xuất hóa đơn cho doanh nghiệp** (nhập mã số thuế 10 số, đọc lại cho khách): toàn là nghiệp vụ thật, làm bằng kéo thả rất hợp màn hình cảm ứng.

### B. Bếp
- **[MVP, M1] Thớt sơ chế** (mục 6.3): biến "sơ chế đúng và đủ" thành lựa chọn của người chơi.
- **[GĐ2] Sơ chế đầu ca (mise en place)**: chơi mini-game một lần cho cả mẻ 5/10/20 phần. Điểm được lưu vào hộp đồ sơ chế. Hộp hết hạn cuối ca, kèm Mẹo FIFO và dán nhãn.
- **[GĐ2] Nấu theo mẻ**: gom 2–3 phiếu cùng món. Thời lượng mỗi bước × (1 + 0,4 × (n − 1)). Điểm dùng chung cho cả mẻ, nên rủi ro cao, thưởng cao.
- **[GĐ2] Nút Nếm trước khi ra món**: tốn 1,5 giây để xem 3 thanh vị mặn, ngọt, chua; nêm lại tối đa 85 điểm.
- **[GĐ2] Bếp 2 họng chạy nền**: nồi và chảo tự chạy khi người chơi rời bếp. Mở sau khi người chơi đã quen tay.
- **[GĐ2] Hũ ủ và nồi ninh theo giờ thật**: đồ chua 12 giờ, cơm rượu 36 giờ, dưa cải 48 giờ, nước dùng 6 giờ. Mở hũ đúng cửa sổ 24 giờ thì món dùng nó +10 điểm. Tạo lý do quay lại rất Việt.
- **[GĐ2] Truyền nghề**: nhân viên chỉ nấu được món chủ quán đã làm mẫu đạt Ngon 3 lần và đã thạo cấp 2. Chất lượng nhân viên = 70% điểm mẫu tốt nhất của chủ + kỹ năng nhân viên, trần 88.
- **[GĐ2] Biến cố nhỏ khi nấu** (10–15% lần nấu) và **lưu ảnh đĩa đẹp nhất** của từng món vào Sổ công thức.
- **[GĐ3] Bếp đa trạm, Pass và chế độ Bếp trưởng**: người chơi đứng ở Pass trả lại đĩa không khớp phiếu; "Sửa" một đĩa trong 3 giây được +10 Q.

### C. Nội dung Việt
- **[MVP, M1] Giọng Nam/Bắc** trong bóng thoại, 15 cặp từ đồng nghĩa.
- **[GĐ2] Sổ từ vùng miền**: nhấn giữ bóng thoại để xem chú giải; thu thập đủ 20 ô thưởng 1 công thức. Có "tiền bo", "trả lại tiền thừa", và bẫy vui "thơm" ở miền Nam là trái dứa. GĐ2 thêm giọng Trung.
- **[MVP, M1] Dì Sáu và Anh Khoa**: Dì Sáu cố vấn bếp, Anh Khoa hướng dẫn công cụ bán hàng. Anh Khoa có câu cửa miệng "Kết ca trước khi về nha, không mai lệch két là khóc đó!", là nhân vật gợi nhắc chính nghề của người dùng.
- **[MVP, M1] Khách quen cô Thu và bạn Nam** hướng dẫn ngày 1 và quay lại "như mọi khi nha" (mục 3.4).
- **[GĐ2] 6 khách quen có tên** và thiện cảm 0–100 (không tự giảm theo thời gian): thiện cảm 40 được tip 10.000đ khi 5 sao; 60 mở chuyện riêng; 80 tặng công thức gia truyền; 100 dẫn thêm bạn tới.
- **[GĐ2] Khách nước ngoài** gọi món bằng tiếng Anh đơn giản kèm chỉ tay vào hình, hay nhầm tờ 20k với 500k. Trả lại phần thừa được +2 danh tiếng.
- **[GĐ3] Hành trình ẩm thực 3 miền**: 9 điểm đến, mỗi điểm có đầu bếp địa phương và nguyên liệu đặc sản. Mỗi chuyến đi tốn 1 ngày nghỉ bán, là một đánh đổi thật.

### D. Giữ chân và LiveOps
- **[MVP, M1] Đặt tên xe đẩy ngay ngày 1**, tên hiện trên biển xe và phiếu thu. Người chơi thấy quán là "của mình" ngay từ phút đầu.
- **[GĐ2] "Món của ngày"**: mỗi ngày game, một món trong thực đơn (chọn theo seed, xoay vòng) được gọi nhiều gấp 1,5 lần; mỗi phần đạt Ngon trở lên +1 danh tiếng. Giá không đổi. Giúp người chơi không nấu mãi một món. *(đã chỉnh theo bản chơi được: không làm ở M2, theo đường cắt mục 14.5; dời sang GĐ2.)*
- **[MVP, M2 đã làm] Mục tiêu sau khi đủ điều kiện lên chặng** (mục 8): sưu tập "Không tì vết", thạo cấp 3, kỷ lục ca, đếm ngược sự kiện. Sổ công thức (M3) sẽ hiện thêm huy hiệu từng món.
- **[GĐ2] Thử thách ngày theo seed chung**: mọi người chơi cùng một đề mỗi ngày (ví dụ 12 khách thu ngân trong 60 giây, hoặc 1 ca bếp cố định), không ảnh hưởng kinh tế quán. Có **thẻ kết quả để chia sẻ** qua Web Share API (Zalo, Facebook). Đây là vòng lan truyền duy nhất của game, và cũng dùng làm bài khởi động cho buổi đào tạo.
- **[GĐ2] Nhiệm vụ tuần và Rương tuần**: thanh 1.000 điểm với các mốc 250/500/750/1.000. Chơi 4–5 trên 7 ngày vẫn đạt mốc 750.
- **[GĐ2] Chuỗi ngày mở quán kèm vé nghỉ phép**: mỗi tuần có 1 vé tự dùng khi lỡ ngày. Thưởng chỉ là Muỗng Vàng và đồ thẩm mỹ.
- **[GĐ2] Thành tựu 3 bậc và danh hiệu**: khoảng 60 thành tựu tính từ bộ đếm `stats` đã ghi ngay từ MVP, nên người chơi cũ được nhận bù phần đã đạt.
- **[GĐ2] Ca Hứng Khởi**: 3 ca đầu mỗi ngày thật được danh tiếng ×1,25, Tem ×1,25, thạo món ×1,5, không nhân Tiền quán. Kéo người chơi quay lại mỗi ngày mà không cấm ai chơi dồn.
- **[GĐ2] Giftcode cho fanpage**: file chỉ chứa SHA-256(muối + mã). Mỗi save dùng 1 lần. Trần 50 Muỗng Vàng + 1 TNC.
- **[GĐ2] Quà quay lại**: vắng 3/7/14 ngày được 30/60/100 Muỗng Vàng, kèm tuần "Trở lại bếp" có 3 nhiệm vụ nhẹ.
- **[GĐ2] Đi chợ sớm mặc cả**: 3 lượt mỗi ngày, canh kim để giảm 3/8/15%. Nói câu lịch sự thì được cộng.
- **[MVP, M2 đã làm sớm] Màu dù xe mua bằng Muỗng Vàng** (3 màu, 30 Muỗng Vàng mỗi màu, chỉ thẩm mỹ, xem thử trước khi mua; Góc Muỗng Vàng của Chợ Công Thức).
- **[GĐ3] Thẻ Đầu Bếp miễn phí theo mùa 28 ngày**: 30 bậc, chủ đề vùng miền. Nếu sau này có bản trả phí thì chỉ bán đồ thẩm mỹ.
- **[GĐ3] Web Push**: tối đa 1 thông báo/ngày, giờ yên lặng 22:00–08:00, chỉ 4 loại nhắc.

### E. Tiến trình và quản lý
- **[GĐ2] Trang trí theo chặng và Góc kỷ niệm**: mỗi lần lên chặng, chọn 1 món cũ làm kỷ vật (ví dụ chiếc xe đẩy đầu tiên đặt ở sảnh nhà hàng). Điểm Không khí cho kiên nhẫn tối đa +20%.
- **[GĐ2] Chọn mặt bằng ở Chặng 3**: trường học (khách ×1,3, chịu giá ×0,85), văn phòng (giá ×1,2, trưa ×1,8), chợ (nguyên liệu −15%, khách soi giá). Đây là quyết định chiến lược lớn nhất, và là lý do để chơi lại.
- **[GĐ2] Định giá linh hoạt ±20%** (từ Chặng 3): điểm tối ưu nhẹ quanh +10%, đổi lại có rủi ro bị review "chê đắt". Không có chiến lược nào thắng tuyệt đối.
- **[GĐ2] Đơn đặt tiệc có cọc 30%** và **đơn app giao hàng (hư cấu) với bước đóng gói đúng** (túi riêng cho nước chấm, tem niêm phong, đối chiếu mã 4 số khi giao cho tài xế).
- **[GĐ2] Chơi lại ca**: chỉ khi ca lỗ, tối đa 1 lần mỗi ngày thật; khôi phục **toàn bộ** ảnh chụp đầu ca, gồm cả nhiệm vụ, chuỗi, bộ đếm `stats` và hộp thư, để không cộng trùng tiến độ.
- **[GĐ3] Thẩm định viên ẩn danh và Đũa Vàng**: chấm 3 tiêu chí Quầy, Món, Vệ sinh. Kết quả kém chỉ nhận bài góp ý, không bị trừ tiền.
- **[GĐ3] Tái khởi nghiệp vùng miền**: giữ công thức (thạo giảm 2 cấp), kỷ vật và 1 đệ tử. Điểm Bí kíp dùng mua đặc quyền vĩnh viễn. Khẩu vị vùng làm dời mục tiêu nêm.
- **[GĐ3] Gửi quà cho quán bạn** (chỉ quà tốt): giữ tính xã hội nhưng bỏ phần phá quán để tránh bị chơi xấu.

### F. Đào tạo (phục vụ vai trò của người dùng)
- **[GĐ2] Chế độ Học việc**: 4 khóa với 19 bài, mỗi bài 2–4 phút, đề cố định, chấm 1–3 sao, có "Giấy khen Học việc" dạng ảnh chia sẻ được. Tách hẳn khỏi game chính và luôn tắt quảng cáo.
- **[GĐ2] Thử thách Thu ngân 60 giây**: 12 khách cùng một đề theo seed ngày, 3 lượt/ngày, không ảnh hưởng kinh tế quán (chính là một dạng của thử thách ngày ở mục D).
- **[GĐ2] Kiểm tra Mẹo nghề cuối tuần**: 5 câu lấy từ các thẻ đã mở. Đúng 4/5 được 10 Muỗng Vàng.
- **[GĐ3] Mã bài thi cho người đào tạo**: tạo mã 8 ký tự chứa bài và seed; học viên gửi lại mã kết quả có checksum; người đào tạo xem "Bảng lớp" và thống kê lỗi phổ biến (ví dụ "42% lớp thối sai khi khách đưa tờ 500k"). Ghi rõ đây chỉ là công cụ ôn luyện. Mã kết quả không chứa tên thật (mục 16).

### G. Kỹ thuật và công cụ
- **[MVP, M1] Lịch sử tổng kết 60 ca** trong save: đủ để đo lãi, số khách, lỗi quầy và lỗi bếp theo ca khi thử nghiệm.
- **[GĐ2] Phòng thử mini-game `lab.html`** (làm sớm ở M3 nếu kịp): chọn cơ chế và tham số để chơi riêng, phục vụ cân bằng.
- **[GĐ2] Sổ số liệu chi tiết**: thời gian ở từng khâu của từng khách, số lần chạm, lỗi theo loại. Có nút "Xuất số liệu" (ẩn danh) để người thử gửi lại.
- **[GĐ2] `tools/mo-phong.js`**: mô phỏng 3 hồ sơ người chơi (3,8 / 4,2 / 4,7 sao) trong 60 ngày thật, xuất CSV, kiểm tra thời lượng lên chặng và tỉ lệ thưởng.
- **[GĐ3] Backend**: lưu mây, mã chuyển máy, bảng xếp hạng Giải Bếp Tuần (máy chủ chạy lại mô phỏng để xác thực), LiveOps từ xa có chữ ký.

---

## 11. Kinh tế

Số liệu chi tiết và bảng tính của Chặng 1 nằm ở `docs/can-bang.md`. Mục này giữ các luật và con số chính.

### 11.1 Các loại tiền

| Tiền tệ | Vai trò | Nguồn chính | Nơi tiêu | Có từ |
|---|---|---|---|---|
| **Tiền quán** (VNĐ ảo) | Vận hành | Bán món khoảng 70–80%; tip 5–10%; nhiệm vụ, điểm danh, quà 20–30% | Chi phí cố định; công thức; nâng cấp; chuyển chặng; làm lại, hoàn tiền; thối dư; trả nợ Dì Sáu | MVP |
| **Danh tiếng** | Điểm kinh nghiệm, không tiêu được, không giảm | Sao của từng khách; nhiệm vụ (+5); chuỗi; món Không tì vết | Ngưỡng mở khóa | MVP |
| **Muỗng Vàng** | Tiền cao cấp, **chỉ kiếm trong game** | Điểm danh; Rương ngày (5 mỗi ngày); chuỗi; thư; Quầy đổi Tem (tối đa 50 mỗi sự kiện); lên chặng 100–300 (GĐ2); Rương tuần, thành tựu, két khớp +2 (GĐ2) | MVP: đổi nhiệm vụ (5); màu dù xe (30 mỗi màu). GĐ2: Kệ Đặc biệt, trang trí, Vé Bù. *(Đề xuất mua Cà phê sữa đá bằng 60 Muỗng Vàng không làm.)* | MVP |
| **Thạo món** | Tiến độ riêng từng món | Nấu đạt Ngon trở lên | — | MVP |
| **Tem Lễ Hội** | Token sự kiện, có hạn, tên đổi theo mùa (Tri ân 20/11: "Phấn Trắng") | Món trong sự kiện; nhiệm vụ và điểm danh sự kiện; chuỗi sự kiện | Quầy đổi (trang trí, Muỗng Vàng); dư thì tự đổi ra Tiền quán tỉ lệ thấp | MVP (làm sớm ở M2) |
| **Mảnh công thức** | 10 mảnh cùng món thì mở món đó | Rương tuần | Góc Mảnh (đặt 1 "món ưu tiên") | GĐ2 |

**Ba "túi" tiền trong ca và cách gộp**:
- **Két** (tiền mặt): bắt đầu bằng quỹ lẻ 200.000đ, tài sản riêng, không tiêu được.
- **Tiền QR** trong ca và **hũ tip**.
- **Cuối ca**: ví Tiền quán += (tiền mặt trong két − 200.000đ) + tiền QR + hũ tip − chi phí cố định (20.000đ) − hoàn tiền. Nếu đang nợ, trừ tiếp phần trả nợ. Đầu ca sau, két tái lập đúng 200.000đ.

**Luật tách lớp**:
- Không có đường đổi Tiền quán sang Muỗng Vàng.
- Tem đổi sang Muỗng Vàng có trần 50 mỗi sự kiện; Tem dư đổi sang Tiền quán với tỉ lệ thấp (100 Tem = 0,2 TNC, tối đa 1 TNC mỗi sự kiện).
- Không bán bất kỳ loại tiền nào bằng tiền thật.
- Mở dần: ca đầu tiên chỉ thấy Tiền quán và danh tiếng; Muỗng Vàng xuất hiện ở lần điểm danh đầu; Tem chỉ hiện khi có sự kiện.

### 11.2 TNC và tỉ lệ giá vốn (FC) theo chặng

| Chặng | Khách/ca | Giá trung bình/khách | Doanh thu/ca | FC mục tiêu | Chi phí cố định/ca | Tip | **TNC** |
|---|---|---|---|---|---|---|---|
| 1 | 4–8 | khoảng 15–25k | khoảng 60–195k | 40% (món chính 45%, đồ uống 30–40%) | 20k | khoảng 9–18k | **Tăng theo ngày game: 20k (ngày 1–2), 35k (3–4), 65k (5–6), 85k (7–8), 100k (từ 9); trung bình cả chặng khoảng 80k** (khớp `BALANCE.refIncomeTable`) |
| 2 | 8–10 | khoảng 35k | khoảng 315k | 40% | 45k | khoảng 15k | **160k** |
| 3 | 10–12 | khoảng 55k | khoảng 605k | 38% | 110k | khoảng 35k | **300k** |
| 4 | 12 lượt bàn | khoảng 90k | khoảng 1,08tr | 35% | 220k | khoảng 86k | **600k** |
| 5 | 12 bàn | khoảng 220k | khoảng 2,64tr | 32% | 700k | khoảng 264k | **1,4tr** |
| 6 | 8–10 | khoảng 900k | khoảng 7,2tr | 28% | 2,5tr | khoảng 864k | **3,5tr** |
| 7 | Chi nhánh tự chạy | Lãi chuẩn của mô hình × (sao chi nhánh / 4,5) × (0,7 + 0,06 × cấp quản lý) | | | | | |

- **Giá bán** = giá vốn chia FC mục tiêu, làm tròn lên bội 5.000đ ở Chặng 1–2, bội 1.000đ ở Chặng 3–4, bội 5.000đ ở Chặng 5–6. Đồ uống có FC thấp hơn món chính 5–15 điểm.
- Sổ sách hiện song song **FC chuẩn** và **FC thực tế** (tính cả hao hụt, làm lại, hoàn tiền). Mục tiêu: người chơi trung bình cao hơn FC chuẩn 5–8 điểm, người giỏi cao hơn 1–3 điểm.
- **Tiêu chí cân bằng**: người đạt 4,7 sao phải lãi hơn người đạt 3,8 sao ít nhất 25%, chưa tính hệ số khách.

**Ví dụ một ca Chặng 1** (ngày game 7, 7 khách, 11 món, đã mua Bánh tráng trộn và Cà phê sữa đá):
- Doanh thu: 4 bánh mì (80k) + 4 trà tắc (40k) + 2 bánh tráng trộn (40k) + 1 cà phê sữa đá (15k) = 175k.
- Giá vốn: 36 + 12 + 16 + 5 = 69k.
- Hao hụt (1 lần làm lại trứng): 6k.
- Tip (3 khách 5 sao): 15k.
- Chi phí cố định: 20k.
- Thối dư: 5k.
- **Lãi khoảng 90k**, xấp xỉ TNC ngày 7–8 (85k).

### 11.3 Giá công thức

| Chặng | Kệ Chính (Tiền quán) | Tương đương | Kệ Đặc biệt (Muỗng Vàng, GĐ2) | Tương đương (khoảng 30 Muỗng Vàng/ngày ở GĐ2) |
|---|---|---|---|---|
| 1 | 200–250k | khoảng 3–4 ca lãi lúc mua | — | — |
| 2 | 500–600k | 3–4 ca | 150 | khoảng 5 ngày |
| 3 | 1,2–1,5tr | 4–5 ca | 250 | khoảng 8 ngày |
| 4 | 3–3,6tr | 5–6 ca | 300 | khoảng 10 ngày |
| 5 | 7–9tr | 5–6,5 ca | 400 | khoảng 13 ngày |
| 6 | 20–25tr | 6–7 ca | 500 | khoảng 17 ngày |

Nhịp mục tiêu: 1 công thức thường mỗi 1–3 ngày thật; 1 công thức đặc biệt mỗi 1–2,5 tuần. Mỗi chặng có khoảng 2 món có sẵn, 3 món mua bằng Tiền quán, 1–2 món mua bằng Muỗng Vàng, 1 món từ chuỗi. Tổng khoảng 40 món khi tới Chặng 6.

### 11.4 Đường cong giá nâng cấp
Giá cấp n = làm_tròn(C0 × r^(n−1)). Hiệu ứng giảm dần theo cấp: e(n) = e1 × 0,85^(n−1).

| Nhóm | r | Số cấp | C0 | Ghi chú |
|---|---|---|---|---|
| Dụng cụ (mang theo qua các chặng) | 1,35 | 5 | 1,5–2,5 TNC | Cấp tối đa được mua = số chặng + 1 |
| Công suất (gắn với địa điểm) | 1,6 | 2–3 | 1–2 TNC | Khi đổi chặng được thanh lý, hoàn 30% |
| Trang trí | 1,15 | 10 | 0,5 TNC | +2% khách mỗi cấp, trần +20% |

Bảo trì (GĐ2): mỗi ca tốn 1% giá trị dụng cụ, trần 8% TNC.

**Nâng cấp MVP** (M2 đã làm, mỗi loại 1 cấp, mua ở thẻ Nâng cấp của Chợ Công Thức; khớp `src/data/upgrades.js`):

| Nâng cấp | Giá | Mở từ ngày game | Hiệu ứng |
|---|---|---|---|
| Dao thép tốt | 150k | 2 | Vùng mục tiêu THAI +20% |
| Chảo chống dính | 200k | 3 | Vùng chín LUA +15%, cháy chậm hơn 20% |
| Ghế nhựa chờ | 180k | 3 | Kiên nhẫn xếp hàng ×1,2 |
| Loa báo tiền | 150k | 5 | Tự xác nhận QR, chặn ảnh chuyển khoản giả |
| Máy tính cầm tay | 150k | **7** | Tự cộng tổng khi chạm món; **không hiện tiền thối** |

### 11.5 Ngân sách thưởng Chặng 1 (theo ngày thật)
Giả định người chơi trung bình 4,2 sao, chơi 3 ca ở ngày thật 1 và 4 ca mỗi ngày thật 2–4 (tổng 15 ca). Hiện vật được quy đổi ra tiền để tính tỉ lệ. Tỉ lệ = thưởng / (lãi bán hàng + thưởng).

| Ngày thật (ca) | Lãi bán hàng | Nhiệm vụ + Rương ngày | Chuỗi C1 | Điểm danh (quy đổi) | Hộp thư (quy đổi, kỳ vọng) | **Tổng thưởng** | **Tỉ lệ** |
|---|---|---|---|---|---|---|---|
| 1 (ca 1–3) | khoảng 65k | 20k | 10k (bước 2, 3) | 0 (Muỗng Vàng, thẩm mỹ) | khoảng 5k (Phiếu Chợ Sớm của thư chào mừng) | **35k** | **35%** |
| 2 (ca 4–7) | khoảng 253k | 52k | 25k (bước 4, 5) | khoảng 7k (Phiếu Chợ Sớm) | 0 | **84k** | **25%** |
| 3 (ca 8–11) | khoảng 389k | 80k | 10k (bước 6) | 0 (Muỗng Vàng) | khoảng 4,5k (quà đời thường) | **94,5k** | **19,5%** |
| 4 (ca 12–15) | khoảng 404k | 80k | 0 (bước 7 thưởng Muỗng Vàng) | khoảng 20k (Bạt che mưa, danh nghĩa) | khoảng 4,5k | **104,5k** | **20,6%** |
| **Cả Chặng 1** | **khoảng 1,11tr** | 232k | 45k | 27k | 14k | **318k** | **22,3%** |

*(M4: lãi bán hàng tính lại theo luật tip mới — `docs/can-bang.md` mục 9; thưởng tiền chuỗi C1 giảm 85k → 45k — mục 9.4. Bảng v0.3: lãi 78k / 265k / 405k / 421k, chuỗi 85k, tỉ lệ 31% / 28% / 22% / 20%, cả chặng 23,4%.)*

- Mọi ngày không vượt trần 35%. Ngày thật 1 cao nhất và chạm trần trong mô hình (35%) vì lãi ba ca đầu còn thấp (ngày 1–2 phần lớn đơn 1 món, hóa đơn dưới 20.000đ không có tip); đây là ngày cần đo kỹ ở người chơi thật. Mô phỏng người chơi giỏi (lãi cao hơn mô hình) ngày thật 1 trung bình 20%, cao nhất 33,8%.
- Quà lễ (20/10, 20/11) phụ thuộc lịch nên không nằm trong bảng; quà 20/11 là 0,5 TNC.
- Muỗng Vàng cả Chặng 1: khoảng 90 (mô phỏng M2: 85–90 sau 5 ngày thật), đủ mua 1–2 màu dù xe (30 mỗi màu) và vài lần đổi nhiệm vụ. *M4: hàng hiếm dư (kho đầy hoặc quá 6 phần/3 mảnh mỗi ngày thật) đổi 2 Muỗng Vàng mỗi phần, người chơi giỏi ghé đủ 3 phiên hàng có thêm khoảng 7 Muỗng Vàng mỗi ngày thật (mô phỏng: 115–135 sau 5 ngày thật).*
- **Số đo mô phỏng M2** (`tests/unit/integration-meta.test.mjs`, người chơi hoàn hảo, 3 ca mỗi ngày thật, 5 ngày thật, seed 42, 7, 2024): tỉ lệ thưởng mỗi ngày 4–25%, cao nhất 25,2% (ngày nhận Rương Khai Trương trong lượt có sự kiện), ngày có quà lễ 20/11 là 18,3%, ngày tất toán Tem dư là 21,2%. Lãi bán hàng của người chơi hoàn hảo cao hơn mô hình người chơi trung bình khoảng 3 lần, nên tỉ lệ thật thấp hơn bảng trên; chi tiết ở `docs/can-bang.md` mục 10.3.
- **Số đo mô phỏng M4** (cùng test, người chơi giỏi còn ghé 3 phiên hàng, nấu thử mở món hiếm, chọn cách an toàn ở tình huống; hàng hiếm quy đổi lúc dùng, như Phiếu Chợ Sớm): seed 42, 7, 2024 cao nhất 26,7%; lượt Tri ân 20/11 cao nhất 33,5% (ngày Rương Khai Trương); chạy rộng 40 hạt giống × 4 mốc bắt đầu cao nhất 34,1% (trước khi giảm thưởng chuỗi C1: 41,7%, vượt trần ở 44/800 ngày).
- Nếu số liệu thử nghiệm cho thấy tỉ lệ vượt 35% ở bất kỳ ngày nào thì giảm hệ số thưởng nhiệm vụ trước.

### 11.6 Lưới an toàn và phạt
- **Không game over, không xóa save.**
- **"Dì Sáu cho mượn"** [MVP, M1]: khi Tiền quán thấp hơn chi phí cố định một ca (20.000đ), Dì Sáu cho mượn **240.000đ** (3 lần TNC trung bình Chặng 1). Trả 110% (264.000đ) bằng cách tự trừ 25% lãi mỗi ca có lãi. Mỗi lần chỉ được 1 khoản. Đang nợ thì không lên chặng được.
- **Gói cứu trợ** [GĐ2]: nguyên liệu đủ 1 ca, tối đa 1 lần mỗi 3 ngày game (khi đã có kho).
- **Chơi lại ca** [GĐ2]: luật ở mục 10.E.
- **Mọi phạt đều có trần**: không bao giờ tính theo % Tiền quán đang giữ. Mỗi tình huống (và mỗi sự kiện ngày có phạt) lỗ tối đa bằng mức nhỏ hơn giữa 10% doanh thu dự kiến của ca và 0,5 TNC, làm tròn xuống bội 500đ (khớp code `incidentLossCap`); tổng phạt vì sự kiện trong một ngày thật tối đa 1 TNC, vượt thì Dì Sáu đỡ giùm (`BALANCE.eventDayCap`). Tiền thưởng sự kiện cũng có trần (min(15% doanh thu dự kiến, 0,75 TNC) mỗi sự kiện, 1 TNC mỗi ngày thật). *(Bản trước ghi "20% doanh thu ca", lệch code.)*

---

## 12. Mẹo nghề: lồng nhẹ vận hành F&B [MVP: thẻ và luật hiển thị đã có từ M1–M2; Sổ tay nghề ở M3]

**Luật hiển thị**
- Mẹo hiện khi người chơi gặp một bước lần đầu (trong phần hướng dẫn), hoặc ngay sau lần đầu mắc một loại lỗi.
- Dạng thẻ nổi gọn (tiêu đề và tối đa 2 dòng, chỉ che dải khách), **không dừng game**, mỗi lần 1 thẻ, thẻ sau xếp hàng.
- Ngoài ngày 1 (hướng dẫn), tối đa 1 mẹo mỗi ca. Tắt được bằng công tắc "Mẹo nghề": tắt chỉ ẩn thẻ nổi trong ca, thẻ vẫn được mở và ghi vào Sổ tay nghề (không mất phần thưởng đủ nhóm).
- Thưởng bước chuỗi "Ngày đầu ra phố" cũng mở thẻ Mẹo nghề liên quan (M2).
- [M3] Mẹo đã gặp được gom vào **Sổ tay nghề**, chia nhóm Quầy / Bếp / Kho / Phục vụ-Quản lý. Đủ một nhóm được danh hiệu và 20 Muỗng Vàng.
- Màn chờ (màn mở đầu khi quay lại, màn Chuẩn bị) hiện ngẫu nhiên một mẹo đã mở (M3, đã làm). Cuối ca, thẻ của mốc tổng kết ca hiện trong mục "Mẹo của Dì Sáu" ở màn Tổng kết (đã có).
- Mọi con số trong mẹo đều ghi rõ là **"số liệu minh họa"**. Cần người làm bếp hoặc kế toán duyệt lại trước khi dùng để đào tạo chính thức.

**20 thẻ Mẹo nghề của MVP**

| Nhóm | Thẻ |
|---|---|
| Quầy (12) | (1) Luôn đọc lại order trước khi báo tổng: sửa ở quầy mất 2 giây, sửa ở bếp mất cả một món. (2) Khách dặn kiêng gì thì ghi ngay lên phiếu, đừng tin trí nhớ. (3) Hai phần cùng món mà khác yêu cầu thì tách thành hai dòng. (4) Báo tổng rõ ràng và chỉ bảng giá cho khách thấy. (5) Để tờ tiền khách đưa trên nắp két tới khi thối xong. (6) Đếm tiền thối hai lần: lúc lấy khỏi két và trước mặt khách. (7) Nói to: "Nhận 200 nghìn, thối 170 nghìn". (8) Chuẩn bị đủ tiền lẻ đầu ca. (9) Chỉ xác nhận chuyển khoản khi loa hoặc ứng dụng báo tiền đã về đúng số; ảnh chụp màn hình không phải là tiền. (10) Trả trước thì thu tiền xong mới gửi phiếu vào bếp. (11) Ghi chú đặc biệt phải nằm trên phiếu bếp, đừng chỉ dặn miệng. (12) Bếp quá tải thì báo trước thời gian chờ cho khách mới |
| Bếp (5) | (13) Rửa rau dưới vòi nước chảy rồi mới thái. (14) Dùng thớt riêng cho đồ sống và đồ chín, rau. (15) Nêm từ ít tới nhiều. (16) Chảo dầu bốc cháy: tắt bếp, đậy kín nắp, tuyệt đối không dội nước. (18) Làm hỏng thì làm lại; ra món kém còn tốn hơn một phần nguyên liệu |
| Kho (1) | (17) Định lượng chuẩn giúp món đồng đều và giữ được giá vốn *(đã chỉnh theo bản chơi được: code xếp thẻ này vào nhóm Kho)* |
| Phục vụ, Quản lý (2) | (19) Khách phàn nàn: lắng nghe, xin lỗi, giải quyết, cảm ơn. (20) Quán nhỏ thường có giá vốn khoảng 35–45% giá bán; nhà hàng thường giữ khoảng 28–35% (số liệu minh họa) |

Mỗi thẻ khai báo `{id, group, title, text, trigger}` trong `src/data/tips.js`; `trigger` là mã sự kiện hoặc mã lỗi khiến thẻ mở lần đầu (ví dụ thẻ 9 mở khi xác nhận nhầm QR giả, hoặc khi Loa chặn ảnh giả lần đầu).

**Mở thêm theo chặng**
- Chặng 2: dọn bàn, đóng gói mang về, nhớ mặt khách quen, nhập trước xuất trước (FIFO), dán nhãn ngày.
- Chặng 3: chọn đúng phương thức thanh toán trên máy; kiểm tra điều kiện voucher; hủy món đã in bếp phải có lý do; kết ca đối soát theo phương thức; báo hết món trên máy ngay khi hết hàng; đào tạo nhân viên mới bằng cách làm mẫu; tủ mát giữ 0–5 độ C, đồ sống để ngăn dưới.
- Chặng 4: ghi đặt bàn đủ tên, số người, giờ và ghi chú; dị ứng là chuyện sức khỏe chứ không phải khẩu vị.
- Chặng 5: in tạm tính cho khách kiểm tra trước khi thu; hỏi tách hóa đơn theo món hay chia đều; hỏi khách có cần xuất hóa đơn cho doanh nghiệp ngay khi thanh toán và đọc lại mã số thuế; ưu tiên bàn giơ tay gọi tính tiền.
- Chặng 6: phục vụ mọi khách như nhau (bài học từ người review ẩm thực); gọi món theo lượt đúng nhịp bàn.

---

## 13. Kỹ thuật (tóm tắt)

Chi tiết (tên file, chữ ký hàm, cấu trúc save, danh sách `data-testid`) nằm ở **`docs/kien-truc.md`**. Mục này chỉ tóm tắt các quyết định.

- **Nền tảng**: HTML/CSS/JavaScript thuần với ES Modules, không bước build, không thư viện ngoài khi chạy. Giao diện bằng DOM/CSS + SVG; thao tác bằng Pointer Events; âm thanh tổng hợp bằng WebAudio (M3). PWA gồm manifest và service worker (M3). Font hệ thống, đủ dấu tiếng Việt.
- **Ba tầng, phụ thuộc một chiều**: `src/ui → src/core → src/data`. Tầng `core` không dùng DOM, bộ nhớ trình duyệt, đồng hồ hay hàm ngẫu nhiên trực tiếp (được truyền vào), nên test được bằng Node. Không đưa state hay engine ra biến toàn cục.
- **Dữ liệu**: toàn bộ nội dung và cân bằng là module xuất object đóng băng. Có test kiểm tra dữ liệu (bước, nguyên liệu, ghi chú, giá bội 5.000đ, lớn hơn giá vốn, chuỗi hiển thị không rỗng…).
- **Ngẫu nhiên theo seed**: lịch khách, câu gọi món, bẫy trên kệ, nhiệm vụ ngày đều sinh từ seed của save cộng ngày, nên tải lại trang không đổi được.
- **Bus sự kiện**: nhiệm vụ, chuỗi, thành tựu và bộ đếm `stats` chỉ lắng nghe bus, không chen vào code quầy và bếp.
- **Lưu tiến trình**: save một khóa có checksum (`bkn.save`) và một bản dự phòng (`bkn.bak`); lưu cả ca đang dở. Tải lại giữa một bước mini-game thì bước đó chơi lại từ đầu với cùng tham số. Save cũ được nâng phiên bản tự động khi nạp (M1 là version 1, M2 là version 2). [M3] Mã sao lưu để chép sang máy khác; nhắc sao lưu mỗi 7 ngày thật. [M3] "Chơi lại từ đầu" **không xóa** tiến trình: bản cũ được cất sang một khóa lưu trữ riêng (ví dụ `bkn.save.old.<thời điểm>`) và phải xác nhận 2 bước. [M3] Không bao giờ mất tiến trình trong im lặng: trình duyệt chặn bộ nhớ hoặc bộ nhớ đầy thì hiện dải cảnh báo "Chưa lưu được tiến trình" kèm nút sao lưu; bản lưu không đọc được được cất nguyên vẹn (`bkn.save.hong.<thời điểm>`) trước khi game ghi bản mới; ca dở không mở lại được sau khi cập nhật thì được hủy và hoàn giá vốn.
- **Một tab chơi tại một thời điểm** [M2 đã làm]: mỗi lần ghi, save tăng số hiệu bản ghi (`rev`); tab nào mở game cũng lưu ngay lúc khởi động. Tab cũ thấy bản lưu mới hơn thì tự khóa ("Game đang mở ở tab khác", nút "Chơi ở tab này" để tải bản mới nhất) và không ghi đè quà, ca, món đã mua ở tab mới.
- **Đồng hồ**: ngày đổi lúc 04:00 giờ Việt Nam. [M2 đã làm, vốn xếp ở M3] Lưu thời điểm lớn nhất từng thấy; nếu giờ máy lùi hơn 10 phút thì khóa quà theo ngày (vẫn chơi bình thường) và hiện lời nhắc nhẹ. Tua giờ tới trước chỉ "ứng trước" phần thưởng. [GĐ2] Lấy thêm giờ máy chủ.
- **Giờ giả để kiểm thử** [M2]: `?devNow=YYYY-MM-DD` hoặc `?devNow=YYYY-MM-DDTHH:mm` (giờ Việt Nam), chỉ trên `localhost`/`127.0.0.1`. Game lưu ở khóa riêng (`bkn.save.dev`), bản lưu thật không bị ghi mốc tương lai. Các tham số khác: `?seed=N` (chỉ khi chưa có save), `?test=1` (chỉ trên localhost, bật Hỗ trợ thao tác cho kiểm thử tự động).
- **Chống chữ cấm**: test tự động quét mã nguồn để cấm tên game tham khảo, tên sản phẩm của công ty người dùng, tên ngân hàng, ví điện tử, app giao hàng thật và các từ nội bộ trên giao diện.
- **Mở bằng `file://`**: thông báo "hãy chạy máy chủ tĩnh" viết bằng HTML tĩnh, vì ES module không chạy qua `file://`.
- **Kiểm thử**: unit test bằng `node:test`; e2e bằng Playwright trên khung điện thoại 390×844, chạm, locale `vi-VN`, múi giờ Việt Nam.
- **Ngân sách**: JS và CSS dưới khoảng 250 KB chưa nén; từ lần mở thứ hai chơi được offline (M3).
- **Triển khai**: host tĩnh, mọi đường dẫn tương đối, không có bước build. Hướng dẫn triển khai miễn phí lên GitHub Pages, Cloudflare Pages hoặc Vercel ở `README.md`. Quy trình tự động ở GĐ2.

---

## 14. Lộ trình MVP → GĐ2 → GĐ3

### 14.1 Phạm vi MVP
- Chỉ **Chặng 1 "Xe đẩy đầu hẻm"**. Người chơi chơi từ ngày 1 tới khi đủ điều kiện lên Chặng 2 (150 danh tiếng, sao trung bình ≥3,8, 3 công thức, 2 món thạo cấp 2, xong chuỗi "Ngày đầu ra phố", 500.000đ). Khi đó hiện màn "Quán cóc vỉa hè – sắp khai trương" với nút bị khóa, và người chơi vẫn chơi tiếp Chặng 1 với các mục tiêu sau khi đủ điều kiện. Bản đồ hiện đủ 7 chặng, các chặng sau hiện mờ.
- Quy mô ước tính: **khoảng 9.000–12.000 dòng**, nên chia thành 3 mốc. Mỗi mốc là một bản chạy được, có commit riêng.
- Dữ liệu của cả 5 món được viết ngay từ M1; món Shop và món sự kiện chỉ bán được từ M2.
- **Trạng thái ngày 30/09/2026**: M1, M2 và M3 **đã xong**, kể cả vòng soát lỗi M3 (an toàn dữ liệu người chơi, giao diện ngày 1): 271 unit test và 33 kịch bản e2e đều xanh (e2e khoảng 18 phút). **M4 (bản 0.4.0) đã xong** (mục 14.4b): 344 unit test và 33 kịch bản e2e xanh.

### 14.2 M1 — Lõi chơi được [Đã xong]
**Nội dung**
- **Món**: Bánh mì ốp la, Trà tắc (có sẵn).
- **Luồng 4 khâu với tiền mặt**: thanh tiến trình 4 chấm; bóng thoại giọng Nam/Bắc (tối thiểu 15 mẫu câu, 15 cặp từ đồng nghĩa), lộ trình độ khó 7 ngày; sổ order; đọc lại đơn bắt buộc (80% bắt lỗi); báo tổng tự nhẩm; két 7 ngăn, quỹ lẻ 200.000đ, thối tiền chấm bằng quy hoạch động trên két thật, luật hết tiền lẻ; phiếu thu; dây 3 phiếu với viền đổi màu. Khách thích trả QR vẫn trả tiền mặt cho tới M2.
- **Bếp**: bước Chọn; **Thớt sơ chế** với ràng buộc `after` và chọn cách sơ chế; 6 mini-game CHON, CHA, THAI, CHAM (`exact`, `min`, `targets`), LUA, ROT; làm lại bước, bỏ món, Ra món; Canh lửa chấm bằng hàm liên tục đối xứng.
- **Chấm và kết quả**: Q, hạng món, Không tì vết, sao làm tròn xuống, mỗi lỗi nguyên liệu 1 dòng phạt; **phiếu chấm tách "Lỗi tại quầy" và "Lỗi tại bếp"**, nhãn "Lệch phiếu"; màn Xử lý phàn nàn; tip vào hũ; danh tiếng; sao trung bình 30 đánh giá; khoảng 25 câu review theo mã lỗi.
- **Khách**: 5 kiểu khách (dân văn phòng từ ngày 4, khó tính từ ngày 5); cô Thu, bạn Nam hướng dẫn ngày 1 và quay lại "như mọi khi nha"; lịch khách theo seed với khoảng cách = 1,15 × thời gian phục vụ kỳ vọng; kiên nhẫn xếp hàng; ngân sách chờ món.
- **Màn**: đặt tên xe; Chuẩn bị ca ("Mở hàng", 2 công tắc Hỗ trợ đặt tạm ở đây); Ca bán (thanh trên, tab Quầy/Bếp); Tổng kết ca (doanh thu tiền mặt, tip, giá vốn, hao hụt, hoàn tiền, thu thiếu, thối dư, chi phí, lãi; khối Lỗi quầy / Lỗi bếp kèm 1 gợi ý; két so với phiếu thu; sao trung bình; danh tiếng; "Ngày mai: …").
- **Kinh tế**: ví Tiền quán 200.000đ, chi phí cố định 20.000đ/ca, "Dì Sáu cho mượn" 240.000đ; ghi sẵn bộ đếm thạo món và `stats`.
- **Lưu**: save có checksum và bản dự phòng, lưu cả ca đang dở; lịch sử 60 ca.

**Điều kiện hoàn thành M1**
- `npm test` xanh. Có unit test cho: hệ số tải ρ ≤ 0,9; thối tiền quy hoạch động (ví dụ 60k khi két không có tờ 10k); sao làm tròn xuống (4 − 0,5 → 3); mỗi nguyên liệu chỉ 1 dòng phạt; Canh lửa đối xứng quanh tâm; tốc độ Rót tại vạch ≤ 25%/giây; mã hóa và giải mã save giữ nguyên tiếng Việt, sửa 1 ký tự bị phát hiện; kiểm tra dữ liệu; quét chữ cấm.
- `npm run e2e` xanh với: (1) một ca đầy đủ (đọc bóng thoại → ghi đúng → đọc lại → báo tổng → thối đúng → kẹp phiếu → nấu → giao, khách ít nhất 3 sao, Tiền quán tăng, có save); (2) tải lại giữa ca vẫn chơi tiếp được.
- Chơi tay ngày 1 trên khung 390×844 xong trong 7 phút hoặc ít hơn, console không có lỗi.
- Mọi chuỗi hiển thị là tiếng Việt có dấu, đã soát qua ảnh chụp.

**Kết quả**: đã xong. E2E M1: `one-shift`, `reload`, `kitchen-back`. Ngoài danh sách trên, M1 đã có sẵn 20 thẻ Mẹo nghề (luật hiển thị ở mục 12) và thẻ "Cài đặt" tạm ở màn Chuẩn bị (âm thanh, rung, Mẹo nghề, 2 công tắc Hỗ trợ, giảm chuyển động).

### 14.3 M2 — Kinh tế và LiveOps [Đã xong]
**Nội dung** (đã làm; chỗ khác kế hoạch ghi *đã chỉnh theo bản chơi được*)
- **QR** từ ngày 4 (khoảng 29% khách, theo tỉ lệ của từng kiểu khách), **ảnh chuyển khoản giả** 4% từ ngày 7, **Loa báo tiền**.
- **Chợ Công Thức 2 món**: Bánh tráng trộn (250.000đ, từ ngày 2), Cà phê sữa đá (200.000đ, từ ngày 4); thẻ xem trước; **nấu thử** miễn phí; 3 thẻ bóng mờ Chặng 2. *Đề xuất trả Cà phê sữa đá bằng 60 Muỗng Vàng không làm.*
- **5 nâng cấp**: Dao thép tốt, Chảo chống dính, Ghế nhựa chờ, Loa báo tiền, Máy tính cầm tay (ngày 7, chỉ cộng tổng).
- **Góc Muỗng Vàng**: 3 màu dù xe, 30 Muỗng Vàng mỗi màu *(làm sớm từ GĐ2)*.
- **Thạo món cấp 1–3** hiện trên giao diện, "Tự làm" bước phụ từ cấp 2.
- **Điểm danh 7 ô** (vòng đầu Tuần Khai Trương tặng hiện vật).
- **3 nhiệm vụ ngày và Rương ngày**; đổi nhiệm vụ.
- **Hộp thư**: thư chào mừng, thư phiên bản, quà lễ 20/10, 20/11 và Tết Đinh Mùi, quà đời thường, việc quên nhận, review "thối thiếu" đến muộn, thư Tem dư sự kiện.
- **Chuỗi** "Ngày đầu ra phố" (7 bước) và "Làm quen QR" (3 bước).
- **Sự kiện ngày**: Trời mưa, Nắng nóng, Ngày lãnh lương, Chợ phiên *(2 sự kiện sau làm sớm từ GĐ2)*; Phiếu Chợ Sớm.
- **Sự kiện Tri ân 20/11** với chuỗi 5 bước "Nồi chè tri ân" (cổng 3 ngày chơi), món **Chè bưởi**, Tem "Phấn Trắng", việc và điểm danh sự kiện, Quầy đổi, 3 ngày ân hạn *(kế hoạch cũ: chuỗi 3 bước, Tem để GĐ2)*; tham số `?devNow` khi chạy ở `localhost`, lưu ở khóa riêng.
- **Lên chặng**: điều kiện Chặng 2, màn "Quán cóc vỉa hè – sắp khai trương", bản đồ 7 chặng, thẻ "Giấc mơ tiếp theo", mục tiêu sau khi đủ điều kiện.
- Tip 10.000đ khi đang trong chuỗi "Quầy chuẩn". *"Món của ngày" không làm (theo đường cắt mục 14.5), dời sang GĐ2.*
- **Làm thêm ở vòng soát lỗi M2**: khóa quà khi lùi giờ *(vốn ở M3)*, khóa một tab, nút Back của điện thoại (về màn Chuẩn bị, không thoát game giữa chừng), Hỗ trợ thao tác không làm kẹt chuỗi và việc.

**Điều kiện hoàn thành M2** (đã đạt)
- Unit test cho nhiệm vụ, điểm danh, hộp thư (không nhận trùng id), chuỗi (không kẹt khi có Loa), Shop, sự kiện (biên thời gian đầu/cuối), mốc 04:00 giờ Việt Nam, nâng save v1 → v2.
- E2E: (3) điểm danh qua mốc 04:00 giờ Việt Nam và khóa khi lùi giờ (`checkin-quests`); (4) sự kiện mở → nhận Chè bưởi qua chuỗi → hết hạn vẫn giữ món (`event-2011`); thêm `m2-meta`, `m2-ui`, `shop`, `review-m2` (hai tab, giờ giả lưu riêng, nút Back, ân hạn).
- Mô phỏng tự động (`tests/unit/integration-meta.test.mjs`) thay cho mô phỏng tay: tỉ lệ thưởng mỗi ngày thật ≤ 35% (cao nhất 25,2%); người chơi trung bình không đủ 150 danh tiếng trước ca 8.

### 14.4 M3 — Hoàn thiện [Đã xong]
**Nội dung**
- **PWA offline** (`manifest.webmanifest`, service worker `sw.js`; test đối chiếu danh sách tệp precache với cây thư mục thật). Bản mới chờ tới khi người chơi bấm "Tải lại" ở màn Chuẩn bị/Tổng kết; nếu người chơi đóng hết tab rồi mở lại, trình duyệt tự dùng bản mới (có thể giữa ca): ca dở vẫn giữ và game báo phiên bản mới; bản sau có đổi cấu trúc ca thì ca được hủy và hoàn giá vốn, không mất tiền. *Đã làm.*
- **Sao lưu bằng mã** (chép mã, nhập mã có xem trước ngày, Tiền quán, chặng trước khi ghi đè; bản đang có được cất sang khóa lưu trữ riêng trước khi ghi đè; mã từ bản game mới hơn thì cảnh báo phần sẽ mất; chỉ ghi "đã sao lưu" khi mã thật sự được chép/tải). *Đã làm.*
- **An toàn dữ liệu người chơi** (vòng soát lỗi M3): trình duyệt chặn hoặc hết bộ nhớ thì hiện dải cảnh báo "Chưa lưu được tiến trình" kèm nút sao lưu; bản lưu không đọc được được cất nguyên vẹn sang khóa riêng (`bkn.save.hong.<thời điểm>`) trước khi game ghi bản mới; save cũ có ví lẻ được làm tròn lên bội 500đ. *Đã làm.*
- **Tình huống trong ca** (`core/incidents.js`, `data/incidents.js`): Khách mở hàng bằng tờ 500k, Khách quen xin ghi nợ, Khách đổi ý sau khi thanh toán (mục 9.3b); mức Nhiều / Vừa / Ít. *Đã làm.*
- **Sổ tay nghề** (màn `notebook`) gom 20 thẻ Mẹo nghề đã có theo 4 nhóm; thẻ chưa mở hiện mờ kèm gợi ý cách mở; đủ nhóm được danh hiệu + 20 Muỗng Vàng (nhận 1 lần); màn Chuẩn bị và màn mở đầu hiện ngẫu nhiên một thẻ đã mở. *Đã làm.*
- **Sổ công thức** (màn `recipe-book`): mọi món (có sẵn, Chợ Công Thức, sự kiện, bóng mờ Chặng 2) với giá, giá vốn, số lần nấu, điểm cao nhất, cấp thạo và mốc kế, huy hiệu Không tì vết, nhãn nguồn; chi tiết nguyên liệu và các bước (không lộ bẫy); tab "Sổ từ vùng miền". *Đã làm.*
- **Tiền chẵn**: giá vốn mỗi lần nấu làm tròn bội 500đ, mọi thưởng Tiền quán bội 1.000đ (không còn ví lẻ kiểu "804.250đ"). *Đã làm.*
- **Màn Chuẩn bị gọn**: lưới biểu tượng 7 ô có chấm đỏ (Chợ Công Thức, Việc hôm nay, Điểm danh, Hộp thư, Sổ công thức, Sổ tay nghề, Cài đặt), nút "Mở hàng" luôn thấy được ở 360×740. *Đã làm.*
- **Màn Cài đặt** (màn `settings`, thay thẻ "Cài đặt" tạm ở màn Chuẩn bị): âm thanh, rung, 2 công tắc Hỗ trợ, bật/tắt Mẹo nghề, giảm chuyển động, sao lưu/khôi phục bằng mã, **chơi lại từ đầu** (không xóa: cất bản cũ sang khóa lưu trữ riêng như `bkn.save.old.<thời điểm>`, hộp xác nhận 2 bước). *Đã làm.*
- **Âm thanh**: 8 âm WebAudio (bản tối thiểu 6 tiếng bíp đã có từ M1). *Đã làm.*
- *Khóa quà khi lùi giờ đã làm xong ở M2.*

**Điều kiện hoàn thành M3**
- E2E: (5) chơi được offline sau lần mở đầu; (6) lùi giờ thì bị khóa quà theo ngày (đã có từ M2 trong `checkin-quests.e2e.mjs`); sao lưu rồi khôi phục giữ nguyên tiến trình; "Chơi lại từ đầu" giữ bản cũ ở khóa lưu trữ.
- `npm test` và `npm run e2e` của M1, M2 vẫn xanh; save v1 và v2 vẫn nạp được.
- E2E nội dung M3 (`incident-notebook.e2e.mjs`): tình huống bật giữa hai khách ở tab Quầy, thời gian ca đứng yên khi hộp thoại mở, kết quả ghi ở Tổng kết; nhận thưởng nhóm Sổ tay nghề 1 lần; Sổ công thức; khung 360×740 không tràn. Unit: xác suất, bảo hiểm, không lặp, trần thiệt hại, không chen mini-game, ví luôn là bội 500đ.

### 14.4b M4 — Tip mới, sự kiện thưởng/phạt tiền, hàng hiếm (bản 0.4.0) [Đã xong]
Thiết kế chi tiết: `docs/tham-khao/m4-thiet-ke.md` (có điều chỉnh của người dùng: tần suất "dày", 3 khung giờ phiên hàng, hàng hiếm tiêu hao mỗi phần). Tư liệu thể loại: `docs/nghien-cuu-the-loai-game.md`.

**Nội dung**
- **Tip mới** (quyết định 30, mục 6.9): 5.000đ duy nhất khi khách 5 sao và hóa đơn khách thực trả từ 20.000đ; khách khó tính 5 sao +1 danh tiếng; chuỗi "Quầy chuẩn" 5 khách +1 lượt Giỏ chợ; Ngày lãnh lương khách gọi thêm món.
- **Sổ tiền sự kiện**: dòng "Tiền từ sự kiện" và "Phạt, chi sự kiện" ở Tổng kết; trần mỗi sự kiện và mỗi ngày thật; bất biến ví giữ nguyên.
- **Tần suất "dày"** (quyết định 33), luật nhịp (không 2 cái xấu liền), mức Ít không có sự kiện phạt; Cài đặt đổi tên "Tần suất sự kiện".
- **8 sự kiện ngày mới và 8 tình huống mới** chạy theo dữ liệu, luôn có lựa chọn an toàn (quyết định 31, mục 9.3); 4 thẻ Mẹo nghề mới (24 thẻ).
- **Hàng hiếm** (quyết định 32, mục 7.1, 9.3d): kho, 5 nguyên liệu, 4 công thức hiếm, màn "Lựa hàng" ở 3 gánh hàng quê theo giờ thật, khách lạ, Giỏ chợ, món hiếm ở quầy/bếp với "★ còn n", tiêu hao lúc Ra món.
- **Save v3** (thêm trường M4, ca dở của bản 0.3 chơi tiếp được), **bản 0.4.0** (PWA cache mới), **thư phiên bản 0.4.0** giải thích luật tip, quà làm quen 1 mảnh Trà tắc mật ong rừng + 1 phần Mật ong rừng.
- **Cân bằng**: thưởng tiền chuỗi "Ngày đầu ra phố" 85k → 45k để tỉ lệ thưởng giữ ≤ 35% sau luật tip mới (mục 9.4, 11.5).

**Điều kiện hoàn thành M4** (đã đạt)
- Unit test mới: `m4-tip`, `m4-frequency`, `m4-events`, `m4-incidents`, `m4-rare`, `m4-save` (nâng save thật của bản 0.3.0 đang dở ca lên v3 rồi chơi tiếp). Mô phỏng `integration-meta` thêm phiên hàng, nấu thử món hiếm, chọn cách an toàn, quy đổi hàng hiếm vào tỉ lệ thưởng (≤ 35% mỗi ngày thật), và các hạt giống khó.
- `npm test` và `npm run e2e` của M1–M3 vẫn xanh; save v1 và v2 vẫn nạp được; mã sao lưu v1/v2 dùng được ở bản 0.4.

### 14.4c M5 — Giao diện kiểu game nấu ăn (bản 0.4.2 → 0.5.0 → 0.5.1 → 0.5.2) [Đợt 0 và Đợt 1 đã làm]
Thiết kế chi tiết: `docs/tham-khao/m5-thiet-ke.md`; nghiên cứu giao diện, cảm giác thao tác, hiệu ứng của 25 game/dòng game nấu ăn và bán hàng: `docs/tham-khao/m5-nghien-cuu-giao-dien.md` (chỉ học cơ chế và cảm giác; hình, câu thoại, âm thanh tự làm — mục G của tài liệu đó). Hợp đồng kỹ thuật: `docs/kien-truc.md` mục 13.3 và 31.

**Đợt 0 (0.4.2) — bản mẫu để duyệt.** Trang "Phòng mẫu" (`mau.html`): bộ hình mới, màn gọi món có con dấu "ĐÃ CHỐT", bước Thái kiểu mới có thẻ bước, tay mẫu, con dấu và Dì Sáu phản ứng, màn ra món 5 hạng; công tắc Giảm chuyển động, Âm thanh, Khung thấp. Game chính không đổi hành vi. **Người dùng đã duyệt phong cách (02/10/2026)** và chốt: bật chế độ tập trung khi nấu; màn ra món khoảng 2 giây, chạm để bỏ qua; phiếu chấm giữ 2 giây; món hiếm dùng hình món nền + huy hiệu ★; thư "Có gì mới" 0.5.0 không quà.

**Đợt 1 (0.5.0) — Bếp và mini-game.**
- Bộ hình mới vào game: 13 nguyên liệu tươi (21 hình trạng thái), 29 đồ khô và chai lọ (5 hình trạng thái), 5 món, 14 dụng cụ và biểu tượng thao tác, 14 đạo cụ sân khấu lớn; nguyên liệu trên Thớt đổi sang hình đã sơ chế ngay khi xong bước.
- Bếp làm lại theo mục 6.3, 6.5b: Thớt gỗ với huy hiệu bước, bảng chọn cách sơ chế bằng thẻ hình, thẻ "Bước k/N" có tay mẫu, khung sân khấu mới (chấm bước, tường gạch, quầy gỗ), con dấu và Dì Sáu phản ứng sau mỗi bước, màn ra món 2,2 giây, chế độ tập trung ở màn cao dưới 760px.
- Cả 11 mini-game vẽ lại (hình to là nhân vật chính, dao lệch trên ngón tay, hạt và rung khi hợp lý) và thêm 5 thao tác DAP, XOAY, GOT, LAC, BAY (mục 6.4); nút toàn game chuyển kiểu "bánh kẹo"; 5 âm thao tác mới.
- Hướng dẫn lần đầu: lời tour Thớt nhắc thao tác mới; 5 tour trên thẻ bước của 5 thao tác mới (tự hiện cả với người chơi cũ).
- **Không đổi cân bằng**: id bước, par, w, chí mạng, giá làm lại, giá bán, giá vốn, `BALANCE` giữ nguyên (khóa bằng test so từng bước); save giữ v3, phiên nấu dở ở Thớt của bản cũ tự dựng lại bảng bước theo thao tác mới, giữ kết quả các bước đã làm.
- Thư "Có gì mới: bếp mới và 5 thao tác mới", không quà.

**Đợt 2 (0.5.1, chưa làm)**: Quầy (gọi món theo bản mẫu đã duyệt, thu tiền, QR, phiếu thu), HUD, cảnh phố có khách bán thân, thanh 4 khâu bằng biểu tượng, dây phiếu có hình món, phiếu chấm sao bật lần lượt, tình huống. **Đợt 3 (0.5.2, chưa làm)**: các màn ngoài ca (Chuẩn bị, Chợ Công Thức, Việc hôm nay, Hộp thư, Sổ công thức, Tổng kết, Gánh hàng quê…) và hình meta.

### 14.5 Đường cắt khi thiếu thời gian (cắt từ trên xuống)
1. Âm thanh.
2. Tình huống trong ca (giữ sự kiện ngày).
3. "Món của ngày" (đã cắt ở M2).
4. Chuỗi "Làm quen QR" (giữ QR và ảnh giả).
5. Bước chọn câu xin lỗi trong màn Xử lý phàn nàn.
6. Chuyển tab giữa các bước (thay bằng phục vụ tuần tự: làm xong món mới quay lại quầy).

**Không bao giờ cắt:** luồng 4 khâu và thanh 4 chấm; 3 lớp đơn (yêu cầu thật – phiếu – món); đọc lại đơn; báo tổng và thối tiền; Thớt sơ chế; các cơ chế bếp đang có (6 cơ chế gốc, từ 0.5.0 thêm 5 thao tác); phiếu chấm tách lỗi quầy/lỗi bếp; lưu cùng ca dở; điểm danh; nhiệm vụ ngày; hộp thư; chuỗi "Ngày đầu ra phố"; Shop 2 món; sự kiện 20/11 với Chè bưởi; unit test; các kịch bản e2e.

**Để sau, không làm ở MVP:** kho, hạn dùng, sơ chế đầu ca, nấu mẻ, bếp chạy nền; các cơ chế còn lại (LUC, BAY_DIA, VUOT_CHUOI, VE_DUONG, LAC_CHAO); ăn tại chỗ, 6 khách quen có tên, Sổ khách quen; máy POS, khuyến mãi, thẻ, tờ 1k/2k, chốt ca đếm két; nhân viên; đổi món bằng Tem; Kệ Đặc biệt, kệ xoay, Mảnh công thức (của Tủ Kỷ Niệm; M4 chỉ có mảnh cho 4 công thức hiếm); lịch tháng, nhiệm vụ tuần, chuỗi ngày, thành tựu, giftcode; trang trí theo chặng; "Món của ngày"; Chặng 2–7; thử thách ngày; `lab.html`, Sổ số liệu chi tiết; giờ máy chủ; backend, bảng xếp hạng, Web Push; Chế độ Học việc; nhạc nền. *(Tem, Quầy đổi và màu dù xe đã làm sớm ở M2.)*

### 14.6 GĐ2 (mục tiêu: Chặng 2–3 chơi được, LiveOps đầy đủ khi offline)
Hai mốc lịch: sự kiện **Giáng sinh 2026** và nội dung **Tết Đinh Mùi** chốt trước giữa tháng 01/2027.
1. **Chặng 2**: ăn tại chỗ, dọn bàn, đóng gói; 6 khách quen và Sổ khách; LUC, BAY_DIA, VUOT_CHUOI (KHUAY đã làm sớm ở 0.5.0: XOAY); Gỏi cuốn, Bún thịt nướng, Cơm tấm, Chè ba màu; kho theo lô FIFO kèm dự báo; đi chợ mặc cả; bếp 2 họng.
2. **LiveOps**: Giáng sinh, Tết (Bánh chưng); đổi món bằng Tem, nhân đôi Tem hai ngày cuối, "Món trở lại"; "Món của ngày"; Kệ Đặc biệt; Kệ Đặc sản; Mảnh công thức; nhiệm vụ tuần và Rương tuần; chuỗi ngày có vé nghỉ; thành tựu; lịch tháng và Vé Bù; quà quay lại; giftcode; Ca Hứng Khởi; `gifts.json` tải từ xa; **thử thách ngày theo seed chung** có thẻ chia sẻ.
3. **Chặng 3**: chọn mặt bằng; máy POS, in bếp, gọi số; khuyến mãi; QR động, thẻ, 1k/2k; chốt ca đếm két; thu ngân NPC và kèm cặp; phụ bếp và truyền nghề; sơ chế đầu ca, nấu mẻ; đơn app và đóng gói; kiểm tra ATTP; đối thủ Lâm; Phở bò tái.
4. **Chiều sâu**: thạo món cấp 4–5, nút Nếm, tình huống trong ca đầy đủ, tình huống order, đơn bất chợt, đòi hoàn tiền khi chờ quá lâu, "Mời trà đá", trang trí và Góc kỷ niệm, định giá ±20%, đơn tiệc, hũ ủ và nồi ninh, chơi lại ca có điều kiện.
5. **Đào tạo và công cụ**: Chế độ Học việc (khóa Thu ngân và khóa Bếp), Thử thách Thu ngân 60 giây, kiểm tra Mẹo nghề cuối tuần, `lab.html`, Sổ số liệu chi tiết, `tools/mo-phong.js`, thêm 40 thẻ Mẹo nghề.

### 14.7 GĐ3
- **Chặng 4–7**: sơ đồ bàn, khách nhóm, đặt bàn, dị ứng; trả sau với tạm tính, tách/gộp/chuyển bàn, thuế GTGT (mô phỏng), xuất hóa đơn cho doanh nghiệp, màn hình bếp, set menu, Pass, bếp chia trạm; thực đơn nhiều món, VE_DUONG, LAC, flambé, Đũa Vàng; Chuỗi và Tái khởi nghiệp; Hành trình 3 miền.
- **Backend**: lưu mây, mã chuyển máy, bảng xếp hạng Giải Bếp Tuần (xác thực bằng mô phỏng tất định), LiveOps có chữ ký, xác thực phần thưởng; Web Push.
- Thẻ Đầu Bếp mùa; Tủ Kỷ Niệm; mã bài thi cho người đào tạo; khóa Học việc Phục vụ và Quản lý.
- Thử nghiệm quảng cáo tặng thưởng có trần (sau khi đã tìm hiểu quy định, mục 16).

---

## 15. Rủi ro và cách giảm thiểu

| Rủi ro | Mức | Cách giảm thiểu |
|---|---|---|
| Mỗi khách mất 40–55 giây thao tác, ca dài và mỏi tay | Cao | Nhịp khách tính từ par (ρ ≤ 0,9); bánh mì còn 6 bước; thẻ gợi ý bỏ qua được; "Tự làm" bước phụ từ thạo cấp 2; GĐ2 thêm sơ chế đầu ca, nấu mẻ, POS và nhân viên. Đo số lần chạm và thời lượng ca trên điện thoại thật trước khi chốt số (`docs/can-bang.md` mục 15) |
| Tính nhẩm và thối tiền làm khó người sợ toán | Vừa | Giá tròn 5.000đ; ngày 1–3 hiện "Cần thối"; Hỗ trợ tính tiền; báo thiếu hoặc thối dư chỉ mất tiền, không mất sao |
| Hỗ trợ trở thành lựa chọn luôn có lợi | Vừa | Hỗ trợ thao tác bỏ huy hiệu Không tì vết và không đếm nhiệm vụ Hoàn hảo; Hỗ trợ tính tiền không đếm "Quầy chuẩn" và nhiệm vụ Quầy; trần tổng hệ số vùng ×1,6 |
| Người chơi "làm ẩu vẫn có tiền" vì khách đã trả trước | Vừa | Chất lượng tác động qua tip, danh tiếng, sao trung bình (quyết định lượng khách), làm lại và hoàn tiền. Mô phỏng phải cho thấy người chơi 4,7 sao lãi hơn người chơi 3,8 sao ít nhất 25% |
| Bỏ hẳn nguyên liệu phụ lợi hơn lấy mà không sơ chế | Thấp | Theo dõi bằng số liệu; nếu bị lợi dụng thì tăng phạt "thiếu phụ" hoặc đặt trần hạng Được |
| Gian lận có lời (thu dư, thối thiếu) | Thấp | Luật bất đối xứng: báo dư luôn bị phát hiện; thối thiếu bị review muộn |
| Game biến thành bài giảng | Vừa | Mẹo nghề tối đa 2 câu, không dừng game, tối đa 1 thẻ mỗi ca, tắt được. Nội dung đào tạo bài bản chỉ nằm ở Chế độ Học việc tùy chọn |
| Cử chỉ bị trình duyệt nuốt (cuộn trang, zoom, vuốt quay lại, nhấn giữ lâu); độ trễ cảm ứng | Cao | Chặn cuộn và nhấn giữ trên sân khấu mini-game; `pointercancel` coi như thả tay; tránh mép màn hình 16px; đo bằng `performance.now()`; không chấm theo âm thanh; thử trên Android giá rẻ và iOS |
| Thái trên điện thoại khó chính xác vì ngón tay che vạch | Vừa | "Kéo để ngắm, nhấc tay để cắt", vạch dao lệch lên 40 px, ngưỡng theo px, nguyên liệu rộng ≥ 280 px |
| Chuột khó chà | Thấp | Khi dùng chuột thì ngưỡng CHA giảm 15%; có phím Space |
| iOS tự xóa dữ liệu sau 7 ngày; trình duyệt trong Zalo/Facebook mất dữ liệu | Cao | Xin lưu trữ bền vững; nhắc thêm vào màn hình chính từ ngày 2; mã sao lưu và nhắc mỗi 7 ngày; gợi ý mở bằng Chrome hoặc Safari |
| Sửa save, chỉnh đồng hồ máy | Vừa | Checksum, làm sạch dữ liệu khi nạp; khóa quà khi lùi giờ, không phạt; không có thưởng giá trị thật trước khi có máy chủ ở GĐ3 |
| Service worker giữ bản cũ; precache thiếu module | Vừa | Test kiểm tra phiên bản và danh sách precache; chỉ báo cập nhật ở màn chính hoặc màn tổng kết |
| Lạm phát phần thưởng; món mới mạnh hơn làm món cũ mất giá | Vừa | Thưởng khai báo theo TNC, trần 35%; quy tắc món ngang giá trị 10%; mùa sự kiện không tăng giá; luôn có nơi tiêu Muỗng Vàng |
| FOMO với món sự kiện | Vừa | Món chính miễn phí qua chuỗi, chỉ cần 3 ngày; giữ vĩnh viễn; "Món trở lại" năm sau; Tem dư đổi được; không gacha |
| Phạm vi MVP phình to | Cao | Chia M1/M2/M3; bám đúng danh sách, đường cắt và các mục "không bao giờ cắt" |
| Vẽ nguyên liệu tốn công hơn dự kiến (khoảng 30 icon, nhiều cặp bẫy) | Vừa | Tính "bộ icon SVG" thành một đầu việc riêng; mỗi ô luôn có nhãn chữ; cặp bẫy khác màu và hình |
| Pháp lý và bản quyền | Cao | Chỉ học *cơ chế* của các game tham khảo; không dùng tên, nhân vật, hình, câu thoại, mã nguồn của họ, không dùng bản sửa đổi trái phép. Không dùng tên hay giao diện sản phẩm của công ty người dùng, ngân hàng, ví điện tử, app giao hàng thật; chỉ gọi chung là "máy POS", "QR chuyển khoản", app hư cấu. QR là hoa văn giả không quét được; tờ tiền cách điệu có chữ "TIỀN GAME". Không bán vật phẩm ngẫu nhiên bằng tiền thật. Xem mục 16 |
| Sai nội dung chuyên môn hoặc ngày âm lịch | Vừa | Dùng bảng âm lịch tra sẵn 2026–2030 và kiểm chéo; nhờ bếp trưởng hoặc kế toán duyệt thẻ Mẹo nghề; thuế và phí ghi rõ là "mô phỏng" |
| Chính tả, định kiến vùng miền, nội dung nhạy cảm | Vừa | Gom chuỗi vào `src/data`; soát bằng ảnh chụp; nhờ người bản xứ từng vùng đọc duyệt; dị ứng và lừa đảo chỉ dạy cách phòng tránh, giọng văn nhẹ; không có đồ uống có cồn ở MVP |
| Dùng game để xếp loại nhân sự | Thấp | Ghi rõ game chỉ để bổ trợ và ôn luyện |

---

## 16. Kiểm tra trước khi phát hành

Danh sách này phải xong **trước khi đưa game ra công khai** hoặc **trước khi dùng để đào tạo chính thức**. Tài liệu này không phải ý kiến pháp lý; các văn bản nêu dưới đây cần được kiểm tra lại bản mới nhất.

| # | Việc cần kiểm tra | Chi tiết |
|---|---|---|
| 1 | **Tra trùng nhãn hiệu** | Tra tên game ("Bếp Khởi Nghiệp", "Từ Xe Đẩy Tới Nhà Hàng") và tên vật phẩm ("Muỗng Vàng", "Đũa Vàng") trên cơ sở dữ liệu của Cục Sở hữu trí tuệ và trên các cửa hàng ứng dụng; tránh trùng với giải thưởng hoặc chương trình ẩm thực có thật. Không dùng khuôn tên dễ gây nhầm với game khác |
| 2 | **Quy định về trò chơi điện tử** | Phát hành công khai có thể thuộc quy định về cấp phép, phân loại trò chơi điện tử trên mạng (tham khảo Nghị định 147/2024/NĐ-CP, cần kiểm tra lại hiệu lực và phạm vi). Kiểm tra trước khi thu tiền, gắn quảng cáo hoặc mở bảng xếp hạng |
| 3 | **Dữ liệu cá nhân** | Save chỉ nằm trên máy người chơi. Sổ số liệu và mã bài thi của học viên có thể là dữ liệu cá nhân: MVP chỉ xuất số liệu ẩn danh, không gắn tên thật. Trước khi có máy chủ hoặc thu thập dữ liệu học viên, đối chiếu quy định hiện hành về bảo vệ dữ liệu cá nhân, soạn thông báo quyền riêng tư |
| 4 | **Sở hữu trí tuệ với công ty** | Nếu dùng game để đào tạo nội bộ, kiểm tra điều khoản sở hữu trí tuệ trong hợp đồng lao động và xin phép công ty trước. Không mô phỏng luồng màn hình đặc thù, tên, logo của sản phẩm công ty |
| 5 | **Tên thương hiệu thật** | Test chữ cấm quét mã nguồn: tên game tham khảo, tên sản phẩm của công ty người dùng, ngân hàng, ví điện tử, app giao hàng thật. Ngân hàng, ví, app giao hàng trong game đều là tên hư cấu |
| 6 | **Tiền và QR** | Tờ tiền cách điệu có chữ "TIỀN GAME", không quốc huy, không chân dung, không dòng chữ của ngân hàng trung ương, không dùng tỉ lệ kích thước tờ thật. QR là hoa văn giả không giải mã được, có chữ "QR GAME" |
| 7 | **Hình ảnh quảng bá** | Emoji của hệ điều hành có bản quyền thiết kế: ảnh cửa hàng ứng dụng và biểu tượng dùng SVG tự vẽ |
| 8 | **Nội dung chuyên môn** | Thẻ Mẹo nghề được người làm bếp hoặc kế toán duyệt; mọi con số ghi "số liệu minh họa"; thuế GTGT và phí ghi "mô phỏng" |
| 9 | **Ngày âm lịch** | Kiểm chéo bảng âm lịch 2026–2030 với lịch vạn niên (đặc biệt 23 tháng Chạp năm Bính Ngọ) |
| 10 | **Quảng cáo, giao dịch** | MVP và GĐ2 không có quảng cáo và giao dịch tiền thật. Nếu GĐ3 thử quảng cáo tặng thưởng: tìm hiểu quy định trước, tắt ở chế độ đào tạo |

---

## Phụ lục A. Thay đổi chính của v0.2 so với bản v0.1

| Nội dung | v0.1 | v0.2 |
|---|---|---|
| Trục gameplay | Order → báo tổng → trả tiền → thối tiền (không đúng nhãn người dùng) | **Luồng 4 khâu Order → Thanh toán → Tính tiền → Làm đồ**, thanh tiến trình 4 chấm, phiếu thu |
| Sơ chế | Chuỗi bước do game ép | **Thớt sơ chế**: tự chọn thứ tự (ràng buộc `after`), chọn cách sơ chế (sai −15), "Ra món" luôn bấm được, bước chưa làm = 0 điểm |
| Bánh mì ốp la | 8 bước, 28 giây | 6 bước, 22 giây; hành lá không sơ chế riêng; bước nướng bánh chạy tự động |
| Đọc lại đơn | Tùy chọn, +5 điểm quy trình | Bắt buộc; khách bắt mỗi lỗi với xác suất 80%; bỏ "điểm quy trình" |
| Nhịp khách | 55 − 2 × (ngày − 1) giây, tràn hàng chờ | 1,15 × thời gian phục vụ kỳ vọng, cao điểm ×0,9, ρ ≤ 0,9 có test |
| Đơn nhiều phần | Mỗi phần một lượt nấu | 1 dòng số lượng n = 1 lượt nấu, par × (1 + 0,4(n − 1)) |
| Sao | Làm tròn thường; so cả phiếu với món | Làm tròn xuống; chỉ so yêu cầu thật với món làm ra; "Lệch phiếu" không trừ sao |
| Phạt nguyên liệu | Một lỗi có thể bị phạt 2–3 lần | Mỗi nguyên liệu 1 dòng phạt: trái ghi chú > bẫy > thiếu > thừa |
| Canh lửa | Thang rời, thiếu nhánh "muộn nhưng chưa cháy" | Hàm liên tục đối xứng quanh tâm; vượt 1,0 là cháy |
| Thối gọn | Thuật toán tham lam | Quy hoạch động trên két thật |
| Tip | 10% hóa đơn, làm tròn 1.000đ | Bội 5.000đ (5.000đ / 10.000đ), bỏ vào hũ tip |
| Ví | "Tiền"; vốn 200k trùng quỹ lẻ | Ví "Tiền quán" 200.000đ; quỹ lẻ 200.000đ tách riêng trong két |
| Máy tính cầm tay | Ngày 3, hiện tiền thối | Ngày 7, chỉ cộng tổng |
| Dân văn phòng | Từ ngày 3 (QR chưa mở) | Từ ngày 4 |
| Hỗ trợ | 4 công tắc, "không giảm phần thưởng" | 2 công tắc ở MVP; Hỗ trợ thao tác bỏ Không tì vết; trần hệ số vùng ×1,6 |
| Bước Chọn | Có thể "Tự làm", tự kết thúc | Không "Tự làm", không tự kết thúc; "Tự làm" bước phụ mở từ thạo cấp 2 |
| Món sự kiện | Giá ×1,3 trong mùa; Chè bưởi "nếu còn thời gian" | Giá không đổi, mùa chỉ tăng Tem và danh tiếng; Chè bưởi và sự kiện 20/11 nằm trong MVP |
| Shop MVP | 1 món | 2 món: Bánh tráng trộn, Cà phê sữa đá |
| Thưởng Chặng 1 | "22%", bỏ sót thư, chuỗi, Tuần Khai Trương (thực tế tới 75% ngày đầu) | Tuần Khai Trương tặng hiện vật, thư chào mừng không tặng tiền, TNC tăng theo ngày game; 20–31% mỗi ngày, 23,4% cả chặng |
| Phạm vi MVP | Một khối, ước 5.000–6.000 dòng | 3 mốc M1/M2/M3, ước 9.000–12.000 dòng |
| Giữ chân | — | Đặt tên xe, khách quen quay lại, Món của ngày, mục tiêu sau khi đủ điều kiện, thử thách ngày (GĐ2) |
| Thuật ngữ | Mượn tên một game tham khảo để gọi kiểu bếp; viết tắt MV; Hoàn mỹ; phục khắc; VSATTP; cay xè; lẫn hòm/rương; một phương án tên cùng khuôn với tên game khác | "Bếp thao tác từng bước"; Muỗng Vàng; Không tì vết; Món trở lại; ATTP; cay xé lưỡi; thống nhất "Rương"; loại phương án tên dễ gây nhầm |
| Bẫy rau | Húng quế – rau răm | Rau húng lủi – rau răm |
| Pháp lý | Rải rác | Mục 16 "Kiểm tra trước khi phát hành" |
| Kỹ thuật | Chi tiết môi trường máy, danh sách file quan trọng | Chỉ tóm tắt, dẫn sang `docs/kien-truc.md` |

---

## Phụ lục B. Thay đổi v0.3: đồng bộ với bản chơi được M1 + M2

Các mục dưới đây là chỗ code M1 + M2 khác đặc tả v0.2. Tài liệu đã sửa theo code (code và `docs/kien-truc.md` là chuẩn).

| Nội dung | Đặc tả v0.2 | Bản chơi được (v0.3) | Mục |
|---|---|---|---|
| Lộ trình | M1, M2, M3 đều là kế hoạch | M1, M2 đã xong; M3 làm sau đó (PWA offline, sao lưu, Cài đặt, âm thanh, tình huống trong ca, Sổ tay nghề, Sổ công thức) và đã xong ngày 30/09/2026 (mục 14.4) | Tóm tắt, 14 |
| Độ khó đơn | 2 dòng từ ngày 4, số lượng 2 từ ngày 5, 3 dòng từ ngày 7 | Từ ngày 3 đã có nhiều dòng (70/25/5%) và số lượng 1–3; ghi chú 20% mỗi dòng (35% từ ngày 5); tách dòng từ ngày 5; phụ thu từ ngày 6 | 3.2 |
| Khách quen quay lại | Từ ngày 3, 25% mỗi ca; chỉ nói "như mọi khi"; Sổ khách quen, +1 danh tiếng | Từ ngày 2, 15% mỗi ca; chào "Như mọi khi" rồi vẫn nói món; chưa có Sổ khách quen và +1 danh tiếng | 3.4 |
| Báo tổng dư | −1,5 sao | −1 sao; báo đúng tổng phiếu ghi thừa thì quay lại sửa phiếu, không trừ sao | 4.1, 5.9 |
| Hệ số lượng khách | ×1,15 / ×1,0 / ×0,85 / ×0,7, lệch tối đa ±1 | Từ ngày 2 và từ 5 đánh giá: ≥ 4,5 sao +1 khách, < 3,5 sao −1 khách | 6.9 |
| Thạo cấp 3 | Vùng +10% và +1 danh tiếng mỗi món Tuyệt hảo | Chỉ vùng +10% | 6.10 |
| Hỗ trợ thao tác | Bỏ Không tì vết | Bỏ Không tì vết và trần hạng Ngon; chuỗi, việc đếm mức thay thế | 6.12 |
| Cà phê sữa đá bằng 60 Muỗng Vàng | Đề xuất | Không làm; Muỗng Vàng tiêu vào đổi việc và màu dù xe (làm sớm) | 6.14, 7.1, 11.1 |
| Chuỗi sự kiện 20/11 | 3 bước (10 Muỗng Vàng, +10 danh tiếng, nấu thử Chè bưởi) | 5 bước "Nồi chè tri ân", 150 Tem, cổng ngày chơi `[1, 1, 2, 2, 3]`, bước 5 tặng Chè bưởi | 7.3 |
| Tem và Quầy đổi | GĐ2 | Có ở MVP (Phấn Trắng); Tem dư 100 = 0,2 TNC, trần 1 TNC mỗi sự kiện | 7.3, 7.4, 11.1 |
| Sự kiện ngày | Trời mưa, Nắng nóng | Thêm Ngày lãnh lương (tip ×1,5) và Chợ phiên (khách ×1,3, trần 10) | 9.3 |
| C1 bước 7 | Có Trang 1 Sổ tay của Dì Sáu | Chưa có (GĐ2) | 9.4 |
| Quà lễ Tết | GĐ2 | Đã có trong dữ liệu (88 Muỗng Vàng + 1 TNC, 06/02/2027) | 9.5 |
| Khóa quà khi lùi giờ | M3 | Đã làm ở M2 | 9.2, 13 |
| Khóa một tab, `?devNow` lưu riêng, nút Back | Chưa có | Đã làm ở vòng soát lỗi M2 | 13 |
| "Món của ngày" | M2 | Không làm (đường cắt), dời GĐ2 | 10.D, 14 |
| Nhóm thẻ "Định lượng chuẩn" | Bếp | Kho | 12 |

---

## Phụ lục C. Thay đổi v0.4: M4 (bản game 0.4.0)

Thiết kế chi tiết và lý do: `docs/tham-khao/m4-thiet-ke.md`; tư liệu thể loại (nguyên tắc sự kiện, phạt công bằng, hàng hiếm): `docs/nghien-cuu-the-loai-game.md`. Hợp đồng kỹ thuật: `docs/kien-truc.md` mục 19–22. Số liệu: `docs/can-bang.md` mục 7, 9, 10, 14.1–14.5, 15, 16.

| Nội dung | v0.3 (bản 0.3.0) | v0.4 (bản 0.4.0) | Mục |
|---|---|---|---|
| Tip | 5.000đ khi 5 sao; 10.000đ nếu có món Không tì vết, khách khó tính, chuỗi "Quầy chuẩn" ≥ 5; Ngày lãnh lương ×1,5 | 5.000đ duy nhất khi khách 5 sao **và** hóa đơn khách thực trả từ 20.000đ; thưởng thay thế bằng danh tiếng (khó tính) và lượt Giỏ chợ (chuỗi Quầy chuẩn); Ngày lãnh lương khách gọi thêm món | 0.2 (30), 6.9 |
| Phạt vì sự kiện | "Không bao giờ phạt ngẫu nhiên" | Được phạt khi có nguyên nhân phòng được hoặc báo trước, luôn có lựa chọn an toàn, có trần mỗi sự kiện và mỗi ngày thật, tốt chiếm đa số, không 2 xấu liền, mức Ít không phạt | 0.2 (31), 9.3, 11.6 |
| Sổ lãi lỗ ca | Chưa tách tiền sự kiện | Thêm "Tiền từ sự kiện" (vào ví lúc tất toán) và "Phạt, chi sự kiện" (trừ ví ngay); bất biến ví giữ nguyên | 9.3 |
| Tần suất sự kiện | Sự kiện ngày 30%/ngày; tình huống tối đa 1 mỗi ca, 50/35/15% | Sự kiện ngày 65% + bảo hiểm (thực khoảng 74%); tình huống tối đa 2 mỗi ca, thực khoảng 80/60/40% ca có ≥ 1; Cài đặt "Tần suất sự kiện" áp cho cả sự kiện ngày | 0.2 (33), 9.3 |
| Sự kiện ngày | 4 (Trời mưa, Nắng nóng, Ngày lãnh lương, Chợ phiên; 30/30/20/20) | 12: thêm Hội thi xe sạch, Văn phòng đặt 3 ly, Đại lý tài trợ, Tắc lên giá, Tiền điện nước, Cúp điện, Trật tự đô thị, Kiểm tra vệ sinh ATTP (trọng số cũ 13/13/10/10) | 9.3a |
| Tình huống trong ca | 3 | 11: thêm Tiền nghi giả, Người giao hàng, Gas hết, Khách quên ví, Ve chai, Đoàn khách hỏi đường, Khách quê gửi quà, Cô bán dạo (chạy theo dữ liệu) | 9.3b |
| Thẻ Mẹo nghề | 20 | 24 (Soi tiền trước khi thối, Thấy tiền về mới giao món, Kiểm hàng trước khi nhận, Giữ lối đi cho người đi bộ) | 12 |
| Nguồn công thức | 4 nguồn | Thêm nguồn 5 "Công thức hiếm": 4 món, mở bằng 3 mảnh + nấu thử đạt hạng Được | 7.1 |
| Hàng hiếm | Không có | Kho 5 nguyên liệu (6 phần/loại, 6 phần + 3 mảnh mỗi ngày thật); gánh hàng quê 05:00–09:00, 11:00–13:30, 17:30–21:00 với "Lựa hàng"; khách lạ ca đầu mỗi ngày thật; Giỏ chợ có bảo hiểm công khai; món hiếm trừ kho mỗi phần lúc Ra món | 0.2 (32), 9.3d |
| Chuỗi "Ngày đầu ra phố" | Bước 4 / 5 / 6: 15.000 / 30.000 / 30.000đ (cả chuỗi 85.000đ) | 10.000 / 15.000 / 10.000đ (cả chuỗi 45.000đ) để tỉ lệ thưởng ≤ 35% sau luật tip mới | 9.4, 11.5 |
| Trần phạt ở mục 11.6 | Ghi "không quá 20% doanh thu ca" (lệch code) | min(10% doanh thu dự kiến, 0,5 TNC), khớp code; thêm trần ngày thật 1 TNC | 11.6 |
| Save | `STATE_VERSION = 2` | `STATE_VERSION = 3`; save v1/v2 (kể cả ca đang dở của bản 0.3) nâng lên v3 khi nạp; mã v3 đưa vào bản 0.3 báo "bản mới hơn" | 14.4b |
| Phiên bản và thư | 0.3.0, không có thư riêng | 0.4.0; thư "Có gì mới" giải thích luật tip, sự kiện mới, hàng hiếm; quà làm quen 1 mảnh Trà tắc mật ong rừng + 1 phần Mật ong rừng (chỉ save cũ nhận) | 9.5, 14.4b |

## Phụ lục D. Thay đổi v0.5: M5 Đợt 1 (bản game 0.5.0)

Thiết kế chi tiết: `docs/tham-khao/m5-thiet-ke.md`. Hợp đồng kỹ thuật: `docs/kien-truc.md` mục 13.3, 14, 31. Số liệu: `docs/can-bang.md` mục 7.1.

| Nội dung | v0.4 (bản 0.4.x) | v0.5 (bản 0.5.0) | Mục |
|---|---|---|---|
| Cơ chế bếp | 6 cơ chế; gọt, trộn, khuấy, lắc mượn CHA; đập trứng, thêm đá, lăn bột mượn CHAM | 11 cơ chế: thêm DAP (đập trứng hai nhịp), XOAY (vẽ vòng), GOT (vuốt theo dải vỏ), LAC (kéo lên xuống), BAY (kéo thả vào ly); 15 bước đổi cơ chế, giữ id, par, w | 0.2 (15), 6.4, 6.14 |
| Giới hạn giờ mỗi bước | 2,5 × par | 5 thao tác mới: max(2,5 × par, sàn theo số lượng); par không đổi | 6.4 |
| Trước mỗi bước | Thẻ gợi ý chữ 0,8 giây | Thẻ "Bước k/N" có hình to, động từ, bàn tay mẫu; 1,1 giây hoặc chạm để vào; từ lần nấu thứ 3 chỉ còn ruy băng gọn | 6.5b |
| Kết quả bước | Viên chữ "Tên: Tốt 85" trôi lên | Con dấu theo 4 hạng trên sân khấu, hạt và sao bay về chấm bước, Dì Sáu phản ứng; giữ sân khấu khoảng 0,7 giây | 6.5b |
| Ra món | Hộp trắng, hình 132px, 1,2 giây | Màn ra món 2,2 giây (1,4 giây khi giảm chuyển động), chạm để bỏ qua | 6.5b, 6.13 |
| Thớt sơ chế | Lưới thẻ chữ, trạng thái bằng lớp phủ CSS | Thớt gỗ, nguyên liệu 64–72px đổi hình theo bước đã làm, bước là huy hiệu tròn có biểu tượng thao tác | 6.2, 6.3 |
| Màn thấp | Panel bếp 270–320px ở 360×600 | Chế độ tập trung: ẩn dải khách và thanh 4 khâu khi đang nấu (cao dưới 760px) | 6.5b |
| Hình, nút, font | Icon nét 2,5 màu phẳng; nút phẳng; font hệ thống | Viền mực dày 3, khối 3 tông, bóng đất; nút bánh kẹo; tiêu đề Baloo 2 tự lưu | 6.5b |
| Hướng dẫn lần đầu | 23 tour | 28 tour (thêm 5 tour thẻ bước của thao tác mới) | — |
| Phiên bản và thư | 0.4.1 / 0.4.2, không có thư riêng | 0.5.0; thư "Có gì mới: bếp mới và 5 thao tác mới", không quà | 9.5, 14.4c |
