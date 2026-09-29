# Đề xuất thiết kế game F&B: "Bếp Khởi Nghiệp" (tên làm việc)

Phiên bản 0.1 · ngày 29/09/2026 · Bản này hợp nhất 7 góc nhìn: Quầy, Bếp và Shop, Hành trình, LiveOps, Kinh tế, Nội dung Việt và đào tạo, Kỹ thuật.

Hiện trạng repo `/home/user/gamefnb`: chỉ có `.git`, chưa có commit nào. Remote là `github.com/kazesanaei/gamefnb`. Môi trường đã kiểm tra có sẵn Node 22.22.2; Playwright 1.56.1 và http-server cài toàn cục tại `/opt/node22/lib/node_modules`; Chromium 1194 nằm ở `/opt/pw-browsers`.

---

## 0. Quy ước và các quyết định hợp nhất

### 0.1 Quy ước dùng trong tài liệu
- **Chặng 1–7** chỉ tiến trình trong game. **MVP / GĐ2 / GĐ3** chỉ lộ trình phát triển.
- **Ngày game**: ở Chặng 1–2, một ngày game là một ca bán. Từ Chặng 3, một ngày game có 2 ca (trưa và tối).
- **Ngày thật** là ngày LiveOps. Ngày đổi lúc **04:00 giờ Việt Nam (UTC+7)**, tính từ UTC nên không phụ thuộc múi giờ của máy.
- **Tiền** lưu bằng số nguyên đồng. Cách hiển thị: hóa đơn ghi "37.000đ", thanh trạng thái ghi "37k", số lớn ghi "1,25tr".
- **TNC (Thu nhập chuẩn một ca)** là lãi ròng một ca của người chơi trung bình (khoảng 4,2 sao) ở chặng hiện tại. Mọi phần thưởng bằng tiền đều khai báo theo bội số TNC.
- **Quy ước đặt tên trong code**: hàm và biến viết bằng tiếng Anh; id dữ liệu viết tiếng Việt không dấu kiểu snake_case (ví dụ `banh_mi_op_la`); chuỗi hiển thị cho người chơi viết tiếng Việt có dấu.

### 0.2 Các mâu thuẫn giữa góc nhìn và lựa chọn

| # | Vấn đề | Các phương án đã được đề xuất | Chọn | Lý do |
|---|---|---|---|---|
| 1 | Số chặng | 4 / 5 / 6 / 7 | **7 chặng**: 6 chặng vận hành, cộng Chặng 7 "Chuỗi" làm phần cuối game | Đủ đường đi "sơ khai → sang trọng", mỗi chặng đổi cách làm việc. Tái khởi nghiệp nằm sau Chặng 7 |
| 2 | Thuật ngữ | "Giai đoạn" dùng lẫn cho cả game và lộ trình | Chặng (trong game) và MVP/GĐ2/GĐ3 (phát triển) | Tránh nhầm |
| 3 | Tiền vận hành | Xu / Tiền | **Tiền** (VNĐ ảo) | Người Việt hiểu ngay. "Xu" dễ bị lẫn với tiền cao cấp |
| 4 | Tiền cao cấp | Ngọc Bếp / Xu Bếp / Muỗng Vàng / Tem Đầu Bếp | **Muỗng Vàng (MV)**, chỉ kiếm được trong game | Đúng chủ đề bếp, không trùng với "Tem" của sự kiện |
| 5 | Đơn vị lưu tiền | nghìn / đồng | **Số nguyên đồng** | Về sau có khuyến mãi %, VAT, chia hóa đơn mà không bị lệch |
| 6 | Mô hình thanh toán | Trả sau từ Chặng 2 / từ Chặng 5 | **Trả trước đến hết Chặng 4.** Từ Chặng 5, trả sau là một "Quy trình mới"; quầy mang về vẫn trả trước song song | Giữ đúng thứ tự người dùng yêu cầu (order → thanh toán → tính tiền → làm đồ). Dễ học, dễ code |
| 7 | Bếp làm theo gì | Lời khách / phiếu | **Làm theo phiếu.** Mỗi đơn lưu 3 lớp: *yêu cầu thật* – *phiếu người chơi ghi* – *món làm ra* | So yêu cầu với phiếu ra **lỗi quầy**, so phiếu với món ra **lỗi bếp** |
| 8 | Cách chấm sao khách | Trừ dần từ 5 / công thức 0,65Q+0,35C | **Trừ dần**: sao gốc theo hạng món, trừ phạt quầy, trừ phạt chờ | Minh bạch. Mỗi lần trừ gắn với một lỗi và một câu review |
| 9 | Tên các thang điểm | Mỗi góc nhìn một bộ tên | Bước: *Hoàn hảo / Tốt / Đạt / Hỏng*. Món: *Tuyệt hảo / Ngon / Được / Kém / Hỏng*, kèm huy hiệu *Hoàn mỹ*. Khách: *1–5 sao* | 3 thang dùng 3 bộ từ khác nhau |
| 10 | Danh tiếng | Có giảm / không giảm | **Không bao giờ giảm.** Sao trung bình của 30 đánh giá gần nhất mới dao động | Công sức không bị "bốc hơi" |
| 11 | Khách đã trả tiền mà hết kiên nhẫn | Bỏ về đòi hoàn tiền / chỉ bị trừ sao | **MVP: chỉ trừ sao.** GĐ2 thêm "đòi hoàn tiền" có lựa chọn xử lý | Không làm người mới ức chế khi còn đang học bếp |
| 12 | Kiên nhẫn khi khách đang được phục vụ ở quầy | ×0 / ×0,5 | **×0,5**; ở chế độ Thong thả là ×0 | Vẫn giữ áp lực nhẹ để nhận order nhanh |
| 13 | Giờ reset ngày | 00:00 / 04:00 / 05:00 / giờ máy | **04:00 giờ Việt Nam** | Người Việt hay chơi khuya |
| 14 | Nhiệm vụ ngày | 3 / 5 | **3** (1 Quầy, 1 Bếp, 1 Chất lượng/Kinh doanh) kèm hòm ngày | Xong trong khoảng 2 ca, không thành việc vặt |
| 15 | Số mini-game ở MVP | 6 / 8 / 10 / 12 | **6 cơ chế gốc**: CHON, CHA, THAI, CHAM, LUA, ROT. 6 cơ chế còn lại làm ở GĐ2–3 | Đủ cho 3 món. Mỗi cơ chế khoác được nhiều "lớp vỏ" thao tác |
| 16 | Món ở MVP | Từ 3 đến 8 món | **3 món**: Bánh mì ốp la, Trà tắc (có sẵn); Bánh tráng trộn (mua ở Shop) | Vừa đủ 6 cơ chế. Bánh tráng trộn có nhiều nguyên liệu nhất nên thử được luật "đúng và đủ". Gỏi cuốn cần cơ chế cuốn nên để GĐ2 |
| 17 | Kho ở MVP | Có lô, có hạn dùng / không có kho | **MVP không có kho.** Giá vốn bị trừ lúc bắt đầu nấu. Kho theo lô FIFO và sơ chế đầu ca làm ở GĐ2 | Giữ MVP tập trung vào trục Quầy → Bếp |
| 18 | Tính tổng tiền ở Chặng 1 | Có POS từ ngày 3 / tự nhẩm | **Tự nhẩm**, có nâng cấp "Máy tính cầm tay". Máy POS thật là mốc của Chặng 3 | Công cụ tiến hóa theo chặng. POS thành phần thưởng thấy rõ |
| 19 | QR ở Chặng 1 | Không có / 20–40% khách | **Có từ ngày 4, khoảng 25% khách.** Từ ngày 7 có 4% ảnh chụp chuyển khoản giả | Bài học có thật, chi phí làm thấp |
| 20 | Số mệnh giá tiền | 7 / 9 | **Chặng 1–2: 7 tờ từ 5k đến 500k** (giá luôn tròn 5.000đ). **Từ Chặng 3** thêm tờ 1k và 2k khi có khuyến mãi % | Két gọn trên màn hình nhỏ |
| 21 | Lãi của món sự kiện | Không quá +10% / 15% / 20% | **Lãi trên mỗi giây nấu không vượt món tốt nhất cùng chặng quá 10%** | Món sự kiện không trở thành "bắt buộc phải có" |
| 22 | Ngân sách thưởng ngoài bán hàng | 27% (trần 35%) / 40% lãi | **Mục tiêu 25–30%, trần 35%** tổng Tiền nhận trong ngày | Bán hàng vẫn là nguồn thu chính |
| 23 | Người dẫn dắt | Ngoại / Dì Sáu / Cô Út Gừng | **Dì Sáu** (cố vấn, kiêm mascot bếp) và **Anh Khoa** (kỹ thuật viên máy POS) | Một cố vấn có cá tính, không trùng tên NPC của game tham khảo |
| 24 | Trần chất lượng khi nhân viên làm | 85–95 / "chỉ đạt mức Tốt" | **88**, thấp hơn ngưỡng Tuyệt hảo | Luật "Ra tay": món Tuyệt hảo chỉ đến từ tay chủ quán |
| 25 | Cách vẽ mini-game | Canvas / DOM+SVG | **DOM/CSS + SVG** với viewBox 0 0 100 100 | Chữ Việt sắc nét, test được bằng `data-testid`, đủ 60 fps |
| 26 | Cấu trúc thư mục | `js/...` / `src/core-data-ui` | `src/core`, `src/data`, `src/ui` | Test logic bằng Node, cân bằng bằng dữ liệu |
| 27 | Quảng cáo | Không có / thử có trần | **Không có ở MVP và GĐ2.** GĐ3 thử quảng cáo tặng thưởng tùy chọn, trần 10% thu nhập ngày, tắt ở chế độ đào tạo | Đo tỉ lệ giữ chân khi chưa có quảng cáo trước |
| 28 | Cách kết thúc ca | Theo giờ / theo số khách | **Số khách cố định, sinh bằng seed.** Ca kết thúc khi khách cuối cùng rời đi | Công bằng, và tải lại trang không đổi được khách |

---

## 1. Ý tưởng tổng thể

**Ba phương án tên game** (không trùng với game tham khảo, cần tra trùng nhãn hiệu và cửa hàng ứng dụng trước khi phát hành):
1. **Bếp Khởi Nghiệp** (đề xuất dùng; mã lưu `bkn`)
2. **Lên Món Nha!**
3. **Từ Xe Đẩy Tới Nhà Hàng**

**Câu chào hàng:** "Nhận order, thu tiền, thối tiền chuẩn như quầy thật, rồi vào bếp rửa, thái, chiên, nêm từng nguyên liệu, để biến chiếc xe đẩy đầu hẻm thành nhà hàng sang trọng."

**Đối tượng người chơi**
- Người chơi casual 16–40 tuổi, thích game quản lý quán ăn mang màu Việt trên điện thoại, mỗi ngày chơi 10–20 phút.
- Người mới vào ngành F&B (thu ngân, phục vụ, phụ bếp): học việc mà vẫn thấy vui.
- Người đào tạo, như chính người dùng: dùng Sổ tay nghề, Chế độ Học việc và mã bài thi (GĐ2–3).

**Điểm khác biệt so với 5 game tham khảo**
1. **Quy trình quầy chuẩn**: đọc hiểu order, ghi phiếu, đọc lại đơn, báo tổng, thối tiền bằng tờ mệnh giá Việt Nam, kiểm tra chuyển khoản, kẹp phiếu bếp. Không game tham khảo nào có phần này.
2. **Bếp kiểu Cooking Mama chạy bằng dữ liệu**: một món có nhiều nguyên liệu và phải *chọn đúng, đủ* rồi *sơ chế từng thứ*. Mỗi bước được chấm điểm.
3. **Tách lỗi quầy và lỗi bếp** trên phiếu chấm, nên người chơi và người đào tạo biết phải sửa ở đâu.
4. **Công cụ bán hàng tiến hóa theo chặng**: sổ tay → máy tính cầm tay → máy POS → POS quản lý bàn → order tại bàn cùng màn hình bếp.
5. **LiveOps theo ngày thật**: điểm danh, nhiệm vụ, hộp thư quà, sự kiện lễ Việt có món giới hạn. Cả 5 game tham khảo đều thiếu phần này.
6. **Mẹo nghề lồng nhẹ** vào đúng khoảnh khắc chơi. Game không dùng gacha, không bán tiền ảo bằng tiền thật, không xóa save khi thua.

---

## 2. Vòng lặp cốt lõi của một khách và vòng lặp meta

### 2.1 Luồng một khách (trả trước, Chặng 1–4)

```
Đến → Xếp hàng → Gọi món (bóng thoại) → Ghi sổ order → [Đọc lại đơn] → Chốt order
→ Báo tổng → Khách trả tiền → Thối tiền / Xác nhận QR → Kẹp phiếu bếp
→ (Bếp) chọn phiếu → Chọn nguyên liệu → Chuỗi sơ chế và nấu → Ra món
→ Khách nhận món → Chấm sao, tip, review, danh tiếng → [Mẹo nghề nếu đây là lỗi lần đầu] → Rời đi
```

**Máy trạng thái khách** (hàm thuần `step(customer, event)` trả về `{customer, effects[]}`):

`DEN → XEP_HANG → GOI_MON → BAO_TONG → THANH_TOAN → THOI_TIEN | XAC_NHAN_QR → CHO_MON → NHAN_MON → DANH_GIA → ROI_DI`

- Nhánh phụ: `XEP_HANG → BO_VE`, chỉ khi hết kiên nhẫn P1, và chỉ từ ngày 4.
- Phiếu bếp có máy trạng thái riêng: `CHO_LAM → DANG_LAM → XONG`, theo dõi từng phần.

### 2.2 Từng khâu, cách chấm và thời lượng mục tiêu (Chặng 1)

| Khâu | Người chơi làm gì | Chấm gì | Thời lượng |
|---|---|---|---|
| Gọi món | Đọc bóng thoại, chạm thẻ món và chip ghi chú | So phiếu với yêu cầu thật | 6–12 giây |
| Đọc lại đơn (tùy chọn) | Bấm "Đọc lại" | Bắt lỗi sớm: mỗi lỗi −8% kiên nhẫn, không trừ sao | khoảng 1,5 giây |
| Báo tổng | Tự cộng tiền theo bảng giá, gõ trên bàn phím số | Đúng / thiếu / dư | 3–6 giây |
| Thanh toán, thối tiền | Chạm tờ tiền trong két vào khay thối, hoặc chờ báo tiền vào | Đúng số, gọn số tờ, nhanh | 4–8 giây |
| Kẹp phiếu | Kéo phiếu lên dây phiếu | Không chấm | 1 giây |
| Bếp | Chọn nguyên liệu, rồi 3–8 thao tác | Điểm từng bước, ra điểm chất lượng Q | 18–35 giây mỗi phần |
| Ra món, đánh giá | Bấm chuông | Sao, tip, review | 2 giây, không chặn thao tác |

Mỗi khách tốn khoảng 45–55 giây thao tác. Nhờ khách tới xen kẽ, thời gian hiệu dụng còn khoảng 35–45 giây. Tỉ lệ mục tiêu là **khoảng 30% thời gian ở quầy, 70% ở bếp**.

**Công thức sao của khách:** `Sao = kẹp(làm_tròn(sao_gốc_theo_hạng_món − phạt_quầy − phạt_chờ), 1, 5)`. Bảng phạt nằm ở mục 3.11 và mục 4.4.

### 2.3 Vòng lặp meta

| Nhịp | Nội dung |
|---|---|
| **Ca (ngày game)** | *Chuẩn bị*: xem dự báo khách, sự kiện ngày, nhiệm vụ, Shop, nâng cấp. *Ca bán*: khoảng 4–7 phút, 4–8 khách ở Chặng 1. *Tổng kết*: sổ lãi lỗ, lỗi quầy và lỗi bếp, két, review, Mẹo của ngày, "Ngày mai: …" |
| **Ngày thật** | Điểm danh, 3 nhiệm vụ và hòm ngày, hộp thư quà. Mục tiêu 3–4 ca, tổng 15–20 phút |
| **Tuần thật (GĐ2)** | Nhiệm vụ tuần, rương tuần, kệ công thức xoay vòng, kiểm tra Mẹo nghề cuối tuần |
| **Mùa (GĐ2–3)** | Sự kiện lễ 7–14 ngày có món giới hạn, lịch điểm danh tháng, Thẻ Đầu Bếp 28 ngày (GĐ3) |
| **Dài hạn** | 7 chặng, Sổ công thức, thạo món, Sổ tay thất lạc của Dì Sáu, Đũa Vàng, Chuỗi, Tái khởi nghiệp |

---

## 3. Khâu quầy

### 3.1 Bố cục màn hình dọc (chuẩn 390×844)
Từ trên xuống:
- **Thanh trên**: ngày, giờ, Tiền, sao trung bình.
- **Vùng phố và quầy (khoảng 30%)**: tối đa 3 khách xếp hàng, khách đứng đầu có bóng thoại, kèm vòng kiên nhẫn đổi màu xanh → vàng → đỏ.
- **Dây phiếu bếp (khoảng 6%)**, luôn hiện.
- **Vùng thao tác (khoảng 55%)**: Sổ order, Báo tổng, Két, hoặc Bếp.
- **Thanh tab**: `[Quầy · số khách chờ] [Bếp · số phiếu]`.

Tín hiệu: có khách mới thì kêu chuông và hiện chấm đỏ trên tab Quầy; khách đầu hàng còn dưới 30% kiên nhẫn thì máy rung nhẹ (30 ms); phiếu đỏ thì nhấp nháy.

### 3.2 Nhận order
- **Bóng thoại là câu nói tự nhiên** ghép từ mẫu: `[xưng hô] + [số lượng + món] + [ghi chú] + [đuôi câu]`. Giọng Nam chiếm 70%, giọng Bắc 30%. Ví dụ: "Cho con 2 ổ ốp la, 1 ổ hổng hành, trứng chín kỹ nghen!" và "Cho cô cái bánh mì trứng, không cho hành nhé."
- **Từ đồng nghĩa** (MVP có 15 cặp): không hành = hổng hành = khỏi hành; ngò = rau mùi; hành lá = hành hoa; trà tắc = trà quất; ly = cốc; lạt = nhạt; đậu phộng = lạc; bánh mì trứng = bánh mì ốp la; ít ngọt = bớt đường; không đá = khỏi đá; cay = có ớt; nhiều cay = cay xè; ít cay = cay nhẹ thôi; thêm trứng = thêm một quả; bánh tráng trộn = bánh tráng trộn thập cẩm.
- **Độ khó 7 ngày đầu**:
  - Ngày 1–2: mỗi đơn 1 dòng, có dải icon dưới bóng thoại.
  - Ngày 3: có thêm ghi chú, bỏ dải icon (bật lại được trong phần Hỗ trợ).
  - Ngày 4: 2 dòng.
  - Ngày 5: xuất hiện câu phải "tách dòng", ví dụ "2 ổ, 1 ổ không hành" phải ghi thành 2 dòng.
  - Ngày 6: có tùy chọn phụ thu, ví dụ "thêm trứng +5.000đ".
  - Ngày 7: tối đa 3 dòng.
- **Sổ order**:
  - Lưới thẻ món 2 cột. Chạm vào thẻ thì mở bảng trượt gồm số lượng (−/+, 1–3), chip ghi chú và nút "Thêm vào phiếu".
  - Trong danh sách dòng đã ghi: chạm để sửa, vuốt trái để xóa.
  - Hai nút ở cuối: "Đọc lại" và "Chốt order".
  - Mỗi dòng có dạng `{monId, soLuong, ghiChu[]}`. Hai phần cùng món nhưng khác yêu cầu thì phải là hai dòng.

### 3.3 Đọc lại đơn
- Thu ngân đọc lại *nội dung phiếu*, không đọc lại bóng thoại, ví dụ: "Dạ em đọc lại: 1 bánh mì ốp la không hành, 1 trà tắc ít đường ạ."
- Nếu đúng hết: khách nói "Đúng rồi em", được +5 điểm quy trình.
- Nếu có sai: khách chỉ ra dòng sai, dòng đó tô đỏ. Mỗi lỗi −8% kiên nhẫn, **không trừ sao**.
- Nếu bỏ qua bước này mà phiếu sai, lỗi sẽ đi thẳng vào bếp và bị phạt theo bảng ở mục 3.11.

### 3.4 Báo tổng (Chặng 1: tự nhẩm)
- Góc màn hình luôn có **bảng giá dán trên xe**. Người chơi gõ tổng theo đơn vị nghìn (gõ 30 thì hiện 30.000đ).
- Khách so số được báo với **giá của những món họ thật sự gọi**:
  - Báo **cao hơn** giá thật: khách luôn phát hiện ("Sao nhiều vậy em?").
    - Nếu do cộng sai: −1,5 sao và phải báo lại.
    - Nếu do phiếu ghi thừa món: −8% kiên nhẫn, sửa phiếu.
  - Báo **thấp hơn** giá phiếu: khách trả đúng số đã báo. Quán mất phần chênh và sổ ghi "Thu thiếu". Không bị trừ sao.
- Gian lận không bao giờ có lời.
- Thời gian mục tiêu: 4 giây, cộng 2 giây cho mỗi dòng thêm.
- **Máy tính cầm tay** (nâng cấp 150.000đ, mở từ ngày 3): tự cộng tổng khi chạm món và hiện luôn tiền cần thối. Bước báo tổng chỉ còn 1 chạm.
- **Hỗ trợ tính tiền** (trong Cài đặt): hiện sẵn tổng tiền và tiền thối. Điểm tốc độ của bước này bị giới hạn ở 50%. Không giảm phần thưởng.

### 3.5 Thanh toán
- **Ngày 1–3**: 100% trả tiền mặt.
- **Từ ngày 4**: khoảng 75% tiền mặt, 25% **QR tĩnh in sẵn**.
  - Khách quét mã. Sau 1–4 giây mới có thông báo "Đã nhận 30.000đ".
  - Người chơi chỉ được bấm "Đã nhận đủ" khi thông báo đã hiện.
  - **Từ ngày 7**, 4% giao dịch QR là *ảnh chụp màn hình cũ*, không có thông báo đi kèm. Nếu xác nhận thì mất trọn hóa đơn và mở thẻ Mẹo nghề.
  - Nâng cấp **Loa báo tiền** (150.000đ) tự xác nhận và chặn ảnh giả.
- Tiền mặt vào **két**, tiền QR vào **tài khoản**. Tổng kết ca tách riêng hai nguồn này.

### 3.6 Mini-game thối tiền
- **Két 7 ngăn**: 5k, 10k, 20k, 50k, 100k, 200k, 500k. Mỗi ngăn có huy hiệu số tờ còn lại. Tờ tiền là hình cách điệu có chữ "TIỀN GAME", **không** vẽ lại chân dung hay hoa văn bảo an. Tờ 20k và 500k cùng tông xanh nhưng khác sắc độ, là một cái bẫy nhẹ.
- **Quỹ tiền lẻ đầu ca 200.000đ**: 8 tờ 5k, 5 tờ 10k, 3 tờ 20k, 1 tờ 50k.
- **Tiền khách đưa nằm trên nắp két** tới khi thối xong mới tự cất vào đúng ngăn. Người chơi chạm ngăn để một tờ bay vào khay, chạm tờ trong khay để trả về két, rồi bấm "Đưa tiền thối".
- **Gợi ý**: ngày 1–3 hiện "Cần thối: X". Từ ngày 4 thì ẩn, trừ khi bật Hỗ trợ hoặc có Máy tính cầm tay.
- **Cách khách đưa tiền** (T là tổng hóa đơn):
  - 20% đưa vừa đủ.
  - 45% đưa tờ nhỏ nhất lớn hơn hoặc bằng T.
  - 20% đưa tờ lớn hơn một bậc.
  - 10% đưa tờ 200k hoặc 500k (từ ngày 4, tờ đó không quá 25 lần T).
  - 5% đưa thêm tiền lẻ để được thối chẵn (từ ngày 5).
  - Cô chú lớn tuổi hay đưa tờ lớn; shipper hay đưa tiền lẻ.
- **Chấm điểm**:
  - Thối đúng là đạt.
  - Nếu số tờ bằng cách thối tối ưu (tính bằng thuật toán tham lam) thì có thêm "Thối gọn" +5 điểm quy trình.
  - Thời gian mục tiêu: 5 giây, cộng 0,8 giây cho mỗi tờ trong cách thối tối ưu.
  - Thối **thiếu**: 90% khách đếm lại và phát hiện, −1 sao và phải bù. 10% không phát hiện, nhưng sáng hôm sau có review 2 sao gửi qua hộp thư.
  - Thối **dư**: quán mất tiền. 50% khách thật thà trả lại (+1 danh tiếng).
- **Hết tiền lẻ**: game kiểm tra xem còn thối được không bằng quy hoạch động nhỏ trên số tờ còn lại. Nếu không đủ, mở 3 lựa chọn:
  - "Xin khách tiền lẻ": 40% khách có, −5% kiên nhẫn.
  - "Mời khách chuyển QR" (khi đã mở QR).
  - "Làm tròn có lợi cho khách": thối dư tối đa 5.000đ.

### 3.7 Phiếu bếp và dây phiếu
- **Nội dung phiếu**: số phiếu (#001, đánh lại mỗi ngày), giờ trong game, từng dòng "2 × Bánh mì ốp la", ghi chú **VIẾT HOA MÀU ĐỎ** (ví dụ "KHÔNG HÀNH · CHÍN KỸ").
- **Dây phiếu chứa 3 phiếu** ở Chặng 1–2. Chặng 3 có kệ 5 phiếu; Chặng 5 có màn hình bếp 8 phiếu.
- **Viền phiếu đổi màu** theo phần trăm ngân sách chờ đã dùng: xanh dưới 50%, vàng 50–80%, đỏ trên 80% và nhấp nháy.
- Khi dây đầy, nút "Chốt order" bị khóa và hiện "Bếp đang đầy (3/3)".
- **Luật trả trước**: phải thu và thối tiền xong mới kẹp được phiếu. Bếp không bao giờ thấy đơn chưa thanh toán.

### 3.8 Khuyến mãi (GĐ2, từ Chặng 3)
- **Combo**: POS hiện banner "Áp combo?". Nếu khách gọi đủ món combo mà không được áp, 60% khách phát hiện, −0,5 sao.
- **Voucher**: người chơi đối chiếu 4 điều kiện là hạn dùng, giá trị đơn tối thiểu, có được cộng dồn không, và món áp dụng. Tỉ lệ: 70% hợp lệ, 30% không hợp lệ.
  - Áp voucher sai: sổ ghi "Thất thoát khuyến mãi".
  - Từ chối voucher hợp lệ: −1 sao.
  - Voucher hết hạn hôm qua: có lựa chọn "Du di".
- **Giờ vàng** và **thẻ tích điểm** (10 dấu tặng 1 món).
- **Quy tắc làm tròn**: số tiền giảm làm tròn **xuống** bội 1.000đ; tổng sau VAT và các phần chia hóa đơn làm tròn **lên**; người cuối cùng trả phần còn lại. Hóa đơn luôn có dòng "Làm tròn".

### 3.9 Chốt ca
- **MVP**: màn tổng kết tự tính "Tiền mặt đầu ca + thu − đã thối = phải có" và chỉ ra khoản lệch do thối sai.
- **GĐ2 (Chặng 3)**: người chơi tự đếm két theo từng mệnh giá (có nút −/+). Nếu lệch, nhật ký giao dịch chỉ ra đúng phiếu gây lệch, ví dụ "Phiếu #007 thối dư 10.000đ" hoặc "Phiếu #011 khách chuyển khoản nhưng chọn Tiền mặt". Két khớp: +2 MV và +5 danh tiếng. Nộp phần tiền mặt vượt quỹ lẻ vào tài khoản.

### 3.10 Quy trình quầy tiến hóa theo chặng

| Chặng | Nhận order | Tính tổng | Thanh toán | Gửi bếp | Mô hình |
|---|---|---|---|---|---|
| 1 Xe đẩy | Sổ order chạm chip | Tự nhẩm (+ Máy tính cầm tay) | Tiền mặt; QR tĩnh từ ngày 4 | Kẹp tay, dây 3 phiếu | Trả trước, bán mang đi, một mình làm hết |
| 2 Quán cóc | Sổ order + Sổ khách quen | Máy tính cầm tay | Tiền mặt, QR + loa báo tiền | Kẹp tay + thẻ số | Trả trước, thêm ăn tại chỗ 2 bàn |
| 3 Tiệm nhỏ | **Máy POS**, gợi ý bán thêm | POS tự tính; combo, voucher, giờ vàng | + QR động, thẻ, tờ 1k/2k | In bếp tự động, gọi số, kệ 5 phiếu | Trả trước; chốt ca; thuê thu ngân NPC |
| 4 Quán gia đình | POS quản lý bàn, đặt bàn qua điện thoại | + thẻ thành viên | + chia nhiều phương thức | In bếp theo số bàn | Trả trước tại quầy, khách mang số bàn |
| 5 Nhà hàng | Máy order cầm tay tại bàn | Tạm tính; tách, gộp, chuyển bàn; VAT mô phỏng; hóa đơn công ty | Chia hóa đơn theo nhiều phương thức | Màn hình bếp (KDS), chia trạm | **Trả sau** cho sảnh, quầy mang về vẫn trả trước |
| 6 Sang trọng | Trưởng bàn, đặt bàn có cọc, hồ sơ khách VIP | Phí phục vụ 5%, VAT | Thẻ quốc tế, tip ghi trên thẻ | Gọi món theo lượt | Trả sau, thực đơn nhiều món |
| 7 Chuỗi | Báo cáo chuỗi | — | — | — | Mỗi chi nhánh theo mô hình gốc của nó |

Mỗi lần lên chặng có một "ngày khai trương quy trình mới": Anh Khoa hướng dẫn 30–60 giây bằng khung sáng quanh nút cần bấm, kèm một chuỗi huấn luyện 3 bước.

### 3.11 Bảng phạt quầy (công khai trong Sổ tay)

| Lỗi | Hậu quả |
|---|---|
| Ghi sai món (khách nhận món khác) | −2 sao. Khách chọn "Làm lại đúng món" (tốn thêm giá vốn, sao tối đa 3) hoặc "Hoàn tiền món đó" |
| Ghi sai hoặc thiếu ghi chú | −1 sao mỗi lỗi, tối đa −2 |
| Ghi thiếu số lượng | −1 sao, phải làm bù miễn phí |
| Ghi thừa | Khách phát hiện lúc báo tổng: −8% kiên nhẫn, sửa phiếu |
| Báo tổng dư | −1,5 sao, phải báo lại |
| Báo tổng thiếu | 0 sao, quán mất phần chênh |
| Thối thiếu, bị phát hiện / không bị phát hiện | −1 sao và phải bù / review 2 sao hôm sau |
| Thối dư | 0 sao, mất tiền; 50% khách trả lại |
| Xác nhận QR khi tiền chưa về | Mất trọn hóa đơn, hiện Mẹo nghề |
| Chờ gọi món quá 60% / 85% P1 | −0,5 / −1 sao |
| Khách "Khó tính" gặp bất kỳ lỗi nào | −1 sao thêm |

**Phiếu chấm từng khách** trượt lên trong 2 giây và không chặn thao tác. Phiếu ghi Đạt/Sai cho Order, Báo tổng, Thối tiền, Bếp, Thời gian chờ; nhãn Nhanh/Ổn/Chậm; và nhãn nguồn lỗi **"Lỗi tại quầy"** hoặc **"Lỗi tại bếp"**.

---

## 4. Khâu bếp (kiểu Cooking Mama)

### 4.1 Cấu trúc dữ liệu một công thức (thuần dữ liệu, không viết code riêng cho từng món)

```js
banh_mi_op_la: {
  name: 'Bánh mì ốp la', chang: 1, doKho: 1, price: 20000, cost: 9000,
  source: 'default',               // default | shop | chain | event
  eventId: null, tools: [],
  ingredients: [
    {id:'banh_mi', role:'chinh'}, {id:'trung_ga', role:'chinh', qty:2},
    {id:'dua_leo', role:'phu'}, {id:'hanh_la', role:'phu'}, {id:'nuoc_tuong', role:'phu'},
    {id:'tuong_ot', role:'tuy_chon'}],
  decoys: ['trung_vit','hanh_tay','nuoc_mam'],
  notes: [
    {id:'khong_hanh', label:'Không hành', removes:['hanh_la']},
    {id:'long_dao', label:'Lòng đào', patch:{step:'chien', zone:[0.45,0.60]}},
    {id:'chin_ky', label:'Chín kỹ', patch:{step:'chien', zone:[0.70,0.85]}},
    {id:'cay', label:'Cay', patch:{step:'nem', targets:{tuong_ot:2}}},
    {id:'them_trung', label:'Thêm trứng', surcharge:5000, patch:{step:'dap', n:3}}],
  steps: [ {id, type, label, ing, params, par, w, critical, autoAt} ... ]
}
```
- `w` là trọng số: 1 cho bước phụ, 2 cho bước chính, 3 cho **bước linh hồn**.
- `critical` là cờ **chí mạng**.
- `autoAt` là cấp thạo món từ đó bước này có nút "Tự làm".
- Hình nguyên liệu có các trạng thái dùng chung cho mọi món: nguyên → đã rửa → đã thái → đã chín → trên đĩa. Trạng thái làm bằng lớp phủ CSS, không phải vẽ riêng từng hình.

### 4.2 Thư viện 12 cơ chế mini-game gốc

| Mã | Tên | Thao tác | Dùng cho | Luật chấm | Có ở |
|---|---|---|---|---|---|
| CHON | Chọn nguyên liệu | Chạm ô trên kệ 3×4 để bỏ vào rổ, chạm lại để lấy ra, bấm "Xong" | Mọi món | 100 − 15 × số lần chạm nhầm − 20 × số nguyên liệu phụ còn thiếu. Thiếu nguyên liệu chính thì bị chặn. Bẫy lọt vào món thì áp trần Q | **MVP** |
| CHA | Chà | Vuốt qua lại tới khi đủ quãng đường; một số bước cần đủ số lần đổi chiều | Rửa, gọt, bóc, lau lá, trộn, lắc | Điểm = tiến độ × 100; −15 nếu quá 2 × par | **MVP** |
| THAI | Thái theo vạch | Vuốt dọc cắt ngang từng vạch chấm | Thái lát, bổ đôi, cắt sợi | Mỗi nhát, tính theo độ lệch so với vạch gần nhất: ≤3% → 100, ≤7% → 80, ≤12% → 55, còn lại → 20. Nhát thừa −10. Nét hợp lệ phải dài ≥60% chiều cao nguyên liệu và nghiêng không quá 35° | **MVP** |
| CHAM | Chạm | 3 chế độ. `exact`: đúng n lần, có thể có vùng đích. `min`: đủ N lần trong T giây. `targets`: nhiều chai, mỗi chai đúng số nấc | Đập trứng, nêm, vắt, băm, hớt bọt | `exact`: chạm lệch số lần −30 mỗi lần; điểm theo khoảng cách tới tâm (≤8% → 100, ≤15% → 80, ≤25% → 55). `min`: r = số lần chạm / N; r từ 1,0 đến 1,2 → 100; từ 0,85 đến 1,35 → 80; từ 0,65 đến 1,6 → 55 | **MVP** |
| LUA | Canh độ chín | Thanh độ chín chạy từ 0 đến 1,2 trong `period` giây; bấm "Nhấc/Vớt" | Chiên, luộc, nướng, trụng | Đúng tâm vùng → 100; mép vùng → 80; lệch ≤0,08 → 55; sớm hơn nữa → 20; **vượt 1,0 là cháy → 0** | **MVP** (bản có lửa và lật: GĐ2) |
| ROT | Giữ để rót | Giữ tay, mực dâng nhanh dần; thả tay ở vạch; được nhấn lần 2 để bù (dâng chậm lại) | Rót trà, rưới sốt, chan nước dùng, nhúng bánh tráng | Lệch ≤4% dung tích → 100; ≤9% → 80; ≤15% → 55; **tràn >1,02 → 0**, mất 1 giây lau | **MVP** |
| LUC | Giữ lấy lực | Giữ tay, kim lực chạy 0 → 100 → 0 theo chu kỳ 1,2 giây; thả tay | Đập tỏi, đập gừng, ép khuôn | Vùng rộng 15 đơn vị; đúng tâm → 100 | GĐ2 |
| KHUAY | Vẽ vòng | Xoay đủ K vòng | Khuấy, vo viên, nhào | min(1, vòng / K) × độ tròn đều; quá nhanh −10 | GĐ2 |
| BAY_DIA | Kéo thả | Đặt thành phần vào bóng mờ theo đúng thứ tự | Xếp lớp, trình bày | Lệch tâm ≤8% → 100; sai thứ tự lớp −20 | GĐ2 |
| VUOT_CHUOI | Vuốt theo mũi tên | Vuốt 3–5 hướng liên tiếp | Cuốn, gấp lá, gói | Đúng hướng ±30° → 100; ±45° → 70 | GĐ2 |
| VE_DUONG | Vẽ theo đường | Vuốt theo nét chấm | Tỉa hoa, rưới sốt, buộc lạt | % phủ nét × (1 − độ lệch) | GĐ3 |
| LAC | Lắc chảo | Vuốt trái phải theo nhịp | Xào, lúc lắc, flambé (kết hợp LUC) | Dưới nhịp thì thanh khét tăng; quá nhanh thì văng ra | GĐ3 |

**Quy tắc chung cho mọi cơ chế**
- Mỗi bước dài 2–8 giây và **tự kết thúc ở 2,5 × par** để game không bao giờ kẹt.
- Thời gian đo bằng `performance.now()`, không đếm khung hình. Mini-game tạm dừng khi tab bị ẩn.
- Tọa độ chuẩn hóa về 0..1. Vùng chạm tối thiểu 44–48px và cách mép màn hình 16–20px.
- Trước mỗi bước hiện thẻ gợi ý 0,8 giây. Sau mỗi bước hiện nhãn kết quả, âm thanh và rung.
- Thẻ công thức (tên, nguyên liệu, ghi chú đỏ, bước hiện tại) luôn nằm ở góc màn hình bếp.

### 4.3 Luật nguyên liệu "đúng và đủ"

| Lỗi | Hậu quả |
|---|---|
| Thiếu nguyên liệu **chính** | Không vào bếp được. Game chỉ báo chung "Còn thiếu nguyên liệu chính" và phạt 1,5 giây. Ở chế độ Hỗ trợ, ô cần lấy nhấp nháy |
| Thiếu nguyên liệu **phụ** | Q −10 mỗi thứ. Bước sơ chế của nguyên liệu đó bị bỏ qua và tính 0 điểm. Review gọi đúng tên, ví dụ "Thiếu dưa leo rồi em ơi" |
| **Bẫy** lọt vào món (nước mắm thay nước tương, trứng vịt thay trứng gà) | Q bị giới hạn tối đa 60, tức tối đa hạng Được. Review chỉ đích danh |
| Thừa nguyên liệu không phải bẫy | Q −8; tiền nguyên liệu ghi vào mục Hao hụt |
| Làm trái ghi chú trên phiếu (có hành khi phiếu ghi Không hành) | Q tối đa 60, sao tối đa 2 |
| (GĐ2) Làm trái ghi chú dị ứng | Món bắt buộc Hỏng, 1 sao, hoàn tiền, sổ ghi "Sự cố nghiêm trọng" |
| (GĐ2) Sai thứ tự bắt buộc / dùng nhầm thớt / dùng nguyên liệu sắp hỏng | −15 Q / −15 điểm bước kèm Mẹo "nhiễm chéo" / −20 Q |

### 4.4 Chất lượng món, hạng món, làm lại
- **Q** (0–100) = Σ(w × điểm bước) / Σw, trừ phạt nguyên liệu, rồi áp các trần. Làm tròn tới số nguyên.
- **Hạng món và sao gốc**:
  - Tuyệt hảo (≥90) → 5 sao
  - Ngon (75–89) → 4 sao
  - Được (60–74) → 3 sao
  - Kém (40–59) → 2 sao
  - Hỏng (<40) → 1 sao
  - **Hoàn mỹ**: mọi bước Hoàn hảo, không lỗi nguyên liệu, không làm lại, không dùng "Tự làm". Được +1 danh tiếng và +5% tip.
- **Ví dụ bánh mì ốp la**: Chọn 100 (w1), Rửa 90 (w1), Thái dưa 80 (w1), Thái hành 100 (w1), Đập trứng 80 (w2), Chiên 100 (w3), Nướng 45 (w1), Nêm 100 (w1). Q = 975/11 ≈ 89, hạng **Ngon**. Nếu quên lấy hành lá: bước Chọn còn 80, bước thái hành 0, Q ≈ 78 − 10 = 68, hạng **Được**.
- **Bước chí mạng bị Hỏng** thì Q của món bị khóa ở mức Hỏng. Hộp thoại hỏi: "Trứng cháy rồi! Làm lại (tốn 2 trứng, khoảng 7 giây) / Bỏ món".
- **Làm lại bước**:
  - 1 lượt cho mỗi món. Dụng cụ phụ cho thêm 1 lượt từ GĐ2.
  - Tốn đúng thời lượng bước đó, cộng giá vốn khai báo trong `step.retryCost`.
  - Điểm mới thay điểm cũ nhưng **tối đa 85**.
  - Bước Chọn không làm lại được; muốn sửa thì phải bỏ món.
- **Bỏ món**: mất giá vốn đã trừ, phiếu quay lại dây, kiên nhẫn của khách vẫn chạy.
- **Món Hỏng hoặc sai món khi giao**: mở màn **Xử lý phàn nàn**.
  - (1) Chọn câu xin lỗi: có 3 câu, trong đó 1 câu đổ lỗi cho khách là sai. Chọn đúng thì +1 sao, nhưng vẫn không vượt trần.
  - (2) Chọn cách giải quyết: "Làm lại" (sao tối đa 3) hoặc "Hoàn tiền món đó".
- **Tip** chỉ có khi khách chấm 5 sao: 10% hóa đơn, làm tròn lên 1.000đ.
  - +5% nếu có món Hoàn mỹ, hoặc ra món khi mới dùng dưới 50% ngân sách chờ.
  - Khách Khó tính ×2.
  - Chuỗi **"Quầy chuẩn"**: 5 khách liên tiếp không có lỗi quầy thì tip ×1,5, kéo dài tới lỗi quầy kế tiếp.
- **Danh tiếng mỗi khách**: 5 sao +3, 4 sao +2, 3 sao +1, 2 sao trở xuống 0.
- **Sao trung bình** tính trên 30 đánh giá gần nhất; khi chưa đủ 5 đánh giá thì phần thiếu tính là 4 sao. Hệ số lượng khách: từ 4,5 sao ×1,15; 4,0–4,49 ×1,0; 3,5–3,99 ×0,85; dưới 3,5 ×0,7. Màn tổng kết giải thích "Vì sao hôm nay vắng khách?".

### 4.5 Thạo món (5 cấp, không bao giờ tụt)
Thạo món tính theo số lần món đó đạt hạng **Ngon trở lên**:

| Cấp | Mốc | Quyền lợi |
|---|---|---|
| 1 Tập làm | Vừa có công thức | Làm đủ mọi bước; có tay chỉ ở lần nấu đầu |
| 2 Quen tay | 5 lần | Vùng Hoàn hảo của món +5%; thẻ gợi ý thu gọn. Từ Chặng 3: giá +3% và dạy được cho nhân viên |
| 3 Thạo | 15 lần | Vùng Hoàn hảo +10%. Bước phụ (w1) có nút "Tự làm" cho 80 điểm, nhưng món không thể Hoàn mỹ. +1 danh tiếng cho mỗi món Tuyệt hảo. Từ Chặng 3: giá +6%. (GĐ2) mở nấu mẻ 2 phần |
| 4 Tinh thông (GĐ2) | 35 lần, trong đó 10 lần Tuyệt hảo | Sơ chế sẵn theo mẻ lớn, mẻ 3 phần, mở 1 biến tấu món; giá +9% |
| 5 Bậc thầy (GĐ2) | 70 lần, trong đó 25 lần Tuyệt hảo | Bước chính cũng "Tự làm" được (85 điểm); chỉ bước linh hồn bắt buộc tự tay. Nhãn "Món tủ". Giá +12%. Là điều kiện chuẩn hóa công thức cho chi nhánh |

Ở Chặng 1–2, giá luôn tròn 5.000đ nên thạo món thưởng bằng tay nghề và danh tiếng. Thưởng bằng giá chỉ bắt đầu từ Chặng 3.

### 4.6 Dụng cụ bếp (mỗi hiệu ứng phải vẽ ra trên màn hình)

| Dụng cụ | Giá | Chặng | Hiệu ứng |
|---|---|---|---|
| Dao thép tốt | 150.000đ | 1 (**MVP**) | Vùng Hoàn hảo của THAI +20%, vạch chấm vẽ to hơn |
| Chảo chống dính | 200.000đ | 1 (**MVP**) | Vùng chín của LUA +15%, vùng xanh rộng ra; qua vùng thì cháy chậm hơn 20% |
| Ly đong có vạch | 120.000đ | 2 | Vùng rót +3% dung tích, hiện số ml |
| Bếp 2 họng | 400.000đ | 2 | Một bước LUA tự chạy nền trong lúc làm bước khác |
| Tủ mát | 1,2tr | 3 | Mở sơ chế đầu ca, giữ nguyên liệu thêm 1 ngày |
| Máy xay | 800.000đ | 3 | Bước băm "Tự làm" được 80 điểm |
| Dao Nhật | 900.000đ | 3 | Vùng thái +40%, hiện trước vạch kế tiếp |
| Nồi hầm lớn | 1tr | 3 | Nước dùng 20 phần mỗi mẻ (bắt buộc cho Phở) |
| Chảo gang dày, bếp khè | 1,2tr / 8tr | 5 | Mở Bò lúc lắc, flambé |
| Bộ nhíp và cọ trình bày | 15tr | 6 | Bước trình bày có lưới căn chỉnh |

Giá dụng cụ tăng theo đường cong ở mục 9.4. Có **unit test kiểm tra tham số trong dữ liệu khớp với hình vẽ**, để tránh lặp lại lỗi "nâng cấp không có tác dụng".

### 4.7 Độ khó và chế độ Hỗ trợ
- **Hệ số vùng mục tiêu theo chặng**: Xe đẩy ×1,2 → Quán cóc ×1,1 → Tiệm nhỏ ×1,0 → Quán gia đình ×0,95 → Nhà hàng ×0,9 → Sang trọng ×0,8.
- Trong mỗi chặng, vùng hẹp dần 2% mỗi ngày game, sàn là 75% của hệ số chặng. Dụng cụ và thạo món nới lại vùng.
- **Hỗ trợ** có 4 công tắc riêng, **không giảm phần thưởng chính**:
  - *Tính tiền*: hiện tổng và tiền thối.
  - *Thao tác*: vùng mục tiêu +25%, thời lượng ×1,5, ô nguyên liệu cần lấy nhấp nháy.
  - *Giữ bóng thoại và icon*.
  - *Thong thả*: khách không mất kiên nhẫn, không có tip tốc độ, không tính kỷ lục.
- Mọi tín hiệu âm thanh luôn đi kèm tín hiệu hình. Vùng Hoàn hảo có cả vạch lẫn biểu tượng, không chỉ phân biệt bằng màu.

### 4.8 Phản hồi "sướng tay"
- Âm thanh tổng hợp bằng WebAudio: dao "tách", dầu "xèo", nước, chuông Hoàn hảo, chuông ra món, tiếng xu.
- Rung 15 ms khi thái đúng, 80 ms khi Hỏng (tắt được).
- Nguyên liệu đổi trạng thái ngay, có hơi nước bốc lên.
- Màn công bố món dài 1,2 giây: món phóng to, hiện hạng và Q%, **Dì Sáu** hiện với 4 biểu cảm (tự hào, vui, lo, tiếc) và góp ý đúng bước sai.
- Tôn trọng `prefers-reduced-motion`.
- Nếu có hiệu ứng đứt tay (GĐ2) thì chỉ hiện băng cá nhân hài hước, không có máu.

### 4.9 Sáu công thức mẫu

**(1) Bánh mì ốp la** — Chặng 1, có sẵn.
- Giá 20.000đ, vốn 9.000đ.
- Nguyên liệu chính: bánh mì, trứng gà ×2. Phụ: dưa leo, hành lá, nước tương. Tùy chọn: tương ớt.
- Bẫy: trứng vịt, hành tây, nước mắm.

| # | Cơ chế | Bước | Tham số | par | w |
|---|---|---|---|---|---|
| 1 | CHON | Chọn nguyên liệu | kệ 9 ô (6 đúng, 3 bẫy) | 6 giây | 1 |
| 2 | CHA | Rửa dưa leo | quãng vuốt 6 | 3 giây | 1 |
| 3 | THAI | Thái dưa leo | 3 vạch | 4 giây | 1 |
| 4 | THAI | Thái hành lá (bỏ nếu phiếu ghi "Không hành") | 4 vạch | 3 giây | 1 |
| 5 | CHAM `exact` | Đập trứng vào giữa chảo | n=2 (3 nếu "Thêm trứng"), có vùng đích | 2 giây | 2 |
| 6 | LUA | Chiên trứng (**chí mạng**, linh hồn) | period 5 giây; vùng mặc định [0,55; 0,72]; lòng đào [0,45; 0,60]; chín kỹ [0,70; 0,85]; `retryCost` 5.000đ | 5 giây | 3 |
| 7 | LUA | Nướng lại bánh | period 3 giây, vùng [0,50; 0,78] | 3 giây | 1 |
| 8 | CHAM `targets` | Nêm | nước tương 1; tương ớt 0/1/2 theo ghi chú | 2 giây | 1 |

Tổng par khoảng 28 giây. Bước kẹp nhân chạy hoạt hình tự động.

**(2) Trà tắc** — Chặng 1, có sẵn.
- Giá 10.000đ, vốn 3.000đ.
- Nguyên liệu chính: trà, tắc ×3, đường, đá, ly.
- Bẫy: chanh, muối, sữa đặc.
- Ghi chú hợp lệ: ít đường, nhiều đường, ít đá, không đá.
- Các bước:
  1. CHON, 5 giây.
  2. THAI bổ đôi tắc, 3 vạch, 3 giây.
  3. CHAM `min` vắt tắc, N=6 trong 3 giây.
  4. ROT rót trà, vạch [0,70; 0,82], 3 giây, w2.
  5. CHAM `exact` nêm đường: ít 1, thường 2, nhiều 3. w3, bước linh hồn.
  6. CHAM `exact` thêm đá: ít 1, thường 2. Ghi chú "không đá" bỏ bước này.
  7. CHA lắc đều, quãng vuốt 5, 2 giây.
- Tổng par khoảng 18 giây.

**(3) Bánh tráng trộn** — Chặng 1, Shop 250.000đ. Đây là món thử luật "đúng và đủ".
- Giá 20.000đ, vốn 8.000đ.
- Nguyên liệu chính: bánh tráng, xoài xanh, trứng cút ×3, khô bò. Phụ: rau răm, hành phi, đậu phộng, sa tế, tắc.
- Bẫy: húng quế (giống rau răm), bánh tráng nướng mè, trứng gà.
- Ghi chú hợp lệ: không cay, cay nhiều, không rau răm, thêm trứng cút (+5.000đ).
- Các bước:
  1. CHON, kệ 12 ô, 8 giây.
  2. THAI cắt bánh tráng thành sợi, 5 vạch.
  3. CHA gọt vỏ xoài, quãng vuốt 8.
  4. THAI xoài thành sợi, 5 vạch.
  5. CHA bóc trứng cút, quãng vuốt 4.
  6. CHAM `targets`: sa tế 0/2/4 nấc theo ghi chú và vắt tắc 2. w2.
  7. ROT rưới dầu hành.
  8. CHA trộn đều, quãng vuốt 10 và ít nhất 6 lần đổi chiều. w3, bước linh hồn.
- Tổng par khoảng 32 giây.

**(4) Gỏi cuốn tôm thịt** — Chặng 2, Kệ Chính 550.000đ, GĐ2.
- Giá 30.000đ, vốn 12.000đ.
- Các bước:
  1. CHON (bẫy: bánh tráng nướng mè, rau răm, tương ớt).
  2. CHA rửa rau.
  3. LUA luộc tôm và thịt (chí mạng; quá chín thì tôm teo).
  4. THAI thịt 6 lát.
  5. THAI chẻ đôi tôm.
  6. ROT nhúng bánh tráng: giữ rồi thả tay ở vạch độ mềm; nhúng lâu thì bánh rách.
  7. BAY_DIA xếp lớp theo thứ tự xà lách → bún → thịt → tôm (mặt đỏ úp xuống) → hẹ. w2.
  8. VUOT_CHUOI cuốn: gập đáy, gập hai bên, cuộn 2 lần. w3.
  9. KHUAY pha tương đen, rắc đậu phộng.
- Tổng par khoảng 42 giây.

**(5) Phở bò tái** — Chặng 3, Kệ Chính 1,35tr, cần Nồi hầm lớn, GĐ2.
- Giá 65.000đ, vốn 26.000đ.
- **Nồi nước dùng nấu một lần ở pha sơ chế đầu ca**, đủ 20 phần. Điểm của nồi áp cho mọi bát trong ngày. Các bước nấu nồi: LUA nướng gừng và hành → LUC đập gừng → CHON gói gia vị (bẫy: tiêu sọ, lá nguyệt quế) → CHAM `min` hớt bọt → CHAM `targets` nêm muối, đường phèn, nước mắm.
- Mỗi bát:
  1. CHON.
  2. THAI bò mỏng 6 lát, vùng Hoàn hảo hẹp ±2%, w3.
  3. THAI hành tây.
  4. LUA trụng bánh phở.
  5. BAY_DIA xếp bò.
  6. ROT chan nước dùng sôi tới vạch, w3.
  7. BAY_DIA rắc hành, ngò.
- Ghi chú hợp lệ: tái, chín, nạm, không hành, ít bánh.
- Tổng par khoảng 32 giây.

**(6) Bò lúc lắc** — Chặng 5, Kệ Chính 8tr, cần Chảo gang dày, GĐ3.
- Giá 195.000đ, vốn 62.000đ.
- Các bước:
  1. CHON (bẫy: bò xay, hành tím, xì dầu đậm).
  2. THAI bò hạt lựu: 4 nhát dọc, 4 nhát ngang.
  3. ROT ướp, rồi KHUAY trộn.
  4. THAI ớt chuông và hành tây.
  5. CHAM `min` băm tỏi.
  6. LUA làm nóng chảo tới khói nhẹ.
  7. LAC lắc chảo, w3.
  8. LUC + LAC flambé vang (kèm Mẹo an toàn lửa).
  9. VE_DUONG tỉa hoa cà chua.
  10. BAY_DIA bày lên xà lách xoong, w3.
- Phụ bếp làm thay bước 4, 5, 9.
- Tổng par khoảng 55 giây.

---

## 5. Shop công thức và món giới hạn theo sự kiện

### 5.1 Bốn nguồn công thức
1. **Có sẵn**: 2 món ở đầu mỗi chặng, hoặc được tặng khi lên chặng.
2. **Shop "Chợ Công Thức"**:
   - **Kệ Chính** (MVP): cố định theo chặng, trả bằng Tiền. Món của chặng cao hơn hiện bóng mờ kèm dòng "Cần Quán cóc vỉa hè".
   - **Kệ Đặc biệt** (GĐ2): 1–2 món, đổi mỗi 7 ngày thật, giá 150–500 MV hoặc 3 lần giá Tiền. Không món nào *chỉ* mua được bằng MV. Món đã lỡ chắc chắn quay lại trong vòng 4 tuần.
   - **Kệ Đặc sản vùng miền** (GĐ2): 3 ô, đổi mỗi 3 ngày game, luôn có 1 món giảm 20%.
   - **Tủ Kỷ Niệm** (GĐ3): bán lại món sự kiện đã qua, sau 90 ngày, giá 600 MV hoặc 30 Mảnh công thức.
3. **Bí truyền qua chuỗi nhiệm vụ**: "Sổ tay thất lạc của Dì Sáu" có 12 trang (4 trang từ cốt truyện, 4 từ sự kiện, 4 từ thành tựu nghề). Đủ 12 trang mở món bí truyền "Hủ tiếu gõ của Dì Sáu", lãi hơn món cùng chặng khoảng 15%.
4. **Sự kiện có thời hạn**: đổi bằng Tem Lễ Hội.

### 5.2 Thẻ xem trước và nấu thử
- **Thẻ xem trước** ghi: số bước, cơ chế mới (nếu có), độ khó 1–5 (biểu tượng dao), giá vốn, giá bán, lãi mỗi phần, **số ca hoàn vốn ước tính**, dụng cụ bắt buộc.
- **Nấu thử miễn phí 1 lần** trước khi mua: không đếm giờ, có tay chỉ, không tốn tiền. Lần nấu này không tính vào thạo món.
- Mua xong thì món vào thực đơn ngay. Món mới được khách gọi nhiều gấp đôi trong 2 ca đầu. Không hoàn tiền.
- **Giới hạn ô thực đơn** (GĐ2): Chặng 1–2 có 6 ô, sau đó 8, 10, 12. Thực đơn gọn thì bếp nhanh hơn.
- **Quy tắc món ngang giá trị**: lãi trên mỗi giây nấu của món MV hoặc món sự kiện không vượt món Tiền tốt nhất cùng chặng quá 10%. Món đặc biệt hấp dẫn nhờ danh tiếng ×1,5, hình trình bày đẹp và khách riêng.

### 5.3 Món sự kiện có thời hạn (GĐ2)
**Khuôn mẫu sự kiện** (toàn bộ khai báo bằng dữ liệu):
- Thời lượng: sự kiện lớn 10–14 ngày thật, sự kiện nhỏ 5–7 ngày. Có thẻ báo "Sắp diễn ra" trước 3 ngày.
- Mỗi sự kiện có **Tem riêng**, tên đổi theo mùa (Phấn Trắng, Chuông Bạc, Bao Lì Xì, Lồng Đèn).
- **Nguồn Tem**:
  - Mỗi món đạt Ngon trở lên trong khung sự kiện được +1 Tem; món lễ +2 Tem thêm. Trần 30 Tem/ngày.
  - 3 nhiệm vụ sự kiện mỗi ngày, mỗi nhiệm vụ 10 Tem.
  - Điểm danh sự kiện 7 ô, mỗi ô 15 Tem.
  - Chuỗi sự kiện 5–7 bước, tổng 150 Tem.
  - Hai ngày cuối nhân đôi Tem.
- **Phần thưởng**:
  - Món chính **miễn phí qua chuỗi sự kiện**, chỉ cần chơi 3 ngày bất kỳ trong mùa.
  - Món thứ hai: 400 Tem.
  - Món đặc biệt: 700 Tem.
  - Trang trí: 150–250 Tem.
  - 50 Tem đổi 10 MV, tối đa 5 lần.
- **Cân bằng**:
  - Người chơi nhẹ (1 ca/ngày, chơi 8 trên 14 ngày) được khoảng 495 Tem, lấy được món chính và món thứ hai.
  - Người chơi tích cực (3–4 ca/ngày, chơi đủ 14 ngày) được khoảng 1.100–1.200 Tem, lấy được hết.
- **Sau sự kiện**:
  - Công thức **giữ vĩnh viễn**, có nhãn "Tết 2027".
  - Món bán được quanh năm, nhưng chỉ trong mùa mới có giá ×1,3 và cho Tem.
  - Nguyên liệu đặc biệt chỉ bán trong mùa ±7 ngày.
  - Tem dư có 3 ngày ân hạn, sau đó tự đổi 100 Tem = 1 TNC Tiền.
  - Năm sau món quay lại (phục khắc) với giá giảm 30% Tem. Ai đã có món thì nhận biến thể mới hoặc nguyên liệu.
- **Chống FOMO**: không gacha, không hộp ngẫu nhiên cho công thức, không bán Tem bằng tiền thật, lỡ ngày không mất gì.
- **Món sự kiện tự co giãn theo chặng**. Ví dụ Tết: ở xe đẩy là "Bánh tét chiên", ở nhà hàng là "Set mâm cỗ Tết".

**Lịch năm đầu.** Ngày âm lịch lấy từ **bảng tra sẵn cho 2026–2030** trong `src/data/events.js` và phải kiểm chéo với lịch vạn niên.

| Thời gian | Sự kiện | Món giới hạn | Quy mô |
|---|---|---|---|
| 12–21/11/2026 | Tri ân 20/11 | **Chè bưởi**: CHA gọt vỏ, THAI cùi hạt lựu, CHA bóp muối rửa đắng, CHAM áo bột năng, LUA luộc, ROT nước cốt dừa. Giá 15.000đ, vốn 5.000đ | Nhỏ, sự kiện đầu tiên để tập dượt |
| 18–27/12/2026 | Giáng sinh | Bánh mì bơ tỏi | Vừa |
| Khoảng 30/01 – 12/02/2027 (23 tháng Chạp đến mùng 7; **mùng 1 Tết Đinh Mùi là 06/02/2027**) | Tết | **Bánh chưng** (8 bước: CHON lá dong, nếp, đậu xanh, ba chỉ, lạt, với bẫy lá chuối, gạo tẻ, đậu đen → CHA lau lá → KHUAY vo nếp → ROT ướp thịt → BAY_DIA xếp khuôn lá → gạo → đậu → thịt → đậu → gạo → VUOT_CHUOI gấp 4 phía → VE_DUONG buộc lạt → LUA luộc có châm nước sôi, chí mạng); Thịt kho hột vịt; Dưa hành | Lớn đầu tiên. Nội dung phải chốt trước giữa tháng 01/2027 |
| 8/3, Giỗ Tổ, Đoan Ngọ, Vu Lan | Sự kiện nhỏ | Bánh giầy, cơm rượu nếp, tuần món chay | Nhỏ |
| Khoảng 03–17/09/2027 (**Rằm tháng 8 là 15/09/2027**) | Trung thu | Bánh nướng (ép khuôn bằng LUC, vùng lực 60–75), bánh dẻo, trà sen | Lớn thứ hai |

---

## 6. Hành trình 7 chặng

| Chặng | Bối cảnh | Điều kiện lên chặng này (phải đủ tất cả; đầu tư trả một lần) | Mở khóa chính: món / khách / cơ chế | Khách mỗi ca · TNC | Thời lượng mục tiêu (người chơi trung bình, 3–4 ca/ngày thật) |
|---|---|---|---|---|---|
| **1 Xe đẩy đầu hẻm** | Xe đẩy cũ thuê lại của Dì Sáu, dù che, ghế nhựa | Bắt đầu với vốn 200.000đ | Bánh mì ốp la, Trà tắc, Bánh tráng trộn (Shop). Khách: học sinh, công nhân/shipper, cô chú lớn tuổi, văn phòng, khó tính. Quầy 5 nhịp tự nhẩm, tiền mặt + QR tĩnh, 6 thao tác bếp, dây 3 phiếu | 4–8 · khoảng 80k | Ca 1–15 · ngày thật 1–4 |
| **2 Quán cóc vỉa hè** | 2 bàn con, 4 ghế nhựa, đèn dây | 150 danh tiếng; sao trung bình ≥3,8; 3 công thức; 2 món thạo cấp 2; chuỗi "Ngày đầu ra phố"; 500.000đ | Ăn tại chỗ, dọn bàn, đóng gói mang về. 6 khách quen có tên, kèm Sổ khách quen ("như mọi khi nha"). Bếp 2 họng. Cơ chế BAY_DIA, VUOT_CHUOI, KHUAY, LUC. Kho theo lô có hạn dùng, đi chợ mặc cả. Món: Gỏi cuốn, Bún thịt nướng, Cơm tấm, Chè ba màu | 8–10 · khoảng 160k | Ca 16–45 · ngày thật 4–12 |
| **3 Tiệm nhỏ mặt tiền** | Mặt bằng thuê đầu tiên | 500 danh tiếng; ≥4,0 sao; 6 công thức; 3 món cấp 3; chuỗi "Tìm mặt bằng" (chọn gần trường học / văn phòng / chợ); 2tr | 2 ca/ngày. **Máy POS**, in bếp, gọi số. Khuyến mãi, QR động, thẻ, tờ 1k/2k. Chốt ca đếm két. Thu ngân NPC và kèm cặp, phụ bếp. Sơ chế đầu ca, nấu mẻ. Đơn app giao hàng (phí 20%) và đóng gói. VSATTP "soi bếp 20 giây". Đối thủ Lâm. Món: Phở bò tái, Hủ tiếu, Cà phê muối | 10–12 · khoảng 300k | Ca 46–100 · ngày thật 12–25 |
| **4 Quán ăn gia đình** | 8 bàn đánh số, gạch bông | 1.500 danh tiếng; ≥4,2 sao; 10 công thức; 1 món cấp 4; thu ngân NPC bậc 2; chuỗi "Có tên có tuổi" (tên, logo, hộ kinh doanh mô phỏng); 6tr | Khách nhóm 2–6 người, món chia cả bàn, ra món đồng bộ. Đặt bàn qua điện thoại. Ghi chú dị ứng. Thẻ thành viên. Trang trí 10 ô. Món: Cá kho tộ, Canh chua, Lẩu Thái | 12 lượt bàn · khoảng 600k | Ngày thật 25–40 |
| **5 Nhà hàng** | Bếp mở chia trạm | 3.500 danh tiếng; ≥4,4 sao; 14 công thức; 2 món cấp 4; chuỗi "Đạt chuẩn VSATTP"; 20tr | **Trả sau** (chuỗi huấn luyện "Phục vụ bàn" 3 bước). Máy order cầm tay, KDS. Tạm tính; tách, gộp, chuyển bàn; VAT mô phỏng; hóa đơn công ty. Set menu 3 món, kiểm món ở Pass, bếp phó, đơn tiệc 20–50 suất. Thẩm định viên ẩn danh. Món: Bò lúc lắc, Gà nướng muối ớt | 12 bàn · khoảng 1,4tr | Ngày thật 40–60 |
| **6 Nhà hàng sang trọng** | Gỗ tối màu, gốm men lam | 7.500 danh tiếng; ≥4,6 sao; 18 công thức (ít nhất 2 món bí truyền hoặc sự kiện); 1 món cấp 5; 3 lần thẩm định đạt "Xuất sắc"; 70tr | Thực đơn 5–7 món. Trình bày nhiều lớp (VE_DUONG, nhíp). LAC và flambé. Nêm theo hồ sơ khẩu vị. Phí phục vụ 5%. Đặt bàn có cọc. **Đũa Vàng** 1–3 chiếc. Chế độ Bếp trưởng duyệt đĩa | 8–10 · khoảng 3,5tr | Ngày thật 60–85 |
| **7 Chuỗi và nhượng quyền** | Bản đồ chi nhánh | 12.000 danh tiếng; ít nhất 1 Đũa Vàng; 2 món cấp 5; chi nhánh đầu tiên từ 5tr (xe đẩy) tới 400tr (nhà hàng) | Chi nhánh tự chạy theo mô hình đã đi qua. Chuẩn hóa công thức (SOP) từ món cấp 5. Quản lý chi nhánh. "Ghé thăm" chi nhánh để xử lý sự cố bằng một ca chơi thật. Thu nhập khi vắng mặt tối đa 12 giờ. Sau đó mở **Tái khởi nghiệp vùng miền** | — | Từ ngày thật 85 |

**Nguyên tắc tiến trình**
1. Mỗi chặng thêm một cách chơi mới, không chỉ tăng con số.
2. Càng lên cao, khách ít hơn nhưng món tinh và đắt hơn. Giữ khoảng 150–250 lần chạm mỗi ca.
3. Tự động hóa chỉ lấy đi phần lặp. Luật **"Ra tay"**: nhân viên và máy móc có trần 88 điểm; món Tuyệt hảo và món tủ chỉ đến từ tay chủ quán.
4. Không game over, không xóa save, không tụt chặng.
5. **Nhịp răng cưa**: độ khó tăng dần trong chặng, vừa lên chặng thì dịu lại, kèm 3 ngày "Tuần khai trương" (khách ×1,3, khách dễ tính hơn).
6. Thẻ **"Giấc mơ tiếp theo"** luôn hiện các thanh tiến độ và gợi ý cụ thể, ví dụ "Nấu thêm 3 lần Ngon món Trà tắc".
7. **Bản đồ chặng** hiện đủ 7 ô. Ô chưa mở hiện bóng mờ kèm một câu gợi mở.

---

## 7. Năm hệ thống người dùng yêu cầu

### 7.1 Nhiệm vụ hằng ngày "Việc hôm nay"
- Reset lúc 04:00 giờ Việt Nam. Mỗi ngày bốc **3 nhiệm vụ**: 1 Quầy, 1 Bếp, 1 Chất lượng/Kinh doanh. Việc bốc dùng seed `hash(saveSeed + dayKey)` nên tải lại trang không đổi được nhiệm vụ.
- Chỉ bốc nhiệm vụ đã đủ điều kiện (chưa có QR thì không giao "nhận QR"). Không lặp nhiệm vụ của hôm qua. Chỉ tiêu co giãn theo số khách dự kiến để xong trong khoảng 2 ca.
- **Bể nhiệm vụ MVP (12)**:
  - Quầy: Thối đúng 5 lần liên tiếp; Đọc lại đơn 3 lần; Báo tổng đúng cho 5 khách; Xác nhận đúng 2 thanh toán QR (từ ngày 4).
  - Bếp: 5 lần Hoàn hảo ở bước thái; 3 món không thiếu và không sai nguyên liệu; 3 lần Hoàn hảo ở bước chiên hoặc nướng; Nấu 2 phần món vừa mua.
  - Chất lượng/Kinh doanh: 3 món Tuyệt hảo; Phục vụ 8 khách; Không để khách nào bỏ về trong 1 ca (từ ngày 4); Doanh thu 150.000đ trong ngày.
- **Thưởng**:
  - Mỗi nhiệm vụ: 0,2 TNC (Chặng 1 là 16.000đ) và +5 danh tiếng.
  - Đủ 3 nhiệm vụ thì mở **Hòm ngày**: 10 MV và 0,2 TNC.
- Tiến độ tự đếm qua bus sự kiện, có toast ngay trong ca (ví dụ "Việc hôm nay: 4/5 lần thối đúng"). Người chơi bấm "Nhận" để lấy thưởng. Nhiệm vụ đã xong mà chưa nhận trước giờ reset thì tự vào Hộp thư, giữ 7 ngày.
- **Đổi nhiệm vụ**: 1 lần miễn phí mỗi ngày, từ lần thứ hai tốn 5 MV.
- Không bao giờ có nhiệm vụ "tiêu X tiền".

### 7.2 Điểm danh nhận quà hằng ngày
- Popup hiện ở lần mở game đầu tiên của mỗi ngày thật, nhận bằng 1 chạm, không cần mở ca.
- **7 ô tích lũy**: lỡ ngày không bị reset, lần sau nhận tiếp ô kế tiếp.
- **Vòng đầu "Tuần Khai Trương"** (chỉ 1 lần):
  - Ô1: 100.000đ + 10 MV
  - Ô2: Phiếu Chợ Sớm (giá vốn −20% trong 1 ca)
  - Ô3: 15 MV
  - Ô4: 150.000đ
  - Ô5: Dao thép tốt (nếu đã có thì nhận 150.000đ)
  - Ô6: 20 MV
  - Ô7: Rương Khai Trương (40 MV, 100.000đ, danh hiệu "Chủ xe mới toanh")
- **Vòng thường**: Ô1 0,3 TNC · Ô2 Phiếu Chợ Sớm · Ô3 10 MV · Ô4 0,4 TNC · Ô5 Phiếu Tip ×1,5 cho 1 ca · Ô6 15 MV · Ô7 Rương tuần (30 MV + 0,5 TNC). Mỗi vòng tổng khoảng 1,2 TNC và 55 MV.
- **GĐ2**:
  - Lịch tháng 28 ô chạy song song, mốc 7/14/21/28 có quà lớn, ô 28 là trang trí độc quyền.
  - Bù điểm danh tối đa 3 ô mỗi tháng, bằng 1 Vé Bù, 15 MV, hoặc một "Ca bù" miễn phí (phục vụ 10 khách).
- Khi đồng hồ máy bị lùi thì quà theo ngày bị khóa (xem mục 11.5).

### 7.3 Sự kiện ngẫu nhiên
Có ba lớp. Chúng có trần thiệt hại, có bảo hiểm tần suất và không bao giờ phạt ngẫu nhiên.

**(a) Sự kiện ngày (báo trước ở màn tổng kết hôm trước).** Từ ngày 3, mỗi ngày có 30% xảy ra.

| Sự kiện | Tác động | Có ở |
|---|---|---|
| Trời mưa | Khách ×0,8, kiên nhẫn ×1,2. Có lựa chọn "Căng bạt" 20.000đ để khách còn ×0,95 | MVP |
| Nắng nóng | Trà tắc được gọi ×2; thêm ghi chú "nhiều đá" | MVP |
| Ngày lãnh lương | Tip ×1,5 | MVP |
| Chợ phiên | Khách ×1,3 | MVP |
| Chợ giảm giá / khan hàng / trận bóng đội tuyển / rằm và mùng 1 (30% khách ăn chay) / khách đoàn du lịch / KOL ẩm thực | Theo từng sự kiện | GĐ2 |

Kỳ vọng chung hơi dương (khoảng +1,5% thu nhập).

**(b) Tình huống trong ca.** Từ ngày 3, mỗi ca có 35% ra tối đa 1 tình huống. Tình huống chỉ bật khi đang ở tab Quầy, giữa hai khách, **không chen vào mini-game nấu**. Kiên nhẫn tạm dừng khi hộp thoại mở. Mỗi lựa chọn ghi rõ cái giá và luôn có 1 lựa chọn an toàn. Thiệt hại tối đa là 10% doanh thu ca hoặc 0,5 TNC. Nếu 3 ca liền không có tình huống thì ca kế chắc chắn có. Không lặp lại 5 tình huống gần nhất.

MVP có 3 tình huống:
1. **Khách mở hàng bằng tờ 500k**: thối hết tiền lẻ / mời chuyển QR / tặng ly trà tắc "mở hàng" (−3.000đ vốn, ngày mai +1 khách).
2. **Khách quen xin ghi nợ 20.000đ**: cho nợ (70% trả trong 3 ca, +2 danh tiếng) / từ chối khéo / tặng luôn (+5 danh tiếng).
3. **Khách đổi ý sau khi đã thanh toán** (phiếu chưa nấu): đổi món, thu hoặc hoàn phần chênh (đúng quy trình, hiện Mẹo nghề) / từ chối lịch sự (50% khách −1 sao).

GĐ2 thêm: cúp điện (bán ngoại tuyến, ghi order giấy), hết gas, chảo dầu bốc lửa (chọn "dội nước" là sai và được giải thích), hàng rau hỏng, đoàn kiểm tra vệ sinh, khách quên ví, tiệc trong hẻm đặt cọc.

**(c) Đơn bất chợt ngoài ca (GĐ2).** Từ ngày thật thứ 3, mỗi ngày có 30% ra một đơn ở màn Chuẩn bị, ví dụ "Văn phòng đặt 6 phần". Hạn tới 04:00 hôm sau. Trả 1,5 lần giá và 10 MV. Bỏ qua thì chỉ mất cơ hội.

Trong Cài đặt có mức **Nhiều / Vừa / Ít** thay cho nút tắt hẳn. Mức "Ít" là 15%/ca và chỉ gồm tình huống tích cực.

### 7.4 Chuỗi nhiệm vụ
- **Chuỗi chính "Hành trình khởi nghiệp"**: mỗi chặng có một chuỗi 5–7 bước, cũng là cổng lên chặng. Luôn có đúng 1 bước đang làm, ghim ở màn Chuẩn bị, có gợi ý "làm ở đâu". Không hạn giờ, không thể thất bại.
  - **C1 "Ngày đầu ra phố"** (Dì Sáu, MVP):
    1. Phục vụ khách đầu tiên.
    2. Thối đúng 3 lần.
    3. Đọc lại đơn cho 3 khách.
    4. Đạt 5 lần Hoàn hảo ở bước bếp.
    5. Mua công thức đầu tiên.
    6. Nấu 3 món Tuyệt hảo.
    7. Đạt 150 danh tiếng và sao trung bình ≥3,8.
    - Mỗi bước thưởng 0,3 TNC và 10 MV, kèm 1 thẻ Mẹo nghề liên quan.
    - Hoàn thành chuỗi: danh hiệu "Chủ xe đầu hẻm", 50 MV, **Trang 1 Sổ tay của Dì Sáu**, và mở thẻ "Quán cóc vỉa hè – sắp khai trương".
  - **"Làm quen QR"** (Anh Khoa, MVP, từ ngày 4): nhận đúng 3 QR → phát hiện 1 ảnh chuyển khoản giả (kịch bản chắc chắn xảy ra trong chuỗi) → mua Loa báo tiền. Thưởng 20 MV và Mẹo nghề.
  - Các chặng sau: "Dựng quán cóc", "Tìm mặt bằng" và "Làm quen máy POS" (bấm đúng 5 order, áp đúng 3 combo, chốt ca lệch 0đ), "Có tên có tuổi", "Đạt chuẩn VSATTP" và "Phục vụ bàn", "Đón thẩm định viên", "Mở chi nhánh đầu tiên".
- **Chuỗi phụ** (GĐ2, tối đa 2 chuỗi cùng lúc):
  - "Sổ tay thất lạc của Dì Sáu" (12 trang).
  - "Cô Út sạp rau" (mở mặc cả, giá rau −5%).
  - "Anh shipper Tài" (mở đơn giao hàng).
  - "Phúc – cậu phụ bếp vụng về" (truyền nghề: làm mẫu 3 món Tuyệt hảo để Phúc làm thay 1 bước).
  - "Lâm Tốc Độ" (đối thủ, 3 hồi: phá giá → thi ẩm thực phố → bị kiểm tra; người chơi chọn giúp đỡ hoặc thâu tóm).
  - Chuyện riêng của khách quen khi thiện cảm đạt 60.
- **Luật đếm**: bước dạng "làm N lần" chỉ đếm từ lúc bước hiện ra. Bước dạng "đạt mức" kiểm tra trạng thái hiện tại.

### 7.5 Quà hệ thống và Hộp thư
- Hộp thư chạy cục bộ trong MVP. Mỗi thư gồm tiêu đề, lời nhắn và tệp quà. Hạn nhận 30 ngày (quà lễ 14 ngày). Tối đa 100 thư; khi đầy thì xóa thư cũ nhất đã nhận. Có nút "Nhận tất cả" và chấm đỏ báo thư mới.
- **Các loại quà**:
  - Chào mừng: 100.000đ + 20 MV.
  - Quà phiên bản mới, kèm màn "Có gì mới": 10 MV.
  - Quà đền bù lỗi (theo id, không nhận trùng).
  - Quà lễ vào lúc 04:00 ngày lễ. Ví dụ 20/10: 20 MV; 20/11: 20 MV + 0,5 TNC; Tết: 88 MV + lì xì 1 TNC.
  - Quà mốc: khách thứ 100/1.000, lên chặng mới, "sinh nhật quán" ở ngày thật 30/100/365.
  - **Quà đời thường**: từ ngày thật thứ 3, mỗi ngày có 10% nhận 0,3–0,6 TNC (khách quen lì xì, trả ví rơi, bán ve chai). Một số quà cần điều kiện chất lượng, ví dụ "Quán được bình chọn" cần từ 20 đánh giá và sao trung bình ≥4,5.
  - Nhiệm vụ quên nhận; review "thối thiếu" đến muộn.
- **Cấu hình**: mỗi quà có `{id, from, to, condition:{minChang}, reward}`. Client đẩy mỗi quà vào hộp thư đúng 1 lần theo id. Trần: ngoài quà đền bù, tối đa 2 quà mỗi tháng và tổng không quá 3 TNC.
- GĐ2 tải `gifts.json` từ host tĩnh (có bản cache khi mất mạng). GĐ3 dùng máy chủ ký quà.

---

## 8. Các đề xuất thêm

Mỗi đề xuất ghi kèm mức ưu tiên [MVP], [GĐ2] hoặc [GĐ3].

### A. Quầy và vận hành
- **[MVP] Đọc lại đơn trước khi báo tổng**: tốn 2 giây nhưng bắt lỗi khi sửa còn rẻ. Người chơi tự rút ra bài học "nhanh hay chắc" mà không cần ai giảng.
- **[MVP] Chuyển khoản giả và Loa báo tiền**: dạy "ảnh chụp màn hình không phải là tiền" bằng một lần mất tiền thật trong game.
- **[GĐ2] Gợi ý bán thêm**: mời đúng cặp món (bánh mì + trà tắc) thì 30–45% khách nhận; mời lạc đề 5–8% và khách giảm kiên nhẫn. Không mời khách đang vội.
- **[GĐ2] Chốt ca đếm két, kèm nhật ký lệch từng phiếu**: lỗi trong ca có thêm vòng phản hồi cuối ngày. Nộp tiền là cách phòng rủi ro người chơi tự chủ động, không phải hình phạt.
- **[GĐ2] Voucher như một câu đố 4 điều kiện**: áp sai là thất thoát, từ chối voucher hợp lệ thì khách giận.
- **[GĐ2] Thu ngân NPC và "kèm cặp"**: người chơi tự đứng quầy 5 khách không lỗi để nhân viên lên bậc (miễn phí), hoặc trả 150.000đ cho mỗi khóa học. Lỗi của nhân viên hiện trên phiếu chấm.
- **[GĐ3] Sơ đồ bàn, tạm tính, tách/gộp/chuyển bàn, hóa đơn công ty** (nhập mã số thuế 10 số): toàn là nghiệp vụ thật, làm bằng kéo thả rất hợp màn hình cảm ứng.

### B. Bếp
- **[GĐ2] Sơ chế đầu ca (mise en place)**: chơi mini-game một lần cho cả mẻ 5/10/20 phần. Điểm được lưu vào hộp đồ sơ chế. Hộp hết hạn cuối ca, kèm Mẹo FIFO và dán nhãn.
- **[GĐ2] Nấu theo mẻ**: gom 2–3 phiếu cùng món. Thời lượng mỗi bước × (1 + 0,4 × (n − 1)). Điểm dùng chung cho cả mẻ, nên rủi ro cao, thưởng cao.
- **[GĐ2] Nút Nếm trước khi ra món**: tốn 1,5 giây để xem 3 thanh vị mặn, ngọt, chua; nêm lại tối đa 85 điểm.
- **[GĐ2] Bếp 2 họng chạy nền**: nồi và chảo tự chạy khi người chơi rời bếp. Mở sau khi người chơi đã quen tay.
- **[GĐ2] Hũ ủ và nồi ninh theo giờ thật**: đồ chua 12 giờ, cơm rượu 36 giờ, dưa cải 48 giờ, nước dùng 6 giờ. Mở hũ đúng cửa sổ 24 giờ thì món dùng nó +10 điểm. Tạo lý do quay lại rất Việt.
- **[GĐ2] Truyền nghề**: nhân viên chỉ nấu được món chủ quán đã làm mẫu đạt Ngon 3 lần và đã thạo cấp 2. Chất lượng nhân viên = 70% điểm mẫu tốt nhất của chủ + kỹ năng nhân viên, trần 88.
- **[GĐ3] Bếp đa trạm, Pass và chế độ Bếp trưởng**: người chơi đứng ở Pass trả lại đĩa không khớp phiếu; "Sửa" một đĩa trong 3 giây được +10 Q.

### C. Nội dung Việt
- **[MVP] Giọng Nam/Bắc và Sổ từ vùng miền**: nhấn giữ bóng thoại để xem chú giải; thu thập đủ 20 ô thưởng 1 công thức. GĐ2 thêm giọng Trung. Có bẫy vui: "thơm" ở miền Nam là trái dứa.
- **[MVP] Dì Sáu và Anh Khoa**: Dì Sáu cố vấn bếp, Anh Khoa hướng dẫn công cụ bán hàng. Anh Khoa có câu cửa miệng "Kết ca trước khi về nha, không mai lệch két là khóc đó!", là nhân vật gợi nhắc chính nghề của người dùng.
- **[GĐ2] 6 khách quen có tên** và thiện cảm 0–100 (không tự giảm theo thời gian): thiện cảm 40 được tip +10%; 60 mở chuyện riêng; 80 tặng công thức gia truyền; 100 dẫn thêm bạn tới.
- **[GĐ2] Khách nước ngoài** gọi món bằng tiếng Anh đơn giản kèm chỉ tay vào hình, hay nhầm tờ 20k với 500k. Trả lại phần thừa được +2 danh tiếng.
- **[GĐ3] Hành trình ẩm thực 3 miền**: 9 điểm đến, mỗi điểm có đầu bếp địa phương và nguyên liệu đặc sản. Mỗi chuyến đi tốn 1 ngày nghỉ bán, là một đánh đổi thật.

### D. Giữ chân và LiveOps
- **[GĐ2] Nhiệm vụ tuần và Rương tuần**: thanh 1.000 điểm với các mốc 250/500/750/1.000. Chơi 4–5 trên 7 ngày vẫn đạt mốc 750.
- **[GĐ2] Chuỗi ngày mở quán kèm vé nghỉ phép**: mỗi tuần có 1 vé tự dùng khi lỡ ngày. Thưởng chỉ là MV và đồ thẩm mỹ, không có buff sức mạnh.
- **[GĐ2] Thành tựu 3 bậc và danh hiệu**: khoảng 60 thành tựu tính từ bộ đếm `stats` đã ghi ngay từ MVP, nên người chơi cũ được nhận bù phần đã đạt.
- **[GĐ2] Ca Hứng Khởi**: 3 ca đầu mỗi ngày thật được danh tiếng ×1,25, Tem ×1,25, thạo món ×1,5, nhưng không nhân Tiền. Kéo người chơi quay lại mỗi ngày mà không cấm ai chơi dồn.
- **[GĐ2] Giftcode cho fanpage**: file chỉ chứa SHA-256(muối + mã). Mỗi save dùng 1 lần. Trần 50 MV + 1 TNC.
- **[GĐ2] Quà quay lại**: vắng 3/7/14 ngày được 30/60/100 MV, kèm tuần "Trở lại bếp" có 3 nhiệm vụ nhẹ.
- **[GĐ2] Đi chợ sớm mặc cả**: 3 lượt mỗi ngày, canh kim để giảm 3/8/15%. Nói câu lịch sự thì được cộng.
- **[GĐ3] Thẻ Đầu Bếp miễn phí theo mùa 28 ngày**: 30 bậc, chủ đề vùng miền. Nếu sau này có bản trả phí thì chỉ bán đồ thẩm mỹ.
- **[GĐ3] Web Push**: tối đa 1 thông báo/ngày, giờ yên lặng 22:00–08:00, chỉ 4 loại nhắc.

### E. Tiến trình và quản lý
- **[GĐ2] Trang trí theo chặng và Góc kỷ niệm**: mỗi lần lên chặng, chọn 1 món cũ làm kỷ vật (ví dụ chiếc xe đẩy đầu tiên đặt ở sảnh nhà hàng). Điểm Không khí cho kiên nhẫn tối đa +20%.
- **[GĐ2] Chọn mặt bằng ở Chặng 3**: trường học (khách ×1,3, chịu giá ×0,85), văn phòng (giá ×1,2, trưa ×1,8), chợ (nguyên liệu −15%, khách soi giá). Đây là quyết định chiến lược lớn nhất, và là lý do để chơi lại.
- **[GĐ2] Định giá linh hoạt ±20%**: điểm tối ưu nhẹ quanh +10%, đổi lại có rủi ro bị review "chê đắt". Không có chiến lược nào thắng tuyệt đối.
- **[GĐ2] Đơn đặt tiệc có cọc 30%** và **đơn app giao hàng với bước đóng gói đúng** (túi riêng cho nước chấm, tem niêm phong, đối chiếu mã 4 số khi giao cho tài xế).
- **[GĐ3] Thẩm định viên ẩn danh và Đũa Vàng**: chấm 3 tiêu chí Quầy, Món, Vệ sinh. Kết quả kém chỉ nhận bài góp ý, không bị trừ tiền.
- **[GĐ3] Tái khởi nghiệp vùng miền**: giữ công thức (thạo giảm 2 cấp), kỷ vật và 1 đệ tử. Điểm Bí kíp dùng mua đặc quyền vĩnh viễn. Khẩu vị vùng làm dời mục tiêu nêm.
- **[GĐ3] Gửi quà cho quán bạn** (chỉ quà tốt): học ý tưởng "chọc quán" nhưng bỏ phần phá quán để tránh bị troll.

### F. Đào tạo (phục vụ vai trò của người dùng)
- **[GĐ2] Chế độ Học việc**: 4 khóa với 19 bài, mỗi bài 2–4 phút, đề cố định, chấm 1–3 sao, có "Giấy khen Học việc" dạng ảnh chia sẻ được. Chế độ này tách hẳn khỏi game chính và mặc định tắt quảng cáo.
- **[GĐ2] Thử thách Thu ngân 60 giây**: 12 khách cùng một đề theo seed ngày, 3 lượt/ngày, không ảnh hưởng kinh tế quán. Dùng làm bài khởi động cho buổi đào tạo.
- **[GĐ2] Kiểm tra Mẹo nghề cuối tuần**: 5 câu lấy từ các thẻ đã mở. Đúng 4/5 được 10 MV.
- **[GĐ3] Mã bài thi cho người đào tạo**: tạo mã 8 ký tự chứa bài và seed; học viên gửi lại mã kết quả có checksum; người đào tạo xem "Bảng lớp" và thống kê lỗi phổ biến (ví dụ "42% lớp thối sai khi khách đưa tờ 500k"). Ghi rõ đây chỉ là công cụ ôn luyện.

### G. Kỹ thuật và công cụ
- **[MVP] Phòng thử mini-game `lab.html`**: chọn cơ chế và tham số để chơi riêng, phục vụ cân bằng.
- **[MVP] Sổ số liệu cục bộ**: ghi thời gian ở quầy và bếp của từng khách, số lần chạm, lỗi theo loại. Giữ 60 ca. Có nút "Xuất số liệu" để người thử gửi lại.
- **[GĐ2] `tools/mo-phong.js`**: mô phỏng 3 hồ sơ người chơi (3,8 / 4,2 / 4,7 sao) trong 60 ngày thật, xuất CSV, kiểm tra tiêu chí thời lượng lên chặng và tỉ lệ thưởng.
- **[GĐ3] Backend Cloudflare Workers**: lưu mây, mã chuyển máy, bảng xếp hạng Giải Bếp Tuần (máy chủ chạy lại mô phỏng để xác thực), LiveOps từ xa có chữ ký.

---

## 9. Kinh tế

### 9.1 Các loại tiền

| Tiền tệ | Vai trò | Nguồn chính | Nơi tiêu | Có từ |
|---|---|---|---|---|
| **Tiền** (VNĐ ảo) | Vận hành | Bán món 70–75%; tip 5–10%; nhiệm vụ, điểm danh, quà 20–27% | Giá vốn; chi phí cố định; công thức; nâng cấp; chuyển chặng; làm lại, hoàn tiền; thối dư; trả vay | MVP |
| **Danh tiếng** | Điểm kinh nghiệm, không tiêu được, không giảm | Sao của từng khách; nhiệm vụ (+5); chuỗi | Ngưỡng mở khóa | MVP |
| **Muỗng Vàng (MV)** | Tiền cao cấp, **chỉ kiếm trong game** | Điểm danh khoảng 8/ngày; hòm ngày 10; chuỗi; lên chặng 100–300; (GĐ2) rương tuần, thành tựu, két khớp +2 | MVP: đổi nhiệm vụ (5 MV), 3 màu dù xe (30 MV mỗi màu, chỉ thẩm mỹ). GĐ2: Kệ Đặc biệt, trang trí, Vé Bù, ô kho | MVP |
| **Thạo món** | Tiến độ riêng từng món | Nấu đạt Ngon trở lên | — | MVP |
| **Tem Lễ Hội** | Token sự kiện, có hạn | Món trong sự kiện; nhiệm vụ và điểm danh sự kiện; chuỗi sự kiện | Quầy đổi | GĐ2 |
| **Mảnh công thức** | 10 mảnh cùng món thì mở món đó | Rương tuần | Góc Mảnh (đặt 1 "món ưu tiên") | GĐ2 |

**Luật tách lớp**:
- Không có đường đổi Tiền sang MV.
- Tem đổi sang MV có trần 50 MV mỗi sự kiện.
- Tem dư đổi sang Tiền với tỉ lệ thấp.
- Không bán bất kỳ loại tiền nào bằng tiền thật.
- Mở dần: ca đầu tiên chỉ thấy Tiền và danh tiếng; MV xuất hiện ở lần điểm danh đầu; Tem chỉ hiện khi có sự kiện.

### 9.2 Bảng TNC và tỉ lệ giá vốn (FC) theo chặng

| Chặng | Khách/ca | Giá trung bình/khách | Doanh thu/ca | FC mục tiêu | Chi phí cố định/ca | Tip | **TNC** |
|---|---|---|---|---|---|---|---|
| 1 | 4–8 | khoảng 20k | khoảng 150k | 45% | 20k | khoảng 5k | **80k** |
| 2 | 8–10 | khoảng 35k | khoảng 315k | 40% | 45k | khoảng 15k | **160k** |
| 3 | 10–12 | khoảng 55k | khoảng 605k | 38% | 110k | khoảng 35k | **300k** |
| 4 | 12 lượt bàn | khoảng 90k | khoảng 1,08tr | 35% | 220k | khoảng 86k | **600k** |
| 5 | 12 bàn | khoảng 220k | khoảng 2,64tr | 32% | 700k | khoảng 264k | **1,4tr** |
| 6 | 8–10 | khoảng 900k | khoảng 7,2tr | 28% | 2,5tr | khoảng 864k | **3,5tr** |
| 7 | Chi nhánh tự chạy | Lãi chuẩn của mô hình × (sao chi nhánh / 4,5) × (0,7 + 0,06 × cấp quản lý) | | | | | |

- **Giá bán** = giá vốn chia FC mục tiêu, làm tròn lên bội 5.000đ ở Chặng 1–2, bội 1.000đ ở Chặng 3–4, bội 5.000đ ở Chặng 5–6. Đồ uống có FC thấp hơn món chính 10–15 điểm.
- Sổ sách hiện song song **FC chuẩn** và **FC thực tế** (FC thực tế tính cả hao hụt, làm lại, hoàn tiền). Mục tiêu: người chơi trung bình cao hơn FC chuẩn 5–8 điểm, người giỏi cao hơn 1–3 điểm.
- **Tiêu chí cân bằng**: người đạt 4,7 sao phải lãi hơn người đạt 3,8 sao ít nhất 25%, chưa tính hệ số khách.

**Ví dụ một ca Chặng 1** (ngày 7, 7 khách, 10 món):
- Doanh thu: 5 bánh mì (100k) + 4 trà tắc (40k) + 1 bánh tráng trộn (20k) = 160k.
- Giá vốn: 45 + 12 + 8 = 65k.
- Hao hụt (1 lần làm lại trứng): 5k.
- Tip: 5k.
- Chi phí cố định: 20k.
- Thối dư: 5k.
- **Lãi khoảng 70k**, xấp xỉ TNC.

### 9.3 Giá công thức

| Chặng | Kệ Chính (Tiền) | Tương đương | Kệ Đặc biệt (MV) | Tương đương (khoảng 30 MV/ngày) |
|---|---|---|---|---|
| 1 | 250k | khoảng 3 ca lãi | — | — |
| 2 | 500–600k | 3–4 ca | 150 | khoảng 5 ngày |
| 3 | 1,2–1,5tr | 4–5 ca | 250 | khoảng 8 ngày |
| 4 | 3–3,6tr | 5–6 ca | 300 | khoảng 10 ngày |
| 5 | 7–9tr | 5–6,5 ca | 400 | khoảng 13 ngày |
| 6 | 20–25tr | 6–7 ca | 500 | khoảng 17 ngày |

Nhịp mục tiêu: 1 công thức thường mỗi 1–3 ngày thật; 1 công thức đặc biệt mỗi 1–2,5 tuần. Mỗi chặng có khoảng 2 món có sẵn, 3 món mua bằng Tiền, 1–2 món mua bằng MV, 1 món từ chuỗi. Tổng khoảng 40 món khi tới Chặng 6.

### 9.4 Đường cong giá nâng cấp
Giá cấp n = làm_tròn(C0 × r^(n−1)). Hiệu ứng giảm dần theo cấp: e(n) = e1 × 0,85^(n−1).

| Nhóm | r | Số cấp | C0 | Ghi chú |
|---|---|---|---|---|
| Dụng cụ (mang theo qua các chặng) | 1,35 | 5 | 1,5–2,5 TNC | Cấp tối đa được mua = số chặng + 1 |
| Công suất (gắn với địa điểm) | 1,6 | 2–3 | 1–2 TNC | Khi đổi chặng được thanh lý, hoàn 30% |
| Trang trí | 1,15 | 10 | 0,5 TNC | +2% khách mỗi cấp, trần +20% |

Bảo trì (GĐ2): mỗi ca tốn 1% giá trị dụng cụ, trần 8% TNC.

**Nâng cấp MVP**:

| Nâng cấp | Giá | Mở từ | Hiệu ứng |
|---|---|---|---|
| Dao thép tốt | 150k | ngày 2 | Vùng thái +20% |
| Chảo chống dính | 200k | ngày 3 | Vùng chín +15% |
| Ghế nhựa chờ | 180k | ngày 3 | Kiên nhẫn xếp hàng ×1,2 |
| Máy tính cầm tay | 150k | ngày 3 | Tự cộng tổng, hiện tiền thối |
| Loa báo tiền | 150k | ngày 5 | Tự xác nhận QR, chặn ảnh giả |

### 9.5 Ngân sách thưởng (Chặng 1, một ngày thật chơi 3,5 ca)

| Nguồn | Tiền | MV |
|---|---|---|
| Điểm danh (trung bình) | khoảng 14k | khoảng 8 |
| 3 nhiệm vụ | 48k | 0 |
| Hòm ngày | 16k | 10 |
| Quà đời thường (kỳ vọng) | khoảng 3k | — |
| **Tổng** | **khoảng 81k, tức khoảng 22% tổng Tiền nhận trong ngày** (trần 35%) | **khoảng 18** (GĐ2 lên khoảng 30) |

Nếu Sổ số liệu cho thấy thưởng vượt 35% thì giảm hệ số thưởng.

### 9.6 Lưới an toàn và phạt
- **Không game over, không xóa save.**
- Khi Tiền không đủ mở một ca: **"Dì Sáu cho mượn"** 3 TNC, trả 110% bằng cách tự trừ 25% lãi mỗi ca. Mỗi lần chỉ được 1 khoản. Đang nợ thì không chuyển chặng được.
- **Gói cứu trợ**: nguyên liệu đủ 1 ca, tối đa 1 lần mỗi 3 ngày game.
- **Chơi lại ca**: khôi phục trạng thái đầu ca, miễn phí.
- **Mọi phạt đều có trần**: không bao giờ tính theo % tiền mặt đang giữ. Mỗi drama lỗ tối đa 0,5 TNC và không quá 20% két.

---

## 10. Mẹo nghề: lồng nhẹ vận hành F&B

**Luật hiển thị**
- Mẹo hiện khi người chơi gặp một bước lần đầu (trong phần hướng dẫn), hoặc ngay sau lần đầu mắc một loại lỗi.
- Dạng toast 3 giây, **không dừng game**, mỗi mẹo tối đa 2 câu.
- Ngoài phần hướng dẫn, tối đa 1 mẹo mỗi ca. Tắt được trong Cài đặt.
- Mẹo đã gặp được gom vào **Sổ tay nghề**, chia nhóm Quầy / Bếp / Kho / Phục vụ-Quản lý. Đủ một nhóm được danh hiệu và 20 MV.
- Màn chờ tải hiện ngẫu nhiên một mẹo đã mở. Cuối ngày có mục "Mẹo của Dì Sáu".
- Mọi con số trong mẹo đều ghi rõ là **"số liệu minh họa"**. Cần người làm bếp hoặc kế toán duyệt lại trước khi dùng để đào tạo chính thức.

**20 thẻ Mẹo nghề của MVP**

| Nhóm | Thẻ |
|---|---|
| Quầy (12) | (1) Luôn đọc lại order trước khi báo tổng: sửa ở quầy mất 2 giây, sửa ở bếp mất cả một món. (2) Khách dặn kiêng gì thì ghi ngay lên phiếu, đừng tin trí nhớ. (3) Hai phần cùng món mà khác yêu cầu thì tách thành hai dòng. (4) Báo tổng rõ ràng và chỉ bảng giá cho khách thấy. (5) Để tờ tiền khách đưa trên nắp két tới khi thối xong. (6) Đếm tiền thối hai lần: lúc lấy khỏi két và trước mặt khách. (7) Nói to: "Nhận 200 nghìn, thối 170 nghìn". (8) Chuẩn bị đủ tiền lẻ đầu ca. (9) Chỉ xác nhận chuyển khoản khi loa hoặc ứng dụng báo tiền đã về đúng số. (10) Trả trước thì thu tiền xong mới gửi phiếu vào bếp. (11) Ghi chú đặc biệt phải nằm trên phiếu bếp, đừng chỉ dặn miệng. (12) Bếp quá tải thì báo trước thời gian chờ cho khách mới |
| Bếp (6) | (13) Rửa rau dưới vòi nước chảy rồi mới thái. (14) Dùng thớt riêng cho đồ sống và đồ chín, rau. (15) Nêm từ ít tới nhiều. (16) Chảo dầu bốc cháy: tắt bếp, đậy kín nắp, tuyệt đối không dội nước. (17) Định lượng chuẩn giúp món đồng đều và giữ được giá vốn. (18) Làm hỏng thì làm lại; ra món kém còn tốn hơn một phần nguyên liệu |
| Phục vụ, Quản lý (2) | (19) Khách phàn nàn: lắng nghe, xin lỗi, giải quyết, cảm ơn. (20) Quán nhỏ thường có giá vốn khoảng 35–45% giá bán; nhà hàng thường giữ khoảng 28–35% |

**Mở thêm theo chặng**
- Chặng 2: dọn bàn, đóng gói mang về, nhớ mặt khách quen, nhập trước xuất trước (FIFO), dán nhãn ngày.
- Chặng 3: chọn đúng phương thức thanh toán trên máy; kiểm tra điều kiện voucher; hủy món đã in bếp phải có lý do; kết ca đối soát theo phương thức; báo hết món trên POS ngay khi hết hàng; đào tạo nhân viên mới bằng cách làm mẫu; tủ mát giữ 0–5 độ C, đồ sống để ngăn dưới.
- Chặng 4: ghi đặt bàn đủ tên, số người, giờ và ghi chú; dị ứng là chuyện sức khỏe chứ không phải khẩu vị.
- Chặng 5: in tạm tính cho khách kiểm tra trước khi thu; hỏi tách hóa đơn theo món hay chia đều; hỏi lấy hóa đơn công ty ngay khi thanh toán và đọc lại mã số thuế; ưu tiên bàn giơ tay gọi tính tiền.
- Chặng 6: phục vụ mọi khách như nhau (bài học từ food reviewer); gọi món theo lượt đúng nhịp bàn.

---

## 11. Kỹ thuật

### 11.1 Nền tảng
- HTML/CSS/JavaScript thuần với **ES Modules**. Không có bước build, không có dependency khi chạy.
- Giao diện vẽ bằng **DOM/CSS + SVG**. Input dùng **Pointer Events** (chung cho cảm ứng, chuột và Playwright). Âm thanh tổng hợp bằng **WebAudio**.
- PWA gồm manifest và service worker.
- Font system-ui, đủ dấu tiếng Việt, không tải font ngoài.
- Hình ảnh: emoji từ Unicode 12 trở xuống, cộng SVG tự vẽ. Không nhúng ảnh base64.
- Ngân sách MVP: JS và CSS dưới khoảng 250 KB chưa nén; từ lần mở thứ hai chơi được offline.
- Mở trang bằng `file://` thì hiện hướng dẫn chạy `npm run serve`.
- **Không đưa state hay engine ra biến `window`.**

### 11.2 Cấu trúc thư mục (quan hệ phụ thuộc một chiều: `ui → core → data`)
```
/index.html  /lab.html  /manifest.webmanifest  /sw.js  /ping.txt
/icons/ icon.svg icon-192.png icon-512.png
/css/ base.css ui.css game.css
/src/main.js                      khởi động: nạp save, đồng bộ giờ, đăng ký SW, router
/src/core/                        logic thuần, cấm dùng document/window
  rng.js bus.js money.js order.js customer.js ticket.js minigame-scoring.js
  scoring.js shift.js economy.js mastery.js clock.js quests.js checkin.js
  mail.js shop.js events.js incidents.js tips.js save.js state.js
/src/data/                        toàn bộ nội dung và cân bằng (module JS, Object.freeze)
  balance.js ingredients.js recipes.js minigame-types.js customers.js dialogue.js
  upgrades.js quests.js checkin.js mail.js shop.js events.js incidents.js
  reviews.js tips.js strings.js
/src/ui/ dom.js router.js input.js loop.js audio.js art.js
/src/ui/components/ hud.js toast.js modal.js patience-ring.js cash-drawer.js ticket-rail.js
/src/ui/screens/ title.js prep.js counter.js kitchen.js result.js summary.js shop.js
                 quests.js checkin.js mailbox.js recipe-book.js notebook.js settings.js
/src/ui/minigames/ index.js chon.js cha.js thai.js cham.js lua.js rot.js
/tests/unit/*.test.mjs  /tests/fixtures/  /tests/helpers/static-server.mjs  /tests/e2e/*.e2e.mjs
/tools/make-icons.mjs
/docs/de-xuat-thiet-ke.md  /docs/kien-truc.md  /docs/can-bang.md
/package.json  /.github/workflows/pages.yml
```

**Giao diện plugin mini-game**:
```js
export default {
  type,
  mount(stage, step, ctx) → { result: Promise<{score, errors}>, destroy() }
}
```
Hàm chấm điểm thuần nằm ở `core/minigame-scoring.js` để test được bằng Node.

### 11.3 Dữ liệu và bộ kiểm tra dữ liệu
Toàn bộ nội dung là module xuất object đóng băng. `tests/unit/data.test.mjs` kiểm tra:
- `step.type` nằm trong danh sách cơ chế; `step.ing` thuộc danh sách nguyên liệu của món; id nguyên liệu tồn tại.
- `notes.removes` là tập con của nguyên liệu.
- Giá là số nguyên, là bội số 5.000đ ở Chặng 1–2, và lớn hơn giá vốn.
- Món có `source 'shop'` phải có mặt hàng tương ứng trong Shop.
- Ngày tháng parse được và `start < end`.
- Khóa lọc của nhiệm vụ nằm trong registry.
- Điểm danh có đúng 7 ô.
- Không có chuỗi hiển thị rỗng hoặc chứa "undefined".
- Tham số nâng cấp khớp với hệ số mà UI dùng để vẽ.

### 11.4 Bus sự kiện
Các sự kiện miền: `order.confirmed`, `order.readback`, `total.reported`, `payment.done {method, amount}`, `change.given {correct, optimal}`, `qr.confirmed {fake}`, `step.done {type, verb, score, ing}`, `dish.served {recipeId, grade, q, perfect}`, `customer.left`, `customer.rated {stars}`, `shop.buy`, `shift.end {profit, left}`.

Nhiệm vụ, chuỗi, thành tựu và bộ đếm `stats` chỉ lắng nghe bus, không chen vào code bếp.

### 11.5 Lưu tiến trình và đồng hồ
- **Lưu**: khóa `bkn.save` có dạng `'BKN1.' + base64url(UTF-8 JSON) + '.' + fnv1a32(muối + payload)`.
  - Khi nạp: kiểm tra hash; nếu sai thì thử lần lượt `bkn.bak1..3`; nếu vẫn hỏng thì cất sang `bkn.rescue`.
  - Sau đó chạy `MIGRATIONS[]` tuần tự, gộp với `defaultState()`, rồi `sanitize()` (kẹp giá trị, xóa id không còn trong dữ liệu).
- **Lưu cả ca đang dở** sau mỗi lần khách chuyển trạng thái và sau mỗi bước mini-game. Tải lại trang không làm lại được bước điểm kém.
- Ghi với debounce 300 ms, và ghi khi `visibilitychange`/`pagehide`. Cuối ca xoay vòng bản sao lưu. Gọi `navigator.storage.persist()`.
- **Mã sao lưu**: `'BKN1.z.' + base64url(deflate-raw) + '.' + hash`. Có nút Chép mã và Nhập mã (xem trước ngày, Tiền, chặng trước khi ghi đè). Nhắc sao lưu mỗi 7 ngày thật.
- **Giới hạn dung lượng**: 60 ca lịch sử, 30 đánh giá dùng để tính sao cộng 60 đánh giá để hiển thị, 100 thư, 200 giao dịch trong sổ cái.
- **Đồng hồ**:
  - `dayKeyVN(ms) = new Date(ms + 7h − 4h).toISOString().slice(0,10)`.
  - `trustedNow = Date.now() + serverOffset`. `serverOffset` lấy từ header `Date` của `HEAD ping.txt?t=…` với `cache:'no-store'`; service worker bỏ qua request này.
  - Lưu `maxSeen`. Nếu `now < maxSeen − 10 phút` thì **khóa** quà theo ngày (vẫn chơi bình thường) và hiện lời nhắc nhẹ. Tua giờ tới trước chỉ "ứng trước" phần thưởng chứ không nhân thêm.
  - Mỗi 60 giây so độ trôi của `Date.now()` với `performance.now()`.
- **Sự kiện** hết hạn khi `max(maxSeen, giờ máy chủ)` vượt mốc kết thúc.

### 11.6 PWA, kiểm thử, triển khai
- **Service worker**: `VERSION` phải khớp `package.json` (có test). Precache mọi module, **có unit test đối chiếu danh sách PRECACHE với cây thư mục thật**. Xóa cache cũ khi activate. Chỉ báo "Có bản mới – Tải lại" ở màn chính hoặc màn tổng kết.
- **Unit test**: `npm test` chạy `node --test tests/unit/`. Phủ money (thối tiền, tham lam, `customerCash` qua 1.000 seed), clock (mốc 04:00 giờ Việt Nam, lùi giờ), FSM, 3 lớp đơn, chấm 6 cơ chế, Q/sao/tip, save (mã hóa rồi giải mã giữ nguyên "Bánh tráng trộn", sửa 1 ký tự bị phát hiện, migrate từ fixture), nhiệm vụ, điểm danh, shop, sự kiện (biên thời gian), dữ liệu, precache.
- **E2E**: `npm run e2e` chạy `NODE_PATH=/opt/node22/lib/node_modules PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node --test tests/e2e/`, nạp Playwright bằng `createRequire`.
  - Máy chủ tĩnh tự viết bằng `node:http`, trả MIME `text/javascript`.
  - Context mô phỏng điện thoại: 390×844, `hasTouch`, locale `vi-VN`, timezone `Asia/Ho_Chi_Minh`.
  - `page.clock.install/runFor` để canh chính xác các bước LUA và ROT.
  - Tham số `?seed=42` chỉ có tác dụng khi chưa có save. Test đọc `data-recipe`, `data-note`, `data-total`, `data-paid`, và vị trí vạch thái qua `data-*`.
- **Triển khai**: GitHub Pages qua `.github/workflows/pages.yml` (chạy test rồi deploy). Nếu repo private trên gói Free thì dùng **Cloudflare Pages** với file `_headers` đặt no-cache cho `sw.js` và `index.html`. Mọi đường dẫn đều tương đối.

---

## 12. Lộ trình MVP → GĐ2 → GĐ3

### 12.1 MVP (code ngay trong phiên này)

**Phạm vi đã chốt:** chỉ **Chặng 1 "Xe đẩy đầu hẻm"**. Người chơi chơi từ ngày 1 tới khi đạt đủ điều kiện lên Chặng 2. Khi đó hiện màn "Quán cóc vỉa hè – sắp khai trương" với nút bị khóa, và người chơi vẫn chơi tiếp Chặng 1 bình thường. Bản đồ hiện đủ 7 chặng, các chặng sau hiện mờ.

**1. Món (3)**
- **Bánh mì ốp la** (20.000đ / vốn 9.000đ) và **Trà tắc** (10.000đ / vốn 3.000đ): có sẵn.
- **Bánh tráng trộn** (20.000đ / vốn 8.000đ): mua ở Shop giá 250.000đ, mở từ ngày 2.
- Công thức, bẫy và ghi chú như mục 4.9.
- Thẻ bóng mờ của Chặng 2: Gỏi cuốn, Bún thịt nướng, Chè ba màu.

**2. Mini-game (6)**: CHON, CHA, THAI (vuốt dọc cắt vạch), CHAM (`exact`, `min`, `targets`), LUA (một lần nhấc), ROT (có nhấn bù). Kèm thẻ công thức luôn hiện, làm lại bước (1 lượt, tối đa 85 điểm), bỏ món, tự kết thúc bước ở 2,5 × par. Phím cách dùng để giữ hoặc nhấn trên máy tính.

**3. Khâu quầy**
- Bóng thoại giọng Nam 70% / Bắc 30%; khoảng 30 mẫu câu; 15 cặp từ đồng nghĩa; lộ trình độ khó 7 ngày.
- Sổ order dạng chip; Đọc lại đơn; Báo tổng tự nhẩm (bàn phím nghìn).
- Tiền mặt với két 7 ngăn, quỹ lẻ 200.000đ, luật hết tiền lẻ.
- QR tĩnh từ ngày 4 (khoảng 25%), ảnh chụp giả 4% từ ngày 7.
- Dây 3 phiếu với viền đổi màu.
- Tab Quầy/Bếp, chỉ chuyển được giữa hai bước.
- Phiếu chấm tách lỗi quầy và lỗi bếp.
- Màn Xử lý phàn nàn (chọn câu xin lỗi, rồi Làm lại hoặc Hoàn tiền).
- Chuỗi "Quầy chuẩn".
- Chốt két tự động trong màn tổng kết.

**4. Khách**
- 5 kiểu khách:

| Kiểu | Tỉ lệ | Kiên nhẫn | Cách trả tiền | Có từ |
|---|---|---|---|---|
| Học sinh, sinh viên | 30% | ×1,0 | Tờ 20k/50k, QR 30% | ngày 1 |
| Công nhân, shipper | 20% | ×0,6 | Tiền vừa đủ hoặc tờ nhỏ | ngày 1 |
| Cô chú lớn tuổi | 20% | ×1,3 | Hay đưa 200k/500k | ngày 1 |
| Dân văn phòng | 20% | ×0,8 | QR 70% | ngày 3 |
| Khách khó tính | 10% | ×0,85 | Lỗi nào cũng thêm −1 sao, 5 sao thì tip ×2 | ngày 5 |

  Trước khi một kiểu mở, tỉ lệ của nó chia cho các kiểu khác.
- Ngày 1: 2 khách đầu là hàng xóm hướng dẫn (cô Thu, bạn Nam), có khung sáng quanh nút cần bấm và không trừ sao.
- Số khách mỗi ca: N = min(8, 4 + floor((ngày − 1)/2)), ±1 theo sao trung bình.
- Số món mỗi khách: 1 món ở ngày 1–2; từ ngày 3 là 70% 1 món / 25% 2 món / 5% 3 món.
- Ghi chú xuất hiện ở 0% đơn (ngày 1–2), 20% (ngày 3–4), 35% (từ ngày 5).
- Khoảng cách khách đến = ngẫu nhiên [0,85; 1,15] × max(40, 55 − 2 × (ngày − 1)) giây, có 1 đợt cao điểm giữa ca ×0,75.
- Hàng chờ tối đa 3 người; khách thứ 4 đi ngang và được ghi "lỡ khách".
- **P1** (xếp hàng) = 45 giây × hệ số persona × ghế chờ. Ngày 1–3 khách không bỏ về. Từ ngày 4, P1 giảm 1 giây mỗi ngày, sàn 32 giây. Khách đang được phục vụ ở quầy mất kiên nhẫn với tốc độ ×0,5.
- **Ngân sách chờ món** B = 30 giây + 2 × tổng par của phiếu. Vượt 75% B: −0,5 sao; vượt 100%: −1 sao; vượt 150%: −2 sao. Khách không bỏ về.
- Ca kết thúc khi khách cuối cùng rời đi. Mục tiêu 4–7 phút. Đồng hồ trong game chạy 06:00–10:00 theo tiến độ ca.

**5. Chấm điểm, kinh tế, tiến trình**
- Thang bước, hạng món, sao, tip, danh tiếng, sao trung bình 30 đánh giá như mục 4.4.
- Vốn đầu 200.000đ; chi phí cố định 20.000đ/ca. Không có kho: giá vốn bị trừ lúc xác nhận bước Chọn; nguyên liệu thừa và làm lại ghi vào Hao hụt.
- 5 nâng cấp như mục 9.4. Thạo món cấp 1–3.
- Điều kiện lên Chặng 2: 150 danh tiếng, sao trung bình ≥3,8, 3 công thức, 2 món thạo cấp 2, xong chuỗi, 500.000đ.
- Lưới an toàn "Dì Sáu cho mượn" và "Chơi lại ca".
- Khoảng 70 câu review theo mã lỗi.
- Tổng kết ca gồm: doanh thu tiền mặt/QR, tip, giá vốn, hao hụt, hoàn tiền, thu thiếu, thối dư, chi phí, lãi; khối Lỗi quầy / Lỗi bếp kèm 1 gợi ý; két; sao trung bình; danh tiếng; thạo món; nhiệm vụ; Mẹo của ngày; "Ngày mai: …".

**6. Năm hệ thống ở mức tối thiểu**
- **Điểm danh**: 7 ô tích lũy, vòng đầu là Tuần Khai Trương.
- **Nhiệm vụ ngày**: 3 nhiệm vụ bốc từ bể 12, kèm hòm ngày; đổi 1 lần miễn phí, sau đó 5 MV.
- **Sự kiện ngẫu nhiên**: 4 sự kiện ngày báo trước và 3 tình huống trong ca; cài đặt Nhiều / Vừa / Ít.
- **Chuỗi nhiệm vụ**: "Ngày đầu ra phố" (7 bước) và "Làm quen QR" (3 bước).
- **Quà hệ thống**: hộp thư cục bộ (thư chào mừng, thư phiên bản, quà lễ 20/10 và 20/11 trong dữ liệu, quà đời thường 10%, nhiệm vụ quên nhận, review muộn).
- **Shop**: Kệ Chính có 1 món, nấu thử miễn phí, 3 thẻ bóng mờ, tab Nâng cấp, góc MV với 3 màu dù.

**7. Nội dung khác**
- NPC Dì Sáu (dẫn dắt, 4 biểu cảm) và Anh Khoa.
- 20 thẻ Mẹo nghề cùng Sổ tay nghề.
- Sổ công thức (đã có, còn khóa, số lần nấu, điểm cao nhất, cấp thạo).
- Cài đặt: âm thanh, rung, 4 công tắc Hỗ trợ, bật/tắt Mẹo nghề, giảm chuyển động, sao lưu/khôi phục bằng mã, chơi lại từ đầu.
- 8 âm thanh WebAudio.

**8. Kỹ thuật**
- Như mục 11: save có ca dở, đồng hồ 04:00 giờ Việt Nam kèm khóa khi lùi giờ, PWA offline, Sổ số liệu cục bộ, `lab.html`.
- Engine sự kiện có thời hạn (`isActive`, ví Tem, các trường `eventId/from/to` trong dữ liệu) cùng unit test, **chưa phát hành nội dung sự kiện**.

**Thứ tự code**
1. `package.json`; `core/rng`, `money`, `clock` cùng test.
2. Dữ liệu: ingredients, recipes, minigame-types, balance, customers, dialogue, upgrades, quests, checkin, mail, incidents, reviews, tips, strings; cùng test bộ kiểm tra dữ liệu.
3. Core: order (3 lớp), customer (FSM), ticket, minigame-scoring, scoring, shift (sinh khách bằng seed), economy, mastery, save, state; cùng test (mốc: khoảng 40 test xanh).
4. UI nền: index.html, css, dom, router, input, loop, HUD, toast, modal.
5. Màn Quầy: sổ order, đọc lại, báo tổng, két, QR, dây phiếu. Mốc: chơi tay được phần quầy của 1 ca.
6. Màn Bếp: 6 mini-game, thẻ công thức, làm lại, bỏ món; cùng `lab.html`.
7. Màn Kết quả (phiếu chấm, review, xử lý phàn nàn) và màn Tổng kết ca.
8. Hệ thống meta: điểm danh → nhiệm vụ và hòm → hộp thư → chuỗi → Shop, nâng cấp, nấu thử → sự kiện ngày và tình huống → Mẹo nghề và Sổ tay → Sổ công thức.
9. Âm thanh, PWA (manifest, `sw.js`, `tools/make-icons.mjs`), Cài đặt và Hỗ trợ.
10. E2E cùng ảnh chụp từng màn để soát chính tả.
11. Tài liệu `docs/de-xuat-thiet-ke.md` (bản này), `kien-truc.md`, `can-bang.md`.

**Đường cắt khi thiếu thời gian** (cắt từ trên xuống):
1. `lab.html`
2. Chuỗi "Làm quen QR"
3. Màu dù mua bằng MV
4. Âm thanh
5. Tình huống trong ca (giữ sự kiện ngày)
6. Bước chọn câu xin lỗi
7. Chuyển tab giữa các bước (thay bằng phục vụ tuần tự: làm xong món mới quay lại quầy)

**Không bao giờ cắt:** FSM 3 lớp, sổ order cùng báo tổng và thối tiền, 6 cơ chế bếp, lưu cùng ca dở, điểm danh, nhiệm vụ ngày, hộp thư, chuỗi C1, Kệ Chính, unit test, 1 kịch bản e2e.

**Nếu còn thời gian (MVP mở rộng):** sự kiện mẫu "Tri ân 20/11" (12–21/11/2026) với món **Chè bưởi** và Tem "Phấn Trắng", test bằng `page.clock`.

**Điều kiện hoàn thành (Definition of Done)**
- `npm test` xanh với khoảng 50 unit test chạy dưới 3 giây.
- `npm run e2e` xanh với các kịch bản:
  - Một ca đầy đủ: đọc bong bóng → ghi đúng → báo tổng → thối đúng → nấu → ít nhất 3 sao, Tiền tăng, có `bkn.save`.
  - Tải lại giữa ca vẫn tiếp tục được.
  - Offline sau lần mở đầu.
  - Điểm danh qua mốc 04:00 giờ Việt Nam.
  - Lùi giờ thì bị khóa thưởng.
- Chơi tay ngày 1 trên khung 390×844 xong trong 7 phút hoặc ít hơn, console không có lỗi.
- Mọi chuỗi hiển thị là tiếng Việt có dấu, đã soát qua ảnh chụp.
- Quy mô ước tính: khoảng 5.000–6.000 dòng.

**Để sau, không làm ở MVP:** kho, hạn dùng, sơ chế đầu ca, nấu mẻ, bếp chạy nền; 6 cơ chế còn lại; ăn tại chỗ, khách quen có tên; máy POS, khuyến mãi, thẻ, tờ 1k/2k, chốt ca đếm két; nhân viên; nội dung sự kiện và Quầy đổi Tem; Kệ Đặc biệt, kệ xoay, mảnh công thức; lịch tháng, nhiệm vụ tuần, chuỗi ngày, thành tựu, giftcode; trang trí; Chặng 2–7; backend, bảng xếp hạng, Web Push; Chế độ Học việc; nhạc nền.

### 12.2 GĐ2 (mục tiêu: Chặng 2–3 chơi được, LiveOps đầy đủ khi offline)
Có hai mốc lịch: sự kiện **20/11/2026** và nội dung **Tết Đinh Mùi** chốt trước giữa tháng 01/2027.
1. **Chặng 2**: ăn tại chỗ, dọn bàn, đóng gói; 6 khách quen và Sổ khách; LUC, KHUAY, BAY_DIA, VUOT_CHUOI; Gỏi cuốn, Bún thịt nướng, Cơm tấm, Chè ba màu; kho theo lô FIFO kèm dự báo; đi chợ mặc cả; bếp 2 họng.
2. **LiveOps**: sự kiện 20/11, Giáng sinh, Tết (Bánh chưng); Tem và Quầy đổi; Kệ Đặc biệt MV; Kệ Đặc sản; Mảnh công thức; nhiệm vụ tuần và rương; chuỗi ngày có vé nghỉ; thành tựu; lịch tháng và Vé Bù; quà quay lại; giftcode; Ca Hứng Khởi; `gifts.json` tải từ xa.
3. **Chặng 3**: chọn mặt bằng; máy POS, in bếp, gọi số; khuyến mãi; QR động, thẻ, 1k/2k; chốt ca đếm két; thu ngân NPC và kèm cặp; phụ bếp và truyền nghề; sơ chế đầu ca, nấu mẻ; đơn app và đóng gói; VSATTP; đối thủ Lâm; Phở bò tái.
4. **Chiều sâu**: thạo món cấp 4–5, nút Nếm, drama đầy đủ, đơn bất chợt, đòi hoàn tiền khi chờ quá lâu, "Mời trà đá", trang trí và Góc kỷ niệm, định giá ±20%, đơn tiệc, hũ ủ và nồi ninh.
5. **Đào tạo và công cụ**: Chế độ Học việc (khóa Thu ngân và khóa Bếp), Thử thách Thu ngân 60 giây, kiểm tra Mẹo nghề cuối tuần, `tools/mo-phong.js`, thêm 40 thẻ Mẹo nghề.

### 12.3 GĐ3
- **Chặng 4–7**: sơ đồ bàn, khách nhóm, đặt bàn, dị ứng; trả sau với tạm tính, tách/gộp/chuyển bàn, VAT mô phỏng, hóa đơn công ty, KDS, set menu, Pass, bếp chia trạm; thực đơn nhiều món, VE_DUONG, LAC, flambé, Đũa Vàng; Chuỗi và Tái khởi nghiệp; Hành trình 3 miền.
- **Backend Cloudflare Workers**: lưu mây, mã chuyển máy, bảng xếp hạng Giải Bếp Tuần (xác thực bằng mô phỏng tất định), LiveOps có chữ ký, xác thực phần thưởng; Web Push.
- Thẻ Đầu Bếp mùa; Tủ Kỷ Niệm; mã bài thi cho người đào tạo; khóa Học việc Phục vụ và Quản lý.
- Thử nghiệm quảng cáo tặng thưởng có trần (sau khi đã tìm hiểu quy định).

---

## 13. Rủi ro và cách giảm thiểu

| Rủi ro | Mức | Cách giảm thiểu |
|---|---|---|
| Mỗi khách mất 45–55 giây thao tác, làm ca dài và mỏi tay | Cao | Món ở Chặng 1 chỉ 4–8 bước; kiên nhẫn chủ yếu tính lúc xếp hàng; thạo cấp 3 có "Tự làm"; GĐ2 thêm sơ chế đầu ca, nấu mẻ, POS và nhân viên. Giữ 150–250 lần chạm mỗi ca. Đo bằng Sổ số liệu trên điện thoại thật trước khi chốt số |
| Tính nhẩm và thối tiền làm khó người sợ toán | Vừa | Giá tròn 5.000đ; ngày 1–3 hiện "Cần thối"; Máy tính cầm tay từ ngày 3; Hỗ trợ không giảm thưởng; báo thiếu hoặc thối dư chỉ mất tiền, không mất sao |
| Người chơi "làm ẩu vẫn có tiền" vì khách đã trả trước | Vừa | Chất lượng tác động qua tip, danh tiếng, sao trung bình (quyết định lượng khách), làm lại và hoàn tiền. Mô phỏng phải cho thấy người chơi 4,7 sao lãi hơn người chơi 3,8 sao ít nhất 25% |
| Gian lận có lời (thu dư, thối thiếu) | Thấp | Luật bất đối xứng: báo dư luôn bị phát hiện; thối thiếu bị review muộn |
| Game biến thành bài giảng | Vừa | Mẹo nghề tối đa 2 câu, không dừng game, tối đa 1 thẻ mỗi ca, tắt được. Nội dung đào tạo bài bản chỉ nằm ở Chế độ Học việc tùy chọn |
| Cử chỉ bị trình duyệt nuốt (cuộn trang, zoom, vuốt quay lại, nhấn giữ lâu); độ trễ cảm ứng | Cao | `touch-action:none` trên sân khấu; `pointercancel` xử lý như thả tay; tránh mép màn hình 16–20px; đo bằng `performance.now()`; không chấm theo âm thanh; thử trên Android giá rẻ và iOS |
| Chuột khó vẽ vòng hoặc chà | Thấp | Khi `pointerType` là chuột thì ngưỡng CHA/KHUAY giảm 15%; có phím tắt |
| iOS tự xóa dữ liệu sau 7 ngày; trình duyệt trong Zalo/Facebook mất localStorage | Cao | `storage.persist()`; nhắc thêm vào màn hình chính từ ngày 2; mã sao lưu và nhắc mỗi 7 ngày; gợi ý mở bằng Chrome hoặc Safari |
| Sửa save, chỉnh đồng hồ máy | Vừa | Checksum, `sanitize`, sổ cái; khóa khi lùi giờ, không phạt; không có thưởng giá trị thật trước khi có máy chủ ở GĐ3 |
| Service worker giữ bản cũ; precache thiếu module | Vừa | Test kiểm tra VERSION và PRECACHE; no-cache cho `sw.js`; chỉ báo cập nhật ở điểm an toàn |
| Lạm phát phần thưởng; món mới mạnh hơn làm món cũ mất giá | Vừa | Thưởng khai báo theo TNC, trần 35%; quy tắc món ngang giá trị 10%; luôn có nơi tiêu MV |
| FOMO với món sự kiện | Vừa | Món chính miễn phí qua chuỗi; giữ vĩnh viễn; phục khắc năm sau; Tem dư đổi được; không gacha |
| Phạm vi MVP phình to | Cao | Bám đúng danh sách MVP, đường cắt và các mục "không bao giờ cắt" |
| Pháp lý và bản quyền | Cao | Chỉ học *cơ chế* của Cooking Mama và 5 game tham khảo; không dùng tên, nhân vật, hình, câu thoại, code của họ (các bản trên miku.us.kg là bản mod trái phép). **Không dùng tên hay giao diện iPOS/FABi**, ngân hàng, ví điện tử, app giao hàng; chỉ gọi chung là "máy POS", "QR chuyển khoản", app hư cấu. Nếu dùng game để đào tạo chính thức ở công ty thì xin phép trước. Tờ tiền chỉ là hình cách điệu có chữ "TIỀN GAME". Không bán vật phẩm ngẫu nhiên bằng tiền thật. Trước khi thu tiền hoặc gắn quảng cáo, tìm hiểu quy định về trò chơi điện tử và dữ liệu cá nhân |
| Sai nội dung chuyên môn hoặc ngày âm lịch | Vừa | Dùng bảng âm lịch tra sẵn 2026–2030 và kiểm chéo; nhờ bếp trưởng hoặc kế toán duyệt thẻ Mẹo nghề; VAT và phí ghi rõ là "mô phỏng" |
| Chính tả, định kiến vùng miền, nội dung nhạy cảm | Vừa | Gom chuỗi vào `data/`; soát bằng ảnh chụp; nhờ người bản xứ từng vùng đọc duyệt; dị ứng và lừa đảo chỉ dạy cách phòng tránh, giọng văn nhẹ; không có đồ uống có cồn ở MVP |
| Dùng game để xếp loại nhân sự | Thấp | Ghi rõ game chỉ để bổ trợ và ôn luyện |

---

### Critical Files for Implementation

Toàn bộ là file sẽ được tạo mới, vì repo hiện đang trống:
- `/home/user/gamefnb/src/core/customer.js`: máy trạng thái khách, 3 lớp yêu cầu – phiếu – món, kiên nhẫn P1 và ngân sách chờ món.
- `/home/user/gamefnb/src/core/money.js`: tiền tính bằng số nguyên đồng, `changeDue`, thối tối ưu theo tham lam, `customerCash`, kiểm tra còn thối được không, định dạng "37.000đ"/"37k".
- `/home/user/gamefnb/src/data/recipes.js`: 3 công thức MVP chạy bằng dữ liệu (nguyên liệu, bẫy, ghi chú, các bước, par, w, chí mạng).
- `/home/user/gamefnb/src/ui/minigames/index.js`: registry 6 cơ chế. Đi kèm `/home/user/gamefnb/src/core/minigame-scoring.js` chứa hàm chấm thuần.
- `/home/user/gamefnb/src/core/save.js`: lưu BKN1 có migrate, sanitize, bản dự phòng, ca đang dở và mã sao lưu. Đi kèm `/home/user/gamefnb/src/core/clock.js` (mốc 04:00 giờ Việt Nam, giờ máy chủ, khóa khi lùi giờ).

Bản đề xuất này nên được lưu nguyên văn vào `/home/user/gamefnb/docs/de-xuat-thiet-ke.md` ở bước cuối.