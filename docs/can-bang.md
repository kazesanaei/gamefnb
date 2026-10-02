# Bảng cân bằng Chặng 1 (MVP)

Phiên bản 0.4 · ngày 30/09/2026

> **Đây là số liệu ban đầu**, dựng bằng tính tay và một mô hình đơn giản cho người chơi trung bình (khoảng 4,2 sao). Mọi con số **phải chỉnh lại sau khi đo thực tế** trên điện thoại thật (mục 15). Khi đổi số, ghi vào Nhật ký chỉnh sửa (mục 16) và cập nhật `src/data/balance.js`, `src/data/recipes.js`, `src/data/ingredients.js`, `src/data/upgrades.js` (và các file dữ liệu meta: `checkin.js`, `quests.js`, `mail.js`, `chains.js`, `events.js`, `day-events.js`, `progression.js`, `shop.js`).
>
> **v0.3** đã đối chiếu mọi bảng với code M1 + M2 (bản đã commit). Chỗ nào code khác bảng cũ, bảng được sửa theo code và ghi *(đã chỉnh theo bản chơi được)*. Số đo mô phỏng tự động của M2 ở mục 9.1, 10.3 và 13.
>
> **v0.4** (M4, bản game 0.4.0): tip mới (mục 7, 9), thưởng tiền chuỗi "Ngày đầu ra phố" giảm (mục 10), sự kiện thưởng/phạt và tần suất "dày" (14.1, 14.2, 14.4), nguyên liệu và món hiếm (2.1b, 14.5), chỉ số đo mới 26–29 (mục 15). Số đo mô phỏng M4 ở 9.1, 10.3, 13, 14.4, 14.5.

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
| `tipFiveStar` / `tipMinBill` / `strictFiveStarRep` (M4) | 5.000đ / 20.000đ / 1 | Tip vào hũ: 5.000đ duy nhất khi khách 5 sao **và** số tiền khách thực trả từ 20.000đ; khách khó tính 5 sao +1 danh tiếng. Bỏ `tipBonus` 10.000đ |
| `eventDayCap` (M4) | phạt 1 TNC / thưởng 1 TNC | Trần tiền sự kiện (sự kiện ngày + tình huống) mỗi ngày thật; vượt thì Dì Sáu đỡ giùm |
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

Số liệu đã đối chiếu với `src/data/recipes.js` và `src/data/ingredients.js` ngày 30/09/2026 (bản M2): giá, giá vốn, tổng par và Σw của cả 5 món khớp code. Nếu code đổi, sửa bảng này theo code. Bản 0.5.0 (M5) chỉ đổi cơ chế của 15 bước, không đổi số nào ở mục này (bảng bất biến ở mục 7.1).

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

### 2.1b Bốn công thức hiếm (M4 bước 6)

Nguồn "Công thức hiếm" (`source: 'hiem'`): gom 3 mảnh rồi nấu thử đạt hạng Được. Giá vốn gồm giá quy đổi của nguyên liệu hiếm (mục 14.5), nhưng nguyên liệu hiếm lấy từ kho nên **Tiền quán chỉ trả phần nguyên liệu thường** (cột "Trừ Tiền quán", sau làm tròn 500đ). Món hiếm chỉ được gọi khi kho còn (chốt lúc mở ca), được gọi ×1,5; mỗi phần đạt Ngon trở lên +1 danh tiếng.

| Món | Món nền | Hiếm mỗi phần | Giá bán | Giá vốn (có quy đổi) | Lãi | Trừ Tiền quán mỗi phần | Tổng par (giây) | Lãi/giây nấu |
|---|---|---|---|---|---|---|---|---|
| Trà tắc mật ong rừng | Trà tắc | 1 mật ong rừng | 15.000đ | 6.000đ | 9.000đ | 2.500đ | 19 | 474đ |
| Bánh mì trứng gà ta | Bánh mì ốp la | 1 phần trứng gà ta (2 quả) | 25.000đ | 11.000đ | 14.000đ | 4.000đ | 26 | 538đ |
| Bánh tráng trộn Tây Ninh | Bánh tráng trộn | 1 khô mực + 1 muối tôm | 25.000đ | 12.000đ | 13.000đ | 6.500đ | 34 | 382đ |
| Cà phê muối | Cà phê sữa đá | 1 cà phê hạt Buôn Ma Thuột | 20.000đ | 6.000đ | 14.000đ | 2.500đ | 26 | 538đ |

Quy tắc "món ngang giá trị": cả 4 món ≤ 550đ/giây. Phần lãi thêm so với món nền là thưởng hiện vật có trần theo ngày thật (6 phần), không phải nguồn tiền tự do.

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
| Tip (M4) | 5.000đ duy nhất khi khách chấm 5 sao **và** số tiền khách thực trả (phiếu thu trừ phần đã hoàn; ảnh chuyển khoản giả = 0) từ 20.000đ. Đơn chỉ 1 Trà tắc (10k), 1 Cà phê sữa đá hoặc 1 Chè bưởi (15k) không có tip; báo tổng thiếu dưới 20.000đ thì mất tip; bán kèm món thứ hai hoặc phụ thu thì đủ ngưỡng. *Trước M4: 10.000đ cho món Không tì vết, khách khó tính, chuỗi "Quầy chuẩn" ≥ 5; Ngày lãnh lương ×1,5* |
| Thay tip 10.000đ (M4) | Món Không tì vết: +1 danh tiếng như cũ · khách khó tính 5 sao: +1 danh tiếng · chuỗi "Quầy chuẩn" chạm 5 khách: +1 lượt Giỏ chợ mỗi ca (bật Hỗ trợ tính tiền thì không có) · Ngày lãnh lương: khách gọi thêm món (`lineCountWeights` [60, 32, 8]) |
| Danh tiếng mỗi khách | 5 sao +3 · 4 sao +2 · 3 sao +1 · ≤2 sao 0 · Không tì vết +1 · trả lại tiền thối dư +1 · (M2) trong mùa sự kiện, mỗi phần món lễ đạt Ngon trở lên +1. *Khách quen "như mọi khi" +1 và thạo cấp 3 +1 mỗi món Tuyệt hảo chưa có ở bản chơi được (đã bỏ khỏi bảng).* |
| Thối thiếu / dư | Thiếu: 90% bị phát hiện · Dư: 50% khách trả lại |

> **M4 thay luật M2**: không còn tip 10.000đ theo chuỗi "Quầy chuẩn"; chuỗi chạm 5 khách lần đầu trong ca ghi `sh.rareRolls` (lượt Giỏ chợ) ở `clipTicket` (`src/core/order.js`). *(M2: khách 5 sao khi `counterStreak ≥ 5` được 10.000đ ở `finalizeCustomer`.)* Bật Hỗ trợ tính tiền thì chuỗi không được đếm (luôn 0), không có tip theo chuỗi và không ghi kỷ lục "Chuỗi Quầy chuẩn dài nhất" (`docs/kien-truc.md` mục 10).

**Phân bố sao giả định cho người chơi trung bình (4,2 sao)**: 5 sao 40% · 4 sao 45% · 3 sao 10% · 2 sao 5%. Danh tiếng trung bình khoảng 2,2 mỗi khách.

**Tip mỗi khách phục vụ (M4)** = 40% khách 5 sao × 5.000đ × tỉ lệ hóa đơn từ 20.000đ. Tỉ lệ hóa đơn (giá niêm yết kèm phụ thu) từ 20.000đ đo bằng `startShift` thật, 400 hạt giống, bỏ khách hướng dẫn:

| Ngày | Thực đơn 2 món có sẵn | + Bánh tráng trộn | + Bánh tráng trộn + Cà phê sữa đá | Tip mỗi khách phục vụ (thực đơn của mô hình mục 9) |
|---|---|---|---|---|
| 1–2 | 48–50% (hóa đơn TB 15.000đ, 1,00 phần/khách) | 64–69% | 50% | 1.000đ |
| 3–4 | 71–72% (24.000đ, 1,6 phần) | 78–80% | 68–70% | 1.440đ |
| 5 trở đi | 74–76% (25.600đ, 1,7 phần) | 82–83% (29.500đ) | 74–77% | 1.660đ (có Bánh tráng trộn) |

*Trước M4: tip trung bình khoảng 5.500đ mỗi khách 5 sao, tức khoảng 2.200đ mỗi khách phục vụ.* Thiết kế M4 ước 1.440đ mỗi khách (từ ngày 3) và 1.000đ (ngày 1–2); đo ra đúng như vậy với 2 món có sẵn, cao hơn một chút khi có Bánh tráng trộn (món 20.000đ). Người chơi giỏi (mọi khách 5 sao) có khoảng 2.500–4.200đ mỗi khách (trước M4 khoảng 10.000đ).


### 7.1 M5 (bản 0.5.0): năm thao tác mới — cách chấm, sàn giờ, bảng bất biến

Bản 0.5.0 đổi **cơ chế** của 15 bước sang 5 thao tác mới (`docs/de-xuat-thiet-ke.md` mục 6.4) mà **không đổi cân bằng**. Mỗi hàm chấm mới được chọn để cùng nghĩa với bước nó thay (lac/xoay/got thay chà: giữ mức trừ 15 vì quá giờ và tỉ lệ đủ lượt, nhưng mốc trừ là max(2 × par, sàn giờ) chứ không còn 2 × par — xem đoạn **Sàn giờ** và **Mốc trừ quá giờ** bên dưới; bay thay chạm `exact`: giữ −30 mỗi lần lệch số lượng; Lắc rổ áo bột năng thay chạm tối thiểu: giữ phạt chạm quá tay bằng `maxRatio` 1,2). Chỉ đập trứng khó hơn bước cũ (thêm nhịp canh lực), bù bằng vùng xanh rộng [0,40; 0,70] và sàn giờ (quyết định Q7).

| Thao tác | Điểm bước (0–100, số nguyên; đầu vào lỗi → 0) |
|---|---|
| Đập trứng `scoreDap` | Mỗi quả: đã tách → hàm vùng như Canh lửa theo vị trí kim lúc chạm (vùng xanh [0,40; 0,70] × hệ số vùng); vỏ rơi vào → tối đa 40; chưa đập → 0. Trung bình n quả |
| Khuấy `scoreXoay` | 100 × min(1, vòng / K) − 12 mỗi lần văng (quá 2,2 vòng/giây × hệ số, × 1,8 ở bước đánh bông, kéo dài quá 0,25 giây) − 10 nếu hệ số biến thiên thời gian mỗi vòng > 0,45 × hệ số − 15 nếu quá mốc max(2 × par, sàn giờ) (`overtimeAt`) |
| Gọt vỏ `scoreGot` | Trung bình min(1, độ phủ / 0,85) của K dải × 100 − min(24, 8 × nhát hụt) − 15 nếu quá mốc max(2 × par, sàn giờ) |
| Lắc `scoreLac` | 100 × min(1, lượt / K) − 10 nếu hệ số biến thiên nhịp > 0,6 × hệ số − 15 nếu quá mốc max(2 × par, sàn giờ) − phạt lắc quá tay khi bước có `maxRatio` m (chỉ Lắc rổ áo bột năng, m = 1,2): r = lượt / K ≤ m → 0; ≤ m + 0,15 → 20; ≤ m + 0,4 → 45; hơn nữa → 80 (`lacOverPenalty`, cùng bậc 100 / 80 / 55 / 20 với chạm tối thiểu cũ). Không có `maxRatio` thì lắc dư không phạt |
| Thả đá `scoreBay` | Trung bình điểm vị trí (d = khoảng cách tới tâm / bán kính: ≤ 0,35 × hệ số → 100; ≤ 0,6 × hệ số → 80; ≤ 1 → 55; xa hơn 20) − 30 × \|số đã thả − n\|; chưa thả gì 0 |

**Sàn giờ** (`MIN_LIMIT`, `minLimitSec` ở `src/core/minigame-scoring.js`; `src/ui/minigames/_gesture.js` chỉ xuất lại) dùng ở hai chỗ: giới hạn giờ của bước = max(2,5 × par, sàn) (`gestureLimitSec` ở `_gesture.js`; Hỗ trợ thao tác nhân 1,5 cả hai, nấu thử không giới hạn) và mốc trừ 15 vì quá giờ của khuấy, gọt, lắc = max(2 × par, sàn) (`overtimeAt`; nấu thử truyền par = Infinity nên không bao giờ bị trừ). Đập trứng và thả đá không có luật quá giờ. Sàn tính theo tham số đã nhân số phần: đập trứng 1,5 × n + 1; khuấy 1,4 × vòng + 1 (bản đầu 1,1); gọt 1,2 × dải + 1; lắc 0,4 × lượt + 1; thả đá 1,3 × n + 1,5 (giây). **Sàn không đổi par** (par vẫn quyết định ngân sách chờ của khách, mục 6), chỉ để "Thêm trứng" hay đơn nhiều phần vẫn làm kịp và người làm vừa tay không bị trừ oan. Bảng tính từ dữ liệu thật (giây; in đậm là chỗ sàn thắng 2,5 × par; "mốc" là mốc trừ quá giờ, chỉ có ở khuấy, gọt, lắc):

| Bước | 1 phần: tham số → 2,5 × par / sàn → giới hạn; mốc | 2 phần: tham số → 2,5 × par / sàn → giới hạn; mốc |
|---|---|---|
| Đập trứng (`dap_trung`, par 2) | n 2 → 5 / 4 → 5; "Thêm trứng" n 3 → 5 / 5,5 → **5,5** | n 4 → 7 / 7 → 7; "Thêm trứng" n 6 → 7 / 10 → **10** |
| Lắc đều (`lac`, 2 món trà tắc, par 2) | 6 lượt → 5 / 3,4 → 5; mốc 4 | 12 lượt → 7 / 5,8 → 7; mốc 5,8 |
| Gọt vỏ (`got_xoai`, `got_vo`, par 3) | 5 dải → 7,5 / 7 → 7,5; mốc 7 | 10 dải → 10,5 / 13 → **13**; mốc 13 |
| Trộn đều (`tron`, par 4) | 5 vòng → 10 / 8 → 10; mốc 8 | 10 vòng → 14 / 15 → **15**; mốc 15 |
| Khuấy đều (`khuay`, par 2) | 3 vòng → 5 / 5,2 → **5,2**; mốc 5,2 | 6 vòng → 7 / 9,4 → **9,4**; mốc 9,4 |
| Đánh sữa muối (`danh_sua_muoi`, par 4) | 6 vòng → 10 / 9,4 → 10; mốc 9,4 | 12 vòng → 14 / 17,8 → **17,8**; mốc 17,8 |
| Thả đá (`them_da`, par 2) | 2 viên → 5 / 4,1 → 5; "Ít đá" 1 viên → 5 / 2,8 → 5 | 4 viên → 7 / 6,7 → 7 |
| Lắc rổ áo bột năng (`ao_bot`, par 4, `maxRatio` 1,2) | 8 lượt → 10 / 4,2 → 10; mốc 8; vừa đủ 8–9 lượt | 16 lượt → 14 / 7,4 → 14; mốc 11,2; vừa đủ 16–19 lượt |

**Mốc trừ quá giờ** (sửa sau vòng kiểm chứng M5 Đợt 1, chỉ số 30 mục 15): đồng hồ vẫn tính từ lúc dựng sân khấu như bước chà cũ, nhưng khuấy, gọt, lắc chỉ bị trừ 15 khi quá max(2 × par, sàn giờ) chứ không còn quá 2 × par, vì thao tác mới chậm hơn bước chà nó thay (vẽ 3 vòng lâu hơn chà 6 lượt) mà par bị khóa. Khuấy đều (par 2, 3 vòng) trước phải xong trong 4 giây; nay sàn 5,2 giây vượt 2,5 × par nên chỉ bị trừ khi hết giờ. Trên game thật (cảm ứng CDP, đồng hồ trang đóng băng): khuấy 1,0 vòng/giây chạm sau 0,8 giây được 100 (trước 85), 1,2 vòng/giây chạm sau 0,9 giây được 100 (trước 85); khuấy chậm 0,65 vòng/giây vẫn bị trừ (74). Mô phỏng người chơi trung bình (hệ số vùng 1,104, 5.000 lượt mỗi ca): Khuấy đều bị trừ 8,7% số lượt (trước 41%), điểm trung bình 97,7 (bản 0.4.1 chà 6 lượt: 99,3); Khuấy ly 2 phần 7,3%; Trộn đều 7,7%; Đánh sữa muối 7,1% — đều dưới mức nghiệm thu 15%. Sàn khuấy 1,4 giây mỗi vòng được chọn vì với 1,1 vẫn còn 28% số lượt bị trừ, với 1,3 chỉ còn 13% nhưng tỉ lệ 5 sao Cà phê muối thấp hơn bản 0.4.1 khoảng 6 điểm. Nếu người chơi thật vẫn hay bị trừ thì cân nhắc tính đồng hồ từ lúc chạm đầu tiên hoặc nới sàn khuấy — **không** đổi par (par khóa ngân sách chờ).

**Lắc rổ áo bột năng có `maxRatio` 1,2** (cùng nghĩa với chạm tối thiểu N 8 của bản 0.4.1): trò **không tự xong** khi đủ 8 lượt; người chơi lắc đủ rồi **nhấc tay** mới xong (hoặc hết giờ). Vừa đủ là 8–9 lượt (2 phần: 16–19 lượt); 10 lượt → 80, 11–12 → 55, từ 13 lượt → 20. Sân khấu ghi "Lắc đủ 8 lượt rồi nhấc tay.", bộ đếm ghi cả số vượt (vd "Quá tay! 10/8"), thanh lượt có vạch đủ, vùng vừa đủ và vùng quá tay (`src/ui/minigames/lac.js`). Bản đầu 0.5.0 tự xong ngay ở lượt thứ 8 nên không thể lắc quá tay: người chơi ẩu luôn được Hoàn hảo (bản 0.4.1: điểm trung bình 59,8, Hỏng 47,9%), sao Chè bưởi của người chơi ẩu cao hơn bản 0.4.1 13,8%. Sau khi sửa (mô phỏng bên dưới): áo bột của người chơi ẩu 60,3 điểm, Hỏng 46,7%; của người chơi trung bình 99,9 (bản 0.4.1: 97,4). Lắc đều của 2 món trà tắc không có `maxRatio`: đủ lượt thì tự xong, lắc dư không phạt (như chà kiểu đổi chiều cũ).

Mô phỏng sau vòng sửa (script mô phỏng `sim-A` của vòng kiểm chứng, không nằm trong repo; gọi hàm chấm thật của repo, 5.000 lượt mỗi ca, 4.000 món mỗi dòng; người chơi trung bình TB và ẩu AU như mô hình V3; áo bột theo luật nhấc tay; Thả đá theo mô hình hồng tâm — thả khi vùng đổi xanh đậm): sao trung bình và tỉ lệ 5 sao mỗi món, bản 0.4.1 → 0.5.0.

| Món | TB, hệ số 1,104 (ngày 5) | TB, hệ số 0,9 | AU, hệ số 1,104 | AU, hệ số 0,9 |
|---|---|---|---|---|
| Bánh mì ốp la | 4,29 → 4,40 (+2,6%); 5 sao 29,8 → 41,1% | 4,19 → 4,32 (+3,2%); 20,6 → 32,8% | 3,28 → 3,35 (+2,2%); 0,8 → 1,1% | 3,17 → 3,29 (+3,9%); 0,5 → 0,8% |
| Trà tắc | 4,44 → 4,44 (0,0%); 44,2 → 44,1% | 4,45 → 4,45 (0,0%); 44,7 → 44,6% | 3,75 → 3,75 (0,0%); 4,3 → 4,3% | 3,75 → 3,75 (0,0%); 4,5 → 4,5% |
| Bánh tráng trộn | 4,84 → 4,79 (−1,1%); 83,9 → 78,7% | 4,84 → 4,77 (−1,4%); 83,8 → 77,0% | 4,10 → 3,90 (−4,9%); 11,2 → 4,5% | 4,10 → 3,66 (−10,8%); 11,3 → 1,5% |
| Cà phê sữa đá | 4,56 → 4,54 (−0,5%); 55,8 → 53,6% | 4,55 → 4,52 (−0,8%); 55,4 → 52,0% | 3,88 → 3,79 (−2,5%); 7,3 → 4,6% | 3,88 → 3,71 (−4,3%); 7,2 → 3,3% |
| Chè bưởi | 4,63 → 4,68 (+1,1%); 63,0 → 68,0% | 4,63 → 4,68 (+1,1%); 62,6 → 67,6% | 3,42 → 3,42 (0,0%); 4,5 → 4,0% | 3,43 → 3,43 (0,0%); 4,0 → 3,9% |
| Trà tắc mật ong rừng | 4,45 → 4,45 (−0,1%); 45,3 → 45,0% | 4,44 → 4,45 (0,0%); 44,5 → 44,7% | 3,76 → 3,76 (0,0%); 4,3 → 4,3% | 3,75 → 3,75 (0,0%); 4,1 → 4,0% |
| Bánh mì trứng gà ta | 4,27 → 4,37 (+2,4%); 27,0 → 37,3% | 4,18 → 4,31 (+3,1%); 19,1 → 31,7% | 3,31 → 3,37 (+1,9%); 0,3 → 0,9% | 3,19 → 3,31 (+3,9%); 0,2 → 0,7% |
| Bánh tráng trộn Tây Ninh | 4,76 → 4,72 (−1,0%); 76,4 → 71,8% | 4,76 → 4,70 (−1,4%); 76,2 → 69,6% | 4,03 → 3,86 (−4,2%); 5,6 → 2,4% | 4,04 → 3,64 (−10,0%); 6,0 → 0,6% |
| Cà phê muối | 4,70 → 4,66 (−0,8%); 70,0 → 66,2% | 4,70 → 4,64 (−1,1%); 69,7 → 64,3% | 4,01 → 3,95 (−1,3%); 7,5 → 5,3% | 4,01 → 3,91 (−2,6%); 7,8 → 4,0% |

Sao trung bình của người chơi trung bình lệch −1,4% đến +3,2% ở mọi món, cả hai hệ số; Chè bưởi của người chơi ẩu lệch 0,0% (5 sao 4,5 → 4,0%). Tỉ lệ 5 sao còn lệch quá 5 điểm phần trăm ở mấy chỗ: Bánh mì ốp la và Bánh mì trứng gà ta +10 đến +13 điểm (đập trứng dễ hơn bước chạm cũ); Bánh tráng trộn −5,2 / −6,8 điểm, Tây Ninh −6,6 điểm và Cà phê muối −5,4 điểm (hệ số 0,9); Chè bưởi +5,0 điểm. Người chơi ẩu: Bánh tráng trộn và Tây Ninh mất 4–11% sao (ở hệ số 0,9 khoảng 10%, vì khuấy Trộn đều quá nhanh nên văng, ngưỡng 2,2 × 0,9 = 1,98 vòng/giây), 5 sao Bánh tráng trộn 11,2 → 4,5%. Các chỗ này không do Lắc rổ áo bột năng; cần đo với người chơi thật (chỉ số 30) trước khi chỉnh vùng xanh đập trứng hay ngưỡng văng.

**Bảng bất biến** (khóa bằng `tests/unit/m5-balance.test.mjs`, so **từng bước** — id, par, w, critical, retryCost, ing, after — với bảng chép từ bản 0.4.1; `BALANCE` không đổi; `STATE_VERSION` giữ 3):

| Món | Tổng par (giây) | Σw | Giá | Vốn | Bước chí mạng (giá làm lại) |
|---|---|---|---|---|---|
| Bánh mì ốp la | 22 | 9 | 20.000đ | 9.000đ | Chiên trứng (6.000đ) |
| Trà tắc | 18 | 9 | 10.000đ | 3.000đ | — |
| Bánh tráng trộn | 31 | 11 | 20.000đ | 8.000đ | — |
| Cà phê sữa đá | 20 | 10 | 15.000đ | 5.000đ | — |
| Chè bưởi | 27 | 11 | 15.000đ | 5.000đ | Luộc tới khi trong (3.000đ) |
| Trà tắc mật ong rừng | 19 | 9 | 15.000đ | 6.000đ | — |
| Bánh mì trứng gà ta | 26 | 10 | 25.000đ | 11.000đ | Chiên trứng (6.000đ) |
| Bánh tráng trộn Tây Ninh | 34 | 13 | 25.000đ | 12.000đ | — |
| Cà phê muối | 26 | 14 | 20.000đ | 6.000đ | — |

15 bước đổi cơ chế (par / w giữ nguyên): Đập trứng ×2 món (2 / 2); Lắc đều ×2 món (2 / 1); Gọt vỏ xoài ×2 món (3 / 1); Gọt lớp vỏ xanh (3 / 1); Trộn đều ×2 món (4 / 3); Khuấy đều ×2 món (2 / 1); Đánh sữa muối (4 / 2); Thả đá vào ly ×2 món (2 / 1); Lắc rổ áo bột năng (4 / 2). Ghi chú vá tham số vẫn trỏ đúng tham số (`them_trung` → `n: 3`, `it_da` → `n: 1`); `effectiveSteps` nhân thêm `turns`, `strips` theo số phần (`SCALE_KEYS`).

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

| Ngày (ca) | Khách | Khách phục vụ | Món | Doanh thu | Lãi gộp | Tip (M4) | Hao hụt | Chi phí cố định | **Lãi ca** | **TNC dùng để tính thưởng** |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 4 | 4,0 | 4,0 | 60k | 36,0k | 4,0k | 2,4k | 20k | **18k** | 20k |
| 2 | 4 | 4,0 | 4,0 | 60k | 36,0k | 4,0k | 2,4k | 20k | **18k** | 20k |
| 3 | 5 | 5,0 | 5,0 | 75k | 45,0k | 7,2k | 3,0k | 20k | **29k** | 35k |
| 4 | 5 | 4,75 | 5,9 | 89k | 53,4k | 6,8k | 3,6k | 20k | **37k** | 35k |
| 5 | 6 | 5,7 | 8,2 | 135k | 80,7k | 9,5k | 5,4k | 20k | **65k** | 65k |
| 6 | 6 | 5,7 | 8,2 | 135k | 80,7k | 9,5k | 5,4k | 20k | **65k** | 65k |
| 7 | 7 | 6,65 | 10,3 | 170k | 101,7k | 11,0k | 6,8k | 20k | **86k** | 85k |
| 8 | 7 | 6,65 | 10,3 | 170k | 101,7k | 11,0k | 6,8k | 20k | **86k** | 85k |
| 9–15 | 8 | 7,6 | 11,8 | 195k | 116,2k | 12,6k | 7,8k | 20k | **101k** | 100k |

- **M4**: cột Tip tính theo luật mới (mục 7): khách phục vụ × 1.000đ (ngày 1–2), 1.440đ (ngày 3–4), 1.660đ (từ ngày 5, đã có Bánh tráng trộn). *Bảng v0.3 (tip 2.200đ mỗi khách): tip 8,8k / 11,0k / 10,4k / 12,5k / 14,6k / 16,7k; lãi ca 22k / 22k / 33k / 40k / 68k / 68k / 90k / 90k / 105k.* Thiết kế M4 ước ngày 9 còn khoảng 99k (tip 1.440đ); có Bánh tráng trộn thì hóa đơn từ 20.000đ nhiều hơn nên còn 101k (−4%). Tiền sự kiện (mục 14.4) và phần lãi thêm của món hiếm (mục 14.5) chưa tính trong bảng.
- Tổng lãi bán hàng ca 1–15: khoảng **1,11tr** (v0.3: 1,17tr); trung bình khoảng 74k mỗi ca (TNC trung bình Chặng 1 khoảng 80k; bảng TNC giữ nguyên vì thưởng tính theo TNC, lệch −8% nằm trong ±20% của chỉ số 15).
- Theo ngày thật (3 ca ngày 1, 4 ca mỗi ngày 2–4): ngày thật 1 khoảng 65k; ngày 2 khoảng 253k; ngày 3 khoảng 389k; ngày 4 khoảng 404k (v0.3: 78k / 265k / 405k / 421k).
- Tiêu chí: người 4,7 sao lãi hơn người 3,8 sao ít nhất 25% (chưa tính hệ số khách). Cần mô phỏng hoặc đo để xác nhận. Mô phỏng M4 (`integration-shift`, ngày 1–3, 3 hạt giống): người chơi hoàn hảo lãi 388k, người chơi ẩu 41,5k (hơn 835%; M3: 720k so với 107k, hơn 573%).
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
- **M4 bước 1–3** (tip 5.000đ khi hóa đơn từ 20.000đ, tần suất sự kiện "dày", cùng lệnh đo): lãi bán hàng ngày thật 1–5 seed 42: 115k / 328k / 435k / 528k / 673k; seed 7: 175k / 318k / 427k / 455k / 540k; seed 2024: 152k / 500k / 397k / 545k / 553k. Tỉ lệ thưởng (tiền thật / quy đổi) cao nhất 29,9% / 32,0% (seed 42, ngày thật 2), dưới trần 35%. Người chơi hoàn hảo vẫn đủ điều kiện lên Chặng 2 ở ngày thật 3 (ca 7–8).
- **M4 bước 8** (bản 0.4.0; người chơi giỏi còn ghé phiên hàng đang mở trước mỗi ca, nấu thử mở món hiếm, chọn cách an toàn ở tình huống; lãi đã gồm tiền sự kiện và phần lãi thêm của món hiếm): lãi bán hàng ngày thật 1–5 seed 42: 124k / 376k / 531k / 469k / 614k; seed 7: 185k / 343k / 471k / 551k / 580k; seed 2024: 152k / 499k / 448k / 585k / 588k. 40 hạt giống (từ 05/10/2026): trung bình 171k / 397k / 521k / 529k / 575k mỗi ngày thật. Đủ điều kiện lên Chặng 2 ở ngày thật 3 (ca 7–8). Ví cuối ngày thật 3 là 0,65–0,69tr, cuối ngày thật 5 là 1,91–2,04tr.

---

## 10. Thưởng ngoài bán hàng (Chặng 1, ngày thật 1–4)

### 10.1 Chi tiết từng nguồn

| Nguồn | Luật | Ngày thật 1 | Ngày thật 2 | Ngày thật 3 | Ngày thật 4 |
|---|---|---|---|---|---|
| Nhiệm vụ (3 × 0,2 TNC) + Rương ngày (0,2 TNC + 5 Muỗng Vàng) | 0,8 TNC của ngày game lúc nhận (mỗi phần 0,2 TNC làm tròn lên bội 1.000đ: 4k / 7k / 13k / 17k / 20k) | 16–28k (TNC 20–35k) | 52k (khoảng 65k) | 80k (100k) | 80k (100k) |
| Chuỗi "Ngày đầu ra phố" | Bước 2: 5k · 3: 5k · 4: 10k · 5: 15k · 6: 10k (M4; trước: 15k · 30k · 30k) | 10k (bước 2, 3) | 25k (bước 4, 5) | 10k (bước 6) | 0 (bước 7 thưởng Muỗng Vàng) |
| Chuỗi "Làm quen QR" | Chỉ Muỗng Vàng | 0 | 0 | 0 | 0 |
| Điểm danh Tuần Khai Trương (quy đổi) | Ô1 10 Muỗng Vàng + viền biển xe · Ô2 Phiếu Chợ Sớm · Ô3 10 Muỗng Vàng · Ô4 Bạt che mưa (đã có thì 20.000đ) · Ô5 Phiếu Chợ Sớm ×2 · Ô6 15 Muỗng Vàng · Ô7 Rương Khai Trương | 0 | khoảng 7k | 0 | khoảng 20k (danh nghĩa) |
| Hộp thư (quy đổi, kỳ vọng) | Thư chào mừng: 10 Muỗng Vàng + Phiếu Chợ Sớm; quà đời thường 10%/ngày × 0,3–0,6 TNC từ ngày thật 3 (cần ≥ 5 đánh giá, sao trung bình ≥ 3,8; tối đa 2 thư/tháng) | khoảng 5k | 0 | khoảng 4,5k | khoảng 4,5k |
| **Tổng thưởng** | | **35k** | **84k** | **94,5k** | **104,5k** |
| Lãi bán hàng | mục 9 (M4) | 65k | 253k | 389k | 404k |
| **Tỉ lệ thưởng / (lãi + thưởng)** | Mục tiêu 20–30%, trần 35% | **35%** | **25%** | **19,5%** | **20,6%** |

- Cả Chặng 1: thưởng 318k / (1.111k + 318k) = **22,3%** *(v0.3: 358k / (1.169k + 358k) = 23,4%; ngày thật 1–4: 31% / 28% / 22% / 20%)*.
- Trong đó tiền mặt thật vào ví (không tính hiện vật): khoảng 286k.
- **M4**: luật tip mới làm lãi mô hình giảm (mục 9), nên thưởng tiền chuỗi "Ngày đầu ra phố" giảm 85k → 45k (mục 16). Ngày thật 1 của mô hình chạm trần (35%) vì lãi ba ca đầu thấp (ngày 1–2 hóa đơn 1 món, chỉ khoảng nửa khách 5 sao có tip); đây là ngày cần đo kỹ ở người chơi thật (chỉ số 16). Nếu vượt: giảm thưởng bước 2–3 của chuỗi hoặc nhiệm vụ ngày 1–2 trước. Hàng hiếm (mục 14.5) không có ở ngày game 1–2; quy đổi lúc dùng (mục 10.3).
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

- Tổng khoảng **90 Muỗng Vàng** (mô phỏng M2 người chơi hoàn hảo: 85–90 sau 5 ngày thật). *M4: hàng hiếm dư (kho đầy hoặc quá trần 6 phần + 3 mảnh mỗi ngày thật) đổi 2 Muỗng Vàng mỗi phần/mảnh; người chơi giỏi ghé đủ 3 phiên hàng thường vượt trần ngày nên có thêm khoảng 7 Muỗng Vàng mỗi ngày thật (40 hạt giống: 34 Muỗng Vàng mỗi 5 ngày thật); mô phỏng M4: 115–135 Muỗng Vàng sau 5 ngày thật. Theo dõi ở chỉ số 19 và 29.* Chỗ tiêu ở MVP *(đã chỉnh theo bản chơi được)*: đổi nhiệm vụ (5/lần) và màu dù xe ở Góc Muỗng Vàng (30 mỗi màu, 3 màu). Đề xuất mua Cà phê sữa đá bằng 60 Muỗng Vàng không làm.
- Nguồn thêm trong mùa sự kiện: Quầy đổi Tem (50 Tem → 10 Muỗng Vàng, tối đa 5 lần = 50 Muỗng Vàng), quà lễ 20/10 và 20/11 (20 mỗi lần). Mô phỏng lượt có sự kiện Tri ân 20/11 (10 ngày thật): 205 Muỗng Vàng.
- Phần còn lại để dành cho Kệ Đặc biệt ở GĐ2. Nếu đo thấy tồn quá nhiều, giảm Muỗng Vàng ở thư chào mừng hoặc Ô3.

### 10.3 Số đo mô phỏng M2 (tỉ lệ thưởng)

Cùng mô phỏng ở mục 9.1. Tỉ lệ = thưởng / (lãi bán hàng + thưởng), tính theo tiền thật và cả khi quy đổi hiện vật (Phiếu Chợ Sớm = phần giá vốn tiết kiệm được, Bạt che mưa = 20.000đ, nâng cấp = giá bán):

- 5 ngày thật thường (seed 42, 7, 2024): 4,0–24,9% (quy đổi 5,2–26,5%). Cao nhất ở ngày thật 2 (thưởng chuỗi C1 bước 4–6).
- Lượt có sự kiện Tri ân 20/11 (17–26/11, seed 42): cao nhất **25,2%** ở ngày thật 7 (23/11, Rương Khai Trương); ngày có quà lễ 20/11 là 18,3%; ngày tất toán Tem dư (25/11) là 21,2%.
- Mọi ngày dưới trần 35%. Tỉ lệ thấp hơn bảng 10.1 vì lãi bán hàng của người chơi hoàn hảo cao hơn mô hình (mục 9.1).

**Số đo M4 bước 8** (bản 0.4.0, cùng test; người chơi giỏi ghé phiên hàng đang mở trước mỗi ca, nấu thử mở món hiếm, chọn cách an toàn). Quy đổi hàng hiếm **lúc dùng**, cùng cách với Phiếu Chợ Sớm (thiết kế M4 mục B.4): mỗi phần hàng hiếm dùng khi Ra món trong ngày tính bằng giá quy đổi (mục 14.5), vì nguyên liệu hiếm không trừ Tiền quán nên phần lãi thêm nằm trong lãi bán hàng. Phần mới nhận vào kho chưa là tiền (dư thì chỉ đổi Muỗng Vàng) nên không tính lúc nhận.

| Đo | Tiền thật | Quy đổi (có hàng hiếm) |
|---|---|---|
| Seed 42 / 7 / 2024, ngày thật 1–5 | cao nhất 22,0% (seed 7, ngày thật 2) | cao nhất 26,7% (seed 42, ngày thật 4) |
| Tri ân 20/11 (seed 42, 10 ngày thật) | cao nhất 31,2% (23/11, Rương Khai Trương) | 33,5% |
| 40 hạt giống từ 05/10/2026 (200 ngày thật) | cao nhất 32,5%; trung bình 18,1% / 16,1% / 13,5% / 14,0% / 13,5% (ngày thật 1–5) | cao nhất 33,8%; trung bình 20,0% / 19,8% / 17,7% / 21,7% / 21,4% |
| 40 hạt giống × 4 mốc bắt đầu (05/10/2026, 17/11/2026, 01/02/2027, 01/06/2027; 800 ngày thật) | cao nhất 32,5% | cao nhất 34,1% |

- **Trước khi giảm thưởng chuỗi "Ngày đầu ra phố"** (bước 4–6 là 15k / 30k / 30k): cùng 800 ngày thật, 44 ngày vượt 35% (cao nhất 41,7% quy đổi, 40,9% tiền thật), đều là ngày thật 1–2, khi người chơi giỏi xong liền bước 2–6 mà lãi ba ca đầu đã giảm vì luật tip. Ba hạt giống của test (42, 7, 2024) không lộ ra vì chuỗi xong rải trên hai ngày. Sau khi giảm (10k / 15k / 10k): 0 ngày vượt. Test "cân bằng M4: tỉ lệ thưởng ≤ 35% ở các hạt giống khó" khóa 8 lượt từng vượt trần (hạt giống 3, 13, 14, 21, 33, 36, 40 từ 05/10/2026 và 13 từ 01/02/2027).
- Nếu tính hàng hiếm **lúc nhận** (cách chặt hơn): 20/800 ngày vượt 35% (cao nhất 41,9%), đều ở ngày thật 1–2 khi kho đang tích (chưa mở món hiếm nào, ngày thật 1 dùng 0 phần); từ ngày thật 3 không ngày nào vượt. Hàng hiếm mỗi ngày thật: nhận trung bình 5,7 phần (23.800đ quy đổi, 6 phần = trần từ ngày thật 2), dùng 4,9 phần (22.000đ).

---

## 11. Dòng tiền ví Tiền quán (một đường chơi mẫu)

*(đã chỉnh theo bản chơi được: Cà phê sữa đá chỉ mua bằng Tiền quán 200k, không có lựa chọn 60 Muỗng Vàng.)*

| Ngày thật | Đầu ngày | + Lãi bán hàng | + Thưởng tiền | Mua | Cuối ngày |
|---|---|---|---|---|---|
| 1 | 200k | 65k | 30k | Dao thép tốt 150k | 145k |
| 2 | 145k | 253k | 77k | Bánh tráng trộn 250k; Chảo chống dính 200k | 25k |
| 3 | 25k | 389k | 94,5k | Loa báo tiền 150k; Cà phê sữa đá 200k | 158,5k |
| 4 | 158,5k | 404k | 84,5k | Ghế nhựa chờ 180k; Máy tính cầm tay 150k | **317k** (< 500k) |

*(M4: lãi theo luật tip mới (mục 9) và thưởng chuỗi mới (mục 10.1). Bảng v0.3: lãi 78k / 265k / 405k / 421k, thưởng tiền 30k / 97k / 114,5k / 84,5k, cuối ngày thật 4 còn 415k.)*

- Mua hết 2 món và 5 nâng cấp trong 4 ngày thật thì cuối ngày thật 4 còn khoảng 317k; muốn đủ 500k thì hoãn Ghế nhựa chờ và Máy tính cầm tay sang ngày thật 5. Cuối ngày thật 2 chỉ còn khoảng 25k: người chơi trung bình nên mua Chảo chống dính sau Bánh tráng trộn một ngày.
- Người chơi tiết kiệm (chỉ mua 1 món Shop và Dao) có đủ 500.000đ ngay từ ngày thật 3.
- Mô phỏng M2 (người chơi hoàn hảo, mua Bánh tráng trộn, Dao, Cà phê sữa đá, Loa): ví cuối ngày thật 3 là 0,88–1,04tr, cuối ngày thật 5 là 2,4–2,5tr. Tiền quán dư nhiều hơn mô hình vì lãi cao hơn (mục 9.1); sau khi mua hết, MVP chưa có chỗ tiêu Tiền quán lớn (lên Chặng 2 bị khóa ở MVP). *Mô phỏng M4 (mục 9.1): 0,65–0,69tr và 1,91–2,04tr.*
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

**Số đo M4 bước 8** (bản 0.4.0, cùng mô phỏng; người chơi trung bình không ghé phiên hàng, không nấu thử món hiếm, không xử lý tình huống): seed 42, 7, 2024: 150 danh tiếng ở ca 8 / 8 / 9, đủ mọi điều kiện ở ca 9 (không đổi so với M2–M3). Chạy rộng 40 hạt giống: đủ điều kiện ở ca 7 (2 hạt giống), ca 8 (19), ca 9 (19); M3 cùng 40 hạt giống: ca 8 (18), ca 9 (21), ca 10 (1). Cho người chơi trung bình xử lý tình huống bằng cách an toàn: ca 7 (2), ca 8 (22), ca 9 (16). Hai hạt giống ca 7 là do nhiều sự kiện tăng khách (Nắng nóng, Chợ phiên) sớm, không do một nguồn danh tiếng M4 cụ thể. Trung vị vẫn ca 8–9, nên theo luật trên **giữ 150** (chưa nâng 200); mục tiêu thiết kế "khoảng ca 10–15" vẫn chưa đạt như ở M2–M3 (ca 9). Nếu đo người chơi thật cũng thấy trước ca 8 thì nâng ngưỡng (chỉ số 17).

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

### 14.1 Sự kiện ngày (MVP, M2; tần suất và 8 sự kiện mới M4)

Từ ngày game 3, báo trước ở Tổng kết ca hôm trước. Dữ liệu: `src/data/day-events.js`. **M4 (tần suất "dày")**: mỗi ngày game có 65% xảy ra 1 sự kiện; 1 ngày không có sự kiện thì ngày kế chắc chắn có (bảo hiểm) → tỉ lệ thực khoảng **74%** (đo 12.000 ngày: 74,0%); không trùng loại hôm trước; Trật tự đô thị và Kiểm tra vệ sinh an toàn thực phẩm (M4 bước 4) cách nhau ≥ 7 ngày game; loại xấu từ ngày 5, không 2 ngày xấu liền; mức "Tần suất sự kiện" Ít chỉ bốc loại tốt. Bốc tuần tự tất định theo seed + ngày game + mức cài đặt nên "Ngày mai" luôn đúng. *(Trước M4: 30%/ngày, không bảo hiểm.)*

| Sự kiện | Loại, từ ngày | Trọng số | Hiệu ứng | Lựa chọn |
|---|---|---|---|---|
| Trời mưa | chọn, 3 | 13 | Khách ×0,8 (làm tròn, sàn 3); kiên nhẫn ×1,2 | Căng bạt 20.000đ → khách ×0,95 (miễn phí khi có Bạt che mưa) |
| Nắng nóng | tốt, 3 | 13 | +1 khách (trần 8); Trà tắc, Cà phê sữa đá được gọi ×2; dòng chưa có ghi chú có 35% được thêm "Ít đường" / "Ít ngọt" | — |
| Ngày lãnh lương | tốt, 3 | 10 | (M4) Khách gọi thêm món: số món mỗi đơn [60, 32, 8] thay [70, 25, 5], khoảng +8% số phần mỗi khách; không nhân tip | — |
| Chợ phiên | tốt, 3 | 10 | Khách ×1,3 (làm tròn, trần 10); lịch khách giãn để ρ ≤ 0,9; (M4) +1 lượt Giỏ chợ | — |
| Hội thi "Xe đẩy sạch, ngon" (M4) | tốt, 4 | 9 | Sao trung bình ca ≥ 4,5: Giải Nhất +20.000đ +5 danh tiếng; ≥ 4: Khuyến khích +10.000đ +2 (trần gainCap) | — |
| Văn phòng đặt 3 ly trà tắc (M4) | tốt, 4 | 9 | — | Nhận đơn (0đ): thêm 1 khách lấy 3 ly Trà tắc (30.000đ) giữa ca; giao đạt từ 4 sao +5.000đ |
| Đại lý trà tài trợ bảng hiệu (M4) | tốt, 6 | 7 | — | Nhận tài trợ (0đ): bán ≥ 3 ly Trà tắc +15.000đ, ít hơn +5.000đ (trần gainCap) |
| Tắc lên giá (M4) | xấu, 5 | 6 | Giá tắc ×2: Trà tắc +1.200đ giá vốn mỗi ly (bánh tráng trộn +400đ); tổng phần tăng ≤ lossCap; Phiếu Chợ Sớm giảm cả phần tăng | — |
| Tiền điện nước tăng (M4) | xấu, 5 | 5 | Chi phí cố định ca 20.000 → 25.000đ | — |
| Cúp điện theo lịch (M4) | chọn, 5 | 6 | Khách ×0,85; món có đá (Trà tắc, Cà phê sữa đá, Chè bưởi) được gọi ×0,5; Loa báo tiền tắt (không tự xác nhận, không chặn ảnh giả) | Mua đá cây 10.000đ → khách như thường, chỉ còn Loa tắt |
| Trật tự đô thị nhắc giữ vỉa hè (M4) | xấu, 5 | 6 | Hàng chờ (kể cả khách ở quầy) chạm 3 người → phạt 20.000đ 1 lần (trần min(20.000đ, lossCap) và trần ngày); Dì Sáu nhắc trước khi hàng 2 người | Thu gọn chỗ đứng (0đ, an toàn): tối đa 2 người chờ, người đến sau đi ngang |
| Kiểm tra vệ sinh an toàn thực phẩm (M4) | chọn, 6 | 6 | Cuối ca: không lỗi chưa sơ chế / bỏ bước / món hỏng / lấy nhầm → +3 danh tiếng; có lỗi lần đầu nhắc nhở; tái phạm trong 14 ngày game → phạt 20.000đ (trần) | Chuẩn bị đón đoàn 10.000đ → chắc chắn đạt, +5 danh tiếng |

Tỉ lệ loại theo trọng số: tốt 58%, chọn/xấu 42%. Vòng soát lỗi M4: sự kiện đã báo trước (hôm nay ở màn Chuẩn bị, ngày mai ở Tổng kết) được chốt, đổi mức "Tần suất sự kiện" chỉ áp cho ngày chưa báo; sự kiện ngay trước trên dòng thời gian chung là loại xấu thì ngày chốt không bốc loại xấu (chỉ đổi loại, tỉ lệ ngày có sự kiện không đổi). Đo lại (30 hạt giống × 60 ca, 3 ca mỗi ngày thật, luôn chọn cách an toàn): mức Vừa 0 cặp xấu liền nhau (trước khi sửa 12,6% sự kiện ngày xấu đứng ngay sau tình huống xấu), sự kiện ngày xấu 10,1% số ca, tình huống xấu 10,1% số ca; mức Nhiều 0 cặp; tỉ lệ ca có ≥ 1 tình huống mức Vừa 58,3%, ngày có sự kiện 73,3%. Trật tự đô thị và Kiểm tra ATTP cách nhau ≥ 7 ngày game. Mức Ít bỏ Trời mưa, Tắc lên giá, Tiền điện nước, Cúp điện, Trật tự đô thị, Kiểm tra ATTP (chỉ loại tốt). Mọi tiền chọn ở màn Chuẩn bị (Căng bạt, Mua đá cây, Chuẩn bị đón đoàn) trả lúc mở ca, không tính vào lãi ca.

Tần suất đo (dữ liệu thật, 200 hạt giống × ngày 3–60, mức Vừa): có sự kiện 73,9% số ngày; Trời mưa 13,9%, Nắng nóng 13,2%, Ngày lãnh lương 11,2%, Chợ phiên 10,7%, Hội thi 9,6%, Văn phòng đặt 3 ly 9,3%, Tài trợ 7,0%, Cúp điện 6,4%, Tắc lên giá 5,7%, Tiền điện nước 4,9%, Trật tự đô thị 4,1%, Kiểm tra ATTP 4,0% (tính trên các ngày có sự kiện). *(Trước M4: 4 sự kiện, 30%/ngày; trọng số 30/30/20/20.)*

### 14.2 Tình huống trong ca (MVP, M3)

Dữ liệu: `src/data/incidents.js` (`INCIDENT_CONFIG`, `INCIDENTS`). Từ ngày game 3, bốc theo seed của save + ngày game. **M4 (tần suất "dày")**: tối đa 2 tình huống mỗi ca (mức Ít 1), hai tình huống cách nhau ít nhất 2 khách, không 2 loại xấu trong cùng ca, không 2 sự kiện xấu liền nhau trên dòng thời gian chung (sự kiện ngày lúc mở ca rồi các tình huống: tình huống xấu cuối ca không đứng liền sự kiện ngày xấu của ca sau và ngược lại; vòng soát lỗi M4).

| Tham số | Giá trị | Ghi chú |
|---|---|---|
| Xác suất lần 1 mỗi ca (`chance`) | Nhiều 75% · Vừa 55% (mặc định) · Ít 30% | Mức Ít chỉ gồm tình huống loại tốt (Khách mở hàng, Khách quên ví, Ve chai, Đoàn khách hỏi đường, Khách quê gửi quà), không có khoản phạt. *Trước M4: 50% / 35% / 15%* |
| Xác suất lần 2 (`secondChance`) | Nhiều 45% · Vừa 30% · Ít 0 | Chỉ khi đã có lần 1 và ca từ 6 khách |
| Bảo hiểm (`guaranteeAfter`) | Nhiều 1 ca · Vừa 2 ca · Ít 3 ca | Số ca liền (từ ngày 3) không có tình huống → ca kế chắc chắn có ít nhất 1. Tỉ lệ thực ca có ≥ 1 tình huống (đo 3.600 ca mỗi mức): Nhiều 79,8% · Vừa 59,9% · Ít 39,5%; ca có 2 tình huống: 36,4% · 18,6% · 0 |
| Loại (`kind`) | tốt / chọn / xấu | Khách mở hàng: tốt; Ghi nợ, Khách đổi ý: chọn. Loại xấu (M4 bước 5) từ ngày 5; tình huống trước loại xấu hoặc lỗ ≥ 50% trần → lần sau chỉ loại tốt hoặc loại chọn không có phạt; ngày có sự kiện ngày loại xấu → không bốc loại xấu |
| Trần tiền thưởng (`gainCap`, M4) | min(15% doanh thu dự kiến của ca, 0,75 TNC), làm tròn xuống bội 1.000đ | Loại có thể thưởng vượt trần không được bốc |
| Không lặp (`noRepeat`) | 5 tình huống gần nhất | M4: 11 loại (9 loại bốc được khi chưa có dữ liệu hàng hiếm) |
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

**M4 bước 5: tám tình huống chạy theo dữ liệu** (trọng số: Ghi nợ và Khách đổi ý 1 → 1,2). Mức Vừa theo trọng số: tốt 44,6%, chọn 42,9%, xấu 12,5%; mức Ít 5 loại tốt, không có khoản phạt. Kết quả bốc 1 lần lúc mở tình huống (dùng chung cho mọi lựa chọn, tải lại không đổi). Thiệt hại tối đa tự tính = tiền mất + tiền chi + giá vốn − tiền bán − tiền thưởng; tình huống có thiệt hại hoặc tiền thưởng tối đa vượt trần của ca không được bốc.

| Tình huống (loại, từ ngày, w) | Lựa chọn (an toàn *) | Tiền | Thiệt hại / thưởng tối đa | Kỳ vọng tiền |
|---|---|---|---|---|
| Tờ 20.000đ nghi giả (xấu, 5, 0,7) | *Soi kỹ: 50% tiền thật bán được, 50% từ chối 0đ · Mời QR (cần QR): bán được · Nhận luôn: 50% mất 10.000đ tiền thối + 3.000đ giá vốn | +10.000 −3.000 | 13.000đ / 0 | +3.500 / +7.000 / −3.000 |
| Người giao hàng nói đã chuyển khoản (chọn, 5, 1,2; cần QR) | *Chờ tiền về: 75% bán 2 ly, 25% đơn hủy 0đ (có Loa: lựa chọn xanh) · Giao luôn: 25% mất 6.000đ | +20.000 −6.000 | 6.000đ / 0 | +10.500 / +9.000 |
| Bình gas mini hết (xấu, 5, 0,7; thực đơn có bếp gas) | Mua bình −12.000đ (chi mua) · *Mượn bếp: −3.000đ giá vốn, +1 danh tiếng, ngân sách chờ món ×0,9 tới cuối ca | −12.000 / −3.000 | 12.000đ / 0 | −12.000 / −3.000 |
| Khách bỏ quên ví (tốt, 3, 1) | *Cất giữ: 70% +10.000đ cảm ơn, luôn +2 danh tiếng · Báo loa: +1, 60% +1 phần hàng hiếm | +10.000 | 0 / 10.000đ | +7.000 / 0 |
| Cô Hai ve chai (tốt, 3, 1; đã bán ≥ 3 phần) | *Bán: 1.000đ mỗi phần đã bán, tối đa 8.000đ · Cho: +3 danh tiếng | ≤ 8.000 | 0 / 8.000đ | ≤ +8.000 / 0 |
| Đoàn khách hỏi đường (tốt, 4, 1) | *Chỉ đường: +2 danh tiếng · Mời mua 2 ly: +20.000đ −6.000đ | +14.000 | 0 / 0 | 0 / +14.000 |
| Khách quen từ quê gửi quà (tốt, 3, 1; kho hàng hiếm còn chỗ) | Mời trà: −3.000đ, +2, +1 phần hiếm · *Nhận: +1 phần hiếm | −3.000 | 3.000đ / 0 | −3.000 / 0 |
| Cô bán dạo mời hàng hiếm (chọn, 4, 1,2; có công thức hiếm, kho còn chỗ) | Mua 2 phần −8.000đ · Mua 1 phần −4.000đ · *Hẹn bữa khác | −8.000 (chi mua) | 8.000đ / 0 | −8.000 / −4.000 / 0 |

Tiền thưởng vào "Tiền từ sự kiện" (ví nhận lúc tất toán), tiền mất và tiền chi vào "Phạt, chi sự kiện" (trừ ví ngay); tiền mất tính vào trần phạt ngày thật (vượt thì Dì Sáu đỡ giùm), tiền tự chi mua thì không. Hai tình huống hàng hiếm chỉ bốc được khi đã có dữ liệu hàng hiếm (bước sau). Tần suất đo với dữ liệu thật (3.000 ca mức Vừa, ngày 3–14): Ghi nợ 15%, Khách đổi ý 15%, Ve chai 13%, Khách quên ví 12%, Người giao hàng 12%, Đoàn khách 12%, Khách mở hàng 9%, Gas hết 6%, Tiền nghi giả 5%; theo loại: tốt 46%, chọn 43%, xấu 11%. *M4 bước 6 (đã có dữ liệu hàng hiếm, người chơi chưa có công thức hiếm nên chưa có Cô bán dạo): Khách đổi ý 14%, Ghi nợ 12%, Ve chai 12%, Đoàn khách 12%, Khách quên ví 11%, Người giao hàng 10%, Khách quê gửi quà 10%, Khách mở hàng 8%, Tiền nghi giả 5%, Gas hết 4%; theo loại: tốt 54%, chọn 37%, xấu 9%.*

### 14.3 Làm tròn tiền (M3)

- Giá vốn mỗi lần nấu và hao hụt làm tròn bội 500đ gần nhất (`roundCost`, sau hệ số giá vốn); phí làm lại bước cũng vậy.
- Mọi thưởng Tiền quán (quy đổi từ TNC, thưởng cố định, quà hộp thư, nhiệm vụ, điểm danh, chuỗi) và nợ Dì Sáu làm tròn **lên** bội 1.000đ (`roundReward`).
- Save cũ (M1, M2) có ví lẻ (vd 437.250đ): `save.migrate` làm tròn **lên** bội 500đ một lần khi nạp (có lợi cho người chơi; đang dở ca thì mốc ví đầu ca dời theo để bất biến ví ca vẫn đúng); kỷ lục lãi ca lẻ làm tròn lên bội 500đ, nợ Dì Sáu lẻ làm tròn xuống bội 500đ, quà thư chưa nhận lên bội 1.000đ.
- Hệ quả: Tiền quán luôn là bội 500đ (test mô phỏng 7 ngày thật × 3 ca). Phiếu Chợ Sớm (giá vốn ×0,8) sau làm tròn giảm khoảng 17–22% tùy món (Bánh mì ốp la 9.000 → 7.000đ, Trà tắc 3.000 → 2.500đ, Bánh tráng trộn 8.000 → 6.500đ, Cà phê sữa đá 5.000 → 4.000đ).

### 14.4 Sự kiện thưởng/phạt (M4): số đo

Người chơi hoàn hảo, ngày 9, 3 món, 360 ca (60 hạt giống × 6 ca), mức Vừa:

| Cách chọn | Tiền từ sự kiện mỗi ca | Phạt, chi sự kiện mỗi ca | Tiền sự kiện ngày (ròng) | Tiền tình huống (ròng, gồm lãi bán) |
|---|---|---|---|---|
| Luôn chọn cách an toàn, nhận mọi lựa chọn miễn phí | +3.367đ | 0 | +2.319đ | +2.381đ |
| Chọn luân phiên (có khi không an toàn) | +2.408đ | −333đ | +1.931đ | +1.644đ |

Chi phí cố định tăng thêm trung bình 153đ mỗi ca (Tiền điện nước). Kỳ vọng mỗi sự kiện hơi dương, đúng hướng thiết kế B.4 (khoảng +5,8% TNC mỗi ca khi tính cả sự kiện ngày có trọng số); phần thưởng nghiêng về người chơi phục vụ giỏi (Hội thi, tiền đúng hẹn). Tỉ lệ thưởng cao nhất trong mô phỏng meta (`META_SIM_LOG=1`): 32,5% (Tri ân 20/11, seed 42, ngày thật 7), dưới trần 35%.

**Số đo M4 bước 8** (mô phỏng meta, người chơi giỏi 3 ca mỗi ngày thật, 40 hạt giống × 5 ngày thật từ 05/10/2026, mức Vừa, luôn chọn cách an toàn và nhận mọi lựa chọn có lợi ở màn Chuẩn bị; 520 ca từ ngày game 3):

| Chỉ số | Thiết kế (B.2, B.4, quyết định "dày") | Đo |
|---|---|---|
| Ca có sự kiện ngày | khoảng 74% ngày game | 72,7% |
| Ca có ≥ 1 tình huống / có 2 tình huống | khoảng 60% / — | 55,0% / 18,7% (0,74 tình huống mỗi ca) |
| Loại tình huống gặp (tốt / chọn / xấu) | 44,6 / 42,9 / 12,5% theo trọng số | 46,7 / 41,5 / 11,7% (383 tình huống; Ghi nợ và Khách đổi ý 12% mỗi loại, Khách quê gửi quà 11%, Ve chai 10%, Khách quên ví 9%, Người giao hàng 9%, Khách mở hàng 8%, Cô bán dạo 8%, Đoàn khách 8%, Gas hết 7%, Tiền nghi giả 5%) |
| Tiền từ sự kiện mỗi ca (sự kiện ngày + tình huống) | +5,8k tổng sự kiện (gồm phần bán hàng tăng giảm) | +2,8k tiền sự kiện riêng; phạt, chi sự kiện 0đ khi luôn chọn an toàn |
| Tip mỗi ca ngày 9 (mô hình mục 9) | −5,8k | −4,1k (16,7k → 12,6k) |
| Món hiếm (người chơi ghé đủ 3 phiên hàng) | khoảng 1,5 phần mỗi ca × 7,5k = +11k | khoảng 2,5 phần mỗi ca từ ngày thật 3 × 7,4k lãi thêm so với món nền = khoảng +18k |

- Lãi thêm mỗi phần món hiếm so với món nền (giá bán cao hơn, Tiền quán chỉ trả phần nguyên liệu thường): Trà tắc mật ong rừng +5,5k, Bánh mì trứng gà ta +10k, Bánh tráng trộn Tây Ninh +6,5k, Cà phê muối +7,5k.
- Kết luận: người chơi trung bình mất khoảng 4k mỗi ca vì tip, được lại khoảng 3k tiền sự kiện; người chơi chịu lựa hàng và bán món hiếm lời thêm rõ rệt (thưởng cho kỹ năng, đúng hướng B.4). Tỉ lệ thưởng (có hàng hiếm quy đổi) ≤ 35% mọi ngày thật: mục 10.3.

### 14.5 Nguyên liệu và món hiếm (M4)

**Năm nguyên liệu hiếm** (lấy từ kho `state.rare`, không trừ Tiền quán; giá quy đổi để tính giá vốn tham khảo và giá trị hiện vật):

| Nguyên liệu | ★ | Quê | Giá quy đổi 1 phần | Món dùng | Hàng thường dễ nhầm |
|---|---|---|---|---|---|
| Mật ong rừng U Minh | ★2 | Cà Mau | 3.300đ | Trà tắc mật ong rừng | đường, đường phèn |
| Trứng gà ta | ★1 | Long An | 7.000đ (2 quả × 3.500đ) | Bánh mì trứng gà ta | trứng gà, trứng vịt |
| Muối tôm Tây Ninh | ★1 | Tây Ninh | 1.500đ | Bánh tráng trộn Tây Ninh | muối, sa tế |
| Khô mực Phan Thiết | ★2 | Bình Thuận | 4.100đ | Bánh tráng trộn Tây Ninh | khô bò |
| Cà phê hạt Buôn Ma Thuột | ★2 | Đắk Lắk | 3.700đ | Cà phê muối | cà phê phin, cà phê hòa tan |

**Kho và trần**: tối đa 6 phần mỗi loại; mỗi ngày thật nhận tối đa 6 phần + 3 mảnh công thức (mọi nguồn trừ hàng tự bỏ tiền mua ở Cô bán dạo và phần thưởng cố định của thư/chuỗi); phần dư đổi 2 Muỗng Vàng mỗi phần/mảnh. Hàng hiếm không hết hạn (M4). Giá trị quy đổi tối đa mỗi ngày khoảng 6 × 3.900đ ≈ 23.000đ.

**Nguồn**

| Nguồn | Luật | Kỳ vọng mỗi lần |
|---|---|---|
| Gánh hàng quê (3 khung giờ thật: Chợ sớm 05:00–09:00, Xe ba gác trưa 11:00–13:30, Gánh đặc sản tối 17:30–21:00; từ ngày game 3; 1 lượt mỗi khung mỗi ngày thật; khóa khi lùi giờ; chỉ ngoài ca) | Mini-game "Lựa hàng" (bước Chọn nguyên liệu, kệ 9 ô: 2 món hàng hiếm, hàng thường dễ nhầm, hàng thường khác). Luôn 1 phần (món kho cần nhất); từ 90 điểm thêm 1 phần; từ 75 điểm 50% ra 1 mảnh | Người chơi cẩn thận: 2 phần + 0,5 mảnh |
| Khách lạ (ca đầu mỗi ngày thật, từ ngày game 3) | 5 sao: 2 phần; 4 sao: 1 phần; 3 sao: 1 mảnh; dưới 3 sao: cảm ơn | Người chơi trung bình (40% 5 sao, 45% 4 sao): khoảng 1,3 phần |
| Giỏ chợ (chuỗi Quầy chuẩn 5 khách, tối đa 1 lượt mỗi ca; Chợ phiên +1) | 40% ra 1 phần nguyên liệu, 60% ra 1 mảnh; 2 lượt liền không ra nguyên liệu thì lượt 3 chắc chắn có; 3 lần liền không ra mảnh thì lần sau chắc chắn có mảnh (tỉ lệ thực ra nguyên liệu ≈ 49%); không còn món nhận mảnh → 100% nguyên liệu | 0,5 phần + 0,5 mảnh |
| Tình huống: Khách quê gửi quà (tốt), Khách quên ví (báo loa, 60%), Cô bán dạo (mua 4.000đ/phần, biết trước món gì) | Mục 14.2 | — |

**Mảnh công thức**: chỉ rơi cho món đã có món nền, ưu tiên món đang gom dở; bảo hiểm 3 lần liền (phiên hàng từ 75 điểm, Giỏ chợ) không ra mảnh thì lần sau chắc chắn có. Đủ 3 mảnh → nấu thử (không tính giờ, có gợi ý, không tốn hàng hiếm, thử lại không giới hạn) đạt hạng Được là mở món.

**Số đo (5 hạt giống, người chơi tốt 3 ca mỗi ngày thật, mua Bánh tráng trộn ngày game 2, Cà phê sữa đá ngày game 4, nấu thử ngay khi đủ mảnh)**:
- Không ghé phiên hàng (chỉ khách lạ, Giỏ chợ, tình huống): món hiếm đầu tiên ở ngày thật 2–4, món thứ 3 ở ngày thật 6–7, Cà phê muối ở ngày thật 8 (2/5 hạt giống).
- Ghé 2 phiên hàng mỗi ngày (điểm 100): món đầu tiên ngày thật 2, đủ 4 món ở ngày thật 5–6 (khớp mục tiêu nhịp của thiết kế: món đầu ngày thật 1–2, đủ 4 món ngày thật 4–6); bán 5–8 phần món hiếm mỗi ngày thật (khoảng 2 phần mỗi ca), kho cuối thường 0–2 phần mỗi loại (hàng được dùng hết, ít dư đổi Muỗng Vàng).
- Mô phỏng meta bước 6 (người chơi không ghé phiên hàng): tỉ lệ thưởng cao nhất vẫn 32,5% (Tri ân 20/11, seed 42, ngày thật 7), đủ điều kiện lên Chặng 2 ở ngày thật 3; người chơi trung bình đạt 150 danh tiếng ở ca 8–9.
- **Mô phỏng meta bước 8** (`tests/unit/integration-meta.test.mjs`, người chơi giỏi 3 ca mỗi ngày thật lúc 08:00 / 12:00 / 17:30, ghé phiên hàng đang mở trước mỗi ca với điểm 100, nấu thử ngay khi đủ mảnh; 40 hạt giống × 5 ngày thật):
  - Phiên hàng: ngày thật 1 chỉ 1 phiên (Gánh đặc sản tối, ca 17:30 là ngày game 3), từ ngày thật 2 đủ 3 phiên; trung bình 2,6 phiên mỗi ngày thật.
  - Hàng hiếm mỗi ngày thật: nhận 4,5 phần ở ngày thật 1, đúng trần 6 phần từ ngày thật 2 (trung bình 5,7 phần, 23.800đ quy đổi) và 2,3 mảnh; dùng (bán) 0 / 2,2 / 6,6 / 8,2 / 7,4 phần ở ngày thật 1–5 (trung bình 4,9 phần, 22.000đ). Phần vượt trần đổi Muỗng Vàng: khoảng 34 Muỗng Vàng mỗi 5 ngày thật.
  - Mở món hiếm: món đầu tiên ở ngày thật 2 (34/40 hạt giống) hoặc 3 (6/40); sau 5 ngày thật có 3 món (20/40) hoặc đủ 4 món (20/40), khớp mục tiêu nhịp (món đầu ngày thật 1–2, đủ 4 món khoảng ngày thật 4–6). Chạy thêm 3 mốc bắt đầu (17/11/2026, 01/02/2027, 01/06/2027): món đầu ở ngày thật 2 trong 85% lượt.
  - Kho cuối ngày thật 5 (cộng 5 loại): trung vị 4 phần, cao nhất 7 phần; không loại nào vượt 6.
  - Tỉ lệ thưởng tính cả hàng hiếm quy đổi lúc dùng: cao nhất 33,8% (mục 10.3).

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
| 16 | Tỉ lệ thưởng mỗi ngày thật (M4: tính cả hàng hiếm quy đổi lúc dùng, mục 10.3) | 20–30%, không ngày nào > 35%; theo dõi kỹ ngày thật 1 (mô hình chạm 35%) | Giảm thưởng nhiệm vụ trước (ngày thật 1: thưởng bước 2–3 chuỗi "Ngày đầu ra phố") |
| 17 | Ca và ngày thật đạt từng điều kiện lên Chặng 2 | Ca 10–15, ngày thật 3–4 | Chỉnh ngưỡng danh tiếng (mục 13) |
| 18 | Thời điểm mua món Shop đầu tiên; tỉ lệ nấu thử rồi mua | Ca 4–6 | Giá Shop |
| 19 | Muỗng Vàng tồn cuối Chặng 1; số màu dù đã mua | 20–40 | Giảm nguồn Muỗng Vàng hoặc thêm chỗ tiêu |
| 20 | Tỉ lệ bật Hỗ trợ; lãi người bật so với người không bật | Người bật không lãi hơn | Siết thêm (trần món ở hạng Ngon khi bật Hỗ trợ thao tác) |
| 21 | Chênh lãi người 4,7 sao so với 3,8 sao | ≥ 25% | Tăng tip, tăng ảnh hưởng của sao lên số khách |
| 22 | Số lần vay Dì Sáu | Hiếm (< 10% người chơi) | Tăng vốn đầu hoặc giảm chi phí cố định |
| 23 | Tỉ lệ quay lại ngày thật 2 và 3 (quan sát nhóm thử) | Ghi nhận định tính | Xem lại điểm danh, nhiệm vụ, chuỗi |
| 24 | Số phần mỗi khách ngày 3–4 và cảm nhận độ khó khi đơn nhiều dòng mở từ ngày 3 | Người mới không bị ngợp | Lùi `multiLineFromDay` về 4 (mục 3.1) |
| 25 | Số ngày thật chơi trong mùa sự kiện; tỉ lệ nhận được Chè bưởi; Tem dư cuối mùa | ≥ 70% người chơi 3 ngày trở lên nhận được món | Nới cổng chuỗi hoặc giảm chỉ tiêu bước 4–5 |
| 26 | Tần suất sự kiện cảm nhận (M4): tỉ lệ ngày game có sự kiện ngày, ca có tình huống, ca có 2 tình huống; người chơi thấy "vừa" hay "dày quá" | Mức Vừa: khoảng 74% ngày, 55–60% ca có ≥ 1 tình huống, khoảng 19% ca có 2 (mô phỏng mục 14.4); đa số người thử không đổi sang mức Ít | Nhiều người đổi sang Ít hoặc than phiền: giảm `chance`/`secondChance` mức Vừa, nới `guaranteeAfter`; ngược lại tăng |
| 27 | Tỉ lệ chọn lựa chọn an toàn ở tình huống và sự kiện ngày (M4); tỉ lệ bị phạt thật | Người mới 50–80% chọn an toàn, giảm dần khi quen; bị phạt < 10% số sự kiện có phạt | Gần 100% an toàn: lựa chọn khác chưa hấp dẫn hoặc quá rủi ro (tăng tiền thưởng trong trần); bị phạt nhiều: làm rõ lời nhắc trước, cách an toàn |
| 28 | Số phần món hiếm bán mỗi ngày thật (M4) | Người ghé phiên hàng: 5–8 phần (mô phỏng 6,6–8,2 từ ngày thật 3); người không ghé: 1–3 phần | Thấp: tăng `orderWeight` hoặc sản lượng phiên hàng; cao làm tỉ lệ thưởng > 35%: giảm `dailyCap` |
| 29 | Tồn kho hàng hiếm cuối ngày thật và Muỗng Vàng đổi từ phần dư (M4) | Tồn 0–3 phần mỗi loại; phần dư ≤ 30% số phần và mảnh được tặng (mô phỏng người chơi giỏi ghé đủ 3 phiên: khoảng 30%, trung vị tồn 4 phần cả 5 loại) | Tồn cao, dư nhiều: tăng `orderWeight`, giảm sản lượng (Giỏ chợ, khách lạ) hoặc giảm `overflowGold`; tồn luôn 0 và khách hay không gọi được món hiếm: tăng nguồn |
| 30 | Điểm trung bình từng thao tác mới (M5): Đập trứng, Khuấy, Gọt vỏ, Lắc, Thả đá; tỉ lệ bị trừ 15 vì quá mốc max(2 × par, sàn giờ) (nhất là Khuấy đều par 2, mục 7.1); tỉ lệ lắc quá tay ở Lắc rổ áo bột năng (`maxRatio` 1,2); Q trung bình của 9 món so với bản 0.4 | Người chơi trung bình: mỗi thao tác ≥ 75, gần các bước nó thay ở bản 0.4; Q mỗi món giảm không quá 3 điểm; bị trừ vì quá giờ < 15% số lượt (mô phỏng sau vòng sửa: Khuấy đều 8,7%); áo bột Hoàn hảo gần bản 0.4 (mô phỏng 0.4.1: TB 88%, ẩu 45%) | Đập trứng thấp: nới vùng xanh (vd [0,38; 0,72]); Khuấy đều hay bị trừ: tính đồng hồ từ lúc chạm đầu tiên hoặc nới sàn khuấy (đang 1,4 × vòng + 1); áo bột quá dễ hoặc quá khó: chỉnh `maxRatio`; không đổi par |
| 31 | Thời gian thật mỗi lượt nấu khi có thẻ "Bước k/N" (1,1 giây mỗi bước, 3 lần nấu đầu của món), con dấu (0,7 giây) và màn ra món (2,2 giây) (M5) | Không làm khách chờ quá ngân sách nhiều hơn bản 0.4 (chỉ số 7) | Rút thời gian thẻ bước hoặc màn ra món (chạm để bỏ qua đã có); không đổi par |

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
| 30/09/2026 | — | M4 bước 1–3: tip 5.000đ duy nhất khi 5 sao và hóa đơn khách thực trả từ 20.000đ, bỏ tip 10.000đ (mục 1, 7); khách khó tính 5 sao +1 danh tiếng; chuỗi "Quầy chuẩn" 5 → lượt Giỏ chợ; Ngày lãnh lương → khách gọi thêm món (14.1); sổ tiền sự kiện `eventIn`/`eventOut`, trần ngày thật 1 TNC; tần suất "dày": sự kiện ngày 65% + bảo hiểm 1 ngày (thực 74%), tình huống tối đa 2 mỗi ca, Nhiều/Vừa/Ít 75/55/30% + bảo hiểm 1/2/3 ca (thực 80/60/40%) (14.1, 14.2) | Quyết định của người dùng (docs/tham-khao/m4-thiet-ke.md); mô phỏng người chơi hoàn hảo (seed 42/7/2024): tỉ lệ thưởng cao nhất 32,0% (ngày thật 2, dưới trần 35%), vẫn đủ điều kiện lên Chặng 2 ở ngày thật 3; người chơi trung bình đạt 150 danh tiếng ở ca 8–9, đủ điều kiện ở ca 9 |
| 30/09/2026 | — | M4 bước 4–5: 8 sự kiện ngày mới (trọng số cũ 30/30/20/20 → 13/13/10/10, tổng 100; mục 14.1), 8 tình huống chạy theo dữ liệu (Ghi nợ, Khách đổi ý w 1 → 1,2; mục 14.2), thẻ Mẹo nghề 20 → 24, số đo tiền sự kiện (14.4) | Thiết kế docs/tham-khao/m4-thiet-ke.md mục B.2, B.3; đo: sự kiện ngày 73,9%/ngày, tỉ lệ loại tình huống mức Vừa 46/43/11%, kỳ vọng từng lựa chọn khớp bảng B.3; tỉ lệ thưởng cao nhất 32,5% (< 35%), vẫn đủ điều kiện lên Chặng 2 ở ngày thật 3; người chơi trung bình đạt 150 danh tiếng ở ca 8–9 |
| 30/09/2026 | — | M4 bước 6: nguyên liệu và công thức hiếm (mục 2.1b, 14.5): 5 nguyên liệu, 4 công thức `hiem`, kho 6 phần/loại, trần ngày thật 6 phần + 3 mảnh, gánh hàng quê 3 khung giờ, khách lạ ca đầu mỗi ngày thật, Giỏ chợ 40/60 + bảo hiểm 2 lượt | Thiết kế docs/tham-khao/m4-thiet-ke.md mục C, khung giờ theo quyết định của người dùng; đo: có ghé phiên hàng thì đủ 4 món ở ngày thật 5–6, bán 5–8 phần món hiếm mỗi ngày; Giỏ chợ tỉ lệ thực 51% nguyên liệu; tỉ lệ thưởng cao nhất vẫn 32,5% (< 35%) |
| 30/09/2026 | — | M4 bước 7–8: save v3, bản 0.4.0, thư phiên bản 0.4.0 (quà làm quen 1 mảnh Trà tắc mật ong rừng + 1 phần Mật ong rừng, chỉ save cũ nhận). Chuỗi "Ngày đầu ra phố" thưởng tiền bước 4 / 5 / 6: 15k / 30k / 30k → 10k / 15k / 10k (cả chuỗi 85k → 45k; mục 10.1, 11). Tỉ lệ thưởng quy đổi tính hàng hiếm lúc dùng (như Phiếu Chợ Sớm; mục 10.3). Mô hình mục 9 tính lại tip (1.000 / 1.440 / 1.660đ mỗi khách phục vụ). Thêm chỉ số 26–29 (mục 15) | Mô phỏng meta mở rộng (người chơi giỏi ghé phiên hàng, nấu thử món hiếm, chọn an toàn) với 40 hạt giống × 4 mốc bắt đầu: trước khi giảm, 44/800 ngày thật vượt trần 35% (39 ngày thật 1, 5 ngày thật 2; cao nhất 41,7% quy đổi, 40,9% tiền thật) vì luật tip mới làm lãi 3 ca đầu giảm khoảng 40% mà chuỗi hướng dẫn trả gần hết vào ngày thật 1–2 (thiết kế A.5 đã dự phòng giảm bước 5 xuống 20k; đo thấy chưa đủ: 40 hạt giống từ 05/10/2026 vẫn cao nhất 38,5% tiền thật, 44,2% quy đổi lúc nhận). Sau khi giảm: 0/800 ngày vượt, cao nhất 34,1% (tiền thật 32,5%). Người chơi trung bình: đủ điều kiện ca 9 (3 hạt giống), 40 hạt giống ca 7–9 (2 hạt giống ca 7) → giữ ngưỡng 150 (mục 13). Chỉ số 21: hoàn hảo lãi hơn ẩu 835% (ngày 1–3) |
| 30/09/2026 | — | Vòng soát lỗi M3: ly trà "mở hàng" khi ca sau đã đủ 8 khách → +2 danh tiếng thay khách thêm (mục 14.2); save cũ ví lẻ làm tròn lên bội 500đ khi nạp (mục 14.3) | Từ ngày 9 (8 khách) lựa chọn an toàn trừ giá vốn mà không được gì; 28/36 save M1/M2 thử nạp vẫn giữ ví lẻ |
| 30/09/2026 | — | Vòng soát lỗi M4 (lần 2): luật "không 2 sự kiện xấu liền nhau" xét chung sự kiện ngày và tình huống (14.1, 14.2); sự kiện ngày đã báo được chốt; Giỏ chợ thêm bảo hiểm mảnh (14.5: tỉ lệ thực nguyên liệu 51% → 49%); lựa hàng lưu rổ dở và lần chọn nhầm; trần tiền sự kiện ngày thật không mở lại khi lùi giờ; hủy ca dở hoàn cả tiền sự kiện; dòng tiền thưởng sự kiện ghi "tối đa" | Kết quả soát lỗi: 12,6% sự kiện ngày xấu đứng ngay sau tình huống xấu; đổi Vừa ↔ Ít ở màn Chuẩn bị bốc lại được sự kiện đã báo (606/1.120 ngày đổi); tải lại trang khi lựa hàng luôn được 100 điểm; Giỏ chợ có chuỗi 6 lượt liền không ra mảnh; Giải Nhất bị kẹp theo doanh thu ca (5/98 lần) mà thẻ hứa +20.000đ |
| 02/10/2026 | — | M5 Đợt 1 (bản 0.5.0): 15 bước đổi sang 5 thao tác mới (đập trứng, khuấy, gọt vỏ, lắc, thả đá), giữ id, par, w, chí mạng, giá làm lại, giá, vốn và `BALANCE`; thêm sàn giờ theo số lượng cho 5 thao tác mới (mục 7.1); thêm chỉ số 30–31 (mục 15). Màn ra món 1,2 → 2,2 giây (chạm để bỏ qua), `SHEET_MS` giữ 2 giây | Thiết kế `docs/tham-khao/m5-thiet-ke.md` mục 0, 1.5, 1.6 và quyết định của người dùng (Q6, Q7); bất biến khóa bằng `tests/unit/m5-balance.test.mjs` (so từng bước với bản 0.4.1). Bản đầu (sàn khuấy 1,1 × vòng + 1): sàn giờ chỉ thắng 2,5 × par ở 4 chỗ (Thêm trứng 5,5 giây; gọt 2 phần 13; khuấy ly 2 phần 7,6; đánh sữa muối 2 phần 14,2). Bộ giải tự động của các gói làm mini-game đạt 100 ở các ca thử 4 khung màn hình; riêng Khuấy đều giải bằng cảm ứng CDP lúc đó được 85 (bị trừ 15 vì quá 2 × par) — đã sửa ở dòng dưới, nay được 100 |
| 02/10/2026 | — | M5 Đợt 1, vòng sửa sau kiểm chứng (vẫn bản 0.5.0): mốc trừ 15 vì quá giờ của khuấy, gọt, lắc = max(2 × par, sàn giờ) (`overtimeAt`) thay cho 2 × par; sàn khuấy 1,1 → 1,4 × vòng + 1, nên giới hạn giờ Khuấy đều 1 phần 5 → 5,2 giây, 2 phần 7,6 → 9,4; Trộn đều 2 phần 14 → 15; Đánh sữa muối 2 phần 14,2 → 17,8 (mục 7.1); `MIN_LIMIT`, `minLimitSec` chuyển vào lõi `src/core/minigame-scoring.js`. Lắc rổ áo bột năng thêm `maxRatio` 1,2: trò không tự xong ở lượt thứ 8 mà nhấc tay để xong, lắc quá 9 lượt bị phạt như chạm tối thiểu cũ. Không đổi id, par, w, chí mạng, giá làm lại, giá, vốn, `BALANCE` | Khuấy đều: người chơi trung bình bị trừ 41% số lượt (mức nghiệm thu < 15%, chỉ số 30), trên game thật khuấy 1,0–1,2 vòng/giây được 85; sau khi sửa bị trừ 8,7%, được 100. Áo bột: bản đầu tự xong ở lượt thứ 8 nên người chơi ẩu luôn Hoàn hảo, sao Chè bưởi của người chơi ẩu +13,8% so với 0.4.1; sau khi sửa 0,0%. Mô phỏng `sim-A` (hệ số 1,104 và 0,9; mô hình Thả đá hồng tâm): sao trung bình của người chơi trung bình lệch −1,4% đến +3,2% ở 9 món (bảng mục 7.1) |
