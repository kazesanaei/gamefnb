// Hướng dẫn lần đầu (tour): lớp phủ làm tối nền, khoét sáng đúng phần tử đích, bong bóng lời Dì Sáu (số bước 2/5, nút
// "Tiếp" / "Bỏ qua hướng dẫn"). Dữ liệu tour ở src/data/tours.js, trạng thái đã xem ở src/core/tour.js.
//
// createTourHost(app) → app.tour = {
//   autoAllowed()            tự hiện được không (tắt khi trình duyệt do kiểm thử tự động điều khiển — navigator.webdriver —
//                            trừ khi URL có ?tour=1 trên localhost/127.0.0.1; nút "?" vẫn chạy bình thường)
//   offer(ids) → boolean     thử TỰ hiện ngay (màn ca bán gọi mỗi khung hình theo khâu đang làm)
//   want(ids)                chờ tới lúc hiện được (không có hộp thoại…) rồi tự hiện; app.go gọi cho màn có tour (TOUR_SCREENS)
//   start(ids, opts) → Promise<'done'|'skip'|'stop'|'empty'>   chạy ngay (nút "?": xem lại, không cần chưa xem)
//   stop(), skip(), isActive(), current(), screenTours(), provide(fn), onRoute(name)
//   hold(key, on), isHeld(), onHold(fn)   "giữ" màn ca bán khi tour hoặc bảng Hướng dẫn đang mở (tạm dừng ca, đồng hồ
//                                         bước Chọn đứng yên, phiếu chấm chưa tắt)
//   after(fn)                chạy fn khi tour đóng
// Tour hiện thì chồng thông báo bị ẩn (.is-touring) và thẻ Mẹo nghề được giữ (app.toastHold: đồng hồ thẻ đang nổi dừng,
// thẻ mới chờ) — tour đóng thì thẻ hiện tiếp đủ thời gian.
// 0.5.0: Bếp báo chỗ 'card-<loại>' khi thẻ "Bước k/N" đầy đủ đang chờ chạm; "giữ" màn (hold) làm thẻ dừng tự chạy
// (kitchen.guideHold → card.hold), tour đóng thì thẻ chạy tiếp phần thời gian còn lại. Đích: step-card-demo, step-card-go.
// }
// Lớp phủ gắn vào lớp nổi gốc app.overlay (ngoài mọi vùng cuộn, trên thanh tab — cùng chỗ với bảng chọn món và hộp thoại
// nên iOS Safari không cắt mất). Bong bóng không bao giờ tràn khung (cả 320×568, chừa vùng an toàn); phần tử đích nằm
// ngoài khung nhìn thì tự cuộn vùng cuộn chứa nó; phần tử không có thì bỏ qua bước. Chạm và bàn phím: Tab đi vòng giữa
// hai nút, Enter/Space bấm, → sang bước kế, Esc bỏ qua. Giảm chuyển động: không có hiệu ứng trượt (css/tour.css).
import { h, svgBox } from '../dom.js'
import { DI_SAU } from '../art.js'
import { shouldShowTour, markSeen } from '../../core/tour.js'

export const TOUR_TICK_MS = 250
export const TOUR_MARGIN = 8       // bong bóng cách mép khung
export const HOLE_PAD = 6          // vùng sáng rộng hơn phần tử đích
export const ARROW_GAP = 12        // chỗ cho mũi nhọn giữa bong bóng và vùng sáng

// Điều kiện thêm của một bước (data step.when). Không có tên trong bảng → bước hiện bình thường.
export const TOUR_CONDITIONS = Object.freeze({
  // đang trong ca bán thật (không phải nấu thử)
  inShift: app => !!(app.state && app.state.shift && !app.state.shift.tasting),
  // đã tới ngày có khách chuyển khoản QR
  qrDay: app => !!app.state && app.state.day >= ((app.data.BALANCE && app.data.BALANCE.qrFromDay) || 4)
})

/** Chuỗi target của dữ liệu là bộ chọn CSS (có ký tự ngoài chữ, số, - và _) hay data-testid. */
export function targetSelector(t) {
  return /[^A-Za-z0-9_-]/.test(t) ? t : `[data-testid="${t}"]`
}

// Phần tử đang hiện dần (hiệu ứng độ mờ đang chạy, đích > 0): coi như đang hiện — vd phiếu chấm vừa trượt lên còn trong
// suốt ở khung hình đầu; không thì bước chỉ vào nó bị bỏ mất.
function fadingIn(el) {
  if (typeof el.getAnimations !== 'function') return false
  try {
    return el.getAnimations().some(a => {
      if (a.playState !== 'running' && a.playState !== 'pending') return false
      const kf = a.effect && typeof a.effect.getKeyframes === 'function' ? a.effect.getKeyframes() : []
      const last = kf[kf.length - 1]
      return !!last && last.opacity !== undefined && Number(last.opacity) > 0
    })
  } catch { return false }
}

// Phần tử đang hiện (có khung, không ẩn).
function shown(el) {
  if (!el || !el.isConnected) return false
  const rects = el.getClientRects()
  if (!rects.length) return false
  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) return false
  const cs = getComputedStyle(el)
  return cs.visibility !== 'hidden' && (Number(cs.opacity) !== 0 || fadingIn(el))
}

/** Phần tử đích của một bước: target (chuỗi hoặc mảng lựa chọn) → phần tử đầu tiên đang hiện | null. */
export function resolveTarget(target, root = document) {
  const list = Array.isArray(target) ? target : [target]
  for (const t of list) {
    if (typeof t !== 'string' || !t) continue
    let nodes = []
    try { nodes = root.querySelectorAll(targetSelector(t)) } catch { continue }
    for (const n of nodes) if (!n.closest('.tour-layer') && shown(n)) return n
  }
  return null
}

const rectOf = el => el.getBoundingClientRect()
function union(a, b) {
  if (!b) return { left: a.left, top: a.top, right: a.right, bottom: a.bottom }
  return { left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) }
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Thanh dính (nút đáy panel, đầu màn con…) che mất một phần vùng cuộn: chiều cao phía trên/dưới cần chừa.
// 0.5.0 (M5): thanh chân mặt quầy gỗ của sân khấu kiểu mới vẫn là .mg-foot (.mg-foot.g-foot2, cả bước Chọn); Thớt giữ
// .k-toolbar. Thẻ "Bước k/N" (step-hint) phủ kín khung sân khấu, không cuộn nên không cần chừa; chế độ tập trung chỉ ẩn dải
// khách và thanh 4 khâu (phần tử ẩn thì bước tour chỉ vào nó tự bỏ qua, vd progress-4 lúc đang nấu ở màn thấp).
// 0.5.1 (M5 Đợt 2): mọi hàng nút dính đáy của Quầy mới đều mang lớp .act-bar (position: sticky; bottom: 0): "Đọc lại đơn /
// Chốt order" (.co-pad-actions.act-bar, con cuối của khâu Order), "Đưa tiền thối" (.cs-act), "Từ chối ảnh giả / Đã nhận đủ"
// (.qc-act), "Kẹp phiếu bếp" (.rc-act). Bảng chọn món ở lớp nổi: hàng nút .co-sheet-actions nằm ngoài thân bảng cuộn
// (.co-sheet-body) nên không che đích nào trong thân bảng. Chỉ thanh đang hiện, đang sticky và không chứa đích mới được chừa.
export const STICKY = '.act-bar, .sticky-foot, .k-toolbar, .meta-head, .mg-foot, .prep-toprow, .sum-head-row, .co-pad-actions'
function stickyCover(box, el) {
  let top = 0
  let bottom = 0
  for (const s of box.querySelectorAll(STICKY)) {
    if (s.contains(el) || el.contains(s) || !shown(s)) continue
    const cs = getComputedStyle(s)
    if (cs.position !== 'sticky') continue
    const hgt = s.getBoundingClientRect().height
    if (cs.bottom !== 'auto') bottom = Math.max(bottom, hgt)
    else if (cs.top !== 'auto') top = Math.max(top, hgt)
  }
  return { top, bottom }
}

/** Cuộn các vùng cuộn chứa phần tử (đến hết `stop`) để phần tử (và phần tử cuối dải) lọt khung, chừa thanh dính. */
export function bringIntoView(el, spanEl = null, stop = null) {
  let node = el.parentElement
  while (node && node !== stop && node !== document.body && node !== document.documentElement) {
    const cs = getComputedStyle(node)
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
      const box = node.getBoundingClientRect()
      const cover = stickyCover(node, el)
      const r = union(rectOf(el), spanEl ? rectOf(spanEl) : null)
      const viewTop = box.top + cover.top + 6
      const viewBottom = box.bottom - cover.bottom - 6
      let d = 0
      if (r.bottom > viewBottom) d = r.bottom - viewBottom
      // cao hơn khung nhìn: ưu tiên thấy phần đầu
      if (r.top - d < viewTop) d = r.top - viewTop
      if (Math.abs(d) >= 1) node.scrollTop += d
    }
    node = node.parentElement
  }
}

// Phần nhìn thấy của phần tử: cắt theo mọi tổ tiên có overflow khác visible (panel cuộn, khung app).
function visibleRect(el, spanEl) {
  let r = union(rectOf(el), spanEl ? rectOf(spanEl) : null)
  let node = el.parentElement
  while (node && node !== document.body && node !== document.documentElement) {
    const cs = getComputedStyle(node)
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
      const b = node.getBoundingClientRect()
      r = { left: Math.max(r.left, b.left), top: Math.max(r.top, b.top), right: Math.min(r.right, b.right), bottom: Math.min(r.bottom, b.bottom) }
    }
    node = node.parentElement
  }
  return r.right - r.left >= 1 && r.bottom - r.top >= 1 ? r : null
}

function autoAllowedNow() {
  try {
    if (typeof navigator === 'undefined' || !navigator.webdriver) return true
    const p = new URLSearchParams(location.search)
    return p.get('tour') === '1' && ['localhost', '127.0.0.1'].includes(location.hostname)
  } catch { return true }
}

export function createTourHost(app) {
  const holdKeys = new Set()
  const holdFns = new Set()
  const afterFns = []
  let run = null             // tour đang chạy
  let wish = null            // { ids, screen, timer }
  let provider = null        // màn ca bán: () => [tourId] theo khâu đang làm
  let seq = 0
  const autoOk = autoAllowedNow()
  const TOURS = () => (app.data && app.data.TOURS) || {}

  const root = () => app.root || document
  const stepsOf = ids => {
    const out = []
    for (const id of ids) {
      const t = TOURS()[id]
      if (t) for (const s of t.steps) out.push({ ...s, tourId: id })
    }
    return out
  }
  const whenOk = s => {
    const fn = s.when && TOUR_CONDITIONS[s.when]
    try { return fn ? !!fn(app) : true } catch { return false }
  }
  const stepReady = s => whenOk(s) && (s.target === null || !!resolveTarget(s.target, root()))
  const availableSteps = ids => stepsOf(ids).filter(stepReady)
  const requiresOk = id => {
    const req = TOURS()[id] && TOURS()[id].requires
    return !req || !!resolveTarget(req, root())
  }
  const blocked = () => !app.state || app.locked || (typeof app.modalOpen === 'function' && app.modalOpen()) ||
    (typeof document !== 'undefined' && document.hidden)

  function setHold(key, on) {
    const before = holdKeys.size > 0
    if (on) holdKeys.add(key)
    else holdKeys.delete(key)
    const now = holdKeys.size > 0
    if (before === now) return
    for (const fn of [...holdFns]) { try { fn(now) } catch (err) { console.error(err) } }
  }

  // ---------- chạy một tour (một hoặc nhiều tour nối tiếp) ----------
  function begin(ids0, { auto = false } = {}) {
    // chỉ giữ tour có ít nhất một bước hiện được (tour không có bước nào không bị ghi "đã xem")
    const ids = ids0.filter(id => availableSteps([id]).length > 0)
    const list = availableSteps(ids)
    if (!list.length) return null
    const screen = app.router ? app.router.name : ''
    const total = list.length
    let index = -1
    let el = null
    let spanEl = null
    let closed = false
    let lastKey = ''
    let raf = 0
    let resolveEnd
    const done = new Promise(r => { resolveEnd = r })
    const prevFocus = typeof document !== 'undefined' ? document.activeElement : null

    const hole = h('div', { class: 'tour-hole', testid: 'tour-hole', 'aria-hidden': 'true' })
    const shade = h('div', { class: 'tour-shade', 'aria-hidden': 'true' })
    const count = h('span', { class: 'tour-count', testid: 'tour-count' })
    const titleId = 'tour-title-' + (++seq)
    const title = h('h2', { class: 'tour-title', id: titleId, testid: 'tour-title' })
    const text = h('p', { class: 'tour-text', id: titleId + '-text', testid: 'tour-text' })
    const skipBtn = h('button', { class: 'btn btn-ghost btn-small tour-skip', type: 'button', testid: 'tour-skip', onclick: () => finish('skip') }, 'Bỏ qua hướng dẫn')
    const nextBtn = h('button', { class: 'btn btn-primary btn-small tour-next', type: 'button', testid: 'tour-next', onclick: () => go(index + 1) }, 'Tiếp')
    const arrow = h('span', { class: 'tour-arrow', 'aria-hidden': 'true' })
    const inner = h('div', { class: 'tour-inner' },
      h('div', { class: 'tour-head' }, svgBox(DI_SAU.vui, 'tour-face'), h('div', { class: 'tour-heading' }, count, title)),
      text,
      h('div', { class: 'tour-actions' }, skipBtn, nextBtn))
    const bubble = h('div', {
      class: 'tour-bubble', testid: 'tour-bubble', role: 'dialog', 'aria-modal': 'true',
      'aria-labelledby': titleId, 'aria-describedby': titleId + '-text', dataset: { tour: ids.join(' ') }
    }, arrow, inner)
    const layer = h('div', { class: 'tour-layer', testid: 'tour', dataset: { tour: ids.join(' '), auto: auto ? 'true' : 'false' } }, shade, hole, bubble)
    // chạm vùng tối không làm gì (không lọt xuống game bên dưới)
    layer.addEventListener('click', e => { if (e.target === layer || e.target === shade) e.preventDefault() })
    // Bàn phím (nghe ở cả trang, kể cả khi tiêu điểm lạc ra ngoài bong bóng): Esc bỏ qua, → sang bước kế, Tab đi vòng giữa
    // hai nút; phím khác không lọt xuống game bên dưới (Enter/Space trên nút đang có tiêu điểm của màn chơi).
    function onKey(e) {
      const stop = () => { e.preventDefault(); e.stopPropagation() }
      if (e.key === 'Escape') { stop(); finish('skip'); return }
      if (e.key === 'ArrowRight') { stop(); go(index + 1); return }
      if (e.key === 'Tab') {
        stop()
        const order = [skipBtn, nextBtn]
        const i = order.indexOf(document.activeElement)
        const j = i < 0 ? order.length - 1 : (i + (e.shiftKey ? order.length - 1 : 1)) % order.length
        order[j].focus({ preventScroll: true })
        return
      }
      if (!bubble.contains(e.target)) stop()
    }
    document.addEventListener('keydown', onKey, true)

    function go(i) {
      if (closed) return
      // bước có phần tử đích đã biến mất (vd bếp vẽ lại): bỏ qua, sang bước kế
      let k = i
      while (k < list.length && !stepReady(list[k])) k++
      if (k >= list.length) { finish('done'); return }
      index = k
      const s = list[k]
      el = s.target === null ? null : resolveTarget(s.target, root())
      spanEl = el && s.span ? resolveTarget(s.span, root()) : null
      if (el) bringIntoView(el, spanEl, app.root)
      count.textContent = `${k + 1}/${total}`
      title.textContent = s.title
      text.textContent = s.text
      nextBtn.textContent = k + 1 >= total ? 'Xong' : 'Tiếp'
      bubble.dataset.step = String(k + 1)
      bubble.dataset.target = Array.isArray(s.target) ? s.target.join('|') : (s.target || '')
      bubble.dataset.span = s.span || ''
      layer.dataset.step = String(k + 1)
      lastKey = ''
      place()
      try { nextBtn.focus({ preventScroll: true }) } catch { /* bỏ qua */ }
    }

    // Đặt vùng sáng và bong bóng theo vị trí hiện tại của phần tử đích.
    function place() {
      if (closed) return
      const L = layer.getBoundingClientRect()
      const cs = getComputedStyle(layer)
      const safeTop = parseFloat(cs.paddingTop) || 0
      const safeBottom = parseFloat(cs.paddingBottom) || 0
      const W = L.width
      const H = L.height
      const m = TOUR_MARGIN
      const minY = safeTop + m
      const maxY = H - safeBottom - m
      const bw = Math.min(360, W - 2 * m)
      bubble.style.width = bw + 'px'
      inner.style.maxHeight = Math.max(120, maxY - minY) + 'px'
      const vr = el ? visibleRect(el, spanEl) : null
      const key = vr ? [vr.left, vr.top, vr.right, vr.bottom, W, H].map(v => Math.round(v)).join(',') : 'c' + Math.round(W) + ',' + Math.round(H)
      if (key === lastKey) return
      lastKey = key
      const bh = bubble.offsetHeight
      if (!vr) {
        // bước không có phần tử đích: bong bóng giữa khung, nền tối
        layer.classList.add('is-center')
        hole.hidden = true
        shade.hidden = false
        arrow.hidden = true
        bubble.style.left = Math.round((W - bw) / 2) + 'px'
        bubble.style.top = Math.round(clamp(minY + (maxY - minY - bh) / 2, minY, Math.max(minY, maxY - bh))) + 'px'
        return
      }
      layer.classList.remove('is-center')
      hole.hidden = false
      shade.hidden = true
      const r = {
        left: clamp(vr.left - L.left - HOLE_PAD, 0, W), top: clamp(vr.top - L.top - HOLE_PAD, 0, H),
        right: clamp(vr.right - L.left + HOLE_PAD, 0, W), bottom: clamp(vr.bottom - L.top + HOLE_PAD, 0, H)
      }
      Object.assign(hole.style, { left: r.left + 'px', top: r.top + 'px', width: (r.right - r.left) + 'px', height: (r.bottom - r.top) + 'px' })
      const s = list[index] || {}
      const below = maxY - (r.bottom + ARROW_GAP)
      const above = (r.top - ARROW_GAP) - minY
      let side
      if (s.place === 'top' && above >= bh) side = 'top'
      else if (s.place === 'bottom' && below >= bh) side = 'bottom'
      else if (below >= bh) side = 'bottom'
      else if (above >= bh) side = 'top'
      else side = below >= above ? 'bottom' : 'top'
      let top = side === 'bottom' ? r.bottom + ARROW_GAP : r.top - ARROW_GAP - bh
      // không đủ chỗ cả trên lẫn dưới (phần tử rất cao): bong bóng vẫn nằm trọn trong khung, đè lên một phần vùng sáng
      top = clamp(top, minY, Math.max(minY, maxY - bh))
      const cx = (r.left + r.right) / 2
      const left = clamp(cx - bw / 2, m, Math.max(m, W - m - bw))
      bubble.style.left = Math.round(left) + 'px'
      bubble.style.top = Math.round(top) + 'px'
      const clear = side === 'bottom' ? top >= r.bottom + ARROW_GAP - 1 : top + bh <= r.top - ARROW_GAP + 1
      arrow.hidden = !clear
      arrow.dataset.side = side
      arrow.style.left = Math.round(clamp(cx - left, 20, bw - 20) - 8) + 'px'
      bubble.dataset.side = side
    }

    // Phần tử đích có thể đổi chỗ (vẽ lại, tải hình, xoay máy): kiểm lại định kỳ và khi cuộn/đổi cỡ.
    const tick = setInterval(() => {
      if (closed) return
      if (app.locked || (app.router && app.router.name !== screen)) { finish('stop'); return }
      const s = list[index]
      if (!s) return
      if (s.target !== null && (!el || !shown(el))) {
        const again = resolveTarget(s.target, root())
        if (!again) { go(index + 1); return }
        el = again
        spanEl = s.span ? resolveTarget(s.span, root()) : null
        bringIntoView(el, spanEl, app.root)
      }
      place()
    }, TOUR_TICK_MS)
    const onResize = () => {
      if (closed || raf) return
      raf = requestAnimationFrame(() => { raf = 0; lastKey = ''; place() })
    }
    window.addEventListener('resize', onResize)
    document.addEventListener('scroll', onResize, true)

    function finish(reason) {
      if (closed) return
      closed = true
      clearInterval(tick)
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('scroll', onResize, true)
      document.removeEventListener('keydown', onKey, true)
      layer.remove()
      if (app.root) app.root.classList.remove('is-touring')
      if (typeof app.toastHold === 'function') app.toastHold(false)
      run = null
      // thôi giữ màn trước (ca chạy tiếp) rồi mới ghi "đã xem" và lưu: bản lưu không mang trạng thái tạm dừng
      setHold('tour', false)
      if ((reason === 'done' || reason === 'skip') && app.state) {
        markSeen(app.state, ids)
        if (typeof app.saveNow === 'function') app.saveNow()
      }
      if (prevFocus && prevFocus.isConnected && typeof prevFocus.focus === 'function') {
        try { prevFocus.focus({ preventScroll: true }) } catch { /* bỏ qua */ }
      }
      resolveEnd(reason)
      const fns = afterFns.splice(0)
      for (const fn of fns) { try { fn() } catch (err) { console.error(err) } }
    }

    ;(app.overlay || document.body).appendChild(layer)
    if (app.root) app.root.classList.add('is-touring')
    // thẻ Mẹo nghề đang nổi (thường vừa mở bởi chính thao tác dẫn tới tour này) dừng đồng hồ, hiện tiếp khi tour đóng
    if (typeof app.toastHold === 'function') app.toastHold(true)
    run = { ids: ids.slice(), screen, finish, done, layer }
    setHold('tour', true)
    go(0)
    return run
  }

  // ---------- chờ tới lúc tự hiện được ----------
  function eligible(ids) {
    if (!autoOk || !app.state) return []
    return ids.filter(id => shouldShowTour(app.state, id, app.data) && requiresOk(id) && availableSteps([id]).length > 0)
  }
  function stopWish() {
    if (wish) clearTimeout(wish.timer)
    wish = null
  }
  function pump() {
    if (!wish) return
    wish.timer = 0
    const name = app.router ? app.router.name : ''
    if (name !== wish.screen) { stopWish(); return }
    // mọi tour đã xem hoặc đã tắt tự hiện: thôi chờ
    if (!autoOk || !wish.ids.some(id => shouldShowTour(app.state, id, app.data))) { stopWish(); return }
    if (!run && !holdKeys.size && !blocked()) {
      const ids = eligible(wish.ids)
      if (ids.length && begin(ids, { auto: true })) {
        // tour khác của màn (vd thẻ sự kiện ngày xuất hiện sau) vẫn chờ tiếp
        wish.ids = wish.ids.filter(id => !ids.includes(id))
        if (!wish.ids.length) { stopWish(); return }
      }
    }
    wish.timer = setTimeout(pump, TOUR_TICK_MS * 2)
  }

  const host = {
    autoAllowed: () => autoOk,
    isActive: () => !!run,
    current: () => (run ? run.ids.slice() : []),
    isHeld: () => holdKeys.size > 0,
    hold: (key, on) => setHold(key, on),
    onHold(fn) { holdFns.add(fn); return () => holdFns.delete(fn) },
    after(fn) { if (!run) fn(); else afterFns.push(fn) },
    // Có nên tự hiện tour này lúc này (chưa xem, tự hiện đang bật, không bị kiểm thử tự động tắt)?
    canAuto: id => autoOk && !!app.state && shouldShowTour(app.state, id, app.data),
    offer(ids) {
      const list = Array.isArray(ids) ? ids : [ids]
      if (run || holdKeys.size || !autoOk || blocked()) return false
      const ok = eligible(list)
      return ok.length ? !!begin(ok, { auto: true }) : false
    },
    want(ids) {
      const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean)
      stopWish()
      if (!list.length || !autoOk) return
      wish = { ids: list, screen: app.router ? app.router.name : '', timer: 0 }
      wish.timer = setTimeout(pump, TOUR_TICK_MS)
    },
    // Chạy ngay (nút "?" → Xem lại): không cần chưa xem; xong thì vẫn ghi đã xem.
    start(ids, opts = {}) {
      const list = (Array.isArray(ids) ? ids : [ids]).filter(id => TOURS()[id])
      if (run || !list.length || !app.state || app.locked) return Promise.resolve('empty')
      const r = begin(list, opts)
      return r ? r.done : Promise.resolve('empty')
    },
    stop() { if (run) run.finish('stop') },
    skip() { if (run) run.finish('skip') },
    // Đổi màn: đóng tour của màn cũ, thôi chờ; màn mới có tour (TOUR_SCREENS) thì chờ để tự hiện lần đầu.
    onRoute(name) {
      if (run && run.screen !== name) run.finish('stop')
      stopWish()
      if (name !== 'service') provider = null
      const ids = (app.data.TOUR_SCREENS || {})[name]
      if (ids && ids.length) host.want(ids.slice())
    },
    // Màn ca bán báo tour theo khâu đang làm (nút "?" → Xem lại hướng dẫn màn này).
    provide(fn) { provider = typeof fn === 'function' ? fn : null },
    // Tour của màn hiện tại có ít nhất một bước đang hiện được (cho nút "Xem lại hướng dẫn màn này").
    screenTours() {
      const name = app.router ? app.router.name : ''
      let ids = []
      if (provider) { try { ids = provider() || [] } catch { ids = [] } } else ids = ((app.data.TOUR_SCREENS || {})[name] || []).slice()
      return ids.filter(id => TOURS()[id] && availableSteps([id]).length > 0)
    },
    // Đặt lại "đã xem" xong: màn đang mở hướng dẫn lại ngay (nếu được tự hiện).
    wantScreen() {
      const name = app.router ? app.router.name : ''
      const ids = (app.data.TOUR_SCREENS || {})[name]
      if (ids && ids.length) host.want(ids.slice())
    }
  }
  return host
}
