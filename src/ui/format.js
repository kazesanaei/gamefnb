// Định dạng hiển thị: tiền, sao, chuỗi có chỗ chèn.
import { formatVND, formatK } from '../core/money.js'

export { formatVND, formatK }

/** Thay {n}, {max}, {name}… trong chuỗi. */
export function fill(str, vars = {}) {
  return String(str || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m))
}

/** 4.25 → '4,3' */
export function formatStars(avg, digits = 1) {
  const n = Number(avg) || 0
  return n.toFixed(digits).replace('.', ',')
}

/** Chuỗi sao đầy/rỗng: 3 → '★★★☆☆' */
export function starString(stars, max = 5) {
  const s = Math.max(0, Math.min(max, Math.round(Number(stars) || 0)))
  return '★'.repeat(s) + '☆'.repeat(max - s)
}

/** Số nghìn người chơi gõ → đồng: '30' → 30000 */
export function thousandsToVND(digits) {
  const n = parseInt(String(digits || '0'), 10)
  return Number.isFinite(n) ? n * 1000 : 0
}

/** Chữ hoa có dấu cho ghi chú trên phiếu bếp. */
export function upper(str) {
  return String(str || '').toLocaleUpperCase('vi-VN')
}

/** Tên mệnh giá ngắn: 5000 → '5K' */
export function billLabel(v) {
  return Math.round(v / 1000) + 'K'
}

export function signedVND(n) {
  const v = Math.round(Number(n) || 0)
  return (v > 0 ? '+' : '') + formatVND(v)
}
