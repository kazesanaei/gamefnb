// LAC — lắc bình / lắc rổ (M5, gói Pha trộn E3). Bình lắc inox (rổ tre) TO giữa cảnh; kéo lên xuống để lắc: bình đi theo
// ngón và nghiêng theo hướng kéo (phản hồi trực tiếp — giữ cả khi giảm chuyển động); mỗi lần đổi chiều theo trục Y vượt
// ngưỡng 24px là một lượt lắc (createReversalCounter), kèm tiếng đá lách cách (âm shake) và vệt rung hai bên bình. Không
// dùng cảm biến chuyển động (iOS bắt xin quyền). Bình: hơi lạnh đọng dần trên thân, bọt dâng trào ở khe nắp theo số lượt.
// Rổ: cùi bưởi hạt lựu trong lòng rổ, đống bột năng vơi dần và bột trắng phủ dần lên từng hạt, bụi bột bay. Mũi tên lên
// xuống bên cạnh làm gợi ý tới lượt lắc đầu tiên. Đủ lượt thì tự xong.
// Chấm: scoreLac (lượt / K, nhịp không đều −10, quá 2 × par −15 — core/minigame-scoring.js, không đổi); nấu thử
// (ctx.untimed) không phạt quá giờ.
// Hợp đồng e2e (giữ từ bản tạm gói A): lac-area (vùng kéo); lac-shaker (bình/rổ, hộp đứng yên giữa vùng — phần hình bên trong
// đi theo ngón); lac-count[data-v = số lượt, data-n = K]. Lớp vỏ (step.skin): binh | ro → lớp gốc .mg-lac.skin-<id>,
// stage[data-skin].
// Cách giải tự động: nhấn giữa lac-shaker, kéo lên xuống ±70px (5 bước mỗi lần, chờ ~24 ms giữa các lần) tới khi đủ data-n.
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

const f1 = v => Math.round(v * 10) / 10

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
    icon: headSvg, title: step.label || skin.name || T.name || '', sub: skin.sub || 'Kéo lên xuống cho đủ lượt.',
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
  const area = h('div', {
    class: 'lac-area', 'data-testid': 'lac-area', role: 'application', 'aria-label': skin.name || 'Kéo lên xuống để lắc'
  }, shaker, hint)
  fr.area.append(area)

  const countText = skin.count || 'Lượt lắc'
  const counter = h('div', { class: 'mg-count g-pill g-pill--big lac-count', 'data-testid': 'lac-count', 'data-v': '0', 'data-n': String(K) })
  fr.foot.append(counter)

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
  let shown = 0
  let tilt = 0
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
    counter.textContent = `${countText} ${Math.min(k, K)}/${K}`
    counter.dataset.v = String(k)
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

  // Mỗi lượt lắc: tiếng đá (shake), vệt rung hai bên chớp lên; rổ: hạt cùi nảy ngược chiều và bụi bột bay.
  function onStroke(k, dirY) {
    sound(ctx, 'shake')
    render()
    if (k === 1) { hint.classList.add('is-off'); later(() => { hint.hidden = true }, 320) }
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
      if (out.done) return
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
        if (k >= K && !ending) {
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

  function release() {
    drag = null
    move.classList.remove('is-held')
    tilt = 0
    move.style.transform = 'translateY(0) rotate(0deg)'
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
    const elapsed = clock.elapsed()
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
