// Màn Chuẩn bị ca: thông tin ngày, thực đơn, dự báo khách, Mẹo nghề, nâng cấp, mượn Dì Sáu, "Mở hàng".
import { h, svgBox } from '../dom.js'
import { DI_SAU, icon } from '../art.js'
import { startShift, customerCount } from '../../core/shift.js'
import { averageRating } from '../../core/scoring.js'
import { orderableRecipes } from '../../core/customer.js'
import { takeLoan, buyUpgrade, offerLoan } from '../../core/economy.js'
import { masteryLevel } from '../../core/mastery.js'
import { formatVND, formatStars } from '../format.js'

function pickRandom(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null
}

export default {
  mount(root, app) {
    const S = app.data.STRINGS
    const D = app.data.DIALOGUE
    const el = h('section', { class: 'prep-screen', testid: 'screen-prep' })
    root.appendChild(el)

    function render() {
      const state = app.state
      el.textContent = ''
      const avg = averageRating(state.ratings)
      const menu = orderableRecipes(state, app.ctx)
      const forecast = customerCount(state, app.ctx, state.day)
      const levels = app.data.BALANCE.masteryLevels

      // Đầu màn
      el.appendChild(h('header', { class: 'prep-head' },
        h('div', null,
          h('div', { class: 'prep-shop' }, state.shopName),
          h('h1', { class: 'prep-day', testid: 'prep-day' }, `Ngày ${state.day}`),
          h('div', { class: 'prep-sub' }, S.screens.prep + ' · ' + S.chang[state.chang || 1])),
        h('div', { class: 'prep-stats' },
          stat(S.labels.wallet, formatVND(state.wallet), 'prep-wallet'),
          stat(S.labels.reputation, String(state.reputation)),
          stat(S.labels.rating, '★ ' + formatStars(avg)))))

      // Lời Dì Sáu
      const line = state.day === 1 ? D.diSau.tutorial.order : pickRandom(D.diSau.shiftStart)
      el.appendChild(h('div', { class: 'npc-talk' }, svgBox(DI_SAU.vui, 'npc-face'),
        h('div', { class: 'bubble npc-bubble' }, h('b', null, 'Dì Sáu'), h('p', null, line))))

      // Nợ và mượn Dì Sáu
      if (state.loan) {
        el.appendChild(h('div', { class: 'card card-warn', testid: 'loan-info' },
          `${S.labels.loan}: còn ${formatVND(state.loan.remaining)}. Ca nào có lãi sẽ trả dần.`))
      } else if (offerLoan(state, app.data.BALANCE)) {
        el.appendChild(h('div', { class: 'card card-warn' },
          h('div', { class: 'npc-talk compact' }, svgBox(DI_SAU.lo, 'npc-face small'), h('p', null, D.diSau.loanOffer)),
          h('button', {
            class: 'btn btn-secondary', type: 'button', testid: 'take-loan',
            onclick: () => {
              if (takeLoan(app.state, app.data.BALANCE)) {
                app.sound('coin')
                app.toast(`Dì Sáu cho mượn ${formatVND(app.state.loan.amount)}.`, { kind: 'good' })
                app.saveNow()
                render()
              }
            }
          }, 'Dì Sáu cho mượn')))
      }

      // Thực đơn
      el.appendChild(h('section', { class: 'card' },
        h('h2', { class: 'card-title' }, 'Thực đơn hôm nay'),
        h('div', { class: 'prep-menu' }, menu.map(id => {
          const r = app.data.RECIPES[id]
          const p = state.recipes[id]
          const lv = masteryLevel(p, levels)
          return h('div', { class: 'prep-dish', testid: 'prep-dish-' + id },
            svgBox(icon(r.icon || id), 'dish-icon'),
            h('div', { class: 'prep-dish-name' }, r.name),
            h('div', { class: 'prep-dish-price' }, formatVND(r.price)),
            h('div', { class: 'prep-dish-lv' }, `${S.labels.mastery}: ${S.masteryLevels[lv] || lv}`))
        }))))

      // Dự báo
      el.appendChild(h('section', { class: 'card prep-forecast' },
        h('h2', { class: 'card-title' }, 'Dự báo'),
        h('p', { testid: 'prep-forecast' }, `Khoảng ${forecast} khách ghé xe trong ca sáng nay (06:00 – 10:00).`),
        state.day >= (app.data.BALANCE.qrFromDay || 4) ? h('p', { class: 'muted' }, 'Có khách trả bằng chuyển khoản QR.') : null))

      // Mẹo nghề đã mở
      const tips = (Array.isArray(app.data.TIPS) ? app.data.TIPS : []).filter(t => state.tipsSeen.includes(t.id))
      const tip = pickRandom(tips)
      if (tip) {
        el.appendChild(h('section', { class: 'card tip-card', testid: 'prep-tip' },
          h('h2', { class: 'card-title' }, 'Mẹo nghề: ' + tip.title),
          h('p', null, tip.text)))
      }

      // Nâng cấp
      const ups = Object.values(app.data.UPGRADES || {}).filter(u => (u.fromDay || 1) <= state.day || state.upgrades[u.id])
      if (ups.length) {
        el.appendChild(h('section', { class: 'card' },
          h('h2', { class: 'card-title' }, S.screens.upgrades),
          h('div', { class: 'upgrade-list' }, ups.map(u => {
            const owned = !!state.upgrades[u.id]
            return h('div', { class: 'upgrade', testid: 'upgrade-' + u.id },
              svgBox(icon(u.icon || u.id), 'dish-icon small'),
              h('div', { class: 'upgrade-info' }, h('b', null, u.name), h('p', null, u.desc)),
              h('button', {
                class: ['btn', owned ? 'btn-ghost' : 'btn-secondary', 'btn-small'], type: 'button',
                disabled: owned || state.wallet < u.price, testid: 'buy-' + u.id,
                onclick: () => {
                  const r = buyUpgrade(app.state, u.id, app.ctx)
                  if (r.ok) { app.sound('coin'); app.toast('Đã mua ' + u.name, { kind: 'good' }); app.saveNow(); render() }
                  else app.toast(S.messages.notEnoughMoney, { kind: 'bad' })
                }
              }, owned ? S.buttons.owned : formatVND(u.price)))
          }))))
      }

      // Tính năng sắp có (M2)
      el.appendChild(h('section', { class: 'soon-grid' },
        ['Chợ Công Thức', 'Nhiệm vụ', 'Điểm danh', 'Hộp thư'].map(name =>
          h('div', { class: 'soon-item', 'aria-disabled': 'true' }, h('span', null, name), h('small', null, 'Sắp có')))))

      // Cài đặt nhanh
      el.appendChild(settingsCard(app))

      el.appendChild(h('div', { class: 'sticky-foot' },
        h('button', {
          class: 'btn btn-primary btn-big', type: 'button', testid: 'open-shift',
          onclick: () => {
            startShift(app.state, app.ctx)
            app.sound('bell')
            app.saveNow()
            app.go('service')
          }
        }, S.buttons.openShift)))
    }

    function stat(label, value, testid) {
      return h('div', { class: 'stat' }, h('span', { class: 'stat-label' }, label), h('b', { class: 'stat-value', testid }, value))
    }

    render()
    return { unmount() {} }
  }
}

// Công tắc cài đặt cơ bản (M3 sẽ có màn Cài đặt riêng).
function settingsCard(app) {
  const s = app.state.settings
  const items = [
    ['sound', 'Âm thanh'], ['vibrate', 'Rung'], ['tips', 'Mẹo nghề'],
    ['assistCash', 'Hỗ trợ tính tiền'], ['assistMotion', 'Hỗ trợ thao tác'], ['reducedMotion', 'Giảm chuyển động']
  ]
  return h('details', { class: 'card settings-card' },
    h('summary', { class: 'card-title' }, 'Cài đặt'),
    h('div', { class: 'toggle-list' }, items.map(([key, label]) =>
      h('label', { class: 'toggle' },
        h('input', {
          type: 'checkbox', checked: !!s[key], testid: 'setting-' + key,
          onchange: e => { app.state.settings[key] = e.target.checked; app.applySettings(); app.saveNow() }
        }),
        h('span', null, label)))))
}
