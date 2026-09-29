// Sổ đăng ký mini-game. Mỗi plugin: export default { type, mount(stage, step, ctx) → { result, destroy } }.
// result: Promise<{score, details}>; destroy() gỡ mọi sự kiện, khi đó result nhận null (bỏ qua).
import chon from './chon.js'
import cha from './cha.js'
import thai from './thai.js'
import cham from './cham.js'
import lua from './lua.js'
import rot from './rot.js'

export const MINIGAMES = Object.freeze({ chon, cha, thai, cham, lua, rot })

// Thẻ gợi ý theo loại (và chế độ) bước, lấy từ dữ liệu MINIGAME_TYPES.
export function hintFor(step, data) {
  const T = (data && data.MINIGAME_TYPES) || {}
  const t = T[step && step.type] || {}
  const p = (step && step.params) || {}
  let mode = null
  if (step && step.type === 'cha') mode = Number(p.spots) > 0 ? 'spots' : 'strokes'
  if (step && step.type === 'cham') mode = p.mode || 'exact'
  const text = (mode && t.hints && t.hints[mode]) || t.hint || ''
  return { name: t.name || '', text, icon: t.icon || null }
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
