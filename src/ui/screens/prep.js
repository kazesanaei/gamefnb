// Màn Chuẩn bị ca: thông tin ngày, Muỗng Vàng, lưới lối vào có chấm đỏ (Chợ Công Thức, Việc hôm nay, Điểm danh,
// Hộp thư, Sổ công thức, Sổ tay nghề, Cài đặt), sự kiện ngày và lựa chọn, Phiếu Chợ Sớm, thẻ sự kiện có thời hạn,
// chuỗi "Dì Sáu dặn", "Giấc mơ tiếp theo", thẻ "Hôm nay" (dự báo khách + thực đơn), Mẹo nghề đã mở (ngẫu nhiên),
// mượn Dì Sáu, nút "Mở hàng" luôn nhìn thấy (dính đáy màn).
// M3: thẻ nhắc sao lưu mỗi 7 ngày thật, nút "Có bản mới – Tải lại"; khách thêm nhờ ly trà "mở hàng", sổ ghi nợ khách quen.
// M4: thẻ gánh hàng quê (đang mở / phiên kế tiếp / đã ghé hôm nay), thẻ Kho hàng hiếm (tồn kho, mảnh công thức, thanh
// may mắn Giỏ chợ và tỉ lệ công khai), món hiếm trong thực đơn hôm nay có huy hiệu ★ và số phần còn.
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
import { stallStatus, rareOverview, rarePortions, rareConfig } from '../../core/rare.js'
import { starText } from './market.js'

function pickRandom(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null
}

// Hiệu ứng của sự kiện ngày thành các dòng ngắn cho người chơi (màn Chuẩn bị, thẻ "Ngày mai" ở Tổng kết).
// M4: thêm dòng cho chi phí cố định tăng, giá nguyên liệu tăng, Loa báo tiền tắt, luật hàng chờ, đơn đặt trước, chấm
// cuối ca (hội thi, tài trợ, kiểm tra vệ sinh), lượt Giỏ chợ.
export function dayEffectLines(effects, data, state = null) {
  const e = effects || {}
  const R = data.RECIPES || {}
  const ING = data.INGREDIENTS || {}
  const out = []
  const pct = v => Math.round(Math.abs(v - 1) * 100) + '%'
  const owned = id => R[id] && (!state || (state.recipes && state.recipes[id]))
  const stars = v => String(v).replace('.', ',')
  if (e.customerMul && e.customerMul < 1) out.push(`Khách ít hơn khoảng ${pct(e.customerMul)}`)
  if (e.customerMul && e.customerMul > 1) out.push(`Khách đông hơn khoảng ${pct(e.customerMul)}, ca dài hơn`)
  if (e.extraCustomers) out.push(`Thêm ${e.extraCustomers} khách`)
  if (e.patienceMul && e.patienceMul > 1) out.push(`Khách chịu chờ lâu hơn ${pct(e.patienceMul)}`)
  // M4: Ngày lãnh lương không còn nhân tip, khách gọi thêm món (luật tip không có ngoại lệ)
  if (Array.isArray(e.lineCountWeights)) out.push('Khách hay gọi thêm món, hóa đơn dễ qua 20.000đ để có tip')
  // chỉ kể món đang bán (có state thì lọc món đã sở hữu)
  const rw = Object.entries(e.recipeWeight || {}).filter(([id]) => owned(id))
  const hot = rw.filter(([, w]) => w > 1).map(([id]) => R[id].name)
  const cold = rw.filter(([, w]) => w < 1).map(([id]) => R[id].name)
  if (hot.length) out.push(`${hot.join(', ')} được gọi nhiều gấp đôi`)
  if (cold.length) out.push(`${cold.join(', ')} ít được gọi hơn (món có đá)`)
  // M4: chi phí, giá vốn
  if (Number(e.fixedCostDelta) > 0) {
    const base = Number(data.BALANCE && data.BALANCE.fixedCostPerShift) || 20000
    out.push(`Chi phí cố định ca này ${formatVND(base)} → ${formatVND(base + Number(e.fixedCostDelta))}`)
  }
  for (const [ing, mul] of Object.entries(e.ingCostMul || {})) {
    if (!(Number(mul) > 1) || !ING[ing]) continue
    const per = Object.values(R).filter(r => owned(r.id)).map(r => {
      const it = (r.ingredients || []).find(i => i.id === ing && i.role !== 'tuy_chon')
      return it ? { name: r.name, extra: Math.round((ING[ing].cost || 0) * (it.qty || 1) * (Number(mul) - 1)) } : null
    }).filter(Boolean)
    const times = Number(mul) === 2 ? 'gấp đôi' : `×${String(mul).replace('.', ',')}`
    out.push(`Giá ${ING[ing].name.toLocaleLowerCase('vi-VN')} ${times}` +
      (per.length ? `: ${per.map(x => `${x.name} tốn thêm khoảng ${formatVND(x.extra)} mỗi phần`).join(', ')}` : '') +
      ' (phần tăng có mức trần)')
  }
  if (e.noQrSpeaker && state && state.upgrades && state.upgrades.loa_bao_tien) out.push('Loa báo tiền tắt: tự xem tiền về đúng số rồi mới bấm xác nhận')
  // M4: hàng chờ
  if (e.queueFine) out.push(`Hàng chờ chạm ${e.queueFine.at} người thì bị phạt tối đa ${formatVND(e.queueFine.fine)} (1 lần)`)
  if (Number(e.queueMax) > 0) out.push(`Chỉ cho ${e.queueMax} người đứng chờ, người đến sau sẽ đi ngang`)
  // M4: đơn đặt trước
  const bo = e.bigOrder
  if (bo && R[bo.recipeId]) {
    const qty = Number(bo.qty) || 1
    out.push(`Thêm 1 khách lấy ${qty} ly ${R[bo.recipeId].name} (${formatVND((R[bo.recipeId].price || 0) * qty)})` +
      (Number(bo.bonus) > 0 ? `, giao đạt từ ${bo.minStars} sao được thêm ${formatVND(bo.bonus)}` : ''))
  }
  // M4: chấm cuối ca. Tiền thưởng có trần theo doanh thu dự kiến của ca (ca ít khách nhận ít hơn) nên ghi "tối đa",
  // giống dòng phạt; dòng cuối nói rõ vì sao.
  const E = e.endCheck
  let capNote = false
  if (E && E.type === 'stars') {
    for (const t of E.tiers || []) {
      out.push(`Sao trung bình của ca từ ${stars(t.min)}: ${t.label || 'có giải'}` +
        (t.money ? ` tối đa +${formatVND(t.money)}` : '') + (t.rep ? `, +${t.rep} danh tiếng` : ''))
      if (t.money) capNote = true
    }
  } else if (E && E.type === 'portions') {
    const names = (E.recipes || []).filter(id => R[id]).map(id => R[id].name).join(', ')
    const tiers = (E.tiers || []).slice().sort((a, b) => b.min - a.min)
    if (tiers.length) {
      out.push(tiers.map((t, i) => (i === 0 ? `Bán từ ${t.min} ly ${names}: tối đa +${formatVND(t.money)}` : `ít hơn: +${formatVND(t.money)}`)).join('; '))
      capNote = true
    }
  } else if (E && E.type === 'hygiene') {
    if (E.sure) out.push(`Chắc chắn đạt kiểm tra` + (E.passRep ? `, +${E.passRep} danh tiếng` : ''))
    else {
      out.push(`Bếp không có lỗi sơ chế, lấy nhầm, món hỏng: +${E.passRep || 0} danh tiếng`)
      out.push(`Có lỗi: lần đầu chỉ nhắc nhở, tái phạm trong ${E.warnDays || 14} ngày bị phạt tối đa ${formatVND(E.fine || 0)}`)
    }
  }
  // M4: lượt Giỏ chợ (nguyên liệu hiếm)
  if (Number(e.rareRolls) > 0 && data.RARE_CONFIG) out.push(`+${e.rareRolls} lượt Giỏ chợ cuối ca`)
  if (capNote) out.push('Tiền thưởng mỗi sự kiện có mức trần theo doanh thu ca: ca ít khách có thể nhận ít hơn')
  return out
}

// M4: đã bị nhắc nhở ở lần kiểm tra trước (sự kiện có "nhắc nhở trước, tái phạm mới phạt") → dòng cảnh báo; không thì ''.
export function dayEventWarnLine(state, info, data) {
  const def = info && data.DAY_EVENTS && data.DAY_EVENTS[info.id]
  const E = def && def.effects && def.effects.endCheck
  const last = Number(state && state.incidents && state.incidents.warn && state.incidents.warn[info && info.id]) || 0
  if (!E || E.type !== 'hygiene' || !(last > 0) || state.day - last > (E.warnDays || 14)) return ''
  return `Ngày ${last} đã bị nhắc nhở: lần này còn lỗi sẽ bị phạt tối đa ${formatVND(E.fine || 0)}. Chuẩn bị đón đoàn là chắc chắn đạt.`
}

// M4: giá của lựa chọn cho người chơi: "miễn phí" khi 0đ.
export function choiceCostText(c) {
  return c.cost > 0 ? formatVND(c.cost) : 'miễn phí'
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
  let eff = {}
  if (info) {
    eff = dayEventEffects(info, ctx)
    n = applyCustomerMods(n, { customerMul: eff.customerMul ?? 1, extraCustomers: eff.extraCustomers || 0 }, ctx)
  }
  const base = n
  const bonus = incidentBonusFor(state, state.day)
  if (bonus > 0 && n < 8) n = Math.min(8, n + bonus)
  const added = n - base
  const b = state.incidents && state.incidents.bonus
  const rep = bonus > 0 && added === 0 && b ? Math.max(0, Math.round(Number(b.rep) || 0)) : 0
  // M4: đơn đặt trước (đã nhận đơn): thêm 1 khách, trong trần khách của sự kiện (giống startShift)
  const bo = eff.bigOrder
  const cap = Number(dataOf(ctx).BALANCE && dataOf(ctx).BALANCE.eventCustomerCap) || 10
  if (bo && state.recipes && state.recipes[bo.recipeId] && n < cap) n += 1
  return { n, base, added, rep }
}

function dataOf(ctx) { return (ctx && ctx.data) || {} }

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
      // M4: gánh hàng quê theo giờ thật (không hiện ở lần mở đầu tiên)
      const rareOv = rareOverview(state, nowInfo, app.ctx)
      const rareOn = rareOv.active && !first && (state.day >= rareOv.fromDay || rareOv.total > 0 || rareOv.fragments.some(f => f.n > 0 || f.owned))
      if (rareOn) el.appendChild(stallCard(nowInfo))

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
          // M4: món hiếm: huy hiệu ★ và số phần kho còn làm được
          const rareLeftN = r.source === 'hiem' ? rarePortions(state, r) : null
          return h('div', { class: ['prep-dish', rareLeftN !== null ? 'is-rare' : ''], testid: 'prep-dish-' + id },
            svgBox(icon(r.icon || id), 'dish-icon small'),
            h('div', { class: 'prep-dish-info' },
              h('div', { class: 'prep-dish-name' }, r.name),
              h('div', { class: 'prep-dish-price' }, formatVND(r.price)),
              h('div', { class: 'prep-dish-lv' }, `${S.labels.mastery}: ${S.masteryLevels[lv] || lv}`),
              evLabel ? h('div', { class: 'prep-dish-tag' }, evLabel) : null,
              rareLeftN !== null ? h('div', { class: 'prep-dish-tag is-rare', testid: 'rare-left-' + id }, `★ còn ${rareLeftN} phần`) : null))
        }))))
      // M4: kho hàng hiếm (tồn kho, mảnh công thức, Giỏ chợ)
      if (rareOn) el.appendChild(rareStockCard(rareOv))

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
            h('b', null, c.label + (c.free ? ' (miễn phí nhờ Bạt che mưa)' : ` · ${choiceCostText(c)}`)),
            h('small', null, c.desc)),
          h('button', {
            class: ['btn', 'btn-small', c.chosen ? 'btn-ghost' : 'btn-secondary'], type: 'button', testid: 'day-event-choice-' + c.id,
            disabled: c.free, 'aria-pressed': String(!!c.chosen),
            onclick: () => {
              const r = setDayEventChoice(app.state, c.chosen ? null : c.id, app.ctx)
              if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
              app.sound('click')
              if (!c.chosen) app.toast(`Sẽ ${c.label.toLocaleLowerCase('vi-VN')} lúc mở hàng${c.cost ? ` (${formatVND(c.cost)})` : ''}.`, { kind: 'info', testid: 'day-choice-toast' })
              app.saveNow()
              render()
            }
          }, c.free ? 'Tự căng' : c.chosen ? 'Bỏ chọn' : 'Chọn'))
      }
      const warn = dayEventWarnLine(app.state, info, app.data)
      // M4: nhãn loại sự kiện (có lợi / có lựa chọn / cần phòng) để người chơi biết trước
      const kindLabel = { tot: 'Có lợi', chon: 'Có lựa chọn', xau: 'Cần phòng trước' }[info.kind] || ''
      return h('section', { class: ['card', 'day-event-card', 'kind-' + (info.kind || 'tot')], testid: 'day-event-card', dataset: { event: info.id, kind: info.kind || 'tot' } },
        h('div', { class: 'day-ev-head' }, svgBox(icon(info.icon || info.id), 'day-ev-icon'),
          h('div', null, h('small', { class: 'muted' }, M.dayEvent + (kindLabel ? ' · ' + kindLabel : '')), h('b', { class: 'day-ev-name' }, info.name))),
        h('p', { class: 'small' }, info.desc),
        lines.length ? h('ul', { class: 'day-ev-effects' }, lines.map(t => h('li', null, t))) : null,
        warn ? h('p', { class: 'small day-ev-warn', testid: 'day-event-warn' }, warn) : null,
        choiceEl)
    }

    // ---------- M4: gánh hàng quê và kho hàng hiếm ----------
    function stallCard(nowInfo) {
      const RS = S.rare || {}
      const st = stallStatus(app.state, nowInfo, app.ctx)
      const find = id => st.stalls.find(x => x.id === id) || null
      // tiêu đề nói rõ trạng thái (không lặp tên thẻ; phiên chưa mở thì không ghi tên phiên như đang mở)
      let key = 'closed', stall = null, sub = '', btn = null, title = ''
      const go = id => h('button', { class: 'btn btn-primary btn-small', type: 'button', testid: 'open-market',
        onclick: () => { app.sound('click'); app.go('market', { stallId: id }) } }, id === st.pending ? 'Lựa tiếp' : 'Ghé gánh hàng')
      const who = x => `${x.name} · ${x.seller}`
      if (st.tooEarly) { key = 'early'; title = 'Chưa tới ngày mở'; sub = `Gánh hàng quê mở từ ngày ${rareOverview(app.state, nowInfo, app.ctx).fromDay}.` }
      else if (st.locked) { key = 'locked'; title = 'Tạm khóa'; sub = RS.stallLocked || '' }
      else if (st.pending) { key = 'pending'; stall = find(st.pending); title = stall ? who(stall) : 'Đang lựa dở'; sub = 'Đang lựa hàng dở, vào lựa tiếp nha.'; btn = go(st.pending) }
      else if (st.current && !st.current.done) {
        key = 'open'; stall = st.current; title = who(stall)
        sub = (RS.stallOpen || 'Đang mở tới {to}').replace('{to}', stall.to)
        btn = go(stall.id)
      } else if (st.current && st.current.done) {
        key = 'done'; stall = st.current; title = `Đã ghé ${stall.name}`
        sub = (RS.stallDone || 'Hôm nay đã ghé') + (st.next ? ` · ${(RS.stallNext || 'Phiên kế tiếp {from}').replace('{from}', st.next.from)}: ${st.next.name}` : '')
      } else if (st.next) {
        key = 'closed'; stall = st.next; title = 'Chưa có phiên đang mở'
        sub = (RS.stallNext || 'Phiên kế tiếp {from}').replace('{from}', st.next.from) + ` – ${st.next.to}: ${who(st.next)}`
      } else if (st.tomorrow) {
        key = 'closed'; stall = st.tomorrow; title = 'Hôm nay hết phiên'
        sub = (RS.stallTomorrow || 'Hẹn sáng mai, {from}').replace('{from}', st.tomorrow.from) + `: ${who(st.tomorrow)}`
      }
      const INGS = app.data.INGREDIENTS || {}
      const goods = stall ? (stall.goods || []).filter(g => INGS[g]) : []
      return h('section', { class: ['card', 'stall-card', 'st-' + key], testid: 'stall-card', dataset: { state: key, stall: stall ? stall.id : '' } },
        h('div', { class: 'day-ev-head' }, svgBox(icon(goods[0] ? INGS[goods[0]].icon : 'ro'), 'day-ev-icon'),
          h('div', null, h('small', { class: 'muted' }, S.screens.market || 'Gánh hàng quê'),
            h('b', { class: 'day-ev-name', testid: 'stall-title' }, title || (S.screens.market || 'Gánh hàng quê')))),
        h('p', { class: 'small' }, sub),
        goods.length ? h('p', { class: 'small stall-goods' }, (key === 'closed' ? 'Phiên kế tiếp có: ' : 'Hàng hiếm: ') +
          goods.map(g => `${INGS[g].name} ${starText(INGS[g].star)}`).join(', ')) : null,
        h('ul', { class: 'stall-times small' }, st.stalls.map(x => h('li', { class: [x.open ? 'is-open' : '', x.done ? 'is-done' : ''], dataset: { stall: x.id } },
          `${x.name} ${x.from}–${x.to}` + (x.done ? ' · đã ghé' : x.open ? ' · đang mở' : '')))),
        btn)
    }

    function rareStockCard(ov) {
      const RS = S.rare || {}
      const b = ov.basket
      const pct = v => Math.round(v * 100) + '%'
      // 100% nguyên liệu: nói đúng lý do (hôm nay đủ mảnh / còn món cần món nền / đã đủ mảnh mọi món hiếm)
      const allText = b.allReason === 'het_muc_ngay' ? (RS.basketAllIngDay || RS.basketAllIng || '').replace('{fragCap}', String(ov.today.fragCap))
        : b.allReason === 'can_mon_nen' ? (RS.basketAllIngBase || RS.basketAllIng || '') : (RS.basketAllIng || '')
      const fragPity = rareConfig(app.ctx).fragmentPityAfter
      const luck = b.allIng ? allText
        : b.sure ? (RS.basketSure || '')
          : b.fragSure ? (RS.basketFragSure || '').replace('{n}', String(fragPity))
            : (RS.basketLuck || '').replace('{n}', String(b.pity)).replace('{max}', String(b.pityAfter)).replace('{left}', String(Math.max(0, b.pityAfter - b.pity)))
      return h('section', { class: 'card rare-stock-card', testid: 'rare-stock-card' },
        h('h2', { class: 'card-title' }, RS.stockTitle || 'Kho hàng hiếm'),
        h('p', { class: 'small muted' }, (RS.dayCap || '').replace('{got}', String(ov.today.got)).replace('{cap}', String(ov.today.cap))
          .replace('{frags}', String(ov.today.frags)).replace('{fragCap}', String(ov.today.fragCap))),
        h('ul', { class: 'rare-stock' }, ov.stock.map(x => h('li', { class: ['rare-stock-item', x.n > 0 ? 'has' : 'empty'], testid: 'rare-stock-' + x.id,
          dataset: { n: String(x.n) }, title: `${x.name} (${x.origin})` },
        svgBox(icon(x.icon), 'rare-stock-icon'),
        h('span', { class: 'rare-stock-name' }, x.name),
        h('b', { class: 'rare-stock-n' }, `Kho ${x.n}/${x.max}`)))),
        ov.total === 0 ? h('p', { class: 'small muted' }, RS.stockEmpty || '') : null,
        h('h3', { class: 'rare-h3' }, 'Công thức hiếm'),
        h('ul', { class: 'rare-frags' }, ov.fragments.map(f => {
          const status = f.owned ? 'owned' : f.ready ? 'ready' : f.baseOwned ? 'collecting' : 'locked'
          const text = f.owned ? `Đã mở · kho đủ cho ${f.portions} phần`
            : f.ready ? (RS.readyToTaste || '')
              : [(RS.fragments || 'Mảnh {n}/{need}').replace('{n}', String(f.n)).replace('{need}', String(f.need)),
                f.needBase.length ? (RS.needBase || 'Cần {base}').replace('{base}', f.needBase.join(', ')) : ''].filter(Boolean).join(' · ')
          return h('li', { class: ['rare-frag', 'st-' + status], testid: 'rare-fragments-' + f.recipeId, dataset: { n: String(f.n), status } },
            svgBox(icon(f.icon), 'rare-frag-icon'),
            h('div', { class: 'rare-frag-text' },
              h('b', null, f.name, ' ', h('span', { class: 'rare-star' }, '★')),
              h('small', null, text),
              h('small', { class: 'muted' }, 'Mỗi phần: ' + f.rare.map(x => `${x.n} ${x.name}`).join(', '))),
            f.ready ? h('button', { class: 'btn btn-primary btn-small', type: 'button', testid: 'rare-taste-' + f.recipeId,
              onclick: () => { app.sound('click'); app.go('tasting', { recipeId: f.recipeId, back: 'prep' }) } }, 'Nấu thử') : null)
        })),
        h('div', { class: 'basket-luck', testid: 'basket-luck', dataset: { pity: String(b.pity), sure: String(!!b.sure), fragSure: String(!!b.fragSure), all: b.allReason || '' } },
          h('div', { class: 'basket-head' }, svgBox(icon('ro'), 'rare-frag-icon'), h('b', null, RS.basketTitle || 'Giỏ chợ')),
          h('p', { class: 'small' }, b.allIng ? allText
            : (RS.basketOdds || '').replace('{ing}', pct(b.ingredient)).replace('{frag}', pct(b.fragment))),
          b.allIng ? null : progressBar(b.pity, b.pityAfter, { label: 'May mắn Giỏ chợ', kind: 'luck' }),
          b.allIng ? null : h('p', { class: 'small muted' }, luck),
          h('p', { class: 'small muted' }, RS.basketHow || '')),
        h('p', { class: 'small muted' }, (RS.stockNote || '').replace('{max}', String(ov.stockMax)).replace('{gold}', String(ov.overflowGold))))
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
    // M4: gánh hàng quê mở/đóng theo giờ thật → vẽ lại thẻ phiên hàng
    const stallSig = () => { try { const st = stallStatus(app.state, app.nowInfo(), app.ctx); return JSON.stringify([st.current && st.current.id, st.next && st.next.id, st.locked]) } catch { return '' } }
    let lastStall = stallSig()
    const timer = setInterval(() => {
      if (destroyed) return
      const k = app.nowInfo().dayKey
      if (k !== lastDayKey) { const r = refresh(); render(); greet(r.res); lastStall = stallSig(); return }
      const sg = stallSig()
      if (sg !== lastStall) { lastStall = sg; render() }
    }, 30000)
    return { unmount() { destroyed = true; clearInterval(timer) } }
  }
}
