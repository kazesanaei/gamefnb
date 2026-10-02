// Dì Sáu phản ứng sau mỗi bước (M5): mặt Dì Sáu 48px + bong bóng một câu ngắn ở góc trên-phải sân khấu, không che vùng chơi.
// Câu thoại lấy từ DIALOGUE.diSau.stepReact (src/data/dialogue.js), mỗi hạng 3–5 câu xoay vòng.
// Bong bóng nảy vào 250 ms (CSS, hữu hạn); giảm chuyển động thì chỉ mờ dần vào.
// Import trong Node an toàn: chỉ chạm DOM bên trong createDiSauReact.
import { h, svgBox } from '../dom.js'
import { DI_SAU } from '../art.js'
import { DIALOGUE } from '../../data/dialogue.js'

// Hạng bước → biểu cảm Dì Sáu (art.js: tu_hao, vui, lo, tiec).
export const MOOD_BY_KEY = Object.freeze({ hoan_hao: 'tu_hao', tot: 'vui', dat: 'lo', hong: 'tiec' })

/**
 * reactLine(key, rand = Math.random, data?) → một câu của Dì Sáu cho hạng bước key ('hoan_hao' | 'tot' | 'dat' | 'hong').
 * data (tùy chọn): bộ dữ liệu có DIALOGUE (vd DATA); không có thì dùng dialogue.js. Hạng lạ → câu của 'dat'.
 */
export function reactLine(key, rand = Math.random, data = null) {
  const D = (data && data.DIALOGUE) || DIALOGUE
  const table = (D && D.diSau && D.diSau.stepReact) || DIALOGUE.diSau.stepReact || {}
  const lines = table[key] || table.dat || []
  if (!lines.length) return ''
  const r = typeof rand === 'function' ? Number(rand()) : Math.random()
  const i = Math.min(lines.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * lines.length)))
  return lines[i]
}

/**
 * createDiSauReact({ key, text, reduced }) → div.g-disau-react[data-testid="disau-react", data-grade] (pointer-events: none).
 * Bên gọi đặt vào lớp hiệu ứng của sân khấu (.mg-fx của buildFrame2) hoặc khung có position: relative; tự gỡ khi xong.
 * text bỏ trống thì tự chọn câu bằng reactLine(key).
 */
export function createDiSauReact({ key = 'dat', text = '', reduced = false } = {}) {
  const mood = MOOD_BY_KEY[key] || 'vui'
  const line = text || reactLine(key)
  return h('div', {
    class: ['g-disau-react', 'grade-' + key, reduced ? 'is-reduced' : ''], 'data-testid': 'disau-react',
    dataset: { grade: key }, role: 'status', 'aria-live': 'polite'
  },
  h('div', { class: 'g-disau-bubble' }, line),
  svgBox(DI_SAU[mood] || DI_SAU.vui, 'g-disau-face'))
}
