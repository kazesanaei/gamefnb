# Hướng dẫn đưa game lên mạng và chơi trên điện thoại

Tài liệu này dành cho người không chuyên lập trình. Bạn không cần cài gì lên máy tính, chỉ cần trình duyệt và tài khoản GitHub (hoặc Cloudflare / Netlify nếu chọn cách thay thế).

Bếp Khởi Nghiệp là một trang web tĩnh: không có bước "build", không cần máy chủ riêng, không cần cơ sở dữ liệu. Chỉ cần đưa nguyên thư mục game lên một dịch vụ lưu trữ trang tĩnh là chơi được.

Có ba cách, chọn một:

| Cách | Hợp với | Điều kiện |
|---|---|---|
| **A. Link riêng tư claude.ai** | Thử nhanh ngay hôm nay | Người mở phải đăng nhập claude.ai; chơi offline và cài vào màn hình chính có thể không chạy |
| **B. GitHub Pages** | Chơi lâu dài, link cố định `https://kazesanaei.github.io/gamefnb/`, tự cập nhật | Gói GitHub miễn phí: phải chuyển kho sang **Public** (công khai mã nguồn) |
| **C. Cloudflare Pages hoặc Netlify** | Muốn giữ kho GitHub ở chế độ riêng tư mà không trả phí | Tự kéo thả thư mục game mỗi lần có bản mới |

---

## A. Link riêng tư claude.ai (thử nhanh)

Link chơi thử dạng `https://claude.ai/…` được gửi riêng cho bạn trong cuộc trò chuyện, không ghi vào tài liệu này.

- **Phải đăng nhập claude.ai** bằng tài khoản của bạn thì mới mở được link. Link mặc định ở chế độ riêng tư: người khác chưa được bạn chia sẻ sẽ không xem được.
- Game chạy bên trong khung trang của claude.ai, nên **chơi offline** và **"Thêm vào Màn hình chính" có thể không hoạt động** ở link này. Muốn cài như ứng dụng và chơi khi mất mạng, hãy dùng cách B hoặc C.
- Tiến trình chơi ở link claude.ai được lưu riêng, **không dùng chung** với link GitHub Pages (xem mục D).

---

## B. GitHub Pages (link công khai, miễn phí)

### B1. Đọc kỹ trước khi làm: kho sẽ thành công khai

Kho `kazesanaei/gamefnb` đang ở chế độ **Private** (riêng tư). Với gói GitHub miễn phí (Free), GitHub Pages **chỉ chạy cho kho Public**.

Khi chuyển kho sang Public:
- **Ai cũng xem được toàn bộ mã nguồn**, toàn bộ lịch sử thay đổi (commit) và **mọi tài liệu trong thư mục `docs/`** (đề xuất thiết kế, kiến trúc, cân bằng, tài liệu nghiên cứu, bản thiết kế M4…), cùng thư mục `tests/`.
- Ai cũng có thể tải về hoặc sao chép (fork) kho.
- Kiểm tra kỹ: trong kho **không có mật khẩu, khóa API hay thông tin riêng tư** nào. Nếu có, xử lý trước khi chuyển.

Nếu không muốn công khai mã nguồn, có hai lựa chọn:
- **Nâng cấp GitHub Pro** (trả phí): giữ kho Private mà vẫn bật được GitHub Pages. Lưu ý: bản thân **trang game** vẫn công khai, ai có link đều chơi được; chỉ mã nguồn là riêng tư.
- Dùng **cách C** (Cloudflare Pages hoặc Netlify), miễn phí, không cần đổi chế độ kho.

### B2. Chuyển kho sang Public

1. Mở trang kho `https://github.com/kazesanaei/gamefnb` (đăng nhập tài khoản chủ kho).
2. Bấm thẻ **Settings** (bánh răng, hàng thẻ trên cùng của kho).
3. Ở trang **General** (mở sẵn), kéo xuống cuối trang tới khung viền đỏ **Danger Zone**.
4. Ở dòng **Change repository visibility**, bấm **Change visibility** rồi chọn **Change to public**.
5. GitHub hiện hộp thoại cảnh báo: bấm lần lượt các nút xác nhận (**I want to make this repository public**, **I have read and understand these effects**, rồi **Make this repository public**). GitHub có thể hỏi lại mật khẩu hoặc mã xác thực hai bước.

### B3. Bật GitHub Pages

1. Vẫn trong **Settings**, ở cột menu bên trái, mục **Code and automation**, bấm **Pages**.
2. Ở khung **Build and deployment**, phần **Source** chọn **Deploy from a branch**.
3. Phần **Branch**:
   - Ô thứ nhất (nhánh) chọn **`claude/fb-business-game-qswti6`**.
   - Ô thứ hai (thư mục) chọn **`/ (root)`**.
   - Bấm **Save**.
4. **Chờ 1–3 phút.** Tải lại trang Settings → Pages: khi xong, đầu trang hiện dòng **"Your site is live at https://kazesanaei.github.io/gamefnb/"** và nút **Visit site**. Có thể xem tiến độ ở thẻ **Actions** của kho (dòng "pages build and deployment", dấu tích xanh là xong).
5. Link chơi: **https://kazesanaei.github.io/gamefnb/** (nhớ có `/gamefnb/` ở cuối).

Ghi chú:
- Kho đã có sẵn tệp rỗng **`.nojekyll`** ở thư mục gốc. **Đừng xóa tệp này**: thiếu nó, GitHub Pages bỏ qua các tệp có tên bắt đầu bằng dấu gạch dưới (game có tệp `src/ui/minigames/_util.js`) và các mini-game sẽ không chạy.
- Nếu ô chọn nhánh **không có** `claude/fb-business-game-qswti6`, nghĩa là nhánh này chưa được đưa lên GitHub: cần đưa (push) nhánh lên trước, rồi làm lại bước B3.

### B4. Cập nhật game

- **Mỗi lần nhánh `claude/fb-business-game-qswti6` có thay đổi mới được đưa lên (push), GitHub Pages tự cập nhật** sau 1–3 phút. Không phải bấm gì thêm.
- Trên điện thoại, game tải sẵn bản mới ở nền. Khi bạn ở màn **Chuẩn bị** (hoặc Tổng kết), game hiện thẻ **"Có bản mới"** với nút **Tải lại**: bấm là dùng bản mới, tiến trình giữ nguyên. Game không bao giờ đổi bản giữa ca. Nếu chưa thấy thẻ, đóng hẳn game rồi mở lại.

### B5. Nếu link báo lỗi

| Hiện tượng | Cách xử lý |
|---|---|
| Trang "404 – File not found" | Chờ thêm vài phút sau khi bấm Save; kiểm tra link có `/gamefnb/` ở cuối; kiểm tra Settings → Pages đã chọn đúng nhánh và thư mục `/ (root)` |
| Trang mở được nhưng vào bếp không chơi được mini-game | Kiểm tra tệp `.nojekyll` vẫn còn ở thư mục gốc của nhánh |
| Settings → Pages báo cần nâng cấp hoặc kho phải Public | Kho vẫn đang Private: làm bước B2, hoặc dùng cách C |

---

## C. Cách thay thế: Cloudflare Pages hoặc Netlify (kéo thả, không cần build)

Hai dịch vụ này cho phép **tải thẳng thư mục game lên**, không cần kho GitHub công khai. Trang game vẫn công khai với ai có link.

### C1. Chuẩn bị thư mục game

1. Trên trang kho GitHub, chọn nhánh **`claude/fb-business-game-qswti6`** (ô chọn nhánh phía trên danh sách tệp).
2. Bấm nút xanh **Code** → **Download ZIP**, rồi giải nén.
3. Game chỉ cần **3 tệp và 4 thư mục** sau (nằm ở thư mục gốc vừa giải nén):
   - `index.html`, `manifest.webmanifest`, `sw.js`
   - `css/`, `src/`, `icons/`, `fonts/` (từ bản 0.4.2 có font tiêu đề tự lưu; **thiếu `fonts/` thì game không chơi offline được**)

   Muốn có cả **Phòng mẫu giao diện** (mục F) thì chép thêm `mau.html` và thư mục `mau/`.

   Muốn không công khai tài liệu và mã kiểm thử, hãy tạo một thư mục mới (ví dụ `bep-khoi-nghiep`) và **chép riêng** các mục trên vào đó, rồi dùng thư mục mới này để tải lên. Không cần `docs/`, `tests/`, `tools/`, `package.json`.

### C2. Cloudflare Pages

1. Đăng nhập (hoặc tạo tài khoản miễn phí) tại `dash.cloudflare.com`.
2. Vào **Workers & Pages** → **Create** → chọn thẻ **Pages** → mục tải tệp trực tiếp (**Upload assets** / **Drag and drop your files**).
3. Đặt tên dự án (ví dụ `bep-khoi-nghiep`) → **Create project**.
4. Kéo thả **thư mục game** đã chuẩn bị vào ô tải lên → **Deploy site**.
5. Link có dạng `https://bep-khoi-nghiep.pages.dev`.
6. Cập nhật: vào dự án → **Create deployment** (tạo bản triển khai mới) → kéo thả lại thư mục bản mới.

### C3. Netlify

1. Đăng nhập (hoặc tạo tài khoản miễn phí) tại `app.netlify.com`.
2. Chọn **Add new site** (có nơi ghi **Add new project**) → **Deploy manually**.
3. Kéo thả **thư mục game** đã chuẩn bị vào ô tải lên. Vài giây sau có link dạng `https://<tên-ngẫu-nhiên>.netlify.app` (đổi tên được trong phần cài đặt của site).
4. Cập nhật: vào site → thẻ **Deploys** → kéo thả thư mục bản mới vào ô tải lên ở cuối trang.

Tên nút trên Cloudflare và Netlify thỉnh thoảng đổi nhẹ; ý chính luôn là "tạo trang mới, tải lên trực tiếp, kéo thả thư mục". **Không cần nhập lệnh build** nào. Nếu ô **Build command** bắt buộc, để trống hoặc ghi `exit 0`; thư mục xuất bản (output directory) là thư mục gốc của game.

---

## D. Mở trên điện thoại, thêm vào Màn hình chính, chơi offline

Dùng link GitHub Pages (cách B) hoặc Cloudflare / Netlify (cách C). Link phải bắt đầu bằng **`https://`** thì mới cài và chơi offline được.

### Android (Chrome)

1. Mở link game bằng **Chrome**.
2. Bấm menu **⋮** (ba chấm, góc trên bên phải) → **Thêm vào màn hình chính** (có máy ghi **Cài đặt ứng dụng** / **Install app**) → **Cài đặt** / **Thêm**.
   Cũng có thể cài ngay trong game: màn **Chuẩn bị** → **Cài đặt** → **Cài game**.
3. Biểu tượng **Bếp KN** xuất hiện trên màn hình chính; chạm vào là game mở toàn màn hình, cầm dọc.

### iPhone (Safari)

1. Mở link game bằng **Safari**.
2. Bấm nút **Chia sẻ** (ô vuông có mũi tên chỉ lên, ở thanh dưới hoặc thanh trên).
3. Kéo xuống, chọn **Thêm vào MH chính** (tên đầy đủ "Thêm vào Màn hình chính"; máy cài tiếng Anh ghi **Add to Home Screen**) → **Thêm**.
4. Mở game từ biểu tượng **Bếp KN** trên màn hình chính.

### Chơi khi không có mạng

- Mở game **một lần khi có mạng** và chờ vài giây để game tải đủ tệp. Vào **Cài đặt** thấy dòng báo game **sẵn sàng chơi khi không có mạng** là được.
- Từ lần sau, mất mạng vẫn mở game và bán hàng bình thường (từ biểu tượng trên màn hình chính hoặc từ link).

---

## E. Dữ liệu chơi lưu ở đâu, chuyển máy thế nào

- Tiến trình **tự lưu trong trình duyệt của từng thiết bị**. Game không có máy chủ, không cần đăng nhập, không gửi dữ liệu đi đâu.
- **Mỗi nơi mở game là một bản lưu riêng**, không tự đồng bộ với nhau:
  - Điện thoại và máy tính là hai bản lưu khác nhau; Chrome và Safari trên cùng một máy cũng vậy.
  - **Link claude.ai và link GitHub Pages là hai nơi lưu khác nhau.** Chơi ở link này thì link kia vẫn ở ngày 1.
  - Đổi sang dịch vụ khác (GitHub Pages sang Cloudflare / Netlify, hoặc đổi link) cũng là bản lưu mới.
  - Trên iPhone, game mở từ biểu tượng ở Màn hình chính có thể có bản lưu riêng, khác với khi mở trong Safari. Nên chọn một cách mở cố định.
- **Chuyển tiến trình sang máy khác hoặc link khác** bằng mã sao lưu:
  1. Ở nơi đang chơi: màn **Chuẩn bị** → **Cài đặt** → **Chép mã sao lưu** (dán mã vào ghi chú hoặc tin nhắn gửi cho chính mình), hoặc **Tải file sao lưu**.
  2. Ở nơi mới: màn mở đầu bấm **"Đã chơi ở máy khác? Nhập mã sao lưu"** (hoặc **Cài đặt** → **Nhập mã sao lưu**) → dán mã hoặc chọn file → xem trước → **Dùng bản này**. Bản đang có ở nơi mới được cất lại, không bị xóa.
- **Xóa dữ liệu duyệt web của trang** (hoặc gỡ ứng dụng đã cài) là mất tiến trình trên trình duyệt đó. Hãy sao lưu trước. Game tự nhắc sao lưu mỗi 7 ngày.
- Safari có thể tự dọn dữ liệu của trang web lâu ngày không mở. Thêm game vào Màn hình chính và sao lưu định kỳ để an toàn.
- Chỉ mở game ở **một tab**. Mở thêm tab thứ hai thì tab cũ tự khóa để không ghi đè tiến trình mới.

---

## F. Phòng mẫu giao diện (mau.html)

Phòng mẫu là trang riêng để **duyệt giao diện mới** (hình to, nút "bánh kẹo", con dấu, màn ra món…) trước khi ráp vào game. Trang có 4 thẻ lớn ở đầu:

- **Hình**: so hình cũ và hình mới ở 4 cỡ (48, 72, 120, 200) trên nền giấy và nền gỗ.
- **Gọi món**: chơi thử một lượt gọi món thật với Cô Thu: chọn món, số phần, ghi chú, đọc lại đơn, chốt order (có con dấu "ĐÃ CHỐT" và phiếu bay lên dây phiếu).
- **Bếp: Thái**: thẻ "Bước 3/6 · Thái dưa leo!" có bàn tay làm mẫu, thái dưa leo kiểu mới, con dấu theo điểm thật và lời Dì Sáu. Bốn nút tròn ở dưới để xem nhanh 4 hạng dấu.
- **Ra món**: màn ra món của 5 hạng, bật/tắt "Không tì vết" và "Lên cấp".

Nút **bánh răng** ở góc trên mở bảng **Tùy chỉnh** với 3 công tắc: **Giảm chuyển động**, **Âm thanh**, **Khung thấp** (thu phần chơi còn khoảng 300 điểm ảnh, giống màn 360×600 trong ca thật).

Phòng mẫu **không lưu gì vào bản lưu của game**, không cài vào máy, chơi thử thoải mái. Nút **Về game** đưa về trang game.

### F1. Mở Phòng mẫu

- **Link claude.ai "Bếp Khởi Nghiệp – Phòng mẫu"** (khuyên dùng để duyệt): gửi riêng trong cuộc trò chuyện. Link này nằm ở địa chỉ khác với game nên không bị ảnh hưởng bởi bản game đã cài trên máy. Người làm kỹ thuật dựng lại trang này bằng lệnh `node tools/dong-goi-artifact.mjs --entry mau.html` (lệnh in ra trang và danh sách tệp kèm để đăng).
- **GitHub Pages**: **https://kazesanaei.github.io/gamefnb/mau.html**
- Trên máy tính: chạy `npm run serve` rồi mở **http://localhost:8080/mau.html**.

### F2. Máy đã từng mở game: nhận bản mới trước

Các bản game **trước 0.4.2** trả trang game cho **mọi** link cùng địa chỉ, nên trên điện thoại đã từng mở game, link `…/mau.html` sẽ ra game thay vì Phòng mẫu. Làm một lần:

1. Mở game (link GitHub Pages hoặc biểu tượng **Bếp KN** trên màn hình chính) khi **có mạng**, chờ vài giây.
2. Ở màn **Chuẩn bị**, thấy thẻ **Có bản mới** thì bấm **Tải lại**. Chưa thấy thẻ thì đóng hẳn game (vuốt tắt ứng dụng hoặc đóng mọi tab của game) rồi mở lại, đợi thẻ hiện.
3. Kiểm tra: **Cài đặt** ghi phiên bản **0.4.2** trở lên.
4. Sau đó mới mở link `…/mau.html`.

Từ bản 0.4.2, chỉ link gốc (`…/gamefnb/`) và `index.html` mở ra game; các trang khác như `mau.html` luôn tải từ mạng. **Mất mạng** thì link Phòng mẫu mở ra game (trang mẫu không được lưu để chơi offline).

