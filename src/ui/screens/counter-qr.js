// Quầy, khâu 3 (Tính tiền) — chuyển khoản QR (M5 Đợt 2, gói Q-C).
// Cảnh: mặt quầy, khách giơ điện thoại (art/scene.js phoneQr + QR giả fakeQrSvg có chữ "QR GAME") — màn hình là ảnh
// chuyển khoản (mã QR của xe + số tiền ở dải dưới); bên cạnh là thẻ Tổng và ô báo tiền của quán ([qr-status, data-arrived]:
// Loa báo tiền nếu đã mua, không thì điện thoại của quán). Thanh nút dính đáy: "Từ chối ảnh giả" / "Đã nhận đủ".
// Đã thu xong: thu gọn thành một dòng (điện thoại nhỏ + "Đã nhận …") để phiếu thu bên dưới đủ chỗ.
//
// Hiệu ứng chỉ chạy theo SỰ KIỆN, vẽ lại không phát lại (panel Quầy vẽ lại toàn bộ theo stateSig):
//   - tiền về: sự kiện 'qr.arrived' trên bus (nghe bằng một lần đăng ký cho mỗi panel, tự gỡ khi panel đã hủy) → âm "ting",
//     ghi một cờ cho khách đang ở quầy; lần vẽ kế tiếp tiêu cờ: vệt quét sáng chạy dọc màn hình điện thoại + ô báo tiền nảy;
//   - khách giơ máy: lần đầu khâu QR hiện cho khách này (không tính lần dựng đầu sau khi mở lại game) → điện thoại đưa lên;
//   - bấm "Đã nhận đủ" khi tiền đã về → âm "keng", xu bay từ điện thoại về ví HUD (sự kiện DOM 'vfx-coin' trên
//     [data-testid="hud-wallet"] như tiền mặt, source 'qr'); tiền chưa về → ô báo tiền rung; xác nhận nhầm ảnh giả → bản sao
//     điện thoại bị đóng dấu đỏ "ẢNH GIẢ";
//   - "Từ chối ảnh giả": đúng ảnh giả → bản sao điện thoại bị đóng dấu "ẢNH GIẢ", khách rút máy đi; từ chối nhầm khách
//     thật → dấu "TỪ CHỐI" xám + rung.
// Hoạt ảnh trên nút của panel dùng WAAPI (không phải lớp CSS) để lần vẽ lại sau đó không phát lại; bản sao nằm ở lớp hiệu
// ứng (app.vfx.layer), tự dọn khi xong. Giảm chuyển động: không vệt quét, không bay, dấu hiện bằng độ mờ; âm giữ nguyên.
// Mọi hàm nhận ctx chung của panel Quầy (counter.js). Import trong Node được: không chạm DOM ở cấp module.
import { h, svgBox } from '../dom.js'
import { fakeQrSvg } from '../art.js'
import { phoneQr, SCENE_META } from '../art/scene.js'
import { INK } from '../art/kit.js'
import { confirmQr, rejectQr, qrSpeakerOn } from '../../core/order.js'
import { isReduced, EASE } from '../motion.js'
import { formatVND, fill } from '../format.js'

/** Nhịp hiệu ứng khâu QR (ms). */
export const QR_FX = Object.freeze({ raise: 420, scan: 820, pop: 380, stamp: 220, hold: 560, away: 360, safety: 2600 })

/** Chữ con dấu trên bản sao điện thoại. */
export const QR_STAMPS = Object.freeze({ fake: 'ẢNH GIẢ', wrong: 'TỪ CHỐI' })

// ---------- Hình nhỏ của ô báo tiền (viewBox 64, viền mực, ba tông, sáng trên-trái) ----------

const SVG_HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  `<g stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">`

/** Loa báo tiền: đang chạy (sóng âm), tắt vì cúp điện (xám, dấu ✗). Chuỗi SVG thuần. */
export function speakerSvg(on = true) {
  const body = on ? '#e8483a' : '#c4b6a2'
  const dark = on ? '#a42a1d' : '#8f8170'
  const tail = on
    ? '<path d="M50 28C53.5 32 53.5 42 50 46" fill="none"/><path d="M55.5 22.5C61.5 29 61.5 45 55.5 51.5" fill="none"/>'
    : '<path d="M50 31L58 39M58 31L50 39" fill="none" stroke="#d8392b" stroke-width="3.4"/>'
  return SVG_HEAD +
    `<ellipse cx="28" cy="58" rx="17" ry="3.2" fill="${INK}" opacity=".15" stroke="none"/>` +
    `<rect x="12" y="9" width="32" height="47" rx="10" fill="${body}"/>` +
    `<path d="M35.5 10.6C39.8 12.2 42.4 15.6 42.4 20V45C42.4 50.2 39 54 34 54.4H31C35 52 36.6 49 36.6 45V20C36.6 16 36.4 13 35.5 10.6Z" fill="${dark}" stroke="none"/>` +
    '<circle cx="28" cy="37" r="10.5" fill="#4a3426" stroke-width="2.4"/>' +
    '<circle cx="28" cy="37" r="4.4" fill="#7a5c44" stroke-width="1.75"/>' +
    '<path d="M21.4 33.4A8 8 0 0 1 26 29.6" fill="none" stroke="#fff" stroke-width="1.75" opacity=".35"/>' +
    `<circle cx="28" cy="19.5" r="3" fill="${on ? '#8edb6a' : '#d6cab5'}" stroke-width="1.75"/>` +
    '<ellipse cx="18.6" cy="22" rx="2.4" ry="6" fill="#fff" opacity=".45" stroke="none"/>' +
    tail + '</g></svg>'
}

/** Chuông báo của điện thoại quán (chưa mua Loa báo tiền). Chuỗi SVG thuần. */
export function bellSvg() {
  return SVG_HEAD +
    `<ellipse cx="32" cy="58" rx="16" ry="3" fill="${INK}" opacity=".15" stroke="none"/>` +
    '<path d="M25.4 46C25.4 51 28.4 54.2 32 54.2C35.6 54.2 38.6 51 38.6 46" fill="#ffe27a"/>' +
    '<path d="M32 9.6C22.4 9.6 16.4 17.4 16.4 27.4V38.4L11.6 46H52.4L47.6 38.4V27.4C47.6 17.4 41.6 9.6 32 9.6Z" fill="#f7b928"/>' +
    '<path d="M40.6 13.4C45 16.4 46.4 21.6 46.4 27.4V38.8L50.2 44.6H43.6L41.2 39V27.4C41.2 21.4 41.4 16.8 40.6 13.4Z" fill="#a87404" opacity=".55" stroke="none"/>' +
    '<circle cx="32" cy="7.4" r="3" fill="#f7b928" stroke-width="2.4"/>' +
    '<ellipse cx="24" cy="22.6" rx="2.6" ry="6.4" fill="#fff" opacity=".5" stroke="none"/>' +
    '<path d="M7.6 19C8.6 14.8 10.6 11.6 13.6 9.4M56.4 19C55.4 14.8 53.4 11.6 50.4 9.4" fill="none" stroke-width="2.6"/>' +
    '</g></svg>'
}

/** Dấu ✓ / ✗ tròn nhỏ (trạng thái đã thu / không có tiền về). Chuỗi SVG thuần. */
export function markSvg(ok = true) {
  const fill = ok ? '#43a63d' : '#d8392b'
  const glyph = ok ? '<path d="M20 33L28.4 41.4L44.6 24.6" fill="none" stroke="#fff" stroke-width="5.4"/>'
    : '<path d="M23 23L41 41M41 23L23 41" fill="none" stroke="#fff" stroke-width="5.4"/>'
  return SVG_HEAD + `<circle cx="32" cy="32" r="22" fill="${fill}"/>` +
    '<ellipse cx="24" cy="21" rx="6" ry="3.4" fill="#fff" opacity=".35" stroke="none"/>' + glyph + '</g></svg>'
}

// ---------- Hình học điện thoại (theo SCENE_META.dien_thoai: ô màn hình, dải số tiền) ----------

const PH = SCENE_META.dien_thoai
const pct = (v, of) => `${Math.round((v / of) * 10000) / 100}%`
// ô (theo viewBox của hình) → kiểu định vị phần trăm trên khung điện thoại
function boxStyle(r) {
  return { left: pct(r.x, PH.vb[0]), top: pct(r.y, PH.vb[1]), width: pct(r.w, PH.vb[0]), height: pct(r.h, PH.vb[1]) }
}
// dải số tiền: cao bằng dải của hình, rộng bằng màn hình (số dài vẫn nằm trong màn)
const NOTE_BOX = { x: PH.screen.x, y: PH.note.y, w: PH.screen.w, h: PH.note.h }

let phoneArtCache = ''
// Điện thoại của khách có mã QR (giả, chữ "QR GAME") của xe trên màn hình. Dựng lười, một lần.
function phoneArt() {
  if (!phoneArtCache) phoneArtCache = phoneQr(fakeQrSvg(0))
  return phoneArtCache
}

// ---------- Trạng thái giao diện theo khách (cờ hiệu ứng), đăng ký bus theo panel ----------

// ctx.ui (đổi khi đổi khách) → { qrSeen, scanPending }
const uiFx = new WeakMap()
function fxOf(ctx) {
  const ui = ctx.ui
  let st = uiFx.get(ui)
  if (!st) { st = { qrSeen: false, scanPending: false }; uiFx.set(ui, st) }
  return st
}

// ctx (một panel Quầy) → hàm gỡ đăng ký 'qr.arrived'
const listening = new WeakMap()
function listen(ctx) {
  if (listening.has(ctx)) return
  const bus = ctx.app && ctx.app.bus
  if (!bus || typeof bus.on !== 'function') { listening.set(ctx, null); return }
  let off = null
  off = bus.on('qr.arrived', payload => {
    try {
      if (ctx.destroyed()) { if (off) off(); return }
      onArrived(ctx, payload || {})
    } catch { /* hiệu ứng lỗi không được chặn bus miền */ }
  })
  listening.set(ctx, off)
}

// Tiền chuyển khoản về (bus, trong advance(), trước lần vẽ lại của khung hình này).
function onArrived(ctx, { customerId }) {
  const { app } = ctx
  const c = ctx.counter()
  if (!c || c.payMethod !== 'qr' || (customerId && c.customerId !== customerId)) return
  app.sound('ting')
  fxOf(ctx).scanPending = true
  // Loa báo tiền đang chạy: lõi tự xác nhận ngay sau sự kiện này → xu bay từ điện thoại (vị trí trước khi thu gọn) về ví
  if (qrSpeakerOn(app.state)) {
    const shot = measure(phoneNode(ctx))
    const sale = Number(c.amountDue) || 0
    later(() => {
      const cc = ctx.counter()
      if (!ctx.destroyed() && cc && cc.customerId === c.customerId && cc.paid && !cc.fakeQr) payCoins(ctx, shot, sale)
    })
  }
}

// ---------- Vẽ ----------

export function renderQr(ctx, customer, c) {
  const { app, S } = ctx
  listen(ctx)
  const st = fxOf(ctx)
  const arrived = !!c.qrArrived
  const owned = !!(app.state.upgrades && app.state.upgrades.loa_bao_tien)
  const speakerOn = qrSpeakerOn(app.state)
  const reduced = isReduced(app)
  // khách vừa giơ máy: lần đầu khâu QR hiện cho khách này, trừ lần dựng đầu tiên của panel (mở lại game giữa khâu)
  const raise = !st.qrSeen && ctx.ui.stageKey !== null && !c.paid
  st.qrSeen = true
  const scan = st.scanPending
  st.scanPending = false

  const paid = !!c.paid
  const lost = paid && !!c.fakeQr
  const amount = formatVND(c.amountDue)
  const source = owned ? (speakerOn ? 'Loa báo tiền' : 'Loa báo tiền (mất điện)') : 'Điện thoại của quán'
  const statusText = lost ? 'Không có tiền về' : arrived ? fill(S.labels.qrArrived, { amount }) : S.labels.qrWaiting
  const statusIcon = lost ? markSvg(false) : (paid ? markSvg(true) : owned ? speakerSvg(speakerOn) : bellSvg())
  const status = h('div', {
    class: ['qc-status', arrived ? 'is-arrived' : lost ? 'is-lost' : 'is-waiting'], testid: 'qr-status', role: 'status',
    dataset: { arrived: arrived ? 'true' : 'false' }, 'aria-live': 'polite'
  },
  svgBox(statusIcon, 'qc-status-ico'),
  h('span', { class: 'qc-status-body' },
    h('b', { class: 'qc-status-text' }, statusText),
    h('small', { class: 'qc-status-src' }, paid ? (lost ? 'Ảnh chuyển khoản giả' : 'Chuyển khoản QR') : source)))

  const phone = renderPhone(amount, paid)
  const wrap = h('div', { class: ['qc-qr', paid ? 'is-paid' : '', arrived ? 'is-arrived' : ''], dataset: { qr: lost ? 'lost' : paid ? 'paid' : arrived ? 'arrived' : 'waiting' } })
  if (paid) {
    wrap.appendChild(h('div', { class: 'qc-paidline' }, phone, status))
  } else {
    wrap.appendChild(h('div', { class: 'qc-scene' },
      h('div', { class: 'qc-hold' }, phone),
      h('div', { class: 'qc-side' },
        h('div', { class: 'qc-due' }, h('span', { class: 'qc-due-k' }, 'Tổng'), h('b', { class: 'qc-due-v', testid: 'amount-due' }, amount)),
        status),
      h('span', { class: 'qc-plank', 'aria-hidden': 'true' })))
    // M4: cúp điện theo lịch (sự kiện ngày) → Loa báo tiền tắt, không tự xác nhận, không chặn ảnh giả
    if (owned && !speakerOn) {
      wrap.appendChild(h('p', { class: 'qc-warn qr-speaker-off', testid: 'qr-speaker-off' }, 'Cúp điện, Loa báo tiền đang tắt: tự xem tiền về đúng số rồi mới bấm.'))
    }
    wrap.appendChild(h('p', { class: 'qc-note' }, 'Chỉ bấm "Đã nhận đủ" khi thông báo tiền về đúng số. Ảnh chụp màn hình không phải là tiền.'))
    wrap.appendChild(h('div', { class: 'action-row act-bar qc-act' },
      h('button', {
        class: 'g-btn qc-btn qc-reject', type: 'button', testid: 'qr-reject', onclick: () => doRejectQr(ctx)
      }, svgBox(markSvg(false), 'g-ico qc-btn-ico'), h('span', null, 'Từ chối ảnh giả')),
      h('button', {
        class: ['g-btn', 'qc-btn', 'qc-confirm', arrived ? 'g-btn--go' : 'is-wait'], type: 'button', testid: 'qr-confirm',
        dataset: { ready: arrived ? 'true' : 'false' }, onclick: () => doConfirmQr(ctx)
      }, arrived ? svgBox(markSvg(true), 'g-ico qc-btn-ico') : null, h('span', null, S.buttons.qrConfirm))))
  }

  // hiệu ứng theo sự kiện: chạy sau khi panel gắn nút mới (vi tác vụ, trước khung hình kế tiếp)
  if (!reduced && (raise || scan)) {
    later(() => {
      if (ctx.destroyed() || !phone.isConnected) return
      if (raise) animate(phone.closest('.qc-hold') || phone, [
        { transform: 'translateY(46%) rotate(-9deg)', opacity: 0 },
        { transform: 'translateY(-5%) rotate(2deg)', opacity: 1, offset: 0.62 },
        { transform: 'translateY(0) rotate(0deg)', opacity: 1 }
      ], { duration: QR_FX.raise, easing: EASE.outCubic })
      if (scan) playScan(phone, status)
    }, true)
  }
  return wrap
}

// Điện thoại của khách: hình + số tiền ở dải dưới màn hình + vệt quét (ẩn, chỉ chạy khi tiền về).
function renderPhone(amount, small) {
  return h('div', { class: ['qc-phone', small ? 'is-small' : ''], 'aria-label': 'Ảnh chuyển khoản khách giơ: ' + amount, role: 'img' },
    svgBox(phoneArt(), 'qc-phone-art'),
    small ? null : h('span', { class: 'qc-shot', style: boxStyle(NOTE_BOX), 'aria-hidden': 'true' }, h('b', null, amount)),
    h('span', { class: 'qc-screen', style: boxStyle(PH.screen), 'aria-hidden': 'true' }, h('span', { class: 'qc-scan' })))
}

// Vệt quét sáng chạy dọc màn hình điện thoại, ô báo tiền nảy (chỉ transform / opacity).
function playScan(phone, status) {
  const bar = phone.querySelector('.qc-scan')
  if (bar) {
    animate(bar, [
      { transform: 'translateY(-110%)', opacity: 0 },
      { transform: 'translateY(40%)', opacity: 1, offset: 0.18 },
      { transform: 'translateY(420%)', opacity: 1, offset: 0.82 },
      { transform: 'translateY(560%)', opacity: 0 }
    ], { duration: QR_FX.scan, easing: 'ease-in-out' })
  }
  if (status && status.isConnected) {
    animate(status, [
      { transform: 'scale(.9)' },
      { transform: 'scale(1.06)', offset: 0.55 },
      { transform: 'scale(1)' }
    ], { duration: QR_FX.pop, easing: EASE.outCubic })
  }
}

// ---------- Thao tác ----------

// "Đã nhận đủ": tiền thật về → xong; ảnh giả → Anh Khoa nhắc; Loa báo tiền chặn ảnh giả; chưa về → nhắc chờ.
export function doConfirmQr(ctx) {
  const { app, S } = ctx
  const c0 = ctx.counter()
  const sale = c0 ? Number(c0.amountDue) || 0 : 0
  const shot = measure(phoneNode(ctx))   // chụp TRƯỚC khi đổi state (panel vẽ lại thì điện thoại thu gọn / mất)
  const r = confirmQr(app.state, app.ctx)
  let after = null
  if (r.ok && !r.fake) {
    app.sound('keng')
    app.toast('Đã nhận tiền chuyển khoản.', { kind: 'good', duration: 1400 })
    after = () => payCoins(ctx, shot, sale)
  } else if (r.ok && r.fake) {
    app.sound('error'); app.vibrate(80)
    app.toast(app.data.DIALOGUE.anhKhoa.fakeQr, { kind: 'bad', title: 'Anh Khoa', duration: 3200 })
    after = () => verdict(ctx, shot, 'fake', { shake: true })
  } else if (r.blocked) {
    app.sound('stamp')
    app.toast('Loa báo tiền không kêu: ảnh chuyển khoản giả, khách bỏ đi.', { kind: 'good' })
    after = () => verdict(ctx, shot, 'fake')
  } else if (r.reason === 'chua_ve') {
    app.sound('error')
    app.toast(S.messages.qrNotArrived, { kind: 'bad' })
    after = () => nudgeStatus(ctx)
  }
  app.save()
  ctx.rerender()
  if (after) after()
}

// "Từ chối ảnh giả": đúng là ảnh giả → khách bỏ đi; khách đã chuyển thật → khách bực bỏ đi.
export function doRejectQr(ctx) {
  const { app } = ctx
  const shot = measure(phoneNode(ctx))
  const r = rejectQr(app.state, app.ctx)
  if (!r.ok) return
  if (r.fake) {
    app.sound('stamp'); app.sound('ding')
    app.toast('Bắt được ảnh chuyển khoản giả! Khách ngượng ngùng bỏ đi.', { kind: 'good' })
  } else {
    app.sound('error'); app.vibrate(60)
    app.toast('Khách đã chuyển thật mà bị từ chối, khách bực bỏ đi.', { kind: 'bad' })
  }
  app.save()
  ctx.rerender()
  verdict(ctx, shot, r.fake ? 'fake' : 'wrong', { shake: !r.fake })
}

// ---------- Hiệu ứng (lớp app.vfx, tự dọn) ----------

const phoneNode = ctx => (ctx.el && typeof ctx.el.querySelector === 'function' ? ctx.el.querySelector('.qc-phone') : null)

// Vị trí (tọa độ khung nhìn) + phần tử để nhân bản; null nếu không thấy / không hiển thị.
function measure(node) {
  if (!node || typeof node.getBoundingClientRect !== 'function' || !node.isConnected) return null
  const r = node.getBoundingClientRect()
  if (!r.width || !r.height) return null
  return { node, rect: { left: r.left, top: r.top, width: r.width, height: r.height } }
}

// Chạy fn sau lần vẽ hiện tại: vi tác vụ (micro = true, trước khi trình duyệt vẽ khung hình) hoặc khung hình kế tiếp.
function later(fn, micro = false) {
  const run = () => { try { fn() } catch { /* hiệu ứng lỗi không chặn trò chơi */ } }
  if (micro && typeof queueMicrotask === 'function') queueMicrotask(run)
  else if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
  else setTimeout(run, 0)
}

// WAAPI trên một nút của panel (không có fill: hết hoạt ảnh là về đúng kiểu CSS của nút).
function animate(el, keyframes, opts) {
  if (!el || typeof el.animate !== 'function') return null
  try { return el.animate(keyframes, opts) } catch { return null }
}

// Xu bay từ điện thoại về ví HUD; mỗi xu chạm ví phát sự kiện DOM 'vfx-coin' (source 'qr') để HUD đếm số.
function payCoins(ctx, shot, sale) {
  const fx = ctx.app.vfx
  if (!fx || typeof fx.coins !== 'function' || !shot || sale <= 0) return
  const doc = ctx.el.ownerDocument
  const wallet = doc && doc.querySelector('[data-testid="hud-wallet"]')
  if (!wallet) return
  const onArrive = info => {
    try { wallet.dispatchEvent(new CustomEvent('vfx-coin', { detail: { ...info, source: 'qr' } })) } catch { /* bỏ qua */ }
  }
  try { fx.coins(shot.rect, wallet, { amount: sale, unit: 1000, onArrive }) } catch { /* bỏ qua */ }
}

// Bấm "Đã nhận đủ" khi tiền chưa về: ô báo tiền (nút mới sau khi vẽ lại) rung nhẹ (giảm chuyển động: chớp viền).
function nudgeStatus(ctx) {
  const fx = ctx.app.vfx
  const el = ctx.el.querySelector('[data-testid="qr-status"]')
  if (fx && el && typeof fx.shake === 'function') { try { fx.shake(el, 2) } catch { /* bỏ qua */ } }
}

// Bản sao điện thoại tại chỗ cũ ở lớp hiệu ứng, con dấu đập xuống ("ẢNH GIẢ" đỏ / "TỪ CHỐI" xám), giữ một nhịp rồi khách
// rút máy (trượt xuống, mờ dần). Tự dọn khi xong, khi vfx.clear() gỡ khỏi lớp, hoặc quá giờ an toàn.
function verdict(ctx, shot, kind, { shake = false } = {}) {
  const fx = ctx.app.vfx
  let layer = null
  try { layer = fx && fx.layer } catch { layer = null }
  const doc = layer && layer.ownerDocument
  if (!shot || !layer || !doc || doc.visibilityState === 'hidden' || typeof layer.getBoundingClientRect !== 'function') return
  const reduced = isReduced(ctx.app)
  const L = layer.getBoundingClientRect()
  const wrap = doc.createElement('div')
  wrap.className = 'qc-fx-phone'
  wrap.dataset.kind = kind
  wrap.style.left = `${(shot.rect.left - L.left).toFixed(1)}px`
  wrap.style.top = `${(shot.rect.top - L.top).toFixed(1)}px`
  wrap.style.width = `${shot.rect.width.toFixed(1)}px`
  wrap.style.height = `${shot.rect.height.toFixed(1)}px`
  const copy = shot.node.cloneNode(true)
  for (const e of [copy, ...copy.querySelectorAll('[data-testid],[id]')]) { e.removeAttribute('data-testid'); e.removeAttribute('id') }
  wrap.appendChild(copy)
  const stamp = doc.createElement('span')
  stamp.className = 'qc-fx-stamp'
  stamp.dataset.kind = kind
  stamp.textContent = QR_STAMPS[kind] || QR_STAMPS.fake
  wrap.appendChild(stamp)
  layer.appendChild(wrap)
  let done = false
  const end = () => {
    if (done) return
    done = true
    clearTimeout(safety)
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap)
  }
  const safety = setTimeout(end, QR_FX.safety)
  if (typeof wrap.animate !== 'function') { setTimeout(end, QR_FX.hold); return }
  const T = 'translate(-50%, -50%) rotate(-10deg)'
  const s = stamp.animate(reduced
    ? [{ opacity: 0, transform: T }, { opacity: 1, transform: T }]
    : [{ opacity: 0, transform: `${T} scale(1.8)` }, { opacity: 1, transform: `${T} scale(.94)`, offset: 0.8 }, { opacity: 1, transform: `${T} scale(1)` }],
  { duration: reduced ? 150 : QR_FX.stamp, easing: 'ease-out', fill: 'both' })
  const away = () => {
    if (done) return
    try {
      const a = wrap.animate(reduced
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ opacity: 1, transform: 'translateY(0) rotate(0deg)' }, { opacity: 0, transform: 'translateY(42px) rotate(6deg)' }],
      { duration: QR_FX.away, delay: QR_FX.hold, easing: 'ease-in', fill: 'both' })
      a.addEventListener('finish', end)
      a.addEventListener('cancel', end)
    } catch { end() }
  }
  s.addEventListener('finish', () => {
    if (shake && !reduced && fx && typeof fx.shake === 'function') { try { fx.shake(copy, 2) } catch { /* bỏ qua */ } }
    away()
  })
  s.addEventListener('cancel', end)
}
