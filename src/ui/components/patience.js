// Vòng kiên nhẫn (SVG) đổi màu xanh → vàng → đỏ; tâm trạng mặt khách theo kiên nhẫn còn lại.
// M5 Đợt 2 (gói Q-D): vòng có viền mực mỏng và vạch nền, dùng ôm quanh đầu khách bán thân ở dải phố (service.js); thêm
// hơi nước bốc trên đầu khi kiên nhẫn thấp (createSteam). Import trong Node được (chỉ tạo phần tử bên trong hàm).

const NS = 'http://www.w3.org/2000/svg'

/** Dưới mức này (phần kiên nhẫn còn lại) thì khách "bốc hơi": hơi nước trên đầu, vòng đỏ. */
export const LOW_PATIENCE = 0.3

export function patienceColor(v) {
  if (v > 0.6) return 'var(--good)'
  if (v > 0.3) return 'var(--warn)'
  return 'var(--bad)'
}

/** Tâm trạng mặt khách theo kiên nhẫn còn lại. */
export function moodFor(v) {
  if (v > 0.75) return 'vui'
  if (v > 0.45) return 'binh_thuong'
  if (v > 0.2) return 'buc'
  return 'gian'
}

/**
 * createRing(size, stroke) → { el, set(value 0..1, color?) }
 * value là phần còn lại (1 = đầy). Vòng: rãnh nền mờ + cung màu (bắt đầu từ đỉnh, chạy theo chiều kim đồng hồ) có viền
 * mực mỏng ôm đúng cung (.ring-edge, cùng độ dài cung) để nổi trên nền phố sáng; phần đã cạn chỉ còn rãnh mờ.
 */
export function createRing(size = 64, stroke = 5) {
  const r = (size - stroke) / 2 - 0.5
  const len = 2 * Math.PI * r
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
  svg.setAttribute('width', size)
  svg.setAttribute('height', size)
  svg.setAttribute('class', 'ring')
  svg.setAttribute('aria-hidden', 'true')
  const circle = (cls, w) => {
    const c = document.createElementNS(NS, 'circle')
    c.setAttribute('cx', size / 2); c.setAttribute('cy', size / 2); c.setAttribute('r', r)
    c.setAttribute('class', cls); c.setAttribute('stroke-width', w); c.setAttribute('fill', 'none')
    return c
  }
  const edge = circle('ring-edge', stroke + 2)
  const bg = circle('ring-bg', stroke)
  const fg = circle('ring-fg', stroke)
  for (const c of [edge, fg]) {
    c.setAttribute('stroke-dasharray', String(len))
    c.setAttribute('stroke-linecap', 'round')
    c.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`)
  }
  svg.appendChild(bg)
  svg.appendChild(edge)
  svg.appendChild(fg)
  let last = -1
  let lastColor = ''
  return {
    el: svg,
    set(value, color) {
      const v = Math.max(0, Math.min(1, Number(value) || 0))
      const c = color || patienceColor(v)
      if (Math.abs(v - last) < 0.002 && c === lastColor) return
      last = v
      lastColor = c
      const off = String(len * (1 - v))
      fg.setAttribute('stroke-dashoffset', off)
      edge.setAttribute('stroke-dashoffset', off)
      // cạn hẳn: bỏ cả chấm đầu cung (nét tròn đầu vẫn vẽ một chấm khi cung dài 0)
      const op = v > 0.001 ? '' : '0'
      edge.style.opacity = op
      fg.style.opacity = op
      fg.style.stroke = c
    }
  }
}

/** Hơi nước bốc trên đầu (3 cụm khói nhỏ, CSS .steam): hiện khi phần tử cha có lớp .is-low. */
export function createSteam(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return null
  const el = doc.createElement('span')
  el.className = 'steam'
  el.setAttribute('aria-hidden', 'true')
  for (let i = 0; i < 3; i++) el.appendChild(doc.createElement('i'))
  return el
}
