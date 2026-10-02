// Thẻ vào bước (M5): thay thẻ gợi ý chữ .k-hint. Ruy băng "Bước k/N", hình nguyên liệu TO (~45% bề ngang) nảy vào,
// động từ cỡ 28px ("Thái dưa leo!"), tay mẫu diễn cử chỉ lặp, nút "Chạm để bắt đầu" và vạch đếm ngược tự chạy.
// Chạm bất kỳ đâu trên thẻ (pointerdown) là vào bước ngay; không chạm thì tự vào sau autoMs (mặc định 1.100 ms).
// Cú click trình duyệt tự sinh lúc nhấc ngón của chính lần chạm đó bị nuốt (guardNextClick) để không rơi xuống nút
// "Xong" của sân khấu vừa dựng dưới ngón tay (preventDefault ở pointerdown KHÔNG chặn được click trên màn cảm ứng).
// Bản gọn (full = false, từ lần nấu thứ 3): chỉ một ruy băng nhỏ trôi qua đầu sân khấu, không chờ.
// "Bước k/N": N = số bước Thớt + 1 (bước Chọn), k = số bước đã xong + 1 (stepProgress, stepCardModel({ cook })).
// stepProgress, stepCardModel thuần (test Node); createStepCard dựng DOM (chỉ gọi trong trình duyệt). Import trong Node an toàn.
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
// Chặn click ma: chờ click tối đa CLICK_GUARD_MS sau khi nhấc ngón, và không quá CLICK_GUARD_MAX_MS kể từ lúc chạm.
export const CLICK_GUARD_MS = 450
export const CLICK_GUARD_MAX_MS = 4000

/**
 * guardNextClick(target, { pointerId, afterUpMs, maxMs }) → off()
 * Nuốt đúng MỘT cú click kế tiếp (pha capture trên target — nên là window) do lần chạm đang diễn ra sinh ra: gọi
 * preventDefault + stopPropagation để click không tới phần tử mới nằm dưới ngón tay. Hết chặn khi đã nuốt 1 click, khi
 * afterUpMs trôi qua sau lúc nhấc ngón (pointerup/pointercancel cùng pointerId) mà chưa có click (vuốt, nhấn giữ), khi có
 * lần chạm mới (pointerdown khác) hoặc quá maxMs. Click từ bàn phím sau đó không bị ảnh hưởng. Chỉ cần EventTarget.
 */
// Pha capture dạng đối tượng (không dùng `true`: EventTarget của Node không gỡ được bộ nghe đăng ký bằng `true`).
const CAPTURE = Object.freeze({ capture: true })
export function guardNextClick(target, { pointerId = null, afterUpMs = CLICK_GUARD_MS, maxMs = CLICK_GUARD_MAX_MS } = {}) {
  if (!target || typeof target.addEventListener !== 'function') return () => {}
  let done = false
  let tid = 0
  const same = e => pointerId === null || pointerId === undefined || e.pointerId === undefined || e.pointerId === pointerId
  function off() {
    if (done) return
    done = true
    if (tid) { clearTimeout(tid); tid = 0 }
    target.removeEventListener('click', onClick, CAPTURE)
    target.removeEventListener('pointerup', onUp, CAPTURE)
    target.removeEventListener('pointercancel', onUp, CAPTURE)
    target.removeEventListener('pointerdown', onDown, CAPTURE)
  }
  function onClick(e) {
    e.preventDefault()
    e.stopPropagation()
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation()
    off()
  }
  function onUp(e) {
    if (!same(e)) return
    if (tid) clearTimeout(tid)
    tid = setTimeout(off, afterUpMs)
  }
  // lần chạm mới (ngón khác, hoặc ngón cũ đã nhấc rồi chạm lại) → thôi chặn để click của nó đi bình thường
  function onDown() { off() }
  target.addEventListener('click', onClick, CAPTURE)
  target.addEventListener('pointerup', onUp, CAPTURE)
  target.addEventListener('pointercancel', onUp, CAPTURE)
  target.addEventListener('pointerdown', onDown, CAPTURE)
  tid = setTimeout(off, maxMs)
  return off
}

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

// Hạng bước (nhãn lõi hoặc điểm) → khóa màu chấm bước / con dấu ('hoan_hao' | 'tot' | 'dat' | 'hong'), cùng ngưỡng với
// stamp.js gradeKey (≥ 90, ≥ 70, ≥ 50). Viết lại ở đây (không import stamp.js) để thẻ bước không kéo theo phần con dấu.
const KEY_BY_LABEL = Object.freeze({ 'Hoàn hảo': 'hoan_hao', 'Tốt': 'tot', 'Đạt': 'dat', 'Hỏng': 'hong' })
function resultKey(r) {
  if (r && typeof r === 'object') {
    if (KEY_BY_LABEL[r.grade]) return KEY_BY_LABEL[r.grade]
    r = r.score
  }
  const s = Number(r)
  if (!Number.isFinite(s)) return null
  return s >= 90 ? 'hoan_hao' : s >= 70 ? 'tot' : s >= 50 ? 'dat' : 'hong'
}

/**
 * stepProgress(cook, stepId?) → { index, total, done, grades } — tiến độ "Bước k/N" của phiên nấu (thuần, test Node).
 * - N (total) = số bước trên Thớt (cook.board, đã bỏ bước Chọn) + 1 (bước Chọn).
 * - k (index) = số bước đã xong + 1. Bước Chọn tính là xong khi phiên đã sang Thớt (cook.phase !== 'chon') hoặc có
 *   cook.chonScore. Bước đang làm lại (stepId đã có kết quả trong cook.steps) không tính là đã xong, nên k vẫn là vị trí
 *   của chính bước đó. k kẹp trong [1, N].
 * - grades: khóa hạng ('hoan_hao' | 'tot' | 'dat' | 'hong' | null) của các bước đã xong theo thứ tự làm (Chọn trước, rồi
 *   theo thứ tự ghi vào cook.steps) — đưa thẳng vào buildFrame2({ steps: { index, total, grades } }) cho chấm bước.
 * Thiếu cook / board: { index: 1, total: 1 + số bước board (nếu có), done: 0, grades: [] }.
 */
export function stepProgress(cook, stepId = null) {
  const board = cook && Array.isArray(cook.board) ? cook.board.filter(s => s && s.type !== 'chon') : []
  const total = board.length + 1
  if (!cook || typeof cook !== 'object') return { index: 1, total, done: 0, grades: [] }
  const grades = []
  const hasChonScore = cook.chonScore !== null && cook.chonScore !== undefined && Number.isFinite(Number(cook.chonScore))
  const chonDone = (!!cook.phase && cook.phase !== 'chon') || hasChonScore
  if (chonDone) grades.push(resultKey(cook.chonScore))
  const onBoard = new Set(board.map(s => s.id))
  const steps = cook.steps && typeof cook.steps === 'object' ? cook.steps : {}
  for (const [id, r] of Object.entries(steps)) {
    if (!r || id === stepId || (onBoard.size && !onBoard.has(id))) continue
    grades.push(resultKey(r))
  }
  const done = Math.min(total, grades.length)
  return { index: Math.min(total, done + 1), total, done, grades: grades.slice(0, done) }
}

/**
 * stepCardModel(step, { index, total, data, recipe, cook })
 *   → { ribbon, verb, ingId, propId, gesture, hint, type, label, index, total }.
 * index: số thứ tự bước hiện tại (đếm từ 1, tính cả bước Chọn), total: tổng số bước. Không truyền index/total mà có cook
 * (phiên nấu của lõi) thì tự tính "Bước k/N" bằng stepProgress(cook, step.id): N = số bước Thớt + 1, k = số bước xong + 1.
 * ingId: nguyên liệu của bước, không có thì hình riêng của bước (step.icon) hoặc hình món (id chưa có hình thì bỏ qua).
 * propId: đạo cụ lớn theo loại và lớp vỏ (PROP_BY_SKIN; thẻ vẽ đạo cụ nếu art/props.js đã có hình, không thì vẽ ingId).
 * hint: câu hướng dẫn của loại bước (MINIGAME_TYPES, kể cả lớp vỏ).
 */
export function stepCardModel(step = {}, { index = null, total = null, data = null, recipe = null, cook = null } = {}) {
  let idx = index
  let tot = total
  if ((idx === null || idx === undefined || tot === null || tot === undefined) && cook) {
    const p = stepProgress(cook, step && step.id)
    if (idx === null || idx === undefined) idx = p.index
    if (tot === null || tot === undefined) tot = p.total
  }
  const N = Math.max(1, Math.floor(Number(tot) || 1))
  const k = Math.min(N, Math.max(1, Math.floor(Number(idx) || 1)))
  const type = (step && step.type) || ''
  const label = (step && step.label) || ''
  let hint = ''
  try { hint = hintFor(step || {}, data && data.MINIGAME_TYPES ? data : { MINIGAME_TYPES }).text || '' } catch { hint = '' }
  // hình to của thẻ: nguyên liệu → hình riêng của bước → hình món; bỏ qua id chưa có hình (tránh hình dự phòng "?")
  const cands = [step && step.ing, step && step.icon, recipe && recipe.icon].filter(x => typeof x === 'string' && x)
  const skin = (step && step.skin) || ''
  return {
    ribbon: `Bước ${k}/${N}`,
    verb: (step && step.verb) || stepVerb(label),
    ingId: cands.find(hasArt) || cands[0] || null,
    // đạo cụ lớn theo lớp vỏ (tô, ly, chén, bình lắc, rổ): thẻ vẽ đạo cụ làm hình chính nếu đã có hình (art/props.js)
    propId: PROP_BY_SKIN[type + '.' + skin] || PROP_BY_SKIN[type] || null,
    gesture: GESTURE_BY_TYPE[type] || 'tap',
    hint,
    type,
    label,
    index: k,
    total: N
  }
}

// Đạo cụ lớn mà cử chỉ tác động lên (khuấy trong tô/ly/chén, lắc bình/rổ, thả đá vào ly). Thiếu hình đạo cụ thì thẻ
// dùng hình nguyên liệu / hình món như cũ.
export const PROP_BY_SKIN = Object.freeze({
  'xoay.to': 'to_lon', 'xoay.ly': 'ly_lon', 'xoay.chen': 'chen_lon',
  'lac.binh': 'binh_lac_lon', 'lac.ro': 'ro_lon', lac: 'binh_lac_lon',
  'bay.ly': 'ly_lon'
})

// Có hình thật (không phải hình dự phòng "?" của art.js) cho id này không.
let fallbackArt = null
function hasArt(id) {
  if (typeof id !== 'string' || !id) return false
  if (fallbackArt === null) fallbackArt = artV2('\u0000')
  return artV2(id) !== fallbackArt
}

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())

// Mũi tên chỉ hướng của tay mẫu (SVG tin cậy, viền mực, lòng trắng): vạch chấm đi xuống có đầu mũi tên; mũi tên hai đầu
// lên-xuống; đầu mũi tên trên vòng khuấy (chiều kim đồng hồ, khớp chiều tay mẫu chạy).
const ARROW_DOWN = '<svg viewBox="0 0 24 100" preserveAspectRatio="none" aria-hidden="true">' +
  '<path d="M12 6V80" fill="none" stroke="#3a2618" stroke-width="9" stroke-linecap="round"/>' +
  '<path d="M12 6V80" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="7 7"/>' +
  '<path d="M3 76L12 94L21 76Z" fill="#fff" stroke="#3a2618" stroke-width="3" stroke-linejoin="round"/></svg>'
const ARROW_UPDOWN = '<svg viewBox="0 0 24 100" preserveAspectRatio="none" aria-hidden="true">' +
  '<path d="M12 22V78" fill="none" stroke="#3a2618" stroke-width="9" stroke-linecap="round"/>' +
  '<path d="M12 22V78" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>' +
  '<path d="M3 24L12 6L21 24Z" fill="#fff" stroke="#3a2618" stroke-width="3" stroke-linejoin="round"/>' +
  '<path d="M3 76L12 94L21 76Z" fill="#fff" stroke="#3a2618" stroke-width="3" stroke-linejoin="round"/></svg>'
const ORBIT_ARROW = '<svg viewBox="0 0 100 100" aria-hidden="true">' +
  '<path d="M60 22.5L72 28L61 35Z" fill="#fff" stroke="#3a2618" stroke-width="2.6" stroke-linejoin="round"/></svg>'

// Phần trang trí riêng của từng cử chỉ, nằm dưới tay mẫu (under) hoặc đi cùng tay (carry: món được kéo theo):
// thái = vạch chấm + vệt dao; chạm / giữ = vòng chạm; chạm-rồi-vuốt (đập trứng) = vòng chạm + vạch vuốt xuống;
// vẽ vòng (khuấy) = vòng nét đứt + đầu mũi tên; vuốt xuống (gọt) = vạch chấm đi xuống; lên-xuống (lắc) = mũi tên hai đầu;
// kéo thả (bày) = vòng đích nét đứt + món nhỏ đi theo tay.
function gestureExtras(gesture, m) {
  const out = { under: [], carry: [] }
  if (gesture === 'drag-cut') out.under.push(h('i', { class: 'g-demo-guide' }), h('i', { class: 'g-demo-slash' }))
  else if (gesture === 'tap' || gesture === 'tap-zone' || gesture === 'hold') out.under.push(h('i', { class: 'g-demo-ring' }))
  else if (gesture === 'tap-swipe') out.under.push(h('i', { class: 'g-demo-ring' }), svgBox(ARROW_DOWN, 'g-demo-arrow g-demo-arrow--swipe'))
  else if (gesture === 'circle') out.under.push(h('i', { class: 'g-demo-orbit' }), svgBox(ORBIT_ARROW, 'g-demo-orbit-head'))
  else if (gesture === 'swipe-down') out.under.push(svgBox(ARROW_DOWN, 'g-demo-arrow g-demo-arrow--down'))
  else if (gesture === 'shake') out.under.push(svgBox(ARROW_UPDOWN, 'g-demo-arrow g-demo-arrow--updown'))
  else if (gesture === 'drag') {
    out.under.push(h('i', { class: 'g-demo-target' }))
    if (m && m.ingId) out.carry.push(svgBox(artV2(m.ingId), 'g-demo-carry'))
  }
  return out
}

/**
 * createStepCard(model, { full = true, onStart, autoMs = 1100, reduced, stage })
 *   → { el, start(), hold(on), destroy(), full, model, started, held, waiting }.
 * Màn Bếp chọn chế độ (full): món nấu dưới HINT_HIDE_AFTER_COOKS lần thì thẻ đầy đủ, từ đó trở đi bản gọn.
 * - Thẻ đầy đủ: div.g-step-card[data-testid="step-hint"] phủ kín khung chứa (khung cần position: relative, vd .k-stage-wrap),
 *   con [step-card-demo] (tay mẫu diễn cử chỉ của loại bước) và [step-card-go] (nút "Chạm để bắt đầu"). Tự vào bước sau
 *   autoMs (mặc định 1.100 ms; ≤ 0: không tự chạy). Chạm bất kỳ đâu trên thẻ = vào ngay (click ma bị nuốt).
 * - Bản gọn: div.g-step-mini[data-testid="step-card-mini"] (không nhận chạm). Vào bước ngay ở khung hình kế (không chờ);
 *   ngay sau onStart (trò chơi đã dựng) ruy băng chuyển vào giữa đầu sân khấu (.mg-head, thêm lớp .g-head-dock), trôi
 *   ~1,3 s rồi tự gỡ. Bên gọi gắn el vào khung chứa sân khấu (vd .k-stage-wrap) trước khung hình kế — KHÔNG gắn vào chính
 *   .mg-stage (playStep dọn sạch sân khấu lúc dựng) — hoặc truyền stage (phần tử / hàm trả phần tử) để tìm đầu sân khấu.
 * - start(): vào bước ngay (gọi onStart đúng 1 lần), thẻ mờ đi rồi tự gỡ. hold(true): dừng tự chạy (vd hướng dẫn lần đầu
 *   đang chỉ vào thẻ), hold(false): chạy tiếp phần thời gian còn lại (tối thiểu 300 ms). destroy(): gỡ ngay, không gọi onStart.
 * - waiting: thẻ đầy đủ còn đang chờ chạm (cho tourSpot 'card-<loại>'); bản gọn luôn false.
 * - reduced: true/false hoặc hàm; bỏ trống thì hỏi isReduced(). Giảm chuyển động: không nảy, tay mẫu đứng yên.
 */
export function createStepCard(model, { full = true, onStart = null, autoMs = STEP_CARD_AUTO_MS, reduced = null, stage = null } = {}) {
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
    const extra = gestureExtras(m.gesture, m)
    const demo = h('div', { class: 'g-step-card-demo', 'data-testid': 'step-card-demo', dataset: { gesture: m.gesture }, 'aria-hidden': 'true' },
      ...extra.under,
      h('div', { class: 'g-demo-path' },
        m.gesture === 'drag-cut'
          ? h('div', { class: 'g-demo-knife-wrap' }, svgBox(propV2('dao_lon'), 'g-demo-knife'))
          : null,
        ...extra.carry,
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
        svgBox((m.propId && propV2(m.propId)) || artV2(m.ingId), 'g-step-card-art', { dataset: { art: (m.propId && propV2(m.propId)) ? m.propId : (m.ingId || '') } }),
        demo),
      h('h3', { class: 'g-title g-step-card-verb' }, m.verb),
      m.hint ? h('p', { class: 'g-step-card-hint' }, m.hint) : null,
      go,
      autoMs > 0 ? bar : null))
    // Chạm bất kỳ đâu (kể cả nút) là vào bước ngay. Thẻ thôi nhận chạm ngay lúc đó và sân khấu được dựng dưới ngón tay,
    // nên cú click trình duyệt sinh ra lúc nhấc ngón phải được nuốt (guardNextClick) — nếu không nó rơi trúng nút "Xong".
    el.addEventListener('pointerdown', e => {
      if (e.button > 0 || started || destroyed) return
      e.preventDefault()
      const doc = el.ownerDocument
      guardNextClick((doc && doc.defaultView) || doc, { pointerId: e.pointerId })
      start()
    })
    // bàn phím (Enter/Space trên nút) không có pointerdown: vào bước bằng click
    go.addEventListener('click', () => start())
  }

  function start() {
    if (started || destroyed) return
    started = true
    clearAuto()
    el.classList.add('is-leaving')
    el.style.pointerEvents = 'none'
    try { if (typeof onStart === 'function') onStart() } catch (err) { console.error(err) }
    if (!full) dock()
    leaveTimer = setTimeout(() => { leaveTimer = 0; el.remove() }, full ? (red ? 120 : 220) : (red ? 900 : 1300))
  }

  // Bản gọn: sân khấu vừa dựng (onStart mount trò chơi ngay) → chuyển ruy băng vào giữa đầu sân khấu (.mg-head, hàng chấm
  // bước) để nó hiện đúng "trong đầu sân khấu" ở mọi cỡ khung. Không tìm thấy đầu sân khấu thì ruy băng ở lại khung chứa
  // (vị trí dự phòng của css/fx.css). Ruy băng không nhận chạm, tự gỡ sau ~1,3 s.
  function dock() {
    try {
      const st = typeof stage === 'function' ? stage() : stage
      const host = st || el.parentNode
      const head = host && typeof host.querySelector === 'function' ? host.querySelector('.mg-head') : null
      if (!head || el.parentNode === head) return
      head.classList.add('g-head-dock')
      head.appendChild(el)
      el.classList.add('is-docked')
    } catch { /* để nguyên chỗ cũ */ }
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
    el, start, hold, destroy, full: !!full, model: m,
    get started() { return started },
    get held() { return held },
    // thẻ đầy đủ còn đang chờ người chơi chạm (hướng dẫn lần đầu chỉ vào thẻ: tourSpot 'card-<loại>')
    get waiting() { return !!full && !started && !destroyed }
  }
}
