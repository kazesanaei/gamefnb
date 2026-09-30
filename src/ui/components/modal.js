// Hộp thoại chung (một hộp mỗi lúc, xếp hàng nếu gọi chồng). Trả Promise với giá trị khi đóng.
import { h, svgBox } from '../dom.js'

/**
 * createModalHost(host) → { open(opts) → Promise, isOpen(), isBlocking(), isDismissible(), closeActive(value) }
 * opts: {
 *   title, text, icon (SVG), body (Node),
 *   actions: [{ label, value, testid, kind: 'primary'|'ghost'|'danger', disabled }],
 *   render(close) → Node   // nội dung tùy biến, tự gọi close(value)
 *   dismissible (chạm nền để đóng, trả null), testid, blocking (mặc định true: tạm dừng thời gian ca)
 * }
 */
export function createModalHost(host) {
  const queue = []
  let active = null

  function showNext() {
    if (active || !queue.length) return
    const { opts, resolve } = queue.shift()
    const layer = h('div', { class: 'modal-layer', testid: 'modal-layer' })
    const card = h('div', { class: ['modal', opts.className], role: 'dialog', 'aria-modal': 'true', testid: opts.testid || 'modal' })
    let closed = false
    const close = value => {
      if (closed) return
      closed = true
      layer.classList.add('hide')
      setTimeout(() => layer.remove(), 180)
      active = null
      resolve(value === undefined ? null : value)
      setTimeout(showNext, 0)
    }
    if (opts.icon) card.appendChild(svgBox(opts.icon, 'modal-icon'))
    if (opts.title) card.appendChild(h('h2', { class: 'modal-title' }, opts.title))
    if (opts.text) card.appendChild(h('p', { class: 'modal-text' }, opts.text))
    if (opts.body) card.appendChild(opts.body)
    if (typeof opts.render === 'function') card.appendChild(opts.render(close))
    if (opts.actions && opts.actions.length) {
      const row = h('div', { class: 'modal-actions' })
      for (const a of opts.actions) {
        row.appendChild(h('button', {
          class: ['btn', 'btn-' + (a.kind || 'primary')], type: 'button', testid: a.testid,
          disabled: !!a.disabled, onclick: () => close(a.value)
        }, a.label))
      }
      card.appendChild(row)
    }
    layer.appendChild(card)
    if (opts.dismissible) layer.addEventListener('click', e => { if (e.target === layer) close(null) })
    host.appendChild(layer)
    active = { close, blocking: opts.blocking !== false, dismissible: !!opts.dismissible }
    requestAnimationFrame(() => layer.classList.add('show'))
    const focusable = card.querySelector('button, input')
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 30)
  }

  return {
    open(opts = {}) {
      return new Promise(resolve => {
        queue.push({ opts, resolve })
        showNext()
      })
    },
    isOpen() { return !!active },
    isBlocking() { return !!active && active.blocking },
    isDismissible() { return !!active && active.dismissible },
    closeActive(value) { if (active) active.close(value) }
  }
}
