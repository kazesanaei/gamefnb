// Dây phiếu bếp (luôn hiện, kể cả chế độ tập trung khi nấu).
// M5 Đợt 2 (gói Q-D): phiếu giấy nhỏ kẹp kẹp gỗ trên sợi dây: hình món to (huy hiệu ×n), số phiếu, tên món (+ ghi chú đỏ),
// dải màu chờ ở đáy phiếu co dần theo ngân sách chờ của khách và đổi màu xanh → vàng → cam → đỏ (đỏ thì nhấp nháy 1 lần/giây,
// giảm chuyển động thì đứng yên). Viền phiếu cũng ngả vàng / đỏ theo data-wait. Phiếu mới lên dây đung đưa MỘT lần (theo id).
// Dây cao cố định (không đẩy panel Quầy / Bếp lên xuống khi phiếu nhiều dòng). Chạm phiếu là mở nó trong Bếp.
// Giữ: ticket-rail, rail-ticket-<id> [data-status, data-wait] và chữ tên món trong phiếu (e2e đọc textContent).
import { h, svgBox } from '../dom.js'
import { upper } from '../format.js'
import { icon } from '../art.js'
import { isReduced } from '../motion.js'

const STATUS_LABELS = { cho: 'Chờ làm', dang_lam: 'Đang làm', xong: 'Xong' }

/** Mức màu chờ (viền phiếu, đồng bộ phiếu trong Bếp): xanh < 50%, vàng tới 80%, đỏ quá 80% ngân sách chờ. */
export function waitLevel(ratio) {
  if (ratio > 0.8) return 'red'
  if (ratio >= 0.5) return 'yellow'
  return 'green'
}

/** Màu dải chờ ở đáy phiếu (4 bậc): xanh → vàng → cam → đỏ (đỏ trùng mức đỏ của waitLevel). */
export function waitBand(ratio) {
  if (ratio > 0.8) return 'red'
  if (ratio >= 0.65) return 'orange'
  if (ratio >= 0.5) return 'yellow'
  return 'green'
}

function waitRatioOf(sh, ticket) {
  const c = sh.customers[ticket.customerId]
  if (!c || !c.waitBudget) return 0
  const start = ticket.remake ? ticket.createdAt : (c.waitStart ?? ticket.createdAt)
  return Math.max(0, (sh.t - start) / c.waitBudget)
}

/** createTicketRail(app, { onTap }) → { el, update() } */
export function createTicketRail(app, { onTap } = {}) {
  const list = h('div', { class: 'rail-list' })
  const countN = h('b', { class: 'rail-count-n' })
  const count = h('span', { class: 'rail-count' }, h('span', { class: 'rail-count-cap' }, 'Phiếu '), countN)
  const el = h('section', { class: 'ticket-rail', testid: 'ticket-rail', 'aria-label': 'Dây phiếu bếp' },
    h('div', { class: 'rail-wire', 'aria-hidden': 'true' }), count, list)
  let sig = ''
  const nodes = new Map()          // id phiếu → { node, fill, band, wait, k }
  const seen = new Set()            // id phiếu đã từng lên dây (đung đưa một lần)
  let first = true

  function render(sh, R) {
    list.textContent = ''
    nodes.clear()
    if (!sh.tickets.length) {
      list.appendChild(h('div', { class: 'rail-empty' }, 'Chưa có phiếu nào'))
      return
    }
    const reduced = isReduced(app)
    for (const t of sh.tickets) {
      const multi = t.lines.length > 1
      const noteOf = l => {
        const r = R[l.recipeId]
        return (l.notes || []).map(id => {
          const n = r && (r.notes || []).find(x => x.id === id)
          return n ? upper(n.label) : ''
        }).filter(Boolean)
      }
      // hình món: hình món đầu (huy hiệu ×n), phiếu nhiều dòng thêm huy hiệu "+n" (đủ món ở dòng chữ, title và trong Bếp)
      const l0 = t.lines[0]
      const r0 = l0 && R[l0.recipeId]
      const art = h('span', { class: 'rail-art', 'aria-hidden': 'true' },
        l0 ? h('span', { class: ['rail-dish', t.done && t.done[0] ? 'done' : ''] },
          svgBox(icon(r0 ? r0.icon : l0.recipeId), 'rail-icon'),
          l0.qty > 1 ? h('span', { class: 'rail-qty' }, '×' + l0.qty) : null) : null,
        multi ? h('span', { class: 'rail-more' }, '+' + (t.lines.length - 1)) : null)
      // chữ: tên món (số phần > 1 thì "2 × Tên món"; hình món có huy hiệu ×n) và ghi chú đỏ — phiếu nhiều dòng nối tiếp trên
      // một dòng, cắt "…" (đủ chữ ở title và trong Bếp)
      const lines = t.lines.map((l, i) => {
        const r = R[l.recipeId]
        const notes = noteOf(l)
        const name = (l.qty > 1 ? `${l.qty} × ` : '') + (r ? r.name : l.recipeId)
        return h('span', { class: ['rail-line', multi ? 'is-multi' : '', t.done && t.done[i] ? 'done' : ''] },
          h('span', { class: 'rail-name' }, (i > 0 ? ', ' : '') + name),
          notes.length ? h('span', { class: 'rail-note' }, ' · ' + notes.join(' · ')) : null)
      })
      const title = t.lines.map(l => {
        const r = R[l.recipeId]
        const notes = noteOf(l)
        const name = `${l.qty} × ${r ? r.name : l.recipeId}`
        return notes.length ? `${name}: ${notes.join(' · ')}` : name
      }).join('\n')
      const status = t.remake ? 'Làm lại' : (STATUS_LABELS[t.status] || '')
      const fill = h('i', { class: 'rail-wait-fill' })
      const isNew = !first && !seen.has(t.id) && !reduced
      seen.add(t.id)
      const node = h('button', {
        class: ['rail-ticket', t.remake ? 'remake' : '', isNew ? 'is-new' : ''], type: 'button', testid: 'rail-ticket-' + t.id,
        title: `Phiếu ${t.no} · ${status}\n${title}`,
        dataset: { status: t.status }, onclick: () => onTap && onTap(t.id)
      },
      h('span', { class: 'rail-clip', 'aria-hidden': 'true' }),
      art,
      h('span', { class: 'rail-body' },
        h('span', { class: 'rail-head' }, h('b', null, t.no),
          t.remake ? h('span', { class: 'rail-tag' }, 'Làm lại') : null,
          h('span', { class: 'rail-status' }, status)),
        h('span', { class: 'rail-text' }, lines)),
      t.status === 'xong' ? h('span', { class: 'rail-done', 'aria-hidden': 'true' }, '✓') : null,
      h('span', { class: 'rail-wait', 'aria-hidden': 'true' }, fill))
      if (isNew) node.addEventListener('animationend', () => node.classList.remove('is-new'), { once: true })
      nodes.set(t.id, { node, fill, band: '', k: -1 })
      list.appendChild(node)
    }
  }

  function update() {
    const s = app.state
    const sh = s && s.shift
    if (!sh) return
    const R = app.data.RECIPES
    const max = (app.data.BALANCE && app.data.BALANCE.ticketRailMax) || 3
    // gồm cả các dòng phiếu: tình huống "khách đổi ý" (M3) sửa món trên phiếu đã kẹp mà không đổi trạng thái
    const key = JSON.stringify(sh.tickets.map(t => [t.id, t.status, t.done && t.done.map(Boolean),
      t.lines.map(l => [l.recipeId, l.qty, (l.notes || []).join(',')])]))
    if (key !== sig) {
      sig = key
      render(sh, R)
    }
    if (first) {
      first = false
      for (const t of sh.tickets) seen.add(t.id)
    }
    const n = String(sh.tickets.length) + '/' + max
    if (countN.textContent !== n) countN.textContent = n
    count.classList.toggle('full', sh.tickets.length >= max)
    for (const t of sh.tickets) {
      const rec = nodes.get(t.id)
      if (!rec) continue
      const done = t.status === 'xong'
      const ratio = done ? 0 : waitRatioOf(sh, t)
      const lv = done ? 'green' : waitLevel(ratio)
      const band = done ? 'green' : waitBand(ratio)
      if (rec.node.dataset.wait !== lv) rec.node.dataset.wait = lv
      if (rec.band !== band) { rec.band = band; rec.node.dataset.band = band }
      // phần ngân sách chờ còn lại (dải co từ phải sang trái); làm tròn 1% để không ghi style mỗi khung hình
      const k = done ? 100 : Math.round(Math.max(0, Math.min(1, 1 - ratio)) * 100)
      if (k !== rec.k) { rec.k = k; rec.fill.style.transform = `scaleX(${(k / 100).toFixed(2)})` }
    }
  }
  return { el, update }
}
