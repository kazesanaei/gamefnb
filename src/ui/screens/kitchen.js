// Màn Bếp (panel con của màn ca bán): dây phiếu → chọn nguyên liệu → Thớt sơ chế → Ra món → Giao cho khách.
// Giao diện với khung app: mountKitchen(root, app, opts?) → { unmount(), update(dt), onShow(), onHide(), selectTicket(id),
// tourSpot(), busy(), guideHold(on), focusWanted() } (tourSpot, busy, guideHold: hướng dẫn lần đầu, bản 0.4.1).
// opts.tasting = { onDone(dish) }: chế độ NẤU THỬ ở Chợ Công Thức (app là app "hộp cát" có state/ctx riêng):
// không đếm giờ (giới hạn bước nới rộng, ẩn thanh thời gian), không nút về dây phiếu / bỏ món, Ra món xong gọi onDone.
// opts.onFocus(want, kind) (M5; kind từ bản vừa màn): màn ca bán bật "chế độ tập trung" (ẩn dải khách, thanh 4 khâu ở
// khung thấp) khi bếp đang nấu (Chọn, Thớt, sân khấu) và ghi data-cook = kind ('chon' | 'thot' | 'stage', rỗng khi không nấu).
// Bếp gọi hàm này mỗi khi trạng thái nấu hoặc loại màn nấu đổi, và luôn gọi TRƯỚC khi dựng mini-game (plugin đo kích thước
// khung lúc dựng).
//
// M5 (0.5.0, thiết kế mục 1.8): luồng bước mới
// - Thẻ vào bước (components/step-card.js) thay thẻ gợi ý chữ: món nấu chưa tới HINT_HIDE_AFTER_COOKS lần thì thẻ đầy đủ
//   (ruy băng "Bước k/N", hình to, động từ, tay mẫu; tự vào sau 1,1 giây hoặc chạm), từ đó trở đi ruy băng gọn không chờ —
//   trừ lần đầu gặp mỗi loại thao tác mới (đập, khuấy, gọt, lắc, thả đá): thẻ đầy đủ + tour của loại đó (stepCardFull).
// - Mini-game nhận ctx mở rộng { vfx, reduced, stepIndex, stepTotal, stepGrades, method }.
// - Có kết quả: lưu ngay (submitStep), giữ sân khấu thêm ~700 ms (500 ms khi giảm chuyển động) cho con dấu, dừng hình,
//   Dì Sáu phản ứng (components/stamp.js), rồi mới đóng lớp, vẽ lại Thớt và hỏi lại nếu bước chí mạng Hỏng.
// - Thớt gỗ: nguyên liệu là hình to đổi sang hình đã sơ chế (art/state-map.js); mỗi bước là huy hiệu tròn có biểu tượng
//   loại thao tác. Bảng chọn cách sơ chế là các thẻ hình. Dây phiếu, dòng món, thẻ công thức có hình món/nguyên liệu to.
// - Ra món: bảng ra món mới (components/dish-reveal.js) trên lớp nổi, ~2,2 giây (giảm chuyển động 1,4 giây), chạm để bỏ qua.
import { h, svgBox as svgBoxRaw, clear } from '../dom.js'
import { upper, formatVND } from '../format.js'
import { icon, art, prop, DI_SAU } from '../art.js'
import {
  startCook, submitChon, boardSteps, beginStep, getStep, submitStep, autoStep, retryStep,
  finishDish, abandonDish, serveTicket, effectiveSteps, chonDraft, saveChonDraft
} from '../../core/kitchen.js'
import { zoneMul } from '../../core/minigame-scoring.js'
import { playStep, skinFor } from '../minigames/index.js'
import { uiRand, hashKey } from '../minigames/_util.js'
import { rareStock } from '../../core/rare.js'
import { isReduced } from '../motion.js'
import { createStepCard, stepCardModel, stepProgress, STEP_CARD_AUTO_MS } from '../components/step-card.js'
import { showStepResult, createStamp, playStamp, gradeKey } from '../components/stamp.js'
import { createDishReveal, revealMs, REVEAL_MS, REVEAL_MS_REDUCED } from '../components/dish-reveal.js'
import { boardStates, methodState } from '../art/state-map.js'
import { isTourSeen, markSeen } from '../../core/tour.js'

// Thẻ vào bước tự chạy sau chừng này (ms) nếu người chơi không chạm (thẻ đầy đủ).
export const HINT_MS = STEP_CARD_AUTO_MS
// Màn ra món tự đóng: 2.200 ms (giảm chuyển động 1.400 ms) — xem components/dish-reveal.js.
export { REVEAL_MS, REVEAL_MS_REDUCED }
export const HINT_HIDE_AFTER_COOKS = 3
// Chặn click ma: chỉ bỏ click đến trong khoảng này sau lần chạm (một cú chạm thường nhấc ngón trong vài trăm ms).
export const TAP_GUARD_MS = 1000
// Con dấu nổi của bước Chọn / bước Tự làm (không có sân khấu để giữ): hiện chừng này rồi tự gỡ.
export const FLASH_MS = 1600
export const FLASH_MS_REDUCED = 1200
// Con dấu trên sân khấu: dựng sẵn Thớt (chưa gắn) khi khung hình còn ít nhất chừng này ms rảnh (requestIdleCallback).
export const PREBUILD_IDLE_MS = 8

// Mức ngân sách chờ → màu viền phiếu: xanh < 50%, vàng 50–80%, đỏ > 80% (nhấp nháy).
export function waitLevel(ratio) {
  if (ratio > 0.8) return 'red'
  if (ratio >= 0.5) return 'yellow'
  return 'green'
}

export function waitRatio(sh, ticket) {
  const c = sh && sh.customers && sh.customers[ticket.customerId]
  if (!c || !c.waitBudget) return 0
  const start = ticket.remake ? ticket.createdAt : (c.waitStart ?? ticket.createdAt)
  return Math.max(0, (sh.t - start) / c.waitBudget)
}

// Biểu cảm Dì Sáu theo hạng món.
export function moodForGrade(grade) {
  if (grade === 'tuyet_hao') return 'tu_hao'
  if (grade === 'ngon') return 'vui'
  if (grade === 'hong') return 'tiec'
  return 'lo'
}

const lowerFirst = s => (s ? s.charAt(0).toLocaleLowerCase('vi-VN') + s.slice(1) : '')
const ING_ERR_ORDER = ['trai_ghi_chu', 'bay', 'thieu_chinh', 'thieu_phu', 'thua']
// Năm thao tác M5: lời góp ý ghép từ DIALOGUE.diSau.typeTips theo mẫu `${nhãn bước} ${góp ý}`; thẻ vào bước đầy đủ hiện lần
// đầu gặp mỗi loại (stepCardFull).
export const NEW_TYPES = Object.freeze(['dap', 'xoay', 'got', 'lac', 'bay'])

/** Id tour hướng dẫn thẻ vào bước của một loại thao tác mới ('bep_dap'…), null nếu không phải loại mới. */
export function newTypeTour(type) {
  return NEW_TYPES.includes(type) ? 'bep_' + type : null
}

/**
 * stepCardFull(step, state, { recipeId, tasting }) → true nếu thẻ vào bước hiện bản ĐẦY ĐỦ (ruy băng, tay mẫu, chờ chạm
 * hoặc 1,1 giây), false nếu chỉ ruy băng gọn (thuần, test Node).
 * - Món nấu chưa tới HINT_HIDE_AFTER_COOKS lần: đầy đủ (như 0.4.x).
 * - Loại thao tác mới của 0.5.0 (NEW_TYPES) mà người chơi chưa xem hướng dẫn của loại đó (state.tour.seen['bep_<loại>']):
 *   đầy đủ, kể cả ở món đã nấu nhiều lần — người chơi nâng cấp từ 0.4.x đã nấu Bánh mì ốp la, Trà tắc rất nhiều lần vẫn
 *   phải thấy tay mẫu (và tour bep_<loại> chỉ vào chính thẻ này) lần đầu gặp Đập trứng, Lắc… Xem xong (tour đóng, hoặc
 *   tour không tự hiện được thì lúc vào bước từ thẻ đầy đủ — xem markTypeSeen trong mountKitchen) thì thôi.
 * - Nấu thử (Chợ Công Thức): chỉ theo số lần nấu (không có tour, trạng thái hộp cát không lưu).
 */
export function stepCardFull(step, state, { recipeId = null, tasting = false } = {}) {
  const prog = state && state.recipes && recipeId ? state.recipes[recipeId] : null
  if (!prog || (Number(prog.cooks) || 0) < HINT_HIDE_AFTER_COOKS) return true
  if (tasting) return false
  const tour = newTypeTour(step && step.type)
  return !!tour && !isTourSeen(state, tour)
}

// Một câu góp ý của Dì Sáu: lỗi nguyên liệu nặng nhất, không thì bước kém nhất, không thì khen.
export function dishComment(dish, recipe, data) {
  const INGS = (data && data.INGREDIENTS) || {}
  const ML = (data && data.METHOD_LABELS) || {}
  const nm = id => (INGS[id] && INGS[id].name) || id
  const errs = (dish.ingErrors || []).slice().sort((a, b) => ING_ERR_ORDER.indexOf(a.code) - ING_ERR_ORDER.indexOf(b.code))
  const e = errs[0]
  if (e) {
    if (e.code === 'trai_ghi_chu') {
      const note = ((recipe && recipe.notes) || []).find(n => (dish.notes || []).includes(n.id) && (n.removes || []).includes(e.ing))
      return `Phiếu dặn "${note ? note.label : 'ghi chú'}" mà con lại bỏ ${lowerFirst(nm(e.ing))} vô rồi.`
    }
    if (e.code === 'bay') {
      const real = INGS[e.ing] && INGS[e.ing].trapOf
      return real ? `${nm(e.ing)} đâu phải ${lowerFirst(nm(real))}! Coi kỹ kệ nha con.` : `Lấy nhầm ${lowerFirst(nm(e.ing))} rồi con.`
    }
    if (e.code === 'thieu_chinh' || e.code === 'thieu_phu') return `Thiếu ${lowerFirst(nm(e.ing))} rồi con ơi.`
    if (e.code === 'thua') return `Dư ${lowerFirst(nm(e.ing))} rồi, tốn tiền nguyên liệu đó con.`
  }
  const defs = (recipe && recipe.steps) || []
  let worst = null
  for (const id of Object.keys(dish.steps || {})) {
    const r = dish.steps[id]
    const def = defs.find(d => d.id === id)
    if (!def || !r || r.score >= 90) continue
    const w = def.w || 1
    if (!worst || r.score < worst.r.score || (r.score === worst.r.score && w > worst.w)) worst = { id, r, def, w }
  }
  if (worst) {
    const { r, def } = worst
    const label = def.label || ''
    if (r.skipped || r.tag === 'bo_qua') return `Con quên ${lowerFirst(label)} rồi kìa.`
    // lời nhắc theo lớp vỏ của bước (chảo: cháy; phin: đắng gắt; nồi: nhũn)
    if (r.tag === 'chay') return `${label} ${skinFor(def, data).overTip || 'bị cháy rồi, nhấc sớm chút nha con.'}`
    if (r.tag === 'song') return `${label} còn sống quá, đợi kim vô vùng xanh nha.`
    if (r.tag === 'tran') return 'Rót tràn rồi, gần vạch thì rót chậm lại nha con.'
    if (r.tag === 'sai_cach' && def.method) {
      return `${def.ing ? nm(def.ing) : 'Món này'} phải ${lowerFirst(ML[def.method.correct] || def.method.correct)} mới đúng nghen.`
    }
    const byType = {
      chon: 'Chọn nguyên liệu còn chạm nhầm, nhìn kỹ thẻ công thức nha.',
      cha: `${label} chưa kỹ, vuốt đều lên từng chỗ nha con.`,
      thai: `${label}: kéo dao trúng vạch chấm rồi hẵng nhấc tay nha.`,
      cham: `${label} chưa đúng, đếm kỹ số lần nha con.`,
      lua: `${label} chưa tới độ, canh kim vô giữa vùng xanh nha.`,
      rot: `${label} lệch vạch rồi, thả tay đúng vạch nha con.`
    }
    const tips = (data && data.DIALOGUE && data.DIALOGUE.diSau && data.DIALOGUE.diSau.typeTips) || {}
    for (const t of NEW_TYPES) if (tips[t]) byType[t] = `${label} ${tips[t]}`
    return byType[def.type] || `${label} còn chưa khéo, lần sau kỹ hơn nha.`
  }
  const praise = (data && data.DIALOGUE && data.DIALOGUE.diSau && data.DIALOGUE.diSau.praise) || ['Khéo tay lắm con!']
  return praise[Math.abs(Math.round(Number(dish.q) || 0)) % praise.length]
}

// ---------- Biểu tượng loại thao tác trên huy hiệu bước ----------
// Hình tự vẽ (viewBox 64, viền mực, cel-shading): ngọn lửa (Canh lửa), giọt nước (Rửa), muỗng rắc (Nêm); còn lại dùng
// icon dụng cụ / nguyên liệu của bộ hình (dao, dao bào, muỗng khuấy, bình lắc, khay bày…) hoặc bàn tay (đạo cụ 'tay').
const GLYPHS = Object.freeze({
  flame: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#3a2618" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
    '<ellipse cx="32" cy="58" rx="14" ry="3.5" fill="#3a2618" opacity=".15" stroke="none"/>' +
    '<path d="M32 5c3 11 17 16 17 32a17 17 0 0 1-34 0c0-9 4-14 9-18 1 5 3 8 6 9-2-9 0-16 2-23z" fill="#f28a1e"/>' +
    '<path d="M44 36a13 13 0 0 1-9 17c6-4 7-11 5-17z" fill="#d4620a" stroke="none"/>' +
    '<path d="M32 30c2 5 8 8 8 15a8 8 0 0 1-16 0c0-5 3-8 5-10 1 3 2 4 3 4-1-4 0-7 0-9z" fill="#ffd23f" stroke-width="2"/>' +
    '<ellipse cx="24" cy="31" rx="2.6" ry="6" fill="#fff" opacity=".5" stroke="none" transform="rotate(20 24 31)"/></g></svg>',
  drop: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#3a2618" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
    '<ellipse cx="32" cy="59" rx="13" ry="3.2" fill="#3a2618" opacity=".15" stroke="none"/>' +
    '<path d="M32 5C25 19 13 29 13 39a19 19 0 0 0 38 0C51 29 39 19 32 5z" fill="#4aa3df"/>' +
    '<path d="M47 40a15 15 0 0 1-15 15c9-3 13-9 13-15z" fill="#22679a" stroke="none" opacity=".55"/>' +
    '<path d="M22 40a10 10 0 0 0 7 10" fill="none" stroke="#fff" stroke-width="3.2" opacity=".75"/>' +
    '<ellipse cx="25" cy="27" rx="3" ry="5.5" fill="#fff" opacity=".55" stroke="none" transform="rotate(25 25 27)"/></g></svg>',
  // muỗng nghiêng rắc gia vị (Nêm, Thêm đường / sữa)
  spoon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#3a2618" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
    '<ellipse cx="34" cy="59" rx="15" ry="3.2" fill="#3a2618" opacity=".15" stroke="none"/>' +
    '<rect x="3" y="16" width="27" height="8" rx="4" fill="#d99a4c" transform="rotate(28 16 20)"/>' +
    '<ellipse cx="40" cy="29" rx="14" ry="9.5" fill="#dfe7ec" transform="rotate(28 40 29)"/>' +
    '<ellipse cx="41.5" cy="28" rx="9" ry="5.5" fill="#fff4dc" stroke-width="2" transform="rotate(28 41.5 28)"/>' +
    '<ellipse cx="35" cy="24" rx="4" ry="1.8" fill="#fff" opacity=".7" stroke="none" transform="rotate(28 35 24)"/>' +
    '<g fill="#fff4dc" stroke-width="2"><circle cx="47" cy="45" r="3"/><circle cx="40" cy="51" r="2.6"/><circle cx="51" cy="54" r="2.2"/></g></g></svg>'
})

/**
 * stepBadge(step) → { kind: 'icon', id, state? } | { kind: 'glyph', id } | { kind: 'prop', id } — biểu tượng loại thao
 * tác của bước (thuần, test Node). Thái: dao; Gọt: dao bào; Khuấy: muỗng khuấy; Lắc: bình lắc (lắc rổ: rổ); Bày: khay
 * bày; Đập: trứng nứt; Canh lửa: ngọn lửa; Rửa: giọt nước; Bóc / Xé / Bóp / Vắt (chạm nhanh): bàn tay; Nêm, Thêm
 * (đếm nấc): muỗng rắc; Rót vào ly: ly; Rưới: hình thứ đang rưới (dầu hành, cốt dừa, mật ong…); Chọn: rổ.
 */
export function stepBadge(step) {
  const s = step || {}
  const ing = s.ing || null
  switch (s.type) {
    case 'thai': return { kind: 'icon', id: 'dao_thep' }
    case 'got': return { kind: 'icon', id: 'dao_bao' }
    case 'xoay': return { kind: 'icon', id: 'muong_khuay' }
    case 'lac': return { kind: 'icon', id: s.skin === 'ro' ? 'ro' : 'binh_lac' }
    case 'bay': return { kind: 'icon', id: 'khay_bay' }
    case 'dap': return { kind: 'icon', id: ing || 'trung_ga', state: 'nut' }
    case 'lua': return { kind: 'glyph', id: 'flame' }
    case 'cha': return /^rua/.test(String(s.id || '')) ? { kind: 'glyph', id: 'drop' } : { kind: 'prop', id: 'tay' }
    case 'rot': return s.skin === 'to' && ing ? { kind: 'icon', id: s.icon || ing } : { kind: 'icon', id: 'ly' }
    case 'cham': return s.params && s.params.mode === 'min' ? { kind: 'prop', id: 'tay' } : { kind: 'glyph', id: 'spoon' }
    case 'chon': return { kind: 'icon', id: 'ro' }
    default: return { kind: 'icon', id: ing || 'fallback' }
  }
}

function badgeSvg(b) {
  if (!b) return icon('fallback')
  if (b.kind === 'glyph') return GLYPHS[b.id] || icon('fallback')
  if (b.kind === 'prop') return prop(b.id) || icon('fallback')
  return b.state ? art(b.id, b.state) : icon(b.id)
}

/**
 * stepStatus(step, byId) → { text, cls } — dòng trạng thái ngắn dưới huy hiệu bước (thuần).
 * Đã xong: "Tốt · 85" (tự làm: "Tự làm · 80"); chưa mở: "Sau: <bước trước>" hoặc "Sau <n> bước"; mở: "Chạm để làm" /
 * "Chọn cách" (bước phải chọn cách sơ chế).
 */
export function stepStatus(s, byId = new Map()) {
  const r = s && s.result
  if (r) return { text: r.auto ? `Tự làm · ${r.score}` : `${r.grade} · ${r.score}`, cls: 'is-done' }
  if (s && !s.available) {
    const need = (s.after || []).filter(id => !(byId.get(id) && byId.get(id).done)).map(id => (byId.get(id) || {}).label || id)
    return { text: need.length > 1 ? `Sau ${need.length} bước` : `Sau: ${need[0] || 'bước trước'}`, cls: 'is-locked' }
  }
  // short / shortBelow: chữ gọn khi ô chữ của bước hẹp dưới shortBelow px (Thớt lưới 2 cột ở màn hẹp — css/kitchen.css chọn
  // bản hiện bằng container query, không cắt "…")
  return s && s.method
    ? { text: 'Chọn cách', cls: 'is-available', short: 'Chọn', shortBelow: 64 }
    : { text: 'Chạm để làm', cls: 'is-available', short: 'Chạm', shortBelow: 84 }
}

// Nạp css/kitchen.css một lần (khung app có thể đã gắn sẵn).
function ensureStyles() {
  if (typeof document === 'undefined') return
  if (document.querySelector('link[data-kitchen-css], link[href$="css/kitchen.css"]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = new URL('../../../css/kitchen.css', import.meta.url).href
  link.dataset.kitchenCss = '1'
  document.head.appendChild(link)
}

// Nấu thử: nới giới hạn thời gian của bước (2,5 × par → 10 × par) để người chơi làm thong thả.
export const TASTING_PAR_MUL = 4

// Dấu ✓ nhỏ trên hình (nguyên liệu sẵn sàng, bước đã xong) và ổ khóa (bước chưa mở): SVG tin cậy, viền mực.
const TICK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 11V8.2a4.5 4.5 0 0 1 9 0V11" fill="none" stroke="#3a2618" stroke-width="2.6" stroke-linecap="round"/><rect x="4.5" y="10.5" width="15" height="11" rx="3" fill="#f7b928" stroke="#3a2618" stroke-width="2.4"/><circle cx="12" cy="15.6" r="1.7" fill="#3a2618"/></svg>'

// Hình SVG nội bộ (chuỗi tin cậy từ art.js) dựng lại rất nhiều lần mỗi khi vẽ lại Thớt / dây phiếu: phân tích chuỗi một lần
// vào <template>, các lần sau nhân bản cây đã phân tích (nhanh hơn innerHTML nhiều) — cùng kết quả DOM với svgBox.
const SVG_TPL = new Map()
const SVG_TPL_MAX = 300
function svgBox(svg, cls = 'svg-box', props = {}) {
  if (typeof document === 'undefined' || typeof svg !== 'string') return svgBoxRaw(svg, cls, props)
  let tpl = SVG_TPL.get(svg)
  if (!tpl) {
    tpl = document.createElement('template')
    tpl.innerHTML = svg
    if (SVG_TPL.size >= SVG_TPL_MAX) SVG_TPL.delete(SVG_TPL.keys().next().value)
    SVG_TPL.set(svg, tpl)
  }
  const el = h('span', { class: cls, 'aria-hidden': 'true', ...props })
  el.appendChild(tpl.content.cloneNode(true))
  return el
}

// Việc chạy ở task kế tiếp (sau task hiện tại, thường trước khung hình kế): chia việc nặng của một cú chạm thành nhiều task
// ngắn. Dùng MessageChannel (không bị đồng hồ giả của kiểm thử giữ lại như setTimeout / requestAnimationFrame).
function nextTask(fn) {
  if (typeof MessageChannel === 'function') {
    const ch = new MessageChannel()
    ch.port1.onmessage = () => { ch.port1.onmessage = null; ch.port1.close(); fn() }
    ch.port2.postMessage(0)
    return
  }
  setTimeout(fn, 0)
}

// Bảng ra món dựng lần ĐẦU trong trang tốn bố cục gấp ~4 lần các lần sau (phông chữ, hình, luật CSS của bảng chưa "ấm"):
// ngay lúc bấm Ra món đó là một khung hình đứng hình thấy rõ ở máy yếu. Bếp dựng sẵn một bảng ẩn (không testid, không nhận
// chạm, không chạy hiệu ứng) lúc rảnh trên Thớt, một lần mỗi trang.
let revealWarmed = false

export function mountKitchen(root, app, opts = {}) {
  ensureStyles()
  const tasting = opts && opts.tasting ? opts.tasting : null
  const onFocus = opts && typeof opts.onFocus === 'function' ? opts.onFocus : null
  // M5 (vòng sửa F): báo màn ca bán lúc bảng ra món mở / đóng — thông báo nổi chờ tới khi bảng đóng (không đè ruy băng tên món)
  const onReveal = opts && typeof opts.onReveal === 'function' ? opts.onReveal : null
  const main = h('div', { class: 'k-main' })
  // nơi các hàm vẽ (renderRail / renderChon / renderBoard) gắn nội dung: thường là main; dựng sẵn Thớt thì là một fragment
  let out = main
  // Hai lớp phủ, mỗi lúc chỉ một lớp hiện: sân khấu mini-game nằm trong panel Bếp (vùng chơi giữa dây phiếu và thanh tab);
  // bảng chọn, hộp hỏi lại, hộp xác nhận, bảng công bố món nằm ở lớp nổi gốc của app (app.overlay), phủ cả thanh tab —
  // panel Bếp ở màn thấp chỉ cao ~200px, và iOS Safari cắt mọi thứ nằm trong panel (vùng cuộn) theo khung panel nên
  // bảng nằm trong panel bị mất các nút phía dưới. Lớp nổi mang class k-scope để dùng chung biến màu, kiểu của bếp.
  const layer = h('div', { class: 'k-layer', hidden: true })
  const popLayer = h('div', { class: 'k-layer k-scope k-pop', 'data-testid': 'kitchen-pop', hidden: true })
  const flashHost = h('div', { class: 'k-flash-host', 'aria-live': 'polite' })
  const el = h('section', { class: ['kitchen', tasting ? 'is-tasting' : ''], 'data-testid': 'kitchen', 'aria-label': tasting ? 'Nấu thử' : 'Bếp' }, main, flashHost, layer)
  root.appendChild(el)
  ;(app.overlay || el).appendChild(popLayer)

  const ui = {
    visible: true,
    showRail: false,       // đang nấu (chọn hoặc thớt) nhưng người chơi quay về dây phiếu
    // (rổ đang chọn dở nằm trong state: cook.chonDraft, core/kitchen.js saveChonDraft — tải lại trang vẫn còn)
    openTicket: null,      // phiếu đang mở danh sách dòng
    play: null,            // {kind:'chon'|'step', handle, token, stepId}
    token: 0,
    lastDish: null,        // {ticketId, lineIndex, dish, comment, mood, recipeId}
    dismissed: null,       // bước dở người chơi chọn "Để sau" (không tự mở lại)
    layerKind: null,       // 'card' (thẻ vào bước đang chờ chạm) | 'stage' | 'sheet' | 'prompt' | 'confirm' | 'reveal'
    card: null,            // thẻ vào bước đang hiện (createStepCard)
    result: null,          // kết quả bước đang giữ sân khấu (con dấu): { step, score, timer }
    pendingCritical: null, // bước chí mạng Hỏng mà chưa kịp hỏi lại (đổi tab lúc con dấu đang hiện)
    reveal: null,          // bảng ra món đang hiện (createDishReveal)
    revealTimer: 0,
    railPending: false,    // vừa Ra món: dây phiếu dưới bảng ra món vẽ ở task kế (nextTask), update() chưa vẽ lại
    key: ''
  }
  let destroyed = false
  const offs = []

  // Chặn "click ma" (màn cảm ứng): lớp phủ đóng/mở ngay lúc ngón tay còn chạm — Nhấc của bước lửa chốt ở pointerdown, chạm
  // thẻ vào bước hay bảng công bố món, mini-game tự kết thúc (hết giờ, đủ lần chạm) — thì cú click trình duyệt sinh ra lúc nhấc
  // ngón rơi xuống phần tử mới nằm dưới ngón: nút "Bỏ món" trên Thớt, "Giao cho khách" trên dây phiếu, nút Xong của mini-game
  // vừa mở (bước về 0 điểm). Bỏ click của lần chạm bắt đầu TRƯỚC lần đổi lớp phủ gần nhất (so thứ tự sự kiện, không so giờ)
  // và chưa quá TAP_GUARD_MS; lần chạm mới và click từ bàn phím (có phím bấm sau lần chạm cuối) không bị chặn.
  // Lớp nổi (popLayer) nằm ngoài `el` nên gắn cùng bộ chặn: chạm bắt đầu ở bếp, nhấc ngón trên bảng vừa mở (và ngược lại).
  const tapGuard = { seq: 0, press: 0, pressAt: 0, layer: 0 }
  const markLayer = () => { tapGuard.layer = ++tapGuard.seq }
  for (const node of [el, popLayer]) {
    node.addEventListener('pointerdown', () => { tapGuard.press = ++tapGuard.seq; tapGuard.pressAt = performance.now() }, true)
    node.addEventListener('keydown', () => { tapGuard.press = 0 }, true)
    node.addEventListener('click', e => {
      const g = tapGuard
      if (g.press > 0 && g.press < g.layer && performance.now() - g.pressAt < TAP_GUARD_MS) { e.preventDefault(); e.stopPropagation() }
    }, true)
  }

  // ---------- tiện ích ----------
  const S = () => app.state
  const SH = () => (app.state && app.state.shift) || null
  const D = () => app.data || {}
  const cctx = () => {
    const c = app.ctx || {}
    if (c.data) return c
    return { emit: (t, p) => { if (app.bus) app.bus.emit(t, p) }, data: app.data }
  }
  const recipeOf = id => (D().RECIPES || {})[id]
  const ingName = id => ((D().INGREDIENTS || {})[id] || {}).name || id
  const ingIconId = id => ((D().INGREDIENTS || {})[id] || {}).icon || id
  const ingIconSvg = id => icon(ingIconId(id))
  const ingArt = (id, state) => (state ? art(ingIconId(id), state) : ingIconSvg(id))
  const noteLabels = (recipe, notes) => (notes || []).map(id => ((recipe && recipe.notes) || []).find(n => n.id === id)).filter(Boolean).map(n => n.label)
  const gradeLabel = g => ((D().BALANCE && D().BALANCE.gradeLabels) || (D().STRINGS && D().STRINGS.grades) || {})[g] || g
  const save = () => { try { app.save && app.save() } catch (err) { console.error(err) } }
  const saveNow = () => {
    try { if (typeof app.saveNow === 'function') app.saveNow(); else save() } catch (err) { console.error(err) }
  }
  // thông báo của chính bếp là phản hồi tức thì cho thao tác vừa làm: hiện ngay cả khi chế độ tập trung đang bật (now)
  const toast = text => { try { app.toast && app.toast(text, { now: true }) } catch { /* bỏ qua */ } }
  const sound = n => { try { app.sound && app.sound(n) } catch { /* bỏ qua */ } }
  const vibrate = ms => { try { app.vibrate && app.vibrate(ms) } catch { /* bỏ qua */ } }
  const reduced = () => isReduced(app)
  const vfx = () => (app.vfx && typeof app.vfx.burst === 'function' ? app.vfx : null)
  const cookKey = c => (c ? `${c.ticketId}:${c.lineIndex}` : '')
  const playable = step => (tasting && step ? { ...step, par: (Number(step.par) || 1) * TASTING_PAR_MUL } : step)
  const tutorialLine = key => {
    if (tasting) return null
    const sh = SH()
    const t = D().DIALOGUE && D().DIALOGUE.diSau && D().DIALOGUE.diSau.tutorial
    return sh && sh.day === 1 && t && t[key] ? t[key] : null
  }

  // Thẻ đầy đủ của một loại thao tác mới vừa nhường chỗ cho mini-game. Hướng dẫn bep_<loại> không tự hiện được (người
  // chơi tắt "Hướng dẫn lần đầu" trong Cài đặt, hoặc trình duyệt do kiểm thử tự động điều khiển) thì ghi luôn là đã xem:
  // người chơi đã thấy tay mẫu, lần sau ở món nấu nhiều lần chỉ còn ruy băng gọn. Tour tự hiện được thì để chính tour ghi
  // khi xem xong / bỏ qua (chạm thẻ trước khi tour kịp hiện thì lần sau thẻ đầy đủ hiện lại, tour có chỗ để chỉ vào).
  function markTypeSeen(type) {
    const id = newTypeTour(type)
    if (!id || tasting || !S() || isTourSeen(S(), id)) return
    let canShow = false
    try { canShow = !!(app.tour && typeof app.tour.canAuto === 'function' && app.tour.canAuto(id)) } catch { canShow = false }
    if (canShow) return
    if (markSeen(S(), [id])) save()
  }

  function mode() {
    const sh = SH()
    if (!sh) return 'off'
    const c = sh.cook
    if (c && c.phase === 'chon' && !ui.showRail) return 'chon'
    if (c && c.phase === 'thot' && !ui.showRail) return 'thot'
    return 'rail'
  }

  // Chế độ tập trung (màn ca bán): bếp đang nấu — bước Chọn, Thớt hoặc sân khấu một bước — và cả lúc bảng ra món của món
  // vừa nấu còn hiện (giữ nguyên bố cục dưới lớp phủ tới khi bảng đóng: không dựng lại dải khách ngay lúc bấm Ra món, và
  // thông báo bị hoãn chỉ thả ra khi bảng đã đóng). Báo cho màn ca bán mỗi khi đổi; gọi trước khi dựng mini-game để plugin
  // đo đúng khung.
  let focusSent = null
  let kindSent = ''
  function focusWanted() {
    if (tasting || destroyed || !ui.visible) return false
    if (ui.railPending || (ui.reveal && ui.layerKind === 'reveal')) return true
    const m = mode()
    return m === 'chon' || m === 'thot'
  }
  // Vừa màn (L4): loại màn nấu gửi kèm onFocus → màn ca bán ghi data-cook ('chon' ẩn dải mặt khách ở mọi khung; 'stage' là
  // sân khấu một bước hoặc thẻ vào bước đang phủ Thớt). Bảng ra món đang hiện: giữ loại cũ (bố cục dưới lớp phủ không đổi).
  function focusKind() {
    if (ui.layerKind === 'stage' || ui.layerKind === 'card' || ui.result || (ui.play && ui.play.kind === 'step')) return 'stage'
    const m = mode()
    if (m === 'chon' || m === 'thot') return m
    return kindSent || 'thot'
  }
  function syncFocus() {
    if (!onFocus) return
    const want = focusWanted()
    const kind = want ? focusKind() : ''
    if (want === focusSent && kind === kindSent) return
    focusSent = want
    kindSent = kind
    try { onFocus(want, kind) } catch (err) { console.error(err) }
  }

  function computeKey() {
    const sh = SH()
    const m = mode()
    if (m === 'off') return 'off'
    const c = sh.cook
    if (m === 'chon') return 'chon:' + cookKey(c)
    if (m === 'thot') {
      const st = Object.keys(c.steps || {}).map(k => k + '=' + c.steps[k].score + (c.steps[k].auto ? 'a' : '')).join(',')
      return `thot:${cookKey(c)}:${st}:${c.retryPending || ''}:${c.retriesLeft}`
    }
    // dòng phiếu cũng vào khóa: tình huống "khách đổi ý" (M3) sửa món của phiếu còn chờ
    const t = sh.tickets.map(x => [x.id, x.status, (x.done || []).map(Boolean).join(''),
      x.lines.map(l => `${l.recipeId}*${l.qty}:${(l.notes || []).join(',')}`).join(';')].join('/')).join('|')
    return `rail:${t}:${c ? cookKey(c) + c.phase : ''}:${ui.openTicket || ''}:${ui.lastDish ? cookKey(ui.lastDish) : ''}`
  }

  // ---------- dựng giao diện ----------
  function render() {
    if (destroyed) return
    ui.railPending = false
    ui.key = computeKey()
    if (ui.play && ui.play.kind === 'chon') stopPlay()
    const m = mode()
    // vào bước Chọn / Thớt từ màn khác (vd dây phiếu đã cuộn xuống để chạm "Làm món này"): bắt đầu từ đầu khung — nút
    // "‹ Phiếu" và thẻ công thức không bị cuộn mất (đọc / ghi chỗ cuộn trước khi xóa nội dung, lúc bố cục còn sạch)
    if (m !== main.dataset.view && (m === 'chon' || m === 'thot') && main.scrollTop) main.scrollTop = 0
    clear(main)
    out = main
    main.dataset.view = m
    // chế độ tập trung bật/tắt TRƯỚC khi dựng kệ Chọn (plugin đo khung lúc dựng)
    syncFocus()
    if (m === 'off') {
      main.appendChild(h('div', { class: 'k-empty' }, 'Chưa mở ca. Mở hàng rồi mới nấu được nha.'))
      return
    }
    if (m === 'chon') renderChon()
    else if (m === 'thot') renderBoard()
    else renderRail()
    updateWaitColors()
  }

  // Dựng sẵn Thớt (chưa gắn vào trang) trong lúc con dấu của bước vừa xong còn giữ sân khấu: lúc đóng sân khấu chỉ còn thay
  // nội dung (showPrebuilt), không phải dựng cả Thớt ngay khung hình đó. → { key, frag } | null.
  function prebuildBoard() {
    if (destroyed || !ui.visible || mode() !== 'thot' || typeof document === 'undefined') return null
    const frag = document.createDocumentFragment()
    const key = computeKey()
    out = frag
    try { renderBoard() } catch (err) { console.error(err); return null } finally { out = main }
    return { key, frag }
  }
  // Gắn Thớt dựng sẵn nếu vẫn đúng trạng thái hiện tại (cùng khóa); không thì vẽ lại như thường.
  function showPrebuilt(pre) {
    if (destroyed) return
    if (!pre || pre.key !== computeKey() || mode() !== 'thot' || (ui.play && ui.play.kind === 'chon')) { render(); return }
    ui.railPending = false
    ui.key = pre.key
    clear(main)
    out = main
    main.dataset.view = 'thot'
    syncFocus()
    main.appendChild(pre.frag)
    updateWaitColors()
  }

  function diSauLine(text, mood = 'vui') {
    if (!text) return null
    return h('div', { class: 'k-disau', 'data-testid': 'disau-line' },
      svgBox(DI_SAU[mood] || DI_SAU.vui, 'k-disau-face'), h('div', { class: 'k-bubble' }, text))
  }

  function notesRow(notes, cls = '') {
    return notes.length ? h('div', { class: ['k-notes', cls] }, notes.map(n => h('span', { class: 'k-note' }, upper(n)))) : null
  }

  // Thẻ công thức: hàng hình nguyên liệu (huy hiệu ×n, tên nhỏ bên dưới), ghi chú đỏ, các bước + trạng thái.
  // compact (trên Thớt sơ chế): chỉ hiện ghi chú đỏ, nguyên liệu và các bước gập lại để thớt đủ chỗ.
  function recipeCard(cook, open = false, compact = false) {
    const recipe = recipeOf(cook.recipeId) || {}
    const notes = noteLabels(recipe, cook.notes)
    const INGS = D().INGREDIENTS || {}
    const multi = []
    const ings = (recipe.ingredients || []).map(i => {
      const qty = i.qty && i.qty > 1 ? i.qty : 0
      // "×2" là số lượng trong món, lấy 1 lần chạm (chạm lần nữa là bỏ ra) → ghi rõ ở dòng chú thích cuối thẻ
      if (qty) multi.push(`${ingName(i.id)} ×${qty} (chạm 1 lần)`)
      let sub = null
      if (i.role === 'tuy_chon') {
        // nguyên liệu tùy chọn: chỉ lấy khi phiếu dặn ghi chú thêm nó (vd Cay → Tương ớt)
        const by = (recipe.notes || []).filter(n => (n.adds || []).includes(i.id)).map(n => n.label)
        sub = by.length
          ? h('small', { class: 'k-card-opt' }, h('span', { class: 'k-card-opt-pre' }, 'khi dặn '), by.join(', '))
          : h('small', { class: 'k-card-opt' }, 'tùy chọn')
      }
      // M4: nguyên liệu hiếm: số phần kho còn (luôn thấy trên thẻ, kể cả khi ô kệ có nhãn "còn n" nằm dưới thanh Xong;
      // nấu thử không trừ kho nên không ghi)
      const left = !tasting && INGS[i.id] && INGS[i.id].rare
        ? h('small', { class: 'k-card-left', 'data-testid': 'card-left-' + i.id }, h('span', { class: 'k-card-left-pre' }, 'kho '), `còn ${rareStock(S(), i.id)}`) : null
      return h('li', {
        // has-tag: có nhãn phụ dưới hình (khi dặn…, kho còn n) — khung thấp dán nhãn ở chân hình (css/kitchen.css)
        class: ['k-card-ing', 'role-' + i.role, INGS[i.id] && INGS[i.id].rare ? 'is-rare' : '', sub || left ? 'has-tag' : ''], dataset: { ing: i.id },
        title: ingName(i.id) + (qty ? ` ×${qty}` : '')
      },
      h('span', { class: 'k-card-art', dataset: qty ? { qty } : {} }, svgBox(ingIconSvg(i.id), 'k-card-ing-icon')),
      h('span', { class: 'k-card-name' }, ingName(i.id)), sub, left)
    })
    const tip = multi.length ? h('p', { class: 'k-card-tip' }, multi.join(' · ')) : null
    const board = cook.board || effectiveSteps(recipe, cook.notes, null, cook.qty).filter(s => s.type !== 'chon')
    const steps = [{ id: 'chon', label: 'Chọn nguyên liệu' }, ...board].map(s => {
      const r = cook.steps && cook.steps[s.id]
      return h('li', { class: ['k-card-step', r ? 'is-done' : ''] },
        h('span', null, s.label), h('span', { class: 'k-card-step-st' }, r ? `${r.grade}${r.auto ? ' (tự làm)' : ''}` : '—'))
    })
    const noteRow = notes.length ? h('div', { class: 'k-notes k-card-notes' }, h('span', { class: 'k-card-lbl' }, 'Ghi chú:'), notes.map(n => h('span', { class: 'k-note' }, upper(n)))) : null
    const label = 'Thẻ công thức ' + (recipe.name || '')
    if (compact) {
      // một dòng gọn: hình món + ghi chú đỏ (không có ghi chú: chữ "Thẻ công thức") + số món / bước; chạm để mở chi tiết
      const more = h('details', { class: 'k-card-steps' },
        // số phần (×n) dán góc hình món: đầu Thớt gọn ở khung thấp không còn tên phiếu "… ×2" (css/kitchen.css)
        h('summary', null, svgBox(icon(recipe.icon || recipe.id || 'fallback'), 'k-card-sum-icon', cook.qty > 1 ? { dataset: { qty: cook.qty } } : {}),
          notes.length
            ? h('span', { class: 'k-notes k-card-notes' }, notes.map(n => h('span', { class: 'k-note' }, upper(n))))
            : h('span', { class: 'k-card-sum-t' }, 'Thẻ công thức'),
          // tên món: chỉ hiện khi đầu Thớt gọn (khung thấp bỏ tên món ở đầu bảng — css/kitchen.css)
          notes.length ? null : h('span', { class: 'k-card-sum-name' }, recipe.name || ''),
          h('small', { class: 'k-card-sum-n' }, `${ings.length} món · ${steps.length} bước`)),
        h('ul', { class: 'k-card-ings' }, ings), tip, h('ol', null, steps))
      if (open) more.open = true
      return h('aside', { class: 'k-card is-compact', 'data-testid': 'recipe-card', 'aria-label': label }, more)
    }
    const details = h('details', { class: 'k-card-steps' }, h('summary', null, `Các bước (${steps.length})`), h('ol', null, steps))
    if (open) details.open = true
    return h('aside', { class: 'k-card', 'data-testid': 'recipe-card', 'aria-label': label },
      noteRow,
      h('ul', { class: 'k-card-ings' }, ings),
      tip,
      details)
  }

  // ----- Dây phiếu -----
  function renderRail() {
    const sh = SH()
    if (tasting) {
      // nấu thử: không có dây phiếu; Ra món xong màn Nấu thử tự hiện kết quả
      if (ui.lastDish) out.appendChild(lastDishBanner())
      else out.appendChild(h('div', { class: 'k-empty' }, 'Đang dọn thớt…'))
      return
    }
    const max = (D().BALANCE && D().BALANCE.ticketRailMax) || 3
    const head = h('div', { class: 'k-rail-head' },
      h('h2', null, 'Dây phiếu'),
      h('span', { class: ['k-rail-count', sh.tickets.length >= max ? 'is-full' : ''] }, `${sh.tickets.length}/${max}`))
    out.appendChild(head)
    if (ui.lastDish) out.appendChild(lastDishBanner())
    const c = sh.cook
    if (c && c.phase !== 'xong') {
      const r = recipeOf(c.recipeId)
      out.appendChild(h('div', { class: 'k-resume' },
        svgBox(icon(r ? r.icon : c.recipeId), 'k-resume-icon'),
        h('span', { class: 'k-resume-name' }, h('small', null, 'Đang làm'), h('b', null, r ? r.name : c.recipeId)),
        h('button', { class: 'btn btn-ghost btn-small', type: 'button', 'data-testid': 'abandon-dish', onclick: () => onAbandon() }, 'Bỏ món'),
        h('button', { class: 'btn btn-primary', type: 'button', 'data-testid': 'cook-resume', onclick: () => { ui.showRail = false; render() } }, 'Làm tiếp')))
    }
    if (!sh.tickets.length) {
      out.appendChild(h('div', { class: 'k-empty', 'data-testid': 'rail-empty' },
        svgBox(icon('thot'), 'k-empty-art'), h('span', null, 'Chưa có phiếu nào. Qua Quầy nhận order nha!')))
      return
    }
    const list = h('div', { class: 'k-tickets' })
    for (const t of sh.tickets) list.appendChild(ticketCard(t))
    out.appendChild(list)
    if (sh.tickets.some(t => t.status === 'xong')) {
      const line = diSauLine(tutorialLine('serve'))
      if (line) out.appendChild(line)
    }
  }

  function ticketCard(t) {
    const sh = SH()
    const cust = sh.customers[t.customerId]
    const open = ui.openTicket === t.id
    const c = sh.cook
    const lines = t.lines.map((l, i) => {
      const r = recipeOf(l.recipeId)
      const notes = noteLabels(r, l.notes)
      const done = t.done && t.done[i]
      const cooking = c && c.phase !== 'xong' && c.ticketId === t.id && c.lineIndex === i
      const status = done ? gradeLabel(done.grade) : cooking ? 'Đang làm' : 'Chờ'
      const rare = !!(r && r.baseRecipe)
      const row = h('div', { class: ['k-line', done ? 'is-done' : '', cooking ? 'is-cooking' : ''] },
        h('span', { class: ['k-line-art', rare ? 'is-rare' : ''] },
          svgBox(icon(r ? r.icon : l.recipeId), 'k-line-icon'),
          l.qty > 1 ? h('b', { class: 'k-line-qty', 'aria-hidden': 'true' }, '×' + l.qty) : null,
          done ? svgBox(TICK_SVG, 'k-line-tick') : null),
        h('div', { class: 'k-line-text' },
          h('div', { class: 'k-line-name' }, `${l.qty} × ${r ? r.name : l.recipeId}`),
          notesRow(notes)),
        h('span', { class: ['k-line-st', done ? 'grade-' + done.grade : '', cooking ? 'is-cooking' : ''] }, status))
      if (open && !done) {
        // has-go: dòng có nút làm món (khung nhỏ xếp nút cạnh tên món thay cho viên trạng thái — css/kitchen.css)
        row.classList.add('has-go')
        row.appendChild(h('button', {
          class: 'btn btn-primary k-line-go', type: 'button', 'data-testid': 'cook-line-' + i,
          onclick: e => { e.stopPropagation(); openLine(t.id, i) }
        }, cooking ? 'Làm tiếp' : 'Làm món này'))
      }
      return row
    })
    const serve = t.status === 'xong'
      ? h('button', {
        class: 'btn btn-primary k-serve', type: 'button', 'data-testid': 'serve-ticket', dataset: { ticketId: t.id },
        onclick: e => { e.stopPropagation(); onServe(t.id) }
      }, 'Giao cho khách')
      : null
    const card = h('article', {
      class: ['k-ticket', open ? 'is-open' : '', t.remake ? 'is-remake' : '', serve ? 'is-ready' : ''],
      'data-testid': 'ticket-' + t.id, dataset: { ticketId: t.id, status: t.status, wait: 'green' },
      role: 'button', tabindex: '0', 'aria-expanded': open ? 'true' : 'false',
      onclick: () => { ui.openTicket = open ? null : t.id; render() },
      onkeydown: e => { if (e.key === 'Enter') { ui.openTicket = open ? null : t.id; render() } }
    },
    h('i', { class: 'k-ticket-clip', 'aria-hidden': 'true' }),
    h('div', { class: 'k-ticket-head' },
      h('b', { class: 'k-ticket-no' }, t.no),
      h('span', { class: 'k-ticket-cust' }, cust ? cust.name : ''),
      t.remake ? h('span', { class: 'k-tag' }, 'Làm lại') : null,
      h('span', { class: 'k-wait-dot', 'aria-hidden': 'true' })),
    lines, serve)
    return card
  }

  function lastDishBanner() {
    const d = ui.lastDish
    const recipe = recipeOf(d.recipeId) || {}
    return h('div', { class: ['k-last', 'grade-' + d.dish.grade], 'data-testid': 'dish-result', dataset: { grade: d.dish.grade, q: d.dish.q } },
      h('div', { class: 'k-last-dish' }, svgBox(icon(recipe.icon || d.recipeId), 'k-last-icon'),
        h('span', { class: 'k-last-grade' }, gradeLabel(d.dish.grade))),
      h('div', { class: 'k-last-text' },
        h('b', null, `${d.name}: ${gradeLabel(d.dish.grade)} · ${d.dish.q}%`),
        d.dish.flawless ? h('span', { class: 'k-flawless' }, 'Không tì vết') : null,
        h('div', { class: 'k-last-talk' }, svgBox(DI_SAU[d.mood] || DI_SAU.vui, 'k-disau-face'), h('div', { class: 'k-bubble' }, d.comment))))
  }

  // ----- Chọn nguyên liệu -----
  function renderChon() {
    const sh = SH()
    const cook = sh.cook
    const recipe = recipeOf(cook.recipeId)
    if (!recipe) { out.appendChild(h('div', { class: 'k-empty' }, 'Không tìm thấy công thức.')); return }
    // đầu bảng + thẻ công thức chung một khối: khung thấp (css/kitchen.css, max-height 640px) xếp nút "‹ Phiếu" cạnh thẻ
    // công thức gọn để kệ lộ ra ngay khi vừa mở bước Chọn (tên món đã có trên phiếu ở dây phiếu đầu màn)
    out.appendChild(h('div', { class: 'k-chon-top' }, tasting ? null : boardHeader(cook), recipeCard(cook)))
    const stage = h('div', { class: 'mg-stage' })
    out.appendChild(h('div', { class: 'k-chon-wrap' }, stage))
    // bước chọn đã nhân par theo số lượng
    const step = effectiveSteps(recipe, cook.notes, null, cook.qty).find(s => s.type === 'chon') ||
      { id: 'chon', type: 'chon', label: 'Chọn nguyên liệu', par: 6, w: 1 }
    const rand = uiRand(hashKey([S().seed, sh.day, cook.ticketId, cook.lineIndex, 'shelf'].join(':')))
    const shelf = (recipe.shelf || []).slice()
    for (let i = shelf.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [shelf[i], shelf[j]] = [shelf[j], shelf[i]] }
    // ngày 1: lời Dì Sáu nằm ngay trong rổ (đỡ tốn chỗ trên màn dọc)
    const tut = tutorialLine('chon')
    // rổ đang chọn dở (lưu trong state: về dây phiếu, đổi tab hay tải lại trang đều giữ, kể cả lần chọn nhầm); mở lại
    // dòng từng bỏ món giữa bước Chọn: rổ trống nhưng mang số lần nhầm cũ (startCook lấy từ ticket.chonMistakes, mục 25)
    const draft = chonDraft(S(), cctx())
    // M4: nguyên liệu hiếm trên kệ hiện "còn n" (số phần trong kho hàng hiếm; nấu thử không trừ kho nên không hiện)
    const INGS = D().INGREDIENTS || {}
    const stockLeft = {}
    if (!tasting) for (const id of shelf) if (INGS[id] && INGS[id].rare) stockLeft[id] = rareStock(S(), id)
    const handle = playStep(stage, playable(step), {
      ...pluginCtx(step, cook, recipe), shelf, basketHint: tut ? 'Dì Sáu: ' + tut : null, stockLeft,
      initial: draft && (draft.picked.length || draft.mistakes || draft.overtime) ? draft : null,
      // mỗi lần thêm/bớt nguyên liệu: lưu rổ vào save (debounce); chọn nhầm hay vừa quá giờ thì ghi ngay để tải lại trang
      // không xóa được lần nhầm, phạt quá giờ
      onChange: snap => {
        if (destroyed) return
        const r = saveChonDraft(S(), snap, cctx())
        if (!r.ok) return
        if (r.raised) saveNow()
        else save()
      }
    })
    const token = ++ui.token
    ui.play = { kind: 'chon', handle, token, stepId: 'chon' }
    handle.result.then(res => {
      if (!res || destroyed || !ui.play || ui.play.token !== token) return
      ui.play = null
      onChonResult(res)
    })
  }

  function onChonResult(res) {
    const r = submitChon(S(), res.details.picked, res.details.mistakes, cctx())
    if (!r.ok) {
      if (r.blockedMissingMain) toast('Còn thiếu nguyên liệu chính')
      // giữ rổ đã chọn (lưu vào state) để chọn tiếp
      const d = saveChonDraft(S(), {
        picked: res.details.picked, mistakes: res.details.tapMistakes ?? res.details.mistakes, overtime: res.details.overtime === true
      }, cctx())
      if (d.ok) save()
      render()
      return
    }
    // submitChon đã xóa rổ dở (cook.chonDraft)
    ui.showRail = false
    save()
    const cook = SH().cook
    const g = cook && cook.steps.chon ? cook.steps.chon.grade : ''
    render()
    flash(r.score, g, 'Chọn nguyên liệu')
  }

  // ----- Thớt sơ chế -----
  // (Nấu thử không có dòng đầu này: màn Nấu thử đã có nhãn "Nấu thử" + tên món và nút về Chợ.)
  function boardHeader(cook) {
    const sh = SH()
    const t = sh.tickets.find(x => x.id === cook.ticketId)
    const recipe = recipeOf(cook.recipeId)
    return h('div', { class: 'k-board-head' },
      h('button', { class: 'btn btn-ghost btn-small k-back', type: 'button', 'data-testid': 'kitchen-back', 'aria-label': 'Về dây phiếu', onclick: () => { ui.showRail = true; render() } }, '‹ Phiếu'),
      recipe ? svgBox(icon(recipe.icon || recipe.id), 'k-card-icon') : null,
      h('span', { class: 'k-board-title' }, t ? h('small', { class: 'k-board-no' }, t.no) : null, h('span', null, recipe ? recipe.name : ''),
        cook.qty > 1 ? h('span', { class: 'k-qty' }, ` ×${cook.qty}`) : null),
      t ? h('span', { class: 'k-wait-dot', dataset: { ticketId: t.id, wait: 'green' }, 'data-wait-dot': t.id }) : null)
  }

  function renderBoard() {
    const sh = SH()
    const cook = sh.cook
    const ctx = cctx()
    const recipe = recipeOf(cook.recipeId) || {}
    const bs = boardSteps(S(), ctx)
    // đầu Thớt + thẻ công thức gọn chung một khối (.k-thot-top): mặc định xếp dọc như cũ (display: contents); khung thấp
    // (css/kitchen.css) xếp nút "‹ Phiếu" cạnh thẻ công thức gọn trên cùng một hàng, như bước Chọn ở khung thấp
    out.appendChild(h('div', { class: 'k-thot-top' }, tasting ? null : boardHeader(cook), recipeCard(cook, false, true)))

    // Nguyên liệu trên thớt, mỗi thứ kèm các bước của nó; hình nguyên liệu theo các bước đã xong (art/state-map.js).
    const states = boardStates(cook.board || [], cook.steps || {}, { notes: cook.notes || [], activeId: null })
    const groups = new Map()
    for (const id of cook.picked || []) groups.set(id, [])
    const whole = []
    for (const s of bs) {
      if (s.ing && groups.has(s.ing)) groups.get(s.ing).push(s)
      else whole.push(s)
    }
    const boardEl = h('div', { class: 'k-board', 'data-testid': 'board' })
    const ready = []
    for (const [ing, steps] of groups) {
      if (steps.length) boardEl.appendChild(ingTile(ing, steps, bs, recipe, states))
      else ready.push(ing)
    }
    if (whole.length) boardEl.appendChild(ingTile(null, whole, bs, recipe, states))
    const readyRow = ready.length
      ? h('div', { class: 'k-ready', 'data-testid': 'board-ready' }, h('span', { class: 'k-card-lbl' }, 'Sẵn sàng'),
        ready.map(id => h('span', { class: 'k-ready-item', dataset: { ing: id }, title: ingName(id), 'aria-label': ingName(id) + ' sẵn sàng' },
          svgBox(ingArt(id, states[ingIconId(id)] || states[id]), 'k-ready-icon'), svgBox(TICK_SVG, 'k-ready-tick'))))
      : null
    // lời Dì Sáu (ngày 1) nằm ngay dưới tên thớt, gọn một bong bóng nhỏ: đặt dưới thớt thì bị thanh "Bỏ món / Ra món"
    // che mất ở màn thấp, người mới không thấy lời giải thích duy nhất về Thớt sơ chế
    const tip = diSauLine(tutorialLine('thot'))
    if (tip) tip.classList.add('is-compact')
    out.appendChild(h('div', { class: 'k-thot' },
      h('i', { class: 'k-thot-hole', 'aria-hidden': 'true' }),
      h('div', { class: 'k-thot-title' }, 'Thớt sơ chế'), tip, boardEl, readyRow))

    const retryInfo = cook.retriesLeft > 0 ? `Còn ${cook.retriesLeft} lượt làm lại` : 'Hết lượt làm lại'
    out.appendChild(h('div', { class: 'k-toolbar' },
      h('span', { class: 'k-retry-info' }, retryInfo),
      tasting ? null : h('button', { class: 'btn btn-danger', type: 'button', 'data-testid': 'abandon-dish', onclick: onAbandon }, 'Bỏ món'),
      h('button', { class: 'btn btn-primary', type: 'button', 'data-testid': 'finish-dish', onclick: onFinish }, 'Ra món')))
  }

  // Dựng thử bảng ra món (ẩn, ở lớp nổi gốc của app — dựng được cả khi panel Bếp đang ẩn) lúc rảnh ngay sau khi bếp được
  // gắn (đầu ca), một lần mỗi trang (revealWarmed): lần Ra món thật đầu tiên không còn phải trả giá bố cục "lạnh". Bếp
  // đang chơi một bước / có lớp phủ / đang giữ con dấu thì hẹn lại.
  let warmTimer = 0
  function scheduleWarm(tries = 0) {
    if (revealWarmed || warmTimer || destroyed || typeof document === 'undefined') return
    const run = () => {
      if (revealWarmed || destroyed) return
      if (ui.play || ui.layerKind || ui.result) { if (tries < 12) scheduleWarm(tries + 1); return }
      warmReveal()
    }
    warmTimer = setTimeout(() => {
      warmTimer = 0
      if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1500 })
      else run()
    }, tries ? 700 : 300)
  }
  function warmReveal() {
    const sh = SH()
    const id = (sh && sh.cook && sh.cook.recipeId) || (sh && sh.tickets && sh.tickets[0] && sh.tickets[0].lines[0] && sh.tickets[0].lines[0].recipeId) ||
      Object.keys(D().RECIPES || {})[0]
    const recipe = id ? recipeOf(id) : null
    let rv = null
    let wrap = null
    try {
      rv = createDishReveal({
        dish: { grade: 'tuyet_hao', q: 100, flawless: true }, recipe, name: recipe ? recipe.name : '', mood: 'tu_hao',
        comment: 'Khéo tay lắm con!', data: D(), reduced: reduced()
      })
      // bản dựng thử: không testid / vai trò (kiểm thử, trình đọc màn hình không thấy), không nhận chạm, không hiện
      for (const a of ['data-testid', 'role', 'aria-label']) rv.el.removeAttribute(a)
      wrap = h('div', {
        class: 'k-layer k-scope k-pop k-warm', 'aria-hidden': 'true', dataset: { kind: 'reveal' },
        style: { visibility: 'hidden', pointerEvents: 'none', zIndex: '-1' }
      }, rv.el)
      ;(app.overlay || el).appendChild(wrap)
      void wrap.offsetHeight   // ép bố cục một lần ngay lúc rảnh
      revealWarmed = true
    } catch (err) {
      console.error(err)
      revealWarmed = true   // lỗi thì thôi, không thử lại mãi
    } finally {
      if (rv) { try { rv.destroy() } catch { /* bỏ qua */ } }
      if (wrap) wrap.remove()
    }
  }

  function ingTile(ing, steps, all, recipe, states) {
    const cls = ['k-ing']
    if (steps.length && steps.every(s => s.done)) cls.push('is-finished')
    if (!steps.length) cls.push('is-ready')
    const name = ing ? ingName(ing) : 'Cả món'
    const st = ing ? (states[ing] || states[ingIconId(ing)] || null) : null
    const img = ing ? ingArt(ing, st) : icon((recipe && recipe.icon) || 'fallback')
    const byId = new Map(all.map(s => [s.id, s]))
    const INGS = D().INGREDIENTS || {}
    // data-steps: số bước của trạm — Thớt lưới 2 cột (css/kitchen.css) cho trạm nhiều bước chiếm chừng ấy hàng lưới, các trạm
    // một bước xếp kín chỗ bên cạnh
    return h('div', { class: cls, dataset: { ing: ing || 'ca_mon', state: st || undefined, steps: String(Math.max(1, Math.min(4, steps.length))) } },
      h('div', { class: 'k-ing-top' },
        h('span', { class: ['k-ing-art', ing && INGS[ing] && INGS[ing].rare ? 'is-rare' : ''] }, svgBox(img, 'k-ing-icon'),
          steps.length && steps.every(s => s.done) ? svgBox(TICK_SVG, 'k-ing-tick') : null),
        h('span', { class: 'k-ing-name' }, name)),
      steps.length ? h('div', { class: 'k-steps' }, steps.map(s => stepButton(s, byId))) : null)
  }

  function stepButton(s, byId) {
    const r = s.result
    const st = stepStatus(s, byId)
    const cls = ['k-step', 'type-' + s.type]
    if (r) cls.push('is-done', 'grade-' + gradeKey(r.score))
    else if (!s.available) cls.push('is-locked')
    else cls.push('is-available')
    if (s.critical) cls.push('is-critical')
    // bước phải chọn cách sơ chế (thái lát / thái sợi…): hướng dẫn lần đầu chỉ đúng vào bước này
    if (s.method) cls.push('has-method')
    const def = getStep(S(), s.id) || s
    return h('button', {
      class: cls, type: 'button', 'data-testid': 'board-step-' + s.id, dataset: { stepId: s.id, type: s.type },
      'aria-disabled': !r && !s.available ? 'true' : 'false',
      'aria-label': `${s.label}${s.critical ? ' (bước quan trọng)' : ''}: ${st.text}`,
      onclick: () => onBoardStep(s.id)
    },
    h('span', { class: 'k-step-badge' },
      svgBox(badgeSvg(stepBadge(def)), 'k-step-ico'),
      r ? svgBox(TICK_SVG, 'k-step-tick') : null,
      !r && !s.available ? svgBox(LOCK_SVG, 'k-step-lock') : null,
      s.critical ? h('b', { class: 'k-step-crit', 'aria-hidden': 'true' }, '★') : null),
    h('span', { class: 'k-step-text' },
      h('span', { class: 'k-step-label' }, s.label),
      // bản gọn (st.short) nằm sẵn bên cạnh, CSS đổi bản hiện theo bề ngang ô chữ (container query); máy đọc màn hình đọc
      // trạng thái ở aria-label của nút
      h('span', { class: 'k-step-st', dataset: st.short ? { shortBelow: st.shortBelow } : {} }, st.short
        ? [h('span', { class: 'k-st-full' }, st.text), h('span', { class: 'k-st-short', 'aria-hidden': 'true' }, st.short)]
        : st.text)))
  }

  // ---------- thao tác ----------
  function openLine(ticketId, i) {
    const sh = SH()
    const cur = sh.cook
    const c = startCook(S(), ticketId, i, cctx())
    if (!c) {
      if (cur && cur.phase !== 'xong') toast('Làm xong hoặc bỏ món đang dở trước nha.')
      else toast('Không mở được dòng này.')
      return
    }
    ui.showRail = false
    ui.openTicket = null
    ui.lastDish = null
    ui.dismissed = null
    save()
    sound('paper')
    render()
  }

  function onBoardStep(stepId) {
    if (ui.play || ui.result) return
    const ctx = cctx()
    const s = boardSteps(S(), ctx).find(x => x.id === stepId)
    if (!s) return
    if (s.done) {
      if (s.canRetry) openSheet(s)
      else toast(s.result && s.result.auto ? 'Bước tự làm không làm lại được.' : 'Bước này đã làm rồi.')
      return
    }
    if (!s.available) {
      toast('Cần làm bước trước đã.')
      return
    }
    if (s.method || s.canAuto) { openSheet(s); return }
    startStep(stepId, null)
  }

  // Bảng chọn trước khi làm: cách sơ chế (thẻ hình) / tự làm / làm lại.
  function openSheet(s, { retrying = false } = {}) {
    const METHOD = D().METHOD_LABELS || {}
    const cook = SH().cook
    const def = getStep(S(), s.id) || s
    const kids = [h('div', { class: 'k-sheet-head' },
      h('span', { class: 'k-step-badge k-sheet-badge' }, svgBox(badgeSvg(stepBadge(def)), 'k-step-ico')),
      h('h3', { class: 'k-sheet-title' }, s.label))]
    if (s.done && !retrying) {
      const step = getStep(S(), s.id) || {}
      const cost = Math.max(0, Number(step.retryCost) || 0)
      kids.push(h('p', null, `Kết quả: ${s.result.grade} · ${s.result.score}. Làm lại thì điểm mới tối đa 85${cost ? `, tốn ${formatVND(cost)}` : ''}.`))
      kids.push(h('button', { class: 'btn btn-primary', type: 'button', 'data-testid': 'retry-step', onclick: () => onRetry(s.id) },
        cost ? `Làm lại (${formatVND(cost)})` : 'Làm lại'))
    } else {
      if (s.method) {
        kids.push(h('p', { class: 'k-sheet-q' }, 'Chọn cách sơ chế:'))
        const ing = s.ing || def.ing
        kids.push(h('div', { class: 'k-methods' }, (s.method.options || []).map(id => {
          const ms = methodState(id)
          return h('button', {
            class: 'btn k-method', type: 'button', 'data-testid': 'method-' + id, dataset: { method: id },
            onclick: () => { closeLayer(); startStep(s.id, id) }
          },
          ing ? svgBox(ingArt(ing, ms || null), 'k-method-art') : null,
          h('span', { class: 'k-method-name' }, METHOD[id] || id))
        })))
      } else {
        kids.push(h('button', { class: 'btn btn-primary', type: 'button', 'data-testid': 'step-start', onclick: () => { closeLayer(); startStep(s.id, null) } }, 'Tự tay làm'))
      }
      if (s.canAuto && !retrying) {
        const score = (D().BALANCE && D().BALANCE.autoStepScore) || 80
        kids.push(h('button', { class: 'btn btn-ghost', type: 'button', 'data-testid': 'auto-step', onclick: () => onAuto(s.id) }, `Tự làm (${score} điểm)`))
      }
    }
    kids.push(h('button', {
      class: 'btn btn-ghost k-sheet-close', type: 'button', 'data-testid': 'sheet-close',
      onclick: () => { if (cook && cook.activeStepId === s.id) ui.dismissed = s.id; closeLayer() }
    }, 'Để sau'))
    showLayer('sheet', h('div', { class: 'k-sheet', 'data-testid': 'step-sheet', role: 'dialog' }, kids))
  }

  function onAuto(stepId) {
    closeLayer()
    const r = autoStep(S(), stepId, cctx())
    if (!r.ok) { toast('Chưa tự làm được bước này.'); return }
    save()
    render()
    flash(r.score, r.grade, 'Tự làm')
  }

  function onRetry(stepId) {
    closeLayer()
    const r = retryStep(S(), stepId, cctx())
    if (!r.ok) { toast(r.reason === 'het_luot' ? 'Hết lượt làm lại rồi.' : 'Không làm lại được bước này.'); render(); return }
    save()
    render()
    const step = getStep(S(), stepId)
    if (step && step.method) {
      const s = boardSteps(S(), cctx()).find(x => x.id === stepId)
      if (s) { openSheet(s, { retrying: true }); return }
    }
    startStep(stepId, null)
  }

  // ctx của mini-game. extra: { method, progress } (bước Thớt) — progress = stepProgress (chấm bước ở đầu sân khấu).
  function pluginCtx(step, cook, recipe, { method = null, progress = null } = {}) {
    const st = S()
    const sh = SH()
    const d = D()
    // bước Chọn: chưa có bảng bước trên Thớt (cook.board dựng lúc chốt rổ) → N đếm từ công thức (cùng ghi chú, số phần)
    const prog = progress || (step.type === 'chon'
      ? { index: 1, total: effectiveSteps(recipe || {}, cook.notes, null, cook.qty).filter(s => s.type !== 'chon').length + 1, grades: [] }
      : stepProgress(cook, step.id))
    return {
      app, recipe, data: d, notes: cook.notes.slice(), qty: cook.qty,
      zoneMul: zoneMul(st, step.type, cook.recipeId, d.BALANCE, d.UPGRADES),
      assist: !!(st.settings && st.settings.assistMotion),
      // Nấu thử: không tính giờ thật sự (không tự kết thúc bước, không phạt quá giờ) và có "tay chỉ" (gợi ý ngay)
      untimed: !!tasting, guide: !!tasting,
      slowBurn: !!(st.upgrades && st.upgrades.chao_chong_dinh),
      rand: uiRand(hashKey([st.seed, sh.day, cook.ticketId, cook.lineIndex, step.id].join(':'))),
      // M5: hiệu ứng dùng chung của app (không tự tạo), câu hỏi giảm chuyển động, chấm bước "Bước k/N", cách sơ chế đã chọn
      vfx: vfx(), reduced,
      stepIndex: prog.index, stepTotal: prog.total, stepGrades: prog.grades,
      method: method || null
    }
  }

  // Chơi một bước trên thớt: thẻ vào bước (đầy đủ: chờ chạm hoặc 1,1 giây; gọn: không chờ) rồi mount mini-game phủ panel.
  function startStep(stepId, method) {
    const step = beginStep(S(), stepId)
    if (!step) { toast('Bước này chưa mở.'); render(); return }
    ui.dismissed = null
    save()
    syncFocus()
    // con dấu nổi của bước trước (Chọn, Tự làm) thuộc về Thớt: bắt đầu bước mới thì dọn ngay, không để nó đè ruy băng
    // "Bước k/N" của thẻ vào bước hay dòng hướng dẫn trên sân khấu
    clear(flashHost)
    const sh = SH()
    const cook = sh.cook
    const recipe = recipeOf(cook.recipeId)
    const notes = noteLabels(recipe, cook.notes)
    const stage = h('div', { class: 'mg-stage' })
    // data-type: loại mini-game (CSS gọn đầu sân khấu ở màn thấp — css/kitchen.css)
    const wrap = h('div', { class: 'k-stage-wrap', dataset: { type: step.type } },
      h('div', { class: 'k-stage-bar' },
        h('span', { class: 'k-stage-dish' }, recipe ? recipe.name : ''),
        method ? h('span', { class: 'k-stage-method' }, (D().METHOD_LABELS || {})[method] || method) : null,
        notes.length ? h('span', { class: 'k-notes' }, notes.map(n => h('span', { class: 'k-note' }, upper(n)))) : null),
      stage)
    showLayer('stage', wrap)
    const token = ++ui.token
    ui.play = { kind: 'step', handle: null, token, stepId }
    // sân khấu đã phủ Thớt: báo loại màn nấu 'stage' (data-cook) trước khi dựng mini-game
    syncFocus()
    const progress = stepProgress(cook, step.id)

    const full = stepCardFull(step, S(), { recipeId: cook.recipeId, tasting: !!tasting })
    const go = () => {
      if (destroyed || !ui.play || ui.play.token !== token) return
      ui.card = null
      if (ui.layerKind === 'card') ui.layerKind = 'stage'
      if (full) markTypeSeen(step.type)
      const handle = playStep(stage, playable(step), pluginCtx(step, cook, recipe, { method, progress }))
      markLayer()   // thẻ vào bước vừa nhường chỗ cho mini-game (nút Xong có thể nằm ngay dưới ngón tay)
      revealTargets(stage)
      ui.play.handle = handle
      handle.result.then(res => {
        if (!res || destroyed || !ui.play || ui.play.token !== token) return
        ui.play = null
        onStepResult(step, method, res, stage, wrap)
      })
    }
    const model = stepCardModel(step, { index: progress.index, total: progress.total, data: D(), recipe })
    const card = createStepCard(model, { full, onStart: go, reduced, stage })
    ui.card = card
    wrap.appendChild(card.el)
    // thẻ đầy đủ đang chờ chạm: hướng dẫn lần đầu có thể chỉ vào thẻ (tourSpot 'card-<loại>')
    if (full) ui.layerKind = 'card'
  }

  // Có kết quả bước: lưu ngay, giữ sân khấu cho con dấu + Dì Sáu (~700 ms), rồi đóng lớp, vẽ lại Thớt, hỏi lại nếu bước
  // chí mạng Hỏng.
  function onStepResult(step, method, res, stage, wrap) {
    const r = submitStep(S(), step.id, { score: res.score, method: method || undefined, details: res.details }, cctx())
    if (!r.ok) { closeLayer(); toast('Không lưu được bước này.'); render(); return }
    save()
    markLayer()
    // sân khấu thôi nhận chạm trong lúc con dấu hiện (cú click của lần chạm vừa kết thúc bước không rơi vào đâu cả)
    wrap.classList.add('is-result')
    vibrate(r.score < 50 ? 80 : 15)
    if (r.score < 50) sound('error')
    const red = reduced()
    let shown = null
    try {
      const sh = SH()
      const cook = sh && sh.cook
      shown = showStepResult(stage, {
        score: r.score, label: r.grade, note: r.methodWrong ? 'Sai cách −15' : '', data: D(),
        rand: uiRand(hashKey([S().seed, sh ? sh.day : 0, cook ? cook.ticketId : '', step.id, 'react', r.score].join(':'))),
        vfx: vfx(), sound: n => sound(n), reduced: red
      })
    } catch (err) { console.error(err) }
    const holdMs = shown ? shown.holdMs : 0
    const pending = { step, score: r.score, timer: 0, idle: 0, pre: null }
    ui.result = pending
    pending.timer = setTimeout(() => finishResult(pending), holdMs)
    // Dựng sẵn Thớt (chưa gắn) trong một quãng rảnh giữa các khung hình lúc con dấu còn giữ sân khấu, để khung hình đóng
    // sân khấu không phải dựng cả Thớt (máy yếu: cú khựng ngay sau mỗi con dấu). Chỉ dựng khi khung hình còn đủ thời gian
    // rảnh — không giành thời gian của hạt / Dì Sáu đang chạy; không kịp thì lúc đóng vẽ như thường.
    if (holdMs > 200 && typeof requestIdleCallback === 'function') {
      pending.idle = requestIdleCallback(dl => {
        pending.idle = 0
        if (ui.result !== pending || pending.pre) return
        if (!dl || dl.didTimeout || dl.timeRemaining() < PREBUILD_IDLE_MS) return
        pending.pre = prebuildBoard()
      }, { timeout: holdMs - 120 })
    }
  }

  function cancelIdle(p) {
    if (p && p.idle && typeof cancelIdleCallback === 'function') cancelIdleCallback(p.idle)
    if (p) p.idle = 0
  }

  function finishResult(pending) {
    if (!pending || ui.result !== pending) return
    ui.result = null
    clearTimeout(pending.timer)
    cancelIdle(pending)
    const pre = pending.pre
    pending.pre = null
    closeLayer()
    if (destroyed) return
    showPrebuilt(pre)
    if (pending.step.critical && pending.score < 50) criticalPrompt(pending.step)
  }

  // Bước chí mạng Hỏng: Làm lại (tốn tiền) / Bỏ món / Để vậy.
  function criticalPrompt(step) {
    ui.pendingCritical = null
    const s = boardSteps(S(), cctx()).find(x => x.id === step.id)
    const cost = Math.max(0, Number(step.retryCost) || 0)
    const kids = [
      svgBox(DI_SAU.lo, 'k-disau-face'),
      h('h3', { class: 'k-sheet-title' }, `${step.label} hỏng rồi!`),
      h('p', null, 'Món sẽ bị tính Hỏng nếu để vậy.')
    ]
    if (s && s.canRetry) {
      kids.push(h('button', { class: 'btn btn-primary', type: 'button', 'data-testid': 'retry-step', onclick: () => onRetry(step.id) },
        cost ? `Làm lại (tốn ${formatVND(cost)})` : 'Làm lại'))
    }
    kids.push(h('button', { class: 'btn btn-danger', type: 'button', 'data-testid': 'abandon-dish', onclick: () => { closeLayer(); onAbandon(true) } }, 'Bỏ món'))
    kids.push(h('button', { class: 'btn btn-ghost', type: 'button', 'data-testid': 'prompt-close', onclick: closeLayer }, 'Để vậy'))
    showLayer('prompt', h('div', { class: 'k-sheet k-critical', 'data-testid': 'critical-prompt', role: 'dialog' }, kids))
  }

  // Bước chí mạng Hỏng mà lúc đó người chơi đổi tab (con dấu đang hiện): hỏi lại khi quay về, nếu bước vẫn Hỏng.
  function flushPendingCritical() {
    const step = ui.pendingCritical
    ui.pendingCritical = null
    if (!step || ui.layerKind || ui.play) return
    const sh = SH()
    const cook = sh && sh.cook
    const r = cook && cook.phase === 'thot' && cook.steps && cook.steps[step.id]
    if (r && r.score < 50 && mode() === 'thot') criticalPrompt(step)
  }

  async function confirmBox({ title, text, ok, cancel = 'Quay lại', danger = false }) {
    if (typeof app.modal === 'function') {
      try {
        const v = await app.modal({
          title, text,
          actions: [
            { label: cancel, value: false, kind: 'ghost', testid: 'confirm-cancel' },
            { label: ok, value: true, kind: danger ? 'danger' : 'primary', testid: 'confirm-ok' }
          ]
        })
        return v === true
      } catch { /* dùng hộp dự phòng */ }
    }
    return new Promise(resolve => {
      const done = v => { closeLayer(); resolve(v) }
      showLayer('confirm', h('div', { class: 'k-sheet', 'data-testid': 'confirm', role: 'dialog' },
        h('h3', { class: 'k-sheet-title' }, title), h('p', null, text),
        h('button', { class: danger ? 'btn btn-danger' : 'btn btn-primary', type: 'button', 'data-testid': 'confirm-ok', onclick: () => done(true) }, ok),
        h('button', { class: 'btn btn-ghost', type: 'button', 'data-testid': 'confirm-cancel', onclick: () => done(false) }, cancel)))
    })
  }

  async function onFinish() {
    if ((ui.play && ui.play.kind === 'step') || ui.result) return
    const ctx = cctx()
    const undone = boardSteps(S(), ctx).filter(s => !s.done)
    if (undone.length) {
      const ok = await confirmBox({
        title: 'Ra món luôn?',
        text: `Còn ${undone.length} bước chưa làm, mỗi bước tính 0 điểm.`,
        ok: 'Vẫn ra món', cancel: 'Làm tiếp'
      })
      if (!ok || destroyed) return
    }
    const sh = SH()
    const cook = sh && sh.cook
    if (!cook || cook.phase !== 'thot') return
    const recipe = recipeOf(cook.recipeId)
    // bảng ra món sắp mở: thông báo nổi do chính lần ra món sinh ra (tiến độ việc, chuỗi…) chờ tới khi bảng đóng
    revealNotice(true)
    const dish = finishDish(S(), ctx)
    if (!dish) { revealNotice(false); toast('Chưa ra món được.'); return }
    save()
    const mood = moodForGrade(dish.grade)
    ui.lastDish = {
      ticketId: cook.ticketId, lineIndex: cook.lineIndex, recipeId: cook.recipeId,
      name: recipe ? recipe.name : cook.recipeId, dish, mood, comment: dishComment(dish, recipe, D())
    }
    ui.showRail = false
    ui.openTicket = null
    // Cú chạm "Ra món" chia thành các task ngắn (máy yếu: một task 120–240 ms là đứng hình thấy rõ): task này chỉ chấm và
    // lưu món; task kế dựng bảng ra món; task sau nữa vẽ dây phiếu bên dưới lớp phủ (bỏ Thớt, dựng phiếu). Trong lúc chờ,
    // update() không vẽ lại (railPending). Chế độ tập trung giữ nguyên tới khi bảng đóng (focusWanted) nên bố cục màn ca
    // bán không đổi dưới lớp phủ.
    ui.railPending = true
    nextTask(() => {
      if (destroyed) return
      // panel vừa bị ẩn (đổi tab ngay sau cú chạm): không mở bảng, kết quả món vẫn ở dây phiếu
      if (!ui.visible) { ui.railPending = false; revealNotice(false); return }
      const shownMs = showReveal()
      if (ui.reveal) nextTask(() => { if (!destroyed && ui.railPending) { ui.railPending = false; if (ui.visible) render() } })
      else { render(); revealNotice(false) }
      if (tasting && typeof tasting.onDone === 'function') {
        setTimeout(() => { if (!destroyed) tasting.onDone(dish) }, shownMs + 150)
      }
    })
  }

  // Bảng ra món (lớp nổi): tự đóng sau revealMs (2,2 s; giảm chuyển động 1,4 s), chạm để bỏ qua. → thời gian hiện (ms).
  function showReveal() {
    const d = ui.lastDish
    const red = reduced()
    if (!d) return revealMs(red)
    clear(flashHost)
    const recipe = recipeOf(d.recipeId) || {}
    const lvUp = d.dish.mastery && d.dish.mastery.levelUp
    const lvNames = (D().STRINGS && D().STRINGS.masteryLevels) || {}
    let rv = null
    try {
      rv = createDishReveal({
        dish: d.dish, recipe, name: d.name, mood: d.mood, comment: d.comment, data: D(), reduced: red,
        lvUpText: lvUp ? `Lên cấp thạo món: ${lvNames[d.dish.mastery.levelAfter] || d.dish.mastery.levelAfter}` : '',
        vfx: vfx(), sound: n => sound(n),
        onClose: () => { if (ui.reveal === rv && ui.layerKind === 'reveal') closeLayer() }
      })
    } catch (err) { console.error(err) }
    if (!rv) return revealMs(red)
    showLayer('reveal', rv.el)
    ui.reveal = rv
    rv.play()
    vibrate(d.dish.grade === 'hong' ? 80 : 15)
    const ms = rv.plan && rv.plan.totalMs ? rv.plan.totalMs : revealMs(red)
    clearTimeout(ui.revealTimer)
    ui.revealTimer = setTimeout(() => { if (ui.layerKind === 'reveal' && ui.reveal === rv) closeLayer() }, ms)
    return ms
  }

  async function onAbandon(skipConfirm = false) {
    const cook = SH() && SH().cook
    if (!cook || cook.phase === 'xong') return
    if (skipConfirm !== true) {
      const cost = cook.cost ? cook.cost.cogs + cook.cost.waste : 0
      const ok = await confirmBox({
        title: 'Bỏ món này?',
        text: cost ? `Nguyên liệu đã lấy (${formatVND(cost)}) thành hao hụt, phiếu quay lại dây.` : 'Phiếu quay lại dây, khách vẫn đang chờ.',
        ok: 'Bỏ món', cancel: 'Làm tiếp', danger: true
      })
      if (!ok || destroyed) return
    }
    stopPlay()
    // bỏ món: phiên nấu (kèm rổ dở cook.chonDraft) bị xóa; số lần chọn nhầm của dòng (giữa bước Chọn hay đã chốt, bỏ trên
    // Thớt) được ghi lại vào phiếu (ticket.chonMistakes) nên mở lại dòng này không về 0
    const r = abandonDish(S(), cctx())
    if (!r.ok) return
    save()
    ui.showRail = false
    toast(r.waste ? `Đã bỏ món, hao hụt ${formatVND(r.waste)}` : 'Đã bỏ món')
    render()
  }

  function onServe(ticketId) {
    const sh = SH()
    const t = sh && sh.tickets.find(x => x.id === ticketId)
    if (!t) return
    const customerId = t.customerId
    const sheet = serveTicket(S(), ticketId, cctx())
    if (!sheet) { toast('Phiếu chưa xong hết món.'); return }
    save()
    sound('bell')
    if (ui.lastDish && ui.lastDish.ticketId === ticketId) ui.lastDish = null
    try { app.bus && app.bus.emit('kitchen.served', { ticketId, customerId, sheet }) } catch (err) { console.error(err) }
    render()
  }

  // Màn thấp (360×600–640 trong ca thật, ca đông khách): nội dung sân khấu cao hơn panel nên sân khấu cuộn, thanh chân dính
  // đáy. Mở bước thì cuộn sẵn vừa đủ để mọi mục tiêu rời (vết bẩn của bước Chà, chai của bước Nêm) nằm trọn phía trên thanh
  // chân, không phải tự vuốt tìm; không đẩy mục tiêu cao nhất khuất đầu sân khấu. Chỉ cuộn: vị trí, kích thước mục tiêu và
  // cách chơi giữ nguyên (đầu sân khấu — tên món, hướng dẫn — có thể khuất một phần, vuốt xuống để xem lại).
  function revealTargets(stage) {
    try {
      const foot = stage.querySelector(':scope > .mg-foot')
      const targets = stage.querySelectorAll('.cha-spot, .cham-bottle')
      if (!foot || !targets.length || stage.scrollHeight <= stage.clientHeight + 1) return
      const footTop = foot.getBoundingClientRect().top
      const stageTop = stage.getBoundingClientRect().top
      let lo = Infinity
      let hi = -Infinity
      for (const t of targets) {
        const r = t.getBoundingClientRect()
        lo = Math.min(lo, r.top)
        hi = Math.max(hi, r.bottom)
      }
      const need = Math.ceil(hi + 4 - footTop)
      const room = Math.floor(lo - 4 - stageTop)
      if (need > 0 && room > 0) stage.scrollTop += Math.min(need, room)
    } catch (err) { console.error(err) }
  }

  // ---------- lớp phủ ----------
  // kind: 'stage' (sân khấu mini-game, trong panel) | 'sheet' | 'prompt' | 'confirm' | 'reveal' (lớp nổi của app)
  // (thẻ vào bước nằm trên lớp sân khấu: ui.layerKind 'card' khi thẻ đầy đủ đang chờ chạm, lớp vẫn data-kind="stage")
  function showLayer(kind, node) {
    clearTimeout(ui.revealTimer)
    markLayer()
    if (kind !== 'stage') clear(flashHost)   // nhãn nổi không che hộp thoại
    const target = kind === 'stage' ? layer : popLayer
    hideLayer(target === layer ? popLayer : layer)
    const hadReveal = !!ui.reveal && kind !== 'reveal'
    if (ui.reveal && (target === popLayer || hadReveal)) { const rv = ui.reveal; ui.reveal = null; rv.destroy() }
    clear(target)
    target.appendChild(node)
    target.hidden = false
    target.dataset.kind = kind
    ui.layerKind = kind
    if (hadReveal) afterReveal()
  }

  function hideLayer(node) {
    clear(node)
    node.hidden = true
    delete node.dataset.kind
  }

  function closeLayer() {
    clearTimeout(ui.revealTimer)
    markLayer()
    if (ui.result) {
      // đóng giữa lúc con dấu đang hiện (đổi tab, bỏ món…): kết quả đã lưu; bước chí mạng Hỏng thì hỏi lại khi quay về
      const p = ui.result
      ui.result = null
      clearTimeout(p.timer)
      cancelIdle(p)
      p.pre = null
      if (p.step.critical && p.score < 50) ui.pendingCritical = p.step
    }
    if (ui.card) { const c = ui.card; ui.card = null; c.destroy() }
    if (ui.play && ui.play.kind === 'step') stopPlay()
    const hadReveal = !!ui.reveal
    if (ui.reveal) { const rv = ui.reveal; ui.reveal = null; rv.destroy() }
    hideLayer(layer)
    hideLayer(popLayer)
    ui.layerKind = null
    if (hadReveal) afterReveal()
  }

  // Bảng ra món vừa đóng (hết giờ, chạm, bị lớp khác thay): dây phiếu còn chờ vẽ thì vẽ ngay (trước khi lớp phủ biến mất
  // ở khung hình này), tắt chế độ tập trung nếu không còn nấu, rồi mới báo màn ca bán thả thông báo đang chờ.
  function afterReveal() {
    if (destroyed) return
    if (ui.railPending && ui.visible) render()
    else syncFocus()
    revealNotice(false)
  }

  // Báo màn ca bán: bảng ra món sắp mở / đã đóng (giữ thông báo nổi trong lúc bảng hiện, mọi cỡ khung).
  let noticeHeld = false
  function revealNotice(on) {
    const want = !!on && !tasting
    if (want === noticeHeld || !onReveal) { noticeHeld = want; return }
    noticeHeld = want
    try { onReveal(want) } catch (err) { console.error(err) }
  }

  function stopPlay() {
    const p = ui.play
    ui.play = null
    // giữ rổ đang chọn dở (về dây phiếu, đổi tab) để mở lại không phải chọn từ đầu (mỗi lần chạm đã lưu, đây là chốt cuối)
    if (p && p.kind === 'chon' && p.handle && typeof p.handle.snapshot === 'function') {
      try { saveChonDraft(S(), p.handle.snapshot(), cctx()) } catch (err) { console.error(err) }
    }
    if (p && p.handle) { try { p.handle.destroy() } catch (err) { console.error(err) } }
  }

  // Con dấu nổi (không bắt chờ): kết quả bước Chọn và bước Tự làm — không có sân khấu để giữ nên dấu nằm ở đầu panel Bếp.
  function flash(score, label, note = '') {
    clear(flashHost)
    const red = reduced()
    const n = createStamp({ score, label, note })
    n.classList.add('k-flash')
    flashHost.appendChild(n)
    try { playStamp(n, { vfx: vfx(), sound: x => sound(x), reduced: red }).catch(() => {}) } catch { /* bỏ qua */ }
    vibrate(score < 50 ? 80 : 15)
    setTimeout(() => n.remove(), red ? FLASH_MS_REDUCED : FLASH_MS)
  }

  function updateWaitColors() {
    const sh = SH()
    if (!sh) return
    for (const t of sh.tickets) {
      const lv = t.status === 'xong' ? 'green' : waitLevel(waitRatio(sh, t))
      const nodes = el.querySelectorAll(`[data-ticket-id="${t.id}"]`)
      for (const n of nodes) if (n.dataset.wait !== lv && n.dataset.wait !== undefined) n.dataset.wait = lv
    }
  }

  // Bước đang dở (tải lại / chuyển tab) → chơi lại từ đầu.
  function resumeActive() {
    const sh = SH()
    const cook = sh && sh.cook
    if (!cook || cook.phase !== 'thot' || !cook.activeStepId || ui.play || ui.layerKind) return
    if (ui.showRail || ui.dismissed === cook.activeStepId) return
    const s = boardSteps(S(), cctx()).find(x => x.id === cook.activeStepId)
    if (!s || s.done) return
    if (s.method) openSheet(s, { retrying: true })
    else startStep(s.id, null)
  }

  // ---------- hướng dẫn lần đầu (tour) / bảng Hướng dẫn ----------
  // Chỗ đang làm ở Bếp cho màn ca bán chọn tour: null khi đang bận (mini-game, bảng chọn cách, hộp hỏi, công bố món) để
  // hướng dẫn không chen ngang; 'card-<loại>' (thẻ vào bước đầy đủ đang chờ chạm) | 'chon' | 'thot' | 'ready' (có phiếu đủ
  // món chờ giao) | 'line' | 'rail' (dây phiếu có phiếu).
  function busy() {
    return !!(ui.layerKind || (ui.play && ui.play.kind === 'step') || ui.result || ui.railPending)
  }
  function tourSpot() {
    if (destroyed || !ui.visible || tasting) return null
    if (ui.layerKind === 'card' && ui.card && ui.card.waiting && ui.card.model) return 'card-' + ui.card.model.type
    if (busy()) return null
    const m = mode()
    if (m === 'chon') return ui.play && ui.play.kind === 'chon' ? 'chon' : null
    if (m === 'thot') return 'thot'
    if (m !== 'rail') return null
    const sh = SH()
    if (!sh || !sh.tickets.length) return null
    if (sh.tickets.some(t => t.status === 'xong')) return 'ready'
    // phiếu đang mở có dòng chưa làm (có nút "Làm món này" / "Làm tiếp")
    const open = ui.openTicket ? sh.tickets.find(t => t.id === ui.openTicket) : null
    if (open && open.lines.some((l, i) => !(open.done && open.done[i]))) return 'line'
    return 'rail'
  }
  // Tour hoặc bảng Hướng dẫn đang mở (ca tạm dừng): bước Chọn giữ đồng hồ đứng yên (không tính quá giờ lúc đọc); thẻ vào
  // bước đang chờ thì dừng tự chạy (hold); bước mini-game đang chơi thì dừng, đóng lại chơi lại từ đầu như khi đổi tab;
  // con dấu đang hiện thì xong luôn. Không vẽ lại bếp trong lúc giữ.
  let guide = null
  function guideHold(on) {
    if (destroyed) return
    if (on) {
      if (guide) return
      if (ui.result) finishResult(ui.result)
      const p = ui.play
      if (p && p.kind === 'chon' && p.handle && typeof p.handle.hold === 'function') {
        p.handle.hold(true)
        guide = { kind: 'chon', handle: p.handle }
      } else if (p && p.kind === 'step' && ui.card && ui.card.waiting) {
        ui.card.hold(true)
        guide = { kind: 'card', card: ui.card }
      } else if (p && p.kind === 'step') {
        closeLayer()
        guide = { kind: 'step' }
      } else guide = { kind: 'none' }
      return
    }
    const g = guide
    guide = null
    if (!g) return
    if (g.kind === 'chon') {
      if (ui.play && ui.play.handle === g.handle) g.handle.hold(false)
    } else if (g.kind === 'card') {
      if (ui.card === g.card && g.card.waiting) g.card.hold(false)
    } else if (g.kind === 'step' && ui.visible) {
      render()
      resumeActive()
    }
  }

  // ---------- vòng đời ----------
  function update() {
    if (destroyed || !ui.visible || guide) return
    const k = computeKey()
    // con dấu đang hiện: Thớt chỉ vẽ lại khi đóng sân khấu (finishResult), để bước "đã xong" hiện cùng lúc với Thớt
    if (k !== ui.key && !ui.result && !ui.railPending) render()
    updateWaitColors()
    const r = reduced()
    el.classList.toggle('is-reduced', r)
    popLayer.classList.toggle('is-reduced', r)
  }

  function onShow() {
    ui.visible = true
    render()
    resumeActive()
    if (ui.pendingCritical) flushPendingCritical()
  }

  function onHide() {
    ui.visible = false
    stopPlay()
    closeLayer()
    syncFocus()
  }

  function selectTicket(ticketId) {
    ui.openTicket = ticketId
    const c = SH() && SH().cook
    // đang nấu dở: hiện dây phiếu (món dở vẫn giữ, bấm "Làm tiếp" để quay lại)
    const playing = !!((ui.play && ui.play.kind === 'step') || ui.result)
    if (c && c.phase !== 'xong' && !playing) ui.showRail = true
    if (ui.visible && !playing) render()
  }

  function unmount() {
    destroyed = true
    for (const off of offs) { try { off() } catch { /* bỏ qua */ } }
    clearTimeout(warmTimer)
    if (ui.result) { clearTimeout(ui.result.timer); cancelIdle(ui.result); ui.result = null }
    if (ui.card) { try { ui.card.destroy() } catch { /* bỏ qua */ } ui.card = null }
    if (ui.reveal) { try { ui.reveal.destroy() } catch { /* bỏ qua */ } ui.reveal = null }
    stopPlay()
    clearTimeout(ui.revealTimer)
    el.remove()
    popLayer.remove()
    if (onFocus && focusSent) { focusSent = false; kindSent = ''; try { onFocus(false, '') } catch (err) { console.error(err) } }
    revealNotice(false)
  }

  // Dây phiếu chung của màn ca bán: chạm phiếu → mở phiếu đó trong bếp.
  if (app.bus && typeof app.bus.on === 'function') {
    const off = app.bus.on('ui.ticket.select', ({ ticketId } = {}) => { if (ticketId) selectTicket(ticketId) })
    if (typeof off === 'function') offs.push(off)
  }

  // Panel có thể đang ẩn lúc mount (tab Quầy): chỉ dựng mini-game khi panel hiện ra (cần kích thước thật).
  ui.visible = el.getClientRects().length > 0
  if (ui.visible) {
    render()
    resumeActive()
  }
  scheduleWarm()
  return { unmount, update, onShow, onHide, selectTicket, tourSpot, busy, guideHold, focusWanted }
}

// Theo quy ước router (mục 13): export default { mount(root, app, params) }.
export default {
  mount(root, app, params = {}) {
    const k = mountKitchen(root, app)
    if (params && params.ticketId) k.selectTicket(params.ticketId)
    return k
  }
}
