// Màn ra món (M5): tia sáng xoay chậm (10 s/vòng), món phóng 0,4 → 1,1 → 1 trong 450 ms, huy hiệu hạng rơi xuống 400 ms,
// % đếm 0 → q trong 700 ms (âm 'tick'), sao bật cách nhau 120 ms, ruy băng "Không tì vết", pháo giấy khi lên cấp thạo món,
// Dì Sáu và lời góp ý (.k-bubble — e2e đọc). Chạm để bỏ qua. Giảm chuyển động: tĩnh, hiện thẳng. Trang bị ẩn (chuyển ứng
// dụng) giữa chừng thì hiện thẳng trạng thái cuối: không đếm, không phát âm, không bắn hạt khi người chơi không nhìn.
// Hạng thấp có hình riêng: Kém món hơi xỉn màu, Hỏng món sạm lại + khói bốc lên + ruy băng tên xám nâu (css/fx.css).
// data-q và data-grade ghi GIÁ TRỊ CUỐI ngay khi dựng; chỉ chữ % hiển thị mới đếm dần. Mọi hoạt ảnh nằm trên phần tử con,
// hữu hạn, trừ tia sáng và nhịp nhún của món (tắt hẳn khi giảm chuyển động).
// revealPlan thuần (test Node); createDishReveal dựng DOM. Import trong Node an toàn.
import { h, svgBox } from '../dom.js'
import { artV2 } from '../art/v2.js'
import { DI_SAU } from '../art.js'
import { BALANCE } from '../../data/balance.js'
import { isReduced } from '../motion.js'

export const REVEAL_MS = 2200
export const REVEAL_MS_REDUCED = 1400
export const COUNT_MS = 700
export const STAR_GAP_MS = 120
export const MAX_STARS = 5
export const DISH_GRADES = Object.freeze(['tuyet_hao', 'ngon', 'duoc', 'kem', 'hong'])
const HIGH = new Set(['tuyet_hao', 'ngon'])

/** Số sao (1–5) của hạng món theo bảng ngưỡng (BALANCE.gradeThresholds: [ngưỡng, hạng, sao]). */
export function starsOf(grade, thresholds = BALANCE.gradeThresholds) {
  for (const row of thresholds || []) if (row[1] === grade) return Math.max(0, Math.min(MAX_STARS, Number(row[2]) || 0))
  const i = DISH_GRADES.indexOf(grade)
  return i < 0 ? 0 : MAX_STARS - i
}

/**
 * revealPlan(dish, { reduced, thresholds }) → {
 *   grade, q, stars, maxStars, flawless, levelUp, high,
 *   beats: [{ at, kind, i?, on? }] (ms từ lúc hiện, tăng dần), countMs, totalMs
 * }
 * kind: rays | dish | sparkle | badge | land | count | disau | star (i, on) | fanfare | ribbon | levelup | confetti | tap.
 * Thường: tổng REVEAL_MS (2.200 ms); giảm chuyển động: mọi nhịp ở mốc 0, tổng REVEAL_MS_REDUCED (1.400 ms). Thuần.
 */
export function revealPlan(dish = {}, { reduced = false, thresholds = BALANCE.gradeThresholds } = {}) {
  const grade = DISH_GRADES.includes(dish && dish.grade) ? dish.grade : 'duoc'
  const q = Math.max(0, Math.min(100, Math.round(Number(dish && dish.q) || 0)))
  const stars = starsOf(grade, thresholds)
  const flawless = !!(dish && dish.flawless)
  const levelUp = !!(dish && dish.mastery && dish.mastery.levelUp)
  const high = HIGH.has(grade)
  const beats = []
  const add = (at, kind, extra) => beats.push({ at, kind, ...(extra || {}) })
  if (reduced) {
    for (const k of ['rays', 'dish', 'badge', 'count', 'disau']) add(0, k)
    for (let i = 0; i < MAX_STARS; i++) add(0, 'star', { i, on: i < stars })
    if (flawless) add(0, 'ribbon')
    if (levelUp) add(0, 'levelup')
    add(0, 'fanfare')
    add(0, 'tap')
    return { grade, q, stars, maxStars: MAX_STARS, flawless, levelUp, high, beats, countMs: 0, totalMs: REVEAL_MS_REDUCED }
  }
  add(0, 'rays')
  add(0, 'dish')
  if (grade !== 'duoc' && grade !== 'kem') add(420, 'sparkle')
  add(300, 'badge')
  add(700, 'land')
  add(500, 'count')
  add(700, 'disau')
  const starAt = 500 + COUNT_MS
  for (let i = 0; i < MAX_STARS; i++) add(starAt + i * STAR_GAP_MS, 'star', { i, on: i < stars })
  add(starAt, 'fanfare')
  if (flawless) add(starAt + 60, 'ribbon')
  if (levelUp) { add(starAt + 120, 'levelup'); add(starAt + 120, 'confetti') }
  add(1600, 'tap')
  beats.sort((a, b) => a.at - b.at)
  return { grade, q, stars, maxStars: MAX_STARS, flawless, levelUp, high, beats, countMs: COUNT_MS, totalMs: REVEAL_MS }
}

const INK = '#3a2618'
// Huy hiệu hạng: hình + biểu tượng riêng từng hạng (không chỉ khác màu).
const MEDAL = {
  tuyet_hao: { fill: '#f7b928', dark: '#c98a0c', glyph: `<path d="M50 24l6.5 13.2 14.6 2.1-10.5 10.3 2.5 14.5L50 57.3l-13.1 6.8 2.5-14.5-10.5-10.3 14.6-2.1Z" fill="#fff4b8" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` },
  ngon: { fill: '#43a63d', dark: '#2a7a27', glyph: `<path d="M35 44l11 11 20-21" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` },
  duoc: { fill: '#4aa3df', dark: '#2a72a8', glyph: `<circle cx="50" cy="44" r="13" fill="#e6f5ff" stroke="${INK}" stroke-width="3"/><circle cx="50" cy="44" r="5.5" fill="${INK}"/>` },
  kem: { fill: '#f28a1e', dark: '#b65f08', glyph: `<path d="M33 46q8.5-10 17 0t17 0" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>` },
  hong: { fill: '#a9574d', dark: '#743129', glyph: `<path d="M39 33l22 22M61 33L39 55" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>` }
}
function medalSvg(grade) {
  const m = MEDAL[grade] || MEDAL.duoc
  // hai dải ruy băng sau huy hiệu, thân tròn răng cưa (12 răng), vòng trong nét đứt, biểu tượng
  let d = ''
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * i) / 12 - Math.PI / 2
    const r = i % 2 ? 37 : 42
    d += (i ? 'L' : 'M') + (50 + Math.cos(a) * r).toFixed(1) + ' ' + (46 + Math.sin(a) * r).toFixed(1)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112" aria-hidden="true">` +
    `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round">` +
    `<path d="M30 70L20 108L34 100L42 110L50 76Z" fill="#e8483a"/><path d="M70 70L80 108L66 100L58 110L50 76Z" fill="#e8483a"/>` +
    `<path d="${d}Z" fill="${m.dark}" transform="translate(0 4)" stroke="none"/>` +
    `<path d="${d}Z" fill="${m.fill}"/>` +
    `<circle cx="50" cy="46" r="29" fill="none" stroke="rgba(255,255,255,.7)" stroke-dasharray="5 4"/>` +
    `<ellipse cx="36" cy="27" rx="11" ry="5" fill="#fff" opacity=".45" stroke="none" transform="rotate(-30 36 27)"/>` +
    m.glyph + `</g></svg>`
}
// Khói bốc lên từ món hỏng (tĩnh; CSS cho bốc lên một lần lúc huy hiệu rơi): ba sợi khói viền mực + cụm khói tròn.
const SMOKE_PATHS = ['M30 78c-8-8 5-14-1-23s4-14 0-23', 'M51 72c-8-9 6-15 0-25s5-15 0-25', 'M71 80c-6-7 5-12 0-20s4-11 0-17']
const SMOKE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">' +
  `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="${INK}" stroke-width="11">` +
  SMOKE_PATHS.map(d => `<path d="${d}"/>`).join('') + '</g><g stroke="#a39b92" stroke-width="5.5">' +
  SMOKE_PATHS.map(d => `<path d="${d}"/>`).join('') + '</g><g stroke="#d9d3cb" stroke-width="2" opacity=".8">' +
  SMOKE_PATHS.map(d => `<path d="${d}" transform="translate(-1.5 0)"/>`).join('') + '</g></g>' +
  `<g fill="#a39b92" stroke="${INK}" stroke-width="3"><circle cx="29" cy="30" r="7"/><circle cx="51" cy="20" r="8.5"/>` +
  '<circle cx="71" cy="42" r="6"/></g>' +
  '<g fill="#e4dfd8"><circle cx="27" cy="28" r="2.4"/><circle cx="48.5" cy="17.5" r="3"/><circle cx="69.5" cy="40" r="2"/></g></svg>'
// Mũi tên lên cấp (hình, không dùng ký tự ▲ vì phông dự phòng mỗi máy vẽ một kiểu)
const UP_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.8L12.6 11.6H1.4Z" fill="#e8483a" stroke="#3a2618" stroke-width="2" stroke-linejoin="round"/></svg>'
const STAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8l3.1 6.4 7 1-5.1 5 1.2 7L12 17.9l-6.2 3.3 1.2-7-5.1-5 7-1Z" stroke="#3a2618" stroke-width="2" stroke-linejoin="round"/></svg>'

const easeOutCubic = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3)
const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())

function gradeLabelOf(grade, data) {
  const L = (data && data.BALANCE && data.BALANCE.gradeLabels) || BALANCE.gradeLabels
  return L[grade] || grade
}

/**
 * createDishReveal({ dish, recipe, name, mood, comment, lvUpText, data, reduced, vfx, sound, onClose })
 *   → { el, plan, play(opts?), finish(), close(), destroy() }
 * el: div.g-reveal.grade-<hạng> [data-testid="dish-reveal", data-grade, data-q] (giá trị cuối ghi ngay), có .k-bubble.
 * Khung chứa nên có kích thước xác định (vd lớp phủ position:absolute; inset:0); thẻ tự canh giữa và co theo chiều cao.
 * play({ vfx, sound }): chạy nhịp JS (đếm %, âm, hạt, pháo giấy) — gọi ngay sau khi gắn el vào trang. Hoạt ảnh CSS tự
 * chạy khi gắn. Chạm (pointerdown) = bỏ qua: hiện thẳng trạng thái cuối và gọi onClose (nếu có). finish(): chỉ hiện thẳng.
 */
export function createDishReveal({
  dish = {}, recipe = null, name = '', mood = null, comment = '', lvUpText = '', data = null,
  reduced = null, vfx = null, sound: soundFn = null, onClose = null
} = {}) {
  const red = typeof reduced === 'function' ? !!reduced() : (reduced === null || reduced === undefined ? isReduced() : !!reduced)
  const thresholds = (data && data.BALANCE && data.BALANCE.gradeThresholds) || BALANCE.gradeThresholds
  const plan = revealPlan(dish, { reduced: red, thresholds })
  const { grade, q } = plan
  const at = kind => { const b = plan.beats.find(x => x.kind === kind); return b ? b.at : 0 }
  const recipeId = (recipe && recipe.id) || (dish && dish.recipeId) || ''
  const art = artV2((recipe && recipe.icon) || (recipeId ? 'mon_' + recipeId : 'fallback'))
  const yolk = recipe && recipe.rare && recipe.rare.trung_ga_ta ? '#e8730c' : null
  const isRare = !!(recipe && (recipe.baseRecipe || recipe.source === 'hiem'))
  const faceMood = mood || ({ tuyet_hao: 'tu_hao', ngon: 'vui', hong: 'tiec' }[grade] || 'lo')
  const v = (ms) => ({ '--at': ms + 'ms' })

  const qText = h('span', { class: 'g-reveal-q-num' }, String(q))
  const stars = []
  for (let i = 0; i < plan.maxStars; i++) {
    const b = plan.beats.find(x => x.kind === 'star' && x.i === i)
    stars.push(h('span', { class: ['g-reveal-star', i < plan.stars ? 'is-on' : 'is-off'], style: v(b ? b.at : 0), html: STAR_SVG }))
  }
  const hero = h('div', { class: 'g-reveal-hero' },
    h('i', { class: 'g-reveal-rays', 'aria-hidden': 'true', style: v(at('rays')) }),
    h('div', { class: 'g-reveal-dish-wrap', style: v(at('dish')) },
      svgBox(art, 'g-reveal-dish', yolk ? { style: `--yolk:${yolk}` } : {}),
      grade === 'hong' ? h('i', { class: 'g-reveal-soot', 'aria-hidden': 'true' }) : null),
    grade === 'hong' ? svgBox(SMOKE_SVG, 'g-reveal-smoke', { style: v(at('badge')) }) : null,
    h('div', { class: 'g-reveal-badge', style: v(at('badge')) }, svgBox(medalSvg(grade), 'g-reveal-medal')))
  const info = h('div', { class: 'g-reveal-info' },
    h('div', { class: 'g-reveal-gradeline', style: v(at('badge')) },
      h('span', { class: 'g-title g-reveal-grade' }, gradeLabelOf(grade, data)),
      h('span', { class: 'g-title g-reveal-q' }, qText, h('small', null, '%'))),
    h('div', { class: 'g-reveal-stars', role: 'img', 'aria-label': `${plan.stars}/${plan.maxStars} sao` }, stars),
    plan.flawless ? h('div', { class: 'g-ribbon g-ribbon--go g-reveal-flawless', style: v(at('ribbon')) }, 'Không tì vết') : null)
  // Dòng lên cấp là con thứ ba của .g-reveal-main (sau món và cột hạng): khung cao thì nằm dưới cột hạng; khung thấp (món
  // đứng cạnh chữ) thì CSS grid cho nó một hàng riêng đủ rộng để không xuống dòng; khung rất thấp thì vào cột chữ (css/fx.css).
  const lvup = lvUpText
    ? h('div', { class: 'g-pill g-pill--gold g-reveal-lvup', style: v(at('levelup')) }, h('b', { class: 'g-reveal-lvup-ico', 'aria-hidden': 'true', html: UP_SVG }), h('span', null, lvUpText))
    : null
  const el = h('div', {
    class: ['g-reveal', 'grade-' + grade, red ? 'is-reduced' : '', plan.flawless ? 'has-flawless' : '', lvup ? 'has-lvup' : ''],
    'data-testid': 'dish-reveal',
    dataset: { grade, q }, role: 'status', 'aria-label': `${name || ''}: ${gradeLabelOf(grade, data)} ${q}%`
  },
  h('div', { class: 'g-reveal-col' },
    h('div', { class: 'g-reveal-name' },
      h('span', { class: 'g-ribbon g-ribbon--gold g-reveal-title' }, h('span', null, name || (recipe && recipe.name) || '')),
      isRare ? h('span', { class: 'g-badge g-badge--gold g-reveal-rare' }, '★ Hiếm') : null),
    h('div', { class: 'g-reveal-main' }, hero, info, lvup),
    h('div', { class: 'g-reveal-disau', style: v(at('disau')) },
      svgBox(DI_SAU[faceMood] || DI_SAU.vui, 'g-reveal-face'),
      h('div', { class: 'k-bubble g-reveal-bubble' }, comment || '')),
    h('div', { class: 'g-reveal-tap', style: v(at('tap')) }, h('span', null, 'Chạm để tiếp'), h('b', { 'aria-hidden': 'true' }, '›'))))

  let timers = []
  let raf = 0
  let finished = red
  let closed = false
  let destroyed = false
  let opts = { vfx, sound: soundFn }
  let unwatch = null

  const pageHidden = () => { const d = el.ownerDocument; return !!(d && d.visibilityState === 'hidden') }
  // Tên âm viết thẳng trong lời gọi sound('…') để test âm (audio.test) kiểm được tên; trang ẩn thì im lặng.
  const sound = name => {
    const f = opts.sound
    if (typeof f !== 'function' || pageHidden()) return
    try { f(name) } catch { /* bỏ qua */ }
  }
  // Trang bị ẩn giữa chừng → hiện thẳng trạng thái cuối (hủy hẹn giờ đếm %, âm, hạt, pháo giấy).
  function watchVisibility() {
    const d = el.ownerDocument
    if (unwatch || !d || typeof d.addEventListener !== 'function') return
    const onVis = () => { if (d.visibilityState === 'hidden') finish() }
    d.addEventListener('visibilitychange', onVis)
    unwatch = () => { d.removeEventListener('visibilitychange', onVis); unwatch = null }
  }
  const later = (ms, fn) => { const id = setTimeout(() => { timers = timers.filter(x => x !== id); if (!destroyed) fn() }, ms); timers.push(id) }

  function countUp() {
    if (red || q <= 0) { qText.textContent = String(q); return }
    const t0 = nowMs()
    let lastTick = -1
    qText.textContent = '0'
    const step = () => {
      raf = 0
      if (destroyed || finished) return
      const p = Math.min(1, (nowMs() - t0) / plan.countMs)
      qText.textContent = String(Math.round(q * easeOutCubic(p)))
      const tick = Math.floor(p * 7)
      if (tick !== lastTick && p < 1) { lastTick = tick; sound('tick') }
      if (p < 1) raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(step) : 0
    }
    raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(step) : 0
    if (!raf) qText.textContent = String(q)
  }

  function endSound() {
    if (plan.high) sound('fanfare')
    else if (grade === 'hong') sound('error')
    else sound('ding')
  }

  function play(more = {}) {
    opts = { ...opts, ...(more || {}) }
    if (destroyed) return
    if (red) {
      qText.textContent = String(q)
      endSound()
      return
    }
    if (finished) return
    // mở lúc trang đang ẩn: hiện thẳng, không chạy nhịp nào
    if (pageHidden()) { finish(); return }
    watchVisibility()
    // chữ % bắt đầu từ 0 cho tới mốc đếm
    qText.textContent = '0'
    sound('whoosh')
    for (const b of plan.beats) {
      if (b.kind === 'count') later(b.at, countUp)
      else if (b.kind === 'land') later(b.at, () => sound('stamp'))
      else if (b.kind === 'fanfare') later(b.at, endSound)
      else if (b.kind === 'sparkle') {
        later(b.at, () => {
          const fx = opts.vfx
          if (!fx || finished || pageHidden()) return
          try {
            if (grade === 'hong') fx.burst(hero, 'smoke', { n: 5 })
            else fx.burst(hero, 'sparkle', { n: grade === 'tuyet_hao' ? 12 : 8 })
          } catch { /* bỏ qua */ }
        })
      } else if (b.kind === 'confetti') {
        later(b.at, () => { const fx = opts.vfx; if (fx && !finished && !pageHidden()) { try { fx.confetti(hero, 36) } catch { /* bỏ qua */ } } })
      } else if (b.kind === 'star' && b.on && grade === 'tuyet_hao') {
        later(b.at + 80, () => { const fx = opts.vfx; if (fx && !finished && !pageHidden()) { try { fx.burst(stars[b.i], 'sparkle', { n: 3 }) } catch { /* bỏ qua */ } } })
      }
    }
    later(plan.totalMs, () => { finished = true; el.classList.add('is-done'); if (unwatch) unwatch() })
  }

  // Hiện thẳng trạng thái cuối (bỏ qua phần hoạt ảnh còn lại); tia sáng và nhịp nhún vẫn chạy (trừ khi giảm chuyển động).
  function finish() {
    if (unwatch) unwatch()
    if (finished && el.classList.contains('is-done')) return
    finished = true
    for (const id of timers) clearTimeout(id)
    timers = []
    if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf)
    raf = 0
    qText.textContent = String(q)
    el.classList.add('is-done', 'is-skipped')
  }

  function close() {
    if (closed) return
    closed = true
    finish()
    try { if (typeof onClose === 'function') onClose() } catch (err) { console.error(err) }
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    if (unwatch) unwatch()
    for (const id of timers) clearTimeout(id)
    timers = []
    if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf)
    raf = 0
    el.remove()
  }

  el.addEventListener('pointerdown', e => { if (e.button > 0) return; close() })

  return { el, plan, play, finish, close, destroy }
}
