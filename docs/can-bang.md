# Bảng cân bằng Chặng 1 (MVP)

Phiên bản 0.2 · ngày 29/09/2026

> **Đây là số liệu ban đầu**, dựng bằng tính tay và một mô hình đơn giản cho người chơi trung bình (khoảng 4,2 sao). Mọi con số **phải chỉnh lại sau khi đo thực tế** trên điện thoại thật (mục 15). Khi đổi số, ghi vào Nhật ký chỉnh sửa (mục 16) và cập nhật `src/data/balance.js`, `src/data/recipes.js`, `src/data/ingredients.js`, `src/data/upgrades.js`.

- Luật chơi đầy đủ: `docs/de-xuat-thiet-ke.md`. Tên hằng số và chữ ký hàm: `docs/kien-truc.md`.
- Tiền ghi bằng đồng; "k" = nghìn đồng. "Ngày" không ghi rõ là **ngày game** (1 ngày game = 1 ca ở Chặng 1). "Ngày thật" là ngày theo lịch, đổi lúc 04:00 giờ Việt Nam.
- TNC (Thu nhập chuẩn một ca) và par (thời gian chuẩn một bước) là từ nội bộ, không hiện cho người chơi.

---

## 1. Hằng số chung (khớp `BALANCE` trong `docs/kien-truc.md`)

| Hằng số | Giá trị | Ý nghĩa |
|---|---|---|
| `startWallet` | 200.000đ | Tiền quán lúc bắt đầu |
| Quỹ tiền lẻ (`makeFloat`) | 200.000đ = 8×5k + 5×10k + 3×20k + 1×50k | Nằm trong két, tách khỏi ví, tái lập mỗi ca |
| `fixedCostPerShift` | 20.000đ | Chi phí cố định mỗi ca |
| `queueMax` / `ticketRailMax` | 3 / 3 | Hàng chờ tối đa; dây phiếu tối đa |
| `queuePatienceBase` / `queuePatienceFloor` | 45 giây / 32 giây | Kiên nhẫn xếp hàng gốc và sàn |
| `counterDrainMul` | 0,5 | Tốc độ mất kiên nhẫn khi đang ở quầy |
| `waitBudgetBase` / `waitBudgetParMul` | 30 giây / 2 | Ngân sách chờ món B = 30 + 2 × tổng par |
| `arrivalLoad` / `peakMul` / `counterTimeEstimate` | 1,15 / 0,9 / 20 giây | Nhịp khách |
| `qrFromDay` / `fakeQrFromDay` / `fakeQrRate` | 4 / 7 / 4% | QR và ảnh chuyển khoản giả |
| `leaveFromDay` | 4 | Từ ngày này khách xếp hàng mới bỏ về |
| `readbackCatchRate` / `readbackPatienceCost` | 80% / 8% | Đọc lại đơn |
| `zoneMulStage` / `zoneDailyNarrow` / `zoneFloor` / `zoneMulCap` | 1,2 / 2% / 0,75 / 1,6 | Hệ số vùng mục tiêu |
| `tipFiveStar` / `tipBonus` | 5.000đ / 10.000đ | Tip vào hũ |
| `masteryLevels` | 0 / 5 / 15 | Số lần đạt Ngon trở lên để lên cấp 1 / 2 / 3 |
| `autoStepScore` / `retryScoreCap` | 80 / 85 | "Tự làm"; trần điểm khi làm lại |
| `loanAmount` / `loanRepayRate` / `loanInterest` | 240.000đ / 25% / 10% | Dì Sáu cho mượn |

---

## 2. Món: giá bán, giá vốn, lãi

Số liệu khớp `src/data/recipes.js` và `src/data/ingredients.js` tại thời điểm viết. Nếu code đổi, sửa bảng này theo code.

### 2.1 Năm món MVP

| Món | Nguồn | Mốc | Giá bán | Giá vốn | Lãi/phần | FC | Tổng par (giây) | Σw | Lãi/giây nấu | Thời gian phục vụ 1 phần (20 + par) | Lãi/giây phục vụ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Bánh mì ốp la | Có sẵn | M1 | 20.000đ | 9.000đ | 11.000đ | 45% | 22 | 9 | 500đ | 42 giây | 262đ |
| Trà tắc | Có sẵn | M1 | 10.000đ | 3.000đ | 7.000đ | 30% | 18 | 9 | 389đ | 38 giây | 184đ |
| Bánh tráng trộn | Shop 250.000đ, từ ngày 2 | M2 | 20.000đ | 8.000đ | 12.000đ | 40% | 31 | 11 | 387đ | 51 giây | 235đ |
| Cà phê sữa đá | Shop 200.000đ, từ ngày 4 | M2 | 15.000đ | 5.000đ | 10.000đ | 33% | 20 | 10 | 500đ | 40 giây | 250đ |
| Chè bưởi | Sự kiện Tri ân 20/11 | M2 | 15.000đ | 5.000đ | 10.000đ | 33% | 27 | 11 | 370đ | 47 giây | 213đ |

Kiểm tra quy tắc "món ngang giá trị" (món Muỗng Vàng / sự kiện không vượt món Tiền quán tốt nhất quá 10% lãi/giây nấu):
- Món Tiền quán tốt nhất: Bánh mì ốp la và Cà phê sữa đá, cùng 500đ/giây → trần 550đ/giây.
- Chè bưởi 370đ/giây: **đạt**.
- Nếu áp dụng đề xuất cho Cà phê sữa đá mua được bằng 60 Muỗng Vàng: món này ở đúng mức 500đ/giây, không vượt trần.
- **Cần theo dõi**: Bánh tráng trộn là món Shop đầu tiên nhưng lãi/giây thấp hơn Bánh mì (387đ so với 500đ) và dài nhất (31 giây). Người chơi mua vì cần đủ 3 công thức, nhưng có thể thấy "mua món mới làm ca chậm đi". Phương án nếu đo thấy khó chịu: bỏ bước Rưới dầu hành phi (còn 29 giây, 414đ/giây) hoặc tăng giá lên 25.000đ.
- Trà tắc lãi/giây thấp nhất nhưng rẻ và nhanh; theo dõi xem người chơi có ngại nấu không.

Phụ thu: Bánh mì "Thêm trứng" +5.000đ giá bán (+2.500đ vốn). Bánh tráng trộn "Thêm trứng cút" +5.000đ giá bán (+800đ vốn cho 2 trứng cút).

### 2.2 Giá nguyên liệu (theo `src/data/ingredients.js`)

| Món | Chính | Phụ | Tùy chọn | Tổng giá vốn | Bẫy |
|---|---|---|---|---|---|
| Bánh mì ốp la | bánh mì 3.000; trứng gà 2.500 × 2 | dưa leo 500; hành lá 250; nước tương 250 | tương ớt 250 | **9.000đ** | trứng vịt 3.000; hành tây 500; nước mắm 250 |
| Trà tắc | trà 800; tắc 400 × 3; đường 300; ly 300 | đá 400 | — | **3.000đ** | chanh 500; muối 100; sữa đặc 1.500 |
| Bánh tráng trộn | bánh tráng 1.500; xoài xanh 2.000; trứng cút 400 × 3; khô bò 1.600 | rau răm 200; hành phi 300; đậu phộng 300; sa tế 500; tắc 400 | — | **8.000đ** | rau húng lủi 200; bánh tráng mè 2.000; trứng gà 2.500 |
| Cà phê sữa đá | cà phê phin 2.800; sữa đặc 1.500; ly 300 | đá 400 | — | **5.000đ** | sữa tươi 1.500; cà phê hòa tan 1.500; đường phèn 500 |
| Chè bưởi | cùi bưởi 1.400; bột năng 500; nước cốt dừa 1.200; ly 300 | đậu xanh 800; đường 300; muối 100; đá 400 | — | **5.000đ** | bột mì 400; sữa đặc 1.500; dừa nạo 1.000 |

Nguyên liệu dùng chung có cùng giá ở mọi món (tắc 400, đá 400, ly 300, sữa đặc 1.500, đường 300, muối 100, trứng gà 2.500).

**Chi phí làm lại (`retryCost`)**: Chiên trứng 6.000đ (2 trứng và dầu); Luộc chè 3.000đ. Các bước khác chưa khai báo (0đ); nếu cần, đặt bằng giá nguyên liệu bước đó xử lý.

> Ghi chú: ví dụ trong `docs/kien-truc.md` ghi trứng gà 3.000đ; code đang dùng 2.500đ để giá vốn Bánh mì ốp la khớp đúng 9.000đ. Bảng này theo code.

---

## 3. Khách mỗi ca theo ngày

### 3.1 Số khách và độ phức tạp đơn

| Ngày | N gốc = min(8, 4 + ⌊(ngày − 1)/2⌋) | Dòng mỗi khách | Số lượng mỗi dòng | Đơn có ghi chú | Món kỳ vọng mỗi khách | Mở thêm |
|---|---|---|---|---|---|---|
| 1 | 4 | 1 | 1 | 0% | 1,00 | 2 khách đầu là cô Thu, bạn Nam (hướng dẫn, không trừ sao) |
| 2 | 4 | 1 | 1 | 0% | 1,00 | Shop: Bánh tráng trộn; Dao thép tốt |
| 3 | 5 | 1 | 1 | 20% | 1,00 | Chảo chống dính, Ghế nhựa chờ; sự kiện ngày; khách quen quay lại |
| 4 | 5 | 1 (75%) / 2 (25%) | 1 | 20% | 1,25 | QR; dân văn phòng; khách bỏ về; Shop: Cà phê sữa đá |
| 5 | 6 | 1 (75%) / 2 (25%) | 1 (85%) / 2 (15%) | 35% | 1,44 | Khách khó tính; Loa báo tiền |
| 6 | 6 | như ngày 5 | như ngày 5 | 35% | 1,44 | Phụ thu |
| 7 | 7 | 1 (70%) / 2 (25%) / 3 (5%) | 1 (85%) / 2 (15%) | 35% | 1,55 | Ảnh chuyển khoản giả 4%; Máy tính cầm tay |
| 8 | 7 | như ngày 7 | như ngày 7 | 35% | 1,55 | |
| 9 trở đi | 8 | như ngày 7 | như ngày 7 | 35% | 1,55 | |

**Điều chỉnh theo sao trung bình**: Δ = làm_tròn(N gốc × (hệ số − 1)), kẹp trong [−1; +1]; N = kẹp(N gốc + Δ, 3, 8). Hệ số: ≥4,5 sao ×1,15; 4,0–4,49 ×1,0; 3,5–3,99 ×0,85; dưới 3,5 ×0,7. Ví dụ ngày 1 (N gốc 4) với 4,6 sao → 5 khách; với 3,6 sao → 3 khách. Ngày 9 với 4,6 sao vẫn là 8 (trần).

Sự kiện ngày: Trời mưa khách ×0,8 (làm tròn, sàn 3; căng bạt còn ×0,95); Nắng nóng +1 khách (trong trần 8).

### 3.2 Kiểu khách

| Kiểu | Trọng số | Kiên nhẫn | Cách đưa tiền mặt | Tỉ lệ trả QR (từ ngày 4) | Có từ |
|---|---|---|---|---|---|
| Học sinh, sinh viên | 30 | ×1,0 | Tờ nhỏ (20k/50k) | 30% | 1 |
| Công nhân, shipper | 20 | ×0,6 | Vừa đủ hoặc tờ nhỏ | 10% | 1 |
| Cô chú lớn tuổi | 20 | ×1,3 | Hay đưa 200k/500k | 5% | 1 |
| Dân văn phòng | 20 | ×0,8 | Tờ vừa | 70% | 4 |
| Khách khó tính | 10 | ×0,85 | Tờ vừa | 30% | 5 |

- Trước khi một kiểu mở, trọng số của nó chia đều theo tỉ lệ cho các kiểu khác.
- **Tỉ lệ QR thực tế** theo bảng trên: ngày 4 khoảng 29%, từ ngày 5 khoảng 29%.
- **Cần thống nhất với code**: `BALANCE.qrRate = 0.25` là tỉ lệ chung, trong khi `PERSONAS` có tỉ lệ theo kiểu khách. Đề xuất dùng tỉ lệ theo kiểu khách và coi 0,25 là mục tiêu kiểm tra (khoảng 25–30%).

---

## 4. Nhịp khách và thời lượng ca

Thời gian phục vụ kỳ vọng = 20 giây (quầy) + dòng kỳ vọng × hệ số số lượng × par trung bình của thực đơn. Par trung bình: 20 giây khi chỉ có 2 món có sẵn; khoảng 22,9 giây khi có thêm Bánh tráng trộn (tỉ lệ gọi Bánh mì 40% / Trà tắc 35% / Bánh tráng trộn 25%). Hệ số số lượng của par: 1 + 0,4 × (n − 1), kỳ vọng 1,06 từ ngày 5.

| Ngày | Phục vụ kỳ vọng (giây) | Khoảng cách khách (× 1,15) | Khoảng cách cao điểm (× 0,9) | Hệ số tải ρ trung bình | Thời lượng ca ước tính |
|---|---|---|---|---|---|
| 1–2 | 40,0 | 46,0 | 41,4 | 0,87 | khoảng 3 phút (ngày 1 có hướng dẫn: 4–5 phút) |
| 3 | 40,0 | 46,0 | 41,4 | 0,87 | khoảng 4 phút |
| 4 | 45,0 | 51,7 | 46,6 | 0,87 | khoảng 4,5 phút |
| 5–6 | 50,3 | 57,8 | 52,0 | 0,87 | khoảng 5,5–6 phút |
| 7–8 | 52,7 | 60,6 | 54,5 | 0,87 | khoảng 7 phút |
| 9 trở đi | 52,7 | 60,6 | 54,5 | 0,87 | **khoảng 8 phút** |

- Khoảng cách thật = khoảng cách trên × ngẫu nhiên [0,85; 1,15].
- ρ trung bình luôn = 1 / 1,15 ≈ 0,87 (≤ 0,9, có unit test). Trong đoạn cao điểm ρ ≈ 0,97: hàng chờ sẽ dài ra một chút, đó là chủ ý.
- **Cảnh báo**: từ ngày 9, ca ước tính khoảng 8 phút, vượt mục tiêu 7 phút. Nếu đo thật thấy dài, ưu tiên hạ trần khách từ 8 xuống 7 hoặc bỏ bước Rưới dầu hành phi của Bánh tráng trộn (không hạ `arrivalLoad`, vì sẽ làm ρ vượt 0,9).

Đơn mẫu: 1 Bánh mì ốp la → phục vụ 42 giây, khoảng cách 48,3 giây. 1 Trà tắc → 38 giây, 43,7 giây. 1 Bánh tráng trộn → 51 giây, 58,6 giây. 1 Cà phê sữa đá → 40 giây, 46 giây.

---

## 5. Kiên nhẫn xếp hàng (P1)

P1 = max(32, 45 − max(0, ngày − 3)) × hệ số kiểu khách × (1,2 nếu có Ghế nhựa chờ). Sàn áp **trước** khi nhân hệ số kiểu khách (cần xác nhận cách code làm).

| Ngày | P1 gốc | Học sinh ×1,0 | Công nhân ×0,6 | Cô chú ×1,3 | Văn phòng ×0,8 | Khó tính ×0,85 |
|---|---|---|---|---|---|---|
| 1–3 | 45 | 45 | 27 | 58,5 | — | — |
| 4 | 44 | 44 | 26,4 | 57,2 | 35,2 | — |
| 7 | 41 | 41 | 24,6 | 53,3 | 32,8 | 34,9 |
| 10 | 38 | 38 | 22,8 | 49,4 | 30,4 | 32,3 |
| 15 | 33 | 33 | 19,8 | 42,9 | 26,4 | 28,1 |
| 16 trở đi | 32 | 32 | 19,2 | 41,6 | 25,6 | 27,2 |

- Ngày 1–3 khách không bỏ về (chỉ bị trừ sao nếu đã dùng quá 60% / 85% kiên nhẫn trước khi chốt order).
- Khi đang ở quầy, kiên nhẫn giảm với tốc độ ×0,5. Mỗi lỗi bị khách bắt khi đọc lại: −8% kiên nhẫn.
- **Cần theo dõi**: công nhân chỉ còn khoảng 20–26 giây, ngắn hơn một lượt nấu. Nếu tỉ lệ bỏ về của công nhân vượt 15%, nâng hệ số lên ×0,7.

---

## 6. Ngân sách chờ món

B = 30 + 2 × tổng par của phiếu (par đã nhân theo số lượng). Tính từ lúc kẹp phiếu. Phạt: vượt 75% B −0,5 sao; vượt 100% −1 sao; vượt 150% −2 sao (chỉ mức cao nhất).

| Phiếu | Tổng par | B | Mốc 75% | Mốc 100% | Mốc 150% |
|---|---|---|---|---|---|
| 1 Bánh mì ốp la | 22 | 74 | 55,5 | 74 | 111 |
| 1 Trà tắc | 18 | 66 | 49,5 | 66 | 99 |
| 1 Bánh tráng trộn | 31 | 92 | 69 | 92 | 138 |
| 1 Cà phê sữa đá | 20 | 70 | 52,5 | 70 | 105 |
| 1 Chè bưởi | 27 | 84 | 63 | 84 | 126 |
| 2 Bánh mì ốp la (1 dòng) | 22 × 1,4 = 30,8 | 91,6 | 68,7 | 91,6 | 137,4 |
| 1 Bánh mì + 1 Trà tắc | 40 | 110 | 82,5 | 110 | 165 |

Nhớ rằng thời gian chờ gồm cả lúc phiếu nằm trên dây chờ bếp rảnh.

---

## 7. Chấm điểm, tip, danh tiếng

| Hạng mục | Giá trị |
|---|---|
| Nhãn bước | Hoàn hảo ≥90 · Tốt ≥70 · Đạt ≥50 · Hỏng <50 |
| Hạng món → sao gốc | Tuyệt hảo ≥90 → 5 · Ngon ≥75 → 4 · Được ≥60 → 3 · Kém ≥40 → 2 · Hỏng <40 → 1 |
| Trần nguyên liệu | Trái ghi chú: Q ≤ 60 và sao ≤ 2 · Bẫy: Q ≤ 60 · Thiếu phụ: −10 · Thừa: −8 (mỗi nguyên liệu 1 dòng) |
| Chọn sai cách sơ chế | −15 điểm bước |
| Bước chưa làm khi Ra món | 0 điểm |
| Bước Chọn | 100 − 15 × lần chạm nhầm; quá 2,5 × par −15 |
| Canh lửa (d = khoảng cách tới tâm / nửa bề rộng vùng) | d ≤ 0,25: 100 · tới d = 1: 80 · tới d = 2: 40 · tới d = 3: 10 · xa hơn: 10 · vượt 1,0: 0 |
| Thái (px) | ≤6: 100 · ≤14: 80 · ≤24: 55 · còn lại 20 (ngưỡng × hệ số vùng); nhát thừa −10 |
| Rót | Lệch ≤4%: 100 · ≤9%: 80 · ≤15%: 55 · tràn >1,02: 0; tốc độ tại vạch ≤25%/giây |
| Phạt quầy | Sai món −2 · sai/thiếu ghi chú −1 (tối đa −2) · thiếu số lượng −1 · báo tổng dư −1,5 · thối thiếu bị phát hiện −1 · dùng quá 60%/85% kiên nhẫn trước khi chốt order −0,5/−1 · khó tính có lỗi −1 thêm |
| Làm tròn sao | Xuống; kẹp 1–5 |
| Tip (chỉ khi 5 sao) | 5.000đ; 10.000đ nếu có món Không tì vết hoặc khách khó tính; (M2) 10.000đ khi đang trong chuỗi "Quầy chuẩn" |
| Danh tiếng mỗi khách | 5 sao +3 · 4 sao +2 · 3 sao +1 · ≤2 sao 0 · Không tì vết +1 · trả lại tiền thối dư +1 · khách quen "như mọi khi" đúng +1 |
| Thối thiếu / dư | Thiếu: 90% bị phát hiện · Dư: 50% khách trả lại |

> **Cần thống nhất với code**: hàm `tipFor(stars, flawlessAny, persona)` chưa có tham số chuỗi "Quầy chuẩn". Khi làm M2, thêm tham số (ví dụ `counterStreak`) và cập nhật `docs/kien-truc.md`.

**Phân bố sao giả định cho người chơi trung bình (4,2 sao)**: 5 sao 40% · 4 sao 45% · 3 sao 10% · 2 sao 5%. Tip trung bình khoảng 5.500đ mỗi khách 5 sao, tức khoảng 2.200đ mỗi khách phục vụ. Danh tiếng trung bình khoảng 2,2 mỗi khách.

---

## 8. Hệ số vùng mục tiêu

Hệ số = 1,2 × max(0,75; 1 − 0,02 × (ngày − 1)) × dụng cụ × thạo món × Hỗ trợ thao tác, **trần 1,6**.

| Ngày | Hệ số theo ngày | + Dao (THAI ×1,2) | + Dao + thạo cấp 3 (×1,1) | + Dao + cấp 3 + Hỗ trợ (×1,25) |
|---|---|---|---|---|
| 1 | 1,200 | 1,440 | 1,584 | 1,98 → **1,6** |
| 5 | 1,104 | 1,325 | 1,457 | 1,82 → **1,6** |
| 10 | 0,984 | 1,181 | 1,299 | 1,624 → **1,6** |
| 14 trở đi (chạm sàn) | 0,900 | 1,080 | 1,188 | 1,485 |

Chảo chống dính: LUA ×1,15. Thạo cấp 2: ×1,05.

---

## 9. Lãi bán hàng dự kiến theo ca và TNC

Giả định: 4,2 sao; hao hụt + thu thiếu + thối dư = 4% doanh thu; từ ngày 4 có 5% khách bỏ về; trước khi mua món: Bánh mì 50% / Trà tắc 50% (giá TB 15.000đ, lãi TB 9.000đ); mua Bánh tráng trộn từ ca 5: 40% / 35% / 25% (giá TB 16.500đ, lãi TB 9.850đ).

| Ngày (ca) | Khách | Khách phục vụ | Món | Doanh thu | Lãi gộp | Tip | Hao hụt | Chi phí cố định | **Lãi ca** | **TNC dùng để tính thưởng** |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 4 | 4,0 | 4,0 | 60k | 36,0k | 8,8k | 2,4k | 20k | **22k** | 20k |
| 2 | 4 | 4,0 | 4,0 | 60k | 36,0k | 8,8k | 2,4k | 20k | **22k** | 20k |
| 3 | 5 | 5,0 | 5,0 | 75k | 45,0k | 11,0k | 3,0k | 20k | **33k** | 35k |
| 4 | 5 | 4,75 | 5,9 | 89k | 53,4k | 10,4k | 3,6k | 20k | **40k** | 35k |
| 5 | 6 | 5,7 | 8,2 | 135k | 80,7k | 12,5k | 5,4k | 20k | **68k** | 65k |
| 6 | 6 | 5,7 | 8,2 | 135k | 80,7k | 12,5k | 5,4k | 20k | **68k** | 65k |
| 7 | 7 | 6,65 | 10,3 | 170k | 101,7k | 14,6k | 6,8k | 20k | **90k** | 85k |
| 8 | 7 | 6,65 | 10,3 | 170k | 101,7k | 14,6k | 6,8k | 20k | **90k** | 85k |
| 9–15 | 8 | 7,6 | 11,8 | 195k | 116,2k | 16,7k | 7,8k | 20k | **105k** | 100k |

- Tổng lãi bán hàng ca 1–15: khoảng **1,17tr**; trung bình khoảng 78k mỗi ca (khớp TNC trung bình Chặng 1 khoảng 80k).
- Theo ngày thật (3 ca ngày 1, 4 ca mỗi ngày 2–4): ngày thật 1 khoảng 78k; ngày 2 khoảng 265k; ngày 3 khoảng 405k; ngày 4 khoảng 421k.
- Tiêu chí: người 4,7 sao lãi hơn người 3,8 sao ít nhất 25% (chưa tính hệ số khách). Cần mô phỏng hoặc đo để xác nhận.

---

## 10. Thưởng ngoài bán hàng (Chặng 1, ngày thật 1–4)

### 10.1 Chi tiết từng nguồn

| Nguồn | Luật | Ngày thật 1 | Ngày thật 2 | Ngày thật 3 | Ngày thật 4 |
|---|---|---|---|---|---|
| Nhiệm vụ (3 × 0,2 TNC) + Rương ngày (0,2 TNC + 5 Muỗng Vàng) | 0,8 TNC của ngày game lúc nhận | 20k (TNC khoảng 25k) | 52k (khoảng 65k) | 80k (100k) | 80k (100k) |
| Chuỗi "Ngày đầu ra phố" | Bước 2: 5k · 3: 5k · 4: 15k · 5: 30k · 6: 30k | 10k (bước 2, 3) | 45k (bước 4, 5) | 30k (bước 6) | 0 (bước 7 thưởng Muỗng Vàng) |
| Chuỗi "Làm quen QR" | Chỉ Muỗng Vàng | 0 | 0 | 0 | 0 |
| Điểm danh Tuần Khai Trương (quy đổi) | Ô1 Muỗng Vàng + thẩm mỹ · Ô2 Phiếu Chợ Sớm · Ô3 Muỗng Vàng · Ô4 Bạt che mưa | 0 | khoảng 7k | 0 | khoảng 20k (danh nghĩa) |
| Hộp thư (quy đổi, kỳ vọng) | Thư chào mừng: Phiếu Chợ Sớm; quà đời thường 10%/ngày × 0,3–0,6 TNC từ ngày thật 3 | khoảng 5k | 0 | khoảng 4,5k | khoảng 4,5k |
| **Tổng thưởng** | | **35k** | **104k** | **114,5k** | **104,5k** |
| Lãi bán hàng | mục 9 | 78k | 265k | 405k | 421k |
| **Tỉ lệ thưởng / (lãi + thưởng)** | Mục tiêu 20–30%, trần 35% | **31%** | **28%** | **22%** | **20%** |

- Cả Chặng 1: thưởng 358k / (1.169k + 358k) = **23,4%**.
- Trong đó tiền mặt thật vào ví (không tính hiện vật): khoảng 326k.
- Quy đổi hiện vật: Phiếu Chợ Sớm = 20% giá vốn một ca (khoảng 5–7k lúc nhận); Bạt che mưa = 20.000đ (một lần căng bạt).
- Không tính quà lễ (phụ thuộc lịch): 20/10 là 20 Muỗng Vàng; 20/11 là 20 Muỗng Vàng + 0,5 TNC (50k).
- Rương Khai Trương (Ô7: 100.000đ + 20 Muỗng Vàng) rơi vào ngày thật 7, khi người chơi thường đã ở giai đoạn Chặng 2 (TNC 160k), tỉ lệ ngày đó khoảng 100 / (160 × 3,5 + 100) ≈ 15% nếu chỉ tính Ô7.

### 10.2 Muỗng Vàng Chặng 1

| Nguồn | Ngày thật 1 | Ngày thật 2 | Ngày thật 3 | Ngày thật 4 |
|---|---|---|---|---|
| Thư chào mừng | 10 | | | |
| Điểm danh | 10 (Ô1) | 0 | 10 (Ô3) | 0 |
| Rương ngày | 5 | 5 | 5 | 5 |
| Chuỗi "Ngày đầu ra phố" | 5 (bước 1) | | 5 (bước 6) | 20 (hoàn thành) |
| Chuỗi "Làm quen QR" | | 5 (bước 1) | 5 (bước 2) | |
| **Cộng** | **30** | **10** | **25** | **25** |

- Tổng khoảng **90 Muỗng Vàng**. Chỗ tiêu ở MVP: đổi nhiệm vụ (5/lần) và, nếu áp dụng đề xuất, Cà phê sữa đá (60).
- Phần còn lại để dành cho Kệ Đặc biệt ở GĐ2. Nếu đo thấy tồn quá nhiều, giảm Muỗng Vàng ở thư chào mừng hoặc Ô3.

---

## 11. Dòng tiền ví Tiền quán (một đường chơi mẫu)

| Ngày thật | Đầu ngày | + Lãi bán hàng | + Thưởng tiền | Mua | Cuối ngày |
|---|---|---|---|---|---|
| 1 | 200k | 78k | 30k | Dao thép tốt 150k | 158k |
| 2 | 158k | 265k | 97k | Bánh tráng trộn 250k; Chảo chống dính 200k | 70k |
| 3 | 70k | 405k | 114,5k | Loa báo tiền 150k; Cà phê sữa đá bằng 60 Muỗng Vàng (đề xuất) | 439,5k |
| 4 | 439,5k | 421k | 84,5k | Ghế nhựa chờ 180k; Máy tính cầm tay 150k | **615k** (≥ 500k) |

- Người chơi tiết kiệm (chỉ mua 1 món Shop và Dao) có đủ 500.000đ ngay từ ngày thật 3.
- Nếu không áp dụng đề xuất trả bằng Muỗng Vàng (Cà phê sữa đá trả 200k): cuối ngày thật 4 còn khoảng 415k; muốn đủ 500k thì hoãn Ghế nhựa chờ hoặc Máy tính cầm tay sang sau.
- Đường chơi mẫu không cần vay Dì Sáu. Vay chỉ xảy ra khi thua lỗ liên tiếp (ví dụ thối dư nhiều, bỏ món nhiều).

---

## 12. Giá Shop, nâng cấp, khoản vay

| Hạng mục | Giá | Mở từ ngày game | Tương đương (lãi ca lúc mở) |
|---|---|---|---|
| Bánh tráng trộn | 250.000đ | 2 | khoảng 11 ca lúc ngày 2, khoảng 3–4 ca lúc ngày 5 |
| Cà phê sữa đá | 200.000đ (đề xuất: hoặc 60 Muỗng Vàng) | 4 | khoảng 5 ca lúc ngày 4, khoảng 3 ca lúc ngày 5 |
| Dao thép tốt | 150.000đ | 2 | Vùng THAI ×1,2 |
| Chảo chống dính | 200.000đ | 3 | Vùng LUA ×1,15, cháy chậm hơn 20% |
| Ghế nhựa chờ | 180.000đ | 3 | Kiên nhẫn xếp hàng ×1,2 |
| Loa báo tiền | 150.000đ | 5 | Tự xác nhận QR, chặn ảnh giả |
| Máy tính cầm tay | 150.000đ | 7 | Tự cộng tổng, không hiện tiền thối |
| Dì Sáu cho mượn | 240.000đ, trả 264.000đ | Khi Tiền quán < 20.000đ | Trừ 25% lãi mỗi ca có lãi; 1 khoản mỗi lần; đang nợ không lên chặng |
| Lên Chặng 2 (khóa ở MVP) | 500.000đ | Khi đủ điều kiện | khoảng 5 ca lãi cuối Chặng 1 |

Tổng chi nếu mua hết ở Chặng 1: 2 món 450k + 5 nâng cấp 830k = 1,28tr (chưa tính 500k lên chặng).

---

## 13. Điều kiện lên Chặng 2 và thời điểm đạt dự kiến

| Điều kiện | Ước tính người chơi trung bình đạt vào |
|---|---|
| 150 danh tiếng | Khoảng ca 9–10 (ngày thật 3): khách khoảng 2,2 danh tiếng mỗi người + nhiệm vụ 15/ngày thật |
| Sao trung bình ≥ 3,8 | Từ đầu (người chơi 4,2 sao) |
| 3 công thức | Khi mua món Shop đầu tiên, khoảng ca 4–5 |
| 2 món thạo cấp 2 (5 lần Ngon trở lên) | Bánh mì và Trà tắc, khoảng ca 3–5 |
| Xong chuỗi "Ngày đầu ra phố" | Bước 7 xong cùng lúc đủ 150 danh tiếng, khoảng ca 10 |
| 500.000đ | Ngày thật 3 (tiết kiệm) đến cuối ngày thật 4 (mua hết nâng cấp) |
| **Đủ tất cả** | **Khoảng ca 10–15, ngày thật 3–4** (mục tiêu thiết kế: ca 1–15, ngày thật 1–4) |

Nếu đo thấy người chơi trung bình đủ điều kiện trước ca 8 thì tăng ngưỡng danh tiếng lên 200; nếu sau ca 20 thì giảm xuống 120 hoặc tăng danh tiếng từ nhiệm vụ.

---

## 14. Sự kiện Tri ân 20/11 (MVP, M2)

| Hạng mục | Giá trị |
|---|---|
| Thời gian | 12–21/11/2026; thẻ "Sắp diễn ra" từ 09/11 |
| Chuỗi | 3 bước, tối đa 1 bước mỗi ngày thật; gộp bước nếu còn ít ngày |
| Thưởng chuỗi | Bước 1: 10 Muỗng Vàng · Bước 2: +10 danh tiếng · Bước 3: công thức Chè bưởi |
| Trong mùa | Chè bưởi được gọi ×2; mỗi phần Ngon trở lên +1 danh tiếng; giá không đổi (15.000đ) |
| Quà lễ 20/11 | 20 Muỗng Vàng + 0,5 TNC |
| Kiểm tra | Chè bưởi 370đ/giây ≤ 550đ/giây (trần); tỉ lệ thưởng ngày có quà lễ vẫn ≤ 35% |

---

## 15. Chỉ số cần đo khi thử nghiệm

**Cách đo ở MVP**: lịch sử tổng kết 60 ca và bộ đếm `stats` trong save; thời gian từng khâu và số lần chạm đo bằng quay màn hình hoặc bấm giờ tay cho tới khi có Sổ số liệu (GĐ2). Thử trên ít nhất 1 máy Android giá rẻ và 1 iPhone, với 3 nhóm người: người chơi game thường, nhân viên F&B mới, người đào tạo.

| # | Chỉ số | Mục tiêu ban đầu | Nếu lệch thì chỉnh |
|---|---|---|---|
| 1 | Thời lượng ca theo ngày | 3–8 phút; ngày 1 ≤ 7 phút | Dài: hạ trần khách 8 → 7, hoặc bớt 1 bước ở món dài nhất |
| 2 | Thời gian từng khâu mỗi khách (Order, Thanh toán, Tính tiền, Làm đồ mỗi phần) | Theo mục 2.3 của `de-xuat-thiet-ke.md` | Sửa `counterTimeEstimate` hoặc par của món |
| 3 | Hệ số tải thật (thời gian bận / thời lượng ca) | 0,8–0,95 | Cao: tăng `arrivalLoad`; thấp: giảm |
| 4 | Số lần chạm mỗi ca | Ước 300–450 (ca 8 khách) | Mỏi tay: bớt bước, tăng "Tự làm" |
| 5 | Tỉ lệ khách bỏ về (từ ngày 4) | 3–8%; công nhân < 15% | Tăng P1 hoặc hệ số công nhân |
| 6 | Tỉ lệ lỡ khách (hàng chờ đầy) | < 5% | Tăng khoảng cách khách |
| 7 | Tỉ lệ vượt ngân sách chờ (75% / 100% / 150%) | < 25% / < 10% / < 3% | Tăng `waitBudgetBase` |
| 8 | Sao trung bình và phân bố sao | Người chơi trung bình 4,0–4,4 | Nới hoặc siết ngưỡng hạng món |
| 9 | Q trung bình theo món và theo bước; tỉ lệ Hỏng ở bước chí mạng | Q 75–88; chí mạng Hỏng < 10% | Nới vùng Canh lửa; đổi `period` |
| 10 | Tỉ lệ chọn sai cách sơ chế | 10–25% ở lần đầu, giảm dần | Quá cao: làm hình dụng cụ rõ hơn |
| 11 | Tỉ lệ "Ra món" khi còn bước chưa làm; tỉ lệ bỏ hẳn nguyên liệu phụ | Thấp và giảm dần | Nếu bỏ hẳn nguyên liệu phụ phổ biến hơn "quên sơ chế": tăng phạt thiếu phụ lên −15 hoặc trần hạng Được |
| 12 | Lỗi order: số lỗi mỗi phiếu trước đọc lại; lỗi lọt vào bếp | Lọt < 5% phiếu | Thêm gợi ý ở Sổ order |
| 13 | Báo tổng sai (dư / thiếu); thối sai; tỉ lệ thối gọn | Sai < 10% sau ngày 4; thối gọn > 60% | Đổi ngày ẩn "Cần thối" |
| 14 | Tỉ lệ xác nhận nhầm QR giả | Giảm về 0 sau lần đầu | — |
| 15 | Lãi mỗi ca so với mục 9 | ±20% | Chỉnh giá vốn, chi phí cố định |
| 16 | Tỉ lệ thưởng mỗi ngày thật | 20–30%, không ngày nào > 35% | Giảm thưởng nhiệm vụ trước |
| 17 | Ca và ngày thật đạt từng điều kiện lên Chặng 2 | Ca 10–15, ngày thật 3–4 | Chỉnh ngưỡng danh tiếng (mục 13) |
| 18 | Thời điểm mua món Shop đầu tiên; tỉ lệ mua Cà phê sữa đá bằng Muỗng Vàng | Ca 4–6 | Giá Shop |
| 19 | Muỗng Vàng tồn cuối Chặng 1 | 20–40 | Giảm nguồn Muỗng Vàng |
| 20 | Tỉ lệ bật Hỗ trợ; lãi người bật so với người không bật | Người bật không lãi hơn | Siết thêm (trần món ở hạng Ngon khi bật Hỗ trợ thao tác) |
| 21 | Chênh lãi người 4,7 sao so với 3,8 sao | ≥ 25% | Tăng tip, tăng ảnh hưởng của sao lên số khách |
| 22 | Số lần vay Dì Sáu | Hiếm (< 10% người chơi) | Tăng vốn đầu hoặc giảm chi phí cố định |
| 23 | Tỉ lệ quay lại ngày thật 2 và 3 (quan sát nhóm thử) | Ghi nhận định tính | Xem lại điểm danh, nhiệm vụ, chuỗi |

---

## 16. Nhật ký chỉnh sửa

| Ngày | Người sửa | Thay đổi | Lý do (số liệu đo được) |
|---|---|---|---|
| 29/09/2026 | — | Tạo bảng số ban đầu | Tính tay theo mô hình ở mục 9; chưa có số đo |
