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
icons/                     icon.svg (gốc) + icon-192.png, icon-512.png, apple-touch-icon.png (dựng bằng tools/make-icons.mjs)
tools/make-icons.mjs       dựng PNG từ icon.svg bằng Chromium (Playwright); chạy tay `npm run icons`, PNG được commit
css/base.css               biến màu, font hệ thống, reset, bố cục khung điện thoại
css/game.css               giao diện các màn và mini-game
css/settings.css           (M3) màn Cài đặt, nút Cài đặt/nhắc sao lưu/"Có bản mới" ở màn Chuẩn bị, hộp thoại sao lưu
src/main.js                khởi động: nạp save, tạo app, router, vòng lặp
src/core/                  logic thuần
  rng.js  money.js  clock.js  bus.js  state.js  save.js
  order.js  customer.js  shift.js  kitchen.js  minigame-scoring.js  scoring.js
  economy.js  mastery.js
src/data/                  nội dung + cân bằng (export const … = Object.freeze(...))
  index.js  balance.js  ingredients.js  recipes.js  minigame-types.js  customers.js
  dialogue.js  reviews.js  upgrades.js  tips.js  strings.js
src/ui/
  dom.js  app.js  router.js  loop.js  input.js  format.js  art.js  audio.js
  components/ hud.js toast.js modal.js progress4.js patience.js ticket-rail.js cash-drawer.js numpad.js
  screens/    title.js prep.js service.js counter.js kitchen.js summary.js
  minigames/  index.js chon.js cha.js thai.js cham.js lua.js rot.js
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
tests/e2e/helpers.mjs      nạp Playwright, ngữ cảnh 390×844 cảm ứng (openGame({clock, viewport}): clock true | {time} cài đồng hồ giả),
                           người chơi tự động qua data-testid (playBoard dùng cả cho Nấu thử; playShiftUi chơi cả ca),
                           seedSave (nạp save dựng sẵn bằng encodeSave vào khóa thật), enterPrep, claimCheckinIfShown,
                           readSave/waitSave (đọc DEV_SAVE_KEY khi đã mở bằng ?devNow, không thì SAVE_KEY),
                           resolveIncidentIfShown (M3: gặp hộp tình huống trong ca thì chọn cách an toàn; người chơi tự
                           động gọi sẵn ở waitCustomerOrEnd / serveAtCounter / cookAndServe / playShiftUi),
                           waitController (chờ service worker kích hoạt, đã cất đủ tệp), pollEval(page, fn, arg, {timeout, label})
                           (thăm dò page.evaluate tới khi truthy — thay page.waitForFunction với hàm trả Promise)
tests/helpers/static-server.mjs  perfect-player.mjs (M3: playShift(state, ctx, { incident: chọn }) và handleIncident
                           xử lý tình huống trong ca như giao diện ở tab Quầy)
docs/                      tài liệu
package.json
```

M2 (lõi + dữ liệu, đã có — chi tiết mục 15): `core/meta.js stats.js rewards.js checkin.js quests.js mail.js chains.js shop.js events.js progression.js`, `data/checkin.js quests.js mail.js chains.js shop.js events.js day-events.js progression.js`, test `tests/unit/meta-*.test.mjs` (tiện ích `tests/helpers/meta-helpers.mjs`).
M2 giao diện (đã có — mục 13.1): `css/meta.css`, `ui/screens/shop.js tasting.js quests.js mailbox.js event.js stage-up.js`, `ui/components/meta-ui.js chain-card.js checkin-popup.js`; e2e `tests/e2e/m2-meta.e2e.mjs` (điểm danh qua 04:00, sự kiện → Chè bưởi → hết mùa vẫn giữ, Shop, Việc hôm nay), `tests/e2e/m2-ui.e2e.mjs` (Nấu thử, sự kiện ngày + Phiếu Chợ Sớm, soát bố cục 360×740), `tests/e2e/checkin-quests.e2e.mjs`, `tests/e2e/shop.e2e.mjs`, `tests/e2e/event-2011.e2e.mjs` (luồng đầy đủ qua giao diện thật, mục 15.10).
M3 nền tảng (đã có — mục 16): `manifest.webmanifest`, `sw.js`, `icons/`, `tools/make-icons.mjs`, `css/settings.css`, `ui/screens/settings.js`, mã sao lưu trong `core/save.js`, âm thanh `ui/audio.js`; test `tests/unit/pwa.test.mjs backup-code.test.mjs audio.test.mjs`, e2e `tests/e2e/pwa-backup.e2e.mjs`.
Vòng soát lỗi M3 (mục 18.5): test `tests/unit/review-m3-fixes.test.mjs`, e2e `tests/e2e/save-safety.e2e.mjs`, `tests/e2e/review-m3-ux.e2e.mjs`.
M3 nội dung (đã có — mục 17): `core/incidents.js notebook.js recipe-book.js`, `data/incidents.js`, `ui/screens/notebook.js recipe-book.js` (đăng ký trong `SCREENS` của `src/main.js`, có trong PRECACHE của `sw.js`); màn Chuẩn bị gọn (lưới 7 ô lối vào); test `tests/unit/incidents.test.mjs notebook-recipe-book.test.mjs money-rounding.test.mjs`, e2e `tests/e2e/incident-notebook.e2e.mjs`.

## 3. package.json

```json
{
  "name": "bep-khoi-nghiep",
  "version": "0.3.0",
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

`version` trùng `VERSION` của `sw.js` và `APP_VERSION` của `src/ui/app.js` (có test). Đổi tệp của game khi phát hành thì tăng cả ba.
E2E nạp Playwright bằng `createRequire`, thử `require('playwright')` rồi tới `/opt/node22/lib/node_modules/playwright`. Biến `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` đã có sẵn trong môi trường.

## 4. Cấu trúc save (state gốc)

`src/core/state.js` xuất `defaultState(seed)`:

```js
{
  version: 2,              // M1 là 1; M2 nâng lên 2 (save.migrate tự nâng, mục 12 và 15)
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
    incidentFrequency: 'vua'   // M3: tần suất tình huống trong ca 'nhieu' | 'vua' | 'it' (INCIDENT_FREQUENCIES của state.js)
  },
  history: [],             // tối đa 60 bản tổng kết ca (xem economy.summarizeShift)
  shift: null,             // ca đang chơi (mục 7) hoặc null
  clock: { maxSeen: 0 },
  rev: 0,                  // số hiệu bản ghi: tăng mỗi lần lưu (writeSave); tab cũ thấy bản lưu có rev lớn hơn thì không ghi đè
  backup: { lastAt: 0, since: 0 },  // M3: ms lần chép/tải mã sao lưu gần nhất; since = mốc bắt đầu tính nhắc (main.js ghi lần đầu mở)
  incidents: {             // M3 (mục 17.1): tình huống trong ca
    since: 0,              //   số ca liền (từ ngày 3) chưa gặp tình huống nào → bảo hiểm khi đủ 3
    recent: [],            //   id tình huống đã gặp, mới nhất cuối (tối đa 10) → không lặp 5 loại gần nhất
    log: [],               //   nhật ký ngắn [{day, id, choice, money, cost, refund, rep}] (tối đa 20, mới nhất đầu)
    debts: [],             //   sổ ghi nợ khách quen [{id, regularId, name, amount, fromDay, dueDay, repayDay|null, status: 'cho'|'da_tra'|'quen', paidDay?}]
    bonus: null,           //   {day, customers, rep}: khách thêm ở ca `day` (ly trà "mở hàng"); ca đó đã đủ trần khách
                           //   thì thay bằng `rep` danh tiếng (vòng soát lỗi M3)
    total: 0               //   số tình huống đã xử lý
  },
  notebook: { claimed: [] }  // M3 (mục 17.2): nhóm Mẹo nghề đã nhận thưởng đủ nhóm
  // M2 thêm (defaultMeta() trong state.js, mô tả ở mục 15): items, cosmetics, titles, unlocks, prep, checkin, daily,
  // mail, chains, shop, eventRecipes, tasting, events, realDays, progression, track; stats có thêm các khóa M2.
}
```
`version` vẫn là 2: các trường M3 (`settings.volume`, `settings.incidentFrequency`, `backup`, `incidents`, `notebook`) chỉ thêm, `save.migrate` điền mặc định cho save v1/v2 (`migrateSettings`, `migrateContentM3`). `settings.tips = false` chỉ tắt thẻ Mẹo nghề **nổi** trong ca: lõi (`state.unlockTip`) vẫn mở thẻ, ghi `tipsSeen` và phát `tip.unlocked` (Sổ tay nghề vẫn đầy), `app.js` không hiện thẻ.

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
`DATA` thực tế có thêm (chỉ thêm, không đổi): `ROLE_LABELS, SPOKEN, SYNONYMS, LINE_KINDS, REVIEWS, TIP_GROUPS, describeLine, readbackText, tipsForTrigger`; M2: `CHECKIN, QUESTS, QUEST_GROUPS, QUEST_CONFIG, MAIL_CONFIG, MAIL_WELCOME, MAIL_VERSIONS, MAIL_HOLIDAYS, MAIL_EVERYDAY, MAIL_LATE_REVIEW, MAIL_QUEST, CHAINS, NPCS, CHAIN_WHERE, SHOP, ITEMS, COSMETICS, TITLES, UNLOCKS, EVENTS, DAY_EVENTS, DAY_EVENT_CONFIG, STAGE_UP, POST_GOALS` (mục 15). `BALANCE` thêm `refIncomeTable`, `eventCustomerCap`; `STRINGS` thêm `meta`, `reasons`. M3 nội dung thêm `INCIDENTS, INCIDENT_CONFIG` (`data/incidents.js`, mục 17.1), `TIP_GROUP_REWARDS` (`data/tips.js`, mục 17.2); mỗi thẻ `TIPS[]` có thêm `hint` (gợi ý cách mở); `TITLES` thêm 4 danh hiệu nhóm Sổ tay nghề; `STRINGS.errors.tu_choi_doi_mon`.

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
  tipFiveStar: 5000, tipBonus: 10000,                    // bội 5.000đ, bỏ vào hũ tip
  reputationByStars: { 5: 3, 4: 2, 3: 1, 2: 0, 1: 0 },
  masteryLevels: [0, 5, 15],                             // goodCooks cần cho cấp 1,2,3
  autoStepScore: 80, retryScoreCap: 85,
  loanAmount: 240000, loanRepayRate: 0.25, loanInterest: 0.10
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
      { id: 'dap_trung', type: 'cham', label: 'Đập trứng vào chảo', ing: 'trung_ga', params: { mode: 'exact', n: 2, target: true }, par: 2, w: 2 },
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

### minigame-types.js
```js
export const MINIGAME_TYPES = Object.freeze({
  chon: { name: 'Chọn nguyên liệu', hint: 'Chạm để bỏ vào rổ, chạm lần nữa để lấy ra.' },
  cha:  { name: 'Chà rửa', hint: 'Vuốt qua lại lên các vết bẩn.' },
  thai: { name: 'Thái', hint: 'Kéo dao tới vạch chấm, nhấc tay để cắt.' },
  cham: { name: 'Chạm', hint: '…' },
  lua:  { name: 'Canh lửa', hint: 'Nhấc chảo khi kim nằm trong vùng xanh.', skins: { chao, phin, noi } },
  rot:  { name: 'Rót', hint: 'Giữ để rót, thả tay đúng vạch.', skins: { ly, to } }
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
M2 (đọc `sh.mods`, ca M1 không có `mods` vẫn chạy như cũ): trọng số món × `mods.recipeWeight`, thêm ghi chú theo `mods.noteBoost`, kiên nhẫn × `mods.patienceMul` (customer.js); tip × `mods.tipMul` làm tròn bội 5.000đ, giá vốn × `mods.cogsMul` khi chốt bước chọn (kitchen.js). `orderableRecipes`: món `event` bán được khi đã nhận qua sự kiện (`state.eventRecipes[id]`, giữ vĩnh viễn, bán quanh năm) hoặc khi `ctx.data.isEventActive` báo đang mở; chưa sở hữu thì không ai gọi. `history[]` có thêm `lateReviews [{customerId, name, amount}]`.

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
            cogs: 0, waste: 0, refunds: 0, tips: 0, fakeQrLoss: 0 },
  served: [id], lost: [id], missed: 0,
  scoreSheets: [ScoreSheet],                   // phiếu chấm từng khách
  counterStreak: 0,                            // chuỗi "Quầy chuẩn" (luôn 0 khi bật Hỗ trợ tính tiền)
  nextTicketNo: 1,
  // M3 (mục 17.1)
  incident: null | { id, afterClips, status: 'cho'|'xong', rng, cap, guaranteed, detail, choice, result, shownAt? },
  debtIn: 0,                                   // tiền khách quen trả nợ vào ca này (tính vào lãi ca)
  debtNotes: [ {kind: 'tra'|'quen', name, amount, text} ],
  bonusNote?: {customers, rep},                // khách thêm nhờ ly trà "mở hàng" (hoặc danh tiếng thay thế khi đã đủ khách)
  appVersion?: '0.3.0'                         // (giao diện ghi lúc mở ca) phiên bản game; main.js báo khi ca mở lại ở bản khác
}
```

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
  undercharge /* số báo thiếu */, overchanged /* đã thối dư */, remadeErrors /* lỗi bếp của món bị phàn nàn rồi làm lại */, refunded }
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
export function confirmOrder(state, ctx) → { ok, reason?: 'phieu_rong'|'chua_doc_lai'|'khong_hop_le' }   // yêu cầu readbackDone và phiếu khác rỗng → stage 'thanh_toan'
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
Ticket = { id, no /*#001*/, customerId, lines: [ {recipeId, qty, notes} ], createdAt, status: 'cho'|'dang_lam'|'xong', done: [DishResult|null] }

CookSession = { ticketId, lineIndex, recipeId, qty, notes,
  phase: 'chon'|'thot'|'xong',
  picked: [ingredientId],             // kết quả bước chọn
  chonScore: null, chonMistakes: 0,
  steps: { [stepId]: { score, grade, method, auto, retried, tag } },   // bước đã chơi
  activeStepId: null, retriesLeft: 1,
  // bổ sung thực tế
  board: [bước hiệu lực, trừ chon], cost: {cogs, waste}, retryPending: null|stepId, result: null|DishResult, remake: false }
// Ticket thực tế có thêm receiptNo; phiếu làm lại có remake: true (kẹp đầu dây, có thể vượt ticketRailMax).

export function effectiveSteps(recipe, notes, picked = null, qty = 1) → steps[]
   // áp removes/patch; bỏ bước của nguyên liệu bị loại, nguyên liệu tùy chọn không được dặn, hoặc (khi có picked) không được chọn;
   // nhân n/N/cuts/strokes/targets × qty; par × (1 + 0,4(qty − 1)); lọc `after` theo bước còn lại
export function startCook(state, ticketId, lineIndex, ctx) → CookSession | null   // null khi đang nấu dở món khác / dòng đã xong; trừ giá vốn khi chốt bước chọn
export function submitChon(state, picked, mistakes, ctx) → { ok, blockedMissingMain, missing?, score, errors, cost }   // thiếu nguyên liệu chính → ok:false, không trừ tiền
export function availableSteps(state) → [stepId]                 // chưa làm, đủ ràng buộc after
export function submitStep(state, stepId, { score, method, tag?, details? }, ctx) → { ok, score, grade, methodWrong, tag } | { ok:false, reason: 'chua_mo'|'khong_hop_le' }
   // lưu điểm (đã trừ −15 nếu method sai); details.value > 1,0 (lua) → tag 'chay'; details.level > 1,02 (rot) → 'tran'; emit step.done
export function autoStep(state, stepId, ctx) → { ok, score, grade } | { ok:false, reason }   // "Tự làm": chỉ bước w=1, không phải chon, cần thạo cấp 2 → 80 điểm
export function retryStep(state, stepId, ctx) → { ok, cost, step } | { ok:false, reason }   // 1 lượt/món, trừ retryCost vào ledger.waste; điểm mới tối đa 85
export function finishDish(state, ctx) → DishResult               // "Ra món": bước chưa làm = 0 điểm; tính Q (scoring.js); ghi vào ticket.done; cook.phase = 'xong'
export function abandonDish(state, ctx) → { ok, waste }           // bỏ món: giá vốn đã trừ → ledger.waste; phiếu quay lại dây
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
export function getStep(state, stepId) → bước đã áp patch + qty (để mount mini-game)
export function boardSteps(state, ctx) → [{id,type,label,ing,w,critical,par,params,method,after,done,available,result,canAuto,canRetry}]
export function beginStep(state, stepId) → bước | null           // đặt cook.activeStepId (tải lại giữa chừng thì chơi lại bước đó)
export function linePar(recipe, line) ; linesPar(lines, recipes) → giây
```
Một dòng phiếu có số lượng n = **một lượt nấu** (tham số nhân theo n, par × (1 + 0,4(n − 1))). Dòng khác ghi chú là lượt riêng.

Giá vốn: khi `submitChon` thành công, trừ tổng `cost × qty` của **mọi nguyên liệu đã chọn** vào `ledger.cogs` (phần thừa, bẫy ghi thêm vào `ledger.waste`). M3: sau hệ số Phiếu Chợ Sớm, `cogs` và `waste` của mỗi lượt nấu được làm tròn tới bội 500đ gần nhất (`roundCost`; nguyên liệu lẻ 100–400đ, ghi chú "Cay"/"Không hành"/"Không đá") nên Tiền quán luôn là bội 500đ; `retryCost` cũng qua `roundCost`.

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
```

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
export function tipFor(stars, flawlessAny, persona, balance?) → đồng   // 5 sao: 5.000đ; có món Không tì vết hoặc khách khó tính: 10.000đ
   // M2 (kitchen.finalizeCustomer): đang trong chuỗi "Quầy chuẩn" (sh.counterStreak ≥ 5) → 10.000đ; không áp khi bật Hỗ trợ tính tiền
   //   (lúc đó clipTicket giữ counterStreak = 0). Trong mùa sự kiện: + EVENTS[id].festiveRep danh tiếng mỗi phần món lễ đạt Ngon trở lên.
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
   // M3: incidents [kết quả tình huống đã xử lý: {id, name, choice, label, safe, text, money, cost, refund, rep, bonus, debt, starLoss, loss, who, tipId}],
   //     debtIn (khách quen trả nợ, cộng vào profit), debtNotes
   // bất biến (có test): ví sau ca − ví đầu ca = profit − loanRepaid
export function settleShift(state, summary)   // wallet += (tiền mặt vượt quỹ lẻ) + QR + tip + tiền trả nợ (M3) − chi phí cố định − hoàn tiền; trả nợ nếu có
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
   // Vòng soát lỗi M3: ví lẻ của save cũ làm tròn LÊN bội 500đ (report.walletRounded; đang dở ca thì sh.walletStart dời theo),
   //   kỷ lục lãi ca lên bội 500đ, nợ Dì Sáu xuống bội 500đ, quà thư chưa nhận lên bội 1.000đ; bước chuỗi kẹp theo số bước
   //   trong dữ liệu (≥ số bước → done, bỏ claimable ngoài khoảng); ca dở không đủ cấu trúc (bản khác đổi cấu trúc ca, hỏng)
   //   → hủy ca, hoàn ledger.cogs + ledger.waste vào ví, ngày giữ nguyên (report.shiftDropped = {day, refund}), không bỏ im lặng
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
export function codeLosses(raw, data?) → { recipes: [id], upgrades: [id] }
export function extractCode(text) → mã | null                       // bỏ khoảng trắng/xuống dòng/chữ thừa; nhiều đoạn 'BKN1.' thì lấy đoạn dài nhất
export function backupSummary(state) → { shopName, day, chang, wallet, reputation, goldSpoons, recipes /*số món*/, shiftsPlayed, inShift }
export function lzCompress(bytes) → bytes ; lzDecompress(bytes, maxBytes = BACKUP_MAX_BYTES) → bytes   // LZ77 kiểu LZ4, đồng bộ; hỏng → ném lỗi
export const ARCHIVE_PREFIX = 'bkn.save.old.' ; archivePrefix({ keys }?) → '<khóa save>.old.'
export function archiveSave(storage, state, ms, { keys }?) → { ok: true, key, code } | { ok: false, reason: 'loi_ghi' }   // không ghi đè khóa đã có
export function listArchives(storage, { keys }?) → [{ key, at, code }] (mới nhất trước)
export function backupDue(state, nowMs, everyMs = BACKUP_REMIND_MS /*7 ngày*/) → boolean
export function migrateSettings(raw) → settings                    // công tắc boolean, volume kẹp 0..1, incidentFrequency hợp lệ
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
  Vòng soát lỗi M3: `saveProblem()`, `setSaveProblem(kind | null, { block })`, `openBackup` (main.js gắn), `toastLimit(fn | null)` (màn ca bán giới hạn chiều cao chồng thông báo tới mép trên thanh 4 khâu: thông báo không vừa xếp hàng theo thứ tự đến, thông báo thường chờ quá 3,5 giây thì bỏ vì tin đã cũ; thẻ Mẹo nghề vẫn mỗi lần 1 thẻ). Màn ca bán gộp tiến độ Việc hôm nay đến cùng lúc thành 1 thông báo và không báo tiến độ việc khi khách hướng dẫn ngày 1 còn trong ca.
  Tham số URL: `?seed=N` chỉ có tác dụng khi chưa có save; `?test=1` (chỉ trên localhost/127.0.0.1) bật `settings.assistMotion` cho kiểm thử tự động.
- `screens/counter.js`: `mountCounter(root, app, { switchTab })` → `{ el, update, onShow, onHide, unmount }`. Nút hành động mỗi khâu (Đọc lại đơn/Chốt order, Đưa tiền thối, QR, Kẹp phiếu bếp) nằm trong thanh `.act-bar` dính đáy panel; sang khâu mới panel tự cuộn để thấy phần thao tác. Phiếu chấm có 5 hàng: Order, Báo tổng (`bao_du`, `bao_thieu`), Thối tiền (`thoi_thieu`, `thoi_du`, `qr_gia`), Bếp, Thời gian chờ. `screens/kitchen.js`: `mountKitchen(root, app)` → `{ unmount, update, onShow, onHide, selectTicket(ticketId) }`; nút "‹ Phiếu" (và chạm phiếu trên dây chung) đưa về dây phiếu ở cả bước chọn lẫn Thớt, rổ đang chọn được giữ; ô "Đang làm" trên dây phiếu có "Bỏ món" + "Làm tiếp"; trên Thớt thẻ công thức thu gọn (chỉ ghi chú đỏ, nguyên liệu và các bước gập lại); màn `service` nạp bếp bằng `import()` động, gọi `update(dt)` mỗi khung hình và `onShow/onHide` khi đổi tab (rời tab giữa mini-game → bước đó chơi lại từ đầu).
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
// mỗi file chon.js, cha.js, thai.js, cham.js, lua.js, rot.js:
export default {
  type: 'thai',
  mount(stage /*HTMLElement*/, step /*bước đã áp patch*/, ctx /*{ app, recipe, zoneMul, assist, data, notes, qty, rand, slowBurn, (chon:) shelf, basketHint }*/)
    → { result: Promise<{ score, details }>, destroy() }       // destroy() → result nhận null
}
// index.js: export const MINIGAMES = { chon, cha, thai, cham, lua, rot }; export function playStep(stage, step, ctx); export function hintFor(step, data)
```
Handle có thể có thêm `snapshot()` (chon: `{picked, mistakes}`); ctx của chon nhận `initial: {picked, mistakes}` để khôi phục rổ khi người chơi về dây phiếu/đổi tab rồi quay lại. Hỗ trợ thao tác ở bước chọn **không** gợi ý ngay: ô cần lấy chỉ nhấp nháy sau 1,5 × par (thường là 2,5 × par, kèm phạt). Rót (rot) rời tab khi đang giữ: chỉ tạm dừng, lượt đó rót tiếp được, không bật "Xong", không tự kết thúc.
`details` theo loại (bếp chuyển thẳng vào `submitStep`): chon `{picked, mistakes, tapMistakes, overtime, elapsed}`; cha `{spots[] | reversals, strokes, elapsed}`; thai `{cuts[], extra, guides, elapsed}`; cham `{mode, taps, n, distances | taps, N, T | counts, targets, elapsed}`; lua `{value, zone, shown, elapsed}`; rot `{level, pours, zone, shown, elapsed}`. `rand` là bộ ngẫu nhiên tất định theo seed:ngày:phiếu:dòng:bước nên chơi lại một bước giữ nguyên vạch/vết.
Mini-game chỉ đo thao tác và gọi hàm chấm trong `core/minigame-scoring.js`; không tự sửa state. Màn `kitchen` nhận `result` rồi gọi `submitStep`. Thời gian đo bằng `performance.now()`. Mỗi bước tự kết thúc ở 2,5 × par (trừ `chon`). Thẻ gợi ý 0,8 s trước bước, chạm để bỏ qua, tự ẩn sau 3 lần nấu món đó.

### 13.1 Giao diện M2

- `app.nowInfo()` = `makeNowInfo(app.state, app.now())` (cập nhật `clock.maxSeen`); `app.session` (không lưu): `checkinShownDay`, `mailToastIds`, `pendingMail` (thư mới lúc mở game, vd thư chào mừng).
- Màn mới (router): `shop` (params `{tab: 'recipes'|'upgrades'|'spoons'}`), `tasting` (`{recipeId}`), `quests`, `mailbox`, `event` (`{eventId}`), `stage-up`. Mỗi màn có đầu màn `screenHead` (nút `meta-back` ≥ 44px về `prep`, viên Tiền quán + Muỗng Vàng) dính trên cùng.
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
Mỗi id đẩy đúng 1 lần (`mail.pushed`, nhớ 1.000 id). Hạn 30 ngày (quà lễ 14, nhiệm vụ 7). Tối đa 100 thư: đầy thì bỏ thư cũ nhất đã nhận. Trần (ngoài quà đền bù/`compensation`): tối đa 2 quà lễ/mốc mỗi tháng, quà đời thường tối đa 2/tháng, tổng tiền quà lễ + mốc + đời thường + Tem dư sự kiện (`valueKinds` có `su_kien`) ≤ 3 lần thu nhập tham chiếu mỗi tháng; `mailValueRoom(state, nowInfo, ctx)` trả phần còn lại. `resolveReward` giữ `eventId` của phần thưởng Tem khi resolve lại (thư mang Tem). Quà lễ đẩy từ 04:00 ngày lễ trong `pushDays` ngày (20/10, 20/11, Tết Đinh Mùi 06/02/2027). Quà đời thường: từ ngày thật thứ 3, 10%/ngày (seed + dayKey), cần ≥ 5 đánh giá và sao TB ≥ 3,8, 0,3–0,6. Review muộn: `history[].lateReviews` → thư `review:<ngày game>:<customerId>` vào ngày thật hôm sau. Save mới không nhận thư phiên bản; save v1 nhận thư `phien_ban_0_2_0`.

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

Sự kiện ngày (từ ngày game 3, 30%/ngày, `seedFrom(seed, day, 'su_kien_ngay')`; báo trước ở Tổng kết bằng `dayEventInfo(state, state.day, ctx)` sau `endShift`):
```js
export function rollDayEvent(state, day, ctx) → id | null ; dayEventInfo(state, day, ctx) → { id, name, desc, icon, effects, choice: { id, label, desc, cost, free, chosen } | null } | null
export function dayEventEffects(info, ctx) → effects   // đã chọn / tự áp lựa chọn (Căng bạt) → hiệu ứng của lựa chọn (thẻ, Dự báo, Tổng kết)
export function setDayEventChoice(state, choiceId | null, ctx) ; setMarketCoupon(state, on)      // lựa chọn ở màn Chuẩn bị; tiền/phiếu trừ lúc mở ca
export function prepareShiftMods(state, ctx, nowMs?) → mods ; applyCustomerMods(n, mods, ctx) → số khách
// mods = { customerMul, extraCustomers, patienceMul, tipMul, recipeWeight, noteBoost, noteBoostRate, cogsMul, dayEvent: { id, choice } | null, events: [eventId], prepCost }
```
Trời mưa: khách ×0,8 (làm tròn, sàn 3), kiên nhẫn ×1,2; "Căng bạt" 20.000đ còn ×0,95 (có Bạt che mưa thì miễn phí). Nắng nóng: Trà tắc, Cà phê sữa đá được gọi ×2, thêm ghi chú Ít đường/Ít ngọt, +1 khách (trần 8). Ngày lãnh lương: tip ×1,5 làm tròn bội 5.000đ. Chợ phiên: khách ×1,3 (trần `BALANCE.eventCustomerCap` = 10); `planArrivals` giãn lịch nên ρ ≤ 0,9 (có test). Phiếu Chợ Sớm: giá vốn ×0,8 trong 1 ca.

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

Lệch so với `docs/can-bang.md`: lãi bán hàng của người chơi hoàn hảo khoảng 240–750k mỗi ngày thật (3 ca), gấp khoảng 3 lần mô hình người chơi trung bình ở mục 9. Lý do: mọi khách 5 sao có món Không tì vết được tip 10.000đ (mô hình giả định trung bình 2.200đ/khách), và sao trung bình ≥ 4,5 thêm 1 khách mỗi ca. Chưa đổi tip, cần đo người chơi thật (can-bang mục 15, chỉ số 15 và 21). Ngưỡng danh tiếng lên Chặng 2 giữ 150 theo đặc tả (mục 15.9).

**E2E M2** (giao diện thật, Chromium 390×844 cảm ứng, `npm run e2e`):
- `checkin-quests.e2e.mjs` dùng đồng hồ giả `openGame({ clock: { time } })`, seed 42. Lần đầu mở game → bảng điểm danh tự hiện → nhận ô 1. Tải lại cùng ngày → không hiện. 03:59 hôm sau chưa sang ngày; qua 04:00 khi đang ở màn Chuẩn bị (lượt kiểm tra 30 giây) → bảng hiện → nhận ô 2. Sang ngày thứ 3 rồi lùi đồng hồ máy 2 ngày → có `rewind-note`, nút nhận khóa, `checkin-note` cảnh báo; giờ đúng lại thì nhận được ô 3. Việc hôm nay có đúng 3 việc (Quầy, Bếp, Chất lượng). Chơi trọn ca ngày 1 → xong "3 món không có lỗi nguyên liệu" → bấm Nhận (+0,2 thu nhập tham chiếu, +5 danh tiếng).
- `shop.e2e.mjs`: save ngày game 2 dựng bằng lõi rồi mã hóa bằng `encodeSave` (`seedSave`), `?devNow`. Nấu thử Bánh tráng trộn (ví, thạo món không đổi) → mua ở màn kết quả → mua Dao thép tốt → xem thử rồi mua dù đỏ bằng Muỗng Vàng, đổi qua lại với dù cũ → mở ca, khách gọi Bánh tráng trộn và được phục vụ (seed 42: khách đầu tiên).
- `event-2011.e2e.mjs` không bật `?test=1` để người chơi tự động nấu được món Tuyệt hảo. Ngày 13/11: thẻ "Đang diễn ra", món đạt Ngon trở lên được cộng Tem, khách 5 sao làm xong bước 4 (save dựng sẵn ở gần cuối chuỗi). Bước 5 cần 3 ngày thật chơi trong mùa (`gates`) nên hôm đó còn khóa, không đếm; theo luật này không ai xong chuỗi được vào ngày thứ 2 của mùa. Ngày 14/11 (ngày chơi thứ 3) mở ca → nấu Tuyệt hảo → xong chuỗi → nhận Chè bưởi (nhãn "Tri ân 20/11 · 2026"). Ngày 25/11 đã hết mùa và hết ân hạn: không còn thẻ sự kiện, Tem dư đã tất toán, Chè bưởi vẫn trong thực đơn, khách gọi và được phục vụ (seed 31: khách đầu tiên). Save mới ngày 09/11 → thẻ "Sắp diễn ra", "Mở sau 2 ngày …".
- `startNewGame` của các e2e M1 nhận luôn bảng điểm danh hiện ở lần mở đầu (`claimCheckinIfShown`).
- `review-m2.e2e.mjs`: hai tab (tab cũ hiện `tab-lock`, không ghi đè thư đã nhận ở tab mới, "Chơi ở tab này" tải bản mới); `?devNow` lưu riêng (save thật không bị ghi mốc 15/11, mở lại không bị khóa lùi giờ) và nút Back ở Chợ Công Thức / Hộp thư / Việc hôm nay về màn Chuẩn bị; ân hạn 23/11: thẻ sự kiện có chấm đỏ, màn sự kiện có nút nhận bước 4–5, nhận được Chè bưởi và Tem.

### 15.11 Vòng soát lỗi M2 (tóm tắt thay đổi)

- Lưu: `state.rev` + `writeSave({guard})`, tab cũ tự khóa (mục 12); `?devNow` lưu ở `DEV_KEYS` (mục 13).
- Kinh tế sự kiện: Tem dư 100 Tem = 0,2 thu nhập tham chiếu, trần 1 thu nhập tham chiếu, tính vào trần quà tháng (mục 15.5, 15.8); món lễ +1 danh tiếng/phần Ngon trở lên trong mùa.
- Hỗ trợ: Hỗ trợ thao tác → bước chuỗi Tuyệt hảo/5 sao đếm mức thay thế, không bốc việc không đếm được; Hỗ trợ tính tiền → chuỗi "Quầy chuẩn" luôn 0 (`clipTicket`), không tip 10.000đ theo chuỗi, không ghi kỷ lục.
- Ân hạn: chuỗi sự kiện nhận được ở màn sự kiện trong ân hạn, thẻ sự kiện có chấm đỏ; hết ân hạn Tem thưởng chưa nhận vào Tem dư, công thức qua Hộp thư (thư mới được báo).
- Việc: "Nấu n phần món vừa mua" chốt món lúc bốc; "Không để khách nào bỏ về" không tính ảnh giả bị bắt; việc sự kiện quên nhận tự cộng Tem, ca vắt qua 04:00 đếm cho ngày mới.
- Nấu thử: không mở phiên món khác khi đang dở (`dang_nau_thu`); không tính giờ thật sự, có gợi ý ngay.
- Dữ liệu theo đặc tả: ô 5 Tuần Khai Trương = 2 Phiếu Chợ Sớm; ngưỡng danh tiếng 150.
- Giao diện: Back điện thoại, điểm danh trước thông báo thư, lần mở đầu gọn (lời Dì Sáu lên trên), hiệu ứng sự kiện ngày theo lựa chọn, lời Dì Sáu theo thời tiết, thẻ chuỗi đã xong không lặp chữ, thư việc quên nhận ghi đúng ngày, biển tên xe không tràn, tên tiền sự kiện thay chữ "Tem", động từ NPC thống nhất.

## 16. Nền tảng M3: PWA, sao lưu, Cài đặt, âm thanh

### 16.1 PWA — `manifest.webmanifest`, `sw.js`, `icons/`
- Manifest: `name` "Bếp Khởi Nghiệp", `short_name` "Bếp KN", `display: standalone`, `orientation: portrait`, `start_url`/`scope` `./`, `theme_color` = `--brick` (#b9472f, trùng `<meta name="theme-color">`), `background_color` = `--bg` (#fbf3e2); biểu tượng PNG 192/512 (`any`) + 512/192 (`maskable`, hình nằm trong vùng an toàn 40%) + SVG. `index.html` gắn manifest, `icons/icon.svg`, `apple-touch-icon.png` (180), `mobile-web-app-capable`, `apple-mobile-web-app-title` (không dùng `apple-mobile-web-app-capable` vì Chrome cảnh báo trên console).
- `sw.js`: `VERSION` = "version" của package.json; cache `bkn-<VERSION>`; `PRECACHE` liệt kê **toàn bộ** tệp chơi offline: `index.html`, `manifest.webmanifest`, mọi `.js` trong `src/`, mọi `.css` trong `css/`, mọi tệp trong `icons/` (test đối chiếu với cây thư mục thật: thiếu hay thừa đều hỏng; mọi import tương đối trong `src/` phải có trong PRECACHE). Cài: `cache.addAll` với `cache: 'reload'`, **không** `skipWaiting` tự động. Kích hoạt: xóa các cache `bkn-*` khác bản này (chỉ cache của chính game), `clients.claim()`. Tải tệp: chỉ GET cùng nguồn; cache-first, so khóa `ignoreSearch` (bỏ `?devNow`, `?test`, `?seed`…); mở trang (`navigate`) luôn trả `index.html` đã lưu; tệp chưa có thì lấy mạng (tệp của game được cất thêm). Ở `localhost`/`127.0.0.1` còn tải lại nền sau khi trả cache (khi phát triển thấy code mới ở lần mở sau). Tin nhắn: `{type: 'SKIP_WAITING'}` → kích hoạt bản mới; `{type: 'GET_VERSION'}` → trả `{type: 'VERSION', version}`.
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
- Chơi: Mẹo nghề, Giảm chuyển động, Tình huống trong ca Nhiều / Vừa / Ít (`settings.incidentFrequency`, mặc định Vừa; "Ít" chỉ gồm tình huống vui — lõi tình huống đọc giá trị này).
- Sao lưu: lần sao lưu gần nhất; "Chép mã sao lưu" (`navigator.clipboard`, không được thì hiện mã trong ô để chép tay; nút Chép lại dùng `execCommand('copy')`); "Tải file sao lưu" (Blob `.txt` gồm vài dòng hướng dẫn + mã, tên `bep-khoi-nghiep-<tên xe không dấu>-ngay-<n>-<YYYYMMDD>.txt`); "Nhập mã sao lưu" (dán mã hoặc chọn file → Xem trước bảng "Bản trong mã" / "Bản hiện tại": tên xe, ngày game, Tiền quán, chặng, số công thức, danh tiếng, Muỗng Vàng → "Dùng bản này" mới ghi đè); "Bản lưu đã cất" (Khôi phục = cùng luồng xem trước).
- Cài game (theo `installMode`), trạng thái chơi offline (`app.pwa.offlineReady`).
- Thông tin: phiên bản, "Giới thiệu" (game hư cấu, mọi con số là số liệu minh họa, không liên quan thương hiệu nào, dữ liệu lưu trên máy), "Chơi lại từ đầu" (hộp thoại 2 bước `reset-step1` → `reset-step2`; state mới `defaultState(seed ngẫu nhiên)` giữ cài đặt; bản cũ được cất).
Màn mở đầu lần đầu (chưa đặt tên xe) có nút `title-import` "Đã chơi ở máy khác? Nhập mã sao lưu" (cùng hộp thoại nhập mã).

### 16.4 Thêm màn mới
Viết `src/ui/screens/<tên>.js` theo mục 13, import rồi thêm vào bảng `SCREENS` ở `src/main.js` (khóa = tên dùng trong `app.go`). Màn không nằm trong `ROOT_SCREENS` tự là màn con (Back điện thoại → Chuẩn bị, có thể tự xử lý bằng `onBack()`); `router.register(name, screen)` dùng được lúc chạy. Thêm tệp vào `PRECACHE` của `sw.js` (test `pwa.test.mjs` báo thiếu).

### 16.5 Âm thanh — `ui/audio.js`
`createAudio(getSettings, env = globalThis)` → `{ play(name) → boolean, unlock(), ready(), names }`; `SOUND_NAMES`: `click, coin` (tiền vào túi/nhận thưởng), `cash` (tiền vào két: "cạch" + "keng"), `ding` (Hoàn hảo), `bell` (chuông ra món, khách tới), `chop` (dao thái "tách"), `sizzle` (dầu "xèo"), `pour` (rót nước), `error` (lỗi), `nudge` (nhắc nhẹ), `chest` (mở rương), `paper`. Tổng hợp bằng dao động + ồn trắng qua bộ lọc (không tệp âm thanh). AudioContext chỉ tạo sau thao tác đầu tiên (`pointerdown`/`keydown`) khi đang bật tiếng; âm lượng tổng = 0,9 × `settings.volume`; tắt tiếng/âm lượng 0 → không phát; trình duyệt không hỗ trợ/chặn → im lặng, không lỗi. Gắn âm: mini-game qua `feedback(ctx, kind)` (`cut`/`chop` thái, `hit` chạm trúng, `sizzle` lúc bắt đầu Canh lửa, `pour` mỗi lần giữ Rót), quầy (`cash` khi thối đúng/nhận QR), ca bán (`nudge` khi khách sắp hết kiên nhẫn/bỏ về), Việc hôm nay (`chest` mở Rương ngày), điểm danh (`chest` ô 7). Mọi âm luôn có tín hiệu hình đi kèm.

### 16.6 Kiểm chứng M3 nền tảng
- Unit: `pwa.test.mjs` (PRECACHE ↔ cây thư mục, VERSION ↔ package.json ↔ APP_VERSION, import tương đối có trong PRECACHE, manifest + kích thước PNG, index.html gắn mọi CSS; chạy `sw.js` trong `vm` với cache/fetch giả: cài đủ tệp, không tự kích hoạt, dọn cache cũ, mất mạng vẫn trả trang và module kể cả có query, bỏ qua khác nguồn/POST; router màn con), `backup-code.test.mjs` (định dạng, nhập lại y hệt, nén < 40% save thô, nén/giải nén từng byte, dữ liệu hỏng ném lỗi, sai 1 ký tự → `sai_ma`, dán kèm chữ thừa, save v1, cất bản cũ không ghi đè, nhắc 7 ngày, cài đặt M3), `audio.test.mjs` (AudioContext giả: chỉ tạo sau thao tác, đủ âm, âm lượng, tắt tiếng, trình duyệt chặn; mọi tên âm giao diện gọi đều có).
- E2E `pwa-backup.e2e.mjs` (vòng soát lỗi M3: thêm kịch bản "bản mới tự kích hoạt khi đóng hết tab giữa ca" ở máy chủ `bkn.localhost`; chờ cache/bản chờ bằng `pollEval`, không dùng `waitForFunction` với Promise): (5) chờ service worker → tải lại → `context.setOffline(true)` → tải lại vẫn vào màn Chuẩn bị, mở ca, có khách; bản mới (máy chủ thử thay `VERSION` của sw.js): nút Tải lại hiện ở màn Chuẩn bị, bấm thì dùng cache bản mới, tiến trình giữ; bản mới phát hành giữa ca không hiện nút, tải lại giữa ca vẫn bản cũ; sao lưu: chép mã + tải file → ngữ cảnh mới (localStorage trống) nhập mã từ màn mở đầu → mã rỗng/sai 1 ký tự/không phải mã báo lỗi thân thiện → xem trước đúng → xác nhận → dữ liệu khớp; Chơi lại từ đầu 2 bước (Thôi ở mỗi bước không đổi gì) → bản cũ còn ở `bkn.save.old.<ms>`, khôi phục được; Cài đặt ở 360×740: nhắc sao lưu sau 7 ngày, công tắc/âm lượng/tần suất lưu vào save, Giới thiệu, hướng dẫn cài, Back điện thoại, không tràn/chạm ≥ 44px/chữ ≥ 14px.

## 17. Nội dung M3: tình huống trong ca, Sổ tay nghề, Sổ công thức, làm tròn tiền

### 17.1 Tình huống trong ca — `core/incidents.js` + `data/incidents.js`
- Luật (`INCIDENT_CONFIG`): từ ngày game 3, mỗi ca bốc có/không theo `settings.incidentFrequency` (Nhiều 50% / Vừa 35% / Ít 15%; mức Ít chỉ gồm tình huống vui `positive`); tối đa 1 tình huống mỗi ca; bảo hiểm: `state.incidents.since` đếm số ca (từ ngày 3) không có tình huống được xử lý, `since ≥ 3` → ca kế chắc chắn có; không lặp 5 loại gần nhất (`recent`), hết loại mới thì lấy loại lâu chưa gặp nhất. Trần thiệt hại = `min(floor500(10% doanh thu dự kiến của ca), floor500(0,5 × thu nhập tham chiếu))`; loại có lựa chọn lỗ quá trần (`maxLoss`) bị bỏ ở lúc bốc.
- Ngẫu nhiên riêng: `seedFrom(state.seed, day, 'tinh_huong')`, trạng thái luồng lưu ở `sh.incident.rng` và dùng tiếp khi chốt chi tiết/kết quả → tải lại giữa ca không đổi tình huống; luồng khách/bếp không bị xáo trộn.
- `sh.incident = { id, afterClips, status: 'cho'|'xong', rng, cap, guaranteed, detail, choice, result, shownAt? }`; `afterClips` = 0 với tình huống đầu ca (`when: 'mo_hang'`), còn lại bốc trong 1..N−1 (N khách của ca).
- API: `planIncident(state, sh, ctx)` (trong `startShift`), `nextShiftFull(state, sh, ctx)`, `takeIncidentBonusInfo(state, day)` → `{customers, rep}`, `incidentDue(state, ctx)` (có tình huống chờ, không tạm dừng/nấu thử, `sh.counter` trống, `miniGameBusy(sh)` sai, đủ `afterClips` phiếu đã kẹp, điều kiện riêng của loại), `openIncident(state, ctx)` → view, `incidentView(state, ctx)` → `{ id, name, positive, when, text, note, who, status, choices: [{id, label, safe, available, cost, reason}], safeId, cap, detail }`, `resolveIncident(state, choiceId, ctx)` → `{ ok, id, choice, safe, text, effects: {money, cost, refund, rep, bonus, debt, starLoss, loss}, tipId }` | `{ ok: false, reason: 'khong_co'|'het_han'|'khong_duoc' }` (phát `incident.resolved` `{id, choice, day, safe, money, cost, rep, loss}`), `finishShiftIncidents(state, ctx)` (trong `endShift`), `takeIncidentBonus(state, day)` / `incidentBonusFor(state, day)`, `collectDebts(state, sh, ctx)` / `pendingDebts(state)`, `incidentLossCap`, `expectedRevenue`, `itemCost` (giá vốn làm tròn 500đ, có hệ số giá vốn của ngày).
- Ba tình huống MVP:
  - `khach_mo_hang` (vui, đầu ca): khách mở hàng 1 ly trà tắc bằng tờ 500.000đ. `thoi_het` (cần két đủ thối; đầu ca két 200.000đ nên thường bị khóa kèm lý do → dạy thẻ "Đủ tiền lẻ đầu ca"), `moi_qr` (cần QR đã mở), `tang` (an toàn: −giá vốn, ca sau +1 khách, tối đa 8; vòng soát lỗi M3: ca sau đã đủ 8 khách — `nextShiftFull` theo `customerCount` của ngày sau — thì chữ cái giá dùng `costFull` và cho ngay `bonusRep` = +2 danh tiếng thay khách thêm; nếu tới ca đó mới đủ khách, vd Chợ phiên, `startShift` đổi khách thêm thành `bonus.rep` danh tiếng; màn Chuẩn bị chỉ ghi "thêm 1 khách" khi số khách dự báo thật sự tăng — `forecastDetail`). Thẻ Mẹo nghề `no_small_change` mở ở mọi lựa chọn.
  - `ghi_no`: khách quen (ưu tiên người không có trong ca) xin ghi nợ 20.000đ cho 2 ly trà tắc. `cho_no` (−giá vốn, +2 danh tiếng; 70% trả trong 3 ca: ngày trả bốc sẵn khi ghi sổ, tiền vào `sh.debtIn` ở đầu ca trả, tính vào lãi ca và `settleShift`; quá hạn thì ghi "chưa trả"), `tu_choi` (an toàn, không tốn gì), `tang` (−giá vốn, +5 danh tiếng). Nợ lưu ở `state.incidents.debts[]` `{id, regularId, name, amount, fromDay, dueDay, repayDay|null, status: 'cho'|'da_tra'|'quen', paidDay?}`.
  - `doi_y`: khách vừa trả tiền (phiếu mới nhất còn `cho`, chưa nấu) muốn đổi món sang món khác trong thực đơn. `doi_mon` (an toàn: sửa dòng phiếu bếp, yêu cầu, phiếu thu; chênh dương thì thu thêm vào két/QR, chênh âm thì hoàn tiền; mở thẻ "Thu tiền rồi mới gửi bếp"), `tu_choi` (50% khách phật ý: phạt `{code: 'tu_choi_doi_mon', stars: 1, source: 'tinh_huong'}` khi nhận món; không tính là lỗi quầy/bếp, không làm mất "Không tì vết").
- Lưu: `state.incidents = { since, recent (≤10), log (≤20, mới nhất trước), debts, bonus: {day, customers} | null, total }`; `migrateContentM3` (trong `migrate`) thêm mặc định và lọc dữ liệu hỏng cho save v1/v2 (STATE_VERSION giữ 2). `compactHistory` ghi `incidents: [{id, choice}]` và `debtIn`.
- Giao diện: mục 13.2 (hộp thoại chặn → thời gian ca và kiên nhẫn dừng; chỉ ở tab Quầy, giữa hai khách, không chen mini-game). Tổng kết: `summarizeShift` trả thêm `incidents`, `debtIn`, `debtNotes`.

### 17.2 Sổ tay nghề — `core/notebook.js`, màn `notebook`
- `TIPS[].hint` (gợi ý cách mở thẻ), `TIP_GROUPS` (quay, bep, kho, phuc_vu), `TIP_GROUP_REWARDS[nhóm] = { gold: 20, title }` với danh hiệu mới trong `TITLES`: `thu_ngan_chu_dao` "Thu ngân chu đáo", `tay_bep_can_than` "Tay bếp cẩn thận", `giu_kho_ky_luong` "Giữ kho kỹ lưỡng", `chu_quan_tu_te` "Chủ quán tử tế".
- API: `notebookStatus(state, ctx)` → `{ total, unlocked, claimable, groups: [{ id, name, total, unlocked, complete, claimed, canClaim, reward, title, tips: [{id, title, text, hint, unlocked}] }] }`; `notebookBadge` (số nhóm chờ nhận); `claimNotebookGroup(state, groupId, ctx)` → `{ ok, groupId, reward }` | `{ ok: false, reason: 'khong_co'|'da_nhan'|'chua_xong'|'dang_ban' }` (mỗi nhóm 1 lần, ghi `state.notebook.claimed`, phát `notebook.claimed`); `randomSeenTip(state, ctx, rand)` (giao diện truyền `rand`).
- Màn: tiến độ chung, thẻ nổi bật, tab theo nhóm (chấm đỏ khi nhóm chờ nhận), thẻ chưa mở hiện mờ kèm gợi ý, nút nhận thưởng khi đủ nhóm.

### 17.3 Sổ công thức — `core/recipe-book.js`, màn `recipe-book`
- `recipeBook(state, ctx)` → `{ owned, total, entries }`: mọi món Chặng hiện tại (đã có, bán ở Chợ Công Thức, món sự kiện) + món bóng mờ Chặng 2 (`teaser`); mỗi món có biểu tượng, giá bán, giá vốn (`bookCost`), lãi, số lần nấu, điểm cao nhất, cấp thạo món + mốc kế (`masteryInfo`), huy hiệu "Không tì vết", nhãn nguồn (`sourceLabel`: "Có sẵn", "Chợ Công Thức", nhãn mùa sự kiện như "Tri ân 20/11 · 2026").
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
- GitHub Pages cần tệp rỗng `.nojekyll` ở gốc (Jekyll bỏ qua `src/ui/minigames/_util.js`); tệp ở ngoài phạm vi sửa của vòng này.
- Tên dài trong dải "Chờ món" (ô rộng 62px) bị cắt, vd "Bạn N…" (tên đầy đủ ở `title`).

### 18.5 Vòng soát lỗi M3 (tóm tắt thay đổi)
- **Dữ liệu người chơi**: save v1/v2 ví lẻ làm tròn lên bội 500đ khi nạp (giữ bất biến ví ca); ca dở không đủ cấu trúc → hủy ca, hoàn giá vốn, báo (mục 12, 16.1); bản lưu không đọc được được cất nguyên chuỗi sang `<khóa save>.hong.<ms>` trước lần ghi đầu; bộ nhớ bị chặn/đầy → dải cảnh báo "Chưa lưu được tiến trình" + nút sao lưu (mục 12); mã từ bản mới hơn → cảnh báo phần sẽ mất (16.2); bước chuỗi vượt dữ liệu → kẹp (không còn `TypeError` nuốt mất `settleEvents`, `updateStageUp`).
- **PWA**: tài liệu và chú thích `sw.js` nói đúng giới hạn "bản mới tự kích hoạt khi đóng hết tab"; ca ghi `appVersion`, mở lại ở bản khác thì báo và chơi tiếp; e2e mới ở máy chủ không phải localhost; hai chỗ `waitForFunction` với Promise đổi sang `pollEval`.
- **Sao lưu**: chỉ ghi "đã sao lưu" khi mã thật sự được cất (16.2).
- **Tình huống**: ly trà "mở hàng" khi ca sau đã đủ khách → +2 danh tiếng, chữ ghi rõ; màn Chuẩn bị không hứa khách thêm khi không thêm được (17.1).
- **Mẹo nghề**: công tắc chỉ tắt thẻ nổi, Sổ tay nghề vẫn đầy (mục 4).
- **Giao diện**: Tính tiền ngày 1 khách đưa vừa đủ → lời Dì Sáu "khỏi thối", khay ghi "Không cần thối tiền", khay dư thì cảnh báo đỏ "Đang thối dư"; nhãn phiếu chấm `err-tag--quay`/`err-tag--bep` (không trùng class bố cục `.counter`/`.kitchen`, chữ trắng); thẻ công thức "×2 (chạm 1 lần)" + huy hiệu ×n trên ô đã chọn và trong rổ; lời Dì Sáu ngày 1 trên Thớt đặt ngay dưới tên thớt; dòng phiếu vừa ghi tự cuộn lên trên thanh nút; kệ 12 ô gọn ở màn thấp (360×740 thấy đủ 3 hàng); lớp vỏ mini-game phin/nồi/tô (mục 6); nhãn nhát thái theo ngưỡng ("Chuẩn!", "Hơi lệch", "Lệch", "Lệch xa", không còn "px", có test quét chuỗi); Tiền quán từ 1 triệu ghi gọn "1,16tr" ở màn Chuẩn bị và viên tiền đầu màn meta; chữ trong ca tối thiểu 13px, ô tờ trong khay ≥ 44px, chữ xanh dùng `--green-ink` (#2a6e3a, ≥ 5:1); thông báo nổi trong ca không che thanh 4 khâu, gộp tiến độ Việc hôm nay, không báo tiến độ việc lúc hướng dẫn ngày 1; dây phiếu: ghi chú 1 dòng cắt "…" trong khung riêng (không lòi dấu); Tổng kết "Sao ca này" và "Sao trung bình (30 lượt gần nhất)", dưới 5 lượt ghi "tính tạm"; câu Giới thiệu viết lại.
- **Kiểm chứng**: `tests/unit/review-m3-fixes.test.mjs` (10 test), `banned-words` thêm quét "px"; e2e `save-safety.e2e.mjs` (5 kịch bản), `review-m3-ux.e2e.mjs` (2 kịch bản: ngày 1 ở 360×740 — Tính tiền vừa đủ, dòng phiếu, kệ ×2, lời Dì Sáu trên Thớt, nhãn phiếu chấm chữ trắng, thông báo nổi không che thanh 4 khâu; chép mã thất bại không ghi mốc), `pwa-backup.e2e.mjs` thêm 1 kịch bản và cấp quyền bộ nhớ tạm cho Chromium thử nghiệm (như trang HTTPS); `hanh-trinh.mjs` soát bố cục cả các khâu trong ca bán. Các e2e so `page.$(…)` với `null` đổi sang so boolean: khi hỏng, `assert` in cả ElementHandle làm tiến trình thử ngốn bộ nhớ tới bị giết (một kịch bản từng mất tên trong báo cáo). Kết quả 30/09/2026: 271 unit test, 33 kịch bản e2e xanh, e2e khoảng 18 phút; `node tests/e2e/hanh-trinh.mjs` 12,75 phút, thoát mã 0, 0 lỗi console/trang, 0 thao tác kẹt, không còn lỗi bố cục ở 12 màn và 9 khâu trong ca bán (soát vùng chạm theo kích thước bố cục, không tính hiệu ứng thu nhỏ đang chạy; bỏ qua chữ cỡ 0 cố ý ẩn; dòng mở thẻ công thức trên Thớt nâng lên 44px).
