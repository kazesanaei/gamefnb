# Đánh giá hướng làm hình to đẹp và VFX cho "Bếp Khởi Nghiệp"

Phạm vi: chỉ đọc repo `/home/user/gamefnb` (nhánh `claude/fb-business-game-qswti6`, sạch). Phần mạng chỉ gửi HEAD hoặc đọc ra stdout, không lưu tệp nào xuống đĩa.

---

## 1. Nguồn hình có giấy phép mở

### 1.1 Giấy phép, phong cách, dung lượng

Dung lượng dưới đây là số đo thật (content-length) lấy bằng HEAD qua proxy.

| Nguồn | Giấy phép (tệp đã đọc) | Ghi công | Phong cách / định dạng | Dung lượng mỗi hình (đã đo) |
|---|---|---|---|---|
| **Microsoft Fluent Emoji** | **MIT**, "Copyright (c) Microsoft Corporation." — `https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE` | Không bắt buộc ghi trong game, nhưng phải kèm thông báo bản quyền và văn bản MIT khi phân phối | 3 biến thể. **3D**: PNG 256×256 (đã đọc IHDR `0x100×0x100`), giả 3D bóng bẩy. **Color**: SVG viewBox 32, nhiều gradient và `<filter>` blur (cucumber có 4 filter và 20 gradient). **Flat**: SVG phẳng, không viền | 3D: **17–49 KB** (75 hình, ví dụ egg 19,9 KB, cooking 32,3 KB, leafy green 48,7 KB). Color: **1,8–37,6 KB**. Flat: **0,4–1,9 KB** (egg 412 B, cooking 1,9 KB, knife 1,5 KB) |
| **Twemoji** (bản fork còn bảo trì `jdecked/twemoji`) | Đồ họa **CC-BY 4.0** — `https://github.com/jdecked/twemoji/blob/main/LICENSE-GRAPHICS`; mã nguồn MIT | **Bắt buộc ghi công** (tên tác giả, giấy phép, đường dẫn) | SVG phẳng, không viền, viewBox 36 | **0,25–6,2 KB** (28 hình, đa số 1–2,5 KB) |
| **OpenMoji** | **CC BY-SA 4.0** — `https://github.com/hfg-gmuend/openmoji/blob/master/LICENSE.txt` | Bắt buộc ghi công. **ShareAlike**: hình đã sửa phải phát hành lại theo BY-SA | SVG có **viền đen đậm**, viewBox 72. Phong cách gần art.js hiện tại nhất | **0,8–6,5 KB** |
| **Google Noto Emoji** | **Mâu thuẫn, cần hỏi lại.** README ghi "font: OFL 1.1, tools and most image resources: Apache 2.0 (./LICENSE)", nhưng tệp `./LICENSE` hiện tại (93 dòng) lại là **văn bản OFL 1.1** — `https://github.com/googlefonts/noto-emoji/blob/main/LICENSE`, `2D/fonts/LICENSE`. Dù hiểu theo cách nào thì vẫn được dùng thương mại | Apache: giữ LICENSE/NOTICE. OFL: kèm văn bản giấy phép | Repo đã chuyển hình vào thư mục **`2D/svg/`** và `2D/png/{72,128,512}/` (đường dẫn cũ `svg/` trả 404). SVG phẳng có gradient nhẹ | SVG **1,6–5 KB**. PNG 512: 36,7 KB. PNG 128: 6,4 KB |
| **Kenney.nl** | **CC0** (ghi trên trang tài sản) | Không cần | **Food Kit: 3D**, 200 tệp, bản 2.0 "Completely remade" — đây là mô hình 3D, không có sẵn icon 2D. Các bộ 2D hữu ích: **Particle Pack** (2D • VFX, 80 tệp, 512×512), **Emotes Pack** (480 tệp, bong bóng cảm xúc cho khách), **UI Pack** (430 tệp, bản 2.0), **Generic Items** (160 tệp, đồ gia dụng và dụng cụ) | Chưa tải gói zip nên chưa đo. Particle 512 px nên thu nhỏ còn khoảng 64 px |
| **game-icons.net** | **CC BY 3.0** — `https://game-icons.net/about.html` ("Icons made by {author}. Available on https://game-icons.net") | Bắt buộc, ghi theo **từng tác giả** | SVG **đơn sắc** dạng bóng đổ 512, kiểu HUD RPG. Lệch phong cách với đồ ăn dễ thương | Nhỏ. Có `coffee-cup`, `honey-jar`, `coffee-pot`; các tên đoán `frying-pan`, `cutting-board`, `fried-egg`, `baguette` đều trả 404 |
| Streamline / bộ khác | **Chưa kiểm chứng** (bản miễn phí thường là CC BY 4.0, có ghi công) | — | Chủ yếu là icon nét giao diện | — |

### 1.2 Độ phủ so với dữ liệu thật của game

Danh sách id lấy từ `src/data/ingredients.js`, `recipes.js`, `shop.js`, `upgrades.js` và `src/ui/art.js:91–600`. Bốn bộ emoji đều theo chuẩn Unicode nên **độ phủ gần như giống hệt nhau**, chỉ khác phong cách. Tôi đã kiểm Fluent bằng HEAD cho hơn 120 tên; Twemoji, OpenMoji và Noto cho 28 codepoint. Cả bốn bộ đều có 🍋‍🟩 lime (Unicode 15.1), 🫚 gừng, 🫛 đậu Hà Lan, 🫙 hũ, 🫗 rót nước.

**Có hình khớp (khoảng 15/45 nguyên liệu):**
- bánh mì 🥖, trứng gà 🥚, dưa leo 🥒, hành tây 🧅
- muối 🧂, đá 🧊, ly nhựa 🥤, sữa tươi 🥛/🧃
- xoài xanh 🥭 (cần đổi màu xanh), đậu phộng 🥜, chanh 🍋‍🟩, mật ong rừng 🍯
- trà 🍵/🫖, cà phê ☕, nước cốt dừa 🥥

**Chỉ có hình gần đúng (khoảng 10):**
- tắc → 🍋‍🟩/🍊
- khô bò → 🥩/🥓
- khô mực → 🦑 (mực tươi, không phải mực khô)
- rau răm và húng lủi → cùng 🌿
- bánh tráng → 🫓/🍘
- đậu xanh và cà phê hạt BMT → 🫘 đổi màu
- sữa đặc → 🥫
- tương ớt → 🌶️
- bột mì → 🌾

**KHÔNG có trong bộ nào (đặc thù Việt, khoảng 20 nguyên liệu và toàn bộ món):**
- **Nguyên liệu:** hành lá (bó hành), trứng vịt, trứng cút, trứng gà ta (chỉ có thể đổi màu 🥚), nước tương, **nước mắm**, sa tế (không có emoji chai nước chấm), đường, đường phèn, bánh tráng mè, hành phi, cà phê hòa tan (gói), vỏ bưởi (**không có bưởi**), bột năng, dừa nạo, muối tôm Tây Ninh.
- **Món:** bánh mì ốp la, trà tắc, bánh tráng trộn, cà phê sữa đá, chè bưởi, cà phê muối, gỏi cuốn, bún thịt nướng, chè ba màu. Chỉ ghép tạm được, ví dụ 🥖+🍳, 🧋, 🍧, 🌯, 🍜.
- **Dụng cụ:** thớt (chỉ có 🪵), chảo trống (🍳 luôn có sẵn trứng), **phin**, bếp ga, ghế nhựa (🪑 là ghế gỗ), máy tính cầm tay (chỉ có 🧮). Các dụng cụ có hình khớp: dao 🔪, rổ 🧺, muỗng 🥄, loa 📢.

**Vấn đề quyết định là cặp bẫy.** Mini-game Chọn dựa vào các cặp nguyên liệu dễ nhầm (`trapOf`/`traps`). Với emoji, nhiều cặp **trùng cùng một hình gốc**:
- đường / muối / đường phèn → 🧂
- rau răm / húng lủi → 🌿
- nước tương / nước mắm → không có hình
- bột năng / bột mì → không có hình
- cốt dừa / dừa nạo → 🥥
- cà phê / cà phê hòa tan → ☕

Test `tests/unit/data.test.mjs:231` còn bắt buộc hình hàng hiếm phải khác hình của bẫy và có ngôi sao `#ffd23f` (dòng 233).

**Có sẵn và dùng tốt cho VFX/UI:** ✨ 💥 💨 🔥 💧 ⭐ 🌟 💯 🪙 💰 🎉 🔔 ⏳ ⏰ 🧾 😋 😡 (đã kiểm Fluent, tất cả trả 200).

---

## 2. Container có tải được không (HEAD, `--cacert /root/.ccr/ca-bundle.crt`)

| URL | HTTP |
|---|---|
| `raw.githubusercontent.com/microsoft/fluentui-emoji/main/LICENSE` | **200** |
| `…/assets/Baguette%20bread/3D/baguette_bread_3d.png` (cùng Color/Flat svg) | **200** |
| `cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/LICENSE` | **200** |
| `data.jsdelivr.com/v1/packages/gh/...` (API liệt kê tệp) | **403** (proxy chặn) |
| `api.github.com/repos/microsoft/fluentui-emoji` | **403** |
| `github.com/` | 400 (với HEAD) |
| `raw.githubusercontent.com/jdecked/twemoji/.../LICENSE-GRAPHICS`, `hfg-gmuend/openmoji/.../LICENSE.txt`, `googlefonts/noto-emoji/.../LICENSE` | **200** |
| `kenney.nl/`, `kenney.nl/assets/food-kit` (cùng particle-pack, ui-pack, …) | **200** (gói zip chưa thử) |
| `fonts.googleapis.com/css2?family=Baloo+2…` | **200** |
| `fonts.gstatic.com/` (thư mục gốc) | 404 (bình thường). Các tệp woff2 trả **200** kèm content-length |
| `game-icons.net/` | **200** |
| `raw.githubusercontent.com/google/fonts/main/ofl/{baloo2,nunito,paytoneone,bevietnampro,coiny,quicksand,lexend}/OFL.txt` | **200** |

Kết luận: tải được từng tệp qua raw.githubusercontent và jsDelivr, nhưng **không liệt kê được cây thư mục bằng API**, nên phải đoán tên thư mục theo tên CLDR.

---

## 3. Font tiếng Việt (Google Fonts, OFL)

Tôi đã kiểm subset `vietnamese` bằng User-Agent iPhone Safari:
- **Có vietnamese:** Baloo 2, Nunito, Quicksand, Be Vietnam Pro, Lexend, Paytone One, Chakra Petch, Mali, Itim, Signika, Bungee, Coiny, Patrick Hand, Montserrat Alternates, Baloo Bhai 2.
- **Không có vietnamese:** Fredoka, Lilita One, Luckiest Guy.

Kích thước woff2 đo thật:

| Font | latin | latin-ext | vietnamese | latin + vi |
|---|---|---|---|---|
| **Baloo 2 800** (tĩnh) | 18,6 KB | 15,1 KB | 4,8 KB | **23,4 KB** |
| Baloo 2 400..800 (variable) | 33,1 | 27,5 | 9,8 | 42,8 |
| Paytone One | 15,9 | 10,8 | 4,4 | 20,2 |
| Coiny | 15,6 | 13,8 | 5,8 | 21,4 |
| **Nunito 700** | 16,2 | 15,8 | 6,0 | **22,2** |
| Nunito 600..900 | 39,2 | 35,5 | 13,0 | 52,2 |
| **Be Vietnam Pro 500** / 800 | 13,3 | 7,2 | 5,1 | **18,4** / 18,5 |
| Quicksand 700 | 15,1 | 14,6 | 5,0 | 20,1 |
| Lexend 500 | 14,9 | 13,7 | 5,5 | 20,4 |

**Chỉ cần latin + vietnamese.** Theo `unicode-range` của Google, subset vietnamese đã chứa ă, đ, ĩ, ũ, ơ, ư, U+1EA0–1EF9 và ₫ (U+20AB). Các chữ à, á, â, ã, é, ê… nằm sẵn trong latin. Không cần latin-ext.

**Đề xuất:**
- **Tiêu đề, số tiền, nhãn nút lớn:** Baloo 2 ExtraBold 800. Chữ tròn, dày, đúng chất "game", tổng **khoảng 23 KB**.
- **Thân:** giữ `system-ui` như hiện tại (`css/base.css:27`). SF Pro trên iPhone dựng dấu tiếng Việt rất tốt và tốn 0 byte. Nếu muốn đồng bộ nét tròn thì thêm Nunito 700 (+22 KB). Nếu ưu tiên dấu rõ ở cỡ nhỏ thì dùng Be Vietnam Pro 500 (+18 KB).

**Cách tự lưu kèm (self-host):**
1. Lấy URL woff2 từ CSS css2 (User-Agent Safari), đổi tên thành `fonts/baloo2-800-latin.woff2` và `fonts/baloo2-800-vi.woff2`.
2. Viết `@font-face` trong `css/base.css`, chép nguyên `unicode-range`, đặt `font-display: swap` và `url(../fonts/…)`.
3. Thêm `<link rel="preload" as="font" type="font/woff2" crossorigin>` cho tệp latin vào `index.html`.
4. Thêm 2 tệp vào `PRECACHE` (`sw.js:18–128`).
5. Đặt `OFL.txt` cạnh font hoặc trong `LICENSES/`, và lọc nó ra khỏi danh sách test (xem mục 7).

**Không link trực tiếp tới fonts.googleapis.com**, vì service worker bỏ qua yêu cầu khác nguồn (`sw.js:162`) nên khi offline sẽ mất font.

---

## 4. Phong cách hình hiện có (`src/ui/art.js`, 53,6 KB) và quy chuẩn nâng cấp

### 4.1 Hiện trạng

- Mỗi icon là một chuỗi SVG trong JS, **viewBox 0 0 64 64** (`art.js:2`).
- Màu phẳng, viền mực nâu `INK #3a2618` dày `stroke-width 2.5`, đầu nét tròn (`art.js:4, 13–16`).
- Highlight bằng ellipse sáng, đốm bằng `dots()`, có các helper `egg()`, `serratedLeaf()`, `bowl()`, `rareStar()`.
- Không gradient, không đổ bóng.
- Khoảng 87 icon: ING 45, MON 5 + 3 món của Shop, TOOLS khoảng 9, META khoảng 25, cùng FACES, cartSvg 240×164 và tiền.
- Phong cách viền đậm, màu phẳng này **đã gần Cooking Mama**. Hình đang "nhỏ và trơ" vì hai lý do chính:
  - **Cỡ hiển thị nhỏ:** kệ Chọn `.chon-icon` 40/28/**24 px** (`css/kitchen.css:319, 322, 329`), thẻ `.k-card-icon` 30 px (126), `.k-line-icon` 36 px (100), `.mg-head-icon` 40 px (265). Chỉ `.cha-food` 200 px (363) và `.k-reveal-dish` 132 px (229) là to.
  - **Chỉ một tông màu, không có khối, không có bóng.**

**Ràng buộc test cần biết trước khi nâng cấp** (`tests/unit/data.test.mjs:268–284`):
- Cấm `url(`, `href=`, `base64`, `<image` trong ICONS. Nghĩa là `fill="url(#grad)"` đang **bị cấm**.
- Bắt buộc `viewBox="0 0 64 64"`.
- Bộ đếm cân bằng thẻ chỉ đếm `svg|g|text`.

### 4.2 Quy chuẩn đề xuất cho icon kiểu game

- Giữ lưới 64 (test và mã gọi đều phụ thuộc), thiết kế để nhìn đẹp ở **72–96 px trên kệ, 160–220 px trên thớt/chảo, 160 px ở màn ra món**.
- **Viền ngoài 3 đơn vị** (khoảng 4,5 px khi hiển thị 96 px), nét chi tiết bên trong 1,5–2, màu nâu đậm `#3a2618`, không dùng đen.
- **Cel-shading 3 tông, không cần gradient** (vừa qua test hiện tại, vừa nhẹ cho iOS):
  - màu nền;
  - vùng tối đậm hơn 15–20% ở phía dưới phải;
  - highlight trắng 40–60% opacity ở trên trái;
  - nếu cần, thêm một dải rim-light mảnh.
- Ánh sáng **luôn từ trên trái**. Thêm **bóng đất** `<ellipse fill="#3a2618" opacity=".15">` dưới vật thể.
- Bóng dáng nhận ra được ở 48 px. **Cặp bẫy phải khác nhau ngay ở hình dáng**, không chỉ khác màu. Ví dụ nước mắm là chai thấp màu hổ phách có nhãn cá, nước tương là chai cao màu nâu đen có nhãn đậu.
- Nếu nhất định cần gradient: sửa test cho phép `url(#…)` **nội bộ**, id có tiền tố theo icon (`g-trung_ga-1`), vẫn cấm ảnh ngoài.

### 4.3 Công sức ước lượng

| Loại | Ví dụ | Thời gian mỗi hình |
|---|---|---|
| Đơn giản | trứng, đá, ly | 15–20 phút |
| Trung bình | chai, quả, bó rau | 30–40 phút |
| Phức tạp | món ăn, hàng hiếm có sao | 60–90 phút |

Với **40–60 hình, tổng khoảng 35–55 giờ**, đã gồm vòng chụp màn hình để so cạnh nhau. Nên làm trước **khoảng 12 hình mẫu** (đủ 4 nhóm) để chốt bảng màu.

### 4.4 Tổ chức mã

- **Tách `art.js`** thành `src/ui/art/_kit.js` (svg(), shade(), groundShadow(), egg()…), `ing.js`, `mon.js`, `tools.js`, `meta.js`, `faces.js`, `cart.js`, `money.js`. Giữ **`src/ui/art.js` làm lớp mặt tiền re-export**, để test và 99 chỗ gọi `svgBox(...)` không phải đổi. Mọi tệp mới phải được thêm vào PRECACHE.
- **Sprite `<symbol>` + `<use>`:** dựng một lần lúc khởi động từ ICONS, đặt trong `<svg width=0 height=0 style="position:absolute">`.
  - **Không dùng `display:none`**, vì gradient/defs trong vùng ẩn có thể không vẽ trên WebKit.
  - Lợi ích: DOM gọn hơn so với `svgBox` hiện chèn `innerHTML` cho từng chỗ (`src/ui/dom.js:44`). Có thể đổi màu biến thể bằng `fill="var(--c, …)"` (trứng vịt và trứng cút dùng chung khuôn trứng).
  - `href=` nằm trong mã DOM chứ không nằm trong ICONS, nên test vẫn qua.
- **Bộ nhớ đệm cho vật thể có animation:** chuyển SVG một lần thành `Blob` → `URL.createObjectURL` → `<img decoding="async">` và gọi `img.decode()` trước khi chạy. Ảnh đã raster thì GPU di chuyển nhanh hơn nhiều so với inline SVG nhiều path.

---

## 5. VFX bằng JS thuần

### 5.1 Chọn kỹ thuật

| Kỹ thuật | Dùng cho | Ghi chú |
|---|---|---|
| **DOM + Web Animations API** (`el.animate`) | Chữ nổi, nảy/squash, rung khung, xu bay, nổ ít hạt (≤ 12–30) | Safari 13.1+. Tạo sẵn pool phần tử. Chỉ animate `transform`/`opacity` |
| **Canvas 2D lớp phủ** | Hơi nước, dầu xèo, khói cháy, confetti 5 sao | Chỉ phủ đúng sân khấu, DPR tối đa 2. Vẽ sẵn sprite hạt ra canvas phụ rồi `drawImage`. rAF chỉ chạy khi còn hạt |
| **CSS @keyframes** | Chuyển động lặp (lửa bếp, hơi bốc, khách nhún) | Repo đã có mẫu: `css/kitchen.css:457–514` (k-pop, k-zoom, k-steam, k-sparkle…) |

### 5.2 Ngân sách hiệu năng trên iPhone

- Tối đa **khoảng 30 phần tử DOM** cùng lúc và **khoảng 120–150 hạt canvas**. Mỗi hiệu ứng ≤ 700 ms, riêng màn ra món khoảng 1,2 s.
- `will-change: transform` **chỉ bật khi đang chạy**. Để thường trực sẽ bùng số layer và tốn RAM trên iOS.
- **Không** animate `filter`, `drop-shadow`, `box-shadow`, và không animate SVG có `<filter>` (Fluent Color có filter).
- `.glow` hiện đang animate box-shadow (`css/base.css:177–178`), nên đổi sang pseudo-element thay đổi opacity.
- Tính theo `dt` thay vì đếm frame, vì Chế độ nguồn điện thấp khóa rAF ở 30 fps. `frameLoop` đã làm theo dt (`src/ui/minigames/_util.js:150`).
- Khi `visibilitychange` sang ẩn: hủy rAF và dọn lớp VFX (giống `src/ui/loop.js`).

### 5.3 Giảm chuyển động

- CSS hiện chỉ ép `animation-duration` và `transition-duration` (`css/base.css:181–189`, class `.reduce-motion` do `app.js:155–158` gắn; công tắc ở `settings.js:523`; mặc định ở `state.js:134`).
- **WAAPI và canvas KHÔNG bị luật CSS này chặn.** Vì vậy `vfx.js` phải tự kiểm tra, dùng lại logic `reduced()` ở `src/ui/screens/kitchen.js:185–186`. Nên tách hàm này ra một helper dùng chung.
- Khi giảm chuyển động: chỉ mờ dần (opacity), không rung, không confetti; xu không bay mà số tiền cập nhật ngay kèm một nhịp sáng.

### 5.4 Rung haptic

- Safari trên iOS **không có `navigator.vibrate`**. `app.vibrate` đã kiểm tra trước khi gọi (`src/ui/app.js:140–148`).
- Mẹo `<input type="checkbox" switch>` trên iOS 18 có tạo haptic nhưng là **cách không chính thức, rủi ro**.
- Trên iPhone nên thay bằng **rung khung nhỏ kèm âm thanh**.

### 5.5 Kiến trúc `src/ui/vfx.js` đề xuất

```js
export function createVfx(app, layer /* div.vfx-layer trong .overlay-root, base.css:85 */) {
  // trả về:
  // burst(target, kind)           kind: 'sparkle'|'chop'|'drop'|'smoke'|'star'
  // floatText(target, text, kind) '+100 Hoàn hảo!' (Baloo 2, viền chữ, nảy vào)
  // coinFly(fromEl, toEl, n)      xu bay theo đường cong, so le 40 ms, rồi HUD đếm tăng
  // shake(el, power)              rung khung sân khấu 4–6 px, tắt khi giảm chuyển động
  // squash(el) / pop(el)          scale(1.15,.85) → (.95,1.05) → 1 trong 180–260 ms
  // steam(el, on) / sizzle(el, on) / confetti(rect)   (canvas)
  // cue(kind, anchorEl)           bản đồ 'good'|'bad'|'cut'|... → tổ hợp hiệu ứng
  // destroy()
}
```

### 5.6 Nối vào bus và các chỗ gọi

- **Không phát sự kiện VFX lên bus miền.** `app.js:347` có `bus.on('*', () => app.save())`, nên mỗi sự kiện VFX sẽ hẹn thêm một lần lưu.
- **Hiệu ứng gắn vị trí** gọi thẳng từ UI. Có điểm nối sẵn:
  - `feedback(ctx, kind)` ở `_util.js:188–198` đã gom âm thanh và rung → thêm `ctx.app.vfx?.cue(kind, anchor)`.
  - `popLabel` ở `_util.js:240` → thay bằng `vfx.floatText`.
- **Hiệu ứng toàn màn** đăng ký nghe bus trong `src/ui/screens/service.js`, nơi đã có các `bus.on` ở dòng 218–388:

| Sự kiện (phát tại) | Hiệu ứng |
|---|---|
| `step.done {score, grade}` (`core/kitchen.js:348, 431, 447`) | Nổ hạt và chữ "Tuyệt!/Ổn/Hỏng" |
| `dish.done {grade, flawless}` (`kitchen.js:519`) | Sao xoay, ánh sáng sau lưng, confetti nếu hoàn hảo |
| `customer.rated {stars}` (`kitchen.js:670`) | Sao bay vào phiếu chấm, confetti khi 5 sao |
| `payment.received` (`core/order.js:262, 495`), `change.given {correct}` (`order.js:370`) | `coinFly` tới HUD tiền |
| `total.reported {correct}` (`order.js:220, 239`), `qr.rejected` (`order.js:512`) | Dấu ✓ nảy, hoặc rung kèm chớp đỏ |
| `order.confirmed` (`order.js:184`), `ticket.clipped` (`order.js:592`) | Phiếu bay lên thanh phiếu |
| `customer.lost` (`core/shift.js:268`, `core/customer.js:356`) | Mây giận hoặc khói |
| `quest.claimed`, `checkin.claimed`, `rare.gained`, `stage.ready` | Rương, sao, xu |

- **Theo từng mini-game:**
  - chon: món bay vào rổ (`.chon-in` đang có `k-drop`).
  - thai: vụn và lát tách ra.
  - cha: bọt và lấp lánh (`.cha-spot.is-clean`).
  - cham: giọt rơi.
  - lua: hơi nước, xèo, khói khi cháy (`is-burnt`, `lua.js`).
  - rot: dòng chảy.

---

## 6. Cảnh nền nhẹ, không che chữ

- **Ưu tiên gradient CSS** (0 byte, không phát sinh request), hoặc 1 SVG nhỏ dưới 2 KB nhúng trong **tệp CSS** (`url("data:image/svg+xml,…")`; test chỉ cấm `url(` trong ICONS, không cấm trong CSS).
- **Không dùng PNG nền lớn.** Ảnh 1170×2532 khi giải mã chiếm khoảng 11,8 MB RAM.
- **Quầy xe đẩy:**
  - Trời: `linear-gradient(#ffe7b8, var(--bg))`.
  - Mái che sọc: `repeating-linear-gradient(90deg, #d6362b 0 24px, #fff 24px 48px)`, mép lượn sóng bằng `radial-gradient` mask.
  - Mặt quầy gỗ: vân gỗ `repeating-linear-gradient` alpha 0,06–0,1.
  - Dùng lại `cartSvg` (`art.js`, 240×164).
- **Mặt thớt gỗ:** nâng cấp `.thai-board` (`css/kitchen.css:376`) bằng vân gỗ alpha thấp, highlight `radial-gradient` ở góc trên trái, `inset` shadow mép và lỗ treo.
- **Chảo trên bếp ga:** `.lua-pan` (`kitchen.css:450`) đã dùng radial-gradient; thêm:
  - vệt dầu sáng (`radial-gradient` trắng 20% lệch trên trái);
  - vòng lửa xanh bằng `conic-gradient` hoặc 6–8 ngọn lửa SVG nhỏ, keyframe opacity/scale;
  - bếp ga phía dưới làm bằng gradient xám.
- **Quy tắc tương phản:**
  - Nền nhạt, ít bão hòa để icon nổi lên.
  - Chữ luôn nằm trên mảng giấy đặc `--paper #fffaf0`; mực `#3b2a1f` trên nền đó đạt khoảng 13:1, đủ ≥ 4.5:1.
  - Không đặt chữ trực tiếp lên vân hay họa tiết.
  - Thêm `contain: paint` cho khung cảnh. Tránh `background-attachment: fixed` vì iOS xử lý kém.

---

## 7. Ảnh hưởng tới PWA

- **PRECACHE hiện tại khoảng 1,51 MB** (đo bằng `du`: 97 tệp JS, 6 CSS, `icons/` 155 KB).
- **Dung lượng tăng theo từng hướng:**

| Hướng | Tăng thêm |
|---|---|
| Tự vẽ SVG (60 icon chi tiết hơn, khoảng 1,5–3 KB mỗi icon, nằm trong JS) | **+90–180 KB**, không có tệp ảnh |
| Fluent Flat hoặc Twemoji SVG | khoảng +90 KB |
| **Fluent 3D PNG 256** | **khoảng +1,8 MB** (hơn gấp đôi PRECACHE). Thu về 128 px WebP thì còn khoảng 0,4–0,6 MB |
| Font | Baloo 2 800 khoảng **+23 KB**; thêm font thân thì thêm 18–22 KB |
| Kenney Particle thu về 64 px | khoảng +15 KB |

- **`tests/unit/pwa.test.mjs` kiểm những gì:**
  - PRECACHE **bằng đúng** tập `src/**/*.js` + `css/**/*.css` + `icons/*` + `index.html` + `manifest` (`expectedFiles()` dòng 31–37, test ở dòng 125).
  - Không trùng, đường dẫn tương đối, có đủ icon bắt buộc.
  - `VERSION` khớp `package.json` và `APP_VERSION` (app.js).
  - Mọi import tương đối trong `src/` đều có trong PRECACHE.
  - Manifest đúng màu và cỡ icon.
  - Chạy giả lập service worker: cài (`addAll`, **một tệp 404 là hỏng cả lần cài**, `sw.js:136`), kích hoạt (dọn cache cũ), offline vẫn trả tệp.
- **Phải sửa kèm khi thêm tài nguyên:**
  1. Thư mục mới như `fonts/`, `assets/` **không được test tự soát**. Cần thêm `walk('fonts', n => n.endsWith('.woff2'))`, nếu không thì quên khai báo PRECACHE vẫn qua test nhưng hỏng khi offline.
  2. `tests/helpers/static-server.mjs:12–22` chưa có MIME `.woff2` và `.webp`.
  3. Tăng VERSION ở cả 3 nơi.
  4. `activate` xóa **mọi cache có tiền tố `bkn-`** trừ bản hiện tại (`sw.js:153`). Nếu muốn một cache tài nguyên sống lâu qua các bản thì phải dùng tiền tố khác. Nếu không, mỗi lần nâng bản người chơi sẽ tải lại toàn bộ ảnh và font.
- **Artifact claude.ai:**
  - Repo **không có script đóng gói** (`tools/` chỉ có `make-icons.mjs`, `tim-seed.mjs`).
  - Theo `docs/huong-dan-trien-khai.md:17–23`, game chạy trong khung của claude.ai, offline và SW có thể không chạy.
  - Nếu artifact là một tệp HTML duy nhất thì font và ảnh nhị phân phải nhúng base64 (+33%): font 23 → 31 KB, 60 PNG 3D 1,8 → 2,4 MB. Khung đó có thể còn chặn font ngoài.
  - SVG nằm trong JS (cách hiện tại) thì **không cần thêm tệp nào**.

---

## Kết luận: khuyến nghị **kết hợp, lấy tự vẽ SVG làm chính**

1. **Nguyên liệu, món, dụng cụ (đối tượng gameplay): tự vẽ lại SVG** theo quy chuẩn ở mục 4.2 (cel-shading 3 tông, viền nâu 3, highlight, bóng đất) và hiển thị **to 72–220 px**. Lý do:
   - Khoảng 2/3 đồ đặc thù Việt và **toàn bộ 9 món** không có trong bộ mở nào.
   - Nhiều cặp bẫy sẽ trùng hình nếu dùng emoji.
   - Giữ được các test sẵn có, chạy offline, không phát sinh tệp cho artifact, PRECACHE chỉ tăng khoảng 0,1–0,2 MB.
   - Phong cách viền đậm, màu phẳng sẵn có vốn gần Cooking Mama.
2. **Hình VFX và UI chung** (✨ ⭐ 🪙 💨 🔥 💧 🎉): tự vẽ đơn giản hoặc lấy **Fluent Emoji Flat** (MIT, 0,4–2 KB, không filter) rồi thêm viền nâu cho đồng bộ. Hạt khói, sao trên canvas lấy từ **Kenney Particle Pack (CC0)**. Bong bóng cảm xúc của khách có thể tham khảo **Kenney Emotes (CC0)**.
3. **Font:** Baloo 2 800 tự lưu kèm (OFL, khoảng 23 KB) cho tiêu đề và số tiền; giữ system-ui cho chữ thân.
4. **Không dùng Fluent 3D trong gameplay:** nặng (17–49 KB mỗi ảnh), lệch phong cách với hình 2D có viền, và vẫn thiếu đồ Việt. **Tránh OpenMoji** (ràng buộc ShareAlike) và **game-icons** (đơn sắc, ghi công theo từng tác giả).

**Rủi ro:**
- **Công vẽ:** 35–55 giờ cho 40–60 hình, và khó giữ đồng bộ nếu không chốt bộ mẫu trước.
- **Hiệu năng iOS:** khi animate inline SVG nhiều path, hoặc khi dùng filter/box-shadow.
- **Test phải sửa:** `data.test.mjs` (nếu dùng gradient, `<use>` trong ICONS, hoặc đổi viewBox) và `pwa.test.mjs` cùng static-server (thư mục và MIME mới).
- **Giảm chuyển động:** WAAPI và canvas không bị CSS chặn, phải tự kiểm tra trong `vfx.js`.
- **Không có haptic trên iOS.**
- **Giấy phép:**
  - Cần màn "Ghi công" cho CC-BY và đi kèm văn bản MIT/OFL.
  - Giấy phép Noto đang mâu thuẫn giữa README và LICENSE.
  - Giấy phép Streamline chưa kiểm.
- **Dung lượng mỗi lần nâng bản:** với cơ chế dọn cache `bkn-` hiện tại, mỗi bản mới người chơi tải lại toàn bộ tài nguyên.
