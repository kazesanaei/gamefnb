// Đạo cụ sân khấu lớn M5 (viewBox riêng, ghi trong PROP_META): thớt gỗ lớn, dao lớn, bàn tay mẫu (Đợt 0);
// chảo, nồi, phin trên ly, ly nhựa, tô, chén, rổ tre, bình lắc, bếp ga, đĩa, vòi nước (Đợt 1).
// Thuần, import trong Node được. Quy chuẩn vẽ như kit.js; mỗi đạo cụ ≤ 6 KB.
// PROP_META cho bên dùng biết hộp vẽ (vb = [rộng, cao]) và các điểm mốc (tọa độ theo viewBox của đạo cụ) để canh vị trí.
// Đổi sang px: k = bề rộng khung / vb[0] (khung nên giữ đúng tỉ lệ vb, vd CSS aspect-ratio: vb[0] / vb[1]).
// Ellipse ghi dạng { cx, cy, rx, ry }; base: điểm thấp nhất ở trục vật (đặt lên bàn, lên bếp).
//   thot_lon.top: 4 góc mặt thớt (trên-trái, trên-phải, dưới-phải, dưới-trái), center: tâm mặt thớt;
//   dao_lon.tip: mũi dao, grip: giữa chuôi, edge: đầu và cuối lưỡi cắt;
//   tay.tip: đầu ngón trỏ (điểm chạm của "tay mẫu");
//   chao_lon.floor: đáy chảo (thả trứng trong ellipse này), rim: vành ngoài, center: tâm đáy, handle: giữa chuôi gỗ;
//   noi_lon.water: mặt nước (hạt, bọt, hơi nước đặt ở đây), rim: vành;
//   ly_lon.mouth / bottom: ellipse miệng và đáy TRONG của ly; left / right: thành trong [trên, dưới]. Thân ly trong suốt:
//     nước vẽ bằng CSS và ĐẶT DƯỚI hình (vệt sáng của ly phủ lên). Ở mực f (0 = đáy, 1 = miệng): y = bottom.cy + (mouth.cy −
//     bottom.cy)·f; mép trái/phải nội suy tuyến tính giữa left[1]→left[0], right[1]→right[0]; mặt nước là ellipse ry nội suy;
//   phin_lon.cup: như ly_lon (ly dưới phin, phần trên bị đĩa phin che), drip: chỗ giọt cà phê rơi, lid: núm nắp ("Nhấc phin");
//   to_lon, chen_lon: nhìn thẳng từ trên, khung vuông; center + r: vùng khuấy (hỗn hợp CSS hình tròn bán kính ≤ r);
//     inner: mép lòng, rim: vành ngoài, bottom: đáy;
//   ro_lon.mouth: lòng rổ (miếng cùi bưởi nằm trong ellipse này);
//   binh_lac_lon.cap: đỉnh nắp, body: { cx, top, bottom } thân bình; khung hẹp ~0,62 rộng/cao;
//   bep_ga.burner: đầu đốt, flame: { cx, base, top } lửa, seat: nơi đặt base của nồi/chảo, knob: núm vặn. Lửa là nhóm
//     <g data-part="lua"> (lắc bằng CSS: transform-box: fill-box; transform-origin: 50% 100%; chỉ transform/opacity);
//   dia_lon.well: lòng đĩa (đặt món), rim: vành;
//   voi_nuoc.mouth: miệng vòi (dòng nước CSS chảy xuống từ đây, rộng mouthW), handle: tâm tay vặn.

import { DETAIL, PAL, svg, ground, hilite, tone3, r1, frac, rotPts, crescent, ellipseShade, ball, deepFreeze } from './kit.js'

// Đa giác bo góc: trả { d, pts } (pts lấy mẫu dọc biên để tính mảng tối/sáng lưỡi liềm).
function roundPoly(corners, r, k = 5) {
  const n = corners.length
  const pts = []
  let d = ''
  for (let i = 0; i < n; i++) {
    const p = corners[(i - 1 + n) % n], c = corners[i], q = corners[(i + 1) % n]
    const lp = Math.hypot(c[0] - p[0], c[1] - p[1]), lq = Math.hypot(q[0] - c[0], q[1] - c[1])
    const a = [c[0] + ((p[0] - c[0]) * r) / lp, c[1] + ((p[1] - c[1]) * r) / lp]
    const b = [c[0] + ((q[0] - c[0]) * r) / lq, c[1] + ((q[1] - c[1]) * r) / lq]
    d += (i === 0 ? 'M' : 'L') + `${r1(a[0])} ${r1(a[1])}Q${r1(c[0])} ${r1(c[1])} ${r1(b[0])} ${r1(b[1])}`
    for (let j = 0; j <= k; j++) {
      const t = j / k, u = 1 - t
      pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]])
    }
  }
  return { d: d + 'Z', pts }
}

// ---------- Thớt gỗ lớn (nhìn chéo từ trên) ----------

const BOARD_TOP = [[24, 20], [216, 20], [232, 118], [8, 118]]
const board = roundPoly(BOARD_TOP, 18)
const groove = roundPoly([[36, 30], [204, 30], [217, 108], [23, 108]], 12, 1)
const thot_lon = svg(
  ground(120, 141, 114, 9) +
  // Bề dày mép thớt (mặt bên tối) và vệt sáng dọc mép trên của mặt bên.
  `<path d="${board.d}" fill="${PAL.go[1]}" transform="translate(0 14)"/>` +
  `<path d="M14 125C40 131 200 131 226 125" fill="none" stroke="${PAL.go[0]}" stroke-width="2.4" opacity=".7"/>` +
  tone3({
    outline: board.d, base: PAL.go[0], dark: '#d29657',
    shade: crescent(board.pts, 9, 8),
    detail:
      `<path d="M40 44C80 37 120 51 160 42C180 38 196 40 206 45M28 70C70 63 110 78 150 68C175 62 195 66 216 71M44 96C88 89 130 103 170 94C190 90 206 92 222 97" ` +
      `fill="none" stroke="${PAL.go[1]}" stroke-width="2.2" opacity=".55"/>` +
      `<ellipse cx="150" cy="56" rx="7" ry="2.8" fill="none" stroke="${PAL.go[1]}" stroke-width="2" opacity=".6"/>` +
      `<path d="${groove.d}" fill="none" stroke="${PAL.go[2]}" stroke-width="2" transform="translate(0 1.6)"/>` +
      `<path d="${groove.d}" fill="none" stroke="${PAL.go[1]}" stroke-width="2.6"/>` +
      `<path d="M86 84l14-4M106 89l9-2M70 52l10-3" fill="none" stroke="${PAL.go[2]}" stroke-width="1.8" opacity=".8"/>` +
      `<ellipse cx="197" cy="35" rx="8" ry="4.6" fill="#8a5428" stroke-width="${DETAIL + 0.5}"/>` +
      `<path d="M190.6 36.6C193 34 200 33.6 203.6 35.4" fill="none" stroke="${PAL.go_dam[1]}" stroke-width="1.8"/>`,
    shine: `<path d="${crescent(board.pts.map(([x, y]) => [x, y]), -7, -6)}" fill="#fff" opacity=".3" stroke="none"/>` +
      hilite(40, 30, 10, 2.6, 0.45, -6)
  }), [240, 160])

// ---------- Dao lớn (nằm ngang, lưỡi quay xuống) ----------

const BIG_BLADE = 'M71 18H178C186 18 193 21 197 26C182 43 150 52 112 52H71Z'
const dao_lon = svg(
  tone3({
    outline: 'M8 22H61V42H8C5 42 3 38.4 3 32C3 25.6 5 22 8 22Z', base: PAL.go_dam[0], dark: PAL.go_dam[1],
    shade: 'M4.2 37.6C5 40.4 6.4 42 8 42H61V36.6H6.6Z',
    detail: [18, 32, 46].map(x => `<circle cx="${x}" cy="30.6" r="3.2" fill="#efe1c6" stroke-width="2"/>` + hilite(x - 1, 29.6, 1, 0.7, 0.8)).join(''),
    shine: `<path d="M10 26.4H56" stroke="#fff" stroke-width="2.4" opacity=".4"/>`
  }) +
  `<rect x="59" y="18.5" width="13" height="27" rx="3" fill="${PAL.thep[1]}"/>` +
  `<path d="M62.6 22.6V41" stroke="#fff" stroke-width="2" opacity=".7"/>` +
  tone3({
    outline: BIG_BLADE, base: PAL.thep[0], dark: PAL.thep[1],
    shade: 'M71 43.6H112C148 43.6 178 37 196 27C182 43 150 52 112 52H71Z',
    detail: `<path d="M78 48.4H112C146 48.4 172 42 189 31.6" fill="none" stroke="#fff" stroke-width="1.4" opacity=".6"/>`,
    shine: `<path d="M77 23.4H176" stroke="#fff" stroke-width="2.6" opacity=".85"/>` +
      `<path d="M166 18.6l2 5.4 5.4 2-5.4 2-2 5.4-2-5.4-5.4-2 5.4-2Z" fill="#fff" stroke="none"/>`
  }), [200, 64])

// ---------- Bàn tay mẫu (ngón trỏ chỉ lên, nhìn mu bàn tay) ----------

const SKIN = PAL.da_tay
const TAY_ROT = -14, TAY_C = [52, 74]
const tay = svg(
  `<g transform="rotate(${TAY_ROT} ${TAY_C[0]} ${TAY_C[1]})">` +
  // Tay áo và cổ tay áo.
  tone3({
    outline: 'M26 101H76C78 101 79 102.6 79 104.6V124H23V104.6C23 102.6 24 101 26 101Z', base: PAL.xanh_nhan[0], dark: PAL.xanh_nhan[1],
    shade: 'M68 101H76C78 101 79 102.6 79 104.6V124H70Z'
  }) +
  `<rect x="21" y="94" width="60" height="10" rx="4" fill="#fffaf0"/>` +
  `<path d="M70 95.6V102.4" stroke="#e6dccb" stroke-width="5"/>` +
  // Ngón cái áp bên trái.
  tone3({
    outline: 'M34 70C26 66 18 69 17.4 76C16.8 82 21.4 86 28 85L38 83.4Z', base: SKIN[0], dark: SKIN[1],
    shade: 'M19.6 82C22 84.6 25 85.4 28 85L37.6 83.4L36 79.4L27 80.6C24 81 21.4 81.6 19.6 82Z',
    shine: hilite(22, 74, 2.6, 1.4, 0.5, -25)
  }) +
  // Nắm tay (mu bàn tay) với ba ngón gập.
  tone3({
    outline: 'M30 64C30 55 36 50 44 50H62C70 50 76 56 76 64V80C76 90 69 97 60 97H44C36 97 30 90 30 82Z',
    base: SKIN[0], dark: SKIN[1],
    shade: 'M76 64V80C76 90 69 97 60 97H44C38 97 33.6 93.6 31.6 89.4C35 91.6 39 92.4 44 92.4H58C66 92.4 71 87 71 80V64C71 59.6 69.6 56 67 53.6C72.6 55 76 59 76 64Z',
    detail: [[49.6, 47.4], [58.4, 48.4], [67, 51]].map(([x, y]) =>
      `<rect x="${x}" y="${y}" width="8.8" height="${r1(75.6 - y)}" rx="4.4" fill="${SKIN[0]}" stroke-width="2"/>`).join('') +
      `<path d="M72.6 53.6C74.6 56 75 60 75 64V74H72.6Z" fill="${SKIN[1]}" stroke="none"/>` +
      hilite(53.2, 51.6, 1.6, 1, 0.6) + hilite(62, 52.6, 1.6, 1, 0.6),
    shine: hilite(38, 60, 4, 2.4, 0.5, -30)
  }) +
  // Ngón trỏ duỗi thẳng, móng tay ở đầu, hai nếp đốt; viền để hở ở chân ngón cho liền với nắm tay.
  tone3({
    outline: 'M31 64V18C31 10.5 35.5 6 41 6C46.5 6 51 10.5 51 18V64Z', base: SKIN[0], dark: SKIN[1],
    shade: 'M51 18V64H46.4V18C46.4 13.8 45.4 10.6 43.6 8.6C48 9.8 51 13.4 51 18Z',
    detail: `<path d="M35.4 17.6V13.8C35.4 11 37.6 9.6 41 9.6C44.4 9.6 46.6 11 46.6 13.8V17.6C46.6 19.6 44.6 20.6 41 20.6C37.4 20.6 35.4 19.6 35.4 17.6Z" fill="${SKIN[2]}" stroke-width="1.5"/>` +
      `<path d="M37 34.6Q41 36.8 45 34.6M37 47.6Q41 49.8 45 47.6" fill="none" stroke-width="1.5"/>`,
    shine: `<path d="M34.6 24V58" stroke="#fff" stroke-width="2.4" opacity=".45"/>`,
    line: 'M31 66V18C31 10.5 35.5 6 41 6C46.5 6 51 10.5 51 18V66'
  }) +
  `</g>`, [96, 120])

const [tayTip] = rotPts([[41, 6]], TAY_ROT, TAY_C[0], TAY_C[1])

// ================= Đợt 1: đạo cụ cho các mini-game mới =================
// Hàm vẽ nhỏ dùng chung. Vật nhìn chéo từ trên: vành là ellipse; mép trước (nửa dưới ellipse) vẽ nét mảnh hơn viền ngoài.

/** d của ellipse trọn vẹn. */
const ellD = (cx, cy, rx, ry) =>
  `M${r1(cx - rx)} ${r1(cy)}A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx + rx)} ${r1(cy)}A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx - rx)} ${r1(cy)}Z`
/** Thẻ <ellipse>; a: thuộc tính thêm (fill, stroke…). */
const ell = (o, a) => `<ellipse cx="${r1(o.cx)}" cy="${r1(o.cy)}" rx="${r1(o.rx)}" ry="${r1(o.ry)}" ${a}/>`
/** Cung nửa dưới (mép trước) của ellipse, đi từ trái sang phải. */
const lowArc = o => `M${r1(o.cx - o.rx)} ${r1(o.cy)}A${r1(o.rx)} ${r1(o.ry)} 0 0 0 ${r1(o.cx + o.rx)} ${r1(o.cy)}`
/** Cung nửa trên (mép sau) của ellipse, đi từ trái sang phải. */
const upArc = o => `M${r1(o.cx - o.rx)} ${r1(o.cy)}A${r1(o.rx)} ${r1(o.ry)} 0 0 1 ${r1(o.cx + o.rx)} ${r1(o.cy)}`
/** Điểm trên ellipse ở góc deg (độ; 0 = phải, 90 = dưới, chiều kim đồng hồ trên màn hình). */
const onE = (o, deg) => {
  const a = deg * Math.PI / 180
  return [r1(o.cx + o.rx * Math.cos(a)), r1(o.cy + o.ry * Math.sin(a))]
}
/** Cung ellipse từ góc a tới góc b (a < b, theo chiều kim đồng hồ, nhỏ hơn nửa vòng). */
const arcE = (o, a, b) => {
  const [x0, y0] = onE(o, a), [x1, y1] = onE(o, b)
  return `M${x0} ${y0}A${r1(o.rx)} ${r1(o.ry)} 0 0 1 ${x1} ${y1}`
}
/** Nét không tô: w độ dày, c màu (mặc định mực), o độ mờ. */
const ln = (d, w, c, o) =>
  `<path d="${d}" fill="none"${c ? ` stroke="${c}"` : ''}${w ? ` stroke-width="${w}"` : ''}${o ? ` opacity="${frac(o)}"` : ''}/>`
/** Mảng tô không viền. */
const fl = (d, c, o) => `<path d="${d}" fill="${c}" stroke="none"${o ? ` opacity="${frac(o)}"` : ''}/>`
/** Vành khuyên giữa hai ellipse (mặt trên của vành chảo, nồi, ly…). */
const ring = (a, b, c) => `<path d="${ellD(a.cx, a.cy, a.rx, a.ry)}${ellD(b.cx, b.cy, b.rx, b.ry)}" fill="${c}" fill-rule="evenodd" stroke="none"/>`
/** Mảng tối lưỡi liềm ở phía TRÊN-TRÁI của ellipse: bóng vành đổ vào lòng vật lõm (tô, chén, mặt nước). */
const shadeTL = (o, c, k = 0.22) =>
  `<path d="${ellipseShade(o.cx, o.cy, o.rx, o.ry, k)}" transform="rotate(180 ${r1(o.cx)} ${r1(o.cy)})" fill="${c}" stroke="none"/>`
/** Thân trụ nhìn chéo: nửa trên ellipse vành (ry) + nửa dưới ellipse "mép thân" (ry2 > ry: thành ngoài lộ ra phía trước). */
const bowlD = (o, ry2) =>
  `M${r1(o.cx - o.rx)} ${r1(o.cy)}A${r1(o.rx)} ${r1(o.ry)} 0 0 1 ${r1(o.cx + o.rx)} ${r1(o.cy)}A${r1(o.rx)} ${r1(ry2)} 0 0 1 ${r1(o.cx - o.rx)} ${r1(o.cy)}Z`
/** Mảng tối phía phải của thành ngoài (giữa mép vành và mép thân), từ hoành độ x tới mép phải. */
const wallShade = (o, ry2, x, c) => {
  const k = (x - o.cx) / o.rx, s = Math.sqrt(1 - k * k)
  return fl(`M${r1(x)} ${r1(o.cy + ry2 * s)}A${r1(o.rx)} ${r1(ry2)} 0 0 0 ${r1(o.cx + o.rx)} ${r1(o.cy)}` +
    `A${r1(o.rx)} ${r1(o.ry)} 0 0 1 ${r1(x)} ${r1(o.cy + o.ry * s)}Z`, c)
}
const STAR = (x, y) => `<path d="M${x} ${y}l2 5.4 5.4 2-5.4 2-2 5.4-2-5.4-5.4-2 5.4-2Z" fill="#fff" stroke="none"/>`
const MET = PAL.thep

// ---------- Chảo lớn (nhìn chéo từ trên; cán gỗ chĩa lên bên phải; lòng chảo rộng để thả trứng) ----------

const CH = { cx: 140, cy: 90, rx: 116, ry: 52 }            // vành ngoài
const CH_IN = { cx: 140, cy: 92, rx: 106, ry: 45 }         // mép trong của vành
const CH_FL = { cx: 140, cy: 99, rx: 90, ry: 37 }          // đáy chảo (mặt chiên)
const CH_WALL = 67                                          // ry mép dưới thân (thành ngoài lộ ra phía trước)
const CH_ROT = -30
const IRON = ['#565c68', '#3c4049', '#a3abb6']               // thân chảo: nền, tối, vành sáng
const GRIP = 'M287 73H315A11 11 0 0 1 315 95H287A11 11 0 0 1 287 73Z'
const GRIP_HOLE = 'M304 82a4 4 0 1 0 8 0a4 4 0 1 0-8 0Z'
const chao_lon = svg(
  ground(146, 158, 118, 9) +
  // Cán: cổ thép tán đinh + chuôi gỗ có lỗ treo (lỗ thật nhờ fill-rule evenodd), xoay quanh chỗ gắn vào thân.
  `<g transform="rotate(${CH_ROT} 246 84)">` +
  `<rect x="230" y="77" width="54" height="14" rx="4" fill="${MET[1]}"/>` +
  ln('M256 80.6H278', 2, '#fff', 0.6) +
  `<circle cx="267" cy="84" r="2.6" fill="${MET[0]}" stroke-width="1.5"/>` +
  `<path d="${GRIP}${GRIP_HOLE}" fill="${PAL.go_dam[0]}" fill-rule="evenodd" stroke="none"/>` +
  fl('M276.2 86A11 11 0 0 0 287 95H315A11 11 0 0 0 325.8 86Z', PAL.go_dam[1]) +
  ln('M290 77.6H298', 2.6, '#fff', 0.45) +
  ln(GRIP) + ln(GRIP_HOLE, 2) + `</g>` +
  // Thân: thành ngoài (mảng tối bên phải, vệt sáng bên trái), vành, lòng chảo, đáy chảo có vệt dầu.
  fl(bowlD(CH, CH_WALL), IRON[0]) +
  wallShade(CH, CH_WALL, 116, IRON[1]) +
  ln(arcE({ cx: 140, cy: 90, rx: 116, ry: 59.5 }, 125, 160), 3, '#fff', 0.28) +
  ring(CH, CH_IN, IRON[2]) +
  ln(arcE({ cx: 140, cy: 91, rx: 111, ry: 48.5 }, 200, 250), 3.4, '#fff', 0.6) +
  ell(CH_IN, 'fill="#40444d" stroke="none"') +
  `<path d="${ellipseShade(CH_IN.cx, CH_IN.cy, CH_IN.rx, CH_IN.ry, 0.3)}" fill="#59606c" stroke="none"/>` +
  ell(CH_FL, 'fill="#666e7b" stroke="none"') +
  hilite(106, 84, 44, 12, 0.14, -6) +
  ln(arcE({ cx: 140, cy: 99, rx: 82, ry: 31 }, 196, 236), 3, '#fff', 0.3) +
  // Vệt dầu ăn bóng trên đáy chảo.
  ell({ cx: 172, cy: 112, rx: 11, ry: 3.2 }, 'fill="#ffe7a0" opacity=".45" stroke="none"') +
  ell({ cx: 116, cy: 121, rx: 6, ry: 2 }, 'fill="#ffe7a0" opacity=".4" stroke="none"') +
  ell({ cx: 194, cy: 95, rx: 4.5, ry: 1.6 }, 'fill="#ffe7a0" opacity=".45" stroke="none"') +
  hilite(169, 111, 3, 1, 0.8) +
  ell(CH_FL, 'fill="none" stroke-width="1.75" opacity=".35"') +
  ln(bowlD(CH, CH_WALL)) + ln(lowArc(CH), 2.4) + ell(CH_IN, 'fill="none" stroke-width="2"'),
  [320, 176])

// ---------- Nồi lớn có nước (nhôm, nhìn chéo từ trên; hai quai) ----------

const NOI = { cx: 120, cy: 64, rx: 98, ry: 30 }
const NOI_IN = { cx: 120, cy: 65, rx: 90, ry: 26 }
const NOI_W = { cx: 120, cy: 70, rx: 86, ry: 21 }            // mặt nước
const NOI_BODY = 'M22 64A98 30 0 0 1 218 64L212 172A92 26 0 0 1 28 172Z'
const ALU = ['#d3dbe4', '#a6b2c0', '#eef2f6']
const noi_lon = svg(
  ground(120, 199, 104, 8) +
  `<rect x="2" y="78" width="32" height="18" rx="8" fill="#5a463c"/>` + ln('M7 82.4H20', 2, '#fff', 0.35) +
  `<rect x="206" y="78" width="32" height="18" rx="8" fill="#5a463c"/>` + ln('M221 82.4H233', 2, '#fff', 0.35) +
  fl(NOI_BODY, ALU[0]) +
  fl('M184 64L180 191.7A92 26 0 0 0 212 172L218 64Z', ALU[1]) +
  ln('M42 92L46 180', 8, '#fff', 0.45) + ln('M60 96L62 184', 3, '#fff', 0.35) +
  ln(lowArc({ cx: 120, cy: 104, rx: 95.8, ry: 28 }), 1.75, '', 0.4) +
  ring(NOI, NOI_IN, ALU[2]) +
  ln(arcE({ cx: 120, cy: 64.5, rx: 94, ry: 28 }, 200, 250), 3, '#fff', 0.8) +
  ell(NOI_IN, 'fill="#a3afbd" stroke="none"') +
  ell(NOI_W, 'fill="#8fd0e8" stroke="none"') +
  shadeTL(NOI_W, '#6cb9d8', 0.25) +
  ell({ cx: 128, cy: 75, rx: 42, ry: 9.5 }, 'fill="none" stroke="#fff" stroke-width="2" opacity=".5"') +
  ell({ cx: 128, cy: 75, rx: 20, ry: 4.5 }, 'fill="none" stroke="#fff" stroke-width="2" opacity=".6"') +
  hilite(84, 62, 16, 3.4, 0.6, -4) +
  ell(NOI_W, 'fill="none" stroke-width="1.75" opacity=".4"') +
  ln(NOI_BODY) + ln(lowArc(NOI), 2.4) + ell(NOI_IN, 'fill="none" stroke-width="2"'),
  [240, 210])

// ---------- Phin cà phê đặt trên ly thủy tinh (nhìn ngang hơi chếch trên) ----------
// Thân ly trong suốt (tô trắng mờ): bên dùng vẽ cà phê bằng CSS ĐẶT DƯỚI hình, cắt theo PROP_META.phin_lon.cup.

const PH_CUP = { mouth: { cx: 100, cy: 152, rx: 58, ry: 11 }, bottom: { cx: 100, cy: 250, rx: 47, ry: 8 },
  left: [[42, 156], [53, 250]], right: [[158, 156], [147, 250]] }
const PH_GLASS = 'M38 150L48 262A52 10 0 0 0 152 262L162 150Z'
const PH_PLATE = 'M26 146A74 14 0 0 1 174 146L174 151A74 14 0 0 1 26 151Z'
const PH_BODY = 'M54 80A46 10 0 0 1 146 80L142 146A42 9 0 0 1 58 146Z'
const PH_LID = 'M50 74A50 11 0 0 1 150 74L150 80A50 11 0 0 1 50 80Z'
const phin_lon = svg(
  ground(100, 271, 64, 6) +
  // Ly: thân trong, đáy dày, vệt sáng.
  fl(PH_GLASS, '#e6f5fb', 0.24) +
  fl('M47 250L48 262A52 10 0 0 0 152 262L153 250A53 9 0 0 1 47 250Z', '#dff1f7', 0.75) +
  ln(upArc(PH_CUP.bottom), 1.75, '', 0.3) + ln(lowArc({ cx: 100, cy: 250, rx: 53, ry: 9 }), 1.75, '', 0.35) +
  ln('M50 172L56 240', 6, '#fff', 0.6) + ln('M64 176L67 214', 2.4, '#fff', 0.5) + ln('M148 172L144 238', 2.4, '#fff', 0.45) +
  ln(PH_GLASS) +
  // Đĩa phin gác trên miệng ly.
  fl(PH_PLATE, MET[1]) + ell({ cx: 100, cy: 146, rx: 74, ry: 14 }, `fill="${MET[0]}" stroke="none"`) +
  ln(arcE({ cx: 100, cy: 146, rx: 68, ry: 11 }, 196, 236), 2.6, '#fff', 0.9) +
  ln(PH_PLATE) + ln(lowArc({ cx: 100, cy: 146, rx: 74, ry: 14 }), 2) +
  // Bầu phin.
  tone3({
    outline: PH_BODY, base: MET[0], dark: MET[1], shade: 'M127 80L124 153.4A42 9 0 0 0 142 146L146 80Z',
    detail: ln(lowArc({ cx: 100, cy: 104, rx: 44.5, ry: 9.6 }), 1.75, '', 0.35),
    shine: ln('M66 92L68 140', 5, '#fff', 0.6) + ln('M78 94L79 122', 2, '#fff', 0.45)
  }) +
  // Nắp phin và núm.
  tone3({
    outline: PH_LID, base: MET[1], dark: '#94a3b4', shade: 'M120 84.8A50 11 0 0 0 150 80V74Z',
    detail: ell({ cx: 100, cy: 74, rx: 50, ry: 11 }, `fill="${MET[0]}" stroke="none"`) +
      ln(arcE({ cx: 100, cy: 74, rx: 44, ry: 8.4 }, 196, 240), 2.6, '#fff', 0.9) + ln(lowArc({ cx: 100, cy: 74, rx: 50, ry: 11 }), 2)
  }) +
  tone3({ outline: 'M90 58V68A10 3.4 0 0 0 110 68V58Z', base: MET[1], dark: '#94a3b4', shade: 'M103 58V71.2A10 3.4 0 0 0 110 68V58Z' }) +
  ell({ cx: 100, cy: 58, rx: 10, ry: 3.4 }, `fill="${MET[2]}" stroke-width="2"`),
  [200, 280])

// ---------- Ly nhựa trong lớn (nhìn ngang hơi chếch trên) ----------
// Thân ly trong suốt: bên dùng vẽ mực nước bằng CSS ĐẶT DƯỚI hình, cắt theo mouth/bottom/left/right trong PROP_META.ly_lon.

const LY = { mouth: { cx: 100, cy: 31, rx: 75, ry: 12.5 }, bottom: { cx: 100, cy: 226, rx: 50, ry: 10 },
  left: [[25, 31], [50, 226]], right: [[175, 31], [150, 226]] }
const LY_RIM = { cx: 100, cy: 30, rx: 80, ry: 15 }
const LY_BODY = 'M20 30A80 15 0 0 1 180 30L154 230A54 11 0 0 1 46 230Z'
const ly_lon = svg(
  ground(100, 241, 64, 7) +
  fl(LY_BODY, '#eef8fc', 0.18) +
  fl('M164 42L178.4 42L154.8 226L141 226Z', PAL.nhua[1], 0.5) +
  ell(LY.bottom, 'fill="#fff" stroke-width="1.75" opacity=".3"') +
  ln(lowArc({ cx: 100, cy: 204, rx: 57.4, ry: 10.5 }), 1.75, '', 0.4) + ln(upArc({ cx: 100, cy: 204, rx: 57.4, ry: 10.5 }), 1.75, '', 0.18) +
  ln(lowArc({ cx: 100, cy: 64, rx: 75.6, ry: 13.6 }), 1.75, '', 0.3) +
  ln('M34 52L54 214', 7, '#fff', 0.6) + ln('M50 54L66 196', 2.4, '#fff', 0.5) + ln('M166 62L151 204', 2, '#fff', 0.5) +
  ring(LY_RIM, LY.mouth, '#f4fbfe') +
  ln(arcE({ cx: 100, cy: 30.5, rx: 77.5, ry: 13.7 }, 200, 250), 2.6, '#fff', 0.9) +
  ln(LY_BODY) + ln(lowArc(LY_RIM), 2.4) + ell(LY.mouth, 'fill="none" stroke-width="2"'),
  [200, 250])

// ---------- Tô sứ trộn lớn và chén sứ nhỏ (nhìn thẳng từ trên xuống: tâm + bán kính cho cử chỉ khuấy) ----------
// Hai hình vuông cùng khung để vùng khuấy CSS (hình tròn giữa khung) khớp lòng tô/chén; khác nhau ở men và hoa văn.

const C0 = 120
const circ = (r, a) => `<circle cx="${C0}" cy="${C0}" r="${r}" ${a}/>`
const at = (r, deg) => [r1(C0 + r * Math.cos(deg * Math.PI / 180)), r1(C0 + r * Math.sin(deg * Math.PI / 180))]
const arcC = (r, a, b) => { const p = at(r, a), q = at(r, b); return `M${p[0]} ${p[1]}A${r} ${r} 0 0 1 ${q[0]} ${q[1]}` }
const bowlTop = ({ rim, inner, bottom, lip, wall, wallDark, floor, band, k = 0.18, wallDeco = '', mark = '' }) =>
  ground(C0 + 5, C0 + 6, rim, rim) +
  circ(rim, `fill="${lip}" stroke="none"`) + band +
  ln(arcC(rim - 4, 200, 250), 3.4, '#fff', 0.8) +
  circ(inner, `fill="${wall}" stroke="none"`) +
  shadeTL({ cx: C0, cy: C0, rx: inner, ry: inner }, wallDark, k) + wallDeco +
  circ(bottom, `fill="${floor}" stroke="none"`) + circ(bottom, 'fill="none" stroke-width="1.75" opacity=".3"') + mark +
  ln(arcC(inner - 11, 20, 65), 5, '#fff', 0.55) +
  hilite(C0 - bottom * 0.35, C0 - bottom * 0.35, bottom * 0.22, bottom * 0.11, 0.5, -40) +
  circ(rim, 'fill="none"') + circ(inner, 'fill="none" stroke-width="2"')
const TO = { rim: 108, inner: 98, bottom: 60 }
const to_lon = svg(bowlTop({
  ...TO, lip: '#fffaf0', wall: '#f3e8d2', wallDark: '#e2cfa9', floor: '#fbf3e3', k: 0.26,
  band: circ(103, `fill="none" stroke="${PAL.xanh_nhan[0]}" stroke-width="3"`),
  // Hoa văn lam chạy quanh thành trong, sát mép (lộ ra quanh lớp hỗn hợp CSS).
  wallDeco: circ(94.5, `fill="none" stroke="${PAL.xanh_nhan[0]}" stroke-width="4" stroke-dasharray="9 7" opacity=".85"`)
}), [240, 240])
// Chén men ngọc miệng viền nâu, lòng sâu (đáy nhỏ), giữa đáy có bông hoa nhỏ.
const CHEN = { rim: 106, inner: 95, bottom: 46 }
const chen_lon = svg(bowlTop({
  ...CHEN, lip: '#eef7f2', wall: '#cfe7dc', wallDark: '#aed3c2', floor: '#e3f2ea', k: 0.24,
  band: circ(103.4, 'fill="none" stroke="#8a5a3a" stroke-width="2.4"'),
  mark: [0, 90, 180, 270].map(d => { const [x, y] = at(7, d); return `<ellipse cx="${x}" cy="${y}" rx="6.4" ry="3.4" transform="rotate(${d} ${x} ${y})" fill="#9ccab5" stroke="none"/>` }).join('') +
    circ(3, 'fill="#e8c35a" stroke="none"')
}), [240, 240])

// ---------- Rổ tre (nhìn chéo từ trên; vành tre quấn dây, lòng đan chéo) ----------

const RO = { cx: 135, cy: 78, rx: 124, ry: 56 }
const RO_IN = { cx: 135, cy: 80, rx: 112, ry: 48 }
const RO_WALL = 74
// Nan đan chéo trong lòng rổ: các đường song song (hướng dir) cắt ellipse e (tính đầu mút bằng phương trình bậc hai).
function weave(e, dir, gap) {
  const [dx, dy] = dir, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L
  let d = ''
  for (let s = -120; s <= 120; s += gap) {
    const px = e.cx - uy * s, py = e.cy + ux * s
    const A = (ux / e.rx) ** 2 + (uy / e.ry) ** 2
    const B = 2 * ((px - e.cx) * ux / e.rx ** 2 + (py - e.cy) * uy / e.ry ** 2)
    const C = ((px - e.cx) / e.rx) ** 2 + ((py - e.cy) / e.ry) ** 2 - 1
    const D = B * B - 4 * A * C
    if (D <= 0) continue
    const t0 = (-B - Math.sqrt(D)) / (2 * A), t1 = (-B + Math.sqrt(D)) / (2 * A)
    if (t1 - t0 < 8) continue
    d += `M${r1(px + ux * t0)} ${r1(py + uy * t0)}L${r1(px + ux * t1)} ${r1(py + uy * t1)}`
  }
  return d
}
const RO_WEAVE_E = { cx: 135, cy: 80, rx: 110, ry: 46 }
const ro_lon = svg(
  ground(138, 157, 118, 9) +
  fl(bowlD(RO, RO_WALL), '#c48f36') +
  wallShade(RO, RO_WALL, 150, '#a8782a') +
  ln(Array.from({ length: 16 }, (_, i) => {
    const t = (15 + i * 10) * Math.PI / 180, x = r1(RO.cx + RO.rx * Math.cos(t))
    return `M${x} ${r1(RO.cy + RO.ry * Math.sin(t))}V${r1(RO.cy + RO_WALL * Math.sin(t))}`
  }).join(''), 2, '#8a6420') +
  ln(lowArc({ cx: 135, cy: 78, rx: 124, ry: 65 }), 3.4, PAL.rom[0]) +
  ring(RO, RO_IN, PAL.rom[0]) +
  ln(Array.from({ length: 15 }, (_, i) => { const [x, y] = onE({ cx: 135, cy: 79, rx: 118, ry: 52 }, i * 24 + 6); return `M${r1(x - 3)} ${r1(y - 4)}l6 8` }).join(''),
    2.4, '#a8782a') +
  ln(arcE({ cx: 135, cy: 79, rx: 118, ry: 52 }, 200, 238), 3, '#fff', 0.5) +
  ell(RO_IN, 'fill="#d9a64e" stroke="none"') +
  ln(weave(RO_WEAVE_E, [1, 0.43], 17), 2, '#b8822e') +
  ln(weave(RO_WEAVE_E, [1, -0.43], 17), 2, '#b8822e') +
  shadeTL(RO_IN, '#bd8a3a', 0.25) +
  ln(bowlD(RO, RO_WALL)) + ln(lowArc(RO), 2.4) + ell(RO_IN, 'fill="none" stroke-width="2"'),
  [270, 180])

// ---------- Bình lắc inox (nắp nhỏ, cổ lọc, vành nối, thân thuôn; giọt nước đọng vì lạnh) ----------

const drop = (x, y) => `<path d="M${x} ${y - 3.4}C${x + 2.6} ${y} ${x + 2.4} ${y + 3} ${x} ${y + 3}C${x - 2.4} ${y + 3} ${x - 2.6} ${y} ${x} ${y - 3.4}Z" fill="#f4fbff" stroke="#8fa9bd" stroke-width="1.4"/>`
const binh_lac_lon = svg(
  ground(68, 212, 46, 6) +
  tone3({
    outline: 'M22 82L32 204A36 7.5 0 0 0 104 204L114 82Z', base: MET[0], dark: MET[1],
    shade: 'M93 82L86 210.5A36 7.5 0 0 0 104 204L114 82Z',
    detail: drop(84, 112) + drop(94, 140) + drop(79, 166) + drop(62, 186),
    shine: ln('M35 96L43 194', 6, '#fff', 0.6) + ln('M48 98L52 150', 2.2, '#fff', 0.5) + STAR(52, 158)
  }) +
  tone3({
    outline: 'M49 32C49 46 24 58 24 72H112C112 58 87 46 87 32Z', base: MET[0], dark: MET[1],
    shade: 'M76 32C80 48 98 58 98 72H112C112 58 87 46 87 32Z', shine: ln('M42 60C46 50 51 44 54 37', 3, '#fff', 0.55)
  }) +
  tone3({
    outline: 'M22 70A46 7 0 0 1 114 70L114 82A46 7 0 0 1 22 82Z', base: '#cfd8e2', dark: MET[1],
    shade: 'M96 75.6A46 7 0 0 0 114 70L114 82A46 7 0 0 1 96 88.6Z',
    detail: ln(lowArc({ cx: 68, cy: 70, rx: 46, ry: 7 }), 2), shine: ln('M30 79H52', 2.4, '#fff', 0.6)
  }) +
  tone3({
    outline: 'M53 16A15 4.5 0 0 1 83 16L84 32A16 5 0 0 1 52 32Z', base: MET[0], dark: MET[1],
    shade: 'M76 16L77 36.1A16 5 0 0 0 84 32L83 16Z', shine: ln('M58 22V30', 2.4, '#fff', 0.6)
  }) +
  ell({ cx: 68, cy: 16, rx: 15, ry: 4.5 }, `fill="${MET[2]}" stroke-width="2"`),
  [136, 220])

// ---------- Bếp ga mini (nhìn chéo; kiềng 4 chân, lửa xanh tách nhóm data-part="lua" để CSS lắc) ----------

const BG_C = { cx: 104, cy: 76 }
const arm = deg => {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  return `M${r1(BG_C.cx + 34 * c)} ${r1(BG_C.cy + 10.5 * s)}L${r1(BG_C.cx + 58 * c)} ${r1(BG_C.cy + 18 * s)}l0-8`
}
const arms = list => ln(list.map(arm).join(''), 7) + ln(list.map(arm).join(''), 3.4, '#4a4d55')
// Lưỡi lửa: đáy tròn, đỉnh nhọn; lõi sáng không viền.
const tongue = (x, y, w, h) => `M${r1(x - w / 2)} ${r1(y)}C${r1(x - w / 2)} ${r1(y - h * 0.45)} ${r1(x - w * 0.15)} ${r1(y - h * 0.7)} ${r1(x)} ${r1(y - h)}` +
  `C${r1(x + w * 0.15)} ${r1(y - h * 0.7)} ${r1(x + w / 2)} ${r1(y - h * 0.45)} ${r1(x + w / 2)} ${r1(y)}Q${r1(x)} ${r1(y + w * 0.4)} ${r1(x - w / 2)} ${r1(y)}Z`
const FLAMES = [200, 240, 270, 300, 340, 20, 60, 90, 120, 160]
  .map(d => { const a = d * Math.PI / 180; return { x: BG_C.cx + 22 * Math.cos(a), y: BG_C.cy - 1 + 6.5 * Math.sin(a), h: 17 + 10 * (Math.sin(a) + 1) / 2 } })
  .sort((p, q) => p.y - q.y)
const FLAME_TOP = r1(Math.min(...FLAMES.map(f => f.y - f.h)))   // đỉnh ngọn lửa cao nhất
const BG_SIL = roundPoly([[34, 60], [226, 60], [246, 92], [246, 148], [14, 148], [14, 92]], 8)
const bep_ga = svg(
  ground(130, 157, 118, 7) +
  `<rect x="28" y="142" width="28" height="12" rx="4" fill="#3b3e46"/><rect x="204" y="142" width="28" height="12" rx="4" fill="#3b3e46"/>` +
  fl(BG_SIL.d, MET[0]) +
  fl('M200 60H226L246 92H214Z', MET[1]) +
  fl('M14 92H246V140Q246 148 238 148H22Q14 148 14 140Z', PAL.do[0]) +
  fl('M14 136H246V140Q246 148 238 148H22Q14 148 14 140Z', PAL.do[1]) +
  ln('M40 63.4H150', 2.4, '#fff', 0.7) + ln('M20 95.6H240', 2.4, '#fff', 0.35) +
  `<path d="${roundPoly([[172, 66], [218, 66], [232, 86], [180, 86]], 5, 1).d}" fill="#c9d3de" stroke-width="2"/>` +
  ln('M184 71H214', 1.75, '', 0.4) +
  // Mặt trước: nhãn có biểu tượng lửa, núm vặn.
  `<rect x="30" y="104" width="118" height="32" rx="7" fill="${PAL.giay[0]}" stroke-width="2"/>` +
  `<path d="${tongue(50, 129, 12, 18)}" fill="#3d86f2" stroke-width="1.6"/>` +
  ln('M66 114H134M66 122H118M66 130H126', 2.4, '', 0.3) +
  `<circle cx="212" cy="120" r="17" fill="${MET[0]}"/><circle cx="212" cy="120" r="11.5" fill="#3b3e46" stroke-width="2"/>` +
  ln('M212 120V110.4', 3, '#fff') + hilite(206, 114, 3.6, 2.2, 0.5, -35) +
  // Đầu đốt, kiềng phía sau, lửa, kiềng phía trước.
  ell({ cx: 104, cy: 76, rx: 28, ry: 8.5 }, 'fill="#3b3e46"') +
  ell({ cx: 104, cy: 74.6, rx: 13, ry: 4 }, 'fill="#70778a" stroke-width="1.75"') +
  arms([210, 330]) +
  `<g data-part="lua">` + FLAMES.map(f => `<path d="${tongue(f.x, f.y, 10, f.h)}" fill="#3d86f2" stroke-width="2"/>` +
    fl(tongue(f.x, f.y - 0.5, 5, f.h * 0.55), '#d6efff')).join('') + `</g>` +
  arms([30, 150]) +
  ln(BG_SIL.d) + ln('M14 92H246', 2.4),
  [260, 170])

// ---------- Đĩa trình bày lớn (sứ trắng viền lam, nhìn chéo từ trên) ----------

const DIA = { cx: 140, cy: 64, rx: 130, ry: 50 }
const DIA_EDGE = 57
const DIA_WELL = { cx: 140, cy: 68, rx: 92, ry: 33 }
const dia_lon = svg(
  ground(144, 123, 126, 9) +
  fl(bowlD(DIA, DIA_EDGE), PAL.dia[1]) +
  wallShade(DIA, DIA_EDGE, 150, '#d3c4a6') +
  ell(DIA, `fill="${PAL.dia[0]}" stroke="none"`) +
  ell({ cx: 140, cy: 65, rx: 121, ry: 45.5 }, `fill="none" stroke="${PAL.xanh_nhan[0]}" stroke-width="3"`) +
  ln(arcE({ cx: 140, cy: 64, rx: 126, ry: 48 }, 195, 240), 4, '#fff', 0.9) +
  ell(DIA_WELL, 'fill="#f6efe0" stroke="none"') +
  shadeTL(DIA_WELL, '#ebe0c8', 0.2) +
  ln(arcE({ cx: 140, cy: 68, rx: 84, ry: 29 }, 20, 60), 3.4, '#fff', 0.7) +
  ell(DIA_WELL, 'fill="none" stroke-width="1.75" opacity=".35"') +
  ln(bowlD(DIA, DIA_EDGE)) + ln(lowArc(DIA), 2.4),
  [280, 140])

// ---------- Vòi nước gắn tường (tay vặn chữ thập nắp lam = nước lạnh; dòng nước do CSS vẽ từ mouth) ----------

const VOI_PIPE = 'M20 42H124C148 42 164 58 164 82V112H146V84C146 70 138 62 124 62H20Z'
const voi_nuoc = svg(
  ball(16, 52, 11, 26, MET) +
  tone3({
    outline: VOI_PIPE, base: MET[0], dark: MET[1], shade: 'M20 55H122V62H20ZM157 84V112H164V84Z',
    shine: ln('M26 47H122', 3, '#fff', 0.75) + ln('M128 47.5C140 48.5 149 55 153 64', 2.6, '#fff', 0.6) + ln('M150.5 86V106', 2.6, '#fff', 0.6)
  }) +
  tone3({ outline: 'M146 106H164C166.2 106 168 107.8 168 110V120H142V110C142 107.8 143.8 106 146 106Z', base: MET[1], dark: '#94a3b4',
    shade: 'M160 106H164C166.2 106 168 107.8 168 110V120H160Z', shine: ln('M146 110H152', 2, '#fff', 0.6) }) +
  ell({ cx: 155, cy: 120, rx: 13, ry: 3.4 }, 'fill="#4f5a66" stroke-width="2"') +
  `<rect x="60" y="20" width="10" height="16" fill="${MET[1]}" stroke-width="2.4"/>` +
  tone3({
    outline: 'M53 34H77C82 34 86 38 86 43V61C86 66 82 70 77 70H53C48 70 44 66 44 61V43C44 38 48 34 53 34Z', base: MET[0], dark: MET[1],
    shade: 'M74 34H77C82 34 86 38 86 43V61C86 66 82 70 77 70H74Z', shine: hilite(54, 42, 4.4, 2.4, 0.6, -30)
  }) +
  tone3({
    outline: 'M42.5 10H87.5C91 10 94 13 94 16.5C94 20 91 23 87.5 23H42.5C39 23 36 20 36 16.5C36 13 39 10 42.5 10Z', base: MET[0], dark: MET[1],
    shade: 'M36.4 18.6C37.2 21 39.6 23 42.5 23H87.5C90.4 23 92.8 21 93.6 18.6Z', shine: ln('M42 13.6H56', 2, '#fff', 0.7)
  }) +
  `<circle cx="65" cy="16.5" r="6.5" fill="#fff" stroke-width="2"/><circle cx="65" cy="16.5" r="3.2" fill="${PAL.xanh_nhan[0]}" stroke="none"/>`,
  [180, 132])

export const PROPS = Object.freeze({
  thot_lon, dao_lon, tay,
  chao_lon, noi_lon, phin_lon, ly_lon, to_lon, chen_lon, ro_lon, binh_lac_lon, bep_ga, dia_lon, voi_nuoc
})

const copyE = o => ({ cx: o.cx, cy: o.cy, rx: o.rx, ry: o.ry })
const copyCup = c => ({ mouth: copyE(c.mouth), bottom: copyE(c.bottom), left: c.left.map(p => [...p]), right: c.right.map(p => [...p]) })

export const PROP_META = deepFreeze({
  thot_lon: { vb: [240, 160], top: BOARD_TOP.map(p => [...p]), center: [120, 69] },
  dao_lon: { vb: [200, 64], tip: [197, 26], grip: [32, 32], edge: [[71, 52], [197, 26]] },
  tay: { vb: [96, 120], tip: [r1(tayTip[0]), r1(tayTip[1])] },
  chao_lon: { vb: [320, 176], center: [CH_FL.cx, CH_FL.cy], floor: copyE(CH_FL), rim: copyE(CH), base: [CH.cx, CH.cy + CH_WALL], handle: [301, 55] },
  noi_lon: { vb: [240, 210], center: [NOI_W.cx, NOI_W.cy], water: copyE(NOI_W), rim: copyE(NOI), base: [120, 198] },
  phin_lon: { vb: [200, 280], drip: [100, 166], lid: [100, 54], cup: copyCup(PH_CUP), base: [100, 271] },
  ly_lon: { vb: [200, 250], ...copyCup(LY), center: [100, 128], base: [100, 241] },
  to_lon: { vb: [240, 240], center: [C0, C0], r: TO.inner - 4, rim: TO.rim, inner: TO.inner, bottom: TO.bottom },
  chen_lon: { vb: [240, 240], center: [C0, C0], r: CHEN.inner - 4, rim: CHEN.rim, inner: CHEN.inner, bottom: CHEN.bottom },
  ro_lon: { vb: [270, 180], center: [135, 84], mouth: copyE(RO_IN), base: [RO.cx, RO.cy + RO_WALL] },
  binh_lac_lon: { vb: [136, 220], center: [68, 140], cap: [68, 12], body: { cx: 68, top: 82, bottom: 204 }, base: [68, 211] },
  bep_ga: { vb: [260, 170], burner: { cx: 104, cy: 76, rx: 28, ry: 8.5 }, flame: { cx: 104, base: 78, top: FLAME_TOP }, seat: [104, r1(FLAME_TOP + 4)], knob: [212, 120] },
  dia_lon: { vb: [280, 140], center: [DIA_WELL.cx, DIA_WELL.cy], well: copyE(DIA_WELL), rim: copyE(DIA), base: [DIA.cx, DIA.cy + DIA_EDGE] },
  voi_nuoc: { vb: [180, 132], mouth: [155, 123], mouthW: 20, handle: [65, 16] }
})
