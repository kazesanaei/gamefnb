// ROT — rót: giữ rot-pour (hoặc Space) để rót, thả tay để dừng. Mực dâng nhanh dần nhưng gần vạch
// không quá 25%/giây. Được nhấn lần 2 để rót bù (chậm hơn); lần 2 thả tay là xong. Tràn > 1,02 → 0.
// Cách chấm và tốc độ dâng giữ nguyên (scoreRot, scaledZone, rotSpeed).
// Cảnh M5 (gói Bếp lửa): ly lớn (propV2('ly_lon'), thân trong suốt — nước vẽ DƯỚI hình, cắt theo lòng ly) hoặc tô lớn nhìn
// chếch (lớp vỏ to: mặt nước là elip rộng dần trong miệng tô); ấm/chai/lọ nghiêng khi giữ, dòng chảy cong, mặt nước gợn,
// đá nổi trong ly trà, vạch mục tiêu nhấp nháy khi gần (≤ 2 lần/giây), thả tay thì vài giọt rơi trễ, tràn thì nước loang.
// Hợp đồng e2e: rot-zone[data-a, data-b]; rot-level[data-v] (lớp .is-in khi trong vùng); rot-pour (giữ); rot-done.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreRot } from '../../core/minigame-scoring.js'
import { clamp, createClock, frameLoop, settleOnce, feedback, stepLimitSec, scaledZone, rotSpeed } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2, PROP_META } from '../art/v2.js'
import { isReduced } from '../motion.js'

export const ROT_SPILL = 1.02
export const ROT_MAX_POURS = 2

// Màu chất lỏng theo nguyên liệu: [thân, mặt, hạt nổi (tùy chọn)].
export const ROT_LIQUID = Object.freeze({
  tra: ['#d58a2a', '#f2b558'], ca_phe: ['#bfe1ec', '#ecf8fb'], ca_phe_bmt: ['#bfe1ec', '#ecf8fb'],
  hanh_phi: ['#e5ad34', '#f7d36b', '#8a4a16'], cot_dua: ['#efe6d2', '#fffdf6'], mat_ong_rung: ['#e2901a', '#f8c04a'],
  muoi: ['#f1e2c4', '#fffaf0'], sua_dac: ['#f1e2c4', '#fffaf0']
})
const LIQUID_DEFAULT = ['#c98b3c', '#e9b46a']
// nước sôi (ấm nóng, có hơi) và đá trong ly (trà tắc)
const HOT = new Set(['ca_phe', 'ca_phe_bmt'])
const ICED = new Set(['tra'])

// Ấm nước tự vẽ (viền mực, ba tông): vòi bên phải, mũi vòi ở (61, 21) trên lưới 64.
const KETTLE = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g stroke="#3a2618" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
  '<ellipse cx="30" cy="58" rx="21" ry="3.5" fill="#3a2618" opacity=".15" stroke="none"/>' +
  '<path d="M45 36 L57 22 L62 24 L52 44 Z" fill="#cdd6dc"/>' +
  '<path d="M17 24 C 14 8, 46 8, 43 24" fill="none" stroke-width="4"/>' +
  '<path d="M9 53 C 5 37, 13 24, 30 24 C 47 24, 55 37, 51 53 Z" fill="#e4eaee"/>' +
  '<path d="M39 28 C 48 33, 52 42, 49.5 52 L 41 52 C 44 43, 43 35, 39 28 Z" fill="#b8c3cb" stroke="none"/>' +
  '<ellipse cx="20" cy="36" rx="4.5" ry="7" fill="#fff" opacity=".6" stroke="none"/>' +
  '<path d="M19 25 C 22 19, 38 19, 41 25 Z" fill="#cdd6dc"/>' +
  '<circle cx="30" cy="18.5" r="3" fill="#3a2618" stroke="none"/>' +
  '<path d="M9 53 H 51" fill="none"/></g></svg>'
// Tư thế dụng cụ rót: tip = miệng rót (tỉ lệ trong hộp), rest/pour = góc nghiêng (độ, chiều kim đồng hồ) lúc chờ / lúc rót.
const POSE_KETTLE = Object.freeze({ tip: [0.95, 0.33], rest: -6, pour: 38 })
const POSE_JAR = Object.freeze({ tip: [0.5, 0.1], rest: 16, pour: 112 })

// Tô tự vẽ nhìn chếch (viewBox 240×170): miệng tô là elip RIM; lòng tô bên trong, thân trước che phần dưới.
export const BOWL = Object.freeze({ vb: [240, 170], rim: Object.freeze({ cx: 120, cy: 56, rx: 108, ry: 40 }), base: [120, 158] })
const BOWL_BACK = '<svg viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg"><g stroke="#3a2618" stroke-width="3" stroke-linejoin="round">' +
  '<ellipse cx="120" cy="160" rx="70" ry="7" fill="#3a2618" opacity=".15" stroke="none"/>' +
  '<ellipse cx="120" cy="56" rx="108" ry="40" fill="#e6cfa3" stroke="none"/>' +
  '<path d="M20 60 C 40 92, 200 92, 220 60 C 214 84, 170 98, 120 98 C 70 98, 26 84, 20 60 Z" fill="#d2b583" stroke="none"/>' +
  '<path d="M30 46 C 60 26, 120 20, 170 24" fill="none" stroke="#fff" stroke-width="5" opacity=".45"/></g></svg>'
const BOWL_FRONT = '<svg viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg"><g stroke="#3a2618" stroke-width="3" stroke-linejoin="round">' +
  '<path d="M96 146 L 92 158 H 148 L 144 146 Z" fill="#d9e4ef"/>' +
  '<path d="M12 56 A 108 40 0 0 0 228 56 C 226 112, 176 148, 120 148 C 64 148, 14 112, 12 56 Z" fill="#fffaf0"/>' +
  '<path d="M150 92 C 186 86, 212 74, 224 62 C 222 104, 186 136, 140 145 C 168 128, 160 106, 150 92 Z" fill="#eadcc2" stroke="none"/>' +
  '<path d="M18 74 C 50 98, 190 98, 222 74" fill="none" stroke="#4a8fd0" stroke-width="5"/>' +
  '<path d="M24 92 C 36 112, 52 124, 66 130" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/>' +
  '<ellipse cx="120" cy="56" rx="108" ry="40" fill="none"/></g></svg>'

const LY_FALLBACK = { vb: [200, 250], mouth: { cx: 100, cy: 31, rx: 75, ry: 12.5 }, bottom: { cx: 100, cy: 226, rx: 50, ry: 10 }, left: [[25, 31], [50, 226]], right: [[175, 31], [150, 226]], base: [100, 241] }

/** Mực (0 = đáy, 1 = miệng) → tọa độ y trong viewBox của ly hoặc tô. */
export function levelY(level, skin = 'ly', meta = LY_FALLBACK) {
  const f = clamp(Number(level) || 0, 0, 1.1)
  if (skin === 'to') return BOWL.rim.cy + (1 - f) * 30
  const m = meta && meta.mouth ? meta : LY_FALLBACK
  return m.bottom.cy + (m.mouth.cy - m.bottom.cy) * f
}

/** Elip mặt nước trong tô ở mực f (đơn vị viewBox của tô): rộng và dẹt dần khi xuống sâu. */
export function bowlSurface(level) {
  const f = clamp(Number(level) || 0, 0, 1.05)
  const R = BOWL.rim
  return { cx: R.cx, cy: levelY(f, 'to'), rx: 52 + (R.rx - 4 - 52) * f, ry: 14 + (R.ry - 4 - 14) * f }
}

/**
 * Bố cục cảnh rót (thuần, px trong khung cảnh W×H): bình chứa (ly/tô) bên phải, dụng cụ rót phía trên-trái sao cho miệng
 * rót (lúc nghiêng rót) nằm trên miệng bình chứa. pose: tư thế dụng cụ rót.
 * → { vessel: {x, y, w, h, s}, pourer: {x, y, size}, mouth: {x, y}, land: {x, y} }
 */
export function rotLayout(W, H, skin = 'ly', pose = POSE_JAR, meta = LY_FALLBACK) {
  const w = Math.max(140, Number(W) || 0), hh = Math.max(100, Number(H) || 0)
  const to = skin === 'to'
  const m = to ? BOWL : (meta && meta.mouth ? meta : LY_FALLBACK)
  const [VW, VH] = m.vb
  const rimY = to ? m.rim.cy - m.rim.ry : m.mouth.cy - m.mouth.ry
  const mouthW = to ? m.rim.rx : m.mouth.rx
  const sizeK = to ? 0.62 : 0.5                 // cỡ dụng cụ rót so với chiều cao bình (đơn vị viewBox)
  // miệng rót ở trên mép bình 0,25·P; tâm dụng cụ lệch khỏi miệng theo góc rót
  const a = (pose.pour * Math.PI) / 180
  const vx0 = (pose.tip[0] - 0.5), vy0 = (pose.tip[1] - 0.5)
  const rx = vx0 * Math.cos(a) - vy0 * Math.sin(a), ry = vx0 * Math.sin(a) + vy0 * Math.cos(a)
  // chiều cao cần (đơn vị viewBox): VH + khoảng trên mép bình cho dụng cụ rót
  const needU = (P => Math.max(0, P * (0.25 + ry + 0.5)) - rimY)(sizeK * VH)
  const s = Math.max(0.25, Math.min((hh - 4) / (VH + Math.max(0, needU)), 1.15, (w - 24) / (VW + sizeK * VH * 0.55)))
  const P = Math.round(Math.max(44, Math.min(130, sizeK * VH * s)))
  const vw = VW * s, vh = VH * s
  // mép trái của dụng cụ rót so với mép trái bình (âm = thò ra trái)
  const mxU = to ? m.rim.cx - 0.3 * mouthW : m.mouth.cx - 0.36 * mouthW
  const pourLeftOff = mxU * s - rx * P - P / 2
  const groupW = vw - Math.min(0, pourLeftOff) + 18
  const vx = Math.round((w - groupW) / 2 - Math.min(0, pourLeftOff))
  const vy = Math.round(hh - vh - 2)
  const mouth = { x: Math.round(vx + mxU * s), y: Math.round(vy + rimY * s - 0.25 * P) }
  const pourer = { x: Math.round(mouth.x - rx * P - P / 2), y: Math.round(mouth.y - ry * P - P / 2), size: P }
  const landY = to ? m.rim.cy + 30 : m.bottom.cy
  return { vessel: { x: vx, y: vy, w: Math.round(vw), h: Math.round(vh), s }, pourer, mouth, land: { x: Math.round(mouth.x + 6 * s), y: Math.round(vy + landY * s) } }
}

function reducedOf(ctx) {
  return () => {
    try {
      if (typeof ctx.reduced === 'function') return !!ctx.reduced()
      if (ctx.reduced !== undefined && ctx.reduced !== null) return !!ctx.reduced
    } catch { /* bỏ qua */ }
    return isReduced(ctx.app)
  }
}

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const zone = params.zone || [0.7, 0.82]
  const mul = ctx.zoneMul || 1
  const limit = ctx.untimed ? Infinity : stepLimitSec(step.par, ctx.assist)   // Nấu thử: không giới hạn
  const [za, zb] = scaledZone(zone, mul, 0, 1)
  const clock = createClock()
  const out = settleOnce()
  const vfx = ctx.vfx || (ctx.app && ctx.app.vfx) || null
  const reduced = reducedOf(ctx)
  // lớp vỏ: ly (rót nước) hoặc tô (rưới dầu hành, nước cốt dừa lên món)
  const skinId = step.skin === 'to' ? 'to' : 'ly'
  const skin = ((((ctx.data || {}).MINIGAME_TYPES || {}).rot || {}).skins || {})[skinId] || {}
  const actText = skin.act || 'Giữ để rót'
  const moreText = skin.actMore || 'Giữ để rót bù'
  const countText = skin.count || 'Lần rót'
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const ing = step.ing || ''
  const artId = step.icon || (INGS[ing] && INGS[ing].icon) || ing || 'fallback'
  const [cBody, cTop, cBits] = ROT_LIQUID[ing] || LIQUID_DEFAULT
  const hot = HOT.has(ing)
  const iced = skinId === 'ly' && ICED.has(ing)
  const kettle = skinId === 'ly' && (hot || ing === 'tra')
  const pose = kettle ? POSE_KETTLE : POSE_JAR
  stage.classList.add('mg-rot', 'g-heat', 'skin-' + skinId)
  if (hot) stage.classList.add('is-hot-water')
  stage.dataset.skin = skinId
  const fr = buildFrame2(stage, {
    icon: artV2(artId), title: step.label || skin.name || '', sub: skin.sub || 'Giữ để rót, thả tay đúng vạch.',
    steps: Number(ctx.stepTotal) > 0 ? { index: ctx.stepIndex, total: ctx.stepTotal, grades: ctx.stepGrades || [] } : null,
    timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })

  // ---- bình chứa: ly (hình đạo cụ, nước dưới hình) hoặc tô tự vẽ (mặt nước trong miệng tô) ----
  const lyMeta = PROP_META.ly_lon && PROP_META.ly_lon.mouth ? PROP_META.ly_lon : LY_FALLBACK
  const M = skinId === 'to' ? BOWL : lyMeta
  const [VW, VH] = M.vb
  const px = x => (x / VW * 100).toFixed(2) + '%'
  const py = y => (y / VH * 100).toFixed(2) + '%'
  const style = { '--liq': cBody, '--liq-top': cTop, '--liq-bits': cBits || 'transparent' }
  const level = h('div', { class: 'rot-level', 'data-testid': 'rot-level', 'data-v': '0' }, h('i', { class: 'rot-surface' }))
  let liquidBox, iceEls = [], ringA = null, ringB = null
  const vessel = h('div', { class: ['rot-vessel', 'is-' + skinId] })
  if (skinId === 'to') {
    // mặt nước: elip trong miệng tô (cắt theo elip miệng), vạch mục tiêu là hai vòng nét đứt ở mực a và b
    const R = BOWL.rim
    liquidBox = h('div', { class: 'rot-liquid', style: { left: px(R.cx - R.rx), top: py(R.cy - R.ry), width: px(2 * R.rx), height: py(2 * R.ry) } }, level)
    ringA = h('i', { class: 'rot-ring' })
    ringB = h('i', { class: 'rot-ring' })
    liquidBox.append(ringA, ringB)
    vessel.append(svgBox(BOWL_BACK, 'rot-art rot-art-back'), liquidBox, svgBox(BOWL_FRONT, 'rot-art rot-art-front'))
    if (cBits) for (const i of [1, 2, 3, 4, 5, 6]) level.firstChild.append(h('b', { class: 'rot-bit k' + i }))
  } else {
    // nước dưới hình ly (thân trong suốt), cắt theo hình thang lòng ly + đáy
    const c = lyMeta
    const x0 = Math.min(c.left[0][0], c.left[1][0]), x1 = Math.max(c.right[0][0], c.right[1][0])
    const y0 = c.mouth.cy - c.mouth.ry, y1 = c.bottom.cy + c.bottom.ry
    const rx = x => ((x - x0) / (x1 - x0) * 100).toFixed(1) + '%'
    const ry = y => ((y - y0) / (y1 - y0) * 100).toFixed(1) + '%'
    const clip = `polygon(${rx(c.left[0][0])} 0%, ${rx(c.right[0][0])} 0%, ${rx(c.right[0][0])} ${ry(c.mouth.cy)}, ${rx(c.right[1][0])} ${ry(c.right[1][1])}, ` +
      `${rx(c.bottom.cx + c.bottom.rx * 0.7)} 100%, ${rx(c.bottom.cx - c.bottom.rx * 0.7)} 100%, ${rx(c.left[1][0])} ${ry(c.left[1][1])}, ${rx(c.left[0][0])} ${ry(c.mouth.cy)})`
    liquidBox = h('div', { class: 'rot-liquid', style: { left: px(x0), top: py(y0), width: px(x1 - x0), height: py(y1 - y0), clipPath: clip, webkitClipPath: clip } }, level)
    const lyArt = propV2('ly_lon')
    vessel.append(liquidBox, lyArt ? svgBox(lyArt, 'rot-art rot-art-glass') : h('div', { class: 'rot-glass-css' }))
    if (iced) {
      for (const i of [0, 1]) {
        const ice = svgBox(artV2('da', 'mot_vien'), 'rot-ice i' + i)
        iceEls.push(ice)
        liquidBox.append(ice)
      }
    }
  }
  const zoneEl = h('div', { class: ['rot-zone', 'is-' + skinId], 'data-testid': 'rot-zone', 'data-a': za.toFixed(3), 'data-b': zb.toFixed(3) },
    h('span', { class: 'rot-zone-ok' }, '✓'))
  const puddle = h('div', { class: 'rot-puddle' })
  const streamSvg = h('div', { class: 'rot-stream' })
  const drops = h('div', { class: 'rot-drops' })
  const pourerArt = h('div', { class: 'rot-pourer-art' }, svgBox(kettle ? KETTLE : artV2(artId), 'rot-pourer-svg'))
  const pourer = h('div', { class: ['rot-pourer', kettle ? 'is-kettle' : 'is-jar'] }, pourerArt)
  const steam = hot ? h('div', { class: 'rot-steam' }, h('i', { class: 's1' }), h('i', { class: 's2' })) : null
  const scene = h('div', { class: 'rot-scene', style }, puddle, streamSvg, vessel, zoneEl, drops, pourer, steam)
  fr.area.append(scene)

  const pour = h('button', { class: 'g-btn g-btn--primary rot-pour', type: 'button', 'data-testid': 'rot-pour' }, actText)
  const done = h('button', { class: 'g-btn g-btn--small mg-done', type: 'button', 'data-testid': 'rot-done', disabled: true }, 'Xong')
  const countN = h('span', { class: 'rot-count-n' }, `0/${ROT_MAX_POURS}`)
  const counter = h('div', { class: 'mg-count g-pill rot-count', 'data-testid': 'rot-count', 'aria-label': `${countText} 0/${ROT_MAX_POURS}` },
    h('span', { class: 'rot-count-label' }, countText), countN)
  fr.foot.append(counter, pour, done)

  // ---- bố cục theo cỡ thật ----
  let L = null
  let boxH = 0, iceSz = 0      // cỡ khung nước và viên đá (px), đo lại mỗi lần bố cục
  function layout() {
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return
    L = rotLayout(r.width, r.height, skinId, pose, lyMeta)
    const V = L.vessel
    const c = lyMeta
    boxH = skinId === 'to' ? 0 : (c.bottom.cy + c.bottom.ry - c.mouth.cy + c.mouth.ry) * V.s
    iceSz = Math.round((c.right[0][0] - c.left[0][0]) * 0.3 * V.s)
    for (const ice of iceEls) Object.assign(ice.style, { width: iceSz + 'px', height: iceSz + 'px' })
    Object.assign(vessel.style, { left: V.x + 'px', top: V.y + 'px', width: V.w + 'px', height: V.h + 'px' })
    Object.assign(pourer.style, { left: L.pourer.x + 'px', top: L.pourer.y + 'px', width: L.pourer.size + 'px', height: L.pourer.size + 'px' })
    pourer.style.setProperty('--rest', pose.rest + 'deg')
    pourer.style.setProperty('--pour', pose.pour + 'deg')
    Object.assign(puddle.style, { left: (V.x + V.w * 0.5) + 'px', top: (V.y + V.h - 6) + 'px', width: (V.w * 1.3) + 'px' })
    // vạch mục tiêu (px trong cảnh)
    const ya = V.y + levelY(za, skinId, lyMeta) * V.s, yb = V.y + levelY(zb, skinId, lyMeta) * V.s
    if (skinId === 'to') {
      Object.assign(zoneEl.style, { left: (V.x + (BOWL.rim.cx + BOWL.rim.rx) * V.s - 6) + 'px', top: (yb - 12) + 'px', width: '24px', height: '24px' })
      placeRing(ringA, za)
      placeRing(ringB, zb)
    } else {
      const fx = f => c.left[1][0] + (c.left[0][0] - c.left[1][0]) * f
      const lx = V.x + fx(zb) * V.s, rxp = V.x + (2 * c.mouth.cx - fx(zb)) * V.s
      Object.assign(zoneEl.style, { left: (lx + 3) + 'px', top: yb + 'px', width: (rxp - lx - 6) + 'px', height: Math.max(4, ya - yb) + 'px' })
    }
    // dòng chảy cong: từ miệng rót xuống đáy bình (phần chìm dưới mặt nước bị nước che)
    const M0 = L.mouth, B = L.land
    const sw = Math.max(5, Math.round(9 * V.s))
    const d = `M${M0.x} ${M0.y} Q ${M0.x + 14 * V.s} ${M0.y + 6} ${B.x} ${Math.min(B.y, M0.y + 24)} L ${B.x} ${B.y}`
    streamSvg.innerHTML = `<svg width="${Math.round(r.width)}" height="${Math.round(r.height)}" viewBox="0 0 ${Math.round(r.width)} ${Math.round(r.height)}" aria-hidden="true">` +
      `<path d="${d}" fill="none" stroke="#3a2618" stroke-width="${sw + 5}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${cBody}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="${Math.max(1.5, sw * 0.25)}" stroke-linecap="round" stroke-dasharray="6 10"/></svg>`
    streamSvg.style.transformOrigin = `${M0.x}px ${M0.y}px`
    drops.style.left = M0.x + 'px'
    drops.style.top = M0.y + 'px'
    if (steam) Object.assign(steam.style, { left: (V.x + V.w * 0.5) + 'px', top: (V.y + (skinId === 'to' ? 10 : 24) * V.s) + 'px' })
    setLevel(v)
  }
  // vòng mực (lớp vỏ tô) theo khung miệng tô: elip mặt nước ở mực f, đơn vị % của khung .rot-liquid
  function placeRing(el, f) {
    const R = BOWL.rim, S = bowlSurface(f)
    Object.assign(el.style, {
      left: ((S.cx - S.rx - (R.cx - R.rx)) / (2 * R.rx) * 100).toFixed(2) + '%', top: ((S.cy - S.ry - (R.cy - R.ry)) / (2 * R.ry) * 100).toFixed(2) + '%',
      width: (S.rx / R.rx * 100).toFixed(2) + '%', height: (S.ry / R.ry * 100).toFixed(2) + '%'
    })
  }

  let v = 0
  let pours = 0
  let pouring = false
  let holdStart = 0
  let spilled = false
  let resumable = false   // lượt rót bị ngắt vì rời tab: giữ lại để rót tiếp, không tính thêm lượt
  const timers = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }

  function setLevel(x) {
    v = x
    level.dataset.v = x.toFixed(3)
    level.classList.toggle('is-in', x >= za && x <= zb)
    zoneEl.classList.toggle('is-near', x >= za - 0.12 && x <= zb)
    zoneEl.classList.toggle('is-in', x >= za && x <= zb)
    if (skinId === 'to') {
      // mặt nước: elip ở mực x (biến hình từ elip miệng tô bằng transform)
      const R = BOWL.rim, S = bowlSurface(x)
      const dy = (S.cy - R.cy) / (2 * R.ry) * 100
      level.style.transform = `translateY(${dy.toFixed(2)}%) scale(${(S.rx / R.rx).toFixed(4)}, ${(S.ry / R.ry).toFixed(4)})`
      level.classList.toggle('is-empty', x <= 0.005)
    } else {
      const c = lyMeta
      const y0 = c.mouth.cy - c.mouth.ry, y1 = c.bottom.cy + c.bottom.ry
      const top = (levelY(x, 'ly', lyMeta) - y0) / (y1 - y0)
      level.style.transform = `translateY(${(clamp(top, 0, 1) * 100).toFixed(2)}%)`
      level.classList.toggle('is-empty', x <= 0.005)
      // đá nổi trên mặt nước (chưa có nước thì nằm đáy ly)
      if (iceEls.length && boxH) {
        iceEls.forEach((ice, i) => {
          const yTop = clamp(top, 0, 1) * boxH - iceSz * (0.45 - 0.12 * i)
          const yMax = boxH * (1 - c.bottom.ry / (y1 - y0) * 0.6) - iceSz
          ice.style.transform = `translateY(${Math.min(yTop, yMax).toFixed(1)}px) rotate(${i ? 14 : -10}deg)`
        })
      }
    }
  }

  layout()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(layout) : null
  if (ro) ro.observe(scene)

  function start() {
    if (out.done || pouring || spilled) return
    if (resumable) resumable = false
    else if (pours >= ROT_MAX_POURS) return
    else pours++
    pouring = true
    holdStart = clock.elapsed()
    feedback(ctx, 'pour')
    stage.classList.add('is-pouring')
    pour.classList.add('is-down')
    countN.textContent = `${pours}/${ROT_MAX_POURS}`
    counter.setAttribute('aria-label', `${countText} ${pours}/${ROT_MAX_POURS}`)
    if (pours >= 2) pour.textContent = moreText
  }
  function dribble() {
    // vài giọt rơi trễ từ miệng rót sau khi thả tay (giảm chuyển động: bỏ)
    if (reduced() || !L) return
    const fall = Math.max(20, L.land.y - L.mouth.y - 8)
    for (const i of [0, 1]) {
      const d = h('i', { class: 'rot-drip', style: { '--fall': fall + 'px', animationDelay: (i * 120) + 'ms' } })
      drops.append(d)
      later(() => d.remove(), 760)
    }
  }
  function stop() {
    if (!pouring) return
    pouring = false
    stage.classList.remove('is-pouring')
    pour.classList.remove('is-down')
    feedback(ctx, 'tap')
    dribble()
    if (pours >= ROT_MAX_POURS) { later(finish, 250); return }
    done.disabled = false
    pour.textContent = moreText
  }

  const unbind = bindPointer(pour, { down: start, up: stop, cancel: stop }, { space: true })
  done.addEventListener('click', () => finish())
  // Rời tab khi đang giữ rót: chỉ tạm dừng dòng rót, lượt đó vẫn dở (không bật "Xong", không tự kết thúc).
  function pauseHidden() {
    if (!pouring) return
    pouring = false
    resumable = true
    stage.classList.remove('is-pouring')
    pour.classList.remove('is-down')
    pour.textContent = skin.actResume || 'Giữ để rót tiếp'
  }
  const onVis = () => { if (document.hidden) pauseHidden() }
  document.addEventListener('visibilitychange', onVis)

  // Sân khấu bếp ở màn thấp cuộn dọc: cuộn sẵn để bình chứa và vạch nằm trên thanh chân.
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

  const loop = frameLoop(dt => {
    const t = clock.elapsed()
    if (pouring) {
      const sp = rotSpeed(v, t - holdStart, pours, za)
      setLevel(v + sp * dt)
      if (v > ROT_SPILL) spill()
    }
    fr.setTime(t / limit)
    if (t >= limit) finish()
  })

  function spill() {
    if (spilled) return
    spilled = true
    pouring = false
    stage.classList.remove('is-pouring')
    stage.classList.add('is-spilled')
    feedback(ctx, 'spill')
    if (vfx && typeof vfx.burst === 'function' && !reduced()) vfx.burst(vessel, 'drop', { n: 7, colors: [cBody, cTop] })
    const wipe = h('div', { class: 'rot-wipe' }, 'Tràn rồi! Lau bàn…')
    scene.appendChild(wipe)
    loop.stop()
    later(finish, 650)
  }

  function finish() {
    if (out.done) return
    const lv = Math.round(v * 1000) / 1000
    cleanup()
    const score = scoreRot({ level: lv, zone, mul })
    if (!spilled) feedback(ctx, score >= 90 ? 'good' : 'ok')
    out.settle({ score, details: { level: lv, pours, zone: zone.slice(), shown: [za, zb], elapsed: clock.elapsed() } })
  }

  function cleanup() {
    pouring = false
    stage.classList.remove('is-pouring')
    loop.stop()
    clock.destroy()
    unbind()
    if (ro) ro.disconnect()
    document.removeEventListener('visibilitychange', onVis)
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

export default { type: 'rot', mount }
