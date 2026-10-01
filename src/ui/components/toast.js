// Thông báo nổi ngắn, không chặn thao tác (pointer-events: none).
// Thẻ Mẹo nghề (kind 'tip') hiện gọn, MỖI LẦN MỘT THẺ; thẻ đến sau xếp hàng (tối đa 2 thẻ chờ).
// Giới hạn chiều cao (setLimit, màn ca bán): chồng thông báo không được che quá dải khách (thanh 4 khâu phải luôn
// thấy). Thông báo không vừa thì xếp hàng theo thứ tự đến, hiện khi thông báo trước tắt; thông báo thường chờ quá
// MAX_WAIT_MS thì bỏ (tin đã cũ, vd "Đã kẹp phiếu…" khi khách đã nhận món), thẻ Mẹo nghề không bỏ.
// Giữ thẻ Mẹo nghề (hold, 0.4.1 — hướng dẫn lần đầu đang hiện, chồng thông báo bị ẩn): thẻ đang nổi dừng đồng hồ (chưa tính
// thời gian bị ẩn), thẻ mới chờ trong hàng; thôi giữ thì thẻ hiện tiếp phần thời gian còn lại (ít nhất TIP_RESUME_MS).
// Thông báo thường không bị giữ (tin ngắn, cũ thì bỏ).
import { h, svgBox } from '../dom.js'

export const MAX_TOASTS = 2
export const MAX_TIP_QUEUE = 2
export const MAX_PENDING = 3
export const MAX_WAIT_MS = 3500
export const TIP_RESUME_MS = 1500

/**
 * createToaster(host) → { show(text, opts), setLimit(fn), hold(on), isHeld() }
 * opts: { duration (ms, mặc định 2200), kind: 'info'|'good'|'bad'|'tip', title, icon (SVG), testid }
 * setLimit(fn | null): fn() → chiều cao tối đa (px) của chồng thông báo, hoặc null/0 = không giới hạn.
 * hold(on): giữ / thôi giữ thẻ Mẹo nghề (xem trên).
 */
export function createToaster(host) {
  const box = h('div', { class: 'toast-stack', 'aria-live': 'polite', role: 'status' })
  host.appendChild(box)
  const queue = []             // [{ tip, text, opts, at }] theo thứ tự đến
  let tipShowing = false
  let limitFn = null
  let held = false
  let tipLive = null           // thẻ Mẹo nghề đang nổi: { left (ms còn lại), since, timer, finish }

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

  function build(text, opts) {
    const { kind = 'info', title = '', icon = '', testid = 'toast' } = opts
    return h('div', { class: ['toast', 'toast-' + kind], testid },
      icon ? svgBox(icon, 'toast-icon') : null,
      h('div', { class: 'toast-body' },
        title ? h('div', { class: 'toast-title' }, title) : null,
        h('div', { class: 'toast-text' }, text)))
  }

  // Chồng thông báo còn nằm trong giới hạn chiều cao?
  function fits() {
    if (!limitFn) return true
    let lim = 0
    try { lim = Number(limitFn()) || 0 } catch { lim = 0 }
    if (lim <= 0) return true
    return box.getBoundingClientRect().height <= lim + 0.5
  }
  const liveItems = () => [...box.children].filter(n => !n.classList.contains('hide'))

  function present(item, duration) {
    requestAnimationFrame(() => item.classList.add('show'))
    setTimeout(() => {
      item.classList.remove('show')
      item.classList.add('hide')
      setTimeout(() => { item.remove(); pump() }, 260)
    }, duration)
  }

  // Thẻ Mẹo nghề: đồng hồ dừng được (hold). Thời gian chỉ tính lúc thẻ thật sự nổi.
  function presentTip(item, duration) {
    requestAnimationFrame(() => item.classList.add('show'))
    const live = { left: duration, since: now(), timer: 0, finish: null }
    live.finish = () => {
      if (tipLive === live) tipLive = null
      item.classList.remove('show')
      item.classList.add('hide')
      setTimeout(() => { item.remove(); tipShowing = false; pump() }, 260)
    }
    tipLive = live
    if (!held) live.timer = setTimeout(live.finish, duration)
  }

  // Thử đặt một mục vào chồng. Không vừa (và đang có thông báo khác) → false, mục chờ tiếp.
  function place(entry) {
    const item = build(entry.text, entry.opts)
    if (entry.tip) box.insertBefore(item, box.firstChild)
    else box.appendChild(item)
    if (liveItems().length > 1 && !fits()) { item.remove(); return false }
    if (entry.tip) {
      tipShowing = true
      presentTip(item, entry.opts.duration ?? 3000)
      return true
    }
    // tối đa 2 thông báo thường cùng lúc (thẻ Mẹo nghề không tính)
    const plain = liveItems().filter(n => !n.classList.contains('toast-tip'))
    for (let i = 0; i < plain.length - MAX_TOASTS; i++) plain[i].remove()
    present(item, entry.opts.duration ?? 2200)
    return true
  }

  // Hiện các mục đang chờ theo thứ tự đến, tới khi hết chỗ. Thẻ Mẹo nghề chờ thẻ trước tắt (mỗi lần 1 thẻ) nhưng không
  // giữ chân thông báo thường đến sau.
  function pump() {
    const t = now()
    for (let i = queue.length - 1; i >= 0; i--) if (!queue[i].tip && t - queue[i].at > MAX_WAIT_MS) queue.splice(i, 1)
    for (let i = 0; i < queue.length;) {
      const e = queue[i]
      if (e.tip && (tipShowing || held)) { i++; continue }
      if (!place(e)) break
      queue.splice(i, 1)
    }
  }

  function enqueue(entry) {
    queue.push(entry)
    // giới hạn hàng chờ: thẻ Mẹo nghề tối đa MAX_TIP_QUEUE, thông báo thường tối đa MAX_PENDING (bỏ cái cũ nhất)
    for (const [isTip, max] of [[true, MAX_TIP_QUEUE], [false, MAX_PENDING]]) {
      let n = queue.filter(e => e.tip === isTip).length
      for (let i = 0; i < queue.length && n > max; i++) {
        if (queue[i].tip === isTip) { queue.splice(i, 1); i--; n-- }
      }
    }
    pump()
  }

  return {
    el: box,
    show(text, opts = {}) {
      enqueue({ tip: opts.kind === 'tip', text, opts, at: now() })
      return null
    },
    setLimit(fn) {
      limitFn = typeof fn === 'function' ? fn : null
      pump()
    },
    hold(on) {
      on = !!on
      if (on === held) return
      held = on
      const live = tipLive
      if (live && on) {
        // dừng đồng hồ: phần đã nổi được trừ đi, phần còn lại chờ thôi giữ
        clearTimeout(live.timer)
        live.timer = 0
        live.left = Math.max(0, live.left - (now() - live.since))
      } else if (live && !on) {
        live.left = Math.max(live.left, TIP_RESUME_MS)
        live.since = now()
        live.timer = setTimeout(live.finish, live.left)
      }
      if (!on) pump()
    },
    isHeld: () => held
  }
}
