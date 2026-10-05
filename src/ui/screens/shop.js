// Chợ Công Thức: 3 ngăn — Kệ Chính (món mua bằng Tiền quán, thẻ xem trước, nấu thử miễn phí, công thức hiếm ★, món Chặng 2
// bóng mờ), Nâng cấp (dụng cụ mua bằng Tiền quán), Góc Muỗng Vàng (màu dù xe, đồ trang trí đã có, túi đồ).
// M5 Đợt 3 (gói M-B, bản 0.5.2): sạp chợ kiểu game — mái bạt sọc, kệ gỗ nhiều tầng có biển phấn, mỗi món là thẻ giấy có hình
// món to, giá là viên có hình (xu Tiền quán / Muỗng Vàng), nhãn "Mới" / "Đã có", mảnh công thức có hình, món chặng sau là
// bóng tối có ổ khóa; nâng cấp có hình dụng cụ; màu dù là ô dù to. Mua xong: hình món / dụng cụ / ô dù bay vào xe đẩy (nhân
// bản rồi bay, src/ui/vfx.js), ví đếm xuống; thiếu tiền: viên giá rung + lý do. Hiệu ứng chỉ kích theo SỰ KIỆN (bấm mua,
// chạm nút bị khóa), không kích trong render(). Không đổi luật, giá, tỉ lệ.
// Import trong Node an toàn: không chạm DOM ở cấp module.
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import { metaArt } from '../art/meta.js'
import { SCENE_ICONS } from '../art/scene.js'
import { shopCatalog, buyShopRecipe, buyShopUpgrade, buyUmbrella, equipCosmetic } from '../../core/shop.js'
import { formatVND, formatK, formatMoneyShort } from '../format.js'
import { rareActive, rareConfig, rareRecipeIds, rareUnlockInfo, recipeRareNeed } from '../../core/rare.js'
import { screenHead, reasonText, spoonPill, cartView, cartArt, cartOptions, DEFAULT_UMBRELLA } from '../components/meta-ui.js'
import { isReduced } from '../motion.js'

const TABS = [
  { id: 'recipes', label: 'Kệ Chính', testid: 'shop-tab-recipes', art: () => icon('mon_banh_trang_tron') },
  { id: 'upgrades', label: 'Nâng cấp', testid: 'shop-tab-upgrades', art: () => icon('dao_thep') },
  { id: 'spoons', label: 'Góc Muỗng Vàng', testid: 'shop-tab-spoons', art: () => metaArt('muong_vang') }
]

const SLOT_LABELS = { du: 'Dù xe', bien: 'Biển xe', trang_tri: 'Trang trí' }

// Nâng cấp dùng ở khâu nào (chỉ để hiển thị): hình loại thao tác / khâu quầy + tên khâu.
const UP_WHERE = Object.freeze({
  dao_thep: { mt: 'thai', text: 'Khâu Thái' },
  chao_chong_dinh: { mt: 'lua', text: 'Khâu Canh lửa' },
  ghe_nhua: { scene: 'hud_gio', text: 'Khách chờ lâu hơn' },
  loa_bao_tien: { scene: 'khau_tinh_tien', text: 'Khâu Tính tiền' },
  may_tinh: { scene: 'khau_thanh_toan', text: 'Khâu Thanh toán' }
})

// Ổ khóa nhỏ (viền mực, thân vàng nghệ) cho món / dụng cụ chưa mở.
const LOCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><g stroke="#3a2618" stroke-width="2" stroke-linejoin="round">' +
  '<path d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3" fill="none" stroke-width="2.6"/>' +
  '<rect x="4.5" y="10.5" width="15" height="11" rx="2.5" fill="#f7b928"/>' +
  '<path d="M16 10.5h1a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5h-1Z" fill="#c98a0c" stroke="none"/>' +
  '<circle cx="12" cy="15.2" r="1.7" fill="#3a2618" stroke="none"/><path d="M12 16v2.6" stroke-width="2"/></g></svg>'

/** Hình theo id: hình meta.js trước (món tương lai, quà, mảnh…), không có thì icon() của art.js. */
function artOf(id) {
  return metaArt(id) || icon(id)
}

/** Phần trăm làm tròn cho tỉ lệ công khai. */
function pct(v) {
  return Math.round(v * 100) + '%'
}

export default {
  mount(root, app, params = {}) {
    const S = app.data.STRINGS.meta
    let tab = TABS.some(t => t.id === params.tab) ? params.tab : 'recipes'
    let preview = null   // màu dù đang xem thử ở Góc Muỗng Vàng
    let destroyed = false
    const el = h('section', { class: 'meta-screen shop-screen', testid: 'screen-shop' })
    root.appendChild(el)
    const fx = () => (destroyed ? null : app.vfx || null)
    const reduced = () => isReduced(app)
    const q = sel => el.querySelector(sel)

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
      el.dataset.tab = tab
      el.appendChild(screenHead(app, { title: cat.name || S.shop, sub: 'Món mới, dụng cụ và màu dù cho xe', icon: 'ro', backLabel: '‹ Chuẩn bị', help: true }))
      el.appendChild(h('nav', { class: 'seg-tabs shop-tabs', role: 'tablist' }, TABS.map(t => h('button', {
        class: ['seg-tab', 'shop-tab', t.id === tab ? 'active' : ''], type: 'button', role: 'tab', testid: t.testid,
        'aria-selected': String(t.id === tab), onclick: () => { if (tab !== t.id) { tab = t.id; preview = null; app.sound('click'); render() } }
      }, svgBox(t.art(), 'shop-tab-ico'), h('span', { class: 'shop-tab-lbl' }, t.label)))))
      if (state.shift) el.appendChild(h('p', { class: 'card card-warn small shop-warn' }, reasonText(app, 'dang_ban')))
      const body = h('div', { class: 'meta-body shop-body', testid: 'shop-' + tab })
      el.appendChild(body)
      if (tab === 'recipes') renderRecipes(body, cat, state)
      else if (tab === 'upgrades') renderUpgrades(body, cat, state)
      else renderSpoons(body, cat, state)
    }

    // ---------- Mảnh dùng chung ----------

    // Viên giá có hình: xu Tiền quán (money) hoặc Muỗng Vàng (spoon). Số ghi đủ (title / aria-label đủ chữ).
    function priceTag(amount, kind = 'money', extra = '') {
      const money = kind === 'money'
      const text = money ? formatVND(amount) : String(amount)
      return h('span', {
        class: ['shop-price', money ? 'is-money' : 'is-spoon', extra], title: money ? `${text} Tiền quán` : `${text} Muỗng Vàng`
      }, svgBox(money ? metaArt('xu') : metaArt('muong_vang'), 'shop-price-ico'), h('b', null, text))
    }

    // Sạp: mái bạt sọc + khung gỗ chứa các tầng kệ.
    function stall(...tiers) {
      return h('section', { class: 'shop-stall' }, h('div', { class: 'shop-awning', 'aria-hidden': 'true' }), h('div', { class: 'shop-shelf' }, tiers))
    }

    // Một tầng kệ: biển phấn + (tùy chọn) dải đồ đã có bên phải; nội dung; ván gỗ đỡ bên dưới.
    function tier(title, content, { side = null, tip = null, cls = '' } = {}) {
      return h('div', { class: ['shop-tier', cls] },
        h('div', { class: 'shop-tier-head' }, h('h2', { class: 'shop-sign' }, title), side),
        tip ? h('p', { class: 'shop-tip' }, tip) : null,
        content,
        h('div', { class: 'shop-plank', 'aria-hidden': 'true' }))
    }

    // Xe đẩy nhỏ + đồ đã có xếp chồng (đích bay khi mua). items: [{ id, svg, name }]; count: chữ số đếm ("3 món", "2/5").
    function ownedStrip(items, count, label) {
      const show = items.slice(-4)
      return h('div', { class: 'shop-owned', role: 'img', 'aria-label': label, title: label },
        h('span', { class: 'shop-owned-items' }, show.map(it => svgBox(it.svg, 'shop-owned-item', { dataset: { own: it.id } }))),
        h('span', { class: 'shop-owned-cart' },
          svgBox(cartArt(cartOptions(app.state, app.data)), 'shop-cart-mini'),
          h('b', { class: 'shop-owned-n' }, count)))
    }

    // Nút mua bọc trong một khung nhận chạm: nút bị khóa (thiếu tiền / chưa mở / đang bán) không nhận chạm (CSS
    // pointer-events: none), chạm rơi xuống khung → viên giá rung + lý do. Nút bấm được thì khung không làm gì.
    function buyWrap(btn, why) {
      return h('span', {
        class: ['shop-buy-wrap', btn.disabled ? 'is-off' : ''],
        onclick: e => {
          if (!btn.disabled || e.target !== e.currentTarget) return
          const r = why()
          if (r) refuse(btn, r)
        }
      }, btn)
    }

    // Không mua được: viên giá (hoặc cả nút) rung, âm báo, lời lý do (reasonText + phần thiếu).
    function refuse(btn, { reason, more = '' }) {
      const f = fx()
      const pill = btn.querySelector('.shop-price') || btn
      if (f) { try { f.shake(pill, 2) } catch { /* bỏ qua */ } }
      app.sound('error')
      app.toast(reasonText(app, reason) + (more ? ' · ' + more : ''), { kind: 'bad' })
    }

    // Lý do nút mua bị khóa (cho buyWrap).
    function lockReason(x, have, price, unit) {
      if (x.owned) return null
      if (x.unlocked === false) return { reason: 'chua_mo', more: S.fromDay.replace('{n}', String(x.fromDay)) }
      // món / dụng cụ không mua trong ca (màu dù thì được)
      if (unit === 'money' && app.state.shift) return { reason: 'dang_ban' }
      if (have < price) return unit === 'spoon'
        ? { reason: 'thieu_muong', more: `còn thiếu ${price - have} Muỗng Vàng` }
        : { reason: 'thieu_tien', more: `còn thiếu ${formatVND(price - have)}` }
      return null
    }

    // Hiệu ứng mua xong (gọi SAU render, from = khung hình nguồn lấy TRƯỚC render): hình bay vào đích, đích nảy + lấp lánh;
    // viên ví / Muỗng Vàng đếm xuống. Giảm chuyển động: không bay, một nhịp sáng ở đích.
    function celebrateBuy(from, html, target, { pay = 0, before = null, kind = 'money' } = {}) {
      const f = fx()
      if (!f || !target) return
      const pillTest = kind === 'money' ? 'meta-wallet' : 'meta-spoons'
      const pill = el.querySelector(`[data-testid="${pillTest}"]`)
      if (pill && pay > 0 && before !== null) {
        const num = pill.querySelector('b')
        const after = Number(pill.dataset.amount)
        try {
          if (num && Number.isFinite(after)) {
            f.countUp(num, before, after, 700, kind === 'money' ? formatMoneyShort : v => String(v), { step: kind === 'money' ? 500 : 1, glow: false })
          }
          f.floatText(pill, '−' + (kind === 'money' ? formatK(pay) : String(pay)), { tone: 'bad', size: 'small' })
        } catch { /* bỏ qua */ }
      }
      if (reduced() || !from) { try { f.glow(target) } catch { /* bỏ qua */ } return }
      const svgHtml = String(html || '').replace(/^<svg /, '<svg width="100%" height="100%" ')
      const node = `<span style="display:block;width:100%;height:100%">${svgHtml}</span>`
      // đích chỉ hiện khi mảnh bay tới (không thấy hai bản cùng lúc)
      const hideT = target.classList.contains('shop-owned-item')
      if (hideT) target.style.visibility = 'hidden'
      Promise.resolve(f.fly(from, target, { html: node, ms: 620, arc: 0.45 })).then(() => {
        if (hideT) target.style.visibility = ''
        if (destroyed || !target.isConnected) return
        try { f.burst(target, 'sparkle', { n: 8 }) } catch { /* bỏ qua */ }
        app.sound('sparkle')
      }, () => { if (hideT) target.style.visibility = '' })
    }

    // Phần tử đầu tiên đang hiện (có khung > 0) trong danh sách bộ chọn (đồ đã có bị ẩn ở màn hẹp → xe đẩy nhỏ).
    const shown = (...sels) => {
      for (const sel of sels) {
        const n = q(sel)
        if (n && n.getClientRects().length && n.getBoundingClientRect().width > 0) return n
      }
      return null
    }

    const rectOf = node => {
      if (!node || typeof node.getBoundingClientRect !== 'function') return null
      const r = node.getBoundingClientRect()
      return r.width > 0 ? { left: r.left, top: r.top, width: r.width, height: r.height } : null
    }

    // ---------- Kệ Chính ----------
    function knives(n) {
      return h('span', { class: 'knives', 'aria-label': `Độ khó ${n}/5`, title: `Độ khó ${n}/5` },
        [1, 2, 3, 4, 5].map(i => svgBox(icon('dao_thep'), ['knife', i <= n ? 'on' : 'off'].join(' '))))
    }

    function fact(label, value, art, cls = '') {
      return h('div', { class: ['shop-fact', cls] },
        h('dt', null, svgBox(art, 'shop-fact-ico'), h('span', null, label)),
        h('dd', null, value))
    }

    // Đĩa món có tem giá bán tròn (như bảng thực đơn ở Quầy) và ruy băng "Mới" / dấu "Đã có".
    function dishPlate(r, { big = true, tag = true, ribbon = null, done = false } = {}) {
      return h('div', { class: ['shop-plate', big ? '' : 'is-small'] },
        svgBox(icon(r.icon || r.id), 'shop-dish'),
        tag ? h('span', { class: 'shop-tag', 'aria-hidden': 'true' }, h('b', null, formatK(r.price).replace(/k$/, '')), /k$/.test(formatK(r.price)) ? h('small', null, 'k') : null) : null,
        ribbon ? h('span', { class: 'shop-ribbon' }, ribbon) : null,
        done ? svgBox(metaArt('dau_tick'), 'shop-done-tick') : null)
    }

    function renderRecipes(body, cat, state) {
      const MT = app.data.MINIGAME_TYPES || {}
      const R = app.data.RECIPES || {}
      const owned = Object.keys(state.recipes || {}).filter(id => R[id])
      const side = ownedStrip(owned.map(id => ({ id, svg: icon(R[id].icon || id), name: R[id].name })), `${owned.length} món`,
        `Thực đơn xe: ${owned.length} món (${owned.map(id => R[id].name).join(', ')})`)
      // thứ tự trên kệ: món mua được → món chưa mở → món đã có
      const rank = r => (r.owned ? 2 : r.unlocked ? 0 : 1)
      const list = cat.recipes.slice().sort((a, b) => rank(a) - rank(b))
      const cards = h('div', { class: 'shop-cards' }, list.map(r => r.owned ? ownedCard(r) : recipeCard(r, state, MT)))
      const tiers = [tier('Kệ Chính', cards, { side, tip: 'Món mới được gọi gấp đôi 2 ca đầu' })]

      // M4: công thức hiếm (mảnh n/3 có hình mảnh giấy; đủ mảnh thì nấu thử để mở món)
      const RC = rareConfig(app.ctx)
      const rareIds = rareActive(app.ctx) ? rareRecipeIds(app.ctx) : []
      const infos = rareIds.map(id => rareUnlockInfo(state, id, app.ctx))
      if (infos.length && (state.day >= RC.fromDay || infos.some(i => i.n > 0 || i.owned))) {
        tiers.push(tier(h('span', null, 'Công thức hiếm ', h('span', { class: 'rare-star' }, '★')),
          h('div', { class: 'shop-rares' }, infos.map(i => rareCard(i, state))),
          { tip: 'Gom đủ mảnh ở Gánh hàng quê và Giỏ chợ, rồi nấu thử đạt hạng Được là mở món', cls: 'is-rare' }))
      }
      // Món sự kiện đã nhận (giữ vĩnh viễn)
      const evOwned = Object.entries(state.eventRecipes || {}).filter(([id]) => R[id] && state.recipes[id])
      if (evOwned.length) {
        tiers.push(tier('Món sự kiện', h('div', { class: 'shop-cards' }, evOwned.map(([id, info]) => {
          const rec = R[id]
          return h('article', { class: 'shop-card is-owned is-compact', testid: 'shop-event-' + id },
            dishPlate(rec, { big: false, tag: false, done: true }),
            h('div', { class: 'shop-card-name' }, h('h3', null, rec.name),
              h('span', { class: 'shop-badge is-event' }, info.label || 'Món sự kiện'),
              h('small', null, S.eventRecipeKept)))
        }))))
      }
      // Món Chặng 2 (bóng tối + ổ khóa)
      if (cat.teasers.length) {
        tiers.push(tier('Chặng sau', h('div', { class: 'teaser-grid' }, cat.teasers.map(t => h('div', {
          class: 'teaser', testid: 'shop-teaser-' + t.id, 'aria-disabled': 'true', role: 'img', 'aria-label': `${t.name}: ${t.note || 'Cần Quán cóc vỉa hè'}`
        },
        h('span', { class: 'teaser-art' },
          svgBox(metaArt(t.icon || t.id, { silhouette: true }) || icon(t.icon || t.id), 'teaser-img'),
          svgBox(LOCK_SVG, 'teaser-lock')),
        h('b', null, t.name),
        h('small', null, t.note || 'Cần Quán cóc vỉa hè')))), { tip: 'Sắp có ở chặng sau', cls: 'is-teaser' }))
      }
      body.appendChild(stall(...tiers))
    }

    function recipeCard(r, state, MT) {
      const tastingThis = state.tasting && state.tasting.recipeId === r.id
      const mech = r.newMechanics.length
        ? r.newMechanics.map(t => h('span', { class: 'shop-mech-pill' }, svgBox(icon((MT[t] && MT[t].icon) || t), 'shop-mech-ico'), (MT[t] && MT[t].name) || t))
        : [h('span', { class: 'shop-mech-pill is-known' }, svgBox(metaArt('dau_tick'), 'shop-mech-ico'), 'Toàn thao tác đã quen')]
      const trialLabel = tastingThis ? 'Nấu thử tiếp' : r.tried ? S.tasted : S.tasteFree
      // đang nấu thử dở món khác: phải ra món đó trước (mỗi món chỉ được nấu thử miễn phí 1 lần)
      const otherName = r.tastingOther && !r.tried && app.data.RECIPES[state.tasting.recipeId] ? app.data.RECIPES[state.tasting.recipeId].name : ''
      const isNew = r.unlocked && !r.tried && !tastingThis
      const buy = h('button', {
        class: ['btn', 'btn-primary', 'shop-buy'], type: 'button', testid: 'shop-buy-' + r.id, disabled: !r.canBuy,
        dataset: { price: r.shopPrice },
        'aria-label': r.unlocked ? `Mua ${r.name}, ${formatVND(r.shopPrice)} Tiền quán` : `${r.name}: ${S.fromDay.replace('{n}', String(r.fromDay))}`,
        onclick: e => buyRecipe(r, e.currentTarget)
      }, r.unlocked
        ? [h('span', { class: 'shop-buy-lbl' }, 'Mua'), priceTag(r.shopPrice, 'money', !r.canAfford ? 'is-short' : '')]
        : [svgBox(LOCK_SVG, 'shop-lock-ico'), h('span', { class: 'shop-buy-lbl is-small' }, S.fromDay.replace('{n}', String(r.fromDay)))])
      return h('article', { class: ['shop-card', !r.unlocked ? 'is-locked' : '', isNew ? 'is-new' : ''], testid: 'shop-item-' + r.id },
        h('div', { class: 'shop-card-top' },
          dishPlate(r, { ribbon: isNew ? 'Mới' : null }),
          h('div', { class: 'shop-card-name' },
            h('h2', null, r.name),
            h('div', { class: 'shop-card-sub' }, knives(r.difficulty || 1),
              h('span', { class: 'shop-steps' }, svgBox(icon('thot'), 'shop-steps-ico'), S.stepsCount.replace('{n}', String(r.steps)))),
            r.desc ? h('p', { class: 'shop-desc', title: r.desc }, r.desc) : null)),
        h('dl', { class: 'shop-facts' },
          fact('Giá bán', formatVND(r.price), SCENE_ICONS.dong_xu || metaArt('xu')),
          fact('Giá vốn', formatVND(r.cost), icon('ro')),
          fact(S.profitPerPortion, '+' + formatVND(r.profit), metaArt('xu'), 'good'),
          fact('Hoàn vốn', r.paybackShifts ? [h('small', null, 'khoảng '), `${r.paybackShifts} ca`] : '—', metaArt('o_lich'))),
        h('div', { class: 'shop-mech' }, h('span', { class: 'shop-mech-lbl' }, 'Thao tác mới'), mech),
        h('div', { class: 'shop-actions' },
          h('button', {
            class: ['btn', 'btn-ghost', 'shop-trial', r.tried ? 'is-tried' : ''], type: 'button', testid: 'shop-trial-' + r.id,
            disabled: !(r.canTaste || tastingThis) || !!state.shift,
            onclick: () => { app.sound('click'); app.go('tasting', { recipeId: r.id }) }
          }, svgBox(r.tried && !tastingThis ? metaArt('dau_tick') : SCENE_ICONS.tab_bep || icon('chao_chong_dinh'), 'shop-trial-ico'), h('span', null, trialLabel)),
          buyWrap(buy, () => lockReason(r, state.wallet, r.shopPrice, 'money'))),
        otherName ? h('p', { class: 'shop-lack small', testid: 'shop-trial-note-' + r.id }, `Đang nấu thử dở ${otherName}. Ra món đó trước rồi mới nấu thử món này.`) : null,
        r.unlocked && !r.canAfford ? h('p', { class: 'shop-lack small' }, svgBox(metaArt('xu'), 'shop-lack-ico'), `Còn thiếu ${formatVND(r.shopPrice - state.wallet)} Tiền quán`) : null)
    }

    function ownedCard(r) {
      return h('article', { class: 'shop-card is-owned is-compact', testid: 'shop-item-' + r.id },
        dishPlate(r, { big: false, done: true }),
        h('div', { class: 'shop-card-name' },
          h('h2', null, r.name),
          h('span', { class: 'shop-badge is-owned' }, svgBox(metaArt('dau_tick'), 'shop-badge-ico'), 'Đã có trong thực đơn'),
          h('small', null, `Bán ${formatVND(r.price)} · lãi ${formatVND(r.profit)} mỗi phần`)))
    }

    // Thẻ công thức hiếm: món nền ★, 3 mảnh giấy (đã có / bóng mờ), nút Nấu thử khi đủ mảnh.
    function rareCard(info, state) {
      const R = app.data.RECIPES || {}
      const r = R[info.recipeId]
      const INGS = app.data.INGREDIENTS || {}
      const need = recipeRareNeed(r)
      const frags = []
      for (let i = 0; i < info.need; i++) {
        frags.push(svgBox(i < info.n ? metaArt('manh_cong_thuc') : metaArt('manh_cong_thuc', { silhouette: true }), ['shop-frag', i < info.n ? 'is-on' : 'is-off'].join(' ')))
      }
      const baseMissing = info.bases.filter(b => !(state.recipes && state.recipes[b])).map(b => (R[b] && R[b].name) || b)
      const busy = !!state.shift || !!(state.tasting && state.tasting.recipeId !== info.recipeId)
      const status = info.owned ? 'owned' : info.ready ? 'ready' : info.baseOwned ? 'collecting' : 'locked'
      const line = info.owned ? 'Khách gọi món này khi kho còn hàng hiếm'
        : info.ready ? 'Đủ mảnh! Nấu thử đạt hạng Được là mở món'
          : baseMissing.length ? `Cần có món ${baseMissing.join(', ')}` : `Mảnh ${info.n}/${info.need}`
      return h('article', { class: ['shop-rare', 'st-' + status], testid: 'shop-rare-' + info.recipeId, dataset: { n: String(info.n), status } },
        h('div', { class: 'shop-plate is-small is-rare' }, svgBox(icon(r.icon || r.id), 'shop-dish'), h('span', { class: 'shop-rare-star', 'aria-hidden': 'true' }, '★'),
          info.owned ? svgBox(metaArt('dau_tick'), 'shop-done-tick') : null),
        h('div', { class: 'shop-rare-text' },
          h('h3', null, r.name, ' ', h('span', { class: 'rare-star' }, '★')),
          info.owned
            ? h('span', { class: 'shop-badge is-owned' }, svgBox(metaArt('dau_tick'), 'shop-badge-ico'), 'Đã mở món')
            : h('div', { class: 'shop-frags', role: 'img', 'aria-label': `Mảnh công thức ${info.n}/${info.need}` }, frags,
              h('b', { class: 'shop-frag-n' }, `${info.n}/${info.need}`)),
          h('small', null, line),
          Object.keys(need).length ? h('small', { class: 'muted' }, 'Mỗi phần: ' + Object.entries(need).map(([id, n]) => `${n} ${(INGS[id] && INGS[id].name) || id}`).join(', ')) : null),
        info.ready ? h('button', {
          class: 'btn btn-primary btn-small shop-rare-taste', type: 'button', testid: 'shop-rare-taste-' + info.recipeId, disabled: busy,
          onclick: () => { app.sound('click'); app.go('tasting', { recipeId: info.recipeId, back: 'shop' }) }
        }, svgBox(SCENE_ICONS.tab_bep || icon('chao_chong_dinh'), 'shop-trial-ico'), 'Nấu thử') : null)
    }

    async function buyRecipe(r, btn) {
      if (!(await confirm(`Mua ${r.name}?`, `Trả ${formatVND(r.shopPrice)} Tiền quán. Món vào thực đơn ngay, không hoàn tiền.`))) return
      if (destroyed) return
      const card = btn && btn.closest ? btn.closest('.shop-card') : null
      const dish = card && card.querySelector('.shop-dish')
      const from = rectOf(dish)
      const html = icon(r.icon || r.id)
      const before = app.state.wallet
      const res = buyShopRecipe(app.state, r.id, app.ctx)
      if (!res.ok) { app.toast(reasonText(app, res.reason), { kind: 'bad' }); return }
      app.sound('coin')
      app.vibrate(20)
      app.toast(`Đã mua ${r.name}! Khách sẽ gọi nhiều gấp đôi trong 2 ca đầu.`, { kind: 'good', testid: 'shop-bought' })
      app.saveNow()
      render()
      const target = shown(`.shop-owned-item[data-own="${r.id}"]`, '.shop-cart-mini')
      celebrateBuy(from, html, target, { pay: res.price || r.shopPrice, before, kind: 'money' })
    }

    // ---------- Nâng cấp ----------
    function renderUpgrades(body, cat, state) {
      const MT = app.data.MINIGAME_TYPES || {}
      const own = cat.upgrades.filter(u => u.owned)
      const side = ownedStrip(own.map(u => ({ id: u.id, svg: icon(u.icon || u.id), name: u.name })), `${own.length}/${cat.upgrades.length}`,
        `Đồ nghề trên xe: ${own.length}/${cat.upgrades.length}` + (own.length ? ` (${own.map(u => u.name).join(', ')})` : ''))
      const list = h('div', { class: 'up-list' }, cat.upgrades.map(u => {
        const where = UP_WHERE[u.id]
        const whereArt = where ? (where.mt ? icon((MT[where.mt] && MT[where.mt].icon) || where.mt) : SCENE_ICONS[where.scene]) : ''
        const btn = h('button', {
          class: ['btn', u.owned ? 'btn-ghost' : 'btn-secondary', 'up-buy'], type: 'button', testid: 'upgrade-buy-' + u.id,
          disabled: !u.canBuy, onclick: e => buyUpgrade(u, e.currentTarget),
          'aria-label': u.owned ? `${u.name}: đã có` : !u.unlocked ? `${u.name}: ${S.fromDay.replace('{n}', String(u.fromDay))}` : `Mua ${u.name}, ${formatVND(u.price)} Tiền quán`
        }, u.owned ? [svgBox(metaArt('dau_tick'), 'shop-lock-ico'), h('span', { class: 'shop-buy-lbl' }, 'Đã có')]
          : !u.unlocked ? [svgBox(LOCK_SVG, 'shop-lock-ico'), h('span', { class: 'shop-buy-lbl is-small' }, S.fromDay.replace('{n}', String(u.fromDay)))]
            : [h('span', { class: 'shop-buy-lbl' }, 'Mua'), priceTag(u.price, 'money', !u.canAfford ? 'is-short' : '')])
        return h('article', { class: ['up-card', u.owned ? 'is-owned' : '', !u.unlocked ? 'is-locked' : ''], testid: 'upgrade-' + u.id },
          h('span', { class: 'up-art' }, svgBox(icon(u.icon || u.id), 'up-icon'),
            !u.unlocked ? svgBox(LOCK_SVG, 'up-lock') : u.owned ? svgBox(metaArt('dau_tick'), 'up-lock') : null),
          h('div', { class: 'up-info' }, h('h3', null, u.name), h('p', null, u.desc)),
          h('div', { class: 'up-foot' },
            where ? h('span', { class: 'up-where' }, svgBox(whereArt, 'up-where-ico'), where.text) : null,
            !u.owned && u.unlocked && !u.canAfford ? h('p', { class: 'shop-lack small' }, svgBox(metaArt('xu'), 'shop-lack-ico'), `Còn thiếu ${formatVND(u.price - state.wallet)}`) : null,
            buyWrap(btn, () => lockReason(u, state.wallet, u.price, 'money'))))
      }))
      body.appendChild(stall(tier('Đồ nghề', list, { side, tip: 'Dụng cụ dùng mãi mãi trên xe' })))
    }

    async function buyUpgrade(u, btn) {
      if (!(await confirm(`Mua ${u.name}?`, `Trả ${formatVND(u.price)} Tiền quán. ${u.desc}`))) return
      if (destroyed) return
      const card = btn && btn.closest ? btn.closest('.up-card') : null
      const from = rectOf(card && card.querySelector('.up-icon'))
      const before = app.state.wallet
      const r = buyShopUpgrade(app.state, u.id, app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason === 'khong_du_tien' ? 'thieu_tien' : r.reason), { kind: 'bad' }); return }
      app.sound('coin')
      app.toast('Đã mua ' + u.name, { kind: 'good' })
      app.saveNow()
      render()
      const target = shown(`.shop-owned-item[data-own="${u.id}"]`, '.shop-cart-mini')
      celebrateBuy(from, icon(u.icon || u.id), target, { pay: u.price, before, kind: 'money' })
    }

    // ---------- Góc Muỗng Vàng ----------
    function renderSpoons(body, cat, state) {
      const C = app.data.COSMETICS || {}
      const eq = (state.cosmetics && state.cosmetics.equipped) || {}
      const cart = cartView(state, app.data, 'cart-view shop-cart', preview !== null ? { du: preview || null } : {})
      // đang xem thử một màu dù (chạm ô màu): nhắc rõ để không nhầm là đã đổi
      const previewName = preview === null ? '' : preview ? ((C[preview] && C[preview].name) || '') : 'Dù cũ của Dì Sáu'
      const previewing = preview !== null && (preview || null) !== (eq.du || null)
      // xe trưng bày bên trái; bên phải: số Muỗng Vàng + lời nhắc (đang xem thử thì nhãn xem thử thay lời nhắc)
      body.appendChild(h('section', { class: ['spoon-top', previewing ? 'is-preview' : ''] },
        h('div', { class: 'spoon-show' }, cart),
        h('div', { class: 'spoon-balance' }, spoonPill(state.goldSpoons || 0, 'spoon-balance'),
          previewing ? h('span', { class: 'spoon-preview', testid: 'parasol-previewing' }, 'Đang xem thử: ' + previewName)
            : h('p', { class: 'spoon-hint' }, 'Chạm ô dù để xem thử. Màu dù chỉ để đẹp xe, không đổi cách chơi.'))))

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

      // đồ trang trí khác đã có (viền biển xe, bảng đèn, chậu hoa): hình xe đang mang món đồ đó
      const others = ((state.cosmetics && state.cosmetics.owned) || []).filter(id => C[id] && C[id].slot !== 'du')
      if (others.length) {
        body.appendChild(h('h2', { class: 'meta-section' }, 'Đồ trang trí đã có'))
        body.appendChild(h('div', { class: 'deco-list' }, others.map(id => {
          const c = C[id]
          const on = eq[c.slot] === id
          return h('div', { class: ['deco-item', on ? 'is-on' : ''], testid: 'deco-' + id },
            svgBox(cartArt(cartOptions(state, app.data, { [c.slot]: id })), 'deco-art'),
            h('div', { class: 'deco-text' }, h('b', null, c.name), h('small', null, SLOT_LABELS[c.slot] || '')),
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
      // M4: nguyên liệu hiếm trong kho (lấy từ kho khi nấu món hiếm, không bán lại)
      const INGS = app.data.INGREDIENTS || {}
      const rares = Object.entries((state.rare && state.rare.stock) || {}).filter(([id, n]) => INGS[id] && INGS[id].rare && n > 0)
      // M4: tỉ lệ Giỏ chợ ghi công khai (không bán lượt bốc; lượt có từ chuỗi Quầy chuẩn và ngày Chợ phiên)
      const RC = rareConfig(app.ctx)
      const basketOn = rareActive(app.ctx) && (state.day >= RC.fromDay || rares.length > 0)
      const bagArt = (svg, qty = '', cls = '') => h('span', { class: ['bag-art', cls] }, svgBox(svg, 'bag-icon'), qty ? h('b', { class: 'bag-qty' }, qty) : null)
      const basketLine = basketOn ? h('li', { testid: 'bag-basket', class: 'is-basket' }, bagArt(metaArt('luot_gio_cho') || icon('ro')),
        h('div', null, h('b', null, 'Giỏ chợ (tỉ lệ công khai)'),
          h('small', null, `Mỗi lượt: ${pct(RC.basket.ingredient)} ra 1 phần nguyên liệu hiếm, ${pct(1 - RC.basket.ingredient)} ra 1 mảnh công thức. ` +
            `Bảo hiểm: ${RC.basket.pityAfter} lượt liền không ra nguyên liệu thì lượt sau chắc chắn có; ${RC.fragmentPityAfter} lần liền không ra mảnh thì lần sau chắc chắn có. ` +
            'Có lượt khi giữ chuỗi Quầy chuẩn 5 khách hoặc ngày Chợ phiên, không mua bằng tiền.'))) : null
      if (items.length || titles.length || rares.length || basketLine) {
        body.appendChild(h('h2', { class: 'meta-section' }, 'Túi đồ'))
        body.appendChild(h('ul', { class: 'bag-list', testid: 'bag' },
          items.map(([id, n]) => h('li', null, bagArt(artOf(I[id].icon || id), I[id].consumable ? '×' + n : ''),
            h('div', null, h('b', null, I[id].name + (I[id].consumable ? ` ×${n}` : '')), h('small', null, I[id].desc)))),
          rares.map(([id, n]) => h('li', { testid: 'bag-rare-' + id }, bagArt(icon(INGS[id].icon || id), '×' + n, 'is-rare'),
            h('div', null, h('b', null, `${INGS[id].name} ×${n}`),
              h('small', null, `Hàng hiếm ${'★'.repeat(INGS[id].star || 1)} · quê ${INGS[id].origin || ''} · dùng cho món hiếm, xem kho ở màn Chuẩn bị`)))),
          titles.map(t => h('li', null, bagArt(metaArt('danh_hieu') || icon('danh_hieu')), h('div', null, h('b', null, 'Danh hiệu: ' + t.name)))),
          basketLine))
      }
    }

    function parasolCard(u, state) {
      const isDefault = u.id === 'mac_dinh'
      let label, kind, action
      if (u.equipped) { label = S.equipped; kind = 'btn-ghost'; action = null }
      else if (u.owned) { label = S.equip; kind = 'btn-secondary'; action = () => equip(u) }
      else { label = 'Mua'; kind = 'btn-primary'; action = btn => buyParasol(u, btn) }
      const previewing = preview !== null && (preview || 'mac_dinh') === u.id
      const btn = h('button', {
        class: ['btn', 'btn-small', kind, 'parasol-btn'], type: 'button', testid: 'parasol-' + u.id,
        disabled: !action || (!u.owned && !u.canAfford), dataset: { owned: u.owned ? 'true' : 'false', equipped: u.equipped ? 'true' : 'false' },
        'aria-label': u.owned ? `${label} ${u.name}` : `Mua ${u.name}, ${u.price} Muỗng Vàng`,
        onclick: e => action && action(e.currentTarget)
      }, u.owned ? (u.equipped ? [svgBox(metaArt('dau_tick'), 'shop-lock-ico'), h('span', null, label)] : label)
        : [h('span', { class: 'shop-buy-lbl' }, label), priceTag(u.price, 'spoon', !u.canAfford ? 'is-short' : '')])
      return h('div', { class: ['parasol', u.equipped ? 'is-on' : '', previewing ? 'is-preview' : ''], testid: 'parasol-card-' + u.id },
        h('button', {
          class: 'parasol-swatch', type: 'button', 'aria-label': 'Xem thử ' + u.name, testid: 'parasol-preview-' + u.id,
          style: { '--sw': u.color || '#ccc' }, dataset: { pattern: u.pattern || '' },
          onclick: () => { preview = isDefault ? '' : u.id; app.sound('click'); render(); showCart() }
        }, h('span', { class: 'parasol-dome', 'aria-hidden': 'true' }), h('span', { class: 'parasol-pole', 'aria-hidden': 'true' })),
        h('div', { class: 'parasol-name' }, h('b', null, u.name),
          h('small', null, u.equipped ? 'Đang căng trên xe' : u.owned ? (isDefault ? 'Có sẵn' : 'Đã có') : u.pattern === 'soc' ? 'Sọc ba màu · chưa có' : 'Chưa có')),
        u.owned ? btn : buyWrap(btn, () => lockReason(u, state.goldSpoons || 0, u.price, 'spoon')))
    }

    // Xem thử màu dù khi xe đang khuất dưới đầu màn (đã cuộn xuống danh sách): cuộn lên cho thấy xe (không hoạt ảnh).
    function showCart() {
      const cart = q('[data-testid="cart-view"]')
      const head = q('.meta-head')
      const scr = el.closest('#screen') || el.parentElement
      if (!cart || !head || !scr) return
      const top = head.getBoundingClientRect().bottom
      const r = cart.getBoundingClientRect()
      if (r.top < top) scr.scrollTop = Math.max(0, scr.scrollTop - (top - r.top) - 8)
    }

    function equip(u) {
      const r = u.id === 'mac_dinh' ? equipCosmetic(app.state, null, app.ctx, 'du') : equipCosmetic(app.state, u.id, app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
      preview = null
      app.sound('click')
      app.saveNow()
      render()
      const f = fx()
      const cart = q('[data-testid="cart-view"]')
      if (f && cart) { try { f.glow(cart) } catch { /* bỏ qua */ } }
    }

    async function buyParasol(u) {
      preview = u.id
      render()
      if (!(await confirm(`Mua ${u.name}?`, `Trả ${u.price} Muỗng Vàng. Dù được căng lên xe ngay.`))) { if (!destroyed) { preview = null; render() } return }
      if (destroyed) return
      const sw = q(`[data-testid="parasol-preview-${u.id}"]`)
      const from = rectOf(sw)
      const html = sw ? sw.outerHTML : ''
      const before = app.state.goldSpoons || 0
      const r = buyUmbrella(app.state, u.id, app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); preview = null; render(); return }
      preview = null
      app.sound('coin')
      app.toast(`Xe đã căng ${u.name.toLocaleLowerCase('vi-VN')}!`, { kind: 'good' })
      app.saveNow()
      render()
      const cart = q('[data-testid="cart-view"]')
      // ô dù bay lên xe; số Muỗng Vàng (đầu màn) đếm xuống
      celebrateBuy(from, swatchSvg(u.color, u.pattern) || html, cart, { pay: r.price || u.price, before, kind: 'spoon' })
    }

    // Hình ô dù nhỏ (bay lên xe khi mua): nửa vòm 8 múi xen trắng, viền mực.
    function swatchSvg(color, pattern) {
      const c0 = /^#[0-9a-f]{6}$/i.test(String(color)) ? color : DEFAULT_UMBRELLA.color
      const cyc = pattern === 'soc' ? [c0, '#ffffff', '#e0584a', '#ffffff'] : [c0, '#ffffff']
      let wedges = ''
      for (let k = 0; k < 8; k++) {
        const a0 = Math.PI + (Math.PI * k) / 8, a1 = Math.PI + (Math.PI * (k + 1)) / 8
        const p = a => `${(32 + Math.cos(a) * 28).toFixed(1)} ${(40 + Math.sin(a) * 28).toFixed(1)}`
        wedges += `<path d="M32 40L${p(a0)}A28 28 0 0 1 ${p(a1)}Z" fill="${cyc[k % cyc.length]}"/>`
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#3a2618" stroke-width="2" stroke-linejoin="round">${wedges}` +
        '<path d="M4 40A28 28 0 0 1 60 40Z" fill="none" stroke-width="3"/><path d="M32 40V60" stroke-width="3"/><circle cx="32" cy="11" r="3" fill="#a5672b"/></g></svg>'
    }

    render()
    return { unmount() { destroyed = true } }
  }
}
