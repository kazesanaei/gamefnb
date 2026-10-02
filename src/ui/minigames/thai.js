// THAI — "kéo dao để ngắm, nhấc tay để cắt" (M5 Đợt 1: giao diện mới là mặc định cho mọi nguyên liệu thái).
// Nguyên liệu TO nằm trên thớt gỗ lớn (propV2('thot_lon')); dao lớn (propV2('dao_lon')) dựng đứng, mũi dao lệch
// KNIFE_OFFSET_PX phía trên ngón tay, cùng hoành độ; nhấc tay thì cắt tại hoành độ đó, đo lệch tới vạch chưa cắt gần nhất.
// Mỗi nhát: dao bổ xuống, dừng hình 60 ms, lát tách trượt 8px (mặt cắt lộ ruột), 3–5 vụn, chữ "Chuẩn!" / "Lệch" nổi TRÊN
// ngón tay; đủ nhát thì hiện hình trạng thái theo cách thái (vd 'dua_leo.lat', 'xoai_xanh.soi', 'tac.bo_doi').
// Cách chấm giữ nguyên (thaiCutScore, nearestUncut, scoreThai). Hợp đồng e2e giữ nguyên: thai-board, thai-guide-<i>[data-x]
// (data-x đo từ mép trái SÂN KHẤU), .thai-food, thai-count ("Nhát k/n"), thai-done. Chạm/kéo ở bất kỳ đâu trong vùng chơi
// (không chỉ trên thớt) đều ngắm được; nhát cắt chỉ tính theo hoành độ.
// Hiệu ứng lấy từ ctx.vfx (thiếu thì app.vfx; không có thì nhãn nổi cũ .mg-pop); giảm chuyển động: không vụn, không trượt,
// không bổ dao, chữ đứng yên rồi mờ.
// ctx.method (tùy chọn): cách thái người chơi đã chọn (vd 'thai_soi') → hình khi xong; thiếu thì lấy cách đúng của bước.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreThai, thaiCutScore } from '../../core/minigame-scoring.js'
import {
  createClock, frameLoop, settleOnce, feedback, stepLimitSec, thaiGuides, nearestUncut, popLabel, vfxOf, reducedOf,
  frameSteps
} from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2, PROP_META } from '../art/v2.js'

export const KNIFE_OFFSET_PX = 40
// Bề ngang tối thiểu của nguyên liệu ở giao diện cũ (trước M5). Giữ hằng số cho tương thích; giao diện mới dùng
// FOOD_MIN / FOOD_MAX (nguyên liệu co theo thớt, thớt co theo vùng chơi).
export const MIN_FOOD_WIDTH = 280
export const SLICE_GAP_PX = 8
const FOOD_MIN = 140
const FOOD_MAX = 260

// Nhãn sau mỗi nhát thái theo điểm nhát (thaiCutScore): 100 Chuẩn · 80 Hơi lệch · 55 Lệch · 20 Lệch xa.
export function cutLabel(score) {
  if (score >= 100) return 'Chuẩn!'
  if (score >= 80) return 'Hơi lệch'
  if (score >= 55) return 'Lệch'
  return 'Lệch xa'
}

// Độ lệch ngang (px) của từng khúc khi đã có m nhát: mỗi nhát đẩy hai bên ra mỗi bên GAP/2 → hai khúc kề nhau cách GAP.
export function sliceOffsets(m, gap = SLICE_GAP_PX) {
  const out = []
  for (let i = 0; i <= m; i++) out.push((gap / 2) * (2 * i - m))
  return out
}

// Cách thái (id lựa chọn của bước) → hình trạng thái khi thái xong. 'de_nguyen' (để nguyên) không có hình riêng.
export const METHOD_STATE = Object.freeze({
  thai_lat: 'lat', thai_soi: 'soi', bao: 'bao', hat_luu: 'hat_luu', cat_soi: 'soi', cat_vuong: 'vuong'
})

// Một quả tắc nằm trên thớt (lưới 64, cùng nét và bảng màu với hình tắc của bộ hình): bước "Bổ đôi tắc" bày n quả thành
// hàng, mỗi quả nằm đúng một vạch, mỗi nhát bổ đôi một quả.
const TAC_ONE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#3a2618" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
  '<path d="M16.5 33.5A15.5 15.5 0 1 0 47.5 33.5A15.5 15.5 0 1 0 16.5 33.5Z" fill="#f7a31e" stroke="none"/>' +
  '<path d="M40.8 20.7A15.5 15.5 0 1 1 19.2 42.3A15.5 15.5 0 0 0 40.8 20.7Z" fill="#d77d0b" stroke="none"/>' +
  '<circle cx="36.7" cy="35.8" r="0.9" fill="#ffd27a" stroke="none" opacity=".8"/><circle cx="40.5" cy="31.2" r="0.9" fill="#ffd27a" stroke="none" opacity=".8"/>' +
  '<circle cx="33.6" cy="41.3" r="0.9" fill="#ffd27a" stroke="none" opacity=".8"/><circle cx="28.1" cy="38.2" r="0.9" fill="#ffd27a" stroke="none" opacity=".8"/>' +
  '<circle cx="39.8" cy="41.3" r="0.9" fill="#ffd27a" stroke="none" opacity=".8"/><circle cx="24.3" cy="34.3" r="0.9" fill="#ffd27a" stroke="none" opacity=".8"/>' +
  '<ellipse cx="25.5" cy="26.5" rx="4" ry="2.6" fill="#fff" opacity=".6" stroke="none" transform="rotate(-35 25.5 26.5)"/>' +
  '<path d="M16.5 33.5A15.5 15.5 0 1 0 47.5 33.5A15.5 15.5 0 1 0 16.5 33.5Z" fill="none"/>' +
  '<path d="M30 18.5l2.4 1.6l2.6-1.4l-.6 2.8l2 1.8l-2.8.3l-1.3 2.5l-1.1-2.6l-2.8-.6l2.2-1.7Z" fill="#4f9a3c" stroke-width="1.5"/>' +
  '</g></svg>'

// Tư thế nguyên liệu trên thớt: rot (độ) để thân nằm ngang; box [x0, y0, x1, y1] là phần thân cần hiện, tính trên lưới 64
// của hình SAU khi xoay (bỏ bóng đất và phần trang trí kèm theo, vd lát dưa đặt cạnh quả); body: hình trạng thái dùng làm
// thân (xoài, bưởi đã gọt ở bước trước); state: hình khi thái xong nếu bước không có lựa chọn cách thái; face: màu mặt cắt
// [vỏ, ruột, lõi, hạt] (elip lộ ruột ở mép mỗi lát; null: không vẽ); crumbs: màu vụn; row: bày n quả nhỏ thành hàng (tắc).
export const CUT_POSE = Object.freeze({
  dua_leo: Object.freeze({
    rot: 36, box: Object.freeze([2.6, 16.2, 59.6, 39.8]), state: 'lat',
    face: Object.freeze(['#4ea443', '#e3f3b8', '#f6fbe0', '#8fbf5c']), crumbs: Object.freeze(['#e3f3b8', '#4ea443', '#8fbf5c'])
  }),
  xoai_xanh: Object.freeze({
    body: 'got', rot: 40, box: Object.freeze([5.5, 17.5, 51, 45]), state: 'soi',
    face: Object.freeze(['#c2cc58', '#e4eb90', '#f8fbd6', '#c2cc58']), crumbs: Object.freeze(['#e4eb90', '#c2cc58', '#f8fbd6'])
  }),
  vo_buoi: Object.freeze({
    body: 'got', rot: 0, box: Object.freeze([6.5, 6.5, 53, 54.5]), state: 'hat_luu',
    face: Object.freeze(['#e2c98e', '#f8eac2', '#fffaea', '#e2c98e']), crumbs: Object.freeze(['#f8eac2', '#e2c98e', '#fffaea'])
  }),
  banh_trang: Object.freeze({
    rot: 0, box: Object.freeze([6, 26, 58, 57.4]), state: 'soi',
    face: null, crumbs: Object.freeze(['#f4e7c6', '#dcc794', '#fbf3dc'])
  }),
  tac: Object.freeze({
    row: true, rot: 0, box: Object.freeze([15, 16.5, 49, 50.5]), state: 'bo_doi',
    face: Object.freeze(['#f7a31e', '#ffd04a', '#fff2bd', '#fff8e0']), crumbs: Object.freeze(['#ffd04a', '#f7a31e', '#fff2bd'])
  })
})
const DEFAULT_POSE = Object.freeze({ rot: 0, box: Object.freeze([4, 6, 60, 58]), state: null, face: null, crumbs: null })
// Màu vụn dự phòng theo nguyên liệu (nguyên liệu chưa có tư thế riêng).
const FOOD_COLORS = Object.freeze({
  dua_leo: ['#5fae4e', '#d9f0c4'], tac: ['#f7a31e', '#ffd04a'], banh_trang: ['#f1dfb4', '#fbf3df'],
  xoai_xanh: ['#9ccc4a', '#f2f0b4'], vo_buoi: ['#a8d46f', '#fff6e8']
})

/** Hình khi thái xong (tên trạng thái) theo tư thế và cách thái: có cách thái thì theo cách, không thì theo tư thế. */
export function doneState(pose, method) {
  if (method) return Object.prototype.hasOwnProperty.call(METHOD_STATE, method) ? METHOD_STATE[method] : null
  return (pose && pose.state) || null
}

function mount(stage, step, ctx = {}) {
  const params = step.params || {}
  const n = Math.max(1, Math.floor(Number(params.cuts) || 1))
  const mul = ctx.zoneMul || 1
  const limit = ctx.untimed ? Infinity : stepLimitSec(step.par, ctx.assist)   // Nấu thử: không giới hạn
  const clock = createClock()
  const out = settleOnce()
  const rand = ctx.rand || Math.random
  const vfx = vfxOf(ctx)
  const reduced = reducedOf(ctx)
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const artId = (INGS[step.ing] && INGS[step.ing].icon) || step.ing || (ctx.recipe && ctx.recipe.icon) || 'fallback'
  const pose = CUT_POSE[artId] || DEFAULT_POSE
  const iconSvg = artV2(artId)
  const bodySvg = pose.row ? TAC_ONE : pose.body ? artV2(artId, pose.body) : iconSvg
  const method = ctx.method || (step.method && step.method.correct) || null
  const colors = FOOD_COLORS[step.ing] || ['#e3b779', '#fff3dd']
  stage.classList.add('mg-thai', 'g-thai2')
  if (mul >= 1.3) stage.classList.add('is-wide-guide')

  const fr = buildFrame2(stage, {
    icon: iconSvg, title: step.label || '', sub: 'Kéo dao tới vạch chấm, nhấc tay để cắt.',
    steps: frameSteps(ctx), timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })
  const boardArt = svgBox(propV2('thot_lon'), 'g-board2-art')
  const food = h('div', { class: ['thai-food', 'g-food2', pose.row ? 'is-row' : ''] })
  const board = h('div', { class: 'thai-board g-board2', 'data-testid': 'thai-board' }, boardArt, food)
  const chop = h('div', { class: 'g-knife2-chop' }, svgBox(propV2('dao_lon'), 'g-knife2-svg'))
  const knife = h('div', { class: 'thai-knife g-knife2', hidden: true }, chop)
  const aim = h('div', { class: 'thai-aim g-aim2', hidden: true })
  board.append(aim, knife)
  const counter = h('div', { class: 'mg-count g-pill g-pill--big g-count2', 'data-testid': 'thai-count' })
  const doneBtn = h('button', { class: 'g-btn g-btn--small mg-done', type: 'button', 'data-testid': 'thai-done' }, 'Xong')
  fr.area.append(board)
  fr.foot.append(counter, doneBtn)

  // Bố trí theo kích thước thật: thớt vẽ vừa khung (giữ tỉ lệ), nguyên liệu canh giữa mặt thớt.
  const stageRect = stage.getBoundingClientRect()
  const bRect = board.getBoundingClientRect()
  const bw = bRect.width, bh = bRect.height
  const meta = PROP_META.thot_lon || { vb: [240, 160], center: [120, 69] }
  const [VW, VH] = meta.vb
  const s = Math.max(0.01, Math.min(bw / VW, bh / VH))
  const artL = (bw - VW * s) / 2, artT = (bh - VH * s) / 2
  Object.assign(boardArt.style, { left: artL + 'px', top: artT + 'px', width: VW * s + 'px', height: VH * s + 'px' })
  const cxPx = artL + meta.center[0] * s, cyPx = artT + meta.center[1] * s
  const [x0, y0, x1, y1] = pose.box
  const maxH = Math.max(40, 92 * s)                    // mặt thớt cao ~98 đơn vị: chừa mép
  let foodW = Math.min(FOOD_MAX, Math.max(FOOD_MIN, 200 * s * 0.92), bw - 32)
  let foodH
  let fruit = 0                                         // hàng tắc: cỡ một quả (px)
  if (pose.row) {
    fruit = Math.round(Math.min(maxH, foodW * 0.76 / Math.max(1.6, n - 0.4), 96))
    foodH = fruit
  } else {
    const ratio = (y1 - y0) / (x1 - x0)
    if (foodW * ratio > maxH) foodW = maxH / ratio
    foodW = Math.round(foodW)
    foodH = Math.round(foodW * ratio)
  }
  foodW = Math.round(foodW)
  const foodLeft = Math.round(cxPx - foodW / 2)
  const foodTop = Math.round(cyPx - foodH / 2)
  Object.assign(food.style, { left: foodLeft + 'px', top: foodTop + 'px', width: foodW + 'px', height: foodH + 'px' })

  const offX = bRect.left - stageRect.left      // board → khung sân khấu
  const guides = thaiGuides(n, foodW, rand)      // theo khung nguyên liệu
  const cuts = new Array(n).fill(null)

  // Thân nguyên liệu (mỗi khúc là một bản sao bị cắt bằng clip-path theo [a, b] — px trong khung nguyên liệu).
  const unit = foodW / (x1 - x0)                 // px trên một đơn vị lưới 64 (thân một hình)
  const artPx = 64 * unit
  const artStyle = { width: artPx + 'px', height: artPx + 'px', left: (-x0 * unit) + 'px', top: (-y0 * unit) + 'px', transform: `rotate(${pose.rot || 0}deg)` }
  function makeBody() {
    if (!pose.row) return svgBox(bodySvg, 'g-piece2-art', { style: artStyle })
    // hàng quả: mỗi quả canh giữa đúng một vạch (cắt chuẩn là bổ đôi quả)
    const u = fruit / (x1 - x0)
    const row = h('div', { class: 'g-row2' })
    for (const gx of guides) {
      row.appendChild(svgBox(bodySvg, 'g-piece2-art', {
        style: { width: 64 * u + 'px', height: 64 * u + 'px', left: (gx - fruit / 2 - x0 * u) + 'px', top: (-y0 * u) + 'px' }
      }))
    }
    return row
  }
  const pieces = []
  function makePiece(a, b, off) {
    const el = h('div', { class: 'g-piece2' }, makeBody())
    const p = { a, b, off, el, face: null }
    clipPiece(p)
    el.style.transform = `translateX(${off}px)`
    return p
  }
  // hàng quả: hai mép ngoài không cắt (quả đầu/cuối có thể lấn ra ngoài khung nguyên liệu)
  const OUT = pose.row ? -fruit : 0
  function clipPiece(p) {
    const r = p.b >= foodW ? OUT : Math.max(0, foodW - p.b)
    const l = p.a <= 0 ? OUT : Math.max(0, p.a)
    p.el.style.clipPath = `inset(0 ${r}px 0 ${l}px)`
  }
  pieces.push(makePiece(0, foodW, 0))
  food.appendChild(pieces[0].el)
  // Kích thước mặt cắt (elip lộ ruột) theo độ dày thân.
  const faceH = Math.round(foodH * (pose.row ? 0.78 : 0.84))
  const faceW = Math.max(10, Math.round(faceH * 0.3))

  const guideEls = guides.map((gx, i) => {
    const xBoard = foodLeft + gx
    const el = h('div', {
      class: 'thai-guide g-guide2', 'data-testid': 'thai-guide-' + i,
      'data-x': String(Math.round(offX + xBoard)),
      style: { left: xBoard + 'px', top: (foodTop - 14) + 'px', height: (foodH + 28) + 'px', '--band': (6 * mul).toFixed(1) + 'px' }
    })
    board.appendChild(el)
    return el
  })
  let extra = 0
  const timers = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }

  function renderCount() {
    const done = cuts.filter(c => c !== null).length
    counter.textContent = `Nhát ${done}/${n}`
  }
  renderCount()

  // Dao lớn dựng đứng: mũi dao (PROP_META.dao_lon.tip) đặt lệch KNIFE_OFFSET_PX phía trên ngón tay, cùng hoành độ.
  const kMeta = PROP_META.dao_lon || { vb: [200, 64], tip: [197, 26] }
  const kLen = Math.round(Math.max(96, Math.min(150, bh * 0.62)))
  const kTip = [kMeta.tip[0] / kMeta.vb[0] * 100, kMeta.tip[1] / kMeta.vb[1] * 100]
  Object.assign(chop.firstChild.style, {
    width: kLen + 'px', height: Math.round(kLen * kMeta.vb[1] / kMeta.vb[0]) + 'px',
    transformOrigin: `${kTip[0].toFixed(1)}% ${kTip[1].toFixed(1)}%`,
    transform: `translate(${(-kTip[0]).toFixed(1)}%, ${(-kTip[1]).toFixed(1)}%) rotate(90deg)`
  })
  // tọa độ chạm (khung nhìn) → tọa độ trong thớt (đo lại mỗi lần: sân khấu có thể đã cuộn)
  function toBoard(p) {
    const r = board.getBoundingClientRect()
    return { x: p.clientX - r.left, y: p.clientY - r.top, clientX: p.clientX, clientY: p.clientY }
  }
  let chopAnim = null
  function showKnife(p) {
    if (chopAnim) { try { chopAnim.cancel() } catch { /* bỏ qua */ } chopAnim = null }
    knife.hidden = false
    aim.hidden = false
    knife.style.left = p.x + 'px'
    knife.style.top = (p.y - KNIFE_OFFSET_PX) + 'px'
    aim.style.left = p.x + 'px'
  }
  function hideKnife(withChop) {
    aim.hidden = true
    if (!withChop || reduced() || typeof chop.animate !== 'function') { knife.hidden = true; return }
    try {
      chopAnim = chop.animate([
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(16px)', opacity: 1, offset: 0.35 },
        { transform: 'translateY(12px)', opacity: 1, offset: 0.6 },
        { transform: 'translateY(4px)', opacity: 0 }
      ], { duration: 260, easing: 'ease-out' })
      const a = chopAnim
      a.addEventListener('finish', () => { if (chopAnim === a) { chopAnim = null; knife.hidden = true } })
    } catch { knife.hidden = true }
  }

  // Tách khúc tại x (px trong thớt): tìm khúc đang nằm dưới x (theo vị trí đang hiện), cắt đôi, dời mọi khúc về độ lệch mới.
  function splitAt(xBoard, faceColors) {
    const xl = xBoard - foodLeft
    const idx = pieces.findIndex(p => xl >= p.a + p.off && xl <= p.b + p.off)
    if (idx < 0) return false
    const P = pieces[idx]
    const c = xl - P.off
    if (c - P.a < 6 || P.b - c < 6) return false
    const R = makePiece(c, P.b, P.off)
    P.b = c
    clipPiece(P)
    if (faceColors) {
      const [skin, flesh, core, seed] = faceColors
      R.face = h('i', {
        class: 'g-face2',
        style: { left: c + 'px', top: ((foodH - faceH) / 2) + 'px', width: faceW + 'px', height: faceH + 'px', '--skin': skin, '--flesh': flesh, '--core': core, '--seed': seed }
      })
      R.el.appendChild(R.face)
    }
    pieces.splice(idx + 1, 0, R)
    P.el.after(R.el)
    return true
  }
  function settlePieces(animate) {
    const offs = sliceOffsets(pieces.length - 1)
    pieces.forEach((p, i) => {
      const from = p.off
      p.off = offs[i]
      p.el.style.transform = `translateX(${p.off}px)`
      if (animate && from !== p.off && typeof p.el.animate === 'function') {
        try {
          p.el.animate([
            { transform: `translateX(${from}px)` },
            { transform: `translateX(${p.off + Math.sign(p.off - from) * 3}px)`, offset: 0.6 },
            { transform: `translateX(${p.off}px)` }
          ], { duration: 240, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' })
        } catch { /* bỏ qua */ }
      }
    })
  }

  function cutAt(p) {
    const xBoard = p.x
    if (xBoard < foodLeft - 16 || xBoard > foodLeft + foodW + 16) return
    const hit = nearestUncut(guides.map(g => foodLeft + g), cuts, xBoard)
    if (!hit) {
      extra++
      feedback(ctx, 'bad', board)
      popLabel(board, 'Dư nhát', xBoard, Math.max(16, p.y - KNIFE_OFFSET_PX - 16), 'is-bad', ctx)
      return
    }
    cuts[hit.index] = hit.dev
    const sc = thaiCutScore(hit.dev, mul)
    const el = guideEls[hit.index]
    el.classList.add('is-cut', sc >= 80 ? 'is-good' : 'is-off')
    el.dataset.dev = String(hit.dev)
    // chữ nổi TRÊN ngón tay, ngay trên mép trên nguyên liệu tại vết cắt (không đè lên quả, không bị ngón che)
    const labelY = Math.max(12, Math.min(p.y - KNIFE_OFFSET_PX, foodTop) - 8)
    popLabel(board, cutLabel(sc), xBoard, labelY, sc >= 80 ? 'is-good' : 'is-off', ctx)
    feedback(ctx, sc >= 100 ? 'cut' : 'chop')
    food.classList.add('is-cut')
    // đã vào nhịp: thẻ hướng dẫn mờ đi để chữ nổi "Chuẩn!" không đè lên chữ (css/fx.css)
    stage.classList.add('is-cutting')
    const split = splitAt(xBoard, pose.face)
    const isRed = reduced()
    // dừng hình 60 ms rồi lát tách trượt và vụn bắn ra (giảm chuyển động: đặt thẳng vị trí mới, không vụn)
    const after = () => {
      if (split) settlePieces(!isRed)
      if (vfx && !isRed) {
        const r = food.getBoundingClientRect()
        const bx = board.getBoundingClientRect().left + xBoard
        vfx.burst({ left: bx - 8, top: r.top + r.height * 0.2, width: 16, height: r.height * 0.6 }, 'crumb',
          { n: 3 + Math.floor(Math.random() * 3), colors: pose.crumbs || [colors[0], colors[1]] })
      }
    }
    if (vfx) vfx.hitstop(60).then(after)
    else later(after, 60)
    renderCount()
    if (cuts.every(c => c !== null)) later(finish, 320)
  }

  const unbind = bindPointer(fr.area, {
    down(p) { if (!out.done) showKnife(toBoard(p)) },
    move(p) { if (!out.done) showKnife(toBoard(p)) },
    up(p) { hideKnife(!out.done); if (!out.done) cutAt(toBoard(p)) },
    cancel(p) { hideKnife(!out.done); if (!out.done) cutAt(toBoard(p)) }
  }, { space: false })

  doneBtn.addEventListener('click', () => finish())

  const loop = frameLoop(() => {
    const t = clock.elapsed()
    fr.setTime(t / limit)
    if (t >= limit) finish()
  })

  // Đủ nhát: các khúc mờ đi, hình trạng thái (vd đĩa dưa leo thái lát) nảy vào giữa thớt.
  function showDone() {
    const state = doneState(pose, method)
    if (!state || !cuts.every(c => c !== null)) return
    const doneSvg = artV2(artId, state)
    if (!doneSvg || doneSvg === iconSvg || doneSvg === bodySvg) return
    const size = Math.round(Math.min(Math.max(foodW * 0.72, 96), Math.max(foodH * 1.5, 96), bh * 0.86))
    const plate = svgBox(doneSvg, 'g-done2', {
      style: { left: Math.round(cxPx - size / 2) + 'px', top: Math.round(cyPx - size * 0.55) + 'px', width: size + 'px', height: size + 'px' }
    })
    board.appendChild(plate)
    food.classList.add('is-done')
    if (vfx) vfx.pop(plate)
  }

  function finish() {
    if (out.done) return
    const elapsed = clock.elapsed()
    cleanup()
    const score = scoreThai({ cuts: cuts.slice(), expected: n, extra, mul })
    out.settle({ score, details: { cuts: cuts.slice(), extra, elapsed, guides: guides.slice() } })
    showDone()
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    unbind()
    knife.hidden = true
    aim.hidden = true
  }

  return {
    result: out.promise,
    hold(on) { if (!out.done) clock.hold(on) },
    destroy() {
      cleanup()
      for (const id of timers) clearTimeout(id)
      timers.clear()
      fr.destroy()
      out.settle(null)
    }
  }
}

export default { type: 'thai', mount }
