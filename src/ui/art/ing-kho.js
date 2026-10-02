// Hình nguyên liệu khô, chai lọ, bột, đồ uống M5 kèm hình trạng thái sau sơ chế. Thuần, import trong Node được.
// Mọi hình viewBox 0 0 64 64, theo quy chuẩn ở kit.js (thiết kế M5 mục 6.1). Chữ trong hình chỉ ở hai chai TƯƠNG / MẮM.
// Cặp bẫy khác nhau ngay ở DÁNG (nhận ra ở 48px), không chỉ khác màu:
// - nước tương: chai CAO cổ dài nâu đen, nắp đỏ, nhãn hạt đậu; nước mắm: chai THẤP bầu rộng hổ phách, nắp vàng, nhãn con cá;
// - đường: bao bố be mở miệng, đống đường trắng, nhãn đỏ; muối: hũ thủy tinh thấp nắp xanh, hạt tinh thể; đường phèn: ba cục có mặt cắt;
// - bánh tráng: xấp nhiều lá mỏng có vân nan; bánh tráng mè: một lá dày nướng vàng rắc mè đen;
// - cà phê phin: túi giấy gấp miệng kẹp kẽm; cà phê hòa tan: ba gói que xòe; cà phê Buôn Ma Thuột ★: bao bố buộc dây, hạt đổ trước;
// - sữa đặc: lon thấp nắp đục lỗ; sữa tươi: hộp giấy cao mái nhọn;
// - bột mì: bao giấy đứng miệng nhăn kèm bông lúa; bột năng: túi vải tròn buộc túm kèm củ khoai mì;
// - nước cốt dừa: nửa trái dừa đựng nước cốt; dừa nạo: đống sợi trắng trên lá chuối;
// - hàng hiếm có sao #ffd23f góc trên-phải: mật ong rừng (hũ phủ vải), muối tôm (túi zip cam), khô mực (con mực khô).

import { INK, DETAIL, PAL, svg, ground, hilite, tone3, txt, r1, dots, ellipseShade, crescent, polyD, rareStar } from './kit.js'

const LABEL = PAL.giay
const GREEN = ['#4f9a3c', '#347a2c', '#8fd06a']
const GOLD = ['#f2c230', '#c9971a', '#fff0a8']
const ICE = [PAL.da_lanh[0], '#a7d6ec', '#f6fdff']
const BEAN = ['#5a321c', '#3c1e10', '#b07a4c']
const BARK = ['#8f5a32', '#6b3f20', '#c08a5c']
const BT = ['#f4e7c6', '#dcc794', '#fffaf0']

const pt = ([x, y]) => `${r1(x)} ${r1(y)}`

// Nắp chai có khía dọc.
function cap(x, y, w, h, fill, ridge) {
  const lines = []
  for (let i = 1; i < 4; i++) lines.push(`M${r1(x + (w * i) / 4)} ${r1(y + 1.6)}V${r1(y + h - 1.6)}`)
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.2" fill="${fill}"/>` +
    `<path d="${lines.join('')}" stroke="${ridge}" stroke-width="1.4"/>` +
    hilite(x + 2.6, y + h / 2, 1, h * 0.28, 0.6)
}

// Nét ống có viền mực (sợi, dải, cọng): nét INK dày hơn bên dưới, lõi màu bên trên; d có thể gồm nhiều đoạn M….
function tube(d, w, fill, sw = 2.6) {
  return `<path d="${d}" fill="none" stroke-width="${r1(w + sw)}"/><path d="${d}" fill="none" stroke="${fill}" stroke-width="${r1(w)}"/>`
}

// Khối lập phương nhìn chéo (đá viên, viên đường): (x, y) là đỉnh dưới phía trước, s là cạnh.
// c = [mặt trái, mặt phải tối, mặt trên sáng].
function cube(x, y, s, c, sw = 2.4) {
  const k = s * 0.95, h = s * 0.45
  const L = [x - k, y - h], A = [x, y], R = [x + k, y - h], A2 = [x, y - s], L2 = [x - k, y - h - s], R2 = [x + k, y - h - s], B2 = [x, y - 2 * h - s]
  return tone3({
    outline: polyD([L, A, R, R2, B2, L2]), base: c[0], dark: c[1], shade: polyD([A, R, R2, A2]), sw,
    detail: `<path d="${polyD([L2, A2, R2, B2])}" fill="${c[2]}" stroke="none"/>` +
      `<path d="M${pt(L2)}L${pt(A2)}L${pt(R2)}M${pt(A2)}V${r1(y)}" fill="none" stroke-width="1.4"/>`,
    shine: `<path d="M${pt([x - k + 1.8, y - h - 1.6])}V${r1(y - h - s + 2.6)}" stroke="#fff" stroke-width="1.5" opacity=".9"/>`
  })
}

// Hạt cà phê rang: bầu dục nâu sẫm, đường rãnh cong sáng.
function bean(x, y, rot, s = 1) {
  const rx = 3.6 * s, ry = 2.6 * s
  return `<g transform="rotate(${rot} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${BEAN[0]}" stroke-width="1.7"/>` +
    `<path d="M${pt([x - rx * 0.72, y + 0.5 * s])}C${pt([x - s, y - 1.5 * s])} ${pt([x + s, y + 1.5 * s])} ${pt([x + rx * 0.72, y - 0.5 * s])}" ` +
    `fill="none" stroke="${BEAN[2]}" stroke-width="1.3"/></g>`
}

// Đĩa sứ trắng (hình trạng thái đặt món đã sơ chế lên đĩa, giống dưa leo thái lát).
const PLATE = `<path d="M4 40.6A28 12.5 0 0 1 60 40.6V44.4A28 12.5 0 0 1 4 44.4Z" fill="${PAL.dia[1]}"/>` +
  `<ellipse cx="32" cy="40.6" rx="27.2" ry="11.8" fill="${PAL.dia[0]}" stroke="#cbbca2" stroke-width="1.6"/>` +
  `<ellipse cx="32" cy="41.5" rx="20" ry="8" fill="none" stroke="#ddd2bd" stroke-width="${DETAIL}"/>` + hilite(14, 37, 4, 1.6, 0.8, -15)

// Họ đoạn thẳng song song hướng (dx, dy), cách nhau gap, cắt trong ellipse (cx, cy, a, b): vân nan tre trên bánh tráng.
function hatch(cx, cy, a, b, dx, dy, gap) {
  const n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n, nx = -uy, ny = ux
  let d = ''
  for (let i = -8; i <= 8; i++) {
    const qx = i * gap * nx, qy = i * gap * ny
    const A = (ux / a) ** 2 + (uy / b) ** 2
    const B = 2 * (qx * ux / (a * a) + qy * uy / (b * b))
    const C = (qx / a) ** 2 + (qy / b) ** 2 - 1
    const D = B * B - 4 * A * C
    if (D <= 0) continue
    const t1 = (-B - Math.sqrt(D)) / (2 * A), t2 = (-B + Math.sqrt(D)) / (2 * A)
    if (t2 - t1 < 4) continue
    d += `M${pt([cx + qx + t1 * ux, cy + qy + t1 * uy])}L${pt([cx + qx + t2 * ux, cy + qy + t2 * uy])}`
  }
  return d
}

// Đốm sáng lấp lánh 4 cánh (đá lạnh, đường, đường phèn).
const glint = (x, y, r = 3) =>
  `<path d="M${x} ${r1(y - r)}L${r1(x + r * 0.3)} ${r1(y - r * 0.3)}L${r1(x + r)} ${y}L${r1(x + r * 0.3)} ${r1(y + r * 0.3)}L${x} ${r1(y + r)}` +
  `L${r1(x - r * 0.3)} ${r1(y + r * 0.3)}L${r1(x - r)} ${y}L${r1(x - r * 0.3)} ${r1(y - r * 0.3)}Z" fill="#fff" stroke-width="1.4"/>`

// =====================================================================================================================
// Chai, lọ, hũ
// =====================================================================================================================

const nuoc_tuong = svg(
  ground(32, 58, 17, 3.2) +
  tone3({
    outline: 'M27.5 10H36.5V15.5C36.5 19.5 47 20.5 47 26.5V53C47 56.4 44.8 58 42 58H22C19.2 58 17 56.4 17 53V26.5C17 20.5 27.5 19.5 27.5 15.5Z',
    base: PAL.tuong[0], dark: PAL.tuong[1],
    shade: 'M40.6 21.4C44.6 22.8 47 24.4 47 26.5V53C47 56.4 44.8 58 42 58H38.4C40.8 57.2 41.8 55.4 41.8 53V27C41.8 24.8 41.4 22.8 40.6 21.4Z',
    detail:
      // Nhãn giấy (mép phải tối vì cong theo thân chai), ba hạt đậu nành, chữ TƯƠNG.
      `<rect x="18.6" y="28.6" width="26.8" height="23.4" rx="2" fill="${LABEL[0]}" stroke-width="${DETAIL}"/>` +
      `<path d="M41.6 29.5H44.5V51.1H41.6Z" fill="${LABEL[1]}" stroke="none"/>` +
      `<ellipse cx="26.6" cy="36.4" rx="3.4" ry="2.7" fill="#f0cf6e" stroke-width="1.4" transform="rotate(-25 26.6 36.4)"/>` +
      `<ellipse cx="32.2" cy="34.6" rx="3.4" ry="2.7" fill="#f0cf6e" stroke-width="1.4" transform="rotate(8 32.2 34.6)"/>` +
      `<ellipse cx="37.6" cy="36.6" rx="3.4" ry="2.7" fill="#f0cf6e" stroke-width="1.4" transform="rotate(28 37.6 36.6)"/>` +
      `<path d="M25.6 36.9l1.7-.9M31.4 35l1.8-.2M36.8 36.2l1.7.8" stroke="#b98a2c" stroke-width="1.1"/>` +
      txt(32, 48.6, 'TƯƠNG', 9, PAL.tuong[0], 0.76),
    shine: hilite(20.8, 25.4, 1.4, 2.6, 0.45) + `<path d="M20.4 53.4V54.6" stroke="#fff" stroke-width="2" opacity=".35"/>` +
      `<path d="M29.2 12V17" stroke="#fff" stroke-width="1.6" opacity=".45"/>`
  }) +
  cap(25.5, 2.5, 13, 8, PAL.do[0], PAL.do[1]))

const nuoc_mam = svg(
  ground(32, 58, 21, 3.4) +
  tone3({
    outline: 'M27.5 23H36.5V27C36.5 30 51 30.5 51 36.5V53C51 56.4 48.6 58 45 58H19C15.4 58 13 56.4 13 53V36.5C13 30.5 27.5 30 27.5 27Z',
    base: PAL.mam[0], dark: PAL.mam[1],
    shade: 'M44.6 31.6C48.8 32.6 51 34.2 51 36.5V53C51 56.4 48.6 58 45 58H40.8C43.8 57.3 45.6 55.6 45.6 53V37C45.6 34.8 45.3 33 44.6 31.6Z',
    detail:
      // Mực nước mắm (phần cổ chai còn trống sáng hơn), nhãn giấy có con cá và chữ MẮM.
      `<path d="M28.5 24.6H35.5V27.4H28.5Z" fill="${PAL.mam[2]}" stroke="none" opacity=".75"/>` +
      `<rect x="17" y="34.8" width="30" height="21" rx="2.4" fill="${LABEL[0]}" stroke-width="${DETAIL}"/>` +
      `<path d="M43.4 35.7H46.1V54.9H43.4Z" fill="${LABEL[1]}" stroke="none"/>` +
      `<path d="M23.4 39.2C26 36.2 31.4 35.6 35.6 37.4L40.4 35V43L35.6 40.8C31.4 42.6 26 42.2 23.4 39.2Z" fill="${PAL.xanh_nhan[0]}" stroke-width="1.5"/>` +
      `<path d="M30.6 36.6C31.6 37.6 31.6 40.6 30.6 41.6" fill="none" stroke-width="1.2"/>` +
      `<circle cx="26.6" cy="38.6" r=".9" fill="${INK}" stroke="none"/>` +
      hilite(28, 37.8, 2.2, 0.8, 0.6) +
      txt(32, 54.2, 'MẮM', 9.5, '#9c4a0c'),
    shine: hilite(18.4, 33.2, 2.6, 1.2, 0.55, -25)
  }) +
  cap(25.5, 16.5, 13, 7, '#f2c230', '#c9971a'))

// Tương ớt: chai bóp đỏ vai tròn, nắp xanh có vòi nhọn, nhãn quả ớt (khác chai nước tương nâu đen nắp đỏ).
const tuong_ot = svg(
  ground(32, 58, 15, 3) +
  tone3({
    outline: 'M26 18H38V21.6C42.6 22.8 45 25.8 45 30V53.4C45 56.4 43 58 40.4 58H23.6C21 58 19 56.4 19 53.4V30C19 25.8 21.4 22.8 26 21.6Z',
    base: PAL.do[0], dark: PAL.do[1],
    shade: 'M39.6 23.2C43.2 24.8 45 27 45 30V53.4C45 56.4 43 58 40.4 58H36.8C39.2 57.4 40.2 55.8 40.2 53.4V30C40.2 27.4 40 25.2 39.6 23.2Z',
    detail: `<rect x="20.8" y="31" width="22.4" height="19" rx="2" fill="${LABEL[0]}" stroke-width="${DETAIL}"/>` +
      `<path d="M39.6 31.9H42.3V49.1H39.6Z" fill="${LABEL[1]}" stroke="none"/>` +
      `<path d="M26.8 36.4C31.6 35.4 36.6 37.8 38.6 46C34.6 42.8 30.4 41.8 27.2 41.6C25 40.6 25 37.4 26.8 36.4Z" fill="${PAL.do[0]}" stroke-width="1.6"/>` +
      `<path d="M26.2 37.2C24.8 35.2 25.4 33.4 27.8 33" fill="none" stroke="${GREEN[1]}" stroke-width="2.2"/>` +
      hilite(29.8, 37.6, 2, 0.8, 0.75, 10),
    shine: hilite(22.4, 27.4, 1.3, 2.6, 0.5) + `<path d="M21.6 52.4V54.4" stroke="#fff" stroke-width="2" opacity=".4"/>`
  }) +
  `<path d="M28.6 12.4L31.2 4.4H32.8L35.4 12.4Z" fill="${GREEN[0]}"/>` +
  cap(24.5, 11.5, 15, 7.5, GREEN[0], GREEN[1]))

// Hũ thủy tinh: thân trong, nội dung (đường lượn mặt trên), lớp tối bên phải phủ cả thân lẫn nội dung, vệt sáng.
const GLASS_TINT = '#d3eaf6'
function jar(outline, fill, darkStrip, extra, shine) {
  return `<path d="${outline}" fill="${GLASS_TINT}" stroke="none"/>` + fill + extra +
    `<path d="${darkStrip}" fill="#40607a" opacity=".2" stroke="none"/>` + shine + `<path d="${outline}" fill="none"/>`
}

// Muối: hũ thủy tinh THẤP bè, nắp xanh, đầy hạt tinh thể trắng (khác bao đường, khác đường phèn cục).
// Tinh thể muối: hình thoi so le, khác cỡ (x, y, nửa rộng).
const SALT = [[17.4, 38, 2.2], [26.6, 35.2, 1.8], [36.4, 36.6, 2.4], [45.6, 39.6, 1.8], [21.4, 44.6, 1.6], [31.6, 42.6, 2.2],
  [41.6, 45.6, 2], [16.6, 51, 1.8], [26.8, 49.6, 2.4], [37, 52, 1.6], [46, 51.4, 2.2], [31, 55.2, 1.6]]
const SALT_D = SALT.map(([x, y, k]) => `M${r1(x - k)} ${y}l${k} ${r1(-k * 0.75)} ${k} ${r1(k * 0.75)} ${-k} ${r1(k * 0.75)}Z`).join('')
const muoi = svg(
  ground(32, 58, 22, 3.2) +
  jar('M14.4 27H49.6C51.2 28.4 52 30 52 32V52C52 55.6 49.6 58 46 58H18C14.4 58 12 55.6 12 52V32C12 30 12.8 28.4 14.4 27Z',
    `<path d="M12.9 36.4C16 31.6 23.4 29.4 32 29.4C40.6 29.4 48 31.6 51.1 36.4V52C51.1 55 49 57.1 46 57.1H18C15 57.1 12.9 55 12.9 52Z" fill="#fff" stroke-width="1.5"/>`,
    'M45 27H49.6C51.2 28.4 52 30 52 32V52C52 55.6 49.6 58 46 58H41.6C44 57 45.4 55 45.4 52V32C45.4 30 45.4 28.4 45 27Z',
    `<path d="${SALT_D}" fill="#eef4f8" stroke="#8fa9bc" stroke-width="1.1"/>`,
    `<path d="M16.4 30V52.6" stroke="#fff" stroke-width="2.6" opacity=".9"/>`) +
  cap(14, 17.6, 36, 9.6, PAL.xanh_nhan[0], PAL.xanh_nhan[1]) +
  glint(49.6, 39.6, 3.2))

// Hành phi: hũ thủy tinh cổ hẹp, đầy sợi hành chiên vàng nâu cong queo, nắp nâu đỏ.
const HP = ['#cf8530', '#94520f', '#f8d58a']
const CURL = [[19.6, 38.4], [27, 36.6], [34.6, 38], [41.4, 36.2], [22.4, 44], [30.4, 42.6], [38.4, 44.2], [18.6, 50], [26.6, 49.4], [34.4, 50.4], [42, 49.2], [23, 53.2], [31.6, 53.4], [39.4, 52.8]]
// Sợi hành cong theo ba hướng xen kẽ (vòng hành chiên co lại), chia hai màu nâu sẫm / vàng sáng.
const CURL_Q = ['q2.4-2.8 4.8 0', 'q2.6 2.4 0 4.6', 'q-2.4 2.6-4.6 .4']
const curls = odd => CURL.filter((p, i) => i % 2 === odd).map(([x, y], i) => `M${x} ${y}${CURL_Q[(i + odd) % 3]}`).join('')
const hanh_phi = svg(
  ground(32, 58, 18, 3) +
  jar('M21 20.6H43V22.8C46.4 24 48 26.4 48 29.4V52C48 55.6 45.6 58 42 58H22C18.4 58 16 55.6 16 52V29.4C16 26.4 17.6 24 21 22.8Z',
    `<path d="M16.9 34C22 32 27 35 32 33.2C37 31.4 42 34.2 47.1 32.4V52C47.1 55 45 57.1 42 57.1H22C19 57.1 16.9 55 16.9 52Z" fill="${HP[0]}" stroke-width="1.5"/>`,
    'M41.4 24.2C45.6 25.2 48 27 48 29.4V52C48 55.6 45.6 58 42 58H38.2C40.6 57 41.8 55 41.8 52V29.4C41.8 27.4 41.8 25.6 41.4 24.2Z',
    `<path d="${curls(1)}" fill="none" stroke="${HP[1]}" stroke-width="1.6"/><path d="${curls(0)}" fill="none" stroke="${HP[2]}" stroke-width="1.6"/>`,
    `<path d="M19.4 29V52.6" stroke="#fff" stroke-width="2.6" opacity=".85"/>`) +
  cap(18.6, 12, 26.8, 9.2, '#b5532a', '#86391a'))

// Sa tế: hũ bầu tròn, dầu đỏ có vụn ớt và sả, nắp đỏ sẫm.
const sa_te = svg(
  ground(32, 58, 20, 3) +
  jar('M23 21H41V24C48 26.4 52 31.6 52 39C52 50 44 57.6 32 57.6C20 57.6 12 50 12 39C12 31.6 16 26.4 23 24Z',
    `<path d="M12.7 33.8C18.4 32.2 24.6 35 32 33.2C39.4 31.4 45.6 34 51.3 32.6C51.8 34.6 52 36.8 52 39C52 50 44 57.6 32 57.6C20 57.6 12 50 12 39C12 37.2 12.2 35.4 12.7 33.8Z" fill="#d8402a" stroke-width="1.5"/>` +
    `<path d="M13.6 35.6C19.4 34.2 25 36.8 32 35.2C39 33.6 45 36 50.6 34.8" fill="none" stroke="#f5873a" stroke-width="2.4"/>`,
    'M44.4 26.6C49.2 29.4 52 33.6 52 39C52 50 44 57.6 32 57.6C29.6 57.6 27.4 57.4 25.4 56.8C37.8 55.6 46.4 48.4 46.6 38C46.6 33.6 45.8 29.8 44.4 26.6Z',
    dots([[19, 42], [24.6, 46.4], [31, 41.6], [37.4, 46.8], [44, 42.4], [27.6, 52.4], [36, 53], [20.6, 49.4], [42.6, 50]], '#7d1d10', 1.4) +
    dots([[22.4, 41], [34.4, 44.6], [40.6, 41.2], [29.4, 48.6], [45.4, 46.6], [32, 55]], '#f2c94c', 1),
    hilite(17, 31, 1.6, 4, 0.8, 25)) +
  cap(21, 13, 22, 9, '#8a2a1a', '#5e1a0e'))

// Mật ong rừng ★: hũ bầu đầy mật hổ phách, miệng phủ vải đỏ chấm trắng buộc dây, giọt mật chảy, nhãn tổ ong
// (khác bao đường và cục đường phèn).
const HONEY = ['#f0a21c', '#c97808', '#ffd77a']
const hex = (x, y) => `M${x} ${r1(y - 3.6)}l3.1 1.8v3.6l-3.1 1.8-3.1-1.8v-3.6Z`
const mat_ong_rung = svg(
  ground(32, 58, 21, 3.2) +
  tone3({
    outline: 'M21 22H43V24.6C48.8 27 52.4 32.4 52.4 39C52.4 50.4 43.6 58 32 58C20.4 58 11.6 50.4 11.6 39C11.6 32.4 15.2 27 21 24.6Z',
    base: HONEY[0], dark: HONEY[1],
    shade: 'M44.6 28C49.6 30.8 52.4 34.6 52.4 39C52.4 50.4 43.6 58 32 58C27.4 58 23.4 56.8 20.2 54.8C25 55.8 30.4 55.2 35 53.2C42.6 49.8 46.6 43 46.4 36.4C46.2 33 45.6 30.4 44.6 28Z',
    detail: `<path d="${hex(28.9, 40) + hex(35.1, 40) + hex(32, 45.4)}" fill="${HONEY[2]}" stroke-width="1.5"/>`,
    shine: hilite(18.6, 34.4, 2.2, 5.4, 0.6, 25) + hilite(17.8, 44.6, 1, 1, 0.7)
  }) +
  `<path d="M17.4 23.6C15.6 20.6 17 16.6 21.6 15C26.6 13.4 37.4 13.4 42.4 15C47 16.6 48.4 20.6 46.6 23.6C43 25.6 21 25.6 17.4 23.6Z" fill="${PAL.do[0]}"/>` +
  `<path d="M38.8 15.6C43.4 16.4 46 18.4 46 21.6C46.6 22.6 46.6 23.2 46.6 23.6C43 25.6 33 25.8 27 25C34.4 24.4 40.6 21.8 38.8 15.6Z" fill="${PAL.do[1]}" stroke="none"/>` +
  dots([[23, 18.4], [30, 16.6], [37, 17.6], [26.6, 21.8], [33.4, 21.2], [41.4, 20.4], [20.4, 21.6]], '#fff', 1.1) +
  `<path d="M19.4 24.6C26 26.6 38 26.6 44.6 24.6" fill="none" stroke="#7a4a22" stroke-width="2.4"/>` +
  `<path d="M22.6 26C23.4 28.8 22.4 31.6 23.2 33.6C24 35.6 26.6 35.2 26.6 33.2C26.6 30.6 25.8 28.2 26.4 26.2Z" fill="${HONEY[2]}" stroke-width="1.5"/>` +
  rareStar(51, 12, 7.5))

// =====================================================================================================================
// Bao, túi, gói, hộp, lon
// =====================================================================================================================

// Đường: bao bố MỞ MIỆNG màu be, mép cuộn, đống đường trắng lấp lánh; nhãn tròn đỏ có viên đường vuông
// (màu ấm, khác hũ muối trắng nắp xanh).
const BAO = ['#e3c38a', '#c39b5c', '#f6e4c0']
const duong = svg(
  ground(32, 58, 21, 3.2) +
  tone3({
    outline: 'M15.4 22.6C17.6 15.6 24.6 10.6 32 10.6C39.4 10.6 46.4 15.6 48.6 22.6Z', base: '#fff', dark: '#dbe4ec',
    shade: 'M39.4 12.6C44.4 15 47.6 18.8 48.6 22.6H43.6C43.4 18.6 41.8 15.2 39.4 12.6Z',
    detail: dots([[24, 17.4], [30.6, 14.6], [36.4, 18], [28, 20.6], [41.2, 20], [21, 21]], '#9fb4c4', 0.9),
    shine: hilite(24.6, 15, 3, 1.4, 0.9, -25)
  }) +
  tone3({
    outline: 'M13.6 29C11.2 38 11 48.4 13.6 54.6C14.6 57.2 17 58 20 58H44C47 58 49.4 57.2 50.4 54.6C53 48.4 52.8 38 50.4 29Z',
    base: BAO[0], dark: BAO[1],
    shade: 'M44.6 29H50.4C52.8 38 53 48.4 50.4 54.6C49.4 57.2 47 58 44 58H40.4C43.6 57 45.4 55 46 52C47.6 44 47 36 44.6 29Z',
    detail: `<path d="M15.6 38.4C24 40.2 40 40.2 48.4 38.4M15.4 53.6C24 55 40 55 48.6 53.6" fill="none" stroke="${BAO[1]}" stroke-width="1.4"/>` +
      `<circle cx="32" cy="46.4" r="8.2" fill="${PAL.do[0]}" stroke-width="${DETAIL}"/>`,
    shine: `<path d="M17 36V50" stroke="#fff" stroke-width="2.2" opacity=".45"/>`
  }) +
  tone3({
    outline: 'M10.6 25.4C10.6 22.4 20.4 20.6 32 20.6C43.6 20.6 53.4 22.4 53.4 25.4V27.6C53.4 30.8 43.6 32.8 32 32.8C20.4 32.8 10.6 30.8 10.6 27.6Z',
    base: BAO[0], dark: BAO[1],
    shade: 'M53.4 25.4V27.6C53.4 30.8 43.6 32.8 32 32.8C20.4 32.8 10.6 30.8 10.6 27.6C16 29.6 24 30.2 32 30.2C42 30.2 50 29 53.4 25.4Z',
    detail: `<path d="M10.8 25.6C16 27.8 24 28.4 32 28.4C40 28.4 48 27.8 53.2 25.6" fill="none" stroke="${BAO[1]}" stroke-width="1.5"/>`,
    shine: hilite(16, 24.6, 3, 1, 0.6)
  }) +
  cube(32, 52.6, 6.4, ['#fff', '#cfdbe6', '#fff'], 2))

// Đường phèn: ba cục kết tinh vàng nhạt có mặt cắt (mặt sáng trên-trái, mặt tối dưới-phải), không có bao.
const PHEN = ['#fbebbd', '#e7c47c', '#fffbea']
function lump(p, c) {
  return tone3({
    outline: polyD(p), base: PHEN[0], dark: PHEN[1], shade: polyD([c, p[3], p[4], p[5]]),
    detail: `<path d="${polyD([c, p[0], p[1], p[2]])}" fill="${PHEN[2]}" stroke="none"/>` +
      `<path d="${p.map(q => `M${pt(c)}L${pt(q)}`).join('')}" fill="none" stroke="#b98a3e" stroke-width="1.4"/>`
  })
}
const duong_phen = svg(
  ground(33, 57.6, 24, 3) +
  lump([[30, 24], [39, 13], [53, 17], [56, 31], [45, 37], [33, 35]], [43, 25]) +
  lump([[7.6, 42], [13, 28], [27, 27], [31, 40], [22, 50], [11, 49]], [20, 38]) +
  lump([[26, 49], [34, 39], [50, 40], [57, 51], [47, 58], [31, 58]], [41.4, 48]) +
  glint(36, 20, 3) + glint(16, 33, 2.6) + glint(33, 44.6, 2.6) + hilite(42.6, 43.6, 2, 0.9, 0.7, -10))

// Cà phê phin: túi giấy kraft gấp miệng, kẹp kẽm vàng, nhãn hạt cà phê to, vài hạt rơi trước túi.
const KRAFT = ['#a06d3e', '#7c4f28', '#d4a26c']
const ca_phe = svg(
  ground(32, 58, 21, 3) +
  tone3({
    outline: 'M15.4 19H48.6L50 54.6C50 56.6 48.6 58 46.6 58H17.4C15.4 58 14 56.6 14 54.6Z', base: KRAFT[0], dark: KRAFT[1],
    shade: 'M43.4 19H48.6L50 54.6C50 56.6 48.6 58 46.6 58H42.6C43.8 57.4 44.6 56.2 44.6 54.6Z',
    detail: `<rect x="20" y="27.4" width="23" height="21.6" rx="3" fill="${LABEL[0]}" stroke-width="${DETAIL}"/>` + bean(31.4, 38.2, -30, 1.75),
    shine: `<path d="M17.6 23V53" stroke="#fff" stroke-width="2.2" opacity=".35"/>`
  }) +
  `<rect x="15.4" y="9.6" width="33.2" height="10.4" rx="1.4" fill="${KRAFT[0]}"/>` +
  `<path d="M42.8 10.4H47.8V19.2H42.8Z" fill="${KRAFT[1]}" stroke="none"/>` +
  `<rect x="10.6" y="12.4" width="42.8" height="4" rx="1.8" fill="${GOLD[0]}" stroke-width="2"/>` + hilite(15, 13.6, 2.4, 0.7, 0.8) +
  bean(13, 54.6, -25, 1.1) + bean(20.6, 57, 20, 1.05))

// Cà phê hòa tan: ba gói que dài xòe quạt, hai đầu răng cưa, giữa có ô nhãn trắng chấm cà phê.
function stick(rot, c) {
  const top = 'M26.8 13L28.5 10.4L30.3 13L32 10.4L33.7 13L35.5 10.4L37.2 13'
  return `<g transform="rotate(${rot} 32 58)">` + tone3({
    outline: top + 'V53L35.5 55.6L33.7 53L32 55.6L30.3 53L28.5 55.6L26.8 53Z', base: c[0], dark: c[1],
    shade: 'M34 13H37.2V53H34Z',
    detail: `<path d="M26.8 16.4H37.2M26.8 49.6H37.2" fill="none" stroke-width="1.4"/>` +
      `<rect x="28.2" y="27.6" width="7.6" height="11" rx="1.6" fill="#fff8ec" stroke-width="1.4"/>` +
      `<circle cx="32" cy="33.1" r="2.2" fill="${BEAN[0]}" stroke="none"/>`,
    shine: `<path d="M28.6 19.6V25" stroke="#fff" stroke-width="1.6" opacity=".6"/>`
  }) + '</g>'
}
const ca_phe_hoa_tan = svg(
  ground(32, 58, 18, 3) +
  stick(-24, PAL.do) + stick(24, ['#8a4f2c', '#663518', '#c08158']) + stick(0, ['#f2b431', '#cc8b12', '#ffe08a']))

// Sữa đặc: lon THẤP bè, nắp thiếc đục hai lỗ, sữa sánh chảy xuống, băng nhãn xanh có giọt sữa.
const MILK = '#fff6dc'
const sua_dac = svg(
  ground(32, 57.6, 21, 3) +
  `<path d="M12 23.6V50.6C12 54.6 21 57.8 32 57.8C43 57.8 52 54.6 52 50.6V23.6Z" fill="${PAL.thep[0]}" stroke="none"/>` +
  `<path d="M12 30C12 33.4 21 36 32 36C43 36 52 33.4 52 30V46.4C52 49.8 43 52.4 32 52.4C21 52.4 12 49.8 12 46.4Z" fill="${PAL.xanh_nhan[0]}" stroke-width="${DETAIL}"/>` +
  `<path d="M32 37.4C29.2 41 28 43 28 44.8A4 4 0 0 0 36 44.8C36 43 34.8 41 32 37.4Z" fill="${MILK}" stroke-width="1.5"/>` +
  `<path d="M44.6 26.8C49.4 25.8 52 24.6 52 23.6V50.6C52 52.8 49.4 54.8 45 56.2C46.2 53.6 46.8 50.6 46.8 47.6V31C46.8 29.2 46 27.8 44.6 26.8Z" fill="#1d3a5c" opacity=".22" stroke="none"/>` +
  `<path d="M16 29.6V52" stroke="#fff" stroke-width="2.6" opacity=".55"/>` + hilite(30.6, 43.4, 0.9, 1.4, 0.9) +
  `<path d="M12 23.6V50.6C12 54.6 21 57.8 32 57.8C43 57.8 52 54.6 52 50.6V23.6" fill="none"/>` +
  `<ellipse cx="32" cy="23.6" rx="20" ry="5.6" fill="${PAL.thep[0]}"/>` +
  `<ellipse cx="32" cy="23.6" rx="16" ry="3.8" fill="none" stroke="${PAL.thep[1]}" stroke-width="1.6"/>` +
  `<ellipse cx="38.4" cy="23.4" rx="2" ry="1.1" fill="${INK}" stroke="none"/>` +
  `<path d="M21.4 23.8C24 22.4 27.4 22.6 28.6 24.6C28 27.4 27.4 30.8 27.8 34C28.2 36.8 26.6 38.6 24.8 38.4C22.8 38.2 22 36.4 22.6 33.6C23.2 30.8 23 27.2 21.4 23.8Z" fill="${MILK}" stroke-width="1.6"/>` +
  hilite(24.4, 31, 0.7, 2.4, 0.9))

// Sữa tươi: hộp giấy CAO mái nhọn có gờ dán, nhìn chéo (mặt trước trắng, mặt bên tối), băng xanh có sóng sữa.
const sua_tuoi = svg(
  ground(33, 58, 18, 3) +
  `<path d="M15 26H39V58H15Z" fill="#fdfeff" stroke="none"/>` +
  `<path d="M39 26L49 21V53L39 58Z" fill="#c1d6e8" stroke="none"/>` +
  `<path d="M15 26L27 15.4L39 26Z" fill="#eef5fb" stroke="none"/>` +
  `<path d="M27 15.4L37 10.4L49 21L39 26Z" fill="#dbe9f4" stroke="none"/>` +
  `<path d="M15 38H39V50H15Z" fill="${PAL.xanh_nhan[0]}" stroke-width="${DETAIL}"/>` +
  `<path d="M39 38L49 33V45L39 50Z" fill="${PAL.xanh_nhan[1]}" stroke-width="${DETAIL}"/>` +
  `<path d="M15 42.6C18.6 40.4 21.4 44.4 26 42.4C30 40.6 33.6 43.8 39 41.6" fill="none" stroke="#fff" stroke-width="2.2"/>` +
  `<path d="M39 26V58M15 26H39L49 21M27 15.4L39 26" fill="none" stroke-width="1.6"/>` +
  `<path d="M27 15.4L37 10.4V6.8L27 11.8Z" fill="#f4f9fd" stroke-width="2"/>` +
  hilite(19, 31, 1.4, 3, 0.5) + `<path d="M17.4 45.4V47.6" stroke="#fff" stroke-width="2" opacity=".7"/>` +
  `<path d="M15 26L27 15.4V11.8L37 6.8V10.4L49 21V53L39 58H15Z" fill="none"/>`)

// Bột mì: bao giấy thẳng đứng miệng nhăn có nếp gấp, băng đỏ, bông lúa mì vàng dựng bên cạnh.
const WHEAT = ['#ecbd4c', '#c9922a', '#fae19a']
const GRAINS = [[53.4, 7.4, 12], [49.8, 13.2, -28], [55.4, 15.2, 38], [48.8, 19.2, -28], [54.4, 21.2, 38], [47.8, 25.2, -28], [53.4, 27.2, 38]]
const BOT = ['#f4e4c0', '#d9c08f', '#fff7e2']
const bot_mi = svg(
  ground(30, 58, 20, 3) +
  tone3({
    outline: 'M14.6 13.4L18.6 10.6L22.6 13L26.6 10.2L30.6 12.8L34.6 10.2L38.6 12.6L40.6 19.4C41.8 30 42.4 44 41.6 54.6C41.4 56.6 40 58 38 58H17' +
      'C15 58 13.6 56.6 13.4 54.6C12.6 44 13.2 30 14.2 19.4Z',
    base: BOT[0], dark: BOT[1],
    shade: 'M35.6 19.6H40.6C41.8 30 42.4 44 41.6 54.6C41.4 56.6 40 58 38 58H34.4C36.2 57.2 36.8 55.8 36.8 54C37.2 42 36.8 28 35.6 19.6Z',
    detail: `<path d="M14.2 19.4C22 21 32 21 40.6 19.4M18.6 10.6L19.6 19.8M26.6 10.2L26.8 20.6M34.6 10.2L33.8 20.4" fill="none" stroke="${BOT[1]}" stroke-width="1.5"/>` +
      `<path d="M13.4 31.4H41.6V43.4H13.4Z" fill="${PAL.do[0]}" stroke-width="${DETAIL}"/>` +
      `<path d="M36.6 32.2H40.8V42.6H36.6Z" fill="${PAL.do[1]}" stroke="none"/>` +
      `<path d="M17 37.4C20 35.4 23 39.4 26.6 37.4C30 35.6 33 39.2 36 37.4" fill="none" stroke="#fff" stroke-width="2"/>`,
    shine: `<path d="M16.6 24V28.4M16.6 46.4V54" stroke="#fff" stroke-width="2.4" opacity=".75"/>`
  }) +
  tube('M36.6 57.6C42.4 44.6 46.4 31 50.6 16', 2.2, '#c9a03a') +
  `<path d="M51 9.4L50.6 3M47.6 14L44.2 8.4M57.6 13.6L60.4 7.6M46.6 20L43.2 14.6M56.6 19.6L59.6 13.8" fill="none" stroke="${WHEAT[1]}" stroke-width="1.3"/>` +
  GRAINS.map(([x, y, a]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="4" fill="${WHEAT[0]}" stroke-width="1.6" transform="rotate(${a} ${x} ${y})"/>`).join('') +
  hilite(48.8, 12.4, 0.7, 1.6, 0.8, -28) + hilite(47.8, 18.4, 0.7, 1.6, 0.8, -28))

// Bột năng: túi vải TRÒN buộc túm dây xanh, đường may; củ khoai mì vỏ nâu nằm trước, đầu cắt lộ ruột trắng.
const bot_nang = svg(
  ground(34, 58, 24, 3) +
  tone3({
    outline: 'M23 22.4C15.6 27 11 36 11.6 46C12.2 54 17 58 25 58H39C47 58 51.8 54 52.4 46C53 36 48.4 27 41 22.4Z',
    base: '#fbfbf7', dark: '#dde2e8',
    shade: 'M43.6 25.6C49.4 30.4 52.8 37.6 52.4 46C51.8 54 47 58 39 58H33.6C42.6 55.8 47 50.4 47.4 43C47.8 36.4 46.4 30.4 43.6 25.6Z',
    detail: `<path d="M16.2 47.4C24 50.6 40 50.6 47.8 47.4" fill="none" stroke="#c3cad3" stroke-width="1.5" stroke-dasharray="2.4 2.6"/>`,
    shine: hilite(19.6, 35, 2.6, 6, 0.9, 20)
  }) +
  tone3({
    outline: 'M22.6 22.6L17.6 12.8L23.8 14.4L26.8 8.4L32 13L37.2 8.4L40.2 14.4L46.4 12.8L41.4 22.6Z', base: '#fbfbf7', dark: '#dde2e8',
    shade: 'M37.2 8.4L40.2 14.4L46.4 12.8L41.4 22.6H36.6L38.6 14.6Z', detail: `<path d="M27 21.4L28.8 14.6M32 21.4V15.4M37 21.4L35.4 14.6" fill="none" stroke="#c3cad3" stroke-width="1.4"/>`
  }) +
  `<rect x="20.4" y="20.4" width="23.2" height="4.6" rx="2.3" fill="${PAL.xanh_nhan[0]}" stroke-width="2.2"/>` +
  tone3({
    outline: 'M27.6 46.4C33.6 42 46 37.6 56.4 36.8C59.4 36.6 61.2 38 60.4 39.6C57 43 46 50 35.6 54.4C31.4 56.2 27.4 55 26.4 51.6C25.8 49.6 26.4 47.6 27.6 46.4Z',
    base: BARK[0], dark: BARK[1],
    shade: 'M32 55.4C40 52.6 50 46.4 60.2 39.8C60.4 40 60.4 39.8 60.4 39.6C57 43 46 50 35.6 54.4C34.4 55 33.2 55.3 32 55.4Z',
    detail: `<path d="M37 44.6L39.8 51.4M45.4 41L47.8 47M52.4 38.6L54.2 43.4" fill="none" stroke="${BARK[1]}" stroke-width="1.6"/>`,
    shine: `<path d="M36.6 43C42 40.4 48 38.6 53.6 38" fill="none" stroke="#fff" stroke-width="1.6" opacity=".4"/>`
  }) +
  `<ellipse cx="29.4" cy="50.8" rx="3.8" ry="5" fill="#fbf3e2" stroke-width="1.8" transform="rotate(-25 29.4 50.8)"/>` +
  `<ellipse cx="29.4" cy="50.8" rx="2.2" ry="3.2" fill="none" stroke="#e2cfa6" stroke-width="1.2" transform="rotate(-25 29.4 50.8)"/>`)

// Nước cốt dừa: NỬA TRÁI DỪA vỏ nâu, cơm dừa trắng dày, lòng đầy nước cốt sánh.
const cot_dua = svg(
  ground(32, 58, 25, 3.2) +
  tone3({
    outline: 'M5 33A27 9 0 0 1 59 33C59 46.6 47 57.6 32 57.6C17 57.6 5 46.6 5 33Z', base: BARK[0], dark: BARK[1],
    shade: 'M44.4 39.4C51.4 38.4 57.2 36 59 33C59 46.6 47 57.6 32 57.6C40.6 54 45 47.4 44.4 39.4Z',
    detail: `<path d="M10.6 41.4l3.2 1.6M16 48l2.6 2.2M24 52.6l1.6 2.6M36.6 52.8l-1-2.8M47 47.4l-2.2-2.2M12.6 46l2.4.6" fill="none" stroke="${BARK[2]}" stroke-width="1.6"/>` +
      `<ellipse cx="32" cy="33" rx="27" ry="9" fill="#fffdf4" stroke="none"/>` +
      `<ellipse cx="32" cy="33.6" rx="21.4" ry="6.2" fill="#f2ecd8" stroke-width="${DETAIL}"/>` +
      `<path d="M10.6 33.6C10.6 29.6 20 27.4 32 27.4C44 27.4 53.4 29.6 53.4 33.6C51 30.6 42.6 29 32 29C21.4 29 13 30.6 10.6 33.6Z" fill="#e4dcc4" stroke="none"/>`,
    shine: hilite(24, 34.4, 5, 1.6, 0.9, -6) + hilite(13, 40, 1.4, 3, 0.35, -30),
    line: 'M5 33A27 9 0 0 1 59 33C59 46.6 47 57.6 32 57.6C17 57.6 5 46.6 5 33A27 9 0 0 0 59 33'
  }))

// Dừa nạo: đống sợi dừa trắng cong trên miếng lá chuối xanh (không có vỏ dừa, khác nửa trái dừa của nước cốt).
const SHRED = [[16, 40, 1], [22, 34, -1], [29, 29, 1], [36, 31, -1], [42, 36, 1], [26, 39, -1], [34, 37, 1], [44, 42, -1], [20, 44, 1], [31, 44, -1], [39, 45, 1], [28, 25, -1]]
const dua_nao = svg(
  ground(32, 57, 27, 3) +
  tone3({
    outline: 'M3 47C10 39.4 22 37.6 34 38C46 38.4 56 41.6 61 46.6C55 52.4 43 55.4 31 55.2C19 55 9 52.6 3 47Z', base: PAL.la[0], dark: PAL.la[1],
    shade: 'M61 46.6C55 52.4 43 55.4 31 55.2C22 55 14.4 53.6 8.6 51C18 52.6 34 52.6 45.4 50.4C52 49.2 57.4 47.8 61 46.6Z',
    detail: `<path d="M5 47C20 46 44 46 59 46.6M18 41.6l4 4.6M30 40.4l3 5.8M42 41.6l2 4.8M24 52.6l3-6M38 53.6l2-7" fill="none" stroke="${PAL.la[1]}" stroke-width="1.4"/>`
  }) +
  tone3({
    outline: 'M10 45C11 33.4 20 22.4 32 22.4C44 22.4 53 33.4 54 45C46 49 18 49 10 45Z', base: '#fffdf6', dark: '#e3dbc6',
    shade: 'M43 25.6C49.4 30 53.4 37.4 54 45C50.4 46.8 44 47.8 37 48.2C44 45 47.4 37 43 25.6Z',
    detail: `<path d="${SHRED.map(([x, y, s]) => `M${x} ${y}q2 ${-3 * s} 4 0t4 0`).join('')}" fill="none" stroke="#cfc4a6" stroke-width="1.5"/>`,
    shine: hilite(22, 30, 3.4, 1.8, 0.9, -35)
  }) +
  tube('M7.6 49.4q2.4-3 4.8-.6t4.6-.6M47 51.6q2.4-2.6 4.8-.4t4.4-1', 1.8, '#fffdf6', 2.4))

// Đậu xanh: bát sứ đầy hạt đậu xanh nguyên vỏ, vài hạt cà vỏ vàng rơi trước bát.
const DX = ['#6fa83a', '#4c8226', '#b2d97c']
const BEANS_G = [[17.4, 32], [22.6, 28.4], [28.4, 25.4], [34.2, 24.8], [40, 26.6], [45.4, 30], [14.4, 35.6], [20, 33.6], [25.8, 31],
  [31.6, 29.6], [37.4, 30.2], [43, 33], [48.6, 34.8], [23.4, 36], [29.2, 34.6], [35, 34.8], [40.8, 36.2]]
  .map(([x, y]) => `M${x} ${y}l1 .5`).join('')
const dau_xanh = svg(
  ground(32, 58, 23, 3) +
  tone3({
    outline: 'M9.6 35.4C12 25.6 21.6 18.4 32 18.4C42.4 18.4 52 25.6 54.4 35.4Z', base: DX[0], dark: DX[1],
    shade: 'M42.6 21.6C48.6 25 53 30 54.4 35.4H47.6C47.6 30 45.6 25.4 42.6 21.6Z',
    detail: `<path d="${BEANS_G}" fill="none" stroke="${DX[1]}" stroke-width="3.4"/>` +
      `<path d="M19.6 27.6l.6.3M25.4 24.6l.6.3M31.2 22.4l.6.3M37 23.4l.6.3M17 31.8l.6.3M28.4 29l.6.3M34.2 28.4l.6.3M42.6 28l.6.3" fill="none" stroke="${DX[2]}" stroke-width="2.4"/>`,
    shine: hilite(22, 25, 3, 1.4, 0.7, -30)
  }) +
  tone3({
    outline: 'M7 35.6C7 38.6 18.2 41 32 41C45.8 41 57 38.6 57 35.6C57 48.4 46 57.6 32 57.6C18 57.6 7 48.4 7 35.6Z', base: '#eef4f8', dark: '#c3d4e0',
    shade: 'M46 39.6C51.6 38.6 55.6 37.2 57 35.6C57 48.4 46 57.6 32 57.6C40.8 54.4 46.6 47.6 46 39.6Z',
    detail: `<path d="M10.4 44.4C20 47.6 44 47.6 53.6 44.4" fill="none" stroke="${PAL.xanh_nhan[0]}" stroke-width="2.2"/>` +
      `<path d="M14.4 48.6C22 50.6 42 50.6 49.6 48.6" fill="none" stroke="${PAL.xanh_nhan[2]}" stroke-width="1.4"/>`,
    shine: hilite(14, 43, 1.6, 3.4, 0.9, -20)
  }) +
  `<ellipse cx="53.6" cy="55" rx="3" ry="2.2" fill="#f2c94c" stroke-width="1.6"/><ellipse cx="59" cy="53.2" rx="2.6" ry="2" fill="#f2c94c" stroke-width="1.6"/>`)

// Muối tôm Tây Ninh ★: túi zip trong, nửa dưới muối tôm màu cam đỏ lấm tấm, nửa trên hình con tôm (khác hũ muối, hũ sa tế).
const MT = ['#ef7a36', '#c4561e', '#ffb27a']
const muoi_tom_tay_ninh = svg(
  ground(32, 58, 22, 3) +
  tone3({
    outline: 'M12 15H52L53.4 54.6C53.4 56.6 52 58 50 58H14C12 58 10.6 56.6 10.6 54.6Z', base: '#fbf6ee', dark: '#e6dccd',
    shade: 'M46.6 15H52L53.4 54.6C53.4 56.6 52 58 50 58H46.6C47.6 57.2 48 56 48 54.6Z',
    detail: `<path d="M11.3 36.4C18 34.6 24.6 37 32 35.2C39.4 33.4 46 35.8 52.7 34.4L53.4 54.6C53.4 56.6 52 58 50 58H14C12 58 10.6 56.6 10.6 54.6Z" fill="${MT[0]}" stroke-width="1.6"/>` +
      `<path d="M46.4 35.4C49 35.2 51 34.8 52.7 34.4L53.4 54.6C53.4 56.6 52 58 50 58H46.4C47.4 57.2 47.8 56 47.8 54.6Z" fill="${MT[1]}" stroke="none"/>` +
      dots([[16.6, 41], [23, 45.4], [30.4, 40.6], [37.6, 46], [43.6, 41.4], [19.4, 51.6], [27.4, 53.4], [35, 51.4], [42, 54.2]], '#9e3a12', 1.2) +
      dots([[20, 40], [27, 49], [34.6, 44.4], [40.4, 50], [24, 55]], MT[2], 1) +
      tube('M23.4 29.6C21.6 22.6 28.6 18.6 35.4 20.8C40 22.4 41.2 26.6 38.2 29', 4.6, MT[0], 2.4) +
      `<path d="M27.4 21.4l1.4 3.6M31.6 20.2l.4 3.8M35.6 21l-.8 3.6" fill="none" stroke="${MT[1]}" stroke-width="1.3"/>` +
      `<path d="M38.4 28.6L43.4 31.4L42.6 26.4Z" fill="${MT[0]}" stroke-width="1.6"/>` +
      `<path d="M22.6 28.4C19 26.6 16.6 23.4 16.6 19.6M23.8 27C21.6 24 21.4 21 22.6 18.4" fill="none" stroke-width="1.2"/>`,
    shine: `<path d="M15 20V31" stroke="#fff" stroke-width="2.4" opacity=".9"/>` + hilite(18, 42, 1.2, 3, 0.4)
  }) +
  `<rect x="11" y="11.4" width="42" height="5.2" rx="1.6" fill="${PAL.do[0]}"/>` +
  rareStar(50, 12, 7.5))

// Cà phê Buôn Ma Thuột ★: bao bố CAO buộc túm dây thừng, in hình hạt cà phê, đống hạt rang đổ trước chân bao
// (khác túi giấy gấp miệng của cà phê phin, khác gói que của cà phê hòa tan).
const ROPE = '#8a5a2c'
const DAY = ['#c49558', '#9a6e3a', '#e2bf88']
const ca_phe_bmt = svg(
  ground(33, 58, 25, 3) +
  tone3({
    outline: 'M20 24.6C12 29.6 9.4 39.6 10.6 48.6C11.4 54.8 15.4 58 22 58H42C48.6 58 52.6 54.8 53.4 48.6C54.6 39.6 52 29.6 44 24.6Z',
    base: DAY[0], dark: DAY[1],
    shade: 'M46.4 27.6C51.6 32.4 54.4 40 53.4 48.6C52.6 54.8 48.6 58 42 58H38.6C45.4 55.8 48.2 51 48.4 44C48.6 37.4 47.8 32 46.4 27.6Z',
    detail: `<path d="M13.4 36.4H50.6M11.4 44H52.6M12 51.6H52M19.4 27.4V57M27 26V58M35 26V58M43 26.6V57.6" fill="none" stroke="${DAY[1]}" stroke-width="1.2" opacity=".75"/>` +
      `<g transform="rotate(-30 31 42)"><ellipse cx="31" cy="42" rx="7.4" ry="5.4" fill="${BEAN[1]}" stroke="none" opacity=".85"/>` +
      `<path d="M25.6 42.6C28 39.8 34 44.6 36.4 41.4" fill="none" stroke="${DAY[2]}" stroke-width="1.6"/></g>`,
    shine: hilite(16.4, 36, 2, 5, 0.5, 20)
  }) +
  tone3({
    outline: 'M20.4 25.4L15 14.6L22 16.6L25 9.4L32 14.4L39 9.4L42 16.6L49 14.6L43.6 25.4Z', base: DAY[0], dark: DAY[1],
    shade: 'M39 9.4L42 16.6L49 14.6L43.6 25.4H38.4L40.4 16.4Z',
    detail: `<path d="M26.4 24.4L27.6 16.6M32 24.4V17.4M37.6 24.4L36.4 16.6" fill="none" stroke="${DAY[1]}" stroke-width="1.3"/>`
  }) +
  `<rect x="18.4" y="22.6" width="27.2" height="4.4" rx="2.2" fill="${ROPE}" stroke-width="2"/>` +
  tube('M43.6 26.4C47 29.4 47.4 33.4 45.4 36.4', 2, ROPE, 2.2) +
  bean(44.6, 55.4, -15) + bean(52.2, 56, 20) + bean(48.8, 50.4, 55) + bean(57.2, 51.6, -35) + bean(38.4, 57, 10, 0.9) +
  rareStar(54, 11, 7.5))

// =====================================================================================================================
// Bánh, đồ khô, hạt
// =====================================================================================================================

// Bánh mì: ổ bánh mì dài hai đầu thuôn nằm chéo, có các vết khía (cùng khuôn ổ bánh của món bánh mì ốp la).
const LOAF = 'M4 34C6 25.5 15 21 27 21H37C49 21 58 25.5 60 34C58 42.5 49 47 37 47H27C15 47 6 42.5 4 34Z'
const LOAF_SHADE = 'M8.6 42C13 45.4 19.4 47 27 47H37C49 47 58 42.5 60 34L57 34.6C54.6 40.2 47.6 43.4 37 43.4H27C19.4 43.4 13.2 43 8.6 42Z'
const SCORES = 'M13.4 33.2L19.6 26.4M24.4 32.4L31 25M35.4 32.4L42 25M46.4 33L52 26.8'
function loaf(c, extra = '') {
  return `<g transform="translate(0 4) rotate(-18 32 34)">` + tone3({
    outline: LOAF, base: c[0], dark: c[1], shade: LOAF_SHADE,
    detail: `<path d="${SCORES}" fill="none" stroke-width="4.2"/><path d="${SCORES}" fill="none" stroke="${c[2]}" stroke-width="2"/>` + extra,
    shine: `<path d="M9.4 30.6C12.4 26.8 17.6 24.6 23.6 24" fill="none" stroke="#fff" stroke-width="2.2" opacity=".6"/>`
  }) + '</g>'
}
const banh_mi = svg(ground(32, 56.4, 25, 3.2) + loaf(PAL.banh))

// Bánh tráng: xấp nhiều lá tròn mỏng chồng lên nhau (mép từng lá), lá trên cùng in vân nan tre.
const banh_trang = svg(
  ground(32, 57.4, 25, 3) +
  [46, 43.2, 40.4].map((y, i) => `<ellipse cx="32" cy="${y}" rx="25" ry="10.4" fill="${i % 2 ? BT[0] : BT[1]}" stroke-width="1.6"/>`).join('') +
  `<ellipse cx="32" cy="37.6" rx="25" ry="10.4" fill="${BT[0]}" stroke-width="1.6"/>` +
  `<path d="${ellipseShade(32, 37.6, 25, 10.4, 0.22)}" fill="${BT[1]}" opacity=".55" stroke="none"/>` +
  `<path d="${hatch(32, 37.6, 22, 8.6, 1, 0.42, 3.6) + hatch(32, 37.6, 22, 8.6, 1, -0.42, 3.6)}" fill="none" stroke="#d6bf86" stroke-width="1"/>` +
  hilite(19.6, 33.6, 6, 1.8, 0.8, -8) +
  `<path d="M7 37.6A25 10.4 0 0 1 57 37.6V46A25 10.4 0 0 1 7 46Z" fill="none"/>`)

// Bánh tráng mè: MỘT lá dày nướng vàng nằm nghiêng, phồng rộp, rắc mè đen dày (khác xấp bánh tráng mỏng).
const BTM = ['#e9c07a', '#c8954c', '#f8e2b2']
const SEEDS = [[15, 32, 1], [20, 27, -1], [26, 24, 1], [33, 22.4, -1], [40, 23.6, 1], [47, 26.6, -1], [52, 31, 1], [18, 37.6, -1], [24, 33, 1],
  [31, 30, -1], [38, 30.4, 1], [45, 33.4, -1], [24, 41.6, 1], [31, 38.4, -1], [37, 43, 1], [44, 40.4, -1], [50, 37.6, 1], [29, 45, -1]]
const banh_trang_me = svg(
  ground(32, 56, 26, 3.2) +
  `<path d="M5 33A27 14.4 0 0 1 59 33V37.4A27 14.4 0 0 1 5 37.4Z" fill="${BTM[1]}" stroke="none"/>` +
  `<ellipse cx="32" cy="33" rx="27" ry="14.4" fill="${BTM[0]}" stroke-width="1.8"/>` +
  `<path d="${ellipseShade(32, 33, 27, 14.4, 0.22)}" fill="${BTM[1]}" opacity=".55" stroke="none"/>` +
  `<path d="M18 29.6a3.2 1.8 0 1 0 6.4 0a3.2 1.8 0 1 0-6.4 0M35.4 37.6a3.6 2 0 1 0 7.2 0a3.6 2 0 1 0-7.2 0M39.4 25.6a2.6 1.4 0 1 0 5.2 0a2.6 1.4 0 1 0-5.2 0" ` +
  `fill="${BTM[2]}" stroke="${BTM[1]}" stroke-width="1.3"/>` +
  `<path d="${SEEDS.map(([x, y, s]) => `M${x} ${y}l1.8 ${s * 0.7}`).join('')}" fill="none" stroke="#2a1a10" stroke-width="2.2"/>` +
  hilite(15.6, 27.4, 4, 1.4, 0.7, -25) +
  `<path d="M5 33A27 14.4 0 0 1 59 33V37.4A27 14.4 0 0 1 5 37.4Z" fill="none"/>`)

// Khô bò: ba dải thịt khô đỏ nâu chồng chéo, thớ thịt, vụn ớt và mè (khác con khô mực nguyên con).
const BO = ['#b44a2c', '#86321c', '#e2845a']
function strip(p, fib) {
  return tone3({
    outline: polyD(p), base: BO[0], dark: BO[1], shade: crescent(p, 0.6, 2.6),
    detail: `<path d="${fib}" fill="none" stroke="${BO[2]}" stroke-width="1.4" opacity=".75"/>`
  })
}
const kho_bo = svg(
  ground(32, 57.6, 25, 3) +
  strip([[7.6, 25], [34, 13.4], [38.6, 16.6], [39.6, 21], [13.4, 32.6], [8.6, 30]], 'M13 26.6L35 17M16.6 29.6L36.4 21') +
  strip([[11.6, 41], [46, 27], [51, 30], [51.6, 34.4], [18, 49], [12.6, 46.4]], 'M17 41.6L46.6 29.6M19.4 45.2L48 33.2') +
  strip([[21.4, 51.6], [50, 41.4], [55, 44.4], [55.6, 48.4], [28.6, 57.6], [22.6, 56.4]], 'M26 52.6L50.6 44M28.6 55.4L52.6 47') +
  dots([[20, 25.6], [28, 22.4], [24, 39.6], [34, 36.4], [42, 33], [32, 50.4], [44, 46.6], [15.6, 44]], '#f0532a', 1.2) +
  dots([[25, 26.4], [30, 41.6], [39, 37.6], [38, 50], [47.4, 45]], '#fff1cf', 1) +
  hilite(14.6, 27, 2.4, 0.8, 0.6, -24) + hilite(19, 42, 2.8, 0.9, 0.6, -22) + hilite(28, 52.4, 2.8, 0.9, 0.6, -20))

// Đậu phộng: hai vỏ lạc thắt eo giữa có vân lưới, ba hạt nhân vỏ lụa đỏ.
// Vỏ vẽ trong hệ trục riêng (tâm 0 0, nằm ngang) rồi dời và xoay: viền, mảng tối nửa dưới, vân lưới, điểm sáng.
const VO = ['#e2bb7c', '#bf9152', '#f7e0b0']
const NHAN = ['#c8623f', '#9a4429', '#f0a080']
const POD = 'M-15.6 0C-15.6-7.9-9.1-10.1-4.8-7.4C-1.9-5.8 1.9-5.8 4.8-7.4C9.1-10.1 15.6-7.9 15.6 0C15.6 7.9 9.1 10.1 4.8 7.4' +
  'C1.9 5.8-1.9 5.8-4.8 7.4C-9.1 10.1-15.6 7.9-15.6 0Z'
const POD_SH = 'M15.6 0C15.6 7.9 9.1 10.1 4.8 7.4C1.9 5.8-1.9 5.8-4.8 7.4C-9.1 10.1-15.6 7.9-15.6 0C-13.2 4.6-9.1 6-4.8 4.3' +
  'C-1.9 3.1 1.9 3.1 4.8 4.3C9.1 6 13.7 4.3 15.6 0Z'
const POD_NET = 'M-12.5-2.9C-7.2-4.8-2.4-2.9 0-3.6C2.4-2.9 7.2-4.8 12.5-2.9M-12.5 2.2C-7.2 3.6-2.4 1.9 0 2.6C2.4 1.9 7.2 3.6 12.5 2.2' +
  'M-10.3-6.5V6.5M-6-6V6M6-6V6M10.3-6.5V6.5'
function pod(x, y, a) {
  return `<g transform="translate(${x} ${y}) rotate(${a})">` + tone3({
    outline: POD, base: VO[0], dark: VO[1], shade: POD_SH,
    detail: `<path d="${POD_NET}" fill="none" stroke="${VO[1]}" stroke-width="1.2"/>`, shine: hilite(-8.6, -4.4, 3, 1.3, 0.75, -10)
  }) + '</g>'
}
function kernel(x, y, a) {
  return `<g transform="rotate(${a} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="5" ry="3.6" fill="${NHAN[0]}" stroke="none"/>` +
    `<path d="${ellipseShade(x, y, 5, 3.6, 0.3)}" fill="${NHAN[1]}" stroke="none"/>` + hilite(x - 1.8, y - 1.3, 1.6, 0.8, 0.8) +
    `<ellipse cx="${x}" cy="${y}" rx="5" ry="3.6" fill="none" stroke-width="2.2"/></g>`
}
const dau_phong = svg(
  ground(32, 57.6, 26, 3) +
  pod(25, 22, -28) + pod(22, 45, 8) + kernel(45.4, 49, -20) + kernel(53, 39.4, 30) + kernel(54.4, 52.6, 10))

// Khô mực Phan Thiết ★: con mực khô nguyên con dẹt nhìn từ trên (đuôi vây nhọn, thân, râu xòe) màu vàng ngà.
const KM = ['#f1d398', '#d5aa5e', '#fcefcc']
const TENT = 'M27 41C24 47 19 51 14 56.4M29.4 42C28 48 25.6 53 23.6 58M32 42.6V58.4M34.6 42C36 48 38.4 53 40.4 58M37 41C40 47 45 51 50 56.4'
const kho_muc = svg(
  ground(32, 58, 22, 3) +
  tube('M25.6 40.6C20 44 12.4 44 6.4 49M38.4 40.6C44 44 51.6 44 57.6 49', 2.6, KM[1]) +
  tube(TENT, 3, KM[0]) +
  tone3({
    outline: 'M32 3L44.4 16.4L40.6 18.4C41.8 24 41.8 31 40.2 37H23.8C22.2 31 22.2 24 23.4 18.4L19.6 16.4Z', base: KM[0], dark: KM[1],
    shade: 'M40.6 18.4C41.8 24 41.8 31 40.2 37H35.4C37.4 31 37.6 24.6 36.6 19.6L44.4 16.4Z',
    detail: `<path d="M32 8V35M26.6 22.4C28 26 28 30 27 34M37.4 22.4C36 26 36 30 37 34" fill="none" stroke="${KM[1]}" stroke-width="1.5"/>` +
      dots([[28.6, 14.4], [35.4, 15.6], [29.4, 24], [34.6, 27.6], [30, 31.4]], '#c8834a', 1, 0.7),
    shine: hilite(27.6, 21, 1.4, 4, 0.7, 10)
  }) +
  `<ellipse cx="32" cy="39.6" rx="8.6" ry="4" fill="${KM[0]}" stroke-width="2.4"/>` +
  `<circle cx="28.4" cy="39.4" r="1.2" fill="${INK}" stroke="none"/><circle cx="35.6" cy="39.4" r="1.2" fill="${INK}" stroke="none"/>` +
  rareStar(52, 12, 7.5))

// =====================================================================================================================
// Đồ uống, đá, ly
// =====================================================================================================================

// Trà: hũ thiếc xanh nắp vàng, nhãn tròn có búp trà hai lá.
const TIN = ['#3f9a5a', '#2b7344', '#8fd6a2']
const tra = svg(
  ground(32, 58, 19, 3.2) +
  tone3({
    outline: 'M15 21H49V53.4C49 56.2 46.8 58 44 58H20C17.2 58 15 56.2 15 53.4Z', base: TIN[0], dark: TIN[1],
    shade: 'M42.4 21H49V53.4C49 56.2 46.8 58 44 58H40.4C41.8 57.2 42.4 55.6 42.4 53.4Z',
    detail: `<path d="M15 49.4H49V52.6H15Z" fill="${GOLD[0]}" stroke-width="1.5"/>` +
      `<circle cx="30.6" cy="35.6" r="10.6" fill="${LABEL[0]}" stroke-width="${DETAIL}"/>` +
      `<path d="M30 43.4C25 42.6 22.6 38 24.6 32.8C29.2 34 31.2 38.4 30 43.4ZM31.2 43.4C36.2 42.6 38.6 38 36.6 32.8C32 34 30 38.4 31.2 43.4Z" fill="${PAL.la[0]}" stroke-width="1.5"/>` +
      `<path d="M30.6 41.6C29.2 37.2 29.4 32.2 30.6 28C31.8 32.2 32 37.2 30.6 41.6Z" fill="${PAL.la[2]}" stroke-width="1.4"/>` +
      `<path d="M29.4 41.6C27.8 38.6 26.4 36.4 25.2 34.4M31.8 41.6C33.4 38.6 34.8 36.4 36 34.4" fill="none" stroke="${PAL.la[1]}" stroke-width="1.2"/>`,
    shine: `<path d="M18.6 25V46" stroke="#fff" stroke-width="2.4" opacity=".45"/>`
  }) +
  cap(13, 13, 38, 9, GOLD[0], GOLD[1]))

// Đá: khay xanh, ba viên đá vuông trong veo chồng hình tháp, có đốm lấp lánh.
const TRAY = ['#3f8fd6', '#2c6aa8', '#6fb1ea']
const da = svg(
  ground(32, 57, 27, 3) +
  tone3({
    outline: 'M13 39H51L59 46V50.4C59 52.2 57.6 53.6 55.8 53.6H8.2C6.4 53.6 5 52.2 5 50.4V46Z', base: TRAY[0], dark: TRAY[1],
    shade: 'M5 46H59V50.4C59 52.2 57.6 53.6 55.8 53.6H8.2C6.4 53.6 5 52.2 5 50.4Z',
    detail: `<path d="M9.6 45.2L15 40.6H49L54.4 45.2Z" fill="${TRAY[2]}" stroke-width="1.6"/>`,
    shine: `<path d="M8.6 48.4H18" stroke="#fff" stroke-width="1.8" opacity=".6"/>`
  }) +
  cube(22, 45.6, 11, ICE) + cube(42, 45.6, 11, ICE) + cube(32, 34.6, 11, ICE) + glint(52.6, 22, 3.4) + glint(10.6, 29, 2.6))

// Ly nhựa: hai ly trong lồng vào nhau (thấy hai vành), thân thuôn, gờ dưới đáy, vệt sáng dọc.
const CUP = 'M14.6 15H49.4L45.4 55.4C45.2 57 44 58 42.4 58H21.6C20 58 18.8 57 18.6 55.4Z'
const ly = svg(
  ground(32, 58, 17, 3) +
  tone3({
    outline: CUP, base: '#e7f4fa', dark: PAL.nhua[1],
    shade: 'M42.6 15H49.4L45.4 55.4C45.2 57 44 58 42.4 58H39.2C40.6 57.2 41.2 56 41.4 54.6Z',
    detail: `<path d="M17.9 47.6H46.1M18.3 51.4H45.7" fill="none" stroke="#a9c7d8" stroke-width="1.5"/>`,
    shine: `<path d="M20.2 19.4L22.8 51" stroke="#fff" stroke-width="3" opacity=".95"/>` + hilite(41.4, 22, 0.8, 2.6, 0.9)
  }) +
  `<path d="M13 10.8H51L50.6 14H13.4Z" fill="#e7f4fa" stroke-width="2"/>` +
  `<rect x="11.4" y="6.6" width="41.2" height="4.4" rx="2.2" fill="${PAL.nhua[1]}" stroke-width="2.2"/>` +
  `<rect x="11.4" y="13.2" width="41.2" height="4.4" rx="2.2" fill="${PAL.nhua[1]}" stroke-width="2.2"/>` +
  hilite(16, 8.4, 2.6, 0.7, 0.9) + hilite(16, 15, 2.6, 0.7, 0.9))

// =====================================================================================================================
// Hình trạng thái
// =====================================================================================================================

// Bánh tráng cắt sợi (cat_soi): đống sợi bánh tráng mảnh dài cong nhẹ trên đĩa.
const SOI_BACK = 'M10.6 40.4C18 36 26 37.6 34 33.4M17 44.6C25 41 33 42.6 42 37.6M27 32.8C34 31.6 42 33 50 30.6M24 46.6C32 44 41 45.4 52 41M33 41C39 39 45 40 51 37.4'
const SOI_FRONT = 'M13.6 37.6C21 35 28 36 37 32M20 42.4C28 39.6 36 41.6 46 36.4M30 37.8C37 36.4 45 38.6 53.4 35.6M14.6 47.4C22 45 30 47 38 44.2M22 35.4C27 33.6 31 34 36 31.6M37 47.6C42 45.4 46 46 50.6 43.6'
const banh_trang_soi = svg(
  ground(32, 57.5, 27, 3.4) + PLATE +
  tube(SOI_BACK, 2, BT[1], 2) + tube(SOI_FRONT, 2, BT[0], 2) +
  `<path d="M16 37.2C20 35.6 24 35.4 28 34.6M24 41.4C29 40 33 40.4 38 38.6" fill="none" stroke="#fff" stroke-width="1" opacity=".9"/>`)

// Bánh tráng cắt miếng vuông (cat_vuong): các miếng vuông có vân nan xếp lệch trên đĩa.
function sq(x, y, a) {
  return `<g transform="rotate(${a} ${r1(x + 6.5)} ${r1(y + 5)})"><rect x="${x}" y="${y}" width="13" height="10" rx="1.2" fill="${BT[0]}" stroke-width="2"/>` +
    `<path d="M${r1(x + 2.6)} ${r1(y + 2.4)}L${r1(x + 9)} ${r1(y + 8)}M${r1(x + 10.4)} ${r1(y + 2.4)}L${r1(x + 4)} ${r1(y + 8)}" fill="none" stroke="#d6bf86" stroke-width="1"/>` +
    `<path d="M${r1(x + 1.8)} ${r1(y + 1.8)}H${r1(x + 6)}" stroke="#fff" stroke-width="1.4" opacity=".9"/></g>`
}
const banh_trang_vuong = svg(
  ground(32, 57.5, 27, 3.4) + PLATE +
  sq(13, 33, -12) + sq(26, 29, 8) + sq(39, 32.6, -6) + sq(19, 41, 14) + sq(33, 40.6, -10))

// Khô mực xé (xe_kho_muc): đống sợi mực xé vàng ngà trên đĩa, giữ sao hàng hiếm.
const XE_BACK = 'M12.6 40C18 36 24 38 30 33.4M20 45.6C26 42.4 32 44 39 39.6M32 34C38 31.4 44 34 50 31M38 46.4C43 43.6 47 44.4 52 41.6'
const XE_FRONT = 'M16.4 36.4C21 34 25 35.6 29.6 32.4M23 41.6C29 38.6 35 40.6 42 35.6M33 39C38.6 36.6 44 38.6 49.6 35.4M17 46C22 44 26 45.6 31 43.4M30.6 47.4C35 45 39 46 43 43.6'
const kho_muc_xe = svg(
  ground(32, 57.5, 27, 3.4) + PLATE +
  tube(XE_BACK, 2.6, KM[1], 2.2) + tube(XE_FRONT, 2.6, KM[0], 2.2) +
  `<path d="M18 35.4C21 34 24 34.4 27 33M26 39.6C30 38 34 38.6 38 36.4" fill="none" stroke="#fff" stroke-width="1" opacity=".85"/>` +
  rareStar(52, 14, 7.5))

// Bánh mì nướng giòn (nuong_banh_mi): ổ bánh vàng sậm, lấm tấm chấm cháy xém, hơi nóng bốc lên.
const banh_mi_nuong = svg(
  ground(32, 56.4, 25, 3.2) +
  loaf(['#d98a32', '#a65a1c', '#f2bd68'], dots([[8.6, 36], [11.4, 39.4], [56, 31.4], [53.4, 37], [30, 42.4], [40, 43]], '#7a3c12', 1.2, 0.8)) +
  tube('M20.6 21c-3-3.4 3-5.6 0-9.6M31.4 17c-3-3.4 3-5.6 0-9.6M42.2 13.6c-3-3.4 3-5.6 0-9.6', 2.2, '#fff', 2.2))

// Đá trong ly (them_da): ly thủy tinh có nước mát, ba viên đá chồng nổi trong ly.
const GLASS = 'M14 13H50L46.6 54.2C46.4 56.4 44.8 58 42.6 58H21.4C19.2 58 17.6 56.4 17.4 54.2Z'
const da_vien = svg(
  ground(32, 58, 18, 3) +
  `<path d="${GLASS}" fill="#eef9fe" stroke="none"/>` +
  `<path d="M16.3 38.6C24 40 40 40 47.7 38.6L46.6 54.2C46.4 56.4 44.8 58 42.6 58H21.4C19.2 58 17.6 56.4 17.4 54.2Z" fill="#94cdea" stroke="none"/>` +
  cube(25, 54.4, 8, ICE, 2) + cube(39, 54.4, 8, ICE, 2) + cube(32, 46.4, 8, ICE, 2) +
  `<path d="M16.3 38.6C24 40 40 40 47.7 38.6" fill="none" stroke="#8cc8e4" stroke-width="1.6"/>` +
  `<path d="M43.4 13H50L46.6 54.2C46.4 56.4 44.8 58 42.6 58H40C41.6 57.2 42.4 56 42.6 54.2Z" fill="#7fb8d6" opacity=".35" stroke="none"/>` +
  `<path d="M18.6 17.6L21 52" stroke="#fff" stroke-width="3" opacity=".8"/>` +
  `<path d="${GLASS}" fill="none"/><path d="M14.2 13C17 15.2 47 15.2 49.8 13" fill="none" stroke-width="1.6"/>`)

// Một viên đá (vật kéo thả ở bước Thả đá vào ly): to, đủ ba mặt, đốm lấp lánh.
const da_mot_vien = svg(ground(32, 57, 18, 3) + cube(32, 55, 22, ICE, 3) + glint(49, 15, 3.4))

export const ING_KHO = Object.freeze({
  nuoc_tuong, nuoc_mam, tuong_ot, muoi, hanh_phi, sa_te, mat_ong_rung,
  duong, duong_phen, ca_phe, ca_phe_hoa_tan, sua_dac, sua_tuoi, bot_mi, bot_nang, cot_dua, dua_nao, dau_xanh,
  muoi_tom_tay_ninh, ca_phe_bmt,
  banh_mi, banh_trang, banh_trang_me, kho_bo, dau_phong, kho_muc,
  tra, da, ly
})

// Khóa 'id.trạng_thái': trạng thái lấy theo bước thật trong recipes.js (cat_banh_trang: cat_soi → soi, cat_vuong → vuong;
// xe_kho_muc → xe; nuong_banh_mi → nuong; them_da → vien). da.mot_vien: một viên đá cho vật kéo thả của bước Bày.
export const ING_KHO_STATES = Object.freeze({
  'banh_trang.soi': banh_trang_soi,
  'banh_trang.vuong': banh_trang_vuong,
  'kho_muc.xe': kho_muc_xe,
  'banh_mi.nuong': banh_mi_nuong,
  'da.vien': da_vien,
  'da.mot_vien': da_mot_vien
})
