// CHON — chọn nguyên liệu: chạm ô trên kệ để bỏ vào rổ, chạm lại để lấy ra, bấm "Xong".
// Không tự kết thúc; quá 2,5 × par thì các ô cần lấy nhấp nháy (và tính thêm 1 lần nhầm = −15).
// Hỗ trợ thao tác: gợi ý sớm hơn (1,5 × par, không phạt), không gợi ý ngay từ đầu.
// Nấu thử (ctx.untimed, ctx.guide): gợi ý ngay từ đầu, không bao giờ tính quá giờ.
// ctx.initial = {picked, mistakes} để khôi phục rổ đang chọn dở; handle.snapshot() trả rổ hiện tại; ctx.onChange(snapshot)
// gọi sau mỗi lần chạm ô kệ (vd gánh hàng quê lưu rổ dở vào save để tải lại trang không thành lượt lựa mới).
// Thiếu nguyên liệu chính: báo chung + khóa 1,5 giây, không cho qua (ctx.missingText đổi câu báo, vd ở gánh hàng quê).
// M4: ctx.stockLeft = {ingId: số phần còn trong kho hàng hiếm} → ô kệ hiện nhãn "còn n" (nguyên liệu hiếm).
import { h, svgBox } from '../dom.js'
import { requiredIngredients } from '../../core/scoring.js'
import { scoreChon } from '../../core/minigame-scoring.js'
import { createClock, frameLoop, settleOnce, feedback, stepLimitSec, ingIcon, ingName } from './_util.js'

export const MISSING_MAIN_LOCK_MS = 1500

function mount(stage, step, ctx = {}) {
  const recipe = ctx.recipe || {}
  const notes = ctx.notes || []
  const req = requiredIngredients(recipe, notes)
  const shelf = (ctx.shelf && ctx.shelf.length ? ctx.shelf : recipe.shelf) || []
  // Nấu thử (ctx.untimed/ctx.guide): không phạt quá giờ, ô cần lấy nhấp nháy ngay ("tay chỉ")
  const limit = ctx.untimed ? Infinity : stepLimitSec(step.par, false)
  const hintAt = ctx.guide ? 0 : ctx.assist ? 1.5 * Math.max(1, Number(step.par) || 1) : limit
  const clock = createClock()
  const out = settleOnce()
  const init = ctx.initial || {}
  const picked = (Array.isArray(init.picked) ? init.picked : []).filter(id => shelf.includes(id))
  let mistakes = Math.max(0, Math.floor(Number(init.mistakes) || 0))
  let lockedUntil = 0
  let hinting = false
  let overtime = false

  stage.classList.add('mg-chon')
  const basket = h('div', { class: 'chon-basket', 'data-testid': 'chon-basket', 'aria-label': 'Rổ' })
  const basketEmpty = h('span', { class: 'chon-basket-empty' }, ctx.basketHint || 'Rổ trống. Chạm ô trên kệ để bỏ vào rổ, chạm lần nữa để lấy ra.')
  basket.appendChild(basketEmpty)
  // 9 ô → 3×3; 12 ô → 3 hàng × 4 cột (vừa màn dọc)
  const cols = shelf.length > 9 ? 4 : 3
  const grid = h('div', { class: 'chon-shelf', style: { '--cols': cols }, 'data-cols': String(cols), 'data-rows': Math.ceil(shelf.length / cols) })
  const msg = h('div', { class: 'chon-msg', role: 'status', 'aria-live': 'polite' })
  const doneBtn = h('button', { class: 'btn btn-primary mg-done', type: 'button', 'data-testid': 'chon-done' }, 'Xong')
  stage.append(basket, grid, msg, h('div', { class: 'mg-foot' }, h('span', { class: 'mg-count', 'data-testid': 'chon-count' }), doneBtn))

  // Số lượng cần: 1 lần chạm lấy đủ cả phần (vd "Trứng gà ×2" chạm 1 lần). Ô đã chọn và rổ hiện huy hiệu ×n để người
  // chơi đối chiếu với thẻ công thức (chạm lần nữa là bỏ ra, không phải lấy thêm). Nguyên liệu không ghi số lượng
  // (kể cả bẫy) chỉ nhân theo số phần của dòng phiếu → huy hiệu không lộ đâu là bẫy.
  const portions = Math.max(1, Math.floor(Number(ctx.qty) || 1))
  const qtyOf = id => {
    const ing = (recipe.ingredients || []).find(x => x.id === id)
    return (ing && ing.qty > 1 ? ing.qty : 1) * portions
  }
  const cells = new Map()
  const left = ctx.stockLeft && typeof ctx.stockLeft === 'object' ? ctx.stockLeft : {}
  for (const id of shelf) {
    const n = qtyOf(id)
    const cell = h('button', {
      class: 'chon-cell', type: 'button', 'data-testid': 'shelf-' + id, 'aria-pressed': 'false',
      dataset: { ing: id, qty: n }, 'aria-label': ingName(id, ctx) + (n > 1 ? ` ×${n}` : '')
    }, svgBox(ingIcon(id, ctx), 'chon-icon'), h('span', { class: 'chon-label' }, ingName(id, ctx)),
    n > 1 ? h('span', { class: 'chon-qty', 'data-testid': 'shelf-qty-' + id, 'aria-hidden': 'true' }, '×' + n) : null,
    left[id] !== undefined ? h('span', { class: 'chon-left', 'data-testid': 'shelf-left-' + id }, 'còn ' + left[id]) : null)
    if (picked.includes(id)) { cell.classList.add('is-picked'); cell.setAttribute('aria-pressed', 'true') }
    cell.addEventListener('click', () => toggle(id))
    cells.set(id, cell)
    grid.appendChild(cell)
  }

  function renderBasket() {
    const cnt = stage.querySelector('[data-testid="chon-count"]')
    if (cnt) cnt.textContent = `Trong rổ: ${picked.length}`
    basket.textContent = ''
    if (!picked.length) { basket.appendChild(basketEmpty); return }
    for (const id of picked) {
      const n = qtyOf(id)
      basket.appendChild(h('span', { class: 'chon-in', title: ingName(id, ctx) + (n > 1 ? ` ×${n}` : '') },
        svgBox(ingIcon(id, ctx), 'chon-in-icon'), n > 1 ? h('span', { class: 'chon-in-qty' }, '×' + n) : null))
    }
  }

  function renderHints() {
    for (const [id, cell] of cells) {
      const need = req.required.includes(id) && !picked.includes(id)
      cell.classList.toggle('is-hint', hinting && need)
    }
  }

  function toggle(id) {
    if (out.done || performance.now() < lockedUntil) return
    const cell = cells.get(id)
    const i = picked.indexOf(id)
    if (i >= 0) {
      picked.splice(i, 1)
      cell.classList.remove('is-picked')
      cell.setAttribute('aria-pressed', 'false')
      feedback(ctx, 'tap')
    } else {
      picked.push(id)
      cell.classList.add('is-picked')
      cell.setAttribute('aria-pressed', 'true')
      if (!req.required.includes(id)) mistakes++
      feedback(ctx, 'tap')
    }
    renderBasket()
    renderHints()
    if (typeof ctx.onChange === 'function') {
      try { ctx.onChange({ picked: picked.slice(), mistakes }) } catch (err) { console.error(err) }
    }
  }

  function lock(ms) {
    lockedUntil = performance.now() + ms
    stage.classList.add('is-locked')
    doneBtn.disabled = true
    setTimeout(() => {
      if (out.done) return
      stage.classList.remove('is-locked')
      doneBtn.disabled = false
      if (msg.dataset.kind === 'missing') { msg.textContent = ''; delete msg.dataset.kind }
    }, ms)
  }

  doneBtn.addEventListener('click', () => {
    if (out.done || performance.now() < lockedUntil) return
    const missingMain = req.main.filter(id => !picked.includes(id))
    if (missingMain.length) {
      msg.textContent = ctx.missingText || 'Còn thiếu nguyên liệu chính'
      msg.dataset.kind = 'missing'
      feedback(ctx, 'bad')
      if (ctx.assist) { hinting = true; renderHints() }
      lock(MISSING_MAIN_LOCK_MS)
      return
    }
    finish()
  })

  const loop = frameLoop(() => {
    const t = clock.elapsed()
    if (!hinting && t > hintAt) { hinting = true; renderHints() }
    if (!overtime && t > limit) {
      overtime = true
      hinting = true
      renderHints()
    }
  })

  function finish() {
    const elapsed = clock.elapsed()
    const totalMistakes = mistakes + (overtime ? 1 : 0)
    const res = scoreChon({ required: req.required, optional: req.optional, decoys: req.decoys, picked, mistakes: totalMistakes })
    cleanup()
    feedback(ctx, 'ok')
    out.settle({ score: res.score, details: { picked: picked.slice(), mistakes: totalMistakes, tapMistakes: mistakes, overtime, elapsed } })
  }

  function cleanup() {
    loop.stop()
    clock.destroy()
  }

  renderHints()
  renderBasket()
  return {
    result: out.promise,
    snapshot: () => ({ picked: picked.slice(), mistakes }),
    destroy() { cleanup(); out.settle(null) }
  }
}

export default { type: 'chon', mount }
