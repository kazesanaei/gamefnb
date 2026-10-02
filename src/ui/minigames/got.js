// GOT — gọt vỏ (M5). Quả TO nằm trên thớt gỗ (hình artV2), vỏ chia K dải dọc (params.strips). Vuốt thẳng từ trên xuống
// (lệch ±35° × mul, tối đa 50°) trên một dải để gọt; độ phủ mỗi dải là HỢP các nhát vuốt (bandCoverage). Phần đã gọt
// của dải lộ ruột — vẽ bằng chính hình trạng thái "đã gọt" (artV2(id, 'got')) khớp khung quả; mỗi nhát gọt có dải vỏ cuộn
// rơi xuống (vfx 'peel' + một dải vỏ rơi trong lớp .mg-fx; giảm chuyển động: dải vỏ chỉ mờ đi tại chỗ), tiếng peel. Gọt
// sạch một dải: chữ "Sạch vỏ!"; đủ K dải: cả quả đổi sang hình đã gọt, lấp lánh.
// Nhát vuốt nghiêng, ngược chiều hoặc trượt ra ngoài quả là nhát hụt (−8 mỗi nhát, tối đa −24). Mọi dải phủ ≥ 85% thì tự
// xong; bấm Xong để dừng sớm. Chấm: scoreGot (lõi, không đổi).
// Hợp đồng e2e (giữ nguyên từ bản tạm của gói A): got-fruit; got-band-<i>[data-done = độ phủ 0..1, 2 chữ số; data-lo,
// data-hi = đoạn cần gọt theo phần chiều cao quả] (dải là CỘT cao bằng quả, thẳng đứng, bị viền elip cắt; vuốt từ mép trên
// xuống mép dưới boundingBox của dải là phủ trọn); got-count[data-v = số dải xong, data-n = K]; got-done (bật sau nhát đầu).
// Cách giải tự động: với mỗi i, vuốt dọc giữa boundingBox của got-band-i từ (x giữa, y trên + 2) tới (x giữa, y dưới − 2).
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreGot } from '../../core/minigame-scoring.js'
import { createClock, frameLoop, settleOnce, feedback, vfxOf, reducedOf, frameSteps } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2, PROP_META } from '../art/v2.js'
import { classifySwipe, bandCoverage, mergeSegments, gestureLimitSec } from './_gesture.js'

export const GOT_DONE_AT = 0.85        // dải phủ từ mức này coi như gọt xong (điểm dải đã tối đa)
export const GOT_SWIPE_MIN = 24
const TAP_MAX = 10
// Dao bào nổi phía trên ngón tay (px) để ngón không che chỗ đang gọt.
export const PEELER_OFFSET_PX = 34

// Tư thế quả trên thớt (lưới 64 của hình SAU khi xoay): rot (độ), box [x0, y0, x1, y1] khung thân quả; peeled: hình đã gọt
// cùng khung (khớp chỗ với vỏ); màu vỏ (skin, dark) cho dải vỏ rơi, flesh cho phần đang gọt dở; shape: dáng khung (elip).
export const GOT_POSE = Object.freeze({
  xoai_xanh: Object.freeze({
    rot: 40, box: Object.freeze([5.1, 20.3, 50.5, 48]), peeled: 'got', peeledBox: Object.freeze([8.2, 18.4, 49.9, 43.9]),
    // cuống và lá (nét nâu của cuống trở đi) chĩa ra ngoài khi quả nằm ngang: bỏ ở lớp vỏ để gọt
    trim: 'stroke="#7a5a2e"',
    skin: '#5fae42', dark: '#3d8a2c', flesh: '#e4eb90', shape: 'oval'
  }),
  vo_buoi: Object.freeze({
    rot: 0, box: Object.freeze([5, 10, 47, 52.4]), peeled: 'got', peeledBox: Object.freeze([7, 10, 49, 52.4]),
    // hình vỏ bưởi kèm một miếng vỏ cắt sẵn đè lên góc dưới-phải quả: bỏ miếng đó khi làm lớp vỏ để gọt (nhận theo màu cùi)
    trim: 'fill="#f8eac2"',
    skin: '#aed14c', dark: '#7aa835', flesh: '#f8eac2', shape: 'round'
  })
})
const POSE_DEFAULT = Object.freeze({
  rot: 0, box: Object.freeze([6, 6, 58, 58]), peeled: 'got', peeledBox: null,
  skin: '#8bbf4a', dark: '#6d9a35', flesh: '#fbeec6', shape: 'oval'
})

/** Bỏ phần trang trí của hình từ phần tử đầu tiên chứa dấu `marker` tới hết nhóm (thuần). Không thấy dấu: giữ nguyên. */
export function trimArt(svg, marker) {
  if (typeof svg !== 'string' || !marker) return svg
  const at = svg.indexOf(marker)
  if (at < 0) return svg
  const start = svg.lastIndexOf('<', at)
  const end = svg.lastIndexOf('</g>')
  return start > 0 && end > start ? svg.slice(0, start) + svg.slice(end) : svg
}

/** Bỏ bóng đất (elip mực mờ .15 dưới chân hình) — quả nằm xoay trên thớt thì bóng vẽ riêng bằng CSS (thuần). */
export function dropGround(svg) {
  return typeof svg === 'string' ? svg.replace(/<ellipse[^>]*opacity="\.15"[^>]*\/>/, '') : svg
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

// Kiểu đặt một hình (lưới 64, xoay rot) sao cho khung box của nó lấp đúng khung W × H (px).
function artPlace(box, rot, W) {
  const [x0, y0, x1] = box
  const unit = W / (x1 - x0)
  return { width: 64 * unit + 'px', height: 64 * unit + 'px', left: (-x0 * unit) + 'px', top: (-y0 * unit) + 'px', transform: `rotate(${rot}deg)` }
}

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const K = Math.max(1, Math.floor(Number(params.strips) || 1))
  const mul = ctx.zoneMul || 1
  const tol = Math.min(50, 35 * mul)
  const limit = gestureLimitSec(step, { assist: !!ctx.assist, untimed: !!ctx.untimed })
  const clock = createClock()
  const out = settleOnce()
  const vfx = vfxOf(ctx)
  const reduced = reducedOf(ctx)
  const T = ((ctx.data || {}).MINIGAME_TYPES || {}).got || {}
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const artId = (INGS[step.ing] && INGS[step.ing].icon) || step.ing || 'fallback'
  const pose = GOT_POSE[artId] || POSE_DEFAULT
  const iconSvg = artV2(artId)
  const skinSvg = dropGround(trimArt(iconSvg, pose.trim))
  const peeledArt = artV2(artId, pose.peeled)
  const peeledSvg = dropGround(peeledArt)
  const hasPeeled = !!peeledArt && peeledArt !== iconSvg
  const [bx0, by0, bx1, by1] = pose.box
  const ratio = (by1 - by0) / (bx1 - bx0)

  stage.classList.add('mg-got')
  const fr = buildFrame2(stage, {
    icon: iconSvg, title: step.label || T.name || '', sub: T.sub || 'Vuốt thẳng từ trên xuống theo từng dải vỏ.',
    steps: frameSteps(ctx), timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })

  // Quả: lớp vỏ (hình gốc) + K dải; phần đã gọt của mỗi dải là các khúc cắt từ hình "đã gọt" đặt khớp khung quả.
  const skin = svgBox(skinSvg, 'got-art got-skin')
  const fruit = h('div', { class: ['got-fruit', 'is-' + pose.shape], 'data-testid': 'got-fruit', 'data-shape': pose.shape, style: { '--flesh': pose.flesh } }, skin)
  const bands = []
  for (let i = 0; i < K; i++) {
    const peeled = h('div', { class: 'got-peeled' })
    const live = h('div', { class: 'got-live', hidden: true })
    const el = h('div', { class: ['got-band', i > 0 ? 'has-seam' : ''], 'data-testid': 'got-band-' + i, 'data-done': '0' }, peeled, live)
    fruit.appendChild(el)
    bands.push({ el, peeled, live, segs: [], cov: 0, rect: null, lo: 0, hi: 1 })
  }
  const whole = hasPeeled ? svgBox(peeledSvg, 'got-art got-whole') : null
  if (whole) fruit.appendChild(whole)
  const peelerSvg = artV2('dao_bao')
  const knife = h('div', { class: 'got-knife', hidden: true }, svgBox(peelerSvg, 'got-knife-art'))
  const boardSvg = propV2('thot_lon')
  const board = boardSvg ? svgBox(boardSvg, 'got-board') : h('div', { class: 'got-board is-css' })
  const scene = h('div', { class: 'got-scene' }, board, fruit, knife)
  fr.area.append(scene)

  const countText = T.count || 'Dải'
  const counter = h('div', { class: 'mg-count g-pill g-pill--big', 'data-testid': 'got-count', 'data-v': '0', 'data-n': String(K) })
  const doneBtn = h('button', { class: 'g-btn g-btn--small mg-done', type: 'button', 'data-testid': 'got-done', disabled: true }, 'Xong')
  fr.foot.append(counter, doneBtn)

  let W = 0, H = 0
  let peeledStyle = null
  function layout() {
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return
    // quả to nhất vừa cảnh (chừa mép cho thớt, dao bào), không quá 270px; quả tròn không cao hơn bề ngang
    W = Math.max(120, Math.min(r.width * 0.8, 270, (r.height * 0.86 - 8) / ratio))
    H = W * ratio
    W = Math.round(W)
    H = Math.round(H)
    const fl = Math.round((r.width - W) / 2)
    const ft = Math.round((r.height - H) / 2 + Math.min(10, (r.height - H) * 0.2))   // chừa chỗ cuống, lá phía trên
    Object.assign(fruit.style, { left: fl + 'px', top: ft + 'px', width: W + 'px', height: H + 'px' })
    // nét viền ngoài của hình phóng to giữ khoảng 4,5px (hình 64 vẽ nét 3 cho cỡ biểu tượng)
    fruit.style.setProperty('--got-sw', (4.5 / (W / (bx1 - bx0))).toFixed(2))
    Object.assign(skin.style, artPlace(pose.box, pose.rot, W))
    // hình đã gọt: khung thân của nó lấp đúng khung quả (dáng gần như trùng hình vỏ)
    const pb = pose.peeledBox || pose.box
    const pr = (pb[3] - pb[1]) / (pb[2] - pb[0])
    peeledStyle = artPlace(pb, pose.rot, W)
    // lệch tỉ lệ dọc nhỏ (≤ 2%) giữa hai hình: canh giữa theo chiều dọc
    const dy = (H - W * pr) / 2
    peeledStyle.top = (parseFloat(peeledStyle.top) + dy) + 'px'
    if (whole) Object.assign(whole.style, peeledStyle)
    // thớt dưới quả: rộng hơn quả, tâm hơi thấp hơn tâm quả (quả nằm trên mặt thớt), không lòi khỏi cảnh
    const meta = PROP_META.thot_lon || { vb: [240, 160], center: [120, 69] }
    const bw = Math.round(Math.min(r.width - 4, Math.max(W * 1.3, 160), (r.height - 2) * meta.vb[0] / meta.vb[1]))
    const bh = Math.round(bw * meta.vb[1] / meta.vb[0])
    const bcx = r.width / 2
    const bcy = Math.min(r.height - bh * (1 - meta.center[1] / meta.vb[1]), ft + H * 0.62)
    Object.assign(board.style, {
      left: Math.round(bcx - bw / 2) + 'px', top: Math.round(Math.max(0, bcy - bh * meta.center[1] / meta.vb[1])) + 'px',
      width: bw + 'px', height: bh + 'px'
    })
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

  // Khúc đã gọt: segs lưu theo phần chiều cao quả (0..1) để đổi cỡ vẫn đúng chỗ. Mỗi khúc là một ô cắt (overflow hidden)
  // chứa bản sao hình đã gọt, dời ngược để khớp đúng chỗ trên quả. Thiếu hình đã gọt thì tô màu ruột.
  function drawBand(b) {
    if (!b.rect) return
    b.peeled.replaceChildren(...mergeSegments(b.segs, 0, 1).map(([a, c]) => {
      const cell = h('div', { class: 'got-cut', style: { top: (a * 100).toFixed(2) + '%', height: ((c - a) * 100).toFixed(2) + '%' } })
      if (hasPeeled && peeledStyle) {
        const st = { ...peeledStyle }
        st.left = (parseFloat(peeledStyle.left) - b.rect.left) + 'px'
        st.top = (parseFloat(peeledStyle.top) - a * H) + 'px'
        cell.appendChild(svgBox(peeledSvg, 'got-art', { style: st }))
      } else cell.classList.add('is-flat')
      return cell
    }))
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
    knife.style.transform = `translate(${Math.round(p.clientX - r.left)}px, ${Math.round(p.clientY - r.top - PEELER_OFFSET_PX)}px)`
  }
  function clearLive() { for (const b of bands) b.live.hidden = true }

  function miss(p, text) {
    misses++
    feedback(ctx, 'bad', fruit)
    if (vfx) { try { vfx.floatText({ x: p.clientX, y: p.clientY }, text, { tone: 'bad', size: 'small' }) } catch { /* bỏ qua */ } }
  }

  // Dải vỏ cuộn rơi: một dải màu vỏ (viền mực) rời khỏi quả ở chỗ vừa gọt, xoắn và rơi xuống rồi mờ (500 ms); giảm chuyển
  // động: chỉ mờ đi tại chỗ. Nằm trong lớp .mg-fx của sân khấu (không nhận chạm).
  function dropPeel(b, a, c) {
    const fx = fr.fx
    if (!fx || typeof fx.getBoundingClientRect !== 'function') return
    const fxr = fx.getBoundingClientRect()
    const r = fruit.getBoundingClientRect()
    const sc = W ? r.width / W : 1
    const left = r.left - fxr.left + (b.rect.left + b.rect.width * 0.18) * sc
    const top = r.top - fxr.top + a * H * sc
    const len = Math.max(18, (c - a) * H * sc)
    const strip = h('i', {
      class: 'got-strip',
      style: { left: Math.round(left) + 'px', top: Math.round(top) + 'px', width: Math.round(b.rect.width * 0.64 * sc) + 'px', height: Math.round(len) + 'px', '--skin': pose.skin, '--dark': pose.dark, '--flesh': pose.flesh }
    })
    fx.appendChild(strip)
    const done = () => strip.remove()
    if (typeof strip.animate !== 'function') { later(done, 520); return }
    try {
      const dir = b.rect.left + b.rect.width / 2 < W / 2 ? -1 : 1
      const anim = reduced()
        ? strip.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'linear', fill: 'forwards' })
        : strip.animate([
          { transform: 'translate(0, 0) rotate(0deg) scaleY(1)', opacity: 1 },
          { transform: `translate(${dir * 10}px, ${len * 0.25}px) rotate(${dir * 18}deg) scaleY(.7)`, opacity: 1, offset: 0.35 },
          { transform: `translate(${dir * 26}px, ${len * 0.6 + 40}px) rotate(${dir * 70}deg) scaleY(.42)`, opacity: 0 }
        ], { duration: 520, easing: 'cubic-bezier(0.4, 0, 0.9, 0.6)', fill: 'forwards' })
      anim.addEventListener('finish', done)
      anim.addEventListener('cancel', done)
    } catch { later(done, 520) }
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
      // khúc đang gọt hiện mờ màu ruột ngay dưới ngón (phản hồi tức thì)
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
    // tiếng "sột" + vỏ cuộn bắn ra (vfx, giảm chuyển động: không hạt) + dải vỏ rơi
    feedback(ctx, 'peel')
    if (vfx && !reduced()) { try { vfx.burst(b.el, 'peel', { n: 3, colors: [pose.skin, pose.dark] }) } catch { /* bỏ qua */ } }
    dropPeel(b, Math.max(b.lo, Math.min(a, b.hi)), Math.min(b.hi, Math.max(c, b.lo)))
    const done = renderCount()
    if (b.cov >= GOT_DONE_AT && before < GOT_DONE_AT) {
      b.el.classList.add('is-done')
      if (vfx) { try { vfx.floatText(b.el, 'Sạch vỏ!', { tone: 'good', size: 'small' }) } catch { /* bỏ qua */ } }
    }
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
    // gọt sạch cả quả: hiện nguyên hình đã gọt, lấp lánh
    if (bands.every(b => b.cov >= GOT_DONE_AT)) {
      fruit.classList.add('is-peeled')
      if (vfx) { try { vfx.burst(fruit, reduced() ? 'star' : 'sparkle', { n: 6 }); if (whole) vfx.pop(whole) } catch { /* bỏ qua */ } }
    }
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
