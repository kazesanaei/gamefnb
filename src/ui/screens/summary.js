// Màn Tổng kết ca: sổ lãi lỗ, két, lỗi quầy/bếp, sao, danh tiếng, thạo món, review, Mẹo của Dì Sáu.
// M3: thẻ "Tình huống trong ca" (lựa chọn và kết quả), dòng "Khách quen trả nợ", nhắc Sổ tay nghề đủ nhóm.
// M4: dòng "Tiền từ sự kiện" và "Phạt, chi sự kiện" trong sổ lãi lỗ, các khoản tiền sự kiện trong thẻ tình huống.
import { h, svgBox } from '../dom.js'
import { DI_SAU, icon } from '../art.js'
import { averageRating } from '../../core/scoring.js'
import { masteryLevel } from '../../core/mastery.js'
import { formatVND, formatStars, starString, signedVND } from '../format.js'
import { questList, questDef } from '../../core/quests.js'
import { chainStatus } from '../../core/chains.js'
import { dayEventInfo, dayEventEffects, eventsOverview } from '../../core/events.js'
import { progressBar } from '../components/meta-ui.js'
import { chainTitle } from '../components/chain-card.js'
import { dayEffectLines, forecastCustomers, dayEventWarnLine, choiceCostText } from './prep.js'
import { notebookBadge } from '../../core/notebook.js'

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
      // khách trả bằng ảnh chuyển khoản giả bị bắt là làm đúng: tách khỏi số khách bỏ về
      h('p', { class: 'muted' }, `${SM.served}: ${n(sum.served)} · ${SM.lost}: ${Math.max(0, n(sum.lost) - n(sum.scamCaught))}` +
        (n(sum.scamCaught) ? ` · Bắt được ảnh chuyển khoản giả: ${n(sum.scamCaught)}` : '') +
        (n(sum.missed) ? ` · ${SM.missed}: ${n(sum.missed)}` : ''))))
    el.appendChild(h('div', { class: 'npc-talk' }, svgBox(good ? DI_SAU.tu_hao : DI_SAU.tiec, 'npc-face'),
      h('div', { class: 'bubble npc-bubble' }, h('b', null, 'Dì Sáu'), h('p', null, talk))))

    // Sổ lãi lỗ: các dòng cộng lại đúng bằng lãi.
    const rows = [
      [SM.cashSales, n(sum.cashSales), 'plus'],
      [SM.qrSales, n(sum.qrSales), 'plus'],
      [SM.tips, n(sum.tips), 'plus'],
      // M3: tiền khách quen trả nợ (tình huống ghi nợ ở ca trước)
      ...(n(sum.debtIn) ? [['Khách quen trả nợ', n(sum.debtIn), 'plus']] : []),
      // M4: tiền thưởng từ sự kiện ngày / tình huống trong ca
      [SM.eventIn || 'Tiền từ sự kiện', n(sum.eventIn), 'plus'],
      [SM.drawerDiff, n(sum.drawerDiff), 'signed'],
      [SM.cogs, n(sum.cogs), 'minus'],
      [SM.waste, n(sum.waste), 'minus'],
      [SM.refunds, n(sum.refunds), 'minus'],
      // M4: phạt, chi phí, tiền mua vì sự kiện (đã trừ Tiền quán lúc phát sinh)
      [SM.eventOut || 'Phạt, chi sự kiện', n(sum.eventOut), 'minus'],
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
      // M4: nhắc luật tip một mức (viết theo hướng thưởng)
      S.labels.tipRule ? h('p', { class: 'small muted', testid: 'summary-tip-rule' }, S.labels.tipRule + '.') : null,
      h('p', { class: 'small muted' }, `${S.labels.wallet} hiện có: ${formatVND(state.wallet)}`)))

    // M3: Tình huống trong ca và sổ ghi nợ
    // (bản rút gọn trong lịch sử chỉ có id + lựa chọn: tra tên từ dữ liệu)
    const incidents = (sum.incidents || []).map(r => {
      if (r.name) return r
      const d = app.data.INCIDENTS && app.data.INCIDENTS[r.id]
      const c = d && (d.choices || []).find(x => x.id === r.choice)
      return { ...r, name: d ? d.name : r.id, label: c ? c.label.replace(/\{\w+\}/g, '').replace(/,\s*$/, '') : r.choice, text: '' }
    })
    const debtNotes = sum.debtNotes || []
    // M4: tiền sự kiện của ca (giải thưởng, phạt, chi phí) — mỗi khoản một dòng, kèm lời Dì Sáu khi chạm trần ngày.
    // Tiền của tình huống trong ca (source 'incident') đã ghi trong thẻ tình huống nên không lặp lại.
    const eventNotes = (sum.eventNotes || []).filter(x => x && x.source !== 'incident' && (n(x.money) || x.text || x.fx))
    if (incidents.length || debtNotes.length || eventNotes.length) {
      el.appendChild(h('section', { class: 'card sum-incident', testid: 'summary-incident', dataset: {
        incident: incidents[0] ? incidents[0].id : '', choice: incidents[0] ? incidents[0].choice : '' } },
      h('h2', { class: 'card-title' }, incidents.length && eventNotes.length ? 'Tình huống và sự kiện trong ca'
        : incidents.length || debtNotes.length ? 'Tình huống trong ca' : 'Sự kiện trong ca'),
      incidents.map(r => h('div', { class: 'sum-incident-item' },
        h('b', null, r.name),
        h('p', { class: 'small' }, 'Bạn chọn: ' + r.label + (r.safe ? ' (cách an toàn)' : '')),
        h('p', { class: 'small' }, r.text),
        h('ul', { class: 'sum-incident-fx small' }, incidentLines(r).map(t => h('li', null, t))))),
      eventNotes.length ? h('ul', { class: 'sum-incident-fx small sum-event-notes', testid: 'summary-event-money' }, eventNotes.map(x =>
        h('li', { dataset: { event: x.id || '', money: String(n(x.money)) } },
          (x.name ? h('b', null, x.name + ': ') : null),
          [n(x.money) ? signedVND(n(x.money)) : '', x.fx || ''].filter(Boolean).join(', ') || 'không tính tiền',
          x.text ? ' · ' + x.text : ''))) : null,
      debtNotes.map(d => h('p', { class: ['small', 'sum-debt', d.kind === 'tra' ? 'is-paid' : 'is-unpaid'], testid: 'summary-debt' }, d.text)),
      h('p', { class: 'small muted' }, 'Tiền của tình huống và sự kiện đã nằm trong sổ lãi lỗ ở trên.')))
    }

    // M4: quà hàng hiếm cuối ca (khách lạ, Giỏ chợ) — không phải tiền nên không nằm trong sổ lãi lỗ
    const rareNotes = sum.rareNotes || sum.rare || []
    if (rareNotes.length) {
      el.appendChild(h('section', { class: 'card sum-rare', testid: 'summary-rare' },
        h('h2', { class: 'card-title' }, 'Hàng hiếm cuối ca'),
        rareNotes.map(x => h('div', { class: 'sum-incident-item', dataset: { kind: x.kind || '' } },
          h('b', null, x.kind === 'khach_la' ? `${x.name} (khách lạ${x.stars ? `, ${x.stars} sao` : ''})` : (x.name || 'Giỏ chợ')),
          x.text ? h('p', { class: 'small' }, x.text) : null,
          h('ul', { class: 'sum-incident-fx small' },
            (x.got || []).filter(g => g.n > 0).map(g => h('li', null, `+${g.n} phần ${g.name}`)),
            x.fragment && x.fragment.n > 0 ? h('li', null, `+${x.fragment.n} mảnh công thức ${x.fragment.name}`) : null,
            x.spoons > 0 ? h('li', null, `+${x.spoons} Muỗng Vàng (kho hoặc mức hôm nay đã đủ)`) : null))),
        h('p', { class: 'small muted' }, rareNotes.some(x => (x.got || []).some(g => g.n > 0))
          ? 'Hàng hiếm cất vào kho, xem ở màn Chuẩn bị. Không tính vào Tiền quán.'
          : 'Hàng hiếm và Muỗng Vàng không tính vào Tiền quán.')))
    }

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

    // M3: Sổ tay nghề có nhóm đủ thẻ chờ nhận thưởng
    const nbReady = notebookBadge(state, app.ctx)
    if (nbReady > 0) {
      el.appendChild(h('section', { class: 'card tip-card', testid: 'summary-notebook' },
        h('h2', { class: 'card-title' }, 'Sổ tay nghề'),
        h('p', null, `Đủ thẻ ${nbReady} nhóm Mẹo nghề! Mở Sổ tay nghề ở màn Chuẩn bị để nhận danh hiệu và Muỗng Vàng.`)))
    }

    // Ngày mai: sự kiện ngày báo trước (tính theo ngày game kế tiếp)
    const tomorrow = dayEventInfo(state, state.day, app.ctx)
    if (tomorrow) {
      const lines = dayEffectLines(dayEventEffects(tomorrow, app.ctx), app.data, state)
      el.appendChild(h('section', { class: 'card day-event-card is-tomorrow', testid: 'summary-day-event', dataset: { event: tomorrow.id } },
        h('div', { class: 'day-ev-head' }, svgBox(icon(tomorrow.icon || tomorrow.id), 'day-ev-icon'),
          h('div', null, h('small', { class: 'muted' }, 'Báo trước'), h('b', { class: 'day-ev-name' }, S.meta.tomorrowEvent.replace('{name}', tomorrow.name)))),
        h('p', { class: 'small' }, tomorrow.desc),
        lines.length ? h('ul', { class: 'day-ev-effects' }, lines.map(t => h('li', null, t))) : null,
        dayEventWarnLine(state, tomorrow, app.data) ? h('p', { class: 'small day-ev-warn' }, dayEventWarnLine(state, tomorrow, app.data)) : null,
        tomorrow.choice ? h('p', { class: 'small day-ev-tip' }, tomorrow.choice.free
          ? `Bạt che mưa sẽ tự căng, không tốn tiền.`
          : `Có thể chọn "${tomorrow.choice.label}" (${choiceCostText(tomorrow.choice)}) ở màn Chuẩn bị.`) : null))
    }
    // Sao trung bình của 30 lượt gần nhất (khác "Sao ca này" ở trên); dưới 5 lượt là số tạm tính (đệm 4 sao)
    const fewRatings = (state.ratings || []).length < 5
    el.appendChild(h('p', { class: 'center muted', testid: 'summary-tomorrow' },
      `Ngày mai (ngày ${state.day}): khoảng ${forecastCustomers(state, app.ctx, tomorrow)} khách · Sao trung bình (30 lượt gần nhất) ★ ${formatStars(averageRating(state.ratings))}` +
      (fewRatings ? ' · tính tạm, cần đủ 5 lượt' : '')))
    // M3: có bản mới của game → nút Tải lại (ca đã kết thúc nên tải lại an toàn)
    if (typeof app.updateSlot === 'function') el.appendChild(app.updateSlot())
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

// Các dòng hiệu ứng của một tình huống đã xử lý (tiền, giá vốn, danh tiếng, khách thêm, ghi nợ, sao).
// M4: tiền thưởng, tiền mất, tiền chi (sổ sự kiện), phần Dì Sáu đỡ giùm, hàng hiếm, mảnh công thức, bếp chậm hơn.
export function incidentLines(r) {
  const out = []
  if (r.money > 0) out.push('Tiền bán: +' + formatVND(r.money))
  if (r.gain > 0) out.push('Tiền thưởng: +' + formatVND(r.gain))
  if (r.cost > 0) out.push('Giá vốn: −' + formatVND(r.cost))
  if (r.fine > 0) out.push('Mất tiền: −' + formatVND(r.fine))
  if (r.spend > 0) out.push('Chi mua: −' + formatVND(r.spend))
  if (r.spared > 0) out.push(`Dì Sáu đỡ giùm ${formatVND(r.spared)}`)
  if (r.refund > 0) out.push('Hoàn cho khách: −' + formatVND(r.refund))
  if (r.rep > 0) out.push(`Danh tiếng: +${r.rep}`)
  for (const x of r.rare || []) out.push(`Hàng hiếm: +${x.n} phần ${x.name}`)
  if (r.fragment) out.push(`Mảnh công thức ${r.fragment.name}: +${r.fragment.n}`)
  if (r.spoons > 0) out.push(`Kho hoặc mức hàng hiếm hôm nay đã đủ: +${r.spoons} Muỗng Vàng`)
  if (r.waitMul && r.waitMul < 1) out.push('Bếp chậm hơn một chút tới cuối ca')
  if (r.bonus > 0) out.push(`Ca sau thêm ${r.bonus} khách`)
  if (r.debt) out.push(`Ghi sổ nợ: ${r.debt.name} ${formatVND(r.debt.amount)}`)
  if (r.starLoss > 0) out.push(`Khách phật ý: −${r.starLoss} sao`)
  if (!out.length) out.push('Không tốn gì')
  return out
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
      // chuỗi sự kiện nhận ở màn sự kiện; chuỗi thường ở màn Chuẩn bị
      const where = c.eventId ? 'nhận thưởng ở màn sự kiện' : 'nhận thưởng ở màn Chuẩn bị'
      rows.push(h('div', { class: 'sum-meta-block', testid: c.eventId ? 'summary-event-chain' : 'summary-chain' },
        h('h3', null, `${chainTitle(c)}: ${c.claimable.length ? `xong ${c.claimable.length} bước, ${where}` : `bước ${c.step + 1}/${c.total}`}`),
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
