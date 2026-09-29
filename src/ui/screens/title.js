// Màn mở đầu: lần đầu đặt tên xe, lần sau vào quán.
import { h, svgBox } from '../dom.js'
import { DI_SAU, cartSvg } from '../art.js'

export const DEFAULT_SHOP_NAME = 'Xe bánh mì đầu hẻm'

export default {
  mount(root, app) {
    const S = app.data.STRINGS
    const state = app.state
    const first = !state.shopName
    const cart = h('div', { class: 'title-cart' })
    const paintCart = name => { cart.innerHTML = cartSvg({ name: name || DEFAULT_SHOP_NAME }) }

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
        h('button', { class: 'btn btn-primary btn-big', type: 'button', testid: 'start-button', onclick: start }, S.buttons.start))
    } else {
      body = h('div', { class: 'title-body' },
        h('p', { class: 'title-shop' }, state.shopName),
        h('p', { class: 'title-sub' }, state.shift ? `Ca ngày ${state.shift.day} đang dở, vào bán tiếp nhé!` : `Ngày ${state.day} · ${S.chang[1]}`),
        h('button', { class: 'btn btn-primary btn-big', type: 'button', testid: 'start-button', onclick: enter },
          state.shift ? S.buttons.continue : S.buttons.start))
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
