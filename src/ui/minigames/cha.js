// CHA — chà rửa / gọt / bóc (params.spots) hoặc lắc / trộn / khuấy / bóp (params.strokes).
// spots: vuốt qua từng vết đủ quãng để sạch dần; strokes: vuốt qua lại, đếm số lần đổi chiều.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreCha } from '../../core/minigame-scoring.js'
import {
  clamp, createClock, frameLoop, settleOnce, feedback, stepLimitSec, buildFrame, ingIcon,
  createReversalCounter, uiRand
} from './_util.js'

// Mọi số đo của chế độ vết bẩn tính theo "đơn vị chuẩn" của thớt chuẩn PAD_W × PAD_H (đơn vị = px khi thớt đủ chỗ).
// Thớt thật = khung chuẩn × tỉ lệ k (px / đơn vị): co theo chỗ còn lại của sân khấu (màn thấp, ca đông khách) nhưng
// vết, vùng chạm và quãng vuốt cùng co theo k nên cách chơi và điểm không đổi.
export const SPOT_RADIUS = 30          // bán kính vết (đơn vị chuẩn), vùng chạm = bán kính + 10
export const SPOT_HIT = SPOT_RADIUS + 10
export const SPOT_NEED_PX = 140        // quãng vuốt cần để sạch một vết (đơn vị chuẩn; chia cho hệ số vùng)
export const PAD_W = 360               // thớt chuẩn (bằng thớt cũ ở màn đủ cao)
export const PAD_H = 280
export const MIN_TAP_PX = 44           // vùng chạm tối thiểu của một vết (px)
export const MIN_SCALE = MIN_TAP_PX / (2 * SPOT_HIT)   // 0,55: sàn của k để vùng chạm mỗi vết ≥ 44px
// thớt lắc/trộn/bóp thấp nhất (px): cách chơi chỉ tính theo bề ngang (đếm đổi chiều), chiều cao chỉ là chỗ đặt ngón —
// vẫn rộng hơn vùng chạm tối thiểu 44px; đủ thấp để vừa ca đông khách ở 360×600 (phiếu có ghi chú, nhiều món)
export const STROKE_MIN_H = 56
const SPOT_MARGIN = SPOT_RADIUS + 12   // lề từ mép thớt tới vùng rải vết
const SPOT_FIELD = 98 * 78.4           // diện tích (rx × ry) vùng rải vết của thớt chuẩn
// khung chuẩn thấp nhất: đúng một hàng vết (đường kính vùng chạm, = 44px ở tỉ lệ sàn MIN_SCALE)
export const PAD_MIN_HR = 2 * SPOT_HIT

// Chiều cao còn lại đo được (px): null/undefined (chưa đo được, sân khấu ẩn) → Infinity (thớt chuẩn); đã đo mà ≤ 0 (sân
// khấu thấp hơn đầu + chân, vd xoay ngang) → 0 (thớt cỡ sàn — không phải thớt to nhất đúng lúc chật nhất).
function measuredH(v) {
  if (v === null || v === undefined) return Infinity
  const n = Number(v)
  return Number.isNaN(n) ? Infinity : Math.max(0, n)
}

// Bố trí n vết trong elip bán kính r (ngang) × ry (dọc) quanh (cx, cy), cách nhau ≥ minGap.
// Mặc định ry = 0,8 r (như bố trí gốc).
export function layoutSpots(n, cx, cy, r, minGap, rand = Math.random, ry = r * 0.8) {
  const pts = []
  const fy = r > 0 ? ry / r : 0
  let tries = 0
  while (pts.length < n && tries < 600) {
    tries++
    const ang = rand() * Math.PI * 2
    const dist = Math.sqrt(rand()) * r
    const x = cx + Math.cos(ang) * dist
    const y = cy + Math.sin(ang) * dist * fy
    const gap = tries > 300 ? minGap * 0.6 : minGap
    if (pts.every(p => Math.hypot(p.x - x, p.y - y) >= gap)) pts.push({ x, y })
  }
  while (pts.length < n) pts.push({ x: cx + (rand() - 0.5) * r, y: cy + (rand() - 0.5) * ry * 1.25 })
  return pts
}

// Chọn khung (đơn vị chuẩn) và tỉ lệ k cho thớt chà theo chỗ trống đo được (availW × availH px).
// Đủ cao: thớt chuẩn 360 × 280 thu theo bề ngang (như cũ). Thấp: k theo chiều cao còn lại (sàn MIN_SCALE), khung
// rộng ra theo bề ngang còn trống (và dẹt lại nếu đã chạm sàn) để thớt lấp vừa chỗ trống, không tràn xuống thanh chân.
// availH null (chưa đo được) → thớt chuẩn; ≤ 0 (hết chỗ) → thớt cỡ sàn. → { k, wr, hr }: thớt thật wr·k × hr·k px.
export function fitSpotsBox(availW, availH) {
  const w = Math.max(1, Math.min(Number(availW) > 0 ? Number(availW) : PAD_W, PAD_W))
  const kW = w / PAD_W
  const free = measuredH(availH)
  if (free >= PAD_H * kW && kW >= MIN_SCALE) return { k: kW, wr: PAD_W, hr: PAD_H }
  const k = Math.max(MIN_SCALE, Math.min(kW, free / PAD_H))
  return { k, wr: w / k, hr: Math.min(PAD_H, Math.max(PAD_MIN_HR, free / k)) }
}

// Rải n vết trong khung wr × hr (đơn vị chuẩn) → tọa độ chuẩn hóa [{nx, ny}] (0..1 theo bề ngang / chiều cao thớt).
// Khung chuẩn: elip bán kính 98 × 78,4 như cũ; khung dẹt: elip dẹt lại và rộng ra (giữ diện tích) để vết không chồng nhau.
export function spotLayout(n, wr, hr, rand = Math.random) {
  const rxMax = Math.max(0, wr / 2 - SPOT_MARGIN)
  const ryMax = Math.max(0, hr / 2 - SPOT_MARGIN)
  const r0 = Math.max(40, Math.min(rxMax, ryMax))
  const ry = Math.min(0.8 * r0, ryMax)
  const rx = Math.min(rxMax, ry > 0 ? Math.max(r0, SPOT_FIELD / ry) : rxMax)
  const gap = n > 6 ? 50 : 64
  return layoutSpots(n, wr / 2, hr / 2, rx, gap, rand, ry).map(p => ({ nx: p.x / wr, ny: p.y / hr }))
}

// Chà một đoạn vuốt kết thúc tại (x, y) px trong thớt, dài seg px; thớt w × h px, tỉ lệ k. Vùng chạm và quãng vuốt quy về
// đơn vị chuẩn nên cùng một đường vuốt (theo tỉ lệ) sạch như nhau ở mọi cỡ thớt. Sửa sp.clean, trả chỉ số các vết vừa chà.
export function rubSpots(spots, x, y, seg, { w, h, k }, need) {
  const hit = SPOT_HIT * k
  const gain = seg / k / need
  const changed = []
  spots.forEach((sp, i) => {
    if (sp.clean >= 1) return
    if (Math.hypot(x - sp.nx * w, y - sp.ny * h) <= hit) {
      sp.clean = Math.min(1, sp.clean + gain)
      changed.push(i)
    }
  })
  return changed
}

// Chiều cao thớt lắc/trộn/bóp (px): vừa chỗ còn lại, không quá thớt chuẩn theo bề ngang, không dưới STROKE_MIN_H.
// availH null (chưa đo được) → thớt chuẩn theo bề ngang; ≤ 0 (hết chỗ) → STROKE_MIN_H.
export function fitStrokesHeight(availW, availH) {
  const kW = Math.min(1, (Number(availW) > 0 ? Number(availW) : PAD_W) / PAD_W)
  const full = PAD_H * kW
  const free = measuredH(availH)
  return Math.round(Number.isFinite(free) ? Math.max(STROKE_MIN_H, Math.min(full, free)) : full)
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
  setProgress(0, '\u00a0')   // giữ chỗ dòng chữ ở chân (chưa có số liệu) để đo chỗ còn lại cho thớt đúng ngay lúc mount

  // Chỗ còn lại cho thớt (px) = khung sân khấu − đầu − chân − khoảng cách − đệm. Sân khấu trên Thớt có chiều cao cố định
  // (lớp phủ panel Bếp), nên thớt lấp vừa chỗ này thì mọi vết nằm trọn phía trên thanh chân dính, không phải cuộn.
  // null: sân khấu chưa hiện (chưa có kích thước) → thớt chuẩn; h ≤ 0 (đã hiện nhưng hết chỗ) → thớt cỡ sàn.
  function room() {
    if (!stage.isConnected || stage.clientHeight <= 0 || fr.area.clientWidth <= 0) return null
    const cs = getComputedStyle(stage)
    let used = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)
    let count = 0
    for (const el of stage.children) {
      const es = getComputedStyle(el)
      if (es.display === 'none' || es.position === 'absolute' || es.position === 'fixed') continue
      count++
      if (el === fr.area) continue
      used += el.getBoundingClientRect().height + (parseFloat(es.marginTop) || 0) + (parseFloat(es.marginBottom) || 0)
    }
    used += (parseFloat(cs.rowGap) || 0) * Math.max(0, count - 1)
    return { w: fr.area.clientWidth, h: Math.floor(stage.clientHeight - used) }
  }

  // ---- chế độ vết bẩn ----
  // Vị trí vết lưu theo tọa độ chuẩn hóa 0..1 của thớt; thớt lấp vừa chỗ còn lại (đo lúc mount + ResizeObserver), cỡ vết,
  // vùng chạm và quãng vuốt theo tỉ lệ k nên co giãn không đổi cách chơi / chấm điểm.
  const spots = []
  let k = 1            // px / đơn vị chuẩn hiện tại
  let padW = 0
  let padH = 0
  // Đặt cỡ thớt, vết, hình nguyên liệu theo chỗ trống (null: chưa đo được → thớt chuẩn) → khung đã chọn {k, wr, hr}.
  function fitSpots(free) {
    const fit = fitSpotsBox(free ? free.w : PAD_W, free ? free.h : null)
    const w = Math.round(fit.wr * fit.k)
    const hh = Math.round(fit.hr * fit.k)
    if (w === padW && hh === padH && fit.k === k) return fit
    k = fit.k
    padW = w
    padH = hh
    pad.style.width = padW + 'px'
    pad.style.height = padH + 'px'
    // khung dẹt (màn thấp): thớt bo tròn hai đầu thay cho elip để cả vùng sát mép vẫn bắt đầu vuốt được
    pad.classList.toggle('is-flat', fit.wr / fit.hr > 1.6)
    const size = Math.round(Math.min(200 * k, padH * 0.9))
    food.style.width = size + 'px'
    food.style.height = size + 'px'
    for (const sp of spots) sp.el.style.setProperty('--size', (SPOT_RADIUS * 2 * k).toFixed(1) + 'px')
    return fit
  }
  if (!isStrokes) {
    const n = Math.max(1, Math.floor(Number(params.spots) || 1))
    const fit = fitSpots(room())
    spotLayout(n, fit.wr, fit.hr, rand).forEach((p, i) => {
      const el = h('div', {
        class: 'cha-spot', 'data-testid': 'cha-spot-' + i, 'data-clean': '0',
        style: { left: (p.nx * 100).toFixed(3) + '%', top: (p.ny * 100).toFixed(3) + '%', '--size': (SPOT_RADIUS * 2 * k).toFixed(1) + 'px' }
      })
      pad.appendChild(el)
      spots.push({ nx: p.nx, ny: p.ny, clean: 0, el })
    })
  }
  const need = SPOT_NEED_PX / (mul > 0 ? mul : 1)

  // ---- chế độ đổi chiều: thớt cao vừa chỗ còn lại (cách chơi chỉ tính theo bề ngang) ----
  function applyStrokes(free) {
    const hh = fitStrokesHeight(free ? free.w : PAD_W, free ? free.h : null)
    pad.style.height = hh + 'px'
    const size = Math.round(Math.min(200, hh * 0.8))
    food.style.width = size + 'px'
    food.style.height = size + 'px'
  }
  if (isStrokes) applyStrokes(room())

  // Đổi kích thước giữa chừng (khách mới làm dải phố cao lên, xoay máy, thanh địa chỉ): thớt lấp lại vừa chỗ mới, vết giữ
  // nguyên tọa độ chuẩn hóa (vị trí tương đối trên thớt) và độ sạch.
  function refit() {
    if (ended) return
    const free = room()
    if (!free) return
    if (isStrokes) applyStrokes(free)
    else fitSpots(free)
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(refit) : null
  if (ro) { ro.observe(stage); ro.observe(fr.head); ro.observe(fr.foot) }

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
        // vị trí vết theo kích thước thớt đang hiển thị (left/top theo %), vùng chạm và quãng vuốt theo k
        const changed = rubSpots(spots, p.x, p.y, seg, { w: p.rect.width || padW, h: p.rect.height || padH, k }, need)
        for (const i of changed) {
          const sp = spots[i]
          sp.el.style.setProperty('--clean', sp.clean.toFixed(3))
          sp.el.dataset.clean = sp.clean.toFixed(2)
          if (sp.clean >= 1) { sp.el.classList.add('is-clean'); feedback(ctx, 'tap') }
        }
        if (changed.length) updateSpots()
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
    if (ro) ro.disconnect()
  }

  return { result: out.promise, destroy() { cleanup(); out.settle(null) } }
}

export default { type: 'cha', mount }
