// Bộ dựng hình M5 (thuần, không DOM): khung SVG, bảng màu cel-shading 3 tông, bóng đất, điểm sáng, sao hàng hiếm,
// cùng vài hàm hình học nhỏ để tính mảng tối hình lưỡi liềm nằm gọn trong bóng dáng (không dùng clipPath/mask).
// Quy chuẩn (docs/tham-khao/m5-thiet-ke.md mục 6.1): viewBox 0 0 64 64 cho icon và hình trạng thái; viền ngoài INK dày 3,
// chi tiết 1,5–2, đầu và góc nét bo tròn; ba tông: nền + mảng tối dưới-phải + điểm sáng trắng trên-trái; ánh sáng từ trên-trái;
// bóng đất ellipse INK opacity .15 ở y≈58; cấm gradient, filter, clipPath, mask, pattern, <use>, href, url(, base64, <image>.

export const INK = '#3a2618'
export const OUTLINE = 3
export const DETAIL = 1.75
export const FONT = "'Baloo 2', system-ui"

export function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v)
  return Object.freeze(o)
}

/** Làm tròn 1 chữ số thập phân (không bao giờ ra "-0"). */
export const r1 = n => {
  const v = Math.round(n * 10) / 10
  return Object.is(v, -0) ? 0 : v
}

// Bảng màu: mỗi chất liệu [nền, tối (đậm hơn 15–20%), sáng].
export const PAL = deepFreeze({
  la: ['#7cc35a', '#4f9a3c', '#c4ec9e'],
  hanh: ['#6cc24a', '#46972f', '#b7e88f'],
  hanh_trang: ['#f6f8e8', '#d9e4bf', '#ffffff'],
  dua: ['#4ea443', '#347a2c', '#8ed46b'],
  ruot_dua: ['#e3f3b8', '#bfe08c', '#f8fde6'],
  trung: ['#fff3dc', '#e6cfa6', '#fffaf0'],
  vo_ga: ['#eeb486', '#d08d5c', '#fde3c9'],
  vo_ga_ta: ['#d99a78', '#b77656', '#f3cfb8'],
  long_do: ['var(--yolk,#f6b21a)', '#e08c00'],
  tac: ['#f7a31e', '#d77d0b', '#ffd27a'],
  tac_xanh: ['#a9c93c', '#7fa127', '#d6ea8a'],
  ruot_tac: ['#ffd04a', '#f2aa22', '#fff2bd'],
  banh: ['#e9a64c', '#c47a2c', '#f7d496'],
  ruot_banh: ['#fbe3b0', '#efc98a', '#fff6e0'],
  go: ['#e2a766', '#bf8248', '#f6d09c'],
  go_dam: ['#9a5f32', '#74431f', '#c98d58'],
  thep: ['#e4eaf1', '#aebbc9', '#ffffff'],
  tuong: ['#3e2419', '#26140c', '#8d5c44'],
  mam: ['#eb9b2c', '#c4731a', '#ffd88a'],
  giay: ['#fbf1dc', '#e8d3ad', '#ffffff'],
  da_tay: ['#f9caa0', '#e3a476', '#fde4cd'],
  do: ['#e2453a', '#b8302a', '#ff8f7f'],
  da_lanh: ['#d9f2fc', '#a7d6ec', '#ffffff'],
  nhua: ['#eef7fb', '#cfe3ee', '#ffffff'],
  tra: ['#f2a43c', '#d27f1f', '#ffd38c'],
  dia: ['#fffdf6', '#e7dcc6', '#ffffff'],
  rom: ['#e8bf62', '#c9973a', '#f8df9a'],
  xanh_nhan: ['#3f86c8', '#2c66a0', '#9fcaf0'],
  sao: ['#ffd23f', '#e8a700', '#fff4b8']
})

/** Khung SVG: mọi hình con kế thừa viền mực INK dày OUTLINE, đầu và góc nét bo tròn. vb là chuỗi hoặc [w, h]. */
export function svg(body, vb = '0 0 64 64') {
  const box = Array.isArray(vb) ? `0 0 ${vb[0]} ${vb[1]}` : vb
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">` +
    `<g stroke="${INK}" stroke-width="${OUTLINE}" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`
}

/** Bóng đất: ellipse INK mờ dưới chân vật thể. */
export function ground(cx = 32, cy = 58, rx = 22, ry = 3.5) {
  return `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${INK}" opacity=".15" stroke="none"/>`
}

/** Điểm sáng trắng ở trên-trái (ellipse, xoay tùy chọn). */
export function hilite(cx, cy, rx, ry, op = 0.5, rot = 0) {
  const t = rot ? ` transform="rotate(${r1(rot)} ${r1(cx)} ${r1(cy)})"` : ''
  return `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="#fff" opacity="${frac(op)}" stroke="none"${t}/>`
}

/** Số trong khoảng (0, 1) in gọn: 0.5 → ".5". */
export const frac = n => String(r1(n)).replace(/^0\./, '.')

/** Chấm tròn nhỏ không viền (đốm, lỗ chân lông vỏ, hạt). */
export function dots(list, fill, r = 1.2, op = 1) {
  const o = op < 1 ? ` opacity="${frac(op)}"` : ''
  return list.map(([x, y, rr]) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(rr || r)}" fill="${fill}" stroke="none"${o}/>`).join('')
}

/**
 * Ba tông cel-shading cho một bóng dáng: nền (không viền) → mảng tối → chi tiết → điểm sáng → viền ngoài vẽ sau cùng
 * (viền phủ lên mép mảng tối nên mảng tối không lấn ra ngoài và viền luôn dày đều).
 * outline: d của bóng dáng; shade: d của mảng tối; shine: d của điểm sáng (hoặc chuỗi SVG bắt đầu bằng '<');
 * line: d của nét viền nếu khác bóng dáng (vd để hở chỗ nối với phần khác).
 */
export function tone3({ outline, base, dark, light = '#fff', shade = '', shine = '', shineOp = 0.5, detail = '', sw = OUTLINE, line = '' }) {
  const sh = !shine ? '' : shine.startsWith('<') ? shine
    : `<path d="${shine}" fill="${light}" opacity="${frac(shineOp)}" stroke="none"/>`
  return `<path d="${outline}" fill="${base}" stroke="none"/>` +
    (shade ? `<path d="${shade}" fill="${dark}" stroke="none"/>` : '') + detail + sh +
    `<path d="${line || outline}" fill="none"${sw !== OUTLINE ? ` stroke-width="${sw}"` : ''}/>`
}

// ---------- Hình học (thuần) ----------

const pt = ([x, y]) => `${r1(x)} ${r1(y)}`

/** Đường khép kín (hoặc hở) qua các điểm, nét thẳng. */
export function polyD(pts, close = true) {
  return 'M' + pts.map(pt).join('L') + (close ? 'Z' : '')
}

/** Xoay các điểm quanh (cx, cy) góc deg (độ, chiều kim đồng hồ trên màn hình). */
export function rotPts(pts, deg, cx = 32, cy = 32) {
  if (!deg) return pts.map(p => [p[0], p[1]])
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c])
}

/** Lấy mẫu một chuỗi đường cong Bézier bậc 3 nối tiếp: segs = [[p0, c1, c2, p1], ...]; k mẫu mỗi đoạn. */
export function sampleCubics(segs, k = 12) {
  const out = []
  for (const [p0, c1, c2, p1] of segs) {
    for (let i = 0; i < k; i++) {
      const t = i / k, u = 1 - t
      const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t
      out.push([a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1]])
    }
  }
  return out
}

/** d của chuỗi Bézier bậc 3 khép kín. */
export function cubicsD(segs) {
  return 'M' + pt(segs[0][0]) + segs.map(([, c1, c2, p1]) => 'C' + [c1, c2, p1].map(pt).join(' ')).join('') + 'Z'
}

/** Lấy mẫu ellipse (xoay tùy chọn) thành đa giác n đỉnh. */
export function ellipsePts(cx, cy, rx, ry, n = 48, rot = 0) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
  }
  return rotPts(pts, rot, cx, cy)
}

function insideConvex(poly, x, y) {
  let sign = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]
    const c = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
    if (Math.abs(c) > 1e-9) {
      const s = c > 0 ? 1 : -1
      if (!sign) sign = s
      else if (s !== sign) return false
    }
  }
  return true
}

// Tìm điểm cắt trên đoạn a→b nơi hàm f đổi giá trị (chia đôi 24 lần).
function bisect(a, b, f) {
  const fa = f(a)
  let lo = 0, hi = 1
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2
    const p = [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m]
    if (f(p) === fa) lo = m; else hi = m
  }
  const m = (lo + hi) / 2
  return [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m]
}

// Bỏ bớt điểm quá gần nhau (giữ điểm đầu và cuối) để chuỗi SVG gọn.
function thin(run, gap) {
  if (run.length < 3) return run
  const out = [run[0]]
  for (let i = 1; i < run.length - 1; i++) {
    const l = out[out.length - 1]
    if (Math.hypot(run[i][0] - l[0], run[i][1] - l[1]) >= gap) out.push(run[i])
  }
  out.push(run[run.length - 1])
  return out
}

// Đường mượt qua dãy điểm (bám điểm đầu, điểm cuối; giữa dùng Bézier bậc 2 qua trung điểm). Bỏ điểm đầu (đã có).
function smoothRun(run) {
  if (run.length < 3) return run.slice(1).map(p => 'L' + pt(p)).join('')
  let s = ''
  for (let i = 1; i < run.length - 1; i++) {
    const m = i === run.length - 2 ? run[i + 1] : [(run[i][0] + run[i + 1][0]) / 2, (run[i][1] + run[i + 1][1]) / 2]
    s += 'Q' + pt(run[i]) + ' ' + pt(m)
  }
  return s
}

/**
 * Mảng tối hình lưỡi liềm của một đa giác LỒI: phần của hình không bị bản sao dời về phía nguồn sáng (−ox, −oy) che.
 * Mép ngoài nằm đúng trên bóng dáng (viền vẽ sau sẽ phủ), mép trong là bản sao dời. Trả '' nếu không có.
 */
export function crescent(poly, ox = 4, oy = 4) {
  const n = poly.length
  const inQ = p => insideConvex(poly, p[0] + ox, p[1] + oy)
  const q = poly.map(([x, y]) => [x - ox, y - oy])
  const inP = p => insideConvex(poly, p[0], p[1])
  const outQ = poly.map(p => !inQ(p))
  const s = outQ.findIndex((o, i) => o && !outQ[(i - 1 + n) % n])
  if (s < 0) return ''
  const run = []
  let i = s
  while (outQ[i % n] && run.length < n) { run.push(poly[i % n]); i++ }
  const e = (i - 1) % n
  const x1 = bisect(poly[(s - 1 + n) % n], poly[s], inQ)
  const x2 = bisect(poly[e], poly[(e + 1) % n], inQ)
  const inQP = q.map(p => inP(p))
  const s2 = inQP.findIndex((v, j) => v && !inQP[(j - 1 + n) % n])
  const back = []
  if (s2 >= 0) {
    let j = s2
    while (inQP[j % n] && back.length < n) { back.push(q[j % n]); j++ }
    back.reverse()
  }
  // Mép ngoài nằm dưới viền mực (dày 3) nên chỉ cần ít điểm, nét thẳng; mép trong lộ ra nên giữ mượt.
  const outer = thin([x1, ...run, x2], 7)
  const inner = thin([x2, ...back, x1], 3.2)
  return 'M' + outer.map(pt).join('L') + smoothRun(inner) + 'Z'
}

/** Mảng tối lưỡi liềm của ellipse trục thẳng (tính đúng bằng cung, gọn hơn đa giác). k: độ dời theo tỉ lệ bán kính. */
export function ellipseShade(cx, cy, rx, ry, k = 0.28) {
  const a = k, b = k                 // tâm ellipse dời (chuẩn hóa) về (−a, −b): nguồn sáng trên-trái
  const d = Math.hypot(a, b)
  const h = Math.sqrt(Math.max(0, 1 - (d / 2) ** 2))
  const mx = -a / 2, my = -b / 2, nx = b / d, ny = -a / d
  const p1 = [mx + h * nx, my + h * ny], p2 = [mx - h * nx, my - h * ny]
  // Đi theo chiều kim đồng hồ (góc tăng) từ I1 qua điểm xa nhất dưới-phải tới I2.
  const ang = p => Math.atan2(p[1], p[0])
  const far = Math.atan2(b, a)
  const norm = x => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  let [i1, i2] = [p1, p2]
  if (norm(far - ang(i1)) > norm(ang(i2) - ang(i1))) [i1, i2] = [p2, p1]
  const W = ([u, v]) => `${r1(cx + u * rx)} ${r1(cy + v * ry)}`
  return `M${W(i1)}A${r1(rx)} ${r1(ry)} 0 1 1 ${W(i2)}A${r1(rx)} ${r1(ry)} 0 0 0 ${W(i1)}Z`
}

/** Ellipse đủ ba tông (nền, lưỡi liềm tối, điểm sáng) + viền. c = [nền, tối, sáng]. */
export function ball(cx, cy, rx, ry, c, { k = 0.28, shine = true, sw = OUTLINE, detail = '' } = {}) {
  const e = `M${r1(cx - rx)} ${r1(cy)}A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx + rx)} ${r1(cy)}A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx - rx)} ${r1(cy)}Z`
  const sh = shine ? hilite(cx - rx * 0.42, cy - ry * 0.45, rx * 0.26, ry * 0.17, 0.55, -35) : ''
  return tone3({ outline: e, base: c[0], dark: c[1], shade: ellipseShade(cx, cy, rx, ry, k), shine: sh, detail, sw })
}

/**
 * Chữ trong hình (chỉ khi bắt buộc): Baloo 2 đậm 800, cỡ ≥ 9. sx < 1 ép ngang cả dòng chữ bằng scale() để vừa nhãn
 * (không dùng textLength/lengthAdjust: trình duyệt có thể tách dấu thanh của font ra khỏi chữ cái).
 */
export function txt(x, y, s, size, fill, sx = 1) {
  const fs = Math.max(9, size)
  const pos = sx === 1 ? `x="${r1(x)}" y="${r1(y)}"` : `transform="translate(${r1(x)} ${r1(y)}) scale(${sx} 1)"`
  return `<text ${pos} font-family="${FONT}" font-size="${r1(fs)}" font-weight="800" ` +
    `text-anchor="middle" fill="${fill}" stroke="none">${s}</text>`
}

/** Ngôi sao vàng #ffd23f ở góc trên-phải hình hàng hiếm (luật data.test). */
export function rareStar(x = 50, y = 14, R = 8) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? R * 0.48 : R
    pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)])
  }
  return `<path d="${polyD(pts)}" fill="#ffd23f" stroke-width="2.2"/>` +
    hilite(x - R * 0.22, y - R * 0.2, R * 0.2, R * 0.12, 0.7, -30)
}
