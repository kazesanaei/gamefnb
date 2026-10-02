// CHON — chọn nguyên liệu: chạm món trên kệ để bỏ vào rổ, chạm lại để lấy ra, bấm "Xong".
// Không tự kết thúc; quá 2,5 × par thì các món cần lấy phát sáng (và tính thêm 1 lần nhầm = −15).
// Hỗ trợ thao tác: gợi ý sớm hơn (1,5 × par, không phạt), không gợi ý ngay từ đầu.
// Nấu thử (ctx.untimed, ctx.guide): gợi ý ngay từ đầu, không bao giờ tính quá giờ.
// ctx.initial = {picked, mistakes, overtime?} để khôi phục rổ đang chọn dở (overtime: lượt trước đã quá giờ → vẫn phạt,
// món cần lấy phát sáng ngay); handle.snapshot() trả rổ hiện tại {picked, mistakes, overtime?}; ctx.onChange(snapshot) gọi
// sau mỗi lần chạm món trên kệ và lúc vừa quá giờ (vd bếp, gánh hàng quê lưu rổ dở vào save để tải lại trang không thành
// lượt mới, không xóa được lần nhầm hay phạt quá giờ).
// Thiếu nguyên liệu chính: báo chung + khóa 1,5 giây, không cho qua (ctx.missingText đổi câu báo, vd ở gánh hàng quê).
// M4: ctx.stockLeft = {ingId: số phần còn trong kho hàng hiếm} → món trên kệ có nhãn "còn n" (nguyên liệu hiếm).
// 0.4.1: handle.hold(on) giữ đồng hồ đứng yên khi hướng dẫn lần đầu che kệ.
// M5 (Đợt 1): kệ gỗ nhiều tầng — mỗi món là hình TO đứng trên tấm ván, nhãn tên giấy ghim ở mép ván ngay dưới chân món
// (không che hình, tên dài xuống 2 dòng chứ không cắt "…"; không còn ô vuông chữ); chạm thì món nảy và một bản sao bay theo
// đường cong vào rổ tre ở thanh chân (vfx.fly; giảm chuyển động / không có vfx: món hiện thẳng trong rổ). Cỡ hình tự co theo
// chỗ còn lại của khung bếp (to nhất 64–72px, nhỏ nhất 36px) để cả kệ nằm trên thanh "Trong rổ / Xong" không phải cuộn
// (36px vẫn chưa vừa thì bỏ đầu sân khấu; khung quá thấp thì giữ 36px và cuộn khung bếp). Đầu sân khấu buildFrame2 (chấm
// bước, đồng hồ). Nguyên liệu hiếm: viên "còn n" ở góc dưới-trái của hình, dấu ✓ góc trên-phải, ×n góc trên-trái.
// Hợp đồng e2e giữ nguyên: shelf-<id> (.chon-cell, .is-picked, .is-hint, data-ing, aria-pressed), shelf-qty-<id>,
// shelf-left-<id> ("còn N"), chon-basket (.chon-in), chon-count ("Trong rổ: n"), chon-done, .chon-msg, .chon-shelf,
// .mg-chon .mg-foot.
import { h, svgBox } from '../dom.js'
import { requiredIngredients } from '../../core/scoring.js'
import { scoreChon } from '../../core/minigame-scoring.js'
import { createClock, frameLoop, settleOnce, feedback, stepLimitSec, ingName, vfxOf, reducedOf, frameSteps } from './_util.js'
import { buildFrame2 } from './_frame.js'
import { artV2 } from '../art/v2.js'

export const MISSING_MAIN_LOCK_MS = 1500
// Cỡ hình món trên kệ (px): to nhất theo số cột, nhỏ nhất khi khung bếp rất thấp.
export const SHELF_ICON_MAX = Object.freeze({ 3: 72, 4: 64 })
export const SHELF_ICON_MIN = 36
// Lời nhắc trong rổ trống: câu đủ cho rổ rộng, câu ngắn (vừa 2 dòng) cho rổ hẹp / màn thấp (CSS chọn bản hiện).
export const BASKET_HINT = 'Chạm món trên kệ để bỏ vào rổ, chạm lần nữa để lấy ra.'
export const BASKET_HINT_SHORT = 'Chạm để bỏ vào rổ, chạm lại để lấy ra.'

/**
 * Cỡ hình món (px) vừa chỗ (thuần): mỗi tầng kệ cao = hình + phần cố định (đệm, nhãn một dòng dưới chân món); rows tầng phải
 * nằm trong availH px; không rộng hơn cột (colW − 10). Kẹp trong [SHELF_ICON_MIN, max theo số cột].
 */
export function shelfIconSize(availH, rows, colW, cols, fixed = 26) {
  const max = SHELF_ICON_MAX[cols] || SHELF_ICON_MAX[4]
  const byW = Number.isFinite(colW) && colW > 0 ? colW - 10 : max
  const byH = Number.isFinite(availH) && rows > 0 ? availH / rows - fixed : max
  return Math.floor(Math.max(SHELF_ICON_MIN, Math.min(max, byW, byH)))
}

function mount(stage, step, ctx = {}) {
  const recipe = ctx.recipe || {}
  const notes = ctx.notes || []
  const req = requiredIngredients(recipe, notes)
  const shelf = (ctx.shelf && ctx.shelf.length ? ctx.shelf : recipe.shelf) || []
  // Nấu thử (ctx.untimed/ctx.guide): không phạt quá giờ, món cần lấy phát sáng ngay ("tay chỉ")
  const limit = ctx.untimed ? Infinity : stepLimitSec(step.par, false)
  const hintAt = ctx.guide ? 0 : ctx.assist ? 1.5 * Math.max(1, Number(step.par) || 1) : limit
  const clock = createClock()
  const out = settleOnce()
  const vfx = vfxOf(ctx)
  const reduced = reducedOf(ctx)
  const INGS = (ctx.data && ctx.data.INGREDIENTS) || {}
  const artOf = id => artV2((INGS[id] && INGS[id].icon) || id)
  const init = ctx.initial || {}
  const picked = (Array.isArray(init.picked) ? init.picked : []).filter(id => shelf.includes(id))
  let mistakes = Math.max(0, Math.floor(Number(init.mistakes) || 0))
  let lockedUntil = 0
  // đã quá giờ ở lượt trước (về dây phiếu, đổi tab, tải lại trang): vẫn tính phạt, gợi ý luôn (không áp cho nấu thử)
  let overtime = init.overtime === true && Number.isFinite(limit)
  let hinting = overtime

  stage.classList.add('mg-chon')
  const fr = buildFrame2(stage, {
    icon: artV2('ro'), title: step.label || 'Chọn nguyên liệu', sub: '',
    steps: frameSteps(ctx), timeLabel: ctx.untimed ? 'Thong thả' : null, vfx
  })
  // Rổ tre ở thanh chân: lòng rổ (sau), các món đã lấy (cuộn ngang khi đầy), vành rổ (trước, che chân món), nhãn số món.
  const basket = h('div', { class: 'chon-basket', 'data-testid': 'chon-basket', 'aria-label': 'Rổ' })
  const basketEmpty = h('span', { class: 'chon-basket-empty' }, ctx.basketHint ||
    [h('span', { class: 'chon-hint-long' }, BASKET_HINT), h('span', { class: 'chon-hint-short' }, BASKET_HINT_SHORT)])
  basket.appendChild(basketEmpty)
  const countEl = h('span', { class: 'mg-count chon-count', 'data-testid': 'chon-count' })
  const basketWrap = h('div', { class: 'chon-basket-wrap' },
    h('i', { class: 'chon-basket-back', 'aria-hidden': 'true' }), basket, h('i', { class: 'chon-basket-lip', 'aria-hidden': 'true' }), countEl)
  // 9 món → 3 cột × 3 tầng; 12 món → 4 cột × 3 tầng (vừa màn dọc)
  const cols = shelf.length > 9 ? 4 : 3
  const rows = Math.max(1, Math.ceil(shelf.length / cols))
  const grid = h('div', { class: 'chon-shelf', style: { '--cols': cols }, 'data-cols': String(cols), 'data-rows': rows })
  const msg = h('div', { class: 'chon-msg', role: 'status', 'aria-live': 'polite' })
  const doneBtn = h('button', { class: 'g-btn g-btn--go mg-done', type: 'button', 'data-testid': 'chon-done' }, 'Xong')
  fr.area.append(grid)
  fr.foot.append(basketWrap, doneBtn)
  stage.appendChild(msg)

  // Số lượng cần: 1 lần chạm lấy đủ cả phần (vd "Trứng gà ×2" chạm 1 lần). Món đã chọn và rổ hiện huy hiệu ×n để người
  // chơi đối chiếu với thẻ công thức (chạm lần nữa là bỏ ra, không phải lấy thêm). Nguyên liệu không ghi số lượng
  // (kể cả bẫy) chỉ nhân theo số phần của dòng phiếu → huy hiệu không lộ đâu là bẫy.
  const portions = Math.max(1, Math.floor(Number(ctx.qty) || 1))
  const qtyOf = id => {
    const ing = (recipe.ingredients || []).find(x => x.id === id)
    return (ing && ing.qty > 1 ? ing.qty : 1) * portions
  }
  const cells = new Map()
  const items = new Map()
  const left = ctx.stockLeft && typeof ctx.stockLeft === 'object' ? ctx.stockLeft : {}
  for (const id of shelf) {
    const n = qtyOf(id)
    const item = h('span', { class: 'chon-item' }, svgBox(artOf(id), 'chon-icon'),
      h('span', { class: 'chon-check', 'aria-hidden': 'true' }))
    const cell = h('button', {
      class: 'chon-cell', type: 'button', 'data-testid': 'shelf-' + id, 'aria-pressed': 'false',
      dataset: { ing: id, qty: n }, 'aria-label': ingName(id, ctx) + (n > 1 ? ` ×${n}` : '')
    }, item, h('span', { class: 'chon-label', title: ingName(id, ctx) }, ingName(id, ctx)),
    n > 1 ? h('span', { class: 'chon-qty', 'data-testid': 'shelf-qty-' + id, 'aria-hidden': 'true' }, '×' + n) : null,
    left[id] !== undefined ? h('span', { class: 'chon-left', 'data-testid': 'shelf-left-' + id }, 'còn ' + left[id]) : null)
    if (picked.includes(id)) { cell.classList.add('is-picked'); cell.setAttribute('aria-pressed', 'true') }
    cell.addEventListener('click', () => toggle(id))
    cells.set(id, cell)
    items.set(id, item)
    grid.appendChild(cell)
  }

  // Món đang bay vào rổ: món trong rổ ẩn tới khi bản sao bay tới nơi.
  const flying = new Set()
  function renderBasket() {
    countEl.textContent = `Trong rổ: ${picked.length}`
    basket.textContent = ''
    basketWrap.classList.toggle('is-empty', !picked.length)
    if (!picked.length) { basket.appendChild(basketEmpty); return }
    for (const id of picked) {
      const n = qtyOf(id)
      const el = h('span', { class: 'chon-in', title: ingName(id, ctx) + (n > 1 ? ` ×${n}` : ''), dataset: { ing: id } },
        svgBox(artOf(id), 'chon-in-icon'), n > 1 ? h('span', { class: 'chon-in-qty' }, '×' + n) : null)
      if (flying.has(id)) el.style.opacity = '0'
      basket.appendChild(el)
    }
    // rổ đầy hơn bề ngang (8–10 món) cuộn ngang bên trong: luôn thấy món vừa bỏ vào
    basket.scrollLeft = basket.scrollWidth
  }
  const inBasket = id => [...basket.querySelectorAll('.chon-in')].find(e => e.dataset.ing === id) || null

  function renderHints() {
    for (const [id, cell] of cells) {
      const need = req.required.includes(id) && !picked.includes(id)
      cell.classList.toggle('is-hint', hinting && need)
    }
  }

  // Bay vào rổ: nhân bản hình trên kệ rồi bay cong tới chỗ của món trong rổ (350–400 ms). Không có vfx hoặc giảm chuyển
  // động (fly trả false ngay): món hiện thẳng trong rổ.
  function flyIn(id) {
    const from = items.get(id)
    const to = inBasket(id)
    if (!vfx || !from || !to || reduced()) return
    flying.add(id)
    to.style.opacity = '0'
    let p
    try { p = vfx.fly(from.firstChild, to, { node: from.firstChild, ms: 380, arc: 0.4 }) } catch { p = Promise.resolve(false) }
    Promise.resolve(p).then(() => {
      flying.delete(id)
      const el = inBasket(id)
      if (el) el.style.opacity = ''
    })
  }

  function toggle(id) {
    if (out.done || performance.now() < lockedUntil) return
    const cell = cells.get(id)
    const i = picked.indexOf(id)
    if (i >= 0) {
      picked.splice(i, 1)
      flying.delete(id)
      cell.classList.remove('is-picked')
      cell.setAttribute('aria-pressed', 'false')
      feedback(ctx, 'tap')
      renderBasket()
      // món về lại kệ: nảy nhẹ
      if (vfx) { try { vfx.pop(items.get(id)) } catch { /* bỏ qua */ } }
    } else {
      picked.push(id)
      cell.classList.add('is-picked')
      cell.setAttribute('aria-pressed', 'true')
      if (!req.required.includes(id)) mistakes++
      feedback(ctx, 'tap')
      renderBasket()
      // món nảy trên kệ (squash gốc ở đáy) rồi bản sao bay vào rổ
      if (vfx) { try { vfx.squash(items.get(id)) } catch { /* bỏ qua */ } }
      flyIn(id)
    }
    renderHints()
    changed()
  }

  const snapshot = () => (overtime ? { picked: picked.slice(), mistakes, overtime: true } : { picked: picked.slice(), mistakes })
  function changed() {
    if (typeof ctx.onChange === 'function') {
      try { ctx.onChange(snapshot()) } catch (err) { console.error(err) }
    }
  }

  const timers = new Set()
  function lock(ms) {
    lockedUntil = performance.now() + ms
    stage.classList.add('is-locked')
    doneBtn.disabled = true
    const id = setTimeout(() => {
      timers.delete(id)
      if (out.done) return
      stage.classList.remove('is-locked')
      doneBtn.disabled = false
      if (msg.dataset.kind === 'missing') { msg.textContent = ''; delete msg.dataset.kind }
    }, ms)
    timers.add(id)
  }

  doneBtn.addEventListener('click', () => {
    if (out.done || performance.now() < lockedUntil) return
    const missingMain = req.main.filter(id => !picked.includes(id))
    if (missingMain.length) {
      msg.textContent = ctx.missingText || 'Còn thiếu nguyên liệu chính'
      msg.dataset.kind = 'missing'
      feedback(ctx, 'bad', grid)
      if (ctx.assist) { hinting = true; renderHints() }
      lock(MISSING_MAIN_LOCK_MS)
      return
    }
    finish()
  })

  // Cỡ hình món vừa khung bếp: thử từ cỡ lớn nhất (theo bề ngang cột), khung bếp còn phải cuộn thì thu nhỏ dần tới sàn.
  // Ở sàn mà vẫn phải cuộn (thẻ công thức cao, vd món có nguyên liệu hiếm ở 390×844) thì bỏ đầu sân khấu (chấm bước, đồng
  // hồ — như khung ≤ 700px, css/mg-prep.css .is-tight) rồi đo lại: tầng cuối của kệ không nằm khuất sau thanh "Trong rổ /
  // Xong". Khung quá thấp (≤ 600px, thẻ công thức đã chiếm gần hết) thì giữ sàn và cuộn khung bếp.
  // Đo khi rổ đã vẽ (rổ trống có lời nhắc, cao theo lời).
  // Màn khác (vd Gánh hàng quê, cả màn cuộn) dùng cỡ mặc định của CSS. Chỉ đo lại khi khung bếp đổi cỡ (xoay máy, thanh
  // địa chỉ, chế độ tập trung), không đo theo nội dung để món không nhảy chỗ dưới ngón tay.
  const host = typeof stage.closest === 'function' ? stage.closest('.k-main') : null
  let lastIco = 0
  function setIco(px) {
    if (px === lastIco) return
    lastIco = px
    grid.style.setProperty('--ico', px + 'px')
    grid.classList.toggle('is-small', px < 44)
  }
  // Thu cỡ hình tới khi khung bếp hết cuộn (hoặc tới sàn); trả số px còn thừa (> 0: vẫn phải cuộn).
  function fitIcons() {
    const colW = grid.clientWidth / cols
    let ico = shelfIconSize(Infinity, rows, colW, cols)
    setIco(ico)
    for (let i = 0; i < 8 && ico > SHELF_ICON_MIN; i++) {
      const over = host.scrollHeight - host.clientHeight
      if (over <= 0) break
      ico = Math.max(SHELF_ICON_MIN, ico - Math.max(2, Math.ceil(over / rows)))
      setIco(ico)
    }
    return host.scrollHeight - host.clientHeight
  }
  function fitShelf() {
    if (!host || !stage.isConnected || host.clientHeight <= 0 || grid.clientWidth <= 0) return
    stage.classList.remove('is-tight')
    if (fitIcons() > 0) {
      stage.classList.add('is-tight')
      fitIcons()
    }
  }
  renderBasket()
  fitShelf()
  let fitRaf = 0
  const ro = host && typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => {
      if (fitRaf || typeof requestAnimationFrame !== 'function') return
      fitRaf = requestAnimationFrame(() => { fitRaf = 0; if (!out.done) fitShelf() })
    })
    : null
  if (ro) ro.observe(host)

  const loop = frameLoop(() => {
    const t = clock.elapsed()
    fr.setTime(t / limit)
    if (!hinting && t > hintAt) { hinting = true; renderHints() }
    if (!overtime && t > limit) {
      overtime = true
      hinting = true
      renderHints()
      changed()   // lưu ngay: tải lại trang / đổi tab sau khi quá giờ không xóa được phạt
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
    if (ro) ro.disconnect()
    if (fitRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(fitRaf)
    fitRaf = 0
  }

  renderHints()
  return {
    result: out.promise,
    snapshot,
    // hướng dẫn lần đầu (tour) che kệ: đồng hồ bước Chọn đứng yên, không tính quá giờ trong lúc đọc
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

export default { type: 'chon', mount }
