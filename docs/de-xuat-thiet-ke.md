# Đề xuất thiết kế game F&B "Bếp Khởi Nghiệp" (tên làm việc)

Phiên bản 0.2 · ngày 29/09/2026

- Bản này biên tập lại bản đề xuất v0.1 (`docs/tham-khao/ban-tong-hop-v0.1.md`) và áp dụng các sửa đổi hợp lý trong bản phản biện (`docs/tham-khao/phan-bien-v0.1.md`).
- Hợp đồng kỹ thuật để code MVP nằm ở `docs/kien-truc.md`. Nếu hai tài liệu lệch nhau về tên hàm, cấu trúc dữ liệu hay hằng số, **`kien-truc.md` được ưu tiên** và tài liệu này sẽ được sửa theo.
- Bảng số cân bằng ban đầu của Chặng 1 nằm ở `docs/can-bang.md`.

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
1. **Nhiệm vụ hằng ngày**: 3 việc mỗi ngày (Quầy, Bếp, Chất lượng) và một Rương ngày.
2. **Điểm danh nhận quà**: 7 ô tích lũy, lỡ ngày không mất; vòng đầu "Tuần Khai Trương" tặng hiện vật.
3. **Sự kiện ngẫu nhiên**: sự kiện ngày báo trước và tình huống trong ca, luôn có lựa chọn an toàn.
4. **Chuỗi nhiệm vụ**: chuỗi chính "Ngày đầu ra phố" là cổng lên chặng; chuỗi "Làm quen QR".
5. **Quà hệ thống**: Hộp thư với thư chào mừng, quà lễ, quà đời thường, nhiệm vụ quên nhận.

Kèm theo là **Shop công thức** (mua món mới bằng Tiền quán, được nấu thử miễn phí) và **món đặc biệt chỉ lấy qua sự kiện có thời hạn** (MVP có Chè bưởi của sự kiện Tri ân 20/11).

**Đề xuất thêm nổi bật** (chi tiết ở mục 10):
- [MVP] **Thớt sơ chế**: người chơi tự chọn sơ chế nguyên liệu nào trước, tự chọn cách sơ chế; quên sơ chế là bị chấm.
- [MVP] **Phiếu chấm tách "Lỗi tại quầy" và "Lỗi tại bếp"**: người chơi và người đào tạo biết phải sửa ở đâu.
- [MVP] **Chuyển khoản giả và Loa báo tiền**: dạy "ảnh chụp màn hình không phải là tiền".
- [MVP] **Đặt tên xe đẩy ở ngày 1**, **khách quen cô Thu, bạn Nam** quay lại với câu "như mọi khi nha".
- [MVP] **Mục tiêu sau khi đủ điều kiện lên chặng**: sưu tập "Không tì vết", thạo cấp 3, kỷ lục ca, đếm ngược sự kiện.
- [GĐ2] **Thử thách ngày theo seed chung** kèm thẻ kết quả để chia sẻ; **Chế độ Học việc** cho người đào tạo.
- [GĐ2] Sơ chế đầu ca, nấu theo mẻ, chốt ca đếm két, voucher, thu ngân NPC.

**Phạm vi MVP**: chỉ Chặng 1 "Xe đẩy đầu hẻm", chia 3 mốc, mỗi mốc là một bản chạy được:

| Mốc | Nội dung chính |
|---|---|
| **M1** – lõi chơi được | 2 món có sẵn; luồng 4 khâu với tiền mặt; 6 mini-game và Thớt sơ chế; phiếu chấm tách lỗi quầy/lỗi bếp; tổng kết ca; lưu tiến trình; unit test; e2e |
| **M2** – kinh tế và LiveOps | QR, ảnh chuyển khoản giả, Loa báo tiền; Shop 2 món và nấu thử; 5 nâng cấp; thạo món cấp 1–3; điểm danh 7 ô; 3 nhiệm vụ ngày và Rương ngày; hộp thư; 2 chuỗi; sự kiện ngày; sự kiện 20/11 với Chè bưởi |
| **M3** – hoàn thiện | PWA offline; khóa quà khi lùi giờ; mã sao lưu; tình huống trong ca; 20 thẻ Mẹo nghề và Sổ tay nghề; Sổ công thức; Cài đặt; âm thanh |

---

## 0. Quy ước và các quyết định hợp nhất

### 0.1 Quy ước dùng trong tài liệu
- **Chặng 1–7** chỉ tiến trình trong game. **MVP / GĐ2 / GĐ3** chỉ lộ trình phát triển. **M1 / M2 / M3** là ba mốc bên trong MVP.
- **Ngày game**: ở Chặng 1–2, một ngày game là một ca bán. Từ Chặng 3, một ngày game có 2 ca (trưa và tối).
- **Ngày thật** là ngày theo lịch, dùng cho điểm danh, nhiệm vụ, sự kiện. Ngày đổi lúc **04:00 giờ Việt Nam (UTC+7)**, tính từ UTC nên không phụ thuộc múi giờ của máy.
- **Tiền** lưu bằng số nguyên đồng. Cách hiển thị: hóa đơn ghi "37.000đ", thanh trạng thái ghi "37k", số lớn ghi "1,25tr".
- **Tiền quán** là tên ví tiền vận hành của người chơi. **Muỗng Vàng** là tiền cao cấp, chỉ kiếm trong game. Tài liệu này luôn viết đầy đủ "Muỗng Vàng"; chữ viết tắt MV chỉ dùng trong code. Trên giao diện luôn hiện biểu tượng muỗng kèm chữ "Muỗng Vàng".
- **TNC (Thu nhập chuẩn một ca)**: lãi ròng một ca của người chơi trung bình (khoảng 4,2 sao) ở chặng hiện tại. Ở Chặng 1, TNC tăng theo ngày game (bảng ở mục 11.2). Phần thưởng bằng tiền được khai báo theo bội số TNC. TNC là từ nội bộ, không hiện cho người chơi.
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
| 15 | Số mini-game ở MVP | **6 cơ chế gốc**: CHON, CHA, THAI, CHAM, LUA, ROT; 6 cơ chế còn lại ở GĐ2–3 | Đủ cho 5 món MVP. Mỗi cơ chế khoác được nhiều "lớp vỏ" thao tác |
| 16 | Món ở MVP | **5 món**: Bánh mì ốp la, Trà tắc (có sẵn); Bánh tráng trộn, Cà phê sữa đá (Shop); Chè bưởi (sự kiện 20/11) | Shop có lựa chọn thật; người dùng thấy được món chỉ lấy qua sự kiện; cả 5 món chỉ dùng 6 cơ chế có sẵn |
| 17 | Kho ở MVP | **Không có kho.** Giá vốn bị trừ khi chốt bước Chọn. Kho theo lô và sơ chế đầu ca ở GĐ2 | Giữ MVP tập trung vào trục 4 khâu |
| 18 | Tính tổng tiền ở Chặng 1 | **Tự nhẩm**. Nâng cấp "Máy tính cầm tay" từ ngày 7, chỉ cộng tổng, không hiện tiền thối. Máy POS là mốc của Chặng 3 | Không tự động hóa quá sớm đúng khâu người dùng muốn luyện |
| 19 | QR ở Chặng 1 | **Từ ngày 4, khoảng 25–30% khách.** Từ ngày 7 có 4% ảnh chụp chuyển khoản giả | Bài học có thật, chi phí làm thấp |
| 20 | Mệnh giá tiền | **Chặng 1–2: 7 tờ từ 5k đến 500k** (giá luôn tròn 5.000đ). Từ Chặng 3 thêm tờ 1k và 2k khi có khuyến mãi % | Két gọn trên màn hình nhỏ |
| 21 | Lãi của món đặc biệt | **Lãi trên mỗi giây nấu không vượt món mua bằng Tiền quán tốt nhất cùng chặng quá 10%**. Mùa sự kiện **không tăng giá bán**, chỉ tăng Tem và danh tiếng | Món sự kiện không trở thành "bắt buộc phải có" |
| 22 | Ngân sách thưởng ngoài bán hàng | **Mục tiêu 20–30%, trần 35%** tổng thu trong ngày thật (lãi bán hàng + thưởng) | Bán hàng vẫn là nguồn thu chính. Chặng 1 ước tính 20–31% mỗi ngày, 23,4% cả chặng (mục 11.5) |
| 23 | Người dẫn dắt | **Dì Sáu** (cố vấn, kiêm mascot bếp) và **Anh Khoa** (kỹ thuật viên máy bán hàng) | Một cố vấn có cá tính, không trùng NPC của game tham khảo |
| 24 | Trần chất lượng khi nhân viên làm | **88**, thấp hơn ngưỡng Tuyệt hảo | Luật "Ra tay": món Tuyệt hảo chỉ đến từ tay chủ quán |
| 25 | Cách vẽ | **DOM/CSS + SVG**; nguyên liệu là SVG tự vẽ kèm nhãn chữ | Chữ Việt sắc nét, test được bằng `data-testid`; cặp bẫy phân biệt rõ |
| 26 | Cấu trúc code | `src/core` (logic thuần), `src/data` (nội dung, cân bằng), `src/ui` | Test logic bằng Node, cân bằng bằng dữ liệu |
| 27 | Quảng cáo | **Không có ở MVP và GĐ2.** GĐ3 thử quảng cáo tặng thưởng tùy chọn, trần 10% thu nhập ngày, tắt ở chế độ đào tạo | Đo tỉ lệ giữ chân khi chưa có quảng cáo trước |
| 28 | Cách kết thúc ca | **Số khách cố định, sinh bằng seed.** Ca kết thúc khi khách cuối cùng rời đi | Công bằng; tải lại trang không đổi được khách |
| 29 | Nhịp khách | **Khoảng cách giữa hai khách = 1,15 × thời gian phục vụ kỳ vọng**, giờ cao điểm ×0,9 | Một người làm hết mọi việc thì không làm song song được; hệ số tải ρ ≤ 0,9 có test |
| 30 | Tip | **Bội 5.000đ**: 5 sao được 5.000đ; có món Không tì vết hoặc khách khó tính được 10.000đ; khách bỏ vào **hũ tip** | Chặng 1–2 không có tờ 1k, 2k; tip không làm rối két |

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

- **Thanh tiến trình 4 chấm** hiện trên đầu mỗi khách (và trên thẻ khách ở dây phiếu). Chấm sáng dần theo khâu; chấm có dấu "!" khi khâu đó có lỗi.
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

Tín hiệu: có khách mới thì kêu chuông và hiện chấm đỏ trên tab Quầy; khách đầu hàng còn dưới 30% kiên nhẫn thì máy rung nhẹ (30 ms); phiếu đỏ thì nhấp nháy. Mọi tín hiệu âm thanh đều có tín hiệu hình đi kèm.

### 3.2 Nghe và ghi phiếu
- **Bóng thoại là câu nói tự nhiên**, ghép từ mẫu `[xưng hô] + [số lượng + món] + [ghi chú] + [đuôi câu]`. Giọng Nam chiếm 70%, giọng Bắc 30%. Ví dụ: "Cho con 2 ổ ốp la, 1 ổ hổng hành, trứng chín kỹ nghen!" và "Cho cô cái bánh mì trứng, không cho hành nhé."
- **Từ đồng nghĩa** (MVP tối thiểu 15 cặp): không hành = hổng hành = khỏi hành; ngò = rau mùi; hành lá = hành hoa; trà tắc = trà quất; ly = cốc; lạt = nhạt; đậu phộng = lạc; bánh mì trứng = bánh mì ốp la; ít ngọt = bớt đường; không đá = khỏi đá; cay = có ớt; cay nhiều = cay xé lưỡi; ít cay = cay nhẹ thôi; cà phê sữa đá = nâu đá; bánh tráng trộn = bánh tráng trộn thập cẩm.
- **Độ khó 7 ngày đầu**:

| Ngày game | Đơn |
|---|---|
| 1–2 | Mỗi đơn 1 dòng, 1 phần, không ghi chú; có dải icon dưới bóng thoại |
| 3 | Có ghi chú (20% đơn); bỏ dải icon |
| 4 | Có thể 2 dòng (25% đơn) |
| 5 | Có số lượng 2 (15% dòng) và câu phải "tách dòng", ví dụ "2 ổ, 1 ổ không hành" phải ghi thành 2 dòng; ghi chú 35% đơn |
| 6 | Có phụ thu, ví dụ "thêm trứng cút +5.000đ" |
| 7 | Tối đa 3 dòng |

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
- **[MVP] Khách quen quay lại**: từ ngày 3, mỗi ca có 25% một trong hai người quay lại và chỉ nói "Như mọi khi nha con!" / "Như mọi khi nha!". Món quen (cô Thu: Bánh mì ốp la; bạn Nam: Trà tắc) ghi trong **Sổ khách quen** (mở từ nút nhỏ cạnh bóng thoại). Ghi đúng món quen: +1 danh tiếng và câu cảm ơn riêng.
- [GĐ2] Mở rộng thành 6 khách quen có tên và thiện cảm (mục 10.C).

### 3.5 Tình huống order thường gặp [GĐ2]
Ba mẫu thoại: khách gọi món quán chưa bán hoặc món đã hết, khách hỏi giá trước khi gọi, khách đổi món trước khi chốt. Có nút "Quán chưa bán món này / Báo hết món". Xử lý sai thì −0,5 sao. Nối với Mẹo nghề "báo hết món".

---

## 4. Khâu Thanh toán

### 4.1 Báo tổng (Chặng 1: tự nhẩm)
- Người chơi tự cộng theo bảng giá và gõ tổng trên bàn phím số theo đơn vị nghìn (gõ 30 thì hiện 30.000đ).
- Khách so số được báo với **giá của những món họ thật sự gọi**:
  - Báo **cao hơn** giá đúng: khách luôn phát hiện ("Sao nhiều vậy em?"). −1,5 sao (lỗi quầy) và phải báo lại.
  - Báo **thấp hơn**: khách trả đúng số đã báo. Quán mất phần chênh, sổ ghi "Thu thiếu". Không bị trừ sao.
  - Gian lận không bao giờ có lời.
- Thời gian mục tiêu: 4 giây, cộng 2 giây cho mỗi dòng thêm.
- **Máy tính cầm tay** (nâng cấp 150.000đ, **mở từ ngày 7**): tự cộng tổng khi chạm món, **không hiện tiền thối**. Bước báo tổng còn 1 chạm, người chơi vẫn phải tự tính tiền thối.
- **Hỗ trợ tính tiền** (công tắc trong Cài đặt): hiện sẵn tổng tiền và tiền thối. Khi bật, chuỗi "Quầy chuẩn" và các nhiệm vụ Quầy không được đếm.

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
- **Tiền khách đưa nằm trên nắp két** tới khi thối xong mới tự cất vào đúng ngăn.
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
| Báo tổng dư | Thanh toán | −1,5 sao, phải báo lại |
| Báo tổng thiếu | Thanh toán | 0 sao, quán mất phần chênh |
| Thối thiếu: bị phát hiện / không bị phát hiện | Tính tiền | −1 sao và phải bù / review 2 sao hôm sau |
| Thối dư | Tính tiền | 0 sao, mất tiền; 50% khách trả lại |
| Xác nhận QR khi tiền chưa về | Tính tiền | Mất trọn hóa đơn, hiện Mẹo nghề |
| Chờ (xếp hàng và ở quầy, trước khi chốt order) quá 60% / 85% kiên nhẫn | Order | −0,5 / −1 sao (chỉ mức cao nhất) |
| Khách khó tính gặp bất kỳ lỗi nào | — | −1 sao thêm |

**Phiếu chấm từng khách** trượt lên trong 2 giây và không chặn thao tác. Phiếu ghi Đạt/Sai cho từng khâu **Order · Thanh toán · Tính tiền · Làm đồ** và Thời gian chờ; nhãn Nhanh/Ổn/Chậm; nhãn nguồn lỗi **"Lỗi tại quầy"** hoặc **"Lỗi tại bếp"**; và các nhãn tốt như "Thối gọn", "Không tì vết".

**Chuỗi "Quầy chuẩn"**: 5 khách liên tiếp không có lỗi quầy thì bật chuỗi, hiện huy hiệu ở thanh trên, kéo dài tới lỗi quầy kế tiếp. [M2] Khi chuỗi đang chạy, khách 5 sao cho tip 10.000đ thay vì 5.000đ (cần thêm tham số chuỗi vào hàm tính tip, xem `docs/can-bang.md` mục 7).

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
- Hình nguyên liệu có các trạng thái dùng chung cho mọi món: nguyên → đã rửa → đã thái → đã chín → trên đĩa. Trạng thái làm bằng lớp phủ CSS.
- Mỗi ô nguyên liệu là **SVG tự vẽ kèm nhãn chữ**. Cặp bẫy phải khác nhau rõ về hình hoặc màu (trứng vịt vỏ xanh nhạt, to hơn; nước mắm chai nắp đỏ, nước tương chai nắp vàng…). Không dùng emoji cho nguyên liệu.

### 6.3 Thớt sơ chế [MVP]
Thớt sơ chế biến "sơ chế đúng và đủ" thành lựa chọn thật của người chơi, thay vì một chuỗi bước do game ép.

- Sau bước Chọn, các nguyên liệu đã chọn nằm trên thớt. Mỗi nguyên liệu có **icon trạng thái cần đạt** (ví dụ dưa leo: đã rửa → đã thái lát; trứng: đã đập → đã chiên).
- Người chơi **tự chạm vào từng nguyên liệu** để mở bước của nó. **Thứ tự tự do**, trừ các ràng buộc cứng khai báo bằng `after` (ví dụ phải rửa dưa trước khi thái, phải đập trứng trước khi chiên, phải chiên xong mới nêm).
- Bước bị khóa do `after` hiện ổ khóa nhỏ và dòng "Cần rửa dưa leo trước".
- **Chọn cách sơ chế** cho 1–2 nguyên liệu ở các món có bước cần chọn cách (Bánh mì ốp la: dưa leo; Bánh tráng trộn: bánh tráng, xoài; Chè bưởi: cùi bưởi): trước khi chơi bước, người chơi chọn một trong 2–3 cách (ví dụ dưa leo: Thái lát / Thái sợi / Bào). **Chọn sai thì điểm bước đó −15** và review nhắc đúng cách.
- **Nút "Ra món" luôn bấm được.** Bước chưa làm tính **0 điểm**. Review gọi đúng tên nguyên liệu, ví dụ "Dưa leo chưa rửa kìa em".
- Nguyên liệu không có bước sơ chế riêng (hành lá, rau thơm rắc lên, bánh mì) hiện sẵn dấu xong; phần kẹp nhân, bày món chạy hoạt hình tự động khi Ra món.
- Nguyên liệu phụ **không được chọn** ở bước Chọn thì các bước của nó không hiện trên thớt (đã có dòng phạt "thiếu" ở mục 6.6, không phạt lần hai).
- Các bước Canh lửa và Rót tạm dừng nếu người chơi ẩn trang giữa chừng. Tải lại trang giữa một bước thì bước đó chơi lại từ đầu với cùng tham số.

### 6.4 Thư viện 12 cơ chế mini-game gốc

| Mã | Tên hiển thị | Thao tác | Dùng cho | Luật chấm | Có ở |
|---|---|---|---|---|---|
| CHON | Chọn nguyên liệu | Chạm ô trên kệ để bỏ vào rổ, chạm lại để lấy ra, bấm "Xong" | Mọi món | 100 − 15 × số lần chạm nhầm. Quá 2,5 × par thì −15 và các ô cần lấy nhấp nháy gợi ý. Thiếu, thừa, bẫy chấm riêng ở mục 6.6. Thiếu nguyên liệu chính thì không qua được | **MVP** |
| CHA | Chà rửa | Vuốt qua lại lên các vết bẩn hoặc vùng vỏ được đánh dấu | Rửa, gọt, bóc, trộn, khuấy, lắc | Theo độ phủ các vết/vùng đánh dấu (không phải chỉ đủ quãng vuốt); −15 nếu quá 2 × par | **MVP** |
| THAI | Thái | **Kéo dao để ngắm, nhấc tay để cắt** tại vạch chấm. Vạch dao hiện lệch lên trên ngón tay 40 px. Nguyên liệu rộng ít nhất 280 px | Thái lát, bổ đôi, cắt sợi | Mỗi nhát theo độ lệch so với vạch: ≤6 px → 100; ≤14 px → 80; ≤24 px → 55; còn lại → 20 (ngưỡng nhân hệ số vùng). Nhát thừa −10 | **MVP** |
| CHAM | Chạm | 3 chế độ. `exact`: đúng n lần, có thể có vùng đích. `min`: đủ N lần trong T giây. `targets`: nhiều chai, mỗi chai đúng số nấc | Đập trứng, nêm, vắt, áo bột | `exact`: lệch số lần −30 mỗi lần; điểm theo khoảng cách tới tâm (≤8% → 100, ≤15% → 80, ≤25% → 55). `min`: r = số lần / N; 1,0–1,2 → 100; 0,85–1,35 → 80; 0,65–1,6 → 55. `targets`: 100 − 30 × tổng độ lệch nấc | **MVP** |
| LUA | Canh lửa | Kim độ chín chạy từ 0 đến 1,2 trong `period` giây; bấm "Nhấc/Vớt" | Chiên, luộc, nướng, trụng | **Hàm liên tục, đối xứng quanh tâm vùng** (mục 6.5); **vượt 1,0 là cháy → 0** | **MVP** (bản có lửa và lật: GĐ2) |
| ROT | Rót | Giữ để rót, thả tay ở vạch; được nhấn lần 2 để bù (dâng chậm lại) | Rót trà, chế phin, rưới nước cốt dừa | Lệch ≤4% dung tích → 100; ≤9% → 80; ≤15% → 55; **tràn > 1,02 → 0**. Tốc độ dâng tại vạch không quá 25% dung tích mỗi giây | **MVP** |
| LUC | Giữ lấy lực | Giữ tay, kim lực chạy 0 → 100 → 0 theo chu kỳ 1,2 giây; thả tay | Đập tỏi, đập gừng, ép khuôn | Vùng rộng 15 đơn vị; đúng tâm → 100 | GĐ2 |
| KHUAY | Vẽ vòng | Xoay đủ K vòng | Khuấy, vo viên, nhào | min(1, vòng / K) × độ tròn đều; quá nhanh −10 | GĐ2 |
| BAY_DIA | Bày đĩa | Kéo thả thành phần vào bóng mờ theo thứ tự | Xếp lớp, trình bày | Lệch tâm ≤8% → 100; sai thứ tự lớp −20 | GĐ2 |
| VUOT_CHUOI | Vuốt theo mũi tên | Vuốt 3–5 hướng liên tiếp | Cuốn, gấp lá, gói | Đúng hướng ±30° → 100; ±45° → 70 | GĐ2 |
| VE_DUONG | Vẽ theo đường | Vuốt theo nét chấm | Tỉa hoa, rưới sốt, buộc lạt | % phủ nét × (1 − độ lệch) | GĐ3 |
| LAC | Lắc chảo | Vuốt trái phải theo nhịp | Xào, lúc lắc, flambé (kết hợp LUC) | Dưới nhịp thì thanh khét tăng; quá nhanh thì văng ra | GĐ3 |

Thang nhãn bước: **Hoàn hảo** (≥90), **Tốt** (≥70), **Đạt** (≥50), **Hỏng** (<50).

### 6.5 Quy tắc chung cho mọi cơ chế
- Mỗi bước dài 2–8 giây và **tự kết thúc ở 2,5 × par** để game không bao giờ kẹt. **Riêng bước Chọn không tự kết thúc** (quá giờ chỉ nhấp nháy gợi ý).
- Thời gian đo bằng `performance.now()`, không đếm khung hình. Mini-game tạm dừng khi tab bị ẩn.
- Tọa độ chuẩn hóa về 0..1. Vùng chạm tối thiểu 44px và cách mép màn hình 16px.
- Sân khấu mini-game chặn cuộn, phóng to, nhấn giữ lâu và menu chuột phải; chỉ nhận con trỏ chính; `pointercancel` coi như thả tay. Trên máy tính, phím Space thay cho nhấn hoặc giữ.
- **Thẻ gợi ý** 0,8 giây trước bước: chạm để bỏ qua, tự ẩn sau 3 lần nấu món đó. **Nhãn kết quả** chồng lên bước kế tiếp, không bắt chờ.
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
- **Tip** chỉ có khi khách chấm 5 sao, khách bỏ vào **hũ tip** (không đi qua két):
  - 5.000đ mặc định.
  - 10.000đ nếu có món Không tì vết, hoặc là khách khó tính, hoặc (M2) đang trong chuỗi "Quầy chuẩn".
  - Câu thoại: "Ngon quá, cô bỏ hũ tip cho con nha."
- **Danh tiếng mỗi khách**: 5 sao +3, 4 sao +2, 3 sao +1, 2 sao trở xuống 0. Món Không tì vết +1. Khách trả lại tiền thối dư +1.
- **Sao trung bình** tính trên 30 đánh giá gần nhất; khi chưa đủ 5 đánh giá, phần thiếu tính là 4 sao.
- **Hệ số lượng khách** theo sao trung bình: từ 4,5 ×1,15; 4,0–4,49 ×1,0; 3,5–3,99 ×0,85; dưới 3,5 ×0,7. Ở Chặng 1, hệ số này chỉ làm số khách mỗi ca lệch tối đa ±1 (sàn 3, trần 8). Màn tổng kết giải thích "Vì sao hôm nay vắng khách?".

### 6.10 Thạo món (5 cấp, không bao giờ tụt)
Thạo món tính theo số lần món đó đạt hạng **Ngon trở lên**:

| Cấp | Mốc | Quyền lợi | Có ở |
|---|---|---|---|
| 1 Tập làm | Vừa có công thức | Làm đủ mọi bước; có tay chỉ ở lần nấu đầu | MVP |
| 2 Quen tay | 5 lần | Vùng mục tiêu của món +5%; thẻ gợi ý thu gọn; **bước phụ có nút "Tự làm"** (80 điểm). Từ Chặng 3: giá +3% và dạy được cho nhân viên | MVP |
| 3 Thạo | 15 lần | Vùng mục tiêu +10%; +1 danh tiếng cho mỗi món Tuyệt hảo. Từ Chặng 3: giá +6%. (GĐ2) mở nấu mẻ 2 phần | MVP |
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
- **Hỗ trợ ở MVP có 2 công tắc** (Cài đặt):
  - *Hỗ trợ tính tiền*: hiện tổng và tiền thối. Khi bật, chuỗi "Quầy chuẩn" và nhiệm vụ Quầy không được đếm.
  - *Hỗ trợ thao tác*: vùng mục tiêu +25%, thời lượng ×1,5, ô nguyên liệu cần lấy nhấp nháy. Khi bật, **món không thể đạt Không tì vết** và các nhiệm vụ đếm bước Hoàn hảo không được đếm.
- [GĐ2] Thêm *Giữ bóng thoại và icon* và *Thong thả* (khách không mất kiên nhẫn, không tính kỷ lục).
- Mọi tín hiệu âm thanh luôn đi kèm tín hiệu hình. Vùng mục tiêu có cả vạch lẫn biểu tượng, không chỉ phân biệt bằng màu.

### 6.13 Phản hồi "sướng tay"
- Âm thanh tổng hợp bằng WebAudio (M3): dao "tách", dầu "xèo", nước, chuông Hoàn hảo, chuông ra món, tiếng tiền.
- Rung 15 ms khi thái đúng, 80 ms khi Hỏng (tắt được).
- Nguyên liệu đổi trạng thái ngay, có hơi nước bốc lên.
- Màn công bố món dài 1,2 giây (chạm để bỏ qua): món phóng to, hiện hạng và Q, **Dì Sáu** hiện với 4 biểu cảm (tự hào, vui, lo, tiếc) và góp ý đúng bước sai.
- [GĐ2] **Chuỗi "Liên hoàn"**: nhiều bước Hoàn hảo liên tiếp thì hiệu ứng mạnh dần (chỉ hình và tiếng, không đổi tiền thưởng).
- Tôn trọng `prefers-reduced-motion` và công tắc giảm chuyển động.
- Nếu có hiệu ứng đứt tay (GĐ2) thì chỉ hiện băng cá nhân hài hước, không có máu.

### 6.14 Công thức

Năm món MVP dưới đây chỉ dùng 6 cơ chế có sẵn. Số liệu khớp `src/data/recipes.js` và `src/data/ingredients.js` tại thời điểm viết; nếu code đổi thì code là chuẩn và bảng này được sửa theo. Giá vốn = tổng giá nguyên liệu chính và phụ (bảng giá từng nguyên liệu ở `docs/can-bang.md` mục 2). Cột "Sau" là ràng buộc `after`. Kệ luôn có thêm vài nguyên liệu của món khác để bước Chọn không quá dễ.

**(1) Bánh mì ốp la** — Chặng 1, có sẵn (M1). Độ khó 1.
- Giá 20.000đ, giá vốn 9.000đ.
- Chính: bánh mì, trứng gà ×2. Phụ: dưa leo, hành lá, nước tương. Tùy chọn: tương ớt (khi "Cay").
- Bẫy: trứng vịt, hành tây, nước mắm. Kệ 12 ô.
- Ghi chú: Không hành (bỏ hành lá); Cay (thêm tương ớt, nêm 2 nấc); Lòng đào (vùng chín [0,45; 0,60]); Chín kỹ (vùng chín [0,70; 0,85]); Thêm trứng (+5.000đ, đập 3 trứng).
- Hành lá không cần sơ chế riêng (rắc khi Ra món). Bước kẹp nhân chạy hoạt hình tự động.

| # | Bước | Cơ chế | Tham số | Sau | par | w |
|---|---|---|---|---|---|---|
| 1 | Chọn nguyên liệu | CHON | kệ 12 ô | — | 6 | 1 |
| 2 | Rửa dưa leo | CHA | 4 vết bẩn | — | 3 | 1 |
| 3 | Thái dưa leo | THAI | 3 vạch; chọn cách: **Thái lát** / Thái sợi / Bào | 2 | 4 | 1 |
| 4 | Đập trứng vào chảo | CHAM `exact` | n = 2 (3 khi "Thêm trứng"), có vùng đích | — | 2 | 2 |
| 5 | Chiên trứng (**chí mạng**, linh hồn) | LUA | period 5 giây; vùng [0,55; 0,72]; làm lại 6.000đ | 4 | 5 | 3 |
| 6 | Nêm nước tương | CHAM `targets` | nước tương 1; tương ớt 2 khi "Cay" | 5 | 2 | 1 |

Tổng par 22 giây, Σw = 9.

**(2) Trà tắc** — Chặng 1, có sẵn (M1). Độ khó 1.
- Giá 10.000đ, giá vốn 3.000đ.
- Chính: trà, tắc ×3, đường, ly. Phụ: đá.
- Bẫy: chanh, muối, sữa đặc. Kệ 9 ô.
- Ghi chú: Ít đường, Nhiều đường, Không đá (bỏ đá).

| # | Bước | Cơ chế | Tham số | Sau | par | w |
|---|---|---|---|---|---|---|
| 1 | Chọn nguyên liệu | CHON | kệ 9 ô | — | 5 | 1 |
| 2 | Bổ đôi tắc | THAI | 3 vạch | — | 3 | 1 |
| 3 | Vắt tắc | CHAM `min` | N = 6 trong 3 giây | 2 | 3 | 1 |
| 4 | Rót trà | ROT | vạch [0,70; 0,82] | — | 3 | 2 |
| 5 | Nêm đường (linh hồn) | CHAM `exact` | ít 1 / thường 2 / nhiều 3 | — | 2 | 3 |
| 6 | Lắc đều | CHA | 6 lần vuốt | 3, 4, 5 | 2 | 1 |

Tổng par 18 giây, Σw = 9. Đá cho vào tự động khi Ra món (bỏ khi "Không đá").

**(3) Bánh tráng trộn** — Chặng 1, Shop 250.000đ, mở từ ngày 2 (M2). Món thử luật "đúng và đủ". Độ khó 2.
- Giá 20.000đ, giá vốn 8.000đ.
- Chính: bánh tráng, xoài xanh, trứng cút ×3, khô bò. Phụ: rau răm, hành phi, đậu phộng, sa tế, tắc.
- Bẫy: **rau húng lủi** (cặp với rau răm), bánh tráng mè, trứng gà. Kệ 12 ô.
- Ghi chú: Không cay (bỏ sa tế), Cay nhiều (sa tế 4 nấc), Không rau răm (bỏ rau răm), Thêm trứng cút (+5.000đ, bóc 5 trứng).

| # | Bước | Cơ chế | Tham số | Sau | par | w |
|---|---|---|---|---|---|---|
| 1 | Chọn nguyên liệu | CHON | kệ 12 ô | — | 8 | 1 |
| 2 | Cắt bánh tráng | THAI | 5 vạch; chọn cách: **Cắt sợi** / Cắt miếng vuông / Để nguyên | — | 4 | 1 |
| 3 | Gọt vỏ xoài | CHA | 5 vùng vỏ | — | 3 | 1 |
| 4 | Thái xoài | THAI | 5 vạch; chọn cách: **Thái sợi** / Thái lát / Cắt hạt lựu | 3 | 4 | 1 |
| 5 | Bóc trứng cút | CHA | 3 vùng vỏ (5 khi thêm trứng) | — | 3 | 1 |
| 6 | Nêm sa tế, vắt tắc | CHAM `targets` | sa tế 2 (0 / 4 theo ghi chú); tắc 2 | — | 3 | 2 |
| 7 | Rưới dầu hành phi | ROT | vạch [0,55; 0,70] | — | 2 | 1 |
| 8 | Trộn đều (linh hồn) | CHA | 8 lần vuốt | 2–7 | 4 | 3 |

Tổng par 31 giây, Σw = 11. Đây là món dài nhất Chặng 1: nếu đo thấy quá dài, bỏ bước Rưới dầu hành phi trước (xem `docs/can-bang.md` mục 15).

**(4) Cà phê sữa đá** — Chặng 1, Shop 200.000đ, mở từ ngày 4 (M2). Độ khó 2.
- Giá 15.000đ, giá vốn 5.000đ.
- Chính: cà phê phin, sữa đặc, ly. Phụ: đá.
- Bẫy: sữa tươi, cà phê hòa tan, đường phèn. Kệ 9 ô.
- Ghi chú: Ít ngọt (sữa 1 nấc), Ngọt đậm (sữa 3 nấc), Ít đá.
- Đề xuất cho M2: cho phép trả bằng 60 Muỗng Vàng thay cho tiền, để Muỗng Vàng có chỗ tiêu ở MVP (chưa có trong dữ liệu).

| # | Bước | Cơ chế | Tham số | Sau | par | w |
|---|---|---|---|---|---|---|
| 1 | Chọn nguyên liệu | CHON | kệ 9 ô | — | 5 | 1 |
| 2 | Chế nước sôi vào phin | ROT | vạch [0,60; 0,75] | — | 3 | 2 |
| 3 | Chờ phin nhỏ giọt | LUA | period 6 giây; vùng [0,60; 0,80] | 2 | 6 | 2 |
| 4 | Thêm sữa đặc (linh hồn) | CHAM `exact` | 2 nấc (ít ngọt 1, ngọt đậm 3) | — | 2 | 3 |
| 5 | Thêm đá | CHAM `exact` | 2 (ít đá 1) | — | 2 | 1 |
| 6 | Khuấy đều | CHA | 6 lần vuốt | 2–5 | 2 | 1 |

Tổng par 20 giây, Σw = 10.

**(5) Chè bưởi** — Chặng 1, **món sự kiện Tri ân 20/11** (M2), chỉ lấy qua chuỗi sự kiện. Độ khó 3.
- Giá 15.000đ, giá vốn 5.000đ. Giá **không tăng** trong mùa sự kiện.
- Chính: cùi bưởi, bột năng, nước cốt dừa, ly. Phụ: đậu xanh, đường, muối, đá.
- Bẫy: bột mì (cặp với bột năng), sữa đặc (cặp với nước cốt dừa), dừa nạo. Kệ 12 ô.
- Ghi chú: Nhiều nước cốt dừa (vạch rót [0,80; 0,92]), Không đá.

| # | Bước | Cơ chế | Tham số | Sau | par | w |
|---|---|---|---|---|---|---|
| 1 | Chọn nguyên liệu | CHON | kệ 12 ô | — | 6 | 1 |
| 2 | Gọt lớp vỏ xanh | CHA | 5 vùng vỏ | — | 3 | 1 |
| 3 | Thái cùi bưởi | THAI | 4 vạch; chọn cách: **Cắt hạt lựu** / Thái lát / Thái sợi | 2 | 4 | 1 |
| 4 | Bóp muối, xả cho hết đắng | CHA | 6 lần vuốt | 3 | 3 | 1 |
| 5 | Lăn bột năng | CHAM `min` | N = 8 trong 3,5 giây | 4 | 4 | 2 |
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

### 7.1 Bốn nguồn công thức
1. **Có sẵn**: 2 món ở đầu mỗi chặng, hoặc được tặng khi lên chặng. Chặng 1: Bánh mì ốp la, Trà tắc.
2. **Shop "Chợ Công Thức"**:
   - **Kệ Chính** [MVP]: cố định theo chặng, trả bằng Tiền quán. Chặng 1 có **2 món**: Bánh tráng trộn (250.000đ, từ ngày 2) và Cà phê sữa đá (200.000đ, từ ngày 4; đề xuất cho trả thêm bằng 60 Muỗng Vàng). Món của chặng cao hơn hiện bóng mờ kèm dòng "Cần Quán cóc vỉa hè" (Gỏi cuốn, Bún thịt nướng, Chè ba màu).
   - **Kệ Đặc biệt** [GĐ2]: 1–2 món, đổi mỗi 7 ngày thật, giá 150–500 Muỗng Vàng hoặc 3 lần giá Tiền quán. **Không món nào chỉ mua được bằng Muỗng Vàng.** Món đã lỡ chắc chắn quay lại trong vòng 4 tuần.
   - **Kệ Đặc sản vùng miền** [GĐ2]: 3 ô, đổi mỗi 3 ngày game, luôn có 1 món giảm 20%.
   - **Tủ Kỷ Niệm** [GĐ3]: bán lại món sự kiện đã qua, sau 90 ngày, giá 600 Muỗng Vàng hoặc 30 Mảnh công thức.
3. **Bí truyền qua chuỗi nhiệm vụ** [GĐ2]: "Sổ tay thất lạc của Dì Sáu" có 12 trang (4 trang từ cốt truyện, 4 từ sự kiện, 4 từ thành tựu nghề). Đủ 12 trang mở món bí truyền "Hủ tiếu gõ của Dì Sáu". Món bí truyền cũng tuân theo trần lãi +10% (mục 7.2).
4. **Sự kiện có thời hạn**: MVP nhận món qua chuỗi sự kiện; GĐ2 thêm đổi bằng Tem Lễ Hội.

### 7.2 Thẻ xem trước, nấu thử, quy tắc ngang giá trị
- **Thẻ xem trước** ghi: số bước, cơ chế mới (nếu có), độ khó 1–5 (biểu tượng dao), giá vốn, giá bán, lãi mỗi phần, **số ca hoàn vốn ước tính**, dụng cụ bắt buộc.
- **Nấu thử miễn phí 1 lần** trước khi mua [MVP, M2]: không đếm giờ, có tay chỉ, không tốn tiền, không tính vào thạo món.
- Mua xong thì món vào thực đơn ngay. Món mới được khách gọi nhiều gấp đôi trong 2 ca đầu. Không hoàn tiền.
- **Giới hạn ô thực đơn** [GĐ2]: Chặng 1–2 có 6 ô, sau đó 8, 10, 12. Thực đơn gọn thì bếp nhanh hơn.
- **Quy tắc món ngang giá trị**: lãi trên mỗi giây nấu (lãi mỗi phần / tổng par) của món mua bằng Muỗng Vàng, món sự kiện và món bí truyền **không vượt món mua bằng Tiền quán tốt nhất cùng chặng quá 10%**. Món đặc biệt hấp dẫn nhờ danh tiếng, hình trình bày đẹp và khách riêng, không nhờ lãi.
  - Chặng 1: Bánh mì ốp la và Cà phê sữa đá cùng khoảng 500đ/giây là món Tiền quán tốt nhất (trần 550đ/giây); Chè bưởi khoảng 370đ/giây, trong trần. Số liệu ở `docs/can-bang.md` mục 2.

### 7.3 Sự kiện MVP: "Tri ân 20/11" với món Chè bưởi [MVP, M2]
- **Thời gian**: 12–21/11/2026 (theo giờ Việt Nam, mốc đổi ngày 04:00). Thẻ "Sắp diễn ra" hiện từ 09/11, kèm đồng hồ đếm ngược.
- **Chuỗi sự kiện 3 bước**, mỗi ngày thật mở tối đa 1 bước, nên chỉ cần chơi 3 ngày bất kỳ trong mùa:
  1. "Thư của cô giáo cũ": phục vụ 5 khách trong mùa sự kiện → nhận thư và 10 Muỗng Vàng.
  2. "Chuẩn bị quà tri ân": nấu 3 món đạt Ngon trở lên → +10 danh tiếng.
  3. "Nồi chè tri ân": nấu thử Chè bưởi (miễn phí, có tay chỉ) → **nhận công thức Chè bưởi vĩnh viễn**, nhãn "Tri ân 20/11 – 2026".
  - Nếu người chơi bắt đầu muộn, số ngày còn lại ít hơn số bước còn lại thì các bước được gộp để vẫn kịp nhận món trong ngày cuối.
- **Trong mùa**: Chè bưởi được gọi nhiều gấp đôi; mỗi phần Chè bưởi đạt Ngon trở lên được +1 danh tiếng thêm. **Giá bán không đổi.** (GĐ2: thêm Tem.)
- **Hộp thư ngày 20/11**: 20 Muỗng Vàng + 0,5 TNC.
- **Sau sự kiện**: giữ món vĩnh viễn, bán quanh năm cùng giá. Người đã lỡ sẽ có cơ hội ở đợt **"Món trở lại"** năm sau.
- **Thời điểm hết hạn** tính theo thời gian tin cậy (mục 13): sự kiện hết khi `max(maxSeen, giờ máy)` vượt mốc kết thúc.
- **Xem trước khi phát triển**: tham số `?devNow=2026-11-15` chỉ có tác dụng khi chạy ở `localhost`.
- **E2E bắt buộc**: sự kiện mở → nhận món qua chuỗi → hết hạn vẫn giữ món.

### 7.4 Khuôn mẫu sự kiện đầy đủ [GĐ2]
Toàn bộ khai báo bằng dữ liệu (`from`, `to`, `eventId` trong dữ liệu món).
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
  - Tem dư có 3 ngày ân hạn, sau đó tự đổi 100 Tem = 1 TNC Tiền quán.
  - Năm sau có đợt **"Món trở lại"** với giá giảm 30% Tem. Ai đã có món thì nhận biến thể mới hoặc nguyên liệu.
- **Chống FOMO**: không gacha, không hộp ngẫu nhiên cho công thức, không bán Tem bằng tiền thật, lỡ ngày không mất gì.
- **Món sự kiện tự co giãn theo chặng**. Ví dụ Tết: ở xe đẩy là "Bánh tét chiên", ở nhà hàng là "Set mâm cỗ Tết".

### 7.5 Lịch sự kiện năm đầu
Ngày âm lịch lấy từ **bảng tra sẵn cho 2026–2030** trong `src/data/events.js`, phải kiểm chéo với lịch vạn niên.

| Thời gian | Sự kiện | Món giới hạn | Quy mô | Có ở |
|---|---|---|---|---|
| 12–21/11/2026 | Tri ân 20/11 | **Chè bưởi** (mục 6.14) | Nhỏ, sự kiện đầu tiên để tập dượt | **MVP** |
| 18–27/12/2026 | Giáng sinh | Bánh mì bơ tỏi | Vừa | GĐ2 |
| Từ 23 tháng Chạp (29 hoặc 30/01/2027, **phải tra bảng**) đến mùng 7 Tết (12/02/2027); **mùng 1 Tết Đinh Mùi là 06/02/2027** | Tết | **Bánh chưng** (CHON lá dong, nếp, đậu xanh, ba chỉ, lạt, với bẫy lá chuối, gạo tẻ, đậu đen → CHA lau lá → KHUAY vo nếp → ROT ướp thịt → BAY_DIA xếp khuôn lá → gạo → đậu → thịt → đậu → gạo → VUOT_CHUOI gấp 4 phía → VE_DUONG buộc lạt → LUA luộc có châm nước sôi, chí mạng); Thịt kho hột vịt; Dưa hành | Lớn đầu tiên. Nội dung phải chốt trước giữa tháng 01/2027 | GĐ2 |
| 8/3, Giỗ Tổ, Đoan Ngọ, Vu Lan | Sự kiện nhỏ | Bánh giầy, cơm rượu nếp, tuần món chay | Nhỏ | GĐ2 |
| Khoảng 03–17/09/2027 (**Rằm tháng Tám là 15/09/2027**) | Trung thu | Bánh nướng (ép khuôn bằng LUC, vùng lực 60–75), bánh dẻo, trà sen | Lớn thứ hai | GĐ2 |

---

## 8. Hành trình 7 chặng

| Chặng | Bối cảnh | Điều kiện lên chặng này (phải đủ tất cả; đầu tư trả một lần) | Mở khóa chính: món / khách / cơ chế | Khách mỗi ca · TNC | Thời lượng mục tiêu (người chơi trung bình, 3–4 ca/ngày thật) |
|---|---|---|---|---|---|
| **1 Xe đẩy đầu hẻm** | Xe đẩy cũ thuê lại của Dì Sáu, dù che, ghế nhựa; biển xe mang tên người chơi đặt | Bắt đầu với 200.000đ Tiền quán (quỹ lẻ 200.000đ nằm riêng trong két) | Bánh mì ốp la, Trà tắc; Bánh tráng trộn, Cà phê sữa đá (Shop); Chè bưởi (sự kiện). Khách: học sinh, công nhân/shipper, cô chú lớn tuổi, dân văn phòng (từ ngày 4), khó tính (từ ngày 5). Luồng 4 khâu tự nhẩm, tiền mặt + QR tĩnh, 6 cơ chế bếp, Thớt sơ chế, dây 3 phiếu | 4–8 · tăng dần 20k → 100k | Ca 1–15 · ngày thật 1–4 |
| **2 Quán cóc vỉa hè** | 2 bàn con, 4 ghế nhựa, đèn dây | 150 danh tiếng; sao trung bình ≥3,8; 3 công thức; 2 món thạo cấp 2; xong chuỗi "Ngày đầu ra phố"; 500.000đ | Ăn tại chỗ, dọn bàn, đóng gói mang về. 6 khách quen có tên, kèm Sổ khách quen. Bếp 2 họng. Cơ chế BAY_DIA, VUOT_CHUOI, KHUAY, LUC. Kho theo lô có hạn dùng, đi chợ mặc cả. Món: Gỏi cuốn, Bún thịt nướng, Cơm tấm, Chè ba màu | 8–10 · khoảng 160k | Ca 16–45 · ngày thật 4–12 |
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

**Khi đủ điều kiện lên Chặng 2 ở MVP**: hiện màn "Quán cóc vỉa hè – sắp khai trương" với nút bị khóa; người chơi vẫn chơi tiếp Chặng 1 bình thường với các **mục tiêu sau khi đủ điều kiện** [MVP, M3]:
- Sưu tập huy hiệu "Không tì vết" cho mọi món đang bán, ít nhất 3 món (hiện trong Sổ công thức).
- Đưa cả 3 món lên thạo cấp 3.
- Kỷ lục ca: lãi cao nhất, nhiều khách 5 sao nhất, chuỗi "Quầy chuẩn" dài nhất.
- Đồng hồ đếm ngược tới sự kiện Tri ân 20/11 (khi còn trước sự kiện).

---

## 9. Năm hệ thống người dùng yêu cầu

### 9.1 Nhiệm vụ hằng ngày "Việc hôm nay" [MVP, M2]
- Reset lúc 04:00 giờ Việt Nam. Mỗi ngày bốc **3 nhiệm vụ**: 1 Quầy, 1 Bếp, 1 Chất lượng/Kinh doanh. Việc bốc dùng seed `hash(seed của save + ngày)` nên tải lại trang không đổi được nhiệm vụ.
- Chỉ bốc nhiệm vụ đã đủ điều kiện (chưa có QR thì không giao nhiệm vụ QR). Không lặp nhiệm vụ của hôm qua. Chỉ tiêu co giãn theo số khách dự kiến để xong trong khoảng 2 ca.
- **Bể nhiệm vụ MVP (12)**:

| Nhóm | Nhiệm vụ |
|---|---|
| Quầy | Thối đúng 5 lần liên tiếp · Ghi phiếu đúng ngay lần đọc lại đầu cho 4 khách · Thối gọn 3 lần · Xác nhận đúng 2 thanh toán QR (từ ngày 4) |
| Bếp | 5 lần Hoàn hảo ở bước Thái · 3 món không có lỗi nguyên liệu · 3 lần Hoàn hảo ở bước Canh lửa · Nấu 2 phần món vừa mua (khi có món mua trong 3 ngày game gần nhất) |
| Chất lượng/Kinh doanh | 3 món Tuyệt hảo · Phục vụ 8 khách · Không để khách nào bỏ về trong 1 ca (từ ngày 4) · Doanh thu trong ngày đạt mức co giãn theo số khách dự kiến |

- **Thưởng**:
  - Mỗi nhiệm vụ: 0,2 TNC của ngày game hiện tại (làm tròn lên bội 1.000đ) và +5 danh tiếng.
  - Đủ 3 nhiệm vụ thì mở **Rương ngày**: 0,2 TNC và 5 Muỗng Vàng.
  - Ở Chặng 1, một ngày thật nhận khoảng 20k (ngày 1) đến 80k (ngày 3–4) từ nhiệm vụ và Rương ngày (`docs/can-bang.md` mục 10).
- Tiến độ tự đếm qua bus sự kiện, có thông báo ngắn trong ca (ví dụ "Việc hôm nay: 4/5 lần thối đúng"). Người chơi bấm "Nhận" để lấy thưởng. Nhiệm vụ đã xong mà chưa nhận trước giờ reset thì tự vào Hộp thư, giữ 7 ngày.
- Khi bật Hỗ trợ tính tiền, nhiệm vụ Quầy không đếm; khi bật Hỗ trợ thao tác, nhiệm vụ đếm bước Hoàn hảo không đếm.
- **Đổi nhiệm vụ**: 1 lần miễn phí mỗi ngày, từ lần thứ hai tốn 5 Muỗng Vàng.
- Không bao giờ có nhiệm vụ "tiêu X tiền".

### 9.2 Điểm danh nhận quà hằng ngày [MVP, M2]
- Bảng hiện ở lần mở game đầu tiên của mỗi ngày thật, nhận bằng 1 chạm, không cần mở ca.
- **7 ô tích lũy**: lỡ ngày không bị reset, lần sau nhận tiếp ô kế tiếp.
- **Vòng đầu "Tuần Khai Trương"** (chỉ 1 lần) **tặng hiện vật thay cho tiền**, để thưởng không lấn át lãi bán hàng của những ngày đầu:

| Ô | Quà | Ghi chú |
|---|---|---|
| 1 | 10 Muỗng Vàng + Viền biển xe "Khai Trương" | Thẩm mỹ |
| 2 | Phiếu Chợ Sớm | Giá vốn −20% trong 1 ca, dùng ở màn Chuẩn bị |
| 3 | 10 Muỗng Vàng | |
| 4 | Bạt che mưa | Vĩnh viễn: ngày mưa tự căng bạt, không tốn 20.000đ |
| 5 | Phiếu Chợ Sớm ×2 | |
| 6 | 15 Muỗng Vàng | |
| 7 | Rương Khai Trương: 20 Muỗng Vàng + 100.000đ + danh hiệu "Chủ xe mới toanh" | Thường rơi vào lúc đã sang giai đoạn Chặng 2 |

- **Vòng thường**: Ô1 0,3 TNC · Ô2 Phiếu Chợ Sớm · Ô3 10 Muỗng Vàng · Ô4 0,4 TNC · Ô5 Phiếu Chợ Sớm ×2 · Ô6 15 Muỗng Vàng · Ô7 Rương điểm danh (30 Muỗng Vàng + 0,5 TNC). Mỗi vòng tổng khoảng 1,2 TNC tiền, 2 lượt giảm giá vốn và 55 Muỗng Vàng.
- **[GĐ2]**:
  - Lịch tháng 28 ô chạy song song, mốc 7/14/21/28 có quà lớn, ô 28 là trang trí độc quyền.
  - Bù điểm danh tối đa 3 ô mỗi tháng, bằng 1 Vé Bù, 15 Muỗng Vàng, hoặc một "Ca bù" miễn phí (phục vụ 10 khách).
- Khi đồng hồ máy bị lùi thì quà theo ngày bị khóa (M3, mục 13).

### 9.3 Sự kiện ngẫu nhiên
Có ba lớp. Chúng có trần thiệt hại, có bảo hiểm tần suất và không bao giờ phạt ngẫu nhiên.

**(a) Sự kiện ngày** [MVP, M2]: báo trước ở màn tổng kết ca hôm trước. Từ ngày game 3, mỗi ngày game có 30% xảy ra.

| Sự kiện | Tác động | Có ở |
|---|---|---|
| Trời mưa | Khách ×0,8, kiên nhẫn ×1,2. Có lựa chọn "Căng bạt" 20.000đ để khách còn ×0,95 (miễn phí nếu có Bạt che mưa) | MVP |
| Nắng nóng | Trà tắc và Cà phê sữa đá được gọi ×2; +1 khách (trong trần 8) | MVP |
| Ngày lãnh lương (khách 5 sao cho tip 10.000đ) / Chợ phiên (khách ×1,3) / Chợ giảm giá / khan hàng / trận bóng đội tuyển / rằm và mùng 1 (30% khách ăn chay) / khách đoàn du lịch / người review ẩm thực | Theo từng sự kiện | GĐ2 |

Kỳ vọng chung xấp xỉ 0, hơi dương khi đã có Bạt che mưa.

**(b) Tình huống trong ca** [MVP, M3]: từ ngày game 3, mỗi ca có 35% ra tối đa 1 tình huống, tối đa 1 lần mỗi ngày thật ở MVP. Tình huống chỉ bật khi đang ở tab Quầy, giữa hai khách, **không chen vào mini-game nấu**. Kiên nhẫn tạm dừng khi hộp thoại mở. Mỗi lựa chọn ghi rõ cái giá và luôn có 1 lựa chọn an toàn. Thiệt hại tối đa là 10% doanh thu ca hoặc 0,5 TNC. Nếu 3 ca liền không có tình huống thì ca kế chắc chắn có.

MVP có 1 tình huống:
- **Khách mở hàng bằng tờ 500k**: thối hết tiền lẻ (nếu két đủ) / mời chuyển QR (khi đã mở QR) / tặng ly trà tắc "mở hàng" (−3.000đ vốn, ca sau +1 khách trong trần 8).

GĐ2 thêm (không lặp lại 5 tình huống gần nhất):
- **Khách quen xin ghi nợ 20.000đ**: cho nợ (70% trả trong 3 ca, +2 danh tiếng) / từ chối khéo / tặng luôn (+5 danh tiếng).
- **Khách đổi ý sau khi đã thanh toán** (phiếu chưa nấu): đổi món, thu hoặc hoàn phần chênh (đúng quy trình, hiện Mẹo nghề) / từ chối lịch sự (50% khách −1 sao).
- Cúp điện (bán ngoại tuyến, ghi order giấy), hết gas, chảo dầu bốc lửa (chọn "dội nước" là sai và được giải thích), hàng rau hỏng, đoàn kiểm tra ATTP, khách quên ví, tiệc trong hẻm đặt cọc.

**(c) Đơn bất chợt ngoài ca** [GĐ2]: từ ngày thật thứ 3, mỗi ngày có 30% ra một đơn ở màn Chuẩn bị, ví dụ "Văn phòng đặt 6 phần". Hạn tới 04:00 hôm sau. Trả 1,5 lần giá và 10 Muỗng Vàng. Bỏ qua thì chỉ mất cơ hội.

Trong Cài đặt (M3) có mức **Nhiều / Vừa / Ít** thay cho nút tắt hẳn. Mức "Ít" là 15%/ca và chỉ gồm tình huống tích cực.

### 9.4 Chuỗi nhiệm vụ [MVP, M2]
- **Chuỗi chính "Hành trình khởi nghiệp"**: mỗi chặng có một chuỗi 5–7 bước, cũng là cổng lên chặng. Luôn có đúng 1 bước đang làm, ghim ở màn Chuẩn bị, có gợi ý "làm ở đâu". Không hạn giờ, không thể thất bại.
- **C1 "Ngày đầu ra phố"** (Dì Sáu, MVP):

| Bước | Việc | Thưởng |
|---|---|---|
| 1 | Phục vụ khách đầu tiên | 5 Muỗng Vàng |
| 2 | Thối đúng 3 lần | 5.000đ |
| 3 | Ghi phiếu đúng ngay lần đọc lại đầu cho 3 khách | 5.000đ |
| 4 | Đạt 5 lần Hoàn hảo ở bước bếp | 15.000đ |
| 5 | Mua công thức đầu tiên | 30.000đ |
| 6 | Nấu 3 món Tuyệt hảo | 30.000đ + 5 Muỗng Vàng |
| 7 | Đạt 150 danh tiếng và sao trung bình ≥3,8 | Hoàn thành chuỗi: danh hiệu "Chủ xe đầu hẻm", 20 Muỗng Vàng, **Trang 1 Sổ tay của Dì Sáu**, mở thẻ "Quán cóc vỉa hè – sắp khai trương" |

  Mỗi bước kèm 1 thẻ Mẹo nghề liên quan (từ M3). Tổng tiền cả chuỗi 85.000đ.
- **"Làm quen QR"** (Anh Khoa, MVP, từ ngày 4):
  1. Nhận đúng 3 thanh toán QR → 5 Muỗng Vàng.
  2. Phát hiện 1 ảnh chuyển khoản giả (kịch bản chắc chắn xảy ra ở một khách QR kế tiếp, kể cả trước ngày 7). **Nếu Loa báo tiền đã chặn ảnh giả thì cũng tính là xong bước này**, để chuỗi không bao giờ kẹt → 5 Muỗng Vàng.
  3. Mua Loa báo tiền → thẻ Mẹo nghề "chỉ xác nhận khi tiền đã về".
- **Chuỗi sự kiện "Tri ân 20/11"**: mục 7.3.
- Các chặng sau: "Dựng quán cóc", "Tìm mặt bằng" và "Làm quen máy POS" (bấm đúng 5 order, áp đúng 3 combo, chốt ca lệch 0đ), "Có tên có tuổi", "Đạt chuẩn ATTP" và "Phục vụ bàn", "Đón thẩm định viên", "Mở chi nhánh đầu tiên".
- **Chuỗi phụ** [GĐ2, tối đa 2 chuỗi cùng lúc]:
  - "Sổ tay thất lạc của Dì Sáu" (12 trang).
  - "Cô Út sạp rau" (mở mặc cả, giá rau −5%).
  - "Anh shipper Tài" (mở đơn giao hàng).
  - "Phúc – cậu phụ bếp vụng về" (truyền nghề: làm mẫu 3 món Tuyệt hảo để Phúc làm thay 1 bước).
  - "Lâm Tốc Độ" (đối thủ, 3 hồi: phá giá → thi ẩm thực phố → bị kiểm tra; người chơi chọn giúp đỡ hoặc thâu tóm).
  - Chuyện riêng của khách quen khi thiện cảm đạt 60.
- **Luật đếm**: bước dạng "làm N lần" chỉ đếm từ lúc bước hiện ra. Bước dạng "đạt mức" kiểm tra trạng thái hiện tại.

### 9.5 Quà hệ thống và Hộp thư [MVP, M2]
- Hộp thư chạy cục bộ trong MVP. Mỗi thư gồm tiêu đề, lời nhắn và tệp quà. Hạn nhận 30 ngày (quà lễ 14 ngày). Tối đa 100 thư; khi đầy thì xóa thư cũ nhất đã nhận. Có nút "Nhận tất cả" và chấm đỏ báo thư mới.
- **Các loại quà**:

| Loại | Quà | Có ở |
|---|---|---|
| Chào mừng | 10 Muỗng Vàng + 1 Phiếu Chợ Sớm (không tặng tiền) | MVP |
| Phiên bản mới, kèm màn "Có gì mới" | 10 Muỗng Vàng | MVP |
| Đền bù lỗi | Theo id, không nhận trùng | MVP |
| Quà lễ (lúc 04:00 ngày lễ) | 20/10: 20 Muỗng Vàng; 20/11: 20 Muỗng Vàng + 0,5 TNC; Tết (GĐ2): 88 Muỗng Vàng + lì xì 1 TNC | MVP (20/10, 20/11) |
| Quà đời thường | Từ ngày thật thứ 3, mỗi ngày 10% nhận 0,3–0,6 TNC (khách quen lì xì, trả ví rơi, bán ve chai) | MVP |
| Nhiệm vụ quên nhận; review "thối thiếu" đến muộn | Theo nhiệm vụ / thư review 2 sao | MVP |
| Quà mốc | Khách thứ 100/1.000, lên chặng mới, "sinh nhật quán" ngày thật 30/100/365; "Quán được bình chọn" cần từ 20 đánh giá và sao trung bình ≥4,5 | GĐ2 |

- **Cấu hình**: mỗi quà có `{id, from, to, condition: {minChang}, reward}`. Client đẩy mỗi quà vào hộp thư đúng 1 lần theo id. Trần: ngoài quà đền bù, tối đa 2 quà lễ/mốc mỗi tháng và tổng không quá 3 TNC.
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
- **[MVP, M2] "Món của ngày"**: mỗi ngày game, một món trong thực đơn (chọn theo seed, xoay vòng) được gọi nhiều gấp 1,5 lần; mỗi phần đạt Ngon trở lên +1 danh tiếng. Giá không đổi. Giúp người chơi không nấu mãi một món.
- **[MVP, M3] Mục tiêu sau khi đủ điều kiện lên chặng** (mục 8): sưu tập "Không tì vết", thạo cấp 3, kỷ lục ca, đếm ngược sự kiện.
- **[GĐ2] Thử thách ngày theo seed chung**: mọi người chơi cùng một đề mỗi ngày (ví dụ 12 khách thu ngân trong 60 giây, hoặc 1 ca bếp cố định), không ảnh hưởng kinh tế quán. Có **thẻ kết quả để chia sẻ** qua Web Share API (Zalo, Facebook). Đây là vòng lan truyền duy nhất của game, và cũng dùng làm bài khởi động cho buổi đào tạo.
- **[GĐ2] Nhiệm vụ tuần và Rương tuần**: thanh 1.000 điểm với các mốc 250/500/750/1.000. Chơi 4–5 trên 7 ngày vẫn đạt mốc 750.
- **[GĐ2] Chuỗi ngày mở quán kèm vé nghỉ phép**: mỗi tuần có 1 vé tự dùng khi lỡ ngày. Thưởng chỉ là Muỗng Vàng và đồ thẩm mỹ.
- **[GĐ2] Thành tựu 3 bậc và danh hiệu**: khoảng 60 thành tựu tính từ bộ đếm `stats` đã ghi ngay từ MVP, nên người chơi cũ được nhận bù phần đã đạt.
- **[GĐ2] Ca Hứng Khởi**: 3 ca đầu mỗi ngày thật được danh tiếng ×1,25, Tem ×1,25, thạo món ×1,5, không nhân Tiền quán. Kéo người chơi quay lại mỗi ngày mà không cấm ai chơi dồn.
- **[GĐ2] Giftcode cho fanpage**: file chỉ chứa SHA-256(muối + mã). Mỗi save dùng 1 lần. Trần 50 Muỗng Vàng + 1 TNC.
- **[GĐ2] Quà quay lại**: vắng 3/7/14 ngày được 30/60/100 Muỗng Vàng, kèm tuần "Trở lại bếp" có 3 nhiệm vụ nhẹ.
- **[GĐ2] Đi chợ sớm mặc cả**: 3 lượt mỗi ngày, canh kim để giảm 3/8/15%. Nói câu lịch sự thì được cộng.
- **[GĐ2] Màu dù xe mua bằng Muỗng Vàng** (3 màu, 30 Muỗng Vàng mỗi màu, chỉ thẩm mỹ).
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
| **Muỗng Vàng** | Tiền cao cấp, **chỉ kiếm trong game** | Điểm danh; Rương ngày (5 mỗi ngày); chuỗi; thư; lên chặng 100–300 (GĐ2); Rương tuần, thành tựu, két khớp +2 (GĐ2) | MVP: đổi nhiệm vụ (5); đề xuất cho mua Cà phê sữa đá bằng 60. GĐ2: Kệ Đặc biệt, trang trí, màu dù, Vé Bù | MVP |
| **Thạo món** | Tiến độ riêng từng món | Nấu đạt Ngon trở lên | — | MVP |
| **Tem Lễ Hội** | Token sự kiện, có hạn | Món trong sự kiện; nhiệm vụ và điểm danh sự kiện; chuỗi sự kiện | Quầy đổi | GĐ2 |
| **Mảnh công thức** | 10 mảnh cùng món thì mở món đó | Rương tuần | Góc Mảnh (đặt 1 "món ưu tiên") | GĐ2 |

**Ba "túi" tiền trong ca và cách gộp**:
- **Két** (tiền mặt): bắt đầu bằng quỹ lẻ 200.000đ, tài sản riêng, không tiêu được.
- **Tiền QR** trong ca và **hũ tip**.
- **Cuối ca**: ví Tiền quán += (tiền mặt trong két − 200.000đ) + tiền QR + hũ tip − chi phí cố định (20.000đ) − hoàn tiền. Nếu đang nợ, trừ tiếp phần trả nợ. Đầu ca sau, két tái lập đúng 200.000đ.

**Luật tách lớp**:
- Không có đường đổi Tiền quán sang Muỗng Vàng.
- Tem đổi sang Muỗng Vàng có trần 50 mỗi sự kiện; Tem dư đổi sang Tiền quán với tỉ lệ thấp.
- Không bán bất kỳ loại tiền nào bằng tiền thật.
- Mở dần: ca đầu tiên chỉ thấy Tiền quán và danh tiếng; Muỗng Vàng xuất hiện ở lần điểm danh đầu; Tem chỉ hiện khi có sự kiện.

### 11.2 TNC và tỉ lệ giá vốn (FC) theo chặng

| Chặng | Khách/ca | Giá trung bình/khách | Doanh thu/ca | FC mục tiêu | Chi phí cố định/ca | Tip | **TNC** |
|---|---|---|---|---|---|---|---|
| 1 | 4–8 | khoảng 15–25k | khoảng 60–195k | 40% (món chính 45%, đồ uống 30–40%) | 20k | khoảng 9–18k | **Tăng theo ngày game: 20k (ngày 1–2), 35k (3–4), 65k (5–6), 85k (7–8), 100k (từ 9); trung bình cả chặng khoảng 80k** |
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
| 1 | 200–250k (đề xuất cho Cà phê sữa đá trả được bằng 60 Muỗng Vàng) | khoảng 3–4 ca lãi lúc mua | — | — |
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

**Nâng cấp MVP** (M2, mỗi loại 1 cấp):

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
| 1 (ca 1–3) | khoảng 78k | 20k | 10k (bước 2, 3) | 0 (Muỗng Vàng, thẩm mỹ) | khoảng 5k (Phiếu Chợ Sớm của thư chào mừng) | **35k** | **31%** |
| 2 (ca 4–7) | khoảng 265k | 52k | 45k (bước 4, 5) | khoảng 7k (Phiếu Chợ Sớm) | 0 | **104k** | **28%** |
| 3 (ca 8–11) | khoảng 405k | 80k | 30k (bước 6) | 0 (Muỗng Vàng) | khoảng 4,5k (quà đời thường) | **114,5k** | **22%** |
| 4 (ca 12–15) | khoảng 421k | 80k | 0 (bước 7 thưởng Muỗng Vàng) | khoảng 20k (Bạt che mưa, danh nghĩa) | khoảng 4,5k | **104,5k** | **20%** |
| **Cả Chặng 1** | **khoảng 1,17tr** | 232k | 85k | 27k | 14k | **358k** | **23,4%** |

- Mọi ngày đều dưới trần 35%. Ngày thật 1 cao nhất (31%) vì lãi bán hàng ca đầu còn thấp; đây là chủ ý, giúp người mới có tiền mua Dao thép tốt ngay ngày đầu.
- Quà lễ (20/10, 20/11) phụ thuộc lịch nên không nằm trong bảng; quà 20/11 là 0,5 TNC.
- Muỗng Vàng cả Chặng 1: khoảng 90, đủ mua Cà phê sữa đá (60, nếu áp dụng đề xuất) và vài lần đổi nhiệm vụ.
- Nếu số liệu thử nghiệm cho thấy tỉ lệ vượt 35% ở bất kỳ ngày nào thì giảm hệ số thưởng nhiệm vụ trước.

### 11.6 Lưới an toàn và phạt
- **Không game over, không xóa save.**
- **"Dì Sáu cho mượn"** [MVP, M1]: khi Tiền quán thấp hơn chi phí cố định một ca (20.000đ), Dì Sáu cho mượn **240.000đ** (3 lần TNC trung bình Chặng 1). Trả 110% (264.000đ) bằng cách tự trừ 25% lãi mỗi ca có lãi. Mỗi lần chỉ được 1 khoản. Đang nợ thì không lên chặng được.
- **Gói cứu trợ** [GĐ2]: nguyên liệu đủ 1 ca, tối đa 1 lần mỗi 3 ngày game (khi đã có kho).
- **Chơi lại ca** [GĐ2]: luật ở mục 10.E.
- **Mọi phạt đều có trần**: không bao giờ tính theo % Tiền quán đang giữ. Mỗi tình huống lỗ tối đa 0,5 TNC và không quá 20% doanh thu ca.

---

## 12. Mẹo nghề: lồng nhẹ vận hành F&B [MVP, M3]

**Luật hiển thị**
- Mẹo hiện khi người chơi gặp một bước lần đầu (trong phần hướng dẫn), hoặc ngay sau lần đầu mắc một loại lỗi.
- Dạng thông báo ngắn 3 giây, **không dừng game**, mỗi mẹo tối đa 2 câu.
- Ngoài phần hướng dẫn, tối đa 1 mẹo mỗi ca. Tắt được trong Cài đặt.
- Mẹo đã gặp được gom vào **Sổ tay nghề**, chia nhóm Quầy / Bếp / Kho / Phục vụ-Quản lý. Đủ một nhóm được danh hiệu và 20 Muỗng Vàng.
- Màn chờ tải hiện ngẫu nhiên một mẹo đã mở. Cuối ngày có mục "Mẹo của Dì Sáu".
- Mọi con số trong mẹo đều ghi rõ là **"số liệu minh họa"**. Cần người làm bếp hoặc kế toán duyệt lại trước khi dùng để đào tạo chính thức.

**20 thẻ Mẹo nghề của MVP**

| Nhóm | Thẻ |
|---|---|
| Quầy (12) | (1) Luôn đọc lại order trước khi báo tổng: sửa ở quầy mất 2 giây, sửa ở bếp mất cả một món. (2) Khách dặn kiêng gì thì ghi ngay lên phiếu, đừng tin trí nhớ. (3) Hai phần cùng món mà khác yêu cầu thì tách thành hai dòng. (4) Báo tổng rõ ràng và chỉ bảng giá cho khách thấy. (5) Để tờ tiền khách đưa trên nắp két tới khi thối xong. (6) Đếm tiền thối hai lần: lúc lấy khỏi két và trước mặt khách. (7) Nói to: "Nhận 200 nghìn, thối 170 nghìn". (8) Chuẩn bị đủ tiền lẻ đầu ca. (9) Chỉ xác nhận chuyển khoản khi loa hoặc ứng dụng báo tiền đã về đúng số; ảnh chụp màn hình không phải là tiền. (10) Trả trước thì thu tiền xong mới gửi phiếu vào bếp. (11) Ghi chú đặc biệt phải nằm trên phiếu bếp, đừng chỉ dặn miệng. (12) Bếp quá tải thì báo trước thời gian chờ cho khách mới |
| Bếp (6) | (13) Rửa rau dưới vòi nước chảy rồi mới thái. (14) Dùng thớt riêng cho đồ sống và đồ chín, rau. (15) Nêm từ ít tới nhiều. (16) Chảo dầu bốc cháy: tắt bếp, đậy kín nắp, tuyệt đối không dội nước. (17) Định lượng chuẩn giúp món đồng đều và giữ được giá vốn. (18) Làm hỏng thì làm lại; ra món kém còn tốn hơn một phần nguyên liệu |
| Phục vụ, Quản lý (2) | (19) Khách phàn nàn: lắng nghe, xin lỗi, giải quyết, cảm ơn. (20) Quán nhỏ thường có giá vốn khoảng 35–45% giá bán; nhà hàng thường giữ khoảng 28–35% (số liệu minh họa) |

Mỗi thẻ khai báo `{id, group, text, trigger}` trong `src/data/tips.js`; `trigger` là mã sự kiện hoặc mã lỗi khiến thẻ mở lần đầu (ví dụ thẻ 9 mở khi xác nhận nhầm QR giả, hoặc khi Loa chặn ảnh giả lần đầu).

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
- **Lưu tiến trình**: save một khóa có checksum và một bản dự phòng; lưu cả ca đang dở. Tải lại giữa một bước mini-game thì bước đó chơi lại từ đầu với cùng tham số. [M3] Mã sao lưu để chép sang máy khác; nhắc sao lưu mỗi 7 ngày thật.
- **Đồng hồ**: ngày đổi lúc 04:00 giờ Việt Nam. [M3] Lưu thời điểm lớn nhất từng thấy; nếu giờ máy lùi hơn 10 phút thì khóa quà theo ngày (vẫn chơi bình thường) và hiện lời nhắc nhẹ. Tua giờ tới trước chỉ "ứng trước" phần thưởng. [GĐ2] Lấy thêm giờ máy chủ.
- **Chống chữ cấm**: test tự động quét mã nguồn để cấm tên game tham khảo, tên sản phẩm của công ty người dùng, tên ngân hàng, ví điện tử, app giao hàng thật và các từ nội bộ trên giao diện.
- **Mở bằng `file://`**: thông báo "hãy chạy máy chủ tĩnh" viết bằng HTML tĩnh, vì ES module không chạy qua `file://`.
- **Kiểm thử**: unit test bằng `node:test`; e2e bằng Playwright trên khung điện thoại 390×844, chạm, locale `vi-VN`, múi giờ Việt Nam.
- **Ngân sách**: JS và CSS dưới khoảng 250 KB chưa nén; từ lần mở thứ hai chơi được offline (M3).
- **Triển khai**: host tĩnh, mọi đường dẫn tương đối. Chọn nơi host và quy trình tự động ở GĐ2.

---

## 14. Lộ trình MVP → GĐ2 → GĐ3

### 14.1 Phạm vi MVP
- Chỉ **Chặng 1 "Xe đẩy đầu hẻm"**. Người chơi chơi từ ngày 1 tới khi đủ điều kiện lên Chặng 2 (150 danh tiếng, sao trung bình ≥3,8, 3 công thức, 2 món thạo cấp 2, xong chuỗi "Ngày đầu ra phố", 500.000đ). Khi đó hiện màn "Quán cóc vỉa hè – sắp khai trương" với nút bị khóa, và người chơi vẫn chơi tiếp Chặng 1 với các mục tiêu sau khi đủ điều kiện. Bản đồ hiện đủ 7 chặng, các chặng sau hiện mờ.
- Quy mô ước tính: **khoảng 9.000–12.000 dòng**, nên chia thành 3 mốc. Mỗi mốc là một bản chạy được, có commit riêng.
- Dữ liệu của cả 5 món được viết ngay từ M1; món Shop và món sự kiện chỉ bán được từ M2.

### 14.2 M1 — Lõi chơi được
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

### 14.3 M2 — Kinh tế và LiveOps
**Nội dung**
- **QR** từ ngày 4 (khoảng 25–30% khách), **ảnh chuyển khoản giả** 4% từ ngày 7, **Loa báo tiền**.
- **Shop 2 món**: Bánh tráng trộn (250.000đ, từ ngày 2), Cà phê sữa đá (200.000đ, từ ngày 4; đề xuất cho trả thêm bằng 60 Muỗng Vàng); thẻ xem trước; **nấu thử** miễn phí; 3 thẻ bóng mờ Chặng 2.
- **5 nâng cấp**: Dao thép tốt, Chảo chống dính, Ghế nhựa chờ, Loa báo tiền, Máy tính cầm tay (ngày 7, chỉ cộng tổng).
- **Thạo món cấp 1–3** hiện trên giao diện, "Tự làm" bước phụ từ cấp 2.
- **Điểm danh 7 ô** (vòng đầu Tuần Khai Trương tặng hiện vật).
- **3 nhiệm vụ ngày và Rương ngày**; đổi nhiệm vụ.
- **Hộp thư**: thư chào mừng, thư phiên bản, quà lễ 20/10 và 20/11, quà đời thường, nhiệm vụ quên nhận, review "thối thiếu" đến muộn.
- **Chuỗi** "Ngày đầu ra phố" (7 bước) và "Làm quen QR" (3 bước).
- **Sự kiện ngày**: Trời mưa, Nắng nóng.
- **Sự kiện Tri ân 20/11** với chuỗi 3 bước và món **Chè bưởi**; tham số `?devNow` khi chạy ở `localhost`.
- **"Món của ngày"**; tip 10.000đ khi đang trong chuỗi "Quầy chuẩn".

**Điều kiện hoàn thành M2**
- Unit test cho nhiệm vụ, điểm danh, hộp thư (không nhận trùng id), chuỗi (không kẹt khi có Loa), Shop, sự kiện (biên thời gian đầu/cuối), mốc 04:00 giờ Việt Nam.
- E2E: (3) điểm danh qua mốc 04:00 giờ Việt Nam; (4) sự kiện mở → nhận Chè bưởi qua chuỗi → hết hạn vẫn giữ món.
- Mô phỏng tay theo `docs/can-bang.md`: tỉ lệ thưởng mỗi ngày thật ≤ 35%.

### 14.4 M3 — Hoàn thiện
**Nội dung**
- **PWA offline** (manifest, service worker; test đối chiếu danh sách tệp precache với cây thư mục thật).
- **Khóa quà khi lùi giờ**.
- **Mã sao lưu** (chép mã, nhập mã có xem trước ngày, Tiền quán, chặng trước khi ghi đè).
- **Tình huống trong ca**: "Khách mở hàng bằng tờ 500k"; mức Nhiều / Vừa / Ít.
- **20 thẻ Mẹo nghề và Sổ tay nghề**.
- **Sổ công thức**: món đã có, món còn khóa, số lần nấu, điểm cao nhất, cấp thạo, huy hiệu Không tì vết; mục tiêu sau khi đủ điều kiện lên chặng.
- **Cài đặt**: âm thanh, rung, 2 công tắc Hỗ trợ, bật/tắt Mẹo nghề, giảm chuyển động, sao lưu/khôi phục bằng mã, chơi lại từ đầu.
- **Âm thanh**: 8 âm WebAudio.

**Điều kiện hoàn thành M3**
- E2E: (5) chơi được offline sau lần mở đầu; (6) lùi giờ thì bị khóa quà theo ngày.

### 14.5 Đường cắt khi thiếu thời gian (cắt từ trên xuống)
1. Âm thanh.
2. Tình huống trong ca (giữ sự kiện ngày).
3. "Món của ngày".
4. Chuỗi "Làm quen QR" (giữ QR và ảnh giả).
5. Bước chọn câu xin lỗi trong màn Xử lý phàn nàn.
6. Chuyển tab giữa các bước (thay bằng phục vụ tuần tự: làm xong món mới quay lại quầy).

**Không bao giờ cắt:** luồng 4 khâu và thanh 4 chấm; 3 lớp đơn (yêu cầu thật – phiếu – món); đọc lại đơn; báo tổng và thối tiền; Thớt sơ chế; 6 cơ chế bếp; phiếu chấm tách lỗi quầy/lỗi bếp; lưu cùng ca dở; điểm danh; nhiệm vụ ngày; hộp thư; chuỗi "Ngày đầu ra phố"; Shop 2 món; sự kiện 20/11 với Chè bưởi; unit test; các kịch bản e2e.

**Để sau, không làm ở MVP:** kho, hạn dùng, sơ chế đầu ca, nấu mẻ, bếp chạy nền; 6 cơ chế còn lại; ăn tại chỗ, 6 khách quen có tên; máy POS, khuyến mãi, thẻ, tờ 1k/2k, chốt ca đếm két; nhân viên; Tem và Quầy đổi; Kệ Đặc biệt, kệ xoay, Mảnh công thức; lịch tháng, nhiệm vụ tuần, chuỗi ngày, thành tựu, giftcode; màu dù, trang trí; Chặng 2–7; thử thách ngày; `lab.html`, Sổ số liệu chi tiết; giờ máy chủ; backend, bảng xếp hạng, Web Push; Chế độ Học việc; nhạc nền.

### 14.6 GĐ2 (mục tiêu: Chặng 2–3 chơi được, LiveOps đầy đủ khi offline)
Hai mốc lịch: sự kiện **Giáng sinh 2026** và nội dung **Tết Đinh Mùi** chốt trước giữa tháng 01/2027.
1. **Chặng 2**: ăn tại chỗ, dọn bàn, đóng gói; 6 khách quen và Sổ khách; LUC, KHUAY, BAY_DIA, VUOT_CHUOI; Gỏi cuốn, Bún thịt nướng, Cơm tấm, Chè ba màu; kho theo lô FIFO kèm dự báo; đi chợ mặc cả; bếp 2 họng.
2. **LiveOps**: Giáng sinh, Tết (Bánh chưng); Tem và Quầy đổi; Kệ Đặc biệt; Kệ Đặc sản; Mảnh công thức; nhiệm vụ tuần và Rương tuần; chuỗi ngày có vé nghỉ; thành tựu; lịch tháng và Vé Bù; quà quay lại; giftcode; Ca Hứng Khởi; `gifts.json` tải từ xa; **thử thách ngày theo seed chung** có thẻ chia sẻ.
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

## Phụ lục A. Thay đổi chính so với bản v0.1

| Nội dung | v0.1 | v0.2 (bản này) |
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
