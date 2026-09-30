// Màn Chuẩn bị ca: thông tin ngày, Muỗng Vàng, lưới lối vào có chấm đỏ (Chợ Công Thức, Việc hôm nay, Điểm danh,
// Hộp thư, Sổ công thức, Sổ tay nghề, Cài đặt), sự kiện ngày và lựa chọn, Phiếu Chợ Sớm, thẻ sự kiện có thời hạn,
// chuỗi "Dì Sáu dặn", "Giấc mơ tiếp theo", thẻ "Hôm nay" (dự báo khách + thực đơn), Mẹo nghề đã mở (ngẫu nhiên),
// mượn Dì Sáu, nút "Mở hàng" luôn nhìn thấy (dính đáy màn).
// M3: thẻ nhắc sao lưu mỗi 7 ngày thật, nút "Có bản mới – Tải lại"; khách thêm nhờ ly trà "mở hàng", sổ ghi nợ khách quen.
// Vào màn: cập nhật meta theo ngày thật; lần đầu trong ngày thật (kể cả lần mở game đầu tiên) → bảng điểm danh.
import { h, svgBox } from '../dom.js'
import { DI_SAU, icon } from '../art.js'
import { startShift, customerCount } from '../../core/shift.js'
import { averageRating } from '../../core/scoring.js'
import { orderableRecipes } from '../../core/customer.js'
import { takeLoan, offerLoan } from '../../core/economy.js'
import { masteryLevel } from '../../core/mastery.js'
import { refreshMeta } from '../../core/meta.js'
import { checkinStatus } from '../../core/checkin.js'
import { questList } from '../../core/quests.js'
import { mailBadge } from '../../core/mail.js'
import { chainStatus } from '../../core/chains.js'
import { shopCatalog } from '../../core/shop.js'
import { eventsOverview, dayEventInfo, dayEventEffects, setDayEventChoice, setMarketCoupon, applyCustomerMods } from '../../core/events.js'
import { checkStageUp } from '../../core/progression.js'
import { formatVND, formatStars, formatMoneyShort } from '../format.js'
import { spoonPill, reasonText, progressBar, redDot, rewindNote, durationText } from '../components/meta-ui.js'
import { chainCard } from '../components/chain-card.js'
import { openCheckin } from '../components/checkin-popup.js'
import { phaseText } from './event.js'
import { GEAR_SVG } from './settings.js'
import { NOTEBOOK_SVG } from './notebook.js'
import { RECIPE_BOOK_SVG } from './recipe-book.js'
import { backupDue } from '../../core/save.js'
import { notebookBadge, randomSeenTip } from '../../core/notebook.js'
import { incidentBonusFor, pendingDebts } from '../../core/incidents.js'

function pickRandom(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null
}

// Hiệu ứng của sự kiện ngày thành các dòng ngắn cho người chơi.
export function dayEffectLines(effects, data, state = null) {
  const e = effects || {}
  const R = data.RECIPES || {}
  const out = []
  const pct = v => Math.round(Math.abs(v - 1) * 100) + '%'
  if (e.customerMul && e.customerMul < 1) out.push(`Khách ít hơn khoảng ${pct(e.customerMul)}`)
  if (e.customerMul && e.customerMul > 1) out.push(`Khách đông hơn khoảng ${pct(e.customerMul)}, ca dài hơn`)
  if (e.extraCustomers) out.push(`Thêm ${e.extraCustomers} khách`)
  if (e.patienceMul && e.patienceMul > 1) out.push(`Khách chịu chờ lâu hơn ${pct(e.patienceMul)}`)
  if (e.tipMul && e.tipMul > 1) out.push(`Tiền tip nhiều hơn khoảng ${pct(e.tipMul)}`)
  // chỉ kể món đang bán (có state thì lọc món đã sở hữu)
  const hot = Object.keys(e.recipeWeight || {}).filter(id => R[id] && (!state || (state.recipes && state.recipes[id]))).map(id => R[id].name)
  if (hot.length) out.push(`${hot.join(', ')} được gọi nhiều gấp đôi`)
  return out
}

// Số khách dự báo sau sự kiện ngày (không trừ tiền, không dùng phiếu). Đã chọn Căng bạt (hoặc tự căng nhờ Bạt che mưa)
// thì dùng hiệu ứng của lựa chọn, giống dòng hiệu ứng trên thẻ (dayEventEffects).
// M3: ly trà "mở hàng" tặng ở ca trước → thêm khách (trong trần 8), giống startShift.
export function forecastCustomers(state, ctx, info) {
  return forecastDetail(state, ctx, info).n
}

// Dự báo chi tiết: { n, base (chưa tính ly trà mở hàng), added (khách thêm thật sự vào được), rep (danh tiếng thay thế
// khi ca đã đủ khách) } — giống startShift, để màn Chuẩn bị không ghi "thêm 1 khách" khi ca đã đủ trần.
export function forecastDetail(state, ctx, info) {
  let n = customerCount(state, ctx, state.day)
  if (info) {
    const eff = dayEventEffects(info, ctx)
    n = applyCustomerMods(n, { customerMul: eff.customerMul ?? 1, extraCustomers: eff.extraCustomers || 0 }, ctx)
  }
  const base = n
  const bonus = incidentBonusFor(state, state.day)
  if (bonus > 0 && n < 8) n = Math.min(8, n + bonus)
  const added = n - base
  const b = state.incidents && state.incidents.bonus
  const rep = bonus > 0 && added === 0 && b ? Math.max(0, Math.round(Number(b.rep) || 0)) : 0
  return { n, base, added, rep }
}

// Lời Dì Sáu lúc chuẩn bị ca: ngày 1 là lời hướng dẫn; có sự kiện ngày thì nói theo sự kiện (không nói "trời đẹp"
// khi trời mưa); còn lại bốc câu thường.
export function prepTalk(state, D, dayEv) {
  if (state.day === 1) return D.diSau.tutorial.order
  const byEvent = dayEv && D.diSau.dayEvent && D.diSau.dayEvent[dayEv.id]
  return pickRandom(byEvent && byEvent.length ? byEvent : D.diSau.shiftStart)
}

// Lần mở đầu tiên (ngày 1, chưa bán ca nào): chỉ hiện điều cần cho ca đầu, lời hướng dẫn của Dì Sáu lên trên.
export function isFirstVisit(state) {
  return state.day === 1 && !((state.stats && state.stats.shiftsPlayed) > 0) && !(state.history && state.history.length)
}

export default {
  mount(root, app) {
    const S = app.data.STRINGS
    const M = S.meta
    const D = app.data.DIALOGUE
    const el = h('section', { class: 'prep-screen', testid: 'screen-prep' })
    root.appendChild(el)
    let destroyed = false
    let lastDayKey = ''
    const talk = prepTalk(app.state, D, dayEventInfo(app.state, app.state.day, app.ctx))
    let shownTip = null        // Mẹo nghề hiện ở màn (chọn ngẫu nhiên 1 lần mỗi lần vào màn)

    function refresh() {
      const nowInfo = app.nowInfo()
      let res = null
      try { res = refreshMeta(app.state, nowInfo, app.ctx) } catch (err) { console.error(err) }
      lastDayKey = nowInfo.dayKey
      app.save()
      return { nowInfo, res }
    }

    function render() {
      if (destroyed) return
      const state = app.state
      const nowInfo = app.nowInfo()
      el.textContent = ''
      const avg = averageRating(state.ratings)
      const menu = orderableRecipes(state, app.ctx)
      const levels = app.data.BALANCE.masteryLevels
      const dayEv = dayEventInfo(state, state.day, app.ctx)
      const forecast = forecastCustomers(state, app.ctx, dayEv)

      // Đầu màn: tên xe, Muỗng Vàng, ngày, Tiền quán / danh tiếng / sao
      el.appendChild(h('header', { class: 'prep-head' },
        h('div', { class: 'prep-toprow' },
          h('div', { class: 'prep-shop' }, state.shopName),
          spoonPill(state.goldSpoons || 0, 'prep-spoons')),
        h('div', { class: 'prep-dayrow' },
          h('h1', { class: 'prep-day', testid: 'prep-day' }, `Ngày ${state.day}`),
          h('div', { class: 'prep-sub' }, S.screens.prep + ' · ' + S.chang[state.chang || 1])),
        h('div', { class: 'prep-stats' },
          // từ 1 triệu ghi gọn "1,16tr" (không ngắt dòng giữa con số), số đầy đủ ở title/aria-label
          stat(S.labels.wallet, formatMoneyShort(state.wallet), 'prep-wallet', { title: formatVND(state.wallet), amount: state.wallet }),
          stat(S.labels.reputation, String(state.reputation)),
          // sao trung bình của 30 đánh giá gần nhất; dưới 5 lượt là số tạm (đệm 4 sao)
          stat(S.labels.rating, '★ ' + formatStars(avg), 'prep-rating', {
            note: (state.ratings || []).length < 5 ? 'tạm tính' : '30 lượt gần nhất',
            title: (state.ratings || []).length < 5 ? 'Tính tạm, cần đủ 5 lượt đánh giá' : 'Trung bình 30 lượt đánh giá gần nhất'
          }))))

      // Lưới lối vào (M3): 7 ô biểu tượng có chấm đỏ
      el.appendChild(navGrid(state, nowInfo))

      const rw = rewindNote(app, nowInfo)
      if (rw) el.appendChild(rw)

      // M3: có bản mới của game → nút Tải lại (chỉ ở màn Chuẩn bị/Tổng kết, không bao giờ giữa ca)
      if (typeof app.updateSlot === 'function') el.appendChild(app.updateSlot())
      // M3: đã 7 ngày thật chưa sao lưu → thẻ nhắc, bấm để mở Cài đặt ở mục Sao lưu
      if (backupDue(state, app.now())) {
        el.appendChild(h('button', { class: 'backup-reminder', type: 'button', testid: 'backup-reminder', onclick: () => go('settings', { focus: 'backup' }) },
          svgBox(icon('ruong'), 'backup-reminder-icon'),
          h('span', { class: 'backup-reminder-text' },
            h('b', null, 'Đã lâu chưa sao lưu'),
            h('small', null, 'Chép mã sao lưu để giữ tiến trình khi đổi máy hoặc trình duyệt dọn dữ liệu.')),
          h('span', { class: 'backup-reminder-go', 'aria-hidden': 'true' }, '›')))
      }

      const first = isFirstVisit(state)
      const talkEl = h('div', { class: 'npc-talk', testid: 'prep-talk' }, svgBox(DI_SAU.vui, 'npc-face'),
        h('div', { class: 'bubble npc-bubble' }, h('b', null, 'Dì Sáu'), h('p', null, talk)))
      // Chuỗi nhiệm vụ (không gồm chuỗi sự kiện: nằm trong thẻ sự kiện)
      const chains = chainStatus(state, nowInfo, app.ctx).filter(c => !c.eventId && (!c.done || c.claimable.length))
      chains.sort((a, b) => (b.main ? 1 : 0) - (a.main ? 1 : 0))
      const chainEls = chains.map((c, i) => chainCard(app, c, { testid: i === 0 ? 'chain-card' : 'chain-card-' + c.id, compact: true, onChange: render }))

      // Lần mở đầu tiên: lời hướng dẫn của Dì Sáu và "Dì Sáu dặn: Phục vụ khách đầu tiên" lên ngay dưới lưới lối vào;
      // chưa hiện "Giấc mơ tiếp theo" (mở dần sau ca đầu)
      if (first) {
        el.appendChild(talkEl)
        for (const c of chainEls) el.appendChild(c)
      }

      // Sự kiện có thời hạn
      for (const ev of eventsOverview(state, nowInfo, app.ctx)) el.appendChild(eventCard(ev))

      // Sự kiện ngày + Phiếu Chợ Sớm
      if (dayEv) el.appendChild(dayEventCard(dayEv))
      const coupons = (state.items && state.items.phieu_cho_som) || 0
      if (coupons > 0) el.appendChild(couponCard(coupons))

      if (!first) {
        for (const c of chainEls) el.appendChild(c)
        // Lên chặng / Giấc mơ tiếp theo
        el.appendChild(stageCard(state))
      }

      // Nợ và mượn Dì Sáu
      if (state.loan) {
        el.appendChild(h('div', { class: 'card card-warn', testid: 'loan-info' },
          `${S.labels.loan}: còn ${formatVND(state.loan.remaining)}. Ca nào có lãi sẽ trả dần.`))
      } else if (offerLoan(state, app.data.BALANCE)) {
        el.appendChild(h('div', { class: 'card card-warn' },
          h('div', { class: 'npc-talk compact' }, svgBox(DI_SAU.lo, 'npc-face small'), h('p', null, D.diSau.loanOffer)),
          h('button', {
            class: 'btn btn-secondary', type: 'button', testid: 'take-loan',
            onclick: () => {
              if (takeLoan(app.state, app.data.BALANCE)) {
                app.sound('coin')
                app.toast(`Dì Sáu cho mượn ${formatVND(app.state.loan.amount)}.`, { kind: 'good' })
                app.saveNow()
                render()
              }
            }
          }, 'Dì Sáu cho mượn')))
      }

      // Hôm nay: dự báo khách + thực đơn gọn (2 cột) + ghi chú tình huống ca trước (khách thêm, sổ ghi nợ)
      const fc = forecastDetail(state, app.ctx, dayEv)
      const debts = pendingDebts(state)
      el.appendChild(h('section', { class: 'card prep-today' },
        h('h2', { class: 'card-title' }, 'Hôm nay'),
        h('p', { class: 'prep-forecast', testid: 'prep-forecast' }, `Khoảng ${forecast} khách ghé xe trong ca sáng nay (06:00 – 10:00).`),
        state.day >= (app.data.BALANCE.qrFromDay || 4) ? h('p', { class: 'small muted' }, 'Có khách trả bằng chuyển khoản QR.') : null,
        fc.added > 0 ? h('p', { class: 'small prep-bonus', testid: 'prep-incident-bonus', dataset: { kind: 'khach' } }, `Nhờ ly trà "mở hàng" hôm trước, ca này có thêm ${fc.added} khách.`)
          : fc.rep > 0 ? h('p', { class: 'small prep-bonus', testid: 'prep-incident-bonus', dataset: { kind: 'danh_tieng' } }, `Ca này đã đủ khách, nên ly trà "mở hàng" hôm trước thành +${fc.rep} danh tiếng.`) : null,
        debts.length ? h('p', { class: 'small prep-debts', testid: 'prep-debts' },
          'Sổ ghi nợ: ' + debts.map(d => `${d.name} ${formatVND(d.amount)}`).join(', ') + ' (khách quen thường trả trong 3 ca)') : null,
        h('div', { class: 'prep-menu' }, menu.map(id => {
          const r = app.data.RECIPES[id]
          const p = state.recipes[id]
          const lv = masteryLevel(p, levels)
          const evLabel = state.eventRecipes && state.eventRecipes[id] ? state.eventRecipes[id].label : ''
          return h('div', { class: 'prep-dish', testid: 'prep-dish-' + id },
            svgBox(icon(r.icon || id), 'dish-icon small'),
            h('div', { class: 'prep-dish-info' },
              h('div', { class: 'prep-dish-name' }, r.name),
              h('div', { class: 'prep-dish-price' }, formatVND(r.price)),
              h('div', { class: 'prep-dish-lv' }, `${S.labels.mastery}: ${S.masteryLevels[lv] || lv}`),
              evLabel ? h('div', { class: 'prep-dish-tag' }, evLabel) : null))
        }))))

      // Lời Dì Sáu + Mẹo nghề đã mở (ngẫu nhiên, chọn 1 lần mỗi lần vào màn) + lối vào Sổ tay nghề
      if (!first) el.appendChild(talkEl)
      const tip = shownTip && (state.tipsSeen || []).includes(shownTip.id) ? shownTip : (shownTip = randomSeenTip(state, app.ctx, Math.random))
      if (tip) {
        el.appendChild(h('section', { class: 'card tip-card', testid: 'prep-tip' },
          h('h2', { class: 'card-title' }, 'Mẹo nghề: ' + tip.title),
          h('p', null, tip.text),
          h('button', { class: 'btn btn-ghost btn-small tip-more', type: 'button', testid: 'prep-tip-notebook', onclick: () => go('notebook') }, 'Mở Sổ tay nghề ›')))
      }

      el.appendChild(h('div', { class: 'sticky-foot' },
        h('button', {
          class: 'btn btn-primary btn-big', type: 'button', testid: 'open-shift',
          onclick: () => {
            const sh = startShift(app.state, app.ctx)
            // phiên bản game lúc mở ca: bản mới kích hoạt giữa ca (đóng hết tab rồi mở lại) thì main.js biết để báo
            if (sh) sh.appVersion = app.version
            app.sound('bell')
            app.saveNow()
            app.go('service')
          }
        }, S.buttons.openShift)))
    }

    function stat(label, value, testid, { title = null, amount = null, note = null } = {}) {
      return h('div', { class: 'stat', title },
        h('span', { class: 'stat-label' }, label),
        h('b', { class: 'stat-value', testid, dataset: amount !== null ? { amount } : undefined, 'aria-label': title ? `${label} ${title}` : null }, value),
        note ? h('small', { class: 'stat-note' }, note) : null)
    }

    // ---------- Lối vào (M3: lưới biểu tượng có chấm đỏ) ----------
    function navGrid(state, nowInfo) {
      const ck = checkinStatus(state, nowInfo, app.ctx)
      const ql = questList(state, app.ctx)
      const qDone = ql.quests.filter(q => q.done).length
      const qClaim = ql.quests.filter(q => q.canClaim).length + (ql.chest.available && !nowInfo.rewind ? 1 : 0)
      const mails = mailBadge(state, nowInfo)
      const cat = shopCatalog(state, app.ctx)
      const buyable = cat.recipes.filter(r => r.canBuy).length
      const nb = notebookBadge(state, app.ctx)
      const backup = backupDue(state, app.now()) ? 1 : 0
      // status: chữ cho trình đọc màn hình (ô chỉ ghi tên, chấm đỏ báo việc cần làm)
      const tile = (testid, svg, label, status, dot, onclick) => h('button', {
        class: ['nav-tile', 'icon-tile'], type: 'button', testid, onclick,
        dataset: { dot: dot ? String(dot) : '0' }, 'aria-label': `${label}: ${status}`, title: status
      },
      svgBox(svg, 'nav-icon'),
      h('span', { class: 'nav-label' }, label),
      dot ? redDot(dot, testid + '-dot') : null)
      return h('nav', { class: 'nav-grid icon-grid', 'aria-label': 'Lối vào', testid: 'prep-nav' },
        tile('open-shop', icon('ro'), M.shop, buyable ? `${buyable} món mua được` : 'Món mới, nâng cấp, màu dù', buyable ? 1 : 0, () => go('shop')),
        tile('open-quests', icon('lich'), M.quests, `${qDone}/${ql.quests.length} việc xong`, qClaim, () => go('quests')),
        tile('open-checkin', icon('ruong'), M.checkin, ck.canClaim ? 'Có quà' : ck.reason === 'lui_gio' ? 'Tạm khóa' : 'Mai ghé tiếp', ck.canClaim ? 1 : 0,
          () => openCheckin(app, { onClaim: () => setTimeout(render, 0) }).then(() => render())),
        tile('open-mail', icon('thu'), M.mailbox, mails ? `${mails} thư mới` : 'Không có thư mới', mails, () => go('mailbox')),
        tile('open-recipe-book', RECIPE_BOOK_SVG, S.screens.recipeBook, 'Món, thạo món, Sổ từ vùng miền', 0, () => go('recipe-book')),
        tile('open-notebook', NOTEBOOK_SVG, S.screens.notebook, nb ? `${nb} nhóm chờ nhận thưởng` : 'Thẻ Mẹo nghề đã mở', nb, () => go('notebook')),
        tile('open-settings', GEAR_SVG, S.screens.settings, backup ? 'Đã lâu chưa sao lưu' : 'Âm thanh, hỗ trợ, sao lưu', backup, () => go('settings')))
    }

    function go(name, params) {
      app.sound('click')
      app.go(name, params)
    }

    // ---------- Thẻ sự kiện có thời hạn ----------
    // pending: điểm danh sự kiện, việc sự kiện xong chưa nhận, bước chuỗi sự kiện chờ nhận (cả trong ân hạn) → chấm đỏ
    function eventCard(ev) {
      const owned = ev.recipes.filter(r => r.owned).length
      const recipeNote = owned ? ' · Đã nhận món lễ' : ev.phase === 'dang_dien_ra' ? ' · Món lễ đang chờ bạn' : ''
      return h('section', { class: ['event-card', 'phase-' + ev.phase, ev.pending ? 'has-pending' : ''], testid: 'event-card', dataset: { eventId: ev.id, phase: ev.phase, dot: String(ev.pending || 0) } },
        h('div', { class: 'event-card-head' },
          svgBox(icon('phan_trang'), 'event-card-icon'),
          h('div', null,
            h('span', { class: 'event-phase' }, ev.phase === 'sap_dien_ra' ? M.eventSoon : ev.phase === 'dang_dien_ra' ? M.eventActive : 'Ân hạn'),
            h('b', { class: 'event-name' }, ev.name))),
        h('p', { class: 'small' }, ev.phase === 'sap_dien_ra' ? `Mở sau ${durationText(ev.msToStart)}` : ev.phase === 'dang_dien_ra' ? `Còn ${durationText(ev.msToEnd)}` : phaseText(app, ev, app.nowInfo())),
        ev.phase !== 'sap_dien_ra' ? h('p', { class: 'small' }, `${ev.tem} ${ev.currencyName}` + recipeNote) : h('p', { class: 'small' }, ev.desc),
        ev.pending ? h('p', { class: 'small event-pending', testid: 'event-pending' }, ev.phase === 'an_han' ? 'Có thưởng chuỗi chờ nhận trước khi hết ân hạn' : 'Có quà sự kiện chờ nhận') : null,
        h('button', { class: ['btn', ev.pending ? 'btn-primary' : 'btn-secondary', 'btn-small'], type: 'button', testid: 'open-event', onclick: () => go('event', { eventId: ev.id }) },
          ev.pending ? 'Nhận quà sự kiện' : 'Xem sự kiện'),
        ev.pending ? redDot(ev.pending, 'event-card-dot') : null)
    }

    // ---------- Sự kiện ngày ----------
    function dayEventCard(info) {
      // hiệu ứng thật: đã chọn Căng bạt / có Bạt che mưa thì ghi hiệu ứng của lựa chọn (khớp thẻ Dự báo)
      const lines = dayEffectLines(dayEventEffects(info, app.ctx), app.data, app.state)
      const c = info.choice
      let choiceEl = null
      if (c) {
        choiceEl = h('div', { class: ['day-choice', c.chosen ? 'is-on' : ''] },
          h('div', { class: 'day-choice-text' },
            h('b', null, c.label + (c.free ? ' (miễn phí nhờ Bạt che mưa)' : ` · ${formatVND(c.cost)}`)),
            h('small', null, c.desc)),
          h('button', {
            class: ['btn', 'btn-small', c.chosen ? 'btn-ghost' : 'btn-secondary'], type: 'button', testid: 'day-event-choice-' + c.id,
            disabled: c.free, 'aria-pressed': String(!!c.chosen),
            onclick: () => {
              const r = setDayEventChoice(app.state, c.chosen ? null : c.id, app.ctx)
              if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
              app.sound('click')
              if (!c.chosen) app.toast(`Sẽ ${c.label.toLocaleLowerCase('vi-VN')} lúc mở hàng${c.cost ? ` (${formatVND(c.cost)})` : ''}.`, { kind: 'info' })
              app.saveNow()
              render()
            }
          }, c.free ? 'Tự căng' : c.chosen ? 'Bỏ chọn' : 'Chọn'))
      }
      return h('section', { class: 'card day-event-card', testid: 'day-event-card', dataset: { event: info.id } },
        h('div', { class: 'day-ev-head' }, svgBox(icon(info.icon || info.id), 'day-ev-icon'),
          h('div', null, h('small', { class: 'muted' }, M.dayEvent), h('b', { class: 'day-ev-name' }, info.name))),
        h('p', { class: 'small' }, info.desc),
        lines.length ? h('ul', { class: 'day-ev-effects' }, lines.map(t => h('li', null, t))) : null,
        choiceEl)
    }

    function couponCard(n) {
      const on = !!(app.state.prep && app.state.prep.day === app.state.day && app.state.prep.coupon)
      return h('section', { class: ['card', 'coupon-card', on ? 'is-on' : ''], testid: 'coupon-card' },
        svgBox(icon('phieu_cho_som'), 'day-ev-icon'),
        h('div', { class: 'coupon-text' },
          h('b', null, 'Phiếu Chợ Sớm'),
          h('small', null, (on ? M.couponActive : 'Giá vốn giảm 20% trong 1 ca') + ` · còn ${n} phiếu`)),
        h('button', {
          class: ['btn', 'btn-small', on ? 'btn-ghost' : 'btn-secondary'], type: 'button', testid: 'use-coupon', 'aria-pressed': String(on),
          onclick: () => {
            const r = setMarketCoupon(app.state, !on)
            if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
            app.sound('click')
            app.saveNow()
            render()
          }
        }, on ? 'Bỏ dùng' : 'Dùng'))
    }

    // ---------- Lên chặng / Giấc mơ tiếp theo ----------
    // Thẻ bấm được (role=button) dẫn tới màn "Quán cóc vỉa hè – sắp khai trương".
    function cardLink(testid) {
      return {
        testid, role: 'button', tabindex: '0', onclick: () => go('stage-up'),
        onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('stage-up') } }
      }
    }
    function stageCard(state) {
      const st = checkStageUp(state, app.ctx)
      const unlocked = (state.unlocks || []).includes('the_quan_coc')
      if (st.eligible || unlocked) {
        return h('article', { class: ['stage-card', st.eligible ? 'is-ready' : ''], ...cardLink('stage-up-card') },
          h('small', null, st.eligible ? 'Đủ điều kiện lên chặng!' : M.nextDream),
          h('b', null, st.screenTitle || M.stageUpTitle),
          h('span', { class: 'small' }, st.eligible ? M.stageUpKeepPlaying : `Đã đạt ${st.conditions.filter(c => c.done).length}/${st.conditions.length} điều kiện`),
          h('span', { class: 'stage-card-go' }, 'Xem ›'))
      }
      const todo = st.conditions.filter(c => !c.done)
      const done = st.conditions.length - todo.length
      return h('article', { class: 'dream-card', ...cardLink('dream-card') },
        h('div', { class: 'dream-head' },
          h('div', null, h('small', null, M.nextDream), h('b', null, st.name || S.chang[2])),
          h('span', { class: 'dream-count' }, `${done}/${st.conditions.length}`)),
        h('ul', { class: 'dream-list' }, todo.slice(0, 3).map(c => h('li', null,
          h('span', { class: 'dream-label' }, c.label),
          c.kind === 'chain' ? null : progressBar(c.progress, null, { label: c.label }),
          c.hint ? h('small', { class: 'dream-hint' }, c.hint) : null))),
        h('span', { class: 'dream-more small' }, 'Xem đủ điều kiện ›'))
    }

    // ---------- Hộp thoại khi vào màn ----------
    async function greet(res) {
      const state = app.state
      const nowInfo = app.nowInfo()
      const got = ((res && res.newMail) || []).concat(app.session.pendingMail || [])
      app.session.pendingMail = []
      // bảng điểm danh TRƯỚC: lần mở đầu tiên trong ngày thật, kể cả lần đầu mở game (ô 1 "Tuần Khai Trương");
      // thông báo thư mới xếp sau khi bảng đóng để không chồng lên nhau
      if (app.session.checkinShownDay !== nowInfo.dayKey) {
        const ck = checkinStatus(state, nowInfo, app.ctx)
        if (ck.canClaim) {
          app.session.checkinShownDay = nowInfo.dayKey
          await openCheckin(app, { auto: true })
          if (destroyed) return
          render()
        }
      }
      // thư mới (không chặn thao tác)
      const fresh = [...new Set(got)].filter(id => !app.session.mailToastIds.includes(id))
      if (fresh.length) {
        app.session.mailToastIds.push(...fresh)
        const welcome = fresh.includes('chao_mung')
        const one = fresh.length === 1 ? ((state.mail && state.mail.list) || []).find(m => m.id === fresh[0]) : null
        const others = fresh.length - 1
        const text = welcome ? `Dì Sáu gửi thư chào mừng kèm quà${others > 0 ? ` và ${others} thư khác` : ''}, mở Hộp thư nhận nha!`
          : one ? `Thư mới: ${one.title}` : `Vừa có ${fresh.length} thư mới trong Hộp thư`
        app.toast(text, { kind: 'info', title: welcome ? '' : M.mailbox, icon: icon('thu'), testid: 'mail-toast' })
      }
      // việc sự kiện hôm trước đã xong mà quên nhận: đã tự cộng Tem
      const autos = ((res && res.eventQuestsAuto) || []).concat(app.session.pendingEventAuto || [])
      app.session.pendingEventAuto = []
      for (const a of autos) {
        const ev = app.data.EVENTS && app.data.EVENTS[a.eventId]
        if (ev) app.toast(`Việc sự kiện ${a.dayKey.slice(8, 10)}/${a.dayKey.slice(5, 7)} đã xong mà chưa nhận: tự cộng ${a.tem} ${ev.currencyName}.`, { kind: 'good', icon: icon('phan_trang'), testid: 'event-auto-toast' })
      }
      // lần đầu đủ điều kiện lên chặng
      const p = state.progression
      if (p && p.stageUpReady && !p.stageUpSeen && !destroyed) {
        const v = await app.modal({
          title: M.stageUpTitle, icon: DI_SAU.tu_hao, testid: 'stage-up-modal',
          text: 'Xe mình đã đủ điều kiện dọn ra vỉa hè rồi con ơi!',
          actions: [{ label: 'Để sau', value: false, kind: 'ghost', testid: 'stage-up-later' }, { label: 'Xem ngay', value: true, testid: 'stage-up-open' }]
        })
        if (destroyed) return
        if (v) go('stage-up')
        else { p.stageUpSeen = true; app.saveNow() }
      }
    }

    const { res } = refresh()
    render()
    greet(res)
    // qua mốc 04:00 khi đang ở màn này: đổi việc, điểm danh mới
    const timer = setInterval(() => {
      if (destroyed) return
      const k = app.nowInfo().dayKey
      if (k !== lastDayKey) { const r = refresh(); render(); greet(r.res) }
    }, 30000)
    return { unmount() { destroyed = true; clearInterval(timer) } }
  }
}
