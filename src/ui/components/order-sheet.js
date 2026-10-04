// Bảng chọn số lượng + ghi chú (M5, màn gọi món): trượt lên từ đáy như bảng cũ (renderSheet), nhưng món TO đặt trên
// thớt gỗ ở giữa, nhân bản hình theo số phần, nút −/+ tròn kiểu bánh kẹo, chip ghi chú có hình (note-icons.js), hàng
// nút dính đáy (chừa vùng an toàn) gồm "Thêm vào phiếu" và "Bỏ dòng" (khi sửa dòng).
// Giữ testid cũ: order-sheet, sheet-close, qty-row, qty-minus, qty-value (CHỈ chứa con số), qty-plus, note-block,
// note-chip-<id> (aria-pressed), add-line, remove-line.
// Dải "Khách nói" (data.heard, tùy chọn) ở đầu bảng: bảng che bong bóng của khách nên lời khách được nhắc lại ngay trên
// bảng — kiểu 'text' ghi nguyên văn, kiểu 'icons' hiện hình món, ×n và ghi chú bằng hình kèm câu gọi món. Lời gọi món dài
// (kiểu 'text' quá 4 dòng): fit() cho hiện TRỌN khi bảng còn chỗ (thân bảng không phải cuộn — khung chính); hết chỗ (khung
// nhỏ) thì kẹp 4 dòng "…" và cả dải thành nút "chạm để xem đủ" (dấu ⌄, chạm lần nữa thu lại).
// Bảng tự giữ số lượng / ghi chú đang chọn và báo ra ngoài qua onChange; update(data) đồng bộ lại khi bên gọi vẽ lại
// (cùng dữ liệu thì không đổi gì, không phát lại hiệu ứng). Hiệu ứng chỉ theo thao tác: phần mới nảy vào, chip bật nảy.
// Thuần ở cấp module (import trong Node được).
import { h } from '../dom.js'
import { formatVND } from '../format.js'
import { unitPriceOf } from '../../core/order.js'
import { isReduced } from '../motion.js'
import { dishArt } from './menu-board.js'
import { noteIcon, noteTone } from './note-icons.js'

export const QTY_MAX = 3

/** Kẹp số phần trong [1, max]. */
export function clampQty(q, max = QTY_MAX) {
  const m = Math.max(1, Math.floor(Number(max) || 1))
  return Math.max(1, Math.min(m, Math.floor(Number(q) || 1)))
}

/** Bật / tắt một ghi chú; ghi chú cùng nhóm (group) loại trừ nhau. Trả mảng mới, không sửa mảng cũ. */
export function toggleNoteIds(recipe, ids, noteId) {
  const notes = (recipe && recipe.notes) || []
  const cur = Array.isArray(ids) ? ids.slice() : []
  if (cur.includes(noteId)) return cur.filter(x => x !== noteId)
  const n = notes.find(x => x.id === noteId)
  if (!n) return cur
  const out = n.group ? cur.filter(x => { const o = notes.find(m => m.id === x); return !o || o.group !== n.group }) : cur
  out.push(noteId)
  return out
}

/**
 * Mô hình thuần của bảng: { recipeId, name, qty, qtyMax, unit, total, editing, canMinus, canPlus, rareMax,
 *   notes: [{ id, label, surcharge, group, on, tone }] }.
 * qtyMax: trần số phần (mặc định 3); rareMax: số phần hiếm còn ghi được (null nếu món thường), trần = min(qtyMax, rareMax).
 */
export function sheetModel({ recipe, qty = 1, notes = [], editIndex = null, qtyMax = QTY_MAX, rareMax = null } = {}) {
  const r = recipe || {}
  const cap = Math.min(Math.max(1, Math.floor(Number(qtyMax) || QTY_MAX)), rareMax !== null && rareMax !== undefined ? Math.max(1, Math.floor(Number(rareMax) || 1)) : Infinity)
  const q = clampQty(qty, cap)
  const on = new Set(Array.isArray(notes) ? notes : [])
  const unit = unitPriceOf(r, [...on])
  return {
    recipeId: r.id || '',
    name: r.name || '',
    qty: q,
    qtyMax: cap,
    unit,
    total: unit * q,
    editing: editIndex !== null && editIndex !== undefined,
    canMinus: q > 1,
    canPlus: q < cap,
    rareMax: rareMax !== null && rareMax !== undefined ? Math.max(0, Math.floor(Number(rareMax) || 0)) : null,
    notes: (r.notes || []).map(n => ({ id: n.id, label: n.label, surcharge: Number(n.surcharge) || 0, group: n.group || null, on: on.has(n.id), tone: noteTone(n.id) }))
  }
}

const LABELS = Object.freeze({ add: 'Thêm vào phiếu', update: 'Sửa dòng', remove: 'Bỏ dòng', qty: 'Số lượng', notes: 'Ghi chú', close: 'Đóng', heard: 'Khách nói' })

/** Dữ liệu dải "Khách nói" gọn để vẽ: null nếu không có gì để nhắc. Thuần. */
export function heardModel(heard) {
  if (!heard || typeof heard !== 'object') return null
  const mode = heard.mode === 'icons' ? 'icons' : 'text'
  const text = String(heard.text || '').replace(/\s+/g, ' ').trim()
  const lines = mode === 'icons' && Array.isArray(heard.lines)
    ? heard.lines.filter(l => l && l.recipeId).map(l => ({ recipeId: String(l.recipeId), qty: Math.max(1, Math.floor(Number(l.qty) || 1)), notes: Array.isArray(l.notes) ? l.notes.map(String) : [] }))
    : []
  if (!text && !lines.length) return null
  return { mode, text, lines }
}

/**
 * createOrderSheet(data, opts) → { el, sheetEl, update(data), fit(force), destroy(), leave() → Promise, heroEl(), state() }
 * data: { recipe, qty, notes, editIndex, qtyMax, rareMax,
 *   heard: { mode: 'icons' | 'text', text (lời khách), lines: [{ recipeId, qty, notes }] (kiểu 'icons'), recipes } (tùy chọn) }
 * opts: {
 *   onChange({ qty, notes }), onSubmit({ recipeId, qty, notes }, { from: phần tử hình món để bay }),
 *   onRemove(), onClose(), vfx, sound, reduced, labels: { add, update, remove, qty, notes, close, heard }
 * }
 * el là lớp phủ (co-sheet-layer, chạm nền tối = đóng); gắn vào lớp nổi gốc của app (app.overlay), không gắn trong
 * vùng cuộn (iOS cắt lớp phủ theo khung vùng cuộn).
 */
export function createOrderSheet(data = {}, opts = {}) {
  const sound = typeof opts.sound === 'function' ? opts.sound : () => {}
  const vfx = opts.vfx || null
  const reduced = () => (typeof opts.reduced === 'function' ? !!opts.reduced() : opts.reduced === undefined || opts.reduced === null ? isReduced() : !!opts.reduced)
  const L = { ...LABELS, ...(opts.labels || {}) }
  let cur = { ...data }
  let st = { qty: 1, notes: [] }
  let model = null
  let destroyed = false
  let leaving = null

  const title = h('h3', { class: 'co-sheet-title' })
  const unitEl = h('span', { class: 'co-sheet-unit' })
  const close = h('button', { class: 'co-sheet-close g-btn g-btn--round g-btn--small g-btn--ghost', type: 'button', testid: 'sheet-close', 'aria-label': L.close, onclick: () => doClose() }, '✕')
  const plate = h('div', { class: 'co-sheet-plate', 'aria-hidden': 'true' })
  const xBadge = h('span', { class: 'co-sheet-x', 'aria-hidden': 'true' })
  const minus = h('button', { class: 'co-qty-btn g-btn g-btn--round', type: 'button', testid: 'qty-minus', 'aria-label': 'Bớt một phần', onclick: () => setQty(st.qty - 1, true) }, '−')
  const plus = h('button', { class: 'co-qty-btn g-btn g-btn--round g-btn--go', type: 'button', testid: 'qty-plus', 'aria-label': 'Thêm một phần', onclick: () => setQty(st.qty + 1, true) }, '+')
  const value = h('b', { class: 'co-qty-value', testid: 'qty-value', 'aria-live': 'polite' })
  const rareNote = h('small', { class: 'co-qty-rare' })
  const qtyRow = h('div', { class: 'co-qty', testid: 'qty-row', role: 'group', 'aria-label': L.qty },
    h('span', { class: 'co-qty-label' }, L.qty),
    h('div', { class: 'co-qty-ctrl' }, minus, h('span', { class: 'co-qty-box' }, h('span', { class: 'co-qty-x', 'aria-hidden': 'true' }, '×'), value), plus),
    rareNote)
  const stage = h('div', { class: 'co-sheet-stage g-wood g-wood--flat' }, h('div', { class: 'co-sheet-hero' }, plate, xBadge), qtyRow)
  const chips = h('div', { class: 'co-notes-grid' })
  const noteBlock = h('div', { class: 'co-notes', testid: 'note-block' }, h('div', { class: 'co-notes-title' }, L.notes), chips)
  const bodyEl = h('div', { class: 'co-sheet-body' }, stage, noteBlock)
  const actions = h('div', { class: 'co-sheet-actions' })
  const heardEl = h('div', { class: 'co-heard', role: 'note', hidden: true })
  // dấu "còn chữ" của dải Khách nói bị kẹp (chỉ hiện khi is-clamped; mở rồi thì lật lên)
  const heardMore = h('span', { class: 'co-heard-more', 'aria-hidden': 'true' }, '⌄')
  const sheet = h('div', { class: 'co-sheet', testid: 'order-sheet', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'co-sheet-grip', 'aria-hidden': 'true' }),
    heardEl,
    h('div', { class: 'co-sheet-head' }, h('div', { class: 'co-sheet-headtext' }, title, unitEl), close),
    bodyEl, actions)
  const el = h('div', { class: 'co-sheet-layer is-enter', onclick: e => { if (e.target === e.currentTarget) doClose() } }, sheet)
  // hiệu ứng trượt lên chỉ chạy một lần lúc mở (lớp is-enter gỡ khi xong)
  sheet.addEventListener('animationend', e => { if (e.target === sheet) el.classList.remove('is-enter') })

  let chipNodes = new Map()
  let chipRecipe = null
  let actionsKey = ''
  let copies = 0
  let heardSig = ''

  function emit() { if (typeof opts.onChange === 'function') opts.onChange({ qty: st.qty, notes: st.notes.slice() }) }

  function setQty(q, byUser) {
    if (destroyed || leaving) return
    const nq = clampQty(q, model ? model.qtyMax : QTY_MAX)
    if (nq === st.qty) return
    st.qty = nq
    if (byUser) sound('click')
    paint(byUser)
    emit()
  }

  function toggle(id) {
    if (destroyed || leaving) return
    st.notes = toggleNoteIds(cur.recipe, st.notes, id)
    sound('click')
    paint(true, id)
    emit()
  }

  function doClose() {
    if (destroyed || leaving) return
    if (typeof opts.onClose === 'function') opts.onClose()
  }

  function submit() {
    if (destroyed || leaving) return
    const line = { recipeId: model.recipeId, qty: st.qty, notes: st.notes.slice() }
    if (typeof opts.onSubmit === 'function') opts.onSubmit(line, { from: plate })
  }

  function remove() {
    if (destroyed || leaving) return
    if (typeof opts.onRemove === 'function') opts.onRemove()
  }

  function paintCopies(animate) {
    const r = cur.recipe
    while (copies < st.qty) {
      const node = dishArt(r, 'co-sheet-copy')
      plate.appendChild(node)
      copies++
      if (animate && vfx) vfx.pop(node)
    }
    while (copies > st.qty) {
      const last = plate.lastElementChild
      if (last) last.remove()
      copies--
    }
    plate.dataset.n = String(st.qty)
  }

  function paintChips(animate, poked) {
    const r = cur.recipe
    if (chipRecipe !== r) {
      chipRecipe = r
      chips.textContent = ''
      chipNodes = new Map()
      for (const n of model.notes) {
        const ico = noteIcon(n.id, { recipe: r, label: n.label, decorative: true })
        const node = h('button', {
          class: 'co-note-chip', type: 'button', testid: 'note-chip-' + n.id, 'aria-pressed': 'false',
          dataset: { tone: n.tone }, onclick: () => toggle(n.id)
        }, ico, h('span', { class: 'co-note-text' }, n.label,
          n.surcharge ? h('small', null, '+' + formatVND(n.surcharge)) : null),
        h('span', { class: 'co-note-check', 'aria-hidden': 'true' }, '✓'))
        chips.appendChild(node)
        chipNodes.set(n.id, { node, ico })
      }
    }
    for (const n of model.notes) {
      const rec = chipNodes.get(n.id)
      if (!rec) continue
      const was = rec.node.getAttribute('aria-pressed') === 'true'
      if (was !== n.on) {
        rec.node.setAttribute('aria-pressed', n.on ? 'true' : 'false')
        rec.node.classList.toggle('is-on', n.on)
        if (animate && n.on && n.id === poked && vfx && !reduced()) vfx.pop(rec.ico)
      }
    }
    noteBlock.hidden = !model.notes.length
  }

  // Dải "Khách nói": vẽ lại chỉ khi lời / món đổi (cùng dữ liệu thì không đụng tới).
  function paintHeard() {
    const m = heardModel(cur.heard)
    const k = JSON.stringify(m)
    if (k === heardSig) return
    heardSig = k
    heardEl.textContent = ''
    heardEl.hidden = !m
    if (!m) { heardEl.removeAttribute('aria-label'); heardEl.classList.remove('is-full', 'is-clamped', 'is-open'); syncHeardRole(); return }
    const R = (cur.heard && cur.heard.recipes) || {}
    heardEl.dataset.mode = m.mode
    heardEl.setAttribute('aria-label', L.heard + ': ' + (m.text || m.lines.map(l => `${l.qty} ${R[l.recipeId] ? R[l.recipeId].name : l.recipeId}`).join(', ')))
    // kiểu chữ: nhãn là viên thuốc đứng đầu đoạn lời khách (chữ chảy quanh, đỡ tốn một dòng); kiểu hình: nhãn + hàng món
    const label = h('span', { class: 'co-heard-label', 'aria-hidden': 'true' }, L.heard)
    if (m.mode === 'text') {
      heardEl.appendChild(h('p', { class: 'co-heard-text', 'aria-hidden': 'true' }, label, ' ', `“${m.text}”`))
      heardEl.appendChild(heardMore)
      fitHeard(true)
      return
    }
    heardEl.appendChild(label)
    if (m.lines.length) {
      heardEl.appendChild(h('div', { class: 'co-heard-dishes', 'aria-hidden': 'true' }, m.lines.map(l => {
        const r = R[l.recipeId]
        return h('span', { class: 'co-heard-dish' },
          h('span', { class: 'co-heard-art' }, dishArt(r || { id: l.recipeId })),
          l.qty > 1 ? h('b', { class: 'co-heard-qty' }, '×' + l.qty) : null,
          l.notes.length ? h('span', { class: 'co-heard-notes' }, l.notes.map(n => noteIcon(n, { recipe: r, decorative: true }))) : null)
      })))
    }
    if (m.text) heardEl.appendChild(h('p', { class: 'co-heard-text', 'aria-hidden': 'true' }, `“${m.text}”`))
    fitHeard(true)
  }

  // Lời gọi món dài ở dải "Khách nói" (kiểu chữ, kẹp 4 dòng). Đo theo SỰ KIỆN — lời đổi, bên gọi gọi fit() sau khi gắn bảng /
  // khi màn đổi cỡ (force) — không mỗi khung hình: chữ dài hơn 4 dòng mà bảng còn chỗ (thân bảng vẫn không phải cuộn) thì
  // hiện trọn (is-full); hết chỗ thì giữ kẹp, cả dải thành nút chạm để xem đủ (is-clamped; is-open khi đang mở).
  let heardFitKey = ''
  function fitHeard(force = false) {
    if (destroyed || !el.isConnected || typeof getComputedStyle !== 'function') return
    const key = [heardSig, sheet.clientWidth, el.clientHeight].join('|')
    if (!force && key === heardFitKey) return
    heardFitKey = key
    heardEl.classList.remove('is-full', 'is-clamped', 'is-open')
    syncHeardRole()
    const text = heardEl.querySelector('.co-heard-text')
    if (heardEl.hidden || heardEl.dataset.mode !== 'text' || !text || text.scrollHeight <= text.clientHeight + 1) return
    const bodyScrolls = () => bodyEl.scrollHeight > bodyEl.clientHeight + 1
    const scrolled = bodyScrolls()
    heardEl.classList.add('is-full')
    if (!scrolled && !bodyScrolls()) return
    heardEl.classList.remove('is-full')
    heardEl.classList.add('is-clamped')
    syncHeardRole()
  }
  // dải bị kẹp là nút (bàn phím: Enter / Space); còn lại là ghi chú thường
  function syncHeardRole() {
    const btn = heardEl.classList.contains('is-clamped')
    heardEl.setAttribute('role', btn ? 'button' : 'note')
    if (btn) {
      heardEl.tabIndex = 0
      heardEl.setAttribute('aria-expanded', heardEl.classList.contains('is-open') ? 'true' : 'false')
    } else {
      heardEl.removeAttribute('tabindex')
      heardEl.removeAttribute('aria-expanded')
    }
  }
  function toggleHeard() {
    if (destroyed || leaving || !heardEl.classList.contains('is-clamped')) return
    heardEl.classList.toggle('is-open')
    syncHeardRole()
    sound('click')
  }
  heardEl.addEventListener('click', toggleHeard)
  heardEl.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && heardEl.classList.contains('is-clamped')) { e.preventDefault(); toggleHeard() }
  })

  function paintActions() {
    const key = model.editing ? 'edit' : 'add'
    if (key !== actionsKey) {
      actionsKey = key
      actions.textContent = ''
      if (model.editing) {
        actions.appendChild(h('button', { class: 'co-btn-remove g-btn', type: 'button', testid: 'remove-line', onclick: remove }, L.remove))
      }
      actions.appendChild(h('button', { class: 'co-btn-add g-btn g-btn--primary g-btn--big', type: 'button', testid: 'add-line', onclick: submit },
        h('span', { class: 'co-btn-add-label' }, model.editing ? L.update : L.add),
        h('small', { class: 'co-btn-add-sum' })))
    }
    const sum = actions.querySelector('.co-btn-add-sum')
    if (sum) sum.textContent = formatVND(model.total)
  }

  function paint(animate = false, poked = null) {
    model = sheetModel({ recipe: cur.recipe, qty: st.qty, notes: st.notes, editIndex: cur.editIndex, qtyMax: cur.qtyMax, rareMax: cur.rareMax })
    st.qty = model.qty
    sheet.setAttribute('aria-label', model.name)
    title.textContent = model.name
    unitEl.textContent = formatVND(model.unit) + ' / phần'
    paintCopies(animate)
    if (value.textContent !== String(model.qty)) value.textContent = String(model.qty)
    xBadge.textContent = '×' + model.qty
    xBadge.hidden = model.qty < 2
    if (animate && vfx && !reduced() && model.qty > 1) vfx.pop(xBadge)
    minus.disabled = !model.canMinus
    plus.disabled = !model.canPlus
    rareNote.textContent = model.rareMax !== null ? `★ còn ${model.rareMax} phần` : ''
    rareNote.hidden = model.rareMax === null
    paintChips(animate, poked)
    paintActions()
    paintHeard()
  }

  function update(d = {}) {
    if (destroyed) return
    const recipeChanged = Object.prototype.hasOwnProperty.call(d, 'recipe') && d.recipe !== cur.recipe
    cur = { ...cur, ...d }
    const nq = d.qty !== undefined ? d.qty : st.qty
    const nn = Array.isArray(d.notes) ? d.notes.slice() : st.notes
    if (recipeChanged) { copies = 0; plate.textContent = '' }
    st = { qty: nq, notes: nn }
    paint(false)
  }

  // Đóng có hiệu ứng trượt xuống (giảm chuyển động: gỡ ngay). Gọi destroy() khi xong.
  function leave() {
    if (destroyed) return Promise.resolve()
    if (leaving) return leaving
    leaving = new Promise(resolve => {
      if (reduced() || typeof sheet.animate !== 'function') { destroy(); resolve(); return }
      const a = sheet.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(48px)', opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' })
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' })
      const done = () => { destroy(); resolve() }
      a.onfinish = done
      a.oncancel = done
      setTimeout(done, 400)
    })
    return leaving
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    el.remove()
  }

  st = { qty: data.qty !== undefined ? data.qty : 1, notes: Array.isArray(data.notes) ? data.notes.slice() : [] }
  paint(false)

  return {
    el,
    sheetEl: sheet,
    update,
    fit: force => fitHeard(!!force),
    leave,
    destroy,
    heroEl: () => plate,
    state: () => ({ qty: st.qty, notes: st.notes.slice() })
  }
}
