// LAC — lắc bình / lắc rổ (M5, gói Pha trộn E3). Bình lắc inox (rổ tre) TO giữa cảnh; kéo lên xuống để lắc: bình đi theo
// ngón và nghiêng theo hướng kéo (phản hồi trực tiếp — giữ cả khi giảm chuyển động); mỗi lần đổi chiều theo trục Y vượt
// ngưỡng 24px là một lượt lắc (createReversalCounter), kèm tiếng đá lách cách (âm shake) và vệt rung hai bên bình. Không
// dùng cảm biến chuyển động (iOS bắt xin quyền). Bình: hơi lạnh đọng dần trên thân, bọt dâng trào ở khe nắp theo số lượt.
// Rổ: cùi bưởi hạt lựu trong lòng rổ, đống bột năng vơi dần và bột trắng phủ dần lên từng hạt, bụi bột bay. Mũi tên lên
// xuống bên cạnh làm gợi ý tới lượt lắc đầu tiên.
// Luật xong (lacRule, thuần): bước không có params.maxRatio (Lắc đều của trà tắc) đủ K lượt thì tự xong, như cũ. Bước có
// maxRatio m (Lắc rổ áo bột năng, m = 1,2) KHÔNG tự xong ở K: lắc đủ K lượt rồi NHẤC TAY mới xong (nhấc tay khi chưa đủ thì
// chạm lại lắc tiếp), hoặc hết giờ. Dòng hướng dẫn ghi "Lắc đủ K lượt rồi nhấc tay."; bộ đếm ghi k/K cả khi vượt K (vd 9/8);
// thanh lượt ở thanh chân có vạch K, vùng vừa đủ (K..K × m, nền xanh) và vùng quá tay (sọc đỏ). Đủ K lượt: chữ nổi "Đủ rồi,
// nhấc tay!", bộ đếm xanh. Quá K × m: chữ nổi lời của lớp vỏ (rổ: "Lắc quá tay, bột văng!"), bộ đếm đỏ, vệt bột văng ra
// mặt quầy (vệt tĩnh), khung rổ rung nhẹ 1 nhịp, hạt bột bay — giảm chuyển động: không hạt bay, rung thành chớp viền đỏ
// tĩnh (vfx tự đổi), vệt bột hiện thẳng.
// Chấm: scoreLac (core/minigame-scoring.js): 100 · min(1, lượt/K) − 10 nếu nhịp không đều (cv > 0,6 · mul) − 15 nếu quá
// mốc overtimeAt('lac') = max(2 × par, sàn giờ minLimitSec 0,4 × lượt + 1) − phạt lắc quá tay lacOverPenalty khi bước có
// maxRatio (r = lượt/K ≤ m: 0; ≤ m + 0,15: 20; ≤ m + 0,4: 45; hơn nữa: 80 — cùng bậc với chạm tối thiểu cũ). Nấu thử
// (ctx.untimed) không phạt quá giờ (par = Infinity).
// Hợp đồng e2e (giữ từ bản tạm gói A): lac-area (vùng kéo); lac-shaker (bình/rổ, hộp đứng yên giữa vùng — phần hình bên trong
// đi theo ngón); lac-count[data-v = số lượt, data-n = K; bước có maxRatio thêm data-ok = số lượt nhiều nhất còn vừa đủ
// ⌊K × m⌋ và data-zone = thieu | du | qua]; lac-bar (chỉ bước có maxRatio: data-n, data-ok, data-max). Lớp vỏ (step.skin):
// binh | ro → lớp gốc .mg-lac.skin-<id>, stage[data-skin].
// Cách giải tự động: nhấn giữa lac-shaker, kéo lên xuống ±70px (5 bước mỗi lần, chờ ~24 ms giữa các lần) tới khi data-v ≥
// data-n. lac-count không có data-ok: trò tự xong. Có data-ok: ngừng kéo khi data-n ≤ data-v ≤ data-ok rồi NHẤC TAY (trò
// xong sau ~220 ms); kéo tiếp quá data-ok là lắc quá tay.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreLac } from '../../core/minigame-scoring.js'
import { createClock, frameLoop, settleOnce, feedback, vfxOf, reducedOf, frameSteps, uiRand, hashKey } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2, PROP_META } from '../art/v2.js'
import { createReversalCounter, gestureLimitSec } from './_gesture.js'

export const LAC_THRESHOLD = 24        // px: đổi chiều quá ngưỡng này mới tính một lượt (chống rung tay)
export const LAC_TRAVEL = 70           // px: bình đi theo ngón tối đa mỗi phía
const TILT_MAX = Object.freeze({ binh: 14, ro: 6 })   // độ nghiêng tối đa theo hướng kéo
export const LAC_BAR_EXTRA = 0.3       // thanh lượt (bước có maxRatio) trải tới K × (m + 0,3): thấy cả vùng quá tay
const SPLAT_MAX = 4                    // vệt bột văng trên mặt quầy (giữ 4 vệt mới nhất)

const f1 = v => Math.round(v * 10) / 10
// màu phần đã lắc của thanh lượt theo vùng: chưa đủ vàng nghệ, vừa đủ xanh, quá tay đỏ
const BAR_FILL = Object.freeze({
  thieu: 'linear-gradient(180deg, var(--g-gold-light, #ffe27a), var(--g-gold, #f7b928))',
  du: 'linear-gradient(180deg, var(--g-go-light, #8edb6a), var(--g-go, #43a63d))',
  qua: 'linear-gradient(180deg, var(--g-bad-light, #ff7b68), var(--g-bad, #d8392b))'
})

/**
 * Luật xong của bước Lắc (thuần, dùng chung cho sân khấu và test).
 * lacRule(K, maxRatio) → { K, strict, maxRatio, okMax, barMax }
 * - strict = bước có maxRatio m hợp lệ (số hữu hạn ≥ 1, cùng điều kiện với lacOverPenalty ở lõi; lỗi hoặc < 1 thì bỏ qua).
 * - okMax = số lượt nhiều nhất còn vừa đủ: ⌊K × m⌋ (r = lượt/K ≤ m thì không phạt); không strict thì Infinity.
 * - barMax = độ dài thanh lượt (lượt): max(okMax + 2, ⌈K × (m + 0,3)⌉); không strict thì K.
 */
export function lacRule(target, maxRatio) {
  const K = Math.max(1, Math.floor(Number(target) || 1))
  const m = Number(maxRatio)
  const strict = Number.isFinite(m) && m >= 1
  if (!strict) return Object.freeze({ K, strict: false, maxRatio: null, okMax: Infinity, barMax: K })
  const okMax = Math.floor(K * m + 1e-9)
  return Object.freeze({ K, strict: true, maxRatio: m, okMax, barMax: Math.max(okMax + 2, Math.ceil(K * (m + LAC_BAR_EXTRA) - 1e-9)) })
}

/** Vùng của số lượt k: 'thieu' (k < K), 'du' (K ≤ k ≤ okMax — không strict thì mọi k ≥ K), 'qua' (k > okMax: lắc quá tay). */
export function lacZone(k, rule) {
  const n = Math.max(0, Math.floor(Number(k) || 0))
  return n < rule.K ? 'thieu' : n <= rule.okMax ? 'du' : 'qua'
}

/**
 * Sự kiện `event` có làm bước xong không, khi đã có k lượt: 'stroke' (vừa thêm một lượt) → xong khi k ≥ K và bước KHÔNG
 * strict (tự xong như cũ); 'release' (nhấc tay / chạm bị hủy) → xong khi k ≥ K và bước strict. Hết giờ thì luôn xong
 * (vòng khung hình của sân khấu, không qua hàm này).
 */
export function lacDoneOn(event, k, rule) {
  if (!(Math.floor(Number(k) || 0) >= rule.K)) return false
  if (event === 'stroke') return !rule.strict
  if (event === 'release') return rule.strict
  return false
}

// Khung theo đạo cụ (PROP_META của art/props.js; thiếu thì số đo mặc định cùng tỉ lệ).
const META = Object.freeze({
  binh: PROP_META.binh_lac_lon || { vb: [136, 220], cap: [68, 12], body: { cx: 68, top: 82, bottom: 204 } },
  ro: PROP_META.ro_lon || { vb: [270, 180], mouth: { cx: 135, cy: 80, rx: 112, ry: 48 } }
})

/**
 * Lớp phủ bình lắc (cùng khung đạo cụ 136 × 220, thuần): hơi lạnh trên thân (frost) và 3 tầng bọt ở khe nắp (foam1..3,
 * hiện dần theo số lượt). Trả chuỗi SVG; các nhóm có data-part để plugin đổi opacity.
 */
export function shakerOverlay(seed = 1) {
  const rand = uiRand(seed)
  const m = META.binh
  const [W, H] = m.vb
  const seamY = (m.body && m.body.top ? m.body.top : 82) - 9
  const bub = (x, y, r, fill = '#fff1cf') => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${fill}" stroke="#3a2618" stroke-width="1.6"/>`
  let row1 = '', row2 = '', row3 = ''
  for (let x = 24; x <= 112; x += 8 + rand() * 3) row1 += bub(x, seamY + (rand() * 2 - 1) * 1.5, 3.6 + rand() * 2.4)
  for (let x = 30; x <= 106; x += 10 + rand() * 4) row2 += bub(x, seamY - 6 - rand() * 4, 4.6 + rand() * 3, rand() < 0.3 ? '#fffaf0' : '#ffe6b0')
  // bọt chảy xuống thân bình (giọt dài bo tròn) và vài bong bóng to trên vai nắp
  for (const x of [34, 58, 90]) {
    const len = 10 + rand() * 12
    row3 += `<path d="M${x - 5} ${seamY + 4}V${f1(seamY + 4 + len)}a5 5 0 0 0 10 0V${seamY + 4}Z" fill="#fff1cf" stroke="#3a2618" stroke-width="1.6"/>`
  }
  row3 += bub(48, seamY - 14, 6.5, '#fffaf0') + bub(84, seamY - 13, 5.5, '#ffe6b0')
  // hơi lạnh đọng: lớp trắng mờ trên thân và các giọt nước
  const frost = `<path d="M24 ${seamY + 13}L33 ${H - 18}Q68 ${H - 8} 103 ${H - 18}L112 ${seamY + 13}Z" fill="#fff" opacity=".45" stroke="none"/>` +
    [[46, 120], [72, 104], [98, 132], [56, 158], [88, 176], [40, 186], [76, 194]].map(([x, y]) =>
      `<path d="M${x} ${y - 4}c3 4 3 7 0 7s-3-3 0-7z" fill="#f4fbff" stroke="#8fa9bd" stroke-width="1.3"/>`).join('')
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><g stroke-linecap="round" stroke-linejoin="round">` +
    `<g data-part="frost" opacity="0">${frost}</g>` +
    `<g data-part="foam3" opacity="0">${row3}</g><g data-part="foam2" opacity="0">${row2}</g><g data-part="foam1" opacity="0">${row1}</g>` +
    '</g></svg>'
}

/**
 * Lớp trong lòng rổ (cùng khung đạo cụ 270 × 180, thuần): đống bột năng (heap, vơi dần), các hạt cùi bưởi (cubes) và lớp
 * bột phủ trên từng hạt (coat, hiện dần). Hạt nằm trong ellipse lòng rổ (PROP_META.ro_lon.mouth).
 */
export function basketOverlay(seed = 1) {
  const rand = uiRand(seed)
  const m = META.ro
  const [W, H] = m.vb
  const M = m.mouth || { cx: 135, cy: 80, rx: 112, ry: 48 }
  const cubes = []
  // xếp hạt theo hàng trong lòng rổ (hàng sau cao hơn, nhỏ hơn chút), không ra ngoài ellipse
  for (let row = 0; row < 3; row++) {
    const y = M.cy - M.ry * 0.42 + row * M.ry * 0.42
    const span = M.rx * Math.sqrt(Math.max(0, 1 - ((y - M.cy) / M.ry) ** 2)) * 0.72
    const n = row === 1 ? 6 : 5
    for (let i = 0; i < n; i++) {
      const x = M.cx - span + (2 * span * (i + 0.5)) / n + (rand() * 2 - 1) * 4
      const s = 19 + row * 2 + rand() * 4
      cubes.push({ x, y: y + (rand() * 2 - 1) * 3, s, a: Math.round((rand() * 2 - 1) * 24) })
    }
  }
  const rect = (c, fill, extra = '') => `<rect x="${f1(c.x - c.s / 2)}" y="${f1(c.y - c.s / 2)}" width="${f1(c.s)}" height="${f1(c.s)}" rx="${f1(c.s * 0.26)}" transform="rotate(${c.a} ${f1(c.x)} ${f1(c.y)})" fill="${fill}" ${extra}/>`
  const body = cubes.map(c => rect(c, '#f6e3a8', 'stroke="#3a2618" stroke-width="2.2"') +
    `<path d="M${f1(c.x - c.s * 0.3)} ${f1(c.y - c.s * 0.18)}l${f1(c.s * 0.22)} ${f1(-c.s * 0.14)}" transform="rotate(${c.a} ${f1(c.x)} ${f1(c.y)})" stroke="#fffaf0" stroke-width="2.4"/>` +
    `<path d="M${f1(c.x + c.s * 0.08)} ${f1(c.y + c.s * 0.34)}h${f1(c.s * 0.28)}" transform="rotate(${c.a} ${f1(c.x)} ${f1(c.y)})" stroke="#d9bf6e" stroke-width="2"/>`).join('')
  const coat = cubes.map(c => rect(c, '#fffdf8', 'stroke="none"') +
    [0, 1, 2].map(k => `<circle cx="${f1(c.x + (rand() * 2 - 1) * c.s * 0.3)}" cy="${f1(c.y + (rand() * 2 - 1) * c.s * 0.3)}" r="1.2" fill="#e9dfcc" stroke="none"/>`).join('')).join('')
  const hx = M.cx + M.rx * 0.5, hy = M.cy + M.ry * 0.18
  const heap = `<path d="M${f1(hx - 34)} ${f1(hy + 10)}C${f1(hx - 30)} ${f1(hy - 16)} ${f1(hx - 8)} ${f1(hy - 26)} ${f1(hx + 4)} ${f1(hy - 20)}` +
    `C${f1(hx + 18)} ${f1(hy - 24)} ${f1(hx + 34)} ${f1(hy - 6)} ${f1(hx + 34)} ${f1(hy + 10)}Q${f1(hx)} ${f1(hy + 18)} ${f1(hx - 34)} ${f1(hy + 10)}Z" fill="#fffdf8" stroke="#3a2618" stroke-width="2.4"/>` +
    `<path d="M${f1(hx - 20)} ${f1(hy - 8)}q8 -10 18 -12" fill="none" stroke="#e9dfcc" stroke-width="2.4"/>`
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><g stroke-linecap="round" stroke-linejoin="round">` +
    `<g data-part="cubes">${body}<g data-part="coat" opacity="0">${coat}</g></g>` +
    `<g data-part="heap" style="transform-box:fill-box;transform-origin:50% 100%">${heap}</g></g></svg>`
}

// Vệt rung hai bên bình (chớp lên mỗi lượt lắc): hai cung bên trái, hai cung bên phải.
const ARC_L = '<svg viewBox="0 0 24 48" aria-hidden="true"><g fill="none" stroke="#3a2618" stroke-width="3.6" stroke-linecap="round">' +
  '<path d="M9 6Q1 24 9 42"/><path d="M19 13Q14 24 19 35"/></g></svg>'
const ARC_R = '<svg viewBox="0 0 24 48" aria-hidden="true"><g fill="none" stroke="#3a2618" stroke-width="3.6" stroke-linecap="round">' +
  '<path d="M15 6Q23 24 15 42"/><path d="M5 13Q10 24 5 35"/></g></svg>'
// Mũi tên lên xuống (gợi ý cử chỉ; nhấp nhô bằng CSS, giảm chuyển động: đứng yên).
const UPDOWN = '<svg viewBox="0 0 40 100" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M20 14V86M8 26L20 12L32 26M8 74L20 88L32 74" stroke="#3a2618" stroke-width="9"/>' +
  '<path d="M20 14V86M8 26L20 12L32 26M8 74L20 88L32 74" stroke="#fffaf0" stroke-width="4.5"/>' +
  '<circle cx="20" cy="50" r="7" fill="#ffd23f" stroke="#3a2618" stroke-width="3"/></g></svg>'

function sound(ctx, name) {
  const app = ctx && ctx.app
  try { if (app && typeof app.sound === 'function') app.sound(name) } catch { /* bỏ qua */ }
}

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const K = Math.max(1, Math.floor(Number(params.strokes) || 1))
  // có maxRatio (áo bột): không tự xong ở K — lắc đủ rồi nhấc tay; quá ⌊K × maxRatio⌋ lượt là lắc quá tay (lacRule)
  const rule = lacRule(K, params.maxRatio)
  const mul = ctx.zoneMul || 1
  const limit = gestureLimitSec(step, { assist: !!ctx.assist, untimed: !!ctx.untimed })
  const clock = createClock()
  const out = settleOnce()
  const vfx = vfxOf(ctx)
  const reduced = reducedOf(ctx)
  const T = ((ctx.data || {}).MINIGAME_TYPES || {}).lac || {}
  const skinId = step.skin === 'ro' ? 'ro' : 'binh'
  const skin = (T.skins && T.skins[skinId]) || {}
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const headSvg = step.ing ? artV2((INGS[step.ing] && INGS[step.ing].icon) || step.ing) : artV2(skinId === 'ro' ? 'vo_buoi' : 'binh_lac')
  const meta = META[skinId]
  const ratio = meta.vb[0] / meta.vb[1]

  stage.classList.add('mg-lac', 'skin-' + skinId)
  stage.dataset.skin = skinId
  const fr = buildFrame2(stage, {
    icon: headSvg, title: step.label || skin.name || T.name || '',
    sub: rule.strict ? `Lắc đủ ${K} lượt rồi nhấc tay.` : (skin.sub || 'Kéo lên xuống cho đủ lượt.'),
    steps: frameSteps(ctx), timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })

  // ---- Cảnh: bình (rổ) đạo cụ + lớp phủ tiến độ, vệt rung, mũi tên gợi ý ----
  const seed = hashKey('lac:' + (step.id || '') + ':' + skinId)
  const propSvg = propV2(skinId === 'ro' ? 'ro_lon' : 'binh_lac_lon')
  const art = propSvg ? svgBox(propSvg, 'lac-art') : h('div', { class: 'lac-art is-css' })
  const over = svgBox(skinId === 'ro' ? basketOverlay(seed) : shakerOverlay(seed), 'lac-over')
  const part = name => over.querySelector(`[data-part="${name}"]`)
  const parts = skinId === 'ro'
    ? { cubes: part('cubes'), coat: part('coat'), heap: part('heap') }
    : { frost: part('frost'), foam1: part('foam1'), foam2: part('foam2'), foam3: part('foam3') }
  const motion = h('div', { class: 'lac-motion', 'aria-hidden': 'true' }, svgBox(ARC_L, 'lac-motion-l'), svgBox(ARC_R, 'lac-motion-r'))
  const move = h('div', { class: 'lac-move' }, art, over)
  const shaker = h('div', { class: 'lac-shaker', 'data-testid': 'lac-shaker' }, motion, move)
  const hint = svgBox(UPDOWN, 'lac-hint')
  // vệt bột văng trên mặt quầy khi lắc quá tay (dưới bình/rổ, không nhận chạm)
  const splats = rule.strict ? h('div', { class: 'lac-splats', 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', pointerEvents: 'none' } }) : null
  const area = h('div', {
    class: 'lac-area', 'data-testid': 'lac-area', role: 'application', 'aria-label': skin.name || 'Kéo lên xuống để lắc'
  }, splats, shaker, hint)
  fr.area.append(area)

  const countText = skin.count || 'Lượt lắc'
  const overText = skin.over || 'Lắc quá tay rồi!'
  const counter = h('div', { class: 'mg-count g-pill g-pill--big lac-count', 'data-testid': 'lac-count', 'data-v': '0', 'data-n': String(K) })
  fr.foot.append(counter)
  // Bước có maxRatio: thanh lượt cạnh bộ đếm — vạch mực ở K (đủ), nền xanh K..K × maxRatio (vừa đủ, nhấc tay ở đây), sọc
  // đỏ sau vạch đỏ K × maxRatio (quá tay); phần đã lắc vàng → xanh → đỏ theo vùng. Màu luôn đi kèm chữ (bộ đếm, dòng hướng
  // dẫn, chữ nổi) và sọc (vùng quá tay), không chỉ dựa vào màu.
  let bar = null
  let barFill = null
  if (rule.strict) {
    counter.dataset.ok = String(rule.okMax)
    counter.dataset.zone = 'thieu'
    counter.style.flex = 'none'
    const pos = v => Math.max(0, Math.min(100, (v / rule.barMax) * 100))
    const pc = v => pos(v).toFixed(2) + '%'
    const okEnd = K * rule.maxRatio
    const abs = { position: 'absolute', top: '0', bottom: '0', display: 'block' }
    const mark = (v, color) => h('i', { class: 'lac-bar-mark', style: { ...abs, left: pc(v), width: '3px', marginLeft: '-1.5px', background: color } })
    barFill = h('i', { class: 'lac-bar-fill', style: { ...abs, left: '0', width: '100%', transformOrigin: '0 50%', transform: 'scaleX(0)', background: BAR_FILL.thieu } })
    bar = h('div', {
      class: 'lac-bar', 'data-testid': 'lac-bar', 'data-v': '0', 'data-n': String(K), 'data-ok': String(rule.okMax), 'data-max': String(rule.barMax),
      role: 'meter', 'aria-label': `Lượt lắc: vừa đủ từ ${K} tới ${rule.okMax} lượt, hơn nữa là quá tay`,
      'aria-valuemin': '0', 'aria-valuemax': String(rule.barMax), 'aria-valuenow': '0',
      style: {
        position: 'relative', flex: '1 1 0', minWidth: '56px', height: '18px', overflow: 'hidden', boxSizing: 'border-box',
        border: '2.5px solid var(--g-ink, #3a2618)', borderRadius: '999px', background: '#efe2c6',
        boxShadow: 'inset 0 3px 0 rgba(58, 38, 24, .12), 0 2px 0 rgba(58, 38, 24, .25)'
      }
    },
    h('i', { class: 'lac-bar-ok', style: { ...abs, left: pc(K), width: (pos(okEnd) - pos(K)).toFixed(2) + '%', background: 'rgba(142, 219, 106, .62)' } }),
    h('i', { class: 'lac-bar-over', style: { ...abs, left: pc(okEnd), right: '0', background: 'repeating-linear-gradient(45deg, #ffd0c8 0 4px, #ffad9f 4px 8px)' } }),
    barFill,
    mark(K, 'var(--g-ink, #3a2618)'),
    mark(okEnd, 'var(--g-bad-dark, #8f2015)'))
    fr.foot.append(bar)
  }

  // Cỡ bình theo vùng kéo: chừa quãng đi lên xuống `travel` mỗi phía để bình không chui xuống thanh chân.
  let travel = LAC_TRAVEL
  function fit() {
    const r = area.getBoundingClientRect()
    if (!r.width || !r.height) return
    const want = Math.max(14, Math.min(LAC_TRAVEL, r.height * 0.13))
    let hgt = Math.max(72, Math.min(skinId === 'ro' ? 190 : 250, r.height - 2 * want - 6))
    let wid = hgt * ratio
    const maxW = r.width - 96
    if (wid > maxW) { wid = Math.max(90, maxW); hgt = wid / ratio }
    wid = Math.round(wid)
    hgt = Math.round(hgt)
    Object.assign(shaker.style, {
      width: wid + 'px', height: hgt + 'px',
      left: Math.round((r.width - wid) / 2) + 'px', top: Math.round((r.height - hgt) / 2) + 'px'
    })
    travel = Math.max(14, Math.min(LAC_TRAVEL, (r.height - hgt) / 2 - 2))
    const hh = Math.round(Math.max(56, Math.min(110, hgt * 0.7)))
    Object.assign(hint.style, {
      height: hh + 'px', width: Math.round(hh * 0.4) + 'px',
      left: Math.round(Math.min(r.width - hh * 0.4 - 4, (r.width + wid) / 2 + 16)) + 'px', top: Math.round((r.height - hh) / 2) + 'px'
    })
  }
  fit()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
  if (ro) ro.observe(area)

  const rc = createReversalCounter({ threshold: LAC_THRESHOLD })
  let drag = null
  let ending = false
  let endAt = null           // giờ lúc nhấc tay để xong (bước có maxRatio): chấm theo lúc này, không cộng nhịp lấp lánh
  let shown = 0
  let tilt = 0
  let zone = 'thieu'
  const rnd = uiRand(seed ^ 0x5a17)
  const timers = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }

  // Bình đi theo ngón (dy) và nghiêng theo hướng kéo (vận tốc dọc) — phản hồi trực tiếp, giữ cả khi giảm chuyển động.
  function setPose(dy, vy) {
    const y = Math.max(-travel, Math.min(travel, dy))
    const maxT = TILT_MAX[skinId]
    const want = Math.max(-1, Math.min(1, vy / 900)) * maxT
    tilt = tilt * 0.55 + want * 0.45
    move.style.transform = `translateY(${f1(y)}px) rotate(${f1(tilt)}deg)`
  }

  function render() {
    const k = rc.count
    counter.dataset.v = String(k)
    if (rule.strict) {
      // vượt K vẫn ghi số thật (vd 9/8): người chơi thấy mình đã lắc dư bao nhiêu. Thanh chân luôn hiện (dòng hướng dẫn và
      // chữ nổi có thể khuất ở khung thấp) nên chữ của bộ đếm nói luôn việc cần làm: đủ → "Nhấc tay!", quá → "Quá tay!".
      const z = lacZone(k, rule)
      counter.textContent = `${z === 'du' ? 'Nhấc tay!' : z === 'qua' ? 'Quá tay!' : countText} ${k}/${K}`
      counter.dataset.zone = z
      counter.classList.toggle('g-pill--go', z === 'du')
      counter.classList.toggle('g-pill--bad', z === 'qua')
      if (bar) {
        bar.dataset.v = String(k)
        bar.setAttribute('aria-valuenow', String(k))
        barFill.style.transform = `scaleX(${Math.min(1, k / rule.barMax).toFixed(4)})`
        barFill.style.background = BAR_FILL[z]
      }
    } else {
      counter.textContent = `${countText} ${Math.min(k, K)}/${K}`
    }
    const f = Math.min(1, k / K)
    const ramp = (a, b) => Math.max(0, Math.min(1, (f - a) / (b - a))).toFixed(3)
    if (skinId === 'ro') {
      if (parts.coat) parts.coat.setAttribute('opacity', (f * 0.9).toFixed(3))
      if (parts.heap) parts.heap.style.transform = `scale(${(1 - 0.8 * f).toFixed(3)})`
    } else {
      if (parts.frost) parts.frost.setAttribute('opacity', (f * 0.9).toFixed(3))
      if (parts.foam1) parts.foam1.setAttribute('opacity', ramp(0.05, 0.3))
      if (parts.foam2) parts.foam2.setAttribute('opacity', ramp(0.35, 0.65))
      if (parts.foam3) parts.foam3.setAttribute('opacity', ramp(0.7, 0.95))
    }
  }
  render()
  // Bước có maxRatio: bộ đếm giữ bề rộng của chữ dài nhất thường gặp (vd "Quá tay! 12/8") để thanh lượt không co giật khi
  // đổi chữ hay số lượt sang 2 chữ số.
  if (rule.strict) {
    try {
      const keep = counter.textContent
      let w = 0
      for (const t of [`${countText} ${rule.barMax}/${K}`, `Nhấc tay! ${rule.okMax}/${K}`, `Quá tay! ${rule.barMax}/${K}`]) {
        counter.textContent = t
        w = Math.max(w, counter.getBoundingClientRect().width)
      }
      counter.textContent = keep
      if (w > 0) Object.assign(counter.style, { minWidth: Math.ceil(w) + 'px', justifyContent: 'center' })
    } catch { /* bỏ qua */ }
  }

  // Bột văng ra mặt quầy (lắc quá tay): một vệt bột tĩnh cạnh chân rổ (trái/phải xen kẽ, giữ SPLAT_MAX vệt) và hạt bột
  // bay ra từ đó. Giảm chuyển động: vệt hiện thẳng, không hạt bay (vfx.burst tự bỏ).
  function spillFlour(k) {
    if (!splats) return
    try {
      const ar = area.getBoundingClientRect(), sr = shaker.getBoundingClientRect()
      if (!ar.width || !ar.height) return
      const s = Math.round(16 + rnd() * 10)
      const side = k % 2 ? 1 : -1
      // ngay ngoài mép rổ (hộp lac-shaker), nửa dưới — vệt nằm dưới rổ nên không đặt vào trong lòng rổ
      const edge = side > 0 ? sr.right - ar.left : sr.left - ar.left
      const cx = edge + side * (s / 2 + 4 + rnd() * 16)
      const cy = sr.top - ar.top + sr.height * (0.5 + rnd() * 0.42)
      const x = Math.max(2, Math.min(ar.width - s - 2, cx - s / 2))
      const y = Math.max(2, Math.min(ar.height - s - 2, cy - s * 0.35))
      const el = h('i', {
        class: 'lac-splat',
        style: {
          position: 'absolute', display: 'block', left: Math.round(x) + 'px', top: Math.round(y) + 'px', width: s + 'px', height: Math.round(s * 0.7) + 'px',
          background: '#fffdf8', border: '2px solid var(--g-ink, #3a2618)', borderRadius: '58% 42% 55% 45% / 52% 60% 40% 48%',
          boxShadow: 'inset 0 -2px 0 rgba(233, 223, 204, .9)'
        }
      })
      splats.appendChild(el)
      while (splats.children.length > SPLAT_MAX) splats.firstChild.remove()
      if (!reduced() && typeof el.animate === 'function') {
        el.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' })
      }
      if (vfx) vfx.burst({ x: ar.left + x + s / 2, y: ar.top + y + s * 0.35 }, 'oil', { n: 8, colors: ['#ffffff', '#f3ede2', '#fffaf0'] })
    } catch { /* hiệu ứng lỗi không làm hỏng màn chơi */ }
  }

  // Bước có maxRatio: đổi vùng thì báo bằng chữ — đủ K lượt: "Đủ rồi, nhấc tay!" (tiếng ding, lấp lánh nhỏ); quá K × maxRatio:
  // lời quá tay của lớp vỏ (tiếng lỗi, rung nhẹ 1 nhịp — giảm chuyển động: chớp viền đỏ tĩnh). Dòng hướng dẫn đổi theo.
  function onZone(z) {
    if (z === 'du') {
      fr.setSub('Đủ rồi, nhấc tay để xong.')
      feedback(ctx, 'good')
      if (vfx) {
        try {
          vfx.floatText(shaker, 'Đủ rồi, nhấc tay!', { tone: 'good', size: 'small' })
          vfx.burst(shaker, 'sparkle', { n: 4 })
        } catch { /* bỏ qua */ }
      }
    } else if (z === 'qua') {
      fr.setSub(`${overText} Nhấc tay ngay.`)
      feedback(ctx, 'bad')
      if (vfx) {
        try {
          vfx.floatText(shaker, overText, { tone: 'bad', size: 'small' })
          vfx.shake(shaker, 1)
        } catch { /* bỏ qua */ }
      }
    }
  }

  // Mỗi lượt lắc: tiếng đá (shake), vệt rung hai bên chớp lên; rổ: hạt cùi nảy ngược chiều và bụi bột bay.
  function onStroke(k, dirY) {
    sound(ctx, 'shake')
    render()
    if (k === 1) { hint.classList.add('is-off'); later(() => { hint.hidden = true }, 320) }
    if (rule.strict) {
      const z = lacZone(k, rule)
      if (z !== zone) { zone = z; onZone(z) }
      if (z === 'qua') spillFlour(k)
    }
    if (reduced()) return
    if (typeof motion.animate === 'function') {
      try {
        motion.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 0.85, transform: 'scale(1.04)', offset: 0.3 }, { opacity: 0, transform: 'scale(1.1)' }],
          { duration: 240, easing: 'ease-out' })
      } catch { /* bỏ qua */ }
    }
    if (skinId === 'ro' && parts.cubes && typeof parts.cubes.animate === 'function') {
      try {
        parts.cubes.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${dirY > 0 ? -7 : 5}px)` }, { transform: 'translateY(0)' }],
          { duration: 200, easing: 'ease-out' })
      } catch { /* bỏ qua */ }
    }
    if (vfx) {
      try {
        if (skinId === 'ro') vfx.burst(move, 'oil', { n: 4, colors: ['#ffffff', '#f3ede2', '#fffaf0'] })
        else vfx.burst(move, 'drop', { n: 2, colors: ['#f4fbff', '#cdeeff'] })
      } catch { /* bỏ qua */ }
    }
  }

  const unbind = bindPointer(area, {
    down(p) {
      if (out.done || ending) return
      drag = { y0: p.clientY, y: p.clientY, t: p.t }
      rc.reset()
      rc.push(p.clientY, p.t / 1000)
      move.classList.add('is-held')
    },
    move(p) {
      if (!drag || out.done) return
      const dt = Math.max(1, p.t - drag.t)
      const vy = ((p.clientY - drag.y) / dt) * 1000
      drag.y = p.clientY
      drag.t = p.t
      setPose(p.clientY - drag.y0, vy)
      const k = rc.push(p.clientY, p.t / 1000)
      if (k > shown) {
        shown = k
        onStroke(k, vy)
        // không có maxRatio: đủ K lượt thì tự xong (như cũ); có maxRatio: chờ nhấc tay (release)
        if (!ending && lacDoneOn('stroke', k, rule)) {
          ending = true
          // xong: lấp lánh quanh bình (chữ khen để con dấu kết quả nói; không chồng chữ lên dấu)
          if (vfx) { try { vfx.burst(shaker, 'sparkle', { n: 6 }) } catch { /* bỏ qua */ } }
          later(finish, 220)
        }
      }
    },
    up() { release() },
    cancel() { release() }
  })

  // Nhấc tay (hoặc chạm bị hủy): rổ về chỗ. Bước có maxRatio mà đã đủ K lượt thì đây là lúc xong (chấm theo giờ lúc nhấc
  // tay); chưa đủ thì chạm lại lắc tiếp.
  function release() {
    drag = null
    move.classList.remove('is-held')
    tilt = 0
    move.style.transform = 'translateY(0) rotate(0deg)'
    if (ending || out.done || !lacDoneOn('release', rc.count, rule)) return
    ending = true
    endAt = clock.elapsed()
    if (vfx && lacZone(rc.count, rule) === 'du') { try { vfx.burst(shaker, 'sparkle', { n: 6 }) } catch { /* bỏ qua */ } }
    later(finish, 220)
  }

  // Sân khấu bếp ở màn thấp cuộn dọc (thanh chân dính đáy): cuộn sẵn để cảnh thao tác nằm trên thanh chân — vừa thì hiện
  // trọn, không vừa thì giữ mép trên của cảnh ở đầu khung (đầu sân khấu cuộn khuất).
  let revealRaf = 0
  function reveal() {
    revealRaf = 0
    try {
      if (out.done || stage.scrollHeight <= stage.clientHeight + 1) return
      const sr = stage.getBoundingClientRect(), fr2 = fr.foot.getBoundingClientRect(), r = area.getBoundingClientRect()
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
    const elapsed = endAt !== null ? endAt : clock.elapsed()
    cleanup()
    const strokes = rc.count
    const cv = rc.cv()
    // Nấu thử (ctx.untimed): không phạt quá giờ (par = Infinity → bỏ luật −15), như cha.js
    const score = scoreLac({ strokes, target: K, cv, elapsed, par: ctx.untimed ? Infinity : step.par, mul, maxRatio: params.maxRatio })
    feedback(ctx, score >= 90 ? 'good' : score < 50 ? 'bad' : 'ok')
    out.settle({ score, details: { strokes, target: K, cv, elapsed } })
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    unbind()
    if (ro) ro.disconnect()
    drag = null
    move.classList.remove('is-held')
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

export default { type: 'lac', mount }
