# Nghiên cứu UI/UX, cảm giác thao tác, hoạt ảnh và VFX của game nấu ăn/bán hàng: tham chiếu để làm lại giao diện trong ca của Bếp Khởi Nghiệp

## 0. Phạm vi, quy ước và giới hạn

**Phạm vi.** Báo cáo này không lặp lại phần kinh tế/meta đã có trong `docs/nghien-cuu-the-loai-game.md` và `docs/tham-khao/m4-nghien-cuu-the-loai.json`. Ví dụ: huy chương đồng/bạc/vàng, mở khóa công thức và quà an ủi của Cooking Mama đã có trong mục `games[0]` của JSON. Lần này chỉ bàn về **màn hình, cử chỉ, hoạt ảnh và hiệu ứng**.

**Mức tin cậy:**
- **[XN]**: đã xác nhận, đọc trực tiếp trang nguồn.
- **[XN-tt]**: chỉ thấy qua trích đoạn của công cụ tìm kiếm, chưa mở được trang gốc.
- **[SL]**: suy luận hoặc kiến thức thiết kế chung. Nên xem video gameplay để kiểm trước khi đặt thành luật.

**Không truy cập được (ghi rõ để không bịa):**
- Trả HTTP 402: toàn bộ `*.fandom.com` (cookingmama, fliplinestudios, overcooked, good-pizza-great-pizza).
- Trả 403: tvtropes, gamefaqs (cả hai hướng dẫn Cooking Mama), strategywiki, gameuidatabase.com, speedrun.com, medium (bài UX của Overcooked 2), gameskinny, destructoid, twinfinite, gameshub.
- honestgamers trả 503. Blog nhà phát triển Cook Serve Delicious 2 (chubigans.tumblr) trả 429.
- Trang chi tiết Google Play bị cắt nội dung, nên chỉ dùng được trích đoạn tìm kiếm.
- Trang cs.wisc.edu về điểm của Cooking Mama: Cook Off nay trả 404 (chỉ còn trích đoạn).
- Không xem được video nào.

**Đã khảo 25 game/dòng game:** Cooking Mama (DS), Cook Off (Wii), 2, 3, 4, 5, Sweet Shop, Let's Cook! (mobile), Cuisine! (Apple Arcade), Cookstar; Good Pizza Great Pizza; Papa's (Pizzeria/Freezeria/Cupcakeria/Wingeria); Cooking Fever; Cooking Madness; Cooking Diary; Cooking City; Cook, Serve, Delicious! 1/2; Overcooked 1/2; Diner Dash; Food Truck Chef; My Café; Cafeland; Toca Kitchen 2; Venba; Cooking Simulator; Bake 'n Switch; Boba Story; Boba Tea DIY / Bubble Tea: Boba Drink Recipe (dòng "DIY ASMR"); Sushi Bar Idle; game Việt (Banh Mi Master, The Hust Banhmi, Brother Hai's Pho Restaurant, đồ án Gourviet).

### 0.1 Hiện trạng code (để so sánh khi đọc đề xuất)

| Chỗ | Hiện tại | Hệ quả |
|---|---|---|
| `src/ui/minigames/_util.js:201-224` `buildFrame` | Đầu màn có icon nhỏ, tiêu đề chữ và thanh thời gian. Bên dưới là vùng chơi, chân màn có nút. | Dụng cụ và nguyên liệu không phải nhân vật chính giữa màn. |
| `src/data/minigame-types.js:9-60` | Gợi ý toàn bằng câu chữ ("Kéo dao tới vạch chấm…"). | Phải đọc khi đang chơi. Chưa có ghost hand. |
| `src/ui/screens/kitchen.js:457-540` | Bảng thớt là các ô nguyên liệu kèm nút bước dạng chữ, trạng thái hiện bằng chữ. | Đúng chỗ người dùng chê "ô vuông có chữ". |
| `kitchen.js:587-615` `openSheet` | Trước mỗi bước hiện tấm sheet chữ với nút "Tự tay làm"/"Tự làm". | Thiếu thẻ giới thiệu bước kiểu "Bước 2/5". |
| `kitchen.js:717, 922` `flash` | Kết quả bước hiện bằng một dòng chữ kèm điểm. | Không có con dấu, hạt hay nhân vật phản ứng. |
| `kitchen.js:795-815` `showReveal` | Icon món, chữ hạng, %, mặt Dì Sáu kèm bong bóng. | Đã có khung sẵn, chỉ cần thêm hoạt ảnh và VFX. |
| `src/ui/app.js:140-147` | Rung bằng `navigator.vibrate`. | **iOS Safari không hỗ trợ** API này (caniuse [XN]), nên người chơi iPhone không bao giờ có rung. |
| `app.js:157` | Có class `reduce-motion` do người chơi bật trong Cài đặt. | Mọi VFX mới phải tôn trọng class này. |
| `src/ui/art.js:2-15, :5` | Icon SVG viewBox 64, nét 2.5, màu phẳng. Font `system-ui`. | Muốn cảm giác "game" cần font tròn đậm và icon có khối. |
| `css/kitchen.css:457-514`, `css/base.css:175` | Đã có các keyframe `k-pop`, `k-zoom`, `k-sparkle`, `k-steam`, `k-drip`, `shake`… | Đủ làm nền cho thư viện VFX ở mục E. |
| `src/data/balance.js:23-26` | Hạng bước: Hoàn hảo ≥90, Tốt ≥70, Đạt ≥50, Hỏng. Hạng món: Tuyệt hảo, Ngon, Được, Kém, Hỏng. | Dùng làm 4 mức con dấu ở mục B. |
| Quầy: `src/ui/screens/counter.js:190` (renderOrder), `:270` (doReadback), `:355` (renderPayment), `:431` (renderCash), `:537` (renderQr), `:587` (renderReceipt) | | Các chỗ cần sửa cho mục C. |
| Thành phần quầy: `components/patience.js:23` (createRing), `ticket-rail.js:21`, `cash-drawer.js:8`, `service.js:681` (renderScoreSheet) | | |

---

## 1. Bảng tra nhanh: từng game học được gì về giao diện và cảm giác

| Game | Bài học UI/feel đáng lấy | Tin cậy |
|---|---|---|
| Cooking Mama DS | Mỗi bước là mini-game dưới khoảng 10 giây. Đường chấm hướng dẫn trên nguyên liệu. Mama ra lệnh ở màn trên, người chơi làm ở màn dưới. Mắt Mama bốc lửa kèm câu "Don't worry, Mama will fix it!" rồi món vẫn tiếp tục. | [XN] Wikipedia, infinityretro, nintendolife |
| Cooking Mama: Cook Off | Sau mỗi bước hiện điểm đánh giá, điểm thời gian, tổng và bonus. Bước làm hoàn hảo được cộng thêm. | [XN] Wikipedia; thang điểm cụ thể [XN-tt] |
| Cooking Mama 4 | Mũi tên xanh chỉ thao tác nên trẻ chưa biết đọc vẫn chơi được. Khuấy bằng vẽ vòng tròn. | [XN] outcyders |
| Cooking Mama 5 | Dễ gỡ lại sau lỗi ngay trong bước, được khen. Chê: một bước bạc là mất vàng cả món. | [XN] nintendojo |
| Cooking Mama mobile (đời cũ) | Đập trứng bằng cách dừng thanh đo ở vùng xanh. Thêm nguyên liệu bằng cách bấm theo số nhấp nháy trên bát. Cuộn trứng khoảng 4 lần chạm. | [XN] pocketgamer (hands-on) |
| Cooking Mama iPhone | Nồi đổi màu và sủi bọt khi thêm đồ hay tăng lửa, nấu hỏng thì màu xấu đi. Có chế độ Luyện tập riêng. Chê: có lúc không chỉ rõ chỗ vuốt. | [XN] pocketgamer |
| Cooking Mama Sweet Shop | Trang trí không giới hạn giờ, không phạt, vẽ tự do bằng túi kem. | [XN-tt] |
| Cooking Mama: Let's Cook! | "Không có game over": ai cũng làm xong món. Bị chê quá dễ và nhiều quảng cáo. | [XN] App Store |
| Good Pizza Great Pizza | Khách nói order bằng lời, có khi đố chữ. Không có phiếu, phải nhớ. Được hỏi lại một lần và bị trừ vui. Thứ tự đế → sốt → phô mai → topping. Kéo dao theo đường kẻ, buông tay giữa chừng là cắt lệch. Lò băng chuyền có thể kéo pizza về nướng lại. Có tiếng "phạch" khi rải topping. Nét vẽ tay. | [XN] Wikipedia, App Store, touchtapplay, trang chủ |
| Papa's To Go! | Nút chuyển trạm đặt ở góc màn cho ngón cái. Phiếu kéo lên móc và phóng to được. Cắt bằng kéo đường ngang qua pizza. Sau khi giao: cảnh trống dồn, khách chấm, tiền tip rơi vào hũ. Có % riêng cho từng trạm. | [XN] App Store, flipline FAQ; cảnh trống dồn [XN-tt] |
| Papa's Freezeria / Cupcakeria / Wingeria | Kim chạy qua lại, dừng một lần ở vùng xanh. Rót tới vạch, không tràn. Topping chấm độ đều, không vón một chỗ. Mỗi hạng điểm một màu. | [XN] jayisgames, flipline FAQ, culinaryschools |
| Cooking Fever | Order là icon trong bong bóng suy nghĩ. Thanh kiên nhẫn chạy ngay khi khách đến. Tiền để lại trên quầy. Có hũ tip. | [XN-tt] |
| Cooking Madness / Cooking Diary / Cooking City / Food Truck Chef | Chạm là nấu. Combo khi giao liên tiếp. Tim hoặc like theo tâm trạng khách. Mỗi màn 3 sao. | [XN] App Store; combo Diary [XN-tt] |
| Cook, Serve, Delicious! 2 | Nhiệt kế nấu: vào vùng đỏ thì chậm một nửa, khói đen bốc lên, thanh rung mạnh. Cháy thì lửa trùm thanh. | [XN-tt] (blog nhà phát triển trả 429) |
| Overcooked 1/2 | Dùng icon để báo bước đã làm hay chưa, người chơi khỏi phải nhớ. Bỏ hệ thống mạng để lỗi nhỏ không gây áp lực. Thanh giờ của phiếu đổi xanh → vàng → cam → đỏ. Đồ sắp cháy thì kêu bíp và hiện dấu chấm than nhấp nháy, nhanh dần. Có chỉ báo cho người mù màu. | [XN] Wikipedia; màu và bíp [XN-tt] |
| Diner Dash | Tim trên đầu khách. Ghế mã màu. Chuỗi hành động giống nhau được thưởng. | [XN-tt] |
| Toca Kitchen 2 | Biểu cảm khách rất mạnh: chảy nước miếng, phì, ợ, hắt hơi văng đồ ăn. Không luật, không áp lực. | [XN-tt] |
| Venba | Câu đố công thức (sách công thức bị nhòe). Không có trạng thái thua. Tiếng xèo lách tách thật, cảm giác ASMR. | [XN] Kotaku, mobilesyrup |
| Cooking Simulator | Bài học ngược: vật lý thật nhưng điều khiển khó, rót hay bị đổ. | [XN] Wikipedia, review |
| Boba Story / Boba DIY | Mini-game lắc, đổ đầy, hứng topping rơi. Mặt nước gợn khi thả đá hay topping. Tiếng nước chảy, sủi. | [XN] App Store |
| Sushi Bar Idle | Vuốt trái sang phải để bày đĩa. | [XN-tt] |
| Game Việt | Banh Mi Master (nướng bánh, kẹp nhân, phục vụ). The Hust Banhmi (3D, xe bánh mì Bách Khoa). Brother Hai's Pho (đoạn mini-game nấu phở trong game kinh dị). Gourviet (đồ án: minh họa đồ ăn chi tiết, Bé Gạo mặc áo dài). | [XN] Steam, saigoneer; Banh Mi Master và Pho [XN-tt] |

---

## A. Danh mục mini-game kiểu "mẹ đầu bếp"

### A.1 Những điều đã xác nhận về Cooking Mama

- Mỗi bước là một mini-game dưới khoảng 10 giây. Một món có từ 1 tới khoảng 12 bước [XN Wikipedia CM, CM5].
- Bút trỏ đóng vai dao, bàn nạo, núm bếp [XN nintendolife].
- Thái: đường chấm hiện trên nguyên liệu, kéo theo cho tới khi hết đường [XN infinityretro].
- Gọt: phải vuốt thẳng xuống, nghiêng là không nhận, và phải gọt hết vỏ. Đây là thao tác bị chê ức chế nhất [XN infinityretro, NWR].
- Có dùng micro để thổi [XN nintendolife].
- Chấm theo độ chính xác và việc xong trong giờ [XN mechanicsofmagic]. Dưới hạng Bạc thì Mama mắng mắt lửa [XN NWR].
- Thang điểm Cook Off: Very Good 100, Good 50, Try Harder 0, cộng điểm thời gian 0–99, cộng bonus 100 nếu làm hoàn hảo cả bước [XN-tt].

### A.2 Bảng thao tác

Cột "BKN" ghi type mini-game hiện có, hoặc **type mới đề xuất** (in đậm).

| Thao tác | Cử chỉ và hiển thị | Phản hồi tức thì | Chấm và thời lượng | Tham chiếu và tin cậy | BKN |
|---|---|---|---|---|---|
| **Thái** | Nguyên liệu to giữa thớt (≥60% bề ngang). Đường chấm trắng viền đậm. Kéo ngón dọc theo đường, dao vẽ lệch lên trên ngón 40–60px để không bị che. | Lát tách ra trượt 6–10px rồi nghiêng. Tiếng "tách". 3–5 vụn bắn. Nhát chuẩn thì dừng hình 60ms và hiện chữ nổi "Chuẩn!". | Độ lệch so với vạch và số nhát đủ, thời gian còn lại là điểm thưởng. 3–6 giây. | CM đường chấm [XN]. GPGP: không buông tay giữa đường [XN]. Papa's: kéo đường ngang, có mua "thước cắt" [XN]. | `thai` (đã có) |
| **Băm** | Chạm nhanh, liên tục lên nguyên liệu. Dao nhảy theo mỗi chạm, nguyên liệu nhỏ dần thành đống vụn. Thanh tiến độ. | Mỗi chạm một tiếng "cộc", có thể đổi cao độ ngẫu nhiên khoảng 4%. Vụn bắn. | Đủ số chạm trong giờ (có thể chấm độ đều nhịp). 3–5 giây. | CM: "chopping is just a simple case of tapping" [XN nintendolife]. "Chạm củ cà rốt là băm" [XN pocketgamer]. | `cham` kiểu `min` |
| **Gọt vỏ** | Vuốt dọc bề mặt quả. Vỏ cuộn thành dải rơi xuống. Phần vỏ còn lại tô màu đậm. Quả tự xoay sau mỗi dải. | Tiếng "sột", dải vỏ rơi theo trọng lực, hạt nước nhỏ. | % vỏ đã gọt trừ số nhát hụt. **Cho lệch góc ±30–35°** để tránh lỗi của CM. 4–7 giây. | CM gọt thẳng xuống, nghiêng là không nhận [XN]. Dung sai là [SL]. | **`got`** (hiện đang dùng `cha`) |
| **Đập trứng** | Hai nhịp: (1) kéo quả trứng xuống mép chảo hay bát, vết nứt hiện ra; (2) vuốt ngang tách đôi vỏ. Bên cạnh trứng có thước lực nhỏ (vùng xanh). | "Cạch" khi nứt. Lòng đỏ rơi, squash khi chạm chảo, dầu xèo, vòng dầu bắn. Gõ quá mạnh thì mảnh vỏ rơi vào. | Lực (vận tốc vuốt) có trong vùng xanh không, và có rơi vỏ không. 2–4 giây mỗi quả. | Mobile cũ: dừng thanh đo ở vùng xanh [XN pocketgamer]. DS: chạm 3 lần [XN-tt]. Cook Off: vung xuống [XN-tt]. | **`dap`** (hiện là `cham`) |
| **Khuấy / trộn** | Tô to nhìn từ trên xuống. Mũi tên vòng chạy quanh. Ngón vẽ vòng tròn, các lớp màu hòa dần theo tiến độ. | Vệt xoáy theo ngón. Tiếng muỗng lách cách. Quay nhanh quá thì tràn, giọt bắn ra mép. | Số vòng đủ và tốc độ trong dải cho phép. 4–6 giây. | CM4: "drawing circles to stir", mũi tên xanh [XN outcyders]. | **`xoay`** (hiện là `cha`) |
| **Lật** | Chảo to. Mặt dưới món đổi màu dần (trắng → vàng → nâu → đen). Vuốt nhanh lên trên chảo. | Món bay lên, xoay 180°, rơi xuống squash. Tiếng "xèo" to. | Thời điểm (theo màu) và hướng vuốt. 2–4 giây. | CM: lật đồ trong chảo [XN Wikipedia]. Chờ kim vào xanh rồi bấm [XN-tt]. | Biến thể `lua` (skin `lat`) |
| **Chiên canh nhiệt** | Núm hay thanh trượt lửa. Món đổi màu thật, sủi bọt. Đồng hồ kim có vùng xanh. | Gần cháy: bíp nhanh dần, khói đen, thanh rung, kim chậm lại một nửa (cho người chơi cơ hội). Cháy: lửa trùm, rung màn nhẹ. | Vị trí kim khi nhấc. 4–8 giây. | CM thanh nhiệt [XN NWR]. Nồi đổi màu [XN pocketgamer]. CSD2 vùng đỏ chậm ½, khói, rung [XN-tt]. Overcooked bíp và dấu than [XN-tt]. | `lua` (đã có, cần thêm VFX) |
| **Rót** | Ly hoặc tô to. Giữ để rót, dòng chảy cong, mặt nước dâng và gợn. Vạch mục tiêu nhấp nháy khi gần tới. | Tiếng róc rách, cao độ tăng dần khi gần đầy [SL]. Thả tay thì có giọt rơi trễ. Tràn thì nước loang. | Độ lệch so với vạch. 2–5 giây. | Papa's kim chạy qua lại, một lần dừng [XN jayisgames]. Rót tới vạch, đừng tràn [XN-tt]. Boba DIY mặt nước gợn [XN]. | `rot` (đã có) |
| **Nêm / rắc** | Nghiêng lọ: giữ rồi lắc ngón, hoặc chạm từng nhát. Hạt rơi thành chấm trên món. Vòng mục tiêu trên mặt món. | Tiếng "sạt sạt". Hạt nảy nhẹ. Nhãn "+1" theo nấc. | Đúng số nấc và phân bố đều (Papa's chấm "không vón"). 2–4 giây. | Papa's vuốt đều trái sang phải, nhiều lượt [XN]. GPGP chạm hộp để dừng [XN]. | `cham` kiểu `targets` |
| **Nhào / bóp** | Khối bột hay vỏ bưởi to. Vuốt đẩy và kéo luân phiên, hoặc chạm trái-phải theo nhịp. | Khối squash & stretch theo ngón. Tiếng "bịch" mềm. | Độ đều nhịp. Bonus nếu đều suốt bước. 4–6 giây. | CM knead [XN]. Bonus nhồi đều [XN-tt]. | **`nhip`** (hiện `cha`) |
| **Cán** | Cây cán to. Vuốt lên xuống, bột dãn theo trục. Có vòng kích thước mục tiêu. | Bột phẳng dần, bột áo bay. | Kích thước và độ tròn. 4–6 giây. | CM roll [XN]. | **`vuot`** (có hướng) |
| **Cuốn** | Vuốt lên từng nấc. Cuộn dày dần. | "Phập" mỗi nấc. | Số nấc đều nhịp. Khoảng 4 nấc. | CM mobile: khoảng 4 chạm để cuộn trứng [XN]. | **`vuot`** hoặc **`nhip`** |
| **Giã** | Cối và chày to. Vòng thu nhỏ trùng vòng mục tiêu thì chạm (kiểu nhịp). | "Cộp" và rung nhẹ. Vụn ớt tỏi bắn. | Đúng nhịp. Hoàn hảo nếu chạm trong ±60ms. | Cookstar "Pound the Mochi" [XN-tt]. Vòng nhịp là [SL]. | **`nhip`** |
| **Vắt** | Nửa quả tắc to. Giữ rồi vuốt xoắn, hoặc chạm nhiều lần. | Giọt nước bắn, hạt rơi ra ngoài (lỗi nhẹ). | Lượng nước vắt được và số hạt lọt vào. 2–4 giây. | [SL] | `cham` (hiện có) |
| **Bày / trang trí** | Kéo thả từng món lên đĩa hoặc ly. Có túi sốt vẽ tự do. Hình cuối phản ánh đúng cách người chơi bày. | "Tách" khi đặt. Lấp lánh khi bày cân đối. | Không chấm, hoặc chấm nhẹ độ đều. **Không giới hạn giờ.** | CM xếp đĩa [XN]. Hình pizza phản ánh cách xếp [XN nintendolife]. Sweet Shop không giờ, không phạt [XN-tt]. Wingeria kéo thả [XN]. | **`bay`** (mới, trước bước Ra món) |
| **Nướng** | Lò hay vỉ than. Món đổi màu. Kéo lại vào lò để nướng thêm. | Khói, tia lửa than. | Màu đạt. 3–6 giây. | GPGP băng chuyền, kéo lại [XN]. Papa's chuông báo lò [XN]. | `lua` (skin `lo`/`than`) |
| **Lắc** | Bình hay ly to. Vuốt lên xuống đều nhịp, hoặc lắc máy (DeviceMotion) nếu được phép. | Tiếng đá lách cách. Bình nghiêng theo ngón. Bọt dâng. | Số lắc đủ và độ đều nhịp. 3–5 giây. | Boba Story "Shake" [XN]. Boba DIY lắc và nghiêng máy [XN]. CM4 lắc máy [XN-tt]. Trên iOS web phải xin quyền motion [SL]. | **`lac`** (hiện `cha`) |
| **Quạt / thổi** | Quạt than hay quạt cơm: vuốt qua lại. Mic không nên dùng trên web vì phải xin quyền. | Than đỏ rực lên, khói bay. | Số vuốt trong nhịp. | CM thổi mic [XN]. Quạt cơm sushi [XN-tt]. | `cha` kiểu `strokes` |
| **Hứng** | Topping rơi từ trên, kéo ly qua lại để hứng. | "Bộp" khi trúng. Trân châu nảy trong ly. | Số hứng được. | Boba Story "Catch" [XN]. | **`hung`** (mới, cho món sự kiện) |

### A.3 Ánh xạ sang món Việt trong game

| Món (`recipes.js`) | Bước hiện tại | Đề xuất cử chỉ và VFX |
|---|---|---|
| Bánh mì ốp la (`:31-41`) | rửa dưa (`cha`), thái dưa (`thai`), đập trứng (`cham`), chiên (`lua`), nêm (`cham`) | Đập trứng thành **`dap`** hai nhịp, lòng đỏ rơi kèm xèo. Chiên: mép trứng viền nâu dần, bọt dầu, khói nhẹ. Thêm bước tùy chọn **rạch bánh** (`thai` một nhát dọc, vụn bánh giòn bắn) và **`bay`** (kẹp trứng, dưa leo, rưới tương ớt zigzag). |
| Trà tắc (`:62-72`) | bổ tắc (`thai`), vắt (`cham`), rót trà (`rot`), đường (`cham`), lắc (`cha`) | Vắt: giọt bắn, hạt rơi. Lắc thành **`lac`**: đá lách cách, bình nghiêng, bọt dâng. Kết thúc bằng cắm ống hút và gài lát tắc lên miệng ly (`bay`). |
| Bánh tráng trộn (`:96-110`) | cắt (`thai`), gọt xoài (`cha`), thái xoài (`thai`), bóc trứng cút (`cha`), nêm (`cham`), rưới dầu hành (`rot` skin `to`), trộn (`cha`) | Gọt xoài thành **`got`** (dải vỏ xanh). Thái sợi thành băm. Bóc trứng: chạm cho nứt rồi vuốt mảng vỏ. Trộn thành **`xoay`** trong túi hoặc tô, sợi bánh tráng đổi màu dần theo sa tế. |
| Cà phê sữa đá (`:131-143`) | chế nước (`rot`), ủ phin (`lua` skin `phin`), sữa (`cham`), đá (`cham`), khuấy (`cha`) | Phin: giọt đen rơi đều (`k-drip` đã có ở `kitchen.css:457`). Sữa đặc thành `rot` dòng sánh chậm. Đá: kéo thả viên đá, nước bắn, ly đọng hơi. Khuấy thành **`xoay`**, hai lớp nâu và trắng hòa dần. |
| Cà phê muối (`:295+`) | (xem `recipes.js`) | Đánh kem muối bằng **`xoay`** nhanh, kem bông dần lên. Rót kem từ từ, phân lớp rõ. |
| Chè bưởi (`:164-180`) | gọt vỏ (`cha`), thái cùi (`thai`), bóp muối (`cha`), lăn bột (`cham`), luộc (`lua` skin `noi`), rưới cốt dừa (`rot`) | Gọt thành **`got`**. Bóp muối thành **`nhip`**/nhào. Lăn bột thành **`lac`** rổ, bột trắng phủ dần. Luộc: hạt nổi lên và trong dần, hơi nước (`k-steam`). |
| Xôi (chưa có trong dữ liệu) | | Vo nếp (`xoay` trong rổ nước), đồ xôi (canh hơi nước), xới (`vuot`), rắc đậu và hành phi (`cham targets`). |

---

## B. Luồng một công thức

### B.1 Những gì đã xác nhận ở các game tham chiếu

- **Lời dặn và chỗ thao tác tách nhau.** Cooking Mama đặt lời dặn của Mama ở màn trên, thao tác ở màn dưới [XN Wikipedia]. Bản di động bị chê có lúc không chỉ rõ chỗ vuốt [XN pocketgamer].
- **Mỗi bước được chấm riêng.**
  - Cook Off: điểm đánh giá, điểm thời gian, tổng, bonus [XN-tt].
  - Cookstar: 3 sao cho mỗi bước [XN-tt].
  - Papa's: % từng trạm, mỗi hạng một màu [XN-tt Steam guide].
- **Phản ứng của nhân vật hướng dẫn.**
  - Làm hỏng: mắt lửa, "Don't worry, Mama will fix it!", món vẫn tiếp tục [XN].
  - Làm tốt: "Wonderful! Better than Mama!" [XN-tt], mắt lấp lánh và ôm người chơi [XN-tt].
  - Chế độ Let's Cook! của CM2 bỏ lời dặn giữa các bước, bạn bè phản ứng "It's Delicious!" [XN Wikipedia CM2].
- **Trình bày món.**
  - CM cho bày và trang trí tự do, chụp ảnh [XN-tt].
  - Papa's: sau khi giao có cảnh trống dồn, khách chấm, tip rơi vào hũ, điểm hiện ra [XN-tt].
- **Không cần nhớ bước.** Overcooked dùng icon cho bước đã làm và chưa làm [XN].
- **Làm lại.** CM có chế độ Luyện tập riêng [XN pocketgamer]. CM5 cho gỡ lỗi ngay trong bước [XN].

### B.2 Đề xuất luồng cho Bếp Khởi Nghiệp

Thời lượng ghi trong ngoặc. Các mục này là [SL] dựa trên các nguồn ở B.1.

1. **Thẻ vào bước** (900–1200 ms, chạm để bỏ qua). Thay sheet chữ ở `kitchen.js:587-615` cho nhánh "Tự tay làm"; nút "Tự làm" chỉ còn là lựa chọn phụ.
   - Dải trên: "Bước 2/5".
   - Giữa: dụng cụ hoặc nguyên liệu **to**, chiếm khoảng 45% bề ngang, xuất hiện bằng `k-zoom` (`kitchen.css:504`).
   - Động từ 1–3 chữ, cỡ chữ 28–32px: "Thái dưa leo!".
   - Ghost hand diễn mẫu cử chỉ một lần.
2. **Thanh bước bằng icon**, cố định ở đầu màn mini-game (đưa vào `buildFrame`, `_util.js:201`).
   - Chuỗi icon tròn 28–32px.
   - Bước hiện tại phóng to 1.2× và nảy nhẹ.
   - Bước xong có dấu tick và viền màu theo hạng.
   - Thay danh sách chữ ở `kitchen.js:265-279`.
3. **Chuyển cảnh giữa bước** (300–400 ms, ease-out). Thớt trượt ngang hoặc khăn lau qua (`k-wipe` đã có). Nguyên liệu đã sơ chế bay theo đường cong vào khay "Sẵn sàng" (`kitchen.js:482`).
4. **Con dấu kết quả bước.** Thay dòng `flash` chữ ở `kitchen.js:717/922`.
   - Chung: dấu đập xuống, scale 1.6 → 1 trong 220 ms, xoay −8°, dừng hình 60 ms, rung 15 ms.
   - **Hoàn hảo**: màu vàng, 10–14 hạt lấp lánh, sao bay về thanh bước.
   - **Tốt**: màu xanh lá, vài hạt.
   - **Đạt**: màu xanh dương nhạt, không hạt.
   - **Hỏng**: màu đỏ xám, khói đen nhẹ, rung ngang 4px. Dì Sáu nói "Để Dì gỡ cho, làm tiếp nha!" rồi **tiếp tục** món. Bước chí mạng vẫn theo `criticalPrompt` (`kitchen.js:723`).
5. **Dì Sáu phản ứng.** Đã có 4 mặt ở `art.js:739-745`.
   - Thêm các tư thế động: giơ ngón cái, vỗ tay, lau mồ hôi, che mặt.
   - Bong bóng một câu ngắn, mỗi mức có 3–5 câu xoay vòng.
   - Đặt ở góc trên, **không che vùng chơi**.
   - Không dùng mắt lửa hay câu thoại của Mama (xem mục G).
6. **Màn ra món** (`showReveal`, `kitchen.js:795-815`):
   - Nền tia sáng (sunburst) xoay chậm, 10 giây một vòng.
   - Món phóng 0.4 → 1.1 → 1 trong 450 ms với easeOutBack, có lắc lư nhẹ.
   - 8–12 hạt lấp lánh.
   - Hạng món thành **huy hiệu hoặc con dấu tự vẽ** rơi xuống (400 ms).
   - % đếm từ 0 lên trong 600–800 ms, có tiếng tick và chuông cuối.
   - "Không tì vết" hiện thành ruy băng. Lên cấp thạo món thì có confetti.
   - Chạm để tiếp.
   - Nếu có bước `bay`, hình món phải phản ánh cách người chơi bày (như CM).
7. **Làm lại.** Giữ cơ chế làm lại có phí đang có (`kitchen.js:595`). Thêm chế độ **Luyện tập** từng mini-game ngoài ca, không phí, không thưởng tiền, kèm kỷ lục cá nhân. Quyết định kinh tế cho chế độ này thuộc tài liệu cân bằng.

---

## C. UI gọi món, chốt order, thanh toán

### C.1 Mẫu đã xác nhận

- **Khách và order.**
  - Cooking Fever: order là icon trong bong bóng trên đầu khách, thanh kiên nhẫn chạy ngay khi khách đến, tiền để lại trên quầy, có hũ tip [XN-tt].
  - Diner Dash: tim trên đầu khách, mất dần theo thời gian chờ, hết tim thì khách bỏ đi [XN-tt].
  - GPGP: khách có thanh vui; emote bối rối hoặc giận; phản ứng tốt/tệ/tạm kèm tip; nét vẽ tay kiểu cartoon phương Tây [XN-tt, XN Wikipedia].
  - Toca Kitchen: biểu cảm khách là phần thưởng chính [XN-tt].
  - My Café: chọn câu thoại với khách [XN].
- **Phiếu order.**
  - Papa's: nút "Take Order" ngay trên đầu khách; phiếu kéo lên móc và phóng to được; hàng icon trên cùng là món phụ [XN, XN-tt].
  - Overcooked: hàng phiếu ở đầu màn, thanh giờ đổi xanh → vàng → cam → đỏ; giao đúng thứ tự thì tip có hệ số [XN-tt].
  - Overcooked bị góp ý icon phiếu quá nhỏ khi nhìn lướt [XN-tt].
- **Thu tiền.** Papa's có trống dồn, khách chấm, tip vào hũ, rồi hiện % từng trạm [XN-tt]. Combo khi giao liên tiếp: Cooking Madness và Cooking Diary [XN].
- **Hoạt ảnh tiền** [XN gameeconomistconsulting]:
  - Tiền phải **chảy từ nguồn vào đúng chỗ ví trên HUD**.
  - Dừng giữa đường một nhịp cho người chơi ngắm (Brawl Stars).
  - Số icon bay khớp với số nhận được.
  - Bay tỏa ra chứ không xếp hàng thẳng.
  - Mỗi loại tiền một âm riêng.

### C.2 Đề xuất cho quầy (`counter.js`)

- **Bố cục dọc.**
  - 45% trên là cảnh phố hoặc quầy xe đẩy. Khách đứng cao 35–45% màn, nửa thân trên.
  - Mặt khách có 4–5 trạng thái, nối với vòng kiên nhẫn (`patience.js:12` `moodFor`).
  - Vòng kiên nhẫn ôm quanh mặt khách hoặc ở chân khách.
  - Khách sắp hết kiên nhẫn: hơi nước bốc khỏi đầu, rung nhẹ, bíp chậm.
- **Bong bóng order** (`renderOrder`, `:190`):
  - Icon món 56–72px, badge "×2" góc phải.
  - Ghi chú bằng icon: "Không hành" là icon hành gạch chéo đỏ, "Cay" là trái ớt, "Ít đá" là viên đá kèm mũi tên xuống.
  - Kèm một câu nói tự nhiên ngắn.
  - Khách khó (đố chữ kiểu GPGP) dùng bong bóng chữ, có nút "Hả?" hỏi lại.
- **Đọc lại order** (`doReadback`, `:270`): từng dòng hiện lần lượt (120 ms mỗi dòng), khách gật đầu và mặt vui khi đúng.
- **Phiếu order.**
  - Giấy kem có dòng kẻ, mép răng cưa, ghim gỗ trên đầu.
  - Mỗi dòng: icon 40–48px, tên, ×n, chip ghi chú.
- **Chốt order.**
  - Con dấu "ĐÃ CHỐT" đập xuống: scale 1.8 → 1 trong 200 ms, xoay −8°, rung màn 2px trong 120 ms, tiếng "cộp".
  - Rồi phiếu bay theo đường cong (450 ms, ease-in-out) lên ray phiếu (`ticket-rail.js:21`).
- **Ray phiếu** (giống bếp thật):
  - Phiếu nhỏ, icon món to, dải màu chờ ở đáy (xanh → vàng → cam → đỏ, theo Overcooked).
  - Phiếu đỏ nhấp nháy viền, tối đa 2 lần mỗi giây.
- **Bảng menu.** Gỗ hoặc phấn. Mỗi món một thẻ: icon 64px, tên, giá. Món hết hàng dán băng "HẾT" chéo. Món hiếm có viền vàng lấp lánh chậm.
- **Thanh toán** (`renderPayment :355`, `renderCash :431`, `renderQr :537`):
  - Tiền mặt: tờ polymer to, mỗi mệnh giá một màu, kéo thả vào khay. Thả tiền thì tiếng "phạch" và tờ tiền squash nhẹ.
  - QR: điện thoại khách đưa ra, quét có tia sáng chạy qua, "ting".
- **Tiền vào két** (`cash-drawer.js:8`):
  - 6–12 xu hoặc tờ tiền bay theo đường cong, so le 40 ms.
  - Két nảy 1.15 → 1 khi nhận.
  - Số tiền HUD đếm lên trong 500–700 ms.
- **Tip** là xu vàng riêng, kèm chữ "+5k tip" nổi lên và âm khác tiền thường.
- **HUD.**
  - Trên trái: két tiền.
  - Giữa: giờ ca (thanh mặt trời đi từ sáng đến tối).
  - Trên phải: sao hoặc danh tiếng.
  - Mục tiêu ngày: thanh có 3 mốc sao (Food Truck Chef, Overcooked).
  - HUD chỉ để đọc. Nút bấm đặt ở 1/3 dưới màn.
- **Hàng chờ.** Khách sau xếp nhỏ dần (100% / 80% / 65%), bong bóng "…" nhỏ. Combo giao liên tiếp hiện "Liên hoàn ×3" ở cạnh két.
- **Phiếu chấm sao** (`service.js:681`): sao rơi lần lượt (180 ms mỗi sao, nảy). Tip tách riêng. Khách phản ứng bằng biểu cảm mạnh (kiểu Toca), không chỉ bằng chữ.

---

## D. Ngôn ngữ thị giác chung (chủ yếu [SL], có ghi nguồn khi có)

- **Bảng màu.**
  - Nền kem ấm, gỗ nâu mật ong, gạch men xanh ngọc cho bếp.
  - Màu nhấn cam, đỏ cà chua, vàng nghệ.
  - Đúng là xanh lá, sai là đỏ, nhưng **luôn kèm icon hoặc hình dạng** (Overcooked thêm chỉ báo cho người mù màu [XN-tt]).
- **Nút "bánh kẹo".**
  - Viền mực 3px.
  - Gradient sáng ở trên, đậm ở dưới; vệt bóng trắng hình elip mờ khoảng 35% ở nửa trên.
  - Bóng cứng `0 4px 0` màu đậm hơn.
  - Khi bấm: `translateY(3px)`, bóng còn 1px, scale 0.97, trong 80 ms.
  - Hiện `base.css` chỉ có bóng 2px (`base.css:111`).
- **Font tròn đậm.** Baloo 2 có subset tiếng Việt và 5 độ đậm 400–800 [XN-tt]. Tự host file woff2 subset vietnamese để PWA chạy offline, thay `system-ui` ở `art.js:5` và `--font`. Giấy phép OFL cần kiểm lại [SL].
- **Chất liệu khung.** Phiếu giấy (mép răng cưa), bảng gỗ (vân bằng SVG pattern nhẹ), bảng phấn cho menu và giá, khay inox cho tiền.
- **Icon có khối.**
  - Giữ viền đậm của `art.js`.
  - Thêm một lớp tối nửa dưới, một chấm sáng góc trên trái, một bóng elip dưới chân.
  - Ở sân khấu mini-game, nguyên liệu vẽ **160–240px**. SVG phóng được, nhưng nên có biến thể chi tiết: lát cắt, vỏ, ruột.
- **Nền cảnh.** Xe đẩy hoặc ki-ốt (mái bạt sọc, biển hiệu đèn), bếp (gạch men, thớt gỗ, chảo gang). Parallax 2 lớp khi chuyển trạm. Đổi màu trời theo giờ (Tiệm Mì Cay đã làm, `nghien-cuu-game-tham-khao.json`).
- **Bố cục dọc theo vùng ngón cái.**
  - 49% người cầm máy một tay, 75% thao tác bằng ngón cái [XN-tt Hoober].
  - 1/3 trên: HUD và khách.
  - 1/3 giữa: dụng cụ và nguyên liệu (vùng chơi).
  - 1/3 dưới: nút hành động chính, cao 56–64px.
- **Không chép phong cách đặc trưng** (nét vẽ tay GPGP, nhân vật Papa's, xem mục G).

---

## E. Thư viện VFX và hoạt ảnh

**Nguồn số liệu chung:** valdemird.com [XN]. Easing chuẩn:
- easeOutBack: `cubic-bezier(0.175, 0.885, 0.32, 1.275)` [XN-tt].
- spring: `cubic-bezier(0.34, 1.56, 0.64, 1)` [XN].

**Nguyên tắc chung:**
- "Juice" là lớp phủ lên một cơ chế đã chạy tốt, không được là phần chịu lực [XN valdemird; GDC "Juice it or lose it"].
- Chỉ animate `transform` và `opacity`.
- Dùng một lớp phủ dùng chung (`pointer-events: none`), pool phần tử DOM hoặc một canvas.
- Tối đa khoảng 40 hạt trên màn.
- Kiểm `html.reduce-motion` **và** `prefers-reduced-motion` ở đầu mọi hàm hiệu ứng [XN MDN].

| Hiệu ứng | Dùng khi | Thời lượng / easing | Ghi chú | Khi giảm chuyển động |
|---|---|---|---|---|
| Lấp lánh | Hoàn hảo, món ra, món hiếm | 8–14 hạt, sống 0.55–0.95 s, ease-out | `k-sparkle` đã có. Số hạt tăng theo bậc [XN valdemird]. | Tối đa 3 hạt, không bay |
| Hơi nóng / khói | Nồi, chảo, phin, xôi | Vòng 1.6–2.4 s, ease-in-out, opacity 0 → 0.5 → 0 | `k-steam`. Khói đen khi sắp cháy (CSD2). | Giữ, chậm hơn |
| Xèo dầu | Đập trứng, chiên | 6–10 giọt, 300–500 ms, đường parabol | Đi kèm tiếng `sizzle` (`_util.js:191`). | Giữ âm, bỏ giọt |
| Nước bắn | Thả đá, vắt, rót tràn | 5–8 giọt, 350 ms; vòng gợn 400 ms | Boba DIY gợn mặt nước [XN]. | Chỉ vòng gợn |
| Vụn rau / vụn bánh | Thái, băm, rạch bánh | 3–6 mảnh, 400–600 ms, xoay ngẫu nhiên, trọng lực | Mảnh lấy màu của nguyên liệu. | Bỏ |
| Sao bay | Kết quả bước, phiếu chấm | 350–500 ms, đường cong Bézier tới thanh bước hoặc HUD, ease-in | Đích nảy khi sao chạm tới. | Hiện thẳng tại đích |
| Tiền bay | Thu tiền, tip | 6–12 icon so le 40 ms, mỗi icon 450–600 ms; dừng giữa đường 120 ms; số đếm lên 500–700 ms | Khớp số, đi đúng hướng ví, âm riêng [XN gameeconomistconsulting]. | Chỉ đếm số |
| Confetti | Lên cấp thạo món, đạt mục tiêu ngày | 30–40 mảnh, 1.2–1.8 s | Dùng tiết kiệm, chỉ cho mốc lớn. | Bỏ |
| Rung màn | Cháy, chốt order, sự kiện lớn | 120–600 ms, biên độ 2–6px, giảm dần, kèm xoay vài phần mười độ ở mức lớn [XN valdemird] | `base.css:175` hiện là ±6px ngang. Nên có 3 cỡ. | Bỏ |
| Dừng hình (hit-stop) | Nhát thái chuẩn, con dấu | 60–90 ms [XN valdemird] | Chỉ dừng, không thêm chuyển động. | Giữ (không phải chuyển động) |
| Squash & stretch | Trứng rơi, món lật, bột, nút | 420 ms: 0.88 → (1.05, 0.92) → (0.99, 1.02) → 1, gốc biến hình ở đáy [XN valdemird] | Theo nguyên lý Disney [XN-tt]. | scale ≤ 2% |
| Nảy vào (pop-in) | Thẻ bước, bong bóng, icon | 250–450 ms, easeOutBack | `k-pop`, `k-zoom` đã có. | Chỉ fade |
| Chữ nổi điểm | +điểm, "Chuẩn!", "+5k" | 600–800 ms, bay lên 30–50px, fade cuối | `popLabel` 700 ms (`_util.js:240`). Đặt **trên** ngón tay. | Đứng yên rồi fade |
| Combo | Giao liên tiếp, nhát chuẩn liên tiếp | Bậc 3/5/10; mỗi bậc thêm hạt và cao độ (+16 Hz mỗi nhịp, trần 24) [XN valdemird]; mất chuỗi sau khoảng 1.6 s không thao tác | Rung màn chỉ từ bậc cao. | Chỉ đổi số |
| Con dấu | Chốt order, kết quả bước, hạng món | 200–250 ms, scale 1.6–1.8 → 1, xoay −8°, kèm dừng hình | Tiếng "cộp". | Hiện thẳng |
| Gợn chạm | Mọi pointerdown trên vùng chơi | 250 ms, scale 0 → 1, opacity 0.4 → 0 | Phản hồi dưới 100 ms. | Giữ |
| Phát sáng gợi ý | Chỗ cần thao tác | Vòng 1.2 s | `k-hint` đã có, không xê dịch ô. | Viền tĩnh |
| Dòng rót / mực dâng | `rot` | Liên tục, mặt nước dao động sin biên độ 1–2px | Vạch mục tiêu nhấp nháy khi gần (≤ 2 Hz). | Bỏ dao động |
| Cảnh báo cháy | `lua` gần vùng đỏ | Bíp nhanh dần; thanh rung; kim chậm ½ | Theo CSD2 và Overcooked [XN-tt]. | Giữ âm, bỏ rung |
| Sunburst | Màn ra món | Xoay 10 s một vòng, tuyến tính | | Tĩnh |

**Âm thanh tổng hợp** (`src/ui/audio.js`): attack khoảng 12 ms, decay theo hàm mũ, mỗi lần phát lệch cao độ ngẫu nhiên khoảng 4% để không lặp đều đều [XN valdemird].

---

## F. 10 nguyên tắc UX cho thao tác cảm ứng trong game nấu ăn

1. **Vùng chạm ≥ 44pt (Apple) hoặc 48dp (Material)** [XN-tt]. Dụng cụ kéo được (dao, ly, chai) nên ≥ 64px. Khoảng cách giữa các đích ≥ 8px.
2. **Phản hồi trong 100 ms** (giới hạn "tức thì" của Nielsen [XN]). Phát hiệu ứng ngay ở `pointerdown`, không đợi `pointerup`. Hình và âm ra cùng một khung hình.
3. **Chỉ bằng hình thay cho chữ.**
   - Ghost hand diễn mẫu 1–2 lần, mũi tên động, phát sáng vùng chạm (CM4 dùng mũi tên xanh [XN]).
   - FTUE nên dạy bằng cách cho làm thật [XN-tt].
   - Các `hint` chữ ở `minigame-types.js` chỉ còn là chú thích phụ.
4. **Không để ngón tay che thông tin.**
   - Thước đo, chữ nổi, dao vẽ lệch lên trên điểm chạm 40–80px.
   - Thanh đo đặt phía trên vùng chơi.
   - Nút hành động ở 1/3 dưới, đúng vùng ngón cái [XN-tt Hoober].
5. **Dung sai rộng cho hướng và tốc độ.** Chấm theo ý định (góc ±30°, vận tốc theo dải), tránh lỗi gọt vỏ của CM [XN infinityretro].
6. **Mỗi bước một động tác chính, không phải đọc khi đang chơi.** Tên bước ≤ 4 chữ. Trạng thái bằng icon (Overcooked [XN]).
7. **Lỗi gỡ được, không có game over.**
   - Sai trong bước thì tiếp tục được (CM5 [XN]).
   - "Dì gỡ cho" thay cho thua.
   - Có chế độ Luyện tập (CM iPhone [XN]).
   - Thời gian chủ yếu là điểm thưởng, không phải điều kiện thua (Overcooked bỏ hệ thống mạng [XN]).
8. **Bước dài 3–10 giây** (CM dưới khoảng 10 giây [XN]). `par` của BKN là 3–8 nên giữ nguyên. Thanh thời gian chỉ chuyển đỏ ở 25% cuối (`_util.js:221` đang dùng ngưỡng 0.75, hợp lý).
9. **Phản hồi nhiều kênh, nhất quán theo nghĩa.**
   - Mỗi nghĩa một âm. Rung chỉ cho sự kiện quan trọng. Haptic dùng nhất quán, không lạm dụng [XN-tt Apple HIG].
   - **iOS:** `navigator.vibrate` không có [XN caniuse]. Có mẹo dùng `<input type="checkbox" switch>` kèm `<label>.click()` để phát haptic trên Safari iOS 18 trở lên [XN ionic #29942].
   - Có báo cáo vibrate chạy trên iOS mới, nhưng chưa được xác nhận [XN mdn/bcd #29166].
   - Nên thêm nhánh dự phòng trong `app.js:140-147`.
10. **Tôn trọng giảm chuyển động và an toàn thị giác.**
    - Dùng cả `prefers-reduced-motion` [XN MDN] lẫn công tắc trong game (`app.js:157`).
    - Rung màn ≤ 6px. Không nhấp nháy quá 3 lần mỗi giây (ngưỡng WCAG 2.3.1, nguồn chưa mở trong phiên này, [SL]).
    - Vùng chơi đặt `touch-action: none` và dùng `setPointerCapture` để vuốt không cuộn trang [SL].

---

## G. Lưu ý pháp lý (không phải tư vấn luật)

**Căn cứ.** Vụ Tetris Holding kiện Xio (Mỹ, 2012): luật chơi và chức năng không được bảo hộ bản quyền. Nhưng phần biểu đạt (hình, màu, kiểu dáng của khối) bị coi là "arbitrary flourishes", tức nét trang trí tùy ý, và thắng cả bản quyền lẫn **trade dress** [XN-tt Loeb, courtlistener].

Suy ra: được học cơ chế (đường chấm, thước vùng xanh, vẽ vòng tròn, hũ tip, phiếu trên ray), nhưng **mọi hình, chữ, âm phải tự làm**.

**Không được dùng:**
- Hình bà mẹ đầu bếp kiểu Mama, chiêu mắt bốc lửa, các câu "Better than Mama", "Mama will fix it", chữ "Mama" trong tên.
- Nhân vật hay tên Papa Louie, bố cục 4 trạm có nút góc y hệt Papa's.
- Nét vẽ tay đặc trưng và tuyến đối thủ "tiệm bên kia đường" của GPGP.
- Bong bóng suy nghĩ cùng dáng và cùng bảng màu của Cooking Fever.
- Huy chương hay con dấu giống hình gốc.
- Bất kỳ âm thanh, nhạc, font hay logo trích từ game khác.

**Được làm:**
- Vẽ SVG riêng trong `art.js` (nhân vật Dì Sáu, đồ Việt).
- Câu thoại tiếng Việt tự viết.
- Âm tổng hợp trong `audio.js`.
- Font giấy phép mở.
- Đặt tên mini-game bằng từ chung (thái, gọt, đập…).

**Lưu ý thêm.** Tiêu chí của tòa Mỹ không áp thẳng sang Việt Nam. Trước khi phát hành nên tham khảo Luật Sở hữu trí tuệ Việt Nam [SL].

---

## Nguồn

**Cooking Mama**
- https://en.wikipedia.org/wiki/Cooking_Mama_(video_game)
- https://en.wikipedia.org/wiki/Cooking_Mama:_Cook_Off
- https://en.wikipedia.org/wiki/Cooking_Mama_2:_Dinner_with_Friends
- https://en.wikipedia.org/wiki/Cooking_Mama_3:_Shop_%26_Chop
- https://en.wikipedia.org/wiki/Cooking_Mama_5:_Bon_App%C3%A9tit!
- https://apps.apple.com/us/app/cooking-mama-lets-cook/id987360477
- https://apps.apple.com/us/app/cooking-mama-cuisine/id1563901930
- https://infinityretro.com/cooking-mama-review/
- https://www.nintendolife.com/reviews/2007/02/cooking_mama_ds
- http://www.nintendoworldreport.com/review/11902/cooking-mama-nintendo-ds
- https://www.pocketgamer.com/cooking-mama-iphone/review/
- https://www.pocketgamer.com/cooking-mama/hands-on-with-mobile-cooking-mama/
- https://www.outcyders.net/parents-guide/cooking-mama-4
- https://www.nintendojo.com/reviews/review-cooking-mama-5-bon-appetit
- https://www.cgmagonline.com/review/game/cooking-mama-sweet-shop-review/
- https://mechanicsofmagic.com/2022/04/12/mda-cooking-mama/
- Trích đoạn tìm kiếm: https://www.chaptercheats.com/cheat/wii/25243/cooking-mama/hint/60011, https://www.chaptercheats.com/cheat/wii/25243/cooking-mama/hint/60012, https://www.nintendolife.com/reviews/nintendo-switch/cooking_mama_cookstar

**Good Pizza Great Pizza**
- https://apps.apple.com/us/app/good-pizza-great-pizza/id911121200
- https://en.wikipedia.org/wiki/Good_Pizza,_Great_Pizza
- https://goodpizzagreatpizza.com/
- https://www.touchtapplay.com/how-to-play-good-pizza-great-pizza-tips-tricks/
- https://ladiesgamers.com/good-pizza-great-pizza-review-switch/

**Papa's**
- https://apps.apple.com/us/app/papas-pizzeria-to-go/id925494667
- https://i.flipline.com/games/papasfreezeria/faq.html
- https://jayisgames.com/review/papas-freezeria.php
- https://jayisgames.com/review/papas-cupcakeria.php
- https://www.culinaryschools.org/kids-games/papas-wingeria/
- Trích đoạn: https://steamcommunity.com/sharedfiles/filedetails/?id=2956785457

**Các game khác**
- https://apps.apple.com/us/app/cooking-fever-restaurant-game/id714796093 (trích đoạn: https://noodlearcade.com/cooking-fever-ultimate-strategy-guide)
- https://apps.apple.com/us/app/cooking-madness-kitchen-frenzy/id1323901884
- https://mytona.helpshift.com/a/cooking-diary/?s=gameplay&f=level-goals (trích đoạn)
- https://apps.apple.com/us/app/cooking-city-restaurant-games/id1397824035 (trích đoạn)
- https://en.wikipedia.org/wiki/Cook,_Serve,_Delicious! và https://chubigans.tumblr.com/post/139122771199/ (trích đoạn, 429)
- https://en.wikipedia.org/wiki/Overcooked, https://interfaceingame.com/games/overcooked/, https://steamcommunity.com/sharedfiles/filedetails/?id=1700450005 (trích đoạn)
- https://en.wikipedia.org/wiki/Diner_Dash (trích đoạn)
- https://apps.apple.com/us/app/food-truck-chef-cooking-game/id1250825794
- https://apps.apple.com/us/app/my-cafe-restaurant-game/id1068204657
- https://apps.apple.com/us/app/cafeland-restaurant-cooking/id1147665432 (trích đoạn)
- https://www.commonsensemedia.org/app-reviews/toca-kitchen (trích đoạn)
- https://kotaku.com/venba-cooking-game-switch-pc-ps5-xbox-game-pass-review-1850696280
- https://mobilesyrup.com/2023/07/17/venba-visai-games-toronto-cooking-game-preview/
- https://en.wikipedia.org/wiki/Cooking_Simulator
- https://www.nintendolife.com/reviews/switch-eshop/bake_n_switch (trích đoạn)
- https://apps.apple.com/us/app/boba-story/id1563575361
- https://apps.apple.com/us/app/boba-tea-diy-bubble-tea/id6473166041
- https://apps.apple.com/us/app/bubble-tea-boba-drink-recipe/id6462050778
- https://apps.apple.com/au/app/sushi-bar-idle/id1438089337 (trích đoạn)

**Game Việt**
- https://store.steampowered.com/app/4530780/
- https://store.steampowered.com/app/4247820/Brother_Hais_Pho_Restaurant/ (trích đoạn)
- https://play.google.com/store/apps/details?id=com.starboysg.banhmimaster (trích đoạn)
- https://saigoneer.com/saigon-food-culture/20460-for-her-graduation-project,-a-local-designer-turns-street-food-into-mobile-game
- https://github.com/thanhlh05/Xe-Banh-Mi-Nho

**UX, hoạt ảnh, kỹ thuật**
- https://www.gdcvault.com/play/1016487/juice-it-or-lose
- https://www.youtube.com/watch?v=AJdEqssNZ-U
- https://valdemird.com/blog/game-feel-on-the-web/
- https://www.gameeconomistconsulting.com/the-best-currency-animations-of-all-time/
- https://www.nngroup.com/articles/response-times-3-important-limits/
- https://alistapart.com/article/how-we-hold-our-gadgets/ (trích đoạn)
- https://tetralogical.com/blog/2022/12/20/foundations-target-size/ (trích đoạn)
- https://developers.apple.com/design/human-interface-guidelines/foundations/accessibility (trích đoạn)
- https://caniuse.com/mdn-api_navigator_vibrate
- https://github.com/ionic-team/ionic-framework/issues/29942
- https://github.com/mdn/browser-compat-data/issues/29166
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- https://haiyang.me/easing/Easings.html (trích đoạn)
- https://arlingtonmuseum.org/explore-more/the-twelve-principles-of-animation (trích đoạn)
- https://gwfh.mranftl.com/fonts/baloo-2?subsets=latin (trích đoạn)

**Pháp lý**
- https://www.loeb.com/en/insights/publications/2012/06/tetris-holding-llc-v-xio-interactive-inc (trích đoạn)
- https://www.courtlistener.com/opinion/8715588/tetris-holding-llc-v-xio-interactive-inc/ (trích đoạn)
