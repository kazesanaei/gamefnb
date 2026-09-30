// Màn Ca bán: HUD, hàng khách, tiến trình 4 khâu, dây phiếu, 2 panel Quầy/Bếp, phiếu chấm, xử lý phàn nàn.
import { h, svgBox } from '../dom.js'
import { face } from '../art.js'
import { isShiftOver, endShift } from '../../core/shift.js'
import { beginCounter } from '../../core/order.js'
import { stageOf, personaObj } from '../../core/customer.js'
import { resolveComplaint } from '../../core/kitchen.js'
import { createHud } from '../components/hud.js'
import { createProgress4 } from '../components/progress4.js'
import { createTicketRail } from '../components/ticket-rail.js'
import { createRing, moodFor } from '../components/patience.js'
import { mountCounter } from './counter.js'
import { formatVND, starString } from '../format.js'
import { questDef, questText } from '../../core/quests.js'
import { chainDefs } from '../../core/chains.js'
import { icon } from '../art.js'
import { npcFace } from '../components/meta-ui.js'

const ORDER_CODES = ['sai_mon', 'thieu_mon', 'thua_mon', 'sai_so_luong', 'sai_ghi_chu']
// Phiếu chấm tách 2 hàng theo khâu (đặc tả mục 3.11): Báo tổng (khâu Thanh toán) và Thối tiền (khâu Tính tiền).
export const TOTAL_CODES = ['bao_du', 'bao_thieu']
export const CHANGE_CODES = ['thoi_thieu', 'thoi_du', 'qr_gia']
const SHEET_MS = 2000
const END_DELAY_MS = 1200

export default {
  mount(root, app) {
    const S = app.data.STRINGS
    const state0 = app.state
    if (!state0.shift) { setTimeout(() => app.go('prep'), 0); return { unmount() {} } }

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

    const counter = mountCounter(panelCounter, app, { switchTab: t => showTab(t) })
    let kitchen = null
    const kitchenPlaceholder = h('div', { class: 'kitchen-wait muted', testid: 'kitchen-loading' }, 'Đang dọn bếp…')
    panelKitchen.appendChild(kitchenPlaceholder)
    import('./kitchen.js').then(mod => {
      if (destroyed) return
      const fn = mod.mountKitchen || (mod.default && mod.default.mount)
      if (typeof fn !== 'function') throw new Error('kitchen.js thiếu mountKitchen')
      kitchenPlaceholder.remove()
      kitchen = fn(panelKitchen, app) || null
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
          queueBox.appendChild(h('div', { class: ['q-cust', c.id === counterId ? 'at-counter' : ''], testid: 'queue-' + c.id },
            h('div', { class: 'q-face' }, ring.el, svgBox(face(c.persona, c.tutorial ? 'vui' : moodFor(c.patience), c.gender), 'face-img')),
            h('div', { class: 'q-name' }, c.name),
            c.id === counterId ? h('div', { class: 'q-tag' }, 'Ở quầy') : null))
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
      setTimeout(() => {
        node.classList.remove('show')
        node.classList.add('hide')
        setTimeout(() => { node.remove(); sheetShowing = false; showNextSheet() }, 250)
      }, SHEET_MS)
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
      if (reason === 'hang_day') app.toast(`${c.name} thấy hàng dài quá nên đi ngang.`, { kind: 'bad' })
      else if (reason === 'het_kien_nhan') app.toast(`${c.name} chờ lâu quá nên bỏ về.`, { kind: 'bad' })
    }))
    offs.push(app.bus.on('qr.arrived', () => app.sound('coin')))

    // ---------- M2: thông báo tiến độ (không chặn thao tác) ----------
    const M = S.meta
    const lastQuestToast = {}
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
        if (def.breakOn) app.toast(`${M.quests}: chuỗi "${text}" bị đứt, đếm lại từ đầu.`, { kind: 'bad', testid: 'quest-toast' })
        return
      }
      const t = performance.now()
      if (lastQuestToast[c.id] && t - lastQuestToast[c.id] < 4000) return
      lastQuestToast[c.id] = t
      const num = def.money ? `${formatVND(c.progress)}/${formatVND(c.target)}` : `${c.progress}/${c.target}`
      app.toast(M.questProgress.replace('{cur}/{target}', num).replace('{text}', text), { kind: 'info', testid: 'quest-toast', duration: 1800 })
    }))
    offs.push(app.bus.on('chain.step', ({ chainId, stepIndex, done } = {}) => {
      const def = chainDefs(app.ctx)[chainId]
      if (!def) return
      const who = (app.data.NPCS && app.data.NPCS[def.npc] && app.data.NPCS[def.npc].name) || def.name
      app.toast(done ? `Xong chuỗi "${def.name}"! Nhận thưởng ở màn Chuẩn bị.` : `Xong bước ${stepIndex + 1}/${def.steps.length}. Nhận thưởng ở màn Chuẩn bị.`,
        { kind: 'good', title: `${who} dặn`, icon: npcFace(def.npc), testid: 'chain-toast', duration: 2600 })
    }))
    offs.push(app.bus.on('tem.gained', ({ eventId, n, today, cap } = {}) => {
      const ev = app.data.EVENTS && app.data.EVENTS[eventId]
      if (!ev || !n) return
      const full = cap && today >= cap
      app.toast(`+${n} ${ev.currencyName}` + (full ? ` · ${M.eventDailyCap.replace('{n}', String(cap)).replace('{currency}', ev.currencyName)}` : ` (hôm nay ${today}/${cap})`),
        { kind: 'good', icon: icon('phan_trang'), testid: 'tem-toast', duration: 1600 })
    }))
    // Đầu ca: nhắc sự kiện ngày / Phiếu Chợ Sớm đang áp dụng
    {
      const sh = app.state.shift
      const mods = sh && sh.mods
      if (mods && sh.t < 2) {
        const de = mods.dayEvent && app.data.DAY_EVENTS && app.data.DAY_EVENTS[mods.dayEvent.id]
        if (de) {
          const ch = mods.dayEvent.choice && de.choice ? ` Đã ${de.choice.label.toLocaleLowerCase('vi-VN')}.` : ''
          app.toast(de.desc + ch, { title: de.name, kind: 'info', icon: icon(de.icon || de.id), testid: 'day-event-toast', duration: 3200 })
        }
        if (mods.cogsMul && mods.cogsMul < 1) app.toast(M.couponActive, { kind: 'good', icon: icon('phieu_cho_som'), duration: 2600 })
      }
    }
    offs.push(app.bus.on('ui.tab', ({ tab } = {}) => { if (tab && tab !== active) showTab(tab) }))

    // ---------- Phàn nàn ----------
    let complaintOpen = false
    function checkComplaint() {
      if (complaintOpen || app.modalOpen()) return
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
      const says = (() => {
        try {
          return app.data.makeLine('complaint', {
            persona: personaObj(app.ctx, customer.persona), region: customer.region, rand: Math.random,
            vars: { gender: customer.gender, name: customer.name, mon: items[0] && R[items[0].line.recipeId] ? R[items[0].line.recipeId].name : '' }
          })
        } catch { return '' }
      })()
      app.sound('error')
      const result = await app.modal({
        title: S.screens.complaint,
        testid: 'complaint-modal',
        render: close => {
          let apology = null
          const step2 = h('div', { class: 'complaint-step', hidden: true },
            h('p', { class: 'modal-text' }, 'Giờ xử lý sao cho khách vui lòng?'),
            h('div', { class: 'modal-actions' },
              h('button', { class: 'btn btn-primary', type: 'button', testid: 'complaint-remake', onclick: () => close({ apology, action: 'remake' }) }, S.buttons.remake),
              h('button', { class: 'btn btn-secondary', type: 'button', testid: 'complaint-refund', onclick: () => close({ apology, action: 'refund' }) }, `${S.buttons.refund} (${formatVND(refund)})`)))
          const step1 = h('div', { class: 'complaint-step' },
            h('p', { class: 'modal-text' }, 'Chọn câu nói với khách:'),
            h('div', { class: 'choice-list' }, aps.map(a => h('button', {
              class: 'choice', type: 'button', testid: 'complaint-apology-' + a.i,
              onclick: () => { apology = a.i; step1.hidden = true; step2.hidden = false }
            }, a.text))))
          return h('div', { class: 'complaint' },
            h('div', { class: 'npc-talk' }, svgBox(face(customer.persona, 'gian', customer.gender), 'npc-face'),
              h('div', { class: 'bubble' }, h('b', null, customer.name), h('p', null, says || 'Món này không đúng rồi!'))),
            h('ul', { class: 'complaint-items' }, items.map(it => {
              const r = R[it.line.recipeId]
              return h('li', null, (it.kind === 'sai_mon' ? 'Sai món, khách gọi: ' : 'Món hỏng: ') + `${it.line.qty} × ${r ? r.name : it.line.recipeId}`)
            })),
            step1, step2)
        }
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
      if (ended) return
      if (!isShiftOver(app.state)) { overSince = 0; return }
      if (!overSince) { overSince = now; return }
      if (now - overSince < END_DELAY_MS || sheetShowing || sheetQueue.length || app.modalOpen()) return
      ended = true
      const summary = endShift(app.state, app.ctx)
      app.saveNow({ backup: true })
      app.go('summary', { summary })
    }

    paintTabs()
    renderStreet()
    paintProgress()

    return {
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
        checkComplaint()
        checkEnd(performance.now())
      },
      unmount() {
        destroyed = true
        for (const off of offs) off()
        if (app.switchTab === showTab) app.switchTab = null
        counter.unmount()
        if (kitchen && kitchen.unmount) { try { kitchen.unmount() } catch (err) { console.error(err) } }
      }
    }
  }
}

// Phiếu chấm từng khách: trượt lên 2 giây, không chặn thao tác.
export function renderScoreSheet(app, sheet) {
  const S = app.data.STRINGS
  const counterErr = sheet.counterErrors || []
  const kitchenErr = sheet.kitchenErrors || []
  const orderBad = counterErr.some(c => ORDER_CODES.includes(c))
  const totalBad = counterErr.some(c => TOTAL_CODES.includes(c))
  const changeBad = counterErr.some(c => CHANGE_CODES.includes(c))
  const kitchenBad = kitchenErr.length > 0 || (sheet.dishes || []).some(d => d.grade === 'hong' || d.grade === 'kem')
  const waitBad = (sheet.penalties || []).some(p => p.source === 'cho')
  const ratio = sheet.waitRatio
  const speed = ratio === null || ratio === undefined ? '' : (ratio <= 0.5 ? S.speedLabels.nhanh : (ratio <= 0.75 ? S.speedLabels.on : S.speedLabels.cham))
  const row = (label, bad, extra = '') => h('li', { class: bad ? 'bad' : 'ok' },
    h('span', null, label), h('b', null, (bad ? 'Sai' : 'Đạt') + (extra ? ' · ' + extra : '')))
  const labels = []
  if (counterErr.length) labels.push(h('span', { class: 'err-tag counter' }, S.labels.counterError))
  if (kitchenErr.length || kitchenBad) labels.push(h('span', { class: 'err-tag kitchen' }, S.labels.kitchenError))
  const errNames = [...counterErr, ...kitchenErr].map(c => S.errors[c] || c)
  return h('div', { class: 'score-sheet', testid: 'score-sheet', dataset: { customerId: sheet.customerId, stars: sheet.stars }, 'aria-live': 'polite' },
    h('div', { class: 'ss-head' },
      h('b', null, sheet.name),
      h('span', { class: 'ss-stars', 'aria-label': sheet.stars + ' sao' }, starString(sheet.stars))),
    sheet.tutorial ? h('div', { class: 'muted small' }, S.messages.tutorialNoPenalty) : null,
    h('ul', { class: 'ss-rows' },
      row('Order', orderBad),
      row('Báo tổng', totalBad),
      row('Thối tiền', changeBad),
      row('Bếp', kitchenBad, (sheet.dishes || []).map(d => S.grades[d.grade] || '').filter(Boolean).join(', ')),
      row('Thời gian chờ', waitBad, speed)),
    labels.length ? h('div', { class: 'ss-tags' }, labels) : null,
    errNames.length ? h('div', { class: 'ss-errors small' }, errNames.join(' · ')) : null,
    sheet.tip > 0 ? h('div', { class: 'ss-tip' }, 'Tip: +' + formatVND(sheet.tip)) : null,
    sheet.review ? h('p', { class: 'ss-review' }, '“' + sheet.review + '”') : null)
}

