// Hình người M5 Đợt 2 (thuần, import trong Node được): khách BÁN THÂN (đầu + vai + thân trên) cho 6 kiểu khách × 4 tâm
// trạng, mặt tròn 64 (cắt từ chính hình bán thân) để thay bộ mặt cũ, phụ kiện cho khách quen / khách lạ / người bán,
// Dì Sáu (4 mặt + 4 tư thế bán thân), Anh Khoa, Cô Hạnh. Quy chuẩn vẽ như kit.js (viền mực INK dày 3, chi tiết 1,5–2,
// ba tông: nền + mảng tối dưới-phải + điểm sáng trắng trên-trái; không gradient / filter / clipPath / mask / <use>).
//
// Không sửa src/ui/art.js: gói ráp nối gán lại FACES = HEADS, DI_SAU = DI_SAU_FACES, ANH_KHOA = ANH_KHOA_FACES,
// CO_HANH = CO_HANH_FACES (cùng bộ khóa với bảng cũ) và dùng bust() cho khách đứng ở quầy.
//
// PEOPLE_META.bust: hộp vẽ bán thân (vb = [rộng, cao]) và các điểm mốc theo viewBox đó:
//   head: ellipse đầu; top: đỉnh tóc kiểu thường (mũ, búi tóc cao hơn; đặt bong bóng phía trên); chin: cằm; shoulder: y vai (mép trên áo ở hai
//   bên); chest: y ngực (quầy che từ đây trở xuống vẫn thấy cổ áo); steam: hai chỗ khói khi giận.
// PEOPLE_META.face: mặt tròn 64 (viewBox 0 0 64 64), head: tâm và bán kính đầu theo khung 64 (vòng kiên nhẫn ôm quanh).

import { INK, deepFreeze, r1, hilite, tone3, ball, sampleCubics, svg } from './kit.js'

export const PEOPLE_MOODS = Object.freeze(['vui', 'binh_thuong', 'buc', 'gian'])
export const PERSONA_KEYS = Object.freeze(['hoc_sinh', 'cong_nhan', 'co_chu', 'co_chu_nam', 'van_phong', 'kho_tinh'])
// Tâm trạng thêm cho nhân vật phụ: lo, tiếc, tự hào (Dì Sáu), đang hướng dẫn (Anh Khoa).
export const EXTRA_MOODS = Object.freeze(['lo', 'tiec', 'tu_hao', 'huong_dan'])

// Đầu dời xuống HEAD_DY so với thân (cổ ngắn kiểu chibi); mặt tròn 64 cắt quanh tâm đầu.
const HEAD_DY = 2.4
const FACE_T = 'translate(-9.3 -7.2) scale(.86)'

export const PEOPLE_META = deepFreeze({
  bust: {
    vb: [96, 112], head: { cx: 48, cy: 44.4, rx: 24, ry: 23 }, top: [48, 15], chin: [48, 67.4],
    shoulder: 75, chest: 90, steam: [[19.4, 26.8], [76.6, 26.8]]
  },
  face: { vb: [64, 64], head: { cx: 32, cy: 31, r: 20.6 }, transform: FACE_T }
})

// ---------- Màu ----------

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16))
/** Trộn hai màu #rrggbb theo tỉ lệ t (0 → a, 1 → b). Thuần. */
export function mix(a, b, t) {
  const A = hex(a), B = hex(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

// [nền, tối] — tối đậm hơn 15–20% (mảng tối dưới-phải).
const SKIN = { sang: ['#f8d3ae', '#e6ae84'], vua: ['#f1c49b', '#d9a077'], ngam: ['#dda67c', '#c0845a'], dam: ['#c98e62', '#a86f46'] }
const HAIR = {
  den: ['#3b2b25', '#241914'], nau: ['#6b4530', '#4c2f1f'], bac: ['#c3bdb5', '#a19a91'],
  trang: ['#f3f0ea', '#d6d0c6'], muoi_tieu: ['#8f8a84', '#6f6a64']
}
export const CLOTH = deepFreeze({
  trang: ['#fbfbf8', '#d7dfe8'], xanh_tho: ['#3f6fb0', '#2d5590'], hong: ['#d9667b', '#b44c62'],
  tim: ['#8a5fb0', '#6c4790'], xanh_xam: ['#5f7f9f', '#4a6682'], vest: ['#363b48', '#23272f'],
  nau: ['#8a5a3c', '#6c4329'], nau_do: ['#8a4b2a', '#6c3a1f'], xanh_la: ['#4f9a5a', '#3a7a45'],
  xanh_luc: ['#3f9a6a', '#2f7a52'], xanh_nhat: ['#9fc9e8', '#7aaacd'], ca_phe: ['#9a6a48', '#7a4f31'],
  xanh_dam: ['#3c5a86', '#2c446a'], vang_dat: ['#c9a25a', '#a8823f']
})
const RED = ['#e2453a', '#b8302a']
const MOUTH = '#9b3a30', TONGUE = '#f08a80', TEAR = '#8ccff0'

// ---------- Hình học nhỏ ----------

function insidePoly(pts, x, y) {
  let c = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

// Ô vuông nhỏ xen kẽ (vải caro / khăn rằn) nằm gọn trong đa giác pts (mọi góc ô cách mép ≥ pad).
function checks(pts, { x0, y0, x1, y1, step = 6, size = 3.2, pad = 1.6, color = '#2b2b2b', rot = 0 }) {
  let d = ''
  const h = size / 2
  const a = (rot * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a)
  for (let j = 0, y = y0; y <= y1; j++, y += step) {
    for (let i = 0, x = x0; x <= x1; i++, x += step) {
      if ((i + j) % 2) continue
      const cx = x0 + ((x - x0) * ca - (y - y0) * sa), cy = y0 + ((x - x0) * sa + (y - y0) * ca)
      const k = h + pad
      if (![[-k, -k], [k, -k], [k, k], [-k, k]].every(([u, v]) => insidePoly(pts, cx + u, cy + v))) continue
      d += `M${r1(cx - h)} ${r1(cy - h)}h${r1(size)}v${r1(size)}h${r1(-size)}Z`
    }
  }
  return d ? `<path d="${d}" fill="${color}" stroke="none"/>` : ''
}

// Nét gạch chéo song song (vải khăn rằn) nằm gọn trong đa giác pts, cách mép ≥ pad; ang: góc nét (độ).
function hatch(pts, { x0, y0, x1, y1, gap = 6, ang = 45, pad = 1.6 }) {
  const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a)
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2
  const ok = (x, y) => [[0, 0], [pad, 0], [-pad, 0], [0, pad], [0, -pad]].every(([u, v]) => insidePoly(pts, x + u, y + v))
  let d = ''
  const emit = r => { if (Math.hypot(r[2] - r[0], r[3] - r[1]) > 1.5) d += `M${r1(r[0])} ${r1(r[1])}L${r1(r[2])} ${r1(r[3])}` }
  for (let o = -R + gap / 2; o <= R; o += gap) {
    let run = null
    for (let t = -R; t <= R; t += 0.5) {
      const x = cx - dy * o + dx * t, y = cy + dx * o + dy * t
      if (ok(x, y)) { if (!run) run = [x, y, x, y]; else { run[2] = x; run[3] = y } } else if (run) { emit(run); run = null }
    }
    if (run) emit(run)
  }
  return d
}

// Rút gọn chuỗi SVG (không đổi hình): bỏ số 0 đứng đầu và khoảng trắng trước dấu trừ trong dữ liệu path.
function tidy(s) {
  return s.replace(/ d="([^"]*)"/g, (m, d) => ' d="' + d.replace(/ -/g, '-').replace(/(^|[^\d.])0\.(\d)/g, '$1.$2') + '"')
}

// Mép phải của thân áo (lấy mẫu) → bề rộng thân ở độ cao y (đối xứng qua x = 48).
const TORSO_RIGHT = sampleCubics([[[48, 71.6], [55, 71.6], [60, 72.8], [65, 74.5]], [[65, 74.5], [82, 80], [89, 93], [89, 112]]], 24)
function torsoX(y) {
  for (let i = 1; i < TORSO_RIGHT.length; i++) {
    const [xa, ya] = TORSO_RIGHT[i - 1], [xb, yb] = TORSO_RIGHT[i]
    if (y >= ya && y <= yb) return xa + ((xb - xa) * (y - ya)) / (yb - ya || 1)
  }
  return 89
}

// Ống có viền mực (cánh tay áo, quai): viền, nền.
const tube = (d, w, fill) => `<path d="${d}" fill="none" stroke-width="${r1(w + 3)}"/><path d="${d}" fill="none" stroke="${fill}" stroke-width="${r1(w)}"/>`

// ---------- Thân áo ----------

const NECKS = {
  tron: 'M7 112C7 93 14 80 31 74.5C34.6 73.3 37 72.6 39.2 72.4Q48 81.4 56.8 72.4C59 72.6 61.4 73.3 65 74.5C82 80 89 93 89 112Z',
  v: 'M7 112C7 93 14 80 31 74.5C34.6 73.3 37 72.6 39.6 72.2L48 84L56.4 72.2C59 72.6 61.4 73.3 65 74.5C82 80 89 93 89 112Z',
  kin: 'M7 112C7 93 14 80 31 74.5C36 72.8 41 71.6 48 71.6C55 71.6 60 72.8 65 74.5C82 80 89 93 89 112Z'
}
const TORSO_SHADE = 'M67.6 75.4C82.4 81.4 89 94 89 112H77C77.4 97 75 85 67.6 75.4Z'

function neckSvg(sk) {
  return `<path d="M41 52H55V68L58.6 72V88H37.4V72L41 68Z" fill="${sk[1]}" stroke="none"/><path d="M41 58V71.6M55 58V71.6" fill="none"/>`
}

// Cổ áo bẻ hai vạt (sơ mi, áo thun có cổ, áo bảo hộ).
const collar = c => `<path d="M39.6 72.2L46.6 82.6L38.4 81.2L35.6 74.8Z" fill="${c}" stroke-width="2.2"/>` +
  `<path d="M56.4 72.2L49.4 82.6L57.6 81.2L60.4 74.8Z" fill="${c}" stroke-width="2.2"/>`

// Mỗi kiểu áo: neck (kiểu cổ của thân), d(C, look) → chi tiết vẽ sau thân áo.
const OUTFITS = {
  // Sơ mi trắng học sinh: khăn quàng đỏ thắt nút, túi ngực.
  so_mi_hs: {
    neck: 'v',
    d: C => `<path d="M38.2 71.4Q48 79 57.8 71.4L58.8 74.6Q48 84 37.2 74.6Z" fill="${RED[0]}" stroke-width="2"/>` + collar(C[0]) +
      `<path d="M45.6 83.2L40.6 97.4L46.4 95.6Z" fill="${RED[0]}" stroke-width="2"/><path d="M50.4 83.2L55.8 97L49.8 95.4Z" fill="${RED[1]}" stroke-width="2"/>` +
      `<path d="M44.6 79H51.4L50.4 84.4H45.6Z" fill="${RED[0]}" stroke-width="2"/>` +
      `<path d="M58.6 88.6H68.4V98H58.6Z" fill="none" stroke-width="1.75"/><circle cx="48" cy="104" r="1.4" fill="${INK}" stroke="none"/>`
  },
  // Áo xanh công nhân + áo gile cam phản quang.
  bao_ho: {
    neck: 'v',
    d: C => {
      const vest = sgn => {
        const out = [[48 + sgn * 9.4, 72.4], [48 + sgn * 17, 74.5]]
        for (let y = 78; y <= 112; y += 6) out.push([48 + sgn * (torsoX(y) - 48), y])
        out.push([48 + sgn * 5, 112], [48 + sgn * 5, 86])
        return 'M' + out.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'Z'
      }
      const strip = sgn => {
        const a = 93, b = 98.5
        const xa = 48 + sgn * (torsoX(a) - 49.4), xb = 48 + sgn * (torsoX(b) - 49.4)
        return `M${r1(48 + sgn * 5)} ${a}H${r1(xa)}L${r1(xb)} ${b}H${r1(48 + sgn * 5)}Z`
      }
      return `<path d="${vest(-1)}" fill="#f28a1e" stroke-width="2.2"/><path d="${vest(1)}" fill="#d9700c" stroke-width="2.2"/>` +
        `<path d="${strip(-1)}${strip(1)}" fill="#fff3a6" stroke-width="1.75"/>` + collar(C[0])
    }
  },
  // Áo bà ba: cổ tròn có viền, hàng nút giữa.
  ba_ba: {
    neck: 'tron',
    d: C => `<path d="M40.6 75Q48 83.6 55.4 75" fill="none" stroke="${C[1]}" stroke-width="2"/><path d="M48 81.4V112" fill="none" stroke="${C[1]}" stroke-width="2"/>` +
      [88, 97, 106].map(y => `<circle cx="48" cy="${y}" r="1.8" fill="#fffaf0" stroke-width="1.2"/>`).join('')
  },
  // Áo thun có cổ bẻ: nẹp hai nút, túi ngực có cây bút.
  ao_co: {
    neck: 'v',
    d: C => `<path d="M45.4 80H50.6V94H45.4Z" fill="${C[1]}" stroke-width="1.75"/><circle cx="48" cy="86" r="1.2" fill="#fffaf0" stroke="none"/><circle cx="48" cy="91" r="1.2" fill="#fffaf0" stroke="none"/>` +
      collar(C[0]) + `<path d="M62 86V82" stroke="#2f5fb3" stroke-width="2.6"/><path d="M58.4 86.4H68.4V96H58.4Z" fill="${C[0]}" stroke-width="1.75"/>`
  },
  // Sơ mi văn phòng (cà vạt, thẻ tên là phụ kiện).
  so_mi: {
    neck: 'v',
    d: C => collar(C[0]) + `<path d="M48 84V112" fill="none" stroke="${C[1]}" stroke-width="1.75"/><path d="M58.6 88.6H68.4V98H58.6Z" fill="none" stroke-width="1.75"/>`
  },
  // Áo vest tối, sơ mi đỏ bên trong, ve áo.
  vest: {
    neck: 'v',
    d: () => `<path d="M40.4 72.4L48 91L55.6 72.4Q48 76 40.4 72.4Z" fill="#b8443f" stroke="none"/>` +
      `<path d="M41 73L48 83.6L55 73" fill="none" stroke="#fbfbf8" stroke-width="2.2"/>` +
      `<path d="M39.4 72.2L48 92.4L44.6 96L36.4 82.6L39 79.6L35.4 74.6Z" fill="#454b5a" stroke-width="2.2"/>` +
      `<path d="M56.6 72.2L48 92.4L51.4 96L59.6 82.6L57 79.6L60.6 74.6Z" fill="#2b2f39" stroke-width="2.2"/>`
  },
  // Áo thun sọc ngang (ngư dân).
  ao_soc: {
    neck: 'tron',
    d: () => {
      let d = ''
      for (const y of [84, 95, 106]) {
        const a = Math.max(y, 79), b = Math.min(y + 5, 112)
        d += `M${r1(96 - torsoX(a) + 1.2)} ${a}H${r1(torsoX(a) - 1.2)}L${r1(torsoX(b) - 1.2)} ${b}H${r1(96 - torsoX(b) + 1.2)}Z`
      }
      return `<path d="${d}" fill="#2f4f86" stroke="none"/>`
    }
  },
  // Áo dài: cổ đứng che cổ, đường nẹp chéo có nút.
  ao_dai: {
    neck: 'kin',
    d: C => `<path d="M40.6 63.6H55.4V73.4Q48 76.2 40.6 73.4Z" fill="${C[0]}" stroke-width="2.4"/>` +
      `<path d="M55.4 74.6C59.6 77.8 63.4 80.4 68 82.4" fill="none" stroke="${C[1]}" stroke-width="2"/>` +
      [[58.6, 77], [62.6, 79.8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fffaf0" stroke-width="1"/>`).join('')
  },
  // Áo thun cổ tròn có viền bo, hình lá nhỏ trên ngực.
  ao_thun: {
    neck: 'tron',
    d: C => `<path d="M40.6 75Q48 83.6 55.4 75" fill="none" stroke="${C[1]}" stroke-width="2.4"/>` +
      `<path d="M61 90C61 86 64 84 67 84C67 88 64.6 90.6 61 90Z" fill="#c4ec9e" stroke-width="1.6"/>`
  }
}

function torsoSvg(look) {
  const o = OUTFITS[look.outfit] || OUTFITS.ao_thun
  const C = CLOTH[look.color] || CLOTH.trang
  const T = NECKS[o.neck]
  return tone3({
    outline: T, base: C[0], dark: C[1], shade: TORSO_SHADE,
    detail: `<path d="M23.4 88C21.8 96 21.8 104 22.6 112M72.6 88C74.2 96 74.2 104 73.4 112" fill="none" stroke="${C[1]}" stroke-width="1.75"/>` + o.d(C, look),
    shine: `<path d="M14.6 93C16.4 85 21.4 80 28.4 77.2" fill="none" stroke="#fff" stroke-width="3" opacity=".45"/>`
  })
}

// ---------- Tóc ----------

// Mỗi kiểu tóc: back (sau đầu), d (bóng dáng phía trước), shade (mảng tối bên phải), shine (vệt sáng), detail.
const HAIRS = {
  ngan: {
    d: 'M22.6 45C20 27 31 14.6 48 14.6C65 14.6 76 27 73.4 45C71.6 38.6 69.6 34.4 66 31C61 34.6 53 35 47.4 31.6C43 35 35 36 30 33.2C27 36.4 24.2 40.4 22.6 45Z',
    shade: 'M60.4 16.4C69.4 19.6 75 29.6 73.4 45C71.6 38.6 69.6 34.4 66 31C66.6 25.4 64.4 20 60.4 16.4Z',
    shine: 'M30.6 23.4C34.4 19.8 39.4 18.2 44.4 18'
  },
  bim: {
    back: c => `<path d="M24 38C15 39 10.6 50 12.4 64C17.6 60 22.6 52 25 44Z" fill="${c[0]}"/><path d="M72 38C81 39 85.4 50 83.6 64C78.4 60 73.4 52 71 44Z" fill="${c[1]}"/>`,
    d: 'M23 45C20.4 27 31 15 48 15C65 15 75.6 27 73 45C70.4 37 66.4 32 60.4 30.4C55 33.4 41 33.4 35.6 30.4C30 32 25.6 37 23 45Z',
    shade: 'M60.6 16.8C69.6 20 75 30 73 45C70.4 37 66.4 32 60.4 30.4C62.4 25.6 62.2 20.8 60.6 16.8Z',
    shine: 'M31 23.6C34.8 20 39.6 18.4 44.6 18.2',
    detail: `<path d="M22 43.6L26.4 46.6L23 49.6Z" fill="${RED[0]}" stroke-width="1.6"/><path d="M74 43.6L69.6 46.6L73 49.6Z" fill="${RED[0]}" stroke-width="1.6"/>`
  },
  bui: {
    back: c => `<circle cx="48" cy="15.4" r="8.2" fill="${c[0]}"/><path d="M43 13.6C45 11.4 48.6 10.6 51.4 11.6" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/>`,
    d: 'M23.4 46C20.6 28 31 17.4 48 17.4C65 17.4 75.4 28 72.6 46C71 38 67 30.6 58 28C50 31.4 38 30.6 31 34.6C27.6 37.6 25 41.4 23.4 46Z',
    shade: 'M61.4 19.4C69.6 22.8 74.4 31 72.6 46C71 38 67 30.6 58 28C60.6 25.4 61.6 22.4 61.4 19.4Z',
    shine: 'M30.4 26.4C33.6 22.6 38.6 20.6 43.6 20.2',
    detail: '<path d="M40 22.4C44 21 49 21.6 53 23.6" fill="none" stroke-width="1.6"/>'
  },
  muoi_tieu: {
    d: 'M23.8 44C22 28 32 18 48 18C64 18 74 28 72.2 44C70.8 36.4 68.4 31.4 63.4 28.6C57.4 27.2 50.4 28.2 44.4 26.8C38.4 27.6 31.4 31 28 35.6C26 38.2 24.6 41 23.8 44Z',
    shade: 'M60.6 19.6C68.6 23 73.6 31 72.2 44C70.8 36.4 68.4 31.4 63.4 28.6C63.6 25.4 62.6 22.2 60.6 19.6Z',
    shine: 'M31.4 25.6C34.8 22.4 39.6 20.8 44.4 20.6',
    detail: '<path d="M35.4 24.4L39 23M52 21.6L56.6 22.8M28.6 32.4L31.4 29.8M64.6 25.6L67.4 28" fill="none" stroke="#e2ded8" stroke-width="1.8"/>'
  },
  re_ngoi: {
    d: 'M23.4 43C21 26 32 15.6 49 16C65 16.4 75 26.4 72.6 43C71 35.6 68 30 63 27.6C57 26.6 52 25.6 47.6 22.6C44 27.6 36 30.6 29.6 31.6C26.8 35 24.6 38.6 23.4 43Z',
    shade: 'M61.6 18C69.6 21.6 74.4 30 72.6 43C71 35.6 68 30 63 27.6C63.4 24.4 62.8 21 61.6 18Z',
    shine: 'M29 25C32.6 21.4 36.6 19.4 41.4 18.6',
    detail: '<path d="M47.6 22.6C49.2 19.8 51.6 18.4 54.4 18" fill="none" stroke-width="1.75"/>'
  },
  bob: {
    back: c => `<path d="M20.4 48C18.6 28 31 15 48 15C65 15 77.4 28 75.6 48C75.4 57 73.4 63 69.6 66.4H26.4C22.6 63 20.6 57 20.4 48Z" fill="${c[0]}"/>` +
      `<path d="M71.4 32C75 38 76 44 75.6 48C75.4 57 73.4 63 69.6 66.4H64.4C68.4 58 70.4 46 71.4 32Z" fill="${c[1]}" stroke="none"/>`,
    d: 'M23 46C20.6 28 31 15.6 48 15.6C65 15.6 75.4 28 73 46C70 36 64 30 56 28.6C52 31.6 46 33 39 32.6C32 33 26.6 38 23 46Z',
    shade: 'M61.6 17.6C70 21 75 30 73 46C70 36 64 30 56 28.6C59.4 25.4 61 21.6 61.6 17.6Z',
    shine: 'M30.4 23.4C34 19.8 38.8 18.2 43.8 18',
    detail: `<path d="M63.4 26.6L68.4 23.6" stroke="${RED[0]}" stroke-width="2.4"/>`
  },
  vuot: {
    d: 'M23.4 41C22 25 33 15 49 15C65 15 74.6 25 72.6 41C68.6 33 63.6 28.6 56 27C49 26 41 26.6 34 28.6C29.6 30.6 25.6 35 23.4 41Z',
    shade: 'M62 17.4C70 21.4 74.4 29.4 72.6 41C68.6 33 63.6 28.6 56 27C59.4 24.4 61.4 21 62 17.4Z',
    shine: 'M29.6 24.6C33.4 20.6 38.6 18.4 44 18',
    detail: '<path d="M36 22.4C42 20 50 20 56 22M34 26C40 23.6 50 23.4 57.6 25.4" fill="none" stroke="#5a4a42" stroke-width="1.6"/>'
  },
  dai: {
    back: c => `<path d="M20.6 46C18.6 26 31 14.6 48 14.6C65 14.6 77.4 26 75.4 46L77.4 98C70 101 63 99 60.6 93H35.4C33 99 26 101 18.6 98Z" fill="${c[0]}"/>` +
      `<path d="M71.6 30C75 36 75.8 42 75.4 46L77.4 98C74 99.4 70.6 99.6 67.6 99C71.4 82 72.4 58 71.6 30Z" fill="${c[1]}" stroke="none"/>`,
    d: 'M23 45C21 27 31 15.6 48 15.6C65 15.6 75 27 73 45C70 35 61 27.4 48 24.6C35 27.4 26 35 23 45Z',
    shade: 'M61 17.6C69.6 21.4 74.6 30 73 45C70 35 61 27.4 48 24.6C53.4 23.4 58 21 61 17.6Z',
    shine: 'M30 24C33.6 20.4 38.4 18.6 43.4 18.2'
  },
  duoi_ngua: {
    back: c => `<path d="M66 38C78.6 42 83 56 78 70C75.4 62 71.4 55 64.6 50Z" fill="${c[0]}"/>`,
    d: 'M22.6 45C20 27 31 14.6 48 14.6C65 14.6 76 27 73.4 45C71.6 38.6 69.6 34.4 66 31C61 34.6 53 35 47.4 31.6C43 35 35 36 30 33.2C27 36.4 24.2 40.4 22.6 45Z',
    shade: 'M60.4 16.4C69.4 19.6 75 29.6 73.4 45C71.6 38.6 69.6 34.4 66 31C66.6 25.4 64.4 20 60.4 16.4Z',
    shine: 'M30.6 23.4C34.4 19.8 39.4 18.2 44.4 18'
  },
  // Tóc mai lộ ra dưới mũ / khăn (chỉ hai bên thái dương).
  mai: {
    d: 'M23 44C22.4 38 23.4 34 25.6 31L29.6 33.4C27.4 36.4 25.4 40 23 44ZM73 44C73.6 38 72.6 34 70.4 31L66.4 33.4C68.6 36.4 70.6 40 73 44Z',
    shade: '', shine: ''
  }
}

function hairSvg(look, part) {
  const H = HAIRS[look.hair]
  if (!H) return ''
  const c = HAIR[look.hairC] || HAIR.den
  if (part === 'back') return H.back ? H.back(c) : ''
  return tone3({
    outline: H.d, base: c[0], dark: c[1], shade: H.shade,
    detail: H.detail || '',
    shine: H.shine ? `<path d="${H.shine}" fill="none" stroke="#fff" stroke-width="2.6" opacity=".4"/>` : ''
  })
}

// ---------- Mũ, khăn trùm đầu ----------

// Khăn trùm đầu (khăn rằn của Dì Sáu, khăn hoa của người bán): bóng dáng, nút thắt trên đỉnh.
const SCARF = 'M21.4 46C18 25 31 12.6 48 12.6C65 12.6 78 25 74.6 46C72 37.6 66 31.6 58 30C52 32 44 32 38 30C30 31.6 24 37.6 21.4 46Z'
const SCARF_PTS = sampleCubics([
  [[21.4, 46], [18, 25], [31, 12.6], [48, 12.6]], [[48, 12.6], [65, 12.6], [78, 25], [74.6, 46]],
  [[74.6, 46], [72, 37.6], [66, 31.6], [58, 30]], [[58, 30], [52, 32], [44, 32], [38, 30]], [[38, 30], [30, 31.6], [24, 37.6], [21.4, 46]]
], 10)

function scarfSvg(base, dark, pattern) {
  return tone3({
    outline: SCARF, base, dark,
    shade: 'M62 15C71 19 76.6 29 74.6 46C72 37.6 66 31.6 58 30C61.6 25.6 62.8 20.4 62 15Z',
    detail: pattern,
    shine: '<path d="M28.6 26C32.4 20.6 38 17.4 44 16.6" fill="none" stroke="#fff" stroke-width="2.6" opacity=".5"/>'
  }) + `<path d="M41.4 13.4C37 5.4 43 2 48 8.4C53 2 59 5.4 54.6 13.4Z" fill="${base}"/><path d="M45.4 8.6H50.6L50 13.6H46Z" fill="${dark}" stroke-width="2"/>`
}

const HATS = {
  // Mũ bảo hộ vàng: chóp, gờ giữa, vành cong ôm trán.
  bao_ho: () => tone3({
    outline: 'M20.6 32C20.6 16.6 32.6 7.6 48 7.6S75.4 16.6 75.4 32Z', base: '#f7c22c', dark: '#d9a114',
    shade: 'M63.6 10.8C71 15 75.4 22.6 75.4 32H67.4C67.4 23.4 66.2 16.4 63.6 10.8Z',
    detail: '<path d="M48 8.4V31.4M38.4 10.6C36.4 16.6 35.8 24.6 36 31.4M57.6 10.6C59.6 16.6 60.2 24.6 60 31.4" fill="none" stroke="#d9a114" stroke-width="2"/>',
    shine: hilite(31, 17, 4.8, 2.4, 0.55, -35)
  }) + tone3({
    outline: 'M13.4 31.6C14 29.6 16 29 18 29.4C36 33 60 33 78 29.4C80 29 82 29.6 82.6 31.6C83.2 33.8 82 35.4 80 35.8C60 39.6 36 39.6 16 35.8C14 35.4 12.8 33.8 13.4 31.6Z',
    base: '#e8ae1c', dark: '#c98f0c', shade: 'M56 37.2C64 36.8 72 36.2 80 35.8C82 35.4 83.2 33.8 82.6 31.6C80 34.4 70 35.6 56 37.2Z'
  }),
  // Nón lá: chóp nhọn, vân lá.
  non_la: () => tone3({
      outline: 'M5 31.4L48 1.6L91 31.4Q48 40 5 31.4Z', base: '#ecc873', dark: '#c99a3a',
      shade: 'M48 1.6L91 31.4Q74 34.8 57.6 35.6Z',
      detail: '<path d="M16.6 23.4Q48 30.4 79.4 23.4M28 15.4Q48 20.6 68 15.4M38.6 8.2Q48 11 57.4 8.2" fill="none" stroke="#c99a3a" stroke-width="1.6"/>',
      shine: '<path d="M14 27.6L40 9.4" fill="none" stroke="#fff" stroke-width="2.4" opacity=".5"/>'
    }),
  // Mũ tai bèo màu đất: chóp tròn, dây băng, vành mềm.
  mu_tai_beo: () => tone3({
    outline: 'M27 30C27 17.6 36 12 48 12C60 12 69 17.6 69 30Z', base: '#c9b27a', dark: '#a8915a',
    shade: 'M60.4 13.8C66 16.6 69 22 69 30H62.6C62.6 23.6 62 18 60.4 13.8Z',
    shine: hilite(35.6, 18, 4, 2, 0.5, -30)
  }) + `<path d="M27.2 25H68.8V29.6H27.2Z" fill="#6f5f3e" stroke-width="2"/>` +
    tone3({
      outline: 'M16.4 33.4C22 27 74 27 79.6 33.4C80.8 36.4 77 38.6 71 38.2C60 36.8 36 36.8 25 38.2C19 38.6 15.2 36.4 16.4 33.4Z',
      base: '#c9b27a', dark: '#a8915a', shade: 'M60 31.4C68 31.4 76.6 31.8 79.6 33.4C80.8 36.4 77 38.6 71 38.2C67 37.6 63 37.2 58 37Z'
    }),
  // Mũ lưỡi trai (màu theo người), lưỡi trai chĩa ra trước.
  mu_luoi_trai: c => tone3({
    outline: 'M22.6 34C22.6 19 33.6 11.6 48 11.6S73.4 19 73.4 34Z', base: c[0], dark: c[1],
    shade: 'M63.4 14.6C70 18.6 73.4 25 73.4 34H66.6C66.6 26 65.6 19.6 63.4 14.6Z',
    detail: '<path d="M48 12.4V33.4" fill="none" stroke-width="1.6"/>',
    shine: hilite(33, 19.4, 4.4, 2.2, 0.5, -35)
  }) + `<circle cx="48" cy="12" r="2.2" fill="${c[1]}" stroke-width="1.6"/>` +
    `<path d="M24 32.4C34 37.4 62 37.4 72 32.4C74.4 34.6 73.6 38.6 70 40C60 43 36 43 26 40C22.4 38.6 21.6 34.6 24 32.4Z" fill="${c[1]}"/>`,
  // Khăn rằn trắng đen trùm đầu (Dì Sáu).
  khan_ran: () => scarfSvg('#f6f3ec', '#ddd6c8', `<path d="${hatch(SCARF_PTS, { x0: 18, y0: 10, x1: 78, y1: 47, gap: 8, ang: 45, pad: 1.4 })}${hatch(SCARF_PTS, { x0: 18, y0: 10, x1: 78, y1: 47, gap: 8, ang: -45, pad: 1.4 })}" fill="none" stroke="#2b2b2b" stroke-width="2"/>`),
  // Khăn hoa cam trùm đầu (người bán chợ sớm).
  khan_hoa: () => scarfSvg('#ef8a3c', '#cf6c22', checks(SCARF_PTS, { x0: 20, y0: 12, x1: 78, y1: 46, step: 7, size: 2.2, pad: 1.4, color: '#fff6d8', rot: 45 }))
}

const CAP_COLORS = { xanh: ['#2f6fb5', '#235690'], do: ['#d6463a', '#a8322a'] }

// ---------- Phụ kiện ----------

// Lớp: 'back' sau thân, 'body' sau áo trước đầu, 'hair' sau tóc, 'face' sau nét mặt, 'top' trên cùng.
const ACC = {
  kinh: {
    layer: 'face',
    s: () => '<path d="M33 44.4L25.4 43M63 44.4L70.6 43" fill="none" stroke-width="1.75"/>' +
      '<circle cx="39" cy="45.4" r="6.2" fill="#fff" opacity=".2" stroke="none"/><circle cx="57" cy="45.4" r="6.2" fill="#fff" opacity=".2" stroke="none"/>' +
      '<circle cx="39" cy="45.4" r="6.2" fill="none" stroke-width="2.2"/><circle cx="57" cy="45.4" r="6.2" fill="none" stroke-width="2.2"/>' +
      '<path d="M45.2 44.8Q48 43 50.8 44.8" fill="none" stroke-width="2"/><path d="M35.2 42.2L37.4 40.6M53.2 42.2L55.4 40.6" fill="none" stroke="#fff" stroke-width="1.6" opacity=".9"/>'
  },
  kinh_ram: {
    layer: 'hair',
    s: () => '<path d="M45 22.6H51" fill="none" stroke-width="2"/><rect x="31" y="19.4" width="14" height="7.4" rx="3.6" fill="#26282e" stroke-width="2"/>' +
      '<rect x="51" y="19.4" width="14" height="7.4" rx="3.6" fill="#26282e" stroke-width="2"/><path d="M34 21.8H38.4M54 21.8H58.4" stroke="#fff" stroke-width="1.6" opacity=".6"/>'
  },
  vong_ngoc: {
    layer: 'body',
    s: () => [[39.4, 74.4], [41.4, 77.4], [44.4, 79.4], [48, 80.2], [51.6, 79.4], [54.6, 77.4], [56.6, 74.4]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#fffaf0" stroke-width="1.1"/>`).join('')
  },
  hoa_tai: {
    layer: 'face',
    s: () => '<circle cx="24.2" cy="53.4" r="2" fill="#f7b928" stroke-width="1.2"/><circle cx="71.8" cy="53.4" r="2" fill="#f7b928" stroke-width="1.2"/>'
  },
  ria: {
    layer: 'face',
    s: (L) => `<path d="M40.6 53.4Q44.6 50.4 48 52.4Q51.4 50.4 55.4 53.4Q51.6 55.4 48 54Q44.4 55.4 40.6 53.4Z" fill="${(HAIR[L.hairC] || HAIR.muoi_tieu)[1]}" stroke-width="1.6"/>`
  },
  ca_vat: {
    layer: 'body',
    s: () => '<path d="M45.4 81.4H50.6L52 85L50.4 104L48 107L45.6 104L44 85Z" fill="#2f5fb3" stroke-width="2"/>' +
      '<path d="M45 76.8H51L50 82H46Z" fill="#2f5fb3" stroke-width="2"/><path d="M46.4 90L50.2 87.6M46 97L50.6 94.2" stroke="#9fc4f2" stroke-width="1.6"/>'
  },
  the_ten: {
    layer: 'body',
    s: () => '<path d="M40.6 74.6L45.4 91.4M55.4 74.6L50.6 91.4" fill="none" stroke="#2f6fb5" stroke-width="2.2"/>' +
      '<rect x="41.6" y="90.4" width="12.8" height="15.6" rx="2" fill="#fffaf0" stroke-width="2"/><path d="M41.6 94.2H54.4" stroke="#2f6fb5" stroke-width="2.6"/>' +
      '<rect x="44.4" y="97" width="7.2" height="5.6" rx="1" fill="#f2c48d" stroke-width="1.4"/>'
  },
  khoanh_tay: {
    layer: 'body',
    s: (L) => {
      const C = CLOTH[L.color] || CLOTH.vest
      const sk = SKIN[L.skin] || SKIN.vua
      const fistAt = (x, f) => `<path d="M${x} 97.4C${r1(x - f * 1.6)} 93 ${r1(x + f * 1.8)} 89.6 ${r1(x + f * 6.2)} 90.6C${r1(x + f * 9.2)} 91.2 ${r1(x + f * 11.2)} 94 ${r1(x + f * 10.8)} 97.4Z" fill="${sk[0]}" stroke-width="2.2"/>`
      return `<path d="M82 107C68 101.4 42 95.6 25 94C19.4 93.4 16 96.4 16.4 100C16.8 103.4 19.6 105 23.6 105.2C40 106 62 109.4 76 112H86Z" fill="${C[1]}" stroke-width="2.6"/>` +
        fistAt(14.2, 1) +
        `<path d="M14 107C28 101.4 54 95.6 71 94C76.6 93.4 80 96.4 79.6 100C79.2 103.4 76.4 105 72.4 105.2C56 106 34 109.4 20 112H10Z" fill="${C[0]}" stroke-width="2.6"/>` +
        fistAt(81.8, -1) + '<path d="M26 98.4C40 96.8 56 96.2 67 96.8" fill="none" stroke="#fff" stroke-width="2" opacity=".3"/>'
    }
  },
  balo: {
    layer: 'body',
    s: () => `<path d="M29.4 75.6C26.4 86 25.6 98 26.6 112H33C32.2 99 33 88 36 77Z" fill="#2f6fb5" stroke-width="2.2"/>` +
      `<path d="M66.6 75.6C69.6 86 70.4 98 69.4 112H63C63.8 99 63 88 60 77Z" fill="#235690" stroke-width="2.2"/>` +
      `<rect x="26.4" y="96" width="7.6" height="4.6" rx="1.4" fill="#f7b928" stroke-width="1.6"/><rect x="62" y="96" width="7.6" height="4.6" rx="1.4" fill="#f7b928" stroke-width="1.6"/>`
  },
  bang_ca_nhan: {
    layer: 'face',
    s: () => '<g transform="rotate(-24 63.6 52.4)"><rect x="58.4" y="49.8" width="10.4" height="5.2" rx="2.4" fill="#f2c48d" stroke-width="1.6"/>' +
      '<path d="M62.4 51.6h.1M64.8 51.6h.1M62.4 53.2h.1M64.8 53.2h.1" stroke="#c98d4f" stroke-width="1.2"/></g>'
  },
  khan_co: {
    layer: 'body',
    s: () => {
      const band = 'M36.4 69.4Q48 79 59.6 69.4L61.6 74.8Q48 86 34.4 74.8Z'
      const pts = sampleCubics([[[36.4, 69.4], [44, 75.8], [52, 75.8], [59.6, 69.4]], [[59.6, 69.4], [60.3, 71.2], [60.9, 73], [61.6, 74.8]],
        [[61.6, 74.8], [52.6, 82.2], [43.4, 82.2], [34.4, 74.8]], [[34.4, 74.8], [35.1, 73], [35.7, 71.2], [36.4, 69.4]]], 8)
      const bb = { x0: 33, y0: 68, x1: 63, y1: 83, gap: 4.6, pad: 0.6 }
      return `<path d="${band}" fill="#f6f3ec" stroke="none"/><path d="${hatch(pts, bb)}${hatch(pts, { ...bb, ang: -45 })}" fill="none" stroke="#2b2b2b" stroke-width="1.4"/>` +
        `<path d="${band}" fill="none" stroke-width="2.2"/>` +
        `<path d="M56 77.6L64.6 90.4L58.6 91.6L52.4 79.4Z" fill="#f6f3ec" stroke-width="2"/><path d="M56.4 81.4L60.6 87.6M59.4 80.6L62.8 86" fill="none" stroke="#2b2b2b" stroke-width="1.4"/>`
    }
  },
  khan_vai: {
    layer: 'body',
    s: () => tone3({
      outline: 'M16.4 80C22.4 75.6 29.4 73.4 34.6 73.4L37.6 112H24C24 100 21.6 89.6 16.4 80Z', base: '#f6f6f2', dark: '#d9dde2',
      shade: 'M31.4 74L34.6 73.4L37.6 112H32.6Z',
      detail: '<path d="M22.4 100.6L36.6 99.4M23 105.4L37 104.2" fill="none" stroke="#4a8fd0" stroke-width="2.2"/>'
    })
  },
  don_ganh: {
    layer: 'top',
    s: () => `<path d="M58 80L96 64.6" fill="none" stroke-width="8.4"/><path d="M58 80L96 64.6" fill="none" stroke="#d9b26a" stroke-width="5.4"/>` +
      `<path d="M72.6 72.8l1.8 4.2M86.4 67.2l1.8 4.2" stroke-width="1.6"/>`
  },
  ga_con: {
    layer: 'top',
    s: () => ball(78.4, 72.4, 7.4, 6.6, ['#ffd84a', '#efb21c', '#fff']) +
      '<circle cx="76" cy="70.6" r="1.2" fill="#3a2618" stroke="none"/><path d="M71.2 71.8L68 73L71.4 74.4Z" fill="#f28a1e" stroke-width="1.4"/>' +
      '<path d="M77.6 65.6C77 63 78.6 61.6 80 62.6" fill="none" stroke-width="1.6"/><path d="M80.4 74C83 72.6 84.6 74.6 83.4 76.4" fill="none" stroke="#efb21c" stroke-width="1.6"/>'
  },
  nep_nhan: {
    layer: 'face',
    s: (L) => `<path d="M30.6 46.4L27.6 45.6M30.6 48.6L27.8 49.6M65.4 46.4L68.4 45.6M65.4 48.6L68.2 49.6M41.6 61.6Q48 63.6 54.4 61.6" fill="none" stroke="${(SKIN[L.skin] || SKIN.vua)[1]}" stroke-width="1.6"/>`
  },
  tap_de: {
    layer: 'body',
    s: () => `<path d="M38.6 84L41.4 73M57.4 84L54.6 73" fill="none" stroke="#dcbc80" stroke-width="2.6"/>` +
      tone3({
        outline: 'M36.4 84.4H59.6L61.4 112H34.6Z', base: '#f3d9a4', dark: '#dcbc80',
        shade: 'M55 84.4H59.6L61.4 112H56.6Z',
        detail: '<path d="M41 97.6H55V105.4H41Z" fill="none" stroke="#c9a364" stroke-width="1.75"/>',
        shine: '<path d="M39.6 88V96" fill="none" stroke="#fff" stroke-width="2.2" opacity=".5"/>'
      })
  }
}

// ---------- Nét mặt theo tâm trạng ----------

const EY = 45.4
const eyeOpen = (x, y = EY, rx = 2.8, ry = 3.7) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${INK}" stroke="none"/><circle cx="${r1(x - 0.9)}" cy="${r1(y - 1.4)}" r="1.1" fill="#fff" stroke="none"/>`
const blush = (op, c = '#f59a94') =>
  `<ellipse cx="32.4" cy="53" rx="4.4" ry="2.6" fill="${c}" opacity="${String(op).replace(/^0\./, '.')}" stroke="none"/>` +
  `<ellipse cx="63.6" cy="53" rx="4.4" ry="2.6" fill="${c}" opacity="${String(op).replace(/^0\./, '.')}" stroke="none"/>`
const B = (d, w = 2.2) => `<path d="${d}" fill="none" stroke-width="${w}"/>`
const drop = (x, y, s = 1) => `<path d="M${x} ${y}C${r1(x + 2.4 * s)} ${r1(y + 3.6 * s)} ${r1(x + 3.2 * s)} ${r1(y + 5.6 * s)} ${x} ${r1(y + 7.2 * s)}C${r1(x - 3.2 * s)} ${r1(y + 5.6 * s)} ${r1(x - 2.4 * s)} ${r1(y + 3.6 * s)} ${x} ${y}Z" fill="${TEAR}" stroke-width="1.5"/>` +
  `<path d="M${r1(x - 1)} ${r1(y + 4.2 * s)}v1.6" stroke="#fff" stroke-width="1.2"/>`
const puff = (x, y) => `<path d="M${r1(x - 6)} ${r1(y + 3)}C${r1(x - 8.6)} ${r1(y + 3)} ${r1(x - 8.6)} ${r1(y - 1.6)} ${r1(x - 5.6)} ${r1(y - 1.4)}C${r1(x - 5.4)} ${r1(y - 5.4)} ${r1(x + 1)} ${r1(y - 6)} ${r1(x + 1.6)} ${r1(y - 2.4)}C${r1(x + 5.4)} ${r1(y - 3.6)} ${r1(x + 7.4)} ${r1(y + 0.6)} ${r1(x + 5)} ${r1(y + 3)}Z" fill="#f3f1ee" stroke-width="2"/>`
const sparkle = (x, y, r, c = '#ffd23f') => `<path d="M${x} ${r1(y - r)}Q${r1(x + r * 0.2)} ${r1(y - r * 0.2)} ${r1(x + r)} ${y}Q${r1(x + r * 0.2)} ${r1(y + r * 0.2)} ${x} ${r1(y + r)}Q${r1(x - r * 0.2)} ${r1(y + r * 0.2)} ${r1(x - r)} ${y}Q${r1(x - r * 0.2)} ${r1(y - r * 0.2)} ${x} ${r1(y - r)}Z" fill="${c}" stroke-width="1.5"/>`

const HAPPY_EYES = B('M35 47Q39 42 43 47M53 47Q57 42 61 47', 2.8)
const WORRY_BROWS = B('M34.6 39.6Q39 39 43.2 35.8M61.4 39.6Q57 39 52.8 35.8')

// Trả { under, eyes, mouth, over } cho tâm trạng (tọa độ khung bán thân).
function moodParts(mood) {
  switch (mood) {
    case 'vui': return {
      under: blush(0.75),
      eyes: B('M34.6 37.6Q39 34.4 43.4 37M52.6 37Q57 34.4 61.4 37.6') + HAPPY_EYES,
      mouth: `<path d="M40.6 54Q48 65 55.4 54Z" fill="${MOUTH}" stroke-width="2.2"/><path d="M43.8 59.4Q48 56.8 52.2 59.4Q48 62.6 43.8 59.4Z" fill="${TONGUE}" stroke="none"/>`,
      over: ''
    }
    case 'buc': return {
      under: '',
      eyes: B('M34.6 37.2L43.2 40.6M61.4 37.2L52.8 40.6', 2.6) +
        `<path d="M36.2 44.2H41.8A2.8 3.4 0 0 1 36.2 44.2ZM54.2 44.2H59.8A2.8 3.4 0 0 1 54.2 44.2Z" fill="${INK}" stroke="none"/>` +
        B('M35.4 44.2H42.6M53.4 44.2H60.6', 2.2) + B('M46.8 38.2V40.6M49.2 38.2V40.6', 1.4),
      mouth: B('M42.6 57.8Q45.3 55.6 48 57.8Q50.7 60 53.4 57.8'),
      over: '<path d="M63.4 24.6c1.2-3.6 6.2-4.4 7.4-1.2.9 2.6-2.8 4.4-5 2.8-2.4-1.6-.4-5.6 3.2-5.6 3.6 0 5.8 3.4 4 6.4" fill="none" stroke="#6e5340" stroke-width="1.8"/>'
    }
    case 'gian': return {
      under: blush(0.6, '#e8483a'),
      eyes: B('M33.8 35.6L43.6 41.2M62.2 35.6L52.4 41.2', 3.2) + eyeOpen(39.4, 46.4, 2.5, 3) + eyeOpen(56.6, 46.4, 2.5, 3),
      mouth: '<rect x="40.8" y="54.6" width="14.4" height="7.6" rx="3" fill="#fff" stroke-width="2.2"/>' + B('M40.8 58.4H55.2M45.6 54.6V62.2M50.4 54.6V62.2', 1.4),
      over: puff(19.4, 24.4) + puff(76.6, 24.4) + '<circle cx="12.6" cy="15.4" r="2.8" fill="#f3f1ee" stroke-width="1.8"/><circle cx="83.4" cy="15.4" r="2.8" fill="#f3f1ee" stroke-width="1.8"/>'
    }
    case 'lo': return {
      under: blush(0.35),
      eyes: WORRY_BROWS + eyeOpen(39, EY, 2.6, 3.4) + eyeOpen(57, EY, 2.6, 3.4),
      mouth: `<ellipse cx="48" cy="57.6" rx="2.8" ry="3.4" fill="${MOUTH}" stroke-width="2"/>`,
      over: drop(68.4, 26.6)
    }
    case 'tiec': return {
      under: blush(0.4),
      eyes: WORRY_BROWS + B('M35 45Q39 48.8 43 45M53 45Q57 48.8 61 45', 2.6),
      mouth: B('M43 58.6Q48 55 53 58.6'),
      over: drop(61.4, 49.6, 0.8)
    }
    case 'tu_hao': return {
      under: blush(0.75),
      eyes: B('M34.4 36.6Q39 33 43.6 36M52.4 36Q57 33 61.6 36.6') + HAPPY_EYES,
      mouth: `<path d="M39.6 53.6Q48 66.4 56.4 53.6Z" fill="${MOUTH}" stroke-width="2.2"/><path d="M41.6 55Q48 56.6 54.4 55L53.4 57.4Q48 58.8 42.6 57.4Z" fill="#fff" stroke="none"/>` +
        `<path d="M44.6 61.4Q48 59.4 51.4 61.4Q48 63.6 44.6 61.4Z" fill="${TONGUE}" stroke="none"/>`,
      over: sparkle(71, 21.6, 5.6) + sparkle(78.4, 31, 3)
    }
    case 'huong_dan': return {
      under: blush(0.45),
      eyes: B('M35 38.6Q39 36.6 43 38.2M52.6 36Q57 33.4 61.4 36') + eyeOpen(39) + eyeOpen(57),
      mouth: `<path d="M42.6 55Q48 61.6 53.4 55Z" fill="${MOUTH}" stroke-width="2"/>`,
      over: ''
    }
    default: return {
      under: blush(0.4),
      eyes: B('M35 38.6Q39 36.6 43 38.2M53 38.2Q57 36.6 61 38.6') + eyeOpen(39) + eyeOpen(57),
      mouth: B('M43.4 55.4Q48 59 52.6 55.4'),
      over: ''
    }
  }
}

// ---------- Ghép người ----------

// Dáng mặc định theo kiểu khách; nu: phần thay khi là nữ. Khóa 'co_chu_nam' = chú (cô chú, nam).
const LOOKS = {
  hoc_sinh: { skin: 'sang', hair: 'ngan', hairC: 'den', outfit: 'so_mi_hs', color: 'trang', acc: [], nu: { hair: 'bim' } },
  cong_nhan: { skin: 'ngam', hair: 'mai', hairC: 'den', hat: 'bao_ho', outfit: 'bao_ho', color: 'xanh_tho', acc: [], nu: { hair: 'duoi_ngua' } },
  co_chu: { skin: 'vua', hair: 'bui', hairC: 'bac', outfit: 'ba_ba', color: 'hong', acc: ['hoa_tai'] },
  co_chu_nam: { skin: 'vua', hair: 'muoi_tieu', hairC: 'muoi_tieu', outfit: 'ao_co', color: 'xanh_xam', acc: ['ria'] },
  van_phong: { skin: 'sang', hair: 're_ngoi', hairC: 'nau', outfit: 'so_mi', color: 'trang', acc: ['ca_vat'], nu: { hair: 'bob', acc: ['the_ten', 'hoa_tai'] } },
  kho_tinh: { skin: 'vua', hair: 'vuot', hairC: 'den', outfit: 'vest', color: 'vest', acc: ['kinh_ram', 'khoanh_tay'], nu: { hair: 'dai', acc: ['kinh_ram', 'khoanh_tay', 'hoa_tai'] } }
}

/**
 * Khách quen, khách lạ (src/data/rare.js STRANGERS) và người bán (STALLS) có dáng riêng: id → phần ghi đè lên dáng
 * theo kiểu khách (persona, gender giữ nguyên như dữ liệu). Cô Thu: kính + áo tím + chuỗi ngọc như Phòng mẫu.
 */
export const WHO_LOOKS = deepFreeze({
  co_thu: { persona: 'co_chu', gender: 'nu', color: 'tim', acc: ['kinh', 'vong_ngoc'] },
  ban_nam: { persona: 'hoc_sinh', gender: 'nam', acc: ['balo', 'bang_ca_nhan'] },
  ba_ca_mau: { persona: 'co_chu', gender: 'nu', hairC: 'trang', color: 'nau', acc: ['khan_co', 'nep_nhan', 'hoa_tai'] },
  ngu_dan_phan_thiet: { persona: 'cong_nhan', gender: 'nam', skin: 'dam', hat: 'mu_tai_beo', outfit: 'ao_soc', acc: [] },
  chi_ban_me: { persona: 'van_phong', gender: 'nu', color: 'ca_phe', acc: ['kinh_ram', 'hoa_tai'] },
  chu_nam_tay_ninh: { persona: 'co_chu', gender: 'nam', skin: 'ngam', outfit: 'ba_ba', color: 'xanh_dam', acc: ['ria', 'khan_co'] },
  co_bay_nuoi_ga: { persona: 'co_chu', gender: 'nu', hat: 'non_la', hair: 'mai', color: 'xanh_la', acc: ['ga_con'] },
  cho_som: { persona: 'co_chu', gender: 'nu', hat: 'khan_hoa', hair: '', color: 'xanh_dam', acc: ['hoa_tai'] },
  ba_gac_trua: { persona: 'co_chu', gender: 'nam', hat: 'mu_luoi_trai', cap: 'do', outfit: 'ao_thun', color: 'vang_dat', acc: ['ria', 'khan_vai'] },
  ganh_toi: { persona: 'cong_nhan', gender: 'nam', hat: 'non_la', hair: 'mai', outfit: 'ao_thun', color: 'nau', acc: ['khan_co', 'don_ganh'] }
})

/** Khóa dáng theo kiểu khách + giới tính (cô chú nam → 'co_chu_nam'); kiểu lạ → học sinh. */
export function personaKey(persona, gender = null) {
  const k = persona === 'co_chu' && gender === 'nam' ? 'co_chu_nam' : persona
  return Object.prototype.hasOwnProperty.call(LOOKS, k) ? k : 'hoc_sinh'
}

/** Dáng đầy đủ của một người: kiểu khách → biến thể nữ → dáng riêng (who) → ghi đè trực tiếp (opts). Thuần. */
export function lookOf(persona, opts = {}) {
  const o = opts && typeof opts === 'object' ? opts : {}
  const who = typeof o.who === 'string' && Object.prototype.hasOwnProperty.call(WHO_LOOKS, o.who) ? WHO_LOOKS[o.who] : null
  const p = persona || (who && who.persona) || 'hoc_sinh'
  const g = o.gender || (who && who.gender) || null
  const key = personaKey(p, g)
  const base = LOOKS[key]
  const look = { ...base, acc: [...base.acc] }
  if (g === 'nu' && base.nu) Object.assign(look, base.nu, { acc: [...(base.nu.acc || base.acc)] })
  for (const src of [who, o]) {
    if (!src) continue
    for (const k of ['skin', 'hair', 'hairC', 'hat', 'cap', 'outfit', 'color']) if (typeof src[k] === 'string') look[k] = src[k]
    if (Array.isArray(src.acc)) look.acc = src.acc.filter(a => Object.prototype.hasOwnProperty.call(ACC, a))
  }
  if (look.hat === 'none') look.hat = ''
  delete look.nu
  look.key = key
  return look
}

function accLayer(look, layer) {
  return look.acc.map(a => (ACC[a] && ACC[a].layer === layer ? ACC[a].s(look) : '')).join('')
}

function hatSvg(look) {
  const h = HATS[look.hat]
  if (!h) return ''
  return h(CAP_COLORS[look.cap] || CAP_COLORS.xanh)
}

// Thân người (không khung svg), tọa độ khung bán thân 96 × 112. pose: { back, front } chuỗi vẽ thêm (tay).
function personBody(look, mood, pose = null) {
  const skin = SKIN[look.skin] || SKIN.vua
  const sk = mood === 'gian' ? [mix(skin[0], '#ff6a55', 0.3), mix(skin[1], '#e0473a', 0.3)] : skin
  const m = moodParts(mood)
  const hg = body => (body ? `<g transform="translate(0 ${HEAD_DY})">${body}</g>` : '')
  return hg(hairSvg(look, 'back')) + accLayer(look, 'back') + (pose && pose.back ? pose.back : '') +
    neckSvg(skin) + torsoSvg(look) + accLayer(look, 'body') +
    hg(ball(24.6, 46.4, 4.6, 5.8, sk, { shine: false }) + ball(71.4, 46.4, 4.6, 5.8, sk, { shine: false }) +
      `<path d="M24.6 43.8Q22.6 46.4 24.8 49M71.4 43.8Q73.4 46.4 71.2 49" fill="none" stroke="${sk[1]}" stroke-width="1.6"/>` +
      ball(48, 42, 24, 23, sk, { shine: false, k: 0.2 }) +
      m.under + hairSvg(look, 'front') + accLayer(look, 'hair') +
      `<path d="M47 50.6Q49.2 51.8 47.4 53.4" fill="none" stroke="${sk[1]}" stroke-width="1.8"/>` +
      m.eyes + m.mouth + hatSvg(look) + accLayer(look, 'face') + m.over) +
    (pose && pose.front ? pose.front : '') + accLayer(look, 'top')
}

const bustWrap = body => tidy(svg(body, PEOPLE_META.bust.vb))
const faceWrap = body => tidy(svg(`<g transform="${FACE_T}">${body}</g>`))

const cache = new Map()
function cached(k, make) {
  if (!cache.has(k)) {
    if (cache.size > 400) cache.clear()
    cache.set(k, make())
  }
  return cache.get(k)
}

const moodOk = m => (PEOPLE_MOODS.includes(m) || EXTRA_MOODS.includes(m) ? m : 'binh_thuong')
const OPT_KEYS = ['gender', 'who', 'skin', 'hair', 'hairC', 'hat', 'cap', 'outfit', 'color', 'acc']
const keyOf = (kind, persona, mood, o) => JSON.stringify([kind, persona, mood, ...OPT_KEYS.map(k => (o[k] === undefined ? '' : o[k]))])

/**
 * SVG khách bán thân (viewBox 0 0 96 112). persona: kiểu khách; mood: vui | binh_thuong | buc | gian (lạ → bình thường);
 * opts: { gender: 'nam' | 'nu', who: id khách quen / khách lạ / người bán (WHO_LOOKS), và ghi đè tùy chọn: skin, hair,
 * hairC, hat ('none' = bỏ mũ), cap, outfit, color, acc: [] (id phụ kiện lạ bị bỏ qua) }.
 */
export function bust(persona, mood, opts = {}) {
  const o = opts && typeof opts === 'object' ? opts : {}
  const md = moodOk(mood)
  return cached(keyOf('b', persona, md, o), () => bustWrap(personBody(lookOf(persona, o), md)))
}

/** Mặt tròn 64 (đầu + vai, cắt từ hình bán thân): thay face() cũ ở hàng chờ, thẻ khách, phiếu chấm. */
export function head(persona, mood, opts = {}) {
  const o = opts && typeof opts === 'object' ? opts : {}
  const md = moodOk(mood)
  return cached(keyOf('h', persona, md, o), () => faceWrap(personBody(lookOf(persona, o), md)))
}

function table(make) {
  const out = {}
  for (const k of PERSONA_KEYS) {
    out[k] = {}
    const [p, g] = k === 'co_chu_nam' ? ['co_chu', 'nam'] : [k, null]
    for (const m of PEOPLE_MOODS) out[k][m] = make(p, m, g ? { gender: g } : {})
  }
  return deepFreeze(out)
}

/** BUSTS[kiểu][tâm trạng]: bán thân 96 × 112 (kiểu mặc định). HEADS: mặt tròn 64 cùng bộ khóa với FACES cũ. */
export const BUSTS = table(bust)
export const HEADS = table(head)

// ---------- Dì Sáu, Anh Khoa, Cô Hạnh ----------

const DI_SAU_LOOK = { skin: 'vua', hair: '', hairC: 'bac', hat: 'khan_ran', outfit: 'ba_ba', color: 'nau_do', acc: ['tap_de'], key: 'di_sau' }

// Bàn tay (tọa độ cục bộ quanh tâm 0,0 rồi dời + xoay): nắm tay giơ một ngón (cái hoặc trỏ), bàn tay xòe.
const SK = SKIN.vua
const FINGER_UP = {
  cai: 'M-3.6 -6.6C-4.4 -12.4 -3.2 -17.6 0 -17.6C3.2 -17.6 3.8 -14.2 3.2 -10.8L2.8 -6.6Z',
  tro: 'M-1.6 -6C-2.4 -12 -2 -19 .6 -19.4C3.2 -19.8 3.8 -14 3.2 -6Z'
}
const fistUp = (finger, c = SK) => `<path d="${FINGER_UP[finger]}" fill="${c[0]}" stroke-width="2.4"/>` +
  `<path d="M-8 -3.4C-8 -7.6 -4.8 -8.6 0 -8.6C4.8 -8.6 8 -7.6 8 -3.4V3.4C8 7.4 4.8 9 0 9C-4.8 9 -8 7.4 -8 3.4Z" fill="${c[0]}" stroke-width="2.4"/>` +
  `<path d="M4 -8.4V8.6C6.4 8 8 6.2 8 3.4V-3.4C8 -6.2 6.6 -7.6 4 -8.4Z" fill="${c[1]}" stroke="none"/>` +
  `<path d="M-8 -.6H3.4M-8 3.6H3.4" fill="none" stroke="${c[1]}" stroke-width="1.6"/>`
const palm = `<path d="M-7.4 9C-9.4 3 -9.6 -5 -7.6 -10C-6 -14.6 6 -14.6 7.6 -10C9.6 -5 9.4 3 7.4 9C5.4 12 -5.4 12 -7.4 9Z" fill="${SK[0]}" stroke-width="2.4"/>` +
  `<path d="M4.6 -12C6.6 -6 6.6 3 4.2 9.6" fill="none" stroke="${SK[1]}" stroke-width="2.6"/>` +
  `<path d="M-2.6 -13.4V-5.6M2.4 -13.4V-5.6" fill="none" stroke="${SK[1]}" stroke-width="1.6"/>`
const handAt = (shape, x, y, rot = 0, flip = false) => `<g transform="translate(${x} ${y})${rot ? ` rotate(${rot})` : ''}${flip ? ' scale(-1 1)' : ''}">${shape}</g>`
const sleeve = (d, C) => tube(d, 11, C[0]) + `<path d="${d}" fill="none" stroke="${C[1]}" stroke-width="3.6" transform="translate(2.6 .6)"/>`

const DS_C = CLOTH.nau_do
const DI_SAU_POSE_LIST = {
  // Giơ ngón cái bên phải mặt (tự hào).
  ngon_cai: { mood: 'tu_hao', front: sleeve('M82 112C87 98 87 84 82.6 68', DS_C) + handAt(fistUp('cai'), 81.6, 62, 6) + sparkle(87.6, 42, 3.6) },
  // Vỗ tay trước ngực (vui), có vạch chuyển động.
  vo_tay: {
    mood: 'vui',
    front: sleeve('M14 112C20 106 30 102 40.6 99.6', DS_C) + sleeve('M82 112C76 106 66 102 55.4 99.6', DS_C) +
      handAt(palm, 44.4, 92.6, -10) + handAt(palm, 51.6, 92.6, 10, true) +
      B('M35.4 84.6L31 80.6M60.6 84.6L65 80.6M48 79.4V74.6', 2)
  },
  // Lau mồ hôi trên trán bằng khăn (lo).
  lau_mo_hoi: {
    mood: 'lo',
    front: sleeve('M84 112C90 96 86 74 72.6 54.4', DS_C) +
      `<path d="M58.4 32.8C64 29.8 72 30.8 76.6 35.8L73.6 47C69 42.4 62.6 41.8 57 43.8Z" fill="#f6f6f2" stroke-width="2.2"/>` +
      `<path d="M62 35L60.6 42M67 34.4L65.8 41.8" stroke="#4a8fd0" stroke-width="1.8"/>` +
      handAt(palm, 72, 43.8, -50) + drop(19.6, 32.4, 0.9) + drop(14.4, 44, 0.7)
  },
  // Che mặt (tiếc): hai bàn tay che mắt.
  che_mat: {
    mood: 'tiec',
    front: sleeve('M18 112C21 94 27 76 34.6 61', DS_C) + sleeve('M78 112C75 94 69 76 61.4 61', DS_C) +
      handAt(palm, 39, 48.6, 12) + handAt(palm, 57, 48.6, -12, true) + drop(26.4, 58.4, 0.8) + drop(69.6, 58.4, 0.8)
  }
}

export const DI_SAU_POSE_MOOD = deepFreeze(Object.fromEntries(Object.entries(DI_SAU_POSE_LIST).map(([k, v]) => [k, v.mood])))

/** Dì Sáu: 4 mặt tròn 64 (cùng khóa với DI_SAU cũ) và 4 tư thế bán thân 96 × 112. */
export const DI_SAU_FACES = deepFreeze(Object.fromEntries(['tu_hao', 'vui', 'lo', 'tiec'].map(m => [m, faceWrap(personBody(DI_SAU_LOOK, m))])))
export const DI_SAU_POSES = deepFreeze(Object.fromEntries(Object.entries(DI_SAU_POSE_LIST).map(([k, v]) => [k, bustWrap(personBody(DI_SAU_LOOK, v.mood, v))])))

const KHOA_LOOK = { skin: 'sang', hair: 'mai', hairC: 'den', hat: 'mu_luoi_trai', cap: 'xanh', outfit: 'ao_thun', color: 'xanh_luc', acc: [], key: 'anh_khoa' }
const KHOA_POINT = { front: sleeve('M84 112C88 100 87 86 82.4 74', CLOTH.xanh_luc) + handAt(fistUp('tro', SKIN.sang), 81, 70, 4) }
const CO_HANH_LOOK = { skin: 'sang', hair: 'bui', hairC: 'den', outfit: 'ao_dai', color: 'xanh_nhat', acc: ['kinh'], key: 'co_hanh' }

/** Anh Khoa (nón lưỡi trai xanh, áo thun xanh lá): vui, đang hướng dẫn (giơ ngón trỏ). Cô Hạnh (áo dài, kính): vui. */
export const ANH_KHOA_FACES = deepFreeze({ vui: faceWrap(personBody(KHOA_LOOK, 'vui')), huong_dan: faceWrap(personBody(KHOA_LOOK, 'huong_dan')) })
export const ANH_KHOA_BUSTS = deepFreeze({ vui: bustWrap(personBody(KHOA_LOOK, 'vui')), huong_dan: bustWrap(personBody(KHOA_LOOK, 'huong_dan', KHOA_POINT)) })
export const CO_HANH_FACES = deepFreeze({ vui: faceWrap(personBody(CO_HANH_LOOK, 'vui')) })
export const CO_HANH_BUSTS = deepFreeze({ vui: bustWrap(personBody(CO_HANH_LOOK, 'vui')) })
