// LUA — canh lửa: kim độ chín chạy 0 → 1,2 trong period giây; bấm "Nhấc" (hoặc Space) khi kim trong vùng xanh.
// Vượt 1,0 là cháy (0 điểm). Tạm dừng khi tab bị ẩn.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreLua } from '../../core/minigame-scoring.js'
import { clamp, createClock, frameLoop, settleOnce, feedback, stepLimitSec, buildFrame, ingIcon, scaledZone, luaValue } from './_util.js'

export const LUA_MAX = 1.2

// Màu món theo độ chín: sống → vàng → nâu → cháy.
export function doneness(v) {
  if (v > 1.0) return 'chay'
  if (v > 0.85) return 'nau'
  if (v > 0.45) return 'vang'
  return 'song'
}

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const zone = params.zone || [0.55, 0.72]
  const mul = ctx.zoneMul || 1
  const period = Math.max(0.5, Number(params.period) || 5) * (ctx.assist ? 1.5 : 1)
  const limit = ctx.untimed ? Infinity : stepLimitSec(step.par, ctx.assist)   // Nấu thử: không giới hạn
  const [za, zb] = scaledZone(zone, mul, 0, LUA_MAX)
  const slow = ctx.slowBurn ? zb : null
  const clock = createClock()
  const out = settleOnce()
  stage.classList.add('mg-lua')
  const fr = buildFrame(stage, step, ctx, { sub: 'Nhấc khi kim nằm trong vùng xanh.' })

  const pct = v => (clamp(v, 0, LUA_MAX) / LUA_MAX * 100).toFixed(2) + '%'
  const food = h('div', { class: 'lua-food', 'data-state': 'song' }, svgBox(ingIcon(step.ing, ctx), 'lua-food-icon'))
  const pan = h('div', { class: 'lua-pan' }, food, h('div', { class: 'lua-steam' }))
  const zoneEl = h('div', {
    class: 'lua-zone', 'data-testid': 'lua-zone', 'data-a': za.toFixed(3), 'data-b': zb.toFixed(3),
    style: { left: pct(za), width: `calc(${pct(zb)} - ${pct(za)})` }
  })
  const burn = h('div', { class: 'lua-burn', style: { left: pct(1.0) } })
  const needle = h('div', { class: 'lua-needle', 'data-testid': 'lua-needle', 'data-v': '0', style: { left: '0%' } })
  const gauge = h('div', { class: 'lua-gauge', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': String(LUA_MAX) },
    zoneEl, burn, needle, h('span', { class: 'lua-tick', style: { left: pct(1.0) } }, 'Cháy'))
  const lift = h('button', { class: 'btn btn-primary lua-lift', type: 'button', 'data-testid': 'lua-lift' }, 'Nhấc')
  fr.area.append(pan, gauge)
  fr.foot.append(lift)

  let v = 0
  const unbind = bindPointer(lift, { down() { finish() } }, { space: true })

  const loop = frameLoop(() => {
    const t = clock.elapsed()
    v = Math.min(LUA_MAX, luaValue(t, period, slow))
    needle.style.left = pct(v)
    needle.dataset.v = v.toFixed(3)
    needle.classList.toggle('is-in', v >= za && v <= zb)
    const st = doneness(v)
    if (food.dataset.state !== st) food.dataset.state = st
    pan.classList.toggle('is-hot', v >= za)
    fr.setTime(t / limit)
    if (v >= LUA_MAX || t >= limit) finish()
  })

  function finish() {
    if (out.done) return
    const t = clock.elapsed()
    const value = Math.round(Math.min(LUA_MAX, luaValue(t, period, slow)) * 1000) / 1000
    cleanup()
    needle.dataset.v = value.toFixed(3)
    const score = scoreLua({ value, zone, mul })
    stage.classList.add(value > 1.0 ? 'is-burnt' : 'is-lifted')
    feedback(ctx, value > 1.0 ? 'bad' : score >= 90 ? 'good' : 'ok')
    out.settle({ score, details: { value, zone: zone.slice(), shown: [za, zb], elapsed: t } })
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    unbind()
  }

  return { result: out.promise, destroy() { cleanup(); out.settle(null) } }
}

export default { type: 'lua', mount }
