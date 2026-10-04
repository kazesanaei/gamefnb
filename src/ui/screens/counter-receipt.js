// Quầy, khâu 3 (Tính tiền) — phiếu thu sau khi đã thu đủ (tiền mặt hoặc chuyển khoản) và nút "Kẹp phiếu bếp" dính đáy (bếp
// đầy thì khóa, kèm dòng nhắc). M5 Đợt 2 (gói Q-C): máy in phiếu (art/scene.js may_in_phieu) đặt sau mép quầy gỗ, phiếu giấy
// nhiệt mép răng cưa đứng trên khe máy in: tên xe, số phiếu, giờ in, từng món (hình món + số lượng + ghi chú), phần chênh,
// Tổng, phương thức, tiền khách đưa / tiền thối / làm tròn, hàng cuối "Cảm ơn quý khách!" kèm con dấu "ĐÃ THU" nằm trong
// hàng (chuyển khoản bằng ảnh giả: "ẢNH GIẢ") — dấu không đè số tiền nào.
// Giữ: [receipt] .receipt-head span = "Phiếu thu #001" (e2e đọc số phiếu bằng .split(' ').pop()), data-total, receipt-adjust,
// receipt-rounding, rail-full, clip-ticket.
//
// Hiệu ứng chỉ chạy theo SỰ KIỆN, vẽ lại không phát lại (panel Quầy vẽ lại toàn bộ theo stateSig):
//   - vừa thu tiền xong (lần vẽ trước của khách này còn "chưa thu", tức ctx.ui.stageKey = '<id>:tinh_tien:false'): phiếu
//     trượt lên khỏi khe máy in theo từng nấc, máy in rung nhẹ, rồi con dấu đập xuống (âm "stamp"). Mở lại game giữa lúc
//     phiếu đang hiện thì phiếu nằm yên, không in lại;
//   - "Kẹp phiếu bếp": chụp vị trí + nhân bản phiếu TRƯỚC khi đổi state; panel vẽ lại tự do; bản sao (kèm kẹp gỗ) bay vào
//     chỗ trống kế tiếp trên dây phiếu (lớp app.vfx), phiếu mới trên dây lóe sáng khi bản sao chạm tới; âm "paper" + thông
//     báo như cũ.
// Hoạt ảnh trên nút của panel dùng WAAPI (không phải lớp CSS) để lần vẽ lại sau đó không phát lại. Giảm chuyển động: phiếu
// và dấu hiện ngay, không bay; âm giữ nguyên.
// Vừa màn (bố cục cảnh + khay, bậc data-fit của màn — css/receipt.css): khâu này là KHAY — phiếu trên khe máy in, thân máy
// in hiện thêm theo phần dư, nút "Kẹp phiếu bếp" dính đáy; phiếu gọn theo bậc. Dây phiếu ở tab Quầy là KẸP NHỎ góc phải hàng
// trên của cảnh (railSlot nhắm ô 44×44 phiếu mới sẽ nằm; bản sao thu về cỡ đó — flyScaleFor).
// Mọi hàm nhận ctx chung của panel Quầy (counter.js). Import trong Node được: không chạm DOM ở cấp module.
import { h, svgBox } from '../dom.js'
import { scene } from '../art/scene.js'
import { dishArt } from '../components/menu-board.js'
import { priceOfLines, unitPriceOf, clipTicket, railFull } from '../../core/order.js'
import { gameTime } from '../../core/shift.js'
import { isReduced } from '../motion.js'
import { formatVND, fill } from '../format.js'

/** Nhịp hiệu ứng phiếu thu (ms): in phiếu, con dấu (bắt đầu sau stampAt), bay lên dây phiếu. */
export const RECEIPT_FX = Object.freeze({ print: 660, stampAt: 600, stamp: 220, fly: 560, flyScale: 0.3 })

/** Chữ con dấu trên phiếu: đã thu đủ / chuyển khoản bằng ảnh giả (không có tiền về). */
export const RECEIPT_STAMPS = Object.freeze({ paid: 'ĐÃ THU', lost: 'ẢNH GIẢ' })

// Góc nghiêng con dấu (độ) — khớp transform của .rc-stamp trong css/receipt.css.
const STAMP_TILT = -9

// ctx.ui (đổi khi đổi khách) → { printed, time }
const uiFx = new WeakMap()
function fxOf(ctx) {
  const ui = ctx.ui
  let st = uiFx.get(ui)
  if (!st) { st = { printed: false, time: '' }; uiFx.set(ui, st) }
  return st
}

/** Lần vẽ này là lúc vừa thu tiền xong của khách đang ở quầy? (lần vẽ trước còn "chưa thu"). Thuần. */
export function justPaid(prevStageKey, customerId) {
  return prevStageKey === `${customerId}:tinh_tien:false`
}

export function renderReceipt(ctx, c) {
  const { app, R, S } = ctx
  const s = ctx.sh()
  const st = fxOf(ctx)
  const fresh = !st.printed && justPaid(ctx.ui.stageKey, c.customerId)
  st.printed = true
  if (!st.time) st.time = gameTime(s)
  const total = c.amountDue
  const listTotal = priceOfLines(c.draft, R)
  const noStr = '#' + String(s.nextTicketNo).padStart(3, '0')
  const full = railFull(app.state, app.ctx)
  const max = (app.data.BALANCE && app.data.BALANCE.ticketRailMax) || 3
  const qr = c.payMethod === 'qr'
  const lost = qr && !!c.fakeQr
  const cash = c.payMethod === 'cash'

  const row = (cls, k, v, props = {}) => h('div', { class: ['rc-row', cls], ...props }, h('span', { class: 'rc-k' }, k), h('span', { class: 'rc-v' }, v))
  const stamp = h('span', { class: ['rc-stamp', lost ? 'is-lost' : ''], 'aria-hidden': 'true' }, lost ? RECEIPT_STAMPS.lost : RECEIPT_STAMPS.paid)
  const paper = h('div', { class: ['rc-paper', lost ? 'is-lost' : ''], testid: 'receipt', dataset: { total } },
    h('div', { class: 'receipt-head rc-head' },
      h('b', { class: 'rc-shop' }, app.state.shopName || S.gameTitle),
      h('span', { class: 'rc-no' }, S.labels.receipt + ' ' + noStr),
      // giờ in; panel thấp bỏ phần "Ngày n ·" (HUD đã có) để số phiếu và giờ cùng một hàng
      h('small', { class: 'rc-meta' }, h('span', { class: 'rc-day' }, `Ngày ${s.day} · `), st.time)),
    h('ul', { class: 'rc-lines' }, c.draft.map(l => {
      const r = R[l.recipeId]
      const unit = unitPriceOf(r, l.notes)
      const notes = ctx.noteLabels(r, l.notes)
      // có ghi chú: tên một hàng, hàng dưới là ghi chú + thành tiền; không ghi chú: tên và thành tiền cùng hàng
      return h('li', { class: ['rc-line', notes.length ? '' : 'no-notes'] },
        r ? dishArt(r, 'rc-dish') : h('span', { class: 'rc-dish' }),
        h('span', { class: 'rc-name' }, `${l.qty} × ${r ? r.name : l.recipeId}`),
        notes.length ? h('small', { class: 'rc-notes' }, notes.join(', ').toLowerCase()) : null,
        h('b', { class: 'rc-amt' }, formatVND(unit * l.qty)))
    })),
    // tổng các dòng khác số đã báo (báo thiếu/thu thêm) → ghi rõ phần chênh để phiếu cộng khớp
    listTotal !== total
      ? row('rc-adjust', total < listTotal ? 'Thu thiếu' : 'Thu thêm', (total < listTotal ? '−' : '+') + formatVND(Math.abs(listTotal - total)), { testid: 'receipt-adjust' })
      : null,
    h('div', { class: 'rc-row rc-total' }, h('span', { class: 'rc-k' }, S.labels.total), h('b', { class: 'rc-v' }, formatVND(total))),
    row('rc-method', 'Trả bằng', qr ? S.labels.qr : S.labels.cash),
    cash && c.given ? row('', S.labels.given, formatVND(c.given.total)) : null,
    cash ? row('rc-change', 'Tiền thối', formatVND(c.changePaid)) : null,
    cash && c.rounding > 0 ? row('rc-small', 'Trong đó làm tròn cho khách', formatVND(c.rounding), { testid: 'receipt-rounding' }) : null,
    // hàng cuối: lời cảm ơn bên trái, con dấu nằm TRONG hàng bên phải (lề trên / dưới của dấu chừa đủ phần dấu xoay lòi ra)
    // nên dấu không bao giờ đè lên số tiền của các hàng trên, ở mọi khung
    h('div', { class: 'rc-thanks' }, h('span', { class: 'rc-thanks-t' }, 'Cảm ơn quý\u00a0khách!'), stamp))
  const machine = h('div', { class: 'rc-machine', 'aria-hidden': 'true' }, svgBox(scene('may_in_phieu'), 'rc-machine-art'))

  const wrap = h('div', { class: 'rc-wrap' },
    h('div', { class: 'rc-print' },
      h('div', { class: 'rc-win' }, paper),
      machine,
      h('span', { class: 'rc-plank', 'aria-hidden': 'true' })),
    h('div', { class: 'act-bar rc-act' },
      full ? h('p', { class: 'rc-full', testid: 'rail-full' }, fill(S.messages.kitchenFull, { n: s.tickets.length, max })) : null,
      h('button', {
        class: 'g-btn g-btn--primary g-btn--block rc-clip', type: 'button', testid: 'clip-ticket', disabled: full,
        onclick: () => doClip(ctx)
      }, svgBox(scene('kep_phieu'), 'g-ico rc-clip-ico'), h('span', null, 'Kẹp phiếu bếp'))))

  if (fresh) later(() => playPrint(ctx, paper, machine, stamp))
  return wrap
}

// Phiếu trượt lên khỏi khe máy in từng nấc (máy rung nhẹ), rồi con dấu đập xuống. Chỉ transform / opacity.
function playPrint(ctx, paper, machine, stamp) {
  const { app } = ctx
  if (ctx.destroyed() || !paper.isConnected) return
  const reduced = isReduced(app)
  if (!reduced) {
    animate(paper, [
      { transform: 'translateY(100%)', offset: 0 },
      { transform: 'translateY(70%)', offset: 0.26 },
      { transform: 'translateY(66%)', offset: 0.36 },
      { transform: 'translateY(34%)', offset: 0.62 },
      { transform: 'translateY(30%)', offset: 0.72 },
      { transform: 'translateY(0)', offset: 1 }
    ], { duration: RECEIPT_FX.print, easing: 'ease-out', fill: 'backwards' })
    animate(machine, [0, 1.5, 0, 1.5, 0, 1.5, 0, 1, 0].map(y => ({ transform: `translateY(${y}px)` })),
      { duration: RECEIPT_FX.print, easing: 'linear' })
    const T = `rotate(${STAMP_TILT}deg)`
    animate(stamp, [
      { opacity: 0, transform: `${T} scale(1.9)` },
      { opacity: 1, transform: `${T} scale(.94)`, offset: 0.8 },
      { opacity: 1, transform: `${T} scale(1)` }
    ], { duration: RECEIPT_FX.stamp, delay: RECEIPT_FX.stampAt, easing: 'ease-out', fill: 'backwards' })
  }
  // tiếng con dấu lúc dấu chạm giấy (phiếu còn đang hiện, panel đang nhìn thấy)
  setTimeout(() => {
    if (!ctx.destroyed() && paper.isConnected && paper.getClientRects().length) app.sound('stamp')
  }, reduced ? 0 : RECEIPT_FX.stampAt + RECEIPT_FX.stamp * 0.7)
}

// "Kẹp phiếu bếp": phiếu lên dây bếp, khách sang chờ món; bếp đầy / chưa thu tiền thì báo.
export function doClip(ctx) {
  const { app } = ctx
  const customer = ctx.customerOf(ctx.counter())
  // chụp TRƯỚC khi đổi state: phiếu (panel vẽ lại thì mất) và chỗ trống kế tiếp trên dây (trước khi dây thêm phiếu mới)
  const shot = measure(ctx.el.querySelector('[data-testid="receipt"]'))
  const slot = railSlot(ctx.el.ownerDocument)
  const r = clipTicket(app.state, app.ctx)
  if (!r.ok) {
    app.sound('error')
    if (r.reason === 'bep_day') app.toast('Bếp đang đầy, làm bớt món rồi kẹp phiếu nhé.', { kind: 'bad' })
    else if (r.reason === 'chua_thanh_toan') app.toast('Thu tiền xong mới kẹp phiếu bếp nhé.', { kind: 'bad' })
    ctx.rerender()
    const note = ctx.el.querySelector('[data-testid="rail-full"]')
    if (note && app.vfx && typeof app.vfx.shake === 'function') { try { app.vfx.shake(note, 1) } catch { /* bỏ qua */ } }
    return
  }
  app.sound('paper')
  app.toast(`Đã kẹp phiếu ${r.ticket.no} lên dây bếp. ${customer ? customer.name + ' chờ món.' : ''}`, { kind: 'good', duration: 1800 })
  app.save()
  ctx.rerender()
  flyToRail(ctx, shot, slot, r.ticket)
}

// ---------- Hiệu ứng (lớp app.vfx, tự dọn) ----------

// Vị trí (tọa độ khung nhìn) + phần tử để nhân bản; null nếu không thấy / không hiển thị.
function measure(node) {
  if (!node || typeof node.getBoundingClientRect !== 'function' || !node.isConnected) return null
  const r = node.getBoundingClientRect()
  if (!r.width || !r.height) return null
  return { node, rect: { left: r.left, top: r.top, width: r.width, height: r.height } }
}

// Chạy fn ngay sau lần vẽ hiện tại (vi tác vụ: nút mới đã gắn vào panel, trình duyệt chưa vẽ khung hình).
function later(fn) {
  const run = () => { try { fn() } catch { /* hiệu ứng lỗi không chặn trò chơi */ } }
  if (typeof queueMicrotask === 'function') queueMicrotask(run)
  else setTimeout(run, 0)
}

function animate(el, keyframes, opts) {
  if (!el || typeof el.animate !== 'function') return null
  try { return el.animate(keyframes, opts) } catch { return null }
}

/** Cạnh một phiếu nhỏ của kẹp phiếu ở tab Quầy (px, css/game.css). */
export const CLIP_TICKET = 44

const rectOf = el => (el && el.getClientRects && el.getClientRects().length ? el.getBoundingClientRect() : null)

// Bề rộng tối đa (px) của phần tử: max-width của kẹp phiếu là biểu thức theo % (vd min(100% − 66px, 50% − 70px)) nên đọc
// getComputedStyle không ra số → đo bằng một phần tử dò tạm (vô hình, cùng khối chứa, gỡ ngay). Không giới hạn → Infinity.
function maxWidthPx(el, view) {
  const v = view && typeof view.getComputedStyle === 'function' ? view.getComputedStyle(el).maxWidth : ''
  if (!v || v === 'none') return Infinity
  if (/^[\d.]+px$/.test(v)) return parseFloat(v)
  const host = el.parentElement
  if (!host) return Infinity
  const probe = el.ownerDocument.createElement('div')
  probe.style.cssText = `position:absolute;left:0;top:0;height:0;visibility:hidden;pointer-events:none;width:${v}`
  host.appendChild(probe)
  const w = probe.getBoundingClientRect().width
  probe.remove()
  return w > 0 ? w : Infinity
}

/**
 * Chỗ trống kế tiếp trên dây phiếu (tọa độ khung nhìn, cỡ một phiếu nhỏ): sau phiếu cuối, hoặc đầu dây (sau nhãn
 * "Phiếu n/3") khi dây trống. null nếu dây không hiện. Đo TRƯỚC khi dây thêm phiếu mới.
 * Vừa màn: ở tab Quầy dây là KẸP NHỎ neo góc phải hàng trên của cảnh (thẻ đếm 44×44 + phiếu nhỏ 44×44, đáy thẳng hàng, khe
 * 4px, lề phải danh sách 2px; css/game.css). Kẹp neo mép phải nên thêm phiếu thì kẹp nở sang trái và phiếu mới nằm sát mép
 * phải → ô 44×44 ở đó. Kẹp đã chạm bề rộng tối đa (phiếu mới sẽ nằm trong phần cuộn ngang, khuất) thì nhắm vào thẻ đếm.
 */
export function railSlot(doc) {
  const rail = doc && typeof doc.querySelector === 'function' ? doc.querySelector('[data-testid="ticket-rail"]') : null
  const R = rectOf(rail)
  if (!R || !R.width || !R.height) return null
  const tickets = rail.querySelectorAll('[data-testid^="rail-ticket-"]')
  const last = tickets.length ? tickets[tickets.length - 1] : null
  const count = rail.querySelector('.rail-count')
  const cr = rectOf(count)
  const screen = typeof rail.closest === 'function' ? rail.closest('[data-tab]') : null
  if (screen && screen.getAttribute('data-tab') === 'counter') {
    const S = CLIP_TICKET
    const listEl = rail.querySelector('.rail-list')
    const list = rectOf(listEl) || R
    const bottom = cr ? cr.bottom : list.bottom
    const clipped = !!listEl && list.width > 0 && listEl.scrollWidth > list.width + 1
    if (cr && (clipped || R.width + S + 4 > maxWidthPx(rail, doc.defaultView) + 0.5)) return { left: cr.left, top: cr.top, width: cr.width, height: cr.height }
    return { left: list.right - 2 - S, top: bottom - S, width: S, height: S }
  }
  const w = Math.min(110, Math.max(60, R.width / 3.4))
  const hh = Math.max(36, Math.min(R.height - 10, 76))
  let left = cr && cr.right < R.left + R.width / 2 ? cr.right + 10 : R.left + 12
  if (last) left = last.getBoundingClientRect().right + 8
  left = Math.min(Math.max(R.left + 4, left), R.right - w - 4)
  return { left, top: R.top + (R.height - hh) / 2, width: w, height: hh }
}

/** Tỉ lệ thu nhỏ cuối đường bay của bản sao phiếu (rộng w, cao h) để lọt trọn ô đích, không quá RECEIPT_FX.flyScale. Thuần. */
export function flyScaleFor(w, h, slot) {
  const W = Number(w) || 0
  const H = Number(h) || 0
  if (!slot || W <= 0 || H <= 0) return RECEIPT_FX.flyScale
  const k = Math.min((Number(slot.width) || 0) / W, (Number(slot.height) || 0) / H)
  return Math.round(Math.max(0.1, Math.min(RECEIPT_FX.flyScale, k)) * 1000) / 1000
}

// Bản sao phiếu (kèm kẹp gỗ ở mép trên) bay vào chỗ trống trên dây phiếu (kẹp nhỏ ở tab Quầy: thu về cỡ một phiếu nhỏ);
// chạm tới thì phiếu mới trên dây lóe sáng.
function flyToRail(ctx, shot, slot, ticket) {
  const { app } = ctx
  const fx = app.vfx
  if (!fx || typeof fx.fly !== 'function' || !shot || !slot || isReduced(app)) return
  const doc = ctx.el.ownerDocument
  const node = doc.createElement('div')
  node.className = 'rc-fly'
  const copy = shot.node.cloneNode(true)
  for (const e of [copy, ...copy.querySelectorAll('[data-testid],[id]')]) { e.removeAttribute('data-testid'); e.removeAttribute('id') }
  node.appendChild(copy)
  const clip = doc.createElement('span')
  clip.className = 'rc-fly-clip'
  clip.setAttribute('aria-hidden', 'true')
  clip.innerHTML = scene('kep_phieu')
  node.appendChild(clip)
  let job = null
  const scale = flyScaleFor(shot.rect.width, shot.rect.height, slot)
  try { job = fx.fly(shot.rect, slot, { node, ms: RECEIPT_FX.fly, arc: 0.35, scale, bump: false }) } catch { job = null }
  if (!job || typeof job.then !== 'function') return
  job.then(ok => {
    if (!ok || ctx.destroyed()) return
    const t = doc.querySelector(`[data-testid="rail-ticket-${ticket.id}"]`)
    if (t && typeof fx.glow === 'function') { try { fx.glow(t) } catch { /* bỏ qua */ } }
  }, () => {})
}
