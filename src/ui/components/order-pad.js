// Phiếu order giấy (M5, màn gọi món): kẹp gỗ trên đầu, giấy kem kẻ dòng có lề đỏ, mép dưới răng cưa. Mỗi dòng: hình
// món 44px, tên, ×n viết tay, chip ghi chú có hình. Dòng mới "viết ra" (chỉ dòng vừa thêm). Hàng nút lớn ở vùng ngón
// cái: "Đọc lại đơn" và "Chốt order".
// Vừa màn (quầy thật): phiếu là phần co giãn của khay Order — giấy kéo dài tới đáy, kẻ dòng trống; dòng nhiều hơn chỗ thì
// danh sách dòng tự cuộn bên trong phiếu (reveal() cuộn đúng vùng đó). Móc bố cục: data-lines (số dòng), .is-dense (≥ 3
// dòng), .is-caught (khách bắt lỗi).
// Hiệu ứng theo SỰ KIỆN:
//   readback(result) — sáng lần lượt từng dòng (120 ms mỗi dòng) rồi đánh ✓ / ✗;
//   stamp({ target }) — NHÂN BẢN phiếu vào lớp hiệu ứng, con dấu "ĐÃ CHỐT" đập xuống (1,8 → 1, xoay −8°, 200 ms, rung
//   khung 2px, âm stamp) rồi phiếu thu nhỏ bay cong 450 ms tới đích (dây phiếu). Bên gọi vẽ lại panel ngay được.
//   Chuỗi chốt tự dọn: trang ẩn, vfx.clear(), đích rời DOM hoặc destroy() đều dừng hẳn (không hạt, không âm, không bay).
// Giữ testid cũ: draft, order-line-<i>, order-line-remove-<i>, (li data-index), caught-list, readback, confirm-order.
// update() với cùng dữ liệu không dựng lại dòng nào, không phát lại hiệu ứng.
// Thuần ở cấp module (import trong Node được).
import { h } from '../dom.js'
import { isReduced } from '../motion.js'
import { dishArt } from './menu-board.js'
import { noteIcon, noteLabel } from './note-icons.js'

// Nhãn lỗi khi khách bắt lỗi lúc đọc lại (trùng quầy cũ).
export const ORDER_ERROR_LABELS = Object.freeze({
  sai_mon: 'Ghi sai món', thieu_mon: 'Ghi thiếu món', thua_mon: 'Khách không gọi món này',
  sai_so_luong: 'Ghi sai số lượng', sai_ghi_chu: 'Sai ghi chú'
})

export const STAMP_TEXT = 'ĐÃ CHỐT'
// Nhịp hiệu ứng (ms): theo mục C.2 nghiên cứu giao diện và bảng 6.4 thiết kế M5.
export const PAD_TIMING = Object.freeze({ readStep: 120, readGlow: 320, stampIn: 200, stampHold: 380, fly: 450, reducedHold: 650 })

/** Mô hình một dòng phiếu: { index, recipeId, name, qty, notes: [{ id, label }], wrong, sig }. */
export function padLine(line, index, recipes, wrongSet = null) {
  const l = line || {}
  const r = recipes && recipes[l.recipeId]
  const notes = (Array.isArray(l.notes) ? l.notes : []).map(id => ({ id: String(id), label: noteLabel(id, r) }))
  const qty = Math.max(1, Math.floor(Number(l.qty) || 1))
  const wrong = !!(wrongSet && wrongSet.has(index))
  const name = r ? r.name : String(l.recipeId || '')
  return { index, recipeId: String(l.recipeId || ''), name, qty, notes, wrong, sig: JSON.stringify([l.recipeId, qty, notes.map(n => n.id), wrong, name]) }
}

/** Câu lỗi khách chỉ ra: "Dòng 2: Ghi sai số lượng", "Ghi thiếu món (trà tắc)". */
export function caughtText(e, recipes, labels = ORDER_ERROR_LABELS) {
  if (!e) return ''
  const at = e.index !== null && e.index !== undefined ? `Dòng ${e.index + 1}: ` : ''
  const miss = e.type === 'thieu_mon' && recipes && recipes[e.expectedRecipeId] ? ` (${recipes[e.expectedRecipeId].name.toLowerCase()})` : ''
  return at + ((labels && labels[e.type]) || ORDER_ERROR_LABELS[e.type] || String(e.type || '')) + miss
}

/** Mô hình phiếu: { lines, empty, caught: [chuỗi], draftSig }. */
export function padModel({ draft = [], recipes = {}, caught = [], errorLabels = null } = {}) {
  const wrong = new Set((caught || []).map(e => e && e.index).filter(i => i !== null && i !== undefined))
  const lines = (draft || []).map((l, i) => padLine(l, i, recipes, wrong))
  return {
    lines,
    empty: !lines.length,
    caught: (caught || []).map(e => caughtText(e, recipes, errorLabels || ORDER_ERROR_LABELS)).filter(Boolean),
    draftSig: JSON.stringify((draft || []).map(l => [l.recipeId, l.qty, l.notes || []]))
  }
}

// Biểu tượng nhỏ trên nút (SVG viền mực).
const ICON_READ = '<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="#3a2618" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">' +
  '<path d="M5 8 C5 5.8 6.8 4 9 4 L23 4 C25.2 4 27 5.8 27 8 L27 17 C27 19.2 25.2 21 23 21 L14 21 L8 27 L9 21 C6.8 21 5 19.2 5 17Z" fill="#fffaf0"/>' +
  '<path d="M10 10 L22 10 M10 15 L18 15" fill="none" stroke-width="2.2"/></g></svg>'
const ICON_STAMP = '<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="#3a2618" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">' +
  '<path d="M11 4 L21 4 L19.5 15 L12.5 15Z" fill="#c98a40"/><path d="M6 16 L26 16 L26 21 L6 21Z" fill="#e8483a"/>' +
  '<path d="M5 25 L27 25" fill="none" stroke="#e8483a" stroke-width="3"/><path d="M13 6.5 L13.6 12" fill="none" stroke="#fff" stroke-width="1.6" opacity=".6"/></g></svg>'

const LABELS = Object.freeze({
  title: 'Phiếu order', empty: 'Chạm món trên bảng để ghi vào phiếu', readback: 'Đọc lại đơn', confirm: 'Chốt order',
  readFirst: 'Đọc lại đơn cho khách nghe trước khi chốt.'
})

// Thuộc tính bố cục / chữ được chép từ kiểu đã tính sang bản sao của phiếu (freezeStyles).
const FREEZE_PROPS = [
  'display', 'position', 'box-sizing', 'top', 'right', 'bottom', 'left', 'width', 'height', 'min-width', 'min-height',
  'max-width', 'max-height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right',
  'padding-bottom', 'padding-left', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-items', 'align-self', 'align-content',
  'justify-content', 'justify-self', 'row-gap', 'column-gap', 'grid-template-columns', 'grid-template-rows',
  'grid-template-areas', 'grid-row-start', 'grid-row-end', 'grid-column-start', 'grid-column-end', 'font-size',
  'line-height', 'letter-spacing', 'font-weight', 'white-space', 'text-align', 'overflow-x', 'overflow-y',
  'background-image', 'background-color', 'color', 'transform', 'opacity', 'z-index', 'clip-path'
]

/** Chép kiểu bố cục đã tính của cây src (phần tử HTML; bỏ ruột SVG) vào cây dst cùng cấu trúc (bản sao). Thuần trình duyệt. */
export function freezeStyles(src, dst) {
  if (typeof getComputedStyle !== 'function') return
  const walk = (a, b) => {
    if (!a || !b || a.nodeType !== 1 || b.nodeType !== 1 || !b.style) return
    let cs = null
    try { cs = getComputedStyle(a) } catch { return }
    if (!cs) return
    for (const p of FREEZE_PROPS) {
      const v = cs.getPropertyValue(p)
      if (v) b.style.setProperty(p, v)
    }
    if (String(a.tagName).toLowerCase() === 'svg') return
    const ak = a.children, bk = b.children
    for (let i = 0; i < ak.length && i < bk.length; i++) walk(ak[i], bk[i])
  }
  walk(src, dst)
}

/**
 * createOrderPad(data, opts) → { el, update(data), destroy(), lineEl(i), artEl(i), paperEl, faceEl, actionsEl, readback(result) → Promise,
 *   stamp({ target, text, keepOnDestroy }) → Promise<boolean>, reveal(i, { smooth }) }
 * destroy() hủy luôn chuỗi chốt đang chạy (trừ chuỗi gọi với keepOnDestroy: true).
 * actionsEl (hàng nút Đọc lại / Chốt) mặc định nằm cuối phiếu; bên gọi nên chuyển nó ra làm con cuối của khâu Order để
 * hàng nút dính đáy vùng cuộn suốt (position: sticky).
 * data: {
 *   draft: [{ recipeId, qty, notes }], recipes, caught: [{ index, type, expectedRecipeId }],
 *   canConfirm (đã đọc lại, phiếu không rỗng), hint (chuỗi nhắc dưới phiếu; '' = ẩn), lastAdded (chỉ số dòng vừa thêm),
 *   sub (dòng phụ cạnh tiêu đề, vd tên khách), face (chuỗi SVG mặt khách nhỏ cạnh tên; '' = ẩn), errorLabels
 * }
 * opts: { onEdit(i), onRemove(i), onReadback(), onConfirm(), vfx, sound, reduced, labels,
 *   topInset() → số px phía trên vùng cuộn đang bị một dải dính đầu che (vd dải lời khách ở quầy thật); reveal() chừa ra }
 */
export function createOrderPad(data = {}, opts = {}) {
  const sound = typeof opts.sound === 'function' ? opts.sound : () => {}
  const vfx = opts.vfx || null
  const reduced = () => (typeof opts.reduced === 'function' ? !!opts.reduced() : opts.reduced === undefined || opts.reduced === null ? isReduced() : !!opts.reduced)
  const L = { ...LABELS, ...(opts.labels || {}) }
  let cur = {}
  let model = null
  let destroyed = false
  const timers = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!destroyed) fn() }, ms); timers.add(id); return id }
  const wait = ms => new Promise(r => later(r, ms))

  const sub = h('span', { class: 'co-pad-sub' })
  // mặt khách nhỏ cạnh tên (data.face: chuỗi SVG): khi đọc lại, khách gật / đổi mặt ngay bên các dòng phiếu
  const face = h('span', { class: 'co-pad-face', 'aria-hidden': 'true', hidden: true })
  let faceSig = ''
  const list = h('ol', { class: 'co-pad-lines', testid: 'draft' })
  const empty = h('p', { class: 'co-pad-empty' }, h('span', { class: 'co-pad-empty-ico', 'aria-hidden': 'true' }, '✎'), L.empty)
  const caughtBox = h('div', { class: 'co-pad-caught-wrap' })
  const paper = h('div', { class: 'co-pad-paper g-paper g-paper--torn' },
    h('div', { class: 'co-pad-head' }, h('b', { class: 'co-pad-title' }, L.title), h('span', { class: 'co-pad-who' }, face, sub)),
    list, empty, caughtBox)
  const hint = h('p', { class: 'co-pad-hint' })
  const readBtn = h('button', { class: 'co-pad-read g-btn', type: 'button', testid: 'readback', html: ICON_READ, onclick: () => { if (typeof opts.onReadback === 'function') opts.onReadback() } })
  readBtn.appendChild(h('span', null, L.readback))
  const okBtn = h('button', { class: 'co-pad-ok g-btn g-btn--go', type: 'button', testid: 'confirm-order', html: ICON_STAMP, onclick: () => { if (typeof opts.onConfirm === 'function') opts.onConfirm() } })
  okBtn.appendChild(h('span', null, L.confirm))
  const actions = h('div', { class: 'co-pad-actions' }, readBtn, okBtn)
  const el = h('section', { class: 'co-pad', 'aria-label': L.title },
    h('div', { class: 'co-pad-clipboard' },
      h('div', { class: 'co-pad-board', 'aria-hidden': 'true' }),
      h('div', { class: 'co-pad-clip', 'aria-hidden': 'true' }, h('span', { class: 'co-pad-ring' })),
      paper),
    hint, actions)

  const rows = []        // [{ sig, li, main, art }]
  let checks = null      // { sig, bad: Set } — dấu ✓/✗ sau khi đọc lại, giữ tới khi phiếu đổi
  let caughtSig = ''
  // Lượt đọc lại đang sáng: readRun tăng mỗi lượt, readSig = phiếu (draftSig) của lượt đó (null: không đọc). Lượt bị lượt
  // mới thay hoặc phiếu đổi giữa lượt (bỏ / sửa dòng) thì im: không sáng tiếp, không đánh ✓/✗ cũ lên phiếu mới.
  let readRun = 0
  let readSig = null

  // Nút "Đọc lại đơn" trong lúc đang sáng lượt đọc của chính phiếu này: mờ đi + aria-busy (bấm lặp không có tác dụng).
  function setBusy(on) {
    readBtn.classList.toggle('is-busy', !!on)
    if (on) readBtn.setAttribute('aria-busy', 'true')
    else readBtn.removeAttribute('aria-busy')
  }
  function stopReading() {
    readSig = null
    setBusy(false)
    for (const r of rows) r.li.classList.remove('is-reading')
  }

  function row(line) {
    const art = h('span', { class: 'co-line-art' }, dishArt((cur.recipes || {})[line.recipeId] || { id: line.recipeId }))
    const notes = line.notes.length
      ? h('span', { class: 'co-line-notes' }, line.notes.map(n => h('span', { class: 'co-line-note' },
        noteIcon(n.id, { label: n.label, decorative: true }), h('span', { class: 'co-line-note-text' }, n.label))))
      : null
    const main = h('button', {
      class: 'co-line-main', type: 'button', testid: 'order-line-' + line.index,
      'aria-label': `Dòng ${line.index + 1}: ${line.qty} ${line.name}` + (line.notes.length ? ', ' + line.notes.map(n => n.label).join(', ') : '') + '. Chạm để sửa',
      onclick: () => { if (typeof opts.onEdit === 'function') opts.onEdit(line.index) }
    }, art, h('span', { class: 'co-line-name' }, line.name), h('span', { class: 'co-line-qty' }, '×' + line.qty), notes)
    const del = h('button', {
      class: 'co-line-del', type: 'button', testid: 'order-line-remove-' + line.index, 'aria-label': 'Xóa dòng ' + (line.index + 1),
      onclick: () => { if (typeof opts.onRemove === 'function') opts.onRemove(line.index) }
    }, '✕')
    const li = h('li', { class: ['co-line', line.wrong ? 'is-wrong' : ''], dataset: { index: line.index } },
      h('span', { class: 'co-line-check', 'aria-hidden': 'true' }), main, del)
    return { sig: line.sig, li, main, art }
  }

  function paintChecks() {
    const on = checks && model && checks.sig === model.draftSig
    rows.forEach((r, i) => {
      const mark = on ? (checks.bad.has(i) ? 'bad' : 'ok') : ''
      if ((r.li.dataset.check || '') !== mark) {
        if (mark) r.li.dataset.check = mark
        else delete r.li.dataset.check
        r.li.querySelector('.co-line-check').textContent = mark === 'ok' ? '✓' : mark === 'bad' ? '✗' : ''
      }
    })
  }

  function update(d = {}) {
    if (destroyed) return
    cur = { ...cur, ...d }
    model = padModel({ draft: cur.draft, recipes: cur.recipes, caught: cur.caught, errorLabels: cur.errorLabels })
    // chỉ lần update mang lastAdded mới "viết ra" dòng đó (không giữ lại cho các lần vẽ sau)
    const added = Number.isInteger(d.lastAdded) ? d.lastAdded : -1
    // dòng: giữ nút cũ nếu nội dung không đổi (không phát lại hiệu ứng); dòng mới / đổi thì dựng lại
    model.lines.forEach((line, i) => {
      const old = rows[i]
      if (old && old.sig === line.sig) return
      const r = row(line)
      if (old) old.li.replaceWith(r.li)
      else list.appendChild(r.li)
      rows[i] = r
      if (i === added && !reduced()) {
        // gỡ lớp sau khi mọi hoạt ảnh con xong (≈ 0,72 s); không dựa vào animationend vì ::after cũng phát sự kiện
        r.li.classList.add('is-new')
        later(() => r.li.classList.remove('is-new'), 900)
      }
    })
    while (rows.length > model.lines.length) rows.pop().li.remove()
    // móc bố cục (css/counter.css, vừa màn): số dòng, phiếu dày (≥ 3 dòng: dòng gọn, ghi chú chỉ còn biểu tượng), có lỗi
    const nLines = String(model.lines.length)
    if (el.dataset.lines !== nLines) el.dataset.lines = nLines
    el.classList.toggle('is-dense', model.lines.length >= 3)
    el.classList.toggle('is-caught', model.caught.length > 0)
    empty.hidden = !model.empty
    list.hidden = model.empty
    sub.textContent = cur.sub || ''
    sub.hidden = !cur.sub
    const fs = typeof cur.face === 'string' ? cur.face : ''
    if (fs !== faceSig) { faceSig = fs; face.innerHTML = fs; face.hidden = !fs }
    // lỗi khách bắt
    const cs = JSON.stringify(model.caught)
    if (cs !== caughtSig) {
      caughtSig = cs
      caughtBox.textContent = ''
      if (model.caught.length) {
        caughtBox.appendChild(h('ul', { class: 'co-caught', testid: 'caught-list' },
          model.caught.map(t => h('li', null, h('span', { class: 'co-caught-x', 'aria-hidden': 'true' }, '✗'), t))))
      }
    }
    if (checks && checks.sig !== model.draftSig) checks = null
    // phiếu đổi giữa lượt đọc lại: hủy lượt đó (nút đọc lại dùng được ngay cho phiếu mới)
    if (readSig !== null && readSig !== model.draftSig) stopReading()
    paintChecks()
    // nút
    readBtn.disabled = model.empty
    // phiếu trống: hàng nút gọn lại (css) để màn thấp còn chỗ cho thẻ món
    actions.classList.toggle('is-idle', model.empty)
    okBtn.disabled = !cur.canConfirm || model.empty
    okBtn.title = okBtn.disabled ? L.readFirst : ''
    okBtn.classList.toggle('g-btn--shine', !okBtn.disabled)
    hint.textContent = cur.hint || ''
    hint.hidden = !cur.hint
  }

  // Các vùng cuộn thật đang chứa node, từ trong ra ngoài: danh sách dòng của phiếu (phiếu dài hơn chỗ của khay — vừa màn),
  // rồi khay / panel Quầy.
  function scrollers(node) {
    const out = []
    for (let p = node.parentElement; p; p = p.parentElement) {
      const cs = typeof getComputedStyle === 'function' ? getComputedStyle(p) : null
      if (cs && /(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) out.push(p)
    }
    return out
  }

  /**
   * Cuộn các vùng chứa để dòng i (mặc định dòng cuối; không có dòng thì tờ phiếu) nằm trọn trong phần nhìn thấy: trong danh
   * sách dòng của phiếu, rồi trong khay phía trên hàng nút dính đáy (chỉ khi hàng nút đang dính — cột nút bên phải phiếu không
   * che dòng nào). smooth: cuộn mượt (bỏ qua khi giảm chuyển động). Gọi trước khi cho món bay vào dòng mới (cần vị trí cuối,
   * không mượt).
   */
  function reveal(i = null, { smooth = false } = {}) {
    if (destroyed) return
    const idx = Number.isInteger(i) ? i : rows.length - 1
    const node = rows[idx] ? rows[idx].li : paper
    if (!node.isConnected || typeof node.getBoundingClientRect !== 'function') return
    // mép trên dùng được: chừa dải dính đầu vùng cuộn (nếu bên gọi báo)
    const inset = typeof opts.topInset === 'function' ? Math.max(0, Number(opts.topInset()) || 0) : 0
    const stickyBar = actions.isConnected && typeof getComputedStyle === 'function' && getComputedStyle(actions).position === 'sticky'
    for (const sc of scrollers(node)) {
      if (typeof sc.getBoundingClientRect !== 'function') continue
      const box = sc.getBoundingClientRect()
      const bar = stickyBar && sc.contains(actions) ? actions.getBoundingClientRect() : null
      const limit = bar && bar.height && bar.top < box.bottom ? Math.min(bar.top, box.bottom) : box.bottom
      const edge = box.top + (sc === list ? 0 : inset)
      const pad = sc === list ? 2 : 6
      const r = node.getBoundingClientRect()
      let delta = r.bottom - (limit - pad)
      // không đẩy đầu dòng (hoặc đầu phiếu khi chưa có dòng) lên khuất mép trên vùng cuộn
      if (delta > 0) delta = Math.min(delta, Math.max(0, r.top - edge - pad))
      else if (r.top < edge + pad) delta = r.top - edge - pad
      else continue
      if (!delta) continue
      const top = sc.scrollTop + delta
      if (smooth && !reduced() && typeof sc.scrollTo === 'function') sc.scrollTo({ top, behavior: 'smooth' })
      else sc.scrollTop = top
    }
  }

  /**
   * Đọc lại: sáng lần lượt từng dòng (PAD_TIMING.readStep ms) rồi đánh ✓ (đúng) / ✗ (dòng khách bắt lỗi).
   * result: { caught: [{ index }] } | [chỉ số dòng sai]. Giảm chuyển động: sáng cùng lúc, chỉ đổi độ mờ.
   * Trong lượt: nút "Đọc lại đơn" có lớp is-busy + aria-busy. Gọi lại giữa lượt (hoặc phiếu đổi giữa lượt) thì lượt cũ dừng
   * và Promise của nó vẫn xong nhưng không đánh dấu gì.
   */
  function readback(result = {}) {
    if (destroyed || !model || model.empty) return Promise.resolve()
    const list0 = Array.isArray(result) ? result : (result && result.caught) || []
    const bad = new Set(list0.map(e => (typeof e === 'number' ? e : e && e.index)).filter(i => Number.isInteger(i)))
    const n = rows.length
    const red = reduced()
    const step = red ? 0 : PAD_TIMING.readStep
    const run = ++readRun
    const sig = model.draftSig
    const live = () => !destroyed && run === readRun && readSig === sig
    readSig = sig
    setBusy(true)
    checks = null
    paintChecks()
    reveal(null, { smooth: true })
    rows.forEach((r, i) => {
      later(() => {
        if (!live()) return
        r.li.classList.remove('is-reading')
        void r.li.offsetWidth
        r.li.classList.add('is-reading')
        sound('tick')
      }, i * step)
    })
    const total = (n - 1) * step + PAD_TIMING.readGlow
    return wait(total).then(() => {
      if (!live()) return
      stopReading()
      checks = { sig, bad }
      paintChecks()
      if (!red && vfx) rows.forEach(r => { const c = r.li.querySelector('.co-line-check'); if (c) vfx.pop(c) })
    })
  }

  // Bản sao tĩnh của giấy phiếu, đặt đúng chỗ trong lớp hiệu ứng (để panel vẽ lại tự do bên dưới). Kiểu của phiếu phụ thuộc
  // ngữ cảnh (khay Order theo bậc của màn — css/counter.css): ở lớp hiệu ứng bản sao mất ngữ cảnh đó, nên "đóng băng" kiểu
  // bố cục đã tính của từng nút vào bản sao (freezeStyles) — bản sao (và bản bay nhân bản từ nó) giống hệt phiếu đang thấy.
  function ghostOf(layer) {
    const rect = paper.getBoundingClientRect()
    if (!layer || !rect.width || !rect.height) return null
    if (layer.childElementCount >= 30) return null
    const Lr = layer.getBoundingClientRect()
    const g = paper.cloneNode(true)
    freezeStyles(paper, g)
    g.removeAttribute('data-testid')
    for (const n of g.querySelectorAll('[data-testid],[id]')) { n.removeAttribute('data-testid'); n.removeAttribute('id') }
    g.classList.add('co-pad-ghost')
    g.style.position = 'absolute'
    g.style.left = `${rect.left - Lr.left}px`
    g.style.top = `${rect.top - Lr.top}px`
    g.style.width = `${rect.width}px`
    g.style.height = `${rect.height}px`
    g.style.margin = '0'
    layer.appendChild(g)
    return g
  }

  // Chuỗi chốt đang chạy (mỗi lần stamp() một mục): { keep, abort() }. destroy() hủy các chuỗi không giữ.
  const jobs = new Set()

  // Phần tử còn trong DOM và có kích thước (đích hợp lệ cho hạt / bay; phần tử rời DOM đo ra (0,0) ở góc màn).
  const onScreen = n => {
    if (!n || !n.isConnected || typeof n.getBoundingClientRect !== 'function') return false
    const r = n.getBoundingClientRect()
    return r.width > 0 || r.height > 0
  }
  // Đích bay: phần tử thì phải còn trên màn; hình chữ nhật / điểm { x, y } thì nhận luôn.
  const targetOk = t => !!t && (typeof t.getBoundingClientRect === 'function' ? onScreen(t) : true)

  /**
   * Chốt order: nhân bản phiếu → con dấu ĐÃ CHỐT đập xuống → rung khung 2px → phiếu bay cong tới target.
   * Gọi TRƯỚC khi bên gọi đổi trạng thái / vẽ lại panel. Trả Promise<boolean> (true nếu có bay tới đích).
   * Giảm chuyển động: dấu hiện bằng độ mờ, giữ một nhịp rồi mờ đi, không bay.
   * Tự dọn: chuỗi dừng (gỡ bản sao, không hạt, không âm, Promise → false) khi trang ẩn, khi vfx.clear() đã gom bản sao
   * (đổi thẻ / rời màn), khi đích rời DOM, hoặc khi destroy() phiếu. keepOnDestroy: true cho chuỗi sống qua destroy()
   * (bên gọi dựng lại cả panel ngay sau khi chốt) — các điều kiện dừng còn lại vẫn áp dụng.
   */
  function stamp({ target = null, text = STAMP_TEXT, keepOnDestroy = false } = {}) {
    if (destroyed) return Promise.resolve(false)
    const red = reduced()
    let layer = null
    try { layer = vfx ? vfx.layer : null } catch { layer = null }
    const ghost = ghostOf(layer)
    const host = ghost || paper
    const mark = h('div', { class: 'co-stamp', 'aria-hidden': 'true' }, h('span', null, text))
    host.appendChild(mark)
    sound('stamp')
    const doc = el.ownerDocument || null
    // bản sao còn là của phiếu: vẫn nằm trong lớp hiệu ứng và chưa bị vfx.clear() gom vào pool / cấp cho hiệu ứng khác
    const ghostOk = () => !ghost || (!!layer && ghost.parentNode === layer && ghost.classList.contains('co-pad-ghost'))
    const pageHidden = () => !!doc && doc.visibilityState === 'hidden'
    return new Promise(resolve => {
      const job = { keep: !!keepOnDestroy, done: false, ids: new Set(), flyEl: null, abort: null }
      const alive = () => !job.done && (!destroyed || job.keep) && ghostOk() && mark.isConnected && !pageHidden()
      const onVis = () => { if (pageHidden()) job.abort() }
      const finish = ok => {
        if (job.done) return
        job.done = true
        jobs.delete(job)
        for (const id of job.ids) clearTimeout(id)
        job.ids.clear()
        if (doc && typeof doc.removeEventListener === 'function') doc.removeEventListener('visibilitychange', onVis)
        // chỉ gỡ bản sao khi nó còn là của phiếu; nút đã về pool của vfx thì để vfx quản
        if (ghost) { if (ghostOk()) ghost.remove() } else mark.remove()
        resolve(ok)
      }
      job.abort = () => {
        // đang bay: hủy hoạt ảnh của nút bay (vfx tự trả nút về pool khi hoạt ảnh bị hủy)
        const f = job.flyEl
        job.flyEl = null
        if (f && layer && f.parentNode === layer && f.classList.contains('vfx-fly') && typeof f.getAnimations === 'function') {
          try { for (const a of f.getAnimations()) a.cancel() } catch { /* bỏ qua */ }
        }
        finish(false)
      }
      // hẹn giờ riêng của chuỗi: tới nhịp mà điều kiện không còn (rời màn, trang ẩn…) thì dừng hẳn
      const step = (fn, ms) => {
        const id = setTimeout(() => {
          job.ids.delete(id)
          if (job.done) return
          if (!alive()) { job.abort(); return }
          fn()
        }, ms)
        job.ids.add(id)
      }
      jobs.add(job)
      if (doc && typeof doc.addEventListener === 'function') doc.addEventListener('visibilitychange', onVis)

      if (red || typeof mark.animate !== 'function') {
        if (typeof mark.animate === 'function') mark.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear' })
        step(() => {
          if (ghost && typeof ghost.animate === 'function') {
            const a = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' })
            a.onfinish = () => finish(false)
            step(() => finish(false), 400)
          } else finish(false)
        }, PAD_TIMING.reducedHold)
        return
      }
      mark.animate([
        { transform: 'translate(-50%, -50%) rotate(-8deg) scale(1.8)', opacity: 0 },
        { transform: 'translate(-50%, -50%) rotate(-8deg) scale(1.8)', opacity: 0.9, offset: 0.15 },
        { transform: 'translate(-50%, -50%) rotate(-8deg) scale(1)', opacity: 1 }
      ], { duration: PAD_TIMING.stampIn, easing: 'cubic-bezier(.55, 0, .9, .45)' })
      step(() => {
        if (vfx && onScreen(mark)) {
          vfx.shake(host, 1)
          vfx.burst(mark, 'star', { n: 6 })
        }
      }, PAD_TIMING.stampIn)
      step(() => {
        if (!ghost || !vfx || !targetOk(target) || !onScreen(ghost)) { finish(false); return }
        sound('whoosh')
        const before = layer.lastElementChild
        const flight = vfx.fly(ghost, target, { node: ghost, ms: PAD_TIMING.fly, arc: 0.35 })
        const last = layer.lastElementChild
        if (last && last !== before && last.classList.contains('vfx-fly')) job.flyEl = last
        // bản bay đã được nhân bản xong (đồng bộ) trong vfx.fly → gỡ bản sao tĩnh ngay
        if (ghostOk()) ghost.remove()
        flight.then(ok => { job.flyEl = null; finish(!!ok) }, () => { job.flyEl = null; finish(false) })
      }, PAD_TIMING.stampIn + PAD_TIMING.stampHold)
    })
  }

  update(data)

  return {
    el,
    paperEl: paper,
    faceEl: face,
    actionsEl: actions,
    update,
    readback,
    stamp,
    reveal,
    lineEl: i => (rows[i] ? rows[i].li : null),
    artEl: i => (rows[i] ? rows[i].art : null),
    destroy() {
      if (destroyed) return
      destroyed = true
      for (const j of [...jobs]) if (!j.keep) j.abort()
      for (const id of timers) clearTimeout(id)
      timers.clear()
      el.remove()
    }
  }
}
