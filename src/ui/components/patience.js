// Vòng kiên nhẫn (SVG) đổi màu xanh → vàng → đỏ.

const NS = 'http://www.w3.org/2000/svg'

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
 * value là phần còn lại (1 = đầy).
 */
export function createRing(size = 64, stroke = 5) {
  const r = (size - stroke) / 2
  const len = 2 * Math.PI * r
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
  svg.setAttribute('width', size)
  svg.setAttribute('height', size)
  svg.setAttribute('class', 'ring')
  svg.setAttribute('aria-hidden', 'true')
  const bg = document.createElementNS(NS, 'circle')
  bg.setAttribute('cx', size / 2); bg.setAttribute('cy', size / 2); bg.setAttribute('r', r)
  bg.setAttribute('class', 'ring-bg'); bg.setAttribute('stroke-width', stroke); bg.setAttribute('fill', 'none')
  const fg = document.createElementNS(NS, 'circle')
  fg.setAttribute('cx', size / 2); fg.setAttribute('cy', size / 2); fg.setAttribute('r', r)
  fg.setAttribute('class', 'ring-fg'); fg.setAttribute('stroke-width', stroke); fg.setAttribute('fill', 'none')
  fg.setAttribute('stroke-dasharray', String(len))
  fg.setAttribute('stroke-linecap', 'round')
  fg.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`)
  svg.appendChild(bg)
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
      fg.setAttribute('stroke-dashoffset', String(len * (1 - v)))
      fg.style.stroke = c
    }
  }
}
