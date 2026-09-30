// CHA — chà rửa / gọt / bóc (params.spots) hoặc lắc / trộn / khuấy / bóp (params.strokes).
// spots: vuốt qua từng vết đủ quãng để sạch dần; strokes: vuốt qua lại, đếm số lần đổi chiều.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreCha } from '../../core/minigame-scoring.js'
import {
  clamp, createClock, frameLoop, settleOnce, feedback, stepLimitSec, buildFrame, ingIcon,
  createReversalCounter, uiRand
} from './_util.js'

export const SPOT_RADIUS = 30          // bán kính vết (px), vùng chạm = bán kính + 10
export const SPOT_NEED_PX = 140        // quãng vuốt cần để sạch một vết (chia cho hệ số vùng)

// Bố trí n vết trong hình tròn bán kính r quanh (cx, cy), cách nhau ≥ minGap.
export function layoutSpots(n, cx, cy, r, minGap, rand = Math.random) {
  const pts = []
  let tries = 0
  while (pts.length < n && tries < 600) {
    tries++
    const ang = rand() * Math.PI * 2
    const dist = Math.sqrt(rand()) * r
    const x = cx + Math.cos(ang) * dist
    const y = cy + Math.sin(ang) * dist * 0.8
    const gap = tries > 300 ? minGap * 0.6 : minGap
    if (pts.every(p => Math.hypot(p.x - x, p.y - y) >= gap)) pts.push({ x, y })
  }
  while (pts.length < n) pts.push({ x: cx + (rand() - 0.5) * r, y: cy + (rand() - 0.5) * r })
  return pts
}

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const mul = ctx.zoneMul || 1
  const limit = ctx.untimed ? Infinity : stepLimitSec(step.par, ctx.assist)   // Nấu thử: không giới hạn
  const clock = createClock()
  const out = settleOnce()
  const rand = ctx.rand || Math.random
  const isStrokes = !(Number(params.spots) > 0) && Number(params.strokes) > 0
  stage.classList.add('mg-cha', isStrokes ? 'is-strokes' : 'is-spots')

  const hint = isStrokes ? 'Vuốt qua lại thật đều tay.' : 'Vuốt qua lại lên các vết bẩn cho sạch.'
  const fr = buildFrame(stage, step, ctx, { sub: hint })
  const food = h('div', { class: 'cha-food' }, svgBox(ingIcon(step.ing, ctx, step.icon || null), 'cha-food-icon'))
  const pad = h('div', { class: 'cha-pad', 'data-testid': 'cha-area' }, food)
  const barFill = h('div', { class: 'mg-bar-fill' })
  const bar = h('div', { class: 'mg-bar', 'data-testid': 'cha-progress', 'data-v': '0' }, barFill)
  const label = h('div', { class: 'mg-count' })
  fr.area.append(pad)
  fr.foot.append(bar, label)
  let ended = false

  function setProgress(v, text) {
    const f = clamp(v, 0, 1)
    barFill.style.transform = `scaleX(${f})`
    bar.dataset.v = f.toFixed(3)
    label.textContent = text
  }

  // ---- chế độ vết bẩn ----
  const spots = []
  if (!isStrokes) {
    const n = Math.max(1, Math.floor(Number(params.spots) || 1))
    const rect = pad.getBoundingClientRect()
    const w = rect.width || 320
    const hgt = rect.height || 260
    const r = Math.max(40, Math.min(w, hgt) / 2 - SPOT_RADIUS - 12)
    const gap = n > 6 ? 50 : 64
    const pts = layoutSpots(n, w / 2, hgt / 2, r, gap, rand)
    pts.forEach((p, i) => {
      const el = h('div', {
        class: 'cha-spot', 'data-testid': 'cha-spot-' + i, 'data-clean': '0',
        style: { left: p.x + 'px', top: p.y + 'px', '--size': SPOT_RADIUS * 2 + 'px' }
      })
      pad.appendChild(el)
      spots.push({ x: p.x, y: p.y, clean: 0, el })
    })
  }
  const need = SPOT_NEED_PX / (mul > 0 ? mul : 1)
  const hitR = SPOT_RADIUS + 10

  function updateSpots() {
    const avg = spots.reduce((s, sp) => s + sp.clean, 0) / Math.max(1, spots.length)
    setProgress(avg, `Sạch ${Math.round(avg * 100)}%`)
    if (spots.every(sp => sp.clean >= 1)) {
      food.classList.add('is-washed')
      endSoon()
    }
  }

  // ---- chế độ đổi chiều ----
  const strokes = Math.max(1, Math.floor(Number(params.strokes) || 1))
  const rev = createReversalCounter(22)
  function updateStrokes() {
    const c = rev.count
    setProgress(c / strokes, `${Math.min(c, strokes)}/${strokes} lượt`)
    if (c >= strokes) {
      food.classList.add('is-mixed')
      endSoon()
    }
  }

  let last = null
  const unbind = bindPointer(pad, {
    down(p) { last = p; if (isStrokes) rev.push(p.x) },
    move(p) {
      if (!last || ended) return
      const seg = Math.hypot(p.x - last.x, p.y - last.y)
      if (!isStrokes) {
        let changed = false
        for (const sp of spots) {
          if (sp.clean >= 1) continue
          if (Math.hypot(p.x - sp.x, p.y - sp.y) <= hitR) {
            sp.clean = Math.min(1, sp.clean + seg / need)
            sp.el.style.setProperty('--clean', sp.clean.toFixed(3))
            sp.el.dataset.clean = sp.clean.toFixed(2)
            if (sp.clean >= 1) { sp.el.classList.add('is-clean'); feedback(ctx, 'tap') }
            changed = true
          }
        }
        if (changed) updateSpots()
      } else {
        const before = rev.count
        rev.push(p.x)
        food.style.setProperty('--dx', clamp(p.x - pad.clientWidth / 2, -60, 60) + 'px')
        if (rev.count !== before) { feedback(ctx, 'tap'); updateStrokes() }
      }
      last = p
    },
    up() { last = null; if (isStrokes) food.style.setProperty('--dx', '0px') },
    cancel() { last = null }
  }, { space: false })

  if (isStrokes) updateStrokes()
  else updateSpots()

  const loop = frameLoop(() => {
    const t = clock.elapsed()
    fr.setTime(t / limit)
    if (t >= limit) finish()
  })

  function endSoon() {
    if (ended) return
    ended = true
    feedback(ctx, 'good')
    setTimeout(finish, 220)
  }

  function finish() {
    if (out.done) return
    const elapsed = clock.elapsed()
    cleanup()
    let score, details
    if (isStrokes) {
      score = scoreCha({ reversals: rev.count, strokes, elapsed, par: ctx.untimed ? Infinity : step.par })
      details = { reversals: rev.count, strokes, elapsed }
    } else {
      const cl = spots.map(s => Math.round(s.clean * 1000) / 1000)
      score = scoreCha({ spots: cl, elapsed, par: ctx.untimed ? Infinity : step.par })
      details = { spots: cl, elapsed }
    }
    out.settle({ score, details })
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    unbind()
  }

  return { result: out.promise, destroy() { cleanup(); out.settle(null) } }
}

export default { type: 'cha', mount }
