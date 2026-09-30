// Màn mở đầu: lần đầu đặt tên xe (hoặc nhập mã sao lưu từ máy khác), lần sau vào quán.
// M3: màn chờ vào quán hiện ngẫu nhiên 1 thẻ Mẹo nghề đã mở (Sổ tay nghề).
import { h, svgBox } from '../dom.js'
import { DI_SAU, cartSvg } from '../art.js'
import { cartOptions } from '../components/meta-ui.js'
import { openImport } from './settings.js'
import { randomSeenTip } from '../../core/notebook.js'

export const DEFAULT_SHOP_NAME = 'Xe bánh mì đầu hẻm'

export default {
  mount(root, app) {
    const S = app.data.STRINGS
    const state = app.state
    const first = !state.shopName
    const cart = h('div', { class: 'title-cart' })
    // hình xe theo màu dù / đồ trang trí đang dùng (Góc Muỗng Vàng)
    const paintCart = name => { cart.innerHTML = cartSvg({ ...cartOptions(app.state, app.data), name: name || DEFAULT_SHOP_NAME }) }

    const enter = () => {
      app.sound('click')
      if (app.state.shift) app.go('service')
      else app.go('prep')
    }

    let body
    if (first) {
      const input = h('input', {
        class: 'input', type: 'text', testid: 'shop-name-input', maxLength: 30, value: DEFAULT_SHOP_NAME,
        placeholder: S.labels.shopNamePlaceholder, 'aria-label': S.labels.shopName, autocomplete: 'off',
        oninput: e => paintCart(e.target.value.trim())
      })
      const start = () => {
        const name = input.value.replace(/\s+/g, ' ').trim().slice(0, 30) || DEFAULT_SHOP_NAME
        app.state.shopName = name
        app.saveNow()
        enter()
      }
      input.addEventListener('keydown', e => { if (e.key === 'Enter') start() })
      body = h('div', { class: 'title-body' },
        h('div', { class: 'npc-talk' },
          svgBox(DI_SAU.vui, 'npc-face'),
          h('div', { class: 'bubble npc-bubble' },
            h('b', null, 'Dì Sáu'),
            h('p', null, app.data.DIALOGUE.diSau.intro),
            h('p', null, 'Con đặt tên cho xe đi, dì sơn lên tấm bảng liền.'),
            h('p', null, 'Mai mốt đông khách thì nhớ ghi order cho kỹ nghen!'))),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, S.labels.shopName), input),
        h('button', { class: 'btn btn-primary btn-big', type: 'button', testid: 'start-button', onclick: start }, S.buttons.start),
        // M3: đã chơi ở máy khác → nhập mã sao lưu (xem trước rồi mới dùng)
        h('button', {
          class: 'btn btn-ghost btn-wide', type: 'button', testid: 'title-import',
          onclick: () => { app.sound('click'); openImport(app) }
        }, 'Đã chơi ở máy khác? Nhập mã sao lưu'))
    } else {
      const tip = randomSeenTip(state, app.ctx, Math.random)
      body = h('div', { class: 'title-body' },
        h('p', { class: 'title-shop' }, state.shopName),
        h('p', { class: 'title-sub' }, state.shift ? `Ca ngày ${state.shift.day} đang dở, vào bán tiếp nhé!` : `Ngày ${state.day} · ${S.chang[1]}`),
        h('button', { class: 'btn btn-primary btn-big', type: 'button', testid: 'start-button', onclick: enter },
          state.shift ? S.buttons.continue : S.buttons.start),
        tip ? h('section', { class: 'card tip-card title-tip', testid: 'title-tip' },
          h('h2', { class: 'card-title' }, 'Mẹo nghề: ' + tip.title),
          h('p', null, tip.text)) : null)
    }
    paintCart(first ? DEFAULT_SHOP_NAME : state.shopName)

    const el = h('section', { class: 'title-screen', testid: 'screen-title' },
      h('h1', { class: 'game-title' }, S.gameTitle),
      h('p', { class: 'tagline' }, S.tagline),
      cart, body)
    root.appendChild(el)
    return { unmount() {} }
  }
}
