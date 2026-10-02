// LUA — canh lửa: kim độ chín chạy 0 → 1,2 trong period giây; bấm "Nhấc" (hoặc Space) khi kim trong vùng xanh.
// Vượt 1,0 là cháy (0 điểm). Tạm dừng khi tab bị ẩn. Cách chấm giữ nguyên (scoreLua, scaledZone, luaValue).
// Cảnh M5 (gói Bếp lửa): thước kim trên cùng; dưới là bếp ga có lửa (lửa lắc nhẹ bằng CSS) với chảo lớn (chiên trứng ốp la,
// nướng bánh mì) hoặc nồi lớn (luộc), lớp vỏ phin là phin nhỏ giọt trên ly (không bếp). Món đổi theo độ chín bằng các lớp
// hình trạng thái chồng nhau (chỉ đổi opacity): trứng sống → ốp la → chín kỹ → cháy; bánh mì → nướng giòn → sém → cháy;
// miếng cùi bưởi áo bột trắng đục → trong → nhũn; cà phê trong ly đậm dần. Qua vùng xanh: khói đen bốc (chảo), tiếng bíp
// nhanh dần ('tick'), thước rung nhẹ. Âm lúc bắt đầu theo lớp vỏ (chảo: 'sizzle'; phin, nồi: không).
// Hợp đồng e2e: lua-zone[data-a, data-b]; lua-needle[data-v] (lớp .is-in khi trong vùng); lua-lift (chốt ở pointerdown);
// .mg-sub là dòng hướng dẫn; nhãn nút, vạch quá theo lớp vỏ (MINIGAME_TYPES.lua.skins).
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreLua } from '../../core/minigame-scoring.js'
import { clamp, createClock, frameLoop, settleOnce, feedback, stepLimitSec, scaledZone, luaValue } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2, PROP_META } from '../art/v2.js'
import { isReduced } from '../motion.js'

export const LUA_MAX = 1.2
export const LUA_GAUGE_H = 58        // px: dải thước kim ở đầu cảnh (đầu kim nhô lên + thước + nhãn vạch quá)
export const LUA_STOVE_MIN = 150     // px: chỗ còn lại dưới thước tối thiểu để vẽ cả bếp ga dưới chảo/nồi

// Màu món theo độ chín: sống → vàng → nâu → cháy.
export function doneness(v) {
  if (v > 1.0) return 'chay'
  if (v > 0.85) return 'nau'
  if (v > 0.45) return 'vang'
  return 'song'
}

/** Khoảng giữa hai tiếng bíp (giây) khi kim đã qua vùng xanh, nhanh dần tới vạch cháy; null nếu chưa (hoặc đã) cháy. */
export function beepGap(v, zb) {
  if (!(v > zb) || v > 1.0) return null
  const k = clamp((v - zb) / Math.max(0.05, 1.0 - zb), 0, 1)
  return 0.55 - 0.42 * k
}

/** Số quả trứng trong chảo ở bước chiên: n của bước đập trứng cùng món (đã vá theo ghi chú, nhân số phần), tối đa 4. */
export function eggCount(step, { recipe, notes = [], qty = 1 } = {}) {
  const R = recipe
  if (!R || !Array.isArray(R.steps)) return 1
  const d = R.steps.find(s => s && s.type === 'dap' && (!step || !step.ing || s.ing === step.ing)) || R.steps.find(s => s && s.type === 'dap')
  if (!d) return 1
  let n = Number(d.params && d.params.n) || 1
  for (const id of notes || []) {
    const no = (R.notes || []).find(x => x.id === id)
    const p = no && no.patch && no.patch[d.id]
    if (p && Number(p.n) > 0) n = Number(p.n)
  }
  n *= Math.max(1, Math.floor(Number(qty) || 1))
  return Math.max(1, Math.min(4, Math.floor(n)))
}

const META_FALLBACK = {
  chao_lon: { vb: [320, 176], floor: { cx: 140, cy: 99, rx: 90, ry: 37 }, rim: { cx: 140, cy: 90, rx: 116, ry: 52 }, base: [140, 157] },
  noi_lon: { vb: [240, 210], water: { cx: 120, cy: 70, rx: 86, ry: 21 }, rim: { cx: 120, cy: 64, rx: 98, ry: 30 }, base: [120, 198] },
  phin_lon: { vb: [200, 280], drip: [100, 166], cup: { mouth: { cx: 100, cy: 152, rx: 58, ry: 11 }, bottom: { cx: 100, cy: 250, rx: 47, ry: 8 }, left: [[42, 156], [53, 250]], right: [[158, 156], [147, 250]] } },
  bep_ga: { vb: [260, 170], seat: [104, 55.5] }
}
const metaOf = id => (PROP_META && PROP_META[id] && PROP_META[id].vb ? PROP_META[id] : META_FALLBACK[id])

/**
 * Bố cục cảnh canh lửa (thuần, px trong khung cảnh W×H). skin: 'chao' | 'noi' | 'phin'.
 * → { gauge: {x, y, w}, vessel: {x, y, w, h, s}, stove: {x, y, w, h} | null }
 * Chảo canh giữa theo lòng chảo (cán chìa sang phải); đáy chảo/nồi (base) đặt lên mặt kiềng (seat) của bếp ga.
 */
export function luaLayout(W, H, skin = 'chao') {
  const w = Math.max(120, Number(W) || 0), hh = Math.max(100, Number(H) || 0)
  const gw = Math.round(Math.min(340, w - 12))
  const gauge = { x: Math.round((w - gw) / 2), y: 16, w: gw }
  const top = LUA_GAUGE_H
  const room = hh - top - 2
  const id = skin === 'noi' ? 'noi_lon' : skin === 'phin' ? 'phin_lon' : 'chao_lon'
  const m = metaOf(id)
  const [VW, VH] = m.vb
  const cx = skin === 'chao' ? m.rim.cx : VW / 2
  const half = w / 2 - 4
  if (skin === 'phin') {
    const s = Math.max(0.2, Math.min(room / VH, (w - 8) / VW, 1))
    return { gauge, vessel: { x: Math.round(w / 2 - VW * s / 2), y: Math.round(top + (room - VH * s) / 2), w: Math.round(VW * s), h: Math.round(VH * s), s }, stove: null }
  }
  const st = metaOf('bep_ga')
  const [SW, SH] = st.vb
  const k = 0.95                                  // bếp hẹp hơn chảo/nồi một chút
  const base = m.base[1]
  const totalU = base + (SH - st.seat[1]) * k     // từ mép trên hình chảo/nồi tới đáy bếp (đơn vị chảo)
  const sW = Math.min(half / Math.max(VW - cx, cx), half / Math.max(st.seat[0], SW - st.seat[0]) / k)
  let s = Math.min(sW, room / totalU, 1)
  let withStove = room >= LUA_STOVE_MIN && s > 0.32
  if (!withStove) s = Math.max(0.22, Math.min(sW, room / VH, 1))
  const vx = w / 2 - cx * s
  const vh = VH * s
  const totalH = withStove ? totalU * s : vh
  const y0 = top + Math.max(0, (room - totalH) * (withStove ? 0.7 : 0.5))
  const vessel = { x: Math.round(vx), y: Math.round(y0), w: Math.round(VW * s), h: Math.round(vh), s }
  let stove = null
  if (withStove) {
    const t = s * k
    const seatY = y0 + base * s
    stove = { x: Math.round(w / 2 - st.seat[0] * t), y: Math.round(seatY - st.seat[1] * t), w: Math.round(SW * t), h: Math.round(SH * t) }
  }
  return { gauge, vessel, stove }
}

// Âm theo tên viết thẳng (audio.js SOUND_NAMES) — bỏ qua nếu không có app.
function soundOf(ctx) {
  return name => {
    const app = ctx && ctx.app
    try { if (app && typeof app.sound === 'function') app.sound(name) } catch { /* bỏ qua */ }
  }
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

// Các lớp hình theo độ chín (song, vang, nau, chay) của món trong chảo. Lớp nào chưa có hình riêng thì dùng hình gần nhất
// kèm bộ lọc màu tĩnh (lớp CSS .is-tint-*), không đổi bộ lọc theo thời gian (chỉ đổi opacity giữa các lớp).
function foodLayers(artId) {
  const st = k => { const a = artV2(artId, k); return a !== artV2(artId) ? a : null }
  if (st('op_la')) {
    return [['song', st('op_la_song') || st('op_la'), ''], ['vang', st('op_la'), ''], ['nau', st('chin_ky') || st('op_la'), ''],
      ['chay', st('op_la_chay') || st('op_la'), st('op_la_chay') ? '' : 'is-tint-chay']]
  }
  const base = artV2(artId)
  const done = st('nuong') || base
  return [['song', base, ''], ['vang', done, ''], ['nau', done, 'is-tint-nau'], ['chay', done, 'is-tint-chay']]
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
  const vfx = ctx.vfx || (ctx.app && ctx.app.vfx) || null
  const reduced = reducedOf(ctx)
  const sound = soundOf(ctx)
  // lớp vỏ theo bước: chảo (chiên), phin (cà phê nhỏ giọt), nồi (luộc) — cùng cơ chế, khác hình và nhãn
  const skinId = step.skin === 'phin' || step.skin === 'noi' ? step.skin : 'chao'
  const skin = ((((ctx.data || {}).MINIGAME_TYPES || {}).lua || {}).skins || {})[skinId] || {}
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const ingArt = (INGS[step.ing] && INGS[step.ing].icon) || step.ing || 'fallback'
  const ta = ingArt === 'trung_ga_ta'
  stage.classList.add('mg-lua', 'g-heat', 'skin-' + skinId)
  stage.dataset.skin = skinId
  const fr = buildFrame2(stage, {
    icon: artV2(ingArt), title: step.label || skin.name || '', sub: skin.sub || 'Nhấc khi kim nằm trong vùng xanh.',
    steps: Number(ctx.stepTotal) > 0 ? { index: ctx.stepIndex, total: ctx.stepTotal, grades: ctx.stepGrades || [] } : null,
    timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })

  // ---- thước kim (trên cùng): vùng xanh ✓, vạch quá (sọc đỏ) có nhãn, kim chạy bằng transform theo bề ngang lòng thước ----
  const pct = v => (clamp(v, 0, LUA_MAX) / LUA_MAX * 100).toFixed(2) + '%'
  const zoneEl = h('div', {
    class: 'lua-zone', 'data-testid': 'lua-zone', 'data-a': za.toFixed(3), 'data-b': zb.toFixed(3),
    style: { left: pct(za), width: `calc(${pct(zb)} - ${pct(za)})` }
  })
  const burn = h('div', { class: 'lua-burn', style: { left: pct(1.0) } })
  const needle = h('div', { class: 'lua-needle', 'data-testid': 'lua-needle', 'data-v': '0' })
  const rail = h('div', { class: 'lua-rail' }, needle)
  const gauge = h('div', { class: 'lua-gauge', role: 'meter', 'aria-label': 'Độ chín', 'aria-valuemin': '0', 'aria-valuemax': String(LUA_MAX) },
    h('div', { class: 'lua-track' }, zoneEl, burn), rail,
    h('span', { class: 'lua-tick', style: { left: pct(1.0) } }, skin.over || 'Cháy'))

  // ---- bếp ga + chảo/nồi/phin + món ----
  const vesselId = skinId === 'noi' ? 'noi_lon' : skinId === 'phin' ? 'phin_lon' : 'chao_lon'
  const vm = metaOf(vesselId)
  const vesselArt = propV2(vesselId)
  const stoveArt = skinId === 'phin' ? '' : propV2('bep_ga')
  const stove = stoveArt ? h('div', { class: 'lua-stove' }, svgBox(stoveArt, 'lua-art')) : null
  const food = h('div', { class: 'lua-food', 'data-state': 'song' })
  const fx = h('div', { class: 'lua-fx' },
    h('i', { class: 'lua-steam s1' }), h('i', { class: 'lua-steam s2' }), h('i', { class: 'lua-steam s3' }),
    h('i', { class: 'lua-smoke s1' }), h('i', { class: 'lua-smoke s2' }), h('i', { class: 'lua-smoke s3' }))
  const vessel = h('div', { class: ['lua-vessel', 'is-' + skinId, vesselArt ? '' : 'is-css'] })
  // vị trí theo đơn vị viewBox của đạo cụ → % khung đạo cụ
  const [VW, VH] = vm.vb
  const px = x => (x / VW * 100).toFixed(2) + '%'
  const py = y => (y / VH * 100).toFixed(2) + '%'
  const box = (cx, cy, wU, hU) => ({ left: px(cx - wU / 2), top: py(cy - hU / 2), width: px(wU), height: py(hU) })
  let coffee = null
  if (skinId === 'phin') {
    // cà phê trong ly: vẽ DƯỚI hình phin (thân ly trong suốt), cắt theo hình thang lòng ly; mực dâng bằng transform
    const c = vm.cup
    const x0 = Math.min(c.left[0][0], c.left[1][0]), x1 = Math.max(c.right[0][0], c.right[1][0])
    const y0 = c.mouth.cy, y1 = c.bottom.cy + c.bottom.ry
    const rx = x => ((x - x0) / (x1 - x0) * 100).toFixed(1) + '%'
    const ry = y => ((y - y0) / (y1 - y0) * 100).toFixed(1) + '%'
    const clip = `polygon(${rx(c.left[0][0])} ${ry(c.left[0][1])}, ${rx(c.right[0][0])} ${ry(c.right[0][1])}, ${rx(c.right[1][0])} ${ry(c.right[1][1])}, ` +
      `${rx(c.bottom.cx + c.bottom.rx * 0.6)} 100%, ${rx(c.bottom.cx - c.bottom.rx * 0.6)} 100%, ${rx(c.left[1][0])} ${ry(c.left[1][1])})`
    const liquid = h('div', { class: 'lua-coffee-liquid' }, h('i', { class: 'lua-coffee-top' }))
    coffee = h('div', { class: 'lua-coffee', style: { left: px(x0), top: py(y0), width: px(x1 - x0), height: py(y1 - y0), clipPath: clip, webkitClipPath: clip } }, liquid)
    vessel.append(coffee)
    if (vesselArt) vessel.append(svgBox(vesselArt, 'lua-art'))
    const [dx, dy] = vm.drip
    vessel.append(h('div', { class: 'lua-drips', style: { left: px(dx), top: py(dy) } }, h('i', { class: 'lua-drip d1' }), h('i', { class: 'lua-drip d2' })))
  } else if (skinId === 'noi') {
    if (vesselArt) vessel.append(svgBox(vesselArt, 'lua-art'))
    // miếng cùi bưởi áo bột nổi trong nồi: trắng đục → trong → nhũn; bọt nước sôi
    const wt = vm.water
    const water = h('div', { class: 'lua-water', style: box(wt.cx, wt.cy, wt.rx * 2, wt.ry * 2) })
    const spots = [[-0.55, 0.05], [-0.22, -0.3], [0.12, 0.2], [0.42, -0.2], [0.62, 0.22], [-0.05, -0.05]]
    for (const [i, [ox, oy]] of spots.entries()) {
      water.append(h('i', { class: 'lua-bit', style: { left: (50 + ox * 42).toFixed(1) + '%', top: (50 + oy * 70).toFixed(1) + '%', '--r': ((i * 37) % 50 - 25) + 'deg' } }, h('b', { class: 'lua-bit-raw' })))
    }
    for (const i of [1, 2, 3, 4]) water.append(h('i', { class: 'lua-bubble b' + i }))
    vessel.append(water)
  } else {
    if (vesselArt) vessel.append(svgBox(vesselArt, 'lua-art'))
    // món trong lòng chảo: trứng (đếm theo bước đập trứng) hoặc bánh mì/nguyên liệu; mỗi chỗ có 4 lớp độ chín
    const fl = vm.floor
    const layers = foodLayers(ta ? 'trung_ga' : ingArt)
    const isEgg = artV2(ta ? 'trung_ga' : ingArt, 'op_la') !== artV2(ta ? 'trung_ga' : ingArt)
    const k = isEgg ? eggCount(step, ctx) : 1
    const span = k === 1 ? 0 : Math.min(0.9, 1.4 - 0.25 * Math.min(k, 4)) * fl.rx
    const size = isEgg ? Math.min(1.25, 2.2 / k) * fl.rx : fl.rx * 1.7
    for (let i = 0; i < k; i++) {
      const off = k === 1 ? 0 : -span + (2 * span * i) / (k - 1)
      const slot = h('div', { class: ['lua-slot', isEgg ? 'is-egg' : 'is-item'], style: box(fl.cx + off, fl.cy - (isEgg ? 0 : fl.ry * 0.25), size, size) })
      for (const [key, svg, tint] of layers) slot.append(svgBox(svg, ['lua-layer', 'st-' + key, tint].filter(Boolean).join(' ')))
      food.append(slot)
    }
    for (const i of [1, 2, 3, 4, 5]) food.append(h('i', { class: 'lua-oil o' + i }))
    vessel.append(food)
  }
  vessel.append(fx)
  const scene = h('div', { class: 'lua-scene', style: ta ? { '--yolk': '#e8730c' } : null }, gauge, stove, vessel)
  fr.area.append(scene)

  const lift = h('button', { class: 'g-btn g-btn--primary g-btn--big lua-lift', type: 'button', 'data-testid': 'lua-lift' }, skin.act || 'Nhấc')
  fr.foot.append(lift)

  let railW = 0               // px: bề ngang lòng thước (kim dịch bằng transform trong khoảng này, không tràn khung)
  function layout() {
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return
    const L = luaLayout(r.width, r.height, skinId)
    Object.assign(gauge.style, { left: L.gauge.x + 'px', top: L.gauge.y + 'px', width: L.gauge.w + 'px' })
    railW = Math.max(0, L.gauge.w - 6)
    Object.assign(vessel.style, { left: L.vessel.x + 'px', top: L.vessel.y + 'px', width: L.vessel.w + 'px', height: L.vessel.h + 'px' })
    if (stove) {
      stove.hidden = !L.stove
      if (L.stove) Object.assign(stove.style, { left: L.stove.x + 'px', top: L.stove.y + 'px', width: L.stove.w + 'px', height: L.stove.h + 'px' })
    }
    scene.classList.toggle('has-stove', !!(stove && L.stove))
  }
  layout()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(layout) : null
  if (ro) ro.observe(scene)

  let v = 0
  let nextBeep = 0
  let nextSizzle = 1.4
  const unbind = bindPointer(lift, { down() { finish() } }, { space: true })
  // dầu "xèo" khi món vào chảo; phin, nồi không xèo
  if (skin.sound !== null) sound('sizzle')

  // Sân khấu bếp ở màn thấp cuộn dọc: cuộn sẵn để thước kim và món nằm trên thanh chân (không vừa thì giữ thước ở đầu khung).
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

  function setCoffee(x) {
    if (!coffee) return
    const f = clamp(x / 1.0, 0, 1.12) * 0.74
    coffee.firstChild.style.transform = `translateY(${((1 - f) * 100).toFixed(2)}%)`
  }
  setCoffee(0)

  const loop = frameLoop(() => {
    const t = clock.elapsed()
    v = Math.min(LUA_MAX, luaValue(t, period, slow))
    needle.style.transform = `translateX(${(v / LUA_MAX * railW).toFixed(1)}px)`
    needle.dataset.v = v.toFixed(3)
    needle.classList.toggle('is-in', v >= za && v <= zb)
    const st = doneness(v)
    if (food.dataset.state !== st) { food.dataset.state = st; vessel.dataset.state = st }
    stage.classList.toggle('is-hot', v >= za)
    stage.classList.toggle('is-danger', v > zb && v <= 1.0)
    stage.classList.toggle('is-over', v > 1.0)
    setCoffee(v)
    // qua vùng xanh: bíp nhanh dần tới vạch quá (giữ cả khi giảm chuyển động)
    const gap = beepGap(v, zb)
    if (gap !== null && t >= nextBeep) { sound('tick'); nextBeep = t + gap }
    if (skinId === 'chao' && skin.sound !== null && t >= nextSizzle && v < 1.0) { sound('sizzle'); nextSizzle = t + 1.8 }
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
    stage.classList.remove('is-danger')
    feedback(ctx, value > 1.0 ? 'bad' : score >= 90 ? 'good' : 'ok')
    if (value > 1.0 && vfx && typeof vfx.burst === 'function' && !reduced()) vfx.burst(vessel, 'smoke', { n: 8 })
    out.settle({ score, details: { value, zone: zone.slice(), shown: [za, zb], elapsed: t } })
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    unbind()
    if (ro) ro.disconnect()
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

export default { type: 'lua', mount }
