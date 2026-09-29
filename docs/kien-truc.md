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
index.html                 trang game (có khối <noscript>/thông báo file:// viết bằng HTML + script thường)
css/base.css               biến màu, font hệ thống, reset, bố cục khung điện thoại
css/game.css               giao diện các màn và mini-game
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
tests/unit/*.test.mjs      node:test (integration-shift.test.mjs: DATA thật, 3 ca liên tiếp, người chơi hoàn hảo/ẩu)
tests/e2e/*.e2e.mjs        Playwright (Chromium ở /opt/pw-browsers): one-shift, reload
tests/e2e/helpers.mjs      nạp Playwright, ngữ cảnh 390×844 cảm ứng, người chơi tự động qua data-testid
tests/helpers/static-server.mjs  perfect-player.mjs
docs/                      tài liệu
package.json
```

(M2, M3 thêm: `core/quests.js checkin.js mail.js chains.js shop.js events.js incidents.js`, `data/quests.js checkin.js mail.js chains.js shop.js events.js incidents.js`, các màn `shop.js quests.js checkin.js mailbox.js recipe-book.js notebook.js settings.js`, `manifest.webmanifest`, `sw.js`.)

## 3. package.json

```json
{
  "name": "bep-khoi-nghiep",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"tests/unit/**/*.test.mjs\"",
    "serve": "node tests/helpers/static-server.mjs 8080",
    "e2e": "node --test --test-concurrency=1 \"tests/e2e/**/*.e2e.mjs\""
  }
}
```

E2E nạp Playwright bằng `createRequire`, thử `require('playwright')` rồi tới `/opt/node22/lib/node_modules/playwright`. Biến `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` đã có sẵn trong môi trường.

## 4. Cấu trúc save (state gốc)

`src/core/state.js` xuất `defaultState(seed)`:

```js
{
  version: 1,
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
    assistMotion: false    // Hỗ trợ thao tác: vùng mục tiêu rộng hơn, chậm hơn
  },
  history: [],             // tối đa 60 bản tổng kết ca (xem economy.summarizeShift)
  shift: null,             // ca đang chơi (mục 7) hoặc null
  clock: { maxSeen: 0 }
  // M2 thêm: checkin, daily, mail, chains, events, shopSeen …
}
```

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

Sự kiện bổ sung (thực tế): `customer.arrived {customerId}` · `qr.arrived {customerId, amount}` · `counter.begin {customerId}` · `cook.started {ticketId, lineIndex, recipeId}` · `step.retry {recipeId, stepId, cost}` · `dish.abandoned {ticketId, lineIndex, recipeId, waste}` · `complaint.resolved {customerId, action, apologyCorrect, amount?|ticketId?}` · `upgrade.bought {upgradeId}`. Sự kiện riêng của giao diện (không do lõi phát): `ui.tab {tab}` · `ui.ticket.select {ticketId}` · `kitchen.served {ticketId, customerId, sheet}`.

## 6. Dữ liệu (src/data)

### index.js — gom dữ liệu, tiêm vào lõi qua `ctx.data`
```js
export const DATA = Object.freeze({ BALANCE, INGREDIENTS, RECIPES, METHOD_LABELS, MINIGAME_TYPES,
  PERSONAS, REGULARS, NAMES, DIALOGUE, makeSpeech, makeLine, makeReview, TIPS, UPGRADES, STRINGS })
```
`DATA` thực tế có thêm (chỉ thêm, không đổi): `ROLE_LABELS, SPOKEN, SYNONYMS, LINE_KINDS, REVIEWS, TIP_GROUPS, describeLine, readbackText, tipsForTrigger`.

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
  lua:  { name: 'Canh lửa', hint: 'Nhấc chảo khi kim nằm trong vùng xanh.' },
  rot:  { name: 'Rót', hint: 'Giữ để rót, thả tay đúng vạch.' }
})
```

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
export function advance(state, dt, ctx)               // dt giây; không làm gì khi shift.paused; sinh khách tới, trừ kiên nhẫn, khách bỏ về
export function isShiftOver(state) → boolean          // mọi khách đã rời đi (served hoặc lost) và không còn phiếu
export function endShift(state, ctx) → summary        // tất toán ví, cập nhật stats/ratings/history, day += 1, shift = null
export function setPaused(state, paused)
// bổ sung
export function customerCount(state, ctx, day = state.day) → số khách
export function planArrivals(shift, customers, ctx) → plan
export function loadFactor(shift) → ρ
export function gameTime(shift) → 'HH:MM' (06:00 → 10:00, ước lượng)
export function emptyLedger() → ledger
```
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
  counterStreak: 0,                            // chuỗi "Quầy chuẩn"
  nextTicketNo: 1
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

Giá vốn: khi `submitChon` thành công, trừ tổng `cost × qty` của **mọi nguyên liệu đã chọn** vào `ledger.cogs` (phần thừa, bẫy ghi thêm vào `ledger.waste`).

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
export function tipFor(stars, flawlessAny, persona, balance?) → đồng   // 5 sao: 5.000đ; có món Không tì vết hoặc khách khó tính: 10.000đ
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
   // bất biến (có test): ví sau ca − ví đầu ca = profit − loanRepaid
export function settleShift(state, summary)   // wallet += (tiền mặt vượt quỹ lẻ) + QR + tip − chi phí cố định − hoàn tiền; trả nợ nếu có
export function canAfford(state, price) ; spend(state, price, reason) ; earn(state, amount, reason)
export function offerLoan(state, balance?) → boolean ; takeLoan(state, balance?)   // khoản vay {amount, remaining}
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
export function migrate(raw, data?) → state               // gộp với defaultState(), kẹp giá trị, bỏ id công thức/nâng cấp không còn trong data; giữ ca đang dở nếu đủ cấu trúc
export function saveTo(storage, state, { backup }?) → boolean ; loadFrom(storage, data?) → state|null   // storage có getItem/setItem; thử bản chính rồi bản dự phòng; tự migrate
export function exportCode(state) → chuỗi ; importCode(str, data?) → state|null  // mã sao lưu (M3)
```
UI gọi `saveTo(localStorage, state)` có debounce 300 ms, sau mỗi hành động quan trọng, khi `visibilitychange`/`pagehide`, và cuối ca (kèm ghi bản dự phòng). Tải lại giữa ca: khôi phục `state.shift`; nếu đang ở giữa một mini-game thì bước đó chơi lại từ đầu (cùng tham số).

## 13. Giao diện — quy ước `src/ui`

- `dom.js`: `h(tag, props, ...children)` tạo phần tử (props hỗ trợ `class`, `style`, `dataset`, `on*`), `clear(el)`, `$(sel, root)`.
- `app.js`: `createApp({ root, storage, now, screens })` → `app = { state, data /*mọi export từ src/data*/, bus, ctx /*{emit, data}*/, save(), go(screenName, params), toast(text, opts), modal(opts) → Promise, vibrate(ms), sound(name), now() }`.
  Thực tế thêm: `saveNow({backup}?)`, `modalOpen()`, `modalBlocking()` (hộp thoại chặn → tạm dừng thời gian ca), `settings()`, `applySettings()`, `router`, `switchTab(name)` (khi đang ở màn ca bán). `toast(text, {duration, kind:'info'|'good'|'bad'|'tip', title, icon, testid})` không chặn thao tác, tối đa 2 cái thường; thẻ Mẹo nghề (`kind:'tip'`) hiện gọn (tiêu đề + tối đa 2 dòng, chỉ che dải khách), mỗi lần 1 thẻ, thẻ sau xếp hàng (tối đa 2 thẻ chờ); thẻ trigger `shift_end` không nổi mà hiện trong mục "Mẹo của Dì Sáu" ở Tổng kết. `modal({title, text, icon, body, render(close), actions:[{label, value, testid, kind}], dismissible, testid, blocking = true})`.
  Tham số URL: `?seed=N` chỉ có tác dụng khi chưa có save; `?test=1` (chỉ trên localhost/127.0.0.1) bật `settings.assistMotion` cho kiểm thử tự động.
- `screens/counter.js`: `mountCounter(root, app, { switchTab })` → `{ el, update, onShow, onHide, unmount }`. Nút hành động mỗi khâu (Đọc lại đơn/Chốt order, Đưa tiền thối, QR, Kẹp phiếu bếp) nằm trong thanh `.act-bar` dính đáy panel; sang khâu mới panel tự cuộn để thấy phần thao tác. Phiếu chấm có 5 hàng: Order, Báo tổng (`bao_du`, `bao_thieu`), Thối tiền (`thoi_thieu`, `thoi_du`, `qr_gia`), Bếp, Thời gian chờ. `screens/kitchen.js`: `mountKitchen(root, app)` → `{ unmount, update, onShow, onHide, selectTicket(ticketId) }`; nút "‹ Phiếu" (và chạm phiếu trên dây chung) đưa về dây phiếu ở cả bước chọn lẫn Thớt, rổ đang chọn được giữ; ô "Đang làm" trên dây phiếu có "Bỏ món" + "Làm tiếp"; trên Thớt thẻ công thức thu gọn (chỉ ghi chú đỏ, nguyên liệu và các bước gập lại); màn `service` nạp bếp bằng `import()` động, gọi `update(dt)` mỗi khung hình và `onShow/onHide` khi đổi tab (rời tab giữa mini-game → bước đó chơi lại từ đầu).
- `router.js`: mỗi màn là module `export default { mount(root, app, params) → { unmount(), update?(dt) } }`. Các màn: `title` (lần đầu: đặt tên xe; sau đó: vào game), `prep` (màn Chuẩn bị ca: thông tin ngày, nút "Mở hàng", nâng cấp — M2 thêm shop/nhiệm vụ/điểm danh), `service` (ca bán: chứa HUD + thanh tab Quầy/Bếp, gắn `counter` và `kitchen` làm panel con), `summary` (tổng kết ca).
- `loop.js`: `requestAnimationFrame`, gọi `advance(state, dt)` (dt kẹp 0,05 s) và `screen.update(dt)`; tạm dừng khi tab ẩn (`visibilitychange`).
- `input.js`: tiện ích Pointer Events: `bindPointer(el, {down, move, up, cancel}, { space }?) → unbind` với `setPointerCapture`, chỉ nhận con trỏ chính, `pointercancel` coi như thả tay; phím Space mô phỏng nhấn/giữ trên máy tính khi bật `{ space: true }` (lua, rot, cham bật sẵn). Mỗi handler nhận `(p, e)`, `p = {x, y, rx, ry, clientX, clientY, rect, t, pointerId, pointerType, synthetic, …}`.
- CSS sân khấu mini-game: `touch-action: none; user-select: none; -webkit-touch-callout: none;` chặn `contextmenu`.
- Bố cục dọc, chuẩn 390×844; khung tối đa 480px chiều ngang, căn giữa trên máy tính. Vùng chạm ≥ 44px, cách mép 16px.
- Mọi phần tử quan trọng có `data-testid` (danh sách ở mục 14) để test tự động.
- Tôn trọng `prefers-reduced-motion` và cài đặt giảm chuyển động.
- Âm thanh WebAudio tổng hợp (M3); rung `navigator.vibrate` nếu có và được bật.

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
  - Tổng kết: `summary-drawer-diff`, `summary-stars`, `summary-advice`, `summary-reviews`, `summary-tip`.
