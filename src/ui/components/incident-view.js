// Phần dựng giao diện của hộp tình huống trong ca và hộp khách phàn nàn (cả hai mở bằng app.modal ở service.js).
// Chỉ dựng DOM, không gọi lõi: service.js giữ luồng (khi nào mở, resolveIncident / resolveComplaint, âm, lưu).
// M5 Đợt 2 (gói Q-E): giao diện kiểu game — sân khấu minh họa lớn (người trong tình huống vẽ bán thân theo
// src/ui/art/people.js, tờ tiền, hoặc Dì Sáu), lựa chọn là nút bánh kẹo có biểu tượng an toàn (khiên ✓) / có rủi ro
// (tam giác !) / chưa làm được (ổ khóa), kết quả có nhãn hiệu ứng kèm biểu tượng nảy lần lượt và người trong tình huống
// đổi nét mặt theo kết quả; hộp phàn nàn có khách bán thân đang giận, bong bóng lời khách, món bị phàn nàn có hình món và
// con tem "Sai món" / "Món hỏng".
// Giữ: .incident[data-incident], .incident-choice (data-safe, data-choice), incident-choice-<id>, incident-text,
// incident-hint-<id>, incident-result (data-choice), incident-effects > .incident-fx[data-fx] (chữ như cũ), incident-tip,
// incident-ok; complaint-apology-<i>, complaint-remake, complaint-refund, complaint-remake-blocked. Chữ của mỗi lựa chọn
// (tên + cái giá / lý do khóa) và của nhãn hiệu ứng giữ nguyên văn; hình đều là SVG không có chữ.
// Hoạt ảnh (css/sheet.css) chỉ transform/opacity, hữu hạn, đặt trên phần tử con; lớp hiệu ứng vfx nằm dưới lớp hộp thoại
// nên hộp này không dùng vfx.
// Import trong Node được: không chạm DOM ở cấp module.
import { h, svgBox } from '../dom.js'
import { billSvg, icon } from '../art.js'
import { bust, DI_SAU_POSES } from '../art/people.js'
import { SCENE_ICONS } from '../art/scene.js'
import { formatVND } from '../format.js'
import { EMOTES } from './score-sheet.js'

// ---------- Biểu tượng vẽ tay (viewBox 64, viền mực #3a2618, ba tông, ánh sáng trên-trái) ----------
const INK = '#3a2618'
const svg64 = body => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`

/** Biểu tượng lựa chọn: an_toan (khiên xanh có dấu ✓), rui_ro (tam giác cam có dấu !), khoa (ổ khóa xám). */
export const CHOICE_ICONS = Object.freeze({
  an_toan: svg64('<path d="M32 6L54 14V30C54 44 45 54 32 59C19 54 10 44 10 30V14Z" fill="#6cc04a" stroke-width="3.5"/>' +
    '<path d="M32 59C45 54 54 44 54 30V14L48 12V30C48 42 41 50 32 54Z" fill="#3f8f2f" stroke="none"/>' +
    '<path d="M16 18V30C16 36 18 41 21 45" fill="none" stroke="#fff" stroke-width="3.5" opacity=".55"/>' +
    '<path d="M21 32L29 40L44 23" fill="none" stroke="#fff" stroke-width="6.5"/><path d="M21 32L29 40L44 23" fill="none" stroke-width="2" opacity=".25"/>'),
  rui_ro: svg64('<path d="M28.5 9.5Q32 4 35.5 9.5L59 50Q62 56 55 56H9Q2 56 5 50Z" fill="#ffb45c" stroke-width="3.5"/>' +
    '<path d="M38 13L59 50Q62 56 55 56H24L50 52Z" fill="#e08c00" stroke="none"/>' +
    '<path d="M12 48L28 20" fill="none" stroke="#fff" stroke-width="3.5" opacity=".5"/>' +
    `<path d="M32 22V38" fill="none" stroke="${INK}" stroke-width="7"/><circle cx="32" cy="47" r="4" fill="${INK}" stroke="none"/>`),
  khoa: svg64('<path d="M20 28V20C20 13 25 8 32 8C39 8 44 13 44 20V28" fill="none" stroke-width="7"/>' +
    '<path d="M20 28V20C20 13 25 8 32 8C39 8 44 13 44 20V28" fill="none" stroke="#c9bba5" stroke-width="2.5"/>' +
    '<rect x="12" y="27" width="40" height="30" rx="7" fill="#c9bba5" stroke-width="3.5"/>' +
    '<path d="M44 29H45Q50 29 50 34V50Q50 55 45 55H30Q44 50 44 29Z" fill="#a8987f" stroke="none"/>' +
    `<circle cx="32" cy="39" r="4" fill="${INK}" stroke="none"/><path d="M32 41V48" fill="none" stroke="${INK}" stroke-width="4"/>`)
})

// Tạm dừng (hai vạch trong vòng tròn), câu nói (bong bóng), bóng đèn mẹo nghề, chảo (làm lại món).
const PAUSE_ICON = svg64('<circle cx="32" cy="32" r="26" fill="#4aa3df" stroke-width="3.5"/><path d="M42 54A26 26 0 0 0 58 32C58 44 51 52 42 54Z" fill="#22679a" stroke="none"/>' +
  '<path d="M26 22V42M38 22V42" fill="none" stroke="#fff" stroke-width="6.5"/>')
const TALK_ICON = svg64('<path d="M8 30C8 17 19 9 32 9C45 9 56 17 56 30C56 42 45 50 32 50C28 50 25 49 22 48L10 55L14 44C10 40 8 35 8 30Z" fill="#fffaf0" stroke-width="3.5"/>' +
  `<path d="M20 25H44M20 34H36" fill="none" stroke="${INK}" stroke-width="4"/>`)
const BULB_ICON = svg64('<path d="M32 6C44 6 52 15 52 26C52 34 47 38 44 43V47H20V43C17 38 12 34 12 26C12 15 20 6 32 6Z" fill="#ffe27a" stroke-width="3.5"/>' +
  '<path d="M44 43C47 38 52 34 52 26C52 20 50 15 46 11C48 22 44 34 38 43Z" fill="#f7b928" stroke="none"/>' +
  '<path d="M20 20C22 15 26 12 30 11" fill="none" stroke="#fff" stroke-width="3.5" opacity=".7"/>' +
  '<rect x="21" y="47" width="22" height="10" rx="4" fill="#c9bba5" stroke-width="3.5"/>')

// Biểu tượng của nhãn hiệu ứng (theo data-fx): tiền → đồng xu, danh tiếng / sao / hàng hiếm → ngôi sao, chờ → đồng hồ,
// sổ nợ → sổ order. Hình lấy từ src/ui/art/scene.js.
const FX_ICONS = {
  money: 'dong_xu', gain: 'dong_xu', cost: 'dong_xu', fine: 'dong_xu', spend: 'dong_xu', spared: 'dong_xu', refund: 'dong_xu',
  capped: 'dong_xu', rep: 'hud_sao', rare: 'hud_sao', fragment: 'hud_sao', spoons: 'hud_sao', star: 'hud_sao',
  wait: 'hud_gio', bonus: 'tab_quay', debt: 'khau_order'
}
const scene64 = id => (SCENE_ICONS && SCENE_ICONS[id]) || ''

function bustSafe(persona, mood, opts) {
  try {
    const s = bust(persona, mood, opts)
    return typeof s === 'string' ? s : ''
  } catch { return '' }
}

/** Nét mặt theo kết quả lựa chọn: chỉ có lợi → vui, chỉ có thiệt → bực, lẫn lộn hoặc không đổi gì → bình thường. */
export function outcomeMood(eff = {}) {
  const e = eff || {}
  const good = e.money > 0 || e.gain > 0 || e.rep > 0 || e.bonus > 0 || e.spoons > 0 || !!e.fragment || (e.rare || []).length > 0
  const bad = e.cost > 0 || e.fine > 0 || e.spend > 0 || e.refund > 0 || e.starLoss > 0 || (e.waitMul && e.waitMul < 1)
  return good && !bad ? 'vui' : (bad && !good ? 'buc' : 'binh_thuong')
}

const EMOTE_OF_MOOD = { vui: 'tim', binh_thuong: 'ba_cham', buc: 'mo_hoi', gian: 'gian' }

/**
 * Hình minh họa của tình huống: tờ tiền, người trong tình huống vẽ bán thân (kiểu khách khai báo, khách liên quan đang ở
 * quầy, khách quen), hoặc Dì Sáu. mood: nét mặt (mặc định: chuyện vui → vui, còn lại → bình thường; khách quen → vui).
 * → span.incident-art (is-bill | is-person | is-disau)
 */
export function incidentArt(app, view, mood = null) {
  const sh = app && app.state && app.state.shift
  const d = view.detail || {}
  const base = mood || (view.positive ? 'vui' : 'binh_thuong')
  if (view.id === 'khach_mo_hang') return svgBox(billSvg(d.bill || 500000), 'incident-art is-bill')
  // M4: tình huống chạy theo dữ liệu khai báo hình minh họa (tờ tiền, hoặc người theo kiểu khách)
  if (view.art && view.art.bill) return svgBox(billSvg(view.art.bill), 'incident-art is-bill')
  const person = (persona, m, opts) => {
    const s = bustSafe(persona, m, opts)
    return s ? svgBox(s, 'incident-art is-person') : null
  }
  if (view.art && view.art.persona) {
    const n = person(view.art.persona, base, view.art.gender ? { gender: view.art.gender } : {})
    if (n) return n
  }
  const c = d.customerId && sh && sh.customers && sh.customers[d.customerId]
  if (c) {
    const opts = {}
    if (c.gender) opts.gender = c.gender
    const who = c.regularId || c.stranger
    if (typeof who === 'string' && who) opts.who = who
    const n = person(c.persona, base, opts)
    if (n) return n
  }
  const rg = d.regularId && app.data && app.data.REGULARS && app.data.REGULARS[d.regularId]
  if (rg) {
    const n = person(rg.persona, mood || 'vui', { ...(rg.gender ? { gender: rg.gender } : {}), who: d.regularId })
    if (n) return n
  }
  const pose = mood === 'vui' ? 'vo_tay' : (mood === 'buc' || mood === 'gian' ? 'che_mat' : 'lau_mo_hoi')
  return svgBox(DI_SAU_POSES[pose] || DI_SAU_POSES.lau_mo_hoi || '', 'incident-art is-disau')
}

// Sân khấu minh họa: nền quán (mép mái bạt sọc, mặt quầy gỗ bằng CSS), hình minh họa, biểu cảm nảy cạnh người.
function stage(app, view, mood, emote) {
  const art = incidentArt(app, view, mood)
  const person = !art.classList.contains('is-bill')
  return h('div', { class: ['incident-stage', 'is-' + (view.kind || 'chon'), person ? 'has-person' : 'has-bill'] },
    art,
    person && emote && EMOTES[emote] ? h('span', { class: 'incident-emote', dataset: { emote }, html: EMOTES[emote], 'aria-hidden': 'true' }) : null)
}

// Nhãn kết quả của lựa chọn (.incident-fx[data-fx]); chữ của nhãn giữ nguyên văn, biểu tượng là SVG không chữ.
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
    out.map(([k, t, key], i) => h('span', { class: 'incident-fx ' + k, dataset: { fx: key }, style: { '--k': String(i) } },
      FX_ICONS[key] ? svgBox(scene64(FX_ICONS[key]), 'incident-fx-ico') : null,
      h('span', { class: 'incident-fx-t' }, t))))
}

/**
 * Nội dung hộp tình huống (đặt vào app.modal({ render })): phần hỏi (các lựa chọn) rồi phần kết quả.
 * onChoose(choice): người chơi chạm một lựa chọn (bên gọi gọi lõi rồi showResult).
 * → { el, ask(), showResult(choice, result, tip, onOk) } — ask() đã chạy sẵn lúc tạo.
 */
export function createIncidentBox(app, view, { onChoose } = {}) {
  const cfgI = app.data.INCIDENT_CONFIG || {}
  const box = h('div', { class: 'incident', dataset: { incident: view.id, kind: view.kind || '' } })
  // thay nội dung hộp (bỏ qua mục rỗng: Element.append(null) sẽ in chữ "null")
  const fillBox = (...nodes) => { box.textContent = ''; for (const n of nodes) if (n) box.appendChild(n) }
  const kicker = (view.when === 'mo_hang' ? (cfgI.introOpening || 'Tình huống đầu ca') : (cfgI.intro || 'Tình huống giữa hai khách')) +
    (view.positive ? ' · ' + (cfgI.positiveTag || 'chuyện vui') : '')
  const ask = () => {
    fillBox(
      h('div', { class: 'incident-head' }, stage(app, view, null, view.positive ? 'lap_lanh' : 'ba_cham'),
        h('div', { class: 'incident-titles' },
          h('span', { class: ['incident-kicker', 'is-' + (view.kind || 'chon')] }, kicker),
          h('h2', { class: 'modal-title incident-title' }, view.name))),
      h('p', { class: 'incident-text', testid: 'incident-text' }, view.text),
      view.note ? h('p', { class: 'incident-note' }, view.note) : null,
      h('p', { class: 'incident-pause' }, svgBox(PAUSE_ICON, 'incident-pause-ico'), h('span', null, 'Khách đang chờ cũng tạm dừng, cứ bình tĩnh chọn.')),
      h('div', { class: 'choice-list incident-choices' }, view.choices.map((c, i) => {
        const ico = !c.available ? 'khoa' : (c.safe ? 'an_toan' : 'rui_ro')
        return h('button', {
          class: ['choice', 'incident-choice', c.safe ? 'is-safe' : 'is-risk', c.green ? 'is-green' : '', c.available ? '' : 'is-locked'],
          type: 'button', testid: 'incident-choice-' + c.id, style: { '--k': String(i) },
          disabled: !c.available, dataset: { safe: String(c.safe), choice: c.id },
          onclick: () => { if (onChoose) onChoose(c) }
        },
        svgBox(CHOICE_ICONS[ico], 'incident-choice-ico'),
        h('span', { class: 'incident-choice-body' },
          h('b', null, c.label),
          h('small', null, c.available ? c.cost : c.reason),
          // M4: lựa chọn "xanh" nhờ hiện vật (vd Loa báo tiền)
          c.hint && c.available ? h('small', { class: 'choice-hint', testid: 'incident-hint-' + c.id }, c.hint) : null,
          c.safe ? h('span', { class: 'safe-badge' }, cfgI.safeLabel || 'An toàn') : null))
      })))
  }
  // Kết quả lựa chọn c (r: kết quả resolveIncident, tip: thẻ Mẹo nghề mở được hoặc null); nút "Bán tiếp" gọi onOk.
  const showResult = (c, r, tip, onOk) => {
    const mood = outcomeMood(r.effects)
    fillBox(
      h('div', { class: 'incident-head is-result' }, stage(app, view, mood, EMOTE_OF_MOOD[mood]),
        h('div', { class: 'incident-titles' },
          h('span', { class: ['incident-kicker', 'is-picked', c.safe ? 'is-safe' : ''] }, 'Đã chọn: ' + c.label),
          h('h2', { class: 'modal-title incident-title' }, view.name))),
      h('div', { class: 'incident-result', testid: 'incident-result', dataset: { choice: c.id, mood } },
        h('p', { class: 'incident-text' }, r.text),
        effectChips(r.effects),
        tip ? h('div', { class: 'incident-tip', testid: 'incident-tip' },
          svgBox(BULB_ICON, 'incident-tip-ico'),
          h('div', { class: 'incident-tip-body' }, h('b', null, 'Mẹo nghề: ' + tip.title), h('p', null, tip.text))) : null),
      h('div', { class: 'modal-actions' },
        h('button', { class: 'g-btn g-btn--go g-btn--block incident-ok-btn', type: 'button', testid: 'incident-ok', onclick: () => { if (onOk) onOk() } }, 'Bán tiếp')))
    const ok = box.querySelector('[data-testid="incident-ok"]')
    if (ok) setTimeout(() => ok.focus({ preventScroll: true }), 30)
  }
  ask()
  return { el: box, ask, showResult }
}

/**
 * Nội dung hộp khách phàn nàn (đặt vào app.modal({ render })): khách đang giận nói (says), món bị phàn nàn, bước 1 chọn câu
 * xin lỗi (aps: [{ i, text }] đã xáo), bước 2 "Làm lại món" (khóa khi !remakeOk) / "Hoàn tiền".
 * close({ apology, action: 'remake' | 'refund' }) — hàm close của app.modal.
 */
export function renderComplaint(app, customer, { says, aps, items, refund, remakeOk, close }) {
  const S = app.data.STRINGS
  const R = app.data.RECIPES
  let apology = null
  const opts = {}
  if (customer.gender) opts.gender = customer.gender
  const who = customer.regularId || customer.stranger
  if (typeof who === 'string' && who) opts.who = who
  const face = bustSafe(customer.persona, 'gian', opts)
  const step2 = h('div', { class: 'complaint-step is-fix', hidden: true },
    h('p', { class: 'modal-text complaint-ask' }, 'Giờ xử lý sao cho khách vui lòng?'),
    remakeOk ? null : h('p', { class: 'complaint-rare', testid: 'complaint-remake-blocked' }, (S.rare && S.rare.remakeBlocked) || 'Hết nguyên liệu hiếm, chỉ hoàn tiền được'),
    h('div', { class: 'modal-actions complaint-actions' },
      h('button', { class: 'g-btn g-btn--primary g-btn--block', type: 'button', testid: 'complaint-remake', disabled: !remakeOk, onclick: () => close({ apology, action: 'remake' }) },
        svgBox(scene64('khau_lam_do'), 'g-ico'), h('span', null, S.buttons.remake)),
      h('button', { class: 'g-btn g-btn--block', type: 'button', testid: 'complaint-refund', onclick: () => close({ apology, action: 'refund' }) },
        svgBox(scene64('dong_xu'), 'g-ico'), h('span', null, `${S.buttons.refund} (${formatVND(refund)})`))))
  const step1 = h('div', { class: 'complaint-step' },
    h('p', { class: 'modal-text complaint-ask' }, 'Chọn câu nói với khách:'),
    h('div', { class: 'choice-list complaint-choices' }, aps.map((a, k) => h('button', {
      class: 'choice complaint-choice', type: 'button', testid: 'complaint-apology-' + a.i, style: { '--k': String(k) },
      onclick: () => { apology = a.i; step1.hidden = true; step2.hidden = false }
    }, svgBox(TALK_ICON, 'complaint-choice-ico'), h('span', { class: 'complaint-choice-t' }, a.text)))))
  return h('div', { class: 'complaint' },
    h('div', { class: 'complaint-scene' },
      h('div', { class: 'incident-stage complaint-stage has-person is-xau' },
        face ? svgBox(face, 'incident-art is-person') : null,
        h('span', { class: 'incident-emote', dataset: { emote: 'gian' }, html: EMOTES.gian, 'aria-hidden': 'true' })),
      h('div', { class: 'complaint-bubble' }, h('b', null, customer.name), h('p', null, says || 'Món này không đúng rồi!'))),
    h('ul', { class: 'complaint-items' }, items.map(it => {
      const r = R[it.line.recipeId]
      const wrong = it.kind === 'sai_mon'
      return h('li', { class: 'complaint-item' },
        svgBox(icon((r && r.icon) || it.line.recipeId), 'complaint-dish'),
        h('span', { class: ['complaint-kind', wrong ? 'is-wrong' : 'is-broken'] }, wrong ? 'Sai món' : 'Món hỏng'),
        h('span', { class: 'complaint-what' }, (wrong ? 'khách gọi ' : '') + `${it.line.qty} × ${r ? r.name : it.line.recipeId}`))
    })),
    step1, step2)
}
