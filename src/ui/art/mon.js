// Hình món M5: to, hấp dẫn, là nhân vật chính ở bong bóng gọi món, bảng menu, màn ra món. Thuần, import trong Node được.
// Năm món nền; bốn món hiếm dùng chung hình món nền (phân biệt bằng huy hiệu ★ ở thành phần hiển thị, không vẽ riêng).
// viewBox 0 0 64 64, quy chuẩn ở kit.js. Lòng đỏ dùng var(--yolk, …) như hình trứng (món trứng gà ta chỉ cần đặt --yolk).

import { PAL, svg, ground, hilite, tone3, dots, r1, ellipseShade } from './kit.js'

const YOLK = 'var(--yolk,#f6b21a)'

// Nét ống có viền mực (dải dưa leo, cọng hành, ống hút): viền, nền, vệt sáng.
function tube(d, w, fill, inner = '', innerW = 0, dx = 0, dy = -0.8) {
  return `<path d="${d}" fill="none" stroke-width="${r1(w + 2.6)}"/>` +
    `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${r1(w)}"/>` +
    (inner ? `<path d="${d}" fill="none" stroke="${inner}" stroke-width="${r1(innerW)}" transform="translate(${dx} ${dy})"/>` : '')
}

// Chấm tròn nhỏ không viền (đậu phộng, mè, hạt, điểm sáng): mỗi chấm là một nét cực ngắn đầu tròn, gọn hơn <circle>.
function specks(list, color, w) {
  return `<path d="${list.map(([x, y]) => `M${r1(x)} ${r1(y)}h.1`).join('')}" stroke="${color}" stroke-width="${w}"/>`
}

// ---------- Bánh mì ốp la ----------
// Ổ bánh mì dài hai đầu thuôn nằm chéo, xẻ dọc; nhân nhô lên khỏi khe: trứng ốp la (lòng đỏ to), dưa leo chĩa phải,
// hành lá chĩa trái, tương ớt rưới. Môi bánh phía trước (có vết khía) vẽ đè lên chân nhân để nhân nằm "trong" ổ.
// Vẽ trong hệ trục nằm ngang rồi xoay −16°.

const backLoaf = `<path d="M3 34C5 26 14 21 26 21H38C50 21 59 26 61 34C59 42 50 47.6 38 47.6H26C14 47.6 5 42 3 34Z" fill="${PAL.banh[0]}"/>` +
  `<path d="M7 32C14 28 22 26.6 32 26.6C42 26.6 50 28 57 32" fill="none" stroke="${PAL.ruot_banh[1]}" stroke-width="3"/>`

const filling =
  tube('M38 32L57 20.6', 3.6, PAL.dua[0], PAL.ruot_dua[0], 1.6) +
  tube('M42 33.4L60.4 25', 3.6, PAL.dua[0], PAL.ruot_dua[0], 1.6) +
  tube('M23 31.4L13.4 19.4', 2.8, PAL.hanh[1], PAL.hanh[2], 0.9, -0.5, -0.3) +
  tube('M20 31.6L8.4 22.4', 2.8, PAL.hanh[0], PAL.hanh[2], 0.9, -0.5, -0.5) +
  tone3({
    outline: 'M13.4 30.8C12.2 24.8 18.2 21 23.4 22.6C27.6 18.4 37.4 18.6 40.8 22.6C45 23.4 46.6 27.8 44.4 31.4C41 34.6 17 35.2 13.4 30.8Z',
    base: PAL.trung[2], dark: PAL.trung[1],
    shade: 'M40.8 22.6C45 23.4 46.6 27.8 44.4 31.4C42.8 33 38 33.8 33 34C37.8 31.8 41.4 28 40.8 22.6Z',
    shine: hilite(18.2, 25.8, 2.6, 1.3, 0.9, -25), sw: 2.6
  }) +
  `<circle cx="31" cy="26.4" r="6.6" fill="${YOLK}" stroke-width="2.6"/>` +
  `<path d="${ellipseShade(31, 26.4, 5.2, 5.2, 0.3)}" fill="#a8430a" opacity=".32" stroke="none"/>` +
  hilite(28.6, 24, 2.4, 1.5, 0.85, -30) +
  `<path d="M37.4 24l2 2.2 2-2 2 2.2" fill="none" stroke="${PAL.do[0]}" stroke-width="2.2"/>`

const SCORES = 'M12.6 42l5.4-4.8M24.4 40.6l6-4.2M36.8 40.6l6-4.2M48.6 40.6l5.2-4.2'
const frontLip = tone3({
  outline: 'M3 34C10 31.6 20 30.6 32 30.6C44 30.6 54 31.6 61 34C59 42 50 47.6 38 47.6H26C14 47.6 5 42 3 34Z',
  base: PAL.banh[0], dark: PAL.banh[1],
  shade: 'M7.4 41.6C11.6 45.6 18 47.6 26 47.6H38C50 47.6 59 42 61 34L59.4 33.4C56.6 39.6 49 43.6 38 43.8H26C18 43.8 11.8 43 7.4 41.6Z',
  detail: `<path d="M7.6 34C14 32.6 22 32.2 32 32.2C42 32.2 50 32.6 56.4 34" fill="none" stroke="${PAL.ruot_banh[0]}" stroke-width="1.8"/>` +
    `<path d="${SCORES}" fill="none" stroke-width="4"/><path d="${SCORES}" fill="none" stroke="${PAL.banh[2]}" stroke-width="1.9"/>`,
  shine: `<path d="M8.4 37.4C10.6 35.8 14 34.8 18.4 34.4" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>`
})

const mon_banh_mi_op_la = svg(ground(32, 57, 26, 3.6) + `<g transform="rotate(-16 32 36)">` + backLoaf + filling + frontLip + '</g>')

// ---------- Trà tắc ----------

function tacSlice(cx, cy, r) {
  const seg = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3
    seg.push(`M${r1(cx)} ${r1(cy)}L${r1(cx + Math.cos(a) * r * 0.7)} ${r1(cy + Math.sin(a) * r * 0.7)}`)
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${PAL.tac[0]}" stroke-width="1.6"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r1(r * 0.74)}" fill="${PAL.ruot_tac[0]}" stroke="none"/>` +
    `<path d="${seg.join('')}" stroke="${PAL.ruot_tac[2]}" stroke-width="1"/>`
}

// Viên đá (hoặc khối vuông bo góc nói chung: miếng cùi bưởi) có vệt sáng góc trên-trái.
function ice(x, y, s, a, fill = PAL.da_lanh[0]) {
  return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="2.2" fill="${fill}" stroke-width="1.6" transform="rotate(${a} ${r1(x + s / 2)} ${r1(y + s / 2)})"/>` +
    `<path d="M${r1(x + 2)} ${r1(y + 3.4)}L${r1(x + 2)} ${r1(y + 2)}L${r1(x + 3.6)} ${r1(y + 2)}" fill="none" stroke="#fff" stroke-width="1.4" transform="rotate(${a} ${r1(x + s / 2)} ${r1(y + s / 2)})"/>`
}

const CUP = 'M13.5 21H50.5L46 55.5C45.8 57.2 44.6 58 43 58H21C19.4 58 18.2 57.2 18 55.5Z'
const mon_tra_tac = svg(
  ground(32, 58.2, 18, 3.2) +
  `<path d="${CUP}" fill="${PAL.nhua[0]}" stroke="none"/>` +
  // Nước trà: mảng tối sát thành phải, mặt nước sáng, đá và lát tắc.
  `<path d="M14.3 27H49.7L46 55.5C45.8 57.2 44.6 58 43 58H21C19.4 58 18.2 57.2 18 55.5Z" fill="${PAL.tra[0]}" stroke="none"/>` +
  `<path d="M43.6 27H49.7L46 55.5C45.8 57.2 44.6 58 43 58H40.4C41.8 57.4 42.4 56.4 42.6 55Z" fill="${PAL.tra[1]}" stroke="none"/>` +
  `<ellipse cx="32" cy="27" rx="17.6" ry="2.4" fill="${PAL.tra[2]}" stroke-width="1.4"/>` +
  tacSlice(25, 44, 6) + tacSlice(38.6, 49.4, 5.4) +
  ice(18.6, 22.8, 9, -12) + ice(29.4, 21.6, 9, 8) + ice(38.8, 23.6, 8.4, -6) +
  hilite(19.4, 40, 1.3, 11, 0.5, -7) + hilite(21.4, 55, 0.9, 0.9, 0.7) +
  dots([[45, 34, 1], [44, 40.5, 0.7], [16.8, 30.5, 0.8]], '#fff', 1, 0.85) +
  `<path d="${CUP}" fill="none"/>` +
  // Nắp vòm (mờ đục, mảng tối bên phải), vành nắp, ống hút đỏ cắm qua đỉnh nắp.
  tone3({
    outline: 'M13.6 19.2C13.6 10.6 22 6.6 32 6.6C42 6.6 50.4 10.6 50.4 19.2Z', base: '#f4fafd', dark: PAL.nhua[1],
    shade: 'M41.6 8.2C47 10 50.4 13.6 50.4 19.2H44.4C44.6 14.6 43.6 10.8 41.6 8.2Z',
    shine: `<path d="M18.6 15.4C19.6 12 23.4 9.8 28 9.2" fill="none" stroke="#fff" stroke-width="2.2"/>`
  }) +
  `<rect x="11.5" y="18.6" width="41" height="5" rx="2.5" fill="${PAL.nhua[1]}"/>` +
  hilite(17, 20.4, 3, 0.8, 0.9) +
  tube('M36.6 10.6L44.6 1.8', 4.4, PAL.do[0], '#fff', 1.1, -1, -0.4) +
  `<ellipse cx="36.4" cy="10.4" rx="3.6" ry="1.4" fill="${PAL.nhua[1]}" stroke-width="1.5"/>`)

// ---------- Bánh tráng trộn ----------
// Đĩa nhựa trắng, đống bánh tráng sợi trộn sa tế đỏ cam vun cao (vệt sợi sáng, tối đan nhau); trên đỉnh: trứng cút
// (một quả nguyên, một nửa quả lộ lòng đỏ) nằm cạnh nhau, sợi xoài xanh chĩa lên, lá rau răm có đốm tía, khô bò đỏ sẫm,
// đậu phộng rang và chấm sa tế. Đồ ăn kèm đặt lệch, không đối xứng (tránh thành hình mặt người).

const HEAP = 'M7 45C5.4 39 9 34 13 33.4C13 28 18 24.6 23 25.6C25 20.6 31.4 19 35.6 21.6C40 18.6 46.6 21.4 47 26C52 26.4 55.6 31 54.6 35.4C58 38 58.4 42 57 45C46 50.6 18 50.6 7 45Z'
// Lá rau răm (mũi mác, gân giữa). Món không vẽ đốm tía giữa lá để lá khỏi trông như con mắt.
const ramLeaf = (d, v) => `<path d="${d}" fill="${PAL.la[0]}" stroke-width="2"/><path d="${v}" fill="none" stroke="${PAL.la[1]}" stroke-width="1.3"/>`
const mon_banh_trang_tron = svg(
  ground(32, 58, 27, 3.2) +
  // Đĩa: vành, mảng tối dưới-phải.
  `<ellipse cx="32" cy="47.4" rx="29.4" ry="9" fill="${PAL.dia[0]}"/>` +
  `<path d="${ellipseShade(32, 47.4, 29.4, 9, 0.22)}" fill="${PAL.dia[1]}" stroke="none"/>` +
  `<ellipse cx="32" cy="47.4" rx="29.4" ry="9" fill="none"/>` +
  tone3({
    outline: HEAP, base: '#f2a24c', dark: '#d8732a',
    shade: 'M57 45C46 50.6 18 50.6 7 45C20 47 40 46 50 40C53 37.6 54.6 36 54.6 35.4C58 38 58.4 42 57 45Z',
    detail: `<path d="M11 41c2-3 4 0 6-3s4 0 6-3M26 45c2-3 4 0 6-3s4 0 6-3M42 43c2-3 4 0 6-3M17 31c2-3 4 0 6-3M38 26c2-2 4 0 5-2M44 35c2-3 4 0 6-3" fill="none" stroke="#ffd59b" stroke-width="1.6"/>` +
      `<path d="M14 46c2-2 4 0 6-2M33 40c2-3 4 0 6-3M23 37c2-3 4 0 6-3M47 42c2-2 4 0 6-2M28 29c2-2 4 0 5-2" fill="none" stroke="#bf4f1f" stroke-width="1.5"/>`,
    shine: hilite(15, 36, 3.4, 1.6, 0.55, -40)
  }) +
  tube('M22.6 27.4L18 12.6', 3, '#cbe27a', '#f1f8c8', 1.1) + tube('M27 26.4L27.6 10.6', 3, '#bcd862', '#f1f8c8', 1.1) +
  tube('M11.6 39L19 35.2', 2.2, '#8e3320', '#c8664a', 0.8) + tube('M27.6 43.6L35.6 41.4', 2.2, '#8e3320', '#c8664a', 0.8) +
  ramLeaf('M11.4 34.6Q12.6 26.4 21 26Q17.6 33.6 11.4 34.6Z', 'M12.6 33.4L19.4 27.4') + ramLeaf('M42 43.6Q47 37 54.4 39Q49.6 45.4 42 43.6Z', 'M43.6 43L52.6 39.6') +
  `<ellipse cx="36.4" cy="24.6" rx="5" ry="4.2" fill="${PAL.trung[2]}" stroke-width="2.2"/>` + hilite(34.8, 23.2, 1.6, 1, 0.9, -30) +
  `<path d="M38.6 31.6C38.6 27.6 41.6 25.8 45 25.8C48.6 25.8 51 28 51 31.6Z" fill="${PAL.trung[2]}" stroke-width="2.2"/>` +
  `<path d="M41.6 31.4C41.6 29.4 43 28.4 44.8 28.4S48 29.4 48 31.4Z" fill="#f6b21a" stroke="none"/>` +
  specks([[20, 38.6], [31.6, 33.4], [44.6, 35.6], [21, 45.6], [51, 45]], '#e9b56a', 2.8) +
  specks([[17, 42.4], [37, 37], [27, 31.4], [49.4, 33.4], [32, 26.4], [42, 46]], '#d6362b', 2))

// ---------- Cà phê sữa đá ----------
// Ly thủy tinh đáy dày: sữa đặc kem lắng dưới đáy, cà phê đen phía trên (vệt sữa cuộn lên), đá nhô khỏi mặt ly,
// muỗng inox cán dài cắm chéo.

const GLASS = 'M13 13H51L47 54.6C46.8 56.6 45.4 58 43.4 58H20.6C18.6 58 17.2 56.6 17 54.6Z'
const mon_ca_phe_sua_da = svg(
  ground(32, 58.4, 18, 3) +
  `<path d="${GLASS}" fill="${PAL.nhua[0]}" stroke="none"/>` +
  tube('M37 26L51.6 3.4', 2.4, PAL.thep[0], '#fff', 0.8, -0.6, -0.4) +
  // Cà phê: nền, mảng tối sát thành phải, hai viên đá chìm, mặt nước.
  `<path d="M15.4 22H48.6L46.4 44H17.6Z" fill="#6e3d20" stroke="none"/>` +
  `<path d="M41.4 22H48.6L46.4 44H42C43.6 37 43.4 28.4 41.4 22Z" fill="#45250f" stroke="none"/>` +
  `<rect x="19.6" y="27.4" width="8.4" height="8.4" rx="2" fill="#8c5833" stroke-width="1.3" transform="rotate(-12 23.8 31.6)"/>` +
  `<rect x="31" y="31" width="8" height="8" rx="2" fill="#8c5833" stroke-width="1.3" transform="rotate(10 35 35)"/>` +
  `<ellipse cx="32" cy="22" rx="16.6" ry="2.4" fill="#96623b" stroke-width="1.4"/>` +
  ice(17.4, 12.6, 10, -10) + ice(28, 10.4, 10.6, 6) + ice(39, 13.4, 9, -4) +
  `<path d="M20.4 43.6c-1.4-3.4 2-5.6 5-4M30.6 43c.2-2.6 3-3.6 5-2" fill="none" stroke="#f3dcae" stroke-width="1.8"/>` +
  // Sữa đặc dưới đáy: mép gợn sóng, mảng tối bên phải.
  `<path d="M17.6 44C21 41 25 46 30 43.4S39 41 46.4 43.6L45.6 52H18.4Z" fill="#f6e3b8" stroke="none"/>` +
  `<path d="M41 43C43 42.6 44.6 43 46.4 43.6L45.6 52H40.8C42 49 42 46 41 43Z" fill="#dfc187" stroke="none"/>` +
  `<path d="M17.6 44C21 41 25 46 30 43.4S39 41 46.4 43.6M18.4 52H45.6" fill="none" stroke-width="1.4"/>` +
  hilite(18.8, 33, 1.3, 11, 0.5, -5) + `<path d="M21.4 55.2H30" stroke="#fff" stroke-width="1.6" opacity=".9"/>` +
  dots([[45, 18, 1], [46.4, 49, 0.8]], '#fff', 1, 0.85) +
  `<path d="${GLASS}" fill="none"/>` +
  `<ellipse cx="32" cy="13" rx="19" ry="2.6" fill="none" stroke-width="2"/>`)

// ---------- Chè bưởi ----------
// Chén sứ trắng viền xanh lam, đầy chè: nước cốt dừa trắng béo, cùi bưởi trong như ngọc vun cao, đậu xanh vàng,
// mè rang rắc trên cùng, muỗng inox cắm bên phải.

// Miếng cùi bưởi: khối vuông bo góc trong như thạch, một chấm sáng.
const gem = (x, y, s, a, fill) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="2.4" fill="${fill}" transform="rotate(${a} ${r1(x + s / 2)} ${r1(y + s / 2)})"/>`
const JADE = '#d2eac2', JADE2 = '#f0f6d8'
const mon_che_buoi = svg(
  ground(32, 58, 22, 3.2) +
  `<path d="M21.6 49L23 55.2C23.2 56.4 24 57 25 57H39C40 57 40.8 56.4 41 55.2L42.4 49Z" fill="${PAL.dia[1]}"/>` +
  // Lòng chén: mặt nước cốt dừa (viền sau của miệng chén), muỗng.
  `<ellipse cx="32" cy="31" rx="27" ry="8.6" fill="#fffaf0"/>` +
  tube('M44 28L56.6 13', 2.6, PAL.thep[0], '#fff', 0.8, -0.6, -0.4) +
  '<g stroke-width="1.8">' + gem(12.6, 24.4, 7.4, -14, JADE) + gem(21, 19.4, 8, 10, JADE2) + gem(40, 21, 7.6, -8, JADE) +
  gem(47, 25.6, 7, 16, JADE2) + gem(27.4, 25.6, 7.6, 4, JADE) + '</g>' +
  specks([[15, 26.6], [23.4, 21.8], [42.6, 23.4], [49.6, 27.6], [30, 27.8]], '#fff', 2.4) +
  // Đậu xanh: hai vốc vàng có hạt.
  tone3({
    outline: 'M31.6 21.4C31 17 36.4 15.2 39 17.4C42.6 16.4 45 19.8 43.6 22.6C40 24.8 34 24.6 31.6 21.4Z', base: '#f6cf52', dark: '#e0a52a',
    shade: 'M43.6 22.6C40 24.8 34 24.6 31.6 21.4C35 22.6 40 22.2 43.2 19.4C44 20.4 44.2 21.6 43.6 22.6Z',
    shine: hilite(35.4, 18.6, 1.8, 1, 0.7, -20), sw: 2.2
  }) +
  `<path d="M17.4 33.6C16.6 30 20.6 28.6 23 30.4C26 29.6 28.4 32.4 27 34.6C24 36 19.6 36 17.4 33.6Z" fill="#f6cf52" stroke-width="2.2"/>` +
  specks([[36, 19.6], [39.6, 20.8], [21, 32.4], [24, 33.4]], '#e0a52a', 1.6) +
  specks([[30, 18.4], [36.6, 31.4], [46.4, 33.4], [14.6, 33], [9.6, 30.4]], '#c98a4a', 1.8) +
  // Thân chén trước: mảng tối, hai đường viền lam, chấm hoa lam, vệt sáng.
  tone3({
    outline: 'M5 31C5 43 16.6 52 32 52S59 43 59 31C59 35.8 47 39.6 32 39.6S5 35.8 5 31Z', base: PAL.dia[0], dark: PAL.dia[1],
    shade: 'M59 31C59 43 47.4 52 32 52C42 49.4 51.6 42.6 54.4 35.6C57 34.6 58.6 33 59 31Z',
    detail: `<path d="M7 35.4C13.6 40.4 22 43 32 43S50.4 40.4 57 35.4M17 48.2C21.4 50.2 26 51 32 51S42.6 50.2 47 48.2" fill="none" stroke="${PAL.xanh_nhan[0]}" stroke-width="2"/>` +
      specks([[20, 46], [32, 47.4], [44, 46]], PAL.xanh_nhan[0], 2.6),
    shine: `<path d="M8.6 38.4C10.4 42.4 13 45 16.4 47" fill="none" stroke="#fff" stroke-width="2" opacity=".9"/>`
  }))

export const MON = Object.freeze({ mon_banh_mi_op_la, mon_tra_tac, mon_banh_trang_tron, mon_ca_phe_sua_da, mon_che_buoi })
