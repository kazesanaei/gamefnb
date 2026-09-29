// Bàn phím số theo nghìn: gõ 30 → 30.000đ.
import { h } from '../dom.js'
import { formatVND, thousandsToVND } from '../format.js'

/**
 * createNumpad({ value: '30', maxDigits: 4, onChange(digits), action }) → { el, get(), set(digits), amount() }
 * action (tùy chọn): phần tử đặt cạnh màn số (vd nút "Báo tổng").
 * data-testid: numpad-0..9, numpad-clear, numpad-back, numpad-display (data-amount).
 */
export function createNumpad({ value = '', maxDigits = 4, onChange, action = null } = {}) {
  let digits = String(value || '').replace(/\D/g, '').replace(/^0+/, '').slice(0, maxDigits)
  const display = h('div', { class: 'numpad-display', testid: 'numpad-display', 'aria-live': 'polite' })
  const hint = h('div', { class: 'numpad-hint' }, 'Gõ theo nghìn: 30 là 30.000đ')
  const paint = () => {
    const amount = thousandsToVND(digits)
    display.textContent = digits ? formatVND(amount) : '0đ'
    display.dataset.amount = String(amount)
    display.classList.toggle('empty', !digits)
  }
  const press = d => {
    if (d === 'clear') digits = ''
    else if (d === 'back') digits = digits.slice(0, -1)
    else if (digits.length < maxDigits) {
      if (!(d === '0' && !digits)) digits += d
    }
    paint()
    onChange && onChange(digits)
  }
  const key = (label, id, cls = '') => h('button', {
    class: ['numpad-key', cls], type: 'button', testid: 'numpad-' + id,
    onclick: () => press(id), 'aria-label': id === 'back' ? 'Xóa một số' : (id === 'clear' ? 'Xóa hết' : label)
  }, label)
  const grid = h('div', { class: 'numpad-grid' },
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => key(d, d)),
    key('Xóa', 'clear', 'numpad-fn'), key('0', '0'), key('⌫', 'back', 'numpad-fn'))
  const el = h('div', { class: 'numpad' }, h('div', { class: 'numpad-top' }, display, action), grid, hint)
  paint()
  return {
    el,
    get: () => digits,
    set(d) { digits = String(d || '').replace(/\D/g, '').slice(0, maxDigits); paint() },
    amount: () => thousandsToVND(digits)
  }
}
