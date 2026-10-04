// Màn Ca bán: HUD, hàng khách, tiến trình 4 khâu, dây phiếu, 2 panel Quầy/Bếp, phiếu chấm, xử lý phàn nàn.
// M3: tình huống trong ca (hộp thoại chặn thời gian ca — kiên nhẫn khách tạm dừng) chỉ bật ở tab Quầy, giữa hai khách
// (ngay sau khi kẹp phiếu, hoặc lúc quầy trống), không chen vào mini-game; khách quen trả nợ báo đầu ca.
// 0.4.1: hướng dẫn lần đầu theo khâu đang làm (tour Quầy: Order, bảng chọn món, Thanh toán, Tính tiền, chuyển khoản, phiếu
// thu; Bếp: dây phiếu, dòng món, chọn nguyên liệu, Thớt, giao món; phiếu chấm) — tự hiện lần đầu, không chen vào mini-game;
// khi tour hoặc bảng Hướng dẫn (nút "?" trên HUD) đang mở thì ca TẠM DỪNG (setPaused: kiên nhẫn khách, giờ ca đứng yên),
// đồng hồ bước Chọn đứng yên, phiếu chấm chưa tắt.
// M5 Đợt 2 (bước 0): phần dựng phiếu chấm chuyển sang components/score-sheet.js, phần dựng hộp tình huống và hộp phàn nàn
// sang components/incident-view.js (tệp này giữ luồng: hàng đợi phiếu, sheetSettled, khi nào mở hộp, gọi lõi, âm, lưu).
// M5 Đợt 2 (gói Q-D): dải phố thành cảnh xe đẩy — mái bạt sọc (CSS), khách bán thân (art/people.js) đứng sau mặt quầy
// (mặt trước xe đẩy, art/scene.js), xếp hàng nhỏ dần 100 / 85 / 70%, vòng kiên nhẫn ôm quanh đầu, hơi nước khi kiên nhẫn
// thấp; khách vào / ra / lên chỗ / sang chỗ chờ món chỉ hoạt ảnh MỘT lần theo id (nút giữ theo id, vẽ lại không phát lại);
// thanh tab Quầy / Bếp có biểu tượng và huy hiệu số.
import { h, svgBox } from '../dom.js'
import { DI_SAU } from '../art.js'
import { bust, head } from '../art/people.js'
import { SCENE, SCENE_ICONS, TAB_ICONS } from '../art/scene.js'
import { isReduced, EASE } from '../motion.js'
import { incidentDue, openIncident, resolveIncident } from '../../core/incidents.js'
import { isShiftOver, endShift, setPaused } from '../../core/shift.js'
import { beginCounter } from '../../core/order.js'
import { stageOf, personaObj } from '../../core/customer.js'
import { resolveComplaint, complaintRemakeOk } from '../../core/kitchen.js'
import { createHud } from '../components/hud.js'
import { createProgress4 } from '../components/progress4.js'
import { createTicketRail } from '../components/ticket-rail.js'
import { createRing, moodFor, LOW_PATIENCE, createSteam } from '../components/patience.js'
import { mountCounter } from './counter.js'
import { renderScoreSheet } from '../components/score-sheet.js'
import { createIncidentBox, renderComplaint } from '../components/incident-view.js'
import { formatVND } from '../format.js'
import { questDef, questText } from '../../core/quests.js'
import { chainDefs } from '../../core/chains.js'
import { icon } from '../art.js'
import { npcFace } from '../components/meta-ui.js'

// Mã lỗi theo hàng của phiếu chấm và hàm dựng phiếu: components/score-sheet.js (xuất lại ở đây, giữ API cũ của màn).
export { TOTAL_CODES, CHANGE_CODES, renderScoreSheet } from '../components/score-sheet.js'
const SHEET_MS = 2000
const END_DELAY_MS = 1200
// M5: chế độ tập trung khi nấu chỉ bật ở khung thấp hơn chừng này (px).
// Vừa màn (L0): so với chiều cao DÙNG ĐƯỢC của màn (cao màn − vùng an toàn trên − vùng an toàn dưới), không phải cao màn.
export const FOCUS_MAX_H = 760
// Chồng thông báo đang có thông báo, hoặc thẻ Mẹo nghề đang chờ chỗ (toast.js opts.fit): xét lại chỗ trống mỗi chừng này ms
// (thẻ chờ hiện khi vừa; chồng đang nổi nhường chỗ khi bong bóng khách hiện ngay dưới). Thẻ chờ chỗ được xét lại tối đa
// TIP_RECHECK_MAX_MS kể từ lúc mở (sau đó chỉ khi có thông báo mới / thông báo tắt / đổi tab / đổi cỡ màn).
const TOAST_RECHECK_MS = 400
const TIP_RECHECK_MAX_MS = 180000

// ---------- Vừa màn (L0): khung chung của màn Ca bán ----------
// Màn Ca bán chia: HUD | (tab Quầy) CẢNH cao --scene-h nằm dưới panel Quầy trong suốt — mái bạt, hàng trên (hàng khách,
// kẹp phiếu), hàng giữa (khách ở quầy + bong bóng do panel Quầy vẽ), dải mặt trước xe đẩy mang biển 4 khâu — rồi KHAY công
// cụ của khâu (phần còn lại) | thanh tab. Tab Bếp: dải mặt khách 58 + dây phiếu đầy đủ 56 trong luồng, thanh 4 khâu cao 0.
// Bậc (data-fit) theo chỗ giữa HUD và thanh tab (A); cảnh theo bậc; mọi số đo ghi lên .service-screen KHI ĐỔI (mount và
// ResizeObserver), không đọc kích thước mỗi khung hình.
/** Bậc khung theo chiều cao giữa HUD và thanh tab (px): 'l' | 'm' | 's' | 'xs'. */
export function frameFit(avail) {
  const a = Number(avail) || 0
  return a >= 640 ? 'l' : a >= 540 ? 'm' : a >= 440 ? 's' : 'xs'
}
/** Chiều cao cảnh tab Quầy (px) theo bậc và chỗ giữa HUD và thanh tab. */
export function sceneHeight(fit, avail) {
  const a = Number(avail) || 0
  if (fit === 'l') return Math.min(296, Math.round(0.375 * a))
  if (fit === 'm') return Math.min(226, Math.round(0.335 * a))
  if (fit === 's') return Math.min(176, Math.round(0.325 * a))
  return 116
}
/** Mái bạt + hàng trên của cảnh tab Quầy (px) theo bậc — khớp css/game.css (--sc-row). */
export const SCENE_ROW = Object.freeze({ l: 60, m: 58, s: 56, xs: 54 })
/** Dải mặt trước xe đẩy ở đáy cảnh tab Quầy (px) theo bậc — khớp css/game.css (--sc-cart). */
export const SCENE_CART = Object.freeze({ l: 36, m: 34, s: 20, xs: 16 })
// Phần tử "để đọc" ở hàng giữa của cảnh tab Quầy (lời khách: bong bóng, lời qua lại; phiếu order hình, tiền khách đưa + Tổng
// trên mặt quầy): chồng thông báo nổi dừng trên đỉnh phần tử cao nhất đang thấy (toastEdge), không che chữ của khách.
const SCENE_READ_SEL = '.co-cust-area .co-bubble, .co-cust-area .co-talk, .cs-slip, .cs-mat, .cs-facts'
// Khoảng hở (px) giữa đáy chồng thông báo và đỉnh phần tử để đọc (viền + đệm của bong bóng còn ~8px trước dòng chữ đầu).
const TOAST_GAP = 2
/** Tab Bếp: dải mặt khách và dây phiếu đầy đủ (px) — khớp css/game.css, css/street.css. */
export const KITCHEN_STRIP_H = 58
export const KITCHEN_RAIL_H = 56
/** Số khách xếp hàng (ngoài khách ở quầy) hiện ở hàng trên của cảnh tab Quầy; dư thì gộp viên "+n". */
export function queueShowMax(fit, width) {
  if (fit === 's' || fit === 'xs') return 0
  return (Number(width) || 0) < 360 ? 1 : 2
}

// ---------- Dải phố (gói Q-D) ----------
/** Cỡ khách trong hàng theo vị trí (khách ở quầy 100%, kế tiếp 85%, cuối 70%); khách chờ món nhỏ hơn nữa. */
export const QUEUE_SCALES = Object.freeze([1, 0.85, 0.7])
/** Số khách chờ món hiện ở dải phố (thêm thì gộp "+n"). */
export const WAIT_SHOW_MAX = 3
// Mặt trước xe đẩy (scene.js, khung 360 × 96): chỉ lấy dải trên (mặt quầy gỗ, viền đỏ, mép biển tên) làm mặt quầy của dải
// phố; khách bán thân đứng sau, quầy che từ ngực trở xuống.
const CART_STRIP = String(SCENE.xe_mat_truoc || '').replace(/viewBox="[^"]*"/, 'viewBox="0 43 360 53" preserveAspectRatio="xMidYMin slice"')
// Mây giận nhỏ bay trên đầu khách bỏ về (vẽ tay: viền mực, mây xám, tia giận).
const ANGRY_CLOUD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 28"><g stroke="#3a2618" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">' +
  '<path d="M9 22C4 22 3 15 8 14C8 8 15 6 18 10C20 5 29 5 30 11C36 10 38 18 33 21C31 23 28 22 27 22Z" fill="#6f6a78"/>' +
  '<path d="M12 13.5C13 11 16 10.5 17.5 12" fill="none" stroke="#a49fae" stroke-width="2"/>' +
  '<path d="M16 25L19 21L21 24L24 20" fill="none" stroke="#e8483a" stroke-width="2.2"/></g></svg>'
// Huy hiệu mũi tên ↓ trên thẻ tròn của khách đang ở quầy (chỉ xuống panel Quầy, nơi có bán thân lớn của khách).
const HERE_ARROW = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.6" fill="#f7b928" stroke="#3a2618" stroke-width="2.2"/>' +
  '<path d="M10 5.4V13.6M6.4 10.2L10 13.8L13.6 10.2" fill="none" stroke="#3a2618" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'

/** Kiểu rời đi của khách (hoạt ảnh một lần): vui (đã nhận món), giận (hết kiên nhẫn / bị từ chối QR thật), lặng lẽ (khác). */
export function exitKindOf(c) {
  if (!c) return 'quiet'
  if (c.status === 'roi_di') return (Number(c.stars) || 5) <= 2 ? 'quiet' : 'happy'
  if (c.status === 'bo_ve' && (c.lostReason === 'het_kien_nhan' || c.lostReason === 'tu_choi_qr')) return 'angry'
  return 'quiet'
}

export default {
  mount(root, app) {
    const S = app.data.STRINGS
    const state0 = app.state
    if (!state0.shift) { setTimeout(() => app.go('prep'), 0); return { unmount() {} } }
    // ca thật không bao giờ tự dừng: bản lưu ghi lúc hướng dẫn đang hiện (tải lại trang giữa tour) thì chạy tiếp
    if (state0.shift.paused && !state0.shift.tasting && !(app.tour && app.tour.isHeld())) setPaused(state0, false)

    const hud = createHud(app)
    const progress = createProgress4(app.data)
    const rail = createTicketRail(app, { onTap: id => { showTab('kitchen'); app.bus.emit('ui.ticket.select', { ticketId: id }) } })
    const queueBox = h('div', { class: 'queue', testid: 'queue' })
    const waitBox = h('div', { class: 'waiting', testid: 'waiting' })
    // lớp hoạt ảnh của dải phố (khách rời đi, khách sang chỗ chờ món): nằm dưới mặt quầy, trên nền phố; không nhận chạm
    const streetFx = h('div', { class: 'st-fx', 'aria-hidden': 'true' })
    const street = h('section', { class: 'street' },
      h('div', { class: 'st-awning', 'aria-hidden': 'true' }), queueBox, waitBox, streetFx,
      h('div', { class: 'st-counter', 'aria-hidden': 'true', html: CART_STRIP }))
    const panelCounter = h('section', { class: 'panel panel-counter', testid: 'panel-counter' })
    const panelKitchen = h('section', { class: 'panel panel-kitchen', testid: 'panel-kitchen', hidden: true })
    const tabCounter = h('button', { class: 'tab', type: 'button', testid: 'tab-counter', role: 'tab', onclick: () => showTab('counter') })
    const tabKitchen = h('button', { class: 'tab', type: 'button', testid: 'tab-kitchen', role: 'tab', onclick: () => showTab('kitchen') })
    const tabbar = h('nav', { class: 'tabbar', role: 'tablist' }, tabCounter, tabKitchen)
    const sheetHost = h('div', { class: 'sheet-host' })
    const panels = h('div', { class: 'panels' }, panelCounter, panelKitchen)
    // data-scene="1": bố cục CẢNH + KHAY của panel Quầy là mặc định (luôn bật) — giữ thuộc tính cho các bộ chọn [data-scene]
    // của css/cashier.css, css/receipt.css và bản sao hiệu ứng (counter-pay.js fxFrameOf).
    const el = h('section', { class: 'service-screen', testid: 'screen-service', dataset: { tab: 'counter', cook: '', scene: '1' } },
      hud.el, street, progress.el, rail.el, panels, tabbar, sheetHost)
    root.appendChild(el)

    let active = 'counter'
    const dots = { counter: false, kitchen: false }
    let destroyed = false
    const offs = []

    // ---------- Vừa màn (L0): đo khung (mount + ResizeObserver, không đọc kích thước mỗi khung hình) ----------
    // H = cao màn; HUD = 47 + an toàn trên; thanh tab = 49 + max(4, an toàn dưới). An toàn đọc qua phần đệm đã tính của HUD /
    // thanh tab (biến --safe-* trên iOS là chuỗi env(...), đọc thẳng ra NaN). U = H − an toàn (so FOCUS_MAX_H); A = H − HUD −
    // thanh tab (bậc, cảnh). Ghi data-fit + biến --hud-h, --usable-h, --avail-h, --scene-h, --tray-h, --kitchen-h CHỈ KHI ĐỔI.
    const frame = { H: -1, W: 0, U: -1, A: 0, fit: '', S: 0 }
    let cook = ''
    const varCache = Object.create(null)
    const setVar = (name, px) => {
      const v = Math.round(px) + 'px'
      if (varCache[name] === v) return
      varCache[name] = v
      el.style.setProperty(name, v)
    }
    // chiều cao .k-main dự kiến (tab Bếp): dây phiếu 56, dải mặt khách 58 trừ khi đang Chọn hoặc tập trung khi nấu
    const writeKitchenH = () => {
      if (frame.U < 0) return
      setVar('--kitchen-h', Math.max(0, frame.A - KITCHEN_RAIL_H - (focusOn || cook === 'chon' ? 0 : KITCHEN_STRIP_H)))
    }
    function measureFrame() {
      if (destroyed || !el.isConnected) return false
      const H = el.clientHeight
      if (!(H > 0)) return false
      const hudH = hud.el.offsetHeight
      const tabH = tabbar.offsetHeight
      const st = Math.max(0, (parseFloat(getComputedStyle(hud.el).paddingTop) || 0) - 4)
      const pb = parseFloat(getComputedStyle(tabbar).paddingBottom) || 0
      const sb = pb > 4.5 ? pb : 0
      frame.H = H
      frame.W = el.clientWidth
      frame.U = H - st - sb
      frame.A = Math.max(0, H - hudH - tabH)
      frame.fit = frameFit(frame.A)
      frame.S = sceneHeight(frame.fit, frame.A)
      if (el.dataset.fit !== frame.fit) el.dataset.fit = frame.fit
      setVar('--hud-h', hudH)
      setVar('--usable-h', frame.U)
      setVar('--avail-h', frame.A)
      setVar('--scene-h', frame.S)
      setVar('--tray-h', frame.A - frame.S)
      writeKitchenH()
      return true
    }
    function setCook(kind) {
      const k = kind === 'chon' || kind === 'thot' || kind === 'stage' ? kind : ''
      if (k === cook) return
      cook = k
      el.dataset.cook = k
      writeKitchenH()
    }

    // ---------- M5: chế độ tập trung khi nấu (thiết kế mục 1.9) ----------
    // Tab Bếp đang nấu (bước Chọn, Thớt hoặc sân khấu một bước) và khung cao dưới FOCUS_MAX_H: .service-screen.is-focus ẩn
    // dải khách và thanh 4 khâu (css/game.css) để panel Bếp cao thêm ~120px; dây phiếu (màu chờ) vẫn hiện. Bếp báo trạng thái
    // nấu qua onFocus TRƯỚC khi dựng mini-game (plugin đo khung lúc dựng) nên lớp được bật đồng bộ ngay trong lời gọi đó;
    // mỗi khung hình update() xét lại (đổi tab, xoay máy, đổi cỡ khung).
    // Thông báo nổi trong lúc tập trung: chờ tới khi thoát (bếp gửi phản hồi tức thì của chính nó với { now: true }).
    // Vòng sửa F: thông báo cũng chờ trong lúc bảng ra món của bếp đang hiện (mọi cỡ khung; bếp báo qua onReveal, và giữ
    // chế độ tập trung tới khi bảng đóng) — không thả ra đè ruy băng tên món ngay lúc bấm Ra món.
    let kitchenWantsFocus = false
    let focusOn = false
    let revealOpen = false
    const heldToasts = []
    // có thẻ Mẹo nghề vừa gửi (có thể đang chờ chỗ trong toast.js): xét lại hàng chờ mỗi TOAST_RECHECK_MS tới mốc này
    let tipWaitUntil = 0
    let toastCheckAt = 0
    const toastStack = (app.overlay && app.overlay.querySelector('.toast-stack')) || null
    // Chiều cao dùng được (so với FOCUS_MAX_H) và mọi số đo khung: đọc lại khi màn / HUD / thanh tab đổi cỡ (ResizeObserver
    // báo sau bố cục), không đọc kích thước mỗi khung hình — đọc kích thước giữa lúc trang vừa đổi DOM ép trình duyệt tính bố
    // cục sớm rồi tính lại lần nữa trong cùng khung (máy yếu: 20+ ms mỗi khung trong lúc con dấu, ra món).
    let sizeObs = null
    if (typeof ResizeObserver === 'function') {
      sizeObs = new ResizeObserver(() => { if (destroyed) return; measureFrame(); applyFocus(); if (tipWaitUntil) recheckToasts() })
      sizeObs.observe(el)
      sizeObs.observe(hud.el)
      sizeObs.observe(tabbar)
    }
    measureFrame()
    function applyFocus() {
      if (destroyed) return
      if (!sizeObs || frame.U < 0) measureFrame()
      const on = kitchenWantsFocus && active === 'kitchen' && el.isConnected && frame.U > 0 && frame.U < FOCUS_MAX_H
      if (on === focusOn) return
      focusOn = on
      el.classList.toggle('is-focus', on)
      writeKitchenH()
      // chồng thông báo nổi (lớp nổi gốc của app) lên sát HUD: không phủ xuống vùng nấu (css/game.css)
      if (app.overlay && app.overlay.classList) app.overlay.classList.toggle('is-cook-focus', on)
      if (!on) releaseToasts()
    }
    const holdingToasts = () => focusOn || revealOpen
    function releaseToasts() { if (!holdingToasts()) flushToasts() }
    const realToast = app.toast
    // gửi sang toast.js. Thẻ Mẹo nghề chỉ hiện khi vừa mốc chồng thông báo (opts.fit — không đè lời khách, xem toastEdge) và
    // gửi ở update() kế tiếp, SAU khi panel đã vẽ lại theo thao tác vừa mở thẻ (vd khách bắt lỗi: bong bóng đổi lời, cao lên)
    // — đo chỗ theo bong bóng mới, không theo bong bóng cũ; vẫn trước offerTour() của cùng khung hình (tour giữ thẻ đã nổi).
    const pendingTips = []
    function sendToast(text, opts) {
      if (opts && opts.kind === 'tip' && !destroyed) {
        pendingTips.push([text, { ...opts, fit: true }])
        tipWaitUntil = performance.now() + TIP_RECHECK_MAX_MS
        return null
      }
      return realToast.call(app, text, opts)
    }
    function sendPendingTips() {
      for (const [t, o] of pendingTips.splice(0)) { try { realToast.call(app, t, o) } catch { /* bỏ qua */ } }
    }
    const focusToast = function (text, opts) {
      if (holdingToasts() && !(opts && opts.now) && !destroyed) { heldToasts.push([text, opts]); return null }
      return sendToast(text, opts)
    }
    function flushToasts() {
      // giữ tối đa 3 thông báo thường + 2 thẻ Mẹo nghề mới nhất (cùng giới hạn hàng chờ của toast.js)
      const list = heldToasts.splice(0)
      const tips = list.filter(([, o]) => o && o.kind === 'tip').slice(-2)
      const plain = list.filter(([, o]) => !(o && o.kind === 'tip')).slice(-3)
      for (const [t, o] of [...tips, ...plain]) { try { sendToast(t, o) } catch { /* bỏ qua */ } }
    }
    if (typeof realToast === 'function') app.toast = focusToast
    // Thông báo nổi chỉ che hàng trên của cảnh và phần trống của hàng giữa — không che chữ của khách: chồng thông báo không
    // vượt xuống dưới mốc toastEdge(); thông báo không vừa thì chờ thông báo trước tắt (toast.js; một thông báo thường đứng
    // một mình vẫn hiện, thông báo thường đang nổi rút ngắn khi có tin chờ). Mốc (vừa màn L0, vòng sửa):
    //   tab Quầy: đỉnh phần tử để đọc cao nhất đang thấy ở hàng giữa (bong bóng / lời qua lại / phiếu order hình / tiền khách
    //     đưa, SCENE_READ_SEL) − TOAST_GAP; không có gì để đọc thì đỉnh biển 4 khâu (l / m, giữa dải xe đẩy) hoặc đỉnh dải xe
    //     đẩy (s / xs, biển đã lên hàng trên); không bao giờ cao hơn đáy hàng trên + 6 (hàng trên luôn dành cho thông báo).
    //   tab Bếp: đỉnh .panels (thanh 4 khâu cao 0 nằm ngay đó, dưới dây phiếu) — chế độ tập trung cũng vậy.
    // Thẻ Mẹo nghề (cao ~59px) gắn opts.fit: CHỈ hiện khi vừa mốc (kể cả lúc đứng một mình) — không đè dòng đầu bong bóng
    // khách ở lúc khách phản hồi (bắt lỗi, báo sai tổng); chờ tới khi vừa: khâu sau / khách sau / quầy trống / tab Bếp. Rời
    // màn thì thẻ còn chờ bị bỏ (vẫn nằm trong Sổ tay nghề). Mốc đổi theo nội dung (vd quầy trống → khách bước lên, bong bóng
    // hiện dưới chồng): mỗi ~0,4 giây khi chồng có thông báo / có thẻ chờ, màn gọi lại setLimit (update) — thẻ chờ hiện khi
    // vừa, chồng đang nổi nhường chỗ (toast.js yieldRoom).
    // Tab Quầy không xuống quá đỉnh .panels của tab Bếp (đáy HUD + dải mặt khách + dây phiếu): đổi tab giữa lúc chồng đang nổi
    // không làm chồng đè lên dây phiếu / thanh 4 khâu cao 0 của tab Bếp.
    // Không bao giờ trả số ≤ 0 (toast.js coi là "không giới hạn").
    // Vòng sửa Q-D: trong màn Ca bán chồng thông báo nằm thấp hơn một chút (css/game.css .overlay-root.is-service), dưới thẻ
    // "+tiền thu trong ca" treo dưới ví HUD — thẻ đếm lên đúng lúc thông báo hiện (thối đúng, kẹp phiếu), không bị che.
    // Giới hạn chiều cao bên dưới đo theo vị trí thật của chồng nên tự co theo.
    if (app.overlay && app.overlay.classList) app.overlay.classList.add('is-service')
    function toastEdge() {
      if (active !== 'counter') return panels.getBoundingClientRect().top
      const fit = SCENE_ROW[frame.fit] ? frame.fit : 'l'
      const top = street.getBoundingClientRect().top
      const rowEdge = top + SCENE_ROW[fit] + 6
      let edge = fit === 's' || fit === 'xs'
        ? top + (frame.S || sceneHeight(fit, frame.A)) - SCENE_CART[fit]
        : progress.el.getBoundingClientRect().top
      edge = Math.min(edge, top + KITCHEN_STRIP_H + KITCHEN_RAIL_H)
      for (const n of panelCounter.querySelectorAll(SCENE_READ_SEL)) {
        const r = n.getBoundingClientRect()
        if (r.width < 2 || r.height < 2 || r.top - TOAST_GAP >= edge || r.bottom <= rowEdge) continue
        const cs = getComputedStyle(n)
        if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) continue
        edge = r.top - TOAST_GAP
      }
      return Math.max(rowEdge, edge)
    }
    const toastLimitFn = () => {
      const stack = app.overlay && app.overlay.querySelector('.toast-stack')
      if (!stack || !el.isConnected || destroyed) return 0
      // đang nấu tập trung / bảng ra món đang mở: thông báo mới đã được giữ lại (heldToasts); mục còn trong hàng chờ của
      // toast.js chỉ hiện từng cái một (thông báo thường đứng một mình), thẻ Mẹo nghề chờ chỗ đợi tới khi thoát
      if (holdingToasts()) return 1
      return Math.max(1, toastEdge() - stack.getBoundingClientRect().top)
    }
    // xét lại hàng chờ của toast.js (thẻ Mẹo nghề chờ chỗ) — gọi lại setLimit với cùng hàm
    const recheckToasts = () => { if (!destroyed && typeof app.toastLimit === 'function') app.toastLimit(toastLimitFn) }
    recheckToasts()

    const counter = mountCounter(panelCounter, app, { switchTab: t => showTab(t) })
    let kitchen = null
    const kitchenPlaceholder = h('div', { class: 'kitchen-wait muted', testid: 'kitchen-loading' }, 'Đang dọn bếp…')
    panelKitchen.appendChild(kitchenPlaceholder)
    import('./kitchen.js').then(mod => {
      if (destroyed) return
      const fn = mod.mountKitchen || (mod.default && mod.default.mount)
      if (typeof fn !== 'function') throw new Error('kitchen.js thiếu mountKitchen')
      kitchenPlaceholder.remove()
      kitchen = fn(panelKitchen, app, {
        // bếp báo đang nấu (want) và loại màn nấu (kind: 'chon' | 'thot' | 'stage' → data-cook; bếp cũ không gửi kind → rỗng)
        onFocus: (want, kind) => { kitchenWantsFocus = !!want; setCook(want ? kind : ''); applyFocus() },
        onReveal: on => { revealOpen = !!on; if (!revealOpen) releaseToasts() }
      }) || null
      if (kitchen && active === 'kitchen' && kitchen.onShow) kitchen.onShow()
    }).catch(err => {
      console.warn('Không nạp được bếp:', err && err.message)
      kitchenPlaceholder.textContent = 'Bếp chưa sẵn sàng.'
    })

    function showTab(name) {
      if (name !== 'counter' && name !== 'kitchen') return
      dots[name] = false
      if (name === active) { paintTabs(); return }
      const prev = active
      active = name
      el.dataset.tab = name
      panelCounter.hidden = name !== 'counter'
      panelKitchen.hidden = name !== 'kitchen'
      // bố cục cảnh đổi ngay theo tab (css/game.css): vẽ lại hàng khách cùng lúc (thẻ tròn ↔ bán thân), không đợi khung hình sau
      if (app.state && app.state.shift) renderStreet()
      if (prev === 'counter') counter.onHide && counter.onHide()
      if (prev === 'kitchen' && kitchen && kitchen.onHide) kitchen.onHide()
      // chế độ tập trung: tắt ngay khi rời Bếp; sang Bếp thì bếp tự báo (onFocus) lúc dựng lại, trước khi dựng mini-game
      applyFocus()
      if (name === 'counter') counter.onShow && counter.onShow()
      if (name === 'kitchen' && kitchen && kitchen.onShow) kitchen.onShow()
      app.sound('click')
      paintTabs()
      // chỗ cho chồng thông báo đổi theo tab: thẻ Mẹo nghề đang chờ chỗ có thể hiện ngay
      if (tipWaitUntil) recheckToasts()
      app.bus.emit('ui.tab', { tab: name })
    }
    app.switchTab = showTab

    // Thanh tab: biểu tượng xe đẩy / chảo + chữ + huy hiệu số (khách đang xếp hàng / phiếu trên dây); chấm đỏ (dot-*) báo
    // bên kia có việc mới. Phần tử con dựng một lần, mỗi lần đổi chỉ ghi số và bật / tắt chấm (không dựng lại, không hoạt
    // ảnh lặp); huy hiệu số nảy MỘT lần khi số tăng (theo sự kiện đổi số, không trong lúc vẽ lại).
    function tabParts(btn, key) {
      const count = h('span', { class: 'tab-count' })
      btn.append(svgBox(SCENE_ICONS[TAB_ICONS[key]] || '', 'tab-ico'), h('span', { class: 'tab-label' }, S.tabs[key]), count)
      return { btn, count, n: -1, dot: null }
    }
    const tabUi = { counter: tabParts(tabCounter, 'counter'), kitchen: tabParts(tabKitchen, 'kitchen') }
    function paintTab(name, n, dot) {
      const t = tabUi[name]
      if (t.n !== n) {
        const up = t.n >= 0 && n > t.n
        t.n = n
        t.count.textContent = String(n)
        t.count.classList.toggle('is-zero', n === 0)
        if (up && !isReduced(app) && typeof t.count.animate === 'function') {
          try { t.count.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 320, easing: EASE.outBack }) } catch { /* bỏ qua */ }
        }
      }
      if (dot && !t.dot) {
        t.dot = h('span', { class: 'dot', testid: 'dot-' + name })
        t.btn.appendChild(t.dot)
      } else if (!dot && t.dot) {
        t.dot.remove()
        t.dot = null
      }
      t.btn.setAttribute('aria-label', `${S.tabs[name]}: ${n}${dot ? ', có việc mới' : ''}`)
    }
    let tabSig = ''
    function paintTabs() {
      const sh = app.state.shift
      const q = sh ? sh.queue.length : 0
      const t = sh ? sh.tickets.length : 0
      const key = [active, q, t, dots.counter, dots.kitchen].join('|')
      if (key === tabSig) return
      tabSig = key
      paintTab('counter', q, dots.counter)
      paintTab('kitchen', t, dots.kitchen)
      tabCounter.classList.toggle('active', active === 'counter')
      tabKitchen.classList.toggle('active', active === 'kitchen')
      tabCounter.setAttribute('aria-selected', String(active === 'counter'))
      tabKitchen.setAttribute('aria-selected', String(active === 'kitchen'))
      tabCounter.dataset.dot = dots.counter ? 'true' : 'false'
      tabKitchen.dataset.dot = dots.kitchen ? 'true' : 'false'
    }

    // ---------- Hàng khách (dải phố) ----------
    // Nút giữ theo id khách: vẽ lại khi tâm trạng / vị trí / nhãn đổi chỉ sửa tại chỗ, không dựng lại nên không phát lại hoạt
    // ảnh. Hoạt ảnh MỘT lần theo id (enteredIds / leftIds): vào hàng (trượt từ phải, nảy), lên chỗ (FLIP), sang chỗ chờ món
    // (bản sao bay), rời đi (bản sao trong lớp .st-fx: vui thì nhảy, giận thì rung + mây giận, lặng lẽ thì mờ). Hoạt ảnh chỉ
    // kích khi danh sách khách đổi (sự kiện của ca), không kích khi vẽ lại; giảm chuyển động: chỉ mờ dần, mây đứng yên.
    // Vòng sửa Q-D: khách ĐANG Ở QUẦY lúc tab Quầy mở thì panel Quầy đã vẽ bán thân lớn của khách đó — ở dải phố khách thu
    // thành THẺ TRÒN nhỏ (.is-away: mặt tròn + vòng kiên nhẫn + mũi tên ↓ chỉ xuống panel, nhãn "Ở quầy"), hàng chờ dồn sang
    // trái; sang tab Bếp (panel Quầy ẩn) thì bán thân hiện lại ở dải phố. Đổi qua lại theo SỰ KIỆN đổi tab / đổi khách ở quầy
    // (thẻ nảy ra, bán thân lớn dần từ chỗ thẻ), vẽ lại không phát lại.
    // Vừa màn (L0): tab Quầy, hàng khách nằm ở HÀNG TRÊN của cảnh (cao 44): MỌI khách xếp hàng thu thành thẻ tròn (mặt trong
    // vòng kiên nhẫn; khách ở quầy 42 + mũi tên ↓ chỉ xuống bán thân lớn của panel, khách sau 40 / 34), tối đa 2 khách sau
    // khách ở quầy (1 ở bề ngang < 360, 0 ở bậc s / xs); dư thì gộp viên "+n" (queue-more, nền đỏ nhạt khi trong số khách bị
    // gộp có khách sắp hết kiên nhẫn). Khách bị gộp vẫn giữ nút (ẩn bằng lớp .is-over) nên không phát hoạt ảnh rời đi. Đang
    // phục vụ (có khách ở quầy) thì khách chờ món không hiện ở cảnh Quầy (.street.is-serving): dải màu chờ trên kẹp phiếu và
    // dải mặt khách tab Bếp đã báo. Tab Bếp: dải mặt khách 58 (bán thân nhỏ), đủ 3 khách xếp hàng như cũ.
    let queueSig = ''
    const custNodes = new Map()   // 'q:' | 'w:' + id khách → nút đang hiện
    const enteredIds = new Set()
    const leftIds = new Set()
    let streetFirst = true
    const queueEmpty = h('div', { class: 'queue-empty' }, 'Chưa có khách xếp hàng')
    const queueMore = h('span', { class: 'queue-more', testid: 'queue-more' })
    const waitTitle = h('div', { class: 'wait-title' }, 'Chờ món')
    const waitRow = h('div', { class: 'wait-row' })
    const waitMore = h('span', { class: 'wait-more' })
    waitBox.append(waitRow, waitTitle)
    const fxTimers = new Set()
    const later = (fn, ms) => { const id = setTimeout(() => { fxTimers.delete(id); if (!destroyed) fn() }, ms); fxTimers.add(id) }

    const whoOf = c => c.regularId || c.stranger || null
    const waitLeft = (sh, c) => {
      const used = c.waitBudget ? (sh.t - (c.waitStart || 0)) / c.waitBudget : 0
      return 1 - Math.min(1, Math.max(0, used))
    }
    const valueOf = (sh, c, kind) => (c.tutorial ? 1 : kind === 'q' ? c.patience : waitLeft(sh, c))
    function tagOf(c, counterId) {
      if (c.id === counterId) return { kind: 'here', text: 'Ở quầy' }
      if (c.bigOrder) return { kind: 'order', text: 'Đặt trước' }
      if (c.stranger) return { kind: 'stranger', text: (S.rare && S.rare.strangerTag) || 'Khách lạ' }
      return { kind: 'name', text: c.name }
    }

    function makeCust(c, kind) {
      const ring = createRing(64, 6)
      const img = h('span', { class: 'st-bust', 'aria-hidden': 'true' })
      const fig = h('div', { class: 'st-fig' }, h('span', { class: 'st-ring' }, ring.el), img, createSteam(),
        // M4: khách lạ (quà quê là nguyên liệu hiếm) có dấu ★ riêng ở hàng chờ
        kind === 'q' && c.stranger ? h('span', { class: 'q-stranger', testid: 'stranger-badge', title: 'Khách lạ', 'aria-label': 'Khách lạ' }, '★') : null)
      // thẻ tròn khi khách đang ở quầy và tab Quầy mở (ẩn bằng CSS cho tới khi có lớp .is-away)
      let here = null, hereRing = null, hereImg = null
      if (kind === 'q') {
        hereRing = createRing(48, 5)
        hereImg = h('span', { class: 'q-here-face' })
        here = h('span', { class: 'q-here', 'aria-hidden': 'true' }, hereRing.el, hereImg,
          h('span', { class: 'q-here-arrow', html: HERE_ARROW }), createSteam())
      }
      const tag = kind === 'q' ? h('div', { class: 'q-tag' }) : null
      const el = h('div', { class: kind === 'q' ? 'q-cust' : 'w-cust', testid: (kind === 'q' ? 'queue-' : 'waiting-') + c.id }, fig, here, tag)
      return { id: c.id, kind, el, fig, img, ring, here, hereRing, hereImg, tag, mood: '', headMood: '', tagKey: '', low: null, pos: -1, away: null, swap: false, over: false }
    }

    const looksOf = c => {
      const o = { gender: c.gender || undefined }
      const who = whoOf(c)
      if (who) o.who = who
      return o
    }
    function paintCust(rec, sh, c, idx, counterId, awayOn) {
      const v = valueOf(sh, c, rec.kind)
      const mood = c.tutorial ? 'vui' : moodFor(v)
      if (mood !== rec.mood) {
        rec.mood = mood
        rec.img.innerHTML = bust(c.persona, mood, looksOf(c))
      }
      // tab Quầy: mọi khách xếp hàng là thẻ tròn ở hàng trên của cảnh (khách ở quầy có thêm mũi tên ↓, css/street.css)
      const away = rec.kind === 'q' && !!awayOn
      if (away !== rec.away) {
        // đổi bán thân ↔ thẻ tròn (không tính lần vẽ đầu của nút): hoạt ảnh một lần ở layoutStreet
        if (rec.away !== null) rec.swap = true
        rec.away = away
        rec.el.classList.toggle('is-away', away)
      }
      if (away && mood !== rec.headMood) {
        rec.headMood = mood
        rec.hereImg.innerHTML = head(c.persona, mood, looksOf(c))
      }
      const low = !c.tutorial && v < LOW_PATIENCE
      if (low !== rec.low) { rec.low = low; rec.el.classList.toggle('is-low', low) }
      if (rec.kind === 'q') {
        if (idx !== rec.pos) {
          rec.pos = idx
          rec.el.dataset.pos = String(idx)
          rec.el.style.setProperty('--qs', String(QUEUE_SCALES[Math.min(idx, QUEUE_SCALES.length - 1)]))
        }
        const t = tagOf(c, counterId)
        const k = t.kind + '|' + t.text
        if (k !== rec.tagKey) {
          rec.tagKey = k
          rec.tag.className = 'q-tag is-' + t.kind
          rec.tag.textContent = t.text
          if (t.kind === 'order') rec.tag.dataset.testid = 'queue-order-tag'
          else delete rec.tag.dataset.testid
          rec.el.classList.toggle('at-counter', t.kind === 'here')
          rec.el.classList.toggle('is-order', !!c.bigOrder)
          rec.el.classList.toggle('is-stranger', !!c.stranger)
        }
      }
      const title = rec.kind === 'q' ? c.name : c.name + ' · chờ món'
      if (rec.el.title !== title) rec.el.title = title
    }

    // hình đang hiện của khách: bán thân, hoặc thẻ tròn khi khách đang ở quầy (tab Quầy)
    const shownOf = rec => (rec.away && rec.here ? rec.here : rec.fig)
    // bản sao của hình khách trong lớp .st-fx (tọa độ của dải phố), bỏ testid để e2e không bắt nhầm
    function ghostOf(rec, r0, sr) {
      const g = shownOf(rec).cloneNode(true)
      g.classList.remove('is-enter', 'is-enter-soft')   // bản sao không chạy lại hoạt ảnh vào hàng
      g.classList.add('st-ghost')
      g.classList.toggle('is-low', rec.el.classList.contains('is-low'))
      for (const n of g.querySelectorAll('[data-testid]')) n.removeAttribute('data-testid')
      g.style.left = (r0.left - sr.left).toFixed(1) + 'px'
      g.style.top = (r0.top - sr.top).toFixed(1) + 'px'
      g.style.width = r0.width.toFixed(1) + 'px'
      g.style.height = r0.height.toFixed(1) + 'px'
      streetFx.appendChild(g)
      return g
    }
    function playGhost(g, frames, opts, after) {
      let done = false
      const end = () => { if (done) return; done = true; g.remove(); if (after) after() }
      try {
        const a = g.animate(frames, { fill: 'forwards', ...opts })
        a.onfinish = end
        a.oncancel = end
      } catch { end(); return }
      later(end, (opts.duration || 600) + 400)
    }
    const EXIT = {
      angry: { duration: 900, easing: 'linear', frames: [
        { transform: 'translate(0, 0)' }, { transform: 'translate(-3px, 0)', offset: 0.08 }, { transform: 'translate(3px, 0)', offset: 0.16 },
        { transform: 'translate(-3px, 0)', offset: 0.24 }, { transform: 'translate(2px, 0)', offset: 0.32 },
        { transform: 'translate(0, 0)', opacity: 1, offset: 0.42, easing: 'ease-in' }, { transform: 'translate(70px, 3px)', opacity: 0 }] },
      happy: { duration: 850, easing: 'linear', frames: [
        { transform: 'translate(0, 0)', easing: 'ease-out' }, { transform: 'translate(0, -9px)', offset: 0.18, easing: 'ease-in' },
        { transform: 'translate(0, 0)', offset: 0.34, easing: 'ease-out' }, { transform: 'translate(0, -5px)', offset: 0.48, easing: 'ease-in' },
        { transform: 'translate(0, 0)', opacity: 1, offset: 0.6, easing: 'ease-in' }, { transform: 'translate(64px, 0)', opacity: 0 }] },
      quiet: { duration: 600, easing: 'ease-in', frames: [{ transform: 'translate(0, 0)', opacity: 1 }, { transform: 'translate(36px, 0)', opacity: 0 }] }
    }
    function playExit(rec, c, r0, sr, reduced) {
      const kind = exitKindOf(c)
      const g = ghostOf(rec, r0, sr)
      if (kind === 'angry') {
        const cloud = h('span', { class: 'st-cloud', html: ANGRY_CLOUD })
        g.appendChild(cloud)
        if (!reduced) {
          try { cloud.animate([{ opacity: 0, transform: 'translate(0, 6px) scale(.6)' }, { opacity: 1, transform: 'translate(0, 0) scale(1)', offset: 0.25 }, { opacity: 1, transform: 'translate(0, -4px) scale(1)' }], { duration: 900, fill: 'forwards', easing: EASE.outBack }) } catch { /* bỏ qua */ }
        }
      }
      if (reduced) { playGhost(g, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'linear' }); return }
      const ex = EXIT[kind] || EXIT.quiet
      playGhost(g, ex.frames, { duration: ex.duration, easing: ex.easing })
      if (kind === 'happy' && app.vfx && typeof app.vfx.burst === 'function') {
        const head = { left: r0.left + r0.width * 0.2, top: r0.top + r0.height * 0.1, width: r0.width * 0.6, height: r0.height * 0.4 }
        later(() => { try { app.vfx.burst(head, 'sparkle', { n: 5 }) } catch { /* bỏ qua */ } }, 120)
      }
    }
    // khách ở quầy kẹp phiếu xong → sang chỗ chờ món: bản sao bay vòng cung, thu nhỏ về chỗ mới; nút mới hiện khi bản sao tới
    function playTransfer(rec, r0, r1, sr, target) {
      const g = ghostOf(rec, r0, sr)
      g.style.transformOrigin = '0 0'
      const dx = r1.left - r0.left, dy = r1.top - r0.top, s = r1.height / Math.max(1, r0.height)
      target.classList.add('is-arriving')
      playGhost(g, [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${(dx / 2).toFixed(1)}px, ${(dy / 2 - 16).toFixed(1)}px) scale(${((1 + s) / 2).toFixed(3)})`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(3)})`, opacity: 1, offset: 0.9 },
        { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(3)})`, opacity: 0 }
      ], { duration: 520, easing: 'ease-in-out' }, () => target.classList.remove('is-arriving'))
    }
    function flip(fig, r0, r1) {
      const dx = (r0.left + r0.width / 2) - (r1.left + r1.width / 2)
      const dy = r0.bottom - r1.bottom
      const s = r0.height / Math.max(1, r1.height)
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(s - 1) < 0.01) return
      try {
        fig.animate([{ transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(3)})` }, { transform: 'translate(0, 0) scale(1)' }],
          { duration: 340, easing: EASE.outCubic })
      } catch { /* bỏ qua */ }
    }
    function playEnter(rec) {
      const node = shownOf(rec)
      node.classList.add('is-enter')
      const off = () => node.classList.remove('is-enter')
      node.addEventListener('animationend', off, { once: true })
      later(off, 900)
    }
    // thẻ tròn / bán thân đổi chỗ (khách trước rời quầy, hàng dồn lên): trượt từ chỗ cũ; nút đang ẩn (gộp "+n") thì thôi
    function flipShown(rec, r0) {
      if (!r0 || !r0.width) return
      const node = shownOf(rec)
      const r1 = node.getBoundingClientRect()
      if (r1.width) flip(node, r0, r1)
    }
    // bán thân ↔ thẻ tròn (đổi tab, khách mới lên quầy): thẻ nảy ra; bán thân lớn dần từ chỗ thẻ cũ
    function playSwap(rec, r0) {
      try {
        if (rec.away) {
          rec.here.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: EASE.outBack })
        } else if (r0 && r0.width) flip(rec.fig, r0, rec.fig.getBoundingClientRect())
      } catch { /* bỏ qua */ }
    }

    function layoutStreet(sh, inQueue, waiting, counterId, awayOn, more) {
      const shown = street.isConnected && street.offsetParent !== null && !(typeof document !== 'undefined' && document.visibilityState === 'hidden')
      const animate = shown && !streetFirst
      const reduced = isReduced(app)
      const sr = animate ? street.getBoundingClientRect() : null
      const before = new Map()
      if (animate) for (const [k, rec] of custNodes) before.set(k, shownOf(rec).getBoundingClientRect())
      const wantQ = new Map(inQueue.map((c, i) => ['q:' + c.id, i]))
      const waitShown = waiting.slice(0, WAIT_SHOW_MAX)
      const wantW = new Map(waitShown.map((c, i) => ['w:' + c.id, i]))
      // 1. nút không còn: rời đi (một lần theo id) hoặc sang chỗ chờ món
      const transfers = []
      for (const [k, rec] of [...custNodes]) {
        if (wantQ.has(k) || wantW.has(k)) continue
        custNodes.delete(k)
        const c = sh.customers[rec.id]
        const r0 = before.get(k)
        rec.el.remove()
        if (!animate || !r0 || !r0.width) continue
        if (rec.kind === 'q' && wantW.has('w:' + rec.id)) { transfers.push([rec, r0]); continue }
        if (rec.kind === 'q' && c && (c.status === 'cho_mon' || c.status === 'nhan_mon')) continue   // sang chờ món nhưng không hiện (quá chỗ)
        if (leftIds.has(rec.id)) continue
        leftIds.add(rec.id)
        playExit(rec, c, r0, sr, reduced)
      }
      // 2. nút mới / cập nhật tại chỗ, đúng thứ tự (chỉ dời nút sai chỗ: dời nút giữa chừng làm chạy lại hoạt ảnh CSS)
      const fresh = []
      const place = (box, recs, anchor) => {
        recs.forEach((rec, i) => {
          const at = box.children[i] || null
          if (at !== rec.el) box.insertBefore(rec.el, at)
        })
        if (anchor && box.lastChild !== anchor) box.appendChild(anchor)
      }
      const qRecs = inQueue.map((c, i) => {
        const k = 'q:' + c.id
        let rec = custNodes.get(k)
        if (!rec) { rec = makeCust(c, 'q'); custNodes.set(k, rec); fresh.push(rec) }
        paintCust(rec, sh, c, i, counterId, awayOn)
        return rec
      })
      const wRecs = waitShown.map((c, i) => {
        const k = 'w:' + c.id
        let rec = custNodes.get(k)
        if (!rec) { rec = makeCust(c, 'w'); custNodes.set(k, rec); fresh.push(rec) }
        paintCust(rec, sh, c, i, counterId, false)
        return rec
      })
      // khách quá chỗ của hàng trên (tab Quầy) → ẩn (giữ nút), gộp vào viên "+n"
      qRecs.forEach((rec, i) => {
        const over = i >= more.max
        if (rec.over !== over) { rec.over = over; rec.el.classList.toggle('is-over', over) }
      })
      if (more.n > 0) {
        const t = '+' + more.n
        if (queueMore.textContent !== t) {
          queueMore.textContent = t
          queueMore.setAttribute('aria-label', `Còn ${more.n} khách đang xếp hàng`)
          queueMore.title = `Còn ${more.n} khách đang xếp hàng`
        }
        queueMore.classList.toggle('is-low', more.low)
      } else if (queueMore.parentNode) queueMore.remove()
      if (queueEmpty.parentNode && inQueue.length) queueEmpty.remove()
      place(queueBox, qRecs, more.n > 0 ? queueMore : null)
      if (!inQueue.length && !queueEmpty.parentNode) queueBox.appendChild(queueEmpty)
      street.classList.toggle('is-serving', !!counterId)
      // bề ngang hàng khách ở hàng trên (tab Quầy): kẹp phiếu chừa đúng chỗ này (css/game.css --queue-w); đo khi hàng đổi
      if (awayOn && queueBox.isConnected) setVar('--queue-w', queueBox.offsetWidth)
      place(waitRow, wRecs, null)
      const wMore = waiting.length - waitShown.length
      if (wMore > 0) { waitMore.textContent = '+' + wMore; waitRow.appendChild(waitMore) } else if (waitMore.parentNode) waitMore.remove()
      waitBox.classList.toggle('is-on', waiting.length > 0)
      // 3. hoạt ảnh sau bố cục mới: vào hàng, sang chỗ chờ, lên chỗ
      for (const rec of fresh) {
        const first = !enteredIds.has(rec.kind + rec.id)
        enteredIds.add(rec.kind + rec.id)
        if (!animate || !first) continue
        const tr = rec.kind === 'w' ? transfers.find(([q]) => q.id === rec.id) : null
        if (tr) {
          if (reduced) continue
          const r1 = rec.fig.getBoundingClientRect()
          if (r1.width) playTransfer(tr[0], tr[1], r1, sr, rec.el)
        } else if (reduced) {
          const node = shownOf(rec)
          node.classList.add('is-enter-soft')
          later(() => node.classList.remove('is-enter-soft'), 400)
        } else playEnter(rec)
      }
      if (animate && !reduced) {
        for (const rec of [...qRecs, ...wRecs]) {
          if (fresh.includes(rec)) continue
          const r0 = before.get(rec.kind + ':' + rec.id)
          if (rec.swap) playSwap(rec, r0)
          else flipShown(rec, r0)
        }
      }
      for (const rec of qRecs) rec.swap = false
      streetFirst = false
    }

    function renderStreet() {
      const sh = app.state.shift
      const counterId = sh.counter ? sh.counter.customerId : null
      const inQueue = sh.queue.slice(0, QUEUE_SCALES.length).map(id => sh.customers[id]).filter(Boolean)
      const waiting = Object.values(sh.customers).filter(c => c.status === 'cho_mon' || c.status === 'nhan_mon')
      const sigOf = (c, kind) => {
        const v = valueOf(sh, c, kind)
        return [c.id, c.tutorial ? 'vui' : moodFor(v), !c.tutorial && v < LOW_PATIENCE]
      }
      // tab Quầy đang mở: khách xếp hàng thu thành thẻ tròn ở hàng trên của cảnh (panel đã có bán thân lớn của khách ở quầy);
      // quá chỗ thì gộp "+n" (đổi số chỉ ghi chữ, không hoạt ảnh)
      const awayOn = active === 'counter'
      const max = awayOn ? 1 + queueShowMax(frame.fit, frame.W) : QUEUE_SCALES.length
      const rest = sh.queue.slice(Math.min(max, inQueue.length))
      const more = {
        max, n: rest.length,
        low: rest.some(id => { const c = sh.customers[id]; return !!c && !c.tutorial && c.patience < LOW_PATIENCE })
      }
      const key = JSON.stringify([awayOn, max, more.n, more.low, counterId || '',
        inQueue.map(c => [...sigOf(c, 'q'), c.id === counterId, !!c.bigOrder, c.stranger || '']),
        waiting.map(c => sigOf(c, 'w'))])
      if (key !== queueSig) {
        queueSig = key
        layoutStreet(sh, inQueue, waiting, counterId, awayOn, more)
      }
      for (const rec of custNodes.values()) {
        const c = sh.customers[rec.id]
        if (!c) continue
        const v = valueOf(sh, c, rec.kind)
        if (rec.away) rec.hereRing.set(v)
        else rec.ring.set(v)
      }
    }

    // Khách ở quầy (hoặc khách vừa kẹp phiếu) cho thanh 4 chấm.
    let lastCounterId = null
    let warnedLow = ''
    function paintProgress() {
      const sh = app.state.shift
      let cust = sh.counter ? sh.customers[sh.counter.customerId] : null
      if (cust) lastCounterId = cust.id
      else if (lastCounterId) {
        const c = sh.customers[lastCounterId]
        if (c && (c.status === 'cho_mon' || c.status === 'nhan_mon')) cust = c
      }
      progress.set(cust ? stageOf(cust) : null, cust ? cust.name : '')
      // khách đầu hàng còn dưới 30% kiên nhẫn: rung nhẹ 1 lần
      const head = sh.queue.length ? sh.customers[sh.queue[0]] : null
      if (head && !head.tutorial && head.patience < 0.3 && warnedLow !== head.id) {
        warnedLow = head.id
        app.vibrate(30)
        app.sound('nudge')
      }
    }

    // ---------- Phiếu chấm ----------
    const sheetQueue = []
    let sheetShowing = false
    function showNextSheet() {
      if (sheetShowing || !sheetQueue.length || destroyed) return
      sheetShowing = true
      const sheet = sheetQueue.shift()
      const node = renderScoreSheet(app, sheet)
      sheetHost.appendChild(node)
      requestAnimationFrame(() => node.classList.add('show'))
      app.sound(sheet.stars >= 4 ? 'ding' : 'click')
      const hide = () => {
        if (destroyed) return
        // hướng dẫn phiếu chấm (hoặc bảng Hướng dẫn) đang mở: giữ phiếu tới khi đóng
        if (app.tour && app.tour.isHeld()) { setTimeout(hide, 300); return }
        node.classList.remove('show')
        node.classList.add('hide')
        setTimeout(() => { node.remove(); sheetShowing = false; showNextSheet() }, 250)
      }
      setTimeout(hide, SHEET_MS)
    }
    offs.push(app.bus.on('customer.rated', ({ customerId } = {}) => {
      const sh = app.state.shift
      if (!sh) return
      const list = sh.scoreSheets.filter(s => s.customerId === customerId)
      const sheet = list[list.length - 1]
      if (!sheet) return
      sheetQueue.push(sheet)
      showNextSheet()
    }))

    // ---------- Chấm đỏ trên tab ----------
    offs.push(app.bus.on('customer.arrived', () => {
      if (active !== 'counter') dots.counter = true
      app.sound('bell')
    }))
    offs.push(app.bus.on('ticket.clipped', () => { if (active !== 'kitchen') dots.kitchen = true }))
    offs.push(app.bus.on('customer.lost', ({ customerId, reason } = {}) => {
      const sh = app.state.shift
      const c = sh && sh.customers[customerId]
      if (!c) return
      if (reason === 'hang_day' || reason === 'het_kien_nhan') app.sound('nudge')
      if (reason === 'hang_day') app.toast(`${c.name} thấy hàng dài quá nên đi ngang.`, { kind: 'bad' })
      else if (reason === 'het_kien_nhan') app.toast(`${c.name} chờ lâu quá nên bỏ về.`, { kind: 'bad' })
    }))
    // Tiền QR về: âm "ting" do panel Quầy (counter-qr.js) phát theo bảng 6.4 — màn không phát thêm âm nào (tránh hai âm chồng).

    // ---------- M2: thông báo tiến độ (không chặn thao tác) ----------
    const M = S.meta
    const lastQuestToast = {}
    // khách hướng dẫn ngày 1 còn trong ca: người mới chưa mở "Việc hôm nay", không báo tiến độ việc lúc này
    const inTutorial = () => {
      const sh = app.state.shift
      return !!(sh && sh.day === 1 && Object.values(sh.customers || {}).some(c => c.tutorial && c.status !== 'roi_di' && c.status !== 'bo_ve'))
    }
    // tiến độ nhiều việc cùng lúc (vd một món vừa Tuyệt hảo vừa không lỗi nguyên liệu) gộp thành 1 thông báo
    let questBatch = []
    let questBatchTimer = 0
    const flushQuestBatch = () => {
      questBatchTimer = 0
      const list = questBatch
      questBatch = []
      if (destroyed || !list.length) return
      if (list.length === 1) {
        app.toast(M.questProgress.replace('{cur}/{target}', list[0].num).replace('{text}', list[0].text), { kind: 'info', testid: 'quest-toast', duration: 1800 })
        return
      }
      app.toast(list.map(x => `${x.num} ${x.text}`).join(' · '), { kind: 'info', title: M.quests, testid: 'quest-toast', duration: 2400 })
    }
    offs.push(() => clearTimeout(questBatchTimer))
    offs.push(app.bus.on('quest.progress', (c = {}) => {
      const def = questDef(app.ctx, c.id)
      if (!def) return
      const text = questText(def, c.target)
      if (c.justDone) {
        app.toast(`Xong: ${text}. Nhận thưởng ở màn Chuẩn bị.`, { kind: 'good', title: M.quests, testid: 'quest-toast' })
        lastQuestToast[c.id] = performance.now()
        return
      }
      if (!c.progress) {
        if (def.breakOn && !inTutorial()) app.toast(`${M.quests}: chuỗi "${text}" bị đứt, đếm lại từ đầu.`, { kind: 'bad', testid: 'quest-toast' })
        return
      }
      if (inTutorial()) return
      const t = performance.now()
      if (lastQuestToast[c.id] && t - lastQuestToast[c.id] < 4000) return
      lastQuestToast[c.id] = t
      const num = def.money ? `${formatVND(c.progress)}/${formatVND(c.target)}` : `${c.progress}/${c.target}`
      questBatch = questBatch.filter(x => x.id !== c.id).concat([{ id: c.id, num, text }])
      if (!questBatchTimer) questBatchTimer = setTimeout(flushQuestBatch, 400)
    }))
    // "Dì Sáu dặn", "Cô Hạnh nhờ": động từ theo NPC (NPCS[npc].verb)
    const chainWho = def => {
      const npc = app.data.NPCS && app.data.NPCS[def.npc]
      return npc ? `${npc.name} ${npc.verb || 'dặn'}` : def.name
    }
    offs.push(app.bus.on('chain.step', ({ chainId, stepIndex, done } = {}) => {
      const def = chainDefs(app.ctx)[chainId]
      if (!def) return
      // chuỗi sự kiện nhận thưởng ở màn sự kiện (màn Chuẩn bị chỉ ghim chuỗi thường)
      const where = def.eventId ? 'Nhận thưởng ở màn sự kiện.' : 'Nhận thưởng ở màn Chuẩn bị.'
      app.toast(done ? `Xong chuỗi "${def.name}"! ${where}` : `Xong bước ${stepIndex + 1}/${def.steps.length}. ${where}`,
        { kind: 'good', title: chainWho(def), icon: npcFace(def.npc), testid: 'chain-toast', duration: 2600 })
    }))
    // việc sự kiện hôm nay: báo tiến độ (mỗi việc tối đa 1 lần/4 giây), xong việc luôn báo
    const lastEvQuestToast = {}
    offs.push(app.bus.on('event.quest', ({ eventId, id, progress, target, justDone } = {}) => {
      const ev = app.data.EVENTS && app.data.EVENTS[eventId]
      const def = ev && (ev.quests || []).find(q => q.id === id)
      if (!def) return
      const text = String(def.text || '').replace('{n}', String(target))
      if (justDone) {
        app.toast(`Xong: ${text}. Nhận ${(def.reward && def.reward.tem) || 0} ${ev.currencyName} ở màn sự kiện.`,
          { kind: 'good', title: 'Việc sự kiện', icon: icon('phan_trang'), testid: 'event-quest-toast', duration: 2600 })
        lastEvQuestToast[id] = performance.now()
        return
      }
      const t = performance.now()
      if (lastEvQuestToast[id] && t - lastEvQuestToast[id] < 4000) return
      lastEvQuestToast[id] = t
      app.toast(`Việc sự kiện: ${progress}/${target} · ${text}`, { kind: 'info', icon: icon('phan_trang'), testid: 'event-quest-toast', duration: 1800 })
    }))
    // tiến độ bước chuỗi đang làm (vd "Dì Sáu dặn · 2/3 · Thối đúng 3 lần"); xong bước thì chain.step báo
    const lastChainToast = {}
    offs.push(app.bus.on('chain.progress', ({ chainId, stepIndex, progress, target } = {}) => {
      if (!progress || progress >= target) return
      const def = chainDefs(app.ctx)[chainId]
      const st = def && def.steps[stepIndex]
      if (!st) return
      const t = performance.now()
      if (lastChainToast[chainId] && t - lastChainToast[chainId] < 4000) return
      lastChainToast[chainId] = t
      const text = String(st.text || '').replace('{n}', String(st.target || 1))
      app.toast(`${progress}/${target} · ${text}`, { kind: 'info', title: chainWho(def), icon: npcFace(def.npc), testid: 'chain-toast', duration: 1800 })
    }))
    offs.push(app.bus.on('tem.gained',({ eventId, n, today, cap } = {}) => {
      const ev = app.data.EVENTS && app.data.EVENTS[eventId]
      if (!ev || !n) return
      const full = cap && today >= cap
      app.toast(`+${n} ${ev.currencyName}` + (full ? ` · ${M.eventDailyCap.replace('{n}', String(cap)).replace('{currency}', ev.currencyName)}` : ` (hôm nay ${today}/${cap})`),
        { kind: 'good', icon: icon('phan_trang'), testid: 'tem-toast', duration: 1600 })
    }))
    // Đầu ca: nhắc sự kiện ngày / Phiếu Chợ Sớm đang áp dụng; M3: khách quen trả nợ / quên trả nợ
    {
      const sh = app.state.shift
      const mods = sh && sh.mods
      if (sh && sh.t < 2) {
        for (const n of sh.debtNotes || []) {
          app.toast(n.text, { kind: n.kind === 'tra' ? 'good' : 'info', title: 'Sổ ghi nợ', testid: 'debt-toast', duration: 3200 })
          if (n.kind === 'tra') app.sound('coin')
        }
      }
      if (mods && sh.t < 2) {
        const de = mods.dayEvent && app.data.DAY_EVENTS && app.data.DAY_EVENTS[mods.dayEvent.id]
        if (de) {
          // M4: không chọn lựa chọn của sự kiện (vd không nhận đơn đặt trước) thì nhắc theo skipText
          const ch = mods.dayEvent.choice && de.choice ? ` Đã ${de.choice.label.toLocaleLowerCase('vi-VN')}.`
            : de.choice && de.choice.skipText ? ' ' + de.choice.skipText : ''
          app.toast(de.desc + ch, { title: de.name, kind: 'info', icon: icon(de.icon || de.id), testid: 'day-event-toast', duration: 3200 })
        }
        if (mods.cogsMul && mods.cogsMul < 1) app.toast(M.couponActive, { kind: 'good', icon: icon('phieu_cho_som'), duration: 2600 })
      }
    }
    // M4: sự kiện ngày trong ca — nhắc trước khi sắp bị phạt, báo phạt rõ nguyên nhân (tiền của tình huống trong ca đã
    // hiện trong hộp thoại tình huống, không báo lại)
    offs.push(app.bus.on('event.warn', ({ name, text } = {}) => {
      app.toast(text || '', { kind: 'info', title: name ? 'Dì Sáu nhắc · ' + name : 'Dì Sáu nhắc', icon: DI_SAU.lo, testid: 'event-warn-toast', duration: 3600 })
      app.sound('nudge')
    }))
    offs.push(app.bus.on('event.fined', ({ name, text, amount, spared, source } = {}) => {
      // phạt lúc kết ca (vd đoàn kiểm tra): Tổng kết đã ghi rõ, không báo nổi đè lên màn Tổng kết
      if (source === 'incident' || ended) return
      const money = amount > 0 ? `−${formatVND(amount)}. ` : ''
      app.toast(money + (text || ''), { kind: spared > 0 && !(amount > 0) ? 'info' : 'bad', title: name || 'Sự kiện', icon: DI_SAU.lo, testid: 'event-fine-toast', duration: 4200 })
      app.sound('error')
    }))
    offs.push(app.bus.on('ui.tab', ({ tab } = {}) => { if (tab && tab !== active) showTab(tab) }))

    // ---------- M3: Tình huống trong ca ----------
    // Hỏi lõi mỗi khung hình và NGAY khi kẹp phiếu (trước khi khách kế bước lên quầy): chỉ ở tab Quầy, quầy trống,
    // không có hộp thoại khác. Hộp thoại chặn nên thời gian ca và kiên nhẫn khách tạm dừng tới khi chọn xong.
    let incidentOpen = false
    function checkIncident() {
      if (incidentOpen || destroyed || ended || active !== 'counter' || app.locked || app.modalOpen() || (app.tour && app.tour.isHeld())) return
      if (!app.state.shift || !incidentDue(app.state, app.ctx)) return
      const view = openIncident(app.state, app.ctx)
      if (!view) return
      incidentOpen = true
      app.save()
      showIncident(view).finally(() => { incidentOpen = false })
    }
    offs.push(app.bus.on('ticket.clipped', () => checkIncident()))

    async function showIncident(view) {
      app.sound('nudge')
      app.vibrate(20)
      const tips = Array.isArray(app.data.TIPS) ? app.data.TIPS : []
      const done = await app.modal({
        testid: 'incident-modal', className: 'incident-modal',
        render: close => {
          // phần dựng hộp (câu hỏi, kết quả): components/incident-view.js
          const box = createIncidentBox(app, view, {
            onChoose: c => {
              const r = resolveIncident(app.state, c.id, app.ctx)
              if (!r.ok) { app.toast('Chưa chọn được cách này.', { kind: 'bad' }); return }
              app.sound(r.effects.money > 0 || r.effects.gain > 0 ? 'coin' : 'paper')
              app.saveNow()
              const tip = r.tipId ? tips.find(t => t.id === r.tipId) : null
              box.showResult(c, r, tip, () => close(r))
            }
          })
          return box.el
        }
      })
      if (done && !destroyed) app.save()
    }

    // ---------- Phàn nàn ----------
    let complaintOpen = false
    function checkComplaint() {
      if (complaintOpen || app.modalOpen() || (app.tour && app.tour.isHeld())) return
      const sh = app.state.shift
      const c = Object.values(sh.customers).find(x => x.status === 'nhan_mon' && x.complaint && !x.complaint.resolved)
      if (!c) return
      complaintOpen = true
      openComplaint(c).finally(() => { complaintOpen = false })
    }

    async function openComplaint(customer) {
      const R = app.data.RECIPES
      const aps = (app.data.DIALOGUE.apologies || []).map((a, i) => ({ i, text: typeof a === 'string' ? a : a.text }))
      // xáo thứ tự hiển thị để câu đúng không luôn nằm đầu
      for (let k = aps.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [aps[k], aps[j]] = [aps[j], aps[k]] }
      const items = customer.complaint.items || []
      const refund = items.reduce((s, it) => s + (it.refund || 0), 0)
      // M4: dòng món hiếm mà kho hết nguyên liệu hiếm → chỉ hoàn tiền được
      const remakeOk = complaintRemakeOk(app.state, customer.id, app.ctx)
      const says = (() => {
        try {
          return app.data.makeLine('complaint', {
            persona: personaObj(app.ctx, customer.persona), region: customer.region, rand: Math.random,
            vars: { gender: customer.gender, name: customer.name, ...(customer.self ? { self: customer.self } : {}), mon: items[0] && R[items[0].line.recipeId] ? R[items[0].line.recipeId].name : '' }
          })
        } catch { return '' }
      })()
      app.sound('error')
      const result = await app.modal({
        title: S.screens.complaint,
        testid: 'complaint-modal',
        // phần dựng hộp (câu khách nói, món bị phàn nàn, 2 bước chọn): components/incident-view.js
        render: close => renderComplaint(app, customer, { says, aps, items, refund, remakeOk, close })
      })
      if (!result || destroyed) return
      const r = resolveComplaint(app.state, customer.id, { apologyIndex: result.apology, action: result.action }, app.ctx)
      if (!r.ok) return
      app.toast(r.apologyCorrect ? 'Xin lỗi chân thành, khách dịu lại.' : 'Câu nói đó làm khách phật ý hơn.', { kind: r.apologyCorrect ? 'good' : 'bad' })
      if (result.action === 'remake') { app.toast('Phiếu làm lại đã kẹp đầu dây bếp.', { kind: 'info' }); dots.kitchen = active !== 'kitchen' }
      app.save()
    }

    // ---------- Kết ca ----------
    let overSince = 0
    let ended = false
    function checkEnd(now) {
      if (ended || (app.tour && app.tour.isHeld())) return
      if (!isShiftOver(app.state)) { overSince = 0; return }
      if (!overSince) { overSince = now; return }
      if (now - overSince < END_DELAY_MS || sheetShowing || sheetQueue.length || app.modalOpen()) return
      ended = true
      const summary = endShift(app.state, app.ctx)
      app.saveNow({ backup: true })
      app.go('summary', { summary })
    }

    // ---------- 0.4.1: Hướng dẫn lần đầu (tour) theo khâu đang làm ----------
    const tourBySpot = {}
    for (const [id, t] of Object.entries(app.data.TOURS || {})) if (t.screen === 'service' && t.spot) tourBySpot[t.spot] = id
    // chỗ đang làm: phiếu chấm đang hiện > tab đang mở (Quầy: khâu của khách ở quầy; Bếp: dây phiếu / chọn / Thớt / giao);
    // null = đang bận (mini-game, bảng chọn của bếp, công bố món) → chưa tự hiện
    function tourSpot() {
      if (sheetShowing && sheetSettled(sheetHost.querySelector('.score-sheet.show'))) {
        // không chen vào mini-game vừa mở ở Bếp
        return active === 'kitchen' && kitchen && kitchen.busy && kitchen.busy() ? null : 'score'
      }
      if (active === 'counter') return counter.tourSpot ? counter.tourSpot() : null
      return kitchen && kitchen.tourSpot ? kitchen.tourSpot() : null
    }
    // tour của một chỗ, kèm tour dẫn (lead) đi trước: tới thẳng chỗ này (vd chạm phiếu trên dây ở đầu màn là mở luôn phiếu
    // trong Bếp) thì tour của chỗ bị bỏ qua (Dây phiếu) hiện nối tiếp, không lỡ mất
    function spotTours(spot) {
      const id = tourBySpot[spot]
      if (!id) return []
      const lead = (app.data.TOURS[id].lead || []).filter(x => app.data.TOURS[x])
      return [...lead, id]
    }
    function offerTour() {
      if (!app.tour || ended || destroyed || app.locked) return
      const ids = spotTours(tourSpot()).filter(id => app.tour.canAuto(id))
      if (ids.length) app.tour.offer(ids)
    }
    let heldHere = false
    if (app.tour) {
      // nút "?" → "Xem lại hướng dẫn màn này": tour của khâu đang làm; quầy trống / bếp chưa có phiếu → tổng quan ca bán
      app.tour.provide(() => {
        const ids = spotTours(tourSpot())
        return ids.length ? ids : [tourBySpot.idle].filter(Boolean)
      })
      offs.push(app.tour.onHold(held => {
        heldHere = held
        const st = app.state
        if (st && st.shift && !st.shift.tasting) setPaused(st, held)
        if (held) { if (active === 'kitchen' && kitchen && kitchen.guideHold) kitchen.guideHold(true) }
        else if (kitchen && kitchen.guideHold) kitchen.guideHold(false)
        if (!held) app.save()
      }))
      offs.push(() => {
        app.tour.provide(null)
        // rời màn khi đang giữ (hiếm): không để ca dừng mãi
        const st = app.state
        if (heldHere && st && st.shift && !st.shift.tasting) setPaused(st, false)
      })
    }

    paintTabs()
    renderStreet()
    paintProgress()

    return {
      // nút Back của điện thoại giữa ca: ở lại quầy, không rời ca
      onBack() {
        app.toast('Đang bán hàng, phục vụ hết khách rồi mới rời xe nha.', { kind: 'info' })
      },
      update(dt) {
        if (destroyed || !app.state.shift) return
        // advance() đã tự mở quầy; gọi lại cho chắc (hàm idempotent).
        const sh = app.state.shift
        if (!sh.counter && sh.queue.length && !sh.paused) beginCounter(app.state, app.ctx)
        hud.update()
        renderStreet()
        paintProgress()
        rail.update()
        paintTabs()
        counter.update(dt)
        if (kitchen && kitchen.update) {
          try { kitchen.update(dt) } catch (err) { console.error(err) }
        }
        applyFocus()
        if (pendingTips.length) sendPendingTips()
        // chồng thông báo đang nổi / thẻ Mẹo nghề đang chờ chỗ: xét lại thưa (chỗ trống đổi theo khâu / khách / bong bóng),
        // không đo mỗi khung hình
        else {
          const now = performance.now()
          if (tipWaitUntil && now > tipWaitUntil) tipWaitUntil = 0
          if ((tipWaitUntil || (toastStack && toastStack.firstElementChild)) && now >= toastCheckAt) {
            toastCheckAt = now + TOAST_RECHECK_MS
            recheckToasts()
          }
        }
        checkComplaint()
        checkIncident()
        offerTour()
        // thời gian ca (giây) cho kiểm thử tự động: đứng yên khi có hộp thoại chặn (vd tình huống trong ca)
        el.dataset.t = sh.t.toFixed(2)
        checkEnd(performance.now())
      },
      unmount() {
        destroyed = true
        if (sizeObs) sizeObs.disconnect()
        for (const id of fxTimers) clearTimeout(id)
        fxTimers.clear()
        if (hud.destroy) hud.destroy()
        if (rail.destroy) rail.destroy()
        for (const off of offs) off()
        if (typeof app.toastLimit === 'function') app.toastLimit(null)
        // trả lại hàm thông báo của app; thông báo còn chờ lúc rời màn (hết ca) là tin trong ca đã cũ: bỏ (thẻ Mẹo nghề vẫn
        // nằm trong Sổ tay nghề)
        if (app.toast === focusToast) app.toast = realToast
        focusOn = false
        revealOpen = false
        heldToasts.length = 0
        pendingTips.length = 0
        if (app.overlay && app.overlay.classList) app.overlay.classList.remove('is-cook-focus', 'is-service')
        if (app.switchTab === showTab) app.switchTab = null
        counter.unmount()
        if (kitchen && kitchen.unmount) { try { kitchen.unmount() } catch (err) { console.error(err) } }
      }
    }
  }
}

// Phiếu chấm đã trượt lên xong (hết hiệu ứng hiện, đã rõ hẳn)? Tour phiếu chấm chỉ tự hiện lúc này: đang trượt lên thì phiếu
// còn trong suốt, các bước chỉ vào phiếu (Phiếu chấm, Tip) bị coi là chưa hiện và bị bỏ mất.
export function sheetSettled(node) {
  if (!node || !node.isConnected || !node.classList.contains('show')) return false
  try {
    if (typeof node.getAnimations === 'function' && node.getAnimations().some(a => a.playState === 'running' || a.playState === 'pending')) return false
  } catch { /* trình duyệt cũ: chỉ xem độ mờ */ }
  return Number(getComputedStyle(node).opacity) >= 0.9
}
