# Khảo sát code cho M4 (chỉ đọc, không sửa file nào)

Ba điều cần quyết trước khi thiết kế:
- **Tip 5.000đ cứng** làm mất tip 10.000đ (món Không tì vết, khách khó tính, chuỗi "Quầy chuẩn"). Ngày lãnh lương ×1,5 lại đẩy tip lên 10.000đ, nên phải chọn: giữ nó thành "ngoại lệ" hay thiết kế lại.
- **Phạt tiền ngẫu nhiên trái nguyên tắc hiện hành**: docs/de-xuat-thiet-ke.md:845 ghi sự kiện ngẫu nhiên "không bao giờ phạt ngẫu nhiên". Còn mục 11.6 (dòng 1110) ghi lỗ tối đa 0,5 TNC và không quá 20% doanh thu ca, trong khi code và can-bang.md dùng 10% doanh thu ca.
- **Game chưa có tồn kho nguyên liệu** (mục 3), nên "món hiếm cần nguyên liệu hiếm" là hệ thống mới hoàn toàn.

---

## 1. Tip

**Nơi tính tip**
- `tipFor(stars, flawlessAny, persona, balance)` ở src/core/scoring.js:141-145: dưới 5 sao thì 0; có món Không tì vết hoặc khách khó tính thì `tipBonus` (10.000đ); còn lại `tipFiveStar` (5.000đ).
- Hằng số nằm ở src/data/balance.js:27 và src/core/state.js:22 (`DEFAULT_BALANCE`). Fixture test có bản riêng ở tests/fixtures/data.mjs:21.
- `finalizeCustomer` ở src/core/kitchen.js:436-498 (được `serveTicket` :501-565 và `resolveComplaint` :570-604 gọi):
  - :442-443 gọi `tipFor`.
  - :445-446 chuỗi "Quầy chuẩn": `counterStreak ≥ 5` và không bật Hỗ trợ tính tiền thì `Math.max(tip, tipBonus)`.
  - :447-448 Ngày lãnh lương: `Math.max(5000, Math.round(tip × tipMul / 5000) × 5000)`.
  - :479 ghi `customer.tip`; :483 cộng `sh.tipJar` và `sh.ledger.tips`; :491 ghi `sheet.tip`.
- `counterStreak` được đếm trong `clipTicket` (src/core/order.js:553-557).
- `tipMul` đi từ `DAY_EVENTS.lanh_luong.effects.tipMul: 1.5` (src/data/day-events.js:40-44) qua `prepareShiftMods` (src/core/events.js:396).

**Nơi tip đi vào tiền**
- `summarizeShift`: lãi = … + `sh.tipJar` (src/core/economy.js:41); `tips: L.tips` ở :69.
- `settleShift` cộng `sh.tipJar` vào ví (economy.js:88).
- `compactHistory` lưu `tips` (src/core/shift.js:216).
- Tín hiệu `revenue` của nhiệm vụ chỉ tính tiền mặt + QR, không tính tip (src/core/stats.js:144).

**Nơi hiển thị**
- Phiếu chấm: `'Tip: +'` ở src/ui/screens/service.js:596.
- Tổng kết, dòng "Tiền tip": src/ui/screens/summary.js:53. Chuỗi chữ ở src/data/strings.js:95 và :191.
- Dòng hiệu ứng sự kiện ngày "Tiền tip nhiều hơn khoảng 50%": src/ui/screens/prep.js:48.
- Mô tả Ngày lãnh lương: day-events.js:42. Lời Dì Sáu "tip mạnh tay": src/data/dialogue.js:515.

**Chọn trường "hóa đơn"**

| Lựa chọn | Nguồn | Ghi chú |
|---|---|---|
| `customer.receipt.total` | Gán `= c.amountDue` trong `clipTicket` (order.js:531, :562) | Số khách trả thật. Báo thiếu thì nhỏ hơn giá niêm yết. Tình huống đổi món sửa lại số này (src/core/incidents.js:324) |
| `receipt.listTotal` | order.js:531 | Giá niêm yết của phiếu người chơi ghi, có thể sai món |
| `c.trueTotal` / `priceOfLines(customer.request)` | order.js:206-208 | Giá trị đơn thật |

Đề xuất tính `paid` theo đúng logic `clampRefunds` (kitchen.js:98-101): ảnh chuyển khoản giả thì 0, còn lại `receipt.total − (customer.refunded || 0)`. Không có `receipt` thì dùng `priceOfLines(customer.request)`. Nhánh dự phòng này bắt buộc, vì `kitchenEnv` trong tests/unit/core-kitchen.test.mjs:15-26 dựng khách không có `receipt`.

Nên thêm khóa BALANCE `tipMinBill: 20000`. Test tests/unit/money-rounding.test.mjs:53 đang soát `tipFiveStar` và `tipBonus` là bội 1.000đ.

**Test kiểm số tip (sẽ vỡ)**

| Test | Vì sao vỡ |
|---|---|
| tests/unit/core-scoring.test.mjs:92-96 | `tipFor` trả 10.000đ cho Không tì vết và khó tính |
| tests/unit/core-kitchen.test.mjs:163-177 | :169 và :174 mong 10.000đ (bánh mì + trà tắc = 30.000đ) |
| tests/unit/review-m2-fixes.test.mjs:255-277 | R6: :270 `off.tips.includes(10000)`; :275 `on.tips.every(x === 5000)` vỡ khi có khách 5 sao với hóa đơn dưới 20.000đ |
| tests/unit/meta-events.test.mjs:299-307 | Lãnh lương: `t ≥ 10000`. Giữ ×1,5 thì 5.000 → 10.000đ nên vẫn qua; bỏ ×1,5 thì vỡ |
| tests/unit/integration-meta.test.mjs | Có thể vỡ, xem mục 7 |

Tỉ lệ thưởng = thưởng ÷ (lãi + thưởng), dòng :234. Tip giảm thì lãi giảm, tỉ lệ tăng (hiện cao nhất 25,2%, trần 35%). Điều kiện ví 500.000đ lên chặng (src/data/progression.js:27) cũng tới chậm hơn.

**Tài liệu cần sửa**
- docs/can-bang.md: :32, :227, :231, :233, :256 (bảng), :285, :425.
- docs/kien-truc.md: :241, :557-558, :842, :862, :875.
- docs/de-xuat-thiet-ke.md: :99 (quyết định số 30), :265, :506-512, :853.

## 2. Sự kiện ngày và tình huống trong ca

### Sự kiện ngày
- **Dữ liệu** (src/data/day-events.js, 50 dòng):
  - `DAY_EVENT_CONFIG` {fromDay: 3, chance: 0.3, noteBoostRate: 0.35, minCustomers: 3} ở :13-18.
  - `DAY_EVENTS` ở :20-50, mỗi mục {id, name, icon, w, fromDay, desc, effects, choice?}.
  - Các khóa `effects`: `customerMul`, `extraCustomers`, `patienceMul`, `tipMul`, `recipeWeight`, `noteBoost`.
  - `choice`: {id, label, cost, freeWithItem, desc, effects}.
  - Trọng số: Mưa 30, Nắng 30, Lãnh lương 20, Chợ phiên 20.
- **Cách bốc** (src/core/events.js, 432 dòng):
  - `rollDayEvent` :316-325 dùng luồng riêng `seedFrom(state.seed, day, 'su_kien_ngay')`: `nextFloat ≥ chance` thì không có sự kiện, rồi `weightedPick`.
  - Tăng `chance` là đơn điệu: ngày đang có sự kiện vẫn giữ đúng sự kiện đó, vì lượt bốc loại dùng số ngẫu nhiên kế tiếp.
  - Thêm sự kiện mới hoặc đổi trọng số thì loại bốc được thay đổi theo seed (src/core/rng.js:54-69), làm vỡ test dựa vào seed cố định.
  - Không có bảo hiểm và không có luật chống lặp.
- **Hàm liên quan**
  - `dayEventInfo` :328-339 (tính `choice.free` từ `state.items[freeWithItem]`).
  - `dayEventEffects` :342-347; `ensurePrep` :349-354.
  - `setDayEventChoice` :357-366 (chưa trừ tiền); `setMarketCoupon` :369-375.
  - `prepareShiftMods` :379-420: tiền căng bạt trừ bằng `spend` của economy.js :389, cộng `mods.prepCost`.
  - `applyCustomerMods` :424-431: sàn 3; trần `eventCustomerCap` = 10 khi tăng khách, còn lại 8.
  - Được gọi từ `startShift` (src/core/shift.js:69 và :85), trước khi ghi `walletStart`.
- **Giao diện**
  - Thẻ sự kiện ở màn Chuẩn bị: `dayEventCard` (prep.js:320-349), `dayEffectLines` (:39-53), `forecastDetail` (:64-77), lời Dì Sáu `prepTalk` (:81-85, lấy từ `DIALOGUE.diSau.dayEvent`, dialogue.js:513-518).
  - Thông báo đầu ca: service.js:336-343.
  - "Ngày mai: …": summary.js:187-198.

### Tình huống trong ca
- **Dữ liệu** (src/data/incidents.js, 105 dòng):
  - `INCIDENT_CONFIG` ở :22-35: `fromDay: 3`, `chance {nhieu: 0.5, vua: 0.35, it: 0.15}`, `guaranteeAfter: 3`, `noRepeat: 5`, `lossCap {revenueShare: 0.1, incomeMul: 0.5}`.
  - 3 loại (:37-105): `khach_mo_hang` (tình huống vui), `ghi_no`, `doi_y`.
  - Mỗi lựa chọn {id, label, cost (chữ), safe, result, needs, blocked, rep, bonusCustomers…}.
- **Lõi** (src/core/incidents.js, 556 dòng):
  - Mỗi loại cần code riêng trong bảng `KINDS` (:152-347): `planOk`, `maxLoss`, `due`, `detail`, `valid`, `vars`, `available`, `apply`, `costTpl`. Tức là chưa chạy thuần theo dữ liệu.
  - `planIncident` :367-385 dùng luồng `seedFrom(seed, day, 'tinh_huong')`, bảo hiểm `S.since ≥ guaranteeAfter`, mức "Ít" chỉ lấy loại `positive`, lọc `maxLoss ≤ cap`, `chooseKind` (:352-364), `afterClips = nextInt(1, n−1)`. Số khách thay đổi thì `afterClips` đổi theo.
  - `incidentLossCap` :85-92 = min(10% doanh thu dự kiến, 0,5 × `refIncomeFor`), làm tròn xuống bội 500đ.
  - Đường đi trong ca: `incidentDue` :447-458, `openIncident` :484-497, `resolveIncident` :502-546.
  - Tại :515, `loss = cost − money`. Chưa có trường "phạt" hay "thưởng" riêng.
  - `finishShiftIncidents` :549-556 cộng bộ đếm bảo hiểm; `incidentChance` :54-59; `collectDebts` :417-435 (tiền nợ vào `sh.debtIn`).
- **Tiền đi đâu**
  - Giá vốn: `spendCost` (:94-98) trừ ví ngay và cộng `ledger.cogs`.
  - Tiền bán: `ledger.cash`/`ledger.qr`/`ledger.sales` và két hoặc `qrBalance`.
  - Hoàn: `ledger.refunds`.
  - Nợ trả: `sh.debtIn` được cộng trong economy.js:41 và :88.
  - **Bất biến ví phải giữ**: ví sau ca − ví đầu ca = lãi − tiền trả nợ Dì Sáu (core-shift.test.mjs:19, integration-meta.test.mjs:190). Khoản thưởng/phạt mới phải đi qua ledger và công thức lãi. Ví dụ thêm `ledger.fines` và `sh.bonusIn`, rồi sửa `summarizeShift`, `settleShift`, bảng ở summary.js:50-61, `compactHistory`. Khoản ngoài ca (ở màn Chuẩn bị) phải cộng vào `mods.prepCost` như tiền căng bạt (integration-meta.test.mjs:179-180, :232).
  - Mọi số tiền phải là bội 500đ; tiền thưởng là bội 1.000đ (money-rounding.test.mjs:50-76, :157, :209, :236).
- **Giao diện**
  - Hộp thoại tình huống ở service.js:347-433; `effectChips` :372-383 cần thêm nhãn thưởng/phạt/vật phẩm; hình minh họa `incidentArt` :362-370.
  - Tổng kết: summary.js:84-101, `incidentLines` :219-230.
  - Cài đặt mức Nhiều/Vừa/Ít: settings.js:15-20 và :403-415.

### Test đang khóa tỉ lệ (phải sửa khi đổi)

| Test | Nội dung bị khóa |
|---|---|
| tests/unit/meta-events.test.mjs:226-241 | Tỉ lệ nằm trong 0,22–0,38 |
| tests/unit/incidents.test.mjs:52-78 | 50%/35%/15% (sai số 0,045); `kinds.size === 3` (:67); chỉ `khach_mo_hang` là tình huống vui (:66, :77) |
| tests/unit/incidents.test.mjs:108-135 | Luật không lặp, viết cứng 3 loại (:117-120, :132) |
| tests/unit/incidents.test.mjs:407-430 | `kinds.size === 3` |
| tests/unit/incidents.test.mjs:446-457 | `deepEqual chance`, `guaranteeAfter 3`, `noRepeat 5`, `fromDay 3` |
| tests/unit/incidents.test.mjs:137-176 | Trần thiệt hại; `view0` null chỉ được là `doi_y` (:154) |
| tests/unit/meta-events.test.mjs:309-329 | Với dữ liệu thật: ρ ≤ 0,9 và 3–10 khách mọi ngày; sự kiện mới tăng khách phải giữ điều này |

## 3. Vật phẩm và kho

- **`state.items`**
  - Mặc định `{ phieu_cho_som: 0, bat_che_mua: 0 }` ở src/core/state.js:78.
  - Khi nạp save, `migrateMeta` (src/core/save.js:117-119) giữ mọi khóa, kể cả id lạ, và ép về số nguyên ≥ 0.
- **Dữ liệu vật phẩm**: `ITEMS` ở src/data/shop.js:29-40, mỗi mục {id, name, icon, consumable | permanent, desc, effect}.
- **Trao vật phẩm** (src/core/rewards.js)
  - `resolveReward` :40-67; `needsFallback` :26-36: vật phẩm vĩnh viễn đã có thì đổi sang phần quy đổi.
  - `grantReward` :86-92: vĩnh viễn thì gán 1, tiêu hao thì cộng n.
  - Phần thưởng có vật phẩm đang ở src/data/checkin.js:22-39 và src/data/mail.js:38.
- **Dùng ở màn Chuẩn bị**
  - Phiếu Chợ Sớm: `couponCard` (prep.js:351-368) → `setMarketCoupon` → trừ phiếu trong `prepareShiftMods` (events.js:403-409, `cogsMul` 0,8).
  - Bạt che mưa: không cần bấm; `dayEventInfo` đọc `freeWithItem` (events.js:334).
- **Hiển thị**: "Túi đồ" ở src/ui/screens/shop.js:206-216 (chỉ hiện id có trong `ITEMS`); src/ui/components/meta-ui.js:38-40; src/ui/components/checkin-popup.js:24-25.
- **Tồn kho nguyên liệu: chưa có.** Nguyên liệu vô hạn. Tài liệu hẹn "khi đã có kho" ở GĐ2 (de-xuat-thiet-ke.md:1108).
- **Giá vốn bị trừ ở đâu**
  - `submitChon` (src/core/kitchen.js:154-197): mỗi nguyên liệu nhặt tính `INGS[id].cost × def.qty × cook.qty`; nguyên liệu cần thì vào `cogs`, thừa hoặc bẫy thì vào `waste`; nhân `cogsMul`; `roundCost` bội 500đ; `spend` (:120-124) trừ ví ngay và ghi ledger.
  - Làm lại bước: `retryStep` :299-316 trừ `retryCost` vào `waste`.
  - Bỏ món: `abandonDish` :366-378 chuyển `cogs` sang `waste`. Nếu nguyên liệu hiếm bị trừ lúc Chọn thì bỏ món là mất luôn.
  - Nấu thử: `tastingSandbox` (src/core/shop.js:166-174) dựng state không có `items`. Logic tiêu hao phải bỏ qua khi `sh.tasting`.

## 4. Công thức và "món hiếm"

- **Dữ liệu món** (src/data/recipes.js): `source` là `default` / `shop` (`shopPrice`, `shopFromDay`) / `event` (`eventId`). Nguyên liệu và giá vốn ở src/data/ingredients.js (52 dòng); test bắt `cost` là số nguyên > 0.
- **Test dữ liệu sẽ vỡ khi thêm món** (tests/unit/data.test.mjs):
  - :65-68 khóa đúng 5 món.
  - :75 chỉ cho 3 loại `source`; :77-78 món không phải sự kiện thì `eventId` phải null.
  - Giá bội 5.000đ và lớn hơn giá vốn; `cost` khớp tổng nguyên liệu (:85).
  - Kệ 9 hoặc 12 ô, chứa đủ nguyên liệu và bẫy (:100-104); mọi icon có trong `ICONS` (:198, :203-207).
- **Cách khách chọn món**
  - `orderableRecipes` (src/core/customer.js:82-95) lọc theo `source`. Nhánh `ctx.data.isEventActive` (:90-92) hiện không chạy thật vì `DATA` không có hàm này.
  - `makeRequest` :137-179 bốc theo `recipeWeight` (:97-105: món mới ×2, `mods.recipeWeight`).
  - **Mọi đơn của cả ca được sinh sẵn lúc `startShift`** (shift.js:105-118). Vì vậy nên chốt số phần món hiếm ngay lúc mở ca (ví dụ `sh.rareReserved`) và giới hạn số dòng món hiếm theo tồn kho. Không nên kiểm tra sống, vì bảng menu ở quầy gọi `orderableRecipes` liên tục (src/ui/screens/counter.js:172 và :358); món hết hàng giữa ca sẽ biến khỏi menu trong khi khách vẫn đang gọi.
  - `doi_y` cũng dùng `orderableRecipes` (incidents.js:121, :263) nên phải loại món hiếm hết hàng.
  - Khách phàn nàn chọn nấu lại (kitchen.js:591-603) cần thêm 1 phần nguyên liệu. Nếu hết thì phải chỉ cho hoàn tiền.
- **Nguồn cấp công thức**
  - Chợ Công Thức: `buyShopRecipe` (shop.js:82-92) yêu cầu `source === 'shop'` và có trong `SHOP.mainShelf`.
  - Sự kiện: `grantReward { recipe }` ghi `state.eventRecipes` nếu `source === 'event'` (rewards.js:106-115).
- **Sổ công thức** (src/core/recipe-book.js, 124 dòng)
  - `SOURCE_ORDER` :12, `sourceLabel` :22-32 (chữ ở strings.js:123), `recipeBook` :51-93 (trạng thái owned/shop/event/teaser).
  - Giao diện nhóm theo trạng thái ở src/ui/screens/recipe-book.js:54-56.
  - tests/unit/notebook-recipe-book.test.mjs:94-129 khóa `total 5` và thứ tự trạng thái.
- **Kệ và icon**
  - Kệ được xáo ở src/ui/screens/kitchen.js:354-361; ô kệ vẽ ở src/ui/minigames/chon.js:18-57 (có thể thêm nhãn số lượng còn).
  - Icon: `ICONS` ở src/ui/art.js:484, gồm nguyên liệu :81-301, món :310-350, vật phẩm và sự kiện :418-437. Mọi icon phải có `viewBox 0 0 64 64` và không dùng ảnh ngoài (data.test:209-224).

## 5. Tái dùng engine sự kiện cho "sự kiện trong ngày"

- `EVENTS` (src/data/events.js) và `eventWindow`/`eventPhase`/`isEventActive` (events.js:26-55) chỉ tính theo **ngày**: `from`/`to` là mốc 04:00 giờ Việt Nam (`vnDayStartMs`, src/core/clock.js:34-36). Không có khung giờ trong ngày.
- Phần dùng lại được: Tem có trần mỗi ngày, việc sự kiện, điểm danh, `grantReward`, và cách dựng thẻ ở màn Chuẩn bị (prep.js:302-317).
- **Thời gian** (clock.js)
  - `makeNowInfo` :51-55 trả {now, trusted = max(giờ máy, maxSeen), rewind, dayKey}. `dayKeyVN` :8-10. Chống lùi giờ 10 phút :19-27.
  - `?devNow=YYYY-MM-DDTHH:mm` (:59-70) chỉ chạy trên localhost.
  - Lõi nhận giờ qua `ctx.now` (src/ui/app.js:43); `startShift` đọc tại shift.js:68.
  - Chưa có hàm "giờ Việt Nam hiện tại". Cần thêm, ví dụ `new Date(ms + 7h).getUTCHours()`.
- **Hướng làm đề xuất**
  - Khung giờ thật (11:00–13:00, 17:00–19:00): tính lúc `startShift`/`prepareShiftMods` rồi lưu vào `sh.mods`, để tải lại vẫn giữ. Khóa nhận quà khi `rewind`, như điểm danh làm.
  - Thời gian trong ca là giờ game 06:00–10:00 (`gameTime`, shift.js:182-188) và không liên quan giờ thật.
  - Dùng luồng ngẫu nhiên mới, ví dụ `seedFrom(seed, day, 'su_kien_trong_ngay')`, để không xô lệch các luồng đang có.
  - Có thể viết thêm một loại "chung" chạy theo dữ liệu trong `KINDS`, hiệu ứng {money, fine, items, rep}, để thêm sự kiện nhặt nguyên liệu hiếm mà không phải viết code riêng.
- integration-meta chơi ca lúc 08:00, 12:00 và 17:30 (:37), tiện để test khung giờ.

## 6. Rủi ro khi sửa

- **Save**
  - `STATE_VERSION = 2` (state.js:3). M3 thêm trường mà không nâng version (`migrateContentM3`, save.js:312-334).
  - Nâng lên 3 thì bản cũ đọc mã sao lưu sẽ báo "bản mới hơn" (save.js:655).
  - Mọi trường mới phải đi qua `migrate` mà giữ nguyên giá trị: integration-meta.test.mjs:238-239 so `migrate(decode(encode(state)))` với state gốc bằng `deepEqual`.
  - Ca đang dở được giữ nguyên nếu đủ cấu trúc (`shiftUsable`, save.js:106-109, :290-293).
- **PWA**
  - Mỗi tệp mới trong src/ phải thêm vào `PRECACHE` của sw.js (:18-119). tests/unit/pwa.test.mjs:122-162 soát cả thiếu lẫn thừa và mọi import.
  - Nâng phiên bản thì đổi cùng lúc sw.js:14 `VERSION`, `APP_VERSION` (src/ui/app.js:16) và package.json (pwa.test:137-146).
  - Nếu thêm thư phiên bản mới vào `MAIL_VERSIONS` (src/data/mail.js:42-47), tests/unit/meta-mail.test.mjs:116-121 (đang mong '0.2.0') sẽ vỡ.
- **Từ cấm** (tests/unit/banned-words.test.mjs)
  - Quét toàn bộ src/, css/, sw.js, kể cả chú thích. Danh sách ở :11-14, trong đó có **'ipos', 'fabi'**, 'momo', 'grab', 'michelin'.
  - Các tệp chữ hiển thị (:20) không được chứa 'seed' hay 'TNC', và chuỗi trong nháy không được có nguyên từ 'par', 'toast', 'chip', 'MV'.
  - Chuỗi tiếng Việt không được có "px" (:79-94).
  - Nếu tạo tệp dữ liệu chữ hiển thị mới, nên thêm vào danh sách :20.
- **can-bang.md**: tỉ lệ ở §14.1 (:419, :429), §14.2 (:434-439); tip ở §7; tỉ lệ thưởng ở §10.3; nhật ký chỉnh sửa §16 (:497).

## 7. Độ lớn file và test có thể vỡ

**Lõi**

| File | Dòng |
|---|---|
| src/core/kitchen.js | 604 |
| src/core/order.js | 568 |
| src/core/incidents.js | 556 |
| src/core/events.js | 432 |
| src/core/customer.js | 342 |
| src/core/shift.js | 260 |
| src/core/shop.js | 188 |
| src/core/state.js | 185 |
| src/core/economy.js | 164 |
| src/core/scoring.js | 159 |
| src/core/rewards.js | 139 |
| src/core/recipe-book.js | 124 |
| src/core/clock.js | 70 |
| src/core/save.js | 764 |

**Dữ liệu**: recipes.js 193 · incidents.js 105 · events.js 69 · shop.js 67 · ingredients.js 52 · day-events.js 50.

**Giao diện**: screens/kitchen.js 918 · art.js 786 · counter.js 666 · service.js 599 · prep.js 461 · summary.js 278 · screens/shop.js 266 · screens/recipe-book.js 156.

**Unit test**: incidents 467 · data 478 · review-m2-fixes 435 · integration-meta 394 · meta-events 347 · money-rounding 252 · core-shift 250 · core-kitchen 226 · notebook-recipe-book 198 · meta-mail 174 · core-scoring 104.

**E2E có thể vỡ**

| Test | Vì sao |
|---|---|
| tests/e2e/m2-ui.e2e.mjs:121-149 | Cần seed 3, ngày game 4 ra "Trời mưa" (:16-17). Thêm sự kiện hoặc đổi trọng số thì vỡ; chỉ tăng `chance` thì an toàn |
| tests/e2e/incident-notebook.e2e.mjs | Seed 6 ra `ghi_no` với `afterClips 1` (:112-115); seed 3 ra `khach_mo_hang` (:248); seed 25 ra `doi_y` (:313). Vỡ khi thêm loại tình huống, hoặc khi sự kiện ngày làm đổi số khách ngày 5 |
| tests/e2e/hanh-trinh.mjs | Chạy tay; bật mức Nhiều |
| tests/e2e/one-shift.e2e.mjs:36-53 | So lãi hiển thị với history; vỡ nếu có khoản mới mà không vào bảng lãi |
| stability, review-m3-ux, m2-meta | Tỉ lệ sự kiện cao hơn thì hộp thoại tình huống hiện nhiều hơn. Các hàm trong helpers.mjs (:173-222, :354) đã tự xử lý hộp thoại |

**Unit test mô phỏng tích hợp**
- tests/unit/integration-meta.test.mjs: :190, :232 bất biến ví; :234 và :275 tỉ lệ thưởng ≤ 35%; :386-393 người chơi trung bình đủ điều kiện lên chặng trước ca 15.
- tests/unit/core-shift.test.mjs:28 tính lại lãi theo công thức cũ; thêm khoản vào sổ ca thì phải sửa.
- tests/unit/integration-shift.test.mjs:219: người chơi ẩu phải lãi kém ít nhất 25%.
- tests/helpers/perfect-player.mjs (124 dòng) chỉ xử lý tình huống khi được truyền hàm chọn.

Về yêu cầu (5): repo đã có nghiên cứu game tham khảo ở docs/tham-khao/nghien-cuu-game-tham-khao.json (495 dòng), gồm một game quản lý tiệm có "drama bất ngờ", sự cố mất tiền theo lịch, khách ngôi sao, hàng có hạn dùng. Kèm theo docs/tham-khao/ban-tong-hop-v0.1.md và phan-bien-v0.1.md, nên đọc trước khi viết đề xuất.