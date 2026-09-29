// Thanh tiến trình 4 khâu của khách: Order · Thanh toán · Tính tiền · Làm đồ.
import { h } from '../dom.js'

const FALLBACK_FLOW = ['order', 'thanh_toan', 'tinh_tien', 'lam_do']
const FALLBACK_LABELS = { order: 'Order', thanh_toan: 'Thanh toán', tinh_tien: 'Tính tiền', lam_do: 'Làm đồ' }

/** createProgress4(data) → { el, set(stage | null, name?) } ; data-stage trên el (rỗng khi không có khách). */
export function createProgress4(data) {
  const B = (data && data.BALANCE) || {}
  const flow = Array.isArray(B.stageFlow) && B.stageFlow.length ? B.stageFlow : FALLBACK_FLOW
  const labels = B.stageLabels || (data && data.STRINGS && data.STRINGS.stages) || FALLBACK_LABELS
  const who = h('span', { class: 'p4-who' })
  const dots = flow.map((id, i) => h('li', { class: 'p4-step', dataset: { step: id } },
    h('span', { class: 'p4-dot' }, String(i + 1)),
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
      // tên khách chỉ để trong title/data (chừa chỗ cho đủ 4 nhãn khâu); quầy trống thì làm mờ thanh
      who.textContent = ''
      el.dataset.customer = name || ''
      el.title = name ? name + ': ' + (labels[stage] || '') : 'Quầy trống'
      el.setAttribute('aria-label', el.title)
      const idx = flow.indexOf(stage)
      dots.forEach((d, i) => {
        d.classList.toggle('done', idx >= 0 && i < idx)
        d.classList.toggle('current', i === idx)
      })
    }
  }
}
