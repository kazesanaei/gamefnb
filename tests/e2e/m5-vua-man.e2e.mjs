// E2E "Vừa màn" (M5, sau 0.5.1) — mỗi khâu trong ca thao tác TRỌN TRONG MỘT MÀN, KHÔNG cuộn tay, trên khung điện thoại thật.
// Đặc tả: phương án ghép "Cảnh + Khay" (mục 9 của đặc tả "Vừa màn": testid phải thấy không cuộn ngay khi vào khâu).
//
// Khung CHÍNH (mọi testid cần cho khâu): 402×874 iPhone 16 Pro cài app (vùng an toàn 62/34), 402×680 iPhone 16 Pro Safari
// (thanh dưới mở), 402×760 iPhone 16 Pro Safari (thanh thu gọn), 390×844 (vùng an toàn 47/34), 360×780 và 412×915 Android.
// Khung NHỎ (cột "khung nhỏ" của bảng mục 9 — nút chính của khâu): 360×600, 375×553 (vùng an toàn 47/34). Khung iOS mô
// phỏng iOS cắt phần tử ngoài vùng cuộn (clip-path: inset(0) trên .screen, .panel, .k-main) như các e2e iPhone khác.
//
// Năm luồng × tám khung (mỗi luồng một ngữ cảnh trình duyệt, 3 luồng chạy song song, cả tệp ~3,5–5 phút tùy tải máy, < 8 phút):
//  · Quầy tiền mặt (ngày 5, thực đơn 4 món, đơn 2 dòng có ghi chú): Order phiếu trống → bảng chọn món → phiếu 2 dòng → đọc
//    lại → Thanh toán (đã gõ tổng) → Tính tiền khay trống → đã lấy tiền thối → Phiếu thu → quầy trống.
//  · Quầy chuyển khoản: chờ tiền về (giờ trang dừng) → tiền đã về → Phiếu thu sau chuyển khoản.
//  · Quầy đơn dài, khách bắt lỗi (thực đơn 8 món có 4 món hiếm, hàng khách đầy 3 chỗ, đơn 3 dòng món hiếm với lời gọi món dài
//    nhất): Order → bảng chọn món hiếm → phiếu ghi sai → đọc lại, khách bắt 3 lỗi → bảng sửa dòng → phiếu 3 dòng đọc lại
//    đúng → Thanh toán → Tính tiền → Phiếu thu 3 dòng.
//  · Phiếu chấm có tip (tab Bếp, giao món).
//  · Bếp (3 phiếu, bánh tráng trộn Tây Ninh 9 bước): dây phiếu → phiếu mở → Chọn (rổ trống) → Thớt → sân khấu Thái (giờ
//    trang dừng).
// Ở MỖI trạng thái, không gọi cuộn nào (mọi lần chạm là chạm vào tọa độ đang thấy; phải cuộn mới chạm được thì ghi lỗi rồi mới
// để Playwright tự cuộn cho luồng đi tiếp):
//  · mỗi testid cần của khâu có trong DOM, đang hiện, hộp nằm TRỌN trong vùng nhìn thấy: [0, innerWidth] × [đáy HUD, đỉnh
//    thanh tab] (phần tử HUD: từ mép dưới vùng an toàn trên; thanh tab: tới mép trên vùng an toàn dưới; lớp nổi như bảng chọn
//    món: khung nhìn trừ vùng an toàn), cắt theo mọi tổ tiên có overflow / clip-path, trừ hàng nút dính đáy cùng vùng cuộn;
//  · elementFromPoint ở tâm phần nhìn thấy trúng chính phần tử (nút: thêm 4 điểm gần mép) — không bị thanh tab, hàng nút, lớp
//    khác đè (thẻ thông báo đang bay ngang không tính); nút ≥ 44×44;
//  · chữ đang thấy của màn Ca bán + lớp nổi ≥ 13px, không chữ lỗi; không tràn ngang;
//  · khung chính: hình đĩa món của thực đơn, hình kệ Chọn, hình nguyên liệu trên Thớt ≥ 48px;
//  · khung chính: không nội dung nào tràn trong VÙNG CUỘN CON (INNER: chữ bong bóng, danh sách dòng phiếu, lỗi khách bắt, khay
//    khâu, bảng giá, phiếu thu, bảng chọn món, phiếu chấm; và mọi vùng cuộn nằm giữa phần tử cần và panel): chữ / nút / phần
//    tử có testid phải nằm trọn trong hộp nhìn thấy của vùng — hộp phần tử thấy trọn mà chữ bên trong phải cuộn mới đọc hết
//    cũng là đỏ; nhãn "★ còn n" của món hiếm không đè tem giá.
// Mỗi luồng gom MỌI chỗ chưa đạt (kèm số đo px) rồi mới báo đỏ một lần, để thấy đủ các chỗ phải sửa.
// Biến môi trường: VUA_MAN_KHUNG=402x874,360x600 (chỉ chạy các khung này), VUA_MAN_LUONG=bat-loi,tien-mat (chỉ chạy các
// luồng này), VUA_MAN_LOG=1 (in bậc data-fit, --scene-h, --tray-h, vùng cuộn của từng trạng thái), VUA_MAN_CSS=<css> (soát
// chính bộ đo), SHOT_DIR=<thư mục> (chụp ảnh từng trạng thái, như các e2e khác).
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  T, openGame, seedSave, readSave, resolveIncidentIfShown, cookShiftSave, COOK_SHIFT_AT, COOK_OPEN_MS
} from './helpers.mjs'
import { playedSave, tipShiftSave, TIP_AT, vn } from '../helpers/m4-saves.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { newRecipeProgress } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { startShift, advance } from '../../src/core/shift.js'
import { priceOfLines, addLine, updateLine, readback, confirmOrder, reportTotal, changeOptions } from '../../src/core/order.js'
import { normalizeLines, expectedServiceSec, speechFor } from '../../src/core/customer.js'
import { minBillsChange, BILLS } from '../../src/core/money.js'
import { requiredIngredients } from '../../src/core/scoring.js'

const LOG = !!process.env.VUA_MAN_LOG

// ---------- Khung ----------
const FRAMES = {
  '402x874': { w: 402, h: 874, top: 62, bottom: 34, ios: true, main: true, ten: 'iPhone 16 Pro cài app (an toàn 62/34)' },
  '402x680': { w: 402, h: 680, top: 0, bottom: 0, ios: true, main: true, ten: 'iPhone 16 Pro Safari 402×680' },
  '402x760': { w: 402, h: 760, top: 0, bottom: 0, ios: true, main: true, ten: 'iPhone 16 Pro Safari thanh thu gọn 402×760' },
  '390x844': { w: 390, h: 844, top: 47, bottom: 34, ios: true, main: true, ten: 'iPhone 390×844 cài app (an toàn 47/34)' },
  '360x780': { w: 360, h: 780, top: 0, bottom: 0, ios: false, main: true, ten: 'Android 360×780' },
  '412x915': { w: 412, h: 915, top: 0, bottom: 0, ios: false, main: true, ten: 'Android 412×915' },
  '360x600': { w: 360, h: 600, top: 0, bottom: 0, ios: false, main: false, ten: 'Android thấp 360×600 (khung nhỏ)' },
  '375x553': { w: 375, h: 553, top: 47, bottom: 34, ios: true, main: false, ten: 'iPhone SE + Safari 375×553 (khung nhỏ, an toàn 47/34)' }
}
const WANT = (process.env.VUA_MAN_KHUNG || '').split(',').map(s => s.trim()).filter(Boolean)
// khung lạ dạng RỘNGxCAO trong VUA_MAN_KHUNG (vd 402x1700 để soát chính bộ đo): coi như khung chính, không vùng an toàn
for (const k of WANT) {
  const m = /^(\d+)x(\d+)$/.exec(k)
  if (m && !FRAMES[k]) FRAMES[k] = { w: Number(m[1]), h: Number(m[2]), top: 0, bottom: 0, ios: false, main: true, ten: 'Khung thử ' + k }
}
const FRAME_KEYS = Object.keys(FRAMES).filter(k => !WANT.length || WANT.includes(k))

// VUA_MAN_CSS=<css> thêm vào mọi khung (chỉ để soát chính bộ đo: cố ý làm hỏng bố cục rồi xem e2e có báo đúng chỗ không)
const frameCss = f => `:root { --safe-top: ${f.top}px !important; --safe-bottom: ${f.bottom}px !important; }` +
  (f.ios ? '\n.screen, .panel, .k-main { clip-path: inset(0); }' : '') + (process.env.VUA_MAN_CSS ? '\n' + process.env.VUA_MAN_CSS : '')

// ---------- Phần tử cần của từng khâu (đặc tả mục 9) ----------
// Cú pháp: testid ('readback'), tiền tố testid ('menu-item-*'), hoặc bộ chọn CSS (bắt đầu bằng . # [ hay có dấu cách).
// Đuôi '?' = có thì phải đạt, không có không sao. Đầu 'any:' = ít nhất một phần tử khớp đạt; 'first:' = phần tử đầu tiên đạt.
// main: khung chính; small: khung nhỏ; img: [bộ chọn hình, cạnh nhỏ nhất px], scene: phần tử của cảnh (chỉ khung chính).
const QUAY = ['hud', 'hud-wallet', 'help-button', 'queue', 'progress-4', 'ticket-rail', 'tab-counter', 'tab-kitchen']
// Phần tử thuộc CẢNH của tab Quầy (đặc tả mục 2.3, 4.2, 5): khi màn đã có khay (--tray-h) thì đáy phải nằm trên đỉnh khay.
const CANH = ['queue', 'ticket-rail', 'progress-4', 'speech-bubble']
const ORDER = ['speech-bubble', 'menu-item-*', 'readback', 'confirm-order']
const LINES = ['order-line-0', 'order-line-1', 'order-line-remove-0']
// quầy trống sau khi kẹp phiếu: còn phiếu trên dây nên có nút "Sang Bếp" (go-kitchen)
const IDLE = ['hud', 'hud-wallet', 'help-button', 'tab-counter', 'tab-kitchen', 'counter-idle', 'queue', 'ticket-rail', 'go-kitchen']
const STAGE = '[data-testid="minigame-stage"]'
// Nhãn "★ còn n" của món hiếm không đè tem giá trên cùng thẻ món (khung chính, mọi trạng thái có thực đơn)
const MENU_APART = [['.co-menu-left', '.co-price', '[data-testid^="menu-item-"]']]
const NEED = {
  order: { ten: 'Order · phiếu trống', main: [...QUAY, ...ORDER], small: [...QUAY, 'speech-bubble', 'confirm-order', 'any:menu-item-*'], img: [['.co-menu-plate', 48]], scene: CANH },
  sheet: { ten: 'Bảng chọn món', main: ['order-sheet', 'qty-plus', 'qty-minus', 'qty-value', 'note-chip-*', 'add-line', 'sheet-close'], small: ['add-line', 'sheet-close'] },
  lines: { ten: 'Order · phiếu 2 dòng', main: [...QUAY, ...ORDER, ...LINES], small: [...QUAY, 'readback', 'confirm-order'], img: [['.co-menu-plate', 48]], scene: CANH },
  readback: { ten: 'Order · đã đọc lại, chốt được', main: [...QUAY, ...ORDER, ...LINES], small: [...QUAY, 'readback', 'confirm-order'], scene: CANH },
  pay: { ten: 'Thanh toán', main: [...QUAY, 'price-board', 'numpad-*', 'report-total'], small: [...QUAY, 'numpad-*', 'report-total'], scene: CANH },
  // thẻ Khách đưa + thẻ Tổng đặt trên mặt quầy (cảnh) ở khâu Tính tiền
  cash: { ten: 'Tính tiền · khay trống', main: [...QUAY, 'given-cash', 'amount-due', 'drawer', 'drawer-*', 'tray', 'give-change'], small: [...QUAY, 'drawer', 'drawer-*', 'give-change'], scene: [...CANH, 'given-cash', 'amount-due'] },
  tray: { ten: 'Tính tiền · đã lấy tiền thối', main: [...QUAY, 'given-cash', 'amount-due', 'drawer', 'drawer-*', 'tray', 'give-change'], small: [...QUAY, 'drawer', 'drawer-*', 'give-change'], scene: [...CANH, 'given-cash', 'amount-due'] },
  receipt: { ten: 'Phiếu thu (tiền mặt)', main: [...QUAY, 'receipt', 'clip-ticket'], small: [...QUAY, 'clip-ticket'], scene: CANH },
  idle: { ten: 'Quầy trống (đã kẹp phiếu)', main: IDLE, small: IDLE, scene: ['queue', 'ticket-rail'] },
  // khâu chuyển khoản: thẻ Tổng nằm trong khối QR của khay (không phải cảnh)
  qrWait: { ten: 'Chuyển khoản · chờ tiền về', main: [...QUAY, 'qr-status', 'qr-confirm', 'qr-reject', 'amount-due'], small: [...QUAY, 'qr-confirm', 'qr-reject'], scene: CANH },
  qrIn: { ten: 'Chuyển khoản · tiền đã về', main: [...QUAY, 'qr-status', 'qr-confirm', 'qr-reject', 'amount-due'], small: [...QUAY, 'qr-confirm', 'qr-reject'], scene: CANH },
  receiptQr: { ten: 'Phiếu thu (sau chuyển khoản)', main: [...QUAY, 'receipt', 'clip-ticket'], small: [...QUAY, 'clip-ticket'], scene: CANH },
  score: { ten: 'Phiếu chấm có tip', main: ['score-sheet'], small: ['score-sheet'] },
  rail: { ten: 'Bếp · dây phiếu (3 phiếu)', main: ['ticket-rail', 'ticket-p*', 'serve-ticket?'], small: ['first:ticket-p*'] },
  // "‹ Phiếu" (kitchen-back) chỉ có ở đầu bước Chọn / Thớt: ở danh sách phiếu thì có mới đo
  open: { ten: 'Bếp · phiếu mở', main: ['cook-line-*', 'kitchen-back?'], small: ['cook-line-*', 'kitchen-back?'] },
  chon: { ten: 'Bếp · Chọn (rổ trống)', main: ['recipe-card', 'minigame-stage', 'shelf-*', 'chon-basket', 'chon-done', 'kitchen-back'], small: ['chon-done', 'any:shelf-*', 'kitchen-back'], img: [['.chon-icon', 48]] },
  thot: { ten: 'Bếp · Thớt sơ chế', main: ['board', 'board-step-*', 'finish-dish', 'abandon-dish'], small: ['finish-dish', 'any:[data-testid^="board-step-"].is-available'], img: [['.k-ing-art', 48]] },
  // Luồng "đơn dài, khách bắt lỗi" (thực đơn 8 món có 4 món hiếm, đơn 3 dòng món hiếm, hàng khách đầy 3 chỗ): phiếu ghi sai 2 dòng + thiếu
  // 1 món → đọc lại, khách bắt cả 3 lỗi → sửa 2 dòng, thêm món thiếu → đọc lại đúng → Thanh toán → Tính tiền → Phiếu thu.
  big: { ten: 'Order · thực đơn 8 món (4 món hiếm), phiếu trống', main: [...QUAY, ...ORDER], small: [...QUAY, 'speech-bubble', 'confirm-order', 'any:menu-item-*'], img: [['.co-menu-plate', 48]], scene: CANH, apart: MENU_APART },
  sheetEdit: { ten: 'Bảng chọn món · sửa dòng', main: ['order-sheet', 'qty-plus', 'qty-minus', 'qty-value', 'note-chip-*', 'add-line', 'remove-line', 'sheet-close'], small: ['add-line', 'sheet-close'] },
  wrong: { ten: 'Order · phiếu ghi sai 2 dòng', main: [...QUAY, ...ORDER, ...LINES], small: [...QUAY, 'readback', 'confirm-order'], img: [['.co-menu-plate', 48]], scene: CANH, apart: MENU_APART },
  // khách bắt lỗi (đặc tả mục 9: caught-list, readback, confirm-order, speech-bubble): nhãn lỗi ngay trên dòng (.co-line-err)
  // + danh sách lỗi còn hiện lỗi "ghi thiếu món". Để sửa xong không cuộn còn phải thấy các dòng (chạm để sửa) và thẻ món bị
  // thiếu; các thẻ món khác không bắt buộc (bảng thực đơn được thu một hàng, cuộn ngang tới món thiếu)
  caught: { ten: 'Order · khách bắt lỗi (sai ghi chú, sai số lượng, thiếu món)', main: [...QUAY, 'speech-bubble', 'readback', 'confirm-order', 'caught-list', '.co-line-err', ...LINES, 'menu-item-tra_tac_mat_ong'], small: [...QUAY, 'readback', 'confirm-order'], scene: CANH, apart: MENU_APART },
  fixed: { ten: 'Order · phiếu 3 dòng đã sửa, đọc lại đúng', main: [...QUAY, ...ORDER, ...LINES, 'order-line-2'], small: [...QUAY, 'readback', 'confirm-order'], scene: CANH, apart: MENU_APART },
  pay3: { ten: 'Thanh toán (đơn 3 dòng)', main: [...QUAY, 'price-board', 'numpad-*', 'report-total'], small: [...QUAY, 'numpad-*', 'report-total'], scene: CANH },
  cash3: { ten: 'Tính tiền · khay trống (đơn 3 dòng)', main: [...QUAY, 'given-cash', 'amount-due', 'drawer', 'drawer-*', 'tray', 'give-change'], small: [...QUAY, 'drawer', 'drawer-*', 'give-change'], scene: [...CANH, 'given-cash', 'amount-due'] },
  tray3: { ten: 'Tính tiền · đã lấy tiền thối (đơn 3 dòng)', main: [...QUAY, 'given-cash', 'amount-due', 'drawer', 'drawer-*', 'tray', 'give-change'], small: [...QUAY, 'drawer', 'drawer-*', 'give-change'], scene: [...CANH, 'given-cash', 'amount-due'] },
  receipt3: { ten: 'Phiếu thu 3 dòng (tiền mặt)', main: [...QUAY, 'receipt', 'clip-ticket'], small: [...QUAY, 'clip-ticket'], scene: CANH }
}
// Vùng con có nội dung người chơi phải đọc / chạm hết (khung chính, mọi trạng thái): chính vùng và mọi con có overflow phải
// chứa trọn nội dung (scrollHeight ≤ clientHeight + 1) — không cuộn bên trong, không cắt câm. Thêm vào đó, mọi vùng cuộn dọc
// nằm giữa một phần tử cần và vùng cuộn chính của màn cũng phải chứa trọn nội dung.
const INNER = [
  '.co-bubble-say',                  // chữ lời khách trong bong bóng
  '[data-testid="draft"]',           // danh sách dòng phiếu order
  '[data-testid="caught-list"]',     // lỗi khách bắt
  '.stage',                          // khay của khâu (Order, Thanh toán, Tính tiền, chuyển khoản, phiếu thu)
  '[data-testid="price-board"]',     // bảng giá phấn
  '[data-testid="receipt"]',         // phiếu thu (các dòng món)
  '[data-testid="order-sheet"]',     // bảng chọn món
  '[data-testid="score-sheet"]'      // phiếu chấm
]
// Sân khấu: đích thao tác theo loại (đặc tả mục 9: "đích thao tác của mini-game, nút trong .mg-foot")
const STAGE_TARGET = { thai: 'thai-board', cha: 'cha-area', dap: 'dap-egg', got: 'got-fruit', lua: 'lua-lift', rot: 'rot-pour', lac: 'lac-shaker', xoay: 'xoay-bowl', bay: 'bay-target', cham: 'cham-done' }
function stageNeed(type) {
  const st = `${STAGE}[data-type="${type}"]`
  const req = [st, STAGE_TARGET[type] ? `${st} [data-testid="${STAGE_TARGET[type]}"]` : null, `${st} .mg-foot`, `${st} .mg-foot button?`].filter(Boolean)
  return { ten: `Bếp · sân khấu ${type}`, main: req, small: req }
}

// ---------- Bản lưu dựng bằng lõi (dựng một lần cho mọi khung) ----------

// Đơn 2 dòng có ghi chú (bánh mì ×2 thêm trứng + cay, bánh tráng trộn thêm trứng cút) trên thực đơn 4 món.
const REQUEST = [
  { recipeId: 'banh_mi_op_la', qty: 2, notes: ['them_trung', 'cay'] },
  { recipeId: 'banh_trang_tron', qty: 1, notes: ['them_trung_cut'] }
]
const MENU_EXTRA = ['ca_phe_sua_da']

// Đơn dài nhất khách thật gọi được (makeRequest của lõi: ≤ 3 dòng, mỗi dòng ≤ 2 ghi chú khác nhóm, ×1–3), cả 3 dòng là món
// hiếm: bánh tráng trộn Tây Ninh ×3 không rau răm + thêm trứng cút, bánh mì trứng gà ta ×2 không hành + lòng đào, trà tắc mật
// ong rừng ×2 không đá (lời gọi món ~185 chữ, dài nhất trong 24 lần sinh). Thực đơn 8 món: 4 món thường + 4 món hiếm (nhãn
// "★ còn n" trên thẻ). Chè bưởi là món theo dịp, không lên thực đơn ngày thường.
const LONG_REQUEST = [
  { recipeId: 'banh_trang_tron_tay_ninh', qty: 3, notes: ['khong_rau_ram', 'them_trung_cut'] },
  { recipeId: 'banh_mi_trung_ga_ta', qty: 2, notes: ['khong_hanh', 'long_dao'] },
  { recipeId: 'tra_tac_mat_ong', qty: 2, notes: ['khong_da'] }
]
const LONG_MENU = ['banh_mi_op_la', 'tra_tac', 'banh_trang_tron', 'ca_phe_sua_da', 'tra_tac_mat_ong', 'banh_mi_trung_ga_ta', 'banh_trang_tron_tay_ninh', 'ca_phe_muoi']
// Phiếu ghi sai lần đầu: dòng 1 thiếu "thêm trứng cút" (sai ghi chú), dòng 2 ×1 thay vì ×2 (sai số lượng), quên trà tắc mật
// ong (ghi thiếu món) → khách bắt cả 3 lỗi. Sửa: chạm dòng 1 thêm ghi chú, chạm dòng 2 tăng số lượng, thêm món thiếu.
const WRONG_DRAFT = [
  { recipeId: 'banh_trang_tron_tay_ninh', qty: 3, notes: ['khong_rau_ram'] },
  { recipeId: 'banh_mi_trung_ga_ta', qty: 1, notes: ['khong_hanh', 'long_dao'] }
]
// Các bước lõi tương ứng (để chạy thử bằng lõi chọn hạt ngẫu nhiên): readback: số lỗi khách phải bắt
const CAUGHT_STEPS = [
  ...WRONG_DRAFT.map(l => ({ add: l })),
  { readback: 3 },
  { update: [0, LONG_REQUEST[0]] },
  { update: [1, LONG_REQUEST[1]] },
  { add: LONG_REQUEST[2] },
  { readback: 0 }
]

// Chạy thử quầy của khách trên BẢN SAO state bằng lõi (mặc định: ghi đúng, đọc lại; steps: các bước ghi / sửa / đọc lại như
// luồng trình duyệt), chốt, báo đúng tổng → khâu Tính tiền của bản sao. Khách bắt số lỗi khác steps thì trả null.
function trialCounter(state, customerId, steps = null) {
  const st = JSON.parse(JSON.stringify(state))
  const ctx = makeMetaCtx({ at: COOK_SHIFT_AT })
  ctx.setState(st)
  const sh = st.shift
  for (let k = 0; k < 4000 && !(sh.counter && sh.counter.customerId === customerId); k++) {
    if (sh.counter) return null
    advance(st, 0.25, ctx)
  }
  const c = sh.counter
  if (!c || c.customerId !== customerId) return null
  const cust = sh.customers[customerId]
  if (!steps) {
    for (const l of cust.request) addLine(st, l)
    readback(st, ctx)
  } else {
    for (const s of steps) {
      if (s.add) addLine(st, s.add)
      else if (s.update) updateLine(st, s.update[0], s.update[1])
      else if ((readback(st, ctx).caught || []).length !== s.readback) return null
    }
  }
  if (!confirmOrder(st, ctx).ok) return null
  const result = reportTotal(st, priceOfLines(cust.request, DATA.RECIPES), ctx)
  return { counter: sh.counter, result, drawer: sh.drawer, state: st, ctx }
}

// Như counterShiftSave của helpers.mjs (4 ca người chơi hoàn hảo, mở ca ngày 5 lúc COOK_SHIFT_AT, không tình huống, khách
// đầu rất kiên nhẫn, các khách sau tới muộn 4 phút) nhưng thực đơn đủ 4 món. pay: 'cash' (có tiền thối, két thối được) | 'qr'.
// opts (luồng đơn dài): request, menu (món thêm vào thực đơn), steps (bước của trialCounter), queue (số khách xếp hàng ngay
// sau khách đầu, tới ở giây +4, +7…, rất kiên nhẫn; hàng chờ tối đa 3 chỗ kể cả khách ở quầy nên queue ≤ 2), longest (chọn
// lời gọi món dài nhất trong 24 lần sinh), name.
function counterSave(pay, opts = {}) {
  const { request = REQUEST, menu = MENU_EXTRA, steps = null, queue = 0, longest = false } = opts
  const { state } = playedSave(3, 4, { name: opts.name || (pay === 'qr' ? 'Xe Vừa Màn QR' : 'Xe Vừa Màn'), freq: 'it' })
  for (const rid of [...request.map(l => l.recipeId), ...menu]) {
    if (!state.recipes[rid]) state.recipes[rid] = newRecipeProgress(0)
    for (const ing of Object.keys(DATA.RECIPES[rid].rare || {})) state.rare.stock[ing] = Math.max(Number(state.rare.stock[ing]) || 0, 4)
  }
  state.upgrades = { ...(state.upgrades || {}) }
  delete state.upgrades.loa_bao_tien
  const ctx = makeMetaCtx({ at: COOK_SHIFT_AT, attach: true })
  ctx.setState(state)
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  const sh = startShift(state, ctx)
  sh.incident = null
  sh.incidentQueue = []
  const customerId = sh.plan[0].customerId
  const a0 = sh.plan[0].arriveAt
  sh.plan.slice(1).forEach((p, i) => {
    if (i < queue) {
      p.arriveAt = a0 + 4 + 3 * i
      const q = sh.customers[p.customerId]
      if (q) q.patienceSec = 3600
    } else p.arriveAt += 240
  })
  const cust = sh.customers[customerId]
  cust.request = normalizeLines(request)
  cust.expectedSec = expectedServiceSec(cust.request, ctx)
  cust.speech = speechFor(cust, sh, ctx)
  for (let i = 1; longest && i < 24; i++) {
    const s = speechFor(cust, sh, ctx)
    if (String(s).length > String(cust.speech).length) cust.speech = s
  }
  cust.tutorial = false
  cust.patienceSec = 3600
  delete cust.forcePay
  const total = priceOfLines(cust.request, DATA.RECIPES)
  const base = Number(sh.rng) >>> 0
  for (let k = 0; k < 4000; k++) {
    sh.rng = (base + k * 2654435761) >>> 0
    const t = trialCounter(state, customerId, steps)
    if (!t || t.result.result !== 'dung') continue
    const c = t.counter
    const ok = pay === 'qr'
      ? c.payMethod === 'qr' && !c.fakeQr
      : c.payMethod === 'cash' && c.changeDue > 0 && !changeOptions(t.state, t.ctx).length && !!minBillsChange(c.changeDue, t.drawer)
    if (ok) return { state, customerId, total, request: cust.request, speech: cust.speech }
  }
  throw new Error('không tìm được hạt ngẫu nhiên cho cách trả ' + pay)
}

const SAVES = {
  cash: counterSave('cash'),
  qr: counterSave('qr'),
  caught: counterSave('cash', { request: LONG_REQUEST, menu: LONG_MENU, steps: CAUGHT_STEPS, queue: 2, longest: true, name: 'Xe Bắt Lỗi Vừa Màn' }),
  tip: (() => {
    const { state, tickets } = tipShiftSave(1)
    const high = tickets.find(t => t.bill >= 20000)
    assert.ok(high, 'ca dựng sẵn có phiếu từ 20.000đ')
    return { state, ticketId: high.ticketId }
  })(),
  // 3 phiếu trên dây: bánh tráng trộn Tây Ninh (9 bước) + trà tắc, rồi 2 phiếu trà tắc; món đã nấu 5 lần (thẻ bước gọn)
  cook: cookShiftSave({ recipeId: 'banh_trang_tron_tay_ninh', extra: ['tra_tac'] }, null, { tickets: 3, cooks: 5, name: 'Xe Bếp Vừa Màn' })
}

// ---------- Thư viện đo trong trang (gắn bằng addInitScript; tự chứa, không dùng biến ngoài) ----------
function installVm() {
  const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
  const rd = v => Math.round(v)
  const clsOf = el => String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').split(/\s+/).filter(Boolean)
  const nameOf = el => {
    if (!el || el.nodeType !== 1) return String(el)
    const t = el.getAttribute('data-testid')
    if (t) return t
    const c = clsOf(el)[0]
    const up = el.parentElement && el.parentElement.closest('[data-testid]')
    return (c ? '.' + c : el.tagName.toLowerCase()) + (up ? '@' + up.getAttribute('data-testid') : '')
  }
  const toCss = s => (/^[.#[]/.test(s) || s.includes(' ') ? s : s.endsWith('*') ? `[data-testid^="${s.slice(0, -1)}"]` : `[data-testid="${s}"]`)
  const shown = el => {
    if (!el || !el.isConnected || !el.getClientRects().length) return false
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return false
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (Number(getComputedStyle(n).opacity) < 0.05) return false
    const r = el.getBoundingClientRect()
    return r.width >= 1 && r.height >= 1
  }
  // bản sao ở lớp hiệu ứng (két bay, phiếu bay) không phải phần tử thao tác
  const find = s => { try { return [...document.querySelectorAll(toCss(s))].filter(e => !e.closest('.vfx-layer') && shown(e)) } catch { return [] } }
  const tappable = el => el.matches('button, [role="button"], a[href], summary, input, select')
  const frame = () => {
    const cs = getComputedStyle(document.documentElement)
    const safeTop = num(cs.getPropertyValue('--safe-top')), safeBottom = num(cs.getPropertyValue('--safe-bottom'))
    const svc = document.querySelector('[data-testid="screen-service"]')
    const hud = svc && svc.querySelector(':scope > .hud')
    const tab = svc && svc.querySelector(':scope > .tabbar')
    return {
      safeTop, safeBottom, svc,
      hudBottom: hud && shown(hud) ? hud.getBoundingClientRect().bottom : safeTop,
      tabTop: tab && shown(tab) ? tab.getBoundingClientRect().top : innerHeight - safeBottom
    }
  }
  // vùng được phép của phần tử theo chỗ nó nằm (đặc tả mục 9)
  const band = (el, F) => {
    if (el.matches('[data-testid="hud"]')) return { top: 0, bottom: innerHeight, zone: 'khung nhìn' }
    if (el.closest('.tabbar')) return { top: F.tabTop, bottom: innerHeight - F.safeBottom, zone: 'thanh tab' }
    // bảng chọn món dính đáy: nền bảng phủ cả vùng an toàn dưới (có đệm riêng), các nút trong bảng thì phải trên vùng đó
    if (el.matches('[data-testid="order-sheet"]')) return { top: F.safeTop, bottom: innerHeight, zone: 'lớp nổi, bảng dính đáy' }
    if (el.closest('.hud')) return { top: F.safeTop, bottom: F.tabTop, zone: 'HUD' }
    if (el.closest('.overlay-root')) return { top: F.safeTop, bottom: innerHeight - F.safeBottom, zone: 'lớp nổi' }
    return { top: F.hudBottom, bottom: F.tabTop, zone: 'giữa HUD và thanh tab' }
  }
  const isVScroll = el => {
    const cs = getComputedStyle(el)
    return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1
  }
  const vScrollerOf = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) if (isVScroll(a)) return a; return null }
  const clipAncestors = el => {
    const out = []
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      if (!a.getClientRects().length) continue
      const cs = getComputedStyle(a)
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || (cs.clipPath && cs.clipPath !== 'none')) out.push(a)
    }
    return out
  }
  // hàng dính (position: sticky) của cùng vùng cuộn: hàng dính đáy nằm sau phần tử thì che phần dưới, dính đầu nằm trước thì
  // che phần trên
  const stickiesOf = (sc, cache) => {
    if (cache.has(sc)) return cache.get(sc)
    const out = []
    for (const s of sc.querySelectorAll('*')) {
      const cs = getComputedStyle(s)
      if (cs.position !== 'sticky' || !shown(s) || vScrollerOf(s) !== sc) continue
      out.push({ s, bottom: cs.bottom !== 'auto', top: cs.top !== 'auto' })
    }
    cache.set(sc, out)
    return out
  }
  const geo = (el, F, cache) => {
    const r = el.getBoundingClientRect()
    const B = band(el, F)
    let t = B.top, b = B.bottom, l = 0, rr = innerWidth
    for (const a of clipAncestors(el)) {
      const ar = a.getBoundingClientRect()
      const top = ar.top + a.clientTop, left = ar.left + a.clientLeft
      t = Math.max(t, top); b = Math.min(b, top + a.clientHeight); l = Math.max(l, left); rr = Math.min(rr, left + a.clientWidth)
    }
    const sc = vScrollerOf(el)
    if (sc) {
      for (const x of stickiesOf(sc, cache)) {
        if (x.s.contains(el) || el.contains(x.s)) continue
        const pos = el.compareDocumentPosition(x.s)
        const sr = x.s.getBoundingClientRect()
        if (x.bottom && (pos & Node.DOCUMENT_POSITION_FOLLOWING)) b = Math.min(b, sr.top)
        else if (x.top && (pos & Node.DOCUMENT_POSITION_PRECEDING)) t = Math.max(t, sr.bottom)
      }
    }
    const v = { top: Math.max(r.top, t), bottom: Math.min(r.bottom, b), left: Math.max(r.left, l), right: Math.min(r.right, rr) }
    return { r, t, b, l, rr, v, zone: B.zone }
  }
  // thẻ thông báo bay ngang (toast) là tạm thời: chạm vào nó không tính là bị che
  const hitOk = (el, x, y) => {
    const e = document.elementFromPoint(x, y)
    return { ok: !!e && (e === el || el.contains(e) || !!e.closest('.toast-stack')), e }
  }
  // lớp trong suốt (không nền, không ảnh nền) nằm trên phần tử CHỈ ĐỂ XEM (vd panel Quầy trong suốt phủ lên cảnh): vẫn thấy
  // phần tử bên dưới nên không tính là bị che; với NÚT thì vẫn là bị che (chạm không tới nút)
  const clearAt = e => {
    if (!e) return false
    const cs = getComputedStyle(e)
    const bg = cs.backgroundColor
    return (bg === 'transparent' || /^rgba\(.*,\s*0\)$/.test(bg)) && cs.backgroundImage === 'none'
  }
  const checkEl = (el, F, cache) => {
    const out = []
    const name = nameOf(el)
    const g = geo(el, F, cache)
    const cut = [['trên', g.t - g.r.top], ['dưới', g.r.bottom - g.b], ['trái', g.l - g.r.left], ['phải', g.r.right - g.rr]]
    const bad = cut.filter(([, px]) => px > 0.5)
    if (bad.length) {
      out.push(`${name} khuất ${bad.map(([k, px]) => `${k} ${rd(px)}px`).join(', ')} (hộp y ${rd(g.r.top)}–${rd(g.r.bottom)} x ${rd(g.r.left)}–${rd(g.r.right)}; vùng thấy y ${rd(g.t)}–${rd(g.b)} x ${rd(g.l)}–${rd(g.rr)}, ${g.zone})`)
    }
    const vw = g.v.right - g.v.left, vh = g.v.bottom - g.v.top
    const tap = tappable(el)
    if (vw < 2 || vh < 2) {
      if (!bad.length) out.push(`${name} không thấy (${rd(Math.max(0, vw))}×${rd(Math.max(0, vh))}px)`)
    } else if (tap || getComputedStyle(el).pointerEvents !== 'none') {
      const cx = g.v.left + vw / 2, cy = g.v.top + vh / 2
      const pts = [[cx, cy]]
      if (tap) {
        const d = Math.min(6, vh / 4), dx = Math.min(vh / 2, vw / 4)
        pts.push([g.v.left + dx, cy], [g.v.right - dx, cy], [cx, g.v.top + d], [cx, g.v.bottom - d])
      }
      const miss = pts.map(([x, y]) => ({ x, y, h: hitOk(el, x, y) })).filter(p => !p.h.ok && (tap || !clearAt(p.h.e)))
      if (miss.length) out.push(`${name} bị che: ${miss.map(p => `${nameOf(p.h.e)} @${rd(p.x)},${rd(p.y)}`).join('; ')}`)
    }
    if (tap && Math.min(g.r.width, g.r.height) < 43.5) out.push(`${name} nút ${rd(g.r.width)}×${rd(g.r.height)} (< 44px)`)
    return out
  }
  const fitInfo = F => {
    const svc = F.svc
    if (!svc) return {}
    const cs = getComputedStyle(svc)
    const sc = []
    for (const p of document.querySelectorAll('.panels > .panel, .k-main, .co-tray, .counter')) {
      if (!shown(p) || !isVScroll(p)) continue
      sc.push(`${nameOf(p)} ${rd(p.clientHeight)}/${rd(p.scrollHeight)} ở ${rd(p.scrollTop)}`)
    }
    return {
      fit: svc.getAttribute('data-fit') || '', tab: svc.getAttribute('data-tab') || '', focus: svc.classList.contains('is-focus'),
      scene: cs.getPropertyValue('--scene-h').trim(), tray: cs.getPropertyValue('--tray-h').trim(),
      hud: rd(F.hudBottom), tabTop: rd(F.tabTop), cuon: sc
    }
  }
  // ---- nội dung tràn trong vùng cuộn con (khung chính) ----
  // Hộp phần tử nằm trọn trong vùng thấy chưa đủ: chữ bong bóng, danh sách dòng phiếu, phiếu thu… có thể vẫn dài hơn hộp của
  // chính vùng chứa (phải cuộn bên trong / bị cắt câm). Đo NỘI DUNG thật chứ không đo scrollHeight (scrollHeight còn tính cả
  // hoạt ảnh trang trí như vệt sáng trên nút, khoảng dòng thừa của chữ): chữ (mỗi dòng lấy khung em = cỡ chữ quanh tâm dòng,
  // nên dấu tiếng Việt cao không bị tính oan) và hộp nút / phần tử có testid, đã cắt theo các vùng cắt nằm bên trong, so với
  // hộp nhìn thấy (client box) của vùng. Vùng cuộn chính của màn (panel, k-main) đã đo bằng hộp phần tử nên bỏ qua.
  const MAIN_SCROLL = '.panels > .panel, .k-main'
  // phần tử chỉ cho máy đọc (1px, clip-path inset(50%)) không tính; hình vẽ (svg) và lớp hiệu ứng không phải nội dung
  const srOnly = el => {
    const r = el.getBoundingClientRect()
    return r.width <= 2 || r.height <= 2 || /inset\(\s*50%/.test(getComputedStyle(el).clipPath || '')
  }
  const decor = el => !!el.closest('svg, .vfx-layer')
  const clipsOf = cs => cs.overflowX !== 'visible' || cs.overflowY !== 'visible'
  const clientBox = a => {
    const r = a.getBoundingClientRect()
    const top = r.top + a.clientTop, left = r.left + a.clientLeft
    return { top, left, bottom: top + a.clientHeight, right: left + a.clientWidth }
  }
  const inter = (a, b) => ({ top: Math.max(a.top, b.top), left: Math.max(a.left, b.left), bottom: Math.min(a.bottom, b.bottom), right: Math.min(a.right, b.right) })
  // khung cắt của các vùng cắt từ `from` (kể cả) lên tới c (không kể c)
  const clipBetween = (from, c) => {
    let box = { top: -1e9, left: -1e9, bottom: 1e9, right: 1e9 }
    for (let a = from; a && a !== c; a = a.parentElement) if (clipsOf(getComputedStyle(a))) box = inter(box, clientBox(a))
    return box
  }
  // phần nội dung của vùng c nằm ngoài hộp nhìn thấy của c: { top, bottom, left, right } (px), mẫu chữ / phần tử bị cắt
  const cutOf = c => {
    const B = clientBox(c)
    const cut = { top: 0, bottom: 0, left: 0, right: 0 }
    const what = { top: '', bottom: '', left: '', right: '' }
    const take = (r, label, horiz) => {
      const d = { top: B.top - r.top, bottom: r.bottom - B.bottom, left: horiz ? B.left - r.left : 0, right: horiz ? r.right - B.right : 0 }
      for (const k of Object.keys(d)) if (d[k] > cut[k]) { cut[k] = d[k]; what[k] = label }
    }
    const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT)
    const range = document.createRange()
    while (w.nextNode()) {
      const t = w.currentNode
      const txt = t.textContent.trim()
      const p = t.parentElement
      if (!txt || !p || decor(p) || !shown(p)) continue
      const pcs = getComputedStyle(p)
      const fs = parseFloat(pcs.fontSize) || 13
      const clip = p === c ? { top: -1e9, left: -1e9, bottom: 1e9, right: 1e9 } : clipBetween(p, c)
      // chữ "…" có chủ đích (text-overflow: ellipsis) không tính là cắt ngang
      const horiz = pcs.textOverflow !== 'ellipsis'
      range.selectNodeContents(t)
      const rects = [...range.getClientRects()]
      rects.forEach((r, i) => {
        const cy = (r.top + r.bottom) / 2
        const em = inter({ top: cy - fs / 2, bottom: cy + fs / 2, left: r.left, right: r.right }, clip)
        if (em.right - em.left < 1 || em.bottom - em.top < 1) return
        take(em, `chữ “${txt.slice(0, 24)}${txt.length > 24 ? '…' : ''}”${rects.length > 1 ? ` dòng ${i + 1}/${rects.length}` : ''}`, horiz)
      })
    }
    for (const d of c.querySelectorAll('button, input, select, [data-testid]')) {
      if (decor(d) || !shown(d) || srOnly(d)) continue
      const v = inter(d.getBoundingClientRect(), clipBetween(d.parentElement, c))
      if (v.right - v.left < 1 || v.bottom - v.top < 1) continue
      take(v, nameOf(d), true)
    }
    return { cut, what }
  }
  // Chữ cắt CÓ CHỦ ĐÍCH bằng -webkit-line-clamp (hiện "…", vd dải "Khách nói" của bảng chọn món giữ như 0.5.1) không tính,
  // trừ các vùng phải hiện trọn chữ (lời khách trong bong bóng).
  const MUST_FIT = '.co-bubble-say'
  const innerOverflow = (roots, reqEls) => {
    const out = []
    const seen = new Set()
    const test = el => {
      if (seen.has(el)) return
      seen.add(el)
      if (el.matches(MAIN_SCROLL) || !shown(el) || decor(el) || srOnly(el)) return
      const cs = getComputedStyle(el)
      if (!clipsOf(cs)) return
      const clamp = cs.webkitLineClamp || cs.getPropertyValue('-webkit-line-clamp')
      if (clamp && clamp !== 'none' && !el.matches(MUST_FIT)) return
      const { cut, what } = cutOf(el)
      // dải cuộn ngang có chủ đích (thực đơn > 10 món, kẹp phiếu đầy): phần tử cần trong dải đã đo bằng hộp; ở đây chỉ xét dọc
      const carousel = /auto|scroll/.test(cs.overflowX) && /hidden|clip/.test(cs.overflowY)
      // phần nằm TRÊN / TRÁI mép vùng khi vùng chưa cuộn là phần tràn âm (đồ của khâu trước trượt ra bằng transform, đồ trang
      // trí): không cuộn tới được và không phải nội dung đang cần — chỉ tính khi vùng đã bị cuộn (scrollTop / scrollLeft > 0)
      // hoặc chữ bị cắt cả hai đầu (chữ to hơn hộp)
      const skip = k => (carousel && (k === 'left' || k === 'right')) ||
        (k === 'top' && el.scrollTop < 0.5 && !(cut.bottom > 1)) || (k === 'left' && el.scrollLeft < 0.5 && !(cut.right > 1))
      const bad = [['trên', 'top'], ['dưới', 'bottom'], ['trái', 'left'], ['phải', 'right']].filter(([, k]) => cut[k] > 1 && !skip(k))
      if (!bad.length) return
      const scroll = /auto|scroll/.test(cs.overflowY + ' ' + cs.overflowX)
      out.push(`${nameOf(el)} ${scroll ? 'phải cuộn bên trong mới thấy hết' : 'cắt mất nội dung'}: ` +
        bad.map(([k, key]) => `${k} ${rd(cut[key])}px (${what[key]})`).join(', ') +
        ` (vùng ${rd(el.clientWidth)}×${rd(el.clientHeight)}, nội dung cuộn ${rd(el.scrollWidth)}×${rd(el.scrollHeight)})`)
    }
    // 1) vùng được nêu (bong bóng, phiếu order, khay khâu, phiếu thu…): chính nó và mọi con có overflow
    for (const s of roots) {
      let els = []
      try { els = [...document.querySelectorAll(s)] } catch { els = [] }
      for (const e of els) {
        if (decor(e) || !shown(e)) continue
        test(e)
        for (const d of e.querySelectorAll('*')) if (clipsOf(getComputedStyle(d))) test(d)
      }
    }
    // 2) mọi vùng cuộn (auto / scroll) nằm giữa phần tử cần và vùng cuộn chính của màn
    for (const el of reqEls) {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (a.matches(MAIN_SCROLL)) break
        const cs = getComputedStyle(a)
        if (/auto|scroll/.test(cs.overflowY + ' ' + cs.overflowX)) test(a)
      }
    }
    return out
  }
  // hai phần tử trong cùng một khối không được đè nhau (vd nhãn "★ còn n" với tem giá trên thẻ món)
  const overlaps = pairs => {
    const out = []
    for (const [a, b, scope] of pairs) {
      for (const box of document.querySelectorAll(scope)) {
        const ea = box.querySelector(a), eb = box.querySelector(b)
        if (!ea || !eb || !shown(ea) || !shown(eb) || srOnly(ea) || srOnly(eb)) continue
        const ra = ea.getBoundingClientRect(), rb = eb.getBoundingClientRect()
        const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
        const hh = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
        if (w > 0.5 && hh > 0.5) out.push(`${a} đè ${b} ở ${nameOf(box)}: giao ${rd(w)}×${rd(hh)}px (${a} x ${rd(ra.left)}–${rd(ra.right)} y ${rd(ra.top)}–${rd(ra.bottom)}; ${b} x ${rd(rb.left)}–${rd(rb.right)} y ${rd(rb.top)}–${rd(rb.bottom)})`)
      }
    }
    return out
  }
  window.__vm = {
    // spec: { req: [...], img: [[bộ chọn, px]], scene: [...], inner: [bộ chọn vùng] | null, apart: [[a, b, khối]] }
    //   → { out: [chuỗi chưa đạt], info }
    audit(spec) {
      const F = frame()
      const cache = new Map()
      const out = []
      const reqEls = []
      for (const raw of spec.req) {
        let s = raw, mode = 'all', opt = false
        if (s.startsWith('any:')) { mode = 'any'; s = s.slice(4) } else if (s.startsWith('first:')) { mode = 'first'; s = s.slice(6) }
        if (s.endsWith('?')) { opt = true; s = s.slice(0, -1) }
        let els = find(s)
        if (!els.length) { if (!opt) out.push(`thiếu ${s} (không có trong DOM hoặc đang ẩn)`); continue }
        if (mode === 'first') els = els.slice(0, 1)
        reqEls.push(...els)
        const probs = els.map(el => checkEl(el, F, cache))
        if (mode === 'any') {
          if (!probs.some(p => !p.length)) out.push(`không ${s} nào thấy trọn: ${probs[0].join('; ')}`)
        } else for (const p of probs) out.push(...p)
      }
      // nội dung tràn trong vùng cuộn con (chỉ khung chính: spec.inner là danh sách vùng)
      if (spec.inner) out.push(...innerOverflow(spec.inner, reqEls))
      if (spec.apart && spec.apart.length) out.push(...overlaps(spec.apart))
      // phần tử của cảnh không lấn khay (chỉ khi màn đã chia cảnh / khay: tab Quầy có --tray-h)
      const trayH = F.svc ? num(getComputedStyle(F.svc).getPropertyValue('--tray-h')) : 0
      if ((spec.scene || []).length && trayH > 0 && F.svc.getAttribute('data-tab') === 'counter') {
        const trayTop = F.tabTop - trayH
        for (const s of spec.scene) {
          for (const el of find(s)) {
            const r = el.getBoundingClientRect()
            if (r.bottom > trayTop + 0.5) out.push(`${nameOf(el)} (cảnh) lấn khay ${rd(r.bottom - trayTop)}px (đáy ${rd(r.bottom)} > đỉnh khay ${rd(trayTop)})`)
          }
        }
      }
      // hình đủ to để nhận ra
      for (const [sel, min] of spec.img || []) {
        const els = find(sel).filter(e => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight })
        const small = els.map(e => e.getBoundingClientRect()).filter(r => Math.min(r.width, r.height) < min - 0.5)
        if (small.length) {
          const m = small.reduce((a, r) => (Math.min(r.width, r.height) < Math.min(a.width, a.height) ? r : a))
          out.push(`hình ${sel} nhỏ: ${small.length}/${els.length} hình < ${min}px (nhỏ nhất ${rd(m.width)}×${rd(m.height)})`)
        }
      }
      // chữ đang thấy ≥ 13px, không chữ lỗi (màn Ca bán + lớp nổi; bỏ lớp hiệu ứng và chữ ẩn kiểu "chỉ cho máy đọc")
      const roots = [F.svc, document.querySelector('.overlay-root')].filter(Boolean)
      const seen = new Set()
      const texts = []
      for (const root of roots) {
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        while (w.nextNode()) {
          const t = w.currentNode
          const el = t.parentElement
          const txt = t.textContent.trim()
          if (!txt || !el || seen.has(el) || el.closest('svg') || el.closest('.vfx-layer')) continue
          seen.add(el)
          if (!shown(el)) continue
          const r = el.getBoundingClientRect()
          if (r.width < 3 || r.height < 3 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue
          const fs = parseFloat(getComputedStyle(el).fontSize)
          if (fs > 0 && fs < 12.95) texts.push(`chữ ${fs}px ở ${nameOf(el)}: "${txt.slice(0, 28)}"`)
          if (/undefined|NaN|\[object|\{\w+\}/.test(t.textContent)) texts.push(`chữ lỗi ở ${nameOf(el)}: "${txt.slice(0, 50)}"`)
        }
      }
      if (texts.length) out.push(`${texts.length} chữ < 13px / lỗi: ${texts.slice(0, 6).join('; ')}${texts.length > 6 ? '; …' : ''}`)
      // tràn ngang
      const ov = [document.documentElement.scrollWidth - innerWidth]
      for (const p of document.querySelectorAll('.panels > .panel, .k-main, .overlay-root [data-testid="order-sheet"]')) if (shown(p)) ov.push(p.scrollWidth - p.clientWidth)
      const over = Math.max(0, ...ov)
      if (over > 0.5) out.push(`tràn ngang ${rd(over)}px`)
      return { out, info: fitInfo(F) }
    },
    // Điểm chạm của phần tử đầu tiên khớp, KHÔNG cuộn: phần thấy đủ ≥ 44px (hoặc trọn phần tử) và tâm trúng chính nó.
    tapPoint(sel) {
      const F = frame()
      const el = find(sel)[0]
      if (!el) return { ok: false, why: 'không thấy' }
      const g = geo(el, F, new Map())
      const vw = g.v.right - g.v.left, vh = g.v.bottom - g.v.top
      const key = [g.r.left, g.r.top, g.r.width, g.r.height].map(rd).join(',')
      if (vw < Math.min(43.5, g.r.width - 0.5) || vh < Math.min(43.5, g.r.height - 0.5)) {
        return { ok: false, key, why: `chỉ thấy ${rd(Math.max(0, vw))}×${rd(Math.max(0, vh))}px (hộp y ${rd(g.r.top)}–${rd(g.r.bottom)}, vùng thấy y ${rd(g.t)}–${rd(g.b)})` }
      }
      const x = g.v.left + vw / 2, y = g.v.top + vh / 2
      const h = hitOk(el, x, y)
      if (!h.ok) return { ok: false, key, why: `tâm bị ${nameOf(h.e)} che` }
      return { ok: true, key, x, y }
    },
    // khóa bố cục của các phần tử cần (đứng yên khi hai lần đọc giống nhau)
    layoutKey(req) {
      const out = []
      for (const raw of req) {
        const s = raw.replace(/^(any|first):/, '').replace(/\?$/, '')
        let els = []
        try { els = [...document.querySelectorAll(toCss(s))] } catch { els = [] }
        for (const e of els.slice(0, 40)) { const r = e.getBoundingClientRect(); out.push(rd(r.top), rd(r.height), rd(r.left), rd(r.width)) }
      }
      for (const p of document.querySelectorAll('.panels > .panel, .k-main')) out.push(p.scrollTop)
      return out.join(',')
    }
  }
}

// ---------- Mở khung, ghi lỗi, đo ----------

function openFrame(fk, name, time) {
  const f = FRAMES[fk]
  return openGame({ clock: { time }, name: 'vua-man-' + name, viewport: { width: f.w, height: f.h }, initCss: frameCss(f) })
}

async function boot(g, state) {
  const { page } = g
  await seedSave(page, state)
  await page.addInitScript(installVm)
  await page.goto(g.url('/'))
  await page.waitForSelector(T('screen-service'), { timeout: 30000 })
  await resolveIncidentIfShown(g, { waitMs: 400 })
}

function recorder(fk, flow) {
  const list = []
  const seen = new Set()
  return {
    fk, F: FRAMES[fk], flow, list,
    add(msg) { if (!seen.has(msg)) { seen.add(msg); list.push(msg) } }
  }
}

// Chờ bố cục các phần tử cần đứng yên (hai lần đọc cách 120 ms giống nhau, tối đa ~3 giây).
async function settle(page, req) {
  let prev = ''
  for (let i = 0; i < 25; i++) {
    const k = await page.evaluate(r => window.__vm.layoutKey(r), req)
    if (k === prev) return
    prev = k
    await page.waitForTimeout(120)
  }
}

// Đo một trạng thái (không cuộn gì): ghi mọi chỗ chưa đạt vào R.
async function check(g, R, key, { wait = 400, need = null } = {}) {
  const { page } = g
  const N = need || NEED[key]
  const req = R.F.main ? N.main : N.small
  const img = R.F.main ? (N.img || []) : []
  const scene = R.F.main ? (N.scene || []) : []
  const inner = R.F.main ? INNER : null
  const apart = R.F.main ? (N.apart || []) : []
  await page.waitForTimeout(wait)
  await settle(page, req)
  const m = await page.evaluate(spec => window.__vm.audit(spec), { req, img, scene, inner, apart })
  for (const s of m.out) R.add(`${N.ten}: ${s}`)
  if (LOG) {
    const i = m.info
    console.log(`[vừa màn] ${R.fk} · ${N.ten}: fit=${i.fit || '-'} tab=${i.tab || '-'}${i.focus ? ' tập trung' : ''} cảnh=${i.scene || '-'} khay=${i.tray || '-'} HUD đáy ${i.hud} · tab đỉnh ${i.tabTop}` +
      (i.cuon && i.cuon.length ? ` · cuộn được: ${i.cuon.join(', ')}` : '') + ` · ${m.out.length} chỗ chưa đạt`)
  }
  await g.shot(key)
}

// Chạm như người chơi, KHÔNG cuộn: chờ phần tử đứng yên rồi chạm vào tọa độ đang thấy. Phải cuộn / bị che mới chạm được thì
// ghi lỗi rồi để Playwright tự cuộn cho luồng đi tiếp. Khung chính ghi mọi lần chạm (record); khung nhỏ được cuộn ngắn nên
// chỉ ghi lần chạm NÚT CHÍNH của khâu (chinh).
async function tap(g, R, sel, { record = true, chinh = false } = {}) {
  const { page } = g
  await page.waitForSelector(sel, { state: 'visible', timeout: 15000 })
  let p = null
  for (let i = 0; i < 15; i++) {
    const a = await page.evaluate(s => window.__vm.tapPoint(s), sel)
    if (p && a.key === p.key && a.ok === p.ok) { p = a; break }
    p = a
    await page.waitForTimeout(70)
  }
  if (p.ok) {
    await page.touchscreen.tap(p.x, p.y)
    return
  }
  if (record && R && (R.F.main || chinh)) R.add(`chạm ${sel} phải cuộn / bị che: ${p.why}`)
  await page.tap(sel)
}

// Dừng giờ trang ngay sau lúc này. Máy tải nặng: giữa lúc đọc giờ trang và lúc dừng có thể trôi quá `lead` ms, Playwright
// báo "Cannot fast-forward to the past" — đọc lại giờ và thử với khoảng dài hơn (không phải lỗi game).
async function pauseClock(page, lead = 60) {
  for (const extra of [0, 300, 1200]) {
    const t = await page.evaluate(() => Date.now())
    try {
      await page.clock.pauseAt(t + lead + extra)
      return
    } catch (e) {
      if (extra === 1200 || !/past/i.test(String(e && e.message))) throw e
    }
  }
}

function verdict(g, R) {
  const lines = [...R.list, ...g.errors.map(e => 'lỗi trang: ' + e)]
  if (lines.length) assert.fail(`${R.F.ten} · ${R.flow}: ${lines.length} chỗ chưa vừa màn\n  - ${lines.join('\n  - ')}`)
}

// ---------- Quầy ----------

async function waitOrder(page) {
  await page.waitForSelector(T('speech-bubble'), { timeout: 30000 })
  await page.waitForSelector(`${T('progress-4')}[data-stage="order"]`, { timeout: 10000 })
  await page.waitForSelector('[data-testid^="menu-item-"]', { timeout: 10000 })
}

// Ghi phiếu theo đơn; onFirstSheet chạy khi bảng chọn món của dòng đầu vừa mở (trước khi chọn).
async function writeOrder(g, R, request, { record = true, onFirstSheet = null } = {}) {
  const { page } = g
  for (const [i, line] of request.entries()) {
    await tap(g, R, T('menu-item-' + line.recipeId), { record })
    await page.waitForSelector(T('order-sheet'))
    if (i === 0 && onFirstSheet) await onFirstSheet()
    for (const n of line.notes || []) await tap(g, R, T('note-chip-' + n), { record })
    for (let q = 1; q < line.qty; q++) await tap(g, R, T('qty-plus'), { record })
    assert.equal(await page.textContent(T('qty-value')), String(line.qty))
    await tap(g, R, T('add-line'), { record, chinh: true })
    await page.waitForSelector(T('order-sheet'), { state: 'detached' })
  }
  for (let i = 0; i < request.length; i++) await page.waitForSelector(T('order-line-' + i))
}

// Đọc lại đơn: phiếu đúng thì "Chốt order" bật, khách không bắt lỗi.
async function readbackOk(g, R, { record = true } = {}) {
  const { page } = g
  await tap(g, R, T('readback'), { record, chinh: true })
  await page.waitForSelector(`${T('confirm-order')}:not([disabled])`, { timeout: 10000 })
  assert.equal(!!(await page.$(T('caught-list'))), false, 'phiếu đúng mà khách bắt lỗi')
}

async function typeTotal(g, R, total, { record = true } = {}) {
  const { page } = g
  await page.waitForSelector(`${T('progress-4')}[data-stage="thanh_toan"]`, { timeout: 10000 })
  await page.waitForSelector(T('report-total'))
  // con dấu "ĐÃ CHỐT" + phiếu bay (~0,6 giây) xong mới gõ
  await page.waitForTimeout(900)
  for (const d of String(total / 1000)) await tap(g, R, T('numpad-' + d), { record, chinh: true })
  assert.equal(Number(await page.getAttribute(T('numpad-display'), 'data-amount')), total)
}

async function cashFlow(g, R) {
  const { page } = g
  const sv = SAVES.cash
  await boot(g, sv.state)
  await waitOrder(page)
  await check(g, R, 'order', { wait: 900 })
  await writeOrder(g, R, sv.request, { onFirstSheet: () => check(g, R, 'sheet', { wait: 450 }) })
  await check(g, R, 'lines', { wait: 700 })
  await readbackOk(g, R)
  await check(g, R, 'readback', { wait: 900 })
  await tap(g, R, T('confirm-order'), { chinh: true })
  await typeTotal(g, R, sv.total)
  await check(g, R, 'pay', { wait: 300 })
  await cashAndReceipt(g, R, sv, { cash: 'cash', tray: 'tray', receipt: 'receipt' })
  await tap(g, R, T('clip-ticket'), { chinh: true })
  await page.waitForSelector('[data-testid^="rail-ticket-"]', { timeout: 10000 })
  await page.waitForSelector(T('counter-idle'), { timeout: 10000 })
  await check(g, R, 'idle', { wait: 1500 })
}

// Báo tổng → Tính tiền (khay trống) → lấy tiền thối ít tờ nhất theo két → Phiếu thu; keys: tên trạng thái trong NEED.
async function cashAndReceipt(g, R, sv, keys) {
  const { page } = g
  await tap(g, R, T('report-total'), { chinh: true })
  await page.waitForSelector(T('given-cash'), { timeout: 10000 })
  await check(g, R, keys.cash, { wait: 900 })
  // lấy tiền thối ra khay: ít tờ nhất theo két
  const given = Number(await page.getAttribute(T('given-cash'), 'data-amount'))
  const hint = await page.$(T('change-hint'))
  const due = hint ? Number(await hint.getAttribute('data-amount')) : given - sv.total
  const counts = {}
  for (const b of BILLS) counts[b] = Number(await page.getAttribute(T('drawer-' + b), 'data-count')) || 0
  const best = minBillsChange(due, counts)
  assert.ok(best, `két không thối được ${due}đ`)
  for (const b of Object.keys(best.bills).map(Number).sort((a, c) => c - a)) {
    for (let k = 0; k < best.bills[b]; k++) await tap(g, R, T('drawer-' + b), { chinh: true })
  }
  assert.equal(Number(await page.getAttribute(T('tray'), 'data-amount')), due)
  await check(g, R, keys.tray, { wait: 500 })
  await tap(g, R, T('give-change'), { chinh: true })
  await page.waitForSelector(T('receipt'), { timeout: 10000 })
  await page.waitForSelector(`${T('clip-ticket')}:not([disabled])`, { timeout: 10000 })
  await check(g, R, keys.receipt, { wait: 1300 })
}

// Mở bảng chọn món của một dòng phiếu (chạm dòng để sửa), bật thêm ghi chú / tăng số lượng, "Sửa dòng".
async function editLine(g, R, index, { notes = [], plus = 0, measure = null } = {}) {
  const { page } = g
  await tap(g, R, T('order-line-' + index))
  await page.waitForSelector(T('order-sheet'))
  if (measure) await measure()
  for (const n of notes) await tap(g, R, T('note-chip-' + n))
  for (let q = 0; q < plus; q++) await tap(g, R, T('qty-plus'))
  await tap(g, R, T('add-line'), { chinh: true })
  await page.waitForSelector(T('order-sheet'), { state: 'detached' })
}

// Đơn dài + khách bắt lỗi (thực đơn 8 món có 4 món hiếm, hàng khách đầy: khách ở quầy + 2 khách chờ): Order → bảng chọn món hiếm → phiếu ghi sai →
// đọc lại, khách bắt 3 lỗi → sửa 2 dòng (bảng sửa dòng), thêm món thiếu → đọc lại đúng → Thanh toán → Tính tiền → Phiếu thu.
async function caughtFlow(g, R) {
  const { page } = g
  const sv = SAVES.caught
  await boot(g, sv.state)
  await waitOrder(page)
  // hàng khách đầy: khách ở quầy + 2 khách chờ (tới ở giây +4, +7 của ca; hàng chờ tối đa 3 chỗ kể cả khách ở quầy — thêm
  // khách nữa thì khách đó bỏ đi vì hàng đầy); không đủ thì vẫn đo tiếp
  const qSel = '[data-testid="queue"] [data-testid^="queue-"]:not([data-testid="queue-more"])'
  await page.waitForFunction(s => document.querySelectorAll(s).length >= 3, qSel, { timeout: 20000 }).catch(() => {})
  if (LOG) console.log(`[vừa màn] ${R.fk} · hàng khách: ${await page.$$eval(qSel, l => l.length)} khách (kể cả khách ở quầy)`)
  await check(g, R, 'big', { wait: 900 })
  await writeOrder(g, R, WRONG_DRAFT, { onFirstSheet: () => check(g, R, 'sheet', { wait: 450, need: { ...NEED.sheet, ten: 'Bảng chọn món (món hiếm, 4 ghi chú)' } }) })
  await check(g, R, 'wrong', { wait: 700 })
  await tap(g, R, T('readback'), { chinh: true })
  await page.waitForSelector(T('caught-list'), { timeout: 10000 })
  assert.equal(await page.$$eval(`${T('caught-list')} li`, l => l.length), 3, 'khách bắt đủ 3 lỗi (hạt ngẫu nhiên chọn bằng lõi)')
  // lượt đọc sáng từng dòng + khách đáp xong
  await check(g, R, 'caught', { wait: 1500 })
  await editLine(g, R, 0, { notes: ['them_trung_cut'], measure: () => check(g, R, 'sheetEdit', { wait: 450 }) })
  await editLine(g, R, 1, { plus: 1 })
  await writeOrder(g, R, [LONG_REQUEST[2]])
  await page.waitForSelector(T('order-line-2'))
  await readbackOk(g, R)
  await check(g, R, 'fixed', { wait: 900 })
  await tap(g, R, T('confirm-order'), { chinh: true })
  await typeTotal(g, R, sv.total)
  await check(g, R, 'pay3', { wait: 300 })
  await cashAndReceipt(g, R, sv, { cash: 'cash3', tray: 'tray3', receipt: 'receipt3' })
}

async function qrFlow(g, R) {
  const { page } = g
  const sv = SAVES.qr
  await boot(g, sv.state)
  await waitOrder(page)
  // Order → Thanh toán đã đo ở luồng tiền mặt: chạm vẫn không cuộn nhưng không ghi lại lần nữa
  await writeOrder(g, R, sv.request, { record: false })
  await readbackOk(g, R, { record: false })
  await tap(g, R, T('confirm-order'), { record: false })
  await typeTotal(g, R, sv.total, { record: false })
  await tap(g, R, T('report-total'), { record: false })
  await page.waitForSelector(`${T('qr-status')}[data-arrived="false"]`, { timeout: 10000 })
  // dừng giờ trang để tiền chưa về lúc đo (hoạt ảnh CSS vẫn chạy theo giờ thật)
  await pauseClock(page)
  await check(g, R, 'qrWait', { wait: 1200 })
  await page.clock.resume()
  await page.waitForSelector(`${T('qr-status')}[data-arrived="true"]`, { timeout: 10000 })
  await check(g, R, 'qrIn', { wait: 1200 })
  await tap(g, R, T('qr-confirm'), { chinh: true })
  await page.waitForSelector(T('receipt'), { timeout: 10000 })
  await page.waitForSelector(`${T('clip-ticket')}:not([disabled])`, { timeout: 10000 })
  await check(g, R, 'receiptQr', { wait: 1300 })
}

async function scoreFlow(g, R) {
  const { page } = g
  const sv = SAVES.tip
  await boot(g, sv.state)
  await tap(g, R, T('tab-kitchen'), { record: false })
  await page.waitForSelector(T('panel-kitchen'), { state: 'visible' })
  const sel = `${T('serve-ticket')}[data-ticket-id="${sv.ticketId}"]`
  await page.waitForSelector(sel, { timeout: 10000 })
  await tap(g, R, sel)
  await page.waitForSelector(T('score-sheet'), { timeout: 8000 })
  // phiếu chấm đứng yên rồi mới đo (giờ trang dừng: phiếu không tự đóng lúc đo)
  await pauseClock(page)
  await check(g, R, 'score', { wait: 1600 })
}

// ---------- Bếp ----------

// Con dấu kết quả bước đã tắt: không còn step-result, lớp sân khấu của bếp đã ẩn.
async function stampGone(page) {
  await page.waitForFunction(() => {
    const r = document.querySelector('[data-testid="step-result"]')
    const layer = document.querySelector('[data-testid="kitchen"] .k-layer')
    return !(r && r.getClientRects().length) && !(layer && !layer.hidden)
  }, null, { timeout: 6000 }).catch(() => {})
  await page.waitForTimeout(300)
}

// Vừa chạm một bước trên Thớt: qua bảng chọn cách sơ chế / thẻ vào bước tới khi sân khấu dựng xong.
async function enterStage(g, R, def) {
  const { page } = g
  const stageSel = `${STAGE}[data-type="${def.type}"] .mg-foot`
  const done = { sheet: false, hint: false }
  for (let guard = 0; guard < 5; guard++) {
    const what = await (await page.waitForFunction(([st, sh, hi, dn]) => {
      const seen = e => !!e && e.getClientRects().length > 0
      if (!dn.sheet && seen(document.querySelector(sh))) return 'sheet'
      const hint = document.querySelector(hi + ':not(.is-leaving)')
      if (!dn.hint && seen(hint)) return 'hint'
      if (!hint && document.querySelector(st)) return 'stage'
      return ''
    }, [stageSel, T('step-sheet'), T('step-hint'), done], { timeout: 15000 })).jsonValue()
    if (what === 'stage') return
    if (what === 'sheet') {
      done.sheet = true
      await tap(g, R, def.method ? T('method-' + def.method.correct) : T('step-start'), { record: false })
    } else {
      done.hint = true
      await page.tap(T('step-hint'), { timeout: 2000 }).catch(() => {})
    }
  }
  await page.waitForSelector(stageSel, { timeout: 10000 })
}

async function kitchenFlow(g, R) {
  const { page } = g
  const sv = SAVES.cook
  await boot(g, sv.state)
  await tap(g, R, T('tab-kitchen'), { record: false })
  await page.waitForSelector(T('panel-kitchen'), { state: 'visible' })
  await page.waitForSelector('[data-testid^="ticket-p"]', { timeout: 10000 })
  await check(g, R, 'rail', { wait: 700 })
  if (!(await page.$('[data-testid^="cook-line-"]'))) await tap(g, R, `[data-testid="ticket-${sv.ticket.id}"]`, { chinh: true })
  await page.waitForSelector(T('cook-line-0'), { timeout: 5000 })
  await check(g, R, 'open', { wait: 600 })
  await tap(g, R, T('cook-line-0'), { chinh: true })
  await page.waitForSelector(`${STAGE}[data-type="chon"]`, { timeout: 10000 })
  await check(g, R, 'chon', { wait: 900 })
  const s = await readSave(page)
  const cook = s && s.shift && s.shift.cook
  assert.ok(cook, 'chưa có phiên nấu')
  const recipe = DATA.RECIPES[cook.recipeId]
  for (const id of requiredIngredients(recipe, cook.notes || []).required) await tap(g, R, T('shelf-' + id))
  await tap(g, R, T('chon-done'), { chinh: true })
  await page.waitForSelector(T('board'), { timeout: 10000 })
  await stampGone(page)
  await check(g, R, 'thot', { wait: 500 })
  // một sân khấu: bước Thái đang làm được (không có thì bước làm được đầu tiên)
  const stepId = await page.evaluate(() => {
    const av = [...document.querySelectorAll('[data-testid^="board-step-"].is-available')]
    const pick = av.find(e => e.dataset.type === 'thai') || av[0]
    return pick ? pick.dataset.stepId : null
  })
  assert.ok(stepId, 'Thớt không có bước làm được')
  const def = recipe.steps.find(x => x.id === stepId)
  await tap(g, R, T('board-step-' + stepId))
  await enterStage(g, R, def)
  // dừng giờ trang (trò có đồng hồ / kim chạy không tự kết thúc lúc đo)
  await page.waitForTimeout(350)
  await pauseClock(page)
  await check(g, R, 'stage', { wait: 700, need: stageNeed(def.type) })
}

// ---------- Kịch bản ----------

const FLOWS = [
  ['Quầy tiền mặt: Order → bảng chọn món → phiếu 2 dòng → đọc lại → Thanh toán → Tính tiền → Phiếu thu → quầy trống', 'tien-mat', COOK_OPEN_MS, cashFlow],
  ['Quầy chuyển khoản: chờ tiền về → tiền đã về → Phiếu thu', 'qr', COOK_OPEN_MS, qrFlow],
  ['Quầy đơn dài, khách bắt lỗi: thực đơn 8 món (4 món hiếm) → phiếu sai → khách bắt 3 lỗi → sửa → đọc lại → Thanh toán → Tính tiền → Phiếu thu 3 dòng', 'bat-loi', COOK_OPEN_MS, caughtFlow],
  ['Phiếu chấm có tip', 'phieu-cham', vn(TIP_AT) + 2 * 60 * 1000, scoreFlow],
  ['Bếp: dây phiếu → phiếu mở → Chọn → Thớt → sân khấu Thái', 'bep', COOK_OPEN_MS, kitchenFlow]
]

// VUA_MAN_LUONG=bat-loi,tien-mat (chỉ chạy các luồng này: tien-mat | qr | bat-loi | phieu-cham | bep)
const WANT_FLOWS = (process.env.VUA_MAN_LUONG || '').split(',').map(s => s.trim()).filter(Boolean)

describe('Vừa màn: mỗi khâu trong ca thao tác trọn một màn, không cuộn tay', { concurrency: 3 }, () => {
  for (const fk of FRAME_KEYS) {
    const f = FRAMES[fk]
    for (const [ten, name, time, run] of FLOWS.filter(x => !WANT_FLOWS.length || WANT_FLOWS.includes(x[1]))) {
      it(`${fk} ${f.main ? '(khung chính)' : '(khung nhỏ)'} · ${ten}: ${f.main ? 'mọi testid cần của khâu' : 'nút chính của khâu'} thấy trọn, chạm trúng, không bị che, chữ ≥ 13px, không tràn ngang${f.main ? ', không tràn trong vùng cuộn con' : ''}`, { timeout: 210000 }, async () => {
        const g = await openFrame(fk, name, time)
        const R = recorder(fk, ten)
        try {
          try {
            await run(g, R)
          } catch (e) {
            // luồng dừng giữa chừng: vẫn in các chỗ chưa vừa màn đã đo được tới lúc đó
            if (R.list.length && e && typeof e.message === 'string') {
              e.message += `\n  (trước khi luồng dừng đã ghi ${R.list.length} chỗ chưa vừa màn)\n  - ${R.list.join('\n  - ')}`
            }
            throw e
          }
          verdict(g, R)
        } finally {
          await g.close()
        }
      })
    }
  }
})
