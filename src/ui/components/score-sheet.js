// Phiếu chấm từng khách (hiện ở .sheet-host của màn Ca bán): thẻ giấy viền mực kiểu game.
// M5 Đợt 2 (gói Q-E): chân dung khách bán thân (src/ui/art/people.js) đổi tâm trạng theo số sao kèm biểu cảm, 5 ngôi sao
// bật lần lượt 180 ms mỗi sao, 5 hàng có biểu tượng khâu và dấu ✓/✗ (Order, Báo tổng, Thối tiền, Bếp, Thời gian chờ),
// tem "Lỗi tại quầy" / "Lỗi tại bếp" đóng lên phiếu, tên lỗi, phạt do tình huống, dòng tip có xu vàng (xu bay về ví HUD,
// chữ "+5.000đ" nổi lên, âm coin2), khách lạ, lời khen chê của khách.
//
// Chỉ đổi giao diện: không đổi luật, sao, tip. Hàng đợi phiếu, thời gian hiện (SHEET_MS) và sheetSettled vẫn ở service.js.
// Giữ: score-sheet (data-customer-id, data-stars), .ss-rows (li.ok / li.bad), .ss-tags, score-sheet-tip (data-tip, chữ
// "Tip: +5.000đ" / "Tip 0 (…)" đúng nguyên văn), score-sheet-tag-quay/-bep, score-sheet-incident, score-sheet-stranger.
//
// Quy ước hoạt ảnh (thiết kế mục 0 #11, 1.3, 6.4):
//   - service.js bật/tắt lớp .show / .hide trên CHÍNH nút .score-sheet và sheetSettled đòi nút này không có hoạt ảnh nào
//     đang chạy, nên mọi hoạt ảnh (sao, mặt khách, tem, xu) đặt trên PHẦN TỬ CON, thời lượng hữu hạn, chỉ transform/opacity
//     (css/sheet.css). Không có hoạt ảnh lặp vô hạn.
//   - Mỗi phiếu chỉ diễn MỘT lần: phiếu dựng lại từ cùng một đối tượng thì hiện thẳng trạng thái cuối (lớp is-static).
//   - Hiệu ứng JS (âm từng sao, lấp lánh 5 sao, xu tip bay) hẹn giờ từ lúc dựng phiếu (dựng đúng một lần theo sự kiện
//     customer.rated), luôn kiểm phiếu còn trong trang; xu bay qua app.vfx (tự theo giảm chuyển động, không phát lên bus).
//     Mỗi xu chạm ví phát sự kiện DOM 'vfx-coin' trên [hud-wallet] (source 'tip') để HUD đếm dòng "thu trong ca".
//   - Giảm chuyển động: sao, mặt, tem hiện cùng lúc (CSS tắt hoạt ảnh; JS không hẹn âm từng sao).
// Import trong Node được: không chạm DOM ở cấp module.
import { h, svgBox } from '../dom.js'
import { formatVND } from '../format.js'
import { bust } from '../art/people.js'
import { SCENE_ICONS } from '../art/scene.js'
import { isReduced } from '../motion.js'
import { coinCount } from '../vfx.js'

export const ORDER_CODES = ['sai_mon', 'thieu_mon', 'thua_mon', 'sai_so_luong', 'sai_ghi_chu']
// Phiếu chấm tách 2 hàng theo khâu (đặc tả mục 3.11): Báo tổng (khâu Thanh toán) và Thối tiền (khâu Tính tiền).
export const TOTAL_CODES = ['bao_du', 'bao_thieu']
export const CHANGE_CODES = ['thoi_thieu', 'thoi_du', 'qr_gia']

/**
 * Nhịp diễn của phiếu (ms, tính từ lúc dựng phiếu): phiếu trượt lên trong khoảng 220 ms rồi sao thứ k (0..4) bật lúc
 * starStart + k × starGap, mỗi sao nảy trong starMs; mặt khách đổi tâm trạng sau sao cuối (react); tem đóng sau đó (stamp);
 * xu tip bay lúc tip. Tổng khoảng 1,3 giây, lọt trong SHEET_MS 2.000 của service.js.
 */
export const SHEET_FX = Object.freeze({ starStart: 220, starGap: 180, starMs: 320, reactGap: 120, stampGap: 220, tipLead: 60 })

/** Lịch diễn theo số sao (thuần, test được): { stars: [ms bật từng sao đạt], react, stamp, tip }. */
export function sheetTimeline(stars) {
  const n = Math.max(0, Math.min(5, Math.round(Number(stars) || 0)))
  const F = SHEET_FX
  const at = []
  for (let k = 0; k < n; k++) at.push(F.starStart + k * F.starGap)
  const last = n ? at[n - 1] : F.starStart
  return { stars: at, react: last + F.reactGap, stamp: last + F.stampGap, tip: last + F.tipLead }
}

/** Tâm trạng khách theo số sao: 4–5 vui, 3 bình thường, 2 bực, 0–1 giận. */
export function sheetMood(stars) {
  const s = Number(stars) || 0
  return s >= 4 ? 'vui' : (s >= 3 ? 'binh_thuong' : (s >= 2 ? 'buc' : 'gian'))
}

// ---------- Hình nhỏ vẽ tay (viewBox 64, viền mực #3a2618, ánh sáng trên-trái; không gradient / filter / href) ----------
const INK = '#3a2618'
const svg64 = body => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`

/**
 * Biểu cảm nổi cạnh mặt khách: tim (5 sao), lấp lánh (4), ba chấm (3), giọt mồ hôi (2), dấu giận (0–1).
 * Khóa: tim | lap_lanh | ba_cham | mo_hoi | gian.
 */
export const EMOTES = Object.freeze({
  tim: svg64('<path d="M32 54C18 44 8 35 8 24C8 16 14 10 21 10C26 10 30 13 32 17C34 13 38 10 43 10C50 10 56 16 56 24C56 35 46 44 32 54Z" fill="#ff6f7d" stroke-width="3"/>' +
    '<path d="M45 21C49 24 49 30 46 35C43 40 38 44 32 48C40 41 46 33 45 21Z" fill="#d94b5c" stroke="none"/>' +
    '<path d="M16 22C16 18 19 15 23 15" fill="none" stroke="#fff" stroke-width="3.5" opacity=".6"/>'),
  lap_lanh: svg64('<path d="M32 6Q35 27 56 32Q35 37 32 58Q29 37 8 32Q29 27 32 6Z" fill="#ffd23f" stroke-width="3"/>' +
    '<path d="M32 32Q34 44 32 58Q35 37 56 32Q44 34 32 32Z" fill="#e9a400" stroke="none"/>' +
    '<path d="M50 8Q51 13 56 14Q51 15 50 20Q49 15 44 14Q49 13 50 8Z" fill="#fff6c4" stroke-width="2"/>'),
  ba_cham: svg64('<path d="M8 36C8 22 19 14 32 14C45 14 56 22 56 36C56 47 46 52 32 52C27 52 23 51 19 50L10 56L13 47C10 44 8 40 8 36Z" fill="#fffaf0" stroke-width="3"/>' +
    '<circle cx="21" cy="34" r="3.6" fill="' + INK + '" stroke="none"/><circle cx="32" cy="34" r="3.6" fill="' + INK + '" stroke="none"/><circle cx="43" cy="34" r="3.6" fill="' + INK + '" stroke="none"/>'),
  mo_hoi: svg64('<path d="M34 6C40 20 50 30 50 42C50 52 43 58 34 58C25 58 18 52 18 42C18 30 28 20 34 6Z" fill="#8ccff0" stroke-width="3"/>' +
    '<path d="M44 40C45 48 40 54 33 54C40 51 44 47 44 40Z" fill="#4c9fd0" stroke="none"/>' +
    '<path d="M25 40C25 34 28 29 31 26" fill="none" stroke="#fff" stroke-width="3.5" opacity=".6"/>'),
  gian: svg64('<g fill="none" stroke="#d8392b" stroke-width="6">' +
    '<path d="M10 26C20 26 26 20 26 10"/><path d="M38 10C38 20 44 26 54 26"/><path d="M54 38C44 38 38 44 38 54"/><path d="M26 54C26 44 20 38 10 38"/></g>' +
    '<g fill="none" stroke="#ff7b68" stroke-width="2"><path d="M12 24C20 23 24 19 24 12"/><path d="M40 12C40 19 44 23 52 24"/></g>')
})

/** Khóa biểu cảm theo số sao. */
export function emoteKey(stars) {
  const s = Number(stars) || 0
  return s >= 5 ? 'tim' : (s >= 4 ? 'lap_lanh' : (s >= 3 ? 'ba_cham' : (s >= 2 ? 'mo_hoi' : 'gian')))
}

// Ngôi sao chấm (viewBox 64): đạt = vàng ba tông; chưa đạt = khung giấy xám.
const STAR_PTS = 'M32 5L39.6 22.6L58.6 24.3L44.2 36.9L48.5 55.5L32 45.7L15.5 55.5L19.8 36.9L5.4 24.3L24.4 22.6Z'
const STAR_ON = svg64(`<path d="${STAR_PTS}" fill="#ffd23f" stroke-width="3.5"/>` +
  '<path d="M32 45.7L48.5 55.5L44.2 36.9L58.6 24.3L45 26Q42 40 32 45.7Z" fill="#e9a400" stroke="none"/>' +
  '<path d="M20 26L26 25.4L29.6 17" fill="none" stroke="#fff" stroke-width="3" opacity=".65"/>')
const STAR_OFF = svg64(`<path d="${STAR_PTS}" fill="#efe3c8" stroke="#bfa98a" stroke-width="3.5"/>`)

// Dấu Đạt / Sai trong vòng tròn (viewBox 64): màu kèm hình (✓ / ✗), không chỉ dựa vào màu.
const MARK_OK = svg64('<circle cx="32" cy="32" r="27" fill="#43a63d" stroke-width="4"/><path d="M38 52A27 27 0 0 0 59 32C59 44 50 54 38 52Z" fill="#226b28" stroke="none"/>' +
  '<path d="M19 33L28 42L45 22" fill="none" stroke="#fff" stroke-width="7"/>')
const MARK_BAD = svg64('<circle cx="32" cy="32" r="27" fill="#d8392b" stroke-width="4"/><path d="M38 52A27 27 0 0 0 59 32C59 44 50 54 38 52Z" fill="#8f2015" stroke="none"/>' +
  '<path d="M22 22L42 42M42 22L22 42" fill="none" stroke="#fff" stroke-width="7"/>')

// Biểu tượng khâu của từng hàng (src/ui/art/scene.js).
const ROW_ICONS = { order: 'khau_order', total: 'khau_thanh_toan', change: 'khau_tinh_tien', kitchen: 'khau_lam_do', wait: 'hud_gio' }
const icon64 = id => (SCENE_ICONS && SCENE_ICONS[id]) || ''

// Mỗi đối tượng phiếu chỉ diễn một lần (vẽ lại thì hiện thẳng trạng thái cuối).
const played = new WeakSet()

// Khách của phiếu (còn trong ca) → kiểu khách, giới tính, dáng riêng (khách quen / khách lạ).
function whoOf(app, sheet) {
  const sh = app && app.state && app.state.shift
  const c = sh && sh.customers && sh.customers[sheet.customerId]
  if (!c) return { persona: 'hoc_sinh', opts: {} }
  const opts = {}
  if (c.gender) opts.gender = c.gender
  const who = c.regularId || c.stranger || null
  if (typeof who === 'string' && who) opts.who = who
  return { persona: c.persona || 'hoc_sinh', opts }
}

function bustSafe(persona, mood, opts) {
  try {
    const s = bust(persona, mood, opts)
    return typeof s === 'string' ? s : ''
  } catch { return '' }
}

// Chân dung khách: khung ảnh viền mực, nền quán; mặt bình thường rồi đổi sang tâm trạng theo sao (hai lớp chồng nhau, CSS
// đổi độ mờ lúc react), biểu cảm nảy cạnh khung (nằm ngoài khung cắt hình).
function portrait(app, sheet) {
  const { persona, opts } = whoOf(app, sheet)
  const mood = sheetMood(sheet.stars)
  const final = bustSafe(persona, mood, opts)
  const swap = mood !== 'binh_thuong'
  const start = swap ? bustSafe(persona, 'binh_thuong', opts) : ''
  const emote = emoteKey(sheet.stars)
  return h('div', { class: ['ss-face', swap ? 'has-swap' : ''], dataset: { mood } },
    h('div', { class: 'ss-face-frame' },
      start ? svgBox(start, 'ss-face-img ss-face-a') : null,
      svgBox(final, 'ss-face-img ss-face-b')),
    h('span', { class: 'ss-emote', dataset: { emote }, html: EMOTES[emote], 'aria-hidden': 'true' }))
}

// Hàng sao: ô sao nào cũng có sao xám nền; sao đạt là lớp vàng phủ lên, có --i (thứ tự bật).
function starRow(stars) {
  const n = Math.max(0, Math.min(5, Math.round(Number(stars) || 0)))
  const cells = []
  for (let k = 0; k < 5; k++) {
    const on = k < n
    cells.push(h('span', { class: ['ss-star', on ? 'is-on' : 'is-off'], style: on ? { '--i': String(k) } : null },
      svgBox(STAR_OFF, 'ss-star-bg'),
      on ? svgBox(STAR_ON, 'ss-star-fg') : null))
  }
  return h('span', { class: 'ss-stars', role: 'img', 'aria-label': n + ' sao' }, cells)
}

// M4: dòng tip trên phiếu chấm: có tip thì "Tip: +5.000đ" (xu vàng trước chữ); khách 5 sao mà không có tip thì ghi rõ lý do
// (hóa đơn khách thực trả dưới 20.000đ, hoặc khách trả bằng ảnh chuyển khoản giả nên chưa trả tiền thật).
// Chữ của dòng (textContent) giữ nguyên văn như trước: hình xu là SVG không có chữ.
export function tipLine(app, sheet) {
  const L = app.data.STRINGS.labels || {}
  if (sheet.tip > 0) {
    return h('div', { class: 'ss-tip', testid: 'score-sheet-tip', dataset: { tip: sheet.tip } },
      svgBox(icon64('dong_xu'), 'ss-coin'), h('span', { class: 'ss-tip-k' }, 'Tip: '), h('b', { class: 'ss-tip-v' }, '+' + formatVND(sheet.tip)))
  }
  if (sheet.stars !== 5 || sheet.bill === undefined || sheet.bill === null) return null
  const min = Number(app.data.BALANCE && app.data.BALANCE.tipMinBill) || 20000
  const fake = (sheet.counterErrors || []).includes('qr_gia')
  if (!fake && !(Number(sheet.bill) < min)) return null
  const text = fake ? (L.tipNotPaid || 'Tip 0 (khách chưa trả tiền thật)')
    : (L.tipBelowMin || 'Tip 0 (hóa đơn dưới {min})').replace('{min}', formatVND(min))
  return h('div', { class: 'ss-tip is-zero', testid: 'score-sheet-tip', dataset: { tip: 0 } }, svgBox(icon64('dong_xu'), 'ss-coin'), h('span', null, text))
}

export function renderScoreSheet(app, sheet) {
  const S = app.data.STRINGS
  const counterErr = sheet.counterErrors || []
  const kitchenErr = sheet.kitchenErrors || []
  const orderBad = counterErr.some(c => ORDER_CODES.includes(c))
  const totalBad = counterErr.some(c => TOTAL_CODES.includes(c))
  const changeBad = counterErr.some(c => CHANGE_CODES.includes(c))
  const kitchenBad = kitchenErr.length > 0 || (sheet.dishes || []).some(d => d.grade === 'hong' || d.grade === 'kem')
  const waitBad = (sheet.penalties || []).some(p => p.source === 'cho')
  const ratio = sheet.waitRatio
  const speed = ratio === null || ratio === undefined ? '' : (ratio <= 0.5 ? S.speedLabels.nhanh : (ratio <= 0.75 ? S.speedLabels.on : S.speedLabels.cham))
  let rowN = 0
  const row = (key, label, bad, extra = '') => h('li', { class: ['ss-row', bad ? 'bad' : 'ok'], dataset: { row: key }, style: { '--r': String(rowN++) } },
    svgBox(icon64(ROW_ICONS[key]), 'ss-ico'),
    h('span', { class: 'ss-label' }, label),
    h('i', { class: 'ss-dots', 'aria-hidden': 'true' }),
    h('b', { class: 'ss-verdict' }, svgBox(bad ? MARK_BAD : MARK_OK, 'ss-mark'), h('span', null, (bad ? 'Sai' : 'Đạt') + (extra ? ' · ' + extra : ''))))
  const labels = []
  // modifier riêng (err-tag--quay/--bep): tên '.counter'/'.kitchen' là class bố cục của panel Quầy/Bếp, dùng chung thì
  // nhãn bị nhiễm kiểu panel (chữ màu mực trên nền gạch, cao lệch nhau). M5: nhãn là con tem đóng lên phiếu.
  if (counterErr.length) labels.push(h('span', { class: 'err-tag err-tag--quay', testid: 'score-sheet-tag-quay' }, S.labels.counterError))
  if (kitchenErr.length || kitchenBad) labels.push(h('span', { class: 'err-tag err-tag--bep', testid: 'score-sheet-tag-bep' }, S.labels.kitchenError))
  const errNames = [...counterErr, ...kitchenErr].map(c => S.errors[c] || c)
  // M3: phạt do tình huống trong ca (vd từ chối đổi món) — không phải lỗi quầy/bếp nhưng ghi rõ vì sao mất sao
  const incidentPen = (sheet.penalties || []).filter(p => p.source === 'tinh_huong')
  const tip = tipLine(app, sheet)
  const again = played.has(sheet)
  played.add(sheet)
  const reduced = isReduced(app)
  const plan = sheetTimeline(sheet.stars)
  const node = h('div', {
    class: ['score-sheet', again || reduced ? 'is-static' : ''],
    testid: 'score-sheet', dataset: { customerId: sheet.customerId, stars: sheet.stars, mood: sheetMood(sheet.stars) }, 'aria-live': 'polite',
    // mốc diễn cho css/sheet.css: mặt đổi tâm trạng, tem đóng, đồng xu tip nảy
    style: { '--ss-react': plan.react + 'ms', '--ss-stamp': plan.stamp + 'ms', '--ss-tip': plan.tip + 'ms' }
  },
  h('div', { class: 'ss-head' },
    portrait(app, sheet),
    h('div', { class: 'ss-who' },
      h('b', { class: 'ss-name' }, sheet.name),
      starRow(sheet.stars),
      sheet.tutorial ? h('div', { class: 'ss-note' }, S.messages.tutorialNoPenalty) : null,
      sheet.review ? h('p', { class: 'ss-review' }, '“' + sheet.review + '”') : null)),
  h('ul', { class: 'ss-rows' },
    row('order', 'Order', orderBad),
    row('total', 'Báo tổng', totalBad),
    row('change', 'Thối tiền', changeBad),
    row('kitchen', 'Bếp', kitchenBad, (sheet.dishes || []).map(d => S.grades[d.grade] || '').filter(Boolean).join(', ')),
    row('wait', 'Thời gian chờ', waitBad, speed)),
  labels.length ? h('div', { class: 'ss-tags' }, labels) : null,
  errNames.length ? h('div', { class: 'ss-errors' }, errNames.join(' · ')) : null,
  incidentPen.length ? h('div', { class: 'ss-errors', testid: 'score-sheet-incident' },
    incidentPen.map(p => `${S.errors[p.code] || p.code}: −${p.stars} sao`).join(' · ')) : null,
  tip,
  // M4: khách lạ: quà quê theo số sao (trao cuối ca)
  sheet.stranger ? h('div', { class: 'ss-tip ss-stranger', testid: 'score-sheet-stranger' },
    sheet.stars >= 3 ? '★ Khách lạ hẹn gửi quà quê lúc cuối ca' : '★ Khách lạ cảm ơn rồi đi') : null)
  if (!again) scheduleFx(app, node, sheet, reduced, plan)
  return node
}

// ---------- Hiệu ứng JS của phiếu (một lần mỗi phiếu) ----------
function later(fn, ms) {
  try { setTimeout(fn, ms) } catch { /* môi trường không có hẹn giờ */ }
}
const live = node => !!(node && node.isConnected && !node.classList.contains('hide'))

function scheduleFx(app, node, sheet, reduced, plan) {
  const sound = name => { try { if (app && typeof app.sound === 'function') app.sound(name) } catch { /* bỏ qua */ } }
  const fx = () => (app && app.vfx ? app.vfx : null)
  if (!reduced) {
    // tiếng "tích" nhỏ theo từng sao bật; đủ 5 sao thì lấp lánh quanh hàng sao lúc sao cuối chạm
    plan.stars.forEach((ms, k) => later(() => {
      if (!live(node)) return
      sound('tick')
      if (k === 4) {
        const f = fx()
        const row = node.querySelector('.ss-stars')
        if (f && row) { try { f.burst(row, 'sparkle', { n: 8 }) } catch { /* bỏ qua */ } }
      }
    }, ms + Math.round(SHEET_FX.starMs * 0.45)))
  }
  if (sheet.tip > 0) later(() => playTip(app, node, sheet), reduced ? 120 : plan.tip)
}

/**
 * Xu tip: âm coin2, chữ "+5.000đ" nổi trên dòng tip, 4–6 xu bay từ đồng xu của dòng tip về ví HUD ([hud-wallet]); mỗi xu
 * chạm ví phát 'vfx-coin' (source 'tip') để HUD đếm dòng "thu trong ca". Giảm chuyển động / trang ẩn: vfx giao gộp một lần.
 */
function playTip(app, node, sheet) {
  if (!live(node)) return
  try { if (typeof app.sound === 'function') app.sound('coin2') } catch { /* bỏ qua */ }
  const f = app && app.vfx
  const line = node.querySelector('[data-testid="score-sheet-tip"]')
  const coin = (line && line.querySelector('.ss-coin')) || line
  if (!f || !coin) return
  const doc = node.ownerDocument
  const wallet = doc && doc.querySelector('[data-testid="hud-wallet"]')
  try { f.floatText(coin, '+' + formatVND(sheet.tip), { tone: 'gold', size: 'small' }) } catch { /* bỏ qua */ }
  if (!wallet) return
  const onArrive = info => {
    try { wallet.dispatchEvent(new CustomEvent('vfx-coin', { detail: { ...info, source: 'tip' } })) } catch { /* bỏ qua */ }
  }
  try { f.coins(coin, wallet, coinCount(sheet.tip, { min: 4, max: 6 }), { amount: sheet.tip, unit: 1000, onArrive, scale: 0.9 }) } catch { /* bỏ qua */ }
}
