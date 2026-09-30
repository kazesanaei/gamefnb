# Nghiên cứu thể loại game mô phỏng cho Bếp Khởi Nghiệp

Phiên bản 1.0 · ngày 30/09/2026 · viết trong mốc M4 (bản 0.4.0 đang làm)

- **Để làm gì:** gom bài học từ các game mô phỏng nấu ăn, quản lý quán và đời sống, rồi chuyển thành nguyên tắc và đề xuất cụ thể cho Bếp Khởi Nghiệp (viết tắt BKN).
- **Dữ liệu gốc:** `docs/tham-khao/m4-nghien-cuu-the-loai.json` (62 mục nghiên cứu đã kiểm chứng, 194 đường dẫn nguồn) và đề cương ở mục E của `docs/tham-khao/m4-thiet-ke.md`. Tài liệu này không thêm game hay số liệu nào ngoài hai nguồn đó và các quyết định của người dùng cho M4.
- **Khi các tài liệu lệch nhau**, ưu tiên theo thứ tự: quyết định của người dùng → `docs/kien-truc.md` (hợp đồng kỹ thuật) → `docs/can-bang.md` (số cân bằng) → tài liệu này. Tài liệu này giải thích *vì sao*, không chốt con số cuối cùng.
- **Người đọc:** người đào tạo nhân viên F&B, người thiết kế nội dung và lập trình viên. Không cần biết lập trình; thuật ngữ game được giải thích ở Phụ lục B.

## Mục lục

- [Tóm tắt một trang](#tóm-tắt-một-trang)
- [1. Mục đích, phạm vi và cách kiểm chứng](#1-mục-đích-phạm-vi-và-cách-kiểm-chứng)
- [2. Bản đồ 11 thể loại game mô phỏng](#2-bản-đồ-11-thể-loại-game-mô-phỏng)
- [3. Bảng tra cứu: game, cơ chế và cách áp dụng](#3-bảng-tra-cứu-game-cơ-chế-và-cách-áp-dụng)
- [4. Mười lăm nguyên tắc thiết kế](#4-mười-lăm-nguyên-tắc-thiết-kế)
- [5. Hai mươi sáu đề xuất xếp hạng theo tác động và chi phí](#5-hai-mươi-sáu-đề-xuất-xếp-hạng-theo-tác-động-và-chi-phí)
- [6. Không làm và lý do](#6-không-làm-và-lý-do)
- [Phụ lục A. Nguồn theo từng game](#phụ-lục-a-nguồn-theo-từng-game)
- [Phụ lục B. Thuật ngữ](#phụ-lục-b-thuật-ngữ)

---

## Tóm tắt một trang

### Năm bài học lớn nhất

1. **Sự kiện "dày" mà không "loạn" là nhờ có nhịp.** Các game giữ chân tốt đặt chuyện lớn theo lịch đoán được, chỉ bốc ngẫu nhiên phần nội dung bên trong. Papa's có khách mang phong bì công thức mỗi 3 ngày; Animal Crossing: New Horizons ngày thường nào cũng có một vị khách ghé; Stardew Valley có xe hàng rong thứ Sáu và Chủ nhật. Đi kèm là bảo hiểm xui: người kể chuyện Randy của RimWorld bắt buộc có biến cố lớn nếu 13 ngày chưa có, Dota 2 tăng dần xác suất sau mỗi lần trượt.
2. **Phạt tiền chấp nhận được khi công bằng.** Người chơi chịu được phạt nếu thấy trước nguyên nhân, có lựa chọn an toàn, có đường gỡ bằng kỹ năng và thiệt hại có trần. Thanh tra của Cook, Serve, Delicious! chỉ đánh trượt khi bỏ sót từ 2 việc vặt; Papers, Please cảnh cáo 2 lỗi đầu rồi mới phạt; Theme Hospital luôn báo trước động đất; Supermarket Simulator cho tắt trộm trong Cài đặt. Phạt tốt nhất là phạt gắn với một lỗi nghề có thật.
3. **Đồ hiếm cần nguồn rõ, trần rõ và ít nhất một đường không phụ thuộc may.** Hay Day cho đồ hiếm rơi khi làm việc bình thường nhưng vẫn có đường chắc chắn; Kairosoft ghi độ hiếm bằng sao ★1–★10; Stardew giới hạn 6 món hái lượm mỗi bản đồ mỗi tuần; TCG Card Shop Simulator công khai tỉ lệ từng tầng. Đồ hiếm phải có chỗ tiêu ngay: Papa's chỉ tặng công thức mà người chơi làm được liền.
4. **Thưởng nên gắn với kỹ năng và được trình bày thành thưởng.** Vé mini-game của Papa's kiếm bằng phục vụ tốt (theo đoạn trích wiki, tối đa 3 vé mỗi ngày); Cook, Serve, Delicious! 2 cho thêm tip khi đơn hoàn hảo có kèm món phụ và nước. Rob Pardo kể cùng một phép tính, ghi "200% rồi về 100%" thì được yêu, ghi "chỉ còn 50%" thì bị ghét. Món hiếm để lấy danh tiếng và sưu tập, không để hốt tiền.
5. **Giữ chân bằng lý do quay lại, không bằng nỗi sợ hay may rủi trả tiền.** Stardew phát lại công thức cho người lỡ; My Café tự cộng thưởng quên nhận; Spiritfarer có nút "Đi an toàn" để bỏ qua sự kiện. Ngược lại, casino của Cooking Fever, giải thu phí mà đa số người chơi lỗ, nhánh thưởng phải mua vé của Cooking Diary và hối lộ trong Papers, Please là những thứ BKN không làm, vì đây là game đào tạo nhân viên.

### Mười đề xuất đáng làm nhất

| # | Đề xuất | Vì sao đáng làm | Đợt |
|---|---|---|---|
| 1 | Tip mới: 5.000đ khi khách chấm 5 sao **và** hóa đơn khách thực trả từ 20.000đ | Một con số dễ nhớ; dạy bán kèm món thứ hai; phần thưởng cũ được bù bằng danh tiếng và lượt Giỏ chợ | **M4, đang làm** |
| 2 | Tần suất "dày" có bảo hiểm và luật nhịp | Sự kiện ngày khoảng 74%, khoảng 60% số ca có tình huống (mức Vừa), không bao giờ có 2 chuyện xấu liền trên dòng thời gian chung (sự kiện ngày và tình huống trong ca xét chung) | **M4, đang làm** |
| 3 | 16 sự kiện thưởng/phạt gắn nghiệp vụ | Tiền nghi giả, chờ tiền về, kiểm tra vệ sinh an toàn thực phẩm… mỗi sự kiện là một bài học quầy, luôn có lựa chọn an toàn | **M4, đang làm** |
| 4 | Sổ tiền sự kiện trong Tổng kết ca | Người chơi thấy mỗi sự kiện lời hay lỗ bao nhiêu; ví vẫn khớp từng đồng | **M4, đang làm** |
| 5 | Kho nguyên liệu hiếm và Giỏ chợ có thanh may mắn công khai | Nguồn hiếm minh bạch, có bảo hiểm, có trần theo ngày | **M4, đang làm** |
| 6 | Phiên hàng theo giờ thật với mini-game Lựa hàng | Ba khung giờ Việt Nam; dạy nhận biết hàng thật trước khi nhận; không bao giờ về tay trắng | **M4, đang làm** |
| 7 | Khách lạ bảo đảm ở ca đầu mỗi ngày thật | Người chơi ít thời gian vẫn có hàng hiếm; đây là đường chắc chắn, không phụ thuộc may | **M4, đang làm** |
| 8 | Bốn món hiếm, mở bằng 3 mảnh công thức rồi nấu thử | Mục tiêu sưu tập mới; dạy "làm đúng một lần rồi mới đưa lên thực đơn" | **M4, đang làm** |
| 9 | Lựa chọn xanh mở bằng hiện vật đã mua | Loa báo tiền, Phiếu Chợ Sớm, Máy tính cầm tay có thêm công dụng trong sự kiện | M4 một phần, GĐ2 phần còn lại |
| 10 | Khách quen có cấp, món ruột và order mơ hồ | Luyện thẳng kỹ năng nghe, hỏi lại và xác nhận order | GĐ2 |

Đủ 26 đề xuất, cách chấm điểm và nguồn cảm hứng ở mục 5.

---

## 1. Mục đích, phạm vi và cách kiểm chứng

### 1.1 Mục đích

M4 thay đổi bốn thứ người chơi cảm nhận rõ: tip giảm còn một mức, có thêm sự kiện thưởng và phạt tiền, sự kiện xảy ra dày hơn, và có nguyên liệu cùng món hiếm. Trước khi thiết kế, nhóm xem các game đã giải bài toán tương tự ra sao để:

- không phát minh lại cái đã có, và không lặp những lỗi mà game khác đã bị người chơi chê;
- có lý do rõ cho từng luật và từng con số trong M4;
- giữ BKN đúng vai trò công cụ đào tạo: vui, nhưng không dùng cơ chế cờ bạc hay gây nghiện.

### 1.2 Phạm vi

- **62 mục nghiên cứu về 52 game hoặc nguồn khác nhau**, làm trong ba vòng. 10 game được xem hai lần với hai góc nhìn khác nhau, ví dụ Stardew Valley vừa được xem ở xe hàng rong, vừa ở vận may và sự kiện ban đêm.
  - Vòng 1 (23 mục): game nấu ăn và quản lý quán.
  - Vòng 2 (19 mục): game thu thập, đời sống, game miễn phí trên di động, mô phỏng góc nhìn thứ nhất. Trọng tâm là nguyên liệu hiếm và nhịp sự kiện.
  - Vòng 3 (20 mục): cơ chế sự kiện, phạt và xác suất, kể cả nguồn thiết kế không thuộc game nấu ăn (RimWorld, FTL, bài nói GDC 2010, cơ chế xác suất của Warcraft III và Dota 2).
- Mỗi mục ghi: thể loại, nền tảng và năm, cơ chế cốt lõi, sự kiện ngẫu nhiên, nguyên liệu hiếm và công thức, cách giữ chân người chơi, điểm hay áp dụng được, nguồn và mức tin cậy.
- **Ngoài phạm vi:** không chơi thử trực tiếp; không phân tích doanh thu thật; không lấy tên, hình ảnh hay nội dung của game nào vào BKN. Tên game chỉ xuất hiện trong tài liệu, không bao giờ xuất hiện trong game.

### 1.3 Ba mức tin cậy

| Mức | Tên | Nghĩa | Cách dùng |
|---|---|---|---|
| **A** | Đã kiểm nguồn | Người nghiên cứu mở và đọc trực tiếp trang nguồn: Wikipedia, wiki của game, trang trợ giúp chính thức, bài phỏng vấn, diễn đàn chính thức, trang Steam | Dùng làm căn cứ thiết kế |
| **B** | Chỉ đọc đoạn trích | Trang gốc không mở được (lỗi 402, bị chặn), chỉ đọc được đoạn trích trong kết quả tìm kiếm | Dùng làm gợi ý; con số cụ thể phải đo lại bằng mô phỏng của BKN trước khi dùng |
| **C** | Hiểu biết chung | Không có trang đọc được để xác nhận, chỉ là hiểu biết phổ biến trong nghề | Chỉ để tham khảo, không dựa vào để ra quyết định |

- Trong 62 mục, 61 mục đạt mức A (có ít nhất một nguồn đọc trực tiếp), 1 mục ở mức C (Fae Farm).
- Trong 194 đường dẫn, 42 đường dẫn chỉ đọc được đoạn trích; Phụ lục A ghi "(trích đoạn)" sau các đường dẫn này.
- Bảng ở mục 3 dùng thêm ký hiệu **A·B** cho dòng mà cơ chế chính đã đọc trực tiếp nhưng một vài chi tiết chỉ có qua đoạn trích.
- Dữ liệu gốc còn ghi rõ hai chi tiết mức C: bảo đảm thẻ huyền thoại trong 40 gói của Hearthstone (ở phần nguyên tắc) và hệ số nhân của Derby trong Hay Day. Cả hai không được dùng làm căn cứ.

**Kỷ luật kiểm chứng.** Khẳng định nào không tìm được nguồn thì bị bỏ, không giữ lại "cho đủ". Một số ví dụ đã ghi trong dữ liệu gốc:

- Dave the Diver: bỏ các con số về boss, rong hiếm và lặn đêm vì không tìm được nguồn.
- Cooking Fever: sửa câu "từ khoảng hạng 8 trở lên mới có lời" vì nguồn cho thấy ngược lại (người hạng 8 nhận ít hơn phí vào); sửa "thưởng chắc 30 kim cương" thành "chỉ nhận khi vượt hết 15 màn".
- FTL: bỏ câu "Medbay cấp 2 cho ít nhất 3 sự kiện thưởng chắc chắn".
- Cooking Diary: bỏ một sự kiện và một phần thưởng "điểm danh đủ 30 ngày" vì không tìm thấy nguồn.
- Potion Craft: bỏ câu "người buôn lậu ghé cuối ngày".
- Hay Day: bỏ câu "Derby được coi là động lực giữ chân" vì nguồn không nói vậy.
- Supermarket Simulator: bỏ câu "hết hàng làm nhu cầu tăng".

Các con số trong phần đề xuất của dữ liệu gốc (ví dụ "50–60% mỗi ngày") là **số thiết kế**, không lấy từ game nào. Con số cuối cùng của M4 do người dùng chốt và được đo bằng mô phỏng.

### 1.4 Liên hệ với các tài liệu khác

| Tài liệu | Vai trò |
|---|---|
| `docs/tham-khao/m4-nghien-cuu-the-loai.json` | Dữ liệu gốc của tài liệu này: 62 mục, mỗi mục có nguồn và mức tin cậy |
| `docs/tham-khao/m4-thiet-ke.md` | Bản thiết kế chi tiết M4, chỉ tới từng tệp và dòng code; mục E là đề cương của tài liệu này |
| `docs/tham-khao/m4-khao-sat-code.md` | Khảo sát code trước M4 (tip, sự kiện, chỗ cần sửa) |
| `docs/tham-khao/nghien-cuu-game-tham-khao.json` | Vòng khảo sát trước (bản 0.1) về 5 game web quản lý quán nhỏ, dùng cho bản đề xuất đầu tiên |
| `docs/tham-khao/ban-tong-hop-v0.1.md`, `phan-bien-v0.1.md` | Bản đề xuất 0.1 và bản phản biện |
| `docs/de-xuat-thiet-ke.md` | Đề xuất thiết kế tổng thể |
| `docs/can-bang.md` | Bảng số cân bằng và số đo mô phỏng |
| `docs/kien-truc.md` | Hợp đồng kỹ thuật |

### 1.5 Cách đọc tài liệu

- **Đợt:** **M4** là làm trong bản 0.4.0 hiện tại; **GĐ2** và **GĐ3** là các giai đoạn phát triển sau.
- **T** (tác động) và **C** (chi phí) chấm từ 1 đến 5. T = 5 là thay đổi cảm giác chơi rõ nhất. C = 5 là tốn công nhất: nhiều màn hình mới, nhiều test, đụng tới dữ liệu lưu của người chơi.
- **Ngày game** là một ca bán ở Chặng 1. **Ngày thật** là ngày theo lịch, đổi lúc 04:00 giờ Việt Nam.
- **Tiền** viết theo quy ước của BKN: tiền thưởng là bội 1.000đ, tiền phạt và giá vốn là bội 500đ.

---

## 2. Bản đồ 11 thể loại game mô phỏng

### 2.0 Tổng quan

| # | Thể loại | Game đã nghiên cứu | BKN giống ở đâu | Lấy gì cho BKN |
|---|---|---|---|---|
| 1 | Nấu ăn dạng chuỗi mini-game | Cooking Mama, Venba | Thớt sơ chế và 6 mini-game | Huy chương, kỷ lục, công thức mở bằng làm đúng quy trình |
| 2 | Quản lý thời gian nhà hàng | Diner Dash, Delicious, dòng Papa's, Good Pizza Great Pizza, Cooking Fever, Cooking Madness, Cooking Diary | Luồng 4 khâu, khách có kiên nhẫn | Nhịp cố định, khách đặc biệt theo lịch, thưởng gắn kỹ năng |
| 3 | Nấu theo chuỗi phím, nhịp nhanh | Cook, Serve, Delicious! 1–3 | Chấm từng bước, thiếu bước là lỗi | Sự kiện gắn nghiệp vụ, phạt có đường gỡ |
| 4 | Nấu hợp tác hỗn loạn, roguelite | Overcooked 1–2, PlateUp! | Ca ngắn, nâng cấp giữa các ngày | Người chơi tự chọn mức rủi ro |
| 5 | Mô phỏng góc nhìn thứ nhất, vật lý | Cooking Simulator, Chef Life, Cafe Owner Simulator, Supermarket Simulator, TCG Card Shop Simulator | Nghiệp vụ gần thật | Phạt có nguyên nhân vận hành, độ hiếm công khai |
| 6 | Tycoon quản lý | Kairosoft (Cafeteria Nipponica, The Ramen Sensei, Bonbon Cakery), Game Dev Tycoon, Two Point, Theme Hospital, RollerCoaster Tycoon | Kinh tế quán, danh tiếng | Ký hiệu sao độ hiếm, sự kiện hộp thoại có lựa chọn |
| 7 | Chủ tiệm kết hợp đi thu thập | Dave the Diver, Moonlighter, Recettear, Potion Craft, Battle Chef Brigade | Có thêm pha "đi lấy hàng" từ M4 | Tách pha thu thập khỏi ca bán, phạt mềm |
| 8 | Đời sống cozy, nông trại | Stardew Valley, Animal Crossing: New Horizons, Travellers Rest, Coral Island, Ooblets, Spiritfarer, Sun Haven, Fae Farm, Chef RPG | Ngày thật, điểm danh, lễ | Lịch tuần cố định, khách ghé mỗi ngày, chống cày |
| 9 | Game miễn phí có chuỗi sản xuất và LiveOps | Hay Day, Township, Cookie Run: Kingdom, Restaurant Story, My Café, dòng game idle | Việc hôm nay, Hộp thư, sự kiện có thời hạn | Nhịp sự kiện và trần theo ngày; bỏ phần thu tiền |
| 10 | Mô phỏng công việc và tự sự | Papers, Please; Coffee Talk; Reigns; FTL | Làm một công việc lặp lại mỗi ca | Nhắc trước phạt sau, lựa chọn xanh, lọc theo bối cảnh |
| 11 | Bài học về xác suất | Sid Meier và Rob Pardo (GDC 2010), PRD của Warcraft III và Dota 2, người kể chuyện của RimWorld | Tình huống trong ca, Giỏ chợ | Bảo hiểm xui, nhịp căng rồi nghỉ, cách trình bày |

**Vị trí của BKN.** Theo ước lượng của nhóm thiết kế (chỉ để định hướng), BKN nằm giữa thể loại 1 và 2: người chơi tự tay làm từng món với áp lực thời gian vừa phải. M4 bổ sung lớp sự kiện học từ thể loại 10 và 11, lớp nguyên liệu hiếm học từ thể loại 6, 7 và 8, còn phần giữ chân học từ thể loại 8 và 9 nhưng bỏ hết cơ chế thu tiền.

### 2.1 Nấu ăn dạng chuỗi mini-game

- **Định nghĩa.** Mỗi món là một chuỗi thao tác ngắn (thái, cán, khuấy, chiên), chấm điểm từng bước. Gần như không có quản lý quán.
- **Game tiêu biểu.** Cooking Mama: Cook Off có 55 công thức, hơn 300 nguyên liệu, mỗi bước là một mini-game. Venba biến nấu ăn thành câu đố: sổ công thức cũ bị rách, nhòe, người chơi phải suy luận bước còn thiếu.
- **Vòng lặp cốt lõi.** Chọn món → làm từng bước → điểm và huy chương → mở món mới.
- **Điểm mạnh.** Dạy thao tác và thứ tự bước rất rõ. Phạt tự nhiên: làm hỏng bước thì điểm thấp. Dễ cho người mới. Cooking Mama cho quà an ủi cả khi thua.
- **Điểm yếu.** Ít chiều sâu kinh tế và gần như không có sự kiện ngẫu nhiên, nên dễ lặp. Một số review cho rằng phần nấu ăn của Venba không phải lúc nào cũng khớp mạch truyện.
- **Bài học cho BKN.** Thớt của BKN đã thuộc thể loại này. Nên thêm huy chương món và kỷ lục riêng từng mini-game (đề xuất 15). Công thức hiếm mở bằng làm đúng quy trình: nấu thử ở M4, "Sổ Dì Sáu bị nhòe" ở GĐ3 (đề xuất 22). Thử sai không mất tiền.

### 2.2 Quản lý thời gian nhà hàng

- **Định nghĩa.** Phục vụ nhiều khách trong một màn hoặc một ca có giới hạn. Khách có thanh kiên nhẫn; điểm tính theo tốc độ và độ chính xác.
- **Game tiêu biểu.** Diner Dash (khách có dãy tim, mỗi loại khách một thói quen tip), Delicious (thử thách phụ tùy chọn), dòng Papa's (nhiều trạm, khách lên hạng Đồng/Bạc/Vàng), Good Pizza, Great Pizza (hơn 100 khách có tính cách, order kiểu đố mẹo), Cooking Fever, Cooking Madness, Cooking Diary.
- **Vòng lặp cốt lõi.** Chơi ca → tiền, tip, sao → nâng cấp bếp, mở món → ca khó hơn. Lớp ngoài là cốt truyện, lễ và sự kiện có thời hạn.
- **Điểm mạnh.** Gần luồng 4 khâu của BKN nhất. Có nhịp cố định rất rõ: Papa's có khách phong bì mỗi 3 ngày, khách "closer" chấm khắt khe cuối mỗi ca, bản Freezeria Deluxe có 12 lễ mỗi năm. Nhiều mẫu thưởng gắn kỹ năng: vé mini-game từ phục vụ tốt, tip theo chất lượng, thử thách phụ.
- **Điểm yếu.** Các bản miễn phí trên di động gắn nhiều cơ chế thu tiền: casino (Cooking Fever), giải thu phí mà nhiều người lỗ, nhánh thưởng phải mua vé (Cooking Diary), tiền sự kiện mất khi hết hạn.
- **Bài học cho BKN.** Lấy phần nhịp và phần thưởng kỹ năng, bỏ phần thu tiền. Tip gắn chất lượng và ngưỡng hóa đơn (Cooking Madness cho tip tối đa 20% tổng thu; tip 5.000đ trên hóa đơn từ 20.000đ tức tối đa 25%). Khách đặc biệt theo lịch; lịch lễ Việt Nam.

### 2.3 Nấu theo chuỗi phím, nhịp nhanh

- **Định nghĩa.** Mỗi món là một chuỗi phím ứng với các bước nấu. Nhịp dồn dập, nhiều món cùng lúc. Giữa các ngày, người chơi chỉnh thực đơn.
- **Game tiêu biểu.** Cook, Serve, Delicious! bản 1 (2012), bản 2 (2017), bản 3 (2020).
- **Vòng lặp cốt lõi.** Ngày bán có giờ cao điểm trưa và tối, việc vặt chen giữa các đơn → chấm từng đơn → chỉ số Buzz (độ hài lòng với quán) → chỉnh thực đơn, mua công thức và thiết bị.
- **Điểm mạnh.** Sự kiện gắn nghiệp vụ: ngày thanh tra an toàn, bỏ sót từ 2 việc vặt thì trượt; vụ cướp là việc vặt hiếm nhất, gặp sau cùng hoặc áp chót, gỡ bằng mini-game phác họa kẻ cướp theo lời tả. Ở bản 2, đơn hoàn hảo có kèm món phụ và nước thành đơn Delicious, được thêm tip. Bản 3 có chế độ Chill (ít đơn, chậm hơn, thưởng thấp hơn) cho người muốn thư thả.
- **Điểm yếu.** Độ khó cao. Bản 3 đã bỏ việc vặt bắt buộc; nhóm thiết kế hiểu đây là dấu hiệu việc vặt dễ gây mệt.
- **Bài học cho BKN.** Sự kiện phạt phải có đường gỡ bằng kỹ năng. Sự kiện nặng nên mở muộn và hiếm nhất. Ngưỡng tip 20.000đ tạo lý do bán kèm giống đơn đủ bộ. Món bán lặp nhiều ngày có thể bị "cũ" (đề xuất 21).

### 2.4 Nấu hợp tác hỗn loạn, roguelite

- **Định nghĩa.** Overcooked cho 1–4 người cùng một bếp hỗn loạn. PlateUp! là roguelite: mỗi lượt chơi ngắn và khó dần, lượt nào cũng khác, giữ lại mở khóa giữa các lượt.
- **Game tiêu biểu.** Overcooked! và Overcooked! 2; PlateUp! (2022).
- **Vòng lặp cốt lõi.** Overcooked: màn ngắn, đơn đúng được xu, 3 sao để mở màn. PlateUp!: phục vụ ban ngày → cuối ngày chọn bản vẽ thiết bị → cứ 3 ngày chọn 1 trong 2 thẻ → lượt chơi dài tối đa 15 ngày.
- **Điểm mạnh.** Biến cố gắn với màn chơi (bếp nằm trên hai xe tải, băng trơn, đổi bếp giữa chừng). Người chơi tự chọn mức rủi ro qua thẻ. Thất bại vẫn để lại tiến bộ. Phần lớn thẻ Món của PlateUp! kèm giảm khoảng 15% khách để cân khối lượng việc.
- **Điểm yếu.** Cường độ cao, đòi phối hợp nhiều người. Theo đoạn trích wiki, thẻ loại "Trick" của PlateUp! phần lớn rất tiêu cực.
- **Bài học cho BKN.** Thẻ ngày chọn 1 trong 2 (đề xuất 10). Mở món mới thì cân lại tải khách. Phạt thao tác sai bằng mất chuỗi hoặc mất thời gian thay vì trừ tiền trực tiếp.

### 2.5 Mô phỏng góc nhìn thứ nhất, vật lý

- **Định nghĩa.** Người chơi tự tay làm mọi việc trong không gian 3D: nấu bằng tương tác vật lý, nhập hàng, xếp kệ, quét mã, dọn dẹp.
- **Game tiêu biểu.** Cooking Simulator (lấy nguyên liệu khỏi kệ là bị trừ phí ngay), Chef Life (chọn hàng địa phương tốt hay hàng nhập rẻ), Cafe Owner Simulator, Supermarket Simulator (giá biến động, trộm vặt), TCG Card Shop Simulator (mở gói tìm thẻ hiếm).
- **Vòng lặp cốt lõi.** Đặt hàng, nhập hàng → vận hành trong ngày → tổng kết → mở rộng.
- **Điểm mạnh.** Gần nghiệp vụ thật: đặt hàng, giá thị trường, trộm khi khách chờ lâu, bảo trì thiết bị. TCG công khai độ hiếm nhiều tầng.
- **Điểm yếu.** Dễ lặp khi hết mục tiêu. Cafe Owner Simulator được khoảng 65% đánh giá tích cực trên Steam; người chơi chê "trang trí xong, lên cấp 10 thì không còn gì làm", và thuê nhân viên làm hết việc thì mất vòng lặp chính. Review Chef Life chê lặp lại, cứng nhắc. Cộng đồng Supermarket Simulator chia rẽ về việc thêm việc vặt.
- **Bài học cho BKN.** Phạt phải có nguyên nhân vận hành và tắt được cho người mới (mức Ít). Không để tự động hóa làm thay 4 khâu. Lời chê "lặp lại" là lý do chính đáng để BKN tăng tần suất sự kiện.

### 2.6 Tycoon quản lý

- **Định nghĩa.** Nhìn từ trên xuống, quản lý chỉ số, nhân viên, công trình. Người chơi ra quyết định, không tự tay làm từng món.
- **Game tiêu biểu.** Kairosoft: Cafeteria Nipponica (nguyên liệu ★1–★10, săn nguyên liệu 4 lần mỗi năm), The Ramen Sensei (khách tặng quà khi được ăn đúng món thích), Bonbon Cakery (tìm combo bằng thử kết hợp). Game Dev Tycoon, Two Point Hospital và Two Point Campus, Theme Hospital, RollerCoaster Tycoon.
- **Vòng lặp cốt lõi.** Đầu tư → chỉ số → doanh thu → mở rộng; sự kiện theo lịch (thi đấu tháng 6 và tháng 12) và sự kiện dạng hộp thoại.
- **Điểm mạnh.** Kinh tế rõ ràng. Nhiều mẫu sự kiện tốt: cấp cứu của Two Point thưởng theo số người chữa được; động đất của Theme Hospital luôn được báo trước; trời mưa trong RollerCoaster Tycoon làm khách chịu mua dù tới 20$ thay vì khoảng 5$, tức sự kiện xấu kèm cơ hội.
- **Điểm yếu.** Sự kiện hộp thoại dễ thành "vô dụng": diễn đàn Game Dev Tycoon chê gần như lúc nào cũng có một lựa chọn đúng, hệ quả chỉ wiki mới nói, có sự kiện chỉ tốn tiền mà không được gì, sự kiện bật sai lúc.
- **Bài học cho BKN.** Món hiếm = món nền + 1 nguyên liệu hiếm + 1 bước bếp mới. Sự kiện xấu nên kèm cơ hội. Mỗi lựa chọn hiện rõ hệ quả. Tình huống dạy nhận biết lừa đảo (Game Dev Tycoon có email đòi "phí xác minh" rồi hiện dòng "thuế cả tin").

### 2.7 Chủ tiệm kết hợp đi thu thập

- **Định nghĩa.** Hai pha tách rời: đi lấy hàng (lặn biển, vào hầm ngục, săn nguyên liệu) và bán hàng hoặc nấu.
- **Game tiêu biểu.** Dave the Diver (ngày lặn bắt cá, tối bán sushi), Moonlighter (tự đặt giá, đọc biểu cảm khách), Recettear (trả nợ theo đợt, bảng tin chợ), Potion Craft (thương nhân có chuyên môn), Battle Chef Brigade (săn nguyên liệu rồi nấu trước giám khảo).
- **Vòng lặp cốt lõi.** Thu thập → chế biến hoặc định giá → bán → nâng cấp để thu thập tốt hơn.
- **Điểm mạnh.** Đạo diễn Dave the Diver nói việc tách hai pha "thật sự tạo khác biệt", vì người chơi không tập trung cùng lúc vào cả bắt cá lẫn quản lý quán. Phạt mềm: hết oxy vẫn giữ được 1 món. Khách VIP buộc đi tìm nguyên liệu cụ thể nhưng "không phá việc người chơi đang làm".
- **Điểm yếu.** Định giá dễ nông: một bài phân tích chỉ ra định giá trong Moonlighter "không cần suy nghĩ nhiều". Phạt lớn cần lưới an toàn: Recettear mất tiệm nếu không trả đủ nợ, dù chơi lại vẫn giữ cấp và đồ.
- **Bài học cho BKN.** Phiên hàng và Lựa hàng là pha "đi lấy hàng" riêng, nằm ngoài ca bán. Lựa hàng luôn cho ít nhất 1 phần. Mỗi người bán có bảng hàng riêng. Bảng tin chợ (đề xuất 14) và định giá món hiếm (đề xuất 24) để sau.

### 2.8 Đời sống cozy, nông trại

- **Định nghĩa.** Nhịp chậm theo ngày và mùa (Animal Crossing chạy theo giờ thật), nhiều hoạt động nhỏ, gắn bó với nhân vật, ít áp lực thua.
- **Game tiêu biểu.** Stardew Valley, Animal Crossing: New Horizons (viết tắt ACNH), Travellers Rest, Coral Island, Ooblets, Spiritfarer, Sun Haven, Fae Farm, Chef RPG.
- **Vòng lặp cốt lõi.** Mỗi ngày làm việc nhỏ → thu hoạch, nấu, bán → kết bạn, mở công thức. Mỗi tuần có khách ghé, xe hàng rong, chương trình TV. Mỗi mùa có lễ.
- **Điểm mạnh.** Đây là nhóm làm hay nhất việc kết hợp lịch cố định với nội dung ngẫu nhiên: xe hàng rong của Stardew ghé thứ Sáu và Chủ nhật với 10 món ngẫu nhiên; ACNH có 3 khách chắc chắn mỗi tuần và 2 khách luân phiên; chương trình nấu ăn của Stardew phát lại vào thứ Tư. Chống cày bằng trần theo tuần. Phần lớn sự kiện đêm của Stardew có lợi. Sự kiện của Spiritfarer an toàn tuyệt đối và bỏ qua được.
- **Điểm yếu.** Nhiều hệ thống chồng nhau, dài hơi. Chạy theo giờ thật thì phải chống chỉnh lùi giờ máy (ACNH cho củ cải hỏng khi lùi giờ).
- **Bài học cho BKN.** Phiên hàng theo giờ thật và khách lạ mỗi ngày. Hàng thật và hàng giả để dạy kiểm hàng. Không phạt người vắng mặt. Khách VIP báo trước, danh tiếng ×2 (Travellers Rest). Mảnh công thức (Ooblets ghép 4 mảnh).

### 2.9 Game miễn phí có chuỗi sản xuất và LiveOps

- **Định nghĩa.** Game miễn phí trên di động, sống nhờ sự kiện chạy liên tục (LiveOps): sản xuất có hẹn giờ, đơn hàng, hội nhóm, sự kiện có thời hạn.
- **Game tiêu biểu.** Hay Day, Township, Cookie Run: Kingdom, Restaurant Story, My Café, dòng game idle (tự chạy khi tắt máy) như Idle Restaurant Tycoon.
- **Vòng lặp cốt lõi.** Sản xuất theo giờ → giao đơn → nâng kho, mở rộng → sự kiện tuần hoặc lễ.
- **Điểm mạnh.** Nhịp sự kiện rõ: Township chạy sự kiện 7–10 ngày rồi nghỉ khoảng 2 tuần; My Café có lễ hội mỗi cuối tuần. Trần theo ngày: tối đa 8 đơn sở thú mỗi ngày (Township), 1 hộp miễn phí mỗi ngày (Hay Day). Đồ hiếm rơi khi làm việc bình thường và có đường chắc chắn. Cookie Run: Kingdom thưởng dồi dào để người ít thời gian không bị chặn. Theo số liệu Deconstructor of Fun dẫn lại, Hay Day từng có tỉ lệ người chơi hằng ngày trên hằng tháng tới 55%.
- **Điểm yếu.** Nhiều cơ chế thu tiền gây tranh cãi: hộp bí ẩn mở bằng kim cương, vòng quay may mắn, dùng tiền cao cấp để cứu món hỏng (Restaurant Story), thông báo đẩy gọi người chơi quay lại, thu nhập tự chạy thay cho thao tác.
- **Bài học cho BKN.** Lấy nhịp và trần, không lấy cơ chế thu tiền. Công thức phải làm một lần mới được bán (My Café). Quên nhận thưởng thì tự cộng. Machinations cảnh báo: thưởng quá ít thì không ai quay lại, thưởng quá nhiều thì phần thưởng mất giá.

### 2.10 Mô phỏng công việc và tự sự

- **Định nghĩa.** Mô phỏng một công việc lặp lại (kiểm giấy tờ, pha đồ uống, ra quyết định) và kể chuyện qua lựa chọn.
- **Game tiêu biểu.** Papers, Please (nhân viên kiểm tra giấy tờ, áp lực tiền nuôi gia đình), Coffee Talk (pha đồ uống 3 nguyên liệu theo đúng thứ tự), Reigns (quyết định hai phía bằng lá bài), FTL (sự kiện văn bản có lựa chọn).
- **Vòng lặp cốt lõi.** Nhận một "ca" → xử lý từng người, từng lá bài hay từng sự kiện → hệ quả về tiền, chỉ số, câu chuyện.
- **Điểm mạnh.** Papers, Please phạt leo thang nhưng nhắc trước (2 lỗi đầu mỗi ngày chỉ cảnh cáo) và có bảng thu chi cuối ngày. Coffee Talk cho order ngày càng mơ hồ ở chế độ Thử thách. Reigns lọc lá bài theo trạng thái vương quốc. FTL có "lựa chọn xanh" mở bằng trang bị.
- **Điểm yếu.** Papers, Please có hối lộ và áp lực tiền bạc nặng, không hợp game đào tạo. Trong Reigns, chỉ số nào về 0 hoặc đầy tràn là vua chết, tức thua rất gắt.
- **Bài học cho BKN.** Nhắc trước, phạt sau. Lựa chọn xanh. Lọc sự kiện theo bối cảnh. Order mơ hồ để luyện hỏi lại. Không đưa hối lộ vào game.

### 2.11 Bài học về xác suất

- **Định nghĩa.** Không phải một thể loại mà là nhóm nguồn thiết kế về cách người chơi cảm nhận may rủi.
- **Nguồn tiêu biểu.** Sid Meier và Rob Pardo (bài nói tại GDC 2010); phân phối giả ngẫu nhiên (PRD) của Warcraft III và Dota 2; ba "người kể chuyện" của RimWorld (Cassandra, Phoebe, Randy).
- **Nội dung chính.**
  - Người chơi coi lợi thế 3:1 (thắng 75%) như chắc thắng; ở 2:1 họ chấp nhận thỉnh thoảng thua nhưng thua liên tiếp thì bực. Sid Meier phải chỉnh công thức có tính tới các trận trước.
  - PRD: xác suất lần thứ n là C × n, trượt thì cộng thêm C, trúng thì về lại từ đầu. Với tỉ lệ danh nghĩa 25% thì C khoảng 8,47%, chắc chắn xảy ra trong khoảng 12 lần, trung bình dài hạn vẫn 25%.
  - RimWorld: Cassandra chạy chu kỳ "căng" 4,6 ngày rồi "nghỉ" 6 ngày, hai biến cố lớn cách nhau ít nhất 1,9 ngày; Phoebe nghỉ dài; Randy dồn dập nhưng nếu 13 ngày chưa có biến cố lớn thì biến cố kế tiếp bắt buộc là biến cố lớn.
- **Điểm mạnh.** Giảm cả chuỗi may lẫn chuỗi xui mà không đổi trung bình. Cho phép chọn nhịp chơi tách khỏi độ khó.
- **Điểm yếu.** Nếu giấu kín, người chơi không hiểu vì sao; PRD không có công thức đóng, phải tính lặp.
- **Bài học cho BKN.** Có bảo hiểm xui cho mọi nguồn quan trọng. Ba mức Ít, Vừa, Nhiều khác nhau về nhịp chứ không chỉ về xác suất. Không để hai chuyện xấu liền nhau. Bộ đếm được lưu trong dữ liệu lưu để kết quả tái lập khi tải lại trang.

---

## 3. Bảng tra cứu: game, cơ chế và cách áp dụng

Mỗi dòng chỉ ghi cơ chế có trong dữ liệu gốc. Cột "Thể loại" dùng số thứ tự ở mục 2. Cột "Tin cậy" dùng ký hiệu ở mục 1.3. Cột "Nguồn chính" ghi một nguồn; danh sách đầy đủ ở Phụ lục A. Số trong ngoặc như "(đề xuất 15)" chỉ tới bảng ở mục 5.

| # | Game | Thể loại | Cơ chế nổi bật | Áp dụng cho Bếp Khởi Nghiệp | Tin cậy | Nguồn chính |
|---|---|---|---|---|---|---|
| 1 | Cooking Mama: Cook Off | 1 | Mỗi bước là một mini-game; huy chương vàng, bạc, đồng theo điểm trung bình; công thức mới mở khi làm xong món trước; thua vẫn có quà an ủi | Huy chương món và kỷ lục từng mini-game Thớt (đề xuất 15); thua thử thách vẫn có quà nhỏ | A·B | [Wikipedia](https://en.wikipedia.org/wiki/Cooking_Mama:_Cook_Off) |
| 2 | Venba | 1 | Sổ công thức cũ bị rách, nhòe; người chơi suy luận thứ tự và kỹ thuật còn thiếu | "Sổ Dì Sáu bị nhòe": điền đúng thứ tự bước để mở món hiếm, thử sai không mất tiền (đề xuất 22) | A·B | [Wikipedia](https://en.wikipedia.org/wiki/Venba_%28video_game%29) |
| 3 | Diner Dash | 2 | Dãy tim tâm trạng giảm khi chờ; thưởng chuỗi hành động cùng loại; mỗi loại khách một mức kiên nhẫn và thói quen tip | Ngưỡng tip 20.000đ tự tạo khác biệt giữa nhóm khách gọi ít và gọi nhiều | A·B | [Wikipedia](https://en.wikipedia.org/wiki/Diner_Dash) |
| 4 | Delicious (dòng Emily) | 2 | Tim 1–5, khách vui để lại tip; thử thách phụ tùy chọn; chú chuột Carl trốn trong cả 80 màn, chỉ kêu chít khẽ rồi biến mất | Chuyện bất ngờ nhỏ không cắt ngang thao tác; thử thách phụ mỗi ca (đề xuất 16) | A | [GameHouse](https://www.gamehouse.com/blog/2025/01/delicious-emily-the-first-course-gh/) |
| 5 | Papa's: phong bì và closer | 2 | Cứ 3 ngày có khách mang phong bì công thức; nhà phát triển xác nhận khách chỉ mang công thức người chơi làm được ngay; khách closer cuối ca chấm khắt khe | Mảnh công thức chỉ rơi cho món đã có món nền; nhịp cố định với nội dung ngẫu nhiên | A·B | [Steam, nhà phát triển trả lời](https://steamcommunity.com/app/3259470/discussions/0/4634862878162250270/) |
| 6 | Papa's: vé mini-game và lễ | 2 | Vé kiếm từ phục vụ tốt, tối đa 3 vé mỗi ngày, giải hiếm theo mốc 14/28/42 lần thắng; Freezeria Deluxe có 12 lễ, mỗi lễ có nguyên liệu riêng | Vé kỹ năng cuối ca (đề xuất 17); lịch lễ Việt Nam (đề xuất 13) | B | [Wiki Mini-Games (trích đoạn)](https://fliplinestudios.fandom.com/wiki/Mini-Games) |
| 7 | Good Pizza, Great Pizza: khách | 2 | Hơn 100 khách có tính cách; order kiểu đố mẹo, được hỏi lại một lần; làm sai phải hoàn tiền; khách không đủ tiền để người chơi tự quyết | Order mơ hồ (đề xuất 12); khách thiếu tiền và ghi nợ có cái giá rõ | A | [Wikipedia](https://en.wikipedia.org/wiki/Good_Pizza,_Great_Pizza) |
| 8 | Good Pizza, Great Pizza: bảng lãi | 2 | Lãi cuối ngày có dòng hoàn tiền và sửa chữa riêng; tiền thuê giảm khi điểm đánh giá cao | Dòng "Sự kiện" riêng trong Tổng kết ca (đề xuất 4) | B | [Wiki Profit (trích đoạn)](https://good-pizza-great-pizza.fandom.com/wiki/Profit) |
| 9 | Cooking Fever: casino, điểm danh | 2 | Casino mở từ cấp 7, trúng 15 gems hai lần mỗi ngày; từ ngày điểm danh thứ 7 mỗi ngày được 2 gems | Phản mẫu: không đưa vòng quay hay cược vào game đào tạo (mục 6) | A·B | [Noodle Arcade](https://noodlearcade.com/cooking-fever-how-get-more-gems) |
| 10 | Cooking Fever: giải đấu | 2 | Phí vào 20.000 xu và 20 kim cương, chỉ top 10 có thưởng; một người hạng 8 chỉ nhận 10 kim cương | Chỉ làm thử thách tự đấu, không thu phí (mục 6) | A | [Wiki Tournament](https://cookingfever.fandom.com/wiki/Cooking_Fever_Tournament) |
| 11 | Cooking Madness | 2 | Combo từ 3 khách; tip tối đa 20% tổng thu; có cách cứu vãn sau khi thua (thêm khách, thêm giờ); nhà hàng theo lễ | Tip có trần theo hóa đơn; bị phạt vẫn có đường gỡ | A | [Trợ giúp chính thức](https://zenjoy.helpshift.com/hc/en/3-cooking-madness-kitchen-frenzy/section/19-gameplay/) |
| 12 | Cooking Diary | 2 | Sự kiện xe bán đồ ăn có lộ trình và tiền riêng, hết sự kiện thì tiền mất; lộ trình thưởng có nhánh phải mua vé | Xe đẩy lưu động (đề xuất 25); tiền sự kiện dư được quy đổi; không có nhánh trả phí | A | [Trợ giúp MYTONA](https://mytona.helpshift.com/hc/en/5-cooking-diary/faq/339-what-s-the-food-truck/) |
| 13 | Cook, Serve, Delicious! bản 1 | 3 | Cướp hoàn toàn ngẫu nhiên, hiếm nhất, gặp sau cùng hoặc áp chót, gỡ bằng mini-game phác họa; thanh tra trượt khi bỏ sót từ 2 việc vặt; món bán lặp bị "cũ" | Sự kiện phạt có đường gỡ; kiểm tra vệ sinh an toàn thực phẩm; món bán lặp (đề xuất 21) | A·B | [Steam](https://steamcommunity.com/app/247020/discussions/0/810938082206738443) |
| 14 | Cook, Serve, Delicious! 2 | 3 | Đơn hoàn hảo kèm món phụ và nước thành đơn Delicious, thêm tip; ngày không có đơn kém là Ngày hoàn hảo | Ngưỡng tip khuyến khích bán kèm; huy chương ca (đề xuất 15) | A·B | [Wikipedia](https://en.wikipedia.org/wiki/Cook,_Serve,_Delicious!_2) |
| 15 | Cook, Serve, Delicious! 3 | 3 | Xe bán đồ ăn qua nhiều điểm dừng; chế độ Chill; món làm sẵn mất tươi dần, đèn giữ nóng kéo dài độ tươi | Mức Ít cho người mới; xe đẩy lưu động (đề xuất 25); hạn dùng (đề xuất 19) | A·B | [Wikipedia](https://en.wikipedia.org/wiki/Cook,_Serve,_Delicious!_3) |
| 16 | Overcooked! 1–2 | 4 | Bếp đổi giữa màn (xe tải, băng trơn, đổi bếp giữa chừng); tip nhân tối đa ×4 khi giao đúng thứ tự | Sự kiện ngày đổi thiết bị (Cúp điện theo lịch); phạt thao tác sai bằng mất chuỗi | A·B | [Wikipedia](https://en.wikipedia.org/wiki/Overcooked_2) |
| 17 | PlateUp! | 4 | Cứ 3 ngày chọn 1 trong 2 thẻ làm lượt khó hơn; phần lớn thẻ Món kèm giảm khoảng 15% khách; giữ mở khóa giữa các lượt | Thẻ ngày chọn 1 trong 2 (đề xuất 10); mở món thì cân lại tải khách | A·B | [Wikipedia](https://en.wikipedia.org/wiki/PlateUp!) |
| 18 | Cooking Simulator | 5 | Lấy nguyên liệu khỏi kệ là trừ phí ngay; có chế độ tự do và trường dạy nấu | Nấu thử món hiếm không tiêu hao kho, luyện trước khi bán thật | A | [Wikipedia](https://en.wikipedia.org/wiki/Cooking_Simulator) |
| 19 | Chef Life | 5 | Chọn hàng địa phương tốt hay hàng nhập rẻ; món nấu đủ nhiều thì nâng cấp; khách đặc biệt ghé không báo trước; review chê lặp lại | Khách lạ; lý do tăng tần suất sự kiện | A | [Gaming Nexus](https://www.gamingnexus.com/Article/11794/Chef-Life-A-Restaurant-Simulator/) |
| 20 | Cafe Owner Simulator | 5 | Nhiều việc vận hành (hóa đơn, bảo trì, côn trùng, kiểm tra phòng cháy); khoảng 65% đánh giá tích cực; bị chê hết việc sau cấp 10 và mất vòng lặp khi thuê người làm hết | Không để tự động hóa làm thay 4 khâu; sự kiện kiểm tra phải báo trước và phòng được | A | [Steam, thảo luận](https://steamcommunity.com/app/1498140/discussions/0/3722818378188148301/) |
| 21 | Supermarket Simulator | 5 | Trộm xuất hiện khi đông và khách chờ lâu ở quầy; tắt trộm được trong Cài đặt; cộng đồng chia rẽ về việc vặt | Phạt có nguyên nhân vận hành; mức Ít không có sự kiện phạt | A·B | [Steam](https://store.steampowered.com/app/2670630/Supermarket_Simulator/) |
| 22 | TCG Card Shop Simulator | 5 | Độ hiếm nhiều tầng; lần kiểm "lấp lánh" riêng tỉ lệ 1/20; gói hiếm bảo đảm thẻ cuối là thẻ hiếm | Sao độ hiếm công khai; Lựa hàng luôn được ít nhất 1 phần | A | [Treyex Gaming](https://www.treyexgaming.com/tcg-card-shop-simulator-card-rarity-probabilities-guide/) |
| 23 | Cafeteria Nipponica | 6 | Nguyên liệu ★1–★10; săn nguyên liệu 4 lần mỗi năm, phí 200 đến 80.000 yên theo điểm; món = món gốc + nguyên liệu, chỉ số Nghiên cứu của đầu bếp phải đủ tổng số sao; đầy thanh tìm kiếm thì có rương báu | Sao cho 5 nguyên liệu hiếm; món hiếm = món nền + nguyên liệu hiếm + 1 bước; bảo hiểm dạng thanh đầy | A·B | [Kairosoft wiki](https://kairosoft.wiki.gg/wiki/Ingredients_%28Cafeteria_Nipponica%29) |
| 24 | The Ramen Sensei | 6 | Khách được ăn đúng kiểu mì thích nhiều lần thì tặng quà; quán đối thủ làm giảm độ nổi tiếng; thi đấu tháng 6 và 12 | Khách quen tặng nguyên liệu hiếm (đề xuất 12); xe đối thủ (đề xuất 20) | A | [Kairosoft wiki](https://kairosoft.wiki.gg/wiki/Transcript:Manual_%28The_Ramen_Sensei%29) |
| 25 | Bonbon Cakery | 6 | Khoảng 20 combo đặt tên và 73 combo xếp đúng thứ tự; bánh nền hiếm chỉ bán 1 bộ sau lần đầu làm ra | Combo biến tấu (đề xuất 23); giới hạn tích trữ hàng hiếm | A | [Kairosoft wiki](https://kairosoft.wiki.gg/wiki/Combos_%28Bonbon_Cakery%29) |
| 26 | Game Dev Tycoon | 6 | Email lừa đảo đòi "phí xác minh", trả thì hiện dòng "thuế cả tin"; bị chê sự kiện luôn có một đáp án đúng, hệ quả không nói rõ, bật sai lúc | Tình huống dạy nhận biết lừa đảo; mỗi lựa chọn hiện hệ quả; lọc theo bối cảnh | A·B | [Diễn đàn chính thức](https://forum.greenheartgames.com/t/most-random-events-are-useless/6058) |
| 27 | Two Point Hospital và Campus | 6 | Cấp cứu: chữa từ một nửa trở lên thì thưởng, dưới một nửa chỉ mất danh tiếng; mỗi VIP soi một mảng; mục tiêu ngẫu nhiên tùy chọn, không hạn chót | Nhà phê bình báo trước mảng chú ý (đề xuất 11); thử thách phụ (đề xuất 16) | A·B | [GameFAQs](https://gamefaqs.gamespot.com/pc/230622-two-point-hospital/faqs/76595/vip-visits) |
| 28 | Theme Hospital | 6 | Động đất luôn có cảnh báo; dịch bệnh: khai báo sớm (mất ít nhưng chắc) hay che giấu (có rủi ro); VIP được nhận hoặc từ chối | Sự kiện thiệt hại lớn phải báo trước; mẫu "mất ít nhưng chắc" làm lựa chọn an toàn | A | [StrategyWiki](https://strategywiki.org/wiki/Theme_Hospital/Events) |
| 29 | RollerCoaster Tycoon | 6 | Về tác động chỉ có "mưa hay không mưa"; lúc mưa khách trả tới 20$ cho dù thay vì khoảng 5$ | Sự kiện bất lợi kèm cơ hội; hiện vật mua trước giảm thiệt hại (Bạt che mưa) | A | [Out of Games](https://outof.games/realms/rollercoastertycoon/guides/536-guide-to-climate-weather-and-temperature-in-rollercoaster-tycoon-1-2/) |
| 30 | Dave the Diver | 7 | Tách ngày lặn và tối bán; hết oxy vẫn giữ 1 món; VIP cần nguyên liệu cụ thể, thành công mở cơ chế mới; bản đồ vẽ tay dùng lại, chỉ đồ trên ô cố định là ngẫu nhiên | Phiên hàng tách khỏi ca bán; Lựa hàng không bao giờ về tay trắng; kệ hàng cố định, xáo vị trí | A | [Game Developer](https://www.gamedeveloper.com/design/dave-the-diver) |
| 31 | Moonlighter | 7 | Tự đặt giá, khách phản ứng 4 mức; món đang được chuộng bán đắt hơn mà khách vẫn vui | Định giá món hiếm theo phản ứng khách (đề xuất 24) | A | [Wikipedia](https://en.wikipedia.org/wiki/Moonlighter_%28video_game%29) |
| 32 | Recettear | 7 | Trả nợ theo đợt; bảng tin chợ có 4 loại tin, tin "bùng nổ" chỉ kéo khách chứ không đổi giá; thua vẫn giữ cấp và đồ | Bảng tin chợ sáng (đề xuất 14), nói rõ hiệu ứng có cộng dồn hay không | A·B | [Wikipedia](https://en.wikipedia.org/wiki/Recettear:_An_Item_Shop%27s_Tale) |
| 33 | Potion Craft | 7 | Thương nhân có chuyên môn (thảo dược, đá quý, nấm); vườn thu 1 lần mỗi ngày; có loại thảo dược mọc ít hơn hẳn | Mỗi phiên hàng một người bán với bảng hàng riêng; chậu rau thu 1 lần mỗi ngày (đề xuất 19) | A | [Wiki Merchants](https://potion-craft.fandom.com/wiki/Category:Merchants) |
| 34 | Battle Chef Brigade | 7 | Hai pha: săn nguyên liệu quanh bếp rồi nấu; giám khảo có khẩu vị riêng, nguyên liệu chủ đề bắt buộc | Tách kiếm nguyên liệu khỏi bán hàng; hội thi trong hẻm | A·B | [Wikipedia](https://en.wikipedia.org/wiki/Battle_Chef_Brigade) |
| 35 | Stardew Valley: xe hàng rong, công thức | 8 | Xe hàng rong thứ Sáu và Chủ nhật, 10 món ngẫu nhiên số lượng giới hạn; TV dạy 1 công thức mỗi Chủ nhật, thứ Tư phát lại ưu tiên món chưa biết; trần 6 món hái lượm mỗi bản đồ mỗi tuần | Phiên hàng theo lịch cố định; radio công thức có phát lại (đề xuất 18); trần theo ngày | A | [Stardew wiki](https://stardewvalleywiki.com/Traveling_Cart) |
| 36 | Stardew Valley: sự kiện đêm, vận may | 8 | Mỗi đêm bốc 1 sự kiện, phần lớn có lợi (Tiên mùa màng 1%, Thiên thạch 1%, Viên nang lạ 0,8% và chỉ 1 lần mỗi bản lưu); vận may ngày báo qua TV | Tầng sự kiện siêu hiếm để có chuyện kể; vận quán hôm nay (đề xuất 21) | A | [Stardew wiki](https://stardewvalleywiki.com/Random_Events) |
| 37 | ACNH: khách đặc biệt | 8 | Ngày thường nào cũng có khách ghé: 3 người chắc chắn mỗi tuần, 2 ngày còn lại luân phiên; theo quan sát cộng đồng, người chưa ghé có tỉ lệ cao hơn tuần sau | Khách lạ bảo đảm mỗi ngày thật; bảo hiểm cho nhân vật luân phiên | A | [Nintendo Wire](https://nintendowire.com/guides/animal-crossing-new-horizons/special-visitor-appearance-rates/) |
| 38 | ACNH: củ cải, mảnh sao, hàng giả | 8 | Củ cải hỏng sau một tuần và khi lùi giờ; mảnh sao 85/5/10%; người bán tranh bày 4 món, 90% lượt có ít nhất 1 món thật, mỗi người mua 1 món mỗi ngày | Lựa hàng dạy nhận biết hàng thật, lượt nào cũng có hàng thật; khóa khi lùi giờ máy | A | [Nookipedia](https://nookipedia.com/wiki/Forgery) |
| 39 | Travellers Rest | 8 | Xu hướng đổi thứ Hai, xem trước 2 tuần, món thịnh hành tối đa +20%; VIP báo trước 1 ngày, danh tiếng ×2; mất danh tiếng vì bẩn, nóng, lạnh, thiếu sáng, khách quậy | Nhà phê bình (đề xuất 11); món được chuộng tuần (đề xuất 14); bù tip bằng danh tiếng | A | [Travellers Rest wiki](https://travellersrest.wiki.gg/wiki/Very_Important_Guest) |
| 40 | Ooblets | 8 | Ghép 4 mảnh ra 1 công thức; 3 việc mỗi ngày thưởng tăng dần 5, 10, 20; biến thể "lấp lánh" hiếm | Mảnh công thức (M4 dùng 3 mảnh rồi nấu thử) | A | [TheGamer](https://www.thegamer.com/ooblets-unlock-recipe-guide/) |
| 41 | Spiritfarer | 8 | Sự kiện trên biển là mini-game khoảng 90 giây, an toàn tuyệt đối; nút "Đi an toàn" bỏ qua mọi sự kiện | Lựa hàng không phạt, lỡ khung không mất gì; mỗi phiên hàng gắn một nhân vật | A | [Wiki Events](https://spiritfarer.fandom.com/wiki/Events) |
| 42 | Coral Island | 8 | Mỗi thứ Ba giảm 10% cho 1 dụng cụ bếp chọn ngẫu nhiên, báo qua TV | Giảm giá tuần cho nâng cấp: sự kiện tốt, rẻ công | A | [Coral Island wiki](https://coralisland.wiki/wiki/Socket_Electronics) |
| 43 | Sun Haven | 8 | 15 trạm nấu; nấu ra phụ phẩm "đồ thừa" bán được nửa giá | Nâng cấp mở nhóm món; cách xử lý đồ làm dư | A | [Sun Haven wiki](https://sunhaven.wiki.gg/wiki/Cooking) |
| 44 | Fae Farm | 8 | Khám phá nguyên liệu mới là mở thêm công thức; hạt giống khóa theo cấp | Lần đầu có nguyên liệu hiếm thì gợi ý "món bí mật" trong Sổ công thức | C | [TechRaptor](https://techraptor.net/gaming/guides/fae-farm-cooking-guide) |
| 45 | Chef RPG | 8 | Mùa đông gần như hết đồ hái lượm; tự động nấu cho chất lượng ngẫu nhiên; đã mở ca thì không rời quán được | Gắn nguyên liệu hiếm với sự kiện thời tiết (dự trữ) | A | [Steam](https://store.steampowered.com/app/1796790/Chef_RPG/) |
| 46 | Hay Day | 9 | Chuỗi sản xuất tự dạy (gà cho trứng, trứng làm bánh); 1 hộp bí ẩn miễn phí mỗi ngày; vật liệu hiếm rơi khi làm việc thường và có đường chắc chắn; Derby tuần, mỗi mốc được chọn 1 trong 3 quà | Khách lạ là đường chắc chắn; quà theo mốc cho chọn; tuần lễ chủ đề (đề xuất 26) | A | [Hay Day wiki](https://hayday.fandom.com/wiki/Supplies) |
| 47 | Township | 9 | Sự kiện 7–10 ngày rồi nghỉ khoảng 2 tuần; mini-game sự kiện 1–2 phút; tối đa 8 đơn sở thú mỗi ngày | Nhịp lễ; trần số lần mỗi ngày cho nguồn hiếm | A | [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2020/10/13/how-playrix-township-became-a-billion-dollar-game) |
| 48 | Cookie Run: Kingdom | 9 | Luôn có 2 sự kiện cơ bản chạy song song (3 ngày và 7 ngày); thưởng dồi dào nên người ít thời gian hiếm khi thiếu thể lực | Người chơi 1 ca mỗi ngày vẫn có hàng hiếm nhờ khách lạ | A·B | [Naavik](https://naavik.co/game-deconstruction/cookie-run-kingdom/) |
| 49 | Restaurant Story | 9 | Món hỏng nếu quá giờ, cứu bằng tiền cao cấp; khách đặc biệt làm rơi nguyên liệu cho công thức đặc biệt; tip hàng xóm tối đa 6 lần mỗi ngày | Khách lạ tặng nguyên liệu hiếm; trần mỗi ngày | A·B | [Gamezebo](https://www.gamezebo.com/walkthroughs/restaurant-story-walkthrough/) |
| 50 | My Café | 9 | Công thức phải làm một lần mới bán được; gợi ý công thức từ lời khách; lễ hội mỗi cuối tuần; quên nhận thưởng thì tự cộng | Nấu thử đạt hạng Được mới mở món hiếm; gợi ý qua lời khách | A·B | [Mejoress](https://www.mejoress.com/recipes-my-cafe-recipes-stories-full/) |
| 51 | Idle Restaurant Tycoon và dòng idle | 9 | Vẫn kiếm tiền khi tắt game (có giới hạn); bài của Machinations: thưởng quá nhiều thì mất giá | Không để game tự chạy thay thao tác; tăng tần suất thì giảm độ lớn | A·B | [Machinations](https://machinations.io/articles/idle-games-and-how-to-design-them) |
| 52 | Papers, Please | 10 | 2 lỗi đầu mỗi ngày chỉ cảnh cáo, sau đó phạt 5, 5, 10, 15…; cuối ngày chia tiền cho gia đình; có hối lộ | Nhắc trước phạt sau (kiểm tra vệ sinh lần đầu chỉ nhắc); không đưa hối lộ | A·B | [Wikipedia](https://en.wikipedia.org/wiki/Papers,_Please) |
| 53 | Coffee Talk | 10 | Pha 3 nguyên liệu theo đúng thứ tự; order ngày càng mơ hồ ở chế độ Thử thách; bỏ tối đa 5 ly mỗi ngày | Order mơ hồ (đề xuất 12); giới hạn làm lại | A | [Wikipedia](https://en.wikipedia.org/wiki/Coffee_Talk_%28video_game%29) |
| 54 | Reigns | 10 | "Cái túi co giãn": lá không hợp trạng thái bị loại, lá còn lại có trọng số; khó phân biệt lá ngẫu nhiên với lá có kịch bản | Mỗi sự kiện khai báo điều kiện; icon hệ quả trên từng lựa chọn | A | [Game Developer](https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i-) |
| 55 | FTL | 10 | "Lựa chọn xanh" chỉ mở khi có trang bị phù hợp, thường tốt hơn nhưng không phải lúc nào cũng thắng | Lựa chọn xanh bằng Loa báo tiền, Phiếu Chợ Sớm, Máy tính cầm tay (đề xuất 9) | B | [Wiki Blue Options (trích đoạn)](https://ftl.fandom.com/wiki/Blue_Options) |
| 56 | RimWorld | 11 | Cassandra căng 4,6 ngày, nghỉ 6 ngày, hai biến cố lớn cách nhau ít nhất 1,9 ngày; Randy: 13 ngày chưa có biến cố lớn thì bắt buộc có | Ba mức tần suất khác nhau về nhịp; không 2 chuyện xấu liền; bảo hiểm cho sự kiện ngày | A | [RimWorld wiki](https://rimworldwiki.com/wiki/AI_Storytellers) |
| 57 | Sid Meier và Rob Pardo | 11 | Người chơi coi 3:1 là chắc thắng; "200% rồi về 100%" được yêu hơn "chỉ còn 50%"; Blizzard tăng dần tỉ lệ rớt vật phẩm nhiệm vụ tới 100% | Ghi luật tip theo hướng thưởng; bảo hiểm xui cho Giỏ chợ | A | [Shacknews](https://www.shacknews.com/article/62807/sid-meier-and-rob-pardo) |
| 58 | Warcraft III và Dota 2 (PRD) | 11 | Xác suất lần n bằng C × n; 25% thì C khoảng 8,47%, chắc chắn trong khoảng 12 lần; giảm cả chuỗi may lẫn chuỗi xui | Giỏ chợ: 2 lượt không ra nguyên liệu thì lượt 3 chắc chắn có | A | [Liquipedia](https://liquipedia.net/dota2/Pseudo_Random_Distribution) |

---

## 4. Mười lăm nguyên tắc thiết kế

Mười lăm nguyên tắc dưới đây hợp nhất phần "nguyên tắc thiết kế" của ba vòng nghiên cứu. Mỗi nguyên tắc có ba phần: nội dung, bằng chứng từ game, và cách BKN áp dụng (ghi rõ phần nào đang làm ở M4).

### Nhóm A. Sự kiện ngẫu nhiên

**Nguyên tắc 1. Chia sự kiện thành ba tầng.**
- *Nội dung.* Tầng 1: chuyện nhỏ gần như ca nào cũng có. Tầng 2: sự kiện vừa, khoảng hơn một nửa số ngày. Tầng 3: chuyện lớn theo lịch, hoặc chuyện rất hiếm chỉ để có cái mà kể.
- *Bằng chứng.* ACNH lấp cả 5 ngày thường bằng khách đặc biệt. Stardew có sự kiện đêm 0,5–1% (Tiên mùa màng 1%, Thiên thạch 1%, Viên nang lạ 0,8% và chỉ 1 lần mỗi bản lưu). Cook, Serve, Delicious! để vụ cướp là loại hiếm nhất, gặp sau cùng hoặc áp chót.
- *Ở BKN.* **M4:** tầng 1 là tình huống trong ca (khoảng 60% số ca ở mức Vừa, tối đa 2 tình huống mỗi ca), khách lạ mỗi ngày thật và phiên hàng; tầng 2 là sự kiện ngày (khoảng 74% số ngày game); tầng 3 là sự kiện lễ (Tri ân 20/11) và hai sự kiện kiểm tra cách nhau ít nhất 7 ngày game. Tầng siêu hiếm để GĐ2.

**Nguyên tắc 2. Ngẫu nhiên nằm trong một nhịp cố định.**
- *Nội dung.* Chuyện lớn đến theo lịch đoán được; chỉ nội dung bên trong mới bốc ngẫu nhiên. Người chơi có cái để chờ mà vẫn thấy bất ngờ.
- *Bằng chứng.* Papa's (phong bì mỗi 3 ngày, closer mỗi ngày); PlateUp! (thẻ mỗi 3 ngày, ngày trang trí mỗi 5 ngày); Kairosoft (săn nguyên liệu tháng 1, 4, 7, 10); My Café (lễ hội cuối tuần); Stardew (xe hàng rong thứ Sáu và Chủ nhật, bên trong là 10 món ngẫu nhiên); Travellers Rest (xu hướng đổi mỗi thứ Hai, xem trước 2 tuần).
- *Ở BKN.* **M4:** ba phiên hàng có khung giờ cố định mỗi ngày (Chợ sớm 05:00–09:00, Xe ba gác trưa 11:00–13:30, Gánh đặc sản tối 17:30–21:00), mỗi người bán có mặt hàng cố định, vị trí trên kệ mới xáo ngẫu nhiên. Khách lạ chắc chắn ghé ca đầu mỗi ngày thật, chỉ vị trí trong hàng chờ là ngẫu nhiên. Sự kiện ngày được báo trước ở Tổng kết ca hôm trước.

**Nguyên tắc 3. Mỗi sự kiện là một quyết định thật, đúng bối cảnh, luôn có lối thoát an toàn.**
- *Nội dung.* Sự kiện hay buộc người chơi đổi quyết định, không chỉ nhân số khách. Không có đáp án đúng tuyệt đối, hệ quả hiện ngay trong game, không bật sai bối cảnh. Luôn có một lựa chọn an toàn. Hiện vật đã mua mở "lựa chọn xanh": thường tốt hơn, nhưng không phải lúc nào cũng thắng.
- *Bằng chứng.* Game Dev Tycoon bị chê vì "gần như luôn có một lựa chọn đúng", "chỉ wiki mới nói sự kiện làm gì", và sự kiện bật giữa lúc đang làm hợp đồng. Reigns loại lá bài không hợp trạng thái. FTL có lựa chọn xanh. RollerCoaster Tycoon cho trời mưa đi kèm cơ hội bán dù. Theme Hospital đặt "khai báo sớm, mất ít nhưng chắc" cạnh "tự xoay xở, có rủi ro".
- *Ở BKN.* **M4:** mỗi sự kiện khai báo điều kiện (cần QR, cần đã bán ít nhất 3 phần, cần kho còn chỗ…); lựa chọn an toàn đánh dấu rõ; tình huống "Shipper nói khách chuyển rồi" có dòng "Nhờ có Loa…" khi đã mua Loa báo tiền; mẫu Bạt che mưa được nhân rộng. Trong 4 sự kiện ngày cũ có 2 cái chỉ nhân số; M4 đổi Ngày lãnh lương thành "khách hay gọi thêm món" để gắn với bài học bán kèm.

### Nhóm B. Tần suất và bảo hiểm xui

**Nguyên tắc 4. Bảo hiểm xui phải có và phải công khai.**
- *Nội dung.* Sau N lần trượt thì lần kế chắc chắn trúng (bảo hiểm cứng), hoặc tỉ lệ tăng dần sau mỗi lần trượt (bảo hiểm mềm). Người chơi phải thấy được bộ đếm; bảo hiểm giấu kín dễ làm mất niềm tin.
- *Bằng chứng.* Randy của RimWorld (13 ngày); PRD của Dota 2; Blizzard tăng dần tỉ lệ rớt vật phẩm nhiệm vụ tới 100%; Kairosoft đầy thanh tìm kiếm thì chắc chắn có rương; Papa's cho giải hiếm theo mốc 14/28/42 lần thắng; ACNH (theo quan sát cộng đồng) tăng tỉ lệ cho khách chưa ghé.
- *Ở BKN.* **M4:** sự kiện ngày: 1 ngày game trống thì ngày kế chắc chắn có. Tình huống trong ca: mức Vừa 2 ca liền trống thì ca sau chắc chắn có, mức Nhiều sau 1 ca, mức Ít sau 3 ca. Giỏ chợ: 2 lượt liền không ra nguyên liệu thì lượt thứ 3 chắc chắn có, thanh "may mắn" hiện công khai. Mảnh công thức: 3 lần liền không ra thì lần sau chắc chắn có. Bộ đếm lưu trong dữ liệu lưu nên tải lại trang không đổi kết quả.

**Nguyên tắc 5. Chuyện tốt chiếm đa số, có nhịp căng rồi nghỉ, không hai chuyện xấu liền.**
- *Nội dung.* Sau một chuyện xấu phải có khoảng nghỉ. Ba mức cài đặt nên khác nhau về nhịp, không chỉ về xác suất: Ít giống Phoebe (nghỉ dài, chỉ chuyện tốt), Vừa giống Cassandra (căng rồi nghỉ), Nhiều giống Randy (dồn dập nhưng có bảo hiểm).
- *Bằng chứng.* Cassandra: căng 4,6 ngày, nghỉ 6 ngày, hai biến cố lớn cách nhau ít nhất 1,9 ngày. Phoebe: căng 8 ngày, nghỉ 8 ngày. Phần lớn sự kiện đêm của Stardew có lợi. Sid Meier: thua liên tiếp làm người chơi bực, phải tính tới các lần trước.
- *Ở BKN.* **M4:** không có 2 sự kiện xấu liền nhau, xét trên dòng thời gian chung của sự kiện ngày và tình huống trong ca (tình huống xấu cuối ca không đứng liền sự kiện ngày xấu của ca sau và ngược lại); lần trước là loại xấu hoặc lỗ từ 50% trần trở lên thì lần sau chỉ bốc loại tốt hoặc loại chọn không có phạt; ngày có sự kiện ngày loại xấu thì tình huống trong ca không bốc loại xấu; hai tình huống trong cùng ca cách nhau ít nhất 2 khách và không cùng là loại xấu; Trật tự đô thị và Kiểm tra vệ sinh an toàn thực phẩm cách nhau ít nhất 7 ngày game; sự kiện xấu chỉ xuất hiện từ ngày game 5. Theo bản thiết kế, tỉ lệ bốc tình huống ở mức Vừa là tốt 44,6%, chọn 42,9%, xấu 12,5%.

**Nguyên tắc 6. Tăng tần suất thì giảm độ lớn mỗi lần, và có trần cả hai chiều.**
- *Nội dung.* Nhiều sự kiện hơn mà mỗi lần vẫn thưởng lớn thì phần thưởng mất giá. Mỗi sự kiện và mỗi ngày đều cần trần cho cả tiền phạt lẫn tiền thưởng.
- *Bằng chứng.* Machinations: thưởng quá nhiều thì tài nguyên mất giá. Restaurant Story: tip hàng xóm tối đa 6 lần mỗi ngày. Cooking Fever: casino 2 lần mỗi ngày. My Café: 3 đơn gọi điện mỗi 12 giờ. Township: tối đa 8 đơn sở thú mỗi ngày.
- *Ở BKN.* **M4:**
  - Thiệt hại mỗi sự kiện không quá 10% doanh thu dự kiến của ca và không quá một nửa thu nhập tham chiếu của ca.
  - Tiền thưởng mỗi sự kiện không quá 15% doanh thu dự kiến và không quá 0,75 thu nhập tham chiếu.
  - Mỗi ngày thật: tổng phạt và tổng thưởng từ sự kiện, mỗi thứ không quá 1 lần thu nhập tham chiếu.
  - Kỳ vọng tiền của mỗi sự kiện từ 0 tới hơi dương. Tổng thưởng ngoài bán hàng giữ mục tiêu 20–30%, trần 35% mỗi ngày thật (xem `docs/can-bang.md`).

### Nhóm C. Phạt và thưởng công bằng

**Nguyên tắc 7. Phạt công bằng cần sáu điều kiện, và nhắc trước khi phạt.**
- *Nội dung.* (1) Có nguyên nhân người chơi hiểu và phòng được, hoặc được báo trước. (2) Luôn có lựa chọn an toàn. (3) Có đường gỡ bằng kỹ năng. (4) Có trần thiệt hại. (5) Gắn với một lỗi nghề có thật. (6) Lần đầu chỉ nhắc, lần sau mới phạt.
- *Bằng chứng.* Cook, Serve, Delicious! (cướp gỡ bằng mini-game phác họa; thanh tra trượt khi bỏ sót việc vặt). Papers, Please (2 lỗi đầu mỗi ngày chỉ cảnh cáo, sau đó phạt 5, 5, 10, 15…). Travellers Rest (mất danh tiếng vì bẩn, nóng, lạnh, thiếu sáng, khách quậy). Supermarket Simulator (trộm khi khách chờ lâu; tắt được). Theme Hospital (động đất luôn báo trước). Two Point (cấp cứu chữa được dưới một nửa thì mất danh tiếng; từ một nửa trở lên thì có thưởng).
- *Ở BKN.* **M4:** chỉ mức Vừa và Nhiều có sự kiện phạt; mức Ít không có. Kiểm tra vệ sinh an toàn thực phẩm: lần đầu có lỗi chỉ bị nhắc nhở, lỗi lần 2 trong 14 ngày game mới bị phạt. Trật tự đô thị có lựa chọn "Thu gọn" an toàn. Tờ tiền nghi giả có lựa chọn "Soi kỹ rồi mới nhận". Tình huống có bài học riêng mở thẻ Mẹo nghề (Tiền nghi giả: "Soi tiền trước khi thối"; Người giao hàng: "Thấy tiền về mới giao món"); Bình gas hết chỉ ghi bài học "để sẵn bình gas dự phòng" ngay trong tình huống, không có thẻ riêng.

**Nguyên tắc 8. Thưởng gắn với kỹ năng hơn là với may rủi.**
- *Nội dung.* Phần thưởng nên đến từ việc làm tốt. Yếu tố may nếu có thì nằm trong mini-game kỹ năng và có trần.
- *Bằng chứng.* Vé mini-game của Papa's kiếm từ phục vụ tốt. Tip của Overcooked nhân tối đa ×4 khi giao đúng thứ tự. Chuỗi của Diner Dash. Tip của Good Pizza dựa trên tốc độ và độ chính xác. Đơn Delicious của Cook, Serve, Delicious! 2. Ngược lại, casino của Cooking Fever có trần nhưng vẫn là cờ bạc.
- *Ở BKN.* **M4:** tip chỉ khi khách chấm 5 sao. Lựa hàng cho thêm hàng theo điểm (từ 90 điểm thêm 1 phần; từ 75 điểm có 50% được 1 mảnh). Khách lạ tặng quà theo số sao. Hội thi "Xe đẩy sạch, ngon" chấm theo sao trung bình của ca, không bốc thăm. Chuỗi Quầy chuẩn 5 khách được 1 lượt Giỏ chợ.

**Nguyên tắc 9. Trình bày thành thưởng và nói rõ bằng chữ.**
- *Nội dung.* Cùng một phép tính, cách nói "được thêm" dễ chịu hơn "bị bớt". Hệ quả phải hiện rõ; hiệu ứng có cộng dồn hay không cũng phải nói rõ.
- *Bằng chứng.* Rob Pardo: kinh nghiệm "nghỉ ngơi" bị ghét khi ghi "chơi lâu chỉ còn 50%", được yêu khi ghi "mới vào được 200%, sau đó về 100%". Sid Meier: người chơi cảm nhận xác suất lệch về phía có lợi cho mình. Reigns hiện icon những thứ sẽ đổi. Cộng đồng Recettear phải tự đoán hiệu ứng tăng giá có cộng dồn không vì game không nói rõ.
- *Ở BKN.* **M4:** luật tip ghi "Hóa đơn từ 20.000đ, khách vui (5 sao) sẽ bỏ hũ tip 5.000đ", không ghi "đã bỏ tip 10.000đ". Phiếu chấm ghi "Tip 0 (hóa đơn dưới 20.000đ)" khi khách 5 sao mà chưa đủ ngưỡng. Mỗi lựa chọn trong tình huống hiện nhãn tiền, phạt, hàng hiếm hoặc mảnh. Tỉ lệ Giỏ chợ và hai mức bảo hiểm ghi công khai ở thẻ Kho hàng hiếm (màn Chuẩn bị) và trong Túi đồ (Chợ Công Thức).

### Nhóm D. Nguyên liệu và công thức hiếm

**Nguyên tắc 10. Nguyên liệu hiếm phải đủ năm thứ: nguồn, ký hiệu độ hiếm, cái giá, chỗ tiêu và giới hạn tích trữ.**
- *Bằng chứng.* Kairosoft ghi sao ★1–★10 và thu phí săn từ 200 đến 80.000 yên tùy điểm. Papa's chỉ đưa công thức làm được ngay. Bonbon Cakery chỉ bán 1 bộ bánh nền hiếm sau lần đầu. ACNH công khai tỉ lệ mảnh sao 85/5/10%. TCG Card Shop Simulator có lần kiểm lấp lánh riêng 1/20. Stardew có trần 6 món hái lượm mỗi bản đồ mỗi tuần.
- *Ở BKN.* **M4:**
  - *Nguồn:* phiên hàng, khách lạ, Giỏ chợ và 3 tình huống trong ca.
  - *Ký hiệu:* 5 nguyên liệu có sao và quê gốc. ★1: Trứng gà ta, Muối tôm Tây Ninh. ★2: Mật ong rừng U Minh, Khô mực Phan Thiết, Cà phê hạt Buôn Ma Thuột.
  - *Cái giá:* phải lựa đúng hàng, phải phục vụ tốt khách lạ; người bán dạo lấy tiền cho món hàng đã biết trước.
  - *Chỗ tiêu:* món hiếm; mỗi phần món tiêu hao nguyên liệu hiếm lúc Ra món (bỏ món hay làm lại bước thì không mất).
  - *Giới hạn:* kho tối đa 6 phần mỗi loại (dư thì đổi Muỗng Vàng); mỗi ngày thật nhận tối đa 6 phần và 3 mảnh, tính mọi nguồn trừ phần tự bỏ tiền mua.

**Nguyên tắc 11. Công thức hiếm đi theo nhịp khám phá rồi thành thạo.**
- *Bằng chứng.* My Café: công thức phải làm một lần mới được bán. Papa's: khách phong bì chấm khắt khe (theo đoạn trích, cần từ 80%), phục vụ món đặc biệt cho 5 khách thì có thưởng. Ooblets: ghép mảnh. Bonbon Cakery: tìm combo bằng thử. Cafeteria Nipponica: chỉ số Nghiên cứu của đầu bếp phải đủ tổng số sao. Venba: phục dựng công thức thất truyền.
- *Ở BKN.* **M4:** gom đủ 3 mảnh rồi nấu thử; đạt hạng Được trở lên thì mở món. Nấu thử được lặp không giới hạn cho tới khi mở và không tiêu hao kho. Mảnh chỉ rơi cho món đã có món nền, ưu tiên món đang gom dở. Sổ công thức hiện kiểu "Mảnh 2/3 · Cần Bánh tráng trộn". Thư phiên bản 0.4.0 tặng sẵn 1 mảnh và 1 phần mật ong để làm quen.

**Nguyên tắc 12. Món hiếm để lấy danh tiếng và sưu tập, không để hốt tiền; luôn có một đường không phụ thuộc may.**
- *Bằng chứng.* Travellers Rest chỉ cho món thịnh hành tăng tối đa 20% và thưởng danh tiếng cho món mới. Cookie Run: Kingdom thưởng dồi dào để người ít thời gian không bị chặn. Hay Day có đường chắc chắn song song với rớt ngẫu nhiên. Stardew có sách dạy lại toàn bộ công thức của chương trình nấu ăn.
- *Ở BKN.* **M4:** món hiếm theo quy tắc "món ngang giá trị" (lãi mỗi giây nấu không vượt món Tiền quán tốt nhất quá 10%). Mỗi phần đạt Ngon trở lên được +1 danh tiếng. Món hiếm không tính vào điều kiện "3 công thức" để lên chặng. Khách lạ là đường chắc chắn mỗi ngày thật. Giá trị quy đổi của hàng hiếm được tính vào ngân sách thưởng ngoài bán hàng (trần 35%).

### Nhóm E. Giữ chân không gây sợ bỏ lỡ

**Nguyên tắc 13. Vắng mặt không bị mất trắng; sự kiện theo giờ thật chỉ có thưởng.**
- *Bằng chứng.* Chương trình nấu ăn của Stardew phát lại vào thứ Tư, ưu tiên món người chơi chưa biết. My Café tự cộng thưởng quên nhận khi giải sau bắt đầu. Tiền sự kiện xe bán đồ ăn của Cooking Diary mất khi hết sự kiện: mẫu dễ gây ức chế. Bài viết trên Game Developer phê phán game lạm dụng nỗi sợ bỏ lỡ.
- *Ở BKN.* **M4:** lỡ một khung phiên hàng không bị phạt gì. Nguyên liệu hiếm không hết hạn ở M4. Phiên hàng bị khóa (không phạt) khi giờ máy bị lùi, giống điểm danh. Không gửi thông báo đẩy. Tem dư vẫn được quy đổi như cũ.

**Nguyên tắc 14. Không cắt ngang thao tác chính, không thêm việc vặt, cho phép bỏ qua.**
- *Bằng chứng.* Chú chuột Carl của Delicious chỉ kêu chít khẽ. VIP của Dave the Diver "không phá việc người chơi đang làm". Spiritfarer có "Đi an toàn". Cộng đồng Supermarket Simulator ngại thêm việc lặp. Cafe Owner Simulator bị chê khi tự động hóa làm hết việc. Cook, Serve, Delicious! 3 bỏ việc vặt bắt buộc.
- *Ở BKN.* **M4:** tình huống chỉ bật giữa hai khách, không chen vào mini-game. Lựa hàng chỉ làm ở màn Chuẩn bị, không làm trong ca. Mức Ít dành cho người chỉ muốn luyện 4 khâu. Không có chế độ tự động làm thay người chơi.

### Nhóm F. Đạo đức

**Nguyên tắc 15. Chốt đạo đức cho một game đào tạo.**
1. Không lootbox; không bán nguyên liệu, công thức hay lượt bốc bằng tiền thật hoặc tiền trong game. Người bán dạo chỉ bán món hàng biết trước.
2. Không cờ bạc, vé số, bốc thăm trúng thưởng; không giải thu phí vào.
3. Không hối lộ, không "bôi trơn" trong sự kiện kiểm tra.
4. Vắng mặt không bị mất trắng: quy đổi, tự cộng, phát lại.
5. Sự kiện theo giờ thật chỉ có thưởng; không thông báo đẩy ép chơi.
6. Tình huống tiêu cực phải dạy đúng nghiệp vụ bán hàng (nhận biết tiền giả, chờ tiền về rồi mới giao món, kiểm hàng trước khi nhận, đặt cọc đơn lớn) và mở Mẹo nghề tương ứng. Với tiền giả chỉ nêu dấu hiệu nhận biết, không mô tả cách làm.
7. Tỉ lệ và trần được công khai trong game.
8. Không nêu tên thương hiệu thật (ngân hàng, ví điện tử, ứng dụng giao hàng, mạng xã hội).

---

## 5. Hai mươi sáu đề xuất xếp hạng theo tác động và chi phí

### 5.1 Bảng xếp hạng

- Số thứ tự giống bảng ở mục E của `docs/tham-khao/m4-thiet-ke.md` để tiện đối chiếu.
- Đợt M4 giữ thứ tự của bản thiết kế; GĐ2 và GĐ3 xếp theo tác động giảm dần, rồi chi phí tăng dần.
- Cột **T/C** là tác động chia chi phí: càng lớn thì càng đáng làm sớm.
- Số tiền và tỉ lệ ở các dòng M4 là quyết định hiện tại của người dùng; số đo cuối cùng nằm ở `docs/can-bang.md`.

| # | Đề xuất | Mô tả | T | C | T/C | Đợt | Cảm hứng |
|---|---|---|---|---|---|---|---|
| 1 | Luật tip mới, bù bằng danh tiếng và Giỏ chợ | Tip 5.000đ duy nhất khi khách chấm 5 sao và hóa đơn khách thực trả từ 20.000đ; bỏ mức 10.000đ. Khách khó tính chấm 5 sao được +1 danh tiếng, chuỗi Quầy chuẩn 5 khách được 1 lượt Giỏ chợ, Ngày lãnh lương đổi thành "khách gọi thêm món". | 4 | 1 | 4,0 | **M4, đang làm** | Rob Pardo; Cook, Serve, Delicious! 2 (đơn đủ bộ); Good Pizza; Cooking Madness (tip có trần); Travellers Rest |
| 2 | Tần suất "dày" ba tầng, bảo hiểm, luật nhịp | Sự kiện ngày 65%, 1 ngày trống thì ngày kế chắc chắn có (thực khoảng 74%). Tình huống tối đa 2 mỗi ca: Vừa 55% và 30%, Nhiều 75% và 45%, Ít 30% chỉ loại tốt; không 2 chuyện xấu liền, hai tình huống cách nhau ít nhất 2 khách. | 5 | 2 | 2,5 | **M4, đang làm** | RimWorld; PRD của Dota 2; ACNH; Stardew |
| 3 | 16 sự kiện thưởng/phạt gắn nghiệp vụ | 8 sự kiện ngày và 8 tình huống trong ca, chạy theo dữ liệu; sự kiện nào cũng có lựa chọn an toàn, trần thiệt hại và một bài học quầy (danh sách ở mục 5.3). | 5 | 3 | 1,7 | **M4, đang làm** | Cook, Serve, Delicious! (thanh tra); Papers, Please; Theme Hospital; Supermarket Simulator; RollerCoaster Tycoon; Game Dev Tycoon (bài học ngược) |
| 4 | Sổ tiền sự kiện; 4 thẻ Mẹo nghề mới | Tổng kết ca có dòng "Tiền từ sự kiện" và "Phạt, chi sự kiện", ví vẫn khớp từng đồng. Thêm thẻ về soi tiền, chờ tiền về, kiểm hàng và giữ lối đi vỉa hè. | 3 | 1 | 3,0 | **M4, đang làm** | Papers, Please; Good Pizza (bảng lãi) |
| 5 | Kho nguyên liệu hiếm, Giỏ chợ, thanh may mắn | 5 nguyên liệu có sao ★. Giỏ chợ ra nguyên liệu 40%, ra mảnh 60%; 2 lượt không ra nguyên liệu thì lượt 3 chắc chắn có. Kho tối đa 6 phần mỗi loại; mỗi ngày thật tối đa 6 phần và 3 mảnh. | 4 | 3 | 1,3 | **M4, đang làm** | Kairosoft (★); Hay Day; TCG Card Shop Simulator; PRD của Dota 2 |
| 6 | Phiên hàng theo giờ thật và Lựa hàng | Chợ sớm 05:00–09:00, Xe ba gác trưa 11:00–13:30, Gánh đặc sản tối 17:30–21:00; mỗi khung 1 lượt mỗi ngày thật. Mini-game Lựa hàng dạy nhận biết hàng thật, luôn được ít nhất 1 phần. | 4 | 3 | 1,3 | **M4, đang làm** | Stardew (xe hàng rong); Potion Craft; ACNH (hàng giả); Spiritfarer; Dave the Diver |
| 7 | Khách lạ bảo đảm mỗi ngày | Từ ngày game 3, ca đầu mỗi ngày thật có 1 khách lạ từ một vùng quê. Chấm 5 sao tặng 2 phần hàng hiếm, 4 sao tặng 1 phần, 3 sao tặng 1 mảnh, dưới 3 sao chỉ cảm ơn, không phạt. | 4 | 2 | 2,0 | **M4, đang làm** | ACNH (khách đặc biệt); Restaurant Story; Chef Life; Hay Day (đường chắc chắn) |
| 8 | 4 công thức hiếm | Trà tắc mật ong rừng, Bánh mì trứng gà ta, Bánh tráng trộn Tây Ninh, Cà phê muối; mở bằng 3 mảnh rồi nấu thử đạt hạng Được. Mỗi phần tiêu hao nguyên liệu hiếm, số phần bán được chốt lúc mở ca. | 4 | 3 | 1,3 | **M4, đang làm** | Ooblets (ghép mảnh); My Café; Papa's (phong bì); Venba |
| 9 | Lựa chọn xanh mở bằng hiện vật | Hiện vật đã mua mở lựa chọn tốt hơn trong sự kiện: Loa báo tiền (xác nhận chuyển khoản ngay), Phiếu Chợ Sớm (gợi ý khi tắc lên giá), Máy tính cầm tay. | 3 | 1 | 3,0 | M4 một phần, GĐ2 phần còn lại | FTL |
| 10 | Thẻ ngày: chọn 1 trong 2 mỗi 3 ngày | Cứ 3 ngày game người chơi chọn một thẻ, ví dụ đông khách hơn để đổi lấy lượt Giỏ chợ; có thẻ "Bình thường" cho người đang học. | 4 | 3 | 1,3 | GĐ2 | PlateUp! |
| 11 | Nhà phê bình hoặc VIP báo trước | Báo trước ở Tổng kết hôm trước, danh tiếng ×2 trong ca; đạt thì treo biển khen, trượt chỉ mất cơ hội, không trừ tiền. | 4 | 3 | 1,3 | GĐ2 | Papa's (nhà phê bình); Travellers Rest; Two Point |
| 12 | Khách quen có cấp, món ruột, order mơ hồ | Khách quen lên Đồng, Bạc, Vàng khi được phục vụ đúng món ruột; một số khách gọi món mơ hồ để luyện hỏi lại và xác nhận order. | 4 | 3 | 1,3 | GĐ2 | The Ramen Sensei; Papa's; Coffee Talk; Good Pizza |
| 13 | Lịch lễ Việt có nguyên liệu mùa | Mở rộng mô hình Tri ân 20/11 thành lịch lễ (Trung thu, Tết, 8/3, 1/6, Vu Lan…), mỗi lễ có một nguyên liệu mùa và một món. | 4 | 4 | 1,0 | GĐ2 | Papa's Freezeria Deluxe; Township |
| 14 | Bảng tin chợ sáng, món được chuộng tuần | Hai dòng tin tăng hoặc giảm giá (biên độ nhỏ, không cộng dồn) hoặc "món đang hot" chỉ tăng số khách gọi; món được chuộng tuần xem trước được. | 3 | 2 | 1,5 | GĐ2 | Recettear; Travellers Rest; Moonlighter |
| 15 | Huy chương món và ca, kỷ lục mini-game | Huy chương đồng, bạc, vàng cho món và cho ca; kỷ lục riêng từng mini-game Thớt để người chơi tự luyện. | 3 | 2 | 1,5 | GĐ2 | Cooking Mama; Cook, Serve, Delicious! 2 |
| 16 | Thử thách phụ mỗi ca | Một thử thách tùy chọn (ví dụ thối tiền đúng 5 khách liền); xong thì có vé hoặc nguyên liệu, không làm thì không sao. | 3 | 2 | 1,5 | GĐ2 | Delicious; Two Point Campus |
| 18 | Radio công thức hằng tuần có phát lại | Chủ nhật phát 1 công thức hoặc 1 mảnh, thứ Tư phát lại, ưu tiên món người chơi chưa có; không ai mất món vĩnh viễn. | 3 | 2 | 1,5 | GĐ2 | Stardew (chương trình nấu ăn) |
| 19 | Hạn dùng nguyên liệu hiếm; chậu rau sau xe | Xem xét hạn dùng khi đã đủ nguồn; chậu rau sau xe thu 1 lần mỗi ngày thật, thỉnh thoảng mọc cây hiếm. | 3 | 2 | 1,5 | GĐ2 | ACNH (củ cải); Potion Craft; Good Pizza |
| 17 | Vé kỹ năng cuối ca | Khách 5 sao cho vé, tối đa 3 vé mỗi ca, đổi lượt mini-game Thớt đặc biệt; có quà chắc chắn theo mốc số lần thắng. | 3 | 3 | 1,0 | GĐ2 | Papa's (mini-game đổi vé) |
| 20 | Đối thủ mở xe đối diện 3 ngày | Khách giảm trong 3 ngày game; gỡ bằng chất lượng phục vụ; thắng thì được danh tiếng. | 3 | 3 | 1,0 | GĐ2 | Good Pizza; The Ramen Sensei |
| 21 | Món bán lặp bị "cũ"; vận quán hôm nay | Món bán liền nhiều ngày giảm sức hút nhẹ; màn Chuẩn bị báo vận may 5 mức bằng lời Dì Sáu, chỉ chỉnh nhẹ tỉ lệ. | 2 | 2 | 1,0 | GĐ2 | Cook, Serve, Delicious!; Stardew (vận may) |
| 22 | Sổ Dì Sáu bị nhòe | Nhặt mảnh trang công thức, điền đúng thứ tự bước bị nhòe để mở món; thử sai không mất tiền; dạy quy trình chuẩn. | 4 | 4 | 1,0 | GĐ3 | Venba |
| 25 | Xe đẩy lưu động theo điểm dừng | Sự kiện có thời hạn qua Cổng trường, Bến xe, Chợ đêm, mỗi điểm một luật khách; tiền sự kiện dư được quy đổi. | 4 | 5 | 0,8 | GĐ3 | Cooking Diary (xe bán đồ ăn); Cook, Serve, Delicious! 3 |
| 24 | Định giá món hiếm theo phản ứng khách | Người chơi tự đặt giá món hiếm và đọc 4 mức biểu cảm; giá đúng đổi theo loại khách và thời tiết. | 3 | 3 | 1,0 | GĐ3 | Moonlighter |
| 23 | Combo biến tấu | Món nền cộng 1–2 nguyên liệu hiếm; hợp vị thì ra biến tấu mới, ghi vào Sổ công thức. | 3 | 4 | 0,8 | GĐ3 | Bonbon Cakery; Cafeteria Nipponica |
| 26 | Tuần lễ chủ đề, xếp hạng với "phường ảo" | Mỗi tuần một chủ đề với nhiệm vụ nhẹ; so với các quán ảo cùng trình, không thu phí, không xuống quá 1 hạng. | 3 | 4 | 0,8 | GĐ3 | Hay Day (Derby); My Café |

**Nhóm "làm ngay" (T/C từ 2,5):** 1, 4, 9, 2. **Nhóm "đáng làm" (T/C từ 1,5):** 7, 3, 14, 15, 16, 18, 19. Những đề xuất còn lại cần nhiều công hơn hoặc phụ thuộc hệ thống khác.

### 5.2 Đợt M4: quyết định nào lấy cảm hứng từ đâu

| Quyết định M4 | Bài học (nguyên tắc) | Game tham khảo |
|---|---|---|
| Tip 5.000đ khi khách 5 sao và hóa đơn thực trả từ 20.000đ; bỏ mức 10.000đ | Thưởng gắn kỹ năng (8); trình bày thành thưởng (9) | Cook, Serve, Delicious! 2 (đơn đủ bộ được thêm tip); Good Pizza (tip theo chất lượng); Cooking Madness (tip tối đa 20% tổng thu); Rob Pardo |
| Khách khó tính và món Không tì vết thưởng danh tiếng; chuỗi Quầy chuẩn thưởng lượt Giỏ chợ | Bù cảm giác được thưởng qua kênh khác tiền (8, 12) | Travellers Rest (thưởng danh tiếng); Hay Day (thưởng bằng vật phẩm) |
| Ngày lãnh lương: khách gọi thêm món, không nhân tip | Luật một con số; sự kiện đổi quyết định (3, 9) | Cook, Serve, Delicious! 2 (bán kèm) |
| Sự kiện ngày 65% cộng bảo hiểm sau 1 ngày trống (khoảng 74%) | Ba tầng (1); bảo hiểm (4) | RimWorld (Randy); PRD; ACNH (ngày nào cũng có người ghé); Chef Life (bị chê lặp) |
| Không trùng loại hôm trước; hai sự kiện kiểm tra cách nhau ít nhất 7 ngày game | Nhịp căng rồi nghỉ (5) | RimWorld (Cassandra: khoảng cách tối thiểu) |
| Tình huống tối đa 2 mỗi ca, cách nhau ít nhất 2 khách, lần 2 chỉ khi ca từ 6 khách | Không cắt ngang (14); tăng tần suất có trần (6) | Delicious (chuột Carl); Dave the Diver (VIP không phá việc đang làm) |
| Mức Ít: 30%, tối đa 1 tình huống, chỉ loại tốt, không phạt | Bảo vệ người mới (5, 7) | RimWorld (Phoebe); Supermarket Simulator (tắt trộm); Cook, Serve, Delicious! 3 (Chill) |
| Không 2 chuyện xấu liền; lỗ từ 50% trần thì lần sau chỉ loại tốt hoặc không phạt | Tốt chiếm đa số (5) | RimWorld; Sid Meier (bù chuỗi thua); Stardew (sự kiện đêm phần lớn có lợi) |
| Trần thiệt hại và trần thưởng mỗi sự kiện, trần mỗi ngày thật | Có trần hai chiều (6) | Machinations; Restaurant Story; Township |
| Sổ tiền sự kiện trong Tổng kết ca | Nói rõ hệ quả (9) | Papers, Please (bảng thu chi); Good Pizza (bảng lãi) |
| Kiểm tra vệ sinh an toàn thực phẩm: lần đầu chỉ nhắc | Nhắc trước, phạt sau (7) | Papers, Please; Cook, Serve, Delicious! (thanh tra); Two Point (thanh tra) |
| Phiên hàng 3 khung giờ thật, khóa khi lùi giờ, lỡ không sao | Nhịp cố định (2); không sợ bỏ lỡ (13) | Stardew (xe hàng rong); Potion Craft (thương nhân chuyên môn); ACNH (khóa khi lùi giờ) |
| Lựa hàng: hàng hiếm lẫn hàng thường dễ nhầm, luôn được 1 phần | Phạt mềm; dạy nghiệp vụ (7, 15) | ACNH (hàng giả, ít nhất 1 món thật); Dave the Diver (hết oxy vẫn giữ 1 món); Spiritfarer |
| Khách lạ ở ca đầu mỗi ngày thật từ ngày game 3 | Đường không phụ thuộc may (12) | ACNH; Hay Day (khách thăm trại); Restaurant Story (khách làm rơi nguyên liệu) |
| Giỏ chợ có thanh may mắn công khai | Bảo hiểm công khai (4) | PRD; Kairosoft (thanh tìm kiếm); TCG Card Shop Simulator |
| 3 mảnh rồi nấu thử đạt hạng Được | Khám phá rồi thạo (11) | Ooblets; My Café; Papa's |
| Nguyên liệu hiếm tiêu hao mỗi phần; kho tối đa 6 phần; trần ngày | Đủ năm thứ (10) | Kairosoft; Bonbon Cakery; Stardew (trần hái lượm) |

**Số đo lúc viết.** Theo `docs/can-bang.md` mục 14.1 và 14.2 (có thể được đo lại khi thêm 16 sự kiện mới): sự kiện ngày xảy ra 74,0% số ngày (đo 12.000 ngày); ca có ít nhất 1 tình huống là 79,8% ở mức Nhiều, 59,9% ở mức Vừa, 39,5% ở mức Ít; ca có 2 tình huống là 36,4%, 18,6% và 0%.

### 5.3 Mười sáu sự kiện mới của M4

Theo mục B của `docs/tham-khao/m4-thiet-ke.md`. Số tiền cụ thể có thể được chỉnh khi mô phỏng; bảng này ghi phần ý tưởng. "Thiết kế riêng" nghĩa là sự kiện không lấy từ game tham khảo nào.

**Tám sự kiện ngày** (báo trước ở Tổng kết ca hôm trước)

| Sự kiện | Loại | Lựa chọn an toàn hoặc cách tránh | Bài học nghề | Cảm hứng |
|---|---|---|---|---|
| Hội thi "Xe đẩy sạch, ngon" của phường | Tốt | Tự dự thi, không mất gì; chấm theo sao trung bình, không bốc thăm | Giữ chất lượng đều cả ca | The Ramen Sensei (thi định kỳ); Battle Chef Brigade (giám khảo) |
| Văn phòng đầu hẻm đặt 3 ly trà tắc | Tốt, có chọn | Nhận hay không đều không lỗ | Nhận đơn đặt trước, làm đúng hẹn | My Café (đơn gọi điện đặt trước) |
| Đại lý trà tài trợ bảng hiệu | Tốt | Không có rủi ro | Đẩy bán món chủ lực | Thiết kế riêng |
| Tắc lên giá | Xấu nhẹ | Dì Sáu gợi ý dùng Phiếu Chợ Sớm; phần tăng giá có trần | Theo dõi giá vốn | Supermarket Simulator (giá biến động); Recettear (tin tăng giá) |
| Tiền điện nước tháng này tăng | Xấu nhẹ | Khoản nhỏ, cố định, báo trước | Chi phí cố định của quán | Papers, Please (chi phí sinh hoạt cuối ngày) |
| Cúp điện theo lịch | Có chọn | Mua đá cây dự trữ | Chuẩn bị trước sự cố | Overcooked (đổi thiết bị); RollerCoaster Tycoon (mua trước giảm thiệt hại) |
| Trật tự đô thị nhắc giữ vỉa hè | Xấu, phòng được | "Thu gọn": giữ hàng chờ tối đa 2 người | Không lấn chiếm vỉa hè | Supermarket Simulator; Travellers Rest (phạt có nguyên nhân) |
| Đoàn kiểm tra vệ sinh an toàn thực phẩm | Có chọn | Chuẩn bị bao tay, khăn sạch, dọn lại bếp; lần đầu có lỗi chỉ bị nhắc nhở | Giữ quầy sạch, không bỏ bước sơ chế | Cook, Serve, Delicious! (thanh tra); Two Point (thanh tra); Papers, Please |

**Tám tình huống trong ca** (bật giữa hai khách)

| Tình huống | Loại | Lựa chọn an toàn | Bài học nghề | Cảm hứng |
|---|---|---|---|---|
| Tờ 20.000đ nghi giả | Xấu | Soi kỹ rồi mới nhận; hoặc mời chuyển khoản | Nhận biết tiền giả (chỉ nêu dấu hiệu) | Game Dev Tycoon (lừa đảo có dấu hiệu); ACNH (hàng giả) |
| Người giao hàng lấy hộ 2 ly, nói "khách chuyển rồi" | Có chọn | Chờ tiền về rồi giao; có Loa báo tiền thì thành lựa chọn xanh | Thấy tiền về mới giao món | FTL (lựa chọn xanh) |
| Bình gas mini hết giữa ca | Xấu | Mượn bếp chị bán xôi kế bên | Chuẩn bị vật tư dự phòng | Theme Hospital (mất ít nhưng chắc); Cafe Owner Simulator (thiết bị) |
| Khách bỏ quên ví trên ghế | Tốt | Cất giữ chờ khách | Giữ đồ thất lạc cho khách | Good Pizza (giúp khách thì khách quay lại giúp quán) |
| Cô Hai ve chai hỏi mua ly, thùng giấy | Tốt | Bán hoặc cho | Tận dụng đồ bỏ đi | ACNH (vị khách của hẻm) |
| Đoàn khách du lịch hỏi đường ra chợ | Tốt | Chỉ đường tận tình | Thái độ phục vụ | Stardew (chuyện bất ngờ tích cực) |
| Khách quen từ quê lên gửi quà | Tốt, cho hàng hiếm | Nhận và cảm ơn | Giữ quan hệ khách quen | The Ramen Sensei (khách tặng quà) |
| Chị bán dạo mời nguyên liệu hiếm | Có chọn, cho hàng hiếm | Hẹn bữa khác | Mua hàng biết trước, không mua may rủi | Potion Craft (thương nhân); Stardew (xe hàng rong) |

Cộng với 3 tình huống cũ (Khách mở hàng, Ghi nợ, Khách đổi ý), mỗi ca bốc từ 11 loại. Bốn thẻ Mẹo nghề mới gắn với tiền nghi giả, chờ tiền về, kiểm hàng khi Lựa hàng và giữ lối đi vỉa hè.

### 5.4 Chỗ M4 khác gợi ý của nghiên cứu

Dữ liệu gốc có nhiều gợi ý khác nhau cho cùng một việc. Bảng này ghi lựa chọn cuối cùng của M4 và lý do.

| Việc | Nghiên cứu gợi ý | M4 chọn | Lý do |
|---|---|---|---|
| Tỉ lệ sự kiện ngày | 50–70% cộng bảo hiểm (thực khoảng 57–61%) | 65% cộng bảo hiểm sau 1 ngày trống, thực khoảng 74% | Người dùng muốn "dày"; bù lại bằng tiền mỗi sự kiện nhỏ, trần hai chiều, mức Ít chỉ loại tốt |
| Số tình huống mỗi ca | Tối đa 2 hộp thoại mỗi ca, hoặc 2 tình huống từ ngày 7 | Tối đa 2 ở mức Vừa và Nhiều; lần 2 chỉ khi ca từ 6 khách; cách nhau ít nhất 2 khách | Tăng cảm giác có chuyện mà không làm ca ngắn bị ngợp |
| Kiểu bảo hiểm | Bậc thang tăng dần kiểu PRD (50% → 70% → 100%) | Tỉ lệ cố định cộng bảo hiểm cứng sau N ca | Dễ giải thích, dễ test, kết quả tái lập được |
| Hạn dùng nguyên liệu hiếm | 2 ngày game hoặc 7 ngày thật | Không hết hạn ở M4; giới hạn bằng trần kho 6 phần | Tránh gây sợ bỏ lỡ khi nguồn còn ít; xem lại ở GĐ2 (đề xuất 19) |
| Số mảnh công thức | 4 mảnh (Ooblets) | 3 mảnh rồi nấu thử đạt hạng Được | Thêm bước "làm đúng một lần" của My Café; có món hiếm đầu tiên trong 1–2 ngày thật |
| Nguồn theo giờ thật | "Giờ vàng" 2 khung mỗi ngày; gánh hàng rong 2 ngày mỗi tuần | 3 phiên hàng mỗi ngày theo khung giờ, chỉ có thưởng | Gộp hai ý thành một hệ thống; ai chơi giờ nào cũng có cơ hội |
| Mini-game lấy hàng | Mini-game nhặt đồ 60–90 giây | Dùng lại mini-game Chọn thành "Lựa hàng" | Tiết kiệm công; gắn thẳng với bài học kiểm hàng |
| Ngày lãnh lương | Hạ ngưỡng tip còn 15.000đ, hoặc khách 4 sao cũng tip | Khách gọi thêm món | Luật tip chỉ có một con số, dễ nhớ khi đào tạo |
| Số món hiếm ở M4 | 2 món, 2 món còn lại để GĐ2 | Đủ 4 món | Dùng lại mini-game và icon của món nền nên chi phí thấp |
| Đơn vị nguyên liệu hiếm | Theo "mẻ" đủ làm 3 phần | Theo phần; mỗi phần món tiêu hao đúng số phần hiếm (Bánh tráng trộn Tây Ninh cần 1 khô mực và 1 muối tôm) | Dễ hiểu, khớp với nghiệp vụ kho |
| Bù chuỗi xui | 3 sự kiện gần nhất đều lỗ thì lần kế chắc chắn tốt | Không 2 chuyện xấu liền; lỗ từ 50% trần thì lần sau chỉ loại tốt hoặc không phạt | Chặt hơn, người chơi ít khi gặp chuỗi lỗ |

### 5.5 Ý tưởng dự trữ (có trong dữ liệu gốc, chưa xếp hạng)

- **Đồ rơi trong ca:** một nguyên liệu hiếm hiện ở góc quầy vài giây giữa hai khách, chạm kịp thì nhặt được (Delicious). Cần làm kỹ để không cắt ngang thao tác.
- **Đoàn khách đặc biệt thưởng theo bậc**, được nhận hoặc từ chối từ Tổng kết hôm trước; dưới một nửa đạt thì chỉ trừ danh tiếng (Two Point, Theme Hospital).
- **Đi chợ đầu mối định kỳ** có phí, chọn 1 trong 3 chợ, bảng rớt công khai, kỳ vọng hòa vốn tới hơi lời (Cafeteria Nipponica).
- **Sổ tay món hiếm và bộ sưu tập nguyên liệu:** quê gốc, cách nhận biết hàng thật, số phần đã bán; hoàn thành bộ thì nhận danh hiệu, không thưởng tiền (Stardew, Hay Day).
- **Dụng cụ bếp mở món và giảm giá tuần** cho một nâng cấp (Coral Island, Sun Haven).
- **Biến thể "lấp lánh"** của nguyên liệu thường, như trứng hai lòng đỏ hay tắc chín cây (Ooblets, TCG Card Shop Simulator).
- **Chuỗi sự kiện nối nhau** (cho mượn rồi trả lại) để tạo cảm giác có kịch bản (Reigns); BKN đã có mẫu Ghi nợ rồi trả nợ.
- **Nhiệm vụ "khó hơn, lời hơn"** cho người giỏi tự chọn (My Café).
- **Khoản vay trả theo đợt** kèm lời nhắc; trễ hạn phạt nhẹ, không mất tiến độ (Recettear).
- **Đồ làm dư bán nửa giá** thay vì bỏ đi mất trắng (Sun Haven).
- **Tầng sự kiện siêu hiếm 0,5–1%** chỉ để có chuyện kể (Stardew).
- **Việc ngày thưởng tăng dần** (việc 1 < việc 2 < việc 3) để kéo người chơi làm hết (Ooblets).

---

## 6. Không làm và lý do

| # | Cơ chế | Gặp ở đâu | Vì sao BKN không làm | BKN làm gì thay |
|---|---|---|---|---|
| 1 | Vòng quay, casino, cược | Cooking Fever (casino từ cấp 7); Hay Day (vòng quay may mắn) | Là cờ bạc dù có trần; trái mục đích đào tạo và văn hóa doanh nghiệp | Mini-game kỹ năng có trần (Lựa hàng); Giỏ chợ miễn phí, tỉ lệ công khai |
| 2 | Lootbox, hộp quà ngẫu nhiên phải trả để mở | Hay Day (hộp bí ẩn mở bằng 3, 10, 20 kim cương) | Trả giá cho may rủi, dễ gây nghiện | Người bán dạo bán món biết trước; lượt Giỏ chợ chỉ đến từ kỹ năng hoặc sự kiện |
| 3 | Giải thu phí mà đa số người chơi lỗ | Cooking Fever (20.000 xu và 20 kim cương, chỉ top 10 có thưởng; người hạng 8 nhận ít hơn phí) | Gần với cờ bạc | Thử thách tự đấu, không phí vào (GĐ2) |
| 4 | Nhánh thưởng phải mua vé | Cooking Diary (nhánh Vàng của lộ trình thưởng) | Chia người chơi thành hai hạng; không hợp công cụ đào tạo | Mọi phần thưởng đều kiếm được bằng chơi |
| 5 | Hối lộ, "bôi trơn" | Papers, Please | Dạy điều sai, trái pháp luật và văn hóa doanh nghiệp | Kiểm tra vệ sinh chỉ có "chuẩn bị" (mua bao tay, khăn sạch, dọn lại bếp) hoặc "không chuẩn bị" |
| 6 | Thông báo đẩy ép quay lại | Hay Day (thông báo "Sữa đã sẵn sàng") | Tạo áp lực ngoài giờ; nhân viên học theo lịch đào tạo | Không gửi thông báo; lỡ phiên hàng không sao |
| 7 | Tiền hoặc nội dung mất trắng khi hết hạn | Cooking Diary (tiền sự kiện xe bán đồ ăn); bài phê phán nỗi sợ bỏ lỡ trên Game Developer | Gây sợ bỏ lỡ | Tem dư quy đổi; nguyên liệu hiếm không hết hạn ở M4; radio phát lại (GĐ2) |
| 8 | Trả tiền cao cấp để gỡ phạt | Restaurant Story (dùng tiền cao cấp cứu món hỏng) | Biến hình phạt thành chỗ bán hàng | Đường gỡ bằng kỹ năng hoặc lựa chọn an toàn miễn phí |
| 9 | Tự động làm thay vòng chơi chính | Cafe Owner Simulator (thuê người làm hết việc); dòng game idle | Mất đúng phần cần đào tạo | Hỗ trợ chỉ đỡ việc lặp, không làm thay 4 khâu |
| 10 | Sự kiện chỉ trừ tiền mà không cho gì | Game Dev Tycoon (sự kiện chỉ tốn tiền) | Người chơi thấy vô lý, không học được gì | Sự kiện nào cũng có lựa chọn và bài học |
| 11 | Hướng dẫn làm tiền giả, hàng giả | Nguyên tắc nội dung | Không truyền cách làm điều sai luật | Chỉ nêu dấu hiệu nhận biết |
| 12 | Tên thương hiệu thật | Nguyên tắc nội dung | Tránh quảng cáo và sai lệch | Gọi chung: chuyển khoản, QR, shipper, ví |

---

## Phụ lục A. Nguồn theo từng game

- Xếp theo 11 thể loại ở mục 2. Game được nghiên cứu hai lần thì gộp nguồn của cả hai lần.
- "(trích đoạn)" nghĩa là chỉ đọc được đoạn trích trong kết quả tìm kiếm (mức B); đường dẫn không ghi chú là trang đã đọc trực tiếp (mức A).
- Tổng cộng 194 đường dẫn theo game (42 đường dẫn chỉ đọc được đoạn trích) và 2 nguồn chung ở mục A.12.

### A.1 Nấu ăn dạng chuỗi mini-game

- **Cooking Mama: Cook Off**
  - <https://en.wikipedia.org/wiki/Cooking_Mama:_Cook_Off>
  - <https://cookingmama.fandom.com/wiki/Medal> (trích đoạn)
  - <https://cookingmama.fandom.com/wiki/Cooking_Mama:_Cook_Off> (trích đoạn)
- **Venba**
  - <https://en.wikipedia.org/wiki/Venba_(video_game)>
  - <https://www.digitaltrends.com/gaming/venba-review-nintendo-switch/> (trích đoạn)
  - <https://www.slantmagazine.com/games/venba-review/> (trích đoạn)

### A.2 Quản lý thời gian nhà hàng

- **Diner Dash**
  - <https://en.wikipedia.org/wiki/Diner_Dash>
  - <https://www.cheathappens.com/show_board2.asp?headID=30707&titleID=10725> (trích đoạn)
  - <https://glumobile.helpshift.com/hc/en/12-diner-dash/faq/308-how-do-i-complete-a-color-match-goal/> (trích đoạn)
- **Delicious (dòng Emily)**
  - <https://www.gamehouse.com/blog/2025/01/delicious-emily-the-first-course-gh/>
  - <https://www.gamehouse.com/blog/2015/11/delicious-emilys-hopes-and-fears-walkthrough/>
- **Dòng Papa's (Flipline Studios)**
  - <https://en.wikipedia.org/wiki/Papa_Louie>
  - <https://www.flipline.com/blog/archives/591>
  - <https://steamcommunity.com/app/3259470/discussions/0/4634862878162250270/>
  - <https://fliplinestudios.fandom.com/wiki/Specials> (trích đoạn)
  - <https://fliplinestudios.fandom.com/wiki/Closer> (trích đoạn)
  - <https://fliplinestudios.fandom.com/wiki/Mini-Games> (trích đoạn)
  - <https://store.steampowered.com/app/2291760/Papas_Freezeria_Deluxe/> (trích đoạn)
- **Good Pizza, Great Pizza**
  - <https://en.wikipedia.org/wiki/Good_Pizza,_Great_Pizza>
  - <https://bigbossbattle.com/good-pizza-great-pizza-launched-oven-and-orcs-event/> (trích đoạn)
  - <https://steamcommunity.com/app/770810/allnews/> (trích đoạn)
  - <https://good-pizza-great-pizza.fandom.com/wiki/Events> (trích đoạn)
  - <https://good-pizza-great-pizza.fandom.com/wiki/Profit> (trích đoạn)
  - <https://www.touchtapplay.com/how-to-play-good-pizza-great-pizza-tips-tricks/>
- **Cooking Fever**
  - <https://noodlearcade.com/cooking-fever-ultimate-strategy-guide>
  - <https://noodlearcade.com/cooking-fever-how-get-more-gems>
  - <https://cookingfever.fandom.com/wiki/Casino> (trích đoạn)
  - <https://cookingfever.fandom.com/wiki/Cooking_Fever_Tournament>
  - <https://cookingfever.fandom.com/wiki/Cooking_Fever_Challenge>
  - <https://cookingfever.fandom.com/wiki/Gems>
- **Cooking Madness**
  - <https://zenjoy.helpshift.com/hc/en/3-cooking-madness-kitchen-frenzy/section/19-gameplay/>
  - <https://apps.apple.com/ph/app/cooking-madness-kitchen-frenzy/id1323901884>
  - <https://appadvice.com/app/cooking-madness-kitchen-frenzy/1323901884> (trích đoạn)
- **Cooking Diary**
  - <https://cookingdiary.game/game-guide>
  - <https://mytona.helpshift.com/hc/en/5-cooking-diary/faq/339-what-s-the-food-truck/>
  - <https://mytona.helpshift.com/hc/en/5-cooking-diary/faq/424-what-is-the-culinary-tournament/> (trích đoạn)
  - <https://mytona.helpshift.com/hc/en/5-cooking-diary/faq/414-what-s-the-chef-s-to-do-list/> (trích đoạn)
  - <https://cookingdiary.game/game-guide/events/food-truck>
  - <https://mytona.helpshift.com/hc/en/5-cooking-diary/section/114-events-1653021686/>
  - <https://mytona.helpshift.com/a/cooking-diary/?s=events&f=what-is-path-to-glory&l=en>

### A.3 Nấu theo chuỗi phím, nhịp nhanh

- **Cook, Serve, Delicious! (bản 1)**
  - <https://en.wikipedia.org/wiki/Cook,_Serve,_Delicious!>
  - <https://steamcommunity.com/app/247020/discussions/0/810938082206738443>
  - <https://csd.fandom.com/wiki/Chores> (trích đoạn)
  - <https://csd.fandom.com/wiki/Buzz> (trích đoạn)
  - <https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/CookServeDelicious> (trích đoạn)
  - <https://cookservedelicious.fandom.com/wiki/How_to_play_guide_for_Cook,_Serve,_Delicious>
  - <https://csd.fandom.com/wiki/Opening_hours>
- **Cook, Serve, Delicious! 2!! và 3?!**
  - <https://en.wikipedia.org/wiki/Cook,_Serve,_Delicious!_2>
  - <https://steamcommunity.com/app/386620/discussions/0/1484358860949871877/>
  - <https://steamcommunity.com/app/386620/discussions/0/2765630416810309962/> (trích đoạn)
  - <https://steamcommunity.com/sharedfiles/filedetails/?id=2077167966> (trích đoạn)
  - <https://en.wikipedia.org/wiki/Cook,_Serve,_Delicious!_3>
  - <https://www.pcgamer.com/cook-serve-delicious-3-review/> (trích đoạn)

### A.4 Nấu hợp tác hỗn loạn, roguelite

- **Overcooked! và Overcooked! 2**
  - <https://en.wikipedia.org/wiki/Overcooked>
  - <https://en.wikipedia.org/wiki/Overcooked_2>
  - <https://overcooked.fandom.com/wiki/Combos> (trích đoạn)
- **PlateUp!**
  - <https://en.wikipedia.org/wiki/PlateUp!>
  - <https://comicbuzz.com/plateup-review/>
  - <https://www.chaptercheats.com/cheat/pc/513512/plateup/hint/174921>
  - <https://wiki.plateupgame.com/Decorations> (trích đoạn)
  - <https://wiki.plateupgame.com/Cards> (trích đoạn)
  - <https://steamcommunity.com/app/1599600/discussions/0/4406291330027688242/>

### A.5 Mô phỏng góc nhìn thứ nhất, vật lý

- **Cooking Simulator**
  - <https://en.wikipedia.org/wiki/Cooking_Simulator>
- **Chef Life: A Restaurant Simulator**
  - <https://www.gamingnexus.com/Article/11794/Chef-Life-A-Restaurant-Simulator/>
  - <https://www.pushsquare.com/reviews/ps5/chef-life-a-restaurant-simulator>
- **Cafe Owner Simulator**
  - <https://store.steampowered.com/app/1498140/Cafe_Owner_Simulator/>
  - <https://steambase.io/games/cafe-owner-simulator>
  - <https://steamcommunity.com/app/1498140/discussions/0/3722818378188148301/>
- **Supermarket Simulator**
  - <https://store.steampowered.com/app/2670630/Supermarket_Simulator/>
  - <https://steamcommunity.com/app/2670630/discussions/0/4304949638719976308/>
  - <https://steamcommunity.com/sharedfiles/filedetails/?id=3406587565>
- **TCG Card Shop Simulator**
  - <https://store.steampowered.com/app/3070070/TCG_Card_Shop_Simulator/>
  - <https://www.treyexgaming.com/tcg-card-shop-simulator-card-rarity-probabilities-guide/>

### A.6 Tycoon quản lý

- **Cafeteria Nipponica (Kairosoft)**
  - <https://kairosoft.wiki.gg/wiki/Cafeteria_Nipponica>
  - <https://kairosoft.wiki.gg/wiki/Transcript:Manual_(Cafeteria_Nipponica)>
  - <https://kairosoft.wiki.gg/wiki/Ingredients_(Cafeteria_Nipponica)>
  - <http://kairoguide.blogspot.com/2013/07/cafeteria-nipponica-treasure-chest.html> (trích đoạn)
  - <https://kairosoft.wiki.gg/wiki/Compatibilities_(Cafeteria_Nipponica)>
- **The Ramen Sensei (Kairosoft)**
  - <https://kairosoft.wiki.gg/wiki/Transcript:Manual_(The_Ramen_Sensei)>
  - <https://kairosoft.wiki.gg/wiki/Ramen_(The_Ramen_Sensei)>
  - <https://kairosoft.fandom.com/wiki/Toppings_(The_Ramen_Sensei_2)> (trích đoạn)
- **Bonbon Cakery (Kairosoft)**
  - <https://kairosoft.wiki.gg/wiki/Ingredients_(Bonbon_Cakery)>
  - <https://kairosoft.wiki.gg/wiki/Combos_(Bonbon_Cakery)>
  - <https://kairosoft.fandom.com/wiki/Tips_(Bonbon_Cakery)> (trích đoạn)
- **Game Dev Tycoon**
  - <https://forum.greenheartgames.com/t/most-random-events-are-useless/6058>
  - <https://gamedevtycoon.fandom.com/wiki/Random_Events> (trích đoạn)
  - <https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/GameDevTycoon>
  - <https://gamedevtycoon.fandom.com/wiki/Success_Guide>
- **Two Point Hospital / Two Point Campus**
  - <https://gamefaqs.gamespot.com/pc/230622-two-point-hospital/faqs/76595/vip-visits>
  - <https://two-point-hospital.fandom.com/wiki/Emergencies> (trích đoạn)
  - <https://www.gamesradar.com/two-point-campus-kudosh/>
  - <https://www.pcgamesn.com/two-point-campus/kudosh>
- **Theme Hospital**
  - <https://github.com/CorsixTH/CorsixTH/wiki/How-epidemics-work>
  - <https://strategywiki.org/wiki/Theme_Hospital/Events>
  - <https://gamefaqs.gamespot.com/pc/198993-theme-hospital/faqs/75187/earthquakes>
  - <https://gamefaqs.gamespot.com/pc/198993-theme-hospital/faqs/75187/160vips160>
- **RollerCoaster Tycoon**
  - <https://outof.games/realms/rollercoastertycoon/guides/536-guide-to-climate-weather-and-temperature-in-rollercoaster-tycoon-1-2/>
  - <https://rct.fandom.com/wiki/Information_Kiosk>
  - <https://rct.fandom.com/wiki/Climate>

### A.7 Chủ tiệm kết hợp đi thu thập

- **Dave the Diver**
  - <https://www.gamedeveloper.com/design/dave-the-diver>
  - <https://en.wikipedia.org/wiki/Dave_the_Diver>
  - <https://steamcommunity.com/app/1868140/discussions/0/3805027864675751206/>
  - <https://twinfinite.net/guides/all-cooksta-ranks-rewards-dave-the-diver/>
- **Moonlighter**
  - <https://en.wikipedia.org/wiki/Moonlighter_(video_game)>
  - <https://www.playfulbrandstrategy.com/en/writings/pricing-in-moonlighter>
- **Recettear: An Item Shop's Tale**
  - <https://en.wikipedia.org/wiki/Recettear:_An_Item_Shop%27s_Tale>
  - <https://recettear.fandom.com/wiki/Announcements> (trích đoạn)
  - <https://steamcommunity.com/app/70400/discussions/0/4543572243355376944/>
- **Potion Craft: Alchemist Simulator**
  - <https://en.wikipedia.org/wiki/Potion_Craft>
  - <https://www.thegamer.com/potion-craft-rare-ingredients-must-buy/>
  - <https://potion-craft.fandom.com/wiki/Category:Merchants>
- **Battle Chef Brigade**
  - <https://en.wikipedia.org/wiki/Battle_Chef_Brigade>
  - <https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/BattleChefBrigade> (trích đoạn)
  - <https://store.steampowered.com/app/452570/Battle_Chef_Brigade_Deluxe/> (trích đoạn)

### A.8 Đời sống cozy, nông trại

- **Stardew Valley**
  - <https://stardewvalleywiki.com/Traveling_Cart>
  - <https://stardewvalleywiki.com/Random_Events>
  - <https://stardewvalleywiki.com/Cooking>
  - <https://stardewvalleywiki.com/Foraging>
  - <https://stardewvalleywiki.com/Luck>
  - <https://stardewvalleywiki.com/SquidFest>
  - <https://stardewvalleywiki.com/Catfish>
  - <https://stardewvalleywiki.com/Special_Orders>
  - <https://stardewvalleywiki.com/The_Queen_of_Sauce>
- **Animal Crossing: New Horizons**
  - <https://nintendowire.com/guides/animal-crossing-new-horizons/special-visitor-appearance-rates/>
  - <https://nookipedia.com/wiki/Turnip>
  - <https://nookipedia.com/wiki/Redd>
  - <https://nookipedia.com/wiki/Label>
  - <https://nookipedia.com/wiki/Celeste>
  - <https://nookipedia.com/wiki/Star_fragment>
  - <https://nookipedia.com/wiki/Coelacanth>
  - <https://nookipedia.com/wiki/Jolly_Redd%27s_Treasure_Trawler>
  - <https://nookipedia.com/wiki/Forgery>
  - <https://www.gamerevolution.com/guides/644358-what-to-do-with-fake-art-in-animal-crossing-new-horizons>
- **Travellers Rest**
  - <https://travellersrest.wiki.gg/wiki/Trends>
  - <https://travellersrest.wiki.gg/wiki/Very_Important_Guest>
  - <https://travellersrest.wiki.gg/wiki/Reputation>
  - <https://travellersrest.wiki.gg/wiki/Seasons>
  - <https://travellersrest.wiki.gg/wiki/Orders>
- **Coral Island**
  - <https://coralisland.wiki/wiki/Cooking>
  - <https://coralisland.wiki/wiki/Socket_Electronics>
  - <https://coralisland.fandom.com/wiki/Cooking>
- **Ooblets**
  - <https://en.wikipedia.org/wiki/Ooblets>
  - <https://www.thegamer.com/ooblets-unlock-recipe-guide/>
  - <https://ooblets.fandom.com/wiki/Daily_Wishies>
  - <https://www.pockettactics.com/ooblets/gleamy>
- **Spiritfarer**
  - <https://en.wikipedia.org/wiki/Spiritfarer>
  - <https://guidestrats.com/spiritfarer-jellyfish-event/>
  - <https://spiritfarer.fandom.com/wiki/Events>
- **Sun Haven**
  - <https://sunhaven.wiki.gg/wiki/Cooking>
- **Fae Farm** (mức C: hiểu biết chung, các trang dưới chỉ để đối chiếu)
  - <https://techraptor.net/gaming/guides/fae-farm-cooking-guide>
  - <https://www.gameskinny.com/tips/fae-farm-cooking-and-recipes-guide/>
  - <https://videochums.com/article/fae-farm-seasonal-crops-guide>
- **Chef RPG**
  - <https://store.steampowered.com/app/1796790/Chef_RPG/>
  - <https://www.thegamer.com/chef-rpg-beginner-tips-tricks-guide/>

### A.9 Game miễn phí có chuỗi sản xuất và LiveOps

- **Hay Day**
  - <https://www.deconstructoroffun.com/blog//2013/01/behind-success-of-hay-day.html>
  - <https://www.gamedeveloper.com/business/game-monetization-design-analysis-of-hay-day>
  - <https://www.supercheats.com/hay-day/walkthrough/mystery-boxes>
  - <https://hayday.fandom.com/wiki/Supplies>
  - <https://hayday.fandom.com/wiki/Derby>
  - <https://myfarm.site/articles/hay-day-derby-events-guide/>
  - <https://hayday.fandom.com/wiki/Expansion>
- **Township**
  - <https://www.deconstructoroffun.com/blog/2020/10/13/how-playrix-township-became-a-billion-dollar-game>
- **Cookie Run: Kingdom**
  - <https://naavik.co/game-deconstruction/cookie-run-kingdom/>
  - <https://cookierunkingdom.fandom.com/wiki/Basic_Events>
- **Restaurant Story**
  - <https://www.gamezebo.com/walkthroughs/restaurant-story-walkthrough/>
  - <https://forums.storm8.com/showthread.php/59838-Restaurant-Story-Game-Guide> (trích đoạn)
- **My Café: Recipes & Stories**
  - <https://melsoft-games.helpshift.com/hc/en/3-my-cafe-recipes-stories---world-restaurant-game/section/138-festivals/>
  - <https://www.mejoress.com/recipes-my-cafe-recipes-stories-full/>
  - <https://my-cafe.fandom.com/wiki/Recipes> (trích đoạn)
  - <https://my-cafe.fandom.com/wiki/Orders> (trích đoạn)
  - <http://mycafeguidebook.blogspot.com/p/towns-festivals.html> (trích đoạn)
  - <https://melsoft-games.helpshift.com/hc/en/3-my-cafe-recipes-stories---world-restaurant-game/faq/1529-tournaments/>
  - <https://melsoft-games.helpshift.com/hc/en/3-my-cafe-recipes-stories---world-restaurant-game/faq/817-how-are-the-opponents-selected-at-the-festival/>
  - <https://melsoft-games.helpshift.com/hc/en/3-my-cafe-recipes-stories---world-restaurant-game/faq/385-all-about-personal-tasks/>
  - <https://melsoft-games.helpshift.com/hc/en/3-my-cafe-recipes-stories---world-restaurant-game/faq/1694-racing-tournament/?l=enALL>
- **Idle Restaurant Tycoon và thể loại idle nhà hàng**
  - <https://apps.apple.com/us/app/idle-restaurant-tycoon-empire/id1530534938>
  - <https://machinations.io/articles/idle-games-and-how-to-design-them>
  - <https://idle-restaurant-tycoon.en.uptodown.com/android> (trích đoạn)

### A.10 Mô phỏng công việc và tự sự

- **Papers, Please**
  - <https://en.wikipedia.org/wiki/Papers,_Please>
  - <https://papersplease.fandom.com/wiki/Citation>
  - <https://gamefaqs.gamespot.com/pc/713440-papers-please/faqs/67997>
- **Coffee Talk**
  - <https://en.wikipedia.org/wiki/Coffee_Talk_(video_game)>
- **Reigns**
  - <https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i->
- **FTL: Faster Than Light**
  - <https://ftl.fandom.com/wiki/Blue_Options> (trích đoạn)
  - <https://ftl.fandom.com/wiki/Slug_hacker_(medical)> (trích đoạn)
  - <https://steamcommunity.com/app/212680/discussions/0/611696927930533989/>

### A.11 Bài học về xác suất

- **RimWorld (người kể chuyện AI)**
  - <https://rimworldwiki.com/wiki/AI_Storytellers>
  - <https://rimworldwiki.com/wiki/Cassandra_Classic>
  - <https://rimworldwiki.com/wiki/Phoebe_Chillax>
  - <https://rimworldwiki.com/wiki/Randy_Random>
- **Sid Meier và Rob Pardo (GDC 2010)**
  - <https://www.shacknews.com/article/62807/sid-meier-and-rob-pardo>
  - <https://www.adachen.com/gdc10-notes-sid-meier-on-why-everything-you-know-is-wrong/>
- **Warcraft III / Dota 2: phân phối giả ngẫu nhiên (PRD)**
  - <https://diplograph.net/notes/games/randomness/dota-2-prd>
  - <https://liquipedia.net/dota2/Pseudo_Random_Distribution>

### A.12 Nguồn chung về thiết kế sự kiện và giữ chân

- <https://www.gameanalytics.com/blog/liveops-strategies-for-f2p-games>: khuyên chạy một số sự kiện không theo lịch đoán trước để tránh nhàm và tránh cày.
- <https://www.gamedeveloper.com/design/how-video-games-abuse-the-fear-of-missing-out>: phê phán nội dung giới hạn thời gian ảnh hưởng lối chơi.

---

## Phụ lục B. Thuật ngữ

| Thuật ngữ | Nghĩa trong tài liệu này |
|---|---|
| Bảo hiểm xui | Luật bảo đảm sau một số lần không trúng thì lần kế chắc chắn trúng (tiếng Anh: pity). "Cứng" là chắc chắn ở lần thứ N; "mềm" là tỉ lệ tăng dần |
| PRD | Phân phối giả ngẫu nhiên: xác suất tăng dần sau mỗi lần trượt, về lại từ đầu khi trúng |
| LiveOps | Vận hành game sau khi phát hành bằng sự kiện, lễ, nhiệm vụ chạy liên tục |
| Nỗi sợ bỏ lỡ | Cảm giác bị ép chơi vì sợ mất phần thưởng (tiếng Anh: FOMO) |
| Lootbox | Hộp quà ngẫu nhiên phải trả tiền, thật hoặc trong game, để mở |
| Time-management | Thể loại phục vụ nhiều khách trong thời gian giới hạn |
| Roguelite | Thể loại mỗi lượt chơi khác nhau, thua thì chơi lại nhưng giữ một phần mở khóa |
| Tycoon | Thể loại quản lý kinh doanh, nhìn từ trên xuống |
| Cozy | Thể loại đời sống nhẹ nhàng, ít áp lực thua |
| Idle | Thể loại tự chạy và kiếm tiền cả khi người chơi không thao tác |
| F2P | Game miễn phí, thu tiền qua mua trong game |
| Closer | Khách cuối ca trong dòng Papa's, chấm khắt khe hơn khách thường |
| VIP | Khách đặc biệt, thường được báo trước, ảnh hưởng lớn tới danh tiếng |
| Lựa chọn an toàn | Lựa chọn trong sự kiện không thể lỗ quá một khoản nhỏ đã biết trước |
| Lựa chọn xanh | Lựa chọn chỉ mở khi người chơi có một hiện vật phù hợp, thường cho kết quả tốt hơn |
| Trần thiệt hại, trần thưởng | Mức tiền lớn nhất một sự kiện được trừ hoặc được cộng |
| Thu nhập tham chiếu | Lãi bán hàng một ca của người chơi trung bình theo ngày game; dùng để tính thưởng và trần |
| Ngày game, ngày thật | Ngày game là một ca bán ở Chặng 1; ngày thật là ngày theo lịch, đổi lúc 04:00 giờ Việt Nam |
| Món ngang giá trị | Quy tắc cân bằng: lãi mỗi giây nấu của món mới không vượt món Tiền quán tốt nhất cùng chặng quá 10% |
| Tỉ lệ người chơi hằng ngày trên hằng tháng | Số người chơi mỗi ngày chia số người chơi mỗi tháng; càng cao nghĩa là người chơi quay lại càng đều |
