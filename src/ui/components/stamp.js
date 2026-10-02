// Con dấu kết quả bước (M5): dấu cao su đập xuống sân khấu sau mỗi bước, màu theo hạng và LUÔN kèm hình dạng + biểu tượng
// riêng (không chỉ dựa vào màu): Hoàn hảo = huy hiệu răng cưa vàng có sao, Tốt = tròn xanh lá có dấu ✓, Đạt = vuông bo xanh
// dương có chấm tròn, Hỏng = tròn mẻ đỏ xám có dấu ✕.
// gradeKey(score, labels) thuần; createStamp() dựng DOM; playStamp() chạy hoạt ảnh (WAAPI trên PHẦN TỬ CON, hữu hạn) +
// dừng hình + hạt (vfx) + âm. showStepResult() (Đợt 1) gói cả việc cho màn Bếp: dấu + Dì Sáu vào lớp .mg-fx của sân khấu
// thật, canh theo phần sân khấu đang thấy, trả thời gian nên giữ sân khấu (700 / 500 ms). Dấu và Dì Sáu đặt theo lề trên
// sân khấu --g-stage-pt; khung thấp (≤ 380px) dấu neo trên thanh chân .mg-foot (--g-foot-h) — css/fx.css. Import trong Node an toàn.
import { h } from '../dom.js'
import { BALANCE } from '../../data/balance.js'
import { isReduced } from '../motion.js'
import { createDiSauReact } from './disau-react.js'

export const GRADE_KEYS = Object.freeze(['hoan_hao', 'tot', 'dat', 'hong'])
// Màn Bếp giữ sân khấu thêm chừng này sau khi có kết quả bước (con dấu, dừng hình, Dì Sáu) rồi mới đóng lớp (m5-thiet-ke 1.8).
export const RESULT_HOLD_MS = 700
export const RESULT_HOLD_MS_REDUCED = 500

/** Thời gian giữ sân khấu sau kết quả bước: 700 ms, giảm chuyển động 500 ms. */
export function resultHoldMs(reduced = false) {
  return reduced ? RESULT_HOLD_MS_REDUCED : RESULT_HOLD_MS
}
// Nhãn hạng bước → khóa (để nhận đúng cả khi bảng nhãn đổi thứ tự).
const KEY_BY_LABEL = Object.freeze({ 'Hoàn hảo': 'hoan_hao', 'Tốt': 'tot', 'Đạt': 'dat', 'Hỏng': 'hong' })

/**
 * gradeKey(score, labels = BALANCE.stepLabels) → 'hoan_hao' | 'tot' | 'dat' | 'hong'.
 * labels: [[ngưỡng, nhãn], …] giảm dần (mặc định ≥90 Hoàn hảo, ≥70 Tốt, ≥50 Đạt, còn lại Hỏng).
 * Nhãn lạ thì lấy khóa theo thứ tự trong bảng. Điểm lỗi coi như 0.
 */
export function gradeKey(score, labels = BALANCE.stepLabels) {
  const s = Number.isFinite(Number(score)) ? Number(score) : 0
  const list = Array.isArray(labels) && labels.length ? labels : BALANCE.stepLabels
  for (let i = 0; i < list.length; i++) {
    const [min, label] = list[i]
    if (s >= Number(min)) return KEY_BY_LABEL[label] || GRADE_KEYS[Math.min(i, GRADE_KEYS.length - 1)]
  }
  return 'hong'
}

/** Nhãn hiển thị của hạng (theo bảng nhãn); không có thì nhãn mặc định. */
export function gradeText(key, labels = BALANCE.stepLabels) {
  for (const [, label] of labels || []) if (KEY_BY_LABEL[label] === key) return label
  return { hoan_hao: 'Hoàn hảo', tot: 'Tốt', dat: 'Đạt', hong: 'Hỏng' }[key] || ''
}

const INK = '#3a2618'

// Răng cưa cho huy hiệu Hoàn hảo (16 răng), tính sẵn một lần.
function burstPath(cx, cy, r1, r2, n) {
  let d = ''
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2
    const r = i % 2 ? r2 : r1
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1)
  }
  return d + 'Z'
}
// Đường viền mẻ (tròn có vết khuyết) cho dấu Hỏng.
function chippedPath(cx, cy, r) {
  const pts = []
  const n = 36
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n
    const k = (i === 5 || i === 6) ? 0.86 : (i === 22 ? 0.9 : (i === 29 ? 0.93 : 1))
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k])
  }
  return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z'
}

// Hình dấu (viewBox 120): thân màu hạng, vòng trong nét đứt, biểu tượng ở nửa trên.
const SHAPES = {
  hoan_hao: { body: burstPath(60, 60, 57, 49, 16), fill: '#f7b928', dark: '#d99512', light: '#fff0a6', ring: 'circle' },
  tot: { body: 'M60 4A56 56 0 1 1 59.9 4Z', fill: '#43a63d', dark: '#2f8a2c', light: '#8edb6a', ring: 'circle' },
  dat: { body: 'M26 6H94Q114 6 114 26V94Q114 114 94 114H26Q6 114 6 94V26Q6 6 26 6Z', fill: '#4aa3df', dark: '#2f7fb8', light: '#a9dcff', ring: 'square' },
  hong: { body: chippedPath(60, 60, 55), fill: '#b5574b', dark: '#8a3b31', light: '#e59a8f', ring: 'circle' }
}
const ICONS = {
  // ngôi sao 5 cánh
  hoan_hao: `<path d="M60 14l6.2 12.6 13.9 2-10 9.8 2.4 13.8L60 45.7l-12.5 6.5 2.4-13.8-10-9.8 13.9-2Z" fill="#fff4b8" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
  // dấu ✓
  tot: `<path d="M44 31l11 11 22-22" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M44 31l11 11 22-22" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`,
  // chấm tròn trong vòng
  dat: `<circle cx="60" cy="30" r="12" fill="#e6f5ff" stroke="${INK}" stroke-width="3"/><circle cx="60" cy="30" r="5" fill="${INK}"/>`,
  // dấu ✕
  hong: `<path d="M48 20l24 22M72 20L48 42" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M48 20l24 22M72 20L48 42" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".5"/>`
}

/** SVG thân dấu theo hạng (chuỗi tin cậy, không có url/href). */
export function stampSvg(key) {
  const s = SHAPES[key] || SHAPES.dat
  const ring = s.ring === 'square'
    ? '<rect x="16" y="16" width="88" height="88" rx="14" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="3" stroke-dasharray="6 5"/>'
    : '<circle cx="60" cy="60" r="41" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="3" stroke-dasharray="6 5"/>'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" aria-hidden="true">` +
    `<path d="${s.body}" fill="${s.dark}" transform="translate(0 5)"/>` +
    `<path d="${s.body}" fill="${s.fill}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
    `<ellipse cx="42" cy="30" rx="18" ry="8" fill="${s.light}" opacity=".55" transform="rotate(-25 42 30)"/>` +
    ring + (ICONS[key] || '') + `</svg>`
}

/**
 * createStamp({ score, label, note }) → div.g-stamp.grade-<key> [data-testid="step-result", data-score, data-grade].
 * label: nhãn hạng (vd 'Tốt', lấy từ submitStep); không có thì suy từ điểm. note (tùy chọn): dòng phụ nhỏ, vd 'Sai cách −15'.
 * Hoạt ảnh chỉ chạy trên phần tử con .g-stamp-ink (playStamp); phần tử gốc đứng yên để e2e đo được ngay.
 */
export function createStamp({ score = 0, label = '', note = '' } = {}) {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)))
  const key = (label && KEY_BY_LABEL[label]) || gradeKey(s)
  const text = label || gradeText(key)
  const ink = h('div', { class: 'g-stamp-ink' },
    h('span', { class: 'g-stamp-shape', 'aria-hidden': 'true', html: stampSvg(key) }),
    h('span', { class: 'g-stamp-label' }, text),
    h('span', { class: 'g-stamp-score' }, String(s)))
  return h('div', {
    class: ['g-stamp', 'grade-' + key], role: 'status', 'aria-label': `${text} ${s} điểm`,
    'data-testid': 'step-result', dataset: { score: s, grade: key }
  }, ink, note ? h('span', { class: 'g-stamp-note' }, note) : null)
}

const wait = ms => new Promise(r => setTimeout(r, ms))

/**
 * Đánh dấu sân khấu (buildFrame2, .mg-stage.g-frame2) đã có kết quả bước: lớp .has-result ẩn thẻ hướng dẫn .mg-sub để con
 * dấu và Dì Sáu không đè lên chữ (css/fx.css; trình duyệt có :has() thì CSS tự nhận, lớp này cho trình duyệt cũ).
 * buildFrame2 gỡ lớp này mỗi khi dựng bước mới trên cùng sân khấu.
 */
function markResult(el) {
  try {
    const stage = el.closest && el.closest('.mg-stage.g-frame2')
    if (stage) stage.classList.add('has-result')
  } catch { /* bỏ qua */ }
}

/**
 * playStamp(el, { vfx, sound, reduced, shake, starTo }) → Promise (xong khi dấu đã đập và dừng hình xong, ~300 ms).
 * - Dấu đập: phóng 1,6 → 1, xoay −8°, 220 ms (WAAPI trên .g-stamp-ink); chạm mặt thì âm 'stamp' và dừng hình 60 ms.
 * - Hoàn hảo: 10–14 hạt vàng + âm 'sparkle' (+ sao bay về starTo nếu có, vd chấm bước hiện tại). Tốt: 4 hạt. Đạt: không hạt.
 *   Hỏng: khói xám + rung 4px (shake: phần tử rung, mặc định chính con dấu).
 * - Giảm chuyển động: dấu hiện bằng opacity 150 ms, không hạt, không rung (vẫn có âm và dừng hình).
 * vfx: hệ hiệu ứng (createVfx); sound: hàm (tên âm) → void, vd app.sound. Thiếu thì bỏ qua phần đó.
 */
export async function playStamp(el, { vfx = null, sound: soundFn = null, reduced = null, shake = null, starTo = null } = {}) {
  if (!el) return
  const red = typeof reduced === 'function' ? !!reduced() : (reduced === null || reduced === undefined ? isReduced() : !!reduced)
  const key = el.dataset ? el.dataset.grade : 'dat'
  const ink = (el.querySelector && el.querySelector('.g-stamp-ink')) || el
  // Trang đang ẩn (chuyển ứng dụng/thẻ): không phát âm, không bắn hạt — tránh âm vang khi người chơi đã đi chỗ khác và hiệu
  // ứng dồn lại tới lúc quay về. Tên âm viết thẳng trong lời gọi sound('…') để test âm (audio.test) kiểm được.
  const hidden = () => {
    const d = el.ownerDocument
    return !!(d && d.visibilityState === 'hidden')
  }
  const sound = name => {
    if (hidden() || typeof soundFn !== 'function') return
    try { soundFn(name) } catch { /* bỏ qua */ }
  }
  el.classList.toggle('is-reduced', red)
  markResult(el)
  let anim = null
  try {
    if (typeof ink.animate === 'function') {
      anim = red
        ? ink.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear', fill: 'backwards' })
        : ink.animate([
          { opacity: 0, transform: 'scale(1.6) rotate(-16deg)' },
          { opacity: 1, transform: 'scale(1.6) rotate(-14deg)', offset: 0.15 },
          { opacity: 1, transform: 'scale(.93) rotate(-8deg)', offset: 0.8 },
          { opacity: 1, transform: 'scale(1) rotate(-8deg)' }
        ], { duration: 220, easing: 'cubic-bezier(.55, 0, .85, .35)', fill: 'backwards' })
    }
  } catch { anim = null }
  if (anim) await Promise.race([anim.finished.catch(() => {}), wait(red ? 220 : 320)])
  if (!el.isConnected) return
  sound('stamp')
  // dừng hình (không phải chuyển động nên giữ cả khi giảm chuyển động)
  if (vfx && typeof vfx.hitstop === 'function') await vfx.hitstop(60)
  else await wait(60)
  if (!el.isConnected || red || !vfx || hidden()) {
    if (key === 'hoan_hao') sound('sparkle')
    return
  }
  try {
    if (key === 'hoan_hao') {
      vfx.burst(el, 'sparkle', { n: 10 + Math.floor(Math.random() * 5) })
      sound('sparkle')
      if (starTo && typeof vfx.fly === 'function') {
        // sao nhỏ bay từ biểu tượng sao trên dấu về chấm bước
        const r = (ink.querySelector('.g-stamp-shape') || el).getBoundingClientRect()
        const from = { left: r.left + r.width / 2 - 18, top: r.top + r.height * 0.28 - 18, width: 36, height: 36 }
        vfx.fly(from, starTo, {
          html: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1Z" fill="#ffd23f" stroke="#3a2618" stroke-width="1.8" stroke-linejoin="round"/></svg>',
          ms: 480, scale: 0.8
        })
      }
    } else if (key === 'tot') {
      vfx.burst(el, 'sparkle', { n: 4 })
    } else if (key === 'hong') {
      vfx.burst(el, 'smoke', { n: 6 })
      vfx.shake(shake || el, 2)
    }
  } catch { /* hiệu ứng lỗi không chặn luồng chơi */ }
}

/**
 * Lớp hiệu ứng của sân khấu cho kết quả bước: .mg-fx của buildFrame2 (không có — khung cũ — thì tạo một lớp .mg-fx ở cuối
 * sân khấu). Sân khấu bếp cuộn dọc ở màn thấp: lớp được dời theo phần đang nhìn thấy (top = scrollTop, cao = clientHeight)
 * để con dấu neo trên thanh chân và Dì Sáu ở mép trên của đúng phần người chơi đang thấy.
 */
export function stageFx(stage) {
  if (!stage || typeof stage.querySelector !== 'function') return null
  let fx = null
  for (const c of stage.children || []) if (c.classList && c.classList.contains('mg-fx')) { fx = c; break }
  if (!fx) {
    const doc = stage.ownerDocument
    if (!doc) return null
    fx = doc.createElement('div')
    fx.className = 'mg-fx'
    fx.setAttribute('aria-hidden', 'true')
    stage.appendChild(fx)
  }
  const top = Number(stage.scrollTop) || 0
  if (top > 0) {
    fx.style.top = top + 'px'
    fx.style.bottom = 'auto'
    fx.style.height = (Number(stage.clientHeight) || 0) + 'px'
  }
  return fx
}

/**
 * showStepResult(stage, { score, label, note, react = true, text, rand, data, vfx, sound, reduced, shake, starTo })
 *   → { stamp, react, played: Promise, holdMs } — kết quả một bước trên sân khấu thật (màn Bếp gọi ngay sau submitStep).
 * - Gỡ dấu / Dì Sáu cũ trong lớp .mg-fx (stageFx), gắn con dấu createStamp({ score, label, note }) và Dì Sáu phản ứng
 *   (createDiSauReact, câu theo hạng; react: false thì bỏ), rồi playStamp (đập dấu, dừng hình 60 ms, hạt, âm).
 * - shake mặc định là chính sân khấu (Hỏng: rung 4px; giảm chuyển động: chớp viền đỏ tĩnh của vfx); starTo mặc định là
 *   chấm bước hiện tại (.g-dot.is-now) — Hoàn hảo có sao bay về đó.
 * - holdMs: thời gian nên giữ sân khấu trước khi đóng lớp (RESULT_HOLD_MS / RESULT_HOLD_MS_REDUCED). played xong ~300 ms.
 * Bên gọi đóng lớp sân khấu sau holdMs (con dấu và Dì Sáu đi theo sân khấu). Không có sân khấu thì trả null.
 */
export function showStepResult(stage, {
  score = 0, label = '', note = '', react = true, text = '', rand = Math.random, data = null,
  vfx = null, sound = null, reduced = null, shake = null, starTo = null
} = {}) {
  const fx = stageFx(stage)
  if (!fx) return null
  const red = typeof reduced === 'function' ? !!reduced() : (reduced === null || reduced === undefined ? isReduced() : !!reduced)
  for (const old of [...fx.children]) {
    if (old.classList && (old.classList.contains('g-stamp') || old.classList.contains('g-disau-react'))) old.remove()
  }
  const stamp = createStamp({ score, label, note })
  fx.appendChild(stamp)
  let reactEl = null
  if (react !== false) {
    reactEl = createDiSauReact({ key: stamp.dataset.grade, text, rand, data, reduced: red })
    fx.appendChild(reactEl)
  }
  const dot = starTo || (typeof stage.querySelector === 'function' ? stage.querySelector('.g-dot.is-now') : null)
  const played = playStamp(stamp, { vfx, sound, reduced: red, shake: shake || stage, starTo: dot }).catch(() => {})
  return { stamp, react: reactEl, played, holdMs: resultHoldMs(red) }
}
