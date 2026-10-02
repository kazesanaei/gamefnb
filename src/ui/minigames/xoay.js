// XOAY — khuấy / trộn / đánh bông (M5, gói Pha trộn E3). Tô (ly, chén) TO nhìn từ trên xuống, là nhân vật chính giữa
// cảnh: lòng tô chứa hỗn hợp (màu đầu + các thứ còn tách riêng); vẽ vòng quanh tâm, chiều nào cũng được. Hỗn hợp xoay theo
// ngón (các thứ bên trong trôi theo vòng khuấy), màu hòa dần theo số vòng (lớp phủ đổi opacity: phần "còn tách" mờ dần,
// phần "đã hòa" hiện dần; chén sữa muối bông dần lên). Vệt xoáy mờ bám theo ngón, muỗng (phới) đi theo ngón; vành tô có
// 2·K khấc sáng dần theo từng nửa vòng, mỗi nửa vòng một tiếng muỗng chạm thành tô (âm stir). Mũi tên vòng chạy quanh lòng
// tô làm gợi ý tới khi quay được nửa vòng đầu. Đủ vòng thì tự xong.
// Quay quá nhanh (> 2,2 × mul vòng/giây, gấp 1,8 lần nếu params.fast) liên tục quá 0,25 s thì sánh ra ngoài (−12 điểm mỗi
// lần): giọt bắn ra mép tô, tô rung 3px, vệt bẩn đọng trên mặt quầy (giảm chuyển động: không giọt, không rung — chớp viền đỏ
// tĩnh). Chấm: scoreXoay (core/minigame-scoring.js): 100 · min(1, vòng/K) − 12 mỗi lần sánh − 10 nếu nhịp các vòng không đều
// (cv > 0,45 · mul) − 15 nếu quá mốc overtimeAt('xoay') = max(2 × par, sàn giờ minLimitSec 1,4 × vòng + 1 của lõi); nấu thử
// (ctx.untimed, par = Infinity) không phạt quá giờ.
// Hợp đồng e2e (giữ từ bản tạm gói A): xoay-bowl (tâm và bán kính lấy bằng boundingBox; tâm khuấy = tâm hộp); xoay-progress
// [data-v = số vòng, làm tròn XUỐNG 2 chữ số (data-v = data-n nghĩa là đã đủ vòng), data-n = mục tiêu]; xoay-speed
// [data-v = vòng/giây, data-max]. Lớp vỏ (step.skin): to | ly | chen → lớp gốc .mg-xoay.skin-<id>, stage[data-skin].
// Cách giải tự động: nhấn ở (tâm + 0,32·cạnh, tâm) của xoay-bowl rồi vẽ 24 điểm mỗi vòng quanh tâm, ~1 vòng/giây (chờ ~12 ms
// giữa các điểm), đủ data-n vòng (+0,3) thì tự xong.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreXoay } from '../../core/minigame-scoring.js'
import { createClock, frameLoop, settleOnce, feedback, vfxOf, reducedOf, frameSteps, uiRand, hashKey } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2, PROP_META } from '../art/v2.js'
import { svg as artSvg } from '../art/kit.js'
import { createTurnCounter, createSpillMeter, gestureLimitSec } from './_gesture.js'

export const XOAY_MAX_SPEED = 2.2      // vòng/giây (× mul; × 1,8 khi đánh bông nhanh)
export const XOAY_FAST_MUL = 1.8
export const XOAY_MAX_SIDE = 300       // cạnh tô tối đa (px)
export const XOAY_MIN_SIDE = 110
const SPLAT_MAX = 4
const TAU = Math.PI * 2

// Ly nhựa nhìn từ trên xuống (khung vuông 240 như tô/chén): vành nhựa trong, thành trong xanh nhạt, đọng hơi lạnh; lòng ly
// (bán kính 101) để hỗn hợp CSS phủ lên. Tự vẽ (bộ đạo cụ chỉ có ly nhìn ngang).
const LY_TOP = artSvg(
  '<circle cx="126" cy="127" r="111" fill="#3a2618" opacity=".15" stroke="none"/>' +
  '<circle cx="120" cy="120" r="110" fill="#eef8fc"/>' +
  '<circle cx="120" cy="120" r="104" fill="none" stroke="#cfe3ee" stroke-width="5"/>' +
  '<circle cx="120" cy="120" r="101" fill="#cfe8f3" stroke="none"/>' +
  '<path d="M27.8 79.4A101 101 0 0 1 60.6 38.3" fill="none" stroke="#fff" stroke-width="6" opacity=".85"/>' +
  '<path d="M206 155.5A94 94 0 0 1 183 190" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>' +
  '<circle cx="197" cy="78" r="3" fill="#fff" stroke="#8fb5c9" stroke-width="1.4"/>' +
  '<circle cx="44" cy="171" r="2.4" fill="#fff" stroke="#8fb5c9" stroke-width="1.4"/>' +
  '<circle cx="166" cy="208" r="2.2" fill="#fff" stroke="#8fb5c9" stroke-width="1.4"/>' +
  '<circle cx="120" cy="120" r="110" fill="none"/>' +
  '<circle cx="120" cy="120" r="101" fill="none" stroke-width="2"/>',
  [240, 240])
const LY_TOP_META = Object.freeze({ vb: [240, 240], center: [120, 120], r: 97, rim: 110, inner: 101 })

// Dụng cụ khuấy (khung 40 × 120, đầu chạm ở (20, 116) — chỗ ngón tay).
const TOOLS = Object.freeze({
  muong_go: artSvg(
    '<rect x="16" y="3" width="8" height="80" rx="4" fill="#e2a766"/>' +
    '<path d="M21 8V78" fill="none" stroke="#bf8248" stroke-width="2" opacity=".7"/>' +
    '<ellipse cx="20" cy="98" rx="12.5" ry="17" fill="#e2a766"/>' +
    '<ellipse cx="20.5" cy="99" rx="7.5" ry="11.5" fill="#bf8248" stroke="none"/>' +
    '<path d="M14 92Q15 86 18 84" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>', [40, 120]),
  muong_inox: artSvg(
    '<rect x="17.5" y="2" width="5" height="90" rx="2.5" fill="#e4eaf1"/>' +
    '<ellipse cx="20" cy="103" rx="9.5" ry="12.5" fill="#e4eaf1"/>' +
    '<ellipse cx="20.5" cy="104" rx="5.5" ry="8" fill="#aebbc9" stroke="none"/>' +
    '<path d="M19 8V84" fill="none" stroke="#fff" stroke-width="1.6" opacity=".8"/>', [40, 120]),
  phoi: artSvg(
    '<ellipse cx="20" cy="80" rx="15" ry="36" fill="none" stroke-width="5"/>' +
    '<ellipse cx="20" cy="80" rx="15" ry="36" fill="none" stroke="#c9d3de" stroke-width="2.4"/>' +
    '<ellipse cx="20" cy="80" rx="7" ry="36" fill="none" stroke-width="5"/>' +
    '<ellipse cx="20" cy="80" rx="7" ry="36" fill="none" stroke="#e4eaf1" stroke-width="2.4"/>' +
    '<rect x="14" y="36" width="12" height="12" rx="3" fill="#c9d3de"/>' +
    '<rect x="15" y="2" width="10" height="36" rx="5" fill="#e2a766"/>' +
    '<path d="M18 7V32" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>', [40, 120])
})

// Mũi tên vòng (gợi ý cử chỉ): cung 270° có đầu mũi tên và chấm "ngón tay" ở đầu; quay quanh tâm bằng CSS.
const HINT_RING = '<svg viewBox="-50 -50 100 100" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M16.5 -28.6A33 33 0 1 1 -28.6 -16.5" stroke="#3a2618" stroke-width="6" opacity=".75"/>' +
  '<path d="M16.5 -28.6A33 33 0 1 1 -28.6 -16.5" stroke="#fffaf0" stroke-width="3"/>' +
  '<path d="M-37 -25.5L-28.6 -16.5L-18 -23.5" stroke="#3a2618" stroke-width="6" opacity=".75"/>' +
  '<path d="M-37 -25.5L-28.6 -16.5L-18 -23.5" stroke="#fffaf0" stroke-width="3"/>' +
  '<circle cx="16.5" cy="-28.6" r="5.2" fill="#ffd23f" stroke="#3a2618" stroke-width="2.2"/></g></svg>'

// Màu và dụng cụ theo lớp vỏ. base: màu nền hỗn hợp; blend: lớp phủ "đã hòa" (opacity tới blendMax); swirl: màu vệt xoáy;
// drops: màu giọt bắn khi sánh.
const SKIN_LOOK = Object.freeze({
  to: Object.freeze({ prop: 'to_lon', tool: 'muong_go', base: '#f1dfae', blend: '#e8923e', blendMax: 0.5,
    swirl: '#b8732e', drops: Object.freeze(['#e8923e', '#f1dfae', '#d8452b']) }),
  ly: Object.freeze({ prop: null, tool: 'muong_inox', base: '#4b2c1b', blend: '#b07a4f', blendMax: 0.9,
    swirl: '#f6e2c4', drops: Object.freeze(['#6b4026', '#b07a4f']) }),
  chen: Object.freeze({ prop: 'chen_lon', tool: 'phoi', base: '#eadcbf', blend: '#fffaf0', blendMax: 0.92,
    swirl: '#a87a45', drops: Object.freeze(['#fffaf0', '#eadcbf']) })
})

/** Hình học tô theo lớp vỏ (phần của cạnh khung vuông): { cx, cy, r (mặt hỗn hợp), ring (bán kính khấc tiến độ) }. */
export function bowlGeometry(skinId) {
  const look = SKIN_LOOK[skinId] || SKIN_LOOK.to
  const m = (look.prop && PROP_META[look.prop]) || LY_TOP_META
  const W = m.vb[0]
  const rim = Number(m.rim) || W * 0.45
  return {
    cx: m.center[0] / W, cy: m.center[1] / m.vb[1],
    r: (Number(m.r) || W * 0.38) / W,
    ring: Math.min(0.49, (rim + W / 2) / 2 / W)
  }
}

/** 2·K khấc quanh vành (mỗi khấc nửa vòng), khung -50..50: mảng chuỗi path cung, khe 5°, bắt đầu từ đỉnh. */
export function ringSegments(K, radius = 47) {
  const n = Math.max(1, Math.floor(Number(K) || 1)) * 2
  const gap = Math.min(5, 180 / n)
  const out = []
  for (let i = 0; i < n; i++) {
    const a0 = -90 + (360 / n) * i + gap / 2
    const a1 = -90 + (360 / n) * (i + 1) - gap / 2
    const p = a => [Math.round(radius * Math.cos(a * Math.PI / 180) * 10) / 10, Math.round(radius * Math.sin(a * Math.PI / 180) * 10) / 10]
    const [x0, y0] = p(a0), [x1, y1] = p(a1)
    out.push(`M${x0} ${y0}A${radius} ${radius} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`)
  }
  return out
}

// ---- Hình bên trong lòng tô (khung 0..100, tâm (50, 50), bán kính 50), dựng tất định theo bước ----

const f1 = v => Math.round(v * 10) / 10
// Điểm ngẫu nhiên trong hình tròn bán kính rMax quanh (cx, cy).
function inDisc(rand, rMax, cx = 50, cy = 50) {
  const a = rand() * TAU, d = Math.sqrt(rand()) * rMax
  return [cx + Math.cos(a) * d, cy + Math.sin(a) * d]
}
const strand = (x, y, a, len, col, w) => {
  const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2
  return `<path d="M${f1(x - dx)} ${f1(y - dy)}Q${f1(x + dy * 0.5)} ${f1(y - dx * 0.5)} ${f1(x + dx)} ${f1(y + dy)}" stroke="${col}" stroke-width="${w}"/>`
}
const blob = (x, y, r, fill, ink = 0.9) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${fill}" stroke="#3a2618" stroke-width="${ink}"/>`
const egg = (x, y, s) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(4.6 * s)}" ry="${f1(3.8 * s)}" fill="#fffaf0" stroke="#3a2618" stroke-width=".9"/>` +
  `<circle cx="${f1(x + 0.4)}" cy="${f1(y + 0.2)}" r="${f1(2 * s)}" fill="#f6b21a" stroke="none"/>`
const leaf = (x, y, a) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="3.2" ry="1.6" transform="rotate(${Math.round(a)} ${f1(x)} ${f1(y)})" fill="#5fae42" stroke="#3a2618" stroke-width=".7"/>`
const cube = (x, y, s, a) => `<rect x="${f1(x - s / 2)}" y="${f1(y - s / 2)}" width="${f1(s)}" height="${f1(s)}" rx="${f1(s * 0.24)}" transform="rotate(${Math.round(a)} ${f1(x)} ${f1(y)})" fill="#eaf7fd" fill-opacity=".86" stroke="#3a2618" stroke-width="1.3"/>` +
  `<path d="M${f1(x - s * 0.28)} ${f1(y - s * 0.12)}L${f1(x - s * 0.1)} ${f1(y - s * 0.3)}" transform="rotate(${Math.round(a)} ${f1(x)} ${f1(y)})" stroke="#fff" stroke-width="1.6"/>`
const wrap = body => `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`

/**
 * Các lớp hình trong lòng tô (thuần, tất định theo seed): { under, clump, spread, foam } — chuỗi SVG khung 0..100.
 * under: nền xoay theo (sợi bánh tráng, hạt muối); clump: các thứ còn tách riêng (mờ dần); spread: các thứ đã trộn đều
 * (hiện dần); foam: bọt sữa (chén, phóng to dần). Chuỗi rỗng: lớp đó không có.
 */
export function mixLayers(skinId, seed = 1) {
  const rand = uiRand(seed)
  let under = '', clump = '', spread = '', foam = ''
  if (skinId === 'ly') {
    // cà phê: sữa đặc còn cuộn thành vệt kem; khuấy đều thì chỉ còn bọt li ti viền mép; 3 viên đá nổi trôi theo vòng khuấy
    clump = '<path d="M50 50C50 41 62 40 64 49C67 61 49 68 39 60C27 50 36 31 52 28C70 25 82 42 77 58" stroke="#3a2618" stroke-width="10" opacity=".22"/>' +
      '<path d="M50 50C50 41 62 40 64 49C67 61 49 68 39 60C27 50 36 31 52 28C70 25 82 42 77 58" stroke="#f3e2c2" stroke-width="7"/>' +
      '<path d="M41 34C46 30 54 29 59 31" stroke="#fffaf0" stroke-width="2.2" opacity=".8"/>'
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + rand() * 0.2, d = 42 + rand() * 5
      spread += blob(50 + Math.cos(a) * d, 50 + Math.sin(a) * d, 0.8 + rand() * 1.3, '#e9c9a0', 0)
    }
    under = cube(37, 40, 15, 12) + cube(62, 61, 14, -20) + cube(40, 66, 12, 30)
    return { under: '', clump: wrap(clump), spread: wrap(spread), ice: wrap(under), foam: '' }
  }
  if (skinId === 'chen') {
    for (let i = 0; i < 16; i++) {
      const [x, y] = inDisc(rand, 40)
      under += `<rect x="${f1(x)}" y="${f1(y)}" width="1.8" height="1.8" rx=".4" transform="rotate(${Math.round(rand() * 90)} ${f1(x + 0.9)} ${f1(y + 0.9)})" fill="#fff" stroke="#3a2618" stroke-width=".35"/>`
    }
    clump = '<circle cx="50" cy="50" r="22" stroke="#fffaf0" stroke-width="1.6" opacity=".8"/>' +
      '<circle cx="50" cy="50" r="34" stroke="#fffaf0" stroke-width="1.4" opacity=".6"/>' +
      '<circle cx="46" cy="46" r="10" stroke="#fffaf0" stroke-width="1.2" opacity=".7"/>'
    // bọt sữa bông: các chùm bong bóng trắng viền mực mảnh, chồng lên nhau
    const puffs = [[50, 50, 1.25], [33, 38, 1], [66, 36, 0.95], [70, 62, 1], [34, 64, 0.95], [51, 74, 0.9], [50, 25, 0.85], [22, 52, 0.8], [78, 50, 0.8]]
    for (const [x, y, s] of puffs) {
      for (let k = 0; k < 3; k++) {
        const ox = (rand() * 2 - 1) * 4 * s, oy = (rand() * 2 - 1) * 4 * s
        foam += blob(x + ox, y + oy, (4 + rand() * 3) * s, k === 2 ? '#ffffff' : '#fffaf0', 0.8)
      }
      foam += `<path d="M${f1(x - 3 * s)} ${f1(y - 2.5 * s)}q${f1(2 * s)} ${f1(-2 * s)} ${f1(4 * s)} 0" stroke="#e9dcc0" stroke-width="1"/>`
    }
    return { under: wrap(under), clump: wrap(clump), spread: '', ice: '', foam: wrap(foam) }
  }
  // to: bánh tráng trộn — sợi bánh tráng nền; xoài, sa tế, trứng cút, hành phi, rau răm còn để riêng từng góc → trộn đều
  for (let i = 0; i < 34; i++) {
    const [x, y] = inDisc(rand, 44)
    const a = rand() * Math.PI, len = 12 + rand() * 10
    under += strand(x, y, a, len, '#3a2618', 3.2).replace('stroke-width="3.2"', 'stroke-width="3.2" opacity=".18"')
    under += strand(x, y, a, len, i % 3 ? '#fbf1d2' : '#e2c98c', 2)
  }
  const heap = (cx, cy, kind, n, spreadR) => {
    let s = ''
    for (let i = 0; i < n; i++) {
      const [x, y] = inDisc(rand, spreadR, cx, cy)
      if (kind === 'xoai') { const a = rand() * Math.PI, len = 7 + rand() * 3; s += strand(x, y, a, len, '#3a2618', 3.6) + strand(x, y, a, len, '#b9d65c', 2.2) }
      else if (kind === 'sate') s += blob(x, y, 1.4 + rand() * 1.2, i % 2 ? '#d8452b' : '#b8302a', 0.6)
      else if (kind === 'trung') s += egg(x, y, 0.8 + rand() * 0.25)
      else if (kind === 'hanh') s += i % 3 ? blob(x, y, 1.1 + rand() * 0.8, '#b8732e', 0.5) : leaf(x, y, rand() * 180)
    }
    return s
  }
  clump = heap(31, 31, 'xoai', 7, 9) + heap(69, 31, 'sate', 12, 9) + heap(69, 69, 'trung', 3, 8) + heap(31, 69, 'hanh', 12, 9)
  spread = heap(50, 50, 'xoai', 9, 40) + heap(50, 50, 'sate', 16, 42) + heap(50, 50, 'trung', 3, 30) + heap(50, 50, 'hanh', 14, 42)
  return { under: wrap(under), clump: wrap(clump), spread: wrap(spread), ice: '', foam: '' }
}

// Vệt xoáy (khung -50..50): đuôi cung bán kính 30 ở PHÍA SAU ngón (góc âm), đầu ở góc 0. Xoay tới góc ngón tay, lật dọc khi
// quay ngược chiều, phóng theo khoảng cách ngón tới tâm.
function swirlSvg(color) {
  const seg = (a0, a1, w, op) => {
    const p = a => `${f1(30 * Math.cos(a * Math.PI / 180))} ${f1(30 * Math.sin(a * Math.PI / 180))}`
    return `<path d="M${p(a0)}A30 30 0 0 0 ${p(a1)}" stroke="${color}" stroke-width="${w}" opacity="${op}"/>`
  }
  const inner = (a0, a1, w, op) => {
    const p = a => `${f1(19 * Math.cos(a * Math.PI / 180))} ${f1(19 * Math.sin(a * Math.PI / 180))}`
    return `<path d="M${p(a0)}A19 19 0 0 0 ${p(a1)}" stroke="${color}" stroke-width="${w}" opacity="${op}"/>`
  }
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><g fill="none" stroke-linecap="round">` +
    seg(-4, -28, 6, 0.85) + seg(-28, -58, 5, 0.6) + seg(-58, -92, 4, 0.4) + seg(-92, -130, 3, 0.22) +
    inner(-20, -60, 3, 0.45) + inner(-60, -100, 2.4, 0.25) + '</g></svg>'
}

function sound(ctx, name) {
  const app = ctx && ctx.app
  try { if (app && typeof app.sound === 'function') app.sound(name) } catch { /* bỏ qua */ }
}

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const target = Math.max(1, Math.floor(Number(params.turns) || 1))
  const mul = ctx.zoneMul || 1
  const maxSpeed = Math.round(XOAY_MAX_SPEED * mul * (params.fast ? XOAY_FAST_MUL : 1) * 100) / 100
  const limit = gestureLimitSec(step, { assist: !!ctx.assist, untimed: !!ctx.untimed })
  const clock = createClock()
  const out = settleOnce()
  const vfx = vfxOf(ctx)
  const reduced = reducedOf(ctx)
  const T = ((ctx.data || {}).MINIGAME_TYPES || {}).xoay || {}
  const skinId = SKIN_LOOK[step.skin] ? step.skin : 'to'
  const skin = (T.skins && T.skins[skinId]) || {}
  const look = SKIN_LOOK[skinId]
  const geo = bowlGeometry(skinId)
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const headSvg = step.icon ? artV2(step.icon)
    : step.ing ? artV2((INGS[step.ing] && INGS[step.ing].icon) || step.ing)
      : artV2(skinId === 'to' ? 'muong_khuay' : (ctx.recipe && ctx.recipe.icon) || 'muong_khuay')

  stage.classList.add('mg-xoay', 'skin-' + skinId)
  stage.dataset.skin = skinId
  const fr = buildFrame2(stage, {
    icon: headSvg, title: step.label || skin.name || T.name || '', sub: skin.sub || 'Vẽ vòng quanh tô cho đủ số vòng.',
    steps: frameSteps(ctx), timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })

  // ---- Cảnh: tô (đạo cụ) + mặt hỗn hợp tròn + khấc tiến độ quanh vành + mũi tên gợi ý + dụng cụ theo ngón ----
  const L = mixLayers(skinId, hashKey('xoay:' + (step.id || '') + ':' + skinId))
  const layer = (cls, svgStr) => svgStr ? svgBox(svgStr, 'xoay-layer ' + cls) : null
  const spinA = h('div', { class: 'xoay-spin' }, layer('xoay-under', L.under))
  const blend = h('div', { class: 'xoay-blend', style: { background: look.blend } })
  const clumpEl = layer('xoay-clump', L.clump)
  const spreadEl = layer('xoay-spread', L.spread)
  const foamEl = layer('xoay-foam', L.foam)
  const iceEl = layer('xoay-ice', L.ice)
  const spinB = h('div', { class: 'xoay-spin' }, clumpEl, spreadEl, foamEl, iceEl)
  const swirl = svgBox(swirlSvg(look.swirl), 'xoay-swirl')
  const hint = svgBox(HINT_RING, 'xoay-hint')
  const mix = h('div', {
    class: 'xoay-mix',
    style: {
      left: ((geo.cx - geo.r) * 100).toFixed(2) + '%', top: ((geo.cy - geo.r) * 100).toFixed(2) + '%',
      width: (geo.r * 200).toFixed(2) + '%', height: (geo.r * 200).toFixed(2) + '%', background: look.base
    }
  }, spinA, blend, spinB, swirl, h('i', { class: 'xoay-gloss' }), hint)
  const propSvg = look.prop ? propV2(look.prop) : LY_TOP
  const dish = propSvg ? svgBox(propSvg, 'xoay-dish') : h('div', { class: 'xoay-dish is-css' })
  const segs = ringSegments(target, f1(geo.ring * 100))
  const ring = svgBox('<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="translate(50 50)" fill="none" stroke-linecap="round">' +
    segs.map(d => `<path d="${d}" class="xoay-seg-ink"/><path d="${d}" class="xoay-seg-bg"/>`).join('') +
    segs.map((d, i) => `<path d="${d}" class="xoay-seg" data-i="${i}"/>`).join('') + '</g></svg>', 'xoay-ring')
  const segEls = Array.from(ring.querySelectorAll('.xoay-seg'))
  const shakeBox = h('div', { class: 'xoay-shake' }, dish, mix, ring)
  const tool = svgBox(TOOLS[look.tool], 'xoay-tool')
  const bowl = h('div', {
    class: 'xoay-bowl', 'data-testid': 'xoay-bowl', role: 'application', 'aria-label': skin.name || 'Tô cần khuấy'
  }, shakeBox, tool)
  const speedFill = h('i', { class: 'xoay-speed-fill' })
  const speed = h('div', {
    class: 'xoay-speed', 'data-testid': 'xoay-speed', 'data-v': '0', 'data-max': maxSpeed.toFixed(2),
    role: 'meter', 'aria-label': 'Tốc độ khuấy', 'aria-valuemin': '0', 'aria-valuemax': (maxSpeed * 1.5).toFixed(2), 'aria-valuenow': '0'
  }, h('i', { class: 'xoay-speed-hot' }), speedFill, h('i', { class: 'xoay-speed-mark' }))
  const splats = h('div', { class: 'xoay-splats', 'aria-hidden': 'true' })
  const scene = h('div', { class: 'xoay-scene' }, splats, bowl, speed)
  fr.area.append(scene)

  const countText = skin.count || 'Vòng'
  const progress = h('div', { class: 'mg-count g-pill g-pill--big xoay-count', 'data-testid': 'xoay-progress', 'data-v': '0', 'data-n': String(target) })
  fr.foot.append(progress)

  // Tô luôn tròn, to nhất vừa cảnh (chừa thước tốc độ bên phải): cạnh = min(rộng − 2 × chỗ thước, cao − 8, 300).
  let side = 0
  let toolW = 0
  function fit() {
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return
    const gauge = 34
    side = Math.round(Math.max(XOAY_MIN_SIDE, Math.min(XOAY_MAX_SIDE, r.width - 2 * gauge, r.height - 8)))
    Object.assign(bowl.style, {
      width: side + 'px', height: side + 'px',
      left: Math.round((r.width - side) / 2) + 'px', top: Math.round(Math.max(0, (r.height - side) / 2)) + 'px'
    })
    const gh = Math.round(Math.max(64, Math.min(130, side * 0.6)))
    Object.assign(speed.style, { height: gh + 'px', top: Math.round(Math.max(0, (r.height - gh) / 2)) + 'px' })
    toolW = Math.round(Math.max(26, Math.min(44, side * 0.15)))
    Object.assign(tool.style, { width: toolW + 'px', height: toolW * 3 + 'px' })
    if (!toolAt) restTool()
    else placeTool(toolAt.x, toolAt.y)
  }

  // Dụng cụ: đầu (20, 116) trên khung 40 × 120 nằm đúng điểm (x, y) trong tô (px). Chỉ đổi transform.
  let toolAt = null
  function placeTool(x, y) {
    const tilt = 20 + 8 * Math.sin(Math.atan2(y - side / 2, x - side / 2))
    tool.style.transform = `translate(${f1(x - toolW / 2)}px, ${f1(y - toolW * 3 * (116 / 120))}px) rotate(${f1(tilt)}deg)`
  }
  // lúc chưa khuấy: muỗng tựa trong lòng tô, phía trên-phải
  function restTool() {
    const a = -0.6, d = side * geo.r * 0.62
    placeTool(side / 2 + Math.cos(a) * d, side / 2 + Math.sin(a) * d)
  }

  fit()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
  if (ro) ro.observe(scene)

  const tc = createTurnCounter({ cx: 0, cy: 0, minR: 0 })
  const spill = createSpillMeter({ max: maxSpeed })
  let spills = 0
  let halves = 0
  let ending = false
  let net = 0                // góc ròng có dấu (độ) — các thứ trong tô trôi theo
  let lastAng = null
  let dir = 1
  const timers = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }

  function renderProgress() {
    const v = Math.min(tc.turns, target)
    progress.textContent = `${countText} ${Math.floor(v)}/${target}`
    // làm tròn XUỐNG 2 chữ số: 2,996 vòng ghi "2.99" chứ không "3.00" (trò chỉ xong khi đủ hẳn target vòng)
    progress.dataset.v = (Math.floor(v * 100 + 1e-9) / 100).toFixed(2)
    const f = Math.min(1, v / target)
    blend.style.opacity = (f * look.blendMax).toFixed(3)
    if (clumpEl) clumpEl.style.opacity = (1 - f).toFixed(3)
    if (spreadEl) spreadEl.style.opacity = f.toFixed(3)
    if (foamEl) {
      foamEl.style.opacity = Math.min(1, f * 1.4).toFixed(3)
      foamEl.style.transform = `scale(${(0.45 + 0.55 * f).toFixed(3)})`
    }
  }
  renderProgress()

  function setSpeed(v) {
    const s = Math.max(0, v)
    speed.dataset.v = s.toFixed(2)
    speed.setAttribute('aria-valuenow', s.toFixed(2))
    speedFill.style.transform = `scaleY(${Math.min(1, s / (maxSpeed * 1.5)).toFixed(3)})`
    speed.classList.toggle('is-over', s > maxSpeed)
  }

  // Vệt bẩn đọng trên mặt quầy ngoài vành tô, ở hướng vừa sánh ra (tối đa 4 vệt, vệt cũ nhất bỏ đi).
  function addSplat(ang) {
    const sr = scene.getBoundingClientRect(), br = bowl.getBoundingClientRect()
    const cx = br.left - sr.left + br.width / 2, cy = br.top - sr.top + br.height / 2
    const d = br.width * 0.5 + 6
    const s = Math.round(14 + Math.random() * 8)
    const x = Math.max(4, Math.min(sr.width - s - 4, cx + Math.cos(ang) * d - s / 2))
    const y = Math.max(2, Math.min(sr.height - s - 2, cy + Math.sin(ang) * d - s / 2))
    const el = h('i', { class: 'xoay-splat', style: { left: Math.round(x) + 'px', top: Math.round(y) + 'px', width: s + 'px', height: Math.round(s * 0.8) + 'px', background: look.drops[0] } })
    splats.appendChild(el)
    while (splats.children.length > SPLAT_MAX) splats.firstChild.remove()
    // hiện ở khung hình sau để lớp is-in chạy chuyển opacity (giảm chuyển động: CSS tắt chuyển tiếp, hiện thẳng)
    later(() => el.classList.add('is-in'), 16)
  }

  // Tô rung 3px (WAAPI, chỉ transform); giảm chuyển động: chớp viền đỏ tĩnh quanh tô.
  function wobble() {
    if (reduced() || typeof shakeBox.animate !== 'function') {
      bowl.classList.add('is-alert')
      later(() => bowl.classList.remove('is-alert'), 380)
      return
    }
    try {
      shakeBox.animate([
        { transform: 'translateX(0)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(-3px)' },
        { transform: 'translateX(2px)' }, { transform: 'translateX(-1px)' }, { transform: 'translateX(0)' }
      ], { duration: 240, easing: 'linear' })
    } catch { /* bỏ qua */ }
  }

  function onSpill(p, ang) {
    spills++
    feedback(ctx, 'spill')
    if (vfx) {
      try {
        vfx.floatText({ x: p.clientX, y: p.clientY }, 'Văng ra rồi!', { tone: 'bad', size: 'small' })
        if (!reduced()) {
          const br = bowl.getBoundingClientRect()
          const R = br.width * geo.r * 1.05
          vfx.burst({ x: br.left + br.width / 2 + Math.cos(ang) * R, y: br.top + br.height / 2 + Math.sin(ang) * R }, 'drop', { n: 7, colors: look.drops.slice() })
        }
      } catch { /* bỏ qua */ }
    }
    wobble()
    addSplat(ang)
  }

  // Mỗi nửa vòng: tiếng muỗng chạm thành tô, sáng một khấc; mỗi vòng trọn thêm chút lấp lánh ở khấc vừa xong.
  function onHalf(k) {
    sound(ctx, 'stir')
    const el = segEls[k - 1]
    if (el) el.classList.add('is-on')
    if (k === 1) { hint.classList.add('is-off'); later(() => { hint.hidden = true }, 320) }
    if (k % 2 === 0 && vfx && el) { try { vfx.burst(el, 'sparkle', { n: 3 }) } catch { /* bỏ qua */ } }
  }

  function track(p) {
    const r = bowl.getBoundingClientRect()
    const R = r.width / 2
    return { x: p.clientX - r.left, y: p.clientY - r.top, R }
  }

  // Góc ngón tay quanh tâm: các thứ trong tô trôi theo (trễ hơn ngón), vệt xoáy bám theo ngón.
  function stirVisual(q) {
    const dx = q.x - q.R, dy = q.y - q.R
    const dist = Math.hypot(dx, dy)
    if (dist < q.R * 0.12) { lastAng = null; return null }
    const ang = Math.atan2(dy, dx)
    if (lastAng !== null) {
      let d = ang - lastAng
      while (d > Math.PI) d -= TAU
      while (d <= -Math.PI) d += TAU
      if (Math.abs(d) > 0.002) dir = d > 0 ? 1 : -1
      net += d * 180 / Math.PI
    }
    lastAng = ang
    const t1 = `rotate(${f1(net * 0.6)}deg)`
    spinA.style.transform = t1
    spinB.style.transform = t1
    const mixR = q.R * 2 * geo.r
    const s = Math.max(0.45, Math.min(1.3, (dist / mixR) * (50 / 30)))
    swirl.style.transform = `rotate(${f1(ang * 180 / Math.PI)}deg) scale(${s.toFixed(3)}, ${(s * dir).toFixed(3)})`
    return ang
  }

  const unbind = bindPointer(scene, {
    down(p) {
      if (out.done) return
      const q = track(p)
      tc.setCenter(q.R, q.R, q.R * 0.12)
      tc.lift()
      tc.push(q.x, q.y, p.t / 1000)
      lastAng = null
      stirVisual(q)
      toolAt = { x: q.x, y: q.y }
      placeTool(q.x, q.y)
      bowl.classList.add('is-stirring')
    },
    move(p) {
      if (out.done) return
      const q = track(p)
      const t = p.t / 1000
      tc.push(q.x, q.y, t)
      toolAt = { x: q.x, y: q.y }
      placeTool(q.x, q.y)
      const ang = stirVisual(q)
      const sp = tc.speed()
      setSpeed(sp)
      if (spill.push(sp, t)) onSpill(p, ang === null ? -Math.PI / 2 : ang)
      const hv = Math.min(target * 2, Math.floor(tc.turns * 2))
      while (halves < hv) onHalf(++halves)
      renderProgress()
      if (tc.turns >= target && !ending) {
        ending = true
        // xong: lấp lánh trên mặt hỗn hợp (chữ khen để con dấu kết quả nói; không chồng chữ lên dấu)
        if (vfx) { try { vfx.burst(mix, 'sparkle', { n: 6 }) } catch { /* bỏ qua */ } }
        later(finish, 260)
      }
    },
    up() { release() },
    cancel() { release() }
  })

  function release() {
    tc.lift()
    lastAng = null
    setSpeed(0)
    bowl.classList.remove('is-stirring')
  }

  // Sân khấu bếp ở màn thấp cuộn dọc (thanh chân dính đáy): cuộn sẵn để cảnh thao tác nằm trên thanh chân — vừa thì hiện
  // trọn, không vừa thì giữ mép trên của cảnh ở đầu khung (đầu sân khấu cuộn khuất).
  let revealRaf = 0
  function reveal() {
    revealRaf = 0
    try {
      if (out.done || stage.scrollHeight <= stage.clientHeight + 1) return
      const sr = stage.getBoundingClientRect(), fr2 = fr.foot.getBoundingClientRect(), r = scene.getBoundingClientRect()
      const delta = r.height <= fr2.top - sr.top ? r.bottom - fr2.top + 2 : r.top - sr.top
      if (delta > 0) stage.scrollTop += Math.ceil(delta)
    } catch { /* bỏ qua */ }
  }
  if (typeof requestAnimationFrame === 'function') revealRaf = requestAnimationFrame(reveal)

  const loop = frameLoop(() => {
    const t = clock.elapsed()
    fr.setTime(t / limit)
    if (t >= limit) finish()
  })

  function finish() {
    if (out.done) return
    const elapsed = clock.elapsed()
    cleanup()
    const turns = Math.round(tc.turns * 100) / 100
    const cv = tc.cv()
    // Nấu thử (ctx.untimed): không phạt quá giờ (par = Infinity → bỏ luật −15), như cha.js
    const score = scoreXoay({ turns, target, spills, cv, elapsed, par: ctx.untimed ? Infinity : step.par, mul })
    feedback(ctx, score >= 90 ? 'good' : score < 50 ? 'bad' : 'ok')
    out.settle({ score, details: { turns, target, spills, cv, maxSpeed, elapsed } })
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    unbind()
    if (ro) ro.disconnect()
    bowl.classList.remove('is-stirring')
    setSpeed(0)
  }

  return {
    result: out.promise,
    hold(on) { if (!out.done) clock.hold(on) },
    destroy() {
      cleanup()
      if (revealRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(revealRaf)
      for (const id of timers) clearTimeout(id)
      timers.clear()
      fr.destroy()
      out.settle(null)
    }
  }
}

export default { type: 'xoay', mount }
