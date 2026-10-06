# Bản thiết kế 0.5.4 "Bếp chuẩn hơn + Sơ chế buổi sáng" (bản v4)

> **Ghi chú lưu trữ (06/10/2026).** Đây là bản thiết kế cuối (v4) sau khảo sát → 3 phương án → 3 giám khảo → tổng hợp → phản biện 2 vòng (mô phỏng + độ đầy đủ) → kiểm cuối theo quyết định người dùng. Các thư mục mô phỏng nhắc trong bản (`bep-chuan/mo-phong-v3b/`, `bep-chuan/kiem-cuoi/v4/`, `bep-chuan/phan-bien-2/`…) nằm ở thư mục làm việc tạm của phiên thiết kế, **không có trong repo**; gói P2 dựng lại công cụ mô phỏng chính thức ở `tools/mo-phong-bep/` gọi `METHOD_SPECS` thật.
>
> **Câu hỏi còn mở Q9–Q11 (mục 10.2): áp khuyến nghị mặc định** (06/10/2026), người dùng có thể đổi: Q9 tiêu chí "lệch ±5" tính theo **điểm tuyệt đối**; Q10 **giữ** mức người không sơ chế +0,09 sao/khách do Rút gọn nhịp chờ (từng ngày không vượt mức chung quá +0,08 sao hoặc +5 điểm 5★); Q11 phương án **(A)** — quy trình van ở cổng phát hành (làm giao diện nhanh hơn trước; còn chậm thì bỏ "Gài nắp nén vừa tay", rồi "Kẹp trứng, dưa leo vào ổ"; tau > 0,85 thì chưa phát hành).


Bếp Khởi Nghiệp · bản dự kiến **0.5.4** (làm sau khi Đợt 3 phát hành 0.5.3, trước M6) · bản v4 viết ngày 06/10/2026. Bản v4 sửa bản v3 (cùng ngày) theo **kiểm cuối** (9 phát hiện: 2 major, 7 minor; trả lời từng phát hiện ở **mục 13**). Bản v3 đã sửa bản v2 (05/10/2026) theo **các quyết định người dùng đã chốt** (mục 0) và **phản biện vòng 2** (25 phát hiện, mục 12). Phụ lục vòng 1 giữ ở mục 11.

**Nền mã.** 0.5.2 "Vừa màn hình" đã phát hành (`5970a06`: Bếp kiểu "cảnh + khay", bậc chiều cao l / m / s / xs, khung chính iPhone 16 Pro 402×874 an toàn 62/34 và Safari 402×680). Mọi tệp `src/core/`, `src/data/` của Bếp (trừ `mail.js`) không đổi từ `89ec66d` (0.5.1) tới `5970a06`. Dẫn chiếu dòng của các tệp giao diện đã sửa ở 0.5.2 (`src/ui/screens/kitchen.js`, `service.js`, `css/kitchen.css`, `css/mg-prep.css`, `css/game.css`, `src/ui/components/*`) **đã dò lại theo `5970a06`**. Đợt 3 (0.5.3) đang sửa các màn ngoài ca trên đĩa (WIP `0773cc7` → `6e5bf8d`: `prep.js`, `shop.js`, `market.js`, `tasting.js`, `stage-up.js`, `vfx.js`, `css/prep.css`…); chỗ nào chạm các tệp này đều ghi "dò lại sau khi Đợt 3 phát hành".

**Màn Chuẩn bị mới của Đợt 3.** Đợt 3 đang dựng lại sảnh Chuẩn bị và các màn ngoài ca bằng thanh đầu chung `screenHead` (`src/ui/components/meta-ui.js:184` trên đĩa: nút quay lại tròn 44px `meta-back`, ví, nút ?). Màn Sơ chế buổi sáng phối hợp với sảnh mới ở bốn chỗ: lối vào là dải `prep-morning` trong tấm "Hôm nay" (không thêm ô lưới), nút "Mở hàng" chỉ chèn một nhánh, màn sáng có **nút quay về Chuẩn bị** cùng kiểu nút của `screenHead` (v4, mục 4.7), và lựa chọn tốn tiền của sự kiện ngày được giữ tiền (mục 4.1, 4.6). Mọi dòng dẫn tới tệp của Đợt 3 dò lại khi Đợt 3 phát hành.

Chỉ thiết kế, **không sửa repo**. Khung giữ như bản v2: trạm chỉ có ở giao diện, mỗi thao tác là một bước lõi riêng, `pace` khóa nhịp khách, `METHOD_SPECS` cho phụ bếp M6, mẻ sáng chơi bằng chính plugin trong ca.

---

## 0. Quyết định người dùng đã chốt

Người dùng chốt các câu hỏi mở ngày 05/10, khoảng 02:50 UTC, **trước khi có bản v2**. Bản v2 lệch hai quyết định (Q4/Q5 và Q6); bản v3 kéo về đúng như người dùng chọn. Bản v4 giữ nguyên các quyết định này và làm nốt hai chỗ kiểm cuối chỉ ra: Q2 còn thiếu nhãn "Cách mới" và Mẹo nghề cho xoài, tắc; Q6 có một "ngoại lệ" cho người giỏi mà người dùng chưa được hỏi (bản v4 bỏ ngoại lệ đó, thay bằng van định sẵn ở cổng phát hành và câu Q11).

| # | Người dùng chốt (nguyên ý) | Bản v2 đã làm | Bản v3 / v4 làm |
|---|---|---|---|
| Q1 | **Rút gọn nhịp chờ**: con dấu giữ 0,45 giây khi trạm Tốt trở lên (0,7 giây khi Đạt / Hỏng) và nút "Tiếp →" bấm qua ngay; màn ra món 2,2 → 1,6 giây; thẻ bước 1,1 → 0,8 giây | Đưa thành **bắt buộc** (khóa #13) | **Giữ bắt buộc.** Hệ quả ghi rõ: người **không** sơ chế, chơi trung bình, được **+0,09 sao/khách** so với 0.5.1 (mục 5.4); câu Q10 xin người dùng xác nhận đây là chủ đích |
| Q2 | **Đổi cho đúng nghề**: dưa leo bánh mì thái lát → **cắt thanh**; xoài bánh tráng trộn thái sợi → **bào sợi**; tắc **cắt đôi, khều hạt rồi vắt**; có thư giới thiệu, nhãn "Cách mới" ở 3 lần đầu, thẻ Mẹo nghề giải thích | Theo khuyến nghị | Giữ (mục 2.2.1, 3.2). **v4 làm đủ ba phần người dùng chốt:** thư "Có gì mới 0.5.4"; nhãn **"Cách mới"** trên bảng chọn cách (dưa leo, xoài) và trên ô trạm Tắc trong **3 lần nấu đầu sau khi cập nhật**, chỉ với người chơi đã nấu món đó ở bản cũ (`state.newWays`); **Mẹo nghề** cho cả ba đổi (`cat_thanh`, `bao_soi_xoai`, `tac_khe_hat`) với đường kích hoạt `sai_cach:<id bước>` (chọn sai cách) và `cach_moi:<id bước>` (lần nấu đầu sau khi cập nhật) (mục 4.8, 6.1, 7.1) |
| Q3 | **Luật Không tì vết mới** theo khuyến nghị (áp mặc định): mọi thao tác ≥ 90, được trượt đúng một thao tác nhỏ (w = 1, không phải Chọn, không chí mạng) ở 85–89 | Câu hỏi | **Áp mặc định** (mục 5.5), không còn là câu hỏi |
| Q4 / Q5 | **"Chỉ ở mẻ sơ chế sáng"**: Chặng 1 có băm, chặt, giã, nạo **chỉ khi làm mẻ sáng** (sa tế, đậu phộng giã, nước cốt dừa); trong ca dùng thao tác nhanh. **Đồ chua và tỏi băm để riêng cho Chặng 2** (quán) khi thực đơn rộng hơn. Đúng cách người bán xe đẩy làm sẵn từ sáng | Đưa **Đồ chua nhà làm** vào Chặng 1 (hũ cho bánh mì, 300đ/phần) — **sai quyết định** | **Bỏ Đồ chua khỏi Chặng 1**: không còn trong dữ liệu, bảng số, mô phỏng, khóa test, gói triển khai của 0.5.4. Thiết kế mẻ đồ chua giữ lại làm tài liệu ở **mục 4.12 "Để dành Chặng 2"**. Không có hộp "tỏi băm" riêng; đập dập và băm tỏi là thao tác **bên trong** mẻ Hành tỏi phi. Băm, chặt, giã, nạo không vào thao tác trong ca (phản biện vòng 2 #12 được trả lời ở mục 12) |
| Q6 | **"Lợi rõ, theo dõi sau"**: người chơi trung bình có sơ chế được khoảng **+0,45 … +0,61 sao/khách** so với không sơ chế; người giỏi chỉ **+0,04 … +0,08** (vì đã gần tối đa); người không sơ chế vẫn ngang bản hiện tại; sau khi phát hành sẽ xem lại. Người dùng đã thấy phương án "Hãm bớt" (+0,36 … +0,44) và **không chọn** | Hạ mục tiêu xuống TB ≤ +0,20 (1 ô thùng đá + 1 hũ) — **sai quyết định** | Đưa cơ chế lợi về mục tiêu: **thùng đá 2 ô (ngày 2–4), 3 ô (từ ngày 5)**, 1 hũ nhà làm, thưởng cấp món "Sơ chế khéo" và "Vị nhà làm". Kết quả [MH] (v4, gộp 3 bộ hạt giống): TB **+0,53**, Giỏi **+0,07**, Ẩu +0,02 sao/khách (mục 5.6). Khóa #17 thành **dải** TB +0,45 … +0,61 (dung sai ±0,05 ở test rút gọn), Giỏi ≤ +0,08 **ở mọi trạng thái được phát hành**: v4 bỏ "ngoại lệ" Giỏi ≤ +0,16 ở tau 0,9 mà bản v3 tự đặt; máy thật chậm (tau > 0,6) thì cổng phát hành áp van định sẵn (mục 8.5), câu Q11 xin người dùng xác nhận. Khóa #16 (người không sơ chế ngang 0.5.1) giữ. Mối lo của phản biện vòng 1 #5 (lợi cộng dồn qua số khách) chuyển thành **rủi ro R3 và kế hoạch theo dõi sau phát hành**, không dùng để đổi quyết định |
| Q7 | Cà phê muối giữ **"sữa muối"** | Theo khuyến nghị | Giữ (không kem béo, không luật "Tách béo") |
| Q8 | Bản **0.5.4**, làm **sau khi Đợt 3 (0.5.3) phát hành** | Có điều kiện nhưng cho vài gói bắt đầu sớm | **Mọi gói** bắt đầu sau khi Đợt 3 phát hành (mục 9; phản biện vòng 2 #19) |

Câu hỏi còn mở chỉ là câu thật sự mới: Q9, Q10 (phản biện vòng 2 làm lộ ra) và Q11 (kiểm cuối làm lộ ra), ở mục 10.2.

**Bản v3 đổi gì so với bản v2** (lý do, số liệu ở mục 12):

| Chủ đề | Bản v2 | Bản v3 |
|---|---|---|
| Đồ chua nhà làm | Hũ cho bánh mì ở Chặng 1 | **Chặng 2** (mục 4.12); Chặng 1 còn 8 đồ thùng đá + 4 đồ nhà làm |
| Mức lợi của sơ chế | TB +0,19 (1 ô + 1 hũ) | TB **+0,53** (2 → 3 ô thùng đá + 1 hũ, thưởng cấp món); khóa #17 là dải |
| "Sơ chế khéo thì ngon hơn" | Lợi gần như chỉ do thời gian | Thêm **thưởng cấp món**: hộp Q mẻ ≥ 85 cộng +1 … +3 Q món ("Sơ chế khéo"); hũ cộng +1 … +4 ("Vị nhà làm"); trần +5. Phần "ngon hơn" chiếm khoảng **17%** lợi của TB (Tuyệt hảo 63,1 → 71,1%) |
| Bốc hộp | Chỉ ở giao diện; lõi điền bước ngay ở `submitChon` nên bỏ qua được | Hàm lõi **`takeBox`**: chưa bốc thì bước chưa xong, trạm phụ thuộc khóa, "Ra món" hỏi như cũ |
| Kim lửa trong mô hình | σ giá trị không đổi theo chu kỳ | Sai số theo **giây** (σ ∝ 5/chu kỳ, như `luaValue` thật); `u_phin` chu kỳ 5 với vùng × 1,2; `nuong_kho_muc` chu kỳ 4, vùng [0,36; 0,94] |
| Thẻ bước người mới | Chỉ ở thao tác đầu trạm | **Mọi thao tác** trong 3 lần nấu đầu (0,8 giây; thao tác nối dùng thẻ gọn có tay mẫu) |
| Lượt "miếng kế trượt vào" | Không tính vào thời gian | 0,45 giây mỗi lượt trong `timeSec`; bố trí để chỉ **xé** còn lượt (nhặt ≤ 9 đích, thái ngắm ≤ 9 vạch, rạch ≤ 3 ổ trên một màn); xé khô mực 4 → 3 sợi |
| Khung 375×553 (bậc xs) | Không tính | Có hàng xs ở bảng 2.1, 4.7, 7.1, 7.2; sân khấu tối thiểu mọi loại ≤ 190px cao |
| Mô hình ca | Viết lại luật hàng chờ | **Lõi thật** (`startShift`, `advance`, QR chờ tiền về, mod ngày…) của người phản biện, chỉ thay phần bếp |
| Lớp vỏ | Thiếu hợp đồng cho nạo, phi / rang, ngâm, bóc, xoay vùng | Đủ bộ: hàm đo, testid, bộ giải, tour, `gestureKey`, `sample` (mục 2.0.8, 2.2, 2.3.6) |
| Thuật ngữ | "vắt tắc" ở bước chạm chai; "chặt đôi dừa bằng sống dao" | "Nêm sa tế, nước tắc"; **"Bổ dừa"** (gõ sống dao 3 nhát, không kẹt dao) |
| Sổ tiền | Dấu phần bỏ ở `cook.boxUse` (bị xóa khi bỏ món) | `sh.morning.boxes[k].used` / `.wasted`; giữ tiền cho lựa chọn sự kiện ngày |
| Thứ tự gói | P1–P3, P5–P9 được bắt đầu khi Đợt 3 còn chạy | **Mọi gói sau khi Đợt 3 phát hành** |

**Bản v4 đổi gì so với bản v3** (kiểm cuối, 9 phát hiện; trả lời từng phát hiện ở mục 13):

| Chủ đề | Bản v3 | Bản v4 |
|---|---|---|
| Lợi của người giỏi khi máy chậm (Q6) | Tự đặt "ngoại lệ có chủ ý": Giỏi ≤ +0,16 ở tau 0,9, chưa hỏi người dùng | **Bỏ ngoại lệ.** Giỏi ≤ +0,08 ở **mọi trạng thái được phát hành**. Cổng máy thật có **quy trình van định sẵn** (mục 8.5): làm giao diện nhanh hơn trước, còn chậm thì **Van gọn bếp** bỏ bớt thao tác mới theo bậc; tau > 0,85 thì không phát hành. Câu **Q11** xin người dùng xác nhận |
| Q2 (nhãn "Cách mới", Mẹo nghề) | Nhãn chỉ nhắc tên; một Mẹo nghề (`cat_thanh`) không có đường kích hoạt | Nhãn "Cách mới" 3 lần nấu đầu cho người chơi cũ (`state.newWays`); 3 Mẹo nghề (`cat_thanh`, `bao_soi_xoai`, `tac_khe_hat`) kích hoạt bằng `sai_cach:<id bước>`, `cach_moi:<id bước>` (mục 4.8) |
| Độ vững của khóa | Ngưỡng sát số đo của một bộ hạt giống | Mọi số ca gộp **3 bộ hạt giống độc lập**, ghi độ lệch chuẩn giữa các bộ; khóa #15 là trung bình 3 bộ × 20.000 món mỗi ô; biên nhỏ nhất ≥ 2,3 lần độ lệch chuẩn (mục 5.7) |
| Nhặt (khều hạt, ngắt lá) | Trừ 25 mỗi lần nhầm, không trần | **Mồi mờ sau 2 lần nhầm** (trừ tối đa 50): Tây Ninh Ẩu hệ số 1,2 −4,67 → −4,19 (3 bộ của khóa; 7 bộ: −4,84 → −4,35) |
| Ủ bột (`u_bot`) | Vùng [0,14; 0,31] | [0,13; 0,32]: Không tì vết cà phê sữa đá TB 0,9 dùng 95% → 79% ngưỡng (3 bộ của khóa; 7 bộ: 92% → 76%) |
| Khóa #16 từng ngày | Ngưỡng tuyệt đối −0,10 … +0,15 sao, ±8 điểm 5★; lời giải thích lệch mục 5.4 | Cận dưới tuyệt đối (−0,10 sao, −8 điểm) + **chặn đỉnh** so với mức chung của hồ sơ (≤ +0,08 sao, ≤ +5 điểm 5★); câu Q10 thêm lệch ở ngày mua món |
| Ngâm | 0% số ngày ở mọi cách chơi | Nhiệm vụ ngày "Trứng cút luộc, ngâm nước đá" (tối đa một lần mỗi 5 ngày): làm theo thì ngâm gặp 21% số ngày 2–15; thông báo cho người dùng ghi đủ ngâm, hạt lựu, thái sợi |
| Màn sáng | Không có đường về sảnh (PWA iOS không có nút Back) | Nút **`morning-back`** về Chuẩn bị, giữ hộp và tiền (mục 4.7) |
| Phụ bếp dùng hộp (M6) | Ghi `consumeBoxes` (hàm không có) | `planBoxes` + `takeBox(…, { staff: true })`, có test (mục 6.6) |
| Tay mẫu, tour | Thiếu tay mẫu `swipe-arc`, bóc 2 nhịp; tour "Chọn cách sơ chế" mất đích ở board mới | 13 tay mẫu + test mọi cử chỉ có tay mẫu; đích tour mới `board-tram-*[data-method="1"]` (mục 4.8, 7.7) |
| Gói | `ctx.prewarm` / `start()` không gói nào làm; P6 đụng CSS thái của P8 | P0 viết khung test, P6–P8 làm cho plugin mình; P6 chỉ ghi đè trong `mg-dao.css` nạp sau `mg-prep.css`, `fx.css` (mục 9) |
**Số liệu.** Mọi số [MH] của bản v3 chạy trên **mô phỏng của người phản biện vòng 2** (`bep-chuan/phan-bien-2/`: cả ca bằng **lõi thật** — `startShift`, `advance`, `beginCounter` … `clipTicket`, `serveTicket`, `resolveComplaint`, `endShift`, có QR chờ tiền về và mod ngày — chỉ thay phần bếp bằng mô hình thao tác viết theo chữ của bản thiết kế, đọc thẳng bảng mục 3.2 của tài liệu). Bộ mô phỏng được chép sang **`bep-chuan/mo-phong-v3b/`**, mỗi chỗ đổi đánh dấu `[v3]`; dữ liệu đọc thẳng từ bảng 3.2 của **chính tệp này**. (Thư mục `mo-phong-v3/` là bản chép dở của một lần chạy trước bị ngắt, không dùng.)

| Tệp (`bep-chuan/mo-phong-v3b/`) | Nội dung |
|---|---|
| `du-lieu.mjs`, `mo-hinh.mjs` | Dữ liệu bảng 3.2 (đọc từ tài liệu v3); mô hình thao tác: kim lửa theo giây, lượt trượt vào 0,45 giây, thẻ người mới mỗi thao tác, bỏ Đồ chua, Bổ dừa, thưởng cấp món |
| `ma054/src/core/{scoring,kitchen}.js` | Lõi 0.5.4 của phản biện (luật D, `pace`, `SCALE_KEYS`) + `[v3]` thưởng cấp món `cook.dishBonus` → `dishQuality(…, { bonus })` |
| `ca.mjs`, `chay.mjs` → `ket-qua/ca-*.json`; `tom-tat.mjs` → `ket-qua/tom-tat-*.md` | Cả ca ngày 1–15, 300 hạt giống, TB / Giỏi / Ẩu × {0.5.1, 0.5.4 không sơ chế, 0.5.4 có sơ chế}; số ô theo ngày; biến thể `timeOnly` (tách phần lợi do thời gian) |
| `loi.mjs`, `so-sanh.mjs`, `nguoi-moi.mjs`, `tien-tan-suat.mjs`, `gop.mjs` | Lợi sơ chế và dải ngày; so kịch bản; ngày người mới; tiền buổi sáng và tần suất gặp phương thức |
| `kiem-81-o.mjs` → `ket-qua-81-o.md` | Khóa #15: 81 ô, 20.000 món mỗi ô, Tuyệt hảo và Không tì vết |
| `kiem-lua-v3.mjs`, `kiem-cafe-v3.mjs`, `kiem-cafe-v3b.mjs` | Thử tham số kim lửa (`u_phin`, `nuong_kho_muc`) và cà phê (`nen_phin`, `u_bot`, w của `u_phin`) |
| `kiem-thoi-gian.mjs` → `ket-qua-thoi-gian.md`; `bang-gio-v3.mjs` → `ket-qua-bang-gio-v3.md` | Khóa #5: mọi ô 9 món × hồ sơ × 1–3 phần × ghi chú; sinh bảng 5.2, 5.3 |
| `kiem-gioi-han.mjs` → `ket-qua-gioi-han-v3.txt` | Khóa #6 (giây × 1,3 và × 1,12 × 1,3 ≤ giới hạn), cả khung rộng và khung 320 |
| `bang-do-v3.mjs` → `ket-qua-do-v3.md` | Bảng 4.2: giây mẻ, Q mẻ, thưởng cấp món |
| `chay-phu-bep-v3.mjs` → `ket-qua-phu-bep-v3.md` | Phụ bếp M6 trên bảng bước v3 |
| `cong-cu/` | Bản vá có kiểm (mỗi chỗ vá khớp đúng một lần), bản chép mã 0.5.2 để dò dòng |

Tệp kết quả chính: `ket-qua/ca-v3f-chinh.json` (tau 0,6 + gọn), `ca-v3f-xau.json` (tau 0,9 + gọn), `ca-v3f-tg.json` (chỉ phần thời gian), `ca-v3f-nonovice.json` (bỏ thẻ người mới ở cả hai bản), `ca-v3f-da.json` (chỉ thùng đá), `ca-v3f-hu.json`, `ca-v3f-hu-xau.json` (chỉ hũ).

**Số liệu của bản v4** (kiểm cuối). Bộ mô phỏng được chép tiếp sang **`bep-chuan/kiem-cuoi/v4/`** (chỗ đổi đánh dấu `[v4]`: mồi mờ của nhặt đọc từ bảng 3.2, tùy chọn `force3` cho nhiệm vụ trứng cút); dữ liệu đọc thẳng bảng 3.2 của **chính tệp v4** (hoặc của bản biến thể `bt-*.md` khi thử van). Khác bản v3 ở **cách đo**: mọi số ca là **gộp 3 bộ hạt giống độc lập** (muối hạt giống 0, 17, 29; mỗi bộ 300 hạt giống × 3 hồ sơ × 15 ngày), kèm **độ lệch chuẩn giữa các bộ**; 81 ô là trung bình **7 bộ × 20.000 món** (khóa #15 dùng 3 bộ đầu, 60.000 món mỗi ô). Chỗ ghi "1 bộ" là một bộ 300 hạt giống; "100 hạt giống" là lượt thăm dò.

| Tệp (`kiem-cuoi/v4/`) | Nội dung |
|---|---|
| `kc4-chay.mjs`, `chay-jobs.sh`, `jobs*.txt` | Chạy một bộ (tên, bản thiết kế, tùy chọn, muối hạt giống) → `ket-qua/ca-<tên>.json`, nhật ký `kq4/log-<tên>.txt` |
| `kc4-gop.mjs` → `kq4/gop-*.txt` | Gộp nhiều bộ: ngày 4–15, ngày 1–15, từng ngày, độ lệch chuẩn giữa các bộ |
| `kc4-ghep.mjs`, `kc4-cong.mjs`, `kc4-ngan.mjs` | Ghép phần 0.5.1 từ bộ nền cùng hạt giống (phần 0.5.1 không phụ thuộc tau hay van); cộng bộ; bảng một dòng |
| `kc4-o.mjs` → `kq4/o81-*.json`, `.txt`; `kc4-bang81.mjs` → `kq4/bang81-v4.md`; `kc4-tom.mjs` | Khóa #15 nhiều bộ hạt giống, biên theo độ lệch chuẩn |
| `bien-the.py`, `van-v.py`, `bt-*.md` | Bản thiết kế biến thể **chỉ để mô phỏng**: số mồi, vùng ủ bột, các mức Van gọn bếp |
| `tien-tan-suat.mjs` → `kq4/tien-tan-suat-v4.txt` | Tiền buổi sáng, tần suất gặp phương thức |

Tệp kết quả chính: `kq4/gop-chinh.txt` (tau 0,6 + gọn, van 0), `gop-m2-x085.txt` (tau 0,85 + van mức 2), `gop-m1-x075.txt` (tau 0,75 + mức 1), `gop-x075.txt`, `gop-xau-v4.txt` (tau 0,75 và 0,9, không van), `bang81-v4.md`, `o81-fade-ubot.txt` (7 bộ), `o81-van-d.txt`, `o81-van-a.txt` (81 ô của các mức van). Số của bản v3 ở mục 11, 12 và các dòng ghi "(v3)" giữ nguyên để tra cứu.

**Ký hiệu.** `par` = giây chuẩn của một thao tác (quyết định giới hạn giờ). `pace` = mảng par của bản 0.5.1, đóng băng (quyết định nhịp khách). `w` = trọng số nguyên 1–3 như repo; **tỉ trọng** = w / Σw. TB / Giỏi (GI) / Ẩu (AU) = ba hồ sơ người chơi của mô hình. **tau** = giây tốn thêm cho mỗi thao tác nối trong một trạm. **Gọn** = rút gọn nhịp chờ (Q1). **SC** = có sơ chế buổi sáng. **[MH]** = số mô hình, phải đo lại trên máy thật. **(HB)** = theo hiểu biết, chưa có nguồn, cần người dùng soát.

---

## Mục lục

0. Quyết định người dùng đã chốt
1. Tóm tắt và nguyên tắc
2. Danh sách thao tác (11 loại cũ, 8 loại mới)
3. Công thức mới từng món
4. Màn "Sơ chế buổi sáng"
5. Cân bằng và mô phỏng
6. Lõi và save
7. Giao diện, hình, âm
8. Kiểm thử
9. Gói triển khai
10. Rủi ro và câu hỏi còn mở
11. Phụ lục phản biện vòng 1 (giữ từ bản v2)
12. Phụ lục phản biện vòng 2 (trả lời 25 phát hiện)
13. Phụ lục kiểm cuối (trả lời 9 phát hiện, bản v4)

---

## 1. Tóm tắt và nguyên tắc

### 1.1 Tóm tắt

1. **Thao tác nhỏ, gom thành trạm.** Mỗi thao tác là một động từ (Rửa, Cắt thanh, Khều hạt, Vắt, Bào, Xé, Đập, Giã…) dài 1,4–5 giây và **vẫn là một bước lõi riêng** (`submitStep` riêng, lưu ngay; phụ bếp và hộp sơ chế thay được từng thao tác). Giao diện gom 1–4 thao tác cùng chỗ làm thành **một trạm** trên Thớt ("Dưa leo", "Chảo trứng", "Ổ bánh"…). Chạm trạm một lần là chơi **liền tay** cả chuỗi trên một sân khấu: `playStep` hai lớp mount sẵn thao tác kế, chuyển cảnh 250 ms, động từ 28px hiện 350 ms (chạm được ngay), **một con dấu cuối trạm**.
2. **19 loại thao tác.** Giữ 11 loại cũ; **Thái** nâng cấp mạnh nhất: **cách thái quyết định cử chỉ** (ngắm–nhấc, kéo dao dọc vạch, rạch dừng trước vạch đỏ, kéo theo nhịp, hai lượt có xoay thớt, dao theo nhịp ở mẻ sáng). Thêm 8 loại: `bam` (băm), `chat` (chặt; lớp vỏ `dua` là bổ dừa), `dap_dap` (đập dập), `gia` (giã), `xe` (xé), `bao` (bào; lớp vỏ `nao` nạo theo cung), `vat` (vắt; lớp vỏ `nen` nén phin, `vai` vắt ráo), `nhat` (nhặt, khều hạt). Phi, rang, luộc, nướng, **ngâm** là lớp vỏ của `lua`.
3. **9 món viết lại theo cách người bán thật làm.** 54 → **71** thao tác (trừ Chọn), gom trong 27 trạm. Giữ cả 63 id bước cũ; 3 bước đổi loại giữ id (`vat_tac` cham → vat, `thai_xoai` thai → bao, `xe_kho_muc` cha → xe); 11 id mới; `cat_hanh` thành thao tác chỉ có ở mẻ sáng. Σpar mỗi món −2,3% … +8,3%. **Băm, chặt, giã, nạo chỉ có ở mẻ sáng** (người dùng chốt Q4/Q5); trong ca là thao tác nhanh.
4. **Thời lượng gần như cũ [MH].** Kịch bản chính (tau 0,6 + gọn): TB 1 phần −5,2% … +2,0%; **mọi ô** (9 món × TB / Giỏi / Ẩu × 1–3 phần × từng ghi chú và cặp ghi chú) ≤ **+7,4%**; trong ca thật, giây mỗi dòng món TB −2,6%, Giỏi −0,9%, Ẩu +1,0%. Xấu nhất còn lại (tau 0,9 + gọn): mọi ô ≤ **+10,8%** (kể cả khung 320, lượt trượt vào 0,8 giây). Tham khảo tau 0,9 không gọn: ≤ +19,8%, vẫn dưới trần +20%.
5. **Giá món, giá vốn trong ca, nguyên liệu trên kệ, nhịp khách giữ nguyên.** Mỗi món có `pace` = mảng par 0.5.1; `linePar` đọc `pace` nên **lịch khách và ngân sách chờ không đổi một bit** (207/207 ca). Người **không** sơ chế, ngày 4–15, lõi thật (v4, gộp 3 bộ hạt giống): TB **+0,09**, Giỏi **+0,04**, Ẩu **−0,02** sao/khách so với 0.5.1 (phần cộng của TB do rút gọn nhịp chờ đã chốt ở Q1). Máy thật chậm hơn mô hình thì cổng phát hành áp van định sẵn (mục 8.5); trạng thái phát hành chậm nhất còn cho phép (tau 0,85 + van mức 2): +0,10 / +0,03 / −0,02. Không phát hành ở tau 0,9 (ở đó không van: −0,02 / −0,05 / −0,03).
6. **Chất lượng giữ phân bố cũ [MH].** 81 ô (9 món × 3 hồ sơ × hệ số vùng 0,9 / 1,104 / 1,2), kim lửa sai số theo giây, trung bình 3 bộ hạt giống × 20.000 món mỗi ô: Tuyệt hảo lệch tối đa ±4,6 điểm, Không tì vết trong ±max(2 điểm; 30%) ở **81/81 ô**, ở cả van mức 0, 1, 2; xét riêng từng bộ trong 7 bộ: 567/567 ô lẻ đạt; biên nhỏ nhất 2,3 lần độ lệch chuẩn (mục 5.5, 5.7). Trong ca (không sơ chế), ngày 4–15: Tuyệt hảo TB 62,4 → 63,3%, Giỏi 91,6 → 93,6%, Ẩu 9,7 → 7,7%; Không tì vết TB 6,2 → 6,1%, Giỏi 41,7 → 41,0%.
7. **Màn "Sơ chế buổi sáng"** hiện sau khi bấm "Mở hàng" ở sảnh Chuẩn bị (từ ngày 2), **bỏ qua bằng một chạm**, có "Như hôm qua" và công tắc "Hỏi sơ chế mỗi sáng". **Thùng đá 2 ô (ngày 2–4), 3 ô (từ ngày 5)** cho đồ thay bước và **1 hũ trên kệ nhà làm**; mẻ 4 hoặc 8 phần; trả tiền lúc làm, **bội 500đ**; chơi không bấm giờ bằng chính plugin trong ca. 8 đồ **thay bước** (rau bánh mì, tắc cắt bỏ hạt, bánh tráng cắt sợi, xoài bào, trứng cút luộc–ngâm–bóc, khô bò xé, cùi bưởi nấu sẵn, sữa muối) và 4 **đồ nhà làm** (hành tỏi phi, sa tế, đậu phộng giã, nước cốt dừa) — đây là chỗ có **băm, chặt, đập dập, giã, nạo, phi, rang** ở Chặng 1. Đồ chua nhà làm và tỏi băm để dành Chặng 2 (mục 4.12). Trong ca, trạm có hộp hiện "Có sẵn · Tốt 92"; **phải chạm "Bốc"** (hàm lõi `takeBox`) thì bước mới xong. Hết ca thì phần thừa thành hao hụt.
8. **Sơ chế khéo thì món ngon hơn.** Điểm bước bị thay = điểm của chính thao tác đó trong mẻ; thêm **thưởng cấp món**: mỗi hộp Q mẻ ≥ 85 / 90 / 95 cộng **+1 / +2 / +3 Q món** ("Sơ chế khéo"), hũ Q mẻ ≥ 70 / 80 / 88 / 95 cộng **+1 … +4** ("Vị nhà làm"), trần +5 mỗi món.
9. **Lợi rõ, đúng mức người dùng chốt [MH]:** so với không sơ chế, ngày 4–15 (gộp 3 bộ hạt giống): TB **+0,53** sao/khách (ngày thấp nhất +0,46, cao nhất +0,58), Giỏi **+0,07** (+0,05 … +0,10), Ẩu +0,02; khoảng 83% lợi của TB đến từ nhanh hơn (chờ món > 150% ngân sách 10,7 → 1,7%), 17% từ ngon hơn (Tuyệt hảo 63,3 → 71,6%, Q 89,5 → 91,3). Buổi sáng khoảng 41 giây; trả trước khoảng 14.900đ, bỏ thừa khoảng 5.000đ mỗi ngày. Ở mọi trạng thái được phát hành Giỏi ≤ +0,08 (không còn "ngoại lệ" của v3; mục 8.5, câu Q11).
10. **Phụ bếp M6 làm được mọi thao tác.** Bảng `METHOD_SPECS` (`src/core/methods.js`): mỗi loại (và mỗi lớp vỏ đổi số đo) có hàm chấm thuần, hàm sinh **số đo** theo tay nghề (kim lửa sinh sai số theo giây), hàm thời gian có lượt trượt vào; phụ bếp gọi đúng hàm chấm, trần 88 ở chỗ gọi. Tay nghề 0,3 / 0,6 / 0,9 cho Q món 71–81 / 80–85 / 87–88.
11. **Save lên `STATE_VERSION` 4** (`state.morning`, `sh.morning` có `used` / `wasted` từng hộp, `sh.ledger.morning`, kết quả bước có `prepped`); M6 lên 5. 12 gói triển khai, **mọi gói bắt đầu sau khi Đợt 3 (0.5.3) đã gộp và phát hành**.

### 1.2 Nguyên tắc

| # | Nguyên tắc | Cách giữ | Kiểm bằng |
|---|---|---|---|
| N1 | **Thời lượng một món: trần cứng +20% ở mọi ô, mọi kịch bản phát hành; mục tiêu: kịch bản chính ≤ +8% mọi ô, trung bình dòng món trong ca ≤ +2% mọi hồ sơ; tau 0,9 + gọn ≤ +12% mọi ô** | Trạm (một con dấu mỗi trạm), rút gọn nhịp chờ (Q1, bắt buộc), giảm tham số đếm, "tự xong khi đủ" cho mọi bước bày, việc lâu đưa sang mẻ sáng; **lượt "miếng kế trượt vào" tính 0,45 giây** và bố trí để chỉ xé còn lượt | `m54-balance` khóa #5: `dishTimeModel` cho 9 món × TB / Giỏi / Ẩu × 1–3 phần × ghi chú, khung rộng và khung 320; mô phỏng rút gọn khóa thời gian dòng món trong ca; cổng đo máy thật (mục 8.5) |
| N2 | **Giá món, giá vốn trong ca, nhịp khách giữ nguyên** | `price`, `cost`, `ingredients`, `shelf` không đổi; `linePar` đọc `recipe.pace` cho **cả** lịch khách lẫn ngân sách chờ. Đồ nhà làm thay hàng mua sẵn cùng giá (0đ buổi sáng) | `linePace === linePar 0.5.1` 207/207 ca; `integration-shift` không đổi |
| N3 | **Chuẩn ẩm thực Việt, từ miền Nam** | Bước và thứ tự theo `am-thuc.md`: dưa leo cắt thanh; tắc cắt đôi, khều hạt, vắt vừa tay; xoài gọt rồi bào; khô mực nướng → gói giấy đập dập → xé ngang thân; phin ủ bột → nén nắp → châm đầy; cùi bưởi vắt thật ráo; trứng cút luộc xong ngâm nước đá; hành tím thái lát mỏng rồi phi; dừa khô gõ sống dao bổ đôi rồi nạo; bánh mì xẻ một bên, kẹp, rồi mới rưới nước tương | Bảng mục 3 dẫn nguồn `[n]` của `am-thuc.md`; dòng (HB) liệt kê ở mục 10 |
| N4 | **Mỗi phương thức một cử chỉ riêng, đã tay; mỗi động từ một cử chỉ** | Bảng 2.1: không hai loại nào cùng cử chỉ và cùng thước; trong ca có ít nhất **5 cử chỉ dao** khác nhau; "vắt" chỉ dùng cho cử chỉ nhấn giữ (`vat`) | Test `GESTURE_BY_TYPE`, `GESTURE_BY_CUT`, `gestureKey`; soát nhãn (mục 3.2) |
| N5 | **Phản hồi ngay ở `pointerdown`**, âm + hình + hạt trong khung kế tiếp | Quy ước chung mục 2.0.4 | Đo trong bản dựng thử (cổng mục 8.5) |
| N6 | **Hình đổi dần 3–4 mức** — phản hồi "chịu lực" chính, giữ cả khi giảm chuyển động; **không bao giờ cắt hình trạng thái** | Mục 7.4 | `m54-art` |
| N7 | **Chấm công bằng, không oan vì trễ chạm** | Thao tác nhịp chấm theo **khoảng giữa hai nhát** hoặc theo **kết quả** (giã); nhát hụt tính 20 chứ không 0; ngưỡng px có sàn tuyệt đối ở mọi cỡ màn | `m54-scoring` |
| N8 | **Không nhàm khi lặp** | Biến thể theo hạt giống, dàn hướng dẫn mờ dần theo thạo món, combo chỉ nhân hiệu ứng, mẻ sáng gom việc lặp | Mục 2.0.6 |
| N9 | **Vừa một màn ở mọi khung của `vua-man-khung`** (402×874 an toàn 62/34, 402×680, 402×760, 390×844, 360×780, 412×915, 375×667, 360×600, **375×553 (bậc xs)**, 320×568): vùng chạm ≥ 44px, chữ ≥ 13px, vùng chơi co theo chiều cao còn lại. Ở khung chính: không cuộn. Ở khung nhỏ: theo đúng luật hiện có của `vua-man-bep` (Thớt: "Ra món" và trạm đang làm được thấy không cuộn; sân khấu: vùng chơi và chân thấy trọn) | Thớt theo trạm có lưới 3 cột ở xs (mục 7.1); **sân khấu tối thiểu ≤ 288px rộng, ≤ 190px cao** (vùng chơi ở xs khoảng 200px); màn sáng không danh sách cuộn (mục 4.7) | `m54-vua-man-1`, `m54-vua-man-2` (10 khung) |
| N10 | **Nhân viên làm được** | Mọi loại và mọi lớp vỏ đổi số đo có `score` thuần + `sample` số đo theo tay nghề + `timeSec` ở `METHOD_SPECS`; công cụ mô phỏng gọi đúng các hàm này | `m54-methods` |
| N11 | **Không phạt người chơi vì việc ta thêm, cũng không cho không** | Hiệu chỉnh từng thao tác để **mỗi món × mỗi hồ sơ × mỗi hệ số vùng** giữ Tuyệt hảo trong ±5 điểm và Không tì vết trong ±max(2 điểm; 30%) của 0.5.1, với kim lửa sinh sai số theo giây; luật Không tì vết D (Q3) | `m54-balance` khóa #15 (81 ô) |
| N12 | **Người không sơ chế ngang 0.5.1** | Thời lượng như N1; thẻ người mới ở mọi thao tác trong 3 lần nấu đầu (tổng thời gian thẻ tương đương 0.5.1) | Khóa #16 **hai phía**, gộp ngày 4–15 và **từng ngày 1–15** (cận dưới tuyệt đối, chặn đỉnh so với mức chung), ở tau 0,6 + gọn và ở **trạng thái phát hành** (tau đo được + mức van đang áp; mục 5.7, 8.5) |
| N13 | **Sơ chế có lợi rõ đúng mức người dùng chốt** (Q6), không bắt buộc | Thùng đá 2 → 3 ô + 1 hũ; bốc hộp một chạm bắt buộc; thưởng cấp món; **van định sẵn ở cổng phát hành** khi máy thật chậm (mục 8.5) | Khóa #17: dải TB +0,45 … +0,61, Giỏi ≤ +0,08 ở tau 0,6 + gọn **và** ở trạng thái phát hành; không có ngoại lệ (mục 5.7) |
| N14 | **Tiền quán luôn bội 500đ, sổ ca khớp ví** | Giá hộp theo phần là bội 500đ; giá vốn Chọn khi có hộp = giá vốn không hộp − phần giá hộp; mọi khoản chi buổi sáng vào `sh.ledger.morning`; số phần dùng / bỏ ở `sh.morning.boxes[k]` | Khóa #18 và `m54-morning` |

### 1.3 Bản tổng hợp chọn gì từ ba phương án

| Vấn đề | Chọn | Không chọn (lý do) |
|---|---|---|
| Hình dạng lõi | Mỗi thao tác một bước lõi; **trạm chỉ ở giao diện** (B 1.3, A 1.4b) | "parts" lồng trong bước (C 1.5.2): phải làm lại ở cấp phần mọi luật vá ghi chú, Làm lại, Tự làm, hộp, migrate; phụ bếp mất khả năng nhận từng thao tác |
| Nhịp chờ | **Rút gọn nhịp chờ** (C 1.5.3; người dùng chốt Q1): con dấu 450 ms khi ≥ 70, nút "Tiếp →", ra món 1,6 giây, thẻ bước 0,8 giây — bắt buộc ở gói P9 | Để nguyên nhịp 0.5.1: ở tau 0,9 người TB mất 0,17, người Giỏi mất 0,13 sao/khách (bản v2, mục 5.4) |
| Nhịp khách | `pace` = mảng par 0.5.1 (B 5.4, trùng từng bit), dùng cho **cả** lịch khách lẫn ngân sách chờ | Ngân sách chờ đọc Σpar mới: đổi khóa cân bằng người dùng không yêu cầu |
| Trọng số | Giữ `w` nguyên 1–3, báo tỉ trọng % trong bảng; đổi có chủ ý một chỗ: `u_phin` w 2 → 3 (mục 5.5) | Đổi `w` sang phần trăm: phá `data.test.mjs:135`, `kitchen.js:382` (`canAuto` đòi w = 1) |
| Thái | Cách thái quyết định cử chỉ; thái nhịp chỉ cho **kéo** (bánh tráng, hành lá ở mẻ sáng) và **dao** ở mẻ sáng (hành tím thái lát), chấm theo khoảng giữa hai nhát | Thái nhịp cho mọi nhát cắt (C): dưa leo, tắc, bánh tráng cùng một cảm giác |
| Giã | Chấm theo **kết quả trong cối** (A 2.6) | Chấm trung bình `timingScore`: dễ oan vì Safari iOS trễ chạm 30–80 ms |
| Băm, chặt, giã, nạo | **Chỉ ở mẻ sáng** (người dùng chốt Q4/Q5): Sa tế (chặt khúc sả, băm), Hành tỏi phi (đập dập, băm tỏi), Đậu phộng (rang, giã), Nước cốt dừa (bổ dừa, nạo) | Đưa vào thao tác trong ca của món nền (phản biện vòng 2 #12): trái quyết định người dùng |
| Bóc, bào, băm, xé, vắt | Bóc 2 nhịp, bào có "Vạch an toàn" và thước "Lượng sợi", băm hai dao + vun, vắt τ riêng theo nguyên liệu với thời gian tính từ thước giữ, xé nhẹ tay | — |
| Điểm hộp | **Điểm của chính thao tác đó trong mẻ**, không trần + **thưởng cấp món** theo Q mẻ; mẻ do phụ bếp làm trần 88 | Cộng điểm vào một thao tác (bản v2): Q món chỉ tăng +0,4 … +1,2, người chơi không thấy (phản biện vòng 2 #2) |
| Không tì vết | Luật D "trượt đúng một thao tác nhỏ" ở 85–89 (người dùng chốt Q3) | Giữ luật cũ: bánh mì, cà phê tụt Không tì vết chỉ vì thêm thao tác |
| Lối vào màn sáng | **Màn trước ca** + dải "Sơ chế sáng" trong tấm "Hôm nay" của sảnh mới (Đợt 3) + "Như hôm qua" + công tắc; tự hiện tắt khi trình duyệt do kiểm thử tự động điều khiển (cờ do giao diện tính, lõi nhận `ctx.autoAllowed`) | Thêm ô thứ 8 vào lưới lối vào: phá khóa 7 ô của Đợt 3 |
| Số ô | **Thùng đá 2 ô (ngày 2–4), 3 ô (từ ngày 5) + 1 hũ** — đúng mức lợi người dùng chốt (Q6) | 1 ô + 1 hũ (bản v2): TB +0,21, dưới mức người dùng chọn; 2 ô cố định: +0,36; 3 ô từ ngày 2: +0,54 nhưng ngày 2–4 thừa ô; 2 hũ: buổi sáng +11 giây mà lợi gần như không đổi (mục 5.6) |
| Phạm vi | 8 đồ thay bước + 4 đồ nhà làm; hình mới ≤ 100 KB trong tệp riêng, trần tổng 420 KB | 16 đồ, 134 KB hình (B); đồ chua, tỏi băm (Chặng 2) |
| Gói | P0 tạo sẵn mọi tệp mới, gắn CSS/JS vào `index.html`, `sw.js` trong cùng gói; **mọi gói sau khi Đợt 3 phát hành** | Bắt đầu sớm song song Đợt 3: các workflow dùng chung một thư mục repo, sửa chồng `vfx.js`, `index.html`, `sw.js` |

---

## 2. Danh sách thao tác

### 2.0 Khung chung

#### 2.0.1 Chạy trạm (`src/ui/minigames/_tram.js`, mới; không phải một loại thao tác)

```js
// Chơi liền các thao tác còn mở của một trạm trên CÙNG sân khấu (hai lớp, mục 7.2). Mỗi thao tác vẫn mount plugin của loại nó
// qua playStepIn(layer, step, ctx), với ctx.tram = { i, n, id } (plugin không dựng đầu sân khấu, không tự giữ kết quả). Đồng hồ riêng từng thao tác.
// onPart(stepId, result) được gọi NGAY khi xong từng thao tác → màn Bếp gọi submitStep (lưu tức thì; tải lại giữa trạm thì
// quay về Thớt, trạm còn các thao tác chưa làm). Dừng khi hết thao tác mở trong trạm, khi bước chí mạng < 50 (criticalPrompt),
// hoặc khi destroy().
export function playTram(stage, steps, ctx, { onPart, verbs }) // → { result: Promise<[{ stepId, score, details }] | null>, hold(on), destroy() }
```

| Mục | Quy định |
|---|---|
| Đầu sân khấu (`buildFrame2`) | Chấm của **các thao tác trong trạm** (●●○, tối đa 4), không phải mọi bước của món; ruy băng tên trạm; tên thao tác ở tiêu đề. Không bao giờ chạm mức `is-crowded` (≥ 5 chấm) |
| Chuyển giữa hai thao tác | 250 ms mờ chéo giữa **hai lớp sân khấu** (`createTwinStage`, mục 7.2): plugin kế được mount sẵn vào lớp ẩn (`ctx.prewarm`, đồng hồ chưa chạy) khi thao tác trước đang hiện chữ kết quả, rồi đổi lớp; lớp `.mg-fx` nằm ngoài hai lớp nên không bị xóa. Nguyên liệu đổi sang hình trạng thái mới (`state-map.js`); dụng cụ cũ trượt ra, dụng cụ mới trượt vào. Mục tiêu đo trên máy thật: ≤ 0,35 giây từ lúc thả tay tới lúc chạm được |
| Giới hạn giờ | Mỗi thao tác tính bằng `gestureLimitSec(step, ctx)` = max(2,5·par, sàn của loại) (mục 2.0.7), không còn plugin nào dùng `stepLimitSec(step.par)` |
| Động từ | 28px ("Bào!", "Xé!") hiện 350 ms chồng lên chuyển cảnh, **không chặn chạm** |
| Chữ kết quả từng thao tác | "Tốt 85" 13px nổi trên dụng cụ 300 ms, không con dấu |
| Bảng chọn cách | Bước có `method` thì bảng hiện **trước khi vào trạm**, một lần cho cả trạm (chuỗi không bị cắt ngang) |
| Con dấu cuối trạm | Hạng theo trung bình có trọng số w các thao tác vừa làm, kèm dải tick từng thao tác; cả trạm Hoàn hảo thì ruy băng "Liền tay!" (chỉ hiệu ứng). Thời gian giữ theo phụ phí gọn (mục 7.2) |
| Trạm dừng giữa chừng | Thao tác kế cần bước của trạm khác (`after`) thì trạm đóng dấu phần đã làm; ô trạm ghi "Chờ: Chảo trứng" |
| Bước chí mạng < 50 | Dừng trạm, `criticalPrompt` như hiện nay |
| Tự làm (thạo cấp 2) | Nút "Tự làm cả trạm" trong bảng mở trạm chỉ khi **mọi thao tác còn lại** có w = 1, không chí mạng, không có hộp; mỗi thao tác 80 điểm (`autoStep` như cũ) |
| Làm lại | Chạm trạm đã xong mở bảng liệt kê từng thao tác kèm nút "Làm lại" (một lượt mỗi món, trần 85, như cũ); thao tác lấy từ hộp không làm lại được |
| Nấu thử | `untimed` như cũ; không dùng hộp |
| Mẻ sáng | Cùng `playTram` với `ctx.untimed` và `ctx.batch = { size, round }` (mục 4) |
| Trạm có hộp | Ô trạm "Có sẵn" chưa phải trạm xong: chạm là **bốc** (`takeBox` ở lõi, 600 ms), rồi chơi tiếp phần làm tay nếu có trong cùng lần chạm (mục 4.5) |
| Thẻ bước người mới | 3 lần nấu đầu của món: thẻ 0,8 giây ở **mọi thao tác** — thẻ đầy đủ ở thao tác đầu trạm, thẻ gọn có tay mẫu chạy một lượt ở thao tác nối (mục 7.7) |

#### 2.0.2 Ngưỡng cử chỉ dùng chung (CSS px, ms)

| Ngưỡng | Giá trị | Dùng ở | Hàm đo (`_gesture.js`) |
|---|---|---|---|
| Chạm | dịch ≤ 8px **và** ≤ 250 ms | nhặt, giã, kéo theo nhịp, băm | (trong plugin) |
| Bắt đầu kéo | dịch > 8px | xé, bào, cắt thanh, rạch | — |
| Vuốt hợp lệ | ≥ 24px | gọt, vun khi băm (≥ 40px), nâng dao khi chặt (≥ 60px; bổ dừa ≥ 40px), nạo theo cung (≥ 60px) | `classifySwipe` (có); nạo: `createScraper` (mới) |
| Đổi chiều | ≥ 24px | bào, lắc | `createReversalCounter` (có) |
| Giữ | ≥ 300 ms | vắt, nén | `holdLevel` (mới) |
| Kéo quá nhanh | > 1.400 px/s trong 2 mẫu liền | xé ("Phựt!"), bóc (> 1.600 px/s: "Lủng rồi!") | `classifyDrag` (mới) |
| Lệch đường kéo | RMS khoảng cách vuông góc tới vạch | cắt thanh, rạch | `lineDeviation` (mới) |
| Vùng chạm | ≥ 44×44px; núm kéo 48px; tâm hai đích cách ≥ 48px | mọi loại | — |
| Cửa sổ an toàn | ≥ 24px × `mul` ở mọi cỡ màn | bào (vạch đỏ), rạch (vạch cuối) | `createGrater` (mới) |
| Không bắt đầu kéo | trong 24px sát mép trái (cử chỉ quay lại của iOS) | xé, bào, cắt thanh | — |
| Số đích tối đa một màn | 4 sợi xé (3 ở khung 320 và 375×553); 9 đích + 3 mồi khi nhặt (lưới 4 × 3); 9 vạch thái ngắm (tắc 3 hàng × 3 quả); 6 vạch cắt thanh; 6 vạch mỗi lượt khi hai lượt; 3 ổ bánh khi rạch (nằm chồng) | Nhờ vậy ở 1–3 phần chỉ **xé** còn phải chơi theo lượt (miếng kế trượt vào); **mỗi lượt 0,45 giây nằm trong `timeSec`** (`BALANCE.roundSec`; phản biện vòng 2 #8) | — |

#### 2.0.3 Năm khuôn thước (theo `thao-tac.md` mục 2.3)

| Khuôn | Hình | Loại dùng | Hàm thuần |
|---|---|---|---|
| G1 Vạch chấm, mũi tên | Đường chấm viền đậm trên nguyên liệu, vạch kế tiếp sáng lên, bóng đỏ xem trước chỗ dao sẽ cắt | thai, chat (vạch khớp), xe (mũi tên thớ), got | `thaiGuides`, `nearestUncut` (có) |
| G2 Kim đi về | Thước ngang có vùng xanh, kim chạy 0 → 1 → 0, chu kỳ 1,1 giây | dap, chat (lực), dap_dap | `needleValue` (có) |
| G3 Thanh dọc có vùng đích có tên | Thanh đứng mép phải 40px, dâng theo thao tác; 1–2 vùng có chữ ("Nhỏ"/"Nhuyễn", "Dập", "Vừa tay"/"Ráo", "Sánh"), vùng còn lại vẽ mờ để dạy phân biệt; vạch có tên ("Đắng", "Nhão"; không có "Tách béo" vì người dùng chốt Q7 giữ sữa muối) | bam, gia, vat, xoay (đánh sữa muối), bao (lượng sợi, lượng cơm dừa) | `zoneScore` (có) |
| G4 Vòng phách co lại | Vòng co từ 2,2× về vòng đích quanh miệng cối trong một phách; phách vun màu cam có hình muỗng | gia | `createBeatTrack` (mới) |
| G5 Vòng hẹn giờ có mốc | Vòng quanh thau nước đá, mốc "Vớt ra" là vùng xanh, chữ "≈ 5 phút" (Chặng 2: hũ giấm đồ chua; vòng quanh miếng trên vỉ, mốc lật / mốc gắp) | `lua.ngam` (mẻ sáng: ngâm nước đá trứng cút, cùi bưởi) | `luaValue`, `scoreLua` (có) |

Thước luôn có **hình hoặc chữ** kèm màu; nhấp nháy ≤ 2 lần/giây; ghi số cho e2e lên chính phần tử: `data-v`, `data-a`, `data-b`, `data-next`, `data-max`.

#### 2.0.4 Phản hồi chuẩn

- **Âm** ra cùng khung với hình, lệch cao độ ±4% (như `audio.js`); nhát chuẩn liên tiếp +16 Hz mỗi nấc, tối đa 24 nấc (băm, giã, kéo theo nhịp, bào); âm lặp nhanh giới hạn 12 lần/giây.
- **Hạt** theo màu nguyên liệu, tối đa 30 nút DOM / 150 hạt canvas (`VFX_LIMITS`).
- **Rung khung thay rung máy** (iOS 26.5 chặn rung nhiều nhịp, `thao-tac.md` ⟨27⟩): nhỏ 1px / 60 ms (nhịp đều, mỗi 4 nhát); vừa 2–3px / 120 ms (chặt, đập dập); lớn 4–6px / 250 ms (qua vạch đỏ, lủng, cháy).
- **Dừng hình** 40–60 ms nhát chuẩn, 90 ms nhát chặt; giữ cả khi giảm chuyển động.
- **Chữ khen** tự viết, mỗi loại 3–5 câu xoay vòng ở `dialogue.js` ("Đều tay!", "Ngọt dao!", "Nhịp đều!", "Chày chắc tay!", "Sợi dài đẹp!", "Sợi mướt!", "Vừa tay!", "Sánh mịn!", "Vàng ươm!", "Sạch bong!"); không chứa `par`, `toast`, `chip`, `MV`, `seed`.
- **"Nhanh tay!"**: xong trước 50% giới hạn giờ thì `details.fast = true`, hiện chữ, **không cộng điểm** (để nhiệm vụ sau này dùng).
- Chữ cảnh báo (vd "Phựt! Đứt sợi") dùng **chữ trắng viền mực 3px** như `popLabel`, không dùng chữ hồng trên nền nâu (lỗi dựng thử B).

#### 2.0.5 Giảm chuyển động

| Giữ | Bỏ |
|---|---|
| Hình đổi dần theo tiến độ, thước, chữ, âm, dừng hình, thao tác trực tiếp (vật theo ngón: sợi xé, quả bào, bình lắc, dao kéo dọc vạch) | Dao vung (đổi tư thế một khung), hạt bay, rung khung (thay bằng chớp viền tĩnh 400 ms), đường cong bay vào chén (hiện thẳng), chuyển cảnh trạm (mờ chéo 120 ms) |

Vòng phách giã khi giảm chuyển động **không bỏ** mà đổi thành vạch chạy trên thanh ngang cùng thời điểm (C 2.6), vì đó là thông tin nhịp.

**Dải tự trôi** của cắt kéo và dao theo nhịp (`thai` `keo`, `nhip`) khi giảm chuyển động **nhảy bậc**: xấp bánh / cọng hành đứng yên giữa hai phách, tới phách thì nhảy đúng một vạch (không trượt liên tục), vạch kế sáng lên đúng thời điểm phách; chấm vẫn theo khoảng giữa hai nhát nên độ khó không đổi. Vòng hẹn giờ G5 của `lua.ngam` khi giảm chuyển động đổi thành vạch chạy trên thanh ngang như vòng phách giã (phản biện vòng 1 #17).

#### 2.0.6 Chống nhàm và thang theo thạo món

1. **Biến thể theo hạt giống** (`uiRand`, băm theo id thao tác): cỡ và độ cong quả, số hạt tắc hiện ra (n + 0–1 hạt nhỏ không bắt buộc), hướng miếng khô, vị trí phách vun, lệch vạch ±3px. **Không đổi tham số đếm.**
2. **Thạo món** cấp 2 / 3: vùng chấm × 1,05 / × 1,10 (đã có `MASTERY_ZONE_MUL`); dàn hướng dẫn mờ sau thao tác đầu (cấp 2), chỉ còn vạch đầu và thước, con dấu có chữ "Tay nghề!" (cấp 3). Nhịp kéo, giã nhanh thêm 5% mỗi cấp (trần 10%), bù bằng vùng nới.
3. **Combo trong một thao tác** ở 3 / 5 / 8 nhát chuẩn liên tiếp: chữ nổi / lấp lánh + âm cao một nấc / rung 1px + nền sáng 150 ms. Mất combo không bị phạt. Combo không nhân điểm.
4. **Mẻ sáng gom việc lặp** nhiều nhất trong ca (rửa, cắt, bóc, bào) thành một mẻ (mục 4).
5. **Nâng cấp đồ nghề** (để sau 0.5.4, giữ chỗ): "Bàn bào Nhật" (cửa sổ an toàn +8px), "Cối đá" (nhịp giã chậm 10%), "Kéo bếp tốt" (vùng nhịp × 1,1), "Thùng đá lớn" (thêm 1 ô thùng đá; phải chạy lại khóa #17: lợi của TB đã ở giữa dải +0,45 … +0,61, thêm ô dễ vượt trần, mục 5.6). Mỗi nâng cấp phải vẽ ra trên màn (`upgrades.js:1`).

#### 2.0.7 Sàn giờ (`MIN_LIMIT`, mọi loại) và tham số đếm (`SCALE_KEYS`)

Giới hạn giờ của thao tác = max(2,5 × par, sàn); mốc trừ 15 vì quá giờ (`overtimeAt`) = max(2 × par, sàn), chỉ ở loại có luật quá giờ. Hỗ trợ thao tác nhân giới hạn 1,5. Nấu thử và mẻ sáng không giới hạn giờ. Hiện chỉ 5 loại M5 có sàn; thao tác nhỏ par 1,5 giây chỉ còn 3,75 giây, nên **mọi loại** có sàn. **Mọi plugin** (kể cả 6 plugin cũ đang gọi `stepLimitSec(step.par)`: `cha.js:133`, `cham.js:98`, `thai.js:106`, `lua.js:141`, `rot.js:125`, `chon.js:53`) chuyển sang `gestureLimitSec(step, ctx)` để sàn có tác dụng thật; test hợp đồng kiểm giới hạn thực tế của từng plugin (mục 8.2).

| Loại | Khóa đếm | Sàn (giây, số lượng đã nhân số phần) | Trừ quá giờ | Ghi chú |
|---|---|---|---|---|
| `thai` ngắm | cuts | 0,8·cuts + 1,2 | không (như cũ) | |
| `thai` kéo dọc vạch, rạch | cuts | 0,9·cuts + 1 | không | |
| `thai` kéo theo nhịp, dao theo nhịp | cuts | 0,55·cuts + 1 | không | |
| `thai` hai lượt | cuts | 0,8·cuts + 1,8 | không | |
| `cha` | spots / strokes | 0,9·spots + 1 hoặc 0,35·strokes + 1 | có (như cũ) | |
| `cham` | n / N / Σtargets | 0,6·n + 1,2 / 0,3·N + 1 / 0,45·Σ + 1,5 | không | |
| `lua` (mọi lớp vỏ, kể cả `ngam`) | — | 1,2·period + 0,5 | không (kim chạy theo giờ thật) | |
| `rot` | — | 3 | không | |
| `dap` | n | **1,75·n + 1** (0.5.1: 1,5n + 1) | như cũ | Sửa có chủ ý: đủ giờ cho người làm chậm 30% kể cả nhiễu tốc độ +12% ở 2–3 phần |
| `bay` | n | **1,6·n + 1,5** (0.5.1: 1,3n + 1,5) | như cũ | Như trên (`them_da` 2–3 phần) |
| `xoay`, `got`, `lac` | turns / strips / strokes | giữ như 0.5.1 (1,4t + 1; 1,2s + 1; 0,4s + 1) | như cũ | |
| `bam` | hits | 0,3·hits + 1,5 | có | |
| `chat` | cuts | 1,6·cuts + 1 (lớp `dua`: 1,2·cuts + 1) | không | Khóa đếm thống nhất là `cuts` |
| `dap_dap` | n | **1,6·n + 1** (bản 1: 1,4n + 1) | không | |
| `gia` | hits | 0,7·hits + 1,5 | có | |
| `xe` | strands | **1,1·strands + 1 + 0,45·(⌈strands/3⌉ − 1)** | có | v3: cộng lượt trượt vào theo khung hẹp (3 sợi một lượt) |
| `bao` | strokes | 0,5·strokes + 1,2 | có | |
| `vat` | n | **n·(−τ·ln(1 − b) + 0,5) + 1**, b = mép trên vùng | không | Tính từ chính thước giữ `holdLevel` (mục 2.3.7) |
| `nhat` | n | 0,8·n + 1 | không | |

`MIN_LIMIT` thêm trường `alt` (khóa dự phòng: `cha` spots/strokes; `cham` n/N/targets), `mode` (`thai` theo `params.cut`), hàm sàn của `vat` đọc `params.tau`, `params.zone`, hàm sàn của `xe` cộng `BALANCE.roundSec` mỗi lượt. `SCALE_KEYS` thêm `hits`, `strands` (`n` đã có nên `vat`, `nhat`, `dap_dap` tự nhân; `chat` dùng `cuts`).

Kiểm bằng mô hình v3 (`mo-phong-v3b/kiem-gioi-han.mjs` → `ket-qua-gioi-han-v3.txt`, 1.659 ô): **mọi bước của 9 món × 1–3 phần × mọi ghi chú và cặp ghi chú** có `stepTimeSec × 1,3 ≤ giới hạn` (khóa #6: 0 ô đỏ), và cả kiểm chặt hơn `stepTimeSec × 1,12 × 1,3 ≤ giới hạn` cũng 0 ô đỏ, ở khung rộng lẫn khung 320 (`stepTimeSec` đã gồm lượt trượt vào). Nếu sàn của xé không cộng lượt thì xé 3 phần ở khung 320 đỏ (11,50 > 11,25 giây).

#### 2.0.8 Bảng `METHOD_SPECS` (`src/core/methods.js`, mới; thuần, test Node)

```js
// Một mục cho mỗi loại; lớp vỏ đổi cử chỉ hoặc số đo có mục riêng trong bySkin (thai có bySub theo params.cut).
// Lõi, phụ bếp M6, mẻ sáng, mô phỏng, khóa cân bằng đều đọc bảng này.
export const METHOD_SPECS = Object.freeze({
  bam: { key: 'hits', gesture: 'tap-alt', gauge: 'G3', overtime: true, prepable: true, staffable: true,
         score: (rec, step, mul) => scoreBam({ ...rec, ...step.params, par: step.par, mul }),
         sample: (step, skill, rand) => ({ value, cv, missedGather }),   // SỐ ĐO theo tay nghề, không phải điểm
         timeSec: step => 0.8 + 0.2 * h + 0.5 * Math.floor(h / 7) + 0.7 },
  lua: { key: null, gesture: 'tap-needle', gauge: 'G2', overtime: false,
         // [v3] sai số theo GIÂY: dt ~ N(0; 0,4125 × nz) giây (0,099 × 5 / 1,2), đổi ra giá trị bằng tốc độ kim 1,2 / period
         // (đúng luaValue): value = tâm vùng + dt × 1,2 / period. Không còn σ giá trị cố định (phản biện vòng 2 #1).
         sample: (step, skill, rand) => ({ value }),
         timeSec: step => step.params.period * center(step.params.zone) / 1.2 + 0.3,
         bySkin: { phi: { sample: /* như trên, σ × 1,2 */, carry: 'params.carry' }, rang: { /* như phi */ }, ngam: { gauge: 'G5' } } },
  vat: { key: 'n', gesture: 'hold-zone', gauge: 'G3', overtime: false, prepable: true, staffable: true,
         timeSec: step => 0.6 + n * (-tau * Math.log(1 - (a + b) / 2) + 0.45) },  // theo thước giữ holdLevel (mục 2.3.7)
  xe:  { key: 'strands', gesture: 'drag-axis', /* … */
         timeSec: (step, frame) => 0.7 + 0.7 * k + ROUND_SEC * (Math.ceil(k / (frame.narrow ? 3 : 4)) - 1) }, // lượt trượt vào
  bao: { key: 'strokes', gesture: 'drag-updown', /* … */ bySkin: { nao: { gesture: 'swipe-arc', measure: 'createScraper' } } },
  // … 19 loại; thai có bySub: { ngam, thanh, rach, keo, nhip, hai_luot }
})
export const ROUND_SEC = 0.45                       // [v3] giây mỗi lượt "miếng kế trượt vào" (BALANCE.roundSec)
export const skillNoise = s => 2.0 - 1.5 * s       // hệ số σ theo tay nghề (s 0,6 ≈ người chơi TB)
export const skillErr = s => 3.0 - 2.7 * s         // hệ số tỉ lệ lỗi rời rạc
export function sampleStep(step, skill, rand)       // → số đo đúng dạng hàm chấm nhận (đọc bySkin trước, rồi mục của loại)
export function measureScore(step, measure, { mul = 1 } = {})
export function staffStepScore(step, skill, rand, { cap = 88, mul = 1 } = {}) // → { score ≤ cap, time, staff: true }
export function staffBatch(itemId, size, skill, rand, data)                    // điểm từng thao tác của mẻ sáng do phụ bếp làm, trần 88
export function stepTimeSec(step, lead = 0.8, frame = { narrow: false })       // giây thao tác của người chơi TB, có lượt trượt vào
export function dishTimeModel(recipe, { tau = 0.6, gon = true, novice = false, covered, profile = 'tb', qty = 1, notes = [], narrow = false } = {})
                                                    // khóa #5: thẻ người mới 0,8 giây MỖI thao tác khi novice
export function gestureKey(step)                    // 'thai.thanh', 'cha.boc', 'lua.ngam', 'bao.nao'…: thẻ bước và tour theo cử chỉ (mục 7.7)
```

**Lớp vỏ có số đo hoặc luật riêng (`bySkin`; phản biện vòng 2 #13).** Mỗi dòng dưới đây có hàm đo, hàm `sample`, hợp đồng e2e và bộ giải riêng; `m54-methods` kiểm `sample` của **từng** dòng (1.000 mẫu ra điểm 0..100, đúng dạng hàm chấm nhận, điểm tăng theo tay nghề).

| Lớp vỏ | Số đo phụ bếp sinh (`sample`) | Luật phạt áp cho cả phụ bếp | Testid / bộ giải (mục 8.3) |
|---|---|---|---|
| `cha.boc` | `spots` (độ phủ từng điểm), `holes` ~ Bernoulli(0,04 × er) mỗi quả (bỏ khi `params.cracked`) | "Lủng rồi!" −15 mỗi lỗ | `cha-crack-i[data-cracked]` (mới), `cha-spot-i`, `cha-area` (có sẵn) |
| `lua.phi`, `lua.rang` | dt theo giây như `lua`, σ × 1,2; giá trị cuối = giá trị lúc nhấc + `carry` | Vượt 1,0 là cháy (0 điểm) sau dư nhiệt | `lua-needle[data-v, data-carry]`, `lua-zone[data-a, data-b]`, `lua-lift`; bộ giải chạm "Nhấc" khi `data-v` ≥ tâm vùng − `data-carry` |
| `lua.ngam` | dt theo giây như `lua` | Chưa đủ: "Chưa giòn"; quá: "Nhạt vị" (theo `zoneScore`) | `lua-ring[data-v, data-a, data-b]`, `lua-lift`; bộ giải chạm khi `data-v` vào vùng |
| `rot.phin` | mức rót ~ N(tâm; 0,054 × nz) | Rót quá vùng + 0,1 khi có `bloom`: "Ngập bột", tối đa 70 | `rot-level[data-v]`, `rot-zone`, `rot-pour` (có sẵn) + `rot-bloom[data-on]` (mới; bọt không chặn chạm) |
| `xoay` có `zone` | tỉ lệ đánh ~ N(tâm; 0,1 × nz) | `oneSided`: chỉ phạt khi đánh thiếu ("Chưa sánh") | `xoay-meter[data-v, data-a, data-b]` (mới, cạnh `xoay-bowl`, `xoay-progress` có sẵn); bộ giải nhấc tay khi `data-v` vào vùng |
| `chat.dua` (bổ dừa) | lệch vị trí ~ \|N(0; 10 × nz)\| px, lực ~ N(tâm; 0,10 × nz) mỗi nhát gõ | **Không có kẹt dao**; lực > b + 0,15: "Mạnh tay quá, văng nước" tối đa 50 | như `chat` |
| `bao.nao` (nạo dừa) | lượng cơm dừa ~ N(tâm; 0,09 × nz); số lần chạm viền nâu ~ Bernoulli(0,10 × er) | Chạm viền nâu: "Lẫn vỏ nâu" −20 mỗi lần | `nao-coconut[data-cx, data-cy, data-r, data-arc]`, `nao-stroke-i`, `nao-rim[data-w]`, `nao-meter[data-v, data-a, data-b]`, `nao-count` |
| `vat.nen`, `vat.vai` | lực ~ N(tâm; 0,09 × nz), τ riêng | như `vat` | như `vat` |
| `lac.hop`, `bay.o_banh`, `bay.muc`, `cha.bop`, `cha.xat`, `nhat.hat`, `nhat.la`, `dap_dap.giay/dao`, `gia.coi`, `chat.sa` | như loại gốc (chỉ đổi hình, chữ, âm) | như loại gốc | như loại gốc |

Phụ bếp sinh **số đo** chứ không sinh thẳng điểm: phụ bếp chịu đúng luật quá tay, đắng, đứt sợi, qua vạch đỏ, lủng, ngập bột, cháy sau dư nhiệt, quá giờ; chỉnh cân bằng một chỗ là áp cho cả người chơi lẫn phụ bếp. Hiệu chỉnh tay nghề theo bảng "Kỹ" của M6 (Kỹ 1–5 ↔ điểm thao tác trung bình 70 / 74 / 78 / 82 / 85, trần 88), mỗi loại lệch trung bình của Kỹ đó ≤ 8 điểm (khóa ở `m54-methods`). Lưu ý: bộ sinh của `cha`, `got`, `lac` hiện gần như không theo tay nghề; gói P1 phải chỉnh σ của ba bộ sinh này.

`GESTURE_BY_TYPE` (`step-card.js:16`) thêm: `bam: 'tap-alt'`, `chat: 'swipe-up-tap'`, `dap_dap: 'drag-tap'`, `gia: 'tap-beat'`, `xe: 'drag-axis'`, `bao: 'drag-updown'`, `vat: 'hold-zone'`, `nhat: 'tap-pick'`. Mới `GESTURE_BY_CUT` cho `thai`: `ngam: 'drag-cut'` (có), `thanh: 'drag-line'`, `rach: 'drag-line'`, `keo: 'tap-feed'`, `nhip: 'tap-feed'`, `hai_luot: 'drag-cut-2'`; và `GESTURE_BY_SKIN`: `bao.nao: 'swipe-arc'` (vuốt theo cung lòng gáo), `cha.boc: 'tap-peel'` (gõ nứt 1–2 điểm rồi vuốt lột từ vết nứt ra; khác `tap-swipe` của đập trứng ở chỗ vuốt tỏa ra từ điểm vừa gõ). **Mỗi giá trị của `GESTURE_BY_TYPE`, `GESTURE_BY_CUT`, `GESTURE_BY_SKIN` phải có tay mẫu** (luật `.g-step-card-demo[data-gesture="…"]` ở `css/fx.css`, mục 7.7; test ở `m5-components`).

### 2.1 Bảng tổng 19 loại

Cột "Sân khấu tối thiểu" là cỡ nhỏ nhất plugin phải chơi được. Vùng chơi đo được ở 320×568 là 288×285 (mục 7.2), nên **mọi loại ≤ 288px rộng**. Ở **375×553 (bậc xs)**, `.k-main` của sân khấu chỉ 320px (`vua-man/dac-ta.md` bảng 3.2); với đầu sân khấu gọn 32px và chân 44px ở xs (mục 7.2) vùng chơi còn khoảng 343×230, nên **mọi loại ≤ 190px cao ở xs** (cột cuối). Mỗi plugin đo `room()` như `cha.js` và co theo chiều cao còn lại.

| Loại | Tên hiển thị | Cử chỉ | Thước | Tham số đếm | Sân khấu tối thiểu (l / m / s) | Ở xs (375×553) | Dùng trong ca (Chặng 1) | Dùng ở mẻ sáng |
|---|---|---|---|---|---|---|---|---|
| `chon` | Chọn nguyên liệu | chạm kệ (có huy hiệu hộp) | — | — | (giữ) | (giữ: ≥ 1 hàng kệ, như 0.5.2) | 9 món | — |
| `cha` | Rửa / Bóc / Bóp muối / Xát vỏ | vuốt qua vết; **bóc 2 nhịp** (gõ nứt → vuốt lột) | — | spots / strokes | (giữ) | (giữ, đã qua `vua-man-bep`) | rửa dưa leo, bóc trứng cút, bóp muối cùi bưởi | bóc trứng cút, bóc hành tím, xát vỏ lụa đậu phộng, bóp muối cùi bưởi |
| `thai` | Thái / Cắt / Xẻ | theo cách: ngắm–nhấc; kéo dao dọc vạch; rạch dừng trước vạch đỏ; kéo theo nhịp; hai lượt xoay thớt; dao theo nhịp | G1 | cuts | 288×200 | 300×180 (rạch: 3 ổ chồng, mỗi ổ 52px) | dưa leo (cắt thanh), tắc (cắt đôi), ổ bánh (rạch), bánh tráng (kéo), cùi bưởi (hạt lựu) | dưa leo, **hành lá (kéo)**, tắc, bánh tráng, cùi bưởi, **hành tím (thái lát, dao theo nhịp)** |
| `cham` | Nêm / Rưới | chạm chai theo nấc / chạm đúng số | — | n, N, targets | (giữ) | (giữ) | nêm, sữa, đường, nước tương | — |
| `lua` | Canh lửa / Nướng / Phi / Rang / Luộc / **Ngâm** | bấm "Nhấc" khi kim vào vùng; **phi, rang có dư nhiệt**; **ngâm** dùng vòng hẹn giờ G5 | G2 dọc / G5 | — | (giữ) | (giữ); vòng G5 160×160 | chiên trứng, nướng bánh mì, nướng khô mực, chờ phin, luộc cùi bưởi | luộc trứng cút, **ngâm nước đá** (trứng cút, cùi bưởi), phi hành tỏi, phi sa tế, rang đậu phộng, nấu cốt dừa, luộc cùi bưởi |
| `rot` | Rót / Rưới / Chế phin | giữ rót, thả đúng vạch; **ủ bột có bọt nở** | G1 vạch | — | (giữ) | (giữ) | trà, mật ong, phin (ủ bột, châm đầy), dầu hành, cốt dừa, sữa muối | — |
| `dap` | Đập trứng | chạm theo kim rồi vuốt | G2 | n | (giữ) | (giữ, đã qua `vua-man-bep`) | 2 món bánh mì | — |
| `xoay` | Khuấy / Trộn / Đánh | vẽ vòng; **đánh tới vùng "Sánh mịn", nhấc tay để xong** | G3 khi có zone | turns | (giữ) | (giữ); thước bên phải 40px | trộn, khuấy, đánh sữa muối | sữa muối |
| `got` | Gọt vỏ | vuốt dọc dải | G1 dải | strips | (giữ) | (giữ) | xoài, vỏ bưởi | xoài, vỏ bưởi |
| `lac` | Lắc | kéo lên xuống | — | strokes | (giữ) | (giữ) | lắc bình, lắc rổ áo bột | lắc rổ, **lắc hộp trứng cút cho nứt vỏ** |
| `bay` | Bày / Thả đá / Kẹp / Múc | kéo thả vào đích (bóng mờ chỗ đặt); **đủ n thì tự xong** | hồng tâm | n | (giữ) | (giữ) | thả đá, **kẹp trứng, dưa leo vào ổ**, **múc chè** | — |
| **`bam`** | Băm | chạm xen kẽ hai nửa thớt, vuốt vun, dừng ở vùng | G3 | hits | 260×200 | 280×180 | — (Q4/Q5: chỉ mẻ sáng) | băm nhỏ tỏi (hành tỏi phi), băm nhuyễn sả, ớt (sa tế) |
| **`chat`** | Chặt / **Bổ dừa** | vuốt lên nâng dao, chạm trúng vạch khi kim vào vùng; lớp `dua`: gõ sống dao 3 nhát quanh giữa trái | G1 + G2 | cuts | 288×240; khung hẹp hơn 300px thì đặt trái dừa **dọc** | 300×180, trái dừa nằm ngang, kim lực đặt trên | — (Q4/Q5) | chặt khúc sả (sa tế, HB), bổ dừa khô (nước cốt dừa) |
| **`dap_dap`** | Đập dập | kéo bản dao (hoặc gói giấy) đè lên, chạm khi kim vào vùng | G2 | n | 240×200 | 240×170 | khô mực gói giấy (Tây Ninh) | đập dập tỏi (hành tỏi phi) |
| **`gia`** | Giã | chạm theo vòng phách, né phách vun; dừng khi cối vào vùng "Dập" | G4 + G3 | hits | 220×260 | **cối nhỏ 180×180**, vòng phách đè lên miệng cối, thước bên phải | — (Q4/Q5) | đậu phộng rang |
| **`xe`** | Xé | giữ núm mép, kéo theo mũi tên thớ, nhẹ tay | G1 mũi tên | strands | 260×220 | 280×180 (miếng đặt chéo, "đủ dài" ≥ 140px, 3 núm một lượt) | khô bò (dọc thớ), khô mực (ngang thân) | khô bò |
| **`bao`** | Bào / **Nạo** | kéo quả lên xuống qua lưỡi, tay không qua vạch đỏ, dừng khi "Lượng sợi" vào vùng "Đủ"; lớp `nao`: vuốt theo cung từ mép gáo dừa vào giữa | G3 + vạch | strokes | 140×280 dọc / 288×200 nghiêng | **luôn nghiêng** 300×180; nạo: gáo dừa 180×150 | xoài | xoài; nạo cơm dừa (lớp `nao`) |
| **`vat`** | Vắt / Nén | nhấn giữ để bóp, thả đúng vùng | G3 | n | 220×240 | 200×180 (quả 96 + thước 40) | tắc (vừa tay), cùi bưởi (thật ráo), nén nắp phin | cùi bưởi, nước cốt dừa |
| **`nhat`** | Khều hạt / Ngắt lá | chạm đúng thứ cần lấy, né mồi | — | n | 260×200 | 280×170 (lưới 4 × 3, ô 48, tâm cách ≥ 48px) | hạt tắc, lá rau răm | hạt tắc |

Số loại 11 → 19. Ba test đang đếm đúng 11 loại phải sửa có chủ ý (`data.test.mjs:14`, `minigame-ui-contract.test.mjs:17, 29-35`, `m5-components.test.mjs:62, 321`).

### 2.2 Nâng cấp 11 loại cũ

| Loại | Đổi | Chi tiết |
|---|---|---|
| `thai` | **Lớn** (mục 2.2.1) | `params.cut`: `ngam` (mặc định, như hiện nay), `thanh`, `rach`, `keo`, `nhip`, `hai_luot`. Cách người chơi chọn ở bảng quyết định cử chỉ qua `METHOD_PLAY`; chọn sai vẫn chơi đúng cử chỉ của cách đã chọn rồi −15 như cũ (`kitchen.js:410-412`). Board dựng trước 0.5.4 không áp `METHOD_PLAY` (mục 2.2.1) |
| `cha` | Lớp vỏ | `boc` hai nhịp: chạm 1–2 điểm sáng để **gõ nứt** (âm `crack` nhỏ, vết nứt lan), rồi **vuốt từ vết nứt ra** để lột; vuốt cắt ngang lòng trắng > 1.600 px/s là "Lủng rồi!" (−15). Ở mẻ sáng sau "lắc hộp" thì bỏ nhịp gõ (`params.cracked`). `bop` (bóp muối: cùi bưởi), `xat` (xát vỏ lụa, mẻ sáng). Hợp đồng thêm `cha-crack-i[data-cracked]` (mục 2.0.8). `spots` giữ nguyên, ghi chú "Thêm trứng cút" vẫn vá `spots` |
| `cham` | Giữ | Chỉ thêm sàn giờ; kiểu `min` không còn bước nào dùng nhưng giữ mã và test (save cũ còn kết quả, board cũ còn chạy) |
| `lua` | Lớp vỏ | `lo` (nướng bánh mì: "Lấy ra", quá: "Khét"), `nuong` (khô mực: "Gắp ra", quá: "Cháy"), `phi` (`params.carry` 0,08–0,10: tắt bếp xong kim chạy thêm Δ trong 0,4 giây, chấm trên **giá trị cuối**, vệt mờ "dư nhiệt" trước kim, ẩn từ thạo cấp 2; `lua-needle[data-carry]`; nút "Nhấc" chốt ở `pointerdown` nên bộ giải chạm sớm hơn đúng Δ), `rang` (`carry` 0,05, "Nhấc chảo"), `luoc` ("Vớt ra"), `noi` (có), **`ngam`** (mới, chỉ ở mẻ sáng: thau nước đá; **vòng hẹn giờ G5** quanh thau thay cho kim dọc, cùng `luaValue` và `scoreLua`; mốc "Vớt ra" là vùng xanh; ngâm chưa đủ thì "Chưa giòn", quá lâu thì "Nhạt vị"; nước đá có hạt đá nổi; thời gian thật được nén: 4 giây chơi = 3–5 phút ngâm, có chữ "≈ 5 phút"; hợp đồng `lua-ring[data-v, data-a, data-b]` + `lua-lift`). Mọi lớp vỏ của `lua` sinh sai số theo giây (mục 2.0.8) |
| `rot` | Lớp vỏ | `phin` (vẽ phin thay ly): ủ bột vùng thấp [0,13; 0,32] (v4 nới 0,01 mỗi bên, mục 5.5) có **bọt nở** 0,8 giây không chặn chạm; rót quá vùng + 0,1 là "Ngập bột" (tối đa 70); hợp đồng thêm `rot-bloom[data-on]` |
| `dap` | Giữ | Chỉ nâng sàn giờ (mục 2.0.7) |
| `xoay` | Chế độ vùng | Có `params.zone`: thước G3 "Độ sánh" ở mép phải, v = vòng / K; **không tự xong ở K**, nhấc tay 500 ms là xong. Cà phê muối dùng `oneSided`: chỉ chấm khi **đánh thiếu** (v < a, "Chưa sánh"); đánh quá không bị phạt vì sữa đặc không tách béo (người dùng chốt Q7 giữ sữa muối, nên không có luật "Tách béo"); hợp đồng thêm `xoay-meter[data-v, data-a, data-b]` |
| `got` | Giữ | Bỏ chế độ trừ quá giờ cho mẻ sáng (`untimed`) |
| `lac` | Lớp vỏ | `hop`: lắc hộp trứng cút cho nứt vỏ (mẻ sáng), tiếng lách cách, vỏ nứt dần 3 mức |
| `bay` | Lớp vỏ + tự xong | `params.auto` cho **mọi** bước bày (kể cả `them_da` cũ): đủ n thì xong, không còn nút Xong (bớt 0,8 giây mỗi ly cà phê). `o_banh`: kéo trứng vào khe ổ bánh đã rạch, **bóng mờ chỗ đặt**; dưa leo thanh tự xếp vào khe 300 ms khi vào thao tác, hành lá (nếu có hộp Rau bánh mì) rắc theo, **trừ khi dòng có ghi chú `khong_hanh`** (phản biện vòng 2 #22c). `muc`: kéo vá từ nồi chè sang ly; miệng ly là đích rộng (`params.light`, vùng chấm × 1,7) |
| `chon` | Huy hiệu hộp | Ô kệ của nguyên liệu có hộp mang huy hiệu "Hộp · 5" ở góc (13px); chọn như thường, bẫy vẫn giữ (mục 4.5) |

#### 2.2.1 Thái: cách thái quyết định cử chỉ

| `params.cut` | Dùng ở | Cử chỉ | Đo → chấm | Cảm giác |
|---|---|---|---|---|
| `ngam` (có) | cắt đôi tắc (**3 quả** mỗi ly, cuts 3; `kieu: 'ngang'`, quả bày hàng `CUT_POSE.tac.row`), cách sai `thai_lat`; board dựng trước 0.5.4 (mọi cách) | Kéo dao tới vạch, nhấc tay để cắt (`thai.js:307-345`) | độ lệch x (px) từng nhát → `thaiCutScore` (≤ 6 / 14 / 24 px × mul → 100 / 80 / 55, còn lại 20) | Tắc: hai nửa tách 10px và **lộ hạt** để nối sang Khều hạt |
| `thanh` | dưa leo bánh mì (cách đúng `cat_thanh`) | Quả nằm ngang; chạm núm đầu vạch (vòng 48px ở mép trái quả), **kéo dao dọc theo vạch** tới cuối, nhấc tay; dao đi theo ngón, thanh dưa lìa ra | `lineDeviation` → RMS lệch (px) và độ phủ; phủ < 85% chiều dài thì nhát đó 20 ("Chưa đứt"); còn lại `thaiCutScore(rms / 1,25)` (đường dài, sai số trung bình hóa nên nới 1,25; bản 1 nới 1,5 làm Tuyệt hảo bánh mì của người Giỏi tăng thêm khoảng 5,5 điểm, mục 5.5) | Thanh dưa rơi xếp nghiêng, đều thì "Đều tay!" |
| `rach` | xẻ dọc ổ bánh mì | Giữ đầu ổ, kéo dao một đường theo vạch chấm, **dừng trước vạch đỏ cuối** để ổ không đứt đôi | như `thanh`; qua vạch đỏ thì "Đứt đôi!", tối đa 40 (tag `dut_doi`) | Ổ bánh hé miệng, lộ ruột trắng |
| `keo` | bánh tráng cắt sợi; mẻ sáng Rau bánh mì: hành lá cắt khúc (`cat_hanh`, không còn trong ca) | Xấp bánh / cọng hành **tự trôi** phải → trái; mỗi vạch chấm đi qua lưỡi kéo là một phách (450 ms; thạo cấp 2 / 3: 430 / 410 ms); chạm (hoặc vuốt xuống ngắn) **bất kỳ đâu**: kéo khép 80 ms, âm `snip`, sợi rơi | **Chấm theo khoảng giữa hai nhát liền** (= bề dày sợi): nhát i ≥ 2 lấy `timingScore(\|Δtᵢ − k·nhịp\|, mul)` (≤ 60 / 110 / 175 ms × mul → 100 / 80 / 55, còn lại 20; bản 1 dùng 90 / 150 / 220, góp phần làm bánh tráng trộn lệch +8,6 điểm Tuyệt hảo; k = số vạch giữa hai nhát); nhát đầu là mẩu đầu, chỉ tính có/không (100). Vạch trôi qua mà không chạm: nhát đó **20** (sợi dày gấp đôi) chứ không 0. Chạm khi không có vạch trong ±nhịp/2: nhát thừa −10 | Trễ chạm cố định của Safari iOS (30–80 ms) **tự triệt tiêu** vì chỉ đo khoảng giữa hai nhát; sợi xếp quạt bên trái cho thấy ngay sợi dày mỏng |
| `nhip` | mẻ sáng: hành tím thái lát mỏng (dao) | như `keo` nhưng là dao thái, âm `chop` | như `keo` | — |
| `hai_luot` | cùi bưởi hạt lựu (`hat_luu`, `rotate`); cách sai `thai_soi` (`stack`) | ⌈cuts/2⌉ vạch ngắm–nhấc → lát tự xếp chồng (300 ms) hoặc thớt xoay 90° (250 ms, tiếng "kẹt" gỗ) → ⌊cuts/2⌋ vạch | như `ngam` trên mọi nhát; cả hai lượt đều (cv ≤ 0,15) thì hiệu ứng "Vuông vức!" (không cộng điểm) | Hạt lựu tách lách tách (lệch nhau 20 ms), đều thì xếp ô bàn cờ |

`METHOD_PLAY` (dữ liệu, `recipes.js`, cạnh `METHOD_LABELS`) quyết định plugin và tham số khi người chơi chọn một cách:

| Cách | Plugin, tham số | Ghi chú |
|---|---|---|
| `cat_thanh` (mới, "Cắt thanh") | `thai` `{ cut: 'thanh' }` | đúng cho dưa leo |
| `thai_lat` | `thai` `{ cut: 'ngam' }` | sai cho dưa leo, cùi bưởi, xoài |
| `thai_soi` | `thai` `{ cut: 'hai_luot', stack: true }` | sai cho dưa leo, cùi bưởi, xoài |
| `hat_luu` | `thai` `{ cut: 'hai_luot', rotate: true }` | đúng cho cùi bưởi |
| `cat_soi` | `thai` `{ cut: 'keo' }` | đúng cho bánh tráng |
| `cat_vuong` | `thai` `{ cut: 'keo', pass: 2 }` | sai cho bánh tráng |
| `de_nguyen` | nút "Để vậy" 56px, điểm 100 rồi lõi trừ 15 | sai cho bánh tráng |
| `bao_soi` (mới, "Bào sợi") | `bao` | đúng cho xoài |
| `bao` (cũ, chỉ còn trong save) | `thai` `{ cut: 'ngam' }` | dự phòng cho kết quả bước cũ có `method: 'bao'` (cách cũ của `thai_dua`) |

**`METHOD_PLAY` chỉ áp cho board dựng ở 0.5.4** (`cook.boardRev === RECIPES_REV`); board cũ còn dở lúc cập nhật vẫn chơi kiểu ngắm–nhấc, cách chọn chỉ đổi hình lúc xong như 0.5.1 (mục 6.5, phản biện vòng 1 #23). Cách sai dùng tham số đếm mặc định của cách đó khi bước khác loại (vd xoài chọn `thai_soi` thì chơi `thai` cuts 4). `METHOD_LABELS` thêm `cat_thanh: 'Cắt thanh'`, `bao_soi: 'Bào sợi'`; giữ `bao: 'Bào'` vì kết quả bước trong save cũ có thể ghi `method: 'bao'`.

**"Thái lát", "thái sợi" đúng ở đâu (phản biện vòng 2 #12).** Người dùng chốt Q2 đổi cách đúng của dưa leo sang cắt thanh, xoài sang bào sợi; cùi bưởi là hạt lựu. Nên trong ca "Thái lát" và "Thái sợi" chỉ còn là cách sai (trừ 15 như cũ, nhãn "Cách mới" ở 3 lần đầu). "Thái lát" là **cách đúng** ở mẻ Hành tỏi phi (hành tím thái lát mỏng bằng dao theo nhịp, `thai` `nhip`); "thái sợi" đúng chỉ có ở Chặng 2. **Test** (`m54-kitchen`): `submitChon` ghi `cook.boardRev = RECIPES_REV`; chọn `cat_thanh` cho `thai_dua` ra `params.cut = 'thanh'`, chọn `thai_lat` ra `'ngam'`, chọn `thai_soi` ra `'hai_luot'` + `stack` — bộ giải e2e đọc `data-cut` từ sân khấu nên e2e không bắt được nếu `METHOD_PLAY` không chạy (phản biện vòng 2 #18).

**Hợp đồng e2e thái** (giữ `thai-board`, `thai-guide-i[data-x]`, `thai-count`, `thai-done`): thêm `thai-board[data-cut]`, `thai-feed[data-next]` (ms tới lúc vạch kế qua lưỡi), `thai-line-i[data-x0, data-y0, data-x1, data-y1, data-end]` (thanh, rạch; rạch 2–3 phần: mỗi ổ một vạch, các ổ nằm chồng trên một màn), `thai-pass[data-v]` (hai lượt).
**Bộ giải:** ngắm như cũ; `keo`/`nhip`: chờ `data-next` ≤ 30 ms rồi chạm; `thanh`: kéo từ (x0, y0) tới (x1, y1) 12 bước × 16 ms; `rach`: kéo tới cách `data-end` 10px; `hai_luot`: chờ `data-v` đổi.
**Âm:** `chop` (có, ngắm và dao theo nhịp), `snip` (mới, kéo). **Phụ bếp:** ngắm, hai lượt: lệch ~ |N(0; 10,6 × nz)| px; thanh, rạch: RMS ~ |N(0; 10,6 × nz)| px, qua vạch đỏ ~ Bernoulli(0,05 × er); keo, nhịp: Δ ~ N(0; 120 × nz) ms, hụt ~ Bernoulli(0,02 × er). (nz = `skillNoise(s)`, er = `skillErr(s)`.)

### 2.3 Tám loại mới

Mỗi loại một bảng cùng khuôn. Công thức chấm chạy được ở `mo-phong-v3b/mo-hinh.mjs` (mô hình của người phản biện vòng 2 viết theo chữ của bản thiết kế, chỗ sửa đánh dấu `[v3]`, **mọi loại theo đúng công thức chữ của mục này**; không còn dùng `mo-phong-C/scorers-C.mjs`, phản biện vòng 1 #9); hàm đo thuần đã dựng thử ở `thu-B/do-moi.js` (băm, xé, bào).

#### 2.3.1 `bam` — Băm (đã dựng thử: `thu-B/bam.html`)

| Mục | Nội dung |
|---|---|
| Dùng ở | Mẻ sáng "Sa tế nhà làm": băm nhuyễn sả, ớt (`bam_sa_te`, hits 10, vùng "Nhuyễn" [0,80; 1,00]); "Hành tỏi phi nhà làm": băm nhỏ tỏi đã đập dập (`bam_toi`, hits 8, vùng "Nhỏ" [0,45; 0,65]). Chặng 2: sả, tỏi ướp thịt; tỏi ớt nước mắm |
| Cử chỉ | **Chạm xen kẽ hai nửa thớt** như cầm hai dao phay; mỗi nửa là một vùng chạm (ở 320×568 vẫn 116×227px; thớt hẹp hơn 240px thì một vùng). Dao bổ xuống **ngay ở `pointerdown`**; nhát được tính khi nhấc tay mà không phải cú vun (hoặc giữ > 150 ms mà ngón dịch ≤ 16px). Bỏ nhát cách nhát trước < 70 ms (chống đập loạn). Cứ 6 nhát thì đống vụn **loang ra**, hiện nút "⇢ Vun! ⇠": **vuốt ngang từ mép vào giữa** ≥ 40px, lệch ≤ 35° (`classifySwipe` trục x) trong 1,5 giây; băm ≥ 3 nhát lúc loang mà chưa vun thì ghi một lần bỏ lỡ vun, các nhát lúc loang chỉ ăn 40%. **Kết thúc:** ngừng tay 0,8 giây khi độ nhuyễn ≥ a − 0,05, hoặc bấm Xong, hoặc hết giờ |
| Đo (thuần) | `createMince({ hits, zone, spreadEvery: 6, spreadEff: 0.4 })` → `{ hit(side, t), gather(t), value, cv, missedGather }`. Độ nhuyễn 0..1,2 (mỗi nhát cộng tâm vùng / K). **cv tính trên khoảng giữa hai nhát liền, bỏ quãng nghỉ để vun** (lần dựng đầu chưa bỏ nên cv 0,66 bị trừ oan; sửa xong cv 0,04) |
| params | `{ hits: K, zone: [a, b] }`; "Nhỏ" [0,45; 0,65], "Nhuyễn" [0,80; 1,00]; `hits` nhân theo số phần. Thạo cấp 2 / 3: loang mỗi 7 / 8 nhát, vùng × mul |
| Chấm | `scoreBam` = `zoneScore(value, zone, m)` (value > b + 0,15 là "Nhão": tối đa 40, tag `nhuyen_qua`) − (cv > 0,5·m ? 10 : 0) − min(16, 8·missedGather) − (quá `overtimeAt` ? 15 : 0); value ≤ 0 → 0 |
| Sàn giờ | 0,3·hits + 1,5 |
| Hình | Đạo cụ `dao_phay_lon` (viewBox 120, điểm neo `edge`, `grip`), `thot_lon` (có). **Đống băm 3 mức dùng chung** `dong_bam_1..3` tô màu bằng biến CSS `--bam` (tỏi #f3e6c4, ớt #e0452f, sả #d9e27a), loang 1,7× khi cần vun, sẫm lại khi nhão. Biểu tượng `dao_phay` |
| VFX, âm | `crumb` 2–3 hạt màu nguyên liệu mỗi nhát; đống nảy (1,06; 0,92) 120 ms; rung khung 1px mỗi 4 nhát; "Nhịp đều!" (≥ 4 nhát xen kẽ), "Hai dao đều tay!" (≥ 8). Nhão: "Nhuyễn quá!". **Âm mới `mince`** (noise dải 2,2 kHz 25 ms + click gỗ 180 Hz), cao dần theo combo; vun: `whoosh` (có) |
| Giảm chuyển động | Dao không vung, không hạt, không rung; đống vẫn đổi mức, thước vẫn chạy |
| Tour `bep_bam` | ① "Gõ hai bên thớt": "Chạm xen kẽ bên trái, bên phải như cầm hai dao. Vụn loang ra thì vuốt từ mép vào giữa để vun lại." ② "Dừng đúng vạch": "Thước bên phải dâng theo độ nhuyễn. Tới vùng có tên thì ngừng tay, băm quá là nhão." |
| e2e | `bam-half-l`, `bam-half-r`, `bam-meter[data-v, data-a, data-b]`, `bam-gather` (chỉ hiện khi cần vun), `bam-count`, `bam-done`. **Bộ giải** (đã chạy ở `thu-B/chup.mjs`): chạm xen kẽ cách 160 ms; thấy `bam-gather` thì vuốt từ mép trái (x + 12) vào giữa; ngừng khi `data-v` ≥ (a + b)/2 − 0,02; chờ 900 ms |
| Phụ bếp M6 | value ~ N(tâm; 0,11 × nz); cv ~ \|N(0,3; 0,12 × nz)\|; bỏ lỡ vun ~ Bernoulli(0,15 × er) mỗi lần loang. `timeSec` = 0,8 + 0,2·hits + 0,5·⌊hits/7⌋ + 0,7 |

#### 2.3.2 `chat` — Chặt; lớp vỏ `dua` — Bổ dừa

| Mục | Nội dung |
|---|---|
| Dùng ở | Mẻ sáng "Sa tế nhà làm": chặt khúc sả (lớp `sa`, 2 nhát, **(HB)**: nhiều nơi cắt khúc bằng dao thái). Mẻ sáng "Nước cốt dừa nhà vắt": **bổ dừa** (lớp `dua`, 3 nhát gõ). Chặng 2: gà, sườn (lớp `xuong`). Trong ca Chặng 1 **không** có chặt (người dùng chốt Q4/Q5) |
| Cử chỉ | **Lớp `sa` (chặt):** mỗi nhát hai nhịp: ① **vuốt lên** ≥ 60px trên dao (`classifySwipe` trục y, chiều −1, lệch ≤ 35°): dao giơ cao, kim lực G2 bắt đầu chạy (chu kỳ 1,0 giây); ② **chạm**: hoành độ ngón là chỗ bổ (so với vạch khớp G1, `nearestUncut`), thời điểm chạm là lực. Chạm khi chưa giơ dao: "Giơ dao lên!", không tính. Lực < a − 0,1: **kẹt dao**, phải bổ thêm một nhát. **Lớp `dua` (bổ dừa, phản biện vòng 2 #22):** người bán không chặt một nhát mà **gõ sống dao phay** nhiều nhát quanh đường giữa trái dừa khô cho nứt đều rồi tách đôi. Trái dừa nằm ngang, đường giữa vẽ 3 vạch gõ; mỗi nhát: vuốt lên ngắn (≥ 40px) rồi chạm đúng vạch khi kim vào vùng; trái xoay 120° sau mỗi nhát (200 ms), nhát thứ 3 thì trái nứt đôi, nước dừa chảy ra chén. **Không có kẹt dao** (sống dao không kẹt) |
| params | `{ cuts: n, zone: [a, b] }`; sả [0,45; 0,85] (2 nhát), dừa [0,50; 0,85] (3 nhát). Thạo: vùng × mul, kim chậm 5% mỗi cấp |
| Chấm | `scoreChat` = trung bình mỗi vạch min(`thaiCutScore(dev, m)`, `zoneScore(lực, zone, m)`). Lớp `sa`: đã từng kẹt tối đa 60; lực > b + 0,15 (văng vụn, "Mạnh tay quá!") tối đa 50. Lớp `dua`: lực < a: "Gõ mạnh thêm" (theo `zoneScore`, không có nhát thêm); lực > b + 0,15: "Mạnh tay quá, văng nước" tối đa 50. Thiếu nhát 0. Không trừ quá giờ |
| Sàn giờ | Lớp `sa`: 1,6·cuts + 1; lớp `dua`: 1,2·cuts + 1 |
| Thời gian (`timeSec`) | `sa`: 0,7 + 1,4·cuts; `dua`: 0,7 + 1,1·cuts (vuốt lên ngắn) |
| Hình | `dao_phay_lon` (chung), `dua_kho_lon` (trái dừa khô có 3 vạch gõ, vẽ bằng CSS để dành ngân sách hình, mục 7.4) → `dua_kho.bo_doi` (hai nửa gáo, lộ cơm trắng); `sa` → `sa.khuc` (vẽ trong plugin bằng `sa` cắt đoạn) |
| VFX, âm | Dừng hình 90 ms, rung khung 3px 120 ms, thớt nảy; hạt mới `husk` (xơ dừa, vụn sả); vết nứt lan dần quanh trái dừa theo từng nhát; "Kẹt dao!" (chỉ lớp `sa`), "Mạnh tay quá!". **Âm mới `whack`** (sine 90 Hz 80 ms + noise 1 kHz 40 ms), dùng chung với đập dập; nhát dừa thứ 3: `crack` (có) |
| Giảm chuyển động | Giữ dừng hình; không rung (chớp viền tĩnh); dao đổi tư thế, không trượt; trái dừa đổi thẳng sang vết nứt mới |
| Tour `bep_chat` | ① "Vuốt lên nâng dao": "Vuốt lên trên con dao để giơ dao lên, kim lực bắt đầu chạy." ② "Chạm trúng vạch": "Chạm ngay vạch chấm khi kim vào vùng xanh. Nhẹ quá dao kẹt, mạnh quá văng vụn." Lớp `dua` dùng câu ② "Gõ sống dao lên từng vạch quanh giữa trái khi kim vào vùng xanh, ba nhát là nứt đôi." |
| e2e | `chat-knife`, `chat-line-i[data-x]`, `chat-needle[data-v]`, `chat-meter[data-a, data-b]`, `chat-raised[data-on]`, `chat-count`; lớp `dua` thêm `chat-fruit[data-turn]`. **Bộ giải:** vuốt lên 80px (lớp `dua`: 50px) trên `chat-knife`; `waitNeedleNear` (có) tâm vùng; chạm tại `data-x` của vạch kế |
| Phụ bếp M6 | dev ~ \|N(0; 10 × nz)\| px; lực ~ N(tâm; 0,10 × nz); lớp `sa`: kẹt khi lực < a − 0,1 (thêm 1,3 giây); lớp `dua`: không kẹt |

#### 2.3.3 `dap_dap` — Đập dập

| Mục | Nội dung |
|---|---|
| Dùng ở | Tây Ninh `dap_kho_muc` (lớp `giay`: khô mực vừa nướng gói vào giấy, đập cho mềm, `am-thuc.md` [19]); mẻ sáng "Hành tỏi phi nhà làm" (lớp `dao`, `dap_toi`: đập dập tỏi bằng bản dao phay cho tróc vỏ, dễ băm) |
| Cử chỉ | ① Lớp `dao`: **kéo bản dao** (núm 48px) đè lên miếng, tự bắt dính khi cách ≤ 24px; lớp `giay`: chày gỗ nằm sẵn trên gói giấy, bỏ bước kéo. ② **Chạm vào bản dao / chày** (vùng ≥ 160×64px) khi kim G2 (chu kỳ 1,1 giây) trong vùng xanh. Mỗi miếng (đoạn) một nhát, dao tự dời tới đoạn kế. Yếu (< a − 0,08): miếng chỉ nứt, "Đập thêm!", được thêm một nhát (−10, tối đa n + 2 nhát) |
| params | `{ n, zone: [a, b] }`; giấy [0,35; 0,85] (bản 1 [0,40; 0,80], nới khi hiệu chỉnh Tây Ninh, mục 5.5), dao [0,45; 0,75]. Thạo cấp 2 / 3: chu kỳ kim 1,05 / 1,0 giây |
| Chấm | `scoreDapDap` = trung bình n miếng của `zoneScore(lực nhát cuối, zone, m)` − 10·(số nhát thêm của miếng đó); lực > b + 0,15 (văng) miếng đó tối đa 60; miếng chưa đập 0. Không trừ quá giờ |
| Sàn giờ | 1,6·n + 1 (bản 1: 1,4n + 1; mục 2.0.7) |
| Hình | Đạo cụ `giay_goi` (gói giấy dầu, chày gỗ), `dao_phay_lon`; trạng thái `kho_muc.nuong` → `kho_muc.dap` (mực dẹt, xơ thớ); mẻ sáng `toi` → `toi.dap` |
| VFX, âm | Miếng bẹp hẳn (`vfx.squash` 1,25 × 0,7 rồi giữ dẹt); 2 chấm lấp lánh "dậy mùi"; mảng vỏ / giấy xoay rơi (`husk`); quá mạnh: mảnh văng, rung 2px, "Mạnh tay quá!". Âm `whack` |
| Giảm chuyển động | Đổi thẳng sang hình dập, không văng, không squash |
| Tour `bep_dap_dap` | ① "Đè dao lên": "Kéo bản dao đè lên miếng, tới gần là dao tự bám vào." ② "Chạm khi vào vùng xanh": "Chạm bản dao khi kim vào vùng xanh. Nhẹ quá phải đập thêm, mạnh quá là văng." (lớp `giay` dùng câu "Chạm chày khi kim vào vùng xanh để khô mực mềm ra.") |
| e2e | `dapdap-blade`, `dapdap-item-i[data-state]`, `dapdap-needle[data-v]`, `dapdap-meter[data-a, data-b]`, `dapdap-count`. **Bộ giải:** (lớp `dao`) kéo blade tới item-i; `waitNeedleNear`; chạm blade |
| Phụ bếp M6 | lực ~ N(tâm; 0,10 × nz); lực < a − 0,08 thì thêm một nhát. `timeSec` = 0,7 + 1,05·n |

#### 2.3.4 `gia` — Giã (chấm theo kết quả trong cối)

| Mục | Nội dung |
|---|---|
| Dùng ở | Mẻ sáng "Đậu phộng rang giã" (lớp `coi`, vùng "Dập": người bán giã dập, không nhuyễn). Chặng 2: tỏi ớt (vùng "Nhuyễn") |
| Cử chỉ | **Chạm vùng cối** (≥ 220×260px; ở xs cối nhỏ 180×180, vòng phách đè lên miệng cối) theo vòng phách G4: vòng co từ 2,2× về vòng đích quanh miệng cối trong một phách (120 phách/phút); mỗi chạm là một nhát chày. Cứ 3–4 phách có một **phách vun** (vòng cam, hình muỗng gạt trong cối): **không chạm**; chạm là "giã trúng muỗng" ("Cạch!", rung 2px). Mỗi nhát cộng vào **thước "Độ dập"** G3: trúng phách (\|dt\| ≤ 100 ms × mul) cộng 1,0 phần; gần (≤ 240 ms × mul) 0,7; lệch 0,4. **Nhịp chỉ làm cối đầy nhanh hơn và tạo combo; điểm do độ dập lúc dừng.** Xong khi ngừng chạm 0,7 giây lúc độ dập ≥ 0,6·a, hoặc tự dừng khi vượt `maxRatio` × tâm ("Ra dầu rồi!") |
| Đo (thuần) | **Mới** `createBeatTrack({ bpm, vunEvery: [3, 4], seed })` → `{ next(t), judge(t) → { i, dt, kind: 'gia' \| 'vun' } }` (lịch tất định theo `uiRand`); **mới** `createFillMeter({ K, gains: { on: 1, near: 0.7, off: 0.4 } })` → `{ hit(kind), value }` |
| params | `{ hits: K, zone: [a, b], maxRatio: 1,4, bpm: 120 }`; đậu phộng K 6, "Dập" [0,55; 0,80]. Thạo: nhịp + 5% mỗi cấp (trần 10%); Hỗ trợ thao tác: nhịp − 15% |
| Chấm | `scoreGia` = `zoneScore(value, zone, m)` (value > maxRatio × tâm: tối đa 40, tag `nhuyen_qua`) − 15·(số lần trúng muỗng) − (quá giờ ? 15 : 0). Trễ chạm của trình duyệt chỉ làm cần thêm 1–2 nhát, **không trừ điểm** |
| Sàn giờ | 0,7·hits + 1,5 |
| Hình | Đạo cụ `coi_chay_lon` (cối đá, chày gỗ, điểm neo `mouth`); trong cối 4 mức vẽ thủ tục (hạt nguyên → vỡ đôi → dập → mịn ra dầu); trạng thái `dau_phong.gia`. Biểu tượng `coi_chay` |
| VFX, âm | Chày giã xuống 80 ms, cối nảy 2px, 2–4 hạt `husk` (vỏ lụa); phách trúng: vòng vỡ thành 4 lấp lánh; 4 phách trúng liền: "Chày chắc tay!". **Âm mới `thump`** (sine 110 → 70 Hz 90 ms + noise 300 Hz); trúng muỗng: `tick` (có) |
| Giảm chuyển động | Vòng phách đổi thành vạch chạy trên thanh ngang (cùng thời điểm); không hạt, không rung |
| Tour `bep_gia` | ① "Chạm theo vòng": "Vòng co dần về miệng cối, chạm lúc vòng khít miệng là chày giã mạnh nhất." ② "Né vòng cam, dừng đúng lúc": "Vòng cam có cái muỗng là lúc vun đậu, đừng chạm. Thước tới vùng Dập thì ngừng tay." |
| e2e | `gia-mortar`, `gia-ring[data-next, data-kind="gia"\|"vun"]`, `gia-meter[data-v, data-a, data-b, data-max]`, `gia-count`. **Bộ giải:** chạm khi `data-kind="gia"` và `data-next` ≤ 35 ms; bỏ qua `vun`; dừng khi `data-v` ≥ tâm vùng; chờ 900 ms |
| Phụ bếp M6 | value ~ N(tâm; 0,11 × nz); trúng muỗng ~ Bernoulli(0,12 × er) mỗi phách vun. `timeSec` = 0,8 + 0,5·(hits + ⌊hits/4⌋) + 0,3 |

#### 2.3.5 `xe` — Xé (đã dựng thử: `thu-B/xe.html`)

| Mục | Nội dung |
|---|---|
| Dùng ở | `xe_kho_bo` (Bánh tráng trộn: khô bò xé **dọc thớ**, `axisDeg` 90); `xe_kho_muc` (Tây Ninh: khô mực xé **ngang thân, tức dọc theo thớ** thành sợi nhỏ lúc còn ấm, `am-thuc.md` [19]; giữ id, trước là `cha` strokes; 3 sợi mỗi phần); mẻ sáng "Khô bò xé sợi" |
| Cử chỉ | Chạm giữ **núm mép** của sợi kế (tab bo tròn 48px có mũi tên, **không** dùng vòng chấm đen trông như mắt — lỗi dựng thử B), **kéo theo mũi tên thớ**. Sợi tách ra và **bám theo ngón** ngay. Lệch khỏi thớ quá `tolDeg` × mul, kéo ngược, hoặc kéo quá nhanh (> 1.400 px/s trong 2 mẫu liền: "xé phải nhẹ tay hơn chặt") thì **đứt "Phựt!"** tại điểm đó. Tới vạch xanh "đủ dài" (≥ 160px; miếng đặt **chéo** để màn hẹp vẫn đủ dài) thì sợi rơi xuống đĩa. Tối đa 4 sợi một màn, núm cách nhau ≥ 52px; ở 320px và 375×553 chỉ hiện 3 núm một lượt; mỗi lượt kế (miếng mới trượt vào) tốn 0,45 giây, đã tính trong `timeSec` |
| Đo (thuần) | **Mới** `classifyDrag(samples, { axisDeg, tolDeg, minLen, vMax })` (mở rộng `classifySwipe` cho góc bất kỳ) → `{ len, frac, angleDev, tooFast, broke }` |
| params | `{ strands: K, axisDeg: 0 \| 90, tolDeg }`: khô bò 35°, khô mực 50° (khô mực nướng đập rồi xé dễ hơn; hiệu chỉnh 81 ô, mục 5.5); `strands` nhân theo số phần. Thạo: tolDeg × mul; cấp 3 chỉ hiện mũi tên ở sợi đầu |
| Chấm | `scoreXe` = trung bình K sợi của `strandScore(frac)` (frac ≥ 0,9 → 100; ngắn hơn → 20 + 70·frac/0,9; sợi chưa xé → 0) − (quá giờ ? 15 : 0). Ví dụ dựng thử: [1; 0,43; 1; 1] → 88 (khóa ở `m54-scoring`). **Mọi số mục 5 chạy bằng công thức này**; bản 1 lỡ chạy `scoreXe` của phương án C (cùng ví dụ ra 78), phản biện vòng 1 #9 |
| Sàn giờ | 1,1·strands + 1 + 0,45·(⌈strands/3⌉ − 1) (mục 2.0.7) |
| Hình | Đạo cụ `dia_lon` (có); `kho_bo` (có) → `kho_bo.xe` (mới, đống sợi); `kho_muc.dap` → `kho_muc.xe` (có); miếng gốc mỏng dần 3 mức bằng CSS. Biểu tượng `tay_xe` |
| VFX, âm | Sợi bám ngón; đứt: "Phựt! Đứt sợi" (chữ trắng viền mực), rung 1px, mẩu sợi rơi; đủ dài: sợi rơi xuống đĩa, đống tơi cao dần, 3 xơ **`shred`**; ba sợi đẹp liền: "Sợi dài đẹp!". **Âm mới `rip`** (noise quét 900 → 3.000 Hz, phát lại mỗi 24px kéo); đứt: `crack` (có) |
| Giảm chuyển động | Sợi vẫn bám ngón; sợi về đĩa hiện thẳng; chữ đứng yên |
| Tour `bep_xe` | ① "Giữ mép sợi": "Giữ cái mép có mũi tên rồi kéo theo hướng mũi tên." ② "Kéo đều tay": "Lệch hướng hay giật mạnh là đứt sợi. Kéo tới vạch xanh là sợi dài đẹp." |
| e2e | `xe-handle-i[data-len, data-axis]`, `xe-count[data-v, data-n]`, `xe-plate`. **Bộ giải** (đã chạy ở `thu-B/chup.mjs`): nhấn giữa núm, kéo theo `data-axis` 18 bước × 16 ms, tới `data-len` + 8px |
| Phụ bếp M6 | lệch góc ~ \|N(0; 13 × nz)\|°; vượt tolDeg × mul hoặc Bernoulli(0,03 × er) (kéo nhanh) thì frac ~ U(0,3; 0,85). `timeSec` = 0,7 + 0,7·strands + 0,45·(số lượt − 1) |

#### 2.3.6 `bao` — Bào; lớp vỏ `nao` — Nạo (bào đã dựng thử: `thu-B/bao.html`)

| Mục | Nội dung |
|---|---|
| Dùng ở | `thai_xoai` (2 món bánh tráng trộn; **giữ id**, đổi `thai` → `bao`: người bán gọt rồi **bào sợi** trên bàn bào, `am-thuc.md` [2]); mẻ sáng "Xoài bào sợi"; lớp `nao`: nạo cơm dừa ở mẻ "Nước cốt dừa nhà vắt" |
| Cử chỉ (bào) | Giữ quả (đã gọt; vùng ≥ 96×96px) ở đầu trên bàn bào, **kéo xuống** cho đáy quả qua lưỡi, rồi **kéo lên**; mỗi lần đổi chiều ở đáy là một lượt (`createReversalCounter`, ngưỡng 24px, kiểm có đi qua lưỡi). Sợi rơi xuống tô **ngay khi** đáy quả lướt qua lưỡi; quả ngắn dần; **thước "Lượng sợi"** (G3, mép phải) dâng theo lượng sợi trong tô, mỗi lượt cộng 1/K ± 15%. Khi quả còn < 75% thì hiện **vạch đỏ "Vạch an toàn"** sát lưỡi: tay qua vạch là "Coi chừng tay!", lượt đó không tính. **Kết thúc:** nhấc tay 400 ms khi thước đã qua 0,6·a, hoặc bấm Xong, hoặc hết giờ. Ở xs bàn bào **luôn đặt nghiêng** 20° (300×180) |
| Cử chỉ (lớp `nao`, phản biện vòng 2 #13) | Nửa gáo dừa đã bổ nằm ngửa, lòng gáo là cơm dừa trắng; nạo là **vuốt theo cung** từ mép gáo vào giữa (như cầm bàn nạo răng cưa cào vào lòng gáo). Mỗi vuốt hợp lệ (dài ≥ 60px, cong theo cung gáo trong dải ±18° quanh hướng tâm, bắt đầu cách mép ≤ 24px) là một lượt; thước "Lượng cơm dừa" G3 dâng như bào. **Viền nâu** (vỏ lụa sát gáo) là vạch đỏ: điểm cuối vuốt lấn vào viền ≥ 8px là "Lẫn vỏ nâu" (lượt đó vẫn tính, trừ điểm). Gáo xoay 30° sau mỗi lượt (vệt nạo mới ở chỗ còn cơm). Kết thúc như bào. Khác hẳn cử chỉ kéo lên xuống của bào nên có `gestureKey` riêng `bao.nao` và tour riêng |
| Đo (thuần) | Bào: **mới** `createGrater({ strokes, bladeY, L0, redGap: 16, window, zone })`: độ dài quả = L0·(1 − shrink·lượt/K); độ co tự giới hạn để cửa sổ an toàn của lượt cuối ≥ `window` = 24px × mul ở mọi cỡ màn; quả không lọt xuống dưới lưỡi; `amount()` = lượng sợi 0..1,3. Nạo: **mới** `createScraper({ strokes, center, radius, rimWidth: 14, arcTol: 18, minLen: 60, zone })` → `{ stroke(samples) → { ok, len, arcDev, rim }, amount() }` (đo cung bằng góc giữa vector vuốt và bán kính tại điểm đầu; `rim` = độ lấn viền nâu) |
| params | `{ strokes: K, zone: [a, b] }` (xoài K 6, vùng "Đủ" [0,85; 1,05]; nạo K 6, cùng vùng). Thạo: `window` / `arcTol` × mul, vùng × mul; cấp 1 vạch đỏ hiện sớm hơn để dạy |
| Chấm | `scoreBao` = `zoneScore(lượng, zone, m)` − (cv nhịp > 0,6·m ? 10 : 0) − 20·(số lần qua vạch đỏ, tag `suyt_dut_tay`; lớp `nao`: số lần lấn viền, tag `lan_vo_nau`) − (quá giờ ? 15 : 0). Lượng > b + 0,15 là "Bào lẹm cả hột" / "Nạo lẹm cả vỏ" (theo `zoneScore`) |
| Sàn giờ | 0,5·strokes + 1,2 (cả hai lớp) |
| Hình | Đạo cụ `ban_bao_lon` (bàn bào, điểm neo `blade`); quả `xoai_xanh.got` (có); tô `to_lon` (có); kết quả `xoai_xanh.soi` (có). Lớp `nao`: `dua_kho.bo_doi` (gáo dừa, vẽ CSS lớp cơm trắng mỏng dần 3 mức) + `dua_nao` (có). Biểu tượng `ban_bao` |
| VFX, âm | Mỗi lượt 2–3 sợi **`shred`** màu ruột (nạo: vụn trắng); đống trong tô cao dần 3 mức khớp thước; qua vạch đỏ / lấn viền: viền sân khấu chớp đỏ 260 ms, rung 4px, "Coi chừng tay!" / "Lẫn vỏ nâu!"; vào vùng "Đủ": "Đủ rồi!" + âm `tick`; 4 lượt đều: "Sợi mướt!". **Âm mới `grate`** (noise dải 2,5–5 kHz 140 ms), nạo cùng âm hạ 20% cao độ; qua vạch đỏ: `error` (có) |
| Giảm chuyển động | Quả / ngón vẫn theo tay; viền đỏ tĩnh 400 ms; không sợi bay, đống và thước vẫn cao dần; gáo không xoay (vệt nạo đổi chỗ tại chỗ) |
| Tour | `bep_bao`: ① "Kéo lên kéo xuống": "Giữ quả kéo xuống qua lưỡi rồi kéo lên, mỗi lần là một lượt bào." ② "Đủ sợi thì dừng": "Thước bên phải là lượng sợi. Tới vùng Đủ thì nhấc tay; quả ngắn rồi thì coi chừng vạch đỏ." **`bep_nao`** (mới): ① "Vuốt theo lòng gáo": "Vuốt từ mép gáo vào giữa theo lòng dừa, mỗi vuốt nạo được một lớp cơm." ② "Né viền nâu": "Đừng cào sát vỏ nâu kẻo lẫn vỏ. Thước tới vùng Đủ thì nhấc tay." |
| e2e | Bào: `bao-grater[data-blade]`, `bao-fruit[data-len, data-top]`, `bao-safe[data-y, data-on]`, `bao-count[data-v, data-n]`, `bao-meter[data-v, data-a, data-b]`. Nạo: `nao-coconut[data-cx, data-cy, data-r, data-arc]`, `nao-stroke-i` (vệt đã nạo), `nao-rim[data-w]`, `nao-meter[data-v, data-a, data-b]`, `nao-count`. **Bộ giải** bào: giữ quả cách đầu 16px; mỗi lượt kéo tới y = blade + 30 − len + 16 rồi lên; không vượt `bao-safe`; dừng khi `bao-meter[data-v]` ≥ tâm vùng, nhấc tay, chờ 500 ms. Bộ giải nạo: mỗi lượt vuốt 14 bước × 16 ms theo cung bán kính `0,8·r` từ góc `data-arc` vào tâm, điểm cuối cách viền ≥ 20px; dừng khi `nao-meter[data-v]` ≥ tâm vùng |
| Phụ bếp M6 | Lượng ~ N(tâm; 0,09 × nz); cv ~ \|N(0,35; 0,15 × nz)\|; qua vạch đỏ ~ Bernoulli(0,12 × er) (nạo: lấn viền ~ Bernoulli(0,10 × er)). `timeSec` = 0,7 + 0,37·strokes·tâm vùng + 0,4 (nạo như bào) |

#### 2.3.7 `vat` — Vắt; lớp vỏ `nen` (nén phin), `vai` (vắt ráo)

| Mục | Nội dung |
|---|---|
| Dùng ở | `vat_tac` (2 món trà tắc; **giữ id**, đổi `cham min` → `vat`: vắt **vừa tay**, không bóp kiệt vỏ kẻo đắng, `am-thuc.md` [5][6]); `vat_rao` (Chè bưởi, lớp `vai`: vắt **thật ráo** — đối lập có chủ ý với tắc); `nen_phin` (2 món cà phê, lớp `nen`: gài nắp nén vừa tay); mẻ sáng: cùi bưởi, cốt dừa (lớp `vai`) |
| Cử chỉ | Nhấn giữ quả / nắm cùi / nắp phin (vùng ≥ 96×96px). Thước G3 dâng theo `holdLevel(t) = 1 − e^(−t/τ)`: nhanh lúc đầu, **khó lên cao**, đúng cảm giác bóp. Quả co lại theo lực; giọt nhiều dần. **Thả tay** là chốt lực. Làm n lần (lần kế trượt vào 200 ms). τ riêng theo nguyên liệu: tắc 0,55 giây, nắp phin 0,4 giây, cùi bưởi và cốt dừa 0,6 giây — cùng động tác mà tay cảm khác. Trà tắc: mỗi ly **vắt một lần cả nắm** 3 quả đã cắt đôi (n 1 mỗi phần). Lớp `nen`: thanh nằm ngang, nắp lún dần |
| params | `{ n, zone, bitter?, tau }`. Tắc [0,52; 0,66], đắng > 0,76 (vùng hẹp để 5★ không tăng vọt); cùi bưởi, cốt dừa "Ráo" [0,62; 0,86]; nén phin "Vừa tay" [0,36; 0,74] (v3 hẹp lại, mục 5.5). Thạo cấp 3: ẩn số trên thước |
| Chấm | `scoreVat` = trung bình n lần của `zoneScore(lực lúc thả, zone, m)`; tắc vượt `bitter` thì lần đó tối đa 55 (tag `dang`, mã review "Trà hơi đắng"); thiếu lần 0. Không trừ quá giờ |
| Thời gian (`timeSec`) | **Tính từ chính thước giữ:** 0,6 + n·(−τ·ln(1 − tâm vùng) + 0,45) (0,45 = lần kế trượt vào 0,2 + phản xạ thả 0,25). Tắc 1 lần: 1,54 giây; nén phin: 1,37 giây; cùi bưởi: 1,86 giây. Bản 1 dùng 0,6 + 0,95n, sai với thước (cùi bưởi τ 0,9 vùng [0,76; 0,96] cần giữ 1,77 giây mỗi lần) |
| Sàn giờ | **n·(−τ·ln(1 − b) + 0,5) + 1** (b = mép trên vùng): đủ giờ giữ tới mép trên ở mọi lần. Cùi bưởi 1 / 2 / 3 phần: giới hạn 3,75 / 5,25 / 6,75 giây, TB cần 1,86 / 3,12 / 4,37 giây |
| Hình | `tac.bo_hat` → `tac.vat` (có); `vo_buoi.hat_luu` → `vo_buoi.rao` (mới, cùi trắng ráo); `phin_lon` thêm phần `nap_nen`; đạo cụ `tui_vai` vẽ bằng CSS trên `tay` (không vẽ riêng). Biểu tượng `tay_vat` |
| VFX, âm | Giọt `drop` (có), số giọt tăng theo lực, nước dâng trong chén nhỏ; tắc vượt đắng: 1–2 hạt rơi "tõm" (`pit`), "Đắng rồi!"; cùi bưởi tới vùng: nước đục chảy rồi cùi trắng lại; nén vừa: nắp lún, "Vừa tay!". **Âm mới `squeeze`** (noise 600 Hz 120 ms + tone 300 → 200 Hz); nén: `click` (có) |
| Giảm chuyển động | Quả đổi 3 mức hình theo lực, không co giãn liên tục; giọt tĩnh, chỉ mực nước dâng |
| Tour `bep_vat` | ① "Nhấn giữ để bóp": "Nhấn giữ là bóp, thước bên cạnh dâng chậm dần." ② "Thả đúng vùng": "Thả tay khi thước vào vùng xanh. Tắc bóp kiệt là đắng, cùi bưởi thì phải vắt thật ráo." |
| e2e | `vat-fruit`, `vat-meter[data-v, data-a, data-b, data-bitter]`, `vat-count`. **Bộ giải:** `pointerdown` trên `vat-fruit`; chờ `data-v` ≥ (a + b)/2; `pointerup` |
| Phụ bếp M6 | lực ~ N(tâm; 0,09 × nz). `timeSec` như hàng "Thời gian" |

#### 2.3.8 `nhat` — Nhặt; lớp vỏ `hat` (khều hạt), `la` (ngắt lá)

| Mục | Nội dung |
|---|---|
| Dùng ở | `nhat_hat` (2 món trà tắc: **bỏ hết hạt tắc** vì hạt làm đắng, `am-thuc.md` [5][6]); `nhat_rau_ram` (2 món bánh tráng: ngắt lá rau răm vào thau rồi trộn ngay); mẻ sáng "Tắc cắt đôi, bỏ hạt" |
| Cử chỉ | Chạm từng thứ cần lấy (hạt tắc, lá non); **mồi** (múi tắc, cọng già, lá úa) chạm là nhầm. Mỗi đích có vùng chạm ≥ 44px dù hình nhỏ, tâm cách nhau ≥ 48px (lưới lệch theo `uiRand`). Tối đa 9 đích + 3 mồi một màn (lưới 4 × 3; ở 3 phần vẫn một màn, không có lượt trượt vào). Đủ n thì tự xong. **Mồi mờ đi sau 2 lần nhầm (v4):** chạm nhầm lần thứ 2 thì các mồi còn lại nhạt 60% và không nhận chạm nữa (Dì Sáu đã chỉ đủ), nên một thao tác nhặt trừ tối đa 50 điểm; người chơi ẩu không bị trừ dồn mà vẫn phải chạm đủ đích (`params.fade = 2`, mục 5.5) |
| params | `{ n, decoys, fade }` (`n` nhân số phần, `decoys` giữ). Hạt tắc n 3 (một chùm hạt mỗi quả), rau răm n 3; cả hai **3 mồi** (bản 1: 2; hiệu chỉnh mục 5.5), **`fade: 2`** (v4) |
| Chấm | `scoreNhat` = 100·min(1, đúng/n) − 25·min(số lần nhầm, `fade`). Không trừ quá giờ. Nhầm 1 lần = 75 (dưới 85 nên vẫn mất Không tì vết như bản v3; mồi mờ chỉ chặn nhầm lần 3 trở đi) |
| Sàn giờ | 0,8·n + 1 |
| Hình | Trạng thái `tac.hat` (mới: nửa tắc lộ hạt), `tac.bo_hat` (mới: nửa tắc sạch hạt), `rau_ram.nhat` (mới: nắm lá); hạt, lá, cọng vẽ thủ tục trong plugin; chén bỏ `chen_lon` (có). Biểu tượng `mui_dao` |
| VFX, âm | Đích bay theo đường cong vào chén (`vfx.fly`, 300 ms) kèm hạt **`pit`** (không đặt tên `seed`, từ cấm trong tệp chuỗi hiển thị); nhầm: mồi rung 3px, "Không phải!". **Âm mới `pick`** (tick 2,4 kHz 15 ms + pop) |
| Giảm chuyển động | Đích biến mất tại chỗ, chén đếm lên; không bay |
| Tour `bep_nhat` | ① "Chạm đúng thứ cần lấy": "Chạm từng hạt tắc (hay lá rau tươi) để lấy ra, nó tự bay vào chén." ② "Né đồ không phải": "Múi tắc, cọng già, lá úa thì để yên, chạm nhầm là bị trừ điểm. Hạt tắc sót lại là trà đắng." |
| e2e | `nhat-item-i[data-ok="1"\|"0"]`, `nhat-count`, `nhat-board[data-faded]` (v4: "1" khi mồi đã mờ). **Bộ giải:** chạm mọi đích có `data-ok="1"`; ca kiểm "nhầm 2 lần thì mồi mờ, điểm 50" ở `m54-bep` |
| Phụ bếp M6 | số lần nhầm ~ min(Poisson(0,18 × số mồi × er), `fade`) (cùng tỉ lệ mô hình dùng cho người chơi). `timeSec` = 0,6 + 0,5·n |

---

## 3. Công thức mới từng món

### 3.1 Quy ước

- **Giữ mọi id cũ** (63/63, kể cả `chon`), nên kết quả bước trong save cũ, ghi chú vá, `state-map.js` và test còn trỏ đúng. Ba bước giữ id nhưng đổi loại vì người bán thật làm khác: `vat_tac` cham → **vat** (vắt vừa tay), `thai_xoai` thai → **bao** (bào sợi), `xe_kho_muc` cha → **xe** (xé ngang thân, dọc theo thớ). 11 id mới trong ca: `xe_banh`, `kep_banh`, `nhat_hat`, `xe_kho_bo`, `nhat_rau_ram`, `nuong_kho_muc`, `dap_kho_muc`, `u_bot`, `nen_phin`, `vat_rao`, `muc_ly`. `cat_hanh` (bản 1 là bước trong ca) nay là **thao tác chỉ có ở mẻ "Rau bánh mì"**: người bán thật nhặt, cắt hành lá từ sáng (`am-thuc.md` 4.1); không hộp thì hành lá là hàng "cắt sẵn" như 0.5.1, rắc theo lúc kẹp.
- **Ghi chú vá tham số vẫn trỏ đúng:** Thêm trứng → `dap_trung.n`; Cay / Không cay / Cay nhiều → `nem.targets`; Lòng đào / Chín kỹ → `chien_trung.zone`; Ít / Nhiều đường → `nem_duong.n`; Ít ngọt / Ngọt đậm → `them_sua.n`; Ít đá → `them_da.n`; Thêm trứng cút → `boc_trung_cut.spots`; Nhiều cốt dừa → `rot_cot_dua.zone`.
- **Ghi chú bỏ nguyên liệu nay bỏ luôn thao tác của nguyên liệu đó** (hành vi sẵn có của `effectiveSteps`, `kitchen.js:29-62`): Không rau răm → bỏ `nhat_rau_ram`; "Không hành" không bỏ bước nào (như 0.5.1), nhưng `kep_banh` **không rắc hành lá** khi dòng có ghi chú `khong_hanh` (phản biện vòng 2 #22c). Bỏ thao tác **không** đổi nhịp khách (nhịp đọc `pace`).
- **Thứ tự nghề trước luật cũ.** `tron.after` có `nhat_rau_ram` (ngắt lá rau răm vào thau rồi mới trộn). Luật `data.test.mjs:209-214` ("bước có thể bị ghi chú bỏ không được làm tiền đề `after`") **sửa có chủ ý**: lõi đã tự lọc `after` của bước bị bỏ (`kitchen.js:60`: `s.after = s.after.filter(id => ids.has(id))`), nên không kẹt; test mới kiểm "Không rau răm" vẫn trộn được.
- **Cột:** "Tham số" là của 1 phần (`SCALE_KEYS` nhân theo số phần); "par" tính bằng giây, chỉ quyết định giới hạn giờ; "w (tỉ trọng)" là trọng số nguyên 1–3 như repo và tỉ trọng w / Σw; "Trạm" là nhãn trạm (`recipe.trams`); "Sơ chế sẵn" là id đồ thay bước (mục 4.2), "không" là phải làm tươi tại chỗ.
- **Trường dữ liệu mới:** ở bước `tram`, `params.cut` (thai), `params.auto`, `params.light` (bay), `params.bloom` (rot), `params.tau`, `params.bitter` (vat), `params.zone` (bao, xoay), `params.oneSided` (xoay); ở món `trams: [{ id, label, icon }]` (thứ tự ô trên Thớt) và `pace: [par 0.5.1 theo thứ tự bước cũ]` (đóng băng).
- **Bảng này là nguồn dữ liệu của mô phỏng v4**: `kiem-cuoi/v4/du-lieu.mjs` đọc thẳng các bảng dưới đây của **chính tệp này** (không chép tay sang tệp khác). So với bản v2 đổi: `u_phin` (chu kỳ 5, vùng × 1,2), `nen_phin` (vùng hẹp), `nuong_kho_muc` (chu kỳ 4, vùng rộng, par 2,5), `xe_kho_muc` (3 sợi), nhãn `nem` của bánh tráng ("nước tắc"). **So với bản v3 đổi (kiểm cuối, mục 5.5):** cả hai bước nhặt có "mồi mờ sau 2 lần nhầm"; ủ bột `u_bot` vùng [0,14; 0,31] → [0,13; 0,32]. Không đổi thời gian, `par`, `w`, giá.

### 3.2 Bảng bước từng món

#### Bánh mì ốp la `banh_mi_op_la`

| # | id | Loại · vỏ | Nhãn | Tham số (1 phần) | par | w (tỉ trọng) | Chí mạng · làm lại | after | ing | Trạm | Sơ chế sẵn | So với 0.5.1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `chon` | chon | Chọn nguyên liệu | — | 6 | 1 (9,1%) | — | — | — | — | không | giữ nguyên |
| 1 | `rua_dua` | cha | Rửa dưa leo | spots 2 | 1,5 | 1 (9,1%) | — | — | dua_leo | Dưa leo | rau_banh_mi | giữ id; par 3 → 1,5; tham số |
| 2 | `thai_dua` | thai | Cắt thanh dưa leo | cuts 2, kéo dọc vạch, cách: **cat_thanh** ✓ / thai_lat / thai_soi | 2,5 | 1 (9,1%) | — | rua_dua | dua_leo | Dưa leo | rau_banh_mi | giữ id; par 4 → 2,5; tham số; nhãn |
| 3 | `dap_trung` | dap | Đập trứng vào chảo | n 2 | 2 | 2 (18,2%) | — | — | trung_ga | Chảo trứng | không | giữ nguyên |
| 4 | `chien_trung` | lua · chao | Chiên trứng | period 5, zone [0,55; 0,72] | 5 | 3 (27,3%) | có · 6.000đ | dap_trung | trung_ga | Chảo trứng | không | giữ nguyên |
| 5 | `xe_banh` | thai · rach | Xẻ dọc ổ bánh | cuts 1, rạch, dừng trước vạch đỏ | 1,5 | 1 (9,1%) | — | — | banh_mi | Ổ bánh | không | **mới** |
| 6 | `kep_banh` | bay · o_banh | Kẹp trứng, dưa leo vào ổ | n 1, tự xong | 1,5 | 1 (9,1%) | — | xe_banh, chien_trung, thai_dua | — | Ổ bánh | không | **mới** |
| 7 | `nem` | cham | Rưới nước tương | targets, {nuoc_tuong 1} | 1,5 | 1 (9,1%) | — | kep_banh | nuoc_tuong | Ổ bánh | không | giữ id; par 2 → 1,5; nhãn |

Σpar 22 → 21,5 · Σw 9 → 11 · thao tác (trừ Chọn) 5 → 7 · 3 trạm · `pace` = [6, 3, 4, 2, 5, 2]

#### Bánh mì trứng gà ta `banh_mi_trung_ga_ta`

| # | id | Loại · vỏ | Nhãn | Tham số (1 phần) | par | w (tỉ trọng) | Chí mạng · làm lại | after | ing | Trạm | Sơ chế sẵn | So với 0.5.1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `chon` | chon | Chọn nguyên liệu | — | 6 | 1 (8,3%) | — | — | — | — | không | giữ nguyên |
| 1 | `rua_dua` | cha | Rửa dưa leo | spots 2 | 1,5 | 1 (8,3%) | — | — | dua_leo | Dưa leo | rau_banh_mi | giữ id; par 3 → 1,5; tham số |
| 2 | `thai_dua` | thai | Cắt thanh dưa leo | cuts 2, kéo dọc vạch, cách: **cat_thanh** ✓ / thai_lat / thai_soi | 2,5 | 1 (8,3%) | — | rua_dua | dua_leo | Dưa leo | rau_banh_mi | giữ id; par 4 → 2,5; tham số; nhãn |
| 3 | `dap_trung` | dap | Đập trứng gà ta vào chảo | n 2 | 2 | 2 (16,7%) | — | — | trung_ga_ta | Chảo trứng | không | giữ nguyên |
| 4 | `chien_trung` | lua · chao | Chiên trứng | period 5, zone [0,55; 0,72] | 5 | 3 (25,0%) | có · 6.000đ | dap_trung | trung_ga_ta | Chảo trứng | không | giữ nguyên |
| 5 | `nuong_banh_mi` | lua · lo | Nướng giòn bánh mì | period 4, zone [0,55; 0,75] | 4 | 1 (8,3%) | — | — | banh_mi | Ổ bánh | không | giữ nguyên |
| 6 | `xe_banh` | thai · rach | Xẻ dọc ổ bánh | cuts 1, rạch, dừng trước vạch đỏ | 1,5 | 1 (8,3%) | — | nuong_banh_mi | banh_mi | Ổ bánh | không | **mới** |
| 7 | `kep_banh` | bay · o_banh | Kẹp trứng, dưa leo vào ổ | n 1, tự xong | 1,5 | 1 (8,3%) | — | xe_banh, chien_trung, thai_dua | — | Ổ bánh | không | **mới** |
| 8 | `nem` | cham | Rưới nước tương | targets, {nuoc_tuong 1} | 1,5 | 1 (8,3%) | — | kep_banh | nuoc_tuong | Ổ bánh | không | giữ id; par 2 → 1,5; nhãn |

Σpar 26 → 25,5 · Σw 10 → 12 · thao tác (trừ Chọn) 6 → 8 · 3 trạm · `pace` = [6, 4, 3, 4, 2, 5, 2]

#### Trà tắc `tra_tac`

| # | id | Loại · vỏ | Nhãn | Tham số (1 phần) | par | w (tỉ trọng) | Chí mạng · làm lại | after | ing | Trạm | Sơ chế sẵn | So với 0.5.1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `chon` | chon | Chọn nguyên liệu | — | 5 | 1 (10,0%) | — | — | — | — | không | giữ nguyên |
| 1 | `thai_tac` | thai | Cắt đôi tắc | cuts 3, ngắm–nhấc | 3 | 1 (10,0%) | — | — | tac | Tắc | tac_cat | giữ id; tham số; nhãn |
| 2 | `nhat_hat` | nhat · hat | Khều bỏ hạt tắc | n 3, decoys 3, mồi mờ sau 2 lần nhầm | 1,5 | 1 (10,0%) | — | thai_tac | tac | Tắc | tac_cat | **mới** |
| 3 | `vat_tac` | vat | Vắt tắc vừa tay | n 1, zone [0,52; 0,66], bitter 0,76, tau 0,55 | 3 | 1 (10,0%) | — | nhat_hat | tac | Tắc | không | giữ id; loại cham → **vat**; nhãn |
| 4 | `rot_tra` | rot | Rót trà | zone [0,7; 0,82] | 3 | 2 (20,0%) | — | — | tra | Bình lắc | không | giữ nguyên |
| 5 | `nem_duong` | cham | Nêm đường | exact, n 2 | 2 | 3 (30,0%) | — | — | duong | Bình lắc | không | giữ nguyên |
| 6 | `lac` | lac · binh | Lắc đều | strokes 6 | 2 | 1 (10,0%) | — | rot_tra, nem_duong, vat_tac | — | Bình lắc | không | giữ nguyên |

Σpar 18 → 19,5 · Σw 9 → 10 · thao tác (trừ Chọn) 5 → 6 · 2 trạm · `pace` = [5, 3, 3, 3, 2, 2]

#### Trà tắc mật ong rừng `tra_tac_mat_ong`

| # | id | Loại · vỏ | Nhãn | Tham số (1 phần) | par | w (tỉ trọng) | Chí mạng · làm lại | after | ing | Trạm | Sơ chế sẵn | So với 0.5.1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `chon` | chon | Chọn nguyên liệu | — | 5 | 1 (10,0%) | — | — | — | — | không | giữ nguyên |
| 1 | `thai_tac` | thai | Cắt đôi tắc | cuts 3, ngắm–nhấc | 3 | 1 (10,0%) | — | — | tac | Tắc | tac_cat | giữ id; tham số; nhãn |
| 2 | `nhat_hat` | nhat · hat | Khều bỏ hạt tắc | n 3, decoys 3, mồi mờ sau 2 lần nhầm | 1,5 | 1 (10,0%) | — | thai_tac | tac | Tắc | tac_cat | **mới** |
| 3 | `vat_tac` | vat | Vắt tắc vừa tay | n 1, zone [0,52; 0,66], bitter 0,76, tau 0,55 | 3 | 1 (10,0%) | — | nhat_hat | tac | Tắc | không | giữ id; loại cham → **vat**; nhãn |
| 4 | `rot_tra` | rot | Rót trà | zone [0,7; 0,82] | 3 | 2 (20,0%) | — | — | tra | Bình lắc | không | giữ nguyên |
| 5 | `rot_mat_ong` | rot · to | Rót mật ong | zone [0,55; 0,68] | 3 | 3 (30,0%) | — | — | mat_ong_rung | Bình lắc | không | giữ nguyên |
| 6 | `lac` | lac · binh | Lắc đều | strokes 6 | 2 | 1 (10,0%) | — | rot_tra, rot_mat_ong, vat_tac | — | Bình lắc | không | giữ nguyên |

Σpar 19 → 20,5 · Σw 9 → 10 · thao tác (trừ Chọn) 5 → 6 · 2 trạm · `pace` = [5, 3, 3, 3, 3, 2]

#### Bánh tráng trộn `banh_trang_tron`

| # | id | Loại · vỏ | Nhãn | Tham số (1 phần) | par | w (tỉ trọng) | Chí mạng · làm lại | after | ing | Trạm | Sơ chế sẵn | So với 0.5.1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `chon` | chon | Chọn nguyên liệu | — | 8 | 1 (7,7%) | — | — | — | — | không | giữ nguyên |
| 1 | `cat_banh_trang` | thai · keo | Cắt sợi bánh tráng | cuts 4, kéo theo nhịp, cách: **cat_soi** ✓ / cat_vuong / de_nguyen | 2,5 | 1 (7,7%) | — | — | banh_trang | Bánh tráng | banh_trang_soi | giữ id; par 4 → 2,5; tham số; nhãn |
| 2 | `got_xoai` | got | Gọt vỏ xoài | strips 4 | 2,5 | 1 (7,7%) | — | — | xoai_xanh | Xoài xanh | xoai_bao | giữ id; par 3 → 2,5; tham số |
| 3 | `thai_xoai` | bao | Bào sợi xoài | strokes 6, zone [0,85; 1,05], cách: **bao_soi** ✓ / thai_soi / thai_lat | 2,5 | 1 (7,7%) | — | got_xoai | xoai_xanh | Xoài xanh | xoai_bao | giữ id; loại thai → **bao**; par 4 → 2,5; nhãn |
| 4 | `boc_trung_cut` | cha · boc | Bóc trứng cút | spots 3 | 3 | 1 (7,7%) | — | — | trung_cut | Trứng cút, khô bò | trung_cut_boc | giữ nguyên |
| 5 | `xe_kho_bo` | xe | Xé khô bò | strands 3, axisDeg 90, tolDeg 35 | 2,5 | 1 (7,7%) | — | — | kho_bo | Trứng cút, khô bò | kho_bo_xe | **mới** |
| 6 | `nem` | cham | Nêm sa tế, nước tắc | targets, {sa_te 2, tac 2} | 3 | 2 (15,4%) | — | — | tac | Thau trộn | không | giữ nguyên |
| 7 | `rot_dau_hanh` | rot · to | Rưới dầu hành phi | zone [0,55; 0,7] | 2 | 1 (7,7%) | — | — | hanh_phi | Thau trộn | không | giữ nguyên |
| 8 | `nhat_rau_ram` | nhat · la | Ngắt lá rau răm | n 3, decoys 3, mồi mờ sau 2 lần nhầm | 1,5 | 1 (7,7%) | — | — | rau_ram | Thau trộn | không | **mới** |
| 9 | `tron` | xoay · to | Trộn đều | turns 5 | 4 | 3 (23,1%) | — | cat_banh_trang, thai_xoai, boc_trung_cut, xe_kho_bo, nem, rot_dau_hanh, nhat_rau_ram | — | Thau trộn | không | giữ nguyên |

Σpar 31 → 31,5 · Σw 11 → 13 · thao tác (trừ Chọn) 7 → 9 · 4 trạm · `pace` = [8, 4, 3, 4, 3, 3, 2, 4]

#### Bánh tráng trộn Tây Ninh `banh_trang_tron_tay_ninh`

| # | id | Loại · vỏ | Nhãn | Tham số (1 phần) | par | w (tỉ trọng) | Chí mạng · làm lại | after | ing | Trạm | Sơ chế sẵn | So với 0.5.1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `chon` | chon | Chọn nguyên liệu | — | 8 | 1 (6,3%) | — | — | — | — | không | giữ nguyên |
| 1 | `cat_banh_trang` | thai · keo | Cắt sợi bánh tráng | cuts 4, kéo theo nhịp, cách: **cat_soi** ✓ / cat_vuong / de_nguyen | 2,5 | 1 (6,3%) | — | — | banh_trang | Bánh tráng | banh_trang_soi | giữ id; par 4 → 2,5; tham số; nhãn |
| 2 | `got_xoai` | got | Gọt vỏ xoài | strips 4 | 2,5 | 1 (6,3%) | — | — | xoai_xanh | Xoài xanh | xoai_bao | giữ id; par 3 → 2,5; tham số |
| 3 | `thai_xoai` | bao | Bào sợi xoài | strokes 6, zone [0,85; 1,05], cách: **bao_soi** ✓ / thai_soi / thai_lat | 2,5 | 1 (6,3%) | — | got_xoai | xoai_xanh | Xoài xanh | xoai_bao | giữ id; loại thai → **bao**; par 4 → 2,5; nhãn |
| 4 | `boc_trung_cut` | cha · boc | Bóc trứng cút | spots 3 | 3 | 1 (6,3%) | — | — | trung_cut | Trứng cút | trung_cut_boc | giữ nguyên |
| 5 | `nuong_kho_muc` | lua · nuong | Nướng khô mực | period 4, zone [0,36; 0,94] | 2,5 | 1 (6,3%) | — | — | kho_muc | Khô mực | không | **mới** |
| 6 | `dap_kho_muc` | dap_dap · giay | Gói giấy, đập dập khô mực | n 2, zone [0,35; 0,85] | 2 | 1 (6,3%) | — | nuong_kho_muc | kho_muc | Khô mực | không | **mới** |
| 7 | `xe_kho_muc` | xe | Xé khô mực ngang thân | strands 3, axisDeg 0, tolDeg 50 | 2,5 | 2 (12,5%) | — | dap_kho_muc | kho_muc | Khô mực | không | giữ id; loại cha → **xe**; par 3 → 2,5; nhãn |
| 8 | `nem` | cham | Nêm sa tế, muối tôm, nước tắc | targets, {sa_te 2, muoi_tom_tay_ninh 1, tac 2} | 3 | 2 (12,5%) | — | — | tac | Thau trộn | không | giữ nguyên |
| 9 | `rot_dau_hanh` | rot · to | Rưới dầu hành phi | zone [0,55; 0,7] | 2 | 1 (6,3%) | — | — | hanh_phi | Thau trộn | không | giữ nguyên |
| 10 | `nhat_rau_ram` | nhat · la | Ngắt lá rau răm | n 3, decoys 3, mồi mờ sau 2 lần nhầm | 1,5 | 1 (6,3%) | — | — | rau_ram | Thau trộn | không | **mới** |
| 11 | `tron` | xoay · to | Trộn đều | turns 5 | 4 | 3 (18,8%) | — | cat_banh_trang, thai_xoai, boc_trung_cut, xe_kho_muc, nem, rot_dau_hanh, nhat_rau_ram | — | Thau trộn | không | giữ nguyên |

Σpar 34 → 36 · Σw 13 → 16 · thao tác (trừ Chọn) 8 → 11 · 5 trạm · `pace` = [8, 4, 3, 4, 3, 3, 3, 2, 4]

#### Cà phê sữa đá `ca_phe_sua_da`

| # | id | Loại · vỏ | Nhãn | Tham số (1 phần) | par | w (tỉ trọng) | Chí mạng · làm lại | after | ing | Trạm | Sơ chế sẵn | So với 0.5.1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `chon` | chon | Chọn nguyên liệu | — | 5 | 1 (7,7%) | — | — | — | — | không | giữ nguyên |
| 1 | `u_bot` | rot · phin | Chế chút nước ủ bột | zone [0,13; 0,32], bọt nở | 1,5 | 1 (7,7%) | — | — | ca_phe | Phin cà phê | không | **mới** |
| 2 | `nen_phin` | vat · nen | Gài nắp nén vừa tay | n 1, zone [0,36; 0,74], tau 0,4 | 1,5 | 1 (7,7%) | — | u_bot | ca_phe | Phin cà phê | không | **mới** |
| 3 | `rot_nuoc` | rot · phin | Châm nước sôi đầy phin | zone [0,6; 0,75] | 2,5 | 2 (15,4%) | — | nen_phin | ca_phe | Phin cà phê | không | giữ id; par 3 → 2,5; nhãn |
| 4 | `u_phin` | lua · phin | Chờ phin nhỏ giọt | period 5, zone [0,58; 0,82] | 5 | 3 (23,1%) | — | rot_nuoc | ca_phe | Phin cà phê | không | giữ id; par 6 → 5, vùng × 1,2 (cùng độ khó theo giây); w 2 → **3**; tham số |
| 5 | `them_sua` | cham | Thêm sữa đặc | exact, n 2 | 2 | 3 (23,1%) | — | — | sua_dac | Ly | không | giữ nguyên |
| 6 | `them_da` | bay · ly | Thả đá vào ly | n 2, tự xong | 2 | 1 (7,7%) | — | — | da | Ly | không | giữ id; tham số |
| 7 | `khuay` | xoay · ly | Khuấy đều | turns 3 | 2 | 1 (7,7%) | — | u_phin, them_sua, them_da | — | Ly | không | giữ nguyên |

Σpar 20 → 21,5 · Σw 10 → 13 · thao tác (trừ Chọn) 5 → 7 · 2 trạm · `pace` = [5, 3, 6, 2, 2, 2]

#### Cà phê muối `ca_phe_muoi`

| # | id | Loại · vỏ | Nhãn | Tham số (1 phần) | par | w (tỉ trọng) | Chí mạng · làm lại | after | ing | Trạm | Sơ chế sẵn | So với 0.5.1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `chon` | chon | Chọn nguyên liệu | — | 5 | 1 (5,9%) | — | — | — | — | không | giữ nguyên |
| 1 | `u_bot` | rot · phin | Chế chút nước ủ bột | zone [0,13; 0,32], bọt nở | 1,5 | 1 (5,9%) | — | — | ca_phe_bmt | Phin cà phê | không | **mới** |
| 2 | `nen_phin` | vat · nen | Gài nắp nén vừa tay | n 1, zone [0,36; 0,74], tau 0,4 | 1,5 | 1 (5,9%) | — | u_bot | ca_phe_bmt | Phin cà phê | không | **mới** |
| 3 | `rot_nuoc` | rot · phin | Châm nước sôi đầy phin | zone [0,6; 0,75] | 2,5 | 2 (11,8%) | — | nen_phin | ca_phe_bmt | Phin cà phê | không | giữ id; par 3 → 2,5; nhãn |
| 4 | `u_phin` | lua · phin | Chờ phin nhỏ giọt | period 5, zone [0,58; 0,82] | 5 | 3 (17,6%) | — | rot_nuoc | ca_phe_bmt | Phin cà phê | không | giữ id; par 6 → 5, vùng × 1,2 (cùng độ khó theo giây); w 2 → **3**; tham số |
| 5 | `danh_sua_muoi` | xoay · chen | Đánh sữa muối cho sánh | turns 6, nhanh, zone [0,8; 1,2], chỉ chấm thiếu | 4 | 2 (11,8%) | — | — | muoi | Sữa muối | sua_muoi | giữ id; tham số; nhãn |
| 6 | `them_sua` | cham | Thêm sữa đặc | exact, n 2 | 2 | 2 (11,8%) | — | — | sua_dac | Ly | không | giữ nguyên |
| 7 | `them_da` | bay · ly | Thả đá vào ly | n 2, tự xong | 2 | 1 (5,9%) | — | — | da | Ly | không | giữ id; tham số |
| 8 | `khuay` | xoay · ly | Khuấy đều | turns 3 | 2 | 1 (5,9%) | — | u_phin, them_sua, them_da | — | Ly | không | giữ nguyên |
| 9 | `rot_sua_muoi` | rot · to | Rưới lớp sữa muối | zone [0,55; 0,7] | 2 | 3 (17,6%) | — | khuay, danh_sua_muoi | muoi | Ly | không | giữ nguyên |

Σpar 26 → 27,5 · Σw 14 → 17 · thao tác (trừ Chọn) 7 → 9 · 3 trạm · `pace` = [5, 3, 6, 2, 2, 2, 4, 2]

#### Chè bưởi `che_buoi`

| # | id | Loại · vỏ | Nhãn | Tham số (1 phần) | par | w (tỉ trọng) | Chí mạng · làm lại | after | ing | Trạm | Sơ chế sẵn | So với 0.5.1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `chon` | chon | Chọn nguyên liệu | — | 6 | 1 (7,7%) | — | — | — | — | không | giữ nguyên |
| 1 | `got_vo` | got | Gọt sạch vỏ xanh | strips 4 | 2,5 | 1 (7,7%) | — | — | vo_buoi | Cùi bưởi | cui_buoi_nau_san | giữ id; par 3 → 2,5; tham số; nhãn |
| 2 | `thai_cui` | thai | Cắt hạt lựu cùi bưởi | cuts 4, hai lượt, xoay thớt, cách: **hat_luu** ✓ / thai_lat / thai_soi | 3,5 | 1 (7,7%) | — | got_vo | vo_buoi | Cùi bưởi | cui_buoi_nau_san | giữ id; par 4 → 3,5; tham số; nhãn |
| 3 | `bop_muoi` | cha · bop | Bóp muối, xả cho hết đắng | strokes 5 | 2 | 1 (7,7%) | — | thai_cui | muoi | Cùi bưởi | cui_buoi_nau_san | giữ id; par 3 → 2; tham số |
| 4 | `vat_rao` | vat · vai | Vắt thật ráo | n 1, zone [0,62; 0,86], tau 0,6 | 1,5 | 1 (7,7%) | — | bop_muoi | vo_buoi | Cùi bưởi | cui_buoi_nau_san | **mới** |
| 5 | `ao_bot` | lac · ro | Lắc rổ áo bột năng | strokes 8, maxRatio 1,2 | 3,5 | 2 (15,4%) | — | vat_rao | bot_nang | Nồi luộc | cui_buoi_nau_san | giữ id; par 4 → 3,5 |
| 6 | `luoc` | lua · noi | Luộc tới khi trong | period 5, zone [0,55; 0,75] | 5 | 3 (23,1%) | có · 3.000đ | ao_bot | bot_nang | Nồi luộc | cui_buoi_nau_san | giữ nguyên |
| 7 | `muc_ly` | bay · muc | Múc chè vào ly | n 1, tự xong, đích rộng | 2 | 1 (7,7%) | — | luoc | — | Ly chè | không | **mới** |
| 8 | `rot_cot_dua` | rot · to | Rưới nước cốt dừa | zone [0,65; 0,8] | 2 | 2 (15,4%) | — | muc_ly | cot_dua | Ly chè | không | giữ nguyên |

Σpar 27 → 28 · Σw 11 → 13 · thao tác (trừ Chọn) 6 → 8 · 3 trạm · `pace` = [6, 3, 4, 3, 4, 5, 2]

**Vì sao từng món như vậy:**

- **Bánh mì (ốp la, trứng gà ta).** Thao tác đặc trưng: **xẻ dọc ổ một bên, không đứt đôi → kẹp trứng và dưa leo vào ổ (bóng mờ chỗ đặt, đủ là tự xong) → rưới nước tương** (thứ tự của xe bánh mì Sài Gòn, `am-thuc.md` [13][14]); dưa leo **cắt thanh** dài bằng cách kéo dao dọc vạch (Q2). Rửa vẫn là bước riêng (bài học vệ sinh `chua_rua`). Rửa 4 → 2 vết, cắt 3 → 2 nhát (2 nhát dọc ra 3 thanh, đủ một ổ). **Hành lá không cắt trong ca**: người bán nhặt, cắt hành ngò từ sáng (`am-thuc.md` 4.1); mẻ "Rau bánh mì" có thao tác cắt khúc hành lá bằng kéo theo nhịp. Bản 1 để cắt hành trong ca thì 2–3 phần vượt mục tiêu thời lượng (phản biện vòng 1 #1). Trứng gà ta có thêm nướng giòn bánh mì (`lua` lớp `lo`) đầu trạm Ổ bánh. Ghi chú "Không hành" thì lúc kẹp không rắc hành lá.
- **Trà tắc (và mật ong rừng).** Thao tác đặc trưng: **cắt đôi đủ 3 quả tắc → khều hạt (mỗi quả một chùm) → vắt cả nắm một lần, vừa tay** có vạch "Đắng" (`am-thuc.md` [5][6]), rồi rót, nêm, lắc trong bình. Ba quả khớp `tac` qty 3 và giá hộp "Tắc cắt đôi" (phản biện vòng 1 #25). Vắt một lần mỗi ly giữ 2–3 phần trong mục tiêu thời lượng (vắt 3 lần mỗi ly thì 3 phần +17,6% ở kịch bản chính, mục 5.9). Mồi khi khều hạt là 3 múi tắc / mảnh vỏ (nhiều hơn bản 1 một mồi, để thao tác không dễ hơn bước "chạm nhanh 6 lần" cũ).
- **Bánh tráng trộn (và Tây Ninh).** Thao tác đặc trưng: **cắt bánh tráng bằng kéo theo nhịp, gọt rồi bào sợi xoài, xé khô bò, ngắt rau răm vào thau rồi mới trộn** (`am-thuc.md` [1][2]). Đậu phộng **không giã trong ca** (người bán giã sẵn từ sáng) mà là đồ nhà làm của mẻ sáng; hành phi cũng vậy (nay là mẻ "Hành tỏi phi", có thái lát hành tím, đập dập và băm tỏi) — người dùng chốt Q4/Q5: băm, chặt, giã chỉ ở mẻ sáng. Tây Ninh: **nướng khô mực → gói giấy đập dập → xé ngang thân lúc còn ấm** (`am-thuc.md` [19]); nướng chu kỳ 4 với vùng rộng [0,36; 0,94] (nướng than khô mực dễ tính, cháy cạnh vẫn ăn được); khô mực đã đập dập thì thớ mềm, xé dễ (lệch tối đa 50° thay vì 35° của khô bò), 3 sợi mỗi phần; khô mực là hàng hiếm, chưa có mẻ sáng.
- **Cà phê (sữa đá, muối).** Thao tác đặc trưng: **chế chút nước ủ cho bột nở (bọt nở) → gài nắp nén vừa tay → châm đầy → canh phin** — đúng thứ tự `am-thuc.md` 4.7. Chu kỳ chờ phin 6 → 5 giây để bù thời gian, với **vùng nới × 1,2** để độ khó tính theo giây không đổi (kim chạy 1,2/chu kỳ mỗi giây; phản biện vòng 2 #1), và **`u_phin` w 2 → 3**: canh phin là hồn của món (mục 5.5). Nén nắp "vừa tay" vùng [0,36; 0,74]. Thả đá nay đủ viên là tự xong. Cà phê muối: **đánh sữa muối cho sánh**, chỉ chấm khi đánh thiếu; kệ không có kem béo nên không có luật "Tách béo" (Q7). Trạm Sữa muối đứng trước trạm Ly để "Rưới lớp sữa muối" nằm cuối trạm Ly không bị khóa. Phin không có hộp (pha phin tại chỗ là nét của món).
- **Chè bưởi.** Cùi bưởi **gọt sạch vỏ xanh → cắt hạt lựu (hai lượt, xoay thớt) → bóp muối, xả → vắt thật ráo** (đối lập với tắc vắt vừa tay) → áo bột → luộc (chí mạng) → **múc chè vào ly** (một vá mỗi ly) → rưới cốt dừa (`am-thuc.md` [11][12]). Ngoài đời người bán nấu sẵn cả chuỗi từ sáng **và ngâm nước đá cho giòn**, nên hộp "Cùi bưởi nấu sẵn" có thêm thao tác ngâm (chỉ ở mẻ, chỉ vào Q mẻ) và thay 6 thao tác trong ca (điểm `luoc` lấy từ thao tác luộc của mẻ).

**Chí mạng.** Giữ đúng 2 bước như cũ (`chien_trung` 6.000đ, `luoc` 3.000đ). Không thêm bước chí mạng mới: thao tác nhỏ hỏng chỉ trừ Q. Tỉ trọng bước chí mạng giảm (chiên 33% → 27% ở ốp la, 30% → 25% ở gà ta; luộc 27% → 23%) nhưng luật "chí mạng < 50 thì món Hỏng" (`scoring.js:78, 97-101`) không đổi, nên Hỏng của người chơi Ẩu đổi ≤ 1 điểm (mục 5.5).

### 3.3 So sánh tổng (khóa ở mục 5.7)

Thời gian là giây trung bình không nhiễu của người chơi TB, 1 phần, không ghi chú, không sơ chế (trừ 0,4 giây chạm "Ra món" như bảng của phản biện), mô hình v3 (lượt trượt vào 0,45 giây). "Mọi ô" là lệch lớn nhất trên 9 món × TB / Giỏi / Ẩu × 1–3 phần × {không ghi chú, từng ghi chú, cặp ghi chú khác nhóm} × {khung rộng, khung 320}, không tính thẻ người mới (`bang-33-v3.mjs`; có thẻ người mới xem mục 5.3).

| Món | Thao tác cũ → mới | Trạm | `pace` (nhịp khách, không đổi) | Σpar cũ → mới | Σw cũ → mới | Chí mạng | 0.5.1 (TB) | tau 0,6 + gọn (TB) | tau 0,9 + gọn (TB) | Mọi ô: chính / tau 0,9 + gọn / tau 0,9 không gọn |
|---|---|---|---|---|---|---|---|---|---|---|
| Bánh mì ốp la | 5 → 7 | 3 | [6, 3, 4, 2, 5, 2] = 22 | 22 → 21,5 (−2,3%) | 9 → 11 | chien_trung | 29,8 | 29,1 (−2,2%) | 30,3 (+1,8%) | +6,2% / +9,9% / +13,2% |
| Bánh mì trứng gà ta | 6 → 8 | 3 | [6, 4, 3, 4, 2, 5, 2] = 26 | 26 → 25,5 (−1,9%) | 10 → 12 | chien_trung | 33,5 | 32,2 (−3,7%) | 33,7 (+0,7%) | +4,6% / +8,6% / +11,7% |
| Trà tắc | 5 → 6 | 2 | [5, 3, 3, 3, 2, 2] = 18 | 18 → 19,5 (+8,3%) | 9 → 10 | — | 26,3 | 24,9 (−5,2%) | 26,1 (−0,6%) | +3,6% / +7,5% / +10,0% |
| Trà tắc mật ong rừng | 5 → 6 | 2 | [5, 3, 3, 3, 3, 2] = 19 | 19 → 20,5 (+7,9%) | 9 → 10 | — | 26,5 | 25,1 (−5,1%) | 26,3 (−0,6%) | +3,6% / +7,6% / +10,0% |
| Bánh tráng trộn | 7 → 9 | 4 | [8, 4, 3, 4, 3, 3, 2, 4] = 31 | 31 → 31,5 (+1,6%) | 11 → 13 | — | 47,3 | 45,0 (−4,7%) | 46,5 (−1,6%) | −0,2% / +2,2% / +6,0% |
| Bánh tráng trộn Tây Ninh | 8 → 11 | 5 | [8, 4, 3, 4, 3, 3, 3, 2, 4] = 34 | 34 → 36 (+5,9%) | 13 → 16 | — | 51,1 | 52,0 (+1,7%) | 53,8 (+5,2%) | +5,8% / +10,6% / +15,6% |
| Cà phê sữa đá | 5 → 7 | 2 | [5, 3, 6, 2, 2, 2] = 20 | 20 → 21,5 (+7,5%) | 10 → 13 | — | 29,2 | 28,9 (−1,1%) | 30,4 (+4,0%) | +4,9% / +9,8% / +12,8% |
| Cà phê muối | 7 → 9 | 3 | [5, 3, 6, 2, 2, 2, 4, 2] = 26 | 26 → 27,5 (+5,8%) | 14 → 17 | — | 38,6 | 37,8 (−2,0%) | 39,6 (+2,6%) | +2,8% / +6,9% / +10,8% |
| Chè bưởi | 6 → 8 | 3 | [6, 3, 4, 3, 4, 5, 2] = 27 | 27 → 28 (+3,7%) | 11 → 13 | luoc | 35,5 | 36,2 (+2,0%) | 37,7 (+6,2%) | +7,4% / +10,8% / +14,6% |
| **Cộng / tệ nhất** | **54 → 71 (+31%)** | **27** | không đổi | **−2,3% … +8,3%** | | 2 bước như cũ | | **≤ +2,0%** | **≤ +6,2%** | **≤ +7,4% / ≤ +10,8% / ≤ +15,6%** (trần +20%) |

Trong ca thật (đơn, ghi chú, số phần, thẻ bước người mới ở mọi thao tác, thạo món như `startShift` sinh ra; ngày 4–15, tau 0,6 + gọn, lõi thật), giây mỗi dòng món 0.5.1 → 0.5.4: TB 35,9 → 35,0 (−2,6%), Giỏi 28,9 → 28,7 (−0,9%), Ẩu 26,8 → 27,1 (+1,0%); ô nặng nhất là Bánh mì ốp la 3 phần của Ẩu, +7,1% (`tom-tat-v3f-chinh.md`, bảng cuối).

Số thao tác tăng 31% mà thời gian gần như không đổi nhờ bốn việc: (1) trạm bỏ phụ phí giữa các thao tác (cũ 1,2 giây mỗi bước; mới 0,75 giây mỗi trạm + tau mỗi thao tác nối); (2) thao tác nhỏ ngắn lại (kéo theo nhịp 0,45 giây mỗi nhát thay vì ngắm 0,7 giây; bào thay thái sợi; vắt cả nắm); (3) nhịp chờ gọn (Q1); (4) mọi bước bày tự xong khi đủ; và bố trí một màn để chỉ xé còn lượt trượt vào. Trà tắc và bánh tráng còn nhanh hơn bản cũ, nên chúng gánh được thao tác "đặc trưng" mà vẫn dư.

---

## 4. Màn "Sơ chế buổi sáng"

### 4.1 Luồng

```
Sảnh Chuẩn bị (prep.js, sảnh mới của Đợt 3) ── "Mở hàng" (open-shift) ──┬─ [ngày ≥ 2, "Hỏi sơ chế mỗi sáng" bật, hôm nay chưa vào màn sáng,
                                                                       │   thực đơn có đồ sơ chế được, ctx.autoAllowed] ──▶ Sơ chế buổi sáng (morning.js)
                                                                       │                                                   ├─ "Bỏ qua" ───────────┐
   dải "Sơ chế sáng" trong tấm "Hôm nay" (prep-morning) ───────────────┼──────────────────────────────────────────────────▶ └─ "Mở hàng" ──────────┤
                                                                       └─ không ────────────────────────────────────────────────────────────────────┴─▶ startShift → Bán hàng
```

| Mục | Quy định |
|---|---|
| Mở khóa | Từ ngày game 2 (`BALANCE.morning.fromDay`); ngày 1 là ngày hướng dẫn, đi thẳng vào ca như hiện nay (nên `startNewGame` của e2e không đổi) |
| Chỗ chứa | **Thùng đá 2 ô (ngày 2–4), 3 ô (từ ngày 5)** cho đồ thay bước (loại A) và **1 hũ trên kệ nhà làm** cho đồ nhà làm (loại B): `BALANCE.morning.iceSlots: [[2, 2], [5, 3]]`, `jarSlots: [[2, 1]]` (mảng [từ ngày, số chỗ]). Hũ chỉ có đồ để làm khi thực đơn có bánh tráng trộn hoặc chè bưởi. Thêm chỗ (vd "Thùng đá lớn") là việc của M6, phải chạy lại khóa #17 |
| Màn trước ca (người dùng đã chốt) | Bấm "Mở hàng" ở sảnh thì vào màn sáng (khi đủ điều kiện ở sơ đồ). Chân dính có **"Bỏ qua"** (`morning-skip`, viền), **"Như hôm qua"** (`morning-again`, chỉ hiện khi hôm qua có làm) và **"Mở hàng"** (`morning-open`, đặc, ghi số chỗ đã dùng "3/4"). "Bỏ qua" và "Mở hàng" gọi đúng chuỗi cũ của `open-shift`: `startShift` → `appVersion` → âm `bell` → `saveNow` → `app.go('service')` (ở `5970a06`: `prep.js:345-352`; trên đĩa, sảnh WIP của Đợt 3: `prep.js:356-367`); riêng `startShift` chuyển hộp và tiền buổi sáng vào ca (mục 4.6). **Bỏ qua tốn đúng một chạm** |
| **Phối hợp với sảnh Chuẩn bị mới của Đợt 3** (đặc tả `m5/d3/sanh-dac-ta.md`, gói M-A) | (1) **Không** thêm ô thứ 8 vào lưới lối vào `prep-nav`: Đợt 3 khóa đúng 7 ô `.icon-tile`, bốn ô đầu cùng hàng, hai dải tour liền. (2) Lối vào lại màn sáng là **một dải trong tấm "Hôm nay"** (`section.prep-today.ps-board`, vị trí 10 của `.ps-body`), ngay dưới dòng dự báo: nút `prep-morning` cao ≥ 44px, chữ 14px (luật chữ của sảnh), hình thùng đá nhỏ, chữ "Sơ chế sáng · Thùng đá 0/3 · Hũ 0/1 ›"; đã làm thì "Sơ chế sáng · Thùng đá 3/3 · Hũ 1/1 · dùng tới hết ca"; ngày 1 không có dải. (3) Giữ nguyên `open-shift` trong `.sticky-foot.ps-foot`, mọi testid và export của `prep.js` mà đặc tả Đợt 3 liệt kê; gói P10 chỉ chèn một nhánh vào trình xử lý bấm: `shouldAutoShow(state, { ...ctx, autoAllowed })` đúng thì `app.go('morning')`, không thì chuỗi cũ. Khi màn sáng sẽ tự hiện, dòng nhỏ trong nút đổi từ "06:00 – 10:00 · khoảng N khách" thành "Sơ chế sáng rồi mở hàng · khoảng N khách". (4) Lựa chọn tốn tiền của sự kiện ngày (`day-event-choice-*`) vẫn chọn ở sảnh trước khi bấm Mở hàng; màn sáng **giữ lại** tiền đó (mục 4.6, ý 5). (5) Tour `chuan_bi` của Đợt 3 không đổi; tour `so_che_sang` chạy trên màn sáng. (6) Mọi dòng ở trên dò lại khi Đợt 3 phát hành (`prep.js`, `css/prep.css`, `summary.js`, `title.js` là tệp của Đợt 3) |
| **Quay về Chuẩn bị (v4)** | Màn sáng có nút quay về tròn 44px ở đầu màn (`morning-back`, mục 4.7). Trên PWA iOS không có nút Back hệ thống, nên đây là đường về duy nhất; đúng luật của Đợt 3 cho màn ngoài ca: "mỗi lối vào mở đúng màn, có nút quay lại" (`scratchpad/m5/d3/bkn-m5-dot3.js:104`). Về sảnh không mất gì: hộp, hũ, tiền đã chi giữ trong `state.morning`; `seen` đã ghi nên "Mở hàng" lần sau vào thẳng ca |
| Công tắc | Cài đặt → "Hỏi sơ chế mỗi sáng" (`settings.askPrep`, mặc định bật). Tắt thì "Mở hàng" vào thẳng ca; vẫn vào được qua dải `prep-morning` |
| Không lặp lại | Đã vào màn sáng trong ngày (`state.morning.seen === state.day`) thì "Mở hàng" vào thẳng ca |
| Thực đơn không có đồ sơ chế | (vd chỉ bán cà phê sữa đá) màn không hiện, dải `prep-morning` ẩn |
| Kiểm thử tự động | `shouldAutoShow(state, ctx)` ở lõi **thuần** nhận cờ `ctx.autoAllowed`; giao diện tính cờ bằng `morningAutoAllowed()` (cùng cách `autoAllowedNow` của `src/ui/components/tour.js:158-164`): sai khi `navigator.webdriver`, trừ khi URL có `?sang=1` trên localhost. Nhờ vậy các chỗ chạm `open-shift` trong e2e cũ giữ nguyên hành vi; `m54-so-che.e2e` dùng `?sang=1`. Test lõi chỉ truyền cờ; phần đọc `navigator` thử ở unit giao diện và e2e (phản biện vòng 2 #23) |
| Không bấm giờ | HUD hiện "Sáng sớm"; khách chưa đến, không ép chạy đua trước giờ bán |
| Lưu dở | `state.morning.draft`; tải lại trang giữa mẻ thì vào thẳng màn sáng, đúng thao tác dở (`main.js`, `title.js`: chưa có ca mà có `draft` thì vào `'morning'`; theo mẫu `rare.pendingStall`). `title.js` là tệp của Đợt 3: dò lại chỗ chèn |

### 4.2 Danh sách đồ sơ chế (`src/data/prep-items.js`, mới)

- **Loại A (thùng đá, thay bước):** trong ca, món có hộp bỏ qua đúng các thao tác trong cột "Thay" sau khi người chơi **bốc** hộp; điểm các thao tác đó lấy từ mẻ; hộp tốt cộng thêm "Sơ chế khéo" vào Q món (mục 4.3).
- **Loại B (kệ hũ nhà làm, "Vị nhà làm"):** việc quá lâu để làm trong ca (phi hành tỏi, nấu sa tế, rang giã đậu phộng, vắt nấu cốt dừa). Không thay thao tác nào. Không làm thì dùng "hàng mua sẵn" chất lượng chuẩn như bản cũ (nguyên liệu vẫn trừ ở bước Chọn, vì "nhà làm" thay "mua sẵn" cùng giá, **0đ** buổi sáng). Làm thì món dùng hũ được cộng **"Vị nhà làm"** vào Q món (mục 4.3). Hũ nằm trên **kệ riêng**, không giành ô thùng đá.
- **Một lượt = 4 phần.** Mẻ 8 phần chơi 2 lượt; lượt 2 trôi nhanh hơn 10% và giữ combo ("tay quen"). Tham số mỗi lượt là tham số 1 phần của bước công thức (hoặc của thao tác chỉ có ở mẻ sáng).
- **Giá mỗi phần (loại A) là bội 500đ** = `roundCost(Σ giá × qty của các nguyên liệu hộp lo × hệ số Phiếu Chợ Sớm)` (mục 4.6). Khi lấy từ hộp, giá vốn Chọn trừ đúng số này.
- **Là tệp chuỗi hiển thị** (thêm vào `DISPLAY_FILES` của `banned-words.test.mjs`), nên dùng khóa `sec` chứ **không** dùng `par`.

Bảng số chạy bằng `mo-phong-v3b/bang-do-v3.mjs` (`ket-qua-do-v3.md`, 3.000 mẻ mỗi ô); giây chơi gồm 3 giây chọn và đóng hộp; Q mẻ là mẻ 8, hệ số vùng 1,104, tay bình tĩnh (σ × 0,85, lỗi × 0,8), kim lửa sai số theo giây; "Thưởng" là thưởng cấp món trung bình mỗi món dùng hộp (mục 4.3).

| id | Tên | Loại | Nguyên liệu hộp lo (mỗi phần) | Chuỗi thao tác một lượt (4 phần) | Dùng cho | Thay | Giá mỗi phần (mẻ 4 / 8) | Giây chơi mẻ 4 / 8 (TB) [MH] | Q mẻ TB · Giỏi · Ẩu [MH] | Thưởng TB · Giỏi · Ẩu [MH] |
|---|---|---|---|---|---|---|---|---|---|---|
| `rau_banh_mi` | Rau bánh mì | A | dưa leo 1, hành lá 1 | rửa dưa leo (`cha`, spots 2) → cắt thanh dưa leo (`thai` thanh, cuts 2) → **cắt khúc hành lá** (`thai` kéo theo nhịp, cuts 2) | 2 món bánh mì | `rua_dua`, `thai_dua` (hành lá rắc theo lúc kẹp, trừ khi dòng có ghi chú "Không hành") | 1.000đ (4.000 / 8.000đ) | 9,8 / 16,1 | 92,4 · 96,8 · 84,6 | 2,1 · 2,9 · 0,7 |
| `tac_cat` | Tắc cắt đôi, bỏ hạt | A | tắc 3 | cắt đôi 3 quả (`thai` ngắm, cuts 3) → khều hạt (`nhat` hat, n 3) | 2 món trà tắc | `thai_tac`, `nhat_hat` | 1.000đ (4.000 / 8.000đ) | 8,9 / 14,3 | 89,3 · 95,9 · 74,5 | 1,5 · 2,6 · 0,3 |
| `banh_trang_soi` | Bánh tráng cắt sợi | A | bánh tráng 1 | cắt bằng kéo (`thai` kéo theo nhịp, cuts 4) | 2 món bánh tráng | `cat_banh_trang` | 1.500đ (6.000 / 12.000đ) | 5,8 / 8,3 | 85,9 · 94,7 · 71,5 | 1,1 · 2,5 · 0,2 |
| `xoai_bao` | Xoài bào sợi | A | xoài xanh 1 | gọt (`got`, strips 4) → bào (`bao`, strokes 6, vùng "Đủ") | 2 món bánh tráng | `got_xoai`, `thai_xoai` | 2.000đ (8.000 / 16.000đ) | 10,0 / 16,4 | 93,9 · 97,8 · 84,4 | 2,3 · 2,9 · 0,9 |
| `trung_cut_boc` | Trứng cút luộc, bóc sẵn | A | trứng cút 3 | luộc (`lua` luoc) → **ngâm nước đá** (`lua` ngam) → **lắc hộp cho nứt vỏ** (`lac` hop, strokes 4) → bóc (`cha` boc, spots 3, bỏ nhịp gõ) | 2 món bánh tráng | `boc_trung_cut` (điểm = trung bình 4 thao tác) | 1.000đ (4.000 / 8.000đ) | 13,5 / 23,1 | 92,6 · 96,8 · 85,0 | 2,1 · 2,9 · 0,9 |
| `kho_bo_xe` | Khô bò xé sợi | A | khô bò 1 | xé dọc thớ (`xe`, strands 3) | Bánh tráng trộn | `xe_kho_bo` | 1.500đ (6.000 / 12.000đ) | 6,1 / 8,9 | 99,2 · 99,6 · 96,6 | 2,9 · 3,0 · 2,6 |
| `cui_buoi_nau_san` | Cùi bưởi nấu sẵn | A | vỏ bưởi 1, muối 1, bột năng 1 | gọt → cắt hạt lựu (hai lượt) → bóp muối → vắt ráo → áo bột → **luộc (chí mạng của mẻ)** → **ngâm nước đá cho giòn** | Chè bưởi | `got_vo`, `thai_cui`, `bop_muoi`, `vat_rao`, `ao_bot`, `luoc` (điểm `luoc` = **điểm luộc**; ngâm chỉ vào Q mẻ) | 2.000đ (8.000 / 16.000đ) | 25,1 / 45,2 | 93,6 · 97,8 · 85,8 (mẻ hỏng 1,1% ở TB) | 2,3 · 3,0 · 0,8 |
| `sua_muoi` | Sữa muối đánh sẵn | A | muối 1 | đánh cho sánh (`xoay` chen, vùng, chỉ chấm thiếu) | Cà phê muối | `danh_sua_muoi` | **0đ** (muối 100đ làm tròn về 0) | 8,5 / 13,4 | 99,8 · 100 · 97,2 | 3,0 · 3,0 · 2,6 |
| `hanh_toi_phi` | **Hành tỏi phi nhà làm** | B | — | bóc hành tím (`cha` boc) → **thái lát mỏng** (`thai` dao theo nhịp, cuts 5) → **đập dập tỏi** (`dap_dap` dao, n 2) → **băm nhỏ tỏi** (`bam`, hits 8, vùng "Nhỏ") → **phi** (`lua` phi, dư nhiệt 0,10: "Vừa ngả vàng là tắt bếp") | 2 món bánh tráng (thay dầu hành mua sẵn) | — | 0đ | 18,2 / 32,1 | 88,3 · 94,7 · 77,0 | 2,6 · 3,6 · 1,3 |
| `sa_te_nha` | Sa tế nhà làm | B | — | **chặt khúc sả** (`chat` sa, cuts 2, HB) → **băm nhuyễn** sả, ớt (`bam`, hits 10, vùng "Nhuyễn") → phi (`lua` phi, dư nhiệt 0,08) | 2 món bánh tráng (khi dòng có sa tế) | — | 0đ | 13,7 / 23,4 | 85,6 · 94,0 · 70,7 | 2,3 · 3,5 · 0,8 |
| `dau_phong_gia` | Đậu phộng rang giã | B | — | **rang** (`lua` rang, dư nhiệt 0,05) → xát vỏ lụa (`cha` xat, strokes 6) → **giã dập** (`gia` coi, hits 6, vùng "Dập") | 2 món bánh tráng | — | 0đ | 13,3 / 22,6 | 89,7 · 95,8 · 79,2 | 2,9 · 3,7 · 1,6 |
| `cot_dua_nha` | Nước cốt dừa nhà vắt | B | — | **bổ dừa** (`chat` dua: gõ sống dao 3 nhát quanh giữa trái) → **nạo** (`bao` nao, strokes 6, vuốt theo cung) → vắt (`vat` vai, n 2) → nấu sánh (`lua` noi) | Chè bưởi | — | 0đ | 17,0 / 29,7 | 89,1 · 96,0 · 75,5 | 2,7 · 3,8 · 1,1 |

Ghi chú:
- **Phương thức người dùng nêu tên nằm ở đâu.** **Thái lát**: hành tím ở mẻ Hành tỏi phi (cách đúng, dao theo nhịp); trong ca "Thái lát" và "Thái sợi" là cách sai của dưa leo, xoài, cùi bưởi (người dùng chốt đổi cách đúng ở Q2). **Cắt thanh, hạt lựu, kéo theo nhịp, rạch**: trong ca. **Băm**: Hành tỏi phi (tỏi), Sa tế (sả, ớt). **Chặt**: Sa tế (khúc sả, HB); bổ dừa ở Nước cốt dừa là lớp vỏ của chặt. **Đập dập**: Hành tỏi phi (tỏi), Tây Ninh trong ca (khô mực gói giấy). **Giã**: Đậu phộng. **Nạo**: Nước cốt dừa. **Bào**: xoài (trong ca và ở mẻ). **Xé**: khô bò, khô mực. **Ngâm**: trứng cút (nhiệm vụ ngày "Trứng cút luộc, ngâm nước đá", mục 4.9), cùi bưởi (ngày chè bưởi). **Hạt lựu**: cùi bưởi, chỉ ở chè bưởi (món sự kiện 20/11). **Thái sợi** (cách đúng): không còn ở Chặng 1 vì Q2 đổi xoài sang bào sợi; "Thái sợi" chỉ là lựa chọn sai trên bảng chọn cách, có Mẹo nghề giải thích. **Phi, rang**: Hành tỏi phi, Sa tế, Đậu phộng. Tần suất gặp theo từng cách chơi ở mục 5.6 và câu Q4 (mục 10.2 ghi rõ cho người dùng).
- **Thao tác phải làm tươi** (không đồ nào thay được, khóa bằng test): `dap_trung`, `chien_trung`, `nuong_banh_mi`, `xe_banh`, `kep_banh`, `nem`, `vat_tac`, `rot_tra`, `nem_duong`, `rot_mat_ong`, `lac`, `rot_dau_hanh`, `nhat_rau_ram`, `tron`, `nuong_kho_muc`, `dap_kho_muc`, `xe_kho_muc`, `u_bot`, `nen_phin`, `rot_nuoc`, `u_phin`, `them_sua`, `them_da`, `khuay`, `rot_sua_muoi`, `muc_ly`, `rot_cot_dua`. Lý do: vắt sẵn thì đắng, trộn để lâu bánh xẹp, phin pha tại chỗ, chiên ăn nóng (`am-thuc.md` mục 3.1); khô mực là hàng hiếm trừ kho lúc Ra món.
- **Không có ở 0.5.4, có lý do:** **đồ chua nhà làm, tỏi băm thành hộp riêng** (người dùng chốt để Chặng 2; thiết kế giữ ở mục 4.12); trà ủ, nước đường (nền không có bước trong ca); cà phê cốt pha sẵn (mất nét canh phin, cà phê pha sẵn mất hương [24]); khô mực nướng xé (cần luật trừ kho hàng hiếm lúc làm mẻ); rau răm nhặt sẵn (lợi quá nhỏ cho một ô). Chặng 2 để dành (`am-thuc.md` mục 6): `do_chua_nha`, `toi_bam` (sống, cho nước mắm), `mo_hanh`, `thit_uop_sa`, `nuoc_mam_chua_ngot`, `dau_xanh_hap`.

### 4.3 Điểm sơ chế → chất lượng món

1. **Điểm của mẻ.** Mỗi thao tác trong chuỗi chấm bằng đúng hàm chấm thuần của loại đó, có `zoneMul` như trong ca nhưng **không quá giờ**. Mẻ 2 lượt: điểm thao tác là trung bình 2 lượt. `Q_mẻ` = trung bình các thao tác, ghi lên nhãn hộp ("Tốt 86").
2. **Loại A: điểm bước bị thay = điểm của chính thao tác đó trong mẻ** (không dùng `Q_mẻ` chung, **không trần**). Ví dụ hộp Rau bánh mì [rửa 100, cắt thanh 84, cắt hành 91] thì `rua_dua` = 100, `thai_dua` = 84 (cắt hành chỉ vào `Q_mẻ`). `opFor` cho phép một bước lấy trung bình nhiều thao tác: `boc_trung_cut` = trung bình (luộc, ngâm, lắc, bóc). **`luoc` của chè bưởi = điểm luộc**; ngâm nước đá chỉ vào `Q_mẻ` (như cắt hành ở hộp Rau bánh mì). Nhờ vậy luật mẻ hỏng (luộc < 50) và điểm bước chí mạng là **một số**: hộp nhãn "Tốt" không bao giờ làm món Hỏng (phản biện vòng 2 #15).
3. **Thưởng "Sơ chế khéo" (loại A, mới ở v3).** Mỗi hộp A đã **bốc** cho dòng món: `Q_mẻ` ≥ 85 → **+1**, ≥ 90 → **+2**, ≥ 95 → **+3** vào **Q món** (`BALANCE.morning.boxBonus: [[95, 3], [90, 2], [85, 1]]`). Cộng sau trung bình có trọng số, **trước** lỗi nguyên liệu (nên lỗi bẫy vẫn kẹp Q ≤ 60); không cộng khi bước chí mạng hỏng; không đổi Không tì vết. Đây là phần "sơ chế khéo thì món ngon hơn" người dùng chốt ở yêu cầu 2: mẻ khéo cho món ngon hơn cả khi người chơi làm tay đều tay.
4. **"Vị nhà làm" (loại B).** Dòng món dùng hũ: `Q_mẻ` ≥ 70 → **+1**, ≥ 80 → **+2**, ≥ 88 → **+3**, ≥ 95 → **+4** vào Q món (`BALANCE.morning.jarBonus: [[95, 4], [88, 3], [80, 2], [70, 1]]`), cùng luật cộng như ý 3. Ghi chú bỏ đúng nguyên liệu của hũ (vd "Không cay" bỏ sa tế) thì không cộng và không trừ phần hũ. Thay cho "cộng điểm vào một thao tác" của bản v2 (Q món chỉ tăng +0,4 … +1,2, người chơi không thấy — phản biện vòng 2 #2).
5. **Trần.** Tổng thưởng cấp món của một dòng ≤ **+5** (`BALANCE.morning.dishBonusMax`); Q kẹp 100. Một dòng bánh tráng trộn có 3 hộp và 1 hũ vẫn chỉ +5.
6. **Mẻ do phụ bếp M6 làm:** mỗi thao tác trần 88 (luật "Ra tay"), hộp mang `staff: true`; thưởng tính theo `Q_mẻ` đã trần (tối đa +1 cho hộp, +3 cho hũ); món có bước lấy từ hộp `staff` không được Không tì vết (như Tự làm).
7. **Thao tác lấy từ hộp không phải Tự làm** (`auto: false`), nên vẫn tính Không tì vết; **không làm lại được** (`retryStep` trả `khong_lam_lai`).
8. **Hiện rõ cho người chơi** (bài học "đồ sáng biến mất", `thao-tac.md` ⟨1⟩): ô trạm "Có sẵn · Tốt 92 · Bốc" viền màu hạng; lúc bốc, viên "+2 sơ chế khéo" nảy trên ô trạm; **màn Ra món** (`dish-reveal`) có hàng tem nhỏ dưới hạng món: "Sơ chế khéo +2 · Vị nhà làm +3" và "Không tì vết (trượt nhẹ: Khều hạt 87)"; phiếu chấm **không thêm hàng**, chỉ thêm một tem nhỏ trên hàng Bếp (mục 7.2; phản biện vòng 2 #24).
9. **Mẻ hỏng:** chỉ `cui_buoi_nau_san` có thao tác chí mạng (luộc). Luộc < 50 ở lượt nào thì mẻ hỏng: hộp nhãn đỏ "Hỏng", không dùng được; người chơi chọn "Làm lại" (trả tiền lần nữa) hoặc "Đổ bỏ". Tiền của mẻ hỏng vào `state.morning.lost` (mục 4.6). Các mẻ khác không hỏng, chỉ thấp điểm.
10. **Kết quả trong ca** (ghi lúc **bốc**, mục 4.5) là `{ score, grade, method: cách đúng, auto: false, retried: false, tag: null, prepped: '<id hộp>' }`; **không** đi nhánh `bo_qua` / `skipped` (bị tính lỗi vệ sinh, `kitchen.js:481, 493`, `day-events.js:189`), không mở thẻ `chua_rua`.

### 4.4 Hạn dùng

- Hộp và hũ chỉ dùng cho **ca của chính ngày đó** (`state.morning.day === state.day`), đúng chốt của người dùng. Ngày chỉ sang khi ca kết thúc (`shift.js:379`), nên không có hộp "qua đêm".
- `endShift` gọi `expireMorning` **trước** `summarizeShift`: phần loại A còn lại thành **hao hụt**; hũ nhà làm còn lại bỏ (0đ). Phiếu Tổng kết có dòng "Sơ chế sáng: chi 15.000đ · dùng 10 phần (10.000đ vào giá vốn) · bỏ 5.000đ"; lần đầu có phần bỏ mở Mẹo nghề `so_che_fifo` ("Làm vừa đủ bán. Đồ sơ chế dán giờ, cái nào làm trước dùng trước.").
- Không có vòng giờ hay độ tươi giảm dần trong ca: hạn là "hết ca" (thực tế: đồ chín không để ngoài trời quá 2 giờ, `am-thuc.md` [22]; đồ khô như hành phi để được nhiều ngày [16][18], nhưng giữ luật "trong ngày" theo chốt của người dùng).

### 4.5 Trong ca: giữ phần, bốc hộp, hết hộp

1. **Bước Chọn: giữ phần.** Ô kệ của nguyên liệu có hộp mang **huy hiệu hộp** góc trên ("Hộp · 5", 13px). Chọn như thường (bẫy vẫn giữ). Lúc chốt (`submitChon`), với mỗi hộp A của món: nếu dòng có chọn nguyên liệu chính của hộp và hộp còn ≥ `qty` phần thì **giữ** `qty` phần (`left −= qty`, `sh.morning.boxes[k].used += qty`), giá vốn trừ `qty × p` (mục 4.6), ghi `cook.boxUse = [{ box, portions, value, tram, taken: false }]`. **Lõi không điền bước ở đây**: các bước của trạm có hộp vẫn chưa xong. Với hũ B: trừ `qty` phần, ghi `used`, cộng "Vị nhà làm" vào `cook.dishBonus` ngay (hũ không có ô trên Thớt). Quên chọn nguyên liệu đó thì hộp không bị trừ, lỗi nguyên liệu như cũ.
2. **Bốc hộp: một chạm, bắt buộc** (hàm lõi mới **`takeBox(state, tramId, ctx)`**; phản biện vòng 2 #10). Ô trạm có phần đã giữ hiện **"Có sẵn · Tốt 92 · Bốc"** (cả ô là vùng chạm ≥ 48px). Chạm thì tay bốc một nhúm từ hộp vào ô trạm (600 ms, âm `lid`, chặn đúng ô đó, các ô khác vẫn chạm được); khi đó **lõi** mới điền `cook.steps[id]` từ hộp cho mọi bước của trạm có trong `replaces` (mục 4.3 ý 2), phát `step.done { prepped }` (mục 4.9), cộng "Sơ chế khéo" vào `cook.dishBonus`, đặt `boxUse.taken = true`. Ô thành "Xong · Tốt 92", nắp hộp có dấu ✓. Mô phỏng tính **1,0 giây** mỗi lần bốc. Trạm có cả phần hộp lẫn phần làm tay (Tắc: cắt và khều từ hộp, vắt làm tay): chạm trạm là bốc rồi chơi luôn phần làm tay trong cùng một lần chạm.
3. **Chưa bốc thì chưa xong.** Trước khi bốc, `availableSteps` coi các bước đó là chưa làm, nên `after` của bước phụ thuộc vẫn khóa (vd `kep_banh` chờ `thai_dua`; ô "Ổ bánh" ghi "Chờ: Bốc Dưa leo") và "Ra món" vẫn hỏi "Còn n bước chưa làm, mỗi bước tính 0 điểm" như cũ (`ui/screens/kitchen.js:1196-1203` ở `5970a06`); nếu người chơi vẫn ra món thì bước chưa bốc tính như bước bỏ (`bo_qua`), không có thưởng, và phần đã giữ thành hao hụt (`finishDish` ghi `wasted`). Không có đường tắt nào điền bước từ hộp ngoài `takeBox` (test ở `m54-kitchen`, `m54-bep`).
4. **Ghi chú vá tham số của chính bước có hộp** (vd "Thêm trứng cút" vá `boc_trung_cut.spots` 3 → 5): bước đó làm tay (phải bóc thêm), không giữ phần hộp đó. Hộp khác của món vẫn dùng.
5. **Hộp không đủ cho cả dòng** (còn 1 phần, đơn 2 phần): dòng đó **làm tay**, hộp để dành cho món sau; một dòng 13px "Hộp còn 1, đơn 2 phần: làm tay nha!".
6. **Hết hộp** (về 0): thông báo một lần "Hết tắc cắt sẵn rồi, từ giờ cắt tay nha!"; thao tác hiện lại như thường ở món sau.
7. **Nấu thử** không dùng hộp. **Món hiếm** dùng hộp như món nền nếu có trong cột "Dùng cho".
8. **Bỏ món** (`abandonDish`): phần đã **bốc** không trả lại và ghi `sh.morning.boxes[k].wasted += portions` (tính vào hao hụt, đúng như `abandonDish` chuyển giá vốn sang hao hụt); phần mới **giữ, chưa bốc** thì trả lại hộp (`left += portions`, `used −= portions`) vì đồ chưa rời hộp. Số này ghi ngay vào cấu trúc bền của ca, **không** dựa vào `cook.boxUse` (phiên nấu bị xóa ở `kitchen.js:545` khi bỏ món và `:684` khi giao món; phản biện vòng 2 #14).

### 4.6 Tiền (bội 500đ, sổ ca khớp ví)

Bất biến phải giữ: **Tiền quán luôn là bội 500đ** (`money.js:115` `roundCost`; test ví % 500 ở `m4-frequency:377`, `m4-incidents:528`, `m4-save:115`) và **"ví sau ca − ví đầu ca = lãi − trả nợ"**.

1. **Giá mỗi phần của hộp loại A** `p = roundCost(raw × m)`: raw = Σ giá × qty (theo công thức đầu tiên trong cột "Dùng cho") của các nguyên liệu hộp lo; m = hệ số Phiếu Chợ Sớm của ngày. Giá mẻ = size × p, là bội 500đ. Đồ nhà làm: 0đ. Giá tính và **chốt lúc bấm "Làm"**, lưu vào hộp (`box.p`).
2. **Giá vốn Chọn khi dòng dùng hộp A** = (giá vốn tính như không có hộp, gồm cả phần tăng giá của sự kiện đã qua trần) − `qty × box.p`, kẹp ≥ 0. Cả hai số hạng là bội 500đ nên kết quả là bội 500đ. Hệ quả: **dùng hết mẻ thì tổng tiền (sáng + trong ca) bằng đúng khi không sơ chế**; mỗi phần bỏ thừa tốn đúng `p`. Ví dụ bánh mì ốp la 1 phần: không hộp 9.000đ; có hộp: sáng 1.000đ + Chọn 8.000đ = 9.000đ.
3. **Phiếu Chợ Sớm.** Hàm thuần mới `previewDayMods(state, ctx)` (`events.js`) đọc đúng điều kiện của `prepareShiftMods` (`state.prep.coupon` bật và còn phiếu) **mà không tiêu phiếu**, trả `cogsMul`. Làm mẻ khi phiếu đang bật thì giá mẻ được giảm và phiếu bị **khóa bật** cho tới khi mở ca (`state.prep.couponLocked`, công tắc phiếu ở sảnh mờ kèm chữ "Đã dùng cho mẻ sáng"); `startShift` tiêu phiếu như cũ.
4. **Sự kiện tăng giá nguyên liệu** (`ingCostMul`, vd "Tắc lên giá ×2"): mẻ sáng tính giá thường; phần tăng giá vẫn tính ở bước Chọn trên **toàn bộ** nguyên liệu (kể cả phần hộp lo), có trần như cũ. Nên **không né được** ngày tắc ×2 bằng hộp Tắc cắt đôi.
5. **Giữ tiền cho lựa chọn sự kiện ngày** (phản biện vòng 2 #16). Lựa chọn tốn tiền (10.000–20.000đ, `day-events.js`) được chọn ở sảnh nhưng chỉ trả ở `startShift` (`events.js:515`, `economy.js:251-255` trả false khi thiếu tiền và **bỏ lựa chọn không báo**). `previewDayMods` trả thêm **`choiceCost`** (giá lựa chọn đã chọn, chưa trả; 0 nếu miễn phí hoặc không chọn). `startBatch` từ chối với lý do **`giu_tien_lua_chon`** khi `ví − giá mẻ < choiceCost`; nút cỡ mẻ mờ kèm chữ 13px "Giữ 20.000đ cho Căng bạt". Nhờ vậy màn sáng không bao giờ làm mất lựa chọn đã chọn.
6. **Sổ buổi sáng.** Trước ca chưa có `state.shift.ledger`, và `spend` của `kitchen.js:135-139` không export, nên `morning.js` có hàm riêng: `payMorning(state, amount, why)` (trừ ví, cộng `state.morning.spent`), `refundMorning(state, amount)` (bỏ mẻ trước khi chơi thao tác đầu: hoàn tiền), `loseMorning(state, amount, why)` (cộng `state.morning.lost` khi mẻ hỏng, đổ bỏ, hoặc bỏ dở sau khi đã chơi). Thiếu tiền thì nút cỡ mẻ mờ, ghi "Thiếu tiền".
7. **`startShift`:** `sh.morning = { boxes (mỗi hộp thêm used: 0, wasted: 0), spent, lost }`, `sh.ledger.morning = spent`, `walletStart = ví + spent` (tiền sơ chế thuộc về ca này), rồi xóa `state.morning.boxes`, `spent`, `lost` (giữ `last`).
8. **`expireMorning(state, sh, ctx)`** (gọi trong `endShift` trước `summarizeShift`): `usedValue = Σ (used − wasted) × p` → **giá vốn**; `wasteValue = spent − usedValue` (phần thừa, phần của món bị bỏ sau khi bốc, phần giữ mà ra món chưa bốc, mẻ hỏng / đổ bỏ / bỏ dở) → **hao hụt**; hai dòng cộng lại **bằng đúng** `spent`. Tổng kết hiện một dòng riêng "Sơ chế sáng".
9. **Hủy ca dở** khi nạp save (`shiftUsable` false): hoàn cả `sh.ledger.morning`, mở rộng `droppedEventRefund` (`save.js:303, 395`). **`state.morning.day ≠ state.day`** lúc nạp (chỉ khi save lạ): hoàn `spent` (bội 500đ) rồi bỏ hộp và nháp.
10. **Test bất biến** (`m54-morning`): ví % 500 sau mọi nhánh — có hộp, có / không Phiếu Chợ Sớm (bật trước / sau khi làm mẻ), ngày tắc ×2, **bỏ món sau khi bốc hộp**, **bỏ món khi đã giữ mà chưa bốc** (trả lại hộp), mẻ hỏng, đổ bỏ, bỏ dở, hủy ca dở, nạp save lệch ngày, **có lựa chọn sự kiện 20.000đ và ví sát** (mẻ bị từ chối `giu_tien_lua_chon`, lựa chọn vẫn được trả lúc mở ca); và "ví sau ca − ví đầu ca = lãi − trả nợ" ở cùng các nhánh; dùng hết mẻ thì lãi ca bằng đúng không sơ chế.

### 4.7 Giao diện màn sáng (vừa một màn, không cuộn)

Màn sáng là màn đầy đủ (như sảnh), không có HUD và thanh tab của Ca bán. Chiều cao dùng được **U** = cao − an toàn trên − an toàn dưới (`vua-man/dac-ta.md` bảng 3.1): 402×874 app **778**; Safari 402×680 **680**; 375×667 **667**; 320×568 **568**; **375×553 (SE + Safari, bậc xs) 472**. Để chắc, mỗi bậc còn so với ngân sách "A" chặt hơn của Ca bán (682 / 580 / 567 / 468 / 376).

| Vùng | Cao l / m / s / xs (px) | Nội dung |
|---|---|---|
| Đầu | 56 / 52 / 48 / 44 | Trời rạng sáng (nền phẳng, không ảnh). Trái sang phải: **nút quay về Chuẩn bị** (v4: tròn 44×44, cùng kiểu `g-back-meta` của thanh đầu `screenHead` Đợt 3, biểu tượng ‹, `aria-label` "Về Chuẩn bị", testid `morning-back`), "Sáng sớm · Ngày 6" (s: "Sáng · Ngày 6"), ví gỗ, nút ?. Ở xs: "Ngày 6 · 8 khách" (dòng dự báo ẩn). Bề ngang ở 320px: nút 44 + ví 80 + nút ? 44 + 3 khe 8 = 192, còn 96px cho "Sáng · Ngày 6" (14px, khoảng 90px). Nút nằm trong hàng sẵn có nên **bảng chiều cao không đổi** |
| Dự báo | 36 / 32 / 32 / 0 | Một dòng 13–14px lấy từ tấm "Hôm nay" của sảnh: "Dự kiến 8 khách · bán chạy: Trà tắc" |
| Thùng đá + kệ hũ | 120 / 108 / 96 / 84 | Thùng đá xe đẩy (`thung_da`) **3 ô** (ngày 2–4 ô thứ 3 vẽ khóa "Từ ngày 5") và kệ gỗ **1 hũ**, cùng một hàng 4 ô: ô 84×110 (l), 78×100 (m), 66×88 (s, rộng 4 × 66 + 3 × 6 = 282 ≤ 288), 76×76 (xs). Ô trống: bóng mờ đồ được gợi ý + "Trống". Ô đầy: hộp trong suốt (`hop_so_che`) hoặc hũ thủy tinh (`hu_nha_lam`) chứa hình trạng thái đồ, mức đầy 4 nấc (cắt CSS), nhãn giấy chéo "Tốt 86", số "8/8". Chạm ô đầy mở thẻ nhỏ: điểm từng thao tác, nút "Đổ bỏ" (có hỏi lại). **Lời Dì Sáu** (gợi ý theo ngày, ≤ 60 ký tự, 13px) là bong bóng **chồng lên** góc trên phải vùng này ở l / m, chạm để tắt; ở s, xs **ẩn**, đọc lại qua nút ? |
| Viên món | 44 | Hàng viên chọn món hôm nay ("Bánh mì · Trà tắc · Bánh tráng"), mỗi viên ≥ 44px; món không có đồ sơ chế thì mờ |
| Lưới đồ | phần còn lại (≥ 200 / 180 / 150 / 128) | Đồ của món đang chọn, **lưới 2 cột**, thẻ 72px (s: 64, xs: 60): hình 44 (xs 40), tên 14px đậm, dòng 13px "Thay: rửa, cắt · 1.000đ/phần" hoặc viên "Nhà làm". Tối đa 4 thẻ một trang; bánh tráng có 4 A + 3 B = 7 thẻ → 2 trang chấm, chuyển bằng vuốt ngang hoặc nút ‹ › 44px; **không cuộn dọc** |
| Chân dính | 64 / 60 / 56 / 52 | Ba nút một hàng: "Bỏ qua" (viền) · "Như hôm qua" (viền, biểu tượng ↺, chỉ hiện khi hôm qua có làm; không có thì hai nút còn lại giãn ra) · "Mở hàng" (đặc, "3/4"). Ở 320px mỗi nút ≥ 92×44px, chữ 13px |

Tổng tối thiểu (cộng khe): **l** 56 + 36 + 120 + 44 + 200 + 64 + 24 = 544 ≤ 778 (và ≤ 682); **m** 52 + 32 + 108 + 44 + 180 + 60 + 20 = 496 ≤ 680 (và ≤ 580); 375×667 như m: 496 ≤ 667 (và ≤ 567); **s** 320×568: 48 + 32 + 96 + 44 + 150 + 56 + 16 = 442 ≤ 568 (và ≤ 468); **xs** 375×553: 44 + 0 + 84 + 44 + 128 + 52 + 12 = 364 ≤ 472 (và ≤ 376). Lưới đồ ở xs thật sự được 472 − 224 − 12 = 236px ≥ 2 × 60 + 8.

**Làm một mẻ:**
1. Chạm thẻ đồ → tấm đáy nhỏ (≤ 55% chiều cao): hình hộp, chuỗi thao tác bằng biểu tượng ("Rửa → Cắt thanh → Cắt hành"), viên **cỡ mẻ 4 / 8** (`morning-size-4`, `morning-size-8`, 44px) kèm giá, "khoảng 10 giây", gợi ý "Nên 8 phần" khi dự báo món ≥ 5 phần, nút "Làm" (`morning-make`). Thiếu tiền hoặc phải giữ tiền cho lựa chọn sự kiện thì viên mờ kèm lý do (mục 4.6).
2. Sân khấu phủ màn như sân khấu bếp, chạy **`playTram` với `ctx.untimed` và `ctx.batch`**: cùng plugin, cùng thước, cùng tay mẫu; đầu sân khấu "Mẻ Rau bánh mì · Lượt 1/2"; lượt 2 nguyên liệu mới trượt vào, giữ combo. Ở xs sân khấu dùng đầu gọn và chân 44px như sân khấu bếp (mục 7.2).
3. Xong mẻ: nắp hộp đóng "tách" (âm `lid`), nhãn giấy đập xuống (con dấu nhỏ 200 ms, âm `stamp`) ghi hạng và giờ (05:xx), hộp bay vào ô trống, nảy một lần. Giảm chuyển động: hộp hiện thẳng trong ô.
4. **"Như hôm qua"**: xếp sẵn đúng đồ và cỡ mẻ hôm qua vào hàng chờ (bỏ đồ của món không bán hôm nay, bỏ đồ vượt số ô hôm nay), trừ tiền từng mẻ khi bắt đầu mẻ đó; vẫn phải chơi từng mẻ. Mục đích: buổi sáng là thói quen khoảng 30–45 giây, không phải việc vặt chọn đi chọn lại.
5. **Quay về Chuẩn bị (v4; kiểm cuối #9).** Chạm `morning-back` thì `app.go('prep')`. Hộp đã làm, hũ, tiền đã chi giữ nguyên trong `state.morning`; `state.morning.seen = state.day` đã ghi lúc vào màn, nên "Mở hàng" lần sau vào thẳng ca và mang theo hộp; muốn làm thêm mẻ thì vào lại bằng dải `prep-morning` (dải ghi "Thùng đá 2/3 · Hũ 1/1"). Khi sân khấu một mẻ đang mở thì nút ẩn: sân khấu có nút "Bỏ mẻ" ở chân (gọi `cancelBatch`, hoàn tiền nếu chưa chơi thao tác đầu, mục 4.6 ý 6); nháp mẻ dở vẫn lưu như mọi lúc. Ở sảnh, công tắc Phiếu Chợ Sớm hiện mờ kèm "Đã dùng cho mẻ sáng" nếu mẻ đã hưởng phiếu (mục 4.6 ý 3).

**Trong ca, dải hộp trên Thớt** cao 36px (s, xs: thu vào hàng tiêu đề "Thớt sơ chế"), chỉ hiện khi ca có hộp hoặc hũ: biểu tượng 28px + số phần còn (`box-<id>[data-left]`); hộp vừa dùng thì nảy; còn 1 phần thì viền nhấp nháy chậm (≤ 2 lần/giây; giảm chuyển động chỉ đổi màu viền).

### 4.8 Tour Dì Sáu, Mẹo nghề, Cách chơi, thư

- **Tour `so_che_sang`** (lần đầu vào màn, ngày 2), 3 bước (mỗi câu ≤ 170 ký tự, ≤ 2 câu):
  1. Thùng đá và kệ hũ — "Người bán thiệt làm sẵn từ sáng: cắt dưa leo, bổ tắc, bào xoài, phi hành. Thùng đá giữ đồ cắt sẵn, hũ trên kệ là đồ nhà làm."
  2. Lưới đồ — "Chạm một món đồ, chọn mẻ 4 hay 8 phần rồi làm. Tiền nguyên liệu trả luôn bây giờ, làm khéo thì món ngon hơn."
  3. Chân dính — "Đồ sơ chế chỉ dùng trong ngày, dư là bỏ, nên làm vừa đủ thôi con. Không kịp thì cứ bấm Bỏ qua."
- **Tour `bep_hop`** (lần đầu Thớt có hộp), 1 bước, đích `board-tram-*[data-state="san"]`: "Mấy việc này con làm từ sáng rồi, chạm Bốc là xong. Hết hộp thì làm tay như thường."
- **Tour `bep_tram`** (lần đầu gặp Thớt theo trạm, kể cả người chơi cũ), 1 bước: "Chạm một trạm là làm liền tay các việc của trạm đó, xong cả trạm mới đóng dấu."
- **Sửa tour `bep_thot`** (`src/data/tours.js:179-189` ở `5970a06`; phản biện vòng 2 #20). Bước `board`: "Mỗi ô trên thớt là một trạm, gom các việc làm cùng chỗ. Trạm có ổ khóa thì chờ trạm ghi bên dưới xong." Bước "Trò nhỏ" đổi đích sang `board-tram-*[data-state="mo"]` (dự phòng `board-step-*`): "Chạm trạm là làm liền tay các việc của trạm: cắt, bào, xé, vắt, khều hạt, canh lửa, rót… Xong cả trạm dì mới đóng dấu." **Bước "Chọn cách sơ chế"** (`tours.js:186`; v4, kiểm cuối #6): đích cũ `.k-step.has-method` không còn ở board mới vì bảng chọn cách hiện trước khi vào trạm, nên tour lặng lẽ bỏ qua bước này. Đổi đích sang `board-tram-*[data-method="1"]:not([data-state="xong"])` (ô trạm có bước chọn cách chưa làm, mục 7.1), dự phòng `.k-step.has-method` cho board cũ: "Trạm có dấu bút thì phải chọn cách sơ chế trước khi làm, như cắt thanh hay thái lát. Chọn sai cách là bị trừ điểm." `tour.e2e` thêm ca: bánh mì ốp la, board mới, bước này hiện và trỏ đúng ô "Dưa leo".
- **Sửa trang Cách chơi `bep`** (`tours.js:326-328`): "Mở phiếu, chọn dòng món, lấy đúng nguyên liệu trên kệ (coi chừng bẫy na ná nhau). Lên Thớt chạm từng trạm để làm liền tay các việc của trạm (trạm có ổ khóa thì chờ). Việc mới có bàn tay làm mẫu; xong cả trạm dì đóng dấu chấm điểm. Ra món rồi bấm Giao cho khách."
- **Trang Cách chơi mới `so_che`** ("Sơ chế sáng", biểu tượng thùng đá): "Từ ngày 2, trước khi mở hàng con được làm sẵn vài mẻ: thùng đá giữ đồ cắt sẵn (dưa leo, tắc, xoài…), hũ trên kệ là đồ nhà làm (hành phi, sa tế, đậu phộng giã…). Trong ca chạm Bốc là xong việc đó; mẻ làm khéo thì món ngon hơn. Đồ sơ chế chỉ dùng trong ngày, dư là bỏ. Không kịp thì bấm Bỏ qua."
- **Gợi ý theo ngày** (bong bóng Dì Sáu trên màn sáng, không bắt buộc): ngày 2 gợi ý Rau bánh mì và Tắc cắt đôi; lần đầu thực đơn có bánh tráng gợi ý Hành tỏi phi (để gặp thái lát, đập dập, băm), lần sau gợi ý Sa tế (chặt, băm), Đậu phộng giã (rang, giã), và Trứng cút luộc (ngâm nước đá) khi ô thứ 3 mở; ngày sự kiện chè bưởi gợi ý Cùi bưởi nấu sẵn và Nước cốt dừa nhà vắt (bổ dừa, nạo).
- **Mẹo nghề mới** (`tips.js`, câu lấy từ `am-thuc.md` mục 7): `so_che_fifo` (lần đầu bỏ phần thừa); `vat_tac_vua_tay` (tag `dang`: "Tắc vắt vừa tay, bóp kiệt vỏ là đắng."); `hanh_phi_du_nhiet` ("Hành vừa ngả vàng là tắt bếp, dầu nóng làm nó vàng thêm."); `trung_cut_lac_hop` ("Trứng cút luộc xong ngâm nước đá, cho vào hộp lắc nhẹ là vỏ tự bong."); `cui_buoi_rao` ("Cùi bưởi bóp muối, xả nhiều lần, vắt thật ráo cho hết đắng. Luộc xong ngâm nước đá cho giòn."); `bo_dua` ("Gõ sống dao quanh giữa trái dừa cho nứt đều rồi tách đôi, đừng chặt mạnh kẻo văng nước."); `xe_ngang_than` ("Khô mực xé ngang thân, theo thớ, nhẹ tay mới ra sợi dài."); `phin_u_bot` (ngập bột lần đầu); `dut_doi` ("Xẻ một bên ổ thôi, đừng cho đứt đôi."); `suyt_dut_tay`. Bỏ `tach_beo` (Q7 giữ sữa muối) và `do_chua_ngam` (Chặng 2).
- **Ba Mẹo nghề cho ba "cách mới" của Q2 (v4; kiểm cuối #2).** Bản v3 chỉ có `cat_thanh` và không có đường kích hoạt: chọn sai cách chỉ gắn mã chung `sai_cach` (`kitchen.js:423`), mã này không có thẻ nào (`ERROR_TIP_TRIGGER.sai_cach → dish_hong` ở `economy.js:20` chỉ dùng cho lời khuyên cuối ca). Người chơi cũ quen "Thái sợi" cho xoài (cách đúng ở 0.5.1, `recipes.js:105, 284`) sẽ bị −15 mà không ai giải thích. Bản v4 (nhóm `bep`, trường mới `alsoOn`):

  | id | Tiêu đề | Lời | `trigger` | `alsoOn` |
  |---|---|---|---|---|
  | `cat_thanh` | Dưa leo cắt thanh | "Dưa leo kẹp bánh mì cắt thanh dài theo trái: thanh dưa nằm gọn trong ổ, miếng nào cũng giòn." | `sai_cach:thai_dua` | `cach_moi:thai_dua` |
  | `bao_soi_xoai` | Xoài bào sợi | "Xoài xanh gọt vỏ rồi bào sợi trên bàn bào: sợi mảnh, đều hơn thái tay, trộn bánh tráng mới thấm." | `sai_cach:thai_xoai` | `cach_moi:thai_xoai` |
  | `tac_khe_hat` | Tắc bỏ hạt rồi mới vắt | "Tắc cắt đôi, khều bỏ hạt rồi mới vắt. Hạt lọt vào ly là trà đắng." | `cach_moi:nhat_hat` | `dang` (xếp sau `vat_tac_vua_tay`, nên người chơi mới gặp ở lần trà đắng thứ hai) |

  `hint` ở Sổ tay nghề: "Chọn cách khác cho dưa leo bánh mì, hoặc nấu bánh mì lần đầu sau khi cập nhật." (tương tự cho xoài, tắc). Bảng `NEW_WAY_STEPS = { thai_dua: 'cat_thanh', thai_xoai: 'bao_soi_xoai', nhat_hat: 'tac_khe_hat' }` (`tips.js`) nối bước với thẻ.
- **Đường kích hoạt (lõi, gói P3).** (1) `submitStep` chọn sai cách → `unlockTip(state, 'sai_cach:' + stepId, ctx)`, đặt trước dòng `unlockTip(state, tag)` hiện có (`kitchen.js:430`). (2) `submitChon` dựng board mới có bước nằm trong `state.newWays` → `unlockTip(state, 'cach_moi:' + stepId, ctx, { capExempt: true })`, cùng chỗ `unlockTip(state, 'first_board')` (`kitchen.js:347`). (3) `unlockTip` (`state.js:215`) khớp thẻ theo `trigger` **hoặc** `alsoOn`; cờ `capExempt` bỏ qua trần "một thẻ mỗi ca từ ngày 2" (`state.js:223`), chỉ dùng cho `cach_moi:*`, nên cả đời save chỉ vượt trần tối đa 3 lần. Thẻ hiện như mọi Mẹo nghề (`app.js:344`, toast `tip-card` 3 giây).
- **Nhãn "Cách mới" (giao diện, gói P9).** `state.newWays = { thai_dua: 3, thai_xoai: 3, nhat_hat: 3 }` chỉ được tạo cho người chơi **đã nấu** món chứa bước đó ở bản cũ (migrate, mục 6.5); người chơi mới không có nhãn, vì với họ không có "cách cũ". Khi số còn > 0: bảng chọn cách (`step-sheet`) gắn viên **"Cách mới"** 13px (nền mực, chữ trắng) trong nút của cách đúng (`method-new-cat_thanh`, `method-new-bao_soi`; nút vẫn ≥ 44px, viên không phải vùng chạm riêng); ô trạm Tắc (không có bảng chọn cách) gắn viên "Cách mới" ở góc trên phải (`tram-new-tac`; ở xs ghi "Mới"). **"3 lần đầu" = 3 món ra món có bước đó**: `finishDish` trừ 1 cho mỗi khóa có trên board, về 0 thì xóa khóa; bỏ món và nấu thử không trừ.
- **Test (v4):** unit `m54-kitchen` (chọn `thai_soi` cho `thai_xoai` ở board mới mở `bao_soi_xoai`; `cach_moi` mở thẻ dù ca đã mở 1 thẻ; `newWays` trừ đúng ở `finishDish`, không trừ khi bỏ món); unit `m54-tips` (mới: mỗi khóa của `NEW_WAY_STEPS` có đúng một thẻ mang `trigger` hoặc `alsoOn` tương ứng; lời ≤ 120 ký tự, không từ cấm); unit `m54-save` (migrate tạo `newWays` theo món đã nấu); e2e `m54-save.e2e` (save v3 đã nấu bánh tráng: bảng chọn cách của xoài có `method-new-bao_soi`; chọn "Thái sợi" thì hiện `tip-card` "Mẹo nghề: Xoài bào sợi"; ra món 3 lần thì nhãn mất).
- **Thư "Có gì mới 0.5.4"** (`mail.js`, id `phien_ban_0_5_4`, không quà): thao tác mới, trạm liền tay, màn sơ chế sáng (thùng đá và kệ hũ, bốc hộp, sơ chế khéo), dưa leo bánh mì nay cắt thanh, xoài nay bào sợi, tắc cắt đôi khều hạt (Q2; kèm nhãn "Cách mới" trong 3 lần nấu đầu và Mẹo nghề giải thích), luật Không tì vết mới (Q3), nhịp chờ gọn hơn (Q1). `mail.js` là tệp của gói R3 Đợt 3: thư 0.5.4 thêm sau thư 0.5.3.

### 4.9 Nhiệm vụ, thạo món, thống kê

- **Thạo món** (`mastery.js`, đếm món Ngon trở lên) không đổi; món dùng hộp vẫn được tính. Mẻ sáng không tính là một lần nấu.
- **Tín hiệu của bước lấy từ hộp.** Lúc **`takeBox`** điền bước từ hộp, lõi **phát `step.done { stepId, type, score, auto: false, prepped: '<id hộp>' }`** như bước làm tay; `stats.js:96-101` sẵn có biến điểm ≥ 90 thành `perfect_step`, và theo `type` thành `perfect_thai` (nhiệm vụ `thai_hoan_hao`), `perfect_lua` (`lua_hoan_hao`). Mẻ sáng chỉ phát `morning.batch { id, size, q }` (không phát `step.done`), nên không đếm hai lần. Phần đã giữ mà không bốc thì không phát gì.
- **Hiệu chỉnh `thai_hoan_hao`** (`quests.js:31-32`). Số Hoàn hảo bước Thái mỗi khách, ngày 4–15 (mô hình bản v2; thao tác Thái không đổi ở v3): TB 0,41 → 0,62 (+51%; bánh mì có thêm "Xẻ dọc ổ bánh", và cắt thanh dễ hơn ngắm 3 nhát cũ), Giỏi 1,11 → 1,13, Ẩu 0,07 → 0,24. Đổi `target` từ `{ perCustomer: 0,625, min: 5, max: 8 }` thành **`{ perCustomer: 0,95, min: 7, max: 12 }`**. `lua_hoan_hao` không đổi. Chuỗi `perfect_step` (`chains.js:30`, mục tiêu 5) giữ nguyên. P10 chạy lại số này bằng `tools/mo-phong-bep` (lõi thật) trước khi chốt.
- **`flawlessDishes`:** theo luật Không tì vết D (mục 5.5); bước từ hộp tính như bước thường.
- **Thống kê mới** (`stats`): `prepBatches`, `prepPortionsUsed`, `prepPortionsWasted` (đọc `sh.morning.boxes[k].used` / `.wasted` lúc `expireMorning`).
- **Nhiệm vụ ngày** (thêm vào kho, không bắt buộc, nhóm `bep`): "Sơ chế 2 mẻ hạng Tốt trở lên" (tín hiệu `morning_batch`), "Làm một hũ nhà làm hạng Tốt" (cho người chơi lý do ngoài sao để gặp băm, chặt, giã, nạo), "Bán hết sạch một hộp sơ chế", "Không bỏ phần sơ chế nào". Không nhiệm vụ nào **buộc** phải sơ chế.
- **Nhiệm vụ "Trứng cút luộc, ngâm nước đá"** (v4; kiểm cuối #5: ngâm gặp 0% số ngày). `{ id: 'trung_cut_ngam', group: 'bep', text: 'Sơ chế một mẻ Trứng cút luộc, ngâm nước đá', signal: 'morning_batch', item: 'trung_cut_boc', target: { base: 1 }, cond: { menuUsesPrep: 'trung_cut_boc', iceSlotsAtLeast: 3, cooldownDays: 5 } }`: chỉ bốc khi thực đơn hôm nay có món dùng trứng cút, thùng đá đã có ô thứ 3 và 5 ngày gần nhất chưa ra việc này. Ba điều kiện mới của `cond` đọc từ `state` (thực đơn, `BALANCE.morning.iceSlots`, lịch sử việc ngày), không phụ thuộc giao diện. Thưởng như mọi nhiệm vụ (0,2 thu nhập tham chiếu + 5 danh tiếng, `QUEST_CONFIG.reward`). Bong bóng Dì Sáu ngày có việc này: "Hôm nay luộc trứng cút đi con, luộc xong thả liền vô thau nước đá cho dễ bóc."
  - **Số đo** (TB, làm theo việc này mỗi lần nó ra, tức ngày 5, 10, 15; ô thùng đá thứ 3 dành cho trứng cút; `ket-qua/ca-v4-nvd-s0.json`, 1 bộ): ngâm gặp **21% số ngày 2–15** (thay 0%); ngày làm việc này lợi sơ chế còn +0,33 … +0,39 sao/khách (ngày thường +0,46 … +0,58) vì trứng cút tiết kiệm ít giây hơn tắc cắt đôi; gộp ngày 4–15 TB **+0,50**, Giỏi +0,06, Ẩu +0,02 — vẫn trong dải Q6 (khóa #17 chạy cả biến thể này). Phần thưởng nhiệm vụ bù cho phần sao mất đi ngày đó.
  - **Không chọn** phương án "ngâm dưa leo nước đá ở mẻ Rau bánh mì": thêm giây vào mẻ được chọn nhiều nhất (100% số ngày) cho một việc người bán bánh mì ít làm (HB), và chỉ tính vào Q mẻ nên người chơi không thấy lý do.
- **Danh tiếng:** không cộng riêng cho sơ chế. **Sự kiện "Kiểm tra vệ sinh"** (`day-events.js:189`): bước có hộp không mang `bo_qua` / `chua_so_che` nên không bị bắt lỗi (trừ khi ra món mà chưa bốc).
- **Test** (`m54-quests`): món có hộp phát `perfect_thai`, `perfect_lua` đúng số **sau khi bốc**; giữ mà không bốc thì không phát; mục tiêu mới của `thai_hoan_hao`; board mới (bánh mì có Xẻ ổ bánh) đếm đúng; `trung_cut_ngam` chỉ bốc khi đủ ba điều kiện, không ra hai lần trong 5 ngày, đếm đúng mẻ `trung_cut_boc` (mẻ khác không đếm).

### 4.10 Cân bằng (tóm tắt; chi tiết mục 5.6)

- **Người bỏ qua chơi ngang bản cũ** (ngày 4–15, lõi thật, gộp 3 bộ hạt giống: TB +0,09, Giỏi +0,04, Ẩu −0,02 sao/khách so với 0.5.1; phần cộng của TB do rút gọn nhịp chờ Q1).
- **Mục tiêu lợi (người dùng chốt Q6):** TB +0,45 … +0,61, Giỏi +0,04 … +0,08 sao/khách so với không sơ chế. **Đạt [MH]:** TB **+0,53** (ngày thấp nhất +0,46, cao nhất +0,58), Giỏi **+0,07** (+0,05 … +0,10), Ẩu +0,02; khách mỗi ca của TB 6,85 → 7,27 (+6,1%) vì sao cao hơn kéo `customerCount` lên.
- **Lợi chia đôi thế nào** (1 bộ): khoảng **83% nhanh hơn, 17% ngon hơn** ở TB (+0,44 do thời gian, +0,09 do điểm hộp và thưởng cấp món); Giỏi 83% / 17%; Ẩu chỉ có phần ngon hơn (+0,07; phần thời gian không giúp người đã nhanh).
- **Cách đạt:** thùng đá 2 ô (ngày 2–4), 3 ô (từ ngày 5), 1 hũ, bốc hộp một chạm bắt buộc, thưởng cấp món.
- **Máy chậm** (v4): nếu đo trên máy thật mỗi thao tác nối tốn thêm hơn 0,6 giây thì người giỏi được lợi vượt +0,08 (tau 0,9: +0,155). Cổng phát hành làm giao diện nhanh hơn trước, còn chậm thì áp **Van gọn bếp** (bỏ "Gài nắp nén vừa tay", rồi "Kẹp trứng, dưa leo vào ổ"); tau > 0,85 thì không phát hành (mục 8.5, câu Q11).
- **Cái giá thấy rõ:** khoảng 41 giây buổi sáng (TB, ngày 2–15); trả trước khoảng 14.900đ, bỏ thừa khoảng 5.000đ mỗi ngày (một phần ba số đã trả, nên cỡ mẻ là quyết định thật).
- **Theo dõi sau phát hành** (người dùng chốt "theo dõi sau"): tỉ lệ ngày có sơ chế, sao người có / không sơ chế, số khách mỗi ca, tiền bỏ thừa, tỉ lệ ngày có làm hũ, tỉ lệ ngày nhận việc trứng cút (chỉ số 33, 34 mới ở `docs/can-bang.md`). Rủi ro R3.

### 4.11 Lưu dở, tải lại

- `state.morning.draft = { slot, id, size, round, op, per: { <op>: [điểm lượt 1, …] }, p }`, ghi sau **mỗi thao tác** (như `submitStep`); tiền đã trả nằm ở `state.morning.spent`, không nằm trong nháp.
- Tải lại thì vào thẳng màn sáng, mở lại đúng thao tác dở; hộp đã xong (`state.morning.boxes`) lưu ngay. Trong ca, `sh.morning.boxes[k].used` / `.wasted` và `cook.boxUse[i].taken` lưu cùng ca như mọi trường khác.

### 4.12 Để dành Chặng 2: Đồ chua nhà làm, tỏi băm

Người dùng chốt (Q4/Q5): đồ chua và tỏi băm để riêng cho Chặng 2 (quán), khi thực đơn rộng hơn. Phần này **chỉ là tài liệu**: không có trong `prep-items.js`, bảng số, mô phỏng, khóa test hay gói triển khai của 0.5.4.

| Mục | Thiết kế để dành (từ bản v2, đã sửa theo phản biện vòng 2) |
|---|---|
| Đồ chua nhà làm (`do_chua_nha`, loại B) | Chuỗi một lượt: gọt cà rốt, củ cải (`got`, strips 3) → **bào sợi** (`bao`) → **bóp muối, xả** (`cha` bop) → **vắt ráo** (`vat` vai, τ 0,6, "Ráo" [0,62; 0,86]) → **ngâm giấm đường** (`lua` ngam, vòng hẹn giờ G5). Dùng cho món có đồ chua (bánh mì, cơm tấm…), cộng "Vị nhà làm" như hũ khác. Giây mẻ 4 / 8 khoảng 16,8 / 29,3 (TB, bản v2); Q mẻ TB khoảng 94,7 |
| Tiền đồ chua (phản biện vòng 2 #21) | Là món thêm (0.5.1 không có), tính 300đ thô mỗi phần (cà rốt, củ cải, giấm đường); giá mẻ = `roundUpTo(size × 300 × m, 500)`. Sổ: phần đã dùng × 300đ, **làm tròn xuống bội 500đ**, vào giá vốn; phần còn lại của giá mẻ vào hao hụt (cộng lại bằng đúng giá mẻ). Khi làm Chặng 2 thì thêm khóa tiền tương ứng |
| Tỏi băm sống (`toi_bam`, loại A) | Chỉ khi có món dùng tỏi sống (nước mắm tỏi ớt, thịt ướp): chuỗi bóc → đập dập → băm (vùng "Nhỏ"). Ở 0.5.4, đập dập và băm tỏi là thao tác bên trong mẻ Hành tỏi phi |
| Mẹo nghề, hình | `do_chua_ngam` ("Cà rốt, củ cải bóp muối, vắt ráo rồi mới ngâm giấm đường, ngâm từ sáng là vừa ăn."); hình `ca_rot.got`, `do_chua.soi` — để dành cùng ngân sách hình Chặng 2 |

---

## 5. Cân bằng và mô phỏng

Mọi số trong mục này là **[MH]**, chạy trên **mô phỏng của người phản biện vòng 2** (bản v3 chép ở `mo-phong-v3b/`, chỗ đổi đánh dấu `[v3]`; **bản v4 chạy lại mục 5.4–5.7 trên `kiem-cuoi/v4/`**, chỗ đổi đánh dấu `[v4]`, gộp 3 bộ hạt giống độc lập; thời gian ở mục 5.2, 5.3 không đổi vì v4 không đổi `par`, `w` hay thời gian thao tác nào): cả ca bằng **lõi thật** (`startShift` với sự kiện ngày, khách, ghi chú, kiên nhẫn; `advance` với hàng đầy, bỏ về, QR chờ tiền về 1–4 giây; `clipTicket` với phạt chờ gọi món; `submitChon` … `finishDish`; `serveTicket`, `resolveComplaint`, `endShift` với `state.ratings` → `customerCount` ngày sau), chỉ phần bếp là mô hình thao tác viết theo chữ của bản thiết kế, đọc thẳng bảng 3.2 của tệp này. Mức tuyệt đối phải đo lại trên máy thật (mục 8.5). Số của bản v2 (mô hình tự viết lại luật hàng chờ) không dùng nữa; mức chênh giữa các bản khớp trong ±0,02 sao, còn mức tuyệt đối của mô hình v2 lạc quan (phản biện vòng 2 #9).

### 5.1 Mô hình

| Thành phần | Giá trị |
|---|---|
| Ba hồ sơ (hiệu chỉnh theo bảng sao M5) | **TB**: σ × 1,0, lỗi × 1,0, tốc độ × 1,0, quầy 20 giây/khách. **Giỏi**: σ × 0,6, lỗi × 0,4, tốc độ × 0,82, gần như bỏ qua màn ra món. **Ẩu**: σ × 1,73, lỗi × 2,58, tốc độ × 0,75. Người chơi "quầy trước": có khách ở hàng và dây phiếu < 3 thì ra quầy, không thì nấu trọn một dòng; quầy không mắc lỗi |
| Thời gian thao tác | Hằng trung lập (`tOp`), đã gồm 0,8 giây định hướng đầu thao tác; kim lửa chạy theo giờ thật; vắt theo thước giữ `holdLevel`; bào dừng ở tâm vùng "Đủ" + 0,4 giây nhấc tay. **`[v3]` Lượt "miếng kế trượt vào" 0,45 giây** (chỉ xé còn lượt: 4 sợi một màn, 3 ở khung 320 và 375×553) |
| **Kim lửa `[v3]`** | Sai số người chơi tính theo **giây** rồi đổi ra giá trị bằng tốc độ kim 1,2/chu kỳ (đúng `luaValue`, `lua.js:1-2`): σ giá trị = 0,099 × σ hồ sơ × 5/chu kỳ (mốc chu kỳ 5 giây giữ đúng hiệu chỉnh M5). Áp cho cả 0.5.1 và 0.5.4, cả trong ca lẫn mẻ sáng (ngâm, phi, rang chu kỳ 4) |
| Phụ phí bản cũ | 1,2 giây mỗi bước (chạm huy hiệu 0,5 + con dấu 0,7) + 1,0 giây bảng chọn cách + 2,7 giây ra món; người mới + 1,1 giây thẻ bước **mỗi bước** |
| Phụ phí bản mới | Mỗi trạm: chạm ô 0,5 (gọn: × 0,6 nhờ "Tiếp →") + con dấu 0,7 (gọn: 0,45 khi trạm ≥ 70) + **tau** mỗi thao tác nối; bảng chọn cách 1,0; ra món 2,7 (gọn: 2,1; sàn 0,9 với người bấm bỏ qua); **`[v3]` thẻ bước người mới 0,8 giây ở mọi thao tác** (3 lần nấu đầu); **bốc hộp 1,0 giây** mỗi hộp |
| tau | 0,35 (mục tiêu đo trên máy thật), **0,6 (trung lập, kịch bản chính)**, 0,9 (bi quan). Nhịp chờ gọn bắt buộc (Q1) nên "không gọn" chỉ để tham khảo. **v4:** thêm 0,65 / 0,7 / 0,75 / 0,8 / 0,85 để dựng bảng van của cổng 8.5; tau 0,9 không van chỉ còn là tham khảo (không phát hành) |
| Chất lượng | 20.000 món mỗi ô mỗi bộ, hệ số vùng 0,9 / 1,104 / 1,2; `dishQuality` thật (0.5.1: lõi gốc; 0.5.4: luật D + **`[v3]` thưởng cấp món** `opts.bonus`). **v4:** 7 bộ hạt giống (1000, 5000, 9000, 20000, 31000, 47000, 63000); khóa #15 dùng trung bình 3 bộ đầu; nhặt có **`[v4]` mồi mờ** (số lần nhầm kẹp ở `params.fade`) |
| Cả ca | Ngày 1–15 liên tục trên cùng một state, 300 hạt giống × 3 hồ sơ × {0.5.1, 0.5.4 không sơ chế, 0.5.4 có sơ chế}; mua Bánh tráng trộn ngày 3, Cà phê sữa đá ngày 5 (thực đơn 15 ngày của mô hình chỉ gồm 4 món: trà tắc, bánh mì ốp la, bánh tráng trộn, cà phê sữa đá; mỗi món 22–27% số dòng). **v4:** mỗi cấu hình chạy 3 bộ độc lập (muối hạt giống 0, 17, 29), báo trung bình và độ lệch chuẩn giữa các bộ; phần 0.5.1 lấy từ bộ nền cùng hạt giống (không phụ thuộc tau hay van) |
| Sơ chế trong ca | Ô thùng đá: đồ loại A tiết kiệm nhiều giây nhất trên số phần dự kiến (lấy `customerCount` thật); mẻ 8 khi dự kiến > 5 phần, không thì 4. Hũ: **xoay vòng** đồ nhà làm lâu chưa làm nhất. Mẻ chơi không bấm giờ, tay bình tĩnh (σ × 0,85, lỗi × 0,8). Bốc mọi hộp có phần giữ (1,0 giây mỗi hộp) |
| **`[v4]` Biến thể** | Van gọn bếp và các van đã thử chạy bằng **bản thiết kế biến thể** (`bt-van-*.md`: bỏ bước khỏi bảng 3.2 và nối `after` như `effectiveSteps`), thưởng và số ô bằng tùy chọn (`opts.bonus`, `opts.ice`); nhiệm vụ trứng cút bằng `opts.force3` (ô thùng đá thứ 3 dành cho trứng cút ở ngày 5, 10, 15) |

### 5.2 Thời gian từng thao tác (giây, người chơi TB / Giỏi / Ẩu)

Sinh từ dữ liệu (`bang-gio-v3.mjs` → `ket-qua-bang-gio-v3.md`). Thao tác nối trong trạm thêm tau. Cột cuối là khóa #6 (TB × 1,3 ≤ giới hạn) ở 1 / 2 / 3 phần: **không ô nào đỏ**; kiểm chặt hơn có nhiễu tốc độ (TB × 1,12 × 1,3) cũng không ô nào đỏ, cả ở khung 320 (xé 3 sợi một lượt; `ket-qua-gioi-han-v3.txt`, 1.659 ô).

| Món | Thao tác | Loại | TB | Giỏi | Ẩu | par | Giới hạn 1 / 2 / 3 phần = max(2,5·par, sàn) | TB × 1,3 (1 / 2 / 3 phần) |
|---|---|---|---|---|---|---|---|---|
| Bánh mì ốp la | `rua_dua` | cha | 2,0 | 1,6 | 1,5 | 1,5 | 3,8 / 5,3 / 6,8 | 2,6 / 2,6 / 2,6 |
| Bánh mì ốp la | `thai_dua` | thai thanh | 2,4 | 2,0 | 1,8 | 2,5 | 6,3 / 8,8 / 11,3 | 3,1 / 5,2 / 7,3 |
| Bánh mì ốp la | `dap_trung` | dap | 3,0 | 2,5 | 2,3 | 2 | 5,0 / 8,0 / 11,5 | 3,9 / 7,0 / 10,1 |
| Bánh mì ốp la | `chien_trung` | lua.chao | 2,9 | 2,9 | 2,9 | 5 | 12,5 / 17,5 / 22,5 | 3,8 / 3,8 / 3,8 |
| Bánh mì ốp la | `xe_banh` | thai rach | 1,6 | 1,3 | 1,2 | 1,5 | 3,8 / 5,3 / 6,8 | 2,1 / 3,1 / 4,2 |
| Bánh mì ốp la | `kep_banh` | bay.o_banh | 1,7 | 1,4 | 1,3 | 1,5 | 3,8 / 5,3 / 6,8 | 2,2 / 3,4 / 4,5 |
| Bánh mì ốp la | `nem` | cham | 1,8 | 1,4 | 1,3 | 1,5 | 3,8 / 5,3 / 6,8 | 2,3 / 2,7 / 3,2 |
| Bánh mì trứng gà ta | `nuong_banh_mi` | lua.lo | 2,5 | 2,5 | 2,5 | 4 | 10,0 / 14,0 / 18,0 | 3,2 / 3,2 / 3,2 |
| Trà tắc | `thai_tac` | thai ngam | 3,2 | 2,6 | 2,4 | 3 | 7,5 / 10,5 / 13,5 | 4,2 / 6,9 / 9,6 |
| Trà tắc | `nhat_hat` | nhat.hat | 2,1 | 1,7 | 1,6 | 1,5 | 3,8 / 5,8 / 8,2 | 2,7 / 4,7 / 6,6 |
| Trà tắc | `vat_tac` | vat | 1,5 | 1,3 | 1,2 | 3 | 7,5 / 10,5 / 13,5 | 2,0 / 3,2 / 4,4 |
| Trà tắc | `rot_tra` | rot | 2,8 | 2,3 | 2,1 | 3 | 7,5 / 10,5 / 13,5 | 3,6 / 3,6 / 3,6 |
| Trà tắc | `nem_duong` | cham | 2,2 | 1,8 | 1,7 | 2 | 5,0 / 7,0 / 9,0 | 2,9 / 3,9 / 4,9 |
| Trà tắc | `lac` | lac.binh | 2,1 | 1,7 | 1,6 | 2 | 5,0 / 7,0 / 9,0 | 2,8 / 4,5 / 6,2 |
| Trà tắc mật ong rừng | `rot_mat_ong` | rot.to | 2,4 | 2,0 | 1,8 | 3 | 7,5 / 10,5 / 13,5 | 3,1 / 3,1 / 3,1 |
| Bánh tráng trộn | `cat_banh_trang` | thai keo | 2,5 | 2,0 | 1,8 | 2,5 | 6,3 / 8,8 / 11,3 | 3,2 / 5,5 / 7,9 |
| Bánh tráng trộn | `got_xoai` | got | 3,2 | 2,6 | 2,4 | 2,5 | 6,3 / 10,6 / 15,4 | 4,2 / 7,3 / 10,4 |
| Bánh tráng trộn | `thai_xoai` | bao | 3,2 | 2,6 | 2,4 | 2,5 | 6,3 / 8,8 / 11,3 | 4,2 / 6,9 / 9,7 |
| Bánh tráng trộn | `boc_trung_cut` | cha.boc | 2,6 | 2,1 | 1,9 | 3 | 7,5 / 10,5 / 13,5 | 3,4 / 3,4 / 3,4 |
| Bánh tráng trộn | `xe_kho_bo` | xe | 2,8 | 2,3 | 2,1 | 2,5 | 6,3 / 8,8 / 11,8 | 3,6 / 7,0 / 10,3 |
| Bánh tráng trộn | `nem` | cham | 2,8 | 2,3 | 2,1 | 3 | 7,5 / 10,5 / 13,5 | 3,6 / 5,5 / 7,3 |
| Bánh tráng trộn | `rot_dau_hanh` | rot.to | 2,4 | 2,0 | 1,8 | 2 | 5,0 / 7,0 / 9,0 | 3,2 / 3,2 / 3,2 |
| Bánh tráng trộn | `nhat_rau_ram` | nhat.la | 2,1 | 1,7 | 1,6 | 1,5 | 3,8 / 5,8 / 8,2 | 2,7 / 4,7 / 6,6 |
| Bánh tráng trộn | `tron` | xoay.to | 5,3 | 4,4 | 4,0 | 4 | 10,0 / 15,0 / 22,0 | 6,9 / 12,9 / 18,8 |
| Bánh tráng trộn Tây Ninh | `nuong_kho_muc` | lua.nuong | 2,5 | 2,5 | 2,5 | 2,5 | 6,3 / 8,8 / 11,3 | 3,2 / 3,2 / 3,2 |
| Bánh tráng trộn Tây Ninh | `dap_kho_muc` | dap_dap.giay | 2,8 | 2,3 | 2,1 | 2 | 5,0 / 7,4 / 10,6 | 3,6 / 6,4 / 9,1 |
| Bánh tráng trộn Tây Ninh | `xe_kho_muc` | xe | 2,8 | 2,3 | 2,1 | 2,5 | 6,3 / 8,8 / 11,8 | 3,6 / 7,0 / 10,3 |
| Bánh tráng trộn Tây Ninh | `nem` | cham | 3,1 | 2,6 | 2,4 | 3 | 7,5 / 10,5 / 13,5 | 4,1 / 6,4 / 8,6 |
| Cà phê sữa đá | `u_bot` | rot.phin | 1,8 | 1,5 | 1,3 | 1,5 | 3,8 / 5,3 / 6,8 | 2,3 / 2,3 / 2,3 |
| Cà phê sữa đá | `nen_phin` | vat.nen | 1,4 | 1,1 | 1,0 | 1,5 | 3,8 / 5,3 / 6,8 | 1,8 / 2,8 / 3,8 |
| Cà phê sữa đá | `rot_nuoc` | rot.phin | 2,6 | 2,1 | 1,9 | 2,5 | 6,3 / 8,8 / 11,3 | 3,3 / 3,3 / 3,3 |
| Cà phê sữa đá | `u_phin` | lua.phin | 3,2 | 3,2 | 3,2 | 5 | 12,5 / 17,5 / 22,5 | 4,2 / 4,2 / 4,2 |
| Cà phê sữa đá | `them_sua` | cham | 2,2 | 1,8 | 1,7 | 2 | 5,0 / 7,0 / 9,0 | 2,9 / 3,9 / 4,9 |
| Cà phê sữa đá | `them_da` | bay.ly | 2,6 | 2,1 | 2,0 | 2 | 5,0 / 7,9 / 11,1 | 3,4 / 5,7 / 8,1 |
| Cà phê sữa đá | `khuay` | xoay.ly | 3,5 | 2,9 | 2,6 | 2 | 5,2 / 9,4 / 13,6 | 4,6 / 8,1 / 11,7 |
| Cà phê muối | `danh_sua_muoi` | xoay.chen | 5,1 | 4,2 | 3,9 | 4 | 10,0 / 17,8 / 26,2 | 6,7 / 11,6 / 16,4 |
| Cà phê muối | `rot_sua_muoi` | rot.to | 2,4 | 2,0 | 1,8 | 2 | 5,0 / 7,0 / 9,0 | 3,2 / 3,2 / 3,2 |
| Chè bưởi | `got_vo` | got | 3,2 | 2,6 | 2,4 | 2,5 | 6,3 / 10,6 / 15,4 | 4,2 / 7,3 / 10,4 |
| Chè bưởi | `thai_cui` | thai hai_luot | 4,4 | 3,6 | 3,3 | 3,5 | 8,8 / 12,3 / 15,8 | 5,8 / 9,4 / 13,1 |
| Chè bưởi | `bop_muoi` | cha.bop | 2,0 | 1,7 | 1,5 | 2 | 5,0 / 7,0 / 9,0 | 2,7 / 4,3 / 5,9 |
| Chè bưởi | `vat_rao` | vat.vai | 1,9 | 1,5 | 1,4 | 1,5 | 3,8 / 5,3 / 6,8 | 2,4 / 4,1 / 5,7 |
| Chè bưởi | `ao_bot` | lac.ro | 2,9 | 2,3 | 2,1 | 3,5 | 8,8 / 12,3 / 15,8 | 3,7 / 6,0 / 8,3 |
| Chè bưởi | `luoc` | lua.noi | 3,0 | 3,0 | 3,0 | 5 | 12,5 / 17,5 / 22,5 | 3,9 / 3,9 / 3,9 |
| Chè bưởi | `muc_ly` | bay.muc | 1,7 | 1,4 | 1,3 | 2 | 5,0 / 7,0 / 9,0 | 2,2 / 3,4 / 4,5 |
| Chè bưởi | `rot_cot_dua` | rot.to | 2,7 | 2,2 | 2,0 | 2 | 5,0 / 7,0 / 9,0 | 3,5 / 3,5 / 3,5 |

Trung vị 71 thao tác: **2,5 giây**; dài nhất Trộn đều 5,3 giây, Đánh sữa muối 5,1 giây; ngắn nhất Gài nắp nén 1,4 giây, Vắt tắc (cả nắm) 1,5 giây. Tính cả phụ phí (tau 0,6, gọn), mỗi thao tác tốn trung bình khoảng 3,1 giây, so với 4,4 giây mỗi bước ở bản cũ — đúng ý "mỗi thao tác ngắn lại".

### 5.3 Thời gian một món

**TB, 1 phần, không ghi chú, không sơ chế** (giây; trừ 0,4 giây chạm "Ra món" như bảng của phản biện; `ket-qua-bang-gio-v3.md`):

| Món | 0.5.1 | tau 0,35 + gọn | tau 0,6 + gọn | tau 0,9 + gọn | tau 0,6 không gọn | tau 0,9 không gọn |
|---|---|---|---|---|---|---|
| Bánh mì ốp la | 29,8 | 28,1 (-5,5%) | 29,1 (-2,2%) | 30,3 (+1,8%) | 31,1 (+4,4%) | 32,3 (+8,4%) |
| Bánh mì trứng gà ta | 33,5 | 31,0 (-7,5%) | 32,2 (-3,7%) | 33,7 (+0,7%) | 34,2 (+2,1%) | 35,7 (+6,6%) |
| Trà tắc | 26,3 | 23,9 (-9,0%) | 24,9 (-5,2%) | 26,1 (-0,6%) | 26,4 (+0,5%) | 27,6 (+5,1%) |
| Trà tắc mật ong rừng | 26,5 | 24,1 (-8,9%) | 25,1 (-5,1%) | 26,3 (-0,6%) | 26,6 (+0,5%) | 27,8 (+5,1%) |
| Bánh tráng trộn | 47,3 | 43,8 (-7,4%) | 45,0 (-4,7%) | 46,5 (-1,6%) | 47,4 (+0,3%) | 48,9 (+3,5%) |
| Bánh tráng trộn Tây Ninh | 51,1 | 50,5 (-1,2%) | 52,0 (+1,7%) | 53,8 (+5,2%) | 54,8 (+7,3%) | 56,6 (+10,8%) |
| Cà phê sữa đá | 29,2 | 27,6 (-5,4%) | 28,9 (-1,1%) | 30,4 (+4,0%) | 30,4 (+4,0%) | 31,9 (+9,2%) |
| Cà phê muối | 38,6 | 36,3 (-5,9%) | 37,8 (-2,0%) | 39,6 (+2,6%) | 39,7 (+3,0%) | 41,5 (+7,7%) |
| Chè bưởi | 35,5 | 34,9 (-1,5%) | 36,2 (+2,0%) | 37,7 (+6,2%) | 38,1 (+7,5%) | 39,6 (+11,7%) |

**Lệch lớn nhất theo hồ sơ và số phần** (9 món × {không ghi chú, từng ghi chú, cặp ghi chú khác nhóm}; `kiem-thoi-gian.mjs` → `ket-qua-thoi-gian.md`, 1.242 ô mỗi kịch bản):

| Hồ sơ | Phần | tau 0,35 + gọn | tau 0,6 + gọn (chính) | tau 0,9 + gọn | tau 0,6 + gọn, khung 320 | tau 0,9 + gọn, khung 320 | tau 0,9 không gọn (tham khảo) |
|---|---|---|---|---|---|---|---|
| TB | 1 | -1,2% Tây Ninh | +2,0% Chè bưởi | +6,2% Chè bưởi | +2,0% Chè bưởi | +6,2% Chè bưởi | +11,6% Chè bưởi |
| TB | 2 | +1,6% Chè bưởi | +4,3% Chè bưởi | +7,4% Chè bưởi | +4,3% Chè bưởi | +7,4% Chè bưởi | +11,6% Chè bưởi |
| TB | 3 | +3,5% Chè bưởi | +5,7% Chè bưởi | +8,2% Chè bưởi | +5,7% Chè bưởi | +8,2% Chè bưởi | +11,5% Chè bưởi |
| GI | 1 | +1,0% Tây Ninh | +4,7% Tây Ninh | +9,5% Chè bưởi | +4,7% Tây Ninh | +9,5% Chè bưởi | +14,2% Tây Ninh |
| GI | 2 | +2,8% Chè bưởi | +6,0% Chè bưởi | +9,9% Chè bưởi | +6,0% Chè bưởi | +9,9% Chè bưởi | +13,2% Chè bưởi |
| GI | 3 | +4,5% Chè bưởi | +7,1% Chè bưởi | +10,2% Chè bưởi | +7,1% Chè bưởi | +10,2% Chè bưởi | +12,9% Chè bưởi |
| AU | 1 | +1,8% Tây Ninh | +5,8% Tây Ninh | +10,6% Tây Ninh | +5,8% Tây Ninh | +10,6% Tây Ninh | +15,6% Tây Ninh |
| AU | 2 | +3,0% Chè bưởi | +6,5% Chè bưởi | +10,7% Chè bưởi | +6,5% Chè bưởi | +10,7% Chè bưởi | +13,8% Chè bưởi |
| AU | 3 | +4,6% Chè bưởi | +7,4% Chè bưởi | +10,8% Chè bưởi | +7,4% Chè bưởi | +10,8% Chè bưởi | +13,3% Chè bưởi |

Tổng hợp mọi ô: kịch bản chính ≤ **+7,4%** (mục tiêu ≤ +8%; ô tệ nhất Chè bưởi 3 phần, Ẩu); tau 0,9 + gọn ≤ **+10,8%** (mục tiêu ≤ +12%; 0 ô > +12%), kể cả khung 320 và cả khi mỗi lượt trượt vào tốn 0,8 giây; tau 0,9 không gọn (tham khảo) ≤ +19,8% (0 ô > +20%). Bản v2 bỏ sót lượt trượt vào; nếu giữ bố cục v2 (6 đích nhặt, 6 vạch thái, mỗi ổ rạch riêng, xé khô mực 4 sợi) thì tau 0,9 + gọn ở khung 320 lên +13,2% (phản biện vòng 2 #8).

**Trong ca thật** (đơn, ghi chú, số phần, thẻ người mới, thạo món như `startShift` sinh ra; ngày 4–15), giây mỗi dòng món 0.5.1 → 0.5.4: tau 0,6 + gọn: TB 35,9 → 35,0 (**−2,6%**), Giỏi 28,9 → 28,7 (**−0,9%**), Ẩu 26,8 → 27,1 (**+1,0%**); ô nặng nhất Bánh mì ốp la 3 phần của Ẩu +7,1%. Tau 0,9 + gọn: +1,1% / +3,8% / +6,1%; ô nặng nhất +10,5% (`tom-tat-v3f-chinh.md`, `tom-tat-v3f-xau.md`).

**Người mới (3 lần nấu đầu, thẻ bước 0,8 giây ở mọi thao tác), TB 1 phần:** tau 0,6 + gọn −6,4% (trà tắc) … +1,5% (Tây Ninh); tau 0,9 + gọn −2,7% … +4,7%. Tổng thời gian thẻ gần bằng 0.5.1 (vd Tây Ninh 11 × 0,8 = 8 × 1,1 = 8,8 giây). Bản v2 chỉ hiện thẻ ở thao tác đầu trạm nên người mới nhanh hơn 0.5.1 tới 16%, kéo sao ngày 2–5 lệch lên (phản biện vòng 2 #4; mục 5.4).

**Có hộp sơ chế** (TB, tau 0,6 + gọn, **bốc 1,0 giây** mỗi hộp; giây, cùng thước):

| Món | 0.5.1 | Không hộp | Có từng hộp |
|---|---|---|---|
| Bánh mì ốp la | 29,8 | 29,1 (-2,2%) | rau_banh_mi 23,4 (-21,2%) |
| Bánh mì trứng gà ta | 33,5 | 32,2 (-3,7%) | rau_banh_mi 26,5 (-20,7%) |
| Trà tắc | 26,3 | 24,9 (-5,1%) | tac_cat 19,4 (-25,7%) |
| Trà tắc mật ong rừng | 26,5 | 25,1 (-5,1%) | tac_cat 19,6 (-25,5%) |
| Bánh tráng trộn | 47,3 | 45,0 (-4,7%) | banh_trang_soi 41,8 (-11,4%); xoai_bao 37,3 (-21,0%); trung_cut_boc 42,8 (-9,3%); kho_bo_xe 42,6 (-9,7%) |
| Bánh tráng trộn Tây Ninh | 51,1 | 52,0 (+1,7%) | banh_trang_soi 48,8 (-4,5%); xoai_bao 44,2 (-13,4%); trung_cut_boc 49,6 (-2,9%) |
| Cà phê sữa đá | 29,2 | 28,9 (-1,1%) | — |
| Cà phê muối | 38,6 | 37,8 (-2,0%) | sua_muoi 32,9 (-14,6%) |
| Chè bưởi | 35,5 | 36,2 (+2,0%) | cui_buoi_nau_san 14,8 (-57,5%) |

**Đọc bảng:** N1 đạt ở mọi ô. **Thứ tự bỏ dự phòng** nếu đo máy thật vẫn vượt (không đổi `pace`): (1) `nuong_kho_muc` (Tây Ninh, −2,5 giây; khô mực mua "nướng sẵn"), (2) `nhat_rau_ram` (bánh tráng, −2,1 giây; rau răm ngắt sẵn từ sáng), (3) gộp `muc_ly` vào `rot_cot_dua` (chè bưởi, −1,7 giây). (Bản v2 xếp "xé khô mực 4 → 3 sợi" ở bậc 3; bản v3 đã áp.) **v4:** thứ tự này chỉ dùng khi **thời lượng** vượt trần; khi tau đo được > 0,6 thì dùng quy trình van của mục 8.5 (Van gọn bếp bỏ nén phin, kẹp ổ bánh). Bậc (2) bỏ `nhat_rau_ram` làm ngày mua bánh tráng trộn nhô lên (TB +0,16 … +0,20 sao, Giỏi +8,4 … +9,5 điểm 5★ ở ngày 3; mục 5.9), nên nếu phải dùng thì chạy lại #16 từng ngày trước khi phát hành.

### 5.4 Nhịp khách và cả ca, người không sơ chế

- **Lịch khách** (`customer.expectedServiceSec` → `shift.planArrivals`) và **ngân sách chờ** (`order.waitBudgetFor`) cùng đọc `linePar`, nay tính từ `recipe.pace`: `Σ round(p × (1 + 0,4(qty − 1)) × 10) / 10` theo đúng thứ tự bước 0.5.1. Công thức này **trùng từng bit** với `linePar` cũ ở 9 món × mọi tập ghi chú (≤ 2, khác nhóm) × 1–3 phần: **207/207 ca**.
- Kết quả: khách đến **đúng như cũ**, ngân sách chờ **đúng như cũ**, `integration-shift` và hạt giống e2e không đổi; luật "lãi trên giây ≤ 550đ" (`data.test.mjs:251-262`) tính trên Σ`pace` nên số không đổi. Số khách mỗi ca chỉ đổi qua `customerCount` (sao trung bình 30 khách gần nhất), đúng như 0.5.1.

**Cả ca, ngày 4–15, người không sơ chế** (lõi thật; v4: **gộp 3 bộ hạt giống độc lập** × 300; "sd" là độ lệch chuẩn của Δ giữa 3 bộ; `kiem-cuoi/v4/kq4/gop-chinh.txt`, `gop-m2-x085.txt`, `gop-xau-v4.txt`):

| Trạng thái | Hồ sơ | Sao/khách 0.5.1 → 0.5.4 | Δ (sd) | Δ ngày thấp nhất … cao nhất | 5★ 0.5.1 → 0.5.4 | Khách/ca | Chờ món > 150% ngân sách | Giây/dòng |
|---|---|---|---|---|---|---|---|---|
| **tau 0,6 + gọn, van 0 (chính)** | TB | 3,30 → 3,39 | **+0,090** (0,005) | 0,00 … +0,13 | 16,5 → 17,9% | 6,77 → 6,85 | 13,3 → 10,7% | −2,7% |
| | Giỏi | 4,72 → 4,76 | **+0,041** (0,007) | +0,02 … +0,07 | 76,5 → 79,8% | 7,60 → 7,60 | 0 | −0,9% |
| | Ẩu | 3,60 → 3,59 | **−0,015** (0,002) | −0,04 … +0,02 | 6,4 → 4,9% | 7,07 → 7,07 | 0 | +1,1% |
| **tau 0,85 + gọn, van mức 2** (trạng thái phát hành chậm nhất còn cho phép, mục 8.5) | TB | 3,30 → 3,40 | +0,104 (0,004) | +0,02 … +0,13 | 16,5 → 18,1% | 6,77 → 6,86 | 13,3 → 10,3% | −3,2% |
| | Giỏi | 4,72 → 4,75 | +0,028 (0,002) | +0,01 … +0,05 | 76,5 → 78,7% | 7,60 → 7,60 | 0 | −0,9% |
| | Ẩu | 3,60 → 3,58 | −0,017 (0,003) | −0,04 … +0,02 | 6,4 → 5,3% | 7,07 → 7,07 | 0 | +1,2% |
| tau 0,9 + gọn, van 0 (tham khảo; **không phát hành**, mục 8.5) | TB | 3,30 → 3,27 | −0,024 (0,004) | −0,05 … +0,04 | 16,5 → 16,3% | 6,77 → 6,76 | 13,3 → 14,7% | +1,1% |
| | Giỏi | 4,72 → 4,67 | −0,053 (0,007) | −0,09 … +0,02 | 76,5 → 72,1% | 7,60 → 7,60 | 0 | +3,8% |
| | Ẩu | 3,60 → 3,57 | −0,034 (0,001) | −0,06 … 0,00 | 6,4 → 4,8% | 7,07 → 7,04 | 0 | +6,0% |

Gộp ngày 1–15, kịch bản chính: TB 3,41 → 3,49; phân bố sao TB 1★–5★ 5,6 / 16,8 / 28,9 / 28,9 / 19,8 → 4,5 / 15,1 / 28,5 / 30,7 / 21,3%; Giỏi 5★ 77,5 → 81,0%; Ẩu 5★ 6,8 → 5,2%. Bản v3 (1 bộ) báo +0,09 / +0,04 / −0,03: chênh với v4 nằm trong độ lệch giữa các bộ.

**Từng ngày, người không sơ chế, Δ sao 0.5.4 − 0.5.1** (kịch bản chính, gộp 3 bộ; đủ bảng ở `gop-chinh.txt`): TB 0,00 / +0,09 / +0,11 / +0,13 / +0,10 / +0,10 / +0,10 / +0,07 / +0,08 / +0,05 / +0,06 / +0,09 / +0,11 / +0,10 / +0,09 (ngày 1 → 15); Giỏi +0,02 … +0,07; Ẩu −0,04 … +0,02. Δ 5★ lớn nhất: TB +4,8 điểm (ngày 2), Giỏi +6,7 điểm (ngày 3, ngày mua bánh tráng trộn), Ẩu −3,3 điểm (ngày 2). Độ lệch chuẩn của một ngày giữa các bộ 300 hạt giống: TB 0,018 sao / 0,73 điểm 5★, Giỏi 0,010 / 0,73, Ẩu 0,016 / 0,87 (trung bình 3 bộ: chia √3).

**Ngày người mới, ngày mua món (phản biện vòng 2 #4; kiểm cuối #4).** Bản v2 (thẻ chỉ đầu trạm), lõi thật: Giỏi 5★ ngày 3 +13,7 điểm, ngày 5 +10,0; TB 5★ ngày 2 +9,4; sao TB ngày 3 +0,23, ngày 5 +0,22. Từ bản v3 (thẻ ở mọi thao tác): Giỏi 5★ ngày 3 **+6,7**, ngày 5 **+2,9**; TB 5★ ngày 2 **+4,8**; sao TB ngày 3 **+0,11**, ngày 5 **+0,10** — bằng mức chung của mọi ngày. Bỏ thẻ người mới ở cả hai bản (`ca-v3f-nonovice.json`, v3) cho TB ngày 2 +0,10 / ngày 3 +0,12 / ngày 5 +0,13: **phần lệch do thẻ người mới đã hết**. Hai phần còn lại có nguồn khác nhau: (a) mức chung +0,09 của TB ở mọi ngày là của **nhịp chờ gọn** (Q1); (b) phần **nhô thêm** của Giỏi ngày 3 (+6,7 điểm 5★ so với mức chung +3,4) là **bánh tráng trộn** (món mua ngày 3) nhanh hơn 0.5.1 khoảng 4–5%, không phải nhịp chờ. Vì vậy khóa #16 từng ngày ở v4 tách hai việc: cận dưới tuyệt đối và **chặn đỉnh so với mức chung** của hồ sơ (mục 5.7); phần (b) được ghi thêm vào câu Q10 cho người dùng.

**Độ nhạy (đưa vào R1):** mỗi +1% thời gian dòng món trong ca làm người TB mất khoảng **0,03 sao/khách**, người Giỏi mất khoảng **0,02 sao/khách và 1,7 điểm 5★**.

**Đọc bảng:**
1. **Người không sơ chế chơi ngang 0.5.1** ở mọi hồ sơ trong ±0,1 sao/khách, ở cả trạng thái chính lẫn trạng thái phát hành chậm nhất còn cho phép. TB nhỉnh hơn **+0,09** vì nhịp chờ gọn (người dùng chốt Q1 để bù thời gian các thao tác mới): giây mỗi dòng −2,7%, chờ món > 150% ngân sách 13,3 → 10,7%, 1–2★ 24,9 → 21,8%. Đây là hệ quả có chủ ý của Q1; câu Q10 xin người dùng xác nhận. Khóa #16 chặn **cả hai phía** để mức này không trôi thêm (mục 5.7).
2. Ẩu mất 1,5 điểm 5★ (tương đối −23%) vì có thêm thao tác để lỡ tay; sao trung bình chỉ −0,02. Câu Q9 hỏi người dùng tiêu chí "±5%" là tuyệt đối hay tương đối.
3. Ở tau 0,9 + gọn không van (bi quan), Giỏi −0,05 sao/khách, −4,3 điểm 5★; Giỏi gộp −0,053 với độ lệch giữa các bộ 0,007, nên ngưỡng −0,06 của bản v3 chỉ cách số đo khoảng 1 độ lệch chuẩn (kiểm cuối #3). Bản v4 **không** nới ngưỡng: tau 0,9 không còn là trạng thái được phát hành; ở máy chậm, van ở cổng phát hành bớt giây trong ca nên người giỏi không sơ chế về lại mức +0,03 (tau 0,85 + van mức 2).

### 5.5 Điểm, hạng, Không tì vết

**Kim lửa theo giây (phản biện vòng 2 #1).** `luaValue` cho kim chạy 1,2/chu kỳ mỗi giây, nên cùng một sai số thời gian của người chơi thì sai số giá trị tỉ lệ 1/chu kỳ. Bản v2 rút `u_phin` 6 → 5 giây mà giữ vùng, và thêm `nuong_kho_muc` chu kỳ 3; mô hình v2 (σ giá trị không đổi) không thấy cái giá này. Bản v3 sinh sai số theo giây (mục 5.1) và chỉnh:

| Thao tác | Bản v2 | Bản v3 | Vì sao |
|---|---|---|---|
| Chờ phin (`u_phin`) | chu kỳ 5, vùng [0,6; 0,8], w 3 | chu kỳ **5**, vùng **[0,58; 0,82]** (× 1,2), w 3 | Cùng độ khó **theo giây** với chu kỳ 6 cũ (σ / nửa vùng như nhau), mà mỗi ly cà phê nhanh hơn 0,6 giây so với giữ chu kỳ 6. Giữ vùng cũ: cà phê sữa đá TB hệ số 0,9 −5,7, cà phê muối −5,5 điểm Tuyệt hảo |
| Nướng khô mực (`nuong_kho_muc`) | chu kỳ 3, [0,42; 0,88], par 2 | chu kỳ **4**, **[0,36; 0,94]**, par 2,5 | Chu kỳ 3: Tây Ninh Ẩu 1,2 −6,5 điểm; chu kỳ 4 giữ vùng: −5,5. Nướng than khô mực dễ tính (cháy cạnh vẫn ăn được), nên vùng rộng là đúng nghề; w đã là 1 |
| Nén phin (`nen_phin`) | [0,32; 0,78] | **[0,36; 0,74]** | Sau khi `u_phin` theo giây, cà phê sữa đá TB 1,2 lên +5,1; nén "vừa tay" hẹp lại đưa về +3,9 mà Không tì vết vẫn trong ngưỡng (w 2 cho `u_phin` thử rồi: tệ hơn, +5,9) |
| Xé khô mực (`xe_kho_muc`) | 4 sợi | **3 sợi** | Ở khung 320 bốn sợi phải hai lượt; Tây Ninh 1 phần Ẩu tau 0,9 + gọn +13,2% (mục 5.3). Chất lượng không đổi đáng kể |

Các hiệu chỉnh khác của bản v2 giữ nguyên (bào có thước "Lượng sợi", kéo theo nhịp 60 / 110 / 175 ms, cắt thanh và rạch RMS ÷ 1,25, xé khô bò 35°, khô mực 50°, nhặt 3 mồi, vắt ráo τ 0,6 [0,62; 0,86], sữa muối chỉ chấm thiếu, ủ bột [0,14; 0,31] (v4: [0,13; 0,32]), múc chè n 1 đích × 1,7, đập khô mực [0,35; 0,85]).

**Hiệu chỉnh của bản v4** (kiểm cuối #3: hai ô của khóa #15 trượt ở bộ hạt giống độc lập; đo trên 7 bộ hạt giống × 20.000 món mỗi ô, `kq4/o81-*.txt`):

| Thao tác | Bản v3 | Bản v4 | Vì sao |
|---|---|---|---|
| Nhặt (`nhat_hat`, `nhat_rau_ram`) | Trừ 25 mỗi lần nhầm, không trần | **Mồi mờ sau 2 lần nhầm** (`params.fade = 2`): chạm nhầm lần 2 thì các mồi còn lại nhạt và không nhận chạm, trừ tối đa 50 (mục 2.3.8) | Tây Ninh Ẩu hệ số 1,2 là ô sát nhất (−4,84 trung bình 7 bộ, 2/7 bộ lẻ quá −5): người Ẩu nhầm ~ Poisson(1,39) ở mỗi thao tác nhặt, và Tây Ninh có hai thao tác nhặt, nên điểm trừ dồn. Mồi mờ chặn phần đuôi đó (Ẩu không bị trừ quá 50 một thao tác) mà không đổi người chơi kỹ (nhầm 1 lần vẫn 75, vẫn mất Không tì vết). Tây Ninh Ẩu 1,2: −4,84 → **−4,35** (7 bộ), −4,19 (3 bộ của khóa) |
| Ủ bột (`u_bot`) | [0,14; 0,31] | **[0,13; 0,32]** | Không tì vết cà phê sữa đá TB 0,9 dùng 92% ngưỡng (−2,41 / 2,63; 1/7 bộ lẻ trượt). Nới 0,01 mỗi bên đưa về −1,99 / 2,63 (76%, 7 bộ) mà Tuyệt hảo cà phê sữa đá TB 1,2 còn +4,42 (bảng dưới) |
| Đã thử, không chọn | Rau răm 2 mồi (thay 3) | — | Không tì vết bánh tráng trộn TB 1,104 +2,15 > 2,00 (trượt) |
| Đã thử, không chọn | Ủ bột [0,12; 0,33] | — | Tuyệt hảo cà phê sữa đá TB 1,2 +4,75, một bộ lẻ +5,21 (trượt) |

**Kết quả 81 ô của bản v4** (`kc4-o.mjs` → `kq4/o81-fade-ubot.txt`, `kc4-bang81.mjs` → `kq4/bang81-v4.md`; 1 phần, không ghi chú, không phạt chờ). Giá trị trong bảng là **trung bình 7 bộ hạt giống × 20.000 món = 140.000 món mỗi ô**; khóa #15 tính trên **3 bộ đầu (1000, 5000, 9000) = 60.000 món mỗi ô**:
- Khóa (3 bộ): **0/81 ô** lệch Tuyệt hảo quá ±5 điểm, **0/81 ô** lệch Không tì vết quá ±max(2 điểm; 30%). Từng bộ lẻ trong 7 bộ: **0/567** ô trượt (bản v3 trên cùng 7 bộ: 2 ô trượt Tuyệt hảo, 1 ô trượt Không tì vết).
- Lệch Tuyệt hảo lớn nhất (3 bộ): cà phê sữa đá TB 1,2 **+4,57**; tiếp theo chè bưởi Ẩu 0,9 (−4,29), Tây Ninh Ẩu 1,2 (−4,19), chè bưởi TB 1,2 (+4,06). Không tì vết dùng nhiều nhất: cà phê sữa đá TB 0,9 −2,07 / 2,63 (**79%**).
- **Độ lệch chuẩn giữa các bộ** (mỗi bộ 20.000 món): Δ Tuyệt hảo trung bình 0,33 điểm (lớn nhất 0,81), Δ Không tì vết 0,24 (lớn nhất 0,82); của trung bình 3 bộ thì chia √3. **Biên nhỏ nhất** của khóa: **2,3 lần** độ lệch chuẩn (Không tì vết bánh mì ốp la TB 1,2: −1,90 / 2,50). Bảng biên ở mục 5.7.
- Các mức Van gọn bếp (mục 8.5; `kq4/o81-van-d.txt`, `o81-van-a.txt`, 3 bộ): mức 1 (bỏ nén phin) và mức 2 (bỏ thêm kẹp ổ bánh) cũng **0/81**, từng bộ lẻ 0/243; biên nhỏ nhất 2,3σ (mức 1), 3,2σ (mức 2).

| Món | Hồ sơ | Tuyệt hảo 0.5.1 → 0.5.4 (Δ): hệ số 0,9 | 1,104 | 1,2 | Không tì vết 0.5.1 → 0.5.4: 0,9 | 1,104 | 1,2 |
|---|---|---|---|---|---|---|---|
| Bánh mì ốp la | TB | 38,1 → 35,6 (−2,6) | 51,8 → 52,1 (+0,2) | 57,3 → 58,7 (+1,3) | 2,6 → 1,8 | 6,1 → 4,6 | 8,3 → 6,5 |
| Bánh mì ốp la | GI | 81,1 → 85,0 (+3,9) | 89,4 → 92,5 (+3,1) | 91,7 → 94,2 (+2,5) | 25,2 → 21,4 | 39,6 → 35,4 | 45,4 → 41,7 |
| Bánh mì ốp la | AU | 4,3 → 2,4 (−1,8) | 8,2 → 5,6 (−2,6) | 10,3 → 7,6 (−2,7) | 0,0 → 0,0 | 0,1 → 0,1 | 0,2 → 0,1 |
| Bánh mì trứng gà ta | TB | 31,5 → 29,9 (−1,6) | 46,5 → 47,0 (+0,5) | 52,6 → 54,5 (+1,9) | 1,0 → 0,8 | 2,7 → 2,5 | 4,0 → 3,7 |
| Bánh mì trứng gà ta | GI | 80,0 → 84,2 (+4,2) | 89,6 → 92,5 (+2,9) | 92,1 → 94,4 (+2,2) | 14,8 → 14,7 | 26,8 → 27,8 | 32,8 → 34,1 |
| Bánh mì trứng gà ta | AU | 2,3 → 1,3 (−1,0) | 4,9 → 3,4 (−1,5) | 6,6 → 5,0 (−1,6) | 0,0 → 0,0 | 0,0 → 0,0 | 0,0 → 0,0 |
| Trà tắc | TB | 51,7 → 51,2 (−0,5) | 57,8 → 59,9 (+2,0) | 60,3 → 62,9 (+2,6) | 2,9 → 2,9 | 5,2 → 5,6 | 6,5 → 7,3 |
| Trà tắc | GI | 86,9 → 88,4 (+1,5) | 88,7 → 90,3 (+1,6) | 89,0 → 91,0 (+2,0) | 24,5 → 25,8 | 35,1 → 37,3 | 39,1 → 41,6 |
| Trà tắc | AU | 7,2 → 4,8 (−2,4) | 9,6 → 7,3 (−2,3) | 10,7 → 8,9 (−1,8) | 0,1 → 0,0 | 0,1 → 0,1 | 0,2 → 0,1 |
| Trà tắc mật ong rừng | TB | 40,0 → 38,6 (−1,4) | 53,7 → 55,1 (+1,4) | 59,3 → 61,8 (+2,5) | 2,0 → 2,1 | 4,3 → 4,8 | 5,7 → 6,3 |
| Trà tắc mật ong rừng | GI | 87,1 → 88,7 (+1,6) | 93,4 → 94,9 (+1,5) | 95,0 → 96,2 (+1,1) | 20,8 → 22,0 | 33,6 → 35,6 | 38,8 → 41,3 |
| Trà tắc mật ong rừng | AU | 5,9 → 3,8 (−2,1) | 10,0 → 7,4 (−2,6) | 12,3 → 9,3 (−3,0) | 0,1 → 0,0 | 0,2 → 0,1 | 0,2 → 0,1 |
| Bánh tráng trộn | TB | 65,2 → 66,0 (+0,8) | 77,0 → 76,1 (−0,9) | 80,0 → 78,5 (−1,5) | 0,5 → 1,5 | 2,1 → 3,6 | 3,5 → 4,7 |
| Bánh tráng trộn | GI | 95,1 → 95,8 (+0,7) | 96,9 → 96,9 (+0,0) | 97,0 → 97,1 (+0,1) | 19,3 → 23,4 | 40,0 → 37,0 | 47,9 → 41,2 |
| Bánh tráng trộn | AU | 4,4 → 3,6 (−0,8) | 10,9 → 7,9 (−3,1) | 14,0 → 10,0 (−4,1) | 0,0 → 0,0 | 0,0 → 0,0 | 0,0 → 0,0 |
| Bánh tráng trộn Tây Ninh | TB | 69,6 → 69,8 (+0,2) | 79,2 → 79,2 (−0,1) | 80,7 → 81,3 (+0,6) | 0,4 → 1,1 | 1,7 → 2,6 | 2,9 → 3,5 |
| Bánh tráng trộn Tây Ninh | GI | 95,6 → 96,6 (+1,1) | 96,4 → 97,3 (+0,9) | 96,5 → 97,4 (+0,9) | 17,7 → 21,0 | 37,1 → 33,8 | 44,1 → 37,6 |
| Bánh tráng trộn Tây Ninh | AU | 4,9 → 2,9 (−2,0) | 10,3 → 6,9 (−3,5) | 13,2 → 8,8 (−4,3) | 0,0 → 0,0 | 0,0 → 0,0 | 0,0 → 0,0 |
| Cà phê sữa đá | TB | 59,7 → 59,6 (−0,1) | 68,4 → 71,6 (+3,1) | 71,2 → 75,6 (+4,4) | 8,8 → 6,8 | 15,9 → 13,9 | 19,3 → 17,7 |
| Cà phê sữa đá | GI | 90,9 → 93,8 (+2,9) | 93,3 → 96,2 (+2,9) | 94,2 → 96,8 (+2,7) | 42,0 → 43,8 | 59,4 → 59,1 | 64,3 → 64,2 |
| Cà phê sữa đá | AU | 9,4 → 8,1 (−1,4) | 14,2 → 13,7 (−0,5) | 16,4 → 16,7 (+0,4) | 0,2 → 0,1 | 0,7 → 0,4 | 1,0 → 0,6 |
| Cà phê muối | TB | 67,5 → 66,8 (−0,7) | 80,8 → 81,0 (+0,2) | 84,6 → 85,1 (+0,5) | 5,2 → 3,8 | 11,0 → 9,5 | 14,0 → 12,8 |
| Cà phê muối | GI | 96,6 → 96,8 (+0,2) | 97,6 → 97,6 (+0,1) | 97,7 → 97,7 (+0,0) | 34,9 → 36,7 | 54,5 → 54,1 | 60,1 → 60,0 |
| Cà phê muối | AU | 9,9 → 8,1 (−1,9) | 18,9 → 16,7 (−2,2) | 23,7 → 21,7 (−2,0) | 0,1 → 0,0 | 0,3 → 0,1 | 0,5 → 0,3 |
| Chè bưởi | TB | 55,1 → 56,3 (+1,3) | 67,5 → 71,2 (+3,7) | 71,9 → 76,0 (+4,1) | 3,1 → 2,6 | 7,4 → 6,9 | 10,1 → 9,9 |
| Chè bưởi | GI | 92,8 → 94,8 (+2,1) | 96,0 → 96,9 (+0,9) | 96,6 → 97,2 (+0,6) | 31,9 → 33,1 | 49,1 → 51,6 | 55,6 → 57,9 |
| Chè bưởi | AU | 14,3 → 10,1 (−4,3) | 22,8 → 19,0 (−3,8) | 26,9 → 23,9 (−3,0) | 0,1 → 0,0 | 0,2 → 0,1 | 0,3 → 0,2 |

**Trung bình 9 món** (7 bộ): TB hệ số 0,9 / 1,104 / 1,2: Tuyệt hảo 53,1 → 52,6% / 64,8 → 65,9% / 68,7 → 70,5%, Không tì vết 2,9 → 2,6% / 6,3 → 6,0% / 8,3 → 8,0%; Giỏi 1,104: 93,5 → 95,0%, Không tì vết 41,7 → 41,3%; Ẩu 1,104: 12,2 → 9,8%, Không tì vết 0,2 → 0,1%; Hỏng không đổi (TB 0,2%, Ẩu 5,3%).

**Trong ca 15 ngày** (đơn và thực đơn thật; kịch bản chính, ngày 4–15, gộp 3 bộ; `gop-chinh.txt`): Tuyệt hảo TB 62,4 → 63,3% (không sơ chế) → 71,6% (có sơ chế); Giỏi 91,6 → 93,6 → 95,8%; Ẩu 9,7 → 7,7 → 12,4%. Không tì vết TB 6,2 → 6,1 → 6,7%, Giỏi 41,7 → 41,0 → 42,7%, Ẩu 0,2 → 0,1 → 0,1%. Q trung bình TB 89,5 → 89,5 → 91,3. Hỏng không đổi.

**Không tì vết: luật D** (người dùng chốt Q3): "mọi thao tác ≥ 90, được trượt đúng một thao tác nhỏ — w = 1, không phải bước Chọn, không chí mạng — ở mức 85–89". Các điều kiện còn lại giữ nguyên: không lỗi nguyên liệu, không Tự làm, không Làm lại, không Hỗ trợ thao tác, không hỏng bước chí mạng, không bước `staff`, **không bước chưa bốc**. Thưởng cấp món không đổi Không tì vết. Màn Ra món ghi "Không tì vết (trượt nhẹ: Khều hạt 87)".

**Người Ẩu (phản biện vòng 2 #6).** Trong ca, Tuyệt hảo của Ẩu 9,7 → 7,7% (−2,0 điểm, tương đối −21%), 5★ 6,4 → 4,9%; có sơ chế thì 12,4% và 8,3%. Thao tác nhặt (3 mồi): số lần nhầm của Ẩu ~ Poisson(1,39), chỉ 25% số lần không nhầm; từ v4 mồi mờ sau 2 lần nhầm nên một thao tác nhặt trừ tối đa 50. Khóa #15 dùng **điểm tuyệt đối** (±5) như mọi bản trước; nếu người dùng muốn tương đối, phương án ở câu Q9.

**Nguồn số duy nhất.** Tuyệt hảo và Không tì vết một món: `kiem-cuoi/v4/kq4/bang81-v4.md` (7 bộ), khóa #15 trên 3 bộ đầu. Trong ca: `kiem-cuoi/v4/kq4/gop-*.txt`.

### 5.6 Ca bán có sơ chế

**Mục tiêu lợi (người dùng chốt Q6):** trung bình ngày 4–15, sao/khách có sơ chế − không sơ chế: **TB +0,45 … +0,61; Giỏi +0,04 … +0,08**. Người không sơ chế ngang bản hiện tại (mục 5.4). Ẩu người dùng không nêu; thiết kế đòi Ẩu không bị thiệt (≥ −0,02) và không vượt TB. Từ v4 mục tiêu áp cho **mọi trạng thái được phát hành**, không có ngoại lệ (kiểm cuối #1).

**Các cấu hình đã thử** (kịch bản chính, ngày 4–15, lõi thật). Dòng ghi "(v3)" là số của bản v3 (1 bộ; dòng thăm dò 100 hạt giống chạy trước khi chốt `u_phin` chu kỳ 5 và `nen_phin`, chênh với dòng 300 hạt giống cùng cấu hình ≤ 0,01 sao); dòng v4 ghi số bộ:

| Cấu hình (mọi dòng có bốc hộp 1 chạm và thưởng cấp món, trừ khi ghi khác) | TB: Δ sao/khách (ngày thấp nhất … cao nhất) | Giỏi | Ẩu | Buổi sáng TB (giây) |
|---|---|---|---|---|
| 1 ô thùng đá + 1 hũ (số ô của bản v2) (v3) | +0,21 (+0,15 … +0,38) | +0,04 | +0,02 | 25 |
| 2 ô + 1 hũ (v3) | +0,36 (+0,28 … +0,49) | +0,06 | +0,02 | 35 |
| 2 ô + 2 hũ (v3) | +0,35 (+0,24 … +0,49) | +0,06 | +0,04 | 49 |
| 3 ô + 1 hũ, từ ngày 2 (v3) | +0,54 (+0,41 … +0,62) | +0,06 | +0,03 | 44 |
| 2 → 3 ô (ngày 5), 1 → 2 hũ (ngày 7) (v3) | +0,53 (+0,45 … +0,60) | +0,07 | +0,04 | 54 |
| **Chọn: 2 ô (ngày 2–4), 3 ô (từ ngày 5), 1 hũ** (v4, 3 bộ × 300; sd giữa các bộ 0,005 / 0,005 / 0,005) | **+0,534 (+0,46 … +0,58)** | **+0,069 (+0,05 … +0,10)** | **+0,022 (−0,03 … +0,07)** | **43** (ngày 2–15: 41) |
| Chọn, bỏ thưởng cấp món và điểm hộp (chỉ phần thời gian) (v4, 1 bộ) | +0,439 | +0,053 | −0,046 | 43 |
| Chọn, chỉ dùng thùng đá (không làm hũ) (v3) | +0,509 | +0,068 | +0,003 | 28 |
| Chỉ làm hũ (không thùng đá) (v4, 1 bộ) | +0,023 | +0,005 | +0,018 | 15 |
| Chỉ làm hũ, "Vị nhà làm" mạnh hơn (+2 … +5; 150 hạt giống) (v3) | +0,025 | −0,001 | +0,025 | 15 |
| Chọn + nhiệm vụ "Trứng cút luộc, ngâm nước đá" ngày 5, 10, 15 (v4, 1 bộ; mục 4.9) | +0,496 (+0,33 … +0,58) | +0,063 | +0,023 | 42 |
| Chọn, **tau 0,75** + gọn, không van (v4, 3 bộ) | +0,532 | **+0,110** | +0,036 | 43 |
| Chọn, **tau 0,9** + gọn, không van (v4, 3 bộ) | +0,538 (+0,48 … +0,61) | **+0,155** (+0,09 … +0,19) | +0,056 | 43 |
| Chọn, tau 0,85 + gọn + **van mức 2** (v4, 3 bộ; mục 8.5) | +0,547 (+0,43 … +0,60) | +0,071 (+0,06 … +0,10) | +0,017 | 43 |

**Lợi của người giỏi khi máy chậm** (kiểm cuối #1). Ở tau cao, người giỏi không sơ chế mất giây ở mỗi thao tác nối (Giỏi không sơ chế tau 0,9: −0,053 sao, 5★ −4,3 điểm so với 0.5.1), và hộp sơ chế trả lại đúng phần giây đó (một hộp thay cả trạm, bỏ luôn các khoảng nối), nên lợi sơ chế của Giỏi tăng theo tau: +0,069 (0,6) → +0,078 (0,65; 1 bộ) → +0,090 (0,7; 1 bộ) → +0,110 (0,75) → +0,155 (0,9). Thưởng cấp món và số ô thùng đá **không** kéo phần này xuống (đã đo ở tau 0,9: thưởng chỉ từ Q mẻ ≥ 90 → +0,140; ô thứ 3 mở từ ngày 8 → +0,138; chỉ 2 ô → +0,136 nhưng TB rơi ra khỏi dải, +0,36). Chỉ **bớt giây trong ca** mới kéo được, nên bản v4 đặt **quy trình van** ở cổng máy thật (mục 8.5) và bỏ "ngoại lệ" Giỏi ≤ +0,16 của bản v3; câu Q11 xin người dùng xác nhận.

**Người dùng hộp được gì** (kịch bản chính, ngày 4–15, TB, gộp 3 bộ): sao 3,39 → 3,92; 5★ 17,9 → 32,1%; 1–2★ 21,8 → 8,6%; chờ món > 150% ngân sách 10,7 → 1,7%; phạt chờ gọi món 49,3 → 41,2%; khách mỗi ca 6,85 → 7,27 (+6,1%); giây mỗi dòng −12,5% so với không sơ chế; Tuyệt hảo 63,3 → 71,6%; Q 89,5 → 91,3. Giỏi: 5★ 79,8 → 85,6%, phạt chờ gọi món 14,2 → 10,6%.

**Lợi chia giữa "nhanh hơn" và "ngon hơn"** (phản biện vòng 2 #3; so dòng "Chọn" với dòng "chỉ phần thời gian", cùng bộ hạt giống): TB +0,439 do thời gian (**83%**), +0,092 do điểm hộp và thưởng cấp món (**17%**); Giỏi 0,053 / 0,011 (83% / 17%); Ẩu −0,046 / +0,073 (người Ẩu vốn đã nhanh, chỉ được phần ngon hơn). Bản v2: phần ngon hơn gần như 0 (Tuyệt hảo TB +0,8 điểm).

**Hũ nhà làm (phản biện vòng 2 #2).** "Vị nhà làm" cộng thẳng Q món (+2,6 trung bình mỗi món dùng hũ ở TB) và hiện rõ trên màn Ra món, nhưng chỉ món bánh tráng (và chè bưởi ngày sự kiện) dùng hũ, và sao của TB bị giới hạn bởi thời gian chờ, nên **lợi sao của hũ nhỏ**: chỉ hũ TB +0,02, Giỏi ≈ 0, Ẩu +0,02 sao/khách; Tuyệt hảo TB 63,4 → 65,5%. Thử "Vị nhà làm" mạnh hơn (+2 … +5) gần như không đổi (+0,025). Vì vậy bản thiết kế **không hứa** hũ là đường lợi sao; hũ là chỗ người chơi gặp băm, chặt, giã, nạo, phi, rang với phần thưởng thấy được (tem "Vị nhà làm", Tuyệt hảo cao hơn, nhiệm vụ ngày "Làm một hũ nhà làm hạng Tốt"). Người chơi chỉ tính sao có thể bỏ hũ; khi đó các phương thức này gặp 0% số ngày. Điều này được ghi thẳng trong thông báo cho người dùng ở mục 10.2.

**Tần suất gặp từng phương thức theo cách chơi** (người chơi TB, % số ngày 2–15 có gặp ít nhất một lần; `tien-tan-suat.mjs` → `kq4/tien-tan-suat-v4.txt`; v4 không đổi so với v3 trừ dòng Ngâm):

| Phương thức | Bỏ qua màn sáng | Chỉ thùng đá | Thùng đá + hũ xoay vòng (mặc định của mô hình) | Ghi chú |
|---|---|---|---|---|
| Cắt thanh, rạch, kéo theo nhịp, bào xoài, xé, bóc 2 nhịp, vắt, nhặt | 86–99% (trong ca) | 86–100% (trong ca hoặc ở mẻ) | như cột bên | Bánh mì, trà tắc từ ngày 1; bánh tráng từ ngày 3 |
| **Băm** | 0% | 0% | **57%** | Hành tỏi phi, Sa tế |
| **Phi** | 0% | 0% | **57%** | |
| **Giã, rang** | 0% | 0% | **36%** | Đậu phộng |
| **Chặt** (khúc sả) | 0% | 0% | **29%** | Sa tế (HB); bổ dừa chỉ ở ngày chè bưởi |
| **Đập dập** | 0% (Tây Ninh: chỉ ngày có món hiếm) | 0% | **29%** | Hành tỏi phi |
| **Thái lát** (hành tím, dao theo nhịp) | 0% | 0% | **29%** | Cách đúng duy nhất của "thái lát" ở Chặng 1 |
| **Ngâm** | 0% | 0% | 0%; **21%** nếu làm nhiệm vụ "Trứng cút luộc, ngâm nước đá" mỗi lần nó ra (v4) | Trứng cút tiết kiệm ít giây hơn tắc, xoài nên người chơi tính giây không chọn cho ô thứ 3; mẻ ngâm chính (đồ chua) đã sang Chặng 2 |
| **Nạo** | 0% | 0% | 0% | Nước cốt dừa, chỉ ở chè bưởi (món sự kiện 20/11) |
| **Hạt lựu** (hai lượt, xoay thớt) | 0% | 0% | 0% | Cùi bưởi, chỉ ở chè bưởi (món sự kiện) |
| **Thái sợi** (cách đúng) | 0% | 0% | 0% | Q2 đổi xoài sang bào sợi; "Thái sợi" chỉ còn là lựa chọn sai trên bảng chọn cách (có Mẹo nghề giải thích); thái sợi đúng để dành Chặng 2 |

**Tiền và buổi sáng** (TB, ngày 2–15, v4): buổi sáng 40,6 giây; trả trước khoảng **14.900đ**, bỏ thừa khoảng **5.000đ** mỗi ngày (phần A dùng 7,3, bỏ 3,8 phần mỗi ngày); hũ dùng 2,5 phần mỗi ngày (0đ). Mẻ người chơi chọn: Rau bánh mì 100% số ngày, Xoài bào 93%, Tắc cắt đôi 86%, hũ xoay vòng Đậu phộng 36%, Hành tỏi phi 29%, Sa tế 29%; có làm nhiệm vụ trứng cút thì Trứng cút 21%, Tắc cắt đôi 64%.

**Rủi ro lợi cộng dồn** (mối lo của phản biện vòng 1 #5): với người TB đang quá tải, giây bớt được thành sao, sao thành thêm khách (+6,1% khách mỗi ca). Người dùng đã chốt mức lợi này ("Lợi rõ, theo dõi sau"); bản thiết kế **không** hãm thêm mà đưa vào rủi ro R3 với kế hoạch theo dõi sau phát hành (mục 10.1).

### 5.7 Bảng khóa cân bằng mới (`tests/unit/m54-balance.test.mjs`)

`m5-balance.test.mjs` hiện khóa bảng bước 0.4.1/0.5.1, Σpar không đổi và `STATE_VERSION === 3`. Bảng này **bị thay có chủ ý**: phần "BALANCE không đổi", "ghi chú vá", "SCALE_KEYS", "mốc trừ quá giờ" chuyển sang tệp mới; `m5-balance` chỉ còn khóa lịch sử (bảng `V041` dùng làm nguồn kiểm `pace` và kiểm đủ 63 id cũ). Các khóa dùng mô phỏng (#5, #15–#17) gọi `tools/mo-phong-bep/` bản rút gọn với **hạt giống cố định**, **chạy ca bằng các hàm lõi thật** (như `mo-phong-v3b/ca.mjs`) và **gọi đúng `METHOD_SPECS`, hàm chấm, dữ liệu thật của repo** (mục 8.4).

| # | Khóa | Giá trị |
|---|---|---|
| 1 | Bảng từng bước của 9 món (id, thứ tự, type, skin, params 1 phần, par, w, critical, retryCost, after, ing, tram, box, method) | Đúng bảng mục 3.2 (hằng `V054` chép trong test) |
| 2 | Id cũ | Đủ 63 id của `V041`; đúng 3 bước đổi loại; đúng 11 id mới; `cat_hanh` chỉ có trong `MORNING_OPS` |
| 3 | `pace` | Mảng par 0.5.1 của từng món; `linePace` = `linePar` 0.5.1 cho 9 món × mọi tập ghi chú (≤ 2, khác nhóm) × qty 1..3, **so bằng tuyệt đối** |
| 4 | Tổng mỗi món [Σpar mới, Σpace, Σw, giá, vốn] | bánh mì ốp la [21,5, 22, 11, 20000, 9000] · trà tắc [19,5, 18, 10, 10000, 3000] · bánh tráng trộn [31,5, 31, 13, 20000, 8000] · cà phê sữa đá [21,5, 20, 13, 15000, 5000] · chè bưởi [28, 27, 13, 15000, 5000] · trà tắc mật ong rừng [20,5, 19, 10, 15000, 6000] · bánh mì trứng gà ta [25,5, 26, 12, 25000, 11000] · bánh tráng trộn Tây Ninh [**36**, 34, 16, 25000, 12000] · cà phê muối [27,5, 26, 17, 20000, 6000] |
| 5 | Trần thời lượng | Σpar mới ≤ 1,2 × Σpace. `dishTimeModel` (có lượt trượt vào 0,45 giây) cho **9 món × TB / Giỏi / Ẩu × qty 1..3 × {không ghi chú, từng ghi chú, cặp ghi chú}** ở khung rộng **và** khung 320: tau 0,6 + gọn ≤ 1,08 × mô hình 0.5.1; tau 0,9 + gọn ≤ 1,12 ×; tau 0,9 không gọn ≤ 1,20 ×; và bằng bảng 5.3 ± 0,1 giây. Mô phỏng ca rút gọn (100 hạt giống, ngày 4–15): giây mỗi dòng món trong ca ≤ 1,02 × 0.5.1 ở mỗi hồ sơ (tau 0,6 + gọn) |
| 6 | Sàn giờ | `MIN_LIMIT` 19 loại (+ chế độ thái, hàm sàn của vắt, **lượt của xé**) = bảng 2.0.7; mọi bước × 1–3 phần × mọi ghi chú: `overtimeAt` ≥ sàn, ≥ 2·par, ≤ giới hạn giờ; `stepTimeSec × 1,3 ≤ giới hạn`; bước mới hoặc đổi loại: cả `stepTimeSec × 1,12 × 1,3 ≤ giới hạn`, ở khung rộng và khung 320 |
| 7 | Tham số đếm | `SCALE_KEYS` = n, N, cuts, strokes, turns, strips, **hits, strands** |
| 8 | Ghi chú vá, bỏ | Thêm trứng → `dap_trung.n` 3; Ít đá → `them_da.n` 1; Thêm trứng cút → `boc_trung_cut.spots` 5; Không rau răm bỏ `nhat_rau_ram` và `tron` vẫn mở được; "Không hành" không bỏ bước nào nhưng `kep_banh` không rắc hành |
| 9 | `BALANCE` cũ không đổi | Như `m5-balance.test.mjs:200-215`, trừ dòng `STATE_VERSION` |
| 10 | `BALANCE` mới | `morning: { fromDay: 2, iceSlots: [[2, 2], [5, 3]], jarSlots: [[2, 1]], sizes: [4, 8], roundPortions: 4, round2Speed: 0.9, boxBonus: [[95, 3], [90, 2], [85, 1]], jarBonus: [[95, 4], [88, 3], [80, 2], [70, 1]], dishBonusMax: 5, staffCap: 88, takeTapMs: 600 }`, `flawlessSlip: { w: 1, min: 85 }`, `roundSec: 0.45`; **v4:** `kitchen: { trim: 0 }` (mức Van gọn bếp, khóa #19) |
| 11 | Đồ sơ chế | **12 mục (8 A, 4 B)**, không có `do_chua_nha`, `toi_bam`; giá mỗi phần loại A = `roundCost(Σ giá × qty)` = 1.000 / 1.000 / 1.500 / 2.000 / 1.000 / 1.500 / 2.000 / 0đ; loại B 0đ; `replaces` / `opFor` trỏ đúng id thao tác của đúng món; `opFor.luoc` của cùi bưởi = [`luoc`]; không đồ nào thay thao tác trong danh sách "làm tươi" (mục 4.2); không có khóa `par` |
| 12 | Phiên bản save | `STATE_VERSION === 4` |
| 13 | **Nhịp chờ gọn (Q1, bắt buộc)** | `RESULT_HOLD_MS` 700, `RESULT_HOLD_FAST_MS` 450 (giảm chuyển động 350), `REVEAL_MS` 1.600 (1.100), `STEP_CARD_AUTO_MS` 800, nút `step-next` có trong DOM của con dấu trạm; thẻ người mới hiện ở **mọi** thao tác trong 3 lần nấu đầu |
| 14 | Không tì vết | Luật D, kiểm bằng 8 ca biên: trượt 0 / 1 / 2 thao tác nhỏ; trượt 1 thao tác w ≥ 2; trượt bước Chọn; trượt ở 84; có hộp; **có bước chưa bốc** |
| 15 | **Chất lượng từng ô** | 9 món × TB / Giỏi / Ẩu × hệ số 0,9 / 1,104 / 1,2, **trung bình 3 bộ hạt giống cố định (1000, 5000, 9000) × 20.000 món = 60.000 món mỗi ô** (v4; v3 dùng một bộ), kim lửa sinh sai số theo giây (`METHOD_SPECS.lua.sample`): \|Tuyệt hảo 0.5.4 − 0.5.1\| ≤ 5 điểm; \|Không tì vết 0.5.4 − 0.5.1\| ≤ max(2 điểm; 30% của 0.5.1). Chạy ở **mức van đang áp** (khóa #19). Hiện 81/81 ở mức 0, 1 và 2; lệch Tuyệt hảo lớn nhất +4,57 (cà phê sữa đá TB 1,2); Không tì vết dùng nhiều nhất 79% ngưỡng; **biên nhỏ nhất 2,3 lần độ lệch chuẩn** của trung bình 3 bộ (bảng độ vững dưới). Thêm: Không tì vết theo **trọng số thực đơn thật** (mô phỏng ca rút gọn, ngày 4–15, không sơ chế) trong ±max(1 điểm; 15%) ở mỗi hồ sơ (hiện TB 6,2 → 6,1%, Giỏi 41,7 → 41,0%) |
| 16 | **Người không sơ chế ngang 0.5.1, hai phía** | Mô phỏng ca, TB / Giỏi / Ẩu, ở **hai trạng thái**: (a) **chính**: tau 0,6 + gọn, van 0; (b) **phát hành**: `RELEASE_TAU` (tau đo được ở cổng 8.5) + `BALANCE.kitchen.trim` (mức van đang áp); khi chưa đo, (b) = (a). **Gộp ngày 4–15:** −0,05 ≤ Δ sao ≤ +0,12, −3 ≤ Δ 5★ ≤ +5 điểm (hiện (a) +0,090 / +0,041 / −0,015 sao, +1,4 / +3,4 / −1,5 điểm; trạng thái phát hành chậm nhất còn cho phép, tau 0,85 + van mức 2: +0,104 / +0,028 / −0,017 sao, +1,6 / +2,2 / −1,0 điểm). **Từng ngày 1–15** (v4 thay ngưỡng tuyệt đối −0,10 … +0,15 / ±8 của v3 bằng hai luật): **cận dưới tuyệt đối** Δ sao ≥ −0,10 và Δ 5★ ≥ −8 điểm (bảo vệ người chơi; hiện thấp nhất Ẩu −0,04 sao, −3,3 điểm); **chặn đỉnh** so với mức gộp của chính hồ sơ đó: Δ ngày − Δ gộp ≤ +0,08 sao và ≤ +5 điểm 5★ (bắt ngày người mới, ngày mua món; hiện lớn nhất TB +0,045 sao ngày 4, TB +3,4 điểm ngày 2, Giỏi +3,3 điểm ngày 3; ở tau 0,85 + mức 2: TB +4,5 điểm ngày 2). Từng ngày chỉ kiểm ở chế độ đủ (3 bộ × 300 hạt giống; một ngày của 100 hạt giống lệch khoảng 0,03 sao, bằng nửa biên). Test rút gọn (100 hạt giống) kiểm phần gộp, cộng dung sai 0,02 sao, 1 điểm 5★. **Không còn** ngưỡng riêng cho tau 0,9 không van: trạng thái đó không được phát hành (mục 8.5) |
| 17 | **Lợi của sơ chế (dải)** | Cùng mô phỏng, ngày 4–15, Δ sao/khách (có − không sơ chế), ở **cả hai trạng thái** của #16: TB **+0,45 ≤ Δ ≤ +0,61**; Giỏi **≤ +0,08**, **không có ngoại lệ** (v4 bỏ "Giỏi ≤ +0,16 ở tau 0,9" bản v3 tự đặt; kiểm cuối #1); Ẩu −0,02 ≤ Δ ≤ TB. Ở trạng thái chính thêm: phần "ngon hơn" (Δ đủ − Δ chỉ thời gian) của TB ≥ +0,05; chỉ hũ: TB +0,01 ≤ Δ ≤ +0,06; biến thể nhiệm vụ trứng cút (mục 4.9) TB trong dải. Số đo đầy đủ (3 bộ × 300 hạt giống) phải đạt đúng ngưỡng; test rút gọn 100 hạt giống nới **±0,05** ở dải TB (+0,40 … +0,66) và +0,02 ở các ngưỡng khác. Hiện (a) +0,534 / +0,069 / +0,022, phần ngon hơn +0,092, chỉ hũ +0,023, trứng cút +0,496; tau 0,85 + van mức 2: +0,547 / +0,071 / +0,017. Tham khảo, không phát hành: tau 0,9 không van +0,538 / +0,155 / +0,056 |
| 18 | **Tiền** | Ví % 500 = 0 và "ví sau ca − ví đầu ca = lãi − trả nợ" ở mọi nhánh của mục 4.6 (kể cả bỏ món đã giữ chưa bốc, lựa chọn sự kiện ngày); dùng hết mẻ thì lãi ca bằng đúng không sơ chế; `expireMorning`: giá vốn + hao hụt = `spent` |
| 19 | **Van gọn bếp (v4)** | `BALANCE.kitchen.trim` ∈ {0, 1, 2}, mặc định **0**; bước mang trường `trim` đúng 4 bước: `nen_phin` của 2 món cà phê (`trim: 1`), `kep_banh` của 2 món bánh mì (`trim: 2`); `effectiveSteps` bỏ bước có `trim ≤ BALANCE.kitchen.trim` theo **đúng đường của bước bị ghi chú bỏ** (nối `after` qua bước bị bỏ, như `data.test.mjs:209-214`); `pace`, giá, giá vốn, `ingredients` không đổi; khóa #1, #4 so với bảng 3.2 trừ bước bị bỏ; khóa #5, #15, #16, #17 chạy ở mức đang áp; đổi mức thì tăng `RECIPES_REV` (board đang nấu dở giữ nguyên) |

**Độ vững của khóa (v4; kiểm cuối #3).** Mỗi khóa mô phỏng ghi kèm độ lệch chuẩn giữa các bộ hạt giống độc lập. Mục tiêu: mọi khóa chạy trong CI (khóa #15 trên 3 bộ; phần gộp của #16, #17 ở test rút gọn) có biên **≥ 2 lần** độ lệch chuẩn của số dùng để kiểm; sát hơn thì sửa cơ chế, không sửa ngưỡng. Phần từng ngày của #16 chỉ chạy ở chế độ đủ, lúc qua cổng 8.5 (một lần cho mỗi bản phát hành). Bảng biên hiện tại (σ1 = độ lệch chuẩn giữa các bộ, một bộ = 20.000 món mỗi ô với #15, 300 hạt giống với #16, #17; σ3 = σ1/√3 cho trung bình 3 bộ):

| Khóa, đại lượng (trạng thái) | Số đo | σ1 | Ngưỡng | Biên (theo σ của số dùng để kiểm) |
|---|---|---|---|---|
| #15 Không tì vết bánh mì ốp la TB 1,2 (ô sát nhất) | −1,90 (3 bộ) | 0,45 | ±2,50 | 2,3σ3 |
| #15 Tuyệt hảo Tây Ninh Ẩu 1,2 (ô kiểm cuối nêu) | −4,19 (3 bộ; 7 bộ −4,35) | 0,33 | ±5 | 4,3σ3 (v3: −4,67 trên 3 bộ, biên 1,7σ3; 2/7 bộ lẻ trượt) |
| #15 Không tì vết cà phê sữa đá TB 0,9 (ô kiểm cuối nêu) | −2,07 (3 bộ; 79% ngưỡng) | 0,26 | ±2,63 | 3,7σ3 (v3: −2,49 trên 3 bộ, 95% ngưỡng, biên 1,0σ3; 1/7 bộ lẻ trượt) |
| #15 Tuyệt hảo cà phê sữa đá TB 1,2 | +4,57 (3 bộ) | 0,24 | ±5 | 3,1σ3 |
| #16 TB gộp, chính | +0,090 | 0,005 | ≤ +0,12 | 10σ3 |
| #16 Giỏi 5★ gộp, chính | +3,4 | 0,25 | ≤ +5 | 11σ3 |
| #16 chặn đỉnh TB, ngày 4 | +0,045 | 0,018 | ≤ +0,08 | 3,4σ3 |
| #16 chặn đỉnh Giỏi 5★, ngày 3 | +3,3 | 0,73 | ≤ +5 | 4,0σ3 |
| #16 TB gộp, tau 0,85 + mức 2 | +0,104 | 0,004 | ≤ +0,12 | 7σ3 (test rút gọn: 5,5σ) |
| #16 chặn đỉnh TB 5★, ngày 2, tau 0,85 + mức 2 | +4,5 | 0,87 | ≤ +5 | **1,0σ3** — ô duy nhất dưới 2σ; chỉ gặp khi tau đo được ≈ 0,85; chỉ kiểm lúc qua cổng; ghi vào biên bản cổng và theo dõi sau phát hành (chỉ số 5★ ngày 2) |
| #17 TB, chính | +0,534 | 0,005 | +0,45 … +0,61 | 28σ3 |
| #17 Giỏi, chính | +0,069 | 0,0045 | ≤ +0,08 | 4,2σ3 (test rút gọn 100 hạt giống, ngưỡng +0,10: 4σ) |
| #17 Giỏi, tau 0,85 + mức 2 | +0,071 | 0,002 | ≤ +0,08 | 7σ3 |

Hai chỗ kiểm cuối nêu ở tau 0,9 (Giỏi #16 −0,060 so với ngưỡng −0,06; Giỏi #17 +0,161 so với ngưỡng +0,16) không còn trong bảng: v4 không phát hành ở tau 0,9 không van, nên không có khóa nào đặt ở đó. Khi P1/P2 viết lại bộ sinh số đo theo `METHOD_SPECS` thật (thứ tự rút số ngẫu nhiên đổi), cả bảng này chạy lại; ô nào biên < 2σ thì gói P2 báo lại để chỉnh cơ chế.

`data.test.mjs` sửa có chủ ý: `STEP_TYPES` 11 → 19; bảng món hiếm dùng Σ`pace` thay Σpar (19 / 26 / 34 / 26 giữ nguyên số); `MINIGAME_TYPES` có gợi ý cho 8 loại mới và mọi lớp vỏ mới; lược đồ `params.cut`, `trams`, `pace`; luật `after` của bước bị ghi chú bỏ (dòng 209-214) **nới** cho `nhat_rau_ram` (mục 3.1).

### 5.8 Phụ bếp M6 (để M6 hiệu chỉnh tiếp)

Thợ làm cả Thớt (chủ quán Chọn), số đo sinh theo tay nghề s bằng `skillNoise`, `skillErr`, gọi đúng hàm chấm, trần 88 mỗi thao tác, kim lửa sai số theo giây (`chay-phu-bep-v3.mjs` → `ket-qua-phu-bep-v3.md`, 4.000 món mỗi ô, hệ số 1,104):

| Món | Q s = 0,3 | s = 0,6 | s = 0,9 | Thời gian Thớt s = 0,3 / 0,6 / 0,9 (giây) |
|---|---|---|---|---|
| Bánh mì ốp la | 72,2 | 80,9 | 87,0 | 16,6 / 15,4 / 14,2 |
| Bánh mì trứng gà ta | 71,4 | 80,3 | 86,7 | 19,1 / 17,9 / 16,7 |
| Trà tắc | 78,4 | 82,9 | 86,9 | 15,3 / 13,9 / 12,6 |
| Trà tắc mật ong rừng | 78,7 | 83,4 | 87,4 | 15,5 / 14,1 / 12,8 |
| Bánh tráng trộn | 80,5 | 84,2 | 87,3 | 29,5 / 26,9 / 24,3 |
| Bánh tráng trộn Tây Ninh | 80,1 | 84,0 | 87,2 | 35,4 / 32,5 / 29,7 |
| Cà phê sữa đá | 80,3 | 84,6 | 87,7 | 18,6 / 17,3 / 15,9 |
| Cà phê muối | 81,1 | 85,1 | 88,0 | 26,9 / 24,8 / 22,8 |
| Chè bưởi | 76,0 | 83,4 | 87,9 | 23,6 / 21,8 / 20,0 |

- Thợ không bao giờ ra món Tuyệt hảo một mình (Q ≤ 88), đúng luật "Ra tay".
- Thời gian Thớt của thợ (không phụ phí giao diện, có lượt trượt vào) 13–35 giây; M6 nhân hệ số Nhanh.
- Mẻ sáng do thợ làm (`staffBatch`, trần 88): thưởng cấp món tối đa +1 (hộp) / +3 (hũ) — chỗ M6 nên cho thuê "phụ bếp sáng".
- Hiệu chỉnh cuối theo bảng "Kỹ" của M6 (Kỹ 1–5 ↔ 70 / 74 / 78 / 82 / 85; mỗi loại lệch ≤ 8) làm ở gói P1 và khóa ở `m54-methods`.

### 5.9 Phương án đã loại và độ nhạy

| Thử | Kết quả | Quyết định |
|---|---|---|
| Đồ chua nhà làm ở Chặng 1 (bản v2) | Trái quyết định người dùng (Q4/Q5) | Chặng 2 (mục 4.12) |
| Mức lợi TB ≤ +0,20 (bản v2: 1 ô + 1 hũ) | Trái quyết định người dùng (Q6: +0,45 … +0,61); lõi thật + thưởng: +0,21 | 2 → 3 ô + 1 hũ: +0,53 |
| `u_phin` chu kỳ 5 giữ vùng [0,6; 0,8] (bản v2) | Kim lửa theo giây: cà phê sữa đá TB 0,9 −5,7, cà phê muối TB 0,9 −5,5 điểm Tuyệt hảo | Vùng × 1,2 |
| `u_phin` giữ chu kỳ 6 (đề xuất 1 của phản biện) | Đạt 81 ô nhưng mỗi ly cà phê +0,6 giây; Giỏi không sơ chế ở tau 0,9 + gọn −0,067 sao, −5,3 điểm 5★ | Chu kỳ 5 vùng × 1,2 (cùng độ khó theo giây) |
| `nuong_kho_muc` chu kỳ 3 / chu kỳ 4 giữ vùng | Tây Ninh Ẩu 1,2: −6,5 / −5,5 điểm | Chu kỳ 4, [0,36; 0,94] (−4,8) |
| `u_phin` w 2 | Cà phê sữa đá TB 1,2 +5,9 | w 3, nén phin [0,36; 0,74] |
| Thẻ người mới chỉ ở thao tác đầu trạm (bản v2) | Giỏi 5★ ngày 3 +13,7 điểm, TB sao ngày 3 +0,23 | Mọi thao tác, 0,8 giây |
| Bố cục một màn của bản v2 (6 đích nhặt, 6 vạch thái, mỗi ổ rạch riêng) + 0,45 giây mỗi lượt | Tau 0,9 + gọn khung 320: 7–13 ô > +12% | Nhặt ≤ 9, thái ngắm ≤ 9, rạch ≤ 3 ổ một màn; xé khô mực 3 sợi |
| Hũ cộng điểm vào một thao tác (bản v2) | Lợi gần 0 kể cả mẻ hoàn hảo (Q món +0,4 … +1,2) | "Vị nhà làm" cộng thẳng Q món; nhiệm vụ ngày |
| "Vị nhà làm" mạnh hơn (+2 … +5) | Chỉ hũ TB +0,025 thay +0,022 | Giữ +1 … +4 |
| 2 hũ | Buổi sáng +11 … +14 giây, lợi gần như không đổi | 1 hũ |
| Bốc hộp chỉ ở giao diện (bản v2) | Bỏ qua được: không chạm trạm "Có sẵn" vẫn xong | `takeBox` ở lõi |
| Nhặt trừ dồn (v3) | Tây Ninh Ẩu 1,2 −4,84 (7 bộ), 2/7 bộ lẻ trượt | **Mồi mờ sau 2 lần nhầm** (v4): −4,35 (7 bộ), 0/7 bộ trượt |
| Rau răm 2 mồi (thay mồi mờ) | Không tì vết bánh tráng trộn TB 1,104 +2,15 > 2,00 | Không chọn |
| Ủ bột [0,12; 0,33] | Tuyệt hảo cà phê sữa đá TB 1,2 +4,75, một bộ lẻ +5,21 | [0,13; 0,32] |
| "Ngoại lệ có chủ ý" Giỏi ≤ +0,16 ở tau 0,9 (v3) | Trái mức người dùng chốt (Q6), chưa hỏi | Bỏ; van ở cổng phát hành (mục 8.5), câu Q11 |
| Van cho người giỏi ở máy chậm bằng thưởng hoặc số ô (gợi ý của kiểm cuối) | Tau 0,9: thưởng chỉ từ Q ≥ 90 → Giỏi +0,140; ô thứ 3 từ ngày 8 → +0,138; chỉ 2 ô → +0,136 (TB +0,36, ra khỏi dải); cộng vào van mức 2 cũng không đổi (+0,084) | Không dùng: lợi của Giỏi ở máy chậm là giây, không phải thưởng |
| Van bỏ "Ngắt lá rau răm" (một mình, hoặc cùng kẹp ổ bánh, hoặc cùng nén phin) | Giỏi +0,066 … +0,072 nhưng ngày 3 (mua bánh tráng trộn) nhô: TB +0,16 … +0,20 sao, Giỏi +8,4 … +9,5 điểm 5★ (trượt chặn đỉnh #16) | Không dùng; rau răm giữ ở mọi mức van |
| Van bỏ thêm "Xẻ dọc ổ bánh" hoặc "Ủ bột" (trên mức 2) | Giỏi +0,059 … +0,061 nhưng TB không sơ chế +0,144 … +0,151 (trượt #16 trên) | Không dùng |
| Ngâm dưa leo nước đá ở mẻ Rau bánh mì (gợi ý của kiểm cuối cho phương thức ngâm) | Thêm giây vào mẻ chọn 100% số ngày cho việc người bán bánh mì ít làm (HB) | Nhiệm vụ trứng cút (mục 4.9) |
| Bản 1: cắt hành lá trong ca; vắt 3 lần mỗi ly; múc 2 vá; thả đá giữ nút Xong; thái nhịp cho mọi nhát; giã trong ca; bào đủ lượt tự xong; "Tách béo" | Xem bản v2 mục 5.9 | Giữ quyết định của bản v2 |

---

## 6. Lõi và save

### 6.1 Thay đổi theo tệp

Số dòng dẫn theo `89ec66d`/`5970a06`; mọi gói **dò lại số dòng sau khi Đợt 3 gộp**.

| Tệp | Thay đổi |
|---|---|
| `src/core/kitchen.js` | `SCALE_KEYS` + `hits`, `strands` (`:11`). **`linePar`** (`:65`): có `Array.isArray(recipe.pace)` thì `Σ round(p × (1 + 0,4(qty − 1)) × 10) / 10` theo `pace`, không thì như cũ; `linesPar` dùng lại — `customer.js`, `order.js` **không sửa dòng nào**. `effectiveSteps`: giữ nguyên ngữ nghĩa, chép thêm `tram`. **`submitChon`** (`:282`): gọi `planBoxes` (morning.js) trước vòng giá vốn; giá vốn tính như không hộp rồi **trừ `qty × box.p`** cho mỗi hộp A dùng được (kẹp ≥ 0, mục 4.6); **chỉ giữ phần** (`sh.morning.boxes[k].used += qty`, `left −= qty`), ghi `cook.boxUse = [{ box, portions, value, tram, taken: false }]`, cộng "Vị nhà làm" của hũ vào `cook.dishBonus`; **không điền bước**. Hàm mới **`takeBox(state, tramId, ctx)`**: điền `cook.steps[id]` từ hộp cho các bước của trạm có trong `replaces` (điểm từng thao tác của mẻ, `opFor`), phát `step.done { prepped }`, cộng "Sơ chế khéo" vào `cook.dishBonus` (trần `dishBonusMax`), đặt `taken`; gọi lần hai không làm gì. `availableSteps` (`:354`) **không** coi bước có hộp là xong trước khi bốc. `boardSteps` (`:371`) trả thêm `tram`, `prepped`, `box` (`{ id, q, taken }`); `canAuto` giữ luật w = 1 và thêm "không có hộp". `submitStep` (`:400`): `details.fast` không đổi điểm. `retryStep` từ chối bước `prepped` (`khong_lam_lai`). `finishDish` (`:473`): bước đã bốc vào danh sách điểm như bước đã làm (không `bo_qua`, không `chua_so_che`); hộp giữ mà chưa bốc: bước tính như bỏ, `wasted += portions`; truyền `bonus: cook.dishBonus` cho `dishQuality`; ghi `dish.prepped`, `dish.bonus`. **`abandonDish`** (`:527`): phần đã bốc → `sh.morning.boxes[k].wasted += portions`; phần giữ chưa bốc → trả lại hộp (`left += portions`, `used −= portions`); không dựa vào `cook.boxUse` vì phiên nấu bị xóa ở `:545` (bỏ món) và `:684` (giao món). Hàm thuần mới: `tramsOf(cook, recipe)` (thứ tự ô, trạng thái `mo` / `khoa` / `dang` / `xong` / `san`; board không có `tram`: mỗi bước một trạm, chỉ dùng cho lõi), `nextInTram(state, stepId)`, `tramScore(cook, recipe, tramId)`. **v4 (Q2):** `submitStep` chọn sai cách gọi thêm `unlockTip(state, 'sai_cach:' + stepId, ctx)` (trước dòng `:430`); `submitChon` dựng board mới gọi `unlockTip(state, 'cach_moi:' + id, ctx, { capExempt: true })` cho bước có trong `state.newWays` (cạnh `:347`); `finishDish` trừ `state.newWays` (mục 4.8). `takeBox` nhận `ctx.staff` (phụ bếp bốc, mục 6.6). **v4 (van):** `effectiveSteps` bỏ bước có `trim ≤ BALANCE.kitchen.trim` theo đúng đường của bước bị ghi chú bỏ (nối `after`; khóa #19) |
| `src/core/minigame-scoring.js` | Mới: `timingScore` (ngưỡng 60 / 110 / 175 ms × mul), `scoreThaiNhip` (khoảng giữa hai nhát), `scoreThaiDuong` (thanh, rạch: RMS ÷ 1,25, độ phủ, vạch đỏ), `scoreBam`, `scoreChat`, `scoreDapDap`, `scoreGia` (theo kết quả), `scoreXe` (`strandScore`, đúng công thức mục 2.3.5), `scoreBao` (có `zone` "Lượng sợi"), `scoreVat`, `scoreNhat`. Sửa: `scoreCha` thêm `holes` (−15), `scoreXoay` thêm chế độ `zone` (nhấc tay; `oneSided`; "Tách béo" ≤ 40 chỉ khi `split`), `scoreRot` thêm trần "Ngập bột" 70 khi có `bloom`, `scoreBay` nhận `light`, `scoreChat` lớp `dua` không có kẹt dao, `scoreBao` lớp `nao` trừ lấn viền nâu. `MIN_LIMIT` đủ 19 loại có `alt`, `mode`, hàm sàn của `vat` (mục 2.0.7); `minLimitSec(type, params)` đọc `alt` / `mode` / `tau` / `zone`; `overtimeAtStep(step)`. Quy ước giữ: đầu vào lỗi → 0, không NaN, số nguyên 0..100 |
| `src/core/methods.js` (mới) | Mục 2.0.8: `METHOD_SPECS` (19 loại, `thai` có `bySub`, lớp vỏ đổi số đo có `bySkin`), `ROUND_SEC`, `skillNoise`, `skillErr`, `sampleStep` (kim lửa sinh sai số theo giây), `measureScore`, `staffStepScore`, `staffBatch`, `stepTimeSec` (vắt theo thước giữ, có lượt trượt vào), `dishTimeModel(recipe, { tau, gon, novice, covered, profile, qty, notes, narrow })` (thẻ người mới mỗi thao tác). Không import DOM |
| `src/core/morning.js` (mới, thuần) | `morningSlots(state, ctx)` → `{ ice: 0 \| 2 \| 3, jar: 0 \| 1 }` (đọc `iceSlots`, `jarSlots` theo ngày), `morningOffer(state, ctx)` (đồ của thực đơn hôm nay, gợi ý theo ngày), **`shouldAutoShow(state, ctx)`** (nhận `ctx.autoAllowed`; không đọc `navigator`), **`boxPortionPrice(itemId, state, ctx)`** (bội 500đ, đọc `previewDayMods`), `batchPrice(itemId, size, state, ctx)`, **`payMorning`, `refundMorning`, `loseMorning`** (sổ buổi sáng, mục 4.6), `startBatch(state, slot, itemId, size, ctx)` (lý do từ chối: `khoa`, `het_o`, `thieu_tien`, **`giu_tien_lua_chon`**, `khong_ban`; khóa phiếu Chợ Sớm nếu đã giảm giá), `batchOps(itemId, data)`, `submitBatchOp(state, opId, result, ctx)`, `finishBatch(state, ctx)` (mẻ hỏng khi luộc < 50 → `loseMorning`), `cancelBatch` (hoàn nếu chưa chơi, mất nếu đã chơi), `discardBox` (→ `loseMorning`), `queueYesterday(state, ctx)`, `planBoxes(sh, recipe, board, notes, qty, picked, data)` (thuần) → `{ reserve: [{ box, portions, tram }], deduct, jar: [{ box, bonus }] }`, `boxBonus(q)`, `jarBonus(q)`, `boxesIntoShift(state, sh)` (thêm `used: 0`, `wasted: 0`), `expireMorning(state, sh, ctx)` → `{ usedValue = Σ (used − wasted) × p, wasteValue = spent − usedValue }`, `normalizeMorning(raw, day, data)` |
| `src/core/events.js` | Mới **`previewDayMods(state, ctx)`** (thuần): trả `{ cogsMul, ingCostMul, choiceCost }` (`choiceCost` = giá lựa chọn sự kiện ngày đã chọn mà chưa trả, mục 4.6 ý 5) theo đúng điều kiện của `prepareShiftMods` mà **không tiêu phiếu, không trừ tiền**; `prepareShiftMods` không đổi ngoài việc tôn trọng `state.prep.couponLocked` |
| `src/core/scoring.js` | `dishQuality`: luật Không tì vết D (`opts.slip = { w, min }`, mặc định từ `DEFAULT_BALANCE.flawlessSlip`); **`opts.bonus`** (thưởng cấp món của sơ chế: cộng sau trung bình có trọng số, trước lỗi nguyên liệu, không cộng khi hỏng chí mạng, không đổi Không tì vết); bước `prepped` tính như bước thường; bước `staff` tính như `auto` (không Không tì vết); trả thêm `flawlessSlip` (id thao tác được trượt) cho phiếu chấm |
| `src/core/customer.js`, `src/core/order.js` | **Không đổi** (đọc `linePar` mới) |
| `src/core/shift.js` | `startShift`: `boxesIntoShift` → `sh.morning = { boxes (mỗi hộp thêm `used`, `wasted`), spent, lost }`, `sh.ledger.morning = spent`, `walletStart = ví + spent`. `endShift` (`:348`): `expireMorning` **trước** `summarizeShift`; ghi `state.morning.last` cho "Như hôm qua". `emptyLedger` thêm `morning: 0` |
| `src/core/economy.js` | Tổng kết dòng "Sơ chế sáng" (đã chi; phần dùng → giá vốn; phần bỏ, món bỏ, mẻ hỏng/đổ/bỏ dở → hao hụt; hai phần cộng lại = đã chi); lãi ca tính cả khoản này; tất toán không trừ ví lần nữa (như `eventOut`); `ERROR_TIP_TRIGGER` thêm `dang`, `nhuyen_qua`, `dut_doi`, `suyt_dut_tay`, `ngap_bot`; `sai_cach → dish_hong` giữ nguyên (chỉ cho lời khuyên cuối ca; thẻ riêng theo bước đi qua `unlockTip(state, 'sai_cach:<id bước>')` ở `kitchen.js`, mục 4.8) |
| `src/core/stats.js` | `step.done` có `prepped` đếm như thường (perfect_*); `morning.batch` → tín hiệu `morning_batch` khi q ≥ 70; `prepBatches`, `prepPortionsUsed`, `prepPortionsWasted` |
| `src/core/state.js` | `STATE_VERSION = 4`; `defaultState().morning = { day, seen: 0, boxes: [], draft: null, last: [], spent: 0, lost: 0 }`; `DEFAULT_BALANCE` thêm `morning`, `flawlessSlip`, `roundSec` (mục 5.7 #10); `defaultStats` thêm 3 khóa; `defaultSettings.askPrep = true`; `defaultPrep` thêm `couponLocked: false`. **v4:** `defaultState().newWays = {}`; `unlockTip(state, code, ctx, { capExempt } = {})` (`:215`) khớp thẻ theo `trigger` **hoặc** `alsoOn`, `capExempt` bỏ qua trần một thẻ mỗi ca (`:223`), chỉ dùng cho `cach_moi:*` |
| `src/core/save.js` | `migrateContentM54` (mục 6.5; v4: tạo `state.newWays` cho người chơi đã nấu món có bước đổi cách); `droppedEventRefund` cộng `sh.ledger.morning`; `migrateCookBoard` thêm luật giữ board cũ |
| `src/core/mastery.js`, `quests.js` (lõi) | Không đổi (luật w ở kitchen.js) |
| `src/data/recipes.js` | 9 món theo mục 3.2: `tram`, `trams`, `pace`, `params.cut`…; `METHOD_LABELS` + `cat_thanh`, `bao_soi`; mới `METHOD_PLAY` (mục 2.2.1); `RECIPES_REV = 2` (số hiệu bảng công thức cho `migrateCookBoard`); ghi đầu tệp đổi luật M5 thành luật 0.5.4 (`pace`, trạm, id giữ) |
| `src/data/minigame-types.js` | 8 loại mới (`name`, `hint` > 10 ký tự kết thúc bằng dấu câu, `sub`, `count`, `icon`, `act`); lớp vỏ mới: `thai.keo/rach`, `cha.boc/xat/bop`, `lua.lo/nuong/phi/rang/luoc/ngam`, `rot.phin`, `lac.hop`, `bay.o_banh/muc`, `xoay` (vùng), `vat.nen/vai`, `nhat.hat/la`, `bao.nao`, `gia.coi`, `dap_dap.giay/dao`, `chat.sa/dua`; mỗi lớp có `name`, `hint`, `sub`, `act`, `over`, `sound` |
| `src/data/prep-items.js` (mới) | `PREP_ITEMS` (**12 đồ**, mục 4.2: `kind`, `name`, `recipes`, `ings`, `ops`, `replaces`, `uses`, `opFor`, `icon`, `state`, `sec`) và `MORNING_OPS` (**21** thao tác chỉ có ở mẻ sáng). Đóng băng sâu; vào `DATA` qua `src/data/index.js`; là tệp chuỗi hiển thị nên không có khóa `par` |
| `src/data/ingredients.js` | **Không đổi** (không thêm nguyên liệu bán; tỏi, ớt, sả, hành tím, dừa khô chỉ là hình của mẻ sáng) |
| `src/data/balance.js` | Khóa mới (mục 5.7 #10; v4: `kitchen: { trim: 0 }`) |
| `src/data/quests.js` | `thai_hoan_hao.target` → `{ perCustomer: 0.95, min: 7, max: 12 }` (mục 4.9); nhiệm vụ tùy chọn mới; v4: `trung_cut_ngam` với ba điều kiện `cond` mới (`menuUsesPrep`, `iceSlotsAtLeast`, `cooldownDays`), đọc ở `src/core/quests.js:31-35` (gói P3) |
| `src/data/tours.js`, `tips.js`, `dialogue.js`, `mail.js`, `reviews.js` | Tour theo cử chỉ (mục 7.7), `bep_tram`, `bep_hop`, `so_che_sang`, **sửa `bep_thot`**, trang Cách chơi **`bep` (sửa) và `so_che` (mới)**; Mẹo nghề mục 4.8; `typeTips` 8 loại, lời khen, lời Dì Sáu buổi sáng; thư `phien_ban_0_5_4`; mã review `dang` ("Trà hơi đắng, chắc vắt mạnh tay"). **v4:** 3 Mẹo nghề của Q2 (`cat_thanh`, `bao_soi_xoai`, `tac_khe_hat`; trường mới `alsoOn`), `NEW_WAY_STEPS` (bước → thẻ) ở `tips.js`; `bep_thot` bước "Chọn cách sơ chế" đổi đích (mục 4.8); nhiệm vụ "Trứng cút luộc, ngâm nước đá" (mục 4.9). `tours.js`, `mail.js` là tệp của Đợt 3 (gói H3, R3): chỉ sửa sau khi Đợt 3 phát hành |

### 6.2 Luồng dữ liệu một món dùng hộp

```
Sáng:   startBatch(ice, 'tac_cat', 8) ─▶ payMorning 8 × 1.000 = 8.000đ ─▶ submitBatchOp × (2 thao tác × 2 lượt) ─▶ finishBatch
        state.morning = { spent: 8000, lost: 0, boxes: [{ slot: 'ice', id: 'tac_cat', size: 8, left: 8, p: 1000, q: 91,
                          per: { thai_tac: 93, nhat_hat: 88 }, at: '05:42' }] }
Mở ca:  startShift ─▶ sh.morning = { boxes (thêm used: 0, wasted: 0), spent: 8000, lost: 0 }, sh.ledger.morning = 8000,
        walletStart = ví + 8000
Chọn:   submitChon(picked có tac, qty 1) ─▶ planBoxes ─▶ GIỮ 1 phần: left 7, used 1; giá vốn = 3.000 (như không hộp) − 1 × 1.000 = 2.000đ;
        cook.boxUse = [{ box: 'tac_cat', portions: 1, value: 1000, tram: 'tac', taken: false }]   (bước CHƯA điền)
Thớt:   ô trạm Tắc "Có sẵn · Tốt 91 · Bốc"; chạm ─▶ takeBox(state, 'tac', ctx):
          cook.steps.thai_tac = { score: 93, prepped: 'tac_cat', … }, cook.steps.nhat_hat = { score: 88, prepped: 'tac_cat', … };
          phát step.done { stepId: 'thai_tac', type: 'thai', score: 93, prepped } (→ perfect_thai), step.done nhat_hat;
          cook.dishBonus += 2 (Sơ chế khéo, Q mẻ 91); boxUse.taken = true
        ─▶ chơi tiếp vat_tac trong cùng lần chạm; dải hộp "Tắc · 7"
Ra món: finishDish (không bo_qua) ─▶ dishQuality(…, { bonus: 2 }) (luật D) ─▶ dish.prepped = ['thai_tac', 'nhat_hat'], dish.bonus = 2
        (ra món khi chưa bốc: thai_tac, nhat_hat tính như bước bỏ, bonus 0, wasted += 1 — xem đoạn dưới)
Bỏ món: abandonDish ─▶ đã bốc: sh.morning.boxes[k].wasted += 1; chưa bốc: left += 1, used −= 1 (đồ chưa rời hộp)
Hết ca: expireMorning ─▶ dùng 6 phần (used 6, wasted 0) → giá vốn 6.000đ, bỏ 2 phần → hao hụt 2.000đ (tổng = spent 8.000đ)
        Ngày tắc ×2: mẻ vẫn 8.000đ; ở bước Chọn phần tăng giá tắc (1.200đ, có trần) vẫn tính như không hộp.
```

Ra món khi đã giữ mà chưa bốc: `finishDish` ghi `sh.morning.boxes[k].wasted += portions` (phần đó đã trừ khỏi giá vốn của món ở bước Chọn, nên phải vào **hao hụt** để sổ khớp `spent`); món chịu điểm 0 ở các bước chưa bốc (như bỏ bước), đúng luật "Còn n bước chưa làm" hiện có, và không có "Sơ chế khéo". Bỏ món khi chưa bốc thì khác: phần giữ **trả lại hộp** vì món không ra, đồ chưa rời hộp.

### 6.3 State mới

```js
// state.morning (0.5.4): việc buổi sáng của ngày state.day khi CHƯA mở ca. Mở ca thì hộp và tiền chuyển hết vào sh.morning.
state.morning = {
  day: 7, seen: 7,                          // seen = ngày gần nhất đã vào màn sáng (không tự hiện lại trong ngày)
  spent: 18000,                             // mọi tiền đã chi sáng nay (bội 500đ), kể cả mẻ hỏng, đổ bỏ, bỏ dở
  lost: 0,                                  // phần của spent không thành hộp dùng được (mẻ hỏng, đổ bỏ, bỏ dở sau khi chơi)
  boxes: [ { slot: 'ice', id: 'tac_cat', size: 8, left: 8, p: 1000, q: 91, per: { thai_tac: 93, nhat_hat: 88 },
             at: '05:42', staff: false, broken: false },
           { slot: 'ice', id: 'xoai_bao', size: 4, left: 4, p: 2000, q: 94, per: { … }, at: '05:44' },
           { slot: 'jar', id: 'hanh_toi_phi', size: 8, left: 8, p: 0, q: 88, per: { … }, at: '05:47' } ],
  draft: null | { slot: 'ice', id: 'xoai_bao', size: 4, round: 1, op: 1, per: { got_xoai: [96] }, p: 2000 },
  last: [ { id: 'tac_cat', size: 8 }, { id: 'xoai_bao', size: 4 }, { id: 'hanh_toi_phi', size: 8 } ]   // "Như hôm qua"
}
// state.prep.couponLocked = true khi một mẻ đã hưởng Phiếu Chợ Sớm (tắt được lại sau khi mở ca)
// Trong ca: sh.morning = { boxes: [{ …, used, wasted }], spent, lost }, sh.ledger.morning = spent
// Phiên nấu: cook.boxUse = [{ box, portions, value, tram, taken }], cook.dishBonus = 3, cook.boardRev = 2
// [v4] state.newWays = { thai_dua: 3, thai_xoai: 2, nhat_hat: 3 }: số lần nấu còn hiện nhãn "Cách mới"; chỉ có ở save nâng cấp
//   đã nấu món chứa bước đó; về 0 thì xóa khóa (mục 4.8)
// Kết quả bước từ hộp (ghi lúc takeBox): { score, grade, method, auto: false, retried: false, tag: null, prepped: '<id hộp>' }
//   (+ staff: true nếu hộp do phụ bếp làm). Món: dish.bonus (thưởng cấp món đã cộng), dish.prepped
```

### 6.4 `STATE_VERSION`: 0.5.4 lên 4, M6 lên 5

1. Đợt 3 (0.5.3) **không** đổi `STATE_VERSION` (gói của Đợt 3 không có tệp `state.js`, `save.js`), nên 0.5.4 lên 3 → 4. 0.5.4 có trường mới mang **ý nghĩa mới** (`morning`, `sh.morning`, `ledger.morning`, kết quả bước `prepped`, `cook.boardRev`, `settings.askPrep`, `prep.couponLocked`). Bản 0.5.1–0.5.3 đọc save hay mã sao lưu 0.5.4 sẽ bỏ hộp và tiền sơ chế mà không báo; lên phiên bản thì `readCode` (`save.js:883`, so `raw.version > STATE_VERSION`) báo "mã của bản mới hơn" như đã làm cho v3. Nếu Đợt 3 đổi ý và lên v4, bản này lên v5 (luật dưới).
2. **Tránh xung đột với M6:** M6 (`scratchpad/m6/pa-A.md`) đang định v3 → v4; đổi thành **v4 → v5**, `migrateContentM6` chạy khi `version < 5`, test M6 "v1..v4 → v5" thêm ca "save 0.5.4 có hộp, đang mở ca"; khóa `STATE_VERSION === 4` ở `m54-balance` chuyển thành `=== 5` trong gói P0 của M6. Quy tắc nếu thứ tự đổi: **bản nào phát hành trước lấy số nhỏ hơn**; `migrate` là tích lũy nên không cần bước trung gian. Việc này báo cho workflow M6, **không phải câu hỏi cho người dùng**.
3. Chuỗi migrate: `migrateMeta` → `M3` → `M4` → **`migrateContentM54`** → (M6 sau này) → `migrateCookBoard` → `migrateTour`.
4. Ba test đang khóa `STATE_VERSION === 3` phải sửa có chủ ý cùng gói P3: `m4-save.test.mjs:55`, `meta-save-progression.test.mjs:39`, `core-economy.test.mjs:13` (cộng `m5-balance` đã nói ở 5.7).

### 6.5 `migrate` và `migrateCookBoard`

**`migrateContentM54(raw, s, data)`:**
- Thiếu `s.morning` → mặc định (`day = s.day`, `spent = 0`, `lost = 0`). `day ≠ s.day` (chỉ với save lạ) → hoàn `spent` vào ví (bội 500đ), ghi `rep.morningRefund`, xóa hộp và nháp (giữ `last`).
- Hộp có `id` không còn trong `PREP_ITEMS`, `size` ∉ `sizes`, `left` ngoài [0; size], `per` ngoài 0..100, `p` không phải bội 500 → bỏ hộp đó (hoàn `left × p`, phần còn lại của nó coi như đã mất); tối đa 1 hộp mỗi chỗ (`ice`, `jar`). `draft` sai cấu trúc → bỏ (tiền đã ở `spent`, chuyển phần của mẻ dở sang `lost`).
- Ca dở có `sh.morning`: cùng luật; hỏng thì bỏ `sh.morning`, hoàn `sh.ledger.morning`. Ca bị hủy (`shiftUsable` false): hoàn cả `sh.ledger.morning` (mở rộng `droppedEventRefund`, `save.js:303, 395`).
- **`state.newWays` (v4, Q2):** save lên từ v ≤ 3: với mỗi bước `thai_dua` (bánh mì ốp la, bánh mì trứng gà ta), `thai_xoai` (hai món bánh tráng), `nhat_hat` (hai món trà tắc), nếu `state.recipes[món].cooks > 0` ở bất kỳ món nào chứa bước đó thì `newWays[bước] = 3`. Save mới: `{}`. Save đã là v4: thiếu thì `{}`, giá trị ngoài 0..3 thì kẹp, khóa lạ thì bỏ. Test `m54-save`: save v3 đã nấu trà tắc và bánh mì nhưng chưa nấu bánh tráng ra `{ thai_dua: 3, nhat_hat: 3 }`.
- `settings.askPrep` mặc định true; `prep.couponLocked` mặc định false; `stats.prep*` mặc định 0; trong ca dở: `sh.morning.boxes[k].used` / `.wasted` thiếu thì 0, ngoài [0; size] thì kẹp; `cook.boxUse[i].taken` thiếu thì true nếu mọi bước của trạm đã có `prepped`, không thì false; `cook.dishBonus` thiếu thì 0.
- **Lưu rồi tải lại không đổi; migrate hai lần cùng kết quả; ví luôn bội 500đ.**

**`migrateCookBoard` (sửa có chủ ý, theo B 6.5):**

```js
// 0.5.4: phiên nấu đang ở Thớt mà ĐÃ có ≥ 1 bước xong (ngoài chon) thì GIỮ board cũ: mọi loại cũ vẫn chạy với params cũ
// (vat_tac là cham min, thai_xoai là thai có bảng chọn cách, xe_kho_muc là cha strokes; mọi plugin cũ còn nguyên), Q tính như
// bản cũ, giao diện dùng nguyên bố cục Thớt 0.5.2 (ô `.k-ing` gom theo nguyên liệu, mỗi bước một huy hiệu). Board có cook.boardRev < RECIPES_REV (hoặc không có) thì
// KHÔNG áp METHOD_PLAY: cách chọn ở bảng chỉ đổi hình lúc xong như 0.5.1 (thai.js:117, 364), cử chỉ vẫn là ngắm–nhấc.
// Chưa bước nào xong thì dựng lại theo công thức mới (giữ kết quả cùng id như M5). Cả hai trường hợp ghi cook.boardRev.
```

- Vì sao giữ board cũ thay vì dựng lại giữ kết quả theo id (cách M5): dựng lại sẽ chèn thao tác mới **trước** các bước đã xong (vd trà tắc đã vắt mà nay hiện thêm "Khều hạt" phía trước) — vô lý và làm món dài ra giữa chừng.
- **`METHOD_PLAY` chỉ áp cho board mới** (`boardRev === RECIPES_REV`). Bản 1 áp chung, nên `thai_xoai` cũ (cách đúng `thai_soi`, cuts 5) sẽ chơi kiểu hai lượt, `cat_banh_trang` cũ (`cat_soi`) chơi kiểu kéo — trái câu "giữ board cũ" (phản biện vòng 1 #23). `METHOD_PLAY` thêm mục dự phòng `bao` → `{ plugin: 'thai', cut: 'ngam' }` cho kết quả bước cũ có `method: 'bao'` (cách cũ của `thai_dua`).
- Món đang ở bước Chọn: board dựng lúc `submitChon` theo công thức mới. Hộp không áp cho phiên nấu đã qua bước Chọn trước khi cập nhật. `tasting.shift` chạy cùng luật.
- **Bộ giải e2e** đọc loại và cách thái từ `minigame-stage[data-type]`, `thai-board[data-cut]` trên sân khấu, **không** từ `DATA` (board cũ khác dữ liệu mới).
- **Thớt của board cũ** (phản biện vòng 2 #17): board không có `tram` vẽ bằng nguyên bố cục 0.5.2 (`ingTile`, `stepButton` ở `ui/screens/kitchen.js:858-900`; `css/kitchen.css:676-701` ở `5970a06`), không coi mỗi bước là một ô trạm 88px; bố cục này đã qua `vua-man-bep` ở mọi khung với Thớt 8–9 bước.
- Test `m54-save`: ca board cũ còn `thai_xoai` chưa làm (chơi kiểu ngắm, không phải bào); board cũ có `thai_dua` đã chọn `bao`; `boardRev` chặn dựng lại lần hai. `m54-vua-man-2`: save v3 đang nấu dở Tây Ninh (board cũ 8 bước) vừa khung chính, không cuộn.

### 6.6 Móc cho M6 (phụ bếp làm theo danh sách bước mới)

| M6 cần | 0.5.4 cung cấp |
|---|---|
| Phụ bếp nấu món theo thao tác mới | `METHOD_SPECS[type].sample / score / timeSec`, `staffStepScore` (trần 88 ở chỗ gọi), kết quả bước cùng dạng thêm `staff: true` → lõi gọi `submitStep` |
| Phụ bếp nhận từng thao tác hoặc cả trạm | Mỗi thao tác là một bước lõi riêng; `tramsOf` cho biết trạm; Tự làm cả trạm đã có khung |
| Không Không tì vết khi phụ bếp nấu | `dishQuality` coi `staff` như `auto` |
| Phụ bếp dùng hộp | **`planBoxes`** (thuần, giữ phần lúc `submitChon`) + **`takeBox(state, tramId, { ...ctx, staff: true })`** (bốc; kết quả bước mang `prepped` và `staff: true`). Không có hàm nào khác điền bước từ hộp (bản v3 ghi nhầm `consumeBoxes`, một hàm không tồn tại; kiểm cuối #7). Test `m54-kitchen`: phụ bếp dùng hộp phải gọi `takeBox`; không gọi thì các bước của trạm có hộp chưa xong và trạm phụ thuộc (`after`) vẫn khóa; gọi `takeBox` với `staff` thì món mất Không tì vết như mọi bước phụ bếp |
| Phụ bếp làm mẻ sáng | `staffBatch(itemId, size, skill, rand)`; hộp `staff: true`, trần 88 |
| Thời gian để tính lương, độ chậm | `stepTimeSec` × hệ số Nhanh; bảng 5.8 là mốc |
| Hiệu chỉnh theo bảng "Kỹ" | Khóa ở `m54-methods`: Kỹ 1–5 ↔ 70 / 74 / 78 / 82 / 85 (± 1,5), mỗi loại lệch ≤ 8 |

---

## 7. Giao diện, hình, âm

### 7.1 Thớt theo trạm (khớp bố cục "Vừa màn hình" 0.5.2)

0.5.2 (`5970a06`) đã đổi Thớt thành **lưới 2 cột** gom bước theo nguyên liệu (`ingTile` / `stepButton` ở `ui/screens/kitchen.js:858-900`; `.k-thot > .k-board` lưới 2 cột, `.k-ing[data-steps]` chiếm 1–4 hàng, huy hiệu 36px, bước ≥ 48px ở `css/kitchen.css:676-701`). Bản 0.5.4 giữ khung lưới đó, chỉ đổi nội dung ô: mỗi ô là **một trạm**, chạm cả ô là chơi liền cả chuỗi. Board cũ (không có `tram`) giữ nguyên bố cục 0.5.2 (mục 6.5).

| Phần của ô trạm | l / m | s | xs (375×553) |
|---|---|---|---|
| Hình chính (nguyên liệu hay dụng cụ của trạm, đổi hình trạng thái theo tiến độ) | 48 | 40 | 36 |
| Tên trạm, đậm, ≤ 2 dòng | 14px | 13px | 13px |
| Dải chấm thao tác (●●○, mỗi chấm 14px kèm biểu tượng loại 12px; chấm đã làm mang màu hạng; chấm có hộp là nắp hộp nhỏ) — mỗi chấm là `board-step-<id>` | ✓ | ✓ | ✓ (chấm 12px, không biểu tượng) |
| Dòng trạng thái 13px, **không cắt "…"** | "Chạm để làm · 3 việc", "Chờ: Chảo trứng" (ổ khóa), "Có sẵn · Tốt 92 · Bốc", "Chờ: Bốc Dưa leo", "Xong · Hoàn hảo", "Còn 1 việc" | như l | một từ kèm biểu tượng: "Chạm", "Chờ", "Bốc", "Xong" |
| Cao ô (cả ô là vùng chạm) | 88 | 76 | 60 |
| Số cột | 2 | 2 | **3** (ô rộng khoảng 113px) |
| Viên "Cách mới" (v4, mục 4.8: chỉ người chơi cũ, 3 lần nấu đầu; không phải vùng chạm; chồng góc trên phải, không thêm chiều cao) | "Cách mới" 13px | như l | "Mới" 13px |
| Dấu bút (ô trạm có bước chọn cách chưa làm, `data-method="1"`; đích của tour `bep_thot`) | biểu tượng 16px cạnh tên trạm | như l | như l |

**Tính chỗ** (`.k-main` khi đang nấu theo `vua-man/dac-ta.md` bảng 3.2: l 568, m Safari 524, s 320×568 412, **xs 375×553 320**):

| Món (số trạm) | l | m (Safari 402×680) | s (320×568) | xs (375×553) |
|---|---|---|---|---|
| Tây Ninh (5 trạm), có dải hộp | đầu 44 + thẻ công thức 44 + tiêu đề 22 + 3 × 88 + 2 × 6 + dải hộp 36 + Sẵn sàng 36 + chân 56 + đệm 16 = **530 ≤ 568** | thẻ công thức thu vào hàng đầu: 44 + 22 + 264 + 12 + 36 + 36 + 56 + 16 = **486 ≤ 524** | dải hộp và "Sẵn sàng" thu vào hàng tiêu đề: 44 + 22 + 3 × 76 + 12 + 56 + 16 = **378 ≤ 412** | 3 cột, 2 hàng; dải hộp, "Sẵn sàng" thu vào tiêu đề; chân xs 44: 44 + 22 + 2 × 60 + 6 + 44 + 8 = **244 ≤ 320** |
| Bánh tráng trộn (4 trạm), có dải hộp | 436 | 392 | 296 | 244 |
| Bánh mì, cà phê muối, chè bưởi (3 trạm), có dải hộp | 436 | 392 | 296 | 178 |
| Trà tắc, cà phê sữa đá (2 trạm), có dải hộp | 342 | 298 | 214 | 178 |

Ở 0.5.1 Thớt 8 bước cần 1.138px (`vua-man/dac-ta.md` mục 3.2); trạm giải bài này tận gốc và còn dư chỗ cho lời Dì Sáu ngày 1. Ở khung nhỏ, luật hiện có của `vua-man-bep` vẫn áp (Thớt: `finish-dish` và trạm đang làm được thấy không cuộn), nhưng với bảng trên mọi ô trạm của 9 món đều thấy không cuộn ở cả 10 khung.

**Hợp đồng e2e:** giữ `board`, `finish-dish`, `abandon-dish`, **`board-step-<id>`** (nay là chấm trong ô trạm; chạm chấm = chạm ô trạm, nên bộ giải cũ vẫn mở đúng trạm); thêm `board-tram-<tram>` với `data-state` (`mo` / `khoa` / `dang` / `xong` / `san`), `data-left` (số thao tác còn) và `data-method` (v4: "1" khi trạm có bước chọn cách chưa làm); `tram-new-<tram>` (viên "Cách mới", v4); trong bảng chọn cách: `method-new-<cách>` (v4); `k-boxes`, `box-<id>[data-left]`; `step-next` (nút "Tiếp →"); `tram-auto` (Tự làm cả trạm); `tram-redo-<id>` (Làm lại trong bảng trạm). Sân khấu giữ `minigame-stage[data-type]`, thêm `data-step` (id thao tác) và `data-tram="i/n"`. Trạm "san" chuyển sang "dang" hoặc "xong" chỉ sau khi `takeBox` chạy (mục 4.5).

### 7.2 Sân khấu chạy trạm và phụ phí gọn (bắt buộc)

**Hai lớp sân khấu** (`src/ui/minigames/index.js`, gói P9; phản biện vòng 1 #18). `playStep` hiện xóa sạch sân khấu (`stage.textContent = ''`, `index.js:41-46`) rồi mount, và lớp `.mg-fx` do `buildFrame2` tạo nằm trong sân khấu nên bị xóa theo; vì vậy "mount sẵn" và "ảnh nhân bản mờ dần trên `.mg-fx`" của bản 1 không làm được với mã hiện tại. Bản v2:

- `.mg-stage` là khung; bên trong có hai lớp `.mg-layer` chồng nhau và lớp `.mg-fx` dùng chung **nằm ngoài các lớp** (không bị xóa khi chuyển).
- Mới `playStepIn(layer, step, ctx)` (mount vào một lớp) và `createTwinStage(stage)` → `{ active, spare, swap(ms), destroy() }`. `playStep(stage, step, ctx)` cũ giữ nguyên chữ ký và hành vi (gọi một lớp), nên mọi chỗ dùng cũ không đổi.
- `_tram.js`: ngay khi thao tác trước gửi kết quả, mount thao tác kế vào lớp `spare` (`hidden`, `inert`, đồng hồ chưa chạy, `ctx.prewarm = true`); lúc chuyển, lớp cũ mờ dần 250 ms (giữ nguyên DOM, không nhân bản), lớp mới hiện, `ctx.start()` chạy đồng hồ; lớp cũ `destroy()` sau khi mờ xong. Hợp đồng plugin thêm: không chạy đồng hồ khi `ctx.prewarm` cho tới `start()`.
- Test hợp đồng: plugin mount vào lớp ẩn không phát âm, không bắt chạm, đồng hồ đứng; `swap` không làm mất nút trong `.mg-fx`.

| Hằng (tệp) | 0.5.1 | 0.5.4 | Ghi chú |
|---|---|---|---|
| Chuyển giữa hai thao tác (`_tram.js`) | — | 250 ms mờ chéo giữa hai lớp, động từ 28px 350 ms chồng lên, chạm được ngay | Giảm chuyển động: mờ chéo 120 ms |
| Giữ con dấu (`stamp.js:15`) | `RESULT_HOLD_MS` 700 (500) | **`RESULT_HOLD_FAST_MS` 450 (350)** khi trạm ≥ 70; giữ 700 (500) khi Đạt/Hỏng để kịp đọc | Bắt buộc |
| Nút "Tiếp →" trên con dấu (`kitchen.js` `showStepResult`) | — | **Có** (≥ 44px, `step-next`): vào thẳng trạm kế còn mở theo thứ tự Thớt (qua bảng chọn cách nếu có); hết trạm thì nút đổi thành "Ra món" | Bắt buộc |
| Màn ra món (`dish-reveal.js:16`) | `REVEAL_MS` 2.200 (1.400) | **1.600 (1.100)**, chạm để bỏ qua như cũ | Bắt buộc |
| Thẻ bước người mới (`step-card.js:21`) | `STEP_CARD_AUTO_MS` 1.100, mỗi bước | **800**, ở **mọi thao tác** trong 3 lần nấu đầu: thẻ đầy đủ ở thao tác đầu trạm, thẻ gọn có tay mẫu chạy 1 lượt ở thao tác nối (kể cả `lua`, `cham`, `rot`) | Q1; phản biện vòng 2 #4, #25 |
| Bốc hộp (`ui/screens/kitchen.js` gọi `takeBox` ở lõi) | — | Một chạm, 600 ms, chặn đúng ô đó; chưa bốc thì trạm chưa xong | Mục 4.5 |
| Bày (`bay.js`) | Nút Xong | Đủ n là tự xong, mọi bước bày | Mục 2.2 |
| Màn ra món: hàng tem (`dish-reveal.js`) | — | Dưới hạng món: "Sơ chế khéo +2 · Vị nhà làm +3", "Không tì vết (trượt nhẹ: Khều hạt 87)"; ≤ 2 dòng 13px, cao ≤ 40px. Phiếu chấm (`score-sheet.js`, 5 hàng cố định, gọn ở khung ≤ 600px) **không thêm hàng**, chỉ thêm tem 20px "Sơ chế" trong hàng Bếp như tem lỗi sẵn có | Phản biện vòng 2 #24 |
| Sân khấu ở xs (375×553) | — | Đầu sân khấu gọn 32px (tên thao tác, chấm, đồng hồ một hàng), chân 44px; vùng chơi khoảng 343×230 | Phản biện vòng 2 #11 |

**Người dùng đã chốt (Q1).** Không có các hằng này, mô phỏng bản v2 cho thấy ở tau 0,9 người TB mất 0,17 và người Giỏi mất 0,13 sao/khách, 11 điểm 5★. Hệ quả có chủ ý: người không sơ chế chơi trung bình được +0,09 sao/khách (mục 5.4, câu Q10). Thư 0.5.4 nêu thay đổi nhịp này.

**Vùng chơi đo được ở bản dựng thử B** (khung thật, `thu-B/anh-2/do-2.json`): 402×680 → 370×397–406; 375×667 → 343×384–393; 320×568 → 288×285–294; **375×553 (chưa đo; `.k-main` 320 trừ đầu gọn 32 và chân 44): khoảng 343×230**. **Mọi loại có sân khấu tối thiểu ≤ 288px rộng và ≤ 190px cao ở xs** (bảng 2.1; bào 140×280 dọc hoặc 288×200 nghiêng 20°, chọn theo tỉ lệ khung; chặt dừa ở khung hẹp hơn 300px thì đặt trái dừa dọc). Mỗi plugin đo `room()` như `cha.js` và co theo chiều cao còn lại; thước đặt trên vùng chơi hoặc dọc mép phải, không dưới ngón cái; chữ nổi và dao vẽ lệch lên trên điểm chạm 40px.

**Dòng gợi ý (`sub`)** tối đa 2 dòng ở 320px (khoảng 60 ký tự); gợi ý dài chỉ ở 3 lần nấu đầu, từ lần 4 chỉ còn động từ (bản dựng thử thấy gợi ý 3 dòng ăn 22px vùng chơi ở 320×568).

### 7.3 Cổng kiểm cảm giác (bắt buộc trước khi viết plugin thật)

Theo B 7.3: mỗi loại mới (và mỗi cách thái mới) dựng thử bằng **mã thật** (`_gesture.js`, `buildFrame2`, `vfx.js`, `audio.js`, CSS game), chụp và đo ở **402×680, 375×667, 320×568, 375×553 an toàn 47/34** (cộng 402×874 an toàn 62/34): cuộn trang = 0, vùng chạm nhỏ nhất ≥ 44px, chữ nhỏ nhất ≥ 13px, tràn ngang = 0, điểm của kịch bản cố ý phạm lỗi đúng công thức. Băm, xé, bào đã qua cổng ở B (băm 100, xé 88–89 với một sợi đứt ở 43%, bào 80 với một lần qua vạch đỏ). **Phải sửa khi làm thật** các lỗi bản dựng thử đã bắt:

| # | Lỗi | Sửa |
|---|---|---|
| 1 | cv của băm tính cả quãng nghỉ để vun (cv 0,66, bị trừ oan) | cv chỉ trên khoảng giữa hai nhát liền, bỏ quãng vun (cv 0,04) |
| 2 | Cửa sổ an toàn của bào còn 8px ở 320×568 | Sàn 24px × mul ở mọi cỡ màn |
| 3 | Núm xé là vòng vàng chấm đen trông như mắt; ở 320 bốn núm sát nhau | Núm là tab bo tròn có mũi tên; cách nhau ≥ 52px; ở 320 chỉ 3 núm một lượt |
| 4 | Chữ "Phựt! Đứt sợi" hồng trên nền nâu nhạt kém tương phản | Chữ trắng viền mực 3px như `popLabel` |
| 5 | Khi tay tới vạch đỏ, quả xoài lọt xuống dưới lưỡi bào | Kẹp đầu quả ≥ `bladeY` − len; đầu quả kéo lên cao nhất ≥ đáy gợi ý + 8px |
| 6 | Nhãn "Lượng sợi" sát mép phải (x ≈ 314/320) | Nhãn đặt **trên** thước, canh phải trong cột 40px, hoặc rút còn "Sợi" |
| 7 | Gợi ý 3 dòng ăn vùng chơi ở 320 | ≤ 2 dòng; từ lần nấu 4 chỉ còn động từ |

Thêm: thời gian chuyển giữa hai thao tác trong trạm đo trên iPhone thật ≤ 0,35 giây (chỉ số mới 32 ở `docs/can-bang.md`).

### 7.4 Danh sách hình mới

Theo quy chuẩn đã duyệt (`docs/tham-khao/m5-thiet-ke.md` mục 6.1): cel-shading, viền mực 3, bóng đất, điểm sáng, không gradient, không ảnh ngoài, viewBox 64 cho hình trạng thái. Tất cả vào **tệp mới `src/ui/art/bep-chuan.js`** có ngân sách riêng **≤ 100 KB**; trần tổng `src/ui/art/*` ở `art-v2.test.mjs:1031` nâng có chủ ý từ 320 KB lên **420 KB** (HEAD hiện 317.481 B; dò lại sau khi Đợt 3 thêm `art/meta.js`, nếu Đợt 3 đã nâng trần thì cộng thêm 100 KB vào trần mới).

| Nhóm | id | Số × cỡ đích | Cộng |
|---|---|---|---|
| Đạo cụ lớn (`PROP_META` có điểm neo, ≤ 6 KB) | `dao_phay_lon` (`edge`, `grip`), `coi_chay_lon` (`mouth`, `pestle`), `ban_bao_lon` (`blade`), `giay_goi`, `thung_da` (1 ô, kèm kệ gỗ 1 hũ), `hop_so_che` (`lid`, `label`; mức đầy 4 nấc bằng cắt CSS), **`hu_nha_lam`** (hũ thủy tinh, `lid`, `label`) | 7 × 4 KB | 28 KB |
| Trạng thái nguyên liệu trong ca (≤ 3,5 KB) | `dua_leo.thanh`, `banh_mi.xe`, `banh_mi.kep`, `tac.hat`, `tac.bo_hat`, `kho_bo.xe`, `kho_muc.nuong`, `kho_muc.dap`, `rau_ram.nhat`, `vo_buoi.rao`, `sua_muoi.sanh`, `xoai_xanh.soi_ngan` (đống sợi vừa "Đủ") | 12 × 2,3 KB | 27,6 KB |
| Đồ chỉ có ở mẻ sáng | `hanh_la.khuc`, `hanh_tim`, `hanh_tim.lat`, `sa`, `toi`, `toi.dap`, `ot`, `dong_bam_1`, `dong_bam_2`, `dong_bam_3` (một bộ tô màu bằng `--bam` cho tỏi, ớt, sả), `dau_phong.gia`, `dua_kho.bo_doi`, `thau_da` (thau nước đá có đá nổi, dùng cho ngâm) | 13 × 2 KB | 26 KB |
| Biểu tượng loại (`tools.js`, `GLYPHS`) | `dao_phay`, `coi_chay`, `ban_bao`, `keo`, `tay_xe`, `tay_vat`, `mui_dao` | 7 × 1,5 KB | 10,5 KB |
| **Tổng** | | | **≈ 92 KB** |

- **Đã áp sẵn hai bước cắt** của bản 1 để có chỗ cho hũ, thau nước đá (hình đồ chua `ca_rot.got`, `do_chua.soi` để dành Chặng 2): `dua_kho_lon` vẽ bằng CSS (gáo dừa trước khi chặt), `keo_lon` dùng `dao_lon` có sẵn đổi tư thế mở / khép. `sua_muoi.tach` bỏ (không còn "Tách béo"; Q7 chọn kem béo thì thêm lại).
- **Không vẽ riêng** hộp của 8 đồ thay bước và hũ của 4 đồ nhà làm: ghép `hop_so_che` / `hu_nha_lam` với hình trạng thái bên trong (SVG lồng); đồ nhà làm dùng hình nguyên liệu có sẵn + nhãn giấy "Nhà làm" bằng CSS. Túi vải vắt, bàn tay bóp: vẽ bằng CSS trên `tay` (có).
- Sửa `props.js`: `phin_lon` thêm phần `nap_nen` và lớp bọt (CSS).
- **Thứ tự cắt tiếp nếu vẫn vượt ngân sách:** (1) biểu tượng loại dùng đạo cụ thu nhỏ, (2) `thau_da` vẽ bằng CSS. **Không bao giờ cắt hình trạng thái** (đống băm nhỏ dần, quả bào ngắn dần, khô mực mỏng dần) — đó là phản hồi chính cho thấy tay đang tác động lên nguyên liệu.
- **`state-map.js`:** `STEP_STATE` thêm `xe_banh → xe`, `kep_banh → kep`, `thai_tac → hat`, `nhat_hat → bo_hat`, `xe_kho_bo → xe`, `nuong_kho_muc → nuong`, `dap_kho_muc → dap`, `nhat_rau_ram → nhat`, `vat_rao → rao`, `danh_sua_muoi → sanh`; `METHOD_STATE` thêm `cat_thanh → thanh`, `bao_soi → soi`. Mỗi lớp ảnh có ảnh lưới 48 / 72 / 120 / 200px trên nền giấy và nền gỗ để duyệt.

### 7.5 Âm mới (`src/ui/audio.js`, tổng hợp WebAudio như âm cũ, không tệp âm thanh; gọi chuỗi viết thẳng `sound('…')`)

| Tên | Dùng | Cách tạo |
|---|---|---|
| `snip` | cắt kéo | 2 tiếng tách kim loại 4 kHz cách 30 ms |
| `mince` | băm | noise dải 2,2 kHz 25 ms + click gỗ 180 Hz; cao dần theo combo |
| `whack` | chặt, đập dập | sine 90 Hz 80 ms + noise 1 kHz 40 ms |
| `thump` | giã | sine 110 → 70 Hz 90 ms + noise 300 Hz |
| `rip` | xé | noise quét 900 → 3.000 Hz, phát lại mỗi 24px kéo |
| `grate` | bào, nạo | noise dải 2,5–5 kHz 140 ms |
| `squeeze` | vắt, nén | noise 600 Hz 120 ms + tone 300 → 200 Hz |
| `pick` | nhặt, khều | tick 2,4 kHz 15 ms + pop |
| `lid` | đóng hộp, bốc hộp | "tách" nhựa 60 ms |

`SOUND_NAMES` 25 → 34; `ACTION_SOUNDS` thêm `bam: 'mince'`, `chat: 'whack'`, `dap_dap: 'whack'`, `gia: 'thump'`, `xe: 'rip'`, `bao: 'grate'`, `vat: 'squeeze'`, `nhat: 'pick'`. Dùng lại: `chop` (thái ngắm, dao theo nhịp), `sizzle` (phi), `tick` (luộc, giã trúng muỗng), `shake` (lắc hộp), `crack` (gõ nứt trứng cút, đứt sợi), `stamp`, `click` (nén). Âm lượng tổng giữ `MASTER_MAX` 0,9. Tên đã soát không chứa chuỗi con bị cấm (`grab`, `momo`, `napas`, `ipos`, `fabi`).

### 7.6 VFX mới (`src/ui/vfx.js`)

| Loại | Hình | Dùng ở |
|---|---|---|
| `shred` | sợi mảnh màu nguyên liệu, rơi theo đường cong | xé, bào, cắt kéo |
| `husk` | mảnh nâu nhạt cong, rơi chậm, xoay (xơ dừa, vỏ lụa, vỏ tỏi, giấy) | chặt, giã, đập dập |
| `pit` | hạt nhỏ hình giọt (không đặt tên `seed`: từ cấm trong tệp chuỗi hiển thị) | khều hạt tắc, tắc vắt quá tay |
| `foam` | bọt li ti nở trên mặt | ủ bột phin, sữa muối đánh sánh |

`VFX_KINDS` 9 → 13; giữ `VFX_LIMITS` (30 nút DOM, 150 hạt); thêm `vfx.squash(el, sx, sy, ms)`, `vfx.fly(el, from, to, ms)` nếu chưa có dạng công khai; `particlePlan(kind, reduced)` trả 0 hạt bay khi giảm chuyển động. Không phát sự kiện VFX lên bus miền (`m5-thiet-ke.md` mục 1.3).

### 7.7 Thẻ bước, tay mẫu, tour, góp ý

- **Tay mẫu CSS** (`css/fx.css`, luật `.g-step-card-demo[data-gesture="…"]` cạnh 11 tay mẫu cũ ở `fx.css:155-197` của `5970a06`; gói P5) cho **13 cử chỉ mới**: 8 của loại mới (`tap-alt`, `swipe-up-tap`, `drag-tap`, `tap-beat`, `drag-axis`, `drag-updown`, `hold-zone`, `tap-pick`), 3 cách thái mới (`drag-line`, `tap-feed`, `drag-cut-2`) và **2 lớp vỏ đổi cử chỉ** (v4, kiểm cuối #6): `swipe-arc` của nạo (tay vuốt cong từ mép gáo vào giữa) và `tap-peel` của bóc 2 nhịp (hai chấm gõ rồi một vệt vuốt tỏa ra từ chấm). Giảm chuyển động: tay đứng yên, có mũi tên (vuốt cong thì mũi tên cong). **Test** (`m5-components`): mọi giá trị của `GESTURE_BY_TYPE`, `GESTURE_BY_CUT`, `GESTURE_BY_SKIN` có luật tay mẫu trong `fx.css` (đọc tệp CSS trong Node), nên thêm cử chỉ mà quên tay mẫu thì đỏ.
- **"Lần đầu gặp" tính theo cử chỉ, không theo loại** (phản biện vòng 1 #17). Hiện `NEW_TYPES`, `newTypeTour` (`ui/screens/kitchen.js:78-82` ở `5970a06`) xét theo `type`, nên người đã nấu bánh mì nhiều lần sẽ gặp cắt thanh, rạch, kéo theo nhịp (đều là `thai`) chỉ với thẻ gọn. Bản v2 thay bằng **`gestureKey(step)`** = `type` + `.` + (`params.cut` của thái, hoặc lớp vỏ đổi cử chỉ) và bảng **`NEW_GESTURES`**:

| Khóa cử chỉ | Tour (2 bước, neo vào đích) | Có ở |
|---|---|---|
| `bam`, `chat`, `dap_dap`, `gia`, `xe`, `bao`, `vat`, `nhat` | `bep_bam` … `bep_nhat` (lời ở mục 2.3) | Loại mới |
| `thai.thanh`, `thai.rach` | `bep_thai_thanh` ("Kéo dao dọc vạch": "Đặt ngón ở đầu vạch rồi kéo một đường tới cuối, dao đi theo ngón." / "Rạch một bên": "Ổ bánh thì dừng trước vạch đỏ để không đứt đôi.") | Dưa leo, ổ bánh |
| `thai.keo`, `thai.nhip` | `bep_thai_keo` ("Chạm theo nhịp": "Bánh tráng tự trôi, vạch đi qua lưỡi kéo thì chạm." / "Đều tay": "Chạm đều theo vạch là sợi đều, lỡ một vạch thì sợi to.") | Bánh tráng, mẻ hành lá, hành tím |
| `thai.hai_luot` | `bep_thai_hai_luot` ("Thái một lượt": "Thái hết các vạch dọc trước." / "Xoay thớt": "Thớt tự xoay, thái tiếp lượt ngang là ra hạt lựu.") | Cùi bưởi |
| `cha.boc` | `bep_boc` ("Gõ cho nứt": "Chạm điểm sáng để gõ nứt vỏ." / "Lột từ vết nứt": "Vuốt từ vết nứt ra, nhẹ tay kẻo lủng.") | Trứng cút, hành tím |
| `xoay.vung` | `bep_xoay_vung` ("Đánh tới vùng": "Vẽ vòng cho thước dâng tới vùng xanh." / "Nhấc tay là xong": "Tới vùng rồi thì nhấc tay, không cần đánh đủ vòng.") | Sữa muối |
| `lua.phi`, `lua.rang` | `bep_du_nhiet` ("Tắt bếp sớm": "Dầu còn nóng nên kim chạy thêm một chút sau khi tắt." / "Canh vệt mờ": "Vệt mờ trước kim là chỗ nó sẽ dừng.") | Mẻ sáng |
| `lua.ngam` | `bep_ngam` ("Ngâm đủ giờ": "Vòng quanh thau chạy dần, vào vùng xanh thì vớt ra.") — 1 bước | Mẻ sáng |
| `bao.nao` | `bep_nao` (lời ở mục 2.3.6) | Mẻ Nước cốt dừa |
| `bay.auto` | không tour; thẻ gọn ghi "Đủ là tự xong" ở 3 lần đầu | Kẹp, múc, thả đá |

  Luật cũ giữ: lần đầu gặp cử chỉ mới thì thẻ đầy đủ kể cả người chơi cũ, **tối đa 2 thẻ cử chỉ mới mỗi lần nấu**; cử chỉ mới thứ 3 trở đi trong cùng món hiện thẻ gọn và được thẻ đầy đủ ở lần nấu sau (bánh tráng trộn có kéo theo nhịp, bào, xé, nhặt, bóc 2 nhịp). `state.tour.seen` lưu theo id tour nên không cần migrate.
- **Thẻ bước trong 3 lần nấu đầu của món: ở mọi thao tác** (phản biện vòng 2 #4, #25). Thao tác đầu trạm: thẻ đầy đủ như 0.5.1 (0,8 giây tự chạy hoặc chạm để bắt đầu); thao tác nối: **thẻ gọn có tay mẫu chạy một lượt** (0,8 giây, chồng lên lớp sân khấu đã mount sẵn, chạm được ngay), kể cả loại cũ không có tour (`lua`, `cham`, `rot`) như Chiên trứng ngày 1. Từ lần nấu 4: thao tác nối chỉ hiện động từ 28px. Tổng thời gian thẻ gần bằng 0.5.1 (mục 5.3).
- **Tour** `bep_tram`, `bep_hop`, `so_che_sang` (mục 4.8). Mọi câu ≤ 170 ký tự, ≤ 2 câu, không từ nội bộ (`tour.test`). `tours.js`, `tour.js` là tệp của gói H3 Đợt 3: sửa sau khi Đợt 3 phát hành.
- **Giảm chuyển động cho dải tự trôi** (kéo theo nhịp, dao theo nhịp): xấp bánh tráng / cọng hành **nhảy bậc** đúng một vạch mỗi phách (đổi vị trí trong một khung, không nội suy), vạch kế sáng lên trước 1 phách, lưỡi kéo chỉ đổi tư thế mở / khép; thời điểm chấm như cũ (mục 2.0.5).
- **Góp ý cuối món** (`dishComment`, `DIALOGUE.diSau.typeTips`): mỗi loại mới 2 câu theo lỗi hay gặp, vd băm nhão: "Băm tới vùng Nhuyễn là ngừng, băm nữa là nhão đó con"; tắc đắng: "Bóp vừa tay thôi, bóp kiệt vỏ là đắng". Lời Dì Sáu dùng "xắt" cho có giọng miền Nam; nhãn bước dùng "Thái / Cắt" phổ thông.
- **Lời thoại ngày 1 trên Thớt** (`tutorialLine('thot')`) đổi theo trạm: "Chạm một trạm là làm liền tay các việc của trạm đó."
- **Test**: `tour.e2e` thêm ca người chơi cũ (đã nấu bánh mì > 3 lần) gặp `bep_thai_thanh` ở lần nấu đầu sau cập nhật, và ca `bep_thot` ở board mới: bước "Chọn cách sơ chế" hiện và trỏ ô trạm "Dưa leo" (`data-method="1"`), không bị bỏ qua (v4); `m54-bep.e2e` kiểm tối đa 2 thẻ cử chỉ mới mỗi lần nấu và thẻ gọn có ở thao tác nối trong 3 lần nấu đầu; unit `gestureKey` cho mọi bước của 9 món.

### 7.8 Pháp lý

Chỉ học **cơ chế và cảm giác** (vòng phách co lại, bàn bào có vạch an toàn, mẻ nhiều phần, chuỗi động từ ngắn, vạch xem trước chỗ cắt). Mọi hình, âm, chữ tự làm. Không dùng cảnh "giã trúng tay người lật bột" (ta dùng muỗng vun trong cối); không dùng vòng 6 múi đo độ tươi (ta dùng mức đầy hộp và nhãn giấy); không dùng chữ "dao vàng". Tên game tham khảo chỉ có trong tài liệu nghiên cứu, **không** vào `src/`, `css/`, chuỗi hiển thị hay tên biến (`banned-words.test.mjs` quét cả chú thích).

---

## 8. Kiểm thử

Tên tệp test đổi theo phiên bản: `m54-*` (bản 1 ghi `m53-*`).

### 8.1 Unit mới (`npm test`)

| Tệp | Nội dung |
|---|---|
| `m54-scoring.test.mjs` | 8 hàm chấm mới, `timingScore`, `scoreThaiNhip`, `scoreThaiDuong`, nhánh mới của `scoreCha` (`holes`), `scoreXoay` (`zone`, `oneSided`, `split`), `scoreRot` (`bloom`), `scoreBao` (`zone`), `scoreBay` (`light`): đầu vào rỗng / NaN / âm / chuỗi → 0, không NaN, số nguyên 0..100; đơn điệu; ca mẫu: băm đúng vùng = 100, nhão ≤ 40, 2 lần bỏ lỡ vun −16; giã 1 lần trúng muỗng −15, ra dầu ≤ 40, **trễ cố định 80 ms không đổi điểm giã**; xé [1; 0,43; 1; 1] = 88 (đúng công thức chữ mục 2.3.5); bào dừng giữa vùng "Đủ" không qua vạch đỏ = 100, 1 lần qua vạch đỏ = 80, dừng ở 0,5 < 70; vắt tắc vượt đắng ≤ 55; nhặt 1 lần nhầm = 75, nhầm 3 lần với `fade` 2 = 50 (v4); kéo theo nhịp: **mọi nhát trễ đều 80 ms vẫn 100**, một vạch bỏ lỡ = 20 (không phải 0), ngưỡng 60 / 110 / 175 ms; rạch qua vạch đỏ ≤ 40; bổ dừa lực thấp không thêm nhát, lực quá tối đa 50; nạo một lần lấn viền nâu −20; sữa muối đánh quá (v 1,5) = 100, đánh thiếu (v 0,6) < 80; `mul` nới đúng; quá giờ −15 đúng mốc `overtimeAtStep` |
| `m54-gesture.test.mjs` | `createMince` (cv bỏ quãng vun; loang mỗi 6 nhát; bỏ nhát < 70 ms), `createBeatTrack` (lịch tất định theo hạt giống, phách vun 1/3–1/4, `judge`), `createFillMeter`, `classifyDrag` (góc bất kỳ, đứt khi lệch > tolDeg·m, khi 2 mẫu liền > 1.400 px/s, khi kéo ngược), `lineDeviation` (RMS, độ phủ), `createGrater` (cửa sổ an toàn ≥ 24·m ở bề cao 180–410; quả không lọt dưới lưỡi; `amount()`), `createScraper` (vuốt theo cung hợp lệ / không hợp lệ, lấn viền, `amount()`), `holdLevel` (1 − e^(−t/τ)), `carryValue`, `gestureKey` (mọi bước của 9 món), **`gestureLimitSec` = max(2,5·par, sàn) cho mọi loại, kể cả hàm sàn của vắt** |
| `m54-methods.test.mjs` | `METHOD_SPECS` đủ 19 loại (+ 6 cách thái) và **mọi lớp vỏ ở bảng `bySkin`** (mục 2.0.8); `sample` của mọi loại và mọi lớp vỏ trả đúng dạng hàm chấm nhận; kim lửa: sai số theo giây (σ giá trị ở chu kỳ 4 gấp 1,25 lần chu kỳ 5) (1.000 mẫu ra số 0..100); điểm trung bình tăng theo tay nghề; `staffStepScore ≤ 88` và có `staff`; `staffBatch` tất định theo hạt giống; `stepTimeSec` khớp bảng 5.2 ± 0,05 (vắt theo thước giữ); `dishTimeModel` khớp bảng 5.3 ± 0,1 cho 9 món × 3 hồ sơ × 1–3 phần; hiệu chỉnh Kỹ 1–5 (mục 6.6) |
| `m54-balance.test.mjs` | Bảng khóa mục 5.7 (**19 khóa**; v4 thêm #19 Van gọn bếp). Khóa mô phỏng kiểm hai trạng thái: chính (tau 0,6, van 0) và phát hành (`RELEASE_TAU`, `BALANCE.kitchen.trim`); khi chưa qua cổng, hai trạng thái trùng nhau |
| `m54-morning.test.mjs` | `morningSlots` theo ngày (`{ ice, jar }` 0 / 1); `shouldAutoShow` (ngày 1, công tắc tắt, đã vào hôm nay, thực đơn không có đồ, `ctx.autoAllowed` sai → không hiện; lõi không đọc `navigator`); `startBatch` (hết chỗ, thiếu tiền, ô khóa, món không bán, **giữ tiền cho lựa chọn sự kiện ngày**); **tiền** (mục 4.6): giá mỗi phần bội 500đ, `payMorning` / `refundMorning` / `loseMorning`, Phiếu Chợ Sớm bật trước và sau khi làm mẻ, khóa phiếu, ngày tắc ×2 (phần tăng vẫn tính ở bước Chọn), bỏ món sau khi bốc hộp (phần hộp vào hao hụt), bỏ món khi đã giữ chưa bốc (trả lại hộp), ra món khi chưa bốc (`wasted`), mẻ hỏng khi luộc < 50 (và hộp không hỏng thì không món nào Hỏng vì hộp), đổ bỏ, bỏ dở; **ví % 500 = 0 và "ví sau ca − ví đầu ca = lãi − trả nợ" ở mọi nhánh**; dùng hết mẻ thì lãi ca bằng đúng không sơ chế; `queueYesterday` bỏ đồ của món không bán; `planBoxes` thuần; `submitChon` có hộp: giữ `qty` phần (`used`), giá vốn = không hộp − `qty × p`, **không điền bước**; `takeBox`: điền đúng **điểm từng thao tác** (kể cả `opFor` danh sách; cùi bưởi `luoc` = điểm luộc), phát `step.done { prepped }`, cộng "Sơ chế khéo"; hộp thiếu phần thì làm tay, quên nguyên liệu thì không trừ hộp, ghi chú vá bước có hộp thì làm tay; `finishDish` có hộp: không `bo_qua`, không `chua_so_che`, không mở `chua_rua`; "Vị nhà làm" đúng bậc (Q_mẻ 95 → +4; 88 → +3; 72 → +1; 69 → 0), "Sơ chế khéo" đúng bậc (95 → +3; 84 → 0), tổng thưởng trần +5, Q kẹp 100, không cộng khi "Không cay"; `retryStep` từ chối bước từ hộp; `expireMorning`: dùng → giá vốn, còn lại → hao hụt, tổng = `spent`; nấu thử không dùng hộp; hộp `staff` làm món mất Không tì vết |
| `m54-save.test.mjs` | v1 / v2 / v3 → v4 (có và không có ca dở); `state.morning` hỏng hoặc lệch ngày thì hoàn tiền đúng, ví bội 500; ca dở có `sh.morning` giữ; ca hỏng hoàn cả `ledger.morning`; `migrateCookBoard` giữ board cũ khi đã có bước xong (trà tắc đã vắt kiểu `cham min`; bánh tráng còn `thai_xoai` chưa làm → chơi kiểu ngắm, không áp `METHOD_PLAY`; `thai_dua` đã chọn `bao`), dựng lại khi chưa, `boardRev` chặn dựng lại lần hai; migrate hai lần cùng kết quả; lưu rồi tải lại không đổi; `readCode` của bản cũ gặp v4 báo "bản mới hơn"; **v4:** `state.newWays` theo món đã nấu (mục 6.5) |
| `m54-kitchen.test.mjs` | `tramsOf` (thứ tự, trạng thái `mo` / `khoa` / `dang` / `xong` / `san`), `nextInTram`, `tramScore`; `linePar` theo `pace` (cùng ca của khóa 5.7 #3); `effectiveSteps` qty 2 nhân `hits`, `strands`, `n` của vat / nhat / dap_dap, `cuts` của chat; "Không rau răm" bỏ `nhat_rau_ram` mà `tron` vẫn mở; "Không hành" không bỏ bước; Không tì vết luật D (8 ca biên); **`takeBox`**: không bốc thì bước của trạm chưa xong, `kep_banh` khóa, `finishDish` tính bước chưa bốc là `bo_qua`; bốc hai lần không cộng hai lần; `submitChon` ghi `boardRev = RECIPES_REV`; `METHOD_PLAY` (chọn `cat_thanh` ra `params.cut = 'thanh'`, `thai_lat` ra `'ngam'`); `kep_banh` không rắc hành khi `khong_hanh`; board cũ: `tramsOf` mỗi bước một trạm. **v4:** Q2 (chọn sai cách mở thẻ theo bước `sai_cach:<id>`; `cach_moi:<id>` mở thẻ dù ca đã có 1 thẻ; `newWays` trừ ở `finishDish`, không trừ khi bỏ món); phụ bếp bốc hộp qua `takeBox` với `staff` (không gọi thì trạm phụ thuộc vẫn khóa); **van:** `BALANCE.kitchen.trim` 1 bỏ đúng `nen_phin` (cà phê: `rot_nuoc` mở ngay sau `u_bot`), 2 bỏ thêm `kep_banh` (bánh mì: `nem` mở sau `xe_banh`, `chien_trung`, `thai_dua`), giá vốn, `linePar` không đổi, board đang nấu dở (`boardRev` cũ) không đổi |
| `m54-art.test.mjs` | Mọi id hình mục 7.4 có thật, đúng viewBox, cỡ ≤ trần; tệp `bep-chuan.js` ≤ 100 KB; `state-map` mới trỏ id bước có thật; hộp và hũ ghép được cho 12 đồ; mỗi loại có biểu tượng thật |
| `m54-quests.test.mjs` | Món có hộp phát `perfect_thai`, `perfect_lua`, `perfect_step` đúng số như làm tay; mẻ sáng không phát `step.done`; `thai_hoan_hao` mục tiêu mới theo số khách; board mới (bánh mì có Xẻ ổ bánh) đếm đúng; nhiệm vụ "Trứng cút luộc, ngâm nước đá" chỉ ra ở ngày có bánh tráng và ô thùng đá thứ 3, tối đa một lần mỗi 5 ngày (v4) |
| `m54-tips.test.mjs` (mới, v4) | `NEW_WAY_STEPS`: mỗi bước có đúng một thẻ mang `trigger` hoặc `alsoOn` tương ứng; thẻ có `title`, `text` ≤ 120 ký tự, `hint`; không từ cấm; `unlockTip` khớp `alsoOn`; `capExempt` chỉ bỏ trần một thẻ mỗi ca, không mở lại thẻ đã xem |

### 8.2 Unit sửa có chủ ý (ghi lý do trong commit)

| Tệp | Sửa | Gói |
|---|---|---|
| `data.test.mjs` | `STEP_TYPES` 19; bảng món hiếm dùng Σ`pace`; gợi ý `MINIGAME_TYPES` mới; lược đồ `params.cut`, `trams`, `pace`, `PREP_ITEMS`; luật `after` của bước bị ghi chú bỏ nới cho `nhat_rau_ram` (dòng 209-214) | P2 |
| `minigame-ui-contract.test.mjs` | 19 plugin + `_tram.js`: mount / destroy được, `result` null khi destroy, import trong Node không chạm DOM, có `snapshot` / `hold` nếu khai; **giới hạn giờ thực tế của plugin = `gestureLimitSec`** (đo bằng đồng hồ giả); nhận `ctx.tram`, `ctx.prewarm` (không chạy đồng hồ, không phát âm, không bắt chạm trước `start()`) | P0 (khung, kể cả khung test `ctx.prewarm` / `start()` đánh dấu `todo` cho từng plugin), P6 / P7 / P8 (bỏ `todo` của plugin mình), P9 (hai lớp) |
| `m5-components.test.mjs` | `GESTURE_BY_TYPE` 19 mục, `GESTURE_BY_CUT`, `GESTURE_BY_SKIN` (`bao.nao`, `cha.boc`); mọi cử chỉ có tay mẫu trong `css/fx.css` (v4); hằng phụ phí gọn | P9 (phần tay mẫu: P5) |
| `m5-gesture.test.mjs` | Sàn giờ 19 loại (dòng 192-208), sàn mới của `dap`, `bay` | P1 |
| `m5-kitchen-ui.test.mjs` | `STEP_STATE` mới, biểu tượng mọi bước mới, ô trạm, hằng thời gian (dòng 129) | P9 |
| `m5-balance.test.mjs` | Thu về khóa lịch sử (mục 5.7) | P2 |
| **`m4-save.test.mjs:55`, `meta-save-progression.test.mjs:39`, `core-economy.test.mjs:13`** | `STATE_VERSION` 3 → 4 (bản 1 sót ba tệp này) | P3 |
| **`review-m3-fixes.test.mjs:328-330`** | Nộp `rot_nuoc` rồi đòi `u_phin` mở: với cà phê mới `rot_nuoc.after = [nen_phin]`, `submitStep` trả `chua_mo`; sửa thành nộp `u_bot`, `nen_phin`, `rot_nuoc` rồi mới kiểm `u_phin` (phản biện vòng 2 #18) | P3 |
| `core-economy.test.mjs` | Dòng "Sơ chế sáng" ở Tổng kết; bất biến ví khi có `ledger.morning` | P3 |
| `meta-quests.test.mjs` | Mục tiêu `thai_hoan_hao` mới | P10 |
| `art-v2.test.mjs` | Trần tổng 420 KB (dòng 1031) kèm lý do. **Tệp của Đợt 3** (gói M-H, R3): sửa sau khi Đợt 3 phát hành, dò lại dòng | P4 |
| `audio.test.mjs`, `vfx.test.mjs` | 34 âm, 13 loại hạt. `vfx.test.mjs` cũng là tệp của Đợt 3 (gói M-N): chỉ thêm khối test | P5 |
| `core-kitchen.test.mjs`, `core-scoring.test.mjs`, `core-minigame-scoring.test.mjs`, `m5-scoring.test.mjs`, `m5-save.test.mjs`, `m5-hoi-quy.test.mjs` | Id và loại bước mới (`vat_tac` vat, `thai_xoai` bao, `xe_kho_muc` xe); `nem` bánh mì nay sau `kep_banh`; luật Không tì vết D | P1, P3 |
| `banned-words.test.mjs` | Thêm `src/data/prep-items.js` vào `DISPLAY_FILES`; đã soát tên mới (`createGrater`, `createScraper`, `takeBox`, `pick`, `snip`, `pit`, `thump`, `mince`, `whack`, `lid`, `hu_nha_lam`, `bo_dua`, `nao`) không chứa chuỗi cấm | P2 |
| `tour.test.mjs` | Tour mới có đích tồn tại, đúng luật độ dài; `bep_thot` bước "Chọn cách sơ chế" có đích `board-tram-*[data-method="1"]` (v4). Tệp của Đợt 3 (gói H3) | P10 |
| `pwa.test.mjs` | Không sửa nếu P0 gắn đủ CSS / JS mới vào `index.html`, `sw.js`. Tệp của Đợt 3 (R3): chỉ chạm sau khi Đợt 3 phát hành | P0 |

### 8.3 E2E và bộ giải (`tests/e2e/helpers.mjs`)

`helpers.mjs`, `hanh-trinh.mjs`, `tour.e2e.mjs` là tệp của gói H3 Đợt 3: gói P11 chỉ sửa sau khi Đợt 3 phát hành, dò lại.

**Bộ giải `playStage`** thêm 8 nhánh theo hợp đồng ở mục 2.3 và nhánh nâng cấp; **loại và cách thái đọc từ sân khấu** (`minigame-stage[data-type]`, `thai-board[data-cut]`), không từ `DATA`:

| Loại | Cách giải |
|---|---|
| `thai` | `data-cut`: ngắm như cũ; `keo` / `nhip` chạm khi `thai-feed[data-next]` ≤ 30 ms; `thanh` kéo dọc `thai-line-i`; `rach` kéo tới cách `data-end` 10px; `hai_luot` chờ `thai-pass[data-v]` đổi |
| `bam` | Chạm xen kẽ cách 160 ms; thấy `bam-gather` thì vuốt; dừng khi `data-v` ≥ tâm vùng − 0,02 |
| `chat` | Vuốt lên 80px; `waitNeedleNear`; chạm `data-x` |
| `dap_dap` | Kéo bản dao tới miếng (lớp `dao`); `waitNeedleNear`; chạm |
| `gia` | Chạm khi `data-kind="gia"` và `data-next` ≤ 35 ms; dừng khi `data-v` ≥ tâm |
| `xe` | Kéo 18 bước × 16 ms tới `data-len` + 8 |
| `bao` | Giữ cách đầu 16px; kéo tới `blade` + 30 − len + 16; không vượt `bao-safe`; dừng khi `bao-meter[data-v]` ≥ tâm vùng |
| `vat` | Nhấn giữ tới `data-v` ≥ tâm vùng rồi thả |
| `nhat` | Chạm mọi `data-ok="1"` |
| Nâng cấp | `lua` phi / rang: chạm `lua-lift` (chốt ở `pointerdown`) khi `lua-needle[data-v]` ≥ tâm vùng − `data-carry`; `lua` ngâm: chạm `lua-lift` khi `lua-ring[data-v]` vào vùng; `cha` bóc 2 nhịp: chạm `cha-crack-i[data-cracked="0"]` rồi vuốt; `xoay` zone: nhấc khi `xoay-meter[data-v]` vào vùng; `bay` tự xong (không chờ `bay-done`, kể cả thả đá); `rot` phin: bọt (`rot-bloom`) không chặn; `bao` lớp `nao`: vuốt theo cung (mục 2.3.6); `chat` lớp `dua`: vuốt lên 50px rồi chạm vạch |

**Bộ giải trạm** (`playBoardTram`, thay `playBoard` nhưng giữ tên cũ làm bí danh): chạm `board-tram-*` có `data-state="mo"` (hoặc `"san"`: chạm để bốc hộp — gọi `takeBox`) theo thứ tự (hoặc `board-step-<id>` như cũ — chạm chấm mở đúng trạm); sau mỗi thao tác chờ `minigame-stage[data-step]` đổi hoặc con dấu trạm; lặp tới khi hết trạm mở; bấm `finish-dish`. `enterStep` qua bảng chọn cách đầu trạm như cũ.

**Màn sáng:** `startNewGame` **không đổi** (ngày 1 không có màn sáng; dưới `navigator.webdriver` màn không tự hiện). Thêm `prepMorning(page, [{ id, size }])` (mở bằng `?sang=1` hoặc ô `prep-morning`) và `skipMorning(page)`.

**Tệp mới:**

| Tệp | Kiểm |
|---|---|
| `m54-bep.e2e.mjs` | 9 món nấu trọn bằng bộ giải: trạm chạy liền, số chấm đúng, một con dấu mỗi trạm, "Tiếp →" đi tới trạm kế, tải lại giữa trạm chơi tiếp đúng thao tác, Làm lại một thao tác trong trạm, Tự làm cả trạm (thạo cấp 2) chỉ khi toàn việc nhỏ, chí mạng hỏng giữa trạm hỏi làm lại; nhặt nhầm 2 lần thì mồi mờ (`nhat-board[data-faded="1"]`, v4); đủ 19 loại xuất hiện ít nhất một lần (băm, chặt, giã, đập dập dao, nạo, ngâm qua mẻ sáng); không chạm "Bốc" thì trạm phụ thuộc khóa và "Ra món" hỏi "Còn n bước"; người chơi cũ thấy tối đa 2 thẻ cử chỉ mới mỗi lần nấu |
| `m54-so-che.e2e.mjs` | `?sang=1`, ngày 2: tour `so_che_sang`; làm `rau_banh_mi` 4 (thùng đá) và, ngày có bánh tráng, `hanh_toi_phi` 8 (hũ, 0đ) (ví giảm đúng, bội 500đ); ngày có lựa chọn sự kiện tốn tiền mà ví sát thì viên cỡ mẻ ghi "Giữ …đ"; tải lại giữa mẻ quay về đúng thao tác; "Mở hàng"; nấu bánh mì: trạm Dưa leo "Có sẵn", chạm "Bốc" không mở sân khấu, giá vốn = không hộp − 1.000đ, Q dùng điểm từng thao tác, màn Ra món có tem "Sơ chế khéo +n"; hộp đếm lùi; đơn 2 phần khi hộp còn 1 thì làm tay; hết hộp có thông báo; bỏ món sau khi bốc hộp; Tổng kết có dòng sơ chế (dùng / bỏ cộng lại = đã chi); ngày sau thùng trống, "Như hôm qua" xếp đúng hàng chờ; "Bỏ qua" vào ca như cũ; tắt "Hỏi sơ chế mỗi sáng" thì không hiện; ô `prep-morning` vẫn vào được; Phiếu Chợ Sớm bật trước khi làm mẻ thì công tắc phiếu khóa; **v4:** làm một mẻ → chạm `morning-back` → về sảnh Chuẩn bị, hộp còn (dải `prep-morning` ghi số ô đã dùng), công tắc phiếu khóa "Đã dùng cho mẻ sáng"; "Mở hàng" vào thẳng ca mang theo hộp |
| `m54-vua-man-1.e2e.mjs` | 10 khung của `vua-man-khung` (có 375×553) × {sân khấu 8 loại mới + 4 cách thái mới + lớp `ngam`, `nao`, bổ dừa}: **vùng chơi, đích thao tác và nút `.mg-foot` thấy trọn không cuộn ở mọi khung** (đúng luật sân khấu của `vua-man-bep`), vùng chạm ≥ 44px, chữ ≥ 13px, không tràn ngang; giảm chuyển động vẫn qua (dải kéo nhảy bậc) |
| `m54-vua-man-2.e2e.mjs` | 10 khung × {Thớt Tây Ninh có dải hộp (khung chính: mọi `board-tram-*` thấy không cuộn; khung nhỏ: `finish-dish` và trạm đang làm được, như luật `vua-man-bep` — thực tế mọi ô đều vừa, mục 7.1), **Thớt của save v3 đang nấu dở Tây Ninh (bố cục 0.5.2)**, **màn Ra món có hàng tem**, màn sáng: ô trống, đủ 3 hộp + 1 hũ, ô thứ 3 khóa (ngày 2–4), tấm chọn mẻ, trang 2 của lưới đồ, hôm qua có làm (chân 3 nút), bong bóng Dì Sáu (ẩn ở s, xs), nút `morning-back` (v4)}: vùng chạm ≥ 44px, chữ ≥ 13px, không chữ "…" ở dòng trạng thái ô trạm. Tách đôi để mỗi tệp dưới mốc 10 phút |
| `m54-save.e2e.mjs` | Tải lại giữa trạm; save v3 đang ở Thớt trà tắc (đã vắt kiểu cũ) nạp được và chơi tiếp board cũ; save v3 đang ở Thớt bánh tráng còn `thai_xoai` chơi kiểu ngắm; **v4 (Q2):** save v3 đã nấu bánh tráng, trà tắc: bảng chọn cách của xoài có `method-new-bao_soi`, chọn "Thái sợi" thì hiện `tip-card` "Mẹo nghề: Xoài bào sợi"; ô trạm Tắc có `tram-new-tac`; ra món 3 lần thì nhãn mất |

**Sửa có chủ ý:** `m5-bep`, `m5-save`, `fix-leftovers`, `iphone-overlays`, `tour`, `vua-man-bep`, `vua-man-khung`, `m5-vua-man` (id và loại bước mới, `playBoardTram`, Thớt theo trạm: kiểm `board-tram-*` ≥ 48px cao thay cho mỗi `board-step-*` ≥ 48px), và **`m4-rare.e2e.mjs:257-284`** (bản 1 sót: tệp chạm thẳng `board-step-<id>` rồi chờ `.is-done` hoặc `step-result`; với trạm, trạm chạy tiếp và không có con dấu từng thao tác — đổi sang chờ con dấu trạm hoặc `board-step-<id>.is-done` sau khi trạm đóng), và **`save-safety.e2e.mjs:189`** (`s.version = 4` làm "bản mới hơn" đổi thành `STATE_VERSION + 1` đọc từ `src/core/state.js`, để nhánh so phiên bản của `readCode` vẫn được thử khi save lên v4; phản biện vòng 2 #18). Không thuộc `npm run e2e` nhưng cũng cập nhật: `_kitchen-smoke.mjs`, `hanh-trinh.mjs`, `tools/tim-seed.mjs` (giữ id bước nên `uiRand` ít lệch; chạy lại để xác nhận hạt giống). Thao tác nhịp (giã, kéo theo nhịp) làm mỗi món e2e dài thêm khoảng 1–2 giây; có `ctx.e2eSlow` (nhịp × 0,8) khi URL có `?test=1`; đo thời gian mỗi tệp, không tệp nào vượt mốc 10 phút.

### 8.4 Mô phỏng trong kiểm thử

- `tools/mo-phong-bep/` (mới): chép bộ mô phỏng `mo-phong-v3b/` (của người phản biện vòng 2): **chạy cả ca bằng các hàm lõi thật** (`startShift`, `advance`, `beginCounter` … `clipTicket`, `submitChon`, `takeBox`, `submitStep`, `finishDish`, `serveTicket`, `resolveComplaint`, `endShift`), chỉ thay phần thao tác của người chơi; **thay mọi hàm chấm và hàm thời gian chép tay bằng `METHOD_SPECS` (kim lửa theo giây, lượt trượt vào), `minigame-scoring.js`, `DATA.RECIPES`, `DATA.PREP_ITEMS` thật của repo** sau gói P2. Chạy ngoài `npm test`; ghi kết quả vào `docs/can-bang.md` mục 7.3 mới.
- `m54-balance` gọi bản rút gọn (hạt giống cố định) cho khóa #5, #15, #16, #17; có cờ `MO_PHONG_DAY_DU=1` chạy đủ 300 hạt giống ngoài CI.
- Hằng hiệu chỉnh `CAL` (mục 5.5) là dữ liệu thật trong `METHOD_SPECS` / `recipes.js`, không phải hằng riêng của mô phỏng.
- **v4:** `tools/mo-phong-bep` nhận `tau`, `trim` (mức Van gọn bếp) và muối hạt giống; chế độ đủ (`MO_PHONG_DAY_DU=1`) chạy **3 bộ × 300 hạt giống** (muối 0, 17, 29) và in **độ lệch chuẩn giữa các bộ** cho mọi số của khóa #15–#17 (khóa #15: 3 bộ × 20.000 món mỗi ô); một bộ mất khoảng 3,5 phút trên một nhân (đo ở `kiem-cuoi/v4/`). Cổng 8.5 dùng chế độ này để chọn mức van.

### 8.5 Cổng nghiệm thu trên máy thật

Số [MH] phải đo lại trước khi phát hành:
- 3 người chơi (mới, trung bình, quen), mỗi người nấu 9 món, 1 và 2 phần, trên iPhone 16 Pro (Safari và PWA), và một lượt trên iPhone SE (Safari, khung 375×553); ghi thời gian từng thao tác, từng chuyển trạm và từng món bằng `stats` gỡ lỗi (chỉ trên máy, không gửi đi).
- **Đạt** nếu: (1) thời gian món của mỗi người ≤ 1,08 × số đo cùng người ở bản 0.5.1 (mục tiêu) và ≤ 1,20 × (trần cứng) ở mọi món và số phần đã đo; (2) **tau đo được** (giây thêm mỗi thao tác nối trong trạm, ngoài thời gian thao tác; trung vị của người trung bình) ≤ 0,6 giây — lớn hơn thì theo **quy trình van** dưới đây (v4; kiểm cuối #1), **không** phát hành kèm ghi chú như bản v3; (3) chuyển giữa hai thao tác trong trạm ≤ 0,35 giây từ lúc thả tay tới lúc chạm được; (4) 8 thao tác mới làm được bằng một tay; vuốt xé, bào không kích cử chỉ quay lại của iOS; (5) giã, kéo theo nhịp không có cảm giác "bị trừ oan".
- Không đạt (1) thì theo thứ tự bỏ dự phòng ở mục 5.3; **không** đổi `pace`.

**Quy trình van khi tau đo được > 0,6** (thay câu "0,6 < tau ≤ 0,9 thì khóa #16 vẫn đạt, ghi trong ghi chú phát hành" của bản v3; chờ người dùng xác nhận ở Q11). Lý do: ở máy chậm, người giỏi không sơ chế mất giây ở mỗi thao tác nối, còn hộp sơ chế trả lại đúng phần giây đó, nên lợi sơ chế của người giỏi vượt mức người dùng chốt (+0,08): +0,110 ở tau 0,75, +0,155 ở tau 0,9 (mục 5.6). Thưởng cấp món và số ô thùng đá không kéo được phần này xuống (đã đo, mục 5.9); chỉ bớt giây trong ca mới kéo được.
1. **Giảm tau ở giao diện trước** (gói P9; không đổi dữ liệu, không đổi luật chơi): chuyển cảnh giữa hai thao tác trong trạm 250 → 150 ms; động từ 28px 350 → 200 ms (vẫn chạm được ngay); thao tác kế mount sẵn ở lớp ẩn trước khi con dấu của thao tác trước chạy xong. Đo lại tau.
2. **Vẫn > 0,6:** chạy `tools/mo-phong-bep` ở chế độ đủ (3 bộ × 300 hạt giống) **ở đúng tau đo được**, lần lượt van mức 0 → 1 → 2, chọn **mức nhỏ nhất** mà khóa #15, #16 (gộp và từng ngày) và #17 (dải TB, Giỏi ≤ +0,08) đều đạt. Ghi tau đo được vào `RELEASE_TAU` (`tools/mo-phong-bep/cau-hinh.mjs`) và mức vào `BALANCE.kitchen.trim`; tăng `RECIPES_REV` nếu mức khác 0. Từ đó `m54-balance` kiểm trạng thái phát hành ở đúng cặp này (khóa #16, #17, #19).
3. **Không mức nào đạt** (tau đo được > 0,85, hoặc rơi vào chỗ giáp ranh ở bảng dưới): **không phát hành**; quay lại bước 1 để giảm tau thêm rồi đo lại. Không thêm mức van chưa đo, không nới ngưỡng. Người dùng chọn khác ở Q11 thì quy trình đổi theo.

**Van gọn bếp** (khóa #19). Chỉ bỏ thao tác **mới thêm ở 0.5.4**, trọng số 1; không đụng bước nào có từ 0.5.1, không đụng bước người dùng chốt ở Q2 (cắt thanh, bào sợi, khều hạt). Van là dữ liệu của bản phát hành, áp cho **mọi** người chơi, không theo từng máy.

| Mức | Bỏ | Làm thay thế nào | Σpar mới (Σ`pace` không đổi) |
|---|---|---|---|
| 0 | — | — | như bảng 3.3 |
| 1 | "Gài nắp nén vừa tay" (`nen_phin`) ở cà phê sữa đá, cà phê muối | Phin nắp gài: đặt nắp lên lớp bột là xong, không nén (HB); ủ bột, rót nước, chờ phin giữ nguyên | cà phê sữa đá 21,5 → 20; cà phê muối 27,5 → 26 |
| 2 | Mức 1 + "Kẹp trứng, dưa leo vào ổ" (`kep_banh`) ở 2 món bánh mì | Thao tác này vốn tự xong; nay trứng, dưa leo vào ổ ngay lúc rưới nước tương | thêm: bánh mì ốp la 21,5 → 20; bánh mì trứng gà ta 25,5 → 24 |

**Kết quả đo** (Δ sao/khách, ngày 4–15, gộp 3 bộ trừ chỗ ghi "1 bộ". Trong ô: **Giỏi có − không sơ chế**; **TB không sơ chế − 0.5.1**. ✓ đạt #16 gộp và #17; "biên" = đạt sát ngưỡng; ✗ trượt. Tệp `kiem-cuoi/v4/kq4/gop-*.txt`, `ket-qua/ca-m*.json`, `ca-t-x08*.json`; bản thiết kế biến thể `bt-van-d.md` (mức 1), `bt-van-a.md` (mức 2)):

| tau đo được | Mức 0 | Mức 1 | Mức 2 |
|---|---|---|---|
| 0,6 | ✓ +0,069; +0,090 | — | — |
| 0,65 | ✓ biên: +0,078; +0,074 (1 bộ) | ✓ biên: +0,055; +0,116 (1 bộ) | — |
| 0,7 | ✗ +0,090 (1 bộ) | ✓ +0,066; +0,097 (1 bộ) | — |
| 0,75 | ✗ +0,110 | biên: +0,080; +0,076 | — |
| 0,8 | — | ✗ +0,094 (1 bộ) | ✗ biên: +0,060; **+0,121** (> +0,12) |
| 0,85 | — | — | ✓ +0,071; +0,104 (chặn đỉnh 5★ ngày 2 biên mỏng, mục 5.7) |
| 0,9 | ✗ +0,155 | — | ✗ +0,084 |

TB có sơ chế ở mọi ô có số: +0,53 … +0,55 (trong dải); Ẩu có sơ chế +0,01 … +0,06 (trong khoảng −0,02 … TB); 81 ô (#15) đạt ở cả ba mức (mục 5.5). Bảng có hai chỗ giáp ranh (quanh tau 0,63 và 0,77 … 0,82) nơi không mức nào đạt chắc chắn: ở đó quy trình đi bước 3. Các van khác đã đo và bị loại (thưởng, số ô, bỏ ngắt lá rau răm, bỏ xẻ ổ bánh, bỏ ủ bột) ở mục 5.9.

**Ghi lại khi qua cổng:** tau đo được (trung vị và khoảng tứ phân vị), mức van đã chọn, số đo #15–#17 ở trạng thái phát hành kèm biên theo độ lệch chuẩn, vào `docs/can-bang.md` mục 7.3 và ghi chú phát hành.

---

## 9. Gói triển khai

**Điều kiện trước (phản biện vòng 1 #10).**
- Workflow "Vừa màn hình" đã gộp và phát hành (HEAD `5970a06`, 0.5.2).
- **Đợt 3 (màn ngoài ca, 0.5.3) đã gộp và đã phát hành trước khi bắt đầu BẤT KỲ gói nào** (người dùng chốt Q8; phản biện vòng 2 #19). Các workflow dùng chung một thư mục repo; Đợt 3 đang sửa `vfx.js`, `tests/unit/vfx.test.mjs`, `tests/unit/meta-ui.test.mjs` (WIP `0773cc7`), `prep.js`, `shop.js`, `market.js`, `tasting.js`, `stage-up.js`, `css/prep.css`… và còn sẽ chạm `index.html`, `sw.js`, `app.js`, `art.js`, `mail.js`, `tours.js`, `tour.js`, `helpers.mjs`, `summary.js`, `title.js`. Bắt đầu sớm, kể cả trong worktree riêng, chỉ dời xung đột sang lúc gộp.
- Mọi gói đọc mã sau khi gộp và **dò lại số dòng** dẫn trong bản này (số dòng hiện theo `89ec66d` / `5970a06`).

**Luật tệp:** không hai gói nào sửa cùng một tệp **cùng lúc**. Các tệp đăng ký dùng chung (`index.html`, `sw.js`, `src/ui/app.js`, `src/data/index.js`, `src/ui/art.js`) do **P0** chạm một lần; sau P0 chỉ P11 được sửa `index.html`, `sw.js` (phiên bản) và `app.js` (`APP_VERSION`). `src/ui/minigames/index.js`: P0 chỉ thêm 8 plugin vào `MINIGAMES`; chế độ hai lớp do **P9** sở hữu. Tệp P0 tạo rỗng chuyển quyền cho gói ghi ở cột "Tệp sở hữu".

| Gói | Việc | Tệp sở hữu | Cần trước | Nghiệm thu |
|---|---|---|---|---|
| **P0 Khung, đăng ký, khóa nhịp** (một agent, làm trước) | Tạo **mọi tệp mới** dạng khung: `src/core/methods.js`, `src/core/morning.js`, `src/data/prep-items.js`, 8 plugin `src/ui/minigames/{bam,chat,dap_dap,gia,xe,bao,vat,nhat}.js` (nút "Xong", trả `{ score: 100 }`, đúng hợp đồng), `src/ui/minigames/_tram.js` (chạy tuần tự `playStep`), `src/ui/screens/morning.js` (khung trống), `src/ui/art/bep-chuan.js` (rỗng), `css/mg-dao.css`, `css/mg-tay.css`, `css/morning.css` (rỗng); **gắn** CSS vào `index.html` (v4: `css/mg-dao.css`, `css/mg-tay.css`, `css/morning.css` đặt **sau** `css/mg-prep.css` và `css/fx.css`, để luật thái mới của P6 ghi đè luật cũ mà không sửa tệp của P8, P5), viết sẵn **khung test hợp đồng `ctx.prewarm` / `start()`** cho 19 plugin trong `minigame-ui-contract` (plugin chưa hỗ trợ đánh dấu `todo`), mọi tệp mới vào `PRECACHE` của `sw.js`, plugin vào `MINIGAMES` (19), màn `morning` vào `SUB_SCREENS`, `PREP_ITEMS` vào `DATA`, bộ hình vào `art.js`; thêm `pace` (= mảng par hiện tại) cho 9 món, `linePar` đọc `pace`, `SCALE_KEYS` + `hits`, `strands` | `index.html`, `sw.js`, `src/ui/app.js`, `src/data/index.js`, `src/ui/art.js`; chỉ `MINIGAMES` trong `src/ui/minigames/index.js`; chỉ thêm `pace` trong `src/data/recipes.js`; chỉ `linePar` + `SCALE_KEYS` trong `src/core/kitchen.js`; `tests/unit/minigame-ui-contract.test.mjs` (khung), `pwa.test.mjs` (nếu cần) | **Đợt 3 đã phát hành** | `npm test`, `npm run e2e` xanh; **không đổi hành vi** (`linePar` mới = cũ 207/207) |
| **P1 Chấm, đo, `METHOD_SPECS`** | Mục 2.0.2, 2.0.7, 2.0.8, công thức 2.2.1, 2.3, hằng `CAL` (mục 5.5); hiệu chỉnh tay nghề theo bảng "Kỹ" | `src/core/minigame-scoring.js`, `src/ui/minigames/_gesture.js`, `src/core/methods.js`; `tests/unit/m54-scoring`, `m54-gesture`, `m54-methods`, `m5-gesture`, `core-minigame-scoring`, `m5-scoring` | P0 | Test xanh; điểm trùng `mo-phong-v2/mo-hinh-v2.mjs` trên 1.000 bản ghi ngẫu nhiên mỗi loại; khóa Kỹ |
| **P2 Dữ liệu và khóa cân bằng** | Mục 3, 4.2, 5.7: 9 công thức mới, 8 loại + lớp vỏ, 12 đồ sơ chế, `BALANCE` mới, `METHOD_PLAY`; `tools/mo-phong-bep/` (bản gọi hàm thật, mục 8.4); **v4:** trường `trim` của bước và `BALANCE.kitchen.trim` (khóa #19), `RELEASE_TAU`, mô phỏng nhận `tau`, `trim`, muối hạt giống và in độ lệch chuẩn giữa các bộ | `src/data/recipes.js`, `minigame-types.js`, `prep-items.js`, `balance.js`, `reviews.js`; `tests/unit/data.test.mjs`, `m5-balance`, `m54-balance`, `banned-words`, `tests/fixtures/data.mjs`; `tools/mo-phong-bep/` | P1 | Bảng khóa 5.7 xanh (19 khóa); giá, vốn Chọn không đổi; mô phỏng rút gọn trong ngưỡng |
| **P3 Lõi bếp, sơ chế, tiền, save** | Mục 4.3–4.6, 4.9 (tín hiệu), 6.1–6.6: hộp trong bếp (giữ phần, **`takeBox`**), thưởng cấp món, đồ nhà làm, giá hộp bội 500đ, giữ tiền cho lựa chọn sự kiện, sổ buổi sáng (`used` / `wasted`), luật Không tì vết D, state v4, migrate; **v4:** `state.newWays`, `unlockTip` (`alsoOn`, `capExempt`), kích hoạt `sai_cach:*`, `cach_moi:*` (mục 4.8); `effectiveSteps` theo `trim`; ba điều kiện `cond` mới của nhiệm vụ (mục 4.9) | `src/core/kitchen.js` (phần còn lại), `scoring.js`, `morning.js`, `shift.js`, `economy.js`, `stats.js`, `state.js`, `save.js`, `events.js` (chỉ `previewDayMods`, `couponLocked`), `quests.js` (v4: chỉ `cond` mới); `tests/unit/core-kitchen`, `core-scoring`, `core-economy`, `core-shift`, `m4-save`, `meta-save-progression`, `m5-save`, `m5-hoi-quy`, `m54-kitchen`, `m54-morning`, `m54-save`, `m54-quests`, `review-m3-fixes` | P2 (dữ liệu giả trong `tests/fixtures/data-m54.mjs` để bắt đầu sớm) | `integration-shift` không đổi lịch khách; bất biến ví và % 500 ở mọi nhánh; migrate hai lần cùng kết quả; hộp không trừ giá vốn hai lần |
| **P4 Hình** | Mục 7.4: đạo cụ, trạng thái, đồ của mẻ, hũ, biểu tượng, `state-map`, `phin_lon.nap_nen`, trần dung lượng | `src/ui/art/bep-chuan.js`, `props.js`, `tools.js`, `state-map.js`; `tests/unit/art-v2`, `m54-art` | P0, **Đợt 3 đã phát hành** (`art-v2.test`) | Ảnh lưới 4 cỡ, 2 nền; quy chuẩn cel-shading; `bep-chuan.js` ≤ 100 KB, tổng ≤ 420 KB |
| **P5 Âm, hạt, tay mẫu** | Mục 7.5, 7.6; tay mẫu 13 cử chỉ mới trong `css/fx.css` (mục 7.7) | `src/ui/audio.js`, `src/ui/vfx.js` (chỉ thêm), `css/fx.css`; `tests/unit/audio`, `vfx` (chỉ thêm) | P0 (`vfx.js`, `vfx.test.mjs` là tệp của gói M-N Đợt 3) | Test xanh; nghe thử trên Safari iOS và Chrome Android; không từ cấm |
| **P6 Thao tác dao** | Cổng dựng thử (mục 7.3) rồi làm thật: thái (`thanh`, `rach`, `keo`, `nhip`, `hai_luot`, `METHOD_PLAY` chỉ cho board mới), băm, chặt, đập dập; **hỗ trợ `ctx.prewarm` / `start()` cho cả 4 plugin** (mục 7.2). CSS thái mới **chỉ ghi đè trong `css/mg-dao.css`**: luật thái cũ nằm ở `css/mg-prep.css` (14 dòng khớp `mg-thai\|g-thai2\|thai-` ở `5970a06`, tệp của P8) và `css/fx.css` (12 dòng, tệp của P5), không sửa hai tệp này | `src/ui/minigames/thai.js`, `bam.js`, `chat.js`, `dap_dap.js`, `css/mg-dao.css` | P1, P4, P5 (P4 chưa xong thì dùng hình tạm) | Hợp đồng plugin, kể cả test `ctx.prewarm` / `start()` (bỏ `todo`) cho 4 plugin; testid mục 2; bộ giải được 100 điểm ở 4 khung; giảm chuyển động (dải nhảy bậc); cổng đo 7.3 |
| **P7 Thao tác tay và lực** | Cổng dựng thử rồi làm thật: giã, xé, bào / nạo (thước "Lượng sợi"), vắt / nén / vắt ráo (thời gian theo thước giữ), nhặt / khều (mồi mờ sau 2 lần nhầm); sửa 7 lỗi dựng thử (7.3); **hỗ trợ `ctx.prewarm` / `start()` cho cả 5 plugin** | `src/ui/minigames/gia.js`, `xe.js`, `bao.js`, `vat.js`, `nhat.js`, `css/mg-tay.css` | P1, P4, P5 | Như P6 (test `prewarm` cho 5 plugin) |
| **P8 Lớp vỏ và giới hạn giờ cho loại cũ** | `cha` bóc 2 nhịp / xát / bóp; `lua` lò / nướng / phi / rang / luộc / **ngâm (G5)** + dư nhiệt; `rot` phin + bọt; `xoay` vùng (chỉ chấm thiếu); `lac` hộp; `bay` ổ bánh / múc / tự xong cho mọi bước bày; `chon` huy hiệu hộp; **mọi plugin cũ chuyển sang `gestureLimitSec`**; **hỗ trợ `ctx.prewarm` / `start()` cho 11 plugin cũ** (đồng hồ, âm, bắt chạm chỉ chạy sau `start()`) | `src/ui/minigames/cha.js`, `lua.js`, `rot.js`, `xoay.js`, `lac.js`, `bay.js`, `chon.js`, **`cham.js`, `dap.js`, `got.js`, `_util.js`**, `css/mg-prep.css`, `css/mg-heat.css`, `css/mg-mix.css`; `tests/unit/cha-fit` | P1, P4, P5 | Bước cũ chơi y như trước (so ảnh) trừ chỗ có chủ ý (giới hạn giờ theo sàn mới, thả đá tự xong); lớp vỏ mới đúng chữ, hình, âm; e2e cũ của các loại này xanh; test `prewarm` xanh cho 11 plugin |
| **P9 Trạm, Thớt, phụ phí gọn, thẻ bước, phiếu chấm** | `_tram.js` thật, **`playStep` hai lớp** (mục 7.2), Thớt theo trạm, dải hộp, bốc hộp một chạm, "Tiếp →", **hằng phụ phí gọn (bắt buộc)**, thẻ bước theo cử chỉ + tay mẫu, tối đa 2 thẻ cử chỉ mới, góp ý; **màn Ra món** có hàng tem "Sơ chế khéo", "Vị nhà làm", "trượt nhẹ" (phiếu chấm chỉ thêm tem "Sơ chế" trong hàng Bếp); Thớt ở xs (3 cột); sân khấu xs (đầu gọn, chân 44); Thớt của board cũ dùng bố cục 0.5.2; thẻ người mới ở mọi thao tác; **v4:** nhãn "Cách mới" ở bảng chọn cách và ô trạm, dấu bút `data-method` trên ô trạm (mục 4.8, 7.1); bước 1 của quy trình van (giảm tau ở giao diện) nếu cổng 8.5 đòi | `src/ui/minigames/_tram.js`, **`src/ui/minigames/index.js`** (hai lớp), `_frame.js`, `src/ui/screens/kitchen.js`, `src/ui/components/step-card.js`, `stamp.js`, `dish-reveal.js`, **`src/ui/components/score-sheet.js`**, `css/kitchen.css`, `css/sheet.css` (chỉ khối phiếu chấm); `tests/unit/m5-components`, `m5-kitchen-ui`, `minigame-ui-contract` (phần hai lớp) | P3, P6, P7, P8 | Tây Ninh vừa 402×680 và 320×568 (bảng 7.1); tải lại giữa trạm; Làm lại, Tự làm; chuyển thao tác ≤ 0,35 giây trên máy thật; khóa #13 xanh |
| **P10 Màn sáng và chữ** | Màn `morning` (mục 4.1, 4.7), ô `prep-morning`, nút Mở hàng, khóa phiếu, nhánh tải lại, dòng Tổng kết, công tắc Cài đặt; tour theo cử chỉ, **sửa `bep_thot` và trang Cách chơi `bep`, thêm trang `so_che`**, Mẹo nghề, lời Dì Sáu, thư 0.5.4, nhiệm vụ; dải `prep-morning` trong tấm "Hôm nay" của sảnh mới (mục 4.1); **v4:** nút quay về Chuẩn bị `morning-back` (mục 4.7), 3 Mẹo nghề Q2 và `NEW_WAY_STEPS`, sửa bước "Chọn cách sơ chế" của `bep_thot`, nhiệm vụ "Trứng cút luộc, ngâm nước đá" | `src/ui/screens/morning.js`, `css/morning.css`, `src/ui/screens/prep.js`, `summary.js`, `settings.js`, `title.js`, `src/main.js`; `src/data/tours.js`, `tips.js`, `dialogue.js`, `mail.js`, `quests.js`; `tests/unit/tour`, `meta-mail`, `meta-quests`, `m54-tips` (mới) | P3, P9, **Đợt 3 đã phát hành** | Bố cục 4.7 ở 5 khung (có 375×553; cả "hôm qua có làm"); mẻ dở tải lại đúng chỗ; lời ≤ 170 ký tự, đúng chính tả, không từ cấm |
| **P11 E2E, công cụ, tài liệu, phát hành** | Mục 8.3–8.5 (kể cả **quy trình van** khi tau đo được > 0,6: đo, chạy chế độ đủ ở tau đo được, chọn mức, ghi biên bản cổng); thư phiên bản; tài liệu | `tests/e2e/helpers.mjs`, `m54-*.e2e.mjs` (mới), e2e cũ ở mục 8.3 (kể cả `m4-rare.e2e.mjs`, `save-safety.e2e.mjs`), `_kitchen-smoke.mjs`, `hanh-trinh.mjs`, `tools/tim-seed.mjs`; `docs/kien-truc.md`, `docs/can-bang.md`, `docs/de-xuat-thiet-ke.md`, `docs/tham-khao/m54-thiet-ke.md` (mới, từ bản này), `README.md`, `package.json`; phiên bản ở `sw.js` (`VERSION`), `src/ui/app.js` (`APP_VERSION` **0.5.4**) | P9, P10, **Đợt 3 đã phát hành** | `npm test` + từng tệp e2e xanh, mỗi tệp < 10 phút; mô phỏng chạy lại khớp mục 5 (± 0,05 sao, ± 1 giây); cổng máy thật 8.5 đạt; tài liệu khớp mã |

**Thứ tự:**

```
Đợt 3 phát hành (0.5.3)
   │
P0 ─┬─▶ P1 ─▶ P2 ─▶ P3 ───────────────────────┐
    ├─▶ P4 ─┐                                  ├─▶ P9 ─▶ P10 ─▶ P11 ─▶ kiểm chứng ─▶ 0.5.4
    └─▶ P5 ─┴─▶ (P6 ∥ P7 ∥ P8, cần P1) ───────┘
```

- Song song được: P1 với P4 và P5; P6, P7, P8 với nhau (và với P2, P3).
- P9 cần P3 (lõi trạm, hộp) và P6–P8 (plugin thật). P10 cần P9 (dùng chung `playTram` cho mẻ sáng).
- **Kiểm chứng đối kháng** sau P11 (như M5, 3 vai): (V1) hợp đồng, testid, PRECACHE, từ cấm, chính tả; (V2) vừa màn ở 4 khung, giảm chuyển động, hiệu năng máy yếu (CDP chậm 4×: chuyển thao tác không có tác vụ dài > 100 ms, p95 khung rAF ≤ 34 ms, `.vfx-layer` ≤ 30 nút); (V3) lối chơi: chạy lại mô phỏng với dữ liệu repo, phân bố điểm, save v3 thật, tiền bội 500. Rồi sửa vòng 2, phát hành 0.5.4.

---

## 10. Rủi ro và câu hỏi còn mở

### 10.1 Rủi ro

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| R1 | **Số thời gian là mô hình; sao rất nhạy với thời gian.** Mỗi +1% thời gian dòng món trong ca ≈ −0,03 sao/khách với người TB, −0,02 sao và −1,7 điểm 5★ với người Giỏi (mục 5.4). Cảm giác "liền tay" phụ thuộc chuyển cảnh 250 ms và mount sẵn trên máy yếu; tau thật chưa đo | Cao | Báo nhiều mức tau (0,6 … 0,9), khóa thời lượng ở cả tau 0,9 (#5); `playStep` hai lớp; cổng máy thật 8.5 có **ngưỡng tau đo được** và **quy trình van** (giảm tau ở giao diện, rồi Van gọn bếp mức 1–2; tau > 0,85 thì chưa phát hành; R16); thứ tự bỏ dự phòng 5.3; không đổi `pace` |
| R2 | **Mô hình kim lửa.** Bản v2 sai ở đây (σ không theo chu kỳ); bản v3 theo `luaValue` thật nhưng hằng σ = 0,099 ở chu kỳ 5 vẫn là hiệu chỉnh M5 | Trung bình | `METHOD_SPECS.lua.sample` sinh sai số theo giây; khóa #15 chạy lại khi đổi bất kỳ chu kỳ hay vùng kim lửa nào; cổng máy thật đo điểm `u_phin`, `nuong_kho_muc` |
| R3 | **Lợi của sơ chế lớn và cộng dồn qua số khách** (mối lo của phản biện vòng 1 #5). Người dùng đã chốt mức này ("Lợi rõ, theo dõi sau"): TB +0,53 sao/khách, +6,1% khách mỗi ca (v4, gộp 3 bộ); với người TB đang quá tải, sơ chế có thể thành thói quen gần như bắt buộc | Trung bình (đã chấp nhận) | Khóa #17 giữ **dải** (không trôi lên); người bỏ qua vẫn ngang 0.5.1 (#16); "Bỏ qua" một chạm. **Theo dõi sau phát hành** (chỉ số 33, 34 ở `docs/can-bang.md`, đo bằng `stats` gỡ lỗi trên máy, không gửi đi): tỉ lệ ngày có sơ chế; sao/khách và khách/ca của ngày có / không sơ chế; tiền bỏ thừa; tỉ lệ ngày có làm hũ. Ngưỡng xem lại: tỉ lệ ngày có sơ chế > 90% sau ngày 7, hoặc chênh sao có / không > 0,7. Khi đó trình người dùng các van đã đo (bỏ ô thứ 3: TB +0,36; bỏ thưởng cấp món: +0,44) |
| R4 | **Đổi luật Không tì vết** làm lệch nhiệm vụ, chuỗi đang đếm | Thấp | Luật D (Q3) + hiệu chỉnh từng món giữ Không tì vết từng món trong ±max(2 điểm; 30%) và trong ca TB 6,1 → 5,8% (#15); màn Ra món ghi rõ thao tác được trượt; thư 0.5.4 giải thích |
| R5 | **Dung lượng hình:** `src/ui/art/*` đã 317 KB / trần 320 KB, Đợt 3 còn thêm hình meta | Trung bình | Tệp riêng ≤ 100 KB, nâng trần tổng lên 420 KB có chủ ý **sau khi biết dung lượng Đợt 3**; bỏ hình đồ chua (Chặng 2); thứ tự cắt 7.4 (không bao giờ cắt hình trạng thái) |
| R6 | **Đụng tệp với Đợt 3** (0.5.3): `index.html`, `sw.js`, `package.json`, `src/ui/app.js`, `src/ui/art.js`, `src/data/mail.js`, `src/data/tours.js`, `src/ui/components/tour.js`, `src/ui/vfx.js`, `src/ui/screens/{prep,summary,settings,title,tasting,shop,market,stage-up}.js`, `css/{prep,shop,market,meta,summary,settings,sheet}.css`, `tests/unit/{pwa,art-v2,vfx,tour,meta-ui}.test.mjs`, `tests/e2e/{helpers.mjs,hanh-trinh.mjs,tour.e2e.mjs}`, `docs/{kien-truc,de-xuat-thiet-ke}.md`, `README.md` | Cao | **Mọi gói chờ Đợt 3 phát hành** (mục 9); mọi gói dò lại số dòng; lối vào màn sáng nằm trong tấm "Hôm nay" chứ không thêm ô lưới (mục 4.1) |
| R7 | **`STATE_VERSION` đụng M6** (cùng định v4) | Trung bình | 0.5.4 lấy v4, M6 lên v5 (6.4); báo workflow M6 |
| R8 | **Trễ chạm trên web** ở thao tác nhịp (Safari iOS 30–80 ms); ngưỡng kéo theo nhịp chặt (60 ms) | Trung bình | Chấm khoảng giữa hai nhát (trễ cố định tự triệt tiêu), nhát hụt 20 điểm; Hỗ trợ thao tác nhịp chậm 15%; cổng 8.5 mục (5); nếu oan thì nới về 70 / 120 / 185 ms và chạy lại #15 |
| R9 | **Người chơi cũ phải học lại** (vắt tắc giữ–thả, dưa leo cắt thanh, xoài bào, Thớt theo trạm, phải bốc hộp) | Thấp | Thẻ đầy đủ lần đầu gặp **cử chỉ** mới, thẻ người mới ở mọi thao tác trong 3 lần nấu đầu, tour `bep_tram`, `bep_hop`, `bep_thot` mới, thư 0.5.4, nhãn "Cách mới" (Q2) |
| R10 | **Save cũ đang nấu dở** giữa lúc cập nhật | Thấp | Giữ board cũ, không áp `METHOD_PLAY`; Thớt gom bước của board cũ theo nguyên liệu như 0.5.2 (mục 6.5) |
| R11 | **E2E chậm hơn, dễ chập chờn** ở thao tác nhịp | Trung bình | Bộ giải đọc `data-next` có dung sai; `ctx.e2eSlow` dưới `?test=1`; tách `m54-vua-man` làm 2; đo thời gian từng tệp |
| R12 | **Phụ bếp M6 lệch theo loại** (bộ sinh của `cha`, `got`, `lac` gần như không theo tay nghề) | Thấp | Khóa hiệu chỉnh ở `m54-methods` buộc P1 chỉnh trước khi M6 dùng |
| R13 | **Người Ẩu được ít Tuyệt hảo hơn** (trong ca 9,7 → 7,7%, tương đối −21%; 5★ 6,4 → 4,9%) | Thấp | Sao trung bình của Ẩu −0,02; khóa #15 giữ mọi ô trong ±5 điểm tuyệt đối; nhặt có mồi mờ sau 2 lần nhầm (v4); Hỗ trợ thao tác có sẵn; câu Q9 |
| R14 | **Tiền buổi sáng sai sổ** (nhiều nhánh: hỏng, đổ, bỏ dở, bỏ món, phiếu, sự kiện, lựa chọn ngày) | Trung bình | Một nguồn (`state.morning.spent`, `lost`) → `sh.ledger.morning`; số phần ở `sh.morning.boxes[k].used` / `.wasted`; khóa #18 và các nhánh test ở `m54-morning` |
| R15 | **Buổi sáng dài hơn bản v2** (khoảng 40 giây thay 25 giây vì 3 ô thùng đá) | Thấp | "Như hôm qua" xếp sẵn hàng chờ; mẻ 8 chơi 2 lượt nhanh dần; "Bỏ qua" một chạm; phụ bếp sáng ở M6 |
| R16 | **Máy thật chậm hơn mô hình** (tau > 0,6): người giỏi được lợi sơ chế vượt mức Q6 (tau 0,9: +0,155) (kiểm cuối #1) | Trung bình | Quy trình van ở cổng 8.5 (giảm tau ở giao diện, rồi Van gọn bếp mức 1–2; tau > 0,85 thì chưa phát hành); khóa #17 không có ngoại lệ; câu Q11 |

### 10.2 Câu hỏi còn mở (chỉ câu mới, mỗi câu có khuyến nghị)

Các câu Q1–Q8 của bản v2 người dùng đã chốt (mục 0). Phản biện vòng 2 làm lộ ra hai việc (Q9, Q10), kiểm cuối làm lộ ra một việc (Q11) người dùng chưa từng được hỏi; Q10 có thêm một ý mới từ kiểm cuối:

| # | Câu hỏi | Khuyến nghị | Nếu chọn khác |
|---|---|---|---|
| **Q9** | **Tiêu chí "lệch ±5" về chất lượng là điểm tuyệt đối hay tương đối?** Bản này giữ Tuyệt hảo mỗi món trong ±5 **điểm** của 0.5.1. Với người chơi ẩu, nền Tuyệt hảo chỉ 4–27%, nên −2,0 điểm là **−21% tương đối** (trong ca 9,7 → 7,7%; 5★ 6,4 → 4,9%); sao trung bình chỉ −0,02 | **Tuyệt đối (±5 điểm)**: người ẩu vốn hiếm khi đạt Tuyệt hảo ở cả hai bản; sơ chế đưa họ lên 12,4% | **Tương đối (±5%)**: nới riêng cho người chưa thạo món — khi món chưa thạo cấp 2 thì thao tác nhặt chỉ 2 mồi, kéo theo nhịp tính nhát hụt 40 thay 20; chạy lại khóa #15 (người TB cũng dễ hơn một chút ở 3 lần nấu đầu) |
| **Q10** | **Người không sơ chế chơi trung bình được +0,09 sao/khách so với 0.5.1** (5★ 16,5 → 17,9%; người giỏi +0,04, người ẩu −0,02). Đây là hệ quả của "Rút gọn nhịp chờ" (Q1): mỗi dòng món ngắn đi 2,7%. **Thêm (v4, kiểm cuối #4): lệch theo từng ngày.** Ngày mua món mới, người giỏi được thêm nhiều hơn mức chung: ngày 3 (mua bánh tráng trộn) **+6,7 điểm 5★** (+0,07 sao; mức chung của người giỏi +3,4 điểm), vì bánh tráng trộn 0.5.4 nhanh hơn 0.5.1 khoảng 4–5% mà thẻ người mới không bù hết; người TB ngày 2 +4,8 điểm 5★. Như vậy có còn là "ngang bản hiện tại"? | **Giữ** (coi là ngang): gộp mọi hồ sơ trong ±0,1 sao/khách; mỗi ngày không vượt mức chung của hồ sơ đó quá +0,08 sao hay +5 điểm 5★, không ngày nào dưới 0.5.1 quá 0,10 sao (khóa #16 chặn cả hai phía) | Muốn sát 0.5.1 hơn thì phải lấy lại khoảng 2,5% thời gian mỗi món mà không đụng các hằng đã chốt ở Q1 (vd thêm một thao tác nhanh có ích ở bánh tráng hoặc trà tắc). Muốn mỗi ngày trong ±5 điểm 5★ **tuyệt đối** thì bánh tráng trộn phải chậm lại khoảng 4%. Cả hai đổi bảng 3.2, chạy lại #5, #15, #16 |
| **Q11** (mới, kiểm cuối #1) | **Máy thật chậm hơn mô hình thì giữ mức lợi của người giỏi bằng cách nào?** Nếu đo trên máy thật mỗi thao tác nối trong trạm tốn thêm hơn 0,6 giây (tau > 0,6), người giỏi có sơ chế được lợi vượt mức đã chốt ở Q6 (+0,04 … +0,08): tau 0,75 → **+0,11**; tau 0,9 → **+0,155** (từng ngày tới +0,19 sao/khách). Bản v3 tự ghi đây là "ngoại lệ có chủ ý" mà chưa hỏi; bản v4 bỏ ngoại lệ đó. Thưởng và số ô thùng đá không kéo được phần này xuống (đã đo); chỉ bớt giây trong ca mới kéo được | **(A) Quy trình van ở cổng phát hành** (mục 8.5): trước hết làm giao diện nhanh hơn; còn chậm thì bỏ bớt thao tác mới theo bậc — mức 1 bỏ "Gài nắp nén vừa tay" (2 món cà phê), mức 2 bỏ thêm "Kẹp trứng, dưa leo vào ổ" (2 món bánh mì); không bao giờ bỏ bước có từ 0.5.1 hay bước đã chốt ở Q2; tau > 0,85 thì chưa phát hành, làm giao diện nhanh hơn nữa. Mọi bản được phát hành giữ đúng Q6. Van là dữ liệu của bản phát hành, áp cho mọi người chơi | **(B)** Giữ đủ thao tác, chấp nhận người giỏi tới +0,16 ở máy chậm, ghi trong ghi chú phát hành (như bản v3). **(C)** Không bỏ thao tác nào; chỉ phát hành khi giao diện đạt tau ≤ 0,65 (có thể lùi ngày phát hành) |

**Thông báo cho người dùng (không cần chốt), đi kèm Q2 và Q4/Q5 đã chốt:**
- Băm, chặt, giã, nạo chỉ có ở mẻ sáng, nên **tần suất người chơi gặp phụ thuộc cách chơi**: bỏ qua màn sáng hoặc chỉ dùng thùng đá thì 0% số ngày; làm hũ xoay vòng thì băm 57%, phi 57%, giã 36%, chặt 29%, đập dập 29%, thái lát (hành tím) 29% số ngày 2–15. Hũ nhà làm cho vị ngon hơn thấy được (tem "Vị nhà làm", Tuyệt hảo cao hơn) nhưng lợi sao nhỏ (+0,02 sao/khách), nên người chơi chỉ tính sao có thể bỏ hũ. Bản này có nhiệm vụ ngày "Làm một hũ nhà làm hạng Tốt" và lời gợi ý của Dì Sáu để người chơi gặp đủ (mục 4.8, 4.9).
- **Ba phương thức người dùng nêu tên mà người chơi gần như không gặp ở Chặng 1** (v4; kiểm cuối #5): (1) **Ngâm**: 0% số ngày ở cả ba cách chơi, vì mẻ ngâm chính (đồ chua) đã sang Chặng 2 theo Q4/Q5, còn trứng cút (luộc rồi ngâm nước đá) tiết kiệm ít giây hơn tắc, xoài nên người chơi không chọn cho ô thùng đá thứ 3. Bản v4 thêm nhiệm vụ ngày "Trứng cút luộc, ngâm nước đá" (tối đa một lần mỗi 5 ngày): làm theo thì ngâm gặp khoảng **21%** số ngày, lợi sơ chế cả kỳ vẫn trong dải Q6. (2) **Hạt lựu**: chỉ ở chè bưởi, món sự kiện 20/11 (nạo cũng vậy). (3) **Thái sợi đúng**: không còn ở đâu trong Chặng 1 vì Q2 đổi xoài sang bào sợi; "Thái sợi" chỉ còn là lựa chọn sai trên bảng chọn cách (có Mẹo nghề giải thích), thái sợi đúng để dành Chặng 2.

Không hỏi người dùng (đã quyết trong bản này): `u_phin` chu kỳ 5 vùng × 1,2; nướng khô mực chu kỳ 4; xé khô mực 3 sợi; bốc hộp bắt buộc ở lõi; thưởng cấp món; lối vào màn sáng trong tấm "Hôm nay"; thẻ người mới ở mọi thao tác; save lên v4, M6 lên v5 (phối hợp với workflow M6); v4: mồi mờ sau 2 lần nhầm, ủ bột [0,13; 0,32], nhiệm vụ trứng cút, nút về Chuẩn bị trên màn sáng, nhãn "Cách mới" chỉ cho người chơi cũ, mọi số ca gộp 3 bộ hạt giống.

---

## 11. Phụ lục phản biện vòng 1 (giữ từ bản v2)

> Bảng dưới là trả lời vòng 1 của bản v2, giữ nguyên để tra cứu. **Số liệu trong bảng là số của bản v2** (mô hình tự viết luật hàng chờ, kim lửa σ không theo chu kỳ); số hiện hành ở mục 5 và mục 12. Ba dòng đã bị quyết định người dùng (mục 0) thay thế: #5 (mức lợi sơ chế: nay TB +0,45 … +0,61 theo Q6), #13 (đồ nhà làm: nay hũ có "Vị nhà làm", băm / chặt / giã chỉ ở mẻ sáng theo Q4/Q5), #14 (đồ chua: nay để Chặng 2, mục 4.12).

25 phát hiện, đánh số theo thứ tự của bản phản biện. "Sửa" = đã đổi thiết kế; "Giải thích" = giữ, có lý do. Mọi số mới chạy lại trên **chính mô hình và script của người phản biện** (chép ở `bep-chuan/mo-phong-v2/`, chỉ đổi chỗ `[v2]`); bảng tham chiếu nằm ở thư mục đó.

| # | Mức | Phát hiện (tóm tắt) | Xử lý | Bằng chứng sau khi sửa |
|---|---|---|---|---|
| 1 | major | Bánh mì ốp la vượt mục tiêu ở 2–3 phần và hồ sơ Giỏi / Ẩu, vượt trần +20% ở kịch bản xấu nhất; khóa #5 chỉ đo TB 1 phần | **Sửa.** (a) Bỏ `cat_hanh` khỏi ca, chuyển thành thao tác của mẻ Rau bánh mì (người bán thật cắt hành ngò từ sáng, `am-thuc.md` 4.1). (b) Khóa #5 kiểm 9 món × TB / Giỏi / Ẩu × 1–3 phần × từng ghi chú ở 3 kịch bản, và thời gian dòng món trong ca. (c) Không đổi xẻ / kẹp thành "một cử chỉ cho cả dòng" vì 3 ổ bánh vẫn phải xẻ 3 lần; sau (a) không cần | Bánh mì ốp la, mọi hồ sơ, 1–3 phần: chính ≤ +6,2%, tau 0,9 + gọn ≤ +9,9%, tau 0,9 không gọn ≤ +13,2% (bản 1: tới +15,6% / — / +23,5%). Cả 9 món: chính ≤ +7,4%, tau 0,9 + gọn ≤ +10,8%, tau 0,9 không gọn ≤ +15,5%. Trong ca, ô nặng nhất Bánh mì ốp la 3 phần của Ẩu +6,9% (`ket-qua-thoi-gian-v2.md` mục 2; `ket-qua-ca-tau0.6-gon1-base.md` bảng cuối) |
| 2 | major | Kịch bản xấu nhất làm người không sơ chế mất sao rõ; Giỏi nhạy nhất; trần +20% không đủ giữ "sao tương đương" | **Sửa.** (a) Phụ phí gọn thành **điều kiện bắt buộc** của gói P9 (khóa #13), bỏ khỏi câu hỏi. (b) Khóa #16: ngày 4–15 × TB / Giỏi / Ẩu, không sơ chế, ở **tau 0,9 + gọn** (kịch bản xấu nhất còn lại sau khi gọn bắt buộc): sao ≥ 0.5.1 − 0,05, 5★ ≥ 0.5.1 − 5 điểm, cộng ngưỡng từng ngày. (c) Thả đá tự xong (bớt 0,8 giây mỗi ly cà phê) để Giỏi qua khóa. (d) R1 ghi độ nhạy. **Giải thích** vì sao khóa ở "tau 0,9 + gọn" chứ không "tau 0,9 không gọn": khi gọn đã bắt buộc thì "không gọn" không còn là cấu hình phát hành; muốn qua khóa ở "không gọn" phải bỏ khoảng một phần ba số thao tác mới, trái yêu cầu "thêm nhiều thao tác". Nếu người dùng bác gọn thì áp thứ tự bỏ dự phòng trước khi phát hành (R2). Cổng máy thật thêm ngưỡng tau đo được | Tau 0,9 + gọn, ngày 4–15: sao TB −0,029, Giỏi −0,036, Ẩu −0,029; 5★ −0,6 / −3,0 / −1,6 điểm; ngày thấp nhất −0,05 / −0,07 / −0,08 sao, −2,5 / −5,7 / −3,3 điểm. Tham khảo tau 0,9 không gọn: −0,17 / −0,13 / −0,04 sao, Giỏi 5★ −10,9 điểm (bản 1: −0,10 … −0,23; 5★ Giỏi 84,1 → 70,0%). Độ nhạy: +1% thời gian ≈ −0,03 sao TB, −0,02 sao và −1,7 điểm 5★ Giỏi (`tom-tat-ca-tau0.9-gon1-base.md`, `tom-tat-ca-tau0.9-gon0-base.md`) |
| 3 | major | Bánh tráng trộn, bánh mì, trà tắc lệch lên quá ±5 điểm Tuyệt hảo; bảng 5.5 chỉ công bố trung bình 9 món của TB | **Sửa.** Bật thước "Lượng sợi" cho bào; kéo theo nhịp 90/150/220 → **60/110/175 ms**; cắt thanh, rạch nới 1,5 → 1,25; nhặt 3 mồi; xé khô bò 35°; hiệu chỉnh đủ **81 ô** (9 món × 3 hồ sơ × hệ số 0,9 / 1,104 / 1,2); khóa #15 theo từng ô thay trung bình 9 món | 81/81 ô trong ±5 điểm (bộ hạt giống của khóa, 12.000 món/ô; lệch lớn nhất +4,9). Bánh tráng trộn TB 1,104: 76,9 → 76,1% (bản 1 +8,6); 0,9: 65,3 → 66,0% (bản 1 +16,6); Ẩu 1,104 −3,4 (bản 1 +9,8). Bánh mì Giỏi 0,9: +3,7 (bản 1 +7,4); trà tắc mật ong TB 1,104 +1,3 (bản 1 +5,8). Trong ca 15 ngày: Tuyệt hảo TB 61,3 → 61,7% (bản 1 +5,3), Ngon 33,4 → 33,2%; 5★ ngày 2 TB 46,5 → 50,8% (bản 1 → 56,3%); sao ngày 3: 3,54 → 3,84 (bản 1 3,83); khoảng một nửa do thẻ bước người mới theo trạm (bỏ thẻ bước ở cả hai bản thì chỉ +0,15), phần còn lại do bánh tráng trộn nhanh hơn 4,7%; giữ có chủ ý, khóa #16 đo từ ngày 4 (mục 5.3) (`bang-81-o.md`, `ket-qua-chat-luong-v2.md`) |
| 4 | major | Cà phê muối, chè bưởi lệch xuống quá ±5 điểm ("thiệt nhẹ" không có ngưỡng) | **Sửa.** Đánh sữa muối: vùng [0,8; 1,2] **chỉ chấm thiếu** (gắn với #16: sữa đặc không tách béo). Vắt ráo: τ 0,9 → **0,6**, vùng [0,76; 0,96] → **[0,62; 0,86]**. Múc chè: n 1, đích × 1,7 ("chấm nhẹ"). Ngưỡng ±5 điểm là khóa #15 | Cà phê muối Ẩu 1,104: 16,2 → 15,4% (bản 1 17,5 → 8,4%); TB 0,9: 61,9 → 62,1% (bản 1 −9,6). Chè bưởi Ẩu 1,104: 22,8 → 19,0% (−3,8; bản 1 −9,0); TB 0,9 +1,7 (bản 1 −5,5); Ẩu 0,9 −4,5 (script phản biện: −5,2, chênh do hạt giống, ghi ở 5.5) |
| 5 | major | Lợi sơ chế của TB lớn gấp nhiều lần chênh "không sơ chế − 0.5.1", cộng dồn qua số khách; mô phỏng bản 1 thiếu phản hồi sao → khách | **Sửa.** (a) Chốt mục tiêu lợi: TB ≤ +0,20, Giỏi / Ẩu ≤ +0,05 sao/khách (khóa #17; người dùng có thể đổi ở Q6). (b) 1 ô thùng đá + 1 hũ (không tăng theo ngày), bốc hộp **một chạm** (1 giây). (c) Mọi mô phỏng ca chạy ngày 1–15 liên tục trên một state, `state.ratings` → `customerCount` bật. (d) Thử đủ các van phản biện đề xuất: trần điểm hộp 92 chỉ bớt 0,01 nên không dùng; "1 ô ngày 2–6, 2 ô từ ngày 7" cho +0,32 nên không chọn | TB **+0,19** (ngày cao nhất +0,24), Giỏi **+0,04** (+0,08), Ẩu **+0,02** (+0,05); khách/ca TB +2,7% (6,95 → 7,14). Bản 1: TB +0,50, khách +7,4% (`tom-tat-ca-tau0.6-gon1-base.md`, bảng van ở mục 5.6) |
| 6 | major | Thời gian và sàn giờ của vắt không khớp thước `holdLevel`; chè bưởi 3 phần không kịp giờ | **Sửa.** `timeSec` = 0,6 + n·(−τ·ln(1 − tâm vùng) + 0,45); sàn = n·(−τ·ln(1 − b) + 0,5) + 1; cùi bưởi τ 0,6, vùng [0,62; 0,86]; tắc vắt cả nắm (n 1 mỗi ly); mô hình chạy vắt theo thước là luật mặc định | Cùi bưởi 1 / 2 / 3 phần: TB cần 1,86 / 3,12 / 4,37 giây, giới hạn 3,75 / 5,25 / 6,75 (TB × 1,3 ≤ giới hạn ở mọi số phần). Chè bưởi TB 1 phần: chính +2,0%, tau 0,9 không gọn +11,7% (bản 1 tính lại theo thước: +7,2% / +17,0%) (`ket-qua-gioi-han-v2.md`) |
| 7 | minor | Khóa #6 đỏ trên `dap_trung`, `them_da` (bước cũ); câu "1–2 phần đủ giờ" sai | **Sửa.** Sàn `dap` 1,5n + 1 → **1,75n + 1**, `bay` 1,3n + 1,5 → **1,6n + 1,5** (sửa có chủ ý, ghi lý do: đủ giờ cho người chậm 30% kể cả nhiễu tốc độ +12%); `dap_dap` 1,6n + 1; `xe` 1,1·strands + 1. Bỏ câu sai | Khóa #6 (TB × 1,3): 0 ô đỏ ở mọi bước × 1–3 phần × ghi chú. Kiểm chặt hơn (TB × 1,12 × 1,3): 0 ô đỏ (bản 1: 8 tổ hợp đỏ ở khóa #6) |
| 8 | minor | Trung bình 9 món che Không tì vết lệch lớn ở từng món; theo thực đơn thật TB +30% | **Sửa.** Khóa #15 theo từng món × hồ sơ × hệ số: ±max(2 điểm; 30%); thêm khóa theo trọng số thực đơn thật ±max(1 điểm; 15%). Luật "trượt một thao tác nhỏ" giữ, nhưng các thao tác w 1 điểm cao (bào, xé, nhặt, ủ bột, nén) đã hiệu chỉnh lại | 81/81 ô trong ngưỡng. Bánh tráng trộn TB 1,104: 2,1 → 3,6% (bản 1 → 11,5%); Giỏi 0,9: 18,7 → 23,3%; cà phê sữa đá TB 13,5 → 11,8% (bản 1 → 9,8%). Trong ca 15 ngày: TB 5,7 → 5,6%, Giỏi 40,3 → 40,1% (bản 1: 7,4%, 45,7%) |
| 9 | minor | Số của món có xé chạy bằng `scoreXe` phương án C, không phải công thức chữ | **Sửa.** Chạy lại toàn bộ bằng **công thức chữ** (`strandScore`, mô hình phản biện `xeC: false`); mục 8.4 ghi `tools/mo-phong-bep/` phải gọi `METHOD_SPECS` thật, không dùng `scorers-C` | Mọi số mục 5 của bản v2 dùng công thức chữ; ví dụ [1; 0,43; 1; 1] = 88 khóa ở `m54-scoring` |
| 10 | **blocker** | Gọi bản này 0.5.3 trong khi 0.5.2 đã phát hành và Đợt 3 đã nhận 0.5.3 cùng các tệp `index.html`, `sw.js`, `app.js`, `art.js`, `mail.js`, `pwa.test`…; P0 chạy ngay sẽ sửa chồng | **Sửa.** Đổi thành **0.5.4** (khớp danh sách việc của phiên); tên `m54-*`, `migrateContentM54`, `phien_ban_0_5_4`, `m54-thiet-ke.md`. Điều kiện trước cho **P0, P4, P10, P11** là Đợt 3 đã gộp **và phát hành**; R6 liệt kê mọi tệp chung với Đợt 3; dò lại số dòng. Q8 xin người dùng xác nhận số | Mục 9 (điều kiện trước, cột "Cần trước"), R6, Q8, đầu bản |
| 11 | major | Giá hộp và giá vốn khi có hộp phá bất biến bội 500đ; "lãi bằng không sơ chế" sai; màn sáng chạy trước `startShift` nên không áp hệ số giá của ngày | **Sửa.** Giá mỗi phần = `roundCost(Σ giá × qty × hệ số phiếu)`, bội 500đ; giá vốn Chọn khi có hộp = giá vốn không hộp − `qty × p` (cùng `p` đã trả) → dùng hết mẻ thì tổng **bằng đúng**. `previewDayMods` đọc Phiếu Chợ Sớm không tiêu phiếu, khóa phiếu khi đã dùng cho mẻ; sự kiện tăng giá vẫn tính ở bước Chọn trên toàn bộ nguyên liệu nên không né được. Test ví % 500 có hộp, có / không phiếu, ngày tắc ×2 | Bánh mì ốp la: không hộp 9.000đ = sáng 1.000 + Chọn 8.000; trà tắc 3.000 = 1.000 + 2.000; cà phê muối 2.500 = 0 + 2.500 (bản 1: 9.250 / 3.200 / 2.100). Mục 4.6, khóa #18 |
| 12 | major | Tiền mẻ bỏ dở, đổ bỏ, mẻ hỏng không vào sổ ca nào; `spend` không export và cần `state.shift.ledger`; món bỏ sau khi lấy hộp ghi "đã dùng" | **Sửa.** `state.morning.spent` gom mọi tiền chi sáng, `lost` cho phần không thành hộp; `payMorning` / `refundMorning` / `loseMorning` riêng trong `morning.js`; `startShift` chuyển cả `spent` vào `sh.ledger.morning`, `walletStart` + `spent`; `summarizeShift` chia giá vốn / hao hụt, cộng lại = `spent`; món bỏ sau khi bốc hộp → phần hộp vào hao hụt. Test bất biến ví ở mọi nhánh | Mục 4.6 (5)–(9), 6.1, 6.3; `m54-morning` |
| 13 | major | Băm, chặt, giã, nạo, đập dập gần như không gặp; mẻ nhà làm phải giành ô thùng đá nên không ai làm; Q4 không nói tần suất | **Sửa một phần, trình người dùng phần còn lại.** Đồ nhà làm có **kệ hũ riêng** (1 hũ, không giành ô thùng đá); thêm mẻ **Hành tỏi phi** cho bánh tráng (đập dập + băm tỏi + phi); Dì Sáu gợi ý từng hũ theo ngày; mô hình làm hũ xoay vòng. Q4 ghi tần suất gặp từng phương thức và chuyện nạo, hạt lựu chỉ có ở chè bưởi (món sự kiện). **Giải thích** vì sao không ép băm vào ca món nền: món Chặng 1 không có thịt, tỏi ướp; thêm "tương ớt tỏi" cho bánh mì là đổi kệ và vốn — để người dùng chọn ở Q4 (b) | TB làm hũ xoay vòng, % số ngày 2–15 gặp: băm 43%, phi 43%, giã 29%, rang 29%, ngâm 29%, chặt 21%, đập dập 21%; nạo, hai lượt 0% (bản 1: 0% mọi phương thức này) (`tom-tat-ca-tau0.6-gon1-base.md`) |
| 14 | major | Không có thao tác ngâm; đồ chua dời Chặng 2, tỏi băm không thành đồ riêng (2/4 ví dụ của người dùng); chuỗi trứng cút, cùi bưởi bỏ bước ngâm nước đá | **Sửa.** Thêm lớp vỏ **`lua.ngam`** (vòng hẹn giờ G5): trứng cút luộc → **ngâm nước đá** → lắc hộp → bóc; cùi bưởi … luộc → **ngâm nước đá cho giòn**; **Đồ chua nhà làm** cho bánh mì: gọt → bào → bóp muối, xả → vắt ráo → **ngâm giấm đường**. Tỏi băm nằm trong Hành tỏi phi; Q5 trình rõ ví dụ nào có, ví dụ nào không và vì sao | Mục 4.2 (bảng đồ), 2.2 (`lua.ngam`), Q5. Q mẻ Đồ chua TB 94,7, giây chơi mẻ 4 / 8: 16,8 / 29,3 (`bang-v2-do.md`) |
| 15 | major | Phần bù cho người dùng hộp nhắm sai tín hiệu (`perfect_step`); bước từ hộp không phát `step.done`; mục tiêu "Hoàn hảo bước Thái" không hiệu chỉnh khi số bước Thái đổi | **Sửa.** Bước điền từ hộp phát `step.done { prepped }` → `stats.js` biến thành `perfect_thai` / `perfect_lua` / `perfect_step` như làm tay; mẻ chỉ phát `morning.batch` (không đếm hai lần). `thai_hoan_hao.target` → `{ perCustomer: 0,95, min: 7, max: 12 }` để TB giữ tỉ lệ cũ. Test `m54-quests` | Hoàn hảo bước Thái / khách, ngày 4–15: TB 0,41 → 0,62 (có hộp 0,62), Giỏi 1,11 → 1,13, Ẩu 0,07 → 0,24; tỉ lệ cần / có của TB: 0,41 / 0,625 ≈ 0,62 / 0,95. Canh lửa: 0,35 → 0,35 (`tom-tat-ca-tau0.6-gon1-base.md`) |
| 16 | major | "Kem muối", luật "Tách béo", hộp kem muối trong khi kệ không có kem béo; nghiên cứu đã đề nghị hỏi người dùng | **Sửa + hỏi.** Mặc định giữ **"sữa muối"** đúng dữ liệu 0.5.1: nhãn "Đánh sữa muối cho sánh", chỉ chấm thiếu, không "Tách béo", hộp "Sữa muối đánh sẵn" (0đ). Thêm **Q7** với hai phương án (giữ sữa muối / thêm kem béo, đổi vốn, bật lại "Tách béo") | Mục 3.2 (cà phê muối), 2.2 (`xoay`), 4.2, Q7 |
| 17 | major | Năm cách thái mới và các lớp vỏ đổi cử chỉ không có tour; "lần đầu gặp" xét theo loại; giảm chuyển động cho dải tự trôi chưa quy định | **Sửa.** `gestureKey` + `NEW_GESTURES`, tour `bep_thai_thanh`, `bep_thai_keo`, `bep_thai_hai_luot`, `bep_boc`, `bep_xoay_vung`, `bep_du_nhiet`, `bep_ngam`; tối đa 2 thẻ cử chỉ mới mỗi lần nấu; dải tự trôi **nhảy bậc** khi giảm chuyển động. Test `tour.e2e`, `m54-bep`, unit `gestureKey` | Mục 7.7, 2.0.5 |
| 18 | major | "Mount sẵn" và ảnh nhân bản trên `.mg-fx` không làm được với `playStep` hiện tại; không gói nào sở hữu `index.js`, `_util.js`, `cham.js`, `dap.js`, `got.js`, `score-sheet.js`; sàn giờ không có tác dụng vì plugin dùng `stepLimitSec(step.par)` | **Sửa.** `playStep` **hai lớp** (`createTwinStage`, `playStepIn`, `.mg-fx` ngoài lớp; `ctx.prewarm`), giao `index.js` (phần hai lớp) và `score-sheet.js` cho **P9**; `_util.js`, `cham.js`, `dap.js`, `got.js` cho **P8**; mọi plugin dùng `gestureLimitSec`; test hợp đồng giới hạn giờ thực tế = max(2,5·par, sàn) và có `ctx.tram`, `ctx.prewarm` | Mục 7.2, 2.0.7, 9 (P8, P9), 8.2 |
| 19 | minor | Kế hoạch test sót `STATE_VERSION` ở `m4-save:55`, `meta-save-progression:39`, `core-economy:13`; sót `m4-rare.e2e:257-284`; thiếu test tiền và nhiệm vụ; `m54-vua-man` dễ vượt 10 phút | **Sửa.** Thêm các tệp vào 8.2 / 8.3 kèm gói chủ (P3, P11); thêm `m54-quests`, test tiền ở `m54-morning`; tách `m54-vua-man-1`, `m54-vua-man-2` | Mục 6.4 (4), 8.1–8.3, 9 |
| 20 | minor | Bảng chiều cao màn sáng sót hàng "Làm như hôm qua" và lời Dì Sáu; ở 320×568 không vừa | **Sửa.** "Như hôm qua" vào **chân dính** (3 nút, mỗi nút ≥ 92×44 ở 320px); lời Dì Sáu là bong bóng chồng lên vùng thùng đá, **ẩn ở s**; tính lại bảng; thêm cảnh "hôm qua có làm" vào `m54-vua-man-2` | s: 446 ≤ 468 (dư 22, lưới đồ 172 ≥ 136); m: 504 ≤ 580 (mục 4.7) |
| 21 | minor | Sân khấu tối thiểu 300px của thái và chặt lớn hơn vùng chơi đo được ở 320×568 (288px) | **Sửa.** Mọi loại ≤ 288px rộng (thái 288×200, chặt 288×240, bào nghiêng 288×200); khung hẹp hơn 300px thì đặt trái dừa dọc; mọi plugin co theo `room()` | Bảng 2.1, N9, mục 7.2 |
| 22 | minor | Số Không tì vết không khớp giữa các bảng (5,7% hay 6,0%; 43,5% hay 43,6%) | **Sửa.** Một nguồn số cho mỗi loại: bộ hạt giống của khóa (`hieu-chinh-ket-qua.json`) và bộ của phản biện (`ket-qua-chat-luong-v2.md`) để đối chiếu; khóa #15 ghi rõ dùng bộ nào, 20.000 món mỗi ô | Mục 5.5 "Nguồn số duy nhất", khóa #15 |
| 23 | minor | "Giữ board cũ" mâu thuẫn với `METHOD_PLAY` áp chung; không có mục cho cách `bao` | **Sửa.** Board có `boardRev` cũ không áp `METHOD_PLAY` (vẫn ngắm, cách chỉ đổi hình như 0.5.1); thêm mục dự phòng `bao`; `m54-save` thêm ca board cũ còn `thai_xoai`; bộ giải đọc loại từ sân khấu | Mục 6.5, 8.1, 8.3 |
| 24 | minor | Kẹp trứng trước khi cắt hành; trộn trước khi ngắt rau răm; lý do "tránh kẹt" không đúng vì lõi đã lọc `after` | **Sửa.** `tron.after` có `nhat_rau_ram`; `cat_hanh` không còn trong ca nên kẹp không cần chờ; sửa có chủ ý luật `data.test.mjs:209-214`, thêm test "Không rau răm" không kẹt | Mục 3.1, bảng 3.2, khóa #8 |
| 25 | minor | Mỗi ly 3 quả tắc (và hộp tính 3 quả) nhưng chỉ cắt 2 quả, vắt 2 lần | **Sửa.** Cắt đôi **3 quả** (cuts 3, par 3 như 0.5.1), khều hạt 3 chùm, **vắt cả nắm một lần mỗi ly** (giữ thời gian); hộp "Tắc cắt đôi" lo đúng 3 quả | Trà tắc mọi hồ sơ, 1–3 phần: chính ≤ +3,6%, tau 0,9 không gọn ≤ +10,0% (vắt 3 lần mỗi ly thì 3 phần +17,6% / +24,0%, mục 5.9) |

**Chỗ bản v2 đi khác đề xuất sửa của phản biện (và lý do):**
- #2: khóa sao đặt ở **tau 0,9 + gọn** thay vì tau 0,9 không gọn (gọn đã bắt buộc; con số "không gọn" vẫn báo để tham khảo).
- #5: không dùng trần điểm hộp 92 (mô phỏng: chỉ bớt 0,01 sao/khách; làm món của người giỏi có hộp dở hơn làm tay), không dùng lịch "1 ô ngày 2–6, 2 ô từ ngày 7" (TB +0,32); thay bằng 1 ô + 1 hũ cố định và bốc hộp một chạm.
- #13: không ép băm vào một thao tác trong ca của món nền; chuyển đồ nhà làm sang kệ riêng và để người dùng chọn thêm ở Q4.
- #1: không làm "xẻ / kẹp một cử chỉ cho cả dòng"; bỏ cắt hành trong ca là đủ.

---

## 12. Phụ lục phản biện vòng 2

25 phát hiện, theo đúng thứ tự của bản phản biện (`by`: `mo_phong` = phát hiện do mô phỏng, `day_du` = phát hiện về độ đầy đủ). "Sửa" = đã đổi thiết kế; "Giải thích" = giữ, có lý do; "Hỏi" = đưa thành câu hỏi mới cho người dùng. Mọi số mới chạy trên **chính bộ mô phỏng của người phản biện** (chép ở `bep-chuan/mo-phong-v3b/`, chỉ đổi chỗ `[v3]`; danh mục tệp ở đầu bản).

| # | Mức | Phát hiện (tóm tắt) | Xử lý | Bằng chứng sau khi sửa |
|---|---|---|---|---|
| 1 | major | Mô hình kim lửa sai: `luaValue` cho kim chạy 1,2/chu kỳ mỗi giây nên sai số giá trị ∝ 1/chu kỳ; `u_phin` 6 → 5 giây giữ vùng và `nuong_kho_muc` chu kỳ 3 làm 5 ô lệch quá ±5 | **Sửa.** (a) Mô hình và `METHOD_SPECS.lua.sample` sinh sai số theo **giây** rồi đổi ra giá trị bằng 1,2/chu kỳ, áp cả cho ngâm, phi, rang chu kỳ 4 ở mẻ sáng (mục 2.0.8, 5.1). (b) `u_phin`: chu kỳ 5 với **vùng × 1,2** [0,58; 0,82] (cùng độ khó theo giây với chu kỳ 6) thay vì giữ chu kỳ 6: giữ chu kỳ 6 cũng đạt 81 ô nhưng mỗi ly +0,6 giây làm Giỏi không sơ chế ở tau 0,9 + gọn −0,067 sao, −5,3 điểm 5★ (lố khóa #16). (c) `nuong_kho_muc` chu kỳ 4, vùng [0,36; 0,94], par 2,5. (d) Nén phin [0,32; 0,78] → [0,36; 0,74] để cà phê sữa đá TB 1,2 về trong ngưỡng. (e) Khóa #15 chạy với bộ sinh theo giây | **81/81 ô** trong ±5 điểm và trong ngưỡng Không tì vết (`ket-qua-81-o.md`, 20.000 món mỗi ô). Cà phê sữa đá TB 0,9 / 1,104 / 1,2: −1,6 / +2,5 / +3,9; cà phê muối TB 0,9 −1,5, Ẩu 1,2 −3,1; Tây Ninh TB 0,9 −0,3, Ẩu 1,2 −4,8 (là ô lệch lớn nhất). Thời gian: cà phê sữa đá TB 1 phần 28,9 giây (−1,1%) như bản v2 |
| 2 | major | Hũ nhà làm gần như không đem lại lợi, kể cả mẻ hoàn hảo; người chơi biết tính sẽ bỏ hũ nên tần suất băm, chặt, giã ở Q4 không có động lực | **Sửa một phần, nói rõ phần còn lại.** (a) Thay "cộng điểm một thao tác" bằng **"Vị nhà làm" cộng thẳng Q món** +1 … +4 theo Q mẻ, hiện tem trên màn Ra món (mục 4.3). (b) Nhiệm vụ ngày "Làm một hũ nhà làm hạng Tốt" và gợi ý của Dì Sáu (mục 4.8, 4.9). (c) Khóa #17 thêm mục tiêu riêng cho hũ: TB +0,01 … +0,06. (d) **Không** làm phần "giữ tổng lợi TB ≤ +0,20 bằng cách bớt lợi thời gian của thùng đá": người dùng đã chốt mức +0,45 … +0,61 (Q6). (e) Ghi thẳng cho người dùng ở mục 10.2 rằng lợi sao của hũ nhỏ và người chỉ tính sao có thể bỏ hũ | Chỉ hũ, ngày 4–15: TB **+0,022**, Giỏi +0,005, Ẩu +0,018 sao/khách; Tuyệt hảo TB 63,1 → 65,2%; thưởng trung bình +2,6 Q mỗi món dùng hũ. Thử "Vị nhà làm" +2 … +5: TB +0,025 (không đáng). Mục tiêu "Giỏi ≥ +0,02 từ hũ" không đạt được bằng chất lượng: sao của Giỏi bị giới hạn bởi phạt chờ gọi món (14,4% ở cả hai cột), không bởi Q (`ca-v3f-hu.json`) |
| 3 | major | Lợi của ô thùng đá gần như hoàn toàn do thời gian; "sơ chế khéo thì món ngon hơn" không thành | **Sửa.** Thêm **"Sơ chế khéo"**: mỗi hộp Q mẻ ≥ 85 / 90 / 95 cộng +1 / +2 / +3 Q món (trần cộng dồn +5); khóa #17 đòi phần "ngon hơn" của TB ≥ +0,05. Không bớt lợi thời gian (Q6). Báo người dùng tỉ lệ chia (mục 4.10, 5.6) | Chia lợi của TB: **+0,439 nhanh hơn (83%) + 0,092 ngon hơn (17%)**; Tuyệt hảo TB trong ca 63,1 → 71,1% (chỉ phần thời gian: 63,5%); Q 89,5 → 91,3. Giỏi 83% / 17%. Bản v2: Tuyệt hảo +0,8 điểm (`ca-v3f-chinh.json`, `ca-v3f-tg.json`) |
| 4 | major | Ngày 2–5, bản 0.5.4 không sơ chế lệch lên quá 5% vì thẻ bước người mới chỉ hiện ở đầu trạm; khóa #16 bỏ ngày 1–3 và không có cận trên | **Sửa.** (a) Thẻ người mới 0,8 giây ở **mọi thao tác** trong 3 lần nấu đầu (thẻ đầy đủ ở thao tác đầu trạm; thao tác nối dùng thẻ gọn có tay mẫu chạy một lượt) — tổng thời gian thẻ gần bằng 0.5.1 (mục 7.2, 7.7). (b) Khóa #16 thêm **từng ngày 1–15, chặn cả hai phía**. Ngưỡng từng ngày là −0,10 … +0,15 sao và ±8 điểm 5★ thay vì ±0,1 / ±5 đề xuất, vì phần cộng còn lại là của nhịp chờ gọn (Q1) chứ không còn của thẻ người mới (Q10) **[v4 sửa: lời này chỉ đúng cho mức chung của TB; phần nhô thêm của Giỏi ngày 3 là bánh tráng trộn nhanh hơn 0.5.1, như mục 5.4 ghi. Bản v4 đổi luật từng ngày thành cận dưới tuyệt đối + chặn đỉnh so với mức chung (≤ +0,08 sao, ≤ +5 điểm 5★) và đưa lệch ngày mua món vào Q10; mục 13 #4]** | Giỏi 5★ ngày 3: +13,7 → **+6,6** điểm; ngày 5: +10,0 → **+2,5**; TB 5★ ngày 2: +9,4 → **+4,3**; sao TB ngày 3: +0,23 → **+0,11**, ngày 5: +0,22 → **+0,11**. Bỏ thẻ người mới ở cả hai bản: TB ngày 2 / 3 / 5 +0,10 / +0,12 / +0,13 — tức phần do thẻ đã hết (`nguoi-moi.mjs`, `ca-v3f-nonovice.json`) |
| 5 | minor | Nhờ phụ phí gọn, người TB không sơ chế dễ hơn 0.5.1 (+0,10 sao, 5★ +9% tương đối); khóa #16 chỉ có cận dưới | **Sửa + hỏi.** Khóa #16 thêm cận trên ở tau 0,6 + gọn: gộp Δ sao ≤ +0,12, Δ 5★ ≤ +5 điểm; từng ngày ≤ +0,15 / +8. **Không** dùng con dấu 550 ms: người dùng đã chốt 450 ms (Q1). Trình người dùng ở **Q10** (khuyến nghị giữ) | TB 3,29 → 3,39 (**+0,09**), 5★ 16,5 → 17,8%, 1–2★ 24,9 → 21,7%, chờ món > 150% ngân sách 13,2 → 10,7%, giây/dòng −2,6%; Giỏi +0,04 (5★ 76,4 → 79,7%); Ẩu −0,03 |
| 6 | minor | Người Ẩu mất khoảng một phần tư số món Tuyệt hảo và 5★ (tương đối); nếu "±5%" là tương đối thì trượt | **Hỏi (Q9)**, khuyến nghị giữ điểm tuyệt đối; phương án tương đối (2 mồi khi chưa thạo, nhát hụt 40) ghi sẵn | Trong ca, ngày 4–15: Tuyệt hảo Ẩu 9,8 → 7,4% (−25% tương đối), có sơ chế 11,9%; 5★ 6,4 → 4,7%, có sơ chế 7,9%; sao −0,03 |
| 7 | minor | Ở tau 0,9 + gọn, lợi sơ chế của Giỏi vượt mục tiêu nhưng khóa #17 chỉ đo tau 0,6 | **Sửa.** Khóa #17 đo cả tau 0,9 + gọn với ngoại lệ có chủ ý cho Giỏi (≤ +0,16) kèm số đo **[v4: bỏ ngoại lệ này vì người dùng chưa đồng ý; thay bằng quy trình van ở cổng 8.5 và câu Q11; mục 13 #1]** | Tau 0,9 + gọn: TB **+0,540**, Giỏi **+0,149** (ngày +0,10 … +0,18), Ẩu +0,062. Ở kịch bản này Giỏi không sơ chế 4,67 (0.5.1 − 0,05); có sơ chế 4,82 (0.5.1 + 0,10), nên phần lợi lớn là phần bù lại (`ca-v3f-xau.json`) |
| 8 | minor | `timeSec` bỏ qua lượt "miếng kế trượt vào" mà mục 2.0.2 bắt phải có; khóa #5 đánh giá thấp thời lượng 2–3 phần | **Sửa.** (a) 0,45 giây mỗi lượt nằm trong `timeSec` và `dishTimeModel` (`BALANCE.roundSec`). (b) Bố trí lại một màn để chỉ xé còn lượt: nhặt ≤ 9 đích + 3 mồi (lưới 4 × 3, tâm cách ≥ 48px), thái ngắm ≤ 9 vạch (tắc 3 hàng × 3 quả), cắt thanh ≤ 6, hai lượt ≤ 6 vạch mỗi lượt, **rạch: tối đa 3 ổ nằm chồng trên một màn**. (c) Xé khô mực 4 → 3 sợi. (d) Sàn giờ xé cộng lượt. (e) Khóa #5, #6 kiểm ở khung rộng **và** khung 320 | Tau 0,6 + gọn: mọi ô ≤ **+7,4%** (khung 320 như nhau); tau 0,9 + gọn ≤ **+10,8%**, **0/1.242** ô > +12%, kể cả khi mỗi lượt tốn 0,8 giây; tau 0,9 không gọn (tham khảo) ≤ +19,8%. Khóa #6: 0/1.659 ô đỏ ở cả hai khung, cả kiểm × 1,12 (`ket-qua-thoi-gian.md`, `ket-qua-gioi-han-v3.txt`). Trong ca: tau 0,9 + gọn, dòng nặng nhất +10,5% |
| 9 | minor | Mô hình ca của bản thiết kế tự viết lại luật hàng chờ, bỏ QR chờ tiền về và mod ngày; mức tuyệt đối lạc quan, biên khóa #17 mỏng | **Sửa.** Mọi số ca của bản v3 lấy từ mô phỏng **lõi thật** của người phản biện; `tools/mo-phong-bep` (mục 8.4) chạy ca bằng `startShift`, `advance`, `beginCounter` … `clipTicket`, `serveTicket`, `resolveComplaint`, `endShift`, chỉ thay phần bếp; khóa #16, #17 lấy mức từ đó | 0.5.1, ngày 4–15, lõi thật: TB 3,29, Giỏi 4,72 (5★ 76,4%, phạt chờ gọi món 16,1%), Ẩu 3,60 — dùng làm nền ở mọi bảng mục 5 |
| 10 | major | Bốc hộp chỉ ở giao diện; lõi điền sẵn bước ở `submitChon` nên người chơi không cần chạm "Có sẵn": trạm phụ thuộc mở, Ra món không hỏi | **Sửa.** Tách hai việc: `submitChon` chỉ **giữ phần** và trừ giá vốn; hàm lõi mới **`takeBox(state, tramId, ctx)`** điền bước, phát `step.done`, cộng "Sơ chế khéo". Chưa bốc thì `after` vẫn khóa, "Ra món" hỏi "Còn n bước chưa làm" như cũ, bước chưa bốc tính như bỏ (mục 4.5, 6.1). Test ở `m54-kitchen` và `m54-bep` (mục 8.1, 8.3). Mô phỏng tính 1,0 giây mỗi lần bốc | Với bốc bắt buộc, lợi TB +0,531 (trong dải); không có đường nào điền bước từ hộp ngoài `takeBox` (khóa bằng test "không bốc thì `kep_banh` khóa", "Ra món khi chưa bốc thì bước tính 0 và `bo_qua`") |
| 11 | major | Thiết kế không tính khung 375×553 (bậc xs), trong khi test vừa màn chạy 10 khung có khung này; ở xs Thớt và sân khấu chỉ 320px | **Sửa.** (a) Hàng xs ở bảng 2.1: **mọi loại có sân khấu tối thiểu ≤ 190px cao** (giã cối nhỏ 180 × 180 có vòng phách đè lên miệng cối; bào luôn nghiêng; chặt, vắt, xé, nhặt co lại). (b) Sân khấu ở xs dùng đầu gọn 32px và chân 44px, vùng chơi khoảng 230px (mục 7.2). (c) Thớt ở xs: lưới **3 cột**, ô trạm 60px, dải hộp thu vào hàng tiêu đề (mục 7.1). (d) Màn sáng có hàng xs (mục 4.7). (e) Ghi rõ luật khung nhỏ theo `vua-man-bep` (Thớt: "Ra món" và trạm đang làm được; sân khấu: vùng chơi và chân thấy trọn) và sửa câu "không cuộn ở 10 khung" của `m54-vua-man-1/2` cho khớp; cổng dựng thử 7.3 đo thêm 375×553 | Thớt Tây Ninh ở xs: 44 + 22 + 2 × 60 + 6 + 44 + 8 = **244 ≤ 320**; màn sáng ở xs: 364 ≤ 472 (≤ 376 theo ngân sách chặt) |
| 12 | major | Người dùng nêu đích danh thái / băm / chặt, mà trong ca 9 món không có băm, chặt, giã; "thái lát", "thái sợi" không còn là cách đúng ở đâu | **Giải thích (người dùng đã chốt).** Sau bản v2, người dùng chọn Q4/Q5 "Chỉ ở mẻ sơ chế sáng": băm, chặt, giã, nạo chỉ có ở mẻ sáng, trong ca dùng thao tác nhanh. Vì vậy **không** thêm băm tỏi ớt hay chặt vào ca của món nền. Phần làm được trong khung đó: (a) **"Thái lát" là cách đúng** của hành tím ở mẻ Hành tỏi phi (dao theo nhịp); "thái sợi" chỉ là cách sai ở Chặng 1 vì người dùng chốt Q2 đổi dưa leo sang cắt thanh, xoài sang bào sợi. (b) Q4 trình **trung lập**, kèm tần suất theo từng cách chơi (mục 5.6, 10.2) | TB, % số ngày 2–15: bỏ qua hoặc chỉ thùng đá: băm, chặt, giã 0%; thùng đá + hũ xoay vòng: băm 57%, phi 57%, giã và rang 36%, chặt 29%, đập dập 29%, thái lát hành tím 29%; nạo chỉ ở ngày chè bưởi (`tien-tan-suat.mjs`) |
| 13 | major | Các lớp vỏ đổi cử chỉ hoặc số đo chưa đủ bộ (cử chỉ, hàm đo, testid, bộ giải, tour, phụ bếp), thiếu nặng nhất là `bao.nao` | **Sửa.** Bảng đủ mục cho từng lớp vỏ ở mục 2.0.8 và 2.2: **`bao.nao`** có hàm đo cung `createScraper` (mới), testid `nao-coconut[data-cx, data-cy, data-r, data-arc]`, `nao-stroke-i`, `nao-rim[data-w]`, `nao-meter[data-v, data-a, data-b]`, `nao-count`, bộ giải, tour `bep_nao`, `gestureKey` `bao.nao`, `sample`; **`lua.ngam`**: `lua-ring[data-v, data-a, data-b]`; **`lua.phi`, `lua.rang`**: `lua-needle[data-carry]`, bộ giải chạm "Nhấc" sớm hơn đúng Δ = carry (vì `lua.js` chốt ở `pointerdown`); **`cha.boc`**: `cha-crack-i[data-cracked]` vào hợp đồng plugin; **`xoay` có vùng**: `xoay-meter[data-v, data-a, data-b]`; **`rot.phin`**: `rot-bloom[data-on]`. `METHOD_SPECS` thêm **`bySkin`** (`cha.boc` sinh `holes`, `lua.phi/rang` sinh sai số theo giây + `carry`, `lua.ngam`, `rot.phin` sinh "Ngập bột", `xoay` vùng `oneSided`, `chat.dua`, `bao.nao`); `m54-methods` kiểm `sample` của từng lớp vỏ | Mục 2.0.8 (bảng `bySkin`), 2.2, 2.3.2, 2.3.6, 7.7 (`NEW_GESTURES`), 8.1, 8.3 |
| 14 | minor | Dấu "phần hộp của món bị bỏ" đặt ở `cook.boxUse[i].wasted` nhưng phiên nấu bị xóa khi bỏ món và giao món | **Sửa.** Số phần ghi ngay vào cấu trúc bền của ca: `sh.morning.boxes[k].used` (lúc giữ ở `submitChon`), `.wasted` (lúc `abandonDish` với phần đã bốc; phần chưa bốc trả lại hộp). `expireMorning`: usedValue = Σ (used − wasted) × p; wasteValue = spent − usedValue. Thêm vào `migrateContentM54` và ca test "bỏ món sau khi bốc hộp", "bỏ món khi đã giữ chưa bốc" | Mục 4.5 (ý 8), 4.6 (ý 7, 8, 10), 6.3, 6.5, 8.1 |
| 15 | minor | Hộp Cùi bưởi nấu sẵn có thể làm mọi ly chè Hỏng mà nhãn hộp vẫn "Tốt" (điểm `luoc` = trung bình luộc và ngâm, luật mẻ hỏng chỉ xét luộc) | **Sửa.** `luoc` lấy **điểm luộc**; ngâm nước đá chỉ vào Q mẻ (như cắt hành ở hộp Rau bánh mì); thêm ca test | Mục 4.2, 4.3 ý 2; `PREP.cui_buoi_nau_san.opFor.luoc = ['luoc']` (mô phỏng); mẻ hỏng 1,1% ở TB, và hộp không hỏng thì không món nào Hỏng vì hộp |
| 16 | minor | Màn sáng chen giữa lúc chọn lựa chọn sự kiện ngày (có tốn tiền) và lúc trả tiền ở `startShift`; tiền sơ chế làm ví thiếu thì lựa chọn bị bỏ không báo | **Sửa.** `previewDayMods` trả thêm `choiceCost`; `startBatch` từ chối `giu_tien_lua_chon` khi ví − giá mẻ < `choiceCost`; viên cỡ mẻ ghi "Giữ 20.000đ cho Căng bạt"; ca test ở `m54-morning` | Mục 4.6 ý 5, 6.1 (`events.js`, `morning.js`), 8.1 |
| 17 | minor | Board cũ còn dở lúc cập nhật mà coi mỗi bước thiếu `tram` là một trạm riêng thì Tây Ninh, bánh tráng, cà phê muối tràn khung chính | **Sửa.** Board không có `tram` (board 0.5.1 còn dở lúc cập nhật) thì Thớt **dùng lại nguyên bố cục 0.5.2**: ô nguyên liệu `.k-ing[data-steps]` gom bước theo `ing`, mỗi bước một huy hiệu `board-step-*`, chạm huy hiệu chơi đúng một bước như 0.5.1 (`ingTile`, `stepButton` ở `ui/screens/kitchen.js:858-900`; `css/kitchen.css:676-701` ở `5970a06`). `tramsOf` trả mỗi bước một "trạm" chỉ cho lõi (Tự làm, Làm lại), giao diện không vẽ ô trạm. Thêm ca "save v3 đang nấu dở Tây Ninh" vào `m54-vua-man-2` | Bố cục 0.5.2 đã qua `vua-man-bep` với Thớt 8–9 bước ở mọi khung (bánh tráng trộn 9 bước ≈ 530 ≤ 546 ở 402×760); Tây Ninh 0.5.1 có 8 bước trong 7 nhóm nguyên liệu, cùng cỡ (mục 6.5) |
| 18 | minor | Kế hoạch test sót tệp sẽ đỏ hoặc mất tác dụng; thiếu ca cho vài luật mới | **Sửa.** Thêm `tests/unit/review-m3-fixes.test.mjs:328-330` (nộp `rot_nuoc` rồi đòi `u_phin` mở: phải nộp `u_bot`, `nen_phin` trước; gói P3) và `tests/e2e/save-safety.e2e.mjs:189` (đổi `s.version = 4` thành `STATE_VERSION + 1`; gói P11). Thêm vào `m54-kitchen`: "`submitChon` ghi `boardRev = RECIPES_REV`; chọn `cat_thanh` ra `params.cut = 'thanh'`, chọn `thai_lat` ra `'ngam'`", "không bốc thì trạm phụ thuộc khóa" | Mục 8.1, 8.2, 8.3 |
| 19 | minor | Câu "P1, P2, P3, P5–P9 bắt đầu khi Đợt 3 còn chạy" mâu thuẫn cột "Cần trước: P0"; P5 sở hữu đúng tệp Đợt 3 đang sửa | **Sửa.** Bỏ câu cho bắt đầu sớm: **mọi gói** bắt đầu sau khi Đợt 3 đã gộp và phát hành (người dùng chốt Q8 "làm sau khi Đợt 3 phát hành"); P5 chỉ thêm hàm vào `vfx.js` sau khi Đợt 3 phát hành | Mục 9. `vfx.js`, `tests/unit/vfx.test.mjs` nay đã nằm trong WIP `0773cc7` của Đợt 3 |
| 20 | minor | Tour `bep_thot` và trang Cách chơi `bep` còn tả luật cũ; chưa có trang Cách chơi cho màn sáng | **Sửa.** Gói P10 sửa `bep_thot` (đích `board-tram-*`, lời theo trạm, một con dấu mỗi trạm) và trang `bep`; thêm trang `so_che` "Sơ chế sáng"; `tour.test` kiểm lời mới | Mục 4.8 (lời đầy đủ) |
| 21 | minor | Sổ tiền của đồ chua không khớp (p = 0, tiền theo cả mẻ; chia theo phần ra số lẻ) | **Giải thích.** Đồ chua dời sang Chặng 2 theo quyết định người dùng (Q4/Q5), nên 0.5.4 không còn khoản này; mọi đồ nhà làm của 0.5.4 là 0đ. Luật cho Chặng 2 đã chốt sẵn ở mục 4.12: phần đã dùng × 300đ làm tròn xuống bội 500đ vào giá vốn, phần còn lại vào hao hụt | Mục 4.12; khóa #11 (12 đồ, không `do_chua_nha`) |
| 22 | minor | Thuật ngữ, cơ chế lệch nghề: "vắt tắc" ở bước chạm chai; "chặt đôi dừa bằng sống dao" kèm "Kẹt dao"; "Không hành" mà vẫn rắc hành | **Sửa.** (a) Nhãn `nem` của 2 món bánh tráng: "Nêm sa tế, **nước tắc**" ("Nêm sa tế, muối tôm, nước tắc"). (b) **"Bổ dừa"**: lớp vỏ `chat.dua` là gõ sống dao 3 nhát quanh giữa trái theo vạch, chấm theo lực và vị trí, **không có luật kẹt dao** (mục 2.3.2). (c) `kep_banh` không rắc hành lá khi dòng có ghi chú `khong_hanh`; thêm test | Mục 2.3.2, 3.1, 3.2, 4.2; Mẹo nghề `bo_dua` |
| 23 | minor | `shouldAutoShow` ở lõi thuần nhưng test đòi nó tự xét `navigator.webdriver` và `?sang=1` | **Sửa.** `shouldAutoShow(state, ctx)` nhận cờ `ctx.autoAllowed`; giao diện tính bằng `morningAutoAllowed()` theo mẫu `autoAllowedNow` (`src/ui/components/tour.js:158-164`); test lõi truyền cờ, phần `navigator` để test giao diện và e2e | Mục 4.1, 6.1, 8.1 |
| 24 | minor | Phiếu chấm có 5 hàng cố định, đã nén ở khung thấp; thiết kế thêm dòng mà không nói đặt đâu, cao bao nhiêu | **Sửa.** "Sơ chế khéo +n", "Vị nhà làm +n", "Không tì vết (trượt nhẹ: …)" đặt ở **màn Ra món** (`dish-reveal`, hàng tem ≤ 2 dòng 13px dưới hạng món, cao ≤ 40px); phiếu chấm **không thêm hàng**, chỉ một tem nhỏ 20px trong hàng Bếp ("Sơ chế") như tem lỗi sẵn có; thêm ca vào `m54-vua-man-2` (màn Ra món có tem ở 10 khung) | Mục 4.3 ý 8, 7.2, 8.3 |
| 25 | minor | Người mới chỉ được thẻ bước ở thao tác đầu trạm; thao tác nối thuộc loại cũ không có tour (lửa, chạm) chỉ hiện động từ 28px, kể cả bước chí mạng Chiên trứng ngày 1 | **Sửa.** Trong 3 lần nấu đầu của món, **mọi thao tác** có thẻ: đầu trạm thẻ đầy đủ; thao tác nối thẻ gọn có tay mẫu chạy một lượt (0,8 giây), kể cả `lua`, `cham`, `rot`; khoản này đã vào mô hình thời gian người mới (cùng sửa #4) | Mục 7.2, 7.7; người mới TB 1 phần −6,4% … +1,5% so với 0.5.1 (bản v2: −16,3% … −6,2%) |

**Chỗ bản v3 đi khác đề xuất sửa của phản biện (và lý do):**
- #1: chọn "nới vùng `u_phin` × 1,2, giữ chu kỳ 5" thay vì "giữ chu kỳ 6": cùng độ khó theo giây, nhưng bớt 0,6 giây mỗi ly; giữ chu kỳ 6 làm Giỏi không sơ chế lố khóa #16 ở tau 0,9 + gọn.
- #2, #3: không bớt lợi thời gian của thùng đá để giữ tổng lợi TB ≤ +0,20 — người dùng đã chốt TB +0,45 … +0,61 (Q6). Mục tiêu "Giỏi ≥ +0,02 từ hũ" không đạt được bằng thưởng chất lượng (sao của Giỏi bị giới hạn bởi chờ gọi món); bản v3 nói thẳng điều này với người dùng thay vì ép số.
- #4, #5: ngưỡng từng ngày của khóa #16 là −0,10 … +0,15 sao, ±8 điểm 5★ (không phải ±0,1 / ±5), và không dùng con dấu 550 ms: phần cộng còn lại của người TB là của nhịp chờ gọn người dùng đã chốt (Q1). Đưa thành câu Q10. (v4: luật từng ngày đổi thành cận dưới tuyệt đối + chặn đỉnh so với mức chung; mục 13 #4.)
- #12: không đưa băm, chặt vào ca của món nền — trái quyết định "Chỉ ở mẻ sơ chế sáng" (Q4/Q5).
- #21: không sửa sổ đồ chua trong 0.5.4 vì đồ chua đã sang Chặng 2; luật để sẵn ở mục 4.12.

---

## 13. Phụ lục kiểm cuối (trả lời 9 phát hiện, bản v4)

9 phát hiện của kiểm cuối (2 major, 7 minor), theo đúng thứ tự. "Sửa" = đã đổi thiết kế; "Hỏi" = đưa thành câu hỏi cho người dùng. Mọi số mới chạy lại trên **`bep-chuan/kiem-cuoi/v4/`** (bộ mô phỏng lõi thật của người phản biện vòng 2, chép qua `mo-phong-v3b/`, chỗ đổi đánh dấu `[v4]`), gộp **3 bộ hạt giống độc lập**; danh mục tệp ở đầu bản ("Số liệu của bản v4").

| # | Mức | Phát hiện (tóm tắt) | Xử lý | Bằng chứng sau khi sửa |
|---|---|---|---|---|
| 1 | major | Ở tau 0,9 + gọn, lợi sơ chế của Giỏi gấp đôi mức người dùng chốt; bản v3 tự đặt "ngoại lệ có chủ ý" Giỏi ≤ +0,16 mà không hỏi; cổng 8.5 cho phát hành tới tau 0,9 | **Sửa + hỏi.** (a) Bỏ chữ "ngoại lệ có chủ ý": khóa #17 đòi Giỏi ≤ +0,08 ở **mọi trạng thái được phát hành** (mục 5.7). (b) Cổng 8.5 có **quy trình van định sẵn**: tau đo được > 0,6 thì trước hết giảm tau ở giao diện; còn > 0,6 thì chạy lại #15–#17 **bằng tau đo được** và áp mức nhỏ nhất của **Van gọn bếp** mà mọi khóa đạt (mức 1 bỏ "Gài nắp nén vừa tay" ở 2 món cà phê; mức 2 bỏ thêm "Kẹp trứng, dưa leo vào ổ" ở 2 món bánh mì; chỉ bỏ thao tác mới, trọng số 1); không mức nào đạt (tau > 0,85 hoặc chỗ giáp ranh) thì **không phát hành** (mục 8.5, khóa #19). (c) Hai van kiểm cuối nêu làm ví dụ (thưởng "Sơ chế khéo" chỉ từ Q mẻ ≥ 90; ô thứ 3 mở muộn) **đã đo và không đủ**: lợi của Giỏi ở máy chậm là giây, không phải thưởng. (d) Câu **Q11** trình người dùng ba phương án, khuyến nghị (A) | Tau 0,9 không van: Giỏi **+0,155** (3 bộ: +0,149 / +0,156 / +0,161), từng ngày +0,09 … +0,19 (`gop-xau-v4.txt`). Van ví dụ ở tau 0,9: thưởng từ 90 → +0,140; ô thứ 3 từ ngày 8 → +0,138 (100 hạt giống); cộng vào mức 2 → +0,084 cả hai (3 bộ). Trạng thái phát hành: tau 0,6 mức 0 → Giỏi +0,069, TB +0,534; tau 0,75 mức 1 → +0,080 / +0,549; tau 0,85 mức 2 → **+0,071** / +0,547, người không sơ chế +0,104 / +0,028 / −0,017 (3 bộ; `gop-m2-x085.txt`). Bảng đủ ở mục 8.5 |
| 2 | major | Q2 mới làm một phần: nhãn "Cách mới" chỉ nhắc tên; Mẹo nghề chỉ có `cat_thanh` và không có đường kích hoạt; người chơi cũ chọn "Thái sợi" cho xoài bị −15 mà không ai giải thích | **Sửa.** Nhãn "Cách mới" 13px trên nút cách đúng của bảng chọn cách (`method-new-<cách>`) và góc ô trạm Tắc (`tram-new-tac`), trong 3 lần ra món đầu sau khi cập nhật, chỉ cho người chơi đã nấu món đó ở bản cũ (`state.newWays`, tạo lúc migrate). Ba Mẹo nghề `cat_thanh`, `bao_soi_xoai`, `tac_khe_hat`; đường kích hoạt `sai_cach:<id bước>` (chọn sai cách, ở `submitStep`) và `cach_moi:<id bước>` (board mới đầu tiên; bỏ qua trần một thẻ mỗi ca, tối đa 3 lần cả đời save); `unlockTip` khớp `trigger` hoặc `alsoOn`; `NEW_WAY_STEPS` nối bước với thẻ. Gói P3 (lõi), P9 (nhãn), P10 (thẻ) | Mục 0 (Q2), 4.8, 6.1 (`kitchen.js`, `state.js`, `save.js`, `economy.js`, `tips.js`), 6.3, 6.5, 7.1 (testid), 8.1 (`m54-kitchen`, `m54-tips` mới, `m54-save`), 8.3 (`m54-save.e2e`: save v3 đã nấu bánh tráng, chọn "Thái sợi" thì hiện "Mẹo nghề: Xoài bào sợi"; ra món 3 lần thì nhãn mất), 9 |
| 3 | minor | Ba khóa đặt ngưỡng sát số đo của một bộ hạt giống, nhỏ hơn độ dao động giữa các bộ (#15 Tây Ninh Ẩu, cà phê sữa đá TB 0,9; #16 và #17 ở tau 0,9) | **Sửa.** (a) Mọi số ca gộp 3 bộ hạt giống độc lập, ghi độ lệch chuẩn giữa các bộ; bảng độ vững ở mục 5.7, mục tiêu biên ≥ 2σ cho mọi khóa chạy trong CI. (b) Khóa #15 lấy trung bình 3 bộ × 20.000 = 60.000 món mỗi ô. (c) Sửa cơ chế, không sửa ngưỡng: nhặt **mồi mờ sau 2 lần nhầm** (Tây Ninh Ẩu), ủ bột [0,14; 0,31] → [0,13; 0,32] (cà phê sữa đá TB 0,9). (d) #16, #17 ở tau 0,9: không còn khóa ở đó vì trạng thái này không được phát hành (xem #1); trạng thái phát hành chậm nhất (tau 0,85 + mức 2) có biên 7σ ở phần gộp | 7 bộ × 20.000 món: v3 có 2 ô lẻ trượt Tuyệt hảo, 1 ô lẻ trượt Không tì vết; v4 **0/567**. Tây Ninh Ẩu 1,2: −4,67 → −4,19 (3 bộ của khóa; biên 4,3σ; 7 bộ −4,84 → −4,35); cà phê sữa đá TB 0,9 Không tì vết 95% → 79% ngưỡng (3 bộ; biên 3,7σ; 7 bộ 92% → 76%); biên nhỏ nhất của khóa #15 2,3σ. #17 Giỏi chính +0,069 (độ lệch giữa các bộ 0,0045; biên 4,2σ). Chỗ duy nhất dưới 2σ (chặn đỉnh 5★ TB ngày 2 ở tau 0,85 + mức 2, 1,0σ) chỉ kiểm lúc qua cổng, ghi rõ ở mục 5.7 (`o81-fade-ubot.txt`, `bang81-v4.md`, `o81-van-*.txt`, `gop-chinh.txt`) |
| 4 | minor | Ngưỡng từng ngày của #16 bị nới (−0,10 … +0,15, ±8) với lời giải thích mâu thuẫn mục 5.4; 5★ từng ngày của Giỏi vẫn vượt ±5 điểm | **Sửa + hỏi.** (a) Lời giải thích ở mục 12 #4 sửa cho khớp mục 5.4: mức chung của TB là nhịp chờ gọn (Q1); phần nhô của Giỏi ngày 3 là bánh tráng trộn (món mua ngày 3) nhanh hơn 0.5.1 khoảng 4–5%. (b) Luật từng ngày tách hai việc: **cận dưới tuyệt đối** (≥ −0,10 sao, ≥ −8 điểm) và **chặn đỉnh so với mức chung** của hồ sơ (≤ +0,08 sao, ≤ +5 điểm 5★: đúng ±5 điểm phản biện vòng 2 đề xuất, nhưng tính từ mức chung đã hỏi ở Q10). (c) Câu Q10 thêm lệch ở ngày mua món (Giỏi +6,7 điểm 5★ ngày 3), kèm phương án ±5 điểm tuyệt đối nếu người dùng muốn | Chính, gộp 3 bộ: Giỏi 5★ ngày 3 +6,7 (mức chung +3,4, nhô +3,3; biên 4σ); TB ngày 4 +0,13 sao (mức chung +0,09, nhô +0,045; biên 3,4σ); TB 5★ ngày 2 +4,8 (nhô +3,4). Thấp nhất: Ẩu −0,04 sao, −3,3 điểm (mục 5.4, 5.7) |
| 5 | minor | Thông báo cho người dùng bỏ sót ngâm (0% ở mọi cách chơi), hạt lựu (chỉ chè bưởi) và thái sợi đúng (không còn ở Chặng 1) | **Sửa.** (a) Thông báo ở mục 10.2 ghi đủ ba phương thức kèm lý do. (b) Thêm nhiệm vụ ngày "Trứng cút luộc, ngâm nước đá" (tối đa một lần mỗi 5 ngày, chỉ khi thực đơn có món dùng trứng cút và đã có ô thùng đá thứ 3) để người chơi gặp ngâm; chạy lại #17. (c) Không chọn "ngâm dưa leo nước đá ở mẻ Rau bánh mì" (lý do ở mục 4.9). (d) Bảng tần suất mục 5.6 tách hàng ngâm, nạo, hạt lựu, thái sợi | Làm theo nhiệm vụ: ngâm 0% → **21%** số ngày 2–15; TB có sơ chế +0,496, Giỏi +0,063 (trong dải Q6); ngày làm nhiệm vụ lợi còn +0,33 … +0,39 (`ca-v4-nvd-s0.json`; `tien-tan-suat.mjs`) |
| 6 | minor | Tay mẫu thiếu `swipe-arc` (nạo) và bóc hai nhịp; tour `bep_thot` bước "Chọn cách sơ chế" nhắm `.k-step.has-method` không còn ở board mới | **Sửa.** `GESTURE_BY_SKIN` thêm `cha.boc: 'tap-peel'`; mục 7.7 có 13 tay mẫu mới, kể cả `swipe-arc`, `tap-peel`; test `m5-components` đòi mọi giá trị của `GESTURE_BY_TYPE`, `GESTURE_BY_CUT`, `GESTURE_BY_SKIN` có luật tay mẫu trong `css/fx.css`. Bước "Chọn cách sơ chế" đổi đích sang `board-tram-*[data-method="1"]:not([data-state="xong"])` (dự phòng `.k-step.has-method` cho board cũ); ô trạm có dấu bút; ca `tour.e2e` mới | Mục 2.0.8, 4.8, 7.1 (`data-method`), 7.7, 8.1, 8.2, 8.3 |
| 7 | minor | Móc M6 ghi `planBoxes` / `consumeBoxes`, mà `consumeBoxes` không tồn tại; phụ bếp có thể điền bước từ hộp không qua `takeBox` | **Sửa.** Móc M6: `planBoxes` (giữ phần) + `takeBox(state, tramId, { ...ctx, staff: true })` (bốc); không hàm nào khác điền bước từ hộp; `takeBox` nhận `ctx.staff`; test `m54-kitchen`: không gọi `takeBox` thì trạm phụ thuộc vẫn khóa, gọi với `staff` thì món mất Không tì vết | Mục 6.1 (`kitchen.js`), 6.6, 8.1 |
| 8 | minor | Hợp đồng `ctx.prewarm` / `start()` áp cho 19 plugin mà không gói nào được giao; P6 (thái) chạy song song với P8 mà CSS thái cũ nằm ở `mg-prep.css` của P8 | **Sửa.** P0 viết khung test `ctx.prewarm` / `start()` cho 19 plugin (đánh dấu `todo`); P6 (4 plugin), P7 (5), P8 (11 plugin cũ) làm và bỏ `todo` của plugin mình, có trong nghiệm thu. P6 **chỉ ghi đè** luật thái trong `css/mg-dao.css`; P0 gắn `mg-dao.css`, `mg-tay.css`, `morning.css` **sau** `mg-prep.css` và `fx.css` trong `index.html` | Mục 8.2 (`minigame-ui-contract`), 9 (P0, P6, P7, P8); 14 dòng khớp `mg-thai\|g-thai2\|thai-` ở `css/mg-prep.css`, 12 dòng ở `css/fx.css` (`5970a06`) |
| 9 | minor | Màn sáng không có nút về sảnh; PWA iOS không có nút Back hệ thống; Đợt 3 đòi "mỗi lối vào có nút quay lại" | **Sửa.** Nút tròn 44×44 `morning-back` ("Về Chuẩn bị", cùng kiểu nút quay lại của thanh đầu `screenHead` Đợt 3) ở đầu màn; hộp, hũ, tiền giữ trong `state.morning`, `seen` vẫn ghi nên "Mở hàng" lần sau vào thẳng ca; nút ẩn khi sân khấu một mẻ đang mở (sân khấu có "Bỏ mẻ"). Nằm trong hàng đầu sẵn có nên bảng chiều cao 4.7 không đổi; bề ngang ở 320px đã tính | Mục 4.1, 4.7 (hàng "Đầu", ý 5), 8.3 (`m54-so-che`: làm mẻ → về sảnh → công tắc phiếu khóa; `m54-vua-man-2`: nút ≥ 44px) |

**Chỗ bản v4 đi khác đề xuất sửa của kiểm cuối (và lý do):**
- #1: làm **cả hai** cách kiểm cuối nêu (van ở cổng 8.5 và câu Q11), vì van đổi bảng công việc của mọi người chơi nên người dùng cần biết và chọn. Không dùng hai van ví dụ (thưởng chỉ từ Q ≥ 90, ô thứ 3 mở muộn) vì đã đo và chúng không kéo được lợi của Giỏi (tau 0,9: +0,140, +0,138; cộng vào mức 2 vẫn +0,084); dùng van bớt giây và đặt **trần phát hành tau ≤ 0,85**.
- #3: Tây Ninh Ẩu chưa về \|Δ\| ≤ 4 như ví dụ của kiểm cuối (−4,19 trên 3 bộ của khóa; −4,35 trên 7 bộ) nhưng biên 4,3σ, đạt yêu cầu "cách ít nhất 2–3 lần độ lệch chuẩn". Chọn mồi mờ thay vì nới `tolDeg` xé khô mực vì lệch đến từ điểm trừ dồn của thao tác nhặt (Tây Ninh có hai lần nhặt), không phải từ xé.
- #4: không giữ ±5 điểm **tuyệt đối** từng ngày (Giỏi ngày 3 +6,7 sẽ trượt) mà chặn đỉnh **so với mức chung** và hỏi người dùng ở Q10; phương án tuyệt đối (làm bánh tráng trộn chậm lại khoảng 4%) ghi sẵn trong Q10.
- #5: chọn nhiệm vụ ngày cho trứng cút thay cho "ngâm dưa leo ở mẻ Rau bánh mì".
