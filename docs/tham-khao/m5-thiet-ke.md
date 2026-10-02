# Kế hoạch triển khai M5: làm lại giao diện kiểu game giả lập nấu ăn

Tôi đã đọc đủ 3 báo cáo khảo sát và tự kiểm lại các điểm then chốt trong mã. Tôi không sửa tệp nào. Kế hoạch có 4 đợt: Đợt 0 làm bản mẫu, xong thì dừng chờ duyệt; Đợt 1 làm nền tảng, Bếp và mini-game; Đợt 2 làm Quầy; Đợt 3 làm các màn ngoài ca.

---

## 0. Những điểm đã kiểm lại trong mã, ảnh hưởng trực tiếp tới thiết kế

| # | Sự thật trong mã | Hệ quả cho kế hoạch |
|---|---|---|
| 1 | Bảng bước của món đang nấu được chụp vào bản lưu (`cook.board = effectiveSteps(...)`, `src/core/kitchen.js:342`). Mỗi phần tử có sẵn `type`, `params`, `w`, `critical`. `dishQuality` lấy `w` và `critical` từ chính danh sách này (`src/core/scoring.js:73-78`). | Bản lưu cũ vẫn chơi tiếp được nếu còn giữ plugin `cha` và `cham`, mà cả hai vẫn dùng. Dù vậy vẫn nên migrate, dựng lại bảng theo công thức mới (mục 1.7) để bước chưa làm hiện thao tác mới. |
| 2 | Ghi chú vá tham số theo **id bước**, ví dụ `them_trung: patch { dap_trung: { n: 3 } }`. `data.test.mjs:181-183` buộc mọi khóa vá phải có trong `params`. | **Giữ nguyên id bước**, chỉ đổi `type` và `params`. Giữ tên tham số bị vá: `n`, `zone`, `targets`, `spots`. |
| 3 | `data.test.mjs:237-248` khóa tổng par của 4 món hiếm (19, 26, 34, 26). `data.test.mjs:92` buộc `r.icon === RECIPES[r.baseRecipe].icon`. | Không thêm hay bớt bước. Món hiếm dùng hình món nền, phân biệt bằng huy hiệu ★ và ruy băng "Hiếm" (mục 9, quyết định Q3). |
| 4 | `SCALE_KEYS = ['n','N','cuts','strokes']` (`src/core/kitchen.js:10`) dùng để nhân tham số theo số phần. | Thêm `turns` và `strips` cho `xoay` và `got`. Có unit test. |
| 5 | `sw.js:166-169`: **mọi lượt mở trang (navigate) trong scope đều trả `index.html` đã lưu**. | Mở `mau.html` trên máy đã cài game sẽ ra game chính. Phải sửa SW (chỉ trả index cho gốc và `index.html`), tăng VERSION, và người chơi phải nhận bản mới trước (mục 2.3). |
| 6 | `pwa.test.mjs:213-220`: `index.html` phải gắn **mọi** `css/*.css`. Đã có sẵn lớp `.card`, `.bubble`, `.menu-item`… | CSS mới chắc chắn được nạp vào game chính. Mọi lớp mới phải có tiền tố `g-` (`.g-btn`, `.g-stamp`…), biến có tiền tố `--g-`. Không ghi đè lớp cũ trong Đợt 0. |
| 7 | `banned-words.test.mjs` hạ chữ thường rồi so **chuỗi con** trong `src/`, `css/`, `index.html`, `sw.js`. | Ngoài tên game, ví, ngân hàng, còn phải tránh tên biến như `grabbed`, `snapAs…` (chứa "napas"), `tipOs…` (chứa "ipos"). `cursor: grab` đã được miễn. Đưa luật này vào lời dặn mọi agent. |
| 8 | Tour tự tắt khi `navigator.webdriver` (`src/ui/components/tour.js:141`). | Tour mới không phá các e2e khác. Chỉ `tour.e2e` bật tour. |
| 9 | `perfect-player`, `shiftSave` và `tim-seed` dựng ca bằng lõi. `uiRand` băm theo id bước (`kitchen.js:652`). | Giữ id bước thì seed e2e gần như không lệch. Vẫn chạy `node tools/tim-seed.mjs` để xác nhận. |
| 10 | `_kitchen-smoke.mjs` và `hanh-trinh.mjs` không nằm trong glob `npm run e2e`. 91 e2e chia G1=11, G2=50, G3=30. | Vẫn phải thêm bộ giải 5 thao tác vào hai tệp này. File e2e mới gán vào nhóm (mục 8). |
| 11 | `sheetSettled` (`service.js:658-664`) không chịu hoạt ảnh đang chạy trên chính `.score-sheet`. `fix-leftovers` dừng đồng hồ trang khi bảng ra món đang hiện. | Hoạt ảnh đặt trên **phần tử con**, có thời lượng hữu hạn. `data-q` và `data-grade` ghi ngay giá trị cuối; chỉ chữ hiển thị mới đếm dần. |
| 12 | `counter.js:65-105` vẽ lại toàn bộ panel khi `stateSig` đổi. | Hiệu ứng kích theo **sự kiện** (bus hoặc thao tác), không kích trong `render()`. Kỹ thuật chung là "nhân bản rồi bay" (mục 1.3). |

### Bất biến cân bằng (khóa bằng `tests/unit/m5-balance.test.mjs`)

| Món | Tổng par | Tổng w | Giá | Vốn |
|---|---|---|---|---|
| banh_mi_op_la | 22 | 9 | 20.000 | 9.000 |
| tra_tac | 18 | 9 | 10.000 | 3.000 |
| banh_trang_tron | 31 | 11 | 20.000 | 8.000 |
| ca_phe_sua_da | 20 | 10 | 15.000 | 5.000 |
| che_buoi | 27 | 11 | 15.000 | 5.000 |
| tra_tac_mat_ong | 19 | 9 | 15.000 | 6.000 |
| banh_mi_trung_ga_ta | 26 | 10 | 25.000 | 11.000 |
| banh_trang_tron_tay_ninh | 34 | 13 | 25.000 | 12.000 |
| ca_phe_muoi | 26 | 14 | 20.000 | 6.000 |

Test so **từng bước** (id, par, w, critical, retryCost) với bảng chép từ bản 0.4.1, không chỉ so tổng. `BALANCE` (`src/data/balance.js`) không đổi. `STATE_VERSION` giữ 3 vì cấu trúc save không đổi.

---

## 1. Kiến trúc mới

### 1.1 Tệp mới và tệp sửa

| Tệp | Đợt | Vai trò |
|---|---|---|
| `fonts/baloo2-800-latin.woff2`, `fonts/baloo2-800-vi.woff2`, `fonts/OFL.txt` | 0 | Font tiêu đề tự lưu (~23 KB). Agent chính tải bằng curl qua proxy |
| `css/theme.css` | 0 | `@font-face`, biến `--g-*`, nút "bánh kẹo" `.g-btn`, khung `.g-paper`/`.g-wood`/`.g-chalk` |
| `css/fx.css` | 0 | Thẻ bước, tay mẫu, con dấu, bảng ra món, phản ứng Dì Sáu, `.vfx-layer` |
| `css/counter.css` | 0 → 2 | Màn gọi món mới (lớp `g-`); Đợt 2 chuyển phần CSS quầy cũ sang đây |
| `src/ui/motion.js` | 0 | `isReduced(app)` dùng chung (cài đặt trong game hoặc `prefers-reduced-motion`), thay `kitchen.js:185-186` |
| `src/ui/vfx.js` | 0 | Hệ hiệu ứng (API ở 1.3) |
| `src/ui/art/kit.js` | 0 | Hàm dựng và bảng màu cel-shading |
| `src/ui/art/ing-tuoi.js` | 0 → 1 | Rau, quả, trứng, kèm hình trạng thái |
| `src/ui/art/ing-kho.js` | 0 → 1 | Chai, lọ, bột, hạt, đồ uống, bánh, đồ khô, kèm hình trạng thái |
| `src/ui/art/mon.js`, `src/ui/art/tools.js` | 0 → 1 | Món, dụng cụ, biểu tượng loại thao tác |
| `src/ui/art/props.js` | 0 → 1 | Đạo cụ sân khấu lớn, viewBox riêng, kèm `PROP_META` |
| `src/ui/art/state-map.js` | 1 | Bước → trạng thái hình (`rua_dua→sach`, `thai_dua→method`…) |
| `src/ui/art/people.js`, `src/ui/art/scene.js` | 2 | Khách bán thân, Dì Sáu có tư thế, cảnh xe đẩy, điện thoại QR, máy POS |
| `src/ui/art/meta.js` | 3 | 19 hình sự kiện, thư, rương; 3 món tương lai |
| `src/ui/art.js` | 1 | Thành **mặt tiền**: gộp ICONS từ `art/*`, giữ nguyên mọi export cũ, thêm `art(id, state)` và `prop(id)` |
| `src/ui/components/step-card.js`, `stamp.js`, `dish-reveal.js`, `disau-react.js` | 0 | Thẻ "Bước k/N", con dấu, bảng ra món, phản ứng Dì Sáu |
| `src/ui/components/order-bubble.js`, `menu-board.js`, `order-pad.js`, `note-icons.js` | 0 → 2 | Màn gọi món mới (Đợt 2 ráp vào quầy thật) |
| `src/ui/minigames/_frame.js` | 0 | `buildFrame2`: đầu màn có chấm bước và lớp `.mg-fx` riêng |
| `src/ui/minigames/thai.js` | 0 (bật thử bằng `ctx.look === 2`) → 1 (mặc định) | Thái kiểu mới |
| `src/ui/minigames/_gesture.js` | 1 | Hàm thuần đo cử chỉ: vòng, vuốt, nhịp, giới hạn giờ |
| `src/ui/minigames/{dap,xoay,got,lac,bay}.js` | 1 | 5 plugin mới |
| `css/mg-prep.css`, `css/mg-heat.css`, `css/mg-mix.css` | 1 | CSS sân khấu, tách khỏi `kitchen.css` theo nhóm (xem 3.1) |
| `src/core/minigame-scoring.js` | 1 | 5 hàm chấm mới |
| `src/core/kitchen.js` | 1 | Chỉ sửa `SCALE_KEYS` |
| `src/core/save.js` | 1 | Thêm `migrateCookBoard` |
| `src/data/recipes.js`, `minigame-types.js`, `dialogue.js` | 1 | Đổi loại bước, thêm 5 loại, thêm câu phản ứng của Dì Sáu |
| `src/ui/screens/counter-{order,pay,cash,qr,receipt}.js` | 2 | Tách từ `counter.js` theo khâu |
| `src/ui/components/score-sheet.js`, `incident-view.js` | 2 | Tách từ `service.js` |
| `css/street.css`, `css/cashier.css`, `css/receipt.css`, `css/sheet.css` | 2 | CSS theo khâu |
| `css/{prep,shop,quests,mail,book,summary,market}.css` | 3 | Tách từ `meta.css` |
| `mau.html`, `mau/mau.js`, `mau/mau.css` | 0 | Trang mẫu. **Không** nằm trong PRECACHE, không đăng ký SW |
| `tools/dong-goi-artifact.mjs` | 0 | Đưa script dựng artifact từ scratchpad vào repo, thêm `--entry mau.html` |

Mọi thay đổi đều là **thêm tệp hoặc sửa tệp**. Không có lệnh xóa. Việc chuyển CSS hay hàm sang tệp mới là cắt-dán trong nội dung, không xóa tệp.

### 1.2 Hệ hình (`src/ui/art/`)

```js
// kit.js: thuần, import trong Node được
export const INK = '#3a2618', OUTLINE = 3, DETAIL = 1.75
export const PAL = { la: ['#7cc35a','#4f9a3c','#c4ec9e'], trung: ['#fff3dc','#e6cfa6','#fffaf0'],
  long_do: ['var(--yolk,#f6b21a)', '#e08c00'], banh: ['#e9a64c','#c47a2c','#f7d496'], /* … */ }
export function svg(body, vb = '0 0 64 64')             // <svg viewBox="…"><g stroke=INK … round>…</g></svg>
export function ground(cx, cy, rx, ry)                    // bóng đất: ellipse INK opacity .15
export function hilite(cx, cy, rx, ry, op = .5)           // điểm sáng trên-trái
export function tone3({ base, dark, light, outline, shade, shine }) // nền + mảng tối dưới-phải + điểm sáng
export function rareStar(x = 50, y = 14)                  // sao #ffd23f (test hàng hiếm cần)

// art.js (mặt tiền, Đợt 1)
export const ICONS            // viewBox 64, ĐÚNG quy tắc cũ: META cũ + ING + DISH + TOOL
export function icon(id)      // giữ nguyên hành vi (tiền tố mon_, có hình dự phòng)
export function art(id, state) // STATE[`${id}.${state}`] ?? icon(id)
export function prop(id)      // PROPS[id] ?? '' (bên gọi tự dự phòng)
export { PROP_META }          // vd { to_lon: { vb:[240,200], center:[120,104], r:86 }, chao_lon: {...} }
```

Hình trạng thái và đạo cụ **không nằm trong ICONS**, nên không phá luật viewBox 64. Chúng có test riêng `tests/unit/art-v2.test.mjs`: cấm `url(`, `href`, `<use`, `<image`, `base64`, `null`, `NaN`, `undefined`; thẻ cân bằng; giới hạn dung lượng (mục 6); tất cả đóng băng sâu. Màu lòng đỏ dùng `var(--yolk, …)`, được phép vì test chỉ cấm `url(`. Nhờ vậy trứng gà ta dùng chung khuôn với trứng gà, chỉ đặt `--yolk:#e8730c` trên khung chứa.

### 1.3 Hệ VFX (`src/ui/vfx.js`, `src/ui/motion.js`)

```js
export const VFX_LIMITS = Object.freeze({ dom: 30, particles: 150, dpr: 2 })
export function createVfx({ host /* app.overlay */, reduced /* () => bool */ }) → {
  layer,                                   // div.vfx-layer, z-index 25 trong .overlay-root, pointer-events:none, KHÔNG có lớp .k-layer
  burst(target, kind, { n, colors } = {}), // kind: sparkle | crumb | drop | oil | smoke | star | peel
  floatText(target, text, { tone }),       // thay popLabel; luôn đặt TRÊN ngón tay
  ripple(x, y), shake(el, power /*1..3*/), squash(el), pop(el),
  hitstop(ms) → Promise,                   // 60–90 ms; giữ khi giảm chuyển động (không phải chuyển động)
  fly(fromEl|rect, toEl|rect, { node, html, ms = 450, arc = .35 }) → Promise, // "nhân bản rồi bay"
  coins(fromEl, toEl, n, { stagger: 40 }) → Promise,
  confetti(target, n = 36),                // canvas cấp lười
  stats() → { dom, particles },            // dùng cho e2e (canvas cũng ghi data-n)
  clear(), destroy()
}
// thuần, test Node: easeOutBack, easeOutCubic, bezier, particlePlan(kind, reduced), stepParticles(list, dt, g)
```

Luật bắt buộc trong `vfx.js` (unit test cho phần thuần, e2e cho phần DOM):

- Chỉ animate `transform` và `opacity`, dùng WAAPI hoặc CSS. `will-change` chỉ bật khi đang chạy.
- Có pool phần tử DOM. Quá 30 thì bỏ hạt mới. Canvas chỉ tạo khi cần, DPR tối đa 2. rAF chỉ chạy khi còn hạt.
- Khi `visibilitychange` sang ẩn, hoặc unmount: gọi `clear()`.
- Đầu mỗi hàm gọi `reduced()`. `particlePlan` trả số hạt 0–3 và không có quỹ đạo. Lý do: luật CSS ở `base.css:181-188` không chặn WAAPI hay canvas.
- **Không phát sự kiện VFX lên bus miền.** `app.js` có `bus.on('*', save)`, phát lên đó sẽ kích thêm một lần lưu.
- **Nhân bản rồi bay**: trước khi trạng thái làm panel vẽ lại (chốt order, lấy tờ tiền, kẹp phiếu), lấy `getBoundingClientRect` cùng `cloneNode` của phần tử nguồn, đưa bản sao vào `vfx.layer` rồi mới cho bay. Panel vẽ lại tự do, không phát lại hoạt ảnh.
- Thay cho rung trên iOS (không có `navigator.vibrate`): `shake(stage, 1)` cho kết quả xấu khi không giảm chuyển động. Khi giảm chuyển động thì chớp viền đỏ tĩnh.

Quy ước bổ sung sau kiểm chứng Đợt 0 (đã có trong mã `src/ui/vfx.js` và test `tests/unit/vfx.test.mjs`):

1. Hết hạt thì canvas rời khỏi lớp; lúc đứng yên `stats().dom === 0`. Thuộc tính `data-n` của canvas chỉ đọc được khi đang có hạt.
2. Đích đã rời DOM hoặc đang `display:none` thì mọi hàm hiệu ứng bỏ qua (trả 0, null hoặc false), không nổ ở góc màn.
3. Trang đang ẩn thì không nhận hiệu ứng mới.
4. `fly` và `coins` bị `clear()` giữa chừng thì Promise trả `false` (hoặc chỉ đếm số xu đã tới đích).
5. Nút lạ do module khác chèn vào `vfx.layer` chỉ bị `clear()` gỡ ra, không bao giờ được đưa vào pool để tái dùng.

### 1.4 Thành phần (Đợt 0 tạo, Đợt 1 và 2 ráp)

```js
// step-card.js
export const GESTURE_BY_TYPE = { chon:'tap', cha:'rub', thai:'drag-cut', cham:'tap', lua:'tap-zone', rot:'hold',
  dap:'tap-swipe', xoay:'circle', got:'swipe-down', lac:'shake', bay:'drag' }
export function stepCardModel(step, { index, total, data }) // { ribbon:'Bước 3/6', verb:'Thái dưa leo!', ingId, gesture, hint }
export function createStepCard(model, { full, onStart, autoMs, reduced }) // → { el, start(), hold(on), destroy() }
//   el giữ data-testid="step-hint" (e2e đang chạm vào). Con: step-card-demo (tay mẫu), step-card-go ("Chạm để bắt đầu")
// stamp.js
export function gradeKey(score, labels)   // 'hoan_hao' | 'tot' | 'dat' | 'hong', theo BALANCE.stepLabels
export function createStamp({ score, label })   // data-testid="step-result", data-score, .g-stamp.grade-<key>
export function playStamp(el, { vfx, sound, reduced }) → Promise
// dish-reveal.js
export const REVEAL_MS = 2200, REVEAL_MS_REDUCED = 1400
export function revealPlan(dish, { reduced }) // dòng thời gian thuần: { stars, beats:[{at, kind}], totalMs }
export function createDishReveal({ dish, recipe, name, mood, comment, lvUpText, data }) // data-testid="dish-reveal", data-grade, data-q, có .k-bubble
// disau-react.js
export function reactLine(key, rand, data) // DIALOGUE.diSau.stepReact[key]
export function createDiSauReact({ key, text }) // mặt 48px + bong bóng; góc trên-phải, không che vùng chơi
```

Câu phản ứng của Dì Sáu tự viết, mỗi hạng 3–5 câu. Ví dụ Hoàn hảo: "Đẹp quá con ơi!"; Tốt: "Khá lắm, giữ vậy nha!"; Đạt: "Hơi lệch chút, không sao!"; Hỏng: "Lỡ tay rồi, bước sau kỹ hơn nha!". **Tránh hẳn kiểu câu "để dì sửa giùm"** cho xa câu thoại đặc trưng của game tham chiếu. `dialogue.js` là tệp hiển thị nên không được có các chữ `par`, `toast`, `chip`, `MV`, `seed`.

### 1.5 Năm mini-game mới: hợp đồng DOM, cử chỉ, cách chấm

Mọi plugin theo đúng hợp đồng `mount(stage, step, ctx) → { result, destroy, hold? }`, import trong Node không chạm DOM. Giới hạn giờ là `max(stepLimitSec(par, assist), minLimitSec(type, params) × (assist ? 1,5 : 1))`. Nấu thử thì không giới hạn.

`minLimitSec` là **sàn thời gian theo số lượng** (bảng `MIN_LIMIT` và hàm nằm ở `src/core/minigame-scoring.js`, `_gesture.js` xuất lại). Nó không đổi par (par quyết định ngân sách chờ của khách), chỉ tránh trường hợp "thêm trứng" hay số phần lớn không thể làm kịp. Sau vòng kiểm chứng Đợt 1, sàn còn là mốc dưới của luật trừ quá giờ: `overtimeAt(type, số lượng, par)` = max(2·par, sàn), để người làm vừa tay không bị trừ oan.

| Loại | Cử chỉ | data-testid / data-* cho e2e | Phản hồi tức thì | Sàn giờ |
|---|---|---|---|---|
| `dap` | Hai nhịp mỗi quả. (1) Chạm quả trứng khi kim thước lực (chạy đi về, chu kỳ 1,1 s) nằm trong vùng xanh thì trứng nứt. (2) Vuốt xuống ±35°×mul để tách. Chạm thay vì vuốt, hoặc lực quá mạnh, thì vỏ rơi vào chảo. | `dap-pan`; `dap-egg` (`data-state=nguyen\|nut\|xong`); `dap-meter` (`data-a`, `data-b`); `dap-needle` (`data-v`); `dap-count`. Đủ n quả thì tự xong. | Vết nứt, tiếng `crack`, trứng rung 3px. Lòng đỏ rơi có squash, 6–10 giọt dầu, tiếng `sizzle`. Vỏ rơi thì hiện nhãn "Có vỏ!". | 1,5·n + 1 s |
| `xoay` | Vẽ vòng quanh tâm tô hoặc ly, chiều nào cũng được. Quá nhanh (> 2,2·mul vòng/s, gấp 1,8 lần nếu `fast`) quá 0,25 s thì sánh ra ngoài. | `xoay-bowl` (lấy tâm và bán kính bằng boundingBox); `xoay-progress` (`data-v` số vòng, `data-n` mục tiêu); `xoay-speed` (`data-v`, `data-max`). Đủ vòng thì tự xong. | Vệt xoáy mờ theo ngón, màu hòa dần (opacity của lớp phủ màu), tiếng `stir` mỗi nửa vòng. Sánh ra thì giọt bắn và tô rung. | 1,4·turns + 1 s (bản đầu 1,1) |
| `got` | Vuốt dọc từ trên xuống theo từng dải vỏ (K dải trên quả to), sai lệch ±35°×mul (tối đa 50°). Độ phủ mỗi dải là phần hợp của các nhát vuốt. | `got-fruit`; `got-band-i` (`data-done` 0..1); `got-count`; `got-done`. | Dải vỏ cuộn rơi, tiếng `peel`, dải đã gọt đổi màu ruột. | 1,2·strips + 1 s |
| `lac` | Kéo bình hoặc rổ lên xuống. Bộ đếm đổi chiều theo trục Y, ngưỡng 24px (`createReversalCounter`). Không dùng cảm biến chuyển động vì iOS bắt xin quyền. | `lac-area`; `lac-shaker`; `lac-count` (`data-v`, `data-n`; có `maxRatio` thêm `data-ok`, `data-zone`); `lac-bar` (chỉ khi có `maxRatio`). Không có `params.maxRatio`: đủ lượt thì tự xong. Có `maxRatio` (áo bột 1,2): không tự xong, lắc đủ rồi nhấc tay mới xong, quá ⌊K·maxRatio⌋ lượt là lắc quá tay. | Bình nghiêng theo ngón (phản hồi trực tiếp nên giữ cả khi giảm chuyển động), tiếng `shake` của đá, bọt dâng. | 0,4·strokes + 1 s |
| `bay` | Kéo từng món (viên đá) từ khay thả vào vùng đích. Khay có `max(n+1, 3)` món nên ghi chú "Ít đá" có ý nghĩa thật. Chạm món đã thả để lấy ra. Bấm Xong. | `bay-target`; `bay-item-i`; `bay-count` ("1/2"); `bay-done` (bật sau khi thả ≥1). | Squash 0,88→1, gợn nước, tiếng `plop`. Thả ngoài vùng thì món trôi về khay, không phạt. | 1,3·n + 1,5 s |

Hàm chấm mới trong `src/core/minigame-scoring.js` (thuần, 0–100, ra hạng theo `stepLabels`: ≥90 Hoàn hảo, ≥70 Tốt, ≥50 Đạt):

```js
export const DAP_ZONE = Object.freeze([0.40, 0.70])
// Đập trứng: mỗi quả = zoneScore(lực, vùng xanh, mul) nếu đã tách; vỏ rơi thì tối đa 40; quả chưa đập = 0.
// Điểm = trung bình n quả.
export function scoreDap({ cracks = [], n = 1, zone = DAP_ZONE, mul = 1 })
// Mốc trừ quá giờ (sau vòng kiểm chứng): overtimeAt(type, K, par) = max(2·par, sàn giờ của loại với số lượng K); nấu thử par = Infinity → không trừ
// Khuấy: 100·min(1, vòng/K) − 12·số lần sánh − (cv thời gian mỗi vòng > 0,45·mul ? 10 : 0) − (quá overtimeAt ? 15 : 0)
export function scoreXoay({ turns = 0, target = 1, spills = 0, cv = 0, elapsed = 0, par = 0, mul = 1 })
// Gọt: trung bình min(1, phủ/0,85) của K dải × 100 − min(24, 8·nhát hụt) − (quá overtimeAt ? 15 : 0)
export function scoreGot({ coverage = [], target, misses = 0, elapsed = 0, par = 0 })
// Lắc: 100·min(1, lượt/K) − (cv nhịp > 0,6·mul ? 10 : 0) − (quá overtimeAt ? 15 : 0)   (cùng nghĩa với cha strokes cũ)
//   − lacOverPenalty(lượt, K, maxRatio) khi bước có maxRatio m: r = lượt/K ≤ m → 0; ≤ m + 0,15 → 20; ≤ m + 0,4 → 45; hơn → 80
//   (áo bột m = 1,2: cùng bậc 100/80/55/20 với cham min cũ; không có maxRatio thì lắc dư không phạt)
export function scoreLac({ strokes = 0, target = 1, cv = 0, elapsed = 0, par = 0, mul = 1, maxRatio })
// Bày: trung bình điểm vị trí (d = khoảng cách tới tâm / bán kính: ≤0,35·m → 100, ≤0,6·m → 80, ≤1 → 55)
// − 30·|số đã thả − n|; chưa thả gì = 0                                      (cùng nghĩa với cham exact cũ)
export function scoreBay({ placed = [], n = 1, mul = 1 })
```

Mỗi hàm mới được chọn để **cùng nghĩa với bước nó thay thế**:
- `lac`, `xoay`, `got` thay `cha`, nên giữ mức trừ 15 vì quá giờ và tỉ lệ đủ lượt. Mốc trừ ban đầu là 2·par; sau vòng kiểm chứng đổi thành max(2·par, sàn giờ) vì thao tác mới chậm hơn bước chà nó thay mà par bị khóa (Khuấy đều 3 vòng par 2 từng bị trừ 41% số lượt ở người chơi trung bình).
- Lắc rổ áo bột năng thay `cham min` (`N 8`): giữ phạt chạm quá nhiều bằng `maxRatio` 1,2, và `lac.js` không tự xong ở K lượt (nhấc tay để xong) để phạt này dùng được.
- `bay` thay `cham exact` (đạp −30 cho mỗi lần lệch số lượng).
- Chỉ `dap` khó hơn bước cũ (thêm nhịp canh lực). Phần này giảm bằng vùng rộng và sàn giờ (quyết định Q7).

`src/ui/minigames/_gesture.js` chứa hàm thuần: `createTurnCounter({cx,cy,minR})` (tháo vòng góc, trả về số vòng, tốc độ, cv), `classifySwipe(p0,p1,{axis,tolDeg,minLen})`, `bandCoverage(segments,y0,y1)`, `createRhythm()`, `needleValue(t,period)`, `gestureLimitSec(step,{assist,untimed})`; `minLimitSec(type,params)` và `MIN_LIMIT` xuất lại từ lõi. Có test `tests/unit/m5-gesture.test.mjs`.

### 1.6 Dữ liệu công thức: chỉ đổi `type` và `params`, giữ id, par, w, critical

| Món | Bước (id) | Cũ | Mới | params mới |
|---|---|---|---|---|
| banh_mi_op_la | dap_trung | cham exact `{n:2,target:true}` | **dap** | `{ n: 2 }` (`them_trung` vá `n:3`, vẫn hợp lệ) |
| banh_mi_trung_ga_ta | dap_trung | cham exact | **dap** | `{ n: 2 }` (khung chứa đặt `--yolk` đậm) |
| tra_tac, tra_tac_mat_ong | lac | cha `{strokes:6}` | **lac** | `{ strokes: 6 }`, `skin: 'binh'` |
| banh_trang_tron, …_tay_ninh | got_xoai | cha `{spots:5}` | **got** | `{ strips: 5 }` |
| banh_trang_tron, …_tay_ninh | tron | cha `{strokes:8}` | **xoay** | `{ turns: 5 }`, `skin: 'to'` |
| ca_phe_sua_da, ca_phe_muoi | them_da | cham exact `{n:2,target:false}` | **bay** | `{ n: 2 }`, nhãn "Thả đá vào ly" (`it_da` vá `n:1`, vẫn hợp lệ) |
| ca_phe_sua_da, ca_phe_muoi | khuay | cha `{strokes:6}` | **xoay** | `{ turns: 3 }`, `skin: 'ly'` |
| ca_phe_muoi | danh_sua_muoi | cha `{strokes:8}` | **xoay** | `{ turns: 6, fast: true }`, `skin: 'chen'` |
| che_buoi | got_vo | cha `{spots:5}` | **got** | `{ strips: 5 }` |
| che_buoi | ao_bot | cham min `{N:8,T:3.5}` | **lac** | `{ strokes: 8, maxRatio: 1.2 }` (maxRatio thêm sau vòng kiểm chứng), `skin: 'ro'`, nhãn "Lắc rổ áo bột năng" |

Các bước giữ nguyên loại:
- `rua_dua`: cha. `core/kitchen.js:517` nhận ra bước rửa nhờ `cha` + tiền tố `rua`.
- `boc_trung_cut`: cha, vì ghi chú vá `spots`.
- `xe_kho_muc`, `bop_muoi`: cha strokes, chỉ đổi hình.
- Toàn bộ `thai`, `lua`, `rot`, cùng `cham` targets, min, exact còn lại.

Số lượt dùng mỗi loại mới: dap 2, lac 3, got 3, xoay 5, bay 2.

`minigame-types.js` thêm 5 mục, mỗi mục có `name`, `hint`, `icon` và lớp vỏ (skins) theo mẫu `lua`/`rot`:
- `dap`: icon `trung_ga`.
- `xoay`: icon `muong_khuay`; skins `to`, `ly`, `chen`.
- `got`: icon `dao_bao`.
- `lac`: icon `binh_lac`; skins `binh`, `ro`.
- `bay`: icon `khay_bay`; skin `ly`.

`hintFor` (`minigames/index.js:14-24`) không cần sửa logic. `dishComment.byType` (`kitchen.js:88-96`) thêm 5 câu góp ý.

### 1.7 Lõi và save

- `src/core/kitchen.js:10`: `SCALE_KEYS = ['n','N','cuts','strokes','turns','strips']`. Test: `effectiveSteps` với qty=2 nhân đôi `turns` và `strips`.
- `src/core/save.js`: hàm mới chạy trong `migrate()` ngay sau `migrateCookDraft` (khoảng `save.js:315-319`), cho cả `s.shift` lẫn `s.tasting.shift`.

```js
// M5 (0.5.0): bước đổi loại thao tác (vd Lắc đều: chà → lắc). Phiên nấu ở Thớt giữ bảng bước cũ trong save → dựng lại
// cook.board theo công thức hiện tại (cùng ghi chú, nguyên liệu đã chọn, số phần); giữ kết quả bước đã làm (cùng id),
// giữ activeStepId/retryPending nếu bước còn; không đổi tiền, phiếu, giá vốn, lượt làm lại. Chạy lại nhiều lần không đổi.
export function migrateCookBoard(sh, data)
```

Test `tests/unit/m5-save.test.mjs`:
1. Ca dở ở Thớt có `lac` kiểu `cha` và `thai_tac` đã xong: sau migrate, `type` là `lac`, `strokes` giữ nguyên, kết quả `thai_tac` giữ nguyên, ví, sổ ca và phiếu giữ nguyên (deepEqual).
2. qty 2: tham số và par nhân đúng như `effectiveSteps`.
3. `retryPending` và `activeStepId` trỏ vào bước vừa đổi loại vẫn được giữ.
4. phase `chon` và `xong` không bị đụng.
5. Phiên nấu thử được xử lý như ca thật.
6. Chạy migrate hai lần cho cùng kết quả; lưu rồi tải lại không đổi.
7. Thiếu dữ liệu công thức thì giữ nguyên.
8. Sau migrate, `submitStep('lac', {score:100})` rồi `finishDish` cho Q đúng như tính tay.

### 1.8 Luồng Bếp mới (Đợt 1, `src/ui/screens/kitchen.js`)

1. Chạm một bước trên thớt. Bảng chọn cách sơ chế dùng 3 thẻ hình lấy từ hình trạng thái. Bảng hiện tại ở `openSheet`, `kitchen.js:587-616`.
2. **Thẻ bước** thay `.k-hint` (`kitchen.js:694-705`):
   - Món đã nấu dưới `HINT_HIDE_AFTER_COOKS` lần: thẻ đầy đủ (ruy băng "Bước k/N", hình to, động từ cỡ 28px, tay mẫu), tự chạy sau 1.100 ms hoặc chạm để vào ngay.
   - Từ lần thứ 3 trở đi: chỉ hiện ruy băng gọn trong đầu sân khấu, không chờ.
   - N = `cook.board.length + 1` (tính cả bước Chọn); k = số bước đã xong + 1.
   - `layerKind = 'card'`.
3. Mount plugin với `ctx` mở rộng: `{ vfx: app.vfx, reduced, stepIndex, stepTotal }`. `buildFrame2` dựng đầu màn gọn ≤44px gồm chấm bước, `.mg-sub`, `mg-time`, và một lớp `.mg-fx`.
4. **Có kết quả**: gọi `submitStep` ngay (lưu tức thì) và **giữ sân khấu thêm khoảng 700 ms** (500 ms khi giảm chuyển động). Trong thời gian đó hiện con dấu, dừng hình 60 ms, Dì Sáu phản ứng. Sau đó mới `closeLayer()`, `render()`, rồi `criticalPrompt` nếu bước chí mạng bị Hỏng. `markLayer()` gọi ở cả hai mốc. Bước Chọn hiện con dấu ở `flashHost` như cũ.
5. **Thớt**: thớt gỗ lớn. Mỗi nguyên liệu là hình 64–72px, đổi sang hình trạng thái qua `state-map.js` sau khi làm bước. Các bước là huy hiệu tròn 48px có biểu tượng loại thao tác. Giữ lớp móc `.k-step`, `.is-available`, `.is-done`, `.has-method`, `.k-step-st` (chữ 13px "Tốt · 85" ngay dưới huy hiệu).
6. **Ra món**: `createDishReveal` trên `popLayer`. `REVEAL_MS` đổi từ 1.200 sang 2.200 (1.400 khi giảm chuyển động), chạm để bỏ qua. Nấu thử gọi `onDone` sau `REVEAL_MS + 150` như cũ.
7. **Tour trên thẻ bước**: `tourSpot()` trả `'card-<type>'` khi `layerKind === 'card'` và thẻ đang chờ. `guideHold(true)` với thẻ thì `card.hold(true)` (dừng tự chạy), không đóng lớp như với sân khấu. Sửa ở `kitchen.js:957-997`.

### 1.9 "Chế độ tập trung" khi nấu (đề xuất, quyết định Q1)

Khi đang ở tab Bếp, có món đang nấu (Chọn, Thớt hoặc sân khấu) và khung cao dưới 760px: thêm lớp `.service-screen.is-focus` để ẩn `.street` và `.progress4`. Panel tăng từ khoảng 286–318px lên khoảng 404–437px ở 320×568 và 360×600.

- Lớp được bật **trước khi** mount plugin, vì `thai.js` đo kích thước lúc mount.
- Dây phiếu (màu chờ) vẫn hiện.
- `toastLimit` (`service.js:61-70`) sẽ trả số âm, nên thông báo tự chờ tới khi thoát chế độ này.
- Đây là thay đổi nhỏ ở `service.js` và `game.css`, thuộc gói F của Đợt 1.

---

## 2. Đợt 0: bản mẫu để duyệt (dừng chờ người dùng)

### 2.1 Phạm vi chính xác

1. **Nền móng**: font Baloo 2 800 tự lưu, `css/theme.css` (bảng màu, nút bánh kẹo, khung giấy/gỗ/phấn), `vfx.js`, `motion.js`, 5 âm mới (`stamp`, `sparkle`, `fanfare`, `tick`, `whoosh`).
2. **Hình mẫu**: 12 chủ thể với 19 SVG.
   - Nguyên liệu thường: `dua_leo` (+ thái lát), `trung_ga` (+ nứt, + ốp la), `tac` (+ bổ đôi), `hanh_la`.
   - Cặp bẫy: `nuoc_tuong` / `nuoc_mam`, khác dáng chai chứ không chỉ khác màu, giữ chữ TƯƠNG và MẮM.
   - Hàng hiếm: `trung_ga_ta` ★.
   - Món: `mon_banh_mi_op_la`, `mon_tra_tac`.
   - Dụng cụ: `thot`, `dao_thep`, kèm bản lớn `thot_lon`, `dao_lon`.
   - Bàn tay mẫu: `tay`.
   - Tất cả nằm **đúng tệp đích** (`art/ing-tuoi.js`, `art/ing-kho.js`, `art/mon.js`, `art/tools.js`, `art/props.js`) nhưng **chưa ráp vào `ICONS`**. Game chính vẫn dùng hình cũ.
3. **Màn gọi món mới** (`order-bubble`, `menu-board`, `order-pad`, `note-icons`, `css/counter.css`):
   - Khách bán thân (tạm dùng mặt cũ phóng to).
   - Bong bóng có hình món 64px với huy hiệu ×2 và ghi chú bằng hình (hành lá gạch đỏ, tương ớt +).
   - Bảng gỗ có 4 thẻ món: bánh mì ốp la, trà tắc, bánh mì trứng gà ta "★ còn 2", trà tắc mật ong có băng "HẾT". Chỉ cần 2 hình món mà vẫn thấy đủ trạng thái hiếm và hết hàng.
   - Bảng chọn số lượng và ghi chú có hình.
   - Phiếu order giấy có hình từng dòng.
   - "Đọc lại" sáng lần lượt từng dòng. "Chốt order" đập con dấu ĐÃ CHỐT rồi phiếu bay lên dây phiếu nhỏ.
   - **Giữ đúng testid** `menu-item-<id>`, `order-sheet`, `qty-*`, `note-chip-*`, `add-line`, `order-line-<i>`, `readback`, `confirm-order`, `speech-bubble[data-request]`.
4. **Một bước bếp (Thái)**: thẻ "Bước 3/6 · Thái dưa leo!" có tay mẫu, rồi `thai.js` với `ctx.look === 2`.
   - Quả dưa leo to khoảng 220px trên thớt lớn.
   - Dao SVG lệch 40px phía trên ngón tay.
   - Lát cắt tách ra, có vụn và dừng hình.
   - Sau đó là con dấu theo điểm thật và Dì Sáu phản ứng.
   - Có nút xem nhanh đủ 4 hạng dấu.
   - Giữ `thai-board`, `thai-guide-i[data-x]`, `.thai-food`, `thai-count`, `thai-done`.
5. **Màn ra món**: tia sáng xoay, món nảy vào, huy hiệu hạng rơi xuống, % đếm lên, sao, ruy băng "Không tì vết", pháo giấy khi lên cấp, Dì Sáu kèm lời góp ý. Có nút thử 5 hạng.
6. **Trang mẫu** `mau.html`:
   - 4 thẻ: Hình, Gọi món, Bếp: Thái, Ra món.
   - Công tắc "Giảm chuyển động", "Âm thanh", "Khung thấp ~300px" (mô phỏng panel ở 360×600).
   - Thẻ Hình so cũ và mới cạnh nhau ở 48, 72, 120, 200px, trên nền giấy và nền gỗ.
   - App "hộp cát" (state giả, `createBus`, `createAudio`, `createVfx`). Không đăng ký SW, không ghi bản lưu của game.

### 2.2 Gói agent Đợt 0 (song song, mỗi gói sở hữu tệp riêng)

| Gói | Tệp sở hữu |
|---|---|
| 0-A Nền móng | `css/theme.css`, `src/ui/motion.js`, `src/ui/vfx.js`, `src/ui/audio.js` (chỉ thêm âm), `tests/unit/vfx.test.mjs` |
| 0-B Hình mẫu | `src/ui/art/{kit,ing-tuoi,ing-kho,mon,tools,props}.js`, `tests/unit/art-v2.test.mjs` |
| 0-C Bếp mẫu | `src/ui/components/{step-card,stamp,dish-reveal,disau-react}.js`, `css/fx.css`, `src/ui/minigames/_frame.js`, `src/ui/minigames/thai.js` (chỉ thêm nhánh `look===2`), `tests/unit/m5-components.test.mjs` |
| 0-D Gọi món mẫu | `src/ui/components/{order-bubble,menu-board,order-pad,note-icons}.js`, `css/counter.css` |
| 0-E Trang mẫu và phát hành | `mau.html`, `mau/mau.js`, `mau/mau.css`, `tests/e2e/mau.e2e.mjs`, `tools/dong-goi-artifact.mjs` |
| Ráp nối (agent chính) | `sw.js` (sửa điều hướng, PRECACHE, VERSION 0.4.2), `package.json`, `src/ui/app.js:17`, `index.html` (gắn theme, fx, counter css), `tests/unit/pwa.test.mjs`, `tests/helpers/static-server.mjs` (MIME `.woff2`), `tests/unit/banned-words.test.mjs` (quét thêm `mau.html` và `mau/`) |

Thứ tự: agent chính tải font trước. Bốn gói 0-A tới 0-D chạy song song theo hợp đồng API ở 1.2–1.4. Gói 0-E viết theo hợp đồng và ráp sau cùng. Tiếp theo là 2–3 agent kiểm chứng đối kháng, rồi sửa vòng 2.

### 2.3 Phát hành song song mà không phá bản chơi chính

- **Game chính không đổi hành vi.**
  - CSS mới chỉ chứa lớp `g-` và biến `--g-`.
  - Module mới chưa được game import (riêng `thai.js` có nhánh bật thử mà game không bật).
  - Bằng chứng: chạy đủ 3 nhóm e2e cũ, và chụp màn Mở đầu, Chuẩn bị, Ca bán trước và sau để so.
- **Sửa `sw.js`** (thuộc khối `sw.js:162-172`):
  - Chỉ điều hướng tới gốc scope hoặc `index.html` mới trả trang game đã lưu.
  - Trang khác (`mau.html`) lấy từ mạng; nếu mất mạng thì mới trả trang game.
  - Thêm test vào `pwa.test.mjs`: "điều hướng tới `/mau.html` khi có mạng không bị thay bằng index", kèm biến thể đường dẫn con `/gamefnb/`.
- **PRECACHE**:
  - Thêm các tệp mới trong `src/`, `css/`, cùng `fonts/*.woff2`.
  - `expectedFiles()` (`pwa.test.mjs:31-37`) thêm `walk('fonts', n => n.endsWith('.woff2'))`.
  - `OFL.txt` và `mau/*` không đưa vào PRECACHE.
  - VERSION 0.4.2 ở 3 nơi.
- **Đường link cho điện thoại**:
  1. **Artifact claude.ai "Bếp Khởi Nghiệp – Phòng mẫu"** (khuyên dùng). Dựng bằng `node tools/dong-goi-artifact.mjs --entry mau.html`. Khác nguồn nên không vướng SW.
  2. `https://kazesanaei.github.io/gamefnb/mau.html`. Nếu điện thoại **đã từng mở game**: mở game, vào màn Chuẩn bị bấm "Có bản mới – Tải lại" (hoặc đóng hết tab rồi mở lại), sau đó mới mở link mẫu. Lý do: SW cũ trả trang game cho mọi điều hướng.
- **gh-pages**: `git push origin HEAD:gh-pages` chỉ fast-forward, không `--force`.

### 2.4 Tiêu chí "xong" của Đợt 0

- `npm test` xanh: 410 test cũ cộng các test mới (art-v2, vfx, m5-components, pwa có thêm điều hướng, banned-words có thêm mau).
- e2e G1, G2, G3 xanh, không đổi.
- `mau.e2e` xanh ở 390×844, 360×600, 320×568 và 375×553 (có safe-area 47/34):
  - Không lỗi console.
  - Nút ≥44px, chữ ≥13px.
  - Bộ giải Thái theo `data-x` đạt ≥90 và hiện `step-result.grade-hoan_hao`.
  - Bảng ra món hiện đúng `data-q`.
  - Khi `reducedMotion: 'reduce'`: không còn hoạt ảnh vô hạn nào đang chạy.
  - `.vfx-layer` có `pointer-events:none` và tối đa 30 nút.
  - `document.fonts.check('800 20px "Baloo 2"')` trả true.
- Gửi 16 ảnh (4 thẻ × 4 khung) kèm 2 link. **Dừng.**

**Người dùng sẽ thấy:** một trang "Phòng mẫu" với 4 thẻ. Có thể chạm thử gọi món, chốt order có con dấu, thái dưa leo kiểu mới, xem 4 con dấu và 5 hạng ra món, bật/tắt giảm chuyển động và âm thanh. Kèm danh sách câu hỏi duyệt:
1. Bảng màu và độ dày viền.
2. Font tiêu đề.
3. Cỡ hình.
4. Chữ trên con dấu.
5. Độ dài màn ra món.
6. Bố cục gọi món.
7. Chế độ tập trung.

---

## 3. Đợt 1: nền tảng, Bếp và mini-game (bản 0.5.0)

### 3.1 Bước 0 (agent chính, không đổi hành vi, chạy e2e G2 trước khi chia việc)

Cắt CSS sân khấu mini-game từ `css/kitchen.css` (khoảng dòng 280–572) sang:
- `css/mg-prep.css`: khung sân khấu, chon, cha, thai.
- `css/mg-heat.css`: cham, lua, rot.
- `css/mg-mix.css`: tạo trống.

Gắn cả ba vào `index.html` và PRECACHE. Chỉ chuyển chỗ, không đổi luật CSS.

### 3.2 Gói song song

| Gói | Tệp sở hữu | Ghi chú |
|---|---|---|
| A Lõi và dữ liệu | `src/core/minigame-scoring.js`, `src/core/kitchen.js` (dòng 10), `src/core/save.js`, `src/data/{recipes,minigame-types,dialogue}.js`, `src/ui/minigames/_gesture.js`; test mới `m5-scoring`, `m5-gesture`, `m5-save`, `m5-balance`; sửa `data.test.mjs` | Toàn hàm thuần, xong trước tiên |
| B Hình đồ tươi | `src/ui/art/ing-tuoi.js` | 13 hình gốc, 21 hình trạng thái |
| C Hình đồ khô, chai lọ | `src/ui/art/ing-kho.js` | 29 hình gốc, 5 hình trạng thái |
| D1 Món và dụng cụ | `src/ui/art/mon.js`, `src/ui/art/tools.js` | 5 món, 14 dụng cụ |
| D2 Đạo cụ sân khấu | `src/ui/art/props.js` | 14 đạo cụ kèm `PROP_META` |
| E1 Sơ chế | `src/ui/minigames/{chon,cha,thai,got}.js`, `_util.js`, `_frame.js`, `css/mg-prep.css` | Bỏ nhánh v1 của thai. `feedback` gọi `ctx.vfx`. Giữ nguyên thuật toán của cha (`cha-fit.test`) |
| E2 Bếp lửa | `src/ui/minigames/{cham,lua,rot,dap}.js`, `css/mg-heat.css` | Giữ `data-v`, `data-a/b`, `.cham-bottle`, `.mg-sub`; chai Nêm nằm một hàng (`m4-rare.e2e`) |
| E3 Pha trộn | `src/ui/minigames/{xoay,lac,bay}.js`, `css/mg-mix.css` | |
| F Màn Bếp | `src/ui/screens/kitchen.js`, `css/kitchen.css`, `src/ui/art/state-map.js`, phần chế độ tập trung ở `service.js` và `game.css` | Luồng 1.8 |
| G1 VFX, âm, app | `src/ui/vfx.js`, `src/ui/motion.js`, `src/ui/audio.js`, `src/ui/app.js` (tạo `app.vfx`; **không** đụng `APP_VERSION`) | 5 âm thao tác: `crack`, `stir`, `peel`, `shake`, `plop` |
| G2 Thành phần và nút | `src/ui/components/{step-card,stamp,dish-reveal,disau-react}.js`, `css/fx.css`, `css/theme.css`, `css/base.css` | `.btn` chuyển sang kiểu bánh kẹo cho toàn game, giữ `min-height: var(--tap)` và **không đổi `--brick`** (test manifest) |
| H Tour và tài liệu | `src/data/tours.js`, `src/ui/components/tour.js`, `tests/unit/tour.test.mjs`, `docs/*.md`, `README.md` | |
| I E2E | `tests/e2e/helpers.mjs`, `_kitchen-smoke.mjs`, `hanh-trinh.mjs`, `fix-leftovers.e2e.mjs`, `tour.e2e.mjs`; mới `m5-bep.e2e.mjs`, `m5-save.e2e.mjs` | |
| Ráp nối | `src/ui/art.js` (mặt tiền), `src/ui/minigames/index.js` (11 loại), `tests/unit/minigame-ui-contract.test.mjs`, `sw.js`, `package.json`, `APP_VERSION`, `index.html` (preload font) | |

**Phụ thuộc:**
- A, B, C, D1, D2, G1, G2, H chạy cùng lúc.
- E1, E2, E3, F, I chạy song song theo hợp đồng ở 1.3–1.5. Mọi lời gọi `art()` và `prop()` đều phải có hình dự phòng, nên không phải chờ hình vẽ xong.
- Ráp nối, rồi kiểm chứng đối kháng (3 agent: V1 hợp đồng/testid/PRECACHE/từ cấm/chính tả; V2 màn thấp, hiệu năng, giảm chuyển động có ảnh chụp; V3 lối chơi, phân bố điểm, save), rồi sửa vòng 2 bởi chủ gói.

### 3.3 Test cũ phải sửa (có chủ ý)

**Unit:**
- `data.test.mjs:13`: `STEP_TYPES` thêm 5 loại. Dòng 145–160 thêm kiểm tham số: `dap.n` là số nguyên >0; `xoay.turns`, `got.strips`, `lac.strokes`, `bay.n` là số nguyên >0.
- `minigame-ui-contract.test.mjs:16,28-33`: 6 loại thành 11.
- `tour.test.mjs:145`: SPOTS thêm `card-dap`, `card-xoay`, `card-got`, `card-lac`, `card-bay`.

**E2E:**
- `fix-leftovers.e2e.mjs`:
  - Bỏ `got_xoai` và `got_vo` khỏi `CHA_FIT_CASES` (dòng 645–656) và khỏi danh sách (g2) ở dòng 533–536, thay bằng `boc_trung_cut` của bánh tráng trộn Tây Ninh.
  - Bỏ `tron` và `lac` khỏi danh sách "lắc/xé" (dòng 694–704), giữ `xe_kho_muc` và `bop_muoi`.
  - Các khung đã bỏ chuyển sang kiểm ở `m5-bep.e2e`.
- `helpers.mjs` `playStage` (dòng 469–586) thêm 5 nhánh:
  - `dap`: chờ `data-v` của kim nằm trong `[a,b]`, nhấn giữ quả trứng, kéo xuống 80px rồi thả.
  - `xoay`: vẽ 24 điểm mỗi vòng, khoảng 1 vòng/giây.
  - `got`: vuốt từ đỉnh xuống đáy theo boundingBox của từng dải.
  - `lac`: kéo lên xuống ±70px, chờ 24ms giữa các lần.
  - `bay`: kéo `bay-item-i` vào tâm `bay-target`, rồi bấm `bay-done`.
  - `_kitchen-smoke.mjs` (tự có `playStage` riêng) sửa tương tự.
- `hanh-trinh.mjs:68-76`: thêm nhãn ảnh `mg-dap`, `mg-xoay`, `mg-got`, `mg-lac`, `mg-bay`, `mg-the-buoc`, `mg-con-dau`.

**Không phải sửa nếu giữ lớp móc:**
- `playBoard` (`helpers.mjs:439-460`), vì thẻ bước vẫn là `step-hint` và `.k-layer` vẫn ẩn sau khi hiện con dấu.
- `tour.e2e` targets `.k-ticket`, `.k-line`, `.k-step`.
- `fix-line-mistakes` (`step-result[data-score]`).
- `fix-leftovers` dùng `dish-reveal` cùng `.closest('.k-layer')`.
- `_kitchen-smoke` dùng `.k-bubble`.

### 3.4 Test mới của Đợt 1

- **Unit:**
  - `m5-scoring`: mỗi hàm có các ca đạt 100, sát ngưỡng 90/70/50, đầu vào lỗi (NaN, âm, rỗng) cho 0 chứ không ra NaN, `mul` nới vùng.
  - `m5-gesture`.
  - `m5-save`.
  - `m5-balance`.
  - `art-v2` có đủ danh sách hình.
  - `m5-components`: `stepCardModel` tính "Bước k/N", `revealPlan` khi giảm chuyển động có tổng thời gian ≤1.400, `gradeKey`.
  - `audio.test` thêm kiểm: plugin mới có gọi đúng âm của nó.
- **`m5-bep.e2e`** (nhóm G2). Mỗi loại mới × {360×600 có 3 phiếu, 320×568, 375×553 safe-area, 390×844}:
  - Mọi đích nằm trong khung nhìn, phía trên `.mg-foot` và tabbar, `elementFromPoint` trúng đích.
  - Giải bằng **cảm ứng CDP** (kiểu `touchSwipe` của `fix-leftovers`) đạt ≥90.
  - Bật giảm chuyển động thì `stats().particles === 0`.
  - Thêm các ca: thẻ bước có "Bước", tay mẫu, chạm thì vào sân khấu; con dấu đóng trong 1,2 s; bảng ra món đếm % đúng rồi tự đóng trong 3 s; chế độ tập trung bật và tắt đúng lúc.
- **`m5-save.e2e`** (nhóm G3): nạp bản lưu kiểu 0.4.1 đang dở ở Thớt, tải lại, chơi `lac`, ra món, giao món; ví đổi đúng như dự tính.
- **`tour.e2e`**: thêm 5 ca tour trên thẻ bước, mỗi ca: tour hiện, ca dừng, bỏ qua, thẻ chạy tiếp.

### 3.5 Nghiệm thu Đợt 1

- Unit và 3 nhóm e2e xanh. `node tools/tim-seed.mjs` báo các seed đang dùng vẫn hợp lệ.
- Chạy `hanh-trinh` ở 2 khung: không kẹt, không lỗi cỡ chữ hay vùng chạm.
- Có ảnh mọi mini-game ở 4 khung.
- Hiệu năng (mục 8) đạt.
- Commit, push, gh-pages fast-forward, cập nhật artifact.

### 3.6 Rủi ro và cách giảm

| Rủi ro | Cách giảm |
|---|---|
| Thao tác mới khó hơn nên Q và tip giảm nhẹ | Vùng rộng, sàn giờ, mỗi hàm cùng nghĩa với bước cũ. Agent V3 chạy đầu vào giả lập "người chơi trung bình" để xem phân bố điểm. Ghi vào `docs/can-bang.md` |
| Màn thấp không đủ chỗ cho hình to | Chế độ tập trung, cỡ hình theo media query chiều cao (kệ Chọn: 56–72px khi đủ chỗ, 32–36px khi ≤700px), `revealTargets` mở rộng cho đích mới |
| `kitchen.js` dài 1.061 dòng, một gói sửa nhiều | Gói F chỉ đụng rail, board, luồng bước, reveal. Thành phần tách ra G2 |
| Tay mẫu và hoạt ảnh ăn chạm | Toàn bộ VFX `pointer-events:none`. Thẻ bước là một nút lớn duy nhất |
| Nhiều agent cùng sửa CSS | Mỗi gói sở hữu tệp CSS riêng, đã tách ở bước 0 |

---

## 4. Đợt 2: Quầy, HUD, cảnh phố, dây phiếu, tab, phiếu chấm, tình huống (bản 0.5.1)

### Bước 0 (một agent, không đổi hành vi, chạy e2e G2 và G3)

- Tách `counter.js` (725 dòng) thành `counter.js` (mount, `stateSig`, portal, glow) cộng 5 module `counter-{order,pay,cash,qr,receipt}.js`. Các module nhận chung một `ctx` gồm `{app, ui, say, rerender, sheetPortal, revealAboveBar}`.
- Tách `renderScoreSheet` (`service.js:681-722`) sang `components/score-sheet.js`. Hàm `sheetSettled` giữ trong `service.js`.
- Tách phần dựng tình huống và phàn nàn sang `components/incident-view.js`.
- Chuyển CSS quầy và phố từ `game.css` sang `css/counter.css` và `css/street.css`.

### Gói song song

| Gói | Tệp | Nội dung |
|---|---|---|
| Q-A Gọi món | `counter-order.js`, `components/{order-bubble,menu-board,order-pad,note-icons}.js`, `css/counter.css` | Ráp bản mẫu đã duyệt. Dòng mới "viết ra" chỉ cho `ui.lastAdded`. Chốt order dùng nhân bản rồi bay lên `rail-ticket-<id>`. `qty-value` chỉ chứa con số |
| Q-B Thu tiền | `counter-pay.js`, `counter-cash.js`, `components/{numpad,cash-drawer}.js`, `css/cashier.css` | Bảng giá phấn, máy POS có màn LED, phím bánh kẹo ≥48px. Tờ tiền 80×44 (72×40 khi ≤360). Ngăn kéo két. Tờ tiền bay vào khay. Giữ `data-amount`, `data-count`, chữ "Không cần thối" |
| Q-C QR và phiếu thu | `counter-qr.js`, `counter-receipt.js`, `css/receipt.css` | Điện thoại khách có QR giả, vệt quét sáng, tiếng `ting`. Phiếu in trượt ra. Kẹp phiếu thì phiếu bay lên dây. **Giữ `[receipt] .receipt-head span` = "Phiếu thu #001"** (`helpers.mjs:275`) |
| Q-D Phố, HUD, 4 khâu, dây phiếu, tab | `service.js` (phần phố và tab), `components/{hud,patience,progress4,ticket-rail}.js`, `css/street.css`, `css/game.css` | Mái bạt sọc bằng CSS, mặt trước xe đẩy SVG. Khách bán thân 72–88px, có vòng hoặc thanh kiên nhẫn, hàng chờ thu nhỏ 100/85/70%. Khách vào và ra chỉ hoạt ảnh **một lần theo id** (giữ một Set). Ví HUD đếm lên. Thanh 4 khâu thành 4 biểu tượng. Tab có biểu tượng và huy hiệu số. Giữ `hud-day` = "Ngày N", `.hud`, `.tabbar`, `progress-4[data-stage]` |
| Q-E Phiếu chấm và tình huống | `components/{score-sheet,incident-view}.js`, `css/sheet.css` | Mặt khách, sao bật lần lượt mỗi 180ms trên phần tử con, 5 hàng ✓/✗ có biểu tượng, xu tip. Giữ `.ss-rows`, `.ss-tags`, `[data-stars]`, `[data-tip]`, `.incident`, `.incident-choice`, `[data-safe]`, `.incident-fx[data-fx]` |
| Q-F Hình người và cảnh | `src/ui/art/{people,scene}.js` | Mục 6 |
| Q-G Âm và VFX bổ sung | `src/ui/audio.js` (`keng`, `ting`, `coin2`), `src/ui/vfx.js` (luồng xu) | |
| Q-H Tour, e2e, tài liệu | `tours.js` (lời `quay_*`), `tour.e2e`, mới `m5-quay.e2e.mjs`, `iphone-overlays` (nếu cần) | |
| Ráp nối | `art.js` (FACES, DI_SAU, `face()` giữ API), `sw.js`, version, `index.html` | |

**Nghiệm thu:** như Đợt 1. Thêm `m5-quay.e2e` (G2): đủ luồng tiền mặt, QR, QR giả ở 4 khung; nhân bản rồi bay không để sót nút trong `.vfx-layer`; vẽ lại theo `stateSig` không phát lại hoạt ảnh (đếm số `animationstart` sau 3 lần vẽ lại liền nhau bằng 0).

**Quyết định Q6:** `SHEET_MS` 2000 hay 2400. Sao bật lần lượt mất khoảng 900ms nên 2000 vẫn đủ.

---

## 5. Đợt 3: các màn ngoài ca (bản 0.5.2)

**Bước 0:** tách `meta.css` thành `css/{prep,shop,quests,mail,book,summary,market}.css` (chỉ chuyển chỗ).

| Gói | Tệp |
|---|---|
| M-A Chuẩn bị | `prep.js` (giữ export `dayEffectLines`), `chain-card.js`, `meta-ui.js`, `stage-up.js`, `css/prep.css` |
| M-B Chợ công thức và Nấu thử | `shop.js`, `tasting.js`, `css/shop.css` |
| M-C Nhiệm vụ, Hộp thư, Điểm danh, Sự kiện | `quests.js`, `mailbox.js`, `checkin-popup.js`, `event.js`, `css/quests.css`, `css/mail.css` |
| M-D Sổ công thức và Sổ tay nghề | `recipe-book.js`, `notebook.js`, `css/book.css` |
| M-E Cài đặt, Mở đầu, Hướng dẫn | `settings.js`, `settings.css`, `title.js`, `help.js` (thêm ghi công font Baloo 2, OFL, ở mục Giới thiệu) |
| M-F Tổng kết | `summary.js` (giữ export `incidentLines`), `css/summary.css`; sổ lãi lỗ đếm lên, sao, thạo món có hình |
| M-G Gánh hàng và Lựa hàng | `market.js`, `css/market.css` (kệ `chon` đã đổi ở Đợt 1) |
| M-H Hình meta | `src/ui/art/meta.js` |
| M-I Tour, e2e, tài liệu | `tours.js` (các màn ngoài ca), `tour.e2e`, mới `m5-meta.e2e.mjs` (nhóm G1) |

**Nghiệm thu:** 3 nhóm e2e xanh, `hanh-trinh` trọn hành trình, ảnh mọi màn ở 4 khung.

---

## 6. Danh sách hình, quy chuẩn vẽ, âm mới, bảng hiệu ứng

### 6.1 Quy chuẩn vẽ (đưa nguyên văn vào lời dặn mọi agent vẽ)

- **ViewBox:** ICONS, nguyên liệu, món, dụng cụ, hình trạng thái dùng `0 0 64 64`. Đạo cụ lớn dùng viewBox riêng, ghi trong `PROP_META`.
- **Nét:** viền ngoài `#3a2618` dày 3, chi tiết bên trong 1,5–2, đầu và góc nét bo tròn.
- **Ba tông cel-shading:** màu nền; mảng tối đậm hơn 15–20% ở phía dưới-phải, vẽ thành hình riêng nằm trong bóng dáng; điểm sáng trắng opacity 0,4–0,6 ở trên-trái.
- **Bóng đất:** ellipse INK opacity 0,15 tại y≈58.
- **Ánh sáng** luôn từ trên-trái.
- **Cấm:** gradient, filter, `clipPath`, `mask`, `pattern`, `<use>`, `href`, `url(`, base64, `<image>`. Cấm chữ `null`, `NaN`, `undefined` trong chuỗi SVG.
- **Chữ trong hình:** chỉ khi bắt buộc (TƯƠNG, MẮM), cỡ ≥9 đơn vị, `font-family="'Baloo 2', system-ui"`, đậm 800.
- **Cặp bẫy phải khác nhau ở dáng**, nhận ra được ở 48px:
  - nước mắm (chai thấp màu hổ phách, nhãn cá) và nước tương (chai cao nâu đen, nhãn đậu);
  - tắc (tròn nhỏ có lá) và chanh (bầu dục có núm);
  - hành lá (bó cọng) và hành tây (củ);
  - trứng vịt (to, trắng xanh) và trứng gà (nâu);
  - rau răm (lá nhọn có đốm tía) và húng lủi (lá tròn răng cưa);
  - bánh tráng mè (chấm mè) và bánh tráng;
  - cà phê hòa tan (gói que) và cà phê (túi hạt);
  - sữa tươi (hộp giấy) và sữa đặc (lon);
  - bột mì (bao có bông lúa) và bột năng (bao có củ khoai mì);
  - dừa nạo (sợi) và cốt dừa (lon hoặc nửa trái);
  - đường (bao) với muối (hũ nắp xanh, hạt tinh thể) và đường phèn (cục).
- **Hàng hiếm** có sao `#ffd23f` ở góc trên-phải (luật `data.test`).
- **Dung lượng:** mỗi ICON hoặc hình trạng thái ≤3,5 KB; đạo cụ và người bán thân ≤6 KB; tổng `src/ui/art/*` ≤320 KB. Tọa độ làm tròn 1 chữ số thập phân. Test `art-v2` kiểm.
- **Duyệt:** mỗi lô hình có ảnh lưới so ở 48, 72, 120, 200px trên nền giấy và nền gỗ. Agent V2 duyệt.

### 6.2 Số lượng hình

| Đợt | Nhóm | Số | Trạng thái kèm theo |
|---|---|---|---|
| 0 | Mẫu | 19 SVG (12 chủ thể) | dưa leo thái lát; trứng nứt, ốp la; tắc bổ đôi |
| 1 | Nguyên liệu tươi | 13 | 21 trạng thái: dưa leo (sạch, lát, sợi, bào); trứng gà (nứt, ốp la sống, ốp la vừa, ốp la cháy; trứng gà ta dùng `--yolk`); tắc (bổ đôi, vắt); xoài xanh (gọt, sợi, lát, hạt lựu); vỏ bưởi (gọt, hạt lựu, lát, sợi, áo bột, chín); trứng cút (bóc) |
| 1 | Nguyên liệu khô, chai lọ | 29 | 5 trạng thái: bánh tráng (sợi, vuông); khô mực (xé); bánh mì (nướng); đá (viên) |
| 1 | Món | 5 | Món hiếm dùng hình nền cộng huy hiệu |
| 1 | Dụng cụ và biểu tượng thao tác | 10 vẽ lại + 4 mới (`muong_khuay`, `dao_bao`, `binh_lac`, `khay_bay`) | |
| 1 | Đạo cụ sân khấu | 14 | `thot_lon`, `dao_lon`, `chao_lon`, `noi_lon`, `phin_lon`, `ly_lon` (mực nước bằng CSS), `to_lon`, `chen_lon`, `ro_lon`, `binh_lac_lon`, `bep_ga`, `dia_lon`, `voi_nuoc`, `tay` |
| 2 | Người và cảnh | khoảng 35 | Thân bán thân 6 kiểu khách, 24 mặt tâm trạng vẽ lại, phụ kiện cho khách quen và khách lạ; Dì Sáu 4 mặt cộng 4 tư thế (giơ ngón cái, vỗ tay, lau mồ hôi, che mặt); Anh Khoa, Cô Hạnh; mặt trước xe đẩy, điện thoại, máy POS, ngăn kéo két, máy in phiếu, kẹp phiếu, xu, hũ tip |
| 3 | Meta | khoảng 32 | 19 hình sự kiện, thư, rương, lịch, danh hiệu; 3 món tương lai; huy hiệu nền |

Tổng khoảng 180 hình.

### 6.3 Âm mới (thêm vào `SOUND_NAMES` ở `audio.js:7` và `RECIPES`; luôn gọi dạng chuỗi viết thẳng `sound('…')`)

- **Đợt 0:**
  - `stamp`: noise lọc thấp 400Hz 60ms cộng tone 140Hz.
  - `sparkle`: 3 nốt triangle so le 50ms.
  - `fanfare`: C5-E5-G5-C6 so le 90ms.
  - `tick`: 1kHz 18ms.
  - `whoosh`: noise quét 600→2400Hz 250ms.
- **Đợt 1:**
  - `crack`: noise lọc cao 3kHz 30ms cộng click.
  - `stir`: tiếng muỗng chạm thành tô.
  - `peel`: noise quét 1,5→3kHz 120ms.
  - `shake`: 3 tiếng đá chạm.
  - `plop`: tone 300→120Hz cộng noise.
- **Đợt 2:** `keng` (máy tính tiền), `ting` (QR về), `coin2` (tip).
- Mỗi lần phát lệch cao độ ngẫu nhiên khoảng ±4%. Âm phát ở UI nên dùng `Math.random` được; chỉ lõi mới cấm.

### 6.4 Bảng hiệu ứng

| Sự kiện | Hiệu ứng | Nơi gọi | Khi giảm chuyển động |
|---|---|---|---|
| Chạm vùng chơi | Gợn chạm 250ms | `_frame.js` lắng nghe trên vùng chơi, gọi `vfx.ripple` | Giữ (chỉ opacity) |
| Chọn nguyên liệu | Món bay đường cong vào rổ 350ms | `chon.js` toggle | Hiện thẳng trong rổ |
| Nhát thái chuẩn hoặc lệch | Dừng hình 60ms, lát tách trượt 8px, 3–5 vụn, chữ "Chuẩn!" / "Lệch" | `thai.js` `cutAt` | Không vụn, không trượt; chữ đứng yên rồi mờ |
| Rửa sạch vết | 3–6 hạt lấp lánh và bọt | `cha.js` (`is-clean`) | 1 hạt tĩnh |
| Đập trứng: nứt rồi tách | Vết nứt, trứng rung; lòng đỏ squash 420ms, 6–10 giọt dầu | `dap.js` | Hiện thẳng, giữ âm |
| Khuấy: quá nhanh | Giọt bắn, tô rung 3px | `xoay.js` | Chỉ viền đỏ |
| Gọt | Dải vỏ cuộn rơi 500ms | `got.js` | Dải mờ đi |
| Lắc | Bình theo ngón, bọt dâng | `lac.js` | Bình theo ngón, không tự lắc |
| Bày (thả) | Squash, gợn nước | `bay.js` | Hiện thẳng |
| Canh lửa gần cháy | Khói đen, bíp nhanh dần | `lua.js` | Khói tĩnh, giữ âm |
| Kết quả bước | Con dấu 1,6→1, xoay −8°, 220ms, dừng hình 60ms. Hoàn hảo: 10–14 hạt vàng, sao bay về chấm bước. Tốt: 4 hạt. Đạt: không hạt. Hỏng: khói xám, rung 4px | `kitchen.onStepResult` qua `stamp.js` và `vfx` | Dấu hiện bằng opacity 150ms, không hạt, không rung |
| Dì Sáu phản ứng | Bong bóng nảy 250ms | `disau-react.js` | Mờ dần vào |
| Ra món | Tia sáng xoay 10 s/vòng; món 0,4→1,1→1 trong 450ms (easeOutBack); huy hiệu rơi 400ms; % đếm 700ms có `tick`; 8–12 hạt; sao cách nhau 120ms | `dish-reveal.js` | Tia sáng đứng yên, mọi thứ hiện thẳng |
| Không tì vết, lên cấp | Ruy băng trượt; pháo giấy 30–40 mảnh trên canvas | `dish-reveal.js` và `vfx.confetti` | Ruy băng hiện thẳng, bỏ pháo giấy |
| Giao món (Đợt 2) | Món bay từ bếp lên khách ở phố | `kitchen.onServe` | Không bay |
| Chốt order (Đợt 2) | Dấu ĐÃ CHỐT, phiếu bay lên dây phiếu | `counter-order` (nhân bản rồi bay) | Dấu hiện, không bay |
| Báo tổng đúng hoặc sai | ✓ nảy / màn số rung | `counter-pay` | ✓ hiện / viền đỏ |
| Nhận tiền, thối đúng | 6–12 xu bay, so le 40ms; ví HUD đếm lên 600ms; két nảy | bus `payment.received` / `change.given`, nghe trong `service.js` | Số cập nhật ngay, kèm một nhịp sáng |
| QR về | Vệt quét chạy qua điện thoại, `ting` | `counter-qr` | Không vệt quét |
| Phiếu chấm, tip | Sao bật lần lượt; xu tip kèm "+5.000đ" | `score-sheet.js` | Hiện cùng lúc |
| Khách tới, rời, kiên nhẫn thấp | Trượt vào; rời vui thì nảy, giận thì có mây; hơi nước bốc trên đầu | `service.js` (phố) | Mờ dần, biểu tượng tĩnh |
| Rương, quà, điểm danh (Đợt 3) | Xu và sao bung ra | Các màn meta | Tĩnh |

---

## 7. Ảnh hưởng tới tour, tài liệu, save, PWA, artifact

- **Tour:**
  - `bep_thot` (`tours.js:172-180`) sửa lời bước "Trò nhỏ" để nhắc thao tác mới, ≤170 ký tự, ≤2 câu.
  - Giữ đích `.k-step.is-available`, `.k-step.has-method`, `board`, `finish-dish`, `abandon-dish`.
  - Thêm 5 tour `bep_dap`, `bep_xoay`, `bep_got`, `bep_lac`, `bep_bay` với spot `card-<type>`, mỗi tour 2 bước nhắm `step-card-demo` và `step-card-go`. Không đặt `veteranDay` vì là cơ chế mới, người chơi cũ cũng nên xem.
  - Đợt 2 cập nhật lời các tour `quay_*`. Đợt 3 cập nhật các tour màn ngoài ca.
  - Mọi đích phải còn là testid hoặc lớp móc. `tour.test` "lời tour khớp luật" không có số mới.
- **Tài liệu:**
  - `docs/kien-truc.md`: §2 thêm thư mục `art/`, `fonts/`, `mau/`; §6 thêm 5 loại bước và tham số; §10 thêm 5 hàm chấm; §12 thêm `migrateCookBoard`; §13 thêm vfx, motion, thành phần, chế độ tập trung, `buildFrame2`; §14 thêm testid mới; §16.1 ghi sửa điều hướng SW và font; thêm §19 "M5".
  - `docs/de-xuat-thiet-ke.md` §6.4: KHUAY, BAY_DIA, LAC thành MVP; thêm DAP, GOT. §6.5 thêm thẻ bước, con dấu, ra món. §3 bố cục gọi món.
  - `docs/can-bang.md`: thêm luật sàn giờ và bảng bất biến.
  - `docs/huong-dan-trien-khai.md`: thêm link phòng mẫu và cách nhận bản mới.
  - `README.md`: tính năng mới, ghi công font.
  - Báo cáo nghiên cứu 25 game lưu vào `docs/tham-khao/m5-nghien-cuu-giao-dien.md`. Tên game chỉ được ghi trong `docs/`.
- **Save:** chỉ Đợt 1 có `migrateCookBoard`. `STATE_VERSION` giữ 3. Đợt 2 và 3 chỉ đổi giao diện.
- **PWA:**
  - Mỗi đợt tăng VERSION ở `sw.js:14`, `package.json`, `app.js:17` (0.4.2, 0.5.0, 0.5.1, 0.5.2) và cập nhật PRECACHE.
  - Mọi CSS mới phải gắn trong `index.html`.
  - Từ Đợt 1 thêm `<link rel="preload" as="font" type="font/woff2" crossorigin>` cho tệp latin.
  - Mỗi lần nâng bản, người chơi tải lại toàn bộ (khoảng 1,8 MB, cache `bkn-`). Có thể chấp nhận; nếu muốn thì dùng cache riêng cho font với tiền tố khác.
- **Artifact:**
  - Dựng bằng `tools/dong-goi-artifact.mjs`, đi theo PRECACHE nên tự kèm font.
  - Nếu artifact không phục vụ được tệp nhị phân `.woff2` thì font tự lùi về chữ hệ thống (`font-display: swap`). Kiểm bằng mắt sau mỗi lần đăng.
  - Đợt 0 có thêm artifact phòng mẫu.

---

## 8. Kế hoạch kiểm chứng đầu-cuối (mỗi đợt)

1. `npm test` (410 test cũ cộng test mới) và `node tools/tim-seed.mjs`.
2. **E2E 3 nhóm chạy nền.** G1: `m5-meta` (Đợt 3). G2: `m5-bep`, `m5-quay`. G3: `mau`, `m5-save`. `--test-concurrency=1`.
3. **Ma trận ảnh:** 390×844, 360×600, 320×568, 375×553 (đặt `--safe-top: 47px` và `--safe-bottom: 34px` qua `initCss` như `iphone-overlays`). Màn chụp theo đợt. Chạy `hanh-trinh` với `SHOT_DIR`, `SEED=6`, ở 390×844 và 360×600.
4. **Hiệu năng** (Chromium, CDP `Emulation.setCPUThrottlingRate` 4×) đo trong lúc con dấu, ra món, khuấy và xu bay:
   - Tổng long task ≤300ms cho mỗi hiệu ứng.
   - p95 khoảng cách giữa các khung rAF ≤34ms.
   - Đỉnh số nút trong `.vfx-layer` ≤30; canvas `data-n` ≤150.
   - Lớp VFX về 0 sau 2 s; hiệu ứng tự dọn khi ẩn tab.
5. **Giảm chuyển động:** kiểm cả `reducedMotion: 'reduce'` của Playwright lẫn công tắc trong game. Không còn hoạt ảnh vô hạn đang chạy, không hạt, thời gian ra món ≤1.400ms.
6. **PWA:** `pwa-backup.e2e` (chơi offline, nhận bản mới), `subpath.e2e` (`/gamefnb/` có font trong cache), test điều hướng `mau.html`.
7. **Tour:** `tour.e2e`, gồm 5 tour thẻ bước.
8. **Save:** `m5-save.e2e` và unit.
9. **Từ cấm và chính tả:** test từ cấm; agent V1 rà chuỗi hiển thị mới xem có thiếu dấu không.
10. **Người dùng thử trên iPhone thật** qua gh-pages, theo danh sách: tay mẫu dễ hiểu; 5 thao tác làm được bằng một tay; không bị che bởi thanh Safari; âm thanh; giảm chuyển động.

---

## 9. Chỗ cần người dùng quyết định

**Đã chốt (02/10/2026, sau khi duyệt Phòng mẫu Đợt 0):** người dùng duyệt phong cách mẫu, không yêu cầu chỉnh; **Q1 bật chế độ tập trung khi nấu**; **Q6 màn ra món giữ khoảng 2 giây** (`REVEAL_MS` 2.200, chạm để bỏ qua), `SHEET_MS` giữ 2.000. Các mục còn lại theo đề xuất mặc định: Q2 để M6, Q3 giữ hình món nền + huy hiệu, Q4 thư 0.5.0 không quà, Q5 không dùng mẹo rung iOS, Q7 vùng xanh 0,40–0,70 + sàn giờ, Q8 giữ `mau.html`, Q9 giữ `system-ui` cho chữ thân.

- **Q1. Chế độ tập trung khi nấu:** ẩn dải khách và thanh 4 khâu khi đang nấu ở màn cao dưới 760px. Đề xuất: **bật**.
- **Q2. `bay` chỉ thay "Thêm đá" ở 2 món cà phê**, không thêm bước mới để giữ nguyên par. Nếu muốn có bước Bày (kẹp nhân, trang trí) cho bánh mì hoặc trà tắc thì phải tăng tổng par (đổi thời gian phục vụ) hoặc cắt par của bước khác. Đề xuất: để M6.
- **Q3. Món hiếm:** giữ hình món nền cộng huy hiệu ★/"Hiếm" (không phải sửa test), hay vẽ 4 hình riêng (sửa `data.test.mjs:92` có chủ ý)? Đề xuất: giữ hình nền.
- **Q4. Thư "Có gì mới" bản 0.5.0 không kèm quà:** nếu thêm thì phải sửa `meta-mail` và `m4-save` (kỳ vọng `seenVersion`). Đề xuất: có, không quà.
- **Q5. Rung trên iOS bằng mẹo `<input switch>`:** đề xuất **không làm** (cách không chính thức); thay bằng rung khung cộng âm thanh.
- **Q6. Thời gian hiện bảng ra món (1,2 s → 2,2 s, chạm để bỏ qua) và `SHEET_MS`:** cần chốt.
- **Q7. Độ khó đập trứng hai nhịp và sàn giờ:** chấp nhận hay muốn dễ hơn nữa (vùng xanh rộng hơn)?
- **Q8. `mau.html` và `mau/` sau M5:** giữ làm "phòng thử giao diện" hay xóa? Xóa thì cần người dùng xác nhận.
- **Q9. Font chữ thân bài:** giữ `system-ui` (0 byte, đề xuất) hay thêm Nunito (+22 KB)?

### Critical Files for Implementation
- /home/user/gamefnb/src/ui/screens/kitchen.js
- /home/user/gamefnb/src/core/minigame-scoring.js
- /home/user/gamefnb/src/data/recipes.js
- /home/user/gamefnb/sw.js
- /home/user/gamefnb/tests/e2e/helpers.mjs
