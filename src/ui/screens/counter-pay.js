// Quầy, khâu 2 (Thanh toán): báo tổng tiền — bảng giá phấn (hình món, giá, phần cộng thêm của ghi chú), phiếu order tóm
// tắt bằng hình món nhỏ, dòng "Máy tính" (Hỗ trợ tính tiền / nâng cấp máy tính), máy tính tiền có màn LED, phím bánh kẹo
// và phím "Báo tổng" cao ở cột phải.
// M5 Đợt 2 (gói Q-B): giao diện mới, luật / tiền / điểm giữ nguyên (lõi reportTotal). Mọi hàm nhận ctx chung của panel
// Quầy (counter.js: makeCtx). Import trong Node được: không chạm DOM ở cấp module.
// Hiệu ứng chỉ chạy theo SỰ KIỆN trong doReport (không trong renderPayment): khách nhận tổng → "keng" + dấu ✓ nảy trên bản
// sao màn LED (nhân bản rồi để ở lớp hiệu ứng, panel vẽ lại tự do); báo sai → màn LED rung + viền đỏ (âm error).
import { h, svgBox } from '../dom.js'
import { scene } from '../art/scene.js'
import { reportTotal, priceOfLines } from '../../core/order.js'
import { orderableRecipes } from '../../core/customer.js'
import { createNumpad } from '../components/numpad.js'
import { dishArt } from '../components/menu-board.js'
import { noteIcon } from '../components/note-icons.js'
import { isReduced } from '../motion.js'
import { formatVND, formatK } from '../format.js'

// Bàn phím đang hiện của từng panel Quầy (ctx): báo sai thì panel vẽ lại rồi mới rung màn LED của bàn phím MỚI.
const padOf = new WeakMap()

// Dấu ✓ (SVG tự vẽ, viền mực) cho bản sao màn LED khi khách nhận tổng.
const CHECK_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="#43a63d" stroke="#3a2618" stroke-width="3"/>' +
  '<path d="M10.5 19.5A15 15 0 0 1 27 9.4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".45"/>' +
  '<path d="M14 25L21 32L34.5 17" fill="none" stroke="#3a2618" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M14 25L21 32L34.5 17" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'

// Chuông máy tính tiền trên phím "Báo tổng" (trang trí, không có chữ: chữ nút giữ đúng "Báo tổng").
const BELL_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="#3a2618" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">' +
  '<circle cx="16" cy="25.6" r="2.8" fill="#a87404"/>' +
  '<path d="M7.6 22.4C8.2 14.6 10.4 8.6 16 8.6C21.6 8.6 23.8 14.6 24.4 22.4L26.4 24.6H5.6Z" fill="#f7b928"/>' +
  '<path d="M18.6 9.4C21.8 11 23.4 15.4 24 21.6L25 22.8H20.6C20.6 16.6 20 12.2 18.6 9.4Z" fill="#d48f0a" stroke="none"/>' +
  '<circle cx="16" cy="6.4" r="2.2" fill="#f7b928"/>' +
  '<path d="M11.4 20.4C11.6 15.6 12.6 12.4 14.8 11.2" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/></g></svg>'

// Máy tính tự điền tổng phiếu: bật Hỗ trợ tính tiền hoặc đã mua nâng cấp máy tính.
export function assistTotal(ctx) {
  const { app } = ctx
  return !!(app.state.settings.assistCash || (app.state.upgrades && app.state.upgrades.may_tinh))
}

export function renderPayment(ctx, customer, c) {
  const { app, R } = ctx
  const body = h('div', { class: 'stage stage-pay cs-pay' })
  body.appendChild(h('h3', { class: 'stage-title cs-title' }, svgBox(scene('khau_thanh_toan'), 'cs-title-ico'), 'Báo tổng tiền'))
  body.appendChild(h('div', { class: 'cs-pay-top' }, renderPriceBoard(ctx), renderDraftSummary(ctx, c.draft)))
  if (assistTotal(ctx)) {
    const total = priceOfLines(c.draft, R)
    if (!ctx.ui.assistFilled) { ctx.ui.digits = String(Math.round(total / 1000)); ctx.ui.assistFilled = true }
    body.appendChild(h('div', { class: 'cs-assist', testid: 'assist-total' }, 'Máy tính: tổng phiếu ', h('b', null, formatVND(total))))
  }
  const reportBtn = h('button', {
    class: 'g-btn g-btn--go cs-report', type: 'button', testid: 'report-total', disabled: !ctx.ui.digits,
    onclick: () => doReport(ctx, customer, pad.amount())
  }, h('span', { class: 'cs-report-bell', 'aria-hidden': 'true', html: BELL_SVG }), h('span', { class: 'cs-report-text' }, 'Báo tổng'))
  const pad = createNumpad({
    value: ctx.ui.digits, action: reportBtn, reduced: () => isReduced(app),
    onChange: d => { ctx.ui.digits = d; reportBtn.disabled = !d; app.sound('click') }
  })
  padOf.set(ctx, pad)
  body.appendChild(pad.el)
  return body
}

// "Báo tổng": số không hợp lệ → rung màn số; báo dư → khách chê, báo lại; đúng / thiếu → sang Tính tiền
// (khách không biết mình được tính thiếu nên giao diện cũng không lộ: cùng một tiếng "keng" và dấu ✓ "khách nhận tổng").
export function doReport(ctx, customer, amount) {
  const { app } = ctx
  const led = ctx.el.querySelector('[data-testid="numpad-display"]')
  const r = reportTotal(app.state, amount, app.ctx)
  if (r.result === 'khong_hop_le') { app.sound('error'); ledWrong(ctx); return }
  // chụp màn LED TRƯỚC khi panel vẽ lại (nhân bản rồi để dấu ✓ nảy ở lớp hiệu ứng)
  const ghost = r.result === 'du' ? null : captureLed(ctx, led)
  ctx.say('ban', `Dạ, tổng của mình là ${formatVND(amount)} ạ.`)
  ctx.say('khach', r.line)
  if (r.result === 'du') {
    app.sound('error')
    app.vibrate(40)
    ctx.ui.digits = ''
    if (r.reason === 'phieu_thua') app.toast('Phiếu ghi thừa món. Sửa phiếu rồi đọc lại cho khách nhé.', { kind: 'bad' })
    else app.toast('Khách thấy tổng cao quá. Cộng lại theo bảng giá rồi báo lại nhé.', { kind: 'bad' })
  } else {
    app.sound('keng')
    ctx.ui.digits = ''
    if (r.method === 'qr') ctx.say('khach', ctx.lineOf('qr_paid', customer, { total: amount }) || 'Mình chuyển khoản nha.')
  }
  app.save()
  ctx.rerender()
  if (r.result === 'du') { if (r.reason !== 'phieu_thua') ledWrong(ctx) } else { revealStageTop(ctx); okStamp(app, ghost) }
}

// Sang khâu Tính tiền mà panel còn cuộn ở bàn phím (khung thấp): kéo đầu khâu mới (tiền khách đưa, tổng) vào màn hình.
function revealStageTop(ctx) {
  const sc = ctx.root
  const st = ctx.el.querySelector('.stage')
  if (!sc || !st || typeof sc.getBoundingClientRect !== 'function' || ctx.destroyed()) return
  const over = st.getBoundingClientRect().top - sc.getBoundingClientRect().top
  if (over < 0) sc.scrollTop += over
}

// Báo sai: màn LED của bàn phím đang hiện viền đỏ, khung màn rung (giảm chuyển động: vfx tự đổi thành viền đỏ tĩnh).
function ledWrong(ctx) {
  const pad = padOf.get(ctx)
  if (!pad || !pad.el.isConnected) return
  const frame = pad.wrong()
  const fx = ctx.app.vfx
  if (fx && frame) { try { fx.shake(frame, 2) } catch { /* bỏ qua */ } }
}

// Vị trí màn LED (tọa độ khung nhìn) + phần tử để nhân bản. Màn LED đang khuất một phần (khung thấp, người chơi cuộn xuống
// bàn phím) thì đặt bản sao sát mép trên phần nhìn thấy của panel Quầy, không để nó nằm đè lên dải phố / thanh 4 khâu.
function captureLed(ctx, led) {
  if (!led || typeof led.getBoundingClientRect !== 'function') return null
  const frame = led.closest('.cs-led-frame') || led
  const r = frame.getBoundingClientRect()
  if (!r.width || !r.height) return null
  let top = r.top
  const sc = ctx.root
  if (sc && typeof sc.getBoundingClientRect === 'function') {
    const p = sc.getBoundingClientRect()
    top = Math.max(p.top + 6, Math.min(top, p.bottom - r.height - 6))
  }
  return { node: frame, rect: { left: r.left, top, width: r.width, height: r.height } }
}

// Khách nhận tổng: bản sao màn LED (số vừa báo) đứng tại chỗ cũ ở lớp hiệu ứng, dấu ✓ nảy lên rồi cả hai mờ đi (~0,8 giây).
// Panel bên dưới đã vẽ sang khâu Tính tiền. Giảm chuyển động: ✓ hiện thẳng rồi mờ (chỉ opacity). Tự dọn khi xong, khi
// vfx.clear() gỡ khỏi lớp, hoặc quá giờ an toàn.
function okStamp(app, ghost) {
  const fx = app && app.vfx
  if (!fx || !ghost) return
  let layer = null
  try { layer = fx.layer } catch { layer = null }
  const doc = layer && layer.ownerDocument
  if (!layer || !doc || doc.visibilityState === 'hidden') return
  const L = layer.getBoundingClientRect()
  const { rect } = ghost
  const wrap = doc.createElement('div')
  wrap.className = 'cs-fx-ok'
  wrap.style.left = `${(rect.left - L.left).toFixed(1)}px`
  wrap.style.top = `${(rect.top - L.top).toFixed(1)}px`
  wrap.style.width = `${rect.width.toFixed(1)}px`
  wrap.style.height = `${rect.height.toFixed(1)}px`
  const copy = ghost.node.cloneNode(true)
  for (const e of [copy, ...copy.querySelectorAll('[data-testid],[id],[aria-live]')]) {
    e.removeAttribute('data-testid'); e.removeAttribute('id'); e.removeAttribute('aria-live')
  }
  for (const e of [copy, ...copy.querySelectorAll('.is-wrong, .vfx-alert, .glow')]) e.classList.remove('is-wrong', 'vfx-alert', 'glow')
  copy.classList.add('is-ok')
  const check = doc.createElement('span')
  check.className = 'cs-fx-check'
  check.innerHTML = CHECK_SVG
  wrap.appendChild(copy)
  wrap.appendChild(check)
  layer.appendChild(wrap)
  const red = isReduced(app)
  let done = false
  const end = () => { if (done) return; done = true; if (wrap.parentNode) wrap.parentNode.removeChild(wrap) }
  setTimeout(end, 1400)
  if (typeof wrap.animate !== 'function') { setTimeout(end, 600); return }
  try {
    if (!red) {
      check.animate([
        { opacity: 0, transform: 'scale(.3) rotate(-14deg)' },
        { opacity: 1, transform: 'scale(1.22) rotate(4deg)', offset: 0.5 },
        { opacity: 1, transform: 'scale(1) rotate(0deg)' }
      ], { duration: 360, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'both' })
    }
    const a = wrap.animate(red
      ? [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }]
      : [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 1, transform: 'translateY(0)', offset: 0.68 }, { opacity: 0, transform: 'translateY(-10px)' }],
    { duration: red ? 650 : 820, easing: 'linear', fill: 'both' })
    a.addEventListener('finish', end)
    a.addEventListener('cancel', end)
  } catch { end() }
}

// Bảng giá phấn: mỗi món thực đơn một dòng (hình món, tên, giá gọn "20k"), phần cộng thêm của ghi chú là dòng phụ.
export function renderPriceBoard(ctx) {
  const { app, R } = ctx
  const menu = orderableRecipes(app.state, app.ctx)
  const rows = []
  for (const id of menu) {
    const r = R[id]
    if (!r) continue
    rows.push(h('li', { class: 'cs-board-row', 'aria-label': `${r.name}: ${formatVND(r.price)}` },
      dishArt(r, 'cs-board-dish'),
      h('span', { class: 'cs-board-name' }, r.name),
      h('b', { class: 'cs-board-price' }, formatK(r.price))))
    for (const n of r.notes || []) {
      if (!n.surcharge) continue
      rows.push(h('li', { class: 'cs-board-row is-sub', 'aria-label': `Thêm cho ${r.name}, ${n.label}: ${formatVND(n.surcharge)}` },
        noteIcon(n.id, { recipe: r, size: 22, decorative: true, className: 'cs-board-note' }),
        h('span', { class: 'cs-board-name' }, n.label),
        h('b', { class: 'cs-board-price' }, '+' + formatK(n.surcharge))))
    }
  }
  return h('div', { class: 'cs-board', testid: 'price-board' },
    h('div', { class: 'cs-board-title' }, 'Bảng giá'),
    h('ul', { class: 'cs-board-list' }, rows))
}

// Phiếu order tóm tắt: hình món nhỏ có huy hiệu ×n, tên món, hình các ghi chú (có nhãn cho trình đọc màn hình).
export function renderDraftSummary(ctx, draft) {
  const { R } = ctx
  return h('div', { class: 'cs-slip' },
    h('span', { class: 'cs-slip-pin', 'aria-hidden': 'true' }),
    h('div', { class: 'cs-slip-title' }, 'Phiếu order'),
    h('ul', { class: 'cs-slip-list' }, draft.map(l => {
      const r = R[l.recipeId]
      const name = r ? r.name : l.recipeId
      const notes = ctx.noteLabels(r, l.notes)
      return h('li', { class: 'cs-slip-line', 'aria-label': `${l.qty} × ${name}${notes.length ? ', ' + notes.join(', ') : ''}` },
        h('span', { class: 'cs-slip-art' }, dishArt(r, 'cs-slip-dish'), h('b', { class: 'cs-slip-qty' }, '×' + l.qty)),
        h('span', { class: 'cs-slip-body' },
          h('span', { class: 'cs-slip-name' }, name),
          (l.notes || []).length
            ? h('span', { class: 'cs-slip-notes' }, l.notes.map(id => noteIcon(id, { recipe: r, size: 22, className: 'cs-slip-note' })))
            : null))
    })))
}
