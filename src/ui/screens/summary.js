// Màn Tổng kết ca: sổ lãi lỗ, két, lỗi quầy/bếp, sao, danh tiếng, thạo món, review, Mẹo của Dì Sáu.
import { h, svgBox } from '../dom.js'
import { DI_SAU, icon } from '../art.js'
import { averageRating } from '../../core/scoring.js'
import { masteryLevel } from '../../core/mastery.js'
import { formatVND, formatStars, starString, signedVND } from '../format.js'
import { questList, questDef } from '../../core/quests.js'
import { chainStatus } from '../../core/chains.js'
import { dayEventInfo, eventsOverview } from '../../core/events.js'
import { progressBar } from '../components/meta-ui.js'
import { dayEffectLines, forecastCustomers } from './prep.js'

export default {
  mount(root, app, params = {}) {
    const S = app.data.STRINGS
    const SM = S.summary
    const D = app.data.DIALOGUE
    const state = app.state
    const hist = state.history || []
    const sum = params.summary || hist[hist.length - 1] || null
    const el = h('section', { class: 'summary-screen', testid: 'summary' })
    root.appendChild(el)

    if (!sum) {
      el.appendChild(h('p', null, 'Chưa có ca nào để tổng kết.'))
      el.appendChild(nextBtn())
      return { unmount() {} }
    }

    const n = v => Math.round(Number(v) || 0)
    const profit = n(sum.profit)
    const avg = Number(sum.avgStars) || 0
    const good = profit > 0 && (avg === 0 || avg >= 3.5)
    const talk = good ? pick(D.diSau.praise) : pick(D.diSau.regret)
    const drawerStart = sum.drawerExpected !== undefined ? n(sum.drawerExpected) - n(sum.cashSales) : null

    el.appendChild(h('header', { class: 'sum-head' },
      h('h1', null, `${SM.title} · Ngày ${sum.day}`),
      h('p', { class: 'muted' }, `${SM.served}: ${n(sum.served)} · ${SM.lost}: ${n(sum.lost)}` + (n(sum.missed) ? ` · ${SM.missed}: ${n(sum.missed)}` : ''))))
    el.appendChild(h('div', { class: 'npc-talk' }, svgBox(good ? DI_SAU.tu_hao : DI_SAU.tiec, 'npc-face'),
      h('div', { class: 'bubble npc-bubble' }, h('b', null, 'Dì Sáu'), h('p', null, talk))))

    // Sổ lãi lỗ: các dòng cộng lại đúng bằng lãi.
    const rows = [
      [SM.cashSales, n(sum.cashSales), 'plus'],
      [SM.qrSales, n(sum.qrSales), 'plus'],
      [SM.tips, n(sum.tips), 'plus'],
      [SM.drawerDiff, n(sum.drawerDiff), 'signed'],
      [SM.cogs, n(sum.cogs), 'minus'],
      [SM.waste, n(sum.waste), 'minus'],
      [SM.refunds, n(sum.refunds), 'minus'],
      [SM.fixedCost, n(sum.fixedCost), 'minus']
    ]
    const ledger = h('table', { class: 'ledger' }, h('tbody', null,
      rows.map(([label, v, kind]) => h('tr', { class: kind === 'minus' && v ? 'neg' : '' },
        h('td', null, label),
        h('td', { class: 'num' }, kind === 'minus' ? (v ? '−' + formatVND(v) : formatVND(0)) : (kind === 'signed' ? signedVND(v) : formatVND(v))))),
      h('tr', { class: ['total', profit >= 0 ? 'pos' : 'neg'] },
        h('td', null, profit >= 0 ? SM.profit : SM.loss),
        h('td', { class: 'num', testid: 'summary-profit', dataset: { amount: profit } }, signedVND(profit)))))
    const info = [
      [SM.undercharge, n(sum.undercharge)], [SM.overchange, n(sum.overchange)],
      ['Làm tròn cho khách', n(sum.rounding)], [SM.fakeQrLoss, n(sum.fakeQrLoss)]
    ].filter(([, v]) => v > 0)
    el.appendChild(h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Sổ lãi lỗ ca'),
      ledger,
      info.length ? h('ul', { class: 'ledger-info small' },
        info.map(([label, v]) => h('li', null, `${label}: ${formatVND(v)}`)),
        h('li', { class: 'muted' }, 'Các khoản trên đã nằm trong tiền két và lãi.')) : null,
      n(sum.loanRepaid) ? h('p', { class: 'small' }, `Trả nợ Dì Sáu: ${formatVND(sum.loanRepaid)}`) : null,
      h('p', { class: 'small muted' }, `${S.labels.wallet} hiện có: ${formatVND(state.wallet)}`)))

    // Két
    if (drawerStart !== null) {
      const diff = n(sum.drawerDiff)
      el.appendChild(h('section', { class: 'card' },
        h('h2', { class: 'card-title' }, 'Chốt két'),
        h('table', { class: 'ledger' }, h('tbody', null,
          tr('Két đầu ca (quỹ tiền lẻ)', formatVND(drawerStart)),
          tr('Thu tiền mặt', '+' + formatVND(sum.cashSales)),
          tr(SM.drawerExpected, formatVND(sum.drawerExpected)),
          tr(SM.drawerActual, formatVND(sum.drawerActual)),
          h('tr', { class: ['total', diff === 0 ? 'pos' : 'neg'] }, h('td', null, SM.drawerDiff), h('td', { class: 'num', testid: 'summary-drawer-diff' }, signedVND(diff))))),
        h('p', { class: 'small muted' }, diff === 0 ? 'Két khớp từng đồng. Giỏi lắm!'
          : (diff < 0 ? 'Két hụt: có lần thối dư hoặc làm tròn cho khách.' : 'Két dư: có lần thối thiếu mà khách không biết.'))))
    }

    // Lỗi quầy / lỗi bếp
    const errList = (obj, emptyText) => {
      const keys = Object.keys(obj || {})
      if (!keys.length) return h('p', { class: 'muted small' }, emptyText)
      return h('ul', { class: 'err-list' }, keys.map(k => h('li', null, h('span', null, S.errors[k] || k), h('b', null, '×' + obj[k]))))
    }
    const advice = sum.advice && sum.advice.text ? sum.advice.text : null
    el.appendChild(h('section', { class: 'card err-card' },
      h('div', { class: 'err-cols' },
        h('div', null, h('h3', null, S.labels.counterError), errList(sum.counterErrors, 'Không có lỗi nào')),
        h('div', null, h('h3', null, S.labels.kitchenError), errList(sum.kitchenErrors, 'Không có lỗi nào'))),
      advice ? h('p', { class: 'advice', testid: 'summary-advice' }, h('b', null, 'Lời khuyên: '), advice) : null))

    // Sao, danh tiếng, thạo món
    const levels = app.data.BALANCE.masteryLevels
    el.appendChild(h('section', { class: 'card' },
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('span', { class: 'stat-label' }, SM.avgStars), h('b', { class: 'stat-value', testid: 'summary-stars' }, avg ? '★ ' + formatStars(avg) : '—')),
        h('div', { class: 'stat' }, h('span', { class: 'stat-label' }, SM.reputationGain), h('b', { class: 'stat-value' }, '+' + n(sum.reputationGain))),
        h('div', { class: 'stat' }, h('span', { class: 'stat-label' }, S.labels.reputation), h('b', { class: 'stat-value' }, String(state.reputation)))),
      h('h3', null, S.labels.mastery),
      h('ul', { class: 'mastery-list' }, Object.keys(state.recipes).filter(id => app.data.RECIPES[id]).map(id => {
        const r = app.data.RECIPES[id]
        const p = state.recipes[id]
        const lv = masteryLevel(p, levels)
        const next = levels[lv]
        return h('li', null, svgBox(icon(r.icon || id), 'dish-icon tiny'), h('span', null, r.name),
          h('b', null, S.masteryLevels[lv] || lv), next !== undefined ? h('small', { class: 'muted' }, ` (${p.goodCooks}/${next} món ngon)`) : null)
      }))))

    // Review trong ca
    const reviews = (state.reviews || []).filter(r => r.day === sum.day && r.text).slice(-3)
    if (reviews.length) {
      el.appendChild(h('section', { class: 'card' },
        h('h2', { class: 'card-title' }, 'Khách nói gì'),
        h('ul', { class: 'review-list', testid: 'summary-reviews' }, reviews.map(r => h('li', null,
          h('div', null, h('b', null, r.name), ' ', h('span', { class: 'stars' }, starString(r.stars))),
          h('p', null, '“' + r.text + '”'))))))
    }

    // Mẹo của Dì Sáu
    const tips = Array.isArray(app.data.TIPS) ? app.data.TIPS : []
    // thẻ vừa mở lúc kết ca (mới nhất trong tipsSeen) được ưu tiên; không lặp lại thẻ đã nằm trong "Lời khuyên"
    const lastSeen = tips.find(t => t.id === state.tipsSeen[state.tipsSeen.length - 1])
    const fresh = lastSeen && lastSeen.trigger === 'shift_end' ? lastSeen : null
    const adviceTip = sum.advice && sum.advice.tipId && !advice ? tips.find(t => t.id === sum.advice.tipId) : null
    const tip = fresh || adviceTip ||
      tips.find(t => t.trigger === 'shift_end' && state.tipsSeen.includes(t.id)) ||
      pick(tips.filter(t => state.tipsSeen.includes(t.id) && !(sum.advice && t.id === sum.advice.tipId)))
    if (tip) {
      el.appendChild(h('section', { class: 'card tip-card', testid: 'summary-tip' },
        h('h2', { class: 'card-title' }, SM.advice),
        h('div', { class: 'npc-talk compact' }, svgBox(DI_SAU.vui, 'npc-face small'),
          h('p', null, h('b', null, tip.title + ': '), tip.text))))
    }

    // M2: tiến độ Việc hôm nay, chuỗi nhiệm vụ, Tem sự kiện
    metaProgress(app, el)

    // Ngày mai: sự kiện ngày báo trước (tính theo ngày game kế tiếp)
    const tomorrow = dayEventInfo(state, state.day, app.ctx)
    if (tomorrow) {
      const lines = dayEffectLines(tomorrow.effects, app.data, state)
      el.appendChild(h('section', { class: 'card day-event-card is-tomorrow', testid: 'summary-day-event', dataset: { event: tomorrow.id } },
        h('div', { class: 'day-ev-head' }, svgBox(icon(tomorrow.icon || tomorrow.id), 'day-ev-icon'),
          h('div', null, h('small', { class: 'muted' }, 'Báo trước'), h('b', { class: 'day-ev-name' }, S.meta.tomorrowEvent.replace('{name}', tomorrow.name)))),
        h('p', { class: 'small' }, tomorrow.desc),
        lines.length ? h('ul', { class: 'day-ev-effects' }, lines.map(t => h('li', null, t))) : null,
        tomorrow.choice ? h('p', { class: 'small day-ev-tip' }, tomorrow.choice.free
          ? `Bạt che mưa sẽ tự căng, không tốn tiền.`
          : `Có thể chọn "${tomorrow.choice.label}" (${formatVND(tomorrow.choice.cost)}) ở màn Chuẩn bị.`) : null))
    }
    el.appendChild(h('p', { class: 'center muted' },
      `Ngày mai (ngày ${state.day}): khoảng ${forecastCustomers(state, app.ctx, tomorrow)} khách · Sao trung bình ★ ${formatStars(averageRating(state.ratings))}`))
    el.appendChild(nextBtn())

    function nextBtn() {
      return h('div', { class: 'sticky-foot' }, h('button', {
        class: 'btn btn-primary btn-big', type: 'button', testid: 'next-day',
        onclick: () => { app.sound('click'); app.saveNow(); app.go('prep') }
      }, SM.tomorrow))
    }
    return { unmount() {} }
  }
}

function tr(label, value) {
  return h('tr', null, h('td', null, label), h('td', { class: 'num' }, value))
}

function pick(arr) {
  return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : ''
}

// Tiến độ meta sau ca: Việc hôm nay (nhận ở màn Chuẩn bị), bước chuỗi đang làm, Tem sự kiện hôm nay.
function metaProgress(app, el) {
  const state = app.state
  const M = app.data.STRINGS.meta
  let nowInfo = null
  try { nowInfo = app.nowInfo() } catch { nowInfo = null }
  const ql = questList(state, app.ctx)
  const rows = []
  if (ql.quests.length) {
    const claim = ql.quests.filter(q => q.canClaim).length
    rows.push(h('div', { class: 'sum-meta-block', testid: 'summary-quests' },
      h('h3', null, M.quests + (claim ? ` · ${claim} việc chờ nhận thưởng` : '')),
      h('ul', { class: 'sum-quests' }, ql.quests.map(q => {
        const def = questDef(app.ctx, q.id) || {}
        const num = def.money ? `${formatVND(q.progress)}/${formatVND(q.target)}` : `${q.progress}/${q.target}`
        return h('li', { class: q.done ? 'is-done' : '' },
          h('span', { class: 'sq-text' }, (q.done ? '✓ ' : '') + q.text),
          h('span', { class: 'sq-num' }, num),
          progressBar(q.progress, q.target))
      })),
      claim || ql.chest.available ? h('p', { class: 'small muted' }, 'Nhận thưởng ở màn Chuẩn bị, mục Việc hôm nay.') : null))
  }
  if (nowInfo) {
    const chains = chainStatus(state, nowInfo, app.ctx).filter(c => !c.done || c.claimable.length)
    for (const c of chains) {
      rows.push(h('div', { class: 'sum-meta-block', testid: c.eventId ? 'summary-event-chain' : 'summary-chain' },
        h('h3', null, `${c.npcName ? c.npcName + ' dặn' : c.name}: ${c.claimable.length ? `xong ${c.claimable.length} bước, nhận thưởng ở màn Chuẩn bị` : `bước ${c.step + 1}/${c.total}`}`),
        c.done ? null : h('p', { class: 'small' }, c.text + (c.isCheck || c.gateLocked ? '' : ` (${c.progress}/${c.target})`))))
    }
    for (const ev of eventsOverview(state, nowInfo, app.ctx).filter(e => e.phase === 'dang_dien_ra')) {
      rows.push(h('div', { class: 'sum-meta-block', testid: 'summary-event' },
        h('h3', null, `${ev.name}: ${ev.tem} ${ev.currencyName}`),
        h('p', { class: 'small' }, `Hôm nay từ món ăn ${ev.temToday}/${ev.dailyCap} ${ev.currencyName}.`)))
    }
  }
  if (rows.length) el.appendChild(h('section', { class: 'card sum-meta' }, h('h2', { class: 'card-title' }, 'Việc và chuỗi nhiệm vụ'), rows))
}
