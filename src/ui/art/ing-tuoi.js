// Hình nguyên liệu tươi M5 (rau, quả, trứng) kèm hình trạng thái sau sơ chế. Thuần, import trong Node được.
// Mọi hình viewBox 0 0 64 64, theo quy chuẩn ở kit.js. Lòng đỏ dùng var(--yolk, …) để trứng gà ta dùng chung khuôn trứng:
// khung chứa đặt --yolk là đổi màu lòng đỏ, không cần vẽ thêm hình.

import {
  DETAIL, PAL, svg, ground, hilite, tone3, rareStar, dots, r1,
  rotPts, sampleCubics, cubicsD, crescent, ellipseShade, ball, polyD
} from './kit.js'

const YOLK = 'var(--yolk,#f6b21a)'
const YOLK_GA_TA = 'var(--yolk,#e8730c)'
// Mảng tối của lòng đỏ là lớp phủ nâu cam trong suốt: hợp với mọi màu --yolk.
const YOLK_SHADE = 'fill="#a8430a" opacity=".32"'

// ---------- Khuôn trứng ----------

// Các đoạn Bézier của quả trứng tâm (cx, cy), nửa rộng w, nửa cao h, xoay rot độ (đầu nhỏ ở trên).
function eggSegs(cx, cy, w, h, rot = 0) {
  const P = (x, y) => [cx + x * w, cy + y * h]
  const segs = [
    [P(0, -1), P(0.72, -1), P(1, -0.15), P(1, 0.25)],
    [P(1, 0.25), P(1, 0.78), P(0.56, 1), P(0, 1)],
    [P(0, 1), P(-0.56, 1), P(-1, 0.78), P(-1, 0.25)],
    [P(-1, 0.25), P(-1, -0.15), P(-0.72, -1), P(0, -1)]
  ]
  return segs.map(s => rotPts(s, rot, cx, cy))
}

/** Quả trứng đủ ba tông: c = [nền, tối, sáng]; spots: đốm lấm tấm (tọa độ tương đối −1..1). */
function egg(cx, cy, w, h, rot, c, { spots = [], spotFill = '', k = 0.24 } = {}) {
  const segs = eggSegs(cx, cy, w, h, rot)
  const d = cubicsD(segs)
  const shade = crescent(sampleCubics(segs, 10), w * k, h * k * 0.8)
  const sp = spots.length ? dots(rotPts(spots.map(([x, y, r]) => [cx + x * w, cy + y * h]), rot, cx, cy)
    .map((p, i) => [p[0], p[1], spots[i][2] || 1]), spotFill, 1, 0.75) : ''
  const shine = hilite(cx - w * 0.42, cy - h * 0.4, w * 0.2, h * 0.3, 0.6, 20 + rot) +
    hilite(cx - w * 0.55, cy + h * 0.02, w * 0.08, w * 0.08, 0.6)
  return tone3({ outline: d, base: c[0], dark: c[1], shade, detail: sp, shine })
}

// ---------- Dưa leo ----------

// Thân dưa leo dạng viên nhộng đầu hơi thuôn: tâm (cx, cy), nửa dài a, nửa dày b, xoay rot.
function capsuleSegs(cx, cy, a, b, rot) {
  const L = (p, q) => [p, [p[0] + (q[0] - p[0]) / 3, p[1] + (q[1] - p[1]) / 3], [p[0] + 2 * (q[0] - p[0]) / 3, p[1] + 2 * (q[1] - p[1]) / 3], q]
  const P = (x, y) => [cx + x, cy + y]
  const e = a - b
  const segs = [
    L(P(-e, -b), P(e, -b)),
    [P(e, -b), P(e + b * 0.75, -b), P(a, -b * 0.55), P(a, 0)],
    [P(a, 0), P(a, b * 0.55), P(e + b * 0.75, b), P(e, b)],
    L(P(e, b), P(-e, b)),
    [P(-e, b), P(-e - b * 0.8, b), P(-a, b * 0.5), P(-a, 0)],
    [P(-a, 0), P(-a, -b * 0.5), P(-e - b * 0.8, -b), P(-e, -b)]
  ]
  return segs.map(s => rotPts(s, rot, cx, cy))
}

// Lát dưa leo nhìn hơi nghiêng: mặt cắt (vỏ xanh đậm, thịt xanh nhạt, ruột có vòng hạt) trên một cạnh dày.
// Vòng hạt vẽ bằng nét đứt hai lớp (viền xanh, lõi kem) cho gọn chuỗi SVG.
function cucSlice(x, y, rx, ry, sw = 2.4, full = true) {
  const sr = `rx="${r1(rx * 0.34)}" ry="${r1(ry * 0.34)}" fill="none" stroke-dasharray=".1 2.9"`
  return `<g transform="translate(${r1(x)} ${r1(y)})" stroke-width="${sw}">` +
    `<ellipse cy="2.2" rx="${rx}" ry="${ry}" fill="${PAL.dua[1]}"/>` +
    `<ellipse rx="${rx}" ry="${ry}" fill="${PAL.dua[0]}"/>` +
    `<ellipse rx="${r1(rx - 2)}" ry="${r1(ry - 2)}" fill="${PAL.ruot_dua[0]}" stroke="none"/>` +
    (full ? `<path d="${ellipseShade(0, 0, rx - 2, ry - 2, 0.22)}" fill="${PAL.ruot_dua[1]}" stroke="none"/>` : '') +
    `<ellipse rx="${r1(rx * 0.5)}" ry="${r1(ry * 0.5)}" fill="#f6fbe0" stroke="none"/>` +
    `<ellipse ${sr} stroke="#8fbf5c" stroke-width="2.4"/>` +
    (full ? `<ellipse ${sr} stroke="#fffdf0" stroke-width="1.2"/>` : '') +
    hilite(-rx * 0.45, -ry * 0.5, rx * 0.22, ry * 0.12, 0.7) + '</g>'
}

function cucumber(cx, cy, a, b, rot) {
  const segs = capsuleSegs(cx, cy, a, b, rot)
  const d = cubicsD(segs)
  const shade = crescent(sampleCubics(segs, 8), 3.2, 3.6)
  // Sọc sáng và gai nhỏ chạy dọc thân (tính trong hệ trục của quả rồi xoay).
  const line = (y, x0, x1) => polyD(rotPts([[cx + x0, cy + y], [cx + x1, cy + y]], rot, cx, cy), false)
  const detail = `<path d="${line(-4.6, -a + 8, a - 8)}${line(1.4, -a + 7, a - 9)}" stroke="${PAL.dua[2]}" stroke-width="2" opacity=".55" fill="none"/>` +
    `<path d="${line(-1.6, -a + 9, a - 9)}${line(4.4, -a + 11, a - 10)}" stroke="#2c6a25" stroke-width="1.9" stroke-dasharray=".1 6.4" fill="none"/>`
  const shine = `<path d="${line(-6.2, -a + 9, a - 13)}" stroke="#fff" stroke-width="2.4" opacity=".55" fill="none"/>`
  // Núm cuống ở đầu trên-phải, vết hoa khô ở đầu dưới-trái.
  const [stem] = rotPts([[cx + a - 0.5, cy]], rot, cx, cy)
  const [tip] = rotPts([[cx - a + 0.8, cy]], rot, cx, cy)
  return tone3({ outline: d, base: PAL.dua[0], dark: PAL.dua[1], shade, detail, shine }) +
    `<circle cx="${r1(stem[0])}" cy="${r1(stem[1])}" r="2.6" fill="#8a6a3a" stroke-width="${DETAIL}"/>` +
    `<circle cx="${r1(tip[0])}" cy="${r1(tip[1])}" r="2" fill="#e9c75a" stroke-width="${DETAIL}"/>`
}

const dua_leo = svg(
  ground(31, 57, 24, 3.6) +
  cucumber(28, 30, 25.5, 10, -36) +
  cucSlice(45.5, 44, 11.5, 9.5))

// Đĩa dưa leo thái lát: đĩa trắng nhìn nghiêng, các lát xếp hai hàng.
const dua_leo_lat = svg(
  ground(32, 57.5, 27, 3.4) +
  // Đĩa: một bóng dáng gồm mặt trên và cạnh dày (một viền ngoài), mép mặt trên nét mảnh, lòng đĩa.
  `<path d="M4 40.6A28 12.5 0 0 1 60 40.6V44.4A28 12.5 0 0 1 4 44.4Z" fill="${PAL.dia[1]}"/>` +
  `<ellipse cx="32" cy="40.6" rx="27.2" ry="11.8" fill="${PAL.dia[0]}" stroke="#cbbca2" stroke-width="1.6"/>` +
  `<ellipse cx="32" cy="41.5" rx="20" ry="8" fill="none" stroke="#ddd2bd" stroke-width="${DETAIL}"/>` +
  hilite(14, 37, 4, 1.6, 0.8, -15) +
  cucSlice(20, 33, 8.6, 7.2, 2.2, false) + cucSlice(32, 30.5, 8.6, 7.2, 2.2, false) + cucSlice(44, 33, 8.6, 7.2, 2.2, false) +
  cucSlice(26, 40.5, 8.6, 7.2, 2.2) + cucSlice(38.5, 40.5, 8.6, 7.2, 2.2))

// ---------- Trứng gà ----------

const trung_ga = svg(
  ground(33, 57.5, 16, 3.4) +
  egg(32, 32.5, 18, 23.5, 12, PAL.vo_ga, { spots: [[0.35, -0.2, 0.9], [0.55, 0.3, 0.8], [0.1, 0.55, 0.8], [-0.3, 0.6, 0.7]], spotFill: '#c9875a' }))

// Trứng nứt: vết nứt răng cưa lộ lòng trong, hai mảnh vỏ nhỏ bắn ra.
const crackPts = [[13.5, 28], [19, 31.5], [23, 26.5], [28, 32], [32, 27], [37, 32.5], [41, 27.5], [47, 31]]
const crackBack = [[47, 32.6], [41, 29.5], [37, 34.3], [32, 29], [28, 34], [23, 28.6], [19, 33.6], [13.8, 30]]
const trung_ga_nut = svg(
  ground(33, 57.5, 16, 3.4) +
  egg(32, 33, 18, 23.5, 6, PAL.vo_ga, { spots: [[0.5, 0.35, 0.8], [0.1, 0.6, 0.8]], spotFill: '#c9875a' }) +
  `<path d="${polyD([...crackPts, ...crackBack])}" fill="${YOLK}" stroke-width="${DETAIL}"/>` +
  `<path d="M28 32.5 l-1.5 4.5 M37 33 l2 4 M23 27 l-2 -4" fill="none" stroke-width="1.5"/>` +
  `<path d="M51 18 l4 -2 l1 3.6Z M55 26 l3.5 .6 l-2 2.6Z" fill="${PAL.vo_ga[0]}" stroke-width="1.5"/>` +
  `<path d="M50 11 l2 -3 M56 13 l3 -1.5 M8 20 l-2.5 -2" fill="none" stroke-width="1.6"/>`)

// Lòng trắng trứng ốp la: bờ lượn sóng (đa giác mượt), mép giòn vàng nâu.
function wavy(cx, cy, rx, ry, amp, n = 30, ph = 0) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const k = 1 + amp * Math.sin(5 * a + ph) + amp * 0.6 * Math.sin(3 * a + 1.3 + ph)
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  let d = ''
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n]
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
    d += (i === 0 ? `M${r1(m[0])} ${r1(m[1])}` : '') + `Q${r1(q[0])} ${r1(q[1])} ${r1((q[0] + pts[(i + 2) % n][0]) / 2)} ${r1((q[1] + pts[(i + 2) % n][1]) / 2)}`
  }
  return d + 'Z'
}

/** Lòng đỏ vòm: màu theo --yolk, mảng tối phủ trong suốt, điểm sáng. */
function yolk(cx, cy, r, fill = YOLK) {
  return `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="${fill}"/>` +
    `<path d="${ellipseShade(cx, cy, r - 1.4, r - 1.4, 0.3)}" ${YOLK_SHADE} stroke="none"/>` +
    hilite(cx - r * 0.35, cy - r * 0.38, r * 0.34, r * 0.22, 0.75, -30) +
    hilite(cx + r * 0.1, cy - r * 0.55, r * 0.09, r * 0.09, 0.8)
}

const trung_ga_op_la = svg(
  ground(32, 57.5, 26, 3.4) +
  `<path d="${wavy(32, 34, 27, 21.5, 0.05)}" fill="#efb867"/>` +
  `<path d="${wavy(31.4, 33.4, 24.5, 19.2, 0.045, 30, 0.4)}" fill="${PAL.trung[2]}" stroke="none"/>` +
  `<path d="${ellipseShade(31.4, 33.6, 22, 17.2, 0.2)}" fill="${PAL.trung[1]}" opacity=".7" stroke="none"/>` +
  hilite(17, 26, 5, 2.4, 0.9, -35) +
  dots([[44, 26, 1.3], [46.5, 30, 0.9], [20, 44, 1]], '#f3e6cc') +
  yolk(30, 32, 10.5))

// ---------- Tắc ----------

function tacFruit(cx, cy, r, c, pores) {
  return ball(cx, cy, r, r, c, { k: 0.26, detail: dots(pores.map(([x, y]) => [cx + x * r, cy + y * r]), c[2], 0.75, 0.8) })
}

const LEAF = PAL.la
const tac = svg(
  ground(32, 57.5, 24, 3.6) +
  tacFruit(41.5, 31.5, 12.5, PAL.tac_xanh, [[0.3, 0.2], [0.5, -0.2], [0, 0.55], [-0.2, 0.15], [0.55, 0.45]]) +
  `<path d="M42 19.5 C42 16 43 13.5 45 12" fill="none" stroke-width="2.4"/>` +
  `<path d="M45 13 C47 6 54 3 60 4 C59 11 53 15.5 45 13Z" fill="${LEAF[0]}" stroke-width="2.4"/>` +
  `<path d="M45 13 C51 10.5 55 8 59 4.5 C59 11 53 15.5 45 13Z" fill="${LEAF[1]}" stroke="none"/>` +
  `<path d="M45 13 C51 10.5 55 8 59 4.5" fill="none" stroke-width="1.4"/>` +
  tacFruit(24, 39.5, 15.5, PAL.tac, [[0.3, 0.15], [0.55, -0.15], [0.1, 0.5], [-0.25, 0.3], [0.5, 0.5], [-0.5, 0.05]]) +
  `<path d="M22 24.5 l2.4 1.6 l2.6 -1.4 l-.6 2.8 l2 1.8 l-2.8 .3 l-1.3 2.5 l-1.1 -2.6 l-2.8 -.6 l2.2 -1.7Z" fill="${LEAF[1]}" stroke-width="1.5"/>`)

// Nửa quả tắc: mặt cắt (vỏ, cùi trắng, múi, hạt) đặt trên phần vỏ vòm phía dưới.
function tacHalf(cx, cy, rx, ry, depth) {
  const dome = `M${r1(cx - rx)} ${r1(cy)}C${r1(cx - rx)} ${r1(cy + depth * 0.8)} ${r1(cx - rx * 0.55)} ${r1(cy + depth)} ${r1(cx)} ${r1(cy + depth)}` +
    `C${r1(cx + rx * 0.55)} ${r1(cy + depth)} ${r1(cx + rx)} ${r1(cy + depth * 0.8)} ${r1(cx + rx)} ${r1(cy)}Z`
  const domeShade = `M${r1(cx + rx * 0.15)} ${r1(cy + depth * 0.98)}C${r1(cx + rx * 0.62)} ${r1(cy + depth * 0.96)} ${r1(cx + rx)} ${r1(cy + depth * 0.75)} ${r1(cx + rx)} ${r1(cy)}` +
    `L${r1(cx + rx * 0.6)} ${r1(cy)}C${r1(cx + rx * 0.6)} ${r1(cy + depth * 0.6)} ${r1(cx + rx * 0.4)} ${r1(cy + depth * 0.85)} ${r1(cx + rx * 0.15)} ${r1(cy + depth * 0.98)}Z`
  const seg = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2
    seg.push(`M${r1(cx + Math.cos(a) * rx * 0.12)} ${r1(cy + Math.sin(a) * ry * 0.12)}L${r1(cx + Math.cos(a) * rx * 0.7)} ${r1(cy + Math.sin(a) * ry * 0.7)}`)
  }
  return tone3({ outline: dome, base: PAL.tac[0], dark: PAL.tac[1], shade: domeShade }) +
    `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${PAL.tac[0]}"/>` +
    `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx * 0.86)}" ry="${r1(ry * 0.84)}" fill="${PAL.ruot_tac[2]}" stroke="none"/>` +
    `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx * 0.76)}" ry="${r1(ry * 0.74)}" fill="${PAL.ruot_tac[0]}" stroke="none"/>` +
    `<path d="${ellipseShade(cx, cy, rx * 0.76, ry * 0.74, 0.2)}" fill="${PAL.ruot_tac[1]}" stroke="none"/>` +
    `<path d="${seg.join('')}" stroke="${PAL.ruot_tac[2]}" stroke-width="1.4" fill="none"/>` +
    `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx * 0.13)}" ry="${r1(ry * 0.13)}" fill="${PAL.ruot_tac[2]}" stroke="none"/>` +
    `<ellipse cx="${r1(cx + rx * 0.4)}" cy="${r1(cy - ry * 0.2)}" rx="1.7" ry="1" fill="#fff8e0" stroke-width="1" transform="rotate(-20 ${r1(cx + rx * 0.4)} ${r1(cy - ry * 0.2)})"/>` +
    `<ellipse cx="${r1(cx - rx * 0.12)}" cy="${r1(cy + ry * 0.48)}" rx="1.5" ry=".9" fill="#fff8e0" stroke-width="1" transform="rotate(75 ${r1(cx - rx * 0.12)} ${r1(cy + ry * 0.48)})"/>` +
    hilite(cx - rx * 0.4, cy - ry * 0.35, rx * 0.2, ry * 0.12, 0.8, -20)
}

const tac_bo_doi = svg(
  ground(32, 57.5, 25, 3.4) +
  tacHalf(43, 28, 12.5, 9, 14) +
  tacHalf(23, 37, 16, 11.5, 18) +
  `<path d="M51 47 C51 44 53 41.5 54 40 C55 41.5 57 44 57 47 C57 49 55.6 50.3 54 50.3 C52.4 50.3 51 49 51 47Z" fill="#ffd96a" stroke-width="1.6"/>` +
  hilite(53, 45.6, 0.9, 1.6, 0.8))

// ---------- Hành lá ----------

// Một cọng lá: ống tròn vẽ bằng nét chồng (viền mực, nền, mảng sáng), đầu lá bo tròn.
function stalk(d, w = 5.6) {
  return `<path d="${d}" fill="none" stroke-width="${r1(w + 4.4)}"/>` +
    `<path d="${d}" fill="none" stroke="${PAL.hanh[1]}" stroke-width="${r1(w)}"/>` +
    `<path d="${d}" fill="none" stroke="${PAL.hanh[0]}" stroke-width="${r1(w * 0.55)}" transform="translate(-1.1 -.3)"/>` +
    `<path d="${d}" fill="none" stroke="#fff" stroke-width="1.1" opacity=".55" transform="translate(-1.9 -.5)"/>`
}

const hanh_la = svg(
  ground(30, 57.5, 23, 3.4) +
  `<g transform="rotate(24 32 34)">` +
  stalk('M31.6 44C32 33 32.6 24 34.4 13', 5) +
  stalk('M26.5 44C25 32 21 21 14.8 12.4') +
  stalk('M29.5 44C29 31 27.6 18 27.2 7.4') +
  stalk('M33.4 44C34 31 36.4 19.6 40.4 9.6') +
  stalk('M36 44C38.4 33 42.2 26.4 47.6 22.2C50.6 20 53.2 20.8 53.6 23.8') +
  // Gốc trắng, rễ, dây buộc đỏ.
  `<path d="M24.6 44H39.4V53C39.4 57 36.2 58.6 32 58.6C27.8 58.6 24.6 57 24.6 53Z" fill="${PAL.hanh_trang[0]}"/>` +
  `<path d="M34.6 45.5H37.9V53C37.9 55.5 36.2 57 33.9 57.3C35.1 55 34.6 50 34.6 45.5Z" fill="${PAL.hanh_trang[1]}" stroke="none"/>` +
  hilite(28, 50, 1.2, 4, 0.9) +
  `<path d="M28 58.5l-1.5 3.5M31 59l-.4 3.8M34 59l.8 3.6M37 58l1.8 3" fill="none" stroke-width="1.6"/>` +
  `<rect x="23.2" y="40.4" width="17.6" height="5.6" rx="2.4" fill="${PAL.do[0]}" stroke-width="2.4"/>` +
  hilite(27, 42.2, 2.6, 0.9, 0.7) +
  `</g>`)

// ---------- Trứng gà ta (hàng hiếm ★) ----------
// Ổ rơm, một quả nguyên lấm tấm và nửa vỏ đựng lòng đỏ màu cam đậm (dùng chung khuôn trứng và lòng đỏ --yolk).

function halfShell(cx, cy, w, h) {
  // Nửa dưới quả trứng với mép vỏ răng cưa ở trên.
  const zig = []
  const n = 7
  for (let i = 0; i <= n; i++) zig.push([cx + w - (2 * w * i) / n, cy + (i % 2 ? -2.6 : 0.6)])
  const bottom = `M${r1(cx - w)} ${r1(cy)}C${r1(cx - w)} ${r1(cy + h * 0.8)} ${r1(cx - w * 0.55)} ${r1(cy + h)} ${r1(cx)} ${r1(cy + h)}` +
    `C${r1(cx + w * 0.55)} ${r1(cy + h)} ${r1(cx + w)} ${r1(cy + h * 0.8)} ${r1(cx + w)} ${r1(cy)}`
  return `<path d="${bottom}${zig.map(p => 'L' + r1(p[0]) + ' ' + r1(p[1])).join('')}Z" fill="${PAL.vo_ga_ta[0]}"/>` +
    `<path d="M${r1(cx + w * 0.2)} ${r1(cy + h * 0.96)}C${r1(cx + w * 0.7)} ${r1(cy + h * 0.9)} ${r1(cx + w - 1.5)} ${r1(cy + h * 0.6)} ${r1(cx + w - 1.5)} ${r1(cy + 1.5)}` +
    `L${r1(cx + w * 0.55)} ${r1(cy + 1.5)}C${r1(cx + w * 0.55)} ${r1(cy + h * 0.6)} ${r1(cx + w * 0.4)} ${r1(cy + h * 0.85)} ${r1(cx + w * 0.2)} ${r1(cy + h * 0.96)}Z" fill="${PAL.vo_ga_ta[1]}" stroke="none"/>` +
    `<ellipse cx="${r1(cx)}" cy="${r1(cy - 0.6)}" rx="${r1(w * 0.86)}" ry="${r1(h * 0.18)}" fill="${PAL.trung[2]}" stroke-width="1.6"/>`
}

const trung_ga_ta = svg(
  ground(32, 58, 26, 3.4) +
  `<ellipse cx="32" cy="44" rx="26.5" ry="8.5" fill="${PAL.rom[1]}"/>` +
  `<path d="M12 43 q4 -3 8 -1 M22 40 q5 -2 9 0 M34 40 q5 -2 9 0 M45 42 q4 -2 7 1" fill="none" stroke="${PAL.rom[0]}" stroke-width="1.6"/>` +
  egg(21, 33, 11, 14.5, -8, PAL.vo_ga_ta, { spots: [[0.3, -0.25, 0.9], [0.55, 0.15, 0.8], [0, 0.35, 0.9], [-0.35, 0.05, 0.7], [0.3, 0.55, 0.8]], spotFill: '#9a5a3c' }) +
  halfShell(42, 39, 11.5, 12) +
  yolk(42, 36.4, 6.6, YOLK_GA_TA) +
  `<path d="M5.5 44 C8 54 19 58 32 58 C45 58 56 54 58.5 44 C52 49.5 42 51 32 51 C22 51 12 49.5 5.5 44Z" fill="${PAL.rom[0]}"/>` +
  `<path d="M10 49 l5 2.5 M17 51.6 l5 1.4 M26 53 l5 .5 M36 53 l5 -.6 M45 51.5 l5 -1.6 M52 48.6 l3.6 -2.2" fill="none" stroke="${PAL.rom[1]}" stroke-width="1.8"/>` +
  `<path d="M12 47 l6 2 M30 51.8 l6 0 M46 49.6 l5 -1.8" fill="none" stroke="${PAL.rom[2]}" stroke-width="1.5"/>` +
  // Vài cọng rơm thò ra hai bên ổ.
  `<path d="M7.4 46.4l-4.2-1.6M8.6 50.4l-4 2M56.6 46.2l4.2-1.8M55 50.6l3.8 2.2" fill="none" stroke-width="3.4"/>` +
  `<path d="M7.4 46.4l-4.2-1.6M8.6 50.4l-4 2M56.6 46.2l4.2-1.8M55 50.6l3.8 2.2" fill="none" stroke="${PAL.rom[0]}" stroke-width="1.4"/>` +
  rareStar(53, 11))

export const ING_TUOI = Object.freeze({ dua_leo, trung_ga, tac, hanh_la, trung_ga_ta })

export const ING_TUOI_STATES = Object.freeze({
  'dua_leo.lat': dua_leo_lat,
  'trung_ga.nut': trung_ga_nut,
  'trung_ga.op_la': trung_ga_op_la,
  'tac.bo_doi': tac_bo_doi
})
