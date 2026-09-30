// Chợ Công Thức: 3 ngăn — Kệ Chính (món mua bằng Tiền quán, thẻ xem trước, nấu thử miễn phí, món Chặng 2 bóng mờ),
// Nâng cấp (dụng cụ mua bằng Tiền quán), Góc Muỗng Vàng (màu dù xe, đồ trang trí đã có, hiện vật).
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import { shopCatalog, buyShopRecipe, buyShopUpgrade, buyUmbrella, equipCosmetic } from '../../core/shop.js'
import { formatVND } from '../format.js'
import { screenHead, reasonText, spoonPill, cartView, DEFAULT_UMBRELLA } from '../components/meta-ui.js'

const TABS = [
  { id: 'recipes', label: 'Kệ Chính', testid: 'shop-tab-recipes' },
  { id: 'upgrades', label: 'Nâng cấp', testid: 'shop-tab-upgrades' },
  { id: 'spoons', label: 'Góc Muỗng Vàng', testid: 'shop-tab-spoons' }
]

const SLOT_LABELS = { du: 'Dù xe', bien: 'Biển xe', trang_tri: 'Trang trí' }

export default {
  mount(root, app, params = {}) {
    const S = app.data.STRINGS.meta
    let tab = TABS.some(t => t.id === params.tab) ? params.tab : 'recipes'
    let preview = null   // màu dù đang xem thử ở Góc Muỗng Vàng
    const el = h('section', { class: 'meta-screen shop-screen', testid: 'screen-shop' })
    root.appendChild(el)

    async function confirm(title, text, ok = 'Mua') {
      const v = await app.modal({
        title, text,
        actions: [{ label: 'Để sau', value: false, kind: 'ghost', testid: 'confirm-cancel' }, { label: ok, value: true, testid: 'confirm-ok' }]
      })
      return v === true
    }

    function render() {
      const state = app.state
      const cat = shopCatalog(state, app.ctx)
      el.textContent = ''
      el.appendChild(screenHead(app, { title: cat.name || S.shop, sub: 'Món mới, dụng cụ và màu dù cho xe', icon: 'ro', backLabel: '‹ Chuẩn bị' }))
      el.appendChild(h('nav', { class: 'seg-tabs', role: 'tablist' }, TABS.map(t => h('button', {
        class: ['seg-tab', t.id === tab ? 'active' : ''], type: 'button', role: 'tab', testid: t.testid,
        'aria-selected': String(t.id === tab), onclick: () => { if (tab !== t.id) { tab = t.id; app.sound('click'); render() } }
      }, t.label))))
      if (state.shift) el.appendChild(h('p', { class: 'card card-warn small' }, reasonText(app, 'dang_ban')))
      const body = h('div', { class: 'meta-body', testid: 'shop-' + tab })
      el.appendChild(body)
      if (tab === 'recipes') renderRecipes(body, cat, state)
      else if (tab === 'upgrades') renderUpgrades(body, cat, state)
      else renderSpoons(body, cat, state)
    }

    // ---------- Kệ Chính ----------
    function knives(n) {
      return h('span', { class: 'knives', 'aria-label': `Độ khó ${n}/5` },
        [1, 2, 3, 4, 5].map(i => svgBox(icon('dao_thep'), ['knife', i <= n ? 'on' : 'off'].join(' '))))
    }

    function renderRecipes(body, cat, state) {
      const MT = app.data.MINIGAME_TYPES || {}
      body.appendChild(h('p', { class: 'meta-hint' }, 'Món mới vào thực đơn ngay, khách gọi nhiều gấp đôi trong 2 ca đầu. Được nấu thử miễn phí 1 lần trước khi mua.'))
      for (const r of cat.recipes) {
        const tastingThis = state.tasting && state.tasting.recipeId === r.id
        const mech = r.newMechanics.length
          ? r.newMechanics.map(t => (MT[t] && MT[t].name) || t).join(', ')
          : 'Không có, toàn thao tác đã quen'
        const status = r.owned ? h('span', { class: 'badge' }, 'Đã có trong thực đơn')
          : !r.unlocked ? h('span', { class: 'badge badge-lock' }, S.fromDay.replace('{n}', String(r.fromDay))) : null
        const trialLabel = tastingThis ? 'Nấu thử tiếp' : r.tried ? S.tasted : S.tasteFree
        // đang nấu thử dở món khác: phải ra món đó trước (mỗi món chỉ được nấu thử miễn phí 1 lần)
        const otherName = r.tastingOther && !r.tried && app.data.RECIPES[state.tasting.recipeId] ? app.data.RECIPES[state.tasting.recipeId].name : ''
        body.appendChild(h('article', { class: ['shop-card', r.owned ? 'is-owned' : ''], testid: 'shop-item-' + r.id },
          h('div', { class: 'shop-card-top' },
            svgBox(icon(r.icon || r.id), 'shop-dish'),
            h('div', { class: 'shop-card-name' },
              h('h2', null, r.name),
              h('div', { class: 'shop-card-sub' }, knives(r.difficulty || 1), h('span', null, S.stepsCount.replace('{n}', String(r.steps)))),
              status)),
          r.desc ? h('p', { class: 'shop-desc' }, r.desc) : null,
          h('dl', { class: 'shop-facts' },
            fact('Giá bán', formatVND(r.price)),
            fact('Giá vốn', formatVND(r.cost)),
            fact(S.profitPerPortion, formatVND(r.profit), 'good'),
            fact('Hoàn vốn', r.paybackShifts ? `khoảng ${r.paybackShifts} ca` : '—'),
            fact('Cơ chế mới', mech, 'wide')),
          r.owned ? null : h('div', { class: 'shop-actions' },
            h('button', {
              class: 'btn btn-ghost', type: 'button', testid: 'shop-trial-' + r.id,
              disabled: !(r.canTaste || tastingThis) || !!state.shift,
              onclick: () => { app.sound('click'); app.go('tasting', { recipeId: r.id }) }
            }, trialLabel),
            h('button', {
              class: 'btn btn-primary', type: 'button', testid: 'shop-buy-' + r.id, disabled: !r.canBuy,
              dataset: { price: r.shopPrice },
              onclick: () => buyRecipe(r)
            }, r.unlocked ? `Mua · ${formatVND(r.shopPrice)}` : S.fromDay.replace('{n}', String(r.fromDay)))),
          otherName && !r.owned ? h('p', { class: 'shop-lack small', testid: 'shop-trial-note-' + r.id }, `Đang nấu thử dở ${otherName}. Ra món đó trước rồi mới nấu thử món này.`) : null,
          !r.owned && r.unlocked && !r.canAfford ? h('p', { class: 'shop-lack small' }, `Còn thiếu ${formatVND(r.shopPrice - state.wallet)} Tiền quán`) : null))
      }
      // Món sự kiện đã nhận (giữ vĩnh viễn)
      const evOwned = Object.entries(state.eventRecipes || {}).filter(([id]) => app.data.RECIPES[id] && state.recipes[id])
      if (evOwned.length) {
        body.appendChild(h('h2', { class: 'meta-section' }, 'Món sự kiện đã có'))
        for (const [id, info] of evOwned) {
          const rec = app.data.RECIPES[id]
          body.appendChild(h('div', { class: 'shop-card is-owned compact', testid: 'shop-event-' + id },
            h('div', { class: 'shop-card-top' }, svgBox(icon(rec.icon || id), 'shop-dish small'),
              h('div', { class: 'shop-card-name' }, h('h2', null, rec.name),
                h('span', { class: 'badge badge-event' }, info.label || 'Món sự kiện'),
                h('p', { class: 'small muted' }, S.eventRecipeKept)))))
        }
      }
      // Món Chặng 2 (bóng mờ)
      if (cat.teasers.length) {
        body.appendChild(h('h2', { class: 'meta-section' }, 'Sắp có ở chặng sau'))
        body.appendChild(h('div', { class: 'teaser-grid' }, cat.teasers.map(t => h('div', { class: 'teaser', testid: 'shop-teaser-' + t.id, 'aria-disabled': 'true' },
          svgBox(icon(t.icon || t.id), 'teaser-img'),
          h('b', null, t.name),
          h('small', null, t.note || 'Cần Quán cóc vỉa hè')))))
      }
    }

    function fact(label, value, cls = '') {
      return h('div', { class: ['shop-fact', cls] }, h('dt', null, label), h('dd', null, value))
    }

    async function buyRecipe(r) {
      if (!(await confirm(`Mua ${r.name}?`, `Trả ${formatVND(r.shopPrice)} Tiền quán. Món vào thực đơn ngay, không hoàn tiền.`))) return
      const res = buyShopRecipe(app.state, r.id, app.ctx)
      if (!res.ok) { app.toast(reasonText(app, res.reason), { kind: 'bad' }); return }
      app.sound('coin')
      app.vibrate(20)
      app.toast(`Đã mua ${r.name}! Khách sẽ gọi nhiều gấp đôi trong 2 ca đầu.`, { kind: 'good', testid: 'shop-bought' })
      app.saveNow()
      render()
    }

    // ---------- Nâng cấp ----------
    function renderUpgrades(body, cat, state) {
      body.appendChild(h('p', { class: 'meta-hint' }, 'Dụng cụ dùng mãi mãi, trả bằng Tiền quán. Mỗi món đồ đều thấy rõ trên màn chơi.'))
      for (const u of cat.upgrades) {
        const label = u.owned ? 'Đã có' : !u.unlocked ? S.fromDay.replace('{n}', String(u.fromDay)) : `Mua · ${formatVND(u.price)}`
        body.appendChild(h('article', { class: ['up-card', u.owned ? 'is-owned' : '', !u.unlocked ? 'is-locked' : ''], testid: 'upgrade-' + u.id },
          svgBox(icon(u.icon || u.id), 'up-icon'),
          h('div', { class: 'up-info' }, h('b', null, u.name), h('p', null, u.desc),
            !u.owned && u.unlocked && !u.canAfford ? h('p', { class: 'shop-lack small' }, `Còn thiếu ${formatVND(u.price - state.wallet)}`) : null),
          h('button', {
            class: ['btn', u.owned ? 'btn-ghost' : 'btn-secondary', 'up-buy'], type: 'button', testid: 'upgrade-buy-' + u.id,
            disabled: !u.canBuy, onclick: () => buyUpgrade(u)
          }, label)))
      }
    }

    async function buyUpgrade(u) {
      if (!(await confirm(`Mua ${u.name}?`, `Trả ${formatVND(u.price)} Tiền quán. ${u.desc}`))) return
      const r = buyShopUpgrade(app.state, u.id, app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason === 'khong_du_tien' ? 'thieu_tien' : r.reason), { kind: 'bad' }); return }
      app.sound('coin')
      app.toast('Đã mua ' + u.name, { kind: 'good' })
      app.saveNow()
      render()
    }

    // ---------- Góc Muỗng Vàng ----------
    function renderSpoons(body, cat, state) {
      const C = app.data.COSMETICS || {}
      const eq = (state.cosmetics && state.cosmetics.equipped) || {}
      const cart = cartView(state, app.data, 'cart-view shop-cart', preview !== null ? { du: preview || null } : {})
      // đang xem thử một màu dù (chạm ô màu): nhắc rõ để không nhầm là đã đổi
      const previewName = preview === null ? '' : preview ? ((C[preview] && C[preview].name) || '') : 'Dù cũ của Dì Sáu'
      const previewing = preview !== null && (preview || null) !== (eq.du || null)
      body.appendChild(h('div', { class: 'spoon-top' }, cart,
        previewing ? h('span', { class: 'spoon-preview', testid: 'parasol-previewing' }, 'Đang xem thử: ' + previewName) : null,
        h('div', { class: 'spoon-balance' }, spoonPill(state.goldSpoons || 0, 'spoon-balance'),
          h('p', { class: 'small muted' }, 'Muỗng Vàng nhận từ điểm danh, Việc hôm nay, chuỗi nhiệm vụ và Hộp thư. Màu dù chỉ để đẹp xe, không đổi cách chơi.'))))

      body.appendChild(h('h2', { class: 'meta-section' }, 'Màu dù xe'))
      const list = h('div', { class: 'parasol-list' })
      // dù mặc định
      list.appendChild(parasolCard({ id: 'mac_dinh', name: 'Dù cũ của Dì Sáu', color: DEFAULT_UMBRELLA.color, owned: true, equipped: !eq.du, price: 0 }, state))
      for (const u of cat.umbrellas) list.appendChild(parasolCard(u, state))
      // dù đổi từ sự kiện (đã có)
      for (const id of ((state.cosmetics && state.cosmetics.owned) || [])) {
        const c = C[id]
        if (!c || c.slot !== 'du' || cat.umbrellas.some(u => u.id === id)) continue
        list.appendChild(parasolCard({ id, name: c.name, color: c.color, owned: true, equipped: eq.du === id, price: 0 }, state))
      }
      body.appendChild(list)

      // đồ trang trí khác đã có (viền biển xe, bảng đèn, chậu hoa)
      const others = ((state.cosmetics && state.cosmetics.owned) || []).filter(id => C[id] && C[id].slot !== 'du')
      if (others.length) {
        body.appendChild(h('h2', { class: 'meta-section' }, 'Đồ trang trí đã có'))
        body.appendChild(h('div', { class: 'deco-list' }, others.map(id => {
          const c = C[id]
          const on = eq[c.slot] === id
          return h('div', { class: 'deco-item', testid: 'deco-' + id },
            h('div', null, h('b', null, c.name), h('small', { class: 'muted' }, SLOT_LABELS[c.slot] || '')),
            h('button', {
              class: ['btn', 'btn-small', on ? 'btn-ghost' : 'btn-secondary'], type: 'button', testid: 'deco-use-' + id,
              onclick: () => {
                equipCosmetic(app.state, on ? null : id, app.ctx, c.slot)
                app.sound('click'); app.saveNow(); render()
              }
            }, on ? 'Tháo xuống' : S.equip))
        })))
      }

      // hiện vật và danh hiệu
      const I = app.data.ITEMS || {}
      const items = Object.entries(state.items || {}).filter(([id, n]) => I[id] && n > 0)
      const titles = (state.titles || []).map(id => app.data.TITLES && app.data.TITLES[id]).filter(Boolean)
      if (items.length || titles.length) {
        body.appendChild(h('h2', { class: 'meta-section' }, 'Túi đồ'))
        body.appendChild(h('ul', { class: 'bag-list', testid: 'bag' },
          items.map(([id, n]) => h('li', null, svgBox(icon(I[id].icon || id), 'bag-icon'),
            h('div', null, h('b', null, I[id].name + (I[id].consumable ? ` ×${n}` : '')), h('small', null, I[id].desc)))),
          titles.map(t => h('li', null, svgBox(icon('danh_hieu'), 'bag-icon'), h('div', null, h('b', null, 'Danh hiệu: ' + t.name))))))
      }
    }

    function parasolCard(u, state) {
      const isDefault = u.id === 'mac_dinh'
      let label, kind, action
      if (u.equipped) { label = S.equipped; kind = 'btn-ghost'; action = null }
      else if (u.owned) { label = S.equip; kind = 'btn-secondary'; action = () => equip(u) }
      else { label = 'Mua'; kind = 'btn-primary'; action = () => buyParasol(u) }
      const previewing = preview !== null && (preview || 'mac_dinh') === u.id
      return h('div', { class: ['parasol', u.equipped ? 'is-on' : '', previewing ? 'is-preview' : ''], testid: 'parasol-card-' + u.id },
        h('button', {
          class: 'parasol-swatch', type: 'button', 'aria-label': 'Xem thử ' + u.name, testid: 'parasol-preview-' + u.id,
          style: { '--sw': u.color || '#ccc' }, dataset: { pattern: u.pattern || '' },
          onclick: () => { preview = isDefault ? '' : u.id; render() }
        }),
        h('div', { class: 'parasol-name' }, h('b', null, u.name),
          h('small', { class: 'muted' }, u.owned ? (isDefault ? 'Có sẵn' : 'Đã có') : `${u.price} Muỗng Vàng` + (u.pattern === 'soc' ? ' · sọc ba màu' : ''))),
        h('button', {
          class: ['btn', 'btn-small', kind], type: 'button', testid: 'parasol-' + u.id,
          disabled: !action || (!u.owned && !u.canAfford), dataset: { owned: u.owned ? 'true' : 'false', equipped: u.equipped ? 'true' : 'false' },
          onclick: () => action && action()
        }, label))
    }

    function equip(u) {
      const r = u.id === 'mac_dinh' ? equipCosmetic(app.state, null, app.ctx, 'du') : equipCosmetic(app.state, u.id, app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
      preview = null
      app.sound('click')
      app.saveNow()
      render()
    }

    async function buyParasol(u) {
      preview = u.id
      render()
      if (!(await confirm(`Mua ${u.name}?`, `Trả ${u.price} Muỗng Vàng. Dù được căng lên xe ngay.`))) { preview = null; render(); return }
      const r = buyUmbrella(app.state, u.id, app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); preview = null; render(); return }
      preview = null
      app.sound('coin')
      app.toast(`Xe đã căng ${u.name.toLocaleLowerCase('vi-VN')}!`, { kind: 'good' })
      app.saveNow()
      render()
    }

    render()
    return { unmount() {} }
  }
}
