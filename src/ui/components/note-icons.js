// Biểu tượng ghi chú món (M5, màn gọi món): mỗi ghi chú của công thức (src/data/recipes.js) là một hình nhỏ tự vẽ
// cùng phong cách viền mực, cel-shading 3 tông (src/ui/art/kit.js), kèm một dấu bổ nghĩa thống nhất:
//   khong  → vạch đỏ gạch chéo (Không hành, Không đá…)
//   it     → huy hiệu xanh trời mũi tên xuống (Ít đá, Ít đường…)
//   nhieu  → huy hiệu cam mũi tên lên (Nhiều đường, Ngọt đậm…)
//   them   → huy hiệu xanh lá dấu cộng (Thêm trứng…)
//   chin   → huy hiệu ngọn lửa (Chín kỹ)
// Chữ chỉ là phụ: hình luôn có aria-label / title tiếng Việt.
// Thuần ở cấp module (import trong Node được): chỉ noteIcon() mới tạo phần tử DOM.
import { INK, PAL, r1, deepFreeze, ball, tone3, hilite, dots } from '../art/kit.js'

const VB = 48
const BAD = '#d8392b'

// Bảng ghi chú: id ghi chú → hình nền (base), dấu bổ nghĩa (mod), nhãn tiếng Việt (trùng nhãn trong recipes.js).
export const NOTE_ICONS = deepFreeze({
  khong_hanh: { base: 'hanh', mod: 'khong', label: 'Không hành' },
  cay: { base: 'ot', mod: '', label: 'Cay' },
  long_dao: { base: 'trung_long_dao', mod: '', label: 'Lòng đào' },
  chin_ky: { base: 'trung_chin', mod: 'chin', label: 'Chín kỹ' },
  them_trung: { base: 'trung_ba', mod: 'them', label: 'Thêm trứng' },
  it_duong: { base: 'duong', mod: 'it', label: 'Ít đường' },
  nhieu_duong: { base: 'duong', mod: 'nhieu', label: 'Nhiều đường' },
  khong_da: { base: 'da', mod: 'khong', label: 'Không đá' },
  khong_cay: { base: 'ot_lat', mod: 'khong', label: 'Không cay' },
  cay_nhieu: { base: 'ot_doi', mod: 'nhieu', label: 'Cay nhiều' },
  khong_rau_ram: { base: 'rau_ram', mod: 'khong', label: 'Không rau răm' },
  them_trung_cut: { base: 'trung_cut', mod: 'them', label: 'Thêm trứng cút' },
  it_ngot: { base: 'sua', mod: 'it', label: 'Ít ngọt' },
  ngot_dam: { base: 'sua', mod: 'nhieu', label: 'Ngọt đậm' },
  it_da: { base: 'da', mod: 'it', label: 'Ít đá' },
  nhieu_cot_dua: { base: 'dua', mod: 'nhieu', label: 'Nhiều nước cốt dừa' }
})

// Nghĩa của dấu bổ nghĩa (đọc kèm cho trình đọc màn hình, màu chip).
export const NOTE_MODS = deepFreeze({
  khong: { label: 'bỏ', tone: 'bad' },
  it: { label: 'ít', tone: 'sky' },
  nhieu: { label: 'nhiều', tone: 'warm' },
  them: { label: 'thêm', tone: 'go' },
  chin: { label: 'chín kỹ', tone: 'warm' },
  '': { label: '', tone: 'plain' }
})

// ---------- Hình nền (viewBox 0 0 48 48) ----------

// Nét có viền mực: vẽ nét mực dày trước rồi nét màu mảnh hơn đè lên (cọng hành, cuống ớt).
function inkLine(d, color, w = 4.6, edge = 3) {
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${r1(w + edge)}"/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r1(w)}"/>`
}

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const P = p => `${r1(p[0])} ${r1(p[1])}`

// Bó hành lá: 3 cọng nghiêng, gốc trắng, rễ nhỏ.
function hanh() {
  const stalks = [
    [[13, 41], [29, 6], PAL.hanh[1]],
    [[16.5, 42], [38, 11], PAL.hanh[0]],
    [[20, 43], [43, 22], PAL.hanh[0]]
  ]
  let s = `<path d="M10 44.5 L8 47 M13.5 45.5 L13 48 M17 46 L18 48" fill="none" stroke-width="1.8"/>`
  for (const [a, b] of stalks) s += inkLine(`M${P(a)} L${P(b)}`, INK, 1, 7)
  for (const [a, b, c] of stalks) {
    const m = lerp(a, b, 0.3)
    s += `<path d="M${P(m)} L${P(b)}" fill="none" stroke="${c}" stroke-width="4.6"/>` +
      `<path d="M${P(a)} L${P(m)}" fill="none" stroke="${PAL.hanh_trang[0]}" stroke-width="4.6"/>`
  }
  const f = stalks[1]
  s += `<path d="M${P(lerp(f[0], f[1], 0.42))} L${P(lerp(f[0], f[1], 0.8))}" fill="none" stroke="${PAL.hanh[2]}" stroke-width="1.4" transform="translate(-1.2 -0.6)"/>`
  s += `<path d="M12 37 L23 39.5" fill="none" stroke="${BAD}" stroke-width="2.6"/>`
  return s
}

// Trái ớt đỏ nằm chéo, cuống xanh. dx, dy, rot: dời / xoay để vẽ cặp ớt.
const OT_BODY = 'M13 15 C20 11 28 15 32 23 C36 31 37.5 38 43 43 C35 46.5 25 42 19 34 C14.5 27.5 11 21 13 15Z'
const OT_SHADE = 'M14 23 C17 31 22 38 30 41.5 C35 43.3 39 43.4 43 43 C35 46.5 25 42 19 34 C16.5 30 14.6 26.5 14 23Z'
function ot(dx = 0, dy = 0, rot = 0, sc = 1) {
  const t = `translate(${r1(dx)} ${r1(dy)})` + (rot ? ` rotate(${r1(rot)} 26 28)` : '') + (sc !== 1 ? ` translate(26 28) scale(${sc}) translate(-26 -28)` : '')
  return `<g transform="${t}">` +
    tone3({ outline: OT_BODY, base: PAL.do[0], dark: PAL.do[1], shade: OT_SHADE,
      shine: '<path d="M18.5 16.5 C23.5 16 27.5 19.5 29.8 24.5" fill="none" stroke="#fff" stroke-width="2.4" opacity=".6"/>' }) +
    `<path d="M8.5 15.5 C9.5 10 16 9 19.5 13 C18 17.5 12 19.5 8.5 15.5Z" fill="${PAL.la[0]}"/>` +
    inkLine('M13 11 C12.5 7 14.5 4.5 18.5 3.5', PAL.la[1], 1.8, 3) +
    `</g>`
}

// Quả trứng gà (nâu nhạt) ở (cx, cy).
function egg(cx, cy, rx, ry, c = PAL.vo_ga) {
  return ball(cx, cy, rx, ry, c, { k: 0.3 })
}

// Trứng ốp la: lòng trắng loang, lòng đỏ; kind 'long_dao' (lòng đỏ chảy) | 'chin' (mép cháy vàng nâu, lòng đỏ đặc).
const OP_WHITE = 'M7 27 C5 17 15 10 23.5 12.5 C31 8.5 42.5 13.5 40.5 23.5 C44.5 31.5 37 40.5 27 38.5 C17.5 42.5 8.5 36.5 7 27Z'
function opLa(kind) {
  const white = kind === 'chin' ? '#fff4dc' : PAL.trung[0]
  let s = `<path d="${OP_WHITE}" fill="${white}" stroke="none"/>`
  if (kind === 'chin') {
    // mép chiên giòn vàng nâu (vệt dày bám trong viền)
    s += `<path d="${OP_WHITE}" fill="none" stroke="#c98a40" stroke-width="5.5" opacity=".9"/>` +
      `<path d="${OP_WHITE}" fill="none" stroke="#9a5f32" stroke-width="2" stroke-dasharray="3 4" opacity=".7"/>`
  } else {
    s += `<path d="M37 30 C35 36 30 38.5 25 37.8 C31 36.5 34.5 33.5 36 28.5Z" fill="${PAL.trung[1]}" stroke="none"/>`
  }
  s += hilite(15, 20, 4.5, 2.6, 0.7, -30)
  s += `<path d="${OP_WHITE}" fill="none"/>`
  if (kind === 'long_dao') {
    // lòng đỏ căng bóng, một giọt chảy xuống mép
    s += `<path d="M17.5 22 C17.5 17.6 20.8 15 24.8 15 C28.8 15 32 17.6 32 22 C32 25.4 30.2 27.7 28.6 28.6 C28.9 30.6 30 33.3 29.6 35.3 C29.2 37.4 27.2 38.2 26 37.2 C25 36.4 25.2 34.8 25.7 33.2 C26.1 31.8 26.1 30.3 25.5 29.4 C21 29.4 17.5 26.4 17.5 22Z" fill="var(--yolk,#f6b21a)"/>` +
      `<path d="M24 27.8 C27.4 27.8 30 26 31.2 22.6 C31.6 25.6 30.2 27.7 28.6 28.6 C28.9 30.6 30 33.3 29.6 35.3 C29.1 33.6 28.3 30.6 26.6 28.9 C25.8 28.5 25 28.2 24 27.8Z" fill="#e08c00" stroke="none"/>` +
      hilite(22, 19.5, 2.8, 1.8, 0.75, -30) +
      `<path d="M17.5 22 C17.5 17.6 20.8 15 24.8 15 C28.8 15 32 17.6 32 22 C32 25.4 30.2 27.7 28.6 28.6 C28.9 30.6 30 33.3 29.6 35.3 C29.2 37.4 27.2 38.2 26 37.2 C25 36.4 25.2 34.8 25.7 33.2 C26.1 31.8 26.1 30.3 25.5 29.4 C21 29.4 17.5 26.4 17.5 22Z" fill="none"/>`
  } else {
    // lòng đỏ chín đặc: màu nhạt hơn, có màng trắng mờ
    s += ball(24.5, 23.5, 6.8, 6.3, ['#f4c34a', '#d9962a', '#fff2bd'], { k: 0.3, shine: false })
    s += `<ellipse cx="22.6" cy="21.6" rx="3.6" ry="2.4" fill="#fff" opacity=".45" stroke="none"/>`
  }
  return s
}

// Muỗng đường: muỗng bạc nằm nghiêng, cán gỗ chĩa xuống trái, đường trắng vun thành ngọn cao hơn miệng muỗng, hạt
// tinh thể lấp lánh và vài hạt rơi (khác hẳn viên đá: không phải khối vuông, không xanh, có cán muỗng).
function duong() {
  const rim = 'M13.5 25 C13.5 20.3 20.3 17 29 17 C37.7 17 44.5 20.3 44.5 25 C44.5 29.7 37.7 33 29 33 C20.3 33 13.5 29.7 13.5 25Z'
  const mound = 'M14.6 24.6 C15.5 17.5 21 7.8 28.6 6.8 C36.4 7.6 42.3 17 43.4 24.4 C38 28.6 20.5 28.8 14.6 24.6Z'
  return '<g transform="rotate(-16 29 25)">' +
    inkLine('M14.6 27 L1.8 33.2', '#c98a40', 5, 3) +
    '<path d="M12.6 26.9 L4 31.1" fill="none" stroke="#efc68a" stroke-width="1.4"/>' +
    tone3({ outline: rim, base: '#dfe7ef', dark: '#a9b7c6',
      shade: 'M13.5 25 C13.5 29.7 20.3 33 29 33 C37.7 33 44.5 29.7 44.5 25 C42.5 28.4 36.5 30.4 29 30.4 C21.5 30.4 15.5 28.4 13.5 25Z' }) +
    tone3({ outline: mound, base: '#ffffff', dark: '#ebe2d1',
      shade: 'M31.5 8.2 C37.4 10.6 42.4 17.6 43.4 24.4 C40.6 26.6 35.4 27.8 30 28.2 C34.6 22.6 34.8 14.6 31.5 8.2Z',
      shine: hilite(23.2, 14.5, 2.4, 4.4, 0.9, 20) }) +
    dots([[21, 22.4, 1.1], [27.2, 19.6, 1.1], [32.2, 15.2, 1], [36.6, 21.4, 1.1], [26, 11.4, 0.9], [30.4, 24.6, 1]], '#bfae8e') +
    '</g>' +
    // tinh thể 4 cánh lấp lánh + hạt đường rơi
    '<path d="M38.5 1.2 L39.6 4.6 L43 5.7 L39.6 6.8 L38.5 10.2 L37.4 6.8 L34 5.7 L37.4 4.6Z" fill="#ffe680" stroke-width="1.4"/>' +
    '<path d="M11 8.5 L13 10.5 L11 12.5 L9 10.5Z M6.2 15.2 L7.8 16.8 L6.2 18.4 L4.6 16.8Z" fill="#fff" stroke-width="1.3"/>'
}

// Viên đá lạnh: khối bo tròn xanh nhạt, vệt sáng trong.
function da() {
  const body = 'M10 18 C10 13.5 13 11 17.5 10.5 L32 9 C36.5 8.6 39.5 11 39.8 15.5 L40.8 31 C41.1 35.5 38.5 38.3 34 38.8 L19 40.3 C14.5 40.7 11.2 38 11 33.5Z'
  return tone3({ outline: body, base: PAL.da_lanh[0], dark: PAL.da_lanh[1],
    shade: 'M40.8 31 C41.1 35.5 38.5 38.3 34 38.8 L19 40.3 C14.5 40.7 11.2 38 11 33.5 L10.9 30.5 C16 33.5 26 34 34 30.5 C37 29 39.5 26.5 40.3 23.5Z',
    shine: '<path d="M15 15.5 L23 14.8 M15.5 20 L15.8 27" fill="none" stroke="#fff" stroke-width="2.6" opacity=".85"/>' +
      '<path d="M30.5 13.5 L34.5 13.2" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>' })
}

// Rau răm: ba lá nhọn có đốm tía, cuống tía.
function rauRam() {
  const leaf = (d, sh) => tone3({ outline: d, base: PAL.la[0], dark: PAL.la[1], shade: sh })
  return inkLine('M23 46 C24 36 25 26 27 12', '#9c3d6a', 2.2, 3) +
    leaf('M24.5 27 C17 27 9.5 22.5 5.5 15.5 C13.5 14.5 21.5 18.5 24.5 27Z', 'M24.5 27 C17 27 9.5 22.5 5.5 15.5 C12 20 18 23.5 24.5 27Z') +
    leaf('M25.5 21 C30 13 36.5 8.5 44 7 C42 15 34.5 20.5 25.5 21Z', 'M25.5 21 C33 19 39.5 13.5 44 7 C42 15 34.5 20.5 25.5 21Z') +
    leaf('M24 36 C30.5 30.5 37.5 28.5 44.5 30 C39.5 36.5 31.5 38.5 24 36Z', 'M24 36 C31 36.5 38.5 34 44.5 30 C39.5 36.5 31.5 38.5 24 36Z') +
    dots([[15, 20.5, 1.6], [34, 15.5, 1.5], [35, 33, 1.5]], '#8e3a6a', 1.5)
}

// Trứng cút: trứng nhỏ màu kem, đốm nâu.
function trungCut(cx = 22, cy = 25, sc = 1) {
  return ball(cx, cy, 11 * sc, 14 * sc, ['#f3e6c4', '#d8c494', '#fffaf0'], { k: 0.3 }) +
    dots([[cx - 4 * sc, cy - 5 * sc, 2], [cx + 3 * sc, cy - 1 * sc, 2.4], [cx - 3 * sc, cy + 5 * sc, 1.8], [cx + 5 * sc, cy + 7 * sc, 1.5], [cx + 1 * sc, cy - 9 * sc, 1.3]].map(([x, y, r]) => [x, y, r * sc]), '#8a5a3a', 1.6)
}

// Lon sữa đặc: thân lon, nhãn xanh, nắp bạc, giọt sữa trắng.
function sua() {
  const can = 'M11 15 L11 39 C11 43 18 45 24 45 C30 45 37 43 37 39 L37 15Z'
  return tone3({ outline: can, base: '#f6f1e3', dark: '#d9cfb8',
    shade: 'M30 15 L37 15 L37 39 C37 43 30 45 24 45 C28 42 30 38 30 32Z',
    detail: `<path d="M11 22 L37 22 L37 33 L11 33Z" fill="${PAL.xanh_nhan[0]}" stroke-width="2"/>` +
      `<path d="M15 27.5 C18 25 21 30 24 27.5 C27 25 30 30 33 27.5" fill="none" stroke="#fff" stroke-width="2"/>` }) +
    `<ellipse cx="24" cy="15" rx="13" ry="4.5" fill="#e4eaf1"/>` +
    `<ellipse cx="22" cy="14.2" rx="6" ry="1.6" fill="#fff" opacity=".7" stroke="none"/>` +
    `<path d="M30 5 C30 5 34.5 10 34.5 12.6 C34.5 15 32.5 16.5 30 16.5 C27.5 16.5 25.5 15 25.5 12.6 C25.5 10 30 5 30 5Z" fill="#fffaf0" stroke-width="2.2"/>`
}

// Nửa trái dừa: vỏ nâu, cơm trắng, giọt nước cốt.
function dua() {
  const shell = 'M5 22 C5 34 13 42 24 42 C35 42 43 34 43 22Z'
  return tone3({ outline: shell, base: '#9a5f32', dark: '#74431f',
    shade: 'M33 22 L43 22 C43 34 35 42 24 42 C31 38 33 30 33 22Z',
    detail: '<path d="M10 30 C13 33 16 35 20 36 M26 37 C30 36.5 33 35 36 32" fill="none" stroke="#c98d58" stroke-width="1.6"/>' }) +
    `<ellipse cx="24" cy="22" rx="19" ry="6" fill="#fffdf6"/>` +
    `<ellipse cx="24" cy="22.3" rx="13" ry="3.4" fill="#f2ead6" stroke="none"/>` +
    `<path d="M24 3 C24 3 29 9 29 12 C29 14.8 26.8 16.5 24 16.5 C21.2 16.5 19 14.8 19 12 C19 9 24 3 24 3Z" fill="#fffaf0" stroke-width="2.2"/>` +
    hilite(22, 10.5, 1.6, 2.4, 0.9)
}

// Ghi chú lạ (dữ liệu tương lai): mẩu giấy ghi chú có bút chì.
function giay() {
  return `<path d="M9 7 L33 7 L39 13 L39 41 L9 41Z" fill="${PAL.giay[0]}"/>` +
    `<path d="M33 7 L33 13 L39 13" fill="${PAL.giay[1]}" stroke-width="2"/>` +
    `<path d="M14 18 L32 18 M14 24 L32 24 M14 30 L26 30" fill="none" stroke="#c9a876" stroke-width="2"/>` +
    `<path d="M27 40 L41 26 L45 30 L31 44 L26 45Z" fill="${PAL.mam[0]}" stroke-width="2.4"/>`
}

const BASES = {
  hanh,
  ot: () => ot(),
  // ớt lật ngang (nằm chéo ngược) để vạch gạch chéo cắt ngang trái ớt, không trùng dọc thân
  ot_lat: () => `<g transform="matrix(-1 0 0 1 48 0)">${ot()}</g>`,
  ot_doi: () => ot(-5, -4, -12, 0.82) + ot(6, 4, 8, 0.82),
  trung_long_dao: () => opLa('long_dao'),
  trung_chin: () => opLa('chin'),
  trung_ba: () => egg(14, 22, 9, 11.5) + egg(33, 22, 9, 11.5) + egg(23.5, 31, 10, 12.5),
  duong,
  da,
  rau_ram: rauRam,
  trung_cut: () => trungCut(),
  sua,
  dua,
  giay
}

// ---------- Dấu bổ nghĩa ----------

function badge(fill, glyph) {
  return `<circle cx="37" cy="37" r="10" fill="${fill}" stroke-width="2.6"/>` +
    `<path d="M30.5 33.5 A7.5 7.5 0 0 1 37.5 29.5" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>` + glyph
}
const W = (d, w = 3.2) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}"/>`
const MODS = {
  khong: () =>
    `<path d="M9 9 L39 39" fill="none" stroke="#fffaf0" stroke-width="12" opacity=".6"/>` +
    `<path d="M9 9 L39 39" fill="none" stroke="${INK}" stroke-width="8.6"/>` +
    `<path d="M9 9 L39 39" fill="none" stroke="${BAD}" stroke-width="4.8"/>` +
    `<path d="M11.5 10.2 L22 20.7" fill="none" stroke="#ff9b8c" stroke-width="1.6"/>`,
  it: () => badge('#4aa3df', W('M37 31.5 L37 42.5 M32 37.8 L37 42.5 L42 37.8')),
  nhieu: () => badge('#f28a1e', W('M37 42.5 L37 31.5 M32 36.2 L37 31.5 L42 36.2')),
  them: () => badge('#43a63d', W('M37 31.5 L37 42.5 M31.5 37 L42.5 37', 3.4)),
  chin: () => badge('#f7b928',
    '<path d="M37 30 C40.5 33.5 42.5 36 42 39.5 C41.6 42.5 39.4 44.3 37 44.3 C34.6 44.3 32.4 42.5 32 39.5 C31.7 37 33 35.3 34.4 34 C34.6 35.8 35.4 36.8 36.4 37.2 C36 34.8 36.2 32.2 37 30Z" fill="#e8483a" stroke-width="1.8"/>' +
    '<path d="M37 37 C38.8 38.6 39.4 40 39.1 41.3 C38.8 42.5 38 43.1 37 43.1 C36 43.1 35.1 42.5 34.9 41.3 C34.7 40 35.6 38.6 37 37Z" fill="#ffe27a" stroke="none"/>')
}

/** Thông tin ghi chú: { id, base, mod, label, known }. Ghi chú lạ → hình mẩu giấy, nhãn từ dữ liệu hoặc từ id. */
export function noteMeta(noteId, recipe = null) {
  const id = String(noteId || '')
  const m = NOTE_ICONS[id]
  const label = noteLabel(id, recipe)
  if (m) return { id, base: m.base, mod: m.mod, label, known: true }
  return { id, base: 'giay', mod: '', label, known: false }
}

/** Nhãn tiếng Việt: ưu tiên nhãn trong công thức (recipe.notes), rồi bảng NOTE_ICONS, cuối cùng là id viết thường có dấu cách. */
export function noteLabel(noteId, recipe = null) {
  const id = String(noteId || '')
  const n = recipe && Array.isArray(recipe.notes) ? recipe.notes.find(x => x && x.id === id) : null
  if (n && n.label) return n.label
  if (NOTE_ICONS[id]) return NOTE_ICONS[id].label
  const t = id.replace(/_/g, ' ').trim()
  return t ? t[0].toUpperCase() + t.slice(1) : 'Ghi chú'
}

/** Chuỗi SVG (viewBox 0 0 48 48) của ghi chú: hình nền (thu nhỏ khi có dấu bổ nghĩa) + dấu bổ nghĩa vẽ sau cùng. */
export function noteIconSvg(noteId) {
  const m = noteMeta(noteId)
  const body = (BASES[m.base] || BASES.giay)()
  const fit = m.mod === 'khong' ? 'translate(24 24) scale(.9) translate(-24 -24)'
    : m.mod ? 'translate(2 1) scale(.86)' : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}">` +
    `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">` +
    (fit ? `<g transform="${fit}">${body}</g>` : body) +
    (MODS[m.mod] ? MODS[m.mod]() : '') +
    `</g></svg>`
}

/** Tông màu chip theo dấu bổ nghĩa: 'bad' | 'sky' | 'warm' | 'go' | 'plain'. */
export function noteTone(noteId) {
  const m = NOTE_ICONS[String(noteId || '')]
  return (m && NOTE_MODS[m.mod] && NOTE_MODS[m.mod].tone) || 'plain'
}

/**
 * Phần tử hình ghi chú: <span class="co-note-ico" role="img" aria-label="Không hành" title="Không hành">SVG</span>.
 * opts: { recipe (lấy nhãn), label (ghi đè nhãn), size (px, đặt width/height), className,
 *   decorative (true khi đã có chữ nhãn đứng cạnh: aria-hidden, không đọc lặp) }.
 */
export function noteIcon(noteId, { recipe = null, label = '', size = 0, className = '', decorative = false } = {}) {
  const el = document.createElement('span')
  const text = label || noteLabel(noteId, recipe)
  el.className = 'co-note-ico' + (className ? ' ' + className : '')
  if (decorative) el.setAttribute('aria-hidden', 'true')
  else {
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', text)
    el.title = text
  }
  el.dataset.note = String(noteId || '')
  el.dataset.tone = noteTone(noteId)
  if (size) { el.style.width = `${size}px`; el.style.height = `${size}px` }
  el.innerHTML = noteIconSvg(noteId)
  return el
}

/** Mọi id ghi chú xuất hiện trong bảng công thức (không trùng, theo thứ tự gặp). */
export function noteIdsOf(recipes) {
  const out = []
  for (const r of Object.values(recipes || {})) {
    for (const n of (r && r.notes) || []) if (n && n.id && !out.includes(n.id)) out.push(n.id)
  }
  return out
}
