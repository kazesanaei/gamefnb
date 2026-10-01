// Tiện ích DOM tối giản: h() tạo phần tử, clear(), $().

// Thuộc tính gán thẳng vào property (không qua setAttribute).
const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden', 'tabIndex', 'type', 'placeholder', 'maxLength', 'autocomplete', 'inputMode'])

function append(el, child) {
  if (child === null || child === undefined || child === false || child === true) return
  if (Array.isArray(child)) { for (const c of child) append(el, c); return }
  if (child instanceof Node) { el.appendChild(child); return }
  el.appendChild(document.createTextNode(String(child)))
}

/**
 * h('button', { class: 'btn', dataset: { testid: 'x' }, onclick: fn }, 'Nhãn')
 * props: class, style (chuỗi hoặc object), dataset, on* (sự kiện), html (SVG nội bộ tin cậy), testid, còn lại là thuộc tính.
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag)
  if (props) {
    for (const key of Object.keys(props)) {
      const v = props[key]
      if (v === undefined || v === null || v === false) continue
      if (key === 'class' || key === 'className') el.className = Array.isArray(v) ? v.filter(Boolean).join(' ') : v
      else if (key === 'style') {
        if (typeof v === 'string') el.style.cssText = v
        else for (const k of Object.keys(v)) {
          if (k.startsWith('--')) el.style.setProperty(k, v[k])
          else el.style[k] = v[k]
        }
      } else if (key === 'dataset') {
        for (const k of Object.keys(v)) if (v[k] !== undefined && v[k] !== null) el.dataset[k] = String(v[k])
      } else if (key === 'testid') el.dataset.testid = v
      else if (key === 'html') el.innerHTML = v
      else if (key.startsWith('on') && typeof v === 'function') el.addEventListener(key.slice(2).toLowerCase(), v)
      else if (PROPS.has(key)) el[key] = v
      else el.setAttribute(key, v === true ? '' : String(v))
    }
  }
  append(el, children)
  return el
}

/** Phần tử bọc một chuỗi SVG nội bộ (từ art.js). */
export function svgBox(svg, cls = 'svg-box', props = {}) {
  return h('span', { class: cls, 'aria-hidden': 'true', ...props, html: svg })
}

export function clear(el) {
  if (!el) return el
  while (el.firstChild) el.removeChild(el.firstChild)
  return el
}

export function $(sel, root = document) {
  return root.querySelector(sel)
}

export function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel))
}

/** Thay toàn bộ nội dung của el. */
export function replace(el, ...children) {
  clear(el)
  append(el, children)
  return el
}

/**
 * Chỗ gắn một lớp phủ (bảng trượt, hộp tự vẽ) ra NGOÀI vùng cuộn của màn, thường là lớp nổi gốc của app (app.overlay
 * trong #app): iOS Safari cắt mọi phần tử con của vùng cuộn — kể cả position: fixed — theo khung vùng cuộn, nên lớp phủ
 * nằm trong panel cuộn bị thanh tab che mất phần dưới. → { set(node | null) → node, node() → node đang gắn }.
 * set(node) gỡ lớp cũ (nếu khác) rồi gắn node mới vào host; set(null) chỉ gỡ.
 */
export function createPortal(host) {
  let current = null
  function set(node) {
    if (node === current) return current
    if (current) current.remove()
    current = node || null
    if (current && host) host.appendChild(current)
    return current
  }
  return { set, node: () => current }
}

/** Gắn tạm class (vd hiệu ứng rung) rồi gỡ. */
export function flash(el, cls, ms = 400) {
  if (!el) return
  el.classList.remove(cls)
  void el.offsetWidth
  el.classList.add(cls)
  setTimeout(() => el.classList.remove(cls), ms)
}
