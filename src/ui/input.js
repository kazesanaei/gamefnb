// Tiện ích Pointer Events cho mini-game và thao tác kéo/giữ.

function isTypingTarget(t) {
  if (!t || !t.tagName) return false
  const tag = t.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable
}

// Gói thông tin một lần chạm: tọa độ trong phần tử (x, y), tỉ lệ (rx, ry), kèm các trường của sự kiện gốc.
function info(el, e, synthetic = false) {
  const r = el.getBoundingClientRect()
  const clientX = synthetic ? r.left + r.width / 2 : e.clientX
  const clientY = synthetic ? r.top + r.height / 2 : e.clientY
  return {
    x: clientX - r.left, y: clientY - r.top,
    rx: r.width ? (clientX - r.left) / r.width : 0,
    ry: r.height ? (clientY - r.top) / r.height : 0,
    clientX, clientY, rect: r,
    pointerId: synthetic ? -1 : e.pointerId,
    pointerType: synthetic ? 'keyboard' : e.pointerType,
    t: performance.now(), timeStamp: e.timeStamp,
    target: e.target, event: e, synthetic,
    preventDefault: () => e.preventDefault && e.preventDefault()
  }
}

/**
 * bindPointer(el, {down, move, up, cancel}, opts) → hàm gỡ.
 * Chỉ nhận con trỏ chính, setPointerCapture; pointercancel coi như thả tay (gọi cancel nếu có, không thì up).
 * opts.space (bật bằng { space: true }): phím Space mô phỏng nhấn/giữ khi phần tử đang hiện.
 * Mặc định tắt để nhiều vùng chạm cùng lúc (vd các lọ gia vị) không cùng nhận một phím.
 * Mỗi handler nhận (p, e) với p = {x, y, rx, ry, clientX, clientY, t, pointerId, synthetic, …}.
 */
export function bindPointer(el, handlers = {}, opts = {}) {
  const { down, move, up, cancel } = handlers
  const useSpace = opts.space === true
  let activeId = null
  let spaceDown = false

  const onDown = e => {
    if (e.isPrimary === false || activeId !== null) return
    if (e.button !== undefined && e.button > 0) return
    activeId = e.pointerId
    try { el.setPointerCapture(e.pointerId) } catch { /* bỏ qua */ }
    e.preventDefault()
    down && down(info(el, e), e)
  }
  const onMove = e => {
    if (e.pointerId !== activeId) return
    move && move(info(el, e), e)
  }
  const finish = (e, cancelled) => {
    if (e.pointerId !== activeId) return
    activeId = null
    try { el.releasePointerCapture(e.pointerId) } catch { /* bỏ qua */ }
    const p = info(el, e)
    if (cancelled && cancel) cancel(p, e)
    else up && up(p, e)
  }
  const onUp = e => finish(e, false)
  const onCancel = e => finish(e, true)
  const onCtx = e => e.preventDefault()

  const visible = () => el.isConnected && el.getClientRects().length > 0
  const onKeyDown = e => {
    if (e.code !== 'Space' || isTypingTarget(e.target) || !visible()) return
    e.preventDefault()
    if (e.repeat || spaceDown || activeId !== null) return
    spaceDown = true
    down && down(info(el, e, true), e)
  }
  const onKeyUp = e => {
    if (e.code !== 'Space' || !spaceDown) return
    e.preventDefault()
    spaceDown = false
    up && up(info(el, e, true), e)
  }

  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onCancel)
  el.addEventListener('lostpointercapture', onCancel)
  el.addEventListener('contextmenu', onCtx)
  if (useSpace) {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
  }
  return function unbind() {
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onCancel)
    el.removeEventListener('lostpointercapture', onCancel)
    el.removeEventListener('contextmenu', onCtx)
    if (useSpace) {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }
}

/** Chặn menu giữ lâu/chọn chữ trên sân khấu mini-game. */
export function guardStage(el) {
  el.classList.add('stage-guard')
  const stop = e => e.preventDefault()
  el.addEventListener('contextmenu', stop)
  el.addEventListener('selectstart', stop)
  return () => {
    el.removeEventListener('contextmenu', stop)
    el.removeEventListener('selectstart', stop)
  }
}
