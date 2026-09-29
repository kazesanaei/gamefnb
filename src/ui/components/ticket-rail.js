// Dây phiếu bếp (luôn hiện). Viền phiếu đổi màu theo phần trăm ngân sách chờ của khách.
import { h } from '../dom.js'
import { upper } from '../format.js'

const STATUS_LABELS = { cho: 'Chờ làm', dang_lam: 'Đang làm', xong: 'Xong' }

export function waitLevel(ratio) {
  if (ratio > 0.8) return 'red'
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
  const count = h('span', { class: 'rail-count' })
  const el = h('section', { class: 'ticket-rail', testid: 'ticket-rail', 'aria-label': 'Dây phiếu bếp' },
    h('div', { class: 'rail-wire' }), count, list)
  let sig = ''
  const nodes = new Map()

  function render(sh, R, max) {
    list.textContent = ''
    nodes.clear()
    if (!sh.tickets.length) {
      list.appendChild(h('div', { class: 'rail-empty' }, 'Chưa có phiếu nào'))
      return
    }
    for (const t of sh.tickets) {
      const lines = t.lines.map((l, i) => {
        const r = R[l.recipeId]
        const notes = (l.notes || []).map(id => {
          const n = r && (r.notes || []).find(x => x.id === id)
          return n ? upper(n.label) : ''
        }).filter(Boolean)
        return h('div', { class: ['rail-line', t.done && t.done[i] ? 'done' : ''] },
          h('span', null, `${l.qty} × ${r ? r.name : l.recipeId}`),
          notes.length ? h('span', { class: 'rail-note' }, notes.join(' · ')) : null)
      })
      const node = h('button', {
        class: ['rail-ticket', t.remake ? 'remake' : ''], type: 'button', testid: 'rail-ticket-' + t.id,
        dataset: { status: t.status }, onclick: () => onTap && onTap(t.id)
      },
      h('div', { class: 'rail-head' }, h('b', null, t.no), h('span', { class: 'rail-status' }, t.remake ? 'Làm lại' : (STATUS_LABELS[t.status] || ''))),
      lines)
      nodes.set(t.id, node)
      list.appendChild(node)
    }
  }

  function update() {
    const s = app.state
    const sh = s && s.shift
    if (!sh) return
    const R = app.data.RECIPES
    const max = (app.data.BALANCE && app.data.BALANCE.ticketRailMax) || 3
    const key = JSON.stringify(sh.tickets.map(t => [t.id, t.status, t.done && t.done.map(Boolean)]))
    if (key !== sig) {
      sig = key
      render(sh, R, max)
    }
    count.textContent = `Phiếu ${sh.tickets.length}/${max}`
    count.classList.toggle('full', sh.tickets.length >= max)
    for (const t of sh.tickets) {
      const n = nodes.get(t.id)
      if (!n) continue
      const lv = t.status === 'xong' ? 'green' : waitLevel(waitRatioOf(sh, t))
      if (n.dataset.wait !== lv) n.dataset.wait = lv
    }
  }
  return { el, update }
}
