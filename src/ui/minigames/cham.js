// CHAM — chạm. Ba chế độ (cách chấm giữ nguyên: scoreChamExact / scoreChamMin / scoreChamTargets):
//  exact: đúng n lần; target=true → đập vào chảo, càng gần tâm (cham-target) càng tốt, đủ n lần tự xong;
//         target=false → thêm n muỗng (chạm lọ cham-target): muỗng bay vào ly, lớp đường/sữa dâng; bấm cham-done.
//  min:   chạm nhanh cham-pad đủ N lần trong T giây (tính từ lần chạm đầu): quả tắc bổ đôi bị bóp (nảy squash), nước tắc
//         nhỏ vào ly, đủ lần thì hiện hình đã vắt (tac.vat).
//  targets: nhiều chai cham-bottle-<id> xếp MỘT hàng trên kệ gỗ; mỗi chạm chai nghiêng rắc giọt/hạt bay vào món (đĩa ở
//         dưới), số nấc to "đã/cần" trên mỗi chai; bấm cham-done.
// Hợp đồng e2e: cham-target[data-n]; cham-pan; cham-pad[data-n, data-t]; cham-bottle-<id>[data-target, data-count]
// (lớp .cham-bottle); cham-done; cham-count. Chai Nêm luôn một hàng, mọi chai và nút Xong thấy và bấm được ở 360×600.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreChamExact, scoreChamMin, scoreChamTargets } from '../../core/minigame-scoring.js'
import { clamp, createClock, frameLoop, settleOnce, feedback, stepLimitSec, ingName } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2, PROP_META } from '../art/v2.js'
import { isReduced } from '../motion.js'

// Đơn vị hiển thị theo nguyên liệu.
const UNITS = { trung_ga: 'quả', trung_cut: 'quả', duong: 'muỗng', sua_dac: 'muỗng', da: 'muỗng', tac: 'lần' }

export function unitFor(ing) { return UNITS[ing] || 'lần' }

// Màu giọt/hạt rắc vào món theo nguyên liệu; grain: hạt (vuông nhỏ) thay cho giọt.
export const CHAM_DROP = Object.freeze({
  nuoc_tuong: { color: '#3b2214' }, nuoc_mam: { color: '#b8741c' }, tuong_ot: { color: '#d8392b' }, sa_te: { color: '#c2401f' },
  tac: { color: '#f6c23a' }, muoi_tom_tay_ninh: { color: '#e2733a', grain: true }, duong: { color: '#fffaf0', grain: true },
  muoi: { color: '#ffffff', grain: true }, sua_dac: { color: '#f1e2c4' }, hanh_phi: { color: '#b0641c', grain: true }
})
const DROP_DEFAULT = { color: '#8a5a2b' }
// Nguyên liệu là quả (bóp, không nghiêng như chai).
const FRUITS = new Set(['tac', 'chanh'])

/** Góc nghiêng của chai thứ i trong hàng k chai (độ, chiều kim đồng hồ): lúc chờ và lúc rắc — chai hai bên nghiêng vào giữa. */
export function bottleTilt(i, k) {
  const side = k <= 1 ? 0 : (i - (k - 1) / 2) / ((k - 1) / 2)    // −1 (trái) … +1 (phải)
  if (Math.abs(side) < 0.01) return { rest: 0, pour: 160 }
  return { rest: Math.round(-14 * side), pour: Math.round(-128 * side) }
}

/** Cỡ hình chai (px) theo khung cảnh W×H và số chai k: một hàng vừa bề ngang, chừa chỗ cho đĩa món bên dưới khi đủ cao. */
export function bottleArt(W, H, k) {
  const cols = Math.max(1, k)
  const colW = Math.min(124, (Math.max(120, W) - 10 * (cols - 1)) / cols)
  return Math.round(clamp(Math.min(colW * 0.8, (Math.max(90, H) - 34) * (H >= 230 ? 0.4 : 0.62)), 40, 100))
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

function anim(el, frames, opts) {
  try { if (el && typeof el.animate === 'function') return el.animate(frames, opts) } catch { /* bỏ qua */ }
  return null
}

const LY_FALLBACK = { vb: [200, 250], mouth: { cx: 100, cy: 31, rx: 75, ry: 12.5 }, bottom: { cx: 100, cy: 226, rx: 50, ry: 10 }, left: [[25, 31], [50, 226]], right: [[175, 31], [150, 226]] }
const SPOON = '<svg viewBox="0 0 64 24" xmlns="http://www.w3.org/2000/svg"><g stroke="#3a2618" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M24 12 H 60" stroke-width="5"/><path d="M24 12 H 60" stroke="#cfd8de" stroke-width="2"/>' +
  '<ellipse cx="13" cy="12" rx="11" ry="8" fill="#e4eaee"/><ellipse cx="12" cy="11" rx="6" ry="4" fill="var(--spoon, #fffaf0)" stroke="none"/></g></svg>'

// Ly nhỏ (đạo cụ ly_lon) có lớp chất lỏng cắt theo lòng ly, dâng bằng transform. → { el, set(fraction), meta }
function makeCup(cls, color) {
  const c = PROP_META.ly_lon && PROP_META.ly_lon.mouth ? PROP_META.ly_lon : LY_FALLBACK
  const [VW, VH] = c.vb
  const x0 = c.left[0][0], x1 = c.right[0][0], y0 = c.mouth.cy - c.mouth.ry, y1 = c.bottom.cy + c.bottom.ry
  const rx = x => ((x - x0) / (x1 - x0) * 100).toFixed(1) + '%'
  const ry = y => ((y - y0) / (y1 - y0) * 100).toFixed(1) + '%'
  const clip = `polygon(0% 0%, 100% 0%, 100% ${ry(c.mouth.cy)}, ${rx(c.right[1][0])} ${ry(c.right[1][1])}, ${rx(c.bottom.cx + c.bottom.rx * 0.7)} 100%, ` +
    `${rx(c.bottom.cx - c.bottom.rx * 0.7)} 100%, ${rx(c.left[1][0])} ${ry(c.left[1][1])}, 0% ${ry(c.mouth.cy)})`
  const fill = h('div', { class: 'cham-cup-fill' }, h('i', { class: 'cham-cup-top' }))
  const liquid = h('div', {
    class: 'cham-cup-liquid',
    style: { left: (x0 / VW * 100).toFixed(2) + '%', top: (y0 / VH * 100).toFixed(2) + '%', width: ((x1 - x0) / VW * 100).toFixed(2) + '%', height: ((y1 - y0) / VH * 100).toFixed(2) + '%', clipPath: clip, webkitClipPath: clip }
  }, fill)
  const art = propV2('ly_lon')
  const el = h('div', { class: ['cham-cup'].concat(cls), style: { '--fill-c': color } }, liquid, art ? svgBox(art, 'cham-cup-art') : h('div', { class: 'cham-cup-css' }))
  return {
    el, meta: c,
    set(f) {
      const lvl = clamp(f, 0, 1.05)
      const y = c.bottom.cy + (c.mouth.cy - c.bottom.cy) * lvl
      fill.style.transform = `translateY(${(clamp((y - y0) / (y1 - y0), 0, 1) * 100).toFixed(2)}%)`
      fill.classList.toggle('is-empty', lvl <= 0.001)
    }
  }
}

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const mode = params.mode || 'exact'
  const mul = ctx.zoneMul || 1
  const limit = ctx.untimed ? Infinity : stepLimitSec(step.par, ctx.assist)   // Nấu thử: không giới hạn
  const clock = createClock()
  const out = settleOnce()
  const vfx = ctx.vfx || (ctx.app && ctx.app.vfx) || null
  const reduced = reducedOf(ctx)
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const iconOf = id => (INGS[id] && INGS[id].icon) || id || 'fallback'
  const T = ((ctx.data || {}).MINIGAME_TYPES || {}).cham || {}
  stage.classList.add('mg-cham', 'g-heat', 'is-' + mode)
  const fr = buildFrame2(stage, {
    icon: artV2(iconOf(step.ing)), title: step.label || T.name || '', sub: '',
    steps: Number(ctx.stepTotal) > 0 ? { index: ctx.stepIndex, total: ctx.stepTotal, grades: ctx.stepGrades || [] } : null,
    timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })
  let finishNow = null
  let unbinds = []
  let minTick = null // chỉ dùng ở chế độ min
  let minLeft = null
  let ro = null
  const timers = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }

  // Chữ nổi: lớp hiệu ứng chung (vfx) nếu có, không thì nhãn ngắn trong cảnh. at: phần tử, đặt chữ ở mép trên.
  function say(host, text, tone, at) {
    const r = at.getBoundingClientRect()
    const x = r.left + r.width / 2, y = r.top + Math.min(r.height * 0.3, 30)
    if (vfx && typeof vfx.floatText === 'function' && vfx.floatText({ x, y: y + 48 }, text, { tone, size: 'small' })) return
    const hr = host.getBoundingClientRect()
    const el = h('div', { class: ['heat-pop', 'is-' + tone], style: { left: (x - hr.left) + 'px', top: Math.max(14, y - hr.top) + 'px' } }, text)
    host.appendChild(el)
    later(() => el.remove(), 800)
  }

  if (mode === 'min') finishNow = mountMin()
  else if (mode === 'targets') finishNow = mountTargets()
  else finishNow = mountExact()

  // ---- exact ----
  function mountExact() {
    const n = Math.max(1, Math.floor(Number(params.n) || 1))
    const withTarget = params.target !== false
    const unit = unitFor(step.ing)
    let taps = 0
    const distances = []
    const counter = h('div', { class: 'mg-count g-pill g-pill--big', 'data-testid': 'cham-count' })
    const render = () => { counter.textContent = `${taps}/${n} ${unit}` }
    if (withTarget) {
      // đập vào chảo (bộ dữ liệu M5 đã chuyển bước này sang "dap"; giữ cho bản lưu cũ): chảo lớn, vòng mục tiêu ở tâm
      fr.setSub(`Đập ${n} ${unit} vào giữa chảo.`)
      const R = 0.08 * mul, R2 = 0.15 * mul, R3 = 0.25 * mul
      const target = h('div', { class: 'cham-target', 'data-testid': 'cham-target', 'data-n': String(n) })
      const pan = h('div', {
        class: 'cham-pan', 'data-testid': 'cham-pan',
        style: { '--r1': (R * 100).toFixed(1) + '%', '--r2': (R2 * 100).toFixed(1) + '%', '--r3': (R3 * 100).toFixed(1) + '%' }
      }, h('div', { class: 'cham-ring r3' }), h('div', { class: 'cham-ring r2' }), h('div', { class: 'cham-ring r1' }), target)
      fr.area.append(h('div', { class: 'cham-exact-wrap' }, pan))
      fr.foot.append(counter)
      unbinds.push(bindPointer(pan, {
        down(p) {
          if (out.done || taps >= n) return
          const rect = pan.getBoundingClientRect()
          const rad = rect.width / 2
          const d = Math.hypot(p.x - rad, p.y - rect.height / 2) / rad
          taps++
          distances.push(Math.round(d * 1000) / 1000)
          const splat = svgBox(artV2('trung_ga', 'op_la_song'), 'cham-splat', { style: { left: p.x + 'px', top: p.y + 'px' } })
          pan.appendChild(splat)
          const good = d <= R2
          say(pan, good ? 'Đẹp!' : 'Lệch', good ? 'good' : 'bad', splat)
          feedback(ctx, good ? 'hit' : 'tap')
          render()
          if (taps >= n) later(finish, 260)
        }
      }, { space: false }))
    } else {
      // thêm n muỗng: lọ to bên trái (chạm = một muỗng), muỗng bay vào ly bên phải, lớp đường/sữa dâng theo số muỗng
      fr.setSub(`Thêm đúng ${n} ${unit}, rồi bấm Xong.`)
      const drop = CHAM_DROP[step.ing] || DROP_DEFAULT
      const jar = h('button', { class: 'cham-jar', type: 'button', 'data-testid': 'cham-target', 'data-n': String(n), 'aria-label': `Thêm 1 ${unit} ${ingName(step.ing, ctx)}` },
        svgBox(artV2(iconOf(step.ing)), 'cham-jar-art'), h('span', { class: 'cham-jar-label g-pill' }, '+1 ' + unit))
      const cup = makeCup(['is-spoon', drop.grain ? 'is-grain' : ''], drop.color)
      const spoon = svgBox(SPOON, 'cham-spoon', { style: { '--spoon': drop.color } })
      const wrap = h('div', { class: 'cham-spoon-wrap' }, jar, cup.el, spoon)
      const done = h('button', { class: 'g-btn g-btn--small mg-done', type: 'button', 'data-testid': 'cham-done' }, 'Xong')
      fr.area.append(wrap)
      fr.foot.append(counter, done)
      cup.set(0)
      const PER = 0.15                        // mỗi muỗng dâng 15% lòng ly
      unbinds.push(bindPointer(jar, {
        down() {
          if (out.done) return
          taps++
          const over = taps > n
          feedback(ctx, 'tap')
          render()
          const apply = () => {
            cup.set(taps * PER)
            cup.el.classList.toggle('is-over', over)
            if (over) say(wrap, 'Dư rồi!', 'bad', cup.el)
          }
          if (reduced()) { apply(); return }
          anim(jar.firstChild, [{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg) translateY(-4px)' }, { transform: 'rotate(0)' }], { duration: 220, easing: 'ease-out' })
          // muỗng bay theo cung từ miệng lọ vào miệng ly, chạm thì lớp trong ly dâng
          const wr = wrap.getBoundingClientRect(), jr = jar.getBoundingClientRect(), cr = cup.el.getBoundingClientRect()
          const sx = jr.left - wr.left + jr.width * 0.5, sy = jr.top - wr.top + jr.height * 0.2
          const ex = cr.left - wr.left + cr.width * 0.4, ey = cr.top - wr.top + cr.height * 0.08
          spoon.style.left = '0px'
          spoon.style.top = '0px'
          const a = anim(spoon, [
            { transform: `translate(${sx}px, ${sy}px) rotate(-20deg)`, opacity: 0 },
            { transform: `translate(${(sx + ex) / 2}px, ${Math.min(sy, ey) - 26}px) rotate(10deg)`, opacity: 1, offset: 0.5 },
            { transform: `translate(${ex}px, ${ey}px) rotate(40deg)`, opacity: 1, offset: 0.85 },
            { transform: `translate(${ex}px, ${ey}px) rotate(60deg)`, opacity: 0 }
          ], { duration: 340, easing: 'ease-in-out' })
          if (a) later(apply, 290)
          else apply()
        }
      }, { space: true }))
      done.addEventListener('click', () => finish())
    }
    render()
    return () => {
      const score = scoreChamExact({ taps, n, distances: withTarget ? distances : undefined, mul })
      return { score, details: { mode, taps, n, distances } }
    }
  }

  // ---- min ----
  function mountMin() {
    const N = Math.max(1, Math.floor(Number(params.N) || 1))
    const T0 = Math.max(0.5, Number(params.T) || 3) * (ctx.assist ? 1.5 : 1)
    fr.setSub(`Chạm nhanh đủ ${N} lần trong ${String(T0).replace('.', ',')} giây.`)
    let taps = 0
    let t0 = null
    const ingArt = iconOf(step.ing)
    const fruitSvg = artV2(ingArt, 'bo_doi')
    const doneSvg = artV2(ingArt, 'vat')
    const drop = CHAM_DROP[step.ing] || DROP_DEFAULT
    const counter = h('div', { class: 'mg-count g-pill g-pill--big', 'data-testid': 'cham-count' })
    const art = h('div', { class: 'cham-pad-art' }, svgBox(fruitSvg, 'cham-pad-svg'))
    const ring = h('i', { class: 'cham-pad-ring' })
    const pad = h('button', { class: 'cham-pad', type: 'button', 'data-testid': 'cham-pad', 'data-n': String(N), 'data-t': String(T0), 'aria-label': 'Chạm thật nhanh' },
      ring, art, h('span', { class: 'cham-pad-label g-pill' }, 'Chạm!'))
    const cup = makeCup('is-juice', drop.color)
    const drips = h('div', { class: 'cham-juice' })
    cup.el.appendChild(drips)
    const wrap = h('div', { class: 'cham-min-wrap' }, pad, cup.el)
    const barFill = h('div', { class: 'mg-bar-fill' })
    const bar = h('div', { class: 'mg-bar cham-bar', 'data-testid': 'cham-progress' }, barFill)
    fr.area.append(wrap)
    fr.foot.append(bar, counter)
    cup.set(0)
    let squeezed = false
    const render = () => {
      counter.textContent = `${taps}/${N}`
      barFill.style.transform = `scaleX(${clamp(taps / N, 0, 1)})`
      bar.classList.toggle('is-full', taps >= N)
      bar.classList.toggle('is-over', taps > N * 1.2)
      cup.set(Math.min(1, taps / N) * 0.45)
      if (taps >= N && !squeezed && doneSvg !== artV2(ingArt)) {
        squeezed = true
        art.replaceChildren(svgBox(doneSvg, 'cham-pad-svg'))
        pad.classList.add('is-full')
      }
    }
    unbinds.push(bindPointer(pad, {
      down() {
        if (out.done) return
        if (t0 === null) { t0 = clock.elapsed(); pad.classList.add('is-running') }
        taps++
        feedback(ctx, 'tap')
        render()
        if (reduced()) return
        // bóp: hình nảy squash; vài giọt nước nhỏ xuống ly
        anim(art, [{ transform: 'scale(1, 1)' }, { transform: 'scale(1.12, .84)', offset: 0.35 }, { transform: 'scale(.97, 1.04)', offset: 0.7 }, { transform: 'scale(1, 1)' }], { duration: 160, easing: 'ease-out' })
        const d = h('i', { class: 'cham-juice-drop', style: { background: drop.color } })
        drips.appendChild(d)
        later(() => d.remove(), 520)
      }
    }, { space: true }))
    render()
    minTick = () => {
      if (t0 !== null && clock.elapsed() - t0 >= T0) finish()
    }
    minLeft = () => (t0 === null ? 1 : clamp(1 - (clock.elapsed() - t0) / T0, 0, 1))
    return () => ({ score: scoreChamMin({ taps, N }), details: { mode, taps, N, T: T0 } })
  }

  // ---- targets ----
  function mountTargets() {
    const targets = params.targets || {}
    const ids = Object.keys(targets)
    fr.setSub('Chạm từng chai cho đúng số nấc, rồi bấm Xong.')
    const counts = {}
    const k = ids.length
    const row = h('div', { class: 'cham-bottles', style: { '--k': String(Math.max(1, k)) } })
    const okPill = h('div', { class: 'mg-count g-pill cham-ok' })
    const dishSvg = artV2((ctx.recipe && ctx.recipe.icon) || 'fallback')
    const plateSvg = propV2('dia_lon')
    const dots = h('div', { class: 'cham-dots' })
    const dishIn = h('div', { class: 'cham-dish-in' }, plateSvg ? svgBox(plateSvg, 'cham-plate') : null, svgBox(dishSvg, 'cham-dish-art'), dots)
    const dish = h('div', { class: 'cham-dish' }, dishIn)
    const scene = h('div', { class: 'cham-scene' }, h('div', { class: 'cham-shelf' }, row), dish)
    const renderOk = () => {
      const ok = ids.filter(id => counts[id] === targets[id]).length
      okPill.textContent = k ? `Đủ nấc ${ok}/${k}` : 'Xong rồi'
      okPill.classList.toggle('is-all', k > 0 && ok === k)
    }
    ids.forEach((id, i) => {
      counts[id] = 0
      const tilt = bottleTilt(i, k)
      const fruit = FRUITS.has(id)
      const svg = fruit ? artV2(iconOf(id), 'bo_doi') : artV2(iconOf(id))
      const art = h('div', { class: 'cham-bottle-art', style: { '--tilt': tilt.rest + 'deg' } }, svgBox(svg, 'cham-bottle-svg'))
      const num = h('b', { class: 'cham-bottle-num' }, '0')
      const cnt = h('span', { class: 'cham-bottle-count' }, num, h('small', null, '/' + targets[id]))
      const b = h('button', {
        class: ['cham-bottle', fruit ? 'is-fruit' : ''], type: 'button', 'data-testid': 'cham-bottle-' + id,
        'data-target': String(targets[id]), 'data-count': '0', 'aria-label': `${ingName(id, ctx)}: cần ${targets[id]} nấc`
      }, art, cnt, h('span', { class: 'cham-bottle-name' }, ingName(id, ctx)))
      unbinds.push(bindPointer(b, {
        down() {
          if (out.done) return
          counts[id]++
          b.dataset.count = String(counts[id])
          num.textContent = String(counts[id])
          b.classList.toggle('is-ok', counts[id] === targets[id])
          b.classList.toggle('is-over', counts[id] > targets[id])
          feedback(ctx, 'tap')
          renderOk()
          sprinkle(id, b, art, tilt, fruit)
          if (counts[id] > targets[id]) say(scene, 'Quá tay!', 'bad', b)
          else if (counts[id] === targets[id]) say(scene, 'Vừa!', 'good', b)
        }
      }, { space: false }))
      row.appendChild(b)
    })
    if (!ids.length) row.appendChild(h('div', { class: 'mg-empty' }, 'Không cần nêm thêm.'))
    const done = h('button', { class: 'g-btn g-btn--go mg-done', type: 'button', 'data-testid': 'cham-done' }, 'Xong')
    fr.area.append(scene)
    fr.foot.append(okPill, done)
    done.addEventListener('click', () => finish())
    renderOk()

    // cỡ hình chai theo khung cảnh (một hàng vừa bề ngang; đủ cao thì chừa chỗ cho đĩa món)
    function fit() {
      const r = scene.getBoundingClientRect()
      if (!r.width) return
      const H = fr.area.getBoundingClientRect().height || r.height
      stage.style.setProperty('--art', bottleArt(r.width, H, k) + 'px')
    }
    fit()
    ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
    if (ro) ro.observe(fr.area)

    // Chai nghiêng (quả thì bóp) rồi giọt/hạt bay theo cung vào món, chạm thì để lại chấm màu trên món.
    function sprinkle(id, b, art, tilt, fruit) {
      const drop = CHAM_DROP[id] || DROP_DEFAULT
      const isRed = reduced()
      const land = () => {
        if (dish.clientHeight < 40) return
        const ang = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.32
        const x = 50 + Math.cos(ang) * rr * 100, y = 50 + Math.sin(ang) * rr * 55
        const dot = h('i', { class: ['cham-dot', drop.grain ? 'is-grain' : ''], style: { left: x.toFixed(1) + '%', top: y.toFixed(1) + '%', background: drop.color } })
        dots.appendChild(dot)
        if (dots.childElementCount > 40) dots.firstElementChild.remove()
      }
      if (isRed) { land(); return }
      if (fruit) anim(art, [{ transform: `rotate(${tilt.rest}deg) scale(1)` }, { transform: `rotate(${tilt.rest}deg) scale(1.14, .82)`, offset: 0.4 }, { transform: `rotate(${tilt.rest}deg) scale(1)` }], { duration: 220, easing: 'ease-out' })
      else anim(art, [{ transform: `rotate(${tilt.rest}deg)` }, { transform: `rotate(${tilt.pour}deg)`, offset: 0.35 }, { transform: `rotate(${tilt.pour + 12 * Math.sign(tilt.pour || 1)}deg)`, offset: 0.55 }, { transform: `rotate(${tilt.pour}deg)`, offset: 0.7 }, { transform: `rotate(${tilt.rest}deg)` }], { duration: 380, easing: 'ease-in-out' })
      // giọt bay từ miệng chai xuống món (đĩa đang ẩn ở màn rất thấp thì chỉ có hiệu ứng nghiêng chai)
      if (dish.clientHeight < 40) return
      const sr = scene.getBoundingClientRect(), br = b.getBoundingClientRect(), dr = dishIn.getBoundingClientRect()
      const sx = br.left - sr.left + br.width / 2, sy = br.top - sr.top + br.height * 0.55
      const ex = dr.left - sr.left + dr.width * (0.35 + Math.random() * 0.3), ey = dr.top - sr.top + dr.height * 0.45
      for (let j = 0; j < 3; j++) {
        const d = h('i', { class: ['cham-fly', drop.grain ? 'is-grain' : ''], style: { background: drop.color } })
        scene.appendChild(d)
        const jx = (j - 1) * 8
        const a = anim(d, [
          { transform: `translate(${sx}px, ${sy}px) scale(.6)`, opacity: 0 },
          { transform: `translate(${(sx + ex) / 2 + jx}px, ${Math.min(sy, ey) - 10}px) scale(1)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${ex + jx}px, ${ey}px) scale(.8)`, opacity: 1 }
        ], { duration: 360 + j * 50, delay: 90 + j * 40, easing: 'ease-in', fill: 'backwards' })
        later(() => d.remove(), 560 + j * 90)
        if (!a) { d.remove(); break }
      }
      later(land, 470)
    }
    return () => ({ score: scoreChamTargets({ counts, targets }), details: { mode, counts: { ...counts }, targets: { ...targets } } })
  }

  // Sân khấu bếp ở màn thấp cuộn dọc (thanh chân dính đáy): cuộn sẵn để vùng chạm (thớt tắc, lọ) nằm trên thanh chân — vừa
  // thì hiện trọn, không vừa thì giữ mép trên của vùng ở đầu khung. Hàng chai Nêm do màn Bếp tự cuộn (revealTargets).
  let revealRaf = 0
  function reveal() {
    revealRaf = 0
    try {
      const el = stage.querySelector('.cham-pad, .cham-jar, .cham-pan')
      if (out.done || !el || stage.scrollHeight <= stage.clientHeight + 1) return
      const sr = stage.getBoundingClientRect(), fr2 = fr.foot.getBoundingClientRect(), r = el.getBoundingClientRect()
      const delta = r.height + 16 <= fr2.top - sr.top ? r.bottom + 14 - fr2.top : r.top - sr.top
      if (delta > 0) stage.scrollTop += Math.ceil(delta)
    } catch { /* bỏ qua */ }
  }
  if (typeof requestAnimationFrame === 'function') revealRaf = requestAnimationFrame(reveal)

  const loop = frameLoop(() => {
    const t = clock.elapsed()
    if (mode === 'min' && minLeft) fr.setTime(1 - minLeft())
    else fr.setTime(t / limit)
    if (minTick) minTick()
    if (t >= limit) finish()
  })

  function finish() {
    if (out.done) return
    const res = finishNow()
    res.details.elapsed = clock.elapsed()
    cleanup()
    stage.classList.add('is-finished')
    out.settle(res)
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    for (const u of unbinds) u()
    unbinds = []
    if (ro) ro.disconnect()
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

export default { type: 'cham', mount }
