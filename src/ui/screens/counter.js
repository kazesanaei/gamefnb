// Panel Quầy: Order → Thanh toán → Tính tiền (→ kẹp phiếu, khách sang Làm đồ).
// Vẽ lại toàn bộ panel khi state quầy đổi; trạng thái giao diện tạm (bảng trượt, số đang gõ) giữ ở `ui`.
import { h, svgBox, flash, createPortal } from '../dom.js'
import { face, icon, fakeQrSvg, DI_SAU } from '../art.js'
import {
  addLine, updateLine, removeLine, readback, confirmOrder, reportTotal, priceOfLines, unitPriceOf,
  trayAdd, trayRemove, giveChange, changeOptions, resolveNoChange, changeRemaining,
  confirmQr, rejectQr, clipTicket, railFull, qrSpeakerOn
} from '../../core/order.js'
import { orderableRecipes, personaObj } from '../../core/customer.js'
import { rareLeft } from '../../core/rare.js'
import { drawerTotal } from '../../core/money.js'
import { renderDrawer, renderTray, renderGivenCash } from '../components/cash-drawer.js'
import { createNumpad } from '../components/numpad.js'
import { moodFor } from '../components/patience.js'
import { formatVND, upper, fill } from '../format.js'

const ORDER_ERROR_LABELS = {
  sai_mon: 'Ghi sai món', thieu_mon: 'Ghi thiếu món', thua_mon: 'Khách không gọi món này',
  sai_so_luong: 'Ghi sai số lượng', sai_ghi_chu: 'Sai ghi chú'
}
const NO_CHANGE_LABELS = {
  xin_tien_le: ['Xin khách tiền lẻ', 'Khách có thể có tiền lẻ, nhưng sẽ hơi sốt ruột.'],
  moi_qr: ['Mời khách chuyển khoản QR', 'Khách quét mã, khỏi cần thối.'],
  lam_tron: ['Làm tròn có lợi cho khách', 'Thối dư tối đa 5.000đ cho chẵn tiền.']
}

export function mountCounter(root, app, opts = {}) {
  const el = h('div', { class: 'counter', testid: 'counter-panel' })
  root.appendChild(el)
  const R = app.data.RECIPES
  const S = app.data.STRINGS
  const D = app.data.DIALOGUE

  let ui = freshUi(null)
  let sig = ''
  let destroyed = false
  // Bảng chọn món gắn ở lớp nổi gốc của app, KHÔNG nằm trong panel Quầy (vùng cuộn): iOS Safari cắt lớp phủ nằm trong
  // vùng cuộn theo khung panel nên thanh tab Quầy/Bếp che mất nút "Thêm vào phiếu" (lỗi trên iPhone thật).
  const sheetPortal = createPortal(app.overlay || root)

  function freshUi(customerId) {
    return { customerId, sheet: null, talk: [], digits: '', readback: null, noChangeKey: '', assistFilled: false, lastAdded: null, stageKey: null }
  }

  const sh = () => app.state && app.state.shift
  const counter = () => (sh() ? sh().counter : null)
  const customerOf = c => (c ? sh().customers[c.customerId] : null)

  function say(who, text) {
    if (!text) return
    ui.talk.push({ who, text })
    if (ui.talk.length > 2) ui.talk.shift()
  }

  // Câu thoại phía giao diện (không ảnh hưởng luồng ngẫu nhiên của ca).
  function lineOf(kind, customer, vars = {}) {
    const fn = app.data.makeLine
    if (typeof fn !== 'function' || !customer) return ''
    try {
      return fn(kind, { persona: personaObj(app.ctx, customer.persona), region: customer.region, rand: Math.random, vars: { gender: customer.gender, name: customer.name, regularId: customer.regularId, ...(customer.self ? { self: customer.self } : {}), ...vars } })
    } catch { return '' }
  }

  function stateSig() {
    const s = sh()
    if (!s) return 'none'
    return JSON.stringify([s.counter, s.drawer, s.tickets.length, s.queue.length, app.state.settings.assistCash])
  }

  function rerender() {
    if (destroyed) return
    render()
  }

  // ---------- Vẽ ----------

  function render() {
    const s = sh()
    const c = counter()
    const customer = customerOf(c)
    if ((customer ? customer.id : null) !== ui.customerId) ui = freshUi(customer ? customer.id : null)
    const scroll = el.scrollTop
    el.textContent = ''
    el.dataset.stage = c ? c.stage : ''
    if (!s) { sheetPortal.set(null); return }
    if (!c || !customer) {
      el.appendChild(renderIdle(s))
    } else {
      el.appendChild(renderCustomer(customer, c))
      if (c.stage === 'order') el.appendChild(renderOrder(customer, c))
      else if (c.stage === 'thanh_toan') el.appendChild(renderPayment(customer, c))
      else if (c.stage === 'tinh_tien') el.appendChild(renderCashier(customer, c))
    }
    paintSheet(c, customer)
    if (c && customer && customer.tutorial) applyGlow(c)
    el.scrollTop = scroll
    sig = stateSig()
    ui.lastAdded = null
    // sang khâu mới: cuộn panel để phần thao tác của khâu đó lọt vào màn hình
    const stageKey = c && customer ? [customer.id, c.stage, c.payMethod === 'cash' ? c.changeDone : c.paid].join(':') : ''
    if (stageKey !== ui.stageKey) {
      ui.stageKey = stageKey
      if (c) revealStage(c.stage)
    }
  }

  // Bảng chọn món (chỉ ở khâu Order): vẽ lại cùng panel. Bảng đang mở mà vẽ lại (khách mới xếp hàng, đổi số lượng…)
  // thì không chạy lại hiệu ứng trượt lên và giữ chỗ đang cuộn trong thân bảng.
  function paintSheet(c, customer) {
    if (!ui.sheet || !c || !customer || c.stage !== 'order') { ui.sheet = null; sheetPortal.set(null); return }
    const prev = sheetPortal.node()
    const prevBody = prev && prev.querySelector('.sheet-body')
    const top = prevBody ? prevBody.scrollTop : 0
    const node = renderSheet(c)
    if (prev) node.classList.add('is-steady')
    sheetPortal.set(node)
    const body = node.querySelector('.sheet-body')
    if (body && top) body.scrollTop = top
  }

  function revealStage(stage) {
    const sc = root
    if (!sc || destroyed || !sc.getBoundingClientRect) return
    if (stage === 'order') { sc.scrollTop = 0; return }
    const st = el.querySelector('.stage')
    if (!st) return
    const a = st.getBoundingClientRect(), b = sc.getBoundingClientRect()
    const over = a.bottom - b.bottom
    // đẩy lên vừa đủ để thấy đáy khâu, nhưng không đẩy tiêu đề khâu ra khỏi màn hình
    if (over > 0) sc.scrollTop += Math.min(over, Math.max(0, a.top - b.top))
  }

  // Cuộn panel để phần tử nằm trên thanh nút dính đáy (.act-bar) của khâu hiện tại.
  function revealAboveBar(node) {
    const sc = root
    if (!node || destroyed || !sc || !sc.getBoundingClientRect) return
    const bar = el.querySelector('.act-bar')
    const limit = bar ? bar.getBoundingClientRect().top : sc.getBoundingClientRect().bottom
    const over = node.getBoundingClientRect().bottom - (limit - 6)
    if (over > 0) sc.scrollTop += over
  }

  function renderIdle(s) {
    const waiting = Object.values(s.customers).filter(c => c.status === 'cho_mon' || c.status === 'nhan_mon')
    return h('div', { class: 'counter-idle', testid: 'counter-idle' },
      svgBox(DI_SAU.vui, 'npc-face'),
      h('p', { class: 'idle-title' }, s.queue.length ? 'Khách đang tới quầy…' : 'Quầy đang trống'),
      h('p', { class: 'muted' }, s.tickets.length
        ? `Dây bếp có ${s.tickets.length} phiếu. Qua Bếp làm món cho khách nhé!`
        : (waiting.length ? 'Khách đang chờ món.' : 'Chờ khách ghé xe…')),
      s.tickets.length && opts.switchTab
        ? h('button', { class: 'btn btn-secondary', type: 'button', testid: 'go-kitchen', onclick: () => opts.switchTab('kitchen') }, 'Qua Bếp')
        : null)
  }

  function renderCustomer(customer, c) {
    const persona = app.data.PERSONAS[customer.persona]
    const mood = customer.tutorial ? 'vui' : moodFor(customer.patience)
    const card = h('div', { class: 'cust-card' },
      svgBox(face(customer.persona, mood, customer.gender), 'cust-face'),
      h('div', { class: 'cust-info' },
        h('div', { class: 'cust-name' }, customer.name,
          customer.regularId ? h('span', { class: 'badge' }, 'Khách quen') : null),
        h('div', { class: 'cust-persona muted' }, (persona && persona.name) || '')))
    const wrap = h('div', { class: 'cust-wrap' }, card)
    if (c.stage === 'order') {
      wrap.appendChild(h('div', {
        class: 'bubble speech-bubble', testid: 'speech-bubble', dataset: { request: JSON.stringify(customer.request) }
      }, customer.speech))
      // Ngày 1–2: dải icon món dưới bóng thoại
      if (sh().day <= 2) {
        wrap.appendChild(h('div', { class: 'request-icons', testid: 'request-icons' },
          customer.request.map(l => h('span', { class: 'req-icon' }, svgBox(icon((R[l.recipeId] || {}).icon || l.recipeId), 'dish-icon tiny'), '×' + l.qty))))
      }
    }
    for (const t of ui.talk) {
      wrap.appendChild(h('div', { class: ['bubble', 'talk', t.who === 'ban' ? 'talk-me' : 'talk-them'], testid: t.who === 'ban' ? 'seller-line' : 'customer-line' },
        h('b', null, t.who === 'ban' ? 'Bạn: ' : customer.name + ': '), t.text))
    }
    if (customer.tutorial) {
      const hint = tutorialHint(c)
      if (hint) wrap.appendChild(h('div', { class: 'tutor', testid: 'tutor-hint' }, svgBox(DI_SAU.vui, 'npc-face tiny'), h('span', null, hint)))
    }
    return wrap
  }

  // ---------- Khâu 1: Order ----------

  function renderOrder(customer, c) {
    const menu = orderableRecipes(app.state, app.ctx)
    const body = h('div', { class: 'stage stage-order' })
    body.appendChild(h('h3', { class: 'stage-title' }, 'Sổ order'))
    body.appendChild(h('div', { class: 'menu-grid' }, menu.map(id => {
      const r = R[id]
      // M4: món hiếm: huy hiệu ★ và số phần còn ghi được (tồn kho trừ phần đã nằm trên phiếu bếp và phiếu đang ghi)
      const rare = r.source === 'hiem'
      const left = rare ? rareLeft(app.state, id, app.ctx) : null
      return h('button', {
        class: ['menu-item', rare ? 'is-rare' : '', rare && left <= 0 ? 'is-out' : ''], type: 'button', testid: 'menu-item-' + id,
        dataset: rare ? { left: String(left) } : undefined,
        onclick: () => {
          if (rare && left <= 0) { app.toast((S.rare && S.rare.outOfStock) || 'Hết nguyên liệu hiếm', { kind: 'bad' }); return }
          app.sound('click'); ui.sheet = { recipeId: id, qty: 1, notes: [], editIndex: null }; rerender()
        }
      }, svgBox(icon(r.icon || id), 'dish-icon'), h('span', { class: 'menu-name' }, r.name), h('span', { class: 'menu-price' }, formatVND(r.price)),
      rare ? h('span', { class: 'menu-rare', testid: 'rare-left-' + id }, `★ còn ${Math.max(0, left)}`) : null)
    })))

    // Phiếu đang ghi
    const caughtIdx = new Set((c.caught || []).map(e => e.index).filter(i => i !== null && i !== undefined))
    const lines = h('ol', { class: 'draft', testid: 'draft' })
    if (!c.draft.length) lines.appendChild(h('li', { class: 'draft-empty muted' }, 'Chạm món để ghi vào phiếu'))
    c.draft.forEach((l, i) => {
      const r = R[l.recipeId]
      const notes = noteLabels(r, l.notes)
      lines.appendChild(h('li', { class: ['draft-line', caughtIdx.has(i) ? 'wrong' : ''], dataset: { index: i } },
        h('button', {
          class: 'draft-main', type: 'button', testid: 'order-line-' + i,
          onclick: () => { ui.sheet = { recipeId: l.recipeId, qty: l.qty, notes: l.notes.slice(), editIndex: i }; rerender() }
        },
        h('span', { class: 'draft-qty' }, l.qty + ' ×'),
        h('span', { class: 'draft-name' }, r ? r.name : l.recipeId),
        notes.length ? h('span', { class: 'draft-notes' }, notes.map(upper).join(' · ')) : null),
        h('button', {
          class: 'draft-del', type: 'button', testid: 'order-line-remove-' + i, 'aria-label': 'Xóa dòng ' + (i + 1),
          onclick: () => { removeLine(app.state, i); app.save(); rerender() }
        }, '✕')))
    })
    body.appendChild(h('div', { class: 'draft-card' }, h('div', { class: 'draft-head' }, 'Phiếu order'), lines))

    // Lỗi khách chỉ ra khi đọc lại
    if ((c.caught || []).length) {
      body.appendChild(h('ul', { class: 'caught-list', testid: 'caught-list' }, c.caught.map(e => h('li', null,
        (e.index !== null && e.index !== undefined ? `Dòng ${e.index + 1}: ` : '') + (ORDER_ERROR_LABELS[e.type] || S.errors[e.type] || e.type) +
        (e.type === 'thieu_mon' && R[e.expectedRecipeId] ? ` (${R[e.expectedRecipeId].name.toLowerCase()})` : '')))))
    }

    const draftKey = JSON.stringify(c.draft)
    const canConfirm = c.readbackDone && c.draft.length > 0
    if (!canConfirm && c.draft.length && ui.readback !== draftKey) {
      body.appendChild(h('p', { class: 'muted small center' }, 'Đọc lại đơn cho khách nghe trước khi chốt.'))
    }
    // thanh nút dính đáy panel: luôn chạm được, không phải cuộn
    body.appendChild(h('div', { class: 'action-row act-bar' },
      h('button', {
        class: 'btn btn-secondary', type: 'button', testid: 'readback', disabled: !c.draft.length,
        onclick: () => doReadback(customer)
      }, 'Đọc lại đơn'),
      h('button', {
        class: 'btn btn-primary', type: 'button', testid: 'confirm-order', disabled: !canConfirm,
        title: canConfirm ? '' : S.messages.readbackFirst,
        onclick: () => {
          const r = confirmOrder(app.state, app.ctx)
          if (!r.ok) {
            const msg = r.reason === 'phieu_rong' ? S.messages.emptyOrder
              : r.reason === 'het_hang_hiem' ? ((S.reasons && S.reasons.het_hang_hiem) || 'Không đủ nguyên liệu hiếm') : S.messages.readbackFirst
            app.toast(msg, { kind: 'bad' })
            return
          }
          app.sound('click')
          ui.talk = []
          app.save()
          rerender()
        }
      }, 'Chốt order')))
    return body
  }

  function doReadback(customer) {
    const c = counter()
    if (!c || !c.draft.length) return
    say('ban', typeof app.data.readbackText === 'function' ? app.data.readbackText(c.draft, R) : 'Dạ em đọc lại đơn ạ.')
    const res = readback(app.state, app.ctx)
    ui.readback = JSON.stringify(c.draft)
    say('khach', res.line)
    if (res.caught && res.caught.length) {
      app.sound('error')
      app.vibrate(40)
    } else {
      app.sound('ding')
    }
    app.save()
    rerender()
  }

  function renderSheet(c) {
    const sheet = ui.sheet
    const r = R[sheet.recipeId]
    const notes = (r && r.notes) || []
    const editing = sheet.editIndex !== null && sheet.editIndex !== undefined
    const toggle = n => {
      const on = sheet.notes.includes(n.id)
      if (on) sheet.notes = sheet.notes.filter(x => x !== n.id)
      else {
        // ghi chú cùng nhóm loại trừ nhau
        if (n.group) sheet.notes = sheet.notes.filter(x => { const o = notes.find(m => m.id === x); return !o || o.group !== n.group })
        sheet.notes.push(n.id)
      }
      app.sound('click')
      rerender()
    }
    // M4: món hiếm chỉ ghi tới số phần còn trong kho (không tính dòng đang sửa)
    const rareMax = r && r.source === 'hiem' ? Math.max(1, rareLeft(app.state, r.id, app.ctx, { skipDraftIndex: editing ? sheet.editIndex : -1 })) : 3
    const qtyMax = Math.min(3, rareMax)
    const setQty = q => { sheet.qty = Math.max(1, Math.min(qtyMax, q)); rerender() }
    const submit = () => {
      const line = { recipeId: sheet.recipeId, qty: sheet.qty, notes: sheet.notes.slice() }
      const index = editing ? sheet.editIndex : (counter() ? counter().draft.length : 0)
      if (editing) updateLine(app.state, sheet.editIndex, line)
      else addLine(app.state, line)
      app.sound('paper')
      ui.sheet = null
      app.save()
      rerender()
      // dòng vừa ghi phải lọt khỏi thanh nút dính đáy (màn thấp 360×740: thanh "Đọc lại đơn" che mất)
      revealAboveBar(el.querySelector(`[data-testid="order-line-${index}"]`))
    }
    const close = () => { ui.sheet = null; rerender() }
    const unit = unitPriceOf(r, sheet.notes)
    return h('div', { class: 'sheet-layer', onclick: e => { if (e.target === e.currentTarget) close() } },
      h('div', { class: 'sheet', testid: 'order-sheet', role: 'dialog', 'aria-label': r.name },
        h('div', { class: 'sheet-head' },
          svgBox(icon(r.icon || r.id), 'dish-icon'),
          h('div', null, h('b', { class: 'sheet-title' }, r.name), h('div', { class: 'muted' }, formatVND(unit) + ' / phần')),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Đóng', testid: 'sheet-close', onclick: close }, '✕')),
        // thân bảng cuộn được khi khung nhìn thấp; đầu bảng và hàng nút luôn thấy
        h('div', { class: 'sheet-body' },
          h('div', { class: 'qty-row' },
            h('span', null, S.labels.qty),
            h('button', { class: 'qty-btn', type: 'button', testid: 'qty-minus', disabled: sheet.qty <= 1, onclick: () => setQty(sheet.qty - 1), 'aria-label': 'Bớt' }, '−'),
            h('b', { class: 'qty-value', testid: 'qty-value' }, String(sheet.qty)),
            h('button', { class: 'qty-btn', type: 'button', testid: 'qty-plus', disabled: sheet.qty >= qtyMax, onclick: () => setQty(sheet.qty + 1), 'aria-label': 'Thêm' }, '+'),
            r && r.source === 'hiem' ? h('small', { class: 'sheet-rare muted' }, `★ còn ${rareMax} phần`) : null),
          notes.length ? h('div', { class: 'note-block' },
            h('div', { class: 'note-title' }, S.labels.notes),
            h('div', { class: 'note-chips' }, notes.map(n => h('button', {
              class: ['note-chip', sheet.notes.includes(n.id) ? 'on' : ''], type: 'button', testid: 'note-chip-' + n.id,
              'aria-pressed': sheet.notes.includes(n.id) ? 'true' : 'false', onclick: () => toggle(n)
            }, n.label, n.surcharge ? h('small', null, ' +' + formatVND(n.surcharge)) : null)))) : null),
        h('div', { class: 'sheet-actions' },
          editing ? h('button', {
            class: 'btn btn-danger', type: 'button', testid: 'remove-line',
            onclick: () => { removeLine(app.state, sheet.editIndex); ui.sheet = null; app.save(); rerender() }
          }, S.buttons.removeLine) : null,
          h('button', { class: 'btn btn-primary', type: 'button', testid: 'add-line', onclick: submit }, editing ? S.buttons.updateLine : 'Thêm vào phiếu'))))
  }

  // ---------- Khâu 2: Thanh toán (báo tổng) ----------

  function assistTotal() {
    return !!(app.state.settings.assistCash || (app.state.upgrades && app.state.upgrades.may_tinh))
  }

  function renderPayment(customer, c) {
    const body = h('div', { class: 'stage stage-pay' })
    body.appendChild(h('h3', { class: 'stage-title' }, 'Báo tổng tiền'))
    const top = h('div', { class: 'pay-top' }, renderPriceBoard(), renderDraftSummary(c.draft))
    body.appendChild(top)
    if (assistTotal()) {
      const total = priceOfLines(c.draft, R)
      if (!ui.assistFilled) { ui.digits = String(Math.round(total / 1000)); ui.assistFilled = true }
      body.appendChild(h('div', { class: 'assist', testid: 'assist-total' }, 'Máy tính: tổng phiếu ', h('b', null, formatVND(total))))
    }
    const reportBtn = h('button', {
      class: 'btn btn-primary report-btn', type: 'button', testid: 'report-total', disabled: !ui.digits,
      onclick: () => doReport(customer, pad.amount())
    }, 'Báo tổng')
    const pad = createNumpad({ value: ui.digits, action: reportBtn, onChange: d => { ui.digits = d; reportBtn.disabled = !d; app.sound('click') } })
    body.appendChild(pad.el)
    return body
  }

  function doReport(customer, amount) {
    const r = reportTotal(app.state, amount, app.ctx)
    if (r.result === 'khong_hop_le') { app.sound('error'); flash(el.querySelector('.numpad-display'), 'shake'); return }
    say('ban', `Dạ, tổng của mình là ${formatVND(amount)} ạ.`)
    say('khach', r.line)
    if (r.result === 'du') {
      app.sound('error')
      app.vibrate(40)
      ui.digits = ''
      if (r.reason === 'phieu_thua') app.toast('Phiếu ghi thừa món. Sửa phiếu rồi đọc lại cho khách nhé.', { kind: 'bad' })
      else app.toast('Khách thấy tổng cao quá. Cộng lại theo bảng giá rồi báo lại nhé.', { kind: 'bad' })
    } else {
      app.sound('coin')
      ui.digits = ''
      if (r.method === 'qr') say('khach', lineOf('qr_paid', customer, { total: amount }) || 'Mình chuyển khoản nha.')
    }
    app.save()
    rerender()
  }

  function renderPriceBoard() {
    const menu = orderableRecipes(app.state, app.ctx)
    const rows = []
    for (const id of menu) {
      const r = R[id]
      rows.push(h('li', null, h('span', null, r.name), h('b', null, formatVND(r.price))))
      for (const n of r.notes || []) if (n.surcharge) rows.push(h('li', { class: 'sub' }, h('span', null, '+ ' + n.label), h('b', null, formatVND(n.surcharge))))
    }
    return h('div', { class: 'price-board', testid: 'price-board' }, h('div', { class: 'price-title' }, 'Bảng giá'), h('ul', null, rows))
  }

  function renderDraftSummary(draft) {
    return h('div', { class: 'draft-summary' }, h('div', { class: 'price-title' }, 'Phiếu order'),
      h('ul', null, draft.map(l => {
        const r = R[l.recipeId]
        const notes = noteLabels(r, l.notes)
        return h('li', null, `${l.qty} × ${r ? r.name : l.recipeId}`, notes.length ? h('small', { class: 'draft-notes' }, ' ' + notes.map(upper).join(' · ')) : null)
      })))
  }

  // ---------- Khâu 3: Tính tiền ----------

  function renderCashier(customer, c) {
    const body = h('div', { class: 'stage stage-cash' })
    body.appendChild(h('h3', { class: 'stage-title' }, c.payMethod === 'qr' ? 'Nhận chuyển khoản' : 'Tính tiền, thối tiền'))
    const paid = c.payMethod === 'cash' ? c.changeDone : c.paid
    if (c.payMethod === 'qr') body.appendChild(renderQr(customer, c))
    else if (!c.changeDone) body.appendChild(renderCash(customer, c))
    if (paid) body.appendChild(renderReceipt(c))
    return body
  }

  function showChangeHint() {
    const s = sh()
    return s.day <= 3 || !!app.state.settings.assistCash
  }

  function renderCash(customer, c) {
    const s = sh()
    const due = changeRemaining(app.state)
    const trayAmt = drawerTotal(c.tray)
    const wrap = h('div', { class: 'cash' })
    wrap.appendChild(h('div', { class: 'cash-top' },
      h('div', { class: 'lid', 'aria-label': 'Nắp két' }, renderGivenCash(c.given)),
      h('div', { class: 'cash-facts' },
        h('div', null, 'Tổng: ', h('b', { testid: 'amount-due' }, formatVND(c.amountDue))),
        h('div', null, 'Khách đưa: ', h('b', null, formatVND(c.given ? c.given.total : 0))),
        c.changePaid > 0 ? h('div', null, 'Đã thối: ', h('b', null, formatVND(c.changePaid))) : null,
        showChangeHint() ? h('div', { class: 'change-hint', testid: 'change-hint', dataset: { amount: due } }, (c.changePaid > 0 ? 'Cần thối bù: ' : 'Cần thối: '), h('b', null, formatVND(due))) : null,
        // ngày đầu (đang hiện "Cần thối"): khay nhiều hơn số cần thối → cảnh báo đỏ trước khi đưa
        showChangeHint() && trayAmt > due ? h('div', { class: 'change-over', testid: 'change-over', role: 'status' }, 'Đang thối dư ', h('b', null, formatVND(trayAmt - due))) : null)))
    wrap.appendChild(renderTray(c.tray, {
      emptyText: due === 0 ? 'Không cần thối tiền' : null,
      onReturn: b => { if (trayRemove(app.state, b)) { app.sound('click'); app.save(); rerender() } }
    }))
    if (ui.lastAdded) {
      const node = wrap.querySelector(`[data-testid="tray-${ui.lastAdded}"]`)
      if (node) node.classList.add('just-added')
    }
    wrap.appendChild(renderDrawer(s.drawer, {
      onTake: b => { if (trayAdd(app.state, b)) { app.sound('coin'); ui.lastAdded = b; app.save(); rerender() } }
    }))
    const opts = changeOptions(app.state, app.ctx)
    if (opts.length) {
      wrap.appendChild(h('div', { class: 'card card-warn no-change', testid: 'no-change' },
        h('span', null, S.messages.noChange),
        h('button', { class: 'btn btn-secondary btn-small', type: 'button', testid: 'no-change-open', onclick: () => openNoChange(true) }, 'Chọn cách xử lý')))
      const key = c.customerId + ':' + c.changeOptionsUsed.length + ':' + c.changePaid
      if (ui.noChangeKey !== key) { ui.noChangeKey = key; setTimeout(() => openNoChange(false), 0) }
    }
    const exact = due === 0 && trayAmt === 0
    wrap.appendChild(h('div', { class: 'act-bar' }, h('button', {
      class: 'btn btn-primary btn-wide', type: 'button', testid: 'give-change', dataset: { exact: exact ? 'true' : 'false' },
      onclick: () => doGiveChange(customer)
    }, exact ? 'Không cần thối' : (c.changePaid > 0 ? 'Đưa tiền thối bù' : 'Đưa tiền thối'))))
    return wrap
  }

  function doGiveChange(customer) {
    const res = giveChange(app.state, app.ctx)
    if (!res.ok) return
    const said = res.given > 0 ? `Dạ thối mình ${formatVND(res.given)} ạ.` : 'Dạ mình đưa vừa đủ ạ, cảm ơn nhiều!'
    say('ban', said)
    if (res.correct) {
      app.sound('cash')
      say('khach', lineOf('change_ok', customer) || lineOf('thanks', customer))
      if (res.given > 0) app.toast(res.optimal ? 'Thối đúng · Thối gọn' : 'Thối đúng', { kind: 'good', duration: 1400 })
    } else if (res.diff < 0 && res.detected) {
      app.sound('error')
      app.vibrate(60)
      say('khach', res.line)
      app.toast(`Thối thiếu ${formatVND(-res.diff)}. Khách đòi thối bù.`, { kind: 'bad' })
    } else if (res.diff > 0 && res.returned) {
      say('khach', res.line)
      app.toast('Khách thật thà trả lại tiền thối dư.', { kind: 'info' })
    } else {
      say('khach', lineOf('thanks', customer))
    }
    app.save()
    rerender()
  }

  let noChangeOpen = false
  async function openNoChange(manual) {
    if (noChangeOpen || destroyed) return
    const c = counter()
    if (!c || c.stage !== 'tinh_tien') return
    const options = changeOptions(app.state, app.ctx)
    if (!options.length) return
    noChangeOpen = true
    const choice = await app.modal({
      title: 'Két không đủ tiền lẻ',
      text: `Cần thối ${formatVND(changeRemaining(app.state))} mà két không gom đủ tờ. Mình xử lý sao đây?`,
      icon: DI_SAU.lo,
      testid: 'no-change-modal',
      render: close => h('div', { class: 'choice-list' }, options.map(o => h('button', {
        class: 'choice', type: 'button', testid: 'no-change-' + o, onclick: () => close(o)
      }, h('b', null, NO_CHANGE_LABELS[o][0]), h('small', null, NO_CHANGE_LABELS[o][1])))),
      actions: [{ label: 'Để con xem lại két', value: null, kind: 'ghost', testid: 'no-change-cancel' }]
    })
    noChangeOpen = false
    if (!choice || destroyed) return
    const r = resolveNoChange(app.state, choice, app.ctx)
    if (!r.ok) return
    const customer = customerOf(counter())
    if (choice === 'xin_tien_le') {
      say('ban', 'Mình có tiền lẻ không ạ? Két em hết tiền lẻ rồi.')
      if (r.success) {
        say('khach', lineOf('no_small_change_yes', customer) || 'Có, đưa vừa đủ luôn.')
        app.toast(r.undone ? 'Khách trả lại tiền thối, lấy lại tờ lớn và đưa vừa đủ tiền.' : 'Khách đưa vừa đủ tiền.', { kind: 'good' })
      } else { say('khach', lineOf('no_small_change_no', customer) || 'Không có tiền lẻ rồi.'); app.toast('Khách không có tiền lẻ.', { kind: 'bad' }) }
    } else if (choice === 'moi_qr') {
      say('ban', 'Mình chuyển khoản giúp em được không ạ?')
      say('khach', lineOf('qr_ok', customer) || 'Được, để quét mã.')
      if (r.undone) app.toast('Khách trả lại tiền thối và lấy lại tiền mặt, sẽ chuyển khoản trọn hóa đơn.', { kind: 'info', duration: 2600 })
    } else if (choice === 'lam_tron') {
      if (r.success) app.toast(`Làm tròn: thối ${formatVND(r.newDue)} (dư ${formatVND(r.extra)} cho khách).`, { kind: 'info' })
      else app.toast('Két vẫn không đủ tiền để làm tròn.', { kind: 'bad' })
    }
    app.save()
    rerender()
  }

  function renderQr(customer, c) {
    const arrived = !!c.qrArrived
    const wrap = h('div', { class: 'qr' })
    wrap.appendChild(h('div', { class: 'qr-row' },
      h('div', { class: 'qr-stand' }, svgBox(fakeQrSvg(0), 'qr-img'), h('small', null, 'Mã QR của xe')),
      h('div', { class: 'qr-info' },
        h('div', null, 'Tổng: ', h('b', { testid: 'amount-due' }, formatVND(c.amountDue))),
        c.paid ? null : h('div', { class: 'phone-shot' }, h('small', null, 'Khách giơ điện thoại:'), h('b', null, '"Đã chuyển khoản"')),
        h('div', {
          class: ['qr-status', arrived ? 'arrived' : 'waiting'], testid: 'qr-status', dataset: { arrived: arrived ? 'true' : 'false' }, 'aria-live': 'polite'
        }, arrived ? fill(S.labels.qrArrived, { amount: formatVND(c.amountDue) }) : S.labels.qrWaiting))))
    if (!c.paid) {
      // M4: cúp điện theo lịch (sự kiện ngày) → Loa báo tiền tắt, không tự xác nhận, không chặn ảnh giả
      if (app.state.upgrades && app.state.upgrades.loa_bao_tien && !qrSpeakerOn(app.state)) {
        wrap.appendChild(h('p', { class: 'small qr-speaker-off', testid: 'qr-speaker-off' }, 'Cúp điện, Loa báo tiền đang tắt: tự xem tiền về đúng số rồi mới bấm.'))
      }
      wrap.appendChild(h('p', { class: 'muted small' }, 'Chỉ bấm "Đã nhận đủ" khi thông báo tiền về đúng số. Ảnh chụp màn hình không phải là tiền.'))
      wrap.appendChild(h('div', { class: 'action-row act-bar' },
        h('button', {
          class: 'btn btn-ghost', type: 'button', testid: 'qr-reject', onclick: () => doRejectQr()
        }, 'Từ chối ảnh giả'),
        h('button', {
          class: ['btn', 'btn-primary', arrived ? '' : 'btn-muted'], type: 'button', testid: 'qr-confirm',
          dataset: { ready: arrived ? 'true' : 'false' }, onclick: () => doConfirmQr()
        }, S.buttons.qrConfirm)))
    }
    return wrap
  }

  function doConfirmQr() {
    const r = confirmQr(app.state, app.ctx)
    if (r.ok && !r.fake) { app.sound('cash'); app.toast('Đã nhận tiền chuyển khoản.', { kind: 'good', duration: 1400 }) }
    else if (r.ok && r.fake) {
      app.sound('error'); app.vibrate(80)
      app.toast(app.data.DIALOGUE.anhKhoa.fakeQr, { kind: 'bad', title: 'Anh Khoa', duration: 3200 })
    } else if (r.blocked) app.toast('Loa báo tiền không kêu: ảnh chuyển khoản giả, khách bỏ đi.', { kind: 'good' })
    else if (r.reason === 'chua_ve') { app.sound('error'); app.toast(S.messages.qrNotArrived, { kind: 'bad' }) }
    app.save()
    rerender()
  }

  function doRejectQr() {
    const r = rejectQr(app.state, app.ctx)
    if (!r.ok) return
    if (r.fake) { app.sound('ding'); app.toast('Bắt được ảnh chuyển khoản giả! Khách ngượng ngùng bỏ đi.', { kind: 'good' }) }
    else { app.sound('error'); app.toast('Khách đã chuyển thật mà bị từ chối, khách bực bỏ đi.', { kind: 'bad' }) }
    app.save()
    rerender()
  }

  function renderReceipt(c) {
    const s = sh()
    const total = c.amountDue
    const listTotal = priceOfLines(c.draft, R)
    const noStr = '#' + String(s.nextTicketNo).padStart(3, '0')
    const full = railFull(app.state, app.ctx)
    const max = (app.data.BALANCE && app.data.BALANCE.ticketRailMax) || 3
    const methodLabel = c.payMethod === 'qr' ? S.labels.qr : S.labels.cash
    return h('div', { class: 'receipt-wrap' },
      h('div', { class: 'receipt', testid: 'receipt', dataset: { total } },
        h('div', { class: 'receipt-head' }, h('b', null, app.state.shopName || S.gameTitle), h('span', null, S.labels.receipt + ' ' + noStr)),
        h('ul', { class: 'receipt-lines' }, c.draft.map(l => {
          const r = R[l.recipeId]
          const unit = unitPriceOf(r, l.notes)
          const notes = noteLabels(r, l.notes)
          return h('li', null, h('span', null, `${l.qty} × ${r ? r.name : l.recipeId}`, notes.length ? h('small', null, ' (' + notes.join(', ').toLowerCase() + ')') : null), h('b', null, formatVND(unit * l.qty)))
        })),
        // tổng các dòng khác số đã báo (báo thiếu/thu thêm) → ghi rõ phần chênh để phiếu cộng khớp
        listTotal !== total ? h('div', { class: 'receipt-row', testid: 'receipt-adjust' },
          h('span', null, total < listTotal ? 'Thu thiếu' : 'Thu thêm'),
          h('span', null, (total < listTotal ? '−' : '+') + formatVND(Math.abs(listTotal - total)))) : null,
        h('div', { class: 'receipt-row total' }, h('span', null, S.labels.total), h('b', null, formatVND(total))),
        h('div', { class: 'receipt-row' }, h('span', null, 'Phương thức'), h('span', null, methodLabel)),
        c.payMethod === 'cash' && c.given ? h('div', { class: 'receipt-row' }, h('span', null, S.labels.given), h('span', null, formatVND(c.given.total))) : null,
        c.payMethod === 'cash' ? h('div', { class: 'receipt-row' }, h('span', null, 'Tiền thối'), h('span', null, formatVND(c.changePaid))) : null,
        c.payMethod === 'cash' && c.rounding > 0 ? h('div', { class: 'receipt-row small', testid: 'receipt-rounding' }, h('span', null, 'Trong đó làm tròn cho khách'), h('span', null, formatVND(c.rounding))) : null),
      h('div', { class: 'act-bar' },
        full ? h('p', { class: 'rail-full-note', testid: 'rail-full' }, fill(S.messages.kitchenFull, { n: s.tickets.length, max })) : null,
        h('button', {
          class: 'btn btn-primary btn-wide', type: 'button', testid: 'clip-ticket', disabled: full,
          onclick: () => doClip()
        }, 'Kẹp phiếu bếp')))
  }

  function doClip() {
    const customer = customerOf(counter())
    const r = clipTicket(app.state, app.ctx)
    if (!r.ok) {
      app.sound('error')
      if (r.reason === 'bep_day') app.toast('Bếp đang đầy, làm bớt món rồi kẹp phiếu nhé.', { kind: 'bad' })
      else if (r.reason === 'chua_thanh_toan') app.toast('Thu tiền xong mới kẹp phiếu bếp nhé.', { kind: 'bad' })
      rerender()
      return
    }
    app.sound('paper')
    app.toast(`Đã kẹp phiếu ${r.ticket.no} lên dây bếp. ${customer ? customer.name + ' chờ món.' : ''}`, { kind: 'good', duration: 1800 })
    app.save()
    rerender()
  }

  // ---------- Hướng dẫn ngày 1 ----------

  function tutorialStep(c) {
    if (c.stage === 'order') {
      if (ui.sheet) return 'add-line'
      if (!c.draft.length) {
        const customer = customerOf(c)
        return 'menu-item-' + (customer && customer.request[0] ? customer.request[0].recipeId : '')
      }
      return c.readbackDone ? 'confirm-order' : 'readback'
    }
    if (c.stage === 'thanh_toan') return 'report-total'
    if (c.stage === 'tinh_tien') {
      const paid = c.payMethod === 'cash' ? c.changeDone : c.paid
      if (paid) return 'clip-ticket'
      return c.payMethod === 'qr' ? 'qr-confirm' : 'give-change'
    }
    return null
  }

  function tutorialHint(c) {
    const T = D.diSau.tutorial || {}
    const step = tutorialStep(c) || ''
    if (step.startsWith('menu-item') || step === 'add-line') return T.order
    if (step === 'readback') return T.readback
    if (step === 'confirm-order') return 'Khách nghe xong thấy đúng rồi, bấm "Chốt order" nha con.'
    if (step === 'report-total') return T.total
    if (step === 'give-change') {
      // khách đưa vừa đủ: đừng bảo lấy tiền thối (làm theo là thối dư); khay dư thì nhắc trả về két
      const due = changeRemaining(app.state)
      const tray = drawerTotal(c.tray)
      if (due === 0 && tray === 0) return T.noChange || T.change
      if (tray > due && T.overChange) return fill(T.overChange, { amount: formatVND(tray - due) })
      return T.change
    }
    if (step === 'clip-ticket') return T.ticket
    return ''
  }

  function applyGlow(c) {
    const step = tutorialStep(c)
    if (!step) return
    const sel = `[data-testid="${step}"]`
    const sheetNode = sheetPortal.node()
    const target = (sheetNode && sheetNode.querySelector(sel)) || el.querySelector(sel)
    if (target) target.classList.add('glow')
  }

  // ---------- Vòng đời ----------

  function noteLabels(r, ids) {
    return (ids || []).map(id => { const n = r && (r.notes || []).find(x => x.id === id); return n ? n.label : '' }).filter(Boolean)
  }

  render()

  return {
    el,
    update() {
      if (destroyed) return
      if (stateSig() !== sig) render()
    },
    onShow() { render() },
    onHide() { if (ui.sheet) { ui.sheet = null; render() } },
    unmount() { destroyed = true; sheetPortal.set(null); el.remove() }
  }
}

export default {
  mount(root, app, params) {
    return mountCounter(root, app, params || {})
  }
}
