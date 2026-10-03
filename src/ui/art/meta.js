// Hình meta M5 Đợt 3 (gói M-H; thuần): lối vào màn Chuẩn bị, phần thưởng, điểm danh, danh hiệu, sự kiện / tình huống,
// món tương lai; vẽ lại 19 hình meta cũ của art.js cùng id. Quy chuẩn mục 6.1 m5-thiet-ke.md: viewBox 64, viền INK dày 3,
// ba tông, sáng trên-trái, bóng đất y≈58, không gradient / filter / clipPath / mask / <use> / href, KHÔNG chữ; hàng hiếm có
// sao #ffd23f. META_ART: id → SVG (bí danh: ruong = ruong_dong, lich = diem_danh, muong_vang = hình của tools.js).
// metaArt(id, { silhouette }): tra META_ART rồi EVENT_ART, thiếu thì ''; silhouette = bản bóng mờ một màu (món tương lai).
// EVENT_ART: id sự kiện ngày / lễ / tình huống → hình; ENTRY_ART: tên màn → hình lối vào; REWARD_ART: khóa Reward → hình.

import { INK, PAL, svg, ground, hilite, tone3, ball, crescent, polyD, r1, deepFreeze, rareStar, dots } from './kit.js'
import { TOOLS } from './tools.js'

// ---------- Bảng màu [nền, tối, sáng] ----------
const GOLD = ['#f7b928', '#d48f0a', '#ffe27a']
const SAO = PAL.sao
const RED = PAL.do
const CREAM = ['#fffaf0', '#ead9b6', '#ffffff']
const WOOD = PAL.go
const WOOD_D = PAL.go_dam
const STEEL = PAL.thep
const ROM = PAL.rom
const LEAF = PAL.la
const BLUE = ['#4aa3df', '#2a78b4', '#a8dcfa']
const GREEN = ['#6cc04a', '#3f8f2f', '#b7e88f']
const PINK = ['#f49ab0', '#d46a88', '#ffd0dc']
const PURPLE = ['#9a76d0', '#7552ab', '#d4c0f2']
const BRONZE = ['#dc8f4e', '#ad642e', '#f6c493']
const SILVER = ['#e6ebf1', '#a3b1c2', '#ffffff']
const ORANGE = ['#f59a2c', '#cf7410', '#ffc983']
const LEATHER = ['#b0643a', '#874521', '#d99566']
const SLATE = ['#7d93b5', '#5c7396', '#b4c6e0']
const KRAFT = ['#dcab6c', '#b5844a', '#f3d3a3']
const GLASS = ['#d9eef8', '#a9cfe3', '#ffffff']
const LINE = '#c4ae86'

// ---------- Hàm vẽ nhỏ ----------
const A = a => (a == null || a === '' ? '' : typeof a === 'number' ? ` stroke-width="${a}"` : ' ' + a)
/** path tô màu, kế thừa viền mực. */
const P = (d, f, a) => `<path d="${d}" fill="${f}"${A(a)}/>`
/** path chỉ có nét (màu c, dày w). */
const L = (d, c, w, a) => `<path d="${d}" fill="none"${c === INK ? '' : ` stroke="${c}"`} stroke-width="${w}"${A(a)}/>`
/** path chỉ tô, không viền (mảng tối, hoa văn). */
const F = (d, f, a) => `<path d="${d}" fill="${f}" stroke="none"${A(a)}/>`
/** vệt sáng trắng (nét). */
const W = (d, w = 2.4, o = '.5') => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" opacity="${o}"/>`
/** que có viền mực: nét mực dày w + 3, lõi màu c dày w. */
const stick = (d, w, c) => `<path d="${d}" fill="none" stroke-width="${r1(w + 3)}"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}"/>`
/** tone3 gọn: o bóng dáng, c [nền, tối], s mảng tối, h điểm sáng, d chi tiết, w nét viền. */
const T = ({ o, c, s = '', h = '', d = '', w }) => tone3({ outline: o, base: c[0], dark: c[1], shade: s, shine: h, detail: d, sw: w })
const circ = (cx, cy, r, f, a) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${A(a)}/>`
const rot = (deg, cx, cy, body) => `<g transform="rotate(${deg} ${cx} ${cy})">${body}</g>`
const move = (x, y, body) => `<g transform="translate(${x} ${y})">${body}</g>`

// Chữ nhật bo góc: d và điểm biên (cho kit.crescent).
function rr(x, y, w, h, r) {
  const pts = []
  for (const [cx, cy, a0] of [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]]) {
    for (let i = 0; i <= 4; i++) {
      const a = ((a0 + 22.5 * i) * Math.PI) / 180
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    }
  }
  const d = `M${r1(x + r)} ${y}H${r1(x + w - r)}Q${r1(x + w)} ${y} ${r1(x + w)} ${r1(y + r)}V${r1(y + h - r)}` +
    `Q${r1(x + w)} ${r1(y + h)} ${r1(x + w - r)} ${r1(y + h)}H${r1(x + r)}Q${x} ${r1(y + h)} ${x} ${r1(y + h - r)}V${r1(y + r)}Q${x} ${y} ${r1(x + r)} ${y}Z`
  return { d, pts }
}

/** Khối bo góc ba tông. */
function box(x, y, w, h, r, c, { t = 3, detail = '', shine = true, sw } = {}) {
  const b = rr(x, y, w, h, r)
  return T({
    o: b.d, c, s: crescent(b.pts, t, t), d: detail, w: sw,
    h: shine ? W(`M${r1(x + 3)} ${r1(y + h * 0.55)}V${r1(y + r + 1)}Q${r1(x + 3)} ${r1(y + 3)} ${r1(x + r + 2)} ${r1(y + 3)}H${r1(x + Math.min(w * 0.45, w - r - 2))}`) : ''
  })
}

function starPts(cx, cy, R, r, n = 5) {
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / n, q = i % 2 ? r : R
    return [cx + q * Math.cos(a), cy + q * Math.sin(a)]
  })
}

/** Sao mặt vát (nửa cánh dưới-phải tối). */
function star(cx, cy, R, c = SAO, sw = 2.4) {
  const p = starPts(cx, cy, R, R * 0.47)
  const facets = p.map((a, i) => [a, p[(i + 1) % 10]])
    .filter(([a, b]) => (a[0] + b[0]) / 2 - cx + (a[1] + b[1]) / 2 - cy > R * 0.15)
    .map(([a, b]) => `M${r1(cx)} ${r1(cy)}L${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}Z`).join('')
  return T({ o: polyD(p), c, s: facets, w: sw, h: hilite(cx - R * 0.25, cy - R * 0.3, R * 0.17, R * 0.1, 0.8, -30) })
}

/** Tia lấp lánh 4 cánh viền mảnh (thấy được trên giấy lẫn gỗ). */
const sparkle = (x, y, r) => P(`M${x} ${r1(y - r)}Q${x} ${y} ${r1(x + r)} ${y}Q${x} ${y} ${x} ${r1(y + r)}Q${x} ${y} ${r1(x - r)} ${y}Q${x} ${y} ${x} ${r1(y - r)}Z`, '#fff4b8', 1.4)

/** Hoa 5 cánh tâm vàng. */
function flower(cx, cy, r, c) {
  let s = ''
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    s += circ(r1(cx + r * 0.62 * Math.cos(a)), r1(cy + r * 0.62 * Math.sin(a)), r1(r * 0.5), c, 1.8)
  }
  return s + circ(cx, cy, r1(r * 0.36), SAO[0], 1.6)
}

/** Giọt nước, đỉnh (x, y), cao 13·s. */
function drop(x, y, s = 1, c = BLUE) {
  const X = v => r1(x + v * s), Y = v => r1(y + v * s)
  return T({
    o: `M${x} ${y}C${X(-1)} ${Y(3)} ${X(-5)} ${Y(6)} ${X(-5)} ${Y(8.6)}C${X(-5)} ${Y(11.4)} ${X(-2.6)} ${Y(13)} ${x} ${Y(13)}C${X(2.6)} ${Y(13)} ${X(5)} ${Y(11.4)} ${X(5)} ${Y(8.6)}C${X(5)} ${Y(6)} ${X(1)} ${Y(3)} ${x} ${y}Z`,
    c, w: 2.2,
    s: `M${X(5)} ${Y(8.6)}C${X(5)} ${Y(11.4)} ${X(2.6)} ${Y(13)} ${x} ${Y(13)}C${X(2.4)} ${Y(11.6)} ${X(3)} ${Y(9.8)} ${X(2.4)} ${Y(6.4)}C${X(4)} ${Y(7)} ${X(5)} ${Y(8)} ${X(5)} ${Y(8.6)}Z`,
    h: hilite(x - 2.2 * s, y + 8.4 * s, 1.1 * s, 1.9 * s, 0.7)
  })
}

/** Mép tem đục lỗ. */
function perfD(x, y, w, h, n, m) {
  const sx = w / n, sy = h / m, q = 1.8
  let d = `M${x} ${y}`
  for (let i = 0; i < n; i++) { const a = x + sx * i + sx / 2 - q; d += `H${r1(a)}A${q} ${q} 0 0 0 ${r1(a + 2 * q)} ${y}` }
  d += `H${x + w}`
  for (let i = 0; i < m; i++) { const a = y + sy * i + sy / 2 - q; d += `V${r1(a)}A${q} ${q} 0 0 0 ${x + w} ${r1(a + 2 * q)}` }
  d += `V${y + h}`
  for (let i = n - 1; i >= 0; i--) { const a = x + sx * i + sx / 2 + q; d += `H${r1(a)}A${q} ${q} 0 0 0 ${r1(a - 2 * q)} ${y + h}` }
  d += `H${x}`
  for (let i = m - 1; i >= 0; i--) { const a = y + sy * i + sy / 2 + q; d += `V${r1(a)}A${q} ${q} 0 0 0 ${x} ${r1(a - 2 * q)}` }
  return d + 'Z'
}

/** Diềm lượn n múi rộng w. */
function scallop(x0, y, w, n, dep) {
  let d = `M${x0} ${y}`
  for (let i = 0; i < n; i++) { const x = r1(x0 + w * i), z = r1(x + w); d += `C${x} ${r1(y + dep)} ${z} ${r1(y + dep)} ${z} ${y}` }
  return d + 'Z'
}

/** Bánh răng: nền tối, bản sáng thu nhỏ lệch trên-trái. */
function gear(cx, cy, R, r, n, c, hole) {
  const pts = [], s = (2 * Math.PI) / n
  for (let i = 0; i < n; i++) {
    const a = i * s - Math.PI / 2
    for (const [da, q] of [[-0.3, r], [-0.16, R], [0.16, R], [0.3, r]]) pts.push([cx + q * Math.cos(a + da * s), cy + q * Math.sin(a + da * s)])
  }
  const d = polyD(pts), k = 0.86
  return P(d, c[1], 'stroke="none"') +
    F(d, c[0], `transform="translate(${r1(cx * (1 - k) - 1.4)} ${r1(cy * (1 - k) - 1.4)}) scale(${k})"`) +
    L(d, INK, 3) + circ(cx, cy, hole, c[1], 2.6)
}

/** Rương đóng: gỗ c, nẹp kim loại trim, ổ khóa; extra vẽ thêm. */
function chest(c, trim, extra = '') {
  return ground(32, 58, 25, 3.2) +
    T({
      o: 'M9 31V23C9 16 14 12 21 12H43C50 12 55 16 55 23V31Z', c,
      s: 'M55 23V31H48V22C48 17 46 14 42 12H43C50 12 55 16 55 23Z', h: W('M13.6 27V22.6C13.6 18.6 16.4 16 20.6 15.8', 2.6, '.55')
    }) +
    box(9, 31, 46, 24, 3, c, { t: 3.4, shine: false }) +
    P('M17 15Q19 12.6 23 12.2V55H17Z', trim[0], 2.2) + P('M41 12.1Q45 12.4 47 14.6V55H41Z', trim[0], 2.2) +
    F('M21 13V54.4H23V12.4Z', trim[1]) + F('M45 13.6V54.4H47V14.6Z', trim[1]) +
    P('M8.4 29H55.6V33.4H8.4Z', trim[0], 2.2) + F('M9.6 31.8H54.4V33.4H9.6Z', trim[1]) +
    box(26, 24, 12, 14, 2.6, trim, { t: 2.2, shine: false }) +
    circ(32, 29.6, 2, INK, 'stroke="none"') + F('M31 30.6H33L33.6 34.4H30.4Z', INK) + extra
}

/** Ly trà tắc nắp vòm, ống hút. */
const cupTac = (cx, y) =>
  stick(`M${cx + 2} ${y - 2}L${cx + 5} ${y - 11}`, 1.8, RED[0]) +
  T({
    o: `M${cx - 6} ${y}H${cx + 6}L${cx + 4.6} ${y + 16}H${cx - 4.6}Z`, c: PAL.tra, w: 2.4,
    s: `M${cx + 2.6} ${y}H${cx + 6}L${cx + 4.6} ${y + 16}H${cx + 1.6}Z`, h: W(`M${cx - 3.6} ${y + 3}L${cx - 2.8} ${y + 12}`, 1.8, '.6')
  }) + P(`M${cx - 7} ${y}C${cx - 7} ${y - 5} ${cx + 7} ${y - 5} ${cx + 7} ${y}Z`, GLASS[0], 2.2)

// ---------- (a) Lối vào màn Chuẩn bị ----------

// Chợ công thức: sạp mái sọc xanh, tô món bốc khói, phiếu công thức.
const cho_cong_thuc = svg(ground(32, 58, 27, 3.2) +
  stick('M11 21V46M53 21V46', 3.4, WOOD_D[0]) +
  T({
    o: 'M5 15Q5 8 12 8H52Q59 8 59 15V21H5Z', c: CREAM,
    d: F('M14 8H22V21H14ZM29 8H36V21H29ZM43 8H51V21H43Z', GREEN[0]), s: 'M5 18.6H59V21H5Z', h: W('M9 17V14Q9 11 12 11H13')
  }) +
  P(scallop(5, 21, 9, 6, 7), GREEN[0], 2.6) + F(scallop(5, 22.4, 9, 6, 4), GREEN[1]) +
  box(6, 39, 52, 17, 3, WOOD, { detail: L('M9 47.4H55', WOOD[1], 1.6) }) +
  L('M17 31C15 28 19 27 17 23.6M24 31C22 28 26 27 24 23.6', STEEL[1], 2) +
  T({
    o: 'M10 33H32C32 39 28 42 21 42C14 42 10 39 10 33Z', c: CREAM,
    s: 'M32 33C32 39 28 42 21 42C25.6 40 28.4 37 29 33Z', d: L('M12 36.4H30', BLUE[0], 2.2), h: W('M13.6 38.6Q16 40 19 40.4', 1.8)
  }) +
  P('M11 33C13 29.6 29 29.6 31 33Z', PAL.banh[2], 2) +
  rot(8, 45, 32, box(38, 24, 14, 17, 2, CREAM, { t: 2.4, shine: false, detail: L('M41 29H49M41 33H49M41 37H46', LINE, 1.6) + F('M47 24H50V29L48.5 27.6L47 29Z', RED[0]) })))

// Việc hôm nay: bảng ghim, hai tờ giấy (một tờ có ✓).
const viec_hom_nay = svg(ground(32, 58, 25, 3) +
  box(5, 7, 54, 48, 5, WOOD_D, { t: 3 }) +
  P('M10.6 12.6H53.4V49.4H10.6Z', '#d9a066', 2) +
  F('M17 47C25 46 37 46 52 44V49H11.6V46Z', '#c48a50') +
  rot(-6, 22, 31, box(13, 17, 19, 25, 2, CREAM, { t: 2.4, shine: false, detail: L('M16.6 23.4L19.6 26.6L25 20.4', GREEN[1], 2.8) + L('M16.6 31.4H28M16.6 35.4H28M16.6 39.2H24', LINE, 1.8) })) +
  rot(7, 43, 30, box(34, 19, 17, 21, 2, ['#ffe27a', '#e6be3a'], { t: 2.4, shine: false, detail: L('M37.4 26.4H47.4M37.4 30.6H47.4M37.4 34.6H44', '#c9a13a', 1.8) })) +
  ball(22.4, 17, 3, 3, RED, { sw: 2 }) + ball(43, 19.4, 3, 3, BLUE, { sw: 2 }))

// Điểm danh: lịch xé gáy đỏ, ô ngày khoanh đỏ, góc quăn.
const diem_danh = svg(ground(32, 58, 23, 3) +
  P('M15 17H55V57H15Z', CREAM[1], 2.4) +
  T({
    o: 'M9 14H49V46L41 54H9Z', c: CREAM, s: 'M49 14V46L41 54H9V50.6H40.6L45.6 45.6V14Z',
    d: [[14, 29], [25, 29], [36, 29], [14, 39], [25, 39]].map(([x, y]) => P(`M${x} ${y}H${x + 8}V${y + 7}H${x}Z`, '#f2e2c2', 1.6)).join('') +
      L('M40 31.4C40 28.6 44 28.4 44.6 30.4', RED[0], 2.2) + circ(40, 32.6, 5.6, 'none', `stroke="${RED[0]}" stroke-width="2.6"`)
  }) +
  P('M9 18Q9 14 13 14H45Q49 14 49 18V25H9Z', RED[0]) + F('M9 22.4H49V25H9Z', RED[1]) + W('M13 18.6H26', 2.2) +
  P('M41 54L49 46C44.6 46 41 48.4 41 54Z', '#f6e6c6', 2.2) +
  stick('M19 9V18M39 9V18', 2.2, STEEL[0]))

// Hộp thư: hộp đỏ trên cột, thư ló khe, cờ vàng dựng.
const hop_thu = svg(ground(30, 58, 19, 3) +
  stick('M30 41V56', 5, WOOD_D[0]) + stick('M54 36V14', 2, STEEL[1]) +
  P('M54 12.6H62.4V21.4H54Z', GOLD[0], 2.2) +
  T({
    o: 'M7 42V24C7 14 14 9 23 9H37C46 9 53 14 53 24V42Z', c: RED,
    s: 'M53 24V42H7V38H44C47 38 48.4 36.6 48.4 33V24C48.4 17 45.4 12.6 39.6 10.4C48 11.4 53 16.6 53 24Z',
    h: W('M12 35V24C12 18.4 15.4 14.6 21 13.8', 2.8, '.55'),
    d: P('M15 23H45V29H15Z', '#5a2a22', 2) +
      box(21, 12, 18, 16, 1.6, CREAM, { t: 2, h: false, d: P('M32 14.4H36.6V19H32Z', BLUE[0], 1.4) + L('M24 17H29.6M24 20.4H33', LINE, 1.6) }) +
      F('M14 26.4H46V30.6H14Z', RED[0]) + L('M15 26.4H45', INK, 2.4) + L('M14 33.4H46', RED[1], 2)
  }))

// Sổ công thức: bìa da, góc vàng, muỗng vàng chéo.
const so_cong_thuc = svg(ground(32, 58, 23, 3) +
  P('M14 13H53V55H14Z', CREAM[0], 2.4) + L('M49.6 16V52M17 51.6H50', CREAM[1], 1.4) +
  P('M38 52V59L40.6 57L43.2 59V52Z', RED[0], 1.8) +
  T({
    o: 'M9 9H46Q49 9 49 12V49Q49 52 46 52H9Z', c: LEATHER,
    s: 'M49 12V49Q49 52 46 52H17V48H44.6Q45.4 48 45.4 47V9H46Q49 9 49 12Z',
    d: F('M9 9H16.6V52H9Z', LEATHER[1]) + L('M16.6 9V52', INK, 2) + L('M12.6 14V47', LEATHER[2], 1.6, 'opacity=".6"') +
      P('M40 9H46Q49 9 49 12V18Z', GOLD[0], 2) + P('M49 43V49Q49 52 46 52H40Z', GOLD[0], 2) +
      P('M22 18H44V43H22Z', LEATHER[1], 'stroke="none" opacity=".45"') +
      rot(40, 33, 31, stick('M33 31V46', 2.6, GOLD[0]) + ball(33, 23, 5.4, 7.4, GOLD, { w: 2.4, k: 0.24 })),
    h: W('M21 13.6H34', 2.2, '.4')
  }))

// Sổ tay nghề: sổ lò xo xanh, bút chì.
const so_tay_nghe = svg(ground(30, 58, 24, 3) +
  P('M34 53V60L36.6 58L39.2 60V53Z', RED[0], 1.8) +
  box(12, 8, 34, 46, 4, GREEN, { t: 3 }) +
  box(19, 15, 21, 12, 2, CREAM, { t: 2, shine: false, detail: L('M22.6 19.4H36.6M22.6 23H32', LINE, 1.8) }) +
  [14, 22, 30, 38, 46].map(y => stick(`M8.6 ${y}H15.4`, 1.8, STEEL[0])).join('') +
  rot(36, 47, 37, P('M42 20H52V48H42Z', GOLD[0], 2.4) + F('M48.6 20.6V47.4H51V20.6Z', GOLD[1]) + W('M44.4 23V45', 1.8, '.6') +
    P('M42 48H52L47 57Z', WOOD[2], 2.4) + F('M45.4 54.4L47 57.4L48.6 54.4Z', INK) +
    P('M42 15Q42 12 45 12H49Q52 12 52 15V20H42Z', PINK[0], 2.4)))

// Cài đặt: hai bánh răng gỗ.
const cai_dat = svg(ground(30, 58, 22, 3) +
  gear(47, 16, 12.6, 9.6, 7, WOOD_D, 3.4) +
  gear(28, 35, 23, 17.6, 9, WOOD, 6.4) +
  circ(28, 35, 11.6, 'none', `stroke="${WOOD[1]}" stroke-width="1.8"`) + hilite(19.4, 24.6, 3.6, 2, 0.6, -40))

// Sự kiện: cờ đuôi nheo có sao, khóm hoa.
const su_kien = svg(ground(30, 58, 21, 3) +
  stick('M15 10V56', 3, WOOD_D[0]) +
  T({
    o: 'M16.6 12H57L48 22.6L57 33.4H16.6Z', c: RED, s: 'M16.6 29.4H53.6L57 33.4H16.6Z',
    d: star(30, 22.4, 6.4, SAO, 2), h: W('M20 15.6H44', 2.4, '.5')
  }) +
  ball(15, 7.6, 3.6, 3.6, GOLD, { sw: 2.4 }) +
  P('M33 56C31 49 34 44 40 42C40 49 37 53 33 56ZM44 56C45 50 50 47 55 48C53 53 49 56 44 56Z', LEAF[0], 2) +
  flower(41.6, 44, 8, PINK[0]) + flower(53, 40.6, 6, '#fff7ee'))

// Gánh hàng: đòn gánh, hai thúng (rau, tắc).
const thung = cx => T({
  o: `M${cx - 12} 38H${cx + 12}C${cx + 12} 48 ${cx + 7} 55 ${cx} 55C${cx - 7} 55 ${cx - 12} 48 ${cx - 12} 38Z`, c: ROM,
  s: `M${cx + 12} 38C${cx + 12} 48 ${cx + 7} 55 ${cx} 55C${cx + 4} 51 ${cx + 7} 45 ${cx + 7} 38Z`,
  d: L(`M${cx - 10.6} 44H${cx + 10.6}M${cx - 8} 49.6H${cx + 8}M${cx - 4} 38V54M${cx + 4} 38V54`, ROM[1], 1.4),
  h: W(`M${cx - 8.4} 41V45`, 2, '.6')
}) + P(`M${cx - 13} 36H${cx + 13}V40H${cx - 13}Z`, ROM[2], 2.4)
const ganh_hang = svg(ground(32, 58, 29, 3) +
  L('M14 14L4.6 37M14 14L23.4 37M50 14L40.6 37M50 14L59.4 37', '#8a6a3a', 1.6) +
  P('M3 37C3 29 8 26 12 29C14 24.6 21 25.6 24 31C25 33 25 35.4 25 37Z', LEAF[0], 2.2) +
  L('M10 33.6C11 31 12.6 29.6 14.6 29M17 34C18.6 32 20 31 22 30.6', LEAF[1], 1.4) +
  ball(44, 33.4, 4.8, 4.6, PAL.tac, { sw: 2.2 }) + ball(55.4, 33.4, 4.8, 4.6, PAL.tac, { sw: 2.2 }) + ball(49.6, 29, 4.8, 4.6, PAL.tac, { sw: 2.2 }) +
  thung(14) + thung(50) +
  stick('M2 18Q32 6 62 18', 3.4, '#dcb75c') + L('M18 12.4L18.6 15.4M46 12.4L45.4 15.4', '#a8842e', 1.6) + W('M8 14.6Q20 10 30 9.6', 1.4, '.6'))

// Kho hàng hiếm: rương tím nẹp vàng, sao hàng hiếm.
const kho_hiem = svg(chest(PURPLE, GOLD, rareStar(52, 12, 8.4)))

// ---------- (b) Phần thưởng ----------

// Xu: chồng xu và đồng xu dựng có sao.
function coinStack(cx, yb, n) {
  let s = ''
  for (let i = 0; i < n; i++) {
    const y = yb - i * 4.6
    s += P(`M${cx - 13} ${r1(y - 4.6)}V${r1(y)}A13 4.8 0 0 0 ${cx + 13} ${r1(y)}V${r1(y - 4.6)}Z`, GOLD[1], 2.2) +
      `<ellipse cx="${cx}" cy="${r1(y - 4.6)}" rx="13" ry="4.8" fill="${GOLD[0]}" stroke-width="2.2"/>`
  }
  const t = r1(yb - n * 4.6)
  return s + `<ellipse cx="${cx}" cy="${t}" rx="8" ry="2.6" fill="none" stroke="${GOLD[1]}" stroke-width="1.6"/>` + hilite(cx - 5.4, t - 1.6, 2.6, 1, 0.75)
}
const xu = svg(ground(32, 58, 26, 3) +
  coinStack(19, 55, 6) +
  ball(44, 39, 15, 15, GOLD, { shine: false, k: 0.2 }) + circ(44, 39, 10.4, '#ffd84a', `stroke="${GOLD[1]}" stroke-width="2"`) +
  star(44, 39.6, 7, GOLD, 1.6) + W('M32 35C33 29.6 36.6 26.6 41 25.6', 2.4, '.6'))

const muong_vang = TOOLS.muong_vang

// Rương đồng / bạc / vàng: cùng dáng, khác gỗ, nẹp, đinh tán, đá.
const RIVETS = circ(13, 36.6, 1.4, INK, 'stroke="none"') + circ(13, 49.4, 1.4, INK, 'stroke="none"') + circ(51, 36.6, 1.4, INK, 'stroke="none"') + circ(51, 49.4, 1.4, INK, 'stroke="none"')
const ruong_dong = svg(chest(['#b8743c', '#8e5426', '#dca06a'], BRONZE))
const ruong_bac = svg(chest(SLATE, SILVER, RIVETS))
const ruong_vang = svg(chest(['#d04a3c', '#a2322a', '#f08c7e'], GOLD, RIVETS +
  ball(32, 34.6, 2.4, 2.4, BLUE, { sw: 1.6, shine: false }) + sparkle(6.6, 12, 4.4) + sparkle(58, 6, 3.6)))

// Rương mở: nắp bật, ánh sáng, xu và sao bung.
const ruong_mo = svg(ground(32, 58, 25, 3.2) +
  T({ o: 'M9 31L12 13Q13 10 17 10H47Q51 10 52 13L55 31Z', c: ['#7a4422', '#5c3018'], s: 'M47 10Q51 10 52 13L55 31H49L46.4 10Z' }) +
  P('M12 13Q13 10 17 10H47Q51 10 52 13L52.6 16.4H11.4Z', GOLD[0], 2.2) +
  F('M11.6 31C11.6 18 52.4 18 52.4 31Z', '#ffe680', 'opacity=".9"') +
  W('M32 29L17 18M32 29L32 17M32 29L47 18M32 29L24 17.4M32 29L40 17.4', 2.2, '.85') +
  `<ellipse cx="32" cy="31" rx="22" ry="4" fill="#fff4b8" stroke-width="2.4"/>` +
  rot(-16, 22, 24, `<ellipse cx="22" cy="24" rx="5.4" ry="6" fill="${GOLD[0]}" stroke-width="2"/><ellipse cx="22" cy="24" rx="2.6" ry="3.2" fill="none" stroke="${GOLD[1]}" stroke-width="1.4"/>`) +
  `<ellipse cx="33" cy="29" rx="6.4" ry="2.4" fill="${GOLD[0]}" stroke-width="1.8"/>` + star(41.6, 19, 8) + sparkle(8, 9, 4) + sparkle(56, 6, 3.4) + sparkle(30, 6, 2.8) +
  box(9, 31, 46, 24, 3, ['#b8743c', '#8e5426'], { t: 3.4, shine: false }) +
  P('M17 31H23V55H17ZM41 31H47V55H41Z', GOLD[0], 2.2) + F('M21 31.6V54.4H23V31.6ZM45 31.6V54.4H47V31.6Z', GOLD[1]) +
  box(26, 31, 12, 9, 2.4, GOLD, { t: 2, shine: false }) + W('M13.6 36V50', 2.4, '.45'))

// Mảnh công thức: giấy rách, sao hàng hiếm.
const manh_cong_thuc = svg(ground(31, 58, 22, 3) +
  rot(-6, 31, 33, T({
    o: 'M10 12L43 9L45 14L51 13.6L49 20L55 25.6L49.6 31L54 37.6L48.6 43L51.4 50L47 49.6L44 54L12 55L8.6 34L11.4 26Z', c: CREAM,
    s: 'M12 55L44 54L47 49.6L51.4 50L49.6 45.4L46 48.4L42.4 50.6L12.4 51.4Z',
    d: L('M15 22H38M15 29H42M15 36H40M15 43H33', LINE, 2) + ball(39.4, 43, 3.4, 2.6, PINK, { w: 1.6, h: false }),
    h: W('M13.4 16V24', 2.2, '.6')
  })) + rareStar(47, 14, 9.6))

// Tem sự kiện: tem đục lỗ có hoa.
const tem = svg(ground(32, 58, 21, 3) +
  rot(-6, 32, 32, T({
    o: perfD(11, 9, 42, 46, 8, 9), c: CREAM, s: 'M50.6 11V52.6H13V50H48V11Z',
    d: box(16, 14, 32, 36, 2, ['#5fc2b2', '#3f9c8d'], { t: 2.6, h: false }) + flower(32, 31, 10, '#fff7ee') +
      L('M32 43V48M27 46L32 43L37 46', LEAF[1], 2),
    h: W('M19 17H30', 2, '.6')
  })))

// Quà: hộp đỏ nơ vàng.
const giftBow = (c, k = 1) => P(`M32 ${r1(24 - 2 * k)}C${r1(27 - 2 * k)} ${r1(12 - 4 * k)} ${r1(14 - 4 * k)} ${r1(13 - 2 * k)} ${r1(18 - 2 * k)} 20C20 23 26 23.4 32 23.4Z`, c[0], 2.4) +
  P(`M32 ${r1(24 - 2 * k)}C${r1(37 + 2 * k)} ${r1(12 - 4 * k)} ${r1(50 + 4 * k)} ${r1(13 - 2 * k)} ${r1(46 + 2 * k)} 20C44 23 38 23.4 32 23.4Z`, c[0], 2.4) +
  F('M34 22.4C38 20 42 19 45 19.6C44 22 39 23 34 23Z', c[1]) + ball(32, 22, 3.8, 3.2, c, { sw: 2.2, shine: false })
const gift = (c, rb, k) => box(11, 31, 42, 24, 3, c, { t: 3.4 }) + P('M28 31H36V55H28Z', rb[0], 2.2) + F('M33.4 31.6H36V54.4H33.4Z', rb[1]) +
  box(8, 23, 48, 10, 3, c, { t: 2.6, shine: false }) + P('M27.4 23H36.6V33H27.4Z', rb[0], 2.2) + giftBow(rb, k)
const qua = svg(ground(32, 58, 24, 3) + gift(RED, GOLD, 1) + W('M13 27H24', 2.2, '.55'))

// Thư: phong bì, dấu sáp đỏ, tem.
const ENV = 'M5 18Q5 15 8 15H56Q59 15 59 18V49Q59 52 56 52H8Q5 52 5 49Z'
const thu = svg(ground(32, 58, 27, 3) +
  T({
    o: ENV, c: CREAM, s: 'M59 18V49Q59 52 56 52H8Q5 52 5 49V46.6H53Q55 46.6 55 44.6V15H56Q59 15 59 18Z',
    d: L('M6 51L25 34.4M58 51L39 34.4', '#d9c49c', 1.8) + P('M6.4 16.4L32 37.4L57.6 16.4Z', '#f6e7c8', 2.4) +
      P('M45 19H54V29H45Z', BLUE[0], 1.6) + P('M47.4 21.4H51.6V26.6H47.4Z', '#fff7ee', 'stroke="none"'),
    h: W('M9 22V44', 2.4, '.5')
  }) + ball(32, 37, 5, 5, RED, { sw: 2.2 }))

// Thư mở: nắp bật, lá thư có tim.
const thu_mo = svg(ground(32, 58, 27, 3) +
  P('M5 29H59V52Q59 55 56 55H8Q5 55 5 52Z', CREAM[1]) +
  P('M5 29L32 8L59 29Z', '#f6e7c8', 2.6) +
  box(12, 13, 40, 32, 2, ['#ffffff', '#ece3d0'], { t: 2.4, shine: false, detail: L('M17 20H33M17 25.4H40M17 30.6H36', LINE, 1.8) +
    P('M43.6 25C40.6 22 40.2 19.4 42 18.4C43.2 17.8 43.6 18.6 43.6 19.4C43.6 18.6 44.4 17.8 45.6 18.4C47.4 19.4 46.8 22 43.6 25Z', RED[0], 1.6) }) +
  T({
    o: 'M5 29L32 46L59 29V52Q59 55 56 55H8Q5 55 5 52Z', c: CREAM,
    s: 'M59 29V52Q59 55 56 55H8Q5 55 5 52V50H53.6Q55 50 55 48.6V31.6Z', h: W('M9 35V46', 2.4, '.5')
  }))

// Lượt Giỏ chợ: giỏ tre có quai, thẻ lượt hồng.
const luot_gio_cho = svg(ground(32, 58, 25, 3) +
  stick('M15 30C15 8 49 8 49 30', 3.4, ROM[0]) +
  P('M14 30C12 22 16 16 22 15C23 22 21 27 18 30Z', LEAF[0], 2) +
  ball(37, 25, 6.4, 6, RED, { sw: 2.2 }) + L('M35 19.6L37 18.4L39 19.6', LEAF[1], 1.8) + ball(26.4, 27, 5.4, 5, PAL.tac, { sw: 2.2 }) +
  T({
    o: 'M8 30H56L51 51Q50 55 46 55H18Q14 55 13 51Z', c: ROM,
    s: 'M56 30L51 51Q50 55 46 55H39Q45.6 52 47.4 46L51.6 30Z',
    d: L('M10.6 38H53.4M12.4 45.4H51.6M20 30L22 55M32 30V55M44 30L42 55', ROM[1], 1.5), h: W('M12.4 34.4L15.4 48', 2.2, '.55')
  }) +
  box(6, 27, 52, 6.4, 3.2, ROM, { t: 1.8, shine: false }) +
  rot(-12, 54, 18, P('M49 12H59V23H49Z', PINK[0], 2) + circ(54, 15.4, 1.4, '#fff7ee', 1.2) + L('M51.4 19.6H56.6', PINK[1], 1.6)) +
  L('M47.6 15.6L50.6 13.4', INK, 1.4))

// ---------- (c) Điểm danh 7 ô ----------

// Ô lịch trống (nền ô; số ngày, quà chồng lên bằng HTML).
const o_lich = svg(ground(32, 58, 22, 3) +
  box(9, 12, 46, 44, 5, CREAM, { t: 2.8 }) +
  P('M9 17Q9 12 14 12H50Q55 12 55 17V22H9Z', RED[0]) + F('M9 19.6H55V22H9Z', RED[1]) + W('M13 16.6H24', 2.2) +
  stick('M21 8V16M43 8V16', 2.2, STEEL[0]))

// Dấu đã nhận: con dấu xanh có ✓.
const dau_tick = svg(ground(32, 58, 18, 3) +
  rot(-10, 32, 31, ball(32, 31, 22, 22, GREEN, { k: 0.2 }) +
    circ(32, 31, 16.4, 'none', 'stroke="#fff" stroke-width="2" opacity=".55" stroke-dasharray="2.6 3.4"') +
    L('M21.4 31.4L29 39L43.4 23.4', INK, 9) + L('M21.4 31.4L29 39L43.4 23.4', '#ffffff', 4.6)))

// Ngày 7: hộp quà lớn vàng nơ đỏ.
const ngay_7 = svg(ground(32, 58, 28, 3.2) +
  move(0, 1, box(6, 30, 52, 25, 3, GOLD, { t: 3.4 }) + P('M27 30H37V55H27Z', RED[0], 2.2) + F('M34 30.6H37V54.4H34Z', RED[1]) +
    L('M9 42.4H55', RED[0], 3.4) +
    box(3, 21, 58, 11, 3, GOLD, { t: 2.6, shine: false }) + P('M26.4 21H37.6V32H26.4Z', RED[0], 2.2)) +
  giftBow(RED, 2.4) + W('M8 25.4H22', 2.2, '.6') + sparkle(6.6, 10, 4.6) + sparkle(57.4, 9, 4) + sparkle(60, 40, 2.8))

// ---------- (d) Danh hiệu, huy hiệu ----------

// Huy hiệu nền: khiên vàng lòng trống, băng rôn đỏ (danh_hieu: có sao).
function shield(center) {
  return ground(32, 58, 20, 3) +
    P('M17 42L10 57L17.6 54.4L21 60L27 47Z', RED[1], 2.4) + P('M47 42L54 57L46.4 54.4L43 60L37 47Z', RED[1], 2.4) +
    T({
      o: 'M32 4L53 11V28C53 41 44 50 32 55C20 50 11 41 11 28V11Z', c: GOLD,
      s: 'M32 55C44 50 53 41 53 28V11L48.6 9.6V28C48.6 39 41.6 47 32 51Z', h: W('M15.4 15V27.6C15.4 33 17 37.6 19.6 41.4', 2.6, '.55'),
      d: P('M32 10.4L47 15.6V28C47 37.6 41 44.6 32 48.6C23 44.6 17 37.6 17 28V15.6Z', CREAM[0], 2) + center
    }) +
    P('M4 34H60L56.4 39.6L60 45H4L7.6 39.6Z', RED[0], 2.6) + F('M6 42.6H58V45H5.4Z', RED[1]) + W('M10 36.6H26', 1.8, '.5')
}
const huy_hieu_nen = svg(shield(''))
const danh_hieu = svg(shield(star(32, 25.4, 9.4)))

// Cúp vàng, đế gỗ.
const cup = svg(ground(32, 58, 20, 3) +
  stick('M19 14H10.6C10.6 25 15 29.6 22 29.6M45 14H53.4C53.4 25 49 29.6 42 29.6', 2.4, GOLD[0]) +
  T({
    o: 'M17 8H47V21C47 31.6 40.6 38.6 32 38.6C23.4 38.6 17 31.6 17 21Z', c: GOLD,
    s: 'M47 8V21C47 31.6 40.6 38.6 32 38.6C37.4 35.6 41.6 29.6 41.6 21V8Z', h: W('M21.6 12V21C21.6 26.6 23.6 30.6 26.6 33.4', 2.6, '.6'),
    d: star(32, 21.4, 7.6, GOLD, 1.8)
  }) +
  P('M15.6 6H48.4V10.4H15.6Z', GOLD[2], 2.4) +
  P('M28 38.4H36L35 46H29Z', GOLD[1], 2.4) +
  box(17, 45, 30, 11, 2.4, WOOD_D, { t: 2.4, shine: false, detail: P('M24 48.4H40V52.4H24Z', GOLD[0], 1.6) }))

// Sao lớn có vầng tia.
const sao_lon = svg(ground(32, 59, 21, 3) +
  L('M32 1.6V6M7 11.6L10.4 15M57 11.6L53.6 15M2.6 35H7M61.4 35H57', GOLD[1], 2.6) +
  star(32, 34, 26.6, SAO, 3) + sparkle(54, 50, 4.4) + sparkle(10.6, 50, 3.4))

// ---------- (e) Sự kiện ngày, sự kiện lễ, tình huống trong ca ----------

// Phiếu Chợ Sớm: phiếu vàng, dấu phần trăm vẽ bằng hình.
const phieu_cho_som = svg(ground(32, 58, 26, 3) +
  rot(-8, 32, 32, T({
    o: 'M4 17H60V27C56 27 54 29 54 32C54 35 56 37 60 37V47H4V37C8 37 10 35 10 32C10 29 8 27 4 27Z', c: ['#ffd84a', '#e8a700'],
    s: 'M60 43.6V47H4V43.6Z', h: W('M8 21H30', 2.2, '.6'),
    d: L('M20 19.4V44.6', '#b98a10', 2, 'stroke-dasharray="3 3"') +
      P('M10.4 38C9 31 12 26 17 25C17.6 31 15.6 35.6 10.4 38Z', LEAF[0], 1.8) +
      circ(32, 26.4, 3.6, 'none', `stroke="${RED[1]}" stroke-width="2.8"`) + circ(45, 37.6, 3.6, 'none', `stroke="${RED[1]}" stroke-width="2.8"`) +
      L('M46 23.6L31 40.4', RED[1], 3.2)
  })))

// Bạt che mưa: bạt xanh hai cột, giọt mưa.
const bat_che_mua = svg(ground(32, 58, 27, 3) +
  stick('M11 30V56M53 30V56', 2.8, STEEL[1]) +
  T({
    o: 'M3 30L14 11H50L61 30Z', c: BLUE, s: 'M50 11L61 30H51.6L44 11Z',
    d: L('M23.4 11L19.6 30M32 11V30M40.6 11L44.4 30', BLUE[1], 2), h: W('M9 26.6L16.4 14.4', 2.4, '.5')
  }) +
  P(scallop(3, 30, 9.6, 6, 6), BLUE[2], 2.4) + drop(5, 37, 0.7) + drop(59, 37, 0.7) + drop(32, 1, 0.6))

// Trời mưa: mây, ba giọt.
const troi_mua = svg(ground(32, 58, 20, 3) +
  drop(18, 39) + drop(32, 43) + drop(46, 39) +
  T({
    o: 'M14 37C6 37 4 27 11 24.6C11 15 22 10.6 28.6 16.6C32.6 8.6 47 10 48 20.6C56.6 20 60 29.6 54 35C52.6 36.4 50.6 37 48.6 37Z',
    c: ['#dfe7ef', '#a9b9cb'], s: 'M54 35C52.6 36.4 50.6 37 48.6 37H14C10 37 7.4 34.6 6.8 31.6C12 33.6 38 34 51 28.6C54.6 27 57.4 30.6 54 35Z',
    h: W('M12.4 25.4C13 19.4 18.6 15.4 24 16.6', 2.6, '.7')
  }))

// Nắng nóng: mặt trời đổ mồ hôi, nhiệt kế.
let RAYS = ''
for (let i = 0; i < 10; i++) {
  const a = (i * Math.PI) / 5, b = 0.2
  const p = (q, t) => `${r1(25 + q * Math.cos(t))} ${r1(30 + q * Math.sin(t))}`
  RAYS += `M${p(17, a - b)}L${p(25.4, a)}L${p(17, a + b)}Z`
}
const nang_nong = svg(ground(30, 58, 22, 3) +
  P(RAYS, ORANGE[0], 2) + ball(25, 30, 15, 15, ['#ffd23f', '#f2a70c', '#fff4b8']) +
  circ(20, 29, 1.6, INK, 'stroke="none"') + circ(29.6, 29, 1.6, INK, 'stroke="none"') + L('M20.6 35Q24.8 38.4 29 35', INK, 2) +
  drop(36.6, 19, 0.5) +
  P('M47 13Q47 8 51.4 8Q55.8 8 55.8 13V42H47Z', '#ffffff', 2.6) + F('M49.6 22H53.2V44H49.6Z', RED[0]) +
  ball(51.4, 47, 7, 7, RED, { sw: 2.6 }) + L('M55.8 16H59M55.8 22H59M55.8 28H59', INK, 1.6))

// Lãnh lương: phong bì kraft, tiền giấy xòe, xu.
const bill = (c, deg, cx) => rot(deg, cx, 26, box(cx - 16, 14, 32, 20, 2, c, { t: 2.2, shine: false, detail: circ(cx, 24, 4.6, c[2], `stroke="${c[1]}" stroke-width="1.6"`) + L(`M${cx - 12} 18H${cx - 7}M${cx + 7} 30H${cx + 12}`, c[1], 1.6) }))
const lanh_luong = svg(ground(32, 58, 26, 3) +
  bill(['#9fd88a', '#6fb35a', '#e2f6d8'], -16, 26) + bill(['#f3b3cc', '#d98aa8', '#ffe6ef'], 12, 38) +
  T({
    o: 'M7 26H57V52Q57 55 54 55H10Q7 55 7 52Z', c: KRAFT, s: 'M57 26V52Q57 55 54 55H10Q7 55 7 52V50.6H53Q53.4 50.6 53.4 50V26Z',
    d: L('M8 27.4L32 42.4L56 27.4', KRAFT[1], 2) + circ(32, 42.4, 3.6, RED[0], 1.8), h: W('M11 31V48', 2.4, '.5')
  }) +
  ball(50, 50, 6.4, 6.4, GOLD, { sw: 2.2 }) + ball(42, 53, 5.6, 5.6, GOLD, { sw: 2.2 }))

// Chợ phiên: dây cờ, sọt rau quả.
let FLAGS = ''
for (const [x, c] of [[8, RED], [18, GOLD], [28, GREEN], [38, BLUE], [48, PINK], [58, RED]]) {
  const y = r1(7 + 9 * (1 - ((x - 32) / 32) ** 2))
  FLAGS += P(`M${x - 4} ${y}L${x + 4} ${r1(y - 0.2)}L${x} ${r1(y + 8)}Z`, c[0], 1.8)
}
const cho_phien = svg(ground(32, 58, 28, 3) +
  L('M0 6.4Q32 26 64 6.4', INK, 1.6) + FLAGS +
  P('M8 37C8 29 13 26 17 30C19 26 25 27 26 33Z', LEAF[0], 2) +
  ball(45, 31.6, 8, 7, GREEN, { sw: 2.4 }) + L('M41 26.6Q44 31.6 41 36.6M47.4 25.4Q50.6 31.6 47.4 37.6', GREEN[1], 1.6) +
  ball(18, 33, 6.4, 6, PAL.tac, { sw: 2.4 }) + ball(31, 31.6, 6.6, 6.2, RED, { sw: 2.4 }) + L('M29 26.6L31 25.4L33 26.6', LEAF[1], 1.8) +
  box(6, 36, 52, 20, 3, WOOD, { t: 3, detail: L('M8 45.6H56', WOOD[1], 1.8) + L('M16 38.6V53.6M48 38.6V53.6', WOOD[1], 1.4) }))

// Hội thi xe sạch: xe đẩy bóng loáng, hoa thi đua.
const hoi_thi_xe_sach = svg(ground(29, 58, 26, 3) +
  stick('M10 24V44M46 24V44', 2.4, STEEL[1]) +
  P('M4 14Q4 10 8 10H48Q52 10 52 14V22H4Z', '#fffaf0') + F('M11 10H18.6V22H11ZM25 10H32V22H25ZM38.4 10H46V22H38.4Z', RED[0]) +
  L('M4 14Q4 10 8 10H48Q52 10 52 14V22H4Z', INK, 3) + P(scallop(4, 22, 8, 6, 5), RED[0], 2.4) +
  P('M12 30H30V42H12Z', '#e9f6fb', 2) + P('M15.6 39C15.6 36 18.6 35 21 35C23.4 35 26.6 36 26.6 39Z', PAL.banh[0], 1.6) +
  W('M14.6 32.6L18 36', 1.8, '.9') +
  box(6, 41, 44, 11, 3, WOOD, { t: 2.4, shine: false }) + ball(15, 54, 4.6, 4.6, ['#3d4250', '#2a2e38'], { shine: false }) + ball(41, 54, 4.6, 4.6, ['#3d4250', '#2a2e38'], { shine: false }) +
  P('M44.6 27.6L41 43L46 40.6L49 44.6L50 29Z', RED[1], 2.2) + P('M53.4 27.6L57 43L52 40.6L49 44.6L48 29Z', RED[0], 2.2) +
  ball(49, 20, 11, 11, RED, { sw: 2.6, shine: false }) + circ(49, 20, 7, GOLD[0], 2) + star(49, 20.4, 4.6, SAO, 1.6) +
  sparkle(36, 33, 3.6) + sparkle(6, 32, 3))

// Văn phòng đặt 3 ly: phiếu đặt hàng, ba ly trà tắc.
const don_van_phong = svg(ground(32, 58, 28, 3) +
  box(4, 11, 29, 43, 3, WOOD, { t: 3 }) + P('M8 17H29V50H8Z', '#ffffff', 2) +
  box(12, 7, 13, 7, 2, STEEL, { t: 1.6, shine: false }) +
  L('M11 24L13.4 26.6L17.6 21.6M11 32.6L13.4 35.2L17.6 30.2M11 41.2L13.4 43.8L17.6 38.8', GREEN[1], 2.2) + L('M20 25H26M20 33.4H26M20 42H25', LINE, 1.8) +
  cupTac(44, 22) + cupTac(37, 38) + cupTac(52, 38))

// Đại lý tài trợ: bảng hiệu lá trà, băng đỏ vắt góc.
const tai_tro_dai_ly = svg(ground(32, 58, 22, 3) +
  stick('M17 41V56M47 41V56', 3.2, WOOD_D[0]) +
  box(5, 8, 54, 35, 4, GREEN, { t: 3 }) + P('M10 13H54V38H10Z', '#eaf6e3', 1.8) +
  T({
    o: 'M15 34C14 23 25 16.6 41 16.6C41 28.6 31 35.6 15 34Z', c: LEAF,
    s: 'M15 34C31 35.6 41 28.6 41 16.6C38 26 30 31 15 34Z', d: L('M15 34L33 22.4', LEAF[1], 1.8), h: W('M21 26C23 22 28 20 32 19.4', 1.8, '.6')
  }) +
  P('M30 36C30 30 35 27 41 27C41 32 37 36 30 36Z', LEAF[2], 1.8) +
  P('M38 8H48L59 19V29Z', RED[0], 2.4) + F('M57 24.4L59 26.4V29L53 23Z', RED[1]) + sparkle(9, 6, 3.6))

// Tắc lên giá: trái tắc, mũi tên lên.
const tat_gia = svg(ground(30, 58, 25, 3) +
  ball(24, 40, 15, 15, PAL.tac) + P('M24 25C22 18.6 26 13.6 32 13.6C30.4 18.6 29.6 22.4 24 25Z', LEAF[0], 2) +
  L('M24 25.4V22', '#6b4a24', 2) +
  T({
    o: 'M44 56V27H37.6L49 11L60.4 27H54V56Z', c: RED,
    s: 'M50.4 27H54V56H50.4ZM54 27H60.4L56.6 21.6Z', h: W('M47 30V50', 2.2, '.5')
  }))

// Tiền điện nước: tia sét, giọt nước, mũi tên lên.
const tien_dien_nuoc = svg(ground(30, 58, 25, 3) +
  T({
    o: 'M26 4L9 33H22L16 58L42 23H29L36 4Z', c: SAO,
    s: 'M42 23L16 58L19.4 45.6L36.6 26.6H33.4L29 23Z', h: W('M24.6 9.4L15 27', 2.4, '.6')
  }) +
  drop(48, 25, 2.4) + stick('M56 22V8M51.6 12.6L56 7.6L60.4 12.6', 2.4, RED[0]))

// Cúp điện: bóng đèn tắt, gạch chéo đỏ.
const cup_dien = svg(ground(32, 58, 16, 3) +
  T({
    o: 'M32 5C20 5 13 14 13 23C13 31 19 35 21 40H43C45 35 51 31 51 23C51 14 44 5 32 5Z', c: ['#dfe3e8', '#b4bcc6'],
    s: 'M51 23C51 31 45 35 43 40H36C40 34 46 30 46 22C46 15 43 10 38.6 6.6C46 8.6 51 15 51 23Z',
    d: L('M27 40V31L30 27L32 31L34 27L37 31V40', '#8a929c', 1.8), h: W('M18 22C18 16 22 11.6 27 10.4', 2.6, '.7')
  }) +
  box(21, 40, 22, 11, 2, STEEL, { t: 2, shine: false, detail: L('M22.4 44H41.6M22.4 47.4H41.6', STEEL[1], 1.6) }) +
  P('M27 51H37L35 55.6H29Z', '#7d8590', 2.2) +
  L('M9 55L55 9', INK, 8.4) + L('M9 55L55 9', RED[0], 4.4))

// Trật tự đô thị: cọc giao thông trên vỉa hè.
const trat_tu_do_thi = svg(ground(32, 59, 29, 2.4) +
  box(3, 49, 58, 9, 2, ['#c9cdd3', '#a3a9b2'], { t: 2.4, shine: false, detail: L('M17 49V58M32 49V58M47 49V58', '#8f959e', 1.8) }) +
  T({
    o: 'M28 6.6Q32 3 36 6.6L46 44H18Z', c: ORANGE, s: 'M36 6.6L46 44H38.6L32.6 6Z',
    d: F('M25.4 20H38.6L41 29H23Z', '#ffffff') + F('M38.6 20L41 29H39.6L37.4 20Z', '#e3e7ec'), h: W('M27 14L22.4 36', 2.2, '.5')
  }) +
  box(11, 42, 42, 8, 2.6, ORANGE, { t: 2.2, shine: false }))

// Kiểm tra vệ sinh: bảng kiểm ✓, kính lúp.
const kiem_tra_attp = svg(ground(30, 58, 27, 3) +
  box(5, 10, 34, 46, 4, WOOD, { t: 3 }) + P('M9 16H35V52H9Z', '#ffffff', 2) + box(14, 6, 16, 8, 2.4, STEEL, { t: 1.6, shine: false }) +
  L('M12 25L15.4 28.6L21 22M12 37L15.4 40.6L21 34', GREEN[1], 3) + L('M24 26H32M24 38H32M12 47H27', LINE, 2) +
  stick('M51 46L58.6 54', 5, WOOD_D[0]) + ball(44, 38, 10.6, 10.6, GLASS, { sw: 3.4, shine: false }) +
  circ(44, 38, 7.6, 'none', 'stroke="#fff" stroke-width="1.8" opacity=".7"') + W('M38.6 35.4C39.4 32.4 41.6 31 44 30.8', 2.4, '.9'))

// Tri ân 20/11: bó hoa gói giấy, nơ đỏ.
const tri_an_20_11 = svg(ground(32, 58, 16, 3) +
  P('M16 29C8 27 4 20 5 13C13 14 17 21 16 29ZM48 29C56 27 60 20 59 13C51 14 47 21 48 29Z', LEAF[0], 2) + L('M8 16.6L15 26M56 16.6L49 26', LEAF[1], 1.4) +
  flower(32, 12, 8.6, SAO[0]) + flower(20.6, 21.6, 9.4, PINK[0]) + flower(43.4, 21.6, 9.4, RED[0]) +
  T({
    o: 'M13 27H51L37 57H27Z', c: ['#f1e2f6', '#d2b7de'], s: 'M51 27L37 57H31.4L44.4 27Z',
    d: L('M22 27L30 49', '#d2b7de', 1.6), h: W('M17.4 30.6L24 45', 2.2, '.6')
  }) +
  P('M32 43C26 37 20 41 23.6 45C25.6 47 30 46 32 43ZM32 43C38 37 44 41 40.4 45C38.4 47 34 46 32 43Z', RED[0], 2) +
  L('M30.4 45L26.4 53M33.6 45L37.6 53', RED[0], 2.6) + ball(32, 43.4, 2.8, 2.6, RED, { sw: 2, shine: false }))

// Phấn Trắng (tiền sự kiện 20/11): bảng đen, viên phấn.
const phan_trang = svg(ground(32, 58, 26, 3) +
  box(4, 8, 56, 40, 4, WOOD, { t: 3 }) + P('M9 13H55V43H9Z', '#2f5d4a', 2) + F('M9 39.6H55V43H9Z', '#244a3b') +
  W('M16 34C18 26 24 22 30 22M26 18C30 14 36 15 37 19C38 24 32 27 29 24C27 22 29 18 33 18', 2, '.85') + W('M40 31H49M42 26H51', 2, '.7') +
  box(2, 46, 60, 6, 2.4, WOOD_D, { t: 1.8, shine: false }) +
  rot(-6, 40, 45, box(31, 41, 19, 7, 3.4, CREAM, { t: 2, shine: false })) + W('M34 43.2H43', 1.6, '.9'))

// Tình huống ghi nợ: sổ mở, khoanh đỏ, bút.
const ghi_no = svg(ground(32, 58, 28, 3) +
  P('M3 22Q18 18 32 22Q46 18 61 22V55Q46 51 32 55Q18 51 3 55Z', BLUE[0]) +
  P('M6 18.6Q19 15 32 19.6V51.6Q19 47 6 50.6Z', CREAM[0], 2.4) +
  T({ o: 'M32 19.6Q45 15 58 18.6V50.6Q45 47 32 51.6Z', c: CREAM, s: 'M58 46V50.6Q45 47 32 51.6V49Q45 44.4 58 46Z', w: 2.4 }) +
  L('M10 25.4Q19 22.6 28 26M10 31.4Q19 28.6 28 32M10 37.4Q19 34.6 28 38M10 43.4Q19 40.6 24 42', LINE, 1.6) +
  L('M36 26Q45 22.6 54 25M36 32Q45 28.6 50 30', LINE, 1.6) +
  `<ellipse cx="45" cy="39" rx="8" ry="5" fill="none" stroke="${RED[0]}" stroke-width="2.2" transform="rotate(-12 45 39)"/>` +
  L('M40.6 39.6Q45 37 49.6 38', LINE, 1.6) +
  rot(32, 52, 20, P('M49 6H55V32H49Z', RED[0], 2.2) + P('M49 32H55L52 38Z', '#f6d09c', 2) + P('M49 6H55V11H49Z', '#3d4250', 2)) +
  W('M9 22V32', 2, '.6'))

// Tiền nghi giả: tờ tiền dưới kính lúp có dấu hỏi.
const tien_nghi_gia = svg(ground(30, 58, 27, 3) +
  rot(-8, 26, 33, box(3, 19, 46, 28, 3, ['#f3b3cc', '#d98aa8', '#ffe6ef'], { t: 3, detail: P('M8 24H44V42H8Z', 'none', `stroke="${'#d98aa8'}" stroke-width="1.6"`) + circ(18, 33, 5.6, '#ffe6ef', 'stroke="#d98aa8" stroke-width="1.6"') + L('M28 29H40M28 34H38', '#d98aa8', 1.8) })) +
  stick('M51 47L59 56', 5, WOOD_D[0]) + ball(43, 37, 11.4, 11.4, GLASS, { sw: 3.4, shine: false }) +
  L('M39 33.6C39 29.6 47 29.6 47 33.6C47 36.6 43 36.6 43 40', INK, 2.6) + circ(43, 44, 1.6, INK, 'stroke="none"') +
  W('M36.6 32C37.6 29 40 27.4 43 27.2', 2.4, '.9'))

// Hết gas: bình gas mini, khói xám.
const gas_het = svg(ground(30, 58, 17, 3) +
  box(15, 18, 30, 38, 4, ORANGE, { t: 3.4, detail: P('M15 29H45V44H15Z', '#ffffff', 2) + F('M41.6 29H45V44H41.6Z', '#e6e1d8') +
    P('M30 41C26 41 24.6 38.6 25.4 35.6C26 33.4 28 32.6 28.6 30.4C30.6 32 31 33.6 30.6 35.4C32 34.6 32.6 33.6 32.6 32.4C34.6 34.6 35 36.6 34.6 38.4C34 40.4 32.4 41 30 41Z', BLUE[0], 1.6) }) +
  P('M17 18C17 12.4 43 12.4 43 18Z', STEEL[0], 2.4) + box(25, 6, 10, 9, 2, STEEL, { t: 1.6, shine: false }) +
  circ(44, 8, 3.4, '#d6dadf', 1.8) + circ(50, 5.6, 2.4, '#d6dadf', 1.6) + drop(53, 20, 0.6))

// Khách quên ví: ví trên ghế nhựa đỏ.
const khach_quen_vi = svg(ground(32, 58, 25, 3) +
  stick('M14 36L9 55M50 36L55 55M24 38L22.6 55M40 38L41.4 55', 3, RED[1]) +
  P('M10 32V37Q32 45 54 37V32Z', RED[1]) + `<ellipse cx="32" cy="32" rx="22" ry="6.4" fill="${RED[0]}"/>` + W('M14 30.6Q20 27.6 28 27', 2, '.5') +
  rot(-6, 32, 22, P('M20 12H36V19H20Z', BLUE[2], 2) +
    box(15, 15, 32, 17, 4, LEATHER, { t: 2.6 }) + P('M30 19H47V28H30Q27 28 27 25V22Q27 19 30 19Z', LEATHER[1], 2.2) +
    ball(32.6, 23.6, 2.2, 2.2, GOLD, { sw: 1.6, shine: false })))

// Ve chai: thùng giấy, ly nhựa.
const ve_chai = svg(ground(32, 58, 27, 3) +
  rot(-10, 22, 20, P('M15 8H29L27 30H17Z', GLASS[0], 2.2) + P('M15 13H29', 'none', `stroke="${GLASS[1]}" stroke-width="1.6"`) + P('M15.6 18H28.4', 'none', `stroke="${GLASS[1]}" stroke-width="1.6"`)) +
  rot(12, 40, 18, P('M33 6H47L45 30H35Z', GLASS[0], 2.2) + W('M36.6 10L37.6 26', 1.8, '.9')) +
  P('M8 29L2 19L16 17L21 29Z', KRAFT[2], 2.4) + P('M56 29L62 19L48 17L43 29Z', KRAFT[2], 2.4) +
  T({
    o: 'M7 29H57V53Q57 56 54 56H10Q7 56 7 53Z', c: KRAFT, s: 'M57 29V53Q57 56 54 56H10Q7 56 7 53V51H53.4V29Z',
    d: F('M28 29H36V51H28Z', '#e8cf9a') + L('M28 29V51M36 29V51', KRAFT[1], 1.4) + L('M12 44H22M42 44H50', KRAFT[1], 1.6), h: W('M11 33V47', 2.4, '.5')
  }))

// Hỏi đường: cột biển chỉ đường.
const doan_khach_hoi_duong = svg(ground(30, 58, 20, 3) +
  stick('M30 10V56', 4, WOOD_D[0]) + ball(30, 8, 3.4, 3.4, WOOD_D, { sw: 2.4 }) +
  T({ o: 'M4 18.6L12 11H48V26H12Z', c: GREEN, s: 'M48 22.6V26H12L10.4 24.6H48Z', h: W('M13 14.6H34', 2.2, '.55') }) +
  T({ o: 'M60 37.6L52 30H14V45H52Z', c: BLUE, s: 'M14 41.6H54.6L52 45H14Z', h: W('M18 33.6H40', 2.2, '.55') }) +
  L('M16 18.6H40M22 37.6H46', '#ffffff', 2.4, 'opacity=".8"'))

// Đổi ý: hai ly, mũi tên vòng đổi chỗ.
const doi_y = svg(ground(32, 58, 27, 3) +
  cupTac(16, 34) +
  T({ o: 'M42 34H56L54.4 52H43.6Z', c: ['#8a5a3a', '#6a4024'], s: 'M51.4 34H56L54.4 52H50.6Z', w: 2.4, h: W('M45 37L45.6 49', 1.8, '.6') }) +
  P('M41 34C41 29 57 29 57 34Z', GLASS[0], 2.2) +
  stick('M16 22Q32 6 47 21', 2.6, RED[0]) + P('M43 23.6L49.6 23.6L48.4 16.6Z', RED[0], 2) +
  stick('M47 56Q34 61 24 56', 2.6, BLUE[0]) + P('M27.4 52.6L21 56.4L27.4 59.4Z', BLUE[0], 2))

// Người giao hàng báo đã chuyển khoản: thùng hàng, điện thoại dấu hỏi.
const shipper_chuyen_khoan = svg(ground(32, 58, 27, 3) +
  box(4, 30, 28, 25, 3, KRAFT, { t: 3, detail: F('M15 30H21V55H15Z', '#e8cf9a') + L('M8 46H13', KRAFT[1], 1.6) }) +
  box(34, 6, 24, 46, 5, ['#3d4250', '#2a2e38'], { t: 2.6, detail: P('M37.4 12H54.6V45H37.4Z', BLUE[2], 1.8) +
    L('M42.6 23.6C42.6 19 50 19 50 23.6C50 27 46.4 27 46.4 31', INK, 2.6) + circ(46.4, 35.6, 1.6, INK, 'stroke="none"') + circ(46, 48.6, 1.4, '#6b7283', 'stroke="none"') }))

// ---------- (f) Món tương lai (Chặng 2) ----------

// Gỏi cuốn: hai cuốn lộ tôm, rau; chén nước chấm.
const roll = (cx, cy) => rot(-14, cx, cy,
  P(`M${cx - 19} ${cy + 2}C${cx - 24} ${cy - 3} ${cx - 23} ${cy + 7} ${cx - 17} ${cy + 6}Z`, LEAF[0], 1.8) +
  `<rect x="${cx - 17}" y="${cy - 8}" width="34" height="16" rx="8" fill="#f4f8ee"/>` +
  F(`M${cx - 15} ${cy + 1}Q${cx - 4} ${cy - 2} ${cx + 4} ${cy + 1}Q${cx + 10} ${cy + 3} ${cx + 15} ${cy}V${cy + 4}Q${cx} ${cy + 7} ${cx - 15} ${cy + 4}Z`, LEAF[0]) +
  F(`M${cx - 12} ${cy - 1}C${cx - 11} ${cy - 8} ${cx - 2} ${cy - 8} ${cx - 2} ${cy - 2}C${cx - 4} ${cy - 5} ${cx - 9} ${cy - 5} ${cx - 12} ${cy - 1}ZM${cx + 1} ${cy - 1}C${cx + 2} ${cy - 8} ${cx + 11} ${cy - 8} ${cx + 11} ${cy - 2}C${cx + 9} ${cy - 5} ${cx + 4} ${cy - 5} ${cx + 1} ${cy - 1}Z`, '#ff7f5c') +
  L(`M${cx - 9} ${cy - 6}L${cx - 8} ${cy - 3.6}M${cx - 5.4} ${cy - 6.6}V${cy - 4}M${cx + 4} ${cy - 6}L${cx + 5} ${cy - 3.6}M${cx + 7.6} ${cy - 6.6}V${cy - 4}`, '#ffd0c0', 1.2) +
  `<rect x="${cx - 17}" y="${cy - 8}" width="34" height="16" rx="8" fill="#ffffff" fill-opacity=".15"/>` +
  W(`M${cx - 12} ${cy - 5.4}H${cx + 6}`, 2, '.9'))
const mon_goi_cuon = svg(ground(32, 58, 28, 3) +
  `<ellipse cx="30" cy="44" rx="27" ry="10" fill="${PAL.dia[0]}"/>` + `<ellipse cx="30" cy="43" rx="20.6" ry="6.4" fill="none" stroke="${PAL.dia[1]}" stroke-width="2"/>` +
  F('M57 44A27 10 0 0 1 3 44C10 50 50 50 57 44Z', PAL.dia[1]) + roll(26, 31) + roll(34, 44) +
  `<ellipse cx="54" cy="16" rx="7.6" ry="4" fill="${CREAM[0]}" stroke-width="2.4"/>` + `<ellipse cx="54" cy="16" rx="4.6" ry="2" fill="#9a4a24" stroke-width="1.6"/>` +
  hilite(51.4, 14.6, 1.6, 0.6, 0.7))

// Bún thịt nướng: tô bún, thịt nướng, rau.
const mon_bun_thit_nuong = svg(ground(32, 58, 25, 3) +
  P('M7 31C9 24 18 21.6 32 21.6C46 21.6 55 24 57 31Z', '#f6f1e2', 2.4) +
  L('M12 29q3-3 6 0t6 0t6 0t6 0t6 0t6 0', '#d8ccb0', 1.6) +
  P('M13 26L23 21L28 27L18 31Z', '#b8562e', 2) + P('M29 24L39 20L43 26.6L33 30Z', '#c8643a', 2) +
  L('M17 25L21 28M19.4 23.4L23.4 26.6M33 23.6L37 26.6M35.6 22.4L39.6 25.6', '#7a3418', 1.4) +
  P('M44 28C44 22 50 19 55 21C53 25.6 49 28 44 28Z', LEAF[0], 1.8) + P('M8.6 28C10 24 14 22.6 17 23.6C15 26.6 12 28 8.6 28Z', LEAF[0], 1.8) +
  L('M45 30.6L50 26.6M48 31L53.4 27.6', ORANGE[0], 2) + dots([[26, 30], [30, 30.6], [38, 29.6], [41, 30.4]], '#b9773e', 1.2) +
  T({
    o: 'M4 30H60C60 45 48 55 32 55C16 55 4 45 4 30Z', c: ['#fffdf6', '#e7dcc6'],
    s: 'M60 30C60 45 48 55 32 55C43 51 52 43 54.6 30Z', d: L('M8.6 39Q32 47 55.4 39', BLUE[0], 2.6), h: W('M9.4 35Q12 44 19 49', 2.2, '.7')
  }))

// Chè ba màu: ly ba lớp, nước cốt dừa, đá.
const mon_che_ba_mau = svg(ground(32, 58, 16, 3) +
  stick('M42 2L36.6 20', 2.4, STEEL[0]) +
  P('M17 9H47L43 55H21Z', GLASS[0], 'stroke="none"') +
  F('M19.6 40H44.4L43 55H21Z', '#f2c14e') + F('M18.8 30H45.2L44.4 40H19.6Z', '#b8433a') + F('M18 20H46L45.2 30H18.8Z', '#7cc35a') +
  F('M17.4 14H46.6L46 20H18Z', '#fffdf6') +
  dots([[24, 34], [30, 36], [37, 33.6], [41, 36.6], [27, 31.6]], '#7a2a24', 1.3) + L('M22 24Q26 27 30 23M34 25Q38 28 42 24', '#4f9a3c', 1.6) +
  dots([[25, 47], [33, 50], [39, 45]], '#e0a032', 1.4) +
  rot(-12, 26, 12, P('M21 7H30V16H21Z', PAL.da_lanh[0], 1.8)) + rot(14, 38, 11, P('M34 6H42V14H34Z', PAL.da_lanh[0], 1.8)) +
  F('M43.6 9H47L43 55H40.4Z', GLASS[1], 'opacity=".55"') + W('M21 13L24.4 51', 2.4, '.75') +
  L('M17 9H47L43 55H21Z', INK, 3))

// ---------- Bảng xuất ----------

const RAW = {
  // (a) lối vào
  cho_cong_thuc, viec_hom_nay, diem_danh, hop_thu, so_cong_thuc, so_tay_nghe, cai_dat, su_kien, ganh_hang, kho_hiem,
  // (b) phần thưởng
  xu, muong_vang, ruong_dong, ruong_bac, ruong_vang, ruong_mo, manh_cong_thuc, tem, qua, thu, thu_mo, luot_gio_cho,
  // (c) điểm danh
  o_lich, dau_tick, ngay_7,
  // (d) danh hiệu
  huy_hieu_nen, danh_hieu, cup, sao_lon,
  // (e) sự kiện ngày, vật phẩm cửa hàng, sự kiện lễ, tình huống
  phieu_cho_som, bat_che_mua, troi_mua, nang_nong, lanh_luong, cho_phien, hoi_thi_xe_sach, don_van_phong, tai_tro_dai_ly,
  tat_gia, tien_dien_nuoc, cup_dien, trat_tu_do_thi, kiem_tra_attp, tri_an_20_11, phan_trang,
  ghi_no, tien_nghi_gia, gas_het, khach_quen_vi, ve_chai, doan_khach_hoi_duong, doi_y, shipper_chuyen_khoan,
  // (f) món tương lai
  mon_goi_cuon, mon_bun_thit_nuong, mon_che_ba_mau,
  // bí danh giữ id cũ của art.js
  ruong: ruong_dong, lich: diem_danh
}

// Làm tròn số hình học 1 chữ số (cộng số thực có thể ra 3.4000000000000004), gọn path; giữ scale(...).
const fixNum = v => v.replace(/(scale\([^)]*\))|(\d*\.\d{2,})/g, (m, sc, n) => sc || String(r1(+n)))
function fix(s) {
  return s.replace(/ (d|points|cx|cy|x|y|r|rx|ry|width|height|transform)="([^"]*)"/g, (m, k, v) => {
    const t = fixNum(v)
    return ` ${k}="${k === 'd' ? t.replace(/ -/g, '-').replace(/(^|[^\d.])0\.(\d)/g, '$1.$2') : t}"`
  })
}

/** id → SVG viewBox 64 (đóng băng). */
export const META_ART = deepFreeze(Object.fromEntries(Object.entries(RAW).map(([k, v]) => [k, v === TOOLS.muong_vang ? v : fix(v)])))

/** Nhóm id (để ráp màn và để test). */
export const META_GROUPS = deepFreeze({
  loi_vao: ['cho_cong_thuc', 'viec_hom_nay', 'diem_danh', 'hop_thu', 'so_cong_thuc', 'so_tay_nghe', 'cai_dat', 'su_kien', 'ganh_hang', 'kho_hiem'],
  thuong: ['xu', 'muong_vang', 'ruong_dong', 'ruong_bac', 'ruong_vang', 'ruong_mo', 'manh_cong_thuc', 'tem', 'qua', 'thu', 'thu_mo', 'luot_gio_cho'],
  diem_danh: ['o_lich', 'dau_tick', 'ngay_7'],
  danh_hieu: ['huy_hieu_nen', 'danh_hieu', 'cup', 'sao_lon'],
  su_kien: ['troi_mua', 'nang_nong', 'lanh_luong', 'cho_phien', 'hoi_thi_xe_sach', 'don_van_phong', 'tai_tro_dai_ly', 'tat_gia',
    'tien_dien_nuoc', 'cup_dien', 'trat_tu_do_thi', 'kiem_tra_attp', 'tri_an_20_11', 'ghi_no', 'tien_nghi_gia', 'gas_het',
    'khach_quen_vi', 've_chai', 'doan_khach_hoi_duong', 'doi_y', 'shipper_chuyen_khoan'],
  vat_pham: ['phieu_cho_som', 'bat_che_mua', 'phan_trang'],
  mon_tuong_lai: ['mon_goi_cuon', 'mon_bun_thit_nuong', 'mon_che_ba_mau'],
  // 19 hình meta cũ của art.js (vẽ lại cùng id) + 3 món tương lai
  hinh_cu: ['phieu_cho_som', 'bat_che_mua', 'troi_mua', 'nang_nong', 'lanh_luong', 'cho_phien', 'hoi_thi_xe_sach', 'don_van_phong',
    'tai_tro_dai_ly', 'tat_gia', 'tien_dien_nuoc', 'cup_dien', 'trat_tu_do_thi', 'kiem_tra_attp', 'thu', 'ruong', 'lich',
    'phan_trang', 'danh_hieu', 'mon_goi_cuon', 'mon_bun_thit_nuong', 'mon_che_ba_mau']
})

/** id sự kiện ngày / lễ / tình huống → id hình. */
export const EVENT_ART = deepFreeze({
  // sự kiện ngày (src/data/day-events.js)
  troi_mua: 'troi_mua', nang_nong: 'nang_nong', lanh_luong: 'lanh_luong', cho_phien: 'cho_phien', hoi_thi_xe_sach: 'hoi_thi_xe_sach',
  don_van_phong: 'don_van_phong', tai_tro_dai_ly: 'tai_tro_dai_ly', tat_gia: 'tat_gia', tien_dien_nuoc: 'tien_dien_nuoc',
  cup_dien: 'cup_dien', trat_tu_do_thi: 'trat_tu_do_thi', kiem_tra_attp: 'kiem_tra_attp',
  // sự kiện lễ (src/data/events.js)
  tri_an_20_11: 'tri_an_20_11', tri_an_20_11_chuoi: 'tri_an_20_11',
  // tình huống trong ca (src/data/incidents.js)
  khach_mo_hang: 'xu', ghi_no: 'ghi_no', doi_y: 'doi_y', tien_nghi_gia: 'tien_nghi_gia', shipper_chuyen_khoan: 'shipper_chuyen_khoan',
  gas_het: 'gas_het', khach_quen_vi: 'khach_quen_vi', ve_chai: 've_chai', doan_khach_hoi_duong: 'doan_khach_hoi_duong',
  khach_que_gui_qua: 'qua', nguoi_ban_dao: 'ganh_hang'
})

/** Tên màn (router) → hình lối vào màn Chuẩn bị. */
export const ENTRY_ART = deepFreeze({
  shop: 'cho_cong_thuc', quests: 'viec_hom_nay', checkin: 'diem_danh', mailbox: 'hop_thu', 'recipe-book': 'so_cong_thuc',
  notebook: 'so_tay_nghe', settings: 'cai_dat', event: 'su_kien', market: 'ganh_hang', rare: 'kho_hiem'
})

/** Khóa Reward (data/checkin.js) → hình; items / rare dùng icon của vật phẩm. */
export const REWARD_ART = deepFreeze({
  money: 'xu', incomeMul: 'xu', gold: 'muong_vang', rep: 'sao_lon', cosmetic: 'qua', title: 'danh_hieu', recipe: 'so_cong_thuc',
  tem: 'tem', tipId: 'so_tay_nghe', unlock: 'kho_hiem', fragments: 'manh_cong_thuc', chest: 'ruong_dong'
})

const has = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k)
const SIL = new Map()

/** Bóng mờ: màu → nâu xám, bỏ điểm sáng; giữ viền mực, bóng đất. */
function silhouette(s) {
  return s.replace(/<(?:path|ellipse|circle|rect)\b[^>]*(?:fill|stroke)="#fff"[^>]*\/>/g, '')
    .replace(/fill="#(?!3a2618")[0-9a-f]{6}"/g, 'fill="#d3c6b0"')
    .replace(/stroke="#(?!3a2618")[0-9a-f]{6}"/g, 'stroke="#b6a68b"')
    .replace(/ fill-opacity="[^"]*"/g, '')
}

/** SVG theo id (META_ART, rồi EVENT_ART); thiếu thì ''. opts.silhouette: bản bóng mờ. */
export function metaArt(id, opts = null) {
  const key = has(META_ART, id) ? id : has(EVENT_ART, id) ? EVENT_ART[id] : null
  if (!key) return ''
  if (!(opts && opts.silhouette)) return META_ART[key]
  if (!SIL.has(key)) SIL.set(key, silhouette(META_ART[key]))
  return SIL.get(key)
}
