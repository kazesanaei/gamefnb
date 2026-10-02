// DAP — đập trứng (M5, gói Bếp lửa). Hai nhịp mỗi quả:
//  (1) chạm quả trứng khi kim thước lực (chạy đi về, chu kỳ 1,1 s) nằm trong vùng xanh → trứng nứt (âm 'crack', rung 3px);
//  (2) vuốt xuống (±35° × mul, tối đa 50°) → lòng trứng rơi vào chảo, nảy squash, dầu bắn, âm 'sizzle'.
// Chạm thay vì vuốt (với trứng đã nứt) hoặc chạm quá mạnh (kim quá vùng xanh) thì vỏ rơi vào chảo ("Có vỏ!", quả đó tối đa
// 40 điểm). Đủ n quả thì tự xong. Chấm: scoreDap (core/minigame-scoring.js); vùng xanh DAP_ZONE nới theo zoneMul.
// Cảnh: thước lực trên cùng (ngón tay không che), quả trứng to cầm ngay trên miệng chảo lớn (propV2('chao_lon')), trứng đã
// tách nằm trong lòng chảo theo PROP_META.chao_lon.floor. Trứng gà ta: cùng khuôn hình trung_ga.*, đặt --yolk đậm trên cảnh.
// Hợp đồng e2e (giữ nguyên từ gói A): dap-pan; dap-egg[data-state = nguyen|nut|xong, data-i]; dap-meter[data-a, data-b];
// dap-needle[data-v]; dap-count[data-v, data-n]. Cách giải: chờ data-v của kim nằm trong [a, b], nhấn giữ tâm quả trứng,
// kéo xuống 80px rồi thả = một quả hoàn hảo; chờ quả kế tiếp (data-state nguyen, data-i tăng) rồi lặp lại.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreDap, DAP_ZONE } from '../../core/minigame-scoring.js'
import { createClock, frameLoop, settleOnce, feedback, scaledZone } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2, PROP_META } from '../art/v2.js'
import { isReduced } from '../motion.js'
import { classifySwipe, needleValue, NEEDLE_PERIOD, gestureLimitSec } from './_gesture.js'

export const DAP_SWIPE_MIN = 36        // px: vuốt tối thiểu để tách trứng
export const DAP_TAP_MAX = 12          // px: dịch dưới mức này coi là chạm (không phải vuốt)
export const DAP_YOLK_TA = '#e8730c'   // lòng đỏ trứng gà ta (đậm hơn trứng gà thường)
export const DAP_METER_H = 44          // px: dải thước lực ở đầu cảnh (gồm lề và đầu kim nhô lên)

const PAN_FALLBACK = { vb: [320, 176], floor: { cx: 140, cy: 99, rx: 90, ry: 37 }, rim: { cx: 140, cy: 90, rx: 116, ry: 52 }, base: [140, 157] }

// Hình quả ốp la trong ô vuông chứa nó (sau scaleY(.8) của .dap-fried-svg / .lua-slot.is-egg), tính theo cạnh ô: tâm hình
// lệch (dx, dy) so với tâm ô, nửa rộng hw, nửa cao hh. Đo từ friedEgg (art/ing-tuoi.js: mép lượn sóng 27 × 21,5 quanh
// (32, 34) trên khung 64, gồm cả nét viền); không tính bóng đất mờ và khói của trạng thái cháy.
export const EGG_FOOT = Object.freeze({ dx: 0.011, dy: 0.034, hw: 0.457, hh: 0.291 })
export const EGG_MAX = 1.1        // cạnh ô tối đa (một quả) theo floor.rx
export const EGG_PAD = 0.92       // hình trứng nằm trong ellipse lòng chảo thu nhỏ còn 92% (chừa mép, chừa nhịp nảy squash)
const EGG_OVERLAP = 0.12          // hai quả cạnh nhau chờm lên nhau tối đa 12% bề rộng (lòng trắng dính nhau như chảo thật)
const EGG_ROWS_GAIN = 1.15        // chỉ xếp thêm hàng khi quả to hơn ít nhất 15% (ít hàng thì không quả nào khuất sau quả cầm)

/** Hình ốp la của ô {cx, cy, size} (đơn vị khung đạo cụ) có nằm trọn trong ellipse lòng chảo fl (thu theo pad) không. */
export function eggInFloor(slot, fl, pad = 1, samples = 48) {
  const RX = fl.rx * pad, RY = fl.ry * pad
  const ex = slot.cx + slot.size * EGG_FOOT.dx - fl.cx, ey = slot.cy + slot.size * EGG_FOOT.dy - fl.cy
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2
    const x = ex + Math.cos(a) * slot.size * EGG_FOOT.hw, y = ey + Math.sin(a) * slot.size * EGG_FOOT.hh
    if ((x / RX) ** 2 + (y / RY) ** 2 > 1 + 1e-9) return false
  }
  return true
}

// Xếp quả theo hàng (rows: số quả mỗi hàng, từ trong ra ngoài), cạnh ô sz; hình mỗi hàng canh giữa lòng chảo.
function eggRows(rows, sz, fl) {
  const stepX = 2 * EGG_FOOT.hw * sz * (1 - EGG_OVERLAP)
  const stepY = 2 * EGG_FOOT.hh * sz * (1 - 2 * EGG_OVERLAP)     // hàng trong khuất một phần sau hàng ngoài (nhìn chéo)
  const out = []
  rows.forEach((m, r) => {
    const cy = fl.cy - sz * EGG_FOOT.dy + (r - (rows.length - 1) / 2) * stepY
    for (let i = 0; i < m; i++) out.push({ cx: fl.cx - sz * EGG_FOOT.dx + (i - (m - 1) / 2) * stepX, cy, size: sz, row: r })
  })
  return out
}

/**
 * Chỗ các quả trứng đã tách trong lòng chảo (thuần, đơn vị khung đạo cụ chảo): mọi hình ốp la nằm trọn trong ellipse lòng
 * chảo fl (thu theo EGG_PAD), quả to nhất có thể (tối đa EGG_MAX·fl.rx). 1–3 quả một hàng ngang; nhiều hơn (nhân số phần) thì
 * 2–4 hàng nếu quả to hơn hẳn. → [{ cx, cy, size, row }] xếp từ trong (row 0, vẽ trước) ra ngoài, trái sang phải.
 */
export function panEggSlots(n, fl = PAN_FALLBACK.floor) {
  const k = Math.max(1, Math.floor(Number(n) || 1))
  const fitsAll = (rows, sz) => eggRows(rows, sz, fl).every(e => eggInFloor(e, fl, EGG_PAD))
  const biggest = rows => {
    let lo = 0, hi = EGG_MAX * fl.rx
    if (fitsAll(rows, hi)) return hi
    for (let it = 0; it < 32; it++) { const mid = (lo + hi) / 2; if (fitsAll(rows, mid)) lo = mid; else hi = mid }
    return lo
  }
  let best = null
  for (let r = 1; r <= Math.min(4, k); r++) {
    const rows = Array.from({ length: r }, (_, j) => Math.floor((k + j) / r))   // hàng trong ít quả hơn
    const sz = biggest(rows)
    if (!best || sz > best.sz * EGG_ROWS_GAIN) best = { rows, sz }
  }
  return eggRows(best.rows, best.sz, fl)
}

/**
 * Bố cục cảnh đập trứng (thuần, px trong khung cảnh W×H): thước lực trên cùng, chảo dưới đáy (lòng chảo canh giữa),
 * quả trứng cầm ngay trên miệng chảo, các ô trứng đã tách (n ô, theo thứ tự thả) nằm trọn trong lòng chảo.
 * → { meter: {x, y, w}, pan: {x, y, w, h, s}, egg: {x, y, size}, slots: [{x, y, size, z}] } (x, y: tâm ô)
 */
export function dapLayout(W, H, n = 1, meta = PAN_FALLBACK) {
  const m = meta && meta.vb ? meta : PAN_FALLBACK
  const [VW, VH] = m.vb
  const fl = m.floor, rim = m.rim
  const w = Math.max(120, Number(W) || 0), hh = Math.max(110, Number(H) || 0)
  const meter = { x: Math.round(w / 2 - Math.min(300, w * 0.86) / 2), y: 14, w: Math.round(Math.min(300, w * 0.86)) }
  const top = DAP_METER_H
  // lòng chảo canh giữa: phần bên phải (cán) cần (VW − rim.cx)·s, bên trái rim.cx·s
  const s = Math.max(0.25, Math.min((w / 2 - 4) / (VW - rim.cx), (hh - top) * 0.6 / VH, 1.1))
  const pw = VW * s, ph = VH * s
  const px = w / 2 - rim.cx * s
  const py = hh - ph
  // quả trứng: đáy chạm ngang tâm miệng chảo, không lên quá thước lực
  const room = py + rim.cy * s - top
  const size = Math.round(Math.max(56, Math.min(132, w * 0.36, room)))
  const ey = Math.round(Math.max(top, py + rim.cy * s - size))
  const egg = { x: Math.round(w / 2 - size / 2), y: ey, size }
  // ô trứng đã tách: trọn trong lòng chảo (panEggSlots). Thứ tự thả: hàng ngoài trước (không khuất sau quả đang cầm), z theo
  // hàng để quả hàng trong luôn nằm sau quả hàng ngoài.
  const slots = panEggSlots(n, fl)
    .map(e => ({ x: Math.round(px + e.cx * s), y: Math.round(py + e.cy * s), size: Math.round(e.size * s), z: e.row + 1 }))
    .sort((a, b) => b.z - a.z || a.x - b.x)
  return { meter, pan: { x: Math.round(px), y: Math.round(py), w: Math.round(pw), h: Math.round(ph), s }, egg, slots }
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

// WAAPI an toàn (trình duyệt cũ / Node không có animate thì bỏ qua).
function anim(el, frames, opts) {
  try { if (el && typeof el.animate === 'function') return el.animate(frames, opts) } catch { /* bỏ qua */ }
  return null
}

const ARROW = '<svg viewBox="0 0 40 64" aria-hidden="true"><path d="M20 4v44" fill="none" stroke="#3a2618" stroke-width="9" stroke-linecap="round"/><path d="M6 38l14 18 14-18" fill="none" stroke="#3a2618" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 4v44" fill="none" stroke="#fffaf0" stroke-width="4" stroke-linecap="round"/><path d="M6 38l14 18 14-18" fill="none" stroke="#fffaf0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'

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
  const vfx = ctx.vfx || (ctx.app && ctx.app.vfx) || null
  const reduced = reducedOf(ctx)
  const sound = soundOf(ctx)
  const T = ((ctx.data || {}).MINIGAME_TYPES || {}).dap || {}
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const ingIcon = (INGS[step.ing] && INGS[step.ing].icon) || step.ing || 'trung_ga'
  const ta = ingIcon === 'trung_ga_ta'
  // khuôn hình chung trung_ga.* (lòng đỏ var(--yolk)); trứng gà ta chỉ đổi --yolk, không có sao trên sân khấu
  const eggId = ta ? 'trung_ga' : ingIcon
  const eggSvg = artV2(eggId)
  const crackSvg = artV2(eggId, 'nut') !== eggSvg ? artV2(eggId, 'nut') : artV2('trung_ga', 'nut')
  const friedSvg = artV2(eggId, 'op_la_song') !== eggSvg ? artV2(eggId, 'op_la_song') : artV2('trung_ga', 'op_la_song')
  const meta = PROP_META.chao_lon || PAN_FALLBACK

  stage.classList.add('mg-dap', 'g-heat')
  if (ta) stage.classList.add('is-ta')
  const fr = buildFrame2(stage, {
    icon: artV2(ingIcon), title: step.label || T.name || '', sub: T.sub || 'Chạm trứng khi kim vào vùng xanh, rồi vuốt xuống.',
    steps: Number(ctx.stepTotal) > 0 ? { index: ctx.stepIndex, total: ctx.stepTotal, grades: ctx.stepGrades || [] } : null,
    timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })

  // Thước lực: vùng xanh + kim (kim chạy bằng transform translateX theo bề ngang lòng thước).
  const pct = v => (Math.max(0, Math.min(1, v)) * 100).toFixed(2) + '%'
  const zoneEl = h('div', { class: 'dap-zone', style: { left: pct(za), width: `calc(${pct(zb)} - ${pct(za)})` } })
  const needle = h('div', { class: 'dap-needle', 'data-testid': 'dap-needle', 'data-v': '0' })
  const rail = h('div', { class: 'dap-rail' }, needle)
  const meter = h('div', {
    class: 'dap-meter', 'data-testid': 'dap-meter', 'data-a': za.toFixed(3), 'data-b': zb.toFixed(3),
    role: 'meter', 'aria-label': 'Lực tay', 'aria-valuemin': '0', 'aria-valuemax': '1'
  }, h('div', { class: 'dap-track' }, zoneEl), rail)

  // Chảo lớn + lớp trứng đã tách trong lòng chảo.
  const panArt = propV2('chao_lon')
  const pan = h('div', { class: ['dap-pan', panArt ? '' : 'is-css'], 'data-testid': 'dap-pan' },
    panArt ? svgBox(panArt, 'dap-pan-art') : null)
  const fried = h('div', { class: 'dap-fried-layer' })

  // Quả trứng đang cầm (vùng thao tác): khung định vị + phần hình (rung, kéo theo ngón không đè transform định vị).
  const eggArt = h('div', { class: 'dap-egg-art' }, svgBox(eggSvg, 'dap-egg-svg'))
  const egg = h('div', {
    class: 'dap-egg', 'data-testid': 'dap-egg', 'data-state': 'nguyen', 'data-i': '0', role: 'button',
    'aria-label': 'Quả trứng'
  }, eggArt)
  const arrow = svgBox(ARROW, 'dap-arrow')
  const scene = h('div', { class: 'dap-scene', style: ta ? { '--yolk': DAP_YOLK_TA } : null }, meter, pan, fried, arrow, egg)
  fr.area.append(scene)

  const countText = T.count || 'Trứng'
  const dots = []
  const dotsEl = h('span', { class: 'dap-count-eggs', 'aria-hidden': 'true' })
  for (let i = 0; i < Math.min(n, 6); i++) { const d = svgBox(eggSvg, 'dap-count-egg'); dots.push(d); dotsEl.appendChild(d) }
  const countLabel = h('span', { class: 'dap-count-text' })
  const counter = h('div', { class: 'mg-count g-pill g-pill--big dap-count', 'data-testid': 'dap-count', 'data-v': '0', 'data-n': String(n) },
    dotsEl, countLabel)
  fr.foot.append(counter)

  let L = null
  let railW = 0               // px: bề ngang lòng thước (kim dịch bằng transform trong khoảng này, không tràn khung)
  function layout() {
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return
    L = dapLayout(r.width, r.height, n, meta)
    Object.assign(meter.style, { left: L.meter.x + 'px', top: L.meter.y + 'px', width: L.meter.w + 'px' })
    railW = Math.max(0, L.meter.w - 6)
    Object.assign(pan.style, { left: L.pan.x + 'px', top: L.pan.y + 'px', width: L.pan.w + 'px', height: L.pan.h + 'px' })
    Object.assign(egg.style, { left: L.egg.x + 'px', top: L.egg.y + 'px', width: L.egg.size + 'px', height: L.egg.size + 'px' })
    // mũi tên "vuốt xuống" đứng cạnh phải quả trứng (chữ nổi ở cạnh trái), không bị ngón tay và quả trứng che
    const ah = Math.round(Math.max(34, Math.min(60, L.egg.size * 0.62)))
    Object.assign(arrow.style, { left: Math.min(r.width - ah * 0.35, L.egg.x + L.egg.size + ah * 0.3) + 'px', top: (L.egg.y + L.egg.size * 0.18) + 'px', height: ah + 'px' })
    for (const [i, el] of placed.entries()) placeFried(el, i)
  }
  const placed = []
  function placeFried(el, i) {
    const sl = L && L.slots[Math.min(i, L.slots.length - 1)]
    if (!sl) return
    Object.assign(el.style, { left: (sl.x - sl.size / 2) + 'px', top: (sl.y - sl.size / 2) + 'px', width: sl.size + 'px', height: sl.size + 'px', zIndex: String(sl.z || 1) })
  }
  layout()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(layout) : null
  if (ro) ro.observe(scene)

  const cracks = []           // [{ force, split, shell }]
  let cur = { force: null, shell: false, state: 'nguyen' }
  let drag = null
  const timers = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }
  let needleV = 0

  function renderCount() {
    countLabel.textContent = `${countText} ${cracks.length}/${n}`
    counter.dataset.v = String(cracks.length)
    dots.forEach((d, i) => d.classList.toggle('is-used', i < cracks.length))
  }
  renderCount()

  function setEggState(st) {
    cur.state = st
    egg.dataset.state = st
    stage.classList.toggle('is-cracked', st === 'nut')
    eggArt.replaceChildren(svgBox(st === 'nguyen' ? eggSvg : crackSvg, 'dap-egg-svg'))
    // tách xong: vỏ rỗng biến đi, chờ quả kế tiếp nảy vào
    eggArt.style.opacity = st === 'xong' ? '0' : ''
  }

  // Chữ nổi: lớp hiệu ứng chung (vfx) nếu có, không thì nhãn ngắn trong cảnh. Mặc định đặt cạnh trái quả trứng, ngang giữa
  // quả (không đè thước lực, không bị ngón tay che; cạnh phải dành cho mũi tên "vuốt xuống").
  function say(text, tone, at = null) {
    const sr = scene.getBoundingClientRect()
    let x, y
    if (at) { const r = at.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height * 0.35 }
    else { const r = egg.getBoundingClientRect(); x = Math.max(sr.left + 60, r.left - 34); y = r.top + r.height * 0.45 }
    if (vfx && typeof vfx.floatText === 'function' && vfx.floatText({ x, y: y + 48 }, text, { tone, size: 'small' })) return
    const el = h('div', { class: ['heat-pop', 'is-' + tone], style: { left: (x - sr.left) + 'px', top: Math.max(14, y - sr.top) + 'px' } }, text)
    scene.appendChild(el)
    later(() => el.remove(), 800)
  }

  // Nhịp 1: nứt trứng — lực là vị trí kim lúc chạm.
  function crack() {
    const f = Math.round(needleV * 1000) / 1000
    cur.force = f
    cur.shell = f > zb + 1e-9           // quá mạnh: vỏ vụn rơi vào chảo
    setEggState('nut')
    sound('crack')
    feedback(ctx, f >= za && f <= zb ? 'hit' : 'tap')
    if (f > zb) say('Mạnh tay quá!', 'bad')
    else if (f < za) say('Nhẹ tay quá', 'bad')
    else say('Nứt đẹp!', 'good')
    meter.classList.remove('is-hit-good', 'is-hit-bad')
    meter.classList.add(f >= za && f <= zb ? 'is-hit-good' : 'is-hit-bad')
    // trứng rung 3px (phản hồi nứt); giảm chuyển động: bỏ rung
    if (!reduced()) {
      anim(eggArt, [{ transform: 'translateX(0)' }, { transform: 'translateX(3px) rotate(2deg)' }, { transform: 'translateX(-3px) rotate(-2deg)' },
        { transform: 'translateX(2px)' }, { transform: 'translateX(0)' }], { duration: 180, easing: 'linear' })
    }
  }

  // Nhịp 2: tách vào chảo (shell: vỏ rơi theo).
  function split(shell, dy = 0) {
    const rec = { force: cur.force, split: true, shell: !!(shell || cur.shell) }
    cracks.push(rec)
    const i = cracks.length - 1
    const isRed = reduced()
    // vỏ rỗng rơi xuống mờ đi (giảm chuyển động: biến mất ngay)
    if (!isRed) anim(eggArt, [{ transform: `translateY(${dy}px)`, opacity: 1 }, { transform: `translateY(${dy + 24}px) scale(.9)`, opacity: 0 }], { duration: 160, easing: 'ease-in' })
    eggArt.style.transform = ''
    setEggState('xong')
    renderCount()
    stage.classList.add('is-split')
    const egg2 = h('div', { class: ['dap-fried', rec.shell ? 'has-shell' : ''], 'data-shell': rec.shell ? '1' : '0' },
      h('div', { class: 'dap-fried-in' }, svgBox(friedSvg, 'dap-fried-svg')),
      rec.shell ? h('i', { class: 'dap-shell s1' }) : null, rec.shell ? h('i', { class: 'dap-shell s2' }) : null)
    placed.push(egg2)
    placeFried(egg2, i)
    fried.appendChild(egg2)
    sound('sizzle')
    if (rec.shell) say('Có vỏ!', 'bad', egg2)
    if (!isRed) {
      // lòng trứng rơi từ tay xuống, chạm chảo thì nảy squash 420 ms (gốc ở đáy)
      anim(egg2.firstChild, [
        { transform: 'translateY(-46%) scale(.55, .7)', opacity: 0, offset: 0 },
        { transform: 'translateY(0) scale(1.14, .82)', opacity: 1, offset: 0.32 },
        { transform: 'translateY(0) scale(.95, 1.06)', offset: 0.58 },
        { transform: 'translateY(0) scale(1.02, .98)', offset: 0.8 },
        { transform: 'translateY(0) scale(1, 1)' }
      ], { duration: 420, easing: 'ease-out' })
      if (vfx && typeof vfx.burst === 'function') vfx.burst(egg2, 'oil', { n: 6 + Math.floor(Math.random() * 5) })
    }
    if (cracks.length >= n) { later(finish, 420); return }
    // quả kế tiếp
    later(() => {
      if (out.done) return
      cur = { force: null, shell: false, state: 'nguyen' }
      egg.dataset.i = String(cracks.length)
      stage.classList.remove('is-split')
      meter.classList.remove('is-hit-good', 'is-hit-bad')
      setEggState('nguyen')
      if (!reduced()) anim(eggArt, [{ transform: 'translateY(-14px) scale(.5)', opacity: 0 }, { transform: 'translateY(0) scale(1.08)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'ease-out' })
    }, 260)
  }

  const unbind = bindPointer(egg, {
    down(p) {
      if (out.done || cur.state === 'xong') return
      const fresh = cur.state === 'nguyen'
      if (fresh) crack()
      drag = { x0: p.clientX, y0: p.clientY, fresh, dy: 0 }
    },
    move(p) {
      if (!drag || out.done || cur.state !== 'nut') return
      // trứng đi theo ngón khi kéo xuống (phản hồi trực tiếp: giữ cả khi giảm chuyển động)
      drag.dy = Math.max(0, Math.min(64, p.clientY - drag.y0))
      eggArt.style.transform = `translateY(${drag.dy}px) rotate(${(drag.dy / 64 * 10).toFixed(1)}deg)`
    },
    up(p) { endDrag(p, false) },
    cancel(p) { endDrag(p, true) }
  })

  function endDrag(p, cancelled) {
    const d = drag
    drag = null
    if (!d || out.done || cur.state !== 'nut') { eggArt.style.transform = ''; return }
    const sw = classifySwipe({ x: d.x0, y: d.y0 }, { x: p.clientX, y: p.clientY }, { axis: 'y', tolDeg: tol, minLen: DAP_SWIPE_MIN, dir: 1 })
    if (sw.ok) { split(false, d.dy); return }
    eggArt.style.transform = ''
    if (cancelled) return
    // chạm (không vuốt) vào trứng đã nứt từ trước → bóp vỡ, vỏ rơi vào chảo
    if (sw.len < DAP_TAP_MAX && !d.fresh) { split(true); return }
    if (sw.len >= DAP_TAP_MAX) say('Vuốt thẳng xuống!', 'bad')
  }

  // Sân khấu bếp ở màn thấp cuộn dọc (thanh chân dính đáy): cuộn sẵn để cảnh thao tác nằm trên thanh chân — vừa thì hiện
  // trọn, không vừa thì giữ mép trên của cảnh ở đầu khung (đầu sân khấu cuộn khuất).
  let revealRaf = 0
  // Khung quá thấp (chưa đủ chỗ cho cả cảnh): ưu tiên thước lực + quả trứng (vùng chạm) nằm trọn trên thanh chân; vẫn không
  // đủ thì giữ quả trứng trọn vẹn ngay trên thanh chân.
  function reveal() {
    revealRaf = 0
    try {
      if (out.done || stage.scrollHeight <= stage.clientHeight + 1) return
      const sr = stage.getBoundingClientRect(), fr2 = fr.foot.getBoundingClientRect(), r = scene.getBoundingClientRect()
      const room = fr2.top - sr.top
      const er = egg.getBoundingClientRect(), mr = meter.getBoundingClientRect()
      let delta
      if (r.height <= room) delta = r.bottom - fr2.top + 2
      else if (er.bottom - mr.top + 12 <= room) delta = mr.top - 10 - sr.top
      else delta = er.bottom + 4 - fr2.top
      if (delta > 0) stage.scrollTop += Math.ceil(delta)
    } catch { /* bỏ qua */ }
  }
  if (typeof requestAnimationFrame === 'function') revealRaf = requestAnimationFrame(reveal)

  const loop = frameLoop(() => {
    const t = clock.elapsed()
    needleV = needleValue(t, period)
    needle.style.transform = `translateX(${(needleV * railW).toFixed(1)}px)`
    needle.dataset.v = needleV.toFixed(3)
    needle.classList.toggle('is-in', needleV >= za && needleV <= zb)
    fr.setTime(t / limit)
    if (t >= limit) finish()
  })

  function finish() {
    if (out.done) return
    const elapsed = clock.elapsed()
    cleanup()
    const score = scoreDap({ cracks, n, zone: DAP_ZONE, mul })
    if (cracks.length < n) say('Hết giờ', 'bad', pan)
    feedback(ctx, score >= 90 ? 'good' : score < 50 ? 'bad' : 'ok')
    stage.classList.add('is-finished')
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
