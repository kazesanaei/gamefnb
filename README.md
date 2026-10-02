# Bếp Khởi Nghiệp

Bếp Khởi Nghiệp là game bán hàng chơi trên trình duyệt, thiết kế cho điện thoại cầm dọc. Bạn khởi nghiệp với một chiếc xe đẩy đầu hẻm: tự tay nhận order, báo tổng tiền, thối tiền, rồi vào bếp chọn nguyên liệu, rửa, thái, gọt, đập trứng, chiên, khuấy, lắc, nêm cho từng món. Mỗi khách chấm sao riêng phần quầy và phần bếp, nên bạn biết mình sai ở đâu để sửa. Game lồng nhẹ các "Mẹo nghề" về vận hành quán ăn, dùng được để giải trí lẫn để ôn nghề cho nhân viên mới.

Bản hiện tại (**0.5.0**) là **Chặng 1 "Xe đẩy đầu hẻm"** của bản MVP, đã xong bốn mốc: M1 (lõi chơi được), M2 (kinh tế, nhiệm vụ, sự kiện), M3 (hoàn thiện: chơi offline, sao lưu, Cài đặt, nội dung thêm) và M4 (tip mới, sự kiện thưởng/phạt tiền, nguyên liệu và món hiếm). Mốc M5 đang làm lại giao diện theo kiểu game nấu ăn: bản 0.5.0 đã xong phần **Bếp** và **5 thao tác mới** (mục "Có gì mới ở 0.5.0" bên dưới); Quầy và các màn ngoài ca làm ở bản 0.5.1, 0.5.2.

---

## Tính năng chính

**Luồng 4 khâu cho mỗi khách**, có thanh tiến trình 4 chấm trên đầu khách:

| Khâu | Bạn làm gì |
|---|---|
| Order | Đọc câu khách gọi món (giọng Nam, giọng Bắc), ghi phiếu, đọc lại đơn cho khách nghe, chốt order |
| Thanh toán | Tự nhẩm và báo tổng tiền; khách trả tiền mặt hoặc quét QR (từ ngày 4) |
| Tính tiền | Thối tiền bằng các tờ trong két, xác nhận chuyển khoản (coi chừng ảnh chụp màn hình giả), kẹp phiếu vào bếp |
| Làm đồ | Chọn đúng và đủ nguyên liệu, sơ chế trên Thớt sơ chế, ra món, giao cho khách |

**Bếp thao tác từng bước**: 11 mini-game (chọn nguyên liệu, chà rửa, thái, chạm, canh lửa, rót, và từ 0.5.0 thêm đập trứng, khuấy, gọt vỏ, lắc, thả đá). Trên Thớt sơ chế bạn tự chọn làm bước nào trước và chọn cách sơ chế (ví dụ dưa leo phải thái lát, không bào). Mỗi bước được đóng dấu Hoàn hảo, Tốt, Đạt hoặc Hỏng; món được chấm Tuyệt hảo, Ngon, Được, Kém hoặc Hỏng.

**5 hệ thống giữ chân**:
1. **Việc hôm nay**: 3 việc mỗi ngày (Quầy, Bếp, Chất lượng), đủ 3 việc mở Rương ngày.
2. **Điểm danh**: 7 ô, lỡ ngày không mất ô; tuần đầu "Tuần Khai Trương" tặng hiện vật.
3. **Sự kiện ngẫu nhiên**: 12 sự kiện ngày báo trước từ hôm trước (Trời mưa, Nắng nóng, Ngày lãnh lương, Chợ phiên, và từ M4 thêm Hội thi xe sạch, Văn phòng đặt trà, Đại lý tài trợ, Tắc lên giá, Tiền điện nước, Cúp điện, Trật tự đô thị, Kiểm tra vệ sinh) cùng 11 tình huống trong ca; luôn có một cách xử lý an toàn.
4. **Chuỗi nhiệm vụ**: "Ngày đầu ra phố" của Dì Sáu (cổng lên chặng), "Làm quen QR" của Anh Khoa.
5. **Hộp thư**: thư chào mừng, quà lễ, quà đời thường, việc quên nhận, review đến muộn.

**Chợ Công Thức (Shop)**: mua món mới bằng Tiền quán (Bánh tráng trộn, Cà phê sữa đá), nấu thử miễn phí trước khi mua; mua 5 nâng cấp (Dao thép tốt, Chảo chống dính, Ghế nhựa chờ, Loa báo tiền, Máy tính cầm tay); đổi màu dù xe bằng Muỗng Vàng.

**Sự kiện có thời hạn "Tri ân 20/11"** (12–21/11/2026): gom Phấn Trắng, làm chuỗi "Nồi chè tri ân" để nhận công thức Chè bưởi giữ vĩnh viễn, đổi đồ trang trí ở Quầy đổi.

**Lên chặng**: đủ điều kiện (150 danh tiếng, sao trung bình từ 3,8, 3 công thức, 2 món thạo cấp 2, xong chuỗi của Dì Sáu, 500.000đ) thì mở màn "Quán cóc vỉa hè – sắp khai trương". Chặng 2 sẽ có ở bản sau; bạn vẫn chơi tiếp Chặng 1 với các mục tiêu sưu tập và kỷ lục.

**Hoàn thiện (M3)**:
- **Chơi offline và cài như ứng dụng**: mở game khi có mạng một lần là lần sau chơi được cả khi mất mạng; cài vào màn hình chính từ Cài đặt → Cài game (cần trang chạy qua HTTPS).
- **Sao lưu bằng mã**: Cài đặt → "Chép mã sao lưu" hoặc "Tải file sao lưu"; ở máy khác, màn mở đầu có nút "Đã chơi ở máy khác? Nhập mã sao lưu" (hoặc Cài đặt → Nhập mã sao lưu), xem trước rồi mới dùng. Bản đang chơi luôn được cất lại, không bị xóa.
- **Màn Cài đặt**: âm thanh và âm lượng, rung, 2 công tắc Hỗ trợ, Mẹo nghề, giảm chuyển động, tần suất sự kiện (M3 gọi là tần suất tình huống trong ca), sao lưu, "Chơi lại từ đầu" (xác nhận 2 bước, bản cũ được cất).
- **Tình huống trong ca** (khách mở hàng bằng tờ 500k, khách quen xin ghi nợ, khách đổi ý), **Sổ tay nghề** (gom thẻ Mẹo nghề, đủ nhóm có thưởng), **Sổ công thức** (món, giá vốn, thạo món, Sổ từ vùng miền), âm thanh tổng hợp.

**M4 (bản 0.4.0)**:
- **Tip mới**: hóa đơn từ 20.000đ mà khách chấm 5 sao thì khách bỏ hũ tip 5.000đ (một mức duy nhất). Bán kèm món thứ hai là dễ đủ hóa đơn; báo tổng thiếu thì mất tip.
- **Sự kiện thưởng/phạt tiền** theo nguyên tắc phạt công bằng: chỉ phạt khi có nguyên nhân phòng được hoặc đã báo trước, luôn có cách an toàn, có trần mỗi sự kiện và mỗi ngày (vượt thì Dì Sáu đỡ giùm). Tổng kết ca có dòng "Tiền từ sự kiện" và "Phạt, chi sự kiện". 8 sự kiện ngày và 8 tình huống mới (tiền nghi giả, người giao hàng nói đã chuyển khoản, gas hết, khách quên ví, ve chai, đoàn khách hỏi đường, khách quê gửi quà, chị bán dạo), 4 thẻ Mẹo nghề mới.
- **Tần suất sự kiện** (Cài đặt): Nhiều / Vừa / Ít, áp cho cả sự kiện ngày và tình huống; mức Ít không có khoản phạt. Không bao giờ có 2 sự kiện xấu liền nhau (xét chung sự kiện ngày và tình huống trong ca); sự kiện đã báo trước được giữ nguyên, đổi mức chỉ áp cho ngày chưa báo.
- **Nguyên liệu và món hiếm**: 3 gánh hàng quê theo giờ Việt Nam (Chợ sớm 05:00–09:00, Xe ba gác trưa 11:00–13:30, Gánh đặc sản tối 17:30–21:00) với mini-game "Lựa hàng" (lấy đúng hàng thật, tránh hàng dễ nhầm), khách lạ ghé ca đầu mỗi ngày mang quà quê, Giỏ chợ có tỉ lệ công khai. Gom 3 mảnh công thức rồi nấu thử đạt hạng Được để mở 4 món hiếm (Trà tắc mật ong rừng, Bánh mì trứng gà ta, Bánh tráng trộn Tây Ninh, Cà phê muối); mỗi phần món hiếm dùng nguyên liệu trong kho.
- Bản lưu cũ (kể cả đang dở ca) tự nâng cấp khi mở bản mới; người chơi cũ nhận thư "Có gì mới" kèm quà làm quen.

**Có gì mới ở 0.5.0 (M5 Đợt 1: bếp mới và 5 thao tác mới)**:
- **Hình mới** cho nguyên liệu, món, dụng cụ: to, viền mực nâu, khối 3 tông có bóng; nguyên liệu trên Thớt đổi sang hình đã sơ chế ngay khi làm xong bước (dưa leo thái lát, trứng ốp la, xoài gọt vỏ…). Món hiếm dùng hình món nền kèm huy hiệu ★.
- **Thớt sơ chế** là thớt gỗ lớn; mỗi bước là một huy hiệu tròn có biểu tượng thao tác, dưới là chữ trạng thái ("Tốt · 85", "Chạm để làm", "Sau: Rửa dưa leo"). Chọn cách sơ chế bằng thẻ hình.
- **Thẻ "Bước k/N"** trước mỗi bước: hình to, động từ ("Đập trứng!"), bàn tay làm mẫu đúng cử chỉ; thẻ tự chạy sau khoảng 1 giây hoặc chạm để vào ngay; nấu quen món (từ lần thứ 3) thì chỉ còn ruy băng gọn.
- **Năm thao tác mới**: **Đập trứng** (chạm quả trứng khi kim lực nằm trong vùng xanh rồi vuốt xuống, chạm mà không vuốt là vỏ rơi vào chảo), **Khuấy** (vẽ vòng tròn quanh tô, ly hoặc chén, quay vừa tay kẻo văng), **Gọt vỏ** (vuốt thẳng từ trên xuống theo từng dải vỏ), **Lắc** (kéo bình hoặc rổ lên xuống đều tay), **Thả đá** (kéo từng viên đá thả vào giữa ly rồi bấm Xong; khay luôn dư đá để ghi chú "Ít đá" có ý nghĩa).
- **Con dấu từng bước**: xong bước là con dấu theo hạng đập xuống ngay trên sân khấu, có hạt lấp lánh, sao bay về chấm bước; Dì Sáu phản ứng một câu ngắn.
- **Màn ra món** khoảng 2 giây (chạm để bỏ qua): tia sáng, huy hiệu hạng món, % đếm lên, sao, ruy băng "Không tì vết", pháo giấy khi lên cấp thạo món.
- **Chế độ tập trung** trên màn hình thấp (dưới 760 điểm ảnh): lúc đang nấu, dải khách và thanh 4 khâu tạm ẩn cho bếp rộng thêm; dây phiếu vẫn hiện để canh khách chờ.
- Nút bấm kiểu "bánh kẹo" cho toàn game, font tiêu đề tròn đậm Baloo 2 (tự lưu, chơi offline được), âm thanh riêng cho từng thao tác mới. Hiệu ứng tôn trọng công tắc "Giảm chuyển động".
- Hướng dẫn lần đầu có thêm 5 tour ngắn trên thẻ bước của 5 thao tác mới (người chơi cũ cũng được xem).
- **Không đổi cân bằng**: giá bán, giá vốn, thời gian dành cho mỗi bước, trọng số bước giữ nguyên. Bản lưu cũ (kể cả đang dở một món trên Thớt) mở bình thường; bước chưa làm hiện thao tác mới, bước đã làm giữ điểm. Người chơi cũ nhận thư "Có gì mới: bếp mới và 5 thao tác mới" (không kèm quà).

Tiến trình tự lưu trong trình duyệt của bạn. Game không có máy chủ, không cần đăng nhập, không có quảng cáo hay mua bán bằng tiền thật.

---

## Chơi thử trên máy tính

Game cần một "máy chủ tĩnh" nhỏ để chạy. Dự án đã có sẵn, bạn chỉ cần Node.js.

1. **Cài Node.js 18 trở lên** từ trang nodejs.org (chọn bản LTS). Mở Terminal (macOS, Linux) hoặc Command Prompt (Windows), gõ `node -v` để kiểm tra; thấy `v18…` trở lên là được.
2. **Tải mã nguồn** về máy: trên trang GitHub của dự án bấm **Code → Download ZIP** rồi giải nén, hoặc dùng lệnh `git clone`.
3. **Mở Terminal tại thư mục game** (thư mục có tệp `index.html` và `package.json`) và chạy:

   ```
   npm run serve
   ```

   Không cần chạy `npm install`: game không dùng thư viện ngoài.
4. **Mở trình duyệt** và vào địa chỉ **http://localhost:8080**
5. Muốn tắt máy chủ: quay lại Terminal và bấm `Ctrl + C`.

Lưu ý:
- **Không mở trực tiếp tệp `index.html`** bằng cách nhấp đúp. Trình duyệt không cho chạy mã game từ tệp trên đĩa, game sẽ chỉ hiện dòng hướng dẫn chạy `npm run serve`.
- Trên máy tính, trang game hiện gọn trong khung rộng tối đa 480px như một chiếc điện thoại. Có thể dùng chuột; phím Space thay cho thao tác nhấn giữ.
- Chỉ mở game ở **một tab**. Nếu mở thêm tab thứ hai, tab cũ tự khóa với dòng "Game đang mở ở tab khác" để không ghi đè tiến trình mới.
- Tiến trình lưu riêng theo từng địa chỉ trang (localhost, địa chỉ IP, trang đã triển khai là ba bản lưu khác nhau). Nếu xóa dữ liệu duyệt web của trang thì tiến trình trên trình duyệt đó cũng mất.
- **Trước khi xóa dữ liệu duyệt web hoặc đổi máy, hãy sao lưu**: vào Cài đặt → "Chép mã sao lưu" (dán vào ghi chú, tin nhắn) hoặc "Tải file sao lưu"; nhập lại ở màn mở đầu ("Đã chơi ở máy khác? Nhập mã sao lưu") hoặc Cài đặt → "Nhập mã sao lưu". Game nhắc sao lưu mỗi 7 ngày.
- Nếu trình duyệt không cho trang lưu dữ liệu (chế độ riêng tư, chặn dữ liệu trang web, bộ nhớ đầy), game hiện dải đỏ "Chưa lưu được tiến trình" trên cùng; khi đó hãy chép mã sao lưu trước khi đóng trang.

---

## Chơi trên điện thoại trong cùng mạng Wi-Fi

1. Trên máy tính, chạy `npm run serve` như trên. Máy chủ nhận kết nối từ các máy khác trong mạng, cổng 8080.
2. Tìm **địa chỉ IP nội bộ** của máy tính:
   - Windows: chạy `ipconfig`, xem dòng "IPv4 Address" (ví dụ `192.168.1.23`).
   - macOS: System Settings → Wi-Fi → Details (hoặc chạy `ipconfig getifaddr en0`).
   - Linux: chạy `hostname -I`.
3. Điện thoại kết nối **cùng mạng Wi-Fi** với máy tính, mở trình duyệt (Chrome hoặc Safari) và vào `http://<địa chỉ IP>:8080`, ví dụ `http://192.168.1.23:8080`.

Nếu điện thoại không vào được:
- Tường lửa của máy tính có thể chặn: cho phép Node.js nhận kết nối trong mạng riêng (Windows sẽ hỏi ở lần chạy đầu).
- Một số mạng Wi-Fi công cộng hoặc Wi-Fi dành cho khách chặn các thiết bị nhìn thấy nhau; hãy thử mạng ở nhà hoặc điểm phát Wi-Fi từ điện thoại.

Mở qua địa chỉ IP vẫn chơi đầy đủ, nhưng các tham số kiểm thử (mục bên dưới) chỉ chạy trên `localhost`, và tính năng cài game như ứng dụng, chơi offline chỉ hoạt động khi trang chạy qua HTTPS. Qua `http://<địa chỉ IP>` trình duyệt cũng không cho chép tự động mã sao lưu: hãy chạm vào ô mã, chọn hết rồi chép, hoặc dùng "Tải file sao lưu". Muốn thử đầy đủ trên điện thoại, hãy triển khai lên một trong các dịch vụ dưới đây.

---

## Phòng mẫu giao diện (mau.html)

Từ bản 0.4.2 có trang **Phòng mẫu** để duyệt giao diện mới kiểu game nấu ăn (M5 Đợt 0) trước khi ráp vào game (phong cách đã được duyệt; từ 0.5.0 phần Bếp đã ráp vào game, màn gọi món mẫu sẽ ráp ở 0.5.1): hình mới viền mực, khối 3 tông; màn gọi món có con dấu "ĐÃ CHỐT"; bước Thái kiểu mới có thẻ bước, tay làm mẫu, con dấu và Dì Sáu phản ứng; màn ra món 5 hạng. Nút bánh răng có 3 công tắc: Giảm chuyển động, Âm thanh, Khung thấp (mô phỏng phần chơi ~300 điểm ảnh như màn 360×600).

- Trên máy tính: `npm run serve` rồi mở **http://localhost:8080/mau.html**. GitHub Pages: **https://kazesanaei.github.io/gamefnb/mau.html**.
- Phòng mẫu không lưu gì vào bản lưu của game, không đăng ký service worker và không nằm trong danh sách tệp chơi offline.
- **Máy đã từng mở game bản cũ hơn 0.4.2** sẽ thấy link `mau.html` ra game (service worker cũ trả trang game cho mọi link): mở game khi có mạng, ở màn Chuẩn bị bấm **Tải lại** trên thẻ "Có bản mới" (hoặc đóng hẳn game rồi mở lại), sau đó mới mở link Phòng mẫu. Chi tiết: mục F của [`docs/huong-dan-trien-khai.md`](docs/huong-dan-trien-khai.md).
- Dựng trang artifact claude.ai: `node tools/dong-goi-artifact.mjs --entry mau.html` (không có `--entry` thì dựng trang game); lệnh kiểm mọi module, liên kết, font đều có trong danh sách tệp kèm trước khi ghi.

---

## Triển khai miễn phí lên Internet

Game là một trang web tĩnh: **không có bước build, không cần máy chủ riêng**. Bạn chỉ cần đưa nguyên thư mục dự án lên một dịch vụ lưu trữ trang tĩnh. Mọi đường dẫn trong game là đường dẫn tương đối nên chạy được cả khi trang nằm trong thư mục con (như `https://<tài-khoản>.github.io/<tên-kho>/`); e2e `tests/e2e/subpath.e2e.mjs` kiểm điều này.

**Hướng dẫn từng bước cho người không chuyên lập trình** (link riêng tư claude.ai để thử nhanh, GitHub Pages, Cloudflare Pages / Netlify, cài vào màn hình chính điện thoại, chơi offline, chuyển dữ liệu giữa các máy): [`docs/huong-dan-trien-khai.md`](docs/huong-dan-trien-khai.md).

Lưu ý chung:
- Mỗi địa chỉ trang là một bản lưu riêng: link claude.ai, link GitHub Pages, link Cloudflare / Netlify và `localhost` không dùng chung tiến trình. Chuyển tiến trình bằng mã sao lưu (Cài đặt → "Chép mã sao lưu", nơi mới → "Nhập mã sao lưu").
- Link claude.ai cần đăng nhập claude.ai; chơi offline và cài vào màn hình chính có thể không chạy trong khung đó.

### GitHub Pages

Kho của dự án: `kazesanaei/gamefnb`, nhánh game `claude/fb-business-game-qswti6`. Link sau khi bật: **https://kazesanaei.github.io/gamefnb/**

1. **Kho phải ở chế độ Public** nếu dùng gói GitHub miễn phí (Free). Chuyển ở **Settings → General → Danger Zone → Change repository visibility → Change visibility → Change to public**, rồi xác nhận theo hộp thoại. **Cảnh báo:** toàn bộ mã nguồn, lịch sử thay đổi và mọi tài liệu trong `docs/` sẽ công khai. Muốn giữ kho riêng tư thì dùng GitHub Pro (trả phí; trang game vẫn công khai) hoặc Cloudflare Pages / Netlify bên dưới.
2. Tệp rỗng **`.nojekyll`** đã có ở thư mục gốc, **đừng xóa**: GitHub Pages (Jekyll) mặc định bỏ qua các tệp có tên bắt đầu bằng dấu gạch dưới, trong khi game có tệp `src/ui/minigames/_util.js`; thiếu `.nojekyll` thì các mini-game không chạy.
3. Vào **Settings → Pages** của kho (menu trái, mục **Code and automation**).
4. Ở khung **Build and deployment**, phần **Source** chọn **Deploy from a branch**.
5. Phần **Branch** chọn nhánh **`claude/fb-business-game-qswti6`** và thư mục **`/ (root)`**, rồi bấm **Save**.
6. Chờ 1–3 phút, tới khi Settings → Pages hiện "Your site is live at https://kazesanaei.github.io/gamefnb/". Mỗi lần nhánh đó được push thêm thay đổi, Pages tự cập nhật; trong game, thẻ "Có bản mới" hiện ở màn Chuẩn bị.

Thử trên máy tính đúng như khi chạy dưới thư mục con của GitHub Pages: `node tests/helpers/static-server.mjs 8080 /gamefnb` rồi mở **http://localhost:8080/gamefnb/**.

### Cloudflare Pages

1. Đăng nhập Cloudflare, vào **Workers & Pages → Create → Pages**.
2. Chọn **Connect to Git** và chọn kho GitHub của game (hoặc tải thẳng: **Upload assets** rồi kéo thả thư mục game; cách này không cần kho công khai).
3. Cấu hình: **Framework preset** chọn **None**; **Build command** để trống (nếu ô này bắt buộc, ghi `exit 0`); **Build output directory** là thư mục gốc (`/`).
4. Bấm **Save and Deploy**. Địa chỉ có dạng `https://<tên-dự-án>.pages.dev`.

### Netlify

1. Đăng nhập Netlify, chọn **Add new site → Deploy manually**.
2. Kéo thả thư mục game vào ô tải lên (không cần lệnh build, không cần kho công khai). Địa chỉ có dạng `https://<tên-dự-án>.netlify.app`.
3. Cập nhật: thẻ **Deploys** → kéo thả thư mục bản mới.

Khi tải thẳng thư mục (Cloudflare Upload assets, Netlify Deploy manually), game chỉ cần `index.html`, `manifest.webmanifest`, `sw.js` và bốn thư mục `css/`, `src/`, `icons/`, `fonts/` (thiếu `fonts/` thì không chơi offline được). Muốn có Phòng mẫu thì thêm `mau.html` và `mau/`.

### Vercel

1. Đăng nhập Vercel, chọn **Add New → Project** và nhập kho GitHub của game.
2. **Framework Preset** chọn **Other**. Không nhập lệnh build (Build Command để trống). **Output Directory** để mặc định là thư mục gốc (nếu phải nhập, ghi `.`).
3. Bấm **Deploy**. Địa chỉ có dạng `https://<tên-dự-án>.vercel.app`.

Các thư mục `docs/` và `tests/` cũng được đưa lên cùng game. Chúng không ảnh hưởng tới việc chơi; nếu không muốn công khai tài liệu, hãy triển khai từ một bản sao không có hai thư mục này.

---

## Tham số trên địa chỉ trang dành cho kiểm thử

Thêm vào sau địa chỉ trang, ví dụ `http://localhost:8080/?seed=42&test=1`.

| Tham số | Tác dụng | Chạy ở đâu |
|---|---|---|
| `?seed=42` | Cố định chuỗi ngẫu nhiên của bản lưu mới (khách, món khách gọi, việc hôm nay…), để hai người thử cùng gặp một tình huống | Mọi nơi, nhưng **chỉ khi chưa có bản lưu**; đã có bản lưu thì bỏ qua |
| `?test=1` | Bật "Hỗ trợ thao tác" (vùng mục tiêu rộng hơn, chậm hơn) cho kiểm thử tự động | Chỉ `localhost` / `127.0.0.1`. Công tắc được lưu lại; muốn tắt thì tắt trong phần Cài đặt |
| `?devNow=2026-11-15` hoặc `?devNow=2026-11-15T08:00` | Giả giờ (giờ Việt Nam; chỉ ghi ngày thì lấy 12:00) để xem trước sự kiện, điểm danh, việc hôm nay; đồng hồ chạy tiếp từ mốc đó | Chỉ `localhost` / `127.0.0.1` |

Khi dùng `?devNow`, game **lưu vào một bản lưu riêng** (lần đầu chép từ bản lưu thật) và hiện dải "Giờ giả … · bản lưu riêng" ở trên cùng. Bản lưu thật không bị ghi mốc giờ tương lai; bỏ tham số là quay về bản lưu thật.

---

## Chạy kiểm thử

**Unit test** (luật chơi, dữ liệu, lưu tiến trình, mô phỏng nhiều ngày chơi) chạy bằng bộ kiểm thử có sẵn trong Node.js, cần **Node 22**:

```
npm test
```

Thêm biến môi trường `META_SIM_LOG=1` (ví dụ `META_SIM_LOG=1 npm test` trên macOS, Linux) để in số liệu mô phỏng từng ngày (lãi, thưởng, tỉ lệ thưởng, phiên hàng và hàng hiếm, tình huống, tiền sự kiện) và chênh lãi giữa người chơi giỏi với người chơi ẩu, dùng khi chỉnh cân bằng.

**Kiểm thử giao diện (e2e)** mở game trong trình duyệt Chromium ở khung điện thoại 390×844 và để "người chơi tự động" chơi thật qua giao diện:

```
npm run e2e
```

- Cần thư viện **Playwright** và trình duyệt **Chromium**. Nếu máy chưa có, cài một lần: `npm install --no-save playwright` rồi `npx playwright install chromium`.
- Toàn bộ e2e (khoảng 60 kịch bản) mất khoảng 18 phút.
- Đặt biến `SHOT_DIR=<thư mục>` để lưu ảnh chụp màn hình trong lúc chạy; `E2E_VIEWPORT=1280x800` để chạy ở khung máy tính.

---

## Cấu trúc thư mục

```
index.html          trang game
mau.html, mau/      Phòng mẫu giao diện M5 (trang duyệt, không thuộc bản chơi offline)
css/                giao diện (màu, bố cục, màn hình, mini-game)
fonts/              font tiêu đề Baloo 2 ExtraBold tự lưu (latin, tiếng Việt) và giấy phép OFL.txt
src/main.js         khởi động game
src/core/           luật chơi: ca bán, quầy, bếp, chấm điểm, kinh tế, lưu, nhiệm vụ, sự kiện…
                    (không đụng tới giao diện, nên kiểm thử được bằng Node)
src/data/           nội dung và số cân bằng: món, nguyên liệu, giá, khách, lời thoại,
                    Mẹo nghề, điểm danh, việc hôm nay, hộp thư, chuỗi, sự kiện, lên chặng,
                    tình huống trong ca, hàng hiếm (gánh hàng quê, khách lạ)
src/ui/             màn hình, mini-game, hình vẽ SVG (src/ui/art/: nguyên liệu, món, dụng cụ, đạo cụ,
                    hình trạng thái), hiệu ứng (vfx.js, motion.js), âm thanh
tests/unit/         unit test
tests/e2e/          kiểm thử giao diện bằng Playwright
tests/helpers/      máy chủ tĩnh (npm run serve), người chơi tự động
tests/fixtures/     dữ liệu mẫu cho test (bản lưu thật của bản 0.3.0)
tools/              dựng biểu tượng, tìm seed cho kiểm thử giao diện, đóng gói trang artifact claude.ai
docs/               tài liệu thiết kế, kiến trúc, cân bằng
package.json        các lệnh npm (serve, test, e2e)
.nojekyll           tệp rỗng, bắt buộc cho GitHub Pages (đừng xóa)
```

M3 thêm `manifest.webmanifest` (khai báo ứng dụng), `sw.js` (service worker để chơi offline), `icons/` (bộ biểu tượng) và `tools/make-icons.mjs` (dựng biểu tượng PNG). M4 thêm `src/core/rare.js`, `src/data/rare.js`, màn "Lựa hàng" `src/ui/screens/market.js` và `tools/tim-seed.mjs` (tìm seed cho e2e: `node tools/tim-seed.mjs`). M5 thêm `fonts/`, `mau.html` + `mau/`, `src/ui/art/`, `src/ui/vfx.js`, `src/ui/motion.js`, các thành phần thẻ bước, con dấu, ra món (`src/ui/components/`), 5 mini-game mới (`src/ui/minigames/dap.js xoay.js got.js lac.js bay.js`) và CSS `theme.css`, `fx.css`, `counter.css`, `mg-prep.css`, `mg-heat.css`, `mg-mix.css`.

Muốn đổi giá món, giá nâng cấp, phần thưởng hay lịch sự kiện: sửa trong `src/data/` (xem `docs/can-bang.md` trước), rồi chạy lại `npm test`.

---

## Tài liệu

- [`docs/de-xuat-thiet-ke.md`](docs/de-xuat-thiet-ke.md): đề xuất thiết kế gameplay (luồng 4 khâu, bếp, 5 hệ thống, kinh tế, 7 chặng, lộ trình MVP → GĐ2 → GĐ3).
- [`docs/kien-truc.md`](docs/kien-truc.md): hợp đồng kỹ thuật (cấu trúc thư mục, cấu trúc bản lưu, chữ ký hàm, danh sách `data-testid`). Khi tài liệu lệch nhau, tài liệu này là chuẩn về code.
- [`docs/can-bang.md`](docs/can-bang.md): bảng số cân bằng Chặng 1 (giá, giá vốn, thời gian, thưởng, sự kiện, hàng hiếm, số đo mô phỏng) và các chỉ số cần đo khi thử với người chơi thật.
- [`docs/nghien-cuu-the-loai-game.md`](docs/nghien-cuu-the-loai-game.md): tư liệu nghiên cứu các game mô phỏng cùng thể loại: bản đồ 11 thể loại, 15 nguyên tắc thiết kế (nhịp sự kiện, phạt công bằng, hàng hiếm), 26 đề xuất xếp hạng theo tác động và chi phí; cơ sở cho M4.
- [`docs/tham-khao/m4-thiet-ke.md`](docs/tham-khao/m4-thiet-ke.md): bản thiết kế triển khai M4 (tip, sự kiện thưởng/phạt, hàng hiếm).
- [`docs/tham-khao/m5-thiet-ke.md`](docs/tham-khao/m5-thiet-ke.md): bản thiết kế triển khai M5 (giao diện kiểu game nấu ăn, 5 thao tác mới, 4 đợt); [`docs/tham-khao/m5-nghien-cuu-giao-dien.md`](docs/tham-khao/m5-nghien-cuu-giao-dien.md): nghiên cứu giao diện, cảm giác thao tác và hiệu ứng của các game nấu ăn, bán hàng (chỉ học cơ chế, không dùng hình, lời thoại hay âm thanh của họ).

---

## Lưu ý pháp lý

- Bếp Khởi Nghiệp là **game hư cấu**. Tên quán, nhân vật (Dì Sáu, Anh Khoa, cô Thu…), khách hàng, ngân hàng, ví điện tử và ứng dụng trong game đều là tên tưởng tượng.
- **Mọi con số trong game** (giá món, giá vốn, tỉ lệ giá vốn, tiền thưởng…) và trong thẻ Mẹo nghề là **số liệu minh họa**, không phải số liệu kinh doanh thật. Nội dung nghề nên được người làm bếp hoặc kế toán duyệt lại trước khi dùng để đào tạo chính thức.
- Game **không dùng thương hiệu thật**: không có tên, logo hay giao diện của ngân hàng, ví điện tử, ứng dụng giao hàng hay phần mềm bán hàng có thật. Tờ tiền trong game là hình cách điệu có chữ "TIỀN GAME"; mã QR là hoa văn giả, không quét được. Game chỉ học hỏi cơ chế của các game cùng thể loại, không dùng tên, hình ảnh, lời thoại hay mã nguồn của họ.
- Nếu dùng game để **đào tạo nội bộ trong công ty**, hãy kiểm tra điều khoản sở hữu trí tuệ trong hợp đồng lao động và xin phép công ty theo quy định sở hữu trí tuệ hiện hành trước khi dùng. Game chỉ là công cụ bổ trợ, ôn luyện; không dùng kết quả chơi để xếp loại nhân sự.
- **Font chữ tiêu đề Baloo 2** (bản ExtraBold 800, cắt riêng phần chữ latin và tiếng Việt, lưu ở `fonts/`) thuộc bản quyền © 2019 The Baloo 2 Project Authors, dùng theo giấy phép **SIL Open Font License 1.1**; toàn văn giấy phép ở [`fonts/OFL.txt`](fonts/OFL.txt). Hai tệp `.woff2` là bản cắt bớt ký tự của font gốc, phát hành kèm game theo đúng giấy phép này (không bán riêng font).
- Trước khi phát hành công khai, xem danh sách kiểm tra ở mục 16 của `docs/de-xuat-thiet-ke.md` (tra trùng nhãn hiệu, quy định về trò chơi điện tử, dữ liệu cá nhân…). Tài liệu này không phải ý kiến pháp lý.
