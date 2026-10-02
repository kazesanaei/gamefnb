// Khách gọi món (M5, màn gọi món): khách bán thân lớn đứng sau mặt quầy (mặt theo tâm trạng từ art.js phóng to + thân
// áo vẽ SVG theo kiểu khách, nhún nhẹ khi chờ), bong bóng thoại có HÌNH MÓN to, huy hiệu ×n, ghi chú bằng hình
// (note-icons.js) và một câu nói ngắn phía dưới (bubbleLine: câu trọn ý, không cắt giữa từ). Chữ chỉ là phụ.
// Giữ testid của quầy cũ: speech-bubble (data-request = JSON yêu cầu thật); lời qua lại: seller-line / customer-line.
// Hoạt ảnh chỉ theo SỰ KIỆN: enter() (khách tới), react('ok' | 'bad') (gật đầu / lắc đầu khi đọc lại đơn), lời mới
// trong talk. update() với cùng dữ liệu không dựng lại gì.
// Thuần ở cấp module (import trong Node được).
import { h } from '../dom.js'
import { face } from '../art.js'
import { INK, r1 } from '../art/kit.js'
import { isReduced, EASE } from '../motion.js'
import { dishArt } from './menu-board.js'
import { noteIcon, noteLabel } from './note-icons.js'

// Áo, da theo kiểu khách (trùng màu mặt trong art.js) + chi tiết thân áo. Khóa 'co_chu_nam' = chú (cô chú, nam).
export const BODY_LOOKS = Object.freeze({
  hoc_sinh: { shirt: '#ffffff', dark: '#d9e1ea', skin: '#f7cfa8', kind: 'hoc_sinh' },
  cong_nhan: { shirt: '#3f6fb0', dark: '#2d5590', skin: '#dca57a', kind: 'cong_nhan' },
  co_chu: { shirt: '#8a5fb0', dark: '#6c4790', skin: '#efc29a', kind: 'co_chu' },
  co_chu_nam: { shirt: '#5f7f9f', dark: '#4a6682', skin: '#e8b88f', kind: 'co_chu_nam' },
  van_phong: { shirt: '#ffffff', dark: '#d9e1ea', skin: '#f5c9a0', kind: 'van_phong' },
  kho_tinh: { shirt: '#a33b3b', dark: '#7f2b2b', skin: '#f1c49b', kind: 'kho_tinh' }
})

/** Khóa dáng người theo kiểu khách + giới tính (cô chú nam → 'co_chu_nam'); kiểu lạ → học sinh. */
export function bodyKey(persona, gender = null) {
  const k = persona === 'co_chu' && gender === 'nam' ? 'co_chu_nam' : persona
  return BODY_LOOKS[k] ? k : 'hoc_sinh'
}

// Chi tiết thân áo (viewBox 64 × 88; đầu chiếm 0..64). lower: vẽ dưới mặt; upper: vẽ sau mặt (cà vạt, khăn quàng).
const DETAILS = {
  hoc_sinh: {
    lower: '<path d="M32 66 L32 88" fill="none" stroke-width="1.6"/>' +
      `<circle cx="34.5" cy="71" r="1.3" fill="${INK}" stroke="none"/><circle cx="34.5" cy="80" r="1.3" fill="${INK}" stroke="none"/>` +
      '<path d="M13 70 L22 70 L22 78 L13 78Z" fill="none" stroke-width="1.6"/>',
    upper: '<path d="M30.5 59 L26.5 71 L31 69.5Z" fill="#d6362b" stroke-width="2"/><path d="M33.5 59 L37.5 71 L33 69.5Z" fill="#d6362b" stroke-width="2"/>'
  },
  cong_nhan: {
    lower: '<path d="M5.2 73 L58.8 73 L59.6 79 L4.4 79Z" fill="#f5e663" stroke-width="2"/>' +
      '<path d="M42 66 L51 66 L51 71 L42 71Z" fill="#2d5590" stroke-width="1.6"/>',
    upper: ''
  },
  co_chu: {
    lower: '<path d="M20 58 Q32 70 44 58" fill="none" stroke="#fff" stroke-width="2.2" opacity=".75"/>',
    upper: [[22.5, 60.5], [26, 63.5], [30, 65.2], [34, 65.2], [38, 63.5], [41.5, 60.5]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#fffaf0" stroke-width="1"/>`).join('')
  },
  co_chu_nam: {
    lower: '<path d="M38 68 L48 68 L48 77 L38 77Z" fill="#4a6682" stroke-width="1.6"/>' +
      '<path d="M41 64.5 L41 70" fill="none" stroke="#2f5fb3" stroke-width="2"/>' +
      '<path d="M32 66 L32 88" fill="none" stroke-width="1.4"/>',
    upper: ''
  },
  van_phong: {
    lower: '<path d="M21 57 L25.5 75" fill="none" stroke="#2f5fb3" stroke-width="1.6"/>' +
      '<path d="M21 74 L30 74 L30 85 L21 85Z" fill="#fffaf0" stroke-width="1.6"/><path d="M21 77 L30 77" fill="none" stroke="#2f5fb3" stroke-width="2.4"/>',
    upper: '<path d="M30 63 L34 63 L35.8 78 L32 82 L28.2 78Z" fill="#2f5fb3" stroke-width="2"/>'
  },
  kho_tinh: {
    lower: '<path d="M8.5 63 C9.5 59 13 56.5 18 55 L26 88 L4 88 C4.5 78 6 69 8.5 63Z" fill="#2b2220" stroke-width="2.2"/>' +
      '<path d="M55.5 63 C54.5 59 51 56.5 46 55 L38 88 L60 88 C59.5 78 58 69 55.5 63Z" fill="#2b2220" stroke-width="2.2"/>',
    upper: ''
  }
}

/**
 * SVG khách bán thân (viewBox 0 0 64 88): thân áo cel-shading → mặt (face() của art.js, đặt lồng ở 0..64) →
 * miếng vá che vạch đáy vai của mặt → chi tiết trên áo. Thuần, không DOM.
 */
export function bustSvg(persona, mood, gender = null) {
  const key = bodyKey(persona, gender)
  const L = BODY_LOOKS[key]
  const D = DETAILS[key] || { lower: '', upper: '' }
  const torso = 'M8 64 C6.2 70 4.6 78 3.6 88 L60.4 88 C59.4 78 57.8 70 56 64 C55 57 46 52.5 32 52.5 C18 52.5 9 57 8 64Z'
  const shade = 'M47 56 C52 58.5 55.4 61 56 64 C57.8 70 59.4 78 60.4 88 L49 88 C50.5 78 50.5 66 47 56Z'
  const head = String(face(persona, mood, gender) || '').replace('<svg ', '<svg x="0" y="0" width="64" height="64" ')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 88">` +
    `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">` +
    `<path d="${torso}" fill="${L.shirt}" stroke="none"/>` +
    `<path d="${shade}" fill="${L.dark}" stroke="none"/>` +
    `<path d="M12 66 C13 61.5 16 59 20 58" fill="none" stroke="#fff" stroke-width="2.4" opacity=".55"/>` +
    D.lower +
    `<path d="${torso}" fill="none"/>` +
    `</g>` + head +
    `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">` +
    `<path d="M9.8 62.2 L54.2 62.2 L54.6 66.2 L9.4 66.2Z" fill="${L.shirt}" stroke="none"/>` +
    `<path d="M47.5 62.2 L54.2 62.2 L54.6 66.2 L48.6 66.2Z" fill="${L.dark}" stroke="none"/>` +
    D.upper +
    `</g></svg>`
}

/** Dòng yêu cầu gọn để vẽ: [{ recipeId, qty, notes: [id] }] (bỏ dòng lỗi, qty ≥ 1). */
export function requestLines(request) {
  return (Array.isArray(request) ? request : [])
    .filter(l => l && l.recipeId)
    .map(l => ({ recipeId: String(l.recipeId), qty: Math.max(1, Math.floor(Number(l.qty) || 1)), notes: Array.isArray(l.notes) ? l.notes.map(String) : [] }))
}

/** Lời đọc cho trình đọc màn hình: "2 Bánh mì ốp la (Không hành, Cay); 1 Trà tắc". */
export function requestText(request, recipes) {
  return requestLines(request).map(l => {
    const r = recipes && recipes[l.recipeId]
    const notes = l.notes.map(n => noteLabel(n, r))
    return `${l.qty} ${r ? r.name : l.recipeId}` + (notes.length ? ` (${notes.join(', ')})` : '')
  }).join('; ')
}

// Độ dài tối đa (ký tự) của câu nói dưới bong bóng: một dòng ở 375px, hai dòng ở 320px.
export const SAY_MAX = 34

/**
 * Câu nói ngắn dưới bong bóng (hình món đã nói đủ món, chữ chỉ là phụ):
 * câu đầu nếu đủ ngắn ("Như mọi khi nha con!"); không thì lấp từng từ tới giới hạn (ưu tiên cắt ở dấu phẩy nếu đủ xa),
 * kết bằng "…" và bỏ dấu câu ngay trước dấu lửng. Không cắt giữa từ (trừ một từ dài hơn giới hạn). Rỗng nếu không có lời.
 */
export function bubbleLine(speech, max = SAY_MAX) {
  const s = String(speech || '').replace(/\s+/g, ' ').trim()
  if (!s) return ''
  if (s.length <= max) return s
  const first = (s.match(/^.+?[.!?…](?=\s|$)/) || [s])[0].trim()
  if (first.length <= max) return first
  const tidy = t => t.replace(/[\s,;:.!?…–-]+$/, '') + '…'
  // lấp từng từ tới giới hạn; nếu có dấu phẩy đủ xa (≥ 60% giới hạn) thì cắt ở đó cho trọn vế
  let out = ''
  let comma = ''
  for (const w of first.split(' ')) {
    const next = out ? out + ' ' + w : w
    if (next.length > max - 1) break
    out = next
    if (/,$/.test(w)) comma = out
  }
  if (!out) return tidy(first.slice(0, max - 1))
  return tidy(comma.length >= max * 0.6 ? comma : out)
}

const sigOf = d => JSON.stringify([d.persona, d.gender, d.mood, d.name, d.regular, d.tag, d.speech, d.say, d.request, d.showSpeech !== false])

/**
 * createOrderBubble(data, opts) → { el, update(data), destroy(), enter(), react(kind), bubbleEl, figureEl }
 * data: {
 *   persona, mood ('vui'|'binh_thuong'|'buc'|'gian'), gender, name, regular (bool), tag (vd tên kiểu khách),
 *   request: [{ recipeId, qty, notes }], speech (câu khách nói; bong bóng chỉ hiện bản ngắn bubbleLine(speech)),
 *   say (câu ngắn tự chọn thay cho bản rút gọn), recipes,
 *   talk: [{ who: 'ban' | 'khach', text }] (≤ 2 lời gần nhất, lời mới nảy vào), showSpeech (mặc định true)
 * }
 * opts: { vfx, sound, reduced }
 */
export function createOrderBubble(data = {}, opts = {}) {
  const vfx = opts.vfx || null
  const reduced = () => (typeof opts.reduced === 'function' ? !!opts.reduced() : opts.reduced === undefined || opts.reduced === null ? isReduced() : !!opts.reduced)
  const body = h('span', { class: 'co-cust-body', 'aria-hidden': 'true' })
  const bob = h('span', { class: 'co-cust-bob' }, body)
  const nameTag = h('span', { class: 'co-cust-name' })
  const figure = h('div', { class: 'co-cust-figure' }, bob, nameTag)
  const dishes = h('div', { class: 'co-bubble-dishes' })
  const say = h('p', { class: 'co-bubble-say' })
  const bubble = h('div', { class: 'co-bubble', testid: 'speech-bubble', role: 'group' }, dishes, say)
  const talkBox = h('div', { class: 'co-talk', 'aria-live': 'polite', hidden: true })
  const scene = h('div', { class: 'co-cust' }, figure, bubble, h('div', { class: 'co-cust-counter g-wood g-wood--flat', 'aria-hidden': 'true' }))
  const el = h('div', { class: 'co-cust-wrap' }, scene, talkBox)
  let cur = {}
  let sig = ''
  let faceSig = ''
  let moodOverride = null
  let overrideTimer = 0
  let talkSig = '[]'
  let destroyed = false
  let mounted = false

  function paintFace() {
    const mood = moodOverride || cur.mood || 'binh_thuong'
    const k = [cur.persona, mood, cur.gender].join('|')
    if (k === faceSig) return
    faceSig = k
    body.innerHTML = bustSvg(cur.persona, mood, cur.gender)
  }

  function paint() {
    paintFace()
    const R = cur.recipes || {}
    nameTag.textContent = ''
    if (cur.name) nameTag.appendChild(h('b', null, cur.name))
    if (cur.regular) nameTag.appendChild(h('small', { class: 'co-cust-regular' }, 'Khách quen'))
    else if (cur.tag) nameTag.appendChild(h('small', null, cur.tag))
    nameTag.hidden = !cur.name && !cur.tag && !cur.regular
    const lines = requestLines(cur.request)
    bubble.dataset.request = JSON.stringify(cur.request || [])
    bubble.dataset.n = String(lines.length)
    bubble.setAttribute('aria-label', 'Khách gọi: ' + (requestText(lines, R) || 'chưa gọi món'))
    dishes.textContent = ''
    for (const l of lines) {
      const r = R[l.recipeId]
      dishes.appendChild(h('div', { class: 'co-bubble-dish' },
        h('span', { class: 'co-bubble-art' }, dishArt(r || { id: l.recipeId })),
        l.qty > 1 ? h('span', { class: 'co-bubble-qty', 'aria-hidden': 'true' }, '×' + l.qty) : null,
        l.notes.length ? h('span', { class: 'co-bubble-notes' }, l.notes.map(n => noteIcon(n, { recipe: r }))) : null))
    }
    const line = cur.say ? String(cur.say) : bubbleLine(cur.speech)
    say.textContent = line ? `“${line}”` : ''
    // câu đầy đủ vẫn đọc được (rê chuột / trình đọc màn hình) khi bong bóng chỉ hiện bản ngắn
    if (cur.speech && line !== String(cur.speech).trim()) say.title = String(cur.speech)
    else say.removeAttribute('title')
    say.hidden = !line || cur.showSpeech === false
  }

  function paintTalk(talk, animate) {
    const list = (Array.isArray(talk) ? talk : []).slice(-2)
    const k = JSON.stringify(list)
    if (k === talkSig) return
    const prev = JSON.parse(talkSig)
    talkSig = k
    talkBox.textContent = ''
    list.forEach((t, i) => {
      const me = t.who === 'ban'
      const node = h('p', { class: ['co-talk-line', me ? 'is-me' : 'is-them'], testid: me ? 'seller-line' : 'customer-line' },
        h('b', null, me ? 'Bạn: ' : (cur.name || 'Khách') + ': '), String(t.text || ''))
      talkBox.appendChild(node)
      // chỉ lời mới (chưa có ở lần vẽ trước) mới nảy vào
      const isNew = !prev.some(p => p.who === t.who && p.text === t.text)
      if (animate && isNew && vfx) vfx.pop(node)
    })
    talkBox.hidden = !list.length
  }

  function update(d = {}) {
    if (destroyed) return
    cur = { ...d }
    const s = sigOf(cur)
    if (s !== sig) { sig = s; paint() }
    paintTalk(cur.talk, mounted)
    mounted = true
  }

  // Khách bước tới quầy: thân trượt lên từ sau mặt quầy, bong bóng nảy vào (giảm chuyển động: chỉ hiện dần).
  function enter() {
    if (destroyed) return
    if (reduced()) {
      if (vfx) { vfx.pop(figure); vfx.pop(bubble) }
      return
    }
    if (typeof figure.animate === 'function') {
      figure.animate([
        { transform: 'translateY(42px)', opacity: 0 },
        { transform: 'translateY(-4px)', opacity: 1, offset: 0.7 },
        { transform: 'translateY(0)', opacity: 1 }
      ], { duration: 420, easing: EASE.outCubic })
    }
    if (vfx) setTimeout(() => { if (!destroyed) vfx.pop(bubble) }, 180)
  }

  // Phản ứng khi nghe đọc lại: 'ok' gật đầu + mặt vui; 'bad' lắc đầu + mặt bực (tạm 1,4 giây rồi về tâm trạng thật).
  function react(kind = 'ok') {
    if (destroyed) return
    clearTimeout(overrideTimer)
    moodOverride = kind === 'bad' ? 'buc' : 'vui'
    paintFace()
    overrideTimer = setTimeout(() => { moodOverride = null; if (!destroyed) paintFace() }, 1400)
    if (reduced()) { if (kind === 'bad' && vfx) vfx.shake(figure, 1); return }
    if (kind === 'bad') {
      if (vfx) vfx.shake(figure, 2)
      return
    }
    if (typeof body.animate === 'function') {
      body.animate([
        { transform: 'translateY(0) rotate(0deg)' },
        { transform: `translateY(${r1(4)}px) rotate(2deg)`, offset: 0.25 },
        { transform: 'translateY(0) rotate(0deg)', offset: 0.5 },
        { transform: 'translateY(3px) rotate(1.5deg)', offset: 0.75 },
        { transform: 'translateY(0) rotate(0deg)' }
      ], { duration: 560, easing: 'ease-in-out' })
    }
  }

  update(data)

  return {
    el,
    update,
    enter,
    react,
    bubbleEl: bubble,
    figureEl: figure,
    destroy() {
      destroyed = true
      clearTimeout(overrideTimer)
      el.remove()
    }
  }
}
