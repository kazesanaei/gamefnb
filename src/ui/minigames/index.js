// Sổ đăng ký mini-game. Mỗi plugin: export default { type, mount(stage, step, ctx) → { result, destroy } }.
// result: Promise<{score, details}>; destroy() gỡ mọi sự kiện, khi đó result nhận null (bỏ qua).
import chon from './chon.js'
import cha from './cha.js'
import thai from './thai.js'
import cham from './cham.js'
import lua from './lua.js'
import rot from './rot.js'

export const MINIGAMES = Object.freeze({ chon, cha, thai, cham, lua, rot })

// Thẻ gợi ý theo loại (và chế độ) bước, lấy từ dữ liệu MINIGAME_TYPES; bước có lớp vỏ (skin, vd phin cà phê,
// nồi luộc, tô rưới) dùng tên/gợi ý/biểu tượng của lớp vỏ đó.
export function hintFor(step, data) {
  const T = (data && data.MINIGAME_TYPES) || {}
  const t = T[step && step.type] || {}
  const p = (step && step.params) || {}
  const skin = (step && step.skin && t.skins && t.skins[step.skin]) || {}
  let mode = null
  if (step && step.type === 'cha') mode = Number(p.spots) > 0 ? 'spots' : 'strokes'
  if (step && step.type === 'cham') mode = p.mode || 'exact'
  const text = skin.hint || (mode && t.hints && t.hints[mode]) || t.hint || ''
  return { name: skin.name || t.name || '', text, icon: skin.icon || t.icon || null }
}

// Lớp vỏ của bước (nhãn nút, vạch quá, dòng hướng dẫn, lời nhắc khi quá, âm) — mặc định là lớp vỏ đầu của loại.
export function skinFor(step, data) {
  const T = (data && data.MINIGAME_TYPES) || {}
  const t = T[step && step.type] || {}
  const skins = t.skins || {}
  const first = Object.keys(skins)[0]
  return { id: (step && step.skin && skins[step.skin]) ? step.skin : (first || null), ...((step && step.skin && skins[step.skin]) || (first ? skins[first] : {})) }
}

// Dọn sân khấu, gắn data-type, chặn cuộn/menu rồi mount plugin đúng loại.
export function playStep(stage, step, ctx) {
  const plugin = MINIGAMES[step && step.type]
  if (!plugin) throw new Error('Không có mini-game cho loại bước: ' + (step && step.type))
  stage.textContent = ''
  stage.className = 'mg-stage'
  stage.dataset.type = step.type
  stage.setAttribute('data-testid', 'minigame-stage')
  const stop = e => e.preventDefault()
  stage.addEventListener('contextmenu', stop)
  stage.addEventListener('selectstart', stop)
  stage.addEventListener('dragstart', stop)
  const handle = plugin.mount(stage, step, ctx || {})
  return {
    result: handle.result,
    // (tùy chọn) trạng thái đang dở để khôi phục, vd rổ của bước chọn
    snapshot: typeof handle.snapshot === 'function' ? () => handle.snapshot() : null,
    destroy() {
      handle.destroy()
      stage.removeEventListener('contextmenu', stop)
      stage.removeEventListener('selectstart', stop)
      stage.removeEventListener('dragstart', stop)
    }
  }
}
