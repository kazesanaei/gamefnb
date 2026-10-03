// Thanh trên của màn Ca bán (HUD). M5 Đợt 2 (gói Q-D): thanh gỗ với 3 viên giấy viền mực kiểu game và nút "?" (Hướng dẫn):
//   - giờ ca: biểu tượng đồng hồ, "Ngày N" và giờ trong ca; vạch dưới viên có mặt trời đi từ 06:00 tới cuối ca;
//   - ví "Tiền quán" (biểu tượng ví): số ví thật (data-amount luôn là state.wallet); ví đổi giữa ca (giá vốn, phạt…) thì số
//     đếm dần tới số mới. Tiền bán hàng trong ca chỉ vào ví lúc đóng ca (lõi tất toán), nên dưới ví có thẻ nhỏ "+45.000đ"
//     (dán vào mép dưới viên ví; chồng thông báo nổi của màn Ca bán nằm ngay dưới đáy thẻ — css/game.css — nên thẻ đếm lên
//     không bị thông báo che)
//     là tiền đã thu trong ca (tiền mặt + chuyển khoản + tip − hoàn tiền): xu bay về ví (vfx.coins của quầy, mỗi xu phát sự
//     kiện DOM 'vfx-coin' trên [hud-wallet]) thì thẻ đếm lên theo từng xu; tiền vào mà không có xu bay (tip, thối thiếu…)
//     thì thẻ tự đếm lên sau một nhịp;
//   - sao trung bình (biểu tượng sao).
// Chỉ đổi giao diện: không đổi luật, không đổi số tiền. Import trong Node được (không chạm DOM ở cấp module).
import { h, svgBox } from '../dom.js'
import { gameTime } from '../../core/shift.js'
import { averageRating } from '../../core/scoring.js'
import { formatVND, formatStars, formatMoneyShort } from '../format.js'
import { SCENE_ICONS, HUD_ICONS } from '../art/scene.js'
import { helpButton } from './help.js'

/** Chờ chừng này (ms) mà không có xu nào bay về ví thì thẻ "thu trong ca" tự đếm lên. */
export const TAKE_FALLBACK_MS = 2600

/** Tiến độ ca 0..1 từ giờ trong ca "HH:MM" (06:00 → 0, 10:00 → 1: cùng thang với gameTime của lõi). */
export function shiftProgress(time) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time || ''))
  if (!m) return 0
  const min = Number(m[1]) * 60 + Number(m[2])
  return Math.max(0, Math.min(1, (min - 360) / 240))
}

/** Tiền đã thu trong ca, chưa vào ví (ví được tất toán lúc đóng ca): bán hàng tiền mặt + chuyển khoản + tip − hoàn tiền. */
export function shiftTake(sh) {
  const L = (sh && sh.ledger) || {}
  const n = k => Number(L[k]) || 0
  return Math.max(0, n('cash') + n('qr') + n('tips') - n('refunds'))
}

const takeText = v => '+' + formatMoneyShort(v)

export function createHud(app) {
  const ico = key => svgBox(SCENE_ICONS[HUD_ICONS[key]] || '', 'hud-ico')
  const day = h('span', { class: 'hud-day', testid: 'hud-day' })
  const time = h('span', { class: 'hud-time', testid: 'hud-time' })
  // vạch giờ ca: phần đã qua tô vàng (co giãn theo trục X), mặt trời trượt theo (transform)
  const past = h('span', { class: 'hud-sun-past' })
  const sunRun = h('span', { class: 'hud-sun-run' }, h('i', { class: 'hud-sun' }))
  const track = h('span', { class: 'hud-track', 'aria-hidden': 'true' }, past, sunRun)
  const wallet = h('span', { class: 'hud-wallet', testid: 'hud-wallet' })
  const take = h('span', { class: 'hud-take', testid: 'hud-take' })
  const stars = h('span', { class: 'hud-stars', testid: 'hud-stars' })
  const clock = h('div', { class: 'hud-cell hud-clock' }, ico('time'), h('span', { class: 'hud-dt' }, day, time), track)
  const money = h('div', { class: 'hud-cell hud-money' },
    ico('money'), h('span', { class: 'hud-mv' }, h('span', { class: 'hud-cap' }, 'Tiền quán'), wallet), take)
  const rate = h('div', { class: 'hud-cell hud-rate', title: 'Sao trung bình' }, ico('stars'), stars)
  const el = h('header', { class: 'hud', testid: 'hud' }, clock, money, rate, helpButton(app))

  const fx = () => (app && app.vfx && typeof app.vfx.countUp === 'function' ? app.vfx : null)
  let last = ''
  let lastWallet = null
  let lastP = -1

  // ---------- thẻ "thu trong ca" ----------
  let takeTarget = 0        // số thật (sổ ca)
  let takeShown = null      // số bộ đếm đang hướng tới / đã ghi
  let flightBase = null     // số đang hiện lúc xu đầu tiên của một luồng xu chạm ví
  let fallback = 0
  function countTake(to, ms) {
    const v = Math.max(0, Math.round(to))
    take.classList.toggle('is-on', v > 0)
    const f = fx()
    if (takeShown === null || !f || ms <= 0) take.textContent = takeText(v)
    else if (v !== takeShown || f.counting(take)) f.countUp(take, null, v, ms, takeText, { step: 500 })
    takeShown = v
  }
  function readTake() {
    const sh = app.state && app.state.shift
    return sh ? shiftTake(sh) : 0
  }
  // mỗi xu chạm ví (counter-cash, counter-qr…): đếm theo phần tiền đã tới; xu cuối → đúng số thật
  function onCoin(e) {
    const d = (e && e.detail) || {}
    takeTarget = readTake()
    if (fallback) { clearTimeout(fallback); fallback = 0 }
    if (flightBase === null || d.index === 0 || d.skipped) flightBase = takeShown === null ? 0 : takeShown
    const amt = Number(d.amount) || 0
    const frac = amt > 0 ? Math.max(0, Math.min(1, (Number(d.sum) || 0) / amt)) : 1
    if (d.last) {
      flightBase = null
      countTake(takeTarget, 320)
    } else {
      countTake(flightBase + (takeTarget - flightBase) * frac, 240)
    }
  }
  wallet.addEventListener('vfx-coin', onCoin)

  function update() {
    const s = app.state
    if (!s) return
    const sh = s.shift
    const dayN = sh ? sh.day : s.day
    const t = sh ? gameTime(sh) : '06:00'
    const w = Number(s.wallet) || 0
    const st = formatStars(averageRating(s.ratings))
    const tk = sh ? shiftTake(sh) : 0
    const key = dayN + '|' + t + '|' + w + '|' + st + '|' + tk
    if (key === last) return
    last = key
    day.textContent = 'Ngày ' + dayN
    time.textContent = t
    const p = shiftProgress(t)
    if (p !== lastP) {
      lastP = p
      track.style.setProperty('--p', p.toFixed(3))
    }
    if (w !== lastWallet) {
      const f = fx()
      if (lastWallet === null || !f) wallet.textContent = formatMoneyShort(w)
      else f.countUp(wallet, null, w, 600, formatMoneyShort)
      lastWallet = w
      wallet.dataset.amount = String(w)
      money.title = 'Tiền quán: ' + formatVND(w)
    }
    stars.textContent = st
    if (tk !== takeTarget || takeShown === null) {
      takeTarget = tk
      if (takeShown === null) countTake(tk, 0)
      else if (tk < takeShown) countTake(tk, 400)          // hoàn tiền: giảm ngay, không chờ xu
      else if (flightBase === null) {
        if (fallback) clearTimeout(fallback)
        fallback = setTimeout(() => { fallback = 0; if (flightBase === null) countTake(readTake(), 600) }, TAKE_FALLBACK_MS)
      }
      take.title = 'Thu trong ca: ' + formatVND(tk) + ' (vào Tiền quán khi đóng ca)'
    }
  }
  function destroy() {
    if (fallback) { clearTimeout(fallback); fallback = 0 }
    wallet.removeEventListener('vfx-coin', onCoin)
  }
  update()
  return { el, update, destroy }
}
