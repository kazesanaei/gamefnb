// Cảnh quầy M5 Đợt 2 (thuần, import trong Node được): mặt trước xe đẩy bánh mì, mép mái bạt sọc, điện thoại của khách
// (khung để chèn QR giả), máy tính tiền có màn LED, ngăn kéo két 7 ngăn, máy in phiếu, kẹp phiếu gỗ, hũ tip; biểu tượng 64
// cho đồng xu tip, 4 khâu, 2 tab, HUD. Quy chuẩn vẽ như kit.js (viền mực INK dày 3, ba tông, ánh sáng trên-trái, không
// gradient / filter / clipPath / mask / <use> / href / url(). Mọi chữ, số (biển tên, màn LED, số tiền) là HTML đặt lên
// khung theo SCENE_META; không vẽ chữ trong hình.
//
// SCENE_META[id]: vb = [rộng, cao] của hình; các ô chữ nhật { x, y, w, h } và điểm mốc tính theo viewBox của hình. Đổi
// sang px: k = bề rộng khung / vb[0] (giữ đúng tỉ lệ, vd CSS aspect-ratio: vb[0] / vb[1]).
//   xe_mat_truoc: top = mép trên mặt quầy (bán thân khách đứng sau, chân hình khuất dưới mép này), sign = biển tên trống,
//     glass = tủ kính bên trái, open = [x0, x1] khoảng mặt quầy trống cho khách đứng;
//   mai_bat: stripe = bề rộng một sọc (lặp ngang được), edge = y thấp nhất của mép lượn;
//   dien_thoai: screen = màn hình, qr = chỗ đặt QR (tỉ lệ 100 × 118 như fakeQrSvg), note = dải dưới QR (số tiền HTML);
//   may_pos: led = màn LED (chèn số HTML), pad = mặt phím (phím trang trí; phím bấm thật là HTML), slot = khe giấy;
//   man_led: led = mặt LED của màn rời (khung số cho bàn phím tính tiền HTML);
//   ket_tien: slots = 7 ngăn theo mệnh giá tăng dần (5.000 → 500.000), front = mặt trước ngăn kéo;
//   may_in_phieu: slot = khe ra giấy { x, y, w } (phiếu HTML trượt ra từ đây);
//   kep_phieu: jaw = điểm kẹp (mép trên phiếu), hang = móc treo trên dây;
//   hu_tip: mouth = ellipse miệng hũ (đích xu bay vào).

import { INK, PAL, svg, ground, hilite, tone3, ball, crescent, polyD, r1, deepFreeze } from './kit.js'

// ---------- Hình học ----------

// Chữ nhật bo góc: d và các điểm mẫu dọc biên (để tính mảng tối / sáng lưỡi liềm bằng kit.crescent).
function rr(x, y, w, h, r) {
  const pts = []
  const k = 4
  const corners = [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]]
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= k; i++) {
      const a = ((a0 + (90 * i) / k) * Math.PI) / 180
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    }
  }
  const d = `M${r1(x + r)} ${r1(y)}H${r1(x + w - r)}Q${r1(x + w)} ${r1(y)} ${r1(x + w)} ${r1(y + r)}V${r1(y + h - r)}` +
    `Q${r1(x + w)} ${r1(y + h)} ${r1(x + w - r)} ${r1(y + h)}H${r1(x + r)}Q${r1(x)} ${r1(y + h)} ${r1(x)} ${r1(y + h - r)}` +
    `V${r1(y + r)}Q${r1(x)} ${r1(y)} ${r1(x + r)} ${r1(y)}Z`
  return { d, pts }
}

// Khối chữ nhật bo góc đủ ba tông: nền, lưỡi liềm tối dưới-phải (độ dày t), vệt sáng trên-trái.
function box(x, y, w, h, r, c, { t = 4, detail = '', shine = true, sw } = {}) {
  const b = rr(x, y, w, h, r)
  return tone3({
    outline: b.d, base: c[0], dark: c[1], shade: crescent(b.pts, t, t), detail, sw,
    shine: shine ? `<path d="M${r1(x + r * 0.6 + 2)} ${r1(y + h * 0.55)}V${r1(y + r + 1)}Q${r1(x + 2.6)} ${r1(y + 2.6)} ${r1(x + r + 2)} ${r1(y + 2.6)}H${r1(x + Math.min(w * 0.45, w - r - 2))}" fill="none" stroke="#fff" stroke-width="2.4" opacity=".45"/>` : ''
  })
}

// Ngôi sao 5 cánh: các đỉnh xen kẽ ngoài / trong.
function starPts(cx, cy, R, r, rot = 0) {
  const p = []
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + rot + i * 36) * Math.PI) / 180
    const q = i % 2 ? r : R
    p.push([cx + q * Math.cos(a), cy + q * Math.sin(a)])
  }
  return p
}

// Rút gọn chuỗi SVG (không đổi hình): bỏ số 0 đứng đầu và khoảng trắng trước dấu trừ trong dữ liệu path.
function tidy(s) {
  return s.replace(/ d="([^"]*)"/g, (m, d) => ' d="' + d.replace(/ -/g, '-').replace(/(^|[^\d.])0\.(\d)/g, '$1.$2') + '"')
}

const GOLD = ['#f7b928', '#d48f0a', '#ffe27a']
const TEAL = ['#4fb3a5', '#36887d', '#9fe0d6']
const STEEL = ['#dfe5ec', '#aebbc9', '#ffffff']
const DARK = ['#3d4250', '#2a2e38', '#6b7283']
const CREAM = ['#fffaf0', '#ead9b6', '#ffffff']
const WOOD = PAL.go
const RED = ['#e2453a', '#b8302a', '#ff8f7f']
const LED = '#1f3b2c'

// ---------- Mặt trước xe đẩy bánh mì ----------

// Ổ bánh mì nằm (trong tủ kính).
const loaf = (x, y, w = 34, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})">` +
  tone3({
    outline: `M${-w / 2} 0C${-w / 2} -6 ${-w / 4} -8.4 0 -8.4C${w / 4} -8.4 ${w / 2} -6 ${w / 2} 0C${w / 2} 4 ${w / 4} 5 0 5C${-w / 4} 5 ${-w / 2} 4 ${-w / 2} 0Z`,
    base: PAL.banh[0], dark: PAL.banh[1],
    shade: `M${-w / 2 + 1} 1.6C${-w / 4} 4.6 ${w / 4} 4.6 ${w / 2 - 0.6} 0C${w / 2} 4 ${w / 4} 5 0 5C${-w / 4} 5 ${-w / 2} 4 ${-w / 2 + 1} 1.6Z`,
    detail: `<path d="M${r1(-w / 4)} -2.6l3 -3.4M-1.6 -2.6l3 -3.4M${r1(w / 4 - 3)} -2.6l3 -3.4" fill="none" stroke="${PAL.banh[2]}" stroke-width="2"/>`,
    sw: 2.4
  }) + '</g>'

const CART_GLASS = { x: 10, y: 4, w: 112, h: 42 }
const xe_mat_truoc = svg(
  // Tủ kính bên trái: khung nhôm, khay bánh, mặt kính có vệt sáng.
  box(CART_GLASS.x, CART_GLASS.y, CART_GLASS.w, CART_GLASS.h, 6, STEEL, { t: 3, shine: false }) +
  `<rect x="16" y="10" width="100" height="32" rx="3" fill="#e9f6fb" stroke-width="2"/>` +
  `<path d="M18 36H114" stroke="${WOOD[1]}" stroke-width="3"/>` +
  loaf(42, 31, 36, -4) + loaf(78, 30, 36, 3) + loaf(60, 22, 30, 0) +
  `<path d="M24 14L36 38M44 14L50 26" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>` +
  `<rect x="16" y="10" width="100" height="32" rx="3" fill="#bfe6f5" opacity=".25" stroke="none"/>` +
  `<path d="M66 6V44" stroke="${STEEL[1]}" stroke-width="2"/>` +
  // Mặt quầy gỗ (gờ dày chạy suốt chiều ngang).
  box(3, 44, 354, 11, 5, [WOOD[2], WOOD[0]], { t: 3, shine: false }) +
  `<path d="M9 47.4H351" stroke="#fff" stroke-width="2" opacity=".55"/>` +
  // Thân quầy: ván gỗ dọc, viền đỏ, biển tên trống ở giữa.
  tone3({
    outline: 'M9 55H351V90C351 93 349 95 346 95H14C11 95 9 93 9 90Z', base: WOOD[0], dark: WOOD[1],
    shade: 'M9 87H351V90C351 93 349 95 346 95H14C11 95 9 93 9 90Z',
    detail: `<path d="M9 59.6H351" stroke="${RED[0]}" stroke-width="4"/>` +
      `<path d="M52 62V93M96 62V93M264 62V93M308 62V93" fill="none" stroke="${WOOD[1]}" stroke-width="2"/>` +
      `<path d="M30 70C34 69 37 71 40 70M74 78C78 77 81 79 84 78M282 72C286 71 289 73 292 72M326 80C330 79 333 81 336 80" fill="none" stroke="${WOOD[1]}" stroke-width="1.6" opacity=".7"/>`
  }) +
  box(118, 62, 124, 28, 6, CREAM, { t: 3, detail: `<rect x="123" y="66.6" width="114" height="19" rx="3" fill="none" stroke="${RED[0]}" stroke-width="1.75"/>` }) +
  `<circle cx="124" cy="68" r="1.6" fill="${INK}" stroke="none"/><circle cx="236" cy="68" r="1.6" fill="${INK}" stroke="none"/>` +
  `<circle cx="124" cy="84.4" r="1.6" fill="${INK}" stroke="none"/><circle cx="236" cy="84.4" r="1.6" fill="${INK}" stroke="none"/>`,
  [360, 96])

// ---------- Mép mái bạt sọc đỏ trắng (lượn sóng) ----------

const MAI_W = 360, STRIPE = 40
function maiBat() {
  let body = ''
  for (let i = 0; i < MAI_W / STRIPE; i++) {
    const x = i * STRIPE, red = i % 2 === 0
    const c = red ? RED : ['#fffaf0', '#ead9b6', '#ffffff']
    const d = `M${x} 0H${x + STRIPE}V24C${x + STRIPE} 34 ${x + STRIPE * 0.75} 38 ${x + STRIPE / 2} 38C${x + STRIPE * 0.25} 38 ${x} 34 ${x} 24Z`
    body += `<path d="${d}" fill="${c[0]}" stroke="none"/>` +
      `<path d="M${x} 24C${x} 34 ${x + STRIPE * 0.25} 38 ${x + STRIPE / 2} 38C${x + STRIPE * 0.75} 38 ${x + STRIPE} 34 ${x + STRIPE} 24V18C${x + STRIPE} 28 ${x + STRIPE * 0.75} 32 ${x + STRIPE / 2} 32C${x + STRIPE * 0.25} 32 ${x} 28 ${x} 18Z" fill="${c[1]}" stroke="none"/>` +
      `<path d="M${x + 6} 4V16" stroke="#fff" stroke-width="2.4" opacity="${red ? '.4' : '.8'}"/>`
  }
  let edge = 'M0 0'
  for (let i = 0; i < MAI_W / STRIPE; i++) {
    const x = i * STRIPE
    edge += `V24C${x} 34 ${x + STRIPE * 0.25} 38 ${x + STRIPE / 2} 38C${x + STRIPE * 0.75} 38 ${x + STRIPE} 34 ${x + STRIPE} 24`
  }
  return svg(body + `<path d="M0 6H${MAI_W}" stroke="${INK}" stroke-width="2" opacity=".25"/>` + `<path d="${edge}V0" fill="none"/>`, [MAI_W, 40])
}
const mai_bat = maiBat()

// ---------- Điện thoại của khách (bàn tay cầm, màn hình trống để chèn QR giả) ----------

const PHONE = { x: 16, y: 6, w: 88, h: 170 }
const SCREEN = { x: 24, y: 22, w: 72, h: 138 }
const QR = { x: 28, y: 42, w: 64, h: 75.5 }
const phoneBody = () =>
  box(PHONE.x, PHONE.y, PHONE.w, PHONE.h, 14, DARK, { t: 4, shine: false }) +
  `<rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="6" fill="#fffdf6" stroke-width="2"/>` +
  `<rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="14" rx="6" fill="${TEAL[0]}" stroke="none"/>` +
  `<path d="M${SCREEN.x} 31H${SCREEN.x + SCREEN.w}" stroke="${TEAL[0]}" stroke-width="6"/>` +
  `<path d="M${SCREEN.x + 6} 28H${SCREEN.x + 30}" stroke="#fff" stroke-width="3" opacity=".9"/>` +
  `<rect x="47" y="11" width="26" height="5" rx="2.5" fill="#1a1d24" stroke="none"/>` +
  `<rect x="34" y="128" width="52" height="22" rx="5" fill="${TEAL[2]}" opacity=".45" stroke="none"/>` +
  `<path d="M104 46V64M104 72V82" stroke-width="3.4"/>` +
  `<path d="M26 20L40 8" stroke="#fff" stroke-width="2" opacity=".35"/>`
// Bàn tay giữ máy: lòng bàn tay sau máy (đáy), ngón cái đè mép trái, ba đầu ngón vòng qua mép phải.
const SKN = PAL.da_tay
const handBack = tone3({
  outline: 'M22 196C24 184 38 174 58 174H86C100 176 110 186 112 196Z', base: SKN[0], dark: SKN[1],
  shade: 'M96 177C104 181 110 188 112 196H102C101 189 99 182 96 177Z'
})
const handFront = tone3({
  outline: 'M6 196C4 180 8 162 16 150C20 144 27 145 28.6 151C30 157 28.6 166 30.4 176L33 196Z', base: SKN[0], dark: SKN[1],
  shade: 'M27.6 148C29.6 154 28.6 165 30.4 176L33 196H26.6C25 184 25.4 170 25.6 160C25.8 155 26.6 151 27.6 148Z',
  shine: hilite(15, 162, 2.4, 5, 0.45, 20)
}) + [138, 152, 166].map(y => `<path d="M100 ${y}C108 ${y - 1} 113 ${y + 2} 113 ${y + 6}C113 ${y + 10} 108 ${y + 12} 100 ${y + 11}" fill="${SKN[0]}" stroke-width="2.4"/>`).join('')
const dien_thoai = svg(handBack + phoneBody() + handFront, [120, 196])

/**
 * Điện thoại của khách có QR giả trong màn hình: qrSvg là chuỗi SVG (vd fakeQrSvg(n) của art.js, truyền vào để tệp này
 * không import art.js). Chuỗi không phải SVG hoặc có phần tử cấm thì trả hình điện thoại trống. Thuần.
 */
export function phoneQr(qrSvg) {
  const q = typeof qrSvg === 'string' ? qrSvg.trim() : ''
  const m = /^<svg\b[^>]*viewBox="0 0 ([\d.]+) ([\d.]+)"[^>]*>([\s\S]*)<\/svg>$/.exec(q)
  if (!m || /url\(|href|<use\b|<image\b|<script|<svg\b|base64|\bon\w+=/i.test(m[3])) return SCENE.dien_thoai
  // Đặt QR trong nhóm dời + co (không lồng <svg>: CSS kiểu "svg { width: 100% }" của trang sẽ kéo giãn svg lồng);
  // nhóm nằm NGOÀI nhóm viền mực để các phần tử của QR không kế thừa nét viền.
  const k = Math.min(QR.w / Number(m[1]), QR.h / Number(m[2]))
  return SCENE.dien_thoai.replace(/<\/svg>$/, `<g transform="translate(${QR.x} ${QR.y}) scale(${String(Math.round(k * 100) / 100).replace(/^0\./, '.')})">${m[3]}</g></svg>`)
}

// ---------- Máy tính tiền có màn LED ----------

const POS_LED = { x: 64, y: 14, w: 92, h: 22 }
const POS_PAD = { x: 30, y: 66, w: 160, h: 36 }
// Hàng phím trang trí trên mặt phím (3 hàng × 7 phím; cột cuối màu): chỉ để máy trông như máy tính tiền, phím bấm thật là HTML.
function posKeys() {
  let cream = '', color = ''
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 7; c++) {
      const d = `M${r1(36 + c * 21.4)} ${70 + r * 10}h17v7h-17Z`
      if (c === 6) color += d; else cream += d
    }
  }
  return `<path d="${cream}" fill="${CREAM[0]}" stroke-width="1.6"/><path d="${color}" fill="${RED[0]}" stroke-width="1.6"/>`
}
const may_pos = svg(
  ground(110, 134, 100, 5) +
  // Phiếu giấy thò lên từ khe bên phải (mép răng cưa).
  `<path d="M170 58V30L173.4 26.6L176.8 30L180.2 26.6L183.6 30L187 26.6L190.4 30L193.8 26.6L194 58Z" fill="${CREAM[0]}" stroke-width="2.4"/>` +
  `<path d="M174.4 36H189.6M174.4 42H185" stroke="${CREAM[1]}" stroke-width="2"/>` +
  // Cột và hộp màn LED.
  `<rect x="100" y="40" width="20" height="16" fill="${DARK[1]}" stroke-width="2.6"/>` +
  box(52, 4, 116, 42, 9, DARK, { t: 3, shine: false }) +
  `<rect x="${POS_LED.x}" y="${POS_LED.y}" width="${POS_LED.w}" height="${POS_LED.h}" rx="4" fill="${LED}" stroke-width="2.2"/>` +
  `<path d="M${POS_LED.x + 4} ${POS_LED.y + 4}H${POS_LED.x + 28}" stroke="#fff" stroke-width="2" opacity=".25"/>` +
  `<circle cx="160" cy="38" r="2.2" fill="#8edb6a" stroke-width="1.4"/>` +
  // Thân máy: mặt phím nghiêng, ngăn kéo đáy.
  tone3({
    outline: 'M26 54H194C200 54 203 57 204 62L212 112H8L16 62C17 57 20 54 26 54Z', base: TEAL[0], dark: TEAL[1],
    shade: 'M196 54.6C200.6 55.6 203.2 58 204 62L212 112H200Z',
    shine: '<path d="M22 66L25 58.6C25.6 57 26.6 56.6 28.4 56.6H96" fill="none" stroke="#fff" stroke-width="2.6" opacity=".5"/>'
  }) +
  `<rect x="166" y="56" width="32" height="5" rx="2.5" fill="#15171c" stroke-width="2"/>` +
  box(POS_PAD.x, POS_PAD.y, POS_PAD.w, POS_PAD.h, 6, [TEAL[2], '#7ccbbf'], { t: 2.6, shine: false }) +
  posKeys() +
  [[16, 70], [16, 84], [197, 70], [197, 84]].map(([x, y]) => `<rect x="${x - 6}" y="${y}" width="12" height="9" rx="2.6" fill="${CREAM[0]}" stroke-width="2"/>`).join('') +
  box(4, 110, 212, 22, 5, [CREAM[0], CREAM[1]], {
    t: 3, shine: false,
    detail: `<rect x="92" y="117" width="36" height="7" rx="3.5" fill="${DARK[0]}" stroke-width="2"/><path d="M98 119.6H112" stroke="#fff" stroke-width="1.6" opacity=".5"/>`
  }),
  [220, 140])

// Màn LED rời (khung số của bàn phím tính tiền): viền máy tối, mặt LED xanh đậm, vệt sáng kính.
const LED_PANEL = { x: 16, y: 13, w: 208, h: 38 }
const man_led = svg(
  box(4, 4, 232, 56, 12, DARK, { t: 3.4, shine: false }) +
  `<rect x="${LED_PANEL.x}" y="${LED_PANEL.y}" width="${LED_PANEL.w}" height="${LED_PANEL.h}" rx="6" fill="${LED}" stroke-width="2.4"/>` +
  `<path d="M22 19H70" stroke="#fff" stroke-width="2.4" opacity=".25"/><path d="M12 9.6H60" stroke="#fff" stroke-width="2" opacity=".2"/>` +
  `<circle cx="229" cy="54" r="2" fill="#8edb6a" stroke-width="1.2"/>`,
  [240, 64])

// ---------- Ngăn kéo két tiền: 7 ngăn (4 trên, 3 dưới) ----------

const KET_SLOTS = []
for (let i = 0; i < 4; i++) KET_SLOTS.push({ x: 18 + i * 72, y: 16, w: 68, h: 50 })
for (let i = 0; i < 3; i++) KET_SLOTS.push({ x: 18 + i * 96, y: 72, w: 92, h: 50 })
const ket_tien = svg(
  ground(160, 146, 150, 4) +
  box(4, 4, 312, 126, 10, DARK, { t: 4, shine: false }) +
  `<rect x="12" y="10" width="296" height="116" rx="6" fill="${STEEL[1]}" stroke-width="2.4"/>` +
  KET_SLOTS.map(s => `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="4" fill="${STEEL[0]}" stroke-width="2.2"/>` +
    `<path d="M${s.x + 3} ${s.y + s.h - 4}H${s.x + s.w - 3}" stroke="${STEEL[1]}" stroke-width="2.6"/>` +
    `<path d="M${s.x + 4} ${s.y + 4}V${s.y + s.h - 8}" stroke="#fff" stroke-width="2" opacity=".7"/>` +
    `<rect x="${s.x + s.w / 2 - 9}" y="${s.y - 3}" width="18" height="9" rx="2" fill="${DARK[2]}" stroke-width="1.8"/>`).join('') +
  // Mặt trước ngăn kéo: tay nắm, ổ khóa.
  box(0, 124, 320, 20, 6, DARK, {
    t: 3, shine: false,
    detail: `<rect x="132" y="129" width="56" height="9" rx="4.5" fill="${STEEL[0]}" stroke-width="2"/><path d="M138 131.4H160" stroke="#fff" stroke-width="1.6" opacity=".8"/>` +
      `<circle cx="292" cy="134" r="4" fill="${GOLD[0]}" stroke-width="1.8"/><path d="M292 133V136" stroke-width="1.4"/>`
  }) + `<path d="M8 127.6H120" stroke="#fff" stroke-width="2" opacity=".25"/>`,
  [320, 150])

// ---------- Máy in phiếu ----------

const PRINT_SLOT = { x: 34, y: 30, w: 92 }
const may_in_phieu = svg(
  ground(80, 92, 70, 4) +
  // Phiếu thò ra khỏi khe (mép răng cưa trên).
  `<path d="M40 31V12L44 8L48 12L52 8L56 12L60 8L64 12L68 8L72 12L76 8L80 12L84 8L88 12L92 8L96 12L100 8L104 12L108 8L112 12L116 8L120 12V31Z" fill="${CREAM[0]}" stroke-width="2.4"/>` +
  `<path d="M50 18H96M50 24H84" stroke="${CREAM[1]}" stroke-width="2.4"/>` +
  box(10, 28, 140, 62, 12, DARK, { t: 4, shine: false }) +
  `<path d="M18 40C18 34 22 32 28 32H132C138 32 142 34 142 40" fill="none" stroke="${DARK[2]}" stroke-width="3"/>` +
  `<rect x="${PRINT_SLOT.x}" y="${PRINT_SLOT.y - 1}" width="${PRINT_SLOT.w}" height="6" rx="3" fill="#15171c" stroke-width="2"/>` +
  `<rect x="24" y="52" width="112" height="26" rx="6" fill="${DARK[2]}" stroke-width="2"/>` +
  `<circle cx="36" cy="65" r="4" fill="#8edb6a" stroke-width="1.8"/>` + hilite(35, 63.6, 1.4, 1, 0.8) +
  `<rect x="98" y="59.6" width="28" height="11" rx="5.5" fill="${RED[0]}" stroke-width="2"/><path d="M103 62.6H112" stroke="#fff" stroke-width="1.6" opacity=".6"/>` +
  `<path d="M18 46L26 38" stroke="#fff" stroke-width="2.4" opacity=".3"/>`,
  [160, 96])

// ---------- Kẹp phiếu gỗ (kẹp phơi, treo trên dây phiếu) ----------

const kep_phieu = svg(
  tone3({
    outline: 'M9 4H23C25 4 26 5.4 25.6 7.4L22 38H10L6.4 7.4C6 5.4 7 4 9 4Z', base: WOOD[0], dark: WOOD[1],
    shade: 'M19.4 4.6L23 4C25 4 26 5.4 25.6 7.4L22 38H18.4Z',
    shine: '<path d="M10.4 9V30" stroke="#fff" stroke-width="2.2" opacity=".5"/>'
  }) +
  `<rect x="5" y="22" width="22" height="8" rx="4" fill="${STEEL[0]}" stroke-width="2.2"/><path d="M9 26H23" stroke="${STEEL[1]}" stroke-width="2"/>` +
  tone3({
    outline: 'M10 36H22L20.6 64C20.4 67 19 68 16 68C13 68 11.6 67 11.4 64Z', base: WOOD[0], dark: WOOD[1],
    shade: 'M18 36H22L20.6 64C20.4 67 19 68 16 68Z',
    detail: '<path d="M16 37V60" fill="none" stroke-width="1.75"/>'
  }),
  [32, 72])

// ---------- Hũ tip thủy tinh (xu bên trong, nhãn trái tim) ----------

const TIP_MOUTH = { cx: 40, cy: 18, rx: 24, ry: 5 }
const coin = (x, y, rot = 0) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="4" fill="${GOLD[0]}" stroke-width="1.8"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}/>`
const hu_tip = svg(
  ground(40, 92, 30, 3.6) +
  `<path d="M14 26C14 22 16 20 20 20H60C64 20 66 22 66 26V82C66 88 62 92 56 92H24C18 92 14 88 14 82Z" fill="#e3f4fb" stroke="none"/>` +
  coin(26, 84) + coin(40, 85, 8) + coin(54, 84, -6) + coin(32, 77, -12) + coin(48, 77, 10) + coin(40, 70) + coin(28, 69, 14) + coin(52, 70, -10) +
  `<path d="M18 30V80" stroke="#fff" stroke-width="3" opacity=".75"/><path d="M60 34V78" stroke="#a7d6ec" stroke-width="3"/>` +
  `<path d="M14 26C14 22 16 20 20 20H60C64 20 66 22 66 26V82C66 88 62 92 56 92H24C18 92 14 88 14 82Z" fill="none"/>` +
  `<path d="M26 40H54V58H26Z" fill="${CREAM[0]}" stroke-width="2"/>` +
  `<path d="M40 54C33 49 32 45.6 34.6 44C36.6 42.8 39 44 40 46C41 44 43.4 42.8 45.4 44C48 45.6 47 49 40 54Z" fill="${RED[0]}" stroke-width="1.6"/>` +
  `<ellipse cx="${TIP_MOUTH.cx}" cy="${TIP_MOUTH.cy}" rx="${TIP_MOUTH.rx + 3}" ry="${TIP_MOUTH.ry + 2}" fill="${STEEL[0]}" stroke-width="2.6"/>` +
  `<ellipse cx="${TIP_MOUTH.cx}" cy="${TIP_MOUTH.cy}" rx="${TIP_MOUTH.rx - 2}" ry="${TIP_MOUTH.ry - 1}" fill="#a7d6ec" stroke-width="2"/>` +
  coin(46, 13, -20) + `<ellipse cx="44.6" cy="12" rx="2.4" ry="1.2" fill="#fff" opacity=".7" stroke="none"/>`,
  [80, 96])

// ---------- Biểu tượng 64 ----------

// Đồng xu tip: vành vàng dày, mặt trong nổi, ngôi sao giữa.
const dong_xu = svg(
  ground(32, 58, 18, 3) +
  `<ellipse cx="32" cy="34.6" rx="22" ry="22" fill="${GOLD[1]}"/>` +
  ball(32, 31, 22, 22, GOLD, { shine: false, k: 0.18 }) +
  `<circle cx="32" cy="31" r="15.4" fill="#ffd84a" stroke="${GOLD[1]}" stroke-width="2"/>` +
  `<path d="${polyD(starPts(32, 31.6, 10, 4.4))}" fill="${GOLD[0]}" stroke="${GOLD[1]}" stroke-width="1.75"/>` +
  `<path d="M16 26C17.6 19 22.6 14 29 12.6" fill="none" stroke="#fff" stroke-width="2.6" opacity=".6"/>` +
  hilite(28.6, 26, 2, 1.2, 0.8))

// Ngôi sao HUD: năm cánh, mỗi cánh chia mặt sáng / mặt tối (kiểu đá quý), vệt sáng trên-trái.
function starIcon() {
  const P = starPts(32, 33, 27, 12)
  let facets = ''
  for (let i = 0; i < 10; i += 2) {
    const tip = P[i], next = P[(i + 1) % 10]
    facets += `M32 33L${r1(tip[0])} ${r1(tip[1])}L${r1(next[0])} ${r1(next[1])}Z`
  }
  return svg(ground(32, 59, 20, 3) + `<path d="${polyD(P)}" fill="#ffd23f"/>` +
    `<path d="${facets}" fill="#f4b416" stroke="none"/>` +
    `<path d="${polyD(P)}" fill="none"/>` + hilite(24.6, 22, 3.4, 2, 0.75, -30) +
    `<path d="M32 13.6L28.6 23" stroke="#fff" stroke-width="2" opacity=".6"/>`)
}
const hud_sao = starIcon()

// Ví HUD: ví da nâu, tờ tiền (không chữ) ló ra, nắp có nút bấm vàng.
const hud_vi = svg(
  ground(32, 58, 24, 3) +
  `<path d="M14 16H44V30H14Z" fill="#9fd88a" stroke-width="2.4"/><path d="M14 16H44V30H14Z" fill="#8fd07a" stroke="none" transform="translate(4 -4)"/>` +
  `<path d="M18 12H48V26" fill="none" stroke-width="2.4"/><circle cx="33" cy="19" r="3.6" fill="none" stroke="#4f9a3c" stroke-width="1.75"/>` +
  box(6, 20, 52, 34, 7, ['#b06a3a', '#8a4c25'], { t: 3.4 }) +
  `<path d="M34 28H58V46H34C30.6 46 28 43.4 28 40V34C28 30.6 30.6 28 34 28Z" fill="#94552d" stroke-width="2.6"/>` +
  `<circle cx="36" cy="37" r="3.6" fill="${GOLD[0]}" stroke-width="2"/>` + hilite(35, 35.8, 1.2, 0.8, 0.8) +
  `<path d="M12 49H24" stroke="#d68a52" stroke-width="2" opacity=".8"/>`)

// Đồng hồ HUD: mặt trắng, vành đỏ cà chua, hai chuông nhỏ, kim chỉ 10 giờ 10.
const hud_gio = svg(
  ground(32, 59, 18, 3) +
  `<path d="M20 52L15 58M44 52L49 58" stroke-width="3.4"/>` +
  ball(14.6, 13.6, 6.6, 6.6, GOLD, { shine: false }) + ball(49.4, 13.6, 6.6, 6.6, GOLD, { shine: false }) +
  ball(32, 34, 22, 22, RED, { shine: false, k: 0.2 }) +
  `<circle cx="32" cy="34" r="16.4" fill="#fffaf0" stroke-width="2.2"/>` +
  `<path d="M32 21V24M32 44V47M19 34H22M42 34H45" stroke-width="2"/>` +
  `<path d="M32 34L25.6 28.4M32 34L39.4 27" stroke-width="3"/><circle cx="32" cy="34" r="2.4" fill="${INK}" stroke="none"/>` +
  `<path d="M14.6 25C16.4 19.6 20.6 15.6 26 14" fill="none" stroke="#fff" stroke-width="2.4" opacity=".55"/>`)

// Khâu Order: sổ order gáy lò xo, dòng kẻ, cây bút chì chéo.
const khau_order = svg(
  ground(32, 58, 22, 3) +
  box(10, 10, 40, 46, 5, CREAM, { t: 3 }) +
  `<path d="M16 26H44M16 33H44M16 40H38M16 47H32" stroke="${CREAM[1]}" stroke-width="2.2"/>` +
  `<path d="M16 19.4H32" stroke="${RED[0]}" stroke-width="3"/>` +
  [17, 25, 33, 41].map(x => `<path d="M${x} 13V6.6C${x} 4 ${x + 4} 4 ${x + 4} 6.6V10" fill="none" stroke="${STEEL[1]}" stroke-width="2.4"/>`).join('') +
  `<g transform="rotate(38 46 40)">` +
  `<path d="M40 22H52V50H40Z" fill="${GOLD[0]}" stroke-width="2.4"/><path d="M48 22.6V49.4" stroke="${GOLD[1]}" stroke-width="2.6"/>` +
  `<path d="M40 50H52L46 60Z" fill="#f6d09c" stroke-width="2.4"/><path d="M44.4 56.4L46 60L47.6 56.4Z" fill="${INK}" stroke="none"/>` +
  `<path d="M40 16C40 13.8 41.6 12 44 12H48C50.4 12 52 13.8 52 16V22H40Z" fill="#f49ab0" stroke-width="2.4"/>` +
  `<path d="M42.4 26V46" stroke="#fff" stroke-width="1.8" opacity=".6"/></g>`)

// Khâu Thanh toán: máy tính tiền nhỏ có màn LED và phím.
const khau_thanh_toan = svg(
  ground(32, 58, 23, 3) +
  box(8, 8, 48, 48, 7, TEAL, { t: 3.4 }) +
  `<rect x="14" y="14" width="36" height="12" rx="3" fill="${LED}" stroke-width="2"/><path d="M34 20.6H46" stroke="#8edb6a" stroke-width="3"/>` +
  [0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${15 + c * 12}" y="${31 + r * 8}" width="9" height="5.6" rx="1.8" fill="${c === 2 && r === 2 ? RED[0] : CREAM[0]}" stroke-width="1.6"/>`).join('')).join(''))

// Khâu Tính tiền: ngăn kéo két mở, tiền giấy (không chữ) và xu.
const khau_tinh_tien = svg(
  ground(32, 58, 26, 3) +
  `<path d="M12 22H24V36H12Z" fill="#9fcdf0" stroke-width="2"/><path d="M25 20H37V36H25Z" fill="#f3b3cc" stroke-width="2"/><path d="M38 22H50V36H38Z" fill="#b3dca6" stroke-width="2"/>` +
  `<path d="M15 26H21M28 24H34M41 26H47" stroke="#fff" stroke-width="1.6" opacity=".8"/>` +
  tone3({
    outline: 'M6 32H58L54 54H10Z', base: DARK[0], dark: DARK[1], shade: 'M50 32H58L54 54H47Z',
    detail: `<rect x="24" y="40" width="16" height="5" rx="2.5" fill="${STEEL[0]}" stroke-width="1.75"/>`,
    shine: '<path d="M11 36H28" stroke="#fff" stroke-width="2" opacity=".3"/>'
  }) +
  ball(50, 18, 7, 7, GOLD, { shine: false }) + `<circle cx="50" cy="18" r="3.4" fill="none" stroke="${GOLD[1]}" stroke-width="1.6"/>` + hilite(47.6, 15.6, 1.6, 1, 0.8))

// Chảo chống dính nhìn chéo: lòng chảo, vành, cán gỗ.
const panBody = (egg) =>
  `<path d="M44 36L60 30" stroke-width="7.4"/><path d="M44 36L60 30" stroke="${WOOD[1]}" stroke-width="4"/>` +
  `<ellipse cx="26" cy="40" rx="23" ry="12.6" fill="${DARK[1]}"/>` +
  `<ellipse cx="26" cy="37" rx="23" ry="12" fill="${DARK[0]}"/>` +
  `<ellipse cx="26" cy="37.6" rx="18" ry="8.6" fill="#555b6b" stroke-width="2"/>` +
  `<path d="M12 33C15 30 20 28.6 25 28.4" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/>` + egg
const fried = `<path d="M15 38C14 33 20 31 25 32C30 30 37 32 37 36.6C38 41 32 43.6 26 43C19 43.6 15.4 41.6 15 38Z" fill="#fffaf0" stroke-width="1.8"/>` +
  `<ellipse cx="26" cy="37" rx="5" ry="3.6" fill="#f6b21a" stroke-width="1.6"/>` + hilite(24.4, 35.8, 1.6, 1, 0.8)
const khau_lam_do = svg(ground(30, 56, 24, 3) + `<g transform="translate(0 4)">${panBody(fried)}</g>` +
  `<path d="M40 14C38 10 42 8 40 4M47 16C45 12 49 10 47 6" fill="none" stroke="${STEEL[1]}" stroke-width="2"/>`)

// Tab Bếp: chảo trên ngọn lửa, hơi nóng bốc lên.
const tab_bep = svg(ground(30, 58, 22, 3) +
  `<path d="M14 54C12 48 16 45 17 41C19 45 20 46 21 44C22 48 25 47 26 42C28 46 31 47 32 44C34 48 37 46 38 41C40 45 43 48 40 54Z" fill="#f28a1e" stroke-width="2.2"/>` +
  `<path d="M20 54C19.6 51 22 50 23 48C24 50.6 26 51 27 49C28 51 31 51 32 48C33 51 34 52 33.4 54Z" fill="#ffd84a" stroke="none"/>` +
  `<g transform="translate(0 -6)">${panBody('')}</g>` +
  `<path d="M18 18C16 14 20 12 18 8M26 16C24 12 28 10 26 6M34 18C32 14 36 12 34 8" fill="none" stroke="${STEEL[1]}" stroke-width="2.2"/>`)

// Tab Quầy: xe đẩy mini có mái sọc, tủ kính, bánh xe.
const tab_quay = svg(
  ground(32, 58, 26, 3) +
  `<path d="M12 22V44M52 22V44" stroke="${STEEL[1]}" stroke-width="2.6"/>` +
  `<path d="M6 12C6 9 8 8 10 8H54C56 8 58 9 58 12V20H6Z" fill="#fffaf0"/>` +
  `<path d="M14 8H22V20H14ZM30 8H38V20H30ZM46 8H54V20H46Z" fill="${RED[0]}" stroke="none"/>` +
  `<path d="M6 12C6 9 8 8 10 8H54C56 8 58 9 58 12V20H6Z" fill="none"/>` +
  `<path d="M6 20C6 24 10 25 12 22C14 25 18 25 20 22C22 25 26 25 28 22C30 25 34 25 36 22C38 25 42 25 44 22C46 25 50 25 52 22C54 25 58 24 58 20Z" fill="${RED[0]}" stroke-width="2.4"/>` +
  `<rect x="14" y="30" width="22" height="12" rx="2" fill="#e9f6fb" stroke-width="2"/><path d="M18 39C18 36 21 35 25 35C29 35 32 36 32 39Z" fill="${PAL.banh[0]}" stroke-width="1.6"/>` +
  `<path d="M17 32L21 36" stroke="#fff" stroke-width="1.6"/>` +
  box(8, 42, 48, 10, 3, WOOD, { t: 2.4, shine: false }) +
  ball(18, 54, 4.6, 4.6, DARK, { shine: false }) + ball(46, 54, 4.6, 4.6, DARK, { shine: false }) +
  `<path d="M56 46L62 40" stroke-width="3"/>`)

// ---------- Bảng xuất ----------

const RAW = {
  xe_mat_truoc, mai_bat, dien_thoai, may_pos, man_led, ket_tien, may_in_phieu, kep_phieu, hu_tip
}
const RAW_ICONS = {
  dong_xu, hud_vi, hud_sao, hud_gio, khau_order, khau_thanh_toan, khau_tinh_tien, khau_lam_do, tab_quay, tab_bep
}

/** Hình cảnh lớn (viewBox riêng ghi trong SCENE_META). */
export const SCENE = deepFreeze(Object.fromEntries(Object.entries(RAW).map(([k, v]) => [k, tidy(v)])))
/** Biểu tượng 64 (viewBox 0 0 64 64): đồng xu tip, HUD, 4 khâu, 2 tab. */
export const SCENE_ICONS = deepFreeze(Object.fromEntries(Object.entries(RAW_ICONS).map(([k, v]) => [k, tidy(v)])))

/** Khâu (BALANCE.stageFlow) → id biểu tượng; tab → id biểu tượng. */
export const STAGE_ICONS = deepFreeze({ order: 'khau_order', thanh_toan: 'khau_thanh_toan', tinh_tien: 'khau_tinh_tien', lam_do: 'khau_lam_do' })
export const TAB_ICONS = deepFreeze({ counter: 'tab_quay', kitchen: 'tab_bep' })
export const HUD_ICONS = deepFreeze({ money: 'hud_vi', stars: 'hud_sao', time: 'hud_gio', tip: 'dong_xu' })

export const SCENE_META = deepFreeze({
  xe_mat_truoc: { vb: [360, 96], top: 44, sign: { x: 123, y: 66.6, w: 114, h: 19 }, glass: CART_GLASS, open: [128, 356] },
  mai_bat: { vb: [MAI_W, 40], stripe: STRIPE, edge: 38 },
  dien_thoai: { vb: [120, 196], screen: SCREEN, qr: QR, note: { x: 34, y: 128, w: 52, h: 22 } },
  may_pos: { vb: [220, 140], led: POS_LED, pad: POS_PAD, slot: { x: 166, y: 56, w: 32 } },
  man_led: { vb: [240, 64], led: LED_PANEL },
  ket_tien: { vb: [320, 150], slots: KET_SLOTS, front: { x: 0, y: 124, w: 320, h: 20 } },
  may_in_phieu: { vb: [160, 96], slot: PRINT_SLOT },
  kep_phieu: { vb: [32, 72], jaw: [16, 66], hang: [16, 4] },
  hu_tip: { vb: [80, 96], mouth: TIP_MOUTH }
})

/** SVG cảnh theo id ('' nếu không có); biểu tượng 64 tra ở SCENE_ICONS. */
export function scene(id) {
  return Object.prototype.hasOwnProperty.call(SCENE, id) ? SCENE[id] : Object.prototype.hasOwnProperty.call(SCENE_ICONS, id) ? SCENE_ICONS[id] : ''
}
