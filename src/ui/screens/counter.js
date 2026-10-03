// Panel Quầy: Order → Thanh toán → Tính tiền (→ kẹp phiếu, khách sang Làm đồ).
// Vẽ lại panel khi state quầy đổi (stateSig); trạng thái giao diện tạm (bảng trượt, số đang gõ) giữ ở `ui`.
// M5 Đợt 2: tệp này chỉ còn phần điều phối — mount, stateSig, vẽ lại, portal bảng chọn món, cuộn theo khâu, lớp co-fit theo
// chiều cao panel, hướng dẫn ngày 1 (gợi ý + viền sáng), quầy trống, tourSpot. Phần dựng từng khâu nằm ở các module cùng
// thư mục, nhận chung một ctx (bên dưới): counter-order.js (khách ở quầy, Order, bảng chọn món — thành phần BỀN theo khách,
// vẽ lại chỉ update tại chỗ), counter-pay.js (Thanh toán), counter-cash.js (tiền mặt, két, hộp két hết tiền lẻ),
// counter-qr.js (chuyển khoản), counter-receipt.js (phiếu thu, kẹp phiếu) — các khâu này dựng mới mỗi lần vẽ lại.
// Vẽ lại không gỡ nút bền (khách, khâu Order): chỉ thay các nút con khác của panel, nên hoạt ảnh của chúng không chạy lại.
// Hiệu ứng (Đợt 2) chỉ kích theo SỰ KIỆN (thao tác / bus), không kích trong render(): vẽ lại không phát lại hoạt ảnh.
// Lời Dì Sáu ngày 1 (tutor-hint, placeTutor): một nút bền cho cả panel; phiếu order còn trống thì nằm dưới bong bóng khách
// (đầu panel, lúc đó panel ở đầu), còn lại dán như tờ giấy nhắc NGAY TRÊN hàng nút dính đáy của khâu (.act-bar) — các hàm
// cuộn của mọi khâu đo theo mép trên .act-bar nên không cuộn lời nhắc ra khỏi màn. Khâu Thanh toán không có hàng nút (phím
// "Báo tổng" nằm trong máy tính tiền): lời nhắc một dòng nằm ngay trên máy tính tiền (máy được cuộn trọn vào màn nên dòng
// ngay trên nó lộ theo). Sau khi thu tiền: cuộn cho đầu phiếu thu (và hàng Tổng nếu đủ chỗ) lọt màn (revealReceipt).
import { h, svgBox, createPortal } from '../dom.js'
import { DI_SAU } from '../art.js'
import { DI_SAU_POSES } from '../art/people.js'
import { scene } from '../art/scene.js'
import { changeRemaining } from '../../core/order.js'
import { personaObj } from '../../core/customer.js'
import { drawerTotal } from '../../core/money.js'
import { fill, formatVND } from '../format.js'
import { paintCustomer, paintOrder, paintSheet, dropOrder, dropAll, sheetOpen, customerSlot, stripInset, diSauFace } from './counter-order.js'
import { renderPayment } from './counter-pay.js'
import { renderCash } from './counter-cash.js'
import { renderQr } from './counter-qr.js'
import { renderReceipt } from './counter-receipt.js'

// Ngưỡng chiều cao vùng cuộn của panel (px) cho bố cục gọn: thấp (360×600, 320×568, iPhone có thanh Safari) và rất thấp
// (iPhone SE có vùng an toàn: panel còn ~190px) — khách + bong bóng thu gọn để hàng thẻ món đầu lộ trên hàng nút dính đáy.
export const FIT_LOW = 420
export const FIT_TINY = 250

/** Lớp bố cục theo chiều cao panel: '' | 'low' | 'tiny' (0 = chưa đo được → null, giữ lớp cũ). */
export function fitOf(height) {
  const v = Number(height) || 0
  if (v <= 0) return null
  return v < FIT_TINY ? 'tiny' : v < FIT_LOW ? 'low' : ''
}

/** Câu đầu của một lời nhắc ("Nhìn bảng giá, cộng tổng rồi báo khách. Gõ theo nghìn…" → câu đầu); không tách được → cả lời. */
export function firstSentence(text) {
  const s = String(text || '').trim()
  const m = /^.+?[.!?…](?=\s|$)/.exec(s)
  return m ? m[0] : s
}

// Dáng Dì Sáu ở quầy trống: khách đang tới → vỗ tay đón; dây bếp có phiếu → giơ ngón cái (qua Bếp đi con); quầy vắng →
// lau mồ hôi nghỉ tay.
function idlePose(s) {
  if (s.queue.length) return 'vo_tay'
  if (s.tickets.length) return 'ngon_cai'
  return 'lau_mo_hoi'
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
  let idle = null      // { key, el } quầy trống đang hiện (giữ nút khi nội dung không đổi)
  let glowEl = null    // nút đang có viền sáng hướng dẫn ngày 1
  // lời Dì Sáu ngày 1: nút bền, chỉ đổi chữ / chỗ đặt (không hoạt ảnh: vẽ lại không phát lại gì)
  const tutorText = h('span', { class: 'co-tutor-text' })
  const tutor = h('div', { class: 'co-tutor', testid: 'tutor-hint', role: 'note' }, svgBox(diSauFace('vui'), 'co-tutor-face'), tutorText)
  let tutorHost = null // .act-bar đang chứa lời Dì Sáu (gắn lớp co-has-tutor)
  const tutorDock = h('div', { class: 'act-bar co-tutor-dock' })   // hàng dính riêng ngay trên hàng nút của khâu khác
  // Bảng chọn món gắn ở lớp nổi gốc của app, KHÔNG nằm trong panel Quầy (vùng cuộn): iOS Safari cắt lớp phủ nằm trong
  // vùng cuộn theo khung panel nên thanh tab Quầy/Bếp che mất nút "Thêm vào phiếu" (lỗi trên iPhone thật).
  const sheetPortal = createPortal(app.overlay || root)

  function freshUi(customerId) {
    return { customerId, sheet: null, talk: [], digits: '', readback: null, noChangeKey: '', assistFilled: false, lastAdded: null, stageKey: null, reading: false, padMood: null }
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

  function noteLabels(r, ids) {
    return (ids || []).map(id => { const n = r && (r.notes || []).find(x => x.id === id); return n ? n.label : '' }).filter(Boolean)
  }

  // ctx chung cho các module khâu (counter-order/pay/cash/qr/receipt.js). `ui` là getter: trạng thái giao diện tạm được
  // làm mới khi đổi khách (freshUi), module đọc ctx.ui mỗi lần dùng nên luôn trúng trạng thái của khách đang ở quầy.
  const ctx = {
    app, el, root, opts, R, S, D, sheetPortal,
    get ui() { return ui },
    sh, counter, customerOf, say, lineOf, noteLabels,
    rerender: () => rerender(),
    revealAboveBar: node => revealAboveBar(node),
    tutorialHint: c => tutorialHint(c),
    destroyed: () => destroyed
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

  // Thay nút con của panel bằng danh sách nodes mà KHÔNG gỡ nút đang đứng đúng chỗ (khách, khâu Order bền theo khách).
  function setChildren(nodes) {
    let i = 0
    for (const n of nodes) {
      const cur = el.children[i]
      if (cur !== n) el.insertBefore(n, cur || null)
      i++
    }
    while (el.children.length > nodes.length) el.lastElementChild.remove()
  }

  // Lớp bố cục gọn theo chiều cao vùng cuộn (ResizeObserver gọi lại khi panel đổi cỡ: xoay máy, dải phố co lại…).
  function fit() {
    if (destroyed) return
    const k = fitOf(root && root.clientHeight)
    if (k === null) return
    el.classList.toggle('co-fit-low', k === 'low' || k === 'tiny')
    el.classList.toggle('co-fit-tiny', k === 'tiny')
    syncDock()
  }

  function render() {
    const s = sh()
    const c = counter()
    const customer = customerOf(c)
    if ((customer ? customer.id : null) !== ui.customerId) ui = freshUi(customer ? customer.id : null)
    const scroll = el.scrollTop
    el.dataset.stage = c ? c.stage : ''
    fit()
    if (!s) { dropAll(ctx); idle = null; setChildren([]); sheetPortal.set(null); return }
    const nodes = []
    if (!c || !customer) {
      dropAll(ctx)
      nodes.push(renderIdle(s))
    } else {
      idle = null
      nodes.push(paintCustomer(ctx, customer, c))
      if (c.stage === 'order') nodes.push(paintOrder(ctx, customer, c))
      else {
        dropOrder(ctx)
        if (c.stage === 'thanh_toan') nodes.push(renderPayment(ctx, customer, c))
        else if (c.stage === 'tinh_tien') nodes.push(renderCashier(customer, c))
      }
    }
    setChildren(nodes)
    paintSheet(ctx, c)
    placeTutor(c, customer)
    const glowMoved = applyGlow(c, customer)
    el.scrollTop = scroll
    sig = stateSig()
    ui.lastAdded = null
    // sang khâu mới: cuộn panel để phần thao tác của khâu đó lọt vào màn hình
    const stageKey = c && customer ? [customer.id, c.stage, isPaid(c)].join(':') : ''
    const stageMoved = stageKey !== ui.stageKey
    if (stageMoved) {
      ui.stageKey = stageKey
      if (c) revealStage(c)
    }
    // ngày 1: nút được tô sáng vừa đổi mà còn khuất dưới hàng nút dính đáy (màn thấp) → cuộn cho thấy
    if (glowMoved && glowEl) revealGlow(glowEl)
  }

  const isPaid = c => !!(c && (c.payMethod === 'cash' ? c.changeDone : c.paid))

  function revealStage(c) {
    const sc = root
    if (!sc || destroyed || !sc.getBoundingClientRect) return
    if (c.stage === 'order') { sc.scrollTop = 0; return }
    const st = el.querySelector('.stage')
    if (!st) return
    const paper = c.stage === 'tinh_tien' && isPaid(c) ? st.querySelector('[data-testid="receipt"]') : null
    if (paper) { revealReceipt(st, paper); return }
    const a = st.getBoundingClientRect(), b = sc.getBoundingClientRect()
    const over = a.bottom - b.bottom
    // đẩy lên vừa đủ để thấy đáy khâu, nhưng không đẩy tiêu đề khâu ra khỏi màn hình
    if (over > 0) sc.scrollTop += Math.min(over, Math.max(0, a.top - b.top))
  }

  // Vừa thu tiền xong (két / điện thoại thu lại, phiếu thu hiện): nội dung panel đổi hẳn cao thấp nên vị trí cuộn cũ có thể
  // để đầu phiếu nằm trên mép panel. Thứ tự ưu tiên trong phần nhìn thấy (dưới mép trên, trên hàng nút dính đáy):
  // cả khâu (tiêu đề → đáy phiếu) → trọn tờ phiếu (đáy phiếu sát hàng nút, phía trên lộ thêm được bao nhiêu thì lộ) →
  // đầu phiếu (tên xe, "Phiếu thu #00n") sát mép trên, hàng Tổng lộ nếu còn đủ chỗ.
  function revealReceipt(st, paper) {
    const sc = root
    const box = sc.getBoundingClientRect()
    if (!box.height) return
    const bar = st.querySelector('.act-bar')
    const br = bar ? bar.getBoundingClientRect() : null
    const top = box.top + 4
    const limit = (br && br.height ? Math.min(box.bottom, br.top) : box.bottom) - 4
    const room = limit - top
    const a = st.getBoundingClientRect()
    const p = paper.getBoundingClientRect()
    if (room <= 0 || !p.height) return
    const pTop = p.top - 12   // chừa mép răng cưa trên đầu tờ phiếu
    let d
    if (p.bottom - a.top <= room) d = a.top < top ? a.top - top : Math.max(0, p.bottom - limit)
    else if (p.bottom - pTop <= room) d = p.bottom - limit
    else d = pTop - top
    if (Math.abs(d) >= 1) sc.scrollTop += d
  }

  // Đặt lời Dì Sáu (ngày 1) theo khâu:
  //   'under'  phiếu order trống → dưới bong bóng khách (panel đang ở đầu);
  //   'dock'   khâu có hàng nút dính đáy → tờ giấy nhắc dính ngay trên hàng nút. Hàng nút "Đọc lại đơn / Chốt order" của
  //            khâu Order (của gói này) nhận lời nhắc làm dòng đầu; hàng nút của khâu khác (Tính tiền, chuyển khoản, phiếu
  //            thu — bố cục riêng của module khâu) giữ nguyên, lời nhắc nằm trong một hàng dính riêng .act-bar.co-tutor-dock
  //            đứng NGAY TRƯỚC nó, ôm luôn chỗ của hàng nút (syncDock). Hàng dính riêng là .act-bar đầu tiên của panel nên
  //            mọi hàm cuộn "lọt trên hàng nút" (đo mép trên .act-bar đầu tiên) chừa luôn lời nhắc.
  //            Panel rất thấp (.co-fit-tiny, ~190px): hàng riêng KHÔNG dính (bỏ lớp act-bar, nằm theo dòng ngay trên hàng
  //            nút) — dính thêm một hàng ở đó sẽ đè kín két / phím, người chơi cuộn tới cuối khâu thì đọc được;
  //   'inline' khâu không có hàng nút (Thanh toán) → ngay trên phần thao tác cuối của khâu, chỉ câu đầu của lời nhắc cho gọn
  //            một dòng (phần "gõ theo nghìn" đã in sẵn trên máy tính tiền).
  // Không có lời → gỡ ra.
  function placeTutor(c, customer) {
    const full = c && customer && customer.tutorial ? (tutorialHint(c) || '') : ''
    let host = null
    let ref = null
    let mode = ''
    if (full) {
      if (c.stage === 'order' && !c.draft.length) { host = customerSlot(ctx); mode = 'under' }
      else {
        const st = el.querySelector('.stage')
        const bar = st ? [...st.querySelectorAll('.act-bar')].find(b => b !== tutorDock && !b.contains(tutorDock)) : null
        if (bar) {
          mode = 'dock'
          if (c.stage === 'order') host = bar
          else { host = tutorDock; ref = bar }
        } else if (st) {
          const kids = [...st.children].filter(n => n !== tutor)
          ref = kids.length > 1 ? kids[kids.length - 1] : null
          host = st
          mode = 'inline'
        }
      }
    }
    const hint = mode === 'inline' ? firstSentence(full) : full
    if (tutorText.textContent !== hint) tutorText.textContent = hint
    const inBar = mode === 'dock' && host !== tutorDock
    if (tutorHost && tutorHost !== host) tutorHost.classList.remove('co-has-tutor')
    tutorHost = inBar ? host : null
    if (tutorDock.parentNode && host !== tutorDock) tutorDock.remove()
    if (!host) { if (tutor.parentNode) tutor.remove(); return }
    tutor.classList.toggle('is-dock', mode === 'dock')
    tutor.classList.toggle('is-inline', mode === 'inline')
    if (inBar) {
      host.classList.add('co-has-tutor')
      if (host.firstElementChild !== tutor) host.insertBefore(tutor, host.firstChild)
    } else if (host === tutorDock) {
      if (tutorDock.parentNode !== ref.parentNode || tutorDock.nextElementSibling !== ref) ref.parentNode.insertBefore(tutorDock, ref)
      if (tutor.parentNode !== tutorDock) tutorDock.appendChild(tutor)
      syncDock()
    } else if (mode === 'inline') {
      if (tutor.parentNode !== host || tutor.nextElementSibling !== ref) host.insertBefore(tutor, ref)
    } else if (host.lastElementChild !== tutor) host.appendChild(tutor)
  }

  // Hàng dính riêng của lời nhắc: dính đáy (bottom 0) với phần đệm dưới đúng bằng chiều cao hàng nút của khâu và lề dưới âm
  // cùng cỡ — hàng nút (đứng sau, vẽ đè lên) nằm gọn trong phần đệm đó, tờ giấy nhắc lộ ngay trên. Nhờ vậy chiều cao hàng
  // dính riêng = lời nhắc + hàng nút: hàm cuộn nào chừa "thanh dính cao nhất" (vd tour) cũng chừa đủ. Đo lại mỗi lần vẽ /
  // đổi bố cục. Panel rất thấp: hàng thường theo dòng (không phải .act-bar, không dính, không đệm).
  function syncDock() {
    const flat = el.classList.contains('co-fit-tiny')
    tutorDock.classList.toggle('act-bar', !flat)
    tutorDock.classList.toggle('is-flat', flat)
    const bar = tutorDock.nextElementSibling
    const hgt = !flat && tutorDock.isConnected && bar ? Math.max(0, Math.round(bar.offsetHeight || 0)) : 0
    const pad = hgt ? hgt + 'px' : ''
    const mar = hgt ? -hgt + 'px' : ''
    if (tutorDock.style.paddingBottom !== pad) tutorDock.style.paddingBottom = pad
    if (tutorDock.style.marginBottom !== mar) tutorDock.style.marginBottom = mar
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

  // Quầy trống: Dì Sáu đứng sau quầy (dáng theo tình huống) + tấm giấy ghi lời nhắn, nút "Qua Bếp" khi dây bếp có phiếu.
  function renderIdle(s) {
    const waiting = Object.values(s.customers).filter(c => c.status === 'cho_mon' || c.status === 'nhan_mon')
    const pose = idlePose(s)
    const title = s.queue.length ? 'Khách đang tới quầy…' : 'Quầy đang trống'
    const text = s.tickets.length
      ? `Dây bếp có ${s.tickets.length} phiếu. Qua Bếp làm món cho khách nhé!`
      : (waiting.length ? 'Khách đang chờ món.' : 'Chờ khách ghé xe…')
    const go = !!(s.tickets.length && opts.switchTab)
    const key = JSON.stringify([pose, title, text, go])
    if (idle && idle.key === key) return idle.el
    const art = (DI_SAU_POSES && DI_SAU_POSES[pose]) || DI_SAU.vui
    const icon = scene('tab_bep')
    const node = h('div', { class: 'counter-idle co-idle', testid: 'counter-idle', dataset: { pose } },
      h('div', { class: 'co-idle-scene', 'aria-hidden': 'true' },
        h('span', { class: 'co-idle-bob' }, svgBox(art, 'co-idle-art')),
        h('div', { class: 'co-idle-counter g-wood g-wood--flat' })),
      h('div', { class: 'co-idle-card g-paper' },
        h('p', { class: 'idle-title co-idle-title' }, title),
        h('p', { class: 'co-idle-text' }, text),
        go
          ? h('button', { class: 'g-btn g-btn--gold co-idle-go', type: 'button', testid: 'go-kitchen', onclick: () => opts.switchTab('kitchen') },
            icon ? svgBox(icon, 'g-ico') : null, h('span', null, 'Qua Bếp'))
          : null))
    idle = { key, el: node }
    return node
  }

  // ---------- Khâu 3: Tính tiền (tiền mặt hoặc chuyển khoản, rồi phiếu thu) ----------

  function renderCashier(customer, c) {
    const body = h('div', { class: 'stage stage-cash' })
    body.appendChild(h('h3', { class: 'stage-title' }, c.payMethod === 'qr' ? 'Nhận chuyển khoản' : 'Tính tiền, thối tiền'))
    const paid = c.payMethod === 'cash' ? c.changeDone : c.paid
    if (c.payMethod === 'qr') body.appendChild(renderQr(ctx, customer, c))
    else if (!c.changeDone) body.appendChild(renderCash(ctx, customer, c))
    if (paid) body.appendChild(renderReceipt(ctx, c))
    return body
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

  // Viền sáng hướng dẫn: nút trong khâu Order / bảng chọn (thành phần co-) có vòng sáng riêng (span .co-glow-ring, chỉ
  // nhịp opacity, không đè bóng 3D của nút); nút của các khâu sau giữ lớp .glow cũ (base.css). Nút bền giữ nguyên vòng
  // sáng qua các lần vẽ lại (không chạy lại nhịp); đổi bước thì gỡ ở nút cũ.
  function glowOn(t) {
    if (t.closest && t.closest('.co-order, .co-sheet-layer')) {
      t.classList.add('co-glow')
      if (![...t.children].some(n => n.classList.contains('co-glow-ring'))) t.appendChild(h('span', { class: 'co-glow-ring', 'aria-hidden': 'true' }))
    } else t.classList.add('glow')
  }
  function glowOff(t) {
    t.classList.remove('glow', 'co-glow')
    for (const n of [...t.children]) if (n.classList.contains('co-glow-ring')) n.remove()
  }

  // → true nếu nút được tô sáng vừa đổi.
  function applyGlow(c, customer) {
    const step = c && customer && customer.tutorial ? tutorialStep(c) : null
    let target = null
    if (step) {
      const sel = `[data-testid="${step}"]`
      const sheetNode = sheetPortal.node()
      target = (sheetNode && sheetNode.querySelector(sel)) || el.querySelector(sel)
    }
    if (glowEl && glowEl !== target) glowOff(glowEl)
    const moved = !!target && target !== glowEl
    if (moved) glowOn(target)
    glowEl = target
    return moved
  }

  // Cuộn panel (tức thì) để nút được tô sáng nằm trọn phía trên hàng nút dính đáy, không đẩy đầu nút khuất mép trên.
  function revealGlow(t) {
    const sc = root
    if (destroyed || !sc || !sc.getBoundingClientRect || !el.contains(t)) return
    // nút nằm trong một hàng dính đáy thì luôn thấy
    if (t.closest('.act-bar')) return
    const bar = el.querySelector('.act-bar')
    const box = sc.getBoundingClientRect()
    if (!box.height) return
    const limit = bar && bar.getBoundingClientRect().height ? Math.min(box.bottom, bar.getBoundingClientRect().top) : box.bottom
    const r = t.getBoundingClientRect()
    const over = r.bottom - (limit - 8)
    if (over > 0) sc.scrollTop += Math.min(over, Math.max(0, r.top - box.top - stripInset(ctx) - 8))
  }

  // ---------- Vòng đời ----------

  render()
  const ro = typeof ResizeObserver === 'function' && root ? new ResizeObserver(() => fit()) : null
  if (ro) ro.observe(root)

  // Hướng dẫn lần đầu: chỗ đang làm ở Quầy (màn ca bán chọn tour theo chỗ này).
  // 'idle' (quầy trống) | 'order' | 'order-sheet' (bảng chọn món đang mở) | 'thanh_toan' | 'tinh_tien' | 'qr' | 'receipt'
  function tourSpot() {
    const c = counter()
    if (destroyed || !c || !customerOf(c)) return 'idle'
    if (c.stage === 'order') return ui.sheet && sheetOpen(ctx) ? 'order-sheet' : 'order'
    if (c.stage === 'thanh_toan') return 'thanh_toan'
    if (c.stage === 'tinh_tien') {
      const paid = c.payMethod === 'cash' ? c.changeDone : c.paid
      if (paid) return 'receipt'
      return c.payMethod === 'qr' ? 'qr' : 'tinh_tien'
    }
    return 'idle'
  }

  return {
    el,
    tourSpot,
    update() {
      if (destroyed) return
      if (stateSig() !== sig) render()
    },
    onShow() { render() },
    onHide() { if (ui.sheet) { ui.sheet = null; render() } },
    unmount() {
      destroyed = true
      if (ro) ro.disconnect()
      dropAll(ctx)
      sheetPortal.set(null)
      glowEl = null
      tutorHost = null
      el.remove()
    }
  }
}

export default {
  mount(root, app, params) {
    return mountCounter(root, app, params || {})
  }
}
