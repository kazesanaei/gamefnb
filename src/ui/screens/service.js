// Màn Ca bán: HUD, hàng khách, tiến trình 4 khâu, dây phiếu, 2 panel Quầy/Bếp, phiếu chấm, xử lý phàn nàn.
// M3: tình huống trong ca (hộp thoại chặn thời gian ca — kiên nhẫn khách tạm dừng) chỉ bật ở tab Quầy, giữa hai khách
// (ngay sau khi kẹp phiếu, hoặc lúc quầy trống), không chen vào mini-game; khách quen trả nợ báo đầu ca.
// 0.4.1: hướng dẫn lần đầu theo khâu đang làm (tour Quầy: Order, bảng chọn món, Thanh toán, Tính tiền, chuyển khoản, phiếu
// thu; Bếp: dây phiếu, dòng món, chọn nguyên liệu, Thớt, giao món; phiếu chấm) — tự hiện lần đầu, không chen vào mini-game;
// khi tour hoặc bảng Hướng dẫn (nút "?" trên HUD) đang mở thì ca TẠM DỪNG (setPaused: kiên nhẫn khách, giờ ca đứng yên),
// đồng hồ bước Chọn đứng yên, phiếu chấm chưa tắt.
// M5 Đợt 2 (bước 0): phần dựng phiếu chấm chuyển sang components/score-sheet.js, phần dựng hộp tình huống và hộp phàn nàn
// sang components/incident-view.js (tệp này giữ luồng: hàng đợi phiếu, sheetSettled, khi nào mở hộp, gọi lõi, âm, lưu).
import { h, svgBox } from '../dom.js'
import { face, DI_SAU } from '../art.js'
import { incidentDue, openIncident, resolveIncident } from '../../core/incidents.js'
import { isShiftOver, endShift, setPaused } from '../../core/shift.js'
import { beginCounter } from '../../core/order.js'
import { stageOf, personaObj } from '../../core/customer.js'
import { resolveComplaint, complaintRemakeOk } from '../../core/kitchen.js'
import { createHud } from '../components/hud.js'
import { createProgress4 } from '../components/progress4.js'
import { createTicketRail } from '../components/ticket-rail.js'
import { createRing, moodFor } from '../components/patience.js'
import { mountCounter } from './counter.js'
import { renderScoreSheet } from '../components/score-sheet.js'
import { createIncidentBox, renderComplaint } from '../components/incident-view.js'
import { formatVND } from '../format.js'
import { questDef, questText } from '../../core/quests.js'
import { chainDefs } from '../../core/chains.js'
import { icon } from '../art.js'
import { npcFace } from '../components/meta-ui.js'

// Mã lỗi theo hàng của phiếu chấm và hàm dựng phiếu: components/score-sheet.js (xuất lại ở đây, giữ API cũ của màn).
export { TOTAL_CODES, CHANGE_CODES, renderScoreSheet } from '../components/score-sheet.js'
const SHEET_MS = 2000
const END_DELAY_MS = 1200
// M5: chế độ tập trung khi nấu chỉ bật ở khung thấp hơn chừng này (px).
export const FOCUS_MAX_H = 760

export default {
  mount(root, app) {
    const S = app.data.STRINGS
    const state0 = app.state
    if (!state0.shift) { setTimeout(() => app.go('prep'), 0); return { unmount() {} } }
    // ca thật không bao giờ tự dừng: bản lưu ghi lúc hướng dẫn đang hiện (tải lại trang giữa tour) thì chạy tiếp
    if (state0.shift.paused && !state0.shift.tasting && !(app.tour && app.tour.isHeld())) setPaused(state0, false)

    const hud = createHud(app)
    const progress = createProgress4(app.data)
    const rail = createTicketRail(app, { onTap: id => { showTab('kitchen'); app.bus.emit('ui.ticket.select', { ticketId: id }) } })
    const queueBox = h('div', { class: 'queue', testid: 'queue' })
    const waitBox = h('div', { class: 'waiting', testid: 'waiting' })
    const street = h('section', { class: 'street' }, queueBox, waitBox)
    const panelCounter = h('section', { class: 'panel panel-counter', testid: 'panel-counter' })
    const panelKitchen = h('section', { class: 'panel panel-kitchen', testid: 'panel-kitchen', hidden: true })
    const tabCounter = h('button', { class: 'tab', type: 'button', testid: 'tab-counter', role: 'tab', onclick: () => showTab('counter') })
    const tabKitchen = h('button', { class: 'tab', type: 'button', testid: 'tab-kitchen', role: 'tab', onclick: () => showTab('kitchen') })
    const tabbar = h('nav', { class: 'tabbar', role: 'tablist' }, tabCounter, tabKitchen)
    const sheetHost = h('div', { class: 'sheet-host' })
    const el = h('section', { class: 'service-screen', testid: 'screen-service' },
      hud.el, street, progress.el, rail.el, h('div', { class: 'panels' }, panelCounter, panelKitchen), tabbar, sheetHost)
    root.appendChild(el)

    let active = 'counter'
    const dots = { counter: false, kitchen: false }
    let destroyed = false
    const offs = []

    // ---------- M5: chế độ tập trung khi nấu (thiết kế mục 1.9) ----------
    // Tab Bếp đang nấu (bước Chọn, Thớt hoặc sân khấu một bước) và khung cao dưới FOCUS_MAX_H: .service-screen.is-focus ẩn
    // dải khách và thanh 4 khâu (css/game.css) để panel Bếp cao thêm ~120px; dây phiếu (màu chờ) vẫn hiện. Bếp báo trạng thái
    // nấu qua onFocus TRƯỚC khi dựng mini-game (plugin đo khung lúc dựng) nên lớp được bật đồng bộ ngay trong lời gọi đó;
    // mỗi khung hình update() xét lại (đổi tab, xoay máy, đổi cỡ khung).
    // Thông báo nổi trong lúc tập trung: chờ tới khi thoát (bếp gửi phản hồi tức thì của chính nó với { now: true }).
    // Vòng sửa F: thông báo cũng chờ trong lúc bảng ra món của bếp đang hiện (mọi cỡ khung; bếp báo qua onReveal, và giữ
    // chế độ tập trung tới khi bảng đóng) — không thả ra đè ruy băng tên món ngay lúc bấm Ra món.
    let kitchenWantsFocus = false
    let focusOn = false
    let revealOpen = false
    const heldToasts = []
    // Chiều cao màn (so với FOCUS_MAX_H): đọc lại khi màn đổi cỡ (ResizeObserver báo sau bố cục), không đọc clientHeight mỗi
    // khung hình — đọc kích thước giữa lúc trang vừa đổi DOM ép trình duyệt tính bố cục sớm rồi tính lại lần nữa trong cùng
    // khung (máy yếu: 20+ ms mỗi khung trong lúc con dấu, ra món).
    let screenH = -1
    const readScreenH = () => { screenH = el.isConnected ? el.clientHeight : 0 }
    let sizeObs = null
    if (typeof ResizeObserver === 'function') {
      sizeObs = new ResizeObserver(() => { if (destroyed) return; readScreenH(); applyFocus() })
      sizeObs.observe(el)
    }
    function applyFocus() {
      if (destroyed) return
      if (!sizeObs || screenH < 0) readScreenH()
      const on = kitchenWantsFocus && active === 'kitchen' && el.isConnected && screenH > 0 && screenH < FOCUS_MAX_H
      if (on === focusOn) return
      focusOn = on
      el.classList.toggle('is-focus', on)
      // chồng thông báo nổi (lớp nổi gốc của app) lên sát HUD: không phủ xuống vùng nấu (css/game.css)
      if (app.overlay && app.overlay.classList) app.overlay.classList.toggle('is-cook-focus', on)
      if (!on) releaseToasts()
    }
    const holdingToasts = () => focusOn || revealOpen
    function releaseToasts() { if (!holdingToasts()) flushToasts() }
    const realToast = app.toast
    const focusToast = function (text, opts) {
      if (holdingToasts() && !(opts && opts.now) && !destroyed) { heldToasts.push([text, opts]); return null }
      return realToast.call(app, text, opts)
    }
    function flushToasts() {
      // giữ tối đa 3 thông báo thường + 2 thẻ Mẹo nghề mới nhất (cùng giới hạn hàng chờ của toast.js)
      const list = heldToasts.splice(0)
      const tips = list.filter(([, o]) => o && o.kind === 'tip').slice(-2)
      const plain = list.filter(([, o]) => !(o && o.kind === 'tip')).slice(-3)
      for (const [t, o] of [...tips, ...plain]) { try { realToast.call(app, t, o) } catch { /* bỏ qua */ } }
    }
    if (typeof realToast === 'function') app.toast = focusToast
    // Thông báo nổi chỉ che dải khách (đặc tả mục 12): chồng thông báo không vượt xuống thanh 4 khâu; thông báo không
    // vừa thì chờ thông báo trước tắt (toast.js). Chế độ tập trung: thanh 4 khâu ẩn nhưng vẫn nằm trong bố cục (cao 0) ngay
    // dưới dây phiếu (css/game.css), nên mốc này là mép trên vùng nấu. Không bao giờ trả số ≤ 0 (toast.js coi là "không
    // giới hạn").
    if (typeof app.toastLimit === 'function') {
      app.toastLimit(() => {
        const stack = app.overlay && app.overlay.querySelector('.toast-stack')
        const bar = progress.el
        if (!stack || !bar || !bar.isConnected) return 0
        return Math.max(1, bar.getBoundingClientRect().top - stack.getBoundingClientRect().top - 4)
      })
    }

    const counter = mountCounter(panelCounter, app, { switchTab: t => showTab(t) })
    let kitchen = null
    const kitchenPlaceholder = h('div', { class: 'kitchen-wait muted', testid: 'kitchen-loading' }, 'Đang dọn bếp…')
    panelKitchen.appendChild(kitchenPlaceholder)
    import('./kitchen.js').then(mod => {
      if (destroyed) return
      const fn = mod.mountKitchen || (mod.default && mod.default.mount)
      if (typeof fn !== 'function') throw new Error('kitchen.js thiếu mountKitchen')
      kitchenPlaceholder.remove()
      kitchen = fn(panelKitchen, app, {
        onFocus: want => { kitchenWantsFocus = !!want; applyFocus() },
        onReveal: on => { revealOpen = !!on; if (!revealOpen) releaseToasts() }
      }) || null
      if (kitchen && active === 'kitchen' && kitchen.onShow) kitchen.onShow()
    }).catch(err => {
      console.warn('Không nạp được bếp:', err && err.message)
      kitchenPlaceholder.textContent = 'Bếp chưa sẵn sàng.'
    })

    function showTab(name) {
      if (name !== 'counter' && name !== 'kitchen') return
      dots[name] = false
      if (name === active) { paintTabs(); return }
      const prev = active
      active = name
      panelCounter.hidden = name !== 'counter'
      panelKitchen.hidden = name !== 'kitchen'
      if (prev === 'counter') counter.onHide && counter.onHide()
      if (prev === 'kitchen' && kitchen && kitchen.onHide) kitchen.onHide()
      // chế độ tập trung: tắt ngay khi rời Bếp; sang Bếp thì bếp tự báo (onFocus) lúc dựng lại, trước khi dựng mini-game
      applyFocus()
      if (name === 'counter') counter.onShow && counter.onShow()
      if (name === 'kitchen' && kitchen && kitchen.onShow) kitchen.onShow()
      app.sound('click')
      paintTabs()
      app.bus.emit('ui.tab', { tab: name })
    }
    app.switchTab = showTab

    let tabSig = ''
    function paintTabs() {
      const sh = app.state.shift
      const q = sh ? sh.queue.length : 0
      const t = sh ? sh.tickets.length : 0
      const key = [active, q, t, dots.counter, dots.kitchen].join('|')
      if (key === tabSig) return
      tabSig = key
      tabCounter.textContent = ''
      tabCounter.append(h('span', null, S.tabs.counter), h('span', { class: 'tab-count' }, ' · ' + q), dots.counter ? h('span', { class: 'dot', testid: 'dot-counter' }) : '')
      tabKitchen.textContent = ''
      tabKitchen.append(h('span', null, S.tabs.kitchen), h('span', { class: 'tab-count' }, ' · ' + t), dots.kitchen ? h('span', { class: 'dot', testid: 'dot-kitchen' }) : '')
      tabCounter.classList.toggle('active', active === 'counter')
      tabKitchen.classList.toggle('active', active === 'kitchen')
      tabCounter.setAttribute('aria-selected', String(active === 'counter'))
      tabKitchen.setAttribute('aria-selected', String(active === 'kitchen'))
      tabCounter.dataset.dot = dots.counter ? 'true' : 'false'
      tabKitchen.dataset.dot = dots.kitchen ? 'true' : 'false'
    }

    // ---------- Hàng khách ----------
    let queueSig = ''
    const rings = new Map()
    function renderStreet() {
      const sh = app.state.shift
      const counterId = sh.counter ? sh.counter.customerId : null
      const inQueue = sh.queue.slice(0, 3).map(id => sh.customers[id]).filter(Boolean)
      const waiting = Object.values(sh.customers).filter(c => c.status === 'cho_mon' || c.status === 'nhan_mon')
      const key = JSON.stringify([inQueue.map(c => [c.id, c.tutorial ? 'vui' : moodFor(c.patience), c.id === counterId]), waiting.map(c => c.id)])
      if (key !== queueSig) {
        queueSig = key
        rings.clear()
        queueBox.textContent = ''
        if (!inQueue.length) queueBox.appendChild(h('div', { class: 'queue-empty muted' }, 'Chưa có khách xếp hàng'))
        for (const c of inQueue) {
          const ring = createRing(62, 5)
          rings.set(c.id, { ring, kind: 'queue' })
          // M4: khách lạ (quà quê là nguyên liệu hiếm) có dấu ★ riêng ở hàng chờ
          queueBox.appendChild(h('div', { class: ['q-cust', c.id === counterId ? 'at-counter' : '', c.bigOrder ? 'is-order' : '', c.stranger ? 'is-stranger' : ''], testid: 'queue-' + c.id },
            h('div', { class: 'q-face' }, ring.el, svgBox(face(c.persona, c.tutorial ? 'vui' : moodFor(c.patience), c.gender), 'face-img'),
              c.stranger ? h('span', { class: 'q-stranger', testid: 'stranger-badge', title: 'Khách lạ', 'aria-label': 'Khách lạ' }, '★') : null),
            h('div', { class: 'q-name' }, c.name),
            c.id === counterId ? h('div', { class: 'q-tag' }, 'Ở quầy') : c.bigOrder ? h('div', { class: 'q-tag is-order', testid: 'queue-order-tag' }, 'Đơn đặt trước')
              : c.stranger ? h('div', { class: 'q-tag is-stranger' }, (S.rare && S.rare.strangerTag) || 'Khách lạ') : null))
        }
        waitBox.textContent = ''
        if (waiting.length) {
          waitBox.appendChild(h('div', { class: 'wait-title' }, 'Chờ món'))
          const row = h('div', { class: 'wait-row' })
          for (const c of waiting) {
            const ring = createRing(42, 4)
            rings.set(c.id, { ring, kind: 'wait' })
            row.appendChild(h('div', { class: 'w-cust', testid: 'waiting-' + c.id, title: c.name },
              h('div', { class: 'w-face' }, ring.el, svgBox(face(c.persona, 'binh_thuong', c.gender), 'face-img')),
              h('div', { class: 'w-name' }, c.name)))
          }
          waitBox.appendChild(row)
        }
      }
      for (const [id, { ring, kind }] of rings) {
        const c = sh.customers[id]
        if (!c) continue
        if (kind === 'queue') ring.set(c.tutorial ? 1 : c.patience)
        else {
          const used = c.waitBudget ? (sh.t - (c.waitStart || 0)) / c.waitBudget : 0
          ring.set(1 - Math.min(1, Math.max(0, used)))
        }
      }
    }

    // Khách ở quầy (hoặc khách vừa kẹp phiếu) cho thanh 4 chấm.
    let lastCounterId = null
    let warnedLow = ''
    function paintProgress() {
      const sh = app.state.shift
      let cust = sh.counter ? sh.customers[sh.counter.customerId] : null
      if (cust) lastCounterId = cust.id
      else if (lastCounterId) {
        const c = sh.customers[lastCounterId]
        if (c && (c.status === 'cho_mon' || c.status === 'nhan_mon')) cust = c
      }
      progress.set(cust ? stageOf(cust) : null, cust ? cust.name : '')
      // khách đầu hàng còn dưới 30% kiên nhẫn: rung nhẹ 1 lần
      const head = sh.queue.length ? sh.customers[sh.queue[0]] : null
      if (head && !head.tutorial && head.patience < 0.3 && warnedLow !== head.id) {
        warnedLow = head.id
        app.vibrate(30)
        app.sound('nudge')
      }
    }

    // ---------- Phiếu chấm ----------
    const sheetQueue = []
    let sheetShowing = false
    function showNextSheet() {
      if (sheetShowing || !sheetQueue.length || destroyed) return
      sheetShowing = true
      const sheet = sheetQueue.shift()
      const node = renderScoreSheet(app, sheet)
      sheetHost.appendChild(node)
      requestAnimationFrame(() => node.classList.add('show'))
      app.sound(sheet.stars >= 4 ? 'ding' : 'click')
      const hide = () => {
        if (destroyed) return
        // hướng dẫn phiếu chấm (hoặc bảng Hướng dẫn) đang mở: giữ phiếu tới khi đóng
        if (app.tour && app.tour.isHeld()) { setTimeout(hide, 300); return }
        node.classList.remove('show')
        node.classList.add('hide')
        setTimeout(() => { node.remove(); sheetShowing = false; showNextSheet() }, 250)
      }
      setTimeout(hide, SHEET_MS)
    }
    offs.push(app.bus.on('customer.rated', ({ customerId } = {}) => {
      const sh = app.state.shift
      if (!sh) return
      const list = sh.scoreSheets.filter(s => s.customerId === customerId)
      const sheet = list[list.length - 1]
      if (!sheet) return
      sheetQueue.push(sheet)
      showNextSheet()
    }))

    // ---------- Chấm đỏ trên tab ----------
    offs.push(app.bus.on('customer.arrived', () => {
      if (active !== 'counter') dots.counter = true
      app.sound('bell')
    }))
    offs.push(app.bus.on('ticket.clipped', () => { if (active !== 'kitchen') dots.kitchen = true }))
    offs.push(app.bus.on('customer.lost', ({ customerId, reason } = {}) => {
      const sh = app.state.shift
      const c = sh && sh.customers[customerId]
      if (!c) return
      if (reason === 'hang_day' || reason === 'het_kien_nhan') app.sound('nudge')
      if (reason === 'hang_day') app.toast(`${c.name} thấy hàng dài quá nên đi ngang.`, { kind: 'bad' })
      else if (reason === 'het_kien_nhan') app.toast(`${c.name} chờ lâu quá nên bỏ về.`, { kind: 'bad' })
    }))
    offs.push(app.bus.on('qr.arrived', () => app.sound('coin')))

    // ---------- M2: thông báo tiến độ (không chặn thao tác) ----------
    const M = S.meta
    const lastQuestToast = {}
    // khách hướng dẫn ngày 1 còn trong ca: người mới chưa mở "Việc hôm nay", không báo tiến độ việc lúc này
    const inTutorial = () => {
      const sh = app.state.shift
      return !!(sh && sh.day === 1 && Object.values(sh.customers || {}).some(c => c.tutorial && c.status !== 'roi_di' && c.status !== 'bo_ve'))
    }
    // tiến độ nhiều việc cùng lúc (vd một món vừa Tuyệt hảo vừa không lỗi nguyên liệu) gộp thành 1 thông báo
    let questBatch = []
    let questBatchTimer = 0
    const flushQuestBatch = () => {
      questBatchTimer = 0
      const list = questBatch
      questBatch = []
      if (destroyed || !list.length) return
      if (list.length === 1) {
        app.toast(M.questProgress.replace('{cur}/{target}', list[0].num).replace('{text}', list[0].text), { kind: 'info', testid: 'quest-toast', duration: 1800 })
        return
      }
      app.toast(list.map(x => `${x.num} ${x.text}`).join(' · '), { kind: 'info', title: M.quests, testid: 'quest-toast', duration: 2400 })
    }
    offs.push(() => clearTimeout(questBatchTimer))
    offs.push(app.bus.on('quest.progress', (c = {}) => {
      const def = questDef(app.ctx, c.id)
      if (!def) return
      const text = questText(def, c.target)
      if (c.justDone) {
        app.toast(`Xong: ${text}. Nhận thưởng ở màn Chuẩn bị.`, { kind: 'good', title: M.quests, testid: 'quest-toast' })
        lastQuestToast[c.id] = performance.now()
        return
      }
      if (!c.progress) {
        if (def.breakOn && !inTutorial()) app.toast(`${M.quests}: chuỗi "${text}" bị đứt, đếm lại từ đầu.`, { kind: 'bad', testid: 'quest-toast' })
        return
      }
      if (inTutorial()) return
      const t = performance.now()
      if (lastQuestToast[c.id] && t - lastQuestToast[c.id] < 4000) return
      lastQuestToast[c.id] = t
      const num = def.money ? `${formatVND(c.progress)}/${formatVND(c.target)}` : `${c.progress}/${c.target}`
      questBatch = questBatch.filter(x => x.id !== c.id).concat([{ id: c.id, num, text }])
      if (!questBatchTimer) questBatchTimer = setTimeout(flushQuestBatch, 400)
    }))
    // "Dì Sáu dặn", "Cô Hạnh nhờ": động từ theo NPC (NPCS[npc].verb)
    const chainWho = def => {
      const npc = app.data.NPCS && app.data.NPCS[def.npc]
      return npc ? `${npc.name} ${npc.verb || 'dặn'}` : def.name
    }
    offs.push(app.bus.on('chain.step', ({ chainId, stepIndex, done } = {}) => {
      const def = chainDefs(app.ctx)[chainId]
      if (!def) return
      // chuỗi sự kiện nhận thưởng ở màn sự kiện (màn Chuẩn bị chỉ ghim chuỗi thường)
      const where = def.eventId ? 'Nhận thưởng ở màn sự kiện.' : 'Nhận thưởng ở màn Chuẩn bị.'
      app.toast(done ? `Xong chuỗi "${def.name}"! ${where}` : `Xong bước ${stepIndex + 1}/${def.steps.length}. ${where}`,
        { kind: 'good', title: chainWho(def), icon: npcFace(def.npc), testid: 'chain-toast', duration: 2600 })
    }))
    // việc sự kiện hôm nay: báo tiến độ (mỗi việc tối đa 1 lần/4 giây), xong việc luôn báo
    const lastEvQuestToast = {}
    offs.push(app.bus.on('event.quest', ({ eventId, id, progress, target, justDone } = {}) => {
      const ev = app.data.EVENTS && app.data.EVENTS[eventId]
      const def = ev && (ev.quests || []).find(q => q.id === id)
      if (!def) return
      const text = String(def.text || '').replace('{n}', String(target))
      if (justDone) {
        app.toast(`Xong: ${text}. Nhận ${(def.reward && def.reward.tem) || 0} ${ev.currencyName} ở màn sự kiện.`,
          { kind: 'good', title: 'Việc sự kiện', icon: icon('phan_trang'), testid: 'event-quest-toast', duration: 2600 })
        lastEvQuestToast[id] = performance.now()
        return
      }
      const t = performance.now()
      if (lastEvQuestToast[id] && t - lastEvQuestToast[id] < 4000) return
      lastEvQuestToast[id] = t
      app.toast(`Việc sự kiện: ${progress}/${target} · ${text}`, { kind: 'info', icon: icon('phan_trang'), testid: 'event-quest-toast', duration: 1800 })
    }))
    // tiến độ bước chuỗi đang làm (vd "Dì Sáu dặn · 2/3 · Thối đúng 3 lần"); xong bước thì chain.step báo
    const lastChainToast = {}
    offs.push(app.bus.on('chain.progress', ({ chainId, stepIndex, progress, target } = {}) => {
      if (!progress || progress >= target) return
      const def = chainDefs(app.ctx)[chainId]
      const st = def && def.steps[stepIndex]
      if (!st) return
      const t = performance.now()
      if (lastChainToast[chainId] && t - lastChainToast[chainId] < 4000) return
      lastChainToast[chainId] = t
      const text = String(st.text || '').replace('{n}', String(st.target || 1))
      app.toast(`${progress}/${target} · ${text}`, { kind: 'info', title: chainWho(def), icon: npcFace(def.npc), testid: 'chain-toast', duration: 1800 })
    }))
    offs.push(app.bus.on('tem.gained',({ eventId, n, today, cap } = {}) => {
      const ev = app.data.EVENTS && app.data.EVENTS[eventId]
      if (!ev || !n) return
      const full = cap && today >= cap
      app.toast(`+${n} ${ev.currencyName}` + (full ? ` · ${M.eventDailyCap.replace('{n}', String(cap)).replace('{currency}', ev.currencyName)}` : ` (hôm nay ${today}/${cap})`),
        { kind: 'good', icon: icon('phan_trang'), testid: 'tem-toast', duration: 1600 })
    }))
    // Đầu ca: nhắc sự kiện ngày / Phiếu Chợ Sớm đang áp dụng; M3: khách quen trả nợ / quên trả nợ
    {
      const sh = app.state.shift
      const mods = sh && sh.mods
      if (sh && sh.t < 2) {
        for (const n of sh.debtNotes || []) {
          app.toast(n.text, { kind: n.kind === 'tra' ? 'good' : 'info', title: 'Sổ ghi nợ', testid: 'debt-toast', duration: 3200 })
          if (n.kind === 'tra') app.sound('coin')
        }
      }
      if (mods && sh.t < 2) {
        const de = mods.dayEvent && app.data.DAY_EVENTS && app.data.DAY_EVENTS[mods.dayEvent.id]
        if (de) {
          // M4: không chọn lựa chọn của sự kiện (vd không nhận đơn đặt trước) thì nhắc theo skipText
          const ch = mods.dayEvent.choice && de.choice ? ` Đã ${de.choice.label.toLocaleLowerCase('vi-VN')}.`
            : de.choice && de.choice.skipText ? ' ' + de.choice.skipText : ''
          app.toast(de.desc + ch, { title: de.name, kind: 'info', icon: icon(de.icon || de.id), testid: 'day-event-toast', duration: 3200 })
        }
        if (mods.cogsMul && mods.cogsMul < 1) app.toast(M.couponActive, { kind: 'good', icon: icon('phieu_cho_som'), duration: 2600 })
      }
    }
    // M4: sự kiện ngày trong ca — nhắc trước khi sắp bị phạt, báo phạt rõ nguyên nhân (tiền của tình huống trong ca đã
    // hiện trong hộp thoại tình huống, không báo lại)
    offs.push(app.bus.on('event.warn', ({ name, text } = {}) => {
      app.toast(text || '', { kind: 'info', title: name ? 'Dì Sáu nhắc · ' + name : 'Dì Sáu nhắc', icon: DI_SAU.lo, testid: 'event-warn-toast', duration: 3600 })
      app.sound('nudge')
    }))
    offs.push(app.bus.on('event.fined', ({ name, text, amount, spared, source } = {}) => {
      // phạt lúc kết ca (vd đoàn kiểm tra): Tổng kết đã ghi rõ, không báo nổi đè lên màn Tổng kết
      if (source === 'incident' || ended) return
      const money = amount > 0 ? `−${formatVND(amount)}. ` : ''
      app.toast(money + (text || ''), { kind: spared > 0 && !(amount > 0) ? 'info' : 'bad', title: name || 'Sự kiện', icon: DI_SAU.lo, testid: 'event-fine-toast', duration: 4200 })
      app.sound('error')
    }))
    offs.push(app.bus.on('ui.tab', ({ tab } = {}) => { if (tab && tab !== active) showTab(tab) }))

    // ---------- M3: Tình huống trong ca ----------
    // Hỏi lõi mỗi khung hình và NGAY khi kẹp phiếu (trước khi khách kế bước lên quầy): chỉ ở tab Quầy, quầy trống,
    // không có hộp thoại khác. Hộp thoại chặn nên thời gian ca và kiên nhẫn khách tạm dừng tới khi chọn xong.
    let incidentOpen = false
    function checkIncident() {
      if (incidentOpen || destroyed || ended || active !== 'counter' || app.locked || app.modalOpen() || (app.tour && app.tour.isHeld())) return
      if (!app.state.shift || !incidentDue(app.state, app.ctx)) return
      const view = openIncident(app.state, app.ctx)
      if (!view) return
      incidentOpen = true
      app.save()
      showIncident(view).finally(() => { incidentOpen = false })
    }
    offs.push(app.bus.on('ticket.clipped', () => checkIncident()))

    async function showIncident(view) {
      app.sound('nudge')
      app.vibrate(20)
      const tips = Array.isArray(app.data.TIPS) ? app.data.TIPS : []
      const done = await app.modal({
        testid: 'incident-modal', className: 'incident-modal',
        render: close => {
          // phần dựng hộp (câu hỏi, kết quả): components/incident-view.js
          const box = createIncidentBox(app, view, {
            onChoose: c => {
              const r = resolveIncident(app.state, c.id, app.ctx)
              if (!r.ok) { app.toast('Chưa chọn được cách này.', { kind: 'bad' }); return }
              app.sound(r.effects.money > 0 || r.effects.gain > 0 ? 'coin' : 'paper')
              app.saveNow()
              const tip = r.tipId ? tips.find(t => t.id === r.tipId) : null
              box.showResult(c, r, tip, () => close(r))
            }
          })
          return box.el
        }
      })
      if (done && !destroyed) app.save()
    }

    // ---------- Phàn nàn ----------
    let complaintOpen = false
    function checkComplaint() {
      if (complaintOpen || app.modalOpen() || (app.tour && app.tour.isHeld())) return
      const sh = app.state.shift
      const c = Object.values(sh.customers).find(x => x.status === 'nhan_mon' && x.complaint && !x.complaint.resolved)
      if (!c) return
      complaintOpen = true
      openComplaint(c).finally(() => { complaintOpen = false })
    }

    async function openComplaint(customer) {
      const R = app.data.RECIPES
      const aps = (app.data.DIALOGUE.apologies || []).map((a, i) => ({ i, text: typeof a === 'string' ? a : a.text }))
      // xáo thứ tự hiển thị để câu đúng không luôn nằm đầu
      for (let k = aps.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [aps[k], aps[j]] = [aps[j], aps[k]] }
      const items = customer.complaint.items || []
      const refund = items.reduce((s, it) => s + (it.refund || 0), 0)
      // M4: dòng món hiếm mà kho hết nguyên liệu hiếm → chỉ hoàn tiền được
      const remakeOk = complaintRemakeOk(app.state, customer.id, app.ctx)
      const says = (() => {
        try {
          return app.data.makeLine('complaint', {
            persona: personaObj(app.ctx, customer.persona), region: customer.region, rand: Math.random,
            vars: { gender: customer.gender, name: customer.name, ...(customer.self ? { self: customer.self } : {}), mon: items[0] && R[items[0].line.recipeId] ? R[items[0].line.recipeId].name : '' }
          })
        } catch { return '' }
      })()
      app.sound('error')
      const result = await app.modal({
        title: S.screens.complaint,
        testid: 'complaint-modal',
        // phần dựng hộp (câu khách nói, món bị phàn nàn, 2 bước chọn): components/incident-view.js
        render: close => renderComplaint(app, customer, { says, aps, items, refund, remakeOk, close })
      })
      if (!result || destroyed) return
      const r = resolveComplaint(app.state, customer.id, { apologyIndex: result.apology, action: result.action }, app.ctx)
      if (!r.ok) return
      app.toast(r.apologyCorrect ? 'Xin lỗi chân thành, khách dịu lại.' : 'Câu nói đó làm khách phật ý hơn.', { kind: r.apologyCorrect ? 'good' : 'bad' })
      if (result.action === 'remake') { app.toast('Phiếu làm lại đã kẹp đầu dây bếp.', { kind: 'info' }); dots.kitchen = active !== 'kitchen' }
      app.save()
    }

    // ---------- Kết ca ----------
    let overSince = 0
    let ended = false
    function checkEnd(now) {
      if (ended || (app.tour && app.tour.isHeld())) return
      if (!isShiftOver(app.state)) { overSince = 0; return }
      if (!overSince) { overSince = now; return }
      if (now - overSince < END_DELAY_MS || sheetShowing || sheetQueue.length || app.modalOpen()) return
      ended = true
      const summary = endShift(app.state, app.ctx)
      app.saveNow({ backup: true })
      app.go('summary', { summary })
    }

    // ---------- 0.4.1: Hướng dẫn lần đầu (tour) theo khâu đang làm ----------
    const tourBySpot = {}
    for (const [id, t] of Object.entries(app.data.TOURS || {})) if (t.screen === 'service' && t.spot) tourBySpot[t.spot] = id
    // chỗ đang làm: phiếu chấm đang hiện > tab đang mở (Quầy: khâu của khách ở quầy; Bếp: dây phiếu / chọn / Thớt / giao);
    // null = đang bận (mini-game, bảng chọn của bếp, công bố món) → chưa tự hiện
    function tourSpot() {
      if (sheetShowing && sheetSettled(sheetHost.querySelector('.score-sheet.show'))) {
        // không chen vào mini-game vừa mở ở Bếp
        return active === 'kitchen' && kitchen && kitchen.busy && kitchen.busy() ? null : 'score'
      }
      if (active === 'counter') return counter.tourSpot ? counter.tourSpot() : null
      return kitchen && kitchen.tourSpot ? kitchen.tourSpot() : null
    }
    // tour của một chỗ, kèm tour dẫn (lead) đi trước: tới thẳng chỗ này (vd chạm phiếu trên dây ở đầu màn là mở luôn phiếu
    // trong Bếp) thì tour của chỗ bị bỏ qua (Dây phiếu) hiện nối tiếp, không lỡ mất
    function spotTours(spot) {
      const id = tourBySpot[spot]
      if (!id) return []
      const lead = (app.data.TOURS[id].lead || []).filter(x => app.data.TOURS[x])
      return [...lead, id]
    }
    function offerTour() {
      if (!app.tour || ended || destroyed || app.locked) return
      const ids = spotTours(tourSpot()).filter(id => app.tour.canAuto(id))
      if (ids.length) app.tour.offer(ids)
    }
    let heldHere = false
    if (app.tour) {
      // nút "?" → "Xem lại hướng dẫn màn này": tour của khâu đang làm; quầy trống / bếp chưa có phiếu → tổng quan ca bán
      app.tour.provide(() => {
        const ids = spotTours(tourSpot())
        return ids.length ? ids : [tourBySpot.idle].filter(Boolean)
      })
      offs.push(app.tour.onHold(held => {
        heldHere = held
        const st = app.state
        if (st && st.shift && !st.shift.tasting) setPaused(st, held)
        if (held) { if (active === 'kitchen' && kitchen && kitchen.guideHold) kitchen.guideHold(true) }
        else if (kitchen && kitchen.guideHold) kitchen.guideHold(false)
        if (!held) app.save()
      }))
      offs.push(() => {
        app.tour.provide(null)
        // rời màn khi đang giữ (hiếm): không để ca dừng mãi
        const st = app.state
        if (heldHere && st && st.shift && !st.shift.tasting) setPaused(st, false)
      })
    }

    paintTabs()
    renderStreet()
    paintProgress()

    return {
      // nút Back của điện thoại giữa ca: ở lại quầy, không rời ca
      onBack() {
        app.toast('Đang bán hàng, phục vụ hết khách rồi mới rời xe nha.', { kind: 'info' })
      },
      update(dt) {
        if (destroyed || !app.state.shift) return
        // advance() đã tự mở quầy; gọi lại cho chắc (hàm idempotent).
        const sh = app.state.shift
        if (!sh.counter && sh.queue.length && !sh.paused) beginCounter(app.state, app.ctx)
        hud.update()
        renderStreet()
        paintProgress()
        rail.update()
        paintTabs()
        counter.update(dt)
        if (kitchen && kitchen.update) {
          try { kitchen.update(dt) } catch (err) { console.error(err) }
        }
        applyFocus()
        checkComplaint()
        checkIncident()
        offerTour()
        // thời gian ca (giây) cho kiểm thử tự động: đứng yên khi có hộp thoại chặn (vd tình huống trong ca)
        el.dataset.t = sh.t.toFixed(2)
        checkEnd(performance.now())
      },
      unmount() {
        destroyed = true
        if (sizeObs) sizeObs.disconnect()
        for (const off of offs) off()
        if (typeof app.toastLimit === 'function') app.toastLimit(null)
        // trả lại hàm thông báo của app; thông báo còn chờ lúc rời màn (hết ca) là tin trong ca đã cũ: bỏ (thẻ Mẹo nghề vẫn
        // nằm trong Sổ tay nghề)
        if (app.toast === focusToast) app.toast = realToast
        focusOn = false
        revealOpen = false
        heldToasts.length = 0
        if (app.overlay && app.overlay.classList) app.overlay.classList.remove('is-cook-focus')
        if (app.switchTab === showTab) app.switchTab = null
        counter.unmount()
        if (kitchen && kitchen.unmount) { try { kitchen.unmount() } catch (err) { console.error(err) } }
      }
    }
  }
}

// Phiếu chấm đã trượt lên xong (hết hiệu ứng hiện, đã rõ hẳn)? Tour phiếu chấm chỉ tự hiện lúc này: đang trượt lên thì phiếu
// còn trong suốt, các bước chỉ vào phiếu (Phiếu chấm, Tip) bị coi là chưa hiện và bị bỏ mất.
export function sheetSettled(node) {
  if (!node || !node.isConnected || !node.classList.contains('show')) return false
  try {
    if (typeof node.getAnimations === 'function' && node.getAnimations().some(a => a.playState === 'running' || a.playState === 'pending')) return false
  } catch { /* trình duyệt cũ: chỉ xem độ mờ */ }
  return Number(getComputedStyle(node).opacity) >= 0.9
}
