// Phần dựng giao diện của hộp tình huống trong ca và hộp khách phàn nàn (cả hai mở bằng app.modal ở service.js).
// Chỉ dựng DOM, không gọi lõi: service.js giữ luồng (khi nào mở, resolveIncident / resolveComplaint, âm, lưu).
// Tách từ service.js (M5 Đợt 2, bước 0): chỉ chuyển chỗ, không đổi hành vi. Giữ: .incident[data-incident],
// .incident-choice (data-safe, data-choice), incident-choice-<id>, incident-text, incident-hint-<id>, incident-result
// (data-choice), incident-effects > .incident-fx[data-fx], incident-tip, incident-ok; complaint-apology-<i>,
// complaint-remake, complaint-refund, complaint-remake-blocked.
// Import trong Node được: không chạm DOM ở cấp module.
import { h, svgBox } from '../dom.js'
import { face, billSvg, DI_SAU } from '../art.js'
import { formatVND } from '../format.js'

// Hình minh họa đầu hộp tình huống: tờ tiền, mặt theo kiểu khách khai báo, mặt khách liên quan / khách quen, hoặc Dì Sáu.
export function incidentArt(app, view) {
  const sh = app.state.shift
  if (view.id === 'khach_mo_hang') return svgBox(billSvg((view.detail && view.detail.bill) || 500000), 'incident-art is-bill')
  // M4: tình huống chạy theo dữ liệu khai báo hình minh họa (tờ tiền, hoặc khuôn mặt theo kiểu khách)
  if (view.art && view.art.bill) return svgBox(billSvg(view.art.bill), 'incident-art is-bill')
  if (view.art && view.art.persona) return svgBox(face(view.art.persona, 'binh_thuong', view.art.gender || null), 'incident-art')
  const c = view.detail && view.detail.customerId && sh && sh.customers[view.detail.customerId]
  if (c) return svgBox(face(c.persona, 'binh_thuong', c.gender), 'incident-art')
  const rg = view.detail && view.detail.regularId && app.data.REGULARS && app.data.REGULARS[view.detail.regularId]
  if (rg) return svgBox(face(rg.persona, 'vui', rg.gender), 'incident-art')
  return svgBox(DI_SAU.lo, 'incident-art')
}

// Nhãn kết quả của lựa chọn (.incident-fx[data-fx]).
// M4: thêm nhãn tiền thưởng, tiền mất, tiền chi (sổ sự kiện), phần Dì Sáu đỡ giùm, hàng hiếm, mảnh công thức, bếp chậm
export function effectChips(eff) {
  const out = []
  if (eff.money > 0) out.push(['good', '+' + formatVND(eff.money) + ' tiền bán', 'money'])
  if (eff.gain > 0) out.push(['good', '+' + formatVND(eff.gain) + ' tiền thưởng', 'gain'])
  if (eff.capped > 0) out.push(['info', `Hôm nay đủ mức thưởng sự kiện, ${formatVND(eff.capped)} không cộng`, 'capped'])
  if (eff.cost > 0) out.push(['bad', '−' + formatVND(eff.cost) + ' giá vốn', 'cost'])
  if (eff.fine > 0) out.push(['bad', '−' + formatVND(eff.fine) + ' mất tiền', 'fine'])
  if (eff.spend > 0) out.push(['bad', '−' + formatVND(eff.spend) + ' chi mua', 'spend'])
  if (eff.spared > 0) out.push(['info', `Dì Sáu đỡ giùm ${formatVND(eff.spared)}`, 'spared'])
  if (eff.refund > 0) out.push(['bad', '−' + formatVND(eff.refund) + ' hoàn khách', 'refund'])
  if (eff.rep > 0) out.push(['good', `+${eff.rep} danh tiếng`, 'rep'])
  for (const x of eff.rare || []) out.push(['good', `+${x.n} phần ${x.name}`, 'rare'])
  if (eff.fragment) out.push(['good', `+${eff.fragment.n} mảnh công thức ${eff.fragment.name}`, 'fragment'])
  if (eff.spoons > 0) out.push(['good', `+${eff.spoons} Muỗng Vàng (kho hoặc mức hàng hiếm hôm nay đã đủ)`, 'spoons'])
  if (eff.waitMul && eff.waitMul < 1) out.push(['bad', 'Bếp chậm hơn tới cuối ca', 'wait'])
  if (eff.bonus > 0) out.push(['good', `Ca sau thêm ${eff.bonus} khách`, 'bonus'])
  if (eff.debt) out.push(['info', `Sổ ghi nợ: ${eff.debt.name} ${formatVND(eff.debt.amount)}`, 'debt'])
  if (eff.starLoss > 0) out.push(['bad', `−${eff.starLoss} sao khi nhận món`, 'star'])
  if (!out.length) out.push(['info', 'Không tốn gì', 'none'])
  return h('div', { class: 'incident-effects', testid: 'incident-effects' },
    out.map(([k, t, key]) => h('span', { class: 'incident-fx ' + k, dataset: { fx: key } }, t)))
}

/**
 * Nội dung hộp tình huống (đặt vào app.modal({ render })): phần hỏi (các lựa chọn) rồi phần kết quả.
 * onChoose(choice): người chơi chạm một lựa chọn (bên gọi gọi lõi rồi showResult).
 * → { el, ask(), showResult(choice, result, tip, onOk) } — ask() đã chạy sẵn lúc tạo.
 */
export function createIncidentBox(app, view, { onChoose } = {}) {
  const cfgI = app.data.INCIDENT_CONFIG || {}
  const box = h('div', { class: 'incident', dataset: { incident: view.id } })
  // thay nội dung hộp (bỏ qua mục rỗng: Element.append(null) sẽ in chữ "null")
  const fillBox = (...nodes) => { box.textContent = ''; for (const n of nodes) if (n) box.appendChild(n) }
  const ask = () => {
    fillBox(
      h('div', { class: 'incident-head' }, incidentArt(app, view),
        h('div', { class: 'incident-titles' },
          h('span', { class: 'incident-kicker' },
            (view.when === 'mo_hang' ? (cfgI.introOpening || 'Tình huống đầu ca') : (cfgI.intro || 'Tình huống giữa hai khách')) +
            (view.positive ? ' · ' + (cfgI.positiveTag || 'chuyện vui') : '')),
          h('h2', { class: 'modal-title incident-title' }, view.name))),
      h('p', { class: 'incident-text', testid: 'incident-text' }, view.text),
      view.note ? h('p', { class: 'incident-note' }, view.note) : null,
      h('p', { class: 'incident-pause small muted' }, 'Khách đang chờ cũng tạm dừng, cứ bình tĩnh chọn.'),
      h('div', { class: 'choice-list incident-choices' }, view.choices.map(c => h('button', {
        class: ['choice', 'incident-choice', c.safe ? 'is-safe' : '', c.green ? 'is-green' : ''], type: 'button', testid: 'incident-choice-' + c.id,
        disabled: !c.available, dataset: { safe: String(c.safe), choice: c.id },
        onclick: () => { if (onChoose) onChoose(c) }
      },
      h('b', null, c.label),
      h('small', null, c.available ? c.cost : c.reason),
      // M4: lựa chọn "xanh" nhờ hiện vật (vd Loa báo tiền)
      c.hint && c.available ? h('small', { class: 'choice-hint', testid: 'incident-hint-' + c.id }, c.hint) : null,
      c.safe ? h('span', { class: 'safe-badge' }, cfgI.safeLabel || 'An toàn') : null))))
  }
  // Kết quả lựa chọn c (r: kết quả resolveIncident, tip: thẻ Mẹo nghề mở được hoặc null); nút "Bán tiếp" gọi onOk.
  const showResult = (c, r, tip, onOk) => {
    fillBox(
      h('div', { class: 'incident-head' }, incidentArt(app, view),
        h('div', { class: 'incident-titles' },
          h('span', { class: 'incident-kicker' }, 'Đã chọn: ' + c.label),
          h('h2', { class: 'modal-title incident-title' }, view.name))),
      h('div', { class: 'incident-result', testid: 'incident-result', dataset: { choice: c.id } },
        h('p', { class: 'incident-text' }, r.text),
        effectChips(r.effects),
        tip ? h('div', { class: 'incident-tip', testid: 'incident-tip' }, h('b', null, 'Mẹo nghề: ' + tip.title), h('p', null, tip.text)) : null),
      h('div', { class: 'modal-actions' },
        h('button', { class: 'btn btn-primary', type: 'button', testid: 'incident-ok', onclick: () => { if (onOk) onOk() } }, 'Bán tiếp')))
    const ok = box.querySelector('[data-testid="incident-ok"]')
    if (ok) setTimeout(() => ok.focus({ preventScroll: true }), 30)
  }
  ask()
  return { el: box, ask, showResult }
}

/**
 * Nội dung hộp khách phàn nàn (đặt vào app.modal({ render })): khách nói (says), món bị phàn nàn, bước 1 chọn câu xin lỗi
 * (aps: [{ i, text }] đã xáo), bước 2 "Làm lại món" (khóa khi !remakeOk) / "Hoàn tiền (refund)".
 * close({ apology, action: 'remake' | 'refund' }) — hàm close của app.modal.
 */
export function renderComplaint(app, customer, { says, aps, items, refund, remakeOk, close }) {
  const S = app.data.STRINGS
  const R = app.data.RECIPES
  let apology = null
  const step2 = h('div', { class: 'complaint-step', hidden: true },
    h('p', { class: 'modal-text' }, 'Giờ xử lý sao cho khách vui lòng?'),
    remakeOk ? null : h('p', { class: 'small complaint-rare', testid: 'complaint-remake-blocked' }, (S.rare && S.rare.remakeBlocked) || 'Hết nguyên liệu hiếm, chỉ hoàn tiền được'),
    h('div', { class: 'modal-actions' },
      h('button', { class: 'btn btn-primary', type: 'button', testid: 'complaint-remake', disabled: !remakeOk, onclick: () => close({ apology, action: 'remake' }) }, S.buttons.remake),
      h('button', { class: 'btn btn-secondary', type: 'button', testid: 'complaint-refund', onclick: () => close({ apology, action: 'refund' }) }, `${S.buttons.refund} (${formatVND(refund)})`)))
  const step1 = h('div', { class: 'complaint-step' },
    h('p', { class: 'modal-text' }, 'Chọn câu nói với khách:'),
    h('div', { class: 'choice-list' }, aps.map(a => h('button', {
      class: 'choice', type: 'button', testid: 'complaint-apology-' + a.i,
      onclick: () => { apology = a.i; step1.hidden = true; step2.hidden = false }
    }, a.text))))
  return h('div', { class: 'complaint' },
    h('div', { class: 'npc-talk' }, svgBox(face(customer.persona, 'gian', customer.gender), 'npc-face'),
      h('div', { class: 'bubble' }, h('b', null, customer.name), h('p', null, says || 'Món này không đúng rồi!'))),
    h('ul', { class: 'complaint-items' }, items.map(it => {
      const r = R[it.line.recipeId]
      return h('li', null, (it.kind === 'sai_mon' ? 'Sai món, khách gọi: ' : 'Món hỏng: ') + `${it.line.qty} × ${r ? r.name : it.line.recipeId}`)
    })),
    step1, step2)
}
