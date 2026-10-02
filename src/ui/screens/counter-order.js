// Quầy, khâu 1 (Order) — M5 Đợt 2, gói Q-A: ráp các thành phần gọi món đã duyệt ở Phòng mẫu vào quầy thật.
//   - Khách ở quầy (mọi khâu): khách bán thân lớn đứng sau mặt quầy + bong bóng (components/order-bubble.js).
//     Khâu Order: ngày 1–2 bong bóng có HÌNH MÓN, huy hiệu ×n, ghi chú bằng hình (gợi ý như dải hình món cũ); từ ngày 3
//     bong bóng chữ nguyên văn lời khách (luật cũ bỏ dải hình món từ ngày 3 — không đổi độ khó). Khâu sau: câu mới nhất
//     của khách. Lời Dì Sáu cho khách hướng dẫn (ngày 1): mặt Dì Sáu + bong bóng giấy (tutor-hint).
//   - Khâu Order: bảng thực đơn gỗ / phấn (menu-board.js), phiếu order giấy (order-pad.js) và hàng nút dính đáy
//     "Đọc lại đơn" / "Chốt order" (.act-bar), bảng chọn số lượng + ghi chú (order-sheet.js, gắn qua portal ở lớp nổi gốc).
// Các thành phần được giữ BỀN theo khách (WeakMap theo ctx của panel): counter.js vẽ lại panel mỗi khi stateSig đổi, nhưng
// khách / khâu Order / bảng chọn chỉ update() tại chỗ — không dựng lại nút, không phát lại hoạt ảnh. Hoạt ảnh chỉ kích theo
// SỰ KIỆN (thao tác): khách tới (enter), dòng mới "viết ra" (ctx.ui.lastAdded), đọc lại (sáng lần lượt từng dòng, khách
// gật / đổi mặt), chốt order (nhân bản phiếu → con dấu ĐÃ CHỐT → bay lên dây phiếu; keepOnDestroy vì panel vẽ lại ngay).
// Mọi hàm nhận ctx chung của panel Quầy (counter.js) — luôn đọc ctx.ui mỗi lần dùng (ui làm mới khi đổi khách).
// Import trong Node được: không chạm DOM ở cấp module.
import { h, svgBox } from '../dom.js'
import { DI_SAU } from '../art.js'
import { DI_SAU_FACES, head } from '../art/people.js'
import { addLine, updateLine, removeLine, readback, confirmOrder } from '../../core/order.js'
import { orderableRecipes } from '../../core/customer.js'
import { rareLeft } from '../../core/rare.js'
import { moodFor } from '../components/patience.js'
import { isReduced } from '../motion.js'
import { createOrderBubble } from '../components/order-bubble.js'
import { createMenuBoard } from '../components/menu-board.js'
import { createOrderPad, ORDER_ERROR_LABELS as PAD_ERROR_LABELS } from '../components/order-pad.js'
import { createOrderSheet, QTY_MAX } from '../components/order-sheet.js'

export const ORDER_ERROR_LABELS = PAD_ERROR_LABELS

// Ngày còn gợi ý bằng hình món trong bong bóng (luật cũ: dải hình món ngày 1–2, bỏ từ ngày 3).
export const HINT_DAYS = 2
// Câu chờ của khách ở khâu Thanh toán khi chưa có lời nào (bong bóng không để trống).
export const ASK_TOTAL = 'Hết bao nhiêu vậy?'
const READ_FIRST = 'Đọc lại đơn cho khách nghe trước khi chốt.'

// ---------- Thành phần bền theo panel ----------

const VIEWS = new WeakMap()
function views(ctx) {
  let v = VIEWS.get(ctx)
  if (!v) { v = { cust: null, order: null, sheet: null }; VIEWS.set(ctx, v) }
  return v
}
const vfxOf = ctx => (ctx.app.vfx && typeof ctx.app.vfx.fly === 'function' ? ctx.app.vfx : null)
const moodOf = customer => (customer.tutorial ? 'vui' : moodFor(customer.patience))

// Mặt tròn nhỏ của khách (cạnh tên trên phiếu order); '' nếu không dựng được.
function headSvg(customer, mood) {
  try {
    const o = {}
    if (customer.gender) o.gender = customer.gender
    const who = customer.regularId || customer.stranger
    if (who) o.who = who
    return head(customer.persona, mood, o) || ''
  } catch { return '' }
}
const optsOf = ctx => ({ vfx: vfxOf(ctx), sound: n => ctx.app.sound(n), reduced: () => isReduced(ctx.app) })

/** Mặt Dì Sáu (bộ hình mới của people.js; dự phòng mặt cũ của art.js). */
export function diSauFace(mood = 'vui') {
  return (DI_SAU_FACES && DI_SAU_FACES[mood]) || DI_SAU[mood] || DI_SAU.vui
}

// Dữ liệu bong bóng khách theo khâu (thuần trên ctx/state).
function custData(ctx, customer, c) {
  const { app, R } = ctx
  const persona = app.data.PERSONAS[customer.persona]
  const order = c.stage === 'order'
  const sh = ctx.sh()
  const day = sh ? sh.day : 1
  const talk = ctx.ui.talk || []
  let speech = customer.speech
  let shown = talk
  if (!order) {
    // khâu sau: câu mới nhất của khách lên bong bóng; lời người bán còn lại nằm dưới
    let last = -1
    for (let i = talk.length - 1; i >= 0; i--) if (talk[i].who !== 'ban') { last = i; break }
    speech = last >= 0 ? talk[last].text : (c.stage === 'thanh_toan' ? ASK_TOTAL : '')
    shown = talk.filter((_, i) => i !== last)
  }
  return {
    persona: customer.persona,
    gender: customer.gender || null,
    who: customer.regularId || customer.stranger || null,
    mood: moodOf(customer),
    name: customer.name,
    regular: !!customer.regularId,
    tag: customer.stranger ? 'Khách lạ' : ((persona && persona.name) || ''),
    mode: order ? (day <= HINT_DAYS ? 'icons' : 'text') : 'talk',
    request: order ? customer.request : [],
    speech,
    recipes: R,
    talk: shown
  }
}

// Khách ở quầy + lời Dì Sáu (ngày 1). Bền theo id khách.
function createCustomerView(ctx, customer, c) {
  const bubble = createOrderBubble(custData(ctx, customer, c), optsOf(ctx))
  const text = h('span', { class: 'co-tutor-text' })
  const tutor = h('div', { class: 'co-tutor', testid: 'tutor-hint', role: 'note', hidden: true },
    svgBox(diSauFace('vui'), 'co-tutor-face'), text)
  const el = h('div', { class: 'cust-wrap co-cust-area' }, bubble.el, tutor)
  let hintText = ''
  return {
    id: customer.id,
    el,
    bubble,
    update(cust, c) {
      bubble.update(custData(ctx, cust, c))
      const hint = cust.tutorial ? (ctx.tutorialHint(c) || '') : ''
      if (hint !== hintText) { hintText = hint; text.textContent = hint }
      tutor.hidden = !hint
    },
    destroy() { bubble.destroy(); el.remove() }
  }
}

/**
 * Khách ở quầy (mọi khâu) → div.cust-wrap (bền theo khách: cùng khách thì cập nhật tại chỗ, khách mới thì dựng mới
 * và cho bước tới quầy). counter.js gọi mỗi lần vẽ lại.
 */
export function paintCustomer(ctx, customer, c) {
  const v = views(ctx)
  let fresh = false
  if (!v.cust || v.cust.id !== customer.id) {
    if (v.cust) v.cust.destroy()
    v.cust = createCustomerView(ctx, customer, c)
    fresh = true
  }
  v.cust.update(customer, c)
  if (fresh) {
    // khách bước tới quầy: chỉ một lần theo id (sự kiện đổi khách, không phải mỗi lần vẽ lại)
    const cv = v.cust
    const kick = () => { if (views(ctx).cust === cv && !ctx.destroyed()) cv.bubble.enter() }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(kick)
    else kick()
  }
  return v.cust.el
}

/** Tương thích API bước 0: khách ở quầy → div.cust-wrap. */
export function renderCustomer(ctx, customer, c) {
  return paintCustomer(ctx, customer, c)
}

// ---------- Khâu Order ----------

function createOrderView(ctx, customer) {
  const { app, S } = ctx
  const o = optsOf(ctx)
  const menu = createMenuBoard({ recipes: ctx.R, menu: [] }, {
    ...o,
    title: 'Thực đơn',
    onPick: id => openSheet(ctx, id, null),
    onOut: () => app.toast((S.rare && S.rare.outOfStock) || 'Hết nguyên liệu hiếm', { kind: 'bad' })
  })
  const pad = createOrderPad({ draft: [], recipes: ctx.R }, {
    ...o,
    labels: { readFirst: (S.messages && S.messages.readbackFirst) || READ_FIRST },
    onEdit: i => editLine(ctx, i),
    onRemove: i => {
      if (removeLine(app.state, i)) { app.save(); ctx.rerender() }
    },
    onReadback: () => doReadback(ctx, ctx.customerOf(ctx.counter())),
    onConfirm: () => doConfirm(ctx)
  })
  // hàng nút "Đọc lại đơn" / "Chốt order" là con cuối của khâu: dính đáy vùng cuộn suốt (.act-bar: counter.revealAboveBar,
  // tour chừa chỗ thanh dính)
  pad.actionsEl.classList.add('act-bar')
  const el = h('div', { class: 'stage stage-order co-order' }, menu.el, pad.el, pad.actionsEl)
  return {
    id: customer.id,
    el,
    menu,
    pad,
    update(cust, c) {
      menu.update({ recipes: ctx.R, menu: orderableRecipes(app.state, app.ctx), left: id => rareLeft(app.state, id, app.ctx) })
      const draftKey = JSON.stringify(c.draft)
      const canConfirm = !!c.readbackDone && c.draft.length > 0
      const ui = ctx.ui
      pad.update({
        draft: c.draft,
        recipes: ctx.R,
        caught: c.caught || [],
        errorLabels: { ...((S && S.errors) || {}), ...ORDER_ERROR_LABELS },
        canConfirm,
        hint: !canConfirm && c.draft.length && ui.readback !== draftKey ? READ_FIRST : '',
        lastAdded: Number.isInteger(ui.lastAdded) ? ui.lastAdded : null,
        sub: cust.name ? cust.name + (cust.regularId ? ' · khách quen' : '') : '',
        face: headSvg(cust, ui.padMood || moodOf(cust))
      })
    },
    destroy() { menu.destroy(); pad.destroy(); el.remove() }
  }
}

/** Khâu Order → div.stage.stage-order (bền theo khách; cập nhật tại chỗ khi vẽ lại). */
export function paintOrder(ctx, customer, c) {
  const v = views(ctx)
  if (!v.order || v.order.id !== customer.id) {
    if (v.order) v.order.destroy()
    v.order = createOrderView(ctx, customer)
  }
  v.order.update(customer, c)
  return v.order.el
}

/** Tương thích API bước 0. */
export function renderOrder(ctx, customer, c) {
  return paintOrder(ctx, customer, c)
}

/** Rời khâu Order (sang Thanh toán / đổi khách): gỡ thành phần khâu Order và bảng chọn. */
export function dropOrder(ctx) {
  const v = views(ctx)
  closeSheetView(ctx, false)
  if (v.order) { v.order.destroy(); v.order = null }
}

/** Gỡ hết (quầy trống, unmount). Chuỗi chốt order đang bay (keepOnDestroy) vẫn tự chạy nốt và tự dọn. */
export function dropAll(ctx) {
  const v = views(ctx)
  dropOrder(ctx)
  if (v.cust) { v.cust.destroy(); v.cust = null }
}

/** Phiếu order đang gắn (null nếu không ở khâu Order). */
export function orderPad(ctx) {
  const v = views(ctx)
  return v.order ? v.order.pad : null
}

function editLine(ctx, i) {
  const c = ctx.counter()
  const l = c && c.stage === 'order' ? c.draft[i] : null
  if (!l) return
  ctx.ui.sheet = { recipeId: l.recipeId, qty: l.qty, notes: (l.notes || []).slice(), editIndex: i }
  ctx.rerender()
}

function openSheet(ctx, recipeId, editIndex) {
  const c = ctx.counter()
  if (!c || c.stage !== 'order' || ctx.ui.sheet) return
  ctx.ui.sheet = { recipeId, qty: 1, notes: [], editIndex }
  ctx.rerender()
}

// Đích bay của phiếu khi chốt: ô kế tiếp trên dây phiếu (sau phiếu cuối), cỡ một phiếu nhỏ. Phiếu bếp của khách chỉ có
// sau khi thu tiền và kẹp phiếu, nên lúc chốt phiếu order bay vào chỗ trống kế tiếp của dây.
export function railTarget(doc) {
  const rail = doc && typeof doc.querySelector === 'function' ? doc.querySelector('[data-testid="ticket-rail"]') : null
  if (!rail || !rail.getClientRects || !rail.getClientRects().length) return { el: null, target: null }
  const R = rail.getBoundingClientRect()
  if (!R.width || !R.height) return { el: null, target: null }
  const tickets = rail.querySelectorAll('[data-testid^="rail-ticket-"]')
  const last = tickets.length ? tickets[tickets.length - 1] : null
  const w = Math.min(110, Math.max(60, R.width / 3.4))
  const hh = Math.max(36, Math.min(R.height - 10, 76))
  // dây trống: đầu khu phiếu (sau nhãn đếm "Phiếu n/3" nếu có), không đè nhãn
  const count = rail.querySelector('.rail-count')
  const cr = count && count.getClientRects().length ? count.getBoundingClientRect() : null
  let left = cr && cr.right < R.left + R.width / 2 ? cr.right + 10 : R.left + 12
  if (last) left = last.getBoundingClientRect().right + 8
  left = Math.min(Math.max(R.left + 4, left), R.right - w - 4)
  return { el: rail, target: { left, top: R.top + (R.height - hh) / 2, width: w, height: hh } }
}

// "Đọc lại đơn": lời người bán; lõi chấm ngay (nút Chốt bật, lỗi khách bắt hiện ngay); phiếu sáng lần lượt từng dòng rồi
// đánh ✓ / ✗; xong lượt sáng thì khách đáp, gật đầu (đúng) hoặc lắc đầu đổi mặt (khách bắt lỗi).
// Tham số thứ hai (khách) giữ cho chữ ký bước 0, không dùng: khách luôn đọc lại từ state.
export function doReadback(ctx, _customer) {
  const { app, R } = ctx
  const c = ctx.counter()
  const ui = ctx.ui
  if (!c || c.stage !== 'order' || !c.draft.length || ui.reading) return
  ctx.say('ban', typeof app.data.readbackText === 'function' ? app.data.readbackText(c.draft, R) : 'Dạ em đọc lại đơn ạ.')
  const res = readback(app.state, app.ctx)
  const key = JSON.stringify(c.draft)
  ui.readback = key
  app.save()
  ctx.rerender()
  const bad = !!(res.caught && res.caught.length)
  let done = false
  const finish = () => {
    if (done) return
    done = true
    ui.reading = false
    if (ui !== ctx.ui || ctx.destroyed()) return
    const cc = ctx.counter()
    // đã chốt / sửa phiếu giữa lượt sáng: không đáp lời cũ
    if (!cc || cc.stage !== 'order' || JSON.stringify(cc.draft) !== key) return
    app.sound(bad ? 'error' : 'ding')
    if (bad) app.vibrate(40)
    ctx.say('khach', res.line)
    const v = views(ctx)
    if (v.cust) v.cust.bubble.react(bad ? 'bad' : 'ok')
    reactPad(ctx, ui, bad)
    ctx.rerender()
    // khách bắt lỗi: kéo khung lỗi lên trên hàng nút dính đáy (màn thấp: hàng nút che mất); đúng hết: dòng cuối
    const caught = bad && v.order ? v.order.pad.el.querySelector('[data-testid="caught-list"]') : null
    if (caught) revealInPanel(ctx, caught, true)
    else if (v.order) v.order.pad.reveal(null, { smooth: true })
  }
  const pad = orderPad(ctx)
  if (!pad) { finish(); return }
  ui.reading = true
  pad.readback(res).then(finish, finish)
  // phiếu bị gỡ giữa lượt sáng (chốt, đổi khách): Promise của phiếu không kết thúc → nhả cờ sau thời lượng tối đa
  setTimeout(finish, 120 * c.draft.length + 900)
}

// Cuộn panel để node nằm trọn trên hàng nút dính đáy (.act-bar), không đẩy đầu node khuất mép trên.
function revealInPanel(ctx, node, smooth) {
  const sc = ctx.root
  if (!node || !node.isConnected || !sc || typeof sc.getBoundingClientRect !== 'function') return
  const bar = ctx.el.querySelector('.act-bar')
  const box = sc.getBoundingClientRect()
  const limit = bar ? Math.min(box.bottom, bar.getBoundingClientRect().top) : box.bottom
  const r = node.getBoundingClientRect()
  let d = r.bottom - (limit - 6)
  if (d <= 0) return
  d = Math.min(d, Math.max(0, r.top - box.top - 6))
  const top = sc.scrollTop + d
  if (smooth && !isReduced(ctx.app) && typeof sc.scrollTo === 'function') sc.scrollTo({ top, behavior: 'smooth' })
  else sc.scrollTop = top
}

// Mặt khách trên phiếu đổi theo kết quả đọc lại (vui / bực) trong 1,4 giây, kèm nhịp gật đầu hoặc lắc đầu — thấy được
// ngay bên các dòng phiếu cả khi khách ở đầu panel đã cuộn khuất.
function reactPad(ctx, ui, bad) {
  ui.padMood = bad ? 'buc' : 'vui'
  clearTimeout(ui.padTimer)
  ui.padTimer = setTimeout(() => {
    if (ui.padMood && ui === ctx.ui && !ctx.destroyed()) { ui.padMood = null; ctx.rerender() }
  }, 1400)
  // gật / lắc sau khi mặt mới được vẽ (lần vẽ lại ngay sau lời gọi này)
  setTimeout(() => {
    const pad = orderPad(ctx)
    const f = pad && pad.faceEl
    if (!f || !f.isConnected || isReduced(ctx.app) || typeof f.animate !== 'function') return
    f.animate(bad
      ? [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0deg)' }]
      : [{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(3px)' }, { transform: 'translateY(0)' }],
    { duration: 520, easing: 'ease-in-out' })
  }, 0)
}

// "Chốt order": lõi chốt; được thì NHÂN BẢN phiếu (đồng bộ trong stamp) rồi mới vẽ lại panel sang Thanh toán; bản sao
// đập dấu ĐÃ CHỐT và bay lên dây phiếu (giảm chuyển động: dấu hiện, không bay).
export function doConfirm(ctx) {
  const { app, S } = ctx
  const c = ctx.counter()
  if (!c || c.stage !== 'order') return
  const r = confirmOrder(app.state, app.ctx)
  if (!r.ok) {
    const msg = r.reason === 'phieu_rong' ? S.messages.emptyOrder
      : r.reason === 'het_hang_hiem' ? ((S.reasons && S.reasons.het_hang_hiem) || 'Không đủ nguyên liệu hiếm') : S.messages.readbackFirst
    app.toast(msg, { kind: 'bad' })
    return
  }
  const pad = orderPad(ctx)
  if (pad) {
    const rail = railTarget(ctx.el.ownerDocument)
    const vfx = vfxOf(ctx)
    pad.stamp({ target: rail.target, keepOnDestroy: true }).then(ok => {
      if (ok && rail.el && rail.el.isConnected && vfx && typeof vfx.glow === 'function') vfx.glow(rail.el)
    }, () => {})
  } else {
    app.sound('click')
  }
  ctx.ui.talk = []
  ctx.ui.reading = false
  app.save()
  ctx.rerender()
}

// ---------- Bảng chọn số lượng + ghi chú ----------

function closeSheetView(ctx, animated) {
  const v = views(ctx)
  const s = v.sheet
  v.sheet = null
  if (!s) return
  const node = s.comp.el
  const unhook = () => { if (ctx.sheetPortal.node() === node) ctx.sheetPortal.set(null) }
  if (animated) s.comp.leave().then(unhook, unhook)
  else { s.comp.destroy(); unhook() }
}

function rareMaxOf(ctx, recipe, editIndex) {
  if (!recipe || recipe.source !== 'hiem') return null
  const editing = editIndex !== null && editIndex !== undefined
  return Math.max(1, rareLeft(ctx.app.state, recipe.id, ctx.app.ctx, { skipDraftIndex: editing ? editIndex : -1 }))
}

function submitSheet(ctx, line, from) {
  const { app } = ctx
  const ui = ctx.ui
  const sheet = ui.sheet
  const c = ctx.counter()
  if (!sheet || !c || c.stage !== 'order') return
  const editing = sheet.editIndex !== null && sheet.editIndex !== undefined
  const index = editing ? sheet.editIndex : c.draft.length
  if (editing) updateLine(app.state, sheet.editIndex, line)
  else addLine(app.state, line)
  app.sound('paper')
  ui.lastAdded = index
  app.save()
  // phiếu có dòng mới ("viết ra" đúng dòng đó); bảng chọn còn mở để món bay từ đĩa xuống dòng
  ctx.rerender()
  const pad = orderPad(ctx)
  if (pad) {
    // dòng vừa ghi lọt lên trên hàng nút dính đáy (màn thấp: hàng nút che mất)
    pad.reveal(index)
    const target = pad.artEl(index)
    const vfx = vfxOf(ctx)
    if (vfx && target && from) vfx.fly(from, target, { node: from, ms: 420, arc: 0.3 })
  }
  ui.sheet = null
  closeSheetView(ctx, false)
  ctx.rerender()
}

/**
 * Bảng chọn (khâu Order, ctx.ui.sheet = { recipeId, qty, notes, editIndex }) → lớp phủ đang gắn trong ctx.sheetPortal
 * hoặc null. Bảng bền: vẽ lại panel khi bảng đang mở chỉ update (không trượt lên lại, giữ chỗ cuộn); đóng bằng ✕ / chạm
 * nền / "Xóa dòng" thì trượt xuống; "Thêm vào phiếu" thì món bay xuống phiếu và bảng gỡ ngay.
 */
export function paintSheet(ctx, c) {
  const v = views(ctx)
  const ui = ctx.ui
  const sheet = ui.sheet
  if (!sheet || !c || c.stage !== 'order' || !ctx.R[sheet.recipeId]) {
    if (sheet && (!c || c.stage !== 'order')) ui.sheet = null
    closeSheetView(ctx, false)
    return null
  }
  const recipe = ctx.R[sheet.recipeId]
  const rareMax = rareMaxOf(ctx, recipe, sheet.editIndex)
  if (v.sheet && v.sheet.ref === sheet) {
    v.sheet.comp.update({ qtyMax: QTY_MAX, rareMax })
    return v.sheet.comp.el
  }
  closeSheetView(ctx, false)
  const { app, S } = ctx
  const B = S.buttons || {}
  const L = S.labels || {}
  const comp = createOrderSheet({
    recipe, qty: sheet.qty, notes: (sheet.notes || []).slice(), editIndex: sheet.editIndex, qtyMax: QTY_MAX, rareMax
  }, {
    ...optsOf(ctx),
    labels: { add: B.addLine || 'Thêm vào phiếu', update: B.updateLine || 'Sửa dòng', remove: B.removeLine || 'Bỏ dòng', qty: L.qty || 'Số lượng', notes: L.notes || 'Ghi chú', close: 'Đóng' },
    onChange: st => { sheet.qty = st.qty; sheet.notes = st.notes },
    onSubmit: (line, { from } = {}) => submitSheet(ctx, line, from),
    onRemove: () => {
      const cc = ctx.counter()
      if (cc && cc.stage === 'order' && sheet.editIndex !== null && sheet.editIndex !== undefined) removeLine(app.state, sheet.editIndex)
      ctx.ui.sheet = null
      closeSheetView(ctx, true)
      app.save()
      ctx.rerender()
    },
    onClose: () => {
      ctx.ui.sheet = null
      closeSheetView(ctx, true)
      ctx.rerender()
    }
  })
  // giữ lớp .sheet-layer của bảng cũ (e2e iPhone đếm lớp phủ còn sót trong .overlay-root)
  comp.el.classList.add('sheet-layer')
  v.sheet = { ref: sheet, comp }
  ctx.sheetPortal.set(comp.el)
  return comp.el
}

/** Tương thích API bước 0: bảng chọn → lớp phủ (đã gắn vào portal). */
export function renderSheet(ctx, c) {
  return paintSheet(ctx, c)
}

/** Bảng chọn đang mở (đã gắn, chưa trượt xuống). */
export function sheetOpen(ctx) {
  const v = views(ctx)
  return !!(v.sheet && ctx.sheetPortal.node() === v.sheet.comp.el)
}
