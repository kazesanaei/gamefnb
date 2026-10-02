// Phiếu chấm từng khách (hiện ở .sheet-host của màn Ca bán): tên, sao, 5 hàng Đạt/Sai (Order, Báo tổng, Thối tiền, Bếp,
// Thời gian chờ), nhãn lỗi Quầy/Bếp, tên lỗi, phạt do tình huống, dòng tip, khách lạ, lời khen chê.
// Tách từ service.js (M5 Đợt 2, bước 0): chỉ chuyển chỗ, không đổi hành vi. Hàng đợi phiếu, thời gian hiện (SHEET_MS) và
// sheetSettled vẫn ở service.js. Giữ: score-sheet (data-customer-id, data-stars), .ss-rows, .ss-tags, score-sheet-tip
// (data-tip), score-sheet-tag-quay/-bep, score-sheet-incident, score-sheet-stranger.
// Import trong Node được: không chạm DOM ở cấp module.
import { h } from '../dom.js'
import { formatVND, starString } from '../format.js'

export const ORDER_CODES = ['sai_mon', 'thieu_mon', 'thua_mon', 'sai_so_luong', 'sai_ghi_chu']
// Phiếu chấm tách 2 hàng theo khâu (đặc tả mục 3.11): Báo tổng (khâu Thanh toán) và Thối tiền (khâu Tính tiền).
export const TOTAL_CODES = ['bao_du', 'bao_thieu']
export const CHANGE_CODES = ['thoi_thieu', 'thoi_du', 'qr_gia']

// Phiếu chấm từng khách: trượt lên 2 giây, không chặn thao tác.
// M4: dòng tip trên phiếu chấm: có tip thì "+5.000đ"; khách 5 sao mà không có tip thì ghi rõ lý do (hóa đơn khách thực
// trả dưới 20.000đ, hoặc khách trả bằng ảnh chuyển khoản giả nên chưa trả tiền thật).
export function tipLine(app, sheet) {
  const L = app.data.STRINGS.labels || {}
  if (sheet.tip > 0) return h('div', { class: 'ss-tip', testid: 'score-sheet-tip', dataset: { tip: sheet.tip } }, 'Tip: +' + formatVND(sheet.tip))
  if (sheet.stars !== 5 || sheet.bill === undefined || sheet.bill === null) return null
  const min = Number(app.data.BALANCE && app.data.BALANCE.tipMinBill) || 20000
  const fake = (sheet.counterErrors || []).includes('qr_gia')
  if (!fake && !(Number(sheet.bill) < min)) return null
  const text = fake ? (L.tipNotPaid || 'Tip 0 (khách chưa trả tiền thật)')
    : (L.tipBelowMin || 'Tip 0 (hóa đơn dưới {min})').replace('{min}', formatVND(min))
  return h('div', { class: 'ss-tip is-zero', testid: 'score-sheet-tip', dataset: { tip: 0 } }, text)
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
  const row = (label, bad, extra = '') => h('li', { class: bad ? 'bad' : 'ok' },
    h('span', null, label), h('b', null, (bad ? 'Sai' : 'Đạt') + (extra ? ' · ' + extra : '')))
  const labels = []
  // modifier riêng (err-tag--quay/--bep): tên '.counter'/'.kitchen' là class bố cục của panel Quầy/Bếp, dùng chung thì
  // nhãn bị nhiễm kiểu panel (chữ màu mực trên nền gạch, cao lệch nhau)
  if (counterErr.length) labels.push(h('span', { class: 'err-tag err-tag--quay', testid: 'score-sheet-tag-quay' }, S.labels.counterError))
  if (kitchenErr.length || kitchenBad) labels.push(h('span', { class: 'err-tag err-tag--bep', testid: 'score-sheet-tag-bep' }, S.labels.kitchenError))
  const errNames = [...counterErr, ...kitchenErr].map(c => S.errors[c] || c)
  // M3: phạt do tình huống trong ca (vd từ chối đổi món) — không phải lỗi quầy/bếp nhưng ghi rõ vì sao mất sao
  const incidentPen = (sheet.penalties || []).filter(p => p.source === 'tinh_huong')
  return h('div', { class: 'score-sheet', testid: 'score-sheet', dataset: { customerId: sheet.customerId, stars: sheet.stars }, 'aria-live': 'polite' },
    h('div', { class: 'ss-head' },
      h('b', null, sheet.name),
      h('span', { class: 'ss-stars', 'aria-label': sheet.stars + ' sao' }, starString(sheet.stars))),
    sheet.tutorial ? h('div', { class: 'muted small' }, S.messages.tutorialNoPenalty) : null,
    h('ul', { class: 'ss-rows' },
      row('Order', orderBad),
      row('Báo tổng', totalBad),
      row('Thối tiền', changeBad),
      row('Bếp', kitchenBad, (sheet.dishes || []).map(d => S.grades[d.grade] || '').filter(Boolean).join(', ')),
      row('Thời gian chờ', waitBad, speed)),
    labels.length ? h('div', { class: 'ss-tags' }, labels) : null,
    errNames.length ? h('div', { class: 'ss-errors small' }, errNames.join(' · ')) : null,
    incidentPen.length ? h('div', { class: 'ss-errors small', testid: 'score-sheet-incident' },
      incidentPen.map(p => `${S.errors[p.code] || p.code}: −${p.stars} sao`).join(' · ')) : null,
    tipLine(app, sheet),
    // M4: khách lạ: quà quê theo số sao (trao cuối ca)
    sheet.stranger ? h('div', { class: 'ss-tip ss-stranger', testid: 'score-sheet-stranger' },
      sheet.stars >= 3 ? '★ Khách lạ hẹn gửi quà quê lúc cuối ca' : '★ Khách lạ cảm ơn rồi đi') : null,
    sheet.review ? h('p', { class: 'ss-review' }, '“' + sheet.review + '”') : null)
}
