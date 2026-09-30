// Két 7 ngăn, khay tiền thối và xấp tiền khách đưa (vẽ bằng billSvg).
import { h, svgBox } from '../dom.js'
import { BILLS, drawerTotal } from '../../core/money.js'
import { billSvg } from '../art.js'
import { formatVND, billLabel } from '../format.js'

/** Két: mỗi ngăn drawer-<mệnh giá> có huy hiệu số tờ còn lại; chạm để lấy 1 tờ vào khay. */
export function renderDrawer(drawer, { onTake, disabled = false } = {}) {
  return h('div', { class: 'drawer', testid: 'drawer', role: 'group', 'aria-label': 'Két tiền' },
    BILLS.map(b => {
      const n = Math.max(0, Number(drawer && drawer[b]) || 0)
      return h('button', {
        class: ['drawer-slot', n ? '' : 'empty'], type: 'button', testid: 'drawer-' + b,
        dataset: { count: n, bill: b }, disabled: disabled || n <= 0,
        'aria-label': `Lấy tờ ${formatVND(b)}, còn ${n} tờ`,
        onclick: () => onTake && onTake(b)
      },
      svgBox(billSvg(b), 'bill-img'),
      h('span', { class: 'slot-count' }, String(n)),
      h('span', { class: 'slot-label' }, billLabel(b)))
    }))
}

/** Khay tiền thối: mỗi mệnh giá một chồng tray-<mệnh giá>; chạm để trả 1 tờ về két. emptyText: chữ khi khay trống. */
export function renderTray(tray, { onReturn, emptyText = null } = {}) {
  const items = BILLS.filter(b => (Number(tray && tray[b]) || 0) > 0)
  const total = drawerTotal(tray || {})
  return h('div', { class: 'tray', testid: 'tray', dataset: { amount: total } },
    h('div', { class: 'tray-head' }, h('span', null, 'Khay tiền thối'), h('b', { testid: 'tray-total' }, formatVND(total))),
    h('div', { class: 'tray-bills' },
      items.length ? items.map(b => {
        const n = Number(tray[b]) || 0
        return h('button', {
          class: 'tray-stack fly-in', type: 'button', testid: 'tray-' + b, dataset: { count: n, bill: b },
          'aria-label': `Trả lại tờ ${formatVND(b)} về két`, onclick: () => onReturn && onReturn(b)
        }, svgBox(billSvg(b), 'bill-img'), n > 1 ? h('span', { class: 'stack-count' }, '×' + n) : null)
      }) : h('span', { class: 'tray-empty', testid: 'tray-empty' }, emptyText || 'Chạm ngăn két để lấy tiền thối')))
}

/** Tiền khách đưa (nằm trên nắp két tới khi thối xong). */
export function renderGivenCash(given) {
  const bills = (given && given.bills) || {}
  const total = (given && given.total) || drawerTotal(bills)
  const list = []
  for (const b of BILLS.slice().reverse()) {
    const n = Number(bills[b]) || 0
    for (let i = 0; i < n; i++) list.push(svgBox(billSvg(b), 'bill-img given-bill'))
  }
  return h('div', { class: 'given-cash', testid: 'given-cash', dataset: { amount: total } },
    h('div', { class: 'given-bills' }, list),
    h('div', { class: 'given-caption' }, 'Khách đưa: ', h('b', null, formatVND(total))))
}
