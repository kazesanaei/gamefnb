// LAC — lắc bình / lắc rổ (M5, bản TẠM chơi được; gói Pha trộn làm đẹp sau, giữ nguyên hợp đồng testid/data-*).
// Kéo bình (rổ) lên xuống; mỗi lần đổi chiều theo trục Y vượt ngưỡng 24px là một lượt lắc (createReversalCounter). Không dùng
// cảm biến chuyển động (iOS bắt xin quyền). Đủ lượt thì tự xong. Chấm: scoreLac (lượt / K, nhịp không đều −10, quá 2 × par −15).
// Hợp đồng e2e: lac-area (vùng kéo); lac-shaker (bình/rổ đi theo ngón); lac-count[data-v = số lượt, data-n = K].
// Lớp vỏ (step.skin): binh | ro → stage[data-skin].
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreLac } from '../../core/minigame-scoring.js'
import { createClock, frameLoop, settleOnce, feedback } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2 } from '../art/v2.js'
import { isReduced } from '../motion.js'
import { createReversalCounter, gestureLimitSec } from './_gesture.js'

export const LAC_THRESHOLD = 24        // px: đổi chiều quá ngưỡng này mới tính một lượt (chống rung tay)
export const LAC_TRAVEL = 70           // px: bình đi theo ngón tối đa mỗi phía

function cue(ctx, name, fallback) {
  const app = ctx && ctx.app
  if (!app || typeof app.sound !== 'function') return
  const names = app.audio && Array.isArray(app.audio.names) ? app.audio.names : null
  const pick = names && !names.includes(name) ? fallback : name
  try { if (pick) app.sound(pick) } catch { /* bỏ qua */ }
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

function artBox(svg, style = '') {
  const box = svgBox(svg, 'mg-art', { style: 'display:block;' + style })
  const s = box.firstElementChild
  if (s) { s.style.width = '100%'; s.style.height = '100%'; s.style.display = 'block' }
  return box
}

// Bình lắc (vẽ bằng CSS khi bộ hình chưa có đạo cụ lớn): thân, nắp, bọt dâng theo tiến độ.
function shakerBody(skinId, foam) {
  if (skinId === 'ro') {
    return h('div', {
      class: 'lac-ro',
      style: 'position:absolute;left:0;right:0;bottom:0;height:62%;border:4px solid #3a2618;border-radius:12px 12px 48% 48%;overflow:hidden;' +
        'background:repeating-linear-gradient(45deg,#d9a85b 0 8px,#c48c3f 8px 16px);box-shadow:0 5px 0 rgba(58,38,24,.3);'
    },
    // miếng cùi bưởi trong rổ, phủ bột trắng dần (foam = lớp bột)
    h('div', { style: 'position:absolute;inset:18% 12% 30%;border-radius:40%;background:radial-gradient(circle at 25% 40%,#f6e3a8 0 14%,transparent 15%),radial-gradient(circle at 55% 55%,#f2d98e 0 15%,transparent 16%),radial-gradient(circle at 78% 38%,#f6e3a8 0 13%,transparent 14%);' }),
    foam)
  }
  return h('div', {
    class: 'lac-binh',
    style: 'position:absolute;left:18%;right:18%;top:0;bottom:0;'
  },
  h('div', { style: 'position:absolute;left:22%;right:22%;top:0;height:16%;border:4px solid #3a2618;border-radius:10px 10px 4px 4px;background:#c9ccd1;' }),
  h('div', {
    style: 'position:absolute;left:0;right:0;top:13%;bottom:0;border:4px solid #3a2618;border-radius:14px 14px 22px 22px;overflow:hidden;' +
      'background:linear-gradient(180deg,#e9f5f8,#bfe0ea);box-shadow:0 5px 0 rgba(58,38,24,.3);'
  },
  h('div', { style: 'position:absolute;left:0;right:0;bottom:0;height:58%;background:#d9a441;' }),
  foam,
  h('div', { style: 'position:absolute;left:12%;top:8%;width:16%;height:60%;border-radius:8px;background:rgba(255,255,255,.45);' })))
}

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const K = Math.max(1, Math.floor(Number(params.strokes) || 1))
  const mul = ctx.zoneMul || 1
  const limit = gestureLimitSec(step, { assist: !!ctx.assist, untimed: !!ctx.untimed })
  const clock = createClock()
  const out = settleOnce()
  const vfx = ctx.vfx || null
  const reduced = reducedOf(ctx)
  const T = ((ctx.data || {}).MINIGAME_TYPES || {}).lac || {}
  const skinId = step.skin === 'ro' ? 'ro' : 'binh'
  const skin = (T.skins && T.skins[skinId]) || {}
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const headSvg = step.ing ? artV2((INGS[step.ing] && INGS[step.ing].icon) || step.ing) : artV2((ctx.recipe && ctx.recipe.icon) || 'fallback')

  stage.classList.add('mg-lac', 'skin-' + skinId)
  stage.dataset.skin = skinId
  const fr = buildFrame2(stage, {
    icon: headSvg, title: step.label || skin.name || T.name || '', sub: skin.sub || 'Kéo lên xuống cho đủ lượt.',
    steps: Number(ctx.stepTotal) > 0 ? { index: ctx.stepIndex, total: ctx.stepTotal, grades: ctx.stepGrades || [] } : null,
    timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })

  const foam = h('div', {
    class: 'lac-foam',
    style: skinId === 'ro'
      ? 'position:absolute;inset:0;background:rgba(255,255,255,.9);opacity:0;pointer-events:none;'
      : 'position:absolute;left:0;right:0;bottom:58%;height:0%;background:repeating-radial-gradient(circle at 30% 60%,#fffaf0 0 5px,#f4e6c8 5px 8px);pointer-events:none;'
  })
  const propSvg = propV2(skinId === 'ro' ? 'ro_lon' : 'binh_lac_lon')
  const shakerArt = h('div', { class: 'lac-shaker-art', style: 'position:absolute;inset:0;' },
    propSvg ? artBox(propSvg, 'position:absolute;inset:0;width:100%;height:100%;') : null,
    propSvg ? foam : shakerBody(skinId, foam))
  const shaker = h('div', {
    class: 'lac-shaker', 'data-testid': 'lac-shaker',
    style: 'position:absolute;left:50%;top:50%;margin:0;transform:translate(-50%,-50%);z-index:2;'
  }, shakerArt)
  // mũi tên lên/xuống (gợi ý cử chỉ, tĩnh)
  const arrows = h('div', {
    class: 'lac-arrows', 'aria-hidden': 'true',
    style: 'position:absolute;right:10px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;color:#3a2618;font:800 22px/1 var(--g-font-display,system-ui);opacity:.55;pointer-events:none;'
  }, h('span', null, '▲'), h('span', null, '▼'))
  const area = h('div', {
    class: 'lac-area', 'data-testid': 'lac-area', role: 'application', 'aria-label': 'Kéo lên xuống để lắc',
    style: 'position:relative;flex:1 1 0;width:100%;min-height:120px;touch-action:none;cursor:pointer;'
  }, shaker, arrows)
  fr.area.append(area)

  const countText = skin.count || 'Lượt lắc'
  const counter = h('div', { class: 'mg-count g-pill g-pill--big', 'data-testid': 'lac-count', 'data-v': '0', 'data-n': String(K) })
  fr.foot.append(counter)

  let travel = LAC_TRAVEL
  function fit() {
    const r = area.getBoundingClientRect()
    if (!r.width || !r.height) return
    // bình đi lên xuống tối đa `travel` mỗi phía mà vẫn nằm gọn trong vùng kéo (không chui xuống thanh chân)
    const want = Math.max(24, Math.min(LAC_TRAVEL, r.height * 0.2))
    const hgt = Math.max(80, Math.min(210, r.height - 2 * want - 8))
    const wid = skinId === 'ro' ? Math.min(r.width - 70, hgt * 1.5) : hgt * 0.62
    shaker.style.width = Math.round(wid) + 'px'
    shaker.style.height = Math.round(hgt) + 'px'
    travel = Math.max(16, Math.min(LAC_TRAVEL, (r.height - hgt) / 2 - 4))
  }
  fit()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
  if (ro) ro.observe(area)

  const rc = createReversalCounter({ threshold: LAC_THRESHOLD })
  let drag = null
  let ending = false
  let shown = 0
  const timers = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }

  function setPose(dy) {
    const y = Math.max(-travel, Math.min(travel, dy))
    // bình nghiêng theo ngón (phản hồi trực tiếp: giữ cả khi giảm chuyển động)
    shakerArt.style.transform = `translateY(${y.toFixed(1)}px) rotate(${(y * 0.12).toFixed(2)}deg)`
  }

  function render() {
    const k = rc.count
    counter.textContent = `${countText} ${Math.min(k, K)}/${K}`
    counter.dataset.v = String(k)
    const f = Math.min(1, k / K)
    if (skinId === 'ro') foam.style.opacity = (f * 0.85).toFixed(3)
    else foam.style.height = (f * 34).toFixed(1) + '%'
  }
  render()

  const unbind = bindPointer(area, {
    down(p) {
      if (out.done) return
      drag = { y0: p.clientY }
      rc.reset()
      rc.push(p.clientY, p.t / 1000)
      shakerArt.style.transition = 'none'
    },
    move(p) {
      if (!drag || out.done) return
      setPose(p.clientY - drag.y0)
      const k = rc.push(p.clientY, p.t / 1000)
      if (k > shown) {
        shown = k
        cue(ctx, 'shake', 'click')
        render()
        if (vfx && !reduced() && skinId !== 'ro') vfx.burst(shaker, 'drop', { n: 2, colors: ['#fffaf0', '#bfe0ea'] })
        if (k >= K && !ending) { ending = true; later(finish, 200) }
      }
    },
    up() { release() },
    cancel() { release() }
  })

  function release() {
    drag = null
    shakerArt.style.transition = reduced() ? 'none' : 'transform .18s ease-out'
    setPose(0)
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
    const score = scoreLac({ strokes, target: K, cv, elapsed, par: step.par, mul })
    feedback(ctx, score >= 90 ? 'good' : score < 50 ? 'bad' : 'ok')
    out.settle({ score, details: { strokes, target: K, cv, elapsed } })
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    unbind()
    if (ro) ro.disconnect()
    drag = null
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
