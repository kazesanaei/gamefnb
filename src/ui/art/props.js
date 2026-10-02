// Đạo cụ sân khấu lớn M5 (viewBox riêng, ghi trong PROP_META): thớt gỗ lớn, dao lớn, bàn tay mẫu.
// Thuần, import trong Node được. Quy chuẩn vẽ như kit.js; mỗi đạo cụ ≤ 6 KB.
// PROP_META cho bên dùng biết hộp vẽ và các điểm mốc (tọa độ theo viewBox của đạo cụ) để canh vị trí:
//   thot_lon.top: 4 góc mặt thớt (trên-trái, trên-phải, dưới-phải, dưới-trái), center: tâm mặt thớt;
//   dao_lon.tip: mũi dao, grip: giữa chuôi, edge: đầu và cuối lưỡi cắt;
//   tay.tip: đầu ngón trỏ (điểm chạm của "tay mẫu").

import { INK, DETAIL, PAL, svg, ground, hilite, tone3, dots, r1, rotPts, polyD, crescent, deepFreeze } from './kit.js'

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

export const PROPS = Object.freeze({ thot_lon, dao_lon, tay })

export const PROP_META = deepFreeze({
  thot_lon: { vb: [240, 160], top: BOARD_TOP.map(p => [...p]), center: [120, 69] },
  dao_lon: { vb: [200, 64], tip: [197, 26], grip: [32, 32], edge: [[71, 52], [197, 26]] },
  tay: { vb: [96, 120], tip: [r1(tayTip[0]), r1(tayTip[1])] }
})
