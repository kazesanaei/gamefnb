// Hình nguyên liệu tươi M5 (rau, quả, trứng) kèm hình trạng thái sau sơ chế. Thuần, import trong Node được.
// Mọi hình viewBox 0 0 64 64, theo quy chuẩn ở kit.js. Lòng đỏ dùng var(--yolk, …) để trứng gà ta dùng chung khuôn trứng:
// khung chứa đặt --yolk là đổi màu lòng đỏ, không cần vẽ thêm hình.
// Hình trạng thái có khóa 'id.trạng_thái'. Tên trạng thái theo bước trong src/data/recipes.js:
//   rửa → sach; cách sơ chế (method) thai_lat → lat, thai_soi → soi, bao → bao, hat_luu → hat_luu;
//   gọt → got; đập trứng → nut / op_la_song; chiên → op_la (vừa), op_la_chay (cháy), long_dao, chin_ky (theo ghi chú);
//   bổ tắc → bo_doi; vắt → vat; bóc trứng cút → boc; áo bột → ao_bot; luộc → chin.

import {
  DETAIL, PAL, svg, ground, hilite, tone3, rareStar, dots, r1,
  rotPts, sampleCubics, cubicsD, crescent, ellipseShade, ellipsePts, ball, polyD
} from './kit.js'

const YOLK = 'var(--yolk,#f6b21a)'
const YOLK_GA_TA = 'var(--yolk,#e8730c)'
// Mảng tối của lòng đỏ là lớp phủ nâu cam trong suốt: hợp với mọi màu --yolk.
const YOLK_SHADE = 'fill="#a8430a" opacity=".32"'

// Bảng màu riêng của đồ tươi: [nền, tối, sáng].
const VO_VIT = ['#e2f1ee', '#b4d6ce', '#ffffff']
const VO_CUT = ['#f1e3c3', '#d5bd8f', '#fff8e4']
const LONG_TRANG = ['#fffcf2', '#e6dac2', '#ffffff']
const VO_HANH = ['#e3aa5c', '#b97b34', '#f8dca4']
const CHANH = ['#86c83e', '#5c9a29', '#c8ec8c']
const XOAI = ['#5fae42', '#3d8a2c', '#a9dc7a']
const RUOT_XOAI = ['#e4eb90', '#c2cc58', '#f8fbd6']
const RAM = ['#6fb64e', '#477f32', '#b9e394']
const HUNG = ['#92d65c', '#5fa63c', '#d3f3ab']
const BUOI = ['#aed14c', '#83a832', '#ddef98']
const CUI = ['#f8eac2', '#e2c98e', '#fffaea']
const CUI_CHIN = ['#dcebcf', '#b7d0a6', '#f6fcef']
const BOT = ['#fbfbf6', '#dedfd6', '#ffffff']
const NUOC_DA = '#bfe7f8'

// Số gọn cho đường tương đối: 0.5 → .5, -0.5 → -.5.
const n1 = v => String(r1(v)).replace(/^(-?)0\./, '$1.')

/** Nhiều chấm tròn gộp trong một path (mỗi chấm hai cung): gọn hơn nhiều thẻ <circle>. list: [[x, y, r]]. */
function dotsPath(list, fill, op = 1) {
  const d = list.map(([x, y, r]) => `M${n1(x - r)} ${n1(y)}a${n1(r)} ${n1(r)} 0 1 0 ${n1(2 * r)} 0a${n1(r)} ${n1(r)} 0 1 0 ${n1(-2 * r)} 0`).join('')
  return `<path d="${d}" fill="${fill}" stroke="none"${op < 1 ? ` opacity="${n1(op)}"` : ''}/>`
}

/** Đa giác khép kín bằng tọa độ tương đối (gọn chuỗi). Điểm làm tròn trước rồi mới lấy hiệu nên không cộng dồn sai số. */
function polyRel(pts) {
  const q = pts.map(([x, y]) => [r1(x), r1(y)])
  let d = `M${n1(q[0][0])} ${n1(q[0][1])}l`
  for (let i = 1; i < q.length; i++) {
    const dx = n1(q[i][0] - q[i - 1][0]), dy = n1(q[i][1] - q[i - 1][1])
    d += (i > 1 && dx[0] !== '-' ? ' ' : '') + dx + (dy[0] === '-' ? '' : ' ') + dy
  }
  return d + 'z'
}

// ---------- Trợ giúp chung cho hình trạng thái ----------

// Đĩa trắng nhìn nghiêng: một bóng dáng gồm mặt trên và cạnh dày (một viền ngoài), mép mặt trên nét mảnh, lòng đĩa.
function plate() {
  return `<path d="M4 40.6A28 12.5 0 0 1 60 40.6V44.4A28 12.5 0 0 1 4 44.4Z" fill="${PAL.dia[1]}"/>` +
    `<ellipse cx="32" cy="40.6" rx="27.2" ry="11.8" fill="${PAL.dia[0]}" stroke="#cbbca2" stroke-width="1.6"/>` +
    `<ellipse cx="32" cy="41.5" rx="20" ry="8" fill="none" stroke="#ddd2bd" stroke-width="${DETAIL}"/>` +
    hilite(14, 37, 4, 1.6, 0.8, -15)
}

/** Que/sợi (thái sợi): ba nét chồng của cùng một path (viền mực, ruột, vệt vỏ lệch lên trên-trái). list: [[x1, y1, x2, y2]]. */
function sticks(list, flesh, skin = '', w = 3.2) {
  const d = list.map(([a, b, c, e]) => `M${r1(a)} ${r1(b)}L${r1(c)} ${r1(e)}`).join('')
  return `<path d="${d}" fill="none" stroke-width="${r1(w + 3)}"/>` +
    `<path d="${d}" fill="none" stroke="${flesh}" stroke-width="${r1(w)}"/>` +
    (skin ? `<path d="${d}" fill="none" stroke="${skin}" stroke-width="1.3" transform="translate(-.6 -.9)"/>` : '')
}

/**
 * Khối nhìn nghiêng (hạt lựu, miếng lát dày): mặt trên sáng, mặt trái nền, mặt phải tối. list: [[x, y]] tâm mặt trên;
 * s: nửa đường chéo mặt trên; h: chiều cao khối. Mỗi lớp gộp thành 5 path nên các khối trong cùng lớp không được chồng nhau.
 */
function cubes(list, s, c, h = s, sw = 2) {
  const a = r1(s * 0.87), b = r1(s * 0.5), H = r1(h)
  const M = (x, y) => `M${r1(x)} ${r1(y)}`
  const hex = list.map(([x, y]) => `${M(x, y - b)}l${a} ${b}v${H}l${-a} ${b}l${-a} ${-b}v${-H}z`).join('')
  const top = list.map(([x, y]) => `${M(x, y - b)}l${a} ${b}l${-a} ${b}l${-a} ${-b}z`).join('')
  const right = list.map(([x, y]) => `${M(x, y + b)}l${a} ${-b}v${H}l${-a} ${b}z`).join('')
  const edge = list.map(([x, y]) => `${M(x - a, y)}l${a} ${b}l${a} ${-b}${M(x, y + b)}v${H}`).join('')
  return `<path d="${hex}" fill="${c[0]}" stroke="none"/><path d="${right}" fill="${c[1]}" stroke="none"/>` +
    `<path d="${top}" fill="${c[2]}" stroke="none"/><path d="${edge}" fill="none" stroke-width="1"/>` +
    `<path d="${hex}" fill="none" stroke-width="${sw}"/>`
}

/** Dải vỏ gọt ra: dải dẹt hai mặt (mặt ngoài màu vỏ, mép trong màu ruột) vẽ bằng nét chồng của cùng một path. */
function peel(d, skin, flesh, w = 4.6) {
  return `<path d="${d}" fill="none" stroke-width="${r1(w + 3)}"/>` +
    `<path d="${d}" fill="none" stroke="${flesh}" stroke-width="${w}"/>` +
    `<path d="${d}" fill="none" stroke="${skin}" stroke-width="${r1(w * 0.55)}" transform="translate(-.5 -1)"/>`
}

/** Giọt nước (hoặc nước tắc): đầu nhọn ở trên, mép mực mảnh, điểm sáng. */
function drop(x, y, s, fill = NUOC_DA) {
  const P = (u, v) => `${r1(x + u * s)} ${r1(y + v * s)}`
  return `<path d="M${P(0, -1.7)}C${P(0.35, -1)} ${P(1, -0.6)} ${P(1, 0)}A${r1(s)} ${r1(s)} 0 0 1 ${P(-1, 0)}` +
    `C${P(-1, -0.6)} ${P(-0.35, -1)} ${P(0, -1.7)}Z" fill="${fill}" stroke-width="1.4"/>` +
    hilite(x - s * 0.35, y - s * 0.2, s * 0.22, s * 0.38, 0.9)
}

/** Sao lấp lánh 4 cánh (đồ đã rửa sạch). */
function sparkle(x, y, r) {
  const k = r * 0.25
  const P = (u, v) => `${r1(x + u)} ${r1(y + v)}`
  return `<path d="M${P(0, -r)}Q${P(k, -k)} ${P(r, 0)}Q${P(k, k)} ${P(0, r)}Q${P(-k, k)} ${P(-r, 0)}Q${P(-k, -k)} ${P(0, -r)}Z" ` +
    `fill="#fff" stroke-width="1.4"/>`
}

/** Làn hơi/khói uốn lượn đi lên từ (x, y). */
function wisp(x, y, color, op = 0.8) {
  return `<path d="M${r1(x)} ${r1(y)}c-3.2-2.6 2.6-4.6 0-7.6s2.6-4.8 0-7.8" fill="none" stroke="${color}" stroke-width="2.6" opacity="${String(op).replace(/^0/, '')}"/>`
}

/**
 * Lá mũi mác (rau răm, lá xoài) từ gốc (x0, y0) tới ngọn (x1, y1), nửa bề rộng w. Nhiều lá gộp chung một bộ path:
 * nền, nửa phía dưới-phải tối, gân giữa, viền. mark: đốm tía giữa lá (rau răm).
 */
function leaves(list, c, { sw = 2.4, mark = '' } = {}) {
  let out = '', half = '', rib = '', spot = ''
  for (const [x0, y0, x1, y1, w] of list) {
    const L = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / L, ny = (x1 - x0) / L
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
    const A = [mx + nx * w * 2, my + ny * w * 2], B = [mx - nx * w * 2, my - ny * w * 2]
    const p = q => `${r1(q[0])} ${r1(q[1])}`
    const base = [x0, y0], tip = [x1, y1]
    out += `M${p(base)}Q${p(A)} ${p(tip)}Q${p(B)} ${p(base)}Z`
    const dark = nx + ny > 0 ? A : B         // nửa lá xa nguồn sáng (trên-trái)
    half += `M${p(base)}Q${p(dark)} ${p(tip)}Z`
    rib += `M${p(base)}L${p([x0 + (x1 - x0) * 0.82, y0 + (y1 - y0) * 0.82])}`
    if (mark) {
      const ang = r1(Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI)
      const cx = x0 + (x1 - x0) * 0.45, cy = y0 + (y1 - y0) * 0.45
      spot += `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(L * 0.13)}" ry="${r1(w * 0.42)}" fill="${mark}" stroke="none" ` +
        `transform="rotate(${ang} ${r1(cx)} ${r1(cy)})"/>`
    }
  }
  return `<path d="${out}" fill="${c[0]}" stroke="none"/><path d="${half}" fill="${c[1]}" stroke="none"/>` + spot +
    `<path d="${rib}" fill="none" stroke-width="1.2"/><path d="${out}" fill="none" stroke-width="${sw}"/>`
}

// Chén sứ nhìn nghiêng, chia hai phần để đặt đồ vào giữa: back = lòng chén (mặt nước), front = thân chén và mép trước.
function bowl(cx, cy, rx, ry, depth, inside, { body = PAL.dia, band = PAL.xanh_nhan[0] } = {}) {
  const L = r1(cx - rx), R = r1(cx + rx), B = r1(cy + depth)
  const shell = `M${L} ${cy}C${L} ${r1(cy + depth * 0.75)} ${r1(cx - rx * 0.6)} ${B} ${cx} ${B}` +
    `C${r1(cx + rx * 0.6)} ${B} ${R} ${r1(cy + depth * 0.75)} ${R} ${cy}A${rx} ${ry} 0 0 1 ${L} ${cy}Z`
  const shade = `M${r1(cx + rx * 0.2)} ${r1(B - 0.4)}C${r1(cx + rx * 0.7)} ${r1(B - 1.4)} ${r1(R - 0.6)} ${r1(cy + depth * 0.6)} ${r1(R - 0.6)} ${r1(cy + ry * 0.4)}` +
    `L${r1(cx + rx * 0.62)} ${r1(cy + ry * 0.9)}C${r1(cx + rx * 0.6)} ${r1(cy + depth * 0.6)} ${r1(cx + rx * 0.45)} ${r1(B - 2.2)} ${r1(cx + rx * 0.2)} ${r1(B - 0.4)}Z`
  return {
    back: `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${inside}"/>`,
    front: tone3({ outline: shell, base: body[0], dark: body[1], shade,
      detail: `<path d="M${r1(L + 1.4)} ${r1(cy + depth * 0.32)}C${r1(cx - rx * 0.5)} ${r1(cy + depth * 0.62)} ${r1(cx + rx * 0.5)} ${r1(cy + depth * 0.62)} ${r1(R - 1.4)} ${r1(cy + depth * 0.32)}" fill="none" stroke="${band}" stroke-width="2.2"/>`,
      shine: hilite(cx - rx * 0.62, cy + depth * 0.45, rx * 0.08, depth * 0.2, 0.8) })
  }
}

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
function egg(cx, cy, w, h, rot, c, { spots = [], spotFill = '', k = 0.24, n = 10, merge = false } = {}) {
  const segs = eggSegs(cx, cy, w, h, rot)
  const d = cubicsD(segs)
  const shade = crescent(sampleCubics(segs, n), w * k, h * k * 0.8)
  const pts = rotPts(spots.map(([x, y]) => [cx + x * w, cy + y * h]), rot, cx, cy).map((p, i) => [p[0], p[1], spots[i][2] || 1])
  // merge: gộp các đốm vào một path (hình mới); hình đã duyệt ở Đợt 0 giữ cách viết cũ để chuỗi SVG không đổi.
  const sp = !spots.length ? '' : merge ? dotsPath(pts, spotFill, 0.75) : dots(pts, spotFill, 1, 0.75)
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

// Dưa leo rửa sạch: quả nguyên bóng nước, giọt nước đọng trên vỏ và sao lấp lánh.
const dua_leo_sach = svg(
  ground(32, 57, 25, 3.6) +
  cucumber(32, 32, 27, 10.5, -32) +
  drop(24, 37, 2.2) + drop(37, 27.5, 1.9) + drop(44, 31, 1.6) + drop(19, 52, 2) + drop(50, 46, 1.8) +
  sparkle(12, 23, 4.6) + sparkle(54, 13, 4) + sparkle(56, 38, 3))

// Đĩa dưa leo thái lát: đĩa trắng nhìn nghiêng, các lát xếp hai hàng.
const dua_leo_lat = svg(
  ground(32, 57.5, 27, 3.4) + plate() +
  cucSlice(20, 33, 8.6, 7.2, 2.2, false) + cucSlice(32, 30.5, 8.6, 7.2, 2.2, false) + cucSlice(44, 33, 8.6, 7.2, 2.2, false) +
  cucSlice(26, 40.5, 8.6, 7.2, 2.2) + cucSlice(38.5, 40.5, 8.6, 7.2, 2.2))

// Dưa leo thái sợi: đống que dài ruột xanh nhạt, một mặt còn vệt vỏ xanh đậm.
const dua_leo_soi = svg(
  ground(32, 57.5, 27, 3.4) + plate() +
  sticks([[12, 37.5, 30, 32], [22, 30.5, 41, 33], [35, 30, 53, 35.5], [18, 34, 36, 37.5]], PAL.ruot_dua[0], PAL.dua[0]) +
  sticks([[11, 42, 29, 39.5], [26, 36.5, 45, 41.5], [38, 38, 54, 41], [16, 46, 34, 43], [31, 46.5, 49, 44]], PAL.ruot_dua[0], PAL.dua[0]))

// Dưa leo bào: các dải mỏng lượn sóng (rộng hơn sợi), mép còn viền vỏ xanh.
const ribbon = `M11 41q5-6 9.5 0t9.5 0t9.5 0M26 33q4.6-5 9.2 0t9.2 0t8.6 1.4M15 33.6q4.4 4 8.8-1.2t8.8 0`
const ribbon2 = `M18 47q4.6-5.4 9.2 0t9.2 0t9.2-1.4M30 41q4.4 4.8 8.8 0t8.8 1`
const dua_leo_bao = svg(
  ground(32, 57.5, 27, 3.4) + plate() +
  [ribbon, ribbon2].map(d => `<path d="${d}" fill="none" stroke-width="8.2"/>` +
    `<path d="${d}" fill="none" stroke="${PAL.ruot_dua[0]}" stroke-width="5.2"/>` +
    `<path d="${d}" fill="none" stroke="${PAL.dua[0]}" stroke-width="1.4" transform="translate(0 -2)"/>` +
    `<path d="${d}" fill="none" stroke="#fff" stroke-width="1.1" opacity=".7" transform="translate(0 .9)"/>`).join(''))

// ---------- Trứng gà ----------

const trung_ga = svg(
  ground(33, 57.5, 16, 3.4) +
  egg(32, 32.5, 18, 23.5, 12, PAL.vo_ga, { spots: [[0.35, -0.2, 0.9], [0.55, 0.3, 0.8], [0.1, 0.55, 0.8], [-0.3, 0.6, 0.7]], spotFill: '#c9875a' }))

// Trứng nứt: vết nứt răng cưa lộ lòng trong, hai mảnh vỏ nhỏ bắn ra (khuôn chung cho trứng gà và trứng gà ta).
const crackPts = [[13.5, 28], [19, 31.5], [23, 26.5], [28, 32], [32, 27], [37, 32.5], [41, 27.5], [47, 31]]
const crackBack = [[47, 32.6], [41, 29.5], [37, 34.3], [32, 29], [28, 34], [23, 28.6], [19, 33.6], [13.8, 30]]
function nutEgg(shell, yolkFill, spotFill) {
  return ground(33, 57.5, 16, 3.4) +
    egg(32, 33, 18, 23.5, 6, shell, { spots: [[0.5, 0.35, 0.8], [0.1, 0.6, 0.8]], spotFill }) +
    `<path d="${polyD([...crackPts, ...crackBack])}" fill="${yolkFill}" stroke-width="${DETAIL}"/>` +
    `<path d="M28 32.5 l-1.5 4.5 M37 33 l2 4 M23 27 l-2 -4" fill="none" stroke-width="1.5"/>` +
    `<path d="M51 18 l4 -2 l1 3.6Z M55 26 l3.5 .6 l-2 2.6Z" fill="${shell[0]}" stroke-width="1.5"/>` +
    `<path d="M50 11 l2 -3 M56 13 l3 -1.5 M8 20 l-2.5 -2" fill="none" stroke-width="1.6"/>`
}
const trung_ga_nut = svg(nutEgg(PAL.vo_ga, YOLK, '#c9875a'))

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

/**
 * Trứng ốp la theo độ chín: edge = màu mép chiên (viền ngoài), band = độ dày mép giòn thêm, white/shade = lòng trắng,
 * mid = lớp vẽ trước lòng đỏ, over = lớp phủ lên lòng đỏ, top = lớp trên cùng (khói, sao hàng hiếm).
 */
function friedEgg({ edge = '#efb867', band = 0, white = PAL.trung[2], shade = PAL.trung[1], mid = '', r = 10.5, yolkFill = YOLK, over = '', top = '' } = {}) {
  return ground(32, 57.5, 26, 3.4) +
    `<path d="${wavy(32, 34, 27, 21.5, 0.05)}" fill="${edge}"/>` +
    `<path d="${wavy(31.4, 33.4, 24.5 - band, 19.2 - band, 0.045, 30, 0.4)}" fill="${white}" stroke="none"/>` +
    `<path d="${ellipseShade(31.4, 33.6, 22 - band, 17.2 - band, 0.2)}" fill="${shade}" opacity=".7" stroke="none"/>` +
    hilite(17, 26, 5, 2.4, 0.9, -35) + mid +
    dots([[44, 26, 1.3], [46.5, 30, 0.9], [20, 44, 1]], '#f3e6cc') +
    yolk(30, 32, r, yolkFill) + over + top
}

// Năm biến thể chiên dùng chung cho trứng gà và trứng gà ta (khác màu lòng đỏ, gà ta thêm sao nhỏ).
function eggStates(yolkFill, star = '') {
  return {
    // Vừa đập vào chảo: lòng trắng còn trong (xám xanh nhạt), chưa có mép giòn, lòng đỏ căng mọng.
    op_la_song: friedEgg({ edge: '#e6eee9', white: '#f6f9f4', shade: '#d2ddd7', r: 11, yolkFill,
      mid: `<path d="M41 22q5 2 6.5 7M14 38q1 5 5 8" fill="none" stroke="#fff" stroke-width="1.8" opacity=".9"/>` +
        dots([[46, 40, 1.1], [17, 31, 0.9], [38, 47, 1]], '#fff'),
      over: hilite(27, 27, 3, 1.6, 0.9, -30), top: star }),
    // Ốp la vừa: mép vàng giòn, lòng đỏ bóng (trứng gà: đúng hình mẫu đã duyệt ở Đợt 0).
    op_la: friedEgg({ yolkFill, top: star }),
    // Cháy: mép nâu sẫm dày, vệt cháy đen, lòng trắng ngả vàng, lòng đỏ khô xỉn, khói xám bốc lên.
    op_la_chay: friedEgg({ edge: '#7a4019', band: 2.6, white: '#f8e9c8', shade: '#dcb67e', yolkFill,
      mid: dots([[8, 34, 1.5], [12, 46, 1.2], [22, 52, 1.4], [44, 51, 1.3], [54, 41, 1.5], [52, 24, 1.1], [36, 14, 1.3], [16, 20, 1.2]], '#2a1a10', 1, 0.7),
      over: `<circle cx="30" cy="32" r="10.5" fill="#7a4019" opacity=".3" stroke="none"/>`,
      top: wisp(14, 14, '#7d746c') + wisp(24, 10, '#7d746c', 0.6) + star }),
    // Lòng đào: lòng đỏ mềm bóng, ứa thành vũng loang ra lòng trắng.
    long_dao: friedEgg({ yolkFill,
      mid: `<path d="M21 37c-1 5 3 9.6 9.4 10.4c4 .6 6.4-.6 9.4 1.4c3.4 2.2 8.6 1.6 8.6-2.2c0-3-3.6-3.4-6-5.2c-2.4-1.8-2.4-5.4-3.4-7.6Z" fill="${yolkFill}" stroke-width="${DETAIL}"/>` +
        `<path d="M41 47.4c2 1 4.4 1 5.6-.2" fill="none" stroke="#fff" stroke-width="1.2" opacity=".75"/>`,
      over: hilite(26.5, 27.5, 3.6, 2, 0.95, -30), top: star }),
    // Chín kỹ: mép giòn vàng nâu, lòng đỏ phủ màng trắng đục, không còn bóng.
    chin_ky: friedEgg({ edge: '#d58c3c', band: 1.2, yolkFill,
      over: `<circle cx="30" cy="32" r="9" fill="#fff6e2" opacity=".5" stroke="none"/>`, top: star })
  }
}

// ---------- Trứng vịt (bẫy của trứng gà): quả to, thuôn dài, vỏ trắng xanh ----------

const trung_vit = svg(
  ground(32, 57.5, 19, 3.6) +
  egg(32, 30.8, 21.5, 26.5, -8, VO_VIT, { spots: [[0.35, -0.35, 1], [0.5, 0.2, 1.1], [0.1, 0.5, 0.9], [-0.25, 0.3, 0.8]], spotFill: '#94c4b9', merge: true }))

// ---------- Trứng cút: ba quả nhỏ, vỏ kem đốm nâu sẫm ----------

const cutSpots = [[0.3, -0.38, 1.8], [-0.32, 0.02, 1.5], [0.45, 0.22, 1.3], [0, 0.55, 1.7], [-0.45, -0.42, 1.1]]
const quail = (cx, cy, rot, c = VO_CUT, spots = cutSpots) => egg(cx, cy, 9.5, 12.5, rot, c, { spots, spotFill: '#5a3a22', n: 6, merge: true })
const trung_cut = svg(ground(32, 57.5, 23, 3.4) + quail(32, 28.5, 6) + quail(20.5, 43, -16) + quail(44, 43.5, 18))

// Trứng cút đã bóc: lòng trắng trơn bóng, vài mảnh vỏ lấm tấm vương quanh.
const shellBits = `<path d="M7 50l4.6-2.4l1.4 3.6l-3.8 1.6ZM55 50.5l3.4-3l1.6 4l-3.4.6ZM53 14l4-1.6l.4 3.8l-3 .4Z" fill="${VO_CUT[0]}" stroke-width="1.5"/>` +
  dots([[10, 50.2, 0.8], [57.2, 49.8, 0.8], [55.6, 14.4, 0.7]], '#5a3a22')
const trung_cut_boc = svg(ground(32, 57.5, 23, 3.4) +
  quail(32, 28.5, 6, LONG_TRANG, []) + quail(20.5, 43, -16, LONG_TRANG, []) + quail(44, 43.5, 18, LONG_TRANG, []) + shellBits)

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

// Nửa vỏ vòm phía dưới của quả bổ đôi (tắc, hành tây): bóng dáng + mảng tối bên phải.
function dome(cx, cy, rx, depth, c) {
  const d = `M${r1(cx - rx)} ${r1(cy)}C${r1(cx - rx)} ${r1(cy + depth * 0.8)} ${r1(cx - rx * 0.55)} ${r1(cy + depth)} ${r1(cx)} ${r1(cy + depth)}` +
    `C${r1(cx + rx * 0.55)} ${r1(cy + depth)} ${r1(cx + rx)} ${r1(cy + depth * 0.8)} ${r1(cx + rx)} ${r1(cy)}Z`
  const s = `M${r1(cx + rx * 0.15)} ${r1(cy + depth * 0.98)}C${r1(cx + rx * 0.62)} ${r1(cy + depth * 0.96)} ${r1(cx + rx)} ${r1(cy + depth * 0.75)} ${r1(cx + rx)} ${r1(cy)}` +
    `L${r1(cx + rx * 0.6)} ${r1(cy)}C${r1(cx + rx * 0.6)} ${r1(cy + depth * 0.6)} ${r1(cx + rx * 0.4)} ${r1(cy + depth * 0.85)} ${r1(cx + rx * 0.15)} ${r1(cy + depth * 0.98)}Z`
  return tone3({ outline: d, base: c[0], dark: c[1], shade: s })
}

// Nửa quả tắc: mặt cắt (vỏ, cùi trắng, múi, hạt) đặt trên phần vỏ vòm phía dưới.
function tacHalf(cx, cy, rx, ry, depth) {
  const seg = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2
    seg.push(`M${r1(cx + Math.cos(a) * rx * 0.12)} ${r1(cy + Math.sin(a) * ry * 0.12)}L${r1(cx + Math.cos(a) * rx * 0.7)} ${r1(cy + Math.sin(a) * ry * 0.7)}`)
  }
  return dome(cx, cy, rx, depth, PAL.tac) +
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

// Tắc đã vắt: nửa vỏ bẹp nhăn (ruột nhạt, múi xẹp) nhỏ giọt vào chén nước tắc vàng có hạt.
function squeezed(cx, cy, rx, ry, rot) {
  const seg = []
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4
    seg.push(`M${r1(cx)} ${r1(cy)}l${r1(Math.cos(a) * rx * 0.62)} ${r1(Math.sin(a) * ry * 0.6)}`)
  }
  return `<g transform="rotate(${rot} ${cx} ${cy})">` + dome(cx, cy, rx, ry * 1.2, PAL.tac) +
    `<path d="${wavy(cx, cy, rx, ry, 0.06, 12, 1)}" fill="${PAL.tac[0]}"/>` +
    `<path d="${wavy(cx, cy, rx * 0.8, ry * 0.74, 0.08, 10, 2)}" fill="${PAL.ruot_tac[2]}" stroke="none"/>` +
    `<path d="${seg.join('')}" fill="none" stroke="${PAL.ruot_tac[1]}" stroke-width="1.4"/>` +
    hilite(cx - rx * 0.45, cy - ry * 0.4, rx * 0.2, ry * 0.14, 0.8) + '</g>'
}
const tacBowl = bowl(32, 42, 19, 5.6, 14, PAL.ruot_tac[0])
const tac_vat = svg(
  ground(32, 57.5, 23, 3.4) +
  tacBowl.back +
  `<path d="${ellipseShade(32, 42, 17.6, 4.6, 0.3)}" fill="${PAL.ruot_tac[1]}" stroke="none"/>` +
  `<ellipse cx="26" cy="41.4" rx="1.8" ry="1" fill="#fff8e0" stroke-width="1"/><ellipse cx="38" cy="43" rx="1.6" ry=".9" fill="#fff8e0" stroke-width="1"/>` +
  hilite(22, 40.6, 3, 1, 0.8) + tacBowl.front +
  squeezed(28, 15, 14.4, 8.6, -12) +
  drop(33, 31.6, 1.9, PAL.ruot_tac[0]) + drop(42, 27.4, 1.5, PAL.ruot_tac[0]) +
  `<path d="M47 12l4.4-2M48.4 17.6l4.6.4M45 7.6l2.6-3" fill="none" stroke-width="1.6"/>`)

// ---------- Chanh (bẫy của tắc): quả bầu dục có núm, xanh lá, không có lá ----------

function lime(cx, cy, a, b, rot) {
  const P = (x, y) => [cx + x, cy + y]
  const segs = [
    [P(-a, 0), P(-a, -b * 0.6), P(-a * 0.55, -b), P(0, -b)],
    [P(0, -b), P(a * 0.6, -b), P(a * 0.95, -b * 0.5), P(a + 0.4, -2.6)],
    [P(a + 0.4, -2.6), P(a + 2, -2.4), P(a + 4.2, -2), P(a + 4.2, 0)],
    [P(a + 4.2, 0), P(a + 4.2, 2), P(a + 2, 2.4), P(a + 0.4, 2.6)],
    [P(a + 0.4, 2.6), P(a * 0.95, b * 0.5), P(a * 0.6, b), P(0, b)],
    [P(0, b), P(-a * 0.55, b), P(-a, b * 0.6), P(-a, 0)]
  ].map(s => rotPts(s, rot, cx, cy))
  const pores = rotPts([[0.3, 0.2], [0.55, -0.15], [0.05, 0.55], [-0.3, 0.25], [0.6, 0.45], [-0.55, -0.1], [0.2, -0.45]]
    .map(([x, y]) => [cx + x * a, cy + y * b]), rot, cx, cy)
  const [hl] = rotPts([[cx - a * 0.4, cy - b * 0.48]], rot, cx, cy)
  const [st] = rotPts([[cx - a + 1.4, cy]], rot, cx, cy)
  return tone3({ outline: cubicsD(segs), base: CHANH[0], dark: CHANH[1],
    shade: crescent(ellipsePts(cx, cy, a, b, 32, rot), a * 0.24, b * 0.32),
    detail: dots(pores, CHANH[2], 0.8, 0.85),
    shine: hilite(hl[0], hl[1], a * 0.26, b * 0.17, 0.6, rot - 12) }) +
    `<circle cx="${r1(st[0])}" cy="${r1(st[1])}" r="1.5" fill="#9a8a3e" stroke-width="1.2"/>`
}
const chanh = svg(ground(32, 57.5, 24, 3.6) + lime(41, 22, 13.5, 11, -28) + lime(27, 40, 18.5, 14.5, -12))

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

// ---------- Hành tây (bẫy của hành lá): củ tròn vỏ vàng nâu, đầu túm khô, rễ; nửa củ cắt lộ các vòng ----------

const onionSegs = [
  [[27.5, 14], [30, 20], [44, 23], [44, 37]],
  [[44, 37], [44, 50], [36, 55], [26, 55]],
  [[26, 55], [16, 55], [8, 49], [8, 37]],
  [[8, 37], [8, 23], [23, 20], [25, 14]],
  [[25, 14], [25.5, 13], [27, 13], [27.5, 14]]
]
const hanh_tay = svg(
  ground(32, 57.5, 25, 3.6) +
  `<path d="M24 56l-2 3.2M27 56.4v3.6M30 56l2 3.2" fill="none" stroke-width="1.6"/>` +
  `<path d="M25 14.5C24.4 10 26 6.5 29.6 3.6C30.4 7.6 29.4 11 27.6 14.5Z" fill="#c99556" stroke-width="2.2"/>` +
  tone3({ outline: cubicsD(onionSegs), base: VO_HANH[0], dark: VO_HANH[1], shade: crescent(sampleCubics(onionSegs, 6), 4.6, 4.2),
    detail: `<path d="M26.3 15.5C19 25 16.5 43 23 54.4M26.3 15.5C34 25 37 42 30.6 54.5M26.3 15.5C26 28 26 42 26.2 55" fill="none" stroke="${VO_HANH[1]}" stroke-width="1.5" opacity=".8"/>`,
    shine: hilite(16, 31, 3.2, 6, 0.55, 18) }) +
  dome(46, 45, 12.5, 7, VO_HANH) +
  `<ellipse cx="46" cy="45" rx="12.5" ry="8.4" fill="#fdf6e6"/>` +
  `<ellipse cx="46" cy="45" rx="9.6" ry="6.2" fill="none" stroke="#dcc387" stroke-width="1.4"/>` +
  `<ellipse cx="46" cy="45" rx="6.4" ry="4" fill="#f8ecc8" stroke="#dcc387" stroke-width="1.4"/>` +
  `<ellipse cx="46" cy="45" rx="3" ry="1.8" fill="#fdf6e6" stroke="#dcc387" stroke-width="1.3"/>` +
  hilite(40, 41.6, 2.6, 1, 0.9))

// ---------- Xoài xanh ----------

// Quả xoài dáng quả thận: vai tròn ở cuống, bụng phình một bên, mỏ nhọn lệch ở đáy. Mảng tối tính trên ellipse lồi nằm trong quả.
function mangoSegs(cx, cy, s, rot) {
  const P = (x, y) => [cx + x * s, cy + y * s]
  return [
    [P(1, -22), P(8, -22), P(15, -14), P(15, -5)],
    [P(15, -5), P(15, 6), P(11, 16), P(5, 20)],
    [P(5, 20), P(2, 21.6), P(-0.6, 22.6), P(-2.4, 23.4)],
    [P(-2.4, 23.4), P(-5.4, 20.4), P(-10, 15.4), P(-12, 8)],
    [P(-12, 8), P(-15, -4), P(-8, -22), P(1, -22)]
  ].map(sg => rotPts(sg, rot, cx, cy))
}
function mango(cx, cy, s, rot, c, detail = '') {
  const segs = mangoSegs(cx, cy, s, rot)
  const [hl] = rotPts([[cx - 6 * s, cy - 8 * s]], rot, cx, cy)
  const [mid] = rotPts([[cx + 1.5 * s, cy]], rot, cx, cy)
  return tone3({ outline: cubicsD(segs), base: c[0], dark: c[1],
    shade: crescent(ellipsePts(mid[0], mid[1], 13.2 * s, 20 * s, 32, rot), 4.4 * s, 4.4 * s),
    detail, shine: hilite(hl[0], hl[1], 3.2 * s, 7 * s, 0.55, rot + 12) })
}
const MR = 50
const [mStem] = rotPts([[31, 13]], MR, 30, 35)
const [blush] = rotPts([[36, 22]], MR, 30, 35)
const xoai_xanh = svg(
  ground(31, 57.5, 24, 3.6) +
  mango(30, 35, 1, MR, XOAI,
    `<ellipse cx="${r1(blush[0])}" cy="${r1(blush[1])}" rx="7" ry="4.4" fill="#c4dd62" opacity=".85" stroke="none" transform="rotate(${MR - 30} ${r1(blush[0])} ${r1(blush[1])})"/>` +
    dots(rotPts([[24, 30], [34, 30], [37, 40], [27, 44], [32, 50], [22, 38]], MR, 30, 35), '#b9e08e', 0.9, 0.85)) +
  `<path d="M${r1(mStem[0])} ${r1(mStem[1])}l3.4-2.4" fill="none" stroke="#7a5a2e" stroke-width="3.4"/>` +
  leaves([[r1(mStem[0] + 3), r1(mStem[1] - 2.4), 61, 9, 4.2]], PAL.la))

// Dải vỏ gọt (dùng cho xoài, bưởi): một dải dài cong có đuôi cuộn tròn, một dải ngắn cong ở góc trên-trái.
const CURL_A = 'M33 55c5 .6 10-.4 14.4-3.6c3.4-2.4 3.4-6.4.4-6.8c-2.4-.2-3.2 2.4-1.4 3.4'
const CURL_B = 'M5 23c0-4.4 3-7.6 7.6-8.2'
// Xoài đã gọt: thịt xanh vàng nhạt có vệt dao, dải vỏ xanh cuộn bên cạnh.
const xoai_xanh_got = svg(
  ground(31, 57.5, 24, 3.6) +
  mango(29, 32, 0.92, MR, RUOT_XOAI, `<path d="${polyD(rotPts([[25, 15], [23, 50]], MR, 29, 32), false)}${polyD(rotPts([[33, 14], [34, 51]], MR, 29, 32), false)}" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7"/>`) +
  peel(CURL_A, XOAI[0], RUOT_XOAI[0]) + peel(CURL_B, XOAI[0], RUOT_XOAI[0], 4))

const XOAI_SKIN = XOAI[0]
// Xoài thái sợi: đống que màu thịt xoài, không vệt vỏ.
const xoai_xanh_soi = svg(
  ground(32, 57.5, 27, 3.4) + plate() +
  sticks([[13, 36, 31, 32], [23, 30, 42, 33.5], [35, 31, 52, 36], [17, 33, 35, 37]], RUOT_XOAI[0]) +
  sticks([[11, 42, 29, 39], [27, 36.5, 45, 41.5], [38, 38, 54, 41.5], [16, 46, 34, 43.5], [31, 46.5, 49, 44]], RUOT_XOAI[0]) +
  `<path d="M14 41.6l14-2.3M30 46l15.6-2" fill="none" stroke="${RUOT_XOAI[2]}" stroke-width="1.1"/>`)

// Xoài thái lát: các lát hình thấu kính thịt xanh vàng, một mép còn viền vỏ xanh, xếp hai hàng trên đĩa.
function mangoSlices(list) {
  let out = '', rim = ''
  for (const [x0, y0, x1, y1, w] of list) {
    const L = Math.hypot(x1 - x0, y1 - y0), nx = (y1 - y0) / L, ny = -(x1 - x0) / L
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
    const p = (x, y) => `${r1(x)} ${r1(y)}`
    out += `M${p(x0, y0)}Q${p(mx + nx * w * 2, my + ny * w * 2)} ${p(x1, y1)}Q${p(mx - nx * w * 0.9, my - ny * w * 0.9)} ${p(x0, y0)}Z`
    rim += `M${p(x0 + (x1 - x0) * 0.06, y0 + (y1 - y0) * 0.06)}Q${p(mx + nx * (w * 2 - 2), my + ny * (w * 2 - 2))} ${p(x1 - (x1 - x0) * 0.06, y1 - (y1 - y0) * 0.06)}`
  }
  return `<path d="${out}" fill="${RUOT_XOAI[0]}" stroke-width="2.2"/>` +
    `<path d="${rim}" fill="none" stroke="${XOAI_SKIN}" stroke-width="1.5"/>`
}
const xoai_xanh_lat = svg(
  ground(32, 57.5, 27, 3.4) + plate() +
  mangoSlices([[10, 38, 32, 32, 4.4], [32, 32, 54, 38, 4.4]]) +
  mangoSlices([[11, 46.4, 33, 40.4, 4.6], [31, 41, 53, 47, 4.6]]) +
  hilite(19, 36.4, 3.4, 1, 0.8, -15) + hilite(40, 35.6, 3.4, 1, 0.8, 14) + hilite(20, 44.6, 3.4, 1, 0.8, -15))

// Xoài cắt hạt lựu: các khối vuông nhỏ chất thành đống.
const DICE_BACK = [[21, 32.4], [32.4, 30.8], [43.6, 32.4]]
const DICE_MID = [[26.6, 38.6], [38, 38.6]]
const DICE_FRONT = [[20.4, 44.4], [32, 45], [43.6, 44.4]]
const dice = c => cubes(DICE_BACK, 6.2, c) + cubes(DICE_MID, 6.2, c) + cubes(DICE_FRONT, 6.2, c)
const xoai_xanh_hat_luu = svg(ground(32, 57.5, 27, 3.4) + plate() + dice(RUOT_XOAI))

// ---------- Rau răm: cọng tía có đốt, lá mũi mác so le, giữa lá có đốm tía ----------

const ramStem = 'M30 59C29.6 48 30.6 34 33.6 8'
const rau_ram = svg(
  ground(31, 57.5, 18, 3.4) +
  `<path d="${ramStem}" fill="none" stroke-width="5.4"/><path d="${ramStem}" fill="none" stroke="#a5436c" stroke-width="2.6"/>` +
  `<path d="M28 47.6h4M28.6 36.4h4M30.4 24.6h4" fill="none" stroke-width="1.8"/>` +
  leaves([[30, 47.5, 6, 41, 4], [30.6, 36.5, 56, 28.5, 4], [31.5, 25, 10, 15, 3.4], [32.6, 17, 52, 6.5, 3.2], [33.6, 9.6, 29, 1.2, 2.8]],
    RAM, { mark: '#7b2852' }) +
  hilite(14, 41.5, 3.4, 1, 0.55, -15) + hilite(42, 30.5, 3.4, 1, 0.55, -18))

// ---------- Húng lủi (bẫy của rau răm): cọng xanh, lá tròn mép răng cưa mọc đối từng cặp, gân lá rõ ----------

// Lá húng: bầu tròn đầu hơi nhọn, mép răng cưa. Gốc (x0, y0), góc ang (độ), dài L, nửa rộng w.
function mintLeaf(x0, y0, ang, L, w, n = 6) {
  const a = ang * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const T = (u, v) => [x0 + u * c - v * s, y0 + u * s + v * c]
  const f = t => Math.pow(Math.sin(Math.PI * Math.min(1, t)), 0.75) * (1.12 - 0.42 * t)
  const edge = [], half = [[0, 0]]
  for (const side of [1, -1]) {
    for (let i = 0; i <= 2 * n; i++) {
      const t = (side > 0 ? i : 2 * n - i) / (2 * n)
      const tooth = i % 2 === 1
      edge.push(T(t * L + (tooth ? L * 0.02 : 0), side * w * f(t) * (tooth ? 1 : 0.9)))
      if (side > 0 && !tooth) half.push([t * L, w * f(t) * 0.9 - 0.9])
    }
  }
  const veins = [0.3, 0.55].map(t => {
    const p = T(t * L, 0), q1 = T((t + 0.22) * L, w * 0.62), q2 = T((t + 0.22) * L, -w * 0.62)
    return `M${r1(q1[0])} ${r1(q1[1])}L${r1(p[0])} ${r1(p[1])}L${r1(q2[0])} ${r1(q2[1])}`
  }).join('')
  const tip = T(L * 0.86, 0)
  return {
    leaf: `<path d="${polyRel(edge)}" fill="${HUNG[0]}" stroke-width="2.2"/>`,
    shade: polyRel(half.map(([u, v]) => T(u, v))),
    vein: `M${r1(x0)} ${r1(y0)}L${r1(tip[0])} ${r1(tip[1])}${veins}`
  }
}
function mintSprig(list) {
  const ls = list.map(p => mintLeaf(...p))
  return ls.map(l => l.leaf + `<path d="${l.shade}" fill="${HUNG[1]}" stroke="none"/>`).join('') +
    `<path d="${ls.map(l => l.vein).join('')}" fill="none" stroke="${HUNG[1]}" stroke-width="1.2"/>`
}
const hungStem = 'M32 59C32.6 46 32 30 31.4 10'
const rau_hung_lui = svg(
  ground(32, 57.5, 19, 3.4) +
  `<path d="${hungStem}" fill="none" stroke-width="5.6"/><path d="${hungStem}" fill="none" stroke="${HUNG[1]}" stroke-width="2.8"/>` +
  mintSprig([[32.4, 44, 200, 22, 8.6], [32.4, 44, -20, 22, 8.6], [31.8, 27, 215, 17, 7], [31.8, 27, -35, 17, 7], [31.4, 13, -90, 12, 5.4, 5]]) +
  hilite(19, 37, 3.4, 1.4, 0.5, 15) + hilite(22, 21.4, 2.6, 1.1, 0.5, 35))

// ---------- Vỏ bưởi: trái bưởi da xanh (núm cuống, lá nhỏ) và một miếng vỏ dày lộ cùi trắng ----------

function pomeloSegs(cx, cy) {
  const P = (x, y) => [cx + x, cy + y]
  return [
    [P(0, -21), P(4.6, -21), P(7, -17.6), P(10, -14.6)],
    [P(10, -14.6), P(18, -9.6), P(21, -2), P(21, 5)],
    [P(21, 5), P(21, 15.6), P(11.6, 21.4), P(0, 21.4)],
    [P(0, 21.4), P(-11.6, 21.4), P(-21, 15.6), P(-21, 5)],
    [P(-21, 5), P(-21, -2), P(-18, -9.6), P(-10, -14.6)],
    [P(-10, -14.6), P(-7, -17.6), P(-4.6, -21), P(0, -21)]
  ]
}
const PX = 26, PY = 31
// Vòng cung vỏ: cung ngoài bán kính 13,6, cung trong bán kính 7,4, tâm (47, 40).
const PEEL_ARC = 'M33.6 42.4A13.6 13.6 0 0 0 60.4 42.4L54.3 41.3A7.4 7.4 0 0 1 39.7 41.3Z'
const vo_buoi = svg(
  ground(32, 57.5, 25, 3.6) +
  tone3({ outline: cubicsD(pomeloSegs(PX, PY)), base: BUOI[0], dark: BUOI[1],
    shade: crescent(ellipsePts(PX, PY + 3, 21, 18.4, 36), 5, 5),
    detail: dots([[18, 26], [24, 34], [33, 27], [36, 38], [27, 43], [17, 40], [31, 17], [22, 19]], BUOI[2], 0.9, 0.9),
    shine: hilite(15, 22, 3.4, 6, 0.55, 30) }) +
  `<path d="M26 10.4V6.4" fill="none" stroke="#7a5a2e" stroke-width="3.2"/>` +
  leaves([[27, 7, 40, 2.6, 3]], PAL.la, { sw: 2.2 }) +
  // Miếng vỏ dày hình vòng cung: cùi trắng xốp, mép ngoài còn lớp vỏ xanh.
  `<path d="${PEEL_ARC}" fill="${CUI[0]}" stroke="none"/>` +
  `<path d="M35.4 43.2A12 12 0 0 0 58.6 43.2" fill="none" stroke="${BUOI[0]}" stroke-width="3.4"/>` +
  `<path d="M36.6 45.6A11 11 0 0 0 57.4 45.6" fill="none" stroke="${BUOI[1]}" stroke-width="1.2" opacity=".6"/>` +
  dots([[41, 48, 0.8], [46.6, 49.6, 0.8], [52.4, 48, 0.8], [47, 46.4, 0.6]], CUI[1]) +
  hilite(39, 42.8, 2, 0.9, 0.9) +
  `<path d="${PEEL_ARC}" fill="none" stroke-width="2.6"/>`)

// Vỏ bưởi đã gọt lớp xanh: trái bưởi lộ cùi trắng xốp (cùng dáng trái bưởi), sót vài vệt xanh; dải vỏ xanh cuộn rơi bên cạnh.
const vo_buoi_got = svg(
  ground(30, 57.5, 25, 3.6) +
  tone3({ outline: cubicsD(pomeloSegs(28, 31)), base: CUI[0], dark: CUI[1],
    shade: crescent(ellipsePts(28, 34, 21, 18.4, 36), 5, 5),
    detail: dots([[19, 27, 1], [25, 35, 0.9], [34, 28, 1.1], [37, 39, 0.9], [28, 44, 1], [19, 41, 0.9], [32, 18, 0.9], [24, 20, 0.8]], CUI[1]) +
      `<path d="M20 47.6c3 1.4 6 1.8 9 1.6M38 44c-1.6 2-3.6 3.6-5.6 4.4" fill="none" stroke="${BUOI[0]}" stroke-width="2" opacity=".75"/>`,
    shine: hilite(17, 22, 3.4, 6, 0.6, 30) }) +
  `<path d="M28 10.4V7" fill="none" stroke="#7a5a2e" stroke-width="3"/>` +
  peel(CURL_A, BUOI[0], CUI[0]) + peel(CURL_B, BUOI[0], CUI[0], 4))

// Cùi bưởi cắt hạt lựu, thái lát (miếng dày mỏng), thái sợi.
const vo_buoi_hat_luu = svg(ground(32, 57.5, 27, 3.4) + plate() + dice(CUI))
const vo_buoi_lat = svg(
  ground(32, 57.5, 27, 3.4) + plate() +
  cubes([[22, 33.4], [41, 33.4]], 10, CUI, 2.6) + cubes([[31.5, 40], [14, 42], [49, 42]], 9.6, CUI, 2.6) +
  dots([[19, 33, 0.8], [25, 33.8, 0.7], [38, 33, 0.8], [44, 34, 0.7], [29, 40.4, 0.8], [35, 39.6, 0.7]], CUI[1]))
const vo_buoi_soi = svg(
  ground(32, 57.5, 27, 3.4) + plate() +
  sticks([[13, 36, 31, 32], [23, 30, 42, 33.5], [35, 31, 52, 36], [17, 33, 35, 37]], CUI[0]) +
  sticks([[11, 42, 29, 39], [27, 36.5, 45, 41.5], [38, 38, 54, 41.5], [16, 46, 34, 43.5], [31, 46.5, 49, 44]], CUI[0]) +
  `<path d="M14 41.6l14-2.3M30 46l15.6-2" fill="none" stroke="#fff" stroke-width="1.1"/>`)

// Áo bột năng: rổ tre đựng các hạt cùi phủ bột trắng đục, bột lấm tấm bay quanh.
const roFront = 'M7 38C8 50 18 56 32 56C46 56 56 50 57 38A25 7 0 0 1 7 38Z'
const vo_buoi_ao_bot = svg(
  ground(32, 58, 26, 3.4) +
  `<ellipse cx="32" cy="38" rx="25" ry="7" fill="${PAL.go[1]}"/>` +
  cubes([[20.6, 32.4], [32, 30.6], [43.4, 32.4]], 6.4, BOT) + cubes([[26.2, 37.6], [37.8, 37.6]], 6.4, BOT) +
  tone3({ outline: roFront, base: PAL.go[0], dark: PAL.go[1],
    shade: 'M57 38C56 50 46 56 32 56C42 54 50 49 51.4 42.2Q55 40.8 57 38Z',
    detail: `<path d="M9 44.6C20 50 44 50 55 44.6M14 51.4C24 54.6 40 54.6 50 51.4" fill="none" stroke="${PAL.go[1]}" stroke-width="1.6"/>` +
      `<path d="M15 43.4l2 10M23 45l1 10.4M32 45.4v10.4M41 45l-1 10.4M49 43.4l-2 10" fill="none" stroke="${PAL.go[1]}" stroke-width="1.4"/>`,
    shine: hilite(13, 43, 1.6, 3, 0.6, -20) }) +
  dots([[14, 27, 1.2], [20, 22, 0.9], [36, 21, 1.1], [47, 24, 1], [53, 29, 0.9], [27, 24.6, 0.8], [42, 27.6, 0.7]], '#fff') +
  dots([[14, 27, 0.5], [36, 21, 0.4], [47, 24, 0.4]], '#cfcfc6') +
  hilite(30.4, 29.6, 1.8, 0.8, 0.9) + hilite(19, 31.4, 1.8, 0.8, 0.9))

// Cùi bưởi luộc chín: hạt trong như ngọc trong chén nước, bóng sáng, hơi nóng bốc lên.
const chenChin = bowl(32, 39, 22, 6.4, 16, '#eaf2df')
const vo_buoi_chin = svg(
  ground(32, 57.5, 25, 3.4) +
  chenChin.back +
  cubes([[21, 34], [32.4, 32.4], [43.8, 34]], 6.2, CUI_CHIN) + cubes([[26.8, 39.4], [38.2, 39.4]], 6.2, CUI_CHIN) +
  `<path d="M18.6 32.6l2.6 1.5M30 31l2.6 1.5M41.4 32.6l2.6 1.5M24.4 38l2.6 1.5M35.8 38l2.6 1.5" fill="none" stroke="#fff" stroke-width="1.5"/>` +
  chenChin.front +
  wisp(22, 24, '#b9aea2') + wisp(34, 21, '#b9aea2', 0.6) + wisp(45, 24, '#b9aea2'))

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

// Trạng thái của trứng gà và trứng gà ta (gà ta: vỏ hồng nâu, lòng đỏ cam đậm, sao nhỏ góc trên-phải).
const GA = eggStates(YOLK)
const GA_TA = eggStates(YOLK_GA_TA, rareStar(55.5, 8.5, 6))
const prefix = (id, o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [`${id}.${k}`, svg(v)]))

export const ING_TUOI = Object.freeze({
  dua_leo, trung_ga, tac, hanh_la, trung_ga_ta,
  trung_vit, trung_cut, hanh_tay, chanh, xoai_xanh, rau_ram, rau_hung_lui, vo_buoi
})

export const ING_TUOI_STATES = Object.freeze({
  'dua_leo.sach': dua_leo_sach,
  'dua_leo.lat': dua_leo_lat,
  'dua_leo.soi': dua_leo_soi,
  'dua_leo.bao': dua_leo_bao,
  'trung_ga.nut': trung_ga_nut,
  ...prefix('trung_ga', GA),
  'trung_ga_ta.nut': svg(nutEgg(PAL.vo_ga_ta, YOLK_GA_TA, '#9a5a3c') + rareStar(55.5, 8.5, 6)),
  ...prefix('trung_ga_ta', GA_TA),
  'tac.bo_doi': tac_bo_doi,
  'tac.vat': tac_vat,
  'trung_cut.boc': trung_cut_boc,
  'xoai_xanh.got': xoai_xanh_got,
  'xoai_xanh.soi': xoai_xanh_soi,
  'xoai_xanh.lat': xoai_xanh_lat,
  'xoai_xanh.hat_luu': xoai_xanh_hat_luu,
  'vo_buoi.got': vo_buoi_got,
  'vo_buoi.hat_luu': vo_buoi_hat_luu,
  'vo_buoi.lat': vo_buoi_lat,
  'vo_buoi.soi': vo_buoi_soi,
  'vo_buoi.ao_bot': vo_buoi_ao_bot,
  'vo_buoi.chin': vo_buoi_chin
})
