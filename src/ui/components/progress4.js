// Thanh tiến trình 4 khâu của khách: Order · Thanh toán · Tính tiền · Làm đồ.
// M5 Đợt 2 (gói Q-D): 4 biểu tượng tròn (sổ order, máy tính, két, chảo — src/ui/art/scene.js) nối bằng thanh; khâu đã
// xong có dấu ✓ xanh và thanh nối tô xanh, khâu đang làm nền vàng (chấm vàng của hướng dẫn) kèm tên khâu, khâu sau mờ.
// Giữ progress-4 [data-stage, data-customer] và li.p4-step[data-step] (.done / .current) cho e2e và hướng dẫn.
import { h, svgBox } from '../dom.js'
import { SCENE_ICONS, STAGE_ICONS } from '../art/scene.js'

const FALLBACK_FLOW = ['order', 'thanh_toan', 'tinh_tien', 'lam_do']
const FALLBACK_LABELS = { order: 'Order', thanh_toan: 'Thanh toán', tinh_tien: 'Tính tiền', lam_do: 'Làm đồ' }

/** createProgress4(data) → { el, set(stage | null, name?) } ; data-stage trên el (rỗng khi không có khách). */
export function createProgress4(data) {
  const B = (data && data.BALANCE) || {}
  const flow = Array.isArray(B.stageFlow) && B.stageFlow.length ? B.stageFlow : FALLBACK_FLOW
  const labels = B.stageLabels || (data && data.STRINGS && data.STRINGS.stages) || FALLBACK_LABELS
  const who = h('span', { class: 'p4-who' })
  const dots = flow.map((id, i) => h('li', { class: 'p4-step', dataset: { step: id }, title: labels[id] || id },
    i > 0 ? h('span', { class: 'p4-link', 'aria-hidden': 'true' }) : null,
    h('span', { class: 'p4-dot' }, svgBox(SCENE_ICONS[STAGE_ICONS[id]] || '', 'p4-ico'), h('span', { class: 'p4-tick', 'aria-hidden': 'true' })),
    h('span', { class: 'p4-label' }, labels[id] || id)))
  const el = h('div', { class: 'progress4', testid: 'progress-4', dataset: { stage: '' } },
    who, h('ol', { class: 'p4-list' }, dots))
  let last = null
  return {
    el,
    set(stage, name = '') {
      const key = (stage || '') + '|' + name
      if (key === last) return
      last = key
      el.dataset.stage = stage || ''
      el.classList.toggle('empty', !stage)
      // tên khách chỉ để trong title/data (chừa chỗ cho biểu tượng); quầy trống thì làm mờ thanh
      who.textContent = ''
      el.dataset.customer = name || ''
      el.title = name ? name + ': ' + (labels[stage] || '') : 'Quầy trống'
      el.setAttribute('aria-label', el.title)
      const idx = flow.indexOf(stage)
      dots.forEach((d, i) => {
        d.classList.toggle('done', idx >= 0 && i < idx)
        d.classList.toggle('current', i === idx)
        if (i === idx) d.setAttribute('aria-current', 'step')
        else d.removeAttribute('aria-current')
      })
    }
  }
}
