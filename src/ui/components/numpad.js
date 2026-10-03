// Máy tính tiền của khâu Báo tổng (M5 Đợt 2): thân máy xanh ngọc viền mực, màn LED xanh đậm (số gõ theo nghìn, phần
// ".000đ" in mờ để nhắc cách gõ), phím "bánh kẹo" ≥ 48px và cột phím hành động bên phải (nút "Báo tổng" do bên gọi đưa vào).
// Panel Quầy thấp (.co-fit-low / .co-fit-tiny, css/cashier.css): cùng các phím đó xếp lại bằng CSS thành máy gọn 3 hàng
// [màn LED | Báo tổng] / [1 2 3 4 5 Xóa] / [6 7 8 9 0 ⌫] để màn số, mọi phím và "Báo tổng" cùng lọt panel.
// Gõ theo nghìn: 30 → 30.000đ. Màu máy theo hình máy tính tiền / màn LED của src/ui/art/scene.js (gói hình Q-F).
// Thuần ở cấp module (import trong Node được): DOM chỉ tạo khi gọi createNumpad.
// Hiệu ứng chỉ chạy theo SỰ KIỆN (chạm phím, báo sai): số trên màn nảy nhẹ khi gõ, màn rung + viền đỏ khi báo sai;
// vẽ lại (createNumpad lần nữa) không phát lại gì. Giảm chuyển động: không nảy, không rung (chỉ viền đỏ tĩnh).
import { h } from '../dom.js'
import { isReduced } from '../motion.js'
import { formatVND, thousandsToVND } from '../format.js'

/** Thứ tự phím số (kiểu bàn phím điện thoại, giữ như bản cũ để người chơi quen tay): [nhãn, id]. */
export const NUMPAD_KEYS = Object.freeze([
  ['1', '1'], ['2', '2'], ['3', '3'],
  ['4', '4'], ['5', '5'], ['6', '6'],
  ['7', '7'], ['8', '8'], ['9', '9'],
  ['Xóa', 'clear'], ['0', '0'], ['⌫', 'back']
])

/** Chuỗi số đã gõ (chỉ chữ số, bỏ số 0 đầu, tối đa maxDigits). */
export function cleanDigits(value, maxDigits = 4) {
  return String(value ?? '').replace(/\D/g, '').replace(/^0+/, '').slice(0, maxDigits)
}

/** Một lần bấm phím: trả chuỗi số mới (thuần). */
export function pressDigits(digits, key, maxDigits = 4) {
  const d = String(digits || '')
  if (key === 'clear') return ''
  if (key === 'back') return d.slice(0, -1)
  if (!/^\d$/.test(String(key))) return d
  if (d.length >= maxDigits) return d
  if (key === '0' && !d) return d
  return d + key
}

/**
 * Chữ trên màn LED (thuần): { amount, text, big, small, empty }. text = formatVND(amount) ('0đ' khi chưa gõ);
 * big = phần người chơi gõ (vd '35' hay '1.250'), small = đuôi '.000đ' in mờ (nhắc gõ theo nghìn).
 */
export function ledParts(digits) {
  const d = cleanDigits(digits, 9)
  const amount = thousandsToVND(d)
  if (!d) return { amount: 0, text: formatVND(0), big: '0', small: 'đ', empty: true }
  const text = formatVND(amount)
  const tail = '.000đ'
  return text.endsWith(tail)
    ? { amount, text, big: text.slice(0, -tail.length), small: tail, empty: false }
    : { amount, text, big: text, small: '', empty: false }
}

/**
 * createNumpad({ value: '30', maxDigits: 4, onChange(digits), action, reduced }) →
 *   { el, display, get(), set(digits), amount(), wrong() }
 * action (tùy chọn): nút đặt ở cột phím hành động bên phải (vd nút "Báo tổng", cao bằng 4 hàng phím).
 * reduced (tùy chọn): hàm () → boolean, mặc định isReduced() (giảm chuyển động: không nảy số).
 * wrong(): màn LED viền đỏ chữ đỏ ~0,7 giây (bên gọi tự rung khung màn bằng vfx.shake) → phần tử khung màn.
 * data-testid: numpad-0..9, numpad-clear, numpad-back, numpad-display (data-amount).
 */
export function createNumpad({ value = '', maxDigits = 4, onChange, action = null, reduced = null } = {}) {
  let digits = cleanDigits(value, maxDigits)
  const red = () => {
    try { return typeof reduced === 'function' ? !!reduced() : isReduced() } catch { return false }
  }
  const big = h('span', { class: 'cs-led-num' })
  const small = h('span', { class: 'cs-led-k' })
  const display = h('div', { class: 'cs-led', testid: 'numpad-display', 'aria-live': 'polite' }, big, small)
  // Khung thấp (css/cashier.css): dòng "Gõ theo nghìn" chuyển vào góc trái màn LED, chỉ hiện khi chưa gõ (nằm ngoài
  // numpad-display để chữ của màn số chỉ có con số).
  const frame = h('div', { class: 'cs-led-frame' },
    h('span', { class: 'cs-led-dot', 'aria-hidden': 'true' }),
    display,
    h('span', { class: 'cs-led-tip', 'aria-hidden': 'true' }, 'Gõ theo nghìn'))
  const paint = () => {
    const p = ledParts(digits)
    big.textContent = p.big
    small.textContent = p.small
    display.dataset.amount = String(p.amount)
    display.classList.toggle('is-empty', p.empty)
    frame.classList.toggle('is-empty', p.empty)
  }
  // số vừa gõ nảy nhẹ (chỉ transform; không chạy khi giảm chuyển động hoặc trình duyệt không có WAAPI)
  const nudge = () => {
    if (red() || typeof big.animate !== 'function') return
    try {
      big.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 140, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' })
    } catch { /* bỏ qua */ }
  }
  const press = id => {
    const next = pressDigits(digits, id, maxDigits)
    const grew = next.length > digits.length
    digits = next
    paint()
    if (grew) nudge()
    onChange && onChange(digits)
  }
  const key = (label, id) => {
    const fn = id === 'clear' || id === 'back'
    return h('button', {
      class: ['g-btn', 'cs-key', fn ? 'cs-key-fn' : 'cs-key-num', 'cs-key-' + id], type: 'button', testid: 'numpad-' + id,
      onclick: () => press(id), 'aria-label': id === 'back' ? 'Xóa một số' : (id === 'clear' ? 'Xóa hết' : label)
    }, label)
  }
  const grid = h('div', { class: 'cs-keys' }, NUMPAD_KEYS.map(([label, id]) => key(label, id)))
  if (action) {
    action.classList.add('cs-key-act')
    grid.appendChild(action)
  }
  const el = h('div', { class: 'cs-pos' },
    h('div', { class: 'cs-pos-top' }, frame, h('span', { class: 'cs-pos-slip', 'aria-hidden': 'true' })),
    h('p', { class: 'cs-pos-hint' }, 'Gõ theo nghìn: 30 là 30.000đ'),
    grid)
  paint()
  let wrongTimer = 0
  return {
    el,
    display,
    get: () => digits,
    set(d) { digits = cleanDigits(d, maxDigits); paint() },
    amount: () => thousandsToVND(digits),
    wrong() {
      display.classList.add('is-wrong')
      frame.classList.add('is-wrong')
      clearTimeout(wrongTimer)
      wrongTimer = setTimeout(() => { display.classList.remove('is-wrong'); frame.classList.remove('is-wrong') }, 700)
      return frame
    }
  }
}
