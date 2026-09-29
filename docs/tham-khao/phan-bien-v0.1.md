# Phản biện bản đề xuất "Bếp Khởi Nghiệp" v0.1

Đã kiểm tra: repo `/home/user/gamefnb` đúng là đang trống (nhánh `claude/fb-business-game-qswti6`, chưa có commit nào).

## (a) Phần còn thiếu so với yêu cầu người dùng

1. **Thứ tự 4 khâu không khớp với chữ người dùng dùng.** Người dùng yêu cầu "order → thanh toán → tính tiền → làm đồ". Luồng ở mục 2.1 lại là order → *báo tổng* → khách trả tiền → thối tiền, trong khi quyết định #6 vẫn ghi là "giữ đúng thứ tự".
   - **Sửa:** thêm mục "Luồng 4 khâu" lên đầu tài liệu. Mỗi khách có thanh tiến trình 4 chấm, dùng đúng nhãn người dùng đặt:
     - **Order**: nghe, ghi phiếu, đọc lại, chốt.
     - **Thanh toán**: báo tổng, khách chọn tiền mặt hoặc QR, khách đưa tiền.
     - **Tính tiền**: đếm tiền nhận, tính và thối, xác nhận QR, xuất phiếu thu.
     - **Làm đồ**.
   - Khai báo thứ tự các khâu trong `balance.js` để đổi được nếu người dùng muốn khâu "tính tiền" đứng trước.
2. **Thiếu phiếu thu.** Phiếu thu là thứ khâu tính tiền của máy bán hàng thật luôn tạo ra.
   - **Sửa:** MVP tự sinh phiếu thu (món, tổng, khách đưa, tiền thối, phương thức) và đưa kèm tiền thối. Tổng kết ca đối soát theo phiếu thu.
3. **"Sơ chế đúng và đủ" chưa phải là lựa chọn của người chơi.** Các bước chạy thẳng một hàng do game ép. Người chơi không thể quên rửa hay sơ chế sai cách, nên chỉ bước CHON thật sự kiểm tra "đúng và đủ".
   - **Sửa:** thêm "Thớt sơ chế".
     - Sau CHON, các nguyên liệu nằm trên thớt, mỗi thứ có icon trạng thái cần đạt (đã rửa, đã thái sợi…).
     - Người chơi tự chạm vào nguyên liệu để mở bước của nó. Thứ tự tự do, trừ các ràng buộc cứng khai báo bằng `after:`.
     - Nút "Ra món" bấm được lúc nào cũng được. Nguyên liệu chưa sơ chế thì Q −10 và review gọi đúng tên.
     - Với 1–2 nguyên liệu, cho chọn cách sơ chế (thái lát, thái sợi, bào) bằng 2–3 dụng cụ. Chọn sai thì bước đó −15 điểm.
     - Áp dụng trước cho Bánh tráng trộn.
4. **Chưa có luật nấu cho đơn nhiều phần và luật chấm sao cho đơn nhiều món.** Đơn "2 ổ, 1 ổ không hành" đang thành 3 lượt nấu 8 bước, khoảng 90 giây cho một khách.
   - **Sửa:**
     - Một dòng có số lượng n = một lượt nấu. Tham số nhân theo n (đập 2n trứng), thời gian × (1 + 0,4(n−1)). Chỉ dòng khác ghi chú mới tách lượt.
     - Sao gốc = hạng của Q trung bình, lấy trọng số theo giá. Có món Hỏng thì tối đa 2 sao.
5. **Món sự kiện mới có engine, chưa có nội dung chơi được**, nên người dùng chưa thấy được yêu cầu "món chỉ lấy qua sự kiện". Chè bưởi chỉ dùng 6 cơ chế đã có ở MVP, nên thêm vào chỉ tốn dữ liệu.
   - **Sửa:**
     - Đưa Chè bưởi và sự kiện 20/11 vào MVP chính thức, không để ở mục "nếu còn thời gian".
     - Thêm cờ `?devNow=2026-11-15`, chỉ có tác dụng khi chạy ở `localhost`, để xem trước sự kiện.
     - DoD thêm một e2e: sự kiện mở → nhận món qua chuỗi → hết hạn vẫn giữ món.
6. **Shop MVP chỉ có 1 món, và món đó bắt buộc phải mua để lên chặng.** Shop thành thủ tục một lần.
   - **Sửa:** thêm món Shop thứ hai chỉ bằng dữ liệu, ví dụ Cà phê sữa đá (ROT phin, CHAM sữa, CHA khuấy, CHAM đá).
7. **Khâu order thiếu tình huống cơ bản của quầy thật**: khách gọi món chưa có trong thực đơn hoặc món đã hết, khách hỏi giá, khách đổi món trước khi chốt.
   - **Sửa:** thêm 3 mẫu thoại và nút "Báo hết món / Quán chưa bán món này". Xử lý sai thì −0,5 sao. Nối với Mẹo nghề "báo hết món".

## (b) Mâu thuẫn nội bộ và số liệu kinh tế

1. **Thời gian phục vụ dài hơn khoảng cách giữa hai khách, nên hàng chờ chắc chắn tràn.**
   - Ở ngày 7, mỗi khách tốn khoảng 20–28 giây ở quầy, cộng 1,35 phần × khoảng 30 giây ở bếp, tức 60–70 giây. Khách đến mỗi khoảng 43 giây, giờ cao điểm khoảng 32 giây.
   - Câu "khách tới xen kẽ nên thời gian hiệu dụng còn 35–45 giây" là sai: một người làm hết mọi việc thì không làm song song được, chỉ có vài giây chờ QR.
   - **Sửa:**
     - Khoảng cách giữa hai khách = 1,15 × thời gian phục vụ kỳ vọng, tính từ `par` trong dữ liệu. Giờ cao điểm ×0,9.
     - Bánh mì ốp la ở Chặng 1 còn 5 bước: gộp rửa và thái dưa, cho bước nướng bánh chạy tự động.
     - Thêm test cân bằng khẳng định hệ số tải ρ ≤ 0,9.
2. **Số lần chạm vượt xa mục tiêu.** Mỗi khách khoảng 15 chạm ở quầy, mỗi phần món khoảng 25–35 chạm ở bếp, nên một ca 8 khách có khoảng 350–450 chạm, so với mục tiêu 150–250.
   - **Sửa:** hoặc nâng mục tiêu, hoặc bớt bước. Đo thật bằng Sổ số liệu rồi ghi kết quả vào `can-bang.md`.
3. **Con số "thưởng chiếm 22%" chỉ đúng với vòng điểm danh thường, bỏ sót đúng giai đoạn MVP.**
   - Chặng 1 kéo dài từ ngày thật 1 đến ngày 4. Trong giai đoạn đó có: thư chào mừng 100k, Tuần Khai Trương 100k + 150k, chuỗi C1 gồm 7 bước × 24k, nhiệm vụ cộng hòm 64k mỗi ngày.
   - Ngày thật đầu tiên: lãi bán hàng chỉ khoảng 100k (ca đầu chỉ 4 khách × khoảng 9k lãi − 20k chi phí cố định), trong khi thưởng khoảng 330k. Thưởng chiếm khoảng 75%.
   - Cả Chặng 1, thưởng chiếm khoảng 45%, vượt trần 35%.
   - **Sửa:**
     - Ở Chặng 1, TNC tính theo ngày game (từ khoảng 20k tăng dần lên 80k).
     - Tuần Khai Trương tặng hiện vật thay cho tiền.
     - Đưa thưởng chuỗi, thư và điểm danh vào bảng 9.5, rồi kiểm lại bằng mô phỏng.
4. **Vốn đầu 200k trùng đúng quỹ tiền lẻ 200k.** Như vậy tiền tiêu được bằng 0, không đủ trả chi phí cố định 20k. Ngoài ra có 3 "túi" tiền (Tiền, két, tài khoản) mà chưa rõ Shop trừ vào túi nào.
   - **Sửa:**
     - Quỹ lẻ là tài sản riêng, không tiêu được, và đầu mỗi ca tự tái lập đúng cơ cấu tờ.
     - Cuối ca, tiền mặt vượt quỹ lẻ và tiền QR cùng gộp vào một ví "Tiền quán".
     - Vốn đầu 200k nằm trong ví này.
5. **"Chơi lại ca" miễn phí phá luật lưu ca dở và luật seed khách cố định.** Nó còn cộng trùng tiến độ nhiệm vụ và chuỗi đã phát qua bus.
   - **Sửa:** chỉ cho chơi lại khi ca lỗ, tối đa 1 lần mỗi ngày thật. Khi chơi lại thì khôi phục toàn bộ snapshot, gồm cả nhiệm vụ, `stats` và hộp thư.
6. **Làm tròn sao nuốt mất các khoản phạt −0,5.** Ví dụ 4 − 0,5 = 3,5, `Math.round` trả về 4.
   - **Sửa:** hiển thị nửa sao, hoặc làm tròn xuống. Thêm unit test cho trường hợp này.
7. **Hỗ trợ "không giảm phần thưởng" thành lựa chọn luôn có lợi.** Ai cũng sẽ bật, và tiêu chí "người 4,7 sao lãi hơn người 3,8 sao ít nhất 25%" không còn đúng. Các hệ số vùng cộng dồn ×1,2 × 1,2 × 1,1 × 1,25 ≈ ×2.
   - **Sửa:** khi bật Hỗ trợ Thao tác thì không có Hoàn mỹ, không đếm các nhiệm vụ "Hoàn hảo", trần món ở hạng Ngon. Đặt trần tổng hệ số vùng ×1,6.
8. **Luật "món ngang giá trị" bị chính tài liệu phá.** Trong mùa sự kiện món có giá ×1,3, vượt xa trần +10%. Món bí truyền lại "lãi hơn khoảng 15%".
   - **Sửa:** mùa sự kiện tăng Tem và danh tiếng, không tăng giá. Món bí truyền cũng phải theo trần 10%.
9. **LUA thiếu nhánh "muộn nhưng chưa cháy"**, tức đoạn từ mép vùng + 0,08 đến 1,0. Ví dụ "Nướng 45" cũng không thuộc thang điểm rời 100/80/55/20/0.
   - **Sửa:** dùng hàm liên tục theo khoảng cách tới tâm, đối xứng hai phía; vượt 1,0 là 0 điểm. Sửa lại ví dụ cho khớp.
10. **"Thối gọn" so với thuật toán tham lam sẽ sai khi két thiếu tờ.** Ví dụ cần thối 60k, két có 1 tờ 50k và 3 tờ 20k, không có tờ 10k. Tham lam bị bế tắc, còn lời giải duy nhất là 3 tờ 20k lại bị coi là "không gọn".
    - **Sửa:** số tờ tối ưu tính bằng quy hoạch động trên két thực tế (dùng lại phần DP đã có để kiểm tra còn thối được không).
11. **Tip 10% làm tròn 1.000đ không trả được bằng tiền mặt**, vì Chặng 1–2 không có tờ 1k và 2k.
    - **Sửa:** tip ở Chặng 1 là "Khỏi thối em ơi": khách để lại tiền thối, tối đa 5k–10k. Làm tròn theo bội 5.000đ.
12. **Khách văn phòng xuất hiện từ ngày 3 với 70% trả QR**, nhưng QR đến ngày 4 mới mở.
    - **Sửa:** dời kiểu khách này sang ngày 4, hoặc cho trả tiền mặt đến khi QR mở.
13. **Thiếu một nguyên liệu phụ bị phạt 3 lần**: CHON −20, bước sơ chế tính 0, Q −10, tổng cộng khoảng −21 Q. Điều này trái với nguyên tắc minh bạch. Lấy hành khi phiếu ghi "Không hành" thì rơi vào cả luật "thừa nguyên liệu" lẫn luật "trái ghi chú".
    - **Sửa:** mỗi lỗi nguyên liệu chỉ tính một dòng phạt. Thứ tự ưu tiên: trái ghi chú > bẫy > thiếu > thừa.
14. **Lớp "phiếu so với món" phạt oan.** Phiếu ghi sai nhưng người chơi nhớ lời khách và làm đúng, vẫn bị ghi "lỗi bếp".
    - **Sửa:** sao của khách chỉ so *yêu cầu thật* với *món làm ra*. Trường hợp phiếu lệch món thì ghi "Lệch phiếu" để nhắc quy trình, không trừ sao.
15. **"Điểm quy trình" (+5) không dùng vào đâu.**
    - **Sửa:** bỏ, hoặc gộp thành "Điểm Quầy" của ca và dùng làm chỉ tiêu nhiệm vụ.
16. **Đọc lại đơn gần như không tốn gì** nên người chơi sẽ luôn bấm. Không còn đánh đổi "nhanh hay chắc" như tài liệu mô tả.
    - **Sửa:** coi là bước bắt buộc theo quy trình chuẩn và có chấm điểm, hoặc cho bước này làm giảm kiên nhẫn của cả hàng chờ.
17. **Máy tính cầm tay mở từ ngày 3**, tự động hóa quá sớm đúng khâu tính tiền mà người dùng muốn người chơi luyện.
    - **Sửa:** mở từ ngày 7, chỉ cộng tổng, không hiện tiền thối.
18. **Chưa định nghĩa khi CHON tự kết thúc ở 2,5 × par mà vẫn thiếu nguyên liệu chính.**
    - **Sửa:** CHON không tự kết thúc. Quá thời gian đó thì các ô cần lấy nhấp nháy gợi ý.
19. **Nút "Tự làm" cho bước phụ (w1) vô tình bao gồm cả CHON**, làm mất trục "đúng và đủ".
    - **Sửa:** loại CHON khỏi "Tự làm".
20. **Chuỗi "Làm quen QR" có thể kẹt.** Nếu người chơi mua Loa báo tiền từ ngày 5, bước "phát hiện ảnh chuyển khoản giả" không bao giờ xảy ra.
    - **Sửa:** Loa chặn được ảnh giả cũng tính là hoàn thành bước đó.
21. **Các chỗ lệch nhỏ:**
    - Công thức N = min(8, …) ±1 cho ra 9 khách, vượt khung "4–8".
    - Mục tiêu thưởng 25–30% ở quyết định #22 lệch với con số 22% ở bảng 9.5.
    - Ô5 Tuần Khai Trương tặng Dao, nhưng lúc đó người chơi thường đã tự mua.
22. **MVP hết nội dung sau khoảng 15 ca** (75–90 phút, ngày thật 3–4). Muỗng Vàng tích được hơn 200 mà chỉ có 90 để tiêu.
    - **Sửa:** thêm mục tiêu sau khi đủ điều kiện lên chặng (xem mục f). Bớt nguồn Muỗng Vàng ở MVP.

## (c) Phạm vi MVP

1. **Ước tính 5.000–6.000 dòng là quá thấp; thực tế khoảng 9.000–12.000 dòng**, không vừa một phiên.
   - **Sửa:** chia 3 mốc, mỗi mốc là một bản chạy được và có commit riêng.
     - **M1**: 2 món có sẵn; đủ luồng 4 khâu với tiền mặt; 6 cơ chế bếp; Thớt sơ chế; phiếu chấm tách lỗi quầy và lỗi bếp; tổng kết ca; lưu ở ranh giới giữa các khách; unit test lõi; 1 e2e.
     - **M2**: Shop, Bánh tráng trộn và nấu thử; QR cùng ảnh giả; điểm danh; nhiệm vụ ngày; hộp thư tối thiểu; chuỗi C1; Chè bưởi.
     - **M3**: PWA offline, khóa khi lùi giờ, mã sao lưu, tình huống trong ca, 20 thẻ Mẹo nghề, âm thanh, `lab.html`.
2. **Lưu ca dở tới từng bước mini-game là phần đắt**, vì phải khôi phục cả kiên nhẫn lẫn lịch khách đến.
   - **Sửa:** lưu ở ranh giới khách hoặc phiếu. Tải lại trang thì chơi lại bước đang dở với cùng seed.
3. **Cắt hoặc hoãn:**
   - Hoãn:
     - Lấy giờ máy chủ qua `ping.txt`.
     - Nén `deflate-raw`, dùng base64url là đủ.
     - Ba bản sao lưu `bak1..3`, chỉ giữ 1.
     - Khung `MIGRATIONS`, chỉ cần trường số phiên bản.
     - Màu dù mua bằng Muỗng Vàng.
     - `make-icons`, dùng PNG tĩnh cộng SVG.
     - Workflow GitHub Pages.
   - Giảm số lượng:

     | Nội dung | Hiện tại | Còn lại |
     |---|---|---|
     | Sự kiện ngày | 4 | 2 |
     | Tình huống trong ca | 3 | 1 |
     | Câu review | 70 | 25 |
     | Mẫu câu gọi món | 30 | 15 |
     | Công tắc Hỗ trợ | 4 | 2 |
4. **Phần vẽ nguyên liệu bị đánh giá thấp.** Có khoảng 25 nguyên liệu, và nhiều cặp bẫy không có emoji riêng hoặc trùng emoji:
   - Trứng gà và trứng vịt đều là 🥚.
   - Nước mắm và nước tương đều là chai.
   - Rau răm và húng quế đều là 🌿.
   - 🧅 lại chính là hành tây, tức là bẫy.
   - Không có emoji cho bánh tráng, khô bò, sa tế, trứng cút, tắc.
   - **Sửa:** mỗi ô là một SVG cộng nhãn chữ, bẫy phân biệt bằng màu và hình. Tính "bộ 25 icon SVG" thành một đầu việc riêng có thời lượng.
5. **Thông báo `file://` sẽ không hiện.** ES module không chạy qua `file://`, nên thông báo "chạy `npm run serve`" phải là HTML tĩnh hoặc script thường, không được đặt trong `main.js`.

## (d) Pháp lý và nhãn hiệu

1. **Tài liệu dùng chữ "Cooking Mama"** (tiêu đề mục 4, điểm khác biệt #2) và ghi URL trang mod lậu `miku.us.kg`.
   - **Sửa:**
     - Đổi thành "bếp thao tác từng bước" và xóa URL.
     - Thêm `tests/unit/banned-words.test.mjs` quét toàn bộ chuỗi hiển thị để cấm: Cooking Mama, iPOS, FABi, tên 5 game tham khảo, Michelin, tên ngân hàng, ví điện tử và app giao hàng (MoMo, ZaloPay, VNPay, VietQR, NAPAS, Grab, ShopeeFood…).
2. **Mã QR tĩnh:** nếu vẽ QR thật quét được, người chơi có thể quét bằng app ngân hàng.
   - **Sửa:** vẽ hoa văn giả QR không giải mã được, kèm chữ "QR GAME".
3. **Tờ tiền:** ngoài chữ "TIỀN GAME", không dùng quốc huy, dòng chữ "Ngân hàng Nhà nước Việt Nam", hay tỷ lệ kích thước giống tờ thật.
4. **Tên game:**
   - "Lên Món Nha!" cùng khuôn "… Nha!" với "Bánh Mì Một Ổ Nha!", dễ gây nhầm → loại.
   - "Bếp Khởi Nghiệp", "Muỗng Vàng", "Đũa Vàng" có thể trùng giải thưởng hoặc chương trình có thật → tra trùng ở Cục Sở hữu trí tuệ và các cửa hàng ứng dụng.
5. **Phát hành công khai:** có thể thuộc quy định phân loại trò chơi điện tử (Nghị định 147/2024/NĐ-CP, cần kiểm tra lại). Sổ số liệu và mã bài thi của học viên là dữ liệu cá nhân.
   - **Sửa:** thêm mục "Kiểm tra trước khi phát hành". MVP chỉ xuất số liệu ẩn danh.
6. **Người dùng đang làm ở iPOS:**
   - Kiểm tra điều khoản sở hữu trí tuệ trong hợp đồng lao động trước khi đưa game vào đào tạo nội bộ.
   - Không mô phỏng luồng màn hình đặc thù của sản phẩm công ty.
7. **Ảnh quảng bá:** emoji của hệ điều hành có bản quyền thiết kế, nên ảnh cửa hàng ứng dụng dùng SVG tự vẽ.

## (e) Chính tả và thuật ngữ

1. **"cay xè"** dùng cho mắt; với món ăn là **"cay xé lưỡi"**.
2. **"MV"** với người Việt là music video. Trên giao diện hiển thị icon muỗng kèm chữ "Muỗng Vàng"; "MV" chỉ dùng trong code.
3. **Hoàn hảo / Tuyệt hảo / Hoàn mỹ** là 3 từ gần nghĩa cho 3 thang khác nhau, trái với chính quyết định #9. Đổi huy hiệu thành "Không tì vết".
4. **"Tiền"** vừa là tên đơn vị vừa là danh từ chung, nên câu kiểu "Tiền không đủ" bị mơ hồ. Đổi tên đơn vị thành "Tiền quán", hoặc chỉ hiển thị số kèm "đ".
5. **"Hòm ngày" và "Rương tuần"**: thống nhất dùng một từ.
6. **"phục khắc"** là tiếng lóng của cộng đồng game gacha. Đổi thành "Món trở lại".
7. **Thuật ngữ chuyên môn:**
   - "VSATTP" là tên cũ, nên dùng "ATTP".
   - "Hóa đơn công ty" nên là "xuất hóa đơn cho doanh nghiệp".
   - "VAT" nên hiển thị "thuế GTGT (mô phỏng)", và để thuế suất thành tham số.
8. Thêm "tiền bo" và "trả lại tiền thừa" vào Sổ từ vùng miền.
9. Không để lộ lên giao diện các từ nội bộ: TNC, seed, toast, chip, par.
10. Húng quế không giống rau răm về hình. Đổi cặp bẫy thành rau răm và rau húng lủi.
11. **Ngày âm lịch:** mùng 1 Tết là 06/02/2027 và Rằm tháng Tám là 15/09/2027 đều đúng. Riêng "23 tháng Chạp" rơi vào 29 hoặc 30/01/2027 tùy tháng Chạp đủ hay thiếu, cần kiểm lại bằng bảng tra.

## (f) Ý tưởng giữ chân còn bỏ sót

1. **Mục tiêu sau khi đủ điều kiện lên chặng:** sưu tập "Không tì vết" cho cả 3 món, thạo cấp 3 cả 3 món, kỷ lục ca, và đồng hồ đếm ngược tới sự kiện 20/11.
2. **Thử thách ngày theo seed chung**, kèm thẻ kết quả chia sẻ qua Web Share API (Zalo, Facebook). Đây là vòng lan truyền duy nhất của game.
3. **Khách quen có tên ngay trong MVP:** cô Thu và bạn Nam quay lại với câu "như mọi khi nha".
4. **Cho đặt tên xe đẩy ngay ngày 1**, tên hiện trên biển xe và phiếu thu.
5. **"Món của ngày" xoay vòng** để người chơi không nấu mãi một món.
6. **Chuỗi "Liên hoàn":** nhiều bước Hoàn hảo liên tiếp thì hiệu ứng mạnh dần và tip +5%.
7. **Lưu ảnh đĩa đẹp nhất** của từng món vào Sổ công thức.

## (g) Mini-game: khả thi và độ nhàm

1. **Lặp nhiều.** Chặng 1 có khoảng 75 lần nấu bánh mì, mỗi lần 8 bước y hệt. Bánh mì có 2 bước THAI và 2 bước LUA; Bánh tráng trộn có 2 bước THAI và 3 bước CHA.
   - **Sửa:**
     - Bánh mì còn 5 bước.
     - "Tự làm" bước phụ mở từ thạo cấp 2 thay vì cấp 3.
     - Mỗi lần nấu thay đổi ngẫu nhiên theo seed: vị trí vạch thái, vùng chín, cách xếp kệ.
     - 10–15% lần nấu có biến cố nhỏ (trứng hai lòng đỏ, vỏ trứng rơi vào chảo).
2. **Thời gian chết khoảng 10–12 giây mỗi món** do thẻ gợi ý 0,8 giây và nhãn kết quả ở từng bước.
   - **Sửa:** chạm để bỏ qua thẻ; nhãn kết quả chồng lên bước kế tiếp; ẩn thẻ gợi ý sau 3 lần nấu.
3. **CHA không có kỹ năng:** điểm = tiến độ, nên cứ vuốt đủ là 100.
   - **Sửa:** chấm theo độ phủ các vùng bẩn hoặc vỏ được đánh dấu.
4. **THAI trên điện thoại khó chính xác:** ngưỡng ±3% chỉ khoảng 7–8 px, nhỏ hơn vùng ngón tay che.
   - **Sửa:**
     - Đổi thành "kéo dao để ngắm, nhấc tay để cắt". Vạch dao hiện lệch lên trên ngón tay 40 px.
     - Ngưỡng tính theo px: Hoàn hảo khi lệch ≤ 6 px. Nguyên liệu rộng ít nhất 280 px.
5. **ROT:** mực dâng nhanh dần, nên ở gần vạch 4% dung tích có thể chỉ còn khoảng 100 ms.
   - **Sửa:** giới hạn tốc độ tại vạch ≤ 25%/giây và thêm test.
6. **Thiết bị:**
   - Ngoài `touch-action:none`, cần thêm `user-select:none` và `-webkit-touch-callout:none`, chặn `contextmenu`, dùng `setPointerCapture`, chỉ nhận con trỏ chính.
   - Không dùng SVG filter trên máy Android cấu hình thấp.
   - Máy tính dùng phím Space cho các thao tác giữ và nhấn.
7. **CHON phụ thuộc vào chất lượng hình:** mỗi ô chỉ khoảng 80 px. Nếu không có hình SVG kèm nhãn chữ (xem c.4), mini-game này thành bài đọc chữ.
8. **Chuyển tab giữa các bước:** LUA và ROT phải tạm dừng khi người chơi rời bếp. Cần ghi rõ luật này.

### Critical Files for Implementation
- /home/user/gamefnb/docs/de-xuat-thiet-ke.md
- /home/user/gamefnb/src/data/balance.js
- /home/user/gamefnb/src/data/recipes.js
- /home/user/gamefnb/src/core/money.js
- /home/user/gamefnb/src/core/customer.js