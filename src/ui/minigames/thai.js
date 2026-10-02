// THAI — "kéo dao để ngắm, nhấc tay để cắt". Dao là vạch dọc hiện lệch lên trên ngón tay 40px,
// cùng hoành độ với ngón tay; nhấc tay thì cắt tại hoành độ đó, đo lệch tới vạch chưa cắt gần nhất.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreThai, thaiCutScore } from '../../core/minigame-scoring.js'
import {
  createClock, frameLoop, settleOnce, feedback, stepLimitSec, buildFrame, ingIcon,
  thaiGuides, nearestUncut, popLabel
} from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2, propV2, PROP_META } from '../art/v2.js'
import { isReduced } from '../motion.js'

export const KNIFE_OFFSET_PX = 40
export const MIN_FOOD_WIDTH = 280

const FOOD_COLORS = {
  dua_leo: ['#5fae4e', '#d9f0c4'], tac: ['#8cc63f', '#f3f7c9'], banh_trang: ['#f1dfb4', '#fbf3df'],
  xoai_xanh: ['#9ccc4a', '#f2f0b4'], vo_buoi: ['#a8d46f', '#fff6e8']
}

// Nhãn sau mỗi nhát thái theo điểm nhát (thaiCutScore): 100 Chuẩn · 80 Hơi lệch · 55 Lệch · 20 Lệch xa.
export function cutLabel(score) {
  if (score >= 100) return 'Chuẩn!'
  if (score >= 80) return 'Hơi lệch'
  if (score >= 55) return 'Lệch'
  return 'Lệch xa'
}

function mount(stage, step, ctx = {}) {
  // Giao diện M5 (bật thử bằng ctx.look === 2, Đợt 1 thành mặc định); mọi giá trị khác giữ nguyên hành vi cũ bên dưới.
  if (ctx && ctx.look === 2) return mountLook2(stage, step, ctx)
  const params = step.params || {}
  const n = Math.max(1, Math.floor(Number(params.cuts) || 1))
  const mul = ctx.zoneMul || 1
  const limit = ctx.untimed ? Infinity : stepLimitSec(step.par, ctx.assist)   // Nấu thử: không giới hạn
  const clock = createClock()
  const out = settleOnce()
  const rand = ctx.rand || Math.random
  stage.classList.add('mg-thai')
  if (mul >= 1.3) stage.classList.add('is-wide-guide')

  const fr = buildFrame(stage, step, ctx, { sub: 'Kéo dao tới vạch chấm, nhấc tay để cắt.' })
  const colors = FOOD_COLORS[step.ing] || ['#e3b779', '#fff3dd']
  const food = h('div', { class: 'thai-food', style: { '--skin': colors[0], '--flesh': colors[1] } },
    svgBox(ingIcon(step.ing, ctx), 'thai-food-icon'))
  const board = h('div', { class: 'thai-board', 'data-testid': 'thai-board' }, food)
  const knife = h('div', { class: 'thai-knife', hidden: true }, h('div', { class: 'thai-blade' }))
  const aim = h('div', { class: 'thai-aim', hidden: true })
  board.append(aim, knife)
  const counter = h('div', { class: 'mg-count', 'data-testid': 'thai-count' })
  const doneBtn = h('button', { class: 'btn btn-ghost mg-done', type: 'button', 'data-testid': 'thai-done' }, 'Xong')
  fr.area.append(board)
  fr.foot.append(counter, doneBtn)

  // Bố trí sau khi có kích thước thật.
  const stageRect = stage.getBoundingClientRect()
  const boardRect = board.getBoundingClientRect()
  const foodW = Math.max(MIN_FOOD_WIDTH, Math.min(boardRect.width - 24, 360))
  const foodLeft = Math.round((boardRect.width - foodW) / 2)
  food.style.width = foodW + 'px'
  food.style.left = foodLeft + 'px'
  const offX = boardRect.left - stageRect.left      // board → khung sân khấu
  const guides = thaiGuides(n, foodW, rand)          // theo khung nguyên liệu
  const cuts = new Array(n).fill(null)
  const guideEls = guides.map((gx, i) => {
    const xBoard = foodLeft + gx
    const el = h('div', {
      class: 'thai-guide', 'data-testid': 'thai-guide-' + i,
      'data-x': String(Math.round(offX + xBoard)), style: { left: xBoard + 'px', '--band': (6 * mul).toFixed(1) + 'px' }
    })
    board.appendChild(el)
    return el
  })
  let extra = 0

  function renderCount() {
    const done = cuts.filter(c => c !== null).length
    counter.textContent = `Nhát ${done}/${n}`
  }
  renderCount()

  function showKnife(p) {
    knife.hidden = false
    aim.hidden = false
    knife.style.left = p.x + 'px'
    knife.style.top = (p.y - KNIFE_OFFSET_PX) + 'px'
    aim.style.left = p.x + 'px'
  }
  function hideKnife() { knife.hidden = true; aim.hidden = true }

  function cutAt(xBoard) {
    // bỏ qua nhấc tay ngoài nguyên liệu
    if (xBoard < foodLeft - 16 || xBoard > foodLeft + foodW + 16) return
    const hit = nearestUncut(guides.map(g => foodLeft + g), cuts, xBoard)
    if (!hit) { extra++; feedback(ctx, 'bad'); return }
    cuts[hit.index] = hit.dev
    const s = thaiCutScore(hit.dev, mul)
    const el = guideEls[hit.index]
    el.classList.add('is-cut', s >= 80 ? 'is-good' : 'is-off')
    el.dataset.dev = String(hit.dev)
    const mark = h('div', { class: 'thai-cut', style: { left: xBoard + 'px' } })
    board.appendChild(mark)
    // chữ theo ngưỡng chấm (không hiện đơn vị kỹ thuật như "px")
    popLabel(board, cutLabel(s), xBoard, 24, s >= 80 ? 'is-good' : 'is-off')
    feedback(ctx, s >= 100 ? 'cut' : 'chop')
    food.classList.add('is-cut')
    renderCount()
    if (cuts.every(c => c !== null)) setTimeout(finish, 260)
  }

  const unbind = bindPointer(board, {
    down(p) { if (!out.done) showKnife(p) },
    move(p) { if (!out.done) showKnife(p) },
    up(p) { hideKnife(); if (!out.done) cutAt(p.x) },
    cancel(p) { hideKnife(); if (!out.done) cutAt(p.x) }
  }, { space: false })

  doneBtn.addEventListener('click', () => finish())

  const loop = frameLoop(() => {
    const t = clock.elapsed()
    fr.setTime(t / limit)
    if (t >= limit) finish()
  })

  function finish() {
    if (out.done) return
    const elapsed = clock.elapsed()
    cleanup()
    const score = scoreThai({ cuts: cuts.slice(), expected: n, extra, mul })
    out.settle({ score, details: { cuts: cuts.slice(), extra, elapsed, guides: guides.slice() } })
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
    unbind()
  }

  return { result: out.promise, destroy() { cleanup(); out.settle(null) } }
}

// ---------- Giao diện M5 (ctx.look === 2) ----------
// Nguyên liệu TO (~220px, hình artV2) nằm trên thớt gỗ lớn (propV2('thot_lon')); dao lớn (propV2('dao_lon')) dựng đứng,
// mũi dao lệch KNIFE_OFFSET_PX phía trên ngón tay; vạch chấm hướng dẫn. Mỗi nhát: dao bổ xuống, dừng hình 60 ms, lát tách
// trượt 8px (mặt cắt lộ ruột), 3–5 vụn, chữ "Chuẩn!" / "Lệch" nổi TRÊN ngón tay; đủ nhát thì hiện hình trạng thái
// (vd 'dua_leo.lat'). Cách chấm giữ nguyên (thaiCutScore, nearestUncut, scoreThai); data-x của vạch vẫn đo từ mép trái
// sân khấu. Hiệu ứng lấy từ ctx.vfx (thiếu thì bỏ qua, chữ nổi dùng popLabel cũ); giảm chuyển động: không vụn, không trượt.

// Tư thế nguyên liệu trên thớt: rot (độ) để thân nằm ngang; box [x0, y0, x1, y1] là phần thân cần hiện, tính trên lưới 64
// của hình SAU khi xoay (bỏ bóng đất và phần trang trí kèm theo, vd lát dưa đặt cạnh quả); state: hình trạng thái khi thái
// xong; face: màu mặt cắt [vỏ, ruột, lõi, hạt] (vẽ elip lộ ruột ở mép mỗi lát); crumbs: màu vụn.
// Ghi chú Đợt 1: nếu bộ hình có thêm hình "nằm ngang trên thớt" riêng thì chỉ cần đổi bảng này (rot 0, box cả hình).
export const CUT_POSE = Object.freeze({
  dua_leo: Object.freeze({
    rot: 36, box: Object.freeze([2.6, 16.2, 59.6, 39.8]), state: 'lat',
    face: Object.freeze(['#4ea443', '#e3f3b8', '#f6fbe0', '#8fbf5c']), crumbs: Object.freeze(['#e3f3b8', '#4ea443', '#8fbf5c'])
  })
})
const DEFAULT_POSE = Object.freeze({ rot: 0, box: Object.freeze([4, 6, 60, 58]), state: null, face: null, crumbs: null })
export const SLICE_GAP_PX = 8
const FOOD2_MIN = 140
const FOOD2_MAX = 260

// Độ lệch ngang (px) của từng khúc khi đã có m nhát: mỗi nhát đẩy hai bên ra mỗi bên GAP/2 → hai khúc kề nhau cách GAP.
export function sliceOffsets(m, gap = SLICE_GAP_PX) {
  const out = []
  for (let i = 0; i <= m; i++) out.push((gap / 2) * (2 * i - m))
  return out
}

function mountLook2(stage, step, ctx) {
  const params = step.params || {}
  const n = Math.max(1, Math.floor(Number(params.cuts) || 1))
  const mul = ctx.zoneMul || 1
  const limit = ctx.untimed ? Infinity : stepLimitSec(step.par, ctx.assist)
  const clock = createClock()
  const out = settleOnce()
  const rand = ctx.rand || Math.random
  const vfx = ctx.vfx || null
  const reduced = () => {
    try {
      if (typeof ctx.reduced === 'function') return !!ctx.reduced()
      if (ctx.reduced !== undefined && ctx.reduced !== null) return !!ctx.reduced
    } catch { /* bỏ qua */ }
    return isReduced(ctx.app)
  }
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const artId = (INGS[step.ing] && INGS[step.ing].icon) || step.ing || (ctx.recipe && ctx.recipe.icon) || 'fallback'
  const pose = CUT_POSE[artId] || DEFAULT_POSE
  const foodSvg = artV2(artId)
  const colors = FOOD_COLORS[step.ing] || ['#e3b779', '#fff3dd']
  stage.classList.add('mg-thai', 'g-thai2')
  if (mul >= 1.3) stage.classList.add('is-wide-guide')

  const fr = buildFrame2(stage, {
    icon: foodSvg, title: step.label || '', sub: 'Kéo dao tới vạch chấm, nhấc tay để cắt.',
    steps: Number(ctx.stepTotal) > 0 ? { index: ctx.stepIndex, total: ctx.stepTotal, grades: ctx.stepGrades || [] } : null,
    timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })
  const boardArt = svgBox(propV2('thot_lon'), 'g-board2-art')
  const food = h('div', { class: 'thai-food g-food2' })
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
  const ratio = (y1 - y0) / (x1 - x0)
  let foodW = Math.min(FOOD2_MAX, Math.max(FOOD2_MIN, 200 * s * 0.92), bw - 32)
  const maxH = Math.max(40, 92 * s)                    // mặt thớt cao ~98 đơn vị: chừa mép
  if (foodW * ratio > maxH) foodW = maxH / ratio
  foodW = Math.round(foodW)
  const foodH = Math.round(foodW * ratio)
  const foodLeft = Math.round(cxPx - foodW / 2)
  const foodTop = Math.round(cyPx - foodH / 2)
  Object.assign(food.style, { left: foodLeft + 'px', top: foodTop + 'px', width: foodW + 'px', height: foodH + 'px' })
  const unit = foodW / (x1 - x0)                       // px trên một đơn vị lưới 64
  const artPx = 64 * unit
  const artStyle = { width: artPx + 'px', height: artPx + 'px', left: (-x0 * unit) + 'px', top: (-y0 * unit) + 'px', transform: `rotate(${pose.rot}deg)` }
  // Khúc nguyên liệu: mỗi khúc là một bản hình bị cắt bằng clip-path theo [a, b] (px trong khung nguyên liệu).
  const pieces = []
  function makePiece(a, b, off) {
    const el = h('div', { class: 'g-piece2' }, svgBox(foodSvg, 'g-piece2-art', { style: artStyle }))
    const p = { a, b, off, el, face: null }
    clipPiece(p)
    el.style.transform = `translateX(${off}px)`
    return p
  }
  function clipPiece(p) { p.el.style.clipPath = `inset(0 ${Math.max(0, foodW - p.b)}px 0 ${Math.max(0, p.a)}px)` }
  pieces.push(makePiece(0, foodW, 0))
  food.appendChild(pieces[0].el)
  // Kích thước mặt cắt (elip lộ ruột) theo độ dày thân.
  const faceH = Math.round(foodH * 0.84)
  const faceW = Math.max(10, Math.round(faceH * 0.3))

  const offX = bRect.left - stageRect.left      // board → khung sân khấu
  const guides = thaiGuides(n, foodW, rand)      // theo khung nguyên liệu
  const cuts = new Array(n).fill(null)
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
      feedback(ctx, 'bad')
      if (vfx) vfx.floatText({ x: p.clientX, y: p.clientY }, 'Dư nhát', { tone: 'bad', size: 'small' })
      if (vfx && !reduced()) vfx.shake(board, 1)
      return
    }
    cuts[hit.index] = hit.dev
    const sc = thaiCutScore(hit.dev, mul)
    const el = guideEls[hit.index]
    el.classList.add('is-cut', sc >= 80 ? 'is-good' : 'is-off')
    el.dataset.dev = String(hit.dev)
    const label = cutLabel(sc)
    // chữ nổi TRÊN ngón tay, ngay trên mép trên nguyên liệu tại vết cắt (không đè lên quả, không bị ngón che); vfx đặt
    // chữ cao hơn điểm 48px. Thiếu vfx thì dùng nhãn cũ trong thớt.
    if (vfx) {
      const top = food.getBoundingClientRect().top
      vfx.floatText({ x: p.clientX, y: Math.min(p.clientY, top + 40) }, label, { tone: sc >= 100 ? 'good' : sc >= 80 ? 'gold' : 'bad' })
    }
    else popLabel(board, label, xBoard, Math.max(16, p.y - KNIFE_OFFSET_PX - 16), sc >= 80 ? 'is-good' : 'is-off')
    feedback(ctx, sc >= 100 ? 'cut' : 'chop')
    food.classList.add('is-cut')
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

  const unbind = bindPointer(board, {
    down(p) { if (!out.done) showKnife(p) },
    move(p) { if (!out.done) showKnife(p) },
    up(p) { hideKnife(!out.done); if (!out.done) cutAt(p) },
    cancel(p) { hideKnife(!out.done); if (!out.done) cutAt(p) }
  }, { space: false })

  doneBtn.addEventListener('click', () => finish())

  const loop = frameLoop(() => {
    const t = clock.elapsed()
    fr.setTime(t / limit)
    if (t >= limit) finish()
  })

  // Đủ nhát: các khúc mờ đi, hình trạng thái (vd đĩa dưa leo thái lát) nảy vào giữa thớt.
  function showDone() {
    if (!pose.state || !cuts.every(c => c !== null)) return
    const doneSvg = artV2(artId, pose.state)
    if (!doneSvg || doneSvg === foodSvg) return
    const size = Math.round(Math.min(foodW * 0.72, Math.max(foodH * 1.5, 96), bh * 0.8))
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
