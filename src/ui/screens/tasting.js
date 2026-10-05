// Màn NẤU THỬ (Chợ Công Thức): dùng lại Thớt sơ chế và các mini-game của bếp trên một "hộp cát"
// (state.tasting.shift, tách biệt ca thật): không đếm giờ, không tốn tiền, không tính thạo món, không đếm nhiệm vụ.
// Ra món xong → ghi "đã nấu thử" (finishTasting), hiện kết quả, quay về Chợ Công Thức.
// M4: công thức hiếm đủ mảnh: đạt hạng Được là mở món (grantReward), chưa đạt thì thử lại; không trừ kho hàng hiếm.
// M5 Đợt 3 (gói M-B, bản 0.5.2): đầu màn như bếp thật trong ca — thanh gỗ (nút thoát tròn, viên giấy tên món), mái bạt sọc
// có ruy băng "Nấu thử — không tính tiền", dải luật nấu thử có hình; kết quả dùng lại bảng ra món (dish-reveal.js, tĩnh) kèm
// lời Dì Sáu, nút Mua món có viên giá hình xu / Nấu thử lại / Về. Không đổi luật nấu thử.
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import { metaArt } from '../art/meta.js'
import { SCENE_ICONS } from '../art/scene.js'
import { createBus } from '../../core/bus.js'
import { startTasting, tastingSandbox, finishTasting, buyShopRecipe } from '../../core/shop.js'
import { startCook } from '../../core/kitchen.js'
import { mountKitchen, moodForGrade, dishComment } from './kitchen.js'
import { createDishReveal } from '../components/dish-reveal.js'
import { formatVND } from '../format.js'
import { reasonText } from '../components/meta-ui.js'
import { isReduced } from '../motion.js'

// Mũi tên quay lại (nét mực trên nền giấy).
const BACK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.5 4.5L8 12l7.5 7.5" fill="none" stroke="#fff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M15.5 4.5L8 12l7.5 7.5" fill="none" stroke="#3a2618" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
// Đồng hồ gạch chéo ("không tính giờ") và bóng đèn ("có gợi ý"): hình nhỏ cho dải luật nấu thử.
const NO_CLOCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><g stroke="#3a2618" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="12" cy="13" r="8.5" fill="#fffaf0"/><path d="M12 8.5V13l3 2" fill="none"/><path d="M4 4l16 17" stroke="#d8392b" stroke-width="2.6"/></g></svg>'
const HINT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><g stroke="#3a2618" stroke-width="2" stroke-linejoin="round">' +
  '<path d="M12 2.8a6.6 6.6 0 0 0-4 11.9c.8.6 1.2 1.4 1.2 2.3h5.6c0-.9.4-1.7 1.2-2.3A6.6 6.6 0 0 0 12 2.8Z" fill="#ffe27a"/>' +
  '<path d="M9.4 19.4h5.2M10.2 21.8h3.6" fill="none" stroke-linecap="round"/><path d="M9.6 7.4a3 3 0 0 1 2-1.6" fill="none" stroke="#fff" stroke-linecap="round"/></g></svg>'

export default {
  mount(root, app, params = {}) {
    const state = app.state
    const recipeId = params.recipeId || (state.tasting && state.tasting.recipeId)
    const recipe = recipeId && app.data.RECIPES[recipeId]
    // M4: công thức hiếm (đủ mảnh): nấu thử đạt hạng Được là mở món; thử lại không giới hạn; về màn đã mở (Chuẩn bị / Sổ
    // công thức / Chợ Công Thức)
    const rare = !!(recipe && recipe.source === 'hiem')
    const backTo = params.back || (rare ? 'prep' : 'shop')
    const back = () => app.go(backTo, { tab: 'recipes' })
    const backName = { shop: 'Chợ Công Thức', prep: 'màn Chuẩn bị', 'recipe-book': 'Sổ công thức' }[backTo] || 'màn trước'
    if (!recipe) { setTimeout(back, 0); return { unmount() {} } }
    if (!state.tasting || state.tasting.recipeId !== recipeId) {
      const r = startTasting(state, recipeId, app.ctx)
      if (!r.ok) {
        app.toast(reasonText(app, r.reason), { kind: 'bad' })
        setTimeout(back, 0)
        return { unmount() {} }
      }
      app.saveNow()
    }

    const sb = tastingSandbox(state, app.ctx)
    // app "hộp cát": bếp đọc state/ctx của phiên nấu thử; bus riêng nên không sự kiện nào tới nhiệm vụ, chuỗi, Tem.
    // overlay: bảng chọn, hộp hỏi lại, bảng công bố món của bếp nằm ở lớp nổi gốc của app (như trong ca bán)
    const sandboxApp = {
      state: sb.state, ctx: sb.ctx, data: app.data, bus: createBus(), overlay: app.overlay,
      save: () => app.save(), saveNow: o => app.saveNow(o),
      toast: (t, o) => app.toast(t, o), modal: o => app.modal(o), modalOpen: () => app.modalOpen(),
      sound: n => app.sound(n), vibrate: ms => app.vibrate(ms), settings: () => app.settings(),
      // M5: hiệu ứng dùng chung của app (con dấu, hạt, ra món) — bếp và mini-game không tự tạo hệ hiệu ứng riêng
      vfx: app.vfx || null
    }
    const sh = sb.state.shift
    // chưa bắt đầu (hoặc tải lại trước khi chọn nguyên liệu): mở phiếu nấu thử; đang dở thì làm tiếp
    if (!sh.cook) startCook(sb.state, 'thu1', 0, sb.ctx)

    // ----- Đầu màn: thanh gỗ như HUD trong ca + mái bạt có ruy băng "Nấu thử" + dải luật -----
    const exitBtn = h('button', {
      class: 'tasting-exit', type: 'button', testid: 'tasting-exit', 'aria-label': 'Về ' + backName, title: 'Về ' + backName,
      onclick: () => onExit()
    }, svgBox(BACK_SVG, 'tasting-exit-ico'))
    const head = h('header', { class: 'tasting-head' },
      exitBtn,
      h('div', { class: 'tasting-title' },
        svgBox(icon(recipe.icon || recipe.id), 'tasting-title-dish'),
        h('b', null, recipe.name, rare ? h('span', { class: 'rare-star' }, ' ★') : null)),
      svgBox(SCENE_ICONS.tab_bep || icon('chao_chong_dinh'), 'tasting-head-ico'))
    const awning = h('div', { class: 'tasting-awning' },
      h('span', { class: 'tasting-badge', testid: 'tasting-label' }, 'Nấu thử — không tính tiền'))
    const rule = (svg, text) => h('span', { class: 'tasting-rule' }, svgBox(svg, 'tasting-rule-ico'), text)
    const note = h('p', { class: 'tasting-note' }, rare
      ? [rule(NO_CLOCK_SVG, 'Không tính giờ'), rule(HINT_SVG, 'Có gợi ý'), rule(metaArt('kho_hiem'), 'Không tốn hàng hiếm'), rule(metaArt('dau_tick'), 'Đạt hạng Được là mở món')]
      : [rule(NO_CLOCK_SVG, 'Không tính giờ'), rule(HINT_SVG, 'Có gợi ý'), rule(metaArt('so_tay_nghe'), 'Không tính thạo món')])
    const panel = h('section', { class: 'panel panel-kitchen', testid: 'panel-kitchen' })
    const el = h('section', { class: ['tasting-screen', rare ? 'is-rare' : ''], testid: 'screen-tasting' }, head, awning, note, h('div', { class: 'panels' }, panel))
    root.appendChild(el)

    let kitchen = null
    let destroyed = false
    let reveal = null

    // live: kết quả vừa ra (sự kiện ra món) → được phát hiệu ứng mừng; mở lại màn đã có kết quả thì không phát lại.
    function showResult(dish, live = false) {
      if (destroyed) return
      const res = finishTasting(app.state, app.ctx)
      app.saveNow()
      if (kitchen) { try { kitchen.unmount() } catch (err) { console.error(err) } kitchen = null }
      const d = dish || (res && res.result) || null
      const owned = !!app.state.recipes[recipeId]
      const canBuy = recipe.source === 'shop' && !owned && app.state.day >= (recipe.shopFromDay || 1)
      const unlocked = rare && !!(res && res.unlocked)
      panel.textContent = ''
      // bảng ra món có sẵn (tĩnh: không lặp, không tự đóng; chạm không bỏ qua gì) — cùng hình, hạng, sao, lời Dì Sáu như
      // lúc vừa ra món
      const box = h('div', { class: 'tasting-reveal' })
      if (d) {
        try {
          reveal = createDishReveal({
            dish: d, recipe, name: recipe.name, mood: moodForGrade(d.grade), comment: dishComment(d, recipe, app.data),
            data: app.data, reduced: true
          })
          reveal.el.setAttribute('data-testid', 'tasting-reveal')
          // chặn chạm của bảng ra món (chạm = đóng ở màn bếp; ở đây bảng đứng yên, không nuốt cú bấm kế)
          box.addEventListener('pointerdown', e => e.stopPropagation(), true)
          box.appendChild(reveal.el)
        } catch (err) { console.error(err); reveal = null }
      }
      if (!reveal) {
        box.classList.add('is-empty')
        box.appendChild(h('div', { class: 'tasting-empty' }, svgBox(icon(recipe.icon || recipe.id), 'tasting-result-dish'),
          h('p', null, d ? (app.data.STRINGS.grades[d.grade] || d.grade) : 'Chưa ra món. Lần sau nấu thử tiếp nha con.')))
      }
      let outcome
      if (rare) {
        outcome = unlocked
          ? h('p', { class: 'tasting-outcome is-good', testid: 'tasting-unlocked' }, svgBox(metaArt('so_cong_thuc'), 'tasting-outcome-ico'),
            h('span', null, `Mở công thức ${recipe.name}! Khách sẽ gọi món này khi kho còn nguyên liệu hiếm.`))
          : h('p', { class: 'tasting-outcome', testid: 'tasting-not-yet' }, svgBox(metaArt('manh_cong_thuc'), 'tasting-outcome-ico'),
            h('span', null, 'Chưa đạt hạng Được. Mảnh công thức vẫn giữ, nấu thử lại nha.'))
      } else {
        outcome = h('p', { class: 'tasting-outcome is-muted' }, svgBox(metaArt('dau_tick'), 'tasting-outcome-ico'),
          h('span', null, 'Đã dùng lượt nấu thử miễn phí. Không tính vào thạo món.'))
      }
      const short = canBuy && app.state.wallet < recipe.shopPrice
      const buyBtn = canBuy ? h('button', {
        class: 'btn btn-primary btn-big tasting-buy', type: 'button', testid: 'tasting-buy', disabled: short,
        'aria-label': `Mua món ${recipe.name}, ${formatVND(recipe.shopPrice)} Tiền quán`,
        onclick: async () => {
          const ok = await app.modal({
            title: `Mua ${recipe.name}?`, text: `Trả ${formatVND(recipe.shopPrice)} Tiền quán. Món vào thực đơn ngay, không hoàn tiền.`,
            actions: [{ label: 'Để sau', value: false, kind: 'ghost', testid: 'confirm-cancel' }, { label: 'Mua', value: true, testid: 'confirm-ok' }]
          })
          if (!ok || destroyed) return
          const r = buyShopRecipe(app.state, recipeId, app.ctx)
          if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
          app.sound('coin')
          app.toast(`Đã mua ${recipe.name}! Khách sẽ gọi nhiều gấp đôi trong 2 ca đầu.`, { kind: 'good' })
          app.saveNow()
          back()
        }
      }, h('span', null, 'Mua món'), h('span', { class: ['tasting-price', short ? 'is-short' : ''] }, svgBox(metaArt('xu'), 'tasting-price-ico'), h('b', null, formatVND(recipe.shopPrice)))) : null
      // nút Mua bị khóa vì thiếu tiền: chạm (rơi xuống khung bọc) → viên giá rung + lý do
      const buyWrap = buyBtn ? h('span', {
        class: ['tasting-buy-wrap', short ? 'is-off' : ''],
        onclick: e => {
          if (!buyBtn.disabled || e.target !== e.currentTarget) return
          const fx = app.vfx
          const pill = buyBtn.querySelector('.tasting-price')
          if (fx && pill) { try { fx.shake(pill, 2) } catch { /* bỏ qua */ } }
          app.sound('error')
          app.toast(reasonText(app, 'thieu_tien') + ` · còn thiếu ${formatVND(recipe.shopPrice - app.state.wallet)}`, { kind: 'bad' })
        }
      }, buyBtn) : null
      panel.appendChild(h('div', { class: 'tasting-result', testid: 'tasting-result', dataset: { grade: d ? d.grade : '' } },
        box,
        outcome,
        short ? h('p', { class: 'tasting-lack' }, svgBox(metaArt('xu'), 'tasting-outcome-ico'), `Còn thiếu ${formatVND(recipe.shopPrice - app.state.wallet)} Tiền quán để mua món`) : null,
        h('div', { class: 'tasting-actions' },
          rare && !unlocked ? h('button', { class: 'btn btn-primary btn-big', type: 'button', testid: 'tasting-retry',
            onclick: () => app.go('tasting', { recipeId, back: params.back }) }, 'Nấu thử lại') : null,
          buyWrap,
          h('button', { class: ['btn', canBuy || (rare && !unlocked) ? 'btn-ghost' : 'btn-primary', 'btn-big'], type: 'button', testid: 'tasting-back', onclick: back },
            'Về ' + backName))))
      // mở món hiếm: mừng một lần đúng lúc vừa ra món (sự kiện), không phát lại khi mở lại màn
      if (live && unlocked) {
        const fx = app.vfx
        if (fx && !isReduced(app)) { try { fx.burst(outcome, 'star', { n: 12 }) } catch { /* bỏ qua */ } }
        app.sound('fanfare')
      }
    }

    async function onExit() {
      const ok = await app.modal({
        title: 'Thoát nấu thử?', text: 'Món đang nấu dở được giữ lại, lần sau vào nấu thử tiếp.',
        actions: [{ label: 'Nấu tiếp', value: false, kind: 'ghost', testid: 'confirm-cancel' }, { label: 'Thoát', value: true, testid: 'confirm-ok' }]
      })
      if (ok && !destroyed) { app.saveNow(); back() }
    }

    const cook = sh.cook
    if (cook && cook.phase === 'xong') {
      showResult(cook.result)
    } else {
      kitchen = mountKitchen(panel, sandboxApp, { tasting: { onDone: dish => showResult(dish, true) } })
    }
    app.saveNow()

    return {
      // nút Back của điện thoại: hỏi như nút thoát (phiên nấu thử được giữ)
      onBack() { if (kitchen) onExit(); else back() },
      update(dt) { if (kitchen && kitchen.update) kitchen.update(dt) },
      unmount() {
        destroyed = true
        if (kitchen) { try { kitchen.unmount() } catch (err) { console.error(err) } }
        if (reveal) { try { reveal.destroy() } catch { /* bỏ qua */ } reveal = null }
      }
    }
  }
}
