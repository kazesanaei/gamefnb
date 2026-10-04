// Quầy, khâu 3 (Tính tiền) — trả tiền mặt: mặt quầy gỗ với tờ tiền khách đưa (to, xòe) và phiếu số liệu (Tổng, Khách đưa,
// Đã thối, Cần thối, Đang thối dư), khay inox đựng tiền thối, ngăn kéo két mở 7 ngăn, thẻ "két không đủ tiền lẻ" (hộp chọn
// cách xử lý tự mở) và nút "Đưa tiền thối". Bố cục cũ (panel cuộn, không có lớp co-scene): nút dính đáy, lúc vào khâu
// panel cuộn cho khay + két lọt trên hàng nút (revealCash).
// M5 Đợt 2 (gói Q-B): giao diện mới, luật / tiền / điểm giữ nguyên (lõi trayAdd / trayRemove / giveChange). Mọi hàm nhận ctx
// chung của panel Quầy (counter.js: makeCtx). Import trong Node được: không chạm DOM ở cấp module.
// Hiệu ứng chỉ chạy theo SỰ KIỆN (thao tác), không trong renderCash: chụp vị trí + nhân bản phần tử nguồn TRƯỚC khi đổi state,
// panel vẽ lại tự do, rồi bản sao bay ở lớp hiệu ứng (src/ui/vfx.js):
//   - chạm ngăn két → tờ tiền bay vào khay (đích nảy khi chạm), chạm chồng trong khay → tờ bay về ngăn két;
//   - đưa tiền thối → tiền trong khay bay sang khách; xong giao dịch → tiền khách đưa bay vào két, két nảy rồi đóng lại;
//     thối đúng thêm tiếng "cash" (cạch + keng) và xu bay về ví trên HUD; mỗi xu chạm ví phát sự kiện DOM 'vfx-coin' (detail
//     của onArrive trong vfx.coins + source: 'tien_mat') trên phần tử [data-testid="hud-wallet"] để HUD đếm số; thối thiếu bị
//     đòi bù → khay rung.
// Giảm chuyển động: không bay, không nảy (số liệu cập nhật ngay); âm thanh giữ nguyên.
// Vừa màn (bố cục cảnh + khay, div.counter.co-scene của counter.js): panel Quầy không cuộn. Thẻ "Khách đưa" (given-cash) và
// thẻ Tổng (phiếu số liệu) đặt trên mặt quầy ở CẢNH (css/cashier.css định vị theo div.counter), KHAY là két 7 ngăn + hàng
// đáy [khay tiền thối | "Đưa tiền thối"] dồn đáy; khay chỉ cuộn ở khung nhỏ (scrollBoxOf). Bản sao két ở lớp hiệu ứng mang
// data-scene + data-fit của màn (applyFxFrame).
import { h, svgBox } from '../dom.js'
import { DI_SAU } from '../art.js'
import { scene } from '../art/scene.js'
import { trayAdd, trayRemove, giveChange, changeOptions, resolveNoChange, changeRemaining } from '../../core/order.js'
import { drawerTotal } from '../../core/money.js'
import { renderDrawer, renderTray, renderGivenCash } from '../components/cash-drawer.js'
import { isReduced } from '../motion.js'
import { formatVND, formatK } from '../format.js'
import { scrollBoxOf, fxFrameOf, applyFxFrame } from './counter-pay.js'

export const NO_CHANGE_LABELS = {
  xin_tien_le: ['Xin khách tiền lẻ', 'Khách có thể có tiền lẻ, nhưng sẽ hơi sốt ruột.'],
  moi_qr: ['Mời khách chuyển khoản QR', 'Khách quét mã, khỏi cần thối.'],
  lam_tron: ['Làm tròn có lợi cho khách', 'Thối dư tối đa 5.000đ cho chẵn tiền.']
}

/** Nhịp hiệu ứng tiền mặt (ms). */
export const CASH_FX = Object.freeze({ bill: 340, toCustomer: 420, toDrawer: 300, lidBump: 180, lidClose: 240 })

// Panel Quầy (ctx) đang mở hộp "Két không đủ tiền lẻ": không mở chồng hộp thứ hai.
const noChangeOpen = new WeakSet()

// Chậu cây nhỏ trên mặt quầy (trang trí, cùng nét mực / tô phẳng của hình M5): đứng bên trái, cân với hũ tip bên phải.
const PLANT_SVG = '<svg viewBox="0 0 72 96" aria-hidden="true"><g stroke="#3a2618" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
  '<path d="M35 57C29 45 18 40 7 42C11 54 22 60 35 57Z" fill="#5cb84c"/>' +
  '<path d="M37 57C43 43 55 37 66 40C62 53 50 60 37 57Z" fill="#4ea53f"/>' +
  '<path d="M36 59C31 41 33 22 42 8C51 23 47 44 36 59Z" fill="#6cc65a"/>' +
  '<path d="M15 60H57L53 90H19Z" fill="#d9774a"/>' +
  '<path d="M11 51H61V62H11Z" fill="#ec9562"/></g>' +
  '<path d="M45 64H54L51 87H43Z" fill="#b5532c" opacity=".5"/>' +
  '<path d="M21 67L23 83M16 55H30" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>' +
  '<path d="M37 55C37 41 38 27 42 15M12 44C20 46 27 50 33 55M64 42C56 45 48 50 40 55" fill="none" stroke="#3a2618" stroke-width="1.6" stroke-linecap="round" opacity=".45"/></svg>'

// Dòng "Cần thối" (và cảnh báo thối dư): ngày 1–3 hoặc bật Hỗ trợ tính tiền.
export function showChangeHint(ctx) {
  const s = ctx.sh()
  return s.day <= 3 || !!ctx.app.state.settings.assistCash
}

export function renderCash(ctx, customer, c) {
  const { app, S } = ctx
  const s = ctx.sh()
  const due = changeRemaining(app.state)
  const trayAmt = drawerTotal(c.tray)
  const hint = showChangeHint(ctx)
  // Thẻ "Khách đưa" + phiếu số liệu (Tổng…) là con trực tiếp của khâu; két, khay, nút nằm trong thân khâu (.cs-cash-body).
  // Bố cục cảnh: hai thẻ đặt trên mặt quầy ở cảnh, thân khâu là vùng cuộn của khay (khung nhỏ) — hai thẻ nằm ngoài vùng cuộn
  // nên không bị cắt / không trôi theo khi khay cuộn. Bố cục cũ: thân khâu "tan" vào lưới của khâu (display: contents).
  // Thân khâu cũ (lần vẽ trước, còn trong panel): vị trí cuộn của nó giữ sang thân mới.
  const prevBody = ctx.ui.cashShown ? ctx.el.querySelector('.cs-cash-body') : null
  const keepTop = prevBody ? prevBody.scrollTop : 0
  const wrap = h('div', { class: 'cs-cash' })
  const body = h('div', { class: 'cs-cash-body' })
  wrap.appendChild(h('div', { class: 'cs-mat', 'aria-label': 'Nắp két' }, renderGivenCash(c.given)))
  wrap.appendChild(h('div', { class: 'cs-facts' },
    h('div', { class: 'cs-fact is-total' }, h('span', { class: 'cs-fact-k' }, 'Tổng'), h('b', { class: 'cs-fact-v', testid: 'amount-due' }, formatVND(c.amountDue))),
    c.changePaid > 0 ? h('div', { class: 'cs-fact' }, h('span', { class: 'cs-fact-k' }, 'Đã thối'), h('b', { class: 'cs-fact-v' }, formatVND(c.changePaid))) : null,
    hint ? h('div', { class: 'cs-fact is-due', testid: 'change-hint', dataset: { amount: due } },
      h('span', { class: 'cs-fact-k' }, c.changePaid > 0 ? 'Cần thối bù' : 'Cần thối'), h('b', { class: 'cs-fact-v' }, formatVND(due))) : null,
    // ngày đầu (đang hiện "Cần thối"): khay nhiều hơn số cần thối → cảnh báo đỏ trước khi đưa
    hint && trayAmt > due ? h('div', { class: 'cs-over', testid: 'change-over', role: 'status' }, 'Đang thối dư ', h('b', null, formatVND(trayAmt - due))) : null))
  wrap.appendChild(body)
  // mặt quầy gỗ ở đầu khay (bố cục cảnh: phần dư của khay; mặt quầy đủ cao thì có chậu cây + hũ tip trang trí) — chỉ để nhìn
  body.appendChild(h('div', { class: 'cs-counter-top', 'aria-hidden': 'true' },
    h('span', { class: 'cs-plant', html: PLANT_SVG }), svgBox(scene('hu_tip'), 'cs-tipjar')))
  body.appendChild(renderTray(c.tray, {
    emptyText: due === 0 ? 'Không cần thối tiền' : null,
    onReturn: (b, el) => returnBill(ctx, b, el)
  }))
  body.appendChild(renderDrawer(s.drawer, { onTake: (b, el) => takeBill(ctx, b, el) }))
  const opts = changeOptions(app.state, app.ctx)
  if (opts.length) {
    body.appendChild(h('div', { class: 'cs-nochange', testid: 'no-change' },
      h('span', { class: 'cs-nochange-ico', 'aria-hidden': 'true' }, '!'),
      h('span', { class: 'cs-nochange-text' }, S.messages.noChange),
      h('button', { class: 'g-btn g-btn--gold g-btn--small cs-nochange-btn', type: 'button', testid: 'no-change-open', onclick: () => openNoChange(ctx, true) }, 'Chọn cách xử lý')))
    const key = c.customerId + ':' + c.changeOptionsUsed.length + ':' + c.changePaid
    if (ctx.ui.noChangeKey !== key) { ctx.ui.noChangeKey = key; setTimeout(() => openNoChange(ctx, false), 0) }
  }
  const exact = due === 0 && trayAmt === 0
  body.appendChild(h('div', { class: 'act-bar cs-act' }, renderSum(c, { due, trayAmt, hint }), h('button', {
    class: ['g-btn', 'g-btn--go', 'g-btn--block', 'cs-give', exact ? 'is-exact' : ''], type: 'button', testid: 'give-change',
    dataset: { exact: exact ? 'true' : 'false' },
    onclick: () => doGiveChange(ctx, customer)
  }, exact ? 'Không cần thối' : (c.changePaid > 0 ? 'Đưa tiền thối bù' : 'Đưa tiền thối'))))
  // Lần đầu khâu này hiện cho khách (vừa báo tổng / mở lại game giữa khâu): sau khi counter.js gắn panel và tự cuộn theo
  // khâu, cuộn tiếp cho khay + két lọt trên hàng nút dính đáy. Một lần theo khách (vẽ lại, thối bù không cuộn lại).
  if (!ctx.ui.cashShown) afterRender(() => { if (revealCash(ctx)) ctx.ui.cashShown = true })
  else if (ctx.el.classList.contains('co-scene')) afterRender(() => keepCashTray(ctx, body, keepTop))
  return wrap
}

// Dải số liệu gọn nằm cạnh nút "Đưa tiền thối" (.cs-sum; css/cashier.css hiện không cho hiện — số liệu đã ở thẻ Khách đưa
// / thẻ Tổng trên mặt quầy và đầu khay tiền thối): tiền khách đưa, tổng, (cần thối) và tổng khay. Thường 3 dòng: Khách đưa /
// Tổng / Khay, ngày đầu (đang hiện "Cần thối") là Tổng / Cần thối / Khay; đã thối một lần thì thêm dòng Đã thối. Khay dư so
// với số cần thối → đỏ, vừa đủ → xanh (chỉ khi đang hiện "Cần thối", như phiếu số liệu).
export function sumRows(c, { due, trayAmt, hint }) {
  const given = (c.given && c.given.total) || drawerTotal((c.given && c.given.bills) || {})
  const rows = []
  if (!hint) rows.push({ id: 'dua', k: 'Khách đưa', v: given })
  rows.push({ id: 'tong', k: 'Tổng', v: Number(c.amountDue) || 0 })
  if (c.changePaid > 0) rows.push({ id: 'da_thoi', k: 'Đã thối', v: c.changePaid })
  if (hint) rows.push({ id: 'can', k: c.changePaid > 0 ? 'Cần thối bù' : 'Cần thối', v: due })
  rows.push({ id: 'khay', k: 'Khay', v: trayAmt, state: hint && trayAmt > due ? 'over' : (hint && due > 0 && trayAmt === due ? 'ok' : '') })
  return rows
}

function renderSum(c, info) {
  return h('div', { class: 'cs-sum', role: 'group', 'aria-label': 'Số liệu thối tiền' }, sumRows(c, info).map(r =>
    h('div', { class: ['cs-sum-row', 'is-' + r.id, r.state ? 'is-' + r.state : ''], 'aria-label': `${r.k}: ${formatVND(r.v)}` },
      h('span', { class: 'cs-sum-k' }, r.k),
      h('b', { class: 'cs-sum-v' }, formatK(r.v)))))
}

// Chạy fn sau khi lượt vẽ hiện tại xong (panel đã gắn nút mới, counter.js đã cuộn theo khâu), trước khi trình duyệt vẽ.
function afterRender(fn) {
  if (typeof queueMicrotask === 'function') queueMicrotask(fn)
  else Promise.resolve().then(fn)
}

// Cuộn panel Quầy lúc vào khâu Tính tiền (thứ tự ưu tiên): cả khâu từ tiêu đề tới đáy két lọt thì chỉ cuộn vừa đủ; không thì
// hàng khay (panel thấp: tiền khách đưa cùng hàng) + trọn két, đáy két sát hàng nút dính đáy, phía trên lộ thêm được bao nhiêu
// thì lộ (chỉ còn một mẩu < 28px thì thôi, đưa hàng khay sát mép trên); vẫn không lọt thì hàng khay sát mép trên panel, két
// lộ phần đầu (hàng ngăn 5K–50K). → true nếu đã đo được (panel đang hiện).
function revealCash(ctx) {
  if (ctx.destroyed()) return false
  const tray = ctx.el.querySelector('[data-testid="tray"]')
  const drawer = ctx.el.querySelector('[data-testid="drawer"]')
  if (!tray || !drawer || !drawer.isConnected) return false
  if (ctx.el.classList.contains('co-scene')) return revealCashTray(ctx, tray, drawer)
  const sc = ctx.root
  if (!sc || typeof sc.getBoundingClientRect !== 'function') return false
  const box = sc.getBoundingClientRect()
  if (!box.height) return false
  const bar = ctx.el.querySelector('.act-bar')
  const br = bar ? bar.getBoundingClientRect() : null
  const top = box.top + 4
  const limit = (br && br.height ? Math.min(box.bottom, br.top) : box.bottom) - 4
  const room = limit - top
  const head = (drawer.closest('.stage') || drawer.parentNode).getBoundingClientRect()
  const t = tray.getBoundingClientRect(), d = drawer.getBoundingClientRect()
  // mép trên hàng chứa khay (panel thấp: tiền khách đưa nằm cùng hàng với khay)
  const mat = ctx.el.querySelector('.cs-mat')
  const mr = mat ? mat.getBoundingClientRect() : null
  const rowTop = mr && mr.height && Math.abs(mr.top - t.top) < 4 ? Math.min(mr.top, t.top) : t.top
  let delta
  if (d.bottom - head.top <= room) delta = d.bottom > limit ? d.bottom - limit : (head.top < top ? head.top - top : 0)
  else if (d.bottom - rowTop <= room) {
    delta = d.bottom - limit
    // phía trên chỉ còn lộ một mẩu (< 28px: mép thẻ, nửa dòng tiêu đề) thì đưa hàng đầu (tiền khách đưa / khay) sát mép trên
    const above = rowTop - delta - top
    if (above > 0 && above < 28) delta = rowTop - top
  } else delta = rowTop - top
  if (delta) sc.scrollTop += delta
  return true
}

// Bố cục cảnh, lần vẽ lại trong cùng khâu (lấy / trả tờ tiền, thối bù): thân khâu mới giữ vị trí cuộn của thân cũ; khay tiền
// thối vừa xuống hàng (≥ 5 mệnh giá) mà hàng đáy bị đẩy khuất thì cuộn vừa đủ cho hàng đáy (nút "Đưa tiền thối") lọt lại.
function keepCashTray(ctx, body, keepTop) {
  if (ctx.destroyed() || !body || !body.isConnected || typeof body.getBoundingClientRect !== 'function') return
  if (keepTop) body.scrollTop = keepTop
  if (body.scrollHeight <= body.clientHeight + 1) return
  const box = body.getBoundingClientRect()
  const tray = body.querySelector('[data-testid="tray"]')
  const give = body.querySelector('[data-testid="give-change"]')
  const bottom = Math.max(tray ? tray.getBoundingClientRect().bottom : 0, give ? give.getBoundingClientRect().bottom : 0)
  const over = bottom - (box.bottom - 4)
  if (over >= 1) body.scrollTop += over
}

// Bố cục cảnh: khay vừa thì không cuộn gì. Khay cuộn (khung nhỏ: thêm lời Dì Sáu / thẻ két hết tiền lẻ): cho cả két lẫn hàng
// đáy (khay tiền thối + "Đưa tiền thối") lọt nếu đủ chỗ, không đủ thì hàng đáy sát đáy khay, két lộ phần dưới.
function revealCashTray(ctx, tray, drawer) {
  const sc = scrollBoxOf(ctx, drawer)
  if (!sc) return true
  if (typeof sc.getBoundingClientRect !== 'function') return false
  const box = sc.getBoundingClientRect()
  if (!box.height) return false
  const give = ctx.el.querySelector('[data-testid="give-change"]')
  const d = drawer.getBoundingClientRect()
  const bottom = Math.max(tray.getBoundingClientRect().bottom, give ? give.getBoundingClientRect().bottom : 0)
  const top = box.top + 4, limit = box.bottom - 4
  let delta = 0
  if (bottom > limit) delta = bottom - limit
  if (bottom - d.top <= limit - top && d.top - delta < top) delta = d.top - top
  if (Math.abs(delta) >= 1) sc.scrollTop += delta
  return true
}

// ---------- Tờ tiền giữa két và khay ----------

// Chạm ngăn két: lấy 1 tờ vào khay (lõi trayAdd), tờ tiền bay từ ngăn vào chồng tương ứng trong khay.
function takeBill(ctx, b, slotEl) {
  const { app } = ctx
  const from = measureOf(slotEl && slotEl.querySelector('.cs-bill'))
  if (!trayAdd(app.state, b)) return
  app.sound('paper')
  app.save()
  ctx.rerender()
  flyBill(ctx, from, ctx.el.querySelector(`[data-testid="tray-${b}"] .cs-bill`))
}

// Chạm chồng trong khay: trả 1 tờ về két (lõi trayRemove), tờ tiền bay về đúng ngăn.
function returnBill(ctx, b, stackEl) {
  const { app } = ctx
  const from = measureOf(stackEl && stackEl.querySelector('.cs-bill'))
  if (!trayRemove(app.state, b)) return
  app.sound('paper')
  app.save()
  ctx.rerender()
  flyBill(ctx, from, ctx.el.querySelector(`[data-testid="drawer-${b}"] .cs-bill`))
}

// Vị trí (tọa độ khung nhìn) + phần tử nguồn để nhân bản; null nếu không thấy / không hiển thị.
function measureOf(node) {
  if (!node || typeof node.getBoundingClientRect !== 'function' || !node.isConnected) return null
  const r = node.getBoundingClientRect()
  if (!r.width || !r.height) return null
  return { node, rect: { left: r.left, top: r.top, width: r.width, height: r.height } }
}

// Tâm phần tử nằm trong phần nhìn thấy của vùng cuộn (khay ở khung nhỏ / panel Quầy) và trên hàng nút dính đáy (chỉ hàng
// đang position: sticky — hàng nút nằm trong lưới của bố cục cảnh không che gì)? Đích khuất thì không bay (khỏi bay xuyên
// qua thanh tab ra ngoài màn).
function inPanelView(ctx, el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return false
  const sc = scrollBoxOf(ctx, el) || ctx.el
  if (!sc || typeof sc.getBoundingClientRect !== 'function') return false
  const a = el.getBoundingClientRect(), b = sc.getBoundingClientRect()
  let bottom = b.bottom
  for (const bar of ctx.el.querySelectorAll('.act-bar')) {
    if (bar.contains(el) || getComputedStyle(bar).position !== 'sticky') continue
    const r = bar.getBoundingClientRect()
    if (r.height) bottom = Math.min(bottom, r.top)
  }
  const cy = a.top + a.height / 2
  return a.width > 0 && cy > b.top && cy < bottom
}

// Bản sao tờ tiền bay tới đích; đích (tờ trên cùng của chồng mới) ẩn tới khi bản sao chạm tới rồi nảy (vfx.fly tự nảy đích).
// Giảm chuyển động / trang ẩn / đích khuất / không có đích: không bay, đích hiện luôn (vfx.fly cũng trả false ngay).
function flyBill(ctx, from, target) {
  const fx = ctx.app.vfx
  if (!fx || !from || !target || isReduced(ctx.app) || !inPanelView(ctx, target)) return
  target.style.opacity = '0'
  const show = () => { target.style.opacity = '' }
  let job = null
  try { job = fx.fly(from.rect, target, { node: from.node, ms: CASH_FX.bill, arc: 0.28 }) } catch { job = null }
  if (!job || typeof job.then !== 'function') { show(); return }
  job.then(show, show)
}

// ---------- Đưa tiền thối ----------

// "Đưa tiền thối": lời người bán, khách phản hồi theo kết quả (đúng, thiếu bị đòi bù, dư được trả lại).
export function doGiveChange(ctx, customer) {
  const { app } = ctx
  const c0 = ctx.counter()
  // chụp TRƯỚC khi đổi state: tiền trong khay, tiền khách đưa, két (panel vẽ lại thì các phần tử này mất / đổi)
  const shot = {
    tray: [...ctx.el.querySelectorAll('[data-testid="tray"] .cs-tray-stack')].map(measureOf).filter(Boolean),
    given: measureOf(ctx.el.querySelector('[data-testid="given-cash"] .cs-given-bills')),
    drawer: measureOf(ctx.el.querySelector('[data-testid="drawer"]'))
  }
  const sale = c0 ? Number(c0.amountDue) || 0 : 0
  const res = giveChange(app.state, app.ctx)
  if (!res.ok) return
  const said = res.given > 0 ? `Dạ thối mình ${formatVND(res.given)} ạ.` : 'Dạ mình đưa vừa đủ ạ, cảm ơn nhiều!'
  ctx.say('ban', said)
  if (res.correct) {
    app.sound('cash')
    ctx.say('khach', ctx.lineOf('change_ok', customer) || ctx.lineOf('thanks', customer))
    if (res.given > 0) app.toast(res.optimal ? 'Thối đúng · Thối gọn' : 'Thối đúng', { kind: 'good', duration: 1400 })
  } else if (res.diff < 0 && res.detected) {
    app.sound('error')
    app.vibrate(60)
    ctx.say('khach', res.line)
    app.toast(`Thối thiếu ${formatVND(-res.diff)}. Khách đòi thối bù.`, { kind: 'bad' })
  } else if (res.diff > 0 && res.returned) {
    ctx.say('khach', res.line)
    app.toast('Khách thật thà trả lại tiền thối dư.', { kind: 'info' })
  } else {
    ctx.say('khach', ctx.lineOf('thanks', customer))
  }
  app.save()
  ctx.rerender()
  playGive(ctx, shot, res, sale)
}

// Chuỗi hiệu ứng sau khi đưa tiền thối (panel đã vẽ lại).
function playGive(ctx, shot, res, sale) {
  const { app } = ctx
  const fx = app.vfx
  if (!fx) return
  const reduced = isReduced(app)
  // tiền trong khay sang tay khách (bay lên bán thân khách ở cảnh; không có hình bán thân thì phía khách ở đầu panel)
  if (!reduced && shot.tray.length && res.given > 0) {
    const fig = ctx.el.querySelector('.co-cust-figure')
    const fr = fig ? fig.getBoundingClientRect() : null
    const cust = ctx.el.querySelector('.cust-wrap')
    const cr = cust ? cust.getBoundingClientRect() : null
    shot.tray.forEach((t, i) => {
      const to = fr && fr.height ? { x: fr.left + fr.width * 0.5, y: fr.top + fr.height * 0.6 }
        : cr && cr.height ? { x: cr.left + cr.width * 0.3, y: cr.top + cr.height * 0.45 } : { x: t.rect.left + t.rect.width / 2, y: 0 }
      try { fx.fly(t.rect, to, { node: t.node, ms: CASH_FX.toCustomer + i * 50, arc: 0.3, scale: 0.6, bump: false }) } catch { /* bỏ qua */ }
    })
  }
  if (!res.done) {
    // thối thiếu, khách đòi bù: khay (mới) rung
    const tray = ctx.el.querySelector('[data-testid="tray"]')
    if (tray) { try { fx.shake(tray, 2) } catch { /* bỏ qua */ } }
    return
  }
  // xong giao dịch: tiền khách đưa vào két, két nảy (thối đúng) rồi đóng; thối đúng thì xu bay về ví HUD
  const wallet = ctx.el.ownerDocument && ctx.el.ownerDocument.querySelector('[data-testid="hud-wallet"]')
  const coins = () => {
    if (!res.correct || !wallet || sale <= 0) return
    const from = shot.drawer ? shot.drawer.rect : (shot.given ? shot.given.rect : null)
    if (!from) return
    // mỗi xu chạm ví: báo cho HUD bằng sự kiện DOM 'vfx-coin' trên chính phần tử ví (không phát lên bus miền) để HUD đếm số
    const onArrive = info => {
      try { wallet.dispatchEvent(new CustomEvent('vfx-coin', { detail: { ...info, source: 'tien_mat' } })) } catch { /* bỏ qua */ }
    }
    try { fx.coins(from, wallet, { amount: sale, unit: 1000, onArrive }) } catch { /* bỏ qua */ }
  }
  if (reduced || !shot.drawer) { coins(); return }
  const lid = drawerGhost(ctx, shot.drawer)
  const land = () => {
    if (lid) lid.close(res.correct)
    coins()
  }
  if (shot.given) {
    let job = null
    try {
      job = fx.fly(shot.given.rect, centerOf(shot.drawer.rect, shot.given.rect), { node: shot.given.node, ms: CASH_FX.toDrawer, arc: 0.18, scale: 0.7, bump: false })
    } catch { job = null }
    if (job && typeof job.then === 'function') job.then(land, land)
    else land()
  } else {
    land()
  }
}

// Điểm giữa két (đích tiền khách đưa bay vào), dạng hình chữ nhật cỡ bằng xấp tiền để vfx.fly giữ tỉ lệ.
function centerOf(rect, size) {
  const w = size ? size.width * 0.7 : 40, hgt = size ? size.height * 0.7 : 24
  return { left: rect.left + rect.width / 2 - w / 2, top: rect.top + rect.height * 0.42 - hgt / 2, width: w, height: hgt }
}

// Bản sao két đứng tại chỗ cũ ở lớp hiệu ứng (panel đã sang phiếu thu): nảy 1 → 1,05 → 1 khi nhận tiền (thối đúng) rồi trượt
// xuống mờ đi như đóng ngăn kéo. Tự dọn khi xong, khi vfx.clear() gỡ khỏi lớp, hoặc quá giờ an toàn.
function drawerGhost(ctx, shot) {
  const fx = ctx.app.vfx
  let layer = null
  try { layer = fx.layer } catch { layer = null }
  const doc = layer && layer.ownerDocument
  if (!layer || !doc || doc.visibilityState === 'hidden') return null
  const L = layer.getBoundingClientRect()
  const wrap = doc.createElement('div')
  // bậc khung của màn đi theo bản sao: két ở lớp hiệu ứng giữ đúng cỡ ngăn / huy hiệu như trong khay
  wrap.className = 'cs-fx-drawer'
  applyFxFrame(wrap, fxFrameOf(ctx))
  wrap.style.padding = '0'   // luật riêng của khay (nếu có đệm) không áp vào khung bản sao
  wrap.style.left = `${(shot.rect.left - L.left).toFixed(1)}px`
  wrap.style.top = `${(shot.rect.top - L.top).toFixed(1)}px`
  wrap.style.width = `${shot.rect.width.toFixed(1)}px`
  wrap.style.height = `${shot.rect.height.toFixed(1)}px`
  const copy = shot.node.cloneNode(true)
  for (const e of [copy, ...copy.querySelectorAll('[data-testid],[id]')]) { e.removeAttribute('data-testid'); e.removeAttribute('id') }
  for (const e of [copy, ...copy.querySelectorAll('.glow, .vfx-alert')]) e.classList.remove('glow', 'vfx-alert')
  wrap.appendChild(copy)
  layer.appendChild(wrap)
  let done = false
  const end = () => { if (done) return; done = true; if (wrap.parentNode) wrap.parentNode.removeChild(wrap) }
  const safety = setTimeout(end, 2000)
  return {
    close(bump) {
      if (done) return
      if (typeof wrap.animate !== 'function') { clearTimeout(safety); end(); return }
      const B = CASH_FX.lidBump, C = CASH_FX.lidClose
      const total = (bump ? B : 0) + C
      const kf = []
      kf.push({ transform: 'translateY(0) scale(1)', opacity: 1, offset: 0 })
      if (bump) {
        kf.push({ transform: 'translateY(0) scale(1.05)', opacity: 1, offset: (B * 0.45) / total })
        kf.push({ transform: 'translateY(0) scale(1)', opacity: 1, offset: B / total })
      }
      kf.push({ transform: 'translateY(18px) scale(.97)', opacity: 0, offset: 1 })
      try {
        const a = wrap.animate(kf, { duration: total, easing: 'ease-out', fill: 'both' })
        a.addEventListener('finish', end)
        a.addEventListener('cancel', end)
      } catch { end() }
    }
  }
}

// ---------- Két không đủ tiền lẻ ----------

// Hộp "Két không đủ tiền lẻ": xin tiền lẻ / mời chuyển khoản / làm tròn có lợi cho khách. manual: người chơi tự bấm mở.
export async function openNoChange(ctx, manual) {
  const { app } = ctx
  if (noChangeOpen.has(ctx) || ctx.destroyed()) return
  const c = ctx.counter()
  if (!c || c.stage !== 'tinh_tien') return
  const options = changeOptions(app.state, app.ctx)
  if (!options.length) return
  noChangeOpen.add(ctx)
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
  noChangeOpen.delete(ctx)
  if (!choice || ctx.destroyed()) return
  const r = resolveNoChange(app.state, choice, app.ctx)
  if (!r.ok) return
  const customer = ctx.customerOf(ctx.counter())
  if (choice === 'xin_tien_le') {
    ctx.say('ban', 'Mình có tiền lẻ không ạ? Két em hết tiền lẻ rồi.')
    if (r.success) {
      ctx.say('khach', ctx.lineOf('no_small_change_yes', customer) || 'Có, đưa vừa đủ luôn.')
      app.toast(r.undone ? 'Khách trả lại tiền thối, lấy lại tờ lớn và đưa vừa đủ tiền.' : 'Khách đưa vừa đủ tiền.', { kind: 'good' })
    } else { ctx.say('khach', ctx.lineOf('no_small_change_no', customer) || 'Không có tiền lẻ rồi.'); app.toast('Khách không có tiền lẻ.', { kind: 'bad' }) }
  } else if (choice === 'moi_qr') {
    ctx.say('ban', 'Mình chuyển khoản giúp em được không ạ?')
    ctx.say('khach', ctx.lineOf('qr_ok', customer) || 'Được, để quét mã.')
    if (r.undone) app.toast('Khách trả lại tiền thối và lấy lại tiền mặt, sẽ chuyển khoản trọn hóa đơn.', { kind: 'info', duration: 2600 })
  } else if (choice === 'lam_tron') {
    if (r.success) app.toast(`Làm tròn: thối ${formatVND(r.newDue)} (dư ${formatVND(r.extra)} cho khách).`, { kind: 'info' })
    else app.toast('Két vẫn không đủ tiền để làm tròn.', { kind: 'bad' })
  }
  app.save()
  ctx.rerender()
}
