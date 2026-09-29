// Thông báo nổi ngắn, không chặn thao tác (pointer-events: none).
// Thẻ Mẹo nghề (kind 'tip') hiện gọn, MỖI LẦN MỘT THẺ; thẻ đến sau xếp hàng (tối đa 2 thẻ chờ).
import { h, svgBox } from '../dom.js'

export const MAX_TOASTS = 2
export const MAX_TIP_QUEUE = 2

/**
 * createToaster(host) → { show(text, opts) }
 * opts: { duration (ms, mặc định 2200), kind: 'info'|'good'|'bad'|'tip', title, icon (SVG), testid }
 */
export function createToaster(host) {
  const box = h('div', { class: 'toast-stack', 'aria-live': 'polite', role: 'status' })
  host.appendChild(box)
  const tipQueue = []
  let tipShowing = false

  function build(text, opts) {
    const { kind = 'info', title = '', icon = '', testid = 'toast' } = opts
    return h('div', { class: ['toast', 'toast-' + kind], testid },
      icon ? svgBox(icon, 'toast-icon') : null,
      h('div', { class: 'toast-body' },
        title ? h('div', { class: 'toast-title' }, title) : null,
        h('div', { class: 'toast-text' }, text)))
  }

  function present(item, duration, onGone) {
    requestAnimationFrame(() => item.classList.add('show'))
    setTimeout(() => {
      item.classList.remove('show')
      item.classList.add('hide')
      setTimeout(() => { item.remove(); if (onGone) onGone() }, 260)
    }, duration)
  }

  function pumpTip() {
    if (tipShowing || !tipQueue.length) return
    const [text, opts] = tipQueue.shift()
    tipShowing = true
    const item = build(text, opts)
    box.insertBefore(item, box.firstChild)
    present(item, opts.duration ?? 3000, () => { tipShowing = false; pumpTip() })
  }

  return {
    el: box,
    show(text, opts = {}) {
      if (opts.kind === 'tip') {
        tipQueue.push([text, opts])
        while (tipQueue.length > MAX_TIP_QUEUE) tipQueue.shift()
        pumpTip()
        return null
      }
      const item = build(text, opts)
      box.appendChild(item)
      // tối đa 2 thông báo thường cùng lúc (thẻ Mẹo nghề không tính)
      const plain = [...box.children].filter(n => !n.classList.contains('toast-tip'))
      for (let i = 0; i < plain.length - MAX_TOASTS; i++) plain[i].remove()
      present(item, opts.duration ?? 2200)
      return item
    }
  }
}
