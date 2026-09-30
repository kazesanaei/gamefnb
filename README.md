# Bếp Khởi Nghiệp

Bếp Khởi Nghiệp là game bán hàng chơi trên trình duyệt, thiết kế cho điện thoại cầm dọc. Bạn khởi nghiệp với một chiếc xe đẩy đầu hẻm: tự tay nhận order, báo tổng tiền, thối tiền, rồi vào bếp chọn nguyên liệu, rửa, thái, chiên, nêm cho từng món. Mỗi khách chấm sao riêng phần quầy và phần bếp, nên bạn biết mình sai ở đâu để sửa. Game lồng nhẹ các "Mẹo nghề" về vận hành quán ăn, dùng được để giải trí lẫn để ôn nghề cho nhân viên mới.

Bản hiện tại là **Chặng 1 "Xe đẩy đầu hẻm"** của bản MVP, đã xong cả ba mốc: M1 (lõi chơi được), M2 (kinh tế, nhiệm vụ, sự kiện) và M3 (hoàn thiện: chơi offline, sao lưu, Cài đặt, nội dung thêm).

---

## Tính năng chính

**Luồng 4 khâu cho mỗi khách**, có thanh tiến trình 4 chấm trên đầu khách:

| Khâu | Bạn làm gì |
|---|---|
| Order | Đọc câu khách gọi món (giọng Nam, giọng Bắc), ghi phiếu, đọc lại đơn cho khách nghe, chốt order |
| Thanh toán | Tự nhẩm và báo tổng tiền; khách trả tiền mặt hoặc quét QR (từ ngày 4) |
| Tính tiền | Thối tiền bằng các tờ trong két, xác nhận chuyển khoản (coi chừng ảnh chụp màn hình giả), kẹp phiếu vào bếp |
| Làm đồ | Chọn đúng và đủ nguyên liệu, sơ chế trên Thớt sơ chế, ra món, giao cho khách |

**Bếp thao tác từng bước**: 6 mini-game (chọn nguyên liệu, chà rửa, thái, chạm, canh lửa, rót). Trên Thớt sơ chế bạn tự chọn làm bước nào trước và chọn cách sơ chế (ví dụ dưa leo phải thái lát, không bào). Món được chấm Tuyệt hảo, Ngon, Được, Kém hoặc Hỏng.

**5 hệ thống giữ chân**:
1. **Việc hôm nay**: 3 việc mỗi ngày (Quầy, Bếp, Chất lượng), đủ 3 việc mở Rương ngày.
2. **Điểm danh**: 7 ô, lỡ ngày không mất ô; tuần đầu "Tuần Khai Trương" tặng hiện vật.
3. **Sự kiện ngày**: Trời mưa, Nắng nóng, Ngày lãnh lương, Chợ phiên, báo trước từ hôm trước.
4. **Chuỗi nhiệm vụ**: "Ngày đầu ra phố" của Dì Sáu (cổng lên chặng), "Làm quen QR" của Anh Khoa.
5. **Hộp thư**: thư chào mừng, quà lễ, quà đời thường, việc quên nhận, review đến muộn.

**Chợ Công Thức (Shop)**: mua món mới bằng Tiền quán (Bánh tráng trộn, Cà phê sữa đá), nấu thử miễn phí trước khi mua; mua 5 nâng cấp (Dao thép tốt, Chảo chống dính, Ghế nhựa chờ, Loa báo tiền, Máy tính cầm tay); đổi màu dù xe bằng Muỗng Vàng.

**Sự kiện có thời hạn "Tri ân 20/11"** (12–21/11/2026): gom Phấn Trắng, làm chuỗi "Nồi chè tri ân" để nhận công thức Chè bưởi giữ vĩnh viễn, đổi đồ trang trí ở Quầy đổi.

**Lên chặng**: đủ điều kiện (150 danh tiếng, sao trung bình từ 3,8, 3 công thức, 2 món thạo cấp 2, xong chuỗi của Dì Sáu, 500.000đ) thì mở màn "Quán cóc vỉa hè – sắp khai trương". Chặng 2 sẽ có ở bản sau; bạn vẫn chơi tiếp Chặng 1 với các mục tiêu sưu tập và kỷ lục.

**Hoàn thiện (M3)**:
- **Chơi offline và cài như ứng dụng**: mở game khi có mạng một lần là lần sau chơi được cả khi mất mạng; cài vào màn hình chính từ Cài đặt → Cài game (cần trang chạy qua HTTPS).
- **Sao lưu bằng mã**: Cài đặt → "Chép mã sao lưu" hoặc "Tải file sao lưu"; ở máy khác, màn mở đầu có nút "Đã chơi ở máy khác? Nhập mã sao lưu" (hoặc Cài đặt → Nhập mã sao lưu), xem trước rồi mới dùng. Bản đang chơi luôn được cất lại, không bị xóa.
- **Màn Cài đặt**: âm thanh và âm lượng, rung, 2 công tắc Hỗ trợ, Mẹo nghề, giảm chuyển động, tần suất tình huống trong ca, sao lưu, "Chơi lại từ đầu" (xác nhận 2 bước, bản cũ được cất).
- **Tình huống trong ca** (khách mở hàng bằng tờ 500k, khách quen xin ghi nợ, khách đổi ý), **Sổ tay nghề** (gom thẻ Mẹo nghề, đủ nhóm có thưởng), **Sổ công thức** (món, giá vốn, thạo món, Sổ từ vùng miền), âm thanh tổng hợp.

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

## Triển khai miễn phí lên Internet

Game là một trang web tĩnh: **không có bước build, không cần máy chủ riêng**. Bạn chỉ cần đưa nguyên thư mục dự án lên một dịch vụ lưu trữ trang tĩnh. Mọi đường dẫn trong game là đường dẫn tương đối nên chạy được cả khi trang nằm trong thư mục con.

### GitHub Pages

1. Đưa mã nguồn lên một kho (repository) trên GitHub. Với tài khoản miễn phí, kho cần để chế độ công khai (Public).
2. **Bắt buộc:** tạo một tệp rỗng tên **`.nojekyll`** ở thư mục gốc của kho (cùng chỗ với `index.html`) rồi đưa lên. GitHub Pages mặc định bỏ qua các tệp có tên bắt đầu bằng dấu gạch dưới, trong khi game có tệp `src/ui/minigames/_util.js`; thiếu `.nojekyll` thì các mini-game không chạy. Cách tạo nhanh trên GitHub: **Add file → Create new file**, đặt tên `.nojekyll`, để trống nội dung, bấm **Commit changes**.
3. Vào **Settings → Pages** của kho.
4. Ở mục **Build and deployment**, phần **Source** chọn **Deploy from a branch**.
5. Phần **Branch** chọn nhánh chứa game (ví dụ `main`) và thư mục **`/ (root)`** (thư mục gốc), rồi bấm **Save**.
6. Chờ 1–2 phút. Địa chỉ game có dạng `https://<tên-tài-khoản>.github.io/<tên-kho>/`.

### Cloudflare Pages

1. Đăng nhập Cloudflare, vào **Workers & Pages → Create → Pages**.
2. Chọn **Connect to Git** và chọn kho GitHub của game (hoặc chọn **Upload assets** rồi kéo thả cả thư mục game).
3. Cấu hình: **Framework preset** chọn **None**; **Build command** để trống (nếu ô này bắt buộc, ghi `exit 0`); **Build output directory** là thư mục gốc (`/`).
4. Bấm **Save and Deploy**. Địa chỉ có dạng `https://<tên-dự-án>.pages.dev`.

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

Thêm biến môi trường `META_SIM_LOG=1` (ví dụ `META_SIM_LOG=1 npm test` trên macOS, Linux) để in số liệu mô phỏng từng ngày (lãi, thưởng, tỉ lệ thưởng), dùng khi chỉnh cân bằng.

**Kiểm thử giao diện (e2e)** mở game trong trình duyệt Chromium ở khung điện thoại 390×844 và để "người chơi tự động" chơi thật qua giao diện:

```
npm run e2e
```

- Cần thư viện **Playwright** và trình duyệt **Chromium**. Nếu máy chưa có, cài một lần: `npm install --no-save playwright` rồi `npx playwright install chromium`.
- Toàn bộ e2e (33 kịch bản) mất khoảng 18 phút.
- Đặt biến `SHOT_DIR=<thư mục>` để lưu ảnh chụp màn hình trong lúc chạy; `E2E_VIEWPORT=1280x800` để chạy ở khung máy tính.

---

## Cấu trúc thư mục

```
index.html          trang game
css/                giao diện (màu, bố cục, màn hình, mini-game)
src/main.js         khởi động game
src/core/           luật chơi: ca bán, quầy, bếp, chấm điểm, kinh tế, lưu, nhiệm vụ, sự kiện…
                    (không đụng tới giao diện, nên kiểm thử được bằng Node)
src/data/           nội dung và số cân bằng: món, nguyên liệu, giá, khách, lời thoại,
                    Mẹo nghề, điểm danh, việc hôm nay, hộp thư, chuỗi, sự kiện, lên chặng
src/ui/             màn hình, mini-game, hình vẽ SVG, âm thanh
tests/unit/         unit test
tests/e2e/          kiểm thử giao diện bằng Playwright
tests/helpers/      máy chủ tĩnh (npm run serve), người chơi tự động
docs/               tài liệu thiết kế, kiến trúc, cân bằng
package.json        các lệnh npm (serve, test, e2e)
```

M3 thêm `manifest.webmanifest` (khai báo ứng dụng), `sw.js` (service worker để chơi offline), `icons/` (bộ biểu tượng) và `tools/make-icons.mjs` (dựng biểu tượng PNG).

Muốn đổi giá món, giá nâng cấp, phần thưởng hay lịch sự kiện: sửa trong `src/data/` (xem `docs/can-bang.md` trước), rồi chạy lại `npm test`.

---

## Tài liệu

- [`docs/de-xuat-thiet-ke.md`](docs/de-xuat-thiet-ke.md): đề xuất thiết kế gameplay (luồng 4 khâu, bếp, 5 hệ thống, kinh tế, 7 chặng, lộ trình MVP → GĐ2 → GĐ3).
- [`docs/kien-truc.md`](docs/kien-truc.md): hợp đồng kỹ thuật (cấu trúc thư mục, cấu trúc bản lưu, chữ ký hàm, danh sách `data-testid`). Khi tài liệu lệch nhau, tài liệu này là chuẩn về code.
- [`docs/can-bang.md`](docs/can-bang.md): bảng số cân bằng Chặng 1 (giá, giá vốn, thời gian, thưởng, số đo mô phỏng) và các chỉ số cần đo khi thử với người chơi thật.

---

## Lưu ý pháp lý

- Bếp Khởi Nghiệp là **game hư cấu**. Tên quán, nhân vật (Dì Sáu, Anh Khoa, cô Thu…), khách hàng, ngân hàng, ví điện tử và ứng dụng trong game đều là tên tưởng tượng.
- **Mọi con số trong game** (giá món, giá vốn, tỉ lệ giá vốn, tiền thưởng…) và trong thẻ Mẹo nghề là **số liệu minh họa**, không phải số liệu kinh doanh thật. Nội dung nghề nên được người làm bếp hoặc kế toán duyệt lại trước khi dùng để đào tạo chính thức.
- Game **không dùng thương hiệu thật**: không có tên, logo hay giao diện của ngân hàng, ví điện tử, ứng dụng giao hàng hay phần mềm bán hàng có thật. Tờ tiền trong game là hình cách điệu có chữ "TIỀN GAME"; mã QR là hoa văn giả, không quét được. Game chỉ học hỏi cơ chế của các game cùng thể loại, không dùng tên, hình ảnh, lời thoại hay mã nguồn của họ.
- Nếu dùng game để **đào tạo nội bộ trong công ty**, hãy kiểm tra điều khoản sở hữu trí tuệ trong hợp đồng lao động và xin phép công ty theo quy định sở hữu trí tuệ hiện hành trước khi dùng. Game chỉ là công cụ bổ trợ, ôn luyện; không dùng kết quả chơi để xếp loại nhân sự.
- Trước khi phát hành công khai, xem danh sách kiểm tra ở mục 16 của `docs/de-xuat-thiet-ke.md` (tra trùng nhãn hiệu, quy định về trò chơi điện tử, dữ liệu cá nhân…). Tài liệu này không phải ý kiến pháp lý.
