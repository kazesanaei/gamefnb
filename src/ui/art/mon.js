// Hình món M5: to, hấp dẫn, là nhân vật chính ở bong bóng gọi món, bảng menu, màn ra món. Thuần, import trong Node được.
// viewBox 0 0 64 64, quy chuẩn ở kit.js. Lòng đỏ dùng var(--yolk, …) như hình trứng (món trứng gà ta chỉ cần đặt --yolk).

import { PAL, svg, ground, hilite, tone3, dots, r1, ellipseShade } from './kit.js'

const YOLK = 'var(--yolk,#f6b21a)'

// Nét ống có viền mực (dải dưa leo, cọng hành, ống hút): viền, nền, vệt sáng.
function tube(d, w, fill, inner = '', innerW = 0, dx = 0, dy = -0.8) {
  return `<path d="${d}" fill="none" stroke-width="${r1(w + 2.6)}"/>` +
    `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${r1(w)}"/>` +
    (inner ? `<path d="${d}" fill="none" stroke="${inner}" stroke-width="${r1(innerW)}" transform="translate(${dx} ${dy})"/>` : '')
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

function ice(x, y, s, a) {
  return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="2.2" fill="${PAL.da_lanh[0]}" stroke-width="1.6" transform="rotate(${a} ${r1(x + s / 2)} ${r1(y + s / 2)})"/>` +
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

export const MON = Object.freeze({ mon_banh_mi_op_la, mon_tra_tac })
