// Thanh trên: ngày, giờ trong game, Tiền quán, sao trung bình.
import { h } from '../dom.js'
import { gameTime } from '../../core/shift.js'
import { averageRating } from '../../core/scoring.js'
import { formatVND, formatStars } from '../format.js'

export function createHud(app) {
  const day = h('span', { class: 'hud-day', testid: 'hud-day' })
  const time = h('span', { class: 'hud-time', testid: 'hud-time' })
  const wallet = h('span', { class: 'hud-wallet', testid: 'hud-wallet' })
  const stars = h('span', { class: 'hud-stars', testid: 'hud-stars' })
  const el = h('header', { class: 'hud' },
    h('div', { class: 'hud-cell' }, day, time),
    h('div', { class: 'hud-cell hud-money', title: 'Tiền quán' }, h('span', { class: 'hud-cap' }, 'Tiền quán'), wallet),
    h('div', { class: 'hud-cell hud-rate', title: 'Sao trung bình' }, stars))
  let last = ''
  function update() {
    const s = app.state
    if (!s) return
    const sh = s.shift
    const dayN = sh ? sh.day : s.day
    const t = sh ? gameTime(sh) : '06:00'
    const w = formatVND(s.wallet)
    const st = '★ ' + formatStars(averageRating(s.ratings))
    const key = dayN + t + w + st
    if (key === last) return
    last = key
    day.textContent = 'Ngày ' + dayN
    time.textContent = t
    wallet.textContent = w
    wallet.dataset.amount = String(s.wallet)
    stars.textContent = st
  }
  update()
  return { el, update }
}
