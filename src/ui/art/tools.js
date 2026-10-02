// Hình dụng cụ M5 (icon 64): thớt gỗ, dao thép, các dụng cụ nâng cấp, biểu tượng giao diện (Muỗng Vàng, rổ, sao) và
// biểu tượng bốn thao tác mới (khuấy, gọt, lắc, bày). Thuần, import trong Node được. Quy chuẩn ở kit.js.
// Bản lớn dùng trên sân khấu nằm ở props.js (thot_lon, dao_lon...). Giữ mọi id cũ của bộ hình cũ (game và data.test dùng).

import { DETAIL, PAL, svg, ground, hilite, tone3, dots, ball, polyD, r1 } from './kit.js'

// Thớt gỗ có tay cầm và lỗ treo, nhìn hơi chéo (thấy bề dày ở mép dưới).
const BOARD = 'M6 23C6 18.5 9 16 13.5 16H42C46.5 16 49 18.5 49 23V25.5H55C59 25.5 61 28 61 32C61 36 59 38.5 55 38.5H49V41C49 45.5 46.5 48 42 48H13.5C9 48 6 45.5 6 41Z'
const thot = svg(
  ground(33, 57.6, 26, 3.4) +
  `<g transform="rotate(-8 33 34)">` +
  `<path d="${BOARD}" fill="${PAL.go[1]}" transform="translate(0 5)"/>` +
  tone3({
    outline: BOARD, base: PAL.go[0], dark: PAL.go[1],
    shade: 'M7.6 44.6C9.4 46.8 11.4 48 13.5 48H42C46.5 48 49 45.5 49 41V38.5H55C58.6 38.5 60.6 36.4 61 33.2C59.6 35.2 57.6 35.8 55 35.8H46.2V40.4C46.2 43.4 44.6 44.8 42 44.8H13.5C11 44.8 9 44.8 7.6 44.6Z',
    detail: `<path d="M12 26C19 23.6 27 27.4 35 25.2C39 24.2 42 24.6 44.6 26M11 34C18 31.6 25.6 35.6 33.6 33.6C37 32.8 40 33 42.6 34M14 41C21 39.4 29 42.4 39.6 40.4" fill="none" stroke="${PAL.go[1]}" stroke-width="1.6" opacity=".75"/>` +
      `<circle cx="56" cy="32" r="2.6" fill="#8a5428" stroke-width="${DETAIL}"/>`,
    shine: `<path d="M10 37V24C10 21 11.6 19.6 14.6 19.6H24" fill="none" stroke="#fff" stroke-width="2.2" opacity=".5"/>`
  }) +
  `</g>`)

// Dao thép: lưỡi sáng có vát cạnh, chuôi gỗ hai đinh tán, một tia lấp lánh trên lưỡi.
const BLADE = 'M24.5 22.5H53C56.5 22.5 59.5 24 61.5 26.5C55 34 43 37.5 28 37.5H24.5Z'
const HANDLE = 'M3 27.5C3 25 5 23.5 7.5 23.5H21V35.5H7.5C5 35.5 3 34 3 31.5Z'
const dao_thep = svg(
  ground(31, 57.6, 20, 3) +
  `<g transform="rotate(-40 32 32)">` +
  tone3({
    outline: HANDLE, base: PAL.go_dam[0], dark: PAL.go_dam[1],
    shade: 'M3.4 32.4C4 34.4 5.6 35.5 7.5 35.5H21V32.4Z',
    detail: dots([[8.6, 29.4], [15, 29.4]], '#f3e3c8', 1.6),
    shine: hilite(10, 26, 5, 0.9, 0.5)
  }) +
  `<rect x="20" y="22" width="5.5" height="15" rx="1.6" fill="${PAL.thep[1]}"/>` +
  tone3({
    outline: BLADE, base: PAL.thep[0], dark: PAL.thep[1],
    shade: 'M24.5 33.4H29C42 33.4 53 30.6 61 26.9C55 34 43 37.5 28 37.5H24.5Z',
    shine: `<path d="M28 25.8H52" stroke="#fff" stroke-width="1.9" opacity=".9"/>`
  }) +
  `<path d="M50 23.4l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9Z" fill="#fff" stroke="none"/>` +
  `</g>`)

// ---------- Dụng cụ, nâng cấp và biểu tượng giao diện (vẽ lại theo phong cách M5) ----------

// Nét ống có viền mực (cán muỗng, sóng âm, dải vỏ): viền, nền, vệt sáng.
function tube(d, w, fill, inner = '', innerW = 0, dx = 0, dy = -0.8) {
  return `<path d="${d}" fill="none" stroke-width="${r1(w + 2.6)}"/>` +
    `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${r1(w)}"/>` +
    (inner ? `<path d="${d}" fill="none" stroke="${inner}" stroke-width="${r1(innerW)}" transform="translate(${dx} ${dy})"/>` : '')
}

// Chấm tròn nhỏ không viền: mỗi chấm là một nét cực ngắn đầu tròn.
function specks(list, color, w) {
  return `<path d="${list.map(([x, y]) => `M${r1(x)} ${r1(y)}h.1`).join('')}" stroke="${color}" stroke-width="${w}"/>`
}

// Tia lấp lánh bốn cánh (trắng, không viền).
const sparkle = (x, y, r) => `<path d="M${x} ${r1(y - r)}l${r1(r * 0.3)} ${r1(r * 0.7)} ${r1(r * 0.7)} ${r1(r * 0.3)}-${r1(r * 0.7)} ${r1(r * 0.3)}-${r1(r * 0.3)} ${r1(r * 0.7)}-${r1(r * 0.3)}-${r1(r * 0.7)}-${r1(r * 0.7)}-${r1(r * 0.3)} ${r1(r * 0.7)}-${r1(r * 0.3)}Z" fill="#fff" stroke="none"/>`

// Lọ sữa muối: lọ thủy tinh thấp (thấy viền kính và đáy dày), sữa kem béo đầy lọ, bông cao thành chóp xoắn,
// hạt muối tinh thể rắc trên.
const KEM = ['#fff3dc', '#ead3a6', '#fffdf6']
const JAR = 'M14 30H50V51C50 54.4 47.4 57 44 57H20C16.6 57 14 54.4 14 51Z'
const sua_muoi = svg(
  ground(32, 58, 19, 3) +
  `<path d="${JAR}" fill="${PAL.nhua[0]}" stroke="none"/>` +
  `<path d="M16.6 30H47.4V50C47.4 52 46 53.4 44 53.4H20C18 53.4 16.6 52 16.6 50Z" fill="${KEM[0]}" stroke="none"/>` +
  `<path d="M42 30H47.4V50C47.4 52 46 53.4 44 53.4H39.6C41.4 52.6 42 51.4 42 49.6Z" fill="${KEM[1]}" stroke="none"/>` +
  `<path d="M16.6 37C21 39.4 25 35 31 37.4S42 35.4 47.4 37.6M16.6 46.6C22 48.6 27 45.6 32 47.4S42 46 47.4 47.6" fill="none" stroke="${KEM[1]}" stroke-width="1.6"/>` +
  `<path d="M20 36.6V49.4" stroke="#fff" stroke-width="2.6" opacity=".8"/>` + hilite(30, 55.2, 6, 0.7, 0.9) +
  `<path d="${JAR}" fill="none"/>` +
  `<rect x="12" y="26" width="40" height="6" rx="3" fill="${PAL.nhua[1]}"/>` + hilite(17.4, 27.8, 3, 0.8, 0.9) +
  tone3({
    outline: 'M13.6 27C12 21 17 17.4 21.6 18.6C22 12.6 28 9.6 32.4 11.4C33 7.6 36.4 5.4 38.4 6.6C37 9 38.4 10.6 40.4 11.6C45.6 12.6 47.6 17.4 45.4 19.6C50 19.6 52.4 23.6 50.4 27Z',
    base: KEM[2], dark: KEM[1],
    shade: 'M50.4 27H13.6C24 27.6 38 26.6 44.6 22.4C46.6 21.2 46.4 20.2 45.4 19.6C50 19.6 52.4 23.6 50.4 27Z',
    detail: `<path d="M22 22.6C26 20.4 30 23 34 20.6M33.4 15.4C36.4 14.6 38.6 16.2 40.6 15" fill="none" stroke="${KEM[1]}" stroke-width="1.6"/>`,
    shine: hilite(20.6, 21.6, 2.6, 1.3, 0.9, -30)
  }) +
  `<g stroke-width="1.4" fill="#fff"><rect x="24.6" y="12.6" width="4.4" height="4.4" rx=".8" transform="rotate(18 26.8 14.8)"/>` +
  `<rect x="42.6" y="14" width="3.8" height="3.8" rx=".8" transform="rotate(-14 44.5 15.9)"/>` +
  `<rect x="31.6" y="20.4" width="3.6" height="3.6" rx=".8" transform="rotate(30 33.4 22.2)"/></g>` +
  specks([[18.6, 22.6], [39, 21], [47, 22.6], [28, 17.4]], '#c9b27e', 1.4))

// Chảo chống dính: lòng chảo đen bóng (vệt sáng cong, giọt dầu lăn), thành chảo, cán gỗ có lỗ treo.
const chao_chong_dinh = svg(
  ground(30, 57, 24, 3.2) +
  `<g transform="rotate(-14 46 34)">` +
  tone3({
    outline: 'M44.6 31.6L57.6 28.6C60.4 28 62.4 29.6 62.4 32.2C62.4 34.8 60.4 36.4 57.6 36.4L44.6 36.4Z', base: PAL.go_dam[0], dark: PAL.go_dam[1],
    shade: 'M46 34.4H57.6C59.6 34.4 61.4 33.6 62.2 32.4C62.4 34.8 60.4 36.4 57.6 36.4H46Z',
    detail: `<circle cx="58" cy="32.4" r="1.6" fill="#2b1a10" stroke-width="1.4"/>`,
    shine: hilite(51.6, 32.2, 3.4, 0.7, 0.6, -10)
  }) +
  `<rect x="41" y="30.4" width="6.4" height="7.2" rx="1.8" fill="${PAL.thep[1]}"/></g>` +
  tone3({
    outline: 'M4 36C4 44.6 13.6 53.6 26 53.6S48 44.6 48 36Z', base: '#3b4049', dark: '#262a31',
    shade: 'M48 36C48 44.6 38.4 53.6 26 53.6C36 50.6 42.4 44 43.2 36Z',
    shine: `<path d="M9 43.6C11.6 47.4 15.6 50 20.4 51.4" fill="none" stroke="#fff" stroke-width="1.8" opacity=".4"/>`
  }) +
  `<ellipse cx="26" cy="35" rx="22" ry="12.6" fill="#5a606b"/>` +
  `<ellipse cx="26" cy="36.4" rx="18" ry="9.4" fill="#2f343c" stroke-width="2"/>` +
  `<path d="M12 39.4C14 43 19.6 45.4 26 45.6" fill="none" stroke="#4a515c" stroke-width="2.4"/>` +
  `<path d="M13.6 33.4C16.6 29.4 22 28 28 28.2" fill="none" stroke="#fff" stroke-width="2.2" opacity=".55"/>` +
  `<ellipse cx="32.4" cy="38.6" rx="3" ry="1.8" fill="#f6c95a" stroke-width="1.4"/>` + hilite(31.6, 38, 1, 0.5, 0.9))

// Ghế nhựa đỏ (ghế đẩu thấp quán vỉa hè): mặt ghế có khe cầm, chân vòm, chân sau thấp thoáng.
const ghe_nhua = svg(
  ground(32, 57.6, 26, 3) +
  `<path d="M23.4 34L22 50H27L28.4 34ZM35.6 34L37 50H42L40.6 34Z" fill="${PAL.do[1]}" stroke-width="2.2"/>` +
  tone3({
    outline: 'M9 27.4H55L58.6 54.6C58.8 56 58 57 56.6 57H50.6C49.4 57 48.6 56.4 48.4 55.2L45 37.4C44.6 35.4 43 34 41 34H23C21 34 19.4 35.4 19 37.4L15.6 55.2C15.4 56.4 14.6 57 13.4 57H7.4C6 57 5.2 56 5.4 54.6Z',
    base: PAL.do[0], dark: PAL.do[1],
    shade: 'M50 27.4H55L58.6 54.6C58.8 56 58 57 56.6 57H53.4C54.2 56.4 54.4 55.6 54.2 54.6Z',
    shine: `<path d="M10.4 32L8 52.6" stroke="#fff" stroke-width="2.2" opacity=".5"/>`
  }) +
  tone3({
    outline: 'M13.4 10H50.6C53.4 10 55.6 11.6 56.2 14.2L58 21.4V25.6C58 26.8 57 27.8 55.8 27.8H8.2C7 27.8 6 26.8 6 25.6V21.4L7.8 14.2C8.4 11.6 10.6 10 13.4 10Z',
    base: '#f0675a', dark: PAL.do[1],
    shade: 'M6 21.4H58V25.6C58 26.8 57 27.8 55.8 27.8H8.2C7 27.8 6 26.8 6 25.6Z',
    detail: `<rect x="25.6" y="13.6" width="12.8" height="4.4" rx="2.2" fill="#8e2620" stroke-width="1.8"/>` +
      `<path d="M6 21.4H58" fill="none" stroke-width="2"/>`,
    shine: `<path d="M11.6 18.4L12.8 14.8C13.2 13.6 14.2 13 15.6 13H21" fill="none" stroke="#fff" stroke-width="2.2" opacity=".7"/>`
  }))

// Máy tính cầm tay: thân xanh xám có bề dày, màn số xanh nhạt, phím trắng, phím bằng màu cam.
const KEYS = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [0, 3], [1, 3]]
const may_tinh = svg(
  ground(32, 58, 18, 3) +
  `<g transform="rotate(-8 32 32)">` +
  `<rect x="15" y="7.6" width="36" height="50" rx="6" fill="#4e6178"/>` +
  tone3({
    outline: 'M19 4H45C48.4 4 51 6.6 51 10V49C51 52.4 48.4 55 45 55H19C15.6 55 13 52.4 13 49V10C13 6.6 15.6 4 19 4Z',
    base: '#7a91ad', dark: '#5f7590',
    shade: 'M46.6 4.2C49.2 5 51 7.4 51 10V49C51 52.4 48.4 55 45 55H19C17 55 15.2 54 14.2 52.6C15.4 52.8 16.6 52.8 18 52.8H44C46.4 52.8 48 51.2 48 48.8V10C48 7.6 47.6 5.6 46.6 4.2Z',
    shine: `<path d="M16 46V11C16 8.8 17.4 7.4 19.6 7.4" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/>`
  }) +
  `<rect x="18" y="9.6" width="28" height="11" rx="2.4" fill="#cfe8c4" stroke-width="2.2"/>` +
  `<path d="M34 12.8v5M37.6 12.8h3.2v2.5h-3.2v2.5h3.2" fill="none" stroke="#2f5a3a" stroke-width="1.5"/>` + hilite(22, 12.6, 2.6, 0.8, 0.9) +
  `<g stroke-width="1.5">` + KEYS.map(([c, r]) => `<rect x="${18 + c * 10}" y="${25 + r * 7.4}" width="8" height="5.6" rx="1.6" fill="#f4f1ea"/>`).join('') +
  `<rect x="38" y="39.8" width="8" height="10.8" rx="1.6" fill="#f5a623"/></g>` +
  specks([[20.4, 26.6], [30.4, 26.6], [40.4, 26.6]], '#fff', 1.6) +
  `</g>`)

// Loa báo tiền: hộp loa nhỏ màu than, lưới loa tròn, đèn báo xanh, sóng âm cam phát ra, đồng xu vàng ở chân.
const loa_bao_tien = svg(
  ground(30, 58, 18, 3) +
  tube('M50.6 25.4C53.6 29.4 53.6 34.6 50.6 38.6M55.6 20.6C60.6 27.6 60.6 36.4 55.6 43.4', 2.4, '#f5a623') +
  tone3({
    outline: 'M20 8H40C44.4 8 48 11.6 48 16V48C48 52.4 44.4 56 40 56H20C15.6 56 12 52.4 12 48V16C12 11.6 15.6 8 20 8Z',
    base: '#3d4452', dark: '#2a2f3a',
    shade: 'M42.6 8.4C45.8 9.4 48 12.4 48 16V48C48 52.4 44.4 56 40 56H20C17.4 56 15.2 54.8 13.8 53C15 53.4 16.2 53.6 17.6 53.6H38.8C42.4 53.6 44.6 51.4 44.6 47.8V15.8C44.6 12.6 44 10.2 42.6 8.4Z',
    shine: `<path d="M15.4 44V16.4C15.4 13.6 17.2 11.6 20 11.4" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/>`
  }) +
  `<rect x="18" y="13.4" width="24" height="8" rx="2.4" fill="#7fd36b" stroke-width="2"/>` +
  `<path d="M22 17.4H30M33 17.4H38" stroke="#2f6b2a" stroke-width="2"/>` + hilite(21, 15, 2.4, 0.7, 0.9) +
  `<circle cx="30" cy="38.4" r="11" fill="#5b6475" stroke-width="2.4"/>` +
  specks([[30, 38.4], [25.6, 38.4], [34.4, 38.4], [30, 34], [30, 42.8], [26.8, 35.2], [33.2, 35.2], [26.8, 41.6], [33.2, 41.6]], '#2a2f3a', 2.4) +
  `<path d="M22.4 33.4C24 30.6 26.6 29 29.6 28.8" fill="none" stroke="#fff" stroke-width="1.8" opacity=".45"/>` +
  ball(48.6, 50.6, 6.6, 6.6, PAL.sao, { k: 0.24 }) + `<circle cx="48.6" cy="50.6" r="3.6" fill="none" stroke="${PAL.sao[1]}" stroke-width="1.5"/>`)

// Muỗng Vàng (đơn vị thưởng của game): muỗng vàng bóng nằm chéo, lòng muỗng hình trứng sáng hơn, núm tròn cuối cán,
// tia lấp lánh.
const GOLD = ['#f8c23a', '#d8921a', '#fff1a8']
const SPOON = 'M31 32C31 36.6 24 41.8 15.6 41.8C8 41.8 2.8 37.6 2.8 32S8 22.2 15.6 22.2C24 22.2 31 27.4 31 32Z'
const muong_vang = svg(
  ground(32, 57.6, 20, 3) +
  `<g transform="rotate(42 32 32)">` +
  tone3({
    outline: 'M29 29.4C35 30.2 42 29.4 48.6 28.8C51.4 26.4 56 26 58.6 28.2C61 30.4 61 33.6 58.6 35.8C56 38 51.4 37.6 48.6 35.2C42 34.6 35 33.8 29 34.6Z',
    base: GOLD[0], dark: GOLD[1],
    shade: 'M29 33.2C35 32.4 42 33 48.6 33.4C51.6 35.6 55.6 36 58.4 34C61 33.6 60.6 34.6 58.6 35.8C56 38 51.4 37.6 48.6 35.2C42 34.6 35 33.8 29 34.6Z',
    shine: hilite(40, 30.6, 6, 0.7, 0.8)
  }) +
  tone3({
    outline: SPOON, base: GOLD[0], dark: GOLD[1],
    shade: 'M31 32C31 36.6 24 41.8 15.6 41.8C8 41.8 2.8 37.6 2.8 32C6 36.6 11 38.6 16 38.6C23 38.6 28.6 35.6 31 32Z',
    detail: `<path d="M27.6 32C27.6 35 22.4 38.4 16 38.4C10 38.4 6.4 35.4 6.4 32S10 25.6 16 25.6C22.4 25.6 27.6 29 27.6 32Z" fill="#ffe17a" stroke="none"/>` +
      `<path d="M6.4 32C6.4 28.6 10 25.6 16 25.6C22.4 25.6 27.6 29 27.6 32C24 28.6 20 27.6 16 27.6C11 27.6 8 29.6 6.4 32Z" fill="${GOLD[1]}" stroke="none" opacity=".55"/>`,
    shine: `<path d="M10 35.4C13 37 17 37.4 21 36.4" fill="none" stroke="#fff" stroke-width="2.2" opacity=".85"/>`
  }) +
  `</g>` + sparkle(50, 12.6, 6.4) + sparkle(13, 47, 3.6))

// Rổ tre: miệng rổ viền đai, lòng rổ đan, bó rau xanh, trái tắc và trái ớt nhô lên.
const ro = svg(
  ground(32, 57.6, 24, 3.2) +
  `<ellipse cx="32" cy="29" rx="27" ry="9" fill="${PAL.rom[1]}"/>` +
  `<ellipse cx="32" cy="30.6" rx="21.6" ry="6.4" fill="#b88a3c" stroke-width="2"/>` +
  `<path d="M14.6 31.4C12 24 14 17.6 18.6 15.6C20.6 21.6 20.6 27 18.8 31.6ZM19.6 31.4C18.6 22.4 21.6 15.4 26.6 13C27.6 19.6 26.6 26 23.6 31.6ZM24.6 31.6C25 24 28.6 18.6 33.6 17.4C33 23.6 31 28.4 28.6 31.6Z" fill="${PAL.la[0]}" stroke-width="2"/>` +
  `<path d="M17.4 29.4C16.6 25 16.8 21.4 18.4 18.4M21.6 29.4C21.4 24 22.6 19.4 25.4 16.2M26.6 29.6C27.4 25.6 29.2 22.6 31.8 20.4" fill="none" stroke="${PAL.la[1]}" stroke-width="1.4"/>` +
  `<path d="M44.6 31C49.4 28.4 52 23.4 51 18.4C53.4 19.4 54.6 22.6 53.6 26C52.4 30 48.6 32.4 44.6 31Z" fill="${PAL.do[0]}" stroke-width="2"/>` +
  `<path d="M51 18.4L52.4 15.4" fill="none" stroke="${PAL.la[1]}" stroke-width="2.2"/>` +
  ball(38.6, 26.6, 7, 6.6, PAL.tac) + `<path d="M38.6 20.2L41 17.6" fill="none" stroke="${PAL.la[1]}" stroke-width="2"/>` +
  tone3({
    outline: 'M5 29C5.6 44 17 56 32 56S58.4 44 59 29C58.4 34 46.6 38.4 32 38.4S5.6 34 5 29Z', base: PAL.rom[0], dark: PAL.rom[1],
    shade: 'M59 29C58.4 44 47 56 32 56C42.6 52.6 51.6 44.6 54 35.6C57 34 58.8 31.4 59 29Z',
    detail: `<path d="M8.6 39C15 43 23 45 32 45S49 43 55.4 39M13.4 47.4C19 50.4 25 51.6 32 51.6S45 50.4 50.6 47.4M14 36.6L19.6 52M23.6 38L26.4 55M32 38.4V56M40.4 38L37.6 55M50 36.6L44.4 52" fill="none" stroke="${PAL.rom[1]}" stroke-width="1.6"/>`,
    shine: `<path d="M9.4 36.6C10.6 40.6 12.6 43.6 15.4 46" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>`
  }) +
  `<path d="M5 29C5.6 34 18 38.4 32 38.4S58.4 34 59 29" fill="none" stroke="${PAL.rom[2]}" stroke-width="3.6" transform="translate(0 1.6)"/>`)

// Ngôi sao (chấm sao, danh tiếng): sao năm cánh mũm mĩm, mỗi cánh chia hai nửa sáng / tối như mặt vát.
const STAR_C = [32, 33.4]
const STAR = Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 12.6 : 27
  return [STAR_C[0] + rr * Math.cos(a), STAR_C[1] + rr * Math.sin(a)]
})
// Nửa cánh nằm khuất sáng (pháp tuyến hướng xuống-phải) tô màu tối.
const starFacets = STAR.map((p, i) => [p, STAR[(i + 1) % 10]])
  .filter(([p, q]) => (p[0] + q[0]) / 2 - STAR_C[0] + ((p[1] + q[1]) / 2 - STAR_C[1]) > 4)
  .map(([p, q]) => `M${r1(STAR_C[0])} ${r1(STAR_C[1])}L${r1(p[0])} ${r1(p[1])}L${r1(q[0])} ${r1(q[1])}Z`).join('')
const sao = svg(
  ground(32, 58, 18, 3) +
  tone3({
    outline: polyD(STAR), base: PAL.sao[0], dark: PAL.sao[1], shade: starFacets,
    detail: `<path d="${STAR.filter((_, i) => i % 2 === 0).map(([x, y]) => `M${STAR_C[0]} ${STAR_C[1]}L${r1(x)} ${r1(y)}`).join('')}" stroke="${PAL.sao[1]}" stroke-width="1.4" opacity=".6"/>`,
    shine: hilite(25, 23.6, 3.6, 2, 0.75, -30) + sparkle(46, 12, 4.4)
  }))

// ---------- Biểu tượng thao tác mới (M5) ----------

// Khuấy (xoay): tô xanh lam, mặt bột xoáy ốc có đầu mũi tên chỉ chiều khuấy, muỗng gỗ cắm giữa, hai vạch chuyển động.
const SPIRAL = []
for (let i = 0; i <= 26; i++) {
  const t = i / 26, a = t * Math.PI * 3.4 - 0.73, r = 2 + t * 14.6
  SPIRAL.push([30 + r * Math.cos(a), 37 + r * 0.36 * Math.sin(a)])
}
// Đầu mũi tên tam giác ở cuối đường xoáy, theo hướng tiếp tuyến.
const ARROW = (() => {
  const [x, y] = SPIRAL[SPIRAL.length - 1], [px, py] = SPIRAL[SPIRAL.length - 2]
  const a = Math.atan2(y - py, x - px), c = Math.cos(a), s = Math.sin(a)
  return polyD([[x + 5.6 * c, y + 5.6 * s], [x - 4 * s, y + 4 * c], [x + 4 * s, y - 4 * c]])
})()
const muong_khuay = svg(
  ground(32, 58, 23, 3.2) +
  `<ellipse cx="32" cy="36" rx="27" ry="9.4" fill="${PAL.xanh_nhan[1]}"/>` +
  `<ellipse cx="32" cy="37" rx="23" ry="7.4" fill="#e9a24e" stroke-width="2"/>` +
  `<path d="${polyD(SPIRAL, false)}" fill="none" stroke="#fff3d6" stroke-width="2.4"/>` +
  `<path d="${ARROW}" fill="#fff3d6" stroke-width="1.6"/>` +
  tube('M33 36L49.6 6', 4, PAL.go[0], PAL.go[2], 1.4, -1, -0.4) +
  `<ellipse cx="33" cy="36.4" rx="5.6" ry="2.6" fill="${PAL.go[1]}" stroke-width="2"/>` +
  `<path d="M40.4 9.6C38.6 11 37.6 13 37.4 15.4M57 15.4C56.4 17.6 54.8 19.2 52.6 20" fill="none" stroke-width="2.2"/>` +
  tone3({
    outline: 'M5 36C5.6 48 17 57 32 57S58.4 48 59 36C58.4 41.6 46.6 45.4 32 45.4S5.6 41.6 5 36Z', base: PAL.xanh_nhan[0], dark: PAL.xanh_nhan[1],
    shade: 'M59 36C58.4 48 47 57 32 57C42.6 54 51.6 47.6 54 42.4C57 41 58.8 38.6 59 36Z',
    detail: `<path d="M9 44C15.6 48.6 23 50.6 32 50.6S48.4 48.6 55 44" fill="none" stroke="${PAL.xanh_nhan[2]}" stroke-width="2"/>`,
    shine: `<path d="M9.4 43.6C11 47.4 14 50.2 17.6 52" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>`
  }))

// Gọt (dao bào): dao bào chữ Y, cán nhựa đỏ, lưỡi inox có khe, dải vỏ xoài xanh (mặt trong vàng nhạt) cuộn ra khỏi lưỡi.
const dao_bao = svg(
  ground(32, 58, 18, 3) +
  `<g transform="rotate(-32 32 34)">` +
  tone3({
    outline: 'M27 36H37V54C37 56.8 34.8 59 32 59S27 56.8 27 54Z', base: PAL.do[0], dark: PAL.do[1],
    shade: 'M34 36H37V54C37 56.8 34.8 59 32 59C33.6 57.8 34 56 34 54Z',
    detail: `<circle cx="32" cy="53.6" r="1.8" fill="#8e2620" stroke-width="1.6"/>`,
    shine: `<path d="M29.4 39V49" stroke="#fff" stroke-width="1.8" opacity=".6"/>`
  }) +
  tube('M19.6 16V21C19.6 28.4 25.6 32.6 32 32.6S44.4 28.4 44.4 21V16M32 32.6V37', 3, PAL.thep[1], '#fff', 1, 0, -0.6) +
  tone3({
    outline: 'M17.6 11H46.4C48 11 49 12 49 13.4C49 15 48 16 46.4 16H17.6C16 16 15 15 15 13.4C15 12 16 11 17.6 11Z', base: PAL.thep[0], dark: PAL.thep[1],
    detail: `<rect x="21" y="12.4" width="22" height="2.4" rx="1.2" fill="#55606e" stroke="none"/>`,
    shine: hilite(22, 11.9, 4, 0.5, 0.9), sw: 2.4
  }) +
  `</g>` +
  tube('M27.6 13C26.4 6.6 19.6 3.4 14.6 6.6C10.4 9.4 11.6 15.6 16.6 15.6C20 15.6 21 12 18.6 10.4', 4, '#6fae38', '#d9eb9a', 1.6, 0.4, 0.6))

// Lắc (bình lắc): ly lắc nhựa trong có trà và đá, nắp inox bo tròn, nghiêng theo nhịp, vạch chuyển động hai bên.
const binh_lac = svg(
  ground(32, 58, 17, 3) +
  `<path d="M9.6 22.6C6.6 27 6.6 33 9.6 37.4M5 18.6C0.6 25.4 0.6 34.6 5 41.4M54.4 26.6C57.4 31 57.4 37 54.4 41.4M59 22.6C63.4 29.4 63.4 38.6 59 45.4" fill="none" stroke-width="2.4"/>` +
  `<g transform="rotate(12 32 34)">` +
  `<path d="M17 21H47L43.6 53.4C43.4 55.4 41.8 57 39.6 57H24.4C22.2 57 20.6 55.4 20.4 53.4Z" fill="${PAL.nhua[0]}" stroke="none"/>` +
  `<path d="M18.2 31.6H45.8L43.6 53.4C43.4 55.4 41.8 57 39.6 57H24.4C22.2 57 20.6 55.4 20.4 53.4Z" fill="${PAL.tra[0]}" stroke="none"/>` +
  `<path d="M39.6 31.6H45.8L43.6 53.4C43.4 55.4 41.8 57 39.6 57H37.4C39 55.8 39.8 54.4 40 52.6Z" fill="${PAL.tra[1]}" stroke="none"/>` +
  `<path d="M18.2 31.6H45.8" fill="none" stroke="#fff3c4" stroke-width="2.6"/>` +
  `<g stroke-width="1.5" fill="${PAL.da_lanh[0]}"><rect x="22.6" y="35.6" width="7.4" height="7.4" rx="1.8" transform="rotate(-14 26.3 39.3)"/>` +
  `<rect x="32.4" y="40.6" width="7" height="7" rx="1.8" transform="rotate(10 35.9 44.1)"/></g>` +
  hilite(21.4, 40, 1.2, 10, 0.55, -4) +
  `<path d="M17 21H47L43.6 53.4C43.4 55.4 41.8 57 39.6 57H24.4C22.2 57 20.6 55.4 20.4 53.4Z" fill="none"/>` +
  tone3({
    outline: 'M15 21.6C15 13 22 7.4 32 7.4S49 13 49 21.6Z', base: PAL.thep[0], dark: PAL.thep[1],
    shade: 'M41.6 9.6C46.4 12 49 16.4 49 21.6H43.6C43.6 17 43 12.6 41.6 9.6Z',
    shine: `<path d="M19.4 17.6C20.6 13.6 24.4 11 29 10.4" fill="none" stroke="#fff" stroke-width="2.2"/>`
  }) +
  `<rect x="27.6" y="3" width="8.8" height="5.6" rx="2.4" fill="${PAL.thep[1]}"/>` +
  `<rect x="13.4" y="20" width="37.2" height="4.6" rx="2.3" fill="${PAL.thep[1]}"/>` + hilite(18.6, 21.6, 3, 0.7, 0.9) +
  `</g>`)

// Bày (khay bày): khay gỗ nhìn chéo có gờ, hai viên đá nằm sẵn, ô trống viền chấm, một viên đá lơ lửng trên ô
// cùng mũi tên chấm chỉ xuống chỗ thả.
const cube = (x, y, s, a) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="2.4" transform="rotate(${a} ${r1(x + s / 2)} ${r1(y + s / 2)})"/>`
const khay_bay = svg(
  ground(32, 58, 27, 3) +
  `<path d="M3.4 49.6H60.6V53.4C60.6 55 59.4 56.2 57.8 56.2H6.2C4.6 56.2 3.4 55 3.4 53.4Z" fill="${PAL.go[1]}"/>` +
  tone3({
    outline: 'M11.6 31H52.4C54 31 55.2 31.8 55.6 33.2L60.6 49.6C60.6 50.4 60 51 59.2 51H4.8C4 51 3.4 50.4 3.4 49.6L8.4 33.2C8.8 31.8 10 31 11.6 31Z',
    base: PAL.go[0], dark: PAL.go[1],
    detail: `<path d="M13.4 34.6H50.6L54.6 47.4H9.4Z" fill="${PAL.go[2]}" stroke-width="1.8"/>` +
      `<path d="M50.6 34.6L54.6 47.4H48.6L45.6 34.6Z" fill="#ecc188" stroke="none"/>`,
    shine: `<path d="M11.4 33.4H30" stroke="#fff" stroke-width="1.8" opacity=".7"/>`
  }) +
  `<rect x="37.4" y="37.4" width="11" height="7.6" rx="2" fill="none" stroke="${PAL.go_dam[0]}" stroke-width="1.8" stroke-dasharray="2.4 2.6"/>` +
  `<g stroke-width="1.8" fill="${PAL.da_lanh[0]}">` + cube(13, 33.6, 10, -8) + cube(24.4, 34.6, 9.6, 6) + cube(36.6, 4, 11.6, 12) + `</g>` +
  `<path d="M15.6 36.8V35.2H17.4M27 37.6V36H28.8M39.6 7.8V6H41.6" fill="none" stroke="#fff" stroke-width="1.5"/>` +
  `<path d="M42.6 20.6V29" fill="none" stroke-width="2.2" stroke-dasharray=".1 4"/>` +
  `<path d="M38.8 29.4L42.6 33.4L46.4 29.4" fill="none" stroke-width="2.4"/>`)

export const TOOLS = Object.freeze({
  thot, dao_thep, sua_muoi, chao_chong_dinh, ghe_nhua, may_tinh, loa_bao_tien, muong_vang, ro, sao,
  muong_khuay, dao_bao, binh_lac, khay_bay
})
