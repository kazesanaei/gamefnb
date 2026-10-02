// Tiền mặt ở quầy (M5 Đợt 2): ngăn kéo két mở 7 ngăn (hình ket_tien của src/ui/art/scene.js, mỗi ngăn là một nút đặt đúng ô
// trong hình), khay inox đựng tiền thối, tờ tiền khách đưa nằm trên mặt quầy. Tờ tiền vẽ bằng billSvg (chữ "TIỀN GAME").
// Thuần ở cấp module (import trong Node được): DOM chỉ tạo khi gọi các hàm render*.
// Không có hoạt ảnh nào chạy khi dựng (vẽ lại không phát lại gì); tờ tiền bay giữa két và khay do counter-cash.js kích theo
// thao tác (nhân bản rồi bay). Mỗi chồng tiền có .cs-bill là tờ trên cùng (điểm xuất phát / đích bay).
import { h, svgBox } from '../dom.js'
import { BILLS, drawerTotal } from '../../core/money.js'
import { billSvg } from '../art.js'
import { scene, SCENE_META } from '../art/scene.js'
import { formatVND, billLabel } from '../format.js'

const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`

/** Ô của từng ngăn két (tọa độ % trong hình ket_tien) theo mệnh giá BILLS tăng dần: { [bill]: { left, top, width, height } }. */
export function drawerSlots() {
  const meta = SCENE_META.ket_tien
  const [W, H] = meta.vb
  const out = {}
  BILLS.forEach((b, i) => {
    const s = meta.slots[i]
    if (s) out[b] = { left: pct(s.x, W), top: pct(s.y, H), width: pct(s.w, W), height: pct(s.h, H) }
  })
  return out
}

/** Số tờ vẽ chồng lên nhau trong một ngăn / chồng khay (tối đa 3, tờ trên cùng là .cs-bill). */
export function stackDepth(n) {
  const k = Math.floor(Number(n) || 0)
  return k <= 0 ? 0 : Math.min(3, k)
}

// Một chồng tờ cùng mệnh giá: các tờ dưới lệch nhẹ (trang trí), tờ trên cùng .cs-bill.
function billStack(b, n, cls) {
  const depth = Math.max(1, stackDepth(n))
  const out = []
  for (let i = depth - 1; i >= 0; i--) {
    out.push(svgBox(billSvg(b), i === 0 ? `cs-bill ${cls}` : `cs-bill-under ${cls} cs-under-${i}`))
  }
  return out
}

/** Két: mỗi ngăn drawer-<mệnh giá> có huy hiệu số tờ còn lại; chạm để lấy 1 tờ vào khay. onTake(bill, nút ngăn). */
export function renderDrawer(drawer, { onTake, disabled = false } = {}) {
  const slots = drawerSlots()
  return h('div', { class: 'cs-drawer', testid: 'drawer', role: 'group', 'aria-label': 'Két tiền' },
    svgBox(scene('ket_tien'), 'cs-drawer-art'),
    BILLS.map(b => {
      const n = Math.max(0, Number(drawer && drawer[b]) || 0)
      const s = slots[b] || {}
      return h('button', {
        class: ['cs-slot', n ? '' : 'is-empty'], type: 'button', testid: 'drawer-' + b,
        dataset: { count: n, bill: b }, disabled: disabled || n <= 0,
        style: { left: s.left, top: s.top, width: s.width, height: s.height },
        'aria-label': `Lấy tờ ${formatVND(b)}, còn ${n} tờ`,
        onclick: e => onTake && onTake(b, e.currentTarget)
      },
      h('span', { class: 'cs-slot-bills' }, n ? billStack(b, n, 'cs-slot-bill') : svgBox(billSvg(b), 'cs-bill-ghost cs-slot-bill')),
      h('span', { class: 'cs-slot-count', 'aria-hidden': 'true' }, String(n)),
      h('span', { class: 'cs-slot-label', 'aria-hidden': 'true' }, billLabel(b)))
    }))
}

/** Khay tiền thối: mỗi mệnh giá một chồng tray-<mệnh giá>; chạm để trả 1 tờ về két. onReturn(bill, nút chồng).
 *  emptyText: chữ khi khay trống. */
export function renderTray(tray, { onReturn, emptyText = null } = {}) {
  const items = BILLS.filter(b => (Number(tray && tray[b]) || 0) > 0).reverse()
  const total = drawerTotal(tray || {})
  return h('div', { class: ['cs-tray', items.length ? '' : 'is-empty'], testid: 'tray', dataset: { amount: total } },
    h('div', { class: 'cs-tray-head' },
      h('span', { class: 'cs-tray-cap' }, 'Khay tiền thối'),
      h('b', { class: 'cs-tray-total', testid: 'tray-total' }, formatVND(total))),
    h('div', { class: 'cs-tray-bed' },
      items.length ? items.map(b => {
        const n = Number(tray[b]) || 0
        return h('button', {
          class: 'cs-tray-stack', type: 'button', testid: 'tray-' + b, dataset: { count: n, bill: b },
          'aria-label': `Trả lại tờ ${formatVND(b)} về két (đang có ${n} tờ)`, onclick: e => onReturn && onReturn(b, e.currentTarget)
        }, billStack(b, n, 'cs-tray-bill'), n > 1 ? h('span', { class: 'cs-stack-count' }, '×' + n) : null)
      }) : h('span', { class: 'cs-tray-empty', testid: 'tray-empty' }, emptyText || 'Chạm ngăn két để lấy tiền thối')))
}

/** Tiền khách đưa: các tờ xòe trên mặt quầy (tờ lớn nằm dưới), nhãn giấy "Khách đưa: …" (nằm đó tới khi thối xong). */
export function renderGivenCash(given) {
  const bills = (given && given.bills) || {}
  const total = (given && given.total) || drawerTotal(bills)
  const list = []
  for (const b of BILLS.slice().reverse()) {
    const n = Number(bills[b]) || 0
    for (let i = 0; i < n; i++) list.push(svgBox(billSvg(b), 'cs-bill cs-given-bill'))
  }
  return h('div', { class: 'cs-given', testid: 'given-cash', dataset: { amount: total }, 'aria-label': `Khách đưa: ${formatVND(total)}` },
    h('div', { class: 'cs-given-bills', dataset: { n: Math.min(list.length, 6) } }, list),
    h('div', { class: 'cs-given-cap' }, 'Khách đưa: ', h('b', null, formatVND(total))))
}
