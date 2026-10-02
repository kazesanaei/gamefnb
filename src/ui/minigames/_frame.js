// Khung sân khấu mini-game kiểu M5 (buildFrame2): đầu màn gọn ≤ 44px gồm chuỗi chấm bước tròn (28px; bước hiện tại 1,2×
// có hình nguyên liệu; bước xong có dấu ✓ và viền màu theo hạng), tên bước (ẩn khi chật) và thanh giờ [mg-time];
// dòng hướng dẫn .mg-sub là thẻ giấy nhỏ ở mép trên vùng chơi; vùng chơi .mg-area; chân .mg-foot; lớp hiệu ứng .mg-fx
// (pointer-events: none) phủ cả sân khấu cho con dấu, Dì Sáu phản ứng, chữ nổi.
// Giữ đủ lớp móc của buildFrame cũ (_util.js): .mg-head, .mg-sub, .mg-area, .mg-foot, [data-testid="mg-time"], .mg-time-fill,
// .mg-time.is-late. Import trong Node an toàn (chỉ chạm DOM trong hàm).
import { h, svgBox, clear } from '../dom.js'
import { clamp } from './_util.js'

// Hạng bước → lớp màu viền chấm bước (khóa giống stamp.js gradeKey).
const GRADES = new Set(['hoan_hao', 'tot', 'dat', 'hong'])

/** Mô tả các chấm bước (thuần): [{ n, state: 'done'|'now'|'todo', grade|null }]. index đếm từ 1. */
export function stepDots({ index = 1, total = 1, grades = [] } = {}) {
  const N = Math.max(1, Math.floor(Number(total) || 1))
  const k = Math.min(N, Math.max(1, Math.floor(Number(index) || 1)))
  const out = []
  for (let n = 1; n <= N; n++) {
    const g = grades && grades[n - 1]
    const state = n < k ? 'done' : n === k ? 'now' : 'todo'
    out.push({ n, state, grade: state === 'done' && GRADES.has(g) ? g : null })
  }
  return out
}

const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8.5" fill="#fffaf0" stroke="#3a2618" stroke-width="2.4"/><path d="M12 8.5V13l3 2" fill="none" stroke="#3a2618" stroke-width="2.4" stroke-linecap="round"/><path d="M9.5 2.8h5" stroke="#3a2618" stroke-width="2.4" stroke-linecap="round"/></svg>'

/**
 * buildFrame2(stage, { icon, title, sub, steps: { index, total, grades }, timeLabel, vfx })
 *   → { head, area, foot, fx, subEl, setTime(frac), setSub(text), setSteps(steps), destroy() }
 * icon: chuỗi SVG (hình nguyên liệu) vẽ trong chấm bước hiện tại; steps.grades[i]: hạng của bước i+1 đã xong.
 * timeLabel (tùy chọn): chữ ngắn hiện thay thanh giờ (vd nấu thử không tính giờ); thanh vẫn có [mg-time].
 * vfx (tùy chọn): mỗi lần chạm vùng chơi thì gợn chạm 250 ms (vfx.ripple, giữ khi giảm chuyển động).
 */
export function buildFrame2(stage, { icon = '', title = '', sub = '', steps = null, timeLabel = null, vfx = null } = {}) {
  const dotsBox = h('ol', { class: 'g-dots', 'aria-label': 'Các bước' })
  const timeFill = h('div', { class: 'mg-time-fill' })
  const time = h('div', { class: ['mg-time', 'g-time', timeLabel ? 'has-label' : ''], 'data-testid': 'mg-time' },
    svgBox(CLOCK, 'g-time-ico'),
    timeLabel ? h('span', { class: 'g-time-label' }, timeLabel) : h('span', { class: 'g-time-track' }, timeFill))
  const titleEl = h('div', { class: 'mg-title g-head2-title' }, title || '')
  const head = h('div', { class: 'mg-head g-head2' }, dotsBox, h('div', { class: 'mg-head-text' }, titleEl), time)
  const subEl = h('div', { class: 'mg-sub g-sub2' }, sub || '')
  if (!sub) subEl.hidden = true
  const area = h('div', { class: 'mg-area g-area2' }, subEl)
  const foot = h('div', { class: 'mg-foot g-foot2' })
  const fx = h('div', { class: 'mg-fx', 'aria-hidden': 'true' })
  stage.classList.add('g-frame2')
  // sân khấu dùng lại cho bước mới: bỏ dấu "đã có kết quả" của bước trước (stamp.js gắn; css/fx.css ẩn thẻ hướng dẫn)
  stage.classList.remove('has-result')
  stage.append(head, area, foot, fx)

  function setSteps(st) {
    clear(dotsBox)
    if (!st || !(Number(st.total) > 0)) { dotsBox.hidden = true; head.classList.remove('is-crowded'); return }
    dotsBox.hidden = false
    const list = stepDots(st)
    head.classList.toggle('is-crowded', list.length >= 5)
    for (const d of list) {
      const kids = d.state === 'now' && icon ? svgBox(icon, 'g-dot-ico')
        : d.state === 'done' ? svgBox(TICK, 'g-dot-tick')
          : h('span', { class: 'g-dot-n' }, String(d.n))
      dotsBox.appendChild(h('li', {
        class: ['g-dot', 'is-' + d.state, d.grade ? 'grade-' + d.grade : ''],
        'aria-current': d.state === 'now' ? 'step' : null,
        'aria-label': d.state === 'done' ? `Bước ${d.n}: xong` : `Bước ${d.n}`
      }, kids))
    }
  }
  setSteps(steps)

  const onDown = e => { try { if (vfx && typeof vfx.ripple === 'function') vfx.ripple(e) } catch { /* bỏ qua */ } }
  if (vfx) area.addEventListener('pointerdown', onDown)

  return {
    head, area, foot, fx, subEl,
    setTime(frac) {
      const f = clamp(Number(frac) || 0, 0, 1)
      timeFill.style.transform = `scaleX(${1 - f})`
      time.classList.toggle('is-late', f > 0.75)
    },
    setSub(text) { subEl.textContent = text || ''; subEl.hidden = !text },
    setSteps,
    destroy() { if (vfx) area.removeEventListener('pointerdown', onDown) }
  }
}
