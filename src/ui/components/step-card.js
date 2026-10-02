// Thẻ vào bước (M5): thay thẻ gợi ý chữ .k-hint. Ruy băng "Bước k/N", hình nguyên liệu TO (~45% bề ngang) nảy vào,
// động từ cỡ 28px ("Thái dưa leo!"), tay mẫu diễn cử chỉ lặp, nút "Chạm để bắt đầu" và vạch đếm ngược tự chạy.
// Chạm bất kỳ đâu trên thẻ (pointerdown) là vào bước ngay; không chạm thì tự vào sau autoMs (mặc định 1.100 ms).
// Bản gọn (full = false, từ lần nấu thứ 3): chỉ một ruy băng nhỏ trôi qua đầu sân khấu, không chờ.
// stepCardModel thuần (test Node); createStepCard dựng DOM (chỉ gọi trong trình duyệt). Import trong Node an toàn.
import { h, svgBox } from '../dom.js'
import { artV2, propV2 } from '../art/v2.js'
import { hintFor } from '../minigames/index.js'
import { isReduced } from '../motion.js'
import { MINIGAME_TYPES } from '../../data/minigame-types.js'

// Cử chỉ của từng loại bước (tay mẫu diễn theo đây).
export const GESTURE_BY_TYPE = Object.freeze({
  chon: 'tap', cha: 'rub', thai: 'drag-cut', cham: 'tap', lua: 'tap-zone', rot: 'hold',
  dap: 'tap-swipe', xoay: 'circle', got: 'swipe-down', lac: 'shake', bay: 'drag'
})

export const STEP_CARD_AUTO_MS = 1100

// Từ nối thường đứng sau động từ chính; cắt ở đây cho động từ gọn ("Chế nước sôi vào phin" → "Chế nước sôi!").
const CUT_WORDS = ['vào', 'cho', 'lên']

/** Động từ ngắn của bước từ nhãn: phần trước dấu phẩy, bỏ phần sau từ nối, tối đa 4 chữ, thêm "!". */
export function stepVerb(label) {
  let s = String(label || '').split(/[,;:(]/)[0].trim()
  if (!s) return ''
  let words = s.split(/\s+/)
  const cut = words.findIndex((w, i) => i >= 2 && CUT_WORDS.includes(w.toLocaleLowerCase('vi-VN')))
  if (cut > 0) words = words.slice(0, cut)
  if (words.length > 4) words = words.slice(0, 4)
  s = words.join(' ').replace(/[.!?…]+$/, '')
  return s + '!'
}

/**
 * stepCardModel(step, { index, total, data, recipe }) → { ribbon, verb, ingId, gesture, hint, type, label, index, total }.
 * index: số thứ tự bước hiện tại (đếm từ 1, tính cả bước Chọn), total: tổng số bước. ingId: nguyên liệu của bước, không
 * có thì hình riêng của bước (step.icon) hoặc hình món. hint: câu hướng dẫn của loại bước (MINIGAME_TYPES, kể cả lớp vỏ).
 */
export function stepCardModel(step = {}, { index = 1, total = 1, data = null, recipe = null } = {}) {
  const N = Math.max(1, Math.floor(Number(total) || 1))
  const k = Math.min(N, Math.max(1, Math.floor(Number(index) || 1)))
  const type = (step && step.type) || ''
  const label = (step && step.label) || ''
  let hint = ''
  try { hint = hintFor(step || {}, data && data.MINIGAME_TYPES ? data : { MINIGAME_TYPES }).text || '' } catch { hint = '' }
  return {
    ribbon: `Bước ${k}/${N}`,
    verb: (step && step.verb) || stepVerb(label),
    ingId: (step && (step.ing || step.icon)) || (recipe && recipe.icon) || null,
    gesture: GESTURE_BY_TYPE[type] || 'tap',
    hint,
    type,
    label,
    index: k,
    total: N
  }
}

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())

// Phần trang trí riêng của từng cử chỉ (vạch chấm cho thái, vòng chạm cho chạm/giữ…), nằm dưới tay mẫu.
function gestureExtras(gesture) {
  if (gesture === 'drag-cut') return [h('i', { class: 'g-demo-guide' }), h('i', { class: 'g-demo-slash' })]
  if (gesture === 'tap' || gesture === 'tap-zone' || gesture === 'hold' || gesture === 'tap-swipe') return [h('i', { class: 'g-demo-ring' })]
  if (gesture === 'circle') return [h('i', { class: 'g-demo-orbit' })]
  return []
}

/**
 * createStepCard(model, { full = true, onStart, autoMs = 1100, reduced }) → { el, start(), hold(on), destroy(), started }.
 * - el: thẻ đầy đủ div.g-step-card[data-testid="step-hint"] phủ kín khung chứa (khung cần position: relative), con
 *   [step-card-demo] (tay mẫu) và [step-card-go] (nút "Chạm để bắt đầu"); bản gọn: div.g-step-mini[step-card-mini].
 * - Tự vào bước sau autoMs (≤ 0: không tự chạy); bản gọn vào bước ngay ở khung hình kế.
 * - start(): vào bước ngay (gọi onStart đúng 1 lần), thẻ mờ đi rồi tự gỡ. hold(true): dừng tự chạy (vd hướng dẫn lần đầu
 *   đang chỉ vào thẻ), hold(false): chạy tiếp phần thời gian còn lại. destroy(): gỡ ngay, không gọi onStart.
 * - reduced: true/false hoặc hàm; bỏ trống thì hỏi isReduced(). Giảm chuyển động: không nảy, tay mẫu đứng yên.
 */
export function createStepCard(model, { full = true, onStart = null, autoMs = STEP_CARD_AUTO_MS, reduced = null } = {}) {
  const m = model || stepCardModel({})
  const red = typeof reduced === 'function' ? !!reduced() : (reduced === null || reduced === undefined ? isReduced() : !!reduced)
  let started = false
  let destroyed = false
  let held = false
  let timer = 0
  let leaveTimer = 0
  let raf = 0
  let deadline = 0
  let remaining = 0

  function clearAuto() {
    if (timer) { clearTimeout(timer); timer = 0 }
    if (raf && typeof cancelAnimationFrame === 'function') { cancelAnimationFrame(raf); raf = 0 }
  }
  function arm(ms) {
    clearAuto()
    if (!(ms > 0) || !Number.isFinite(ms)) return
    remaining = ms
    deadline = now() + ms
    timer = setTimeout(() => { timer = 0; start() }, ms)
  }

  let el
  if (!full) {
    el = h('div', { class: ['g-step-mini', red ? 'is-reduced' : ''], 'data-testid': 'step-card-mini', 'aria-hidden': 'true' },
      h('b', null, m.ribbon), h('i', null, '·'), h('span', null, m.verb))
  } else {
    const demo = h('div', { class: 'g-step-card-demo', 'data-testid': 'step-card-demo', dataset: { gesture: m.gesture }, 'aria-hidden': 'true' },
      ...gestureExtras(m.gesture),
      h('div', { class: 'g-demo-path' },
        m.gesture === 'drag-cut'
          ? h('div', { class: 'g-demo-knife-wrap' }, svgBox(propV2('dao_lon'), 'g-demo-knife'))
          : null,
        svgBox(propV2('tay'), 'g-demo-hand')))
    const go = h('button', { class: 'g-btn g-btn--go g-step-card-go', type: 'button', 'data-testid': 'step-card-go' }, 'Chạm để bắt đầu')
    const bar = h('div', { class: 'g-step-card-timer', 'aria-hidden': 'true' }, h('i', { style: { animationDuration: Math.max(1, autoMs) + 'ms' } }))
    el = h('div', {
      class: ['g-step-card', red ? 'is-reduced' : '', autoMs > 0 ? '' : 'is-manual'], 'data-testid': 'step-hint',
      dataset: { gesture: m.gesture, type: m.type }, role: 'status'
    },
    h('div', { class: 'g-step-card-panel' },
      h('div', { class: 'g-ribbon g-ribbon--gold g-step-card-ribbon' }, m.ribbon),
      h('div', { class: 'g-step-card-stage' },
        h('i', { class: 'g-step-card-glow', 'aria-hidden': 'true' }),
        svgBox(artV2(m.ingId), 'g-step-card-art'),
        demo),
      h('h3', { class: 'g-title g-step-card-verb' }, m.verb),
      m.hint ? h('p', { class: 'g-step-card-hint' }, m.hint) : null,
      go,
      autoMs > 0 ? bar : null))
    // Chạm bất kỳ đâu (kể cả nút) là vào bước ngay; chặn hành vi mặc định để lần chạm không rơi xuống sân khấu bên dưới.
    el.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); start() })
    go.addEventListener('click', () => start())
  }

  function start() {
    if (started || destroyed) return
    started = true
    clearAuto()
    el.classList.add('is-leaving')
    el.style.pointerEvents = 'none'
    try { if (typeof onStart === 'function') onStart() } catch (err) { console.error(err) }
    leaveTimer = setTimeout(() => { leaveTimer = 0; el.remove() }, full ? (red ? 120 : 220) : (red ? 900 : 1300))
  }

  function hold(on) {
    if (started || destroyed || !full) return
    const want = !!on
    if (want === held) return
    held = want
    el.classList.toggle('is-held', held)
    if (held) {
      if (timer) remaining = Math.max(0, deadline - now())
      clearAuto()
    } else if (autoMs > 0) {
      arm(Math.max(300, remaining || autoMs))
    }
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    clearAuto()
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = 0 }
    el.remove()
  }

  if (full) arm(autoMs)
  else {
    // bản gọn: không chờ — vào bước ở khung hình kế (để thẻ kịp gắn vào khung chứa)
    const kick = () => { raf = 0; start() }
    raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(kick) : 0
    if (!raf) timer = setTimeout(kick, 0)
  }

  return {
    el, start, hold, destroy,
    get started() { return started },
    get held() { return held }
  }
}
