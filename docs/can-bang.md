# Bảng cân bằng Chặng 1 (MVP)

Phiên bản 0.3 · ngày 30/09/2026

> **Đây là số liệu ban đầu**, dựng bằng tính tay và một mô hình đơn giản cho người chơi trung bình (khoảng 4,2 sao). Mọi con số **phải chỉnh lại sau khi đo thực tế** trên điện thoại thật (mục 15). Khi đổi số, ghi vào Nhật ký chỉnh sửa (mục 16) và cập nhật `src/data/balance.js`, `src/data/recipes.js`, `src/data/ingredients.js`, `src/data/upgrades.js` (và các file dữ liệu meta: `checkin.js`, `quests.js`, `mail.js`, `chains.js`, `events.js`, `day-events.js`, `progression.js`, `shop.js`).
>
> **v0.3** đã đối chiếu mọi bảng với code M1 + M2 (bản đã commit). Chỗ nào code khác bảng cũ, bảng được sửa theo code và ghi *(đã chỉnh theo bản chơi được)*. Số đo mô phỏng tự động của M2 ở mục 9.1, 10.3 và 13.

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
| `qrRate` | 25% | Chỉ là mặc định khi kiểu khách không khai báo `qrRate`; thực tế dùng tỉ lệ theo kiểu khách (mục 3.2) |
| `leaveFromDay` | 4 | Từ ngày này khách xếp hàng mới bỏ về |
| `readbackCatchRate` / `readbackPatienceCost` | 80% / 8% | Đọc lại đơn |
| `zoneMulStage` / `zoneDailyNarrow` / `zoneFloor` / `zoneMulCap` | 1,2 / 2% / 0,75 / 1,6 | Hệ số vùng mục tiêu |
| `tipFiveStar` / `tipBonus` | 5.000đ / 10.000đ | Tip vào hũ |
| `masteryLevels` | 0 / 5 / 15 | Số lần đạt Ngon trở lên để lên cấp 1 / 2 / 3 |
| `autoStepScore` / `retryScoreCap` | 80 / 85 | "Tự làm"; trần điểm khi làm lại |
| `loanAmount` / `loanRepayRate` / `loanInterest` | 240.000đ / 25% / 10% | Dì Sáu cho mượn |
| `refIncomeTable` (M2) | [ngày 1: 20.000đ] · [3: 35.000đ] · [5: 65.000đ] · [7: 85.000đ] · [9: 100.000đ] | **Thu nhập tham chiếu** một ca theo ngày game, tức TNC ở mục 9. Mọi phần thưởng `incomeMul` quy ra tiền theo bảng này, theo ngày game hiện tại lúc nhận, làm tròn lên bội 1.000đ |
| `eventCustomerCap` (M2) | 10 | Trần khách khi sự kiện ngày tăng khách (Chợ phiên) |

Khóa bổ sung nằm ở `DEFAULT_BALANCE` (`src/core/state.js`), không bắt buộc có trong `balance.js`:

| Hằng số | Giá trị | Ý nghĩa |
|---|---|---|
| `multiLineFromDay` / `lineCountWeights` | 3 / 70 : 25 : 5 | Từ ngày 3 đơn có thể 1 / 2 / 3 dòng |
| `noteFromDay` / `noteRateMid` / `noteRateLate` | 3 / 20% / 35% | Tỉ lệ mỗi dòng có ghi chú (ngày 3–4 / từ ngày 5) |
| `splitFromDay` / `splitLineRate` | 5 / 15% | Đơn "tách dòng" |
| `surchargeFromDay` | 6 | Ghi chú phụ thu (Thêm trứng, Thêm trứng cút) |
| `regularReturnRate` | 15% | Khách quen quay lại mỗi ca, từ ngày 2 |
| `regionBacRate` | 30% | Khách giọng Bắc |
| `maxLoad` / `firstArrival` / `tutorialGapMul` | 0,9 / 3 giây / 1,5 | Trần hệ số tải; khách đầu tới sau 3 giây; giãn cách sau khách hướng dẫn |
| `changeAskRate` / `changeAskPatienceCost` / `roundingMax` | 40% / 5% / 5.000đ | Hết tiền lẻ: xin khách tiền lẻ; làm tròn có lợi cho khách |
| `shortChangeDetectRate` / `overChangeReturnRate` | 90% / 50% | Thối thiếu bị phát hiện; thối dư được trả lại |
| `loanOfferBelow` | 20.000đ | Mời vay khi Tiền quán thấp hơn chi phí cố định 1 ca |

---

## 2. Món: giá bán, giá vốn, lãi

Số liệu đã đối chiếu với `src/data/recipes.js` và `src/data/ingredients.js` ngày 30/09/2026 (bản M2): giá, giá vốn, tổng par và Σw của cả 5 món khớp code. Nếu code đổi, sửa bảng này theo code.

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
- Đề xuất cho Cà phê sữa đá mua được bằng 60 Muỗng Vàng **không làm ở M2** *(đã chỉnh theo bản chơi được)*: món chỉ mua bằng Tiền quán.
- **Cần theo dõi**: Bánh tráng trộn là món Shop đầu tiên nhưng lãi/giây thấp hơn Bánh mì (387đ so với 500đ) và dài nhất (31 giây). Người chơi mua vì cần đủ 3 công thức, nhưng có thể thấy "mua món mới làm ca chậm đi". Phương án nếu đo thấy khó chịu: bỏ bước Rưới dầu hành phi (còn 29 giây, 414đ/giây) hoặc tăng giá lên 25.000đ.
- Trà tắc lãi/giây thấp nhất nhưng rẻ và nhanh; theo dõi xem người chơi có ngại nấu không.

Phụ thu (khách dặn từ ngày 6): Bánh mì "Thêm trứng" +5.000đ giá bán; Bánh tráng trộn "Thêm trứng cút" +5.000đ giá bán. *(đã chỉnh theo bản chơi được)* Giá vốn **không tăng** (bảng cũ ghi +2.500đ và +800đ): bước Chọn vẫn chỉ đòi đúng số nguyên liệu của công thức, ghi chú chỉ tăng số lần đập trứng (3) hoặc bóc trứng cút (5). Vì vậy phụ thu là lãi trọn 5.000đ; nếu muốn khớp đời thật, thêm `qty` cho nguyên liệu theo ghi chú. Ghi chú "Cay" của Bánh mì đòi thêm tương ớt (+250đ vốn).

### 2.2 Giá nguyên liệu (theo `src/data/ingredients.js`)

| Món | Chính | Phụ | Tùy chọn | Tổng giá vốn | Bẫy |
|---|---|---|---|---|---|
| Bánh mì ốp la | bánh mì 3.000; trứng gà 2.500 × 2 | dưa leo 500; hành lá 250; nước tương 250 | tương ớt 250 | **9.000đ** | trứng vịt 3.000; hành tây 500; nước mắm 250 |
| Trà tắc | trà 800; tắc 400 × 3; đường 300; ly 300 | đá 400 | — | **3.000đ** | chanh 500; muối 100; sữa đặc 1.500 |
| Bánh tráng trộn | bánh tráng 1.500; xoài xanh 2.000; trứng cút 400 × 3; khô bò 1.600 | rau răm 200; hành phi 300; đậu phộng 300; sa tế 500; tắc 400 | — | **8.000đ** | rau húng lủi 200; bánh tráng mè 2.000; trứng gà 2.500 |
| Cà phê sữa đá | cà phê phin 2.800; sữa đặc 1.500; ly 300 | đá 400 | — | **5.000đ** | sữa tươi 1.500; cà phê hòa tan 1.500; đường phèn 500 |
| Chè bưởi | cùi bưởi (trên kệ ghi "Vỏ bưởi") 1.400; bột năng 500; nước cốt dừa 1.200; ly 300 | đậu xanh 800; đường 300; muối 100; đá 400 | — | **5.000đ** | bột mì 400; sữa đặc 1.500; dừa nạo 1.000 |

Nguyên liệu dùng chung có cùng giá ở mọi món (tắc 400, đá 400, ly 300, sữa đặc 1.500, đường 300, muối 100, trứng gà 2.500).

**Chi phí làm lại (`retryCost`)**: Chiên trứng 6.000đ (2 trứng và dầu); Luộc chè 3.000đ. Các bước khác chưa khai báo (0đ); nếu cần, đặt bằng giá nguyên liệu bước đó xử lý.

> Ghi chú: ví dụ trong `docs/kien-truc.md` ghi trứng gà 3.000đ; code đang dùng 2.500đ để giá vốn Bánh mì ốp la khớp đúng 9.000đ. Bảng này theo code.

---

## 3. Khách mỗi ca theo ngày

### 3.1 Số khách và độ phức tạp đơn

*(đã chỉnh theo bản chơi được: bảng cũ mở nhiều dòng từ ngày 4, số lượng 2 từ ngày 5, 3 dòng từ ngày 7; code mở cả ba từ ngày 3.)* Số phần kỳ vọng đo bằng cách sinh 40.000 đơn bằng hàm thật `makeRequest` (thực đơn 2 món có sẵn / có thêm Bánh tráng trộn).

| Ngày | N gốc = min(8, 4 + ⌊(ngày − 1)/2⌋) | Dòng mỗi khách | Số lượng mỗi dòng | Dòng có ghi chú | Phần kỳ vọng mỗi khách (đo) | Mở thêm |
|---|---|---|---|---|---|---|
| 1 | 4 | 1 | 1 | 0% | 1,00 | 2 khách đầu là cô Thu, bạn Nam (hướng dẫn, không trừ sao); dải icon món |
| 2 | 4 | 1 | 1 | 0% | 1,00 | Shop: Bánh tráng trộn; Dao thép tốt; khách quen có thể quay lại (15%/ca) |
| 3 | 5 | 1 (70%) / 2 (25%) / 3 (5%), mỗi dòng một món khác nhau | 1 (80%) / 2 (17%) / 3 (3%) | 20% (1/5 trong số đó có 2 ghi chú) | 1,60 (thực đơn 2 món) / 1,66 (3 món) | Chảo chống dính, Ghế nhựa chờ; sự kiện ngày; bỏ dải icon |
| 4 | 5 | như ngày 3 | như ngày 3 | 20% | như ngày 3 | QR; dân văn phòng; khách bỏ về; Shop: Cà phê sữa đá |
| 5 | 6 | như ngày 3, cộng 15% đơn "tách dòng" (cùng món, 2 dòng khác ghi chú) | như ngày 3 | 35% | 1,70 / 1,76 | Khách khó tính; Loa báo tiền |
| 6 | 6 | như ngày 5 | như ngày 5 | 35% | như ngày 5 | Phụ thu |
| 7 | 7 | như ngày 5 | như ngày 5 | 35% | như ngày 5 | Ảnh chuyển khoản giả 4%; Máy tính cầm tay |
| 8 | 7 | như ngày 5 | như ngày 5 | 35% | như ngày 5 | |
| 9 trở đi | 8 | như ngày 5 | như ngày 5 | 35% | như ngày 5 | |

- Thực đơn chỉ có 2 món thì đơn tối đa 2 dòng (tỉ lệ 1 dòng / 2 dòng là 70% / 30%).
- Giá trị đơn trung bình đo được: khoảng 15.000đ (ngày 1–2), 24.000–27.600đ (ngày 3–4), 25.900–29.900đ (từ ngày 5). Bảng cũ (mục 9) giả định 1,00 món mỗi khách ở ngày 3, 1,25 ở ngày 4 và 1,44–1,55 từ ngày 5, nên **doanh thu mỗi khách của mô hình thấp hơn code**, lệch nhiều nhất ở ngày 3–4 (khoảng 60%), còn khoảng 0–15% từ ngày 9 (xem mục 9.1).

**Điều chỉnh theo sao trung bình** *(đã chỉnh theo bản chơi được)*: chỉ áp từ ngày 2 và khi đã có ít nhất 5 đánh giá. Sao trung bình từ 4,5 → +1 khách; dưới 3,5 → −1 khách; 3,5–4,49 giữ nguyên. N = kẹp(N gốc ± 1, 3, 8). Ví dụ ngày 3 (N gốc 5) với 4,6 sao → 6 khách; với 3,6 sao vẫn 5 khách; với 3,4 sao → 4 khách. Ngày 9 với 4,6 sao vẫn là 8 (trần). (Bảng cũ dùng hệ số ×0,85 cho 3,5–3,99 sao nên sẽ bớt 1 khách; code không bớt.)

Sự kiện ngày (M2, chi tiết mục 14.1): Trời mưa khách ×0,8 (làm tròn, sàn 3; căng bạt còn ×0,95); Nắng nóng +1 khách (trong trần 8); Chợ phiên ×1,3 (làm tròn, trần 10). Số khách trung bình đo được cả sự kiện ngày: 5,1 (ngày 3–4), 6,2 (ngày 5–6), 7,1 (ngày 7–8), 7,9 (từ ngày 9, chưa tính điều chỉnh theo sao).

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
- **Đã thống nhất với code**: `reportTotal` dùng `qrRate` của từng kiểu khách; `BALANCE.qrRate = 0.25` chỉ là giá trị mặc định khi kiểu khách không khai báo, và là mục tiêu kiểm tra (khoảng 25–30%). Khách hướng dẫn luôn trả tiền mặt.
- Khách quen (cô Thu: kiểu Cô chú; bạn Nam: kiểu Học sinh) quay lại từ ngày 2 với xác suất 15% mỗi ca, không phải khách đầu ca, gọi món quen *(đã chỉnh theo bản chơi được: bảng cũ ghi từ ngày 3, 25%)*.

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

**Số đo từ code** *(đã chỉnh theo bản chơi được)*. Bảng trên là mô hình ban đầu. Code tính khoảng cách theo đơn thật của từng khách (khách trước), rồi giãn cả lịch nếu ρ vượt 0,9 × 0,99; ngày 1 giãn thêm ×1,5 sau khách hướng dẫn. Đo bằng `startShift` thật với 300 seed (thời lượng lịch = lúc khách cuối tới + thời gian phục vụ kỳ vọng của khách đó; chưa tính thời gian người chơi chậm hơn kỳ vọng):

| Ngày | Phục vụ kỳ vọng mỗi khách (2 món / 3 món) | Khách (có sự kiện ngày) | Thời lượng lịch (2 món / +Bánh tráng trộn / +cả Cà phê sữa đá) | ρ trung bình |
|---|---|---|---|---|
| 1 | 40,0 / 43,6 giây | 4,0 | 3,7 / 3,8 / 3,8 phút | 0,68 (có giãn sau khách hướng dẫn) |
| 2 | 40,0 / 43,6 giây | 4,0 | 3,0 / 3,3 / 3,2 phút | 0,88 |
| 3–4 | 48,4 / 54,9 giây | 5,1 | 4,6 / 5,1 / 5,0 phút | 0,88 |
| 5–6 | 50,5 / 57,3 giây | 6,2 | 5,8 / 6,6 / 6,4 phút | 0,88 |
| 7–8 | 50,5 / 57,3 giây | 7,1 | 6,6 / 7,5 / 7,3 phút | 0,88 |
| 9 trở đi | 50,5 / 57,3 giây | 7,9 | 7,4 / 8,4 / 8,2 phút | 0,89 |

- Có thêm Bánh tráng trộn (món dài nhất) thì ca từ ngày 7 dài hơn mục tiêu 7 phút. Hướng chỉnh nếu đo thật thấy mỏi: như cảnh báo trên, hoặc lùi `multiLineFromDay` từ 3 về 4.

---

## 5. Kiên nhẫn xếp hàng (P1)

P1 = max(32, 45 − max(0, ngày − 3)) × hệ số kiểu khách × (1,2 nếu có Ghế nhựa chờ) × (1,2 nếu Trời mưa). Sàn áp **trước** khi nhân hệ số kiểu khách (đã xác nhận: `patienceSecFor` trong `src/core/customer.js`). Khách hướng dẫn ngày 1 không mất kiên nhẫn.

| Ngày | P1 gốc | Học sinh ×1,0 | Công nhân ×0,6 | Cô chú ×1,3 | Văn phòng ×0,8 | Khó tính ×0,85 |
|---|---|---|---|---|---|---|
| 1–3 | 45 | 45 | 27 | 58,5 | — | — |
| 4 | 44 | 44 | 26,4 | 57,2 | 35,2 | — |
| 7 | 41 | 41 | 24,6 | 53,3 | 32,8 | 34,9 |
| 10 | 38 | 38 | 22,8 | 49,4 | 30,4 | 32,3 |
| 15 | 33 | 33 | 19,8 | 42,9 | 26,4 | 28,1 |
| 16 trở đi | 32 | 32 | 19,2 | 41,6 | 25,6 | 27,2 |

- Ngày 1–3 khách không bỏ về. Từ ngày 2, lúc kẹp phiếu mà khách đã dùng quá 60% / 85% kiên nhẫn thì −0,5 / −1 sao ("chờ gọi món").
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
| Phạt quầy | Sai món −2 · sai/thiếu ghi chú −1 (tối đa −2) · thiếu số lượng −1 · báo tổng dư −1 (1 lần mỗi khách; *đã chỉnh theo bản chơi được*, bảng cũ −1,5) · thối thiếu bị phát hiện −1 · từ ngày 2, lúc kẹp phiếu đã dùng quá 60%/85% kiên nhẫn −0,5/−1 · khó tính có lỗi −1 thêm |
| Lỗi quầy 0 sao | Báo tổng thiếu, thối dư (kể cả khi khách trả lại), xác nhận ảnh chuyển khoản giả: không trừ sao nhưng ghi trên phiếu chấm và làm đứt chuỗi "Quầy chuẩn" |
| Chờ món | Vượt 75% / 100% / 150% ngân sách chờ: −0,5 / −1 / −2 (chỉ mức cao nhất) |
| Làm tròn sao | Xuống; kẹp 1–5 |
| Tip (chỉ khi 5 sao) | 5.000đ; 10.000đ nếu có món Không tì vết hoặc khách khó tính; (M2) 10.000đ khi đang trong chuỗi "Quầy chuẩn" (từ 5 khách liên tiếp); (M2) Ngày lãnh lương ×1,5 làm tròn bội 5.000đ (5.000đ → 10.000đ, 10.000đ → 15.000đ) |
| Danh tiếng mỗi khách | 5 sao +3 · 4 sao +2 · 3 sao +1 · ≤2 sao 0 · Không tì vết +1 · trả lại tiền thối dư +1 · (M2) trong mùa sự kiện, mỗi phần món lễ đạt Ngon trở lên +1. *Khách quen "như mọi khi" +1 và thạo cấp 3 +1 mỗi món Tuyệt hảo chưa có ở bản chơi được (đã bỏ khỏi bảng).* |
| Thối thiếu / dư | Thiếu: 90% bị phát hiện · Dư: 50% khách trả lại |

> **Đã làm ở M2**: tip 10.000đ theo chuỗi "Quầy chuẩn" nằm ở `finalizeCustomer` (`src/core/kitchen.js`): khách 5 sao khi `counterStreak ≥ 5` được 10.000đ. Bật Hỗ trợ tính tiền thì chuỗi không được đếm (luôn 0), không có tip theo chuỗi và không ghi kỷ lục "Chuỗi Quầy chuẩn dài nhất" (`docs/kien-truc.md` mục 10).

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

Chảo chống dính: LUA ×1,15. Thạo cấp 2: ×1,05. (Khớp `TOOL_ZONE_MUL`, `MASTERY_ZONE_MUL`, `ASSIST_ZONE_MUL` trong `src/core/minigame-scoring.js`.) Hỗ trợ thao tác còn kéo dài thời lượng bước ×1,5 và trần món ở hạng Ngon (Q ≤ 89).

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
- Cột "TNC dùng để tính thưởng" khớp đúng `BALANCE.refIncomeTable` của code (20k / 35k / 65k / 85k / 100k).

### 9.1 Số đo mô phỏng M2 (người chơi hoàn hảo)

`tests/unit/integration-meta.test.mjs` chơi bằng lõi thật với `DATA` thật: người chơi hoàn hảo, 3 ca mỗi ngày thật (08:00, 12:00, 17:30), từ 05/10/2026, mua Bánh tráng trộn (ngày game 2), Dao thép tốt và Cà phê sữa đá (ngày game 4–5), Loa báo tiền (ngày game 7–8). Lệnh `META_SIM_LOG=1 npm test` in số liệu từng ngày.

| Ngày thật | Lãi bán hàng (seed 42 / 7 / 2024) | Tỉ lệ thưởng (tiền thật, seed 42 / 7 / 2024) |
|---|---|---|
| 1 | 242k / 297k / 267k | 6,2% / 4,5% / 4,0% |
| 2 | 422k / 392k / 584k | 24,9% / 22,1% / 19,0% |
| 3 | 546k / 581k / 521k | 11,1% / 15,7% / 12,4% |
| 4 | 607k / 542k / 616k | 16,5% / 12,9% / 11,5% |
| 5 | 712k / 753k / 671k | 10,1% / 15,3% / 14,6% |

- Lãi bán hàng của người chơi hoàn hảo khoảng 240–750k mỗi ngày thật, **gấp khoảng 3 lần** mô hình người chơi trung bình ở bảng trên (78k–421k). Lý do: mọi khách 5 sao có món Không tì vết được tip 10.000đ (mô hình giả định 2.200đ mỗi khách), sao trung bình ≥ 4,5 thêm 1 khách mỗi ca, và đơn từ ngày 3 lớn hơn mô hình (mục 3.1). Chưa đổi tip; cần đo người chơi thật (mục 15, chỉ số 15 và 21).
- Người chơi trung bình được mô phỏng riêng cho mốc danh tiếng (mục 13).

---

## 10. Thưởng ngoài bán hàng (Chặng 1, ngày thật 1–4)

### 10.1 Chi tiết từng nguồn

| Nguồn | Luật | Ngày thật 1 | Ngày thật 2 | Ngày thật 3 | Ngày thật 4 |
|---|---|---|---|---|---|
| Nhiệm vụ (3 × 0,2 TNC) + Rương ngày (0,2 TNC + 5 Muỗng Vàng) | 0,8 TNC của ngày game lúc nhận (mỗi phần 0,2 TNC làm tròn lên bội 1.000đ: 4k / 7k / 13k / 17k / 20k) | 16–28k (TNC 20–35k) | 52k (khoảng 65k) | 80k (100k) | 80k (100k) |
| Chuỗi "Ngày đầu ra phố" | Bước 2: 5k · 3: 5k · 4: 15k · 5: 30k · 6: 30k | 10k (bước 2, 3) | 45k (bước 4, 5) | 30k (bước 6) | 0 (bước 7 thưởng Muỗng Vàng) |
| Chuỗi "Làm quen QR" | Chỉ Muỗng Vàng | 0 | 0 | 0 | 0 |
| Điểm danh Tuần Khai Trương (quy đổi) | Ô1 10 Muỗng Vàng + viền biển xe · Ô2 Phiếu Chợ Sớm · Ô3 10 Muỗng Vàng · Ô4 Bạt che mưa (đã có thì 20.000đ) · Ô5 Phiếu Chợ Sớm ×2 · Ô6 15 Muỗng Vàng · Ô7 Rương Khai Trương | 0 | khoảng 7k | 0 | khoảng 20k (danh nghĩa) |
| Hộp thư (quy đổi, kỳ vọng) | Thư chào mừng: 10 Muỗng Vàng + Phiếu Chợ Sớm; quà đời thường 10%/ngày × 0,3–0,6 TNC từ ngày thật 3 (cần ≥ 5 đánh giá, sao trung bình ≥ 3,8; tối đa 2 thư/tháng) | khoảng 5k | 0 | khoảng 4,5k | khoảng 4,5k |
| **Tổng thưởng** | | **35k** | **104k** | **114,5k** | **104,5k** |
| Lãi bán hàng | mục 9 | 78k | 265k | 405k | 421k |
| **Tỉ lệ thưởng / (lãi + thưởng)** | Mục tiêu 20–30%, trần 35% | **31%** | **28%** | **22%** | **20%** |

- Cả Chặng 1: thưởng 358k / (1.169k + 358k) = **23,4%**.
- Trong đó tiền mặt thật vào ví (không tính hiện vật): khoảng 326k.
- Quy đổi hiện vật: Phiếu Chợ Sớm = 20% giá vốn một ca (khoảng 5–7k lúc nhận); Bạt che mưa = 20.000đ (một lần căng bạt).
- Không tính quà lễ (phụ thuộc lịch): 20/10 là 20 Muỗng Vàng; 20/11 là 20 Muỗng Vàng + 0,5 TNC (50k); Tết Đinh Mùi (06/02/2027) là 88 Muỗng Vàng + 1 TNC (100k). Trần Hộp thư: tối đa 2 quà lễ/mốc mỗi tháng; tổng tiền quà lễ + mốc + đời thường + Tem dư sự kiện ≤ 3 TNC mỗi tháng.
- Rương Khai Trương (Ô7: 100.000đ + 20 Muỗng Vàng + danh hiệu "Chủ xe mới toanh") rơi vào ngày thật 7, khi người chơi thường đã ở giai đoạn Chặng 2 (TNC 160k), tỉ lệ ngày đó khoảng 100 / (160 × 3,5 + 100) ≈ 15% nếu chỉ tính Ô7. Ở MVP người chơi vẫn ở Chặng 1 (TNC 100k); mô phỏng M2 đo được 25,2% cho ngày này (mục 10.3).
- Vòng điểm danh thứ hai trở đi: 0,3 TNC · Phiếu Chợ Sớm · 10 Muỗng Vàng · 0,4 TNC · Phiếu Chợ Sớm ×2 · 15 Muỗng Vàng · Rương điểm danh (30 Muỗng Vàng + 0,5 TNC). Ở TNC 100k: 120k tiền, 3 Phiếu Chợ Sớm, 55 Muỗng Vàng mỗi vòng 7 ngày.
- Việc sự kiện, điểm danh sự kiện, chuỗi sự kiện chỉ thưởng Tem (mục 14), không thưởng tiền trực tiếp.

### 10.2 Muỗng Vàng Chặng 1

| Nguồn | Ngày thật 1 | Ngày thật 2 | Ngày thật 3 | Ngày thật 4 |
|---|---|---|---|---|
| Thư chào mừng | 10 | | | |
| Điểm danh | 10 (Ô1) | 0 | 10 (Ô3) | 0 |
| Rương ngày | 5 | 5 | 5 | 5 |
| Chuỗi "Ngày đầu ra phố" | 5 (bước 1) | | 5 (bước 6) | 20 (hoàn thành) |
| Chuỗi "Làm quen QR" | | 5 (bước 1) | 5 (bước 2) | |
| **Cộng** | **30** | **10** | **25** | **25** |

- Tổng khoảng **90 Muỗng Vàng** (mô phỏng M2 người chơi hoàn hảo: 85–90 sau 5 ngày thật). Chỗ tiêu ở MVP *(đã chỉnh theo bản chơi được)*: đổi nhiệm vụ (5/lần) và màu dù xe ở Góc Muỗng Vàng (30 mỗi màu, 3 màu). Đề xuất mua Cà phê sữa đá bằng 60 Muỗng Vàng không làm.
- Nguồn thêm trong mùa sự kiện: Quầy đổi Tem (50 Tem → 10 Muỗng Vàng, tối đa 5 lần = 50 Muỗng Vàng), quà lễ 20/10 và 20/11 (20 mỗi lần). Mô phỏng lượt có sự kiện Tri ân 20/11 (10 ngày thật): 205 Muỗng Vàng.
- Phần còn lại để dành cho Kệ Đặc biệt ở GĐ2. Nếu đo thấy tồn quá nhiều, giảm Muỗng Vàng ở thư chào mừng hoặc Ô3.

### 10.3 Số đo mô phỏng M2 (tỉ lệ thưởng)

Cùng mô phỏng ở mục 9.1. Tỉ lệ = thưởng / (lãi bán hàng + thưởng), tính theo tiền thật và cả khi quy đổi hiện vật (Phiếu Chợ Sớm = phần giá vốn tiết kiệm được, Bạt che mưa = 20.000đ, nâng cấp = giá bán):

- 5 ngày thật thường (seed 42, 7, 2024): 4,0–24,9% (quy đổi 5,2–26,5%). Cao nhất ở ngày thật 2 (thưởng chuỗi C1 bước 4–6).
- Lượt có sự kiện Tri ân 20/11 (17–26/11, seed 42): cao nhất **25,2%** ở ngày thật 7 (23/11, Rương Khai Trương); ngày có quà lễ 20/11 là 18,3%; ngày tất toán Tem dư (25/11) là 21,2%.
- Mọi ngày dưới trần 35%. Tỉ lệ thấp hơn bảng 10.1 vì lãi bán hàng của người chơi hoàn hảo cao hơn mô hình (mục 9.1).

---

## 11. Dòng tiền ví Tiền quán (một đường chơi mẫu)

*(đã chỉnh theo bản chơi được: Cà phê sữa đá chỉ mua bằng Tiền quán 200k, không có lựa chọn 60 Muỗng Vàng.)*

| Ngày thật | Đầu ngày | + Lãi bán hàng | + Thưởng tiền | Mua | Cuối ngày |
|---|---|---|---|---|---|
| 1 | 200k | 78k | 30k | Dao thép tốt 150k | 158k |
| 2 | 158k | 265k | 97k | Bánh tráng trộn 250k; Chảo chống dính 200k | 70k |
| 3 | 70k | 405k | 114,5k | Loa báo tiền 150k; Cà phê sữa đá 200k | 239,5k |
| 4 | 239,5k | 421k | 84,5k | Ghế nhựa chờ 180k; Máy tính cầm tay 150k | **415k** (< 500k) |

- Mua hết 2 món và 5 nâng cấp trong 4 ngày thật thì cuối ngày thật 4 còn khoảng 415k; muốn đủ 500k thì hoãn Ghế nhựa chờ hoặc Máy tính cầm tay sang ngày thật 5.
- Người chơi tiết kiệm (chỉ mua 1 món Shop và Dao) có đủ 500.000đ ngay từ ngày thật 3.
- Mô phỏng M2 (người chơi hoàn hảo, mua Bánh tráng trộn, Dao, Cà phê sữa đá, Loa): ví cuối ngày thật 3 là 0,88–1,04tr, cuối ngày thật 5 là 2,4–2,5tr. Tiền quán dư nhiều hơn mô hình vì lãi cao hơn (mục 9.1); sau khi mua hết, MVP chưa có chỗ tiêu Tiền quán lớn (lên Chặng 2 bị khóa ở MVP).
- Đường chơi mẫu không cần vay Dì Sáu. Vay chỉ xảy ra khi thua lỗ liên tiếp (ví dụ thối dư nhiều, bỏ món nhiều).

---

## 12. Giá Shop, nâng cấp, khoản vay

| Hạng mục | Giá | Mở từ ngày game | Tương đương (lãi ca lúc mở) |
|---|---|---|---|
| Bánh tráng trộn | 250.000đ | 2 | khoảng 11 ca lúc ngày 2, khoảng 3–4 ca lúc ngày 5 |
| Cà phê sữa đá | 200.000đ (chỉ Tiền quán) | 4 | khoảng 5 ca lúc ngày 4, khoảng 3 ca lúc ngày 5 |
| Dao thép tốt | 150.000đ | 2 | Vùng THAI ×1,2 |
| Chảo chống dính | 200.000đ | 3 | Vùng LUA ×1,15, cháy chậm hơn 20% |
| Ghế nhựa chờ | 180.000đ | 3 | Kiên nhẫn xếp hàng ×1,2 |
| Loa báo tiền | 150.000đ | 5 | Tự xác nhận QR, chặn ảnh giả |
| Máy tính cầm tay | 150.000đ | 7 | Tự cộng tổng, không hiện tiền thối |
| Dì Sáu cho mượn | 240.000đ, trả 264.000đ | Khi Tiền quán < 20.000đ | Trừ 25% lãi mỗi ca có lãi; 1 khoản mỗi lần; đang nợ không lên chặng |
| Lên Chặng 2 (khóa ở MVP) | 500.000đ | Khi đủ điều kiện | khoảng 5 ca lãi cuối Chặng 1 |
| Căng bạt ngày mưa | 20.000đ mỗi lần (miễn phí khi có Bạt che mưa) | Ngày có Trời mưa | Trừ lúc mở ca; khách ×0,95 thay vì ×0,8 |
| Màu dù xe (Góc Muỗng Vàng) | 30 Muỗng Vàng mỗi màu (3 màu) | Từ đầu | Chỉ thẩm mỹ |
| Đổi việc hôm nay | Lần đầu mỗi ngày miễn phí, sau đó 5 Muỗng Vàng | Từ đầu | — |

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
| **Đủ tất cả** | **Khoảng ca 10–15, ngày thật 3–4** (mục tiêu thiết kế: ca 1–15, ngày thật 1–4). Mô phỏng M2: ca 9 (người chơi trung bình), ca 6–7 (người chơi hoàn hảo) |

Điều kiện trong code (`src/data/progression.js`, khớp bảng trên): 150 danh tiếng · sao trung bình ≥ 3,8 · 3 công thức (Chè bưởi được tính) · 2 món thạo cấp 2 · xong chuỗi "Ngày đầu ra phố" · 500.000đ Tiền quán và không nợ Dì Sáu. Bước 7 của chuỗi dùng cùng ngưỡng 150 danh tiếng và 3,8 sao.

Nếu đo thấy người chơi trung bình đủ điều kiện trước ca 8 thì tăng ngưỡng danh tiếng lên 200; nếu sau ca 20 thì giảm xuống 120 hoặc tăng danh tiếng từ nhiệm vụ.

Số đo mô phỏng (M2, `tests/unit/integration-meta.test.mjs`, người chơi trung bình: quầy đúng, bếp 40% Tuyệt hảo / 45% Ngon / 10% Được / 5% Kém, 3 ca ngày thật 1 và 4 ca các ngày sau; seed 42, 7, 2024): 150 danh tiếng ở ca 8–9, đủ mọi điều kiện ở ca 9. Không sớm hơn ca 8 nên **giữ 150** (test khóa luật này). Người chơi hoàn hảo 3 ca/ngày thật đủ điều kiện ở ngày thật 2–3 (ca 6–7).

---

## 14. Sự kiện Tri ân 20/11 (MVP, M2)

*(đã chỉnh theo bản chơi được: bảng cũ ghi chuỗi 3 bước thưởng Muỗng Vàng, danh tiếng và công thức; code làm chuỗi 5 bước thưởng Tem, bước cuối tặng công thức. Dữ liệu: `src/data/events.js`.)*

| Hạng mục | Giá trị |
|---|---|
| Thời gian | 04:00 12/11/2026 → 04:00 22/11/2026 (ngày chơi cuối 21/11); thẻ "Sắp diễn ra" kèm đếm ngược từ 04:00 09/11; 3 ngày ân hạn tới 04:00 25/11 |
| Tiền sự kiện | "Phấn Trắng" (Tem), chỉ hiện khi có sự kiện |
| Tem từ món | Món Ngon trở lên +1; Chè bưởi +2 thêm; trần 30 Tem mỗi ngày thật |
| Việc sự kiện | 3 việc mỗi ngày thật × 10 Tem: Phục vụ 4 khách · Nấu 3 món đạt Ngon trở lên · Được 2 khách chấm 5 sao (Hỗ trợ thao tác: khách từ 4 sao). Quên nhận thì tự cộng khi sang ngày |
| Điểm danh sự kiện | 7 ô × 15 Tem (khóa khi lùi giờ) |
| Chuỗi "Nồi chè tri ân" (Cô Hạnh) | 5 bước: phục vụ 5 khách (20 Tem) · 3 món Ngon trở lên (25) · thối đúng 3 lần (30) · 3 khách 5 sao (35) · 2 món Tuyệt hảo (40 Tem + **công thức Chè bưởi**). Tổng 150 Tem |
| Cổng chuỗi | `gates [1, 1, 2, 2, 3]` = số ngày thật đã mở ca trong mùa cần có để mở bước. Chơi 3 ngày bất kỳ là đủ; bắt đầu muộn thì cổng tự mở (gộp bước) để vẫn kịp trong ngày cuối |
| Quầy đổi (trong mùa và ân hạn) | Bảng đèn 150 Tem · Chậu hoa cúc 200 Tem · Dù hình hộp phấn trắng 250 Tem · 10 Muỗng Vàng giá 50 Tem (tối đa 5 lần) |
| Trong mùa | Chè bưởi (khi đã có) được gọi ×2; mỗi phần Ngon trở lên +1 danh tiếng; giá không đổi (15.000đ) |
| Tem dư sau 3 ngày ân hạn | 100 Tem = 0,2 TNC, **tối đa 1 TNC mỗi sự kiện**, gửi qua Hộp thư, tính vào trần tiền quà tháng (3 TNC). Mô phỏng người chơi hoàn hảo giữ 835 Tem: thư 100.000đ (trước khi chỉnh: 835.000đ ≈ 59% thưởng ngày 25/11). Thưởng chuỗi chưa nhận sau ân hạn: Tem cộng vào Tem dư, công thức gửi thư |
| Quà lễ 20/11 | 20 Muỗng Vàng + 0,5 TNC |
| Tem tối đa (ước tính) | 10 ngày × (30 + 30) + 7 × 15 + 150 = 855 Tem nếu chơi đủ mọi ngày; đồ trang trí cả 3 món cần 600 Tem |
| Kiểm tra | Chè bưởi 370đ/giây ≤ 550đ/giây (trần); tỉ lệ thưởng ngày có quà lễ vẫn ≤ 35% (mô phỏng: 18,3%); ngày tất toán Tem dư 25/11 vẫn ≤ 35% (mô phỏng: 21,2%); Chè bưởi nhận qua chuỗi sau 3 ngày thật chơi trong mùa, khách gọi ngay trong mùa |

### 14.1 Sự kiện ngày (MVP, M2)

Từ ngày game 3, mỗi ngày game có 30% xảy ra 1 sự kiện (bốc theo seed của save + ngày game), báo trước ở Tổng kết ca hôm trước. Dữ liệu: `src/data/day-events.js`.

| Sự kiện | Trọng số | Hiệu ứng | Lựa chọn |
|---|---|---|---|
| Trời mưa | 30 | Khách ×0,8 (làm tròn, sàn 3); kiên nhẫn ×1,2 | Căng bạt 20.000đ → khách ×0,95 (miễn phí khi có Bạt che mưa) |
| Nắng nóng | 30 | +1 khách (trần 8); Trà tắc, Cà phê sữa đá được gọi ×2; dòng chưa có ghi chú có 35% được thêm "Ít đường" / "Ít ngọt" | — |
| Ngày lãnh lương | 20 | Tip ×1,5, làm tròn bội 5.000đ | — |
| Chợ phiên | 20 | Khách ×1,3 (làm tròn, trần 10); lịch khách giãn để ρ ≤ 0,9 | — |

Xác suất mỗi ngày game từ ngày 3: Trời mưa 9%, Nắng nóng 9%, Ngày lãnh lương 6%, Chợ phiên 6%. *(đã chỉnh theo bản chơi được: Ngày lãnh lương và Chợ phiên vốn để GĐ2.)*

### 14.2 Tình huống trong ca (MVP, M3)

Dữ liệu: `src/data/incidents.js` (`INCIDENT_CONFIG`, `INCIDENTS`). Từ ngày game 3, tối đa 1 tình huống mỗi ca, bốc theo seed của save + ngày game.

| Tham số | Giá trị | Ghi chú |
|---|---|---|
| Xác suất mỗi ca (`chance`) | Nhiều 50% · Vừa 35% (mặc định) · Ít 15% | Mức Ít chỉ gồm tình huống tích cực (Khách mở hàng) |
| Bảo hiểm (`guaranteeAfter`) | 3 ca | 3 ca liền (từ ngày 3) không có tình huống → ca kế chắc chắn có |
| Không lặp (`noRepeat`) | 5 tình huống gần nhất | MVP chỉ có 3 loại nên thực tế: không lặp loại vừa gặp khi còn loại khác hợp lệ |
| Trần thiệt hại (`lossCap`) | min(10% doanh thu dự kiến của ca, 0,5 TNC), làm tròn xuống bội 500đ | Đo 9 ca mẫu ngày 3–9: doanh thu dự kiến 90.000–235.000đ → trần 9.000–23.500đ (0,5 TNC ngày 3 = 17.500đ). Loại có lựa chọn lỗ quá trần không được bốc |

| Tình huống | Lựa chọn | Tiền | Khác |
|---|---|---|---|
| Khách mở hàng bằng tờ 500k (đầu ca) | Thối hết tiền lẻ | +10.000đ bán trà tắc (két cần đủ 490.000đ tiền thối, đầu ca thường không đủ) | Két gần cạn tiền lẻ |
| | Mời chuyển QR (từ ngày 4) | +10.000đ qua QR | Két giữ nguyên |
| | Tặng ly trà "mở hàng" (an toàn) | −3.000đ giá vốn | Ca sau +1 khách (trần 8), khoảng +10–20k doanh thu. Ca sau đã đủ 8 khách (từ ngày 9, sao cao, Chợ phiên) thì thay bằng +2 danh tiếng (`bonusRep`), chữ cái giá ghi rõ |
| Khách quen xin ghi nợ 20.000đ (2 ly trà tắc) | Cho nợ | −6.000đ giá vốn; 70% được trả 20.000đ trong 3 ca | +2 danh tiếng; kỳ vọng +8.000đ |
| | Từ chối khéo (an toàn) | 0 | — |
| | Tặng luôn | −6.000đ giá vốn | +5 danh tiếng |
| Khách đổi ý sau khi thanh toán | Đổi món (an toàn) | Thu thêm hoặc hoàn phần chênh giá (không lỗ) | Mở Mẹo nghề "Thu tiền rồi mới gửi bếp" |
| | Từ chối lịch sự | 0 | 50% khách −1 sao khi nhận món (không tính lỗi quầy/bếp) |

Kỳ vọng tiền mỗi tình huống xấp xỉ 0 đến hơi dương; thiệt hại lớn nhất 6.000đ (ghi nợ/tặng 2 ly), dưới trần ở mọi ca mẫu; ca quá ít khách (trần < 6.000đ) thì chỉ còn Khách mở hàng và Khách đổi ý.

### 14.3 Làm tròn tiền (M3)

- Giá vốn mỗi lần nấu và hao hụt làm tròn bội 500đ gần nhất (`roundCost`, sau hệ số giá vốn); phí làm lại bước cũng vậy.
- Mọi thưởng Tiền quán (quy đổi từ TNC, thưởng cố định, quà hộp thư, nhiệm vụ, điểm danh, chuỗi) và nợ Dì Sáu làm tròn **lên** bội 1.000đ (`roundReward`).
- Save cũ (M1, M2) có ví lẻ (vd 437.250đ): `save.migrate` làm tròn **lên** bội 500đ một lần khi nạp (có lợi cho người chơi; đang dở ca thì mốc ví đầu ca dời theo để bất biến ví ca vẫn đúng); kỷ lục lãi ca lẻ làm tròn lên bội 500đ, nợ Dì Sáu lẻ làm tròn xuống bội 500đ, quà thư chưa nhận lên bội 1.000đ.
- Hệ quả: Tiền quán luôn là bội 500đ (test mô phỏng 7 ngày thật × 3 ca). Phiếu Chợ Sớm (giá vốn ×0,8) sau làm tròn giảm khoảng 17–22% tùy món (Bánh mì ốp la 9.000 → 7.000đ, Trà tắc 3.000 → 2.500đ, Bánh tráng trộn 8.000 → 6.500đ, Cà phê sữa đá 5.000 → 4.000đ).

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
| 18 | Thời điểm mua món Shop đầu tiên; tỉ lệ nấu thử rồi mua | Ca 4–6 | Giá Shop |
| 19 | Muỗng Vàng tồn cuối Chặng 1; số màu dù đã mua | 20–40 | Giảm nguồn Muỗng Vàng hoặc thêm chỗ tiêu |
| 20 | Tỉ lệ bật Hỗ trợ; lãi người bật so với người không bật | Người bật không lãi hơn | Siết thêm (trần món ở hạng Ngon khi bật Hỗ trợ thao tác) |
| 21 | Chênh lãi người 4,7 sao so với 3,8 sao | ≥ 25% | Tăng tip, tăng ảnh hưởng của sao lên số khách |
| 22 | Số lần vay Dì Sáu | Hiếm (< 10% người chơi) | Tăng vốn đầu hoặc giảm chi phí cố định |
| 23 | Tỉ lệ quay lại ngày thật 2 và 3 (quan sát nhóm thử) | Ghi nhận định tính | Xem lại điểm danh, nhiệm vụ, chuỗi |
| 24 | Số phần mỗi khách ngày 3–4 và cảm nhận độ khó khi đơn nhiều dòng mở từ ngày 3 | Người mới không bị ngợp | Lùi `multiLineFromDay` về 4 (mục 3.1) |
| 25 | Số ngày thật chơi trong mùa sự kiện; tỉ lệ nhận được Chè bưởi; Tem dư cuối mùa | ≥ 70% người chơi 3 ngày trở lên nhận được món | Nới cổng chuỗi hoặc giảm chỉ tiêu bước 4–5 |

---

## 16. Nhật ký chỉnh sửa

| Ngày | Người sửa | Thay đổi | Lý do (số liệu đo được) |
|---|---|---|---|
| 29/09/2026 | — | Tạo bảng số ban đầu | Tính tay theo mô hình ở mục 9; chưa có số đo |
| 30/09/2026 | — | Tem dư: 100 Tem = 1 TNC → 100 Tem = 0,2 TNC, trần 1 TNC/sự kiện, tính vào trần quà tháng (mục 14) | Mô phỏng người chơi hoàn hảo giữ 835 Tem cả mùa (MVP chưa có món thứ hai để tiêu): thư 835.000đ, thưởng ngày 25/11 ≈ 59% > trần 35%. Sau khi chỉnh: 100.000đ, 21,2% |
| 30/09/2026 | — | Giữ ngưỡng 150 danh tiếng lên Chặng 2 (mục 13) | Người chơi trung bình tới 150 ở ca 8–9, không sớm hơn ca 8 nên không nâng lên 200 |
| 30/09/2026 | — | Ô 5 Tuần Khai Trương giữ đúng bảng: Phiếu Chợ Sớm ×2 (mục 10.1) | Bản code trước tặng Dao thép tốt (150.000đ), gấp khoảng 10 lần mức cân bằng của ô này |
| 30/09/2026 | — | v0.3: đồng bộ tài liệu với code M1 + M2 (không đổi số trong code). Sửa theo code: độ khó đơn từ ngày 3 (mục 3.1), điều chỉnh số khách theo sao (3.1), khách quen 15% từ ngày 2 (3.2), báo tổng dư −1 sao (7), phụ thu không tăng giá vốn (2.1), bỏ đề xuất Cà phê sữa đá bằng 60 Muỗng Vàng (2.1, 10.2, 11, 12), chuỗi sự kiện 5 bước thưởng Tem (14), 4 sự kiện ngày (14.1), thêm `refIncomeTable` và các khóa `DEFAULT_BALANCE` (1). Thêm số đo từ code: thời lượng lịch khách (4), mô phỏng M2 (9.1, 10.3) | Tài liệu cũ lệch code sau M2; số đo lấy bằng hàm lõi thật và `META_SIM_LOG=1 npm test` |
| 30/09/2026 | — | M3 nội dung: tình huống trong ca (mục 14.2); giá vốn làm tròn bội 500đ, thưởng Tiền quán bội 1.000đ (mục 14.3) | Ví từng có số lẻ như "804.250đ" do giá vốn lẻ (nguyên liệu lấy thừa/bẫy giá 100–500đ, Phiếu Chợ Sớm ×0,8) và thưởng theo hệ số TNC |
| 30/09/2026 | — | Vòng soát lỗi M3: ly trà "mở hàng" khi ca sau đã đủ 8 khách → +2 danh tiếng thay khách thêm (mục 14.2); save cũ ví lẻ làm tròn lên bội 500đ khi nạp (mục 14.3) | Từ ngày 9 (8 khách) lựa chọn an toàn trừ giá vốn mà không được gì; 28/36 save M1/M2 thử nạp vẫn giữ ví lẻ |
