// THAI — "kéo dao để ngắm, nhấc tay để cắt". Dao là vạch dọc hiện lệch lên trên ngón tay 40px,
// cùng hoành độ với ngón tay; nhấc tay thì cắt tại hoành độ đó, đo lệch tới vạch chưa cắt gần nhất.
import { h, svgBox } from '../dom.js'
import { bindPointer } from '../input.js'
import { scoreThai, thaiCutScore } from '../../core/minigame-scoring.js'
import {
  createClock, frameLoop, settleOnce, feedback, stepLimitSec, buildFrame, ingIcon,
  thaiGuides, nearestUncut, popLabel
} from './_util.js'

export const KNIFE_OFFSET_PX = 40
export const MIN_FOOD_WIDTH = 280

const FOOD_COLORS = {
  dua_leo: ['#5fae4e', '#d9f0c4'], tac: ['#8cc63f', '#f3f7c9'], banh_trang: ['#f1dfb4', '#fbf3df'],
  xoai_xanh: ['#9ccc4a', '#f2f0b4'], vo_buoi: ['#a8d46f', '#fff6e8']
}

function mount(stage, step, ctx = {}) {
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
    popLabel(board, s >= 100 ? 'Chuẩn!' : `Lệch ${Math.round(Math.abs(hit.dev))}px`, xBoard, 24, s >= 80 ? 'is-good' : 'is-off')
    feedback(ctx, s >= 100 ? 'cut' : 'tap')
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

export default { type: 'thai', mount }
