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
tests/unit/*.test.mjs      node:test
tests/e2e/*.e2e.mjs        Playwright (Chromium ở /opt/pw-browsers)
tests/helpers/static-server.mjs
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
  loan: null,              // {remaining} khi đang nợ Dì Sáu
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
Sự kiện miền (payload là object thuần):
`order.readback {errorsFound, errorsMissed}` · `order.confirmed {customerId}` · `total.reported {correct, diff}` · `payment.received {method, amount}` · `change.given {correct, optimal, diff}` · `qr.confirmed {fake, blocked}` · `ticket.clipped {ticketId}` · `step.done {recipeId, type, score, grade, auto}` · `dish.done {recipeId, q, grade, flawless, errors}` · `dish.served {customerId}` · `customer.rated {customerId, stars, counterErrors, kitchenErrors}` · `customer.lost {customerId, reason}` · `shift.started {day}` · `shift.ended {day, profit, served, lost}` · `recipe.bought {recipeId}` · `tip.unlocked {tipId}`.

## 6. Dữ liệu (src/data)

### index.js — gom dữ liệu, tiêm vào lõi qua `ctx.data`
```js
export const DATA = Object.freeze({ BALANCE, INGREDIENTS, RECIPES, METHOD_LABELS, MINIGAME_TYPES,
  PERSONAS, REGULARS, NAMES, DIALOGUE, makeSpeech, makeLine, makeReview, TIPS, UPGRADES, STRINGS })
```
**Lõi không import trực tiếp `src/data`** (trừ khi cần hằng số thuần); mọi hàm lõi đọc dữ liệu từ `ctx.data`. Test lõi dùng dữ liệu mẫu nhỏ ở `tests/fixtures/data.mjs`; test tích hợp dùng `DATA` thật. `ctx = { emit(type, payload), data }`.

Hàm trợ giúp nội dung (thuần, nhận `rand()` trả số trong [0,1)):
```js
// dialogue.js
export function makeSpeech({ request, persona, region, recipes, rand }) → string   // câu gọi món tự nhiên
export function makeLine(kind, { persona, region, rand, vars }) → string           // kind: 'readback_ok' | 'readback_wrong' | 'total_too_high' | 'total_ok' | 'change_short' | 'change_over_returned' | 'thanks' | 'wait_long' | 'receive_dish' | 'leave_angry' | 'greet'
// reviews.js
export function makeReview({ stars, errors /*[mã lỗi]*/, dishName, ingredientName, rand }) → string
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
```

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
  ticketId: null, dishes: [DishResult], stars: null, tip: 0, review: null }
```

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
  receipt: null }                              // phiếu thu sau khi tính tiền xong
```

Hàm (tất cả trong `order.js`, `customer.js` giữ FSM và kiên nhẫn):
```js
// Order
export function beginCounter(state, ctx)                       // khi quầy trống và có khách đầu hàng → status 'order'
export function addLine(state, line) ; updateLine(state, index, line) ; removeLine(state, index)
export function compareLines(request, draft) → { errors: [{type:'sai_mon'|'thieu_mon'|'thua_mon'|'sai_so_luong'|'sai_ghi_chu', index, …}] }
export function readback(state, ctx) → { caught: [...], missed: [...] }   // khách bắt lỗi với xác suất readbackCatchRate (theo rng ca); mỗi lỗi bị bắt −8% kiên nhẫn; bắt buộc gọi trước confirmOrder
export function confirmOrder(state, ctx)                       // yêu cầu readbackDone và phiếu khác rỗng → stage 'thanh_toan'
// Thanh toán
export function priceOfLines(lines, recipes) → đồng            // tổng theo giá niêm yết (+ phụ thu ghi chú nếu có)
export function reportTotal(state, amount, ctx) → { result: 'dung'|'du'|'thieu', trueTotal }
   // 'du' (báo cao hơn giá đúng của yêu cầu thật): khách phát hiện, phạt −1,5 sao (source quay), phải báo lại
   // 'thieu': khách trả theo số đã báo; ledger.undercharge += chênh lệch
   // xong → khách chọn phương thức: cash (đưa tiền theo customerCash) hoặc qr (từ ngày 4) → stage 'tinh_tien'
// Tính tiền
export function trayAdd(state, bill) ; trayRemove(state, bill)  // lấy tờ từ két vào khay / trả lại
export function giveChange(state, ctx) → { correct, due, given, optimal, diff }
   // tiền khách đưa vào két; khay trừ khỏi két; thiếu: 90% khách phát hiện (−1 sao, phải bù), dư: mất tiền (50% khách trả lại)
export function confirmQr(state, ctx) → { ok, fake }          // chỉ hợp lệ khi qrArrived; fake → mất trọn hóa đơn (trừ khi có loa_bao_tien chặn)
export function clipTicket(state, ctx) → Ticket               // tạo phiếu thu + phiếu bếp; cần chỗ trống trên dây; khách → 'cho_mon'; quầy trống
```

Kiên nhẫn: khách xếp hàng mất kiên nhẫn theo `1/patienceSec` mỗi giây; khách đang ở quầy mất với tốc độ × `counterDrainMul`. Từ ngày `leaveFromDay`, hết kiên nhẫn khi còn đang xếp hàng → `bo_ve` (chưa trả tiền). Sau khi kẹp phiếu khách không bỏ về; vượt 75%/100%/150% `waitBudget` → phạt −0,5/−1/−2 sao (source cho, chỉ tính mức cao nhất).

## 9. Khâu bếp — `src/core/kitchen.js`

```js
Ticket = { id, no /*#001*/, customerId, lines: [ {recipeId, qty, notes} ], createdAt, status: 'cho'|'dang_lam'|'xong', done: [DishResult|null] }

CookSession = { ticketId, lineIndex, recipeId, qty, notes,
  phase: 'chon'|'thot'|'xong',
  picked: [ingredientId],             // kết quả bước chọn
  chonScore: null, chonMistakes: 0,
  steps: { [stepId]: { score, grade, method, auto, retried } },   // bước đã chơi
  activeStepId: null, retriesLeft: 1 }

export function effectiveSteps(recipe, notes, picked?) → steps[]   // áp removes/patch; nhân tham số theo qty (vd số trứng n × qty)
export function startCook(state, ticketId, lineIndex, ctx) → CookSession    // trừ giá vốn khi chốt bước chọn, không phải lúc này
export function submitChon(state, picked, mistakes, ctx) → { ok, blockedMissingMain }   // thiếu nguyên liệu chính → ok:false, không trừ tiền
export function availableSteps(state) → [stepId]                 // chưa làm, đủ ràng buộc after
export function submitStep(state, stepId, { score, method }, ctx) // lưu điểm (đã trừ −15 nếu method sai); emit step.done
export function autoStep(state, stepId, ctx)                      // "Tự làm": chỉ bước w=1, không phải chon, cần thạo cấp 2 → 80 điểm
export function retryStep(state, stepId, ctx)                     // 1 lượt/món, trừ retryCost vào ledger.waste; điểm mới tối đa 85
export function finishDish(state, ctx) → DishResult               // "Ra món": bước chưa làm = 0 điểm; tính Q (scoring.js); ghi vào ticket.done
export function abandonDish(state, ctx)                           // bỏ món: giá vốn đã trừ → ledger.waste
export function serveTicket(state, ticketId, ctx) → ScoreSheet    // khi mọi dòng xong: chấm sao khách, tip, review, danh tiếng; khách 'roi_di'
```
Một dòng phiếu có số lượng n = **một lượt nấu** (tham số nhân theo n, par × (1 + 0,4(n − 1))). Dòng khác ghi chú là lượt riêng.

Giá vốn: khi `submitChon` thành công, trừ tổng `cost × qty` của **mọi nguyên liệu đã chọn** vào `ledger.cogs` (phần thừa, bẫy ghi thêm vào `ledger.waste`).

## 10. Chấm điểm — `src/core/minigame-scoring.js` và `src/core/scoring.js`

`minigame-scoring.js` (hàm thuần, UI gọi để tính điểm từ dữ liệu thao tác):
```js
export function zoneMul(state, type, recipeId) → hệ số vùng (chặng × hẹp dần theo ngày × dụng cụ × thạo món × hỗ trợ; trần 1,6)
export function scoreChon({ required, optional, decoys, picked, mistakes }) → { score, errors }
export function scoreCha({ spots /*[0..1 độ sạch từng vết]*/, elapsed, par }) → score     // theo độ phủ, −15 nếu quá 2×par
export function scoreThai({ cuts /*[độ lệch px]*/, expected, extra, mul }) → score          // ≤6px:100, ≤14:80, ≤24:55, còn lại 20 (ngưỡng × mul); nhát thừa −10
export function scoreChamExact({ taps, n, distances /*0..1*/, mul }) → score
export function scoreChamMin({ taps, N }) → score
export function scoreChamTargets({ counts, targets }) → score                               // 100 − 30 × tổng |lệch|
export function scoreLua({ value, zone, mul }) → score                                       // hàm liên tục đối xứng quanh tâm; value > 1,0 là cháy → 0
export function scoreRot({ level, zone, mul }) → score                                       // tràn > 1,02 → 0
export function stepLabel(score) → 'Hoàn hảo'|'Tốt'|'Đạt'|'Hỏng'
```

`scoring.js`:
```js
export function ingredientErrors(recipe, notes, picked) → [{code, ing, penalty|cap}]
   // mỗi nguyên liệu chỉ tính 1 lỗi, ưu tiên: trai_ghi_chu (Q ≤ 60, sao ≤ 2) > bay (Q ≤ 60) > thieu_phu (−10) > thua (−8)
export function dishQuality(recipe, stepsResult, ingErrors) → { q, grade, flawless, capped }
   // q = Σ(w × điểm)/Σw − phạt; bước critical < 50 → grade 'hong'; flawless khi mọi bước ≥ 90, không lỗi nguyên liệu, không làm lại, không tự làm
export function customerStars(customer, dishes, recipes) → { stars, base, penalties }
   // base = hạng của Q trung bình có trọng số theo giá; có món Hỏng → base ≤ 2
   // sao = kẹp(làm_tròn_xuống(base − Σ phạt quầy − phạt chờ), 1, 5); khách khó tính: có lỗi → −1 thêm; khách tutorial không bị phạt
export function tipFor(stars, flawlessAny, persona) → đồng   // 5 sao: 5.000đ; có món Không tì vết hoặc khách khó tính: 10.000đ
export function averageRating(ratings) → số (đệm 4 sao khi < 5 đánh giá)
export function customerMultiplier(avg) → 1,15 | 1,0 | 0,85 | 0,7
```

## 11. Kinh tế và thạo món — `economy.js`, `mastery.js`

```js
// economy.js
export function summarizeShift(state) → Summary
   // { day, served, lost, missed, cashSales, qrSales, tips, cogs, waste, refunds, undercharge, overchange,
   //   fakeQrLoss, fixedCost, profit, drawerExpected, drawerActual, drawerDiff, avgStars, reputationGain,
   //   counterErrors: {code: số lần}, kitchenErrors: {code: số lần}, bestDish, advice }
export function settleShift(state, summary)   // wallet += (tiền mặt vượt quỹ lẻ) + QR + tip − chi phí cố định − hoàn tiền; trả nợ nếu có
export function canAfford(state, price) ; spend(state, price, reason) ; earn(state, amount, reason)
export function offerLoan(state) → boolean ; takeLoan(state)
// mastery.js
export function masteryLevel(progress) → 1..3
export function recordDish(state, recipeId, dishResult)   // cập nhật cooks/goodCooks/excellent/flawless/best
export function canAutoStep(state, recipeId) → boolean     // cấp ≥ 2
```

## 12. Lưu — `src/core/save.js`

```js
export const SAVE_KEY = 'bkn.save', BACKUP_KEY = 'bkn.bak'
export function encodeSave(state) → 'BKN1.' + base64url(UTF-8 JSON) + '.' + fnv1a(SALT + payload)
export function decodeSave(str) → state | null            // sai checksum → null
export function migrate(state) → state                    // gộp với defaultState(), kẹp giá trị, bỏ id không còn trong dữ liệu
export function saveTo(storage, state) ; loadFrom(storage) → state|null   // storage có getItem/setItem; thử bản chính rồi bản dự phòng
export function exportCode(state) → chuỗi ; importCode(str) → state|null  // mã sao lưu (M3)
```
UI gọi `saveTo(localStorage, state)` có debounce 300 ms, sau mỗi hành động quan trọng, khi `visibilitychange`/`pagehide`, và cuối ca (kèm ghi bản dự phòng). Tải lại giữa ca: khôi phục `state.shift`; nếu đang ở giữa một mini-game thì bước đó chơi lại từ đầu (cùng tham số).

## 13. Giao diện — quy ước `src/ui`

- `dom.js`: `h(tag, props, ...children)` tạo phần tử (props hỗ trợ `class`, `style`, `dataset`, `on*`), `clear(el)`, `$(sel, root)`.
- `app.js`: `createApp({ root, storage, now })` → `app = { state, data /*mọi export từ src/data*/, bus, ctx /*{emit}*/, save(), go(screenName, params), toast(text, opts), modal(opts) → Promise, vibrate(ms), sound(name), now() }`.
- `router.js`: mỗi màn là module `export default { mount(root, app, params) → { unmount(), update?(dt) } }`. Các màn: `title` (lần đầu: đặt tên xe; sau đó: vào game), `prep` (màn Chuẩn bị ca: thông tin ngày, nút "Mở hàng", nâng cấp — M2 thêm shop/nhiệm vụ/điểm danh), `service` (ca bán: chứa HUD + thanh tab Quầy/Bếp, gắn `counter` và `kitchen` làm panel con), `summary` (tổng kết ca).
- `loop.js`: `requestAnimationFrame`, gọi `advance(state, dt)` (dt kẹp 0,05 s) và `screen.update(dt)`; tạm dừng khi tab ẩn (`visibilitychange`).
- `input.js`: tiện ích Pointer Events: `bindPointer(el, {down, move, up, cancel})` với `setPointerCapture`, chỉ nhận con trỏ chính, `pointercancel` coi như thả tay; phím Space mô phỏng nhấn/giữ trên máy tính.
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
  mount(stage /*HTMLElement*/, step /*bước đã áp patch*/, ctx /*{ app, recipe, zoneMul, assist }*/)
    → { result: Promise<{ score, details }>, destroy() }
}
// index.js: export const MINIGAMES = { chon, cha, thai, cham, lua, rot }; export function playStep(stage, step, ctx)
```
Mini-game chỉ đo thao tác và gọi hàm chấm trong `core/minigame-scoring.js`; không tự sửa state. Màn `kitchen` nhận `result` rồi gọi `submitStep`. Thời gian đo bằng `performance.now()`. Mỗi bước tự kết thúc ở 2,5 × par (trừ `chon`). Thẻ gợi ý 0,8 s trước bước, chạm để bỏ qua, tự ẩn sau 3 lần nấu món đó.

## 14. data-testid bắt buộc (cho e2e)

- Màn title: `shop-name-input`, `start-button`. Màn prep: `open-shift`.
- Ca bán: `tab-counter`, `tab-kitchen`, `hud-wallet`, `hud-day`, `progress-4` (có `data-stage`).
- Quầy: `speech-bubble` (có `data-request` = JSON yêu cầu thật, để test tự động), `menu-item-<recipeId>`, `note-chip-<noteId>`, `qty-plus`, `qty-minus`, `add-line`, `order-line-<i>`, `readback`, `confirm-order`, `numpad-<0..9>`, `numpad-clear`, `report-total`, `drawer-<mệnh giá>`, `tray-<mệnh giá>`, `given-cash` (có `data-amount`), `give-change`, `qr-status` (có `data-arrived`), `qr-confirm`, `clip-ticket`, `receipt`.
- Bếp: `ticket-<ticketId>`, `cook-line-<i>`, `shelf-<ingredientId>`, `chon-done`, `board-step-<stepId>`, `method-<methodId>`, `finish-dish`, `auto-step`, `retry-step`, `abandon-dish`, `minigame-stage` (có `data-type`), các phần tử mini-game: `thai-guide-<i>` (có `data-x`), `lua-needle` (có `data-v`), `lua-zone` (có `data-a`, `data-b`), `lua-lift`, `rot-level` (có `data-v`), `rot-zone`, `rot-pour`, `cha-spot-<i>`, `cham-target`, `cham-bottle-<id>`, `cham-done`, `cham-pad`.
- Kết quả: `serve-ticket`, `score-sheet`, `complaint-apology-<i>`, `complaint-remake`, `complaint-refund`. Tổng kết: `summary`, `summary-profit`, `next-day`.
