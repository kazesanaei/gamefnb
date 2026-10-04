// Thông báo nổi ngắn, không chặn thao tác (pointer-events: none).
// Thẻ Mẹo nghề (kind 'tip') hiện gọn, MỖI LẦN MỘT THẺ; thẻ đến sau xếp hàng (tối đa 2 thẻ chờ).
// Giới hạn chiều cao (setLimit, màn ca bán): chồng thông báo không được che quá dải khách (thanh 4 khâu phải luôn
// thấy). Thông báo không vừa thì xếp hàng theo thứ tự đến, hiện khi thông báo trước tắt; thông báo thường chờ quá
// MAX_WAIT_MS thì bỏ (tin đã cũ, vd "Đã kẹp phiếu…" khi khách đã nhận món), thẻ Mẹo nghề không bỏ.
// Giữ thẻ Mẹo nghề (hold, 0.4.1 — hướng dẫn lần đầu đang hiện, chồng thông báo bị ẩn): thẻ đang nổi dừng đồng hồ (chưa tính
// thời gian bị ẩn), thẻ mới chờ trong hàng; thôi giữ thì thẻ hiện tiếp phần thời gian còn lại (ít nhất TIP_RESUME_MS).
// Thông báo thường không bị giữ (tin ngắn, cũ thì bỏ).
// Vừa màn (vòng sửa L0):
// - Thông báo "chỉ hiện khi vừa" (opts.fit, màn Ca bán gắn cho thẻ Mẹo nghề): không được miễn luật "đứng một mình vẫn hiện"
//   — chờ tới khi vừa giới hạn (gọi lại setLimit để xét lại hàng chờ, vd khi đổi khâu / đổi tab); trong lúc chờ không giữ chân
//   thông báo thường đến sau; bỏ giới hạn (rời màn, setLimit(null)) thì bỏ luôn các thẻ đang chờ chỗ (thẻ vẫn nằm trong Sổ tay
//   nghề), không nổi đè lên màn sau.
// - Có THÔNG BÁO THƯỜNG đang chờ chỗ: thông báo thường đang nổi rút ngắn còn BUSY_SHOW_MS kể từ lúc hiện (không ngắn hơn phần
//   đã định), để tin đến sau lên kịp, không chờ quá MAX_WAIT_MS rồi bị bỏ. Thẻ Mẹo nghề chờ chồng vơi thì KHÔNG rút ai: thông
//   báo đang nổi giữ đủ thời gian của nó, thẻ lên ngay sau (như 0.5.1 — vd báo tổng dư: "Khách thấy tổng cao quá…" nổi đủ
//   2,2 giây rồi mới tới thẻ "Báo tổng rõ ràng").
// - Chỗ co lại dưới chồng đang nổi (vd khách bước lên quầy, bong bóng hiện ngay dưới; đổi tab; bếp giữ thông báo lúc nấu tập
//   trung / ra món): thông báo thường NHƯỜNG CHỖ — tắt khi đã nổi YIELD_SHOW_MS. Xét lúc pump (có thông báo mới / tắt, hoặc
//   màn gọi lại setLimit). Thẻ Mẹo nghề đang nổi KHÔNG bị rút (vòng sửa nhỏ L0): giữ đủ thời gian như 0.5.1 (3 giây, chỉ tính
//   lúc thật sự nổi) — mốc chồng có thể co lại vì thứ không liên quan tới thẻ: bong bóng khách ẩn tạm lúc khách phản ứng (báo
//   tổng dư, đơn nhiều dòng: phiếu order hình chiếm chỗ ở khâu Thanh toán) rồi hiện lại ở khâu Tính tiền, khách bước lên quầy
//   trống… Thẻ (~58px) chỉ đè vài px mép trên bong bóng phần thời gian còn lại — chấp nhận (đặc tả vừa màn mục 4.2).
import { h, svgBox } from '../dom.js'

export const MAX_TOASTS = 2
export const MAX_TIP_QUEUE = 2
export const MAX_PENDING = 3
export const MAX_WAIT_MS = 3500
export const TIP_RESUME_MS = 1500
export const BUSY_SHOW_MS = 1500
export const YIELD_SHOW_MS = 1000

/**
 * createToaster(host) → { show(text, opts), setLimit(fn), hold(on), isHeld() }
 * opts: { duration (ms, mặc định 2200), kind: 'info'|'good'|'bad'|'tip', title, icon (SVG), testid,
 *         fit (true: chỉ hiện khi vừa giới hạn, kể cả lúc đứng một mình) }
 * setLimit(fn | null): fn() → chiều cao tối đa (px) của chồng thông báo, hoặc null/0 = không giới hạn. Gọi lại (cùng fn) để
 *   xét lại hàng chờ khi chỗ trống đổi; null bỏ các mục opts.fit đang chờ.
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
  const plainLive = new Map()  // thông báo thường đang nổi → { shown (lúc hiện), end (lúc tắt dự kiến), timer, finish }

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

  function build(text, opts) {
    const { kind = 'info', title = '', icon = '', testid = 'toast' } = opts
    return h('div', { class: ['toast', 'toast-' + kind], testid },
      icon ? svgBox(icon, 'toast-icon') : null,
      h('div', { class: 'toast-body' },
        title ? h('div', { class: 'toast-title' }, title) : null,
        h('div', { class: 'toast-text' }, text)))
  }

  // Giới hạn chiều cao hiện tại (px); 0 = không giới hạn.
  function limitNow() {
    if (!limitFn) return 0
    let lim = 0
    try { lim = Number(limitFn()) || 0 } catch { lim = 0 }
    return lim > 0 ? lim : 0
  }
  // Chồng thông báo còn nằm trong giới hạn chiều cao?
  function fits() {
    const lim = limitNow()
    if (lim <= 0) return true
    return box.getBoundingClientRect().height <= lim + 0.5
  }
  const liveItems = () => [...box.children].filter(n => !n.classList.contains('hide'))

  function present(item, duration) {
    requestAnimationFrame(() => item.classList.add('show'))
    const t = now()
    const live = { shown: t, end: t + duration, timer: 0, finish: null }
    live.finish = () => {
      plainLive.delete(item)
      item.classList.remove('show')
      item.classList.add('hide')
      setTimeout(() => { item.remove(); pump() }, 260)
    }
    live.timer = setTimeout(live.finish, duration)
    plainLive.set(item, live)
  }

  // Rút ngắn các thông báo thường đang nổi: mỗi cái tắt lúc (lúc hiện + minShow), không muộn hơn lúc đã định.
  function hurry(minShow = BUSY_SHOW_MS) {
    const t = now()
    for (const [item, live] of plainLive) {
      if (!item.isConnected) { clearTimeout(live.timer); plainLive.delete(item); continue }
      const end = Math.max(t, live.shown + minShow)
      if (end >= live.end - 20) continue
      clearTimeout(live.timer)
      live.end = end
      live.timer = setTimeout(live.finish, end - t)
    }
  }

  // Chồng đang nổi cao hơn giới hạn hiện tại (chỗ vừa co lại): thông báo thường nhường chỗ; thẻ Mẹo nghề đang nổi giữ đủ
  // thời gian (xem đầu tệp).
  function yieldRoom() {
    if (!limitFn || !box.firstElementChild || fits()) return
    hurry(YIELD_SHOW_MS)
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

  // Thử đặt một mục vào chồng → 'ok'; không vừa (và trong chồng còn thông báo khác — kể cả thông báo đang mờ dần, chưa gỡ —
  // hoặc mục chỉ hiện khi vừa) → mục chờ tiếp: 'crowded' nếu riêng mục vẫn vừa giới hạn (chỉ chờ chồng vơi), 'nofit' nếu
  // đứng một mình cũng không vừa.
  function place(entry) {
    const item = build(entry.text, entry.opts)
    if (entry.tip) box.insertBefore(item, box.firstChild)
    else box.appendChild(item)
    if ((box.children.length > 1 || entry.opts.fit) && !fits()) {
      const alone = box.children.length > 1 && item.getBoundingClientRect().height <= limitNow() + 0.5
      item.remove()
      return alone ? 'crowded' : 'nofit'
    }
    if (entry.tip) {
      tipShowing = true
      presentTip(item, entry.opts.duration ?? 3000)
      return 'ok'
    }
    // tối đa 2 thông báo thường cùng lúc (thẻ Mẹo nghề không tính)
    const plain = liveItems().filter(n => !n.classList.contains('toast-tip'))
    for (let i = 0; i < plain.length - MAX_TOASTS; i++) {
      const live = plainLive.get(plain[i])
      if (live) { clearTimeout(live.timer); plainLive.delete(plain[i]) }
      plain[i].remove()
    }
    present(item, entry.opts.duration ?? 2200)
    return 'ok'
  }

  // Hiện các mục đang chờ theo thứ tự đến, tới khi hết chỗ. Thẻ Mẹo nghề chờ thẻ trước tắt (mỗi lần 1 thẻ). Thẻ chờ chỗ
  // (opts.fit): đứng một mình cũng không vừa → không giữ chân thông báo thường đến sau; vừa nhưng chồng đang chật → giữ
  // lượt (thông báo đến sau chờ sau thẻ) để thẻ không bị tin mới chen mãi. Còn thông báo thường chờ chỗ → rút ngắn thông báo
  // thường đang nổi (chỉ thẻ chờ thì không — xem đầu tệp).
  function pump() {
    const t = now()
    for (let i = queue.length - 1; i >= 0; i--) if (!queue[i].tip && t - queue[i].at > MAX_WAIT_MS) queue.splice(i, 1)
    for (let i = 0; i < queue.length;) {
      const e = queue[i]
      if (e.tip && (tipShowing || held)) { i++; continue }
      const r = place(e)
      if (r !== 'ok') {
        if (e.tip && r === 'nofit') { i++; continue }
        break
      }
      queue.splice(i, 1)
    }
    if (queue.some(e => !e.tip)) hurry()
    yieldRoom()
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
      // rời màn có giới hạn: mục "chỉ hiện khi vừa" còn chờ là tin của màn đó — bỏ, không nổi đè lên màn sau
      if (!limitFn) for (let i = queue.length - 1; i >= 0; i--) if (queue[i].opts.fit) queue.splice(i, 1)
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
