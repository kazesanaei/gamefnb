// DAP — đập trứng (M5, bản TẠM chơi được; gói Bếp lửa làm đẹp sau, giữ nguyên hợp đồng testid/data-*).
// Hai nhịp mỗi quả: (1) chạm quả trứng khi kim thước lực (chạy đi về, chu kỳ 1,1 s) nằm trong vùng xanh → trứng nứt;
// (2) vuốt xuống (±35° × mul, tối đa 50°) để tách vào chảo. Chạm thay vì vuốt (với trứng đã nứt) hoặc chạm quá mạnh (kim quá
// vùng xanh) thì vỏ rơi vào chảo (quả đó tối đa 40 điểm). Đủ n quả thì tự xong. Chấm: scoreDap (core/minigame-scoring.js).
// Hợp đồng e2e: dap-pan; dap-egg[data-state = nguyen|nut|xong, data-i]; dap-meter[data-a, data-b]; dap-needle[data-v];
// dap-count[data-v, data-n]. Nhấn giữ quả trứng lúc kim trong [a, b] rồi kéo xuống ~80px và thả = một quả hoàn hảo.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreDap, DAP_ZONE } from '../../core/minigame-scoring.js'
import { createClock, frameLoop, settleOnce, feedback, scaledZone } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2, STATES_V2 } from '../art/v2.js'
import { isReduced } from '../motion.js'
import { classifySwipe, needleValue, NEEDLE_PERIOD, gestureLimitSec } from './_gesture.js'

export const DAP_SWIPE_MIN = 36        // px: vuốt tối thiểu để tách trứng
export const DAP_TAP_MAX = 12          // px: dịch dưới mức này coi là chạm (không phải vuốt)

// Âm theo tên (âm mới của M5 có thể chưa có trong bộ âm: dùng âm dự phòng).
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

// SVG đặt vừa khung (chiếm trọn hộp, giữ tỉ lệ).
function artBox(svg, style = '') {
  const box = svgBox(svg, 'mg-art', { style: 'display:block;' + style })
  const s = box.firstElementChild
  if (s) { s.style.width = '100%'; s.style.height = '100%'; s.style.display = 'block' }
  return box
}

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const n = Math.max(1, Math.floor(Number(params.n) || 1))
  const mul = ctx.zoneMul || 1
  const limit = gestureLimitSec(step, { assist: !!ctx.assist, untimed: !!ctx.untimed })
  const period = NEEDLE_PERIOD * (ctx.assist ? 1.5 : 1)
  const [za, zb] = scaledZone(DAP_ZONE, mul, 0, 1)
  const tol = Math.min(50, 35 * mul)
  const clock = createClock()
  const out = settleOnce()
  const vfx = ctx.vfx || null
  const reduced = reducedOf(ctx)
  const T = ((ctx.data || {}).MINIGAME_TYPES || {}).dap || {}
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const eggId = (INGS[step.ing] && INGS[step.ing].icon) || step.ing || 'trung_ga'
  const has = k => Object.prototype.hasOwnProperty.call(STATES_V2, k)
  const eggSvg = artV2(eggId)
  const crackSvg = has(eggId + '.nut') ? STATES_V2[eggId + '.nut'] : artV2('trung_ga', 'nut')
  const friedSvg = has(eggId + '.op_la') ? STATES_V2[eggId + '.op_la'] : artV2('trung_ga', 'op_la')
  const ta = eggId === 'trung_ga_ta'

  stage.classList.add('mg-dap')
  const fr = buildFrame2(stage, {
    icon: eggSvg, title: step.label || T.name || '', sub: T.sub || 'Chạm trứng khi kim vào vùng xanh, rồi vuốt xuống.',
    steps: Number(ctx.stepTotal) > 0 ? { index: ctx.stepIndex, total: ctx.stepTotal, grades: ctx.stepGrades || [] } : null,
    timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })

  // Thước lực (trên cùng vùng chơi, ngón tay không che): vùng xanh + kim chạy đi về.
  const pct = v => (Math.max(0, Math.min(1, v)) * 100).toFixed(2) + '%'
  const zoneEl = h('div', {
    class: 'dap-zone',
    style: `position:absolute;top:0;bottom:0;left:${pct(za)};width:calc(${pct(zb)} - ${pct(za)});background:#5fbf4a;border-left:2px solid #3a2618;border-right:2px solid #3a2618;`
  })
  const needle = h('div', {
    class: 'dap-needle', 'data-testid': 'dap-needle', 'data-v': '0',
    style: 'position:absolute;top:-5px;bottom:-5px;left:0;width:6px;margin-left:-3px;border-radius:3px;background:#3a2618;box-shadow:0 0 0 2px #fffaf0;'
  })
  const meter = h('div', {
    class: 'dap-meter', 'data-testid': 'dap-meter', 'data-a': za.toFixed(3), 'data-b': zb.toFixed(3),
    role: 'meter', 'aria-label': 'Lực tay', 'aria-valuemin': '0', 'aria-valuemax': '1',
    style: 'position:absolute;top:6px;left:50%;transform:translateX(-50%);width:min(300px,84%);height:18px;border:3px solid #3a2618;border-radius:999px;background:linear-gradient(90deg,#f6e7c4,#f3c27a 70%,#e2553f);overflow:visible;box-shadow:0 2px 0 rgba(58,38,24,.3);'
  }, h('div', { style: 'position:absolute;inset:0;border-radius:999px;overflow:hidden;' }, zoneEl), needle)

  // Chảo (đạo cụ lớn nếu bộ hình đã có, không thì vẽ bằng CSS) và trứng đã tách trong chảo.
  const panArt = propV2('chao_lon')
  const panInner = h('div', { class: 'dap-pan-in', style: 'position:absolute;inset:0;' })
  const pan = h('div', {
    class: 'dap-pan', 'data-testid': 'dap-pan',
    style: 'position:absolute;left:50%;bottom:4px;transform:translateX(-50%);width:min(320px,90%);height:min(120px,40%);min-height:60px;' +
      (panArt ? '' : 'border:4px solid #3a2618;border-radius:50%;background:radial-gradient(ellipse at 45% 40%,#6b6b6b 0 30%,#3d3d3d 62%,#262626 100%);box-shadow:0 4px 0 rgba(58,38,24,.35),inset 0 0 0 6px #555;') +
      (ta ? '--yolk:#e8730c;' : '')
  }, panArt ? artBox(panArt, 'position:absolute;inset:0;width:100%;height:100%;') : null, panInner)

  // Quả trứng đang cầm (vùng thao tác): khung định vị + phần hình (để rung, kéo không đè transform định vị).
  const eggArt = h('div', { class: 'dap-egg-art', style: 'width:100%;height:100%;' }, artBox(eggSvg, 'width:100%;height:100%;'))
  const egg = h('div', {
    class: 'dap-egg', 'data-testid': 'dap-egg', 'data-state': 'nguyen', 'data-i': '0', role: 'button',
    'aria-label': 'Quả trứng',
    style: 'position:absolute;left:50%;top:34px;transform:translateX(-50%);width:clamp(64px,30%,112px);aspect-ratio:1;' +
      'touch-action:none;cursor:pointer;z-index:2;' + (ta ? '--yolk:#e8730c;' : '')
  }, eggArt)
  const scene = h('div', { class: 'dap-scene', style: 'position:relative;flex:1 1 0;width:100%;min-height:120px;' }, meter, pan, egg)
  fr.area.append(scene)

  // Bố cục theo cỡ cảnh: chảo dưới đáy, trứng cầm ngay trên miệng chảo (chồng nhẹ lên vành), thước trên cùng.
  function layout() {
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return
    const panH = Math.max(60, Math.min(120, r.height * 0.4))
    const panW = Math.min(320, r.width * 0.9, panH * 2.8)
    const egg0 = Math.max(64, Math.min(128, r.width * 0.32, r.height - 34 - panH * 0.75))
    const top = Math.max(34, r.height - 4 - panH * 0.75 - egg0)
    Object.assign(pan.style, { width: panW + 'px', height: panH + 'px' })
    Object.assign(egg.style, { width: egg0 + 'px', height: egg0 + 'px', top: top + 'px' })
  }
  layout()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(layout) : null
  if (ro) ro.observe(scene)

  const countText = T.count || 'Trứng'
  const counter = h('div', { class: 'mg-count g-pill g-pill--big', 'data-testid': 'dap-count', 'data-v': '0', 'data-n': String(n) })
  fr.foot.append(counter)

  const cracks = []           // [{ force, split, shell }]
  let cur = { force: null, shell: false, state: 'nguyen' }
  let drag = null
  const timers = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }
  let needleV = 0

  function renderCount() {
    counter.textContent = `${countText} ${cracks.length}/${n}`
    counter.dataset.v = String(cracks.length)
  }
  renderCount()

  function setEggState(st) {
    cur.state = st
    egg.dataset.state = st
    const svg = st === 'nguyen' ? eggSvg : crackSvg
    eggArt.replaceChildren(artBox(svg, 'width:100%;height:100%;'))
    // tách xong: vỏ rỗng biến đi, chờ quả kế tiếp nảy vào
    eggArt.style.opacity = st === 'xong' ? '0' : ''
  }

  function float(text, tone, at = egg) {
    if (vfx) vfx.floatText(at, text, { tone, size: 'small' })
  }

  // Nhịp 1: nứt trứng — lực là vị trí kim lúc chạm.
  function crack() {
    const f = Math.round(needleV * 1000) / 1000
    cur.force = f
    cur.shell = f > zb + 1e-9           // quá mạnh: vỏ vụn rơi vào chảo
    setEggState('nut')
    cue(ctx, 'crack', 'chop')
    feedback(ctx, f >= za && f <= zb ? 'hit' : 'tap')
    if (f > zb) float('Mạnh tay quá!', 'bad')
    else if (f < za) float('Nhẹ tay quá', 'bad')
    else float('Nứt đẹp!', 'good')
    // trứng rung 3px (phản hồi nứt); giảm chuyển động: bỏ rung
    if (!reduced() && typeof eggArt.animate === 'function') {
      try {
        eggArt.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(-3px)' },
          { transform: 'translateX(2px)' }, { transform: 'translateX(0)' }], { duration: 180, easing: 'linear' })
      } catch { /* bỏ qua */ }
    }
  }

  // Nhịp 2: tách vào chảo (shell: vỏ rơi theo).
  function split(shell) {
    const rec = { force: cur.force, split: true, shell: !!(shell || cur.shell) }
    cracks.push(rec)
    eggArt.style.transform = ''
    setEggState('xong')
    renderCount()
    const i = cracks.length - 1
    const slots = Math.max(1, n)
    const x = slots === 1 ? 50 : 22 + (56 * i) / (slots - 1)
    const fried = h('div', {
      class: 'dap-fried', 'data-shell': rec.shell ? '1' : '0',
      style: `position:absolute;left:${x.toFixed(1)}%;top:50%;width:min(42%,96px);aspect-ratio:1;transform:translate(-50%,-50%);pointer-events:none;`
    }, artBox(friedSvg, 'width:100%;height:100%;'))
    if (rec.shell) {
      fried.appendChild(h('i', {
        class: 'dap-shell',
        style: 'position:absolute;left:58%;top:30%;width:12px;height:9px;background:#fff7e8;border:2px solid #3a2618;border-radius:2px 8px 3px 6px;transform:rotate(18deg);'
      }))
    }
    panInner.appendChild(fried)
    feedback(ctx, 'sizzle')
    if (rec.shell) float('Có vỏ!', 'bad', pan)
    if (vfx && !reduced()) {
      vfx.squash(fried.firstChild)
      vfx.burst(pan, 'oil', { n: 6 + Math.floor(Math.random() * 5) })
    }
    if (cracks.length >= n) { later(finish, 380); return }
    // quả kế tiếp
    later(() => {
      if (out.done) return
      cur = { force: null, shell: false, state: 'nguyen' }
      egg.dataset.i = String(cracks.length)
      setEggState('nguyen')
      if (vfx) vfx.pop(eggArt)
    }, 260)
  }

  const unbind = bindPointer(egg, {
    down(p) {
      if (out.done || cur.state === 'xong') return
      const fresh = cur.state === 'nguyen'
      if (fresh) crack()
      drag = { x0: p.clientX, y0: p.clientY, fresh }
    },
    move(p) {
      if (!drag || out.done) return
      // trứng đi theo ngón khi kéo xuống (phản hồi trực tiếp: giữ cả khi giảm chuyển động)
      const dy = Math.max(0, Math.min(64, p.clientY - drag.y0))
      eggArt.style.transform = `translateY(${dy}px)`
    },
    up(p) { endDrag(p, false) },
    cancel(p) { endDrag(p, true) }
  })

  function endDrag(p, cancelled) {
    const d = drag
    drag = null
    if (!d || out.done || cur.state !== 'nut') { eggArt.style.transform = ''; return }
    const sw = classifySwipe({ x: d.x0, y: d.y0 }, { x: p.clientX, y: p.clientY }, { axis: 'y', tolDeg: tol, minLen: DAP_SWIPE_MIN, dir: 1 })
    if (sw.ok) { split(false); return }
    eggArt.style.transform = ''
    if (cancelled) return
    // chạm (không vuốt) vào trứng đã nứt từ trước → bóp vỡ, vỏ rơi vào chảo
    if (sw.len < DAP_TAP_MAX && !d.fresh) { split(true); return }
    if (sw.len >= DAP_TAP_MAX) float('Vuốt xuống!', 'bad')
  }

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
    needleV = needleValue(t, period)
    needle.style.left = pct(needleV)
    needle.dataset.v = needleV.toFixed(3)
    fr.setTime(t / limit)
    if (t >= limit) finish()
  })

  function finish() {
    if (out.done) return
    const elapsed = clock.elapsed()
    cleanup()
    const score = scoreDap({ cracks, n, zone: DAP_ZONE, mul })
    if (cracks.length < n && vfx) float('Hết giờ', 'bad', pan)
    feedback(ctx, score >= 90 ? 'good' : score < 50 ? 'bad' : 'ok')
    out.settle({ score, details: { cracks: cracks.map(c => ({ ...c })), n, zone: DAP_ZONE.slice(), shown: [za, zb], elapsed } })
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

export default { type: 'dap', mount }
