// Nút "?" (Hướng dẫn) và bảng Hướng dẫn: xem lại hướng dẫn màn này, trang Cách chơi, xem lại tất cả hướng dẫn từ đầu
// (xác nhận ngay trong bảng, không dùng confirm()). Nút có ở HUD ca bán, đầu màn Chuẩn bị, Tổng kết và các màn con có tour.
// Bảng mở bằng hộp thoại chung (app.modal, lớp nổi gốc: không bị thanh tab che trên iPhone), chặn thời gian ca như mọi hộp
// thoại chặn; trong ca còn "giữ" màn ca bán (app.tour.hold): bước mini-game đang chơi dở sẽ chơi lại từ đầu như khi đổi tab.
import { h, svgBox } from '../dom.js'
import { DI_SAU, icon } from '../art.js'
import { resetTours } from '../../core/tour.js'

/** Nút tròn "?" (vùng chạm 44px, nhãn trợ năng "Hướng dẫn"). */
export function helpButton(app, { className = '' } = {}) {
  return h('button', {
    class: ['help-btn', className], type: 'button', testid: 'help-button', 'aria-label': 'Hướng dẫn', title: 'Hướng dẫn',
    onclick: () => { app.sound('click'); openHelp(app) }
  }, h('span', { 'aria-hidden': 'true' }, '?'))
}

function cardIcon(id) {
  return svgBox(id === 'di_sau' ? DI_SAU.vui : icon(id), 'how-icon')
}

/** Trang "Cách chơi": các thẻ ngắn có hình (dữ liệu HOW_TO_PLAY). */
export function howToPlay(app) {
  const cards = app.data.HOW_TO_PLAY || []
  return h('section', { class: 'how-to-play', testid: 'how-to-play' },
    h('h2', { class: 'modal-title' }, 'Cách chơi'),
    h('ul', { class: 'how-list' }, cards.map(c => h('li', { class: 'how-card', testid: 'how-card-' + c.id },
      cardIcon(c.icon),
      h('div', { class: 'how-text' }, h('b', null, c.title), h('p', null, c.text))))))
}

/**
 * Mở bảng Hướng dẫn. → Promise (đóng bảng; nếu chọn xem lại thì tour đã bắt đầu).
 */
export function openHelp(app) {
  if (app.locked || (app.tour && app.tour.isActive())) return Promise.resolve(null)
  if (typeof app.modalOpen === 'function' && app.modalOpen()) return Promise.resolve(null)
  const tour = app.tour
  const TOURS = app.data.TOURS || {}
  // giữ màn trước (ca dừng, bước mini-game dở dừng lại) rồi mới xem màn đang ở khâu nào
  if (tour) tour.hold('help', true)
  const ids = tour ? tour.screenTours() : []
  const names = ids.map(id => TOURS[id] && TOURS[id].name).filter(Boolean)
  const done = app.modal({
    testid: 'help-sheet', className: 'help-modal', dismissible: true,
    render: close => {
      const box = h('div', { class: 'help-box' })
      const fill = (...nodes) => { box.textContent = ''; for (const n of nodes) if (n) box.appendChild(n) }
      const closeBtn = (label = 'Đóng') => h('button', { class: 'btn btn-ghost', type: 'button', testid: 'help-close', onclick: () => close(null) }, label)
      const focusFirst = () => {
        const b = box.querySelector('button:not(:disabled)')
        if (b) setTimeout(() => b.focus({ preventScroll: true }), 30)
      }
      const menu = () => {
        fill(
          h('div', { class: 'help-head' }, svgBox(DI_SAU.vui, 'npc-face small'),
            h('div', null, h('h2', { class: 'modal-title help-title' }, 'Hướng dẫn'), h('p', { class: 'small muted' }, 'Con cần dì chỉ lại chỗ nào?'))),
          h('div', { class: 'choice-list help-choices' },
            h('button', {
              class: 'choice help-choice', type: 'button', testid: 'help-replay', disabled: !ids.length,
              onclick: () => close('replay')
            }, h('b', null, 'Xem lại hướng dẫn màn này'),
            h('small', null, ids.length ? names.join(' · ') : 'Chỗ này chưa có hướng dẫn riêng, con xem Cách chơi nha.')),
            h('button', { class: 'choice help-choice', type: 'button', testid: 'help-how', onclick: () => how() },
              h('b', null, 'Cách chơi'), h('small', null, 'Tóm tắt luật chơi trong vài thẻ ngắn.')),
            h('button', { class: 'choice help-choice', type: 'button', testid: 'help-reset', onclick: () => confirmReset() },
              h('b', null, 'Xem lại tất cả hướng dẫn từ đầu'), h('small', null, 'Mỗi màn, mỗi khâu sẽ hướng dẫn lại lần đầu con ghé.'))),
          h('div', { class: 'modal-actions' }, closeBtn()))
        focusFirst()
      }
      const how = () => {
        fill(howToPlay(app),
          h('div', { class: 'modal-actions' },
            h('button', { class: 'btn btn-ghost', type: 'button', testid: 'help-back', onclick: () => menu() }, '‹ Quay lại'),
            h('button', { class: 'btn btn-primary', type: 'button', testid: 'help-close', onclick: () => close(null) }, 'Đã hiểu')))
        const card = box.closest('.modal')
        if (card) card.scrollTop = 0
        focusFirst()
      }
      const confirmReset = () => {
        fill(
          h('div', { class: 'help-head' }, svgBox(DI_SAU.lo, 'npc-face small'), h('h2', { class: 'modal-title help-title' }, 'Xem lại từ đầu?')),
          h('p', { class: 'modal-text', testid: 'help-reset-text' }, 'Dì sẽ hướng dẫn lại mọi màn và mọi khâu như lần đầu, kể cả chỗ con đã xem. Tiến trình chơi giữ nguyên.'),
          h('div', { class: 'modal-actions' },
            h('button', { class: 'btn btn-ghost', type: 'button', testid: 'help-reset-cancel', onclick: () => menu() }, 'Thôi'),
            h('button', { class: 'btn btn-primary', type: 'button', testid: 'help-reset-confirm', onclick: () => close('reset') }, 'Xem lại từ đầu')))
        focusFirst()
      }
      menu()
      return box
    }
  })
  return done.then(v => {
    try {
      if (v === 'replay' && tour) {
        // bắt đầu tour TRƯỚC khi thôi giữ màn (bước mini-game không bị mở lại rồi dừng ngay)
        const now = tour.screenTours()
        const p = now.length ? tour.start(now) : Promise.resolve('empty')
        p.then(r => { if (r === 'empty') app.toast('Chỗ này chưa có hướng dẫn riêng.', { kind: 'info' }) })
      } else if (v === 'reset' && app.state) {
        resetTours(app.state)
        app.saveNow()
        app.toast('Dì sẽ hướng dẫn lại từng màn khi con ghé tới.', { kind: 'good', testid: 'help-reset-done' })
        if (tour) tour.wantScreen()
      }
    } finally {
      if (tour) tour.hold('help', false)
    }
    return v
  })
}
