// Bảng thực đơn kiểu game bán hàng (M5, màn gọi món): bảng gỗ có biển phấn "Thực đơn", mỗi món một thẻ giấy với
// hình món to ở giữa đĩa, tên chữ Baloo, giá trên tem tròn. Món hiếm: viền vàng lấp lánh chậm + nhãn "★ còn n".
// Hết hàng: dán băng chéo "HẾT" (lớp is-out, aria-disabled; chạm vẫn báo cho người chơi biết).
// Giữ testid của quầy cũ: menu-item-<id> (data-left với món hiếm), rare-left-<id> (chữ đúng "★ còn n").
// Cấu trúc ul.co-menu-grid > li.co-menu-cell > button.co-menu-card: thẻ món là NÚT thật với trình đọc màn hình.
// Hoạt ảnh chỉ chạy theo SỰ KIỆN (chạm): update() với cùng dữ liệu không dựng lại thẻ, không phát lại gì.
// Thuần ở cấp module (import trong Node được); DOM chỉ tạo khi gọi createMenuBoard.
import { h } from '../dom.js'
import { artV2 } from '../art/v2.js'
import { formatVND, formatK } from '../format.js'
import { isReduced } from '../motion.js'

// Màu lòng đỏ theo nguyên liệu hiếm của món (hình món dùng chung khuôn món nền, chỉ đổi biến --yolk trên khung).
export const YOLK_BY_RARE = Object.freeze({ trung_ga_ta: '#e8730c' })

/** Chuỗi SVG hình món (ưu tiên bộ hình M5, thiếu thì icon cũ; món hiếm dùng icon món nền). */
export function dishSvg(recipe) {
  if (!recipe) return artV2('fallback')
  return artV2(recipe.icon || recipe.id)
}

/** Biến CSS riêng của hình món (vd lòng đỏ trứng gà ta đậm hơn) hoặc null. */
export function dishStyle(recipe) {
  const rare = recipe && recipe.rare
  if (!rare) return null
  for (const ing of Object.keys(rare)) if (YOLK_BY_RARE[ing]) return { '--yolk': YOLK_BY_RARE[ing] }
  return null
}

/** Phần tử hình món: <span class="co-dish">SVG</span> (aria-hidden, chữ đi kèm ở chỗ khác). */
export function dishArt(recipe, cls = '') {
  return h('span', { class: ['co-dish', cls], 'aria-hidden': 'true', style: dishStyle(recipe) || undefined, html: dishSvg(recipe) })
}

/** Giá gọn trên tem: 20000 → { big: '20', small: 'k' }; dưới 1.000đ → { big: '500', small: 'đ' }. */
export function priceParts(price) {
  const s = formatK(price)
  const m = /^(-?[\d,]+)(.*)$/.exec(s)
  return m ? { big: m[1], small: m[2] } : { big: s, small: '' }
}

/**
 * Mô hình thuần của bảng: [{ id, name, price, priceText, rare, left, out, sig }].
 * ids: thứ tự món; left: { id: số phần còn } hoặc hàm (id) → số (chỉ món hiếm dùng; thiếu = coi như còn).
 */
export function menuItems(recipes, ids, left = null) {
  const R = recipes || {}
  const leftOf = typeof left === 'function' ? left : id => (left && left[id] !== undefined ? left[id] : null)
  const out = []
  for (const id of ids || []) {
    const r = R[id]
    if (!r) continue
    const rare = r.source === 'hiem'
    let n = rare ? leftOf(id) : null
    if (rare && (n === null || n === undefined || !Number.isFinite(Number(n)))) n = null
    const num = n === null ? null : Math.max(0, Math.floor(Number(n)))
    const item = {
      id, name: r.name, price: r.price, priceText: formatVND(r.price),
      rare, left: num, out: rare && num !== null && num <= 0
    }
    item.sig = JSON.stringify([id, r.name, r.price, rare, num])
    out.push(item)
  }
  return out
}

/**
 * createMenuBoard(data, opts) → { el, update(data), destroy(), itemEl(id), artEl(id) }
 * data: { recipes, menu: [id], left: { id: n } | (id) → n, title? } hoặc { recipes, items } (đã tính bằng menuItems).
 * opts: {
 *   onPick(id, { el, art, item }),   // chạm món còn hàng (sau nảy squash): bên gọi mở bảng số lượng / ghi chú
 *   onOut(id, { el, item }),         // chạm món hết hàng (thẻ rung nhẹ)
 *   vfx, sound, reduced (hàm | bool; mặc định isReduced()), title ('Thực đơn')
 * }
 */
export function createMenuBoard(data = {}, opts = {}) {
  const { onPick = null, onOut = null, vfx = null } = opts
  const sound = typeof opts.sound === 'function' ? opts.sound : () => {}
  const reduced = () => (typeof opts.reduced === 'function' ? !!opts.reduced() : opts.reduced === undefined || opts.reduced === null ? isReduced() : !!opts.reduced)
  // danh sách thật (ul > li > button): thẻ món vẫn là NÚT với trình đọc màn hình; role="list" giữ ngữ nghĩa khi bỏ dấu đầu dòng
  const grid = h('ul', { class: 'co-menu-grid', role: 'list' })
  const el = h('section', { class: 'co-menu g-wood', 'aria-label': opts.title || 'Thực đơn' },
    h('div', { class: 'co-menu-sign', 'aria-hidden': 'true' }, h('span', null, opts.title || 'Thực đơn')),
    grid)
  const nodes = new Map()   // id → { sig, cell (li), el (nút), art, item }
  let destroyed = false
  let recipes = {}

  function itemsOf(d) {
    recipes = (d && d.recipes) || recipes || {}
    if (d && Array.isArray(d.items)) return d.items
    return menuItems(recipes, (d && d.menu) || [], d && d.left)
  }

  function card(item) {
    const r = recipes[item.id]
    const art = dishArt(r, 'co-menu-dish')
    const p = priceParts(item.price)
    const label = `${item.name}, ${item.priceText}` + (item.rare ? (item.out ? ', hết hàng' : item.left !== null ? `, còn ${item.left} phần` : '') : '')
    const node = h('button', {
      class: ['co-menu-card', item.rare ? 'is-rare' : '', item.out ? 'is-out' : ''],
      type: 'button', testid: 'menu-item-' + item.id,
      dataset: item.rare && item.left !== null ? { left: String(item.left) } : undefined,
      'aria-label': label,
      'aria-disabled': item.out ? 'true' : undefined
    },
    h('span', { class: 'co-menu-plate', 'aria-hidden': 'true' }, art),
    h('span', { class: 'co-menu-name' }, item.name),
    h('span', { class: 'co-price', 'aria-hidden': 'true' }, h('b', null, p.big), p.small ? h('small', null, p.small) : null),
    item.rare && item.left !== null ? h('span', { class: 'co-menu-left', testid: 'rare-left-' + item.id }, `★ còn ${item.left}`) : null,
    item.rare ? h('span', { class: 'co-menu-glint', 'aria-hidden': 'true' }) : null,
    item.rare ? h('span', { class: 'co-twinkle co-twinkle--a', 'aria-hidden': 'true' }) : null,
    item.rare ? h('span', { class: 'co-twinkle co-twinkle--b', 'aria-hidden': 'true' }) : null,
    item.out ? h('span', { class: 'co-menu-tape', 'aria-hidden': 'true' }, h('span', null, 'HẾT')) : null)
    node.addEventListener('click', () => tap(item.id))
    return { cell: h('li', { class: 'co-menu-cell' }, node), node, art }
  }

  function tap(id) {
    if (destroyed) return
    const rec = nodes.get(id)
    if (!rec) return
    if (rec.item.out) {
      sound('error')
      if (vfx) vfx.shake(rec.el, 1)   // giảm chuyển động: vfx tự đổi thành viền đỏ tĩnh, không rung
      if (onOut) onOut(id, { el: rec.el, item: rec.item })
      return
    }
    sound('click')
    // nảy món (squash ở đáy đĩa) — gọi trên hình món, không gọi trên phần tử đang có hoạt ảnh CSS lặp
    if (vfx && !reduced()) vfx.squash(rec.art)
    if (onPick) onPick(id, { el: rec.el, art: rec.art, item: rec.item })
  }

  function update(d = {}) {
    if (destroyed) return
    const items = itemsOf(d)
    const seen = new Set()
    let prev = null
    for (const item of items) {
      seen.add(item.id)
      let rec = nodes.get(item.id)
      if (!rec || rec.sig !== item.sig) {
        const { cell, node, art } = card(item)
        if (rec) rec.cell.replaceWith(cell)
        rec = { sig: item.sig, cell, el: node, art, item }
        nodes.set(item.id, rec)
      } else {
        rec.item = item
      }
      // giữ đúng thứ tự mà không gỡ thẻ đang đứng yên (tránh mất trạng thái nhấn / cuộn)
      const want = prev ? prev.nextSibling : grid.firstChild
      if (want !== rec.cell) grid.insertBefore(rec.cell, want)
      prev = rec.cell
    }
    for (const [id, rec] of [...nodes]) {
      if (!seen.has(id)) { rec.cell.remove(); nodes.delete(id) }
    }
  }

  update(data)

  return {
    el,
    update,
    itemEl: id => (nodes.get(id) ? nodes.get(id).el : null),
    artEl: id => (nodes.get(id) ? nodes.get(id).art : null),
    destroy() {
      destroyed = true
      nodes.clear()
      el.remove()
    }
  }
}
