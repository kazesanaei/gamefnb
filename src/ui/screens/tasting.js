// Màn NẤU THỬ (Chợ Công Thức): dùng lại Thớt sơ chế và 6 mini-game của bếp trên một "hộp cát"
// (state.tasting.shift, tách biệt ca thật): không đếm giờ, không tốn tiền, không tính thạo món, không đếm nhiệm vụ.
// Ra món xong → ghi "đã nấu thử" (finishTasting), hiện kết quả, quay về Chợ Công Thức.
// M4: công thức hiếm đủ mảnh: đạt hạng Được là mở món (grantReward), chưa đạt thì thử lại; không trừ kho hàng hiếm.
import { h, svgBox } from '../dom.js'
import { icon, DI_SAU } from '../art.js'
import { createBus } from '../../core/bus.js'
import { startTasting, tastingSandbox, finishTasting, buyShopRecipe } from '../../core/shop.js'
import { startCook } from '../../core/kitchen.js'
import { mountKitchen, moodForGrade, dishComment } from './kitchen.js'
import { formatVND } from '../format.js'
import { reasonText } from '../components/meta-ui.js'

export default {
  mount(root, app, params = {}) {
    const state = app.state
    const recipeId = params.recipeId || (state.tasting && state.tasting.recipeId)
    const recipe = recipeId && app.data.RECIPES[recipeId]
    // M4: công thức hiếm (đủ mảnh): nấu thử đạt hạng Được là mở món; thử lại không giới hạn; về màn đã mở (Chuẩn bị / Sổ
    // công thức)
    const rare = !!(recipe && recipe.source === 'hiem')
    const back = () => app.go(params.back || (rare ? 'prep' : 'shop'), { tab: 'recipes' })
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
      sound: n => app.sound(n), vibrate: ms => app.vibrate(ms), settings: () => app.settings()
    }
    const sh = sb.state.shift
    // chưa bắt đầu (hoặc tải lại trước khi chọn nguyên liệu): mở phiếu nấu thử; đang dở thì làm tiếp
    if (!sh.cook) startCook(sb.state, 'thu1', 0, sb.ctx)

    const exitBtn = h('button', { class: 'btn btn-ghost meta-back', type: 'button', testid: 'tasting-exit', onclick: () => onExit() }, rare ? '‹ Quay lại' : '‹ Về Chợ')
    const head = h('header', { class: 'tasting-head' },
      exitBtn,
      h('div', { class: 'tasting-title' },
        h('span', { class: 'tasting-badge', testid: 'tasting-label' }, 'Nấu thử'),
        h('b', null, recipe.name, rare ? h('span', { class: 'rare-star' }, ' ★') : null)))
    const note = h('p', { class: 'tasting-note' }, rare
      ? 'Không tính giờ · Có gợi ý · Không tốn hàng hiếm · Đạt hạng Được là mở món'
      : 'Không tính giờ · Có gợi ý · Miễn phí · Không tính thạo món')
    const panel = h('section', { class: 'panel panel-kitchen', testid: 'panel-kitchen' })
    const el = h('section', { class: 'tasting-screen', testid: 'screen-tasting' }, head, note, h('div', { class: 'panels' }, panel))
    root.appendChild(el)

    let kitchen = null
    let destroyed = false

    function showResult(dish) {
      if (destroyed) return
      const res = finishTasting(app.state, app.ctx)
      app.saveNow()
      if (kitchen) { try { kitchen.unmount() } catch (err) { console.error(err) } kitchen = null }
      const d = dish || (res && res.result) || null
      const S = app.data.STRINGS
      const grade = d ? (S.grades[d.grade] || d.grade) : 'Chưa ra món'
      const owned = !!app.state.recipes[recipeId]
      const canBuy = recipe.source === 'shop' && !owned && app.state.day >= (recipe.shopFromDay || 1)
      panel.textContent = ''
      panel.appendChild(h('div', { class: 'tasting-result', testid: 'tasting-result', dataset: { grade: d ? d.grade : '' } },
        svgBox(icon(recipe.icon || recipe.id), 'tasting-result-dish'),
        h('div', { class: 'tasting-grade grade-' + (d ? d.grade : '') }, grade + (d ? ` · ${d.q}%` : '')),
        d && d.flawless ? h('div', { class: 'k-flawless' }, S.flawless) : null,
        h('div', { class: 'npc-talk' }, svgBox(DI_SAU[d ? moodForGrade(d.grade) : 'vui'] || DI_SAU.vui, 'npc-face small'),
          h('div', { class: 'bubble npc-bubble' }, h('b', null, 'Dì Sáu'),
            h('p', null, d ? dishComment(d, recipe, app.data) : 'Lần sau nấu thử tiếp nha con.'))),
        rare ? (res && res.unlocked
          ? h('p', { class: 'tasting-unlock center', testid: 'tasting-unlocked' },
            `Mở công thức ${recipe.name}! Khách sẽ gọi món này khi kho còn nguyên liệu hiếm.`)
          : h('p', { class: 'small center', testid: 'tasting-not-yet' }, 'Chưa đạt hạng Được. Mảnh công thức vẫn giữ, nấu thử lại nha.'))
          : h('p', { class: 'muted small center' }, 'Lượt nấu thử miễn phí của món này đã dùng. Kết quả không tính vào thạo món.'),
        h('div', { class: 'tasting-actions' },
          rare && !(res && res.unlocked) ? h('button', { class: 'btn btn-primary btn-big', type: 'button', testid: 'tasting-retry',
            onclick: () => app.go('tasting', { recipeId, back: params.back }) }, 'Nấu thử lại') : null,
          canBuy ? h('button', {
            class: 'btn btn-primary btn-big', type: 'button', testid: 'tasting-buy', disabled: app.state.wallet < recipe.shopPrice,
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
          }, `Mua món · ${formatVND(recipe.shopPrice)}`) : null,
          h('button', { class: ['btn', canBuy || (rare && !(res && res.unlocked)) ? 'btn-ghost' : 'btn-primary', 'btn-big'], type: 'button', testid: 'tasting-back', onclick: back },
            rare ? (params.back === 'recipe-book' ? 'Về Sổ công thức' : 'Về màn Chuẩn bị') : 'Về Chợ Công Thức'))))
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
      kitchen = mountKitchen(panel, sandboxApp, { tasting: { onDone: dish => showResult(dish) } })
    }
    app.saveNow()

    return {
      // nút Back của điện thoại: hỏi như nút "‹ Về Chợ" (phiên nấu thử được giữ)
      onBack() { if (kitchen) onExit(); else back() },
      update(dt) { if (kitchen && kitchen.update) kitchen.update(dt) },
      unmount() {
        destroyed = true
        if (kitchen) { try { kitchen.unmount() } catch (err) { console.error(err) } }
      }
    }
  }
}
