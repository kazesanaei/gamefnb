// BAY — bày / thả món vào đích (M5, bản TẠM chơi được; gói Pha trộn làm đẹp sau, giữ nguyên hợp đồng testid/data-*).
// Kéo từng món (viên đá) từ khay thả vào vùng đích (ly nhìn từ trên xuống). Khay có max(n + 1, 3) món nên ghi chú "Ít đá" có
// ý nghĩa thật. Thả ngoài đích thì món trôi về khay, không phạt; chạm món đã thả (hoặc kéo nó ra ngoài ly) để lấy ra.
// Thả ≥ 1 món thì bật "Xong".
// Chấm: scoreBay (điểm vị trí theo khoảng cách tới tâm / bán kính, −30 mỗi món lệch số lượng).
// Hợp đồng e2e: bay-target (tâm và bán kính bằng boundingBox); bay-item-<i>[data-placed = 0|1]; bay-count ("1/2",
// data-v, data-n); bay-done. Lớp vỏ (step.skin): ly → stage[data-skin].
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreBay } from '../../core/minigame-scoring.js'
import { createClock, frameLoop, settleOnce, feedback } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2 } from '../art/v2.js'
import { isReduced } from '../motion.js'
import { gestureLimitSec } from './_gesture.js'

export const BAY_ITEM_PX = 52
const TAP_MAX = 8

/** Số món trên khay cho n món cần thả. */
export function trayCount(n) { return Math.max(Math.floor(Number(n) || 1) + 1, 3) }

// Màu mặt nước trong ly theo món.
const LIQUID = Object.freeze({ ca_phe_sua_da: '#5a3420', ca_phe_muoi: '#4a2b1a' })

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

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const n = Math.max(1, Math.floor(Number(params.n) || 1))
  const M = trayCount(n)
  const mul = ctx.zoneMul || 1
  const limit = gestureLimitSec(step, { assist: !!ctx.assist, untimed: !!ctx.untimed })
  const clock = createClock()
  const out = settleOnce()
  const vfx = ctx.vfx || null
  const reduced = reducedOf(ctx)
  const T = ((ctx.data || {}).MINIGAME_TYPES || {}).bay || {}
  const skinId = 'ly'
  const skin = (T.skins && T.skins[skinId]) || {}
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const itemId = (INGS[step.ing] && INGS[step.ing].icon) || step.ing || 'da'
  const itemSvg = artV2(itemId)
  const liquid = LIQUID[ctx.recipe && ctx.recipe.id] || '#9fd3e6'

  stage.classList.add('mg-bay', 'skin-' + skinId)
  stage.dataset.skin = skinId
  const fr = buildFrame2(stage, {
    icon: itemSvg, title: step.label || skin.name || T.name || '', sub: skin.sub || 'Kéo từng món thả vào đích, đủ số thì bấm Xong.',
    steps: Number(ctx.stepTotal) > 0 ? { index: ctx.stepIndex, total: ctx.stepTotal, grades: ctx.stepGrades || [] } : null,
    timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })

  // Ly nhìn từ trên xuống: vành ly, mặt nước; vòng nét đứt là vùng thả.
  const propSvg = propV2('ly_lon')
  const target = h('div', {
    class: 'bay-target', 'data-testid': 'bay-target',
    style: 'position:absolute;border-radius:50%;' +
      (propSvg ? '' : `background:radial-gradient(circle at 50% 50%,${liquid} 0 66%,#dff1f7 67% 80%,#bfe0ea 81%);border:4px solid #3a2618;box-shadow:0 5px 0 rgba(58,38,24,.3);`)
  },
  propSvg ? artBox(propSvg, 'position:absolute;inset:0;width:100%;height:100%;') : null,
  h('div', { style: 'position:absolute;inset:22%;border-radius:50%;border:3px dashed rgba(255,250,240,.8);pointer-events:none;' }),
  h('div', { style: 'position:absolute;left:18%;top:14%;width:20%;height:10%;border-radius:50%;background:rgba(255,255,255,.5);pointer-events:none;' }))
  const tray = h('div', {
    class: 'bay-tray',
    style: 'position:absolute;left:8px;right:8px;bottom:4px;border:4px solid #3a2618;border-radius:16px;background:linear-gradient(180deg,#e8eef1,#c6d3da);box-shadow:0 4px 0 rgba(58,38,24,.3);'
  })
  const scene = h('div', { class: 'bay-scene', style: 'position:relative;flex:1 1 0;width:100%;min-height:150px;' }, target, tray)
  const items = []
  for (let i = 0; i < M; i++) {
    const el = h('div', {
      class: 'bay-item', 'data-testid': 'bay-item-' + i, 'data-placed': '0', role: 'button', 'aria-label': 'Món ' + (i + 1),
      style: `position:absolute;left:0;top:0;width:${BAY_ITEM_PX}px;height:${BAY_ITEM_PX}px;margin:${-BAY_ITEM_PX / 2}px 0 0 ${-BAY_ITEM_PX / 2}px;` +
        'touch-action:none;cursor:pointer;z-index:3;'
    }, h('div', { class: 'bay-item-art', style: 'width:100%;height:100%;' }, artBox(itemSvg, 'width:100%;height:100%;')))
    scene.appendChild(el)
    items.push({ el, art: el.firstChild, i, placed: null, d: null })
  }
  fr.area.append(scene)

  // bay-count chỉ chứa "k/n" (vd "1/2"); nhãn ("Đá") đứng ngoài
  const counter = h('span', { class: 'bay-count', 'data-testid': 'bay-count', 'data-v': '0', 'data-n': String(n) })
  const countPill = h('div', { class: 'mg-count g-pill g-pill--big' }, h('span', null, (skin.count || 'Món') + ' '), counter)
  const doneBtn = h('button', { class: 'g-btn g-btn--small mg-done', type: 'button', 'data-testid': 'bay-done', disabled: true }, 'Xong')
  fr.foot.append(countPill, doneBtn)

  // Bố cục (px) theo cỡ cảnh: khay dưới, ly giữa phần trên. Món đã thả lưu vị trí theo bán kính ly (đổi cỡ vẫn đúng chỗ).
  let L = { W: 0, H: 0, cx: 0, cy: 0, R: 0, trayTop: 0 }
  function layout() {
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return
    const W = r.width, H = r.height
    const trayH = BAY_ITEM_PX + 16
    const trayTop = H - 4 - trayH
    const R = Math.max(40, Math.min(110, (trayTop - 10) / 2, W * 0.32))
    L = { W, H, cx: W / 2, cy: Math.max(R + 2, (trayTop - 6) / 2), R, trayTop }
    Object.assign(target.style, { left: (L.cx - R) + 'px', top: (L.cy - R) + 'px', width: 2 * R + 'px', height: 2 * R + 'px' })
    tray.style.height = trayH + 'px'
    for (const it of items) if (!it.drag) place(it)
  }
  function home(i) {
    const gap = (L.W - 16) / M
    return { x: 8 + gap * (i + 0.5), y: L.trayTop + (BAY_ITEM_PX + 16) / 2 }
  }
  function place(it) {
    const pos = it.placed ? { x: L.cx + it.placed.nx * L.R, y: L.cy + it.placed.ny * L.R } : home(it.i)
    it.el.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px)`
  }
  layout()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(layout) : null
  if (ro) ro.observe(scene)

  const placedCount = () => items.filter(it => it.placed).length
  function render() {
    const k = placedCount()
    counter.textContent = `${k}/${n}`
    counter.dataset.v = String(k)
    doneBtn.disabled = k < 1
  }
  render()

  const unbinds = items.map(it => bindPointer(it.el, {
    down(p) {
      if (out.done) return
      const r = scene.getBoundingClientRect()
      const cur = it.placed ? { x: L.cx + it.placed.nx * L.R, y: L.cy + it.placed.ny * L.R } : home(it.i)
      it.drag = { x0: p.clientX, y0: p.clientY, ox: p.clientX - r.left - cur.x, oy: p.clientY - r.top - cur.y, moved: 0 }
      it.el.style.zIndex = '5'
      it.el.style.transition = 'none'
    },
    move(p) {
      const d = it.drag
      if (!d || out.done) return
      const r = scene.getBoundingClientRect()
      d.moved = Math.max(d.moved, Math.hypot(p.clientX - d.x0, p.clientY - d.y0))
      const x = p.clientX - r.left - d.ox, y = p.clientY - r.top - d.oy
      it.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
    },
    up(p) { drop(it, p, false) },
    cancel(p) { drop(it, p, true) }
  }))

  function drop(it, p, cancelled) {
    const d = it.drag
    it.drag = null
    it.el.style.zIndex = '3'
    if (!d || out.done) { place(it); return }
    // chạm (không kéo) vào món đã thả → lấy ra trả về khay
    if (d.moved < TAP_MAX) {
      if (it.placed && !cancelled) {
        it.placed = null
        it.d = null
        it.el.dataset.placed = '0'
        feedback(ctx, 'tap')
        render()
      }
      glide(it)
      return
    }
    const r = scene.getBoundingClientRect()
    const x = p.clientX - r.left - d.ox, y = p.clientY - r.top - d.oy
    const dist = Math.hypot(x - L.cx, y - L.cy) / L.R
    if (dist <= 1 && !cancelled) {
      // vị trí hiển thị kẹp trong lòng ly (điểm chấm dùng khoảng cách thật lúc thả)
      const k = dist > 0.78 ? 0.78 / dist : 1
      it.placed = { nx: ((x - L.cx) / L.R) * k, ny: ((y - L.cy) / L.R) * k }
      it.d = Math.round(dist * 1000) / 1000
      it.el.dataset.placed = '1'
      place(it)
      cue(ctx, 'plop', 'click')
      if (vfx && !reduced()) vfx.squash(it.art)
      if (vfx) vfx.ripple(p.clientX, p.clientY)
      render()
      return
    }
    // thả ngoài ly: trôi về khay, không phạt (món đã thả mà kéo ra ngoài thì coi như lấy ra)
    if (it.placed && !cancelled) {
      it.placed = null
      it.d = null
      it.el.dataset.placed = '0'
      render()
    }
    glide(it)
  }

  function glide(it) {
    it.el.style.transition = reduced() ? 'none' : 'transform .2s ease-out'
    place(it)
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
    const placed = items.filter(it => it.placed).map(it => it.d)
    const score = scoreBay({ placed, n, mul })
    feedback(ctx, score >= 90 ? 'good' : score < 50 ? 'bad' : 'ok')
    out.settle({ score, details: { placed, n, tray: M, elapsed } })
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    for (const u of unbinds) u()
    if (ro) ro.disconnect()
    for (const it of items) it.drag = null
  }

  return {
    result: out.promise,
    hold(on) { if (!out.done) clock.hold(on) },
    destroy() {
      cleanup()
      if (revealRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(revealRaf)
      fr.destroy()
      out.settle(null)
    }
  }
}

export default { type: 'bay', mount }
