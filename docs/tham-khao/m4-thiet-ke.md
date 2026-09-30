# Bản thiết kế triển khai M4: tip mới, sự kiện thưởng/phạt tiền, chợ hàng hiếm

Repo: `/home/user/gamefnb` (bản 0.3.0, save `STATE_VERSION = 2`). Mọi số tiền dưới đây theo quy ước sẵn có: thưởng là bội 1.000đ, giá vốn và phạt là bội 500đ. "TNC" là `refIncomeTable` (20k / 35k / 65k / 85k / 100k).

---

## 0. Tóm tắt các quyết định

1. **Tip** chỉ có một mức là 5.000đ. Khách phải chấm 5 sao và **số tiền khách thực trả phải từ 20.000đ**. Bỏ hẳn `tipBonus` 10.000đ.
   - Khách khó tính và món Không tì vết được thưởng bằng danh tiếng.
   - Chuỗi "Quầy chuẩn" từ 5 khách được thưởng **1 lượt Giỏ chợ** để nhận nguyên liệu hiếm.
   - Ngày lãnh lương đổi thành "khách gọi thêm món", không còn tip ×1,5.
2. **Được phép có sự kiện phạt tiền, với điều kiện:**
   - có nguyên nhân mà người chơi phòng được, hoặc có báo trước;
   - luôn có lựa chọn an toàn;
   - có trần thiệt hại;
   - tốt chiếm đa số;
   - mức "Ít" không có sự kiện phạt.

   Câu "không bao giờ phạt ngẫu nhiên" ở `docs/de-xuat-thiet-ke.md` dòng 845 được thay bằng nguyên tắc trên. Mục 11.6 sửa "20% doanh thu ca" thành "10%" cho khớp code.
3. **Thêm 16 sự kiện mới**: 8 sự kiện ngày và 8 tình huống trong ca. Tất cả chạy theo dữ liệu, không viết code riêng cho từng sự kiện.
4. **Sổ lãi lỗ có thêm hai khoản riêng**: `ledger.eventIn` (tiền vào từ sự kiện) và `ledger.eventOut` (phạt, chi phí, mua hàng từ sự kiện). Bất biến "ví sau ca − ví đầu ca = lãi − trả nợ" vẫn giữ.
5. **Kho nguyên liệu hiếm `state.rare`** có 5 nguyên liệu. Có 4 công thức hiếm với nguồn mới `source: 'hiem'`.
   - Mở công thức: gom đủ 3 mảnh rồi nấu thử đạt hạng Được.
   - Món hiếm chỉ được gọi khi kho còn nguyên liệu. Số phần được chốt lúc mở ca.
6. **Sự kiện trong ngày** để kiếm nguyên liệu hiếm:
   - 3 phiên hàng theo giờ thật Việt Nam, chơi mini-game "Lựa hàng" (dùng lại mini-game Chọn).
   - Khách lạ bảo đảm ở ca đầu mỗi ngày thật.
   - Giỏ chợ, có bảo hiểm xui công khai.
   - 2 tình huống trong ca cho nguyên liệu hiếm.
7. **Tần suất**: sự kiện ngày tăng từ 30% lên 55% và có bảo hiểm (tỉ lệ thực khoảng 60%). Tình huống trong ca ở mức Vừa tăng từ 35% lên 55% và có bảo hiểm sau 2 ca (thực khoảng 60%).
8. Save lên `STATE_VERSION = 3`. Phiên bản lên 0.4.0. Thêm thư phiên bản 0.4.0 giải thích luật tip.

---

## A. Tip mới

### A.1 Luật

| | Hiện tại | M4 |
|---|---|---|
| Điều kiện | Khách 5 sao | Khách 5 sao **và** số tiền khách thực trả ≥ `tipMinBill` (20.000đ) |
| Mức tip | 5.000đ; 10.000đ nếu có món Không tì vết, khách khó tính, hoặc chuỗi Quầy chuẩn ≥ 5 | 5.000đ duy nhất |
| Ngày lãnh lương | Tip ×1,5, làm tròn lên 10.000đ | Không nhân tip (xem A.4) |

Chữ hiển thị viết theo hướng thưởng: "Hóa đơn từ 20.000đ, khách vui sẽ bỏ hũ tip 5.000đ". Không viết kiểu "đã bỏ tip 10.000đ".

### A.2 "Hóa đơn" là số nào

Dùng **số tiền khách thực trả**, tính theo đúng logic `clampRefunds`. Thêm hàm `billOf(customer, R)` vào `/home/user/gamefnb/src/core/kitchen.js`, đặt cạnh `clampRefunds` (khoảng dòng 97):
- Khách trả bằng ảnh chuyển khoản giả: 0.
- Có `receipt`: `receipt.total − (customer.refunded || 0)`.
- Không có `receipt`: cộng giá niêm yết theo `customer.request`, gồm cả phụ thu (dùng `noteObjects` có sẵn trong `scoring.js`). **Không import `order.js`**, vì `order.js` đã import `kitchen.js` nên sẽ thành vòng import. Nhánh này bắt buộc phải có, vì `kitchenEnv` trong test dựng khách không có `receipt`.

Hệ quả có chủ ý, đúng bài học nghề:
- Báo tổng thiếu làm khách trả dưới 20.000đ thì mất tip.
- Bán kèm món thứ hai, hoặc phụ thu "Thêm trứng", thì đủ ngưỡng.

Với giá hiện tại:
- Đơn chỉ 1 Trà tắc (10k), 1 Cà phê sữa đá hoặc 1 Chè bưởi (15k) thì không có tip.
- 2 ly Trà tắc, Bánh mì ốp la, Bánh tráng trộn, hoặc mọi món hiếm thì đủ ngưỡng.
- Tỉ lệ đơn đủ 20.000đ ước tính: khoảng 50% ở ngày 1–2 và khoảng 72% từ ngày 3.

### A.3 Bỏ `tipBonus`: thay bằng thưởng không phải tiền

| Trước (10.000đ) | M4 |
|---|---|
| Có món Không tì vết | Giữ +1 danh tiếng như cũ, không thêm gì |
| Khách khó tính chấm 5 sao | +1 danh tiếng (khóa mới `BALANCE.strictFiveStarRep: 1`). Khách khó tính chỉ chiếm 10% từ ngày 5 nên danh tiếng tăng không đáng kể |
| Chuỗi Quầy chuẩn đạt 5 | +1 lượt Giỏ chợ, tối đa 1 lượt mỗi ca, rút lúc cuối ca. Bật Hỗ trợ tính tiền thì không có lượt này, giống luật chuỗi hiện tại |

Không dùng "+danh tiếng theo chuỗi" vì người chơi trung bình trong mô phỏng luôn làm đúng quầy. Nếu thưởng danh tiếng theo chuỗi thì họ sẽ đạt 150 danh tiếng trước ca 8, làm vỡ test `integration-meta.test.mjs:386-393`.

### A.4 Ngày lãnh lương

`lanh_luong.effects` đổi từ `{ tipMul: 1.5 }` thành `{ lineCountWeights: [60, 32, 8] }` (bình thường là `[70, 25, 5]`). Mô tả mới: "Đầu tháng lãnh lương, khách hay gọi thêm món, hóa đơn dễ qua 20.000đ để có tip."
- Kỳ vọng khoảng +8% số phần mỗi khách, tức khoảng +9.000đ lãi mỗi ca ở ngày 9.
- Luật tip không có ngoại lệ (câu hỏi G2).
- `makeRequest` (`/home/user/gamefnb/src/core/customer.js:137`) đọc `sh.mods.lineCountWeights || cfg('lineCountWeights')`.

### A.5 Ảnh hưởng số liệu (cần đo lại bằng mô phỏng)

| Người chơi | Tip mỗi khách phục vụ, trước → sau | Tip mỗi ca ở ngày 9 |
|---|---|---|
| Trung bình (40% khách 5 sao) | 2.200đ → 1.440đ (ngày 1–2: 1.000đ) | 16,7k → 10,9k (−5,8k) |
| Hoàn hảo (mọi khách 5 sao, món Không tì vết) | khoảng 10.000đ → khoảng 3.600đ | khoảng −50k |

Phần giảm của người chơi hoàn hảo là **sửa lệch có chủ ý**: `can-bang.md` §9.1 ghi họ lãi gấp khoảng 3 lần mô hình, chủ yếu vì tip 10.000đ.

**Rủi ro cần đo:**
- Tỉ lệ thưởng tăng vì lãi giảm. Ngày thật 2 ước khoảng 32%, sát trần 35%.
- Chỉ số 21 (chênh lãi ≥ 25% giữa người ẩu và người giỏi) ở `integration-shift.test.mjs:219`.
- Thời điểm đủ 500.000đ để lên chặng.

Cách chỉnh đã chuẩn bị sẵn, **chỉ dùng khi mô phỏng vượt ngưỡng**: giảm thưởng chuỗi "Ngày đầu ra phố" bước 5 từ 30.000đ xuống 20.000đ.

### A.6 File, hàm và test cần sửa

**Code**
- `/home/user/gamefnb/src/data/balance.js:27`: thành `tipFiveStar: 5000, tipMinBill: 20000, strictFiveStarRep: 1` (xóa `tipBonus`).
- `/home/user/gamefnb/src/core/state.js:22` (`DEFAULT_BALANCE`): đổi giống trên.
- `/home/user/gamefnb/tests/fixtures/data.mjs:21`: đổi giống trên.
- `/home/user/gamefnb/src/core/scoring.js:140-145`: `tipFor(stars, bill, balance)` trả `stars === 5 && bill >= balance.tipMinBill ? balance.tipFiveStar : 0`.
- `/home/user/gamefnb/src/core/kitchen.js` `finalizeCustomer` (436-498):
  - dòng 442-443 gọi `tipFor(res.stars, billOf(customer, R), B)`;
  - xóa dòng 445-446 (tip theo chuỗi) và 447-448 (`tipMul`);
  - thêm danh tiếng cho khách khó tính;
  - khi `counterStreak` chạm 5 lần đầu trong ca và không bật `assistCash`, đặt `sh.rareRolls = max(1, …)`. Việc này có thể đặt ở `clipTicket` (`/home/user/gamefnb/src/core/order.js:553-557`).
- `/home/user/gamefnb/src/core/events.js`: `prepareShiftMods` (dòng 396) bỏ `tipMul`, thêm `lineCountWeights`.
- `/home/user/gamefnb/src/data/day-events.js:40-44`: sửa sự kiện Ngày lãnh lương.
- `/home/user/gamefnb/src/ui/screens/prep.js:48`: `dayEffectLines` bỏ dòng tip, thêm dòng "Khách hay gọi thêm món".
- `/home/user/gamefnb/src/data/dialogue.js:515`: sửa lời Dì Sáu ngày lãnh lương.
- `/home/user/gamefnb/src/data/strings.js:95, :191`: thêm chú thích luật tip.
- `/home/user/gamefnb/src/ui/screens/service.js:596`: phiếu chấm ghi "Tip: 0 (hóa đơn dưới 20.000đ)" khi khách 5 sao mà không đủ ngưỡng.

**Test sửa**
- `core-scoring.test.mjs:92-96`: bảng mới (5 sao + 20k → 5.000; 5 sao + 15k → 0; 4 sao + 30k → 0; khó tính 5 sao + 20k → 5.000).
- `core-kitchen.test.mjs:169, :174`: đổi thành 5.000, `tipJar` 5.000. Thêm ca chỉ có Trà tắc chấm 5 sao ra tip 0.
- `review-m2-fixes.test.mjs:255-277`: viết lại R6. Tip mọi khách 5 sao ∈ {0, 5.000}. Không bật Hỗ trợ thì `sh.rareRolls = 1`, bật thì 0. Kỷ lục chuỗi giữ như cũ.
- `meta-events.test.mjs:299-307`: Ngày lãnh lương có số phần mỗi khách lớn hơn ngày thường, tip chỉ là 0 hoặc 5.000.
- `money-rounding.test.mjs:53`: bỏ `tipBonus`, thêm `tipMinBill`.
- Chạy lại `integration-meta` và `integration-shift`.

**Tài liệu**
- `can-bang.md`: dòng 32, 227, 231, 233, 256, 285, 425.
- `kien-truc.md`: dòng 241, 557-558, 842, 862, 875.
- `de-xuat-thiet-ke.md`: dòng 99 (quyết định 30), 265, 506-512, 853.

---

## B. Sự kiện thưởng/phạt tiền

### B.1 Sổ tiền và trần

- **`emptyLedger`** (`/home/user/gamefnb/src/core/shift.js:13`) thêm `eventIn: 0, eventOut: 0`.
- **`eventOut`** trừ ví ngay lúc phát sinh, giống `spendCost`.
- **`eventIn`** cộng vào ví ở `settleShift`, giống `debtIn`.
- **`summarizeShift`**: `profit = … + L.eventIn − L.eventOut`. Trả thêm `eventIn`, `eventOut`, `eventNotes: [{id, name, text, money}]`.
- **Chi phí chọn ở màn Chuẩn bị** (mua đá cây, chuẩn bị đón đoàn kiểm tra) đi qua `mods.prepCost`, giống tiền căng bạt, và không tính vào lãi ca.
- **Trần mỗi sự kiện:**
  - Thiệt hại: `lossCap` giữ nguyên, bằng min(10% doanh thu dự kiến, 0,5 TNC).
  - Tiền thưởng: thêm `gainCap` = min(15% doanh thu dự kiến, 0,75 TNC), làm tròn xuống bội 1.000đ.
  - Planner loại tình huống nào có `maxLoss > lossCap` hoặc `maxGain > gainCap`. Tiền của sự kiện ngày bị kẹp theo trần.
- **Trần mỗi ngày thật**, lưu ở `state.incidents.day = {key, loss, gain}`, key lấy theo `ctx.now` lúc mở ca: tổng phạt ≤ 1 TNC, tổng tiền thưởng sự kiện ≤ 1 TNC. Vượt thì lời thoại ghi "Dì Sáu đỡ giùm con lần này".
- **Luật nhịp:**
  - Ca trước có tình huống loại xấu, hoặc lỗ ≥ 50% trần, thì ca này chỉ bốc loại tốt hoặc loại chọn không có phạt.
  - Ngày có sự kiện ngày loại xấu thì tình huống trong ca không bốc loại xấu.
- **Mỗi sự kiện có trường `kind`**: `tot`, `chon` hoặc `xau`. Sự kiện xấu mở từ ngày game 5.

### B.2 Tám sự kiện ngày mới

Dữ liệu ở `/home/user/gamefnb/src/data/day-events.js`. Báo trước ở màn Tổng kết hôm trước.

| id | Tên | Loại, từ ngày, trọng số | Hiệu ứng mặc định | Lựa chọn (dùng khung `choice` sẵn có) | Tiền | Trần | Kỳ vọng ở ngày 9 |
|---|---|---|---|---|---|---|---|
| `hoi_thi_xe_sach` | Hội thi "Xe đẩy sạch, ngon" của phường | tốt, 4, 9 | `endCheck` theo sao trung bình của ca: ≥ 4,5 được Giải Nhất; ≥ 4,0 được Giải Khuyến khích; thấp hơn không có giải | Không có (tự dự thi) | Giải Nhất +20.000đ +5 danh tiếng; Khuyến khích +10.000đ +2 danh tiếng | `gainCap` | +10.500đ |
| `don_van_phong` | Văn phòng đầu hẻm đặt 3 ly trà tắc | tốt/chọn, 4, 9 | Không có | `nhan_don` (0đ): `bigOrder {tra_tac ×3, persona văn phòng, bonus 5.000, minStars 4}` thêm 1 khách (trong trần 10) | Bán 30.000đ; đạt từ 4 sao thì +5.000đ "đúng hẹn" | 0 | +25.000đ (gồm lãi bán hàng) |
| `tai_tro_dai_ly` | Đại lý trà tài trợ bảng hiệu | tốt, 6, 7 | Không có | `nhan_tai_tro` (0đ): `endCheck portions` Trà tắc (kể cả món hiếm dùng Trà tắc làm nền) | Bán ≥ 3 ly: +15.000đ; ít hơn: +5.000đ | 0 | +12.000đ |
| `tat_gia` | Tắc lên giá | xấu nhẹ, 5, 6 | `ingCostMul {tac: 2}` (+1.200đ mỗi ly Trà tắc) | Không có; Dì Sáu gợi ý dùng Phiếu Chợ Sớm | Giá vốn tăng | Phần tăng ≤ `lossCap` (kẹp theo `sh.eventCostExtra`) | −3.500đ |
| `tien_dien_nuoc` | Tiền điện nước tháng này tăng | xấu nhẹ, 5, 5 | `fixedCostDelta: 5000` | Không có (khoản nhỏ, đã báo trước) | −5.000đ | 5.000đ | −5.000đ |
| `cup_dien` | Cúp điện theo lịch | chọn, 5, 6 | Khách ×0,85; món có đá được gọi ×0,5; `noQrSpeaker` (Loa tắt, tự xác nhận QR) | `mua_da_cay` 10.000đ: chỉ còn `noQrSpeaker` | −10.000đ hoặc mất khoảng 1 khách | 10.000đ | −10.000đ |
| `trat_tu_do_thi` | Trật tự đô thị nhắc giữ vỉa hè | xấu (phòng được), 5, 6, cách nhau ≥ 7 ngày game | `queueFine {at: 3, fine: 20.000}`: hàng chờ chạm 3 người thì phạt 1 lần | `thu_gon` (0đ, an toàn): `queueMax: 2`, khách thứ 3 đi ngang | −20.000đ hoặc lỡ khách | min(20.000, `lossCap`) | −6.000đ |
| `kiem_tra_attp` | Đoàn kiểm tra vệ sinh an toàn thực phẩm | chọn, 6, 6, cách nhau ≥ 7 ngày game | `endCheck hygiene`: không có lỗi bếp `chua_so_che/bo_qua/hong/bay` thì +3 danh tiếng; lần đầu có lỗi chỉ bị nhắc nhở; lỗi lần 2 trong 14 ngày game thì phạt | `chuan_bi` 10.000đ: chắc chắn đạt, +5 danh tiếng | −20.000đ (chỉ ở lần 2) hoặc −10.000đ | min(20.000, `lossCap`) | −3.000đ |

**Sự kiện cũ**
- Chợ phiên thêm `rareRolls: 1` (1 lượt Giỏ chợ).
- Trọng số mới, tổng 100: Trời mưa 13, Nắng nóng 13, Ngày lãnh lương 10, Chợ phiên 10.
- Tỉ lệ loại: tốt 58%, chọn/xấu 42%.

**Mức Ít** loại khỏi danh sách bốc: `tat_gia`, `tien_dien_nuoc`, `cup_dien`, `trat_tu_do_thi`, `kiem_tra_attp`.

**Khóa hiệu ứng mới**
- `lineCountWeights`, `fixedCostDelta`, `ingCostMul`, `noQrSpeaker`, `queueMax`, `queueFine`, `bigOrder`, `endCheck`, `rareRolls`.
- Tất cả được tính ở `prepareShiftMods` và `startShift`. `advance` xử lý `queueMax`, `queueFine`, `noQrSpeaker`. `submitChon` xử lý `ingCostMul`.
- Hàm mới `finishShiftEvents(state, ctx)` trong `events.js`, gọi ở `endShift` **trước** `summarizeShift`. Hàm này xử lý `endCheck`, thưởng `bigOrder`, lượt Giỏ chợ và quà Khách lạ.
- Các điều kiện đều không phụ thuộc state (Trà tắc là món có sẵn), để dòng "Ngày mai" dự báo luôn đúng.

### B.3 Tám tình huống trong ca mới

Dữ liệu ở `/home/user/gamefnb/src/data/incidents.js`. Mỗi tình huống khai báo `generic: true`, dùng chung một loại `chung` trong `KINDS` của `/home/user/gamefnb/src/core/incidents.js`.

**Cấu trúc dữ liệu:**
- Mỗi lựa chọn có `outcomes: [{p, money, fine, cogs: 'mon'|số, rep, rare: {auto|id: n}, fragment, waitMul, result}]`.
- `needs`: `{qr, lua, soldPortions, ownsRare, stockRoom}`.
- `maxLoss` là giá trị lớn nhất của (fine + cogs) trên mọi kết quả. `maxGain` tính tương tự.
- Kết quả bốc bằng `inc.rng`, tải lại trang không đổi kết quả.

| id | Tên, loại, từ ngày, trọng số | Lựa chọn (an toàn đánh *) | Tiền | Thiệt hại tối đa | Kỳ vọng tiền | Bài học, Mẹo nghề |
|---|---|---|---|---|---|---|
| `tien_nghi_gia` | Tờ 20.000đ nghi giả (khách mua 1 ly trà tắc). Xấu, 5, 0,7 | *Soi kỹ rồi mới nhận: 50% tiền thật thì bán được; 50% tiền giả thì từ chối lịch sự, 0đ. / Mời chuyển khoản (cần QR): bán được. / Nhận luôn: 50% tiền thật; 50% tiền giả thì mất 10.000đ tiền thối + 3.000đ giá vốn | +10.000 −3.000 | 13.000đ | Soi kỹ +3.500; nhận luôn −3.000 | Thẻ mới "Soi tiền trước khi thối" (`tien_gia`) |
| `shipper_chuyen_khoan` | Shipper lấy hộ 2 ly, nói "khách chuyển rồi". Chọn, 5 (cần QR), 1,2 | *Chờ tiền về rồi giao: 75% tiền về, bán được; 25% đơn hủy, 0đ. Có Loa báo tiền thì hiện "Nhờ có Loa…" (lựa chọn xanh). / Giao luôn: 75% bán được; 25% mất 6.000đ giá vốn | +20.000 −6.000 | 6.000đ | +10.500 / +9.000 | Thẻ mới "Thấy tiền về mới giao món" |
| `gas_het` | Bình gas mini hết giữa ca. Xấu, 5, 0,7; cần món có bước Canh lửa | Mua bình mới: −12.000đ. / *Mượn bếp chị bán xôi: −3.000đ giá vốn (mời 1 ly), +1 danh tiếng, ngân sách chờ món ×0,9 cho phần còn lại của ca | −12.000 hoặc −3.000 | 12.000đ | −6.000 | Chuẩn bị vật tư dự phòng |
| `khach_quen_vi` | Khách bỏ quên ví trên ghế. Tốt, 3, 1 | *Cất giữ chờ khách: 70% khách quay lại cảm ơn +10.000đ; 30% cuối ca mang nộp công an phường. Cả hai đều +2 danh tiếng. / Nhờ tổ dân phố báo loa: +1 danh tiếng, 60% khách gửi 1 phần nguyên liệu hiếm làm quà quê | +10.000 | 0 | +7.000 | Giữ đồ thất lạc cho khách |
| `ve_chai` | Cô Hai ve chai hỏi mua ly, thùng giấy. Tốt, 3, 1; cần đã bán ≥ 3 phần | *Bán: +1.000đ mỗi phần đã bán, tối đa 8.000đ. / Cho cô luôn: +3 danh tiếng | ≤ 8.000 | 0 | +2.500 | |
| `doan_khach_hoi_duong` | Đoàn khách du lịch hỏi đường ra chợ. Tốt, 4, 1 | *Chỉ đường tận tình: +2 danh tiếng. / Chỉ đường và mời 2 ly trà tắc: +20.000đ −6.000đ | +14.000 | 0 | +7.000 | |
| `khach_que_gui_qua` | Khách quen từ quê lên gửi quà. Tốt, 3, 1; cần kho còn chỗ | Mời lại ly trà: −3.000đ, +2 danh tiếng, +1 phần hiếm. / *Nhận, cảm ơn: +1 phần hiếm | −3.000 | 3.000đ | −1.500 (+1 phần hiếm) | Nguồn nguyên liệu hiếm |
| `nguoi_ban_dao` | Chị bán dạo mời {nguyên liệu hiếm}. Chọn, 4, 1,2; cần có ≥ 1 công thức hiếm và kho còn chỗ | Mua 2 phần −8.000đ. / Mua 1 phần −4.000đ. / *Hẹn bữa khác | −8.000 (tiền mua, ghi vào `eventOut`) | 8.000đ | −4.000 (mỗi phần hiếm bán ra lãi thêm khoảng 7.500đ) | Nguồn nguyên liệu hiếm có trả tiền, biết trước món gì |

**Tổng hợp tỉ lệ**
- Trong ca có 11 loại. Ba loại cũ gắn nhãn: `khach_mo_hang` tốt (w 1), `ghi_no` chọn (w 1,2), `doi_y` chọn (w 1,2).
- Tỉ lệ bốc ở mức Vừa: tốt 44,6%, chọn 42,9%, xấu 12,5%.
- Mức Ít có 5 loại tốt: `khach_mo_hang`, `khach_quen_vi`, `ve_chai`, `doan_khach_hoi_duong`, `khach_que_gui_qua`.

**Nội dung:** không có hối lộ, không vé số hay bốc thăm (hội thi chấm theo sao), không nhắc thương hiệu (từ cấm có momo, grab…), không hướng dẫn làm tiền giả mà chỉ nêu dấu hiệu nhận biết.

**Thêm 4 thẻ Mẹo nghề** (20 → 24; Quầy 14 / Bếp 5 / Kho 2 / Phục vụ 3):
- `soi_tien` (trigger `tien_gia`)
- `cho_tien_ve` (trigger `cho_tien_ve`)
- `kiem_hang` (trigger `kiem_hang`, mở khi chọn nhầm hàng thường ở Lựa hàng)
- `giu_loi_di` (trigger `lan_chiem`)

### B.4 Kỳ vọng tổng so với thu nhập tham chiếu (ngày 9, TNC 100k, người chơi trung bình)

| Khoản | Mỗi lần xảy ra | Tần suất mỗi ca | Mỗi ca |
|---|---|---|---|
| Sự kiện ngày (có trọng số, gồm cả phần bán hàng tăng giảm) | +7,0k | 0,60 | +4,2k |
| Riêng 8 sự kiện ngày mới, chỉ tính tiền của sự kiện | +1,05k | — | gần 0, hơi dương |
| Tình huống trong ca (11 loại, có trọng số) | +2,7k | 0,60 | +1,6k |
| **Tổng sự kiện** | | | **+5,8k (+5,8% TNC)** |
| So với M3 (sự kiện ngày 30%, tình huống 43%) | | | +4,3k |
| Tip | | | −5,8k |
| **Chênh mỗi ca so với M3** (chưa tính món hiếm) | | | **−4,3k (−4,3% TNC)** |
| Món hiếm (khoảng 1,5 phần mỗi ca × +7,5k lãi thêm, người chơi có tham gia) | | | +11k |

Kết luận:
- Tính riêng từng sự kiện thì kỳ vọng hơi dương.
- Người chơi trung bình mất một ít vì tip.
- Người chơi chịu lựa hàng và bán món hiếm sẽ lời hơn. Đó là phần thưởng cho kỹ năng.
- Tiền sự kiện vẫn tính vào "lãi bán hàng". Giá trị quy đổi của nguyên liệu hiếm tính vào `ratioValue`, giống cách tính Phiếu Chợ Sớm.

---

## C. Nguyên liệu hiếm và món hiếm

### C.1 Kho (save, mặc định trong `defaultMeta`)

```
state.rare = {
  stock: {},               // ingId → số phần (0..stockMax)
  fragments: {},           // recipeId → số mảnh (0..3)
  pity: { ing: 0, frag: 0 },
  today: { key: '', got: 0, frags: 0, stalls: [], strangerDay: '' },
  seen: [],                // nguyên liệu hiếm đã từng có (sưu tập)
  pendingStall: null       // {id, dayKey} khi đang lựa hàng dở
}
```

Cấu hình `RARE_CONFIG`, đặt ở file mới `/home/user/gamefnb/src/data/rare.js`:
- `fromDay: 3`
- `stockMax: 6`: dư thì mỗi phần đổi thành 2 Muỗng Vàng.
- `dailyCap: 6` phần và `dailyFragCap: 3` mảnh mỗi ngày thật, tính mọi nguồn trừ phần tự bỏ tiền mua.
- `fragmentsNeed: 3`, `unlockGrade: 'duoc'`.
- `basket: { ingredient: 0.4, pityAfter: 2 }`
- `orderWeight: 1.5`, `repPerGood: 1`

Ở M4 nguyên liệu hiếm **không hết hạn**, để tránh gây sợ bỏ lỡ; hạn dùng để GĐ2. Kho không phải tiền nên không đụng tới bất biến ví.

### C.2 Năm nguyên liệu hiếm

Khai báo trong `/home/user/gamefnb/src/data/ingredients.js` với `rare: true, star, origin`. `cost` là giá quy đổi, số nguyên dương. Mỗi nguyên liệu cần 1 icon SVG 64×64.

| id | Tên | ★ | Quê | Giá quy đổi | Món dùng | Hàng thường dễ nhầm (bẫy trên kệ) |
|---|---|---|---|---|---|---|
| `mat_ong_rung` | Mật ong rừng U Minh | ★2 | Cà Mau | 3.300đ/phần | Trà tắc mật ong rừng | Đường, đường phèn |
| `trung_ga_ta` | Trứng gà ta | ★1 | vườn quê | 3.500đ/quả (2 quả/phần) | Bánh mì trứng gà ta | Trứng gà, trứng vịt |
| `muoi_tom_tay_ninh` | Muối tôm Tây Ninh | ★1 | Tây Ninh | 1.500đ/phần | Bánh tráng trộn Tây Ninh | Muối, sa tế |
| `kho_muc` | Khô mực Phan Thiết | ★2 | Bình Thuận | 4.100đ/phần | Bánh tráng trộn Tây Ninh | Khô bò |
| `ca_phe_bmt` | Cà phê hạt Buôn Ma Thuột | ★2 | Đắk Lắk | 3.700đ/phần | Cà phê muối | Cà phê phin, cà phê hòa tan |

GĐ2 thêm: Bưởi da xanh Bến Tre (Chè bưởi da xanh), Hạt điều Bình Phước.

### C.3 Bốn công thức hiếm

Nguồn mới `source: 'hiem'`, có `baseRecipe`, `requires` (phải có món nền) và `rare: {ingId: n}` (số phần hiếm tiêu hao mỗi phần món). Dùng lại 6 mini-game và icon của món nền; giao diện gắn thêm huy hiệu ★.

| id | Món | Món nền | Hiếm mỗi phần | Giá | Giá vốn (có quy đổi) | Lãi | Tổng par (giây) | Lãi/giây nấu (trần 550) |
|---|---|---|---|---|---|---|---|---|
| `tra_tac_mat_ong` | Trà tắc mật ong rừng | Trà tắc | 1 mật ong | 15.000 | 6.000 | 9.000 | 19 (bỏ bước Nêm đường, thêm "Rót mật ong" loại ROT, vỏ `to`) | 474 |
| `banh_mi_trung_ga_ta` | Bánh mì trứng gà ta | Bánh mì ốp la | 1 phần trứng gà ta | 25.000 | 11.000 | 14.000 | 26 (thêm "Nướng giòn bánh mì" loại LUA, vỏ `chao`, par 4) | 538 |
| `banh_trang_tron_tay_ninh` | Bánh tráng trộn Tây Ninh | Bánh tráng trộn | 1 khô mực + 1 muối tôm | 25.000 | 12.000 | 13.000 | 34 (thêm "Xé khô mực" loại CHA; Nêm thêm muối tôm) | 382 |
| `ca_phe_muoi` | Cà phê muối | Cà phê sữa đá | 1 cà phê Buôn Ma Thuột | 20.000 | 6.000 | 14.000 | 26 (thêm "Đánh sữa muối" loại CHA, par 4, và "Rưới lớp sữa muối" loại ROT, par 2) | 538 |

**Ghi chú:**
- Tất cả đạt quy tắc "món ngang giá trị".
- Nguyên liệu hiếm lấy từ kho, **không trừ ví**. Phần lãi thêm là thưởng hiện vật có trần theo ngày.
- Giá mọi món hiếm từ 15.000đ; riêng Trà tắc mật ong đi kèm món khác thì hóa đơn đủ ngưỡng tip.
- Món hiếm không tính vào điều kiện "3 công thức" để lên chặng: sửa `/home/user/gamefnb/src/core/progression.js:33`, lọc bỏ `source === 'hiem'`.
- Việc "Nấu món vừa mua" loại món hiếm khỏi `recentRecipeDays`.

### C.4 Cách có công thức hiếm

1. **Gom mảnh công thức.** Nguồn:
   - Giỏ chợ, khi kết quả ra mảnh;
   - Lựa hàng đạt từ 75 điểm: 50% được mảnh;
   - Khách lạ chấm 3 sao;
   - thư phiên bản 0.4.0: 1 mảnh Trà tắc mật ong và 1 phần mật ong, để làm quen.

   Mảnh chỉ rơi cho món đã có món nền, ưu tiên món đang gom dở. Có bảo hiểm: 3 lần liền ở nguồn có tỉ lệ mà không ra mảnh thì lần sau chắc chắn có.
2. **Đủ 3 mảnh thì nấu thử.** Dùng lại hộp cát nấu thử trong `/home/user/gamefnb/src/core/shop.js` (`canTaste`, `startTasting`, `tastingSandbox`, `finishTasting`):
   - `canTaste` cho phép món `hiem` đủ mảnh được **thử lại không giới hạn** tới khi mở.
   - `finishTasting` đạt hạng Được trở lên thì gọi `grantReward({recipe})`.
   - Nấu thử không tiêu hao kho.

   Làm như vậy dạy người chơi "làm đúng một lần mới đưa lên thực đơn".
3. **Sổ công thức**: `SOURCE_ORDER.hiem = 3`, thêm trạng thái `hiem`, hiện "Mảnh 2/3 · Cần Bánh tráng trộn". Nhãn là "Công thức hiếm".

**Mục tiêu nhịp:** người chơi 3 ca mỗi ngày có món hiếm đầu tiên trong ngày thật 1–2, và đủ 4 món vào khoảng ngày thật 4–6.

### C.5 Cách khách gọi món hiếm

Nguyên tắc: **chốt lúc mở ca, không kiểm tra liên tục trong ca.**

1. **`orderableRecipes`** (`/home/user/gamefnb/src/core/customer.js:82`) nhận thêm món `hiem` khi:
   - đã sở hữu;
   - nếu đang có ca: món nằm trong `sh.rareMenu`;
   - nếu chưa có ca: kho đủ ít nhất 1 phần.
2. **`startShift`**:
   - Ghi `sh.rareMenu` (các món hiếm còn hàng lúc mở ca).
   - `makeRequest` gán trọng số ×1,5 cho món hiếm.
   - Sinh xong mọi đơn, chạy một vòng tất định (không dùng thêm số ngẫu nhiên): cộng dồn số phần hiếm theo thứ tự khách, phần nào vượt tồn kho thì đổi dòng đó về món nền.
3. **Ở quầy**:
   - `rareLeft(state, recipeId)` = tồn kho trừ các phần đã nằm trên phiếu hoặc phiếu đang ghi.
   - Quầy hiện "★ còn n phần" và giới hạn số lượng khi ghi phiếu.
   - `confirmOrder` kiểm lại; vượt thì trả `reason: 'het_hang_hiem'`.
   - Nếu người chơi ghi nhầm làm tốn phần của khách sau, hậu quả tự nhiên là khách sau không gọi được món và bị tính lỗi sai món.
4. **Tiêu hao kho lúc Ra món** (`finishDish`), không phải lúc Chọn:
   - bỏ món hay làm lại bước không mất nguyên liệu hiếm;
   - nấu thử (`sh.tasting`) không tiêu hao;
   - ô kệ hiện "còn n".
5. **Khách phàn nàn**: `resolveComplaint` khóa lựa chọn "Làm lại" cho dòng món hiếm nếu `rareLeft` không đủ, và ghi "Hết nguyên liệu hiếm, chỉ hoàn tiền được".
6. **`doi_y`** (`incidents.js:121`) loại món hiếm khỏi danh sách món đổi sang.
7. **Danh tiếng**: mỗi phần món hiếm đạt Ngon trở lên +1, giống `festiveRep`.

### C.6 Sự kiện trong ngày để kiếm nguyên liệu hiếm

**(a) Phiên hàng theo giờ thật Việt Nam**

Dữ liệu `STALLS` trong `rare.js`. Thêm hàm `vnMinutes(ms)` vào `/home/user/gamefnb/src/core/clock.js`.

| id | Tên, người bán | Khung giờ | Hàng |
|---|---|---|---|
| `cho_som` | Chợ sớm của Cô Ba | 05:00–09:00 | Trứng gà ta, Muối tôm Tây Ninh |
| `ba_gac_trua` | Xe ba gác hàng miền Tây của Chú Tư | 11:00–13:30 | Mật ong rừng U Minh, Trứng gà ta |
| `ganh_toi` | Gánh đặc sản của Anh Sáu | 17:30–21:00 | Cà phê Buôn Ma Thuột, Khô mực Phan Thiết |

**Luật:**
- Mỗi khung được 1 lượt mỗi ngày thật.
- Chỉ nhận ở màn Chuẩn bị, không nhận khi đang trong ca.
- Khóa khi giờ máy bị lùi (`makeNowInfo().rewind`), giống điểm danh.
- Lỡ khung không bị phạt gì.
- `integration-meta` chơi các ca lúc 08:00, 12:00 và 17:30, nên trúng đủ 3 khung.

**Mini-game "Lựa hàng"** (màn mới `/home/user/gamefnb/src/ui/screens/market.js`):
- Dùng lại nguyên plugin `MINIGAMES.chon` với một công thức dựng tạm: kệ 9 ô, 2 món hàng hiếm có vai trò `chinh`, bẫy là hàng thường dễ nhầm lấy từ bảng C.2 cùng vài món lấp chỗ.
- Vị trí trên kệ xáo theo `seedFrom(seed, dayKey, stallId)`.
- Chấm bằng `scoreChon`.
- Kết quả:
  - luôn được 1 phần (không bao giờ về tay trắng);
  - đạt từ 90 điểm: thêm 1 phần;
  - đạt từ 75 điểm: 50% được 1 mảnh.
- Chọn nhầm hàng thường thì mở thẻ Mẹo nghề `kiem_hang`, dạy "kiểm hàng trước khi ký nhận".

**Hàm lõi** (file mới `/home/user/gamefnb/src/core/rare.js`):
- `stallStatus(state, nowInfo, ctx)` trả `{current, next, locked}`.
- `startStall(state, id, nowInfo, ctx)` trả công thức dựng tạm và ghi `pendingStall`.
- `finishStall(state, score, nowInfo, ctx)` trao hàng.

**(b) Khách lạ, bảo đảm mỗi ngày thật**
- Từ ngày game 3, **ca đầu tiên của mỗi ngày thật** có 1 khách lạ. Vị trí khách trong ca bốc bằng luồng ngẫu nhiên riêng `seedFrom(seed, day, 'khach_la')`, không phải khách đầu và không phải khách hướng dẫn.
- Danh sách `STRANGERS`: Cụ bà quê Cà Mau (mật ong), Anh ngư dân Phan Thiết (khô mực), Chị buôn cà phê Ban Mê, Chú Tây Ninh (muối tôm), Cô Bảy nuôi gà thả vườn (trứng gà ta). Chọn người theo nhu cầu kho.
- Khách lạ có biểu tượng riêng ở hàng chờ và gọi món bình thường.
- Chấm 5 sao: 2 phần. 4 sao: 1 phần. 3 sao: 1 mảnh. Dưới 3 sao: chỉ cảm ơn, không phạt.
- `strangerDay` tránh việc tải lại trang làm khách lạ ghé 2 lần.

**(c) Giỏ chợ**
- Nguồn: chuỗi Quầy chuẩn 5 khách (tối đa 1 lượt mỗi ca) và Chợ phiên (+1 lượt).
- Rút cuối ca bằng `seedFrom(seed, day, 'gio_cho')`.
- Kết quả: 40% ra 1 phần nguyên liệu, 60% ra 1 mảnh. Nếu đã mở hết món thì 100% ra nguyên liệu.
- Bảo hiểm: 2 lượt liền không ra nguyên liệu thì lượt thứ 3 chắc chắn có. Thanh "may mắn" hiện công khai.
- Túi đồ ghi rõ tỉ lệ.

**(d) Tình huống trong ca**: `khach_que_gui_qua`, `nguoi_ban_dao`, và lựa chọn thứ hai của `khach_quen_vi` (mục B.3).

### C.7 Trần và chống lootbox

- Trần mỗi ngày thật: 6 phần và 3 mảnh.
- Kho tối đa 6 phần mỗi loại.
- Không bán lượt bốc bằng tiền (thật hay trong game). Người bán dạo bán **món hàng đã biết trước**, không bán hộp ngẫu nhiên.
- Mọi tỉ lệ ghi công khai.
- Dự kiến mỗi ngày: khoảng 5–6 phần, tức khoảng 20k giá trị quy đổi, được tính vào `ratioValue` (≤ 35%).

### C.8 Tái dùng engine có sẵn

| Có sẵn | Dùng cho |
|---|---|
| `planIncident`, `chooseKind`, `incidentDue`, `openIncident`, `resolveIncident` và hộp thoại ở `service.js` | 16 sự kiện mới (loại `chung` chạy theo dữ liệu), gồm 3 nguồn nguyên liệu hiếm |
| `rollDayEvent`, `dayEventInfo`, `setDayEventChoice`, `prepareShiftMods` và thẻ sự kiện ở `prep.js` | 8 sự kiện ngày, lượt Giỏ chợ ngày Chợ phiên |
| `grantReward` / `resolveReward` (`rewards.js`) | Thêm khóa `rare: {id: n}` và `fragments: {recipeId: n}` cho thư, chuỗi, phiên hàng |
| `pushMail` và `MAIL_VERSIONS` | Thư 0.4.0 (luật tip mới, quà làm quen) |
| Hộp cát nấu thử (`shop.js`) | Mở công thức hiếm |
| Plugin `chon` và `scoreChon` | Mini-game Lựa hàng |
| `makeNowInfo`, khóa khi lùi giờ | Phiên hàng |
| `unlockTip` (1 thẻ mỗi ca) | 4 thẻ Mẹo nghề mới |

---

## D. Tăng tỉ lệ sự kiện

| Lớp | Hiện tại (tỉ lệ thực) | M4 | Tỉ lệ thực M4 |
|---|---|---|---|
| Sự kiện ngày | 30%/ngày game từ ngày 3, không có bảo hiểm (30%) | `chance: 0.55`, `guaranteeAfter: 2`, `noRepeat: 1` (không trùng loại hôm trước khi còn loại khác), `cooldownDays: 7` cho `kiem_tra_attp` và `trat_tu_do_thi`, mức Ít bỏ loại xấu | khoảng 60% |
| Tình huống mức Nhiều | 50%, bảo hiểm sau 3 ca (khoảng 53%) | 75%, `guaranteeAfter` 1 | khoảng 80% |
| Tình huống mức Vừa | 35%, bảo hiểm sau 3 ca (khoảng 43%) | 55%, `guaranteeAfter` 2 | khoảng 60% |
| Tình huống mức Ít | 15%, bảo hiểm sau 3 ca (khoảng 31%), chỉ loại tốt | 30%, `guaranteeAfter` 3, chỉ 5 loại tốt | khoảng 40% |
| Khách lạ | không có | 100% ở ca đầu mỗi ngày thật | 1 lần/ngày thật |
| Phiên hàng | không có | 3 khung giờ thật | tối đa 3 lần/ngày thật |
| Giỏ chợ | không có | chuỗi Quầy chuẩn (≤ 1/ca), Chợ phiên +1 | khoảng 0,7/ca |

Cách tính tỉ lệ thực: kỳ vọng số ca giữa hai lần có sự kiện, ví dụ 0,55 + 2 × 0,45 × 0,55 + 3 × 0,2025 = 1,65 ca, tức khoảng 60%.

**Cách cài đặt:**
- `INCIDENT_CONFIG.guaranteeAfter` thành bảng theo mức: `{nhieu: 1, vua: 2, it: 3}`.
- Tên cài đặt đổi thành "Tần suất sự kiện" (`settings.js:403-415`). Mức Ít áp cho cả sự kiện ngày.
- `rollDayEvent` tính tuần tự từ `fromDay` tới ngày cần xem, trên luồng `su_kien_ngay` (tất định theo seed, ngày và mức cài đặt; không lưu thêm gì). Nhờ đó "Ngày mai" luôn khớp với ngày thật sự diễn ra.
- Nhịp chơi: không có 2 tình huống xấu ở 2 ca liền nhau. Mỗi ca tối đa 1 sự kiện ngày, 1 tình huống và 1 khách lạ.

**Test cần sửa:**
- `meta-events.test.mjs:226-241`: khoảng 0,22–0,38 đổi thành 0,53–0,67. Thêm kiểm: không có 3 ngày trống liền; không trùng loại hôm trước; khoảng cách ≥ 7 ngày; mức Ít không có loại xấu.
- `incidents.test.mjs`:
  - :52-78: các con số tỉ lệ đổi thành thực 0,80 / 0,60 / 0,40 (sai số 0,05). `kinds.size` và tập tình huống vui đọc từ dữ liệu.
  - :108-135 và :407-430: bỏ số 3 viết cứng.
  - :446-457: sửa `deepEqual` cấu hình.
  - :137-176: `view0` null không còn riêng `doi_y`; kiểm chung theo `maxLoss`/`maxGain`.
  - Thêm test nhịp không có 2 ca xấu liền.
- `meta-events.test.mjs:309-329`: ρ ≤ 0,9 với `bigOrder` và `lineCountWeights`.

---

## E. Tài liệu nghiên cứu: `/home/user/gamefnb/docs/nghien-cuu-the-loai-game.md`

**Đề cương**

1. **Mục đích và cách kiểm chứng.** Ba mức: đã kiểm nguồn / chỉ đọc đoạn trích / hiểu biết chung. Nối với `docs/tham-khao/*`.
2. **Bản đồ 11 thể loại simulator:**
   1. Nấu ăn dạng chuỗi mini-game: Cooking Mama, Venba.
   2. Quản lý thời gian nhà hàng: Diner Dash, Delicious, dòng Papa's, Cooking Fever, Cooking Madness, Cooking Diary, Good Pizza Great Pizza.
   3. Nấu theo chuỗi phím, nhịp nhanh: Cook, Serve, Delicious! 1–3.
   4. Nấu hợp tác hỗn loạn, roguelite: Overcooked 1–2, PlateUp!.
   5. Mô phỏng góc nhìn thứ nhất, vật lý: Cooking Simulator, Chef Life, Cafe Owner Simulator, Supermarket Simulator, TCG Card Shop Simulator.
   6. Tycoon quản lý: Kairosoft (Cafeteria Nipponica, The Ramen Sensei, Bonbon Cakery), Game Dev Tycoon, Two Point, Theme Hospital, RollerCoaster Tycoon.
   7. Chủ tiệm kết hợp đi thu thập: Dave the Diver, Moonlighter, Recettear, Potion Craft.
   8. Đời sống cozy, nông trại: Stardew Valley, Animal Crossing: New Horizons, Coral Island, Ooblets, Spiritfarer, Sun Haven, Fae Farm, Travellers Rest, Chef RPG.
   9. F2P chuỗi sản xuất, LiveOps: Hay Day, Township, Cookie Run: Kingdom, Restaurant Story, My Café, idle tycoon.
   10. Mô phỏng công việc và tự sự: Papers, Please; Coffee Talk; Reigns; FTL.
   11. Bài học về xác suất: Sid Meier/Rob Pardo (GDC 2010), PRD của Warcraft III/Dota 2, người kể chuyện của RimWorld.
3. **Bảng "Game → Thể loại → Cơ chế nổi bật → Áp dụng cho BKN"**, khoảng 40 dòng, lấy từ nghiên cứu đã kiểm. Mỗi dòng ghi độ tin cậy và link.
4. **15 nguyên tắc rút ra**, hợp nhất 3 bản:
   - ba tầng sự kiện; ngẫu nhiên trong nhịp cố định;
   - bảo hiểm xui công khai;
   - phạt công bằng (có nguyên nhân, báo trước, có đường gỡ, có trần, có lựa chọn an toàn, gắn với nghiệp vụ);
   - tốt chiếm đa số; không có 2 cái xấu liền;
   - thưởng gắn kỹ năng;
   - tăng tần suất thì giảm độ lớn mỗi lần và có trần ngày;
   - nguyên liệu hiếm đủ 5 thứ (nguồn, ký hiệu độ hiếm, cái giá, chỗ tiêu, giới hạn tích trữ);
   - công thức hiếm đi theo nhịp khám phá rồi thạo;
   - món hiếm để lấy danh tiếng, không để hốt tiền;
   - trình bày thành thưởng; lựa chọn xanh mở bằng hiện vật;
   - không gây sợ bỏ lỡ; không cắt ngang mini-game;
   - chốt đạo đức.
5. **Danh sách đề xuất xếp hạng.** T = tác động, C = chi phí, thang 1–5.

| # | Đề xuất | T | C | Đợt | Cảm hứng |
|---|---|---|---|---|---|
| 1 | Luật tip mới, bù bằng danh tiếng và Giỏ chợ | 4 | 1 | **M4** | Rob Pardo; CSD2 (đơn đủ bộ); Good Pizza; Cooking Madness (tip có trần); Travellers Rest |
| 2 | Tần suất 3 tầng, bảo hiểm, nhịp không 2 xấu liền | 5 | 2 | **M4** | RimWorld (Cassandra, Randy); Dota 2 PRD; ACNH; Stardew |
| 3 | 16 sự kiện thưởng/phạt gắn nghiệp vụ, có lựa chọn an toàn | 5 | 3 | **M4** | CSD1 (thanh tra); Papers, Please; Theme Hospital; Supermarket Simulator; RCT (mưa bán dù); Game Dev Tycoon (bài học ngược) |
| 4 | Sổ lãi lỗ có dòng Sự kiện; 4 thẻ Mẹo nghề mới | 3 | 1 | **M4** | Papers, Please; Good Pizza (bảng Profit) |
| 5 | Kho nguyên liệu hiếm, trần, thanh may mắn công khai | 4 | 3 | **M4** | Kairosoft (★); Hay Day; TCG Card Shop; Dota 2 PRD |
| 6 | Phiên hàng theo giờ thật và Lựa hàng (nhận biết hàng thật) | 4 | 3 | **M4** | Stardew (Traveling Cart); Potion Craft; ACNH (hàng giả của Redd); Spiritfarer; Dave the Diver |
| 7 | Khách lạ bảo đảm mỗi ngày | 4 | 2 | **M4** | ACNH (khách đặc biệt); Restaurant Story; Chef Life |
| 8 | 4 công thức hiếm, mở bằng mảnh và nấu thử | 4 | 3 | **M4** | Ooblets (ghép mảnh); My Café; Papa's (phong bì); Venba |
| 9 | Lựa chọn xanh mở bằng hiện vật (Loa, Phiếu Chợ Sớm, Máy tính cầm tay) | 3 | 1 | M4 phần nhỏ, GĐ2 phần còn lại | FTL |
| 10 | Thẻ ngày: chọn 1 trong 2 mỗi 3 ngày | 4 | 3 | GĐ2 | PlateUp! |
| 11 | Nhà phê bình hoặc VIP báo trước, danh tiếng ×2 | 4 | 3 | GĐ2 | Papa's (Jojo); Travellers Rest; Two Point |
| 12 | Khách quen có cấp và món ruột, order mơ hồ | 4 | 3 | GĐ2 | The Ramen Sensei; Papa's; Coffee Talk; Good Pizza |
| 13 | Lịch lễ Việt có nguyên liệu mùa | 4 | 4 | GĐ2 | Papa's Freezeria Deluxe; Township |
| 14 | Bảng tin chợ sáng, món được chuộng tuần | 3 | 2 | GĐ2 | Recettear; Travellers Rest; Moonlighter |
| 15 | Huy chương món và ca, kỷ lục mini-game | 3 | 2 | GĐ2 | Cooking Mama; CSD2 |
| 16 | Thử thách phụ mỗi ca (tùy chọn) | 3 | 2 | GĐ2 | Delicious; Two Point Campus |
| 17 | Vé kỹ năng cuối ca đổi lượt mini-game Thớt đặc biệt | 3 | 3 | GĐ2 | Papa's (Foodini) |
| 18 | Radio công thức hằng tuần có phát lại | 3 | 2 | GĐ2 | Stardew (Queen of Sauce) |
| 19 | Hạn dùng nguyên liệu hiếm; chậu rau sau xe thu 1 lần/ngày | 3 | 2 | GĐ2 | ACNH (củ cải); Potion Craft; Good Pizza |
| 20 | Đối thủ mở xe đối diện 3 ngày | 3 | 3 | GĐ2 | Good Pizza; The Ramen Sensei |
| 21 | Món bán lặp lâu bị "cũ"; vận quán hôm nay | 2 | 2 | GĐ2 | CSD1; Stardew (Luck) |
| 22 | Sổ Dì Sáu bị nhòe: điền đúng thứ tự bước (dạy quy trình chuẩn) | 4 | 4 | GĐ3 | Venba |
| 23 | Combo biến tấu bằng thử kết hợp | 3 | 4 | GĐ3 | Bonbon Cakery; Cafeteria Nipponica |
| 24 | Định giá món hiếm theo phản ứng khách | 3 | 3 | GĐ3 | Moonlighter |
| 25 | Xe đẩy lưu động theo điểm dừng | 4 | 5 | GĐ3 | Cooking Diary (Food Truck); CSD3 |
| 26 | Tuần lễ chủ đề, xếp hạng với "phường ảo" | 3 | 4 | GĐ3 | Hay Day (Derby); My Café |

6. **Không làm:** vòng quay hay casino (Cooking Fever), giải thu phí mà đa số người chơi lỗ, nhánh thưởng trả tiền (Cooking Diary), hối lộ (Papers, Please), lootbox, thông báo đẩy ép chơi, để chế độ tự động làm thay vòng chơi chính (bài học từ Cafe Owner Simulator).
7. **Nguồn:** danh sách link theo từng game.

---

## F. Phạm vi M4 để code ngay

### F.1 Thứ tự làm

Mỗi bước là một đợt commit và `npm test` phải xanh.

1. **Tip (A).** Sửa lõi, dữ liệu và 6 test ở A.6.
2. **Sổ tiền sự kiện:**
   - `emptyLedger`, `summarizeShift`, `settleShift`, `compactHistory` (`shift.js:214`);
   - `summary.js:50-61`: thêm 2 dòng "Tiền từ sự kiện" và "Phạt, chi sự kiện", cùng mục "Sự kiện trong ca";
   - sửa `core-shift.test.mjs:28`;
   - thêm test bất biến ví khi có `eventIn`/`eventOut`.
3. **Tần suất (D):**
   - `rollDayEvent` tuần tự; cấu hình mới trong `day-events.js` và `incidents.js`;
   - `planIncident` với `guaranteeAfter` theo mức, nhịp, `gainCap`, trần ngày thật;
   - sửa test ở mục D.
4. **Sự kiện ngày mới (B.2):** các khóa hiệu ứng, `finishShiftEvents`, thẻ Chuẩn bị, lời Dì Sáu, 8 icon, thông báo phạt (bus `event.fined`).
5. **Tình huống mới (B.3):** loại `chung` trong `KINDS`, 8 tình huống, `effectChips` (`service.js:372-383`) thêm nhãn tiền, phạt, hàng hiếm và mảnh; 4 thẻ Mẹo nghề.
6. **Hàng hiếm (C):**
   - dữ liệu (`rare.js`, `ingredients.js`, `recipes.js`);
   - lõi `rare.js`: kho, Giỏ chợ, phiên hàng, khách lạ;
   - cắm vào `customer.js`, `kitchen.js`, `order.js` (`confirmOrder`), `shop.js` (nấu thử), `recipe-book.js`, `progression.js`, `rewards.js`;
   - giao diện: `market.js`, thẻ phiên hàng và thẻ kho ở `prep.js`, Túi đồ (`shop.js:206-216`), huy hiệu ★ và "còn n" ở quầy và kệ (`chon.js`), biểu tượng khách lạ, 5 icon nguyên liệu.
7. **Save lên v3, PRECACHE, lên 0.4.0, thư 0.4.0.**
8. **Mô phỏng và tài liệu:**
   - `META_SIM_LOG=1 npm test`, kiểm tỉ lệ thưởng, chỉ số 21, mốc lên chặng;
   - chỉnh theo A.5 nếu cần;
   - viết tài liệu mục F.5.

### F.2 File tạo mới

- `/home/user/gamefnb/src/data/rare.js`: `RARE_CONFIG`, `STALLS`, `STRANGERS`. Thêm vào danh sách tệp chữ của `banned-words.test.mjs:20`.
- `/home/user/gamefnb/src/core/rare.js`
- `/home/user/gamefnb/src/ui/screens/market.js`: đăng ký trong router và `app.js`.
- `/home/user/gamefnb/tools/tim-seed.mjs`: tìm seed cho e2e. Nằm ngoài `src/` nên không vào PRECACHE.
- `/home/user/gamefnb/docs/nghien-cuu-the-loai-game.md`

### F.3 File sửa

**Dữ liệu:**
- `/home/user/gamefnb/src/data/balance.js`, `day-events.js`, `incidents.js`, `ingredients.js`, `recipes.js`, `tips.js`, `mail.js` (thêm `0.4.0`), `dialogue.js`, `strings.js`, `index.js`.

**Lõi:**
- `/home/user/gamefnb/src/core/state.js`: `STATE_VERSION = 3`, `DEFAULT_BALANCE`, `defaultMeta().rare`, `defaultIncidents()` thêm `lastKind, lastLoss, warn, day`.
- `/home/user/gamefnb/src/core/scoring.js`, `kitchen.js`, `order.js`, `customer.js`, `shift.js`, `economy.js`, `events.js`, `incidents.js`, `rewards.js`, `shop.js`, `recipe-book.js`, `progression.js`, `clock.js`, `save.js`.

**Giao diện:**
- `/home/user/gamefnb/src/ui/screens/prep.js`, `service.js`, `summary.js`, `counter.js`, `kitchen.js`, `shop.js`, `recipe-book.js`, `settings.js`
- `/home/user/gamefnb/src/ui/minigames/chon.js`: nhãn "còn n".
- `/home/user/gamefnb/src/ui/art.js`: 13 icon mới, gồm 8 sự kiện và 5 nguyên liệu, `viewBox 0 0 64 64`.
- `/home/user/gamefnb/src/ui/app.js:16`: `APP_VERSION`.

**Khác:**
- `/home/user/gamefnb/sw.js`: `VERSION '0.4.0'`, PRECACHE thêm 3 tệp mới.
- `/home/user/gamefnb/package.json`: 0.4.0.

### F.4 Save

- **`migrateContentM4(raw, s, data)`** gọi sau `migrateContentM3` trong `migrate` (`save.js:233-309`):
  - `state.rare`: chỉ giữ id có trong dữ liệu; kẹp số 0..`stockMax`, mảnh 0..3; `today`, `pity`, `seen` về dạng chuẩn.
  - `incidents`: thêm trường mới.
- **Save v2** nhận giá trị mặc định. **Ca đang dở từ v2** vẫn chơi tiếp: mọi chỗ đọc `ledger.eventIn`, `sh.rareMenu`, `sh.rareRolls` phải có mặc định `|| 0` / `|| []`.
- **Mã sao lưu v3** đưa vào bản 0.3 sẽ báo "bản mới hơn" (`save.js:655`). Đây là hành vi đúng.
- **Phải giữ** `migrate(decode(encode(state)))` bằng đúng state gốc (`integration-meta.test.mjs:238-239`).

### F.5 Test

**Sửa:** các test đã nêu ở A.6 và D, cùng với:
- `data.test.mjs` (:65-68 từ 5 món lên 9; :75, :77-78 thêm nguồn `hiem`; nguyên liệu `rare`; `TIPS` từ 20 lên 24; icon)
- `notebook-recipe-book.test.mjs` (tổng 9, trạng thái `hiem`, nhóm 14/5/2/3)
- `money-rounding.test.mjs` (tiền sự kiện: thưởng bội 1.000đ, phạt bội 500đ)
- `core-shift.test.mjs`
- `integration-meta.test.mjs`:
  - mô phỏng chơi phiên hàng;
  - mở món hiếm bằng nấu thử;
  - chọn lựa chọn an toàn khi gặp tình huống;
  - `ratioValue` tính cả giá trị hàng hiếm, ≤ 35%;
  - bất biến ví theo ngày;
  - lưu rồi tải lại vẫn nguyên state.
- `integration-shift.test.mjs:219`
- `meta-mail.test.mjs:116-121` (0.4.0)
- `pwa.test.mjs` (PRECACHE, phiên bản)

**Mới:**
- `tests/unit/m4-tip.test.mjs`: bảng tip theo sao × hóa đơn × QR giả × hoàn tiền × báo thiếu × ngày lãnh lương; lượt Giỏ chợ theo chuỗi; khi bật Hỗ trợ tính tiền.
- `tests/unit/m4-events.test.mjs`: tỉ lệ và bảo hiểm sự kiện ngày; khoảng cách 7 ngày; mức Ít; từng khóa hiệu ứng; trần ngày thật; `gainCap`.
- `tests/unit/m4-incidents.test.mjs`:
  - mọi tình huống có ≥ 1 lựa chọn an toàn;
  - xác suất các kết quả cộng lại bằng 1;
  - `maxLoss ≤ lossCap`;
  - bảng kỳ vọng mỗi lựa chọn khớp B.3 (±500đ);
  - nhịp không 2 xấu liền;
  - tỉ lệ thực 3 mức.
- `tests/unit/m4-rare.test.mjs`:
  - khung giờ phiên hàng ở các mốc biên 04:59, 05:00, 08:59, 09:00, 13:30, 21:00;
  - khóa khi lùi giờ; 1 lượt mỗi khung mỗi ngày; sản lượng theo điểm;
  - Giỏ chợ 40/60 trên 5.000 lượt; bảo hiểm; trần ngày; dư kho đổi Muỗng Vàng;
  - khách lạ 1 lần mỗi ngày thật; quà theo sao;
  - mở công thức bằng nấu thử;
  - đơn món hiếm ≤ tồn kho trên 40 seed;
  - giới hạn ở quầy; tiêu hao lúc Ra món; bỏ món không mất hàng; khóa làm lại; `doi_y` không đổi sang món hiếm;
  - lãi/giây ≤ 550.
- `tests/unit/m4-save.test.mjs`: nâng v2 lên v3; lưu rồi tải lại; dữ liệu hỏng được làm sạch; ca dở từ v2.

**E2E:**
- Tìm lại seed bằng `tools/tim-seed.mjs` cho:
  - `m2-ui.e2e.mjs:16-17` (Trời mưa ở ngày 4);
  - `incident-notebook.e2e.mjs:112-115, :248, :313` (`ghi_no` với `afterClips` 1, `khach_mo_hang`, `doi_y`).
- Mới `tests/e2e/m4-rare.e2e.mjs`: `?devNow=…T12:00`, Lựa hàng, kho tăng, nấu thử mở món, khách gọi món ★, kệ hiện "còn n".
- Mới `tests/e2e/m4-tip-events.e2e.mjs`: phiếu chấm ra tip 0 hoặc 5.000; Tổng kết có dòng Sự kiện; lãi hiển thị khớp lịch sử (cùng kiểu `one-shift.e2e.mjs:36-53`).

### F.6 Tài liệu

**`/home/user/gamefnb/docs/can-bang.md`:**
- §7: dòng tip; mô hình 1.440đ mỗi khách.
- §9: tính lại cột tip và lãi ca (ví dụ ngày 9 từ 105k còn khoảng 99k trước khi cộng sự kiện).
- §9.1 và §10.3: số đo mới.
- §14.1 và §14.2: bảng mới.
- Thêm §14.4 "Sự kiện thưởng/phạt" (bảng B.2, B.3, B.4) và §14.5 "Nguyên liệu và món hiếm" (C.2, C.3, trần, tỉ lệ).
- §15: thêm chỉ số 26–29 (tần suất cảm nhận, tỉ lệ chọn lựa chọn an toàn, số phần món hiếm bán mỗi ngày, tồn kho hiếm).
- §16: nhật ký chỉnh sửa.

**`/home/user/gamefnb/docs/de-xuat-thiet-ke.md`:**
- §0.2: sửa quyết định 30; thêm quyết định 31 (phạt có nguyên nhân) và 32 (nguyên liệu hiếm).
- Sửa §6.9.
- §7.1: thêm nguồn thứ 5 "Công thức hiếm".
- Viết lại §9.3 (dòng 845).
- Sửa §11.6 (dòng 1110) cho khớp 10%.
- §14: thêm mốc M4.
- Thêm Phụ lục C "Thay đổi v0.4".

**`/home/user/gamefnb/docs/kien-truc.md`:** BALANCE, state `rare`, ledger, module `rare.js`, `STATE_VERSION 3`.

---

## G. Câu hỏi cần người dùng quyết

1. **Tip có giữ điều kiện "khách chấm 5 sao"?** Yêu cầu gốc chỉ nói hóa đơn từ 20.000đ. **Khuyến nghị: giữ**, để tip vẫn là phần thưởng cho chất lượng phục vụ. Nếu bỏ thì tip tăng khoảng gấp 2,5 lần và chênh lệch giữa người giỏi với người ẩu gần như biến mất.
2. **Ngày lãnh lương:** chọn "khách gọi thêm món, không có ngoại lệ luật tip", hay "hạ ngưỡng tip còn 15.000đ trong ngày"? **Khuyến nghị: khách gọi thêm món.** Luật tip giữ một con số duy nhất, dễ nhớ khi đào tạo.
3. **Sự kiện phạt tiền ở mức "Ít":** **khuyến nghị tắt hẳn**, cả sự kiện ngày lẫn tình huống trong ca. Mức này dành cho nhân viên mới luyện 4 khâu. Mức Vừa và Nhiều vẫn có sự kiện phạt, trong trần.
4. **Ba khung giờ phiên hàng (05:00–09:00, 11:00–13:30, 17:30–21:00) có hợp giờ học của nhân viên không?** Ví dụ đào tạo buổi chiều thì nên thêm khung 14:00–16:00. **Khuyến nghị: giữ 3 khung** như trên. Khách lạ vẫn bảo đảm mỗi ngày có hàng hiếm cho người không canh được giờ.

---

### Critical Files for Implementation
- /home/user/gamefnb/src/core/kitchen.js
- /home/user/gamefnb/src/core/incidents.js
- /home/user/gamefnb/src/core/events.js
- /home/user/gamefnb/src/core/shift.js
- /home/user/gamefnb/src/core/save.js