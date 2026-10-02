// BAY — bày / thả món vào đích (M5, gói Pha trộn E3). Ly nhựa TO nhìn ngang (đạo cụ ly_lon) đựng cà phê (sữa đặc lắng
// đáy, cà phê ở trên); khay đá nhựa xanh có max(n + 1, 3) viên đá to (hình da.mot_vien) nên ghi chú "Ít đá" có ý nghĩa thật.
// Kéo từng viên thả vào ly: viên đá rơi xuống mặt nước (squash), mặt nước gợn, nước bắn, tiếng "tõm" (âm plop), mực nước
// dâng nhẹ theo số viên. Thả ngoài vùng ly thì viên đá trôi về ô của nó trên khay, không phạt; chạm viên đã thả (hoặc kéo
// nó ra khỏi ly) để lấy ra. Thả ≥ 1 viên thì bật "Xong"; đủ số thì nút Xong sáng lên. Giảm chuyển động: không rơi, không
// bắn — viên đá hiện thẳng trong ly, chỉ còn gợn mặt nước (opacity).
// Chấm: scoreBay (điểm vị trí theo khoảng cách tới tâm vùng thả / bán kính lúc thả, −30 mỗi viên lệch số lượng —
// core/minigame-scoring.js, không đổi). Điểm vị trí VẼ RA thành hồng tâm trên vùng thả (hiện khi đang kéo): vòng trong
// (≤ 0,35·mul·R → 100), vòng giữa (≤ 0,6·mul·R → 80), vành ngoài (≤ R → 55); vùng thả đổi màu theo bậc dưới viên đá đang
// kéo (xanh đậm / vàng / cam) và mỗi lần thả nổi chữ "Giữa ly!" / "Hơi lệch" / "Lệch mép" — phản hồi khớp với điểm.
// Hợp đồng e2e (giữ từ bản tạm gói A): bay-target (vùng thả hình tròn trên miệng ly; tâm và bán kính bằng boundingBox; không
// nhận chạm — pointer-events: none; khi viên đá đang kéo nằm trên vùng: lớp is-over + data-tier = tam | gan | mep);
// bay-item-<i>[data-placed = 0|1] (vùng chạm ≥ 46px); bay-count chỉ chứa "k/n" (vd "1/2"), data-v, data-n — nhãn "Đá" nằm
// ngoài; bay-done (bật khi đã thả ≥ 1). Lớp vỏ (step.skin): ly → .mg-bay.skin-ly, stage[data-skin].
// Cách giải tự động: với i < data-n, nhấn giữa bay-item-i, kéo (≥ 8 bước) tới tâm bay-target (lệch ±8px), thả; rồi bấm
// bay-done.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreBay, bayPlaceScore } from '../../core/minigame-scoring.js'
import { createClock, frameLoop, settleOnce, feedback, vfxOf, reducedOf, frameSteps } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2, PROP_META } from '../art/v2.js'
import { gestureLimitSec } from './_gesture.js'

export const BAY_ITEM_PX = 52          // cạnh viên đá trên khay (px) — co tới 46 ở cảnh thấp, không dưới 44
const BAY_ITEM_MIN = 46
const TAP_MAX = 8
const LEVEL = 0.52                     // mực cà phê ban đầu (phần chiều cao lòng ly)
const LEVEL_PER = 0.025                // mỗi viên đá làm mực dâng thêm

// Bậc điểm vị trí (bayPlaceScore) → id bậc (data-tier), chữ nổi khi thả, sắc chữ nổi (vfx.floatText).
const TIERS = Object.freeze({
  100: Object.freeze({ id: 'tam', label: 'Giữa ly!', tone: 'good' }),
  80: Object.freeze({ id: 'gan', label: 'Hơi lệch', tone: 'gold' }),
  55: Object.freeze({ id: 'mep', label: 'Lệch mép', tone: 'bad' })
})
/** Bậc của chỗ thả (d = khoảng cách tới tâm / bán kính vùng thả): { id, label, tone } hoặc null khi ngoài vùng. */
export function bayTier(d, mul = 1) {
  if (!(Math.abs(Number(d)) <= 1)) return null
  return TIERS[bayPlaceScore(d, mul)] || null
}
/** Bán kính hai vòng hồng tâm (phần của bán kính vùng thả) theo hệ số vùng mul: { a: vòng 100 điểm, b: vòng 80 điểm }. */
export function bayRings(mul = 1) {
  const m = Number(mul) > 0 ? Number(mul) : 1
  return { a: Math.min(1, 0.35 * m), b: Math.min(1, 0.6 * m) }
}
// Lời dưới đầu màn: nói rõ "giữa ly" vì điểm tính theo khoảng cách tới tâm (hồng tâm do plugin vẽ); câu ngắn để vừa một
// dòng ở khung 320px (lời cũ "Kéo đá thả vào ly, đủ số thì bấm Xong." đã xuống hai dòng).
const SUB_AIM = Object.freeze({ ly: 'Thả đá vào giữa ly, đủ thì bấm Xong.' })

/** Số món trên khay cho n món cần thả. */
export function trayCount(n) { return Math.max(Math.floor(Number(n) || 1) + 1, 3) }

// Lòng ly (PROP_META.ly_lon, khung 200 × 250): miệng, đáy, thành trong trái/phải [trên, dưới].
const CUP = PROP_META.ly_lon || {
  vb: [200, 250], mouth: { cx: 100, cy: 31, rx: 75, ry: 12.5 }, bottom: { cx: 100, cy: 226, rx: 50, ry: 10 },
  left: [[25, 31], [50, 226]], right: [[175, 31], [150, 226]]
}
const f1 = v => Math.round(v * 10) / 10
const lerp = (a, b, t) => a + (b - a) * t

/** Mặt cắt lòng ly ở mực f (0 = đáy, 1 = miệng), theo khung đạo cụ: { y, xl, xr, ry }. */
export function cupLevel(f) {
  const t = Math.max(0, Math.min(1, Number(f) || 0))
  return {
    y: lerp(CUP.bottom.cy, CUP.mouth.cy, t),
    xl: lerp(CUP.left[1][0], CUP.left[0][0], t),
    xr: lerp(CUP.right[1][0], CUP.right[0][0], t),
    ry: lerp(CUP.bottom.ry, CUP.mouth.ry, t)
  }
}

// Màu đồ uống trong ly theo món: [thân, mặt, lớp đáy].
const DRINK = Object.freeze({
  ca_phe_sua_da: Object.freeze(['#4a2412', '#713c1e', '#f3dcaa']),
  ca_phe_muoi: Object.freeze(['#3f1f10', '#683619', '#f3dcaa'])
})
const DRINK_DEFAULT = Object.freeze(['#c98a3a', '#e0a95a', '#f6e3b4'])

/**
 * Nước trong ly (thuần): SVG cùng khung đạo cụ, đặt DƯỚI hình ly — thân đồ uống từ đáy tới mực f, lớp đáy (sữa đặc lắng)
 * tới mực fb, mặt nước là ellipse sáng hơn có viền mực mảnh.
 */
export function drinkSvg(f, colors = DRINK_DEFAULT, fb = 0.13) {
  const [body, top, under] = colors
  const B = CUP.bottom, s = cupLevel(f), u = cupLevel(fb)
  const bottomArc = `A${B.rx} ${B.ry} 0 0 0 ${CUP.left[1][0]} ${B.cy}`
  const shape = (lv) => `M${CUP.left[1][0]} ${B.cy}L${f1(lv.xl)} ${f1(lv.y)}L${f1(lv.xr)} ${f1(lv.y)}L${CUP.right[1][0]} ${B.cy}${bottomArc}Z`
  return `<svg viewBox="0 0 ${CUP.vb[0]} ${CUP.vb[1]}" aria-hidden="true"><g stroke="#3a2618" stroke-linejoin="round">` +
    `<path d="${shape(s)}" fill="${body}" stroke="none"/>` +
    `<path d="${shape(u)}" fill="${under}" stroke="none"/>` +
    `<ellipse cx="100" cy="${f1(u.y)}" rx="${f1((u.xr - u.xl) / 2)}" ry="${f1(u.ry)}" fill="${under}" stroke="none"/>` +
    `<path d="M${f1(u.xl + 4)} ${f1(u.y + 3)}Q100 ${f1(u.y - 9)} ${f1(u.xr - 4)} ${f1(u.y + 3)}" fill="none" stroke="${top}" stroke-width="5" opacity=".55"/>` +
    `<ellipse cx="100" cy="${f1(s.y)}" rx="${f1((s.xr - s.xl) / 2)}" ry="${f1(s.ry)}" fill="${top}" stroke-width="1.6"/>` +
    `<ellipse cx="${f1(100 - (s.xr - s.xl) * 0.18)}" cy="${f1(s.y - s.ry * 0.25)}" rx="${f1((s.xr - s.xl) * 0.16)}" ry="${f1(s.ry * 0.3)}" fill="#fff" opacity=".22" stroke="none"/>` +
    '</g></svg>'
}

// Mũi tên chỉ xuống miệng ly (gợi ý; nhấp nhô bằng CSS, giảm chuyển động: đứng yên).
const DOWN = '<svg viewBox="0 0 40 50" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M20 6V40M8 28L20 41L32 28" stroke="#3a2618" stroke-width="9"/>' +
  '<path d="M20 6V40M8 28L20 41L32 28" stroke="#fffaf0" stroke-width="4.5"/></g></svg>'

function sound(ctx, name) {
  const app = ctx && ctx.app
  try { if (app && typeof app.sound === 'function') app.sound(name) } catch { /* bỏ qua */ }
}

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const n = Math.max(1, Math.floor(Number(params.n) || 1))
  const M = trayCount(n)
  const mul = ctx.zoneMul || 1
  const limit = gestureLimitSec(step, { assist: !!ctx.assist, untimed: !!ctx.untimed })
  const clock = createClock()
  const out = settleOnce()
  const vfx = vfxOf(ctx)
  const reduced = reducedOf(ctx)
  const T = ((ctx.data || {}).MINIGAME_TYPES || {}).bay || {}
  const skinId = 'ly'
  const skin = (T.skins && T.skins[skinId]) || {}
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const itemId = (INGS[step.ing] && INGS[step.ing].icon) || step.ing || 'da'
  // vật kéo thả: MỘT viên đá to (hình da.mot_vien; nguyên liệu không có trạng thái này thì dùng hình gốc)
  const itemSvg = artV2(itemId, 'mot_vien')
  const drink = DRINK[ctx.recipe && ctx.recipe.id] || DRINK_DEFAULT

  stage.classList.add('mg-bay', 'skin-' + skinId)
  stage.dataset.skin = skinId
  const fr = buildFrame2(stage, {
    icon: artV2(itemId), title: step.label || skin.name || T.name || '',
    sub: SUB_AIM[skinId] || skin.sub || 'Kéo từng món thả vào giữa đích, đủ số thì bấm Xong.',
    steps: frameSteps(ctx), timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })

  // ---- Cảnh: ly (nước dưới hình ly), vùng thả, gợi ý; khay đá có M ô ----
  const liquid = h('div', { class: 'bay-liquid', html: drinkSvg(LEVEL, drink) })
  const glassSvg = propV2('ly_lon')
  const glassArt = glassSvg ? svgBox(glassSvg, 'bay-glass-art') : h('div', { class: 'bay-glass-art is-css' })
  // vùng thả + hồng tâm: vành ngoài (55), vòng giữa (80), vòng trong (100), chấm tâm — đường kính vòng (px, theo mul) do
  // layout() đặt vào --ra, --rb
  const rings = bayRings(mul)
  const target = h('div', { class: 'bay-target', 'data-testid': 'bay-target', 'aria-hidden': 'true' },
    h('i', { class: 'bay-zone bay-zone-b' }), h('i', { class: 'bay-zone bay-zone-a' }), h('i', { class: 'bay-zone-dot' }))
  const hint = svgBox(DOWN, 'bay-hint')
  const ring = h('i', { class: 'bay-ring' })
  const tray = h('div', { class: 'bay-tray' })
  // lớp chồng: nước (dưới) → gợn → viên đá trong ly → hình ly (thân trong suốt phủ lên đá) → vùng thả, gợi ý → đá trên khay
  const scene = h('div', { class: 'bay-scene' }, tray, liquid, ring)
  const items = []
  for (let i = 0; i < M; i++) {
    const art = svgBox(itemSvg, 'bay-item-art')
    const el = h('div', {
      class: 'bay-item', 'data-testid': 'bay-item-' + i, 'data-placed': '0', role: 'button', 'aria-label': `${skin.count || 'Món'} ${i + 1}`
    }, art)
    scene.appendChild(el)
    items.push({ el, art, i, placed: null, d: null, drag: null, at: null, order: 0 })
  }
  scene.append(glassArt, target, hint)
  fr.area.append(scene)

  // bay-count chỉ chứa "k/n" (vd "1/2"); nhãn ("Đá") đứng ngoài
  const counter = h('span', { class: 'bay-count', 'data-testid': 'bay-count', 'data-v': '0', 'data-n': String(n) })
  const countPill = h('div', { class: 'mg-count g-pill g-pill--big bay-pill' }, h('span', null, (skin.count || 'Món') + ' '), counter)
  const doneBtn = h('button', { class: 'g-btn g-btn--small mg-done', type: 'button', 'data-testid': 'bay-done', disabled: true }, 'Xong')
  fr.foot.append(countPill, doneBtn)

  // ---- Bố cục (px) theo cỡ cảnh: ly to nhất có thể; khay dưới ly (cảnh cao) hoặc khay dọc bên trái (cảnh thấp) ----
  // L.k: px trên một đơn vị khung ly; (L.gx, L.gy): góc trên-trái hộp ly; vùng thả: tâm (L.tx, L.ty) bán kính L.R.
  let L = null
  let level = LEVEL
  function layout() {
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return
    const W = r.width, H = r.height
    const s = Math.round(Math.max(BAY_ITEM_MIN, Math.min(BAY_ITEM_PX, H * 0.3)))
    const cell = s + 8
    const ar = CUP.vb[0] / CUP.vb[1]
    // A: khay ngang dưới đáy cảnh
    const trayHA = cell + 10
    const ghA = Math.min(H - trayHA - 10, (W * 0.66) / ar, 300)
    // B: khay dọc bên trái (1 hoặc 2 cột)
    const rowsFit = Math.max(1, Math.floor((H - 12) / cell))
    const cols = Math.ceil(M / rowsFit)
    const trayWB = cols * cell + 10
    const ghB = Math.min(H - 8, (W - trayWB - 28) / ar, 300)
    const useB = ghB > ghA * 1.12
    const gh = Math.max(60, useB ? ghB : ghA)
    const gw = gh * ar
    const k = gw / CUP.vb[0]
    let gx, gy, tr
    if (useB) {
      const rows = Math.ceil(M / cols)
      const th = rows * cell + 10
      tr = { x: 6, y: Math.max(0, Math.round((H - th) / 2)), w: trayWB, h: th, cols }
      gx = Math.round(tr.x + tr.w + (W - tr.x - tr.w - gw) / 2)
      gy = Math.round(Math.max(2, (H - gh) / 2))
    } else {
      const cols2 = Math.min(M, Math.max(1, Math.floor((W - 22) / cell)))
      const rows = Math.ceil(M / cols2)
      const tw = cols2 * cell + 10, th = rows * cell + 10
      tr = { x: Math.round((W - tw) / 2), y: Math.round(H - th - 2), w: tw, h: th, cols: cols2 }
      gx = Math.round((W - gw) / 2)
      gy = Math.round(Math.max(2, tr.y - 8 - gh))
    }
    const surf = cupLevel(LEVEL)
    const ty = gy + ((CUP.mouth.cy + surf.y) / 2) * k
    L = { W, H, s, cell, k, gx, gy, gw, gh, tray: tr, tx: gx + CUP.mouth.cx * k, ty, R: CUP.mouth.rx * k }
    for (const el of [liquid, glassArt]) Object.assign(el.style, { left: gx + 'px', top: gy + 'px', width: Math.round(gw) + 'px', height: Math.round(gh) + 'px' })
    Object.assign(target.style, { left: f1(L.tx - L.R) + 'px', top: f1(L.ty - L.R) + 'px', width: f1(2 * L.R) + 'px', height: f1(2 * L.R) + 'px' })
    target.style.setProperty('--ra', f1(2 * rings.a * L.R) + 'px')
    target.style.setProperty('--rb', f1(2 * rings.b * L.R) + 'px')
    Object.assign(tray.style, { left: tr.x + 'px', top: tr.y + 'px', width: tr.w + 'px', height: tr.h + 'px' })
    tray.replaceChildren(...items.map((it, i) => {
      const c = cellPos(i)
      return h('i', { class: 'bay-cell', style: { left: f1(c.x - tr.x - cell / 2 + 1) + 'px', top: f1(c.y - tr.y - cell / 2 + 1) + 'px', width: (cell - 2) + 'px', height: (cell - 2) + 'px' } })
    }))
    const hs = Math.round(Math.max(30, Math.min(48, gw * 0.24)))
    Object.assign(hint.style, { width: hs + 'px', height: Math.round(hs * 1.25) + 'px', left: f1(L.tx - hs / 2) + 'px', top: f1(Math.max(0, gy + CUP.mouth.cy * k - hs * 1.3)) + 'px' })
    for (const it of items) {
      it.el.style.width = s + 'px'
      it.el.style.height = s + 'px'
      if (!it.drag) place(it)
    }
  }
  // tâm ô thứ i trên khay
  function cellPos(i) {
    const tr = L.tray
    const col = i % tr.cols, row = Math.floor(i / tr.cols)
    return { x: tr.x + 5 + L.cell * (col + 0.5), y: tr.y + 5 + L.cell * (row + 0.5) }
  }
  // chỗ của viên đá trong ly: nổi ở mặt nước, kẹp trong thành ly, gần chỗ thả nhất mà không đè viên đã có (các viên thả
  // trước); mặt nước hết chỗ thì xếp tầng trên, nhô dần lên miệng ly
  function slotIn(it) {
    const s = L.s
    const sv = cupLevel(level)
    const xl = L.gx + sv.xl * L.k + s * 0.5 + 2, xr = L.gx + sv.xr * L.k - s * 0.5 - 2
    const want = L.gx + it.placed.u * L.k
    const lo = Math.min(xl, xr), hi = Math.max(xl, xr)
    const others = items.filter(o => o !== it && o.placed && o.order < it.order && o.at)
    const y0 = L.gy + sv.y * L.k - s * 0.18
    const gap = s * 0.8
    for (let layer = 0; layer < 6; layer++) {
      const y = y0 - layer * s * 0.52
      const row = others.filter(o => Math.abs(o.at.y - y) < s * 0.26)
      let best = null
      for (let d = 0; d <= hi - lo + 1; d += 3) {
        for (const x of d ? [want - d, want + d] : [want]) {
          if (x < lo - 0.5 || x > hi + 0.5) continue
          if (row.every(o => Math.abs(o.at.x - x) >= gap)) { best = x; break }
        }
        if (best !== null) break
      }
      if (best !== null) return { x: Math.max(lo, Math.min(hi, best)), y: Math.max(L.gy - s * 0.3, y) }
    }
    return { x: Math.max(lo, Math.min(hi, want)), y: L.gy - s * 0.3 }
  }
  let order = 0
  function place(it) {
    if (!L) return
    const pos = it.placed ? slotIn(it) : cellPos(it.i)
    it.at = pos
    it.el.style.transform = `translate(${f1(pos.x - L.s / 2)}px, ${f1(pos.y - L.s / 2)}px)`
    it.el.classList.toggle('is-in', !!it.placed)
  }
  function placeAll() {
    const list = items.filter(it => it.placed).sort((a, b) => a.order - b.order)
    for (const it of list) place(it)
  }
  function setLevel() {
    level = LEVEL + LEVEL_PER * items.filter(it => it.placed).length
    liquid.innerHTML = drinkSvg(level, drink)
  }
  layout()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { layout(); placeAll() }) : null
  if (ro) ro.observe(scene)

  const placedCount = () => items.filter(it => it.placed).length
  let fullShown = false
  function render() {
    const k = placedCount()
    counter.textContent = `${k}/${n}`
    counter.dataset.v = String(k)
    doneBtn.disabled = k < 1
    doneBtn.classList.toggle('is-ready', k === n)
    countPill.classList.toggle('is-over', k > n)
    if (k === n && !fullShown) {
      fullShown = true
      // nổi trên nhãn đếm (không chồng lên chữ bậc thả "Giữa ly!" ở miệng ly)
      if (vfx) { try { vfx.floatText(countPill, 'Đủ đá rồi!', { tone: 'good', size: 'small' }) } catch { /* bỏ qua */ } }
    }
    if (k !== n) fullShown = false
  }
  render()

  let dead = false
  const timers = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }

  // Khoảng cách chỗ thả (x, y trong cảnh) tới tâm vùng thả / bán kính, làm tròn 3 chữ số — đúng số đưa vào scoreBay, nên
  // màu vùng thả lúc kéo, chữ bậc lúc thả và điểm luôn cùng một bậc.
  const distOf = (x, y) => Math.round((Math.hypot(x - L.tx, y - L.ty) / L.R) * 1000) / 1000
  // Vùng thả dưới viên đá đang kéo: lớp is-over (trong vùng) + data-tier theo bậc điểm (màu vùng thả theo bậc).
  function markOver(x, y) {
    const tier = bayTier(distOf(x, y), mul)
    target.classList.toggle('is-over', !!tier)
    if (tier) target.dataset.tier = tier.id
    else delete target.dataset.tier
  }

  const unbinds = items.map(it => bindPointer(it.el, {
    down(p) {
      if (out.done || !L) return
      const r = scene.getBoundingClientRect()
      const cur = it.at || cellPos(it.i)
      it.drag = { x0: p.clientX, y0: p.clientY, ox: p.clientX - r.left - cur.x, oy: p.clientY - r.top - cur.y, moved: 0 }
      it.el.classList.remove('is-glide')
      it.el.classList.add('is-drag')
      target.classList.add('is-armed')
      if (typeof it.el.getAnimations === 'function') { try { for (const a of it.el.getAnimations()) a.cancel() } catch { /* bỏ qua */ } }
    },
    move(p) {
      const d = it.drag
      if (!d || out.done) return
      const r = scene.getBoundingClientRect()
      d.moved = Math.max(d.moved, Math.hypot(p.clientX - d.x0, p.clientY - d.y0))
      const x = p.clientX - r.left - d.ox, y = p.clientY - r.top - d.oy
      it.el.style.transform = `translate(${f1(x - L.s / 2)}px, ${f1(y - L.s / 2)}px) scale(1.08)`
      markOver(x, y)
    },
    up(p) { drop(it, p, false) },
    cancel(p) { drop(it, p, true) }
  }))

  function endDrag(it) {
    it.drag = null
    it.el.classList.remove('is-drag')
    target.classList.remove('is-armed', 'is-over')
    delete target.dataset.tier
  }

  function takeOut(it) {
    it.placed = null
    it.d = null
    it.el.dataset.placed = '0'
    setLevel()
    placeAll()
    render()
  }

  function drop(it, p, cancelled) {
    const d = it.drag
    endDrag(it)
    if (!d || out.done) { place(it); return }
    // chạm (không kéo) vào viên đã thả → lấy ra trả về khay
    if (d.moved < TAP_MAX) {
      if (it.placed && !cancelled) { takeOut(it); feedback(ctx, 'tap') }
      glide(it)
      return
    }
    const r = scene.getBoundingClientRect()
    const x = p.clientX - r.left - d.ox, y = p.clientY - r.top - d.oy
    const dist = distOf(x, y)
    if (dist <= 1 && !cancelled) {
      const was = !!it.placed
      it.placed = { u: (x - L.gx) / L.k }
      it.order = ++order
      it.d = dist
      it.el.dataset.placed = '1'
      setLevel()
      placeAll()
      const to = it.at
      if (!hint.classList.contains('is-off')) { hint.classList.add('is-off'); later(() => { hint.hidden = true }, 280) }
      render()
      // chữ bậc thả nổi lên từ chỗ viên đá đáp xuống: điểm vị trí của viên này (khớp màu vùng thả lúc kéo)
      const tier = bayTier(dist, mul)
      if (vfx && tier) {
        try { vfx.floatText({ x: r.left + to.x, y: r.top + to.y }, tier.label, { tone: tier.tone, size: 'small' }) } catch { /* bỏ qua */ }
      }
      fall(it, { x, y }, to, was)
      return
    }
    // thả ngoài ly: trôi về khay, không phạt (viên đã thả mà kéo ra ngoài thì coi như lấy ra)
    if (it.placed && !cancelled) takeOut(it)
    glide(it)
  }

  // Viên đá rơi từ chỗ thả xuống mặt nước (150 ms), rồi squash + gợn + nước bắn + "tõm". Giảm chuyển động: hiện thẳng.
  function fall(it, from, to, was) {
    const land = () => {
      if (dead || !it.placed) return
      sound(ctx, 'plop')
      const sr = scene.getBoundingClientRect()
      const sx = sr.left + to.x, sy = sr.top + to.y + L.s * 0.22
      splashRing(to.x, to.y + L.s * 0.22)
      if (vfx) {
        try {
          vfx.ripple(sx, sy)
          if (!reduced()) {
            vfx.squash(it.art)
            if (!was) vfx.burst({ x: sx, y: sy }, 'drop', { n: 4, colors: [drink[1], '#e9f6fc', '#cdeeff'] })
          }
        } catch { /* bỏ qua */ }
      }
    }
    if (reduced() || typeof it.el.animate !== 'function') { land(); return }
    try {
      const a = it.el.animate([
        { transform: `translate(${f1(from.x - L.s / 2)}px, ${f1(from.y - L.s / 2)}px) scale(1.08)` },
        { transform: `translate(${f1(to.x - L.s / 2)}px, ${f1(to.y - L.s / 2)}px)` }
      ], { duration: to.y > from.y ? 150 : 110, easing: 'cubic-bezier(.55, 0, 1, .45)' })
      a.addEventListener('finish', land)
    } catch { land() }
  }

  // Gợn mặt nước: ellipse sáng loang ra (WAAPI transform/opacity; giảm chuyển động: chỉ mờ đi).
  function splashRing(x, y) {
    const w = Math.max(30, L.R * 1.1)
    Object.assign(ring.style, { left: f1(x - w / 2) + 'px', top: f1(y - w * 0.14) + 'px', width: f1(w) + 'px', height: f1(w * 0.28) + 'px' })
    if (typeof ring.animate !== 'function') return
    try {
      ring.animate(reduced()
        ? [{ opacity: 0.8 }, { opacity: 0 }]
        : [{ opacity: 0.9, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(1.35)' }],
      { duration: 420, easing: 'ease-out' })
    } catch { /* bỏ qua */ }
  }

  function glide(it) {
    it.el.classList.toggle('is-glide', !reduced())
    place(it)
    later(() => it.el.classList.remove('is-glide'), 240)
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
    for (const it of items) if (it.drag) { endDrag(it); place(it) }
  }

  return {
    result: out.promise,
    hold(on) { if (!out.done) clock.hold(on) },
    destroy() {
      dead = true
      cleanup()
      if (revealRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(revealRaf)
      for (const id of timers) clearTimeout(id)
      timers.clear()
      fr.destroy()
      out.settle(null)
    }
  }
}

export default { type: 'bay', mount }
