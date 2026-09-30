// ROT — rót: giữ rot-pour (hoặc Space) để rót, thả tay để dừng. Mực dâng nhanh dần nhưng gần vạch
// không quá 25%/giây. Được nhấn lần 2 để rót bù (chậm hơn); lần 2 thả tay là xong. Tràn > 1,02 → 0.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreRot } from '../../core/minigame-scoring.js'
import { clamp, createClock, frameLoop, settleOnce, feedback, stepLimitSec, buildFrame, ingIcon, scaledZone, rotSpeed } from './_util.js'

export const ROT_SPILL = 1.02
export const ROT_MAX_POURS = 2

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const zone = params.zone || [0.7, 0.82]
  const mul = ctx.zoneMul || 1
  const limit = ctx.untimed ? Infinity : stepLimitSec(step.par, ctx.assist)   // Nấu thử: không giới hạn
  const [za, zb] = scaledZone(zone, mul, 0, 1)
  const clock = createClock()
  const out = settleOnce()
  stage.classList.add('mg-rot')
  const fr = buildFrame(stage, step, ctx, { sub: 'Giữ để rót, thả tay đúng vạch.' })

  const level = h('div', { class: 'rot-level', 'data-testid': 'rot-level', 'data-v': '0' })
  const zoneEl = h('div', {
    class: 'rot-zone', 'data-testid': 'rot-zone', 'data-a': za.toFixed(3), 'data-b': zb.toFixed(3),
    style: { bottom: (za * 100).toFixed(2) + '%', height: ((zb - za) * 100).toFixed(2) + '%' }
  })
  const stream = h('div', { class: 'rot-stream' })
  const cup = h('div', { class: 'rot-cup' }, level, zoneEl, h('div', { class: 'rot-rim' }))
  const bottle = h('div', { class: 'rot-bottle' }, svgBox(ingIcon(step.ing, ctx), 'rot-bottle-icon'))
  const pour = h('button', { class: 'btn btn-primary rot-pour', type: 'button', 'data-testid': 'rot-pour' }, 'Giữ để rót')
  const done = h('button', { class: 'btn btn-ghost mg-done', type: 'button', 'data-testid': 'rot-done', disabled: true }, 'Xong')
  const counter = h('div', { class: 'mg-count', 'data-testid': 'rot-count' }, 'Lần rót 0/' + ROT_MAX_POURS)
  fr.area.append(h('div', { class: 'rot-scene' }, bottle, stream, cup))
  fr.foot.append(counter, pour, done)

  let v = 0
  let pours = 0
  let pouring = false
  let holdStart = 0
  let spilled = false
  let resumable = false   // lượt rót bị ngắt vì rời tab: giữ lại để rót tiếp, không tính thêm lượt

  function setLevel(x) {
    v = x
    level.style.height = (clamp(x, 0, 1) * 100).toFixed(2) + '%'
    level.dataset.v = x.toFixed(3)
    level.classList.toggle('is-in', x >= za && x <= zb)
  }

  function start() {
    if (out.done || pouring || spilled) return
    if (resumable) resumable = false
    else if (pours >= ROT_MAX_POURS) return
    else pours++
    pouring = true
    holdStart = clock.elapsed()
    stage.classList.add('is-pouring')
    pour.classList.add('is-down')
    counter.textContent = `Lần rót ${pours}/${ROT_MAX_POURS}`
    if (pours >= 2) pour.textContent = 'Giữ để rót bù'
  }
  function stop() {
    if (!pouring) return
    pouring = false
    stage.classList.remove('is-pouring')
    pour.classList.remove('is-down')
    feedback(ctx, 'tap')
    if (pours >= ROT_MAX_POURS) { setTimeout(finish, 250); return }
    done.disabled = false
    pour.textContent = 'Giữ để rót bù'
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
    pour.textContent = 'Giữ để rót tiếp'
  }
  const onVis = () => { if (document.hidden) pauseHidden() }
  document.addEventListener('visibilitychange', onVis)

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
    const wipe = h('div', { class: 'rot-wipe' }, 'Tràn rồi! Lau bàn…')
    cup.appendChild(wipe)
    loop.stop()
    setTimeout(finish, 650)
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
    loop.stop()
    clock.destroy()
    unbind()
    document.removeEventListener('visibilitychange', onVis)
  }

  return { result: out.promise, destroy() { cleanup(); out.settle(null) } }
}

export default { type: 'rot', mount }
