# Kiến trúc kỹ thuật — Bếp Khởi Nghiệp (MVP)

Tài liệu này là **hợp đồng chung** giữa các module. Mọi file code phải tuân theo đúng tên file, tên hàm, cấu trúc dữ liệu dưới đây. Nếu cần thêm hàm, được phép thêm; **không đổi chữ ký** các hàm đã khai báo ở đây mà không cập nhật tài liệu này.

Thiết kế gameplay chi tiết: `docs/de-xuat-thiet-ke.md` (bản gốc tham khảo: `docs/tham-khao/ban-tong-hop-v0.1.md` và các chỉnh sửa trong `docs/tham-khao/phan-bien-v0.1.md`).

---

## 1. Nguyên tắc

- HTML/CSS/JavaScript thuần, **ES Modules**, không bước build, không thư viện ngoài khi chạy. Chạy bằng máy chủ tĩnh bất kỳ (`npm run serve`).
- Ba tầng, phụ thuộc một chiều: `src/ui → src/core → src/data`. `src/core` **không** được dùng `document`, `window`, `localStorage`, `Date.now()`, `Math.random()` (thời gian và ngẫu nhiên được truyền vào). Nhờ vậy test được bằng Node.
- **Mọi trạng thái game là dữ liệu JSON thuần** (không class, không hàm, không `Map`/`Set`) để lưu và khôi phục nguyên vẹn, kể cả ca đang dở.
- Không đưa state hay engine ra `window`.
- Tiền là **số nguyên đồng** (VNĐ). Không dùng số thực cho tiền.
- Chuỗi hiển thị: tiếng Việt có dấu, đúng chính tả. Tên hàm, biến: tiếng Anh. Id dữ liệu: snake_case tiếng Việt không dấu (vd `banh_mi_op_la`). Chú thích code: tiếng Việt có dấu.
- **Cấm** xuất hiện trong chuỗi hiển thị và dữ liệu game: "Cooking Mama", "iPOS", "FABi", tên các game tham khảo, tên ngân hàng/ví điện tử/app giao hàng thật (MoMo, ZaloPay, VNPay, VietQR, NAPAS, Grab, ShopeeFood, Baemin, Be…), "Michelin". Có test tự động quét `src/`.
- Không hiển thị cho người chơi các từ nội bộ: TNC, seed, par, toast, chip, MV. Tiền cao cấp hiển thị là "Muỗng Vàng" kèm biểu tượng.

## 2. Cấu trúc thư mục

```
index.html                 trang game (có khối <noscript>/thông báo file:// viết bằng HTML + script thường; gắn manifest, biểu tượng)
manifest.webmanifest       PWA (M3): tên, màu, biểu tượng 192/512 + maskable, standalone, dọc
sw.js                      service worker (M3): PRECACHE toàn bộ tệp, cache-first, VERSION = package.json (mục 16)
.nojekyll                  tệp rỗng cho GitHub Pages (không chạy Jekyll, giữ tệp tên bắt đầu bằng "_"; ngoài PRECACHE, mục 27)
icons/                     icon.svg (gốc) + icon-192.png, icon-512.png, apple-touch-icon.png (dựng bằng tools/make-icons.mjs)
tools/make-icons.mjs       dựng PNG từ icon.svg bằng Chromium (Playwright); chạy tay `npm run icons`, PNG được commit
css/base.css               biến màu, font hệ thống, reset, bố cục khung điện thoại; M5: nút .btn kiểu "bánh kẹo" toàn game
css/game.css               giao diện các màn; M5: chế độ tập trung khi nấu (.service-screen.is-focus)
css/kitchen.css            màn Bếp (dây phiếu, thẻ công thức, Thớt huy hiệu bước, lớp sân khấu, ra món)
css/mg-prep.css            (M5) khung sân khấu bếp kiểu mới (tường gạch men, thanh chân mặt quầy gỗ) + Chọn, Chà, Thái, Gọt
css/mg-heat.css            (M5) Nêm, Canh lửa, Rót, Đập trứng
css/mg-mix.css             (M5) Khuấy, Lắc, Thả đá
css/theme.css              (M5) @font-face Baloo 2, biến --g-*, nút .g-btn, khung giấy/gỗ/phấn (.g-paper/.g-wood/.g-chalk)
css/fx.css                 (M5) thẻ "Bước k/N", tay mẫu, con dấu, màn ra món, Dì Sáu phản ứng, lớp .vfx-layer
css/counter.css            (M5) màn gọi món kiểu mới (bản mẫu Đợt 0, ráp vào Quầy ở Đợt 2)
css/meta.css, tour.css     các màn ngoài ca; lớp phủ hướng dẫn lần đầu (mục 29)
css/settings.css           (M3) màn Cài đặt, nút Cài đặt/nhắc sao lưu/"Có bản mới" ở màn Chuẩn bị, hộp thoại sao lưu
fonts/                     (M5) baloo2-800-latin.woff2, baloo2-800-vi.woff2 (font tiêu đề tự lưu, có trong PRECACHE) + OFL.txt
mau.html, mau/             (M5) Phòng mẫu giao diện (mau.js, mau.css); KHÔNG nằm trong PRECACHE, không đăng ký service worker
tools/dong-goi-artifact.mjs  dựng trang artifact claude.ai theo PRECACHE (--entry mau.html cho Phòng mẫu)
src/main.js                khởi động: nạp save, tạo app, router, vòng lặp
src/core/                  logic thuần
  rng.js  money.js  clock.js  bus.js  state.js  save.js
  order.js  customer.js  shift.js  kitchen.js  minigame-scoring.js  scoring.js
  economy.js  mastery.js
src/data/                  nội dung + cân bằng (export const … = Object.freeze(...))
  index.js  balance.js  ingredients.js  recipes.js  minigame-types.js  customers.js
  dialogue.js  reviews.js  upgrades.js  tips.js  strings.js
src/ui/
  dom.js  app.js  router.js  loop.js  input.js  format.js  art.js  audio.js  motion.js (M5)  vfx.js (M5)
  art/        (M5) kit.js (hàm vẽ, bảng màu cel-shading) ing-tuoi.js ing-kho.js mon.js tools.js props.js (đạo cụ lớn,
              PROP_META) state-map.js (bước → hình trạng thái) v2.js (lớp tương thích); art.js là mặt tiền gộp lại
  components/ hud.js toast.js modal.js progress4.js patience.js ticket-rail.js cash-drawer.js numpad.js
              M5: step-card.js stamp.js dish-reveal.js disau-react.js (bếp) order-bubble.js menu-board.js order-pad.js
              order-sheet.js note-icons.js (gọi món kiểu mới, ráp ở Đợt 2)
  screens/    title.js prep.js service.js counter.js kitchen.js summary.js
  minigames/  index.js _util.js _frame.js (M5: buildFrame2) _gesture.js (M5: đo cử chỉ) chon.js cha.js thai.js cham.js
              lua.js rot.js; M5: dap.js xoay.js got.js lac.js bay.js
tests/unit/*.test.mjs      node:test (integration-shift.test.mjs: DATA thật, 3 ca liên tiếp, người chơi hoàn hảo/ẩu;
                           integration-meta.test.mjs: 5 ngày thật × 3 ca kèm toàn bộ hệ thống meta M2 và người chơi
                           trung bình, mục 15.10; review-m2-fixes.test.mjs: hồi quy vòng soát lỗi M2, mục 15.11)
tests/e2e/*.e2e.mjs        Playwright (Chromium ở /opt/pw-browsers): one-shift, reload, kitchen-back (M1);
                           m2-meta, m2-ui, checkin-quests, shop, event-2011, review-m2 (M2, mục 15.10–15.11);
                           pwa-backup (M3 nền tảng, mục 16.6), incident-notebook (M3 nội dung, mục 17.5);
                           stability (ráp nối M1–M3: chuyển màn nhanh, rò rỉ, mục 18);
                           save-safety, review-m3-ux (vòng soát lỗi M3: bộ nhớ bị chặn/đầy, bản lưu hỏng, mã từ bản mới
                           hơn; giao diện ngày 1 ở 360×740, chép mã thất bại, mục 18.5)
tests/e2e/hanh-trinh.mjs   hành trình dài chạy tay `node tests/e2e/hanh-trinh.mjs` (không nằm trong `npm run e2e`, mục 18.1)
tests/e2e/helpers.mjs      nạp Playwright, ngữ cảnh 390×844 cảm ứng (openGame({clock, viewport, contextOptions, initCss}): clock true | {time} cài
                           đồng hồ giả; contextOptions ghi đè tùy chọn ngữ cảnh (vd UA iPhone); initCss gắn CSS vào mọi trang),
                           người chơi tự động qua data-testid (playBoard dùng cả cho Nấu thử; playShiftUi chơi cả ca),
                           seedSave (nạp save dựng sẵn bằng encodeSave vào khóa thật), enterPrep, claimCheckinIfShown,
                           readSave/waitSave (đọc DEV_SAVE_KEY khi đã mở bằng ?devNow, không thì SAVE_KEY),
                           resolveIncidentIfShown (M3: gặp hộp tình huống trong ca thì chọn cách an toàn; người chơi tự
                           động gọi sẵn ở waitCustomerOrEnd / serveAtCounter / cookAndServe / playShiftUi),
                           waitController (chờ service worker kích hoạt, đã cất đủ tệp), pollEval(page, fn, arg, {timeout, label})
                           (thăm dò page.evaluate tới khi truthy — thay page.waitForFunction với hàm trả Promise)
tests/helpers/static-server.mjs  perfect-player.mjs (M3: playShift(state, ctx, { incident: chọn }) và handleIncident
                           xử lý tình huống trong ca như giao diện ở tab Quầy); static-server: startServer(port, host,
                           { basePath, onResponse }) — basePath vd '/gamefnb' phục vụ gốc repo dưới đường dẫn con (mục 27)
docs/                      tài liệu
package.json
```

M2 (lõi + dữ liệu, đã có — chi tiết mục 15): `core/meta.js stats.js rewards.js checkin.js quests.js mail.js chains.js shop.js events.js progression.js`, `data/checkin.js quests.js mail.js chains.js shop.js events.js day-events.js progression.js`, test `tests/unit/meta-*.test.mjs` (tiện ích `tests/helpers/meta-helpers.mjs`).
M2 giao diện (đã có — mục 13.1): `css/meta.css`, `ui/screens/shop.js tasting.js quests.js mailbox.js event.js stage-up.js`, `ui/components/meta-ui.js chain-card.js checkin-popup.js`; e2e `tests/e2e/m2-meta.e2e.mjs` (điểm danh qua 04:00, sự kiện → Chè bưởi → hết mùa vẫn giữ, Shop, Việc hôm nay), `tests/e2e/m2-ui.e2e.mjs` (Nấu thử, sự kiện ngày + Phiếu Chợ Sớm, soát bố cục 360×740), `tests/e2e/checkin-quests.e2e.mjs`, `tests/e2e/shop.e2e.mjs`, `tests/e2e/event-2011.e2e.mjs` (luồng đầy đủ qua giao diện thật, mục 15.10).
M3 nền tảng (đã có — mục 16): `manifest.webmanifest`, `sw.js`, `icons/`, `tools/make-icons.mjs`, `css/settings.css`, `ui/screens/settings.js`, mã sao lưu trong `core/save.js`, âm thanh `ui/audio.js`; test `tests/unit/pwa.test.mjs backup-code.test.mjs audio.test.mjs`, e2e `tests/e2e/pwa-backup.e2e.mjs`.
Vòng soát lỗi M3 (mục 18.5): test `tests/unit/review-m3-fixes.test.mjs`, e2e `tests/e2e/save-safety.e2e.mjs`, `tests/e2e/review-m3-ux.e2e.mjs`.
M3 nội dung (đã có — mục 17): `core/incidents.js notebook.js recipe-book.js`, `data/incidents.js`, `ui/screens/notebook.js recipe-book.js` (đăng ký trong `SCREENS` của `src/main.js`, có trong PRECACHE của `sw.js`); màn Chuẩn bị gọn (lưới 7 ô lối vào); test `tests/unit/incidents.test.mjs notebook-recipe-book.test.mjs money-rounding.test.mjs`, e2e `tests/e2e/incident-notebook.e2e.mjs`.
M4 (bản 0.4.0 — mục 19–22): `core/rare.js`, `data/rare.js`, `ui/screens/market.js` (màn "Lựa hàng", có trong `SCREENS` và PRECACHE), sổ tiền sự kiện trong `core/economy.js`, 8 sự kiện ngày và 8 tình huống mới trong dữ liệu; `tools/tim-seed.mjs` (tìm seed cho e2e, ngoài `src/` nên không vào PRECACHE); test `tests/unit/m4-tip.test.mjs m4-frequency.test.mjs m4-events.test.mjs m4-incidents.test.mjs m4-rare.test.mjs m4-save.test.mjs review-m4-fixes.test.mjs`; `tests/fixtures/save-v2.mjs` (save thật của bản 0.3.0 đang dở ca, dùng cho `m4-save`); e2e `tests/e2e/m4-rare.e2e.mjs`, `tests/e2e/m4-tip-events.e2e.mjs` với hàm dựng save dùng chung `tests/helpers/m4-saves.mjs` (mục 23).
Sửa 2 lỗi tồn đọng sau M4 (mục 24): test `tests/unit/fix-chon-draft.test.mjs`, e2e `tests/e2e/fix-leftovers.e2e.mjs`.
Triển khai dưới đường dẫn con / GitHub Pages (mục 27): `.nojekyll`, e2e `tests/e2e/subpath.e2e.mjs`, hướng dẫn cho người dùng `docs/huong-dan-trien-khai.md`.
Sửa lớp phủ bị thanh tab che trên iPhone (bản 0.4.1, mục 28): `createPortal` trong `ui/dom.js`, lớp nổi của bếp (`.k-pop`), biến vùng an toàn `--safe-top/--safe-bottom` (`css/base.css`); e2e `tests/e2e/iphone-overlays.e2e.mjs`.
Hướng dẫn lần đầu và nút "?" (bản 0.4.1, mục 29): `core/tour.js`, `data/tours.js` (`TOURS`, `TOUR_SCREENS`, `HOW_TO_PLAY`), `ui/components/tour.js` (lớp phủ tour, `app.tour`), `ui/components/help.js` (nút "?", bảng Hướng dẫn, Cách chơi), `css/tour.css` (gắn trong `index.html`); test `tests/unit/tour.test.mjs`, e2e `tests/e2e/tour.e2e.mjs`.
M5 — giao diện kiểu game nấu ăn (Đợt 0 bản 0.4.2, Đợt 1 bản 0.5.0, mục 31): font `fonts/`, `css/theme.css fx.css counter.css mg-prep.css mg-heat.css mg-mix.css`, `ui/motion.js vfx.js`, thư mục `ui/art/`, thành phần bếp và gọi món ở `ui/components/`, `ui/minigames/_frame.js _gesture.js dap.js xoay.js got.js lac.js bay.js`, 5 hàm chấm mới trong `core/minigame-scoring.js`, `save.migrateCookBoard`; Phòng mẫu `mau.html` + `mau/`, `tools/dong-goi-artifact.mjs`; test `tests/unit/art-v2 vfx m5-components m5-order-ui m5-scoring m5-gesture m5-save m5-balance m5-kitchen-ui .test.mjs`, e2e `tests/e2e/mau.e2e.mjs` (Đợt 0), `m5-bep.e2e.mjs`, `m5-save.e2e.mjs` (Đợt 1, gói kiểm thử).

## 3. package.json

```json
{
  "name": "bep-khoi-nghiep",
  "version": "0.5.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"tests/unit/**/*.test.mjs\"",
    "serve": "node tests/helpers/static-server.mjs 8080",
    "e2e": "node --test --test-concurrency=1 \"tests/e2e/**/*.e2e.mjs\"",
    "icons": "node tools/make-icons.mjs"
  }
}
```

`version` trùng `VERSION` của `sw.js` và `APP_VERSION` của `src/ui/app.js` (có test). Đổi tệp của game khi phát hành thì tăng cả ba. Bản hiện tại **0.5.0** (M5 Đợt 1: Bếp kiểu game nấu ăn, 5 thao tác mới, mục 31). Các bản trước: 0.4.1 (sửa lớp phủ trên iPhone, mục 28; hướng dẫn lần đầu và nút "?", mục 29), 0.4.2 (M5 Đợt 0: Phòng mẫu, font tiêu đề, sửa điều hướng của service worker). Thư phiên bản `MAIL_CONFIG.currentVersion` = 0.5.0: thư "Có gì mới: bếp mới và 5 thao tác mới" (`phien_ban_0_5_0`, không kèm quà; bản sửa lỗi 0.4.1/0.4.2 không có thư riêng, mục 15.5).
E2E nạp Playwright bằng `createRequire`, thử `require('playwright')` rồi tới `/opt/node22/lib/node_modules/playwright`. Biến `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` đã có sẵn trong môi trường.

## 4. Cấu trúc save (state gốc)

`src/core/state.js` xuất `defaultState(seed)`:

```js
{
  version: 3,              // STATE_VERSION: M1 là 1; M2–M3 là 2; M4 (bản 0.4.0) là 3 (save.migrate tự nâng, mục 12)
  seed: 0,                 // số nguyên 32-bit, sinh 1 lần khi tạo save
  shopName: '',            // tên xe do người chơi đặt ở ngày 1
  day: 1,                  // ngày game = số thứ tự ca kế tiếp
  chang: 1,                // chặng hiện tại (MVP chỉ 1)
  wallet: 200000,          // "Tiền quán" (đồng)
  reputation: 0,           // danh tiếng, không bao giờ giảm
  goldSpoons: 0,           // Muỗng Vàng
  ratings: [],             // tối đa 30 số sao gần nhất (số nguyên 1..5)
  reviews: [],             // tối đa 60 {day, stars, name, text}
  recipes: {               // recipeId → tiến độ; chỉ món đã sở hữu mới có mặt
    banh_mi_op_la: { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 },
    tra_tac:       { ... }
  },
  upgrades: {},            // upgradeId → true
  tipsSeen: [],            // id thẻ Mẹo nghề đã mở
  stats: {                 // bộ đếm tích lũy (thành tựu/nhiệm vụ đọc từ đây)
    customersServed: 0, customersLost: 0, dishesCooked: 0, perfectSteps: 0,
    changeCorrect: 0, changeWrong: 0, readbacks: 0, qrConfirmed: 0, fakeQrCaught: 0,
    flawlessDishes: 0, totalRevenue: 0, shiftsPlayed: 0
  },
  loan: null,              // {amount, remaining} khi đang nợ Dì Sáu
  settings: {
    sound: true, vibrate: true, tips: true, reducedMotion: false,
    assistCash: false,     // Hỗ trợ tính tiền: hiện tổng và tiền thối
    assistMotion: false,   // Hỗ trợ thao tác: vùng mục tiêu rộng hơn, chậm hơn
    volume: 0.8,           // M3: âm lượng 0..1
    incidentFrequency: 'vua'   // M3: tần suất tình huống trong ca 'nhieu' | 'vua' | 'it' (INCIDENT_FREQUENCIES của state.js);
                               // M4: tên hiển thị "Tần suất sự kiện", áp cho cả sự kiện ngày (mức Ít chỉ loại tốt); đọc bằng eventFrequency(state)
  },
  history: [],             // tối đa 60 bản tổng kết ca (xem economy.summarizeShift)
  shift: null,             // ca đang chơi (mục 7) hoặc null
  clock: { maxSeen: 0 },
  rev: 0,                  // số hiệu bản ghi: tăng mỗi lần lưu (writeSave); tab cũ thấy bản lưu có rev lớn hơn thì không ghi đè
  backup: { lastAt: 0, since: 0 },  // M3: ms lần chép/tải mã sao lưu gần nhất; since = mốc bắt đầu tính nhắc (main.js ghi lần đầu mở)
  incidents: {             // M3 (mục 17.1): tình huống trong ca
    since: 0,              //   số ca liền (từ ngày 3) chưa gặp tình huống nào → bảo hiểm (M4: đủ 1 / 2 / 3 ca ở mức Nhiều / Vừa / Ít)
    recent: [],            //   id tình huống đã gặp, mới nhất cuối (tối đa 10) → không lặp 5 loại gần nhất
    log: [],               //   nhật ký ngắn [{day, id, choice, money, cost, refund, rep}] (tối đa 20, mới nhất đầu)
    debts: [],             //   sổ ghi nợ khách quen [{id, regularId, name, amount, fromDay, dueDay, repayDay|null, status: 'cho'|'da_tra'|'quen', paidDay?}]
    bonus: null,           //   {day, customers, rep}: khách thêm ở ca `day` (ly trà "mở hàng"); ca đó đã đủ trần khách
                           //   thì thay bằng `rep` danh tiếng (vòng soát lỗi M3)
    total: 0,              //   số tình huống đã xử lý
    lastKind: null,        //   M4: loại ('tot'|'chon'|'xau') của tình huống gần nhất đã xử lý (luật nhịp: không 2 xấu liền)
    lastLoss: 0,           //   M4: tỉ lệ lỗ của tình huống đó so với trần (0..1); ≥ calmAfterLoss → lần sau nhẹ nhàng
    day: { key: '', loss: 0, gain: 0 },  // M4: sổ tiền sự kiện của ngày thật đang chơi (trần phạt/thưởng mỗi ngày thật)
    warn: {},              //   M4 bước 4: lần nhắc nhở gần nhất {eventId: ngày game} (Kiểm tra vệ sinh ATTP: nhắc trước, tái phạm mới phạt)
    lastEvent: null,       //   soát lỗi M4: loại của sự kiện gần nhất trên dòng thời gian CHUNG (sự kiện ngày lúc mở ca, rồi tình
                           //   huống theo thứ tự) → luật "không 2 sự kiện xấu liền nhau" xét chung hai lớp (mục 17.1)
    announced: {}          //   soát lỗi M4: sự kiện ngày đã chốt {ngày game: id | ''} (hôm nay khi vào màn Chuẩn bị, ngày mai lúc
                           //   mở ca); đổi mức "Tần suất sự kiện" không bốc lại; chỉ giữ 15 ngày gần nhất (events.announceDayEvent)
  },
  notebook: { claimed: [] }, // M3 (mục 17.2): nhóm Mẹo nghề đã nhận thưởng đủ nhóm
  tour: { seen: {}, disabled: false }  // 0.4.1 (mục 29): tour đã xem {tourId: true}; disabled = tắt "Hướng dẫn lần đầu"
  // M2 thêm (defaultMeta() trong state.js, mô tả ở mục 15): items, cosmetics, titles, unlocks, prep, checkin, daily,
  // mail, chains, shop, eventRecipes, tasting, events, realDays, progression, track; stats có thêm các khóa M2.
  // M4 bước 6 (defaultMeta().rare = state.defaultRare(), mục 21): kho nguyên liệu và công thức hiếm
  //   rare: { stock: {ingId: 0..6}, fragments: {recipeId: 0..3}, pity: {ing, frag},
  //           today: {key, got, frags, stalls: [stallId], strangerDay}, seen: [ingId],
  //           pendingStall: {id, dayKey, picked?: [ingId], mistakes?: 0..99} | null }   // rổ lựa dở lưu mỗi lần chạm (soát lỗi M4)
}
```
`version` là **3** từ M4 (bản 0.4.0). Các trường M3 (`settings.volume`, `settings.incidentFrequency`, `backup`, `incidents`, `notebook`) được thêm khi còn version 2; M4 thêm `incidents.lastKind/lastLoss/day/warn/lastEvent/announced`, `rare`, các trường M4 của ca và nâng lên 3. `save.migrate` nâng mọi bản cũ (v1, v2) lên 3 trong một lần nạp và điền mặc định (`migrateSettings`, `migrateMeta`, `migrateContentM3`, `migrateContentM4`; mục 12). `settings.tips = false` chỉ tắt thẻ Mẹo nghề **nổi** trong ca: lõi (`state.unlockTip`) vẫn mở thẻ, ghi `tipsSeen` và phát `tip.unlocked` (Sổ tay nghề vẫn đầy), `app.js` không hiện thẻ.

## 5. Module lõi dùng chung

### rng.js
```js
export function hashString(str) → uint32                 // FNV-1a 32 bit
export function seedFrom(...parts) → uint32              // băm nhiều phần (số/chuỗi)
export function nextFloat(holder, key = 'rng') → [0,1)   // mulberry32; đọc/ghi holder[key] (uint32) để trạng thái nằm trong JSON
export function nextInt(holder, min, max, key) → số nguyên trong [min,max]
export function pick(holder, arr, key) → phần tử
export function weightedPick(holder, items /* [{w, ...}] */, key) → phần tử
export function shuffle(holder, arr, key) → mảng mới
// bổ sung: chance(holder, p, key) → boolean ; nextRange(holder, a, b, key) → số thực ; makeRand(holder, key) → rand() cho makeSpeech/makeReview
```

### money.js
```js
export const BILLS = [5000, 10000, 20000, 50000, 100000, 200000, 500000]   // Chặng 1–2
export function formatVND(n) → '37.000đ'
export function formatK(n) → '37k' ; 1250000 → '1,25tr'
export function drawerTotal(drawer /* {5000: 8, ...} */) → số đồng
export function makeFloat() → {5000:8, 10000:5, 20000:3, 50000:1, 100000:0, 200000:0, 500000:0}  // 200.000đ
export function minBillsChange(amount, drawer) → {count, bills:{mệnh giá:số tờ}} | null   // quy hoạch động theo số tờ có thật
export function canMakeChange(amount, drawer) → boolean
export function customerCash(holder, total, persona, day) → {bills:{mệnh giá: số tờ}, total}   // cách khách đưa tiền (mục 3.6 tài liệu thiết kế)
export function roundUpTo(n, step) , roundDownTo(n, step)
// bổ sung: emptyDrawer() ; addBills(drawer, bills, sign = 1) (sửa trực tiếp) ; billsCount(bills) ; composeGreedy(amount) → bills | null
// M3 (mục 17.4): COST_STEP = 500, REWARD_STEP = 1000
export function roundCost(n) → bội 500đ gần nhất (0,5 làm tròn lên)     // giá vốn mỗi lượt nấu, làm lại bước, giá vốn tình huống
export function roundReward(n) → làm tròn LÊN bội 1.000đ                // mọi khoản thưởng Tiền quán, nợ Dì Sáu
```

### clock.js
```js
export const DAY_RESET_HOUR_VN = 4
export function dayKeyVN(ms) → 'YYYY-MM-DD'   // new Date(ms + 7h − 4h).toISOString().slice(0,10)
export function trustedNow(state, deviceNow) → {now, rewind:boolean}   // cập nhật state.clock.maxSeen; rewind=true nếu deviceNow < maxSeen − 10 phút
```

### bus.js
```js
export function createBus() → { on(type, fn) → off, emit(type, payload), clear() }
```
`on('*', fn)` nhận mọi sự kiện với `fn(payload, type)`. Phía giao diện, `app.ctx.emit` bọc `bus.emit` trong try/catch để lỗi của bộ nghe không làm đứt hàm lõi đang chạy.

Sự kiện miền (payload là object thuần):
`order.readback {errorsFound, errorsMissed}` · `order.confirmed {customerId}` · `total.reported {correct, diff}` · `payment.received {method, amount}` · `change.given {correct, optimal, diff}` · `qr.confirmed {fake, blocked}` · `ticket.clipped {ticketId}` · `step.done {recipeId, type, score, grade, auto}` · `dish.done {recipeId, q, grade, flawless, errors}` · `dish.served {customerId}` · `customer.rated {customerId, stars, counterErrors, kitchenErrors}` · `customer.lost {customerId, reason}` · `shift.started {day}` · `shift.ended {day, profit, served, lost}` · `recipe.bought {recipeId}` · `tip.unlocked {tipId}`.

Payload của các sự kiện trên giữ **đúng hợp đồng** (có test khóa khóa của `shift.ended`, `dish.done`, `change.given`); hệ thống meta đọc thông tin thêm từ state lúc sự kiện phát (mục 15).

Sự kiện bổ sung (thực tế): `qr.rejected {customerId, fake, blocked}` (M2; `blocked` = Loa báo tiền tự chặn) · `customer.arrived {customerId}` · `qr.arrived {customerId, amount}` · `counter.begin {customerId}` · `cook.started {ticketId, lineIndex, recipeId}` · `step.retry {recipeId, stepId, cost}` · `dish.abandoned {ticketId, lineIndex, recipeId, waste}` · `complaint.resolved {customerId, action, apologyCorrect, amount?|ticketId?}` · `upgrade.bought {upgradeId}`. Sự kiện riêng của giao diện (không do lõi phát): `ui.tab {tab}` · `ui.ticket.select {ticketId}` · `kitchen.served {ticketId, customerId, sheet}`.

## 6. Dữ liệu (src/data)

### index.js — gom dữ liệu, tiêm vào lõi qua `ctx.data`
```js
export const DATA = Object.freeze({ BALANCE, INGREDIENTS, RECIPES, METHOD_LABELS, MINIGAME_TYPES,
  PERSONAS, REGULARS, NAMES, DIALOGUE, makeSpeech, makeLine, makeReview, TIPS, UPGRADES, STRINGS })
```
`DATA` thực tế có thêm (chỉ thêm, không đổi): `ROLE_LABELS, SPOKEN, SYNONYMS, LINE_KINDS, REVIEWS, TIP_GROUPS, describeLine, readbackText, tipsForTrigger`; M2: `CHECKIN, QUESTS, QUEST_GROUPS, QUEST_CONFIG, MAIL_CONFIG, MAIL_WELCOME, MAIL_VERSIONS, MAIL_HOLIDAYS, MAIL_EVERYDAY, MAIL_LATE_REVIEW, MAIL_QUEST, CHAINS, NPCS, CHAIN_WHERE, SHOP, ITEMS, COSMETICS, TITLES, UNLOCKS, EVENTS, DAY_EVENTS, DAY_EVENT_CONFIG, STAGE_UP, POST_GOALS` (mục 15). `BALANCE` thêm `refIncomeTable`, `eventCustomerCap`; `STRINGS` thêm `meta`, `reasons`. M3 nội dung thêm `INCIDENTS, INCIDENT_CONFIG` (`data/incidents.js`, mục 17.1), `TIP_GROUP_REWARDS` (`data/tips.js`, mục 17.2); mỗi thẻ `TIPS[]` có thêm `hint` (gợi ý cách mở); `TITLES` thêm 4 danh hiệu nhóm Sổ tay nghề; `STRINGS.errors.tu_choi_doi_mon`. M4 bước 6 thêm `RARE_CONFIG, STALLS, STRANGERS` (`data/rare.js`, mục 21); `STRINGS.rare`, `STRINGS.sources.hiem`, `STRINGS.screens.market`, lý do `het_hang_hiem, ngoai_gio, chua_du_manh, thieu_mon_nen, chua_toi_ngay`.

**Lõi không import trực tiếp `src/data`** (trừ khi cần hằng số thuần); mọi hàm lõi đọc dữ liệu từ `ctx.data`. Test lõi dùng dữ liệu mẫu nhỏ ở `tests/fixtures/data.mjs`; test tích hợp dùng `DATA` thật. `ctx = { emit(type, payload), data }`.

Hàm trợ giúp nội dung (thuần, nhận `rand()` trả số trong [0,1)):
```js
// dialogue.js
export function makeSpeech({ request, persona, region, recipes, rand, gender?, name?, regularId?, firstVisit? }) → string   // câu gọi món tự nhiên; persona là id hoặc object {…, id}
export function makeLine(kind, { persona, region, rand, vars }) → string           // kind: 'readback_ok' | 'readback_wrong' | 'total_too_high' | 'total_ok' | 'change_short' | 'change_over_returned' | 'thanks' | 'wait_long' | 'receive_dish' | 'leave_angry' | 'greet' (+ 'change_ok' | 'qr_paid' | 'complaint'); kind lạ → 'thanks'. vars: {total, diff, amount, line, mon, gender, name, regularId, self}
// reviews.js
export function makeReview({ stars, errors /*[mã lỗi | {code}]*/, dishName, ingredientName, rand }) → string   // nhận cả mã lỗi của lõi (thieu_phu, thua, bay, trai_ghi_chu, sai_cach, bo_qua, cho_goi_mon…) qua bảng bí danh
```

### balance.js
```js
export const BALANCE = Object.freeze({
  startWallet: 200000,
  fixedCostPerShift: 20000,
  stageFlow: ['order', 'thanh_toan', 'tinh_tien', 'lam_do'],   // thứ tự 4 khâu, nhãn: Order · Thanh toán · Tính tiền · Làm đồ
  stageLabels: { order: 'Order', thanh_toan: 'Thanh toán', tinh_tien: 'Tính tiền', lam_do: 'Làm đồ' },
  queueMax: 3, ticketRailMax: 3,
  queuePatienceBase: 45, queuePatienceFloor: 32,          // giây
  counterDrainMul: 0.5,
  waitBudgetBase: 30, waitBudgetParMul: 2,               // B = 30 + 2 × tổng par
  arrivalLoad: 1.15, peakMul: 0.9, counterTimeEstimate: 20,
  customersPerShift: day => Math.min(8, 4 + Math.floor((day - 1) / 2)),
  qrFromDay: 4, fakeQrFromDay: 7, fakeQrRate: 0.04, qrRate: 0.25,
  leaveFromDay: 4,
  readbackCatchRate: 0.8, readbackPatienceCost: 0.08,
  zoneMulStage: 1.2, zoneDailyNarrow: 0.02, zoneFloor: 0.75, zoneMulCap: 1.6,
  gradeThresholds: [ [90, 'tuyet_hao', 5], [75, 'ngon', 4], [60, 'duoc', 3], [40, 'kem', 2], [0, 'hong', 1] ],
  gradeLabels: { tuyet_hao: 'Tuyệt hảo', ngon: 'Ngon', duoc: 'Được', kem: 'Kém', hong: 'Hỏng' },
  stepLabels: [ [90, 'Hoàn hảo'], [70, 'Tốt'], [50, 'Đạt'], [0, 'Hỏng'] ],
  tipFiveStar: 5000, tipMinBill: 20000, strictFiveStarRep: 1,   // M4: tip 1 mức khi 5 sao VÀ hóa đơn khách thực trả ≥ 20.000đ (bỏ tipBonus)
  reputationByStars: { 5: 3, 4: 2, 3: 1, 2: 0, 1: 0 },
  masteryLevels: [0, 5, 15],                             // goodCooks cần cho cấp 1,2,3
  autoStepScore: 80, retryScoreCap: 85,
  loanAmount: 240000, loanRepayRate: 0.25, loanInterest: 0.10,
  refIncomeTable: [[1, 20000], [3, 35000], [5, 65000], [7, 85000], [9, 100000]],   // M2: thu nhập tham chiếu một ca
  eventCustomerCap: 10,                                  // M2: trần khách khi sự kiện ngày tăng khách
  eventDayCap: { lossIncomeMul: 1, gainIncomeMul: 1 }    // M4: trần tiền sự kiện mỗi ngày thật (× thu nhập tham chiếu), mục 19
})
```
Khóa thiếu trong `BALANCE` lấy từ `DEFAULT_BALANCE` (`src/core/state.js`, đọc bằng `cfg(ctx, key)`), gồm cả khóa bổ sung: `regularReturnRate 0.15, regionBacRate 0.3, maxLoad 0.9, firstArrival 3, tutorialGapMul 1.5, noteRateMid 0.2, noteRateLate 0.35, noteFromDay 3, splitFromDay 5, splitLineRate 0.15, surchargeFromDay 6, multiLineFromDay 3, lineCountWeights [70,25,5], changeAskRate 0.4, changeAskPatienceCost 0.05, roundingMax 5000, shortChangeDetectRate 0.9, overChangeReturnRate 0.5, loanOfferBelow 20000` (mời vay khi Tiền quán < chi phí cố định một ca).

### ingredients.js
```js
export const INGREDIENTS = Object.freeze({
  banh_mi: { name: 'Bánh mì', icon: 'banh_mi', cost: 3000 },
  trung_ga: { name: 'Trứng gà', icon: 'trung_ga', cost: 3000 },
  trung_vit: { name: 'Trứng vịt', icon: 'trung_vit', cost: 3500 },   // bẫy của trứng gà
  ...
})
```
`icon` là khóa tra trong `src/ui/art.js` (`ICONS[icon]` là chuỗi SVG, `viewBox="0 0 64 64"`). Mỗi ô nguyên liệu **luôn hiện nhãn chữ** dưới hình; cặp bẫy phải khác nhau rõ về hình hoặc màu.
M4 bước 6: 5 nguyên liệu hiếm có thêm `rare: true, star (1–2), origin (quê), portion (số đơn vị trong 1 phần kho, trứng gà ta 2), traps: [hàng thường dễ nhầm]`; `cost` là giá quy đổi (tính vào giá vốn tham khảo của món hiếm), khi nấu KHÔNG trừ Tiền quán (lấy từ kho `state.rare`). Hình có ngôi sao vàng ở góc, khác hẳn hàng dễ nhầm.

### recipes.js — lược đồ công thức (thuần dữ liệu)
```js
export const RECIPES = Object.freeze({
  banh_mi_op_la: {
    id: 'banh_mi_op_la', name: 'Bánh mì ốp la', chang: 1,
    price: 20000, cost: 9000,                 // giá bội 5.000đ ở Chặng 1–2; cost là tham khảo, giá vốn thật = tổng cost nguyên liệu dùng
    source: 'default',                        // 'default' | 'shop' | 'event'
    eventId: null, difficulty: 1,             // 1..5 (biểu tượng dao)
    icon: 'mon_banh_mi_op_la',
    shelf: ['banh_mi','trung_ga','dua_leo','hanh_la','nuoc_tuong','tuong_ot','trung_vit','hanh_tay','nuoc_mam'],
    ingredients: [
      { id: 'banh_mi', role: 'chinh' }, { id: 'trung_ga', role: 'chinh', qty: 2 },
      { id: 'dua_leo', role: 'phu' }, { id: 'hanh_la', role: 'phu' }, { id: 'nuoc_tuong', role: 'phu' },
      { id: 'tuong_ot', role: 'tuy_chon' }      // chỉ cần khi ghi chú yêu cầu
    ],
    decoys: ['trung_vit','hanh_tay','nuoc_mam'],
    notes: [                                    // ghi chú khách có thể dặn
      { id: 'khong_hanh', label: 'Không hành', removes: ['hanh_la'] },
      { id: 'cay', label: 'Cay', adds: ['tuong_ot'], patch: { nem: { targets: { tuong_ot: 2 } } } },
      { id: 'long_dao', label: 'Lòng đào', patch: { chien_trung: { zone: [0.45, 0.60] } } },
      { id: 'chin_ky', label: 'Chín kỹ', patch: { chien_trung: { zone: [0.70, 0.85] } } }
    ],
    steps: [
      { id: 'chon', type: 'chon', label: 'Chọn nguyên liệu', par: 6, w: 1 },
      { id: 'rua_dua', type: 'cha', label: 'Rửa dưa leo', ing: 'dua_leo', params: { spots: 4 }, par: 3, w: 1 },
      { id: 'thai_dua', type: 'thai', label: 'Thái dưa leo', ing: 'dua_leo', after: ['rua_dua'],
        method: { options: ['thai_lat','thai_soi','bao'], correct: 'thai_lat' }, params: { cuts: 3 }, par: 4, w: 1 },
      { id: 'dap_trung', type: 'dap', label: 'Đập trứng vào chảo', ing: 'trung_ga', params: { n: 2 }, par: 2, w: 2 },   // M5; trước 0.5.0: cham exact
      { id: 'chien_trung', type: 'lua', label: 'Chiên trứng', ing: 'trung_ga', after: ['dap_trung'], critical: true,
        params: { period: 5, zone: [0.55, 0.72] }, par: 5, w: 3, retryCost: 6000 },
      { id: 'nem', type: 'cham', label: 'Nêm nước tương', ing: 'nuoc_tuong', after: ['chien_trung'],
        params: { mode: 'targets', targets: { nuoc_tuong: 1 } }, par: 2, w: 1 }
    ]
  }
})
export const METHOD_LABELS = { thai_lat: 'Thái lát', thai_soi: 'Thái sợi', bao: 'Bào', ... }
```
Trường bổ sung thực tế: `desc`; món Shop có `shopPrice`, `shopFromDay`; ghi chú loại trừ nhau có `group` (vd `do_chin`, `duong`, `cay`, `ngot`); ghi chú có thể có `surcharge` (phụ thu mỗi phần) và `adds`. Nguyên liệu bẫy có `trapOf` trong `INGREDIENTS`. `shelf` có thể 12 ô.

Quy tắc:
- Bước `chon` luôn là bước đầu, bắt buộc, **không** có "Tự làm", **không** tự kết thúc.
- Các bước còn lại hiện trên **Thớt sơ chế**; người chơi tự chọn làm bước nào trước, trừ ràng buộc `after`. Bước có `ing` bị bỏ khi nguyên liệu đó bị ghi chú loại (`removes`).
- `patch` theo id bước, ghi đè `params` khi phiếu có ghi chú đó.
- `w`: 1 phụ, 2 chính, 3 linh hồn. `critical`: bước này Hỏng (điểm < 50) thì món khóa ở hạng Hỏng.
- `method` (tùy chọn): trước khi chơi bước, người chơi chọn cách sơ chế; chọn sai → điểm bước −15.

MVP có 5 món: `banh_mi_op_la`, `tra_tac` (có sẵn, M1); `banh_trang_tron`, `ca_phe_sua_da` (Shop, M2); `che_buoi` (sự kiện 20/11, M2). Dữ liệu của cả 5 món được viết ngay từ M1 (món Shop/sự kiện chưa bán được cho tới M2).

**M5 (0.5.0): 5 loại bước mới.** Chỉ đổi `type` và `params` (thêm `skin`, nhãn ở 2 bước) của 15 bước; **giữ nguyên id bước, par, w, critical, retryCost, ing, after** (ghi chú vá tham số theo id bước nên vẫn đúng; bảng bất biến ở `docs/can-bang.md` mục 7.1, khóa bằng `tests/unit/m5-balance.test.mjs`):

| Loại | Tham số (đã nhân theo số phần) | Bước dùng | Lớp vỏ (`skin`) |
|---|---|---|---|
| `dap` (đập trứng) | `n` số quả (nguyên > 0) | `dap_trung` của Bánh mì ốp la, Bánh mì trứng gà ta (`them_trung` vá `n: 3`) | — |
| `xoay` (khuấy, vẽ vòng) | `turns` số vòng; `fast: true` = ngưỡng văng × 1,8 | `tron` (5 vòng) của 2 món bánh tráng trộn; `khuay` (3 vòng) của 2 món cà phê; `danh_sua_muoi` (6 vòng, fast) | `to`, `ly`, `chen` |
| `got` (gọt vỏ) | `strips` số dải vỏ | `got_xoai` của 2 món bánh tráng trộn, `got_vo` của Chè bưởi (5 dải) | — |
| `lac` (lắc lên xuống) | `strokes` số lượt đổi chiều; `maxRatio` (tùy chọn, tỉ lệ nên không nhân theo số phần): có thì trò không tự xong mà nhấc tay để xong, quá ⌊`strokes` × `maxRatio`⌋ lượt là lắc quá tay | `lac` của 2 món trà tắc (6 lượt, không `maxRatio`), `ao_bot` của Chè bưởi (8 lượt, `maxRatio` 1,2, nhãn "Lắc rổ áo bột năng") | `binh`, `ro` |
| `bay` (kéo thả vào đích) | `n` số món cần thả (khay có `max(n + 1, 3)` món) | `them_da` của 2 món cà phê (2 viên, `it_da` vá `n: 1`; nhãn "Thả đá vào ly") | `ly` |

Bước giữ loại cũ: `rua_dua` (cha — lõi nhận bước rửa nhờ `cha` + tiền tố `rua`), `boc_trung_cut` (cha, vì ghi chú vá `spots`), `xe_kho_muc`, `bop_muoi` (cha `strokes`), mọi bước `thai`, `lua`, `rot` và `cham` còn lại (`targets`, `min`, `exact`). Số lượt dùng: dap 2, lac 3, got 3, xoay 5, bay 2.
M4 bước 6 thêm 4 công thức hiếm `source: 'hiem'` (`tra_tac_mat_ong`, `banh_mi_trung_ga_ta`, `banh_trang_tron_tay_ninh`, `ca_phe_muoi`): `baseRecipe` + `requires` (món nền phải có), `rare: {ingId: số phần kho mỗi phần món}`, `icon` của món nền (giao diện gắn huy hiệu ★), `eventId: null`; bảng giá/par ở mục 21 và `docs/can-bang.md` mục 14.5.

### minigame-types.js
```js
export const MINIGAME_TYPES = Object.freeze({
  chon: { name: 'Chọn nguyên liệu', hint: 'Chạm để bỏ vào rổ, chạm lần nữa để lấy ra.' },
  cha:  { name: 'Chà rửa', hint: 'Vuốt qua lại lên các vết bẩn.' },
  thai: { name: 'Thái', hint: 'Kéo dao tới vạch chấm, nhấc tay để cắt.' },
  cham: { name: 'Chạm', hint: '…' },
  lua:  { name: 'Canh lửa', hint: 'Nhấc chảo khi kim nằm trong vùng xanh.', skins: { chao, phin, noi } },
  rot:  { name: 'Rót', hint: 'Giữ để rót, thả tay đúng vạch.', skins: { ly, to } },
  // M5 (0.5.0): mỗi loại có name, hint, icon; sub (dòng hướng dẫn trên sân khấu), count (chữ bộ đếm) ở loại hoặc ở lớp vỏ
  dap:  { name: 'Đập trứng', sub, count: 'Trứng', icon: 'trung_ga' },
  xoay: { name: 'Khuấy', icon: 'muong_khuay', skins: { to /*Trộn đều*/, ly /*Khuấy ly*/, chen /*Đánh bông, icon sua_muoi*/ } },  // count 'Vòng'
  got:  { name: 'Gọt vỏ', sub, count: 'Dải', icon: 'dao_bao' },
  lac:  { name: 'Lắc', icon: 'binh_lac', skins: { binh /*Lắc bình*/, ro /*Lắc rổ, icon bot_nang*/ } },              // count 'Lượt lắc'
  bay:  { name: 'Bày', icon: 'khay_bay', skins: { ly /*Thả đá, icon da*/ } }                                     // count 'Đá'
})
```
Lớp vỏ (vòng soát lỗi M3): bước trong `recipes.js` có thể khai báo `skin` (`u_phin` → `phin`, `luoc` → `noi`, `rot_dau_hanh`/`rot_cot_dua` → `to`); mỗi skin có `name, hint, icon` (thẻ gợi ý) và `act, over, sub, overTip, sound` (lua: nút "Nhấc phin"/"Vớt ra", vạch "Quá đặc"/"Nhũn", không xèo) hoặc `act, actMore, actResume, count` (rot: "Giữ để rưới", "Lần rưới"). `minigames/index.js` xuất thêm `skinFor(step, data)`; `hintFor` dùng tên/gợi ý của skin. Lõi: bước lua có skin khác chảo quá lửa vẫn gắn tag `chay` nhưng không mở thẻ "Chảo dầu bốc cháy".

### customers.js
```js
export const PERSONAS = Object.freeze({
  hoc_sinh:  { name: 'Học sinh', weight: 30, patience: 1.0, fromDay: 1, address: ['con','em'], cash: 'small', qrRate: 0.3 },
  cong_nhan: { name: 'Công nhân', weight: 20, patience: 0.6, fromDay: 1, address: ['anh','chị'], cash: 'exact' , qrRate: 0.1 },
  co_chu:    { name: 'Cô chú', weight: 20, patience: 1.3, fromDay: 1, address: ['cô','chú'], cash: 'big', qrRate: 0.05 },
  van_phong: { name: 'Dân văn phòng', weight: 20, patience: 0.8, fromDay: 4, address: ['anh','chị'], cash: 'medium', qrRate: 0.7 },
  kho_tinh:  { name: 'Khách khó tính', weight: 10, patience: 0.85, fromDay: 5, address: ['anh','chị'], cash: 'medium', qrRate: 0.3, strict: true }
})
export const REGULARS = Object.freeze({ co_thu: {...}, ban_nam: {...} })   // khách quen (ngày 1 hướng dẫn, sau đó thỉnh thoảng quay lại)
export const NAMES = Object.freeze({ nam: [...], nu: [...] })
```

### dialogue.js, reviews.js, tips.js, strings.js, upgrades.js
- `dialogue.js`: mẫu câu gọi món ghép từ `[xưng hô] + [số lượng + món] + [ghi chú] + [đuôi câu]`, 2 vùng giọng `nam` (70%) và `bac` (30%), từ đồng nghĩa món/ghi chú theo vùng (≥15 cặp), câu phản hồi đọc lại đơn, báo tổng sai, thối sai, nhận món.
- `reviews.js`: câu review theo mã lỗi (`thieu_nguyen_lieu`, `sai_ghi_chu`, `bay_nguyen_lieu`, `chay`, `song`, `cho_lau`, `sai_mon`, `thoi_thieu`, `bao_du`, `hoan_hao` …) và theo số sao; có chỗ chèn `{mon}`, `{nguyen_lieu}`.
- `tips.js`: thẻ Mẹo nghề `{id, group: 'quay'|'bep'|'kho'|'phuc_vu', text, trigger}` (trigger là mã sự kiện/lỗi khiến thẻ mở lần đầu). MVP 20 thẻ.
- `upgrades.js`: `{id, name, price, fromDay, desc, effect: {...}}` — `dao_thep`, `chao_chong_dinh`, `ghe_nhua`, `may_tinh`, `loa_bao_tien`.
- `strings.js`: chuỗi giao diện dùng chung.

## 7. Ca bán hàng (shift) — `src/core/shift.js`

Ca là dữ liệu thuần nằm ở `state.shift`. Mọi hàm nhận `(state, …, ctx)` với `ctx = { emit(type,payload), data }` và **sửa trực tiếp** `state.shift`. `ctx.emit` có thể là hàm rỗng trong test.

```js
export function startShift(state, ctx) → shift        // tạo ca mới cho state.day; seed = seedFrom(state.seed, state.day)
   // M2: sh.mods = events.prepareShiftMods(state, ctx, ctx.now?.()) — sự kiện ngày, món lễ đang mùa, Phiếu Chợ Sớm, tiền căng bạt
   //     (trừ TRƯỚC khi ghi walletStart); số khách qua applyCustomerMods; chuỗi "Làm quen QR" ép 1 khách customer.forcePay = 'qr_fake'
   // M3: + khách thêm nhờ ly trà "mở hàng" ca trước (takeIncidentBonusInfo, trần 8; ca đã đủ khách → +bonus.rep danh tiếng,
   //     ghi sh.bonusNote = {customers, rep}); sh.incident = planIncident(...) (luồng ngẫu nhiên
   //     riêng seedFrom(seed, ngày, 'tinh_huong'), không đổi lịch khách); sh.debtIn / sh.debtNotes = collectDebts(...) (mục 17.1)
export function advance(state, dt, ctx)               // dt giây; không làm gì khi shift.paused; sinh khách tới, trừ kiên nhẫn, khách bỏ về
export function isShiftOver(state) → boolean          // mọi khách đã rời đi (served hoặc lost) và không còn phiếu
export function endShift(state, ctx) → summary        // tất toán ví, cập nhật stats/ratings/history, day += 1, shift = null
   // M3: finishShiftIncidents (ca từ ngày 3 không có tình huống được xử lý → incidents.since += 1); history[] có thêm
   //     incidents [{id, choice}], debtIn
export function setPaused(state, paused)
// bổ sung
export function customerCount(state, ctx, day = state.day) → số khách   // cài ở customer.js (kèm MAX_CUSTOMERS = 8), shift.js xuất lại
export function planArrivals(shift, customers, ctx) → plan
export function loadFactor(shift) → ρ
export function gameTime(shift) → 'HH:MM' (06:00 → 10:00, ước lượng)
export function emptyLedger() → ledger
```
M2 (đọc `sh.mods`, ca M1 không có `mods` vẫn chạy như cũ): trọng số món × `mods.recipeWeight`, thêm ghi chú theo `mods.noteBoost`, kiên nhẫn × `mods.patienceMul` (customer.js); giá vốn × `mods.cogsMul` khi chốt bước chọn (kitchen.js). M4: bỏ `mods.tipMul`; `mods.lineCountWeights` (Ngày lãnh lương, null = `BALANCE.lineCountWeights`) cho `makeRequest`. `orderableRecipes`: món `event` bán được khi đã nhận qua sự kiện (`state.eventRecipes[id]`, giữ vĩnh viễn, bán quanh năm) hoặc khi `ctx.data.isEventActive` báo đang mở; chưa sở hữu thì không ai gọi. `history[]` có thêm `lateReviews [{customerId, name, amount}]`.

Thực tế: `advance` **tự gọi `beginCounter`** khi quầy trống và có khách đầu hàng (idempotent), tự báo QR về (`qr.arrived`; có `loa_bao_tien` thì tự xác nhận). `endShift` gọi được trước khi hết ca: khách còn dở bị đóng, ai đã trả tiền được hoàn. `state.shift` có thêm `rngText` (luồng ngẫu nhiên riêng cho lời thoại/review), `counts{}`, `reputationGain`, `tipsShown`, `reviews[]`, `receipts[]`, `fixedCost`, `loanRepayRate`, `walletStart`; `ledger` có thêm `rounding`.

Cấu trúc `state.shift`:
```js
{
  day, rng /*uint32*/, t /*giây đã chơi*/, paused: false,
  plan: [ {customerId, arriveAt} ],            // lịch khách đến, sinh sẵn lúc startShift
  customers: { [id]: Customer },
  queue: [id],                                 // khách đang xếp hàng; queue[0] là người ở quầy
  counter: null | CounterSession,              // phiên quầy với khách đầu hàng (mục 8)
  tickets: [Ticket],                           // dây phiếu bếp (tối đa BALANCE.ticketRailMax)
  cook: null | CookSession,                    // phiên bếp đang làm (mục 9)
  drawer: {mệnh giá: số tờ},                   // két tiền mặt, bắt đầu = makeFloat()
  floatAmount: 200000,
  qrBalance: 0, tipJar: 0,
  ledger: { sales: 0, cash: 0, qr: 0, listValue: 0, undercharge: 0, overchange: 0,
            cogs: 0, waste: 0, refunds: 0, tips: 0, fakeQrLoss: 0,
            eventIn: 0, eventOut: 0 },          // M4: tiền từ sự kiện (vào ví lúc tất toán), phạt/chi sự kiện (trừ ví ngay)
  served: [id], lost: [id], missed: 0,
  scoreSheets: [ScoreSheet],                   // phiếu chấm từng khách
  counterStreak: 0,                            // chuỗi "Quầy chuẩn" (luôn 0 khi bật Hỗ trợ tính tiền)
  nextTicketNo: 1,
  // M3 (mục 17.1); M4: tối đa 2 tình huống mỗi ca — incident là tình huống thứ nhất, incidentQueue các tình huống sau
  incident: null | { id, kind, order, afterClips, status: 'cho'|'xong', rng, cap, gainCap, guaranteed, detail, choice, result,
                     shownAt?, atClips? /* số khách xong quầy lúc xử lý */ },
  incidentQueue: [ /* cùng cấu trúc, theo thứ tự xuất hiện */ ],
  // M4: ngày thật lúc mở ca (trần tiền sự kiện; '' khi không có giờ thật), ghi chú tiền sự kiện, lượt Giỏ chợ
  dayKey: 'YYYY-MM-DD' | '', eventNotes: [ {id, name, text, money, capped?, spared?} ], rareRolls: 0, streakRoll?: true,
  // M4 bước 6: món hiếm bán được trong ca (chốt lúc mở ca theo tồn kho), quà hàng hiếm cuối ca (khách lạ, Giỏ chợ)
  rareMenu: [recipeId], rareNotes: [ {kind: 'khach_la'|'gio_cho', name, text, got: [{id, name, n}], fragment, spoons, stars?} ],
  rareFinished?: true,
  debtIn: 0,                                   // tiền khách quen trả nợ vào ca này (tính vào lãi ca)
  debtNotes: [ {kind: 'tra'|'quen', name, amount, text} ],
  bonusNote?: {customers, rep},                // khách thêm nhờ ly trà "mở hàng" (hoặc danh tiếng thay thế khi đã đủ khách)
  appVersion?: '0.4.0'                         // (giao diện ghi lúc mở ca) phiên bản game; main.js báo khi ca mở lại ở bản khác
}
```
Ca dở mở ở bản 0.3 (save v2) thiếu các trường M4 ở trên: `save.migrateShiftM4` (mục 12) thêm `ledger.eventIn/eventOut = 0`, `incidentQueue/eventNotes/rareMenu/rareNotes = []`, `rareRolls/eventCostExtra/eventMissed = 0`, `dayKey = ''` và các khóa `mods` M4 với giá trị "không có hiệu ứng"; `eventCap` để trống (`events.shiftEventCap` coi là không trần, ca cũ không có sự kiện tiền M4). Test `tests/unit/m4-save.test.mjs` nạp một save THẬT của bản 0.3.0 đang dở ca (`tests/fixtures/save-v2.mjs`) rồi chơi tiếp tới hết.

`Customer`:
```js
{ id, persona, name, region: 'nam'|'bac', regularId: null|'co_thu'|…,
  request: [ {recipeId, qty, notes: [noteId]} ],   // yêu cầu thật
  speech: 'Cho con 2 ổ ốp la, 1 ổ không hành nghen!',
  status: 'den'|'xep_hang'|'order'|'thanh_toan'|'tinh_tien'|'cho_mon'|'nhan_mon'|'roi_di'|'bo_ve',
  patience: 1.0,          // 0..1 khi xếp hàng/ở quầy
  patienceSec,            // tổng giây kiên nhẫn P1
  waitStart, waitBudget,  // sau khi kẹp phiếu (giây theo shift.t)
  payMethod: 'cash'|'qr', fakeQr: false,
  given: {bills} | null,
  tutorial: false,        // khách hướng dẫn ngày 1: không trừ sao
  penalties: [ {code, stars, source: 'quay'|'bep'|'cho'} ],
  ticketId: null, dishes: [DishResult], stars: null, tip: 0, review: null,
  // bổ sung thực tế
  gender: 'nam'|'nu'|null, strict, arriveAt, arrivedAt, orderErrors: [lỗi compareLines], starCap: 5, apologyBonus: 0,
  complaint: null|{items, resolved}, reviewLate, lostReason, expectedSec, receipt, waitRatio, fakeQrCaught, returnedOver,
  undercharge /* số báo thiếu */, overchanged /* đã thối dư */, remadeErrors /* lỗi bếp của món bị phàn nàn rồi làm lại */, refunded,
  // M4 bước 6: khách lạ (ca đầu mỗi ngày thật): id trong STRANGERS, cách tự xưng riêng (makeSpeech/makeLine nhận self)
  stranger?, self? }
```
`customer.js` xuất thêm: `STATUSES, canTransition, setStatus, stageOf(customer) → 'order'|'thanh_toan'|'tinh_tien'|'lam_do'|null` (cho thanh 4 khâu), `isGone, lineKey, normalizeLines, orderableRecipes, makeRequest, patienceSecFor, expectedServiceSec, personaObj, pickPersona, speechFor, lineFor, createCustomer, createRegular, drainPatience, loseCustomer`. Tên khách không trùng nhau trong một ca.

Lịch khách: số khách N = `BALANCE.customersPerShift(day)` điều chỉnh ±1 theo sao trung bình (sàn 3, trần 8). Khoảng cách giữa hai khách = `arrivalLoad × thời gian phục vụ kỳ vọng` (= `counterTimeEstimate` + tổng `par` của đơn kỳ vọng) × ngẫu nhiên [0,85; 1,15]; đoạn giữa ca × `peakMul`. Có unit test: hệ số tải ρ = thời gian phục vụ kỳ vọng / khoảng cách ≤ 0,9.

Ngày 1: 2 khách đầu là khách quen hướng dẫn (cô Thu, bạn Nam), `tutorial: true`, 1 món, không ghi chú.

## 8. Khâu quầy — `src/core/order.js` + `src/core/customer.js`

Phiên quầy `CounterSession` (với `queue[0]`):
```js
{ customerId, stage: 'order'|'thanh_toan'|'tinh_tien',
  draft: [ {recipeId, qty, notes: []} ],       // phiếu người chơi đang ghi
  readbackDone: false, readbackErrors: 0,
  reportedTotal: null, totalAttempts: 0,
  tray: {mệnh giá: số tờ},                     // tiền thối đang gom
  qrArriveAt: null, qrArrived: false,
  receipt: null,                               // phiếu thu sau khi tính tiền xong
  // bổ sung thực tế
  caught: [lỗi bị khách bắt khi đọc lại, có index dòng để tô đỏ], trueTotal, amountDue, payMethod, fakeQr, given,
  changeDue, changePaid, changeDone, changeAttempts, cashDeposited, changeOptionsUsed: [], rounding, paid,
  changeBills /* các tờ đã thối cho khách (để hoàn tác khi đổi cách trả) */ }
```

Hàm (tất cả trong `order.js`, `customer.js` giữ FSM và kiên nhẫn):
```js
// Order
export function beginCounter(state, ctx)                       // khi quầy trống và có khách đầu hàng → status 'order'
export function addLine(state, line) ; updateLine(state, index, line) ; removeLine(state, index)
export function compareLines(request, draft) → { errors: [{type:'sai_mon'|'thieu_mon'|'thua_mon'|'sai_so_luong'|'sai_ghi_chu', index, …}] }
export function readback(state, ctx) → { caught: [...], missed: [...], ok, readbackDone, line }   // khách bắt lỗi với xác suất readbackCatchRate (theo rng ca); mỗi lỗi bị bắt −8% kiên nhẫn; bắt buộc gọi trước confirmOrder; có lỗi bị bắt → readbackDone = false, sửa rồi đọc lại
export function confirmOrder(state, ctx) → { ok, reason?: 'phieu_rong'|'chua_doc_lai'|'khong_hop_le'|'het_hang_hiem' }   // yêu cầu readbackDone và phiếu khác rỗng → stage 'thanh_toan'
   // M4 bước 6: món hiếm trên phiếu vượt tồn kho (trừ phần đã nằm trên phiếu bếp chưa ra món: rare.rareLinesFit) → 'het_hang_hiem'
// Thanh toán
export function priceOfLines(lines, recipes) → đồng            // tổng theo giá niêm yết (+ phụ thu ghi chú nếu có)
export function reportTotal(state, amount, ctx) → { result: 'dung'|'du'|'thieu'|'khong_hop_le', trueTotal, reason?, penalized?, method?, fake?, given?, line }
   // 'du' (báo cao hơn giá đúng của yêu cầu thật): reason 'cong_sai' → phạt bao_du −1 sao (source quay, 1 lần), phải báo lại;
   //      reason 'phieu_thua' (số báo = tổng phiếu ghi thừa món) → không trừ sao, −8% kiên nhẫn, stage QUAY LẠI 'order' để sửa phiếu và đọc lại
   // amount ≤ 0 → 'khong_hop_le'
   // 'thieu': khách trả theo số đã báo; ledger.undercharge += chênh lệch
   // xong → khách chọn phương thức: cash (đưa tiền theo customerCash) hoặc qr (từ ngày 4) → stage 'tinh_tien'
// Tính tiền
export function trayAdd(state, bill) ; trayRemove(state, bill)  // lấy tờ từ két vào khay / trả lại
export function giveChange(state, ctx) → { ok, correct, due, given, optimal, diff, optimalCount, detected?, mustTopUp?, remaining?, returned?, done, line? }
   // tiền khách đưa vào két; khay trừ khỏi két; thiếu: 90% khách phát hiện (−1 sao, phải bù), dư: mất tiền (50% khách trả lại)
export function confirmQr(state, ctx) → { ok, fake, blocked?, reason?: 'chua_ve'|'khong_hop_le' }   // QR thật chỉ hợp lệ khi qrArrived; fake → mất trọn hóa đơn (trừ khi có loa_bao_tien chặn)
export function clipTicket(state, ctx) → { ok: true, ticket, receipt } | { ok: false, reason: 'bep_day'|'chua_thanh_toan'|'khong_hop_le' }
   // tạo phiếu thu + phiếu bếp; cần chỗ trống trên dây; khách → 'cho_mon'; quầy trống.
   // receipt = {no:'#001', shopName, day, time, lines:[{recipeId,name,qty,notes:[nhãn],unitPrice,amount}], listTotal, total, given (null nếu QR), change, rounding, method}
   // Phiếu thu trên giao diện: có dòng "Thu thiếu/Thu thêm" khi total ≠ listTotal và dòng "Trong đó làm tròn cho khách" khi rounding > 0.
   // (cũng lưu ở counter.receipt, customer.receipt, shift.receipts[]). Khách chờ gọi món lâu (kiên nhẫn < 0,4 / < 0,15 lúc kẹp, từ ngày 2) → cho_goi_mon −0,5/−1 sao.
// bổ sung
export function changeOptions(state, ctx?) → ['xin_tien_le', 'moi_qr'?, 'lam_tron'] | []   // rỗng nếu két thối được
export function resolveNoChange(state, option, ctx) → { ok, success, option, newDue?, extra?, undone? }
   // moi_qr / xin_tien_le (thành công) sau khi tiền khách ĐÃ vào két (thối thiếu rồi mới đổi cách): hoàn tác trọn —
   // khách trả lại mọi tờ tiền thối đã cầm (changeBills), quán trả lại tiền khách đưa, ledger.cash −= amountDue,
   // hủy phần làm tròn; undone = true. Khách không bao giờ trả hai lần.
export function changeRemaining(state) → tiền thối còn phải đưa
export function rejectQr(state, ctx) → { ok, fake }            // ảnh giả: khách ngượng bỏ đi (fakeQrCaught); QR thật: khách bực bỏ đi ('tu_choi_qr')
export function railFull(state, ctx?) → boolean
export function unitPriceOf(recipe, notes) → giá 1 phần (kèm phụ thu)
```
Lỗi order lọt qua bị phạt khi giao (serveTicket): `sai_mon` −2, `sai_ghi_chu` −1 mỗi lỗi (tối đa −2), `thieu_mon`/`sai_so_luong` (thiếu) −1.

Kiên nhẫn: khách xếp hàng mất kiên nhẫn theo `1/patienceSec` mỗi giây; khách đang ở quầy mất với tốc độ × `counterDrainMul`. Từ ngày `leaveFromDay`, hết kiên nhẫn khi còn đang xếp hàng → `bo_ve` (chưa trả tiền). Sau khi kẹp phiếu khách không bỏ về; vượt 75%/100%/150% `waitBudget` → phạt −0,5/−1/−2 sao (source cho, chỉ tính mức cao nhất).

## 9. Khâu bếp — `src/core/kitchen.js`

```js
Ticket = { id, no /*#001*/, customerId, lines: [ {recipeId, qty, notes} ], createdAt, status: 'cho'|'dang_lam'|'xong', done: [DishResult|null],
  chonMistakes?: [n] }   // mục 25: lần chọn nhầm theo dòng (dài bằng lines, số nguyên 0..99, chỉ tăng), ghi khi bỏ món giữa bước Chọn

CookSession = { ticketId, lineIndex, recipeId, qty, notes,
  phase: 'chon'|'thot'|'xong',
  picked: [ingredientId],             // kết quả bước chọn
  chonDraft?: { picked: [ingredientId], mistakes, overtime?: true },   // rổ đang chọn dở (chỉ khi phase 'chon', mục 24); xóa khi chốt bước chọn
  chonScore: null, chonMistakes: 0,
  steps: { [stepId]: { score, grade, method, auto, retried, tag } },   // bước đã chơi
  activeStepId: null, retriesLeft: 1,
  // bổ sung thực tế
  board: [bước hiệu lực, trừ chon], cost: {cogs, waste}, retryPending: null|stepId, result: null|DishResult, remake: false }
// Ticket thực tế có thêm receiptNo; phiếu làm lại có remake: true (kẹp đầu dây, có thể vượt ticketRailMax).

export function effectiveSteps(recipe, notes, picked = null, qty = 1) → steps[]
   // áp removes/patch; bỏ bước của nguyên liệu bị loại, nguyên liệu tùy chọn không được dặn, hoặc (khi có picked) không được chọn;
   // nhân SCALE_KEYS × qty (n, N, cuts, strokes; M5 thêm turns, strips) và targets; par × (1 + 0,4(qty − 1)); lọc `after` theo bước còn lại
export const SCALE_KEYS = ['n', 'N', 'cuts', 'strokes', 'turns', 'strips']
export function startCook(state, ticketId, lineIndex, ctx) → CookSession | null   // null khi đang nấu dở món khác / dòng đã xong; trừ giá vốn khi chốt bước chọn
   // (mục 25) dòng có ticket.chonMistakes[lineIndex] = n > 0: cook.chonMistakes = n, cook.chonDraft = {picked: [], mistakes: n} (rổ trống, mang lần nhầm)
export function submitChon(state, picked, mistakes, ctx) → { ok, blockedMissingMain, missing?, score, errors, cost }   // thiếu nguyên liệu chính → ok:false, không trừ tiền
   // (mục 24) số lần nhầm tính = max(mistakes, cook.chonDraft.mistakes + (overtime ? 1 : 0), cook.chonMistakes mang sang — mục 25);
   //   thành công thì xóa cook.chonDraft và đưa ticket.chonMistakes[lineIndex] về 0 (cả phiếu về 0 thì bỏ trường)
// Rổ đang chọn dở (mục 24): lưu mỗi lần thêm/bớt nguyên liệu, tải lại trang giữa bước Chọn vẫn còn rổ và lần nhầm
export const CHON_DRAFT_MISTAKES_MAX = 99
export function normalizeChonDraft(draft, shelf?) → { picked, mistakes, overtime? }   // id a-z0-9_ không trùng (chỉ ô trên kệ nếu biết), lần nhầm số nguyên 0..99, overtime chỉ có khi === true
export function chonDraft(state, ctx) → { picked, mistakes, overtime? } | null           // null khi không ở bước Chọn / chưa có rổ dở
export function saveChonDraft(state, { picked, mistakes, overtime? }, ctx) → { ok, picked, mistakes, overtime?, raised } | { ok: false, reason }   // lần nhầm chỉ tăng, quá giờ đã bật thì giữ; raised: vừa tăng / vừa quá giờ
// Lần chọn nhầm theo dòng phiếu (mục 25): bỏ món giữa bước Chọn không xóa được lần nhầm
export function normalizeLineMistakes(value, lineCount) → [n × lineCount] | null   // số hữu hạn → số nguyên 0..99, còn lại → 0; thừa cắt, thiếu thêm 0; không phải mảng → null
export function lineChonMistakes(ticket, lineIndex) → n                            // 0 khi chưa có / hỏng
export function clearLineMistakes(ticket, lineIndex)                              // dòng đổi món ("Khách đổi ý"): dòng về 0, cả phiếu về 0 thì bỏ trường
export function availableSteps(state) → [stepId]                 // chưa làm, đủ ràng buộc after
export function submitStep(state, stepId, { score, method, tag?, details? }, ctx) → { ok, score, grade, methodWrong, tag } | { ok:false, reason: 'chua_mo'|'khong_hop_le' }
   // lưu điểm (đã trừ −15 nếu method sai); details.value > 1,0 (lua) → tag 'chay'; details.level > 1,02 (rot) → 'tran'; emit step.done
export function autoStep(state, stepId, ctx) → { ok, score, grade } | { ok:false, reason }   // "Tự làm": chỉ bước w=1, không phải chon, cần thạo cấp 2 → 80 điểm
export function retryStep(state, stepId, ctx) → { ok, cost, step } | { ok:false, reason }   // 1 lượt/món, trừ retryCost vào ledger.waste; điểm mới tối đa 85
export function finishDish(state, ctx) → DishResult               // "Ra món": bước chưa làm = 0 điểm; tính Q (scoring.js); ghi vào ticket.done; cook.phase = 'xong'
export function abandonDish(state, ctx) → { ok, waste }           // bỏ món: giá vốn đã trừ → ledger.waste; phiếu quay lại dây
   // (mục 25) bỏ giữa bước Chọn: ticket.chonMistakes[lineIndex] = max(cũ, cook.chonMistakes, chonDraft.mistakes + (overtime ? 1 : 0)) (trần 99);
   //   rổ dở vẫn mất theo phiên nấu; bỏ trên Thớt (đã chốt bước Chọn): ghi max(cũ, cook.chonMistakes) — mở lại phải chọn lại, vẫn mang lần nhầm
export function serveTicket(state, ticketId, ctx) → ScoreSheet    // khi mọi dòng xong: chấm sao khách, tip, review, danh tiếng; khách 'roi_di'
   // ScoreSheet = {customerId, name, final, tutorial, stars, base, cap, penalties, counterErrors, kitchenErrors, tip, reputation, review, dishes, waitRatio, apologyBonus, complaint}
   // counterErrors có thêm mã 0 sao 'bao_thieu' (báo tổng thiếu), 'thoi_du' (thối dư, kể cả khi khách trả lại), 'qr_gia' (xác nhận ảnh giả):
   //   không trừ sao, không vào review, nhưng hiện trên phiếu chấm và Tổng kết. Món bị phàn nàn rồi làm lại: kitchenErrors vẫn giữ 'hong' + lỗi của món cũ.
   // có món Hỏng hoặc sai món (khách không phải hướng dẫn) → final:false, complaint:{items:[{kind:'hong'|'sai_mon', lineIndex, line, refund}], apologies:[text]}; khách chờ ở 'nhan_mon'
   // refund = số khách THỰC TRẢ cho dòng đó theo phiếu thu (đơn giá trên phiếu × qty, nhân tỉ lệ total/listTotal khi báo thiếu),
   //   sai_mon hoàn giá món ghi nhầm (món khách đã trả), QR giả → 0; tổng hoàn kẹp ≤ receipt.total.
// bổ sung
export function resolveComplaint(state, customerId, { apologyIndex, action: 'remake'|'refund' }, ctx) → { ok, apologyCorrect, ticket | sheet }
   // xin lỗi đúng (DIALOGUE.apologies[i].correct) +1 sao; remake: phiếu làm lại đầu dây, sao tối đa 3; refund: hoàn tiền, chốt sao
   // M4 bước 6: remake món hiếm khi kho không đủ → { ok: false, reason: 'het_hang_hiem' } (chỉ hoàn tiền được)
export function complaintRemakeOk(state, customerId, ctx) → boolean   // M4: các dòng bị phàn nàn làm lại được (đủ hàng hiếm)
export function getStep(state, stepId) → bước đã áp patch + qty (để mount mini-game)
export function boardSteps(state, ctx) → [{id,type,label,ing,w,critical,par,params,method,after,done,available,result,canAuto,canRetry}]
export function beginStep(state, stepId) → bước | null           // đặt cook.activeStepId (tải lại giữa chừng thì chơi lại bước đó)
export function linePar(recipe, line) ; linesPar(lines, recipes) → giây
```
Một dòng phiếu có số lượng n = **một lượt nấu** (tham số nhân theo n, par × (1 + 0,4(n − 1))). Dòng khác ghi chú là lượt riêng.

Giá vốn: khi `submitChon` thành công, trừ tổng `cost × qty` của **mọi nguyên liệu đã chọn** vào `ledger.cogs` (phần thừa, bẫy ghi thêm vào `ledger.waste`). M4 bước 6: nguyên liệu hiếm không tính tiền (lấy từ kho); `finishDish` (ngoài nấu thử) trừ kho `rare.consumeRare` theo `recipe.rare × qty` và ghi `dish.rareUsed`; bỏ món/làm lại bước không trừ kho; `finalizeCustomer` + `RARE_CONFIG.repPerGood` danh tiếng mỗi phần món hiếm đạt Ngon trở lên; ScoreSheet có `stranger` khi khách lạ. M3: sau hệ số Phiếu Chợ Sớm, `cogs` và `waste` của mỗi lượt nấu được làm tròn tới bội 500đ gần nhất (`roundCost`; nguyên liệu lẻ 100–400đ, ghi chú "Cay"/"Không hành"/"Không đá") nên Tiền quán luôn là bội 500đ; `retryCost` cũng qua `roundCost`.

## 10. Chấm điểm — `src/core/minigame-scoring.js` và `src/core/scoring.js`

`minigame-scoring.js` (hàm thuần, UI gọi để tính điểm từ dữ liệu thao tác):
```js
export function zoneMul(state, type, recipeId, balance?, upgradesData?) → hệ số vùng (chặng × hẹp dần theo ngày × dụng cụ × thạo món × hỗ trợ; trần 1,6)
   // UI truyền app.data.BALANCE, app.data.UPGRADES (đọc effect.thaiMul/luaMul hoặc effect.zoneMul[type])
export function scoreChon({ required, optional, decoys, picked, mistakes }) → { score, errors }
export function scoreCha({ spots /*[0..1 độ sạch từng vết]*/, reversals, strokes, elapsed, par }) → score     // theo độ phủ (hoặc reversals/strokes với bước lắc/trộn), −15 nếu quá 2×par
export function scoreThai({ cuts /*[độ lệch px]*/, expected, extra, mul }) → score          // ≤6px:100, ≤14:80, ≤24:55, còn lại 20 (ngưỡng × mul); nhát thừa −10
export function scoreChamExact({ taps, n, distances /*0..1*/, mul }) → score
export function scoreChamMin({ taps, N }) → score
export function scoreChamTargets({ counts, targets }) → score                               // 100 − 30 × tổng |lệch|
export function scoreLua({ value, zone, mul }) → score                                       // hàm liên tục đối xứng quanh tâm; value > 1,0 là cháy → 0
export function scoreRot({ level, zone, mul }) → score                                       // tràn > 1,02 → 0
export function stepLabel(score, labels?) → 'Hoàn hảo'|'Tốt'|'Đạt'|'Hỏng'
// bổ sung: thaiCutScore(px, mul), zoneScore(v, zone, mul), TOOL_ZONE_MUL, MASTERY_ZONE_MUL, ASSIST_ZONE_MUL (1,25)
// M5 (0.5.0): 5 hàm chấm của thao tác mới — số nguyên 0..100, đầu vào lỗi (NaN, âm, rỗng) cho 0, không ra NaN.
// Mỗi hàm cùng nghĩa với bước nó thay (lac/xoay/got thay cha: giữ mức trừ 15 vì quá giờ và tỉ lệ đủ lượt, mốc trừ là
// overtimeAt = max(2 × par, sàn giờ); bay thay cham exact; lac có maxRatio thay cham min — phạt lắc quá tay cùng bậc).
export const MIN_LIMIT = { dap: n → 1,5·n + 1, xoay: turns → 1,4·turns + 1, got: strips → 1,2·strips + 1,
                           lac: strokes → 0,4·strokes + 1, bay: n → 1,3·n + 1,5 }   // { key, per, base }: sàn giờ (giây) theo số lượng
export function minLimitSec(type, params) → giây                            // per × số lượng + base, làm tròn 0,01; loại khác 0
export function overtimeAt(type, count, par) → giây                         // max(2 · par, minLimitSec); par không dương hữu hạn (nấu thử Infinity) → Infinity
export function lacOverPenalty(strokes, target, maxRatio) → 0 | 20 | 45 | 80 // r = lượt/K: ≤ m 0; ≤ m + 0,15 20; ≤ m + 0,4 45; còn lại 80 (m lỗi / < 1 → 0)
export const DAP_ZONE = [0.40, 0.70]                                        // vùng xanh của kim lực (đóng băng)
export function scoreDap({ cracks: [{ force, split, shell }], n, zone = DAP_ZONE, mul }) → score
   // mỗi quả: đã tách → zoneScore(force, zone, mul); có vỏ rơi vào → tối đa 40; chưa tách → 0. Trung bình n quả (quả dư bỏ)
export function scoreXoay({ turns, target, spills, cv, elapsed, par, mul }) → score
   // 100 · min(1, turns/target) − 12 · spills − (cv thời gian mỗi vòng > 0,45 · mul ? 10 : 0) − (elapsed > overtimeAt('xoay', target, par) ? 15 : 0); 0 vòng → 0
export function scoreGot({ coverage /*[0..1 mỗi dải]*/, target, misses, elapsed, par }) → score
   // trung bình min(1, phủ / 0,85) · 100 − min(24, 8 · misses) − (quá overtimeAt('got', K, par) ? 15 : 0); thiếu dải = 0; không có target thì K = số dải
export function scoreLac({ strokes, target, cv, elapsed, par, mul, maxRatio }) → score
   // 100 · min(1, strokes/target) − (cv nhịp > 0,6 · mul ? 10 : 0) − (quá overtimeAt('lac', target, par) ? 15 : 0)
   //   − lacOverPenalty(strokes, target, maxRatio) (chỉ khi bước có params.maxRatio, vd áo bột 1,2; không có thì lắc dư không phạt)
export function bayPlaceScore(d, mul) → 100 | 80 | 55 | 20                 // d = khoảng cách tới tâm / bán kính: ≤0,35·m · ≤0,6·m · ≤1 · xa hơn
export function scoreBay({ placed: [d | { d }], n, mul }) → score
   // trung bình điểm vị trí − 30 · |số đã thả − n|; chưa thả gì → 0
```
**Sàn giờ** `MIN_LIMIT`, `minLimitSec(type, params)` nằm ở lõi (`core/minigame-scoring.js`; `ui/minigames/_gesture.js` chỉ xuất lại, một nguồn duy nhất): dap 1,5·n + 1; xoay 1,4·turns + 1 (bản đầu 1,1); got 1,2·strips + 1; lac 0,4·strokes + 1; bay 1,3·n + 1,5 (giây; loại khác 0). Dùng hai chỗ: giới hạn giờ của bước `gestureLimitSec(step, { assist, untimed })` (`ui/minigames/_gesture.js`) = max(2,5 × par, sàn) — Hỗ trợ thao tác nhân 1,5 cả hai, nấu thử không giới hạn; và mốc trừ 15 vì quá giờ `overtimeAt(type, count, par)` = max(2 × par, sàn) mà `scoreXoay`/`scoreGot`/`scoreLac` tự tính từ `target` (nấu thử truyền par = Infinity → không bao giờ trừ). Sàn không đổi par (par quyết định ngân sách chờ của khách), chỉ tránh "thêm trứng"/nhiều phần không kịp làm và tránh trừ oan người làm vừa tay (bảng số ở `docs/can-bang.md` mục 7.1).

`scoring.js`:
```js
export function ingredientErrors(recipe, notes, picked) → [{code, ing, penalty|cap}]
   // mỗi nguyên liệu chỉ tính 1 lỗi, ưu tiên: trai_ghi_chu (Q ≤ 60, sao ≤ 2) > bay (Q ≤ 60) > thieu_chinh (−30) > thieu_phu (−10) > thua (−8)
export function dishQuality(recipe, stepsResult, ingErrors, opts?) → { q, grade, flawless, capped }
   // opts {thresholds, assist}: assist (Hỗ trợ thao tác) → không Không tì vết, trần hạng Ngon (Q ≤ 89)
   // q = Σ(w × điểm)/Σw − phạt; bước critical < 50 → grade 'hong'; flawless khi mọi bước ≥ 90, không lỗi nguyên liệu, không làm lại, không tự làm
export function customerStars(customer, dishes, recipes, opts?) → { stars, base, penalties, cap }
   // base = hạng của Q trung bình có trọng số theo giá; có món Hỏng → base ≤ 2
   // sao = kẹp(làm_tròn_xuống(base − Σ phạt quầy − phạt chờ), 1, 5); khách khó tính: có lỗi → −1 thêm; khách tutorial không bị phạt
   // M3: phạt nguồn 'tinh_huong' (vd tu_choi_doi_mon −1 sao) trừ sao nhưng KHÔNG tính là lỗi (không kích hoạt −1 của khách khó tính,
   //     không vào counterErrors/kitchenErrors; phiếu chấm ghi riêng testid score-sheet-incident)
export function tipFor(stars, bill, balance?) → đồng   // M4: 5 sao VÀ bill ≥ tipMinBill (20.000đ) → tipFiveStar (5.000đ), còn lại 0
   // bill = kitchen.billOf(customer, recipes): số tiền khách THỰC TRẢ (ảnh chuyển khoản giả 0; có phiếu thu: receipt.total − refunded;
   //   chưa có phiếu thu: giá niêm yết theo yêu cầu thật, gồm phụ thu). Bỏ tip 10.000đ (Không tì vết, khách khó tính, chuỗi "Quầy chuẩn",
   //   Ngày lãnh lương ×1,5). kitchen.finalizeCustomer: khách khó tính chấm 5 sao +strictFiveStarRep danh tiếng; ScoreSheet có thêm `bill`.
   //   order.clipTicket: chuỗi "Quầy chuẩn" chạm 5 lần đầu trong ca (không bật Hỗ trợ tính tiền) → sh.rareRolls += 1 (lượt Giỏ chợ,
   //   tối đa 1 lượt theo chuỗi mỗi ca, cờ sh.streakRoll). Trong mùa sự kiện: + EVENTS[id].festiveRep danh tiếng mỗi phần món lễ đạt Ngon trở lên.
// bổ sung: requiredIngredients(recipe, notes) → {required, main, side, optional, removed, decoys} ; noteObjects ; gradeOf(q, thresholds) ; ING_ERROR_REVIEW
export function averageRating(ratings) → số (đệm 4 sao khi < 5 đánh giá)
export function customerMultiplier(avg) → 1,15 | 1,0 | 0,85 | 0,7
```

## 11. Kinh tế và thạo món — `economy.js`, `mastery.js`

```js
// economy.js
export function summarizeShift(state, data?) → Summary   // data để gắn lời khuyên từ TIPS (mã lỗi → trigger qua ERROR_TIP_TRIGGER)
export const ERROR_TIP_TRIGGER ; export function tipForError(code, tips) → thẻ | null
   // { day, served, lost, missed, cashSales, qrSales, tips, cogs, waste, refunds, undercharge, overchange,
   //   fakeQrLoss, fixedCost, profit, drawerExpected, drawerActual, drawerDiff, avgStars, reputationGain,
   //   counterErrors: {code: số lần}, kitchenErrors: {code: số lần}, bestDish, advice }
   // thực tế thêm: sales, listValue, rounding, qrBalance, tipJar, ratings[], lateReviews[], loanRepaid; advice = {code, count, tipId, text} | null
   // M3: incidents [kết quả tình huống đã xử lý: {id, name, kind, choice, label, safe, text, money, cost, refund, rep, bonus, debt, starLoss, loss, who, tipId}]
   //     (M4: tối đa 2, theo thứ tự), debtIn (khách quen trả nợ, cộng vào profit), debtNotes
   // M4: eventIn, eventOut, eventNotes [{id, name, text, money (+ vào / − ra), capped?, spared?}]; bước 6: rareNotes (quà hàng hiếm
   //     cuối ca, không phải tiền); history[] thêm rare [{kind, name, got, fragment, spoons}];
   //     profit = tiền mặt ròng + QR + tip + debtIn + eventIn − chi phí cố định − hoàn tiền − giá vốn − hao hụt − eventOut
   // bất biến (có test): ví sau ca − ví đầu ca = profit − loanRepaid
export function settleShift(state, summary)   // wallet += (tiền mặt vượt quỹ lẻ) + QR + tip + tiền trả nợ (M3) + eventIn (M4) − chi phí cố định − hoàn tiền; trả nợ nếu có
// M4: sổ tiền sự kiện (sự kiện ngày, tình huống trong ca). eventOut trừ ví NGAY (như giá vốn), eventIn vào ví lúc tất toán (như debtIn).
//   Trần mỗi ngày thật: state.incidents.day = {key, loss, gain} (key = sh.dayKey = ngày thật lúc mở ca; không có giờ thật → 'ngay-<ngày game>'),
//   tổng phạt/chi bắt buộc ≤ eventDayCap.lossIncomeMul × TNC, tổng thưởng ≤ eventDayCap.gainIncomeMul × TNC (BALANCE.eventDayCap, mặc định 1 và 1).
export function eventMoneyIn(state, amount, note, ctx, { cap }?) → { amount, capped }    // bội 1.000đ; kẹp cap (vd gainCap) và trần ngày; phát 'event.money'
export function eventMoneyOut(state, amount, note, ctx, { cap, fine = true }?) → { amount, spared }   // bội 500đ; fine: kẹp cap + trần phạt ngày,
   // phần vượt "Dì Sáu đỡ giùm con lần này" (spared, ghi vào chữ của note); fine = false (tự chọn chi, vd mua hàng) chỉ kẹp cap; phát 'event.fined'
export function eventDayBook(state, sh?) → state.incidents.day ; eventDayCaps(ctx, day) → { loss, gain } ; eventDayRoom(state, ctx, sh?) → { loss, gain }
   // soát lỗi M4: sổ ngày chỉ mở mới khi khóa ngày của ca MỚI HƠN khóa sổ (khóa cũ hơn do lùi giờ máy → dùng tiếp sổ hiện tại);
   // sh.dayKey = dayKeyVN(max(giờ máy lúc mở ca, clock.maxSeen)) (giờ tin cậy, giống khách lạ)
export function canAfford(state, price) ; spend(state, price, reason) ; earn(state, amount, reason)
export function offerLoan(state, balance?) → boolean ; takeLoan(state, balance?)   // khoản vay {amount, remaining}; M3: remaining = roundReward(gốc × (1 + lãi))
export function buyUpgrade(state, upgradeId, ctx) → { ok, reason? }   // kiểm fromDay, tiền; không mua trong ca
export function buyRecipe(state, recipeId, price, ctx) → { ok, reason? }
// mastery.js
export function masteryLevel(progress, levels?) → 1..3
export function recordDish(state, recipeId, dishResult, levels?) → { levelBefore, levelAfter, levelUp } | null   // cập nhật cooks/goodCooks/excellent/flawless/best
export function canAutoStep(state, recipeId, levels?) → boolean     // cấp ≥ 2
```

## 12. Lưu — `src/core/save.js`

```js
export const SAVE_KEY = 'bkn.save', BACKUP_KEY = 'bkn.bak'
export function encodeSave(state) → 'BKN1.' + base64url(UTF-8 JSON) + '.' + fnv1a(SALT + payload)
export function decodeSave(str) → object thô (CHƯA migrate) | null            // sai checksum → null
export function migrate(raw, data?, report?) → state      // gộp với defaultState(), kẹp giá trị, bỏ id công thức/nâng cấp không còn trong data; giữ ca đang dở nếu đủ cấu trúc
   // version 1 → 2: migrateMeta(raw, s, data) thêm/kẹp các trường meta M2; save v1 được mail.seenVersion = '0.1.0' (nhận thư phiên bản mới)
   // version 2 → 3 (M4, bản 0.4.0): migrateContentM3 (tình huống M3, Sổ tay nghề) rồi migrateContentM4 (incidents.lastKind,
   //   lastLoss, day, warn; state.rare qua migrateRare; ca dở của bản 0.3 qua migrateShiftM4). Mọi bản cũ nâng thẳng lên
   //   STATE_VERSION trong một lần nạp; save v3 hợp lệ: migrate(decodeSave(encodeSave(s))) giống hệt s (có test)
   // Vòng soát lỗi M3: ví lẻ của save cũ làm tròn LÊN bội 500đ (report.walletRounded; đang dở ca thì sh.walletStart dời theo),
   //   kỷ lục lãi ca lên bội 500đ, nợ Dì Sáu xuống bội 500đ, quà thư chưa nhận lên bội 1.000đ; bước chuỗi kẹp theo số bước
   //   trong dữ liệu (≥ số bước → done, bỏ claimable ngoài khoảng); ca dở không đủ cấu trúc (bản khác đổi cấu trúc ca, hỏng)
   //   → hủy ca, hoàn ledger.cogs + ledger.waste vào ví, ngày giữ nguyên (report.shiftDropped = {day, refund}), không bỏ im lặng
   //   (soát lỗi M4: hoàn thêm ledger.eventOut — trừ tiền tự mua hàng hiếm đã vào kho — và mods.prepCost)
export function saveTo(storage, state, { backup, keys, guard }?) → boolean ; loadFrom(storage, data?, { keys, report }?) → state|null   // storage có getItem/setItem; thử bản chính rồi bản dự phòng; tự migrate; report.from = khóa đã nạp
export function writeSave(storage, state, { backup, keys, guard, lastCode }?) → { ok: true, code } | { ok: false, reason: 'tab_khac'|'loi_ghi' }
   // mỗi lần ghi state.rev += 1; guard: bản trong storage có rev > state.rev (tab khác đã ghi) → KHÔNG ghi ('tab_khac')
export function storedRev(storage, { keys }?) → số | null
export const DEV_SAVE_KEY = 'bkn.save.dev', DEV_BACKUP_KEY = 'bkn.bak.dev', DEV_KEYS = { save, backup }   // khóa riêng khi mở bằng ?devNow
export function exportCode(state) → 'BKN1.z.' + base64url(lzCompress(UTF-8 JSON)) + '.' + fnv1a(SALT + 'z.' + payload)   // mã sao lưu (M3)
export function importCode(str, data?) → state|null                 // = readCode(...).state
// M3 bổ sung (mục 16.2)
export function readCode(text, data?) → { ok: true, state, code, warn: null|'ban_moi_hon', lost: {recipes, upgrades}, report } | { ok: false, reason: 'rong'|'khong_phai_ma'|'sai_ma'|'hong' }
   // warn 'ban_moi_hon': raw.version > STATE_VERSION hoặc có món/nâng cấp bản này chưa có (codeLosses) → xem trước cảnh báo
   // (M4: mã v3 đưa vào bản 0.3 sẽ báo "bản mới hơn" — đúng hành vi; mã v1/v2 đưa vào bản 0.4 không cảnh báo)
export function codeLosses(raw, data?) → { recipes: [id], upgrades: [id] }
export function extractCode(text) → mã | null                       // bỏ khoảng trắng/xuống dòng/chữ thừa; nhiều đoạn 'BKN1.' thì lấy đoạn dài nhất
export function backupSummary(state) → { shopName, day, chang, wallet, reputation, goldSpoons, recipes /*số món*/, shiftsPlayed, inShift }
export function lzCompress(bytes) → bytes ; lzDecompress(bytes, maxBytes = BACKUP_MAX_BYTES) → bytes   // LZ77 kiểu LZ4, đồng bộ; hỏng → ném lỗi
export const ARCHIVE_PREFIX = 'bkn.save.old.' ; archivePrefix({ keys }?) → '<khóa save>.old.'
export function archiveSave(storage, state, ms, { keys }?) → { ok: true, key, code } | { ok: false, reason: 'loi_ghi' }   // không ghi đè khóa đã có
export function listArchives(storage, { keys }?) → [{ key, at, code }] (mới nhất trước)
export function backupDue(state, nowMs, everyMs = BACKUP_REMIND_MS /*7 ngày*/) → boolean
export function migrateSettings(raw) → settings                    // công tắc boolean, volume kẹp 0..1, incidentFrequency hợp lệ
export function migrateContentM3(raw, s, data?) → s   // incidents {since, recent, log, debts, bonus, total} (lọc id tình huống theo dữ liệu), notebook
export function migrateContentM4(raw, s, data?) → s   // M4: incidents.lastKind ('tot'|'chon'|'xau'|null), lastLoss (0..1, 2 chữ số),
   //   day {key ≤ 20 ký tự, loss ≥ 0, gain ≥ 0}, warn {eventId có trong DAY_EVENTS: ngày game > 0}, lastEvent (như lastKind),
   //   announced {ngày trong [day − 20, day + 1]: '' | id sự kiện ngày}; migrateRare (pendingStall giữ picked/mistakes nếu có);
   //   migrateShiftM4(s.shift)
export function migrateShiftM4(sh) → bản sao nông của ca   // chỉ thêm/sửa trường M4 thiếu hoặc hỏng, không đổi trường hợp lệ (mục 7)
export function migrateRare(raw, s, data?) → s   // M4 bước 6: state.rare (id có trong dữ liệu, số phần 0..stockMax, mảnh 0..fragmentsNeed, sổ ngày chuẩn)
export function migrateCookDraft(sh, data?) → sh | bản sao nông   // mục 24: cook.chonDraft của ca thật và phiên nấu thử (migrate gọi cuối cùng):
   //   picked chỉ giữ id có trên kệ của món, mistakes số nguyên 0..99; phiên nấu đã qua bước Chọn / rổ sai kiểu → bỏ rổ;
   //   save cũ không có trường này và rổ hợp lệ giữ nguyên; không sửa object đầu vào
export function migrateLineMistakes(sh) → sh | bản sao nông   // mục 25: ticket.chonMistakes của ca thật và phiên nấu thử (gọi sau migrateCookDraft):
   //   normalizeLineMistakes theo số dòng phiếu (không phải số → 0, âm → 0, thừa dòng cắt); không phải mảng → bỏ trường;
   //   save cũ không có trường này và dữ liệu hợp lệ giữ nguyên (lưu rồi tải lại không đổi); không sửa object đầu vào
export function migrateCookBoard(sh, data?) → sh | bản sao nông   // M5 (0.5.0): bước đổi loại thao tác (vd Lắc đều: cha → lac).
   //   Chỉ khi cook.phase === 'thot', có board, có công thức trong data và cook.picked là mảng: dựng lại
   //   board = effectiveSteps(R, notes, picked, qty) bỏ bước chon (như lúc chốt bước Chọn) để bước chưa làm hiện thao tác mới;
   //   giữ cook.steps (kết quả cùng id), tiền, phiếu, cost, retriesLeft; activeStepId/retryPending giữ nếu bước còn trên bảng,
   //   không thì null. Bảng đã giống → trả chính sh; chạy lại nhiều lần không đổi. migrate() gọi cho s.shift và
   //   s.tasting.shift theo thứ tự migrateLineMistakes(migrateCookBoard(migrateCookDraft(sh, data), data)).
   //   STATE_VERSION giữ 3 (cấu trúc save không đổi). Test tests/unit/m5-save.test.mjs (8 ca của thiết kế M5 mục 1.7).
// Vòng soát lỗi M3: bản lưu không đọc được (sai checksum, định dạng lạ, save chương trình khác) không bị ghi đè im lặng
export function unreadableSaves(storage, data?, { keys }?) → [{ key, raw }]      // khóa save/dự phòng có chuỗi không nạp được (trùng thì 1)
export function archiveUnreadable(storage, ms, data?, { keys }?) → { ok, archived: [khóa] } | { ok: false, reason: 'loi_ghi', archived }
   // chép NGUYÊN chuỗi sang '<khóa save>.hong.<ms>' (đọc lại kiểm tra; chuỗi đã cất ở lần mở trước thì bỏ qua); ok: false → không ghi đè
export function brokenPrefix({ keys }?) → '<khóa save>.hong.' ; countBrokenArchives(storage, { keys }?) → số bản hỏng đã cất
```
UI gọi `writeSave(localStorage, state, { guard: true, lastCode, keys })` có debounce 300 ms, sau mỗi hành động quan trọng, khi `visibilitychange`/`pagehide`, và cuối ca (kèm ghi bản dự phòng). Tải lại giữa ca: khôi phục `state.shift`; nếu đang ở giữa một mini-game thì bước đó chơi lại từ đầu (cùng tham số).

**Không lưu được thì báo, không im lặng** (vòng soát lỗi M3, `main.js` + `app.js`): `localStorage` bị chặn (`getStorage()` trả null) → `app.setSaveProblem('chan')`; `writeSave` trả `loi_ghi` (bộ nhớ đầy) → `setSaveProblem('loi_ghi')`, ghi lại được thì tự tắt; không cất được bản lưu hỏng → `setSaveProblem('loi_cat', { block: true })` (tạm không ghi để khỏi đè). Giao diện: dải cố định `save-warning` (`data-kind`) trên cùng (màn chơi lùi xuống 48px, biến CSS `--bar-save`), nút `save-warning-backup` "Sao lưu" mở hộp mã sao lưu (`app.openBackup`, main.js gắn `copyBackup`); lần đầu mỗi loại lỗi hiện hộp thoại `save-warning-modal` (`save-warning-copy` / `save-warning-later`), đang trong ca bán thì chỉ báo `save-warning-toast`. Lúc mở game (`bootNotices`): bản lưu hỏng đã cất / mở bản dự phòng / ca dở bị hủy vì đổi bản → hộp thoại `save-notice` (`save-notice-ok`); ca dở mở ở phiên bản khác (`shift.appVersion`) → `version-toast` "Game vừa lên phiên bản … Ca đang bán vẫn giữ nguyên".

**Một tab chơi tại một thời điểm** (`app.js`): tab nào mở game cũng lưu ngay lúc khởi động (rev tăng). Tab cũ nhận sự kiện `storage` của khóa save (hoặc bị `writeSave` từ chối vì rev nhỏ hơn) thì tự khóa: `app.locked = true`, không lưu nữa (kể cả `pagehide`), vòng lặp ca dừng, lớp phủ `tab-lock` "Game đang mở ở tab khác" với nút `tab-lock-reload` "Chơi ở tab này" (tải lại bản mới nhất). Nhờ vậy tab cũ không ghi đè quà, ca, món đã mua ở tab mới, cũng không dùng để lùi một ca hỏng.

## 13. Giao diện — quy ước `src/ui`

- `dom.js`: `h(tag, props, ...children)` tạo phần tử (props hỗ trợ `class`, `style`, `dataset`, `on*`), `clear(el)`, `$(sel, root)`.
- `main.js` (M2): `?devNow=YYYY-MM-DDTHH:mm` (giờ Việt Nam, hoặc `?devNow=YYYY-MM-DD` = 12:00; chỉ localhost/127.0.0.1, `clock.parseDevNow`) ghi đè đồng hồ, `app.now()` chạy tiếp từ mốc đó. Giờ giả ghi mốc tương lai vào save (`clock.maxSeen`, ngày điểm danh, Việc hôm nay…) nên khi có `devNow` game **lưu ở khóa riêng** `DEV_KEYS` (lần đầu chép từ save thật; save thật không bao giờ bị ghi) và hiện dải `devnow-banner` "Giờ giả DD/MM HH:mm · bản lưu riêng" trên cùng (màn chơi lùi xuống 24px). Gắn `attachMeta(app.bus, () => app.state, app.ctx)` một lần và gọi `refreshMeta` khi mở game. `app.ctx` có thêm `now()`.
- `app.js`: `createApp({ root, storage, now, screens, saveKeys?, devBanner? })` → `app = { state, data /*mọi export từ src/data*/, bus, ctx /*{emit, data}*/, save(), go(screenName, params), toast(text, opts), modal(opts) → Promise, vibrate(ms), sound(name), now(), locked }`.
  Nút Back của điện thoại (history API): `app.go` tới màn con (mọi màn trừ `title`, `prep` — `isSubScreen` của `router.js`; `SUB_SCREENS` chỉ là danh sách tham khảo: shop, tasting, quests, mailbox, event, stage-up, service, summary, settings, notebook, recipe-book) đẩy 1 mục lịch sử; về màn gốc (prep, title) bằng nút trong game thì bỏ mục đó (`history.back()` có cờ bỏ qua). `history.back()` chạy không đồng bộ: trong lúc đang lùi mà người chơi mở ngay màn con khác thì chưa đẩy mục mới, chỉ ghi lại và đẩy khi popstate của lần lùi về tới (hoặc sau 1,5 giây) — đẩy chen vào làm lệch sổ lịch sử và vài vòng sau game lùi ra khỏi trang (e2e `stability`). `popstate`: đang mở hộp thoại đóng được thì đóng; màn có `onBack()` tự xử lý (Nấu thử: hỏi như nút "‹ Về Chợ", phiên được giữ; ca bán: ở lại, báo "phục vụ hết khách rồi mới rời xe"); còn lại về `prep`. Ở màn gốc Back rời trang như thường.
  Thực tế thêm: `saveNow({backup}?)`, `modalOpen()`, `modalBlocking()` (hộp thoại chặn → tạm dừng thời gian ca), `settings()`, `applySettings()`, `router`, `switchTab(name)` (khi đang ở màn ca bán). `toast(text, {duration, kind:'info'|'good'|'bad'|'tip', title, icon, testid})` không chặn thao tác, tối đa 2 cái thường; thẻ Mẹo nghề (`kind:'tip'`) hiện gọn (tiêu đề + tối đa 2 dòng, chỉ che dải khách), mỗi lần 1 thẻ, thẻ sau xếp hàng (tối đa 2 thẻ chờ); thẻ trigger `shift_end` không nổi mà hiện trong mục "Mẹo của Dì Sáu" ở Tổng kết. `modal({title, text, icon, body, render(close), actions:[{label, value, testid, kind}], dismissible, testid, blocking = true})`.
  M3 thêm (mục 16): `version` (`APP_VERSION`), `audio`, `replaceState(next)`, `pwa`, `onPwaChange(fn)`, `setPwa(patch)`, `setUpdateReady(worker)`, `applyUpdate()`, `updateSlot()`, `installMode()`, `promptInstall()`; `sound(name)` trả boolean.
  0.4.1 thêm (mục 29): `tour` (hướng dẫn lần đầu: `offer`, `want`, `start`, `skip`, `hold`, `onHold`, `provide`, `screenTours`…); `app.go` gọi `tour.onRoute(name)`; Back của điện thoại khi tour đang hiện = bỏ qua tour.
  Vòng soát lỗi M3: `saveProblem()`, `setSaveProblem(kind | null, { block })`, `openBackup` (main.js gắn), `toastLimit(fn | null)` (màn ca bán giới hạn chiều cao chồng thông báo tới mép trên thanh 4 khâu: thông báo không vừa xếp hàng theo thứ tự đến, thông báo thường chờ quá 3,5 giây thì bỏ vì tin đã cũ; thẻ Mẹo nghề vẫn mỗi lần 1 thẻ). Màn ca bán gộp tiến độ Việc hôm nay đến cùng lúc thành 1 thông báo và không báo tiến độ việc khi khách hướng dẫn ngày 1 còn trong ca.
  Tham số URL: `?seed=N` chỉ có tác dụng khi chưa có save; `?test=1` (chỉ trên localhost/127.0.0.1) bật `settings.assistMotion` cho kiểm thử tự động.
- `screens/counter.js`: `mountCounter(root, app, { switchTab })` → `{ el, update, onShow, onHide, unmount }`. Nút hành động mỗi khâu (Đọc lại đơn/Chốt order, Đưa tiền thối, QR, Kẹp phiếu bếp) nằm trong thanh `.act-bar` dính đáy panel; sang khâu mới panel tự cuộn để thấy phần thao tác. Phiếu chấm có 5 hàng: Order, Báo tổng (`bao_du`, `bao_thieu`), Thối tiền (`thoi_thieu`, `thoi_du`, `qr_gia`), Bếp, Thời gian chờ. `screens/kitchen.js`: `mountKitchen(root, app, { tasting?, onFocus?(want) })` → `{ unmount, update, onShow, onHide, selectTicket(ticketId), tourSpot, busy, guideHold, focusWanted }` (0.4.1 thêm tourSpot/busy/guideHold, M5 thêm onFocus/focusWanted — mục 13.3); nút "‹ Phiếu" (và chạm phiếu trên dây chung) đưa về dây phiếu ở cả bước chọn lẫn Thớt, rổ đang chọn được giữ (trong state: `cook.chonDraft`, nên tải lại trang cũng giữ, mục 24); ô "Đang làm" trên dây phiếu có "Bỏ món" + "Làm tiếp"; trên Thớt thẻ công thức thu gọn (chỉ ghi chú đỏ, nguyên liệu và các bước gập lại); màn `service` nạp bếp bằng `import()` động, gọi `update(dt)` mỗi khung hình và `onShow/onHide` khi đổi tab (rời tab giữa mini-game → bước đó chơi lại từ đầu).
- `router.js`: mỗi màn là module `export default { mount(root, app, params) → { unmount(), update?(dt), onBack?() } }`. M3: `ROOT_SCREENS = ['title', 'prep']`, `isSubScreen(name)` (mọi màn khác là màn con, Back → Chuẩn bị), `createRouter(...)` có thêm `register(name, screen)`, `has(name)`, `names()`; bảng màn `SCREENS` ở `src/main.js` (mục 16.4). Các màn: `title` (lần đầu: đặt tên xe; sau đó: vào game), `prep` (màn Chuẩn bị ca: thông tin ngày, nút "Mở hàng", nâng cấp — M2 thêm shop/nhiệm vụ/điểm danh), `service` (ca bán: chứa HUD + thanh tab Quầy/Bếp, gắn `counter` và `kitchen` làm panel con), `summary` (tổng kết ca).
- `loop.js`: `requestAnimationFrame`, gọi `advance(state, dt)` (dt kẹp 0,05 s) và `screen.update(dt)`; tạm dừng khi tab ẩn (`visibilitychange`).
- `input.js`: tiện ích Pointer Events: `bindPointer(el, {down, move, up, cancel}, { space }?) → unbind` với `setPointerCapture`, chỉ nhận con trỏ chính, `pointercancel` coi như thả tay; phím Space mô phỏng nhấn/giữ trên máy tính khi bật `{ space: true }` (lua, rot, cham bật sẵn). Mỗi handler nhận `(p, e)`, `p = {x, y, rx, ry, clientX, clientY, rect, t, pointerId, pointerType, synthetic, …}`.
- CSS sân khấu mini-game: `touch-action: none; user-select: none; -webkit-touch-callout: none;` chặn `contextmenu`.
- Bố cục dọc, chuẩn 390×844; khung tối đa 480px chiều ngang, căn giữa trên máy tính. Vùng chạm ≥ 44px, cách mép 16px.
- Mọi phần tử quan trọng có `data-testid` (danh sách ở mục 14) để test tự động.
- Tôn trọng `prefers-reduced-motion` và cài đặt giảm chuyển động.
- Âm thanh WebAudio tổng hợp (M3, `ui/audio.js`, mục 16.5); rung `navigator.vibrate` nếu có và được bật.

### Mini-game plugin — `src/ui/minigames/index.js`
```js
// mỗi file chon.js, cha.js, thai.js, cham.js, lua.js, rot.js (M5 thêm dap.js, xoay.js, got.js, lac.js, bay.js):
export default {
  type: 'thai',
  mount(stage /*HTMLElement*/, step /*bước đã áp patch*/, ctx /*{ app, recipe, zoneMul, assist, data, notes, qty, rand, slowBurn, (chon:) shelf, basketHint }*/)
    → { result: Promise<{ score, details }>, destroy(), hold?(on) }   // destroy() → result nhận null; M5: mọi plugin có hold(on)
}
// index.js: export const MINIGAMES = { chon, cha, thai, cham, lua, rot, dap, xoay, got, lac, bay }   // M5: 11 loại
//           export function playStep(stage, step, ctx); export function hintFor(step, data); export function skinFor(step, data)
// M5: ctx có thêm vfx (app.vfx), reduced (hàm), stepIndex, stepTotal, stepGrades (chấm bước của buildFrame2), method (cách
//     sơ chế đã chọn, Thái vẽ hình "xong" theo cách này). Plugin lấy qua _util.js: vfxOf(ctx), reducedOf(ctx), frameSteps(ctx).
```
Handle có thể có thêm `snapshot()` (chon: `{picked, mistakes, overtime?}`); ctx của chon nhận `initial: {picked, mistakes, overtime?}` để khôi phục rổ (và phạt quá giờ đã mắc) khi người chơi về dây phiếu/đổi tab/tải lại trang rồi quay lại, và `onChange(snapshot)` sau mỗi lần chạm ô kệ và lúc vừa quá giờ (bếp lưu `kitchen.saveChonDraft`, màn `market` lưu `rare.saveStallDraft` — chỉ lấy `picked`, `mistakes`). Sân khấu bước trên Thớt (lớp phủ `.k-layer[data-kind="stage"]`) cuộn dọc khi cao hơn panel, thanh chân `.mg-foot` (Xong, Rót, Nhấc…) dính đáy ngay trên thanh tab Quầy/Bếp; mở bước thì bếp cuộn sẵn vừa đủ để chai (Nêm) nằm trọn phía trên thanh chân (mục 24); thớt chà (Chà) tự co vừa chỗ còn lại của sân khấu nên mọi vết bẩn / cả thớt lắc nằm trọn phía trên thanh chân không phải cuộn (mục 26; cuộn sẵn chỉ còn là dự phòng). Bếp chặn "click ma": click của lần chạm bắt đầu trước khi lớp phủ đổi (đóng/mở ở pointerdown) bị bỏ (mục 24). Hỗ trợ thao tác ở bước chọn **không** gợi ý ngay: ô cần lấy chỉ nhấp nháy sau 1,5 × par (thường là 2,5 × par, kèm phạt). Rót (rot) rời tab khi đang giữ: chỉ tạm dừng, lượt đó rót tiếp được, không bật "Xong", không tự kết thúc.
`details` theo loại (bếp chuyển thẳng vào `submitStep`): chon `{picked, mistakes, tapMistakes, overtime, elapsed}`; cha `{spots[] | reversals, strokes, elapsed}`; thai `{cuts[], extra, guides, elapsed}`; cham `{mode, taps, n, distances | taps, N, T | counts, targets, elapsed}`; lua `{value, zone, shown, elapsed}`; rot `{level, pours, zone, shown, elapsed}`. `rand` là bộ ngẫu nhiên tất định theo seed:ngày:phiếu:dòng:bước nên chơi lại một bước giữ nguyên vạch/vết.
`details` của 5 loại M5: dap `{cracks, n, zone, shown, elapsed}`; xoay `{turns, target, spills, cv, maxSpeed, elapsed}`; got `{coverage, strips, strokes, misses, elapsed}`; lac `{strokes, target, cv, elapsed}`; bay `{placed, n, tray, elapsed}`.
Mini-game chỉ đo thao tác và gọi hàm chấm trong `core/minigame-scoring.js`; không tự sửa state. Màn `kitchen` nhận `result` rồi gọi `submitStep`. Thời gian đo bằng `performance.now()`. Mỗi bước tự kết thúc ở 2,5 × par (trừ `chon`; 5 loại M5 theo `gestureLimitSec` có sàn giờ, mục 10). *Trước 0.5.0:* thẻ gợi ý chữ 0,8 s trước bước; *từ 0.5.0:* thẻ "Bước k/N" có tay mẫu (1,1 s, chạm để vào ngay), từ lần nấu thứ 3 của món chỉ còn ruy băng gọn (mục 13.3).

### 13.1 Giao diện M2

- `app.nowInfo()` = `makeNowInfo(app.state, app.now())` (cập nhật `clock.maxSeen`); `app.session` (không lưu): `checkinShownDay`, `mailToastIds`, `pendingMail` (thư mới lúc mở game, vd thư chào mừng).
- Màn mới (router): `shop` (params `{tab: 'recipes'|'upgrades'|'spoons'}`), `tasting` (`{recipeId}`), `quests`, `mailbox`, `event` (`{eventId}`), `stage-up`. Mỗi màn có đầu màn `screenHead` (nút `meta-back` ≥ 44px về `prep`, viên Tiền quán + Muỗng Vàng; 0.4.1: `help: true` thêm nút "?" cuối hàng tiêu đề, mục 29) dính trên cùng.
- `prep`: vào màn gọi `refreshMeta`; lần mở đầu tiên (ngày 1, chưa bán ca nào, `isFirstVisit`) lời hướng dẫn của Dì Sáu (`prep-talk`) và thẻ "Dì Sáu dặn: Phục vụ khách đầu tiên" lên ngay dưới đầu màn, chưa hiện "Giấc mơ tiếp theo" (mở dần); lời Dì Sáu các ngày sau theo sự kiện ngày (`DIALOGUE.diSau.dayEvent[id]`, `prepTalk`); lưới lối vào 4 ô (Chợ Công Thức, Việc hôm nay, Điểm danh, Hộp thư) có chấm đỏ; thẻ sự kiện có thời hạn; thẻ sự kiện ngày + lựa chọn (vd Căng bạt); Phiếu Chợ Sớm; thẻ chuỗi ("Dì Sáu dặn", gộp nút nhận nhiều bước); thẻ "Giấc mơ tiếp theo" hoặc thẻ lên chặng. Lần mở đầu tiên trong ngày thật tự mở bảng điểm danh, kể cả lần đầu mở game với save mới (ô 1 "Tuần Khai Trương" hiện ngay sau khi đặt tên xe; `app.session.checkinShownDay` giữ không bật lại trong ngày); lần đầu đủ điều kiện lên chặng mở hộp thoại mời xem màn `stage-up`. Thư mới lúc vào màn: thông báo nổi `mail-toast` (thư chào mừng; 1 thư thì ghi tiêu đề; nhiều thư thì ghi số thư) — hiện SAU khi bảng điểm danh đóng, không chồng lên bảng. Việc sự kiện hôm trước tự nhận: `event-auto-toast`. Thẻ sự kiện (`event-card`, `data-dot`) có chấm đỏ `event-card-dot`, dòng `event-pending` và nút "Nhận quà sự kiện" khi `eventsOverview().pending > 0` (điểm danh sự kiện, việc sự kiện xong chưa nhận, bước chuỗi sự kiện chờ nhận — cả trong ân hạn). Dòng hiệu ứng sự kiện ngày và Dự báo dùng `dayEventEffects(info)` (đã chọn Căng bạt / có Bạt che mưa → hiệu ứng của lựa chọn). Giờ máy bị lùi: dòng nhắc `rewind-note` (chỉ dòng này, không bật thêm thông báo nổi), nút nhận quà theo ngày khóa. Kiểm tra mỗi 30 giây, qua mốc 04:00 thì làm mới. Nâng cấp chuyển sang tab Nâng cấp của Chợ Công Thức. Xuất `dayEffectLines(effects, data, state?)`, `forecastCustomers(state, ctx, info)`.
- `service`: thông báo nổi không chặn thao tác cho `event.quest` (`event-quest-toast`, việc sự kiện), `quest.progress` ("Việc hôm nay: 4/5 · Thối đúng 5 lần liên tiếp", mỗi việc tối đa 1 lần/4 giây, xong việc và đứt chuỗi luôn báo), `chain.progress` ("Dì Sáu dặn · 2/3 · Ghi phiếu đúng…", mỗi chuỗi tối đa 1 lần/4 giây; tiêu đề theo `NPCS[npc].verb`: "Cô Hạnh nhờ"), `chain.step` (chuỗi sự kiện: "Nhận thưởng ở màn sự kiện", chuỗi thường: "ở màn Chuẩn bị"), `tem.gained`; đầu ca báo sự kiện ngày và Phiếu Chợ Sớm đang áp dụng.
- `summary`: dòng khách bỏ về không tính khách dùng ảnh chuyển khoản giả bị bắt (ghi riêng "Bắt được ảnh chuyển khoản giả"); mục "Việc và chuỗi nhiệm vụ" (tiến độ việc, bước chuỗi — chuỗi sự kiện nhận ở màn sự kiện, Tem hôm nay) và thẻ báo trước sự kiện ngày mai (`dayEventInfo(state, state.day)`); dự báo khách ngày mai đã tính sự kiện.
- Nấu thử: `mountKitchen(root, app, { tasting: { onDone(dish) } })` chạy trên app "hộp cát" (`tastingSandbox`, bus riêng): mini-game nhận `ctx.untimed` (bước không tự kết thúc, bước Chọn không bị tính quá giờ, Chà không trừ điểm chậm) và `ctx.guide` (ô cần lấy ở bước Chọn nhấp nháy ngay: "tay chỉ"); par × `TASTING_PAR_MUL` (4), ẩn thanh thời gian, không dòng đầu Thớt ("‹ Phiếu") và nút "Bỏ món" — màn Nấu thử có đầu riêng: nút "‹ Về Chợ", nhãn "Nấu thử" + tên món, dòng "Không tính giờ · Có gợi ý · Miễn phí · Không tính thạo món"; Ra món → `finishTasting` → màn kết quả (Mua món / Về Chợ Công Thức). Thoát giữa chừng giữ phiên nấu thử (`state.tasting`) để làm tiếp.
- Hình xe: `cartSvg({ name, umbrellaColor, umbrellaAlt, pattern: 'soc', sign: 'vien'|'den', decor: 'chau_hoa' })` (tên xe cắt ở 22 ký tự, cỡ chữ giảm theo độ dài 13 → 9 và ép khít `textLength` trong biển trắng, không tràn ra thân xe); `cartOptions(state, data)` / `cartView(state, data)` (meta-ui.js) đọc `cosmetics.equipped` (dù mặc định: "Dù cũ của Dì Sáu" màu gạch phai). Màn mở đầu và Góc Muỗng Vàng vẽ theo đồ đang dùng. `art.js` thêm icon `phieu_cho_som bat_che_mua troi_mua nang_nong lanh_luong cho_phien thu ruong lich phan_trang danh_hieu mon_goi_cuon mon_bun_thit_nuong mon_che_ba_mau` và mặt `CO_HANH`.

### 13.2 Giao diện M3 nội dung

- `prep` gọn lại: đầu màn gồm tên xe + Muỗng Vàng, "Ngày N", 3 ô số Tiền quán / danh tiếng / sao trung bình; lưới biểu tượng `prep-nav` (4 cột: hàng 4 ô + hàng 3 ô, giữ 4 cột cả ở 360px, ô thu hẹp lề) gồm 7 ô: Chợ Công Thức (`open-shop`), Việc hôm nay (`open-quests`), Điểm danh (`open-checkin`), Hộp thư (`open-mail`), Sổ công thức (`open-recipe-book`), Sổ tay nghề (`open-notebook`), Cài đặt (`open-settings`, thay nút bánh răng cũ). Mỗi ô chỉ ghi tên (trạng thái ngắn như "2 thư mới" nằm trong `aria-label`/`title`) và có `data-dot` = số chấm đỏ (món mua được, việc chờ nhận, quà điểm danh, thư mới, nhóm Sổ tay chờ nhận, nhắc sao lưu). Thẻ "Hôm nay" (`prep-forecast` dự báo khách, gồm cả khách thêm nhờ tình huống `prep-incident-bonus`; `prep-debts` sổ nợ đang chờ; `prep-dish-<id>` món bán hôm nay). Thẻ Mẹo nghề ngẫu nhiên đã mở (`prep-tip`, nút `prep-tip-notebook` mở Sổ tay nghề), chọn một lần mỗi lần vào màn (`randomSeenTip` với `Math.random` ở UI). Nút "Mở hàng" (`open-shift`) luôn thấy được, không tràn ngang ở 360×740.
- `title`: người chơi quay lại (đã đặt tên xe) thấy một thẻ Mẹo nghề đã mở (`title-tip`) khi chờ vào game.
- `service`: đầu ca hiện thông báo nợ (`debt-toast`, khách quen trả nợ / quá hạn chưa trả). Mỗi khung hình và ngay khi `ticket.clipped` (trước khi khách kế tiếp bước lên quầy) gọi `checkIncident()`: chỉ khi tab đang mở là Quầy, không có hộp thoại, tab không bị khóa và `incidentDue(state, ctx)` đúng thì mở hộp thoại chặn `incident-modal` (vòng lặp không chạy `advance` khi hộp thoại chặn → thời gian ca và kiên nhẫn của khách đứng yên). Hộp thoại: nhãn "Tình huống đầu ca" / "Tình huống giữa hai khách" (+ "chuyện vui"), `incident-text`, các nút `incident-choice-<id>` (`data-safe`, `data-choice`, dòng cái giá; lựa chọn không dùng được bị khóa kèm lý do), sau khi chọn đổi sang `incident-result` (`data-choice`), `incident-effects` (tiền, giá vốn, danh tiếng, khách thêm…), `incident-tip` (thẻ Mẹo nghề mở được, nếu có) và nút `incident-ok` "Bán tiếp". `screen-service` có `data-t` = giờ trong ca (giây, 2 số lẻ) để test đo thời gian đứng yên. Phiếu chấm món có dòng `score-sheet-incident` khi món bị trừ sao vì từ chối đổi món.
- `summary`: bảng tiền có dòng "Khách quen trả nợ" (`sh.debtIn`); thẻ `summary-incident` (`data-incident`, `data-choice`: tình huống, lựa chọn, kết quả), `summary-debt` (sổ nợ), `summary-notebook` (tiến độ Sổ tay nghề, nhóm chờ nhận thưởng).
- Màn mới `notebook` (`ui/screens/notebook.js`) và `recipe-book` (`ui/screens/recipe-book.js`), đăng ký ở `SCREENS` của `src/main.js`; mở từ lưới màn Chuẩn bị và từ mục Chơi của Cài đặt (`settings-open-notebook`, `settings-open-recipe-book`). Chi tiết mục 17.

### 13.3 Giao diện M5: Bếp kiểu game nấu ăn (Đợt 0 bản 0.4.2, Đợt 1 bản 0.5.0)

Thiết kế: `docs/tham-khao/m5-thiet-ke.md` (mục 1 hợp đồng, 6 quy chuẩn vẽ/âm/hiệu ứng, 9 quyết định đã chốt); nghiên cứu:
`docs/tham-khao/m5-nghien-cuu-giao-dien.md`; bản đồ mã trước khi làm: `docs/tham-khao/m5-ban-do-ma.md`. Tóm tắt kết quả ở mục 31.

**Phong cách (người dùng đã duyệt ở Phòng mẫu Đợt 0).** Hết "ô vuông có chữ": hình to là nhân vật chính; viền mực nâu
`#3a2618` dày 3; khối 3 tông kiểu cel-shading (mảng tối dưới-phải, điểm sáng trên-trái) và bóng đất; nút "bánh kẹo" (viền mực,
mặt sáng trên đậm dưới, bóng cứng `0 4px 0`, nhấn thì lún 3px); khung giấy, gỗ, phấn; chữ chỉ là phụ. Font tiêu đề **Baloo 2
ExtraBold** (800) tự lưu ở `fonts/` (latin + tiếng Việt, khoảng 23 KB, OFL), chữ thân vẫn `system-ui`. Chỉ học cơ chế và cảm
giác của game tham khảo; mọi hình, câu thoại, âm thanh tự làm.

**Nền móng.**
- `css/theme.css`: `@font-face 'Baloo 2'` (`font-display: swap`), biến `--g-*` (màu, viền, bóng, đường cong `--g-ease-*`), nút
  `.g-btn` (`--go`, `--small`…), khung `.g-paper`/`.g-wood`/`.g-chalk`, `.g-ribbon`, `.g-pill`. Mọi lớp mới có tiền tố `g-`, biến
  có tiền tố `--g-` (không đè lớp cũ). `css/base.css` (Đợt 1): `.btn` của toàn game chuyển sang kiểu bánh kẹo, màu vẽ bằng
  `--btn-top/--btn-bot/--btn-edge` (luật riêng đặt `background` vẫn thắng), giữ `min-height: var(--tap)`, không đổi `--brick`.
- `ui/motion.js`: `EASE`, `isReduced(app?)` = công tắc "Giảm chuyển động" trong game, lớp `reduce-motion` trên `<html>` hoặc
  `prefers-reduced-motion`. Luật CSS ở `base.css` chỉ ép thời lượng hoạt ảnh CSS; hiệu ứng JS (WAAPI, canvas, rAF) phải tự hỏi
  `isReduced`. Import trong Node an toàn.
- `ui/vfx.js` — `createVfx({ host, reduced })` → `{ layer, burst(target, kind, {n, colors}), floatText(target, text, {tone}),
  ripple(x, y), shake(el, 1..3), squash(el), pop(el), hitstop(ms), fly(from, to, {node, html, ms, arc}), coins(from, to, n),
  confetti(target, n), stats() → {dom, particles}, clear(), destroy() }`; thuần: `VFX_LIMITS {dom 30, particles 150, dpr 2}`,
  `VFX_KINDS`, `easeOutBack`, `easeOutCubic`, `bezier`, `particlePlan(kind, reduced)`, `spawnParticles`, `stepParticles`.
  Luật: chỉ animate `transform`/`opacity`; lớp `.vfx-layer` (z-index 25 trong `.overlay-root`, `pointer-events: none`, không phải
  `.k-layer`); pool DOM ≤ 30 nút, canvas tạo lười (DPR ≤ 2), rAF chỉ chạy khi còn hạt; giảm chuyển động → tối đa 3 hạt đứng yên,
  không rung/bay; trang ẩn → `clear()` và không nhận hiệu ứng mới; đích đã rời DOM / `display: none` → bỏ qua; `fly`/`coins` bị
  `clear()` giữa chừng trả `false`; **không phát sự kiện VFX lên bus** (`bus.on('*', save)`); hiệu ứng kích theo sự kiện, không
  trong `render()`; kỹ thuật "nhân bản rồi bay" (chụp `getBoundingClientRect` + `cloneNode` trước khi panel vẽ lại). `app.js`
  tạo `app.vfx = createVfx({ host: app.overlay, reduced: () => isReduced(app) })` **một lần**; tự dọn khi `app.go()` và khi bật
  Giảm chuyển động. iOS không có `navigator.vibrate`: kết quả xấu thay bằng `shake(stage, 1)` (giảm chuyển động: chớp viền đỏ).
- `ui/audio.js`: `SOUND_NAMES` 22 âm = 12 âm cũ + Đợt 0 `stamp, sparkle, fanfare, tick, whoosh` + Đợt 1 `crack, stir, peel,
  shake, plop`; `ACTION_SOUNDS = { dap: 'crack', xoay: 'stir', got: 'peel', lac: 'shake', bay: 'plop' }`. Mỗi lần phát lệch
  cao độ ngẫu nhiên khoảng ±4%. Lời gọi luôn là chuỗi viết thẳng (`sound('crack')`, `cue(ctx, 'crack', …)`) để test quét được.

**Hình** (`src/ui/art/`, mặt tiền `src/ui/art.js`; thuần, import trong Node được).
- `art/kit.js`: `INK`, `OUTLINE` 3, `PAL`, `svg(body, vb)`, `ground`, `hilite`, `tone3`, `ball`, `rareStar`… Quy chuẩn vẽ ở thiết kế
  M5 mục 6.1 (viewBox 64 cho icon và hình trạng thái, đạo cụ viewBox riêng trong `PROP_META`; cấm gradient, filter, `clipPath`,
  `mask`, `<use>`, `href`, `url(`, base64; ≤ 3,5 KB mỗi icon/hình trạng thái, ≤ 6 KB mỗi đạo cụ; lòng đỏ `var(--yolk, …)` để trứng
  gà ta dùng chung khuôn). Test `tests/unit/art-v2.test.mjs`.
- `art/ing-tuoi.js`, `ing-kho.js` (nguyên liệu + 35 hình trạng thái), `mon.js`, `tools.js` (dụng cụ + biểu tượng thao tác
  `muong_khuay`, `dao_bao`, `binh_lac`, `khay_bay`), `props.js` (14 đạo cụ lớn: `thot_lon dao_lon tay chao_lon noi_lon phin_lon
  ly_lon to_lon chen_lon ro_lon binh_lac_lon bep_ga dia_lon voi_nuoc`, kèm `PROP_META`).
- `art.js` (Đợt 1): giữ mọi export cũ; `ICONS` (đóng băng, viewBox 64) = bộ cũ đè bởi `ICONS_V2` + `fallback` (84 id, mọi id cũ
  còn); `icon(id)` như cũ; **`art(id, state)`** = `STATES['id.state']` hoặc `icon(id)` (luôn có hình); **`prop(id)`** = `PROPS[id]`
  hoặc `''` (bên gọi tự dự phòng); `PROP_META`, `PROPS`, `STATES`, `ICONS_V2`; `LEGACY_ICONS` + `legacyIcon(id)` (bộ cũ nguyên vẹn,
  cho Phòng mẫu so cũ/mới). Hình trạng thái và đạo cụ **không** nằm trong `ICONS`. `art/v2.js` chỉ còn là lớp tương thích
  (`artV2 = art`, `propV2 = prop`, `STATES_V2`), chỉ import `../art.js` (không vòng import); mã mới import thẳng từ `art.js`.
  Món hiếm dùng hình món nền + huy hiệu ★ (quyết định Q3).
- `art/state-map.js` (thuần, không import): bước → hình trạng thái. `METHOD_STATE` (`thai_lat → lat`, `thai_soi → soi`, `bao`,
  `hat_luu`, `cat_soi → soi`, `cat_vuong → vuong`, `de_nguyen → null`), `STEP_STATE` (theo id bước: `rua_dua → sach`, `got_* →
  got`, `dap_trung → op_la_song`, `chien_trung → op_la` theo ghi chú/nhãn, `ao_bot → vo_buoi.ao_bot`, `them_da → vien`…),
  `methodState`, `stepState(step, result, { notes })`, `activeState(step)`, `boardStates(board, results, { notes, activeId })` →
  `{ ing: state }` (bước sau đè bước trước), `statesOfStep`.

**Khung sân khấu** `minigames/_frame.js`: `buildFrame2(stage, { icon, title, sub, steps: {index, total, grades}, timeLabel, vfx })`
→ `{ head, area, foot, fx, subEl, setTime(frac), setSub(text), setSteps(steps), destroy() }`. Đầu màn gọn ≤ 44px: chuỗi chấm bước
tròn (bước hiện tại 1,2× có hình nguyên liệu, bước xong có ✓ và viền màu theo hạng; `.is-crowded` khi ≥ 5 chấm), tên bước, thanh
giờ `[mg-time]`; `.mg-sub` là thẻ giấy ở mép trên vùng chơi; lớp `.mg-fx` (không nhận chạm) cho con dấu, Dì Sáu, chữ nổi. Giữ
lớp móc cũ `.mg-head`, `.mg-sub`, `.mg-area`, `.mg-foot`, `.mg-time-fill`, `.mg-time.is-late`. Thuần: `stepDots`. Trong bếp
(`css/mg-prep.css`, áp cho `.k-layer[data-kind="stage"] .mg-stage.g-frame2`): nền tường gạch men kem, thanh chân là mặt quầy gỗ có
viền mực (`--g-foot-h` 61px; chữ ở thanh chân luôn nằm trên `.g-pill` hoặc nút), `--g-stage-pt` 8px (≤ 760px) / 6px (≤ 700px).
`_util.js` thêm: `feedback(ctx, kind, target)` (âm + rung như cũ, có `target` thì gọi vfx: good/done/hit lấp lánh, cut/chop vụn,
spill/pour giọt, sizzle dầu, peel vỏ; bad/spill rung khung), `popLabel(host, text, x, y, cls, ctx)` (có vfx thì `floatText` đặt
trên ngón tay), `vfxOf(ctx)`, `reducedOf(ctx)`, `frameSteps(ctx)`.

**Đo cử chỉ** `minigames/_gesture.js` (thuần, giây): `cvOf`, `createTurnCounter({cx, cy, minR})` (số vòng không lùi khi đổi
chiều, `speed()`, `cv()`), `createSpillMeter({max, holdSec 0.25, cooldownSec 0.6})`, `classifySwipe(p0, p1, {axis, tolDeg 35,
minLen 24, dir})` → `{ok, reason: 'ok'|'ngan'|'nguoc'|'lech', len, dev}`, `bandCoverage`, `mergeSegments`, `createRhythm`,
`createReversalCounter({threshold 24})`, `NEEDLE_PERIOD` 1,1 s, `needleValue(t)` (kim đi về 0 → 1 → 0), `gestureLimitSec(step,
{assist, untimed})` (mục 10); `MIN_LIMIT`, `minLimitSec(type, params)` xuất lại từ `core/minigame-scoring.js` (cùng đối tượng, không
sao chép). Test `tests/unit/m5-gesture.test.mjs`.

**Năm plugin mới** (hợp đồng `mount(stage, step, ctx) → { result, hold(on), destroy() }`; lớp gốc `.mg-<loại>` + `.skin-<id>`,
`stage[data-skin]`; vùng thao tác `touch-action: none` qua `.k-layer[data-kind="stage"] …` trong CSS; tự cuộn sân khấu để vùng
chạm nằm trên thanh chân):
- `dap.js` (Đập trứng, `css/mg-heat.css`): kim thước lực chạy đi về (chu kỳ 1,1 s); chạm quả trứng khi kim trong vùng xanh →
  nứt (`crack`), vuốt xuống (±35° × mul, ≥ 36px) → lòng trứng rơi vào chảo (squash, dầu bắn, `sizzle`); chạm thay vì vuốt hoặc
  kim quá vùng xanh → vỏ rơi vào ("Có vỏ!", quả đó tối đa 40). Đủ n quả tự xong. Trứng gà ta đặt `--yolk` đậm (`DAP_YOLK_TA`).
  Thuần: `dapLayout(W, H, n, meta)`; hằng `DAP_SWIPE_MIN` 36, `DAP_TAP_MAX` 12, `DAP_METER_H` 44.
- `xoay.js` (Khuấy, `css/mg-mix.css`): vẽ vòng quanh tâm tô/ly/chén (cả cảnh `.xoay-scene` nhận cử chỉ, chiều nào cũng được);
  nhanh quá `2,2 · mul` vòng/s (× 1,8 khi `fast`) quá 0,25 s → văng (giọt bắn, tô rung). Vệt xoáy, màu hòa dần, `stir` mỗi
  nửa vòng. Đủ vòng tự xong. Thuần: `bowlGeometry(skin)`, `ringSegments`, `mixLayers`; `XOAY_MAX_SPEED` 2,2, `XOAY_FAST_MUL` 1,8.
- `got.js` (Gọt vỏ, `css/mg-prep.css`): K dải dọc cao bằng quả; vuốt thẳng từ trên xuống (lệch ≤ 35°, ≥ 24px); độ phủ mỗi dải là
  hợp các nhát; nhát ngược/lệch/trượt là nhát hụt. Dải vỏ cuộn rơi (`peel`), dải đã gọt đổi màu ruột. Mọi dải phủ ≥ 85% thì tự
  xong. Thuần: `bandRect`, `trimArt`, `dropGround`; `GOT_DONE_AT`, `GOT_SWIPE_MIN`, `PEELER_OFFSET_PX`, `GOT_POSE`.
- `lac.js` (Lắc, `css/mg-mix.css`): kéo bình/rổ lên xuống; mỗi lần đổi chiều quá 24px là một lượt (`createReversalCounter`);
  không dùng cảm biến chuyển động (iOS bắt xin quyền). Bình nghiêng theo ngón (giữ cả khi giảm chuyển động vì là phản hồi trực
  tiếp), `shake`, bọt dâng. Bước không có `params.maxRatio` (Lắc đều trà tắc): đủ lượt tự xong. Bước có `maxRatio` (Lắc rổ áo
  bột năng, 1,2): không tự xong — lắc đủ K lượt rồi nhấc tay mới xong (nhấc tay sớm thì chạm lại lắc tiếp), hoặc hết giờ;
  dòng hướng dẫn "Lắc đủ K lượt rồi nhấc tay.", bộ đếm ghi k/K cả khi vượt K và đổi chữ theo vùng ("Nhấc tay! 9/8", "Quá tay!
  10/8", viên xanh / đỏ), thanh lượt `lac-bar` ở thanh chân có vạch K, vùng vừa đủ K..K × maxRatio và vùng quá tay (sọc
  đỏ); quá tay thì chữ nổi lời của lớp vỏ ("Lắc quá tay, bột văng!"), vệt bột văng tĩnh cạnh rổ, rung nhẹ (giảm chuyển
  động: không hạt bay, chớp viền đỏ tĩnh). Thuần: `lacRule(K, maxRatio)` → `{ K, strict, maxRatio, okMax, barMax }`,
  `lacZone(k, rule)` (thieu | du | qua), `lacDoneOn(event, k, rule)`, `shakerOverlay`, `basketOverlay`; `LAC_THRESHOLD` 24,
  `LAC_TRAVEL` 70, `LAC_BAR_EXTRA` 0,3.
- `bay.js` (Thả đá, `css/mg-mix.css`): kéo từng viên từ khay (`max(n + 1, 3)` viên, nên "Ít đá" có nghĩa thật) thả vào vòng đích
  trên miệng ly; thả ngoài thì trôi về khay, không phạt; chạm viên đã thả để lấy ra; bấm Xong (bật khi đã thả ≥ 1). Squash, gợn
  nước, `plop`. Thuần: `trayCount(n)`, `cupLevel(f)`, `drinkSvg`; `BAY_ITEM_PX` 52.
- Các plugin cũ ở Đợt 1: Thái kiểu mới là mặc định (dao SVG lệch 40px trên ngón, lát tách và vụn; pointer gắn trên cả `.mg-area`,
  bộ giải theo `data-x` cũ vẫn chạy; `ctx.method` chọn hình "xong"); Chà vẽ cảnh theo tiền tố id bước (`CHA_LOOKS`: `rua` → chậu
  nước, `boc` → đĩa, `xe`/`bop` → thớt; thuật toán vừa khung giữ nguyên, `cha-fit.test`); kệ Chọn nhiều tầng tự co cỡ hình
  (`shelfIconSize`), rổ nằm trong thanh chân, ở màn ≤ 700px ẩn đầu sân khấu trừ khi đang tập trung; Nêm, Canh lửa, Rót vẽ lại cảnh
  (chai một hàng trên kệ, kim lửa, khối nước dâng bằng transform) với `luaLayout`, `rotLayout`, `levelY`, `bottleArt`…; mọi
  testid và `data-*` cũ giữ nguyên.

**Thành phần bếp** (`src/ui/components/`, import trong Node an toàn):
- `step-card.js` — thẻ "Bước k/N": `GESTURE_BY_TYPE` (11 loại: chon tap, cha rub, thai drag-cut, cham tap, lua tap-zone, rot
  hold, dap tap-swipe, xoay circle, got swipe-down, lac shake, bay drag), `STEP_CARD_AUTO_MS` 1.100, `stepVerb(label)`,
  `stepProgress(cook, stepId?)` → `{ index, total, done, grades }` (N = số bước trên Thớt + 1 cho bước Chọn), `stepCardModel(step,
  { index, total, data, recipe, cook })` → `{ ribbon: 'Bước k/N', verb, ingId, propId, gesture, hint, type, label, index, total }`,
  `PROP_BY_SKIN`, `createStepCard(model, { full = true, onStart, autoMs, reduced, stage })` → `{ el, start(), hold(on), destroy(),
  full, model, started, held, waiting }`. Bản đầy đủ `div.g-step-card[step-hint]` phủ `.k-stage-wrap`, có tay mẫu
  `[step-card-demo][data-gesture]` và nút `[step-card-go]` "Chạm để bắt đầu"; tự vào bước sau 1,1 s hoặc chạm ở đâu cũng vào ngay
  (click ma bị nuốt, `guardNextClick`); `hold(true)` dừng tự chạy (hướng dẫn lần đầu). Bản gọn `[step-card-mini]` (từ lần nấu thứ
  `HINT_HIDE_AFTER_COOKS` = 3): không chờ, ruy băng chuyển vào `.mg-head` rồi tự gỡ sau 1,3 s (0,9 s khi giảm chuyển động).
- `stamp.js` — con dấu kết quả bước: `gradeKey(score)` → `hoan_hao|tot|dat|hong` (theo `BALANCE.stepLabels`), `gradeText`,
  `createStamp({ score, label, note })` → `[step-result][data-score][data-grade]`, `playStamp(el, { vfx, sound, reduced, shake,
  starTo })` (1,6 → 1, xoay −8°, 220 ms, dừng hình 60 ms; Hoàn hảo 10–14 hạt vàng và sao bay về chấm bước; Tốt 4 hạt; Hỏng khói
  xám, rung 4px; giảm chuyển động: hiện bằng độ mờ 150 ms), `showStepResult(stage, {…})` → `{ stamp, react, played, holdMs }`
  (gắn dấu + Dì Sáu vào `.mg-fx`), `stageFx`, `RESULT_HOLD_MS` 700 / `RESULT_HOLD_MS_REDUCED` 500.
- `disau-react.js` — `createDiSauReact({ key, text, reduced, rand, data })` → `[disau-react][data-grade]` (mặt 48px + bong bóng ở
  góc trên-phải, không che vùng chơi), `reactLine(key, rand, data)` lấy `DIALOGUE.diSau.stepReact[key]` (mỗi hạng 3–5 câu tự viết;
  tránh kiểu câu "để dì sửa giùm"), `MOOD_BY_KEY`. Góp ý theo loại thao tác: `DIALOGUE.diSau.typeTips[type]`, ghép
  `${label} ${typeTips[type]}` trong `dishComment.byType`.
- `dish-reveal.js` — màn ra món: `REVEAL_MS` 2.200, `REVEAL_MS_REDUCED` 1.400 (quyết định Q6), `revealMs(reduced)`, `starsOf`,
  `revealPlan(dish, { reduced })` → `{ stars, beats: [{at, kind}], totalMs }`, `createDishReveal({ dish, recipe, name, mood,
  comment, lvUpText, data, reduced, vfx, sound, onClose })` → `{ el, plan, play(), finish(), close(), destroy() }`. `el =
  [dish-reveal][data-grade][data-q]` ghi giá trị cuối ngay (chỉ chữ hiển thị mới đếm dần — giữ `sheetSettled`), có `.k-bubble`;
  tia sáng xoay, món nảy (easeOutBack), huy hiệu hạng rơi, % đếm 700 ms có `tick`, sao cách 120 ms, ruy băng "Không tì vết", pháo
  giấy khi lên cấp thạo món. Chạm (pointerdown) = đóng ngay.

**Màn Bếp** (`screens/kitchen.js`, `css/kitchen.css`; luồng thiết kế M5 mục 1.8):
1. Thớt gỗ lớn: mỗi nguyên liệu là hình 64–72px đổi theo hình trạng thái (`boardStates`); mỗi bước là **huy hiệu tròn** có biểu
   tượng thao tác (`stepBadge(step)` → `{ kind: 'icon'|'glyph'|'prop', id, state? }`), chữ trạng thái 13px dưới tên
   (`stepStatus(s, byId)` → "Tốt · 85" | "Tự làm · 80" | "Sau: X" | "Sau n bước" | "Chạm để làm" | "Chọn cách"). Giữ lớp móc
   `.k-step` (`.is-available|.is-locked|.is-done.grade-<key>|.is-critical|.has-method`), `.k-step-st`, `data-step-id`, `data-type`.
   Bảng chọn cách sơ chế là 3 thẻ hình (`method-<id>`, `.k-method-art`).
2. Chạm bước → thẻ "Bước k/N" (đầy đủ khi món nấu dưới 3 lần, `ui.layerKind = 'card'`) → dựng plugin với `ctx` mở rộng.
3. Có kết quả: `submitStep` ngay (lưu tức thì), **giữ sân khấu khoảng 700 ms** (500 ms khi giảm chuyển động) cho con dấu, dừng
   hình, Dì Sáu phản ứng (`.k-stage-wrap.is-result` thôi nhận chạm), rồi `closeLayer()`, `render()`, `criticalPrompt` nếu bước chí
   mạng Hỏng. Bước Chọn và Tự làm vẫn hiện nhãn ở `.k-flash-host` (`FLASH_MS` 1.600 / 1.200).
4. Ra món: `createDishReveal` trên `.k-pop[data-kind="reveal"]`, tự đóng sau `plan.totalMs`; nấu thử gọi `onDone` sau
   `plan.totalMs + 150`.
5. Export: `HINT_MS` (= 1.100), `REVEAL_MS`, `REVEAL_MS_REDUCED`, `HINT_HIDE_AFTER_COOKS` 3, `TAP_GUARD_MS`, `FLASH_MS`,
   `FLASH_MS_REDUCED`, `TASTING_PAR_MUL`, `waitLevel`, `waitRatio`, `moodForGrade`, `dishComment`, `stepBadge`, `stepStatus`.
   `tourSpot()` trả thêm **`'card-<loại>'`** khi thẻ đầy đủ đang chờ chạm (mọi loại, kể cả thai, lua…); `busy()` true cả khi
   con dấu đang hiện; `guideHold(true)` với thẻ đang chờ thì `card.hold(true)` (không đóng lớp như với sân khấu). Bếp gửi phản hồi
   tức thì của chính nó bằng `app.toast(text, { now: true })`.

**Chế độ tập trung khi nấu** (quyết định Q1; `screens/service.js`, `css/game.css`): `FOCUS_MAX_H = 760`. Khi tab Bếp đang nấu
(bước Chọn, Thớt hoặc sân khấu một bước — bếp báo qua `onFocus(want)` **trước khi** dựng plugin, vì plugin đo khung lúc dựng) và
`.service-screen` cao dưới 760px: bật `.service-screen.is-focus` và `.overlay-root.is-cook-focus`. Lúc đó `.street` ẩn hẳn
(`display: none`), `.progress4` ở lại bố cục ngay dưới dây phiếu nhưng cao 0, `visibility: hidden` (bước tour chỉ vào nó tự bỏ
qua); dây phiếu (màu chờ) vẫn hiện; chồng thông báo dời lên sát HUD. Thông báo mới chờ tới khi thoát (trừ `{ now: true }`), khi
thoát hiện tối đa 3 thông báo thường và 2 thẻ Mẹo nghề; rời màn ca bỏ hết thông báo đang chờ; `toastLimit` luôn ≥ 1. Panel Bếp
tăng từ khoảng 286–318px lên khoảng 404–437px ở 320×568 và 360×600.

**Gọi món kiểu mới** (bản mẫu Đợt 0, chưa ráp vào Quầy — Đợt 2): `components/order-bubble.js` (bong bóng hình món + huy hiệu ×n,
ghi chú bằng hình), `menu-board.js` (bảng gỗ, món hiếm "★ còn n", băng "HẾT"), `order-pad.js` và `order-sheet.js` (bảng số lượng
và ghi chú có hình, phiếu giấy, "Đọc lại" sáng từng dòng, dấu ĐÃ CHỐT rồi phiếu bay lên dây), `note-icons.js`, `css/counter.css`;
giữ đúng testid của Quầy (`menu-item-<id>`, `order-sheet`, `qty-*`, `note-chip-*`, `add-line`, `order-line-<i>`, `readback`,
`confirm-order`, `speech-bubble[data-request]`). Test `tests/unit/m5-order-ui.test.mjs`.

**Phòng mẫu** (`mau.html`, `mau/mau.js`, `mau/mau.css`): trang duyệt giao diện 4 thẻ (Hình, Gọi món, Bếp: Thái, Ra món), công tắc
Giảm chuyển động, Âm thanh, Khung thấp; app "hộp cát" (bus, audio, vfx riêng), không đăng ký service worker, không ghi bản lưu của
game, không nằm trong PRECACHE. Test từ cấm quét cả `mau.html` và `mau/`. E2E `tests/e2e/mau.e2e.mjs`.

## 14. data-testid bắt buộc (cho e2e)

- Màn title: `shop-name-input`, `start-button`. Màn prep: `open-shift`.
- Ca bán: `tab-counter`, `tab-kitchen`, `hud-wallet`, `hud-day`, `progress-4` (có `data-stage`).
- Quầy: `speech-bubble` (có `data-request` = JSON yêu cầu thật, để test tự động), `menu-item-<recipeId>`, `note-chip-<noteId>`, `qty-plus`, `qty-minus`, `add-line`, `order-line-<i>`, `readback`, `confirm-order`, `numpad-<0..9>`, `numpad-clear`, `report-total`, `drawer-<mệnh giá>`, `tray-<mệnh giá>`, `given-cash` (có `data-amount`), `give-change`, `qr-status` (có `data-arrived`), `qr-confirm`, `clip-ticket`, `receipt`.
- Bếp: `ticket-<ticketId>`, `cook-line-<i>`, `shelf-<ingredientId>`, `chon-done`, `board-step-<stepId>`, `method-<methodId>`, `finish-dish`, `auto-step`, `retry-step`, `abandon-dish`, `minigame-stage` (có `data-type`), các phần tử mini-game: `thai-guide-<i>` (có `data-x`), `lua-needle` (có `data-v`), `lua-zone` (có `data-a`, `data-b`), `lua-lift`, `rot-level` (có `data-v`), `rot-zone`, `rot-pour`, `cha-spot-<i>`, `cham-target`, `cham-bottle-<id>`, `cham-done`, `cham-pad`.
- Kết quả: `serve-ticket`, `score-sheet`, `complaint-apology-<i>`, `complaint-remake`, `complaint-refund`. Tổng kết: `summary`, `summary-profit`, `next-day`.
- Bổ sung thực tế (dùng trong e2e `tests/e2e/helpers.mjs`):
  - Chung: `screen-title`, `screen-prep`, `screen-service`, `prep-day`, `prep-wallet`, `hud-time`, `queue`, `queue-<customerId>`, `ticket-rail`, `rail-ticket-<ticketId>` (dây phiếu chung; `ticket-<id>` là thẻ phiếu trong Bếp, có `data-wait` = green|yellow|red, `data-status`), `panel-counter`, `panel-kitchen`, `modal`, `tip-card`. `progress-4` có thêm `data-customer`.
  - Quầy: `counter-panel` (có `data-stage`), `order-sheet`, `qty-value`, `order-line-remove-<i>`, `caught-list`, `numpad-display` (`data-amount`), `amount-due`, `change-hint` (`data-amount`), `tray` (`data-amount`), `drawer-<mệnh giá>` có `data-count`, `no-change-modal`, `no-change-<xin_tien_le|moi_qr|lam_tron>`, `qr-reject`, `rail-full`, `complaint-modal`.
  - Bếp: `kitchen`, `recipe-card`, `board`, `step-sheet`, `step-start`, `step-hint`, `step-result` (`data-score`), `critical-prompt`, `confirm-ok`, `confirm-cancel`, `dish-reveal` (`data-grade`, `data-q`), `dish-result`, `serve-ticket` có `data-ticket-id`; `board-step-<id>` có class `is-available`/`is-done` và `data-step-id`.
  - Mini-game: `chon-basket`, `cha-area`, `cha-progress`, `cha-spot-<i>` (`data-clean`), `thai-board`, `thai-guide-<i>` (`data-x` tính từ mép trái `minigame-stage`), `cham-pan`, `cham-target` (`data-n`), `cham-pad` (`data-n`, `data-t`), `cham-bottle-<id>` (`data-target`, `data-count`), `rot-done`, `mg-time`.
  - Tổng kết: `summary-drawer-diff`, `summary-stars` (nhãn "Sao ca này"), `summary-advice`, `summary-reviews`, `summary-tip`, `summary-tomorrow` (dòng "Ngày mai …", sao trung bình 30 lượt gần nhất).
- M2:
  - Chuẩn bị: `open-shop`, `open-quests`, `open-checkin`, `open-mail` (mỗi ô có `data-dot` = số chấm đỏ), `prep-spoons`, `chain-card` (chuỗi chính; chuỗi khác `chain-card-<chainId>`), `chain-claim-<chainId>` (gộp) / `chain-claim-<chainId>-<bước>`, `dream-card`, `stage-up-card`, `event-card` (`data-phase`), `open-event`, `day-event-card`, `day-event-choice-<choiceId>`, `coupon-card`, `use-coupon`, `rewind-note`, `stage-up-modal`, `stage-up-open`, `stage-up-later`, `mail-toast`.
  - Điểm danh: `checkin-popup`, `checkin-claim`, `checkin-close`, `checkin-slot-<i>` (`data-claimed`), `checkin-note`.
  - Chợ Công Thức: `screen-shop`, `shop-tab-recipes`, `shop-tab-upgrades`, `shop-tab-spoons`, `shop-item-<recipeId>` (class `is-owned`), `shop-buy-<recipeId>`, `shop-trial-<recipeId>`, `shop-teaser-<id>`, `shop-event-<recipeId>`, `upgrade-<id>`, `upgrade-buy-<id>`, `parasol-<id>` (nút mua/dùng; `mac_dinh` = dù cũ), `parasol-card-<id>`, `parasol-preview-<id>` (chạm để xem thử màu trên hình xe; đang xem thử hiện `parasol-previewing`), `deco-use-<id>`, `cart-view` (`data-umbrella`), `bag`; xác nhận mua dùng `confirm-ok`/`confirm-cancel`.
  - Nấu thử: `screen-tasting`, `tasting-label`, `tasting-exit`, `tasting-result` (`data-grade`), `tasting-buy`, `tasting-back` (bếp dùng lại testid của mục Bếp).
  - Việc hôm nay: `screen-quests`, `quest-<i>` (`data-id`, `data-progress`, `data-target`), `quest-claim-<i>`, `quest-reroll-<i>`, `daily-chest` (nút), `daily-chest-card`.
  - Hộp thư: `screen-mail`, `mail-item-<id>` (`data-kind`), `mail-claim-<id>`, `mail-claim-all`, `mail-list`.
  - Sự kiện: `screen-event`, `event-tem` (`data-amount`), `event-recipe-<recipeId>`, `event-checkin-claim`, `event-quest-<id>`, `event-quest-claim-<id>`, `event-chain-step`, `event-exchange-<id>`, `event-exchange-item-<id>`.
  - Lên chặng: `screen-stage-up` (`data-eligible`), `stage-up-locked`, `stage-conditions`, `stage-cond-<id>`, `post-goals`.
  - Chung: `meta-back`, `meta-wallet`, `meta-spoons`. Trong ca: `quest-toast`, `chain-toast`, `tem-toast`, `day-event-toast`, `event-quest-toast`. Tổng kết: `summary-quests`, `summary-chain`, `summary-event-chain`, `summary-event`, `summary-day-event`.
  - M3 nền tảng: Chuẩn bị `open-settings`, `backup-reminder`; Chuẩn bị/Tổng kết `update-ready`, `update-reload`; màn mở đầu `title-import`.
    Cài đặt: `screen-settings`, `settings-sound|settings-assist|settings-play|settings-backup|settings-install|settings-info` (các mục), `setting-<khóa>` (công tắc: sound, vibrate, tips, reducedMotion, assistCash, assistMotion), `setting-volume` (range 0–100), `setting-volume-value`, `setting-incident-<nhieu|vua|it>` (`aria-checked`), `backup-last`, `backup-copy`, `backup-download`, `backup-import`, `archive-list`, `archive-<ms>`, `archive-restore-<ms>`, `install-app`, `install-state`, `install-hint` (+`install-hint-ok`), `offline-state`, `app-version`, `open-about`, `about-modal` (+`about-close`), `reset-game`.
    Hộp thoại: `backup-code-modal` (`backup-code`, `backup-copy-status`, `backup-copy-again`, `backup-done`), `backup-import-modal` (`backup-input`, `backup-file`, `backup-file-pick`, `backup-check`, `backup-error`, `backup-preview` có `data-shop/day/wallet/chang/recipes`, `backup-change`, `backup-confirm`, `backup-cancel`), `reset-step1` (`reset-next`), `reset-step2` (`reset-confirm`), `reset-cancel`; thông báo `replace-done`, `replace-error`, `backup-download-toast`.
  - Vòng soát lỗi M2: `tab-lock`, `tab-lock-reload` (tab cũ tự khóa), `devnow-banner` (giờ giả), `prep-talk`, `event-card-dot`, `event-pending`, `event-auto-toast`, `event-grace-chain` (màn sự kiện, ân hạn), `chain-assist-<chainId>` (bước chuỗi đếm mức thay thế khi bật Hỗ trợ thao tác), `shop-trial-note-<recipeId>` (đang nấu thử dở món khác).
- Vòng soát lỗi M3: `save-warning` (`data-kind` = chan|loi_ghi|loi_cat), `save-warning-backup`, `save-warning-modal`, `save-warning-copy`, `save-warning-later`, `save-warning-toast`, `save-notice`, `save-notice-ok`, `version-toast`; Cài đặt `broken-archives`; nhập mã `backup-newer` (mã từ bản mới hơn; nút `backup-confirm` đổi chữ "Vẫn dùng bản này"); hộp mã sao lưu `backup-copy-status` có `data-copied`; Quầy `tray-empty`, `change-over` (đang thối dư, ngày ≤ 3 hoặc Hỗ trợ tính tiền); Bếp `shelf-qty-<id>` (huy hiệu ×n trên ô đã chọn); phiếu chấm `score-sheet-tag-quay`, `score-sheet-tag-bep`; Chuẩn bị `prep-rating` (kèm dòng "30 lượt gần nhất"/"tạm tính"), `prep-wallet` có `data-amount` (từ 1 triệu ghi gọn "1,16tr"), `prep-incident-bonus` có `data-kind` = khach|danh_tieng.
- M3 nội dung:
  - Chuẩn bị: `prep-nav` (lưới 7 ô, mỗi ô có `data-dot`): `open-shop`, `open-quests`, `open-checkin`, `open-mail`, `open-recipe-book`, `open-notebook`, `open-settings`; `prep-forecast`, `prep-incident-bonus`, `prep-debts`, `prep-dish-<recipeId>`, `prep-tip`, `prep-tip-notebook`. Màn mở đầu: `title-tip`. Cài đặt: `settings-open-notebook`, `settings-open-recipe-book`.
  - Tình huống trong ca: `incident-modal` (phần tử `.incident` có `data-incident`), `incident-text`, `incident-choice-<choiceId>` (`data-safe`, `data-choice`), `incident-result` (`data-choice`), `incident-effects`, `incident-tip`, `incident-ok`; `debt-toast`; `score-sheet-incident`; `screen-service` có `data-t`. Tổng kết: `summary-incident` (`data-incident`, `data-choice`), `summary-debt`, `summary-notebook`.
  - Sổ tay nghề: `screen-notebook`, `notebook-progress` (`data-unlocked`, `data-total`), `notebook-featured`, `notebook-tab-<nhóm>` (`data-dot`), `notebook-group-<nhóm>` (`data-unlocked`, `data-total`, `data-claimed`), `notebook-claim-<nhóm>`, `notebook-claimed-<nhóm>`, `notebook-tip-<tipId>` (`data-unlocked`), `notebook-toast`.
  - Sổ công thức: `screen-recipe-book`, `recipe-book-tab-mon`, `recipe-book-tab-tu`, `book-recipe-<recipeId>` (`data-status` = owned|shop|event|teaser, `data-cooks`, `data-best`, `data-level`, `data-flawless`), `book-open-<recipeId>`, `book-cooks-<id>`, `book-best-<id>`, `book-level-<id>`, `book-flawless-<id>`; hộp thoại `recipe-detail` (`recipe-detail-ing-<ingredientId>`, `recipe-detail-step-<stepId>`, `recipe-detail-close`); `dialect-list`, `dialect-<synonymId>`.
- M4 bước 1–5 (tip, sự kiện, mục 19–20; e2e `m4-tip-events`, mục 23): phiếu chấm `score-sheet-tip` (`data-tip`: 5000 "Tip: +5.000đ" | 0 "Tip 0 (hóa đơn dưới 20.000đ)" / "Tip 0 (khách chưa trả tiền thật)"; khách dưới 5 sao không có dòng tip); Chuẩn bị `day-event-card` (`data-event`, `data-kind` = tot|chon|xau), `day-event-warn`, `day-choice-toast`; ca bán `event-warn-toast`, `event-fine-toast`, `queue-order-tag`, `qr-speaker-off`, `incident-hint-<choiceId>`, nhãn kết quả tình huống `.incident-fx` (`data-fx` = money|gain|capped|cost|fine|spend|spared|refund|rep|rare|fragment|spoons|wait|bonus|debt|star|none); Tổng kết `summary-tip-rule`, `summary-event-money` (mỗi `li` có `data-event`, `data-money`).
- M4 bước 6 (hàng hiếm, mục 21):
  - Chuẩn bị: `stall-card` (`data-state` = open|pending|done|closed|locked|early, `data-stall`; `stall-title` ghi trạng thái: tên phiên đang mở / "Đã ghé …" / "Chưa có phiên đang mở" / "Tạm khóa" / "Chưa tới ngày mở"), `open-market` (vào gánh hàng / lựa tiếp), `rare-stock-card`, `rare-stock-<ingId>` (`data-n`), `rare-fragments-<recipeId>` (`data-n`, `data-status` = owned|ready|collecting|locked), `rare-taste-<recipeId>` (nấu thử khi đủ mảnh), `basket-luck` (`data-pity`, `data-sure`, `data-frag-sure`, `data-all` = lý do 100% nguyên liệu), `rare-left-<recipeId>` (thực đơn hôm nay: "★ còn n phần"). Túi đồ (Chợ Công Thức): `bag-basket` (tỉ lệ Giỏ chợ công khai). Bếp: thẻ công thức `card-left-<ingId>` (" · kho còn n" của nguyên liệu hiếm, luôn thấy kể cả khi ô kệ nằm dưới thanh Xong).
  - Màn Gánh hàng quê (`market`): `screen-market`, `market-intro` (`data-stall`), `stall-start`, `stall-locked`, `market-stage` (chứa `minigame-stage` loại chon; ô kệ `shelf-<ingId>`, `chon-done`), `market-result` (`data-score`, `data-got`, `data-fragment`), `market-got-<ingId>`, `market-fragment`, `market-tip`, `market-done`, `market-back`.
  - Ca bán: `stranger-badge` (dấu ★ trên mặt khách lạ ở hàng chờ), `score-sheet-stranger`; quầy `rare-left-<recipeId>` (menu "★ còn n", `menu-item-<id>` có `data-left`), bếp `shelf-left-<ingId>` ("còn n" trên ô kệ nguyên liệu hiếm); phàn nàn `complaint-remake-blocked` (nút `complaint-remake` bị khóa khi hết hàng hiếm).
  - Tổng kết `summary-rare`; Sổ công thức `book-recipe-<id>` có `data-status` = hiem, `book-rare-<id>` (`data-n`, `data-ready`), `book-taste-<id>`; Nấu thử món hiếm `tasting-unlocked`, `tasting-not-yet`, `tasting-retry`; Túi đồ `bag-rare-<ingId>`.
- 0.4.1 hướng dẫn lần đầu và nút "?" (mục 29): `tour`, `tour-hole`, `tour-bubble` (`data-tour`, `data-step`, `data-target`, `data-span`, `data-side`), `tour-count`, `tour-title`, `tour-text`, `tour-skip`, `tour-next`; `help-button`, `help-sheet`, `help-replay`, `help-how`, `how-to-play`, `how-card-<id>`, `help-back`, `help-close`, `help-reset`, `help-reset-text`, `help-reset-confirm`, `help-reset-cancel`, `help-reset-done`; Cài đặt `setting-tour`; đích của tour: `hud`, `prep-stats`, `title-talk`, `qty-row`, `note-block`.
- M5 Đợt 1 (bản 0.5.0, mục 13.3 và 31). **Giữ nguyên** mọi testid và `data-*` đo đạc cũ (`data-x`, `data-v`, `data-a/b`, `data-n`, `data-score`, `data-grade`, `data-q`, `data-step-id`, `data-ticket-id`, `data-amount`…) và các lớp "móc" mà e2e/tour bám (`.k-layer`, `.k-main[data-view]`, `.k-step(.is-available/.is-done/.has-method)`, `.k-step-st`, `.k-ticket(.is-open/.is-ready)`, `.k-line`, `.chon-cell`, `.chon-in`, `.chon-msg`, `.chon-shelf`, `.mg-foot/.mg-head/.mg-sub`, `.cha-spot`, `.thai-food`, `.cham-bottle`, `.k-stage-wrap`, `.k-bubble`). Mới:
  - Thẻ bước: `step-hint` (thẻ đầy đủ `.g-step-card`, chạm ở đâu cũng vào bước), `step-card-demo` (`data-gesture`: tap | rub | drag-cut | tap-zone | hold | tap-swipe | circle | swipe-down | shake | drag), `step-card-go` ("Chạm để bắt đầu"), `step-card-mini` (ruy băng gọn, `aria-hidden`, không nhận chạm). Kết quả bước: `step-result` thêm `data-grade` (`hoan_hao|tot|dat|hong`; bước trên Thớt nằm trong `.mg-fx` của sân khấu khoảng 700 ms rồi mất cùng lớp; bước Chọn/Tự làm vẫn ở `.k-flash-host`), `disau-react` (`data-grade`). Ra món: `dish-reveal` (`data-grade`, `data-q` ghi giá trị cuối ngay, `.k-bubble`) trong `.k-pop[data-kind="reveal"]`. Thớt: `board-step-<id>` có thêm `data-type`; `.k-ing[data-ing][data-state]` (hình trạng thái); `method-<id>` có `data-method`.
  - Đập trứng: `dap-pan`; `dap-egg` (`data-state` = nguyen|nut|xong, `data-i`); `dap-meter` (`data-a`, `data-b` = vùng xanh đã nhân hệ số); `dap-needle` (`data-v`, lớp `.is-in`); `dap-count` (`data-v`, `data-n`, chữ "Trứng k/n").
  - Khuấy: `xoay-bowl` (tâm và bán kính lấy bằng boundingBox; mặt hỗn hợp ≈ 0,38–0,40 cạnh, bỏ điểm trong 0,06 cạnh quanh tâm), `xoay-progress` (`data-v` số vòng 2 chữ số, `data-n` mục tiêu; chữ "Vòng k/n"), `xoay-speed` (`data-v`, `data-max`).
  - Gọt: `got-fruit`; `got-band-<i>` (`data-done` 0..1, `data-lo`, `data-hi` — dải là cột cao bằng quả); `got-count` (`data-v`, `data-n`); `got-done` (bật sau nhát đầu; không cần bấm, đủ dải tự xong).
  - Lắc: `lac-area` (vùng kéo), `lac-shaker` (hộp đứng yên, hình bên trong `.lac-move` theo ngón), `lac-count` (`data-v`, `data-n`; bước có `maxRatio` thêm `data-ok` = ⌊K × maxRatio⌋ và `data-zone` = thieu | du | qua), `lac-bar` (chỉ bước có `maxRatio`: `data-v`, `data-n`, `data-ok`, `data-max`).
  - Thả đá: `bay-target` (vòng đích, `pointer-events: none` — đừng kiểm `elementFromPoint` trên nó), `bay-item-<i>` (`data-placed` 0|1, `role=button`, cạnh 46–52px), `bay-count` (chỉ chứa "k/n", `data-v`, `data-n`; nhãn "Đá" nằm ngoài), `bay-done` (bật khi đã thả ≥ 1; `.is-ready` khi đủ).
  - Cách giải tự động (helpers e2e): dap — chờ `data-v` của kim gần (a + b)/2, nhấn tâm `dap-egg`, kéo xuống 80px rồi thả, chờ quả kế (`data-i` tăng); xoay — nhấn ở (tâm + 0,32·cạnh), vẽ 24 điểm mỗi vòng, cách 12 ms (≈ 1 vòng/giây), tổng round((n + 0,3)·24) điểm; got — với mỗi dải nhấn (giữa, đỉnh + 2) kéo thẳng tới (giữa, đáy − 2) qua ≥ 4 bước; lac — nhấn giữa `lac-shaker`, kéo ±70px, chờ 24 ms mỗi lần, tới khi `data-v` ≥ `data-n`; `lac-count` có `data-ok` (bước có `maxRatio`) thì nhấc tay ngay (trò xong sau khoảng 220 ms; kéo quá `data-ok` là lắc quá tay), không có thì trò tự xong; bay — kéo `bay-item-i` (≥ 8 bước) tới tâm `bay-target` lệch ±8px, rồi bấm `bay-done`.
  - Đích của 5 tour thẻ bước (mục 29): `step-card-demo`, `step-card-go`.

## 15. Hệ thống meta M2 (lõi + dữ liệu)

Nguyên tắc chung:
- Lõi thuần như mục 1: không DOM, không đọc đồng hồ, không `Math.random`. Ngẫu nhiên qua `rng.js` với hạt giống `seedFrom(state.seed, …)` nên tải lại trang không đổi kết quả. Dữ liệu đọc qua `ctx.data` (trừ `events.js` có bảng `EVENTS` mặc định cho `isEventActive(eventId, nowMs)`).
- **Thời gian**: mọi hàm theo ngày thật nhận `nowInfo = clock.makeNowInfo(state, deviceNow)` = `{ now, trusted: max(giờ máy, state.clock.maxSeen), rewind, dayKey: dayKeyVN(trusted) }`. Ngày đổi lúc 04:00 giờ Việt Nam. `rewind = true` (giờ máy lùi > 10 phút) → **khóa nhận quà theo ngày** (điểm danh thường/sự kiện, Rương ngày, quà lễ trong Hộp thư), không đẩy quà lễ/quà đời thường mới; game vẫn chơi được. Chuỗi hiển thị nhắc nhẹ: `STRINGS.meta.rewindLocked`. Sự kiện hết hạn theo `trusted`.
- **Nhận thưởng** (nhiệm vụ, Rương, chuỗi kể cả chuỗi sự kiện, thư có quà) bị từ chối khi đang trong ca (`reason: 'dang_ban'`) để giữ bất biến ví của ca. Không bị chặn: điểm danh, việc sự kiện, điểm danh sự kiện, Quầy đổi Tem (chỉ trao Tem, Muỗng Vàng, đồ thẩm mỹ). Mua món/nâng cấp và nấu thử cũng bị chặn trong ca.
- Mã lý do chung (`reason`) → câu hiển thị ở `STRINGS.reasons`: `da_nhan, lui_gio, dang_ban, thieu_tien, thieu_muong, thieu_tem, chua_mo, chua_xong, da_co, het_luot, het_han, khong_co, da_nau_thu, het_su_kien` (thêm `trung_id`, `tran` của Hộp thư).
- **Phần thưởng (Reward)** — lược đồ chung ở `src/data/checkin.js`: `{ money, incomeMul, gold, rep, items{id:n}, upgrade, fallback, cosmetic, title, recipe, tem, tipId, unlock, label }`. `incomeMul` là bội "thu nhập tham chiếu một ca" (`BALANCE.refIncomeTable`, `refIncomeFor(ctx, day)` của `state.js`: 20k ngày 1–2, 35k 3–4, 65k 5–6, 85k 7–8, 100k từ 9), quy ra tiền lúc trao, làm tròn lên bội 1.000đ. Nâng cấp/hiện vật vĩnh viễn đã có → dùng `fallback` (quy đổi, `converted: true`).

### 15.1 State thêm ở version 2 (`defaultMeta()`)
```js
items: { phieu_cho_som: 0, bat_che_mua: 0 },          // hiện vật (ITEMS: consumable / permanent)
cosmetics: { owned: [id], equipped: { du, bien, trang_tri } },   // du = màu dù áp lên hình xe đẩy
titles: [id], unlocks: [id],                            // 'chu_xe_moi_toanh', 'chu_xe_dau_hem' ; 'the_quan_coc'
prep: { day, coupon, dayEventChoice },                  // lựa chọn ở màn Chuẩn bị cho ca state.day
checkin: { round /*1 = Tuần Khai Trương*/, next /*0..6*/, lastDay /*dayKey*/, total },
daily: { dayKey, gameDay, quests: [{ id, group, target, progress, claimed, recipeIds? }], prevIds, rerolls, chestClaimed },
                                                        // recipeIds: món hợp lệ chốt lúc bốc (việc "Nấu n phần món vừa mua")
mail: { list: [Mail], pushed: [id], monthly: { 'YYYY-MM': { count, everyday, value } }, seenVersion, pendingReviews: [] },
chains: { [chainId]: { step, progress, done, claimable: [stepIndex], since } },
shop: { tried: [recipeId] },                            // đã nấu thử miễn phí
eventRecipes: { [recipeId]: { eventId, label, day } },  // món sự kiện đã nhận, nhãn "Tri ân 20/11 · 2026"
tasting: null | { recipeId, result, shift },            // phiên nấu thử (tách biệt state.shift)
events: { [eventId]: { tem, temTotal, temDay, temToday, days: [dayKey], quests: { dayKey, list }, checkin: { next, lastDay }, exchanged: { itemId: n }, settled } },
realDays: { first, last, count },                       // số ngày thật đã mở game
progression: { stageUpReady, stageUpSeen, records: { bestProfit, mostFiveStars, longestStreak }, cur: { fiveStars } },
track: { rbCustomer, rbFirst }                          // lần đọc lại đầu của khách đang ở quầy
// stats thêm: fiveStarCustomers, goodDishes, excellentDishes, perfectThai, perfectLua, changeOptimal, readbackClean,
//   fakeQrDetected, recipesBought, upgradesBought, questsClaimed, checkins, mailClaimed, tastings, temEarned
```
`Mail = { id, kind, title, body, reward /*đã quy đổi*/, createdDay, expiresDay, claimed, read }`, `kind`: `chao_mung | phien_ban | den_bu | le | doi_thuong | nhiem_vu | review | su_kien | moc`.

### 15.2 Bus và tín hiệu — `meta.js`, `stats.js`
```js
export function attachMeta(bus, getState, ctx) → detach      // bus.on('*'); ctx.now() (tùy chọn) → nowInfo cho phần theo ngày thật
export function handleMetaEvent(state, type, payload, ctx, nowInfo?) → signals   // thuần, dùng trong test
export function refreshMeta(state, nowInfo, ctx) → { questsRolled, newMail: [id mọi thư mới đẩy trong lần gọi], chains, stageUp, eventQuestsAuto: [{eventId, tem, dayKey}] }
   // gọi khi mở game / vào màn Chuẩn bị; tự gọi khi 'shift.started': ghi ngày thật, đổi nhiệm vụ (quên nhận → Hộp thư),
   // đẩy thư đến hạn, nhiệm vụ sự kiện (việc hôm trước xong chưa nhận → tự cộng Tem), chuỗi, rồi mới tất toán Tem dư
   // (Tem thưởng chuỗi sự kiện chưa nhận được cộng vào phần dư trước khi đổi), lên chặng.
   // Chơi qua mốc 04:00 giữa ca: tiến độ tự sang bộ Việc hôm nay và việc sự kiện của ngày mới (ngày mới tính là đã chơi trong mùa).
// stats.js
export const SIGNALS ; export function signalsFor(state, type, payload) → [{ sig, n, recipeId? }]
export function isRecentRecipe(state, recipeId, days = 3) ; export function lastHistory(state, day?)
```
Tín hiệu dịch từ sự kiện miền (payload M1 giữ nguyên; thông tin thêm đọc từ state lúc phát: `shift.counter.changeAttempts/changeDue`, `shift.cook.result`, `shift.counterStreak`, `history[last]`):
`served` (customer.rated) · `five_star` · `good_rating` (khách từ 4 sao: tín hiệu thay thế cho `five_star` khi bật Hỗ trợ thao tác) · `change_correct` / `change_wrong` (lần đưa đầu, cần thối > 0) · `change_optimal` · `readback_clean` (lần đọc lại đầu của khách không lỗi) · `qr_ok` · `fake_detected` (tự từ chối ảnh giả hoặc Loa chặn) · `perfect_step` / `perfect_thai` / `perfect_lua` (≥ 90, không Tự làm) · `dish_good` / `dish_excellent` / `dish_clean` (không lỗi nguyên liệu) · `dish_new_recipe` (món mua trong 3 ngày game, n = số phần) · `dish_portions` (mọi món, n = số phần, kèm `recipeId`) · `shift_no_loss` (không tính khách dùng ảnh chuyển khoản giả bị bắt: `summary.scamCaught`, lưu cả trong `history[]`) · `revenue` (n = doanh thu ca). `handleMetaEvent` chuyển `recipeId` của tín hiệu cho `applyQuestSignal(state, sig, n, ctx, { recipeId })`. Kỷ lục ca (`progression.records`) cập nhật ở `ticket.clipped` (không ghi khi bật Hỗ trợ tính tiền) và `shift.ended`.
Sự kiện meta phát ra (UI dùng để thông báo; meta bỏ qua): `quest.progress {index,id,progress,target,done,justDone}` · `event.quest {eventId,id,progress,target,done,justDone}` · `quest.claimed` · `quest.chest` · `quest.rerolled` · `chain.progress` · `chain.step {chainId, stepIndex, done}` · `chain.claimed` · `mail.new {id, kind}` · `mail.claimed` · `checkin.claimed` · `tem.gained {eventId, n, today, cap}` · `stage.ready {chang}` · `recipe.gained {recipeId}` · `upgrade.gained {upgradeId}` · `recipe.tasted` · `cosmetic.bought`.

### 15.3 Điểm danh — `checkin.js` (dữ liệu `CHECKIN`)
```js
export function checkinStatus(state, nowInfo, ctx) → { round, roundName, next, slots: [{ index, reward, claimed, isNext }], canClaim, reason: null|'da_nhan'|'lui_gio', dayKey }
export function claimCheckin(state, nowInfo, ctx) → { ok, index, round, reward } | { ok: false, reason }
```
7 ô tích lũy, mỗi dayKey 1 ô, lỡ ngày không reset. Vòng 1 "Tuần Khai Trương" (theo de-xuat 9.2, can-bang 10.1): 10 Muỗng Vàng + viền biển xe · Phiếu Chợ Sớm · 10 Muỗng Vàng · Bạt che mưa (đã có → 20.000đ) · Phiếu Chợ Sớm ×2 · 15 Muỗng Vàng · Rương Khai Trương (20 Muỗng Vàng + 100.000đ + danh hiệu). Vòng sau: 0,3 · Phiếu Chợ Sớm · 10 Muỗng Vàng · 0,4 · Phiếu Chợ Sớm ×2 · 15 Muỗng Vàng · 30 Muỗng Vàng + 0,5 (số lẻ là bội thu nhập tham chiếu).

### 15.4 Việc hôm nay — `quests.js` (dữ liệu `QUESTS` 12 việc, `QUEST_GROUPS`, `QUEST_CONFIG`)
```js
export function rollDailyQuests(state, dayKey, ctx, exclude = []) → [entry]   // seedFrom(state.seed, dayKey, 'viec_hom_nay'); mỗi nhóm quay/bep/chat_luong 1 việc
export function ensureDaily(state, nowInfo, ctx) → { rolled, mailed: [mailId] }  // đổi ngày; không lặp hôm qua; lùi giờ thì giữ
export function questEligible(state, def, ctx) ; questTarget(state, def, ctx) ; questText(def, target) ; questDef(ctx, id)
export function questList(state, ctx) → { dayKey, quests: [{ index, id, group, groupName, text, progress, target, done, claimed, canClaim, reward }], chest: { available, claimed, reward }, reroll: { free, cost } }
export function applyQuestSignal(state, sig, n, ctx) → changes
export function claimQuest(state, indexOrId, nowInfo, ctx) ; claimDailyChest(state, nowInfo, ctx) ; rerollQuest(state, indexOrId, nowInfo, ctx)
```
Điều kiện (`cond`): `fromDayKey` (vd `qrFromDay`, `leaveFromDay`), `recentRecipeDays`. Chỉ tiêu `{ base }` hoặc `{ perCustomer, min, max, round }` × số khách dự kiến × 2 ca. `breakOn` cho việc "liên tiếp"; `assist`: không đếm khi bật Hỗ trợ tính tiền/thao tác (`questAssistBlocked`), và lúc bốc/đổi việc ưu tiên việc còn đếm được trong nhóm (bật Hỗ trợ thao tác thì không bốc "Tuyệt hảo", "Hoàn hảo ở bước Thái/Canh lửa"). "Nấu n phần món vừa mua" đếm tín hiệu `dish_portions` của các món chốt lúc bốc (`entry.recipeIds`; save cũ: tính theo `daily.gameDay`), nên chơi thêm ca trong ngày vẫn xong được. Thưởng mỗi việc 0,2 + 5 danh tiếng; Rương ngày (đủ 3 việc, khóa khi lùi giờ) 0,2 + 5 Muỗng Vàng. Đổi việc: 1 lần miễn phí/ngày, sau đó 5 Muỗng Vàng. Việc xong chưa nhận (và Rương chưa mở) lúc đổi ngày → thư `nv:<dayKey>:<id>` / `ruong:<dayKey>` hạn 7 ngày (loại thư "Việc chưa nhận"; lời thư ghi "Hôm qua…" khi cách 1 ngày, còn lại "Ngày 01/10…", mẫu `{when}`/`{When}`/`{day}` ở `MAIL_QUEST`, vd "Rương ngày hôm qua chưa mở", "Rương ngày 01/10 chưa mở"). Không có việc "tiêu tiền".

### 15.5 Hộp thư — `mail.js` (dữ liệu `MAIL_CONFIG, MAIL_WELCOME, MAIL_VERSIONS, MAIL_HOLIDAYS, MAIL_EVERYDAY, MAIL_LATE_REVIEW, MAIL_QUEST`)
```js
export function pushMail(state, mail, nowInfo, ctx, { compensation }?) → { ok, mail } | { ok: false, reason: 'trung_id'|'tran'|'khong_hop_le' }
export function refreshMail(state, nowInfo, ctx) → [id mới]      // chào mừng, phiên bản mới, quà lễ, quà đời thường, review muộn; dọn thư hết hạn
export function mailList(state, nowInfo) → [Mail + { hasReward, expired, daysLeft }] (mới nhất trước) ; mailBadge(state, nowInfo) → số chấm đỏ
export function claimMail(state, id, nowInfo, ctx) ; claimAllMail(state, nowInfo, ctx) → { ok, count, rewards, skipped } ; markMailRead(state, id)
export function purgeExpired(state, nowInfo) ; queueLateReviews(state, list, gameDay, nowInfo) ; compareVersion(a, b) ; ensureMail(state)
```
Mỗi id đẩy đúng 1 lần (`mail.pushed`, nhớ 1.000 id). Hạn 30 ngày (quà lễ 14, nhiệm vụ 7). Tối đa 100 thư: đầy thì bỏ thư cũ nhất đã nhận. Trần (ngoài quà đền bù/`compensation`): tối đa 2 quà lễ/mốc mỗi tháng, quà đời thường tối đa 2/tháng, tổng tiền quà lễ + mốc + đời thường + Tem dư sự kiện (`valueKinds` có `su_kien`) ≤ 3 lần thu nhập tham chiếu mỗi tháng; `mailValueRoom(state, nowInfo, ctx)` trả phần còn lại. `resolveReward` giữ `eventId` của phần thưởng Tem khi resolve lại (thư mang Tem). Quà lễ đẩy từ 04:00 ngày lễ trong `pushDays` ngày (20/10, 20/11, Tết Đinh Mùi 06/02/2027). Quà đời thường: từ ngày thật thứ 3, 10%/ngày (seed + dayKey), cần ≥ 5 đánh giá và sao TB ≥ 3,8, 0,3–0,6. Review muộn: `history[].lateReviews` → thư `review:<ngày game>:<customerId>` vào ngày thật hôm sau. Save mới không nhận thư phiên bản (chỉ ghi `seenVersion` = `MAIL_CONFIG.currentVersion`); save cũ nhận mọi thư có `version` > `seenVersion` và ≤ `currentVersion`: save v1 (`seenVersion` '0.1.0') nhận `phien_ban_0_2_0` và `phien_ban_0_4_0`; save của bản 0.2/0.3 (`seenVersion` '0.2.0', bản 0.3.0 không có thư riêng) nhận `phien_ban_0_4_0`. **M4 (0.4.0)**: `currentVersion` '0.4.0'; thư `phien_ban_0_4_0` giải thích luật tip mới ("hóa đơn từ 20.000đ mà khách chấm 5 sao thì khách bỏ hũ tip 5.000đ"), giới thiệu sự kiện ngày/tình huống mới, 3 phiên hàng hiếm theo giờ và khách lạ; quà làm quen `{ fragments: { tra_tac_mat_ong: 1 }, rare: { mat_ong_rung: 1 } }` (không tính trần hàng hiếm mỗi ngày thật, không có tiền nên không tính trần quà tháng).

### 15.6 Chuỗi nhiệm vụ — `chains.js` (dữ liệu `CHAINS`, `NPCS`, `CHAIN_WHERE`; chuỗi sự kiện ở `EVENTS[id].chain`)
```js
export function chainDefs(ctx) ; chainUnlocked(state, def, nowInfo, ctx) ; stepGateOpen(state, def, k, nowInfo, ctx) ; checkPasses(state, check, ctx)
export function refreshChains(state, nowInfo, ctx) → changes       // mở chuỗi, xét bước "đạt mức", thưởng chuỗi sự kiện chưa nhận sau ân hạn → Hộp thư
export function applyChainSignal(state, sig, n, nowInfo, ctx) → changes
export function claimChainReward(state, chainId, stepIndex = null, nowInfo, ctx) → { ok, stepIndex, reward } | { ok: false, reason }
export function chainStatus(state, nowInfo, ctx) → [{ id, name, npc, npcName, main, eventId, unlocked, done, step, total, text, where, progress, target, isCheck, gateLocked, claimable: [{ stepIndex, reward }] }]
export function chainForcesFakeQr(state, ctx) → boolean
```
Luôn đúng 1 bước đang làm; bước đếm (`signal`, `target`) chỉ đếm từ lúc hiện ra; bước có `assist` + `assistSignal` đếm tín hiệu thay thế khi bật công tắc Hỗ trợ đó (`stepSignal`; Hỗ trợ thao tác trần món ở Ngon nên C1 bước 6 và chuỗi sự kiện bước 4–5 đếm `dish_good` / `good_rating`, thẻ hiện `assistText`) để chuỗi không bao giờ kẹt; bước `check` (`reputation`, `avgRating`, `ownsShopRecipe`, `upgrade`) xét trạng thái hiện tại. Xong bước → thưởng vào `claimable` (chuỗi thường nhận ở màn Chuẩn bị; chuỗi sự kiện nhận ở màn sự kiện, cả trong 3 ngày ân hạn), bước kế hiện ra ngay. Hết ân hạn mà còn bước chưa nhận: Tem của bước cộng vào Tem dư của sự kiện (đổi ra tiền cùng lúc tất toán), phần còn lại (công thức) gửi thư `chuoi:<chainId>:<k>` (đền bù). `chainStatus` có thêm `npcVerb` (`NPCS[npc].verb`: "Dì Sáu dặn", "Cô Hạnh nhờ") và `assistText`. "Ngày đầu ra phố" (Dì Sáu, 7 bước, mỗi bước kèm thẻ Mẹo nghề qua `tipId`; bước 7 "Đạt 150 danh tiếng và sao trung bình từ 3,8", cùng ngưỡng với điều kiện lên Chặng 2; xong → danh hiệu "Chủ xe đầu hẻm", 20 Muỗng Vàng, `unlocks: 'the_quan_coc'`). Chuỗi sự kiện: bước có cổng `gates[k]` chưa mở thì tín hiệu không đếm (tiến độ giữ 0), thẻ ghi "Mở hàng một ca hôm nay để mở bước này" hoặc "Bước này mở vào ngày chơi kế tiếp trong mùa sự kiện". "Làm quen QR" (Anh Khoa, từ `qrFromDay`): 3 QR đúng → phát hiện 1 ảnh giả (`forceFakeQr`: mỗi ca sau đó `startShift` ép 1 khách QR giả cho tới khi bắt được; Loa chặn cũng tính) → mua Loa báo tiền.

### 15.7 Chợ Công Thức — `shop.js` (dữ liệu `SHOP`, `ITEMS`, `COSMETICS`, `TITLES`, `UNLOCKS`)
```js
export function shopCatalog(state, ctx) → { name, recipes: [preview + { owned, unlocked, canAfford, canBuy, canTaste, tried }], teasers: [{ id, name, icon, chang, note, locked }], upgrades: [...], umbrellas: [...] }
export function recipePreview(state, recipeId, ctx) → { steps, boardSteps, mechanics, newMechanics, difficulty, cost, price, profit, shopPrice, fromDay, paybackShifts }
export function recipeCost(recipe, ctx)
export function buyShopRecipe(state, recipeId, ctx) → { ok, price } | { ok: false, reason }   // qua economy.buyRecipe (phát recipe.bought, boughtDay → ×2 hai ca đầu)
export function buyShopUpgrade(state, upgradeId, ctx)   // economy.buyUpgrade
export function buyUmbrella(state, id, ctx) ; equipCosmetic(state, id, ctx, slot?)             // 30 Muỗng Vàng/màu, chỉ thẩm mỹ
export function canTaste(state, recipeId, ctx) ; startTasting(state, recipeId, ctx) ; tastingSandbox(state, ctx) → { state, ctx } ; finishTasting(state, ctx) → { ok, result }
// M4 bước 6: món hiếm (source 'hiem'): canTaste cần món nền (thieu_mon_nen) và đủ mảnh (chua_du_manh), thử lại không giới hạn
//   (không ghi shop.tried); finishTasting → { ok, result, rare: true, unlocked } — đạt RARE_CONFIG.unlockGrade (Được) thì
//   grantReward({recipe}) (boughtDay 0), bỏ mảnh đã dùng, phát 'rare.unlocked'. Nấu thử không trừ kho hàng hiếm.
```
Nấu thử: đang có phiên dở của món khác thì `canTaste`/`startTasting` trả `dang_nau_thu` (ra món đó trước; mỗi món chỉ 1 lần miễn phí), `shopCatalog().recipes[].tastingOther`. `state.tasting.shift` là một ca giả 1 phiếu `thu1`; giao diện gọi thẳng các hàm bếp (`startCook(sandbox, 'thu1', 0, quietCtx)`, `submitChon`, `submitStep`, `finishDish`…) trên `tastingSandbox` — ví, thạo món, Mẹo nghề, nhiệm vụ, `state.shift` không đổi, không có sự kiện lên bus. Miễn phí 1 lần mỗi món chưa có (`shop.tried`).

### 15.8 Sự kiện — `events.js` (dữ liệu `EVENTS`, `DAY_EVENTS`, `DAY_EVENT_CONFIG`)
Sự kiện có thời hạn (thuần dữ liệu; thêm Giáng sinh/Tết = thêm một mục `EVENTS` + món `source: 'event'`):
```js
export function isEventActive(eventId, nowMs, eventsOrCtx?) → boolean      // from 04:00 VN ≤ now < to 04:00 VN
export function eventWindow(ev) → { fromMs, toMs, teaserMs, graceEndMs, lastDay } ; eventPhase(ev, nowMs) → 'chua_toi'|'sap_dien_ra'|'dang_dien_ra'|'an_han'|'da_ket_thuc'
export function activeEventIds(nowMs, ctx) ; eventState(state, eventId) ; eventsOverview(state, nowInfo, ctx) → thẻ "Sắp diễn ra"/"Đang diễn ra"/ân hạn
export function markEventDay(state, nowInfo, ctx) ; awardDishTem(state, recipeId, grade, nowInfo, ctx) → Tem
export function ensureEventQuests(state, nowInfo, ctx) ; applyEventQuestSignal(...) ; eventQuestList(state, eventId, nowInfo, ctx) ; claimEventQuest(state, eventId, questId, nowInfo, ctx)
export function eventCheckinStatus(state, eventId, nowInfo, ctx) ; claimEventCheckin(state, eventId, nowInfo, ctx)
export function exchangeList(state, eventId, ctx) ; exchangeTem(state, eventId, itemId, nowInfo, ctx) ; settleEvents(state, nowInfo, ctx) → [mailId]
export function leftoverMoney(ev, tem, ctx, day) → đồng ; eventPending(state, ev, phase, nowInfo, ctx) → số mục chờ nhận (eventsOverview().pending)
// ensureEventQuests(state, nowInfo, ctx) → [{eventId, tem, dayKey}]: sang ngày mới, việc sự kiện hôm trước xong chưa nhận tự cộng Tem
// applyEventQuestSignal phát 'event.quest'; việc có assist + assistSignal (ev_nam_sao) đếm khách từ 4 sao khi bật Hỗ trợ thao tác
```
"Tri ân 20/11" (`tri_an_20_11`, 12/11/2026 04:00 → 22/11/2026 04:00, thẻ "Sắp diễn ra" từ 09/11, Tem "Phấn Trắng"): món Ngon trở lên +1 Tem (món lễ +2 thêm), trần 30/ngày; 3 nhiệm vụ sự kiện/ngày × 10 Tem; điểm danh sự kiện 7 ô × 15 Tem; chuỗi 5 bước (20+25+30+35+40 = 150 Tem), bước cuối tặng công thức `che_buoi` (cổng `gates [1,1,2,2,3]` ngày thật đã chơi → chơi 3 ngày bất kỳ là đủ; còn ít ngày thì gộp bước); Quầy đổi: trang trí 150/200/250 Tem, 50 Tem → 10 Muỗng Vàng (tối đa 5 lần), đổi được cả 3 ngày ân hạn; hết ân hạn Tem dư tự đổi với tỉ lệ thấp: 100 Tem = 0,2 thu nhập tham chiếu, tối đa 1 lần thu nhập tham chiếu mỗi sự kiện (`leftover { per: 100, incomeMul: 0.2, maxIncomeMul: 1 }`), gửi thư `tem_du:<eventId>` loại `su_kien` tính vào trần tiền quà tháng (còn ít chỗ thì đổi ít lại, hết chỗ thì thư chỉ báo). Trong mùa món lễ đã sở hữu được gọi ×2 (`mods.recipeWeight`), giá không đổi, mỗi phần món lễ đạt Ngon trở lên +1 danh tiếng (`festiveRep`, cộng trong `finalizeCustomer` theo `sh.mods.events`); sau mùa giữ món vĩnh viễn (`state.eventRecipes`).

Sự kiện ngày (từ ngày game 3; M4: 0,65 + bảo hiểm, thực khoảng 74%/ngày, bốc tuần tự `seedFrom(seed, day, 'su_kien_ngay')`; báo trước ở Tổng kết bằng `dayEventInfo(state, state.day, ctx)` sau `endShift`):
```js
export function rollDayEvent(state, day, ctx) → id | null ; dayEventInfo(state, day, ctx) → { id, name, desc, icon, effects, choice: { id, label, desc, cost, free, chosen } | null } | null
export function dayEventEffects(info, ctx) → effects   // đã chọn / tự áp lựa chọn (Căng bạt) → hiệu ứng của lựa chọn (thẻ, Dự báo, Tổng kết)
export function setDayEventChoice(state, choiceId | null, ctx) ; setMarketCoupon(state, on)      // lựa chọn ở màn Chuẩn bị; tiền/phiếu trừ lúc mở ca
export function prepareShiftMods(state, ctx, nowMs?) → mods ; applyCustomerMods(n, mods, ctx) → số khách
// mods = { customerMul, extraCustomers, patienceMul, lineCountWeights (M4, thay tipMul), recipeWeight, noteBoost, noteBoostRate, cogsMul,
//          dayEvent: { id, choice, kind } | null, events: [eventId], prepCost,
//          M4 bước 4: fixedCostDelta, ingCostMul {ingId: hệ số}, noQrSpeaker, queueMax | null, queueFine {at, fine, warn, text} | null,
//          bigOrder {recipeId, qty, persona, who, bonus, minStars, done, low, lost} | null, endCheck {type, ...} | null, rareRolls }
// M4: dayEventSeries(state, toDay, ctx, { avoidBadOn }?) → days[] (days[d] = id | null) ; dayEventKind(def) → 'tot' | 'chon' | 'xau' ; dayEventInfo(...).kind
// soát lỗi M4: announceDayEvent(state, day, ctx) → id | null: chốt sự kiện ngày `day` vào state.incidents.announced (meta.refreshMeta
//   chốt hôm nay; startShift chốt hôm nay và ngày mai); ngày đã chốt không bốc lại (đổi mức "Tần suất sự kiện" chỉ áp cho ngày chưa
//   chốt); lúc chốt, sự kiện gần nhất trên dòng thời gian chung (incidents.lastEvent) là loại xấu và chắc chắn không có gì xen giữa
//   → ngày đó không bốc loại xấu (chỉ đổi loại, không đổi có/không có sự kiện). finishShiftEvents ghi chú khoản mods.prepCost
//   ("Đã chi … lúc mở hàng", không tính vào lãi ca).
// M4 bước 4: finishShiftEvents(state, ctx) → [ghi chú]  (endShift gọi TRƯỚC summarizeShift; chạy 1 lần mỗi ca, cờ sh.eventsFinished)
//            servedPortions(sh, recipes, ctx), shiftAvgStars(sh), hygieneErrors(sh, codes), shiftEventCap(sh) → {loss, gain}
```
M4 (tần suất "dày", `DAY_EVENT_CONFIG`): `chance` 0,65, `guaranteeAfter` 1 (1 ngày game không có sự kiện → ngày kế chắc chắn có; tỉ lệ thực khoảng 74%), `noRepeat` (không trùng loại hôm trước khi còn loại khác), `badFromDay` 5 (loại xấu từ ngày 5, không 2 ngày xấu liền), `cooldowns` [{ids: ['trat_tu_do_thi', 'kiem_tra_attp'], days: 7}] (nhóm cách nhau ≥ 7 ngày game). Mức "Tần suất sự kiện" Ít (`settings.incidentFrequency`, `state.eventFrequency`) chỉ bốc loại tốt. `rollDayEvent` bốc TUẦN TỰ từ `fromDay` tới ngày cần xem (`dayEventSeries`), mỗi ngày luồng riêng `seedFrom(seed, ngày, 'su_kien_ngay')`, tất định theo (seed, ngày, mức); ngày đã chốt (`state.incidents.announced`, soát lỗi M4) dùng đúng sự kiện đã chốt → "Ngày mai: …" ở Tổng kết luôn khớp, đổi mức tần suất sau khi đã báo không bốc lại. Mỗi sự kiện ngày có `kind` ('tot' | 'chon' | 'xau'): Trời mưa 'chon', Nắng nóng / Ngày lãnh lương / Chợ phiên 'tot'.
Trời mưa: khách ×0,8 (làm tròn, sàn 3), kiên nhẫn ×1,2; "Căng bạt" 20.000đ còn ×0,95 (có Bạt che mưa thì miễn phí). Nắng nóng: Trà tắc, Cà phê sữa đá được gọi ×2, thêm ghi chú Ít đường/Ít ngọt, +1 khách (trần 8). Ngày lãnh lương (M4): khách gọi thêm món, `lineCountWeights` [60, 32, 8] (thường [70, 25, 5]); không còn tip ×1,5. Chợ phiên: khách ×1,3 (trần `BALANCE.eventCustomerCap` = 10), M4 +1 lượt Giỏ chợ (`rareRolls` → `sh.rareRolls`); `planArrivals` giãn lịch nên ρ ≤ 0,9 (có test). Phiếu Chợ Sớm: giá vốn ×0,8 trong 1 ca.
M4 bước 4 — tám sự kiện ngày mới (mục 20): trọng số 100 (tốt 58 / chọn, xấu 42): Trời mưa 13, Nắng nóng 13, Ngày lãnh lương 10, Chợ phiên 10, Hội thi xe sạch 9, Văn phòng đặt 3 ly 9, Đại lý trà tài trợ 7, Tắc lên giá 6, Tiền điện nước 5, Cúp điện 6, Trật tự đô thị 6, Kiểm tra ATTP 6.

### 15.9 Lên chặng — `progression.js` (dữ liệu `STAGE_UP`, `POST_GOALS`)
```js
export function checkStageUp(state, ctx) → { chang, name, screenTitle, eligible, locked, lockedText, conditions: [{ id, kind, label, current, target, done, progress, hint }] }
export function updateStageUp(state, ctx) → boolean (vừa đủ lần đầu; phát 'stage.ready') ; markStageUpSeen(state)
export function postGoals(state, ctx) → { flawless, mastery, recipes: [{ id, name, flawless, level, mastered }], records: { bestProfit, mostFiveStars, longestStreak } }
```
Điều kiện Chặng 2 (đúng `docs/de-xuat-thiet-ke.md` mục 8, 14.1 và `docs/can-bang.md` mục 13): **150 danh tiếng** · sao TB ≥ 3,8 · 3 công thức · 2 món thạo cấp 2 · xong "Ngày đầu ra phố" · 500.000đ và không nợ Dì Sáu (Chè bưởi không bắt buộc nhưng được tính là 1 công thức). Luật chỉnh ở can-bang mục 13 xét người chơi TRUNG BÌNH: mô phỏng người chơi trung bình (quầy đúng, bếp 40% Tuyệt hảo / 45% Ngon / 10% Được / 5% Kém; seed 42, 7, 2024) tới 150 danh tiếng ở ca 8–9 và đủ mọi điều kiện ở ca 9, không sớm hơn ca 8 nên giữ 150. Người chơi hoàn hảo 3 ca/ngày thật đủ điều kiện sớm hơn (ngày thật 2–3), điều này chấp nhận được. Đủ → màn "Quán cóc vỉa hè – sắp khai trương" nút khóa "Sắp có ở bản sau", vẫn chơi tiếp Chặng 1 (`state.chang` giữ 1). Thẻ "Giấc mơ tiếp theo" dùng `conditions[].label/progress/hint` (vd "Nấu thêm 3 lần Ngon món Trà tắc").

### 15.10 Kiểm chứng M2 (mô phỏng và e2e)

**Mô phỏng** `tests/unit/integration-meta.test.mjs` (DATA thật, `attachMeta` trên bus thật, đồng hồ giả): người chơi hoàn hảo (`tests/helpers/perfect-player.mjs`) chơi 5 ngày thật × 3 ca (08:00, 12:00, 17:30 giờ Việt Nam), seed 42, 7, 2024 từ 05/10/2026, thêm một lượt trong mùa "Tri ân 20/11" (17–21/11, có quà lễ 20/11 bằng tiền). Mỗi ngày: `refreshMeta`, điểm danh, nhận thư. Giữa các ca: nấu thử rồi mua Bánh tráng trộn (từ ngày game 2), Dao thép tốt, Cà phê sữa đá (từ ngày game 4), đủ điều kiện lên chặng rồi mới mua Loa báo tiền; dùng Phiếu Chợ Sớm, chọn Căng bạt khi mưa; nhận Việc hôm nay, Rương ngày, thưởng chuỗi, Hộp thư (trong mùa sự kiện thêm việc sự kiện, điểm danh sự kiện, Quầy đổi Tem). Kiểm tra:
- Người chơi hoàn hảo đủ điều kiện lên Chặng 2 trong ngày thật 2–6 (kết quả: ngày thật 2–3, ca 6–7); `stage.ready` phát đúng 1 lần. Người chơi trung bình (`simulateAverage`): đạt 150 danh tiếng không sớm hơn ca 8 (ca 8–9) và đủ điều kiện trước ca 15 (ca 9).
- Thưởng ngoài bán hàng ≤ 35% Tiền quán nhận mỗi ngày thật, tính theo tiền thật và cả khi quy đổi hiện vật (Phiếu Chợ Sớm = phần giá vốn tiết kiệm được, Bạt che mưa = 20.000đ, nâng cấp = giá bán). Kết quả: cao nhất 25,2% ở ngày thật 7 của lượt sự kiện (Rương Khai Trương), 24,9% (quy đổi 26,5%) ở ngày thật 2 (thưởng chuỗi bước 4–6); ngày có quà lễ 20/11 là 18,3%; ngày tất toán Tem dư 25/11 là 21,2% (thư Tem dư 100.000đ = trần 1 thu nhập tham chiếu; trước khi sửa là 835.000đ, khoảng 59%). Lượt sự kiện chạy tới 26/11 (qua ân hạn).
- Bất biến ví từng ca (ví sau ca − ví đầu ca = lãi − trả nợ; tiền căng bạt trừ trước khi ghi ví đầu ca) và từng ngày (ví cuối − ví đầu = lãi − trả nợ + thưởng − tiền mua − tiền chuẩn bị); tiền thưởng vào ví đúng bằng phần thưởng.
- Không có số NaN/Infinity trong state; `migrate(decodeSave(encodeSave(state)))` trả lại đúng state.
- Nấu thử không đổi ví, thạo món, Việc hôm nay, ca. Đủ 5 hệ thống chạy: điểm danh 5 ô liên tiếp, việc và Rương ngày, thư chào mừng, đổi việc miễn phí, chuỗi C1 xong, chuỗi QR qua bước bắt ảnh giả. Khách bỏ đi chỉ là khách trả bằng ảnh giả bị từ chối. Chè bưởi nhận qua chuỗi sự kiện sau 3 ngày thật chơi trong mùa, khách gọi ngay trong mùa.
- `META_SIM_LOG=1 npm test` in số liệu từng ngày thật.

Lệch so với `docs/can-bang.md`: lãi bán hàng của người chơi hoàn hảo khoảng 240–750k mỗi ngày thật (3 ca), gấp khoảng 3 lần mô hình người chơi trung bình ở mục 9. Lý do: mọi khách 5 sao có món Không tì vết được tip 10.000đ (mô hình giả định trung bình 2.200đ/khách), và sao trung bình ≥ 4,5 thêm 1 khách mỗi ca. Chưa đổi tip, cần đo người chơi thật (can-bang mục 15, chỉ số 15 và 21). Ngưỡng danh tiếng lên Chặng 2 giữ 150 theo đặc tả (mục 15.9). *M4 đã đổi tip (mục 19): 5.000đ duy nhất khi 5 sao và hóa đơn khách thực trả từ 20.000đ; lãi người chơi hoàn hảo giảm (ví dụ seed 42: 115–673k mỗi ngày thật), tỉ lệ thưởng cao nhất 32,0% (ngày thật 2, dưới trần 35%). M4 bước 8 (mục 22): mô phỏng thêm phiên hàng, nấu thử món hiếm, tình huống chọn an toàn và quy đổi hàng hiếm; chạy rộng 40 hạt giống × 4 mốc ngày bắt đầu thì trần 35% bị vượt ở 44/800 ngày thật (cao nhất 41,7%) nên thưởng tiền bước 4–6 của chuỗi "Ngày đầu ra phố" giảm (85k → 45k tiền cả chuỗi); sau khi giảm cao nhất 34,1%.*

**E2E M2** (giao diện thật, Chromium 390×844 cảm ứng, `npm run e2e`):
- `checkin-quests.e2e.mjs` dùng đồng hồ giả `openGame({ clock: { time } })`, seed 42. Lần đầu mở game → bảng điểm danh tự hiện → nhận ô 1. Tải lại cùng ngày → không hiện. 03:59 hôm sau chưa sang ngày; qua 04:00 khi đang ở màn Chuẩn bị (lượt kiểm tra 30 giây) → bảng hiện → nhận ô 2. Sang ngày thứ 3 rồi lùi đồng hồ máy 2 ngày → có `rewind-note`, nút nhận khóa, `checkin-note` cảnh báo; giờ đúng lại thì nhận được ô 3. Việc hôm nay có đúng 3 việc (Quầy, Bếp, Chất lượng). Chơi trọn ca ngày 1 → xong "3 món không có lỗi nguyên liệu" → bấm Nhận (+0,2 thu nhập tham chiếu, +5 danh tiếng).
- `shop.e2e.mjs`: save ngày game 2 dựng bằng lõi rồi mã hóa bằng `encodeSave` (`seedSave`), `?devNow`. Nấu thử Bánh tráng trộn (ví, thạo món không đổi) → mua ở màn kết quả → mua Dao thép tốt → xem thử rồi mua dù đỏ bằng Muỗng Vàng, đổi qua lại với dù cũ → mở ca, khách gọi Bánh tráng trộn và được phục vụ (seed 42: khách đầu tiên).
- `event-2011.e2e.mjs` không bật `?test=1` để người chơi tự động nấu được món Tuyệt hảo. Ngày 13/11: thẻ "Đang diễn ra", món đạt Ngon trở lên được cộng Tem, khách 5 sao làm xong bước 4 (save dựng sẵn ở gần cuối chuỗi). Bước 5 cần 3 ngày thật chơi trong mùa (`gates`) nên hôm đó còn khóa, không đếm; theo luật này không ai xong chuỗi được vào ngày thứ 2 của mùa. Ngày 14/11 (ngày chơi thứ 3) mở ca → nấu Tuyệt hảo → xong chuỗi → nhận Chè bưởi (nhãn "Tri ân 20/11 · 2026"). Ngày 25/11 đã hết mùa và hết ân hạn: không còn thẻ sự kiện, Tem dư đã tất toán, Chè bưởi vẫn trong thực đơn, khách gọi và được phục vụ (seed 31: khách đầu tiên). Save mới ngày 09/11 → thẻ "Sắp diễn ra", "Mở sau 2 ngày …".
- `startNewGame` của các e2e M1 nhận luôn bảng điểm danh hiện ở lần mở đầu (`claimCheckinIfShown`).
- `review-m2.e2e.mjs`: hai tab (tab cũ hiện `tab-lock`, không ghi đè thư đã nhận ở tab mới, "Chơi ở tab này" tải bản mới); `?devNow` lưu riêng (save thật không bị ghi mốc 15/11, mở lại không bị khóa lùi giờ) và nút Back ở Chợ Công Thức / Hộp thư / Việc hôm nay về màn Chuẩn bị; ân hạn 23/11: thẻ sự kiện có chấm đỏ, màn sự kiện có nút nhận bước 4–5, nhận được Chè bưởi và Tem.

### 15.11 Vòng soát lỗi M2 (tóm tắt thay đổi)

- Lưu: `state.rev` + `writeSave({guard})`, tab cũ tự khóa (mục 12); `?devNow` lưu ở `DEV_KEYS` (mục 13).
- Kinh tế sự kiện: Tem dư 100 Tem = 0,2 thu nhập tham chiếu, trần 1 thu nhập tham chiếu, tính vào trần quà tháng (mục 15.5, 15.8); món lễ +1 danh tiếng/phần Ngon trở lên trong mùa.
- Hỗ trợ: Hỗ trợ thao tác → bước chuỗi Tuyệt hảo/5 sao đếm mức thay thế, không bốc việc không đếm được; Hỗ trợ tính tiền → chuỗi "Quầy chuẩn" luôn 0 (`clipTicket`), không tip 10.000đ theo chuỗi (M4: không có lượt Giỏ chợ theo chuỗi), không ghi kỷ lục.
- Ân hạn: chuỗi sự kiện nhận được ở màn sự kiện trong ân hạn, thẻ sự kiện có chấm đỏ; hết ân hạn Tem thưởng chưa nhận vào Tem dư, công thức qua Hộp thư (thư mới được báo).
- Việc: "Nấu n phần món vừa mua" chốt món lúc bốc; "Không để khách nào bỏ về" không tính ảnh giả bị bắt; việc sự kiện quên nhận tự cộng Tem, ca vắt qua 04:00 đếm cho ngày mới.
- Nấu thử: không mở phiên món khác khi đang dở (`dang_nau_thu`); không tính giờ thật sự, có gợi ý ngay.
- Dữ liệu theo đặc tả: ô 5 Tuần Khai Trương = 2 Phiếu Chợ Sớm; ngưỡng danh tiếng 150.
- Giao diện: Back điện thoại, điểm danh trước thông báo thư, lần mở đầu gọn (lời Dì Sáu lên trên), hiệu ứng sự kiện ngày theo lựa chọn, lời Dì Sáu theo thời tiết, thẻ chuỗi đã xong không lặp chữ, thư việc quên nhận ghi đúng ngày, biển tên xe không tràn, tên tiền sự kiện thay chữ "Tem", động từ NPC thống nhất.

## 16. Nền tảng M3: PWA, sao lưu, Cài đặt, âm thanh

### 16.1 PWA — `manifest.webmanifest`, `sw.js`, `icons/`
- Manifest: `name` "Bếp Khởi Nghiệp", `short_name` "Bếp KN", `display: standalone`, `orientation: portrait`, `start_url`/`scope` `./`, `theme_color` = `--brick` (#b9472f, trùng `<meta name="theme-color">`), `background_color` = `--bg` (#fbf3e2); biểu tượng PNG 192/512 (`any`) + 512/192 (`maskable`, hình nằm trong vùng an toàn 40%) + SVG. `index.html` gắn manifest, `icons/icon.svg`, `apple-touch-icon.png` (180), `mobile-web-app-capable`, `apple-mobile-web-app-title` (không dùng `apple-mobile-web-app-capable` vì Chrome cảnh báo trên console).
- `sw.js`: `VERSION` = "version" của package.json; cache `bkn-<VERSION>`; `PRECACHE` liệt kê **toàn bộ** tệp chơi offline: `index.html`, `manifest.webmanifest`, mọi `.js` trong `src/`, mọi `.css` trong `css/`, mọi tệp trong `icons/` (test đối chiếu với cây thư mục thật: thiếu hay thừa đều hỏng; mọi import tương đối trong `src/` phải có trong PRECACHE). Cài: `cache.addAll` với `cache: 'reload'`, **không** `skipWaiting` tự động. Kích hoạt: xóa các cache `bkn-*` khác bản này (chỉ cache của chính game), `clients.claim()`. Tải tệp: chỉ GET cùng nguồn; cache-first, so khóa `ignoreSearch` (bỏ `?devNow`, `?test`, `?seed`…); tệp chưa có thì lấy mạng (tệp của game được cất thêm). Mở trang (`navigate`): *đến 0.4.1* mọi lượt mở trang trong scope đều trả `index.html` đã lưu (nên trên máy đã cài game, link `mau.html` cũng ra game); **từ 0.4.2** chỉ gốc scope (vd `/gamefnb/`) và `index.html` (bỏ query, `#`) trả trang game đã lưu (`isGamePage`), trang khác cùng nguồn (vd `mau.html`) lấy từ mạng, mất mạng mới trả trang game (`networkFirstPage`); test trong `pwa.test.mjs` gồm cả biến thể đường dẫn con.
- **Font và PRECACHE (M5)**: `PRECACHE` có thêm `fonts/baloo2-800-latin.woff2`, `fonts/baloo2-800-vi.woff2` (`pwa.test` đối chiếu `fonts/*.woff2`), các CSS và module M5 (0.5.0 thêm `src/ui/art/state-map.js`, `src/ui/minigames/{_gesture,bay,dap,got,lac,xoay}.js`); `fonts/OFL.txt`, `mau.html`, `mau/` **không** nằm trong PRECACHE. `index.html` gắn mọi `css/*.css` (có test) và một dòng preload duy nhất, đặt trước mọi stylesheet: `<link rel="preload" as="font" type="font/woff2" href="fonts/baloo2-800-latin.woff2" crossorigin>`. Máy chủ tĩnh của test trả MIME `font/woff2`. Mỗi lần nâng bản người chơi tải lại toàn bộ (bản 0.5.0 khoảng 2,25 MB, cache `bkn-<VERSION>`); font thiếu thì chữ tự lùi về `system-ui` (`font-display: swap`). Artifact dựng bằng `tools/dong-goi-artifact.mjs` đi theo PRECACHE nên tự kèm font. Ở `localhost`/`127.0.0.1` còn tải lại nền sau khi trả cache (khi phát triển thấy code mới ở lần mở sau). Tin nhắn: `{type: 'SKIP_WAITING'}` → kích hoạt bản mới; `{type: 'GET_VERSION'}` → trả `{type: 'VERSION', version}`.
- `main.js` (`setupPwa`): không đăng ký khi `file://`; `beforeinstallprompt` → `preventDefault()` và giữ lại (`app.setPwa({installPrompt})`), `appinstalled`; `navigator.storage.persist()` sau thao tác đầu tiên (nếu chưa bền vững); đăng ký `./sw.js`: worker mới `installed` khi đã có controller → `app.setUpdateReady(worker)`; `controllerchange` chỉ tải lại khi người chơi đã bấm Tải lại (`app.pwa.reloading`); kiểm tra bản mới khi quay lại tab (tối đa 30 phút/lần).
- Bản mới: `app.updateSlot()` (ô tự điền khi có bản mới, cả khi đang mở màn) chỉ được đặt ở màn **Chuẩn bị** và **Tổng kết**: thẻ `update-ready` "Có bản mới" + nút `update-reload` "Tải lại" → `app.applyUpdate()` (từ chối khi đang có ca; lưu, gửi SKIP_WAITING, tải lại). Giữa ca không bao giờ hiện, tải lại giữa ca vẫn dùng bản cũ (bản mới chờ **khi game còn mở**).
- Giới hạn của trình duyệt (vòng soát lỗi M3): khi người chơi đóng **hết** tab/ứng dụng rồi mở lại, trình duyệt tự kích hoạt bản đang chờ, có thể rơi vào giữa ca; không chặn được. Cách giữ ca: giao diện ghi `shift.appVersion` lúc mở ca; mở lại ở bản khác mà ca vẫn đủ cấu trúc thì chơi tiếp và báo `version-toast`; bản sau có đổi cấu trúc ca thì `save.migrate` hủy ca và hoàn giá vốn đã trừ (`report.shiftDropped`, hộp thoại `save-notice`) — không bỏ ca im lặng. E2E `pwa-backup` (máy chủ `bkn.localhost`, không phải localhost nên không có tải lại nền) kiểm hành vi này.
- Cài game: `app.installMode()` → `'installed'` (đã cài/standalone) | `'prompt'` (có hộp cài của trình duyệt → `app.promptInstall()`) | `'ios'` (hướng dẫn Chia sẻ → Thêm vào Màn hình chính) | `'manual'` (menu trình duyệt).
- Biểu tượng PNG dựng từ `icons/icon.svg` bằng `tools/make-icons.mjs` (Chromium của Playwright, kiểm tra kích thước PNG); chạy tay khi đổi hình, commit cả PNG.

### 16.2 Mã sao lưu — `core/save.js`
- Định dạng `BKN1.z.<payload>.<checksum>`: payload = base64url của JSON (UTF-8) nén bằng `lzCompress` (LZ77 kiểu khối LZ4, viết tay, đồng bộ, không cần `CompressionStream`); checksum = FNV-1a 32 bit của `SALT + 'z.' + payload` (8 ký tự hex). Save 45 KB → mã khoảng 8 KB. `readCode` nhận cả mã save thô `BKN1.<payload>.<checksum>` (`encodeSave`), bỏ khoảng trắng/xuống dòng/chữ thừa (dán từ tin nhắn, cả nội dung file sao lưu), giải nén có trần 8 MB, không bao giờ ném lỗi ra ngoài; nội dung qua `migrate` (save v1, v2 nạp được, thiếu cài đặt M3 thì lấy mặc định).
- Lý do từ chối (câu hiển thị ở `CODE_ERRORS` của `ui/screens/settings.js`): `rong` "Chưa có mã…", `khong_phai_ma` "Đây không phải mã sao lưu…", `sai_ma` "Mã bị sai hoặc thiếu ký tự, có thể do chép chưa hết…", `hong` "Mã không đọc được…".
- **Không xóa dữ liệu người chơi**: trước khi ghi đè (nhập mã, khôi phục bản đã cất, chơi lại từ đầu) bản hiện tại được cất bằng `archiveSave` sang khóa `<khóa save>.old.<ms>` (`bkn.save.old.<ms>`; khi `?devNow` là `bkn.save.dev.old.<ms>`), giá trị là `exportCode`. Cất lỗi (bộ nhớ đầy) → không ghi đè gì. Không có hàm xóa bản đã cất; màn Cài đặt liệt kê "Bản lưu đã cất" (`listArchives`) để khôi phục.
- `app.replaceState(next)`: cất bản hiện tại → `next.rev = max(rev trong storage, rev hiện tại, rev của next)` rồi `writeSave` (kèm bản dự phòng) nên tab cũ tự khóa; đặt lại `app.session`; lỗi → giữ nguyên bản cũ (`loi_cat` | `loi_ghi` | `tab_khac`). Sau đó giao diện gọi `refreshMeta`, lưu, về màn mở đầu.
- Nhắc sao lưu: `backupDue(state, now)` = đã bán ít nhất 1 ca và `now − max(backup.lastAt, backup.since) ≥ 7 ngày thật` → thẻ `backup-reminder` ở màn Chuẩn bị, bấm mở Cài đặt ở mục Sao lưu (`app.go('settings', { focus: 'backup' })`). Mã sao lưu mang sẵn mốc `backup.lastAt` của lần chép; bản đang chơi chỉ ghi `backup.lastAt` khi mã **thật sự được cất**: `navigator.clipboard.writeText` thành công, nút "Chép lại" (`execCommand('copy')`) trả true, người chơi tự chép từ ô mã (sự kiện `copy`), hoặc đã tải file. Chép tự động thất bại (vd chơi qua http trong mạng Wi-Fi, Clipboard API chỉ có ở HTTPS) mà bấm "Xong" thì không ghi mốc, thẻ nhắc vẫn còn (vòng soát lỗi M3).
- Mã tạo từ bản game mới hơn (`readCode().warn === 'ban_moi_hon'`): bảng xem trước có cảnh báo `backup-newer` (số món/nâng cấp sẽ mất, khuyên cập nhật game trước), nút xác nhận đổi thành "Vẫn dùng bản này".
- Bản lưu không đọc được lúc mở game: cất nguyên chuỗi sang `<khóa save>.hong.<ms>` trước lần ghi đầu (mục 12); Cài đặt ghi số bản đã cất (`broken-archives`).

### 16.3 Màn Cài đặt — `ui/screens/settings.js` (+ `css/settings.css`)
Mở từ ô Cài đặt `open-settings` trong lưới biểu tượng của màn Chuẩn bị (mục 13.2; thay các công tắc cài đặt rời trước đây, cùng testid `setting-<khóa>`). Các mục:
- Âm thanh và rung: Âm thanh, Âm lượng (0–100%, bước 10, khóa khi tắt tiếng), Rung.
- Hỗ trợ: Hỗ trợ tính tiền (ghi rõ: chuỗi "Quầy chuẩn" và việc Quầy không được đếm, không ghi kỷ lục), Hỗ trợ thao tác (ghi rõ: không đạt "Không tì vết", tối đa hạng Ngon).
- Chơi: Hướng dẫn lần đầu (0.4.1, `setting-tour`: bật/tắt tự hiện tour — `state.tour.disabled`, mục 29), Mẹo nghề, Giảm chuyển động, "Tần suất sự kiện" Nhiều / Vừa / Ít (M4 đổi tên từ "Tình huống trong ca"; `settings.incidentFrequency`, mặc định Vừa; áp cho cả sự kiện ngày và tình huống trong ca; "Ít" chỉ gồm sự kiện/tình huống loại tốt, không có khoản phạt).
- Sao lưu: lần sao lưu gần nhất; "Chép mã sao lưu" (`navigator.clipboard`, không được thì hiện mã trong ô để chép tay; nút Chép lại dùng `execCommand('copy')`); "Tải file sao lưu" (Blob `.txt` gồm vài dòng hướng dẫn + mã, tên `bep-khoi-nghiep-<tên xe không dấu>-ngay-<n>-<YYYYMMDD>.txt`); "Nhập mã sao lưu" (dán mã hoặc chọn file → Xem trước bảng "Bản trong mã" / "Bản hiện tại": tên xe, ngày game, Tiền quán, chặng, số công thức, danh tiếng, Muỗng Vàng → "Dùng bản này" mới ghi đè); "Bản lưu đã cất" (Khôi phục = cùng luồng xem trước).
- Cài game (theo `installMode`), trạng thái chơi offline (`app.pwa.offlineReady`).
- Thông tin: phiên bản, "Giới thiệu" (game hư cấu, mọi con số là số liệu minh họa, không liên quan thương hiệu nào, dữ liệu lưu trên máy), "Chơi lại từ đầu" (hộp thoại 2 bước `reset-step1` → `reset-step2`; state mới `defaultState(seed ngẫu nhiên)` giữ cài đặt; bản cũ được cất).
Màn mở đầu lần đầu (chưa đặt tên xe) có nút `title-import` "Đã chơi ở máy khác? Nhập mã sao lưu" (cùng hộp thoại nhập mã).

### 16.4 Thêm màn mới
Viết `src/ui/screens/<tên>.js` theo mục 13, import rồi thêm vào bảng `SCREENS` ở `src/main.js` (khóa = tên dùng trong `app.go`). Màn không nằm trong `ROOT_SCREENS` tự là màn con (Back điện thoại → Chuẩn bị, có thể tự xử lý bằng `onBack()`); `router.register(name, screen)` dùng được lúc chạy. Thêm tệp vào `PRECACHE` của `sw.js` (test `pwa.test.mjs` báo thiếu).

### 16.5 Âm thanh — `ui/audio.js`
`createAudio(getSettings, env = globalThis)` → `{ play(name) → boolean, unlock(), ready(), names }`; `SOUND_NAMES`: `click, coin` (tiền vào túi/nhận thưởng), `cash` (tiền vào két: "cạch" + "keng"), `ding` (Hoàn hảo), `bell` (chuông ra món, khách tới), `chop` (dao thái "tách"), `sizzle` (dầu "xèo"), `pour` (rót nước), `error` (lỗi), `nudge` (nhắc nhẹ), `chest` (mở rương), `paper`; M5 Đợt 0: `stamp` (con dấu), `sparkle`, `fanfare` (ra món, lên cấp), `tick` (% đếm lên), `whoosh`; M5 Đợt 1: `crack` (trứng nứt), `stir` (muỗng chạm thành tô), `peel` (gọt), `shake` (đá trong bình), `plop` (thả đá) — `ACTION_SOUNDS` gắn 5 âm này với 5 thao tác mới. Mỗi lần phát lệch cao độ ngẫu nhiên khoảng ±4%. Tổng hợp bằng dao động + ồn trắng qua bộ lọc (không tệp âm thanh). AudioContext chỉ tạo sau thao tác đầu tiên (`pointerdown`/`keydown`) khi đang bật tiếng; âm lượng tổng = 0,9 × `settings.volume`; tắt tiếng/âm lượng 0 → không phát; trình duyệt không hỗ trợ/chặn → im lặng, không lỗi. Gắn âm: mini-game qua `feedback(ctx, kind)` (`cut`/`chop` thái, `hit` chạm trúng, `sizzle` lúc bắt đầu Canh lửa, `pour` mỗi lần giữ Rót), quầy (`cash` khi thối đúng/nhận QR), ca bán (`nudge` khi khách sắp hết kiên nhẫn/bỏ về), Việc hôm nay (`chest` mở Rương ngày), điểm danh (`chest` ô 7). Mọi âm luôn có tín hiệu hình đi kèm.

### 16.6 Kiểm chứng M3 nền tảng
- Unit: `pwa.test.mjs` (PRECACHE ↔ cây thư mục, VERSION ↔ package.json ↔ APP_VERSION, import tương đối có trong PRECACHE, manifest + kích thước PNG, index.html gắn mọi CSS; chạy `sw.js` trong `vm` với cache/fetch giả: cài đủ tệp, không tự kích hoạt, dọn cache cũ, mất mạng vẫn trả trang và module kể cả có query, bỏ qua khác nguồn/POST; router màn con), `backup-code.test.mjs` (định dạng, nhập lại y hệt, nén < 40% save thô, nén/giải nén từng byte, dữ liệu hỏng ném lỗi, sai 1 ký tự → `sai_ma`, dán kèm chữ thừa, save v1, cất bản cũ không ghi đè, nhắc 7 ngày, cài đặt M3), `audio.test.mjs` (AudioContext giả: chỉ tạo sau thao tác, đủ âm, âm lượng, tắt tiếng, trình duyệt chặn; mọi tên âm giao diện gọi đều có).
- E2E `pwa-backup.e2e.mjs` (vòng soát lỗi M3: thêm kịch bản "bản mới tự kích hoạt khi đóng hết tab giữa ca" ở máy chủ `bkn.localhost`; chờ cache/bản chờ bằng `pollEval`, không dùng `waitForFunction` với Promise): (5) chờ service worker → tải lại → `context.setOffline(true)` → tải lại vẫn vào màn Chuẩn bị, mở ca, có khách; bản mới (máy chủ thử thay `VERSION` của sw.js): nút Tải lại hiện ở màn Chuẩn bị, bấm thì dùng cache bản mới, tiến trình giữ; bản mới phát hành giữa ca không hiện nút, tải lại giữa ca vẫn bản cũ; sao lưu: chép mã + tải file → ngữ cảnh mới (localStorage trống) nhập mã từ màn mở đầu → mã rỗng/sai 1 ký tự/không phải mã báo lỗi thân thiện → xem trước đúng → xác nhận → dữ liệu khớp; Chơi lại từ đầu 2 bước (Thôi ở mỗi bước không đổi gì) → bản cũ còn ở `bkn.save.old.<ms>`, khôi phục được; Cài đặt ở 360×740: nhắc sao lưu sau 7 ngày, công tắc/âm lượng/tần suất lưu vào save, Giới thiệu, hướng dẫn cài, Back điện thoại, không tràn/chạm ≥ 44px/chữ ≥ 14px.

## 17. Nội dung M3: tình huống trong ca, Sổ tay nghề, Sổ công thức, làm tròn tiền

### 17.1 Tình huống trong ca — `core/incidents.js` + `data/incidents.js`
- Luật (`INCIDENT_CONFIG`): từ ngày game 3, mỗi ca bốc có/không theo `settings.incidentFrequency`; bảo hiểm: `state.incidents.since` đếm số ca (từ ngày 3) không có tình huống được xử lý; không lặp 5 loại gần nhất (`recent`), hết loại mới thì lấy loại lâu chưa gặp nhất. Trần thiệt hại = `min(floor500(10% doanh thu dự kiến của ca), floor500(0,5 × thu nhập tham chiếu))`; loại có lựa chọn lỗ quá trần (`maxLoss`) bị bỏ ở lúc bốc.
- M4 (tần suất "dày"): tối đa `maxPerShift` tình huống mỗi ca (Nhiều 2 / Vừa 2 / Ít 1); lần 1 `chance` Nhiều 75% / Vừa 55% / Ít 30%; lần 2 `secondChance` Nhiều 45% / Vừa 30% chỉ khi ca từ `secondMinCustomers` (6) khách, khác loại lần 1, không phải tình huống đầu ca, không 2 loại xấu trong ca; hai tình huống cách nhau ít nhất `minGap` (2) khách (lúc bốc: afterClips2 ≥ afterClips1 + 2; lúc chơi: lần 2 chỉ bật khi lần 1 đã xử lý và đã thêm ≥ 2 khách xong quầy). Bảo hiểm `guaranteeAfter` theo mức (Nhiều 1 / Vừa 2 / Ít 3 ca) → tỉ lệ thực ca có ≥ 1 tình huống khoảng 80% / 60% / 40%. Mỗi loại có `kind` ('tot' | 'chon' | 'xau'; `khach_mo_hang` tốt, `ghi_no` và `doi_y` chọn); mức Ít (`goodOnly`) chỉ loại tốt; loại xấu từ `badFromDay` (5); luật nhịp: tình huống trước loại xấu (`lastKind`) hoặc lỗ ≥ `calmAfterLoss` (50%) trần (`lastLoss`) → chỉ loại tốt hoặc loại chọn không có phạt (`maxFine` 0); ngày có sự kiện ngày loại xấu → không bốc loại xấu. Soát lỗi M4: "không 2 sự kiện xấu liền nhau" xét trên dòng thời gian CHUNG của sự kiện ngày và tình huống — `lastEvent` (sự kiện ngày của ca ghi lúc mở ca, mỗi tình huống ghi lúc xử lý) là loại xấu → không bốc loại xấu; sự kiện ngày của ngày mai (chốt lúc mở ca) là loại xấu → cả ca không bốc loại xấu; lúc chốt sự kiện ngày xem `lastEvent` (events.announceDayEvent). Mô phỏng 60 hạt giống × 60 ca (mức Vừa, Nhiều): 0 cặp xấu liền nhau (trước khi sửa: 48 cặp tình huống xấu rồi sự kiện ngày xấu). Trần tiền thưởng `gainCap` = `min(floor1000(15% doanh thu dự kiến), floor1000(0,75 × thu nhập tham chiếu))`; loại có `maxGain` vượt trần bị bỏ.
- Ngẫu nhiên riêng: `seedFrom(state.seed, day, 'tinh_huong')`, trạng thái luồng lưu ở `sh.incident.rng` và dùng tiếp khi chốt chi tiết/kết quả → tải lại giữa ca không đổi tình huống; luồng khách/bếp không bị xáo trộn.
- `sh.incident = { id, afterClips, status: 'cho'|'xong', rng, cap, guaranteed, detail, choice, result, shownAt? }`; `afterClips` = 0 với tình huống đầu ca (`when: 'mo_hang'`), còn lại bốc trong 1..N−1 (N khách của ca).
- M4 bước 5: 8 tình huống chạy theo dữ liệu (`generic: true`, loại 'chung' trong `KINDS`), xem mục 20.
- API: `planIncidents(state, sh, ctx)` → [kế hoạch] (M4, trong `startShift`: `sh.incident = [0]`, `sh.incidentQueue = phần còn lại`), `planIncident(state, sh, ctx)` (kế hoạch thứ nhất | null), `shiftIncidents(sh)`, `activeIncident(sh)` (tình huống đầu tiên còn 'cho'), `incidentKind(def)`, `incidentCandidates(state, sh, ctx)`, `incidentGainCap`, `incidentGuaranteeAfter`, `nextShiftFull(state, sh, ctx)`, `takeIncidentBonusInfo(state, day)` → `{customers, rep}`, `incidentDue(state, ctx)` (có tình huống chờ, không tạm dừng/nấu thử, `sh.counter` trống, `miniGameBusy(sh)` sai, đủ `afterClips` phiếu đã kẹp, điều kiện riêng của loại), `openIncident(state, ctx)` → view, `incidentView(state, ctx)` → `{ id, name, positive, when, text, note, who, status, choices: [{id, label, safe, available, cost, reason}], safeId, cap, detail }`, `resolveIncident(state, choiceId, ctx)` → `{ ok, id, choice, safe, text, effects: {money, cost, refund, rep, bonus, debt, starLoss, loss}, tipId }` | `{ ok: false, reason: 'khong_co'|'het_han'|'khong_duoc' }` (phát `incident.resolved` `{id, choice, day, safe, money, cost, rep, loss}`), `finishShiftIncidents(state, ctx)` (trong `endShift`), `takeIncidentBonus(state, day)` / `incidentBonusFor(state, day)`, `collectDebts(state, sh, ctx)` / `pendingDebts(state)`, `incidentLossCap`, `expectedRevenue`, `itemCost` (giá vốn làm tròn 500đ, có hệ số giá vốn của ngày).
- Ba tình huống MVP:
  - `khach_mo_hang` (vui, đầu ca): khách mở hàng 1 ly trà tắc bằng tờ 500.000đ. `thoi_het` (cần két đủ thối; đầu ca két 200.000đ nên thường bị khóa kèm lý do → dạy thẻ "Đủ tiền lẻ đầu ca"), `moi_qr` (cần QR đã mở), `tang` (an toàn: −giá vốn, ca sau +1 khách, tối đa 8; vòng soát lỗi M3: ca sau đã đủ 8 khách — `nextShiftFull` theo `customerCount` của ngày sau — thì chữ cái giá dùng `costFull` và cho ngay `bonusRep` = +2 danh tiếng thay khách thêm; nếu tới ca đó mới đủ khách, vd Chợ phiên, `startShift` đổi khách thêm thành `bonus.rep` danh tiếng; màn Chuẩn bị chỉ ghi "thêm 1 khách" khi số khách dự báo thật sự tăng — `forecastDetail`). Thẻ Mẹo nghề `no_small_change` mở ở mọi lựa chọn.
  - `ghi_no`: khách quen (ưu tiên người không có trong ca) xin ghi nợ 20.000đ cho 2 ly trà tắc. `cho_no` (−giá vốn, +2 danh tiếng; 70% trả trong 3 ca: ngày trả bốc sẵn khi ghi sổ, tiền vào `sh.debtIn` ở đầu ca trả, tính vào lãi ca và `settleShift`; quá hạn thì ghi "chưa trả"), `tu_choi` (an toàn, không tốn gì), `tang` (−giá vốn, +5 danh tiếng). Nợ lưu ở `state.incidents.debts[]` `{id, regularId, name, amount, fromDay, dueDay, repayDay|null, status: 'cho'|'da_tra'|'quen', paidDay?}`.
  - `doi_y`: khách vừa trả tiền (phiếu mới nhất còn `cho`, chưa nấu) muốn đổi món sang món khác trong thực đơn. `doi_mon` (an toàn: sửa dòng phiếu bếp (lần chọn nhầm của dòng đó, `ticket.chonMistakes`, về 0 — mục 25), yêu cầu, phiếu thu; chênh dương thì thu thêm vào két/QR, chênh âm thì hoàn tiền; mở thẻ "Thu tiền rồi mới gửi bếp"), `tu_choi` (50% khách phật ý: phạt `{code: 'tu_choi_doi_mon', stars: 1, source: 'tinh_huong'}` khi nhận món; không tính là lỗi quầy/bếp, không làm mất "Không tì vết").
- Lưu: `state.incidents = { since, recent (≤10), log (≤20, mới nhất trước), debts, bonus: {day, customers} | null, total }`; `migrateContentM3` (trong `migrate`) thêm mặc định và lọc dữ liệu hỏng cho save v1/v2 (STATE_VERSION giữ 2). `compactHistory` ghi `incidents: [{id, choice}]` và `debtIn`.
- Giao diện: mục 13.2 (hộp thoại chặn → thời gian ca và kiên nhẫn dừng; chỉ ở tab Quầy, giữa hai khách, không chen mini-game). Tổng kết: `summarizeShift` trả thêm `incidents`, `debtIn`, `debtNotes`.

### 17.2 Sổ tay nghề — `core/notebook.js`, màn `notebook`
- `TIPS[].hint` (gợi ý cách mở thẻ), `TIP_GROUPS` (quay, bep, kho, phuc_vu), `TIP_GROUP_REWARDS[nhóm] = { gold: 20, title }` với danh hiệu mới trong `TITLES`: `thu_ngan_chu_dao` "Thu ngân chu đáo", `tay_bep_can_than` "Tay bếp cẩn thận", `giu_kho_ky_luong` "Giữ kho kỹ lưỡng", `chu_quan_tu_te` "Chủ quán tử tế".
- API: `notebookStatus(state, ctx)` → `{ total, unlocked, claimable, groups: [{ id, name, total, unlocked, complete, claimed, canClaim, reward, title, tips: [{id, title, text, hint, unlocked}] }] }`; `notebookBadge` (số nhóm chờ nhận); `claimNotebookGroup(state, groupId, ctx)` → `{ ok, groupId, reward }` | `{ ok: false, reason: 'khong_co'|'da_nhan'|'chua_xong'|'dang_ban' }` (mỗi nhóm 1 lần, ghi `state.notebook.claimed`, phát `notebook.claimed`); `randomSeenTip(state, ctx, rand)` (giao diện truyền `rand`).
- Màn: tiến độ chung, thẻ nổi bật, tab theo nhóm (chấm đỏ khi nhóm chờ nhận), thẻ chưa mở hiện mờ kèm gợi ý, nút nhận thưởng khi đủ nhóm.

### 17.3 Sổ công thức — `core/recipe-book.js`, màn `recipe-book`
- `recipeBook(state, ctx)` → `{ owned, total, entries }`: mọi món Chặng hiện tại (đã có, bán ở Chợ Công Thức, món sự kiện; M4: công thức hiếm, trạng thái `hiem`, nhãn "Công thức hiếm", `SOURCE_ORDER.hiem = 3`, ghi chú "Mảnh 2/3 · Cần Bánh tráng trộn", `entry.rare = {n, need, ready, baseOwned, missing, ings}`) + món bóng mờ Chặng 2 (`teaser`); mỗi món có biểu tượng, giá bán, giá vốn (`bookCost`), lãi, số lần nấu, điểm cao nhất, cấp thạo món + mốc kế (`masteryInfo`), huy hiệu "Không tì vết", nhãn nguồn (`sourceLabel`: "Có sẵn", "Chợ Công Thức", nhãn mùa sự kiện như "Tri ân 20/11 · 2026").
- `recipeDetail(state, recipeId, ctx)`: nguyên liệu cần (không liệt kê nguyên liệu bẫy trên kệ), các bước (tên loại mini-game khi khác tên bước, bước bắt buộc/quan trọng), ghi chú món (lời dặn, phụ thu); không lộ cách thái đúng. Mở được chi tiết mọi món trừ món bóng mờ Chặng 2 (`teaser`).
- `dialectBook(ctx)` → `[{ id, nam, bac, meaning }]`: tab "Sổ từ vùng miền", cặp từ Nam – Bắc lấy từ `SYNONYMS`.

### 17.4 Làm tròn tiền
- `money.js`: `COST_STEP = 500`, `REWARD_STEP = 1000`, `roundCost(n)` (làm tròn gần nhất bội 500đ, ≥ 0), `roundReward(n)` (làm tròn lên bội 1000đ).
- Giá vốn mỗi lần nấu (`submitChon`, sau hệ số giá vốn của ngày/Phiếu Chợ Sớm) và phí làm lại bước (`retryStep`) làm tròn 500đ; mọi thưởng Tiền quán (`resolveReward`, `incomeMoney`) và nợ vay (`takeLoan`) làm tròn 1000đ. Nguồn số lẻ trước đây (ví "804.250đ"): giá vốn lẻ (nguyên liệu lấy thừa/lấy nhầm bẫy giá 100–500đ, ví dụ 250đ; Phiếu Chợ Sớm ×0,8) và thưởng theo hệ số thu nhập tham chiếu.
- Test `money-rounding.test.mjs`: dữ liệu tiền đều là bội 500/1000đ; mô phỏng 3 hạt giống × 7 ngày thật × 3 ca (người chơi ẩu, có tình huống, quà, việc, vay) → ví luôn là bội 500đ.
- Save cũ v1/v2 có ví lẻ: `migrate` làm tròn lên bội 500đ một lần (mục 12; test `review-m3-fixes.test.mjs`).

### 17.5 Kiểm chứng M3 nội dung
- Unit: `incidents.test.mjs` (xác suất theo mức, mức Ít chỉ tình huống vui, bảo hiểm 3 ca, không lặp 5 loại, trần thiệt hại, không bật khi quầy bận/đang mini-game, hiệu ứng từng lựa chọn, nợ trả/quá hạn, khách thêm ca sau, tất định theo hạt giống, di trú save cũ), `notebook-recipe-book.test.mjs` (nhận thưởng nhóm đúng 1 lần, dữ liệu Sổ công thức và Sổ từ vùng miền), `money-rounding.test.mjs`.
- `tests/helpers/perfect-player.mjs`: `handleIncident(state, ctx, choose)` và tùy chọn `incident` của `playShift` (mặc định chọn lựa chọn an toàn). `tests/e2e/helpers.mjs`: `resolveIncidentIfShown(g, {choice})` được gọi trong các vòng chờ khách/phục vụ nên e2e cũ chạy được cả khi có tình huống.
- E2E `incident-notebook.e2e.mjs`: (1) 390×844, hạt giống 6: tình huống ghi nợ bật giữa hai khách, thời gian ca đứng yên khi hộp thoại mở, cho nợ → kết quả trong Tổng kết, Sổ tay nghề nhận thưởng nhóm một lần, Sổ công thức và chi tiết món; (2) 360×740, hạt giống 3: khách mở hàng đầu ca, mời QR, kiểm tra không tràn khung ở màn Chuẩn bị, hộp thoại, Sổ tay nghề, Sổ công thức. (3) 390×844, hạt giống 25: "Khách đổi ý" ngay sau khách thứ nhất → "Đổi món": dây phiếu chung và thẻ phiếu trong Bếp đổi sang món mới (trước đây dây phiếu vẫn hiện món cũ vì khóa vẽ lại chỉ gồm trạng thái phiếu), tiền chênh vào sổ, yêu cầu thật của khách đổi theo, nấu món mới → khách từ 4 sao.

## 18. Ráp nối M1 + M2 + M3 và kiểm chứng toàn bộ

### 18.1 Hành trình dài — `tests/e2e/hanh-trinh.mjs` (chạy tay, không nằm trong `npm run e2e`)
`node tests/e2e/hanh-trinh.mjs` (tùy chọn `SHOT_DIR=<thư mục>` lưu ảnh `NN-ten.png` 390×844 @2x + `journey-report.json`, `SEED=6`), khoảng 10–15 phút, thoát mã 1 nếu có lỗi console/trang, thao tác kẹt hoặc không đủ điều kiện lên chặng. Chromium 390×844 cảm ứng, đồng hồ giả từ 05/10/2026 07:30, máy chủ tĩnh riêng phục vụ `bus.js` kèm sổ đăng ký bus trên `globalThis` (chỉ trong phiên thử, để đếm bộ nghe).
1. Save mới (seed 6): màn mở đầu → đặt tên xe → bảng điểm danh "Tuần Khai Trương" → Chuẩn bị → service worker điều khiển trang.
2. Ngày 1: ca đầu qua giao diện (chụp từng khâu Order / Đọc lại / Thanh toán / Tính tiền / Phiếu thu, dây phiếu, kệ chọn, Thớt, đủ 6 mini-game, ra món, phiếu chấm, Tổng kết).
3. Ngày 2: tải lại trang sau khách thứ 2 → vào thẳng màn ca bán, số khách đã phục vụ và giờ ca giữ nguyên, chơi tiếp tới Tổng kết.
4. Ngày 3: Cài đặt (tình huống "Nhiều", âm lượng 60% lưu vào save) → Chợ Công Thức mua Bánh tráng trộn → nhận thưởng chuỗi → **mất mạng**, tải lại, chơi trọn ca offline; gặp tình huống "Khách đổi ý" → chọn "Đổi món" (dây phiếu đổi theo) → Tổng kết có thẻ tình huống.
5. Rút ngắn bằng lõi: người chơi hoàn hảo (`tests/helpers/perfect-player.mjs`, `attachMeta`, 3 ca/ngày thật từ 06/10) chơi tiếp tới sát điều kiện (dừng trước khi đủ; kiểm tra mua món thứ hai + 1 ca nữa thì đủ), ghi save vào khóa thật (`rev` lớn hơn để tab cũ không ghi đè), đồng hồ sang 10/10.
6. Ngày thật mới: điểm danh → Hộp thư (nhận tất cả) → Việc hôm nay (nhận việc, Rương) → Chợ Công Thức mua Cà phê sữa đá → Sổ công thức (chi tiết món, Sổ từ vùng miền) → Sổ tay nghề (nhận thưởng nhóm nếu đủ) → Cài đặt (chép mã sao lưu) → chơi thật thêm ít nhất 1 ca. Hộp mời "Quán cóc vỉa hè – sắp khai trương" có thể bật ngay khi quay về màn Chuẩn bị sau khi nhận thư/việc (danh tiếng từ thư "Việc chưa nhận") hoặc sau ca → màn `stage-up` (`data-eligible="true"`).
7. Đồng hồ sang 13/11/2026: thẻ Tri ân 20/11 "Đang diễn ra" → màn sự kiện.
Mỗi màn chính soát chữ lỗi (`undefined`, `NaN`, `{biến}` chưa điền), chữ < 13px, vùng chạm < 44px, tràn ngang.

Kết quả lần chạy ngày 30/09/2026 (12,5 phút, thoát mã 0): 4 ca chơi thật qua giao diện (ngày game 1, 2, 3 và 7; 20 khách, mỗi khách 4–5 sao; ca ngày 3 chơi khi mất mạng) + 3 ca rút ngắn bằng lõi (ngày 4–6). Đủ điều kiện lên Chặng 2 ở ngày game 7 ngay sau khi nhận Hộp thư (danh tiếng 129 → 154), mua đủ 2 món Chợ Công Thức (Bánh tráng trộn ngày 3, Cà phê sữa đá ngày 7), gặp 2 tình huống (Khách đổi ý → Đổi món, dây phiếu đổi theo; Khách mở hàng → Tặng), tải lại giữa ca giữ nguyên 2 khách đã phục vụ. 0 lỗi console/trang, 0 thao tác kẹt; không có chữ lỗi, chữ < 13px, vùng chạm < 44px hay tràn ngang ở 12 màn đã soát. Đo ở màn Chuẩn bị (sau khi dọn rác) trước ca 1 → sau ca 3 → cuối hành trình: bộ nghe bus 3 → 3 → 3, `window` 18 → 18 → 18, `document` 3 → 3 → 3, vòng rAF 1 → 1 → 1, heap JS 3,4 → 5,1 → 5,7 MB (tăng theo lịch sử ca/đánh giá trong save và ElementHandle Playwright đang giữ).

### 18.2 Hiệu năng thô (30/09/2026, Chromium headless, máy chủ tĩnh cục bộ HTTP/1.1)
- Dung lượng lúc mở game: 90 module JS 818 KB + 5 tệp CSS 118 KB chưa nén (95 yêu cầu, độ sâu import tĩnh 13 tầng); nén gzip còn khoảng 343 KB truyền. **Vượt ngân sách "JS + CSS dưới khoảng 250 KB chưa nén"** của đặc tả (mục 13): phần lớn là dữ liệu lời thoại, hình SVG vẽ tay (`art.js` 45 KB), chú thích tiếng Việt; không có bước build nên không rút gọn. Ưu tiên nếu cần giảm: tách `art.js`/`dialogue.js` nạp sau, bỏ chú thích khi phát hành bằng công cụ ngoài game.
- Tải lần đầu tới màn mở đầu (không service worker, tắt bộ nhớ đệm): máy 0,37 s; "4G" giả lập (trễ 80 ms, 9 Mb/s) 1,9 s (gzip 1,7 s); "3G" (trễ 300 ms, 1,6 Mb/s) 7,4 s (gzip 6,2 s — nghẽn ở 6 kết nối HTTP/1.1 cho 95 yêu cầu; host HTTP/2 như GitHub Pages, Cloudflare Pages nhanh hơn). Thử `<link rel="modulepreload">` cho mọi module: chỉ bớt khoảng 5% nên không dùng.
- Lần mở sau (service worker, mất mạng): 0,25 s tới màn mở đầu.
- Khung hình khi chơi đủ 6 mini-game (2 khách đầu ngày 1): khoảng cách khung trung bình 16,7–17,3 ms (khoảng 60 hình/giây), p95 16,8 ms, cả khi giả lập CPU chậm ×4. Long task (2 lần đo): CPU thường 0–1 (≤ 72 ms), CPU ×4: 6–9 (dài nhất 91–94 ms), đều rơi vào lúc chuyển màn/mở phiếu; trong lúc chơi mini-game không có khung > 50 ms trừ 1 khung 67 ms lúc vừa mở bước Chọn ở CPU ×4. Số lượt gọi `requestAnimationFrame` mỗi khung: 1 ngoài mini-game (vòng lặp ca), 2 khi đang chơi (thêm `frameLoop` của mini-game; ở Canh lửa/Rót đo được 3 vì trình tự động của Playwright thăm dò bằng `polling: 'raf'` trên chính trang) → không chồng vòng rAF.
- Rò rỉ sau 3 ca (hành trình, đo ở màn Chuẩn bị sau khi dọn rác): bộ nghe bus 3 → 3, bộ nghe `window` 18 → 18, `document` 3 → 3, vòng rAF 1 → 1, phần tử DOM của màn Chuẩn bị 214–301 (theo số thẻ hiện). Số "phần tử tách rời còn trong heap" ở hành trình tăng giảm theo số ElementHandle Playwright đang giữ (hạ về khi tải lại trang) nên được đo riêng ở e2e `stability.e2e.mjs`: chuyển qua lại 7 màn con + hộp thoại 20 vòng bằng thao tác trong trang → phần tử tách rời 11 → 11, bộ nghe bus/window/document và số phần tử màn Chuẩn bị giữ nguyên.

### 18.3 Lỗi tìm thấy và đã sửa khi ráp nối
- **Dây phiếu không đổi món sau "Khách đổi ý → Đổi món"** (`ui/components/ticket-rail.js`): khóa vẽ lại chỉ gồm id/trạng thái phiếu nên phiếu đã sửa vẫn hiện món cũ tới khi đổi trạng thái; thêm dòng phiếu (món, số lượng, ghi chú) vào khóa, cả khóa dây phiếu của `ui/screens/kitchen.js`. E2E `incident-notebook` (3).
- **Game lùi ra khỏi trang khi chuyển màn nhanh** (`ui/app.js`, mục 13): bấm "‹ Chuẩn bị" rồi mở ngay màn con khác trong lúc `history.back()` chưa xong làm lệch sổ lịch sử; nay chờ lần lùi xong rồi mới đẩy mục mới. E2E `stability`.
- **E2E chờ service worker không chờ gì** (`tests/e2e/pwa-backup.e2e.mjs`): `page.waitForFunction` với hàm `async` luôn "đúng" ngay (Playwright coi Promise là truthy); chuyển sang `waitController` trong `tests/e2e/helpers.mjs` (thăm dò bằng `page.evaluate`). Thực tế: sau lần mở đầu cần khoảng 0,3 s để service worker cất đủ 101 tệp; tải lại khi mất mạng trước lúc đó thì trình duyệt báo mất mạng như mọi trang web.
- **Thông báo nhận thưởng chuỗi gộp nhiều bước quá dài** (`ui/components/chain-card.js`): nút "Nhận N bước" nối thưởng từng bước ("+5.000đ · Thẻ Mẹo nghề mới · +5.000đ · Thẻ Mẹo nghề mới · …", 7 dòng); nay cộng gộp (`mergeRewards` cộng tiền/Muỗng Vàng, đếm thẻ Mẹo nghề: "+85.000đ · 25 Muỗng Vàng · Danh hiệu … · 6 thẻ Mẹo nghề mới"). Unit `ui-rewards.test.mjs`.
- Mở Hộp thư thì cất thông báo "Vừa có N thư mới" (bật ở màn Chuẩn bị, che đầu màn Hộp thư).
- Tài liệu: lưới lối vào màn Chuẩn bị là 4 cột (4 + 3 ô, cả ở 360px), ô chỉ ghi tên; `SUB_SCREENS` thêm `notebook`, `recipe-book` (chỉ là danh sách tham khảo, thực tế dùng `isSubScreen`).

### 18.4 Ghi nhận, chưa sửa
- Ngày 1–2 phần lớn khách tiền mặt đưa vừa đủ: giá 10.000đ/20.000đ trùng mệnh giá, và nhánh "đưa tờ nhỏ nhất ≥ tổng" (45%, đặc tả mục 4.3) thành vừa đủ. Seed 6: ngày 1–2 chỉ 1/8 khách cần thối, nên bước 2 chuỗi "Ngày đầu ra phố" ("Thối đúng 3 lần") thường tới ngày 3–4 mới xong. Đúng đặc tả nhưng nên xem lại ở `docs/can-bang.md` (vd bỏ nhánh "tờ nhỏ nhất" khi tổng đúng bằng một mệnh giá).
- Đủ điều kiện lên chặng có thể xảy ra ngoài ca (nhận thư/việc cộng danh tiếng): hộp mời hiện khi quay về màn Chuẩn bị, không phải lỗi.
- GitHub Pages cần tệp rỗng `.nojekyll` ở gốc (Jekyll bỏ qua `src/ui/minigames/_util.js`); tệp ở ngoài phạm vi sửa của vòng này. (Đã thêm ở mục 27.)
- Tên dài trong dải "Chờ món" (ô rộng 62px) bị cắt, vd "Bạn N…" (tên đầy đủ ở `title`).

### 18.5 Vòng soát lỗi M3 (tóm tắt thay đổi)
- **Dữ liệu người chơi**: save v1/v2 ví lẻ làm tròn lên bội 500đ khi nạp (giữ bất biến ví ca); ca dở không đủ cấu trúc → hủy ca, hoàn giá vốn, báo (mục 12, 16.1); bản lưu không đọc được được cất nguyên chuỗi sang `<khóa save>.hong.<ms>` trước lần ghi đầu; bộ nhớ bị chặn/đầy → dải cảnh báo "Chưa lưu được tiến trình" + nút sao lưu (mục 12); mã từ bản mới hơn → cảnh báo phần sẽ mất (16.2); bước chuỗi vượt dữ liệu → kẹp (không còn `TypeError` nuốt mất `settleEvents`, `updateStageUp`).
- **PWA**: tài liệu và chú thích `sw.js` nói đúng giới hạn "bản mới tự kích hoạt khi đóng hết tab"; ca ghi `appVersion`, mở lại ở bản khác thì báo và chơi tiếp; e2e mới ở máy chủ không phải localhost; hai chỗ `waitForFunction` với Promise đổi sang `pollEval`.
- **Sao lưu**: chỉ ghi "đã sao lưu" khi mã thật sự được cất (16.2).
- **Tình huống**: ly trà "mở hàng" khi ca sau đã đủ khách → +2 danh tiếng, chữ ghi rõ; màn Chuẩn bị không hứa khách thêm khi không thêm được (17.1).
- **Mẹo nghề**: công tắc chỉ tắt thẻ nổi, Sổ tay nghề vẫn đầy (mục 4).
- **Giao diện**: Tính tiền ngày 1 khách đưa vừa đủ → lời Dì Sáu "khỏi thối", khay ghi "Không cần thối tiền", khay dư thì cảnh báo đỏ "Đang thối dư"; nhãn phiếu chấm `err-tag--quay`/`err-tag--bep` (không trùng class bố cục `.counter`/`.kitchen`, chữ trắng); thẻ công thức "×2 (chạm 1 lần)" + huy hiệu ×n trên ô đã chọn và trong rổ; lời Dì Sáu ngày 1 trên Thớt đặt ngay dưới tên thớt; dòng phiếu vừa ghi tự cuộn lên trên thanh nút; kệ 12 ô gọn ở màn thấp (360×740 thấy đủ 3 hàng); lớp vỏ mini-game phin/nồi/tô (mục 6); nhãn nhát thái theo ngưỡng ("Chuẩn!", "Hơi lệch", "Lệch", "Lệch xa", không còn "px", có test quét chuỗi); Tiền quán từ 1 triệu ghi gọn "1,16tr" ở màn Chuẩn bị và viên tiền đầu màn meta; chữ trong ca tối thiểu 13px, ô tờ trong khay ≥ 44px, chữ xanh dùng `--green-ink` (#2a6e3a, ≥ 5:1); thông báo nổi trong ca không che thanh 4 khâu, gộp tiến độ Việc hôm nay, không báo tiến độ việc lúc hướng dẫn ngày 1; dây phiếu: ghi chú 1 dòng cắt "…" trong khung riêng (không lòi dấu); Tổng kết "Sao ca này" và "Sao trung bình (30 lượt gần nhất)", dưới 5 lượt ghi "tính tạm"; câu Giới thiệu viết lại.
- **Kiểm chứng**: `tests/unit/review-m3-fixes.test.mjs` (10 test), `banned-words` thêm quét "px"; e2e `save-safety.e2e.mjs` (5 kịch bản), `review-m3-ux.e2e.mjs` (2 kịch bản: ngày 1 ở 360×740 — Tính tiền vừa đủ, dòng phiếu, kệ ×2, lời Dì Sáu trên Thớt, nhãn phiếu chấm chữ trắng, thông báo nổi không che thanh 4 khâu; chép mã thất bại không ghi mốc), `pwa-backup.e2e.mjs` thêm 1 kịch bản và cấp quyền bộ nhớ tạm cho Chromium thử nghiệm (như trang HTTPS); `hanh-trinh.mjs` soát bố cục cả các khâu trong ca bán. Các e2e so `page.$(…)` với `null` đổi sang so boolean: khi hỏng, `assert` in cả ElementHandle làm tiến trình thử ngốn bộ nhớ tới bị giết (một kịch bản từng mất tên trong báo cáo). Kết quả 30/09/2026: 271 unit test, 33 kịch bản e2e xanh, e2e khoảng 18 phút; `node tests/e2e/hanh-trinh.mjs` 12,75 phút, thoát mã 0, 0 lỗi console/trang, 0 thao tác kẹt, không còn lỗi bố cục ở 12 màn và 9 khâu trong ca bán (soát vùng chạm theo kích thước bố cục, không tính hiệu ứng thu nhỏ đang chạy; bỏ qua chữ cỡ 0 cố ý ẩn; dòng mở thẻ công thức trên Thớt nâng lên 44px).

## 19. M4 bước 1–3: tip mới, sổ tiền sự kiện, tần suất sự kiện "dày"

Thiết kế: `docs/tham-khao/m4-thiet-ke.md` mục A, B.1, D; tần suất theo quyết định của người dùng ("dày", thay bảng D). Ở bước này save vẫn `STATE_VERSION = 2` (bước 7 nâng lên 3, mục 22) (chỉ thêm trường, `migrateContentM3` điền mặc định; ca dở từ bản cũ chơi tiếp được: mọi chỗ đọc `ledger.eventIn/eventOut`, `sh.incidentQueue`, `sh.eventNotes`, `sh.rareRolls`, `sh.dayKey` đều có mặc định).
- **Tip (A)**: `tipFor(stars, bill, balance)`, `kitchen.billOf(customer, recipes)`, `BALANCE.tipMinBill 20000`, `strictFiveStarRep 1`, bỏ `tipBonus` và `mods.tipMul`. Phiếu chấm: `score-sheet-tip` "Tip: +5.000đ" hoặc "Tip 0 (hóa đơn dưới 20.000đ)" / "Tip 0 (khách chưa trả tiền thật)" khi khách 5 sao mà không có tip. Chuỗi "Quầy chuẩn" 5 khách → `sh.rareRolls` (lượt Giỏ chợ, dùng ở bước hàng hiếm). Ngày lãnh lương → `lineCountWeights`.
- **Sổ tiền sự kiện (B.1)**: `ledger.eventIn/eventOut`, `economy.eventMoneyIn/eventMoneyOut` (trần mỗi sự kiện qua `cap`, trần mỗi ngày thật qua `state.incidents.day`), `incidentGainCap`; Tổng kết thêm dòng "Tiền từ sự kiện", "Phạt, chi sự kiện" và danh sách khoản tiền sự kiện (`summary-event-money`); `compactHistory` có `eventIn`, `eventOut`. Bus: `event.money {id, amount, capped}`, `event.fined {id, amount, spared, fine}`.
- **Loại sự kiện**: `kind` 'tot' | 'chon' | 'xau' cho mọi sự kiện ngày và tình huống; luật nhịp ở mục 17.1 (M4) và 15.8.
- **Tần suất (D)**: sự kiện ngày 0,65 + bảo hiểm 1 ngày (thực khoảng 74%); tình huống tối đa 2 mỗi ca, thực khoảng 80% / 60% / 40% ca có ≥ 1 (Nhiều / Vừa / Ít). Cài đặt đổi tên "Tần suất sự kiện".
- **Kiểm chứng**: `tests/unit/m4-tip.test.mjs` (bảng tip sao × hóa đơn, `billOf` với ảnh giả / hoàn tiền / báo thiếu / phụ thu, phục vụ thật, khách khó tính, lượt Giỏ chợ theo chuỗi và Hỗ trợ tính tiền, Ngày lãnh lương), `tests/unit/m4-frequency.test.mjs` (tỉ lệ thực sự kiện ngày 0,70–0,78 trên ≥ 2.000 ngày, 3 mức; bốc tuần tự khớp "Ngày mai"; loại xấu, cách quãng 7 ngày, mức Ít; tỉ lệ tình huống 3 mức trên ≥ 2.000 ca; tối đa 2, cách ≥ 2 khách, không 2 xấu; luật nhịp, gainCap; chơi thật; sổ tiền sự kiện, trần ngày, bất biến ví). E2E đổi seed theo `node tools/tim-seed.mjs` (kiểm seed đang dùng, tìm seed mới bằng lõi thật): `incident-notebook` (1) seed 54 (ghi nợ, không có tình huống thứ hai), (3) seed 17 (khách đổi ý); `m2-ui` seed 3 và `incident-notebook` (2) seed 3 vẫn đúng. Kết quả 30/09/2026: 286 unit test, 33 kịch bản e2e xanh (e2e khoảng 19 phút).

## 20. M4 bước 4–5: tám sự kiện ngày mới, tám tình huống chạy theo dữ liệu

Thiết kế: `docs/tham-khao/m4-thiet-ke.md` mục B.2, B.3, F.1 bước 4–5; tần suất theo quyết định của người dùng ("dày", mục 19). Ở bước này save vẫn `STATE_VERSION = 2` (bước 7 nâng lên 3, mục 22) (chỉ thêm `incidents.warn`, `rare` tối thiểu; ca dở từ bản cũ thiếu khóa `mods` mới, `sh.eventCap`, `sh.eventCostExtra` vẫn chơi và tổng kết được).

**Sự kiện ngày (`data/day-events.js`, lõi `events.js`, `shift.js`, `order.js`, `kitchen.js`)**

| id | Loại, từ ngày, w | Hiệu ứng mặc định | Lựa chọn (màn Chuẩn bị) |
|---|---|---|---|
| `hoi_thi_xe_sach` | tốt, 4, 9 | `endCheck stars`: sao TB ca ≥ 4,5 → Giải Nhất +20.000đ +5 danh tiếng; ≥ 4 → Khuyến khích +10.000đ +2 | — |
| `don_van_phong` | tốt, 4, 9 | — | `nhan_don` 0đ: `bigOrder` thêm 1 khách lấy 3 ly Trà tắc giữa ca; đạt ≥ 4 sao +5.000đ |
| `tai_tro_dai_ly` | tốt, 6, 7 | — | `nhan_tai_tro` 0đ: `endCheck portions` Trà tắc (kể cả món dùng Trà tắc làm nền): ≥ 3 ly +15.000đ, ít hơn +5.000đ |
| `tat_gia` | xấu, 5, 6 | `ingCostMul {tac: 2}` (Trà tắc +1.200đ mỗi ly; tổng phần tăng ≤ lossCap, `sh.eventCostExtra`) | — (Dì Sáu gợi ý Phiếu Chợ Sớm, giảm cả phần tăng) |
| `tien_dien_nuoc` | xấu, 5, 5 | `fixedCostDelta 5000` (`sh.fixedCost` 25.000đ) | — |
| `cup_dien` | chọn, 5, 6 | khách ×0,85; món có đá (Trà tắc, Cà phê sữa đá, Chè bưởi) ×0,5; `noQrSpeaker` | `mua_da_cay` 10.000đ (`prepCost`): chỉ còn `noQrSpeaker` |
| `trat_tu_do_thi` | xấu, 5, 6 | `queueFine {at: 3, fine: 20000}`: nhắc trước ở 2 người (`event.warn`), chạm 3 người phạt 1 lần (trần min(20.000đ, lossCap) + trần ngày), mở thẻ "Giữ lối đi" | `thu_gon` 0đ (an toàn): `queueMax 2`, người đến sau đi ngang (`sh.eventMissed`) |
| `kiem_tra_attp` | chọn, 6, 6 | `endCheck hygiene` (lỗi `chua_so_che`, `bo_qua`, `hong`, `bay`): sạch +3 danh tiếng; có lỗi lần đầu nhắc nhở (`state.incidents.warn`), tái phạm trong 14 ngày game phạt 20.000đ (trần) | `chuan_bi` 10.000đ (`prepCost`): chắc chắn đạt, +5 danh tiếng |

- Khóa hiệu ứng mới đi qua `prepareShiftMods` (bản sao thuần vào `sh.mods`) và `startShift`: `sh.fixedCost += fixedCostDelta`, `sh.rareRolls = mods.rareRolls` (+ lượt theo chuỗi Quầy chuẩn), khách `bigOrder` chèn giữa lịch (không phải khách đầu, đánh số lại k1…kN, `c.bigOrder = true`, trong trần `eventCustomerCap`), `sh.eventCap = {loss: incidentLossCap, gain: incidentGainCap}` chốt lúc mở ca. `advance`: `queueMax` (min với `BALANCE.queueMax`), `queueFine` (`checkQueueFine`), Loa báo tiền chỉ tự xác nhận khi `order.qrSpeakerOn(state)` (có loa và không `noQrSpeaker`; `confirmQr` cũng chỉ chặn ảnh giả khi loa chạy). `kitchen.submitChon`: `ingCostMul` (không áp khi nấu thử).
- `finishShiftEvents(state, ctx)` (trong `endShift`, trước `summarizeShift`): giải/tài trợ/tiền đúng hẹn qua `eventMoneyIn` (trần `sh.eventCap.gain` + trần ngày thật), phạt ATTP qua `eventMoneyOut` (trần `sh.eventCap.loss` + trần ngày), danh tiếng vào `sh.reputationGain`, ghi chú `eventNote` cho khoản đã nằm trong sổ (chi phí cố định, giá vốn tăng, khách đi ngang) với `fx` (chữ hiệu ứng ngắn). Lượt Giỏ chợ và quà Khách lạ: bước hàng hiếm.
- Tất cả tiền chọn ở màn Chuẩn bị (Căng bạt, Mua đá cây, Chuẩn bị đón đoàn) đi qua `mods.prepCost`, không tính vào lãi ca. Mức Ít không bốc loại chọn/xấu (không có sự kiện phạt).
- Giao diện: thẻ sự kiện ở màn Chuẩn bị ghi loại ("Có lợi" / "Có lựa chọn" / "Cần phòng trước", `data-kind`), các dòng hiệu ứng (`prep.dayEffectLines`: chi phí cố định, giá nguyên liệu, Loa tắt, luật hàng chờ, đơn đặt trước, chấm cuối ca, lượt Giỏ chợ khi có `RARE_CONFIG`), dòng cảnh báo đã bị nhắc nhở (`day-event-warn`), lựa chọn 0đ ghi "miễn phí"; lời Dì Sáu theo từng sự kiện (`DIALOGUE.diSau.dayEvent`); ca bán: `event-warn-toast`, `event-fine-toast` (phạt trong ca, ghi rõ nguyên nhân; phạt lúc kết ca để Tổng kết ghi), thẻ "Đơn đặt trước" ở hàng chờ (`queue-order-tag`), quầy QR báo "Loa báo tiền đang tắt" (`qr-speaker-off`); Tổng kết: mỗi khoản một dòng `tên: tiền, hiệu ứng · lời giải thích` (`summary-event-money`, `data-event`, `data-money`), thẻ "Ngày mai" cảnh báo nhắc nhở. Dự báo khách (`prep.forecastDetail`) cộng khách đặt trước. Icon SVG 64×64: `hoi_thi_xe_sach`, `don_van_phong`, `tai_tro_dai_ly`, `tat_gia`, `tien_dien_nuoc`, `cup_dien`, `trat_tu_do_thi`, `kiem_tra_attp` (`art.js`).

**Tình huống trong ca (`data/incidents.js`, loại 'chung' trong `core/incidents.js`)**

- Dữ liệu: `generic: true`, `fromDay`, `needs` {qr, lua (thực đơn có bước Canh lửa không phải phin), soldPortions (đủ n phần đã bán mới bật), ownsRare, stockRoom}, `recipeId`/`qty` (món bán hoặc mời), `who` (chuỗi hoặc {name, gender, persona} → hình minh họa khớp người), `art` ({bill} | {persona, gender}); lựa chọn: `needs` ('qr' | {room: n}), `cost`, `costNoRare`, `hint` {upgrade, text} (lựa chọn "xanh" nhờ hiện vật), `outcomes` [{p, sale 'cash'|'qr', money (số | {perSold, max}), fine, spend, cogs 'mon'|số, rep, rare, fragment, waitMul, result, resultNoRare}].
- Lõi: `genericMax(ctx, sh, d)` → {maxLoss, maxGain, maxFine} (thiệt hại = tiền mất + tiền chi + giá vốn − tiền bán − tiền thưởng, lớn nhất trên mọi kết quả), `choiceExpectedMoney(ctx, sh, d, choiceId, sold?)`; `detail` bốc người, món, số bốc kết quả `roll` (1 lần, lưu trong tình huống → tải lại không đổi, mọi lựa chọn dùng chung, vd tờ tiền thật/giả không phụ thuộc cách chọn), nguyên liệu hiếm (nếu cần). `apply`: tiền bán (tiền mặt vào két đúng số / QR) + giá vốn, tiền thưởng `eventMoneyIn` (trần `inc.gainCap` + ngày), tiền mất `eventMoneyOut` fine (trần `inc.cap` + ngày, vượt → Dì Sáu đỡ giùm), tiền chi `eventMoneyOut` không phải phạt (chỉ trần `inc.cap`), danh tiếng, hàng hiếm/mảnh, `sh.waitBudgetMul` (`order.waitBudgetFor` cho phiếu sau). Ghi chú tiền của tình huống mang `source: 'incident'` (Tổng kết không lặp lại; bus không báo nổi).
- `incidentCandidates` thêm `fromDay` của từng tình huống; `resolveIncident` → `effects` thêm `gain, fine, spend, spared, capped, rare [{id, name, n}], fragment {recipeId, name, n} | null` (và `waitMul`), `loss` = giá vốn + tiền mất + tiền chi − tiền bán − tiền thưởng; `incident.resolved` thêm `gain, fine, spend`; `incidentView` thêm `art`, `generic`, lựa chọn thêm `hint`, `green`.
- Hàng hiếm tối thiểu (tạm ở bước 5; **bước 6 đã chuyển sang `core/rare.js`**, `incidents.js` xuất lại các hàm này, xem mục 21): `ensureRare(state)` → `state.rare = {stock, fragments}`, `rareIngredientIds(ctx)` (INGREDIENTS `rare: true`), `rareRoom`, `ownsRareRecipe` (RECIPES `source: 'hiem'`), `grantRareStock` (phát `rare.gained`), `grantRareFragment`. Chưa có dữ liệu hàng hiếm → `khach_que_gui_qua`, `nguoi_ban_dao` không được bốc; `khach_quen_vi` lựa chọn báo loa dùng `costNoRare`/`resultNoRare`.

| id | Loại, từ ngày, w | Lựa chọn (an toàn *) | Kỳ vọng tiền |
|---|---|---|---|
| `tien_nghi_gia` | xấu, 5, 0,7 | *Soi kỹ; Mời QR (cần QR); Nhận luôn (50% mất 10.000đ + 3.000đ) | +3.500 / +7.000 / −3.000 |
| `shipper_chuyen_khoan` | chọn, 5, 1,2 (cần QR) | *Chờ tiền về (xanh khi có Loa); Giao luôn | +10.500 / +9.000 |
| `gas_het` | xấu, 5, 0,7 (cần bếp gas) | Mua bình −12.000đ (chi mua); *Mượn bếp −3.000đ, +1, chờ món ×0,9 | −12.000 / −3.000 |
| `khach_quen_vi` | tốt, 3, 1 | *Cất giữ (70% +10.000đ, +2); Báo loa (+1, 60% +1 phần hàng hiếm) | +7.000 / 0 |
| `ve_chai` | tốt, 3, 1 (đã bán ≥ 3 phần) | *Bán (1.000đ/phần, tối đa 8.000đ); Cho (+3) | ≤ +8.000 / 0 |
| `doan_khach_hoi_duong` | tốt, 4, 1 | *Chỉ đường (+2); Mời mua 2 ly (+20.000đ −6.000đ) | 0 / +14.000 |
| `khach_que_gui_qua` | tốt, 3, 1 (kho còn chỗ) | Mời trà (−3.000đ, +2, +1 hiếm); *Nhận (+1 hiếm) | −3.000 / 0 |
| `nguoi_ban_dao` | chọn, 4, 1,2 (có công thức hiếm, kho còn chỗ) | Mua 2 (−8.000đ); Mua 1 (−4.000đ); *Hẹn bữa khác | −8.000 / −4.000 / 0 |

Ba tình huống M3 gắn nhãn: `khach_mo_hang` tốt (w 1), `ghi_no` chọn (w 1,2), `doi_y` chọn (w 1,2). Tỉ lệ loại ở mức Vừa theo trọng số: tốt 44,6%, chọn 42,9%, xấu 12,5%; mức Ít 5 loại tốt. Thẻ Mẹo nghề 20 → 24 (Quầy 14 / Bếp 5 / Kho 2 / Phục vụ 3): `soi_tien` (trigger `tien_gia`), `cho_tien_ve` (`cho_tien_ve`), `kiem_hang` (`kiem_hang`, mở ở phiên hàng hiếm), `giu_loi_di` (`lan_chiem`, Trật tự đô thị). Giao diện: `effectChips` thêm "tiền thưởng", "mất tiền", "chi mua", "Dì Sáu đỡ giùm", hàng hiếm, mảnh, "Bếp chậm hơn" (`data-fx`); hình minh họa theo `view.art`; lời nhắc xanh `incident-hint-<id>`; Tổng kết `incidentLines` ghi đủ các khoản.

**Kiểm chứng**: `tests/unit/m4-events.test.mjs` (dữ liệu, tần suất với dữ liệu thật, từng khóa hiệu ứng, chấm cuối ca, trần gainCap / trần ngày, mức Ít, lưu/tải ca dở), `tests/unit/m4-incidents.test.mjs` (1 lựa chọn an toàn, xác suất = 1, trần B.3, kỳ vọng từng lựa chọn ±500đ, từng tình huống, hàng hiếm với dữ liệu giả, tải lại không đổi kết quả, trần ngày, nhịp và tỉ lệ 3 mức với dữ liệu thật, chơi thật chọn ngẫu nhiên). E2E đổi seed (`node tools/tim-seed.mjs`): `incident-notebook` (1) seed 29, (2) seed 8, (3) seed 55; `m2-ui` seed 3 vẫn đúng.



## 21. M4 bước 6: nguyên liệu và công thức hiếm

Thiết kế: `docs/tham-khao/m4-thiet-ke.md` mục C, F.1 bước 6; 3 khung giờ phiên hàng theo quyết định của người dùng. Ở bước này save vẫn `STATE_VERSION = 2` (bước 7 nâng lên 3, mục 22) (thêm `state.rare` qua `defaultMeta()` + `save.migrateRare`; ca dở từ bản cũ thiếu `sh.rareMenu`, `sh.rareNotes` vẫn chơi và tổng kết được, chỉ là không có món hiếm). Nguyên liệu hiếm không phải tiền: không đụng bất biến ví.

**Dữ liệu**
- `data/rare.js`: `RARE_CONFIG` { fromDay 3, stockMax 6, overflowGold 2 (Muỗng Vàng mỗi phần dư), dailyCap 6 phần, dailyFragCap 3 mảnh (mỗi ngày thật, mọi nguồn trừ hàng tự bỏ tiền mua và phần thưởng cố định của thư/chuỗi), fragmentsNeed 3, unlockGrade 'duoc', fragmentPityAfter 3, basket { ingredient 0.4, pityAfter 2 }, stall { base 1, bonusAt 90, fragmentAt 75, fragmentRate 0.5, shelfSize 9, par 6 }, stranger.gifts [5★ 2 phần, 4★ 1 phần, 3★ 1 mảnh], orderWeight 1.5, repPerGood 1 }; `STALLS` (Chợ sớm 05:00–09:00 Cô Ba: trứng gà ta, muối tôm · Xe ba gác trưa 11:00–13:30 Chú Tư: mật ong rừng, trứng gà ta · Gánh đặc sản tối 17:30–21:00 Anh Tám: cà phê hạt, khô mực; mỗi phiên `persona/gender` cho hình, `fillers`); `STRANGERS` 5 khách lạ `{id, name, gender, persona, region, self, ing, thanks}` (Cụ bà quê Cà Mau · mật ong, Anh ngư dân Phan Thiết · khô mực, Chị buôn cà phê Ban Mê, Chú Năm Tây Ninh · muối tôm, Cô Bảy nuôi gà thả vườn · trứng gà ta). Tệp nằm trong danh sách tệp chữ hiển thị của `banned-words.test.mjs`.
- Nguyên liệu hiếm (`ingredients.js`): `mat_ong_rung` ★2 3.300đ, `trung_ga_ta` ★1 3.500đ/quả (2 quả mỗi phần), `muoi_tom_tay_ninh` ★1 1.500đ, `kho_muc` ★2 4.100đ, `ca_phe_bmt` ★2 3.700đ; `traps` = hàng thường dễ nhầm (bẫy ở phiên hàng). 5 icon SVG 64×64 có ngôi sao vàng (`art.js`, `rareStar`).
- Công thức hiếm (`recipes.js`): `tra_tac_mat_ong` (15.000đ, vốn 6.000đ, par 19: bỏ Nêm đường, thêm "Rót mật ong" rot/`to`), `banh_mi_trung_ga_ta` (25.000đ, 11.000đ, par 26: thêm "Nướng giòn bánh mì" lua/chảo), `banh_trang_tron_tay_ninh` (25.000đ, 12.000đ, par 34: khô mực thay khô bò, "Xé khô mực" cha, Nêm thêm muối tôm), `ca_phe_muoi` (20.000đ, 6.000đ, par 26: cà phê hạt, muối, "Đánh sữa muối" cha, "Rưới lớp sữa muối" rot/`to`). Lãi/giây nấu 474 / 538 / 382 / 538đ ≤ trần 550đ. `SPOKEN.dishes` có tên gọi thường ngày ("trà tắc mật ong", "bánh mì trứng gà ta", "bánh tráng trộn khô mực", "cà phê muối"); `makeSpeech` nhận thêm `self` (cách tự xưng của khách lạ, vd "bà").

**Lõi `core/rare.js`** (thuần; giờ thật qua `nowInfo`/`sh.dayKey`; ngẫu nhiên tất định)
```js
export function rareConfig(ctx) ; rareActive(ctx) ; rareIngredientIds(ctx) ; rareRecipeIds(ctx) ; isRareIngredient(ctx, id) ; isRareRecipe(recipe)
export function recipeRareNeed(recipe) → {ingId: n} ; rareBaseIds(recipe) ; rareValue(ctx, id) → giá quy đổi 1 phần
export function ensureRare(state) ; rareToday(state, key) (sang ngày thật mới mở sổ mới; ngày cũ hơn → giữ sổ đang có)
export function rareStock(state, id) ; rareRoom(state, id, ctx) ; rareDayRoom(state, ctx, key) → { portions, frags }
export function grantRare(state, id, n, ctx, { bought, dayCap = true, dayKey, source }?) → { id, name, got, spoons, over }   // phát 'rare.gained' {id, n, spoons, source, bought}
export function grantFragment(state, n, ctx, { dayKey, recipeId, source, dayCap = true }?) → { recipeId, name, n, spoons, list } | null   // phát 'rare.fragment'
export function grantRareStock(...) → got ; grantRareFragment(...) → { recipeId, n } | null   // bản gọn (incidents.js xuất lại)
export function fragmentCandidates(state, ctx) → [recipeId]  // chưa có, đủ món nền, chưa đủ mảnh; món gom dở trước
export function rareUnlockInfo(state, recipeId, ctx) → { owned, baseOwned, bases, n, need, ready } ; gradeUnlocks(grade, ctx) ; ownsRareRecipe(state, ctx)
export function rareNeedOrder(state, ids, ctx)   // kho đầy xuống cuối; dùng cho món hiếm đã có > món đang gom mảnh > còn lại; ít hàng trước
export function rarePortions(state, recipe, used?) ; rareMenuFor(state, ctx) ; rareCommitted(state, ctx, { skipDraftIndex, withDraft }?)
export function rareLeft(state, recipeId, ctx, opts?) → số phần còn ghi phiếu được (món thường Infinity) ; rareLinesFit(state, lines, ctx, { withDraft }?)
export function consumeRare(state, recipeId, qty, ctx) → { ingId: n }   // phát 'rare.used' ; rareReputation(dishes, ctx) ; baseLineOf(line, R)
export function capRareRequests(state, list, ctx) → [khách bị đổi]   // vòng tất định: dòng vượt tồn kho đổi về món nền
export function basketOdds(state, ctx, dayKey?) → { ingredient, fragment, pity, pityAfter, sure, fragSure, allIng, allReason: null|'het_muc_ngay'|'can_mon_nen'|'du_manh' } ; rollBasket(state, ctx, holder, { dayKey }?)
export function stallList(ctx) ; stallStatus(state, nowInfo, ctx) → { active, dayKey, minutes, locked, tooEarly, inShift, pending, current, next, tomorrow, stalls }
export function stallGame(state, stall, dayKey, ctx) → { recipe (dựng tạm cho bước Chọn), step, goods, traps, shelf }   // kệ xáo theo (save, ngày thật, phiên)
export function startStall(state, id, nowInfo, ctx) → { ok, resumed, stall, game, draft: {picked, mistakes} } | { ok: false, reason: 'dang_ban'|'lui_gio'|'chua_toi_ngay'|'ngoai_gio'|'da_nhan'|'khong_co' }
export function saveStallDraft(state, { picked, mistakes }) → { ok, picked, mistakes } ; stallDraft(state, shelf?) → { picked, mistakes }   // soát lỗi M4: lưu rổ lựa dở mỗi lần chạm (mistakes chỉ tăng)
export function finishStall(state, { score, picked, mistakes }, nowInfo, ctx) → { ok, stallId, name, score, got, fragment, spoons, tipId, wrong } | { ok: false, reason }   // phát 'rare.stall'
   // soát lỗi M4: lần nhầm = max(lần nhầm đã lưu, gửi lên); điểm ≤ 100 − 15 × lần nhầm; đã từng nhầm → wrong, thẻ kiem_hang
export function cancelStall(state) ; pickStranger(state, sh, list, ctx, dayKey) → { index, def } | null ; strangerGift(stars, ctx)
export function finishShiftRare(state, ctx) → [ghi chú]   // endShift, sau finishShiftEvents, trước summarizeShift; 1 lần mỗi ca (sh.rareFinished)
export function rareOverview(state, nowInfo, ctx) → { active, fromDay, stock, fragments, total, today, basket, stockMax, overflowGold }
// clock.js thêm vnMinutes(ms) (phút trong ngày giờ Việt Nam), hhmmToMinutes('HH:MM')
```
- Phiên hàng: `from ≤ giờ < to` (giờ Việt Nam, theo `nowInfo.trusted`); khóa khi `nowInfo.rewind`; chỉ ngoài ca; từ ngày game 3; mỗi phiên 1 lượt mỗi ngày thật (`today.stalls`); lượt lựa dở giữ ở `pendingStall` (lựa tiếp được trong ngày, kể cả khi khung giờ vừa tan; sang ngày thật khác thì hết hạn); soát lỗi M4: rổ đang chọn và số lần chọn nhầm lưu vào `pendingStall` mỗi lần chạm (plugin Chọn gọi `ctx.onChange`, màn `market` gọi `saveStallDraft`, chọn nhầm thì lưu ngay), "Lựa tiếp" khôi phục đúng rổ (`initial`) nên tải lại trang / rời chợ không xóa được lần nhầm. Kết quả: luôn `base` phần món kho cần nhất; từ 90 điểm thêm 1 phần món còn lại; từ 75 điểm 50% ra 1 mảnh (luồng `seedFrom(hạt giống, ngày thật, phiên, 'manh')`, bảo hiểm mảnh). Chọn nhầm (có lần chạm nhầm) → thẻ Mẹo nghề `kiem_hang`.
- Giỏ chợ: `sh.rareRolls` (chuỗi Quầy chuẩn 5 khách, Chợ phiên +1) rút ở `finishShiftRare` bằng `seedFrom(hạt giống, ngày game, 'gio_cho')`: 40% nguyên liệu (món kho cần nhất, hòa thì bốc), 60% mảnh; `pity.ing` ≥ 2 → chắc chắn nguyên liệu; soát lỗi M4: `pity.frag` ≥ `fragmentPityAfter` (3 lần liền ở nguồn có tỉ lệ không ra mảnh) → chắc chắn ra mảnh (cùng tới hạn thì nguyên liệu trước); tỉ lệ thực ra nguyên liệu ≈ 49%; hết món nhận mảnh hoặc hết mức mảnh hôm nay → 100% nguyên liệu (`allReason` để thẻ Kho hàng hiếm ghi đúng lý do). Tỉ lệ và hai mức bảo hiểm ghi công khai ở thẻ Kho hàng hiếm và Túi đồ (`bag-basket`).
- Khách lạ: `startShift` → `applyStranger` (shift.js): ngày thật tin cậy = max(giờ máy lúc mở ca, `clock.maxSeen`), giờ máy lùi thì không có; `pickStranger` đổi một khách thường (không phải khách đầu, khách hướng dẫn, khách quen, đơn đặt trước, khách bị ép ảnh giả; vị trí bốc bằng `seedFrom(hạt giống, ngày game, 'khach_la')`) thành khách lạ (tên, giới, kiểu khách, giọng, `self`, kiên nhẫn theo kiểu khách, câu gọi món mới; giữ nguyên đơn). `today.strangerDay` chặn ghé lần 2 trong ngày thật (kể cả tải lại). Quà theo sao ở `finishShiftRare`.
- Trần: kho 6 phần mỗi loại; mỗi ngày thật 6 phần + 3 mảnh (sổ `rare.today`, khóa = `sh.dayKey` cho quà trong ca, `nowInfo.dayKey` cho phiên hàng); phần dư đổi 2 Muỗng Vàng mỗi phần/mảnh. Hàng tự bỏ tiền mua (chị bán dạo, `bought`) và phần thưởng cố định (`grantReward`, `dayCap: false`) không tính trần ngày.

**Cắm vào lõi**
- `customer.orderableRecipes`: món hiếm đã có — trong ca: thuộc `sh.rareMenu` (chốt lúc mở ca, thực đơn quầy không đổi giữa ca); ngoài ca (màn Chuẩn bị, sinh đơn trong `startShift`): kho đủ 1 phần. `recipeWeight` × `orderWeight` (1,5). `speechFor`/`lineFor` truyền `self` của khách lạ.
- `shift.startShift`: `sh.rareMenu = rareMenuFor`, `capRareRequests` sau khi sinh mọi đơn (làm mới đơn, `expectedSec`, câu gọi món của khách bị đổi), khách lạ, rồi mới `planArrivals`. `endShift` gọi `finishShiftRare`; `compactHistory` thêm `rare`. `economy.summarizeShift` thêm `rareNotes`.
- `order.confirmOrder` → `'het_hang_hiem'`; `kitchen.submitChon` (nguyên liệu hiếm 0đ), `finishDish` (trừ kho, trừ khi nấu thử), `finalizeCustomer` (+1 danh tiếng mỗi phần món hiếm đạt Ngon, `sheet.stranger`), `complaintRemakeOk` + `resolveComplaint` khóa làm lại khi hết hàng.
- `incidents.js`: xuất lại hàm hàng hiếm; tình huống 'chung' trao hàng qua `grantRare` (quà tính trần ngày, hàng mua `bought`), phần dư đổi Muỗng Vàng (`effects.spoons`, `result.spoons`); "Khách đổi ý" không đổi sang món hiếm. Soát lỗi M4: tình huống chỉ có quà hàng hiếm (`needs.stockRoom`, "Khách quê gửi quà") không bốc/không bật khi đã đủ mức hàng hiếm hôm nay; quà trong lựa chọn (báo loa của "Khách quên ví") hết mức thì dùng chữ `costNoRare`/`resultNoRare`; quà không vào kho được thì câu kết quả không nói "cất vào kho" mà dùng `rare.overflowText` ("Kho hoặc mức hôm nay đã đủ…").
- `rewards.js`: khóa `rare {ingId: n}`, `fragments {recipeId: n}` (trả thêm `rareGot`); công thức `hiem` nhận với `boughtDay 0` (không ×2 hai ca đầu, không vào việc "Nấu món vừa mua"). `shop.js` nấu thử món hiếm (mục 15.7). `recipe-book.js` (mục 17.3). `progression.js`: món hiếm không tính vào "3 công thức".

**Giao diện**
- Màn mới `market` (`ui/screens/market.js`, đăng ký ở `SCREENS` của `main.js`, `PRECACHE`): giới thiệu phiên (người bán, hàng hiếm ★, quê, tồn kho, hàng dễ nhầm, luật), "Bắt đầu lựa hàng" → `MINIGAMES.chon` với kệ 9 ô dựng ở lõi (ctx `missingText`), kết quả (điểm, phần nhận, mảnh, Muỗng Vàng, lời Dì Sáu, thẻ Mẹo nghề khi chọn nhầm). Back giữa chừng hỏi lại, lượt dở được giữ.
- Chuẩn bị (từ ngày 3 hoặc khi đã có hàng/mảnh; không hiện ở lần mở đầu tiên): thẻ gánh hàng quê (đang mở / đang lựa dở / đã ghé / phiên kế tiếp / hẹn mai / khóa khi lùi giờ, 3 khung giờ), thẻ Kho hàng hiếm (5 ô tồn kho, mức hôm nay, công thức hiếm "Mảnh n/3 · Cần …" + nút Nấu thử khi đủ mảnh, thanh may mắn Giỏ chợ + tỉ lệ công khai + cách có lượt), thực đơn hôm nay "★ còn n phần". Kiểm tra mỗi 30 giây, phiên mở/đóng thì vẽ lại.
- Quầy: món hiếm ★ + "còn n" (`rareLeft`, hết thì mờ và báo), số lượng tối đa theo tồn kho, lý do `het_hang_hiem`. Bếp: ô kệ nguyên liệu hiếm "còn n" (`ctx.stockLeft` của plugin chon). Hàng chờ: dấu ★ và nhãn "Khách lạ"; phiếu chấm dòng khách lạ; phàn nàn khóa "Làm lại" khi hết hàng hiếm. Tổng kết: thẻ "Hàng hiếm cuối ca". Sổ công thức: nhóm "Công thức hiếm". Nấu thử món hiếm: ghi rõ không tốn hàng hiếm, kết quả mở món hoặc "Nấu thử lại". Túi đồ ở Chợ Công Thức liệt kê hàng hiếm. `meta-ui.rewardParts` hiện phần thưởng `rare`, `fragments`.

**Kiểm chứng**: `tests/unit/m4-rare.test.mjs` (17 test: dữ liệu và cấu hình; lãi/giây ≤ 550đ, nguyên liệu hiếm không trừ Tiền quán; biên giờ 04:59/05:00/08:59/09:00/11:00/13:29/13:30/17:30/20:59/21:00; khóa lùi giờ, trong ca, ngoài khung, 1 lượt mỗi khung, lượt dở; sản lượng theo điểm và 50% mảnh trên 400 hạt giống + bảo hiểm; kho đầy/trần ngày → Muỗng Vàng; Giỏ chợ 40% trên 5.000 lượt, tỉ lệ thực 51%, không bao giờ 3 lượt liền không ra nguyên liệu, 100% khi hết món nhận mảnh; khách lạ 1 lần mỗi ngày thật, tải lại, trước ngày 3 / không giờ thật / lùi giờ; quà theo sao; mở món bằng nấu thử; đơn ≤ tồn kho trên 40 hạt giống; "còn n" và `het_hang_hiem`; tiêu hao lúc Ra món, bỏ món/làm lại bước; khóa làm lại; "Khách đổi ý"; tình huống và trần ngày; lưu/tải, dữ liệu hỏng, save cũ). Sửa có chủ ý: `data.test` (9 món, nguồn `hiem`, nguyên liệu hiếm, bảng C.3), `notebook-recipe-book` (9 món, trạng thái `hiem`), `incidents.test` và `m4-incidents` (dữ liệu thật đã có hàng hiếm: nhánh "chưa có dữ liệu" dùng bản dữ liệu bỏ hàng hiếm), `banned-words` (thêm `data/rare.js`). E2E `incident-notebook` đổi seed (1) 29 → 93, (3) 55 → 29 (`node tools/tim-seed.mjs`); (2) seed 8 và `m2-ui` seed 3 vẫn đúng.

## 22. M4 bước 7–8: save v3, bản 0.4.0, mô phỏng cân bằng

Thiết kế: `docs/tham-khao/m4-thiet-ke.md` mục F.1 bước 7–8, F.4, F.6.

**Save v3** (`core/state.js`, `core/save.js`)
- `STATE_VERSION = 3`. `migrate` chạy `migrateMeta` → `migrateContentM3` (tình huống M3, Sổ tay nghề) → `migrateContentM4` (mục 12): `incidents.lastKind/lastLoss/day/warn`, `state.rare` (`migrateRare`), ca đang dở (`migrateShiftM4`). Save v1, v2 nâng thẳng lên v3 trong một lần nạp; save v3 hợp lệ nạp lại giống hệt (`migrate(decodeSave(encodeSave(s)))` = `s`, kể cả ca dở có 2 tình huống, kho hàng hiếm, sổ tiền sự kiện).
- Ca dở của bản 0.3 (v2) chơi tiếp được bằng mã M4: `migrateShiftM4` chỉ thêm trường thiếu (`ledger.eventIn/eventOut`, `incidentQueue`, `eventNotes`, `rareMenu`, `rareNotes`, `rareRolls`, `eventCostExtra`, `eventMissed`, `dayKey`, các khóa `mods` M4) và sửa trường M4 hỏng về mặc định; không đổi trường hợp lệ, không sửa object đầu vào. Tình huống đã lên lịch trong ca cũ vẫn xảy ra và xử lý được; lịch sử ca cũ (`history[]` không có `eventIn/eventOut/rare`) giữ nguyên, nơi đọc có mặc định.
- Mã sao lưu: mã v1/v2 đưa vào bản 0.4 không cảnh báo; mã v3 đưa vào bản 0.3 báo "bản mới hơn" (`readCode` → `warn: 'ban_moi_hon'`), đúng hành vi. E2E `save-safety` dựng mã "bản mới hơn" bằng version 4.

**Bản 0.4.0**: `package.json`, `sw.js` (`VERSION`, cache `bkn-0.4.0`), `APP_VERSION` (`ui/app.js`) cùng là 0.4.0 (`pwa.test.mjs` đối chiếu); `PRECACHE` có đủ tệp mới của M4 (`src/core/rare.js`, `src/data/rare.js`, `src/ui/screens/market.js`; test đối chiếu cây thư mục thật). Thư phiên bản `phien_ban_0_4_0` (mục 15.5; `data/mail.js` nằm trong danh sách tệp chữ hiển thị của `banned-words.test.mjs`). Ca mở ở 0.3.0 rồi mở lại ở 0.4.0 → `version-toast` "Game vừa lên phiên bản 0.4.0".

**Cân bằng (bước 8)**
- Chuỗi "Ngày đầu ra phố" (`data/chains.js`): tiền thưởng bước 4 / 5 / 6 từ 15.000 / 30.000 / 30.000đ xuống 10.000 / 15.000 / 10.000đ (bước 6 vẫn +5 Muỗng Vàng). Lý do và số đo: `docs/can-bang.md` mục 10 và 16.
- Bus `rare.gained` thêm `bought` (hàng tự bỏ tiền mua ở Chị bán dạo, không phải thưởng) để mô phỏng tách được thưởng hiện vật.
- `tests/unit/integration-meta.test.mjs`: người chơi tốt ghé phiên hàng đang mở trước mỗi ca (ca 08:00 / 12:00 / 17:30 trúng Chợ sớm / Xe ba gác trưa / Gánh đặc sản tối; lựa đúng hàng, điểm 100 theo `scoreChon`), đủ 3 mảnh thì nấu thử mở món hiếm (không tốn Tiền quán, không trừ kho), gặp tình huống trong ca thì chọn cách an toàn. Kiểm thêm: ngày thật 1 chỉ kịp Gánh đặc sản tối, từ ngày thật 2 đủ 3 phiên; món hiếm đầu tiên mở trong ngày thật 1–2, ≥ 2 món sau 5 ngày; khách có gọi món hiếm; chọn an toàn thì không bị phạt; kho ≤ 6 mỗi loại, nhận ≤ 6 phần + 3 mảnh mỗi ngày thật. **Tỉ lệ thưởng quy đổi tính cả hàng hiếm**: giá quy đổi (`rareValue`) của mỗi phần hàng hiếm đã dùng khi Ra món trong ngày (bus `rare.used`), cùng cách tính với Phiếu Chợ Sớm (phần giá vốn tiết kiệm lúc dùng); phần nhận vào kho chỉ ghi để theo dõi. Test mới "cân bằng M4: tỉ lệ thưởng ≤ 35% ở các hạt giống khó" (8 lượt từng vượt trần trước khi giảm thưởng chuỗi).
- `tests/unit/integration-shift.test.mjs`: `META_SIM_LOG=1` in chênh lãi người chơi hoàn hảo / ẩu (chỉ số 21).

**Kiểm chứng**: `tests/unit/m4-save.test.mjs` (6 test): save thật của bản 0.3.0 đang dở ca (`tests/fixtures/save-v2.mjs`, dựng bằng mã nguồn 0.3.0: ngày 8, ví 869.500đ, còn 1 phiếu trên dây, tình huống Ghi nợ chưa xảy ra, sổ nợ 1 khoản) → v3 giữ nguyên tiến trình, thêm mặc định M4, không làm tròn ví, không hủy ca; chơi tiếp tới hết (tình huống Ghi nợ vẫn bật, bất biến ví, ví bội 500đ) rồi chơi thêm 1 ca v3; nhận thư 0.4.0 (1 mảnh Trà tắc mật ong rừng + 1 phần Mật ong rừng, không tính trần ngày), save mới không nhận; save v1 → v3 nhận thư 0.2.0 và 0.4.0; dữ liệu M4 hỏng (loại, tỉ lệ lỗ, sổ ngày, nhắc nhở, kho, mảnh, bảo hiểm, sổ hôm nay, phiên dở, trường M4 của ca) được làm sạch và ca vẫn chơi hết; save v3 đủ trường M4 lưu/tải không đổi. Sửa có chủ ý: `core-economy` (version 3), `meta-save-progression` (v1 → STATE_VERSION 3, có thư 0.4.0), `meta-mail` (thư 0.2.0 + 0.4.0, seenVersion 0.4.0), `review-m3-fixes` ("bản mới hơn" = STATE_VERSION + 1), `meta-chains` (thưởng bước 4 là 10.000đ), `banned-words` (thêm `data/mail.js`). Kết quả 30/09/2026: 344 unit test, 33 kịch bản e2e xanh (e2e khoảng 19 phút).

## 23. Ráp nối M4 và kiểm chứng toàn bộ

**E2E mới** (dựng save bằng lõi thật ở `tests/helpers/m4-saves.mjs`, dùng chung với `tools/tim-seed.mjs` — không còn bản sao hàm dựng):
- `tests/e2e/m4-rare.e2e.mjs` (seed 3, `node tools/tim-seed.mjs mon-hiem`): save ngày 4 có đủ 3 mảnh Trà tắc mật ong rừng + 1 phần mật ong (quà thư 0.4.0), `?devNow=2026-09-30T12:00` → thẻ phiên hàng `stall-card` `data-state="open"` "Xe ba gác trưa · Chú Tư" (3 khung giờ, phiên đang mở tô xanh) → Lựa hàng (kệ 9 ô có hàng dễ nhầm, lựa đúng 2 món hàng hiếm → 100 điểm, +1 phần mỗi món) → kho tăng đúng số phần nhận, không trừ Tiền quán → **tải lại trang**: thẻ "Hôm nay đã ghé", không còn nút vào phiên, kho và `rare.today.stalls` không đổi → nấu thử mở món (không trừ kho, mảnh đã dùng) → thực đơn "★ còn n phần" → Sổ công thức (món hiếm đã mở ghi "Công thức hiếm", món chưa mở "Mảnh n/3") → mở ca: `sh.rareMenu`, khách đầu gọi 2 ly món ★, quầy `menu-item` `data-left` và "★ còn n", kẹp phiếu chưa trừ kho, kệ bếp `shelf-left-mat_ong_rung` "còn n", Ra món trừ đúng 2 phần.
- `tests/e2e/m4-tip-events.e2e.mjs`:
  1. (seed 1, `tim-seed tip`) ca ngày 5 dựng sẵn bằng lõi (`tipShiftSave`: phục vụ quầy và nấu xong 2 phiếu, chưa giao) mở thẳng màn ca bán → giao: 5 sao hóa đơn 20.000đ "Tip: +5.000đ", 5 sao hóa đơn 10.000đ "Tip 0 (hóa đơn dưới 20.000đ)" (`score-sheet-tip`, `data-tip`); bán hết ca qua giao diện: mọi phiếu chấm tip ∈ {0, 5.000đ}, có tip ⇔ 5 sao và hóa đơn ≥ 20.000đ; Tổng kết: dòng "Tiền tip" = tổng tip các phiếu = lịch sử, dòng Hội thi (sự kiện ngày loại tốt) có giải thì `data-money` = `eventIn`, sổ lãi lỗ cộng lại đúng bằng lãi và khớp `history`.
  2. (seed 92, `tim-seed attp`) save chơi tới ngày 18 = lần thứ hai của "Đoàn kiểm tra vệ sinh" (lần một ngày 6 đã bị nhắc nhở, `state.incidents.warn`): thẻ Chuẩn bị "Có lựa chọn" + dòng `day-event-warn`; không chuẩn bị, cố ý lấy nhầm 1 nguyên liệu (`cookAndServe({ wrongPick })`) → cuối ca bị phạt, `warn` được xóa, Tổng kết có dòng `summary-event-money` `data-event="kiem_tra_attp"` (`data-money` = −`eventOut`) và dòng "Phạt, chi sự kiện"; tình huống M4 mới (Khách bỏ quên ví, rồi Bình gas hết) hiện giữa hai khách, đúng 1 cách an toàn, chọn cách an toàn (không có nhãn "mất tiền"), `history.incidents` đúng thứ tự lên lịch; sổ lãi lỗ khớp lịch sử.
- `tests/e2e/helpers.mjs`: `cookAndServe` trả thêm `{tip, tipText}` của phiếu chấm (`readSheetTip`), tùy chọn `onChon(line, recipe, i)` (soát kệ Chọn trước khi lấy) và `wrongPick` (dòng đầu lấy thêm 1 hàng bẫy).

**Sửa khi ráp nối**
- Tiền sự kiện bị kẹp ghi đúng nguyên nhân (`economy.eventMoneyIn/eventMoneyOut`): kẹp theo trần của một sự kiện trong ca (theo doanh thu dự kiến) → "Tiền thưởng mỗi sự kiện ca này tối đa {n} (theo doanh thu ca), phần dư Dì Sáu ghi công bằng lời khen." / "Mỗi lần phạt ca này tối đa {n} (theo doanh thu ca), Dì Sáu đỡ giùm con {phần dư}."; chỉ khi chạm trần ngày thật mới ghi "Hôm nay tiền thưởng từ sự kiện đã đủ mức…" / "Dì Sáu đỡ giùm con lần này." (trước đây giải Hội thi 20.000đ bị kẹp còn 18.000đ theo trần của ca lại ghi "Hôm nay … đã đủ mức" dù là khoản thưởng đầu tiên trong ngày). Chữ ghi đè được bằng `INCIDENT_CONFIG.sparedCapText/gainCapText` như hai câu cũ.
- Thẻ sự kiện ngày ở màn Chuẩn bị ghi mức phạt là mức tối đa ("bị phạt tối đa 20.000đ"), khớp luật "phạt có trần".
- `ui/format.signedVND`: số âm dùng dấu trừ dài "−" như các dòng trừ của sổ lãi lỗ (trước là "-18.000đ" cạnh "−18.000đ").
- Giỏ chợ / quà khách lạ khi kho đầy hoặc đã đủ 6 phần hôm nay (`rare.finishShiftRare`): ghi chú nói rõ "Kho hoặc mức hôm nay đã đủ, quà đổi thành n Muỗng Vàng" (trước đây vẫn ghi "Giỏ chợ có nguyên liệu hiếm." dù kho không thêm phần nào; chơi thử ghé đủ phiên hàng + khách lạ là chạm mức 6 phần ngay ca thứ hai trong ngày).
- Test hồi quy: `tests/unit/review-m4-fixes.test.mjs` (5 test).

**Kết quả 30/09/2026**: `npm test` 349/349; `npm run e2e` 36/36 kịch bản (33 cũ + 1 `m4-rare` + 2 `m4-tip-events`), khoảng 28 phút; seed e2e cũ vẫn đúng (`node tools/tim-seed.mjs`: `mua-ngay-4` 3, `ghi-no` 93, `mo-hang` 8, `doi-y` 29), không nới kiểm tra nào. Hành trình dài `node tests/e2e/hanh-trinh.mjs` (chạy tay, mục 18.1) chạy lại với M4: 12 phút, thoát mã 0, 0 lỗi console/trang, 0 thao tác kẹt, không lỗi bố cục; 4 ca thật qua giao diện (ca ngày 3 ở mức Nhiều gặp 2 tình huống mới: Cô Hai ve chai → Bán, Khách bỏ quên ví → Cất giữ), đủ điều kiện lên Chặng 2 ở ngày game 9.

**Chơi thử qua giao diện** (`scratchpad`, không nằm trong repo): Playwright 390×844, save ngày 5 dựng bằng lõi, mức tần suất Vừa, các ca liên tiếp lúc 08:10 / 12:05 / 18:00 (trúng 3 phiên hàng) và sang ngày thật mới; ghé phiên hàng đang mở, nấu thử khi đủ mảnh, chọn lựa chọn của sự kiện ngày, xử lý tình huống bằng cách an toàn; bộ quan sát trong trang ghi mọi thông báo nổi / hộp thoại / phiếu chấm, có đè lên sân khấu mini-game không, có hai hộp thoại cùng mở không. Kết quả ghi ở mục 23.1.
- Ghi chú công cụ thử: đồng hồ giả của Playwright (`page.clock`) sau nhiều lần `page.goto` + `runFor` trong CÙNG một trang có thể làm `performance.now()` lùi lại, vòng rAF của game (xin lúc mở trang) chờ tới "tương lai" nên ca đứng ở 06:00 (không có lỗi console). Trình duyệt thật `performance.now()` luôn tăng, nên đây không phải lỗi game; kịch bản chơi thử nhiều ca mở ngữ cảnh mới mỗi ca và nạp save của ca trước. E2E trong `npm run e2e` không gặp (mỗi kịch bản điều hướng ít lần).

### 23.1 Kết quả chơi thử (30/09/2026)
9 ca qua giao diện (seed 7: 5 ca ngày game 5–9; seed 11: 4 ca ngày 5–8), mỗi ca một ngữ cảnh trình duyệt mới nạp save ca trước, mức Vừa:
- Sự kiện ngày: 6/9 ngày có (Ngày lãnh lương, Đại lý trà tài trợ + nhận tài trợ → +15.000đ, Hội thi → Giải Nhất +20.000đ, Trời mưa + căng bạt, Nắng nóng, Tắc lên giá → giá vốn +5.000đ ghi ở Tổng kết); không 2 ngày trống liền, không trùng hôm trước.
- Tình huống trong ca: 7/9 ca có ít nhất 1, 3/9 ca có 2 (Người giao hàng, Ghi nợ, Khách quê gửi quà + Khách đổi ý, Đoàn khách hỏi đường, Khách đổi ý + Khách bỏ quên ví, Đoàn khách hỏi đường + Ghi nợ, Khách mở hàng); hai tình huống trong một ca luôn cách nhau ≥ 2 khách; mọi tình huống lên lịch đều hiện đúng lúc quầy trống.
- Hàng hiếm: ghé đủ 3 phiên hàng mỗi ngày (100 điểm, 1–2 phần, 3 lần ra mảnh), khách lạ ở ca đầu mỗi ngày thật (quà 2 phần), Giỏ chợ mỗi ca (bảo hiểm, mảnh); đủ 3 mảnh ở ca thứ 3 → nấu thử mở Trà tắc mật ong rừng, từ ca sau thực đơn có món ★.
- Không có thông báo nổi / hộp thoại nào đè lên sân khấu mini-game (lấy mẫu mỗi 250 ms), không có 2 hộp thoại cùng mở, 0 lỗi console/trang. Mỗi ca 16–32 thông báo nổi (kẹp phiếu, thối đúng, tiến độ Việc hôm nay/chuỗi — có từ M2–M3), luôn nằm trên dải khách, không che thanh 4 khâu.
- Sửa sau chơi thử: ghi chú Giỏ chợ đổi Muỗng Vàng khi đủ mức (mục 23).

### 23.2 Vòng soát lỗi M4 lần 2 (tóm tắt thay đổi)
- **Luật nhịp chung** (M4R-01, UX-04): "không 2 sự kiện xấu liền nhau" xét trên dòng thời gian chung của sự kiện ngày và tình huống: `state.incidents.lastEvent` (sự kiện ngày ghi lúc mở ca, tình huống ghi lúc xử lý); `incidentCandidates` bỏ loại xấu khi sự kiện ngay trước là loại xấu hoặc sự kiện ngày của ngày mai (chốt lúc mở ca) là loại xấu; `announceDayEvent` không bốc loại xấu khi sự kiện ngay trước chắc chắn là loại xấu (chỉ đổi loại, không đổi có/không có sự kiện).
- **Chốt sự kiện ngày đã báo** (M4R-05): `state.incidents.announced`; màn Chuẩn bị chốt hôm nay, mở ca chốt hôm nay và ngày mai; đổi mức "Tần suất sự kiện" chỉ áp cho ngày chưa chốt (Cài đặt ghi rõ).
- **Lựa hàng lưu rổ dở** (M4R-02): plugin Chọn gọi `ctx.onChange`, màn `market` lưu `pendingStall.picked/mistakes` (`rare.saveStallDraft`, chọn nhầm thì lưu ngay), "Lựa tiếp" khôi phục rổ; `finishStall` lấy lần nhầm lớn nhất và kẹp điểm ≤ 100 − 15 × lần nhầm.
- **Sổ trần tiền sự kiện ngày thật** (M4R-03): `sh.dayKey` theo giờ tin cậy; `eventDayBook` chỉ mở sổ mới khi khóa mới hơn.
- **Quà hàng hiếm khi đủ mức hôm nay** (M4R-04, UX-01): "Khách quê gửi quà" không bốc/không bật; lựa chọn báo loa dùng chữ không hứa hàng; câu kết quả dùng `rare.overflowText`; chip ở hộp tình huống và dòng Tổng kết ghi "kho hoặc mức hàng hiếm hôm nay đã đủ"; chân thẻ "Hàng hiếm cuối ca" chỉ nói "cất vào kho" khi thật sự có hàng vào kho.
- **Giỏ chợ** (M4R-06, UX-06): bảo hiểm mảnh (`fragSure`), cùng tới hạn thì nguyên liệu trước; `basketOdds.allReason` → thẻ Kho hàng hiếm ghi đúng lý do 100% nguyên liệu; Túi đồ ghi tỉ lệ công khai (`bag-basket`).
- **Hủy ca dở** (M4R-07): hoàn thêm `ledger.eventOut` (trừ tiền tự mua hàng hiếm đã vào kho) và `mods.prepCost`; thông báo lúc mở game ghi "giá vốn, phạt và chi sự kiện".
- **Chữ hiển thị**: tiền thưởng sự kiện ngày ghi "tối đa" + dòng giải thích trần theo doanh thu ca (M4R-08, UX-05); Tổng kết ghi "Đã chi … lúc mở hàng" (UX-11); Sổ công thức ghi phần giá vốn là hàng hiếm quy đổi (UX-12, `recipeBook().entries[].rareCost`, testid `book-hiem-cost-<id>`); thư 0.4.0 sửa câu (UX-13); Cài đặt ghi "sự kiện có phạt luôn có cách an toàn, vài sự kiện chỉ là chi phí nhỏ được báo trước" (UX-10).
- **Tên gọi, hình minh họa** (UX-07, UX-08, UX-09): màn/thẻ "Gánh hàng quê" (khác sự kiện ngày "Chợ phiên"), tiêu đề thẻ ghi trạng thái (`stall-title`); người bán Gánh tối "Anh Tám"; tình huống tiền nghi giả dùng "khách đi đường / vãng lai" (không gọi "khách lạ"); "Cô bán dạo" có cách tự xưng `{self}` (who là `{name, gender, self}`); "Cô Út bán xôi" khớp hình cô chú; "Anh giao hàng đội nón vàng"; "Chị hướng dẫn viên của một đoàn khách du lịch"; bước "Đánh sữa muối" / "Rưới lớp sữa muối" có hình riêng `sua_muoi` (bước khai báo `icon`, `_util.ingIcon(ing, ctx, icon)`); trứng gà ta quê Long An.
- **Bố cục bếp** (UX-02, UX-03): lưới chai Nêm `repeat(auto-fit, minmax(96px, 1fr))` (3 chai một hàng ở 360px), vùng trống của lưới không nhận chạm, vùng chơi Nêm nhiều chai thấp hơn (`min-height` 140px) để nút Xong không bị đẩy xuống dưới thanh Quầy/Bếp ở 360×740; `.mg-area` căn giữa an toàn (`safe center`), thanh chân mini-game nằm trên nội dung tràn; kệ 12 ô gọn lại cả ở 390×844 (`max-height: 900px`); thẻ công thức ghi " · kho còn n" cho nguyên liệu hiếm (`card-left-<ingId>`).
- **Kiểm chứng**: `tests/unit/review-m4-round2.test.mjs` (14 test, gồm mô phỏng 8 hạt giống × 45 ca × 2 mức đếm cặp xấu liền nhau trên dòng thời gian chung = 0); sửa có chủ ý: `incidents.test` (mặc định `incidents` thêm `lastEvent`, `announced`), `m4-rare.test` (Giỏ chợ có bảo hiểm mảnh: tỉ lệ thực nguyên liệu ≈ 49%, không bao giờ 4 lượt liền không ra mảnh; "Khách quê gửi quà" không bật khi đủ mức hôm nay), `m4-save.test` (câu thư 0.4.0), `data.test` (icon của bước). E2E: `m4-rare` thêm "lựa hàng dở → tải lại → Lựa tiếp" và "bước Nêm 3 chai ở 360×740"; `incident-notebook` (3) seed 29 → 64 (`node tools/tim-seed.mjs doi-y`: luật nhịp chung đổi tập tình huống bốc được); `tests/helpers/m4-saves.mjs` `playedSave` nhận `freq` (mức tần suất đặt từ đầu — sự kiện ngày mai đã chốt lúc mở ca trước nên không đổi mức sau khi chơi), `tipShiftSave` dùng `freq: 'it'`; `tim-seed tip` kiểm thêm sự kiện ngày là Hội thi.
- **Kết quả**: `npm test` 363/363 (349 cũ + 14 mới); `npm run e2e` 38/38 kịch bản (36 cũ + 2 mới), khoảng 28 phút; `node tools/tim-seed.mjs`: mọi seed đang dùng hợp lệ (`doi-y` đổi sang 64). Mô phỏng lại của người soát lỗi: 0 cặp sự kiện xấu liền nhau (mức Vừa, Nhiều), Giỏ chợ 0 lượt ra nguyên liệu khi bảo hiểm mảnh tới hạn, lựa hàng tải lại → 85 điểm + thẻ "Kiểm hàng", trần tiền sự kiện không mở lại khi lùi giờ.

## 24. Sửa 2 lỗi tồn đọng sau M4 (01/10/2026)

**Lỗi 1 — nút Xong của bước Nêm nhiều chai bị thanh tab Quầy/Bếp che** (ca thật ở 360×600–640: HUD, dải phố, thanh 4 khâu,
dây phiếu và thanh tab chiếm gần nửa màn; sân khấu không cuộn nên nội dung tràn đẩy thanh chân xuống dưới thanh tab; cùng
lỗi ở Thái, Rót, Nhấc của Lửa). Sửa ở `css/kitchen.css`:
- `.k-layer[data-kind="stage"] .mg-stage` cuộn dọc (`overflow-y: auto`, `scroll-padding-bottom`), các con không co nhỏ hơn nội
  dung (`flex-shrink: 0`, vùng chơi `flex: 1 0 auto`); `.mg-foot` dính đáy (`position: sticky; bottom: 0`, nền đặc) → nút ở
  chân luôn nằm trong khung nhìn, ngay trên thanh tab, ở mọi khung. Vuốt dọc trên nền sân khấu để cuộn (`touch-action: pan-y`),
  vùng thao tác (thớt thái, chỗ chà, chảo, lọ, nút chạm nhanh, chai, thanh chân) vẫn `touch-action: none`.
- `@media (max-height: 760px)`: ẩn hình tay cầm trứng trên chảo, chảo lửa `scale(.8)`, cảnh rót `scale(.85)` (chỉ trang trí).
- `@media (max-height: 700px)`: đầu sân khấu gọn (biểu tượng 32px, tiêu đề 15px, thanh giờ 48px), chai Nêm gọn (không
  `min-height`, biểu tượng 32px) → mọi chai nằm trọn phía trên thanh chân không phải cuộn; thước lửa lên trên chảo (luôn thấy
  kim), chảo `scale(.7)`; cảnh rót `scale(.6)`; lọ gia vị và ly cạnh nhau; nút chạm nhanh 160px; thớt thái thấp 210px (vạch và
  nguyên liệu dời lên; nhát cắt chỉ tính theo hoành độ). Không đổi cách chơi: kích thước thớt thái (bề ngang), chỗ chà, chảo
  đập trứng giữ nguyên (tọa độ chạm); kim lửa và vạch rót tính theo tỉ lệ. Chỗ chà/thớt cao vẫn có thể phải cuộn ở 360×600
  (vết bẩn của bước Chà: bếp tự cuộn sẵn khi mở bước, xem vòng kiểm chứng bên dưới). Đã thay ở mục 26: thớt chà co theo
  chỗ còn lại (vết theo tọa độ chuẩn hóa, vùng chạm và quãng vuốt theo tỉ lệ), không phải cuộn.

**Lỗi 2 — rổ đang chọn dở ở bước Chọn mất khi tải lại trang** (trước chỉ giữ trong bộ nhớ giao diện `ui.chonDraft`; tải lại
là rổ trống và số lần chọn nhầm về 0 → chọn nhầm rồi tải lại để được 100 điểm). Sửa:
- Lõi `core/kitchen.js`: `cook.chonDraft = {picked, mistakes}` (JSON thuần), `saveChonDraft` (lần nhầm chỉ tăng), `chonDraft`,
  `normalizeChonDraft`; `submitChon` tính lần nhầm = max(gửi lên, đã lưu) và xóa rổ dở; bỏ món (`abandonDish`) / món khác
  (`startCook`) là phiên nấu mới nên không mang rổ cũ.
- Giao diện `ui/screens/kitchen.js`: bỏ `ui.chonDraft`; plugin Chọn nhận `initial` từ `chonDraft(state)`, `onChange` gọi
  `saveChonDraft` rồi `app.save()` (debounce), lần nhầm vừa tăng thì `app.saveNow()` (như màn Lựa hàng, `rare.saveStallDraft`).
  Nấu thử dùng chung (rổ nằm ở `state.tasting.shift.cook`, không đụng ca thật).
- Lưu: `save.migrateCookDraft` (mục 12) làm sạch rổ của ca thật và phiên nấu thử; save v1/v2/v3 không có trường này nạp như cũ;
  rổ hợp lệ lưu rồi tải lại không đổi. Không tăng `STATE_VERSION` (trường tùy chọn).

**Kiểm chứng**: `tests/unit/fix-chon-draft.test.mjs` (9 test: chuẩn hóa; lưu/đọc, lần nhầm chỉ tăng; `submitChon` giữ rổ khi
thiếu nguyên liệu chính, xóa rổ khi xong, max lần nhầm; chống gian lận qua tải lại; bỏ món / món khác; lưu rồi tải lại giống
hệt, kể cả nấu thử; làm sạch dữ liệu hỏng, không sửa đầu vào; save v1/v2 đang dở ở bước Chọn; cờ quá giờ). E2E
`tests/e2e/fix-leftovers.e2e.mjs` (ca thật mở bằng `?devNow` — có thêm dải giờ giả 24px): (a) Nêm 3 chai / 2 chai ở 360×600,
360×640, 390×844 — mọi chai và nút Xong trong khung nhìn, trên thanh tab và thanh chân, `elementFromPoint` tại tâm trúng chính
nó, chạm đủ nấc → Nêm 100 điểm; (b) Chọn dở 2 món + 1 lần nhầm → tải lại → rổ và lần nhầm khôi phục → Xong → Thớt, điểm Chọn 85;
(c) chọn nhầm rồi bỏ ra → tải lại ngay → lần nhầm còn, 85 điểm. Chạy với mã trước khi sửa: 5/7 kịch bản trượt đúng chỗ lỗi.

**Vòng kiểm chứng độc lập** (tái hiện từng phát hiện rồi sửa tận gốc; 8 kịch bản e2e mới (d)–(g) đều trượt trên mã trước vòng
này, đều qua sau khi sửa):
- **Rổ đầy kéo rộng sân khấu Chọn** (có từ 21500ea): rổ 8–10 món (Bánh tráng trộn 9, Chè bưởi 8, Tây Ninh 10) có bề rộng tối
  thiểu 456px kéo `.mg-stage` trong `.k-chon-wrap` (flex hàng, `min-width: auto`) → bếp tràn ngang, nút Xong và cột kệ thứ 4 lòi
  ra mép phải. Sửa: `.k-chon-wrap .mg-stage { min-width: 0 }` → rổ cuộn ngang bên trong; plugin Chọn cuộn rổ tới món vừa bỏ vào.
  E2E (d): Tây Ninh 10 món ở 360×600.
- **"Click ma" khi chạm cảm ứng** (có từ trước): lớp phủ đóng/mở ngay ở pointerdown (Nhấc của bước lửa, chạm thẻ gợi ý, chạm
  bảng công bố món, mini-game tự kết thúc lúc ngón còn chạm) → click trình duyệt sinh ra lúc nhấc ngón rơi xuống phần tử mới:
  mở hộp "Bỏ món này?", chốt bước Nêm 0 điểm (nút Xong vừa hiện dưới thẻ gợi ý), giao nhầm phiếu ("Giao cho khách" dưới bảng
  công bố). Sửa ở `ui/screens/kitchen.js`: đếm thứ tự sự kiện — `pointerdown` (pha bắt, trên phần tử bếp) ghi lần chạm, mọi lần
  đổi lớp phủ (`showLayer`, `closeLayer`, thẻ gợi ý nhường chỗ cho mini-game) ghi mốc; click (pha bắt) của lần chạm bắt đầu
  trước mốc đổi lớp phủ gần nhất và chưa quá `TAP_GUARD_MS` (1 giây) thì bỏ. Lần chạm mới, click từ bàn phím (có `keydown` sau
  lần chạm cuối) không bị chặn; thời điểm chốt bước lửa vẫn ở pointerdown (không đổi cách chơi). E2E (e1)–(e3).
- **Quá giờ bước Chọn bị xóa khi tải lại / đổi tab** (đổi tab có từ trước; rổ dở làm việc tải lại không phải chọn lại): plugin
  Chọn báo `onChange` khi vừa quá giờ, rổ dở mang `overtime: true` (chỉ bật, không tắt; bếp ghi save ngay), mở lại thì vẫn tính
  phạt và ô cần lấy nhấp nháy ngay; `submitChon` cộng 1 lần nhầm theo cờ đã lưu. Quá giờ tính theo lượt đứng ở kệ hiện tại: rời
  kệ trước khi quá giờ thì mở lại đếm giờ từ đầu như cũ. E2E (f): quá giờ → đổi tab → tải lại → 85 điểm.
- **Màn thấp: chai Nêm (ca đông 3 khách chờ ở 360×600) và vết bẩn của bước Chà (360×600–640) nằm dưới thanh chân dính**: mở bước
  thì bếp cuộn sẵn sân khấu vừa đủ (`revealTargets`: mép dưới mục tiêu thấp nhất + 4px lên trên thanh chân, không đẩy mục tiêu
  cao nhất khuất đầu sân khấu). Chỉ cuộn — vị trí, kích thước mục tiêu, chỗ chà giữ nguyên; đầu sân khấu (tên bước, hướng dẫn,
  thanh giờ) có thể khuất một phần. E2E (g1) Nêm 3 khách chờ, (g2) rửa dưa leo, gọt xoài ở 360×600 (chà bằng kéo tại chỗ, ≥ 90
  điểm). Bước Chà: đã thay ở mục 26 (thớt co vừa khung, không phải cuộn; `revealTargets` chỉ còn là dự phòng khi chỗ còn lại
  thấp hơn sàn).
- Không sửa ở vòng này (đúng yêu cầu lúc đó): bỏ món ở bước Chọn xóa rổ dở kèm lần nhầm (bản gốc cũng vậy). Đã sửa ở mục 25:
  rổ vẫn xóa, lần nhầm giữ theo dòng phiếu.

## 25. Giữ số lần chọn nhầm theo dòng phiếu khi bỏ món (01/10/2026)

**Lỗi**: bấm "Bỏ món" ở bước Chọn nguyên liệu (`abandonDish`) xóa phiên nấu kèm rổ dở và số lần chọn nhầm; mở lại đúng dòng
phiếu đó là phiên mới 0 lần nhầm → chọn nhầm, bỏ món, mở lại để được 100 điểm (né phạt −15 mỗi lần nhầm, cả phạt quá giờ).
Tái hiện trước khi sửa (ca thật, ?devNow, 360×640): chọn nhầm 1 lần → ‹ Phiếu → Bỏ món → mở lại → `cook.chonMistakes` 0,
bước Chọn 100 điểm; bỏ món rồi F5 cũng vậy.

**Sửa** (lõi, không đổi cách chơi khác):
- `core/kitchen.js`: phiếu có thêm `chonMistakes?: [n]` (dài bằng `lines`, số nguyên 0..`CHON_DRAFT_MISTAKES_MAX`, JSON thuần).
  `abandonDish` khi phiên nấu đang ở bước Chọn ghi `max(cũ, cook.chonMistakes, chonDraft.mistakes + (overtime ? 1 : 0))` cho
  dòng đó (chỉ tăng; bỏ món không lần nhầm thì không thêm trường); rổ (`picked`) vẫn xóa như cũ. `startCook` cùng dòng khởi
  tạo `cook.chonMistakes` từ giá trị đó và rổ dở trống mang lần nhầm (`chonDraft = {picked: [], mistakes}`) → giao diện truyền
  `initial.mistakes` cho plugin Chọn qua `chonDraft(state)` như khi tải lại trang (không đổi `ui/minigames/chon.js`).
  `submitChon` lấy max như cũ, thêm `cook.chonMistakes` mang sang; thành công thì dòng đó về 0 (cả phiếu về 0 thì bỏ trường).
  Lượt mở lại là lượt mới ở kệ: đếm giờ lại từ đầu (phạt quá giờ lượt trước đã thành 1 lần nhầm; quá giờ lần nữa phạt thêm).
  Bỏ món trên Thớt (đã chốt bước Chọn, vòng kiểm chứng bên dưới): ghi lại `cook.chonMistakes` của lượt đã chốt (chỉ tăng) →
  mở lại phải chọn lại (mua lại nguyên liệu) và vẫn mang lần nhầm. Phiếu làm lại theo khiếu nại (`remake`) là phiếu mới: không
  mang lần nhầm cũ. Nấu thử: phiếu nằm ở `state.tasting.shift`, không đụng phiếu ca thật.
- `core/incidents.js` ("Khách đổi ý" → Đổi món): dòng đổi sang món khác thì lần nhầm của món cũ ở dòng đó về 0
  (`kitchen.clearLineMistakes`: cả phiếu về 0 thì bỏ trường, như khi chốt bước Chọn).
- `core/save.js`: `migrateLineMistakes` (mục 12) làm sạch `ticket.chonMistakes` của ca thật và phiên nấu thử (không phải
  số → 0, âm → 0, lẻ → làm tròn xuống, > 99 → 99, thừa dòng cắt, thiếu thêm 0, không phải mảng → bỏ); save cũ không có
  trường này nạp như cũ; dữ liệu hợp lệ lưu rồi tải lại không đổi. Không tăng `STATE_VERSION` (trường tùy chọn).
- `ui/screens/kitchen.js`: chỉ cập nhật chú thích (đường `chonDraft` → `initial` đã có từ mục 24).

**Kiểm chứng**: `tests/unit/fix-chon-line-mistakes.test.mjs` (13 test: lưu theo dòng và 85 điểm khi mở lại; phiếu 2 dòng giữ
riêng; chỉ tăng, trần 99; quá giờ +1; không lần nhầm không thêm trường; bỏ món trên Thớt ghi lần nhầm đã chốt; remake không mang; nấu thử tách biệt;
"Khách đổi ý" đổi món về 0, từ chối giữ; chuẩn hóa; migrate làm sạch, không sửa đầu vào; round-trip ca thật + nấu thử, F5
sau bỏ món; save v2 nạp và chơi tiếp). Chạy trên mã trước khi sửa: 11/12 trượt (test còn lại kiểm "không thêm trường khi
không cần"). `tests/unit/fix-chon-draft.test.mjs`: sửa có chủ ý một khẳng định cũ ghi đúng hành vi lỗi ("quay lại món cũ sau
khi bỏ: không mang lần nhầm cũ" → nay `{picked: [], mistakes: 1}`). E2E `tests/e2e/fix-line-mistakes.e2e.mjs` (ca thật,
?devNow, chạm cảm ứng): (a) 360×640 chọn nhầm → Bỏ món → mở lại: rổ trống, save mang 1 lần nhầm → Xong → nhãn nổi và save
85 điểm, phiếu không giữ nữa; (b) 390×844 bỏ món rồi F5 ngay → vẫn 85; (c) 360×600 quá giờ → Bỏ món → mở lại → 85. Trên mã
trước khi sửa: 3/3 trượt.

**Vòng kiểm chứng độc lập** (tái hiện từng phát hiện; sửa cái đúng và trong phạm vi, kèm test hồi quy):
- **Chốt bước Chọn rồi Bỏ món trên Thớt vẫn né được phạt** (cùng bản chất với lỗi gốc, có từ trước): `submitChon` đưa dòng về
  0, bỏ món trên Thớt không ghi → mở lại chọn lại được 100 (cái giá chỉ là mua lại nguyên liệu). Sửa: `abandonDish` ở phase
  `thot` (đã có `chonScore`) ghi `cook.chonMistakes` của lượt đã chốt vào `ticket.chonMistakes[lineIndex]` (chỉ tăng; không nhầm
  thì không thêm trường). Unit "bỏ món trên Thớt … ghi lại lần nhầm" (55 → bỏ → mở lại 55, quá giờ 70 → 70, tải lại giữ); E2E
  (d) 360×640 nhầm → Xong 85 → Bỏ món trên Thớt → mở lại → 85 (trước: 100).
- **"Khách đổi ý" để lại `[0]`/`[0, 0]`**: nay gọi `kitchen.clearLineMistakes` (cả phiếu về 0 thì bỏ trường, như khi chốt).
  `cleanMistakes(Infinity)` (save sửa tay có `1e400`) → 99 (trần) thay vì 0.
- Không sửa (ngoài phạm vi, sửa sẽ đổi cách chơi): đồng hồ bước Chọn đếm lại từ 0 mỗi lần plugin được mount (‹ Phiếu → Làm
  tiếp, F5, mở lại sau khi bỏ món) — `createClock` không lưu thời gian đã trôi, nên về dây phiếu ngay trước giới hạn thì không bị
  phạt quá giờ (phạt đã mắc vẫn giữ); nên làm riêng (lưu `elapsed` vào rổ dở, truyền qua `initial`). Màn Chọn không hiện con
  số lần nhầm mang sang: màn này vốn không có bộ đếm lần nhầm, hiện bộ đếm (kể cả chỉ sau khi tải lại / mở lại) sẽ cho người
  chơi biết ngay lần chạm nào là nhầm — đổi cách chơi; Dì Sáu vẫn nhắc "Chọn nguyên liệu còn chạm nhầm" sau khi ra món.

## 26. Bước Chà vừa khung ở màn thấp (01/10/2026)

**Lỗi**: thớt chà (`ui/minigames/cha.js`) cao cố định ~250–280px, vết bẩn đặt theo px lúc mount → ở 360×600 và 360×640 (đặc
biệt ca đông 3 khách chờ, dải phố cao) 1–4 vết nằm dưới thanh chân dính `.mg-foot`, phải cuộn sân khấu mới thấy, mà vuốt trên
thớt (`touch-action: none`) thì không cuộn được; thớt lắc/xé bị thanh chân che nửa dưới. Mục 24 chỉ cuộn sẵn khi mở bước.

**Sửa** (không đổi cách chơi / chấm điểm; mini-game khác giữ nguyên):
- Đơn vị chuẩn: thớt chuẩn `PAD_W × PAD_H` = 360 × 280 (bằng thớt cũ); thớt thật = khung chuẩn × tỉ lệ k (px / đơn vị).
  `room()` đo chỗ còn lại của sân khấu = chiều cao sân khấu − đầu − chân − khoảng cách − đệm, lúc mount (chân đã có dòng chữ giữ
  chỗ) và mỗi lần `ResizeObserver` báo sân khấu / đầu / chân đổi cỡ (khách mới làm dải phố cao lên, xoay máy, thanh địa chỉ).
  Sân khấu chưa hiện → `null` (thớt chuẩn); đã hiện mà hết chỗ (h ≤ 0, vd xoay ngang) → thớt cỡ sàn (không phải thớt to nhất).
- Vết bẩn (`params.spots`): `fitSpotsBox(availW, availH) → {k, wr, hr}` — đủ cao thì thớt chuẩn thu theo bề ngang như cũ; thấp
  thì k theo chiều cao còn lại, sàn `MIN_SCALE` = 44 / (2 × 40) = 0,55 (vùng chạm mỗi vết ≥ 44px), khung rộng ra theo bề ngang
  còn trống và dẹt lại, thấp nhất `PAD_MIN_HR` = 80 đơn vị (một hàng vết, 44px); thớt dẹt bo tròn hai đầu (`.is-flat`). Vết lưu
  theo tọa độ chuẩn hóa `{nx, ny}` 0..1 (`spotLayout`: khung chuẩn rải như cũ — elip 98 × 78,4, cách 64; khung dẹt elip dẹt,
  rộng ra giữ diện tích), đặt bằng `left/top` %, cỡ vết 60·k px. `rubSpots`: vùng chạm (30 + 10)·k, độ sạch tăng `seg / k /
  need` (quãng vuốt cần `SPOT_NEED_PX`·k px) → cùng đường vuốt theo tỉ lệ sạch như nhau ở mọi cỡ thớt; đổi cỡ giữa chừng giữ
  độ sạch và vị trí tương đối.
- Lắc / trộn / bóp / xé (`params.strokes`): `fitStrokesHeight` — cao vừa chỗ còn lại, không quá thớt chuẩn theo bề ngang, không
  dưới `STROKE_MIN_H` = 56px (cách chơi chỉ đếm đổi chiều theo bề ngang; vẫn rộng hơn vùng chạm 44px).
- CSS (`css/kitchen.css`): `.k-layer[data-kind="stage"] .mg-cha .mg-area { min-height: 0 }`; `@media (max-height: 760px)` chân
  bước Chà (chỉ thanh tiến độ, không nút) không ép cao 44px; `@media (max-height: 700px)` đầu sân khấu bước Chà một dòng
  (`.k-stage-wrap[data-type="cha"]` — `kitchen.startStep` gắn `data-type` = loại bước): tên món và ghi chú chung dòng, chữ 13px,
  dài thì cắt "…" (tên món nhường trước, tối thiểu 3em; phiếu trên dây và đầu sân khấu vẫn ghi món, bước) — thớt có thêm ~27px.
- `revealTargets` (mục 24) chỉ còn là dự phòng khi chỗ còn lại thấp hơn sàn.

**Giới hạn**: chỗ còn lại thấp hơn sàn (44px một hàng vết, 56px thớt lắc) thì sân khấu vẫn cuộn như trước. Trong mọi khung
được kiểm (kể cả 360×600, 3 khách chờ, phiếu 3 món + 2 ghi chú) không gặp; xoay ngang 640×360 panel Bếp gần 0px (có từ trước,
ngoài phạm vi) — thớt về cỡ sàn.

**Kiểm chứng**: `tests/unit/cha-fit.test.mjs` (9 test: sàn tỉ lệ, vùng chạm ≥ 44px; đủ chỗ thì như cũ, thiếu chỗ thì vừa khung;
chưa đo → thớt chuẩn, hết chỗ → thớt sàn; đổi cỡ giữa chừng; vết trong khung, không chồng, kể cả thớt dẹt / một hàng; bố trí ở
thớt chuẩn giống bản gốc; cùng đường vuốt cùng độ sạch và điểm ở mọi k; vuốt ngoài vùng chạm; thớt lắc vừa chỗ, sàn 56px).
E2E `tests/e2e/fix-leftovers.e2e.mjs` (h): 9 ca vết bẩn + 8 ca lắc/xé/trộn ở 360×600, 360×640, 390×844 — gồm ca đông 3 khách
với ghi chú (Tây Ninh + Thêm trứng cút / Không rau răm, Bánh tráng trộn + Không rau răm, Trà tắc mật ong + Không đá) và phiếu 3
món + 2 ghi chú: sân khấu không cuộn, thớt và mọi vết trọn giữa đầu sân khấu và thanh chân, tâm từng vết trúng thớt, vùng chạm
≥ 44px, chà / vuốt bằng cảm ứng thật → điểm cao (lắc 100); đồng hồ trang đóng băng trong lúc vuốt (chạm qua CDP chậm hơn
ngón tay thật khi máy bận — điểm chỉ đo độ sạch / số lượt, không phải tốc độ bộ test). (g2) đổi khẳng định cũ "cần cuộn" thành
"không phải cuộn". Các ca ghi chú / phiếu 3 món đều trượt trên mã trước vòng kiểm chứng (tràn 14–45px, thớt khuất dưới
thanh chân). Ma trận đo độc lập (Chromium cảm ứng ở khung điện thoại, chuột ở 1280×800; đồng hồ đóng băng lúc
vuốt): mọi bước Chà của mọi món × 7 khung × 1/3 khách (252 ca), 108 ca một ghi chú ở 360×600 / 360×640 có 3 khách, 64 ca phiếu
3 món + 2 ghi chú ở 360×600 / 360×640 — đều không tràn (thừa 0px), thớt và vết trọn khung, vùng chạm ≥ 44px, 100 điểm; thớt thấp
nhất 60px (vết) và 78px (lắc), trên sàn. Ca đông có cả khách xếp hàng không làm dải phố cao thêm.

## 27. Chạy dưới đường dẫn con — GitHub Pages (01/10/2026)

**Mục tiêu**: chơi được ở `https://kazesanaei.github.io/gamefnb/` (GitHub Pages của kho dự án nằm dưới đường dẫn con
`/gamefnb/`, không ở gốc tên miền). Hướng dẫn cho người dùng (link claude.ai, bật Pages, cài vào màn hình chính, dữ liệu theo
từng trình duyệt, Cloudflare Pages / Netlify): `docs/huong-dan-trien-khai.md`; tóm tắt ở README mục "Triển khai".

- `.nojekyll` (tệp rỗng ở gốc): GitHub Pages mặc định chạy Jekyll, bỏ qua tệp/thư mục bắt đầu bằng `_` →
  `src/ui/minigames/_util.js` 404, mọi mini-game hỏng. Không phải tệp của game nên không vào PRECACHE (`pwa.test.mjs` chỉ
  đối chiếu `src/`, `css/`, `icons/`; test mới kiểm tệp có, rỗng, không nằm trong PRECACHE).
- Soát đường dẫn: game không có đường dẫn tuyệt đối `/…` — `index.html` (manifest, biểu tượng, CSS, `src/main.js`), manifest
  (`id`/`start_url`/`scope` `./`, biểu tượng tương đối), `main.js` đăng ký `./sw.js` (scope = thư mục trang), `sw.js` (PRECACHE
  tương đối, `INDEX_URL = new URL('index.html', self.location)`, `isGameFile` so theo scope), CSS bếp nạp động bằng
  `new URL('../../../css/kitchen.css', import.meta.url)`. Không phải sửa code game.
- `tests/helpers/static-server.mjs`: `startServer(port = 0, host = '127.0.0.1', { basePath = '', onResponse = null })`.
  `basePath` '' giữ hành vi cũ; `'/gamefnb'` (chuẩn hóa bằng `normalizeBasePath`) phục vụ gốc repo dưới `/gamefnb/` như GitHub
  Pages: `/gamefnb` (thiếu `/` cuối) → 301 sang `/gamefnb/` giữ query, ngoài `/gamefnb/` → 404 (đường dẫn tuyệt đối trong game
  lộ ra ngay). `url` trả về đã gồm đường dẫn con; `onResponse({method, url, status})` gọi sau mỗi yêu cầu. Chạy tay:
  `node tests/helpers/static-server.mjs 8080 /gamefnb` → `http://localhost:8080/gamefnb/`. `openGame` (e2e helpers) nhận thêm
  `basePath`, `onResponse`.
- Kiểm chứng: unit `core-static-server.test.mjs` (+2: đường dẫn con — 301 giữ query, theo chuyển hướng ra trang, MIME, tệp `_`,
  ngoài đường dẫn con 404, HEAD; không truyền `basePath` thì như cũ), `pwa.test.mjs` (+2: `.nojekyll`; chạy `sw.js` trong vm ở
  `https://kazesanaei.github.io/gamefnb/sw.js` — cài đủ PRECACHE, mọi khóa cache và mọi lần tải nằm dưới `/gamefnb/`, mất mạng
  vẫn trả trang cho `/gamefnb/`, `/gamefnb/?seed=…`, `/gamefnb/index.html`, tệp tải lúc chạy được cất theo đường dẫn con).
  E2E `tests/e2e/subpath.e2e.mjs` (Chromium 390×844 cảm ứng, localStorage trống, máy chủ chỉ phục vụ `/gamefnb/`): vào
  `/gamefnb?seed=42&test=1` → chuyển sang `/gamefnb/` → manifest (`start_url`, `scope` = `/gamefnb/`, biểu tượng 200), mọi
  `link`/`script` dưới `/gamefnb/` → đặt tên xe → mở hàng → phục vụ 1 khách qua 4 khâu (≥ 4 sao, save ghi đã phục vụ) → service
  worker kích hoạt, `scope`/`scriptURL`/controller ở `/gamefnb/`, cache `bkn-<VERSION>` chỉ chứa URL dưới `/gamefnb/` (có
  `_util.js`, `kitchen.css`) → chơi hết ca → ngày 2 → `context.setOffline(true)` → tải lại vẫn vào màn mở đầu, Chuẩn bị (Ngày 2),
  mở ca, có khách. Không yêu cầu nào trượt khỏi `/gamefnb/`, không HTTP ≥ 400 (soát ở máy chủ qua `onResponse`, nên tính
  cả yêu cầu do service worker gửi), không lỗi console. Thử phá có chủ ý (bản sao trong thư mục tạm): đổi `href="css/base.css"` thành `/css/base.css` →
  trượt "tài nguyên ngoài đường dẫn con"; đăng ký `'/sw.js'` → trượt "service worker chưa kích hoạt".

## 28. Lớp phủ bị thanh tab che trên iPhone — bản 0.4.1 (01/10/2026)

**Lỗi** (ảnh chụp người chơi thật, iPhone, Safari): ở khâu Order, chạm thẻ món mở bảng chọn món (Số lượng, Ghi chú) nhưng nút
"Thêm vào phiếu" bị ẩn — bảng bị cắt ở mép trên thanh tab Quầy/Bếp, chỉ lộ một vệt vàng (viền sáng hướng dẫn của nút).
Nguyên nhân: `.sheet-layer` (`position: fixed`) nằm trong panel Quầy — vùng cuộn (`.panel`, `overflow-y: auto`) — mà WebKit iOS
cắt mọi phần tử con của vùng cuộn, kể cả phần tử fixed, theo khung vùng cuộn; panel kết thúc ở mép trên thanh tab. Chromium
không cắt nên e2e cũ không thấy. Tái hiện trên Chromium bằng cách mô phỏng: `clip-path: inset(0)` trên `.screen, .panel,
.k-main` (cắt cả con cháu fixed như WebKit iOS) — bản 0.4.0 trượt ở cả 9 khung (320×568 … 1280×800): tâm nút trúng `.tabbar`.
Cùng lớp lỗi: các bảng/hộp của bếp nằm trong panel Bếp (ở 375×553 panel chỉ còn ~210px: hộp "Chiên trứng hỏng rồi!" mất nút
"Bỏ món", "Để vậy"); hộp thoại chung không chừa vùng an toàn (thanh Home), hàng nút nằm cuối nội dung cuộn.

**Sửa**:
- Vùng an toàn: `css/base.css` đọc `env(safe-area-inset-top/bottom)` một lần vào biến `--safe-top`, `--safe-bottom`; mọi chỗ
  (thanh tab, chân dính, bảng trượt, hộp thoại, màn Nấu thử, màn con `.meta-screen`, thanh "Trong rổ / Xong" của màn Lựa hàng)
  dùng biến (e2e ghi đè biến để mô phỏng iPhone).
- Khung app cao `100dvh` (khung nhìn động). Trình duyệt chưa hiểu `dvh` (iOS Safari trước 15.4): `app.js fitFrameHeight` đo
  `innerHeight` vào `--app-h` (lớp `.is-fit-h`), đo lại khi xoay máy/đổi cỡ.
- `ui/dom.js createPortal(host) → { set(node | null), node() }`: chỗ gắn một lớp phủ ra ngoài vùng cuộn. Bảng chọn món
  (`counter.js paintSheet`) gắn vào lớp nổi gốc `app.overlay` (`.overlay-root` trong `#app`, z-index trên thanh tab), phủ cả thanh
  tab; vẽ lại cùng panel (khách mới, đổi số lượng) không chạy lại hiệu ứng trượt (`.is-steady`) và giữ chỗ cuộn của thân bảng;
  gỡ khi đóng, rời khâu Order, đổi tab, unmount. Viền sáng hướng dẫn tìm nút trong bảng trước (`applyGlow`).
- Bảng trượt `.sheet`: cao tối đa bằng khung app trừ `--safe-top`; đầu bảng và hàng nút (`.sheet-actions`, đệm dưới
  `14px + --safe-bottom`) cố định, thân `.sheet-body` (Số lượng, Ghi chú) cuộn được khi khung thấp.
- Bếp (`kitchen.js`): hai lớp phủ, mỗi lúc một lớp — sân khấu mini-game (`stage`) vẫn trong panel Bếp; bảng chọn cách
  (`sheet`), hộp bước hỏng (`prompt`), hộp xác nhận dự phòng (`confirm`), bảng công bố món (`reveal`) ở lớp nổi `.k-layer.k-pop`
  (`data-testid="kitchen-pop"`) gắn vào `app.overlay` (Nấu thử: app hộp cát nhận `overlay` của app thật). `.k-scope` mang biến màu
  và kiểu của bếp. Bộ chặn "click ma" (mục 24) gắn cả vào lớp nổi. `.k-sheet` cao tối đa bằng khung, cuộn bên trong, đệm dưới có
  vùng an toàn.
- Hộp thoại chung (`modal.js`, CSS `game.css`): lớp phủ chừa vùng an toàn trên/dưới; hộp cao tối đa bằng khung, cuộn bên trong;
  hàng nút cuối hộp (`.modal-actions`, `.ck-actions` — kể cả hàng nút nằm cuối nội dung tùy biến) dính đáy hộp
  (`position: sticky`) nên luôn thấy. `@media (max-height: 600px)` hộp sát mép hơn.
- Hộp tình huống trong ca (`meta.css`, `@media (max-height: 760px)`): gọn lại (hình, tiêu đề 17px, khoảng cách, đệm lựa chọn; chữ
  ≥ 14px, vùng chạm ≥ 44px) để cả 3 lựa chọn — cách an toàn thường nằm cuối — lọt khung không phải cuộn ở 375×553, 360×600,
  375×635+ (kể cả có vùng an toàn); 320×568 hộp vẫn cuộn 18px, lựa chọn cuối lộ một phần.
- Phiếu chấm (không bấm) nằm ngay trên thanh tab kể cả vùng an toàn.
- Phiên bản 0.4.1 (`package.json`, `sw.js VERSION`, `APP_VERSION`) để người chơi PWA nhận bản mới; không thêm tệp nên PRECACHE
  không đổi; thư phiên bản vẫn 0.4.0.

**Kiểm chứng**: E2E `tests/e2e/iphone-overlays.e2e.mjs` — Chromium mô phỏng iPhone (UA iPhone, `isMobile`, `hasTouch`,
`deviceScaleFactor` 3) ở 320×568, 375×553, 390×664, vùng an toàn đáy 34px (ghi đè `--safe-bottom`) và cách iOS cắt vùng cuộn
(`clip-path`); mỗi nút hành động chính: nằm trọn trong khung trừ vùng an toàn, `elementFromPoint` tại tâm và 4 điểm sát mép trúng
chính nút, chạm bằng `page.touchscreen.tap` và có tác dụng (save đổi / lớp phủ đóng / màn kế tiếp): (1) ngày 1 — bảng điểm danh,
Mở hàng, bảng chọn món (chip ghi chú bật/tắt, +/−, "Thêm vào phiếu"), bảng sửa dòng; (2) bếp ca thật dựng sẵn — bảng chọn cách
("Để sau"), Nhấc ngay → hộp bước hỏng không bị click ma đóng, "Làm lại", "Để vậy", hộp "Ra món luôn?", bảng công bố món trọn khung,
phàn nàn (xin lỗi, hoàn tiền), phiếu chấm trên thanh tab; (3) tình huống trong ca (cách an toàn — cuộn trong hộp nếu cần —,
"Bán tiếp"); (4) hộp mua ở Chợ Công Thức; (5) Cài đặt — mã sao lưu, nhập mã (xem trước, "Dùng bản này"/"Thôi"), chơi lại 2 bước,
giới thiệu; (6) Lựa hàng; (7) thẻ sự kiện ngày có lựa chọn. Chạy bộ test này trên mã 0.4.0 thì trượt 6/7 kịch bản. Ma trận đo
độc lập (scratchpad, không vào repo): 9 khung (320×568, 375×553, 375×635, 390×664, 390×844, 414×715, 430×932, 360×600, 1280×800) ×
{Chromium thường, mô phỏng iOS + vùng an toàn 34px} × 7 kịch bản, 792 phép đo: chỉ còn lựa chọn thứ 3 của hộp tình huống cần cuộn
ở 320×568 và 375×553 + vùng an toàn (+ dải "Giờ giả" 24px của chế độ xem trước). `fix-leftovers` (e3): bảng công bố món giờ ở
giữa cả khung nên ở 360×640 nút "Giao cho khách" không còn nằm dưới bảng — chuyển phép thử sang 390×844 (nút vẫn nằm dưới bảng).

## 29. Hướng dẫn lần đầu (tour) và nút "?" — bản 0.4.1 (01/10/2026)

Mỗi màn, mỗi khâu có một tour ngắn (2–6 bước): lớp phủ làm tối nền, khoét sáng đúng phần tử đang nói tới, bong bóng lời Dì Sáu
(tối đa 2 câu). Tour **tự hiện lần đầu** người chơi tới màn/khâu đó rồi ghi "đã xem"; nút "?" xem lại bất cứ lúc nào. Tour giới
thiệu giao diện; lời nhắc tại chỗ của khách hướng dẫn ngày 1 (cô Thu, bạn Nam) và lời Dì Sáu trong khung giữ nguyên, chữ của tour
không lặp lại các lời đó.

**Dữ liệu** `src/data/tours.js` (có trong `DISPLAY_FILES` của test từ cấm):
- `TOURS` — 28 tour (0.4.1: 23; 0.5.0 thêm 5 tour thẻ bước) `{ screen, spot?, lead?, name, auto?, requires?, veteranDay?, steps: [{ target, span?, title, text, place, when? }] }`.
  `target`: data-testid, bộ chọn CSS, hoặc mảng lựa chọn (lấy phần tử đầu tiên đang hiện); `null` = bong bóng giữa khung; không tìm
  thấy thì bỏ qua bước. `span`: vùng sáng phủ từ `target` tới phần tử này (một hàng ô lối vào). `requires`: phần tử phải có thì
  tour mới TỰ hiện (ô đặt tên xe, nút bắt đầu lựa hàng). `auto: false`: chỉ chạy bằng nút "?". `when`: điều kiện thêm
  (`TOUR_CONDITIONS` của `ui/components/tour.js`). `lead` (mục 30): tour đi trước nếu chưa xem, khi người chơi tới thẳng chỗ
  này mà bỏ qua chỗ của tour dẫn.
  Màn mở đầu `mo_dau`; Chuẩn bị `chuan_bi` (+ `su_kien_ngay` khi có thẻ sự kiện ngày, `hang_hiem` khi có thẻ gánh hàng quê — tự
  hiện lần đầu thẻ xuất hiện, nối tiếp nếu cùng lúc); ca bán theo chỗ đang làm (`spot`): Quầy `quay_order`, `quay_bang_mon`,
  `quay_thanh_toan`, `quay_tinh_tien`, `quay_qr`, `quay_phieu_thu`; Bếp `bep_day_phieu`, `bep_dong_mon` (phiếu đã mở; dẫn
  bởi `bep_day_phieu`), `bep_chon`, `bep_thot`, `bep_ra_mon`; 0.5.0: `bep_dap`, `bep_xoay`, `bep_got`, `bep_lac`, `bep_bay` (chỗ
  `card-<loại>`: thẻ "Bước k/N" đầy đủ của loại đó đang chờ chạm; 2 bước chỉ vào `step-card-demo` và `step-card-go`; không đặt
  `veteranDay` vì là cơ chế mới, người chơi cũ cũng được xem; thẻ chỉ đầy đủ khi món nấu dưới 3 lần);
  phiếu chấm `phieu_cham`; `ca_ban` (tổng quan, chỉ bằng nút "?" khi quầy trống); Tổng kết `tong_ket`; màn con `cho_cong_thuc`,
  `viec_hom_nay`, `hop_thu`, `lua_hang`, `so_cong_thuc`.
- `TOUR_SCREENS`: màn → các tour tự hiện khi vào màn / xem lại bằng "?". `HOW_TO_PLAY`: 6 thẻ của trang Cách chơi (hình từ `art.js`).

**Lõi** `src/core/tour.js` (thuần): `defaultTour()`, `toursEnabled`, `setToursEnabled`, `isTourSeen`, `shouldShowTour(state, id,
data?)`, `markSeen(state, ids)`, `resetTours(state, { enable = true })`, `migrateTour(raw, s, data?)` (`save.migrate` gọi cuối;
`STATE_VERSION` vẫn 3, trường thêm được điền khi nạp). Bản lưu cũ chưa có `tour`: xe đã có tên → `mo_dau` đã xem; đã bán ít nhất
1 ca → tour có `veteranDay` ≤ ngày hiện tại coi như đã xem (vòng chơi chính — không bật hướng dẫn giữa ca của người đã quen tay;
`quay_qr` từ ngày 5); tour màn con, thẻ sự kiện ngày, hàng hiếm vẫn tự hiện lần đầu. Bản lưu có `tour`: giữ tour đã xem có trong
dữ liệu, `disabled` boolean.

**Giao diện** `src/ui/components/tour.js` → `app.tour` (tạo trong `createApp`):
- Lớp phủ `.tour-layer` gắn vào `app.overlay` (lớp nổi gốc như bảng chọn món ở mục 28; z-index 80: trên thanh tab và hộp thoại,
  dưới lớp khóa tab). Vùng sáng `tour-hole` (box-shadow phủ tối phần còn lại), bong bóng `tour-bubble` (role dialog, aria-modal)
  có mặt Dì Sáu, số bước, tiêu đề, lời, "Bỏ qua hướng dẫn", "Tiếp"/"Xong", mũi nhọn chỉ vào vùng sáng. Bong bóng nằm dưới hoặc trên
  phần tử (bên đủ chỗ), kẹp trong khung trừ vùng an toàn (đệm của lớp phủ = `--safe-top/--safe-bottom`) và lề 8px; không bên nào
  đủ chỗ thì đè một phần vùng sáng nhưng vẫn trọn trong khung; thân bong bóng cuộn nếu cao hơn khung.
- Phần tử đích ngoài khung nhìn: cuộn các vùng cuộn chứa nó (`.screen`, `.panel`, `.k-main`, thân bảng chọn món…), chừa thanh
  dính (`.act-bar`, `.sticky-foot`, `.k-toolbar`, `.meta-head`, `.mg-foot`), không cuộn khung app. Vùng sáng = phần nhìn thấy của
  phần tử (cắt theo vùng cuộn) + 6px. Kiểm lại mỗi 250 ms, khi cuộn, đổi cỡ; phần tử biến mất (vẽ lại) thì tìm lại hoặc sang bước kế.
- Bàn phím: tiêu điểm ở "Tiếp"; Tab đi vòng hai nút, → sang bước, Esc bỏ qua; phím khác không lọt xuống màn chơi. Nút Back của
  điện thoại khi tour đang hiện (màn con, ca bán) = bỏ qua tour. Giảm chuyển động: tắt hiệu ứng trượt theo quy tắc chung.
  Thông báo nổi ẩn khi tour hiện (`.is-touring`); thẻ Mẹo nghề được giữ (`app.toastHold` → `toast.js hold`, mục 30): đồng hồ thẻ
  đang nổi dừng, thẻ mới chờ, tour đóng thì thẻ nổi tiếp phần thời gian còn lại (ít nhất 1,5 giây).
- Tự hiện: `app.go` → `tour.onRoute(name)`: màn trong `TOUR_SCREENS` thì `want(ids)` chờ tới khi không còn hộp thoại (bảng điểm
  danh, hộp lên chặng…), rồi hiện các tour chưa xem có bước hiện được; màn ca bán gọi `offer([id])` mỗi khung hình theo chỗ đang
  làm. Xem hết hoặc bỏ qua → `markSeen` và lưu ngay; đổi màn giữa chừng → đóng, chưa tính đã xem.
- **Kiểm thử tự động**: `navigator.webdriver` (Playwright) → không tự hiện, trừ URL có `?tour=1` trên localhost/127.0.0.1 — các
  e2e cũ không bị tour chặn; nút "?" vẫn chạy bình thường.
- "Giữ" màn ca bán (`hold(key, on)`, `onHold(fn)`): tour hoặc bảng Hướng dẫn đang mở → `service.js` gọi `setPaused(state, true)`:
  giờ ca, kiên nhẫn khách đứng yên, không mở tình huống trong ca / phàn nàn, không kết ca; phiếu chấm chưa tắt; Bếp `guideHold`:
  bước Chọn giữ đồng hồ đứng yên (`handle.hold` → `createClock().hold` ở `minigames/_util.js`, không tính quá giờ lúc đọc), bước
  mini-game đang chơi dở thì dừng, đóng lại chơi lại từ đầu như khi đổi tab. Thả → `setPaused(false)`. Ca thật không bao giờ tự
  dừng: bản lưu có `shift.paused` (tải lại trang giữa tour) → mở màn ca bán là chạy tiếp (tour chưa xem thì hiện lại).
- Không chen ngang: chỉ mời tour khi không có hộp thoại và Bếp không bận (`kitchen.busy()`: mini-game, bảng chọn cách, hộp hỏi lại,
  công bố món). Chỗ đang làm: phiếu chấm đang hiện → `score` (ưu tiên); tab Quầy `counter.tourSpot()` = `idle | order |
  order-sheet | thanh_toan | tinh_tien | qr | receipt`; tab Bếp `kitchen.tourSpot()` = `card-<loại> | chon | thot | ready | line | rail` (null khi
  bận; `line` = phiếu đang mở còn dòng chưa làm; 0.5.0: `card-<loại>` khi thẻ bước đầy đủ đang chờ — có trước cả kiểm tra bận —
  tour giữ màn thì thẻ dừng tự chạy qua `guideHold` → `card.hold(true)`, tour đóng thì thẻ chạy tiếp phần thời gian còn lại; chỉ
  5 loại mới có tour, loại khác thì chỗ này không có tour nào). Phiếu chấm chỉ tính là `score` khi đã trượt lên xong (`sheetSettled`: hết hiệu
  ứng, độ mờ ≥ 0,9) — trước đó các bước chỉ vào phiếu bị coi là chưa hiện.

**Nút "?"** `src/ui/components/help.js`: `helpButton(app)` (44px, `aria-label` "Hướng dẫn") ở HUD ca bán (lề âm nên HUD không cao
thêm; ≤ 380px HUD gọn lại, ≤ 340px "Ngày n" và giờ xếp 2 dòng), đầu màn Chuẩn bị (sau viên Muỗng Vàng; ≤ 360px bỏ chữ "Muỗng
Vàng"), đầu màn Tổng kết, cuối hàng tiêu đề của màn con có tour (`screenHead(app, { help: true })`: Chợ Công Thức, Việc hôm nay,
Hộp thư, Sổ công thức, Lựa hàng — trừ lúc đang lựa). `openHelp(app)` mở hộp thoại chung `help-sheet` (chặn thời gian ca như mọi hộp
thoại chặn, kèm "giữ" như trên): "Xem lại hướng dẫn màn này" (ghi tên tour; khóa khi màn không có bước nào hiện được; ca bán: tour
của khâu đang làm, quầy trống → `ca_ban`), "Cách chơi" (thẻ ngắn có hình: 4 khâu, bếp và trò nhỏ, chấm sao và tip, sự kiện, hàng
hiếm, mẹo), "Xem lại tất cả hướng dẫn từ đầu" → xác nhận ngay trong bảng (không dùng `confirm()`) → `resetTours` (bật lại tự hiện),
màn đang mở hướng dẫn lại.

**Cài đặt**: công tắc "Hướng dẫn lần đầu" (`setting-tour`, mục Chơi) = `state.tour.disabled`. "Chơi lại từ đầu" đặt lại đã xem,
giữ lựa chọn bật/tắt.

**Kiểm chứng**: unit `tests/unit/tour.test.mjs` (đã xem, đặt lại, bật/tắt, migrate bản có/không có `tour`, save thật bản 0.3.0, lưu
rồi tải lại giống hệt, dữ liệu 2–6 bước, lời tối đa 2 câu, trang Cách chơi có hình). E2E `tests/e2e/tour.e2e.mjs` (UA iPhone, 4 kịch
bản): (1) 375×553 và 390×844 — save mới: tour màn mở đầu → tải lại không hiện lại; tour Chuẩn bị chờ bảng điểm danh đóng; vào ca →
tour Order tự hiện, ca dừng (`data-t`, kiên nhẫn khách, `shift.paused`) → "Bỏ qua hướng dẫn" → ca chạy; "?" trên HUD → bảng Hướng
dẫn (ca dừng) → xem lại tour Order đủ bước; Cách chơi; mỗi bước đo: bong bóng trọn trong khung và ngoài vùng an toàn, nút "Tiếp"
không bị che, nút ≥ 44px, chữ ≥ 14px, vùng sáng khớp khung bao phần nhìn thấy của phần tử đích (±1,5px); (2) bàn phím, công tắc
trong Cài đặt, xem lại tất cả (Thôi / xác nhận); (3) bước Chiên trứng đang chơi: tour Thớt chờ tới khi xong bước và hộp hỏi lại đóng;
(4) tour bước Chọn hiện lâu hơn 2,5 × par: không bị tính quá giờ, bước Chọn vẫn 100 điểm (bỏ phần giữ đồng hồ thì kịch bản này
trượt). Ngoài repo (scratchpad): chụp và đo cả 22 tour ở 375×553, 390×844 và 320×568 mô phỏng iOS (cắt vùng cuộn bằng
`clip-path`, vùng an toàn trên 20px / dưới 34px).
0.5.0: unit thêm ca "M5 tour thẻ bước" (5 tour, chỗ `card-<loại>`, 2 đích, không `veteranDay`, người chơi cũ vẫn được xem,
`STICKY`) và luật lời tour (bước "Trò nhỏ" nhắc đủ 5 thao tác mới theo `MINIGAME_TYPES`; tour thẻ của trò phải bấm Xong thì dặn
bấm Xong, trò tự xong thì nói "tự xong"); e2e `tour` thêm 5 ca (9–13): món chưa nấu lần nào → chạm bước → tour tự hiện trên thẻ,
ca tạm dừng, thẻ đứng chờ quá 1,1 giây, Bỏ qua → ca và thẻ chạy tiếp vào đúng trò. Đo tay ngoài repo (scratchpad `m5/d1/H`): Thớt,
5 tour thẻ bước, Dây phiếu + Dòng món, Chọn, Giao món ở 390×844, 360×600, 320×568 và 375×553 có vùng an toàn 47/34 (có chế độ
tập trung): bong bóng trọn khung, nút "Tiếp" không bị che, vùng sáng khớp đích ±1,5px; lời bước tay mẫu giữ ≤ 3 dòng để bong
bóng không che tay mẫu ở 375×553.

## 30. Vòng kiểm chứng độc lập tour và iPhone: 9 phát hiện đã sửa (01/10/2026)

Hai lượt kiểm chứng độc lập (scratchpad `tour/verify-1`, `tour/verify-tourdoclap`) báo 9 phát hiện; cả 9 đều tái hiện được trước
khi sửa (kịch bản đo ở `tour/after-fix/`), sửa tận gốc và có test hồi quy (chạy trên bản sao mã cũ thì trượt).

1. **Tour phiếu chấm mất bước "Phiếu chấm" và "Tip"** (vẫn bị ghi đã xem → người mới không bao giờ được chỉ luật tip). Tour được
   mời ngay khi phiếu có lớp `.show`, lúc phiếu còn trong suốt (hiệu ứng 0,22 giây); `shown()` coi độ mờ 0 là ẩn nên bỏ hai bước chỉ
   vào phiếu. Sửa: `service.js sheetSettled()` — chỗ `score` chỉ tính khi phiếu đã hiện hẳn (không còn hiệu ứng chạy, độ mờ ≥ 0,9);
   thêm `tour.js fadingIn()` — phần tử đang hiện dần (hiệu ứng độ mờ tới giá trị > 0) coi như đang hiện. E2E `tour` (5).
2. **Thẻ Mẹo nghề bị tour "nuốt"**: thẻ mở bởi chính thao tác chuyển khâu (đọc lại đơn, báo tổng, thối tiền) nổi lên, khung hình
   sau tour của khâu mới hiện và ẩn chồng thông báo, đồng hồ 3 giây của thẻ vẫn chạy → 0–51 ms nhìn thấy. Sửa: `toast.js hold(on)`
   (`app.toastHold`, tour gọi khi bắt đầu/đóng): thẻ đang nổi dừng đồng hồ (chỉ tính lúc thật sự nổi), thẻ mới chờ trong hàng; thôi
   giữ thì thẻ nổi tiếp phần còn lại, ít nhất `TIP_RESUME_MS` 1,5 giây. Thông báo thường không bị giữ (tin ngắn). `app.js` bỏ
   `tour.after` cho thẻ Mẹo nghề. E2E `tour` (6): thẻ "Đọc lại order" ≥ 1 giây sau khi tour Thanh toán đóng (trước: 0 ms).
3. **Lời tour sai luật**: `hang_hiem` bước Giỏ chợ nói "cuối mỗi ca có lượt" — đúng luật: liền 5 khách không sai ở quầy (chuỗi
   Quầy chuẩn, `order.js COUNTER_STREAK_ROLL` = 5, nay là hằng số xuất ra) hoặc ngày Chợ phiên. `quay_order`/`ca_ban` bước Hàng
   khách nói "vòng cạn thì khách bỏ về" từ ngày 1 — đúng luật: từ ngày 2 khách chờ lâu bị trừ sao, từ ngày 4 (`leaveFromDay`) mới
   bỏ về. Unit `tour.test.mjs` "lời tour khớp luật": đối chiếu số trong lời với `COUNTER_STREAK_ROLL`, `DAY_EVENTS.cho_phien`,
   `STRINGS.rare.basketHow`, `BALANCE.leaveFromDay`, `tipFiveStar`/`tipMinBill`, `ticketRailMax`.
4. **Bước tour sai chỗ / không bao giờ tự hiện**: (a) `bep_day_phieu` bước "Làm món này" luôn bị bỏ khi tự hiện (phiếu chưa mở) →
   tách thành tour mới `bep_dong_mon` (chỗ `line`: phiếu đã mở; bước Dòng món + Làm món này), có `lead: ['bep_day_phieu']`: chạm
   thẳng phiếu trên dây ở đầu màn thì hai tour nối tiếp (4 bước), nút "?" khi phiếu đang mở xem lại cả hai; (b) `bep_thot` bước
   "Chọn cách sơ chế" chỉ vào bước có chọn cách (`.k-step.has-method` — `kitchen.js` gắn lớp này cho bước có `method`; món không
   có thì bỏ bước), bước "Trò nhỏ" nói luôn "chạm một bước để làm"; (c) `viec_hom_nay` "Nhận thưởng" / "Đổi việc" ưu tiên nút đang
   bật; (d) `mo_dau` bước 1 viết lại, không lặp lời Dì Sáu trong khung. E2E `tour` (8): khoét sáng đúng nút `cook-line-0`,
   `board-step-thai_dua`, `quest-claim-1`.
5. **Kệ Chọn ở màn thấp** (có từ 0.4.0): vuốt bắt đầu trên kệ không cuộn được khung bếp (`.mg-stage` chặn mọi cử chỉ), sân khấu
   bị ép còn ~30px nên kệ tràn ra ngoài, hàng kệ cuối luôn bị thanh "Trong rổ / Xong" che 1–10px kể cả khi cuộn hết. Sửa
   (`kitchen.css`): `.k-chon-wrap .mg-stage { touch-action: pan-y }` (bước Chọn chỉ có chạm), `.k-chon-wrap { flex: 1 0 auto }`
   (sân khấu không co nhỏ hơn nội dung), thanh chân phủ kín phần đệm dưới của `.k-main` (kệ không lộ ra bên dưới thanh). Màn
   cao như cũ (390×844: kệ đủ trong khung, không cuộn).
6. **Thớt Thái ở màn thấp** (ngoài phạm vi tour, có từ trước): thớt cao cố định 210px nên ở 375×553 + vùng an toàn nguyên liệu nằm
   dưới thanh "Nhát / Xong", chạm vào đó không cắt được. Sửa (`kitchen.css`, chỉ sân khấu trên Thớt): vùng chơi `flex: 1 1 0`,
   thớt cao vừa chỗ còn lại (64px – 250px; ≤ 700px cao tối đa 210px như cũ), nguyên liệu / vạch / vết cắt canh giữa thớt và thấp
   lại theo thớt (không đổi cách chơi: nhát cắt chỉ tính theo hoành độ); đầu sân khấu bước Thái một dòng như bước Chà (mục 26).
   E2E `iphone-overlays` (8) ở 320×568, 375×553, 390×664 + vùng an toàn 34px + cắt vùng cuộn kiểu iOS: vuốt trên ô kệ cuộn được,
   mọi ô kệ có chỗ cuộn để nằm trọn trên thanh chân và chạm trúng, chọn bằng cảm ứng → 100 điểm; thớt, nguyên liệu, mọi vạch
   nằm trọn giữa đầu sân khấu và thanh chân, thái bằng cảm ứng ngay trên nguyên liệu → ≥ 90 điểm.
7. **Nút "?" của màn Chuẩn bị / Tổng kết bị cuộn khuất** sau khi tour tự cuộn xuống tới Mở hàng / Ngày mai. Sửa: hàng đầu màn (tên
   xe, Muỗng Vàng, "?" — `prep.js`; tiêu đề, "?" — `summary.js`) tách khỏi `header` thành con trực tiếp của màn và dính đầu màn
   (`position: sticky`, `css/tour.css`), như `.meta-head` của màn con; `tour.js bringIntoView` chừa chỗ cho hai thanh này.
8. **Vùng an toàn trên**: `.hud`, `.meta-head`, hai hàng đầu màn trên đệm thêm `--safe-top`, chồng thông báo dời xuống theo (hiện `env(safe-area-inset-top)` = 0 vì
   thanh trạng thái kiểu `default`; đổi sang `black-translucent` thì nút "?" không nằm dưới tai thỏ). E2E `tour` (7) ở 375×553
   mô phỏng tai thỏ 47px: "?" ở HUD, Tổng kết và Chuẩn bị cuộn tới đáy, Việc hôm nay đều nằm dưới vùng an toàn và chạm trúng.

Phiên bản vẫn 0.4.1 (chưa phát hành); không thêm tệp nên PRECACHE không đổi.

## 31. M5: giao diện kiểu game nấu ăn — Đợt 0 (bản 0.4.2) và Đợt 1 (bản 0.5.0) (02/10/2026)

Mục tiêu: bỏ cảm giác "ô vuông có chữ", làm lại giao diện trong ca theo kiểu game giả lập nấu ăn (hình to, cel-shading viền
mực, nút bánh kẹo, thẻ bước có tay mẫu, con dấu, màn ra món), thêm 5 thao tác bếp mới, **không đổi cân bằng**. Kế hoạch 4 đợt
(`docs/tham-khao/m5-thiet-ke.md`): Đợt 0 bản mẫu (dừng chờ duyệt), Đợt 1 nền tảng + Bếp + mini-game (0.5.0), Đợt 2 Quầy/HUD/
phố/phiếu chấm (0.5.1), Đợt 3 các màn ngoài ca (0.5.2). Mọi thay đổi là thêm hoặc sửa tệp; chuyển CSS/hàm sang tệp mới là cắt-dán
nội dung, không xóa tệp.

**Quyết định đã chốt với người dùng (02/10/2026, sau khi duyệt Phòng mẫu Đợt 0):** duyệt phong cách mẫu, không yêu cầu chỉnh;
Q1 **bật chế độ tập trung khi nấu** (màn cao dưới 760px); Q6 màn ra món khoảng 2 giây (`REVEAL_MS` 2.200, chạm để bỏ qua; giảm
chuyển động 1.400), `SHEET_MS` giữ 2.000; Q3 món hiếm dùng hình món nền + huy hiệu ★; Q4 thư "Có gì mới" 0.5.0 không quà; Q2 bước
Bày cho bánh mì/trà tắc để M6; Q5 không dùng mẹo rung iOS; Q7 vùng xanh đập trứng 0,40–0,70 + sàn giờ; Q8 giữ `mau.html`; Q9 giữ
`system-ui` cho chữ thân.

**Đợt 0 (0.4.2).** Font Baloo 2 800 tự lưu; `css/theme.css`, `css/fx.css`, `css/counter.css`; `ui/vfx.js`, `ui/motion.js`;
5 âm `stamp, sparkle, fanfare, tick, whoosh`; 19 hình mẫu (12 chủ thể) đúng tệp đích trong `ui/art/` nhưng chưa vào `ICONS`;
thành phần thẻ bước, con dấu, ra món, Dì Sáu phản ứng; màn gọi món mẫu; `buildFrame2` và nhánh `ctx.look === 2` của Thái; trang
Phòng mẫu `mau.html` + `mau/`; `tools/dong-goi-artifact.mjs --entry mau.html`; sửa điều hướng của service worker (mục 16.1); test
từ cấm quét thêm `mau.html`, `mau/`. Game chính không đổi hành vi.

**Đợt 1 (0.5.0)** — chia gói theo tệp sở hữu (thiết kế mục 3.2):
- Bước 0: cắt CSS sân khấu từ `kitchen.css` sang `mg-prep.css` (khung, Chọn, Chà, Thái), `mg-heat.css` (Nêm, Canh lửa, Rót),
  `mg-mix.css` (mới), gắn vào `index.html` và PRECACHE, không đổi luật.
- A (lõi và dữ liệu): 5 hàm chấm (mục 10), `SCALE_KEYS` thêm `turns`, `strips` (mục 9), `migrateCookBoard` (mục 12), 15 bước đổi
  loại (mục 6), 5 mục `MINIGAME_TYPES`, `DIALOGUE.diSau.stepReact` và `typeTips`, `_gesture.js` (mục 13.3).
- Hình: nguyên liệu tươi (13 + 21 trạng thái), đồ khô/chai lọ (29 + 5 trạng thái), 5 món, 14 dụng cụ (4 biểu tượng thao tác mới),
  14 đạo cụ sân khấu; ráp nối gộp thành mặt tiền `art.js` (mục 13.3).
- E1/E2/E3: 11 plugin vẽ lại theo `buildFrame2`, 5 plugin mới; giữ mọi testid và `data-*` cũ (mục 14).
- F: màn Bếp (Thớt huy hiệu, hình trạng thái, thẻ bước, con dấu giữ sân khấu ~700 ms, ra món 2,2 s, tour trên thẻ bước) và chế
  độ tập trung (mục 13.3).
- G: `app.vfx`, 5 âm thao tác và `ACTION_SOUNDS`, `stepProgress`, `showStepResult`, `.btn` bánh kẹo toàn game.
- H: 5 tour thẻ bước, lời tour Thớt và trang Cách chơi nhắc thao tác mới, `STICKY` của tour (mục 29); tài liệu này,
  `docs/de-xuat-thiet-ke.md` (mục 6.4, 6.5, 6.13, 6.14, 14.4c), `docs/can-bang.md` (mục 7.1), `README.md`.
- I: bộ giải 5 thao tác trong `tests/e2e/helpers.mjs`, `_kitchen-smoke.mjs`, `hanh-trinh.mjs`; sửa `fix-leftovers` theo thiết kế
  mục 3.3; e2e mới `m5-bep`, `m5-save`; 5 ca tour thẻ bước trong `tour.e2e`.
- Ráp nối: `art.js` mặt tiền, `minigames/index.js` (11 loại), `minigame-ui-contract.test`, `sw.js` (VERSION, PRECACHE),
  `package.json`, `APP_VERSION`, dòng preload font trong `index.html`, thư phiên bản 0.5.0 (`phien_ban_0_5_0`, không quà; save có
  `seenVersion` ≤ 0.4.x nhận thư, save mới chỉ ghi `seenVersion` 0.5.0).

**Bất biến cân bằng** (khóa bằng `tests/unit/m5-balance.test.mjs`, so **từng bước** với bảng chép từ 0.4.1): id bước, par, w,
critical, retryCost, ing, after; tổng par / Σw / giá / vốn của 9 món; `BALANCE`; `STATE_VERSION` = 3. Bảng ở `docs/can-bang.md`
mục 7.1. Giữ id bước nên `uiRand` (băm theo id bước) và seed của e2e gần như không lệch.

**Save.** Cấu trúc không đổi; phiên nấu dở ở Thớt của bản cũ được dựng lại bảng bước theo công thức mới (`migrateCookBoard`)
để bước chưa làm hiện thao tác mới; kết quả bước đã làm, tiền, phiếu, giá vốn, lượt làm lại giữ nguyên.

**Ràng buộc kỹ thuật nhắc lại cho các đợt sau.**
- Lõi `src/core` thuần; module giao diện import được trong Node (không chạm `document`/`window`/`matchMedia` ở cấp module).
- Hiệu ứng chỉ animate `transform`/`opacity`; lớp hiệu ứng `pointer-events: none`; tôn trọng giảm chuyển động (lớp
  `reduce-motion` + `prefers-reduced-motion`, `isReduced`; WAAPI/canvas tự kiểm); hoạt ảnh trên phần tử con, thời lượng hữu hạn
  (giữ `sheetSettled` của phiếu chấm).
- Vùng chạm ≥ 44px, chữ ≥ 13px (chữ tour ≥ 14px), nút không bị che (`elementFromPoint`), không tràn ngang; chạy được ở 390×844,
  360×600, 320×568 và 375×553 có vùng an toàn 47/34 (`--safe-top`/`--safe-bottom`).
- Test từ cấm quét chuỗi con (chữ thường) cả tên biến và chú thích trong `src/`, `css/`, `index.html`, `sw.js`, `mau.html`, `mau/`
  (tránh `grabbed`, `snapAs…`, `tipOs…`); tệp hiển thị cấm thêm từ nội bộ.
- Mỗi tệp JS/CSS mới phải vào PRECACHE (khớp tuyệt đối với cây thư mục) và CSS mới phải gắn trong `index.html`.

**Ghi nhận khi viết (02/10/2026; mục đã sửa ghi rõ "Đã sửa"):**
- Bước Khuấy ly (`khuay`, par 2, 3 vòng): bản đầu phải xong trong 4 giây (2 × par) mới không bị trừ 15, bộ giải cảm ứng thử được
  85. **Đã sửa** trong vòng sửa sau kiểm chứng: mốc trừ = `overtimeAt` = max(2 × par, sàn giờ), sàn khuấy 1,4 × vòng + 1, nên
  Khuấy đều 1 phần chỉ bị trừ khi hết giờ (5,2 giây); bộ giải cảm ứng được 100. Vẫn cần đo với người chơi thật
  (`docs/can-bang.md` mục 7.1, chỉ số 30).
- Thẻ bước đầy đủ bản đầu chỉ hiện khi món nấu dưới 3 lần (`HINT_HIDE_AFTER_COOKS`), nên người chơi cũ đã nấu một món nhiều lần
  không thấy tour thẻ bước của thao tác mới ở món đó. **Đã sửa** (vòng sửa F, `stepCardFull` ở `ui/screens/kitchen.js`): món đã
  nấu từ 3 lần mà gặp loại thao tác mới chưa xem hướng dẫn (`bep_<loại>`) vẫn hiện thẻ đầy đủ; nấu thử thì không.
- Màn rất thấp 375×553 có vùng an toàn: dù đã tập trung, panel nấu chỉ khoảng 300px; Thớt phải cuộn khi có từ 2 trạm nguyên
  liệu; bong bóng tour bước "Kệ và bẫy" đè nửa trên kệ (kệ cao hơn chỗ trống, tour vẫn trọn trong khung).
- `art.js` vẫn giữ kiểu cũ cho các icon chỉ có ở bộ cũ (sự kiện, thư, rương, món tương lai) — Đợt 3 (gói hình meta) vẽ lại.
