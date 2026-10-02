// XOAY — khuấy / trộn / đánh bông (M5, bản TẠM chơi được; gói Pha trộn làm đẹp sau, giữ nguyên hợp đồng testid/data-*).
// Vẽ vòng quanh tâm tô (ly, chén), chiều nào cũng được; đủ số vòng thì tự xong. Quay quá nhanh (> 2,2 × mul vòng/giây, gấp
// 1,8 lần nếu params.fast) liên tục quá 0,25 s thì sánh ra ngoài (−12 điểm mỗi lần). Chấm: scoreXoay (core/minigame-scoring.js).
// Hợp đồng e2e: xoay-bowl (lấy tâm và bán kính bằng boundingBox); xoay-progress[data-v = số vòng (2 chữ số), data-n = mục
// tiêu]; xoay-speed[data-v = vòng/giây, data-max]. Lớp vỏ (step.skin): to | ly | chen → stage[data-skin].
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreXoay } from '../../core/minigame-scoring.js'
import { createClock, frameLoop, settleOnce, feedback } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2 } from '../art/v2.js'
import { isReduced } from '../motion.js'
import { createTurnCounter, createSpillMeter, gestureLimitSec } from './_gesture.js'

export const XOAY_MAX_SPEED = 2.2      // vòng/giây (× mul; × 1,8 khi đánh bông nhanh)
export const XOAY_FAST_MUL = 1.8

// Màu hỗn hợp theo lớp vỏ: [lúc đầu, lúc đã hòa] (lớp phủ màu hòa dần theo số vòng).
const SKIN_LOOK = Object.freeze({
  to: Object.freeze({ prop: 'to_lon', rim: '#f3efe6', from: '#f0dca8', to: '#d9813f', fleck: '#7cc35a' }),
  ly: Object.freeze({ prop: 'ly_lon', rim: '#dff1f7', from: '#3b2416', to: '#a8744a', fleck: '#fffaf0' }),
  chen: Object.freeze({ prop: 'chen_lon', rim: '#f6efe2', from: '#e9dcc4', to: '#fffaf0', fleck: '#c9b48e' })
})

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

// Vệt xoáy (vẽ bằng SVG, xoay theo góc ngón tay đã đi).
const SWIRL = '<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke-linecap="round">' +
  '<path d="M50 14a36 36 0 0 1 36 36" stroke="rgba(255,250,240,.75)" stroke-width="6"/>' +
  '<path d="M50 86a36 36 0 0 1-36-36" stroke="rgba(255,250,240,.75)" stroke-width="6"/>' +
  '<path d="M50 30a20 20 0 0 1 20 20" stroke="rgba(58,38,24,.35)" stroke-width="4"/>' +
  '<path d="M50 70a20 20 0 0 1-20-20" stroke="rgba(58,38,24,.35)" stroke-width="4"/></g></svg>'

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const target = Math.max(1, Math.floor(Number(params.turns) || 1))
  const mul = ctx.zoneMul || 1
  const maxSpeed = Math.round(XOAY_MAX_SPEED * mul * (params.fast ? XOAY_FAST_MUL : 1) * 100) / 100
  const limit = gestureLimitSec(step, { assist: !!ctx.assist, untimed: !!ctx.untimed })
  const clock = createClock()
  const out = settleOnce()
  const vfx = ctx.vfx || null
  const reduced = reducedOf(ctx)
  const T = ((ctx.data || {}).MINIGAME_TYPES || {}).xoay || {}
  const skinId = SKIN_LOOK[step.skin] ? step.skin : 'to'
  const skin = (T.skins && T.skins[skinId]) || {}
  const look = SKIN_LOOK[skinId]
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const headSvg = step.icon ? artV2(step.icon) : step.ing ? artV2((INGS[step.ing] && INGS[step.ing].icon) || step.ing) : artV2((ctx.recipe && ctx.recipe.icon) || 'fallback')

  stage.classList.add('mg-xoay', 'skin-' + skinId)
  stage.dataset.skin = skinId
  const fr = buildFrame2(stage, {
    icon: headSvg, title: step.label || skin.name || T.name || '', sub: skin.sub || 'Vẽ vòng quanh tô cho đủ số vòng.',
    steps: Number(ctx.stepTotal) > 0 ? { index: ctx.stepIndex, total: ctx.stepTotal, grades: ctx.stepGrades || [] } : null,
    timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })

  // Tô nhìn từ trên xuống: vành, mặt hỗn hợp (màu đầu) + lớp màu đã hòa (opacity theo tiến độ), vệt xoáy, muỗng theo ngón.
  const propSvg = propV2(look.prop)
  const mixTo = h('div', { class: 'xoay-mix-to', style: `position:absolute;inset:0;border-radius:50%;background:${look.to};opacity:0;` })
  const flecks = h('div', {
    class: 'xoay-flecks',
    style: `position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 30% 35%,${look.fleck} 0 3%,transparent 4%),radial-gradient(circle at 62% 28%,${look.fleck} 0 2.5%,transparent 3.5%),radial-gradient(circle at 70% 64%,${look.fleck} 0 3%,transparent 4%),radial-gradient(circle at 38% 72%,${look.fleck} 0 2.5%,transparent 3.5%);`
  })
  const swirl = h('div', { class: 'xoay-swirl', style: 'position:absolute;inset:6%;pointer-events:none;' }, artBox(SWIRL, 'width:100%;height:100%;'))
  const surface = h('div', {
    class: 'xoay-surface',
    style: `position:absolute;inset:12%;border-radius:50%;overflow:hidden;background:${look.from};border:3px solid #3a2618;`
  }, mixTo, flecks, swirl)
  const guide = h('div', {
    class: 'xoay-guide',
    style: 'position:absolute;inset:24%;border-radius:50%;border:3px dashed rgba(255,250,240,.85);pointer-events:none;'
  })
  const spoon = h('div', {
    class: 'xoay-spoon', hidden: true,
    style: 'position:absolute;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:#c9ccd1;border:3px solid #3a2618;box-shadow:0 2px 0 rgba(58,38,24,.35);pointer-events:none;z-index:3;'
  })
  const bowlFx = h('div', { class: 'xoay-bowl-fx', style: 'position:absolute;inset:0;' },
    propSvg ? artBox(propSvg, 'position:absolute;inset:0;width:100%;height:100%;') : null, surface, guide)
  const bowl = h('div', {
    class: 'xoay-bowl', 'data-testid': 'xoay-bowl', role: 'application', 'aria-label': 'Tô cần khuấy',
    style: 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(300px,92%);max-height:96%;aspect-ratio:1;' +
      'border-radius:50%;touch-action:none;cursor:pointer;z-index:1;' +
      (propSvg ? '' : `background:${look.rim};border:4px solid #3a2618;box-shadow:0 5px 0 rgba(58,38,24,.35),inset 0 -6px 0 rgba(58,38,24,.12);`)
  }, bowlFx, spoon)
  const speedFill = h('div', { class: 'xoay-speed-fill', style: 'position:absolute;left:0;bottom:0;width:100%;height:0%;background:#43a63d;' })
  const speedMark = h('div', { style: `position:absolute;left:-3px;right:-3px;bottom:${(100 / 1.5).toFixed(1)}%;height:3px;background:#3a2618;` })
  const speed = h('div', {
    class: 'xoay-speed', 'data-testid': 'xoay-speed', 'data-v': '0', 'data-max': maxSpeed.toFixed(2),
    role: 'meter', 'aria-label': 'Tốc độ khuấy',
    style: 'position:absolute;right:6px;top:8px;width:14px;height:min(110px,60%);border:3px solid #3a2618;border-radius:8px;background:#fffaf0;overflow:hidden;z-index:2;'
  }, speedFill, speedMark)
  const scene = h('div', { class: 'xoay-scene', style: 'position:relative;flex:1 1 0;width:100%;min-height:120px;' }, bowl, speed)
  fr.area.append(scene)

  const countText = skin.count || 'Vòng'
  const progress = h('div', { class: 'mg-count g-pill g-pill--big', 'data-testid': 'xoay-progress', 'data-v': '0', 'data-n': String(target) })
  fr.foot.append(progress)

  // Bát luôn tròn và nằm gọn trong vùng chơi: cạnh = min(rộng, cao) của cảnh.
  function fit() {
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return
    const side = Math.max(96, Math.min(300, r.width * 0.92 - 24, r.height - 8))
    bowl.style.width = side + 'px'
    bowl.style.height = side + 'px'
  }
  fit()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
  if (ro) ro.observe(scene)

  const tc = createTurnCounter({ cx: 0, cy: 0, minR: 0 })
  const spill = createSpillMeter({ max: maxSpeed })
  let spills = 0
  let halves = 0
  let ending = false
  const timers = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }

  function renderProgress() {
    const v = Math.min(tc.turns, target)
    progress.textContent = `${countText} ${Math.floor(v)}/${target}`
    progress.dataset.v = v.toFixed(2)
    mixTo.style.opacity = (Math.min(1, v / target) * 0.92).toFixed(3)
  }
  renderProgress()

  function setSpeed(v) {
    const s = Math.max(0, v)
    speed.dataset.v = s.toFixed(2)
    speedFill.style.height = Math.min(100, (s / (maxSpeed * 1.5)) * 100).toFixed(1) + '%'
    speedFill.style.background = s > maxSpeed ? '#d8392b' : '#43a63d'
  }

  function onSpill(p) {
    spills++
    feedback(ctx, 'spill')
    if (vfx) vfx.floatText({ x: p.clientX, y: p.clientY }, 'Văng ra rồi!', { tone: 'bad', size: 'small' })
    if (vfx && !reduced()) {
      vfx.burst(bowl, 'drop', { n: 6, colors: [look.to, look.from] })
      vfx.shake(bowlFx, 1)
    } else {
      // giảm chuyển động: chớp viền đỏ tĩnh thay cho rung
      bowl.style.outline = '4px solid #d8392b'
      later(() => { bowl.style.outline = '' }, 300)
    }
  }

  function track(p) {
    const r = bowl.getBoundingClientRect()
    const R = r.width / 2
    tc.setCenter(R, R, R * 0.12)
    return { x: p.clientX - r.left, y: p.clientY - r.top, R }
  }

  const unbind = bindPointer(bowl, {
    down(p) {
      if (out.done) return
      const q = track(p)
      tc.lift()
      tc.push(q.x, q.y, p.t / 1000)
      spoon.hidden = false
      spoon.style.transform = `translate(${q.x}px, ${q.y}px)`
    },
    move(p) {
      if (out.done) return
      const r = bowl.getBoundingClientRect()
      const x = p.clientX - r.left, y = p.clientY - r.top
      const t = p.t / 1000
      tc.push(x, y, t)
      spoon.style.transform = `translate(${x}px, ${y}px)`
      // vệt xoáy quay theo góc đã đi (phản hồi trực tiếp)
      swirl.style.transform = `rotate(${(tc.turns * 360).toFixed(1)}deg)`
      const sp = tc.speed()
      setSpeed(sp)
      if (spill.push(sp, t)) onSpill(p)
      const hv = Math.floor(tc.turns * 2)
      if (hv > halves) { halves = hv; cue(ctx, 'stir', 'click') }
      renderProgress()
      if (tc.turns >= target && !ending) { ending = true; later(finish, 160) }
    },
    up() { tc.lift(); spoon.hidden = true; setSpeed(0) },
    cancel() { tc.lift(); spoon.hidden = true; setSpeed(0) }
  })

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
    const score = scoreXoay({ turns, target, spills, cv, elapsed, par: step.par, mul })
    feedback(ctx, score >= 90 ? 'good' : score < 50 ? 'bad' : 'ok')
    out.settle({ score, details: { turns, target, spills, cv, maxSpeed, elapsed } })
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    unbind()
    if (ro) ro.disconnect()
    spoon.hidden = true
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
