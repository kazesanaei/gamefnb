// CHAM — chạm. Ba chế độ:
//  exact: đúng n lần; target=true → đập vào chảo, càng gần tâm (cham-target) càng tốt, đủ n lần tự xong;
//         target=false → thêm n muỗng (chạm cham-target), bấm cham-done.
//  min:   chạm nhanh cham-pad đủ N lần trong T giây (tính từ lần chạm đầu).
//  targets: nhiều chai cham-bottle-<id>, mỗi chạm +1 nấc, bấm cham-done.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreChamExact, scoreChamMin, scoreChamTargets } from '../../core/minigame-scoring.js'
import { clamp, createClock, frameLoop, settleOnce, feedback, stepLimitSec, buildFrame, ingIcon, ingName, popLabel } from './_util.js'

// Đơn vị hiển thị theo nguyên liệu.
const UNITS = { trung_ga: 'quả', trung_cut: 'quả', duong: 'muỗng', sua_dac: 'muỗng', da: 'muỗng', tac: 'lần' }

export function unitFor(ing) { return UNITS[ing] || 'lần' }

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const mode = params.mode || 'exact'
  const mul = ctx.zoneMul || 1
  const limit = ctx.untimed ? Infinity : stepLimitSec(step.par, ctx.assist)   // Nấu thử: không giới hạn
  const clock = createClock()
  const out = settleOnce()
  stage.classList.add('mg-cham', 'is-' + mode)
  const fr = buildFrame(stage, step, ctx)
  let finishNow = null
  let unbinds = []
  let minTick = null // chỉ dùng ở chế độ min
  let minLeft = null

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
    const counter = h('div', { class: 'mg-count', 'data-testid': 'cham-count' })
    const render = () => { counter.textContent = `${taps}/${n} ${unit}` }
    if (withTarget) {
      fr.setSub(`Đập ${n} ${unit} vào giữa chảo.`)
      const R = 0.08 * mul, R2 = 0.15 * mul, R3 = 0.25 * mul
      const target = h('div', { class: 'cham-target', 'data-testid': 'cham-target', 'data-n': String(n) })
      const pan = h('div', {
        class: 'cham-pan', 'data-testid': 'cham-pan',
        style: { '--r1': (R * 100).toFixed(1) + '%', '--r2': (R2 * 100).toFixed(1) + '%', '--r3': (R3 * 100).toFixed(1) + '%' }
      }, h('div', { class: 'cham-ring r3' }), h('div', { class: 'cham-ring r2' }), h('div', { class: 'cham-ring r1' }), target)
      const hand = h('div', { class: 'cham-hand' }, svgBox(ingIcon(step.ing, ctx), 'cham-hand-icon'))
      fr.area.append(h('div', { class: 'cham-exact-wrap' }, hand, pan))
      fr.foot.append(counter)
      unbinds.push(bindPointer(pan, {
        down(p) {
          if (out.done || taps >= n) return
          const rect = pan.getBoundingClientRect()
          const rad = rect.width / 2
          const d = Math.hypot(p.x - rad, p.y - rect.height / 2) / rad
          taps++
          distances.push(Math.round(d * 1000) / 1000)
          const splat = h('div', { class: 'cham-splat', style: { left: p.x + 'px', top: p.y + 'px' } })
          pan.appendChild(splat)
          const good = d <= R2
          popLabel(pan, good ? 'Đẹp!' : 'Lệch', p.x, p.y - 20, good ? 'is-good' : 'is-off')
          feedback(ctx, good ? 'hit' : 'tap')
          render()
          if (taps >= n) setTimeout(finish, 260)
        }
      }, { space: false }))
    } else {
      fr.setSub(`Thêm đúng ${n} ${unit}, rồi bấm Xong.`)
      const jar = h('button', { class: 'cham-jar', type: 'button', 'data-testid': 'cham-target', 'data-n': String(n) },
        svgBox(ingIcon(step.ing, ctx), 'cham-jar-icon'), h('span', { class: 'cham-jar-label' }, '+1 ' + unit))
      const cup = h('div', { class: 'cham-cup' }, h('div', { class: 'cham-cup-fill' }))
      const done = h('button', { class: 'btn btn-primary mg-done', type: 'button', 'data-testid': 'cham-done' }, 'Xong')
      fr.area.append(h('div', { class: 'cham-spoon-wrap' }, jar, cup))
      fr.foot.append(counter, done)
      unbinds.push(bindPointer(jar, {
        down() {
          if (out.done) return
          taps++
          cup.style.setProperty('--fill', clamp(taps / Math.max(n, taps, 1), 0, 1).toFixed(2))
          cup.classList.toggle('is-over', taps > n)
          feedback(ctx, 'tap')
          render()
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
    const T = Math.max(0.5, Number(params.T) || 3) * (ctx.assist ? 1.5 : 1)
    fr.setSub(`Chạm nhanh đủ ${N} lần trong ${String(T).replace('.', ',')} giây.`)
    let taps = 0
    let t0 = null
    const counter = h('div', { class: 'mg-count', 'data-testid': 'cham-count' })
    const pad = h('button', { class: 'cham-pad', type: 'button', 'data-testid': 'cham-pad', 'data-n': String(N), 'data-t': String(T) },
      svgBox(ingIcon(step.ing, ctx), 'cham-pad-icon'), h('span', { class: 'cham-pad-label' }, 'Chạm!'))
    const barFill = h('div', { class: 'mg-bar-fill' })
    const bar = h('div', { class: 'mg-bar', 'data-testid': 'cham-progress' }, barFill)
    fr.area.append(pad)
    fr.foot.append(bar, counter)
    const render = () => {
      counter.textContent = `${taps}/${N}`
      barFill.style.transform = `scaleX(${clamp(taps / N, 0, 1)})`
      bar.classList.toggle('is-full', taps >= N)
      bar.classList.toggle('is-over', taps > N * 1.2)
    }
    unbinds.push(bindPointer(pad, {
      down() {
        if (out.done) return
        if (t0 === null) t0 = clock.elapsed()
        taps++
        pad.classList.remove('is-pop'); void pad.offsetWidth; pad.classList.add('is-pop')
        feedback(ctx, 'tap')
        render()
      }
    }, { space: true }))
    render()
    minTick = () => {
      if (t0 !== null && clock.elapsed() - t0 >= T) finish()
    }
    minLeft = () => (t0 === null ? 1 : clamp(1 - (clock.elapsed() - t0) / T, 0, 1))
    return () => ({ score: scoreChamMin({ taps, N }), details: { mode, taps, N, T } })
  }

  // ---- targets ----
  function mountTargets() {
    const targets = params.targets || {}
    const ids = Object.keys(targets)
    fr.setSub('Chạm từng chai cho đúng số nấc, rồi bấm Xong.')
    const counts = {}
    const row = h('div', { class: 'cham-bottles' })
    for (const id of ids) {
      counts[id] = 0
      const cnt = h('span', { class: 'cham-bottle-count' }, '0')
      const b = h('button', {
        class: 'cham-bottle', type: 'button', 'data-testid': 'cham-bottle-' + id,
        'data-target': String(targets[id]), 'data-count': '0'
      }, svgBox(ingIcon(id, ctx), 'cham-bottle-icon'),
      h('span', { class: 'cham-bottle-name' }, ingName(id, ctx)),
      h('span', { class: 'cham-bottle-need' }, `Cần ${targets[id]} nấc`), cnt)
      unbinds.push(bindPointer(b, {
        down() {
          if (out.done) return
          counts[id]++
          b.dataset.count = String(counts[id])
          cnt.textContent = String(counts[id])
          b.classList.toggle('is-ok', counts[id] === targets[id])
          b.classList.toggle('is-over', counts[id] > targets[id])
          b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop')
          feedback(ctx, 'tap')
        }
      }, { space: false }))
      row.appendChild(b)
    }
    if (!ids.length) row.appendChild(h('div', { class: 'mg-empty' }, 'Không cần nêm thêm.'))
    const done = h('button', { class: 'btn btn-primary mg-done', type: 'button', 'data-testid': 'cham-done' }, 'Xong')
    fr.area.append(row)
    fr.foot.append(done)
    done.addEventListener('click', () => finish())
    return () => ({ score: scoreChamTargets({ counts, targets }), details: { mode, counts: { ...counts }, targets: { ...targets } } })
  }

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
    out.settle(res)
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    for (const u of unbinds) u()
    unbinds = []
  }

  return { result: out.promise, destroy() { cleanup(); out.settle(null) } }
}

export default { type: 'cham', mount }
