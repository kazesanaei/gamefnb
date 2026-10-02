// GOT — gọt vỏ (M5, bản TẠM chơi được; gói Sơ chế làm đẹp sau, giữ nguyên hợp đồng testid/data-*).
// Quả to giữa vùng chơi, vỏ chia K dải dọc (params.strips). Vuốt thẳng từ trên xuống (lệch ±35° × mul, tối đa 50°) trên một
// dải để gọt; độ phủ mỗi dải là HỢP các nhát vuốt (bandCoverage). Nhát vuốt nghiêng, ngược chiều hoặc trượt ra ngoài quả là
// nhát hụt (−8 mỗi nhát, tối đa −24). Mọi dải phủ ≥ 85% thì tự xong; bấm Xong để dừng sớm. Chấm: scoreGot.
// Hợp đồng e2e: got-fruit; got-band-<i>[data-done = độ phủ 0..1, 2 chữ số; data-lo, data-hi = đoạn cần gọt theo phần chiều
// cao quả] (dải là cột cao bằng quả, bị viền elip cắt; vuốt từ mép trên xuống mép dưới boundingBox của dải là phủ trọn);
// got-count[data-v = số dải xong, data-n = K]; got-done.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreGot } from '../../core/minigame-scoring.js'
import { createClock, frameLoop, settleOnce, feedback } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2 } from '../art/v2.js'
import { isReduced } from '../motion.js'
import { classifySwipe, bandCoverage, mergeSegments, gestureLimitSec } from './_gesture.js'

export const GOT_DONE_AT = 0.85        // dải phủ từ mức này coi như gọt xong (điểm dải đã tối đa)
export const GOT_SWIPE_MIN = 24
const TAP_MAX = 10

// Màu vỏ / ruột theo nguyên liệu.
const FRUIT = Object.freeze({
  xoai_xanh: Object.freeze({ skin: '#5f9e3c', dark: '#467a2b', flesh: '#f2e59a', shape: 'oval' }),
  vo_buoi: Object.freeze({ skin: '#9ccc4a', dark: '#7aa835', flesh: '#fff3d8', shape: 'round' })
})
const FRUIT_DEFAULT = Object.freeze({ skin: '#8bbf4a', dark: '#6d9a35', flesh: '#fbeec6', shape: 'oval' })

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

/** Dải dọc i (trên K) của quả hình elip rộng W cao H: { left, width, top, height } (px) — đoạn cần gọt của dải (dây cung
 *  của elip tại giữa dải; vuốt dọc giữa dải phần thấy được là phủ trọn). */
export function bandRect(i, K, W, H) {
  const w = W / K
  const cx = (i + 0.5) * w
  const A = W / 2, B = H / 2
  const t = Math.min(0.97, Math.abs(cx - A) / A)
  const half = B * Math.sqrt(1 - t * t)
  return { left: i * w, width: w, top: B - half, height: 2 * half }
}

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const K = Math.max(1, Math.floor(Number(params.strips) || 1))
  const mul = ctx.zoneMul || 1
  const tol = Math.min(50, 35 * mul)
  const limit = gestureLimitSec(step, { assist: !!ctx.assist, untimed: !!ctx.untimed })
  const clock = createClock()
  const out = settleOnce()
  const vfx = ctx.vfx || null
  const reduced = reducedOf(ctx)
  const T = ((ctx.data || {}).MINIGAME_TYPES || {}).got || {}
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const artId = (INGS[step.ing] && INGS[step.ing].icon) || step.ing || 'fallback'
  const look = FRUIT[step.ing] || FRUIT_DEFAULT

  stage.classList.add('mg-got')
  const fr = buildFrame2(stage, {
    icon: artV2(artId), title: step.label || T.name || '', sub: T.sub || 'Vuốt thẳng từ trên xuống theo từng dải vỏ.',
    steps: Number(ctx.stepTotal) > 0 ? { index: ctx.stepIndex, total: ctx.stepTotal, grades: ctx.stepGrades || [] } : null,
    timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })

  // Quả (elip) + các dải vỏ; phần đã gọt vẽ thành các khúc màu ruột trong dải.
  const fruit = h('div', {
    class: 'got-fruit', 'data-testid': 'got-fruit', 'data-shape': look.shape,
    style: `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:50%;border:4px solid #3a2618;overflow:hidden;` +
      `background:${look.skin};box-shadow:0 5px 0 rgba(58,38,24,.3);touch-action:none;`
  })
  const bands = []
  for (let i = 0; i < K; i++) {
    const peeled = h('div', { class: 'got-peeled', style: 'position:absolute;inset:0;pointer-events:none;' })
    const live = h('div', { class: 'got-live', hidden: true, style: `position:absolute;left:0;right:0;background:${look.flesh};opacity:.7;pointer-events:none;` })
    const el = h('div', {
      class: 'got-band', 'data-testid': 'got-band-' + i, 'data-done': '0',
      style: `position:absolute;background:linear-gradient(90deg,${look.dark},${look.skin} 35%,${look.skin} 70%,${look.dark});` +
        (i > 0 ? 'border-left:2px dashed rgba(58,38,24,.35);' : '')
    }, peeled, live)
    fruit.appendChild(el)
    bands.push({ el, peeled, live, segs: [], cov: 0, rect: null, lo: 0, hi: 1 })
  }
  // điểm sáng trên-trái (khối cel-shading)
  fruit.appendChild(h('div', { style: 'position:absolute;left:16%;top:12%;width:22%;height:14%;border-radius:50%;background:rgba(255,255,255,.45);pointer-events:none;' }))
  const knife = h('div', {
    class: 'got-knife', hidden: true,
    style: 'position:absolute;left:0;top:0;width:34px;height:10px;margin:-5px 0 0 -17px;border-radius:5px;background:#c9ccd1;border:3px solid #3a2618;pointer-events:none;z-index:3;'
  })
  const scene = h('div', { class: 'got-scene', style: 'position:relative;flex:1 1 0;width:100%;min-height:120px;touch-action:none;' }, fruit, knife)
  fr.area.append(scene)

  const countText = T.count || 'Dải'
  const counter = h('div', { class: 'mg-count g-pill g-pill--big', 'data-testid': 'got-count', 'data-v': '0', 'data-n': String(K) })
  const doneBtn = h('button', { class: 'g-btn g-btn--small mg-done', type: 'button', 'data-testid': 'got-done', disabled: true }, 'Xong')
  fr.foot.append(counter, doneBtn)

  let W = 0, H = 0
  function layout() {
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return
    const round = look.shape === 'round'
    H = Math.max(96, Math.min(250, r.height - 12))
    W = Math.max(150, Math.min(r.width - 32, round ? H : H * 0.8 + 24, 300))
    if (round) H = Math.min(H, W)
    fruit.style.width = W + 'px'
    fruit.style.height = H + 'px'
    bands.forEach((b, i) => {
      b.rect = bandRect(i, K, W, H)
      b.lo = b.rect.top / H
      b.hi = (b.rect.top + b.rect.height) / H
      b.el.dataset.lo = b.lo.toFixed(3)
      b.el.dataset.hi = b.hi.toFixed(3)
      Object.assign(b.el.style, { left: b.rect.left + 'px', width: b.rect.width + 'px', top: '0px', height: H + 'px' })
      drawBand(b)
    })
  }

  // Khúc đã gọt: segs lưu theo phần chiều cao quả (0..1) để đổi cỡ vẫn đúng chỗ.
  function drawBand(b) {
    b.peeled.replaceChildren(...mergeSegments(b.segs, 0, 1).map(([a, c]) => h('div', {
      style: `position:absolute;left:0;right:0;top:${(a * 100).toFixed(2)}%;height:${((c - a) * 100).toFixed(2)}%;background:${look.flesh};`
    })))
  }

  function renderCount() {
    const done = bands.filter(b => b.cov >= GOT_DONE_AT).length
    counter.textContent = `${countText} ${done}/${K}`
    counter.dataset.v = String(done)
    return done
  }
  layout()
  renderCount()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(layout) : null
  if (ro) ro.observe(scene)

  let misses = 0
  let strokes = 0
  let drag = null
  let ending = false
  const timers = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }

  // Tọa độ trong quả (px).
  function inFruit(p) {
    const r = fruit.getBoundingClientRect()
    const sx = r.width ? W / r.width : 1
    return { x: (p.clientX - r.left) * sx, y: (p.clientY - r.top) * sx }
  }
  function bandAt(x) {
    if (x < 0 || x > W) return -1
    return Math.min(K - 1, Math.floor(x / (W / K)))
  }
  function showKnife(p) {
    const r = scene.getBoundingClientRect()
    knife.hidden = false
    knife.style.transform = `translate(${p.clientX - r.left}px, ${p.clientY - r.top}px)`
  }
  function clearLive() { for (const b of bands) b.live.hidden = true }

  function miss(p, text) {
    misses++
    feedback(ctx, 'bad')
    if (vfx) vfx.floatText({ x: p.clientX, y: p.clientY }, text, { tone: 'bad', size: 'small' })
  }

  const unbind = bindPointer(scene, {
    down(p) {
      if (out.done) return
      drag = { p0: inFruit(p) }
      showKnife(p)
    },
    move(p) {
      if (!drag || out.done) return
      showKnife(p)
      // khúc đang gọt hiện mờ ngay dưới ngón (phản hồi tức thì)
      const q = inFruit(p)
      const i = bandAt((drag.p0.x + q.x) / 2)
      clearLive()
      if (i >= 0 && q.y > drag.p0.y) {
        const b = bands[i]
        const a = Math.max(0, drag.p0.y / H)
        const c = Math.min(1, q.y / H)
        if (c > a) {
          Object.assign(b.live.style, { top: (a * 100).toFixed(2) + '%', height: ((c - a) * 100).toFixed(2) + '%' })
          b.live.hidden = false
        }
      }
    },
    up(p) { endSwipe(p) },
    cancel(p) { endSwipe(p) }
  })

  function endSwipe(p) {
    const d = drag
    drag = null
    knife.hidden = true
    clearLive()
    if (!d || out.done) return
    const p1 = inFruit(p)
    const sw = classifySwipe(d.p0, p1, { axis: 'y', tolDeg: tol, minLen: GOT_SWIPE_MIN, dir: 1 })
    if (sw.len < TAP_MAX) return                     // chạm nhẹ: không tính
    if (!sw.ok) { miss(p, sw.reason === 'nguoc' ? 'Vuốt xuống nha' : 'Thẳng tay chút'); return }
    const i = bandAt((d.p0.x + p1.x) / 2)
    if (i < 0) { miss(p, 'Trượt rồi'); return }
    const b = bands[i]
    const a = Math.min(d.p0.y, p1.y) / H
    const c = Math.max(d.p0.y, p1.y) / H
    const before = b.cov
    b.segs.push([a, c])
    b.cov = bandCoverage(b.segs, b.lo, b.hi)
    if (b.cov - before < 0.04) { miss(p, 'Trượt rồi'); return }
    strokes++
    b.el.dataset.done = b.cov.toFixed(2)
    drawBand(b)
    doneBtn.disabled = false
    cue(ctx, 'peel', 'chop')
    // dải vỏ cuộn rơi (giảm chuyển động: không hạt)
    if (vfx && !reduced()) vfx.burst(b.el, 'peel', { n: 3, colors: [look.skin, look.dark] })
    const done = renderCount()
    if (b.cov >= GOT_DONE_AT && before < GOT_DONE_AT && vfx) vfx.floatText(b.el, 'Sạch vỏ!', { tone: 'good', size: 'small' })
    if (done >= K && !ending) { ending = true; later(finish, 260) }
  }

  doneBtn.addEventListener('click', () => finish())

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
    const coverage = bands.map(b => Math.round(b.cov * 1000) / 1000)
    const score = scoreGot({ coverage, target: K, misses, elapsed, par: step.par })
    feedback(ctx, score >= 90 ? 'good' : score < 50 ? 'bad' : 'ok')
    out.settle({ score, details: { coverage, strips: K, strokes, misses, elapsed } })
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    unbind()
    if (ro) ro.disconnect()
    drag = null
    knife.hidden = true
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

export default { type: 'got', mount }
